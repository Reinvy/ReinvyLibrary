---
title: "Docker Registry and Image Distribution Guide"
description: "A practical guide to running and using container registries: registry choices, tagging and immutability, multi-arch manifests, pull-through mirrors, retention policies, and image signing."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Docker Registry and Image Distribution Guide

## Introduction

A container registry is the distribution layer of your delivery pipeline. It is where images are named, stored, scanned, replicated, and finally pulled by orchestrators at deploy time. Teams usually adopt one by default — Docker Hub, GHCR, ECR, Harbor — and then discover the consequences months later: mutable `latest` tags that make rollbacks meaningless, an unbounded storage bill from stale builds, `exec format error` crashes from a single-arch push to a multi-arch cluster, and no way to prove an image was not tampered with.

This guide covers the decisions that matter: how to choose and operate a registry, how to design a tag scheme that survives production, how to publish multi-architecture images, how to control storage growth, and how to make signature verification a gate rather than an afterthought.

## Best Practices

### Treat tags as a publication contract

An image reference has two parts: the tag (mutable, human-readable) and the digest (immutable, content-addressed). Tags exist for humans; digests exist for machines. A deployment manifest should always resolve to a digest, even when the operator typed a tag.

- **Never deploy `latest`**: it moves on every push, so two pods started an hour apart can run different code while claiming the same version.
- **Use one scheme everywhere**: `<version>-<sha7>` for releases, `sha-<full-sha>` for every commit, `pr-<number>` for pull request builds. Tooling can then find any build by commit.
- **Pin digests in manifests**: `image: registry.example.com/api@sha256:...` makes rollback deterministic and satisfies most audit requirements.
- **Enable tag immutability** where the registry supports it (ECR, Harbor, Artifact Registry). Overwriting a release tag should require deleting the image, which leaves a trail.

### Prefer many small, labelled layers over one fat image

Distribution cost is dominated by bytes pulled per node. Keep the runtime image minimal, publish it per architecture, and attach metadata instead of baking it in.

- **Attach provenance as OCI labels** (`org.opencontainers.image.revision`, `...source`, `...created`) rather than writing a `.git` directory into the image.
- **Keep a stable base layer**: rebuilding from the same pinned base digest means nodes reuse cached layers across deploys, and multi-stage builds keep compilers out of the pull path.

### Build multi-arch manifests deliberately

`docker buildx build --platform linux/amd64,linux/arm64 --push` publishes a manifest list, not an image. The registry stores one image per architecture plus an index; clients resolve automatically. Two consequences matter:

- Steps that inspect the image (`docker run`, vulnerability scanners) need an explicit `--platform linux/amd64`, otherwise they fail on the index.
- Signature and attestation attach to the index rather than individual platform images, so sign after the multi-arch push completes.

### Mirror upstream images at the edge

A pull-through cache registry (Harbor, Distribution with `proxy.remoteurl`, or a cloud pull-through cache) reduces external egress, survives Docker Hub rate limits, and centralizes scanning.

- **Pin what you mirror**: mirroring `postgres:16` re-fetches when the upstream tag moves. Mirror `postgres:16@sha256:...` for reproducibility.
- **Keep the cache on the same network path as the nodes**: a mirror in another region only moves the latency.

### Retention is a policy, not a cleanup script

Storage grows monotonically unless something deletes images. Define retention explicitly: keep the last N releases per repository, keep every image referenced by a live deployment, expire `pr-*` tags after 14 days, and never expire digests an SBOM references. Run the rule on a schedule and alert when the repository count grows faster than deploys.

### Sign and verify, do not merely scan

Scanning answers "is this image vulnerable?" Signing answers "did we build this image?" Production clusters should require both.

- Sign the digest with `cosign` (keyless via OIDC is the lowest-friction option).
- Enforce with an admission policy (Kyverno, Connaisseur, or a cloud equivalent) so unsigned images cannot schedule, and keep the SBOM and provenance attestation next to the signature so the check has evidence behind it.

## Implementation Steps

### Step 1: Choose the registry topology

| Option | Best for | Watch out for |
| --- | --- | --- |
| GHCR | GitHub-centric teams, free for public | coarse permission model per package |
| AWS ECR / GCP Artifact Registry | workloads already in that cloud | per-region repositories, IAM coupling |
| Harbor (self-hosted) | air-gapped, multi-tenant, policy control | you operate storage and upgrades |
| Docker Hub | public distribution | rate limits for anonymous pulls |

Most organizations end up with two: a private registry for internal images and a mirror for upstream base images.

### Step 2: Authenticate without long-lived passwords

```bash
# CI: exchange a short-lived OIDC token for registry credentials
echo "$CI_REGISTRY_TOKEN" | docker login registry.example.com \
    --username "$CI_REGISTRY_USER" --password-stdin

# Fail fast if login did not take effect
docker pull registry.example.com/base/alpine:3.20 >/dev/null || {
    echo "registry login failed" >&2
    exit 1
}
```

Prefer workload identity or OIDC federation over static tokens; rotate anything static on a fixed schedule.

### Step 3: Build and push a multi-arch image with immutable tags

```bash
#!/usr/bin/env bash
set -euo pipefail

REGISTRY="registry.example.com"
IMAGE="platform/api"
REVISION="$(git rev-parse --short=7 HEAD)"
VERSION="$(cat VERSION)"

# A builder backed by the container driver can cross-compile
docker buildx create --name multiarch --driver docker-container --use 2>/dev/null || true
docker buildx inspect --bootstrap >/dev/null

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "REVISION=${REVISION}" \
    --label "org.opencontainers.image.revision=${REVISION}" \
    --label "org.opencontainers.image.version=${VERSION}" \
    --tag "${REGISTRY}/${IMAGE}:${VERSION}-${REVISION}" \
    --tag "${REGISTRY}/${IMAGE}:sha-$(git rev-parse HEAD)" \
    --provenance=true --sbom=true \
    --push .

# Record the digest; this is what deployment manifests should reference
DIGEST="$(docker buildx imagetools inspect "${REGISTRY}/${IMAGE}:${VERSION}-${REVISION}" \
    --format '{{json .Manifest.Digest}}' | tr -d '"')"
echo "immutable reference: registry.example.com/platform/api@${DIGEST}"
```

### Step 4: Sign the manifest list and verify before deploy

```bash
# Keyless signature bound to the CI identity
cosign sign --yes "registry.example.com/platform/api@${DIGEST}"

# Verification gate in the deployment pipeline
cosign verify \
    --certificate-identity "https://github.com/acme/api/.github/workflows/release.yml@refs/heads/main" \
    --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
    "registry.example.com/platform/api@${DIGEST}"
```

### Step 5: Apply retention and monitor distribution

```json
{
    "rules": [
        {
            "rulePriority": 1,
            "description": "Expire pull request images after 14 days",
            "selection": { "tagStatus": "tagged", "tagPrefixList": ["pr-"], "countType": "sinceImagePushed", "countUnit": "days", "countNumber": 14 },
            "action": { "type": "expire" }
        },
        {
            "rulePriority": 2,
            "description": "Keep the 30 most recent release tags",
            "selection": { "tagStatus": "tagged", "tagPrefixList": ["v"], "countType": "imageCountMoreThan", "countNumber": 30 },
            "action": { "type": "expire" }
        }
    ]
}
```

Apply with `aws ecr put-lifecycle-policy --repository-name platform/api --lifecycle-policy-text file://policy.json`, then track `registry_storage_bytes` and pull latency per node pool. A registry that is fast for CI but slow for nodes is a cache placement problem, not a registry problem.

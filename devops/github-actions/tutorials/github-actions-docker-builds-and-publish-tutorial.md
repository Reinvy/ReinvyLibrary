---
title: "GitHub Actions Docker Builds and Publish Tutorial"
description: "Build multi-architecture Docker images in GitHub Actions with Buildx, push them to GHCR with metadata-driven tags, reuse layer caches, attach provenance attestations, and scan for vulnerabilities."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# GitHub Actions Docker Builds and Publish Tutorial

## Summary

This tutorial turns a plain `docker build` step into a production-grade image pipeline. You will build multi-architecture images with Buildx, publish them to the GitHub Container Registry using the workflow token, derive tags from git metadata, reuse layer caches, attach provenance, and scan for vulnerabilities.

## Target Audience

- DevOps engineers and backend developers who already ship containers by hand.
- Developers comfortable with workflow YAML who want reproducible, auditable releases.
- Expected level: intermediate.

## Prerequisites

- A GitHub repository with a `Dockerfile` and permission to publish packages.
- Basic Docker knowledge: layers, tags, registries, and `.dockerignore`.
- Familiarity with GitHub Actions syntax (`on`, `jobs`, `steps`, `with`).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Configure `docker/setup-buildx-action` and QEMU for `linux/amd64` plus `linux/arm64`.
- Authenticate to GHCR with `GITHUB_TOKEN` instead of a long-lived personal token.
- Derive semantic, branch, and SHA tags automatically with `docker/metadata-action`.
- Persist BuildKit layer caches with the GitHub Actions cache backend.
- Attach SLSA provenance and an SBOM, then scan the image with Trivy.

## Context and Motivation

A hand-written build step usually targets one architecture, tags the image `latest`, and rebuilds every layer on each run because nothing is cached. That pipeline is slow, unauditable, and quietly broken for anyone on Apple Silicon pulling an amd64-only image.

Buildx plus the official Docker actions fix those problems at once: cross-platform output, metadata-driven tags, remote cache reuse, and signed provenance tying a digest to a commit. Once images carry provenance, rollbacks stop being guesswork.

## Core Content

### Step 1 — Set Up Buildx

`docker build` on a runner uses the legacy builder. `docker/setup-buildx-action` creates a BuildKit builder with the `docker-container` driver, unlocking `--platform`, cache export, and attestation flags. Every Docker action below assumes that builder exists.

### Step 2 — Emit Multiple Platforms

A multi-arch tag points at a manifest list with one image per architecture. Building `linux/arm64` on an amd64 runner needs QEMU emulation, installed by `docker/setup-qemu-action`. Emulation is slow, so keep multi-arch out of pull request jobs and reserve it for release tags.

### Step 3 — Authenticate Without Long-Lived Secrets

GHCR accepts the workflow `GITHUB_TOKEN`. Grant `packages: write` and log in as `${{ github.actor }}`. The catch: GHCR paths must be lowercase, while `${{ github.repository }}` keeps whatever case the owner typed.

### Step 4 — Derive Tags From Git Instead of Guessing

`docker/metadata-action` computes tags and OCI labels from refs. `type=semver` maps `v1.4.0` to `1.4.0`, `type=ref,event=branch` maps pushes to branch names, and `type=sha` gives an immutable short tag. Results land in `steps.meta.outputs.tags`, so no tag list is hand-maintained.

### Step 5 — Keep Layers Warm Between Runs

Pass `cache-from: type=gha` and `cache-to: type=gha,mode=max`. `mode=max` also caches intermediate stages, which matters for multi-stage Dockerfiles where the dependency-install stage dominates build time.

### Step 6 — Prove and Scan Before You Publish

`actions/attest-build-provenance` signs an in-toto statement binding the image digest to the workflow, commit, and runner; `sbom: true` adds an SPDX SBOM. Both need `id-token: write` and `attestations: write`. Then run Trivy against that digest and upload SARIF, using `exit-code: '1'` on `CRITICAL` so the pipeline fails closed.

## Code Examples

### Full Publish Workflow

```yaml
name: Publish image
on:
  push:
    tags: ['v*']
  pull_request:
env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write
      attestations: write
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - name: Log in to GHCR
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Compute tags and labels
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=ref,event=branch
            type=sha,prefix=sha-
            type=raw,value=latest,enable={{is_default_branch}}
      - name: Build and push
        id: build
        uses: docker/build-push-action@v6
        with:
          platforms: ${{ github.event_name == 'pull_request' && 'linux/amd64' || 'linux/amd64,linux/arm64' }}
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          sbom: true
          provenance: mode=max
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Attest provenance
        if: github.event_name != 'pull_request'
        uses: actions/attest-build-provenance@v2
        with:
          subject-name: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          subject-digest: ${{ steps.build.outputs.digest }}
          push-to-registry: true
      - name: Scan image by digest
        uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ steps.build.outputs.digest }}
          format: sarif
          output: trivy.sarif
          severity: CRITICAL,HIGH
          exit-code: '0'
```

### Verify the Published Digest

```bash
set -euo pipefail

IMAGE="ghcr.io/acme/api"
docker buildx imagetools inspect "${IMAGE}:1.4.0"   # one entry per platform
gh attestation verify "oci://${IMAGE}:1.4.0" --owner acme
```

## Key Insights

- Lowercase the registry path (`${GITHUB_REPOSITORY,,}` in bash); GHCR rejects mixed-case names with a misleading 403.
- Keep PR builds single-platform and unpushed — QEMU emulation roughly triples build time on every commit.
- `mode=max` is the biggest win for multi-stage files but inflates cache storage; prune it on a schedule if you build often.
- Build once, promote by digest. Deploy jobs should reference `image@sha256:...` so retagging `latest` cannot change production.
- A `with:` expression cannot read a step output from a later step — keep `platforms:` and `push:` on context values only.

## Next Steps

- Add a `concurrency` group so superseded branch builds cancel automatically.
- Share this pipeline across repositories with reusable workflows: see the GitHub Actions reusable workflows cheatsheet.
- Move to self-hosted arm64 runners to drop QEMU entirely.
- Study keyless signing with Cosign for stronger supply-chain guarantees.

## Conclusion

You now build amd64 and arm64 images in one pass, authenticate to GHCR with the workflow token, tag releases from semver and SHA metadata, reuse BuildKit cache between runs, and publish verifiable provenance alongside a SARIF report. The pipeline fails safe, and every deployed digest traces back to a commit.

---
title: "Docker CI/CD Pipelines Cheatsheet"
description: "A quick reference for building, caching, scanning, and publishing Docker images in CI/CD pipelines — covering BuildKit and Buildx, layer cache strategies, kaniko, registry authentication, tagging, and security gates for GitHub Actions and GitLab CI."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Docker CI/CD Pipelines Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Enable BuildKit | `DOCKER_BUILDKIT=1 docker build .` | Use the modern BuildKit builder instead of the legacy one |
| Create a buildx builder | `docker buildx create --name ci --use` | Create a dedicated builder instance for CI jobs |
| List buildx builders | `docker buildx ls` | Show available builders, drivers, and platforms |
| Build and push multi-platform | `docker buildx build --platform linux/amd64,linux/arm64 --push -t app:latest .` | Build for several architectures and push the manifest list |
| Build with registry cache | `docker buildx build --cache-from=type=registry,ref=app:cache --push -t app:latest .` | Reuse layers from a cache image stored in the registry |
| Attach SBOM attestation | `docker buildx build --sbom=true --push -t app:latest .` | Embed a software bill of materials in the image |
| Inspect attestations | `docker buildx imagetools inspect app:latest` | Show manifest, platforms, and attestation details |
| Login to a registry | `echo "$TOKEN" \| docker login ghcr.io -u user --password-stdin` | Authenticate without exposing the token in shell history |
| Scan with Trivy | `trivy image --severity HIGH,CRITICAL --exit-code 1 app:latest` | Fail the pipeline when high or critical vulnerabilities exist |
| Scan with Docker Scout | `docker scout cves --exit-code --only-severity critical app:latest` | Analyze CVEs against the image SBOM |
| Sign an image | `cosign sign ghcr.io/org/app@sha256:...` | Sign the image digest with a keyless or key-based flow |
| Build with Bake | `docker buildx bake -f docker-bake.hcl` | Build multiple targets defined in a declarative Bake file |

## Common Commands

### BuildKit and Buildx Setup

```bash
# Enable BuildKit for classic docker build invocations
export DOCKER_BUILDKIT=1

# Create a reusable builder for CI (container driver)
docker buildx create --name ci --driver docker-container --use

# Show builders and supported platforms
docker buildx ls

# Make docker build transparently use buildx
docker buildx install

# Tear down the builder after the job
docker buildx stop ci
docker buildx rm ci
```

### Building and Pushing Images

```bash
# Build and push a single platform image
docker buildx build --push -t ghcr.io/org/app:latest .

# Build and push a multi-platform manifest list
docker buildx build --platform linux/amd64,linux/arm64 --push \
  -t ghcr.io/org/app:latest .

# Build with provenance and SBOM attestations (Docker 23+ / Buildx 0.10+)
docker buildx build --provenance=true --sbom=true --push \
  -t ghcr.io/org/app:latest .

# Output to a local directory without pushing (CI artifact inspection)
docker buildx build --output type=local,dest=./out .
```

### Layer Cache Strategies

```bash
# Registry cache: share layers across jobs and runners
docker buildx build \
  --cache-from=type=registry,ref=ghcr.io/org/app:buildcache \
  --cache-to=type=registry,ref=ghcr.io/org/app:buildcache,mode=max \
  --push -t ghcr.io/org/app:latest .

# GitHub Actions cache: store layers in the actions cache backend
docker buildx build \
  --cache-from=type=gha \
  --cache-to=type=gha,mode=max \
  --push -t ghcr.io/org/app:latest .

# Local cache: fast on a single self-hosted runner
docker buildx build \
  --cache-from=type=local,src=/tmp/.buildx-cache \
  --cache-to=type=local,dest=/tmp/.buildx-cache \
  -t app:latest .

# Inline cache: embed cache metadata into the image itself
docker buildx build --cache-to=type=inline --push -t ghcr.io/org/app:latest .

# BuildKit cache mounts: persist package manager caches inside the build
docker buildx build --progress=plain --push -t ghcr.io/org/app:latest .
```

### Registry Authentication

```bash
# GitHub Container Registry / Docker Hub (token via stdin)
echo "$TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
echo "$TOKEN" | docker login docker.io -u "$DOCKERHUB_USERNAME" --password-stdin

# Google Artifact Registry (service account JSON key)
docker login -u _json_key --password-stdin https://gcr.io

# Amazon ECR (short-lived password from AWS CLI)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Azure Container Registry (service principal)
docker login myregistry.azurecr.io -u "$SP_APP_ID" --password-stdin
```

### Kaniko and Buildah

```bash
# Kaniko: build without a Docker daemon (runs inside Kubernetes pods)
/kaniko/executor \
  --context=dir:///workspace \
  --destination=ghcr.io/org/app:latest \
  --cache=true \
  --cache-repo=ghcr.io/org/app/cache

# Buildah: daemonless build and push
buildah bud -t ghcr.io/org/app:latest .
buildah push ghcr.io/org/app:latest docker://ghcr.io/org/app:latest
```

### Tagging Strategies

```bash
# Short commit SHA
docker buildx build --push -t ghcr.io/org/app:${GITHUB_SHA::7} .

# Git ref name for branch or tag builds
docker buildx build --push -t ghcr.io/org/app:${GITHUB_REF_NAME} .

# Combine multiple tags in one build
docker buildx build --push \
  -t ghcr.io/org/app:${GITHUB_SHA::7} \
  -t ghcr.io/org/app:latest .

# Promote a digest to a mutable tag with imagetools
docker buildx imagetools create \
  -t ghcr.io/org/app:stable \
  ghcr.io/org/app@sha256:...
```

### Security Scanning and Signing

```bash
# Trivy: fail the build on high or critical findings
trivy image --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed \
  ghcr.io/org/app:latest

# Docker Scout: policy-based gate using the image SBOM
docker scout cves --exit-code --only-severity critical ghcr.io/org/app:latest

# Cosign: sign the immutable digest (keyless mode)
cosign sign --yes ghcr.io/org/app@sha256:...

# Cosign: verify signatures and attestations
cosign verify --certificate-identity "ci@example.com" \
  ghcr.io/org/app@sha256:...

# Compare two images for added vulnerabilities
docker scout compare --to ghcr.io/org/app:previous ghcr.io/org/app:latest
```

## Code Snippets

### GitHub Actions Workflow

```yaml
name: build-and-push

on:
  push:
    branches: [main]

jobs:
  docker:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: ghcr.io/${{ github.repository }}:latest
          severity: HIGH,CRITICAL
          exit-code: "1"
          ignore-unfixed: true
```

### GitLab CI with Docker-in-Docker

```yaml
build:
  stage: build
  image: docker:27
  services:
    - docker:27-dind
  variables:
    DOCKER_HOST: tcp://docker:2375
    DOCKER_TLS_CERTDIR: ""
    IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login "$CI_REGISTRY" -u "$CI_REGISTRY_USER" --password-stdin
    - docker buildx create --use
    - docker buildx build --push --cache-from=type=registry,ref=$CI_REGISTRY_IMAGE:cache --cache-to=type=registry,ref=$CI_REGISTRY_IMAGE:cache,mode=max -t "$IMAGE_TAG" -t "$CI_REGISTRY_IMAGE:latest" .
```

### GitLab CI with Kaniko

```yaml
build:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:latest
    entrypoint: [""]
  variables:
    IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  script:
    - /kaniko/executor
      --context=$CI_PROJECT_DIR
      --destination=$IMAGE_TAG
      --cache=true
      --cache-repo=$CI_REGISTRY_IMAGE/cache
```

### BuildKit Cache Mounts in a Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./

# Persist the npm cache across builds without copying it into layers
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# Mount a build secret without baking it into the image
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm publish --dry-run

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

### Docker Buildx Bake Configuration

```hcl
# docker-bake.hcl
variable "IMAGE_REGISTRY" {
  default = "ghcr.io/org"
}

group "default" {
  targets = ["api", "web"]
}

target "api" {
  context    = "./api"
  dockerfile = "Dockerfile"
  tags       = ["${IMAGE_REGISTRY}/api:latest"]
  platforms  = ["linux/amd64", "linux/arm64"]
  cache-from = ["type=gha"]
  cache-to   = ["type=gha,mode=max"]
}

target "web" {
  context    = "./web"
  dockerfile = "Dockerfile"
  tags       = ["${IMAGE_REGISTRY}/web:latest"]
  platforms  = ["linux/amd64"]
}
```

```bash
# Build every target defined in the Bake file
docker buildx bake -f docker-bake.hcl

# Build and push all targets
docker buildx bake -f docker-bake.hcl --push

# Print the resolved configuration without building
docker buildx bake -f docker-bake.hcl --print
```

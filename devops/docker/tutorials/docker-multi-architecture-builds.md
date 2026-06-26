---
title: "Docker Multi-Architecture Builds with Buildx"
description: "A step-by-step tutorial on building Docker images for multiple CPU architectures (ARM64 and AMD64) using Docker Buildx, QEMU emulation, and CI/CD integration."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Docker Multi-Architecture Builds with Buildx

## Summary

Modern computing spans multiple CPU architectures — AMD64 (traditional x86 servers), ARM64 (Apple Silicon Macs, AWS Graviton, Raspberry Pi), and ARMv7 (older Raspberry Pi models). This tutorial teaches you how to build Docker images that run seamlessly on all these platforms using Docker Buildx, QEMU emulation, and multi-architecture manifests. You will set up a multi-architecture build environment, create platform-aware Dockerfiles, test images across architectures, and integrate multi-arch builds into a CI/CD pipeline.

## Target Audience

- DevOps engineers and developers who want their Docker images to run on both Intel/AMD and ARM machines.
- Developers working with Apple Silicon Macs (M1/M2/M3/M4) who need to build and test x86 containers.
- Teams deploying to heterogeneous environments (e.g., AWS Graviton instances alongside x86 servers).
- Intermediate Docker users familiar with building images and Docker Compose.

## Prerequisites

- Docker Engine 20.10+ with Buildx plugin (included by default in Docker Desktop and recent Docker CE releases).
- Basic familiarity with the `docker build` and `docker run` commands.
- A GitHub account and a repository for CI/CD integration (optional but recommended).
- At least one ARM-based machine (Apple Silicon Mac, Raspberry Pi, or AWS Graviton instance) for native testing — or QEMU emulation (covered in this tutorial).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Install and configure Docker Buildx with QEMU cross-platform emulation.
- Create a multi-architecture buildx builder instance.
- Write Dockerfiles that build and run correctly on multiple CPU architectures.
- Build, tag, and push multi-architecture manifest lists to a container registry.
- Test multi-architecture images on different platforms.
- Integrate multi-architecture builds into a GitHub Actions CI/CD pipeline.

## Context and Motivation

The era of homogeneous x86 servers is over. Apple Silicon Macs put ARM64 on every developer's desk. Cloud providers offer ARM-based instances (AWS Graviton, Ampere on Azure, GCP Tau T2A) that deliver better price-performance ratios. Raspberry Pi clusters run ARMv7 and ARM64. Edge computing devices increasingly use ARM architectures.

Without multi-architecture support, you must maintain separate Dockerfiles, separate build pipelines, and separate image tags for each platform. This creates duplication, configuration drift, and increased maintenance burden. A single developer running an Apple Silicon Mac may find that containers built on their machine fail to run on the team's x86 production servers, or vice versa.

Docker Buildx solves this by introducing the concept of **builder instances** that can target multiple platforms simultaneously. Using QEMU user-mode emulation (and optionally native ARM runners in CI), Buildx produces a single **manifest list** that contains references to platform-specific images under one tag. When a user runs `docker pull myimage:latest`, Docker automatically selects the image variant that matches the host's architecture.

## Core Content

### Understanding Multi-Architecture Docker Images

A standard Docker image is tied to a specific operating system and CPU architecture (e.g., `linux/amd64`). A **multi-architecture image** is a manifest list that references multiple platform-specific images under a single tag.

```text
myimage:latest
├── linux/amd64  (manifest)
├── linux/arm64  (manifest)
└── linux/arm/v7 (manifest)
```

When you pull `myimage:latest` on an ARM64 machine, Docker automatically resolves and downloads the ARM64 variant. On an x86 machine, it downloads the AMD64 variant. This is transparent to the end user.

Docker Hub, GitHub Container Registry (GHCR), and most major registries support multi-architecture manifest lists natively.

### How Buildx Works

Buildx is a Docker CLI plugin that extends `docker build` with multi-platform support. It works by:

1. **Creating a builder instance** that can run builds for different architectures.
2. **Using QEMU emulation** (or native nodes) to execute build steps for non-native architectures.
3. **Producing a manifest list** that bundles all platform-specific images under one tag.

The default `docker build` command uses the legacy builder, which targets only the host's native architecture. Buildx replaces it with a modern, driver-based builder that supports multiple backends.

### Setting Up QEMU Emulation for Cross-Platform Builds

QEMU user-mode emulation allows Buildx to run ARM64 build steps on an x86 machine (and vice versa). The `tonistiigi/binfmt` image registers the necessary QEMU emulators on your Docker host.

```bash
# Install QEMU emulators system-wide
docker run --privileged --rm tonistiigi/binfmt --install all
```

This command installs binfmt_misc handlers for multiple architectures (ARM64, ARMv7, ARMv6, s390x, ppc64le, RISCV64). After running it, your Docker host can execute containers for these architectures via emulation.

**Important**: QEMU emulation is slower than native builds (2-5x slower for compute-heavy operations like compilation). For production CI/CD pipelines, consider using native ARM runners alongside x86 runners to improve build speed.

### Creating a Buildx Builder

Buildx uses builder instances to manage build configuration. The default builder (`default`) can only target the host's native platform. Create a new builder that supports multi-platform builds:

```bash
# Create a new builder instance capable of multi-platform builds
docker buildx create --name multiarch --driver docker-container --bootstrap

# Verify the builder is running
docker buildx ls
```

The `--driver docker-container` flag creates a builder backed by a Docker container (rather than the legacy builder). This container runs a BuildKit daemon with multi-platform support.

Output of `docker buildx ls` should show:

```text
NAME/NODE    DRIVER/ENDPOINT             STATUS   BUILDKIT   PLATFORMS
multiarch    docker-container
  multiarch0 unix:///var/run/docker.sock running  v0.15.1    linux/amd64, linux/arm64, linux/arm/v7, linux/arm/v6, ...
```

If you see only `linux/amd64` under PLATFORMS, you need to install QEMU emulators (see the previous section).

### Writing Platform-Aware Dockerfiles

Multi-architecture builds work best when your Dockerfile is platform-agnostic. Most Dockerfiles that use official base images (like `node:20-alpine`, `python:3.12-slim`, or `golang:1.22`) already support multiple architectures because the official images provide multi-arch manifests.

**Good — works on all platforms:**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

**Problematic — architecture-specific dependencies:**

```dockerfile
FROM python:3.12-slim
RUN pip install --no-cache-dir \
    psycopg2-binary \
    numpy \
    scipy
COPY . /app
CMD ["python", "app.py"]
```

Python packages like `numpy` and `scipy` contain compiled C extensions. The `pip install` step compiles these libraries during image build, which succeeds on the native architecture but may fail or produce incorrect binaries under QEMU emulation. Solutions:

1. **Use pre-built wheels** from PyPI (most popular packages now ship `manylinux` wheels for both AMD64 and ARM64).
2. **Pin platform-specific base images** and build on native hardware when possible.
3. **Use multi-stage builds** to separate compilation from runtime.

**Platform-conditional logic with build arguments:**

```dockerfile
FROM node:20-alpine AS build

ARG TARGETPLATFORM
ARG BUILDPLATFORM

RUN echo "Building on ${BUILDPLATFORM} for ${TARGETPLATFORM}"

# Install platform-specific packages
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
        apk add --no-cache build-base; \
    fi

COPY package.json .
RUN npm ci

FROM node:20-alpine
COPY --from=build /app/node_modules ./node_modules
COPY . .
CMD ["node", "server.js"]
```

Buildx automatically sets these pre-defined build arguments:
- `TARGETPLATFORM` — the platform being built for (e.g., `linux/arm64`)
- `TARGETOS` — just the OS component (e.g., `linux`)
- `TARGETARCH` — just the architecture (e.g., `arm64`)
- `BUILDPLATFORM` — the platform running the build (e.g., `linux/amd64`)
- `BUILDOS` — just the OS of the build host
- `BUILDARCH` — just the architecture of the build host

### Building and Pushing Multi-Architecture Images

Once your builder is configured, building for multiple platforms is a single command:

```bash
# Build for AMD64 and ARM64 simultaneously
docker buildx build \
  --builder multiarch \
  --platform linux/amd64,linux/arm64 \
  --tag yourusername/multiarch-demo:latest \
  --push .
```

The `--platform` flag specifies the target platforms as a comma-separated list. The `--push` flag pushes the resulting manifest list directly to the registry.

**Without `--push`**, Buildx outputs a local manifest list that `docker buildx imagetools inspect` can inspect, but individual images are not saved to the local image store (the legacy builder's `docker images` won't show them). To load an image for local testing, use `--load` with a single platform:

```bash
# Load a single-platform image into the local Docker store for testing
docker buildx build \
  --builder multiarch \
  --platform linux/arm64 \
  --tag multiarch-demo:test \
  --load .
```

### Testing Multi-Architecture Images

To verify that your image works on a specific architecture, you have three options:

**Option 1 — Run via QEMU emulation:**

```bash
# Force running an AMD64 image on an ARM64 host (or vice versa)
docker run --rm --platform linux/amd64 multiarch-demo:test uname -m
```

This uses QEMU emulation under the hood. It works for testing but performance will differ from native execution.

**Option 2 — Test on native hardware:**

```bash
# Run on an ARM64 machine (Apple Silicon, Graviton, Raspberry Pi 4/5)
docker run --rm multiarch-demo:latest uname -m
# Expected output: aarch64
```

**Option 3 — Use `docker buildx imagetools` to inspect the manifest:**

```bash
# Inspect the manifest list of a pushed multi-arch image
docker buildx imagetools inspect yourusername/multiarch-demo:latest
```

This command shows all platform-specific manifests without pulling the full image:

```text
Name:      docker.io/yourusername/multiarch-demo:latest
MediaType: application/vnd.docker.distribution.manifest.list.v2+json
Digest:    sha256:a1b2c3d4e5f6...

Manifests:
  linux/amd64  @sha256:...
  linux/arm64  @sha256:...
```

### Integrating Multi-Architecture Builds into CI/CD

Multi-architecture builds shine in CI/CD pipelines. Here is a complete GitHub Actions workflow that builds and pushes a multi-arch image:

```yaml
name: Multi-Arch Docker Build

on:
  push:
    branches: [main]
    tags: ["v*"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}

      - name: Build and push multi-architecture image
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64,linux/arm/v7
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

Key steps in this workflow:

1. **`setup-qemu-action`** — installs QEMU emulators on the GitHub runner so Buildx can build ARM images on the x86 runner.
2. **`setup-buildx-action`** — configures a Buildx builder with multi-platform support.
3. **`docker/metadata-action`** — automatically generates tags (`latest`, `v1.2.3`, etc.) and labels from Git tags and branch names.
4. **`docker/build-push-action`** — builds for all three platforms (AMD64, ARM64, ARMv7) and pushes the manifest list.
5. **`cache-from` / `cache-to` with `gha`** — uses GitHub Actions cache to speed up subsequent builds by reusing layer caches across CI runs.

## Code Examples

### Complete Multi-Architecture Application

This example builds a simple Go HTTP server that reports its architecture at runtime.

**`main.go`:**

```go
package main

import (
    "fmt"
    "log"
    "net/http"
    "runtime"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello from %s/%s!\n", runtime.GOOS, runtime.GOARCH)
    })
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

**`Dockerfile`:**

```dockerfile
FROM golang:1.22-alpine AS build

ARG TARGETOS
ARG TARGETARCH

WORKDIR /app
COPY main.go .
RUN go build -o /server main.go

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /server /server
EXPOSE 8080
CMD ["/server"]
```

**Building and testing multi-arch:**

```bash
# Build for both architectures and push
docker buildx build \
  --builder multiarch \
  --platform linux/amd64,linux/arm64 \
  --tag yourusername/arch-demo:latest \
  --push .

# Test on a Raspberry Pi or Apple Silicon Mac
docker run --rm yourusername/arch-demo:latest

# Expected output: "Server starting on :8080"
# curl http://localhost:8080 -> "Hello from linux/arm64!"
```

### Platform-Specific Conditional Build

Sometimes you need different dependencies per platform. This Dockerfile installs build tools conditionally:

```dockerfile
FROM python:3.12-slim AS build

ARG TARGETARCH

WORKDIR /app
COPY requirements.txt .

# Install system dependencies needed only on ARM64
RUN if [ "$TARGETARCH" = "arm64" ]; then \
        apt-get update && apt-get install -y gfortran libopenblas-dev && \
        rm -rf /var/lib/apt/lists/*; \
    fi

RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim
COPY --from=build /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY app.py .
CMD ["python", "app.py"]
```

### Using Docker Compose with Multi-Architecture Images

Compose can reference multi-architecture images directly — it automatically selects the correct variant for the host:

```yaml
services:
  web:
    image: ghcr.io/myorg/webapp:latest
    ports:
      - "8080:8080"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

Both `ghcr.io/myorg/webapp:latest` (your multi-arch image) and `redis:7-alpine` (which is multi-arch by default) will resolve to the correct platform on any host architecture.

## Key Insights

- **Use the `docker-container` driver for Buildx**, not the default legacy builder. The legacy builder cannot produce multi-architecture manifest lists. The `docker-container` driver runs a dedicated BuildKit daemon that supports cross-platform builds.
- **QEMU emulation is a development tool, not a production build strategy.** Emulated builds are 2-5x slower than native builds. For CI/CD pipelines, consider using native ARM runners (GitHub Actions now offers ARM64 runners in beta) or splitting builds across native runner types.
- **Official base images are almost always multi-architecture.** Alpine, Ubuntu, Debian, `golang`, `node`, `python` — all major official images support AMD64 and ARM64. Use them and your Dockerfile is likely platform-agnostic without changes.
- **Compiled languages require special attention.** Go (with `CGO_ENABLED=0`), Rust, and Zig compile to static binaries and work seamlessly across architectures. Python, Ruby, and Node.js packages with native extensions (C bindings) may fail under emulation — use pre-built wheels or pin platform-specific dependencies.
- **Layer caching is platform-specific.** BuildKit caches layers per platform. A build for `linux/amd64,linux/arm64` produces two separate layer caches. The GitHub Actions cache action (`type=gha`) stores these separately, which increases cache storage but ensures correct layer reuse.
- **Always test your image on the target architecture before deploying.** A Dockerfile that builds successfully under QEMU emulation may produce incorrect binaries for native execution, especially when compiled code detects CPU features (e.g., `-march=native`, AVX instructions). Test on real ARM hardware or use native CI runners for production builds.

## Next Steps

- Study the [Docker Containerization Syllabus](../syllabi/docker-containerization-syllabus.md) for a comprehensive learning path on Docker fundamentals and production operations.
- Learn about Docker security scanning with Docker Scout and Trivy to secure your multi-architecture images.
- Explore native ARM CI/CD runners: GitHub Actions ARM runners, AWS CodeBuild with ARM environments, and GitLab ARM runners.
- Dive into Kubernetes multi-architecture clusters: deploying AMD64 and ARM64 nodes in the same cluster with node affinity.

## Conclusion

You have learned how to build Docker images that run seamlessly across AMD64, ARM64, and ARMv7 platforms using Docker Buildx. You set up QEMU emulation, created a multi-architecture builder, wrote platform-aware Dockerfiles, built and pushed manifest lists, tested images on different architectures, and integrated multi-architecture builds into a CI/CD pipeline. With these skills, your Docker images will work everywhere — from a developer's Apple Silicon Macbook to ARM-based cloud instances and traditional x86 servers — without separate build pipelines or manual configuration.

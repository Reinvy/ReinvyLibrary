---
title: "Cheat Sheet Pipeline CI/CD Docker"
description: "Referensi cepat untuk membangun, menyimpan cache, memindai, dan memublikasikan image Docker dalam pipeline CI/CD — mencakup BuildKit dan Buildx, strategi cache lapisan, kaniko, autentikasi registry, penandaan tag, dan gerbang keamanan untuk GitHub Actions dan GitLab CI."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Pipeline CI/CD Docker

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Mengaktifkan BuildKit | `DOCKER_BUILDKIT=1 docker build .` | Menggunakan builder BuildKit modern alih-alih builder lama |
| Membuat builder buildx | `docker buildx create --name ci --use` | Membuat instance builder khusus untuk pekerjaan CI |
| Mendaftar builder buildx | `docker buildx ls` | Menampilkan builder yang tersedia, driver, dan platform |
| Build dan push multi-platform | `docker buildx build --platform linux/amd64,linux/arm64 --push -t app:latest .` | Membangun untuk beberapa arsitektur dan push daftar manifest |
| Build dengan cache registry | `docker buildx build --cache-from=type=registry,ref=app:cache --push -t app:latest .` | Menggunakan ulang lapisan dari image cache yang tersimpan di registry |
| Melampirkan attestation SBOM | `docker buildx build --sbom=true --push -t app:latest .` | Menyematkan bill of materials perangkat lunak ke dalam image |
| Memeriksa attestation | `docker buildx imagetools inspect app:latest` | Menampilkan manifest, platform, dan detail attestation |
| Login ke registry | `echo "$TOKEN" \| docker login ghcr.io -u user --password-stdin` | Autentikasi tanpa mengekspos token di riwayat shell |
| Memindai dengan Trivy | `trivy image --severity HIGH,CRITICAL --exit-code 1 app:latest` | Menggagalkan pipeline ketika terdapat kerentanan high atau critical |
| Memindai dengan Docker Scout | `docker scout cves --exit-code --only-severity critical app:latest` | Menganalisis CVE terhadap SBOM image |
| Menandatangani image | `cosign sign ghcr.io/org/app@sha256:...` | Menandatangani digest image dengan alur keyless atau berbasis kunci |
| Build dengan Bake | `docker buildx bake -f docker-bake.hcl` | Membangun beberapa target yang didefinisikan dalam file Bake deklaratif |

## Perintah Umum

### Penyiapan BuildKit dan Buildx

```bash
# Mengaktifkan BuildKit untuk pemanggilan docker build klasik
export DOCKER_BUILDKIT=1

# Membuat builder yang dapat digunakan ulang untuk CI (driver container)
docker buildx create --name ci --driver docker-container --use

# Menampilkan builder dan platform yang didukung
docker buildx ls

# Membuat docker build menggunakan buildx secara transparan
docker buildx install

# Menghentikan builder setelah pekerjaan selesai
docker buildx stop ci
docker buildx rm ci
```

### Membangun dan Mendorong Image

```bash
# Build dan push image platform tunggal
docker buildx build --push -t ghcr.io/org/app:latest .

# Build dan push daftar manifest multi-platform
docker buildx build --platform linux/amd64,linux/arm64 --push \
  -t ghcr.io/org/app:latest .

# Build dengan attestation provenance dan SBOM (Docker 23+ / Buildx 0.10+)
docker buildx build --provenance=true --sbom=true --push \
  -t ghcr.io/org/app:latest .

# Output ke direktori lokal tanpa push (inspeksi artefak CI)
docker buildx build --output type=local,dest=./out .
```

### Strategi Cache Lapisan

```bash
# Cache registry: berbagi lapisan antar pekerjaan dan runner
docker buildx build \
  --cache-from=type=registry,ref=ghcr.io/org/app:buildcache \
  --cache-to=type=registry,ref=ghcr.io/org/app:buildcache,mode=max \
  --push -t ghcr.io/org/app:latest .

# Cache GitHub Actions: menyimpan lapisan di backend cache actions
docker buildx build \
  --cache-from=type=gha \
  --cache-to=type=gha,mode=max \
  --push -t ghcr.io/org/app:latest .

# Cache lokal: cepat pada satu runner self-hosted
docker buildx build \
  --cache-from=type=local,src=/tmp/.buildx-cache \
  --cache-to=type=local,dest=/tmp/.buildx-cache \
  -t app:latest .

# Cache inline: menyematkan metadata cache ke dalam image itu sendiri
docker buildx build --cache-to=type=inline --push -t ghcr.io/org/app:latest .

# Cache mount BuildKit: mempertahankan cache manajer paket di dalam build
docker buildx build --progress=plain --push -t ghcr.io/org/app:latest .
```

### Autentikasi Registry

```bash
# GitHub Container Registry / Docker Hub (token melalui stdin)
echo "$TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
echo "$TOKEN" | docker login docker.io -u "$DOCKERHUB_USERNAME" --password-stdin

# Google Artifact Registry (kunci JSON akun layanan)
docker login -u _json_key --password-stdin https://gcr.io

# Amazon ECR (password berumur pendek dari AWS CLI)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Azure Container Registry (service principal)
docker login myregistry.azurecr.io -u "$SP_APP_ID" --password-stdin
```

### Kaniko dan Buildah

```bash
# Kaniko: build tanpa daemon Docker (berjalan di dalam pod Kubernetes)
/kaniko/executor \
  --context=dir:///workspace \
  --destination=ghcr.io/org/app:latest \
  --cache=true \
  --cache-repo=ghcr.io/org/app/cache

# Buildah: build dan push tanpa daemon
buildah bud -t ghcr.io/org/app:latest .
buildah push ghcr.io/org/app:latest docker://ghcr.io/org/app:latest
```

### Strategi Penandaan Tag

```bash
# SHA commit pendek
docker buildx build --push -t ghcr.io/org/app:${GITHUB_SHA::7} .

# Nama ref git untuk build cabang atau tag
docker buildx build --push -t ghcr.io/org/app:${GITHUB_REF_NAME} .

# Menggabungkan beberapa tag dalam satu build
docker buildx build --push \
  -t ghcr.io/org/app:${GITHUB_SHA::7} \
  -t ghcr.io/org/app:latest .

# Mempromosikan digest ke tag yang dapat berubah dengan imagetools
docker buildx imagetools create \
  -t ghcr.io/org/app:stable \
  ghcr.io/org/app@sha256:...
```

### Pemindaian Keamanan dan Penandatanganan

```bash
# Trivy: menggagalkan build pada temuan high atau critical
trivy image --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed \
  ghcr.io/org/app:latest

# Docker Scout: gerbang berbasis kebijakan menggunakan SBOM image
docker scout cves --exit-code --only-severity critical ghcr.io/org/app:latest

# Cosign: menandatangani digest yang tidak dapat diubah (mode keyless)
cosign sign --yes ghcr.io/org/app@sha256:...

# Cosign: memverifikasi tanda tangan dan attestation
cosign verify --certificate-identity "ci@example.com" \
  ghcr.io/org/app@sha256:...

# Membandingkan dua image untuk kerentanan yang baru muncul
docker scout compare --to ghcr.io/org/app:previous ghcr.io/org/app:latest
```

## Potongan Kode

### Workflow GitHub Actions

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

### GitLab CI dengan Docker-in-Docker

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

### GitLab CI dengan Kaniko

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

### Cache Mount BuildKit dalam Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./

# Mempertahankan cache npm antar build tanpa menyalinnya ke dalam lapisan
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# Memasang secret build tanpa menyematkannya ke dalam image
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm publish --dry-run

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

### Konfigurasi Docker Buildx Bake

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
# Membangun setiap target yang didefinisikan dalam file Bake
docker buildx bake -f docker-bake.hcl

# Build dan push semua target
docker buildx bake -f docker-bake.hcl --push

# Menampilkan konfigurasi hasil resolusi tanpa membangun
docker buildx bake -f docker-bake.hcl --print
```

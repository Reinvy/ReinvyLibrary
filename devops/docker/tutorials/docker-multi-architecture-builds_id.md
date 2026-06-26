---
title: "Build Multi-Arsitektur Docker dengan Buildx"
description: "Tutorial langkah demi langkah tentang membangun image Docker untuk berbagai arsitektur CPU (ARM64 dan AMD64) menggunakan Docker Buildx, emulasi QEMU, dan integrasi CI/CD."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Build Multi-Arsitektur Docker dengan Buildx

## Ringkasan

Komputasi modern mencakup berbagai arsitektur CPU — AMD64 (server x86 tradisional), ARM64 (Mac Apple Silicon, AWS Graviton, Raspberry Pi), dan ARMv7 (Raspberry Pi model lama). Tutorial ini mengajarkan Anda cara membangun image Docker yang berjalan mulus di semua platform tersebut menggunakan Docker Buildx, emulasi QEMU, dan manifes multi-arsitektur. Anda akan menyiapkan lingkungan build multi-arsitektur, menulis Dockerfile yang sadar platform, menguji image di berbagai arsitektur, dan mengintegrasikan build multi-arsitektur ke dalam pipeline CI/CD.

## Target Audiens

- Insinyur DevOps dan pengembang yang ingin image Docker mereka berjalan di mesin Intel/AMD dan ARM.
- Pengembang yang bekerja dengan Mac Apple Silicon (M1/M2/M3/M4) yang perlu membangun dan menguji container x86.
- Tim yang menggunakan lingkungan heterogen (misalnya, instance AWS Graviton bersama server x86).
- Pengguna Docker tingkat menengah yang terbiasa dengan perintah `docker build` dan `docker run`.

## Prasyarat

- Docker Engine 20.10+ dengan plugin Buildx (tersedia secara default di Docker Desktop dan rilis Docker CE terbaru).
- Familiaritas dasar dengan perintah `docker build` dan `docker run`.
- Akun GitHub dan repositori untuk integrasi CI/CD (opsional tetapi disarankan).
- Setidaknya satu mesin berbasis ARM (Mac Apple Silicon, Raspberry Pi, atau instance AWS Graviton) untuk pengujian native — atau emulasi QEMU (dibahas dalam tutorial ini).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menginstal dan mengkonfigurasi Docker Buildx dengan emulasi lintas platform QEMU.
- Membuat instance builder buildx multi-arsitektur.
- Menulis Dockerfile yang membangun dan berjalan dengan benar di berbagai arsitektur CPU.
- Membangun, memberi tag, dan mendorong daftar manifes multi-arsitektur ke registry container.
- Menguji image multi-arsitektur di berbagai platform.
- Mengintegrasikan build multi-arsitektur ke dalam pipeline CI/CD GitHub Actions.

## Konteks dan Motivasi

Era server x86 yang homogen sudah berakhir. Apple Silicon Mac membawa ARM64 ke setiap meja pengembang. Penyedia cloud menawarkan instance berbasis ARM (AWS Graviton, Ampere di Azure, GCP Tau T2A) dengan rasio harga-kinerja yang lebih baik. Cluster Raspberry Pi menjalankan ARMv7 dan ARM64. Perangkat komputasi edge semakin banyak menggunakan arsitektur ARM.

Tanpa dukungan multi-arsitektur, Anda harus memelihara Dockerfile terpisah, pipeline build terpisah, dan tag image terpisah untuk setiap platform. Ini menciptakan duplikasi, penyimpangan konfigurasi, dan beban pemeliharaan yang meningkat. Seorang pengembang yang menggunakan Mac Apple Silicon mungkin menemukan container yang dibangun di mesin mereka gagal berjalan di server produksi x86 tim, atau sebaliknya.

Docker Buildx memecahkan masalah ini dengan memperkenalkan konsep **instance builder** yang dapat menargetkan beberapa platform secara bersamaan. Menggunakan emulasi QEMU (dan opsionalnya runner ARM native di CI), Buildx menghasilkan satu **daftar manifes** yang berisi referensi ke image spesifik platform di bawah satu tag. Ketika pengguna menjalankan `docker pull myimage:latest`, Docker secara otomatis memilih varian image yang sesuai dengan arsitektur host.

## Konten Inti

### Memahami Image Docker Multi-Arsitektur

Image Docker standar terikat pada sistem operasi dan arsitektur CPU tertentu (misalnya, `linux/amd64`). **Image multi-arsitektur** adalah daftar manifes yang mereferensikan beberapa image spesifik platform di bawah satu tag.

```text
myimage:latest
├── linux/amd64  (manifes)
├── linux/arm64  (manifes)
└── linux/arm/v7 (manifes)
```

Ketika Anda menarik `myimage:latest` di mesin ARM64, Docker secara otomatis menyelesaikan dan mengunduh varian ARM64. Di mesin x86, Docker mengunduh varian AMD64. Ini transparan bagi pengguna akhir.

Docker Hub, GitHub Container Registry (GHCR), dan sebagian besar registry utama mendukung daftar manifes multi-arsitektur secara native.

### Cara Kerja Buildx

Buildx adalah plugin CLI Docker yang memperluas `docker build` dengan dukungan multi-platform. Cara kerjanya:

1. **Membuat instance builder** yang dapat menjalankan build untuk berbagai arsitektur.
2. **Menggunakan emulasi QEMU** (atau node native) untuk mengeksekusi langkah build untuk arsitektur non-native.
3. **Menghasilkan daftar manifes** yang menggabungkan semua image spesifik platform di bawah satu tag.

Perintah `docker build` default menggunakan builder lama yang hanya menargetkan arsitektur native host. Buildx menggantikannya dengan builder modern berbasis driver yang mendukung beberapa backend.

### Menyiapkan Emulasi QEMU untuk Build Lintas Platform

Emulasi QEMU memungkinkan Buildx menjalankan langkah build ARM64 di mesin x86 (dan sebaliknya). Image `tonistiigi/binfmt` mendaftarkan emulator QEMU yang diperlukan di host Docker Anda.

```bash
# Menginstal emulator QEMU secara sistem-wide
docker run --privileged --rm tonistiigi/binfmt --install all
```

Perintah ini menginstal handler binfmt_misc untuk berbagai arsitektur (ARM64, ARMv7, ARMv6, s390x, ppc64le, RISCV64). Setelah menjalankannya, host Docker Anda dapat mengeksekusi container untuk arsitektur ini melalui emulasi.

**Penting**: Emulasi QEMU lebih lambat daripada build native (2-5x lebih lambat untuk operasi berat komputasi seperti kompilasi). Untuk pipeline CI/CD produksi, pertimbangkan untuk menggunakan runner ARM native bersama runner x86 untuk meningkatkan kecepatan build.

### Membuat Builder Buildx

Buildx menggunakan instance builder untuk mengelola konfigurasi build. Builder default (`default`) hanya dapat menargetkan platform native host. Buat builder baru yang mendukung build multi-platform:

```bash
# Membuat instance builder baru yang mendukung build multi-platform
docker buildx create --name multiarch --driver docker-container --bootstrap

# Memverifikasi bahwa builder berjalan
docker buildx ls
```

Flag `--driver docker-container` membuat builder yang didukung oleh container Docker (bukan builder lama). Container ini menjalankan daemon BuildKit dengan dukungan multi-platform.

Output dari `docker buildx ls` akan menampilkan:

```text
NAME/NODE    DRIVER/ENDPOINT             STATUS   BUILDKIT   PLATFORMS
multiarch    docker-container
  multiarch0 unix:///var/run/docker.sock running  v0.15.1    linux/amd64, linux/arm64, linux/arm/v7, linux/arm/v6, ...
```

Jika Anda hanya melihat `linux/amd64` di bawah PLATFORMS, Anda perlu menginstal emulator QEMU (lihat bagian sebelumnya).

### Menulis Dockerfile yang Sadar Platform

Build multi-arsitektur bekerja paling baik ketika Dockerfile Anda agnostik platform. Sebagian besar Dockerfile yang menggunakan base image resmi (seperti `node:20-alpine`, `python:3.12-slim`, atau `golang:1.22`) sudah mendukung berbagai arsitektur karena image resmi menyediakan manifes multi-arsitektur.

**Baik — berfungsi di semua platform:**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

**Bermasalah — dependensi spesifik arsitektur:**

```dockerfile
FROM python:3.12-slim
RUN pip install --no-cache-dir \
    psycopg2-binary \
    numpy \
    scipy
COPY . /app
CMD ["python", "app.py"]
```

Paket Python seperti `numpy` dan `scipy` mengandung ekstensi C yang dikompilasi. Langkah `pip install` mengkompilasi library ini selama build image, yang berhasil di arsitektur native tetapi bisa gagal atau menghasilkan binary yang salah di bawah emulasi QEMU. Solusi:

1. **Gunakan wheel pra-bangun** dari PyPI (sebagian besar paket populer kini menyediakan wheel `manylinux` untuk AMD64 dan ARM64).
2. **Pin base image spesifik platform** dan build di hardware native jika memungkinkan.
3. **Gunakan build multi-tahap** untuk memisahkan kompilasi dari runtime.

**Logika kondisional platform dengan argumen build:**

```dockerfile
FROM node:20-alpine AS build

ARG TARGETPLATFORM
ARG BUILDPLATFORM

RUN echo "Membangun di ${BUILDPLATFORM} untuk ${TARGETPLATFORM}"

# Menginstal paket spesifik platform
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

Buildx secara otomatis mengatur argumen build yang telah ditentukan:
- `TARGETPLATFORM` — platform yang dibangun (misalnya, `linux/arm64`)
- `TARGETOS` — hanya komponen OS (misalnya, `linux`)
- `TARGETARCH` — hanya arsitektur (misalnya, `arm64`)
- `BUILDPLATFORM` — platform yang menjalankan build (misalnya, `linux/amd64`)
- `BUILDOS` — hanya OS dari host build
- `BUILDARCH` — hanya arsitektur dari host build

### Membangun dan Mendorong Image Multi-Arsitektur

Setelah builder Anda dikonfigurasi, membangun untuk beberapa platform adalah satu perintah:

```bash
# Membangun untuk AMD64 dan ARM64 secara bersamaan
docker buildx build \
  --builder multiarch \
  --platform linux/amd64,linux/arm64 \
  --tag namapengguna/multiarch-demo:latest \
  --push .
```

Flag `--platform` menentukan platform target sebagai daftar yang dipisahkan koma. Flag `--push` mendorong daftar manifes yang dihasilkan langsung ke registry.

**Tanpa `--push`**, Buildx menghasilkan daftar manifes lokal yang dapat diperiksa dengan `docker buildx imagetools inspect`, tetapi image individual tidak disimpan di penyimpanan image lokal (`docker images` tidak akan menampilkannya). Untuk memuat image untuk pengujian lokal, gunakan `--load` dengan satu platform:

```bash
# Memuat image satu platform ke penyimpanan Docker lokal untuk pengujian
docker buildx build \
  --builder multiarch \
  --platform linux/arm64 \
  --tag multiarch-demo:test \
  --load .
```

### Menguji Image Multi-Arsitektur

Untuk memverifikasi bahwa image Anda berfungsi di arsitektur tertentu, Anda memiliki tiga opsi:

**Opsi 1 — Jalankan melalui emulasi QEMU:**

```bash
# Memaksa menjalankan image AMD64 di host ARM64 (atau sebaliknya)
docker run --rm --platform linux/amd64 multiarch-demo:test uname -m
```

Ini menggunakan emulasi QEMU di balik layar. Berfungsi untuk pengujian tetapi kinerja akan berbeda dari eksekusi native.

**Opsi 2 — Uji di hardware native:**

```bash
# Jalankan di mesin ARM64 (Apple Silicon, Graviton, Raspberry Pi 4/5)
docker run --rm multiarch-demo:latest uname -m
# Output yang diharapkan: aarch64
```

**Opsi 3 — Gunakan `docker buildx imagetools` untuk memeriksa manifes:**

```bash
# Memeriksa daftar manifes dari image multi-arsitektur yang sudah didorong
docker buildx imagetools inspect namapengguna/multiarch-demo:latest
```

Perintah ini menampilkan semua manifes spesifik platform tanpa menarik image penuh:

```text
Name:      docker.io/namapengguna/multiarch-demo:latest
MediaType: application/vnd.docker.distribution.manifest.list.v2+json
Digest:    sha256:a1b2c3d4e5f6...

Manifests:
  linux/amd64  @sha256:...
  linux/arm64  @sha256:...
```

### Mengintegrasikan Build Multi-Arsitektur ke dalam CI/CD

Build multi-arsitektur sangat berguna dalam pipeline CI/CD. Berikut adalah workflow GitHub Actions lengkap yang membangun dan mendorong image multi-arsitektur:

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

Langkah-langkah kunci dalam workflow ini:

1. **`setup-qemu-action`** — menginstal emulator QEMU di runner GitHub sehingga Buildx dapat membangun image ARM di runner x86.
2. **`setup-buildx-action`** — mengkonfigurasi builder Buildx dengan dukungan multi-platform.
3. **`docker/metadata-action`** — secara otomatis menghasilkan tag (`latest`, `v1.2.3`, dll.) dan label dari tag Git dan nama cabang.
4. **`docker/build-push-action`** — membangun untuk ketiga platform (AMD64, ARM64, ARMv7) dan mendorong daftar manifes.
5. **`cache-from` / `cache-to` dengan `gha`** — menggunakan cache GitHub Actions untuk mempercepat build berikutnya dengan menggunakan kembali cache layer di seluruh eksekusi CI.

## Contoh Kode

### Aplikasi Multi-Arsitektur Lengkap

Contoh ini membangun server HTTP Go sederhana yang melaporkan arsitekturnya saat runtime.

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
        fmt.Fprintf(w, "Halo dari %s/%s!\n", runtime.GOOS, runtime.GOARCH)
    })
    log.Println("Server dimulai di :8080")
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

**Membangun dan menguji multi-arsitektur:**

```bash
# Membangun untuk kedua arsitektur dan mendorong
docker buildx build \
  --builder multiarch \
  --platform linux/amd64,linux/arm64 \
  --tag namapengguna/arch-demo:latest \
  --push .

# Menguji di Raspberry Pi atau Mac Apple Silicon
docker run --rm namapengguna/arch-demo:latest

# Output yang diharapkan: "Server dimulai di :8080"
# curl http://localhost:8080 -> "Halo dari linux/arm64!"
```

### Build Kondisional Spesifik Platform

Terkadang Anda membutuhkan dependensi yang berbeda per platform. Dockerfile ini menginstal alat build secara kondisional:

```dockerfile
FROM python:3.12-slim AS build

ARG TARGETARCH

WORKDIR /app
COPY requirements.txt .

# Menginstal dependensi sistem yang diperlukan hanya di ARM64
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

### Menggunakan Docker Compose dengan Image Multi-Arsitektur

Compose dapat mereferensikan image multi-arsitektur secara langsung — secara otomatis memilih varian yang benar untuk host:

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

Baik `ghcr.io/myorg/webapp:latest` (image multi-arsitektur Anda) maupun `redis:7-alpine` (yang secara default sudah multi-arsitektur) akan diselesaikan ke platform yang benar di arsitektur host mana pun.

## Insight Penting

- **Gunakan driver `docker-container` untuk Buildx**, bukan builder legacy default. Builder legacy tidak dapat menghasilkan daftar manifes multi-arsitektur. Driver `docker-container` menjalankan daemon BuildKit khusus yang mendukung build lintas platform.
- **Emulasi QEMU adalah alat pengembangan, bukan strategi build produksi.** Build yang diemulasi 2-5x lebih lambat daripada build native. Untuk pipeline CI/CD, pertimbangkan untuk menggunakan runner ARM native (GitHub Actions kini menawarkan runner ARM64 dalam beta) atau membagi build di berbagai jenis runner native.
- **Base image resmi hampir selalu multi-arsitektur.** Alpine, Ubuntu, Debian, `golang`, `node`, `python` — semua image resmi utama mendukung AMD64 dan ARM64. Gunakan image tersebut dan Dockerfile Anda kemungkinan besar sudah agnostik platform tanpa perubahan.
- **Bahasa yang dikompilasi memerlukan perhatian khusus.** Go (dengan `CGO_ENABLED=0`), Rust, dan Zig mengkompilasi ke binary statis dan berfungsi mulus di berbagai arsitektur. Paket Python, Ruby, dan Node.js dengan ekstensi native (binding C) mungkin gagal di bawah emulasi — gunakan wheel pra-bangun atau pin dependensi spesifik platform.
- **Cache layer bersifat spesifik platform.** BuildKit menyimpan cache layer per platform. Build untuk `linux/amd64,linux/arm64` menghasilkan dua cache layer terpisah. Tindakan cache GitHub Actions (`type=gha`) menyimpannya secara terpisah, yang meningkatkan penyimpanan cache tetapi memastikan penggunaan kembali layer yang benar.
- **Selalu uji image Anda di arsitektur target sebelum menerapkan.** Dockerfile yang berhasil dibangun di bawah emulasi QEMU dapat menghasilkan binary yang salah untuk eksekusi native, terutama ketika kode yang dikompilasi mendeteksi fitur CPU (misalnya, `-march=native`, instruksi AVX). Uji di hardware ARM asli atau gunakan runner CI native untuk build produksi.

## Langkah Berikutnya

- Pelajari [Syllabus Containerisasi Docker](../syllabi/docker-containerization-syllabus.md) untuk jalur pembelajaran komprehensif tentang fundamental Docker dan operasi produksi.
- Pelajari tentang pemindaian keamanan Docker dengan Docker Scout dan Trivy untuk mengamankan image multi-arsitektur Anda.
- Jelajahi runner CI/CD ARM native: GitHub Actions ARM runners, AWS CodeBuild dengan lingkungan ARM, dan GitLab ARM runners.
- Pelajari cluster Kubernetes multi-arsitektur: menerapkan node AMD64 dan ARM64 di cluster yang sama dengan node affinity.

## Kesimpulan

Anda telah mempelajari cara membangun image Docker yang berjalan mulus di platform AMD64, ARM64, dan ARMv7 menggunakan Docker Buildx. Anda menyiapkan emulasi QEMU, membuat builder multi-arsitektur, menulis Dockerfile yang sadar platform, membangun dan mendorong daftar manifes, menguji image di berbagai arsitektur, dan mengintegrasikan build multi-arsitektur ke dalam pipeline CI/CD. Dengan keterampilan ini, image Docker Anda akan berfungsi di mana saja — dari Macbook Apple Silicon pengembang hingga instance cloud berbasis ARM dan server x86 tradisional — tanpa pipeline build terpisah atau konfigurasi manual.

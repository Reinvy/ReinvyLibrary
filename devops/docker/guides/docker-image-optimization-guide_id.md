---
title: "Panduan Optimasi Gambar Docker dan Praktik Terbaik"
description: "Panduan komprehensif untuk membangun gambar Docker yang efisien, aman, dan siap produksi — mencakup multi-stage build, caching lapisan, pemilihan base image, pengurangan ukuran gambar, pemindaian keamanan, dan praktik terbaik rantai pasok."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Optimasi Gambar Docker dan Praktik Terbaik

## Pendahuluan

Gambar Docker (Docker images) adalah blok bangunan fundamental dari aplikasi yang dikontainerisasi. Gambar yang tidak efisien berarti deployment yang lebih lambat, biaya penyimpanan yang lebih tinggi, permukaan serangan yang lebih besar, dan pipeline CI/CD yang lebih panjang. Namun banyak tim menganggap pembuatan gambar sebagai sesuatu yang sepele — menggunakan base image yang besar, melewatkan file `.dockerignore`, dan menggunakan Dockerfile tahap tunggal yang menggabungkan alat build ke dalam artefak produksi.

Panduan ini membahas disiplin menyeluruh dalam membangun gambar Docker yang dioptimalkan. Anda akan mempelajari cara memilih base image yang tepat, menyusun multi-stage build untuk jejak minimal, memanfaatkan caching lapisan untuk build yang lebih cepat, memperkuat gambar terhadap kerentanan keamanan, dan mengimplementasikan pipeline gambar yang reprodusibel dan dapat diaudit untuk produksi. Setiap bagian menyertakan contoh praktis dan kriteria terukur sehingga Anda dapat langsung menerapkan pola-pola ini ke proyek Anda sendiri.

## Praktik Terbaik

### Pilih Base Image yang Tepat

Base image adalah faktor tunggal terbesar dalam ukuran akhir gambar dan postur keamanan.

- **Gunakan varian Alpine atau distroless untuk produksi**: Alpine Linux (varian `-alpine`) menyediakan lingkungan minimal berbasis libc sebesar 5–10 MB. Gambar distroless dari Google menghilangkan package manager dan shell sepenuhnya, mengurangi permukaan serangan hanya pada apa yang dibutuhkan aplikasi. Untuk biner Go atau Rust yang dikompilasi secara statis, gambar `scratch` menghasilkan jejak terkecil (serendah 2–5 MB).
- **Pin ke digest, bukan tag**: Tag seperti `node:20` dapat berubah. Gunakan digest SHA256 (`node:20@sha256:abc123...`) untuk build yang sepenuhnya reprodusibel.
- **Hindari `:latest` di produksi**: `latest` adalah penunjuk ambigu yang dapat memperkenalkan perubahan yang merusak pada saat rebuild. Selalu gunakan tag versi eksplisit.

### Optimalkan Urutan Lapisan

Setiap instruksi Dockerfile membuat lapisan baru. Lapisan di-cache dan digunakan kembali ketika teks instruksi dan konteks build tidak berubah.

- **Urutkan berdasarkan volatilitas**: Tempatkan instruksi yang jarang berubah di bagian atas (paket OS, dependensi sistem) dan kode sumber di bagian bawah. Ini memaksimalkan penggunaan kembali cache.
- **Gabungkan pernyataan `RUN` secara bijaksana**: Mengelompokkan instalasi paket yang terkait mengurangi jumlah lapisan, tetapi memisahkan instruksi yang jarang berubah dari yang sering berubah akan mempertahankan lebih banyak cache. Aturan praktis: kelompokkan apa yang berubah pada irama yang sama.
- **Gunakan `.dockerignore` secara agresif**: Kecualikan `node_modules`, `.git`, `*.md`, fixture pengujian, konfigurasi CI, dan artefak apa pun yang tidak diperlukan saat build. File `.dockerignore` yang tidak ada adalah penyebab paling umum gambar berukuran ratusan megabita.

### Multi-Stage Builds

Multi-stage build memungkinkan Anda menggunakan image build yang lengkap dan hanya menyalin artefak runtime ke dalam image produksi yang minimal.

- **Pisahkan tahap build dan runtime**: Instal compiler, package manager, dan dependensi pengembangan di tahap pertama. Salin hanya biner yang telah dikompilasi atau dependensi produksi ke tahap akhir.
- **Manfaatkan tahap bernama untuk kejelasan**: Beri setiap tahap nama yang bermakna (`builder`, `dependencies`, `runtime`) sehingga tujuannya terdokumentasi dengan sendirinya.
- **Gunakan `COPY --from` antar tahap**: Instruksi `COPY --from=nama_tahap` mengekstrak file yang tepat yang Anda butuhkan, meninggalkan alat build.

### Pengamanan

- **Jalankan sebagai pengguna non-root**: Buat pengguna dan grup khusus di Dockerfile dan beralih ke pengguna tersebut dengan `USER`. Sebagian besar base image sudah menyediakan pengguna `node` atau `app` — gunakan itu daripada menjalankan sebagai root.
- **Pindai gambar untuk kerentanan**: Integrasikan alat seperti Trivy, Docker Scout, atau Snyk ke dalam pipeline CI/CD Anda. Jadikan deployment bergantung pada tidak adanya temuan kritis atau tingkat tinggi.
- **Minimalkan paket yang diinstal**: Setiap paket yang ditarik ke dalam gambar adalah vektor potensial. Gunakan `--no-install-recommends` (APT), `--production` (npm), atau flag yang setara untuk menghilangkan dependensi yang tidak perlu.
- **Hasilkan Software Bill of Materials (SBOM)**: Alat seperti `syft` menghasilkan inventaris yang dapat dibaca mesin dari setiap komponen dalam gambar, yang penting untuk transparansi rantai pasok.

### Performa Build

- **Manfaatkan fitur BuildKit**: BuildKit (`DOCKER_BUILDKIT=1`) menyediakan eksekusi tahap paralel, caching inline, dan `--cache-from` untuk mount cache jarak jauh. Ini adalah default di Docker Engine 23.0+.
- **Gunakan `--mount=type=cache`**: Cache unduhan APT, pip, npm, atau modul Go di seluruh build dengan cache mount BuildKit. Ini menghindari pengunduhan ulang dependensi pada setiap build sambil menjaganya tetap di luar lapisan gambar akhir.
- **Targetkan tahap tertentu untuk pengembangan**: Selama pengembangan, bangun hanya tahap dependensi atau builder dengan `docker build --target dependencies .` untuk iterasi lebih cepat tanpa membangun ulang tahap akhir.

## Langkah Implementasi

### Langkah 1: Audit Dockerfile yang Ada

Mulailah dengan meninjau Dockerfile proyek yang umum. Identifikasi setiap instruksi dan klasifikasikan berdasarkan volatilitas (seberapa sering berubah) dan kebutuhannya (apakah diperlukan saat runtime?).

```dockerfile
# Sebelum — Dockerfile tahap tunggal yang tidak dioptimalkan
FROM node:20

WORKDIR /app

COPY . .

RUN npm ci --omit=dev && npm cache clean --force

EXPOSE 3000

USER node

CMD ["node", "server.js"]
```

Masalah dengan Dockerfile ini:
- Menggunakan image `node:20` penuh (~1,1 GB) alih-alih varian `node:20-alpine` atau distroless (~130 MB).
- Menyalin seluruh konteks build sebelum perintah `RUN`, membatalkan cache dependensi pada setiap perubahan sumber.
- Tidak ada `.dockerignore` berarti `node_modules`, `.env`, dan `coverage/` lokal mungkin ikut tersalin.
- Berjalan sebagai root hingga instruksi `USER node` terakhir.

### Langkah 2: Terapkan Urutan Lapisan dan `.dockerignore`

Urutkan ulang instruksi sehingga lapisan yang jarang berubah (paket OS, manifes dependensi) dibangun terlebih dahulu.

```dockerfile
# Urutan yang dioptimalkan
FROM node:20-alpine AS dependencies

WORKDIR /app

# Salin hanya manifes dependensi terlebih dahulu — jarang berubah
COPY package.json package-lock.json ./

# Instal dependensi produksi
RUN npm ci --omit=dev && npm cache clean --force

# Salin kode sumber terakhir — sering berubah
COPY . .

EXPOSE 3000

USER node

CMD ["node", "server.js"]
```

Buat file `.dockerignore` di root proyek:

```text
.git/
.gitignore
*.md
node_modules/
coverage/
.env
.env.*
Dockerfile
.dockerignore
test/
tests/
__tests__/
```

Dengan perubahan ini, membangun ulang setelah perubahan kode sumber melewatkan langkah `npm ci` sepenuhnya karena lapisan `package.json` tidak berubah.

### Langkah 3: Konversi ke Multi-Stage Build

Pisahkan tahap build dari tahap produksi. Ini menghilangkan alat build, dependensi pengembangan, dan package manager dari gambar akhir.

```dockerfile
# Tahap 1 — instal dependensi produksi
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Tahap 2 — build (hanya diperlukan untuk bahasa yang dikompilasi atau aset frontend)
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Jalankan langkah build di sini jika diperlukan (TypeScript, Tailwind, dll.)
# RUN npm run build

# Tahap 3 — runtime produksi
FROM node:20-alpine AS production
WORKDIR /app

# Buat pengguna non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Salin hanya yang diperlukan saat runtime
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER appuser

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

Gambar akhir sekarang hanya berisi dependensi runtime dan output yang dikompilasi — tidak ada `npm`, tidak ada compiler TypeScript, tidak ada file sumber.

### Langkah 4: Tambahkan Pengamanan dan Pemindaian Kerentanan

Integrasikan pemindai keamanan ke dalam pipeline CI/CD Anda. Contoh berikut menggunakan Trivy untuk memindai gambar sebelum mendorong:

```yaml
# .github/workflows/docker-scan.yml (GitHub Actions)
name: Docker Security Scan

on:
  push:
    branches: [main]
    paths:
      - "Dockerfile"
      - "docker-compose*.yml"
      - ".dockerignore"

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t app:ci .

      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: app:ci
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
          exit-code: 1
```

Hasilkan SBOM untuk transparansi:

```bash
# Install syft (https://github.com/anchore/syft)
syft app:ci -o spdx-json > sbom.spdx.json
```

### Langkah 5: Manfaatkan Cache Mount BuildKit untuk Iterasi Lebih Cepat

Ganti instalasi dependensi berbasis `COPY` dengan cache mount BuildKit. Cache bertahan di seluruh build tanpa membebani gambar atau memerlukan pengambilan jaringan setiap saat.

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Gunakan cache mount BuildKit untuk paket npm
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev && npm cache clean --force

COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
```

Bangun dengan BuildKit diaktifkan:

```bash
DOCKER_BUILDKIT=1 docker build -t app:optimized .
```

### Langkah 6: Ukur dan Bandingkan

Kuantifikasi perbaikannya. Bandingkan ukuran gambar, waktu build, dan jumlah kerentanan sebelum dan sesudah optimasi.

```bash
# Periksa ukuran gambar
docker images app:before app:optimized

# Jalankan Trivy pada keduanya
docker scout quickview app:before
docker scout quickview app:optimized
```

Hasil yang diharapkan setelah menerapkan keenam langkah:
- **Pengurangan ukuran gambar**: 70–95% lebih kecil (tergantung pada perubahan base image, misalnya 1,1 GB → 130 MB untuk aplikasi Node.js).
- **Peningkatan waktu build**: 40–60% lebih cepat pada rebuild untuk perubahan kode sumber berkat caching lapisan.
- **Pengurangan kerentanan**: CVE kritis/tinggi biasanya turun 80–100% saat beralih dari `node:20` ke `node:20-alpine` atau base distroless.
- **Reprodusibilitas**: Base image yang di-pin dengan digest menjamin lapisan yang identik di seluruh lingkungan dan waktu.

## Insight Penting

- **Pemilihan base image adalah keputusan dengan leverage tertinggi**: Beralih dari image distribusi penuh ke Alpine atau distroless langsung memotong 70–90% ukuran gambar dan sebagian besar CVE.
- **Caching lapisan adalah pengganda kekuatan untuk kecepatan pengembang**: Menginvestasikan waktu dalam urutan instruksi dan `.dockerignore` memberikan hasil yang berlipat setiap kali pengembang membangun ulang.
- **Keamanan bukanlah gerbang satu kali — ini adalah tahap pipeline**: Integrasikan pemindaian dan pembuatan SBOM ke dalam CI/CD sehingga setiap push dievaluasi secara otomatis. Ini menggeser keamanan ke kiri tanpa menambah beban manual.
- **Multi-stage build menghilangkan trade-off build vs runtime**: Anda mendapatkan kenyamanan lingkungan pengembangan penuh selama build dan keamanan jejak minimal di produksi.
- **Cache mount BuildKit adalah default baru untuk gambar dengan dependensi berat**: Mereka memberikan efisiensi cache dari tahap build terpisah tanpa biaya pemeliharaan dari tahap tambahan di Dockerfile.

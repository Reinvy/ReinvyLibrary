---
title: "Panduan BuildKit dan Layer Caching Docker"
description: "Panduan praktis untuk mempercepat build Docker dengan BuildKit — mencakup layer caching, pengurutan dependensi, cache mount persisten, multi-stage build, dan cara menghindari cache invalidation."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan BuildKit dan Layer Caching Docker

## Pendahuluan

Setiap image Docker dibangun dari layer, dan setiap layer berpotensi menjadi cache hit atau miss. Dengan builder lama, satu instruksi yang berubah akan membatalkan semua layer setelahnya, sehingga edit satu baris kode sumber dapat memaksa unduhan ulang seluruh dependensi. BuildKit — mesin build modern yang menjadi default sejak Docker Engine 23.0+ — memperbaiki masalah terbesarnya melalui eksekusi stage paralel, garbage collection cache otomatis, dan tipe mount lanjutan yang menjaga cache dependensi sepenuhnya di luar layer image.

Panduan ini memperkenalkan praktik terbaik yang membuat build cepat, benar, dan dapat diulang: mengaktifkan BuildKit, mengurutkan instruksi berdasarkan frekuensi perubahan, menggunakan `--mount=type=cache` untuk package manager, menyusun multi-stage build, dan mendiagnosis cache invalidation. Jika diterapkan konsisten, pola-pola ini biasanya memangkas waktu rebuild 50–80% untuk aplikasi yang bergantung pada banyak dependensi.

## Praktik Terbaik

### Aktifkan BuildKit di Semua Tempat

BuildKit adalah fondasi dari setiap teknik dalam panduan ini.

- Setel `DOCKER_BUILDKIT=1` di lingkungan CI dan shell yang masih memakai builder lama; versi Docker modern mengaktifkannya secara default.
- Awali setiap Dockerfile dengan direktif frontend modern `# syntax=docker/dockerfile:1` untuk membuka fitur sintaks seperti cache mount dan `COPY --link`.
- Gunakan `docker buildx` (pembungkus CLI BuildKit) saat membutuhkan build multi-platform dan backend cache jarak jauh.

### Urutkan Instruksi Berdasarkan Frekuensi Perubahan

Layer caching hanya bekerja ketika instruksi yang tidak berubah memakai ulang layer yang di-cache, jadi aturan pengurutannya sederhana: letakkan instruksi yang jarang berubah di atas, dan instruksi yang terus berubah di bagian bawah.

- Salin manifest dependensi (`package.json`, `requirements.txt`, `go.mod`) sebelum menyalin kode sumber, lalu instal dependensi dalam `RUN` terpisah.
- Kelompokkan instruksi berdasarkan frekuensi perubahan: base image, paket sistem, manifest dependensi, instalasi dependensi, lalu kode aplikasi.
- Edit kode sumber tidak boleh membatalkan layer instalasi dependensi. Jika itu terjadi, pengurutan Anda salah.

### Gunakan Cache Mount untuk Package Manager

Kesalahan klasik adalah menyimpan cache npm, pip, atau apt di dalam layer — itu menggembungkan image dan tetap dibatalkan. Cache mount BuildKit bertahan antar build di host dan tidak pernah menjadi bagian dari image.

- Mount direktori cache package manager (misalnya `/root/.npm`) dengan `--mount=type=cache,target=/root/.npm`.
- Bind-mount hanya manifest yang dibutuhkan dengan `--mount=type=bind,source=package.json,target=package.json`, sehingga `RUN` tidak bergantung pada salinan seluruh konteks.
- Cache mount dibagikan per build; gunakan opsi `id` untuk mengisolasi cache antar stage atau proyek.

### Susun Multi-Stage Build

Multi-stage build memisahkan apa yang Anda butuhkan untuk membangun dari apa yang Anda butuhkan untuk menjalankan aplikasi.

- Beri nama stage yang bermakna (`dependencies`, `build`, `runtime`) dan salin artefak antar stage dengan `COPY --from=stage`.
- Simpan build tool, compiler, dan dependensi pengembangan di stage awal agar tidak pernah mencapai image final.
- Targetkan satu stage selama pengembangan (`docker build --target dependencies .`) untuk mengiterasi dependensi tanpa membangun ulang runtime.

### Cegah Ledakan Cache Invalidation

Cache miss menjalar: satu instruksi yang berubah membatalkan semua yang ada setelahnya.

- Hindari `COPY . .` di awal Dockerfile; salin path dan manifest tertentu lebih dulu.
- Gunakan file `.dockerignore` agar `node_modules`, `.git`, dan hasil build lokal tidak pernah dikirim sebagai build context — perubahan konteks dapat membatalkan layer `COPY` meskipun instruksi image tidak berubah.
- Utamakan `COPY --link` saat menyalin file antar stage: layer induk dipakai ulang terlepas dari perubahan stage sebelumnya.

## Langkah Implementasi

### Langkah 1: Aktifkan BuildKit dan Verifikasi

Pastikan engine mendukung BuildKit dan paksa aktif untuk sesi ini:

```bash
docker version --format '{{.Client.Version}} / {{.Server.Os}}'
export DOCKER_BUILDKIT=1
```

### Langkah 2: Urutkan Dockerfile Naif dengan Benar

Mulai dari Dockerfile tidak teroptimasi yang menyalin semuanya lebih dulu:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "server.js"]
```

Urutkan ulang sehingga instalasi dependensi terjadi sebelum penyalinan kode:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["node", "server.js"]
```

Sekarang edit kode sumber hanya membangun ulang layer `COPY` terakhir, tanpa menjalankan `npm ci` lagi.

### Langkah 3: Tambahkan `.dockerignore`

Buat `.dockerignore` di root proyek agar build context tetap minimal dan stabil:

```text
.git/
.gitignore
*.md
node_modules/
dist/
.env
.env.*
Dockerfile
.dockerignore
test/
tests/
```

### Langkah 4: Ganti Cache Berbasis Layer dengan Cache Mount

Gunakan cache mount npm persisten agar unduhan bertahan antar build tanpa mengotori layer image:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
CMD ["node", "server.js"]
```

Bangun dua kali dan amati run kedua menampilkan `CACHED`:

```bash
DOCKER_BUILDKIT=1 docker build -t app:fast .
DOCKER_BUILDKIT=1 docker build -t app:fast .
```

### Langkah 5: Pisahkan ke Multi-Stage Build

Pisahkan instalasi dependensi dari runtime produksi:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .
USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
```

Iterasi dependensi tanpa membangun ulang stage runtime:

```bash
docker build --target dependencies -t app:deps .
```

### Langkah 6: Diagnosa Cache Invalidation

Periksa layer mana yang dipakai ulang dan pastikan cache mount bertahan:

```bash
DOCKER_BUILDKIT=1 docker build --progress=plain -t app:fast . 2>&1 | grep -E 'CACHED|=>.*RUN'
docker system df
docker builder prune --filter type=exec.cachemount
```

Hasil yang diharapkan: rebuild tanpa perubahan menandai semua layer `CACHED`, perubahan hanya pada kode sumber membangun ulang satu layer `COPY`, dan unduhan dependensi berasal dari cache mount persisten, bukan dari jaringan.

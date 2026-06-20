---
title: "Memulai dengan GitHub Actions"
description: "Panduan komprehensif untuk memahami dan mengimplementasikan pipeline CI/CD dengan GitHub Actions untuk pengujian otomatis, pembangunan, dan deployment."
category: "devops"
technology: "github-actions"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Memulai dengan GitHub Actions

## Ringkasan

Tutorial ini memperkenalkan GitHub Actions, platform otomatisasi CI/CD bawaan GitHub. Anda akan belajar cara membuat file workflow, memahami konsep inti seperti event, job, dan runner, serta membangun pipeline praktis untuk pengujian, pembangunan, dan deployment — semuanya tanpa meninggalkan repositori GitHub Anda.

## Target Audiens

- Developer dan insinyur DevOps yang baru mengenal otomatisasi CI/CD.
- Pengguna GitHub yang ingin mengotomatiskan workflow pengujian dan deployment.
- Tingkat yang diharapkan: Pemula hingga Menengah — tidak diperlukan pengalaman CI/CD sebelumnya.

## Prasyarat

- Akun GitHub dan pemahaman dasar tentang Git (commit, push, pull).
- Repositori GitHub dengan beberapa kode (bahasa apa pun) untuk bereksperimen.
- Pengetahuan dasar baris perintah (menjalankan skrip, navigasi direktori).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan komponen inti GitHub Actions: workflow, event, job, step, dan runner.
- Menulis file workflow YAML yang dipicu oleh event push dan pull request.
- Menggunakan action dari marketplace GitHub untuk tugas umum seperti checkout kode dan setup runtime.
- Membuat workflow multi-job dengan urutan dependensi dan berbagi artifact.
- Mengimplementasikan pipeline CI dasar yang menjalankan tes pada setiap push.
- Mengkonfigurasi workflow deployment dengan secret environment dan approval gate.
- Men-debug workflow yang gagal menggunakan log dan antarmuka web GitHub.

## Konteks dan Motivasi

Deployment perangkat lunak manual rentan terhadap kesalahan, memakan waktu, dan tidak dapat diskalakan. Setiap kali developer melakukan push kode, seseorang (atau suatu proses) perlu memverifikasi bahwa kode tersebut berhasil dibangun, tes lolos, dan versi baru mencapai produksi dengan aman. GitHub Actions memecahkan masalah ini dengan menyediakan mesin otomatisasi yang terintegrasi penuh langsung di dalam repositori Anda.

Tidak seperti alat CI eksternal yang memerlukan akun terpisah, konfigurasi webhook, dan pengelolaan kredensial, GitHub Actions berada di tempat yang sama dengan kode Anda. File workflow dikomit bersama kode sumber, membuat konfigurasi CI/CD menjadi version-controlled, dapat direview, dan dapat direproduksi. Ekosistem ini juga mencakup marketplace dengan ribuan action siap pakai untuk tugas-tugas umum — deployment ke penyedia cloud, pengiriman notifikasi, menjalankan linter, dan lainnya.

Di akhir tutorial ini, Anda akan memiliki pipeline CI yang berfungsi dan pengetahuan dasar untuk membangun workflow otomatisasi yang lebih kompleks.

## Konten Inti

### Memahami Arsitektur GitHub Actions

GitHub Actions dibangun di atas lima konsep inti yang bekerja bersama untuk menjalankan otomatisasi:

- **Workflow**: Prosedur otomatis yang didefinisikan dalam file YAML di dalam `.github/workflows/`. Workflow adalah unit otomatisasi tingkat tertinggi.
- **Event**: Pemicu yang memulai workflow. Event meliputi `push`, `pull_request`, `schedule` (cron), `workflow_dispatch` (manual), dan banyak lagi.
- **Job**: Kumpulan step yang dieksekusi pada runner yang sama. Job dalam satu workflow dapat berjalan secara paralel atau berurutan.
- **Step**: Tugas individual dalam sebuah job. Step dapat menjalankan perintah shell atau menggunakan action dari marketplace.
- **Runner**: Mesin virtual atau server self-hosted yang mengeksekusi job. GitHub menyediakan runner Ubuntu, Windows, dan macOS.

### Anatomi File Workflow

File workflow adalah dokumen YAML yang disimpan di `.github/workflows/` di akar repositori Anda. Setiap workflow harus memiliki nama, event pemicu, dan setidaknya satu job.

```yaml
name: CI Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Menjalankan skrip
        run: echo "Halo, GitHub Actions!"
```

### Event dan Pemicu

Event menentukan kapan sebuah workflow berjalan. Event yang paling umum adalah:

- **push**: Dipicu ketika kode di-push ke branch yang ditentukan.
- **pull_request**: Dipicu pada event pull request (opened, synchronized, reopened).
- **schedule**: Dipicu pada waktu yang dijadwalkan menggunakan sintaks cron.
- **workflow_dispatch**: Memungkinkan pemicuan manual dari antarmuka web GitHub.
- **release**: Dipicu ketika rilis dipublikasikan.

Anda dapat menggabungkan event dan menggunakan tipe aktivitas atau filter jalur untuk kontrol yang lebih presisi:

```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'tests/**'
  pull_request:
    types: [opened, synchronize]
    branches: [main]
```

### Job, Step, dan Runner

Workflow dapat memiliki banyak job. Job yang tidak saling bergantung berjalan secara paralel secara default. Gunakan kata kunci `needs` untuk membuat rantai berurutan:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

Setiap job dapat memilih sistem operasi runner (`ubuntu-latest`, `windows-latest`, `macos-latest`) atau menggunakan runner self-hosted untuk kebutuhan perangkat keras atau perangkat lunak kustom.

### Menggunakan Action dari Marketplace

Marketplace GitHub menampung ribuan action yang dapat digunakan kembali yang dibuat oleh GitHub, mitra, dan komunitas. Alih-alih menulis skrip shell yang kompleks, Anda dapat menyusun workflow dari action yang sudah jadi:

```yaml
steps:
  - uses: actions/checkout@v4          # Checkout kode repositori
  - uses: actions/setup-node@v4         # Install Node.js
    with:
      node-version: 20
  - uses: actions/cache@v4              # Cache dependensi
    with:
      path: ~/.npm
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

Action direferensikan dalam format `author/repo@version`. Selalu gunakan versi major (misalnya `@v4`) atau commit SHA spesifik untuk workflow produksi.

### Environment Variables dan Secret

Workflow dapat mengakses environment variable dan secret terenkripsi. Secret repositori diatur di **Settings > Secrets and variables > Actions**:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      NODE_ENV: production
    steps:
      - run: echo "Mendeploy ke ${{ vars.ENVIRONMENT_NAME }}"
      - run: ./deploy.sh
        env:
          API_KEY: ${{ secrets.API_KEY }}
```

Selalu gunakan secret untuk nilai sensitif seperti API key dan password. Jangan pernah menuliskannya secara hardcode di file workflow.

### Matrix Build

Jalankan job yang sama di beberapa konfigurasi secara bersamaan menggunakan strategi matrix:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
```

Ini menciptakan enam environment pengujian paralel (3 versi Node × 2 sistem operasi) tanpa menduplikasi kode.

### Artifact dan Caching

Artifact menyimpan file di antara job atau setelah workflow selesai. Gunakan untuk berbagi hasil build atau menyimpan laporan pengujian:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: ./deploy.sh
```

Caching mempercepat workflow dengan menggunakan kembali dependensi antar sesi. Action `actions/cache` menyimpan dan mengambil direktori yang di-cache berdasarkan kunci yang dihitung.

## Contoh Kode

### Contoh 1: Workflow CI Dasar untuk Node.js

Workflow ini menjalankan linting dan pengujian pada setiap push ke branch mana pun:

```yaml
name: Node.js CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm test
```

### Contoh 2: Pipeline Deployment Multi-Tahap

Pipeline lengkap dengan tahap lint, test, build, dan deploy, menggunakan secret environment untuk deployment produksi:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: built-app
          path: build/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: built-app
          path: build/
      - run: ./scripts/deploy.sh
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

### Contoh 3: Workflow Ekspor Data Terjadwal

Jalankan skrip ekspor data setiap pagi pukul 6 pagi UTC:

```yaml
name: Daily Data Export

on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python scripts/export-data.py
        env:
          API_TOKEN: ${{ secrets.API_TOKEN }}
      - uses: actions/upload-artifact@v4
        with:
          name: daily-export
          path: exports/
```

## Insight Penting

- **File workflow adalah kode**: Simpan workflow di `.github/workflows/` bersama kode sumber Anda. Mereka mendapatkan manfaat dari code review, versioning, dan branching yang sama dengan kode aplikasi.
- **Mulai sederhana, iterasi cepat**: Mulailah dengan satu job yang menjalankan lint atau tes, lalu tambahkan build, berbagi artifact, dan tahap deployment seiring bertambahnya kepercayaan diri Anda.
- **Gunakan `actions/checkout@v4` terlebih dahulu**: Hampir setiap workflow membutuhkan kode repositori. Action checkout adalah langkah pertama yang paling umum di job mana pun.
- **Strategi matrix mencegah duplikasi**: Alih-alih menyalin job untuk setiap versi runtime, gunakan `strategy.matrix` untuk menguji di beberapa konfigurasi dengan satu definisi job.
- **Secret tidak pernah muncul di log**: GitHub secara otomatis menyembunyikan secret di output workflow. Namun, hindari mengirimkan secret ke skrip melalui argumen baris perintah, yang mungkin tidak disembunyikan.
- **Retensi artifact memiliki batas**: Secara default, artifact kedaluwarsa setelah 90 hari. Konfigurasikan hari retensi dengan parameter `retention-days` pada `actions/upload-artifact@v4` untuk kebutuhan kepatuhan atau penyimpanan jangka panjang.
- **Runner self-hosted untuk kebutuhan kustom**: Ketika runner yang dihosting GitHub tidak memenuhi kebutuhan Anda (GPU spesifik, akses jaringan on-premises), siapkan runner self-hosted di infrastruktur Anda sendiri.

## Langkah Berikutnya

- Jelajahi GitHub Actions Marketplace untuk action siap pakai yang relevan dengan tumpukan teknologi Anda.
- Pelajari tentang aturan perlindungan environment dan required reviewer untuk workflow deployment.
- Pelajari reusable workflow dan composite actions untuk berbagi logika otomatisasi antar repositori.
- Baca [dokumentasi GitHub Actions](https://docs.github.com/en/actions) untuk topik lanjutan seperti OIDC, spesifikasi runner yang dihosting GitHub, dan sintaks perintah workflow.

## Kesimpulan

GitHub Actions menghadirkan kemampuan CI/CD yang kuat langsung ke dalam repositori Anda dengan overhead pengaturan yang minimal. Dalam tutorial ini, Anda mempelajari arsitektur inti — workflow, event, job, step, dan runner — dan membangun pipeline praktis untuk pengujian, pembangunan, dan deployment. Dengan mengkomit file workflow bersama kode Anda, Anda memastikan bahwa konfigurasi otomatisasi Anda bersifat version-controlled, dapat direview, dan dapat direproduksi di berbagai environment. Mulailah dengan pipeline CI sederhana, kemudian secara bertahap tambahkan tahap deployment, matrix build, dan tugas terjadwal seiring pertumbuhan proyek Anda.

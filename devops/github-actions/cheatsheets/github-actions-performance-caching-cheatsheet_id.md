---
title: "Cheat Sheet Optimasi Performa dan Caching GitHub Actions"
description: "Panduan referensi cepat untuk performa GitHub Actions — caching dependensi dengan actions/cache, isolasi build cache, paralelisme job dan strategi matrix, kontrol concurrency, pemangkasan artifact, caching layer Docker, dan optimasi biaya workflow."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Optimasi Performa dan Caching GitHub Actions

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Cache dependensi | `actions/cache@v4` dengan `key` + `restore-keys` | Menyimpan dependensi antar eksekusi |
| Cache package manager | `actions/setup-node@v4` dengan `cache: 'npm'` | Caching bawaan untuk npm/yarn/pnpm |
| Menjalankan job paralel | Kunci `jobs:` tingkat atas tanpa `needs` | Job independen berjalan bersamaan |
| Fan out / fan in | `needs: [lint, test, build]` | Menunggu beberapa job paralel |
| Build matrix | `strategy.matrix` dengan `include`/`exclude` | Menjalankan job pada kombinasi OS/versi |
| Batalkan eksekusi lama | `concurrency.group` + `cancel-in-progress: true` | Menghentikan eksekusi redundan saat push baru |
| Lewati kode yang tidak berubah | Filter `paths`/`paths-ignore` pada trigger | Menghindari CI untuk perubahan yang tidak relevan |
| Gabungkan job pasca-proses | Satu job deploy dengan `needs` alih-alih N job | Mengurangi overhead spin-up runner |
| Cache layer Docker | `docker/build-push-action@v6` dengan `cache-from`/`cache-to` | Menggunakan ulang layer BuildKit antar eksekusi |
| Bersihkan artifact lama | `actions/delete-artifact@v5` / hari retensi | Menjaga penyimpanan artifact tetap kecil |
| Kirim workflow yang dapat dipakai ulang | `workflow_call` dengan `secrets: inherit` | Memakai ulang logika tanpa menduplikasi YAML |

## Perintah Umum

### Caching Dependensi dengan actions/cache

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

### Caching Toolchain Setup (Bawaan)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'          # juga: 'yarn', 'pnpm', 'deno'
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
    cache: 'pip'          # juga: 'pipenv', 'poetry'
```

### Paralelisme Job dan Fan-Out

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
  test:
    runs-on: ubuntu-latest
  build:
    runs-on: ubuntu-latest
    needs: [lint, test]   # menunggu keduanya, lalu berjalan
```

### Strategi Matrix

```yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: [18, 20]
    include:
      - os: ubuntu-latest
        node: 22
        experimental: true
```

### Concurrency — Batalkan Eksekusi Kedaluwarsa

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

### Filter Jalur (Lewati Job yang Tidak Relevan)

```yaml
on:
  push:
    paths:
      - 'src/**'
      - '*.json'
    paths-ignore:
      - 'docs/**'
      - 'README.md'
```

### Cache Layer Docker dengan BuildKit

```yaml
- uses: docker/build-push-action@v6
  with:
    push: true
    tags: ghcr.io/${{ github.repository }}:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Action Komposit dengan Toolchain Ter-cache

```yaml
- uses: actions/setup-go@v5
  with:
    go-version: '1.22'
    cache: true
    cache-dependency-path: |
      **/go.sum
      **/go.mod
```

### Workflow Pembersihan Terjadwal

```yaml
on:
  schedule:
    - cron: '0 3 * * 0'   # mingguan
  workflow_dispatch:

jobs:
  delete-old-artifacts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/delete-artifact@v5
        with:
          artifact: 'test-results'
          failOnError: true
```

## Potongan Kode

### Cuplikan CI Node dengan Caching Penuh

```yaml
name: CI
on:
  pull_request:
    paths-ignore: ['docs/**']

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/
          retention-days: 7
```

### Build Multi-Modul yang Efisien dengan Cache (Go)

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.cache/go-build
      ~/go/pkg/mod
    key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
    restore-keys: |
      ${{ runner.os }}-go-
```

### Langkah Mahal Bersyarat

```yaml
- name: Menjalankan tes end-to-end
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  run: npm run test:e2e
```

### Workflow yang Dapat Dipakai Ulang dengan Caching

```yaml
# .github/workflows/build.yml — titik masuk yang dapat dipakai ulang
on:
  workflow_call:
    secrets:
      REGISTRY_TOKEN:
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v6
        with:
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Matrix Build dengan Toleransi Kegagalan

```yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, macos-latest]
    include:
      - os: macos-latest
        arch: arm64

steps:
  - run: make build-arch-${{ matrix.arch }}
    continue-on-error: ${{ matrix.experimental }}
```

### Unduh Artifact Setelah Job Paralel

```yaml
- uses: actions/download-artifact@v4
  with:
    name: build-output
    path: dist/
    merge-multiple: true
```

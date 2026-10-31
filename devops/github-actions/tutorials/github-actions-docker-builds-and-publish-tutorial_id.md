---
title: "Tutorial Build dan Publish Docker dengan GitHub Actions"
description: "Membangun image Docker multi-arsitektur di GitHub Actions dengan Buildx, menerbitkannya ke GHCR memakai tag dari metadata git, memakai ulang cache layer, melampirkan provenance, dan memindai kerentanan."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Tutorial Build dan Publish Docker dengan GitHub Actions

## Ringkasan

Tutorial ini mengubah step `docker build` sederhana menjadi pipeline image yang siap produksi. Anda akan membangun image multi-arsitektur dengan Buildx, menerbitkannya ke GitHub Container Registry memakai token workflow, menurunkan tag dari metadata git, memakai ulang cache layer, melampirkan provenance, dan memindai kerentanan.

## Target Audiens

- DevOps engineer dan backend developer yang sudah biasa mengirim container secara manual.
- Developer yang nyaman dengan YAML workflow dan ingin rilis image yang reprodusibel serta dapat diaudit.
- Tingkat kemampuan: menengah.

## Prasyarat

- Repositori GitHub dengan `Dockerfile` dan izin menerbitkan package.
- Pemahaman dasar Docker: layer, tag, registry, dan `.dockerignore`.
- Familiar dengan sintaks GitHub Actions (`on`, `jobs`, `steps`, `with`).
- Memahami konsep image multi-arsitektur dan manifest list.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mengonfigurasi `docker/setup-buildx-action` dan QEMU untuk `linux/amd64` dan `linux/arm64`.
- Melakukan autentikasi ke GHCR memakai `GITHUB_TOKEN`, bukan token pribadi berumur panjang.
- Menurunkan tag semver, branch, dan SHA secara otomatis dengan `docker/metadata-action`.
- Menyimpan cache layer BuildKit melalui backend cache GitHub Actions.
- Melampirkan provenance SLSA dan SBOM, lalu memindai image dengan Trivy.

## Konteks dan Motivasi

Step build yang ditulis manual biasanya hanya menargetkan satu arsitektur, menandai image sebagai `latest`, dan membangun ulang semua layer setiap run karena tidak ada cache. Pipeline seperti itu lambat, sulit diaudit, dan diam-diam rusak bagi pengguna Apple Silicon yang menarik image khusus amd64.

Buildx bersama action Docker resmi menyelesaikan masalah tersebut sekaligus: output lintas platform, tag dari metadata, reuse cache jarak jauh, serta provenance bertanda tangan yang mengikat digest ke commit. Ketika image sudah membawa provenance, rollback tidak lagi menebak-nebak.

## Konten Inti

### Langkah 1 — Siapkan Buildx

`docker build` di runner memakai builder legacy. `docker/setup-buildx-action` membuat builder BuildKit dengan driver `docker-container` sehingga `--platform`, ekspor cache, dan flag atestasi tersedia. Semua action Docker di bawah ini mengandalkan builder tersebut.

### Langkah 2 — Hasilkan Banyak Platform

Tag multi-arch menunjuk manifest list berisi satu image per arsitektur. Membangun `linux/arm64` di runner amd64 membutuhkan emulasi QEMU yang dipasang `docker/setup-qemu-action`. Emulasi lambat, jadi hindari multi-arch pada job pull request dan sisakan untuk tag rilis.

### Langkah 3 — Autentikasi Tanpa Secret Berumur Panjang

GHCR menerima `GITHUB_TOKEN` dari workflow. Berikan `packages: write` dan login sebagai `${{ github.actor }}`. Perangkapnya: path GHCR wajib huruf kecil, sedangkan `${{ github.repository }}` mengikuti kapitalisasi yang diketik pemilik repo.

### Langkah 4 — Turunkan Tag dari Git, Bukan Tebakan

`docker/metadata-action` menghitung tag dan label OCI dari ref. `type=semver` memetakan `v1.4.0` menjadi `1.4.0`, `type=ref,event=branch` memakai nama branch, dan `type=sha` memberi tag pendek yang immutable. Hasilnya ada di `steps.meta.outputs.tags`, jadi tidak ada daftar tag manual.

### Langkah 5 — Jaga Layer Tetap Hangat Antar Run

Pakai `cache-from: type=gha` dan `cache-to: type=gha,mode=max`. `mode=max` juga menyimpan stage antara, yang penting untuk Dockerfile multi-stage karena tahap instalasi dependency mendominasi waktu build.

### Langkah 6 — Buktikan dan Pindai Sebelum Terbit

`actions/attest-build-provenance` menandatangani pernyataan in-toto yang mengikat digest image ke workflow, commit, dan runner; `sbom: true` menambahkan SBOM SPDX. Keduanya butuh `id-token: write` dan `attestations: write`. Setelah itu jalankan Trivy terhadap digest tersebut dan unggah SARIF, dengan `exit-code: '1'` pada `CRITICAL` agar pipeline gagal tertutup.

## Contoh Kode

### Workflow Publish Lengkap

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
      - name: Login ke GHCR
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Hitung tag dan label
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=ref,event=branch
            type=sha,prefix=sha-
            type=raw,value=latest,enable={{is_default_branch}}
      - name: Build dan push
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
      - name: Lampirkan provenance
        if: github.event_name != 'pull_request'
        uses: actions/attest-build-provenance@v2
        with:
          subject-name: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          subject-digest: ${{ steps.build.outputs.digest }}
          push-to-registry: true
      - name: Pindai image berdasarkan digest
        uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ steps.build.outputs.digest }}
          format: sarif
          output: trivy.sarif
          severity: CRITICAL,HIGH
          exit-code: '0'
```

### Verifikasi Digest yang Terbit

```bash
set -euo pipefail
IMAGE="ghcr.io/acme/api"
docker buildx imagetools inspect "${IMAGE}:1.4.0"   # satu entri per platform
gh attestation verify "oci://${IMAGE}:1.4.0" --owner acme
```

## Insight Penting

- Kecilkan huruf path registry (`${GITHUB_REPOSITORY,,}` di bash); GHCR menolak nama berhuruf campur dengan 403 yang menyesatkan.
- Biarkan build PR tetap satu platform dan tanpa push — emulasi QEMU membuat waktu build kurang lebih tiga kali lipat di setiap commit.
- `mode=max` adalah keuntungan terbesar untuk Dockerfile multi-stage, tetapi memperbesar penyimpanan cache; bersihkan secara berkala jika build sering berjalan.
- Build sekali, promosikan lewat digest. Job deploy sebaiknya memakai `image@sha256:...` agar retag `latest` tidak mengubah produksi.
- Ekspresi `with:` tidak bisa membaca output step yang dideklarasikan setelahnya — pertahankan `platforms:` dan `push:` memakai nilai context saja.

## Langkah Berikutnya

- Tambahkan grup `concurrency` agar build branch yang tersalip otomatis dibatalkan.
- Bagikan pipeline ini antar repositori memakai reusable workflow: lihat cheat sheet reusable workflows GitHub Actions.
- Pindah ke runner arm64 self-hosted untuk menghapus ketergantungan pada QEMU.
- Pelajari penandatanganan keyless dengan Cosign untuk jaminan supply chain yang lebih kuat.

## Kesimpulan

Anda kini membangun image amd64 dan arm64 dalam satu proses, melakukan autentikasi ke GHCR dengan token workflow, menandai rilis dari metadata semver dan SHA, memakai ulang cache BuildKit antar run, serta menerbitkan provenance yang dapat diverifikasi bersama laporan SARIF. Pipeline gagal dengan aman, dan setiap digest yang dideploy dapat dilacak kembali ke commit-nya.

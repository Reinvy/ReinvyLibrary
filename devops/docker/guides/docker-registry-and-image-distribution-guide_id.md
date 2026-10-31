---
title: "Panduan Registry dan Distribusi Image Docker"
description: "Panduan praktis mengelola container registry: pilihan registry, strategi tagging dan immutability, manifest multi-arch, mirror pull-through, kebijakan retensi, dan penandatanganan image."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Registry dan Distribusi Image Docker

## Pendahuluan

Container registry adalah lapisan distribusi pada pipeline pengiriman Anda. Di sanalah image diberi nama, disimpan, dipindai, direplikasi, dan akhirnya ditarik oleh orchestrator saat deploy. Tim biasanya memakai registry bawaan — Docker Hub, GHCR, ECR, Harbor — lalu menemukan konsekuensinya beberapa bulan kemudian: tag `latest` yang mutable sehingga rollback kehilangan makna, tagihan penyimpanan tanpa batas dari build lama, crash `exec format error` karena push satu arsitektur ke cluster multi-arch, dan tidak ada cara membuktikan image tidak dimodifikasi.

Panduan ini membahas keputusan yang benar-benar penting: cara memilih dan mengoperasikan registry, cara merancang skema tag yang bertahan di produksi, cara menerbitkan image multi-arsitektur, cara mengendalikan pertumbuhan penyimpanan, dan cara menjadikan verifikasi tanda tangan sebagai gerbang, bukan formalitas.

## Praktik Terbaik

### Perlakukan tag sebagai kontrak publikasi

Referensi image punya dua bagian: tag (mutable, mudah dibaca manusia) dan digest (immutable, berbasis konten). Tag ada untuk manusia; digest ada untuk mesin. Manifest deployment sebaiknya selalu bermuara pada digest, meskipun operator mengetik tag.

- **Jangan pernah men-deploy `latest`**: tag ini bergerak setiap push, sehingga dua pod yang dijalankan satu jam terpisah bisa menjalankan kode berbeda dengan versi yang sama.
- **Pakai satu skema di semua tempat**: `<versi>-<sha7>` untuk rilis, `sha-<sha-lengkap>` untuk setiap commit, `pr-<nomor>` untuk build pull request. Perkakas dapat menemukan build apa pun berdasarkan commit.
- **Pin digest di manifest**: `image: registry.example.com/api@sha256:...` membuat rollback deterministik dan memenuhi sebagian besar kebutuhan audit.
- **Aktifkan tag immutability** jika registry mendukungnya (ECR, Harbor, Artifact Registry). Menimpa tag rilis harus melalui penghapusan image, yang meninggalkan jejak.

### Utamakan banyak layer kecil berlabel daripada satu image gemuk

Biaya distribusi didominasi oleh byte yang ditarik tiap node. Jaga image runtime tetap minimal, terbitkan per arsitektur, dan lampirkan metadata alih-alih memanggangnya ke dalam image.

- **Lampirkan provenance sebagai label OCI** (`org.opencontainers.image.revision`, `...source`, `...created`) daripada menulis direktori `.git` ke dalam image.
- **Pertahankan base layer yang stabil**: build ulang dari digest base yang sama membuat node memakai ulang layer cache antar-deploy, dan multi-stage build menjauhkan compiler dari jalur pull.

### Bangun manifest multi-arch secara sadar

`docker buildx build --platform linux/amd64,linux/arm64 --push` menerbitkan manifest list, bukan satu image. Registry menyimpan satu image per arsitektur plus sebuah index; klien menyelesaikannya otomatis. Dua konsekuensi penting:

- Langkah yang menginspeksi image (`docker run`, pemindai kerentanan) perlu `--platform linux/amd64` eksplisit, jika tidak akan gagal pada index.
- Tanda tangan dan attestation melekat pada index, bukan pada image per arsitektur, sehingga penandatanganan dilakukan setelah push multi-arch selesai.

### Mirror image upstream di tepi jaringan

Registry pull-through cache (Harbor, Distribution dengan `proxy.remoteurl`, atau pull-through cache cloud) menurunkan egress eksternal, menghindari rate limit Docker Hub, dan memusatkan pemindaian.

- **Pin apa yang Anda mirror**: mirror `postgres:16` akan menarik ulang saat tag upstream bergerak. Mirror `postgres:16@sha256:...` agar reprodusibel.
- **Letakkan cache pada jalur jaringan yang sama dengan node**: mirror di region lain hanya memindahkan latensi.

### Retensi adalah kebijakan, bukan skrip pembersihan

Penyimpanan tumbuh monoton kecuali ada yang menghapus image. Definisikan retensi secara eksplisit: simpan N rilis terakhir per repositori, simpan setiap image yang dipakai deployment aktif, kedaluwarsakan tag `pr-*` setelah 14 hari, dan jangan pernah menghapus digest yang dirujuk SBOM. Jalankan aturannya terjadwal dan beri peringatan bila jumlah repositori tumbuh lebih cepat daripada jumlah deploy.

### Tanda tangani dan verifikasi, bukan sekadar memindai

Pemindaian menjawab "apakah image ini rentan?" Penandatanganan menjawab "apakah kami yang membangun image ini?" Cluster produksi sebaiknya menuntut keduanya.

- Tanda tangani digest dengan `cosign` (keyless via OIDC adalah opsi paling ringan).
- Tegakkan lewat admission policy (Kyverno, Connaisseur, atau padanan di cloud) agar image tanpa tanda tangan tidak bisa dijadwalkan, dan simpan SBOM serta attestation provenance di samping tanda tangan sebagai bukti.

## Langkah Implementasi

### Langkah 1: Pilih topologi registry

| Opsi | Paling cocok untuk | Perhatikan |
| --- | --- | --- |
| GHCR | tim berbasis GitHub, gratis untuk publik | model izin per paket masih kasar |
| AWS ECR / GCP Artifact Registry | beban kerja yang sudah di cloud tersebut | repositori per region, terikat IAM |
| Harbor (self-hosted) | air-gapped, multi-tenant, kontrol kebijakan | Anda mengelola storage dan upgrade |
| Docker Hub | distribusi publik | rate limit untuk pull anonim |

Sebagian besar organisasi berakhir dengan dua registry: satu privat untuk image internal dan satu mirror untuk image dasar upstream.

### Langkah 2: Autentikasi tanpa kata sandi berumur panjang

```bash
# CI: tukar token OIDC berumur pendek menjadi kredensial registry
echo "$CI_REGISTRY_TOKEN" | docker login registry.example.com \
    --username "$CI_REGISTRY_USER" --password-stdin

# Gagal cepat bila login tidak berlaku
docker pull registry.example.com/base/alpine:3.20 >/dev/null || {
    echo "login registry gagal" >&2
    exit 1
}
```

Utamakan workload identity atau federasi OIDC dibanding token statis; rotasi apa pun yang statis dengan jadwal tetap.

### Langkah 3: Build dan push image multi-arch dengan tag immutable

```bash
#!/usr/bin/env bash
set -euo pipefail

REGISTRY="registry.example.com"
IMAGE="platform/api"
REVISION="$(git rev-parse --short=7 HEAD)"
VERSION="$(cat VERSION)"

# Builder berbasis driver container dapat melakukan cross-compile
docker buildx create --name multiarch --driver docker-container --use 2>/dev/null || true
docker buildx inspect --bootstrap >/dev/null

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "REVISION=${REVISION}" \
    --label "org.opencontainers.image.revision=${REVISION}" \
    --label "org.opencontainers.image.version=${VERSION}" \
    --tag "${REGISTRY}/${IMAGE}:${VERSION}-${REVISION}" \
    --tag "${REGISTRY}/${IMAGE}:sha-$(git rev-parse HEAD)" \
    --provenance=true --sbom=true \
    --push .

# Catat digest; inilah yang harus dirujuk manifest deployment
DIGEST="$(docker buildx imagetools inspect "${REGISTRY}/${IMAGE}:${VERSION}-${REVISION}" \
    --format '{{json .Manifest.Digest}}' | tr -d '"')"
echo "referensi immutable: registry.example.com/platform/api@${DIGEST}"
```

### Langkah 4: Tanda tangani manifest list dan verifikasi sebelum deploy

```bash
# Tanda tangan keyless yang terikat pada identitas CI
cosign sign --yes "registry.example.com/platform/api@${DIGEST}"

# Gerbang verifikasi di pipeline deployment
cosign verify \
    --certificate-identity "https://github.com/acme/api/.github/workflows/release.yml@refs/heads/main" \
    --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
    "registry.example.com/platform/api@${DIGEST}"
```

### Langkah 5: Terapkan retensi dan pantau distribusi

```json
{
    "rules": [
        {
            "rulePriority": 1,
            "description": "Kedaluwarsakan image pull request setelah 14 hari",
            "selection": { "tagStatus": "tagged", "tagPrefixList": ["pr-"], "countType": "sinceImagePushed", "countUnit": "days", "countNumber": 14 },
            "action": { "type": "expire" }
        },
        {
            "rulePriority": 2,
            "description": "Simpan 30 tag rilis terbaru",
            "selection": { "tagStatus": "tagged", "tagPrefixList": ["v"], "countType": "imageCountMoreThan", "countNumber": 30 },
            "action": { "type": "expire" }
        }
    ]
}
```

Terapkan dengan `aws ecr put-lifecycle-policy --repository-name platform/api --lifecycle-policy-text file://policy.json`, lalu pantau `registry_storage_bytes` dan latensi pull per node pool. Registry yang cepat untuk CI tetapi lambat untuk node menandakan masalah penempatan cache, bukan masalah registry.

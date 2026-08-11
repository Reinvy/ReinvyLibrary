---
title: "Cheat Sheet Keamanan dan Manajemen Secret GitHub Actions"
description: "Panduan referensi cepat untuk keamanan GitHub Actions — izin GITHUB_TOKEN, autentikasi OIDC, aturan proteksi environment, manajemen secret, keamanan self-hosted runner, dan pola hardening workflow."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Keamanan dan Manajemen Secret GitHub Actions

## Tabel Referensi Cepat

| Konsep | Tindakan Utama | Deskripsi |
|--------|---------------|-----------|
| GITHUB_TOKEN | `permissions: {}` | Token yang diinjeksi otomatis; batasi dengan hak akses minimal di level workflow atau job |
| OIDC | `permissions: id-token: write` | Tukar token sementara untuk kredensial cloud provider (AWS, GCP, Azure) |
| Environment secret | `environment: production` | Secret yang di-scope + aturan proteksi (required reviewers, wait timer) |
| Repository secret | `${{ secrets.MY_SECRET }}` | Dienkripsi saat diam; tersedia untuk semua workflow di repo |
| Organization secret | `${{ secrets.ORG_SECRET }}` | Dibagikan ke repo terpilih di organisasi |
| Variables | `${{ vars.MY_VAR }}` | Konfigurasi non-secret teks biasa (terlihat di log) |
| Secret scanning | `github/codeql-action/upload-sarif@v3` | Deteksi secret yang bocor di event push dan PR |
| Dependabot | `dependabot.yml` | Perbarui dependensi otomatis dengan patch keamanan |
| OpenID Connect | `aws-actions/configure-aws-credentials@v4` | Tidak ada kunci cloud jangka panjang di secret GitHub |
| Self-hosted runner | `runs-on: self-hosted` | Kontrol lebih tapi tanggung jawab lebih — tanpa isolasi per-job |

## Perintah Umum

### Model Izin GITHUB_TOKEN

```yaml
# Level workflow — semua job mewarisi ini (yang paling restriktif menang)
on: [push]

permissions:
  contents: read        # read-only konten repo
  issues: write         # buat/komentari issue
  pull-requests: write  # buat/komentari PR
  actions: read         # baca artifact workflow
  checks: write         # buat/update check runs
  statuses: write       # buat/update commit statuses
  packages: write       # publikasi ke GitHub Packages
  deployments: write    # buat deployment events
  id-token: write       # diperlukan untuk OIDC (jangan berikan tanpa alasan)
```

```yaml
# Level job — override level workflow hanya untuk job ini
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write   # hanya job deploy yang perlu ini
      id-token: write      # hanya job deploy yang perlu OIDC
    steps:
      - uses: actions/checkout@v4
```

```yaml
# Token minimal — tidak ada izin sama sekali
permissions: {}
```

### Autentikasi OIDC — Cloud Provider

```yaml
# AWS — asumsikan IAM role via OIDC (tanpa kunci jangka panjang)
jobs:
  deploy-aws:
    permissions:
      id-token: write    # DIPERLUKAN untuk OIDC
      contents: read
    steps:
      - name: Konfigurasi kredensial AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: us-east-1
          role-session-name: github-actions-deploy
      - run: aws s3 sync dist/ s3://my-bucket
```

```yaml
# GCP — workload identity federation
jobs:
  deploy-gcp:
    permissions:
      id-token: write
      contents: read
    steps:
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: "projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider"
          service_account: "deploy-sa@my-project.iam.gserviceaccount.com"
      - run: gcloud run deploy my-service --image gcr.io/my-project/my-image
```

```yaml
# Azure — OIDC dengan federated identity credential
jobs:
  deploy-azure:
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Login Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - run: az webapp deploy --resource-group my-rg --name my-app
```

### Aturan Proteksi Environment

```yaml
# Definisikan environment di UI GitHub: Settings > Environments
# Aturan: required reviewers, wait timer, deployment branches

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com   # ditampilkan di UI deployment
    # Aturan proteksi diterapkan otomatis:
    #   - Required reviewers harus menyetujui
    #   - Wait timer (mis. 10 menit) diberlakukan
    #   - Hanya deployment branches yang cocok diizinkan
    steps:
      - run: ./deploy.sh
```

```yaml
# Pemilihan environment dinamis via workflow_dispatch
on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target deployment"
        required: true
        default: staging
        type: choice
        options:
          - development
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - run: echo "Menyebarkan ke ${{ inputs.environment }}"
```

### Pola Manajemen Secret

```yaml
# Repository secret — disimpan di Settings > Secrets and variables > Actions
# Akses via ${{ secrets.NAMA_SECRET }}
jobs:
  build:
    steps:
      - run: deploy.sh
        env:
          API_KEY: ${{ secrets.API_KEY }}           # secret repository
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}  # secret organisasi
```

```yaml
# Environment-scoped secret — override secret repository/organisasi untuk nama yang sama
# Otomatis dipilih saat `environment:` diatur
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo "Menggunakan URL DB produksi"
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      # Jika DATABASE_URL ada sebagai environment secret di "production",
      # itu akan diutamakan daripada secret level repository
```

```yaml
# Organization secret — dibagikan ke repository terpilih
# Atur di: Organization > Settings > Secrets and variables > Actions
# Akses: ${{ secrets.ORG_SECRET }}
# Terlihat oleh workflow mana pun di repo yang diotorisasi
```

```yaml
# Variables (konfigurasi non-secret)
# Gunakan untuk: region deployment, tag image, feature flags
steps:
  - run: echo "Region adalah ${{ vars.AWS_REGION }}"
  - run: kubectl apply -f manifests/
    env:
      NAMESPACE: ${{ vars.K8S_NAMESPACE }}
```

### Hardening Workflow

```yaml
# Cegah script injection — gunakan env variable perantara
# BURUK: ekspresi langsung di perintah
- run: echo "${{ github.event.issue.title }}"       # TIDAK AMAN

# BAIK: simpan di env, lalu referensikan
- run: echo "$JUDUL_ISSUE"
  env:
    JUDUL_ISSUE: ${{ github.event.issue.title }}    # AMAN
```

```yaml
# Batasi trigger workflow ke event tepercaya
on:
  pull_request_target:   # BERBAHAYA — berjalan dalam konteks repo dasar
    types: [labeled]     # Lebih aman: batasi dengan label dan review

  # Alternatif lebih aman — gunakan pull_request untuk fork tidak tepercaya
  pull_request:
    branches: [main]
```

```yaml
# Audit logging — lacak event workflow
# GitHub Audit Log (Organization > Security > Audit log)
# Berisi: semua workflow run, akses secret, perubahan environment
# Ekspor via: gh api /orgs/ORG/audit-log
```

```yaml
# Cegah paparan secret tidak sengaja di artifact
steps:
  - run: npm run build
  - run: |
      # Bersihkan secret dari output sebelum mengunggah
      rm -f .env .env.*
  - uses: actions/upload-artifact@v4
    with:
      name: build-output
      path: dist/
```

## Potongan Kode

### Workflow GITHUB_TOKEN dengan Hak Akses Minimal

```yaml
name: CI Aman
on:
  pull_request:
    branches: [main]

# Mulai tanpa izin, tambahkan hanya yang dibutuhkan setiap job
permissions: {}

jobs:
  lint:
    runs-on: ubuntu-latest
    permissions:
      contents: read     # hanya perlu checkout
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run lint

  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      checks: write      # write check runs untuk hasil tes
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test

  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
      deployments: write     # buat deployment events
      id-token: write        # OIDC untuk auth AWS
    steps:
      - uses: actions/checkout@v4
      - name: Konfigurasi kredensial AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/deploy-role
          aws-region: us-east-1
      - run: ./deploy.sh
```

### Setup OIDC Lengkap dengan AWS

```yaml
name: Deploy ke AWS dengan OIDC
on:
  push:
    branches: [main]

permissions:
  id-token: write        # diperlukan untuk pertukaran token OIDC
  contents: read         # diperlukan untuk checkout

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Konfigurasi kredensial AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: us-east-1
          role-duration-seconds: 900
          # Token OIDC (ACTIONS_ID_TOKEN_REQUEST_TOKEN) ditukar otomatis
          # GitHub → AWS STS → kredensial sementara — tidak perlu kunci manual

      - name: Build dan push Docker image
        run: |
          aws ecr get-login-password --region us-east-1 | \
            docker login --username AWS --password-stdin \
            123456789012.dkr.ecr.us-east-1.amazonaws.com
          docker build -t my-app .
          docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest

      - name: Deploy ke ECS
        run: |
          aws ecs update-service --cluster my-cluster \
            --service my-service --force-new-deployment
```

### Deployment Multi-Environment dengan Proteksi Gate

```yaml
name: Deployment Multi-Environment
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
      - run: ./deploy-staging.sh

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    permissions:
      contents: read
      deployments: write
      id-token: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
      - name: Konfigurasi kredensial AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/prod-deploy-role
          aws-region: us-east-1
      - run: ./deploy-prod.sh
```

### Secret Scanning dengan CodeQL

```yaml
name: Secret Scanning
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write    # upload hasil SARIF
      actions: read
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Inisialisasi CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript
          queries: security-extended

      - name: Lakukan Analisis CodeQL
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:javascript"

      # Secret scanning GitHub berjalan otomatis pada push untuk
      # repo publik dan repo dengan GitHub Advanced Security.
      # Mendeteksi: kunci AWS, token GitHub, token npm, dll.
```

### Konfigurasi Keamanan Dependabot

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
    reviewers:
      - "team-dev"
    assignees:
      - "security-lead"
    allow:
      - dependency-type: "direct"
    ignore:
      - dependency-name: "lodash"
      - dependency-name: "typescript"
        versions: [">=6.x"]

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      actions:
        patterns:
          - "actions/*"
          - "github/*"
```

### Hardening Keamanan Self-Hosted Runner

```yaml
name: Job Self-Hosted Runner
on:
  workflow_dispatch:

jobs:
  build:
    # Hanya terima job dari branch main
    if: github.ref == 'refs/heads/main'
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      # JANGAN PERNAH menjalankan kode tidak tepercaya di self-hosted runner
      # - pull_request_target dari fork berbahaya
      # - Gunakan GitHub-hosted runner untuk PR dari fork

      - run: ./trusted-build.sh
```

```yaml
# Konfigurasi grup runner (atur via UI GitHub atau API)
# - Batasi repo mana yang bisa menggunakan grup
# - Atur jumlah runner maksimum
# - Terapkan label untuk routing job

# Job menarget grup runner tertentu
jobs:
  secure-build:
    runs-on: [self-hosted, linux, x64, production]
    steps:
      - run: ./build.sh
```

### Mencegah Paparan Secret di Log Actions

```yaml
# GitHub Actions secara otomatis menutupi secret di log
# Tapi Anda tetap harus berhati-hati dengan output terstruktur

steps:
  - name: Hindari mencetak secret
    run: |
      # BURUK — secret tercetak sebagai key JSON
      echo "{\"api_key\": \"${{ secrets.API_KEY }}\"}"

      # BAIK — simpan di env variable, masking otomatis
      curl -H "Authorization: Bearer $API_KEY" https://api.example.com
    env:
      API_KEY: ${{ secrets.API_KEY }}

  - name: Sanitasi output debug
    run: |
      # Hapus pola yang diketahui sebelum logging
      curl -v https://api.example.com 2>&1 | \
        sed 's/Authorization: Bearer [^ ]*/Authorization: Bearer ***/g'
```

### SLSA dan Keamanan Supply Chain

```yaml
# Hasilkan attestation provenance untuk artifact build
name: SLSA Provenance
on:
  push:
    tags: ["v*"]

jobs:
  build:
    permissions:
      id-token: write      # diperlukan untuk penandatanganan
      contents: read
      attestations: write  # diperlukan untuk upload attestation
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build

      - name: Hasilkan attestation
        uses: actions/attest-build-provenance@v1
        with:
          subject-path: "dist/**"

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: signed-build
          path: dist/
```

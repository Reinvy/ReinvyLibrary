---
title: "GitHub Actions Cheat Sheet"
description: "Panduan referensi cepat untuk GitHub Actions — sintaks workflow, pemicu event, konfigurasi job, actions marketplace, caching, artifacts, pola deployment, dan perintah troubleshooting umum."
category: "devops"
technology: "github-actions"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# GitHub Actions Cheat Sheet

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Lokasi file workflow | `.github/workflows/*.yml` | File YAML yang mendefinisikan workflow otomatis |
| Pemicu manual | `workflow_dispatch` | Jalankan workflow secara manual via UI atau API GitHub |
| Jadwal berkala | `schedule: - cron: '0 0 * * *'` | Pemicu berdasarkan jadwal cron |
| Lewati workflow | `[skip ci]` atau `[ci skip]` di pesan commit | Cegah workflow berjalan |
| Batalkan workflow | UI GitHub atau `gh run cancel <id>` | Hentikan workflow yang sedang berjalan |
| Jalankan ulang job | UI GitHub atau `gh run rerun <id>` | Jalankan ulang job yang gagal |
| Lihat log | `gh run view <id> --log` | Tampilkan log workflow di terminal |
| Daftar workflow | `gh workflow list` | Tampilkan semua workflow di repositori |
| Aktif/nonaktifkan | `gh workflow enable/disable <id>` | Ubah status workflow |

## Perintah Umum

### Struktur YAML Workflow

```yaml
name: CI Pipeline
run-name: "CI ${{ github.sha }}"
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: "Lingkungan target"
        required: true
        default: staging
        type: choice
        options: [staging, production]

env:
  NODE_VERSION: "20"
  REGISTRY: ghcr.io

defaults:
  run:
    shell: bash
    working-directory: ./app

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    outputs:
      version: ${{ steps.set-version.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - id: set-version
        run: echo "version=$(node -p "require('./package.json').version")" >> "$GITHUB_OUTPUT"
```

### Pemicu Event

```yaml
on:
  push:
    branches: [main, "feature/*"]
    tags: ["v*"]
    paths: ["src/**", "!docs/**"]
    paths-ignore: ["*.md"]
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
    branches: [main]
  schedule:
    - cron: "0 6 * * 1"
    - cron: "0 0 1 * *"
  workflow_run:
    workflows: ["Lint Check"]
    types: [completed]
  repository_dispatch:
    types: [deploy-event]
  issue_comment:
    types: [created, edited]
  release:
    types: [published, edited]
  page_build:
  watch:
    types: [started]
  fork:
```

### Konfigurasi Job

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    continue-on-error: false
    if: github.event_name == 'pull_request'
    environment: testing
    strategy:
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
      fail-fast: false
      max-parallel: 4
    needs: [lint, build]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
    steps:
      - uses: actions/checkout@v4
      - run: npm test
```

### Matrix Build

```yaml
strategy:
  matrix:
    node: [18, 20]
    os: [ubuntu-latest, macos-latest]
    include:
      - node: 22
        os: ubuntu-latest
        experimental: true
    exclude:
      - node: 18
        os: macos-latest

steps:
  - run: echo "Node ${{ matrix.node }} pada ${{ matrix.os }}"
  - if: matrix.experimental
    continue-on-error: true
    run: npm run experimental-tests
```

### Referensi Actions Marketplace

```yaml
steps:
  # Kontrol sumber
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
      ref: ${{ github.event.pull_request.head.sha }}
      lfs: true

  # Setup runtime
  - uses: actions/setup-node@v4
    with:
      node-version: "20"
      cache: "npm"
  - uses: actions/setup-python@v5
    with:
      python-version: "3.12"
      cache: "pip"
  - uses: actions/setup-java@v4
    with:
      distribution: temurin
      java-version: "21"
      cache: "maven"
  - uses: actions/setup-go@v5
    with:
      go-version: "1.22"
      cache: true

  # Docker dan container
  - uses: docker/login-action@v3
    with:
      registry: ghcr.io
      username: ${{ github.actor }}
      password: ${{ secrets.GITHUB_TOKEN }}
  - uses: docker/build-push-action@v5
    with:
      context: .
      push: true
      tags: ghcr.io/${{ github.repository }}:latest

  # Cloud providers
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/deploy-role
      aws-region: us-east-1
  - uses: google-github-actions/auth@v2
    with:
      workload_identity_provider: "projects/..."
      service_account: "deploy@project.iam.gserviceaccount.com"
  - uses: azure/login@v2
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### Secret dan Environment Variables

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Lingkungan target"
        type: environment

env:
  CI: true
  REGISTRY: ghcr.io

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment || 'production' }}
    env:
      NODE_ENV: production
    steps:
      - name: Gunakan secret
        run: deploy.sh
        env:
          API_KEY: ${{ secrets.DEPLOY_KEY }}

      # GITHUB_TOKEN — diinjeksi otomatis, terbatas ke repo saat ini
      - run: |
          gh api repos/${{ github.repository }}/releases
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Secret repositori (dikonfigurasi di Settings > Secrets and variables)
      - run: echo "${{ secrets.MY_SECRET }}" | wc -c

      # Secret organisasi (dibagikan antar repo dalam organisasi)
      - run: echo "${{ secrets.ORG_WIDE_SECRET }}"

      # Secret lingkungan (terbatas ke environment deployment)
      - run: echo "${{ secrets.ENV_SPECIFIC_SECRET }}"

      # Variables (bukan secret, terlihat sebagai teks biasa)
      - run: echo "${{ vars.DEPLOY_REGION }}"
```

### Artifacts dan Caching

```yaml
steps:
  # Upload artifact build
  - uses: actions/upload-artifact@v4
    with:
      name: build-output-${{ github.sha }}
      path: dist/
      retention-days: 5
      if-no-files-found: error
      compression-level: 6

  # Download artifact build (di job downstream)
  - uses: actions/download-artifact@v4
    with:
      name: build-output-${{ github.sha }}
      path: dist/

  # Cache dependensi
  - uses: actions/cache@v4
    with:
      path: |
        ~/.npm
        node_modules
      key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      restore-keys: |
        npm-${{ runner.os }}-
        npm-

  # Cache hasil build
  - uses: actions/cache@v4
    with:
      path: |
        **/target
        ~/.m2/repository
      key: maven-${{ runner.os }}-${{ hashFiles('**/pom.xml') }}

  # Pintasan caching dependensi (built-in pada setup-* actions)
  - uses: actions/setup-node@v4
    with:
      node-version: "20"
      cache: "npm"
```

## Potongan Kode

### Pipeline CI (Lint, Test, Build)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ${{ matrix.os }}
    needs: lint
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: "npm"
      - run: npm ci
      - run: npm test
      - run: npm run coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.os }}-${{ matrix.node }}
          path: coverage/

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
```

### Pipeline Deployment

```yaml
name: Deploy
on:
  push:
    tags: ["v*"]
  workflow_dispatch:
    inputs:
      environment:
        description: "Target deployment"
        required: true
        default: staging
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment || 'staging' }}
    concurrency: deploy-${{ inputs.environment || 'staging' }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build

      - name: Deploy ke Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Notifikasi deployment
        run: |
          curl -X POST ${{ vars.SLACK_WEBHOOK }} \
            -H "Content-Type: application/json" \
            -d '{"text": "Deploy ${{ github.ref_name }} ke ${{ inputs.environment }} selesai"}'

  smoke-test:
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - name: Pemeriksaan kesehatan
        run: |
          curl --retry 5 --retry-delay 10 \
            https://app.example.com/api/health
```

### Build dan Publikasi Docker

```yaml
name: Publish Docker Image
on:
  push:
    branches: [main]
    tags: ["v*"]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Login ke registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Ekstrak metadata Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=ref,event=branch
            type=sha,prefix=

      - name: Build dan push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Workflow yang Dapat Digunakan Ulang (Pemanggil)

```yaml
# .github/workflows/ci.yml — Workflow pemanggil
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    uses: ./.github/workflows/reusable-quality.yml
    with:
      node-version: "20"
      os: ubuntu-latest
    secrets:
      CODE_COV_TOKEN: ${{ secrets.CODECOV_TOKEN }}

  deploy:
    needs: quality
    uses: my-org/shared-workflows/.github/workflows/deploy.yml@v1
    with:
      environment: staging
    secrets:
      DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

### Workflow yang Dapat Digunakan Ulang (Definisi)

```yaml
# .github/workflows/reusable-quality.yml — Workflow reusable
name: Reusable Quality Checks
on:
  workflow_call:
    inputs:
      node-version:
        description: "Versi Node.js"
        required: true
        type: string
      os:
        description: "OS Runner"
        required: false
        type: string
        default: ubuntu-latest
    secrets:
      CODE_COV_TOKEN:
        required: false

jobs:
  lint-and-test:
    runs-on: ${{ inputs.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - if: secrets.CODE_COV_TOKEN
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODE_COV_TOKEN }}
```

### Composite Action

```yaml
# .github/actions/setup-project/action.yml
name: "Setup Project"
description: "Check out code dan instal dependensi"
inputs:
  node-version:
    description: "Versi Node.js"
    required: false
    default: "20"
  working-directory:
    description: "Direktori kerja"
    required: false
    default: "."

runs:
  using: "composite"
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: "npm"
    - run: npm ci
      shell: bash
      working-directory: ${{ inputs.working-directory }}

# Penggunaan di workflow:
# - uses: ./.github/actions/setup-project
#   with:
#     node-version: "22"
#     working-directory: ./app
```

### Perintah Troubleshooting

```bash
# Periksa sintaks workflow secara lokal
gh workflow view --ref main

# Daftar workflow run terbaru
gh run list --limit 10 --workflow ci.yml

# Lihat log untuk run tertentu
gh run view 1234567890 --log

# Jalankan ulang job yang gagal
gh run rerun 1234567890 --failed

# Batalkan run yang stuck
gh run cancel 1234567890

# Aktifkan/nonaktifkan workflow
gh workflow enable ci.yml
gh workflow disable ci.yml

# Download artifact dari sebuah run
gh run download 1234567890 --name build-output

# Debug logging: tambahkan secret ACTIONS_STEP_DEBUG=true
# Set ACTIONS_RUNNER_DEBUG=true untuk debug level runner

# Periksa rate limit API GitHub
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/rate_limit

# Uji workflow_dispatch via API
curl -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/owner/repo/actions/workflows/ci.yml/dispatches \
  -d '{"ref":"main","inputs":{"environment":"staging"}}'
```

### Aturan Proteksi Environment

```yaml
# Environment harus dikonfigurasi di GitHub Settings > Environments
# Fitur: required reviewers, wait timer, deployment branches

jobs:
  deploy-prod:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    steps:
      - run: deploy.sh

# Variables di environments:
# - ${{ vars.ENV_VAR }}           # Variable environment (terlihat)
# - ${{ secrets.ENV_SECRET }}     # Secret environment (tersembunyi)

# Required reviewers memblokir deployment hingga disetujui
# Wait timer memberlakukan penundaan wajib (contoh: 5 menit)
# Deployment branches membatasi branch yang bisa melakukan deploy
```

---
title: "Membangun Pipeline Deployment dengan GitHub Actions"
description: "Tutorial komprehensif tentang membuat pipeline deployment tingkat produksi dengan GitHub Actions, mencakup workflow berbasis environment, gerbang persetujuan, strategi rollback, dan integrasi platform cloud."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Pipeline Deployment dengan GitHub Actions

## Ringkasan

Tutorial ini mengajarkan cara membangun pipeline deployment profesional menggunakan GitHub Actions. Anda akan belajar mengonfigurasi environment deployment dengan aturan perlindungan, menerapkan gerbang persetujuan, menyiapkan strategi deployment blue/green dan rolling, menangani rollback secara otomatis, dan berintegrasi dengan Docker registry serta platform cloud — memungkinkan tim Anda mengirim kode dengan aman dan andal.

## Target Audiens

- Engineer DevOps dan pengembang yang bertanggung jawab atas desain pipeline CI/CD.
- Tim yang menggunakan GitHub dan ingin melampaui workflow CI dasar menuju otomatisasi deployment tingkat produksi.
- Level yang diharapkan: Menengah — pemahaman tentang sintaks workflow GitHub Actions (jobs, steps, triggers) sudah diasumsikan.

## Prasyarat

- Akun GitHub dengan repositori yang memiliki GitHub Actions aktif.
- Pemahaman dasar tentang workflow GitHub Actions — jobs, steps, trigger `on`, dan matrix builds.
- Keakraban dengan sintaks YAML dan shell scripting.
- Opsional tetapi membantu: akun Docker Hub atau GitHub Container Registry untuk contoh deployment kontainer.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mengonfigurasi GitHub Environments dengan aturan perlindungan dan peninjau yang diperlukan.
- Mendesain workflow deployment multi-environment (development, staging, production).
- Menerapkan gerbang persetujuan menggunakan aturan perlindungan environment dan trigger manual.
- Membangun strategi deployment blue/green dan rolling dengan rollback otomatis.
- Mengintegrasikan pipeline deployment dengan Docker registry dan target deployment cloud.
- Menambahkan notifikasi dan observabilitas deployment ke pipeline Anda.
- Menerapkan strategi rollback yang aman untuk deployment yang gagal.

## Konteks dan Motivasi

Memindahkan kode dari repositori ke aplikasi yang berjalan di production melibatkan risiko yang signifikan. Proses deployment manual rentan terhadap kesalahan, tidak memiliki jejak audit, dan memperlambat tim. Seiring bertambahnya skala organisasi, kebutuhan akan pipeline deployment yang terotomatisasi dan memiliki gerbang pengaman menjadi sangat penting.

GitHub Actions menyediakan platform yang kuat untuk membangun pipeline deployment langsung di dalam repositori Anda. Fitur Environments-nya memberikan aturan perlindungan, isolasi secrets, dan gerbang persetujuan — semua yang diperlukan untuk deployment yang aman dan sesuai standar. Dikombinasikan dengan ekosistem actions dan API deployment GitHub yang kaya, Anda dapat menerapkan strategi deployment tingkat perusahaan tanpa meninggalkan workflow GitHub Anda.

Tutorial ini menjembatani kesenjangan antara CI dasar dan CD tingkat produksi, memberikan pola yang berfungsi baik untuk tim kecil maupun organisasi besar.

## Konten Inti

### Memahami GitHub Environments

GitHub Environments merepresentasikan target deployment — tahapan berbeda dalam pipeline pengiriman Anda seperti `development`, `staging`, dan `production`. Setiap environment membawa kumpulan aturan perlindungan, secrets, dan riwayat deployment-nya sendiri.

**Fitur utama environment:**

- **Required reviewers**: Tentukan individu atau tim yang harus menyetujui deployment sebelum dilanjutkan.
- **Wait timer**: Berikan penundaan wajib sebelum deployment dimulai (berguna untuk periode pendinginan production).
- **Deployment branches**: Batasi branch mana yang dapat melakukan deployment ke suatu environment.
- **Environment secrets**: Isolasi nilai sensitif per environment — secrets production tidak pernah terpapar ke jobs staging.
- **Deployment protection rules**: Gerbang deployment berdasarkan pemeriksaan eksternal seperti status CI atau respons API kustom.

### Desain Workflow Multi-Environment

Pipeline deployment yang matang berjalan melalui beberapa environment:

```text
CI (build & test) → Development (auto-deploy) → Staging (dibatasi) → Production (dibatasi)
```

Setiap environment memiliki aturan yang berbeda:

| Environment | Trigger | Persetujuan Diperlukan | Branch Deploy |
|---|---|---|---|
| Development | Push ke main | Tidak | main |
| Staging | Manual workflow_dispatch | Opsional | main |
| Production | Manual workflow_dispatch | Peninjau yang ditunjuk | main, release/* |

Pendekatan progresif ini menangkap masalah sejak dini. Commit yang lolos CI akan di-deploy ke development secara otomatis. Dari sana, manusia atau rangkaian tes otomatis mempromosikan build ke staging, dan akhirnya ke production setelah persetujuan formal.

### Struktur Job Deployment dengan Environment

Environment direferensikan di tingkat job dalam workflow Anda:

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - name: Deploy to staging
        run: ./deploy.sh staging
```

Kolom `environment.url` membuat tautan langsung ke deployment di antarmuka GitHub Actions. Tautan ini terlihat di ringkasan workflow run dan di pemeriksaan status commit.

### Strategi Deployment Blue/Green

Deployment blue/green menjalankan dua environment identik — hanya satu yang melayani lalu lintas langsung pada satu waktu:

1. **Blue** adalah environment production saat ini yang melayani lalu lintas langsung.
2. **Green** adalah versi baru yang di-deploy di sampingnya, sudah diuji sepenuhnya tetapi tidak menerima lalu lintas.
3. Setelah validasi, router atau load balancer mengalihkan lalu lintas dari blue ke green.
4. Jika deployment green gagal, lalu lintas tetap di blue — rollback instan.

Implementasi dengan GitHub Actions:

```yaml
jobs:
  deploy-green:
    runs-on: ubuntu-latest
    environment:
      name: production
    outputs:
      green_url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        run: |
          docker build -t app:${{ github.sha }} .
          docker tag app:${{ github.sha }} registry.example.com/app:${{ github.sha }}
          docker push registry.example.com/app:${{ github.sha }}
      - name: Deploy green environment
        id: deploy
        run: |
          ./deploy-green.sh ${{ github.sha }}
          echo "url=https://green-${{ github.sha }}.example.com" >> $GITHUB_OUTPUT

  switch-traffic:
    needs: deploy-green
    runs-on: ubuntu-latest
    environment:
      name: production
    steps:
      - name: Run smoke tests against green
        run: ./smoke-test.sh ${{ needs.deploy-green.outputs.green_url }}
      - name: Switch load balancer to green
        run: ./switch-traffic.sh green
```

### Strategi Deployment Rolling

Deployment rolling mengganti instance secara bertahap, menghindari downtime:

```yaml
jobs:
  rolling-deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
    strategy:
      matrix:
        instance: [blue, green, yellow]
      max-parallel: 1
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to instance group ${{ matrix.instance }}
        run: |
          ./drain-and-deploy.sh ${{ matrix.instance }} ${{ github.sha }}
      - name: Health check
        run: |
          ./health-check.sh ${{ matrix.instance }}
          if [ $? -ne 0 ]; then
            echo "Health check failed for ${{ matrix.instance }}"
            ./rollback.sh ${{ matrix.instance }} previous
            exit 1
          fi
```

### Konfigurasi Environment melalui GitHub Secrets

Setiap environment menyimpan secrets-nya sendiri. Buat di **Settings → Environments → [nama environment] → Environment secrets**:

```bash
# environment development secrets
AWS_ACCESS_KEY_ID=dev-access-key
AWS_SECRET_ACCESS_KEY=dev-secret-key
DEPLOY_ENDPOINT=https://dev-api.example.com

# environment staging secrets
AWS_ACCESS_KEY_ID=staging-access-key
AWS_SECRET_ACCESS_KEY=staging-secret-key
DEPLOY_ENDPOINT=https://staging-api.example.com

# environment production secrets
AWS_ACCESS_KEY_ID=prod-access-key
AWS_SECRET_ACCESS_KEY=prod-secret-key
DEPLOY_ENDPOINT=https://api.example.com
```

Workflow mereferensikan secrets ini melalui konteks environment:

```yaml
steps:
  - name: Deploy to ${{ github.event.environment.name }}
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    run: ./deploy.sh
```

### Gerbang Persetujuan Manual dengan Aturan Perlindungan Environment

Deployment production memerlukan persetujuan manusia. GitHub Environments menyediakannya melalui **Required reviewers**:

1. Navigasi ke **Settings → Environments → production → Required reviewers**.
2. Tambahkan individu atau tim yang harus menyetujui setiap deployment.
3. Ketika workflow menargetkan environment `production`, GitHub membuat permintaan peninjauan deployment.
4. Pemberi persetujuan menerima notifikasi dan dapat meninjau detail deployment sebelum menyetujui atau menolaknya.

Untuk sistem persetujuan eksternal (alat ITSM seperti ServiceNow atau Jira Service Management), gunakan **custom deployment protection rule** melalui GitHub Marketplace atau aplikasi GitHub kustom yang memeriksa status sistem eksternal.

### Strategi Rollback Deployment

**Rollback otomatis pada kegagalan health check:**

```yaml
steps:
  - name: Deploy new version
    id: deploy
    run: |
      ./deploy.sh ${{ github.sha }}
      echo "previous_version=$(cat previous-version.txt)" >> $GITHUB_OUTPUT

  - name: Run post-deployment health checks
    id: health
    run: ./health-check.sh
    continue-on-error: true

  - name: Rollback on failure
    if: steps.health.outcome == 'failure'
    run: |
      echo "Health check failed — rolling back to ${{ steps.deploy.outputs.previous_version }}"
      ./rollback.sh ${{ steps.deploy.outputs.previous_version }}
```

**Pelacakan versi dengan artifact deployment:**

Simpan metadata versi sebelumnya sebagai artifact workflow atau dalam file versi sederhana di target deployment Anda. Setiap deployment menulis versi saat ini sebelum men-deploy versi baru, sehingga langkah rollback selalu mengetahui versi terakhir yang baik:

```bash
#!/bin/bash
# deploy.sh — catat versi sebelumnya sebelum men-deploy yang baru
if [ -f /opt/app/current-version.txt ]; then
  cp /opt/app/current-version.txt /opt/app/previous-version.txt
fi
echo "$1" > /opt/app/current-version.txt

# ... salin file aplikasi baru, restart layanan ...
```

### Notifikasi Deployment

Jaga tim Anda tetap mendapat informasi tentang status deployment:

```yaml
steps:
  - name: Notify deployment start
    uses: slackapi/slack-github-action@v1
    with:
      payload: |
        {
          "text": "🚀 Deployment ke *${{ github.event.environment.name }}* dimulai oleh ${{ github.actor }}"
        }
    env:
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  - name: Notify deployment success
    if: success()
    uses: slackapi/slack-github-action@v1
    with:
      payload: |
        {
          "text": "✅ Deployment ke *${{ github.event.environment.name }}* berhasil"
        }

  - name: Notify deployment failure
    if: failure()
    uses: slackapi/slack-github-action@v1
    with:
      payload: |
        {
          "text": "❌ Deployment ke *${{ github.event.environment.name }}* gagal — @here"
        }
```

### Contoh Pipeline Deployment Lengkap

Berikut adalah workflow multi-environment lengkap yang menggabungkan semua konsep:

```yaml
name: Deploy Application

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        default: "staging"
        type: choice
        options:
          - staging
          - production

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          echo "Running test suite..."
          npm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image_tag: ${{ steps.tag.outputs.tag }}
    steps:
      - uses: actions/checkout@v4
      - name: Log in to registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push Docker image
        id: tag
        run: |
          TAG="${{ github.sha }}"
          docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:$TAG .
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:$TAG
          echo "tag=$TAG" >> $GITHUB_OUTPUT

  deploy-dev:
    needs: build-and-push
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    environment:
      name: development
      url: https://dev.example.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to development
        run: |
          ./deploy.sh development ${{ needs.build-and-push.outputs.image_tag }}

  deploy-staging:
    needs: build-and-push
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'staging'
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          ./deploy.sh staging ${{ needs.build-and-push.outputs.image_tag }}
      - name: Run integration tests against staging
        run: |
          ./integration-tests.sh https://staging.example.com

  deploy-production:
    needs: [build-and-push, deploy-staging]
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        id: deploy
        run: |
          ./deploy.sh production ${{ needs.build-and-push.outputs.image_tag }}
      - name: Post-deployment smoke tests
        id: smoke
        run: |
          echo "Running smoke tests against production..."
          ./smoke-test.sh https://example.com
        continue-on-error: true
      - name: Rollback on smoke test failure
        if: steps.smoke.outcome == 'failure'
        run: |
          echo "Smoke tests failed — initiating rollback"
          ./rollback.sh production
      - name: Notify deployment result
        if: always()
        run: |
          if [ "${{ steps.smoke.outcome }}" == "failure" ]; then
            echo "❌ Production deployment failed — rolled back"
          else
            echo "✅ Production deployment succeeded"
          fi
```

## Contoh Kode

### Menyiapkan GitHub Environments melalui CLI

Anda dapat membuat environment secara terprogram menggunakan GitHub CLI:

```bash
# Buat environment development
gh api -X PUT repos/:owner/:repo/environments/development

# Buat environment staging dengan wait timer
gh api -X PUT repos/:owner/:repo/environments/staging \
  -f wait_timer=60

# Buat environment production dengan peninjau yang diperlukan
gh api -X PUT repos/:owner/:repo/environments/production \
  -f required_reviewer_teams[]="my-org/ops-team" \
  -f deployment_branch_policy.protected_branches=true \
  -f deployment_branch_policy.custom_branch_policies=true

# Daftar semua environment
gh api repos/:owner/:repo/environments --jq '.environments[].name'
```

### Template Skrip Deployment

Skrip deployment yang dapat digunakan kembali yang bekerja dengan pola-pola dalam tutorial ini:

```bash
#!/bin/bash
# deploy.sh — Deploy aplikasi ke target environment
# Penggunaan: ./deploy.sh <environment> <version>

set -euo pipefail

ENVIRONMENT="$1"
VERSION="$2"
DEPLOY_DIR="/opt/app/${ENVIRONMENT}"
PREVIOUS_VERSION_FILE="${DEPLOY_DIR}/previous-version.txt"
CURRENT_VERSION_FILE="${DEPLOY_DIR}/current-version.txt"

echo "=== Deploy versi ${VERSION} ke ${ENVIRONMENT} ==="

# Catat versi saat ini sebagai versi sebelumnya sebelum men-deploy
if [ -f "$CURRENT_VERSION_FILE" ]; then
  cp "$CURRENT_VERSION_FILE" "$PREVIOUS_VERSION_FILE"
fi

# Buat direktori deploy jika belum ada
mkdir -p "$DEPLOY_DIR"

# Tarik versi baru
docker pull ghcr.io/my-org/my-app:${VERSION}

# Hentikan kontainer lama (jika berjalan)
docker stop "app-${ENVIRONMENT}" 2>/dev/null || true
docker rm "app-${ENVIRONMENT}" 2>/dev/null || true

# Jalankan kontainer baru
docker run -d \
  --name "app-${ENVIRONMENT}" \
  --restart unless-stopped \
  -p 3000:3000 \
  -e "NODE_ENV=${ENVIRONMENT}" \
  ghcr.io/my-org/my-app:${VERSION}

# Catat versi yang di-deploy
echo "$VERSION" > "$CURRENT_VERSION_FILE"

echo "=== Deployment ke ${ENVIRONMENT} selesai ==="
```

### Template Skrip Rollback

```bash
#!/bin/bash
# rollback.sh — Rollback ke versi sebelumnya
# Penggunaan: ./rollback.sh <environment>

set -euo pipefail

ENVIRONMENT="$1"
DEPLOY_DIR="/opt/app/${ENVIRONMENT}"
PREVIOUS_VERSION_FILE="${DEPLOY_DIR}/previous-version.txt"

if [ ! -f "$PREVIOUS_VERSION_FILE" ]; then
  echo "ERROR: Tidak ada versi sebelumnya untuk ${ENVIRONMENT}"
  exit 1
fi

PREVIOUS_VERSION=$(cat "$PREVIOUS_VERSION_FILE")
echo "=== Rollback ${ENVIRONMENT} ke versi ${PREVIOUS_VERSION} ==="

# Hentikan kontainer saat ini
docker stop "app-${ENVIRONMENT}" 2>/dev/null || true
docker rm "app-${ENVIRONMENT}" 2>/dev/null || true

# Jalankan versi sebelumnya
docker run -d \
  --name "app-${ENVIRONMENT}" \
  --restart unless-stopped \
  -p 3000:3000 \
  -e "NODE_ENV=${ENVIRONMENT}" \
  ghcr.io/my-org/my-app:${PREVIOUS_VERSION}

echo "=== Rollback ke ${PREVIOUS_VERSION} selesai ==="
```

## Insight Penting

- **Mulai dengan environment sejak awal**: Tambahkan environment ke repositori Anda segera setelah Anda memiliki lebih dari satu target deployment. Menambahkannya secara retroaktif ke workflow yang sudah ada memerlukan refactoring yang cermat.
- **Simpan skrip deployment di luar workflow**: Skrip shell (deploy.sh, rollback.sh) tinggal di repositori Anda dan memiliki versi yang sama dengan kode Anda. Workflow memanggilnya daripada menulis logika deployment yang kompleks secara inline — ini membuat skrip dapat diuji secara lokal.
- **Health check adalah jaring pengaman Anda**: Setiap langkah deployment harus diikuti dengan health check. Tanpa mereka, Anda tidak akan mendeteksi kegagalan sampai pengguna melaporkannya.
- **`continue-on-error` untuk deteksi rollback**: Gunakan `continue-on-error: true` pada langkah health check sehingga workflow berlanjut ke langkah rollback alih-alih berhenti segera.
- **Tautan URL Environment**: Selalu atur `environment.url` di job workflow. Ini membuat tautan yang dapat diklik dari antarmuka Actions langsung ke aplikasi yang di-deploy, menghemat waktu pengembang selama debugging.
- **Isolasi secrets itu penting**: Jangan pernah menggunakan ulang secrets antar environment. Kompromi pada staging seharusnya tidak mengekspos kredensial production. GitHub Environments menerapkan pemisahan ini secara desain.
- **Gerbang persetujuan bukan pengganti pemeriksaan otomatis**: Required reviewers menambahkan akuntabilitas tetapi harus melengkapi — bukan menggantikan — smoke test otomatis dan health check.

## Langkah Berikutnya

- Jelajahi [GitHub Actions CI/CD Best Practices Guide](../guides/github-actions-cicd-best-practices-guide.md) untuk pola tingkat organisasi tentang reusable workflows, security hardening, dan optimasi biaya.
- Pelajari tentang [Building Custom GitHub Actions](./building-custom-github-actions.md) untuk mengenkapsulasi logika deployment Anda ke dalam komponen yang dapat digunakan kembali.
- Pelajari [GitHub Actions DevOps Syllabus](../syllabi/github-actions-devops-syllabus.md) untuk jalur pembelajaran terstruktur 12 minggu yang mencakup seluruh ekosistem CI/CD.

## Kesimpulan

Anda telah belajar cara membangun pipeline deployment tingkat produksi dengan GitHub Actions. Anda sekarang memahami GitHub Environments dengan aturan perlindungan dan gerbang persetujuan, desain workflow multi-environment, strategi deployment blue/green dan rolling, rollback otomatis pada kegagalan health check, dan notifikasi deployment. Pola-pola ini memberikan fondasi untuk pipeline pengiriman yang aman, andal, dan dapat diaudit yang dapat diskalakan bersama tim Anda.

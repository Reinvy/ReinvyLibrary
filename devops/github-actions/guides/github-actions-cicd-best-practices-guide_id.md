---
title: "Panduan Praktik Terbaik CI/CD GitHub Actions"
description: "Panduan komprehensif untuk mengatur, mengamankan, dan mengoptimalkan alur kerja GitHub Actions untuk pipeline CI/CD produksi."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Praktik Terbaik CI/CD GitHub Actions

## Pendahuluan

GitHub Actions menyediakan platform CI/CD yang kuat dan fleksibel yang terintegrasi langsung ke dalam ekosistem GitHub. Alur kerja dapat membangun, menguji, dan menyebarkan aplikasi di berbagai bahasa dan platform. Namun, seiring dengan bertambahnya kompleksitas pipeline, menjaga efisiensi, keamanan, dan penghematan biaya dalam alur kerja memerlukan keputusan arsitektural yang matang.

Panduan ini mencakup praktik terbaik untuk menyusun file alur kerja, mendesain komponen yang dapat digunakan kembali, mengelola rahasia (secrets), mengimplementasikan strategi deployment, dan mengoptimalkan penggunaan runner. Baik Anda mengelola monorepo dengan puluhan alur kerja atau pipeline layanan mikro tunggal, pola-pola ini akan membantu Anda membangun pipeline CI/CD yang mudah dipelihara, dapat diamati, dan siap produksi.

## Praktik Terbaik

### Pola Organisasi Alur Kerja

Atur alur kerja berdasarkan tujuan dan tahap siklus hidup. Gunakan struktur datar di bawah `.github/workflows/` untuk repositori kecil, tetapi terapkan konvensi penamaan yang menyampaikan maksud:

- `ci.yml` — pengecekan pull request (lint, test, build)
- `cd.yml` — deployment ke staging atau production
- `release.yml` — versioning semantik dan pembuatan changelog
- `security-scan.yml` — audit dependensi dan SAST

Dalam pengaturan monorepo, gunakan filter jalur dengan `on.push.paths` dan `on.pull_request.paths` untuk memicu hanya alur kerja yang relevan dengan direktori yang berubah. Ini mengurangi menit runner yang tidak perlu dan mempercepat umpan balik.

### Desain dan Versioning Alur Kerja yang Dapat Digunakan Kembali

Alur kerja yang dapat digunakan kembali (dipanggil dengan `uses:` di level job) menghilangkan duplikasi di seluruh repositori. Desain setiap alur kerja yang dapat digunakan kembali untuk menerima `inputs` dan `secrets` yang bermakna agar tetap generik. Pin alur kerja yang dipanggil ke tag versi utama:

```yaml
jobs:
  ci:
    uses: org/.github/.github/workflows/ci.yml@v1
    with:
      node-version: "20"
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Strategi penandaan versi:
- `@v1` — ikuti semantik SemVer; perubahan besar meningkatkan versi utama
- `@main` — versi terbaru, tidak direkomendasikan untuk production
- `@<sha>` — tidak dapat diubah, paling aman untuk lingkungan kepatuhan

### Pembuatan Composite Action

Ketika sebuah langkah atau rangkaian langkah berulang di beberapa job, ekstrak ke dalam composite action. Composite action berada di bawah `actions/<name>/action.yml` dan membungkus beberapa langkah `run` atau `uses` ke dalam satu unit yang dapat dipanggil.

```yaml
# actions/setup-node-cache/action.yml
name: "Setup Node with Cache"
description: "Configures Node.js, npm cache, and dependencies"
inputs:
  node-version:
    required: true
    default: "20"
runs:
  using: "composite"
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
    - uses: actions/cache@v4
      with:
        path: ~/.npm
        key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    - run: npm ci
      shell: bash
```

Composite action menjaga file alur kerja tetap DRY dan memudahkan penyebaran perubahan ke semua alur kerja.

### Rotasi Rahasia dan Pengamanan Keamanan

Jangan pernah menulis kredensial atau token API secara hardcode di file alur kerja. Simpan semua nilai sensitif sebagai secret repositori atau organisasi. Gunakan secret level lingkungan untuk kontrol akses yang lebih terperinci:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    env:
      DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

Langkah pengamanan tambahan:

- Aktifkan `OpenID Connect (OIDC)` untuk autentikasi penyedia cloud daripada menggunakan kunci akses berumur panjang.
- Batasi izin token di level alur kerja dengan blok `permissions:`.
- Audit penggunaan Actions dengan `github.token` dan GITHUB_TOKEN — jangan pernah memberikan izin menulis ke alur kerja `pull_request` kecuali diperlukan.
- Gunakan `actions/github-script` dengan token kustom untuk operasi yang memerlukan scope tinggi, daripada menaikkan token default.

### Pola Strategi Deployment

Pilih strategi deployment yang sesuai dengan toleransi risiko dan arsitektur aplikasi Anda:

- **Rolling update**: Deploy versi baru secara bertahap, menggantikan instance lama. Cocok untuk layanan stateless di belakang load balancer.
- **Blue/green**: Pertahankan dua lingkungan identik (biru = saat ini, hijau = baru). Alihkan traffic secara atomik setelah pengujian.
- **Canary release**: Arahkan persentase kecil traffic ke versi baru, pantau kesalahan, lalu tingkatkan secara bertahap.

Contoh pola alur kerja canary:

```yaml
jobs:
  deploy-canary:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo "Deploying 10% canary..."
      - run: echo "Monitoring error rate..."
      - run: echo "Gradually increasing to 100%..."
  promote:
    needs: deploy-canary
    if: success()
    runs-on: ubuntu-latest
    steps:
      - run: echo "Promoting canary to full production..."
```

### Manajemen Artefak dan Promosi

Bangun artefak sekali dan promosikan ke seluruh lingkungan untuk memastikan biner atau image kontainer yang sama mencapai production:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t myapp:${{ github.sha }} .
      - run: docker push myapp:${{ github.sha }}

  deploy-staging:
    needs: build
    steps:
      - run: docker pull myapp:${{ github.sha }}
      - run: docker tag myapp:${{ github.sha }} myapp:staging
```

Gunakan attestation artefak (GitHub Artifact Attestations atau cosign) untuk menandatangani dan memverifikasi provenance build.

### Manajemen dan Skala Self-Hosted Runner

Self-hosted runner menawarkan kontrol lebih besar atas perangkat keras dan perangkat lunak dibandingkan runner yang dihosting GitHub, tetapi memerlukan overhead operasional:

- Gunakan grup runner auto-scaling dengan `actions-runner-controller` di Kubernetes.
- Beri label runner berdasarkan tujuan (`ubuntu-20.04`, `gpu`, `arm64`, `windows`) dan tetapkan job ke label runner tertentu.
- Jalankan runner ephemeral dalam kontainer — setiap job mendapatkan lingkungan baru tanpa kebocoran state.
- Pantau kesehatan runner dengan liveness probes dan konfigurasikan graceful shutdown untuk job yang tertunda.
- Simpan token registrasi runner sebagai secret level organisasi dan rotasi secara teratur.

### Observability dengan Telemetri Alur Kerja

Gunakan instrumentasi bawaan dan kustom untuk mendapatkan visibilitas ke dalam kesehatan pipeline:

- Tambahkan logging level langkah dengan bidang `name:` deskriptif — mereka muncul di UI GitHub Actions sebagai bagian yang dapat dilipat.
- Fail fast dengan mengatur `shell: bash -e` atau `set -e` dalam skrip multi-baris.
- Gunakan action `actions/github-script` untuk memposting status check atau anotasi kustom.
- Ekspor metrik alur kerja ke sistem monitoring eksternal (misalnya, Datadog, Grafana) dengan memanggil API mereka dari langkah post-job.
- Aktifkan debug logging dengan mengatur `ACTIONS_STEP_DEBUG=true` sebagai secret repositori untuk pemecahan masalah.

### Optimasi Biaya untuk Penggunaan Actions

Penggunaan GitHub Actions dikenakan biaya per menit runner, sehingga mengoptimalkan kecepatan pipeline secara langsung mengurangi biaya:

- Cache dependensi dan output build secara agresif menggunakan `actions/cache`.
- Gunakan matrix build secara hemat — lebih suka runner gabungan atau pipeline multi-langkah.
- Tetapkan batas waktu level job (`timeout-minutes: 10`) untuk mencegah job yang tidak terkendali menghabiskan menit.
- Gunakan `if: github.event_name == 'pull_request'` untuk melewati langkah deployment selama pengecekan PR.
- Untuk monorepo, gunakan `paths-filter` atau action `dorny/paths-filter` untuk menjalankan hanya job yang terpengaruh oleh file yang berubah.
- Jadwalkan alur kerja pembersihan untuk lingkungan non-produksi di luar jam kerja.

### Strategi Tata Kelola Perusahaan

Untuk organisasi dengan banyak tim yang menggunakan Actions, tetapkan tata kelola melalui:

- **Template alur kerja wajib**: Terapkan standar CI dasar di semua repositori.
- **Secret level organisasi**: Sentralisasi kunci API, kredensial cloud, dan token registry.
- **Grup runner dengan akses terbatas**: Kontrol repositori mana yang dapat menggunakan self-hosted runner.
- **Audit logging**: Ekspor log audit GitHub ke sistem SIEM untuk event terkait Actions.
- **Gerbang persetujuan**: Minta persetujuan manual untuk deployment produksi melalui aturan perlindungan lingkungan.

## Langkah Implementasi

### Langkah 1: Tentukan Arsitektur Alur Kerja

Mulailah dengan memetakan tahapan pipeline pengiriman Anda dan mengidentifikasi pola yang dapat digunakan kembali.

1. Daftar semua repositori dan kebutuhan CI/CD mereka.
2. Kategorikan alur kerja ke dalam tingkatan: CI (lint, test, build), CD (deploy staging, deploy production), dan pendukung (security scan, dependency update).
3. Identifikasi langkah umum di seluruh repositori — ini menjadi alur kerja yang dapat digunakan kembali atau composite action.
4. Desain struktur direktori alur kerja tingkat atas:

```text
.github/workflows/
  ci.yml
  cd-staging.yml
  cd-production.yml
  security-scan.yml
  dependency-review.yml
```

1. Untuk monorepo, dokumentasikan aturan pemicu jalur per alur kerja sehingga hanya paket yang terpengaruh yang memicu pipeline.

### Langkah 2: Implementasikan Alur Kerja yang Dapat Digunakan Kembali

Buat repositori alur kerja bersama (repositori `.github` di level organisasi) dengan template CI/CD yang terstandarisasi.

1. Buat repositori bersama: `org/.github/.github/workflows/`.
2. Tulis alur kerja CI yang dapat digunakan kembali yang menerima `node-version`, `python-version`, atau input khusus bahasa lainnya.
3. Tulis alur kerja deployment yang dapat digunakan kembali yang menerima nama lingkungan, jalur artefak, dan skrip deployment.
4. Tag rilis pertama sebagai `v1` dengan strategi cabang rilis:

```bash
git tag v1.0.0
git push origin v1.0.0
git tag -f v1 v1.0.0
git push origin v1 --force
```

### Langkah 3: Bangun Composite Action untuk Langkah Berulang

Ekstrak logika multi-langkah yang sering terjadi ke dalam composite action di bawah `actions/`. Kandidat umum:

- **Checkout dengan submodules dan LFS**
- **Setup runtime bahasa dengan caching dependensi**
- **Docker build, tag, dan push dengan attestation provenance**
- **Notifikasi Slack atau Teams tentang status deployment**

Setiap composite action harus memiliki `action.yml` sendiri dengan `name`, `description`, `inputs`, dan bagian `runs`. Validasi secara lokal dengan `action-validator` sebelum melakukan commit.

### Langkah 4: Konfigurasikan Secret Lingkungan dan Aturan Perlindungan

Siapkan lingkungan GitHub untuk mengamankan pipeline deployment.

1. Navigasi ke **Settings > Environments** repositori dan buat lingkungan untuk `staging` dan `production`.
2. Tambahkan secret khusus lingkungan (misalnya, `STAGING_API_KEY`, `PROD_DEPLOY_TOKEN`).
3. Aktifkan **Required reviewers** untuk lingkungan produksi — setiap deployment ke produksi memerlukan setidaknya satu persetujuan.
4. Atur **Wait timer** untuk deployment staging agar pengujian smoke dapat selesai sebelum promosi.

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
```

### Langkah 5: Implementasikan Strategi Deployment

Pilih dan encode strategi deployment yang sesuai dengan profil risiko Anda.

**Untuk deployment blue/green**:
1. Spin up lingkungan baru (hijau) di samping lingkungan saat ini (biru).
2. Jalankan pengujian integrasi terhadap lingkungan hijau.
3. Alihkan load balancer atau DNS ke lingkungan hijau.
4. Pertahankan lingkungan biru untuk rollback selama periode cooldown.

**Untuk deployment canary**:
1. Deploy ke subset node (misalnya, 10% traffic).
2. Pantau tingkat kesalahan dan latensi untuk jendela observasi yang dapat dikonfigurasi.
3. Jika metrik sehat, tingkatkan traffic secara bertahap ke 25%, 50%, lalu 100%.
4. Roll back segera jika ambang kesalahan dilanggar.

### Langkah 6: Tambahkan Observability dan Hook Debugging

Instrumentasi alur kerja sehingga kegagalan dapat segera ditindaklanjuti.

1. Tambahkan nama langkah deskriptif di seluruh alur kerja.
2. Aktifkan anotasi untuk kegagalan tes menggunakan `dorny/test-reporter` atau `actions/github-script`.
3. Tambahkan langkah notifikasi pasca-job yang berjalan saat gagal:

```yaml
- name: Notify on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "CI pipeline failed on ${{ github.repository }} (${{ github.ref_name }})"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

1. Simpan log build dan laporan tes sebagai artefak untuk analisis post-mortem:

```yaml
- name: Upload test reports
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-reports
    path: reports/
```

### Langkah 7: Optimalkan dan Iterasi

Terus tingkatkan kinerja dan keandalan pipeline.

1. Tinjau durasi eksekusi alur kerja secara mingguan — identifikasi outlier dan tambahkan caching atau kurangi dimensi matrix.
2. Pantau waktu tunggu antrian runner — tambahkan self-hosted runner jika kapasitas runner yang dihosting GitHub tidak mencukupi.
3. Perbarui versi alur kerja yang dapat digunakan kembali seiring dirilisnya fitur baru dan patch keamanan.
4. Kumpulkan umpan balik developer tentang hambatan pipeline dan atasi keluhan utama terlebih dahulu.

Setelah setiap iterasi besar, jalankan `act` secara lokal (dengan OS runner dan alat yang sama) untuk mensimulasikan eksekusi alur kerja sebelum melakukan perubahan ke cabang utama.

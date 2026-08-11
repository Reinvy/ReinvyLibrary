---
title: "Panduan Pengujian dan Debugging Workflow GitHub Actions"
description: "Panduan komprehensif untuk menguji workflow GitHub Actions secara lokal, men-debug kegagalan pipeline, menerapkan strategi penanganan error, dan mengoptimalkan siklus umpan balik pengembangan untuk pipeline CI/CD."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Pengujian dan Debugging Workflow GitHub Actions

## Pendahuluan

Workflow GitHub Actions mendefinisikan pipeline CI/CD yang kritis, namun sulit untuk diuji dan di-debug. Berbeda dengan kode aplikasi, workflow berjalan di lingkungan sementara yang tidak dapat dilangkahi dengan debugger tradisional. Satu kesalahan sintaks YAML, secret yang hilang, atau evaluasi ekspresi yang tidak disengaja dapat memblokir pipeline deployment seluruh tim selama berjam-jam — dengan tanda kegagalan pertama muncul hanya setelah komit didorong dan runner mulai menjalankan pekerjaan.

Panduan ini mengatasi kesenjangan tersebut dengan menyajikan pendekatan sistematis untuk menguji dan men-debug workflow GitHub Actions sebelum mereka mencapai runner produksi. Anda akan mempelajari cara menjalankan workflow secara lokal dengan `act`, mengadakan sesi debugging interaktif dengan `tmate`, menerapkan pola penanganan error yang tangguh, memvalidasi sintaks workflow secara otomatis, dan menggunakan pemicu `workflow_dispatch` untuk pengujian iteratif yang aman. Pada akhirnya, Anda akan dapat menangkap sebagian besar cacat workflow dalam hitungan detik, mengubah siklus umpan balik CI dari hambatan menjadi sinyal yang cepat dan andal.

## Praktik Terbaik

### Uji Workflow Secara Lokal dengan act Sebelum Mendorong

Setiap workflow harus diuji secara lokal sebelum menyentuh branch bersama. Alat `nektos/act` menjalankan workflow GitHub Actions di mesin lokal Anda dengan mengunduh dan mengeksekusi container action di lingkungan Docker. Ini menangkap kesalahan sintaks, dependensi yang hilang, dan kesalahan logika dalam hitungan detik, bukan 30–90 detik yang dibutuhkan runner GitHub untuk inisialisasi.

```bash
# Jalankan semua job dalam sebuah workflow
act -W .github/workflows/ci.yml

# Jalankan job tertentu
act -j build

# Jalankan dengan event tertentu (push, pull_request, dll.)
act push -j test

# Daftar semua workflow dan job yang tersedia
act -l
```

**Pertimbangan utama saat menggunakan `act`:**

- `act` tidak dapat menguji fitur khusus GitHub seperti aturan proteksi lingkungan, kebijakan branch deployment, atau peninjau yang diperlukan — ini harus diverifikasi dengan workflow_dispatch yang sebenarnya.
- Secret dibaca dari file `.secrets` secara default. Buat file `.secrets` dengan nilai placeholder untuk pengembangan dan jangan pernah commit ke repositori.
- Job matriks berjalan secara berurutan secara lokal kecuali Anda menggunakan flag `--matrix` untuk membatasi ke kombinasi tertentu.
- Label runner yang di-host sendiri tidak disimulasikan — job dengan `runs-on: self-hosted` dilewati secara default kecuali Anda memetakannya dengan `--defaultbranch`.

### Gunakan Workflow Dispatch untuk Pengujian Iteratif yang Aman

Event `workflow_dispatch` adalah cara teraman untuk menguji workflow di runner GitHub yang sebenarnya tanpa memicu setiap push atau mengotori riwayat komit dengan komit "perbaiki workflow". Desain workflow dengan `workflow_dispatch` sebagai pemicu kelas satu di samping pemicu berbasis event Anda:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: "Lingkungan target"
        required: true
        default: staging
        type: choice
        options:
          - staging
          - production
      debug_enabled:
        description: "Aktifkan debugging tmate"
        required: false
        default: false
        type: boolean
```

**Pola alur kerja pengembangan:**

1. Dorong workflow ke branch fitur (belum ada pemicu CI).
2. Picu workflow secara manual melalui UI GitHub atau `gh workflow run` dengan branch fitur sebagai referensi.
3. Iterasi pada kegagalan dengan menyesuaikan file workflow dan memicu ulang.
4. Hanya buka pull request setelah workflow berhasil di branch fitur.

Pola ini menghilangkan siklus "commit-dorong-tunggu-gagal-ulangi" yang menghabiskan ratusan menit runner per pengembang per minggu.

### Debug Secara Interaktif dengan tmate Actions

Lingkungan runner sementara bersifat buram — ketika sebuah langkah gagal, Anda melihat output log tetapi tidak dapat memeriksa sistem file, mengecek variabel lingkungan, atau menguji perintah secara interaktif. Action `mxschmitt/action-tmate` membuka sesi SSH ke runner di tengah workflow, memberi Anda akses shell penuh ke lingkungan yang berjalan.

```yaml
- name: Setup sesi debug tmate
  if: ${{ inputs.debug_enabled }}
  uses: mxschmitt/action-tmate@v3
  with:
    limit-access-to-actor: true
```

**Kapan menggunakan tmate:**

- **Menyelidiki tes yang flaky**: Jalankan suite tes secara interaktif, periksa keadaan antara, dan identifikasi race condition yang hanya muncul di CI.
- **Memverifikasi konteks build Docker**: SSH ke runner dan periksa sistem file untuk memastikan konteks build Docker berisi semua file yang diharapkan.
- **Menguji alat atau runtime baru**: Instal perangkat lunak secara interaktif, verifikasi berhasil, lalu encode pengaturan yang berfungsi ke dalam definisi workflow.
- **Men-debug permutasi matriks**: Ketika build matriks gagal hanya untuk satu kombinasi, gunakan tmate pada sel matriks tertentu untuk mengisolasi variabel.

**Praktik keamanan untuk sesi tmate:**

- Selalu gunakan `limit-access-to-actor: true` sehingga hanya pengguna yang memicu workflow yang dapat terhubung.
- Kombinasikan dengan `if: ${{ inputs.debug_enabled }}` sehingga sesi debug hanya dimulai ketika diminta secara eksplisit melalui workflow_dispatch.
- Atur batas waktu koneksi: sesi akan otomatis tertutup setelah koneksi SSH terputus.
- Jangan pernah membiarkan tmate aktif di pemicu push atau pull_request — ini menciptakan celah keamanan jika fork yang tidak tepercaya memodifikasi workflow.

### Aktifkan Debug Logging untuk Diagnostik Mendalam

GitHub Actions mendukung dua tingkat debug logging yang mengungkapkan apa yang dilakukan runner secara internal:

- **ACTIONS_STEP_DEBUG**: Ketika diatur ke `true`, runner mencatat setiap perintah langkah, termasuk nilai ekspresi dan variabel lingkungan yang diperluas.
- **ACTIONS_RUNNER_DEBUG**: Ketika diatur ke `true`, runner mencatat informasi terperinci tentang penjadwalan job, alokasi sumber daya, dan siklus hidup runner.

Atur ini sebagai secret repositori atau secret tingkat lingkungan:

```bash
gh secret set ACTIONS_STEP_DEBUG --repo org/repo --body "true"
gh secret set ACTIONS_RUNNER_DEBUG --repo org/repo --body "true"
```

**Apa yang diungkapkan oleh log debug:**

- Evaluasi ekspresi — lihat nilai persis dari `${{ github.ref }}`, `${{ matrix.node-version }}`, dan ekspresi serupa saat runtime.
- Evaluasi kondisi — pahami mengapa kondisi `if:` dievaluasi menjadi `false` ketika Anda mengharapkannya `true`.
- Resolusi action — lacak versi action mana yang diselesaikan dan dari sumber mana.
- Perhitungan kunci cache — verifikasi bahwa kunci cache menyertakan input hash yang benar.
- Inspeksi objek konteks — seluruh konteks `github`, `env`, `job`, `steps`, dan `runner` dicatat.

### Terapkan Penanganan Error dan Retry yang Terstruktur

Workflow yang mengasumsikan setiap langkah berhasil akan membuat tim Anda debugging di tengah malam ketika kegagalan jaringan sementara atau batas laju menyebabkan deployment gagal. Terapkan penanganan error secara eksplisit:

**Retry operasi yang flaky dengan `nick-invision/retry` atau logika retry manual:**

```yaml
- name: Deploy ke produksi
  uses: nick-invision/retry@v2
  with:
    timeout_minutes: 10
    max_attempts: 3
    retry_on: error
    command: ./deploy.sh
```

**Gunakan kondisi kegagalan secara bermakna:**

```yaml
- name: Notifikasi saat gagal
  if: failure()
  run: |
    curl -X POST -H "Content-Type: application/json" \
      -d '{"text":"Deploy gagal untuk ${{ github.ref }}"}' \
      ${{ secrets.SLACK_WEBHOOK_URL }}

- name: Pembersihan saat dibatalkan
  if: cancelled()
  run: ./cleanup.sh

- name: Selalu unggah artefak
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: hasil-tes
    path: test-results/
```

**Tetapkan batas waktu job untuk mencegah workflow yang tidak terkendali:**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - run: npm test
```

Batas waktu yang hilang dapat menghabiskan ratusan menit runner pada suite tes yang menggantung sebelum batas global 6 jam GitHub berlaku.

### Validasi Sintaks Workflow Sebelum Commit

Tangkap kesalahan YAML dan pelanggaran skema sebelum mencapai CI. Integrasikan validasi ke dalam alur kerja pengembangan lokal Anda:

```bash
# Validasi sintaks YAML
yamllint .github/workflows/*.yml

# Validasi terhadap skema JSON GitHub Actions
npm install -g action-validator
action-validator .github/workflows/*.yml

# Gunakan pre-commit hooks untuk validasi otomatis
```

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/sirosen/check-jsonschema
    rev: 0.27.0
    hooks:
      - id: check-github-workflows
```

Siapkan workflow CI yang memvalidasi semua workflow lain di repositori — ini mencegah file workflow yang salah format diperkenalkan oleh kontributor yang mungkin tidak memiliki alat validasi lokal.

### Gunakan Mode Dry-Run dan Analisis What-If

Banyak GitHub Actions dan action pihak ketiga mendukung mode dry-run yang menunjukkan apa yang akan terjadi tanpa membuat perubahan:

```yaml
- name: Dry-run deployment
  run: ./deploy.sh --dry-run
```

Untuk operasi API GitHub dalam workflow, gunakan `GITHUB_TOKEN` dengan izin minimal dan uji dengan perintah `gh` dalam mode `--dry-run`:

```yaml
- name: Uji pembuatan tag
  run: gh release create v1.0.0 --dry-run
  env:
    GH_TOKEN: ${{ github.token }}
```

Action `actions/github-script` juga dapat digunakan untuk mensimulasikan panggilan API dan memeriksa nilai kembalian tanpa efek samping.

## Langkah Implementasi

### Langkah 1: Instal dan Konfigurasi act

Instal `act` di mesin pengembangan Anda dan siapkan lingkungan pengujian lokal:

```bash
# macOS
brew install act

# Linux (curl)
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Verifikasi instalasi
act --version
```

Buat file `.secrets` lokal dengan nilai placeholder pengembangan:

```text
DOCKER_USERNAME=dev-user
DOCKER_PASSWORD=dev-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/test/test/test
NPM_TOKEN=dev-npm-token
```

1. Tambahkan `.secrets` ke `.gitignore` agar tidak pernah tercommit secara tidak sengaja.
2. Pilih gambar container Docker yang sesuai dengan runner GitHub-hosted Anda. Untuk `ubuntu-latest`, gunakan `catthehacker/ubuntu:act-latest`.
3. Konfigurasi `act` untuk menggunakan gambar ukuran sedang secara default:

```bash
echo "-P ubuntu-latest=catthehacker/ubuntu:act-latest" >> ~/.actrc
echo "--container-daemon-socket /var/run/docker.sock" >> ~/.actrc
```

### Langkah 2: Jalankan Workflow Secara Lokal

Uji seluruh workflow atau job individual sebelum mendorong:

```bash
# Jalankan workflow CI lengkap dengan simulasi event push
act push -W .github/workflows/ci.yml

# Jalankan hanya job build dengan event pull_request
act pull_request -j build

# Jalankan dengan kombinasi matriks tertentu
act -j test --matrix node-version:18

# Jalankan ulang workflow yang gagal dengan output yang lebih verbose
act -v push -W .github/workflows/ci.yml
```

**Kegagalan pengujian lokal umum dan perbaikannya:**

| Gejala | Kemungkinan Penyebab | Perbaikan |
|--------|---------------------|-----------|
| `Error: failed to resolve action` | Action menggunakan API khusus GitHub | Mock action dengan skrip lokal atau lewati langkah |
| `Job 'build' is skipped` | Kondisi menggunakan `github.event_name` gagal secara lokal | Paksa event dengan `act push` atau `act pull_request` |
| `Secrets are not available` | File `.secrets` hilang atau memiliki kunci yang salah | Buat `.secrets` dengan nama secret persis yang digunakan di workflow |
| `Cannot find Docker image` | Ketidakcocokan platform di `runs-on` | Petakan `ubuntu-latest` ke `catthehacker/ubuntu:act-latest` di `~/.actrc` |

Setelah pengujian lokal berhasil, workflow aman untuk didorong. Pengujian lokal menangkap sekitar 80% cacat workflow sebelum mencapai CI.

### Langkah 3: Siapkan Debugging Interaktif

Konfigurasi workflow Anda untuk mendukung sesi debugging tmate sesuai permintaan:

1. Tambahkan input `debug_enabled` ke pemicu `workflow_dispatch` Anda:

```yaml
on:
  workflow_dispatch:
    inputs:
      debug_enabled:
        description: "Jalankan build dengan debugging tmate"
        required: false
        default: false
        type: boolean
```

1. Sisipkan langkah tmate pada titik di mana Anda perlu memeriksa lingkungan:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Instal dependensi
        run: npm ci

      - name: Sesi debug
        if: ${{ inputs.debug_enabled }}
        uses: mxschmitt/action-tmate@v3
        with:
          limit-access-to-actor: true
```

1. Picu workflow secara manual dengan `debug_enabled: true` dari UI GitHub atau CLI:

```bash
gh workflow run ci.yml --ref my-feature-branch \
  -f debug_enabled=true
```

1. Ketika workflow mencapai langkah tmate, ia akan berhenti dan mencetak string koneksi SSH ke output log:

```text
🔍 tmate: connection established
🔍 SSH: ssh <random-id>@nyc1.tmate.io
```

Salin perintah SSH, hubungkan dari terminal Anda, dan debug secara interaktif. Sesi akan tertutup secara otomatis ketika Anda keluar dari shell atau ketika batas waktu 15 menit `tmate` berakhir.

### Langkah 4: Terapkan Pola Penanganan Error

Tambahkan penanganan error terstruktur ke setiap workflow produksi:

1. Tambahkan `timeout-minutes` tingkat job ke setiap job dalam workflow:

```yaml
jobs:
  test:
    timeout-minutes: 15
    runs-on: ubuntu-latest
```

1. Bungkus operasi flaky dengan action retry:

```yaml
- name: Publikasikan paket
  uses: nick-invision/retry@v2
  with:
    max_attempts: 3
    retry_wait_seconds: 10
    command: npm publish
```

1. Tambahkan pembersihan pasca-job yang selalu berjalan, bahkan saat gagal:

```yaml
- name: Bersihkan sumber daya sementara
  if: always()
  run: ./cleanup.sh
```

1. Terapkan notifikasi bersyarat yang hanya terpicu saat gagal:

```yaml
- name: Notifikasi tim saat gagal
  if: failure() && github.ref_name == 'main'
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": ":x: Pipeline gagal di ${{ github.repository }} (${{ github.run_number }})"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

1. Tambahkan langkah ringkasan pasca-job yang menggabungkan semua hasil:

```yaml
- name: Hasilkan ringkasan job
  if: always()
  run: |
    echo "## Hasil Workflow" >> $GITHUB_STEP_SUMMARY
    echo "- **Status**: ${{ job.status }}" >> $GITHUB_STEP_SUMMARY
    echo "- **Pemicu**: ${{ github.event_name }}" >> $GITHUB_STEP_SUMMARY
    echo "- **Branch**: ${{ github.ref_name }}" >> $GITHUB_STEP_SUMMARY
```

### Langkah 5: Uji Build Matriks Secara Strategis

Build matriks melipatgandakan permukaan pengujian Anda tetapi juga melipatgandakan kompleksitas debugging. Gunakan strategi ini untuk menjaganya tetap terkelola:

1. **Mulai dengan matriks minimal**: Selama pengembangan workflow awal, gunakan nilai matriks tunggal:

```yaml
strategy:
  matrix:
    node-version: [20]
```

Setelah workflow dasar berhasil, perluas ke matriks penuh:

```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
    os: [ubuntu-latest, windows-latest]
```

1. **Gunakan `act` untuk menguji satu permutasi matriks secara lokal**:

```bash
act -j test --matrix node-version:18 --matrix os:ubuntu-latest
```

1. **Tambahkan strategi `fail-fast` untuk membatalkan semua job ketika satu gagal**:

```yaml
strategy:
  fail-fast: true
  matrix:
    node-version: [18, 20, 22]
```

1. **Sertakan variabel matriks dalam nama langkah untuk log yang mudah dibaca**:

```yaml
- name: Tes di Node ${{ matrix.node-version }} (${{ matrix.os }})
  run: npm test
```

1. **Gunakan `continue-on-error` untuk sel matriks eksperimental**:

```yaml
- name: Uji runtime eksperimental
  continue-on-error: true
  run: npm run test:experimental
```

### Langkah 6: Siapkan Telemetri dan Observabilitas Workflow

Instrumentasi workflow sehingga kegagalan segera dapat ditindaklanjuti. Perlakukan pipeline CI/CD Anda sebagai sistem produksi yang memerlukan pemantauan:

1. **Tambahkan anotasi waktu ke langkah yang berjalan lama**:

```yaml
- name: Jalankan tes integrasi
  run: |
    echo "::group::Tes Integrasi"
    START=$(date +%s)
    npm run test:integration
    END=$(date +%s)
    echo "Durasi: $((END - START)) detik"
    echo "::endgroup::"
```

1. **Ekspor metrik workflow ke sistem pemantauan eksternal**:

```yaml
- name: Laporkan metrik workflow
  if: always()
  run: |
    curl -X POST https://api.datadoghq.com/api/v2/series \
      -H "Content-Type: application/json" \
      -H "DD-API-KEY: ${{ secrets.DD_API_KEY }}" \
      -d '{
        "series": [{
          "metric": "github.actions.duration",
          "type": 0,
          "points": [{"timestamp": '"$(date +%s)"', "value": '"${{ github.run_duration }}"'}],
          "tags": ["repo:'"${{ github.repository }}"'", "workflow:'"${{ github.workflow }}"'"]
        }]
      }'
```

1. **Buat dasbor kesehatan workflow** yang melacak:
   - Tingkat keberhasilan selama 100 run terakhir
   - Durasi rata-rata per job
   - Langkah yang paling sering gagal
   - Waktu antrian runner

1. **Siapkan tinjauan kinerja workflow mingguan**: Pantau riwayat run `workflow_dispatch` untuk mengidentifikasi workflow yang secara konsisten memakan waktu lebih lama dari yang diharapkan, lalu selidiki dan optimalkan secara proaktif.

Setelah menyelesaikan langkah-langkah implementasi ini, workflow GitHub Actions Anda akan memiliki fondasi pengujian dan debugging yang kokoh. Kegagalan pipeline akan tertangkap secara lokal sebelum komit didorong, sesi debug akan dapat diakses sesuai permintaan tanpa mengorbankan keamanan, dan data telemetri akan memungkinkan peningkatan berkelanjutan dari infrastruktur CI/CD Anda.

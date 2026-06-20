---
title: "Silabus DevOps GitHub Actions"
description: "Kurikulum komprehensif 12 minggu yang mencakup fundamental GitHub Actions, otomatisasi workflow, pipeline CI/CD, strategi deployment, keamanan, dan pola otomatisasi tingkat lanjut."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus DevOps GitHub Actions

## Ringkasan

Kurikulum 12 minggu ini menyediakan jalur pembelajaran terstruktur untuk menguasai GitHub Actions, mulai dari fundamental CI/CD hingga pola otomatisasi tingkat lanjut. Setiap minggu dibangun di atas minggu sebelumnya, menggabungkan pembelajaran konseptual dengan praktik langsung. Di akhir kursus ini, Anda akan mampu merancang, mengimplementasikan, dan memelihara pipeline CI/CD yang canggih, workflow yang dapat digunakan kembali, dan otomatisasi workflow yang aman menggunakan GitHub Actions.

Kursus ini dirancang untuk pengembang dan insinyur DevOps dengan pengalaman dasar Git dan GitHub yang ingin mengotomatisasi pipeline pengujian, pembangunan, dan deployment langsung di dalam repositori GitHub mereka.

## Kurikulum

### Minggu 1: Fundamental CI/CD dan Gambaran Umum GitHub Actions

- **Apa itu CI/CD?**
  - Continuous Integration: secara otomatis membangun dan menguji kode pada setiap push
  - Continuous Delivery/Deployment: secara otomatis mendeploy kode yang telah terverifikasi ke lingkungan
  - Alasan bisnis untuk otomatisasi: kecepatan, konsistensi, keandalan
- **Arsitektur GitHub Actions**
  - Komponen inti: Workflows, Events, Jobs, Steps, Runners
  - Runner yang di-host GitHub vs self-hosted
  - Gambaran umum Actions Marketplace
- **Workflow Pertama**
  - Membuat direktori `.github/workflows/`
  - Dasar-dasar sintaks YAML workflow
  - Memicu pada event `push`
  - Menggunakan `actions/checkout` dan langkah `echo` sederhana
  - Melihat hasil eksekusi workflow di antarmuka GitHub

### Minggu 2: Konfigurasi Workflow dan Pemicu Event

- **Pemicu Berbasis Event**
  - Push, pull_request, schedule (cron), workflow_dispatch
  - Jenis event issue dan PR (opened, labeled, synchronize)
  - Event paket registry
- **Filter dan Eksekusi Bersyarat**
  - Filter cabang (`branches`, `branches-ignore`)
  - Filter jalur (`paths`, `paths-ignore`) untuk optimasi monorepo
  - Filter jenis aktivitas untuk event issue/PR
  - Kondisional `if` dengan ekspresi
- **Input Workflow Dispatch**
  - Mendefinisikan parameter pemicu manual
  - Tipe input choice, string, boolean, dan environment

### Minggu 3: Jobs, Runners, dan Eksekusi Paralel

- **Definisi Job dan Dependensi**
  - Mendefinisikan job dengan `jobs.<job_id>`
  - Dependensi job menggunakan `needs`
  - Fungsi pengecekan status job (`success()`, `failure()`, `always()`, `cancelled()`)
- **Pemilihan Runner**
  - Sintaks `runs-on` dan image yang di-host GitHub (ubuntu-latest, windows-latest, macos-latest)
  - Label runner self-hosted
  - Grup runner untuk kontrol organisasi
- **Matrix Builds**
  - `strategy.matrix` untuk pengujian multi-konfigurasi
  - Mengecualikan dan menyertakan kombinasi matrix
  - Generasi matrix dinamis dari output JSON
- **Kontrol Konkurensi**
  - Membatalkan eksekusi yang sedang berjalan pada push baru
  - Grup konkurensi untuk jaminan deployment tingkat lingkungan

### Minggu 4: Langkah, Actions, dan Script Kustom

- **Menggunakan Marketplace Actions**
  - Menemukan dan mengevaluasi actions berdasarkan rating dan status pemeliharaan
  - Menentukan versi action (major tag, full SHA) untuk keamanan rantai pasok
  - Kategori action populer: setup, checkout, cache, upload-artifact, deploy
- **Langkah Shell Kustom**
  - Perintah shell inline vs file action khusus
  - Script shell multi-baris dengan indikator pipe (`|`)
  - Contoh langkah PowerShell dan Bash
- **Input dan Output Action**
  - Meneruskan input ke actions
  - Menangkap dan menggunakan kembali output langkah antar job
  - File environment (`$GITHUB_ENV`, `$GITHUB_OUTPUT`)
- **Composite Actions**
  - Membangun koleksi langkah yang dapat digunakan kembali
  - Metadata dan input/output action komposit

### Minggu 5: Variabel Lingkungan, Secrets, dan Konfigurasi

- **Hierarki Variabel Lingkungan**
  - Blok `env` tingkat workflow, job, dan langkah
  - Variabel lingkungan bawaan (`GITHUB_*`, `RUNNER_*`)
- **Manajemen Secrets**
  - Secret repositori, secret lingkungan, dan secret organisasi
  - Variabel terenkripsi (alternatif yang lebih baru untuk konfigurasi non-sensitif)
  - Pemindaian secret dan pencegahan kebocoran tidak sengaja
- **Aturan Perlindungan Lingkungan**
  - Membuat lingkungan (production, staging, development)
  - Peninjau yang diperlukan untuk gerbang deployment
  - Timer tunggu dan pembatasan cabang deployment
- **OIDC untuk Autentikasi Cloud**
  - Mengonfigurasi OpenID Connect dengan AWS, Azure, atau GCP
  - Mengasumsikan peran IAM tanpa kredensial statis
  - Konfigurasi kebijakan kepercayaan

### Minggu 6: Artifacts, Caching, dan Berbagi Status

- **Artifact Workflow**
  - Mengunggah output build dengan `actions/upload-artifact`
  - Mengunduh artifact di job downstream
  - Kebijakan retensi artifact dan pembersihan
  - Kasus penggunaan: menyimpan binary build untuk deployment nanti
- **Caching Dependensi**
  - `actions/cache` untuk cache manajer paket (npm, pip, maven, go)
  - Desain kunci cache dan restore keys
  - Pengusiran cache dan batas ukuran
- **Berbagi Data Antar Job**
  - Panduan keputusan: artifact vs cache vs output
  - Output JSON dari satu job yang digunakan oleh job lain
  - Pola agregasi job matrix build

### Minggu 7: Pipeline Pengujian dan Kualitas Kode

- **Menjalankan Tes di CI**
  - Eksekusi tes unit (Jest, pytest, JUnit)
  - Setup tes integrasi dengan service containers
  - Pelaporan hasil tes dengan `dorny/test-reporter`
  - Strategi pembagian dan paralelisasi tes
- **Otomatisasi Kualitas Kode**
  - Linting (ESLint, RuboCop, Pylint) sebagai gerbang workflow
  - Pemeriksaan format kode (Prettier, Black, gofmt)
  - Analisis statis dan SAST (CodeQL, SonarCloud)
  - Pelaporan cakupan kode dengan anotasi
- **Pemeriksaan Pull Request**
  - Persyaratan status check untuk cabang yang dilindungi
  - Anotasi PR untuk pelanggaran linting
  - Strategi fail-fast vs continue-on-error
  - Menggabungkan beberapa pemeriksaan CI menjadi gerbang kualitas PR

### Minggu 8: Integrasi Kontainer dan Layanan

- **Docker di GitHub Actions**
  - Menjalankan job di dalam kontainer Docker
  - Membangun dan mendorong image Docker ke registry (GHCR, Docker Hub)
  - Build multi-platform dengan `docker/build-push-action`
- **Service Containers**
  - Mendefinisikan database dan cache sebagai service containers
  - Menghubungkan job containers ke service containers
  - Pemeriksaan kesehatan dan readiness probes
  - Pola service umum: PostgreSQL, Redis, MySQL
- **Autentikasi Registry Kontainer**
  - Login ke GHCR dan Docker Hub
  - Menggunakan `GITHUB_TOKEN` untuk autentikasi GHCR
  - Mendorong image kontainer dengan pelabelan yang tepat

### Minggu 9: Workflow Deployment dan Otomatisasi Rilis

- **Deployment ke Platform Cloud**
  - Mendeploy ke AWS (ECS, Lambda, S3) dengan actions resmi
  - Mendeploy ke Azure (App Service, Functions, AKS)
  - Mendeploy ke Google Cloud (Cloud Run, GKE, App Engine)
- **Pipeline Deployment Berbasis Lingkungan**
  - Promosi melalui dev → staging → production
  - Gerbang persetujuan dengan aturan perlindungan lingkungan
  - Strategi deployment blue-green dan canary
- **Otomatisasi Rilis**
  - Membuat rilis GitHub dengan `softprops/action-gh-release`
  - Menghasilkan catatan rilis dan changelog
  - Otomatisasi semantic versioning
  - Melampirkan artifact build ke rilis
- **Strategi Rollback**
  - Rollback otomatis pada kegagalan deployment
  - Menggunakan artifact dari eksekusi workflow sebelumnya untuk pemulihan

### Minggu 10: Workflow yang Dapat Digunakan Kembali dan Strategi Monorepo

- **Reusable Workflows**
  - Mendefinisikan caller workflow dengan `workflow_call`
  - Input dan secrets untuk reusable workflows
  - Versioning reusable workflows dengan referensi cabang/tag
  - Keterbatasan dan praktik terbaik
- **Strategi Workflow Monorepo**
  - Filter jalur untuk eksekusi job yang ditargetkan
  - Generasi matrix dinamis dari file yang berubah
  - Pola pustaka workflow bersama
- **Template Workflow**
  - Membuat template workflow tingkat organisasi
  - Starter workflows untuk tipe proyek umum
  - Variabel template dan kustomisasi

### Minggu 11: Keamanan, Kepatuhan, dan Rantai Pasok

- **Pengamanan (Hardening) Keamanan**
  - Prinsip hak akses minimal untuk izin `GITHUB_TOKEN`
  - Audit action pihak ketiga dan pembatasan versi
  - Mencegah serangan `script injection`
  - Menggunakan `actions/security` dan pemindaian CodeQL
- **Keamanan Rantai Pasok**
  - Pembaruan versi Dependabot dan peringatan keamanan
  - Dependency review pada pull request
  - Generasi SBOM dan artifact attestation
  - Kepatuhan kerangka SLSA
- **Kepatuhan dan Audit**
  - Event log audit untuk aktivitas workflow
  - Persetujuan workflow wajib untuk organisasi
  - Kontrol akses grup runner
  - Penegakan aturan perlindungan cabang

### Minggu 12: Monitoring, Debugging, Optimasi, dan Proyek Akhir

- **Debugging Workflow**
  - Mengaktifkan logging debug (`ACTIONS_STEP_DEBUG`, `ACTIONS_RUNNER_DEBUG`)
  - Menggunakan `nektos/act` untuk pengujian workflow lokal
  - Visualisasi workflow dan analisis linimasa
- **Monitoring dan Metrik**
  - Analitik penagihan dan penggunaan GitHub Actions
  - Riwayat eksekusi workflow dan tren kegagalan
  - Metrik kustom dengan telemetri workflow
  - Webhook untuk integrasi monitoring eksternal
- **Optimasi Kinerja**
  - Mengurangi waktu eksekusi workflow melalui paralelisme
  - Strategi caching untuk dependensi yang sering digunakan
  - Pool runner self-hosted untuk eksekusi yang lebih cepat
- **Proyek Akhir — Pipeline CI/CD Lengkap**
  - Merancang dan mengimplementasikan pipeline CI/CD lengkap untuk aplikasi multi-layanan
  - Mencakup: linting, pengujian, pembangunan, kontainerisasi, deployment staging, dan rilis production
  - Mengimplementasikan gerbang persetujuan, caching, berbagi artifact, dan kemampuan rollback
  - Mendokumentasikan arsitektur workflow dan strategi deployment

## Proyek Akhir

Rancang dan implementasikan pipeline CI/CD tingkat produksi untuk aplikasi web multi-layanan menggunakan GitHub Actions. Proyek harus mencakup:

- Monorepo yang berisi setidaknya dua layanan (misalnya, API Node.js dan frontend React) dengan pustaka bersama
- Workflow CI yang menjalankan linting, tes unit, tes integrasi (dengan service containers), dan membangun image Docker untuk kedua layanan
- Pipeline deployment yang mempromosikan build melalui lingkungan development, staging, dan production dengan gerbang persetujuan
- Semantic versioning otomatis dan pembuatan rilis GitHub
- Workflow yang dapat digunakan kembali untuk logika CI bersama antar layanan
- Optimasi caching untuk meminimalkan waktu eksekusi workflow
- Pengarsipan artifact untuk output build
- Strategi rollback menggunakan artifact yang telah dideploy sebelumnya

Hasil akhir mencakup file YAML workflow lengkap, README yang mendokumentasikan arsitektur pipeline, dan demonstrasi deployment end-to-end yang berhasil.

## Kriteria Penilaian

- **Tugas Mingguan (40%)**: Latihan praktis yang dikirimkan sebagai file workflow GitHub, dievaluasi berdasarkan kebenaran dan kepatuhan terhadap praktik terbaik.
- **Proyek Tengah Semester (20%)**: Pipeline CI untuk proyek open-source yang sudah ada yang mencakup eksekusi multi-job, pelaporan tes, dan pelestarian artifact. Dinilai berdasarkan kelengkapan, pengamanan keamanan, dan kualitas dokumentasi.
- **Proyek Akhir (40%)**: Pipeline CI/CD lengkap dengan gerbang deployment, workflow yang dapat digunakan kembali, dan kemampuan rollback. Dievaluasi berdasarkan desain arsitektur, praktik keamanan, efisiensi caching, dan penerapan di dunia nyata.

## Referensi

- [Dokumentasi GitHub Actions](https://docs.github.com/en/actions)
- [Referensi Sintaks Workflow](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [Security Hardening untuk GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Reusable Workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [OIDC di GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [GitHub Changelog — Pembaruan Actions](https://github.blog/changelog/label/actions/)
- [Awesome Actions — Daftar Kurasi Komunitas](https://github.com/sdras/awesome-actions)

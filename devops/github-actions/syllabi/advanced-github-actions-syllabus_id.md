---
title: "Silabus Lanjutan Otomasi Enterprise GitHub Actions"
description: "Kurikulum lanjutan 12 minggu yang komprehensif untuk insinyur DevOps dan tim platform yang mencakup rekayasa action kustom dengan Actions SDK, pengelolaan armada self-hosted runner dan autoscaling, arsitektur workflow dinamis pada skala monorepo, keamanan rantai pasok dengan artifact attestations, federasi OIDC, rekayasa biaya dan kinerja, tata kelola enterprise, serta pola progressive delivery."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Lanjutan Otomasi Enterprise GitHub Actions

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk insinyur DevOps, insinyur platform, dan arsitek CI/CD yang sudah membangun workflow dengan GitHub Actions dan kini perlu mengoperasikannya sebagai platform otomasi yang kritis. Kurikulum ini sengaja melampaui keluasan kursus fundamental untuk fokus pada kedalaman: menulis action kustom kelas produksi dengan Actions SDK resmi, merekayasa armada self-hosted runner yang dapat melakukan autoscaling, menyusun workflow dinamis untuk monorepo besar, memperkuat rantai pasok perangkat lunak dengan artifact attestations, menghubungkan identitas cloud melalui OIDC, mengendalikan pengeluaran Actions, serta menanamkan tata kelola dan kepatuhan ke dalam setiap workflow.

Setiap minggu menggabungkan fondasi teknis yang mendalam dengan lab praktik. Peserta menulis action kustom sungguhan dengan TypeScript dan Docker, menerapkan armada ephemeral runner di Kubernetes, membuat dan memverifikasi attestation Sigstore, merancang pipeline matriks dinamis, dan membangun kumpulan kebijakan enterprise. Kursus berpuncak pada proyek akhir di mana peserta membangun platform otomasi enterprise yang lengkap: pustaka workflow yang dapat digunakan ulang dan action kustom, armada runner dengan autoscaling, deployment cloud berbasis OIDC, attestation rantai pasok, serta pemantauan yang sadar biaya.

Di akhir kursus ini, peserta akan mampu merancang dan mengoperasikan GitHub Actions sebagai platform internal, menulis dan menerbitkan action kustom yang memenuhi standar kualitas enterprise, menjalankan self-hosted runner yang aman dalam skala besar, menegakkan persyaratan rantai pasok dan kepatuhan secara otomatis, serta mengirimkan perangkat lunak dengan strategi deployment progresif — semuanya sambil menjaga pipeline tetap cepat dan efisien dari segi biaya.

## Kurikulum

### Minggu 1: Arsitektur Actions Enterprise dan Rekayasa Platform

- **Actions sebagai platform internal**
  - Pola golden workflow: build sekali, promosikan ke banyak lingkungan
  - Template workflow dan starter workflow tingkat organisasi
  - Model operasional tim platform: mengelola `.github` dalam skala besar
- **Tata letak repositori untuk otomasi enterprise**
  - `.github/workflows/`, `.github/actions/`, dan repositori workflow yang dapat digunakan ulang
  - CODEOWNERS untuk perubahan workflow dan peninjauan wajib atas kode pipeline
  - Memisahkan kode pipeline dari kode aplikasi
- **Strategi versi dan rilis untuk workflow**
  - Semantic versioning untuk workflow dan action yang dapat digunakan ulang
  - Referensi cabang/tag vs pinning commit SHA
  - Meluncurkan perubahan yang bersifat breaking tanpa merusak konsumen
- **Jaringan dan topologi**
  - Keputusan penempatan GitHub-hosted vs self-hosted
  - Kontrol egress jaringan, konfigurasi proxy, dan allowlisting IP
- **Lab Praktik**: Rancang pustaka golden workflow untuk organisasi tiga tim dan tegakkan peninjauan CODEOWNERS pada perubahan `.github`

### Minggu 2: Rekayasa Action Kustom — Internal SDK JavaScript

- **Actions Toolkit resmi**
  - `@actions/core`: inputs, outputs, `setFailed`, `setOutput`, groups, save/restore state
  - Anotasi: `notice`, `warning`, `error` dengan metadata file/baris/kolom
  - `@actions/github`: objek `context`, klien Octokit, panggilan REST dan GraphQL
- **Paket pendukung secara mendalam**
  - `@actions/exec` untuk eksekusi proses dan penangkapan output
  - `@actions/io`, `@actions/tool-cache`, `@actions/glob`
  - `@actions/cache` dan `@actions/artifact` untuk berbagi state
- **Struktur proyek action**
  - Pengaturan TypeScript, `tsconfig` untuk Node 20, pengetikan ketat
  - Pembundelan dengan `@vercel/ncc` dan komit `dist/`
  - Metadata `action.yml`: inputs, outputs, dan konfigurasi `runs`
- **Penanganan error dan observabilitas**
  - Log terstruktur, masking secret, dan mode kegagalan yang aman
- **Lab Praktik**: Bangun action TypeScript yang mem-parsing changelog, menghitung versi semantik berikutnya, dan mengeluarkannya sebagai output dengan anotasi yang tepat

### Minggu 3: Docker Container Actions dan Advanced Composite Actions

- **Docker container actions**
  - Metadata `action.yml` untuk container action: image, args, entrypoint
  - Praktik terbaik Dockerfile: multi-stage build, image dasar ramping, pengguna non-root
  - Mengoper input melalui environment variable dan konvensi `INPUT_*`
- **Advanced composite actions**
  - Menyarangkan composite action dan memanggil action lain di dalamnya
  - Langkah bersyarat dan ekspresi `if` di dalam composite
  - Menyebarkan output melintasi batas composite
  - Menggunakan composite action untuk menstandarkan perkakas internal
- **Men-debug runtime action**
  - Memeriksa log kontainer, `ACTIONS_STEP_DEBUG`, dan reproduksi lokal
- **Lab Praktik**: Kemas perkakas command-line sebagai Docker action dengan multi-stage build dan ekspos sebagai composite action yang dapat digunakan ulang oleh seluruh organisasi

### Minggu 4: Pengujian dan CI/CD untuk Action Kustom

- **Pengujian unit action**
  - Pengujian dengan Jest atau Vitest dan mocking `@actions/core`
  - Menguji validasi input, perhitungan output, dan jalur kegagalan
- **Pengujian integrasi**
  - Menjalankan action secara lokal dengan `nektos/act`
  - Menguji terhadap repositori nyata dengan fixture workflow
- **Pola self-testing**
  - Workflow yang membangun dan menguji action pada setiap push
  - Matriks pengujian di berbagai versi Node dan image runner
- **Validasi statis**
  - `actionlint` untuk validasi metadata workflow dan action
  - Pemeriksaan skema untuk `action.yml` di CI
- **Penerbitan dan otomasi rilis**
  - Persyaratan penerbitan Marketplace, verified creator, dan otomasi rilis untuk tag versi action
- **Lab Praktik**: Tambahkan workflow self-test ke repositori action kustom yang menjalankan unit test, membangun dengan `ncc`, memvalidasi `action.yml`, dan menerbitkan rilis ber-tag

### Minggu 5: Rekayasa Self-Hosted Runner dan Pengelolaan Armada

- **Instalasi runner dan siklus hidupnya**
  - Memasang dan mengonfigurasi layanan runner, perilaku auto-update
  - Runner groups, label, dan runner tingkat organisasi/enterprise
- **Runner ephemeral dan autoscaling**
  - Siklus hidup runner ephemeral: satu job per runner, pembersihan otomatis
  - Autoscaling di Kubernetes dengan actions-runner-controller (ARC)
  - Ekonomi scale-to-zero dan penentuan ukuran warm pool
- **Keamanan runner**
  - Mengisolasi self-hosted runner dari kode yang tidak tepercaya (fork PR, `pull_request_target`)
  - Segmentasi jaringan, injeksi virtual network, dan penyaringan egress
  - Enkripsi disk dan immutability image
- **Observabilitas armada**
  - Pemeriksaan kesehatan, metrik runner, strategi update dan drain
- **Lab Praktik**: Terapkan armada ephemeral runner dengan ARC pada kluster Kubernetes lokal dan konfigurasikan kebijakan scale-to-zero dengan warm pool dua runner

### Minggu 6: Arsitektur Workflow Lanjutan — Matriks Dinamis dan Monorepo Skala Besar

- **Generasi matriks dinamis**
  - Memproduksi JSON matriks dari output job dan `fromJSON`
  - Include/exclude matriks dan kontrol fail-fast
- **Deteksi perubahan dalam skala besar**
  - Penyaringan jalur dengan `dorny/paths-filter` dan `tj-actions/changed-files`
  - Membangun hanya yang berubah di monorepo besar
- **Orkestrasi job dependen**
  - Rantai artifact, pola build-graph, dan fan-in/fan-out
  - Mengagregasi hasil job paralel menjadi satu gerbang
- **Integrasi perkakas monorepo**
  - Orkestrasi tugas dengan Turborepo atau Nx di dalam Actions
  - Cache bersama antar paket dan remote caching
- **Komposisi workflow yang dapat digunakan ulang**
  - Workflow yang dapat digunakan ulang bersarang, pengoperan secret, dan keterbatasan `workflow_call`
  - Required workflows yang ditegakkan di tingkat enterprise
- **Lab Praktik**: Bangun pipeline matriks dinamis untuk monorepo 20 paket yang menguji hanya paket yang terpengaruh dan menggabungkan hasil ke satu gerbang merge

### Minggu 7: Keamanan Rantai Pasok dan Artifact Attestations

- **Artifact attestations**
  - `actions/attest-build-provenance` dan penandatanganan berbasis Sigstore
  - Memverifikasi attestation dengan `gh attestation verify` dan cosign
  - Tingkat provenance SLSA dan jaminan yang diberikan setiap tingkat
- **Generasi SBOM**
  - Membuat SBOM dengan Anchore Syft dan `anchore/sbom-action`
  - Melampirkan SBOM ke rilis dan attestation
- **Tata kelola action pihak ketiga**
  - Pinning action ke commit SHA penuh dalam skala besar dengan Renovate atau Dependabot
  - Verified creator, peninjauan kode, dan allowlisting action pihak ketiga
  - Mendeteksi typosquatting dan action yang disusupi
- **Keamanan dependensi**
  - Dependabot untuk ekosistem Actions, dependency review pada PR
- **Lab Praktik**: Tambahkan attestation provenance build ke pipeline rilis, buat SBOM, dan verifikasi keduanya dengan `gh attestation verify` sebelum mempromosikan artifact

### Minggu 8: OIDC dan Federasi Identitas Cloud Secara Mendalam

- **Cara kerja OIDC di GitHub Actions**
  - Endpoint token, klaim JWT, dan kedaluwarsa token
  - Menyesuaikan subject claims dengan `permissions.id-token` dan kondisi
- **Federasi AWS**
  - `AssumeRoleWithWebIdentity`, kebijakan trust peran dengan kondisi `sub` dan `aud`
  - Membatasi peran ke repositori, environment, dan ref
- **Federasi Azure dan GCP**
  - Azure workload identity federation untuk App Service, AKS, dan Functions
  - GCP workload identity pools dan providers
- **Pemecahan masalah dan pengerasan**
  - Mode kegagalan OIDC umum dan kesalahan konfigurasi trust policy
  - Menghilangkan kredensial cloud statis sepenuhnya
- **Lab Praktik**: Konfigurasikan OIDC untuk AWS dan Azure sehingga job deployment mengasumsikan peran terbatas-environment tanpa menyimpan access key apa pun

### Minggu 9: Rekayasa Kinerja, Cache, dan Biaya

- **Model penagihan Actions**
  - Menit repositori privat, paralelisme, dan pengali OS
  - Membaca laporan penggunaan dan mengatribusikan biaya ke tim
- **Optimasi runtime workflow**
  - Paralelisme dan dekomposisi job, strategi `fail-fast`
  - Sharding dan pemecahan pengujian untuk suite besar
  - Menghindari run redundan dengan filter jalur dan cabang
- **Rekayasa cache**
  - Desain cache key, restore key, dan pembatasan cache ke cabang
  - Eviction cache, batas ukuran, dan pencegahan cache poisoning
  - Remote caching untuk perkakas build monorepo
- **Ekonomi armada runner**
  - Total biaya kepemilikan: GitHub-hosted vs self-hosted vs hibrida
  - Menentukan ukuran runner yang tepat dan mengurangi penggunaan macOS/Windows
- **Lab Praktik**: Profil pipeline yang lambat, terapkan caching dan sharding pengujian, dan buat laporan biaya yang mengatribusikan menit ke setiap tim

### Minggu 10: Tata Kelola, Kepatuhan, dan Kebijakan Enterprise

- **Penegakan kebijakan enterprise**
  - Kebijakan persetujuan workflow dan required workflows
  - Izin runner groups dan kontrol akses
  - Membatasi penggunaan Actions hanya pada action yang disetujui
- **Perlindungan repositori**
  - Branch protection dengan required status checks dan rulesets
  - Environment protection rules untuk gerbang deployment
- **Audit dan observabilitas**
  - Peristiwa audit log untuk aktivitas workflow
  - Actions management API untuk inventaris, penggunaan, dan secret
  - Bukti kepatuhan untuk SOC 2 dan ISO 27001
- **Keamanan open-source dan fork**
  - Izin untuk fork, risiko `pull_request_target`, dan pola checkout yang aman
- **Lab Praktik**: Tegakkan kebijakan enterprise yang mewajibkan persetujuan workflow dan membatasi action ke allowlist, lalu verifikasi entri audit log menangkap penegakan tersebut

### Minggu 11: Progressive Delivery dan Pola Deployment GitOps

- **Progressive delivery dengan Actions**
  - Rilis canary dengan promosi berbasis metrik (Argo Rollouts, Flagger)
  - Feature flags dan pergeseran trafik bertahap
- **Workflow GitOps**
  - Melakukan commit manifest deployment ke repositori GitOps
  - Memicu sinkronisasi Argo CD atau Flux dari Actions
  - Deteksi drift dan rekonsiliasi
- **Deployment multi-environment dan multi-region**
  - Promosi melalui dev → staging → production dengan gerbang persetujuan
  - Peluncuran multi-region dan pergeseran trafik
- **Rollback otomatis**
  - Rollback berbasis health-check dan deployment ulang artifact
- **Lab Praktik**: Implementasikan pipeline deployment canary yang menggeser 10% trafik, memeriksa ambang metrik, lalu mempromosikan ke 100% atau melakukan rollback otomatis

### Minggu 12: Capstone — Platform Otomasi Enterprise

- **Fase desain**
  - Kebutuhan: golden workflow, action kustom, armada runner, keamanan, dan target biaya
  - Dokumen arsitektur dan diagram topologi workflow
- **Fase implementasi**
  - Pustaka workflow yang dapat digunakan ulang yang dipakai banyak layanan
  - Setidaknya satu action JavaScript kustom dan satu Docker action yang diterbitkan secara internal
  - Armada ephemeral runner dengan autoscaling
  - Deployment berbasis OIDC ke lingkungan cloud
  - Attestation rantai pasok dan SBOM pada setiap rilis
  - Pemantauan biaya dan kinerja dengan anggaran yang terdokumentasi
- **Fase pengerasan**
  - Kebijakan enterprise, persetujuan workflow, dan verifikasi audit
- **Fase presentasi**
  - Demo promosi penuh dari commit ke production dengan verifikasi attestation dan kemampuan rollback

## Proyek Akhir

Rancang dan implementasikan platform otomasi enterprise kelas produksi di GitHub Actions. Platform tersebut harus mencakup:

- Pustaka workflow yang dapat digunakan ulang (CI, CD, pemindaian keamanan, rilis) yang dipakai oleh setidaknya tiga layanan simulasi dengan tumpukan teknologi berbeda
- Dua action kustom: satu action TypeScript (misalnya perhitungan versi semantik atau deteksi drift dependensi) dan satu Docker container action (misalnya linter kustom atau perkakas deployment), keduanya dengan workflow self-test dan rilis otomatis
- Armada self-hosted runner menggunakan runner ephemeral dengan autoscaling dan scale-to-zero, plus runner groups yang memisahkan workload tepercaya dan tidak tepercaya
- Deployment cloud berbasis OIDC dengan peran terbatas-environment dan tanpa kredensial statis
- Attestation provenance build dan generasi SBOM yang diverifikasi sebelum promosi artifact
- Pipeline monorepo matriks dinamis yang membangun dan menguji hanya paket yang terpengaruh
- Progressive delivery untuk satu layanan: canary rollout dengan promosi berbasis metrik dan rollback otomatis
- Pemantauan biaya dengan anggaran menit bulanan yang terdokumentasi dan atribusi per tim

Deliverable akhir mencakup seluruh file YAML workflow, kode sumber action beserta pengujiannya, manifest deployment runner, dokumen arsitektur, dan demonstrasi terekam tentang promosi lengkap dari commit ke production termasuk verifikasi attestation dan latihan rollback.

## Kriteria Penilaian

- **Lab Mingguan (40%)**: Latihan praktik yang dikumpulkan sebagai file workflow, kode sumber action, atau manifest deployment, dievaluasi berdasarkan kebenaran, postur keamanan, dan kepatuhan terhadap pola yang diajarkan pada minggu tersebut.
- **Proyek Tengah Semester (20%)**: Action kustom dengan unit test, pengujian integrasi, workflow self-test, dan rilis ber-tag yang diterbitkan. Dinilai berdasarkan kebenaran penggunaan SDK, desain input/output, penanganan error, dan kualitas dokumentasi.
- **Proyek Akhir (40%)**: Capstone platform otomasi enterprise. Dievaluasi berdasarkan kualitas arsitektur, desain workflow yang dapat digunakan ulang, keamanan armada runner, kebenaran attestation rantai pasok, konfigurasi OIDC, optimasi biaya, implementasi progressive delivery, dan kelengkapan demonstrasi.

## Referensi

- [Dokumentasi GitHub Actions](https://docs.github.com/en/actions)
- [Actions Toolkit — @actions/core dan lainnya](https://github.com/actions/toolkit)
- [Sintaks Metadata untuk GitHub Actions](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions)
- [Pengerasan Keamanan untuk GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Tentang Pengerasan Keamanan dengan OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Menggunakan Artifact Attestations](https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds)
- [actions-runner-controller (ARC)](https://github.com/actions/actions-runner-controller)
- [actionlint — Pemeriksa Statis untuk File Workflow](https://github.com/rhysd/actionlint)
- [nektos/act — Menjalankan GitHub Actions Secara Lokal](https://github.com/nektos/act)
- [Sigstore dan cosign](https://www.sigstore.dev/)
- [Dokumentasi Penagihan GitHub Actions](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions)
- [Changelog GitHub — Pembaruan Actions](https://github.blog/changelog/label/actions/)

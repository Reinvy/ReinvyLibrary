---
title: "Silabus Platform Engineering GitHub Actions"
description: "Kursus enam modul yang membawa engineer berpengalaman dari menulis workflow menjadi mengoperasikan GitHub Actions sebagai platform internal, mencakup keamanan, reuse, runner, observabilitas, dan tata kelola."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Platform Engineering GitHub Actions

## Ringkasan

Sebagian besar tim mempelajari GitHub Actions dengan menyalin satu workflow lalu memperbaikinya sampai build hijau. Cara itu bertahan sampai jumlah repositori bertambah dan CI berubah menjadi infrastruktur bersama: puluhan workflow dengan default yang berbeda-beda, secret tersebar di banyak repositori, runner yang tidak dimiliki siapa pun, dan gangguan yang butuh satu sore untuk didiagnosis karena tidak ada visibilitas atas apa yang berjalan dan mengapa.

Silabus ini ditujukan bagi engineer yang sudah menulis workflow dan kini perlu menjalankan Actions sebagai platform bagi tim lain. Materi disusun dalam enam modul yang mengikuti siklus hidup nyata pekerjaan platform: rancang primitifnya, amankan, kemas untuk dipakai ulang, miliki komputasinya, buat sistemnya teramati, lalu tata kelola agar tidak kembali kacau.

Setiap modul memasangkan satu kuliah konseptual dengan satu lab, dan setiap lab menghasilkan artefak yang menjadi bahan proyek akhir. Kursus ini sengaja tidak terikat alat tertentu bila memungkinkan: Terraform, OpenTelemetry, dan policy bergaya OPA semuanya muncul, tetapi selalu sebagai implementasi yang bisa ditukar dari sebuah gagasan, bukan sebagai produk untuk dihafal.

Durasi sekitar enam minggu pada delapan sampai sepuluh jam per minggu, atau tiga minggu intensif penuh waktu. Peserta diharapkan sudah memahami sintaks YAML, branching Git, dan setidaknya satu sistem CI.

## Kurikulum

### Modul 1: Desain Workflow sebagai Antarmuka

- **Workflow sebagai kontrak**
  - Trigger, input, dan output sebagai API publik bagi tim lain
  - Payload event, konteks `github`, dan perbedaan `pull_request` dengan `pull_request_target`
  - Idempotensi dan workflow yang aman dijalankan ulang
- **Topologi job**
  - `needs`, `if`, dan graf dependensi yang benar-benar dirender UI
  - Strategi fail-fast dibanding mengumpulkan semua kegagalan
  - Fan-out/fan-in untuk monorepo dan suite test yang di-shard
- **Kebersihan konfigurasi**
  - Ekspresi, cakupan `env`, dan menghindari perintah hasil interpolasi string
  - `defaults.run.shell` dan disiplin `set -euo pipefail`
- **Lab**: Ubah satu workflow gemuk menjadi graf empat job dengan artefak eksplisit antar-tahap, lalu buktikan workflow dapat dijalankan ulang dengan bersih dari UI.

### Modul 2: Keamanan dan Rantai Pasok

- **Model izin**
  - `permissions:` di tingkat workflow dan job, token default, dan alasan `write-all` adalah cacat
  - Pull request dari fork, isolasi secret, dan jebakan `pull_request_target`
- **Penanganan kredensial**
  - Federasi OIDC ke penyedia cloud menggantikan key berumur panjang
  - Aturan proteksi environment, reviewer wajib, dan gerbang deployment
  - Cakupan `GITHUB_TOKEN` dibanding PAT fine-grained dan GitHub Apps
- **Risiko action pihak ketiga**
  - Pin ke SHA commit, verifikasi penerbit, dan membaca `action.yml` sebuah action
  - Penanganan input tak tepercaya: injeksi skrip lewat judul issue dan nama branch
- **Lab**: Migrasikan key AWS statis ke OIDC, kecilkan cakupan token menjadi read-only, dan tambahkan workflow yang gagal bila ada action pihak ketiga yang di-pin ke tag.

### Modul 3: Komponen yang Dapat Digunakan Ulang

- **Tangga reuse**
  - Composite action, reusable workflow, dan starter workflow: kapan masing-masing menjadi unit yang tepat
  - Input, output, dan pewarisan secret pada `workflow_call`
  - Versioning template internal dengan tag dan changelog
- **Distribusi**
  - Repositori publik dibanding internal untuk workflow bersama
  - `uses: org/repo/.github/workflows/x.yml@v1` dan biaya referensi mengambang
  - Reusable workflow berbasis matrix dan penempatan `strategy` di pemanggil
- **Strategi migrasi**
  - Pola strangler: bungkus workflow lama, lalu ganti isinya
  - Jendela kompatibilitas dan pemberitahuan deprecation
- **Lab**: Ekstrak workflow Modul 1 menjadi reusable workflow dengan input bertipe, beri tag `v1`, dan panggil dari dua repositori.

### Modul 4: Runner dan Komputasi

- **Ekonomi runner hosted**
  - Pengali menit, runner berukuran besar, dan timeout per job
  - Penyimpanan cache dan artefak sebagai pos anggaran terpisah
- **Operasi self-hosted**
  - Runner group, label, dan autoscaling dengan Actions Runner Controller
  - Runner efemeral, siklus hidup image, dan irama patching
  - Topologi jaringan: jaringan privat, proxy, dan kontrol egress
- **Perencanaan kapasitas**
  - Waktu antre sebagai metrik latensi yang sebenarnya
  - Perhitungan titik impas terhadap menit hosted
- **Lab**: Deploy set runner autoscaling berbasis ARC di Kubernetes, arahkan job berlabel ke sana, dan ukur waktu antre pada lonjakan sintetis.

### Modul 5: Observabilitas

- **Apa yang diberikan dan tidak diberikan Actions**
  - API run dan job, `GITHUB_STEP_SUMMARY`, anotasi, dan check run
  - Batas retensi log dan alasan mengirim log ke tempat lain
- **Metrik yang penting**
  - Lead time sampai hijau, tingkat kegagalan per job, tingkat test flaky, waktu antre, biaya per merge
  - Ekspor data run ke Prometheus, Grafana, atau data warehouse
- **Debugging dalam skala besar**
  - Log debug langkah, `ACTIONS_STEP_DEBUG`, dan menjalankan ulang dengan SSH pada runner self-hosted
  - Menghubungkan run workflow dengan deploy dan insiden
- **Lab**: Bangun dashboard dari API runs yang melaporkan durasi p50/p95, tingkat kegagalan, dan estimasi menit per pull request yang di-merge.

### Modul 6: Tata Kelola dan Operasi Platform

- **Policy as code**
  - Required workflow tingkat organisasi dan daftar action yang diizinkan
  - Pemeriksaan policy di CI (OPA/Conftest) plus deteksi drift terjadwal
  - Batas pengeluaran, peringatan anggaran, dan deteksi penggunaan anomali
- **Model kepemilikan**
  - Tim platform sebagai pemelihara, tim produk sebagai konsumen
  - Rotasi dukungan, runbook, dan jalur eskalasi
  - Proses RFC untuk perubahan template
- **Manajemen perubahan**
  - Gelombang peluncuran, repositori kanari, dan rollback versi template
  - Mengukur adopsi dan menonaktifkan ekor panjang
- **Lab**: Tulis policy yang menolak workflow tanpa `timeout-minutes` dan tanpa action ter-pin, jalankan pada sepuluh repositori, dan hasilkan laporan remediasi.

## Proyek Akhir

Bangun `platform-ci`, sebuah platform CI internal minimal di atas GitHub Actions, di organisasi Anda sendiri atau organisasi sandbox.

Luaran yang harus diserahkan:

- Satu set reusable workflow (lint, test, build, deploy) dengan versi bertag dan input terdokumentasi.
- Autentikasi cloud berbasis OIDC yang menggantikan seluruh kredensial statis dalam cakupan.
- Satu runner group self-hosted autoscaling untuk beban kerja yang benar-benar membutuhkannya, beserta perhitungan titik impas yang menjadi dasarnya.
- Pipeline metrik yang mengekspor data run ke dashboard dengan lima metrik dari Modul 5.
- Gerbang policy yang ditegakkan di seluruh organisasi, dengan laporan kepatuhan minimal sepuluh repositori.
- Satu halaman model operasi: kepemilikan, ekspektasi on-call, dan jalur deprecation untuk workflow lama.

Proyek dinilai dari apakah tim lain dapat mengadopsi platform ini tanpa perlu bertanya kepada Anda.

## Kriteria Penilaian

| Komponen | Bobot | Yang dievaluasi |
| --- | --- | --- |
| Lab modul (6) | 30% | Artefak yang berjalan, bukan tangkapan layar; setiap lab harus jalan dari checkout bersih |
| Tinjauan keamanan | 15% | Cakupan token, adopsi OIDC, pinning action, penanganan injeksi |
| Dashboard observabilitas | 10% | Definisi metrik dapat dipertanggungjawabkan dan query dapat direproduksi |
| Proyek akhir | 35% | Kelengkapan, kualitas dokumentasi, kesiapan adopsi |
| Presentasi desain | 10% | Kemampuan menjelaskan trade-off dan menyebut apa yang akan dilakukan berbeda |

Lab yang hanya berjalan di branch penulis dianggap belum selesai. Keterlambatan diterima dalam satu minggu dengan penalti 10%; presentasi desain dijadwalkan per orang dan tidak dapat dijadwalkan ulang kecuali ada keadaan darurat yang terdokumentasi.

## Referensi

- GitHub Docs, "Dokumentasi GitHub Actions": <https://docs.github.com/en/actions>
- GitHub Docs, "Security hardening for GitHub Actions": <https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions>
- GitHub Docs, "Reusing workflows": <https://docs.github.com/en/actions/using-workflows/reusing-workflows>
- GitHub Docs, "Self-hosted runners": <https://docs.github.com/en/actions/hosting-your-own-runners>
- GitHub Docs, "Monitoring and troubleshooting workflows": <https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows>
- Actions Runner Controller: <https://github.com/actions/actions-runner-controller>
- Referensi OpenID Connect: <https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect>
- OpenSSF Scorecard, untuk pemeriksaan postur rantai pasok: <https://github.com/ossf/scorecard>
- `nektos/act`, untuk menjalankan workflow secara lokal: <https://github.com/nektos/act>
- Google, *Site Reliability Engineering* (gratis online), untuk kerangka SLI/SLO di Modul 5: <https://sre.google/sre-book/table-of-contents/>

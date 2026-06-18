---
title: "Silabus Manajemen Proses PM2"
description: "Kurikulum komprehensif 12 minggu tentang manajemen proses PM2 untuk aplikasi Node.js — dari daur hidup proses dasar hingga mode kluster, strategi deployment, pemantauan, dan operasi produksi."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Manajemen Proses PM2

## Ringkasan

Kurikulum 12 minggu ini dirancang untuk pengembang Node.js yang ingin menguasai PM2 sebagai process manager kelas produksi. Dimulai dari manajemen daur hidup proses dasar, kursus ini berlanjut melalui mode kluster dan penyeimbangan beban, konfigurasi file ecosystem, deployment tanpa downtime, manajemen log, pemantauan dan metrik, serta operasi produksi dalam skala besar. Setiap modul menggabungkan pembelajaran konseptual dengan latihan langsung, yang berpuncak pada proyek akhir di mana peserta didik membangun dan men-deploy aplikasi Node.js multi-layanan yang dikelola sepenuhnya melalui PM2.

## Kurikulum

### Modul 1: Pengenalan PM2 dan Manajemen Proses
- **Memahami process manager**: mengapa aplikasi Node.js membutuhkan process manager di produksi
  - Keterbatasan single-thread dan pemulihan crash
  - Perbandingan: PM2 vs forever vs nodemon vs systemd
- **Instalasi dan pengaturan PM2**
  - Instalasi global npm (`npm install -g pm2`)
  - Verifikasi instalasi dan versi
  - Daur hidup daemon PM2 (`pm2 startup`, `pm2 save`, `pm2 resurrect`)
- **Daur hidup proses dasar**
  - Memulai aplikasi dengan `pm2 start`
  - Menghentikan, me-restart, dan menghapus proses
  - Mendaftar proses yang dikelola dengan `pm2 list`
  - Menampilkan detail proses dengan `pm2 show`
- **Lab langsung**: Instal PM2, jalankan aplikasi Express sederhana, dan praktikkan perintah daur hidup

### Modul 2: Fundamental Manajemen Proses
- **Penamaan dan identifikasi proses**
  - Proses bernama vs nama otomatis
  - Menggunakan flag `--name` untuk identifikasi yang bermakna
  - ID proses dan daur hidupnya
- **Status dan transisi aplikasi**
  - Memahami status: online, stopping, stopped, launching, errored, one-launch-status
  - Diagram transisi status dan event hooks
  - Menangani proses yang crash dengan auto-restart
- **Log dan output proses**
  - Melihat log dengan `pm2 logs`
  - Mengikuti log dengan flag `--lines` dan `--raw`
  - Membersihkan dan memuat ulang aliran log
  - Output log JSON terstruktur
- **Lab langsung**: Implementasikan aplikasi dengan logging ekstensif dan praktikkan alur kerja inspeksi log

### Modul 3: Konfigurasi File Ecosystem
- **Struktur ecosystem.config.js**
  - Module exports dan array app
  - Objek konfigurasi per aplikasi
  - Properti umum: name, script, args, interpreter
- **Konfigurasi spesifik lingkungan**
  - Blok `env` dan `env_*` untuk development, staging, production
  - Injeksi dan override variabel lingkungan
  - Manajemen NODE_ENV di berbagai lingkungan
- **Pola file ecosystem tingkat lanjut**
  - Beberapa definisi aplikasi dalam satu file
  - Dependensi dan urutan aplikasi (`wait_ready`, `listen_timeout`)
  - Instance variables dan konfigurasi dinamis
- **Lab langsung**: Buat file ecosystem untuk aplikasi Node.js multi-layanan dengan lingkungan dev/staging/production

### Modul 4: Mode Kluster dan Penyeimbangan Beban
- **Memahami modul cluster Node.js**
  - Cara kerja internal cluster Node.js
  - Arsitektur master-worker
  - Penyeimbangan round-robin vs shared socket
- **Mode kluster PM2**
  - Mengaktifkan mode kluster dengan flag `-i`
  - Mengatur jumlah instance: max, jumlah spesifik, atau auto
  - Reload tanpa downtime dengan `pm2 reload`
- **Strategi penyeimbangan beban**
  - Load balancer round-robin bawaan PM2
  - Penyeimbangan beban eksternal dengan Nginx
  - Pertimbangan session affinity
- **Lab langsung**: Deploy aplikasi Express dalam mode kluster, uji distribusi beban, dan ukur peningkatan performa

### Modul 5: Shutdown Graceful dan Deployment Tanpa Downtime
- **Daur hidup shutdown graceful**
  - Penanganan sinyal: SIGINT, SIGTERM, SIGQUIT
  - Mengimplementasikan handler `process.on('SIGINT')`
  - Menguras koneksi dan menutup resource
- **Konfigurasi shutdown graceful PM2**
  - Pengaturan `kill_timeout`
  - Pola `listen_timeout` dan `wait_ready`
  - `shutdown_with_message` untuk protokol kustom
- **Alur kerja reload tanpa downtime**
  - Perbedaan `pm2 reload` dengan `pm2 restart`
  - Strategi rolling restart dalam mode kluster
  - Health check gating antara penggantian worker
- **Lab langsung**: Implementasikan shutdown graceful pada aplikasi Express dan verifikasi reload tanpa downtime dengan permintaan HTTP bersamaan

### Modul 6: Manajemen Log dan Rotasi
- **Manajemen log bawaan PM2**
  - Lokasi file log dan konvensi penamaan
  - Pemisahan output console dan error
  - Format timestamp dan format kustom
- **Plugin pm2-logrotate**
  - Instalasi dan konfigurasi pm2-logrotate
  - Kebijakan rotasi: ukuran maksimal, jumlah retensi, kompresi
  - Rotasi berbasis tanggal vs berbasis ukuran
- **Integrasi logging terstruktur**
  - Penerusan log Winston/Pino ke PM2
  - Agregasi log terpusat dengan ELK/Loki
  - Parsing dan kueri log JSON
- **Lab langsung**: Konfigurasikan pm2-logrotate dengan kebijakan rotasi produksi dan teruskan log ke agregator terpusat

### Modul 7: Pemantauan dan Metrik
- **Alat pemantauan bawaan**
  - Dashboard real-time `pm2 monit`
  - Penggunaan CPU dan memori per proses
  - Latensi event loop dan metrik garbage collection
- **PM2 Plus dan Keymetrics**
  - Pengaturan dashboard PM2 Plus
  - Metrik kustom dan transaksi bisnis
  - Konfigurasi alert dan notifikasi
- **Integrasi pemantauan pihak ketiga**
  - Ekspor metrik Prometheus melalui `pm2-prometheus-exporter`
  - Dashboard Grafana untuk metrik PM2
  - Integrasi APM dengan Sentry, New Relic, Datadog
- **Lab langsung**: Siapkan stack pemantauan dengan metrik PM2 Plus, ekspor Prometheus, dan dashboard Grafana

### Modul 8: Strategi Deployment
- **Deployment dasar dengan pm2 deploy**
  - Konfigurasi deployment di file ecosystem
  - Alur kerja deployment berbasis SSH
  - Hook pre-deployment dan post-deployment
- **Integrasi CI/CD**
  - PM2 di pipeline GitHub Actions
  - PM2 di GitLab CI, Jenkins, dan CircleCI
  - Rolling deployment di lingkungan CI/CD
- **Docker dan PM2**
  - Menjalankan PM2 di dalam kontainer Docker
  - Kebijakan restart PM2 vs Docker
  - Build Docker multi-stage dengan PM2
- **Lab langsung**: Implementasikan pipeline CI/CD lengkap yang men-deploy aplikasi Node.js melalui PM2 ke server staging

### Modul 9: Source Map dan Penanganan Error
- **Dukungan source map di PM2**
  - Mengaktifkan source map untuk kode transpilasi (TypeScript, Babel)
  - Flag `--source-map-support`
  - Menginterpretasi stack trace dengan source map
- **Penanganan error dan pemulihan crash**
  - Handler error kustom dan manajemen uncaught exception
  - Konfigurasi `--max-restarts` dan `--min-uptime` PM2
  - Exponential backoff untuk crash loops
- **Notifikasi dan alerting**
  - Integrasi webhook error
  - Notifikasi Slack/email pada peristiwa crash
  - Skrip notifikasi kustom dengan event bus PM2
- **Lab langsung**: Konfigurasikan source map untuk aplikasi TypeScript dan atur notifikasi alert crash

### Modul 10: Startup Hooks dan Integrasi Sistem
- **Pembuatan skrip startup**
  - `pm2 startup` untuk integrasi init system
  - Pembuatan file unit systemd
  - Dukungan Upstart dan launchd
- **PM2 sebagai layanan systemd**
  - Memeriksa file unit systemd yang dihasilkan
  - Kustomisasi parameter layanan systemd
  - Integrasi log journald
- **PM2 save dan resurrect**
  - Persistensi daftar proses dengan `pm2 save`
  - Resurrection otomatis saat boot
  - Mengelola beberapa dump file
- **Lab langsung**: Konfigurasikan PM2 sebagai layanan systemd di server Linux dengan startup otomatis saat boot

### Modul 11: Penyetelan Performa dan Manajemen Resource
- **Profil CPU dan memori**
  - Menggunakan `pm2 prettylist` untuk inspeksi mendalam
  - Pola deteksi kebocoran memori
  - Profil CPU dengan alat bawaan Node.js
- **Batas resource di PM2**
  - Kebijakan `max_memory_restart`
  - `--node-args` untuk penyetelan garbage collection V8
  - Integrasi Cgroup untuk lingkungan kontainer
- **Benchmarking performa**
  - Pengujian beban dengan autocannon dan wrk
  - Mengidentifikasi bottleneck dengan metrik PM2
  - Penentuan ukuran dan optimasi mode kluster
- **Lab langsung**: Profil aplikasi dengan kebocoran memori, atur kebijakan auto-restart, dan benchmark performa mode kluster

### Modul 12: Operasi Produksi dan Proyek Akhir
- **Runbook operasional produksi**
  - Pemeriksaan kesehatan harian dengan `pm2 status` dan health endpoints
  - Strategi backup dan restore untuk konfigurasi PM2
  - Prosedur rollback untuk deployment yang gagal
- **Praktik terbaik keamanan**
  - Menjalankan PM2 dengan hak akses minimal
  - Mengamankan antarmuka daemon PM2
  - Keamanan variabel lingkungan dan manajemen rahasia
- **Proyek akhir**: Bangun dan deploy aplikasi Node.js multi-layanan (server API, worker queue, server WebSocket) yang dikelola sepenuhnya melalui PM2 dengan:
  - File ecosystem dengan konfigurasi spesifik lingkungan
  - Mode kluster untuk server API
  - Shutdown graceful dan reload tanpa downtime
  - pm2-logrotate untuk manajemen log
  - Dashboard pemantauan PM2 Plus
  - Pipeline CI/CD untuk deployment otomatis
  - Integrasi systemd untuk startup saat boot
  - Batas resource dan kebijakan pemulihan crash

## Proyek Akhir

Peserta didik akan merancang, mengimplementasikan, dan men-deploy arsitektur mikroservis tingkat produksi yang terdiri dari tiga layanan Node.js:

1. **API Gateway (Express/Fastify)**: Berfungsi sebagai pintu masuk, menangani autentikasi, rate limiting, dan perutean permintaan ke layanan internal. Berjalan dalam mode kluster dengan 4 instance di belakang load balancer bawaan PM2.

2. **Background Worker (BullMQ/Bull)**: Memproses job yang diantrekan melalui Redis, menangani tugas berat CPU seperti pemrosesan gambar, pembuatan PDF, atau pengiriman email. Berjalan sebagai proses instance tunggal dengan pemantauan `max_memory_restart`.

3. **WebSocket Server (ws/Socket.IO)**: Mempertahankan koneksi persisten dengan klien untuk pembaruan real-time. Berjalan dalam proses tunggal dengan penanganan shutdown graceful kustom untuk koneksi aktif.

Proyek akhir harus mencakup file konfigurasi ecosystem yang lengkap, konfigurasi pipeline CI/CD (GitHub Actions atau GitLab CI), pengaturan pemantauan PM2 Plus, dan integrasi systemd. Semua layanan harus mendukung reload tanpa downtime dan shutdown graceful dengan pengurasan koneksi yang tepat.

## Kriteria Penilaian

- **Kuis Modul (20%)**: Kuis mingguan menguji pemahaman tentang konsep PM2, sintaks perintah, dan pola konfigurasi. Nilai kelulusan 70% diperlukan pada setiap kuis sebelum melanjutkan ke modul berikutnya.

- **Lab Langsung (40%)**: Setiap modul menyertakan latihan lab praktis yang dievaluasi berdasarkan penyelesaian, kebenaran, dan kepatuhan terhadap praktik terbaik. Lab dikirimkan sebagai file ecosystem PM2, sampel log, dan dashboard pemantauan.

- **Proyek Akhir (40%)**: Proyek akhir dievaluasi berdasarkan:
  - **Arsitektur dan desain (25%)**: Struktur file ecosystem yang bersih, penggunaan mode kluster yang tepat, pemisahan lingkungan yang benar
  - **Kebenaran implementasi (30%)**: Shutdown graceful berfungsi dengan benar, reload tanpa downtime dapat bertahan dari lalu lintas bersamaan, rotasi log berfungsi tanpa kehilangan data
  - **Kesiapan produksi (25%)**: Integrasi systemd, pipeline CI/CD, dashboard pemantauan, kebijakan pemulihan crash
  - **Dokumentasi (20%)**: Runbook yang mencakup deployment, pemeriksaan kesehatan, rollback, dan langkah pemecahan masalah umum

## Referensi

- [Dokumentasi Resmi PM2](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/) — Referensi lengkap untuk semua perintah dan konfigurasi PM2
- [Referensi File Ecosystem PM2](https://pm2.keymetrics.io/docs/usage/application-declaration/) — Skema file ecosystem dan semua opsi yang tersedia
- [Panduan Mode Kluster PM2](https://pm2.keymetrics.io/docs/usage/cluster-mode/) — Dokumentasi mode kluster mendalam dan praktik terbaik
- [Plugin pm2-logrotate](https://github.com/keymetrics/pm2-logrotate) — Konfigurasi dan opsi plugin rotasi log
- [Dokumentasi PM2 Plus](https://pm2.keymetrics.io/docs/usage/pm2-plus/) — Pengaturan dashboard pemantauan dan metrik kustom
- [Dokumentasi Deploy PM2](https://pm2.keymetrics.io/docs/usage/deployment/) — Konfigurasi deployment untuk staging dan produksi
- [Dokumentasi Cluster Node.js](https://nodejs.org/api/cluster.html) — Referensi resmi modul cluster Node.js
- [Integrasi Docker PM2](https://pm2.keymetrics.io/docs/usage/docker-pm2/) — Praktik terbaik menjalankan PM2 di kontainer Docker
- [Panduan Startup Hook PM2](https://pm2.keymetrics.io/docs/usage/startup/) — Integrasi systemd, Upstart, dan launchd

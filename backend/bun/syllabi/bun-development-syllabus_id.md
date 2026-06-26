---
title: "Silabus Pengembangan Bun"
description: "Kurikulum 12 minggu yang komprehensif untuk mempelajari Bun — runtime JavaScript all-in-one, manajer paket, test runner, dan bundler — dari konsep dasar hingga pola deployment produksi."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Bun

## Ringkasan

Silabus 12 minggu ini menyediakan jalur pembelajaran terstruktur untuk menguasai Bun, runtime dan toolkit JavaScript all-in-one yang berkinerja tinggi. Dibangun di atas JavaScriptCore, Bun menawarkan waktu mulai yang lebih cepat, penggunaan memori yang lebih rendah, dan perangkat terpadu yang menggantikan alat terpisah untuk menjalankan, menguji, membundel, dan mengelola paket.

Kurikulum ini berkembang dari konsep fundamental hingga pola deployment siap-produksi. Anda akan mulai dengan menginstal Bun dan membuat skrip sederhana, kemudian maju ke pembangunan API HTTP, integrasi basis data, pengujian sistematis, implementasi fitur real-time, dan deployment aplikasi ke produksi. Setiap modul mencakup latihan langsung dan diakhiri dengan tugas praktis yang memperkuat konsep minggu tersebut.

Di akhir silabus ini, Anda akan mampu membangun, menguji, membundel, dan men-deploy aplikasi Bun full-stack dengan percaya diri — baik Anda migrasi dari Node.js maupun memulai proyek baru dari awal.

## Kurikulum

### Minggu 1: Pengenalan Bun

- **Bun vs Node.js vs Deno**
  - Perbandingan arsitektur runtime (JavaScriptCore vs V8)
  - Karakteristik kinerja dan tolok ukur waktu mulai
  - Kompatibilitas API dengan pustaka standar Node.js
- **Instalasi dan konfigurasi**
  - Menginstal Bun di macOS, Linux, dan Windows (WSL)
  - Memverifikasi instalasi dengan `bun --version`
  - Memperbarui Bun ke versi terbaru
- **Menjalankan skrip dengan Bun**
  - Mengeksekusi file TypeScript dan JavaScript dengan `bun run`
  - Menggunakan `bun --watch` untuk restart otomatis saat pengembangan
  - Menjalankan skrip inline dengan `bun -e`
  - REPL Bun (`bun repl`)
- **Manajer paket Bun**
  - Menginstal dependensi dengan `bun install`
  - Menambah dan menghapus paket (`bun add`, `bun remove`)
  - Memahami format lockfile Bun (bun.lock)
  - Migrasi dari lockfile npm/pnpm/yarn

### Minggu 2: TypeScript dan Struktur Proyek

- **Dukungan TypeScript asli**
  - Menjalankan file `.ts` tanpa kompilasi
  - Mengonfigurasi `tsconfig.json` untuk Bun
  - Pemeriksaan tipe dengan `bun run tsc --noEmit`
  - Menggunakan alias jalur dan resolusi modul
- **Pembuatan kerangka proyek**
  - Menggunakan `bun init` untuk proyek baru
  - Menstruktur proyek Bun (src/, test/, dist/)
  - Variabel lingkungan dengan `Bun.env`
  - Validasi konfigurasi dengan Zod
- **Dukungan workspace dan monorepo**
  - Mengatur workspace Bun di package.json
  - Dependensi bersama dan hoisting
  - Menjalankan skrip di seluruh workspace
  - Perbandingan kinerja monorepo dengan workspace npm/pnpm

### Minggu 3: Server HTTP dengan Bun.serve()

- **Membangun server HTTP dengan Bun.serve()**
  - Penanganan permintaan dengan API Request/Response
  - Pola routing (router manual, berbasis file, framework)
  - Mengurai parameter jalur dan query string
  - Menangani badan permintaan (JSON, form data, teks biasa)
- **Pola server tingkat lanjut**
  - Header CORS dan permintaan preflight
  - Penyajian file statis dengan `new Response(Bun.file(...))`
  - Respons streaming dan transfer encoding chunked
  - Konfigurasi TLS/SSL dengan Bun.serve({ tls })
- **Middleware dan penanganan kesalahan**
  - Siklus hidup permintaan dan komposisi middleware
  - Penanganan kesalahan terpusat dengan respons kesalahan
  - Pencatatan permintaan dengan JSON terstruktur
  - Pembatasan laju dan validasi permintaan

### Minggu 4: Pengembangan API RESTful

- **Mendesain API RESTful dengan Bun**
  - Desain URL berorientasi sumber daya
  - Pola operasi CRUD (GET, POST, PUT, DELETE)
  - Serialisasi permintaan/respons JSON
  - Konvensi paginasi, pemfilteran, dan pengurutan
- **Validasi input**
  - Validasi badan permintaan dengan skema Zod
  - Validasi parameter query dan parameter jalur
  - Kontrak API type-safe dengan generik TypeScript
  - Pemformatan kesalahan validasi
- **Otentikasi dan otorisasi**
  - Pembuatan dan verifikasi token JWT
  - Pola middleware Bearer token
  - Otentikasi kunci API untuk komunikasi antar-layanan
  - Kontrol akses berbasis peran (RBAC)
- **Dokumentasi API**
  - Menghasilkan spesifikasi OpenAPI/Swagger
  - Menggunakan `@hono/zod-openapi` untuk dokumentasi type-safe
  - Menyajikan Swagger UI dari Bun

### Minggu 5: Persistensi Data dengan bun:sqlite

- **Pengenalan bun:sqlite**
  - Klien SQLite bawaan Bun vs better-sqlite3
  - Membuka dan membuat basis data
  - Menjalankan query SQL dengan `db.query()`
  - Prepared statements dan query berparameter
- **Operasi CRUD**
  - Membuat tabel dengan CREATE TABLE
  - Menyisipkan, membaca, memperbarui, dan menghapus data
  - Bekerja dengan transaksi untuk operasi atomik
  - Menangani constraint unik dan kunci asing
- **Pola SQLite tingkat lanjut**
  - Mode WAL untuk kinerja baca bersamaan
  - Pencarian teks lengkap dengan FTS5
  - Fungsi JSON di SQLite
  - Strategi pengindeksan untuk optimasi query
- **Strategi migrasi basis data**
  - Versi skema dengan file migrasi
  - Pola migrasi naik dan turun
  - Seeding basis data dengan data uji
  - Skrip runner migrasi di Bun

### Minggu 6: Pengujian dengan Bun Test Runner

- **Test runner bawaan Bun**
  - Menulis pengujian dengan `describe`, `test`, `expect`
  - Menjalankan pengujian dengan `bun test`
  - Mode watch untuk pengembangan berbasis pengujian
  - Perbandingan Bun test dengan Jest dan Vitest
- **Pola dan praktik pengujian**
  - Pengujian unit fungsi murni
  - Pengujian integrasi dengan server HTTP
  - Mocking dengan `mock()` dan `spyOn()`
  - Fixture pengujian dan hook setup/teardown
- **Cakupan kode dan pelaporan**
  - Menghasilkan laporan cakupan dengan `bun test --coverage`
  - Mengonfigurasi ambang cakupan
  - Integrasi CI untuk pelaporan pengujian
  - Snapshot testing untuk respons API
- **Pengujian tingkat lanjut**
  - Menguji koneksi WebSocket
  - Pengujian kinerja dengan benchmark (`bun test --bench`)
  - Menguji operasi basis data dengan basis data terisolasi
  - Strategi pengujian end-to-end

### Minggu 7: I/O File dan Stream

- **Operasi sistem file**
  - Membaca file dengan `Bun.file()` dan `Bun.readableStreamToText()`
  - Menulis file dengan `Bun.write()`
  - Bekerja dengan direktori (Bun.$`ls`, pola glob)
  - Metadata dan izin file
- **Streaming data**
  - Membaca dan menulis stream dengan Bun
  - Transformasi stream (kompresi, encoding)
  - Piping stream antara file dan jaringan
  - Penanganan backpressure di stream Bun
- **Upload dan pemrosesan file**
  - Menangani multipart form data
  - Streaming upload file ke disk
  - Memproses file CSV, JSON, dan biner
  - Pemrosesan gambar dengan integrasi sharp

### Minggu 8: Manajemen Proses dan Integrasi Sistem

- **Memunculkan dan mengelola proses**
  - Menggunakan `Bun.spawn()` dan `Bun.spawnSync()`
  - Perintah shell dengan API template literal Bun (`Bun.$`)
  - Menangkap stdout, stderr, dan kode keluar
  - Pipeline proses dan komunikasi antar-proses
- **File watcher dan pipeline build**
  - Menggunakan `Bun.write` dengan fs.watch
  - Membuat watcher kustom untuk alur kerja pengembangan
  - Integrasi dengan plugin esbuild dan SWC
  - Membangun pipeline aset dengan Bun.build
- **Utilitas sistem**
  - Membaca variabel lingkungan dengan `Bun.env`
  - Bekerja dengan file dan direktori sementara
  - Penanganan sinyal (SIGTERM, SIGINT, SIGHUP)
  - Pola graceful shutdown untuk proses berjalan lama

### Minggu 9: Fitur Real-time dan WebSocket

- **Server WebSocket dengan Bun.serve()**
  - Mengatur koneksi WebSocket
  - Menangani event open, message, dan close
  - Menyiarkan pesan ke klien yang terhubung
  - Ruang WebSocket dan langganan saluran
- **Pola aplikasi real-time**
  - Membangun server chat sederhana
  - Deteksi kehadiran dan pelacakan pengguna
  - Otentikasi dan otorisasi WebSocket
  - Strategi heartbeat dan koneksi ulang
- **Server-Sent Events (SSE)**
  - Mengimplementasikan endpoint SSE dengan Bun
  - Streaming event ke klien
  - Dukungan ID event dan koneksi ulang
  - Perbandingan SSE dengan WebSocket

### Minggu 10: Bundling dan Optimasi Build

- **Bundler bawaan Bun**
  - Menggunakan `bun build` untuk bundel produksi
  - Entry point dan konfigurasi output
  - Code splitting dan impor dinamis
  - Tree shaking dan eliminasi kode mati
- **Target dan format build**
  - Lingkungan target (bun, browser, node)
  - Format output (ESM, CommonJS, IIFE)
  - Minifikasi dan source map
  - Dependensi eksternal dan pengecualian bundling
- **Kompilasi eksekutabel mandiri**
  - Menggunakan `bun build --compile` untuk biner file tunggal
  - Kompilasi biner lintas platform
  - Menyematkan aset ke dalam eksekutabel
  - Kasus penggunaan untuk deployment mandiri
- **Optimasi kinerja**
  - Analisis ukuran bundel dan optimasi
  - Lazy loading dan strategi code splitting
  - Menyimpan cache output kompilasi di CI/CD
  - Perbandingan waktu build dengan esbuild, webpack, dan Rollup

### Minggu 11: Deployment dan Kontainerisasi

- **Strategi deployment produksi**
  - Men-deploy aplikasi Bun dengan process manager
  - Menggunakan PM2 dengan runtime Bun
  - Konfigurasi systemd untuk aplikasi Bun
  - Pola konfigurasi spesifik lingkungan
- **Kontainerisasi Docker**
  - Gambar Docker resmi Bun (oven/bun)
  - Menulis Dockerfile yang dioptimalkan untuk aplikasi Bun
  - Multi-stage build untuk ukuran gambar kecil
  - Docker Compose untuk layanan Bun + basis data
- **Deployment cloud**
  - Men-deploy ke Fly.io (dukungan Bun asli)
  - Men-deploy ke Railway, Render, dan Vercel
  - Pertimbangan deployment serverless
  - Menggunakan variabel lingkungan di platform cloud
- **Monitoring dan logging**
  - Logging JSON terstruktur dengan Bun
  - Integrasi dengan layanan agregasi log
  - Endpoint health check untuk orkestrasi kontainer
  - Integrasi Application Performance Monitoring (APM)

### Minggu 12: Proyek Capstone dan Topik Lanjutan

- **Desain proyek capstone**
  - Membangun aplikasi full-stack dengan Bun
  - Desain API, skema basis data, dan otentikasi
  - Fitur real-time (WebSocket atau SSE)
  - Pengujian, bundling, dan deployment
- **Profil kinerja dan debugging**
  - Profiling dengan `Bun.inspect()` dan Chrome DevTools
  - Analisis penggunaan memori dan deteksi kebocoran
  - Profil CPU untuk optimasi hot path
  - Debugging TypeScript dengan source map
- **Migrasi dari Node.js ke Bun**
  - Daftar periksa penilaian kompatibilitas
  - Mengganti API Node.js dengan padanan Bun
  - Menangani modul native yang tidak kompatibel
  - Perbandingan kinerja sebelum dan sesudah migrasi
- **Komunitas dan ekosistem**
  - API native Bun (bun:ffi, bun:test, bun:sqlite, bun:jsc)
  - Framework yang dioptimalkan untuk Bun (Elysia, Hono)
  - Berkontribusi ke open source Bun
  - Tetap terbarui dengan rilis Bun

## Proyek Akhir

**Aplikasi Real-time Full-Stack dengan Bun**

Bangun aplikasi web real-time lengkap menggunakan Bun sebagai runtime untuk server API dan, secara opsional, alat build untuk klien frontend. Proyek harus mencakup setidaknya tiga dari fitur lanjutan berikut:

1. **Kolaborasi real-time berbasis WebSocket** — seperti papan tulis bersama, editor dokumen kolaboratif, atau dashboard real-time dengan pembaruan data langsung
2. **Operasi CRUD berbasis basis data** — menggunakan bun:sqlite dengan migrasi, transaksi, dan pengindeksan yang tepat
3. **Sistem otentikasi** — otentikasi berbasis JWT dengan login, registrasi, dan rute yang dilindungi
4. **Upload dan pemrosesan file** — menerima upload file, memprosesnya (misalnya penguraian CSV, pengubahan ukuran gambar), dan menyajikan hasil
5. **Rangkaian pengujian otomatis** — pengujian unit, pengujian integrasi, dan pengujian benchmark yang mencakup aplikasi secara menyeluruh

**Hasil Kerja**:
- Kode sumber lengkap di repositori Git
- README dengan petunjuk pengaturan, dokumentasi arsitektur, dan referensi API
- Dockerfile untuk deployment terkontainerisasi
- Rangkaian pengujian dengan setidaknya 80% cakupan kode
- Konfigurasi CI/CD (GitHub Actions atau sejenisnya)

## Kriteria Penilaian

- **Tugas Mingguan (40%)**: Latihan coding mingguan yang dikirimkan melalui pull request, menunjukkan pemahaman konsep setiap modul. Setiap tugas dievaluasi berdasarkan kebenaran, kualitas kode, dan kepatuhan terhadap praktik terbaik Bun.
- **Proyek Tengah Semester (20%)**: API RESTful yang dibangun dengan Bun.serve() dan bun:sqlite, dikumpulkan pada akhir Minggu 6. Harus mencakup otentikasi, validasi input, pengujian komprehensif, dan dokumentasi API.
- **Proyek Akhir (40%)**: Aplikasi full-stak capstone yang dijelaskan di atas. Dievaluasi berdasarkan implementasi teknis, organisasi kode, cakupan pengujian, kesiapan deployment, dan kualitas dokumentasi.
- **Partisipasi Tinjauan Kode**: Tinjauan aktif terhadap setidaknya tiga pull request peserta lain selama kursus. Tinjauan harus berfokus pada pola spesifik Bun, pertimbangan kinerja, dan praktik terbaik.

## Referensi

- [Dokumentasi Resmi Bun](https://bun.sh/docs) — Referensi API lengkap untuk runtime Bun, CLI, dan modul bawaan
- [Repositori GitHub Bun](https://github.com/oven-sh/bun) — Kode sumber, pelacak masalah, dan catatan rilis
- [Dokumentasi Elysia.js](https://elysiajs.com) — Framework web native Bun untuk membangun API type-safe
- [Dokumentasi Zod](https://zod.dev) — Pustaka validasi skema berbasis TypeScript, sering digunakan dengan Bun
- [Dokumentasi SQLite](https://www.sqlite.org/docs.html) — Dokumentasi resmi SQLite untuk pola query lanjutan
- [Panduan Bun Fly.io](https://fly.io/docs/js/frameworks/bun/) — Men-deploy aplikasi Bun di Fly.io
- [Gambar Docker Resmi: Bun](https://hub.docker.com/r/oven/bun) — Gambar Docker resmi Bun untuk deployment terkontainerisasi

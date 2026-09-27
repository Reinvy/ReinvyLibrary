---
title: "Silabus Pengembangan Full-Stack Bun"
description: "Kurikulum lanjutan 12 minggu yang komprehensif untuk pengembang yang ingin meluncurkan aplikasi web lengkap dengan Bun sebagai toolkit full-stack — mencakup pola web-tier Bun.serve(), rendering HTML-first dengan streaming, server-side rendering React, UI server-driven dengan HTMX, pipeline frontend bun build, hot module replacement, optimasi aset statis, lapisan data type-safe, autentikasi, dan deployment full-stack."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Full-Stack Bun

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk pengembang JavaScript dan TypeScript yang sudah membangun backend Bun dan ingin menguasai cerita full-stack Bun: meluncurkan aplikasi web lengkap di mana runtime yang sama melayani API, merender HTML, membundel aset frontend, dan menjalankan tes. Jika kurikulum Bun umum berfokus pada fundamental runtime dan silabus lanjutan berfokus pada internal runtime, kursus ini sepenuhnya didedikasikan untuk lapisan aplikasi — web tier, markup, dan pipeline deployment.

Kurikulum ini mengikuti perjalanan aplikasi full-stack modern: membangun web tier yang kokoh dengan `Bun.serve()`, merender HTML dengan streaming dan progressive enhancement, memilih antara React server-side rendering dan HTMX untuk UI server-driven, mengompilasi aset frontend dengan `bun build`, menjalankan loop pengembangan cepat dengan hot module replacement, melayani aset statis dengan caching yang benar, menyimpan data melalui lapisan type-safe di atas `bun:sqlite` dan Drizzle, mengamankan aplikasi dengan autentikasi dan sesi, dan akhirnya mengirimkannya ke kontainer, biner tunggal, atau edge.

Setiap modul memasangkan fondasi konseptual dengan lab praktik yang menghasilkan aplikasi Bun nyata yang dapat dijalankan. Kursus berpuncak pada proyek akhir di mana peserta membangun, mengamankan, dan men-deploy produk full-stack lengkap dengan anggaran performa dan aksesibilitas yang terukur.

Di akhir kursus ini, peserta akan mampu merancang dan mengimplementasikan aplikasi web full-stack siap-produksi sepenuhnya dalam toolchain Bun: merender respons HTML streaming, merender React di server atau menggerakkan UI dengan HTMX, membundel aset sisi klien, mengelola alur kerja pengembangan hot reload, merancang akses data type-safe, mengimplementasikan autentikasi dan manajemen sesi, serta men-deploy produk jadi dengan CI/CD.

## Kurikulum

### Modul 1: Toolchain Full-Stack Bun (Minggu 1)

- **Bun sebagai toolkit all-in-one**
  - Mengapa satu runtime untuk server, bundler, test runner, dan manajer paket mengubah alur kerja proyek
  - Membandingkan pendekatan full-stack Bun dengan tumpukan Node.js/Next.js dan templating Go
  - Pemilihan versi dengan `bun upgrade` dan pinning CI dengan `bun install --frozen-lockfile`
- **Menyiapkan proyek full-stack**
  - Struktur proyek manual: konvensi `src/server`, `src/ui`, `src/lib`, dan `public/`
  - Konfigurasi TypeScript strict, path alias di `tsconfig.json`, dan resolusi modul dengan Bun
  - Penanganan environment dengan `Bun.env` dan validasi bertipe untuk nilai `Bun.env.*`
- **Ergonomi pengembangan**
  - Wiring skrip `bun run` untuk dev, build, test, dan typecheck
  - Import map dan `exports` paket untuk kode internal bersama
  - Pertimbangan monorepo: workspaces untuk paket bersama lintas aplikasi

### Modul 2: Web Tier dengan Bun.serve() (Minggu 2)

- **Routing dan siklus hidup permintaan**
  - Dasar `Bun.serve()`: handler `routes`, `fetch`, dan `error`
  - Parameter path, pola wildcard, dan pencocokan metode
  - Siklus hidup permintaan/respons: header, cookie, parsing body, dan streaming
- **Middleware dan komposisi**
  - Merangkai middleware untuk logging, timing, autentikasi, dan kompresi
  - Propagasi konteks melalui `Server.register` dan state scoped-per-permintaan
  - Penanganan error dengan builder `Response` bertipe dan bentuk error JSON yang konsisten
- **Streaming dan koneksi tahan lama**
  - Respons streaming dengan body `ReadableStream` dan backpressure
  - Server-Sent Events (SSE) untuk pembaruan push dan pelaporan progres
  - Pola upgrade WebSocket untuk fitur interaktif (rekap `srv.upgrade`)

### Modul 3: Rendering HTML-First (Minggu 3)

- **Menghasilkan HTML secara aman**
  - Rendering template literal dan fungsi layout yang dapat dikomposisi
  - Output escaping untuk mencegah XSS dan penanganan aman konten buatan pengguna
  - Fungsi komponen yang dapat digunakan kembali: `Layout`, `Header`, `Table`, dan `Form`
- **Streaming HTML**
  - Menulis `ReadableStream` dari potongan HTML dengan early flush untuk first paint yang lebih cepat
  - Rendering progresif: melakukan streaming baris tabel dan item feed saat data tiba
  - `HTMLRewriter` untuk mentransformasi respons tanpa render ulang penuh
- **Progressive enhancement**
  - Membangun form dan tautan yang berfungsi tanpa JavaScript terlebih dahulu
  - Melapiskan perilaku klien di atas markup yang dirender server
  - Dasar aksesibilitas: HTML semantik, landmark, dan manajemen fokus

### Modul 4: React Server-Side Rendering (Minggu 4)

- **Fundamental SSR dengan Bun**
  - `renderToReadableStream` untuk SSR React streaming dari server Bun
  - Hidrasi: melayani pohon komponen yang sama ke klien dan menghidrasi ulang
  - Batas komponen klien/server dengan konvensi `"use client"` dan `"use server"`
- **React Server Components**
  - Komponen server untuk pengambilan data dan rendering tanpa bundle klien
  - Meneruskan props yang dapat diserialisasi melintasi batas dan menangani komponen async
  - Server actions untuk mutasi tanpa rute API terpisah
- **Streaming dan Suspense**
  - Batas Suspense untuk pengiriman HTML progresif
  - Menggabungkan pembaruan SSE dengan UI React yang dirender server
  - Strategi caching output yang dirender untuk layout bersama

### Modul 5: UI Server-Driven dengan HTMX (Minggu 5)

- **Hypermedia dan dasar HTMX**
  - Model hypermedia: server memiliki state UI dan merender fragmen lengkap
  - Atribut `hx-get`, `hx-post`, `hx-swap`, `hx-target`, dan `hx-trigger`
  - Mengembalikan fragmen HTML dari rute Bun, bukan JSON
- **Pola interaktif**
  - Pengeditan inline, select berjenjang, infinite scroll, dan preview optimistis
  - Out-of-band swap untuk memperbarui beberapa wilayah dalam satu respons
  - Validasi form di mana server mengembalikan form yang dirender ulang dengan error
- **Mengintegrasikan HTMX dengan Bun**
  - Melayani skrip HTMX dari aset lokal dengan integrity hash
  - SSE dengan `hx-ext="sse"` untuk pembaruan langsung
  - Membandingkan HTMX dan React: kapan UI server-driven mengungguli framework klien

### Modul 6: Pipeline Build Frontend dengan bun build (Minggu 6)

- **Membundel aset klien**
  - Konfigurasi `bun build` dengan entry point HTML, beberapa entry point, dan output
  - Kompilasi JSX/TSX, penanganan CSS, dan inlining aset
  - Code splitting, minifikasi, source map, dan target browser dengan `--target`
- **Integrasi CSS dan styling**
  - Setup Tailwind CSS dengan Bun: pemindaian konten dan purging produksi
  - Plugin PostCSS dan ekstraksi CSS ke file terpisah
  - Design token dan CSS variables di seluruh markup yang dirender server
- **Manajemen output produksi**
  - Content hashing untuk nama file aset yang immutable
  - Membuat asset manifest untuk mereferensikan file ber-hash dari template server
  - Build kondisional: bundle pengembangan dengan source map versus bundle produksi

### Modul 7: Pengalaman Pengembangan — HMR dan Watch (Minggu 7)

- **Alur kerja hot reload**
  - `bun --hot` untuk hot reload server dan `bun --watch` untuk restart saat berubah
  - Semantik Hot Module Replacement (HMR) untuk modul sisi klien
  - Fast Refresh untuk komponen React selama pengembangan
- **Arsitektur dev server**
  - Melayani bundle pengembangan dengan dev server Bun dan proxy rute API
  - Konfigurasi spesifik environment: mode development, test, dan production
  - Error overlay dan logging terstruktur selama pengembangan
- **Pengujian dalam loop pengembangan**
  - `bun test` bersama dev server untuk cakupan unit dan integrasi
  - Playwright untuk pemeriksaan end-to-end UI yang dirender server
  - Contract test untuk rute API yang dikonsumsi kode sisi klien

### Modul 8: Aset Statis, Caching, dan CDN (Minggu 8)

- **Melayani file statis**
  - `Bun.file()` untuk respons berbasis disk dengan tipe MIME yang benar
  - Negosiasi konten: kompresi gzip/brotli dan permintaan kondisional
  - Range request dan streaming untuk aset media
- **Strategi caching**
  - Semantik `Cache-Control` dan `ETag` untuk HTML versus aset ber-hash
  - Caching immutable untuk file content-hashed dan revalidasi untuk HTML
  - Alur kerja cache busting saat hash aset berubah
- **Distribusi CDN dan edge**
  - Mendorong aset statis ke CDN dan menandatangani URL
  - Optimasi gambar: pengubahan ukuran dan negosiasi format untuk gambar responsif
  - Penanganan upload: parsing multipart, validasi, dan dasar pemindaian virus

### Modul 9: Lapisan Data Type-Safe (Minggu 9)

- **Persistensi dengan bun:sqlite**
  - Setup basis data, mode WAL, dan siklus hidup koneksi
  - Prepared statements, transaksi, dan operasi batch
  - Definisi skema Drizzle ORM, migrasi, dan query type-safe
- **Integrasi PostgreSQL**
  - Menghubungkan Bun ke PostgreSQL dengan `postgres.js` dan connection pooling
  - Membandingkan SQLite dan PostgreSQL untuk beban kerja full-stack
  - Query building dengan Drizzle untuk deployment PostgreSQL
- **Validasi dan kontrak bersama**
  - Skema Zod yang dibagikan antara rute server dan form klien
  - Middleware validasi permintaan dan respons error bertipe
  - Menghasilkan tipe TypeScript dari skema basis data dengan Drizzle Kit

### Modul 10: Autentikasi dan Sesi (Minggu 10)

- **Manajemen sesi**
  - Cookie sesi bertanda tangan dengan rotasi dan kedaluwarsa
  - Penyimpanan sesi sisi server yang didukung bun:sqlite
  - Penanggulangan session fixation dan pembajakan sesi
- **Strategi autentikasi**
  - Hashing kata sandi dengan `Bun.password` (bcrypt/argon2) dan verifikasi timing-safe
  - Alur OAuth 2.0: Authorization Code dengan PKCE terhadap GitHub dan Google
  - Penerbitan JWT, verifikasi, dan rotasi refresh token
- **Pengerasan aplikasi full-stack**
  - Security headers: CSP, HSTS, X-Content-Type-Options, dan frame options
  - Perlindungan CSRF untuk permintaan yang mengubah state
  - Rate limiting, perlindungan brute-force, dan audit logging

### Modul 11: Deployment Full-Stack dan CI/CD (Minggu 11)

- **Strategi build dan pengemasan**
  - `bun build --compile` untuk distribusi biner tunggal dengan `--minify` dan `--bytecode`
  - Image Docker multi-stage dengan base image Bun dari Oven
  - Integrasi pipeline aset: membundel file statis ke dalam artefak yang dapat di-deploy
- **Deployment platform**
  - Men-deploy server Bun ke Fly.io, Render, dan Railway
  - Pertimbangan edge/serverless: kompatibilitas Bun dengan Cloudflare Workers dan Vercel
  - Manajemen environment, secrets, dan pola restart zero-downtime
- **CI/CD dan observabilitas**
  - Pipeline GitHub Actions: install, typecheck, test, build, dan deploy
  - Logging JSON terstruktur dengan pino dan tracing OpenTelemetry
  - Health check, readiness probe, dan prosedur rollback

### Modul 12: Proyek Akhir — Produk Full-Stack (Minggu 12)

- **Ringkasan proyek**
  - Membangun produk multi-pengguna lengkap dengan UI yang dirender server, pembaruan real-time, dan autentikasi
  - Pilih strategi rendering (React SSR, HTMX, atau hibrida) dan pertanggungjawabkan pilihannya
  - Tetapkan anggaran performa, aksesibilitas, dan keamanan sejak awal
- **Persyaratan pengiriman**
  - Pipeline aset produksi, bundle ber-hash, dan konfigurasi caching
  - Pipeline CI/CD dengan tes otomatis dan deployment bertahap
  - Observabilitas: log terstruktur, metrik, dan pelacakan error di produksi
- **Presentasi dan tinjauan**
  - Walkthrough arsitektur dan log keputusan
  - Hasil load test, skor Lighthouse, dan tanda tangan checklist keamanan

## Proyek Akhir

Peserta membangun dan meluncurkan aplikasi full-stack siap-produksi sepenuhnya di atas toolchain Bun. Contoh yang sesuai meliputi workspace tim real-time dengan komentar dan indikator kehadiran, platform manajemen acara dengan reservasi kursi, atau dasbor analitik dengan pembaruan SSE langsung. Aplikasi harus menggabungkan web tier `Bun.serve()`, UI yang dirender server (React SSR atau HTMX), pipeline frontend `bun build` dengan aset ber-hash, lapisan data type-safe (SQLite atau PostgreSQL dengan Drizzle), autentikasi dengan sesi, dan deployment CI/CD ke URL publik. Proyek dinilai berdasarkan kualitas arsitektur, kebenaran streaming dan caching, pengerasan keamanan, performa terhadap anggaran yang dideklarasikan, dan kematangan operasional (logging, health check, rencana rollback).

## Kriteria Penilaian

- **Tugas**: Lab mingguan dievaluasi berdasarkan kebenaran, kesadaran keamanan, dan kepatuhan terhadap tujuan pengajaran modul. Kuis modul memverifikasi pemahaman konseptual tentang semantik streaming, SSR, bundling, dan caching. Tinjauan kode di tengah kursus menilai arsitektur web tier dan rendering sebelum modul data dan autentikasi.
- **Proyek Akhir**: Divalidasi terhadap anggaran yang dideklarasikan: first-contentful-paint di bawah 1,5 detik pada koneksi throttled, interactive time di bawah 2,5 detik, skor aksesibilitas Lighthouse di atas 90, tidak ada temuan severity tinggi pada checklist keamanan, serta keberhasilan deployment zero-downtime dengan rollback yang didemonstrasikan. Proyek harus di-deploy publik dengan CI/CD dan menyertakan log arsitektur dan keputusan tertulis.

## Referensi

- Dokumentasi resmi Bun: referensi Bun.serve, bun build, bun test, HTMLRewriter, dan Bun.password (https://bun.com/docs)
- Dokumentasi React: renderToReadableStream, server components, dan server actions (https://react.dev/reference/react-dom/server)
- Dokumentasi dan contoh HTMX (https://htmx.org/docs)
- Dokumentasi Drizzle ORM untuk skema, migrasi, dan query (https://orm.drizzle.team/docs)
- Panduan instalasi dan konfigurasi Tailwind CSS (https://tailwindcss.com/docs)
- Panduan resmi Fly.io dan Docker untuk deployment Bun (https://fly.io/docs, https://docs.docker.com)

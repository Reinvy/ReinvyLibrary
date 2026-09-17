---
title: "Silabus Rekayasa Platform API NestJS"
description: "Kurikulum 10 minggu tingkat lanjut untuk insinyur backend yang ingin merancang, membangun, dan mengoperasikan platform REST API kelas produksi dengan NestJS — mencakup desain REST API, alur kerja OpenAPI-first, validasi dan serialisasi, paginasi, versioning, rate limiting, idempotensi, autentikasi API, pengujian kontrak, webhook, performa dan caching, serta pengalaman pengembang di tingkat gateway."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Platform API NestJS

## Ringkasan

Kurikulum tingkat lanjut 10 minggu ini dirancang untuk insinyur backend yang sudah terbiasa mengirim aplikasi NestJS dan ingin naik level dari "membangun endpoint" menjadi "mengoperasikan platform API". Platform API bukan sekadar kumpulan rute — platform API adalah produk dengan kontrak, siklus hidup, dan pengalaman pengembang. Kursus ini memperlakukan API itu sendiri sebagai deliverables: Anda akan belajar memodelkan resource dan semantik HTTP dengan benar, mengadopsi alur kerja OpenAPI-first sehingga spesifikasi menjadi sumber kebenaran, memperkuat lapisan validasi dan serialisasi, merancang paginasi dan pemfilteran yang dapat diskalakan, melakukan versioning API tanpa merusak konsumen, melindunginya dengan throttling dan idempotensi, mengamankan akses dengan token berskop, memverifikasi kontrak dengan consumer-driven testing, mengirimkan event secara andal melalui webhook, serta membuktikan performa dengan load test dan caching. Setiap minggu memadukan materi konseptual yang mendalam dengan laboratorium langsung pada satu codebase yang terus berkembang, dan kursus ini diakhiri dengan kapstone: platform API yang lengkap, berversi, terdokumentasi, dan teruji kontrak untuk produk bergaya SaaS, dikirim bersama quickstart pengembang dan laporan performa terukur.

Peserta sebaiknya sudah nyaman dengan TypeScript, fundamental NestJS (modul, controller, provider, guard, pipe), dan basis data relasional sebelum mendaftar.

## Kurikulum

### Modul 1: Fondasi Desain REST API (Minggu 1)

- **Pemodelan Resource**
  - Kata benda, bukan kata kerja: koleksi, sub-resource, dan perbedaan antara resource dengan aksi
  - Konvensi URI: nama jamak, hierarki yang stabil, dan menghindari detail implementasi di path
  - Kapan sebuah resource berupa daftar, dokumen, atau komputasi (dan cara memodelkan masing-masing)
- **Semantik HTTP**
  - Semantik method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` beserta jaminan safety/idempotensi-nya
  - Taksonomi status code: keluarga sukses 2xx, error klien 4xx, error server 5xx, serta kode yang paling penting bagi konsumen API (400, 401, 403, 404, 409, 422, 429)
  - Negosiasi konten: `Accept` / `Content-Type`, media type, dan envelope respons JSON
- **Setup Codebase Kursus**
  - Tata letak monorepo modular untuk platform API (modul resource, common, infra)
  - Config module, validasi environment, dan kerangka penanganan error bersama
  - Mengaktifkan `@nestjs/swagger` sejak awal agar kontrak tumbuh bersama kode
- **Praktik Laboratorium**: Modelkan domain pelacak tugas tim menjadi resource REST, lalu implementasikan endpoint baca pertama dengan status code dan media type yang benar

### Modul 2: Alur Kerja OpenAPI-First dengan NestJS (Minggu 2)

- **Mengapa Kontrak Didahulukan**
  - Spesifikasi sebagai satu sumber kebenaran: codegen, dokumentasi, SDK klien, dan mock
  - Code-first versus spec-first: kapan masing-masing menang, dan bagaimana NestJS mendukung keduanya
- **Menghasilkan Kontrak dengan `@nestjs/swagger`**
  - Dekorator untuk schema, parameter, respons, dan tag
  - Generasi schema berbasis DTO dan metadata `@ApiProperty` eksplisit
  - Swagger UI sebagai permukaan dokumentasi yang hidup
- **Detail OpenAPI 3.1**
  - Components, schemas, parameter, request/response body, security schemes
  - Menulis deskripsi, contoh, dan flag deprecation berkualitas tinggi
- **Gerbang Kualitas Spesifikasi**
  - Memvalidasi dokumen yang dihasilkan dengan linter seperti Spectral
  - Menegakkan konvensi penamaan dan melarang deskripsi yang hilang di CI
- **Praktik Laboratorium**: Hasilkan dokumen OpenAPI lengkap untuk API Minggu 1, validasi dengan aturan Spectral, dan perbaiki setiap peringatan

### Modul 3: Validasi DTO, Serialisasi & Taksonomi Error (Minggu 3)

- **Validasi dengan `class-validator` dan `ValidationPipe`**
  - Opsi `whitelist`, `forbidNonWhitelisted`, dan `transform` beserta implikasi keamanannya
  - DTO bersarang, array, dan aturan validasi kondisional
- **Serialisasi dengan `class-transformer`**
  - `@Exclude` / `@Expose` dan kelompok serialisasi untuk visibilitas field berbasis peran
  - Transformasi tanggal, angka, dan enum di lapisan batas
- **Taksonomi Error yang Konsisten**
  - Problem details RFC 7807: `type`, `title`, `status`, `detail`, `instance`
  - Error validasi tingkat field di dalam envelope yang stabil
  - Custom exception filter yang memetakan exception domain menjadi error API tanpa membocorkan detail internal
- **Praktik Laboratorium**: Terapkan validasi whitelist pada setiap endpoint tulis, tambahkan filter error problem-details global, dan sertakan request ID di setiap respons

### Modul 4: Paginasi, Pemfilteran, Sorting & Pencarian (Minggu 4)

- **Paginasi Offset vs Cursor**
  - Trade-off: biaya halaman dalam, data drift, dan jaminan konsistensi
  - Paginasi keyset (seek) pada kolom berindeks dengan pengurutan yang stabil
- **Konvensi Pemfilteran**
  - Desain parameter kueri: `filter[status]=done`, akhiran operator, dan escaping
  - Whitelist field yang dapat difilter untuk melindungi index dan mencegah penyalahgunaan
- **Sorting**
  - Sintaks sort multi-field, kontrol arah, dan allowlist field yang aman
  - Mencegah injeksi ke klausa `ORDER BY`
- **Pencarian**
  - Full-text search (misalnya `tsvector` PostgreSQL) versus pencarian mengandung sederhana
  - Menggabungkan pencarian dengan paginasi dan filter tanpa kejutan
- **Metadata Halaman**
  - `total`, `next_cursor`, dan `per_page` dalam envelope yang stabil
  - Menerapkan batas ukuran halaman maksimum dan validasi cursor
- **Praktik Laboratorium**: Bangun feed pesan dengan paginasi cursor, pemfilteran, sorting multi-field, dan pencarian, lalu verifikasi kueri SQL memakai index melalui `EXPLAIN`

### Modul 5: Versioning, Rate Limiting & Idempotensi (Minggu 5)

- **Strategi Versioning API**
  - Versioning URI (`/v1/`, `/v2/`) versus versioning header dan media type
  - Kapan memotong versi baru, seperti apa kebijakan deprecation, dan cara mengumumkannya
- **Rate Limiting dengan `@nestjs/throttler`**
  - Perilaku fixed-window versus token bucket dan backend penyimpanannya (Redis)
  - Batas per-rute, per-pengguna, dan per-IP; header `X-RateLimit-*` serta `429` dengan `Retry-After`
- **Kunci Idempotensi**
  - Mengapa `POST` membutuhkan keamanan retry: pesanan ganda, tagihan ganda, pendaftaran ganda
  - Penyimpanan kunci di Redis, replay respons pada kunci berulang, serta kebijakan kedaluwarsa/pembersihan
- **Etika Sisi Klien**
  - Menghormati `Retry-After`, exponential backoff, dan desain anggaran retry
- **Praktik Laboratorium**: Perkenalkan controller `/v1` dan `/v2`, pasang batas throttler per pengguna, dan implementasikan endpoint bergaya billing yang idempoten dengan dukungan Redis

### Modul 6: Desain Autentikasi & Otorisasi API (Minggu 6)

- **Strategi Token untuk API**
  - JWT access token berumur pendek dengan rotasi refresh versus token opaque
  - API key untuk klien machine-to-machine: pembatasan skop, rotasi, dan pencabutan
- **Guard, Dekorator, dan Kebijakan**
  - Guard global dengan override tingkat rute; metadata peran dan izin melalui dekorator
  - Pemeriksaan kepemilikan tingkat resource dan evaluasi kebijakan bergaya ABAC
- **OAuth2 untuk Aplikasi Pihak Ketiga**
  - Alur authorization-code dan client-credentials; skop sebagai unit persetujuan
  - Penerbitan token, validasi audience, dan penanganan refresh di NestJS
- **Tenancy dan Isolasi Multi-Klien**
  - Menurunkan tenant dan aktor dari token, bukan dari body permintaan
  - Mencegah eskalasi hak akses horizontal dalam kueri
- **Praktik Laboratorium**: Tambahkan access token berskop, lindungi rute dengan metadata peran, dan verifikasi bahwa pembacaan lintas-tenant ditolak

### Modul 7: Pengujian Kontrak & Tata Kelola API (Minggu 7)

- **Consumer-Driven Contracts**
  - Mengapa integration test melewatkan ekspektasi konsumen, dan apa yang ditambahkan oleh contract test
  - Pact: ekspektasi konsumen, provider states, dan proses verifikasi
- **Verifikasi Kontrak di CI**
  - Menjalankan verifikasi provider pada setiap PR; pencocokan versi berbasis broker
  - Menangani perubahan kontrak di lintas garis waktu rilis
- **Tata Kelola Schema**
  - Perubahan breaking versus non-breaking: aturan hanya-menambah dan pemutusan eksplisit
  - Changelog API, header deprecation, dan tanggal sunset sebagai kebijakan produk
- **Proses Review API**
  - Diff spesifikasi dalam code review, daftar periksa desain, dan kapan perubahan breaking membutuhkan persetujuan
- **Praktik Laboratorium**: Dirikan pasangan consumer/provider Pact untuk resource tugas dan sambungkan verifikasi provider ke pipeline CI

### Modul 8: Webhook & Pengiriman Asinkron (Minggu 8)

- **Desain Webhook**
  - Katalog event, schema payload, dan tipe event berversi
  - Memverifikasi pengiriman dengan tanda tangan HMAC dan memberi konsumen cara memutar ulang
- **Pengiriman Andal**
  - Pola outbox untuk menerbitkan event secara transaksional bersama operasi tulis
  - Antrean retry (BullMQ) dengan exponential backoff, penanganan dead-letter, dan pelacakan tanda terima pengiriman
  - Pengiriman idempoten agar callback duplikat aman bagi konsumen
- **Pengalaman Pengembang untuk Webhook**
  - Log webhook, endpoint replay, debugging tanda tangan, dan terowongan lokal untuk pengembangan
- **Praktik Laboratorium**: Tambahkan webhook bertanda tangan HMAC untuk event tugas menggunakan pipeline outbox + retry BullMQ, lalu verifikasi perilaku replay dan dead-letter

### Modul 9: Performa & Caching API (Minggu 9)

- **Load Testing dan Profiling**
  - k6 atau autocannon: throughput, persentil latensi (p50/p95/p99), dan batas error
  - Profiling handler lambat dan kueri basis data; deteksi N+1 dan index yang hilang
- **Caching HTTP**
  - `Cache-Control`, `ETag` / `If-None-Match`, permintaan kondisional, dan respons `304`
- **Caching Sisi Server**
  - Cache-aside dengan Redis, desain kunci dengan invalidasi, dan menghindari baca basi
  - Kompresi (gzip/brotli) dan anggaran ukuran payload
- **Optimasi Baca Basis Data**
  - Index untuk bentuk paginasi/filter dari Modul 4, batching kueri, dan read replica
- **Praktik Laboratorium**: Load-test endpoint feed pesan, tambahkan ETag dan cache-aside Redis, lalu jalankan ulang pengujian dan bandingkan persentil sebelum dan sesudah

### Modul 10: Gateway, Pengalaman Pengembang & Siklus Hidup (Minggu 10)

- **Pola API Gateway**
  - Routing, agregasi, rate limiting di sisi edge, dan otentikasi di gateway
  - Modul gateway dalam proses NestJS versus gateway terkelola (Kong, Envoy, layanan cloud)
- **Pengalaman Pengembang**
  - Portal dokumentasi, sandbox key, dan panduan quickstart
  - Menghasilkan klien bertipe (`openapi-typescript`, `openapi-generator`) dari kontrak
- **Manajemen Siklus Hidup**
  - Jadwal deprecation, header sunset, jendela perubahan breaking, dan panduan migrasi
  - Mengukur adopsi versi lama untuk memutuskan kapan versi tersebut dipensiunkan
- **Observabilitas API**
  - Log permintaan terstruktur, SLI/SLO latensi, error budget, dan alerting pada sumbu 429/5xx
- **Praktik Laboratorium**: Terbitkan platform dengan quickstart pengembang dan sandbox key, depresiasi endpoint v1 sesuai kebijakan, dan jalankan load test akhir dengan laporan terdokumentasi

## Proyek Akhir

Bangun platform API lengkap untuk domain pelacak tugas tim: REST API berversi berbasis OpenAPI-first dengan DTO tervalidasi, paginasi cursor, pemfilteran dan pencarian, rate limiting per pengguna, mutasi idempoten, access token berskop, kontrak terverifikasi Pact, webhook bertanda tangan HMAC dengan retry dan replay, caching ETag dan Redis, serta laporan load test terdokumentasi dengan latensi p50/p95/p99. Deliverablenya adalah repositori yang berisi kontrak OpenAPI, implementasi NestJS, pengujian kontrak, pipeline CI yang memverifikasi kontrak dan kesesuaian, infrastruktur pengiriman webhook, quickstart pengembang, dan laporan performa yang menunjukkan efek terukur dari strategi caching.

## Kriteria Penilaian

- **Tugas**: Brief desain mingguan (peta resource, kutipan OpenAPI, proposal perubahan schema) dinilai berdasarkan konsistensi desain API dan kualitas spesifikasi; setiap laboratorium mingguan harus lolos verifikasi yang dinyatakan (validasi diterapkan, kontrak valid, index terpakai, persentil membaik).
- **Kontrak dan Tata Kelola**: Spesifikasi harus bersih dari linter, verifikasi provider Pact harus lolos di CI, dan setiap perubahan schema harus mengikuti kebijakan perubahan breaking yang terdokumentasi.
- **Proyek Akhir**: Dievaluasi berdasarkan kualitas kontrak, konsistensi semantik HTTP, perilaku rate-limit dan idempotensi saat replay, keandalan webhook (tanda tangan, retry, penanganan dead-letter), isolasi akses lintas-tenant, bukti performa dengan pengukuran sebelum/sesudah, dan kelengkapan quickstart pengembang.

## Referensi

- [Dokumentasi NestJS — Validasi, Serialisasi, OpenAPI, Keamanan](https://docs.nestjs.com/)
- [Spesifikasi OpenAPI 3.1](https://spec.openapis.org/oas/latest.html)
- [RFC 7807 — Problem Details untuk HTTP API](https://www.rfc-editor.org/rfc/rfc7807)
- [Pact — Consumer-Driven Contract Testing](https://docs.pact.io/)
- [Spectral — Linting OpenAPI](https://github.com/stoplightio/spectral)
- [k6 — Load Testing](https://k6.io/docs/)
- [BullMQ — Antrean Berbasis Redis untuk NestJS](https://docs.bullmq.io/)

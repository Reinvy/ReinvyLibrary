---
title: "Silabus Pengembangan Web Elysia.js"
description: "Kurikulum komprehensif 12 minggu untuk mempelajari Elysia.js, framework web modern berbasis Bun, mencakup fundamental, validasi TypeBox, plugin, pengujian, dan deployment produksi."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Web Elysia.js

## Ringkasan

Elysia.js adalah framework web modern berperforma tinggi yang dibangun khusus untuk runtime Bun. Framework ini menggabungkan desain API yang elegan terinspirasi dari Express.js dan Koa dengan dukungan TypeScript kelas satu melalui validasi skema TypeBox, sistem plugin yang kuat, dan pembuatan dokumentasi OpenAPI bawaan.

Kurikulum 12 minggu ini dirancang untuk pengembang yang sudah memiliki pengetahuan dasar JavaScript/TypeScript dan ingin menguasai pembuatan API web production-ready dengan Elysia.js. Anda akan mempelajari framework ini dari dasar—konsep inti, penanganan request, validasi, middleware, plugin, integrasi database, pengujian, dan deployment—yang berpuncak pada proyek akhir berupa REST API.

## Kurikulum

### Minggu 1: Pengenalan Elysia.js dan Runtime Bun

- **Ikhtisar Ekosistem**
  - Apa itu Bun? Fitur runtime dan karakteristik performa
  - Mengapa Elysia.js? Perbandingan dengan Express.js, Hono, dan framework lain
  - Toolchain Bun: bun install, bun run, bun test, bunx
- **Pengaturan Proyek**
  - Menginstal Bun dan membuat proyek Elysia.js baru
  - Konvensi struktur proyek
  - Konfigurasi TypeScript untuk proyek Elysia.js
- **Aplikasi Hello World**
  - Pola `new Elysia().listen()`
  - Memahami instance aplikasi dan siklus hidup request
  - Hot reloading dengan `bun --watch`

### Minggu 2: Fundamental Routing

- **Handler Metode HTTP**
  - Mendefinisikan route dengan `.get()`, `.post()`, `.put()`, `.delete()`, `.patch()`
  - Rantai definisi route
- **Parameter Route**
  - Parameter path (sintaks `:id`, `:slug`)
  - Parameter query (properti `query`)
  - Pengelompokan route dengan `.group()`
- **Objek Request dan Response**
  - Mengakses body request, header, dan IP
  - Mengatur status code, header, dan body response
  - Response streaming

### Minggu 3: Validasi Input dengan TypeBox

- **Pengenalan TypeBox**
  - Apa itu TypeBox? Hubungan dengan JSON Schema
  - Sistem tipe TypeBox: `t.String()`, `t.Number()`, `t.Boolean()`, `t.Object()`
- **Validasi Berbasis Skema**
  - Memvalidasi body request dengan `.post('/path', { body: schema }, handler)`
  - Memvalidasi parameter query dan parameter path
  - Skema kompleks: `t.Optional()`, `t.Union()`, `t.Array()`, `t.Enum()`
- **Penanganan Error untuk Validasi**
  - Response error validasi default
  - Kustomisasi pesan error dan status code
  - Menggunakan hook `onError` untuk error validasi

### Minggu 4: Middleware dan Guard

- **Ikhtisar Lifecycle Hooks**
  - `onBeforeHandle`, `onAfterHandle`, `onError`, `onRequest`, `onResponse`
  - Urutan eksekusi hook dan pipeline request
- **Implementasi Middleware**
  - Middleware logging
  - Middleware autentikasi dan otorisasi
  - Rate limiting dengan hooks
- **Pola Guard**
  - Apa itu guard dan kapan menggunakannya
  - Menggabungkan guard dengan kelompok route
  - Komposisi guard untuk alur otorisasi kompleks

### Minggu 5: Sistem Plugin dan Organisasi Kode

- **Arsitektur Plugin**
  - Membuat dan menggunakan plugin dengan `.use()`
  - Konfigurasi dan opsi plugin
  - Plugin terbatas (scoped) vs global
- **State dan Decorator**
  - Berbagi state antar route dengan `.state()`
  - Injeksi dependensi dengan `.decorate()`
  - Mengakses decorator di handler route
- **Pola Organisasi Kode**
  - Struktur folder berbasis fitur
  - Memisahkan route, middleware, dan plugin ke dalam modul
  - Pendaftaran route secara dinamis

### Minggu 6: Integrasi Database

- **Integrasi Bun SQLite**
  - Mengatur driver SQLite bawaan Bun
  - Operasi CRUD dengan prepared statements
  - Migrasi dan manajemen skema
- **Opsi ORM**
  - Menggunakan Drizzle ORM dengan Elysia.js
  - Menggunakan Prisma dengan Elysia.js dan Bun
- **Pola Database**
  - Pola repository untuk akses data
  - Connection pooling dan manajemen transaksi
  - Penanganan error untuk operasi database

### Minggu 7: Autentikasi dan Otorisasi

- **Autentikasi JWT**
  - Menggunakan plugin `@elysiajs/jwt`
  - Generasi token, verifikasi, dan refresh
  - Melindungi route dengan guard auth
- **Manajemen Sesi**
  - Sesi berbasis cookie dengan `@elysiajs/cookie`
  - Pola autentikasi Bearer token
- **Kontrol Akses Berbasis Peran (RBAC)**
  - Implementasi RBAC dengan decorator dan guard
  - Middleware pengecekan izin

### Minggu 8: Upload File, CORS, dan File Statis

- **Penanganan Upload File**
  - Menggunakan plugin `@elysiajs/upload`
  - Upload file tunggal dan banyak
  - Validasi file (tipe, ukuran) dan strategi penyimpanan
- **Konfigurasi CORS**
  - Menggunakan plugin `@elysiajs/cors`
  - Mengonfigurasi origin, metode, dan header yang diizinkan
  - Menangani permintaan preflight
- **Melayani File Statis**
  - Menggunakan plugin `@elysiajs/static`
  - Organisasi aset statis dan header caching

### Minggu 9: WebSocket dan Fitur Real-Time

- **Dukungan WebSocket**
  - Route WebSocket dengan `.ws()`
  - Menyiarkan pesan ke klien yang terhubung
  - Siklus hidup koneksi: open, message, close, drain
- **Pola Real-Time**
  - Fundamental aplikasi chat
  - Notifikasi langsung dan event streaming
  - Pola broadcast berbasis ruangan

### Minggu 10: Pengujian

- **Pengujian Unit dengan Bun Test Runner**
  - Mengatur `bun test` dengan Elysia.js
  - Menguji handler route individual
  - Mocking dependensi dan decorator
- **Pengujian Integrasi**
  - Menggunakan `@elysiajs/testing` atau `bun test` dengan fetch API
  - Menguji endpoint HTTP end-to-end
  - Menguji validasi, response error, dan middleware
- **Organisasi Pengujian**
  - Pola Arrange-Act-Assert
  - Fixture dan factory pengujian
  - Laporan cakupan dengan `bun test --coverage`

### Minggu 11: Dokumentasi API dan OpenAPI

- **Generasi Swagger/OpenAPI**
  - Menggunakan plugin `@elysiajs/swagger`
  - Dokumentasi endpoint otomatis dari skema TypeBox
  - Mengonfigurasi metadata API, tag, dan deskripsi
- **Eden Treaty Klien Type-Safe**
  - Menghasilkan kode klien type-safe dengan Eden
  - Mengonsumsi API Elysia.js dengan keamanan tipe penuh
  - Eden Treaty untuk integrasi frontend-backend

### Minggu 12: Deployment Produksi dan Operasi

- **Build Produksi**
  - Build untuk produksi dengan `bun build`
  - Manajemen variabel lingkungan
  - Penanganan graceful shutdown
- **Strategi Deployment**
  - Mendeploy Elysia.js di Fly.io, Railway, dan Docker
  - Konfigurasi reverse proxy dengan Caddy atau Nginx
  - Endpoint health check dan readiness probes
- **Monitoring dan Observabilitas**
  - Logging terstruktur dengan middleware kustom
  - Metrik performa dan monitoring uptime
  - Pelacakan error dan pengaturan alerting

## Proyek Akhir

Bangun REST API production-grade untuk aplikasi manajemen tugas menggunakan Elysia.js. Proyek harus mencakup:

- Operasi CRUD lengkap untuk tugas, proyek, dan pengguna
- Validasi input TypeBox untuk semua input
- Autentikasi JWT dengan kontrol akses berbasis peran (admin, manajer, pengguna)
- Dukungan upload file untuk lampiran tugas
- Notifikasi real-time berbasis WebSocket untuk pembaruan tugas
- Integrasi database dengan SQLite dan Drizzle ORM
- Rangkaian pengujian komprehensif dengan unit dan integrasi
- Dokumentasi Swagger/OpenAPI
- Kontainerisasi Docker dan konfigurasi deployment
- Penanganan graceful shutdown dan endpoint health check

Hasil akhir: Repositori GitHub dengan kode sumber lengkap, rangkaian pengujian, dokumentasi API, dan panduan deployment.

## Kriteria Penilaian

- **Tugas (40%)**
  - Latihan coding mingguan berdasarkan konten modul
  - Partisipasi review kode dan umpan balik rekan
  - Kuis singkat tentang topik konseptual
- **Proyek Akhir (50%)**
  - Implementasi yang benar dari semua fitur yang diperlukan
  - Kualitas kode: modularitas, penanganan error, tipe TypeScript
  - Cakupan pengujian: minimal 70% line coverage
  - Kelengkapan dokumentasi API
  - Kesiapan deployment dan konfigurasi
- **Partisipasi (10%)**
  - Keterlibatan dalam diskusi dan review kode
  - Pengumpulan tugas tepat waktu

## Referensi

- [Dokumentasi Resmi Elysia.js](https://elysiajs.com/)
- [Dokumentasi TypeBox](https://github.com/sinclairzx81/typebox)
- [Dokumentasi Runtime Bun](https://bun.sh/docs)
- [Dokumentasi Drizzle ORM](https://orm.drizzle.team/)
- [Dokumentasi Eden Treaty](https://elysiajs.com/eden/treaty.html)
- [Repositori GitHub Elysia.js](https://github.com/elysiajs/elysia)

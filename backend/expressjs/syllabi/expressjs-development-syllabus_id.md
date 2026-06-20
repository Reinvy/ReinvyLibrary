---
title: "Silabus Pengembangan Express.js"
description: "Kurikulum komprehensif 12 minggu yang mencakup pengembangan backend Express.js dari dasar hingga deployment produksi, termasuk routing, middleware, integrasi database, autentikasi, pengujian, dan keamanan."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Express.js

## Ringkasan

Silabus 12 minggu ini menyediakan jalur pembelajaran terstruktur untuk menguasai pengembangan backend Express.js. Dimulai dari dasar-dasar routing dan middleware, kursus ini berlanjut melalui integrasi database, strategi autentikasi, pola desain API, pengujian, pengamanan, dan deployment produksi. Setiap modul menggabungkan konsep teoretis dengan latihan coding langsung, yang berpuncak pada proyek akhir yang mengintegrasikan semua keterampilan yang dipelajari. Di akhir kursus ini, peserta akan mampu membangun, menguji, dan men-deploy API RESTful dan aplikasi web tingkat produksi menggunakan Express.js.

## Kurikulum

### Modul 1: Pengenalan Express.js dan Persiapan Proyek
- **Apa itu Express.js?**
  - Sejarah, ekosistem, dan peran dalam lanskap Node.js
  - Perbandingan dengan framework lain (Koa, Fastify, Hapi)
- **Persiapan Lingkungan**
  - Instalasi Node.js dan npm
  - Inisialisasi proyek dengan `npm init`
  - Instalasi Express.js dan alat pendukung (nodemon, dotenv)
- **Pembuatan Server Dasar**
  - Objek aplikasi `express()`
  - Mendengarkan port dengan `app.listen()`
  - Memahami objek request dan response
- **Handler Route Pertama**
  - Dasar-dasar `app.get()`, `app.post()`
  - Mengirim respons JSON dengan `res.json()`
  - Mengirim HTML dengan `res.send()`

### Modul 2: Routing Mendalam
- **Metode dan Pola Route**
  - Handler GET, POST, PUT, PATCH, DELETE
  - Parameter route (`:id`, `:slug`)
  - Parameter query string (`req.query`)
- **Express Router**
  - Membuat file route modular dengan `express.Router()`
  - Mengorganisir route berdasarkan resource (users, products, orders)
  - `app.use()` untuk memasang router
- **Chaining Route dan Prinsip DRY**
  - Chaining `.route()` untuk handler dengan path yang sama
  - Definisi route terpusat

### Modul 3: Arsitektur Middleware
- **Memahami Middleware**
  - Siklus request-response dan tumpukan middleware
  - Fungsi `next()` dan urutan eksekusi middleware
- **Middleware Bawaan**
  - `express.json()` untuk parsing body JSON
  - `express.urlencoded()` untuk data form
  - `express.static()` untuk melayani file statis
- **Middleware Tingkat Aplikasi**
  - Middleware logging (logger kustom)
  - Pengukuran waktu dan performa request
  - Konfigurasi CORS dengan paket `cors`
- **Middleware Penanganan Error**
  - Handler error empat argumen `(err, req, res, next)`
  - Pemformatan respons error terpusat

### Modul 4: Validasi Request dan Penanganan Data
- **Validasi Input dengan Zod**
  - Definisi skema dengan `z.object()`
  - Validator string, number, email, uuid
  - Logika validasi kustom dan refinement
- **Pola Middleware Validasi**
  - Membuat middleware `validate()` yang dapat digunakan kembali
  - Validasi body, params, dan query request
  - Mengembalikan error validasi terstruktur
- **Penanganan Upload File**
  - Konfigurasi Multer untuk upload file tunggal dan banyak
  - Batasan ukuran file dan filter tipe
  - Melayani file yang diunggah

### Modul 5: Integrasi Database
- **Bekerja dengan MongoDB dan Mongoose**
  - Definisi skema dengan `mongoose.Schema()`
  - Model, virtuals, dan instance methods
  - Operasi CRUD: create, read, update, delete
  - Population dan referensi antar koleksi
- **Bekerja dengan PostgreSQL dan Prisma**
  - Definisi skema dengan bahasa skema Prisma
  - Migrasi dan seeding
  - Query Prisma Client: `findMany`, `create`, `update`, `delete`
  - Query relasi (include, nested writes)
- **Repository Pattern**
  - Mengabstraksi operasi database ke dalam kelas repository
  - Berpindah ORM tanpa mengubah logika bisnis
  - Unit testing repository dengan database in-memory

### Modul 6: Autentikasi dan Otorisasi
- **Autentikasi Berbasis Session**
  - Konfigurasi `express-session`
  - Session store dengan Redis/connect-redis
  - Alur login/logout dan manajemen session
- **Autentikasi Berbasis JWT**
  - Generasi token dengan `jsonwebtoken`
  - Access token vs refresh token
  - Middleware verifikasi JWT
  - Rotasi refresh token dan pencabutan
- **OAuth 2.0 dan Social Login**
  - Alur authorization code OAuth 2.0
  - Konfigurasi strategi Passport.js (Google, GitHub)
  - Penautan akun pihak ketiga
- **Role-Based Access Control (RBAC)**
  - Model role dan permission
  - Middleware otorisasi dengan pengecekan role
  - Kontrol akses tingkat resource

### Modul 7: Desain API RESTful
- **Prinsip Desain API**
  - Konvensi penamaan resource (plural nouns, kebab-case)
  - Kode status HTTP dan semantiknya
  - Format response envelope yang konsisten
- **Paginasi, Filtering, dan Sorting**
  - Paginasi berbasis cursor vs offset
  - Konvensi parameter query untuk filter
  - Arah sorting dan sorting multi-field
- **Strategi Versioning API**
  - Versioning berbasis URL (`/api/v1/`, `/api/v2/`)
  - Versioning berbasis header
  - Strategi depresiasi dan migrasi
- **Dokumentasi API dengan Swagger**
  - Setup swagger-jsdoc dan swagger-ui-express
  - Mendokumentasikan endpoint, parameter, dan skema
  - Membuat spesifikasi OpenAPI secara otomatis

### Modul 8: Penanganan Error dan Logging
- **Penanganan Error Terpusat**
  - Kelas error kustom (AppError, NotFoundError, ValidationError)
  - Async error wrapper untuk eliminasi try/catch
  - Struktur respons error yang konsisten
- **Logging dengan Winston dan Morgan**
  - Konfigurasi Winston logger (transports, formats)
  - Logging request HTTP dengan Morgan
  - Level log dan logging berbasis lingkungan
- **Graceful Shutdown**
  - Penanganan sinyal SIGTERM dan SIGINT
  - Menutup koneksi database dan server
  - Menguras request aktif sebelum shutdown

### Modul 9: Pengujian
- **Unit Testing dengan Jest**
  - Struktur tes: describe, it, expect
  - Mocking dependensi dengan `jest.mock()`
  - Pengujian middleware secara terisolasi
- **Integration Testing dengan Supertest**
  - Menjalankan aplikasi Express dalam mode test
  - Pengujian endpoint API end-to-end
  - Setup dan teardown database dengan test fixtures
- **Cakupan Tes dan Integrasi CI**
  - Laporan cakupan Jest dan threshold
  - Workflow GitHub Actions untuk pengujian otomatis
  - Pengujian dengan beberapa versi Node.js

### Modul 10: Keamanan
- **Kerentanan Web Umum**
  - Pencegahan Cross-Site Scripting (XSS) dengan helmet
  - Konfigurasi Cross-Origin Resource Sharing (CORS)
  - Pencegahan injeksi SQL/NoSQL
- **Rate Limiting dan Perlindungan Brute Force**
  - Konfigurasi express-rate-limit
  - Rate limiting terdistribusi dengan Redis
  - Kebijakan lockout akun
- **Header Keamanan HTTP**
  - Helmet.js untuk header keamanan (CSP, HSTS, X-Frame-Options)
  - Konfigurasi Content Security Policy
- **Sanitasi Input**
  - Sanitasi input pengguna dengan express-mongo-sanitize
  - Mencegah parameter pollution

### Modul 11: Optimasi Performa dan Deployment Produksi
- **Optimasi Performa**
  - Kompresi respons dengan `compression`
  - Konfigurasi ETag dan caching header
  - Optimasi query database (indexing, select hanya field yang diperlukan)
  - Connection pooling dengan database client
- **Manajemen Proses dengan PM2**
  - Mode cluster untuk utilisasi multi-core
  - Zero-downtime reloads dan graceful shutdown
  - Konfigurasi ecosystem file PM2
- **Containerization dengan Docker**
  - Multi-stage Dockerfile untuk aplikasi Node.js
  - Docker Compose untuk setup multi-service
  - Health checks dan readiness probes container
- **Integrasi CI/CD Pipeline**
  - GitHub Actions untuk testing dan deployment berkelanjutan
  - Manajemen environment variable
  - Strategi deployment blue-green dan rolling

### Modul 12: Proyek Akhir — REST API Tingkat Produksi
- **Persyaratan Proyek**
  - Bangun RESTful API lengkap (misalnya e-commerce, blog platform, task manager)
  - Implementasikan semua fitur inti: CRUD, autentikasi, upload file, pencarian, paginasi
- **Arsitektur dan Perencanaan**
  - Struktur proyek berbasis fitur
  - Dokumen spesifikasi API
  - Desain skema database
- **Implementasi**
  - Setup Express.js dengan TypeScript (opsional)
  - Implementasi semua endpoint dengan validasi dan penanganan error
  - Tambahkan autentikasi dan otorisasi
  - Tulis tes yang komprehensif
- **Dokumentasi dan Deployment**
  - Generate dokumentasi Swagger/OpenAPI
  - Containerize dengan Docker
  - Deploy ke platform cloud (Render, Railway, atau AWS)
  - Setup monitoring dan logging

## Proyek Akhir

Peserta akan merancang dan membangun RESTful API tingkat produksi yang lengkap menggunakan Express.js. Proyek harus mencakup hal-hal berikut:

- **Autentikasi pengguna** dengan JWT, termasuk registrasi, login, dan alur refresh token
- **Operasi CRUD** untuk setidaknya tiga resource terkait dengan validasi yang tepat
- **Fungsi upload file** dengan Multer atau integrasi cloud storage
- **Paginasi, filtering, dan sorting** untuk endpoint daftar
- **Role-based access control** untuk route yang dilindungi
- **Rangkaian tes komprehensif** dengan Jest dan Supertest (minimal 80% cakupan)
- **Dokumentasi API** menggunakan Swagger/OpenAPI
- **Containerization Docker** dengan Dockerfile dan docker-compose.yml
- **Deployment** ke platform cloud dengan konfigurasi environment
- **Graceful shutdown** dan logging error dengan Winston

Peserta akan mengirimkan URL repositori proyek beserta laporan singkat yang menjelaskan keputusan arsitektural, desain skema database, dan trade-off yang dibuat selama pengembangan.

## Kriteria Penilaian

- **Tugas (40%)**: Latihan coding mingguan dikirimkan melalui repositori GitHub. Setiap modul mencakup tugas praktis yang memperkuat konsep yang dibahas. Pengiriman dievaluasi berdasarkan kebenaran, kualitas kode, dan kepatuhan terhadap praktik terbaik.
- **Proyek Tengah Semester (20%)**: Proyek API dengan ruang lingkup lebih kecil di akhir Modul 6 yang menunjukkan kemahiran dengan routing Express.js, middleware, integrasi MongoDB/PostgreSQL, dan autentikasi berbasis JWT.
- **Proyek Akhir (40%)**: Evaluasi berdasarkan:
  - **Fungsionalitas (30%)**: Semua fitur yang diperlukan berfungsi dengan benar dan menangani kasus tepi
  - **Kualitas Kode (25%)**: Kode yang bersih, modular, dan terdokumentasi dengan baik mengikuti praktik terbaik
  - **Pengujian (20%)**: Cakupan tes, kualitas kasus tes, dan cakupan kasus tepi
  - **Dokumentasi (15%)**: Dokumentasi API yang jelas, README dengan instruksi setup, keputusan arsitektural
  - **Deployment (10%)**: API berhasil di-deploy dan dapat diakses dengan konfigurasi environment yang tepat

## Referensi

- [Dokumentasi Resmi Express.js](https://expressjs.com/)
- [MDN Web Docs: Pengenalan Express/Node](https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs)
- [Dokumentasi Resmi Mongoose](https://mongoosejs.com/)
- [Dokumentasi Prisma](https://www.prisma.io/docs/)
- [Framework Pengujian Jest](https://jestjs.io/docs/getting-started)
- [Repositori GitHub Supertest](https://github.com/ladjs/supertest)
- [JWT.io Pengenalan JSON Web Token](https://jwt.io/introduction)
- [Dokumentasi PM2 Process Manager](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/)
- [Dokumentasi Resmi Docker untuk Node.js](https://docs.docker.com/language/nodejs/)
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Spesifikasi Swagger/OpenAPI](https://swagger.io/specification/)

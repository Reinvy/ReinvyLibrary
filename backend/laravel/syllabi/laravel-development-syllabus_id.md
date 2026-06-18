---
title: "Silabus Pengembangan Laravel"
description: "Kurikulum 12 minggu yang komprehensif untuk menguasai pengembangan Laravel dari dasar PHP OOP hingga deployment produksi, mencakup arsitektur MVC, Eloquent ORM, pengembangan API, pengujian, dan keamanan."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Laravel

## Ringkasan

Silabus 12 minggu ini menyediakan jalur pembelajaran terstruktur berbasis proyek untuk menguasai pengembangan Laravel. Dimulai dengan penyegaran PHP OOP dan fundamental Composer, kurikulum secara progresif membangun melalui arsitektur MVC, routing, Eloquent ORM, templating Blade, autentikasi, pengembangan API, pengujian, deployment, dan pengamanan. Setiap minggu menggabungkan pembelajaran konseptual dengan coding langsung, yang berpuncak pada proyek kapstone di mana siswa membangun platform manajemen tugas multi-tenant yang lengkap. Kursus ini dirancang untuk pengembang dengan pengetahuan PHP dasar yang ingin beralih ke pengembangan Laravel profesional.

## Kurikulum

### Minggu 1: Review PHP OOP dan Fundamental Composer

- **PHP Berorientasi Objek**
  - Kelas, objek, pewarisan, interface, trait, dan kelas abstrak.
  - Namespace dan autoloading PSR-4.
  - Injeksi dependensi dan konsep service container.
- **Composer Mendalam**
  - Struktur `composer.json`, `require` vs `require-dev`.
  - Batasan versi (`^`, `~`, `*`, eksak).
  - Konfigurasi autoloading (`psr-4`, `classmap`, `files`).
  - Membuat dan mempublikasikan paket Composer kustom.
- **Praktik**: Buat library PHP dengan pola OOP, publikasikan melalui Composer, dan gunakan dalam proyek uji.

### Minggu 2: Arsitektur MVC Laravel dan Struktur Proyek

- **Instalasi Laravel**
  - Composer create-project vs Laravel Sail (Docker).
  - Konfigurasi lingkungan dengan `.env`.
- **Siklus Hidup Permintaan**
  - Titik masuk (`public/index.php`), Kernel, service provider.
  - Bagaimana route, middleware, controller, dan view membentuk respons.
- **Struktur Direktori**
  - `app/`, `config/`, `database/`, `resources/`, `routes/`, `storage/`.
  - Filosofi convention over configuration.
- **Praktik**: Instal Laravel, jelajahi struktur direktori, buat route dan controller "Halo Dunia".

### Minggu 3: Routing — Web dan API

- **File Route**
  - `routes/web.php` (berbasis session, tampilan Blade).
  - `routes/api.php` (stateless, respons JSON).
  - `routes/console.php` (perintah Artisan).
- **Metode dan Pola Route**
  - GET, POST, PUT, PATCH, DELETE, dan resourceful routing.
  - Parameter route, konstrain, dan named route.
  - Grup route, prefiks, dan penugasan middleware.
- **Route Model Binding**
  - Binding implisit dan eksplisit.
  - Binding kunci kustom.
- **Praktik**: Desain route untuk sistem blog dengan route web (halaman publik) dan route API (endpoint CRUD).

### Minggu 4: Eloquent ORM — Model, Migrasi, dan Relasi

- **Migrasi**
  - Metode pembangun skema, tipe kolom, indeks, foreign key.
  - Rollback migrasi dan squashing.
- **Model Eloquent**
  - Konvensi (nama tabel, primary key, timestamps).
  - `$fillable`, `$guarded`, `$casts`, `$appends`, `$hidden`.
  - Accessor, mutator, dan attribute casting.
- **Relasi**
  - One-to-one, one-to-many, many-to-many, has-many-through.
  - Relasi polimorfik.
  - Eager loading (`with()`, `load()`), masalah N+1.
- **Query Scopes**
  - Scope lokal dan global.
- **Praktik**: Bangun skema database lengkap untuk sistem e-commerce dengan produk, kategori, pesanan, dan pengguna.

### Minggu 5: Blade Templating dan Integrasi Frontend

- **Sintaks Blade**
  - `{{ }}` output escape, `{!! !!}` output mentah.
  - Struktur kontrol (`@if`, `@foreach`, `@while`, `@switch`).
  - `@include`, `@extends`, `@section`, `@yield`.
- **Komponen Blade**
  - Komponen berbasis kelas dan komponen anonim.
  - Slot dan atribut komponen.
- **Form dan CSRF**
  - Directive `@csrf`, `@method`.
  - Form model binding.
- **Integrasi Vite**
  - Setup Laravel Vite untuk bundling aset CSS/JS.
- **Praktik**: Bangun UI daftar produk dan checkout dengan komponen Blade, validasi form, dan pipeline aset Vite.

### Minggu 6: Autentikasi dan Otorisasi

- **Laravel Breeze / Jetstream**
  - Scaffolding autentikasi dengan Breeze (Blade + Alpine.js atau Inertia).
  - Autentikasi dua faktor dengan Jetstream.
- **Gate dan Policy Otorisasi**
  - Mendefinisikan gate di `App\Providers\AuthServiceProvider`.
  - Membuat dan mendaftarkan policy.
  - Menggunakan `@can`, `@cannot` di Blade, `can()` di controller.
- **Izin Laravel (Spatie)**
  - Manajemen peran dan izin.
- **Praktik**: Tambahkan otorisasi berbasis peran (admin, editor, viewer) ke aplikasi e-commerce.

### Minggu 7: Pengembangan API dengan Laravel

- **Desain RESTful API**
  - Resource controller, API resource, dan transformer.
  - Struktur respons JSON dan kode status HTTP.
- **Laravel Sanctum**
  - Autentikasi berbasis token untuk SPA dan aplikasi mobile.
  - Kemampuan dan scope token.
- **Versioning API**
  - Prefiks URL vs versioning berbasis header.
  - Praktik terbaik untuk kompatibilitas mundur.
- **Dokumentasi API**
  - Scribe atau Scramble untuk spesifikasi OpenAPI yang dibuat otomatis.
- **Praktik**: Bangun JSON API untuk sistem e-commerce dengan autentikasi Sanctum, koleksi resource, pagination, dan dokumentasi API.

### Minggu 8: Validasi Form dan Penanganan Error

- **Validasi Form Request**
  - Membuat kelas Form Request kustom.
  - Objek Rule, aturan validasi kustom.
  - Hook `before_validation` dan `after_validation`.
- **Penanganan Error**
  - Kelas eksepsi kustom.
  - Render eksepsi di `bootstrap/app.php` (atau kelas `Handler`).
  - Respons error JSON yang konsisten untuk API.
- **Logging**
  - Stack Log Laravel (single, daily, syslog, Slack, Papertrail).
  - Logging terstruktur dan pengayaan konteks.
- **Praktik**: Implementasikan validasi form dan penanganan error yang komprehensif untuk alur pemesanan e-commerce.

### Minggu 9: Pengujian dengan PHPUnit

- **Fundamental Pengujian**
  - Konfigurasi PHPUnit dan helpers pengujian Laravel.
  - `RefreshDatabase`, `DatabaseTransactions`, `DatabaseMigrations`.
- **Pengujian Fitur**
  - HTTP tests (`get()`, `post()`, `put()`, `delete()`).
  - Helpers autentikasi dan session.
  - Assertions (`assertStatus`, `assertJson`, `assertDatabaseHas`).
- **Pengujian Unit**
  - Menguji model, service, dan kelas kustom.
  - Mocking dengan Mockery.
- **Pengujian Browser (Laravel Dusk)**
  - Pengujian JavaScript ujung-ke-ujung.
- **Test-Driven Development**
  - Siklus red-green-refactor.
- **Praktik**: Tulis pengujian fitur yang mencapai cakupan kode 80%+ untuk API e-commerce.

### Minggu 10: Queue, Event, dan Broadcasting

- **Laravel Queues**
  - Kelas job, dispatch, penundaan, dan chaining.
  - Queue worker dan supervisor (Supervisor).
  - Dashboard Horizon untuk monitoring queue.
- **Event dan Listener**
  - Mendefinisikan event dan listener.
  - Event subscriber dan queued event listener.
- **Broadcasting**
  - Event real-time dengan Pusher atau Reverb.
  - Presence channel dan private channel.
- **Penjadwalan Tugas**
  - Penjadwalan perintah Artisan dengan `schedule()`.
- **Praktik**: Implementasikan pemrosesan pesanan berbasis event dengan queue worker (kirim email konfirmasi, perbarui inventaris, notifikasi admin).

### Minggu 11: Caching, Performa, dan Deployment

- **Strategi Caching**
  - Driver cache: file, database, Redis, Memcached.
  - Cache tag, cache lock, dan atomic lock.
  - Query caching dengan `remember()` dan `rememberForever()`.
- **Optimasi Performa**
  - Route caching: `php artisan route:cache`.
  - Config caching: `php artisan config:cache`.
  - View caching, event caching.
  - Laravel Octane untuk serving performa tinggi.
- **Deployment**
  - Laravel Forge untuk manajemen server.
  - Envoyer untuk deployment tanpa downtime.
  - Pipeline CI/CD dengan GitHub Actions.
- **Praktik**: Deploy aplikasi e-commerce ke server produksi, konfigurasi caching Redis, dan setup Horizon untuk manajemen queue.

### Minggu 12: Keamanan, Monitoring, dan Awal Proyek Kapstone

- **Keamanan Laravel**
  - Perlindungan mass assignment, pencegahan SQL injection (Eloquent prepared statements).
  - Pertahanan XSS (escaping Blade), token CSRF.
  - Rate limiting, sanitasi input.
  - Header keamanan dengan paket `laravel-security`.
- **Monitoring dan Debugging**
  - Laravel Telescope untuk wawasan request/exception/query.
  - Sentry atau Flare untuk pelacakan error.
  - Health check dan alerting.
- **Proyek Kapstone**
  - Siswa mulai membangun platform manajemen tugas multi-tenant.
  - Persyaratan: autentikasi, akses berbasis peran, desain API-first, queue worker, caching Redis, pengujian komprehensif, dan pipeline CI/CD.

## Proyek Akhir

**Platform Manajemen Tugas Multi-Tenant**: Siswa membangun aplikasi gaya SaaS lengkap di mana beberapa organisasi (tenant) dapat mengelola tugas mereka secara independen. Fitur yang diperlukan:

- Isolasi tenant melalui scoping database (database tunggal dengan tenant_id atau database terpisah).
- Sistem registrasi pengguna dan undangan dengan izin berbasis peran (admin, manager, member).
- CRUD untuk proyek, tugas, komentar, dan lampiran file.
- RESTful API untuk setiap sumber daya dengan autentikasi Sanctum.
- Queue job untuk mengirim notifikasi email dan menghasilkan laporan.
- Caching Redis untuk data yang sering diakses (daftar proyek, profil pengguna).
- Rangkaian pengujian komprehensif (pengujian fitur untuk semua endpoint API).
- Deployment ke produksi dengan Forge atau platform serupa.
- Dokumentasi API menggunakan Scribe atau Scramble.

## Kriteria Penilaian

- **Tugas Mingguan (30%)**: Setiap minggu mencakup latihan coding langsung yang membangun menuju proyek akhir. Pengiriman dievaluasi berdasarkan kebenaran, kualitas kode, dan kepatuhan terhadap konvensi Laravel.
- **Kuis Penilaian (20%)**: Kuis pilihan ganda dan jawaban singkat dua mingguan yang mencakup pemahaman konseptual MVC, Eloquent, routing, autentikasi, pengujian, dan keamanan.
- **Proyek Akhir (40%)**: Dievaluasi berdasarkan fungsionalitas (semua persyaratan terpenuhi), arsitektur kode (prinsip SOLID, pola desain), cakupan pengujian (80%+), dan kualitas deployment (zero-downtime, caching, monitoring).
- **Partisipasi Review Kode (10%)**: Siswa meninjau pull request rekan, memberikan umpan balik konstruktif tentang gaya kode, potensi bug, dan perbaikan arsitektur.

## Referensi

- [Dokumentasi Resmi Laravel](https://laravel.com/docs) — Referensi definitif untuk semua fitur Laravel.
- [Laracasts](https://laracasts.com) — Tutorial video Laravel dari tingkat pemula hingga mahir.
- [Laravel News](https://laravel-news.com) — Berita komunitas, paket, dan tutorial.
- [Paket Spatie Laravel](https://spatie.be/docs) — Paket berkualitas tinggi untuk izin, media, dan lainnya.
- [Laravel Bootcamp](https://bootcamp.laravel.com) — Pengantar langsung resmi untuk membangun aplikasi Laravel.
- [PHP The Right Way](https://phptherightway.com) — Pendamping praktik terbaik PHP.
- [Panduan Praktik Terbaik Laravel](/backend/laravel/guides/laravel-best-practices-guide_id) — Referensi pola produksi dalam repositori.
- [Cheat Sheet Laravel](/backend/laravel/cheatsheets/laravel-cheatsheet_id) — Referensi cepat perintah dan sintaks.

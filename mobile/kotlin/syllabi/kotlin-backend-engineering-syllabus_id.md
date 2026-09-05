---
title: "Silabus Rekayasa Backend Kotlin"
description: "Kurikulum 12 minggu tingkat lanjut untuk membangun aplikasi sisi server kelas produksi dengan Kotlin dan Ktor, mencakup routing, penyimpanan data dengan Exposed, autentikasi, WebSocket, pengujian, observabilitas, dan deployment."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Backend Kotlin

## Ringkasan

Silabus 12 minggu ini mempersiapkan pengembang untuk membangun layanan backend kelas produksi dengan Kotlin dan Ktor. Jika Silabus Pengembangan Android berfokus pada aplikasi sisi klien dan Silabus Kotlin Lanjutan mengeksplorasi internal bahasa dan kompilator, kurikulum ini beralih ke sisi server: cara merancang API REST dan WebSocket, menyimpan data dengan Exposed, mengamankan layanan dengan JWT dan OAuth 2.0, memproses pekerjaan latar belakang secara andal, menguji layanan dari luar ke dalam, dan meluncurkannya ke produksi dengan Docker dan Kubernetes. Setiap minggu memadukan landasan konseptual dengan implementasi langsung, dan kursus ini diakhiri dengan proyek akhir yang menggabungkan seluruh lapisan menjadi platform multi-layanan yang dapat di-deploy. Peserta diharapkan sudah lancar menulis Kotlin dan nyaman dengan coroutine, karena Kotlin sisi server sangat mengandalkan konkurensi terstruktur.

## Kurikulum

### Minggu 1: Fondasi Kotlin Sisi Server
- **Mengapa Kotlin di backend**: kedewasaan JVM, beragam model deployment target, DSL yang type-safe untuk routing dan konfigurasi
- **Pengaturan proyek**: Gradle Kotlin DSL, plugin application, manajemen dependensi dengan version catalog
- **embeddedServer Ktor**: engine Netty, CIO, dan Jetty, kriteria pemilihan engine, konfigurasi port dan host
- **Siklus hidup aplikasi**: modul `Application`, titik masuk `main`, pemuatan konfigurasi berbasis lingkungan
- **Endpoint pertama**: DSL routing, handler `get`/`post`, `call.respondText` versus `call.respond`
- **Praktik**: Buat layanan Ktor dengan dua endpoint REST dan logging terstruktur saat startup

### Minggu 2: Routing dan Semantik HTTP
- **DSL routing secara mendalam**: rute bersarang, parameter path, parameter query, segmen opsional
- **Permintaan type-safe**: `call.receive<T>()`, pipeline negosiasi konten, penanganan body yang rusak
- **Pemodelan respons**: `call.respond`, kode status, header, tipe respons kustom dengan `respond`
- **Desain resource**: konvensi REST, kata benda jamak, resource bertingkat, pertimbangan idempotensi
- **Pemetaan error**: plugin `StatusPages`, pemetaan exception ke respons secara bertipe, payload problem+json
- **Praktik**: Bangun API CRUD untuk resource `products` dengan validasi lengkap dan respons error yang baik

### Minggu 3: Plugin, Interceptor, dan Middleware
- **Arsitektur plugin**: pola install/configure, plugin bawaan versus plugin kustom
- **CallLogging**: logging permintaan/respons, level log, redaksi header sensitif
- **CORS dan DefaultHeaders**: kebijakan lintas origin, header keamanan (X-Content-Type-Options, HSTS)
- **Kompresi**: negosiasi gzip/brotli, kapan kompresi merugikan, override per-rute
- **Interceptor kustom**: pipeline `intercept`, hook fase permintaan/respons, propagasi correlation ID
- **Praktik**: Implementasikan plugin audit-log kustom yang mencatat setiap permintaan mutasi dengan correlation ID

### Minggu 4: Serialisasi, Validasi, dan Kontrak API
- **kotlinx.serialization di server**: DTO `@Serializable`, konfigurasi `Json`, strategi penamaan
- **Modul serialisasi**: `SerializersModule`, serializer kontekstual, payload polimorfik
- **Strategi validasi**: validasi manual versus `ktor-server-request-validation`, akumulasi error
- **Spesifikasi API**: pembuatan OpenAPI dengan Swagger UI, trade-off schema-first versus code-first
- **Versioning**: versioning URI, negosiasi header, evolusi field yang kompatibel ke belakang
- **Praktik**: Sediakan API publik ber-versi dengan spesifikasi OpenAPI, validasi ketat, dan kontrak error yang stabil

### Minggu 5: Penyimpanan Data dengan Exposed
- **DSL Exposed**: definisi `Table`, tipe kolom, constraint, indeks
- **DAO vs DSL**: `SuspendedQueries` dan lapisan DAO, kapan masing-masing abstraksi cocok
- **Relasi**: pemetaan one-to-many dan many-to-many, query `join`, eager versus lazy loading
- **Operasi batch**: insert massal, `upsert`, performa pembaruan batch
- **Connection pool**: konfigurasi HikariCP, ukuran pool, timeout, persiapan pemisahan baca/tulis
- **Praktik**: Modelkan skema e-commerce (users, orders, order items) dengan Exposed dan tulis jalur query utamanya

### Minggu 6: Migrasi, Transaksi, dan Integritas Data
- **Migrasi skema**: integrasi Flyway, migrasi SQL ber-versi, migrasi berulang
- **Manajemen transaksi**: `newSuspendedTransaction`, level isolasi, semantik rollback
- **Optimistic locking**: kolom versi, `update` dengan versi yang diharapkan, percobaan ulang saat konflik
- **Paginasi dan agregasi**: `limit`/`offset`, keyset pagination, `groupBy` dan `having`
- **Kolom JSON dan full-text**: JSONB PostgreSQL dengan Exposed, query `fts`
- **Praktik**: Tambahkan migrasi Flyway ke skema Minggu 5 dan implementasikan listing ter-paginasi yang aman dengan optimistic locking

### Minggu 7: Autentikasi dan Otorisasi
- **Provider autentikasi**: basic, bearer, JWT, OAuth 2.0, alur berbasis sesi di Ktor
- **JWT secara mendalam**: struktur token, algoritma penandatanganan, validasi issuer/audience, refresh token
- **Penanganan kata sandi**: Argon2id, manajemen salt, perbandingan timing-safe
- **Otorisasi**: kontrol akses berbasis peran, pemeriksaan izin di rute, propagasi principal
- **Multi-tenancy**: strategi isolasi tenant, propagasi konteks, pembatasan tingkat baris
- **Praktik**: Amankan API produk dengan autentikasi JWT, rotasi refresh token, dan endpoint admin berbasis peran

### Minggu 8: WebSocket dan Komunikasi Real-Time
- **Dasar WebSocket**: handshake, frame, keepalive ping/pong, backpressure
- **Ktor WebSockets**: handler rute `webSocket`, kanal `incoming`/`outgoing`, siklus hidup sesi
- **Manajemen koneksi**: registry sesi, heartbeat, penanganan pemutusan yang baik
- **Broadcasting**: fan-out ke klien yang terhubung, langganan per-ruangan, registry `ConcurrentHashMap`
- **Keamanan coroutine**: konteks per-koneksi, pembatalan saat tutup, pembersihan resource
- **Praktik**: Perluas platform dengan endpoint WebSocket chat atau notifikasi langsung lengkap dengan ruangan dan heartbeat

### Minggu 9: Pemrosesan Latar Belakang dan Antrean Pesan
- **Penjadwalan berbasis coroutine**: `launch` dalam scope aplikasi, tugas periodik, shutdown yang baik
- **Antrean kerja dengan Redis**: antrean berbasis list, klaim pekerjaan andal dengan `RPOPLPUSH` / skrip Lua
- **Integrasi Kafka**: API producer/consumer, consumer group, manajemen offset, pemrosesan idempoten
- **Penanganan retry dan dead-letter**: exponential backoff, anggaran retry, konsumen DLQ
- **Distributed locking**: alternatif Redlock, kunci berbasis sewa, fencing token
- **Praktik**: Implementasikan pipeline pemrosesan pesanan yang mengonsumsi antrean, menangani kegagalan, dan mencoba ulang dengan backoff

### Minggu 10: Pengujian Kotlin Sisi Server
- **Test application**: harness `testApplication`, rute pengujian, engine in-memory
- **Pengujian unit handler**: `withTestApplication`, request builder, asersi respons
- **Pengujian database**: Testcontainers untuk PostgreSQL, pola rollback transaksional
- **Mocking**: MockEngine untuk klien HTTP, repository tiruan, batas fake
- **Pengujian properti dan beban**: kotest property tests, skenario stres k6, asersi latensi
- **Praktik**: Tulis suite integrasi yang menjalankan seluruh aplikasi dengan Testcontainers dan mencakup alur API utama

### Minggu 11: Observabilitas, CI/CD, dan Deployment
- **Logging terstruktur**: encoder JSON logback, field cakupan permintaan, correlation ID ujung ke ujung
- **Metrik**: integrasi Micrometer, metrik JVM dan HTTP, metrik bisnis kustom
- **Tracing**: span OpenTelemetry, header propagasi trace, konfigurasi exporter
- **Health check**: perbedaan readiness versus liveness, agregasi kesehatan dependensi
- **Deployment**: Docker multi-stage build, manifest Kubernetes, manajemen secret, rolling update
- **Praktik**: Kontainerisasi layanan, deploy ke klaster Kubernetes lokal, dan verifikasi health check serta metrik

### Minggu 12: Proyek Akhir
- **Pembatasan proyek**: pilih platform multi-layanan dunia nyata (misalnya sistem pemesanan, layanan analitik, atau alat kolaborasi)
- **Arsitektur**: API REST plus WebSocket, persistensi Exposed dengan migrasi, autentikasi JWT, worker latar belakang
- **Implementasi**: bangun layanan lengkap dengan pengujian, observabilitas, dan deployment Docker/Kubernetes
- **Validasi**: load-test API, tinjau span trace dan metrik, dokumentasikan runbook operasional
- **Presentasi**: sampaikan tinjauan desain yang mencakup kontrak API, model data, penanganan kegagalan, dan keputusan skala

## Proyek Akhir

Peserta membangun **Platform Backend Kotlin Kelas Produksi** — layanan lengkap yang dapat di-deploy dan mendemonstrasikan setiap lapisan kurikulum. Proyek yang kuat menggabungkan: API REST ber-versi dengan validasi ketat dan dokumentasi OpenAPI; kanal WebSocket untuk pembaruan real-time; skema Exposed ternormalisasi yang dikelola migrasi Flyway; autentikasi JWT dengan rotasi refresh token dan otorisasi berbasis peran; pipeline pekerjaan latar belakang berbasis Redis atau Kafka dengan retry dan penanganan dead-letter; suite pengujian komprehensif menggunakan Testcontainers dan kotest property tests; serta deployment Docker dengan health check, log terstruktur, dan trace OpenTelemetry. Deliverable mencakup kode sumber lengkap, spesifikasi OpenAPI, README yang mendokumentasikan keputusan operasional, dan video walkthrough deployment singkat.

## Kriteria Penilaian

- **Tugas**: Latihan langsung mingguan (API CRUD, plugin, migrasi, alur autentikasi, konsumen antrean) yang dikirim sebagai repository kecil, dinilai berdasarkan kebenaran, kualitas desain API, dan cakupan pengujian.
- **Kuis**: Dua kuis singkat yang mencakup semantik routing/plugin, level isolasi transaksi, aturan validasi JWT, dan keamanan coroutine dalam konteks server.
- **Proyek Akhir**: Dievaluasi berdasarkan kesolidan arsitektur (batas layanan, pemodelan data), kualitas API dan keamanan (validasi, autentikasi, kontrak error), kesiapan operasional (observabilitas, health check, pengemasan), serta kejelasan tinjauan desain tertulis.
- **Partisipasi**: Tinjauan kode desain API rekan di minggu 4 dan 9, menilai kualitas umpan balik yang konstruktif.

## Referensi

- [Dokumentasi Ktor — Server](https://ktor.io/docs/server-create-a-new-project.html)
- [Panduan Coroutine Kotlin](https://kotlinlang.org/docs/coroutines-guide.html)
- [Dokumentasi JetBrains Exposed](https://www.jetbrains.com/help/exposed/getting-started.html)
- [Migrasi Database Flyway](https://documentation.red-gate.com/flyway)
- [Dokumentasi kotlinx.serialization](https://github.com/Kotlin/kotlinx.serialization)
- [Contoh Autentikasi JWT Resmi Ktor](https://github.com/ktorio/ktor-documentation/tree/main/codeSnippets/snippets/auth-jwt)
- [Dokumentasi OpenTelemetry Kotlin/Java](https://opentelemetry.io/docs/languages/java/)
- [Dokumentasi Metrik Micrometer](https://micrometer.io/docs)
- [Testcontainers untuk Java/Kotlin](https://java.testcontainers.org/)
- [Panduan Property Testing kotest](https://kotest.io/docs/proptest/property-based-testing.html)

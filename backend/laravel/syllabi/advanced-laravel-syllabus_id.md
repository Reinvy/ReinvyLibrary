---
title: "Silabus Arsitektur Laravel Tingkat Lanjut dan Rekayasa Produksi"
description: "Kurikulum lanjutan 12 minggu untuk pengembang Laravel berpengalaman yang mencakup arsitektur hexagonal dan clean architecture, CQRS dan desain berbasis event, internal service container, rekayasa performa Eloquent, pola multi-tenancy, caching Redis dalam skala besar, Laravel Octane, observabilitas dengan OpenTelemetry, penguatan keamanan terhadap OWASP Top 10, dan strategi pengujian tingkat lanjut."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Arsitektur Laravel Tingkat Lanjut dan Rekayasa Produksi

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk pengembang Laravel yang sudah mampu membangun aplikasi yang berjalan dan ingin menguasai keterampilan arsitektur serta rekayasa produksi yang membedakan engineer senior dari yang lainnya. Kurikulum ini sengaja meninggalkan wilayah "cara membuat CRUD" dan beralih ke masalah-masalah sulit: merancang aplikasi dengan arsitektur hexagonal dan clean architecture, memodelkan domain yang kompleks dengan CQRS dan domain events, memahami service container pada level internal framework, memaksimalkan performa Eloquent dalam skala besar, menerapkan multi-tenancy secara aman, menjalankan Laravel di atas Octane, dan mengoperasikan stack dengan observabilitas yang sesungguhnya.

Setiap modul memadukan teori mendalam dengan lab praktik yang mengharuskan peserta memfaktorkan ulang codebase nyata, membuat profil performa query, menginstrumentasi aplikasi dengan OpenTelemetry, dan melakukan load testing aplikasi Octane. Kursus ini berpuncak pada proyek akhir di mana peserta membangun platform SaaS multi-tenant kelas produksi yang menggabungkan setiap teknik yang dipelajari selama dua belas minggu.

Setelah menyelesaikan kursus ini, peserta akan mampu menalar internal Laravel alih-alih memperlakukan framework sebagai kotak hitam, mempertahankan keputusan arsitektur dengan analisis trade-off yang konkret, melenyapkan masalah performa dengan bukti berbasis profiling, mengamankan aplikasi dari kelas serangan nyata, dan mengoperasikan layanan dengan keandalan yang terukur.

## Kurikulum

### Modul 1: Pola Arsitektur Tingkat Lanjut — Hexagonal dan Clean Architecture (Minggu 1)

- **Mengapa arsitektur penting dalam skala besar**
  - Perbedaan antara desain yang berpusat pada framework dan yang berpusat pada domain
  - Bagaimana default MVC Laravel mengikat logika bisnis ke framework
  - Kapan memperkenalkan ports dan adapters — dan kapan tidak
- **Arsitektur hexagonal di Laravel**
  - Ports (antarmuka) dan adapters (implementasi) yang dipetakan ke konvensi Laravel
  - Menempatkan entitas domain, value objects, dan domain services dalam namespace `Domain`
  - Adapter infrastruktur untuk penyimpanan, email, dan HTTP dalam namespace `Infrastructure`
  - Merangkai adapter dengan binding di service provider
- **Lapisan clean architecture**
  - Entitas, use cases, dan interface adapters — dependency rule
  - Kelas use-case (action) sebagai unit logika aplikasi
  - Framework dan driver sebagai lapisan luar yang bergantung ke dalam
- **Lab Praktik**: Faktorkan ulang aplikasi Laravel yang didominasi controller menjadi struktur hexagonal, dengan mengekstrak logika domain inti ke dalam kelas use-case yang dilengkapi antarmuka

### Modul 2: Internal Service Container dan Penguasaan Dependency Injection (Minggu 2)

- **Bagaimana container sebenarnya bekerja**
  - Autowiring berbasis refleksi, resolusi binding, dan urutan resolusi kontekstual
  - `bind`, `singleton`, `scoped`, dan `instance` — semantik siklus hidup dan kapan masing-masing tepat
  - Tagged bindings dan `extend` untuk mendekorasi layanan
- **Pola resolusi tingkat lanjut**
  - Contextual bindings untuk implementasi berbeda per kelas konsumen
  - Menandai binding dengan `when()->needs()->give()` dan peta antarmuka-ke-implementasi
  - Event container: `resolving`, `afterResolving`, dan hook `rebinding`
- **Internal facade dan real-time facades**
  - Bagaimana facade me-resolve instance yang mendasarinya dari root container
  - Real-time facades dan kapan penggunaan tersebut memperjelas kemampuan uji
  - Helper `app()`, `App::make`, dan resolusi eksplisit dalam proses berumur panjang
- **Lab Praktik**: Bangun abstraksi penyedia pembayaran kustom dengan contextual bindings, tagged fallback providers, dan hook rebinding untuk invalidasi cache

### Modul 3: Rekayasa Performa Eloquent (Minggu 3)

- **Analisis query dan indexing**
  - Membaca keluaran `EXPLAIN` dan mengidentifikasi full table scans, filesort, dan key misses
  - Desain composite index untuk bentuk query yang paling umum
  - Covering indexes dan index-only scans di MySQL dan PostgreSQL
- **Menghilangkan N+1 dalam skala besar**
  - Nested dan constrained eager loading, `loadMissing`, serta `withCount`/`withSum`/`withExists`
  - Mendeteksi N+1 di produksi dengan query logging dan Telescope
  - Jebakan lazy loading dalam respons ter-serialisasi dan queue jobs
- **Strategi paginasi untuk dataset besar**
  - Offset vs cursor pagination dan biaya deep pagination
  - `chunkById` untuk operasi massal yang hemat memori dan pola primary-key watermark
  - Read/write splitting dengan koneksi database terpisah untuk workload pelaporan
- **Lab Praktik**: Buat profil query pelaporan yang lambat dengan `EXPLAIN`, rancang composite index, tulis ulang controller yang bermasalah N+1, dan ubah paginator offset dalam menjadi cursor pagination

### Modul 4: Desain Berbasis Event dan Internal Queue (Minggu 4)

- **Domain events dan siklus hidup event**
  - Membedakan event framework dari domain events
  - Membangkitkan event dari aggregate roots dan mempersistenskannya secara atomik
  - Event listeners, subscribers, dan batas `ShouldQueue`
- **Internal queue melampaui dasar-dasar**
  - Bagaimana worker loop queue melakukan polling, reservasi, dan retry job
  - Arsitektur Horizon: proses supervisor, strategi balancing, dan pruning queue
  - Unique jobs, throttled jobs, rate-limited jobs, dan job middleware
  - Job batching, chains, dan siklus hidup `then`/`catch`/`finally`
- **Pola pengiriman yang andal**
  - Job handler idempoten untuk semantik at-least-once
  - Ilusi exactly-once dan kunci deduplikasi
  - Penanganan dead-letter, kurva retry backoff, dan alur peninjauan failed job
- **Lab Praktik**: Rancang sistem inventaris berbasis domain events dengan persistensi event atomik, konsumen idempoten, dan konfigurasi Horizon yang disetel untuk campuran queue prioritas

### Modul 5: CQRS dan Proyeksi Read Model (Minggu 5)

- **Fundamental CQRS untuk tim Laravel**
  - Commands yang mengubah state dan queries yang membaca — model terpisah
  - Kapan CQRS penuh dibenarkan versus kapan service layer sudah cukup
  - Abstraksi command bus dan query bus dengan container Laravel
- **Read models dan proyeksi**
  - Read model denormalisasi yang diumpankan oleh domain events
  - Materialized views di PostgreSQL serta Redis hashes/sorted sets sebagai cache baca
  - Rebuild proyeksi, replay, dan data yang konsisten secara eventual
- **CQRS praktis tanpa formalisme berlebihan**
  - Kelas action-command dengan validator eksplisit dan transaksi
  - Kelas query yang mengembalikan DTO ringan alih-alih model Eloquent
  - Menjaga aturan bisnis sisi tulis di domain, bukan di controller
- **Lab Praktik**: Perkenalkan proyeksi read model untuk layar pelaporan, umpan dengan domain events, dan implementasikan perintah replay yang membangun ulang proyeksi dari event log

### Modul 6: Pola Multi-Tenancy (Minggu 6)

- **Model tenancy dan trade-off-nya**
  - Database tunggal dengan scoping `tenant_id` vs schema-per-tenant vs database-per-tenant
  - Implikasi biaya, isolasi, backup, dan migrasi dari masing-masing model
  - Pendekatan hibrida "pooled databases" untuk pertumbuhan
- **Identifikasi dan resolusi tenant**
  - Middleware identifikasi subdomain dan custom domain
  - Resolusi koneksi central dan tenant dengan konfigurasi database dinamis
  - Cache state tenant dan prefix cache per tenant
- **Jebakan scoping dan isolasi**
  - Melupakan scoping tenant pada query, job, event berantre, dan perintah terjadwal
  - Isolasi penyimpanan file dan kunci enkripsi per tenant
  - Kebocoran data lintas tenant pada relasi eager-loaded dan job ter-serialisasi
- **Lab Praktik**: Bangun aplikasi multi-tenant berbasis subdomain dengan query scopes berbasis tenant, prefix Redis per tenant, dan rangkaian pengujian yang membuktikan isolasi lintas tenant

### Modul 7: Caching Terdistribusi dan State dalam Skala Besar (Minggu 7)

- **Arsitektur cache melampaui `cache()->remember`**
  - Perlindungan cache stampede dengan lock dan early expiration
  - Cache tags, atomic locks, dan pola retry akuisisi lock
  - Kunci cache per tenant, per pengguna, dan sadar invalidasi
- **Struktur data Redis untuk state aplikasi**
  - Sorted sets untuk papan peringkat dan akuntansi rate limit
  - Streams untuk event log ringan dan pesan fan-out
  - HyperLogLog untuk perkiraan hitungan unik
- **Distributed locks dan kontrol konkurensi**
  - Akuisisi lock atomik dengan `Cache::lock`
  - Menghindari split-brain dengan TTL lock dan owner token
  - Alur re-entrant: mengunci di seluruh queue dan permintaan web
- **Lab Praktik**: Hilangkan cache stampede pada endpoint dashboard yang panas menggunakan early expiration, implementasikan rate limiter berbasis Redis dengan sorted sets, dan lindungi job berumur panjang dengan distributed lock

### Modul 8: Laravel Octane dan Internal Aplikasi Berumur Panjang (Minggu 8)

- **Arsitektur Octane**
  - Worker Swoole dan RoadRunner — apa yang berubah ketika PHP tidak keluar
  - Siklus hidup permintaan di dalam aplikasi persisten
  - Mengapa `config()`, `auth()`, dan `session()` melupakan state antar permintaan
- **Static state dan singleton dalam proses persisten**
  - Jebakan stateful property: objek yang menyimpan data berskala permintaan
  - Rebind container dan perilaku reset state `Sandbox`
  - Audit state global: `$_GLOBALS`, properti statis, dan closure berumur panjang
- **Penyetelan produksi Octane**
  - Jumlah worker, max requests, dan strategi reload yang mulus
  - Konfigurasi Supervisord untuk manager RoadRunner/Swoole
  - Load testing dengan `hey`/`wrk` dan membandingkan throughput dengan PHP-FPM
- **Lab Praktik**: Migrasikan aplikasi Laravel yang ada ke Octane, audit kebocoran state statis dengan alur kerja `octane:reload`, dan buat laporan load test sebelum/sesudah

### Modul 9: Observabilitas — Logging, Metrik, dan Tracing (Minggu 9)

- **Structured logging yang dilakukan dengan benar**
  - Contextual logging, log channels, dan API `Log::withContext`
  - Correlation ID yang disebarkan dari permintaan HTTP ke job berantre
  - Level log, sampling, dan menghindari data sensitif dalam log
- **Metrik dan OpenTelemetry**
  - Instrumentasi durasi permintaan, jumlah query, dan kedalaman queue dengan counter dan histogram
  - Span tracing OpenTelemetry untuk segmen HTTP, database, cache, dan queue
  - Ekspor ke Prometheus, Jaeger, atau Sentry Performance
- **Debugging produksi**
  - Telescope dalam skala besar: sampling, pruning, dan apa yang harus dikecualikan di produksi
  - Pelacakan error dengan Sentry/Flare dan penandaan rilis
  - Menentukan SLO untuk latensi dan tingkat error, lalu mengingatkan pada burn rate
- **Lab Praktik**: Tambahkan structured logging dengan correlation ID, instrumentasi layanan dengan OpenTelemetry, ekspor trace ke Jaeger, dan tentukan SLO beserta alert untuk API pemesanan

### Modul 10: Penguatan Keamanan Terhadap OWASP Top 10 (Minggu 10)

- **Kelas serangan yang dipetakan ke Laravel**
  - Penyintas SQL injection: raw queries, `DB::select`, dan `whereRaw` dengan input pengguna
  - Mass assignment melampaui `$fillable`: properti bersarang dan dinamis
  - Vektor XSS di Blade, rich text, dan API JSON — CSP sebagai lini pertahanan kedua
  - SSRF melalui fitur pengambilan URL, unggahan file, dan permintaan server-side
- **Keamanan autentikasi dan sesi**
  - Desain token Sanctum: abilities, kedaluwarsa token, dan pencabutan dalam skala besar
  - Session fixation, cookie flags, dan kebijakan same-site
  - Rate limiting per pengguna, per IP, dan per grup rute
- **Perlindungan data dan rahasia**
  - Enkripsi saat istirahat dengan rotasi app key, pola envelope encryption
  - Signed URLs, signed routes, dan payload webhook anti-rusak
  - Manajemen rahasia: injeksi lingkungan, integrasi vault, dan rotasi rahasia
- **Lab Praktik**: Audit keamanan aplikasi Laravel yang sengaja dibuat rentan, perbaiki setiap kelas OWASP, dan verifikasi perbaikan dengan rangkaian pengujian keamanan otomatis

### Modul 11: Strategi Pengujian Tingkat Lanjut untuk Sistem Kompleks (Minggu 11)

- **Desain pengujian pada level arsitektur**
  - Unit testing logika domain tanpa framework vs feature testing melalui HTTP
  - Test doubles: fakes, mocks (Mockery), dan spies untuk adapter eksternal
  - Data providers, pengujian berbasis dataset, dan pemikiran property-based
- **Database dan factory dalam skala besar**
  - RefreshDatabase vs DatabaseTransactions dan trade-off parallel testing
  - Factory states, sequences, dan after-making hooks untuk fixture realistis
  - Strategi seeding dan isolasi pengujian dalam multi-tenancy
- **Pengujian browser dan kontrak**
  - Dusk untuk perjalanan pengguna kritis dan penyiapan headless CI-nya
  - HTTP contract testing untuk integrasi pihak ketiga
  - Mutation testing dengan Infection untuk menilai kualitas suite
- **Lab Praktik**: Susun ulang suite yang hanya berisi feature test menjadi strategi pengujian berlapis, tambahkan cakupan Dusk untuk dua perjalanan kritis, dan jalankan Infection untuk menemukan serta membunuh mutant yang bertahan

### Modul 12: Proyek Akhir — Platform SaaS Multi-Tenant Kelas Produksi (Minggu 12)

- **Ringkasan proyek**
  - Bangun platform kolaborasi tim multi-tenant dengan workspace, proyek, dan laporan
  - Kebutuhan merangkum semua yang dipelajari: struktur hexagonal, read model CQRS, domain events, multi-tenancy, caching Redis, deployment Octane, instrumentasi OpenTelemetry, dan keamanan yang diperkuat OWASP
  - Architecture decision records yang mendokumentasikan setiap trade-off utama
- **Milestone pengiriman**
  - Minggu 12a: Model domain, use cases, dan perangkaian container selesai
  - Minggu 12b: Read model, integrasi berbasis event, dan topologi queue berjalan
  - Minggu 12c: Observabilitas, load testing, dan audit keamanan selesai
  - Minggu 12d: Presentasi akhir dengan bukti performa dan keandalan
- **Fokus evaluasi**
  - Konsistensi arsitektur, jaminan isolasi, anggaran performa terukur, dan postur keamanan defense-in-depth

## Proyek Akhir

**Platform Kolaborasi Tim Multi-Tenant**: Peserta merancang dan membangun aplikasi SaaS kelas produksi di mana organisasi independen berkolaborasi dalam workspace yang terisolasi. Elemen yang diwajibkan:

- Struktur proyek hexagonal dengan entitas domain, kelas use-case, dan adapter infrastruktur yang dirangkai melalui container.
- Multi-tenancy yang diimplementasikan dengan resolusi subdomain, query scopes berbasis tenant, dan namespace cache per tenant, dibuktikan oleh pengujian isolasi.
- Integrasi berbasis event: domain events dipersistensikan secara atomik dan dikonsumsi oleh listener berantre yang idempoten yang mengumpankan read model denormalisasi.
- Pemisahan ala CQRS untuk area pelaporan, dengan proyeksi yang dibangun ulang oleh perintah replay dari event log.
- Caching berbasis Redis dengan perlindungan stampede dan distributed locks untuk operasi yang sensitif terhadap konkurensi.
- Deployment di Laravel Octane dengan manajemen Supervisord dan laporan load test yang mendokumentasikan throughput serta latensi sebelum dan sesudah penyetelan.
- Instrumentasi OpenTelemetry dengan metrik dan trace yang diekspor ke Prometheus/Jaeger, plus dashboard SLO untuk tingkat error dan latensi.
- Tinjauan penguatan OWASP Top 10 yang mencakup mass assignment, SSRF, XSS/CSP, rate limiting, dan penanganan rahasia.
- Rangkaian pengujian yang komprehensif: pengujian unit/feature berlapis, pengujian browser Dusk untuk perjalanan kritis, dan hasil mutation testing.

## Kriteria Penilaian

- **Lab Mingguan (30%)**: Setiap lab praktik modul dikirim sebagai pull request dan dievaluasi berdasarkan kebenaran, kedalaman analisis, dan kepatuhan terhadap pola arsitektur yang diajarkan.
- **Architecture Decision Records (15%)**: Peserta mendokumentasikan setidaknya lima trade-off signifikan (model tenancy, batas CQRS, strategi cache, topologi queue, stack observabilitas) dengan alternatif eksplisit dan alasan yang dipilih.
- **Proyek Akhir (40%)**: Dievaluasi berdasarkan jaminan isolasi multi-tenant, kualitas desain berbasis event, performa terhadap anggaran yang dinyatakan, postur keamanan, dan kelengkapan pengaturan observabilitas.
- **Partisipasi Review Kode (15%)**: Peserta meninjau pull request proyek akhir rekan, berfokus pada konsistensi arsitektur, risiko keamanan, dan masalah kesiapan produksi.

## Referensi

- [Dokumentasi Resmi Laravel](https://laravel.com/docs) — Referensi container, queue, caching, Octane, dan keamanan.
- [Dokumentasi Laravel Octane](https://laravel.com/docs/octane) — Arsitektur dan konfigurasi Swoole/RoadRunner.
- [Dokumentasi OpenTelemetry PHP](https://opentelemetry.io/docs/languages/php/) — Panduan tracing, metrik, dan instrumentasi.
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — Kelas kerentanan yang dibahas di Modul 10.
- [Martin Fowler — CQRS](https://martinfowler.com/bliki/CQRS.html) — Fundamental pemisahan command/query.
- [Arsitektur Hexagonal (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/) — Esai ports-and-adapters yang asli.
- [Laracasts — Advanced Eloquent](https://laracasts.com/series/advanced-eloquent) — Seri video lanjutan queue dan Eloquent.
- [Panduan Praktik Terbaik Laravel](/backend/laravel/guides/laravel-best-practices-guide) — Referensi pola produksi dalam repo.
- [Cheatsheet Eloquent Tingkat Lanjut](/backend/laravel/cheatsheets/laravel-eloquent-advanced-cheatsheet) — Referensi pendalaman Eloquent dalam repo.

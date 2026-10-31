---
title: "Silabus Rekayasa API Laravel"
description: "Kurikulum tujuh modul yang mengantar pengembang Laravel dari controller CRUD menuju API JSON kelas produksi, mencakup desain contract-first, autentikasi token, resource dan serialisasi, validasi, queue, pengujian otomatis, serta deployment tanpa downtime."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa API Laravel

## Ringkasan

Sebagian besar pengembang Laravel mengenal framework ini lewat stack web-nya: tampilan Blade, cookie sesi, pengiriman form, dan redirect. API membongkar seluruh asumsi tersebut. Tidak ada sesi yang bisa diandalkan, tidak ada halaman error HTML sebagai jaring pengaman, dan tidak ada manusia yang bisa menafsirkan respons yang ambigu. Semua kontrak bersifat mesin-ke-mesin, sehingga bentuk payload, makna status code, dan sifat idempoten sebuah operasi tulis berubah dari urusan kosmetik menjadi kewajiban rekayasa.

Silabus ini adalah kursus tujuh modul yang membangun ulang insting Laravel pembaca di sekitar batas API. Materi dimulai dari desain contract-first agar skema diputuskan sebelum controller dibuat, lalu berlapis ke autentikasi, serialisasi, validasi, pekerjaan asinkron, pengujian, dan berakhir pada deployment serta operasi. Setiap modul berisi satu minggu teori plus lab praktik yang memperluas proyek yang sama, sehingga peserta tidak pernah menulis potongan kode terpisah — di Modul 7 mereka mengoperasikan API yang mereka rancang sendiri di Modul 1.

Kursus ini sengaja jujur terhadap framework. Kemudahan Laravel (Sanctum, API Resource, FormRequest, queue, Pint, Octane) diajarkan bersama trade-off yang muncul di produksi: query N+1 yang tersembunyi di balik resource, kontrak paginasi yang rusak diam-diam, token yang tidak pernah kedaluwarsa, job yang retry menjadi tagihan ganda, dan deployment yang memutus request yang sedang berjalan. Peserta lulus dengan kemampuan mempertahankan desain API dalam review, bukan sekadar mengirimkannya.

## Kurikulum

### Modul 1: Desain API Contract-First (Minggu 1)

- **Resource dan penamaan**
  - Kata benda jamak, path kebab-case, dan verb yang dipindahkan keluar dari URL
  - Semantik status code: 200/201/204, 400 vs 422, 401 vs 403, 409, 429
  - Satu envelope error yang dipakai semua endpoint (`message`, `code`, `errors`, `trace_id`)
- **Membentuk kontrak sebelum kode**
  - Menulis deskripsi OpenAPI 3.1 lebih dulu lalu menurunkan controller darinya
  - Konvensi paginasi dan filter: page/size vs cursor, `?filter[status]=paid`
  - Strategi versioning (prefix `/v1` vs negosiasi media type) dan kebijakan deprecation
- **Idempotensi untuk operasi tulis**
  - Header `Idempotency-Key`, tabel penyimpan respons, dan replay saat pengiriman ganda
- **Lab Praktik**: Menyusun dokumen OpenAPI untuk API inventaris, lalu membuat route dan lapisan penanganan error bersama yang persis sesuai dokumen tersebut

### Modul 2: Autentikasi dan Otorisasi (Minggu 2)

- **Token vs sesi**
  - Personal access token Sanctum untuk klien first-party, cookie untuk SPA same-origin
  - Posisi Passport dan OAuth2 penuh — serta kapan keduanya berlebihan
  - Ability token, masa berlaku, rotasi, dan pencabutan saat kata sandi berubah
- **Otorisasi sebagai policy, bukan kondisional**
  - Policy dan gate yang terikat pada model; `authorize()` di controller dan form request
  - Scoping multi-tenant: mencegah pembacaan lintas tenant dengan global scope plus pemeriksaan policy
- **Ketahanan terhadap penyalahgunaan**
  - Rate limiter per route (`RateLimiter::for`) berbasis user, IP, dan tenant
  - Throttling login, sinyal credential stuffing, dan perbandingan token dengan waktu konstan
- **Lab Praktik**: Menambahkan autentikasi token dengan ability ke API inventaris, menulis policy untuk setiap route mutasi, dan membuktikan akses lintas tenant ditolak lewat test

### Modul 3: Resource dan Serialisasi (Minggu 3)

- **API Resource sebagai batas**
  - `JsonResource` dan `ResourceCollection` sebagai satu-satunya tempat bentuk payload didefinisikan
  - `whenLoaded`, `whenHas`, dan `mergeWhen` untuk field kondisional
  - Mengapa mengembalikan model Eloquent langsung membocorkan skema dan meningkatkan kopling
- **Relasi tanpa N+1**
  - `with()` di lapisan query, `whenLoaded()` di lapisan resource
  - `preventLazyLoading()` di luar produksi dan cara ia memunculkan query tersembunyi
  - Field hitungan dan agregasi tanpa memuat seluruh koleksi
- **Paginasi dan meta yang konsisten**
  - Satu envelope paginasi (`data`, `meta`, `links`) yang dipakai ulang di semua resource
  - Paginasi cursor untuk dataset besar dan terurut
- **Lab Praktik**: Merefaktor semua endpoint ke resource dengan envelope paginasi bersama, lalu menurunkan endpoint listing dari 40 query menjadi 3

### Modul 4: Validasi dan Siklus Hidup Request (Minggu 4)

- **FormRequest sebagai kontrak**
  - `rules()`, `authorize()`, `messages()`, dan `prepareForValidation()`
  - Validasi bersarang dan array dengan wildcard (`items.*.sku`)
  - Aturan kustom untuk batasan domain (keunikan SKU per tenant, transisi status)
- **Kegagalan yang bisa dibaca mesin**
  - Menormalkan payload 422 dan mengunci strukturnya lewat test
  - Membedakan error validasi dari konflik aturan bisnis (409/422)
- **Urutan middleware dan concern lintas-potong**
  - Request id, logging terstruktur, CORS, pemaksaan respons JSON, ETag/conditional GET
- **Lab Praktik**: Memindahkan semua validasi inline ke FormRequest, menambahkan middleware `trace_id`, dan menulis test yang memastikan envelope error persis sesuai kontrak

### Modul 5: Queue dan Pekerjaan API Asinkron (Minggu 5)

- **Apa yang layak keluar dari jalur request**
  - Notifikasi, pembuatan PDF, sinkronisasi pihak ketiga, dan agregasi berat
  - Merespons `202 Accepted` plus endpoint status job saat pekerjaan asinkron
- **Mekanika keandalan**
  - Retry dengan backoff, handler `failed()`, dan `ShouldBeUnique` untuk deduplikasi
  - Job idempoten — penjaga terhadap pembayaran yang diulang atau pengiriman ganda
  - Batching dengan `Bus::batch()` dan callback untuk pekerjaan fan-out
- **Queue di titik kritis**
  - Pola outbox untuk memancarkan event setelah commit; pengiriman `afterCommit`
  - Supervisor Horizon, prioritas queue, dan isolasi queue yang lambat
- **Lab Praktik**: Memindahkan pembuatan laporan dan pengiriman webhook ke job berqueue, membuat setiap job idempoten, dan mendemonstrasikan replay aman setelah kegagalan yang dipaksa

### Modul 6: Pengujian Permukaan API (Minggu 6)

- **Feature test lebih dahulu**
  - `RefreshDatabase`, factory dengan state, dan `actingAs` untuk route berbasis policy
  - Menguji status, struktur (`assertJsonStructure`), dan kegagalan validasi
  - Menguji batas otorisasi — test yang benar-benar menangkap kebocoran nyata
- **Mengisolasi dunia luar**
  - `Http::fake()`, `Bus::fake()`, `Queue::fake()`, serta fake Mail/Notification
  - Contract test terhadap dokumen OpenAPI agar penyimpangan spesifikasi menggagalkan build
- **Strategi kecepatan dan cakupan**
  - Parallel testing dengan database terpisah; `--parallel` di CI
  - Ambang coverage yang menyasar jalur berisiko (uang, auth, tenancy), bukan 100% demi gengsi
- **Lab Praktik**: Mencapai cakupan penuh pada jalur mutasi API inventaris dan menambahkan job CI yang gagal saat spesifikasi menyimpang atau cabang kritis tidak tercakup

### Modul 7: Deployment dan Operasi (Minggu 7)

- **Konfigurasi produksi**
  - `config:cache`, `route:cache`, `event:cache`, dan jebakan `env()` yang terbongkar karenanya
  - Octane (FrankenPHP/Swoole) — siklus hidup worker, kebocoran state, dan pemanasan awal
- **Rilis tanpa downtime**
  - Endpoint health dan readiness; menguras koneksi sebelum restart
  - Migrasi backward-compatible (expand/contract) agar kode lama dan baru bisa hidup bersama
- **Mengoperasikan API**
  - Log terstruktur dengan `trace_id`, pencatatan slow query, dan metrik yang layak diberi alert
  - Rate limit serta sesi berbasis Redis di banyak server aplikasi
- **Lab Praktik**: Men-deploy API di belakang load balancer, merilis migrasi expand/contract, dan membuktikan tidak ada request yang putus selama rolling restart

## Proyek Akhir

Peserta mengirim API inventaris-dan-pesanan yang sudah ter-deploy, terdokumentasi, dan teruji. Deliverable wajib mencakup dokumen OpenAPI terbit yang identik dengan server yang berjalan, autentikasi token dengan ability per route dan rate limit, resource dengan satu envelope paginasi tanpa pelanggaran lazy loading, validasi FormRequest di setiap endpoint mutasi, job berqueue untuk pembuatan laporan dan webhook keluar dengan penjaga idempotensi, serta rangkaian test yang mencakup batas otorisasi dan kegagalan validasi.

Komponen deployment dinilai sebagai bagian dari proyek: API berjalan di lingkungan mirip produksi dengan config dan route ter-cache, health check terhubung ke load balancer, log terstruktur membawa `trace_id`, dan rolling restart yang didemonstrasikan tanpa satu pun request gagal di access log. Catatan arsitektur singkat harus mempertahankan pilihan versioning, strategi paginasi, dan alasan penempatan pekerjaan asinkron.

## Kriteria Penilaian

- **Tugas**: Lab mingguan dinilai dari kesetiaan pada kontrak (bentuk payload, status code, envelope error), tidak adanya query N+1 pada endpoint listing, kebenaran test otorisasi, serta perilaku idempoten saat retry dipaksa. Lab yang lulus test sendiri tetapi meninggalkan jalur baca lintas tenant terbuka dinyatakan tidak lulus.
- **Proyek Akhir**: Dievaluasi pada empat area risiko — autentikasi dan otorisasi, integritas data saat retry, kesesuaian kontrak antara spesifikasi dan server, serta kesiapan operasional (health check, log, migrasi). Reviewer menjalankan ulang dokumen OpenAPI terhadap deployment baru dan membandingkan responsnya.
- **Peer Review**: Setiap peserta meninjau proyek satu rekannya dengan checklist yang sama dan menyusun temuan berdasar bukti request/response; kualitas tinjauan itu sendiri ikut dinilai.

## Referensi

- [Dokumentasi Laravel](https://laravel.com/docs) — referensi routing, middleware, validasi, queue, dan testing
- [Laravel Sanctum](https://laravel.com/docs/sanctum) — autentikasi token dan SPA
- [Eloquent API Resources](https://laravel.com/docs/eloquent-resources) — referensi lapisan serialisasi
- [Laravel Octane](https://laravel.com/docs/octane) — siklus hidup worker dan penyajian di produksi
- [Laravel Horizon](https://laravel.com/docs/horizon) — pengawasan queue dan metrik
- [Dokumentasi Pest](https://pestphp.com/docs) — sintaks pengujian yang dipakai di lab
- [Spesifikasi OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0) — aturan penulisan kontrak
- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/) — konvensi penamaan, versioning, dan kompatibilitas
- [Spesifikasi JSON:API](https://jsonapi.org/) — alternatif envelope yang layak dibandingkan

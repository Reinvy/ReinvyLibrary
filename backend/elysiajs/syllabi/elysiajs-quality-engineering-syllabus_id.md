---
title: "Silabus Quality Engineering Elysia.js"
description: "Kurikulum lanjutan 12 minggu yang komprehensif untuk developer dan insinyur QA yang membahas tumpukan quality engineering Elysia.js — pengujian unit dengan Bun test runner, mocking dan dependency injection, pengujian validasi skema TypeBox, pengujian integrasi dengan database sungguhan, keterujian lifecycle dan hook, pengujian kontrak OpenAPI, factory data uji, pengujian berbasis properti, pengujian performa dan beban, rangkaian end-to-end, serta quality gate CI/CD."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Quality Engineering Elysia.js

## Ringkasan

Kurikulum lanjutan 12 minggu ini dirancang untuk developer, insinyur QA, dan spesialis pengujian yang sudah mampu membangun API dengan Elysia.js dan ingin menguasai disiplin mengujinya secara ketat. Kebanyakan kurikulum Elysia.js mengajarkan routing, validasi, plugin, dan deployment; kursus ini sepenuhnya difokuskan pada quality engineering untuk layanan berbasis Elysia.js: piramida pengujian yang diterapkan pada framework native Bun, pengujian unit yang menjalankan handler tanpa server yang mendengarkan, strategi mocking yang mengisolasi service dan repository database, pengujian skema TypeBox yang mengunci kontrak validasi, rangkaian integrasi yang berjalan melawan database asli dan koneksi WebSocket sungguhan, pengujian lifecycle dan hook yang memverifikasi perilaku pipeline permintaan, pengujian kontrak OpenAPI yang menjaga sinkronisasi server dan klien, fixture dan factory yang deterministik, pengujian berbasis properti yang menemukan masukan yang luput dari pengujian unit, tanda performa dan pengujian beban, serta pipeline CI/CD yang menggagalkan build sebelum regresi sampai ke produksi.

Setiap modul memadukan fondasi konseptual dengan lab praktis menggunakan perangkat nyata: Bun test runner (`bun:test`), `app.handle()` untuk pengujian permintaan bergaya serverless, `mock()` dan `spyOn()` dari `bun:test`, Drizzle ORM dan `bun:sqlite` untuk seam repository, database ephemeral bergaya Testcontainers, `@elysiajs/swagger` untuk ekspor kontrak OpenAPI, `fast-check` untuk pengujian berbasis properti, dan GitHub Actions dengan service container Bun. Kurikulum mengikuti perjalanan sebuah tim quality engineering yang mengeraskan aplikasi Elysia.js yang realistis: merancang strategi pengujian, membangun rangkaian pengujian berlapis, mengotomatiskan pemeriksaan kontrak dan integritas data, dan akhirnya merangkai semuanya ke dalam pipeline yang mengawal setiap merge. Kursus diakhiri dengan proyek akhir yang menuntut perancangan, implementasi, dan pendokumentasian kerangka kualitas lengkap untuk aplikasi Elysia.js, termasuk piramida pengujian, baseline performa, dan pipeline CI.

Di akhir kursus ini, peserta akan mampu merancang piramida pengujian untuk layanan Elysia.js, menulis pengujian unit cepat yang tidak pernah menyentuh jaringan, mengisolasi lapisan batas dengan mock dan dependensi yang disuntikkan lewat decorator, memverifikasi skema TypeBox terhadap payload yang bermusuhan, menjalankan rangkaian integrasi yang tahan lama dengan database sungguhan, menguji hook lifecycle dan alur error secara deterministik, menjaga kontrak OpenAPI tetap sinkron dengan pemeriksaan otomatis, mengelola data uji dengan factory dan seed, menemukan kasus tepi dengan pengujian berbasis properti, menetapkan baseline performa, menjalankan rangkaian end-to-end terhadap instance yang di-deploy, dan mengawal setiap deployment dengan pipeline kualitas otomatis.

## Kurikulum

### Modul 1: Fondasi Quality Engineering dengan Elysia.js (Minggu 1)

- **Disiplin kualitas untuk layanan native Bun**
  - Mengapa sistem tipe waktu-kompilasi Elysia.js mengubah cara kita menguji: banyak error routing dan skema muncul sebelum permintaan dikirim
  - Piramida pengujian yang diterapkan pada framework native Bun: unit → integrasi → kontrak → end-to-end
  - Arti "cepat dan deterministik" ketika pengujian berbagi proses Bun dengan aplikasi
- **Bun test runner sebagai harness bawaan**
  - Struktur `bun:test`: `describe`, `it`, `expect`, `beforeAll`, `afterAll`, `beforeEach`, `afterEach`
  - Menjalankan file tertentu, mode watch, laporan coverage (`bun test --coverage`), dan exit code yang ramah CI
  - Menata rangkaian pengujian untuk monorepo Elysia.js: `tests/unit`, `tests/integration`, `tests/contract`, `tests/e2e`
- **Pengujian tanpa server yang mendengarkan**
  - `app.handle(new Request(...))` sebagai cara kanonik menguji route dalam proses yang sama
  - Membaca `response.status`, body JSON, header, dan `Set-Cookie` dari `Response` yang dikembalikan
  - Mengapa `app.listen()` dihindari dalam pengujian: tanpa port, tanpa flakiness, tanpa race teardown
- **Lab**: buat aplikasi Elysia.js dan tambahkan rangkaian `bun:test` yang menguji tiga route melalui `app.handle()` tanpa I/O jaringan sama sekali

### Modul 2: Pengujian Unit Handler dan Service (Minggu 2)

- **Menguji route secara terisolasi**
  - Menguji jalur sukses, kegagalan validasi, dan respons error sebuah handler melalui `app.handle()`
  - Menyusun handler sebagai adapter tipis di atas service agar logika bisnis dapat diuji tanpa HTTP
  - Ekstraksi fungsi murni: logika berbasis waktu, pembuatan slug, matematika pagination, dan aritmetika mata uang
- **Lapisan service sebagai seam pengujian**
  - Memisahkan repository, use case, dan aturan domain menjadi modul TypeScript biasa
  - Menguji aturan bisnis langsung dengan `bun:test` — tanpa instance Elysia sama sekali
  - Mengukur cakupan tingkat service dan menghindari anti-pattern mock-semuanya
- **Pola asersi respons**
  - Deep-equality pada payload JSON dengan `toEqual` dan `toMatchObject`
  - Asersi status dan header, asersi bentuk error, serta snapshot jalur sukses
- **Lab**: refaktor route berlogika inline menjadi lapisan handler + service, lalu tulis rangkaian unit yang mencakup setiap cabang service tanpa membuat satu pun `Request`

### Modul 3: Mocking, Test Double, dan Dependency Injection (Minggu 3)

- **Perangkat mocking bawaan Bun**
  - `mock()` untuk pengganti fungsi, `spyOn()` untuk spying method, dan `mock.module()` untuk intersepsi level modul
  - Menganalisis jumlah pemanggilan, argumen, dan nilai kembali
  - Membersihkan dan merestorasi mock antar-pengujian agar tidak bocor lintas pengujian
- **Menyuntikkan dependensi dengan cara Elysia**
  - `decorate()` dan injeksi state sebagai seam untuk service, repository, dan clock
  - Mengganti dependensi asli dengan double saat membangun aplikasi yang diuji
  - Pola double berbasis plugin: plugin pengujian yang menimpa entri `decorate` dengan mock
- **Apa yang boleh dan tidak boleh di-mock**
  - Mock pada batas sistem (klien HTTP, database, waktu) versus mock pada kode sendiri (smell)
  - Menguji kontrak pada batas yang di-mock agar double tetap jujur
- **Lab**: bangun aplikasi yang bergantung pada repository dan clock, lalu tulis pengujian yang menyuntikkan repository mock dan clock tetap agar perilaku bergantung-waktu menjadi deterministik

### Modul 4: Pengujian Skema dan Validasi TypeBox (Minggu 4)

- **Skema sebagai kontrak, bukan detail implementasi**
  - Mengapa skema TypeBox layak mendapat lapisan pengujian sendiri: skema mendefinisikan kontrak data publik
  - Pengujian masukan valid: payload representatif untuk setiap skema body, query, dan params route
  - Pengujian masukan tidak valid: field hilang, tipe salah, panjang di luar batas, properti tak dikenal dengan `additionalProperties: false`
- **Menganalisis perilaku validasi Elysia**
  - Status code dan body error yang dihasilkan oleh pelanggaran skema (tipe error `UNION`, `OBJECT`, `INT`, `STRING`)
  - Menguji skema mode `strict` dan koersi (`t.Coerce`, `t.Transform`)
  - Paritas skema-ke-tipe: memverifikasi bahwa tipe TypeScript yang disimpulkan selaras dengan perilaku runtime
- **Menyempurnakan skema dengan umpan balik pengujian**
  - Menggunakan korpus kegagalan untuk memperketat batasan: `format`, `pattern`, `minLength`, `maxLength`, `minimum`, `exclusiveMinimum`
- **Lab**: tulis matriks pengujian validasi untuk API profil pengguna (body, query, params) yang mencakup minimal 20 payload valid dan 20 tidak valid, lalu verifikasi kontrak error tetap stabil

### Modul 5: Pengujian Integrasi dengan Database Sungguhan (Minggu 5)

- **Menguji lapisan data secara nyata**
  - Mengapa mock tidak cukup untuk SQL: kebenaran query berada di dalam database
  - Pengujian integrasi dengan `bun:sqlite` (cepat, in-memory atau berbasis file) dan PostgreSQL (melalui driver `pg` dengan koneksi asli)
  - Pola repository sebagai batas pengujian integrasi
- **Mengelola state database secara deterministik**
  - Migrasi skema di `beforeAll`, truncation antar-pengujian, dan strategi rollback transaksi
  - Menanamkan record baseline dengan Drizzle ORM dan insert SQL mentah
  - Isolasi database pengujian: skema atau database unik per sesi pengujian, aman untuk paralel
- **Menguji melalui API melawan database sungguhan**
  - Memboot aplikasi dengan repository asli dan menjalankan alur CRUD melalui `app.handle()`
  - Menguji pelanggaran unique constraint, transaksi, dan cascade delete hingga ke lapisan data
- **Lab**: hubungkan aplikasi CRUD ke database sungguhan, tulis rangkaian integrasi yang mencakup create/read/update/delete plus kegagalan transaksi, dan buktikan regresi query yang tidak dapat dideteksi pengujian unit dengan mock

### Modul 6: Pengujian Lifecycle, Hook, dan Alur Error (Minggu 6)

- **Menguji pipeline permintaan**
  - `onBeforeHandle`, `onAfterHandle`, `derive`, `resolve`, dan `mapResponse` diuji dengan permintaan yang dirancang
  - Memverifikasi urutan hook dan perilaku short-circuit (hook yang mengembalikan nilai lebih awal melewati handler)
  - Menguji guard dan hook autentikasi: token valid, token kedaluwarsa, header hilang, JWT rusak
- **Penanganan error sebagai kontrak yang dapat diuji**
  - Pemetaan `onError` untuk `NOT_FOUND`, `VALIDATION`, `PARSE`, dan kelas error kustom
  - Menganalisis envelope error terpadu, status code, dan konteks yang dicatat
  - Menguji hook error global tanpa memicu stack trace sungguhan
- **Pengujian lifecycle WebSocket**
  - Menggunakan klien WebSocket native `ws`/Bun terhadap instance server pengujian untuk asersi alur pesan
  - Menguji adaptasi open/hook/message, penanganan close, dan perubahan keanggotaan room
- **Lab**: bangun resource terautentikasi, lalu tulis pengujian yang mematok urutan hook, jalur penolakan guard, envelope error, dan round-trip pesan WebSocket

### Modul 7: Pengujian Kontrak OpenAPI (Minggu 7)

- **Kontrak antara server dan klien**
  - Membangkitkan dokumen OpenAPI dengan `@elysiajs/swagger` dan memperlakukannya sebagai artefak yang berseri
  - Eden Treaty sebagai kontrak tipe end-to-end dan apa yang ditambahkan pengujian kontrak di atasnya
  - Alur kerja kontrak berbasis konsumen: server menerbitkan spec, klien meregenerasi tipe
- **Pemeriksaan kontrak otomatis**
  - Menggagalkan build ketika spec OpenAPI yang dibangkitkan berubah tanpa disengaja (spec diffing di CI)
  - Memvalidasi spec itu sendiri terhadap skema OpenAPI (structural linting)
  - Pengujian kontrak untuk setiap endpoint: konformansi skema permintaan dan konformansi skema respons terhadap dokumen yang disajikan
- **Mock server dan paritas klien**
  - Menjalankan mock server dari spec OpenAPI untuk pengembangan frontend dan pengujian konsumen
  - Memverifikasi bahwa pemanggilan klien Eden Treaty mengompilasi terhadap kontrak server yang persis
- **Lab**: aktifkan Swagger pada aplikasi kursus, simpan spec sebagai artefak yang di-commit, tambahkan pemeriksaan CI yang gagal pada drift spec tak terduga, dan tulis pengujian konformansi respons untuk setiap route

### Modul 8: Manajemen Data Uji dan Factory (Minggu 8)

- **Factory, seed, dan fixture**
  - Membangun factory bertipe untuk user, order, dan entitas domain dengan default deterministik
  - Uniqueness berbasis urutan untuk menghindari tabrakan lintas pengujian dan worker paralel
  - Variasi gaya Faker versus fixture tetap: kapan masing-masing alat yang tepat
- **Strategi seeding untuk tiap jenjang pengujian**
  - Fixture inline minimal untuk unit, seed database untuk integrasi, dan seed lingkungan penuh untuk e2e
  - Seeding idempoten: semantik create-or-replace yang bertahan pada banyak proses berulang
- **Determinisme dan isolasi**
  - Kontrol keacakan (RNG berbiji) agar kegagalan flaky dapat direproduksi
  - Jaminan isolasi per pengujian: setiap pengujian memiliki record sendiri; pembersihan di `afterEach`
  - Penanganan waktu dan clock di factory: injeksi `now` dan tanggal beku
- **Lab**: bangun set factory untuk domain kursus, tulis modul seeding yang dipakai rangkaian integrasi dan e2e, dan tunjukkan pengujian deterministik yang menjadi flaky tanpa kontrol clock

### Modul 9: Pengujian Berbasis Properti dan Fuzz (Minggu 9)

- **Melampaui contoh yang ditulis tangan**
  - Mengapa masukan pilihan tangan meleset dari kasus tepi: string kosong, angka raksasa, username unicode
  - Pengujian berbasis properti dengan `fast-check`: bangkitkan masukan, asersi invariant, perkecil kegagalan
  - Kisah shrinking: mengubah properti yang gagal menjadi masukan reproduksi terkecil
- **Properti yang penting untuk layanan Elysia.js**
  - Invariant round-trip: serialisasi → parse → kesetaraan untuk transform TypeBox
  - Totalitas validasi: setiap payload yang dibangkitkan tervalidasi atau menghasilkan error yang berbentuk baik
  - Hukum pagination: offset dalam rentang, urutan stabil, tanpa record duplikat atau hilang
  - Properti idempotensi untuk kunci cache, pembuatan slug, dan normalizer id
- **Fuzz pada batas permintaan**
  - Mengirim body rusak, header kebesaran, dan encoding aneh melalui `app.handle()`
  - Menganalisis bahwa server tidak pernah crash, selalu mengembalikan error terstruktur, dan tidak pernah membocorkan stack trace
- **Lab**: tulis rangkaian properti untuk skema validasi, generator slug, dan endpoint pagination, lalu gunakan shrinking `fast-check` untuk menemukan dan memperbaiki bug kasus tepi sungguhan

### Modul 10: Pengujian Performa dan Beban (Minggu 10)

- **Performa sebagai quality gate**
  - Berpikir baseline-pertama: ukur sebelum optimasi, kawal pada regresi, bukan angka absolut
  - Micro-benchmark dengan `bun:bench` untuk jalur panas (validasi, serialisasi, routing)
  - Profiling proses Bun: profil CPU, profil alokasi, dan lag event-loop
- **Pengujian beban pada permukaan API**
  - Menggerakkan beban dengan alat seperti `oha` terhadap instance yang di-deploy lokal
  - Metrik yang penting: request per detik, latensi p50/p95/p99, error rate, pertumbuhan memori
  - Menguji perilaku di bawah tekanan: rate limit, draining koneksi, backpressure pada WebSocket
- **Deteksi regresi performa di CI**
  - Pengujian latensi emas: batas longgar yang menangkap regresi orde-magnitudo tanpa flakiness
  - Membandingkan benchmark baseline dan pasca-perubahan dalam komentar CI
  - Menghindari jebakan benchmark flaky: warmup, jumlah iterasi tetap, dan margin statistik
- **Lab**: benchmark route berat-validasi sebelum dan sesudah optimasi skema, tulis pengujian regresi latensi dengan margin aman, dan jalankan pengujian beban singkat yang mencatat p95 dan error rate

### Modul 11: Pengujian End-to-End dan Quality Gate CI/CD (Minggu 11)

- **Rangkaian end-to-end untuk aplikasi yang di-deploy**
  - Peran e2e: memverifikasi seluruh tumpukan (service, database, jaringan sungguhan) sebagaimana pengguna
  - Menyusun e2e dengan seed lingkungan penuh dan akun uji khusus
  - Smoke test pasca-deployment versus rangkaian e2e mendalam di staging
- **Merancang pipeline kualitas**
  - Matriks CI berlapis: lint + typecheck, unit, integrasi, kontrak, properti, benchmark, e2e
  - Urutan fail-fast: gate murah lebih dulu, rangkaian mahal terakhir
  - Ambang coverage dengan `bun test --coverage` dan laporan coverage sebagai artefak PR
- **GitHub Actions dengan Bun**
  - `oven-sh/setup-bun` untuk instalasi dan caching, service container Bun untuk database
  - Caching dependensi dan modul cache Bun untuk cold start cepat
  - Gate merge: status check wajib yang memblokir merge pada lapisan mana pun yang merah
- **Lab**: bangun workflow GitHub Actions yang menjalankan seluruh rangkaian berlapis, tambahkan gate coverage dan pemeriksaan drift kontrak, dan tunjukkan merge yang diblokir oleh pemeriksaan kualitas yang gagal

### Modul 12: Proyek Akhir — Kerangka Kualitas untuk Aplikasi Elysia.js (Minggu 12)

- **Ruang lingkup**: rancang, implementasikan, dan dokumentasikan kerangka quality engineering lengkap untuk aplikasi Elysia.js sungguhan (proyek kursus atau layanan Anda sendiri)
- **Hasil akhir**
  - Strategi pengujian tertulis: piramida pengujian, batas jenjang, kebijakan mocking, dan register risiko
  - Rangkaian lengkap: lapisan unit, integrasi, kontrak, properti, performa, dan e2e
  - Kontrak OpenAPI berseri dengan deteksi drift otomatis
  - Pipeline CI/CD yang mengawal merge pada matriks kualitas lengkap
  - Laporan baseline performa dengan nilai p50/p95/p99 dan ambang regresi
- **Fokus penilaian**: apakah kerangka itu benar-benar mampu menangkap regresi, berjalan deterministik, dan cocok dengan alur kerja tim — bukan volume pengujian
- **Presentasi**: walkthrough akhir yang menjelaskan keputusan strategi, trade-off yang menantang, dan pelajaran dari pembangunan rangkaian

## Proyek Akhir

Peserta akan membangun **kerangka quality engineering untuk aplikasi Elysia.js yang lengkap** — API multi-resource dengan autentikasi, database, fitur real-time, dan integrasi pihak ketiga. Proyek harus mencakup: strategi pengujian terdokumentasi yang menjelaskan mengapa setiap jenjang ada; rangkaian pengujian berlapis yang mencakup unit, integrasi, kontrak, properti, performa, dan end-to-end; kontrak OpenAPI yang di-commit dengan deteksi drift otomatis di CI; sistem factory dan seeding yang menjaga determinisme di setiap jenjang; serta pipeline GitHub Actions yang menjalankan seluruh matriks dan memblokir merge pada kegagalan. Hasil akhirnya adalah pipeline yang bekerja plus laporan tertulis yang membenarkan pilihan strategi, mendokumentasikan metrik baseline, dan merefleksikan investasi pengujian mana yang menghasilkan nilai terbanyak.

## Kriteria Penilaian

- **Tugas**: Lab mingguan dinilai berdasarkan kebenaran desain pengujian (bukan sekadar pengujian yang lulus), determinisme rangkaian, dan kepatuhan terhadap kebijakan mocking dan isolasi yang diajarkan. Matriks validasi Modul 4 dan rangkaian kontrak Modul 7 adalah checkpoint wajib.
- **Portofolio Quality Engineering**: Peserta memelihara rangkaian yang terus bertambah kecanggihannya; penilai menilai apakah setiap lapisan baru benar-benar memperkuat jaring pengaman alih-alih menduplikasi lapisan yang sudah ada.
- **Proyek Akhir**: Kapstone dievaluasi berdasarkan apakah kerangka itu benar-benar mampu menangkap regresi (tinjauan gaya mutasi: dapatkah peninjau merusak aplikasi tanpa disadari rangkaian?), berjalan andal di CI, dan tetap dapat dirawat untuk tim kecil. Proyek yang berhasil harus memiliki setiap lapisan hijau di CI dan laporan baseline dengan ambang yang dapat dipertahankan.

## Referensi

- [Dokumentasi Elysia.js — Testing](https://elysiajs.com/patterns/testing.html)
- [Dokumentasi Bun Test Runner](https://bun.sh/docs/cli/test)
- [Mocking Bun (mock, spyOn, mock.module)](https://bun.sh/docs/test/mocks)
- [Dokumentasi TypeBox](https://github.com/sinclairzx81/typebox)
- [Dokumentasi Drizzle ORM](https://orm.drizzle.team/)
- [fast-check Property-Based Testing](https://fast-check.dev/)
- [Dokumentasi Eden Treaty](https://elysiajs.com/eden/treaty.html)
- [GitHub Actions — Bun Setup](https://github.com/oven-sh/setup-bun)
- [oha Load Generator](https://github.com/hatoo/oha)

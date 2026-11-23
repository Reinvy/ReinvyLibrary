---
title: "Silabus Rekayasa Pengujian dan Kualitas NestJS"
description: "Kurikulum 10 minggu tingkat lanjut untuk membangun rangkaian pengujian yang dapat dipercaya pada sistem NestJS — strategi pengujian, isolasi modul, pengujian basis data dan API dengan Testcontainers, alur asinkron dan berbasis event, pengujian kontrak, pengujian ketahanan dan keamanan, analisis mutasi, pengelolaan flaky test, serta quality gate di CI."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Pengujian dan Kualitas NestJS

## Ringkasan

Sebagian besar materi pengujian NestJS hanya mengajarkan beberapa resep Jest: memalsukan sebuah provider, memanggil `Test.createTestingModule`, mengirim request Supertest, selesai. Pengetahuan itu menghasilkan rangkaian pengujian yang lolos di mesin lokal, berjalan dua puluh menit di CI, rusak setiap kali DTO berubah, dan tetap melewatkan bug yang sampai ke produksi. Rekayasa kualitas adalah disiplin yang berbeda — ia adalah perancangan sebuah sistem umpan balik yang biaya, kecepatan, dan sinyalnya Anda kendalikan secara sadar.

Kurikulum tingkat lanjut 10 minggu ini memperlakukan rangkaian pengujian sebagai produk yang direkayasa. Anda memulai dari strategi: apa yang layak diuji pada setiap lapisan sistem NestJS, di mana batas modul menciptakan seam pengujian alami, dan mengapa dependency injection adalah fitur testability terpenting dari framework ini. Minggu-minggu berikutnya membahas mekanika yang benar-benar menyulitkan dalam praktik — scope provider dan pengujian request-scoped, data uji yang deterministik, isolasi basis data dengan Testcontainers, pengujian API yang memverifikasi terhadap kontrak OpenAPI alih-alih bentuk yang di-hardcode, serta area yang paling sulit yaitu alur asinkron dan berbasis event di mana clock, retry, dan antrean membuat asersi naif menjadi tidak bermakna. Minggu-minggu terakhir mencakup disiplin yang memisahkan rangkaian pengujian yang "hijau" dari yang dapat dipercaya: pengujian kontrak antar batas layanan, pengujian ketahanan dan otorisasi, analisis mutasi untuk modul yang menanggung risiko nyata, kebijakan flaky test yang benar-benar dijalankan, serta pipeline CI yang menggerbangi merge berdasarkan kualitas tanpa menjadi hambatan.

Setiap minggu memadukan kuliah konseptual dengan laboratorium pada satu repositori yang terus berkembang: layanan NestJS modular dengan basis data Postgres, worker BullMQ, dan HTTP API yang dikonsumsi layanan kedua. Pada akhirnya, pipeline repositori — bukan jumlah test-nya — adalah deliverables utamanya.

Peserta sebaiknya sudah nyaman menulis aplikasi NestJS (modul, provider, guard, pipe, interceptor), menulis test Jest dasar, serta bekerja dengan basis data relasional dan Docker.

## Kurikulum

### Modul 1: Strategi Pengujian dan Arsitektur Testability (Minggu 1)

- **Memilih Model Umpan Balik**
  - Testing pyramid, testing trophy, dan mengapa layanan backend biasanya berada di antara keduanya
  - Kurva biaya: biaya asersi, biaya runtime, dan biaya pemeliharaan per lapisan
  - Pertanyaan yang menentukan setiap test: mode kegagalan apa yang sedang saya lindungi?
- **Seam Pengujian dalam Aplikasi NestJS**
  - Batas modul sebagai seam arsitektural — modul dengan permukaan publik yang bersih adalah modul yang dapat diuji
  - Ports and adapters: menjaga kode framework di tepi agar logika domain dapat diuji secara terisolasi
  - Sinyal bahwa desain sulit diuji: pemanggilan `new` tersembunyi, akses clock statis, efek samping level modul, import melingkar
- **Menentukan Apa yang Tidak Perlu Diuji**
  - Perilaku framework yang sudah dijamin Nest versus perilaku yang Anda miliki
  - Getter sepele, kode hasil generate, dan adapter pihak ketiga — di mana contract test lebih murah daripada unit test
  - Mendokumentasikan celah yang disengaja agar ketiadaan test adalah keputusan, bukan kelalaian
- **Repositori Kursus**
  - Tata letak monorepo: modul API, modul worker, paket domain bersama, adapter infrastruktur
  - Menambahkan taksonomi test (`unit`, `integration`, `e2e`, `contract`, `perf`) dengan project Jest dan script terpisah
  - Pengukuran baseline: runtime rangkaian pengujian saat ini, bentuk coverage, dan sepuluh test paling lambat
- **Praktik Laboratorium**: Audit repositori awal terhadap checklist seam, tulis strategi pengujian satu halaman dengan anggaran lapisan yang eksplisit (target jumlah dan runtime per lapisan), lalu pisahkan konfigurasi Jest menjadi project bernama

### Modul 2: Isolasi Modul dan Mekanika Unit Testing (Minggu 2)

- **`Test.createTestingModule` Secara Mendalam**
  - Mengompilasi modul hanya dengan provider yang diuji versus mengimpor graf modul sebenarnya
  - `overrideProvider`, `overrideGuard`, `overridePipe`, `overrideInterceptor`, `overrideFilter` dan kapan masing-masing menjadi alat yang tepat
  - Menguji scope provider: `DEFAULT`, `REQUEST`, dan `TRANSIENT` — serta mengapa provider request-scoped memerlukan konteks per test
- **Mocking dengan Niat**
  - Memalsukan interface (sebuah token) versus memalsukan kelas, dan bagaimana `@Inject(TOKEN)` mengubah bentuk mock
  - Fake tulisan tangan versus graf `jest.fn()`: fake untuk kolaborator stateful, spy untuk asersi interaksi
  - Menghindari jebakan over-mocking — service yang 90% mock hanya memverifikasi bahwa mock-nya dipanggil
- **Menguji Komponen Pipeline Request**
  - Guard: keputusan otorisasi, refleksi metadata, dan perbedaan antara "ditolak" dan "belum terautentikasi"
  - Pipe: kasus tepi transformasi dan validasi, termasuk perilaku `whitelist` dan `forbidNonWhitelisted`
  - Interceptor: pemetaan respons, timeout, dan penerjemahan error, diuji tanpa HTTP server
  - Exception filter: memverifikasi envelope error yang tepat, bukan sekadar kelas exception
- **Praktik Laboratorium**: Tulis unit test untuk domain pricing (logika murni, tanpa mock selain port clock), guard otorisasi, dan interceptor timeout; lalu tulis ulang satu test yang terlalu banyak mock menjadi test berbasis fake dan bandingkan keterbacaan serta runtime-nya

### Modul 3: Data Uji, Builder, dan Determinisme (Minggu 3)

- **Data Builder dan Object Mother**
  - Rantai builder dengan default yang wajar agar setiap test hanya menyatakan field yang penting
  - Object mother untuk entity domain dan factory DTO untuk payload request
  - Menyimpan builder di paket pendukung test bersama agar berevolusi bersama domain
- **Pembangkitan Deterministik**
  - Faker dengan seed tetap: data yang dapat direproduksi untuk eksekusi lokal dan CI
  - Mengapa data acak tanpa seed menghasilkan jenis flaky test terburuk — gagal sekali sebulan
  - Membatasi string hasil generate pada batas panjang dan aturan charset yang benar-benar diberlakukan validasi Anda
- **Waktu, ID, dan Input Bermusuhan Lainnya**
  - Menyuntikkan port clock dan menggantinya di test alih-alih memalsukan `Date.now`
  - Pembangkitan ID deterministik dan efeknya terhadap asersi pengurutan
  - Fake timer dengan Jest: `advanceTimersByTime`, `runAllTimers`, dan jebakan timer tertunda yang bocor antar test
- **Disiplin Snapshot**
  - Kapan inline snapshot menjadi kontrak yang berguna dan kapan ia menjadi pembuat diff yang tak terbaca
  - Snapshot respons API terserialisasi versus objek domain
  - Kebijakan review pembaruan snapshot agar perubahan snapshot tidak pernah otomatis "accept all"
- **Praktik Laboratorium**: Perkenalkan pustaka builder dan generator data ber-seed, ganti literal ad-hoc di satu file test yang ada, dan buat test integrasi paling lambat menjadi deterministik dengan menyuntikkan clock

### Modul 4: Isolasi Basis Data untuk Test dengan Testcontainers (Minggu 4)

- **Mengapa Basis Data Bersama Meracuni Rangkaian Pengujian**
  - Kopling antar test, ketergantungan urutan, dan kegagalan yang hanya muncul saat rangkaian tumbuh
  - Tiga strategi isolasi: basis data per suite, basis data per worker, dan rollback transaksi
- **Menjalankan Postgres Nyata dengan Testcontainers**
  - Siklus hidup container dikelola sekali per worker Jest; menggunakan ulang container antar file untuk kecepatan
  - Menerapkan migrasi nyata alih-alih `synchronize: true` agar test menguji schema yang Anda deploy
  - Ukuran connection pool per worker dan menghindari tabrakan port pada eksekusi paralel
- **Perbandingan Strategi Pembersihan**
  - Truncation antar test, rollback transaksi dengan koneksi bersama, dan basis data template
  - Kapan rollback rusak (advisory lock, `LISTEN`/`NOTIFY`, sequence, DDL) dan cara mengatasinya
- **Contract Test untuk Adapter**
  - Satu suite yang dijalankan terhadap setiap implementasi port repository (basis data nyata, fake in-memory)
  - Menangkap bug klasik ketika fake dan adapter nyata menyimpang
  - Memverifikasi query mentah: asersi index berbasis `EXPLAIN` untuk jalur panas
- **Praktik Laboratorium**: Ubah test basis data menjadi Testcontainers per worker dengan migrasi nyata, tambahkan contract suite repository yang dipakai bersama adapter SQL dan in-memory, lalu buktikan isolasi dengan menjalankan suite memakai `--runInBand` dan paralel dengan hasil identik

### Modul 5: Pengujian API dan End-to-End terhadap Kontrak (Minggu 5)

- **Menjalankan Aplikasi Nyata**
  - `Test.createTestingModule` dengan `AppModule` penuh, global pipe dan filter diterapkan persis seperti di produksi
  - Mengganti hanya dependensi eksternal yang benar-benar eksternal (email, pembayaran, object storage) pada batas adapter
  - Autentikasi dalam e2e test: penerbitan token nyata versus strategi auth khusus test
- **Memverifikasi Respons dengan Benar**
  - Status code, envelope error, dan header sebagai asersi kelas satu, bukan efek samping snapshot
  - Memvalidasi respons terhadap dokumen OpenAPI hasil generate agar penyimpangan schema menggagalkan suite
  - Perilaku paginasi, pemfilteran, dan pengurutan diverifikasi pada batas yang dialami klien
- **Perilaku yang Hanya Muncul Lewat HTTP**
  - Idempotency key: pengiriman ganda menghasilkan satu efek dan satu respons tersimpan
  - Rate limiting dan perilaku `429` termasuk header `Retry-After`
  - Pipeline validasi dengan `whitelist` aktif: field tak dikenal tidak pernah mencapai handler
- **Higiene Suite Praktis**
  - Seed-and-assert versus arrange-act-assert ketika penyiapan data melibatkan beberapa endpoint
  - Menjaga jumlah worker e2e dan isolasi basis data tetap konsisten agar eksekusi paralel tetap jujur
- **Praktik Laboratorium**: Bangun e2e suite yang mencakup jalur tulis dari awal hingga akhir, tambahkan helper asersi kesesuaian respons dengan OpenAPI, dan tulis test untuk pengiriman idempoten serta throttling yang gagal bila header-nya mundur

### Modul 6: Pengujian Alur Asinkron dan Berbasis Event (Minggu 6)

- **Menguji Antrean dan Worker**
  - Menjalankan processor BullMQ secara langsung alih-alih menunggu worker aktif
  - Memverifikasi payload job, jumlah attempt, konfigurasi backoff, dan hasil dead-letter
  - Menguji sisi producer: apa yang di-enqueue handler saat transaksinya commit
- **Pola Outbox di Bawah Pengujian**
  - Membuktikan event ditulis dalam transaksi yang sama dengan perubahan state
  - Membuktikan relay mempublikasikan tepat sekali per baris outbox dan bertahan dari crash di antara langkah
  - Menyimulasikan crash dengan menyuntikkan kegagalan antara commit dan publish
- **Clock, Retry, dan Konsistensi Eventual**
  - Mengendalikan waktu agar jadwal backoff diverifikasi dalam milidetik, bukan ditunggu
  - Helper polling dengan timeout terbatas dan pesan kegagalan yang jelas versus pemanggilan `sleep` sembarangan
  - Asersi berbasis event: berlangganan event emitter in-process untuk determinisme bila memungkinkan
- **Menguji Pengiriman Webhook dan Konsumennya**
  - Pembuatan dan verifikasi tanda tangan HMAC, termasuk penanganan clock skew
  - Perlindungan replay dan idempotensi pengiriman ganda di sisi konsumen
  - Kompensasi bergaya saga: langkah hilir yang gagal tidak meninggalkan state parsial
- **Praktik Laboratorium**: Tulis suite test worker yang mencakup jalur sukses, retry, dan dead-letter dengan fake timer; tambahkan test pemulihan crash outbox; dan uji konsumen webhook terhadap pengiriman ganda serta tidak berurutan

### Modul 7: Pengujian Kontrak Antar Batas Layanan (Minggu 7)

- **Celah yang Ditinggalkan Integration Test**
  - Mengapa dua layanan bisa sama-sama hijau sementara integrasinya rusak
  - Ekspektasi konsumen versus asumsi provider, dan biaya menemukan ketidakcocokan di staging
- **Consumer-Driven Contract dengan Pact**
  - Menulis consumer test yang mempublikasikan ekspektasi ke broker
  - Verifikasi provider dengan state handler, dan apa yang sebenarnya dimodelkan oleh "provider state"
  - Version selector: memverifikasi terhadap versi konsumen yang masih ter-deploy, bukan hanya `main`
- **Batas Alternatif**
  - Menguji kontrak transport microservice NestJS (TCP, Redis, Kafka) dengan schema pesan bersama
  - gRPC dan protobuf: pemeriksaan kompatibilitas schema dan penyimpangan tipe hasil generate
- **Kompatibilitas di CI**
  - Menggagalkan build provider atas kontrak yang belum terverifikasi; gate `can-i-deploy` di pipeline rilis
  - Menangani perubahan breaking yang disengaja tanpa membekukan kedua tim
- **Praktik Laboratorium**: Tambahkan consumer Pact untuk resource task pada API, sambungkan verifikasi provider ke pipeline, dan buat penggantian nama field yang disengaja menggagalkan gate sebelum di-merge di balik endpoint berversi

### Modul 8: Pengujian Ketahanan, Performa, dan Keamanan (Minggu 8)

- **Fault Injection**
  - Toxiproxy atau sejenisnya untuk menyimulasikan latensi, timeout, reset koneksi, dan respons parsial dari dependensi
  - Memverifikasi circuit breaker, anggaran retry, dan degradasi anggun, bukan hanya penanganan error
  - Menguji perilaku saat overload: apa yang dilakukan layanan ketika pool, antrean, atau memori jenuh
- **Load Test dan Endurance Test**
  - k6 atau autocannon dengan payload realistis dan profil beban yang terdefinisi (ramp, steady, spike)
  - Memverifikasi terhadap ambang SLO — latensi p95, tingkat error — sehingga test gagal saat terjadi regresi
  - Endurance run untuk pertumbuhan memori dan kebocoran koneksi, cukup singkat untuk dijalankan nightly
- **Asersi Terkait Keamanan**
  - Matriks otorisasi: setiap endpoint × setiap role × pemilik dan bukan pemilik, sebagai suite berbasis tabel
  - Pemeriksaan IDOR dan isolasi tenant yang akan menangkap klausa `where tenantId` yang hilang
  - Fuzzing input pada permukaan validasi, plus pemeriksaan bahwa respons error tidak pernah membocorkan stack trace atau SQL
- **Menjaga Suite Ini Tetap Murah**
  - Memberi tag pada test non-fungsional agar berjalan nightly atau pada release branch, bukan setiap commit
  - Bentuk laporan: ringkasan performa yang dapat dibaca reviewer dalam sepuluh detik
- **Praktik Laboratorium**: Tambahkan test fault injection yang membuktikan layanan terdegradasi alih-alih terjadi cascading failure, skenario k6 dengan ambang SLO tersambung ke job nightly, dan matriks otorisasi hasil generate yang mencakup setiap route controller

### Modul 9: Coverage, Mutation Testing, dan Pengelolaan Flaky Test (Minggu 9)

- **Coverage sebagai Alat Diagnosis**
  - Line versus branch coverage, dan mengapa angka line yang tinggi dapat hidup bersama jalur error yang tak teruji
  - Ambang per direktori untuk lapisan domain, dengan gate lebih rendah (atau tanpa gate) untuk adapter dan kode bootstrap
  - Membaca laporan coverage untuk menemukan kode mati dan cabang tak terjangkau, bukan sekadar mengejar angka
- **Mutation Testing di Titik yang Penting**
  - Stryker dengan runner Jest, dibatasi pada modul berisiko tertinggi agar runtime tetap wajar
  - Menafsirkan mutation score: mutant yang bertahan sebagai celah test yang konkret dan dapat direview
  - Target yang realistis — dan mengapa 100% adalah beban pemeliharaan
- **Mendiagnosis Flakiness**
  - Tersangka utama: timer nyata, baris basis data bersama, tabrakan port, urutan test, promise tanpa await
  - Mereproduksi nondeterminisme dengan eksekusi berulang, `--runInBand`, dan urutan test acak
  - Kebijakan karantina: deteksi, isolasi, tetapkan pemilik, lalu perbaiki atau hapus dalam rentang waktu tetap
- **Anggaran Runtime**
  - Menetapkan batas eksplisit untuk suite pre-merge dan nightly, serta menegakkannya di CI
  - Sharding, penyetelan worker, penggunaan ulang container, dan caching artefak build agar tetap di bawah batas
- **Praktik Laboratorium**: Tambahkan mutation run untuk modul pricing dan perbaiki mutant bertahan teratas, terapkan detektor flaky test pada sepuluh eksekusi berturut-turut, dan bawa suite pre-merge di bawah anggaran runtime yang terdokumentasi

### Modul 10: Quality Gate, Pipeline CI, dan Keyakinan Rilis (Minggu 10)

- **Desain Pipeline**
  - Urutan stage: pemeriksaan unit cepat lebih dulu, lalu integrasi, kemudian kontrak dan e2e pada commit yang sama
  - Sharding paralel dan caching dependensi; menghindari build ganda antar stage
  - Required check versus laporan advisory, dan siapa pemilik setiap gate
- **Pelaporan dan Umpan Balik**
  - Artefak JUnit dan coverage, anotasi PR, serta dashboard tren dari waktu ke waktu
  - Membuat kegagalan dapat ditindaklanjuti: asersi yang gagal, data ber-seed, dan perintah reproduksi di log
- **Profil Pre-Merge, Nightly, dan Rilis**
  - Apa yang harus memblokir merge, apa yang boleh berjalan semalam, dan apa yang milik release candidate
  - Smoke test terhadap lingkungan ter-deploy dan verifikasi pasca-deploy untuk perjalanan kritis
  - Keyakinan rollback: membuktikan versi sebelumnya tetap lolos suite
- **Metrik Kualitas yang Bermakna**
  - Defect yang lolos, mean time to detect, tingkat flaky, runtime suite, dan mutation score pada modul kritis
  - Meninjau metrik setiap bulan dan menghentikan gate yang tidak lagi sepadan biayanya
- **Praktik Laboratorium**: Bangun pipeline lengkap dengan required check, sharding, pelaporan, dan profil nightly; lalu kirim satu release candidate melaluinya dan dokumentasikan dashboard metrik kualitas

## Proyek Akhir

Serahkan quality platform untuk layanan NestJS dalam kursus ini: repositori yang memuat strategi pengujian terdokumentasi, project Jest berlapis, paket pendukung builder dan factory, suite basis data berbasis Testcontainers dengan contract test adapter, e2e suite yang memvalidasi respons terhadap dokumen OpenAPI hasil generate, test deterministik untuk antrean, outbox, dan alur webhook, kontrak Pact yang diverifikasi di CI lintas kedua layanan, profil non-fungsional nightly dengan fault injection dan load test berambang SLO, laporan mutation score untuk modul domain, serta pipeline CI yang menegakkan gate terdokumentasi dengan sharding dan pelaporan. Dokumen pendampingnya harus menyatakan anggaran runtime pre-merge dan nightly, tingkat flaky test saat ini, mutation score, dan alasan di balik setiap gate yang dipertahankan maupun dihapus.

## Kriteria Penilaian

- **Tugas**: Laboratorium mingguan dinilai berdasarkan apakah verifikasi yang dinyatakan benar-benar lolos — isolasi dibuktikan dengan hasil paralel dan serial yang identik, pelanggaran kontrak menggagalkan gate, test fault injection menunjukkan degradasi, sedangkan mutant yang bertahan dibunuh atau diberi justifikasi. Setiap pengumpulan harus menyertakan runtime suite dan catatan determinisme.
- **Determinisme**: Suite yang gagal secara intermiten dianggap gagal. Test pada proyek akhir harus lolos dua puluh eksekusi berturut-turut, termasuk dengan urutan acak dan worker paralel.
- **Pertimbangan Rekayasa**: Strategi pengujian harus menjelaskan apa yang sengaja tidak diuji, dan pipeline harus menunjukkan mengapa setiap gate layak dipertahankan alih-alih hanya menumpuk pemeriksaan.
- **Proyek Akhir**: Dievaluasi berdasarkan cakupan lapisan dan anggaran runtime, kualitas data builder dan strategi isolasi, cakupan kontrak dan non-fungsional, mutation score pada modul domain, penanganan flaky test, kualitas pelaporan, serta kejelasan dokumentasi keyakinan rilis.

## Referensi

- [Dokumentasi NestJS — Testing](https://docs.nestjs.com/fundamentals/testing)
- [Dokumentasi Jest](https://jestjs.io/docs/getting-started)
- [Testcontainers untuk Node.js](https://node.testcontainers.org/)
- [Pact — Consumer-Driven Contract Testing](https://docs.pact.io/)
- [Stryker Mutator — JavaScript/TypeScript](https://stryker-mutator.io/docs/)
- [k6 — Load Testing](https://k6.io/docs/)
- [Supertest](https://github.com/ladjs/supertest)
- [Toxiproxy — Menyimulasikan Kondisi Jaringan](https://github.com/Shopify/toxiproxy)
- [BullMQ — Pola Pengujian Antrean dan Worker](https://docs.bullmq.io/)

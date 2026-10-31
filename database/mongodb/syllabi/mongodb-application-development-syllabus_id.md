---
title: "Silabus Pengembangan Aplikasi MongoDB"
description: "Silabus enam modul yang membawa pengembang aplikasi dari pemodelan dokumen hingga operasional produksi MongoDB, dengan lab langsung untuk pola query, indexing, aggregation, transaksi, dan runbook operasional."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Aplikasi MongoDB

## Ringkasan

Silabus enam modul ini ditujukan bagi pengembang aplikasi yang sudah mengirim fitur ke MongoDB tetapi masih memperlakukannya seperti key-value store dengan tambahan fitur. Setiap modul dibangun di sekitar keputusan yang benar-benar diambil pengembang saat sprint: bagaimana membentuk dokumen, bagaimana sebuah query akan dieksekusi, index mana yang layak dibayar dengan biaya tulis, kapan pipeline aggregation menggantikan kode aplikasi, kapan transaksi dibenarkan, dan apa yang harus diperiksa ketika produksi melambat.

Urutan modul mengikuti rantai ketergantungan alami pada jalur baca dan tulis. Pemodelan diletakkan pertama karena setiap keputusan berikutnya — bentuk index, tahapan pipeline, cakupan transaksi — dibatasi olehnya. Query menyusul agar kesalahan pemodelan langsung terlihat pada keluaran `explain()`. Indexing, aggregation, dan transaksi kemudian dibangun di atas pola akses yang sudah ditetapkan pada Modul 2. Modul terakhir menghubungkan seluruh keputusan tingkat aplikasi tersebut dengan sinyal operasional yang memunculkannya di produksi.

Setelah menyelesaikan kursus, peserta mampu merancang skema yang tetap sehat setelah satu tahun pertumbuhan fitur, membaca query plan tanpa menebak, menghitung dan membenarkan setiap index yang dibuat, memindahkan pengolahan data berat keluar dari aplikasi, memakai transaksi hanya ketika atomicity benar-benar dibutuhkan, dan mendiagnosis endpoint yang lambat dari `mongosh` dalam waktu kurang dari sepuluh menit. Setiap modul dilengkapi lab yang berjalan pada replica set lokal, sehingga change stream dan transaksi berperilaku sama seperti di produksi.

## Kurikulum

### Modul 1: Pemodelan Dokumen yang Bertahan di Produksi

- **Embedding versus referencing**
  - Kerangka keputusan one-to-few, one-to-many, dan one-to-squillions
  - Mengapa array tanpa batas adalah penyebab insiden produksi paling umum di MongoDB
  - Pola bucket untuk data time-series dan data yang dominan append
  - Menduplikasi field secara sadar, dengan satu service sebagai pemilik setiap field

- **Memodelkan berdasarkan pola akses, bukan entitas**
  - Memulai dari layar dan endpoint, bukan dari diagram ER
  - Dokumen polimorfik, field diskriminator, dan partial index
  - Menegakkan bentuk dokumen dengan validasi `$jsonSchema` dan `validationAction`
  - Menjaga dokumen di bawah batas 16 MB tanpa menyembunyikan relasi

- **Evolusi skema**
  - Penambahan field secara aditif dan penanda `schemaVersion` pada dokumen
  - Strategi backfill: lazy saat baca, job batch, atau dual write
  - Membaca bentuk lama dan baru pada jalur kode yang sama
  - Kapan menulis ulang collection lebih murah daripada kode kompatibilitas permanen

### Modul 2: Pola Query dan Jalur Baca

- **Kontrak operasi find**
  - Urutan equality, sort, dan range, serta alasan aturan ESR penting
  - Projection sebagai alat korektness dan performa
  - `$elemMatch` versus dot notation pada array dokumen
  - Penanganan null: field hilang, nilai `null`, dan jebakan `$exists`

- **Membaca query plan**
  - `explain("executionStats")` dan sinyal `IXSCAN` versus `COLLSCAN`
  - Rasio keys examined terhadap dokumen yang dikembalikan sebagai target tuning
  - Tahap `SORT` yang meluap ke disk dan index yang menghilangkannya
  - Cache query planner, penolakan plan, dan pemaksaan hint

- **Pilihan konsistensi pada pembacaan**
  - Pengaruh `readPreference` terhadap lag secondary dan pembacaan basi
  - Tingkatan `readConcern`: `local`, `majority`, `snapshot`
  - Session dengan causal consistency untuk read-your-own-writes

### Modul 3: Indexing untuk Beban Kerja Aplikasi

- **Desain index**
  - Aturan prefix pada compound index dan alasan urutan field bukan sekadar kosmetik
  - Covered query: projection mana yang membuat index menjawab sendiri
  - Multikey index pada array dan biaya kardinalitasnya
  - Index unique, partial, sparse, TTL, dan wildcard dalam praktik

- **Biaya dan keamanan perubahan**
  - Write amplification: mengukur biaya setiap index tambahan
  - Pembangunan index bergulir pada replica set dan hidden index untuk validasi
  - `$indexStats` untuk menemukan index yang tidak pernah dipakai query
  - Menghapus index tanpa merusak jalur kode yang jarang diuji

- **Lab verifikasi**
  - Membangun dataset 5 juta dokumen dengan `mongosh`
  - Menurunkan query dashboard dari collection scan menjadi covered index
  - Mencatat angka `keysExamined` sebelum dan sesudah dalam sebuah laporan

### Modul 4: Aggregation Framework

- **Model mental pipeline**
  - Dokumen mengalir melalui stage, bukan klausa SQL yang dikompilasi
  - Mendorong `$match` dan `$project` ke awal pipeline
  - Akumulator `$group` dan batas memori dengan `allowDiskUse`
  - Pengurutan deterministik: `$sort` sebelum `$group` versus sesudahnya

- **Join dan pembentukan data**
  - `$lookup` dengan `pipeline` untuk join terfilter dan variabel `let`
  - `$unwind` dengan `preserveNullAndEmptyArrays` dan biaya fan-out-nya
  - `$facet` untuk dashboard sekali jalan dengan beberapa pengelompokan
  - `$setWindowFields` untuk total berjalan dan peringkat

- **Materialized view**
  - `$merge` untuk rollup inkremental dan eksekusi ulang yang idempoten
  - `$out` versus `$merge` serta perilaku locking-nya
  - Penjadwalan rollup dan deteksi materialisasi yang sudah basi

### Modul 5: Transaksi dan Konsistensi

- **Kapan atomicity benar-benar dibutuhkan**
  - Atomicity satu dokumen mencakup lebih banyak kasus daripada yang diperkirakan tim
  - Aturan dua dokumen: transfer dana, reservasi stok, perubahan status order
  - Alternatif pemodelan sebelum memakai session
  - Batas umur transaksi 60 detik dan batas entri oplog 16 MB

- **Menulis kode transaksi yang benar**
  - `session.withTransaction()` dan loop retry untuk `TransientTransactionError`
  - Penanganan `UnknownTransactionCommitResult` saat commit
  - Pemasangan `writeConcern: majority` dengan `readConcern: snapshot`
  - Idempotency key agar retry dari klien tidak menerapkan operasi dua kali

- **Kontensi dan performa**
  - Konflik tulis pada pembaruan bersamaan ke dokumen yang sama
  - Cakupan lock, retry storm, dan backoff dengan jitter
  - Mengukur overhead transaksi sebelum dan sesudah diadopsi

### Modul 6: Operasional untuk Pengembang Aplikasi

- **Mengamati sistem yang sedang berjalan**
  - `db.currentOp()` dan aggregation `$currentOp` untuk pekerjaan berdurasi panjang
  - Database profiler dan ambang slow query yang aman dibiarkan aktif
  - `mongostat`, `mongotop`, dan counter serverStatus yang layak diberi alert
  - Menghubungkan trace ID aplikasi dengan operasi yang lambat

- **Perilaku kegagalan yang disembunyikan driver**
  - Failover replica set, retryable write, dan `retryWrites=true`
  - Ukuran connection pool terhadap `maxIncomingConnections` di server
  - `serverSelectionTimeoutMS`, `socketTimeoutMS`, dan mode kegagalannya
  - Kesadaran backup: apa arti restore bagi ID dan timestamp

- **Checklist rilis**
  - Connection string, kredensial, dan TLS di secret store
  - Validasi saat startup untuk index dan validator yang wajib ada
  - Satu entri runbook untuk setiap alert yang bisa dimunculkan service

## Proyek Akhir

Peserta membangun layanan manajemen order berbasis MongoDB, mulai dari database kosong hingga aplikasi yang terdeploy dan terobservasi. Deliverable-nya adalah skema terdokumentasi beserta validator dan catatan migrasi, laporan query dan index yang menampilkan keluaran `explain()` untuk lima pola akses terpanas sebelum dan sesudah tuning, endpoint pelaporan berbasis aggregation dengan `$facet` dan rollup `$merge`, alur checkout yang memakai transaksi multi-dokumen dengan idempotency key, serta runbook operasional yang mencakup triase slow query, rollback index, dan verifikasi restore. Proyek harus berjalan pada replica set tiga node, dan peserta mempresentasikan satu regresi performa yang sengaja dimasukkan beserta jalur diagnostik yang menemukannya.

## Kriteria Penilaian

- **Tugas**: Enam tugas lab, satu per modul, dinilai berdasarkan apakah artefak berjalan pada replica set nyata, apakah klaim performa didukung keluaran `explain()`, dan apakah jalur error ditangani bukan diasumsikan.
- **Kuis**: Kuis singkat mingguan tentang trade-off pemodelan, perilaku prefix index, urutan stage pipeline, dan semantik retry transaksi.
- **Proyek Akhir**: Dinilai berdasarkan ketahanan skema pada skenario pertumbuhan fitur yang dinyatakan, keputusan index berbasis bukti, korektness logika transaksi dan idempotensi, serta kegunaan runbook bagi orang yang tidak menulis kodenya.
- **Partisipasi**: Satu peer review terhadap skema dan laporan index peserta lain, berfokus pada index tanpa justifikasi dan array tanpa batas.

## Referensi

- MongoDB Manual: Data Modeling — https://www.mongodb.com/docs/manual/data-modeling/
- MongoDB Manual: Query Optimization dan `explain()` — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: Indexes — https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: Aggregation Pipeline — https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB Manual: Transactions — https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Manual: Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Manual: Monitoring for Performance — https://www.mongodb.com/docs/manual/administration/monitoring/
- MongoDB University: kursus M001 dan M320 — https://learn.mongodb.com/
- Kleppmann, M. *Designing Data-Intensive Applications*, O'Reilly

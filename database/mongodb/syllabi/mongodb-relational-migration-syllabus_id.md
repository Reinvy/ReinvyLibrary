---
title: "Silabus Migrasi Database Relasional ke MongoDB"
description: "Kurikulum lanjutan sepuluh modul bagi engineer yang memindahkan beban kerja dari database relasional ke MongoDB — penilaian beban kerja, pemilihan strategi migrasi, pemodelan dokumen dari skema ternormalisasi, kesetiaan tipe data, pemuatan massal, cutover dengan change data capture, migrasi kode aplikasi, rekonsiliasi, dan dekomisioning sistem lama."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Migrasi Database Relasional ke MongoDB

## Ringkasan

Sebagian besar materi MongoDB mengajarkan cara membangun aplikasi dari nol. Masalah yang lebih sulit dan jauh lebih sering muncul di produksi adalah memindahkan beban kerja relasional yang sudah berjalan bertahun-tahun — lengkap dengan migrasi skema, stored procedure, join, dan query pelaporan — ke document store tanpa kehilangan data, merusak perilaku aplikasi, atau baru menyadari saat cutover bahwa model data baru tidak mampu melayani pola akses yang sebenarnya dibutuhkan bisnis.

Kurikulum ini memperlakukan migrasi relasional ke MongoDB sebagai disiplin tersendiri dengan fase-fasenya: penilaian, pemodelan, perpindahan data, sinkronisasi inkremental, penulisan ulang aplikasi, validasi, dan dekomisioning. Setiap fase memiliki mode kegagalan yang hanya muncul di produksi, sehingga setiap modul dipasangkan dengan latihan berbasis artefak — lembar inventaris, tabel pemetaan, harness rekonsiliasi, runbook rollback — bukan sekadar bacaan abstrak.

Kursus ini mengasumsikan Anda sudah mampu menulis query dan indeks MongoDB. Fokusnya adalah pekerjaan rekayasa di sekitar migrasi: membuktikan kesetaraan data, menjaga dua sistem tetap konsisten selama keduanya aktif, dan mengetahui kapan aman memindahkan trafik baca maupun tulis. Sepuluh modul, sekitar empat sampai enam jam per modul, ditutup dengan migrasi capstone yang menyertakan gladi bersih cutover.

Peserta diharapkan sudah nyaman dengan desain skema SQL dan dengan driver MongoDB di setidaknya satu bahasa. Diperlukan akses ke instance relasional (PostgreSQL atau MySQL) dan MongoDB replica set; Atlas maupun cluster lokal via Docker sama-sama memadai.

## Kurikulum

### Modul 1: Discovery Migrasi dan Penilaian Beban Kerja

- **Bangun inventaris beban kerja sebelum menulis satu dokumen pun**
  - Ukuran tabel, jumlah baris, laju pertumbuhan, serta pemisahan data panas dan data dingin
  - Graf foreign key dan frekuensi join antar setiap pasangan tabel
  - Rasio baca/tulis per tabel, diukur dari `pg_stat_statements` atau performance schema MySQL, bukan diperkirakan
- **Kumpulkan katalog query**
  - Query teratas berdasarkan total waktu dan berdasarkan jumlah pemanggilan, beserta distribusi parameternya
  - Query pelaporan dan analitik yang tidak bisa diterjemahkan satu-ke-satu
  - Batch job, pembaruan terjadwal, dan apa pun yang membaca tabel langsung dengan SQL mentah
- **Klasifikasikan stored procedure, trigger, dan view**
  - Logika yang berpindah ke kode aplikasi versus logika yang menjadi aggregation pipeline
  - Efek samping yang dipicu trigger, yang kemudian menjadi change stream atau event aplikasi
- **Hasilkan penilaian go/no-go**
  - Beban kerja yang benar-benar diuntungkan oleh model dokumen (hierarkis, polimorfik, atribut per tenant yang bervariasi) versus beban kerja yang lebih baik tetap relasional
  - Estimasi usaha per fase, dan register risiko yang akan mengikuti proyek sampai cutover

### Modul 2: Pemilihan Strategi dan Arsitektur Migrasi

- **Bandingkan empat bentuk migrasi**
  - Migrasi offline big-bang dengan jendela maintenance: paling sederhana, permukaan konsistensi paling pendek, risiko bisnis tertinggi
  - Migrasi bertahap per bounded context atau per tenant: gradual, namun menuntut batas API internal yang sudah ada
  - Migrasi strangler-fig di balik lapisan routing: menjaga kedua store menjadi sumber kebenaran untuk trafik berbeda
  - Koeksistensi permanen dengan sinkronisasi CDC: tepat ketika sistem lama tidak mungkin dipensiunkan
- **Tetapkan aturan sumber kebenaran selama masa transisi**
  - Store mana yang menerima penulisan pada setiap tahap, dan bagaimana penulisan direplikasi ke store lainnya
  - Jalur baca yang toleran terhadap lag replikasi versus jalur yang wajib melihat tulisannya sendiri
- **Rancang topologi migrasi**
  - Penempatan ekstraktor terhadap database (jaringan, replication slot, read preference)
  - Tanggung jawab area staging dan layanan transformasi
  - Kebutuhan idempotensi untuk setiap batch dan setiap konsumen stream
- **Bangun tangga lingkungan**
  - Lingkungan development, staging dengan volume data menyerupai produksi, dan lingkungan gladi bersih cutover
  - Kebijakan anonimisasi atau subsetting untuk data produksi yang dipakai di staging

### Modul 3: Pemodelan Beban Kerja Hasil Migrasi

- **Terjemahkan normalisasi menjadi batas dokumen**
  - Relasi satu-ke-banyak: embed bila anak berjumlah terbatas dan selalu dibaca bersama induknya, gunakan referensi bila tidak
  - Relasi banyak-ke-banyak: array referensi dengan `$lookup` untuk minoritas analitik, salinan terkomputasi untuk mayoritas pembacaan
  - Modelkan berdasarkan pola akses, lalu validasi model terhadap seluruh query di katalog
- **Tangani konstruksi relasional yang canggung**
  - Tabel join yang menjadi array tertanam versus tabel join yang menjadi koleksi tersendiri
  - Pewarisan dan kolom discriminator yang dipetakan ke dokumen polimorfik dengan field discriminator bersama
  - Composite key dan surrogate key: mana yang bertahan sebagai `_id`, mana yang menjadi indeks unik
- **Rencanakan versioning skema sejak hari pertama**
  - Field `schemaVersion` per dokumen dan penanganan versi campuran di sisi aplikasi
  - Apakah dokumen dimigrasikan di tempat, secara lazy saat dibaca, atau lewat job backfill
- **Tinjau model dengan pola akses nyata sebelum memuat data**
  - Uji kering dua puluh query teratas sebagai aggregation pipeline terhadap sampel dataset
  - Catat query yang masih memerlukan `$lookup` dan putuskan apakah model atau query yang harus berubah
- **Dokumentasikan tabel pemetaan**
  - Satu baris per kolom sumber: path field tujuan, aturan transformasi, nullability, dan penanggung jawabnya

### Modul 4: Kesetiaan Tipe Data dan Aturan Transformasi

- **Presisi dan rentang numerik**
  - Pemetaan `NUMERIC` dan `DECIMAL` ke `Decimal128`, serta memastikan nilai uang tidak pernah melewati double
  - Lebar integer versus `Int32` dan `Int64` di BSON: menghindari overflow diam-diam pada kolom identity
  - Kunci auto-increment: kapan nilainya dipertahankan, kapan beralih ke `ObjectId`, dan bagaimana jaminan urutan dijaga
- **Tipe temporal dan zona waktu**
  - `TIMESTAMP WITH TIME ZONE` ke tanggal BSON (selalu UTC), dan bagaimana library klien menafsirkan ulang tanggal tersimpan
  - Kolom khusus tanggal yang tidak boleh memperoleh komponen waktu
  - Pemotongan presisi ketika kolom sumber menyimpan mikrodetik
- **String, enum, dan payload biner**
  - Padding `CHAR(n)` yang harus dipangkas, serta asumsi case-insensitive pada collation sumber
  - Enum yang dipetakan ke string versus kode numerik, dengan mempertimbangkan keterbacaan dan ukuran indeks
  - Payload `BLOB` dan `TEXT`: GridFS versus biner tertanam versus object storage eksternal
- **Semantik NULL dan constraint**
  - Logika tiga nilai di SQL versus perilaku field yang hilang pada query MongoDB
  - Menerjemahkan `NOT NULL` menjadi validator JSON Schema, dan constraint unik menjadi indeks unik dengan filter parsial
- **Bangun dan uji unit lapisan transformasi**
  - Fungsi transformasi deterministik dengan golden-file test pada baris representatif
  - Antrean penolakan untuk baris yang gagal validasi, dengan proses triase agar tidak ada data yang hilang diam-diam

### Modul 5: Rekayasa Pemuatan Data Awal

- **Pilih mekanisme ekstraksi**
  - Ekspor snapshot bergaya `mongoexport` versus tooling BSON native versus pembaca bulk berbasis driver
  - Pembacaan konsisten: ekstraksi dari snapshot atau read replica agar pemuatan awal melihat satu titik waktu
- **Muat dalam skala besar tanpa melumpuhkan cluster target**
  - Bulk write unordered, pengaturan ukuran batch, dan backpressure saat target adalah cluster bersama
  - Menghapus indeks sekunder sebelum pemuatan dan membangunnya kembali setelahnya
  - Tuning saat pemuatan: write concern, ekspektasi journaling, dan mengapa `w:1` hanya boleh dipakai bila tersedia jalur replay
- **Validasi pemuatan secara mekanis**
  - Jumlah baris sumber per tabel dibandingkan jumlah dokumen target per koleksi
  - Checksum agregat atas kolom numerik dan kolom hash, dibandingkan per partisi
  - Perbandingan struktural berbasis sampling antara dokumen dan baris sumbernya
- **Catat baseline pemuatan untuk rekonsiliasi berikutnya**
  - Posisi snapshot persis yang dipakai, agar sinkronisasi inkremental dapat melanjutkan tanpa celah maupun duplikat

### Modul 6: Change Data Capture dan Sinkronisasi Inkramental

- **Lanjutkan dari snapshot, bukan dari "sekarang"**
  - Menangkap posisi log sumber pada saat snapshot dan memutar ulang semua perubahan setelahnya
  - Resume token change stream di sisi MongoDB untuk arah sebaliknya
- **Pilih teknologi penangkapan secara sadar**
  - Penangkapan berbasis log (logical replication slot, pembaca binlog, konektor bergaya Debezium) versus polling kolom `updated_at`
  - Mengapa polling berbasis timestamp kehilangan operasi delete dan update yang terdistorsi jam secara diam-diam
- **Buat setiap konsumen idempoten**
  - Upsert dengan identifier stabil, dan penanda delete yang ditangani secara eksplisit
  - Kebutuhan urutan per dokumen dan cara menegakkannya ketika paralelisme diperlukan
- **Pantau jarak antara kedua sistem**
  - Lag yang diukur dalam detik dan dalam jumlah event, dengan alert pada keduanya
  - Job rekonsiliasi yang berjalan terus-menerus membandingkan sampel record secara bergilir
- **Uji jalur kegagalan**
  - Replay setelah restart konektor, pengiriman duplikat, dan perubahan skema yang datang di tengah stream

### Modul 7: Migrasi Kode Aplikasi

- **Ganti pola akses relasional di tingkat kode**
  - Memindahkan relasi entity ORM ke metode repository yang membaca dokumen utuh
  - Menulis ulang join sebagai pembacaan tertanam atau stage `$lookup`, lalu mengukur mana yang layak
  - Paginasi: paging berbasis offset di SQL versus cursor berbasis rentang atau `_id`, serta bug kebenaran yang disembunyikan paging offset
- **Terjemahkan batas transaksi**
  - Atomisitas satu dokumen menggantikan sebagian besar transaksi multi-statement
  - Transaksi multi-dokumen hanya ketika benar-benar dibutuhkan, dengan biaya latensinya diperhitungkan
  - Pola outbox atau saga untuk konsistensi antar layanan yang tidak lagi disediakan database
- **Tangani perbedaan konkurensi dan isolasi**
  - Level read concern dan write concern dipilih per operasi, bukan secara global
  - Konkurensi optimistik dengan field versi menggantikan `SELECT ... FOR UPDATE`
- **Pertahankan lapisan kompatibilitas selama transisi**
  - Abstraksi repository yang dapat melayani pembacaan dari salah satu store di balik feature flag
  - Contract test yang dijalankan terhadap kedua implementasi dan wajib tetap hijau sampai cutover selesai

### Modul 8: Validasi, Rekonsiliasi, dan Rekayasa Cutover

- **Definisikan kesetaraan, lalu ujilah**
  - Kesetaraan tingkat baris, tingkat agregat, dan tingkat aplikasi, masing-masing dengan harness tersendiri
  - Anggaran selisih: seberapa besar drift yang dapat diterima dan siapa yang menyetujuinya
- **Jalankan shadow traffic**
  - Mencerminkan pembacaan produksi ke cluster baru dan membandingkan respons, bukan hanya keadaan database
  - Perbandingan latensi per endpoint, dengan p95 dan p99 diperlakukan sebagai bagian dari kebenaran
- **Gladi bersih cutover**
  - Uji kering berwaktu yang mencakup pembekuan penulisan, sinkronisasi final, verifikasi, dan pemindahan trafik
  - Pemicu rollback dituliskan lebih dulu, dengan ambang batas alih-alih opini
- **Eksekusi runbook cutover**
  - Bekukan penulisan, kuras antrean CDC, verifikasi jumlah dan checksum, alihkan routing, pantau anggaran error
  - Checklist jam pertama: tingkat error, latensi, lag replikasi, dan query yang paling mungkin mengalami regresi
- **Jaga sistem lama tetap dapat ditulisi selama jendela rollback**
  - CDC arah balik atau titik tanpa kembali yang didokumentasikan, dipilih sebelum cutover, bukan saat cutover berlangsung

### Modul 9: Performa dan Rekayasa Indeks Pasca-Migrasi

- **Bangun ulang indeks dari bentuk query yang teramati**
  - Desain indeks dari katalog hasil migrasi, dengan menerapkan urutan equality-sort-range
  - Covered query untuk jalur baca terpanas, beserta biaya penulisan setiap indeks
- **Diagnosis bottleneck baru secara jujur**
  - Profiler dan slow query log pada beban kerja hasil migrasi
  - Ukuran working set dan tekanan cache, yang jarang sesuai prediksi relasional
  - Aggregation pipeline yang melimpah ke disk, dan batas memori yang menyebabkannya
- **Tuning cluster, bukan hanya query**
  - Read preference dan topologi replica set untuk jalur baca hasil migrasi yang padat
  - Ukuran connection pool di driver, penyebab umum lonjakan latensi pasca-migrasi
- **Baseline ulang semuanya**
  - Suite benchmark yang sama dari Modul 1 dijalankan terhadap cluster baru, dengan selisih terdokumentasi

### Modul 10: Operasional, Tata Kelola, dan Dekomisioning Sistem Lama

- **Operasikan sistem baru dengan benar**
  - Backup dan point-in-time recovery, diuji dengan restore ke cluster percobaan
  - Monitoring, alerting, dan runbook yang benar-benar akan dipakai tim on-call
  - Perencanaan kapasitas dari angka pertumbuhan yang dicatat saat penilaian
- **Kelola model data setelah migrasi**
  - Validator skema sebagai quality gate, dan proses review untuk perubahan model
  - Retensi, arsip, dan kewajiban penghapusan yang diwarisi dari sistem lama
- **Pensiunkan sistem lama tanpa kehilangan riwayat**
  - Strategi arsip: dump relasional dingin, file hasil ekspor, atau salinan khusus analitik
  - Jendela sunset read-only, pencabutan kredensial, dan persetujuan dekomisioning
- **Jalankan retrospektif yang memberi modal untuk migrasi berikutnya**
  - Asumsi penilaian mana yang bertahan dan mana yang tidak, serta artefak yang kini dimiliki tim

## Proyek Akhir

Migrasikan skema e-commerce relasional berukuran produksi — pelanggan, pesanan, baris pesanan, produk, kategori, pembayaran, dan audit log — ke MongoDB secara menyeluruh.

Hasil kerja mencakup penilaian beban kerja dan matriks frekuensi join, tabel pemetaan kolom ke field, lapisan transformasi dengan golden-file test, serta cluster target yang terisi penuh dengan indeks yang sudah dibangun ulang. Peserta kemudian menjalankan change data capture dari sumber relasional, membuktikan kesetaraan dengan harness rekonsiliasi, mencerminkan shadow read, melakukan gladi bersih cutover berwaktu dengan jalur rollback terdokumentasi, lalu mengeksekusi cutover, menjalankan ulang suite benchmark Modul 1, dan menyusun rencana dekomisioning database lama. Bukti diwajibkan pada setiap gerbang: jumlah dan checksum, keluaran harness, waktu cutover, serta perbandingan benchmark sebelum dan sesudah.

## Kriteria Penilaian

- **Tugas**: Artefak mingguan dinilai atas kelengkapan dan ketepatan — lembar inventaris, tabel pemetaan, uji transformasi, laporan validasi pemuatan, dashboard lag CDC, lapisan repository hasil penulisan ulang, harness rekonsiliasi, dan runbook cutover. Artefak yang terlambat menghambat lab minggu berikutnya.
- **Integritas data**: Tidak boleh ada selisih baris atau dokumen yang tidak dijelaskan pada gerbang mana pun; baris yang ditolak harus ditriase dan dipertanggungjawabkan, tidak pernah dihapus diam-diam.
- **Disiplin cutover**: Gladi bersih harus berwaktu, jalur rollback harus dapat dieksekusi dan didemonstrasikan setidaknya sekali, dan tidak ada langkah yang boleh diimprovisasi saat cutover langsung.
- **Kesetaraan performa**: Jalur baca hasil migrasi harus berada dalam anggaran latensi yang disepakati terhadap baseline relasional, dengan regresi dijelaskan alih-alih diratakan.
- **Proyek Akhir**: Dinilai dari kekuatan jejak bukti — migrasi hanya selesai ketika kesetaraan, rollback, dan performa pasca-migrasi semuanya dibuktikan dengan artefak, ditambah retrospektif tertulis yang menyebut asumsi yang tidak bertahan saat berhadapan dengan produksi.

## Referensi

- Dokumentasi MongoDB: Pemodelan data dan desain skema — https://www.mongodb.com/docs/manual/data-modeling/
- Dokumentasi MongoDB: Transaksi serta read/write concern — https://www.mongodb.com/docs/manual/core/transactions/
- Dokumentasi MongoDB: Change stream dan resume token — https://www.mongodb.com/docs/manual/changeStreams/
- Dokumentasi MongoDB: Bulk write dan perilaku pembangunan indeks — https://www.mongodb.com/docs/manual/core/bulk-write-operations/
- Dokumentasi MongoDB: Validasi skema dengan JSON Schema — https://www.mongodb.com/docs/manual/core/schema-validation/
- Dokumentasi Debezium: Konektor MongoDB dan relasional — https://debezium.io/documentation/
- Dokumentasi PostgreSQL: Logical replication dan replication slot — https://www.postgresql.org/docs/current/logical-replication.html
- MongoDB University: kursus gratis tentang pemodelan data dan performa — https://learn.mongodb.com/

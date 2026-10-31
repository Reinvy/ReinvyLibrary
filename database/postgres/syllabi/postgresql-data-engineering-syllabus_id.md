---
title: "Silabus Data Engineering PostgreSQL"
description: "Kurikulum tujuh modul yang membawa pengembang berpengalaman dari pemodelan data relasional dan SQL lanjutan hingga performa query, pipeline ingestion, partisi, change data capture, dan kualitas data di PostgreSQL."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Data Engineering PostgreSQL

## Ringkasan

Kurikulum tujuh modul ini dirancang untuk engineer yang sudah nyaman menulis SQL tetapi ingin memiliki platform data secara utuh, bukan hanya menjalankan query di atasnya. Setiap modul membidik satu lapisan tumpukan data PostgreSQL produksi: desain skema, SQL analitis, optimasi berbasis execution plan, ingestion yang andal, penyimpanan terpartisi dengan retensi, change data capture ke sistem hilir, serta constraint dan pengujian yang menjaga kepercayaan pada data turunan.

Cakupannya sengaja dibuat sempit. Kursus ini tidak membahas instalasi, perkakas backup, atau topologi high availability secara mendalam karena materi tersebut milik jalur DBA. Sebagai gantinya, seluruh modul mengikuti satu dataset — aliran event pesanan e-commerce — dari tabel landing mentah hingga model analitik terkurasi, sehingga setiap teknik diterapkan pada skema yang sama dan konsekuensi tiap keputusan tetap terlihat di modul berikutnya. Modul 1 sampai 3 membangun fondasi, modul 4 sampai 6 membangun pipeline, dan modul 7 menutup siklus dengan gerbang kualitas.

Setiap modul memadukan kuliah konsep singkat, lab terpandu pada instance PostgreSQL 16 lokal, dan latihan review di mana peserta mengkritik desain yang sengaja dibuat cacat. Dua minggu terakhir dialokasikan untuk proyek akhir yang menuntut pipeline batch dan streaming yang benar-benar berjalan.

## Kurikulum

### Modul 1: Pemodelan Data untuk Beban Kerja Analitis (Minggu 1)

- **Fondasi relasional yang ditinjau ulang**
  - Primary key, foreign key, dan biaya penegakannya saat bulk load
  - Normalisasi hingga bentuk normal ketiga dan kasus spesifik saat denormalisasi menguntungkan
  - Konvensi penamaan, schema sebagai namespace, dan pemisahan lapisan mentah dari lapisan terkurasi
  - Memilih surrogate key versus natural key untuk tabel fakta

- **Dimensional modeling di PostgreSQL**
  - Star schema dengan `orders`, `order_items`, dan dimensi terkonformasi
  - Slowly changing dimension tipe 1 dan tipe 2 dengan rentang validitas
  - Tabel bridge untuk atribut many-to-many
  - Kapan kolom JSONB lebih baik daripada tabel samping, dan kapan ia menjadi beban

- **Lab**: memodelkan dataset pesanan dalam bentuk ternormalisasi dan star, lalu mengukur jumlah baris dan kedalaman join masing-masing.

### Modul 2: SQL Lanjutan untuk Transformasi (Minggu 2)

- **Query yang dapat dikomposisi**
  - Common table expression untuk staging dan keterbacaan, serta kapan ia di-inline
  - Join `LATERAL` untuk top-N per grup dan pemanggilan fungsi per baris
  - `DISTINCT ON` sebagai idiom deduplikasi yang ringkas
  - Recursive CTE untuk hierarki dan penelusuran graf dengan deteksi siklus

- **Agregasi analitis**
  - Window function: `row_number`, `lag`, `sum() OVER`, frame, dan `EXCLUDE`
  - `GROUPING SETS`, `ROLLUP`, dan `CUBE` untuk laporan bertingkat
  - `FILTER (WHERE ...)` dan ordered aggregate
  - `generate_series` untuk mengisi celah tanggal dan calendar spine

- **Penulisan idempoten**
  - `INSERT ... ON CONFLICT DO UPDATE` dengan `EXCLUDED` dan update terjaga
  - Semantik `MERGE` dan catatan konkurensinya
  - Deduplikasi dengan `row_number()` atas natural key
  - Lab: membangun mart pendapatan harian yang dapat dijalankan ulang tanpa penghitungan ganda.

### Modul 3: Performa dan Execution Plan (Minggu 3)

- **Membaca plan**
  - `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` dan makna actual versus estimated rows
  - Jenis scan: sequential, index, index-only, bitmap heap
  - Strategi join: nested loop, hash join, merge join, dan saat planner salah menaksir
  - Rows removed by filter sebagai sinyal indeks hilang atau tidak tepat

- **Statistik dan indeks**
  - `ANALYZE`, statistics target, dan `CREATE STATISTICS` untuk kolom berkorelasi
  - Pemilihan B-tree, hash, GIN, GiST, dan BRIN sesuai bentuk data
  - Partial index dan covering index dengan `INCLUDE`
  - Write amplification: mengukur biaya setiap indeks yang ditambahkan

- **Maintenance**
  - Ambang autovacuum, batas freeze, dan transaction ID wraparound
  - `pg_stat_statements` untuk menemukan query paling boros berdasarkan total waktu
  - Lab: menurunkan waktu query laporan dari lima detik menjadi di bawah dua ratus milidetik.

### Modul 4: Pipeline Ingestion (Minggu 4)

- **Bulk loading**
  - `COPY FROM` dengan format CSV dan binary versus `INSERT` multi-baris
  - Tabel staging, tabel `UNLOGGED`, dan `COPY FREEZE` setelah pembuatan tabel
  - Penundaan constraint dan urutan pembuatan indeks selama load
  - Penanganan error dengan `ON_ERROR` dan penangkapan baris yang ditolak

- **Pola inkremental**
  - Watermark, high-water mark, dan jendela yang diputar ulang
  - Upsert idempoten dengan kunci `(source, natural_key, updated_at)`
  - Strategi batching: ukuran transaksi, durasi lock, dan checkpoint
  - Menangani record yang terlambat dan tidak berurutan tanpa kehilangan data

- **Orkestrasi**
  - Model dbt berlapis sebagai staging, intermediate, dan mart
  - Task Airflow atau Dagster yang gagal secara eksplisit dan dapat dilanjutkan dengan aman
  - `postgres_fdw` dan `file_fdw` untuk menarik sumber eksternal ke dalam warehouse
  - Lab: memuat data event pesanan satu bulan dua kali dan membuktikan hasilnya identik.

### Modul 5: Partisi dan Siklus Hidup Data (Minggu 5)

- **Declarative partitioning**
  - `RANGE` untuk waktu, `LIST` untuk tenant atau region, `HASH` untuk distribusi merata
  - Partition pruning dan alasan partition key harus muncul di predikat
  - Unique constraint dan foreign key lintas partisi
  - Default partition sebagai jaring pengaman sekaligus jebakan performa yang senyap

- **Operasi dalam skala besar**
  - `ATTACH` dan `DETACH PARTITION CONCURRENTLY` untuk rotasi tanpa downtime
  - `pg_partman` untuk pembuatan dan retensi otomatis
  - Memindahkan partisi dingin ke penyimpanan lebih murah atau arsip `pg_dump`
  - Memantau jumlah partisi, ketimpangan ukuran, dan cakupan autovacuum

- **Lab**: mengubah tabel events monolitik menjadi partisi bulanan tanpa menghentikan penulisan, lalu melepas dan mengarsipkan data satu kuartal.

### Modul 6: Change Data Capture dan Streaming (Minggu 6)

- **Logical replication**
  - `wal_level = logical`, replication slot, dan decoding `pgoutput`
  - Publication dan subscription, termasuk daftar kolom dan filter baris
  - Replica identity dan alasan `REPLICA IDENTITY FULL` mahal
  - Bahaya slot yang tertinggal: slot terbengkalai akan memenuhi disk

- **Pengiriman ke sistem hilir**
  - Connector Debezium PostgreSQL dan fase snapshot awal
  - Pola sink Kafka Connect dan kompatibilitas schema registry
  - Pengiriman at-least-once, kunci deduplikasi, dan ilusi exactly-once
  - Memantau lag `pg_replication_slots` dan status `pg_stat_replication`

- **Lab**: mengalirkan perubahan pesanan ke database kedua dan merekonsiliasi jumlah setelah connector dipaksa restart.

### Modul 7: Kualitas Data dan Tata Kelola (Minggu 7)

- **Constraint sebagai kontrak**
  - `NOT NULL`, `CHECK`, dan exclusion constraint sebagai dokumentasi yang dapat dieksekusi
  - Constraint `NOT VALID` untuk peluncuran online pada tabel besar
  - Domain type dan enum versus tabel lookup
  - Mengukur tingkat pelanggaran constraint alih-alih menyembunyikannya

- **Pengujian dan observabilitas**
  - Pengujian dbt: uniqueness, referential integrity, accepted values, freshness
  - Suite Great Expectations untuk anomali distribusi dan volume
  - Alert pada delta jumlah baris dan pergeseran null rate
  - Lineage dari tabel sumber ke mart, tercatat di katalog

- **Tata kelola**
  - Row-level security untuk mart multi-tenant
  - Klasifikasi PII, masking view, dan pilihan enkripsi kolom
  - Kebijakan retensi yang dinyatakan sebagai kode, bukan halaman wiki
  - Lab: menambahkan gerbang kualitas yang memblokir promosi mart ketika pengujian gagal.

## Proyek Akhir

Peserta membangun platform analitik ringkas namun lengkap pada satu cluster PostgreSQL dengan dataset pesanan dari lab. Deliverable mencakup mart star schema dengan dimensi pelanggan tipe 2, job ingestion idempoten yang dapat diputar ulang untuk rentang tanggal mana pun, partisi range bulanan dengan job retensi otomatis, replication slot logis yang memasok consumer hilir, serta proyek dbt yang pengujiannya menjadi gerbang publikasi. Setiap peserta menyerahkan migrasi skema, kode pipeline, penjelasan tertulis atas tiga keputusan performa yang didukung keluaran `EXPLAIN`, dan demo lima menit yang menunjukkan load yang diputar ulang serta batch buruk yang ditolak.

## Kriteria Penilaian

- **Lab mingguan**: 35% — kebenaran result set, idempotensi, dan apakah pendekatan tetap benar saat dijalankan kedua kali.
- **Review desain**: 20% — kualitas kritik pada latihan skema cacat, termasuk alternatif yang konkret.
- **Proyek akhir**: 35% — kualitas skema, keandalan pipeline, desain partisi dan retensi, serta pekerjaan performa berbasis bukti.
- **Dokumentasi**: 10% — kejelasan catatan arsitektur dan reproduktifitas instruksi setup.

## Referensi

- Dokumentasi PostgreSQL: Table Partitioning — https://www.postgresql.org/docs/current/ddl-partitioning.html
- Dokumentasi PostgreSQL: Logical Replication — https://www.postgresql.org/docs/current/logical-replication.html
- Dokumentasi PostgreSQL: Using EXPLAIN — https://www.postgresql.org/docs/current/using-explain.html
- Dokumentasi PostgreSQL: Routine Vacuuming — https://www.postgresql.org/docs/current/routine-vacuuming.html
- Dokumentasi PostgreSQL: COPY — https://www.postgresql.org/docs/current/sql-copy.html
- Dokumentasi Debezium: PostgreSQL Connector — https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Dokumentasi dbt: Building a dbt Project — https://docs.getdbt.com/docs/build/projects
- README pg_partman — https://github.com/pgpartman/pg_partman

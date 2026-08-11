---
title: "Silabus PostgreSQL Lanjutan"
description: "Kurikulum lanjutan 12 minggu yang mencakup internal query optimizer PostgreSQL, pengindeksan tingkat lanjut, manajemen vacuum dan bloat, MVCC dan kontrol konkurensi, replikasi logis dan ketersediaan tinggi, observabilitas, ekosistem ekstensi, pergudangan data, penguatan keamanan, dan pemulihan bencana."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus PostgreSQL Lanjutan

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk pengembang dan administrator basis data berpengalaman yang sudah memahami fundamental PostgreSQL dan ingin menguasai internal, rekayasa kinerja, serta operasi produksi yang membedakan pengguna kompeten dari seorang ahli. Kurikulum ini membahas secara mendalam model biaya query optimizer, tipe indeks lanjutan dan kapan menggunakannya, internal vacuum dan bloat, perilaku MVCC dan penguncian, replikasi logis dan arsitektur ketersediaan tinggi, perkakas observabilitas, ekosistem ekstensi, pola analitis dan pergudangan, penguatan keamanan, serta pemulihan bencana dalam skala besar. Setiap minggu memadukan teori dengan laboratorium langsung menggunakan kumpulan data yang menyerupai kondisi produksi nyata. Pada akhirnya, Anda akan mampu mendiagnosis kueri lambat dari prinsip pertama, merancang indeks yang bertahan pada beban kerja nyata, mengoperasikan replikasi dan failover dengan aman, serta membangun platform PostgreSQL yang memenuhi target keandalan dan kinerja yang ketat.

## Kurikulum

### Minggu 1: Internal Query Optimizer
- **Cara Kerja Planner**
  - Alur parse, rewrite, plan, dan execute
  - Aljabar relasional dan struktur pohon rencana
  - Model biaya: biaya startup vs total, estimasi baris, lebar
  - Anatomi keluaran `EXPLAIN`: tipe node dan kolom biaya
- **Statistik dan Estimasi**
  - `pg_statistic`, bucket histogram, dan daftar most-common-values
  - Fraksi null, jumlah nilai unik, dan korelasi
  - Pengambilan sampel `ANALYZE` dan target statistik
  - Statistik tambahan untuk kolom berkorelasi (`CREATE STATISTICS`)
- **Strategi Join**
  - Nested loop, hash join, merge join: kapan masing-masing unggul
  - Urutan join dan optimizer genetik `geqo`
  - Tekanan work memory dan spill file sementara
- **Laboratorium Praktik**
  - Membaca `EXPLAIN ANALYZE` pada kueri lambat sungguhan
  - Menggunakan `auto_explain` untuk menangkap rencana di produksi
  - Memperbaiki estimasi buruk dengan statistik tambahan

### Minggu 2: Strategi Pengindeksan Lanjutan
- **Pembahasan Mendalam Tipe Indeks**
  - Internal B-tree: tata letak halaman, deduplikasi, kolom `INCLUDE`
  - GIN untuk JSONB, array, dan pencarian teks lengkap
  - GiST dan SP-GiST untuk geometri, rentang, dan pencarian k-NN
  - BRIN untuk tabel append-only yang sangat besar
  - Indeks hash, bloom, parsial, dan ekspresi
- **Desain Indeks pada Beban Kerja Nyata**
  - Urutan kolom indeks komposit dan selektivitas
  - Indeks covering dan index-only scan
  - Urutan kolom berkorelasi vs tidak berkorelasi
  - Kapan indeks merugikan: amplifikasi tulis dan bloat
- **Pemeliharaan Indeks**
  - Mendeteksi dan mengukur bloat indeks
  - `REINDEX CONCURRENTLY` dan `pg_repack`
  - Deteksi indeks tak terpakai dengan `pg_stat_user_indexes`
- **Laboratorium Praktik**
  - Tolok ukur GIN vs B-tree vs BRIN pada data deret waktu
  - Membuat indeks covering dan memverifikasi index-only scan
  - Menyimulasikan bloat dan merencanakan jendela pemeliharaan

### Minggu 3: Internal Vacuum, Bloat, dan Pemeliharaan
- **MVCC dan Siklus Hidup Tuple Mati**
  - Bagaimana `UPDATE` dan `DELETE` menciptakan tuple mati
  - Wraparound ID transaksi dan horizon `xid`
  - Peta visibilitas dan akselerasi index-only scan
- **Mekanika Vacuum**
  - `VACUUM` vs `VACUUM FULL` vs `ANALYZE`
  - Pemicu autovacuum: ambang batas, faktor skala, batas biaya
  - `n_dead_tup`, `n_live_tup`, dan `pg_stat_user_tables`
- **Manajemen Bloat**
  - Penyebab bloat tabel dan kueri kuantifikasi
  - `pg_freespacemap` dan inspeksi kepadatan halaman
  - Penghapusan bloat tanpa downtime dengan `pg_repack`
- **Laboratorium Praktik**
  - Menyetel autovacuum untuk tabel dengan churn tinggi
  - Mengukur bloat dengan kueri bloat standar
  - Menjalankan `pg_repack` yang aman pada tabel produksi sibuk

### Minggu 4: MVCC, Penguncian, dan Kontrol Konkurensi
- **Tingkat Isolasi Ditinjau Ulang**
  - Read committed, repeatable read, dan serializable
  - Isolasi snapshot dan SSI (serializable snapshot isolation)
  - Anomali: dirty read, non-repeatable read, phantom, write skew
- **Model Penguncian**
  - Kunci tingkat baris: `FOR UPDATE`, `FOR SHARE`, `FOR NO KEY UPDATE`
  - Mode kunci tingkat tabel dan matriks konflik
  - Antrean kunci, deadlock, dan inspeksi `pg_locks`
- **Advisory Lock dan Pola Lanjutan**
  - Advisory lock lingkup sesi vs transaksi
  - Mengimplementasikan antrean pekerja terdistribusi dengan aman
  - `SKIP LOCKED` untuk pekerja konkuren
- **Laboratorium Praktik**
  - Mereproduksi write skew pada isolasi serializable
  - Mendiagnosis rantai tunggu kunci dengan `pg_blocking_pids()`
  - Membangun antrean pekerja yang aman dengan `SKIP LOCKED`

### Minggu 5: Replikasi Logis dan Ketersediaan Tinggi
- **Arsitektur Replikasi Logis**
  - Model publication dan subscription
  - Filter baris, daftar kolom, dan keterbatasan replikasi DDL
  - Penanganan konflik dan persyaratan replica identity
- **Penyegaran Replikasi Fisik**
  - Streaming replication, pengiriman WAL, dan timeline
  - Commit sinkron vs asinkron
  - Topologi replikasi berjenjang
- **Ketersediaan Tinggi dengan Patroni**
  - Patroni, etcd, dan model konsensus terdistribusi
  - Failover otomatis, `pg_rewind`, dan pencegahan split-brain
  - Prosedur switchover tanpa downtime
- **Laboratorium Praktik**
  - Membangun klaster Patroni tiga node
  - Melakukan switchover terkendali dan failover tersimulasi
  - Membangun pipeline replikasi logis untuk basis data pelaporan

### Minggu 6: Observabilitas dan Pemantauan Kinerja
- **Observabilitas Bawaan**
  - `pg_stat_statements` dan sidik jari kueri ternormalisasi
  - `pg_stat_activity` dan tampilan `pg_stat_progress_*`
  - `pg_stat_bgwriter`, `pg_stat_wal`, dan statistik I/O
- **Diagnostik Lanjutan**
  - `pg_wait_sampling` dan analisis wait event
  - Alur kerja penyetelan top-N `pg_stat_statements`
  - `pg_show_plans` dan penangkapan rencana untuk pernyataan lambat
- **Tumpukan Pemantauan Eksternal**
  - Prometheus, node_exporter, dan postgres_exporter
  - Dasbor Grafana dan aturan alerting
  - Alur kerja analisis log pgBadger
- **Laboratorium Praktik**
  - Membangun tumpukan Prometheus/Grafana lengkap untuk PostgreSQL
  - Mengidentifikasi daftar 5 kueri teratas dan mengoptimalkan masing-masing
  - Menyiapkan alerting untuk lag replikasi dan ambang bloat

### Minggu 7: Ekosistem Ekstensi
- **Ekstensi Penting**
  - `pg_stat_statements`, `pg_trgm`, `pgcrypto`, `uuid-ossp`
  - `pg_partman` untuk manajemen partisi otomatis
  - `pg_cron` untuk pekerjaan pemeliharaan terjadwal
- **Geospasial dengan PostGIS**
  - Geometry vs geography, indeks spasial (GiST)
  - Kueri spasial umum dan keluarga fungsi `ST_`
  - PostGIS di produksi: proyeksi, tiling, dan kinerja
- **Data Deret Waktu dan Vektor**
  - Hypertable TimescaleDB dan continuous aggregates
  - `pgvector` untuk pencarian kemiripan dan indeks HNSW
  - Memilih alat yang tepat: TimescaleDB vs partisi biasa
- **Laboratorium Praktik**
  - Menginstal dan mengonfigurasi kumpulan ekstensi terkurasi
  - Memuat kumpulan data geospasial nyata dan menjalankan kueri spasial
  - Membangun fitur pencarian vektor dengan `pgvector`

### Minggu 8: PL/pgSQL Lanjutan dan Pemrograman Prosedural
- **Penguasaan PL/pgSQL**
  - Blok, variabel, dan struktur kontrol
  - Kursor, loop `FOR`, dan operasi batch
  - Penanganan eksepsi dan kontrol transaksi dalam prosedur
- **Fungsi, Prosedur, dan Trigger**
  - `LANGUAGE SQL` vs `plpgsql` vs `plpython3u`
  - Fungsi trigger dan event trigger
  - Constraint trigger dan deferred constraint
- **Pola Lanjutan**
  - Agregat kustom dan fungsi pendukung window
  - SQL dinamis dengan `EXECUTE` dan `format()`
  - Menulis fungsi migrasi yang idempoten
- **Laboratorium Praktik**
  - Menulis jejak audit berbasis trigger kelas produksi
  - Mengimplementasikan agregat kustom untuk bucket persentil
  - Membangun prosedur ETL dinamis dengan penanganan kesalahan

### Minggu 9: Pergudangan Data dan Pola Analitis
- **Desain Beban Kerja Analitis**
  - Skema star dan snowflake di PostgreSQL
  - Partisi dalam skala besar: range, list, dan hash
  - Pemeliharaan materialized view inkremental
- **Data Asing dan Federasi**
  - `postgres_fdw` untuk kueri lintas basis data
  - `file_fdw` dan pola ingest CSV
  - Opsi sharding dan trade-off-nya
- **Pendekatan Kolumnar dan OLAP**
  - `citus` untuk beban kerja analitis terdistribusi
  - `pg_analytics` dan ekstensi penyimpanan kolumnar
  - Kapan tetap row-oriented vs beralih ke kolumnar
- **Laboratorium Praktik**
  - Merancang gudang analitik berpartisi
  - Mengkueri basis data terfederasi dengan `postgres_fdw`
  - Tolok ukur kumpulan kueri OLAP dengan dan tanpa penyimpanan kolumnar

### Minggu 10: Penguatan Keamanan
- **Autentikasi dan Enkripsi**
  - SCRAM-SHA-256, autentikasi sertifikat, dan integrasi LDAP
  - Konfigurasi TLS dan cipher suite
  - Enkripsi tingkat kolom dengan `pgcrypto`
- **Pembahasan Mendalam Otorisasi**
  - Kebijakan keamanan tingkat baris dan `WITH CHECK`
  - Hak istimewa kolom dan default privileges
  - `pgaudit` untuk pencatatan audit yang komprehensif
- **Keamanan Operasional**
  - Manajemen rahasia dengan Vault dan Kubernetes
  - Isolasi jaringan dan praktik terbaik `pg_hba.conf`
  - Enkripsi cadangan dan penyimpanan offsite yang aman
- **Laboratorium Praktik**
  - Mengimplementasikan keamanan tingkat baris untuk aplikasi multi-tenant
  - Mengonfigurasi `pgaudit` dan meninjau keluaran audit
  - Menguatkan `postgresql.conf` dan `pg_hba.conf` produksi

### Minggu 11: Cadangan, Pemulihan, dan Pemulihan Bencana
- **Perkakas Cadangan dalam Skala Besar**
  - Arsitektur `pgBackRest`: repositori, stanza, dan delta restore
  - Pengarsipan WAL dan kebijakan retensi
  - `pg_dump` vs cadangan fisik untuk tujuan pemulihan berbeda
- **Point-in-Time Recovery**
  - Target pemulihan: waktu, ID transaksi, dan named restore points
  - Validasi restore dan disiplin pengujian cadangan
- **Strategi Pemulihan Bencana**
  - Definisi dan trade-off RPO dan RTO
  - Replikasi multi-region dan runbook failover
  - Memulihkan ke titik sebelum peristiwa korupsi logis
- **Laboratorium Praktik**
  - Mengonfigurasi `pgBackRest` dengan cadangan terenkripsi
  - Menjalankan latihan PITR dan memverifikasi integritas data
  - Menulis dan melatih runbook DR lengkap

### Minggu 12: Capstone — Platform PostgreSQL Produksi
- **Proyek Capstone**
  - Merancang dan mengimplementasikan platform PostgreSQL kelas produksi
  - Menggabungkan HA Patroni, cadangan pgBackRest, pemantauan, dan keamanan
  - Mendokumentasikan keputusan arsitektur, RPO/RTO, dan runbook
- **Tinjauan Akhir**
  - Tinjauan penyetelan kinerja platform
  - Latihan failover dan pemulihan
  - Mempresentasikan desain kepada rekan untuk dikritik

## Proyek Akhir

Peserta didik akan merancang dan mengimplementasikan **Platform PostgreSQL Produksi** untuk aplikasi SaaS fiktif dengan lalu lintas tinggi. Proyek harus mencakup:

1. **Ketersediaan Tinggi**: Klaster Patroni tiga node dengan etcd, failover otomatis, dan prosedur switchover yang terdokumentasi.
2. **Cadangan dan Pemulihan**: Konfigurasi `pgBackRest` dengan cadangan terenkripsi, pengarsipan WAL, dan runbook PITR yang terbukti.
3. **Rekayasa Kinerja**: Minimal tiga optimasi kueri terdokumentasi menggunakan `EXPLAIN ANALYZE`, statistik tambahan, atau desain indeks lanjutan, dengan metrik sebelum/sesudah.
4. **Observabilitas**: Tumpukan Prometheus/Grafana dengan dasbor dan alert untuk lag replikasi, bloat, dan kueri lambat.
5. **Penguatan Keamanan**: Keamanan tingkat baris untuk multi-tenancy, `pgaudit` diaktifkan, TLS diterapkan, dan rahasia dieksternalisasi.
6. **Beban Kerja Analitis**: Lapisan pelaporan berpartisi atau terfederasi yang melayani kumpulan kueri OLAP realistis.

Deliverable: diagram arsitektur, file konfigurasi (Patroni, pgBackRest, pemantauan), artefak SQL, hasil tolok ukur, dan runbook tertulis yang mencakup prosedur failover, restore, dan pemeliharaan.

## Kriteria Penilaian

- **Kualitas Arsitektur (25%)**: Desain HA yang benar, pilihan RPO/RTO yang masuk akal, dan pemilihan teknologi yang dapat dijustifikasi.
- **Rekayasa Kinerja (20%)**: Kemampuan mendiagnosis dan memperbaiki masalah kinerja nyata dengan peningkatan yang terukur.
- **Kesiapan Operasional (20%)**: Runbook lengkap dan terlatih untuk failover, PITR, dan pemeliharaan rutin.
- **Implementasi Keamanan (15%)**: Kebijakan RLS yang benar, cakupan audit, dan konfigurasi yang dikeraskan.
- **Pemantauan dan Alerting (10%)**: Dasbor dan alert yang mampu menangkap insiden nyata sebelum pengguna menyadarinya.
- **Dokumentasi dan Komunikasi (10%)**: Keputusan arsitektur yang jelas, analisis trade-off, dan penulisan runbook profesional.

## Referensi

- **Dokumentasi Resmi**: [Dokumentasi PostgreSQL](https://www.postgresql.org/docs/)
  - Internal: [https://www.postgresql.org/docs/current/internals.html](https://www.postgresql.org/docs/current/internals.html)
  - Tips Kinerja: [https://www.postgresql.org/docs/current/performance-tips.html](https://www.postgresql.org/docs/current/performance-tips.html)
  - Ketersediaan Tinggi: [https://www.postgresql.org/docs/current/high-availability.html](https://www.postgresql.org/docs/current/high-availability.html)
- **Buku**:
  - "PostgreSQL 16 Administration Cookbook" oleh Simon Riggs dan Gianni Ciolli
  - "PostgreSQL Query Optimization" oleh Hans-Jürgen Schönig
  - "The Art of PostgreSQL" oleh Dimitri Fontaine
- **Dokumentasi Proyek**:
  - [Dokumentasi Patroni](https://patroni.readthedocs.io/)
  - [Panduan Pengguna pgBackRest](https://pgbackrest.org/user-guide.html)
  - [Dokumentasi PostGIS](https://postgis.net/documentation/)
  - [Dokumen TimescaleDB](https://docs.timescale.com/)
  - [README pgvector](https://github.com/pgvector/pgvector)
- **Sumber Daya Daring**:
  - [Blog pganalyze](https://pganalyze.com/blog) — artikel kinerja PostgreSQL
  - [Penganalisis EXPLAIN Depesz](https://explain.depesz.com/) — visualisasi rencana
  - [Wiki PostgreSQL](https://wiki.postgresql.org/) — basis pengetahuan komunitas

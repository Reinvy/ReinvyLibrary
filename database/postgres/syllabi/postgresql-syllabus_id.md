---
title: "Silabus PostgreSQL"
description: "Kurikulum komprehensif 12 minggu yang mencakup fundamental PostgreSQL, query SQL, desain skema, pengindeksan, optimalisasi performa, administrasi, dan deployment produksi."
category: "database"
technology: "postgres"
difficulty: "beginner"
type: "syllabus"
locale: "id"
---

# Silabus PostgreSQL

## Ringkasan

Silabus komprehensif 12 minggu ini dirancang untuk membawa pelajar dari tingkat pemula absolut hingga menjadi pengembang PostgreSQL yang siap produksi. Kurikulum berjalan secara sistematis melalui fundamental SQL, desain skema, strategi pengindeksan, optimalisasi query, administrasi database, backup dan recovery, ketersediaan tinggi, serta praktik terbaik keamanan. Setiap minggu dibangun di atas minggu sebelumnya, menggabungkan konsep teoretis dengan latihan langsung dan proyek dunia nyata. Di akhir kursus ini, Anda akan mampu mendesain skema database yang efisien, menulis query yang dioptimalkan, mengelola instance PostgreSQL di produksi, dan memecahkan masalah performa dengan percaya diri.

## Kurikulum

### Minggu 1: Pengenalan PostgreSQL
- **Apa itu PostgreSQL?**
  - Sejarah, komunitas, dan ekosistem
  - Perbandingan dengan database relasional lainnya
  - Gambaran umum fitur dan kemampuan PostgreSQL
- **Instalasi dan Konfigurasi**
  - Menginstal PostgreSQL di Linux, macOS, dan Windows
  - Memverifikasi instalasi dengan `psql --version`
  - Memulai, menghentikan, dan me-restart layanan PostgreSQL
- **Shell Interaktif psql**
  - Terhubung ke database: `psql -U postgres -d mydb`
  - Meta-perintah dasar: `\l`, `\dt`, `\d`, `\du`, `\conninfo`
  - Eksekusi query dan pemformatan hasil
  - Mendapatkan bantuan dengan `\h` dan `\?`

### Minggu 2: Fundamental SQL
- **Tipe Data**
  - Tipe numerik: `INTEGER`, `BIGINT`, `DECIMAL`, `SERIAL`
  - Tipe karakter: `VARCHAR(n)`, `TEXT`, `CHAR(n)`
  - Tipe tanggal/waktu: `DATE`, `TIMESTAMP`, `TIMESTAMPTZ`, `INTERVAL`
  - Boolean, UUID, JSON, JSONB, dan ARRAY
- **DDL — Membuat dan Mengelola Tabel**
  - `CREATE TABLE` dengan constraint: `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `NOT NULL`, `CHECK`
  - `ALTER TABLE` untuk modifikasi skema
  - `DROP TABLE` dan `TRUNCATE`
- **DML — Operasi CRUD Dasar**
  - `INSERT` dengan satu dan banyak baris
  - `SELECT` dengan pemilihan kolom, alias, dan ekspresi
  - `UPDATE` dengan kondisi
  - `DELETE` dengan kondisi

### Minggu 3: Query Tingkat Lanjut
- **Filter dan Pengurutan**
  - Operator `WHERE`: `=`, `<>`, `>`, `<`, `LIKE`, `IN`, `BETWEEN`, `IS NULL`
  - `ORDER BY` dengan ascending/descending dan banyak kolom
  - `LIMIT` dan `OFFSET` untuk paginasi
  - `DISTINCT` untuk nilai unik
- **Fungsi Agregat**
  - `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`
  - `GROUP BY` untuk mengelompokkan data
  - `HAVING` untuk memfilter grup
- **Operasi Join Dasar**
  - `INNER JOIN` dan semantiknya
  - `LEFT JOIN`, `RIGHT JOIN`, `FULL OUTER JOIN`
  - `CROSS JOIN` dan kasus penggunaannya
  - `NATURAL JOIN` (dan mengapa menghindarinya)

### Minggu 4: Subquery dan Operasi Himpunan
- **Subquery**
  - Subquery skalar di SELECT dan WHERE
  - Subquery baris
  - `EXISTS` dan `NOT EXISTS`
  - Subquery di FROM (tabel turunan)
  - Operator `ANY`, `ALL`, dan `SOME`
- **Common Table Expressions (CTE)**
  - Sintaks CTE dasar dengan `WITH`
  - Banyak CTE dalam satu query
  - CTE rekursif untuk data hierarkis (bagan organisasi, struktur pohon)
- **Operasi Himpunan**
  - `UNION` dan `UNION ALL`
  - `INTERSECT` dan `EXCEPT`

### Minggu 5: Desain Skema dan Normalisasi
- **Normalisasi Database**
  - Bentuk Normal Pertama (1NF): kolom atomik
  - Bentuk Normal Kedua (2NF): tanpa ketergantungan parsial
  - Bentuk Normal Ketiga (3NF): tanpa ketergantungan transitif
  - Trade-off denormalisasi untuk performa baca
- **Relasi dan Constraint**
  - Relasi satu-ke-satu, satu-ke-banyak, banyak-ke-banyak
  - Tabel junction untuk relasi banyak-ke-banyak
  - Constraint `FOREIGN KEY` dan aksi referensial (`CASCADE`, `SET NULL`, `RESTRICT`)
  - Constraint `CHECK` untuk integritas data
- **Dasar-dasar Index**
  - Apa itu index dan mengapa menggunakannya?
  - Index B-tree — sebagai default
  - Membuat index kolom tunggal dan komposit
  - Kapan index memperlambat performa (overhead penulisan)

### Minggu 6: Strategi Pengindeksan
- **Jenis Index Tingkat Lanjut**
  - Index `GIN` untuk JSONB dan pencarian teks lengkap
  - Index `GiST` untuk data geometris dan rentang
  - Index `BRIN` untuk tabel besar yang terurut
  - Index parsial untuk query yang ditargetkan
  - Index covering dengan kolom `INCLUDE`
- **Analisis Query dengan EXPLAIN**
  - Membaca output `EXPLAIN`: sequential scan, index scan, bitmap scan
  - `EXPLAIN ANALYZE` untuk waktu eksekusi aktual
  - Mengidentifikasi operasi lambat
  - Memahami tipe node dan biaya
- **Pemeliharaan Index**
  - Deteksi bloat dengan `pg_stat_user_indexes`
  - Membangun ulang index dengan `REINDEX`
  - Memantau index yang tidak digunakan

### Minggu 7: Fitur Lanjutan PostgreSQL
- **View dan Materialized View**
  - Membuat view untuk enkapsulasi query
  - Materialized view untuk hasil yang telah dikomputasi sebelumnya
  - `REFRESH MATERIALIZED VIEW`
- **Fungsi dan Stored Procedure**
  - `CREATE FUNCTION` dengan PL/pgSQL
  - Opsi bahasa: SQL, PL/pgSQL, PL/Python, PL/V8
  - Stored procedure dengan `CREATE PROCEDURE`
  - Penanganan exception dengan `BEGIN ... EXCEPTION ... END`
- **Trigger dan Logika Berbasis Event**
  - Sintaks `CREATE TRIGGER`
  - Fungsi trigger di PL/pgSQL
  - Trigger tingkat pernyataan vs tingkat baris
  - Trigger `INSTEAD OF` pada view

### Minggu 8: JSON, Pencarian Teks Lengkap, dan Ekstensi
- **Operasi JSONB**
  - Menyimpan dan mengindeks data JSON
  - Operator JSONB: `->`, `->>`, `#>`, `@>`, `?`, `?|`, `?&`
  - Query jalur JSONB
  - Memperbarui dokumen JSONB
- **Pencarian Teks Lengkap**
  - Tipe data `tsvector` dan `tsquery`
  - Membuat index pencarian dengan GIN
  - Memberi peringkat hasil dengan `ts_rank`
  - Stemming dan kamus
- **Ekstensi Berguna**
  - `pgcrypto` untuk hashing dan enkripsi
  - `uuid-ossp` untuk generasi UUID
  - `pg_trgm` untuk pencocokan teks fuzzy
  - `postgis` untuk data geospasial
  - `hstore` untuk pasangan kunci-nilai

### Minggu 9: Penyetelan Performa
- **Konfigurasi Server**
  - `shared_buffers`, `work_mem`, `maintenance_work_mem`
  - `effective_cache_size`, `random_page_cost`
  - `max_connections` dan connection pooling
  - `wal_buffers` dan penyetelan checkpoint
- **Optimasi Query**
  - Menganalisis query lambat dengan `pg_stat_statements`
  - `ANALYZE` dan statistik autovacuum
  - `VACUUM` dan manajemen bloat tabel
  - Menulis ulang query untuk performa lebih baik
- **Connection Pooling**
  - Menyiapkan PgBouncer
  - Mode pooling transaksi vs sesi
  - Ukuran pool dan konfigurasi

### Minggu 10: Backup, Recovery, dan Replikasi
- **Strategi Backup**
  - `pg_dump` untuk backup logis
  - `pg_dumpall` untuk backup cluster penuh
  - `pg_basebackup` untuk backup fisik
  - Pengarsipan berkelanjutan dengan WAL
- **Point-in-Time Recovery (PITR)**
  - Konfigurasi pengarsipan WAL
  - Pengaturan target recovery
  - Melakukan restore
- **Replikasi**
  - Konfigurasi streaming replication
  - Replikasi sinkron vs asinkron
  - Read replica untuk scale-out
  - Mempromosikan standby

### Minggu 11: Keamanan dan Administrasi
- **Metode Autentikasi**
  - Konfigurasi `pg_hba.conf`
  - Autentikasi `md5`, `scram-sha-256`, peer, dan cert
  - Koneksi SSL/TLS
- **Manajemen Pengguna dan Role**
  - `CREATE ROLE` dan `CREATE USER`
  - Pewarisan role dan `GRANT`
  - Hak istimewa tingkat skema dan tabel
  - Kebijakan keamanan tingkat baris
- **Audit dan Monitoring**
  - Mengaktifkan pencatatan query
  - `pg_stat_activity` untuk query aktif
  - `pg_stat_statements` untuk performa query
  - Alat monitoring pihak ketiga (pgAdmin, pgHero, Datadog)

### Minggu 12: Deployment Produksi dan Proyek Akhir
- **Pengerasan Produksi**
  - Konfigurasi layanan Systemd
  - Penyetelan parameter kernel
  - Monitoring dengan Prometheus/Grafana
  - Rutinitas verifikasi backup
- **Strategi Migrasi**
  - Migrasi skema dengan Sqitch atau Flyway
  - Pola migrasi tanpa downtime
  - Menguji migrasi di staging
- **Proyek Akhir**
  - Mendesain dan mengimplementasikan skema database lengkap untuk aplikasi e-commerce
  - Menulis query kompleks dengan join, agregasi, dan CTE
  - Membuat index dan menganalisis performa query
  - Menyiapkan backup dan replikasi
  - Mendemonstrasikan kesiapan produksi

## Proyek Akhir

Peserta didik akan mendesain dan mengimplementasikan backend database lengkap untuk **Platform E-Commerce**. Proyek harus mencakup:

1. **Desain Skema**: Skema yang dinormalisasi penuh mencakup pengguna, produk, kategori, pesanan, pembayaran, dan ulasan dengan constraint, foreign key, dan index yang sesuai.
2. **Query Lanjutan**: Setidaknya lima query kompleks yang mendemonstrasikan join, agregasi, CTE, fungsi jendela, dan pencarian teks lengkap.
3. **Optimasi Performa**: Analisis EXPLAIN ANALYZE yang mengidentifikasi setidaknya dua optimasi query, dengan perbandingan performa sebelum dan sesudah.
4. **Penggunaan JSONB**: Satu fitur menggunakan JSONB untuk data semi-terstruktur (misalnya atribut produk atau preferensi pengguna kustom).
5. **Strategi Backup**: Rencana backup yang terdokumentasi termasuk perintah backup logis dan fisik, serta prosedur point-in-time recovery.
6. **Implementasi Keamanan**: Kontrol akses berbasis peran dengan setidaknya tiga peran berbeda (admin, staf, analis read-only).

Hasil akhir: File skema SQL, contoh query dengan output EXPLAIN, skrip backup, dan ringkasan tertulis singkat tentang keputusan desain.

## Kriteria Penilaian

- **Kualitas Skema (25%)**: Normalisasi yang tepat, tipe data yang sesuai, penggunaan constraint yang benar, dan relasi yang terdefinisi dengan baik.
- **Kemahiran Query (25%)**: Kebenaran, efisiensi, dan penggunaan fitur SQL lanjutan yang tepat (CTE, fungsi jendela, pencarian teks lengkap).
- **Analisis Performa (15%)**: Interpretasi EXPLAIN ANALYZE yang akurat dan saran optimasi yang bermakna.
- **Keterampilan Administrasi (15%)**: Skrip backup yang berfungsi, pemahaman replikasi, dan pengaturan peran keamanan.
- **Dokumentasi Proyek (10%)**: Penjelasan yang jelas tentang keputusan desain, trade-off, dan pertimbangan produksi.
- **Kualitas Kode (10%)**: SQL yang diformat dengan baik, konvensi penamaan yang tepat, dan komentar yang menjelaskan logika kompleks.

## Referensi

- **Dokumentasi Resmi**: [PostgreSQL Documentation](https://www.postgresql.org/docs/)
  - Tutorial: [https://www.postgresql.org/docs/current/tutorial.html](https://www.postgresql.org/docs/current/tutorial.html)
  - Panduan Admin: [https://www.postgresql.org/docs/current/admin.html](https://www.postgresql.org/docs/current/admin.html)
  - Penyetelan Performa: [https://www.postgresql.org/docs/current/performance-tips.html](https://www.postgresql.org/docs/current/performance-tips.html)
- **Buku**:
  - "PostgreSQL: Up and Running" oleh Regina Obe dan Leo Hsu
  - "The Art of PostgreSQL" oleh Dimitri Fontaine
  - "Mastering PostgreSQL 16" oleh Hans-Jürgen Schönig
- **Sumber Daya Online**:
  - [pgMustard](https://www.pgmustard.com/) — Penganalisis EXPLAIN
  - [PgBouncer Official Docs](https://www.pgbouncer.org/)
  - [Use the Index, Luke](https://use-the-index-luke.com/) — Panduan pengindeksan
- **Alat Bantu**:
  - pgAdmin 4 — Manajemen GUI
  - DBeaver — Alat database lintas platform
  - Sqitch — Manajemen migrasi database
  - pgbench — Alat benchmarking bawaan

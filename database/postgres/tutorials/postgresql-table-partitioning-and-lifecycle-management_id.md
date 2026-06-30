---
title: "Partisi Tabel PostgreSQL dan Manajemen Siklus Hidup Data"
description: "Tutorial lanjutan tentang strategi partisi tabel PostgreSQL, otomatisasi manajemen partisi, dan pola siklus hidup data untuk arsitektur database yang skalabel."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Partisi Tabel PostgreSQL dan Manajemen Siklus Hidup Data

## Ringkasan

Seiring pertumbuhan database PostgreSQL Anda, performa kueri pada tabel besar menurun dan data berbasis waktu menjadi semakin mahal untuk dikelola. Partisi tabel menyediakan pola arsitektural yang kuat yang membagi tabel besar menjadi bagian-bagian yang lebih kecil dan lebih mudah dikelola sambil mempertahankan tampilan logis tunggal. Tutorial ini mencakup strategi partisi (range, list, hash), manajemen partisi otomatis, optimasi kueri melalui partition pruning, serta pola siklus hidup data termasuk pengarsipan, kebijakan retensi, dan partisi jendela bergulir.

## Target Audiens

- Administrator database dan backend engineer yang mengelola deployment PostgreSQL skala besar.
- Pengembang yang beralih dari arsitektur tabel tunggal ke desain terpartisi.
- Pengembang tingkat mahir yang nyaman dengan DDL, pengindeksan, dan perencanaan kueri PostgreSQL.
- Data engineer yang bertanggung jawab atas penyimpanan data time-series dan retensi.

## Prasyarat

- Instance PostgreSQL yang berjalan (versi 12 atau lebih baru untuk partisi deklaratif; versi 13+ direkomendasikan untuk fitur lanjutan).
- Keakraban dengan SQL dasar PostgreSQL (CREATE TABLE, INSERT, SELECT).
- Pemahaman tentang indeks, EXPLAIN ANALYZE, dan konsep perencanaan kueri.
- Pengetahuan dasar tentang skrip Bash atau fungsi SQL untuk otomatisasi.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mendesain dan mengimplementasikan skema partisi range, list, dan hash untuk berbagai pola data.
- Memanfaatkan partition pruning untuk meningkatkan performa kueri secara dramatis pada dataset besar.
- Mengotomatiskan pembuatan, rotasi, dan pembersihan partisi dengan pg_partman atau fungsi kustom.
- Mengimplementasikan kebijakan siklus hidup data termasuk retensi berbasis waktu dan strategi pengarsipan.
- Menggunakan indeks BRIN bersama partisi untuk performa kueri time-series yang optimal.
- Memigrasikan tabel yang tidak terpartisi ke struktur terpartisi tanpa waktu henti.

## Konteks dan Motivasi

Aplikasi modern menghasilkan data pada tingkat yang belum pernah terjadi sebelumnya — pembacaan sensor, log aplikasi, event aktivitas pengguna, dan transaksi keuangan terakumulasi menjadi tabel yang dengan cepat tumbuh melampaui jutaan atau miliaran baris. Tanpa partisi, satu tabel monolitik pada akhirnya akan menderita:

- **Performa kueri yang menurun**: Pemindaian sekuensial atas seluruh tabel menjadi sangat lambat, dan bahkan indeks yang di-tuning dengan baik menjadi semakin dalam dan kurang efisien.
- **Masalah pemeliharaan**: Operasi seperti `VACUUM`, `ANALYZE`, `REINDEX`, dan `pg_dump` harus memproses seluruh tabel, menyebabkan jendela pemeliharaan yang panjang.
- **Penghapusan massal yang mahal**: Menghapus data lama menggunakan `DELETE FROM large_table WHERE timestamp < cutoff` memicu I/O masif dan menggembungkan tabel dengan tuple mati.
- **Penggunaan sumber daya yang tidak merata**: Satu tabel besar tidak dapat disebar ke tingkatan penyimpanan atau tablespace yang berbeda.

Partisi memecahkan masalah ini dengan membagi tabel menjadi partisi fisik yang lebih kecil sambil menyajikannya sebagai satu tabel logis tunggal. Setiap partisi bertindak sebagai sub-tabel independen dengan indeks, statistik, dan pengaturan penyimpanannya sendiri. Perencana kueri secara otomatis menghilangkan partisi yang tidak relevan — sebuah teknik yang disebut *partition pruning* — sehingga kueri terhadap tabel terpartisi bisa menjadi jauh lebih cepat daripada kueri yang sama terhadap tabel monolitik yang setara.

Tutorial ini mengajarkan Anda cara mengimplementasikan partisi sebagai pola arsitektur database inti, bukan hanya trik optimasi satu kali.

## Konten Inti

### Memahami Partisi Deklaratif

PostgreSQL mendukung tiga metode partisi asli melalui klausa `PARTITION BY` yang diperkenalkan di versi 10 dan ditingkatkan secara signifikan melalui versi 13+:

**Range Partitioning** — membagi data berdasarkan rentang nilai yang berkesinambungan, paling umum berupa rentang tanggal atau numerik. Ideal untuk data time-series, log event, dan catatan historis.

**List Partitioning** — membagi data berdasarkan daftar nilai diskrit. Cocok untuk data berbasis wilayah, kode status, atau pemisahan kategoris.

**Hash Partitioning** — mendistribusikan baris secara merata ke sejumlah partisi tetap menggunakan fungsi hash pada kunci partisi. Terbaik untuk penyeimbangan beban ketika tidak ada batas rentang atau daftar alami.

### Mendesain Range Partition untuk Data Time-Series

Data time-series adalah kasus penggunaan paling umum untuk partisi. Unit partisi alami adalah interval waktu — harian, mingguan, bulanan, atau tahunan — dipilih berdasarkan volume data dan pola kueri.

```sql
-- Membuat tabel terpartisi rentang bulanan untuk log aplikasi
CREATE TABLE app_logs (
    id BIGSERIAL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id INTEGER,
    ip_address INET
) PARTITION BY RANGE (created_at);

-- Membuat partisi bulanan
CREATE TABLE app_logs_2026_01 PARTITION OF app_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE app_logs_2026_02 PARTITION OF app_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE app_logs_2026_03 PARTITION OF app_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Membuat partisi default untuk data di luar rentang
CREATE TABLE app_logs_default PARTITION OF app_logs DEFAULT;
```

Sintaks `FOR VALUES FROM ... TO ...` mendefinisikan batas partisi. Batas bawah bersifat inklusif dan batas atas bersifat eksklusif — baris dengan `created_at = '2026-02-15'` termasuk dalam partisi Februari.

**Aturan desain kritis**: Batas partisi tidak boleh tumpang tindih, dan setiap baris harus cocok dengan tepat satu partisi. Partisi `DEFAULT` menangkap baris apa pun yang berada di luar rentang yang ditentukan, mencegah kesalahan penyisipan.

### List Partitioning untuk Data Regional

```sql
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL,
    region TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB
) PARTITION BY LIST (region);

CREATE TABLE user_sessions_na PARTITION OF user_sessions
    FOR VALUES IN ('us-east', 'us-west', 'ca-central');

CREATE TABLE user_sessions_eu PARTITION OF user_sessions
    FOR VALUES IN ('eu-west', 'eu-central', 'eu-north');

CREATE TABLE user_sessions_apac PARTITION OF user_sessions
    FOR VALUES IN ('ap-southeast', 'ap-northeast', 'ap-south');

CREATE TABLE user_sessions_other PARTITION OF user_sessions DEFAULT;
```

Setiap partisi menampung baris yang cocok dengan daftar `IN (...)` -nya. Partisi `DEFAULT` menangkap nilai region yang tidak terduga, yang berguna dalam sistem terdistribusi di mana region baru mungkin muncul sebelum DDL Anda diperbarui.

### Hash Partitioning untuk Distribusi Merata

Ketika data Anda tidak memiliki batas rentang alami dan Anda memerlukan distribusi yang merata antar partisi, gunakan hash partitioning.

```sql
CREATE TABLE events (
    event_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY HASH (event_id);

-- Membuat 4 partisi untuk distribusi data yang merata
CREATE TABLE events_p0 PARTITION OF events
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE events_p1 PARTITION OF events
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE events_p2 PARTITION OF events
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE events_p3 PARTITION OF events
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

Hash partitioning ideal untuk pipeline injeksi event di mana setiap partisi harus menerima beban tulis yang kurang lebih sama. Pilih modulus pangkat dua (2, 4, 8, 16) untuk distribusi yang merata.

### Partition Pruning — Mesin Performa Utama

Partition pruning adalah mekanisme optimasi PostgreSQL yang menghilangkan partisi yang tidak relevan selama perencanaan kueri. Ketika klausa `WHERE` kueri memfilter pada kunci partisi, hanya partisi yang cocok yang dipindai.

```sql
-- Tanpa pruning: memindai semua partisi
EXPLAIN ANALYZE SELECT * FROM app_logs WHERE level = 'ERROR';

-- Dengan pruning: memindai hanya partisi yang relevan
EXPLAIN ANALYZE SELECT * FROM app_logs
    WHERE created_at >= '2026-02-01' AND created_at < '2026-03-01';

-- Hasil: hanya partisi Februari yang dipindai (ditampilkan sebagai:
-- "Append Subplans: app_logs_2026_02")
```

**Aktifkan partition_pruning di sesi Anda** (aktif secara default di PostgreSQL 11+):

```sql
SET enable_partition_pruning = on;
```

Agar pruning bekerja secara efektif:

1. Selalu filter pada kunci partisi di klausa `WHERE`.
2. Gunakan ekspresi stabil (column >= konstanta, bukan kondisi berbasis fungsi seperti `DATE(created_at) = '2026-02-15'`).
3. Pastikan tipe data kunci partisi cocok dengan tipe parameter kueri.
4. Uji dengan `EXPLAIN ANALYZE` untuk memastikan partisi benar-benar dipangkas.

### Partisi Komposit (Sub-partisi)

Untuk dataset yang sangat besar, satu tingkat partisi mungkin tidak cukup. PostgreSQL mendukung sub-partisi — membuat partisi yang juga terpartisi.

```sql
-- Tabel utama dipartisi berdasarkan tahun
CREATE TABLE sensor_data (
    sensor_id INTEGER NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    temperature NUMERIC(5,2),
    humidity NUMERIC(5,2)
) PARTITION BY RANGE (recorded_at);

-- Partisi tahunan, masing-masing di-sub-partisi berdasarkan bulan
CREATE TABLE sensor_data_2025 PARTITION OF sensor_data
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01')
    PARTITION BY RANGE (recorded_at);

CREATE TABLE sensor_data_2025_01 PARTITION OF sensor_data_2025
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- ... bulan-bulan yang tersisa untuk 2025 ...

CREATE TABLE sensor_data_2026 PARTITION OF sensor_data
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01')
    PARTITION BY RANGE (recorded_at);

CREATE TABLE sensor_data_2026_01 PARTITION OF sensor_data_2026
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- ... bulan-bulan yang tersisa untuk 2026 ...
```

Sub-partisi menciptakan struktur penyimpanan hierarkis. Kueri yang memfilter `recorded_at` pertama-tama memangkas di level tahun, lalu di level bulan, menghasilkan akses data yang sangat terarah.

### Indeks BRIN untuk Data Time-Series Terpartisi

Indeks B-tree pada kunci partisi dari setiap partisi individual sering kali redundan — partisi itu sendiri sudah mengatur data secara kronologis. **Block Range INdex (BRIN)** memberikan pelengkap yang ideal untuk tabel terpartisi rentang.

```sql
-- Membuat indeks BRIN pada setiap partisi untuk data yang diurutkan berdasarkan waktu
CREATE INDEX idx_app_logs_2026_01_created_brin
    ON app_logs_2026_01 USING brin (created_at)
    WITH (pages_per_range = 32);

CREATE INDEX idx_app_logs_2026_02_created_brin
    ON app_logs_2026_02 USING brin (created_at)
    WITH (pages_per_range = 32);
```

Indeks BRIN jauh lebih kecil daripada indeks B-tree pada kolom yang sama karena mereka menyimpan ringkasan rentang blok daripada penunjuk baris individual. Untuk data time-series di mana baris disisipkan dalam urutan kronologis, indeks BRIN dapat menjawab kueri rentang hampir secepat B-tree sementara menggunakan 100-1000× lebih sedikit ruang disk.

```sql
-- Membandingkan ukuran indeks
SELECT pg_size_pretty(pg_relation_size('idx_app_logs_2026_02_created_brin')) AS brin_size,
       pg_size_pretty(pg_relation_size('idx_app_logs_2026_02_created_btree')) AS btree_size;
```

### Mengotomatiskan Manajemen Partisi dengan pg_partman

Membuat partisi secara manual untuk setiap bulan atau hari tidak praktis dalam skala besar. Ekstensi `pg_partman` mengotomatiskan pembuatan, rotasi, dan retensi partisi.

**Instalasi**:

```bash
# Install pg_partman (Debian/Ubuntu)
sudo apt-get install postgresql-16-partman

# Buat ekstensi di database Anda
psql -d mydb -c "CREATE EXTENSION pg_partman;"
```

**Konfigurasi**:

```sql
-- Mengatur partisi bulanan otomatis untuk app_logs
SELECT partman.create_parent(
    p_parent_table := 'public.app_logs',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := '1 month',
    p_premake := 3,
    p_start_partition := '2026-01-01'
);

-- Memperbarui konfigurasi untuk menangani retensi
UPDATE partman.part_config
SET retention = '6 months',
    retention_keep_table = false,
    infinite_time_partitions = true
WHERE parent_table = 'public.app_logs';
```

**Pemeliharaan otomatis** (dijalankan melalui pg_cron atau cron job):

```sql
-- Memelihara partisi: membuat partisi masa depan, melepas partisi lama
CALL partman.run_maintenance();

-- Atau jalankan melalui jadwal pg_cron
SELECT cron.schedule('partition-maintenance', '0 0 * * *',
    $$CALL partman.run_maintenance()$$);
```

Dengan konfigurasi ini, `pg_partman` secara otomatis membuat partisi baru 3 bulan ke depan dari tanggal saat ini, dan menghapus partisi yang lebih lama dari 6 bulan.

### Kebijakan Siklus Hidup Data dan Retensi

Manajemen siklus hidup data memastikan bahwa database Anda tidak mengakumulasi data historis tanpa batas. Kebijakan siklus hidup yang dirancang dengan baik memiliki tiga fase:

**Tier panas** (data saat ini, terindeks penuh, kueri cepat): Data berada di partisi bulanan dengan indeks BRIN dan B-tree. Kueri mengakses tier ini secara langsung.

**Tier hangat** (data historis baru, dikompresi): Partisi yang lebih lama dari 3 bulan dapat dilepas, dikompresi opsional, dan disimpan di tablespace terpisah pada penyimpanan yang lebih lambat (lebih murah).

```sql
-- Melepas partisi lama sebelum pengarsipan
ALTER TABLE app_logs DETACH PARTITION app_logs_2025_10;

-- Memindahkan ke tablespace murah
ALTER TABLE app_logs_2025_10 SET TABLESPACE archive_tablespace;

-- Opsional hapus indeks untuk menghemat ruang
DROP INDEX IF EXISTS app_logs_2025_10_created_brin;
```

**Tier dingin** (data kedaluwarsa, dibersihkan atau diekspor): Partisi yang lebih lama dari periode retensi dihapus atau diekspor ke sistem penyimpanan eksternal.

```sql
-- Menghapus partisi yang lebih lama dari 6 bulan
DROP TABLE IF EXISTS app_logs_2025_09;
DROP TABLE IF EXISTS app_logs_2025_10;
```

**Manajemen partisi manual tanpa pg_partman**:

Jika pg_partman tidak tersedia, gunakan fungsi PostgreSQL untuk mengelola partisi:

```sql
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS VOID AS $$
DECLARE
    next_month_start DATE;
    next_month_end DATE;
    partition_name TEXT;
BEGIN
    next_month_start := date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
    next_month_end := next_month_start + INTERVAL '1 month';
    partition_name := 'app_logs_' || to_char(next_month_start, 'YYYY_MM');

    EXECUTE format(
        'CREATE TABLE %I PARTITION OF app_logs
         FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        next_month_start,
        next_month_end
    );

    EXECUTE format(
        'CREATE INDEX %I ON %I USING brin (created_at) WITH (pages_per_range = 32)',
        partition_name || '_created_brin',
        partition_name
    );
END;
$$ LANGUAGE plpgsql;

-- Membuat fungsi pembersihan retensi
CREATE OR REPLACE FUNCTION drop_old_partitions(retention_months INTEGER)
RETURNS VOID AS $$
DECLARE
    part RECORD;
BEGIN
    FOR part IN
        SELECT inhrelid::regclass::text AS partition_name
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        WHERE parent.relname = 'app_logs'
    LOOP
        IF substring(part.partition_name FROM 'app_logs_(\d{4}_\d{2})') IS NOT NULL THEN
            EXECUTE format(
                'DROP TABLE IF EXISTS %I',
                part.partition_name
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Memigrasikan Tabel yang Ada ke Partisi

Mengonversi tabel produksi besar ke struktur terpartisi memerlukan strategi yang hati-hati untuk menghindari waktu henti.

**Strategi A: Buat tabel terpartisi baru dan backfill (direkomendasikan)** :

```sql
-- 1. Buat tabel terpartisi dengan struktur yang sama
CREATE TABLE orders_new (
    LIKE orders INCLUDING DEFAULTS INCLUDING CONSTRAINTS
) PARTITION BY RANGE (order_date);

-- 2. Buat partisi untuk data historis dan masa depan
CREATE TABLE orders_2025 PARTITION OF orders_new
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE orders_2026 PARTITION OF orders_new
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE orders_future PARTITION OF orders_new DEFAULT;

-- 3. Backfill data historis dalam batch
INSERT INTO orders_new SELECT * FROM orders
WHERE order_date >= '2025-01-01' AND order_date < '2025-03-01';

-- 4. Buat indeks pada setiap partisi
-- 5. Buat trigger atau view untuk mengarahkan tulis baru
-- 6. Tukar tabel secara atomik
BEGIN;
ALTER TABLE orders RENAME TO orders_old;
ALTER TABLE orders_new RENAME TO orders;
COMMIT;
```

**Strategi B: Menggunakan ATTACH PARTITION (PostgreSQL 12+)** :

```sql
-- Buat tabel stand-alone dengan data yang sama
CREATE TABLE orders_2026_01 (LIKE orders INCLUDING DEFAULTS);

-- Tambahkan batasan data yang cocok dengan batas partisi
ALTER TABLE orders_2026_01 ADD CONSTRAINT orders_2026_01_check
    CHECK (order_date >= '2026-01-01' AND order_date < '2026-02-01');

-- Buat indeks
CREATE INDEX ON orders_2026_01 (order_date);

-- Lampirkan sebagai partisi (PostgreSQL memvalidasi batasan check)
ALTER TABLE orders ATTACH PARTITION orders_2026_01
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

Pendekatan `ATTACH PARTITION` memiliki keuntungan hanya memerlukan kunci `ACCESS EXCLUSIVE` yang singkat pada tabel induk saat metadata diperbarui. Validasi data dapat ditangguhkan dengan menghilangkan langkah validasi, tetapi ini berisiko terhadap integritas data jika batasan check dilanggar.

## Contoh Kode

### Implementasi Partisi Lengkap untuk Sistem Analisis Log

Contoh ini membangun sistem logging lengkap dengan partisi bulanan, pemeliharaan otomatis, dan kebijakan retensi.

```sql
-- Langkah 1: Tabel terpartisi utama
CREATE TABLE system_logs (
    log_id BIGSERIAL,
    service_name TEXT NOT NULL,
    log_level TEXT NOT NULL,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Langkah 2: Indeks pada induk (diterapkan ke partisi baru)
CREATE INDEX idx_system_logs_service ON system_logs (service_name);
CREATE INDEX idx_system_logs_level ON system_logs (log_level);

-- Langkah 3: Buat 3 bulan partisi awal
SELECT partman.create_parent(
    p_parent_table := 'public.system_logs',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := '1 month',
    p_premake := 3,
    p_start_partition := '2026-01-01'
);

-- Langkah 4: Konfigurasi retensi — simpan 6 bulan
UPDATE partman.part_config
SET retention = '6 months',
    retention_keep_table = false,
    infinite_time_partitions = true
WHERE parent_table = 'public.system_logs';

-- Langkah 5: Kueri lintas partisi dengan pruning
-- Hanya memindai partisi yang berisi data Januari-Maret 2026
SELECT service_name, log_level, COUNT(*) as count
FROM system_logs
WHERE created_at >= '2026-01-01'
    AND created_at < '2026-04-01'
    AND log_level = 'ERROR'
GROUP BY service_name, log_level
ORDER BY count DESC;

-- Verifikasi partition pruning
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM system_logs
WHERE created_at >= '2026-02-15' AND created_at < '2026-02-16';
```

### Kueri Agregasi Lintas Partisi

```sql
-- Kueri agregat bulanan mendapat manfaat dari pruning
SELECT date_trunc('month', created_at) AS month,
       service_name,
       COUNT(*) AS total_errors,
       ROUND(AVG(EXTRACT(EPOCH FROM NOW() - created_at))) AS avg_age_seconds
FROM system_logs
WHERE created_at >= NOW() - INTERVAL '3 months'
    AND log_level = 'CRITICAL'
GROUP BY 1, 2
ORDER BY month DESC, total_errors DESC;
```

### Melepas dan Mengarsipkan Partisi Lama

```sql
-- Melepas partisi (data tetap dapat diakses)
ALTER TABLE system_logs DETACH PARTITION system_logs_2025_07;

-- Tabel yang dilepas masih dapat dibaca
SELECT COUNT(*) FROM system_logs_2025_07;

-- Ekspor ke CSV menggunakan psql
\copy system_logs_2025_07 TO '/backups/system_logs_2025_07.csv' CSV HEADER;

-- Hapus setelah dikonfirmasi diekspor
DROP TABLE system_logs_2025_07;
```

## Insight Penting

- **Selalu sertakan kunci partisi di klausa WHERE Anda**: Optimasi paling signifikan untuk tabel terpartisi adalah memastikan kueri memfilter pada kunci partisi. Tanpa ini, PostgreSQL harus memindai setiap partisi.
- **Pilih granularitas partisi berdasarkan volume data, bukan kenyamanan**: Aturan praktisnya adalah 10-100 GB per partisi atau 5-20 juta baris. Terlalu sedikit partisi besar mengalahkan tujuan; terlalu banyak partisi kecil menggembungkan overhead perencanaan kueri.
- **Indeks BRIN lebih baik daripada B-tree untuk time-series**: Indeks BRIN pada data yang dimasukkan secara kronologis memberikan penghematan ruang 100-1000× dengan performa kueri yang sebanding untuk pemindaian rentang. Cadangan indeks B-tree untuk pencarian kesetaraan pada kolom lain.
- **Hindari pergerakan baris**: PostgreSQL tidak dapat memindahkan baris antar partisi jika nilai kunci partisinya berubah (misalnya, memperbarui `created_at`). Pembaruan semacam itu gagal dengan "new row for relation violates partition constraint." Desain aplikasi Anda untuk memperlakukan kunci partisi sebagai tidak dapat diubah.
- **Uji partition pruning dengan EXPLAIN ANALYZE**: Kueri yang terlihat dapat dipangkas mungkin tidak. Selalu verifikasi. Penyebab umum kegagalan pruning: konversi tipe implisit, pembungkus fungsi pada kunci partisi, dan kondisi `NOT IN` pada tabel terpartisi list.
- **Rencanakan manajemen partisi dari hari pertama**: Retrofit partisi pada tabel dengan miliaran baris itu menyakitkan. Desain skema partisi, strategi otomatisasi, dan kebijakan retensi Anda sebelum Anda membutuhkannya.
- **Gunakan partisi deklaratif**: Partisi deklaratif PostgreSQL (diimplementasikan di v10, siap produksi di v12+) adalah satu-satunya pendekatan yang didukung secara resmi. Hindari partisi berbasis pewarisan tabel (`INHERITS`) — ia tidak memiliki dukungan pengoptimal untuk partition pruning dan memiliki keterbatasan performa yang parah.

## Langkah Berikutnya

- Jelajahi [Panduan Penyetelan Performa PostgreSQL](../guides/postgresql-performance-tuning-guide.md) untuk cakupan lebih dalam tentang strategi pengindeksan dan tuning vacuum.
- Pelajari [PostgreSQL Query Cheatsheet](../cheatsheets/postgresql-query-cheatsheet.md) untuk referensi cepat pola SQL lanjutan.
- Pelajari tentang replikasi logis PostgreSQL untuk mendistribusikan tabel terpartisi di seluruh pusat data.
- Eksperimen dengan ekstensi `pg_cron` untuk menjadwalkan pekerjaan pemeliharaan partisi langsung dari database.
- Pertimbangkan [Silabus Pengembangan PostgreSQL](../syllabi/postgresql-syllabus.md) untuk jalur pembelajaran terstruktur yang mencakup semua fundamental PostgreSQL.

## Kesimpulan

Partisi tabel adalah salah satu alat paling kuat dalam arsenal DBA PostgreSQL untuk mengelola data skala besar. Dengan membagi tabel monolitik menjadi partisi yang lebih kecil dan dikelola secara independen, Anda membuka peningkatan performa yang substansial melalui partition pruning, menyederhanakan operasi pemeliharaan, dan mengimplementasikan kebijakan siklus hidup data yang kuat. Baik Anda menggunakan `pg_partman` untuk manajemen yang sepenuhnya otomatis atau fungsi kustom untuk kontrol yang lebih terperinci, strategi partisi yang dirancang dengan baik memastikan bahwa database PostgreSQL Anda tetap cepat, mudah dikelola, dan hemat biaya seiring pertumbuhan volume data. Mulailah perjalanan partisi Anda dengan pemahaman yang jelas tentang pola akses data Anda, pilih metode partisi yang tepat (range untuk time-series, list untuk kategori, hash untuk distribusi), dan tetapkan otomatisasi serta kebijakan retensi dari awal.

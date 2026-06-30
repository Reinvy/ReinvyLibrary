---
title: "Cheat Sheet Query PostgreSQL"
description: "Referensi cepat komprehensif untuk perintah SQL PostgreSQL, pola query, dan administrasi."
category: "database"
technology: "postgres"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Query PostgreSQL

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Terhubung ke database | `psql -U username -d dbname` | Terhubung ke database PostgreSQL via CLI |
| Lihat database | `\l` | Tampilkan semua database di server |
| Pindah database | `\c dbname` | Beralih ke database lain |
| Lihat tabel | `\dt` | Tampilkan semua tabel di skema saat ini |
| Detil tabel | `\d namatabel` | Tampilkan kolom, tipe, dan constraint tabel |
| Lihat skema | `\dn` | Tampilkan semua skema dalam database |
| Riwayat query | `\s` | Tampilkan riwayat perintah |
| Jalankan dari file | `\i /path/ke/file.sql` | Jalankan perintah SQL dari file |
| Ekspor ke CSV | `\copy tabel TO '/path/file.csv' CSV HEADER` | Ekspor tabel ke file CSV |
| Tampilan diperluas | `\x` | Alihkan antara tampilan normal dan diperluas |
| Keluar psql | `\q` | Keluar dari CLI PostgreSQL |
| Buat tabel | `CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL);` | Buat tabel baru dengan constraint |
| Sisipkan baris | `INSERT INTO users (name, email) VALUES ('Budi', 'budi@example.com');` | Sisipkan baris baru ke dalam tabel |
| Pilih semua | `SELECT * FROM users;` | Ambil semua baris dari tabel |
| Pilih bersyarat | `SELECT * FROM users WHERE age > 18 AND active = true;` | Ambil baris dengan kondisi |
| Perbarui baris | `UPDATE users SET email = 'baru@example.com' WHERE id = 1;` | Perbarui kolom tertentu pada baris yang cocok |
| Hapus baris | `DELETE FROM users WHERE id = 10;` | Hapus baris yang cocok dengan kondisi |
| Kosongkan tabel | `TRUNCATE TABLE logs;` | Hapus semua baris dengan cepat, tidak bisa di-rollback |
| Hapus tabel | `DROP TABLE IF EXISTS temp_data;` | Hapus struktur tabel dan semua data |
| Buat index | `CREATE INDEX idx_email ON users (email);` | Buat index untuk query yang lebih cepat |
| Buat index unik | `CREATE UNIQUE INDEX idx_unique_email ON users (email);` | Buat index yang juga memaksa keunikan |
| Mulai transaksi | `BEGIN;` | Mulai blok transaksi baru |
| Simpan perubahan | `COMMIT;` | Simpan semua perubahan dalam transaksi |
| Batalkan transaksi | `ROLLBACK;` | Urungkan semua perubahan sejak BEGIN terakhir |
| Buat pengguna | `CREATE USER app_user WITH PASSWORD 'password_aman';` | Buat role/pengguna database baru |
| Beri hak akses | `GRANT SELECT, INSERT ON users TO app_user;` | Beri izin spesifik kepada pengguna |
| Tampilkan versi | `SELECT version();` | Tampilkan informasi versi PostgreSQL |
| Rencana eksekusi | `EXPLAIN ANALYZE SELECT * FROM users WHERE email LIKE '%@example.com';` | Tampilkan rencana eksekusi dengan waktu |
| Hentikan koneksi | `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'mydb';` | Matikan koneksi database tertentu |
| Query aktif | `SELECT * FROM pg_stat_activity WHERE state = 'active';` | Tampilkan query yang sedang berjalan |
| Analisis tabel | `ANALYZE;` | Perbarui statistik untuk query planner |

## Perintah Umum

### Administrasi Database

```bash
# Buat database baru
createdb my_database

# Hapus database (tidak bisa diurungkan)
dropdb my_database

# Buat database dengan encoding spesifik
createdb -E UTF8 -T template0 my_database

# Backup database ke file
pg_dump my_database > backup.sql

# Restore database dari backup
psql my_database < backup.sql

# Backup dalam format kompresi khusus
pg_dump -Fc my_database > backup.dump

# Restore dari format khusus
pg_restore -d my_database backup.dump

# Backup semua database (seluruh cluster)
pg_dumpall > full_backup.sql

# Cek ukuran database
psql -c "SELECT pg_size_pretty(pg_database_size('my_database'));"

# Cek ukuran tabel
psql -c "SELECT pg_size_pretty(pg_total_relation_size('users'));"
```

### Manajemen Pengguna dan Izin

```bash
# Buat role dengan hak login
psql -c "CREATE ROLE app_user WITH LOGIN PASSWORD 'password_aman';"

# Buat role superuser
psql -c "CREATE ROLE admin_user WITH SUPERUSER LOGIN PASSWORD 'admin_pass';"

# Beri semua hak akses pada database
psql -c "GRANT ALL PRIVILEGES ON DATABASE my_database TO app_user;"

# Cabut hak akses
psql -c "REVOKE ALL PRIVILEGES ON TABLE users FROM app_user;"

# Ubah password pengguna
psql -c "ALTER USER app_user WITH PASSWORD 'password_baru';"

# Tampilkan semua pengguna
psql -c "\du"
```

### Monitoring dan Diagnostik

```bash
# Cek jumlah koneksi
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Temukan query yang berjalan lama
psql -c "SELECT pid, now() - pg_stat_activity.query_start AS durasi, query, state FROM pg_stat_activity WHERE state != 'idle' ORDER BY durasi DESC;"

# Ranking ukuran tabel
psql -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;"

# Cek tabel yang menggembung (bloat)
psql -c "SELECT schemaname, tablename, n_dead_tup, n_live_tup, round(n_dead_tup::float / n_live_tup * 100, 2) AS dead_pct FROM pg_stat_user_tables WHERE n_live_tup > 0 ORDER BY dead_pct DESC;"

# Temukan index yang tidak terpakai
psql -c "SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes WHERE idx_scan = 0;"

# Progres vacuum saat ini
psql -c "SELECT datname, phase, heap_blks_total, heap_blks_scanned, heap_blks_vacuumed FROM pg_stat_progress_vacuum;"
```

## Potongan Kode

### Pola Query SELECT

```sql
-- SELECT dasar dengan alias kolom
SELECT
    first_name || ' ' || last_name AS nama_lengkap,
    email,
    EXTRACT(YEAR FROM created_at) AS tahun_daftar
FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;

-- Filter dengan banyak kondisi
SELECT *
FROM orders
WHERE (status IN ('pending', 'processing'))
  AND total_amount > 100.00
  AND created_at >= '2024-01-01'
  AND created_at < '2025-01-01';

-- Pencocokan pola dengan LIKE
SELECT *
FROM products
WHERE name ILIKE '%nirkabel%'    -- LIKE tidak peka huruf
   OR sku ~ '^PRD-[0-9]{4}$';    -- regex POSIX

-- DISTINCT ON untuk satu baris per grup
SELECT DISTINCT ON (customer_id)
    customer_id,
    order_id,
    total_amount,
    created_at
FROM orders
ORDER BY customer_id, created_at DESC;
```

### Operasi JOIN

```sql
-- INNER JOIN dengan alias tabel
SELECT
    u.name,
    u.email,
    o.order_date,
    o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed';

-- LEFT JOIN dengan NULL untuk data hilang
SELECT
    c.name AS kategori,
    p.name AS produk
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
WHERE p.id IS NULL;  -- kategori tanpa produk

-- Self-join: karyawan dan manajernya
SELECT
    e.name AS karyawan,
    m.name AS manajer
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;

-- FULL OUTER JOIN dengan COALESCE
SELECT
    COALESCE(u.name, 'Pengguna Dihapus') AS nama_pengguna,
    o.id AS order_id
FROM users u
FULL OUTER JOIN orders o ON u.id = o.user_id;

-- LATERAL JOIN: kolom terhitung per baris
SELECT
    u.name,
    recent.order_id,
    recent.total
FROM users u
LEFT JOIN LATERAL (
    SELECT order_id, total
    FROM orders
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 3
) recent ON true;
```

### Agregasi dan Fungsi Window

```sql
-- GROUP BY dengan HAVING
SELECT
    category_id,
    COUNT(*) AS jumlah_produk,
    ROUND(AVG(price), 2) AS rata_rata_harga,
    MAX(price) AS harga_tertinggi
FROM products
GROUP BY category_id
HAVING COUNT(*) > 5
ORDER BY jumlah_produk DESC;

-- Fungsi window: total berjalan
SELECT
    order_date,
    total,
    SUM(total) OVER (ORDER BY order_date) AS total_berjalan
FROM orders
WHERE status = 'completed';

-- Fungsi window: peringkat dalam partisi
SELECT
    department,
    employee_name,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS peringkat_gaji,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS peringkat_padat
FROM employees;

-- Fungsi window: rata-rata bergerak
SELECT
    date,
    revenue,
    AVG(revenue) OVER (
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rata_rata_7_hari
FROM daily_revenue;

-- GROUPING SETS untuk total multi-level
SELECT
    COALESCE(department, 'Semua') AS departemen,
    COALESCE(role, 'Semua') AS peran,
    COUNT(*) AS jumlah_karyawan
FROM employees
GROUP BY GROUPING SETS (
    (department, role),
    (department),
    ()
);
```

### Common Table Expressions (CTE)

```sql
-- CTE sederhana untuk keterbacaan
WITH pengguna_aktif AS (
    SELECT id, name, email
    FROM users
    WHERE status = 'active' AND last_login > CURRENT_DATE - INTERVAL '30 days'
)
SELECT a.name, COUNT(o.id) AS pesanan_terbaru
FROM pengguna_aktif a
LEFT JOIN orders o ON o.user_id = a.id AND o.created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.id, a.name
ORDER BY pesanan_terbaru DESC;

-- CTE rekursif: hierarki organisasi
WITH RECURSIVE pohon_org AS (
    -- Anchor: manajer tingkat atas
    SELECT id, name, manager_id, 1 AS level, name::TEXT AS path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Rekursif: bawahan langsung
    SELECT
        e.id,
        e.name,
        e.manager_id,
        po.level + 1,
        po.path || ' -> ' || e.name
    FROM employees e
    INNER JOIN pohon_org po ON e.manager_id = po.id
)
SELECT * FROM pohon_org
ORDER BY path;

-- CTE dengan modifikasi data
WITH dihapus AS (
    DELETE FROM sessions
    WHERE expires_at < NOW()
    RETURNING user_id, session_data
)
INSERT INTO session_audit (user_id, session_data, archived_at)
SELECT user_id, session_data, NOW() FROM dihapus;
```

### Operasi JSON dan JSONB

```sql
-- Buat tabel dengan kolom JSONB
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sisipkan data JSONB
INSERT INTO events (event_type, payload)
VALUES ('page_view', '{"page": "/home", "referrer": "google.com", "duration_ms": 3500}');

-- Query field JSONB
SELECT
    id,
    payload->>'page' AS halaman,
    payload->>'referrer' AS perujuk,
    (payload->>'duration_ms')::INT AS durasi_ms
FROM events
WHERE payload @> '{"page": "/home"}'            -- klausa contains
   OR payload ? 'referrer';                       -- apakah kunci ada

-- Buat GIN index untuk query JSONB
CREATE INDEX idx_events_payload ON events USING GIN (payload);

-- Perbarui kunci JSONB spesifik
UPDATE events
SET payload = jsonb_set(payload, '{duration_ms}', '"4200"')
WHERE id = 1;

-- Agregasi objek JSONB
SELECT
    event_type,
    jsonb_agg(payload ORDER BY created_at DESC) AS payload_terbaru
FROM events
GROUP BY event_type;
```

### Fungsi Tanggal dan Waktu

```sql
-- Tanggal/waktu saat ini
SELECT
    NOW() AS timestamp_sekarang,
    CURRENT_DATE AS hari_ini,
    CURRENT_TIME AS waktu_sekarang,
    LOCALTIMESTAMP AS waktu_lokal;

-- Aritmetika tanggal
SELECT
    NOW() + INTERVAL '1 day' AS besok,
    NOW() - INTERVAL '7 days' AS seminggu_lalu,
    NOW() + INTERVAL '2 hours' AS dua_jam_lagi,
    DATE_TRUNC('month', NOW()) AS awal_bulan;

-- Ekstrak bagian tanggal
SELECT
    EXTRACT(YEAR FROM created_at) AS tahun,
    EXTRACT(MONTH FROM created_at) AS bulan,
    EXTRACT(DOW FROM created_at) AS hari_dalam_minggu,
    EXTRACT(EPOCH FROM created_at) AS timestamp_unix
FROM orders;

-- Perhitungan usia
SELECT
    name,
    birth_date,
    AGE(birth_date) AS interval_usia,
    EXTRACT(YEAR FROM AGE(birth_date)) AS usia_tahun
FROM users;

-- Membuat deret tanggal
SELECT generate_series(
    '2025-01-01'::DATE,
    '2025-12-31'::DATE,
    '1 day'::INTERVAL
)::DATE AS tanggal;
```

### Operasi Array

```sql
-- Buat tabel dengan kolom array
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    ratings INTEGER[]
);

-- Sisipkan array
INSERT INTO articles (title, tags, ratings)
VALUES ('Tips PostgreSQL', ARRAY['database', 'sql', 'performa'], ARRAY[4, 5, 5]);

-- Query elemen array
SELECT
    title,
    tags[1] AS tag_pertama,                       -- indeks dimulai dari 1
    array_length(tags, 1) AS jumlah_tag,
    ratings[1:2] AS dua_rating_pertama
FROM articles;

-- Kandungan dan tumpang tindih array
SELECT title
FROM articles
WHERE tags @> ARRAY['database']                   -- mengandung 'database'
   OR tags && ARRAY['sql', 'nosql'];               -- tumpang tindih dengan salah satu

-- Unnest array menjadi baris
SELECT title, unnest(tags) AS tag
FROM articles;

-- Buat GIN index untuk query array
CREATE INDEX idx_articles_tags ON articles USING GIN (tags);
```

### Pencarian Teks Lengkap (Full-Text Search)

```sql
-- Buat tabel dengan kolom tsvector
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    search_vector TSVECTOR
);

-- Isi kolom tsvector
UPDATE documents
SET search_vector = to_tsvector('indonesian', title || ' ' || body);

-- Buat GIN index pada tsvector
CREATE INDEX idx_documents_search ON documents USING GIN (search_vector);

-- Pertahankan tsvector secara otomatis dengan trigger
CREATE FUNCTION documents_search_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('indonesian', NEW.title || ' ' || NEW.body);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_documents_search
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION documents_search_update();

-- Query pencarian teks
SELECT
    title,
    ts_rank(search_vector, query) AS peringkat
FROM documents, to_tsquery('indonesian', 'postgresql & (performa | optimasi)') AS query
WHERE search_vector @@ query
ORDER BY peringkat DESC
LIMIT 10;

-- Sorot istilah yang cocok
SELECT
    title,
    ts_headline('indonesian', body, query, 'MaxWords=50, MinWords=20')
FROM documents, to_tsquery('indonesian', 'performa') AS query
WHERE search_vector @@ query;
```

### Ekspresi Kondisional dan Alur Kontrol

```sql
-- CASE expression untuk pemetaan nilai
SELECT
    name,
    CASE status
        WHEN 'active' THEN 'Aktif'
        WHEN 'inactive' THEN 'Tidak Aktif'
        WHEN 'banned' THEN 'Ditangguhkan'
        ELSE 'Tidak Diketahui'
    END AS label_status,
    CASE
        WHEN total_spent > 10000 THEN 'VIP'
        WHEN total_spent > 1000 THEN 'Premium'
        WHEN total_spent > 0 THEN 'Standar'
        ELSE 'Baru'
    END AS tingkatan_pelanggan
FROM users;

-- COALESCE: nilai non-null pertama
SELECT
    COALESCE(preferred_name, full_name, 'Anonim') AS nama_tampilan
FROM users;

-- NULLIF: hindari pembagian dengan nol
SELECT
    product_name,
    total_sales,
    NULLIF(total_returns, 0) AS retur,
    ROUND(total_sales::NUMERIC / NULLIF(total_returns, 0), 2) AS rasio_retur
FROM sales_summary;

-- GREATEST/LEAST: cari min/max antar kolom
SELECT
    GREATEST(quiz_score, midterm_score, final_score) AS nilai_tertinggi,
    LEAST(quiz_score, midterm_score, final_score) AS nilai_terendah
FROM student_grades;

-- FILTER untuk agregasi bersyarat
SELECT
    COUNT(*) AS total_pesanan,
    COUNT(*) FILTER (WHERE status = 'completed') AS selesai,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS dibatalkan,
    AVG(total) FILTER (WHERE status = 'completed') AS rata_rata_selesai
FROM orders;
```

### Optimasi Performa Query

```sql
-- EXPLAIN ANALYZE: pahami eksekusi query
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT u.name, COUNT(o.id) AS jumlah_pesanan
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
ORDER BY jumlah_pesanan DESC
LIMIT 20;

-- Partial index: index hanya pengguna aktif
CREATE INDEX idx_users_active_email ON users (email)
WHERE status = 'active';

-- Covering index: sertakan kolom untuk hindari heap lookup
CREATE INDEX idx_orders_user_date_covering
    ON orders (user_id, created_at DESC)
    INCLUDE (total, status);

-- Pembuatan index konkuren (non-blocking)
CREATE INDEX CONCURRENTLY idx_orders_created ON orders (created_at);

-- Reindex tanpa blokir operasi tulis
REINDEX INDEX CONCURRENTLY idx_users_email;

-- Perbarui statistik tabel
ANALYZE users;
ANALYZE orders;

-- Atur konfigurasi untuk query tuner
SET default_statistics_target = 1000;
```

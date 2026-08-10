---
title: "Cheatsheet Indexing PostgreSQL"
description: "Referensi cepat untuk tipe indeks PostgreSQL, varian pembuatan indeks, pemeliharaan, dan diagnostik."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheatsheet Indexing PostgreSQL

## Tabel Referensi Cepat

| Tipe Indeks | Metode Akses | Paling Cocok Untuk | Contoh Kasus Penggunaan |
|-------------|--------------|--------------------|-------------------------|
| B-tree | `btree` (default) | Query kesetaraan dan rentang, pengurutan | `WHERE user_id = 42`, `ORDER BY created_at` |
| Hash | `hash` | Kesetaraan sederhana pada nilai besar | `WHERE session_id = 'abc...'` |
| GiST | `gist` | Data geometris, rentang, tetangga-terdekat | `WHERE location <-> point '(1,2)'` |
| SP-GiST | `spgist` | Struktur terpartisi/rekursif, titik | Pencarian titik quad-tree |
| GIN | `gin` | Array, JSONB, pencarian teks lengkap | `WHERE tags @> '{red}'`, `to_tsvector(...)` |
| BRIN | `brin` | Tabel besar dengan urutan alami | Data time-series, tabel log |
| Bloom | `bloom` | Filter kesetaraan multi-kolom | `WHERE a = 1 AND b = 2 AND c = 3` |

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Buat indeks | `CREATE INDEX idx_name ON table (col);` | Indeks B-tree default |
| Buat indeks unik | `CREATE UNIQUE INDEX idx_name ON table (col);` | Memaksa keunikan |
| Buat secara konkuren | `CREATE INDEX CONCURRENTLY idx_name ON table (col);` | Tidak memblokir operasi tulis |
| Buat indeks parsial | `CREATE INDEX idx_name ON table (col) WHERE condition;` | Mengindeks hanya baris yang cocok |
| Buat indeks ekspresi | `CREATE INDEX idx_name ON table (lower(col));` | Mengindeks hasil fungsi |
| Buat indeks penutup | `CREATE INDEX idx_name ON table (col) INCLUDE (col2);` | Index-only scan (PG 11+) |
| Hapus indeks | `DROP INDEX IF EXISTS idx_name;` | Menghapus indeks |
| Bangun ulang indeks | `REINDEX INDEX idx_name;` | Membangun ulang indeks untuk menghilangkan bloat |
| Bangun ulang indeks tabel | `REINDEX TABLE table_name;` | Membangun ulang semua indeks pada tabel |
| Ubah nama indeks | `ALTER INDEX idx_name RENAME TO new_name;` | Mengubah nama indeks |
| Cluster pada indeks | `CLUSTER table_name USING idx_name;` | Mengurutkan ulang tabel secara fisik berdasarkan indeks |

## Perintah Umum

### Membuat Indeks Dasar

```sql
-- Indeks B-tree sederhana (metode akses default)
CREATE INDEX idx_users_email ON users (email);

-- Indeks komposit: urutan kolom penting untuk perencanaan query
CREATE INDEX idx_orders_customer_created
ON orders (customer_id, created_at DESC);

-- Indeks unik juga berfungsi sebagai constraint
CREATE UNIQUE INDEX idx_users_email_unique ON users (email);

-- Indeks hash untuk kolom besar yang hanya memakai kesetaraan
CREATE INDEX idx_sessions_token ON sessions USING hash (token);
```

### Membuat Indeks Tanpa Mengunci

```sql
-- CONCURRENTLY menghindari pemblokiran tulis, tetapi tidak bisa
-- dijalankan di dalam transaksi
CREATE INDEX CONCURRENTLY idx_orders_status
ON orders (status);

-- Bangun ulang indeks yang bengkak tanpa memblokir
REINDEX INDEX CONCURRENTLY idx_orders_status;
```

### Indeks Parsial dan Ekspresi

```sql
-- Indeks parsial: hanya pesanan aktif yang diindeks
CREATE INDEX idx_orders_active
ON orders (created_at DESC)
WHERE status = 'active';

-- Indeks ekspresi: pencarian yang tidak peka huruf besar/kecil
CREATE INDEX idx_users_email_lower
ON users (lower(email));

-- Indeks ekspresi dengan ekstraksi kolom JSONB
CREATE INDEX idx_products_price
ON products ((attributes ->> 'price'));
```

### Indeks Penutup (Covering Index)

```sql
-- Kolom INCLUDE tersimpan di indeks tetapi bukan kunci pencarian;
-- memungkinkan index-only scan yang tidak menyentuh heap
CREATE INDEX idx_users_email_covering
ON users (email)
INCLUDE (name, created_at);

-- Verifikasi dengan index-only scan
EXPLAIN ANALYZE
SELECT email, name FROM users WHERE email = 'alice@example.com';
```

### Pemeliharaan Indeks

```bash
# Bangun ulang indeks tertentu
psql -c "REINDEX INDEX idx_orders_customer_created;"

# Bangun ulang semua indeks pada tabel secara konkuren
psql -c "REINDEX TABLE CONCURRENTLY orders;"

# Bangun ulang seluruh database
psql -c "REINDEX DATABASE mydb;"
```

```sql
-- Periksa ukuran indeks
SELECT
    indexrelid::regclass AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Diagnostik Indeks

```sql
-- Temukan indeks yang tidak terpakai (idx_scan = 0 setelah beban kerja representatif)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Daftar semua indeks pada sebuah tabel
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders';

-- Temukan indeks duplikat (kolom sama, urutan sama)
SELECT
    pg_size_pretty(sum(pg_relation_size(idx))::bigint) AS total_size,
    array_agg(idx) AS indexes
FROM (
    SELECT
        indexrelid::regclass AS idx,
        (indexrelid::regclass::text) AS idx_name,
        indkey::text AS cols
    FROM pg_index
) s
GROUP BY cols
HAVING count(*) > 1;

-- Periksa bloat indeks (rasio dead tuple tinggi)
SELECT
    schemaname,
    tablename,
    indexname,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup::numeric / nullif(n_live_tup, 0) * 100, 2) AS dead_pct
FROM pg_stat_user_indexes
WHERE n_live_tup > 0
ORDER BY dead_pct DESC
LIMIT 10;
```

## Potongan Kode

### Indeks GIN untuk JSONB dan Pencarian Teks Lengkap

```sql
-- Query containment dan keberadaan kunci JSONB
CREATE INDEX idx_products_attrs ON products USING gin (attributes);

SELECT * FROM products
WHERE attributes @> '{"color": "red"}';

SELECT * FROM products
WHERE attributes ? 'brand';

-- Pencarian teks lengkap dengan GIN
CREATE INDEX idx_docs_fts ON documents
USING gin (to_tsvector('english', body));

SELECT title
FROM documents
WHERE to_tsvector('english', body) @@ to_tsquery('postgres & indexing');
```

### Indeks GiST dan BRIN

```sql
-- GiST untuk tumpang-tindih rentang
CREATE INDEX idx_reservations_during
ON reservations USING gist (during);

SELECT *
FROM reservations
WHERE during && tsrange('2026-08-01', '2026-08-31');

-- BRIN untuk tabel time-series (urut secara alami berdasarkan kunci)
CREATE INDEX idx_events_created_brin
ON events USING brin (created_at);

-- BRIN bekerja paling baik saat data terurut secara fisik berdasarkan kolom indeks;
-- jalankan CLUSTER atau VACUUM untuk menjaga urutan pada tabel besar
```

### Indeks Ekspresi dan Parsial dalam Praktik

```sql
-- Indeks unik parsial: terapkan keunikan hanya untuk baris yang tidak dihapus
CREATE UNIQUE INDEX idx_users_active_email
ON users (email)
WHERE deleted_at IS NULL;

-- Indeks ekspresi pada JSONB dengan class operator untuk pengurutan
CREATE INDEX idx_products_name_collation
ON products ((name COLLATE "C"));

-- Query yang dapat memanfaatkan indeks ekspresi
SELECT * FROM users WHERE lower(email) = 'alice@example.com';
```

### Index-Only Scan dan Verifikasi EXPLAIN

```sql
-- Buat indeks penutup untuk memenuhi kebutuhan query
CREATE INDEX idx_orders_customer_total
ON orders (customer_id)
INCLUDE (total_amount, status);

-- Rencana eksekusi seharusnya menampilkan "Index Only Scan"
EXPLAIN ANALYZE
SELECT customer_id, total_amount, status
FROM orders
WHERE customer_id = 7;

-- Paksa planner menampilkan pertimbangannya
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM users WHERE email = 'bob@example.com';
```

### Menghapus dan Membangun Ulang dengan Aman

```sql
-- Sebelum menghapus, pastikan indeks tidak dipakai
SELECT indexname, idx_scan FROM pg_stat_user_indexes
WHERE indexname = 'idx_users_email_old';

-- Hapus indeks yang tidak terpakai
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_old;

-- Bangun ulang indeks yang bengkak secara konkuren di produksi
REINDEX INDEX CONCURRENTLY idx_orders_customer_created;
```

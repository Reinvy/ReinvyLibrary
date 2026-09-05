---
title: "Cheatsheet Transaksi dan Kontrol Konkurensi PostgreSQL"
description: "Referensi cepat untuk kontrol transaksi PostgreSQL, tingkat isolasi, penguncian, MVCC, kunci advisory, dan pemantauan konkurensi."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheatsheet Transaksi dan Kontrol Konkurensi PostgreSQL

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Mulai transaksi | `BEGIN;` | Memulai blok transaksi baru |
| Mulai dengan isolasi eksplisit | `BEGIN ISOLATION LEVEL SERIALIZABLE;` | Memulai dengan tingkat isolasi tertentu |
| Komit perubahan | `COMMIT;` | Membuat semua perubahan pada transaksi menjadi permanen |
| Batalkan perubahan | `ROLLBACK;` | Membuang semua perubahan pada transaksi berjalan |
| Atur isolasi untuk transaksi | `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;` | Mengubah isolasi hanya untuk transaksi saat ini |
| Tampilkan isolasi aktif | `SHOW transaction_isolation;` | Menampilkan tingkat isolasi yang sedang aktif |
| Tandai savepoint | `SAVEPOINT sp1;` | Menetapkan titik rollback bersarang di dalam transaksi |
| Kembali ke savepoint | `ROLLBACK TO SAVEPOINT sp1;` | Membatalkan perubahan sejak savepoint |
| Kunci baris untuk update | `SELECT ... FOR UPDATE;` | Mengambil kunci eksklusif baris, memblokir penulis lain |
| Kunci tanpa menunggu | `SELECT ... FOR UPDATE NOWAIT;` | Gagal seketika jika baris sudah dikunci |
| Lewati baris terkunci | `SELECT ... FOR UPDATE SKIP LOCKED;` | Melewati baris yang dikunci transaksi lain (antrean pekerjaan) |
| Kunci bersama baris | `SELECT ... FOR SHARE;` | Mencegah penghapusan/update baris sambil mengizinkan kunci bersama |
| Kunci advisory sesi | `SELECT pg_advisory_lock(42);` | Memperoleh mutex aplikasi tingkat sesi |
| Coba kunci advisory | `SELECT pg_try_advisory_lock(42);` | Memperoleh kunci atau mengembalikan `false` seketika |
| Daftar kunci aktif | `SELECT * FROM pg_locks;` | Menampilkan semua kunci yang dipegang atau ditunggu di klaster |
| Cari PID pemblokir | `SELECT pg_blocking_pids(pid);` | Menampilkan backend mana yang memblokir backend tertentu |
| Tampilkan ID transaksi | `SELECT txid_current();` | Mengembalikan ID transaksi saat ini |
| Cek status transaksi | `SELECT txid_status(txid_current());` | Melaporkan apakah transaksi komit, batal, atau berjalan |
| Ekspor snapshot | `SELECT pg_export_snapshot();` | Mempublikasikan snapshot saat ini untuk sesi lain |
| Tunda constraint | `SET CONSTRAINTS ALL DEFERRED;` | Menunda constraint yang dapat ditunda hingga waktu komit |

## Perintah Umum

### Kontrol Transaksi Dasar

```sql
-- Autocommit aktif secara bawaan di psql; bungkus pernyataan secara eksplisit
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- kedua update menjadi terlihat secara atomik

-- Batalkan seluruh transaksi saat terjadi kesalahan
BEGIN;
DELETE FROM orders WHERE id = 999;
ROLLBACK;
```

### Savepoint

```sql
BEGIN;
INSERT INTO audit_log (event) VALUES ('awal batch');
SAVEPOINT sp_sebelum_items;
INSERT INTO items (name) VALUES ('item-a');
-- ada sesuatu yang gagal secara konseptual: batalkan hanya insert items
ROLLBACK TO SAVEPOINT sp_sebelum_items;
RELEASE SAVEPOINT sp_sebelum_items;
COMMIT;  -- baris audit_log tetap ada, insert items dibuang
```

### Konfigurasi Tingkat Isolasi

```sql
-- Per transaksi (disarankan)
BEGIN ISOLATION LEVEL REPEATABLE READ;

-- Bawaan per sesi (berlaku untuk transaksi berikutnya)
SET default_transaction_isolation = 'serializable';

-- Verifikasi
SHOW transaction_isolation;
```

### Mode Kunci Tingkat Baris

```sql
-- FOR UPDATE: kunci baris terkuat, memblokir UPDATE/DELETE dan semua kunci baris lain
SELECT * FROM inventory WHERE sku = 'A-100' FOR UPDATE;

-- FOR NO KEY UPDATE: lebih lemah dari FOR UPDATE, mengizinkan FOR KEY SHARE
SELECT * FROM inventory WHERE sku = 'A-100' FOR NO KEY UPDATE;

-- FOR SHARE: memblokir UPDATE/DELETE tetapi mengizinkan kunci FOR SHARE bersamaan
SELECT * FROM products WHERE id = 7 FOR SHARE;

-- FOR KEY SHARE: mengizinkan semuanya kecuali menghapus baris atau mengubah kuncinya
SELECT * FROM products WHERE id = 7 FOR KEY SHARE;

-- Hindari pemblokiran yang menunggu
SELECT * FROM jobs WHERE status = 'pending' FOR UPDATE SKIP LOCKED;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;
```

### Kunci Advisory

```sql
-- Kunci tingkat sesi: dipegang hingga dilepas eksplisit atau sesi berakhir
SELECT pg_advisory_lock(1001);
SELECT pg_advisory_unlock(1001);

-- Kunci tingkat transaksi: dilepas otomatis saat komit/rollback
SELECT pg_advisory_xact_lock(1001);

-- Varian non-blocking mengembalikan keberhasilan boolean
SELECT pg_try_advisory_lock(1001);
SELECT pg_try_advisory_xact_lock(1001);

-- Varian dua kunci (pasangan bigint) untuk keyspace komposit
SELECT pg_advisory_lock(1, 2);
```

### Pemantauan Deadlock dan Kunci

```sql
-- Perpendek interval deteksi saat deadlock sering terjadi (postgresql.conf)
-- deadlock_timeout = 1000ms  (bawaan 1000ms; 1s sudah merupakan bawaan)

-- Backend mana yang terblokir, dan oleh siapa?
SELECT a.pid, a.state, a.query,
       pg_blocking_pids(a.pid) AS blocked_by
FROM pg_stat_activity a
WHERE a.state = 'active' AND pg_blocking_pids(a.pid) <> '{}';

-- Tampilkan tunggakan kunci beserta nama relasi
SELECT l.locktype, l.mode, l.granted, c.relname,
       a.pid AS waiter, pg_blocking_pids(a.pid) AS blocked_by
FROM pg_locks l
LEFT JOIN pg_class c ON c.oid = l.relation
LEFT JOIN pg_stat_activity a ON a.pid = l.pid
WHERE l.locktype IN ('relation', 'tuple')
ORDER BY l.granted DESC, l.relation;
```

## Potongan Kode

### Transfer Atomik dengan Transaksi Eksplisit

```sql
BEGIN;
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;
SELECT balance FROM accounts WHERE id = 1;  -- verifikasi sebelum komit
COMMIT;
```

### Penguncian Pesimistis dengan SELECT FOR UPDATE

```sql
BEGIN;
-- Kunci baris sehingga transaksi lain tidak dapat mengubahnya hingga kita komit
SELECT stock FROM inventory WHERE sku = 'A-100' FOR UPDATE;
-- stock stabil di sini; aman untuk dikurangi tanpa kehilangan update
UPDATE inventory SET stock = stock - 1 WHERE sku = 'A-100';
COMMIT;
```

### Kontrol Konkurensi Optimistis dengan Kolom Versi

```sql
ALTER TABLE documents ADD COLUMN version BIGINT DEFAULT 1;

-- Penulis: update hanya jika versi belum berubah
UPDATE documents
SET content = 'isi baru', version = version + 1
WHERE id = 42 AND version = 3;

-- 0 baris terpengaruh berarti pihak lain komit lebih dulu; ulangi dengan baca ulang
```

### Worker Antrean Pekerjaan dengan SKIP LOCKED

```sql
-- Banyak worker dapat mengklaim tugas tanpa saling memblokir
BEGIN;
SELECT id, payload
FROM job_queue
WHERE status = 'pending'
ORDER BY created_at
LIMIT 10
FOR UPDATE SKIP LOCKED;

UPDATE job_queue SET status = 'processing', started_at = now()
WHERE id IN (SELECT id FROM job_queue WHERE status = 'pending' LIMIT 10 FOR UPDATE SKIP LOCKED);
COMMIT;
```

### Mutex Terdistribusi dengan Kunci Advisory

```sql
-- Pastikan hanya satu worker yang menjalankan rutinitas pemeliharaan di klaster
SELECT pg_try_advisory_lock(9001) AS acquired;

-- Dalam kode aplikasi:
-- if acquired:
--     try:
--         run_maintenance()
--     finally:
--         SELECT pg_advisory_unlock(9001)
```

### Pola Percobaan Ulang Serialisasi

```sql
-- Transaksi SERIALIZABLE dapat dibatalkan dengan SQLSTATE 40001.
-- Pseudo-kode aplikasi: ulangi seluruh transaksi saat terjadi 40001.
BEGIN ISOLATION LEVEL SERIALIZABLE;
UPDATE balances SET total = total + 10 WHERE account_id = 5;
COMMIT;
-- Saat error 40001 (serialization_failure): ROLLBACK dan jalankan ulang dari BEGIN.
```

### Pemeriksaan Konsistensi Snapshot Isolation

```sql
-- Repeatable Read: satu snapshot untuk seluruh transaksi
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT sum(amount) FROM payments WHERE account_id = 5;
-- Pernyataan berikutnya dalam transaksi yang sama melihat snapshot yang SAMA,
-- bahkan jika transaksi lain komit di antaranya.
COMMIT;
```

### Pemeriksaan Constraint yang Ditunda

```sql
-- Dengan FK yang dapat ditunda, urutan insert dalam transaksi tidak masalah
BEGIN;
SET CONSTRAINTS ALL DEFERRED;
INSERT INTO order_items (order_id, product_id) VALUES (1, 10);
INSERT INTO orders (id) VALUES (1);  -- baris yang dirujuk diinsert setelah referensi
COMMIT;  -- diperiksa di sini; lolos karena kedua baris kini ada
```

### Diagnosa Kontensi Kunci

```sql
SELECT blocked.pid AS blocked_pid,
       blocking.pid AS blocking_pid,
       blocked.query AS blocked_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
  ON blocking.pid = ANY (pg_blocking_pids(blocked.pid))
WHERE blocked.wait_event_type = 'Lock';
```

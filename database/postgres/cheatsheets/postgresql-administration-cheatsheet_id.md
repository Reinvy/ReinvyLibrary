---
title: "Cheat Sheet Administrasi Database PostgreSQL"
description: "Panduan referensi cepat untuk administrasi database PostgreSQL, konfigurasi, backup dan restore, pemantauan, dan perawatan."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Administrasi Database PostgreSQL

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|----------------|-----------|
| Cek versi | `SELECT version();` | Tampilkan versi server PostgreSQL |
| Tampilkan konfigurasi | `SHOW config_name;` | Lihat nilai parameter konfigurasi saat ini |
| Reload konfigurasi | `SELECT pg_reload_conf();` | Terapkan perubahan postgresql.conf tanpa restart |
| Daftar database | `\l` atau `SELECT datname FROM pg_database;` | Tampilkan semua database di server |
| Ukuran database | `SELECT pg_size_pretty(pg_database_size('dbname'));` | Tampilkan ukuran database dalam format terbaca |
| Daftar koneksi | `SELECT * FROM pg_stat_activity;` | Lihat semua koneksi database aktif |
| Hentikan koneksi | `SELECT pg_terminate_backend(pid);` | Hentikan koneksi database tertentu |
| Daftar pengguna/role | `\du` atau `SELECT rolname FROM pg_roles;` | Tampilkan semua role database |
| Buat pengguna | `CREATE USER username WITH PASSWORD 'password';` | Buat pengguna database baru |
| Beri hak akses | `GRANT ALL PRIVILEGES ON DATABASE db TO user;` | Berikan semua hak akses pada database |
| Tampilkan ukuran tabel | `SELECT pg_size_pretty(pg_total_relation_size('table'));` | Tampilkan ukuran tabel termasuk indeks |
| Tampilkan kunci | `SELECT * FROM pg_locks;` | Lihat kunci yang dipegang transaksi |
| Jalankan vacuum | `VACUUM ANALYZE table_name;` | Pulihkan ruang dan perbarui statistik |
| Tampilkan penggunaan indeks | `SELECT * FROM pg_stat_user_indexes;` | Lihat statistik scan indeks |
| Ekspor database | `pg_dump -U user -d dbname -F c -f backup.dump` | Dump database ke format kustom |
| Pulihkan database | `pg_restore -U user -d dbname -c backup.dump` | Pulihkan database dari dump format kustom |
| Cek replikasi | `SELECT * FROM pg_stat_replication;` | Lihat status replikasi |

## Perintah Umum

### Manajemen Koneksi dan Sesi

```bash
# Koneksi dengan host, port, dan database spesifik
psql -h localhost -p 5432 -U admin -d mydb

# Koneksi dengan SSL
psql "sslmode=verify-full host=localhost dbname=mydb user=admin"

# Batasi jumlah koneksi per role
ALTER ROLE app_user CONNECTION LIMIT 10;

# Konfigurasi timeout sesi idle
ALTER SYSTEM SET idle_in_transaction_session_timeout = '60000';
SELECT pg_reload_conf();
```

### Manajemen Role dan Izin

```bash
# Buat role read-only
CREATE ROLE readonly;
GRANT CONNECT ON DATABASE mydb TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;

# Buat role dengan login dan tanggal kedaluwarsa password
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_pass' VALID UNTIL '2027-01-01';

# Berikan keanggotaan role
GRANT readonly TO app_user;

# Cabut semua hak akses pada schema
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_user;
REVOKE ALL ON SCHEMA public FROM app_user;

# Daftar keanggotaan role
SELECT r.rolname, m.rolname AS member_of
FROM pg_roles r
JOIN pg_auth_members am ON r.oid = am.roleid
JOIN pg_roles m ON am.member = m.oid;
```

### Manajemen Konfigurasi

```bash
# Lihat semua konfigurasi non-default
SELECT name, setting, unit, context
FROM pg_settings
WHERE source != 'default'
ORDER BY name;

# Atur memori (postgresql.conf)
# shared_buffers = 25% dari RAM
# effective_cache_size = 75% dari RAM
# work_mem = (RAM * 0.25) / (max_connections * 16)
# maintenance_work_mem = 10% dari RAM (maks 1GB)

# Atur parameter sementara untuk sesi
SET work_mem = '64MB';

# Perbarui konfigurasi permanen
ALTER SYSTEM SET max_connections = '200';
ALTER SYSTEM SET wal_level = 'replica';
SELECT pg_reload_conf();

# Reset parameter ke default
ALTER SYSTEM RESET shared_buffers;
SELECT pg_reload_conf();
```

### Manajemen Database

```bash
# Buat database dengan encoding dan locale kustom
CREATE DATABASE mydb
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE 'en_US.UTF-8'
  TEMPLATE template0;

# Ubah nama database (harus mode single-user)
ALTER DATABASE mydb RENAME TO mydb_old;

# Salin database
CREATE DATABASE newdb WITH TEMPLATE mydb;

# Atur tablespace default untuk database
ALTER DATABASE mydb SET TABLESPACE fast_ssd;

# Atur jalur pencarian schema
ALTER DATABASE mydb SET search_path TO app, public;
```

### Pemantauan dan Diagnostik

```bash
# Lihat kueri yang sedang berjalan (kecuali idle)
SELECT pid, age(now(), query_start) AS duration,
       state, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

# Temukan transaksi berdurasi panjang
SELECT pid, age(now(), xact_start) AS duration,
       state, query
FROM pg_stat_activity
WHERE state != 'idle'
  AND xact_start IS NOT NULL
ORDER BY duration DESC
LIMIT 10;

# Lacak performa kueri
# Membutuhkan ekstensi pg_stat_statements
SELECT queryid, calls, total_exec_time / 1000 AS total_sec,
       mean_exec_time AS avg_ms,
       rows, shared_blks_hit, shared_blks_read,
       ROUND(100.0 * shared_blks_hit /
         NULLIF(shared_blks_hit + shared_blks_read, 0), 2) AS hit_pct
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

# Monitor pembengkakan tabel
SELECT schemaname, tablename, n_dead_tup,
       n_live_tup,
       ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY n_dead_tup DESC
LIMIT 20;
```

### Backup dan Restore

```bash
# Backup logikal database tunggal (format kustom)
pg_dump -h localhost -U admin -F c -f /backup/db_20260719.dump mydb

# Backup dengan tingkat kompresi
pg_dump -h localhost -U admin -F c --compress=9 -f /backup/db_compressed.dump mydb

# Backup hanya schema (tanpa data)
pg_dump -h localhost -U admin -s -f /backup/schema.sql mydb

# Backup tabel spesifik
pg_dump -h localhost -U admin -t public.orders -f /backup/orders.sql mydb

# Pulihkan dump format kustom
pg_restore -h localhost -U admin -d mydb -c /backup/db_20260719.dump

# Pulihkan dengan pekerja paralel
pg_restore -h localhost -U admin -d mydb -j 4 -c /backup/db_20260719.dump

# Backup fisik untuk PITR
pg_basebackup -h localhost -U replicator -D /backup/base_backup -X stream -P

# Ekspor hasil kueri ke CSV
psql -h localhost -U admin -d mydb -c "\copy (SELECT * FROM orders WHERE created > '2026-01-01') TO '/tmp/orders.csv' CSV HEADER"
```

### Operasi Perawatan

```bash
# Vacuum agresif untuk tabel yang sering diupdate
VACUUM (VERBOSE, ANALYZE, INDEX_CLEANUP ON, TRUNCATE ON) orders;

# Analyze kolom spesifik saja
ANALYZE users (email, status);

# Perbarui statistik tabel di semua database
analyzedb -d mydb --all

# Bangun ulang indeks
REINDEX INDEX CONCURRENTLY idx_orders_created;
REINDEX TABLE CONCURRENTLY orders;

# Cluster tabel berdasarkan indeks
CLUSTER orders USING idx_orders_created;

# Lihat aktivitas autovacuum
SELECT schemaname, relname, last_autovacuum,
       last_autoanalyze, n_dead_tup, n_live_tup
FROM pg_stat_user_tables
ORDER BY last_autovacuum NULLS FIRST;

# Cek indeks foreign key yang hilang
SELECT conname, conrelid::regclass AS table_name,
       unnest(conkey) AS column_positions
FROM pg_constraint
WHERE contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index
    WHERE indrelid = conrelid
      AND conkey = indexrelid::pg_class::oid::int[];
  );
```

## Potongan Kode

### Manajemen Ekstensi

```sql
-- Daftar ekstensi terinstal
SELECT extname, extversion, extrelocatable
FROM pg_extension
ORDER BY extname;

-- Instal ekstensi umum
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS uuid_ossp;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Perbarui versi ekstensi
ALTER EXTENSION pg_stat_statements UPDATE;
```

### Pola Connection Pooling (PgBouncer)

```ini
; /etc/pgbouncer/pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Pengaturan pool
pool_mode = transaction
max_client_conn = 500
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3.0

; Timeout
server_idle_timeout = 300
client_idle_timeout = 0
query_timeout = 30
```

```bash
# Buat entri file auth PgBouncer
echo '"app_user" "password123"' >> /etc/pgbouncer/userlist.txt

# Perintah konsol admin PgBouncer
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHOW STATS;"
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "RECONNECT;"
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "PAUSE;"
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHUTDOWN;"
```

### Pola Setup Replikasi

```bash
# Di server primary
# Pengaturan postgresql.conf
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1024  # MB
hot_standby = on

# Buat user replikasi
CREATE ROLE replicator WITH LOGIN REPLICATION PASSWORD 'replica_secret';

# Di server standby
# Jalankan base backup
pg_basebackup -h primary_host -U replicator -D /var/lib/postgresql/data -X stream -P

# Buat file standby.signal di direktori data
touch /var/lib/postgresql/data/standby.signal

# postgresql.conf di standby
primary_conninfo = 'host=primary_host port=5432 user=replicator password=replica_secret'
primary_slot_name = 'standby_slot_01'
hot_standby = on
```

```sql
-- Buat slot replikasi fisik di primary
SELECT pg_create_physical_replication_slot('standby_slot_01');

-- Monitor jeda replikasi
SELECT pid, application_name, state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn) AS write_lag_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) AS flush_lag_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication;

-- Cek apakah server adalah replica
SELECT pg_is_in_recovery();
```

### Point-in-Time Recovery (PITR)

```ini
; Pengaturan arsip postgresql.conf
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
archive_timeout = 60
wal_level = replica
```

```bash
# Konfigurasi recovery (postgresql.conf)
restore_command = 'cp /var/lib/postgresql/archive/%f %p'
recovery_target_time = '2026-07-19 04:30:00 UTC'
recovery_target_action = 'promote'

# Buat sinyal recovery
touch /var/lib/postgresql/data/recovery.signal
```

### Kueri Pemeriksaan Kesehatan

```sql
-- Pemeriksaan kesehatan cepat
SELECT
  pg_is_in_recovery() AS is_replica,
  pg_database_size(current_database()) AS db_bytes,
  (SELECT count(*) FROM pg_stat_activity) AS active_connections,
  (SELECT setting FROM pg_settings WHERE name = 'max_connections') AS max_connections,
  pg_postmaster_start_time AS server_up_since
FROM pg_postmaster_start_time();

-- Cari indeks yang tidak sehat
SELECT schemaname, tablename, indexname, idx_scan,
       idx_tup_read, idx_tup_fetch,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_relation_size(indexrelid) DESC;

-- Penggunaan disk per database
SELECT datname,
       pg_size_pretty(pg_database_size(datname)) AS size,
       pg_database_size(datname) AS size_bytes
FROM pg_database
WHERE datname NOT IN ('template0', 'template1')
ORDER BY size_bytes DESC;

-- Cari tabel yang jarang digunakan
SELECT schemaname, relname, n_tup_ins, n_tup_upd, n_tup_del, n_tup_hot_upd,
       n_live_tup, n_dead_tup, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE idx_scan = 0 AND seq_scan < 100
  AND relname NOT LIKE 'pg_%'
ORDER BY seq_scan;
```

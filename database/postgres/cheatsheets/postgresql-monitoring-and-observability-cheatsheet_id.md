---
title: "Cheatsheet Monitoring dan Observability PostgreSQL"
description: "Referensi cepat untuk view pemantauan PostgreSQL, wait event, analisis performa query, pemeriksaan keterlambatan replikasi, instrumentasi log, dan query alerting."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheatsheet Monitoring dan Observability PostgreSQL

## Tabel Referensi Cepat

| View / Alat | Informasi yang Diberikan | Kolom Utama |
|-------------|--------------------------|-------------|
| `pg_stat_activity` | Sesi aktif, query berjalan, dan wait event | `pid`, `state`, `wait_event_type`, `query` |
| `pg_stat_statements` | Performa agregat dari setiap pernyataan yang dieksekusi | `queryid`, `mean_exec_time`, `calls` |
| `pg_stat_database` | Kesehatan dan lalu lintas klaster per database | `xact_commit`, `deadlocks`, `blks_hit` |
| `pg_stat_user_tables` | Pola akses per tabel dan churn tuple | `seq_scan`, `idx_scan`, `n_tup_hot_upd` |
| `pg_stat_user_indexes` | Penggunaan index, termasuk index yang tidak pernah dipakai | `idx_scan`, `idx_tup_read` |
| `pg_stat_replication` | Status replika streaming dan keterlambatan replay | `state`, `replay_lag`, `sent_lsn` |
| `pg_stat_progress_vacuum` | Progres `VACUUM` yang sedang berjalan dan fasenya | `phase`, `heap_blks_scanned` |
| `pg_stat_bgwriter` | Frekuensi checkpoint dan tekanan tulis backend | `checkpoints_timed`, `buffers_backend` |
| `pg_stat_archiver` | Riwayat keberhasilan dan kegagalan pengarsipan WAL | `archived_count`, `last_failed_time` |
| `pg_stat_database_conflicts` | Penyebab replika membatalkan query (konflik standby) | `confl_snapshot`, `confl_bufferpin` |
| `pg_locks` | Rantai kunci, backend yang memegang vs menunggu | `mode`, `granted`, `pid` |
| `pg_replication_slots` | Status slot logical/fisik dan retensi datanya | `slot_type`, `confirmed_flush_lsn` |
| `auto_explain` | Pencatatan `EXPLAIN` otomatis untuk pernyataan lambat | baris log dengan output plan |
| `pg_stat_wal` | Volume tulis WAL dan waktu fsync | `wal_bytes`, `wal_fsync_time` |

## Perintah Umum

### Inspeksi Sesi dan Query

```sql
-- Query aktif dengan durasi dan wait event (jalankan sebagai superuser)
SELECT pid, usename, state, wait_event_type, wait_event,
       now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND pid <> pg_backend_pid()
ORDER BY duration DESC;

-- Query berjalan lama di atas ambang batas
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state <> 'idle' AND now() - query_start > interval '5 minutes';

-- Sesi yang terjebak "idle in transaction" (sering menjadi pemegang kunci)
SELECT pid, usename, now() - state_change AS idle_since, query
FROM pg_stat_activity
WHERE state = 'idle in transaction';

-- Semua sesi yang sedang menunggu kunci
SELECT pid, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE wait_event_type = 'Lock';

-- Temukan rantai backend pemblokir untuk sebuah sesi
SELECT pid, pg_blocking_pids(pid) AS blocked_by, state, query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

### Performa Tingkat Pernyataan (pg_stat_statements)

```sql
-- Aktifkan (membutuhkan shared_preload_libraries = 'pg_stat_statements' + restart)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 10 pernyataan teratas berdasarkan total waktu eksekusi
SELECT queryid, calls, mean_exec_time, total_exec_time,
       rows, query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 10 pernyataan teratas berdasarkan waktu rata-rata (mahal per pemanggilan)
SELECT queryid, calls, mean_exec_time, stddev_exec_time, query
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Pernyataan teratas berdasarkan penggunaan buffer (tekanan cache)
SELECT queryid, calls, shared_blks_hit, shared_blks_read, query
FROM pg_stat_statements
ORDER BY shared_blks_read DESC
LIMIT 10;

-- Reset statistik yang terakumulasi
SELECT pg_stat_statements_reset();
```

### Kesehatan Database dan Klaster

```sql
-- Rasio cache hit per database (target: di atas 99%)
SELECT datname,
       100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0)
       AS cache_hit_ratio
FROM pg_stat_database
WHERE datname NOT IN ('template0', 'template1')
GROUP BY datname
ORDER BY cache_hit_ratio;

-- Transaksi, rollback, dan deadlock per database
SELECT datname, xact_commit, xact_rollback, deadlocks,
       conflicts, blk_read_time, blk_write_time
FROM pg_stat_database
ORDER BY deadlocks DESC;

-- Perilaku checkpoint (timed vs requested = tekanan tulis)
SELECT checkpoints_timed, checkpoints_req,
       checkpoint_write_time, checkpoint_sync_time,
       buffers_backend, buffers_checkpoint
FROM pg_stat_bgwriter;

-- Kegagalan pengarsipan WAL (harus nol dalam kondisi stabil)
SELECT archived_count, failed_count,
       last_archived_wal, last_failed_wal, last_failed_time
FROM pg_stat_archiver;
```

### Statistik Tabel dan Index

```sql
-- Tabel yang didominasi sequential scan (kemungkinan index hilang)
SELECT schemaname, relname, seq_scan, idx_scan,
       100.0 * seq_scan / nullif(seq_scan + idx_scan, 0) AS seq_scan_pct
FROM pg_stat_user_tables
WHERE seq_scan + idx_scan > 0
ORDER BY seq_scan_pct DESC
LIMIT 10;

-- Tabel dengan dead tuple terbanyak (tunggakan autovacuum)
SELECT schemaname, relname, n_live_tup, n_dead_tup,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 10;

-- Index yang tidak pernah dipindai (kandidat untuk dihapus)
SELECT s.schemaname, s.relname AS table, s.indexrelname AS index,
       s.idx_scan, pg_size_pretty(pg_relation_size(s.indexrelid)) AS size
FROM pg_stat_user_indexes s
WHERE s.idx_scan = 0 AND s.indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(s.indexrelid) DESC
LIMIT 10;

-- Pembacaan fisik per tabel (heap vs index)
SELECT schemaname, relname, heap_blks_read, heap_blks_hit,
       idx_blks_read, idx_blks_hit
FROM pg_statio_user_tables
ORDER BY heap_blks_read + idx_blks_read DESC
LIMIT 10;
```

### Pemantauan Replikasi

```sql
-- Status replika dan keterlambatan replay langsung
SELECT client_addr, state, sync_state,
       sent_lsn, replay_lsn,
       replay_lag, write_lag, flush_lag
FROM pg_stat_replication;

-- Keterlambatan eksplisit dalam byte menggunakan aritmetika LSN WAL
SELECT client_addr, state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn)   AS sent_lag_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication;

-- Keterlambatan slot logical (konsumen tertinggal)
SELECT slot_name, slot_type, active,
       pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS lag_bytes
FROM pg_replication_slots;

-- Konflik pembatalan query di standby
SELECT datname, confl_snapshot, confl_bufferpin, confl_deadlock
FROM pg_stat_database_conflicts
ORDER BY confl_snapshot + confl_bufferpin DESC;
```

### Pemantauan Vacuum dan Autovacuum

```sql
-- Progres vacuum yang sedang berjalan
SELECT pid, datname, relname, phase,
       heap_blks_total, heap_blks_scanned,
       index_vacuum_count
FROM pg_stat_progress_vacuum;

-- Konfigurasi autovacuum dalam satu view
SELECT name, setting, unit, short_desc
FROM pg_settings
WHERE name LIKE 'autovacuum%';

-- Risiko wraparound ID transaksi (darurat pada 100 juta)
SELECT datname, age(datfrozenxid) AS xid_age
FROM pg_database
ORDER BY xid_age DESC;
```

### Instrumentasi Logging dan Query

```sql
-- Catat pernyataan apa pun yang lebih lambat dari 1 detik (postgresql.conf)
log_min_duration_statement = 1000

-- Tangkap lock wait yang melebihi 1 detik di log
log_lock_waits = on
deadlock_timeout = 1s

-- Catat teks SQL lengkap dari setiap pernyataan (hanya untuk debugging)
log_statement = 'ddl'

-- Sertakan timestamp, pengguna, dan database di setiap baris log
log_line_prefix = '%m [%p] %u@%d '
```

## Potongan Kode

### Dasbor Aktivitas Real-Time

```sql
-- Satu query untuk pemindaian kesehatan cepat: rincian state plus wait event teratas
SELECT state, wait_event_type,
       count(*) AS backends,
       round(avg(extract(epoch FROM (now() - query_start)))::numeric, 1) AS avg_active_s
FROM pg_stat_activity
GROUP BY state, wait_event_type
ORDER BY backends DESC;
```

### Query yang Diblokir dan Pemblokir

```sql
-- Pasangkan setiap backend yang diblokir dengan query yang memblokirnya
WITH blocked AS (
  SELECT pid, pg_blocking_pids(pid) AS blockers, query
  FROM pg_stat_activity
  WHERE cardinality(pg_blocking_pids(pid)) > 0
)
SELECT b.pid AS blocked_pid, b.query AS blocked_query,
       unnest(b.blockers) AS blocker_pid,
       a.query AS blocker_query
FROM blocked b
JOIN pg_stat_activity a ON a.pid = b.blockers[1];
```

### Query Lambat Teratas dari pg_stat_statements

```sql
-- Tinjauan mingguan: 10 pernyataan termahal untuk dioptimalkan berikutnya
SELECT round(total_exec_time / 1000) AS total_ms,
       calls, round(mean_exec_time, 2) AS mean_ms,
       round(100.0 * total_exec_time /
             sum(total_exec_time) OVER (), 1) AS pct_of_all,
       left(query, 80) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Alert Rasio Cache Hit

```sql
-- Beri alert saat database mana pun turun di bawah 99% rasio cache hit
SELECT datname, cache_hit_ratio
FROM (
  SELECT datname,
         100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0)
         AS cache_hit_ratio
  FROM pg_stat_database
  WHERE datname NOT IN ('template0', 'template1')
  GROUP BY datname
) stats
WHERE cache_hit_ratio < 99.0;
```

### Bloat Tabel dan Keusangan Vacuum

```sql
-- Tabel berisiko: churn berat tanpa autovacuum baru-baru ini
SELECT schemaname, relname, n_live_tup, n_dead_tup,
       round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 1)
       AS dead_pct,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
  AND (last_autovacuum IS NULL OR last_autovacuum < now() - interval '1 day')
ORDER BY dead_pct DESC
LIMIT 10;
```

### Alert Keterlambatan Replikasi

```sql
-- Beri alert saat replika fisik mana pun tertinggal lebih dari 10 menit
SELECT client_addr, state,
       extract(epoch FROM replay_lag) / 60 AS lag_minutes
FROM pg_stat_replication
WHERE extract(epoch FROM replay_lag) / 60 > 10;
```

### Mengaktifkan auto_explain

```text
# postgresql.conf — catat plan explain untuk pernyataan di atas 500 ms
shared_preload_libraries = 'auto_explain'
auto_explain.log_min_duration = 500
auto_explain.log_analyze = on
auto_explain.log_buffers = on
# Opsional: hanya catat plan yang menyebut tabel tertentu
# auto_explain.log_nested_statements = on
```

```bash
# Restart, lalu periksa log untuk output plan
sudo systemctl restart postgresql
grep -r "duration: 5" /var/log/postgresql/
```

### Pemeriksaan Risiko Wraparound ID Transaksi

```sql
-- Peringatan pada 100 juta, kritis pada 150 juta, freeze autovacuum bawaan mulai ~200 juta
SELECT datname, age(datfrozenxid) AS xid_age,
       round(100.0 * age(datfrozenxid) / 2000000000, 1) AS pct_to_wraparound
FROM pg_database
ORDER BY xid_age DESC;
```

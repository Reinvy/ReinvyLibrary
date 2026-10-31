---
title: "PostgreSQL Monitoring and Observability Cheatsheet"
description: "A quick reference for PostgreSQL monitoring views, wait events, query performance analysis, replication lag checks, log instrumentation, and alerting queries."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# PostgreSQL Monitoring and Observability Cheatsheet

## Quick Reference Table

| View / Tool | What It Tells You | Key Columns |
|-------------|-------------------|-------------|
| `pg_stat_activity` | Live sessions, running queries, and wait events | `pid`, `state`, `wait_event_type`, `query` |
| `pg_stat_statements` | Aggregated performance of every executed statement | `queryid`, `mean_exec_time`, `calls` |
| `pg_stat_database` | Per-database cluster health and traffic | `xact_commit`, `deadlocks`, `blks_hit` |
| `pg_stat_user_tables` | Per-table access patterns and tuple churn | `seq_scan`, `idx_scan`, `n_tup_hot_upd` |
| `pg_stat_user_indexes` | Index usage, including never-used indexes | `idx_scan`, `idx_tup_read` |
| `pg_stat_replication` | Streaming replica state and replay lag | `state`, `replay_lag`, `sent_lsn` |
| `pg_stat_progress_vacuum` | In-flight `VACUUM` progress and phase | `phase`, `heap_blks_scanned` |
| `pg_stat_bgwriter` | Checkpoint frequency and backend write pressure | `checkpoints_timed`, `buffers_backend` |
| `pg_stat_archiver` | WAL archiving success and failure history | `archived_count`, `last_failed_time` |
| `pg_stat_database_conflicts` | Why replicas cancel queries (standby conflicts) | `confl_snapshot`, `confl_bufferpin` |
| `pg_locks` | Lock chains, granted vs waiting backends | `mode`, `granted`, `pid` |
| `pg_replication_slots` | Logical/physical slot state and retention | `slot_type`, `confirmed_flush_lsn` |
| `auto_explain` | Automatic `EXPLAIN` logging for slow statements | log lines with plan output |
| `pg_stat_wal` | WAL write volume and fsync timing | `wal_bytes`, `wal_fsync_time` |

## Common Commands

### Session and Query Inspection

```sql
-- Active queries with duration and wait event (run as superuser)
SELECT pid, usename, state, wait_event_type, wait_event,
       now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND pid <> pg_backend_pid()
ORDER BY duration DESC;

-- Long-running queries above a threshold
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state <> 'idle' AND now() - query_start > interval '5 minutes';

-- Sessions stuck "idle in transaction" (common lock holder)
SELECT pid, usename, now() - state_change AS idle_since, query
FROM pg_stat_activity
WHERE state = 'idle in transaction';

-- All sessions currently waiting on a lock
SELECT pid, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE wait_event_type = 'Lock';

-- Find the chain of blocking backends for a session
SELECT pid, pg_blocking_pids(pid) AS blocked_by, state, query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

### Statement-Level Performance (pg_stat_statements)

```sql
-- Enable (requires shared_preload_libraries = 'pg_stat_statements' + restart)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 statements by total execution time
SELECT queryid, calls, mean_exec_time, total_exec_time,
       rows, query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Top 10 statements by average time (expensive per call)
SELECT queryid, calls, mean_exec_time, stddev_exec_time, query
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Top statements by buffer usage (cache pressure)
SELECT queryid, calls, shared_blks_hit, shared_blks_read, query
FROM pg_stat_statements
ORDER BY shared_blks_read DESC
LIMIT 10;

-- Reset accumulated statistics
SELECT pg_stat_statements_reset();
```

### Database and Cluster Health

```sql
-- Cache hit ratio per database (target: above 99%)
SELECT datname,
       100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0)
       AS cache_hit_ratio
FROM pg_stat_database
WHERE datname NOT IN ('template0', 'template1')
GROUP BY datname
ORDER BY cache_hit_ratio;

-- Transactions, rollbacks, and deadlocks per database
SELECT datname, xact_commit, xact_rollback, deadlocks,
       conflicts, blk_read_time, blk_write_time
FROM pg_stat_database
ORDER BY deadlocks DESC;

-- Checkpoint behavior (timed vs requested = write pressure)
SELECT checkpoints_timed, checkpoints_req,
       checkpoint_write_time, checkpoint_sync_time,
       buffers_backend, buffers_checkpoint
FROM pg_stat_bgwriter;

-- WAL archiving failures (must be zero in steady state)
SELECT archived_count, failed_count,
       last_archived_wal, last_failed_wal, last_failed_time
FROM pg_stat_archiver;
```

### Table and Index Statistics

```sql
-- Tables dominated by sequential scans (possible missing index)
SELECT schemaname, relname, seq_scan, idx_scan,
       100.0 * seq_scan / nullif(seq_scan + idx_scan, 0) AS seq_scan_pct
FROM pg_stat_user_tables
WHERE seq_scan + idx_scan > 0
ORDER BY seq_scan_pct DESC
LIMIT 10;

-- Tables with the most dead tuples (autovacuum backlog)
SELECT schemaname, relname, n_live_tup, n_dead_tup,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 10;

-- Indexes that are never scanned (candidates for removal)
SELECT s.schemaname, s.relname AS table, s.indexrelname AS index,
       s.idx_scan, pg_size_pretty(pg_relation_size(s.indexrelid)) AS size
FROM pg_stat_user_indexes s
WHERE s.idx_scan = 0 AND s.indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(s.indexrelid) DESC
LIMIT 10;

-- Physical reads per table (heap vs index)
SELECT schemaname, relname, heap_blks_read, heap_blks_hit,
       idx_blks_read, idx_blks_hit
FROM pg_statio_user_tables
ORDER BY heap_blks_read + idx_blks_read DESC
LIMIT 10;
```

### Replication Monitoring

```sql
-- Replica state and live replay lag
SELECT client_addr, state, sync_state,
       sent_lsn, replay_lsn,
       replay_lag, write_lag, flush_lag
FROM pg_stat_replication;

-- Explicit lag in bytes using WAL LSN arithmetic
SELECT client_addr, state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn)   AS sent_lag_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication;

-- Logical slot lag (consumer falling behind)
SELECT slot_name, slot_type, active,
       pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS lag_bytes
FROM pg_replication_slots;

-- Standby query cancellation conflicts
SELECT datname, confl_snapshot, confl_bufferpin, confl_deadlock
FROM pg_stat_database_conflicts
ORDER BY confl_snapshot + confl_bufferpin DESC;
```

### Vacuum and Autovacuum Monitoring

```sql
-- In-flight vacuum progress
SELECT pid, datname, relname, phase,
       heap_blks_total, heap_blks_scanned,
       index_vacuum_count
FROM pg_stat_progress_vacuum;

-- Autovacuum configuration in one view
SELECT name, setting, unit, short_desc
FROM pg_settings
WHERE name LIKE 'autovacuum%';

-- Transaction ID wraparound risk (emergency at 100 million)
SELECT datname, age(datfrozenxid) AS xid_age
FROM pg_database
ORDER BY xid_age DESC;
```

### Logging and Query Instrumentation

```sql
-- Log any statement slower than 1 second (postgresql.conf)
log_min_duration_statement = 1000

-- Capture lock waits exceeding 1 second in the log
log_lock_waits = on
deadlock_timeout = 1s

-- Log the full SQL text of every statement (debug only)
log_statement = 'ddl'

-- Include timestamps, user, and database in every log line
log_line_prefix = '%m [%p] %u@%d '
```

## Code Snippets

### Real-Time Activity Dashboard

```sql
-- One query for a quick health scan: state breakdown plus top wait events
SELECT state, wait_event_type,
       count(*) AS backends,
       round(avg(extract(epoch FROM (now() - query_start)))::numeric, 1) AS avg_active_s
FROM pg_stat_activity
GROUP BY state, wait_event_type
ORDER BY backends DESC;
```

### Blocked and Blocking Queries

```sql
-- Pair every blocked backend with the query that blocks it
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

### Top Slow Queries from pg_stat_statements

```sql
-- Weekly review: the 10 most expensive statements to optimize next
SELECT round(total_exec_time / 1000) AS total_ms,
       calls, round(mean_exec_time, 2) AS mean_ms,
       round(100.0 * total_exec_time /
             sum(total_exec_time) OVER (), 1) AS pct_of_all,
       left(query, 80) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Cache Hit Ratio Alert

```sql
-- Alert when any database drops below 99% cache hit ratio
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

### Table Bloat and Vacuum Staleness

```sql
-- Tables at risk: heavy churn with no recent autovacuum
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

### Replication Lag Alert

```sql
-- Alert when any physical replica falls more than 10 minutes behind
SELECT client_addr, state,
       extract(epoch FROM replay_lag) / 60 AS lag_minutes
FROM pg_stat_replication
WHERE extract(epoch FROM replay_lag) / 60 > 10;
```

### Enabling auto_explain

```text
# postgresql.conf — log explain plans for statements over 500 ms
shared_preload_libraries = 'auto_explain'
auto_explain.log_min_duration = 500
auto_explain.log_analyze = on
auto_explain.log_buffers = on
# Optional: only log plans that mention a specific table
# auto_explain.log_nested_statements = on
```

```bash
# Restart, then check the log for plan output
sudo systemctl restart postgresql
grep -r "duration: 5" /var/log/postgresql/
```

### Transaction ID Wraparound Risk Check

```sql
-- Warning at 100M, critical at 150M, default autovacuum freeze starts ~200M
SELECT datname, age(datfrozenxid) AS xid_age,
       round(100.0 * age(datfrozenxid) / 2000000000, 1) AS pct_to_wraparound
FROM pg_database
ORDER BY xid_age DESC;
```

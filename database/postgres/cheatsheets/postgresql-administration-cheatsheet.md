---
title: "PostgreSQL Database Administration Cheatsheet"
description: "A comprehensive quick reference for PostgreSQL database administration, configuration, backup and restore, monitoring, and maintenance."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# PostgreSQL Database Administration Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Check version | `SELECT version();` | Display PostgreSQL server version |
| Show running config | `SHOW config_name;` | View current configuration parameter value |
| Reload config | `SELECT pg_reload_conf();` | Apply changes to postgresql.conf without restart |
| List databases | `\l` or `SELECT datname FROM pg_database;` | List all databases on the server |
| Database size | `SELECT pg_size_pretty(pg_database_size('dbname'));` | Show human-readable database size |
| List connections | `SELECT * FROM pg_stat_activity;` | View all active database connections |
| Terminate connection | `SELECT pg_terminate_backend(pid);` | Kill a specific database connection |
| List users/roles | `\du` or `SELECT rolname FROM pg_roles;` | List all database roles |
| Create user | `CREATE USER username WITH PASSWORD 'password';` | Create a new database user |
| Grant privileges | `GRANT ALL PRIVILEGES ON DATABASE db TO user;` | Grant all privileges on a database |
| Show table size | `SELECT pg_size_pretty(pg_total_relation_size('table'));` | Show table size including indexes |
| Show locks | `SELECT * FROM pg_locks;` | View current locks held by transactions |
| Run vacuum | `VACUUM ANALYZE table_name;` | Reclaim storage and update statistics |
| Show index usage | `SELECT * FROM pg_stat_user_indexes;` | View index scan statistics |
| Export database | `pg_dump -U user -d dbname -F c -f backup.dump` | Dump database to custom format |
| Restore database | `pg_restore -U user -d dbname -c backup.dump` | Restore database from custom format dump |
| Setup replication | `SELECT * FROM pg_stat_replication;` | View replication status |

## Common Commands

### Connection and Session Management

```bash
# Connect with specific host, port, and database
psql -h localhost -p 5432 -U admin -d mydb

# Connect with SSL enabled
psql "sslmode=verify-full host=localhost dbname=mydb user=admin"

# Set connection limits per role
ALTER ROLE app_user CONNECTION LIMIT 10;

# Configure idle session timeout
ALTER SYSTEM SET idle_in_transaction_session_timeout = '60000';
SELECT pg_reload_conf();
```

### Role and Permission Management

```bash
# Create a read-only role
CREATE ROLE readonly;
GRANT CONNECT ON DATABASE mydb TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;

# Create role with login and password expiration
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_pass' VALID UNTIL '2027-01-01';

# Grant membership in a role
GRANT readonly TO app_user;

# Revoke all privileges on a schema
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_user;
REVOKE ALL ON SCHEMA public FROM app_user;

# List role memberships
SELECT r.rolname, m.rolname AS member_of
FROM pg_roles r
JOIN pg_auth_members am ON r.oid = am.roleid
JOIN pg_roles m ON am.member = m.oid;
```

### Configuration Management

```bash
# View all non-default configuration
SELECT name, setting, unit, context
FROM pg_settings
WHERE source != 'default'
ORDER BY name;

# Tune memory settings (postgresql.conf)
# shared_buffers = 25% of RAM
# effective_cache_size = 75% of RAM
# work_mem = (RAM * 0.25) / (max_connections * 16)
# maintenance_work_mem = 10% of RAM (max 1GB)

# Set parameter temporarily for session
SET work_mem = '64MB';

# Update configuration permanently
ALTER SYSTEM SET max_connections = '200';
ALTER SYSTEM SET wal_level = 'replica';
SELECT pg_reload_conf();

# Reset a parameter to default
ALTER SYSTEM RESET shared_buffers;
SELECT pg_reload_conf();
```

### Database Management

```bash
# Create database with custom encoding and locale
CREATE DATABASE mydb
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE 'en_US.UTF-8'
  TEMPLATE template0;

# Rename database (must be single-user mode)
ALTER DATABASE mydb RENAME TO mydb_old;

# Copy database
CREATE DATABASE newdb WITH TEMPLATE mydb;

# Set default tablespace for database
ALTER DATABASE mydb SET TABLESPACE fast_ssd;

# Set schema search path
ALTER DATABASE mydb SET search_path TO app, public;
```

### Monitoring and Diagnostics

```bash
# View currently running queries (excluding idle)
SELECT pid, age(now(), query_start) AS duration,
       state, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

# Find long-running transactions
SELECT pid, age(now(), xact_start) AS duration,
       state, query
FROM pg_stat_activity
WHERE state != 'idle'
  AND xact_start IS NOT NULL
ORDER BY duration DESC
LIMIT 10;

# Track query performance
# Requires pg_stat_statements extension
SELECT queryid, calls, total_exec_time / 1000 AS total_sec,
       mean_exec_time AS avg_ms,
       rows, shared_blks_hit, shared_blks_read,
       ROUND(100.0 * shared_blks_hit /
         NULLIF(shared_blks_hit + shared_blks_read, 0), 2) AS hit_pct
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

# Monitor table bloat
SELECT schemaname, tablename, n_dead_tup,
       n_live_tup,
       ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY n_dead_tup DESC
LIMIT 20;
```

### Backup and Restore

```bash
# Logical backup of single database (custom format)
pg_dump -h localhost -U admin -F c -f /backup/db_20260719.dump mydb

# Logical backup with compression level
pg_dump -h localhost -U admin -F c --compress=9 -f /backup/db_compressed.dump mydb

# Backup only schema (no data)
pg_dump -h localhost -U admin -s -f /backup/schema.sql mydb

# Backup only specific table
pg_dump -h localhost -U admin -t public.orders -f /backup/orders.sql mydb

# Restore custom format dump
pg_restore -h localhost -U admin -d mydb -c /backup/db_20260719.dump

# Restore with parallel jobs (speed up)
pg_restore -h localhost -U admin -d mydb -j 4 -c /backup/db_20260719.dump

# Physical base backup for PITR
pg_basebackup -h localhost -U replicator -D /backup/base_backup -X stream -P

# Export query results to CSV
psql -h localhost -U admin -d mydb -c "\copy (SELECT * FROM orders WHERE created > '2026-01-01') TO '/tmp/orders.csv' CSV HEADER"
```

### Maintenance Operations

```bash
# Aggressive vacuum for heavily updated table
VACUUM (VERBOSE, ANALYZE, INDEX_CLEANUP ON, TRUNCATE ON) orders;

# Analyze specific columns only
ANALYZE users (email, status);

# Update table statistics across all databases
analyzedb -d mydb --all

# Rebuild index to reclaim space
REINDEX INDEX CONCURRENTLY idx_orders_created;
REINDEX TABLE CONCURRENTLY orders;

# Cluster table on an index (re-order physical storage)
CLUSTER orders USING idx_orders_created;

# View autovacuum activity
SELECT schemaname, relname, last_autovacuum,
       last_autoanalyze, n_dead_tup, n_live_tup
FROM pg_stat_user_tables
ORDER BY last_autovacuum NULLS FIRST;

# Check for missing foreign key indexes
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

## Code Snippets

### Extension Management

```sql
-- List installed extensions
SELECT extname, extversion, extrelocatable
FROM pg_extension
ORDER BY extname;

-- Install common extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS uuid_ossp;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Update extension version
ALTER EXTENSION pg_stat_statements UPDATE;

-- View extension member objects
SELECT extname, objtype, objidentity
FROM pg_extension JOIN pg_depend ON refobjid = extname::regclass
WHERE extname = 'pg_stat_statements';
```

### Connection Pooling Pattern (PgBouncer)

```ini
; /etc/pgbouncer/pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Pool settings
pool_mode = transaction
max_client_conn = 500
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3.0

; Timeouts
server_idle_timeout = 300
client_idle_timeout = 0
query_timeout = 30
```

```bash
# Create PgBouncer auth file entry
echo '"app_user" "password123"' >> /etc/pgbouncer/userlist.txt

# PgBouncer admin console commands
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHOW STATS;"
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "RECONNECT;"
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "PAUSE;"
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHUTDOWN;"
```

### Replication Setup Pattern

```bash
# On primary server
# postgresql.conf settings
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1024  # MB
hot_standby = on

# Create replication user
CREATE ROLE replicator WITH LOGIN REPLICATION PASSWORD 'replica_secret';

# On standby server
# Run base backup
pg_basebackup -h primary_host -U replicator -D /var/lib/postgresql/data -X stream -P

# Create standby.signal file in data directory
touch /var/lib/postgresql/data/standby.signal

# postgresql.conf on standby
primary_conninfo = 'host=primary_host port=5432 user=replicator password=replica_secret'
primary_slot_name = 'standby_slot_01'
hot_standby = on
```

```sql
-- Create physical replication slot on primary
SELECT pg_create_physical_replication_slot('standby_slot_01');

-- Monitor replication lag
SELECT pid, application_name, state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn) AS write_lag_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) AS flush_lag_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication;

-- Check if server is a replica
SELECT pg_is_in_recovery();
```

### Point-in-Time Recovery (PITR)

```ini
; postgresql.conf archive settings
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
archive_timeout = 60
wal_level = replica
```

```bash
# Recovery configuration (postgresql.conf)
restore_command = 'cp /var/lib/postgresql/archive/%f %p'
recovery_target_time = '2026-07-19 04:30:00 UTC'
recovery_target_action = 'promote'

# Create recovery signal
touch /var/lib/postgresql/data/recovery.signal
```

### Health Check Queries

```sql
-- Quick health check
SELECT
  pg_is_in_recovery() AS is_replica,
  pg_database_size(current_database()) AS db_bytes,
  (SELECT count(*) FROM pg_stat_activity) AS active_connections,
  (SELECT setting FROM pg_settings WHERE name = 'max_connections') AS max_connections,
  pg_postmaster_start_time AS server_up_since
FROM pg_postmaster_start_time();

-- Check for unhealthy indexes
SELECT schemaname, tablename, indexname, idx_scan,
       idx_tup_read, idx_tup_fetch,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_relation_size(indexrelid) DESC;

-- Disk usage per database
SELECT datname,
       pg_size_pretty(pg_database_size(datname)) AS size,
       pg_database_size(datname) AS size_bytes
FROM pg_database
WHERE datname NOT IN ('template0', 'template1')
ORDER BY size_bytes DESC;

-- Find unused tables
SELECT schemaname, relname, n_tup_ins, n_tup_upd, n_tup_del, n_tup_hot_upd,
       n_live_tup, n_dead_tup, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE idx_scan = 0 AND seq_scan < 100
  AND relname NOT LIKE 'pg_%'
ORDER BY seq_scan;
```

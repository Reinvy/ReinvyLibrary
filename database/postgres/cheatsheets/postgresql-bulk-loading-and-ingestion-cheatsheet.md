---
title: "PostgreSQL Bulk Data Loading and Ingestion Cheatsheet"
description: "Quick reference for COPY, client-side psql loading, MERGE upserts from staging tables, partition attach, atomic swaps, and the session settings that make large loads finish fast."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# PostgreSQL Bulk Data Loading and Ingestion Cheatsheet

Single-row `INSERT` statements are the slowest possible way to move data into PostgreSQL. The fast path is `COPY`, which streams rows through the binary protocol without parsing SQL, and the safe path wraps that load in a staging table plus `MERGE` or an atomic rename. This reference collects the commands, the failure modes, and the settings that matter when a load is measured in millions of rows.

## Quick Reference Table

| Task | Command | Notes |
|------|---------|-------|
| Load a file from your machine | `\copy staging.events FROM 'events.csv' CSV HEADER` | Runs in psql, streams the client file |
| Load a file on the server | `COPY staging.events FROM '/bulk/events.csv' CSV HEADER` | Needs `pg_read_server_files` or superuser |
| Load compressed input | `COPY staging.events FROM PROGRAM 'zcat /bulk/events.csv.gz' CSV HEADER` | Decompresses in flight, no temp file |
| Load from a shell pipe | `gunzip -c events.csv.gz > /tmp/e.csv` then `\copy staging.events FROM '/tmp/e.csv' CSV` | psql meta-commands cannot read a pipe |
| Feed rows from a program | `COPY staging.events FROM STDIN WITH (FORMAT csv)` | Pair with a streaming client |
| Keep going past bad rows | `COPY staging.events FROM '/bulk/e.csv' WITH (FORMAT csv, ON_ERROR ignore)` | PostgreSQL 17 and later |
| See why rows failed | `COPY staging.events FROM '/bulk/e.csv' WITH (FORMAT csv, ON_ERROR ignore, LOG_VERBOSITY verbose)` | Logs context per rejected row |
| Skip WAL for a fresh table | `COPY staging.events FROM STDIN WITH (FREEZE)` | Row visible only if the table was created in the same transaction |
| Watch progress live | `SELECT * FROM pg_stat_progress_copy;` | `tuples_processed`, `bytes_processed` |
| Upsert from staging | `MERGE INTO app.accounts t USING staging.accounts s ON t.account_id = s.account_id ...` | PostgreSQL 15 and later |
| Load a partition then attach | `ALTER TABLE logs ATTACH PARTITION logs_2026_11 FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');` | Skips the validation scan when a matching CHECK exists |
| Drop triggers for the load window | `ALTER TABLE staging.events DISABLE TRIGGER ALL;` | Superuser only, re-enable immediately after |
| Refresh planner statistics | `ANALYZE staging.events;` | A loaded table without stats gets terrible plans |
| Compare source and target | `SELECT count(*), sum(hashtext(id::text)) FROM staging.events;` | Cheap row-count and key fingerprint |

## Common Commands

### Client-Side Loading with psql

```bash
# \copy reads the file on the machine running psql, not on the database host
psql "postgresql://loader@db.internal:5432/appdb" -v ON_ERROR_STOP=1 \
  -c "\copy staging.events (id, occurred_at, actor_id, payload) FROM 'events.csv' CSV HEADER"

# Compressed extracts never need to be decompressed on disk
gunzip -c /data/exports/events-2026-11-01.csv.gz \
  | psql "postgresql://loader@db.internal:5432/appdb" -v ON_ERROR_STOP=1 \
      -c "\copy staging.events FROM STDIN WITH (FORMAT csv, HEADER true)"

# A load that runs for an hour should be wrapped so a dropped connection is obvious
pg_isready -h db.internal -d appdb || exit 1
```

`\copy` is a psql meta-command: it opens the file locally and sends rows over the wire. It is slower than server-side `COPY` for very large files but it works without filesystem access on the database host, which is usually what production credentials allow.

### Server-Side Loading with COPY

```sql
-- The server reads this path as the postgres OS user
COPY staging.events FROM '/bulk/events.csv'
  WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"', NULL '', ENCODING 'UTF8');

-- Grant the narrowest role that makes this possible
GRANT pg_read_server_files TO etl_loader;

-- Load straight into a column list, skipping generated columns
COPY staging.events (id, occurred_at, actor_id, payload)
  FROM '/bulk/events.csv' WITH (FORMAT csv, HEADER true);
```

`PROGRAM` is the escape hatch for compressed files, remote object storage mounted as a path, or a preprocessing script:

```sql
COPY staging.events FROM PROGRAM 'curl -s https://exports.internal/events.csv.gz | zcat'
  WITH (FORMAT csv, HEADER true);
```

Anything `PROGRAM` runs executes as the database server user, so keep the command static and never interpolate untrusted input into it.

### Watching and Recovering a Running Load

```sql
-- Progress view: one row per COPY currently running
SELECT pid,
       relid::regclass AS target,
       command,
       type,
       bytes_processed,
       tuples_processed,
       tuples_excluded
FROM pg_stat_progress_copy;

-- Find a load that is stuck behind a lock
SELECT a.pid, a.wait_event_type, a.wait_event, a.query
FROM pg_stat_activity a
WHERE a.query ILIKE 'COPY%';
```

PostgreSQL 17 lets a load survive bad rows instead of aborting the whole statement:

```sql
COPY staging.events FROM '/bulk/events.csv'
  WITH (FORMAT csv, HEADER true, ON_ERROR ignore, LOG_VERBOSITY verbose);
```

Rejected rows are logged with their line context and the statement still finishes, reporting how many rows failed. Always pair this with a row-count reconciliation — silently dropped rows are the classic ingestion bug.

### Upserting Loaded Rows with MERGE

```sql
MERGE INTO app.accounts AS t
USING staging.accounts AS s
   ON t.account_id = s.account_id
WHEN MATCHED AND s.updated_at > t.updated_at THEN
  UPDATE SET balance = s.balance,
             updated_at = s.updated_at
WHEN NOT MATCHED THEN
  INSERT (account_id, balance, updated_at)
  VALUES (s.account_id, s.balance, s.updated_at);

-- MERGE only sees rows that already committed; the staging table must be
-- populated (and ANALYZEd) before this runs.
ANALYZE staging.accounts;
```

### Partition-Aware Ingestion

```sql
-- Build the partition outside the partitioned table, load it in isolation,
-- then attach: the attach is a catalog change instead of a rewrite
CREATE TABLE logs_2026_11 (
  LIKE logs INCLUDING DEFAULTS INCLUDING CONSTRAINTS
);

COPY logs_2026_11 FROM '/bulk/logs-2026-11.csv' WITH (FORMAT csv, HEADER true);
ANALYZE logs_2026_11;

ALTER TABLE logs ATTACH PARTITION logs_2026_11
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
```

When the new table carries a `CHECK` constraint that mirrors the partition bound, `ATTACH PARTITION` skips the full scan and completes instantly on a large table.

## Code Snippets

### Staging Table Plus Merge Pipeline

```bash
#!/usr/bin/env bash
set -euo pipefail

DSN="postgresql://loader@db.internal:5432/appdb"
FILE="${1:?usage: ingest.sh <csv>}"

psql "$DSN" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
CREATE TEMP TABLE events_stage (LIKE staging.events INCLUDING DEFAULTS) ON COMMIT DROP;
SQL

psql "$DSN" -v ON_ERROR_STOP=1 -c "\copy events_stage FROM '$FILE' WITH (FORMAT csv, HEADER true)"

psql "$DSN" -v ON_ERROR_STOP=1 <<'SQL'
MERGE INTO staging.events AS t
USING (SELECT DISTINCT ON (id) * FROM events_stage ORDER BY id, occurred_at DESC) AS s
   ON t.id = s.id
WHEN MATCHED THEN
  UPDATE SET occurred_at = s.occurred_at, actor_id = s.actor_id, payload = s.payload
WHEN NOT MATCHED THEN
  INSERT (id, occurred_at, actor_id, payload)
  VALUES (s.id, s.occurred_at, s.actor_id, s.payload);
ANALYZE staging.events;
SQL
```

A temporary table keeps the staging rows off the WAL path beyond the session, and `DISTINCT ON` collapses duplicate keys so `MERGE` never hits a "cannot affect row a second time" error.

### Atomic Swap for Full Reference Refreshes

```sql
BEGIN;

CREATE TABLE ref_countries_new (LIKE ref_countries INCLUDING ALL);
COPY ref_countries_new FROM '/bulk/countries.csv' WITH (FORMAT csv, HEADER true);

-- LIKE does not copy indexes; recreate them before the swap so the
-- table never goes live without its unique key
CREATE UNIQUE INDEX ref_countries_new_iso2_key ON ref_countries_new (iso2);

ANALYZE ref_countries_new;

ALTER TABLE ref_countries RENAME TO ref_countries_old;
ALTER TABLE ref_countries_new RENAME TO ref_countries;

COMMIT;

DROP TABLE ref_countries_old;
```

Readers either see the old table or the new one, never a half-loaded mix. Views and foreign keys must be checked before adopting this pattern — renaming a table that an FK points at means the FK follows the old table.

### Session Tuning for a Load Window

```sql
BEGIN;

-- Index maintenance is the dominant cost when loading into an indexed table
SET LOCAL maintenance_work_mem = '2GB';

-- Recent commits may be lost in a crash during this window; the staging
-- table is rebuildable, so the trade is deliberate
SET LOCAL synchronous_commit = off;

-- Smaller WAL footprint for repeated systems of the same row
SET LOCAL wal_compression = on;

COPY staging.events FROM '/bulk/events-2026-11.csv' WITH (FORMAT csv, HEADER true);

COMMIT;

ANALYZE staging.events;
```

The bigger win for large loads is usually dropping indexes, loading, then rebuilding: three passes over a table build a B-tree far faster than a million individual inserts into an existing one.

```sql
DROP INDEX IF EXISTS staging.events_actor_idx;
COPY staging.events FROM '/bulk/events-2026-11.csv' WITH (FORMAT csv, HEADER true);
CREATE INDEX events_actor_idx ON staging.events (actor_id);
```

### Parallel File Loading

```bash
# Split a large extract, then load the shards concurrently.
# Keep the parallelism at or below the number of write paths the storage
# can sustain; more workers only add contention.
split -l 500000 -d --additional-suffix=.csv /data/events.csv /data/events-part-

ls /data/events-part-*.csv | xargs -P 4 -I{} sh -c \
  'psql "postgresql://loader@db.internal:5432/appdb" -v ON_ERROR_STOP=1 \
     -c "\copy staging.events FROM STDIN WITH (FORMAT csv, HEADER true)" < "{}"'
```

### Verifying a Completed Load

```sql
-- Row count and a cheap fingerprint; compare both against the extract
SELECT count(*)                                   AS rows_loaded,
       count(*) FILTER (WHERE id IS NULL)         AS missing_keys,
       count(DISTINCT id)                         AS distinct_keys,
       sum(hashtext(id::text))                    AS key_fingerprint
FROM staging.events;

-- Range sanity check: the load window should match the file's date range
SELECT min(occurred_at), max(occurred_at) FROM staging.events;

-- Refresh statistics before anything reads the table
ANALYZE staging.events;
```

A fingerprint mismatch almost always means one of three things: a truncated file, a `HEADER` flag that was missed so the first row was parsed as data, or an `ON_ERROR ignore` run that quietly dropped rows.

---
title: "PostgreSQL Zero-Downtime Schema Migrations Guide"
description: "A practical guide to evolving PostgreSQL schemas on live systems — lock-aware DDL, concurrent index builds, NOT VALID constraints, batched backfills, expand-contract column changes, and online table rewrites with pg_repack."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# PostgreSQL Zero-Downtime Schema Migrations Guide

## Introduction

Almost every production outage blamed on "the database was slow" can be traced back to a schema change. PostgreSQL protects the structure of a table with a single heavyweight lock — `ACCESS EXCLUSIVE` — and that lock does not care whether your change takes one millisecond or ten minutes: while it is held, every read and write on that table waits. Worse, PostgreSQL queues locks in order, so one slow migration does not just block the table, it builds a queue of ordinary application queries behind it until the connection pool is exhausted.

Zero-downtime migration is the discipline of designing every schema change so that it:

- holds heavyweight locks for only milliseconds, never for the duration of a scan or rewrite;
- never triggers a full table rewrite or a full index rebuild on a busy table;
- can be deployed while the previous version of the application is still running, and rolled back to it without a data migration.

That last constraint is the one teams forget. A migration is not "the SQL file that runs at deploy time" — it is a sequence of steps spread across several application releases, each one safe on its own. The pattern that makes this possible is called **expand-contract** (also known as parallel change): add the new shape alongside the old, move traffic over gradually, then remove the old shape once nothing reads it. Because every intermediate state is valid for both the old and the new code, you can deploy, verify, pause, or roll back at any point.

The most useful mental model is the lock queue. Consider a five-minute analytics query and a migration that only touches the catalog:

```text
Time ─────────────────────────────────────────────────────────────▶

Client A (analytics query)  : |==================================|   5 min
Client B (ALTER TABLE)      :      x  waiting for ACCESS EXCLUSIVE
Client C (web write)        :        x  queued behind B
Client D (web read)         :          x  queued behind B
Client E (health check)     :            x  queued behind B  → timeout

                                 ^
                                 B holds no data lock it can use — but every
                                 later query parks behind B regardless.
```

The migration is fast. The *outage* comes from the barrier it creates. Every technique in this guide exists to keep that barrier short: issue the DDL with a `lock_timeout` so it fails fast instead of queueing, avoid rewrites entirely, and move heavy data work into batches that hold no blocking lock at all.

This guide covers PostgreSQL 11 through 17; version-specific capabilities are called out where they matter (notably the fast `ADD COLUMN ... DEFAULT` and `SET NOT NULL` paths added in 11 and 12).

## Best Practices

### 1. Never Mix Schema and Data Changes in One Transaction

A migration that adds a column, backfills two million rows, and then adds a constraint runs as one transaction holding locks on the table for the entire backfill. Split it: schema change first (fast, seconds), backfill later (batched, incremental, no blocking lock), constraint last with `NOT VALID` followed by `VALIDATE`. Each phase is independently deployable and independently observable.

### 2. Set `lock_timeout` on Every Migration Session

The deadliest migration is the one that *would have been* fast if nothing else were running. A migration that waits silently for a lock is indistinguishable from an outage in progress. Set `lock_timeout` to a few hundred milliseconds so the statement fails immediately if the table is busy; retry a moment later. Failing fast is a feature.

### 3. Build Indexes Concurrently, Always

`CREATE INDEX` takes a `SHARE` lock that blocks all writes for the whole build. On a table with ten million rows that is minutes of rejected inserts. `CREATE INDEX CONCURRENTLY` builds in two passes without blocking writes, at the cost of being slower and unable to run inside a transaction. On any table that receives writes, there is no reason to use the blocking form.

### 4. Add Check Constraints as `NOT VALID` First

`ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)` validates every existing row while holding an `ACCESS EXCLUSIVE` lock. Adding it with `NOT VALID` completes in milliseconds: new rows are checked, existing rows are not scanned. A later `VALIDATE CONSTRAINT` does the scan under a much weaker `SHARE UPDATE EXCLUSIVE` lock, which does not block reads or writes.

### 5. Backfill in Batches with a Bounded Transaction

A single `UPDATE` over the whole table holds row locks on every touched row, bloats the table, and can flood replication. Backfill in chunks of a few thousand rows, committing between batches. Each batch is short, autovacuum can keep up, and standbys never fall behind by more than a moment. Always include a `LIMIT` and an ordering key, and make the batch loop idempotent so a retry is harmless.

### 6. Follow Expand-Contract for Renames, Drops, and Type Changes

Application code and database schema deploy at different moments, and during that window both versions are live. Renaming a column breaks the old code; dropping one breaks it too. Instead: add the new column, dual-write to both, backfill, switch reads, stop writing the old one, and drop it a release later. The same reasoning applies to splitting a table, changing a type, and normalizing a JSON blob into columns.

### 7. Use `pg_repack` When a Rewrite Is Unavoidable

Some changes genuinely require a table rewrite: changing a column type in a non-binary-compatible way, reordering columns, or reclaiming space after a large delete. `pg_repack` performs the rewrite into a new physical table using triggers (or a logical-replication-based approach in its newer modes) while the original stays fully writable, then swaps the two in a brief `ACCESS EXCLUSIVE` transaction. Reserve it for changes with no catalog-only path.

### 8. Make Every Migration Backward Compatible for One Release

A migration is only safe if the currently deployed code keeps working after it runs. That means: no drops in the same release that stops using a column, no `NOT NULL` until every writer supplies a value, no renamed columns until the last reader is gone. Keep a one-release buffer — the cost is a small amount of dead weight, the benefit is that any deploy can be rolled back without a database change.

### 9. Test Migrations Against Production-Sized Data

A migration that takes 40 milliseconds on a developer laptop with 5,000 rows can take 40 minutes on 50 million rows — the scaling is not linear once indexes, TOAST tables, and WAL generation are involved. Restore a recent production snapshot into staging, run the migration there with production-like concurrency, and measure lock waits with `pg_locks`. Treat the migration's runtime as a release criterion.

### 10. Monitor Locks, WAL, and Replication Throughout the Rollout

Run migrations with an operator watching three signals: the blocked-query count (`pg_locks` joined to `pg_stat_activity`), replication lag on standbys, and table bloat from backfills. If blocking sessions appear, you want to terminate them deliberately rather than discover them through application timeouts. Automate an abort: if lock waits exceed a threshold, cancel the migration and revert.

### 11. Version Migrations in Git and Apply Them Exactly Once

Use a migration tool (Flyway, Liquibase, Alembic, `dbmate`, `golang-migrate`, or a hand-rolled runner with a `schema_migrations` ledger) rather than executing SQL by hand. Record each migration's checksum so that an edited file is detected rather than silently skipped, and make the runner acquire an advisory lock so two deploy workers cannot race the same migration.

## Implementation Steps

### Step 1: Establish a Migration Ledger and Runner

The ledger is what makes migrations repeatable. Keep a dedicated schema for it, separate from application data, and record enough metadata to debug a failed rollout after the fact.

```sql
CREATE SCHEMA IF NOT EXISTS migration;

CREATE TABLE IF NOT EXISTS migration.schema_migrations (
  version        text        PRIMARY KEY,
  description    text        NOT NULL,
  checksum       text        NOT NULL,
  applied_at     timestamptz NOT NULL DEFAULT now(),
  execution_ms   integer     NOT NULL,
  applied_by     text        NOT NULL DEFAULT current_user
);

-- Serialize deploys: only one migration may run at a time per database.
-- 0x5F1A9C3D is an arbitrary application-specific key.
SELECT pg_advisory_lock(0x5F1A9C3D);
```

Every migration runs inside this advisory lock. If two deployment workers start simultaneously, the second blocks instead of racing the first, and the ledger's primary key catches any duplicate version that slips through anyway.

### Step 2: Wrap Every Migration in a Lock-Aware Session

Never let a migration sit and wait for a lock. A short `lock_timeout` makes a blocked migration fail loudly in under a second, and `statement_timeout` bounds the total work so a runaway `UPDATE` cannot occupy a connection indefinitely.

```sql
BEGIN;

-- Fail rather than queue: 750ms is plenty for a catalog-only change.
SET LOCAL lock_timeout = '750ms';
SET LOCAL statement_timeout = '5s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

ALTER TABLE app.orders ADD COLUMN IF NOT EXISTS channel text;

INSERT INTO migration.schema_migrations (version, description, checksum, execution_ms)
VALUES ('2026_10_15_0001', 'add orders.channel', 'sha256:…', 0);

COMMIT;
```

Roll the retry logic into the runner rather than into the SQL: catching `55P03` (`lock_not_available`) and retrying with jittered backoff is far safer than raising the timeout, because raising it re-introduces the lock queue the timeout exists to prevent.

```python
import time, random, psycopg

LOCK_NOT_AVAILABLE = "55P03"

def apply_with_retry(conn, sql, attempts=8, base_delay=0.25):
    for attempt in range(attempts):
        try:
            with conn.transaction():
                conn.execute(sql)
            return
        except psycopg.errors.LockNotAvailable:
            if attempt == attempts - 1:
                raise
            # Exponential backoff with jitter so parallel deploys do not collide.
            time.sleep(base_delay * (2 ** attempt) + random.uniform(0, 0.2))
```

### Step 3: Add Columns Without Rewriting the Table

Adding a nullable column is a catalog-only operation. Adding one with a constant default is also catalog-only on PostgreSQL 11 and later, because the default is stored once in `pg_attribute` and materialized on read. On PostgreSQL 10 and earlier the same statement rewrites the entire table — check the server version before assuming.

```sql
-- Fast on PostgreSQL 11+: catalog-only, milliseconds regardless of row count.
ALTER TABLE app.orders
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'web';

-- Slow everywhere: a volatile default cannot be stored in the catalog,
-- so PostgreSQL must evaluate it for every existing row.
ALTER TABLE app.orders
  ADD COLUMN IF NOT EXISTS created_bucket uuid DEFAULT gen_random_uuid();
```

For the volatile-default case, use the expand-contract path instead: add the column without a default, backfill in batches, then attach the default for new rows only.

### Step 4: Build and Drop Indexes Concurrently

`CREATE INDEX CONCURRENTLY` performs two table scans and two short waits, rather than one long blocking build. Two rules matter: it cannot run inside a transaction block, and if it fails it leaves an `INVALID` index behind that still consumes write overhead and must be dropped and rebuilt.

```sql
-- Run outside a transaction (no BEGIN/COMMIT). Writes continue throughout.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_channel_created
  ON app.orders (channel, created_at DESC);

-- A failed concurrent build leaves an index that is present but unusable.
SELECT c.relname, i.indisvalid, i.indisready
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
WHERE NOT i.indisvalid;

-- Clean up before retrying — the broken index still taxes every write.
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_channel_created;
```

Dropping an index is catalog-only and quick, but it still needs a lock; use `DROP INDEX CONCURRENTLY` on busy tables so it does not wait behind long queries. One caveat: building concurrently generates more WAL and takes longer overall, so schedule it during a low-traffic window even though it is non-blocking.

### Step 5: Backfill in Bounded Batches

The batch loop is where most accidental outages happen. Keyset pagination on a stable key, a `LIMIT`, and a commit per batch keep each transaction short and let autovacuum and replication keep pace.

```sql
-- One batch. Repeat until the UPDATE reports 0 rows.
-- Keyset pagination (id > $last_id) avoids the O(n^2) cost of OFFSET.
WITH batch AS (
  SELECT id
  FROM app.orders
  WHERE channel IS NULL
  ORDER BY id
  LIMIT 5000
  FOR UPDATE SKIP LOCKED
)
UPDATE app.orders o
SET channel = 'web'
FROM batch
WHERE o.id = batch.id;
```

```bash
# Drive the loop from the shell during the rollout window.
# 200ms between batches throttles WAL generation on standbys.
last_id=0
while true; do
  updated=$(psql -At -c "WITH batch AS (
      SELECT id FROM app.orders
      WHERE id > ${last_id} AND channel IS NULL
      ORDER BY id LIMIT 5000 FOR UPDATE SKIP LOCKED
    )
    UPDATE app.orders o SET channel = 'web'
    FROM batch WHERE o.id = batch.id
    RETURNING 1" | wc -l)
  echo "batch updated=${updated}"
  [ "$updated" -eq 0 ] && break
  last_id=$(psql -At -c "SELECT COALESCE(max(id), 0) FROM app.orders WHERE channel IS NOT NULL")
  sleep 0.2
done
```

Add a small sleep between batches and watch replica lag while it runs. If lag grows, increase the sleep rather than the batch size — total throughput matters less than keeping standbys current.

### Step 6: Attach Constraints as `NOT VALID`, Then Validate

Adding a check constraint the naive way scans the table under `ACCESS EXCLUSIVE`. Split it in two so the expensive half runs under a lock that permits reads and writes.

```sql
-- Phase 1: milliseconds. Applies to new rows only; no scan, no long lock.
ALTER TABLE app.orders
  ADD CONSTRAINT orders_channel_known
  CHECK (channel IN ('web', 'ios', 'android', 'partner')) NOT VALID;

-- Phase 2: scans existing rows under SHARE UPDATE EXCLUSIVE.
-- Reads and writes continue normally for the whole scan.
ALTER TABLE app.orders VALIDATE CONSTRAINT orders_channel_known;
```

Validation is idempotent and resumable-by-retry: if it is cancelled, the constraint simply stays `NOT VALID` and the application is unaffected. Query `pg_constraint.convalidated` to confirm the state before proceeding to the next step.

### Step 7: Enforce `NOT NULL` Without a Long Lock

`ALTER COLUMN ... SET NOT NULL` requires a full table scan under `ACCESS EXCLUSIVE` — unless an already-valid `CHECK` constraint proves no NULLs exist, in which case PostgreSQL 12 and later skips the scan entirely. That is the trick: create a `NOT VALID` check, validate it, then set `NOT NULL`, then drop the now-redundant check.

```sql
-- 1. Cheap: no scan.
ALTER TABLE app.orders
  ADD CONSTRAINT orders_channel_not_null CHECK (channel IS NOT NULL) NOT VALID;

-- 2. Scan under a weak lock; the table stays writable.
ALTER TABLE app.orders VALIDATE CONSTRAINT orders_channel_not_null;

-- 3. PostgreSQL 12+ sees the validated proof and skips its own scan.
ALTER TABLE app.orders ALTER COLUMN channel SET NOT NULL;

-- 4. The proof has served its purpose; drop the check.
ALTER TABLE app.orders DROP CONSTRAINT orders_channel_not_null;

-- 5. Attach the default for future inserts (catalog-only).
ALTER TABLE app.orders ALTER COLUMN channel SET DEFAULT 'web';
```

Verify the fast path was actually taken by watching the migration's duration — if step 3 takes seconds on a large table, the proof was not recognized (usually because the check constraint was missing or was created as a different expression) and the scan ran instead.

### Step 8: Perform an Online Table Rewrite with pg_repack

For changes with no catalog-only path — altering a column type incompatibly, changing storage, or reclaiming space after bulk deletes — `pg_repack` rewrites the table online.

```bash
# install: apt-get install postgresql-17-repack  (or the matching version)
# Requires the pg_repack extension in the target database.
psql -c "CREATE EXTENSION IF NOT EXISTS pg_repack"

# Rebuild a single bloated table, online. Writes continue throughout;
# the final swap takes an ACCESS EXCLUSIVE lock for a few milliseconds.
pg_repack --dbname app_production \
          --table app.orders \
          --jobs 4 \
          --wait-timeout 60 \
          --echo
```

`--wait-timeout` is the safety valve: rather than queue behind a long query at swap time, `pg_repack` gives up and can be retried later. Size `--jobs` conservatively on primary databases — each job is a parallel worker generating WAL that standbys must replay.

### Step 9: Complete a Column Rename with Expand-Contract

Renames are the canonical backward-compatibility problem: the moment the column is renamed, code deployed before the change fails. Spread the rename across four releases so every state is compatible with what is running.

```sql
-- Release 1 (EXPAND): add the new column. Old code keeps using the old one.
SET LOCAL lock_timeout = '750ms';
ALTER TABLE app.orders ADD COLUMN IF NOT EXISTS fulfilment_status text;

-- Backfill from the old column in batches (see Step 5).
-- Release 2 (DUAL-WRITE): application writes both columns; reads still use old.
CREATE OR REPLACE VIEW app.orders_compat AS
  SELECT o.*, COALESCE(o.fulfilment_status, o.status) AS effective_status
  FROM app.orders o;

-- Release 3 (SWITCH READS): application reads the new column.
-- Release 4 (CONTRACT): stop writing the old column, then drop it.
ALTER TABLE app.orders DROP COLUMN IF EXISTS status;
```

Keep a compatibility view in place during releases 2 and 3 so read-only consumers (dashboards, analytics jobs, replica-based services) can migrate on their own schedule rather than in lockstep with the application deploy.

### Step 10: Verify the Result and Automate the Pipeline

A migration is not finished until the schema, the constraints, and the planner statistics are all consistent — and the check belongs in the deployment pipeline, not in an engineer's memory.

```sql
-- Confirm no half-finished work survived the rollout.
SELECT c.relname, i.indisvalid
FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
WHERE NOT i.indisvalid;

SELECT conname, convalidated
FROM pg_constraint
WHERE conrelid = 'app.orders'::regclass AND NOT convalidated;

-- The new column needs statistics or the planner will guess badly.
ANALYZE app.orders;

-- Verify the new index is actually being used.
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, channel FROM app.orders
WHERE channel = 'ios' ORDER BY created_at DESC LIMIT 50;
```

```bash
# Pipeline gate: run the same checks before promoting a deploy,
# and fail the build if any invalidity remains.
psql -At -f sql/verify_schema.sql | tee /tmp/verify.out
if grep -q "INVALID\|NOT_VALIDATED" /tmp/verify.out; then
  echo "Schema verification failed — blocking deploy" >&2
  exit 1
fi
```

Two more pipeline rules pay for themselves immediately. First, run migrations as a separate job *before* the application deploy, never inside the application start-up path — otherwise a slow migration stalls every new pod. Second, keep every migration backward compatible for exactly one release, and add a lint rule (or a reviewer checklist item) that rejects `ALTER TABLE ... DROP COLUMN` and `SET NOT NULL` in the same release that introduces their replacement.

## Conclusion

Zero-downtime schema migration is less about exotic technique than about sequencing. Almost every heavyweight operation in PostgreSQL has a two-phase equivalent — index builds have `CONCURRENTLY`, constraints have `NOT VALID` plus `VALIDATE`, `NOT NULL` has the checked-proof shortcut, and destructive changes have expand-contract — and every one of them follows the same shape: do the cheap, catalog-only part while the table stays writable, then do the expensive part under a lock that permits concurrent activity.

The failure mode this guide is written against is not a slow migration but a blocked queue. A statement that waits for a lock is worse than a statement that fails, because it converts one slow query into an outage for every client of that table. Set `lock_timeout`, let the migration fail, and retry — the retry costs milliseconds, the queue costs an incident.

Adopt the practices in order of payoff: lock timeouts and concurrent index builds first (they eliminate the most common outages outright), then `NOT VALID` constraints, then batched backfills, and finally expand-contract as a standing habit for anything destructive. Add schema verification to the deployment pipeline so a half-applied migration can never reach production unnoticed, and keep a one-release compatibility buffer so that any deploy can be rolled back with `git revert` instead of a data migration.

---
title: "GitHub Actions Database Migration Pipeline Tutorial"
description: "Build a production-safe schema migration pipeline in GitHub Actions using the expand-and-contract pattern, serialized runs, rehearsal checks, approval gates, and forward-only rollback plans."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# GitHub Actions Database Migration Pipeline Tutorial

## Summary

Application deploys are easy to roll back; schema changes usually are not. This tutorial builds a migration pipeline that runs schema changes as their own gated workflow: expand-phase DDL first, a batched backfill second, and a contract step released only after the old application version is gone. By the end you will have a workflow that serializes concurrent migration attempts, proves the plan against a rehearsal database, requires human approval for destructive statements, and leaves a verifiable record of every migration that ran.

## Target Audience

- DevOps and platform engineers who already own a CI/CD pipeline and now need to change production schemas through it.
- Backend engineers responsible for schema evolution on a relational database with zero planned downtime.
- Advanced level: you should be comfortable reading workflow YAML, writing `psql` against a real database, and reasoning about transactions and locks.

## Prerequisites

- A GitHub repository with Actions enabled and at least one database-backed service.
- A PostgreSQL database you can reach from CI, plus a separate rehearsal or staging database that can be reset at will.
- Repository or organization secrets for the connection strings, for example `DATABASE_URL` and `REHEARSAL_DATABASE_URL`.
- A GitHub Environment named `production-db` with required reviewers configured.
- Basic familiarity with SQL DDL (`ALTER TABLE`, `CREATE INDEX`), transactions, and advisory locks.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Structure a migration pipeline that deploys schema and application code in a safe order.
- Apply the expand-and-contract pattern so that two application versions can run against one schema.
- Serialize migrations with workflow concurrency groups and database advisory locks.
- Rehearse a migration against a throwaway database and gate destructive statements behind approvals.
- Design a forward-only rollback plan with batching, timeouts, and point-in-time recovery as the real safety net.

## Context and Motivation

Most teams start by running migrations as the first step of the deploy job. It works until the day a migration takes a table lock for forty seconds while traffic is still arriving, or until a rollback restores the old application code but not the old schema. The failure is almost never the SQL itself; it is the ordering, the locking, and the absence of a rehearsal step.

A dedicated migration pipeline fixes the structural problems:

- Schema changes get their own workflow, their own approvals, and their own audit trail, instead of hiding inside a deploy log.
- Additive changes ship ahead of the code that needs them, so no request ever hits a schema it does not understand.
- Concurrent runs cannot race each other, which matters when two merges land within a minute of each other.
- Destructive statements require a human decision and a fresh backup, not a green CI run.

The result is a pipeline where the risky part of a release is planned, observed, and reversible through data recovery rather than through guesswork.

## Core Content

### Why Schema Changes Break Deployments

Three properties of relational databases make migrations behave differently from application releases.

- DDL takes locks. An `ALTER TABLE` needs an `ACCESS EXCLUSIVE` lock in PostgreSQL, which queues behind open transactions and blocks every query that arrives after it. A migration that waits five seconds for its lock is a five-second outage for the table, even if the DDL itself is instant.
- Deploys are gradual. During a rolling deploy, old and new application versions serve traffic at the same time. Any schema that only the new code understands will break the old code still running.
- Rollback is asymmetric. Redeploying the previous container image takes a minute. Dropping a column that the previous image still selects from takes the same minute, but the data is gone.

The pipeline in this tutorial addresses each property: lock-aware migrations, additive-first ordering, and a rollback plan that never depends on reversing DDL.

### The Expand and Contract Pattern

Every schema change is split into three separately deployable phases.

- **Expand**: additive DDL only. New nullable columns, new tables, new indexes created concurrently. The old application version ignores them and keeps working.
- **Migrate**: the application starts writing to both the old and new structures, and a backfill job fills history in batches.
- **Contract**: once no running version references the old structure, a later release drops it, adds the `NOT NULL` constraint, and renames anything that needs renaming.

The invariant is simple: at every point in time, the schema is a superset of what any deployed application version needs. This is what makes a rolling deploy and a schema change compatible.

```text
Release 1  app v1  +  expand   (add column, backfill starts)
Release 2  app v2  +  dual-write (v2 writes both, still reads old)
Release 3  app v3  +  switch reads to new column
Release 4  app v3  +  contract (drop old column, add NOT NULL)
```

Each row is independently deployable and independently reversible, because nothing is removed until it has been unused for one full release cycle.

### Separating the Migration Workflow From the Deploy Workflow

Migrations live in their own workflow file triggered on `workflow_dispatch` and on pushes to the migration directory. The deploy workflow calls it through `workflow_call` and waits for success before shipping application code.

This separation gives three properties that an inline migration step cannot: the migration job can carry a stricter environment with required reviewers, it can be re-run without rebuilding images, and its logs stand alone as the record of what changed in production.

Two rules make the ordering safe:

- The migration workflow never runs two phases in one job. Expand and contract are separate dispatches with a real release in between.
- The deploy workflow consumes the migration result, not the other way around. Application code that needs a new column is only deployable after the expand migration succeeded.

### Serializing Migrations With Concurrency Groups and Advisory Locks

Workflow concurrency groups serialize runs of the same workflow, but they do not protect against a migration run from a laptop or a second workflow file. Add a database-level lock inside the migration runner so the guarantee holds regardless of who starts the process.

Two mechanisms, layered:

- `concurrency: group: db-migrations-production, cancel-in-progress: false` in the workflow, so queued runs wait instead of cancelling each other mid-transaction.
- `pg_advisory_lock(<key>)` at the start of the runner, so any second process blocks or exits rather than interleaving DDL.

Cancelling a run in the middle of a migration is the worst outcome available: the DDL may have committed while the ledger write did not. `cancel-in-progress: false` prevents the workflow from doing that, and the advisory lock covers everything outside the workflow.

### Proving a Migration Is Safe Before It Touches Production

Rehearsal is not optional for destructive or table-rewriting changes. A rehearsal job restores a recent production dump into the rehearsal database, runs the pending migrations, and measures what actually happened.

Check four things before the production job is allowed to start:

- **Drift and ledger**: the migration tool reports the same applied set and checksums as production, so you are not shipping a migration that was edited after it ran.
- **Lock behaviour**: every statement runs with `lock_timeout` and `statement_timeout` set, so a blocked DDL aborts instead of stalling the table.
- **Duration**: the rehearsal timing decides the maintenance window. A backfill that takes forty minutes in rehearsal cannot be squeezed into a two-minute deploy job.
- **Query plans**: for new indexes and rewritten queries, run `EXPLAIN (ANALYZE, BUFFERS)` on the rehearsal database to confirm the planner uses the new index.

Production applies the same statements with the same timeouts, so a rehearsal failure is a real failure rather than a rehearsal-only artifact.

### Making Destructive Changes Reversible

Migrations are forward-only in this pipeline. Reversal happens through three separate mechanisms, in order of preference:

- **Feature flags**: switch application behaviour back without touching the schema. This is the fastest and most common rollback and requires no database operation at all.
- **Additive compensation**: ship a new forward migration that restores or repopulates what was removed, using the backup table the contract step created rather than a restored dump.
- **Point-in-time recovery**: the last resort, chosen when data was destroyed and no backup table exists. It is the reason the pipeline requires a verified backup before any contract migration runs.

The contract phase is deliberately delayed. Nothing is dropped in the same release that stopped writing to it, so a rollback within one release cycle never needs to recreate a schema object.

## Code Examples

### Complete Migration Workflow

The workflow below runs the expand phase, checks it against rehearsal, then applies it to production behind the `production-db` environment.

```yaml
# .github/workflows/db-migrate.yml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      phase:
        description: "expand | backfill | contract"
        required: true
        default: "expand"
        type: choice
        options: [expand, backfill, contract]
      migration_set:
        description: "Directory of pending migrations to apply"
        required: true
        default: "migrations/pending"
  workflow_call:
    inputs:
      phase:
        required: true
        type: string
      migration_set:
        required: true
        type: string

concurrency:
  group: db-migrations-production
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  rehearsal:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4

      - name: Restore latest production dump into rehearsal
        env:
          REHEARSAL_DATABASE_URL: ${{ secrets.REHEARSAL_DATABASE_URL }}
        run: |
          set -euo pipefail
          ./scripts/db/restore-latest-dump.sh
          psql "$REHEARSAL_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select version();"

      - name: Check drift against the migration ledger
        env:
          DATABASE_URL: ${{ secrets.REHEARSAL_DATABASE_URL }}
        run: ./scripts/db/migrate.sh --check-drift --dir "${{ inputs.migration_set }}"

      - name: Apply migrations to rehearsal and time them
        env:
          DATABASE_URL: ${{ secrets.REHEARSAL_DATABASE_URL }}
          LOCK_TIMEOUT_MS: "3000"
          STATEMENT_TIMEOUT_MS: "600000"
        run: |
          set -euo pipefail
          /usr/bin/time -f "rehearsal_duration_seconds=%e" \
            ./scripts/db/migrate.sh --apply --dir "${{ inputs.migration_set }}"

      - name: Fail on planner regressions for new indexes
        env:
          DATABASE_URL: ${{ secrets.REHEARSAL_DATABASE_URL }}
        run: ./scripts/db/verify-plans.sh

  production:
    needs: rehearsal
    runs-on: ubuntu-latest
    timeout-minutes: 45
    environment: production-db
    steps:
      - uses: actions/checkout@v4

      - name: Require a verified backup before contract migrations
        if: inputs.phase == 'contract'
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: ./scripts/db/require-fresh-backup.sh --max-age-minutes 180

      - name: Apply migration set
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          PHASE: ${{ inputs.phase }}
          LOCK_TIMEOUT_MS: "3000"
          STATEMENT_TIMEOUT_MS: "300000"
        run: ./scripts/db/migrate.sh --apply --dir "${{ inputs.migration_set }}"

      - name: Record the applied set in the run summary
        if: always()
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: ./scripts/db/migrate.sh --status >> "$GITHUB_STEP_SUMMARY"
```

### Guarded Migration Runner

The runner takes the advisory lock, applies timeouts, and writes to an append-only ledger so a partially applied set is visible in the next run.

```javascript
// scripts/db/migrate.js — invoked by scripts/db/migrate.sh
const { Client } = require('pg');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const LOCK_KEY = 918273645; // stable per database, not per migration
const dir = process.argv[2];
const apply = process.argv.includes('--apply');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Fail fast instead of queueing behind a long DDL on the same tables.
    await client.query(`SET lock_timeout = '${process.env.LOCK_TIMEOUT_MS || 3000}ms'`);
    await client.query(`SET statement_timeout = '${process.env.STATEMENT_TIMEOUT_MS || 300000}ms'`);

    const lock = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [LOCK_KEY]);
    if (!lock.rows[0].acquired) {
      console.error('Another migration run holds the advisory lock; refusing to proceed.');
      process.exit(3);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_ledger (
        filename    text PRIMARY KEY,
        checksum    text NOT NULL,
        applied_at  timestamptz NOT NULL DEFAULT now(),
        duration_ms integer NOT NULL
      )
    `);

    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    const applied = new Map(
      (await client.query('SELECT filename, checksum FROM schema_ledger')).rows.map((r) => [
        r.filename,
        r.checksum,
      ]),
    );

    for (const file of files) {
      const sql = await fs.readFile(path.join(dir, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');

      if (applied.has(file)) {
        if (applied.get(file) !== checksum) {
          throw new Error(`${file} was modified after it was applied — checksum mismatch`);
        }
        continue;
      }

      if (!apply) {
        console.log(`[dry-run] would apply ${file}`);
        continue;
      }

      const startedAt = Date.now();
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_ledger (filename, checksum, duration_ms) VALUES ($1, $2, $3)',
          [file, checksum, Date.now() - startedAt],
        );
        await client.query('COMMIT');
        console.log(`applied ${file} in ${Date.now() - startedAt}ms`);
      } catch (error) {
        await client.query('ROLLBACK');
        // 55P03 = lock_not_available: the DDL waited past lock_timeout.
        if (error.code === '55P03') {
          console.error(`${file} could not acquire its lock in time; retry in an off-peak window.`);
        }
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock_all()').catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

### Expand Migration

Additive only: a nullable column, an index built without blocking writes, and a trigger that keeps the new column current while the backfill catches up.

```sql
-- migrations/pending/0001_expand_orders_add_currency_code.sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS currency_code char(3);

-- CONCURRENTLY cannot run inside a transaction; the runner detects this and
-- autocommits index builds rather than wrapping them in BEGIN/COMMIT.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_currency_code
  ON orders (currency_code)
  WHERE currency_code IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_orders_currency_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.currency_code IS NULL THEN
    NEW.currency_code := COALESCE(NEW.currency, 'USD');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_currency_code ON orders;
CREATE TRIGGER trg_orders_currency_code
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_orders_currency_code();
```

### Batched Backfill

Backfill in bounded batches so replication lag and lock pressure stay predictable, and stop cleanly when the remaining rows are small enough to finish in one pass.

```javascript
// scripts/db/backfill-currency-code.js
const { Client } = require('pg');

const BATCH_SIZE = 5000;
const SLEEP_MS = 200;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(`SET statement_timeout = '120s'`);

    for (;;) {
      const { rowCount } = await client.query(
        `UPDATE orders
            SET currency_code = COALESCE(currency, 'USD')
          WHERE id IN (
            SELECT id FROM orders
             WHERE currency_code IS NULL
             ORDER BY id
             LIMIT $1
             FOR UPDATE SKIP LOCKED
          )`,
        [BATCH_SIZE],
      );

      console.log(`backfilled ${rowCount} rows`);
      if (rowCount < BATCH_SIZE) break;
      await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

### Contract Migration After the Release

The contract run happens in a later release, after the code that reads `orders.currency` is fully gone. It keeps the old data in a backup table instead of discarding it.

```sql
-- migrations/pending/0100_contract_orders_currency.sql
CREATE TABLE IF NOT EXISTS orders_currency_archive AS
  SELECT id, currency FROM orders;

ALTER TABLE orders
  ALTER COLUMN currency_code SET DEFAULT 'USD';

ALTER TABLE orders
  ALTER COLUMN currency_code SET NOT NULL;

DROP TRIGGER IF EXISTS trg_orders_currency_code ON orders;
DROP FUNCTION IF EXISTS sync_orders_currency_code();
ALTER TABLE orders DROP COLUMN IF EXISTS currency;
```

The archive table is what makes a within-cycle rollback cheap: compensation is a single forward migration that repopulates `currency` from `orders_currency_archive`, not a point-in-time restore.

## Key Insights

- Order matters more than syntax. Expand, deploy, switch reads, contract — each step in its own release, and the schema is always a superset of what any running version needs.
- Never cancel a migration mid-flight. `cancel-in-progress: false` plus an advisory lock keeps a cancelled workflow from leaving DDL applied without a ledger row.
- Set `lock_timeout` smaller than your patience and larger than normal DDL wait times. Three seconds is a good starting point; a migration that cannot get its lock in three seconds is a migration that should run in a quiet window.
- `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block. Either detect it in the runner and autocommit, or keep index builds in their own migration file.
- Rehearse against real data volume. Timings from an empty test database are fiction; the dump restore is the only rehearsal that predicts the maintenance window.
- Treat the ledger as an audit artifact. Checksums catch edited-after-apply migrations, the most common cause of "it worked in staging" production incidents.
- Rollback through flags and forward migrations, not through reversed DDL. Keep the backup table from the contract step for at least one full release cycle.
- Long backfills belong outside the deploy job. A batched script on a schedule keeps replication lag controllable and lets the deploy finish in seconds.

## Next Steps

- Add a schema diff check to pull requests so reviewers see the DDL before it reaches a migration set.
- Extend the pipeline with drift detection on a schedule, failing loudly when production diverges from the ledger.
- Explore the [GitHub Actions release engineering syllabus](../syllabi/github-actions-release-engineering-syllabus.md) for the broader release process this pipeline plugs into.
- Read the [GitHub Actions security and secrets cheatsheet](../cheatsheets/github-actions-security-secrets-cheatsheet.md) to move the database credentials to OIDC-based, short-lived access.
- Try the [GitHub Actions cost and performance guide](../guides/github-actions-cost-and-performance-guide.md) to keep long rehearsal jobs from inflating your bill.

## Conclusion

You built a migration pipeline that treats schema change as a release of its own: rehearsal against real data, an advisory-locked runner with timeouts and a checksum ledger, a production job behind an approval gate, and a contract phase that ships a release after the code that made it safe. The application deploy now depends on the migration rather than carrying it, which is what turns a schema change from an outage risk into a routine, auditable step.

---
title: "PostgreSQL Major Version Upgrade Guide"
description: "A production guide to moving PostgreSQL clusters across major versions — compatibility auditing, pg_upgrade versus logical replication cutovers, rehearsal strategy, downtime budgeting, rollback paths, and post-upgrade re-tuning."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# PostgreSQL Major Version Upgrade Guide

## Introduction

A minor upgrade is a one-line restart. A major upgrade — 15 to 16, 16 to 17 — is a different class of operation: the on-disk catalog format changes, the query planner changes, extensions must be rebuilt, and every application driver in your fleet has to keep working against a server that now behaves slightly differently. Teams that treat it like a patch install usually discover the gap in the middle of the maintenance window, with the old primary already shut down.

The good news is that PostgreSQL's major upgrade is one of the best-understood operations in the operational playbook, and there are exactly two strategies that matter:

- **In-place binary upgrade with `pg_upgrade`**, where the new server binaries read the old data directory directly. Fast (minutes, even for large databases), simple to roll back before the first write, but it requires downtime for the whole cutover.
- **Logical replication cutover**, where the new major version runs as a subscriber, catches up under load, and you promote it when replication lag reaches zero. Near-zero downtime, no filesystem coupling, and rollback stays available for days — but it is slower to set up, does not replicate sequences or large objects automatically, and requires care with DDL.

The most useful framing is a decision, not a preference: `pg_upgrade` optimises for **short, bounded downtime**; logical replication optimises for **unbounded downtime tolerance**. Most organisations run both patterns — `pg_upgrade` for smaller or internal clusters, logical replication for the tier-1 primary that cannot take a fifteen-minute write freeze.

Whatever the path, the upgrade itself is the short part. The work is in the compatibility audit, the rehearsal, and the post-upgrade validation — and that work is what this guide covers.

## Best Practices

### 1. Treat the upgrade as a data migration project, not a maintenance window

A major upgrade changes the on-disk format, the default configuration values, the planner's cost model, and often the default for several GUCs. That is a project with a rollback plan and a validation checklist, not a task you slot into a Tuesday night.

- Assign an owner and a written cutover runbook with timestamps, not a verbal plan.
- Separate *rehearsal*, *cutover*, and *validation* into distinct scheduled activities with their own sign-off.
- Budget the downtime in hours, then subtract: what remains is the only number you promise to stakeholders.
- Decide the rollback trigger in advance ("abort if validation query set X fails twice within 10 minutes"), not during the incident.

### 2. Audit compatibility before you schedule anything

The three compatibility surfaces that break upgrades, in order of how often they bite:

1. **Extensions** — every extension must have a build for the new major version. `pg_stat_statements`, `pgvector`, `PostGIS`, `pg_repack`, and `TimescaleDB` all track major releases separately, and some lag by weeks. An extension without a target-version build is a hard blocker.
2. **Client drivers and pools** — old `libpq`, old JDBC drivers, and old PgBouncer builds may negotiate protocols or assume catalog shapes that changed. PgBouncer in particular must be at a version that understands the new server's authentication defaults.
3. **SQL surface** — removed functions, changed default behaviour, and reserved words. Every major release ships a "migration" section in its release notes; read it line by line rather than skimming.

Audit all three before committing to a date. Discovering a missing extension build during the cutover is the single most common cause of an aborted upgrade.

### 3. Prefer logical replication for large or latency-sensitive clusters

Logical replication is the right default when any of these is true:

- the primary serves user traffic that cannot tolerate a multi-minute write freeze;
- the database is large enough that a full `pg_upgrade` rehearsal takes longer than the window you are willing to book;
- you want rollback to remain available for days rather than minutes.

The shape is straightforward: publish the whole database on the old cluster, subscribe from the new one, let it catch up, then stop writes, drain lag to zero, and promote. Because the old cluster keeps running and keeps its data, rolling back is "repoint the connection string" rather than "restore 800 GB from backup".

The three things logical replication does **not** carry by default are sequences, large objects, and DDL. Sequences need an explicit `setval` at cutover, large objects need `pg_largeobject` handled out of band, and schema changes must be applied to both sides while replication is active.

### 4. Use pg_upgrade with link mode and rehearsals for smaller fleets

For clusters where a bounded freeze is acceptable, `pg_upgrade --link` is dramatically faster than copy mode because it hard-links relation files instead of copying them. Two consequences follow, and both matter:

- **Link mode destroys the old cluster's usability.** After `--link`, the old data directory shares inodes with the new one; the only real rollback is a filesystem snapshot or a physical backup taken before the upgrade. Never run link mode without a verified base backup or a storage-level snapshot.
- **Copy mode is the safe-but-slow alternative.** Use it when you cannot snapshot, accepting that migration time scales with database size.

`pg_upgrade` also needs the target binaries, an initialized empty target cluster, and the *old* binaries still installed — it invokes the old server to dump schema. Do not remove the old packages until the upgrade is validated.

### 5. Freeze DDL and application deploys during the cutover

Both upgrade strategies are sensitive to schema drift at exactly the wrong moment.

- With `pg_upgrade`, the old cluster must be shut down cleanly and stay shut down; any DDL after the shutdown check but before the new server starts is lost.
- With logical replication, DDL is not replicated, so a deploy that adds a column mid-cutover creates divergence that only surfaces after promotion.

Enforce a change freeze covering schema migrations, application releases, and ad-hoc `ALTER` statements from the start of replication setup until validation completes. Announce it in the same channel your team uses for incidents, not only in a ticket.

### 6. Keep a tested rollback path — and know its expiry

Every upgrade plan needs an explicit answer to "how do we go back, and until when?"

```text
Strategy            Rollback mechanism                     Rollback expires
------------------  -------------------------------------  -------------------------
pg_upgrade --link   restore snapshot / base backup         at first write on new cluster
pg_upgrade (copy)   restart old cluster on old data dir    at first write on new cluster
logical replication repoint connection string to old       when old cluster is decommissioned
```

The critical rule for both `pg_upgrade` variants: rollback is only clean **before the new cluster accepts writes**. Once applications have written to the new version, going back means reconciling divergent data, which is a data migration in its own right. Write the expiry condition into the runbook so nobody attempts a naive rollback at hour six.

### 7. Rebuild statistics and re-tune after the upgrade

A freshly upgraded cluster starts with whatever statistics the old one had — which is often nothing usable, because `pg_upgrade` does not carry `pg_statistic` in a form the new planner trusts equally, and the new planner's cost model differs anyway. The first hours after promotion are the worst possible time to trust the plan cache.

- Run `ANALYZE` (or `vacuumdb --analyze-only`) across the database before returning traffic to full volume.
- Review `postgresql.conf` against the new version's defaults — several defaults change between majors, and an inherited config file can silently leave new features off or set changed parameters to incompatible values.
- Expect plan regressions. New majors frequently change join strategy defaults, parallel query thresholds, and JIT heuristics. Have a query-plan comparison step in validation, not just "does it return rows".

## Implementation Steps

### Step 1: Inventory versions, extensions, and clients

Start by writing down the current state — you cannot audit against a guess.

```bash
# Source server version and build
psql -c "SELECT version();" -c "SHOW server_version_num;"

# Installed extensions and their versions
psql -c "SELECT extname, extversion FROM pg_extension ORDER BY 1;"

# Available extension builds for the CURRENT server
psql -c "SELECT name, default_version, installed_version
         FROM pg_available_extensions ORDER BY 1;"

# Logical replication prerequisites (needed for the rolling path)
psql -c "SHOW wal_level;" -c "SHOW max_replication_slots;" -c "SHOW max_wal_senders;"
```

On the target host, confirm the new binaries and the matching extension packages are actually installable:

```bash
# After installing the new major version packages
/usr/lib/postgresql/17/bin/postgres --version
ls /usr/share/postgresql/17/extension/ | sort
```

Compare the two extension lists. Any extension present on the source and missing from the target's `extension/` directory is a blocker until a package exists.

Finally, inventory the clients:

```bash
# Driver / pooler versions across the fleet
psql -c "SELECT DISTINCT application_name, client_addr, backend_start
         FROM pg_stat_activity WHERE backend_type = 'client backend';"
```

Confirm PgBouncer and any proxy in front of the database support the target major version, and that every application driver is at a release that has been tested against it.

### Step 2: Build the compatibility report

Read the release notes for every major version you are skipping, not just the target. Upgrading 14 to 17 means reading the 15, 16, and 17 migration sections.

Then convert those notes into a searchable report against your own codebase:

```bash
# Search application migrations, views, functions, and ORM definitions
# for constructs flagged as removed or changed in the target release
grep -RIn -e "pg_stat_activity.wait_event" -e "pg_class.relhasoids" \
  -e "pg_stat_statements.track_planning" -e "abstime" -e "relhaspkey" \
  db/ app/ --include="*.sql" --include="*.rb" --include="*.py" --include="*.ts"
```

Record each hit as either *must fix before upgrade*, *acceptable behaviour change*, or *false positive*, with the file and line. The report is the artefact you review at go/no-go.

Two checks that deserve their own attention:

```sql
-- Objects that depend on removed or renamed functions
SELECT n.nspname, p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema');

-- Text-search and collation configuration that changed defaults
SELECT datname, datcollate, datctype, datlocprovider FROM pg_database;
```

Collation provider defaults moved for several locales in recent majors; if you rely on `ORDER BY` on text in user-facing output, verify sort order against a copy rather than assuming stability.

### Step 3: Rehearse on a production-sized copy

A rehearsal on an empty database proves nothing. Restore the latest base backup plus WAL to a scratch host with the target binaries and run the whole runbook there, timed.

```bash
# Restore a base backup into a scratch cluster
pg_basebackup -h source-host -D /var/lib/postgresql/17/main_fresh -X stream -P

# Run the in-place upgrade against the restored copy
/usr/lib/postgresql/17/bin/pg_upgrade \
  --old-bindir=/usr/lib/postgresql/16/bin \
  --new-bindir=/usr/lib/postgresql/17/bin \
  --old-datadir=/var/lib/postgresql/16/main \
  --new-datadir=/var/lib/postgresql/17/main_fresh \
  --link \
  --check
```

Run `--check` first, fix everything it reports, then run the real migration. `pg_upgrade` writes a `pg_upgrade_output.d` directory with a log per step; read it even on success.

The rehearsal must produce three numbers you cannot get any other way:

- **wall-clock migration time** on production-sized data, so the maintenance window is grounded in measurement;
- **validation query runtime**, so you know how long the post-cutover checks take;
- **a list of failing checks**, which becomes your fix list.

For the logical replication path, the rehearsal is the same idea with a publisher/subscriber pair:

```bash
# On the new cluster
psql -h new-host -d appdb -c "
  CREATE SUBSCRIPTION upgrade_sub
  CONNECTION 'host=old-host dbname=appdb user=repl_user password=...'
  PUBLICATION upgrade_pub
  WITH (copy_data = true, create_slot = true);"

# Watch catch-up
psql -h new-host -d appdb -c "
  SELECT subname, received_lsn, latest_end_lsn, last_msg_send_time
  FROM pg_stat_subscription;"
```

Time how long initial synchronisation takes on realistic data volume — that is the number that decides whether the rolling path is viable at all.

### Step 4: Prepare the target cluster and replication

Before cutover, the target cluster must be configured and warm, not a default install.

```bash
# Initialize the target cluster with matching locale and encoding
/usr/lib/postgresql/17/bin/initdb -D /var/lib/postgresql/17/main \
  --locale=C.UTF-8 --encoding=UTF8

# Start it and confirm it accepts connections
pg_ctl -D /var/lib/postgresql/17/main -l /var/log/postgresql/17.log start
psql -h new-host -c "SHOW server_version;"
```

Copy the tuned parameters from the source, then reconcile them against the new version's defaults — do not blindly paste the whole file, because parameters that were correct for the old version may now be wrong or superseded:

```bash
# Diff the effective non-default settings between versions
psql -h old-host -Atc "SELECT name, setting FROM pg_settings
                       WHERE source = 'configuration file' ORDER BY 1;" > /tmp/old_settings.txt
psql -h new-host -Atc "SELECT name, setting FROM pg_settings
                       WHERE source = 'configuration file' ORDER BY 1;" > /tmp/new_settings.txt
diff -u /tmp/old_settings.txt /tmp/new_settings.txt
```

For the rolling path, create the replication role and publication on the source:

```sql
CREATE ROLE repl_user WITH REPLICATION LOGIN PASSWORD '...';

CREATE PUBLICATION upgrade_pub FOR ALL TABLES;

-- Tables without a primary key cannot be replicated safely — find them first
SELECT schemaname, tablename
FROM pg_tables t
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = t.schemaname AND c.relname = t.tablename AND i.indisprimary
  );
```

Every table in that result is a replication hazard: updates and deletes on a keyless table can be applied more than once by a subscriber. Add a primary key or exclude the table and plan a manual reconciliation for it.

### Step 5: Run the cutover

Follow the written runbook in order, announcing each phase. Do not improvise steps.

**For the pg_upgrade path:**

```bash
# 1. Stop writes and take a final verified base backup
pg_ctl -D /var/lib/postgresql/16/main stop -m fast
pg_basebackup -D /var/backups/pg16_final -X stream -c fast

# 2. Verify the backup is readable before touching anything
pg_controldata /var/backups/pg16_final | head -5

# 3. Run the upgrade in link mode
/usr/lib/postgresql/17/bin/pg_upgrade \
  --old-bindir=/usr/lib/postgresql/16/bin \
  --new-bindir=/usr/lib/postgresql/17/bin \
  --old-datadir=/var/lib/postgresql/16/main \
  --new-datadir=/var/lib/postgresql/17/main \
  --link

# 4. Start the new cluster on the same port and point the service at it
pg_ctl -D /var/lib/postgresql/17/main -l /var/log/postgresql/17.log start
```

**For the logical replication path:**

```sql
-- 1. Confirm lag is zero and stable over several checks
SELECT subname, latest_end_lsn, last_msg_send_time FROM pg_stat_subscription;

-- 2. Stop writes at the application layer, then drain remaining lag
-- 3. Carry sequences forward — logical replication does not do this
SELECT setval(pg_get_serial_sequence('orders', 'id'),
              (SELECT COALESCE(MAX(id), 1) FROM orders), true);
```

Repeat the `setval` for every sequence, or generate the statements in bulk:

```sql
SELECT format(
  'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I.%I), 1), true);',
  pg_get_serial_sequence(format('%I.%I', schemaname, tablename), column_name),
  column_name, schemaname, tablename)
FROM information_schema.columns
WHERE column_default LIKE 'nextval%';
```

Run the generated statements on the **new** cluster, then promote it, then repoint the connection string. Keep the old cluster running and read-only until validation passes — that is your rollback.

### Step 6: Validate, tune, and decommission

Validation is a checklist with numbers, not a smoke test.

```bash
# Rebuild statistics before validating plans
vacuumdb -h new-host --all --analyze-only --jobs=4

# Verify object counts match the source
psql -h new-host -Atc "SELECT count(*) FROM pg_class WHERE relkind = 'r';"
psql -h old-host -Atc "SELECT count(*) FROM pg_class WHERE relkind = 'r';"

# Recreate extension objects where the upgrade requires it
psql -h new-host -c "ALTER EXTENSION pg_stat_statements UPDATE;"
```

Then run the application's own validation: the query set from the rehearsal, the report endpoints that exercise the heaviest joins, and a comparison of row counts and checksums on the highest-traffic tables.

Watch the new cluster for the first full business cycle before decommissioning anything:

```sql
-- Remaining replication lag (rolling path) and connection health
SELECT subname, latest_end_lsn FROM pg_stat_subscription;
SELECT state, count(*) FROM pg_stat_activity GROUP BY 1;
```

Once validation passes and the rollback window has expired, decommission in the correct order: drop the replication slot and subscription (a forgotten slot pins WAL and fills the old volume), stop and remove the old cluster's service, then uninstall the old binaries — and only after you have confirmed nothing still connects to the old port.

```sql
-- On the SOURCE cluster, after rollback is no longer needed
SELECT pg_drop_replication_slot(slot_name) FROM pg_replication_slots;
```

Finally, record the outcome — rehearsal time versus actual cutover time, issues encountered, and any plan regressions found — in the same place as your maintenance history. The next major upgrade starts from that document, and an accurate one turns a two-week project into a two-day one.

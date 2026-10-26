---
title: "PostgreSQL Backup and Restore Cheatsheet"
description: "Quick reference for pg_dump and pg_restore, pg_basebackup, WAL archiving, point-in-time recovery, and proving that a backup actually restores."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# PostgreSQL Backup and Restore Cheatsheet

Two families cover PostgreSQL. Logical backups (`pg_dump`, `pg_dumpall`) export SQL objects and stay portable across versions; physical backups (`pg_basebackup` plus WAL) copy the data directory and are the only route to point-in-time recovery. A backup is not real until a restore has been timed and verified.

## Quick Reference Table

| Task | Command | Notes |
|------|---------|-------|
| Full logical dump, custom format | `pg_dump -Fc -f app.dump appdb` | Compressed; selective restore via `pg_restore` |
| Plain SQL dump | `pg_dump -Fp -f app.sql appdb` | Readable; restore with `psql` |
| Directory format, parallel | `pg_dump -Fd -j 4 -f /backup/app_dir appdb` | Parallel dump and restore |
| Schema only | `pg_dump -s -f schema.sql appdb` | No rows, no data |
| Single table | `pg_dump -t public.orders -f orders.sql appdb` | Repeat `-t` for several tables |
| Exclude a table | `pg_dump -T public.audit_log -Fc -f app.dump appdb` | Useful for huge log tables |
| Roles and tablespaces | `pg_dumpall -g -f globals.sql` | `pg_dump` never includes roles |
| Restore custom dump | `pg_restore -d appdb -j 4 app.dump` | Into an existing empty database |
| Clean restore | `pg_restore -d appdb --clean --if-exists app.dump` | Drops objects before recreating |
| Restore one table | `pg_restore -d appdb -t orders app.dump` | Needs `-d` target |
| Restore plain SQL | `psql -d appdb -v ON_ERROR_STOP=1 -f app.sql` | Stop on first error |
| Inspect a dump | `pg_restore -l app.dump` | Table of contents listing |
| Physical base backup | `pg_basebackup -D /backup/base -Ft -z -X stream -P` | Includes WAL via streaming |
| Verify base backup | `pg_verifybackup /backup/base` | Checksums against manifest |
| Force a WAL switch | `SELECT pg_switch_wal();` | Shrinks RPO before risky changes |

## Common Commands

### Logical Backups with pg_dump

```bash
# Custom format with compression, plus a checksum recorded next to the file
pg_dump -h db.internal -U backup_user -Fc --compress=6 -f /backup/appdb-20261027.dump appdb
sha256sum /backup/appdb-20261027.dump > /backup/appdb-20261027.dump.sha256

# Two dumps taken at different moments are not a consistent pair.
# Export one snapshot and reuse it for every database in the set.
psql -d postgres -c "SELECT pg_export_snapshot();"   # e.g. 00000003-0000001B-1
pg_dump --snapshot="00000003-0000001B-1" -Fc -f /backup/billing.dump billing
```

### Restoring with pg_restore and psql

```bash
# Create a clean target, then restore with four workers
createdb -h db.internal -U admin appdb_restored
pg_restore -h db.internal -U admin -d appdb_restored -j 4 --exit-on-error /backup/appdb.dump

# Restore into a populated database, tolerating existing objects
pg_restore -d appdb --clean --if-exists --no-owner --no-privileges /backup/appdb.dump

# Plain SQL restore: always stop on the first error
psql -d appdb -v ON_ERROR_STOP=1 -f /backup/appdb.sql

# Rebuild a cluster: globals (roles) first, then each database
psql -d postgres -v ON_ERROR_STOP=1 -f /backup/globals.sql
```

### Physical Backups with pg_basebackup

```bash
# Streaming base backup, tar format, gzip compressed, with progress
pg_basebackup -h db.internal -U replicator -D /backup/base_20261027 -Ft -z -X stream -c fast -P

# Verify against the manifest before shipping the backup off-host
pg_verifybackup /backup/base_20261027
```

### WAL Archiving and PITR

```ini
# postgresql.conf — archiving is what makes PITR possible
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /mnt/wal-archive/%f && cp %p /mnt/wal-archive/%f'
archive_timeout = 60
```

```bash
# Archived segments must also leave the host, or one lost disk loses both copies
aws s3 sync /mnt/wal-archive s3://acme-pg-wal/appdb/ --only-show-errors

# Check for archiving failures — a silent failure means no PITR
psql -d postgres -c "SELECT archived_count, failed_count, last_archived_time FROM pg_stat_archiver;"
```

## Code Snippets

### Nightly Backup Script with Verification

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/postgres"
DB_NAME="appdb"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${BACKUP_DIR}/${DB_NAME}-${STAMP}.dump"

mkdir -p "${BACKUP_DIR}"

if ! pg_dump --format=custom --compress=6 --file="${FILE}" "${DB_NAME}"; then
    echo "backup failed for ${DB_NAME}" >&2
    exit 1
fi

# A dump that cannot be listed cannot be restored
if ! pg_restore --list "${FILE}" > /dev/null; then
    echo "archive ${FILE} is unreadable" >&2
    exit 1
fi

find "${BACKUP_DIR}" -name "${DB_NAME}-*.dump" -mtime +14 -delete
echo "backup ok: ${FILE}"
```

### Restore Drill into a Throwaway Database

```bash
#!/usr/bin/env bash
set -euo pipefail

DUMP="/var/backups/postgres/appdb-20261027T010000Z.dump"
DRILL_DB="appdb_restore_check"

psql -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DRILL_DB};"
psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DRILL_DB};"
pg_restore --dbname="${DRILL_DB}" --jobs=4 --exit-on-error "${DUMP}"
psql -d "${DRILL_DB}" -v ON_ERROR_STOP=1 -c "SELECT count(*) AS orders FROM orders;"
```

### Point-in-Time Recovery Configuration

```ini
# postgresql.conf on the restored instance
restore_command = 'cp /mnt/wal-archive/%f %p'
recovery_target_time = '2026-10-27 04:30:00+07'
recovery_target_action = 'promote'
```

```bash
# PostgreSQL 12+ uses signal files instead of recovery.conf
touch /var/lib/postgresql/16/main/recovery.signal
pg_ctl -D /var/lib/postgresql/16/main start
```

### Post-Restore Verification Queries

```sql
-- Recovery must be finished before the instance serves writes
SELECT pg_is_in_recovery() AS still_replaying;

-- Sanity-check the largest tables against the source counts
SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;

-- Sequences do not reset themselves: fix them after a logical restore
SELECT setval('orders_id_seq', (SELECT max(id) FROM orders));
```

Rehearse the restore path on a schedule and write the elapsed time down next to your RPO and RTO targets.

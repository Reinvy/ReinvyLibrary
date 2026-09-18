---
title: "MongoDB Backup and Restore Cheatsheet"
description: "A quick reference for MongoDB backup and recovery — mongodump and mongorestore, archive and gzip backups, oplog capture, point-in-time recovery, filesystem snapshots, Atlas cloud backups, and restore verification."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# MongoDB Backup and Restore Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Backup all databases | `mongodump --uri "mongodb://localhost:27017"` | Writes every database to `./dump/` |
| Backup one database | `mongodump --db bookstore` | Backs up only `bookstore` to `dump/bookstore/` |
| Backup one collection | `mongodump --db bookstore --collection orders` | Backs up a single collection |
| Single-file backup | `mongodump --archive=full.archive` | Writes the whole backup to one archive file |
| Compressed backup | `mongodump --archive=full.gz --gzip` | Gzip-compressed archive backup |
| Capture the oplog | `mongodump --oplog` | Includes oplog entries for point-in-time restore |
| Restore all databases | `mongorestore dump/` | Restores every database from the dump directory |
| Restore one database | `mongorestore --db bookstore dump/bookstore` | Restores a single database |
| Restore from archive | `mongorestore --archive=full.gz --gzip` | Restores from a compressed archive file |
| Drop before restoring | `mongorestore --drop dump/` | Drops each collection before restoring it |
| Remap namespaces | `mongorestore --nsFrom "bookstore.*" --nsTo "staging.*" dump/` | Restores into a different database name |
| Replay the oplog | `mongorestore --oplogReplay` | Applies captured oplog entries after the base restore |
| Verify a restore | `mongorestore --archive=full.gz --gzip --dryRun` | Lists restore actions without writing any data |
| Lock writes for a snapshot | `mongosh admin --eval "db.fsyncLock()"` | Flushes and locks writes before a volume snapshot |

## Common Commands

### Logical Backups with mongodump

```bash
# Backup every database to ./dump
mongodump --uri "mongodb://user:pass@localhost:27017"

# Backup a single database to a specific output directory
mongodump --db bookstore --out /backups/2026-09-19/

# Backup a single collection, compressed into an archive
mongodump --db bookstore --collection orders --gzip --archive=orders.gz

# Backup against an Atlas cluster with authentication
mongodump --host cluster0.xxxxx.mongodb.net --username admin \
  --authenticationDatabase admin --archive=atlas-full.gz --gzip
```

### Restoring with mongorestore

```bash
# Restore an entire dump directory
mongorestore --uri "mongodb://localhost:27017" /backups/2026-09-19/

# Restore a single database
mongorestore --db bookstore /backups/2026-09-19/bookstore

# Restore from an archive and drop existing data first
mongorestore --archive=full-2026-09-19.gz --gzip --drop

# Restore into a different database (namespace remapping)
mongorestore --nsFrom "bookstore.*" --nsTo "staging.*" /backups/dump/
```

### Atlas Cloud Backups

```bash
# Export an Atlas snapshot locally with the standard tools
mongodump --uri "mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net" \
  --archive=atlas-export.gz --gzip

# Atlas CLI: list available snapshots for a cluster
atlas backups snapshots list --clusterName Cluster0

# Atlas CLI: restore a snapshot by ID (creates a fresh cluster)
atlas backups restore start --clusterName Cluster0 --snapshotId 64f3a1b2c3d4e5f6a7b8c9d0
```

### Filesystem Snapshots

```bash
# Snapshot a standalone: flush and lock writes, snapshot the volume, then unlock
mongosh admin --eval "db.fsyncLock()"

# ... take the volume snapshot (EBS, LVM, or similar) here ...

mongosh admin --eval "db.fsyncUnlock()"

# For replica sets, snapshot the data volume of a secondary instead —
# journaling keeps the snapshot crash-consistent without a lock.
```

### Automating Backups

```bash
# crontab entry: run a rotating full backup every day at 02:00
0 2 * * * /usr/local/bin/mongodb-backup.sh

# Inside the script, prune archives older than 7 days
find /backups/mongodb -name "full-*.gz" -mtime +7 -delete
```

## Code Snippets

### Scripted Backup with Rotation

```bash
#!/bin/bash
set -euo pipefail

URI="mongodb://127.0.0.1:27017/admin"
BACKUP_DIR="/backups/mongodb"
STAMP=$(date +%Y%m%d-%H%M%S)

# Full backup with oplog capture, compressed to a timestamped archive
mongodump --uri "$URI" --oplog --archive="$BACKUP_DIR/full-$STAMP.gz" --gzip

# Keep the last 7 daily archives
find "$BACKUP_DIR" -name "full-*.gz" -mtime +7 -delete
```

### Point-in-Time Recovery

```bash
# 1. Restore the most recent full backup
mongorestore --archive=full-2026-09-19.gz --gzip --drop

# 2. Replay the captured oplog to roll the data forward to the target moment
mongorestore --archive=oplog-2026-09-19.gz --gzip --oplogReplay

# To stop at a specific time, use --oplogLimit (ISO-8601 in UTC)
mongorestore --archive=oplog-2026-09-19.gz --gzip --oplogReplay \
  --oplogLimit "2026-09-19T14:30:00Z"
```

### Restore Verification

```bash
# Dry run: inspect everything a restore would write without touching the target
mongorestore --archive=full-2026-09-19.gz --gzip --dryRun

# Restore into an isolated database to verify integrity safely
mongorestore --nsFrom "bookstore.*" --nsTo "verify.*" \
  --archive=full-2026-09-19.gz --gzip

# Sanity-check document counts after the restore
mongosh verify --eval "db.orders.countDocuments()"
```

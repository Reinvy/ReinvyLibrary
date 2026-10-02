---
title: "MongoDB Backup and Recovery Guide"
description: "A practical guide to MongoDB backups that survive a real outage: mongodump and mongorestore, filesystem snapshots, oplog-based point-in-time recovery, and tested restore drills with defined RPO and RTO."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# MongoDB Backup and Recovery Guide

## Introduction

A backup is not the file you wrote last night; it is the restore you completed successfully under time pressure. Most MongoDB incidents that turn into data loss are not caused by the absence of backups — they are caused by backups that were never restorable, never verified, or never covered the window the business actually cared about.

MongoDB gives you three layers, and they solve different problems:

- **Logical backups** (`mongodump` / `mongorestore`) are portable, filterable, and easy to move between topologies or major versions. They are also slow on large datasets and, on their own, restore to the moment the dump finished.
- **Physical snapshots** (LVM, EBS, cloud disk snapshots) are near-instant regardless of dataset size and restore quickly, but they are tied to the storage layer and topology.
- **Oplog replay** applies the operations between a base backup and a target timestamp, which is how you get true point-in-time recovery (PITR) inside the oplog window.

This guide covers how to combine them, where each one breaks, and the drills that prove a restore plan works before an incident forces you to find out.

## Best Practices

- **Define RPO and RTO before you pick a tool.** Recovery Point Objective (how much data you may lose) and Recovery Time Objective (how long the restore may take) turn an open-ended argument into a concrete cadence. A 5-minute RPO rules out nightly dumps immediately.
- **Never treat `mongodump --oplog` as PITR.** `--oplog` captures operations only for the duration of the dump, so it makes the dump consistent, not recoverable to an arbitrary moment. PITR needs a saved base plus an oplog window that covers the target time.
- **Back up from a secondary.** Dumping from the primary competes with application reads and writes. On a replica set, point `mongodump` at a secondary with `--readPreference=secondary`.
- **Snapshot the topology, not one node.** For a replica set, snapshot all members inside the same window; for a sharded cluster, stop the balancer and snapshot every shard plus the config servers.
- **Keep the oplog window longer than your snapshot interval plus your slowest restore.** If snapshots are every six hours but the oplog holds four hours, there are windows you cannot reach.
- **Encrypt and store off-cluster.** Use SSE-KMS or equivalent on the object store, require TLS to the database, and keep credentials out of scripts (use an instance role or secret manager).
- **Pin the tool versions.** `mongorestore` from an older major version may not read an archive written by a newer `mongodump`. Ship the same version in the backup image as in the restore runbook.
- **Verify every restore automatically, and rehearse quarterly.** Counts and `dbHash` catch truncation; a calendar reminder catches the slow drift of an untested runbook.

## Implementation Steps

### Step 1: Agree on RPO, RTO, and retention per dataset

| Dataset | RPO | RTO | Mechanism | Retention |
|---|---|---|---|---|
| Payments | 5 min | 1 hour | 15-min snapshots + oplog replay | 35 days |
| Product catalog | 1 hour | 4 hours | hourly `mongodump` archive | 30 days |
| Analytics events | 24 hours | 8 hours | nightly `mongodump` | 90 days |

Write these numbers into the runbook, then size the oplog to match: the oplog must span at least the snapshot interval plus the expected restore duration. A larger oplog costs disk; a short one costs data.

### Step 2: Take consistent logical backups

```bash
#!/usr/bin/env bash
set -euo pipefail

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="s3://acme-mongo-backups/prod/${TS}.archive.gz"

# --oplog makes the dump consistent on a replica set; --gzip keeps transfer small.
mongodump \
    --uri="${MONGO_URI}" \
    --readPreference=secondary \
    --oplog \
    --gzip \
    --archive \
    --numParallelCollections=4 \
    | aws s3 cp - "${ARCHIVE}" --sse aws:kms

# Record the boundary of the backup so PITR knows where replay may start.
mongosh "${MONGO_URI}" --quiet \
    --eval 'db.getSiblingDB("local").oplog.rs.find().sort({$natural:-1}).limit(1).next().ts' \
    > "${TS}.oplog-ts"

echo "backup ${ARCHIVE} finished at $(cat "${TS}.oplog-ts")"
```

Streaming straight into object storage avoids a local disk requirement, but it also means a failed upload leaves no partial then restorable file — `set -o pipefail` and an upload checksum are what make that safe.

### Step 3: Capture physical snapshots for large datasets

For a 500 GB deployment, `mongodump` takes hours; a volume snapshot takes seconds. WiredTiger's journal makes a snapshot crash-consistent, so a replica set member can be snapshotted while running.

```bash
# Volume-level snapshot (EBS example). Tag it so retention policies apply.
aws ec2 create-snapshot \
    --volume-id "${VOL_ID}" \
    --description "mongo-${TS}" \
    --tag-specifications 'ResourceType=snapshot,Tags=[{Key=app,Value=payments},{Key=backup,Value=daily}]'
```

On a standalone node, or when you need a byte-identical copy, fence writes around the snapshot instead of trusting the journal:

```javascript
// mongosh, admin user: blocks writes; reads may continue.
db.fsyncLock();
// ... take the snapshot from another shell ...
db.fsyncUnlock();
```

### Step 4: Replay the oplog for point-in-time recovery

PITR is two artifacts: the base (snapshot or dump) and the oplog window. Restore the base into a scratch host, then replay up to but not past the target timestamp.

```bash
# 1. Restore the base snapshot to a scratch host and start mongod with --replSet.
#    Do not connect the application to it.

# 2. Extract only the oplog entries after the base, as an oplog dump.
mongodump --uri="${MONGO_URI}" \
    --db=local --collection=oplog.rs \
    --query='{"ts": {"$gte": {"$timestamp": {"t": 1761955200, "i": 1}}}}' \
    --out=/restore/oplog_window

# 3. Replay up to 2026-11-01T02:20:00Z (1761963600), exclusive.
mongorestore --uri="mongodb://localhost:27017" \
    --oplogReplay \
    --oplogLimit=1761963600:1 \
    /restore/oplog_window
```

`--oplogLimit` takes `<seconds>:<ordinal>`, so a replay stops exactly between two operations. If the target time falls outside the oplog window, PITR is impossible — fall back to the base and accept the data loss, then widen the oplog.

### Step 5: Restore and verify in isolation

Always restore to a different namespace first. `--nsFrom` / `--nsTo` let you validate without touching production.

```bash
mongorestore \
    --uri="${STAGING_URI}" \
    --gzip \
    --archive="${ARCHIVE}" \
    --nsFrom='shop.*' \
    --nsTo='verify_shop.*' \
    --stopOnError

mongosh "${STAGING_URI}" --quiet --eval '
    const src = db.getSiblingDB("shop");
    const dst = db.getSiblingDB("verify_shop");
    let failed = false;
    src.getCollectionNames().forEach((name) => {
        const a = src.getCollection(name).countDocuments({});
        const b = dst.getCollection(name).countDocuments({});
        if (a !== b) { print(`${name}: ${a} != ${b}`); failed = true; }
    });
    if (failed) { quit(1); }
    print("restore verified: row counts match");
'
```

Add a `dbHash` comparison when you need byte-level confidence, and check that indexes survived — a restore that loses its indexes will pass a row count and fail in production.

### Step 6: Run the drill and record the numbers

Schedule a quarterly drill that restores production data into staging, starts the application against it, and records the wall-clock time from "incident declared" to "queries served". That number is your real RTO; anything in the runbook that has not been timed is an estimate.

Backups exist to be restored, so treat the restore path as the product. Combine a frequent snapshot cadence for a small RPO with an oplog window that covers your slowest restore, keep logical dumps for portability and cross-version moves, and verify every restore by count, hash, and index presence. The plan is only trustworthy once a drill has produced a measured RTO — until then, you have files, not a recovery strategy.

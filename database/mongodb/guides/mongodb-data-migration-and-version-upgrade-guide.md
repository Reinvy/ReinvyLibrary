---
title: "MongoDB Data Migration and Version Upgrade Guide"
description: "A comprehensive guide to migrating MongoDB data between deployments and upgrading MongoDB server versions — covering migration strategy selection, zero-downtime cutover, rolling upgrades, feature compatibility versions, verification, and rollback planning."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# MongoDB Data Migration and Version Upgrade Guide

## Introduction

Every MongoDB deployment eventually faces a migration or an upgrade: moving to new hardware, relocating to another cloud region, consolidating clusters, or upgrading to a newer MongoDB version to escape end-of-life support and gain new features. These operations carry real risk — data loss, extended downtime, and subtle corruption that only surfaces weeks later. Unlike a routine backup-restore, a production migration is a controlled engineering project that touches the replica set, the application layer, and the operations runbook at the same time.

This guide covers the two operations that are usually planned together because they interact so tightly: moving data between deployments (migration) and raising the MongoDB server version (upgrade). You will learn how to choose between logical, physical, and live-sync migration strategies, how to execute a zero-downtime cutover by extending the replica set, how to perform a rolling version upgrade one `mongod` at a time, and — critically — how the feature compatibility version (FCV) gates what you can and cannot do at each stage. Each section builds toward a step-by-step implementation workflow you can follow for any MongoDB deployment.

## Best Practices

### 1. Inventory the Source Deployment Before Planning Anything

A migration plan that starts with commands instead of data is a guess. Before choosing a strategy, collect the ground truth about the source cluster: per-database and per-collection statistics, document counts, index inventories, user and role definitions, shard distribution, and which features are actually in use (transactions, change streams, TTL indexes, time-series collections). Features that look similar across versions may behave differently after an upgrade, so a written inventory is also your upgrade impact list. `mongosh` scripts can dump this inventory to a file that later doubles as the verification checklist.

### 2. Match the Migration Strategy to the Requirements

The three families of migration each trade speed against flexibility. Logical migration with `mongodump`/`mongorestore` is the most portable — the BSON format is stable across major versions and operating systems, so it is the default choice for cross-version moves and for reshaping data during the transfer. Physical approaches (filesystem snapshots, or replica set initial sync) are far faster for large datasets because they copy raw data files, but they are only appropriate for same-version, same-architecture moves, and snapshots require a maintenance window for consistent capture. Live-sync tools such as Atlas `mongomirror` or a change-streams replay loop copy the initial dataset and then continuously apply new writes, enabling near-zero-downtime cutover. Decide on the strategy matrix, not on familiarity.

### 3. Respect the Feature Compatibility Version

The FCV (`featureCompatibilityVersion`) is the switch that turns on version-gated features and upgrades internal storage formats. MongoDB's hardened rule is: upgrade all `mongod` and `mongos` binaries first, and bump the FCV only after every node is running the new version. Bumping the FCV forward is a one-way door in practice — MongoDB supports downgrading only if the FCV has not been bumped, and only to the immediately preceding major version. Checking the current FCV, and scheduling its bump as a separate, deliberate step, prevents the most common upgrade aborts.

### 4. Upgrade One Node at a Time, Never the Whole Cluster

Rolling upgrades restart a single `mongod` at a time, letting the replica set absorb each restart without losing primary availability. For a replica set, upgrade every secondary first, wait for each to return to `SECONDARY` state and catch up on replication, then step down the primary and upgrade it last. For a sharded cluster, the order is: `mongos` routers first, then config servers, then each shard as its own rolling replica-set upgrade. Restarting the entire set simultaneously turns a routine upgrade into a full outage and removes the natural safety net of a healthy secondary.

### 5. Size the Oplog and Disk Headroom for the Migration

Two resources are silently consumed during migrations and upgrades. First, the oplog: replica set extension and live-sync approaches rely on new or existing members reading the oplog long enough to catch up, so a small oplog can force an initial sync or cause a live-sync to stall. Check `db.printReplicationInfo()` and grow the oplog before starting if the catch-up window is tight. Second, disk: logical restores rebuild data plus indexes, often temporarily doubling storage usage, and binary upgrades need room to stage the new distribution. Reserve headroom on both source and target before you begin.

### 6. Verify with Data, Not Assumptions

"Restore completed" is not the same as "data is correct." Compare document counts per collection, compare index inventories, spot-check field values, and use `db.collection.hashCollection()` or the `dbHash` command on unsharded deployments to compare cryptographic hashes of the data on both sides. Then run application-level smoke tests against the target, and only then announce the migration a success. Verification is a checklist with outputs attached, not a single command exit code.

### 7. Keep the Rollback Path Open Until Cutover Is Confirmed

The old cluster is your insurance policy. Do not decommission it the moment the new one answers. Keep old endpoints reachable through the entire cutover and for a soak period afterward, so that a discovered defect is a configuration flip back, not an emergency restore. Document the reversal procedure — which DNS records or connection-string settings to change, in which order — and test it on a staging environment before the real cutover.

## Implementation Steps

### Step 1: Inventory the Source Deployment

Capture the full picture of the source cluster before touching anything. Record the MongoDB version, topology, feature usage, and per-collection facts that will later drive both the strategy choice and the verification pass.

```bash
# MongoDB version and FCV
mongosh --uri "$SRC_URI" --quiet --eval '
  const v = db.runCommand({ buildInfo: 1 });
  print("MongoDB version: " + v.version);
  print("FCV: " + db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 }).featureCompatibilityVersion.value);
'
```

```bash
# Per-database and per-collection inventory (counts, sizes, index counts)
mongosh --uri "$SRC_URI" --quiet --eval '
  db.adminCommand({ listDatabases: 1 }).databases.forEach(d => {
    const s = db.getSiblingDB(d.name).stats();
    print(`${d.name}: ${s.objects} docs, ${(s.dataSize/1024/1024).toFixed(1)} MB data, ${s.indexes} indexes`);
  });
'
```

```bash
# Active feature usage scan: change streams, transactions, TTL, time-series
mongosh --uri "$SRC_URI" --quiet --eval '
  db.adminCommand({ listDatabases: 1 }).databases.forEach(d => {
    const dbc = db.getSiblingDB(d.name);
    dbc.getCollectionNames().forEach(c => {
      const coll = dbc.getCollection(c);
      const info = coll.stats();
      let flags = [];
      if (info.timeseries) flags.push("time-series");
      coll.getIndexes().forEach(ix => { if (ix.expireAfterSeconds) flags.push("TTL"); });
      if (flags.length) print(`${d.name}.${c}: ${flags.join(", ")}`);
    });
  });
'
```

Export the user and role definitions so they can be recreated on the target with the same privileges:

```bash
mongosh --uri "$SRC_URI" --quiet --eval '
  db.getUsers().forEach(u => print(EJSON.stringify(u, null, 2)));
' > users-backup.json
```

### Step 2: Choose the Migration Strategy

Compare the three strategy families against your constraints — dataset size, allowed downtime, version gap, and whether the data needs reshaping. Starting from MongoDB 4.2 upward, BSON files produced by `mongodump` are portable between major versions, which makes the logical path the default for cross-version migrations.

```text
| Strategy               | Downtime        | Best For                                            |
|------------------------|-----------------|-----------------------------------------------------|
| mongodump/restore      | Full window     | Cross-version moves, data reshaping, small/medium   |
| Snapshot / initial sync| Near zero       | Same version, same architecture, large datasets     |
| Change-stream replay   | Near zero       | Live sync, minimal cutover window, continuous       |
| mongomirror (Atlas)    | Near zero       | Migrating into MongoDB Atlas from self-managed      |
```

Pick a strategy and write down the cutoff criteria: the maximum acceptable downtime, the last moment new writes may still occur on the source, and who approves the final cutover. A written decision record makes the operation auditable and gives the team a single source of truth during the execution window.

### Step 3: Prepare the Target Cluster

Provision the target deployment so it can receive the data without surprises. Install the target MongoDB version (for an upgrade-in-place, this is the same cluster; for a data-center move it is a fresh deployment), create the administrative and application users to match the inventory from Step 1, and pre-create any required replica set or sharded topology. If the target is a new cluster, disable writes from the application until cutover by pointing the application at the source — traffic follows configuration, not the database.

Verify reachability and authentication from the migration host to both clusters before the transfer begins:

```bash
mongosh --uri "$DST_URI" --quiet --eval 'db.runCommand({ hello: 1 }).isWritablePrimary'
```

Enable the same feature set on the target where it matters for verification, for instance TLS and compression settings that match the source, so the restored data is exercised under production-equivalent conditions.

### Step 4: Execute the Initial Data Transfer

For a logical migration, stream the source to the target through an archive. The archive format is more resilient than directory dumps because it is a single self-contained stream that preserves order and supports gzip compression on both ends.

```bash
# Full logical dump with compression
mongodump --uri "$SRC_URI" --archive --gzip > mongodb-migration.archive

# Restore into the target, replacing existing collections
mongorestore --uri "$DST_URI" --archive --gzip --drop < mongodb-migration.archive
```

For large datasets, defer index creation so the bulk insert runs at maximum speed, then build indexes in parallel on the target afterwards:

```bash
# First pass: data only, no index restoration
mongorestore --uri "$DST_URI" --archive --gzip --noIndexRestore --numInsertionWorkers 4 < mongodb-migration.archive

# Second pass: recreate indexes per collection (run these concurrently)
mongosh --uri "$DST_URI" --quiet --eval '
  const src = db.getSiblingDB("app");
  src.customers.createIndex({ email: 1 }, { unique: true });
  src.orders.createIndex({ customerId: 1, createdAt: -1 });
  src.orders.createIndex({ status: 1 });
'
```

For a same-version, zero-downtime move, extend the replica set instead: add members residing on the new hardware, let initial sync populate them from the current primary, then step the primary down so the new members can take over. This approach avoids a full dump entirely and is the fastest large-dataset path.

```javascript
// Add a new member to the existing replica set (new hardware / new build)
rs.add({ _id: 5, host: "new-host-1:27017", priority: 2 });

// Watch initial sync progress on the new member
rs.status().members.filter(m => m.name.includes("new-host")).forEach(m =>
  print(`${m.name}: ${m.stateStr}, opting out: ${JSON.stringify(m.syncSourceHost)}`)
);
```

### Step 5: Replay Incremental Writes and Cut Over

A full dump is a snapshot in time; anything the application writes after the dump started still lives only on the source. For near-zero-downtime cutover, record the operation time of the dump, then replay change streams from that point onto the target until the two sides converge. Open a change stream on the source pinned to the recorded timestamp:

```javascript
// Capture the moment the dump began (from the mongodump log or an admin command)
const startTime = new Date("2026-10-03T00:00:00Z");

const pipeline = [
  {
    $match: {
      $or: [
        { operationType: { $in: ["insert", "update", "replace", "delete"] } },
        { "operationType": "drop" }
      ]
    }
  }
];

const cursor = db.watch(pipeline, { startAtOperationTime: startTime });
```

Apply each event to the target idempotently — using `replaceOne` with `upsert: true` for writes and `deleteOne` for deletes makes the replay safe to restart:

```javascript
const target = db.getSiblingDB("app");

while (cursor.hasNext()) {
  const event = cursor.next();
  const doc = event.fullDocument;

  if (event.operationType === "delete") {
    target[event.ns.coll].deleteOne({ _id: event.documentKey._id });
  } else if (event.operationType === "drop") {
    target[event.ns.coll].drop();
  } else {
    target[event.ns.coll].replaceOne(
      { _id: doc._id },
      doc,
      { upsert: true }
    );
  }
}
```

Monitor the replay lag between source and target. When the lag is consistently near zero, perform the cutover: switch the application's connection strings (or DNS records) to the target during a quiet period, let the final in-flight writes drain, then stop the replay. Keep the source read-only-enabled for verification instead of deleting it.

### Step 6: Upgrade the MongoDB Server Version

Upgrades move one major version at a time — MongoDB supports upgrading from a version to the next major release, so an 6.0 deployment must pass through 7.0 before 8.0. Confirm the path, check the current FCV, and take a backup before starting.

```bash
# Confirm the installed version and FCV before the upgrade
mongosh --uri "$URI" --quiet --eval '
  print("Current: " + db.runCommand({ buildInfo: 1 }).version);
  print("FCV: " + db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 }).featureCompatibilityVersion.value);
'
```

For a replica set, upgrade one node at a time. On each node: stop `mongod`, replace the binaries with the new distribution, and restart with the existing configuration file.

```bash
# On each secondary, one at a time
systemctl stop mongod
tar -xzf mongodb-linux-x86_64-8.0.5.tgz -C /opt
# Point the init script / service to the new binary path, then:
systemctl start mongod
mongosh --uri "$URI" --quiet --eval 'rs.status().members.forEach(m => print(`${m.name}: ${m.stateStr}`))'
```

Wait for the upgraded secondary to reach `SECONDARY` state and catch up before touching the next node. Once all secondaries are on the new version, step down the primary and upgrade it in the same way:

```bash
mongosh --uri "$URI" --quiet --eval 'rs.stepDown(60)'
# Upgrade the (former) primary node's binaries, restart, then re-check rs.status()
```

For a sharded cluster the order is fixed: upgrade all `mongos` routers first, then the config servers one at a time, then every shard as its own rolling replica-set upgrade — shards hold user data, so each shard follows the secondary-first-then-primary pattern above.

Only after every `mongod` and `mongos` runs the new version, bump the FCV. This is the point of no return, so it must be a deliberate, separately approved step:

```bash
mongosh --uri "$URI" --quiet --eval '
  db.adminCommand({ setFeatureCompatibilityVersion: "8.0" });
  print("FCV now: " + db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 }).featureCompatibilityVersion.value);
'
```

The FCV bump finalizes internal format upgrades; from here a downgrade to the previous major version is no longer supported. Schedule it only after the cluster has been running stable on the new binaries for a validation period.

### Step 7: Verify, Soak, and Decommission

Verification has three layers: structural equality, cryptographic data equality, and application behavior. Compare counts and indexes first:

```bash
mongosh --uri "$DST_URI" --quiet --eval '
  db.adminCommand({ listDatabases: 1 }).databases.forEach(d => {
    const dbc = db.getSiblingDB(d.name);
    dbc.getCollectionNames().forEach(c => {
      print(`${d.name}.${c}: ${dbc.getCollection(c).countDocuments()} docs`);
    });
  });
'
```

On unsharded deployments, compare `dbHash` output between source and target for a definitive data-equality check — hash mismatches pinpoint the exact collection that diverged:

```bash
mongosh --uri "$DST_URI" --quiet --eval 'db.runCommand({ dbHash: 1 })'
```

Run the application smoke tests defined in Step 1 against the target, then monitor for a soak period — replication lag, error rates, and slow-query regressions — before decommissioning the source. When the soak passes, remove the old members from the replica set (for an in-place upgrade, there are none) and archive or delete the old deployment according to your retention policy. Document the outcome, the verification outputs, and any incidents in the operations runbook so the next migration is a known quantity rather than a fresh adventure.

## Conclusion

Migrating MongoDB data and upgrading its server version are two operations that fail for the same reason: speed over process. An inventory-first plan, a strategy chosen against explicit downtime and portability constraints, a rolling node-by-node upgrade that leaves the FCV bump as a separate approved step, and a verification pass grounded in hash comparisons turn high-risk operations into routine, rehearsed engineering. The replica set is your ally at every stage — it absorbs restarts during rolling upgrades, provides the catch-up mechanism for zero-downtime cutover, and stands ready as the rollback path until the soak period proves the new deployment healthy. When the old cluster is finally decommissioned, the checklist and verification outputs you produced along the way remain as the documentation for the next migration.

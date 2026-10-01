---
title: "MongoDB Sharding Cheatsheet"
description: "A practical reference for operating a sharded MongoDB cluster: shard key selection, chunk management, the balancer, mongos and config servers, hashed versus ranged strategies, zone sharding, and cluster monitoring."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# MongoDB Sharding Cheatsheet

Sharding is a horizontal scaling topology: `mongos` routers, a config server replica set holding cluster metadata, and shard replica sets holding the data. Every command below runs from `mongosh` connected to a `mongos` — never directly to a shard.

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Enable sharding on a database | `sh.enableSharding("shop")` | Marks the database as sharded and picks a primary shard |
| Shard a collection (hashed) | `sh.shardCollection("shop.orders", { customerId: "hashed" })` | Even write distribution, no range targeting |
| Shard a collection (ranged) | `sh.shardCollection("shop.orders", { createdAt: 1 })` | Range queries hit few shards, risks hotspots |
| Compound shard key | `sh.shardCollection("shop.orders", { tenantId: 1, _id: 1 })` | Adds cardinality to a low-cardinality prefix |
| Add a shard | `sh.addShard("rs0/mongo-shard0:27017")` | Registers a replica set as a shard |
| Remove a shard | `sh.removeShard("rs2")` | Drains chunks first; requires a running balancer |
| Cluster status | `sh.status()` | Databases, shards, chunk distribution, balancer state |
| Collection distribution | `db.orders.getShardDistribution()` | Per-shard chunk count, data size, document count |
| Balancer state | `sh.getBalancerState()` | Returns `true` when balancing is enabled |
| Stop / start balancer | `sh.stopBalancer()` / `sh.startBalancer()` | Use during bulk loads and index builds |
| Chunk size | `db.settings.updateOne({ _id: "chunksize" }, { $set: { value: 64 } })` | Lower before a large backfill (default 128 MB) |
| Split a chunk | `sh.splitAt("shop.orders", { tenantId: 42 })` | Manual split at a specific key value |
| Move a chunk | `sh.moveChunk("shop.orders", { tenantId: 42 }, "rs2")` | Migrate one chunk to a target shard |
| Add zone | `sh.addShardToZone("rs1", "APAC")` | Tags a shard with a zone name |
| Assign range to zone | `sh.updateZoneKeyRange("shop.orders", { region: "APAC" }, { region: "APAC\uffff" }, "APAC")` | Pins a key range to a zone |
| Reshard a collection | `sh.reshardCollection("shop.orders", { tenantId: "hashed" })` | MongoDB 5.0+, online shard key change |
| Refine shard key | `db.adminCommand({ refineCollectionShardKey: "shop.orders", key: { tenantId: 1, createdAt: 1 } })` | MongoDB 4.4+, extends an existing key |

## Common Commands

### Cluster Topology

```bash
# Deploy a config server replica set (three nodes, port 27019)
mongod --configsvr --replSet cfg --port 27019 --dbpath /data/configdb --bind_ip 0.0.0.0

# Start a mongos router pointing at the config replica set
mongos --configdb cfg/mongo-cfg0:27019,mongo-cfg1:27019,mongo-cfg2:27019 --port 27017

# Verify from mongosh that routing works and metadata is readable
mongosh "mongodb://mongos:27017" --eval 'db.adminCommand({ hello: 1 }).msg'
```

### Shard Registration and Inspection

```bash
# Connect to the router, not to a shard, then register and inspect shards
mongosh "mongodb://mongos:27017/admin"
mongosh --eval 'sh.addShard("rs0/shard0a:27017,shard0b:27017")'
mongosh --eval 'db.adminCommand({ listShards: 1 }).shards.map(s => s.host)'
```

### Balancer Control

```bash
# Pause balancing before a bulk import, resume afterwards
mongosh --eval 'sh.stopBalancer()'
mongosh --eval 'sh.setBalancerState(true)'

# Restrict balancing to a maintenance window (UTC hours)
mongosh --eval 'db.getSiblingDB("config").settings.updateOne(
  { _id: "balancer" },
  { $set: { activeWindow: { start: "01:00", stop: "06:00" } } },
  { upsert: true }
)'
```

## Code Snippets

### Validating a Shard Key Before Sharding

```javascript
// Run against mongos. Checks cardinality and monotonicity risk first.
function assertShardable(db, collName, keyPattern) {
    const coll = db.getCollection(collName);
    const sample = coll.aggregate([
        { $sample: { size: 10000 } },
        { $group: { _id: keyPattern, count: { $sum: 1 } } },
        { $count: "distinctKeys" }
    ]).toArray();

    if (!sample.length || sample[0].distinctKeys < 1000) {
        throw new Error(`Shard key ${JSON.stringify(keyPattern)} has too few distinct values`);
    }

    const stats = coll.stats();
    const selectivity = sample[0].distinctKeys / Math.max(stats.count, 1);
    if (selectivity < 0.01) {
        throw new Error(`Shard key selectivity ${selectivity.toFixed(4)} is too low; expect jumbo chunks`);
    }
    print(`Shard key ${JSON.stringify(keyPattern)} looks healthy (selectivity ${selectivity.toFixed(3)})`);
}

try {
    assertShardable(db.getSiblingDB("shop"), "orders", { tenantId: 1, createdAt: 1 });
} catch (err) {
    print(`Aborting shard key rollout: ${err.message}`);
}
```

### Zone Sharding for Data Residency

```javascript
// Pins EU tenants to EU shards. Ranges must not overlap and must cover the whole keyspace
// for the zoned field, otherwise unzoned chunks land wherever the balancer decides.
const ns = "shop.orders";
const zones = [
    { zone: "EU", shard: "rs-eu", min: { region: "EU" }, max: { region: "EU\uffff" } },
    { zone: "APAC", shard: "rs-apac", min: { region: "APAC" }, max: { region: "APAC\uffff" } }
];

for (const z of zones) {
    sh.addShardToZone(z.shard, z.zone);
    sh.updateZoneKeyRange(ns, z.min, z.max, z.zone);
    print(`Zone ${z.zone} bound to ${z.shard}`);
}

// Confirm every chunk in the collection has a zone assignment
const unzoned = db.getSiblingDB("config").chunks.countDocuments({
    ns: ns,
    jumbo: false,
    $or: [{ min: { $lt: { region: "EU" } } }, { max: { $gt: { region: "APAC\uffff" } } }]
});
if (unzoned > 0) {
    print(`Warning: ${unzoned} chunks fall outside declared zones`);
}
```

### Monitoring Chunk Balance and Migrations

```javascript
try {
    const status = db.adminCommand({ balancerStatus: 1 });
    print(`Balancer mode: ${status.mode}, in progress: ${status.inBalancerRound}`);

    const migrations = db.getSiblingDB("admin").aggregate([
        { $currentOp: { allUsers: true, idleConnections: false } },
        { $match: { type: "op", desc: /Migration/ } },
        { $project: { desc: 1, ns: 1, secs_running: 1 } }
    ]).toArray();

    if (migrations.length > 20) {
        print(`Backlog: ${migrations.length} concurrent migrations — throttle the balancer`);
    }
    migrations.forEach(m => print(`${m.desc} on ${m.ns} for ${m.secs_running}s`));
} catch (err) {
    print(`Monitoring query failed: ${err.code} ${err.message}`);
}
```

### Targeting a Shard Key in Queries

```javascript
// Include the shard key prefix, otherwise mongos performs a scatter-gather.
const plan = db.orders.find({ tenantId: 42, status: "PAID" }).explain("executionStats");
if (plan.queryPlanner.winningPlan.stage === "SINGLE_SHARD") {
    print("Query routed to a single shard — good");
} else {
    print("Query broadcast to all shards — add the shard key to the filter");
}
```

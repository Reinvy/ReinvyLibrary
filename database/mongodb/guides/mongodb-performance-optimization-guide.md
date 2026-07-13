---
title: "MongoDB Performance Optimization and Monitoring Guide"
description: "A comprehensive guide to optimizing MongoDB performance — covering query profiling, index strategies, configuration tuning, monitoring tools, and production operational best practices."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# MongoDB Performance Optimization and Monitoring Guide

## Introduction

MongoDB is a high-performance document database, but achieving optimal performance in production requires deliberate tuning, monitoring, and proactive maintenance. Without proper attention, workloads that start fast can degrade over time due to growing data volumes, unoptimized queries, and suboptimal configurations.

This guide provides a systematic approach to MongoDB performance optimization and monitoring. You will learn how to identify slow queries through profiling, design effective indexes using proven patterns, tune the WiredTiger storage engine, configure connection pooling, and set up comprehensive monitoring to catch regressions before they impact users. Each section builds toward a practical implementation workflow you can apply to any MongoDB deployment.

## Best Practices

### Query Profiling and Analysis

Profile slow operations to identify optimization targets before making changes.

- **Enable profiling selectively**: Use `db.setProfilingLevel(1, { slowms: 100 })` to capture operations slower than 100ms on production. Avoid level 2 (logs all operations) except on development or low-traffic replicas — it degrades throughput.
- **Inspect the system.profile collection**: Retrieve slow operations with `db.system.profile.find().sort({ ts: -1 }).limit(20).pretty()`. Focus on queries with high `millis`, large `nreturned`, or zero `nreturned` with a full collection scan (`COLLSCAN`).
- **Use explain() for targeted analysis**: Before optimizing any query, run `db.collection.explain("executionStats").find(...)` to examine `totalDocsExamined`, `totalKeysExamined`, and `executionTimeMillisEstimate`. The key metric: a query examining more documents than it returns likely needs a better index.
- **Monitor current operations**: Run `db.currentOp({"secs_running": {$gte: 5}})` to find queries running longer than 5 seconds. Check the `planSummary` field — `COLLSCAN` indicates a collection scan, which is a strong signal for missing indexes.

### Index Design and Optimization

Well-designed indexes are the single highest-impact optimization for query performance.

- **Apply the ESR (Equality-Sort-Range) rule**: When designing compound indexes, place fields tested for equality first, then sort fields, then range filters. For a query like `db.orders.find({ status: "active", region: "US" }).sort({ created_at: -1 }).limit(20)`, an index on `{ status: 1, region: 1, created_at: -1 }` follows ESR and avoids an in-memory sort.
- **Create indexes to support all active queries**: Use `db.collection.aggregate([ { $indexStats: {} } ])` to see index usage. Remove unused indexes — they consume memory and slow writes. Aim for most queries to return `totalDocsExamined` close to `totalKeysExamined` (covered queries are ideal).
- **Leverage covered queries**: When all fields required by a query exist within the index itself, MongoDB never touches the data pages. Add frequently accessed fields to the index as _projected_ fields to maximize covered query opportunities.
- **Use partial and sparse indexes for targeted workloads**: A partial index like `db.users.createIndex({ "email": 1 }, { partialFilterExpression: { "status": "active" } })` is smaller and faster than a full index when most queries filter by `status: "active"`.
- **Index intersection as a fallback**: When creating a compound index for every query combination is impractical, MongoDB can use multiple indexes in parallel via index intersection. Monitor `nReturned` vs `totalKeysExamined` in `explain()` — a large gap signals that intersection is scanning more index entries than needed.

### WiredTiger Storage Engine Tuning

The WiredTiger engine provides knobs that significantly affect read and write performance.

- **Configure the WiredTiger cache appropriately**: Set `wiredTigerCacheSizeGB` to 50-80% of available RAM minus what the OS and other processes need. A cache that is too small forces frequent eviction and page faults; one that is too large starves the OS and can trigger OOM kills. On dedicated MongoDB servers, 80% is a safe starting point.
- **Monitor cache behavior**: Track `wiredTiger.cache.tracked dirty bytes in the cache` and `wiredTiger.cache.tracked pages read into cache` via `db.serverStatus()`. High eviction rates (over 20 evictions per second per core) indicate the cache is undersized for the working set.
- **Adjust compression settings**: WiredTiger compresses both data (`blockCompressor: snappy`) and indexes (`indexPrefixCompression: true`). Snappy balances compression ratio and speed. For write-heavy workloads, consider zstd (better compression, higher CPU) or disable compression for the write-ahead log with `wiredTigerJournalCompressor: none`.
- **Tune checkpoints and journal**: The default checkpoint interval (60 seconds) is safe for most workloads. For bulk inserts, temporarily set `storage.journal.commitIntervalMs: 500` and batch writes to reduce journal flush frequency.

### Connection Pooling and Application Patterns

Efficient connection management prevents resource exhaustion under load.

- **Right-size the connection pool**: Most drivers default to 100 connections per pool. For typical workloads, 10–50 connections per application instance are sufficient. Monitor `connections.current` via `db.serverStatus().connections` — if it regularly exceeds 80% of `maxIncomingConnections`, increase the pool and the MongoDB `net.maxIncomingConnections` setting together.
- **Prefer connection pooling over creating new connections**: Every new connection consumes a thread and memory on the server. Use the driver's built-in pool (e.g., `MongoClient` with `maxPoolSize` in the Node.js driver, `MongoClientSettings.MaxConnectionPoolSize` in .NET) rather than manually opening and closing connections.
- **Use read preference and write concern judiciously**: Set `readPreference: secondaryPreferred` for analytic or reporting queries to offload the primary. Use `writeConcern: { w: "majority" }` only for critical data; consider `w: 1` or `w: 0` for high-throughput, non-critical writes.
- **Batch writes in bulk operations**: Replace individual `insertOne()` calls with `bulkWrite()` or `insertMany()`. Batching 100–1000 documents per operation can improve write throughput by 10–50× compared to one-at-a-time inserts.

### Monitoring and Alerting

Proactive monitoring catches performance regressions before they become incidents.

- **Monitor key metrics from db.serverStatus()**: Track `opcounters` (insert/update/delete/query rates), `connections.current`, `globalLock.currentQueue.total`, and `extra_info.page_faults`. Sustained growth in `currentQueue` or high page fault rates indicate resource pressure.
- **Set up the MongoDB Database Profiler** for slow-query alerting: Configure profiling at level 1 with a `slowms` threshold aligned to your SLO (50–200ms is typical). Pipe profiles to an external monitoring system (Datadog, Prometheus, or custom scripts) for historical trend analysis.
- **Monitor replication lag**: Use `rs.status().members[].optimeDate` and compare each secondary's `optimeDate` to the primary. Lag consistently above 10 seconds may indicate insufficient secondary resources, network latency, or a long-running write operation blocking replication.
- **Track index usage with the `$indexStats` aggregation stage**: Run `db.collection.aggregate([{ $indexStats: {} }])` periodically. Any index with zero access since the server started is a candidate for removal. Conversely, a query that consistently triggers a full collection scan (`COLLSCAN`) in `db.currentOp()` output signals a missing index.

## Implementation Steps

### Step 1: Baseline Assessment

Establish a performance baseline before making any changes.

1. Enable profiling at level 1 with a 100ms slow threshold:
   ```javascript
   db.setProfilingLevel(1, { slowms: 100 })
   ```
2. Collect a 24-hour baseline of slow queries from `system.profile`:
   ```javascript
   const slowOps = db.system.profile.aggregate([
     { $match: { ts: { $gte: new Date(Date.now() - 86400000) } } },
     { $group: { _id: "$ns", count: { $sum: 1 }, avgMillis: { $avg: "$millis" }, maxMillis: { $max: "$millis" } } },
     { $sort: { avgMillis: -1 } }
   ]).toArray()
   printjson(slowOps)
   ```
3. Record baseline server metrics:
   ```javascript
   const s = db.serverStatus()
   print(`Operations/sec: ${s.opcounters.query + s.opcounters.insert + s.opcounters.update + s.opcounters.delete}`)
   print(`Connections: ${s.connections.current}/${s.connections.available}`)
   print(`Page faults: ${s.extra_info.page_faults}`)
   print(`Cache hit ratio: ${s.wiredTiger.cache.percentage bytes in the cache}`)
   ```
4. Document the current indexes for each collection:
   ```javascript
   db.getCollectionNames().forEach(c => {
     const idx = db[c].getIndexes()
     if (idx.length > 1) print(`Collection ${c}: ${idx.map(i => i.name).join(', ')}`)
   })
   ```

### Step 2: Identify Slow Operations

Analyze profiled operations to find the most impactful optimization targets.

1. Query the slowest operations from the profile collection:
   ```javascript
   db.system.profile.find({ millis: { $gte: 500 } }).sort({ ts: -1 }).limit(10).pretty()
   ```
2. For each slow operation, run `explain("executionStats")` with the same query pattern:
   ```javascript
   // Replace with the actual query from profile
   db.collection.explain("executionStats").find({ /* query */ }).sort({ /* sort */ })
   ```
3. Identify queries with any of these red flags:
   - `executionStats.executionStages.stage: "COLLSCAN"` — full collection scan
   - `totalDocsExamined` significantly higher than `nReturned` — poor index selectivity
   - `executionStats.executionStages.stage: "SORT"` with no index-backed sort
4. Prioritize optimization candidates by their total impact: frequency × average duration. A query running 10,000 times per day at 200ms (2,000 seconds/day) is a better target than a daily report running once at 30 seconds.

### Step 3: Implement Index Optimizations

Create and validate indexes for the identified slow queries.

1. For each slow query pattern, design a compound index using the ESR rule:
   ```javascript
   // Query: db.orders.find({ status: "pending", region: { $in: ["US", "EU"] } }).sort({ created_at: -1 })
   // ESR: equality (status), range (region $in), sort (created_at)
   db.orders.createIndex({ status: 1, region: 1, created_at: -1 })
   ```
2. After creating each index, re-run the same `explain()` call to verify improvement:
   Check that `totalDocsExamined` now equals `nReturned` or is close to it, and `executionTimeMillisEstimate` has dropped significantly.
3. For range queries on large collections, use partial indexes to reduce index size:
   ```javascript
   db.orders.createIndex(
     { region: 1, created_at: -1 },
     { partialFilterExpression: { status: { $in: ["pending", "processing"] } } }
   )
   ```
4. Create indexes in the background on production systems:
   ```javascript
   db.orders.createIndex({ customer_id: 1, created_at: -1 }, { background: true })
   ```
   Background index builds do not block writes, although they take longer and produce more oplog entries. For replica sets, consider rolling index builds during maintenance windows.

5. After all new indexes are created, remove unused indexes:
   ```javascript
   // Check index usage statistics
   db.orders.aggregate([{ $indexStats: {} }])
   // Drop any index with "accesses" === 0 since the last server restart or index creation
   db.orders.dropIndex("unused_index_name")
   ```

### Step 4: Tune WiredTiger Configuration

Adjust storage engine parameters based on observed cache behavior.

1. Calculate the optimal cache size and apply it in `mongod.conf`:
   ```yaml
   storage:
     wiredTiger:
       engineConfig:
         cacheSizeGB: <50-80% of total RAM>
   ```
2. Configure block compression if the default snappy is not ideal:
   ```yaml
   storage:
     wiredTiger:
       collectionConfig:
         blockCompressor: snappy  # Options: snappy, zlib, zstd, none
       indexConfig:
         prefixCompression: true
   ```
3. Restart the `mongod` service to apply configuration changes:
   ```bash
   sudo systemctl restart mongod
   ```
4. After restart, verify the new cache size took effect:
   ```javascript
   db.serverStatus().wiredTiger.cache["maximum bytes configured"]
   ```

### Step 5: Configure Monitoring and Alerting

Set up continuous monitoring to detect future regressions.

1. Create a monitoring script that captures key metrics at regular intervals:
   ```javascript
   // monitor.js — run via cron every 5 minutes with: mongosh monitor.js
   const db = connect("mongodb://localhost:27017/admin")
   const s = db.serverStatus()
   const repl = rs.status()
   const metrics = {
     timestamp: new Date(),
     operations: Object.assign({}, s.opcounters),
     connections: s.connections.current,
     active_connections: s.connections.active,
     page_faults: s.extra_info.page_faults,
     cache_dirty: s.wiredTiger.cache["tracked dirty bytes in the cache"],
     cache_read: s.wiredTiger.cache["tracked pages read into cache"],
     repl_lag: repl.members.filter(m => m.stateStr === "SECONDARY").map(m => m.optimeDate)
   }
   print(JSON.stringify(metrics))
   ```
2. Forward metrics to a time-series store (Prometheus, Datadog, or InfluxDB) for trend analysis.
3. Set alert thresholds for these conditions:
   - `connections.current` exceeds 80% of `maxIncomingConnections`
   - `globalLock.currentQueue.total` remains above 0 for more than 30 seconds
   - Replication lag exceeds 30 seconds on any secondary
   - Page faults exceed 100 per second sustained over 5 minutes
   - WiredTiger cache dirty ratio exceeds 20% sustained
4. Schedule a weekly `$indexStats` review to remove unused indexes before they accumulate.

### Step 6: Ongoing Performance Review

Establish a cadence for periodic performance assessment.

1. Run a monthly slow-query review by aggregating the last 30 days of `system.profile` data.
2. After schema changes or new feature deployments, re-run the Step 1 baseline assessment to detect regressions.
3. Document all index changes in a shared changelog — include the query pattern, the index spec, and the explain() metrics before and after.
4. When data volume doubles, reassess the WiredTiger cache size and connection pool settings — configuration that worked at 100GB may need adjustment at 200GB.

By following this structured workflow, you transform MongoDB performance optimization from a reactive firefight into a predictable engineering discipline. Each slow query becomes a data point, each index a deliberate design choice, and each metric a guardrail against future regressions.

---
title: "MongoDB Bulk Writes and Data Ingestion Cheatsheet"
description: "A practical reference for high-volume MongoDB writes — batched bulkWrite operations, ordered versus unordered semantics, write concerns, idempotent upserts, mongoimport and mongoexport modes, batched $merge ingestion, and verification of loaded data."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# MongoDB Bulk Writes and Data Ingestion Cheatsheet

Loading data at volume is a different discipline from ordinary CRUD: cost is dominated by round trips, index maintenance, and journal flushes rather than by the documents themselves. Every entry below targets the driver-side and server-side knobs that decide how a million documents become a populated collection — batch boundaries, failure semantics, durability contracts, and the verification steps that prove the load actually landed.

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Batched mixed operations | `db.orders.bulkWrite(ops, { ordered: false })` | One round trip for inserts, updates, and deletes |
| Sequential bulk execution | `db.orders.bulkWrite(ops, { ordered: true })` | Stops at the first failure and preserves order |
| Large insert batch | `db.orders.insertMany(docs, { ordered: false })` | Skips failing documents instead of aborting the batch |
| Upsert inside a bulk | `{ updateOne: { filter: f, update: u, upsert: true } }` | Creates the document when the filter misses |
| Full-document overwrite | `{ replaceOne: { filter: f, replacement: r, upsert: true } }` | Replaces the whole document, keeps `_id` |
| Durability contract | `{ writeConcern: { w: "majority", j: true } }` | Majority-acknowledged, journaled writes |
| Retry behavior | `retryWrites=true` in the connection URI | Retries each retryable error once, per operation |
| Skip validators | `{ bypassDocumentValidation: true }` | Ingestion-only escape hatch for `$jsonSchema` |
| Import JSON Lines | `mongoimport --collection orders --file orders.jsonl` | Default `insert` mode, fails on duplicate `_id` |
| Idempotent import | `mongoimport --mode upsert --upsertFields orderId` | Re-runs safely against a natural key |
| Merge import | `mongoimport --mode merge --upsertFields orderId` | Updates matched fields, leaves the rest intact |
| Export a subset | `mongoexport --query '{"status":"OPEN"}' --fields orderId,total` | Query-limited export to JSON |
| Stream into a collection | `{ $merge: { into: "orders", on: "orderId", whenMatched: "merge" } }` | Server-side upsert from an aggregation pipeline |
| Raise import throughput | `--batchSize 100000 --numInsertionWorkers 4` | Fewer round trips, parallel workers |
| Parallel restore | `mongorestore --numInsertionWorkersPerCollection 4` | Concurrent collection restores |
| Inspect a running load | `db.currentOp({ "command.insert": { $exists: true } })` | Find long-running write operations |

## Common Commands

### Importing JSON Lines, JSON Arrays, and CSV

```bash
# JSON Lines (one document per line) is the default and the fastest to stream
mongoimport --uri "mongodb://localhost:27017/app" --collection orders --file orders.jsonl

# A single JSON array needs the --jsonArray flag
mongoimport --uri "mongodb://localhost:27017/app" --collection orders \
  --file orders.json --jsonArray

# CSV with an explicit header row and type inference from the file
mongoimport --uri "mongodb://localhost:27017/app" --collection orders \
  --type csv --headerline --file orders.csv
```

### Loading Without Dropping the Collection

```bash
# Upsert by natural key so a re-run does not duplicate documents
mongoimport --uri "mongodb://localhost:27017/app" --collection orders \
  --file orders.jsonl --mode upsert --upsertFields orderId,region

# Merge only the fields present in the file, keep everything else
mongoimport --uri "mongodb://localhost:27017/app" --collection orders \
  --file orders.jsonl --mode merge --upsertFields orderId

# Bypass $jsonSchema validators for a trusted snapshot load
mongoimport --uri "mongodb://localhost:27017/app" --collection orders \
  --file orders.jsonl --bypassDocumentValidation
```

### Exporting for Verification

```bash
# Export a filtered projection, sorted so diffs are reproducible
mongoexport --uri "mongodb://localhost:27017/app" --collection orders \
  --query '{"status":"OPEN"}' --fields orderId,total,status --sort '{"orderId":1}' \
  --out open-orders.json

# CSV export is convenient for spreadsheet-level review
mongoexport --uri "mongodb://localhost:27017/app" --collection orders \
  --type csv --fields orderId,total,status --out orders.csv
```

### Restoring a Snapshot at Scale

```bash
# Restore a dump with parallel workers per collection
mongorestore --uri "mongodb://localhost:27017" --drop \
  --numInsertionWorkersPerCollection 4 /backup/dump

# Rename a namespace during restore (staging rehearsal before production)
mongorestore --uri "mongodb://localhost:27017" \
  --nsFrom 'staging.orders' --nsTo 'app.orders' /backup/dump
```

### Watching Progress and Confirming the Load

```bash
# Show write operations currently in flight, including their progress fields
mongosh "mongodb://localhost:27017/admin" --eval \
  'db.currentOp({ active: true, "command.insert": { $exists: true } }).inprog.map(op => ({ ns: op.ns, progress: op.progress }))'

# Compare the loaded count against the source file line count after a full load
mongosh "mongodb://localhost:27017/app" --eval 'db.orders.estimatedDocumentCount()'

# Fail a load early instead of discovering a partial batch hours later
mongoimport --uri "mongodb://localhost:27017/app" --collection orders \
  --file orders.jsonl --stopOnError
```

## Code Snippets

### Mixed Operation Batches

```javascript
const ops = [
  { insertOne: { document: { orderId: "A-1", total: 120, status: "OPEN" } } },
  { updateOne: { filter: { orderId: "A-2" }, update: { $set: { status: "SHIPPED" } } } },
  { replaceOne: { filter: { orderId: "A-3" }, replacement: { orderId: "A-3", total: 88, status: "OPEN" } } },
  { updateMany: { filter: { status: "PENDING" }, update: { $set: { status: "OPEN" } } } },
  { deleteOne: { filter: { orderId: "A-4" } } }
];

const result = db.orders.bulkWrite(ops, { ordered: false, writeConcern: { w: "majority" } });
printjson({
  inserted: result.insertedCount,
  matched: result.matchedCount,
  modified: result.modifiedCount,
  deleted: result.deletedCount
});
```

### Ordered Versus Unordered Failure Handling

```javascript
// ordered: true stops at the first error and leaves the rest unapplied
db.orders.bulkWrite([
  { insertOne: { document: { _id: 1 } } },
  { insertOne: { document: { _id: 1 } } }, // duplicate key
  { insertOne: { document: { _id: 2 } } }  // never executes
], { ordered: true });

// ordered: false continues past failures; successes are committed
const unordered = db.orders.bulkWrite([
  { insertOne: { document: { _id: 1 } } },
  { insertOne: { document: { _id: 1 } } },
  { insertOne: { document: { _id: 2 } } }
], { ordered: false });

printjson(unordered.writeErrors.map(e => ({ index: e.index, code: e.code })));
print(unordered.insertedCount); // 2
```

### Idempotent Upsert Batches

```javascript
// Re-running this batch converges on the same state — safe for retries and replays
function upsertBatch(docs) {
  const ops = docs.map(doc => ({
    updateOne: {
      filter: { orderId: doc.orderId },
      update: {
        $set: { ...doc, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },
      upsert: true
    }
  }));
  return db.orders.bulkWrite(ops, { ordered: false });
}

// A unique index turns accidental double-inserts into catchable duplicate-key errors
db.orders.createIndex({ orderId: 1 }, { unique: true });
```

### Update Pipelines Inside a Bulk Write

```javascript
// Aggregation-pipeline updates run server-side: no read-modify-write round trips
db.orders.bulkWrite([
  {
    updateOne: {
      filter: { orderId: "A-10" },
      update: [
        { $set: { total: { $add: ["$total", 15] } } },
        { $set: { tier: { $cond: [{ $gte: ["$total", 200] }, "gold", "standard"] } } }
      ]
    }
  }
], { ordered: false });
```

### Streaming Ingestion with $merge

```javascript
// The pipeline reads from staging and merges into production without client-side buffering
db.stagingOrders.aggregate([
  { $match: { ingestedAt: { $gte: new Date(Date.now() - 3600000) } } },
  { $project: { ingestedAt: 0 } },
  {
    $merge: {
      into: "orders",
      on: "orderId",
      let: { incoming: "$total" },
      whenMatched: [{ $set: { total: "$$incoming" } }],
      whenNotMatched: "insert"
    }
  }
]);
```

### Batching an Array in the Node.js Driver

```javascript
async function loadInBatches(collection, docs, batchSize = 5000) {
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    try {
      await collection.insertMany(batch, { ordered: false });
    } catch (err) {
      // BulkWriteError carries per-document failures; duplicates are expected on replays
      if (err.code !== 11000 && !err.writeErrors) throw err;
    }
  }
}
```

### Write Concern per Operation

```javascript
// Durability is a per-operation contract: bulk loads can trade it away, ledger writes cannot
db.orders.bulkWrite(ops, {
  ordered: false,
  writeConcern: { w: 1, j: false, wtimeout: 30000 },
  bypassDocumentValidation: true
});

db.ledger.insertOne(entry, { writeConcern: { w: "majority", j: true } });
```

---
title: "Building Real-Time Data Pipelines with MongoDB Change Streams"
description: "A comprehensive tutorial on using MongoDB Change Streams to build reactive, event-driven data pipelines for real-time applications, audit logging, cache invalidation, and cross-system synchronization."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building Real-Time Data Pipelines with MongoDB Change Streams

## Summary

Modern applications need to react to data changes the moment they happen — not on a scheduled poll interval. MongoDB Change Streams provide a built-in mechanism to subscribe to real-time data changes at the collection, database, or deployment level. This tutorial covers the complete lifecycle of building production-ready change stream pipelines: opening and resuming streams, filtering and transforming change events, handling failures gracefully, and integrating with downstream systems like Elasticsearch, Redis caches, and message queues. By the end, you will have built a fault-tolerant, real-time data pipeline using Node.js and MongoDB.

## Target Audience

- Backend developers and data engineers building reactive, event-driven systems.
- MongoDB users who want to move beyond polling-based synchronization.
- Developers with intermediate MongoDB and Node.js experience.

## Prerequisites

- MongoDB 4.0+ (replica set or sharded cluster — Change Streams require replication).
- Node.js 18+ installed.
- A running MongoDB instance with replica set enabled (a single-node replica set is fine for development).
- Basic familiarity with MongoDB CRUD operations and the Node.js MongoDB driver.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Open and manage Change Streams on collections, databases, and deployments.
- Use resume tokens for fault-tolerant stream recovery after crashes.
- Filter and aggregate change events using `$match` and `$project` aggregation pipelines.
- Implement a full audit log pipeline that records every data mutation with before/after snapshots.
- Build a cache invalidation system that refreshes Redis when MongoDB documents change.
- Handle errors, back-pressure, and stream resumption in production environments.

## Context and Motivation

In a typical web application stack, data lives in MongoDB and is served to clients through an API. When a document is updated, the API reads the latest data and returns it. This works fine for request-response scenarios, but many real-world requirements demand immediate, reactive behavior:

- **Search index synchronization**: When a product's price changes in MongoDB, Elasticsearch must be updated within seconds.
- **Cache invalidation**: A Redis cache that stores popular product listings needs to be refreshed when the underlying MongoDB data changes.
- **Audit logging**: Every INSERT, UPDATE, and DELETE operation must be recorded with a timestamp, user identity, and before/after snapshot for compliance.
- **Real-time dashboards**: A monitoring dashboard should display live metrics (orders per second, error rates) as they happen.
- **Cross-service notifications**: When a user's email changes, downstream services (CRM, billing, marketing) need to be notified.

Before Change Streams, these scenarios required periodic polling (`db.collection.find({ updatedAt: { $gt: lastPoll } })`), which introduced latency, wasted database resources on repeated queries, and often missed changes that happened between poll intervals. Change Streams solve this by pushing change events to consumers as they occur, with MongoDB's oplog (operation log) as the underlying mechanism. This gives you real-time reactivity with minimal overhead, ordered delivery guarantees, and at-least-once semantics when combined with resume tokens.

## Core Content

### Understanding Change Streams Architecture

Change Streams work by tailing MongoDB's **oplog** (operations log), a capped collection that records every write operation on the primary node of a replica set. When you open a Change Stream, MongoDB returns a cursor that yields change events as they are written to the oplog.

```text
┌─────────────┐     Write Operation     ┌──────────┐
│  Application │ ───────────────────────►│  MongoDB  │
│  (insert/    │                         │  Primary  │
│   update/    │                         └────┬─────┘
│   delete)    │                              │
└─────────────┘                              │ writes to oplog
                                              ▼
                                     ┌────────────────┐
                                     │     Oplog      │
                                     │  (capped coll) │
                                     └───────┬────────┘
                                              │ tailed by
                                              ▼
                                     ┌────────────────┐
                                     │ Change Stream  │
                                     │    Cursor      │
                                     └───────┬────────┘
                                              │ emits events
                                              ▼
                                     ┌────────────────┐
                                     │   Consumer     │
                                     │ (cache, search,│
                                     │  audit, etc.)  │
                                     └────────────────┘
```

Key properties of Change Streams:

- **Ordering**: Events are ordered within a single shard. For ordered processing across shards, each shard's stream is consumed independently.
- **Durability**: Events are only emitted after the write is committed to the replica set majority (or your configured write concern).
- **Resumability**: Each event carries a `_data` resume token. If the consumer crashes, it can resume from the last processed token.
- **Filtering**: You can apply `$match` and `$project` aggregation stages to filter and shape events before they reach your consumer.

### Opening a Change Stream

Change Streams are opened using the `watch()` method on a collection, database, or `MongoClient`. The scope determines which events you receive:

```javascript
import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
const db = client.db("shop");
const products = db.collection("products");

// Collection-level — only events on 'products'
const collectionStream = products.watch();

// Database-level — events on all collections in 'shop'
const dbStream = db.watch();

// Deployment-level — events on all collections in all databases
const clientStream = client.watch();
```

Each `watch()` call returns a `ChangeStream` object that behaves like an async iterable cursor:

```javascript
for await (const change of collectionStream) {
  console.log("Change detected:", change.operationType, change.documentKey);
}
```

### Anatomy of a Change Event

Every change event follows this structure:

```javascript
{
  _id: { _data: "826F...0100000001" },    // Resume token
  operationType: "insert",                 // insert | update | replace | delete | drop | ...
  clusterTime: Timestamp({ t: 1719000000, i: 1 }),
  ns: { db: "shop", coll: "products" },    // Namespace
  documentKey: { _id: ObjectId("...") },   // The document's _id
  fullDocument: { /* ... */ },             // Full doc (for insert/replace, or if fullDocument option set)
  updateDescription: {                      // For update operations
    updatedFields: { price: 29.99 },
    removedFields: ["oldField"],
    truncatedArrays: []
  }
}
```

The `operationType` field tells you what kind of write occurred:

| operationType | Description | fullDocument? | updateDescription? |
|---|---|---|---|
| `insert` | New document created | ✅ New document | ❌ |
| `update` | Existing document modified | Optional | ✅ |
| `replace` | Document replaced via `replaceOne()` | ✅ New document | ❌ |
| `delete` | Document removed | ❌ | ❌ |
| `drop` | Collection dropped | ❌ | ❌ |
| `invalidate` | Stream invalidated (collection dropped/renamed) | ❌ | ❌ |

### Resume Tokens and Fault Tolerance

The resume token (`_id._data`) is the most important field for production pipelines. It is a Base64-encoded string that encodes the oplog timestamp and operation identifier. If your consumer crashes, you can save this token and use it to resume from exactly where you left off:

```javascript
let resumeToken = null;

const options = {};
if (resumeToken) {
  options.resumeAfter = resumeToken;
}

const stream = products.watch([], options);

for await (const change of stream) {
  // Process the event
  await processEvent(change);

  // Save resume token after successful processing
  resumeToken = change._id;
  await saveResumeToken(resumeToken);
}
```

**Critical**: Only save the resume token *after* the event has been fully and successfully processed. If you save it before processing and then crash, you will skip events on restart. This is the "at-least-once" delivery guarantee — you may reprocess events after a crash, but you will never lose one.

Storing the resume token in a MongoDB collection is a natural choice:

```javascript
async function saveResumeToken(token) {
  await db.collection("pipeline_metadata").updateOne(
    { _id: "change_stream_resume_token" },
    { $set: { token, updatedAt: new Date() } },
    { upsert: true }
  );
}

async function loadResumeToken() {
  const doc = await db.collection("pipeline_metadata").findOne(
    { _id: "change_stream_resume_token" }
  );
  return doc ? doc.token : null;
}
```

### Filtering and Transforming Events with Aggregation Pipelines

You can pass an aggregation pipeline to `watch()` to filter and shape events before they reach your consumer. This is more efficient than filtering in application code because MongoDB applies the pipeline before sending data over the network.

```javascript
// Only react to price updates on products
const pipeline = [
  {
    $match: {
      operationType: { $in: ["insert", "update", "replace"] },
      "ns.coll": "products",
      "updateDescription.updatedFields.price": { $exists: true }
    }
  },
  {
    $project: {
      operationType: 1,
      "documentKey._id": 1,
      "fullDocument.name": 1,
      "fullDocument.price": 1,
      "updateDescription.updatedFields.price": 1
    }
  }
];

const stream = products.watch(pipeline);
```

Common filter patterns:

```javascript
// 1. Only certain operation types
{ $match: { operationType: { $in: ["insert", "update"] } } }

// 2. Only specific collections (for database-level streams)
{ $match: { "ns.coll": { $in: ["orders", "products"] } } }

// 3. Specific fields being updated
{ $match: { "updateDescription.updatedFields.status": { $exists: true } } }

// 4. Documents matching a condition (using $match with fullDocument)
{ $match: { "fullDocument.tenantId": "abc123" } }
```

Note: `$match` on `fullDocument` only works when `fullDocument` is populated (insert, replace, or when `fullDocument: "updateLookup"` option is set).

## Code Examples

### Example 1: Real-Time Audit Log Pipeline

This pipeline captures every data mutation in the `orders` collection and records a permanent audit trail with before-and-after snapshots.

```javascript
import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
const db = client.db("shop");
const orders = db.collection("orders");

// Open change stream with 'updateLookup' to get full document on updates
const stream = orders.watch(
  [
    {
      $match: {
        operationType: { $in: ["insert", "update", "delete"] }
      }
    }
  ],
  { fullDocument: "updateLookup" }
);

for await (const change of stream) {
  const auditEntry = {
    timestamp: new Date(),
    operationType: change.operationType,
    collection: change.ns.coll,
    documentId: change.documentKey._id,
    userId: change.fullDocument?.modifiedBy || change.fullDocument?.createdBy || "system"
  };

  if (change.operationType === "update") {
    auditEntry.changes = {
      updatedFields: change.updateDescription.updatedFields,
      removedFields: change.updateDescription.removedFields
    };
  }

  if (change.operationType === "insert") {
    auditEntry.snapshot = change.fullDocument;
  }

  if (change.operationType === "delete") {
    // For deletes, fullDocument is null — store what we know
    auditEntry.note = "Document deleted";
  }

  // Insert audit record
  await db.collection("audit_log").insertOne(auditEntry);
  console.log(`Audit recorded: ${change.operationType} on order ${change.documentKey._id}`);
}
```

### Example 2: Cache Invalidation with Redis

When product data changes in MongoDB, this pipeline invalidates the corresponding Redis cache entries so the next read fetches fresh data:

```javascript
import { MongoClient } from "mongodb";
import { createClient } from "redis";

const mongo = new MongoClient("mongodb://localhost:27017");
await mongo.connect();
const db = mongo.db("shop");

const redis = createClient({ url: "redis://localhost:6379" });
await redis.connect();

const productsStream = db.collection("products").watch(
  [
    {
      $match: {
        operationType: { $in: ["update", "delete", "replace"] }
      }
    }
  ],
  { fullDocument: "updateLookup" }
);

for await (const change of productsStream) {
  const productId = change.documentKey._id.toString();

  // Patterns to invalidate
  const cacheKeys = [
    `product:${productId}`,                                      // Single product
    `product:${productId}:details`,                               // Product details page
    "products:featured",                                          // Featured products list
    "products:latest",                                            // Latest products list
  ];

  // Handle category-specific cache for updates that change category
  if (change.operationType === "update") {
    const changedFields = change.updateDescription?.updatedFields || {};
    if (changedFields.category) {
      cacheKeys.push("products:category:*");  // Wildcard invalidation
    }
  }

  // Delete all matching cache keys
  for (const key of cacheKeys) {
    if (key.endsWith("*")) {
      // Pattern-based deletion using SCAN
      let cursor = 0;
      do {
        const result = await redis.scan(cursor, { MATCH: key });
        cursor = result.cursor;
        if (result.keys.length > 0) {
          await redis.del(result.keys);
        }
      } while (cursor !== 0);
    } else {
      await redis.del(key);
    }
  }

  console.log(`Cache invalidated for product ${productId}`);
}
```

### Example 3: Resume Token Persistence for Crash Recovery

A production-ready stream consumer that survives restarts and network interruptions:

```javascript
import { MongoClient } from "mongodb";

const MONGO_URI = "mongodb://localhost:27017";
const client = new MongoClient(MONGO_URI);

async function startConsumer() {
  await client.connect();
  const db = client.db("shop");

  // Load last known resume token
  const metadata = db.collection("pipeline_metadata");
  const lastToken = await metadata.findOne(
    { _id: "order_pipeline_token" }
  );

  let resumeToken = lastToken?.token || null;

  // Track consecutive errors for circuit-breaking
  let errorCount = 0;
  const MAX_ERRORS = 10;

  while (true) {
    try {
      const options = {};
      if (resumeToken) {
        options.resumeAfter = resumeToken;
      }

      console.log(`Starting change stream ${resumeToken ? "(resuming)" : "(fresh)"}`);
      const stream = db.collection("orders").watch([], options);

      errorCount = 0; // Reset error counter on successful connection

      for await (const change of stream) {
        try {
          // --- Process the event ---
          await processOrderEvent(change);

          // --- Persist resume token only AFTER successful processing ---
          resumeToken = change._id;
          await metadata.updateOne(
            { _id: "order_pipeline_token" },
            { $set: { token: resumeToken, updatedAt: new Date() } },
            { upsert: true }
          );

          errorCount = 0; // Reset on success
        } catch (processError) {
          console.error("Failed to process event:", processError);
          // Log the failed event for manual replay
          await db.collection("failed_events").insertOne({
            event: change,
            error: processError.message,
            timestamp: new Date()
          });
        }
      }
    } catch (streamError) {
      errorCount++;
      console.error(`Stream error (${errorCount}/${MAX_ERRORS}):`, streamError.message);

      if (errorCount >= MAX_ERRORS) {
        console.error("Max consecutive errors reached. Exiting.");
        // Send alert (PagerDuty, Slack, email, etc.)
        break;
      }

      // Exponential backoff before reconnect
      const backoff = Math.min(1000 * Math.pow(2, errorCount), 30000);
      console.log(`Reconnecting in ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
}

async function processOrderEvent(change) {
  switch (change.operationType) {
    case "insert":
      console.log(`New order: ${change.documentKey._id}`);
      // Send to fulfillment system, update dashboard, etc.
      break;
    case "update":
      if (change.updateDescription?.updatedFields?.status) {
        console.log(
          `Order ${change.documentKey._id} status changed to ` +
          `${change.updateDescription.updatedFields.status}`
        );
        // Trigger status-specific actions (shipping, refund, etc.)
      }
      break;
    case "delete":
      console.log(`Order ${change.documentKey._id} deleted`);
      // Clean up references in other systems
      break;
  }
}

startConsumer().catch(console.error);
```

### Example 4: Full Pipeline — Elasticsearch Index Synchronization

Keep an Elasticsearch product index in sync with MongoDB in real time:

```javascript
import { MongoClient } from "mongodb";
import { Client } from "@elastic/elasticsearch";

const mongo = new MongoClient("mongodb://localhost:27017");
const es = new Client({ node: "http://localhost:9200" });

await mongo.connect();
const db = mongo.db("shop");
const products = db.collection("products");

const stream = products.watch(
  [{ $match: { operationType: { $in: ["insert", "update", "replace", "delete"] } } }],
  { fullDocument: "updateLookup" }
);

for await (const change of stream) {
  const id = change.documentKey._id.toString();

  switch (change.operationType) {
    case "insert":
    case "replace":
      await es.index({
        index: "products",
        id,
        document: {
          name: change.fullDocument.name,
          description: change.fullDocument.description,
          price: change.fullDocument.price,
          category: change.fullDocument.category,
          tags: change.fullDocument.tags,
          inStock: change.fullDocument.inStock,
          updatedAt: change.fullDocument.updatedAt
        }
      });
      break;

    case "update":
      // Build a partial update document from changed fields
      const updatedFields = change.updateDescription?.updatedFields || {};
      if (Object.keys(updatedFields).length > 0) {
        await es.update({
          index: "products",
          id,
          doc: updatedFields
        });
      }
      break;

    case "delete":
      await es.delete({ index: "products", id }).catch(() => {
        // Ignore if document already deleted in ES
      });
      break;
  }

  console.log(`ES sync: ${change.operationType} product ${id}`);
}
```

## Key Insights

- **Always persist resume tokens after processing, not before**: Saving the token before the work is done creates a window where a crash leads to missed events. The "after processing" pattern guarantees at-least-once delivery.
- **Use `updateLookup` sparingly**: The `fullDocument: "updateLookup"` option causes MongoDB to read the full document on every update event, adding latency. Only enable it when you need the document's current state for processing.
- **Filter aggressively in the pipeline, not in application code**: A `$match` stage early in the watch pipeline reduces network traffic and consumer CPU load significantly, especially for database- or deployment-level streams.
- **Change Streams require a replica set**: Even in development, you need at least a single-node replica set. A standalone `mongod` does not have an oplog and cannot support Change Streams.
- **The `invalidate` event terminates the stream**: Dropping a collection or database causes an `invalidate` event that closes the stream. You must reopen the stream after the collection is recreated.
- **Batching improves throughput**: For high-volume pipelines (thousands of events per second), batch events using a time window (e.g., 100ms) before writing to the downstream system. This amortizes network round-trips and database write overhead.
- **Monitor the oplog window**: Change Streams can only resume if the oplog still contains the resume token's entry. Monitor `rs.printReplicationInfo()` to ensure your oplog size is large enough for the expected downtime window. An oplog that is too small causes `ChangeStreamHistoryLost` errors.

## Next Steps

- Explore MongoDB Realm Triggers (serverless Change Streams for Atlas users) as a managed alternative to custom consumers.
- Dive into the [MongoDB Aggregation Pipeline](mongodb-aggregation-pipeline) tutorial for advanced event transformation techniques.
- Combine Change Streams with Redis streams for a multi-stage event-processing architecture.
- Learn about sharded cluster Change Streams and the ordering guarantees (or lack thereof) across shards.

## Conclusion

MongoDB Change Streams provide a powerful, built-in mechanism for building reactive, event-driven data pipelines without external message brokers. By leveraging the oplog, resume tokens, and aggregation pipeline filters, you can build fault-tolerant consumers that synchronize search indexes, invalidate caches, maintain audit logs, and trigger real-time notifications — all with at-least-once delivery guarantees. The patterns covered in this tutorial — resume token persistence, error handling with exponential backoff, batch processing, and downstream system integration — form the foundation of any production-grade Change Stream pipeline.

---
title: "MongoDB Indexing Strategies and Query Performance Optimization"
description: "A comprehensive guide to MongoDB indexing covering index types, query optimization with explain(), compound index design, and real-world performance tuning strategies."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# MongoDB Indexing Strategies and Query Performance Optimization

## Summary

This tutorial explores MongoDB indexing in depth — from single-field indexes to compound, multikey, text, and geospatial indexes. You will learn how to analyze query performance with `explain()`, design effective index strategies, avoid common pitfalls, and optimize your database for real-world workloads. By the end, you will be able to identify slow queries, create efficient indexes, and keep your MongoDB cluster running at peak performance.

## Target Audience

- Backend Developers, Database Administrators, and DevOps engineers working with MongoDB.
- Intermediate level: comfortable with basic MongoDB CRUD operations and the MongoDB shell.

## Prerequisites

- MongoDB installed locally (version 5.0+) or access to MongoDB Atlas.
- A running `mongosh` session with a sample database loaded.
- Basic familiarity with `db.collection.find()`, `db.collection.aggregate()`, and MongoDB document structure.
- Understanding of BSON data types.

## Learning Objectives

By the end of this tutorial, you will be able to:
- Identify slow queries using the MongoDB profiler and `explain()` output.
- Choose the right index type for different query patterns (single-field, compound, multikey, text, geospatial, hashed).
- Design compound indexes following the ESR (Equality-Sort-Range) rule.
- Interpret `explain()` results — `COLLSCAN` vs `IXSCAN`, execution stats, and index bounds.
- Apply index properties like `unique`, `sparse`, `partial`, and `hidden` to solve real problems.
- Manage indexes in production: create, drop, rebuild, roll out, and monitor.
- Avoid common indexing pitfalls (over-indexing, wrong field order, case-insensitive queries).

## Context and Motivation

As your MongoDB application grows, queries that once returned in milliseconds can slow to several seconds. Without proper indexing, every query causes a **collection scan** (`COLLSCAN`) — MongoDB must examine every document in the collection to find matches. A 10 GB collection with a `COLLSCAN` reads 10 GB of data from disk for a single query.

Indexes solve this by maintaining a sorted data structure (a B-tree) on one or more fields. Instead of scanning every document, MongoDB traverses the index to locate matching documents directly. A well-designed index can reduce query time from seconds to microseconds.

However, indexes come with trade-offs:
- **Write overhead**: Every `INSERT`, `UPDATE`, and `DELETE` must update all indexes on the collection.
- **Memory consumption**: Indexes are stored in RAM for fast access; large indexes increase the working set.
- **Index selection complexity**: The query planner may pick a suboptimal index if your indexes are poorly designed.

This tutorial teaches you to navigate these trade-offs and build indexes that make your queries fast without wasting resources.

## Core Content

### Understanding Index Basics

An index in MongoDB is a data structure that stores a small subset of the collection's data — namely, the values of one or more fields and a pointer to the corresponding document. MongoDB uses a **B-tree** structure that supports efficient equality matches, range queries, and sorted results.

```javascript
// Check existing indexes on a collection
db.users.getIndexes()

// Create a simple single-field index
db.users.createIndex({ email: 1 })

// Index direction: 1 = ascending, -1 = descending
db.users.createIndex({ createdAt: -1 })
```

### Types of Indexes

#### Single-Field Index

The most basic index type. Use it when queries filter or sort by a single field.

```javascript
// Create a single-field index on the "status" field
db.orders.createIndex({ status: 1 })

// This query will use the index:
db.orders.find({ status: "shipped" }).sort({ createdAt: -1 })

// Without an index on status, the query scans all documents
```

**When to use**: Simple lookup patterns, status filters, and sorting by a single attribute.

#### Compound Index

A compound index covers multiple fields. The **order of fields matters significantly** for query performance.

```javascript
// Compound index on (status, createdAt)
db.orders.createIndex({ status: 1, createdAt: -1 })

// Efficiently served queries:
db.orders.find({ status: "shipped" }).sort({ createdAt: -1 })
db.orders.find({ status: "shipped", createdAt: { $gte: ISODate("2026-01-01") } })

// Query that can ONLY use part of the index (prefix):
db.orders.find({ status: "shipped" }) // uses only the "status" prefix
```

**The ESR Rule**: Design compound indexes by placing fields in this order:
1. **E**quality fields — fields checked with exact matches (`=`, `$eq`)
2. **S**ort fields — fields used in `sort()`
3. **R**ange fields — fields used with range operators (`$gt`, `$lt`, `$gte`, `$lte`, `$in`)

```javascript
// Query: find active users in a city, sorted by registration date
db.users.find({ status: "active", city: "Jakarta" }).sort({ registeredAt: -1 })

// ESR-optimized compound index:
db.users.createIndex({ status: 1, city: 1, registeredAt: -1 })
// Equality: status, city
// Sort: registeredAt
// (No range field in this query)
```

#### Multikey Index

Multikey indexes are created automatically when you index a field that contains an array. MongoDB creates an index entry for each element in the array.

```javascript
// Document: { tags: ["mongodb", "database", "nosql"] }
db.articles.createIndex({ tags: 1 })

// Query uses the multikey index:
db.articles.find({ tags: "mongodb" })

// Compound multikey index — only ONE field can be an array
db.articles.createIndex({ tags: 1, publishedAt: -1 })
```

**Limitations**: A compound index can have at most one multikey field. Each indexed array element is a separate index entry, so large arrays increase index size significantly.

#### Text Index

Text indexes support string content searches with tokenization, stemming, and stop-word removal.

```javascript
// Create a text index on the "content" field
db.articles.createIndex({ content: "text" })

// Or a compound text index covering multiple fields
db.articles.createIndex({ title: "text", content: "text" })

// Text search query:
db.articles.find({ $text: { $search: "mongodb indexing tutorial" } })

// With relevance score sorting:
db.articles.find(
  { $text: { $search: "mongodb performance" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })

// Text search with additional filters (use compound index):
db.articles.createIndex({ category: 1, content: "text" })
db.articles.find({ category: "backend", $text: { $search: "indexing" } })
```

**When to use**: Full-text search, blog post search, product catalog search. For production-grade search, consider MongoDB Atlas Search (built on Lucene) instead.

#### Geospatial Index

MongoDB supports geospatial queries through `2dsphere` indexes (for GeoJSON data on a sphere) and `2d` indexes (for planar coordinates).

```javascript
// Document: { name: "Cafe", location: { type: "Point", coordinates: [106.822, -6.175] } }
db.places.createIndex({ location: "2dsphere" })

// Find nearby places (within 1 km):
db.places.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [106.822, -6.175] },
      $maxDistance: 1000
    }
  }
})

// Find places within a polygon:
db.places.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[[106.8, -6.2], [106.9, -6.2], [106.9, -6.1], [106.8, -6.1], [106.8, -6.2]]]
      }
    }
  }
})
```

#### Hashed Index

Hashed indexes store the hash of a field's value. They support **equality matches only** (no range queries) and are primarily used for **sharding** with hashed shard keys.

```javascript
// Create a hashed index for sharding
db.logs.createIndex({ userId: "hashed" })

// Only supports equality queries:
db.logs.find({ userId: 12345 }) // uses hashed index

// Does NOT support:
// db.logs.find({ userId: { $gt: 1000 } }) // range query fails
```

#### TTL (Time-To-Live) Index

A TTL index automatically removes documents after a specified number of seconds. MongoDB runs a background job every 60 seconds to delete expired documents.

```javascript
// Remove documents 7 days (604800 seconds) after their createdAt timestamp
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 })

// Document expires after 7 days from createdAt:
// { createdAt: ISODate("2026-06-22T10:00:00Z"), ... }
// Deleted around 2026-06-29T10:00:00Z
```

**Use cases**: Session expiration, temporary data cleanup, event logs retention.

#### Clustered Index (MongoDB 5.3+)

A clustered index determines the physical storage order of documents on disk. The collection is stored in index order, which can dramatically improve range-scan performance.

```javascript
// Create a collection with a clustered index on _id
db.createCollection("events", {
  clusteredIndex: {
    key: { _id: 1 },
    unique: true
  }
})
```

### Index Properties

#### Unique Index

Ensures that indexed values are unique across the collection. Useful for enforcing uniqueness on fields other than `_id`.

```javascript
db.users.createIndex({ email: 1 }, { unique: true })
// Prevents duplicate email addresses

// Compound unique index:
db.users.createIndex({ tenantId: 1, email: 1 }, { unique: true })
// Uniqueness is scoped per tenant
```

#### Sparse Index

Only indexes documents that contain the indexed field. Documents without the field are excluded from the index, reducing index size.

```javascript
// Only index documents that have a "phone" field
db.users.createIndex({ phone: 1 }, { sparse: true })

// Useful for optional fields that are rarely populated
```

#### Partial Index

Indexes only documents that match a filter expression. More flexible than sparse indexes.

```javascript
// Only index orders with status "pending" or "processing"
db.orders.createIndex(
  { createdAt: 1 },
  { partialFilterExpression: { status: { $in: ["pending", "processing"] } } }
)

// This query uses the partial index:
db.orders.find({ status: "pending", createdAt: { $gt: ISODate("2026-06-01") } })

// This query does NOT use the partial index (status not covered):
db.orders.find({ status: "shipped" })
```

#### Hidden Index

A hidden index is invisible to the query planner but still maintained on writes. Use it to evaluate the impact of dropping an index without actually removing it.

```javascript
// Hide an index (production-safe evaluation):
db.orders.hideIndex("status_1_createdAt_-1")

// Check if a query still uses the index:
db.orders.find({ status: "shipped" }).explain("executionStats")

// Unhide the index:
db.orders.unhideIndex("status_1_createdAt_-1")
```

### Analyzing Query Performance with explain()

The `explain()` method provides detailed information about how MongoDB executes a query.

```javascript
// Basic usage — three verbosity modes:
db.orders.find({ status: "shipped" }).explain("queryPlanner")     // default
db.orders.find({ status: "shipped" }).explain("executionStats")   // includes execution metrics
db.orders.find({ status: "shipped" }).explain("allPlansExecution") // all plans considered
```

**Key fields in `explain("executionStats")` output**:

```text
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "COLLSCAN",  // BAD: full collection scan
      // "stage": "IXSCAN", // GOOD: index scan
      "direction": "forward"
    }
  },
  "executionStats": {
    "nReturned": 15000,           // Documents returned
    "executionTimeMillis": 8234,  // Total execution time (ms)
    "totalKeysExamined": 0,       // Index entries scanned (0 = COLLSCAN)
    "totalDocsExamined": 500000,  // Documents scanned (should match nReturned)
    "executionStages": {
      "stage": "COLLSCAN",
      "docsExamined": 500000
    }
  }
}
```

**What to look for**:

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| `stage` | `IXSCAN` | `FETCH` + `IXSCAN` | `COLLSCAN` |
| `executionTimeMillis` | < 100 | 100–500 | > 500 |
| `totalDocsExamined` / `nReturned` | 1:1 | < 10:1 | > 10:1 |
| `totalKeysExamined` / `nReturned` | < 10:1 | < 100:1 | > 100:1 |

### Index Selection and Optimization

#### The Query Planner

When you run a query, MongoDB's query planner evaluates candidate indexes, creates query plans for each, and selects the winning plan based on **trial period** performance. The planner caches the winning plan for a set of similar query shapes.

```javascript
// Force a specific index (bypass planner):
db.orders.find({ status: "shipped" }).hint({ status: 1, createdAt: -1 })

// Check if the planner is using the right index:
db.orders.find({ status: "shipped" }).explain("executionStats")
```

#### Covered Queries

A query is **covered** when all required fields exist in the index itself, so MongoDB never needs to fetch documents from the collection. This is the fastest query type.

```javascript
// Create a compound index that covers the query:
db.orders.createIndex({ status: 1, total: 1, _id: 1 })

// This query is COVERED — all data comes from the index:
db.orders.find(
  { status: "shipped" },
  { total: 1, _id: 1 }
)
// explain() shows: "stage": "PROJECTION_COVERED"
```

**Rule of thumb**: For read-heavy workloads, design compound indexes that include both filter fields (in the query) and projection fields (in the response) to maximize covered queries.

#### Sort Optimization

Indexes can serve sort operations without an in-memory sort (which is limited to 32 MB by default).

```javascript
// In-memory sort (limited to 32 MB):
db.orders.find({ status: "shipped" }).sort({ total: -1 })
// Without an index, MongoDB sorts all matching documents in memory

// Index-based sort (unlimited):
db.orders.createIndex({ status: 1, total: -1 })
// The index returns documents already sorted
```

### Managing Indexes in Production

#### Rolling Index Builds

When creating an index on a large collection in production, MongoDB 4.2+ uses a non-blocking, background index build. However, for replica sets, consider **rolling index builds** to minimize impact.

```javascript
// MongoDB 4.4+ builds indexes in the background by default
// For replica sets, the build happens concurrently across all nodes

// Monitor index build progress:
db.currentOp({
  $or: [
    { op: "command", "command.createIndexes": { $exists: true } },
    { "msg": /Index Build/ }
  ]
})
```

#### Index Statistics and Monitoring

```javascript
// List all indexes:
db.orders.getIndexes()

// Index size:
db.orders.totalIndexSize()

// All collection index sizes:
db.orders.stats().indexSizes

// Enable the database profiler to capture slow queries:
db.setProfilingLevel(1, { slowms: 100 })
// Logs all queries taking longer than 100 ms to the system.profile collection

// Query profiler data:
db.system.profile.find({
  millis: { $gt: 500 }
}).sort({ ts: -1 }).limit(10)
```

#### Index Maintenance

```javascript
// Drop an unused index:
db.orders.dropIndex("status_1_createdAt_-1")

// Rebuild an index (defragmentation):
db.orders.reIndex()
// Note: reIndex() blocks all operations — use during maintenance windows

// Compact collection instead of reIndex:
// db.runCommand({ compact: "orders" })
```

### Common Indexing Pitfalls

1. **Over-indexing**: Every index adds write overhead. MongoDB recommends **at most 5–7 indexes per collection**. Audit unused indexes with `$indexStats`.

```javascript
// Check index usage:
db.orders.aggregate([
  { $indexStats: {} }
])
```

1. **Wrong field order in compound indexes**: Always follow ESR. Placing a range field before a sort field forces MongoDB to scan more index entries.

2. **Case-insensitive queries without a case-insensitive index**:

```javascript
// Inefficient — Regex cannot use the index efficiently:
db.users.find({ email: /^TEST@EXAMPLE.COM$/i })

// Efficient — Use a case-insensitive index:
db.users.createIndex({ email: 1 }, { collation: { locale: "en", strength: 2 } })
// Then query with matching collation:
db.users.find({ email: "test@example.com" }).collation({ locale: "en", strength: 2 })
```

1. **Not using `hint()` when the planner picks wrong**: The query planner is generally reliable but can mis-select indexes on skewed data distributions.

2. **Ignoring index size**: A too-large index that doesn't fit in RAM forces disk reads, defeating the purpose of indexing.

## Code Examples

### Complete Example: E-Commerce Order System

This example demonstrates applying indexing strategies to optimize a real-world e-commerce order system.

```javascript
// Sample collection: orders with 1M+ documents
// { _id: ObjectId, orderId: String, userId: String, status: String,
//   total: Number, items: Number, createdAt: Date, shippedAt: Date,
//   shippingAddress: { city: String, zip: String } }

// Step 1: Profile slow queries
db.setProfilingLevel(1, { slowms: 200 })

// Step 2: Analyze the most common query patterns
// Pattern A: Dashboard — recent orders by status, sorted by date
// (Most frequent — every page load)
db.orders.find({ status: "pending" }).sort({ createdAt: -1 }).limit(20)

// Pattern B: Customer lookup — orders by userId
// (When a customer views their order history)
db.orders.find({ userId: "usr_abc123" }).sort({ createdAt: -1 })

// Pattern C: Shipping report — shipped orders by date range
// (Daily shipping reconciliation)
db.orders.find({
  status: "shipped",
  shippedAt: { $gte: ISODate("2026-06-01"), $lte: ISODate("2026-06-30") }
}).sort({ shippedAt: 1 })

// Pattern D: Aggregate sales by city
db.orders.aggregate([
  { $match: { status: "delivered" } },
  { $group: { _id: "$shippingAddress.city", totalSales: { $sum: "$total" } } },
  { $sort: { totalSales: -1 } }
])

// Step 3: Design indexes based on query patterns

// Index for Pattern A — ESR: Equality (status), Sort (createdAt)
db.orders.createIndex({ status: 1, createdAt: -1 })

// Index for Pattern B — Equality (userId), Sort (createdAt)
db.orders.createIndex({ userId: 1, createdAt: -1 })

// Index for Pattern C — ESR: Equality (status), Sort (shippedAt), Range (shippedAt range)
db.orders.createIndex({ status: 1, shippedAt: 1 })

// Index for Pattern D — Compound index covering aggregation
db.orders.createIndex({ status: 1, "shippingAddress.city": 1, total: 1 })

// Step 4: Verify with explain()
db.orders.find({ status: "pending" }).sort({ createdAt: -1 }).limit(20).explain("executionStats")
// Expected: IXSCAN on status_1_createdAt_-1, docsExamined ~ 20

// Step 5: Monitor index effectiveness
db.orders.aggregate([
  { $indexStats: {} },
  { $sort: { accesses: { ops: -1 } } }
])
// Shows which indexes are used/frequently accessed
```

### Visualizing Index Usage

```text
Collection Scan (COLLSCAN) — No Index:
+----------------------------------------------+
|  1 |    2 |    3 |    4 |  ...  |  500,000   | Every document examined
+----------------------------------------------+
  | | | | | | | | | | | | | | | | | | | | | |
  500,000 documents read -> 15,000 match -> slow

Index Scan (IXSCAN) — With B-tree Index:
+-------+-------+-------+-------+-------+
|  idx  |  idx  |  idx  |  idx  |  idx  | Index entries (sorted)
+-------+-------+-------+-------+-------+
  | | | | | | | | |
  15,000 index entries -> 15,000 documents fetched -> fast
```

## Key Insights

- **Always profile before indexing**: Use `db.setProfilingLevel()` and `explain("executionStats")` to identify the queries that need indexes. Guessing leads to over-indexing.
- **Follow the ESR rule**: Place equality fields first, then sort fields, then range fields in compound indexes. Wrong field order is the most common indexing mistake.
- **Covered queries are the holy grail**: When all projected fields are in the index, MongoDB never touches the collection. This is 10–100x faster than a non-covered query.
- **One multikey field per compound index**: If a compound index includes more than one array field, MongoDB rejects it. Plan your schema accordingly.
- **Hide before you drop**: Use `hideIndex()` in production to test the impact of removing an index without risking data loss or a full rebuild.
- **Partial indexes over sparse indexes**: Partial indexes are more flexible and explicit. Use them unless you specifically need the "missing field" behavior of sparse indexing.
- **Index builds affect performance**: Even with non-blocking builds in MongoDB 4.2+, building an index on a large collection consumes CPU and I/O. Schedule during low-traffic periods or use rolling builds on replica sets.

## Next Steps

- Explore the [MongoDB Aggregation Pipeline tutorial](/database/mongodb/tutorials/mongodb-aggregation-pipeline) for advanced data transformation techniques.
- Review the [MongoDB Schema Design and Data Modeling guide](/database/mongodb/guides/mongodb-schema-design-and-data-modeling-guide) for complementary schema design patterns.
- Learn about MongoDB Atlas Search for production-grade full-text search capabilities.
- Consider the [MongoDB Development Syllabus](/database/mongodb/syllabi/mongodb-development-syllabus) for a structured 12-week learning path.

## Conclusion

MongoDB indexing is both an art and a science. The right indexes can transform a query from a multi-second collection scan into a sub-millisecond index lookup. In this tutorial, you learned about every index type MongoDB offers, how to design compound indexes using the ESR rule, how to analyze queries with `explain()`, and how to manage indexes safely in production.

Remember the golden rule: **measure before you index and measure after you index**. The MongoDB profiler and `explain()` output are your best friends. Start with the most frequent query patterns, design indexes using ESR, monitor index usage with `$indexStats`, and iterate.

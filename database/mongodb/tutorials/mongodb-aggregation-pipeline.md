---
title: "MongoDB Aggregation Pipeline: A Practical Tutorial"
description: "A hands-on guide to MongoDB's aggregation pipeline covering stages, operators, data transformation, and real-world analytics use cases."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# MongoDB Aggregation Pipeline: A Practical Tutorial

## Summary

This tutorial walks you through the MongoDB Aggregation Pipeline, a powerful framework for transforming, filtering, grouping, and analyzing data directly inside the database. You will learn how to chain pipeline stages, use core operators like `$match`, `$group`, `$sort`, and `$project`, and build real-world reporting queries — all through practical examples you can run against a sample dataset.

## Target Audience

- Backend Developers and Data Engineers working with MongoDB.
- Intermediate level: comfortable with basic MongoDB CRUD operations and JavaScript syntax.

## Prerequisites

- MongoDB installed locally or access to MongoDB Atlas (free tier is sufficient).
- A running `mongosh` or MongoDB Compass shell.
- Basic familiarity with `db.collection.find()` and MongoDB document structure.
- Sample dataset loaded (instructions provided below).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain how the aggregation pipeline processes documents through sequential stages.
- Use `$match`, `$group`, `$sort`, `$project`, `$unwind`, `$lookup`, and `$bucket` in real queries.
- Build multi-stage pipelines for filtering, grouping, reshaping, and joining collections.
- Optimize pipeline performance with proper stage ordering and index usage.
- Apply aggregation to generate summary reports and analytics.

## Context and Motivation

In production applications, you rarely just save and retrieve documents — you need to compute averages, join related data, group records by date, or produce summary dashboards. While `find()` with simple filters works for basic lookups, complex data transformations require a more expressive tool.

The MongoDB Aggregation Pipeline solves this by processing documents through an ordered sequence of **stages**. Each stage transforms the document stream before passing it to the next stage. This composable, declarative model lets you build everything from a simple filtered count to a multi-join analytics report — all inside the database, without moving data to your application layer.

## Core Content

### Setting Up the Sample Data

Create a database called `shop` and insert the following sample collection of orders:

```javascript
use shop;

db.orders.insertMany([
  { _id: 1, customer: "Alice", items: ["laptop", "mouse"], total: 1200, status: "delivered", date: new Date("2025-01-15") },
  { _id: 2, customer: "Bob", items: ["keyboard", "monitor"], total: 450, status: "shipped", date: new Date("2025-01-20") },
  { _id: 3, customer: "Alice", items: ["headphones"], total: 80, status: "delivered", date: new Date("2025-02-01") },
  { _id: 4, customer: "Charlie", items: ["mouse", "mousepad"], total: 35, status: "cancelled", date: new Date("2025-02-05") },
  { _id: 5, customer: "Bob", items: ["webcam", "microphone"], total: 200, status: "delivered", date: new Date("2025-02-10") },
  { _id: 6, customer: "Diana", items: ["laptop"], total: 1500, status: "processing", date: new Date("2025-03-01") },
  { _id: 7, customer: "Alice", items: ["tablet", "case", "screen protector"], total: 520, status: "shipped", date: new Date("2025-03-05") },
  { _id: 8, customer: "Charlie", items: ["printer"], total: 180, status: "delivered", date: new Date("2025-03-10") },
  { _id: 9, customer: "Diana", items: ["keyboard"], total: 75, status: "delivered", date: new Date("2025-03-15") },
  { _id: 10, customer: "Eve", items: ["monitor", "webcam"], total: 350, status: "processing", date: new Date("2025-03-20") }
]);
```

### The Anatomy of a Pipeline

A pipeline is an array of **stages**. Documents enter the first stage, get transformed, and the result flows to the next stage. You execute a pipeline using `db.collection.aggregate()`:

```javascript
db.orders.aggregate([
  { $match: { status: "delivered" } },
  { $group: { _id: "$customer", totalSpent: { $sum: "$total" } } },
  { $sort: { totalSpent: -1 } }
]);
```

This pipeline:
1. **Filters** documents where `status` equals `"delivered"`.
2. **Groups** by `customer` and sums their `total` field.
3. **Sorts** the result by `totalSpent` in descending order.

### Stage 1: `$match` — Filtering Documents

`$match` filters the document stream using MongoDB query syntax. Place `$match` as early as possible — it reduces the number of documents flowing through later stages and can use indexes.

```javascript
// Only orders with total > 100 and status not cancelled
db.orders.aggregate([
  { $match: { total: { $gt: 100 }, status: { $ne: "cancelled" } } }
]);
```

**Performance tip**: Place `$match` before `$group` or `$sort` to minimise the working set.

### Stage 2: `$project` — Reshaping Documents

`$project` lets you include, exclude, or compute new fields. It is similar to the projection parameter in `find()` but more powerful — you can create computed fields using operators like `$concat`, `$toUpper`, and `$dateToString`.

```javascript
db.orders.aggregate([
  { $match: { status: "delivered" } },
  { $project: {
      _id: 0,
      orderId: "$_id",
      customerUpper: { $toUpper: "$customer" },
      itemCount: { $size: "$items" },
      month: { $month: "$date" }
  }}
]);
```

### Stage 3: `$group` — Aggregating Data

`$group` is the heart of aggregation. It groups documents by a key expression (set to `_id`) and applies accumulator operators to each group.

```javascript
// Total and average order value per customer
db.orders.aggregate([
  { $group: {
      _id: "$customer",
      orderCount: { $sum: 1 },
      totalSpent: { $sum: "$total" },
      avgOrderValue: { $avg: "$total" },
      minOrder: { $min: "$total" },
      maxOrder: { $max: "$total" }
  }},
  { $sort: { totalSpent: -1 } }
]);
```

**Common accumulators**: `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push` (collects values into an array), `$addToSet` (unique values).

### Stage 4: `$sort` and `$limit` — Ordering and Pagination

`$sort` orders documents by a field. `$limit` caps the number of documents. Together they are useful for top-N queries.

```javascript
// Top 3 customers by total spending
db.orders.aggregate([
  { $group: { _id: "$customer", totalSpent: { $sum: "$total" } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 3 }
]);
```

### Stage 5: `$unwind` — Flattening Arrays

When a document contains an array field, `$unwind` creates one document per array element. This is essential for analysing array data.

```javascript
// Count how many times each product was ordered
db.orders.aggregate([
  { $unwind: "$items" },
  { $group: { _id: "$items", orderCount: { $sum: 1 } } },
  { $sort: { orderCount: -1 } }
]);
```

Note: If a document has an empty `items` array, `$unwind` removes it by default. Use `{ $unwind: { path: "$items", preserveNullAndEmptyArrays: true } }` to keep it.

### Stage 6: `$lookup` — Joining Collections

`$lookup` performs a left outer join between the current collection and another collection in the same database.

Create a companion collection of product details:

```javascript
db.products.insertMany([
  { name: "laptop", category: "electronics", price: 1200 },
  { name: "mouse", category: "accessories", price: 25 },
  { name: "keyboard", category: "accessories", price: 75 },
  { name: "monitor", category: "electronics", price: 350 },
  { name: "headphones", category: "electronics", price: 80 },
  { name: "webcam", category: "electronics", price: 65 },
  { name: "microphone", category: "electronics", price: 135 },
  { name: "tablet", category: "electronics", price: 400 },
  { name: "case", category: "accessories", price: 20 },
  { name: "screen protector", category: "accessories", price: 15 },
  { name: "printer", category: "electronics", price: 180 },
  { name: "mousepad", category: "accessories", price: 10 }
]);
```

Now use `$lookup` to enrich orders with product categories:

```javascript
db.orders.aggregate([
  { $unwind: "$items" },
  { $lookup: {
      from: "products",
      localField: "items",
      foreignField: "name",
      as: "productInfo"
  }},
  { $unwind: "$productInfo" },
  { $group: {
      _id: "$productInfo.category",
      totalRevenue: { $sum: "$productInfo.price" },
      orderCount: { $sum: 1 }
  }},
  { $sort: { totalRevenue: -1 } }
]);
```

### Stage 7: `$bucket` and `$bucketAuto` — Histograms

`$bucket` groups documents into user-defined ranges. `$bucketAuto` computes boundaries automatically.

```javascript
// Order value distribution using manual buckets
db.orders.aggregate([
  { $bucket: {
      groupBy: "$total",
      boundaries: [0, 100, 500, 1000, 2000],
      default: "Other",
      output: {
          count: { $sum: 1 },
          totalValue: { $sum: "$total" }
      }
  }}
]);
```

### Stage 8: `$addFields` — Adding Computed Fields

`$addFields` adds or overwrites fields without affecting existing ones. It is ideal for enrichment before aggregation.

```javascript
db.orders.aggregate([
  { $addFields: {
      isHighValue: { $gte: ["$total", 500] },
      quarter: { $ceil: { $divide: [{ $month: "$date" }, 3] } }
  }},
  { $match: { isHighValue: true } },
  { $group: { _id: "$quarter", count: { $sum: 1 } } }
]);
```

### Building a Real-World Report

Combine everything into a comprehensive monthly sales report:

```javascript
db.orders.aggregate([
  // Step 1: Exclude cancelled orders
  { $match: { status: { $ne: "cancelled" } } },

  // Step 2: Add derived fields
  { $addFields: {
      month: { $month: "$date" },
      year: { $year: "$date" }
  }},

  // Step 3: Unwind items to get per-product granularity
  { $unwind: "$items" },

  // Step 4: Join with products collection
  { $lookup: {
      from: "products",
      localField: "items",
      foreignField: "name",
      as: "product"
  }},
  { $unwind: "$product" },

  // Step 5: Group by month and product category
  { $group: {
      _id: { month: "$month", category: "$product.category" },
      orderCount: { $sum: 1 },
      revenue: { $sum: "$product.price" }
  }},

  // Step 6: Sort chronologically
  { $sort: { "_id.month": 1, "_id.category": 1 } },

  // Step 7: Reshape for readability
  { $project: {
      _id: 0,
      month: "$_id.month",
      category: "$_id.category",
      orderCount: 1,
      revenue: { $round: ["$revenue", 2] }
  }}
]);
```

## Code Examples

### Example 1: Customer Lifetime Value Report

```javascript
db.orders.aggregate([
  { $match: { status: { $in: ["delivered", "shipped"] } } },
  { $group: {
      _id: "$customer",
      lifetimeValue: { $sum: "$total" },
      orderCount: { $sum: 1 },
      lastOrder: { $max: "$date" }
  }},
  { $project: {
      customer: "$_id",
      _id: 0,
      lifetimeValue: 1,
      orderCount: 1,
      avgOrderValue: { $round: [{ $divide: ["$lifetimeValue", "$orderCount"] }, 2] },
      recency: { $dateDiff: { startDate: "$lastOrder", endDate: "$$NOW", unit: "day" } }
  }},
  { $sort: { lifetimeValue: -1 } }
]);
```

Note: `$dateDiff` requires MongoDB 5.0+. For older versions, compute recency in your application layer.

### Example 2: Status-Based Order Summary

```javascript
db.orders.aggregate([
  { $group: {
      _id: "$status",
      count: { $sum: 1 },
      totalValue: { $sum: "$total" },
      avgValue: { $avg: "$total" },
      items: { $push: "$items" }
  }},
  { $project: {
      status: "$_id",
      _id: 0,
      count: 1,
      totalValue: 1,
      avgValue: { $round: ["$avgValue", 2] },
      uniqueProducts: { $size: { $reduce: {
          input: "$items",
          initialValue: [],
          in: { $setUnion: ["$$value", "$$this"] }
      }}}
  }}
]);
```

### Example 3: Date-Based Trend Analysis

```javascript
db.orders.aggregate([
  { $match: { status: "delivered" } },
  { $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
      dailyTotal: { $sum: "$total" },
      orderCount: { $sum: 1 }
  }},
  { $sort: { _id: 1 } },
  { $project: {
      month: "$_id",
      _id: 0,
      revenue: "$$ROOT.dailyTotal",
      orderCount: 1
  }}
]);
```

## Key Insights

- **Stage ordering matters**: Place `$match` and `$limit` as early as possible. The aggregation pipeline processes documents sequentially, so early filtering dramatically reduces the workload for downstream stages.
- **Index support**: `$match` at the start of a pipeline can use indexes. `$sort` can also use an index if it appears early. Once `$group`, `$unwind`, or `$project` execute, all subsequent stages operate on in-memory data.
- **Memory limits**: Each stage is limited to 100 MB of RAM by default. For large datasets, enable disk-based sorting with `{ allowDiskUse: true }` in the `aggregate()` options.
- **Avoid unnecessary `$unwind`**: If you only need the first element or a count of array elements, use `$arrayElemAt` or `$size` inside `$project` or `$addFields` instead of `$unwind` which multiplies documents.
- **`$lookup` can be expensive**: Foreign collection scans occur for each document. Ensure the `foreignField` is indexed, and consider using `$lookup` after filtering to reduce the number of input documents.
- **Pipeline readability**: For pipelines with 5+ stages, use structured formatting and comment each stage's purpose. Treat your pipeline like any other complex query — document it.

## Next Steps

- Explore the `$facet` stage for multi-faceted aggregations (multiple pipelines in one pass).
- Learn about MongoDB Change Streams with `$changeStream` for real-time aggregation.
- Try the MongoDB Atlas Search aggregation stages (`$search`, `$searchMeta`) for full-text analytics.
- Review the official [MongoDB Aggregation Pipeline documentation](https://www.mongodb.com/docs/manual/aggregation/).

## Conclusion

You have learned how to build and compose MongoDB Aggregation Pipelines using the most important stages: `$match` for filtering, `$group` for aggregation, `$sort` and `$limit` for ordering, `$unwind` for array processing, `$lookup` for cross-collection joins, `$project` for reshaping, and `$bucket` for histogram generation. By chaining these stages thoughtfully and following performance best practices, you can run sophisticated analytics directly inside MongoDB — no separate data processing infrastructure required. The examples in this tutorial give you a template you can adapt to your own data models and reporting needs.

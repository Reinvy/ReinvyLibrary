---
title: "MongoDB Aggregation Pipeline Cheatsheet"
description: "A comprehensive quick reference for MongoDB's aggregation pipeline — covering all pipeline stages, expression operators, accumulator functions, and real-world pipeline patterns."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# MongoDB Aggregation Pipeline Cheatsheet

## Quick Reference Table

| Stage | Syntax | Description |
|-------|--------|-------------|
| `$match` | `{ $match: { field: value } }` | Filters documents (like `find()`), should be first for performance |
| `$project` | `{ $project: { field: 1, _id: 0 } }` | Selects/shapes fields, can create computed fields |
| `$group` | `{ $group: { _id: "$field", total: { $sum: 1 } } }` | Groups documents by an expression, computes accumulators |
| `$sort` | `{ $sort: { field: 1 } }` | Sorts documents (1=ascending, -1=descending) |
| `$limit` | `{ $limit: 100 }` | Passes only the first N documents |
| `$skip` | `{ $skip: 20 }` | Skips the first N documents |
| `$unwind` | `{ $unwind: "$arrayField" }` | Deconstructs an array into one document per element |
| `$lookup` | `{ $lookup: { from: "collection", localField: "x", foreignField: "y", as: "docs" } }` | Left outer join with another collection |
| `$addFields` | `{ $addFields: { newField: "$existing" } }` | Adds new fields without removing existing ones |
| `$set` | `{ $set: { field: value } }` | Alias for `$addFields`, adds/modifies fields |
| `$unset` | `{ $unset: "field" }` | Removes specified fields from documents |
| `$replaceRoot` | `{ $replaceRoot: { newRoot: "$embedded" } }` | Replaces the entire document with a sub-document |
| `$replaceWith` | `{ $replaceWith: "$embedded" }` | Alias for `$replaceRoot` with a single expression |
| `$count` | `{ $count: "countField" }` | Returns a count of remaining documents |
| `$sample` | `{ $sample: { size: 50 } }` | Randomly selects N documents |
| `$bucket` | `{ $bucket: { groupBy: "$field", boundaries: [0, 100, 200], default: "Other", output: { count: { $sum: 1 } } } }` | Categorizes documents into buckets by boundaries |
| `$bucketAuto` | `{ $bucketAuto: { groupBy: "$field", buckets: 5, output: { count: { $sum: 1 } } } }` | Automatically determines bucket boundaries |
| `$facet` | `{ $facet: { category1: [ pipeline ], category2: [ pipeline ] } }` | Runs multiple sub-pipelines on the same input documents |
| `$sortByCount` | `{ $sortByCount: "$field" }` | Groups by a value, counts, and sorts descending |
| `$graphLookup` | `{ $graphLookup: { from: "coll", startWith: "$id", connectFromField: "parent", connectToField: "_id", as: "ancestors" } }` | Recursive graph traversal (hierarchies, trees) |
| `$out` | `{ $out: "newCollection" }` | Writes pipeline results to a new collection (must be last stage) |
| `$merge` | `{ $merge: { into: "collection", on: "_id", whenMatched: "merge", whenNotMatched: "insert" } }` | Merges results into an existing collection (must be last stage) |
| `$unionWith` | `{ $unionWith: { coll: "otherCollection", pipeline: [] } }` | Combines documents from two collections |
| `$densify` | `{ $densify: { field: "dateField", range: { step: 1, unit: "day" } } }` | Creates missing documents between range boundaries |
| `$fill` | `{ $fill: { output: { field: { method: "linear" } } } }` | Fills null/missing values using adjacent values |
| `$setWindowFields` | `{ $setWindowFields: { partitionBy: "$category", sortBy: { date: 1 }, output: { rank: { $rank: {} } } } }` | Enables window functions (rank, denseRank, documentNumber, shift, etc.) |
| `$documents` | `{ $documents: [{}, {}] }` | Generates literal documents as pipeline input |
| `$vectorSearch` | `{ $vectorSearch: { index: "idx", queryVector: [...], path: "embedding", numCandidates: 100, limit: 10 } }` | Performs vector similarity search (Atlas) |

### Accumulator Expressions (for `$group` and `$bucket`)

| Accumulator | Syntax | Description |
|-------------|--------|-------------|
| `$sum` | `{ $sum: 1 }` or `{ $sum: "$field" }` | Sums numeric values |
| `$avg` | `{ $avg: "$field" }` | Average of numeric values |
| `$first` | `{ $first: "$field" }` | Value from the first document in a group |
| `$last` | `{ $last: "$field" }` | Value from the last document in a group |
| `$max` | `{ $max: "$field" }` | Maximum value |
| `$min` | `{ $min: "$field" }` | Minimum value |
| `$push` | `{ $push: "$field" }` | Returns an array of all values |
| `$addToSet` | `{ $addToSet: "$field" }` | Returns an array of unique values |
| `$stdDevPop` | `{ $stdDevPop: "$field" }` | Population standard deviation |
| `$stdDevSamp` | `{ $stdDevSamp: "$field" }` | Sample standard deviation |
| `$top` | `{ $top: { sortBy: { score: -1 }, output: "$field" } }` | Top N values by sort order (MongoDB 5.2+) |
| `$topN` | `{ $topN: { n: 5, sortBy: { score: -1 }, output: "$field" } }` | Top N documents per group |
| `$bottom` | `{ $bottom: { sortBy: { score: 1 }, output: "$field" } }` | Bottom value by sort |
| `$bottomN` | `{ $bottomN: { n: 5, sortBy: { score: 1 }, output: "$field" } }` | Bottom N documents per group |
| `$count` | `{ $count: {} }` | Counts documents in each group |

### Window Functions (for `$setWindowFields`)

| Function | Description |
|----------|-------------|
| `$rank` | Rank with gaps (1, 1, 3) |
| `$denseRank` | Rank without gaps (1, 1, 2) |
| `$documentNumber` | Sequential document number within partition |
| `$rowNumber` | Alias for `$documentNumber` |
| `$shift` | Access values from adjacent documents (by offset) |
| `$derivative` | Rate of change between consecutive documents |
| `$integral` | Approximate integral of a numeric field |
| `$expMovingAvg` | Exponentially weighted moving average |
| `$linearFill` | Linear interpolation of null/missing values |

## Common Commands

### Running Aggregation Pipelines

```bash
# Basic pipeline in mongosh
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", totalSpent: { $sum: "$amount" } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 10 }
])

# Pipeline with multiple output stages using $facet
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $facet: {
      topCustomers: [
        { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ],
      summary: [
        { $group: { _id: null, avg: { $avg: "$amount" }, total: { $sum: "$amount" } } }
      ]
  }}
])

# Pipeline with $lookup (join)
db.orders.aggregate([
  { $match: { status: "shipped" } },
  { $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customer"
  }},
  { $unwind: "$customer" },
  { $project: { orderTotal: 1, "customer.name": 1, "customer.email": 1 } }
])

# Pipeline with $out (write results to collection)
db.orders.aggregate([
  { $group: { _id: "$region", totalSales: { $sum: "$amount" }, count: { $sum: 1 } } },
  { $out: "sales_by_region" }
])
```

### explain() and Performance Analysis

```bash
# Explain pipeline execution (use in mongosh)
db.orders.explain("executionStats").aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
])

# Check indexes used, docs examined vs returned
# Look for: IXSCAN vs COLLSCAN, totalDocsExamined, executionTimeMillis
```

### Aggregation Pipeline Optimization Flags

```bash
# Allow disk usage for large sorts (exceeds 100MB RAM)
db.orders.aggregate([{ $sort: { amount: -1 } }], { allowDiskUse: true })

# Run with explain mode
db.orders.explain("allPlansExecution").aggregate([...])

# Hint index for $match stage
db.orders.aggregate([{ $match: { status: "active" } }], { hint: { status: 1, date: -1 } })
```

### Working with Dates in Aggregation

```bash
# Group by date parts
db.sales.aggregate([
  { $group: {
      _id: {
        year: { $year: "$date" },
        month: { $month: "$date" },
        day: { $dayOfMonth: "$date" }
      },
      dailyTotal: { $sum: "$amount" }
  }},
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
])

# Group by date truncated to day
db.sales.aggregate([
  { $group: {
      _id: { $dateTrunc: { date: "$date", unit: "day" } },
      total: { $sum: "$amount" }
  }}
])

# Date range filtering
db.events.aggregate([
  { $match: {
      timestamp: {
        $gte: ISODate("2026-01-01"),
        $lt: ISODate("2026-07-01")
      }
  }},
  { $group: { _id: null, avgResponseTime: { $avg: "$responseTime" } } }
])
```

## Code Snippets

### Real-Time Sales Dashboard Pipeline

```javascript
// Sales dashboard: daily revenue + top products + category breakdown
const salesPipeline = [
  { $match: { date: { $gte: startDate, $lte: endDate } } },
  { $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product"
  }},
  { $unwind: "$product" },
  { $facet: {
      dailyRevenue: [
        { $group: {
            _id: { $dateTrunc: { date: "$date", unit: "day" } },
            revenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } },
            orders: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ],
      topProducts: [
        { $group: {
            _id: "$product.name",
            totalSold: { $sum: "$quantity" },
            revenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } }
        }},
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ],
      categoryBreakdown: [
        { $group: {
            _id: "$product.category",
            count: { $sum: 1 },
            totalRevenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } }
        }},
        { $sort: { totalRevenue: -1 } }
      ]
  }}
];
```

### Customer 360 View

```javascript
// Combine orders, support tickets, and page views
db.customers.aggregate([
  { $match: { email: "customer@example.com" } },
  { $lookup: {
      from: "orders",
      let: { custId: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$customerId", "$$custId"] } } },
        { $sort: { createdAt: -1 } },
        { $limit: 20 },
        { $project: { items: 1, total: 1, status: 1, createdAt: 1 } }
      ],
      as: "recentOrders"
  }},
  { $lookup: {
      from: "support_tickets",
      let: { custId: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$customerId", "$$custId"] } } },
        { $sort: { createdAt: -1 } },
        { $limit: 10 }
      ],
      as: "supportHistory"
  }},
  { $addFields: {
      totalSpent: { $sum: "$recentOrders.total" },
      orderCount: { $size: "$recentOrders" },
      isVip: { $gte: [{ $sum: "$recentOrders.total" }, 10000] }
  }},
  { $project: {
      name: 1, email: 1, totalSpent: 1, orderCount: 1,
      isVip: 1, recentOrders: 1, supportHistory: 1
  }}
]);
```

### Conditional Logic with $cond and $switch

```javascript
// Grade calculation with $switch
db.exams.aggregate([
  { $project: {
      student: 1,
      score: 1,
      grade: {
        $switch: {
          branches: [
            { case: { $gte: ["$score", 90] }, then: "A" },
            { case: { $gte: ["$score", 80] }, then: "B" },
            { case: { $gte: ["$score", 70] }, then: "C" },
            { case: { $gte: ["$score", 60] }, then: "D" }
          ],
          default: "F"
        }
      },
      passed: { $cond: [{ $gte: ["$score", 60] }, true, false] },
      result: {
        $cond: {
          if: { $gte: ["$score", 70] },
          then: "Pass",
          else: { $cond: [{ $gte: ["$score", 60] }, "Conditional Pass", "Fail"] }
        }
      }
  }}
]);

// Pricing with conditional discount
db.orders.aggregate([
  { $addFields: {
      discountPercent: {
        $cond: [
          { $gte: ["$total", 1000] }, 20,
          { $cond: [
            { $gte: ["$total", 500] }, 10, 0
          ]}
        ]
      },
      shipping: {
        $cond: [
          { $gte: ["$total", 50] }, 0, 9.99
        ]
      }
  }},
  { $addFields: {
      finalTotal: {
        $subtract: [
          "$total",
          { $divide: [{ $multiply: ["$total", "$discountPercent"] }, 100] }
        ]
      }
  }}
]);
```

### Array Processing with $unwind and $group

```javascript
// Flatten arrays and compute per-element statistics
db.orders.aggregate([
  { $match: { status: "delivered" } },
  // Deconstruct order items array
  { $unwind: { path: "$items", includeArrayIndex: "itemIndex" } },
  // Group by product across all orders
  { $group: {
      _id: "$items.productId",
      productName: { $first: "$items.name" },
      totalSold: { $sum: "$items.quantity" },
      totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
      avgUnitPrice: { $avg: "$items.price" },
      orderCount: { $sum: 1 },
      firstOrdered: { $min: "$date" },
      lastOrdered: { $max: "$date" }
  }},
  { $sort: { totalRevenue: -1 } },
  { $limit: 20 }
]);

// Find orders where a specific product was bought together with others
db.orders.aggregate([
  { $match: { "items.productId": "PROD_A" } },
  { $unwind: "$items" },
  { $match: { "items.productId": { $ne: "PROD_A" } } },
  { $group: {
      _id: "$items.productId",
      coOccurrenceCount: { $sum: 1 },
      totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
  }},
  { $sort: { coOccurrenceCount: -1 } },
  { $limit: 10 }
]);
```

### Time-Series Analysis with $setWindowFields

```javascript
// Moving average and cumulative sum over time
db.stock_prices.aggregate([
  { $match: { symbol: "AAPL" } },
  { $sort: { date: 1 } },
  { $setWindowFields: {
      partitionBy: "$symbol",
      sortBy: { date: 1 },
      output: {
        // 7-day moving average of closing price
        ma7: {
          $avg: "$close",
          window: { documents: [-6, 0] }
        },
        // Cumulative volume
        cumulativeVolume: {
          $sum: "$volume",
          window: { documents: ["unbounded", "current"] }
        },
        // Day-over-day price change
        priceChange: {
          $derivative: { input: "$close", unit: "day" }
        },
        // Rank by performance
        rank: { $rank: {} },
        // Exponentially weighted moving average
        ewma: {
          $expMovingAvg: { input: "$close", N: 20 }
        }
      }
  }}
]);
```

### Hierarchical Data with $graphLookup

```javascript
// Employee hierarchy — find all direct and indirect reports
db.employees.aggregate([
  { $match: { name: "Alice Johnson" } },
  { $graphLookup: {
      from: "employees",
      startWith: "$_id",
      connectFromField: "_id",
      connectToField: "managerId",
      maxDepth: 10,
      depthField: "level",
      as: "subordinates"
  }},
  { $project: {
      name: 1,
      subordinateCount: { $size: "$subordinates" },
      subordinates: {
        $map: {
          input: "$subordinates",
          as: "sub",
          in: { name: "$$sub.name", level: "$$sub.level", role: "$$sub.role" }
        }
      }
  }}
]);

// Category tree — find all parent categories
db.categories.aggregate([
  { $match: { _id: "electronics.smartphones.iphone" } },
  { $graphLookup: {
      from: "categories",
      startWith: "$parentId",
      connectFromField: "parentId",
      connectToField: "_id",
      as: "ancestors"
  }},
  { $project: {
      name: 1,
      fullPath: { $concatArrays: ["$ancestors.name", ["$name"]] }
  }}
]);
```

### Data Transformation and Enrichment

```javascript
// Convert string prices to numeric and add computed fields
db.raw_products.aggregate([
  { $match: { status: "active" } },
  { $addFields: {
      priceNumeric: { $toDouble: "$priceString" },
      inStock: { $toBool: "$stockCount" },
      categories: {
        $cond: {
          if: { $isArray: "$tags" },
          then: "$tags",
          else: { $split: ["$tags", ","] }
        }
      },
      slug: {
        $toLower: {
          $replaceAll: { input: "$name", find: " ", replacement: "-" }
        }
      }
  }},
  { $project: {
      name: 1, slug: 1, price: "$priceNumeric",
      inStock: 1, categories: 1,
      // Tier pricing based on quantity
      tierPricing: {
        basic: { $round: ["$priceNumeric", 2] },
        premium: { $round: [{ $multiply: ["$priceNumeric", 1.2] }, 2] },
        enterprise: { $round: [{ $multiply: ["$priceNumeric", 0.85] }, 2] }
      }
  }}
]);

// Geo-distance aggregation
db.places.aggregate([
  { $geoNear: {
      near: { type: "Point", coordinates: [-73.97, 40.77] },
      distanceField: "distance",
      maxDistance: 5000,
      spherical: true,
      key: "location"
  }},
  { $group: {
      _id: "$category",
      count: { $sum: 1 },
      avgDistance: { $avg: "$distance" },
      places: { $push: { name: "$name", dist: "$distance" } }
  }},
  { $sort: { count: -1 } }
]);
```

### Schema Analysis and Data Quality

```javascript
// Analyze field types and null rates across a collection
db.collection.aggregate([
  { $sample: { size: 1000 } },
  { $project: {
      fieldTypes: { $objectToArray: { $literal: { field1: { $type: "$field1" }, field2: { $type: "$field2" } } } },
      nullFields: {
        $objectToArray: {
          $literal: {
            field1: { $cond: [{ $eq: ["$field1", null] }, 1, 0] },
            field2: { $cond: [{ $eq: ["$field2", null] }, 1, 0] }
          }
        }
      }
  }}
]);

// Detect outliers using standard deviation
db.sensor_readings.aggregate([
  { $match: { sensorId: "TEMP_001" } },
  { $group: {
      _id: null,
      avg: { $avg: "$value" },
      stdDev: { $stdDevSamp: "$value" },
      min: { $min: "$value" },
      max: { $max: "$value" }
  }},
  { $project: {
      lowerBound: { $subtract: ["$avg", { $multiply: [3, "$stdDev"] }] },
      upperBound: { $add: ["$avg", { $multiply: [3, "$stdDev"] }] }
  }}
]);
```

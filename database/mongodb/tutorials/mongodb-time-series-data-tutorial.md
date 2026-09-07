---
title: "MongoDB Time Series Data Management"
description: "An advanced tutorial on modeling, ingesting, querying, compressing, and retaining time series data with MongoDB time series collections — including a complete IoT sensor example."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# MongoDB Time Series Data Management

## Summary

This tutorial teaches you how to model and manage time series data natively in MongoDB using time series collections. You will learn the bucketing model behind the scenes, how measurement and timestamp fields drive storage and compression, and how to query, aggregate, and expire IoT sensor data efficiently, ending with a complete runnable example.

## Target Audience

- Backend and data engineers building IoT, observability, or financial tick-data systems.
- Developer level: Advanced — comfortable with MongoDB aggregation pipelines and schema design.

## Prerequisites

- MongoDB 5.0 or newer (time series collections are GA since MongoDB 5.0).
- `mongosh` installed, and a running `mongod` instance.
- Solid understanding of MongoDB documents, indexes, and the aggregation pipeline.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Design a time series collection with the right `timeField`, `metaField`, and `granularity`.
- Explain how the internal bucketing model enables compression and fast range scans.
- Ingest high-frequency IoT data and handle insert errors gracefully.
- Run raw-range and bucketed aggregation queries over timestamped data.
- Implement retention with TTL indexes and data-expiry strategies.

## Context and Motivation

IoT fleets, application metrics, and financial feeds produce millions of timestamped measurements per day. Storing each measurement as a standalone document wastes storage, bloats indexes, and slows range queries. Before MongoDB 5.0, teams solved this by manually bucketing documents or offloading to specialized databases — adding operational complexity.

MongoDB time series collections solve this natively: the server automatically groups measurements that share a timestamp window and metadata into buckets, compresses them column-wise, and exposes the data through a normal collection API. You get a real time series database without leaving MongoDB's query language, drivers, or replication story.

## Core Content

### Collection Structure: Measurement and Timestamp

- `timeField` (required): the field holding the measurement timestamp. It must be of BSON Date type and serves as the primary sort key.
- `metaField` (optional): a field whose value is shared by a series of measurements, typically a device ID or metric name. Meta values are stored once per bucket instead of once per document — a major space saving.
- `granularity`: how closely measurements are spaced in time — `seconds`, `minutes`, or `hours`. It sets the default bucket window (1 hour, 1 day, or 30 days respectively) and should match your ingestion cadence.

### The Bucketing Model and Compression

Internally, every time series collection is backed by an ordinary collection of buckets. MongoDB groups incoming measurements whose timestamps fall inside the same window and share the same meta value, then stores each field as a column (array). Column-oriented storage compresses extremely well because adjacent values are numerically similar — 22.1, 22.1, 22.2 compresses far better than 22.1, 87.4, -3.0.

Bucketing changes the economics of writes: disk footprint shrinks dramatically, index entries become per-bucket instead of per-measurement, and range queries scan far fewer documents. Compression is automatic; your queries never see the buckets.

### Querying with the Aggregation Pipeline

You query a time series collection with `find()` for raw point lookups and with the aggregation pipeline for bucketed analytics. Key stages are `$match` (narrow meta value and time range), `$dateTrunc` (snap timestamps to bucket boundaries), and `$group` (aggregate per bucket), backed by an automatic index on `metaField` plus `timeField`.

### Retention with TTL Expiry

Time series data decays in value: yesterday's readings are rarely needed at full resolution. MongoDB supports TTL indexes directly on the `timeField` of a time series collection, so expired buckets are deleted automatically by a background job.

## Code Examples

### Creating a Time Series Collection

Run this in `mongosh`, handling the "already exists" error:
```javascript
use iot
try {
  db.createCollection('sensor_readings', {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'metadata',
      granularity: 'seconds'
    }
  });
  print('Time series collection created.');
} catch (err) {
  if (err.codeName === 'NamespaceExists') {
    print('Collection already exists; skipping creation.');
  } else {
    throw err;
  }
}
```

### Ingesting Simulated IoT Sensor Data

Simulate a fleet of sensors writing one measurement every 5 seconds, with bulk inserts:
```javascript
use iot
const SENSORS = ['sensor-1', 'sensor-2', 'sensor-3'];
const readings = [];
const now = new Date();
for (let i = 0; i < 1000; i++) {
  const sensor = SENSORS[i % SENSORS.length];
  readings.push({
    timestamp: new Date(now.getTime() - (i * 5000)),
    metadata: { sensor_id: sensor, zone: 'factory-a' },
    temperature: 20 + Math.random() * 15,
    humidity: 40 + Math.random() * 30
  });
}
try {
  const result = db.sensor_readings.insertMany(readings, { ordered: false });
  print(`Inserted ${result.insertedCount} readings.`);
} catch (err) {
  if (err.code === 11000 || err.writeErrors) {
    print(`Skipped ${err.insertedDocs ? err.insertedDocs.length : 0} duplicates.`);
  } else {
    throw err;
  }
}
```

### Querying: Raw Range Queries
```javascript
use iot
const since = new Date(Date.now() - 15 * 60 * 1000);
db.sensor_readings
  .find({ 'metadata.sensor_id': 'sensor-1', timestamp: { $gte: since } })
  .sort({ timestamp: 1 })
  .limit(50);
```

### Querying: Bucketed Aggregations
```javascript
use iot
db.sensor_readings.aggregate([
  { $match: { 'metadata.zone': 'factory-a' } },
  {
    $group: {
      _id: {
        sensor: '$metadata.sensor_id',
        hour: { $dateTrunc: { date: '$timestamp', unit: 'hour' } }
      },
      avgTemperature: { $avg: '$temperature' },
      maxHumidity: { $max: '$humidity' },
      samples: { $count: {} }
    }
  },
  { $sort: { '_id.hour': 1 } }
]);
```

### Retention with a TTL Index
```javascript
use iot
try {
  db.sensor_readings.createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 30 }
  );
  print('TTL index created: measurements expire after 30 days.');
} catch (err) {
  print(`TTL index creation failed: ${err.message}`);
}
```

## Key Insights

- Choose `granularity` to match ingestion cadence; wrong granularity wastes bucket space and hurts compression.
- Keep `metaField` cardinality bounded: a high-cardinality meta (like `request_id`) creates a bucket per value and destroys compression — use device IDs or metric names.
- `$dateTrunc` is the idiomatic bucketing tool; avoid ad-hoc date math in `$group` `_id`, which is harder to index and read.
- Measurement documents are append-only; schema fields cannot be updated, and time series collections do not support transactions — keep ingest idempotent.
- TTL expiry runs in the background every ~60 seconds, so retention is not byte-exact to the second.

## Next Steps

- Study MongoDB replica sets and sharding to scale time series workloads horizontally.
- Explore aggregation pipeline windowing and forecasting patterns for advanced analytics.
- Learn about change streams to react to anomaly thresholds in real time.

## Conclusion

You can now create a time series collection with a proper bucket schema, ingest simulated IoT readings, run raw and bucketed aggregations, and configure TTL retention — a complete, production-shaped workflow for time series data.

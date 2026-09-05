---
title: "Geospatial Queries with MongoDB"
description: "A deep dive into MongoDB geospatial queries — GeoJSON data modeling, 2dsphere indexes, proximity and containment operators, the $geoNear aggregation stage, and building location-aware applications."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Geospatial Queries with MongoDB

## Summary

This tutorial explores MongoDB's geospatial capabilities in depth. You will learn how to model locations with GeoJSON, build `2dsphere` indexes, run proximity queries with `$near` and `$nearSphere`, test containment with `$geoWithin`, find intersecting geometries with `$geoIntersects`, and use the `$geoNear` aggregation stage to power location-aware features such as store locators, geo-fencing, and nearest-driver matching. By the end, you will be able to design and tune geospatial workloads that scale.

## Target Audience

- Backend Developers and Database Administrators building location-aware applications.
- Advanced level: comfortable with MongoDB CRUD operations, indexes, and the aggregation framework.

## Prerequisites

- MongoDB installed locally (version 5.0+) or access to MongoDB Atlas.
- A running `mongosh` session with a sample database loaded.
- Solid understanding of `db.collection.find()`, `db.collection.aggregate()`, and MongoDB document structure.
- Familiarity with basic indexing concepts (single-field and compound indexes).

## Learning Objectives

By the end of this tutorial, you will be able to:
- Model GeoJSON documents correctly, including the WGS84 coordinate reference system and longitude-latitude order.
- Create and maintain `2dsphere` indexes, including compound and sparse variants.
- Run proximity queries with `$near` and `$nearSphere`, and understand their sorting guarantees.
- Test containment and intersection with `$geoWithin` and `$geoIntersects`.
- Build rich geospatial aggregations with the `$geoNear` stage.
- Diagnose geospatial performance with `explain()` and avoid the classic coordinate-order and index pitfalls.

## Context and Motivation

Modern applications are increasingly location-aware. A ride-hailing app must find the nearest available driver, a food-delivery service must determine which restaurants fall inside a delivery zone, an e-commerce platform must show nearby stores, and a fleet tracker must detect when a vehicle enters a restricted area. Classic database approaches struggle with these workloads: bounding-box math in application code is slow, imprecise, and impossible to index efficiently.

MongoDB solves this with native geospatial support built directly into the query engine. Locations are stored as **GeoJSON** objects, indexed with a **`2dsphere`** index, and queried with dedicated operators that evaluate real distance on the surface of a sphere. The database does the heavy math — you simply describe the geometry you care about. This tutorial teaches you to use those tools correctly and efficiently so your location features stay fast as data grows.

## Core Content

### Understanding the GeoJSON Data Model

MongoDB stores locations using the GeoJSON specification. Every GeoJSON geometry has a `type` and a `coordinates` array, and the shape of `coordinates` depends on the type.

```text
| Geometry      | coordinates format                                         | Example use case            |
|---------------|------------------------------------------------------------|-----------------------------|
| Point         | [longitude, latitude]                                      | A store, a driver, a sensor |
| LineString    | array of Point positions                                   | A route, a road, a river    |
| Polygon       | array of linear rings (first ring = exterior, others = holes) | A delivery zone, a campus |
| MultiPolygon  | array of Polygons                                          | A country with islands      |
```

Three rules matter more than anything else:

1. **Order is longitude, then latitude.** GeoJSON mandates `[lng, lat]`. For Jakarta, that is `[106.822, -6.175]` — not the other way around. Swapping them silently places your data on the opposite side of the globe.
2. **Use the WGS84 coordinate reference system.** GeoJSON coordinates are always WGS84 (the same system used by GPS). If your data comes from a projected system such as UTM, convert it before storing.
3. **Polygons must be closed and follow the right-hand rule.** The first and last position of a ring must be identical, and the exterior ring must be oriented counter-clockwise. MongoDB rejects invalid polygons with a clear error.

A minimal location document looks like this:

```javascript
// A cafe document with a GeoJSON Point
db.cafes.insertOne({
  name: "Kopi Senja",
  cuisine: "coffee",
  location: {
    type: "Point",
    coordinates: [106.822, -6.175]
  }
})
```

For convenience, MongoDB assigns a default `location` field name to the first geospatial index you create, but the field itself is a normal embedded document — you can name it anything (`geo`, `position`, `address.coordinates`).

### Creating a 2dsphere Index

A `2dsphere` index supports all GeoJSON query operators and computes distances on a spherical model of the earth. It is almost always the right choice; the legacy `2d` index only supports planar coordinates and should only be used for legacy data.

```javascript
// Create a 2dsphere index on the location field
db.cafes.createIndex({ location: "2dsphere" })

// Compound 2dsphere index — spatial + non-spatial predicates together
db.cafes.createIndex({ location: "2dsphere", cuisine: 1 })

// Sparse 2dsphere index — skip documents without a location field
db.cafes.createIndex({ location: "2dsphere" }, { sparse: true })
```

A compound geospatial index lets MongoDB satisfy a spatial filter and a regular filter (like `cuisine: "coffee"`) in a single index scan. The geospatial field must come **first** in the compound index — MongoDB only supports geospatial as the leading key.

### Proximity Queries with $near and $nearSphere

Use `$near` with `2dsphere` indexes to find documents ordered by distance. The results are automatically sorted from nearest to farthest, and MongoDB requires a geospatial index — otherwise the query errors.

```javascript
// Find cafes within 5 km of a point, nearest first
db.cafes.find(
  {
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [106.822, -6.175] },
        $maxDistance: 5000,  // meters
        $minDistance: 100    // optional: exclude the exact point
      }
    }
  },
  { name: 1, cuisine: 1 }
).limit(10)
```

There are two proximity operators:

- **`$near`** — planar distance calculation. It works with both `2dsphere` and `2d` indexes, so when used with `2dsphere` it does NOT respect the spherical earth model.
- **`$nearSphere`** — spherical distance calculation on the surface of the earth. Always prefer `$nearSphere` with `2dsphere` indexes for real-world accuracy.

```javascript
// Spherical variant — the correct choice for global-distance queries
db.cafes.find(
  {
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [106.822, -6.175] },
        $maxDistance: 5000
      }
    }
  },
  { name: 1 }
)
```

Both operators return results sorted by distance, which means you should NOT combine them with `$orderby` — it forces a separate index and produces unpredictable ordering. If you need a different sort, use the `$geoNear` aggregation stage instead.

### Containment Queries with $geoWithin

`$geoWithin` finds documents whose geometry lies entirely within a defined shape. It does not require the result to be sorted, it works without a geospatial index on legacy shapes (`$box`), and it is the operator of choice for geo-fencing, delivery zones, and administrative boundaries.

```javascript
// Find cafes inside a rectangular bounding box
db.cafes.find({
  location: {
    $geoWithin: {
      $box: [
        [106.70, -6.30],
        [106.95, -6.00]
      ]
    }
  }
})

// Find cafes inside a circular radius (planar)
db.cafes.find({
  location: {
    $geoWithin: {
      $center: [[106.822, -6.175], 0.05]  // radius in radians
    }
  }
})

// Find cafes inside a spherical circle — the accurate form
db.cafes.find({
  location: {
    $geoWithin: {
      $centerSphere: [[106.822, -6.175], 5 / 6378.1]  // km / earth radius in km
    }
  }
})
```

For polygon boundaries you have two options: embed the polygon in the query (`$polygon`) or match against a stored polygon document (`$geoIntersects` or `$geoWithin` with a geometry field). The legacy `$polygon` operator is planar-only and does not support holes; prefer storing real GeoJSON polygons.

### Intersection Queries with $geoIntersects

`$geoIntersects` finds documents whose geometry shares any space with a given geometry. Unlike `$geoWithin` (documents inside the shape), `$geoIntersects` also returns documents that merely touch or cross the boundary. It is the right operator when both the stored documents and the query shape are arbitrary geometries — routes crossing a zone, parcels overlapping a flood area, or drivers passing through a pick-up region.

```javascript
// Find delivery routes that intersect a restricted zone
db.routes.find({
  path: {
    $geoIntersects: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [106.80, -6.20],
          [106.90, -6.20],
          [106.90, -6.10],
          [106.80, -6.10],
          [106.80, -6.20]
        ]]
      }
    }
  }
})
```

Design rule of thumb: use `$geoWithin` when the question is "is this point inside my zone?" and `$geoIntersects` when the question is "do these two geometries overlap?"

### The $geoNear Aggregation Stage

The aggregation stage `$geoNear` is the most flexible geospatial tool. It requires a `2dsphere` index, must be the **first** stage in the pipeline, and returns a computed `distanceField` on every document.

```javascript
db.cafes.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [106.822, -6.175] },
      distanceField: "distanceMeters",
      maxDistance: 5000,
      minDistance: 100,
      spherical: true,
      query: { cuisine: "coffee" },
      key: "location",
      includeLocs: "location"
    }
  },
  { $sort: { distanceMeters: 1 } },
  { $limit: 5 },
  {
    $project: {
      name: 1,
      distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] }
    }
  }
])
```

Key options:

- **`near`** — the reference GeoJSON point.
- **`distanceField`** — the field name added to each result holding the distance in meters.
- **`spherical: true`** — use spherical distance calculation; always set this with `2dsphere`.
- **`query`** — additional filter applied before distance computation.
- **`key`** — which geospatial index to use when a collection has several.
- **`includeLocs`** — return the matched location, useful when documents store multiple coordinates.

Because `$geoNear` computes distance as a real field, you can sort, round, bucket, or filter on it — something the find operators cannot do.

### Multi-Location Documents and Arrays

A document can store several GeoJSON geometries in an array, and a `2dsphere` index covers every element:

```javascript
db.stores.insertOne({
  name: "Toko Makmur",
  locations: [
    { type: "Point", coordinates: [106.822, -6.175] },
    { type: "Point", coordinates: [106.845, -6.230] }
  ]
})

// Matches if ANY location is within the radius
db.stores.find({
  locations: {
    $nearSphere: {
      $geometry: { type: "Point", coordinates: [106.822, -6.175] },
      $maxDistance: 2000
    }
  }
})
```

For GeoJSON polygons, large geometries such as country borders should typically be stored in a separate collection from small high-cardinality points (like users), because a single huge polygon document can bloat the index and slow down every write.

### Performance and Index Tuning

Always verify geospatial plans with `explain()`:

```javascript
db.cafes.find({
  location: {
    $nearSphere: {
      $geometry: { type: "Point", coordinates: [106.822, -6.175] },
      $maxDistance: 5000
    }
  }
}).explain("executionStats")
```

Read the output for `"stage": "GEO_NEAR_2DSPHERE"` and a high `docsExamined` vs `nReturned` ratio. If the stage is `COLLSCAN` and the query did not error, the index is missing or the operator does not support the shape (for example, `$near` cannot use a `2d` index for GeoJSON data).

Additional tuning rules:

- Put the geospatial field first in compound indexes; the non-geospatial fields follow as post-filter keys.
- Use `$maxDistance` — unbounded proximity queries scan large index ranges.
- Keep sorted results by using `$near`/`$nearSphere` without `$orderby`, or do the sort with `$geoNear`.
- Use sparsity (`sparse: true`) to avoid indexing documents without coordinates.

### Common Pitfalls

- **Swapped coordinates**: always store `[longitude, latitude]`. A quick sanity check: for Indonesia, longitude is around 95–141 and latitude around −11 to +6. If your latitude looks like 106, you swapped them.
- **`$near` in `$or` clauses**: `$near`/`$nearSphere` cannot be combined with the `$or` operator because the geospatial index cannot service both branches at once. Use unions of `$geoWithin` or the aggregation framework instead.
- **Wrong radius units**: `$maxDistance`/`$minDistance` in `$near` are meters with `2dsphere`. For `$centerSphere`, the radius is in radians — convert by dividing the distance by the earth's radius (6,378.1 km).
- **Missing index errors**: geospatial operators either require an index or silently fall back to `COLLSCAN` depending on the operator. Create the `2dsphere` index before relying on any geospatial query.
- **Polygon validity**: unclosed rings and clockwise exterior rings produce "Invalid polygon" errors. Validate geometries at write time.
- **Planar vs spherical**: `$near` with a `2dsphere` index is planar — use `$nearSphere` (or `$geoNear` with `spherical: true`) when accuracy across large distances matters.

## Code Examples

### Complete Example 1: Nearest Cafes with Distance

```javascript
// Seed sample data
db.cafes.deleteMany({})
db.cafes.insertMany([
  { name: "Kopi Senja", cuisine: "coffee", location: { type: "Point", coordinates: [106.822, -6.175] } },
  { name: "Kopi Pagi", cuisine: "coffee", location: { type: "Point", coordinates: [106.845, -6.230] } },
  { name: "Teh Sore", cuisine: "tea", location: { type: "Point", coordinates: [106.800, -6.210] } },
  { name: "Kopi Malam", cuisine: "coffee", location: { type: "Point", coordinates: [106.815, -6.160] } }
])

// Geospatial index
db.cafes.createIndex({ location: "2dsphere" })

// Nearest 3 coffee shops within 10 km
db.cafes.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [106.822, -6.175] },
      distanceField: "distance",
      maxDistance: 10000,
      spherical: true,
      query: { cuisine: "coffee" }
    }
  },
  { $limit: 3 },
  { $project: { name: 1, distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] } } }
])
```

Output:

```text
{ "_id": ..., "name": "Kopi Senja", "distanceKm": 0 }
{ "_id": ..., "name": "Kopi Malam", "distanceKm": 1.68 }
{ "_id": ..., "name": "Kopi Pagi", "distanceKm": 6.38 }
```

### Complete Example 2: Geo-Fencing Deliveries

```javascript
// A delivery zone stored as a GeoJSON polygon
db.zones.insertOne({
  name: "Zone Sudirman",
  area: {
    type: "Polygon",
    coordinates: [[
      [106.80, -6.20],
      [106.90, -6.20],
      [106.90, -6.10],
      [106.80, -6.10],
      [106.80, -6.20]
    ]]
  }
})

// A courier reporting its current position
db.couriers.insertOne({
  name: "Budi",
  position: { type: "Point", coordinates: [106.85, -6.15] }
})

db.couriers.createIndex({ position: "2dsphere" })

// Is Budi inside the zone?
db.couriers.find({
  position: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [106.80, -6.20],
          [106.90, -6.20],
          [106.90, -6.10],
          [106.80, -6.10],
          [106.80, -6.20]
        ]]
      }
    }
  }
}, { name: 1 })
```

Because the query polygon is embedded, this works for any shape without reading the zone collection first. For dynamic zone lists, `$geoIntersects` against the stored `zones.area` is cleaner:

```javascript
db.zones.find({
  area: {
    $geoIntersects: {
      $geometry: { type: "Point", coordinates: [106.85, -6.15] }
    }
  }
}, { name: 1 })
```

### Complete Example 3: Nearby Drivers with the Node.js Driver

```javascript
const { MongoClient } = require("mongodb");

async function findNearestDrivers(lng, lat, maxDistanceMeters) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db("ridehailing");
  const drivers = db.collection("drivers");

  const cursor = drivers.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        maxDistance: maxDistanceMeters,
        spherical: true,
        query: { available: true }
      }
    },
    { $limit: 5 },
    { $project: { name: 1, vehicle: 1, distance: 1 } }
  ]);

  const results = await cursor.toArray();
  await client.close();
  return results;
}

findNearestDrivers(106.822, -6.175, 5000).then(console.log);
```

## Key Insights

- Best practice: always store GeoJSON with WGS84 coordinates in `[longitude, latitude]` order and create a `2dsphere` index on the location field before running any geospatial query.
- Best practice: prefer spherical operators (`$nearSphere`, `$geoWithin` with `$centerSphere`, `$geoNear` with `spherical: true`) whenever distances cross more than a few kilometers; planar math distorts results at scale.
- Gotcha: `$near` results are implicitly distance-sorted, so pairing them with `$orderby` breaks ordering guarantees and can silently change your results.
- Architectural warning: do not embed huge polygon documents (country borders, complex districts) in the same collection as millions of point documents — the index bloat slows writes for the entire collection.
- Performance consideration: use `$maxDistance` religiously, examine `explain("executionStats")` for the `GEO_NEAR_2DSPHERE` stage, and design compound indexes with the geospatial field first.

## Next Steps

- Deepen your aggregation skills with the MongoDB Aggregation Pipeline tutorial in this repository.
- Compare geospatial index design with general indexing rules in the MongoDB Indexing Strategies tutorial.
- Explore the MongoDB Development Syllabus or the Advanced MongoDB Syllabus for a structured learning path.
- Consider combining geospatial queries with Change Streams to react to location updates in real time.

## Conclusion

MongoDB's geospatial engine turns difficult spatial problems into ordinary queries. By modeling locations as GeoJSON, indexing them with `2dsphere`, and choosing the right operator — `$nearSphere` for proximity, `$geoWithin` for containment, `$geoIntersects` for overlap, and `$geoNear` when you need distances as data — you can build store locators, geo-fencing, and nearest-resource matching features that stay fast at scale. The two habits that protect you most are storing coordinates in the correct order and verifying every geospatial plan with `explain()`.

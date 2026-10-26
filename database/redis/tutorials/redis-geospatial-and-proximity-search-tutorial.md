---
title: "Redis Geospatial and Proximity Search Tutorial"
description: "Index latitude and longitude in Redis with GEOADD, query radius and box areas with GEOSEARCH, and build a store locator that answers distance questions in milliseconds."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Redis Geospatial and Proximity Search Tutorial

## Summary

This tutorial shows how to store coordinates in a Redis sorted set and query them by distance. You will build a store locator that answers "which branches are within 5 km?" using `GEOADD`, `GEOSEARCH`, and `GEOSEARCHSTORE`, and you will learn why the index stays fast as it grows.

## Target Audience

- Backend and platform developers who already use Redis as a cache or a primary datastore.
- Intermediate level: comfortable with Redis commands and at least one client library.

## Prerequisites

- Redis 6.2 or newer, so that `GEOSEARCH` is available (`GEORADIUS` exists since 3.2 but is deprecated).
- Node.js 18+ with the `redis` package, or `redis-cli` for the manual steps.
- Basic familiarity with sorted sets (`ZADD`, `ZRANGE`, `ZSCORE`).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Add and update geospatial members with `GEOADD` and read coordinates back.
- Run radius and bounding-box queries in metres, kilometres, miles, or feet.
- Cache query results into a new key with `GEOSEARCHSTORE`.
- Explain how geohash encoding turns proximity search into a sorted-set range scan.

## Context and Motivation

Every consumer product eventually needs "near me" search: stores, drivers, restaurants, charging stations. The naive implementation loads every row with coordinates and computes Haversine distance in the application — fine for 500 records, fatal for 5 million.

Redis layers a geospatial index on top of a sorted set. Coordinates become a 52-bit geohash integer stored as the score, so a radius query turns into a handful of range scans plus a distance filter. The result is sub-millisecond lookups over millions of points with no extra infrastructure.

## Core Content

### How the index is stored

A geospatial key is an ordinary sorted set. The member is your identifier (a store id) and the score is the 52-bit interleaved geohash of latitude and longitude. Because the score is ordered, nearby points land in nearby score ranges — that is the whole trick. `ZREM`, `ZSCORE`, and `DEL` still work, and mixing geospatial with plain members is allowed but rarely wise.

### Adding points

`GEOADD key longitude latitude member` takes **longitude first**. Swapping the two is the most common bug in this API: latitude must sit between -85.05112878 and 85.05112878, and longitudes outside -180..180 are rejected. `GEOADD` is variadic — one call can insert thousands of points — and re-adding an existing member updates its position.

### Querying

`GEOSEARCH` takes a centre (`FROMMEMBER` or `FROMLONLAT`), a shape (`BYRADIUS` or `BYBOX`), a unit, and modifiers: `ASC`/`DESC`, `COUNT n [ANY]`, `WITHCOORD`, `WITHDIST`, `WITHHASH`. `BYBOX` maps directly onto the geohash cell grid and suits map viewports; `BYRADIUS` needs a distance filter on the candidates. `COUNT n ANY` returns as soon as `n` matches exist — right for autocomplete, wrong when you need the truly nearest store.

### Persisting results

`GEOSEARCHSTORE destination source ... STOREDIST` writes matches into a new sorted set scored by distance instead of geohash. That buys server-side pagination via `ZRANGE ... LIMIT`, or a short-lived cache other requests can reuse.

## Code Examples

Seed three Jakarta branches and query them from `redis-cli`:

```bash
redis-cli GEOADD stores:jakarta \
    106.8229 -6.1944 "store-monas" \
    106.8456 -6.2088 "store-thamrin" \
    106.7972 -6.2615 "store-kemang"

# Stores within 3 km, nearest first, distance in km
redis-cli GEOSEARCH stores:jakarta FROMLONLAT 106.8271 -6.1754 \
    BYRADIUS 3 km ASC WITHDIST WITHCOORD COUNT 10

# Cache the result as a distance-scored sorted set
redis-cli GEOSEARCHSTORE nearby:monas stores:jakarta \
    FROMMEMBER store-monas BYRADIUS 10 km ASC STOREDIST
```

A locator endpoint with validation, sorting, and error handling:

```javascript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
redis.on('error', (err) => console.error('Redis error:', err.message));

function assertFinite(value, name, min, max) {
    if (!Number.isFinite(value) || value < min || value > max) {
        throw new RangeError(`${name} must be between ${min} and ${max}`);
    }
}

export async function findNearbyStores(client, { lat, lng, radiusKm = 5, limit = 10 }) {
    const latitude = Number.parseFloat(lat);
    const longitude = Number.parseFloat(lng);
    assertFinite(latitude, 'latitude', -85.05, 85.05);
    assertFinite(longitude, 'longitude', -180, 180);
    assertFinite(radiusKm, 'radiusKm', 0.1, 100);

    try {
        const results = await client.geoSearchWith(
            'stores:jakarta',
            { longitude, latitude },
            { radius: radiusKm, unit: 'km' },
            ['WITHDIST'],
            { SORT: 'ASC', COUNT: limit }
        );
        return results.map((entry) => ({
            store: entry.member,
            distanceKm: Number(entry.distance),
        }));
    } catch (err) {
        console.error('geoSearchWith failed:', err.message);
        throw new Error('store lookup unavailable');
    }
}

await redis.connect();
try {
    const nearby = await findNearbyStores(redis, { lat: '-6.1754', lng: '106.8271' });
    console.table(nearby);
} finally {
    await redis.quit();
}
```

Bulk indexing in a single pipeline keeps a full reload fast:

```javascript
async function indexStores(client, stores) {
    const multi = client.multi();
    for (const s of stores) {
        multi.geoAdd('stores:jakarta', { longitude: s.lng, latitude: s.lat, member: s.id });
    }
    const replies = await multi.exec();
    console.log(`indexed ${replies.length} stores`);
}
```

## Key Insights

- **Longitude comes first** in every command and client helper. Validate the range at the edge of your API.
- **Precision is about 0.6 metres** at 52 bits — well below GPS accuracy, so do not add a second index "for precision".
- **`COUNT ... ANY` trades correctness for speed.** Use it for "some stores nearby", never for "the closest store".
- **Distances are straight-line.** For driving distance, use the index as a candidate filter, then call a routing engine on the shortlist.
- **One key per region** keeps queries small; a single global key works but scans more geohash cells per query.

## Next Steps

- Cache `GEOSEARCHSTORE` results with a TTL so repeated map pans never touch Redis twice.
- Read the Redis data modeling guide to choose between one key per city and one per country.
- Explore sorted-set range queries to add "open now" filters on the same keys.

## Conclusion

Redis geospatial indexing is a sorted set with a smart score. Once longitude-first argument order, `BYRADIUS` versus `BYBOX`, and the cost of `COUNT ANY` are second nature, you can ship proximity search that serves millions of points in well under a millisecond — with no extra database, no spatial extension, and no background reindexing job.

---
title: "Redis Advanced Data Structures Cheatsheet"
description: "A quick reference for Redis advanced data structures — bitmaps, HyperLogLog, and geospatial indexes — with core commands, time complexity, and production patterns."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Redis Advanced Data Structures Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Set a single bit | `SETBIT key offset value` | Set the bit at `offset` (0 or 1) — O(1) |
| Read a single bit | `GETBIT key offset` | Return the bit value at `offset` — O(1) |
| Count set bits | `BITCOUNT key [start end]` | Count bits set to 1, optionally over a byte or bit range — O(N) |
| Find first set or clear bit | `BITPOS key bit [start [end]]` | Locate the first bit equal to 0 or 1 — O(N) |
| Bitwise operations | `BITOP AND / OR / XOR / NOT destkey srckey [srckey ...]` | Combine one or more bitmaps into a destination key — O(N) |
| Atomic bitfield operations | `BITFIELD key [GET type offset] [SET type offset value] [INCRBY type offset increment]` | Pack counters into a single string with overflow control — O(1) per sub-command |
| Add elements to HLL | `PFADD key element [element ...]` | Add elements to a HyperLogLog — O(1) per element |
| Approximate cardinality | `PFCOUNT key [key ...]` | Return the approximate number of unique elements; multiple keys are unioned on the fly — O(1) |
| Merge HyperLogLogs | `PFMERGE destkey srckey [srckey ...]` | Merge several HLLs into one — O(N) |
| Add a location | `GEOADD key [NX or XX] [CH] longitude latitude member [longitude latitude member ...]` | Store one or more members with longitude and latitude — O(log N) per item |
| Get member coordinates | `GEOPOS key member [member ...]` | Return the stored longitude and latitude of members — O(log N) |
| Distance between members | `GEODIST key member1 member2 [M or KM or FT or MI]` | Calculate the distance between two members — O(log N) |
| Geohash of members | `GEOHASH key member [member ...]` | Return an 11-character geohash per member — O(log N) |
| Radius or box search | `GEOSEARCH key FROMMEMBER member or FROMLONLAT longitude latitude BYRADIUS radius unit [ASC or DESC] [COUNT count [ANY]] [WITHCOORD] [WITHDIST] [WITHHASH]` | Search members inside a radius or box, optionally sorted by distance — O(N + log M) |
| Store a search result | `GEOSEARCHSTORE destkey source FROMMEMBER member or FROMLONLAT longitude latitude BYRADIUS radius unit [ASC or DESC] [COUNT count [ANY]] [WITHCOORD] [WITHDIST] [WITHHASH]` | Run a geospatial search and save the result into a new key — O(N + log M) |
| Remove a location | `ZREM key member [member ...]` | Remove a member — geospatial entries live inside a sorted set — O(log N) |

## Common Commands

### Bitmap Operations

```bash
# Bitmaps are plain strings where each bit is an independent flag.
# Common convention: one bitmap per time window, user ID = bit offset.

# Mark user 42 as active on a given day
SETBIT dau:2026-09-14 42 1
# => (integer) 0        (previous bit value, 0 = was not set)

# Mark it again — the bit is already 1
SETBIT dau:2026-09-14 42 1
# => (integer) 1        (previous bit value)

# Check whether user 42 was active
GETBIT dau:2026-09-14 42
# => (integer) 1

# Read a bit that was never set (out of range / missing key)
GETBIT dau:2026-09-14 999
# => (integer) 0

# Total active users for the day
BITCOUNT dau:2026-09-14
# => (integer) 1

# First set bit — the smallest active user ID in this example
BITPOS dau:2026-09-14 1
# => (integer) 42

# Merge a week of daily bitmaps: users active on ANY day
BITOP OR dau:week:2026-09 dau:2026-09-08 dau:2026-09-09 dau:2026-09-10 \
  dau:2026-09-11 dau:2026-09-12 dau:2026-09-13 dau:2026-09-14
# => (integer) 6        (size of the destination string in bytes)

# Unique users across the whole week
BITCOUNT dau:week:2026-09
# => (integer) <number of unique users>

# Pack many small counters into one string with BITFIELD
BITFIELD visit:stats SET u8 0 5 INCRBY u8 8 1
# SET u8 0 5      -> store 5 in the first 8-bit slot (offset 0)
# INCRBY u8 8 1   -> increment the second 8-bit slot (offset 8) by 1
# => 1) (integer) 0     (previous value before SET)
#    2) (integer) 1     (result of INCRBY)

# Overflow control: SAT clamps the value at the type boundary
BITFIELD counter OVERFLOW SAT SET u8 0 250 INCRBY u8 0 10
# => 1) (integer) 0     (previous value before SET)
#    2) (integer) 255   (250 + 10, saturated at the u8 maximum)
```

### HyperLogLog Operations

```bash
# HyperLogLog is a probabilistic counter: ~0.81% standard error,
# constant memory (~12 KB per key) no matter how many elements.
# Perfect for unique-visitor counting on high-traffic pages.

# Track page views by visitor ID — duplicates are ignored automatically
PFADD hll:page:home "visitor-101" "visitor-102" "visitor-101"
# => (integer) 1        (1 = at least one element was new)

# Approximate unique count
PFCOUNT hll:page:home
# => (integer) 2

# Union count WITHOUT merging: pass several keys, Redis unions in memory
PFADD hll:page:product "visitor-102" "visitor-103"
PFCOUNT hll:page:home hll:page:product
# => (integer) 3        (union = 101, 102, 103)

# Merge daily HLLs into a weekly key for long-term storage
PFMERGE hll:week:2026-09 hll:page:home hll:page:product
PFCOUNT hll:week:2026-09
# => (integer) 3

# Verify the constant memory footprint
MEMORY USAGE hll:page:home
# => around 12 KB regardless of how many elements were added
```

### Geospatial Operations

```bash
# Geospatial entries are stored in a sorted set, where the score is the
# geohash of the coordinates. NOTE the argument order: longitude FIRST,
# then latitude!

# Synthetic example: a delivery base and three pickup points
GEOADD places:base 106.8400 -6.2000 "Pos A"
GEOADD places:base 106.8500 -6.2000 "Pos B" 106.8400 -6.2100 "Pos C"

# Coordinates are stored with full double precision (expect round-trip noise)
GEOPOS places:base "Pos A"
# => 1) 1) "106.8399999141693115"
#       2) "-6.19999980926513672"

# Distance between two members — unit: m, km, ft, or mi
GEODIST places:base "Pos A" "Pos B" km
# => "1.11"

# Nearby members around a member, nearest first, with distances
GEOSEARCH places:base FROMMEMBER "Pos A" BYRADIUS 5 km ASC WITHDIST
# => 1) 1) "Pos A"
#       2) "0.00"
#    2) 1) "Pos B"
#       2) "1.11"
#    3) 1) "Pos C"
#       2) "1.11"

# Nearby members around raw coordinates (no member needed)
GEOSEARCH places:base FROMLONLAT 106.8400 -6.2000 BYRADIUS 2 km ASC COUNT 2 WITHDIST
# => 1) 1) "Pos A"
#       2) "0.00"
#    2) 1) "Pos B"
#       2) "1.11"

# Radius search by box instead of circle (Redis 7.0+)
GEOSEARCH places:base FROMMEMBER "Pos A" BYBOX 5 5 km ASC WITHDIST

# Remove a location — it is a sorted set member under the hood
ZREM places:base "Pos C"
# => (integer) 1
```

## Code Snippets

### Daily Active Users with Bitmaps

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// One bitmap per day; the user ID is the bit offset.
async function markActive(userId) {
  const today = new Date().toISOString().slice(0, 10); // e.g. "2026-09-14"
  await redis.setbit(`dau:${today}`, userId, 1);
}

// Total active users for a date — a single O(1) BITCOUNT after the writes.
async function activeUsersOn(date) {
  return redis.bitcount(`dau:${date}`);
}

// Unique users active across several days: BITOP OR folds the bitmaps
// into one key, then BITCOUNT counts the union.
async function activeUsersBetween(dateKeys) {
  const dest = 'dau:range';
  await redis.bitop('OR', dest, ...dateKeys);
  const total = await redis.bitcount(dest);
  await redis.del(dest); // clean up the scratch key
  return total;
}

(async () => {
  await markActive(42);
  await markActive(7);
  const today = new Date().toISOString().slice(0, 10);
  console.log('Active today:', await activeUsersOn(today)); // 2
  console.log('Active on range:', await activeUsersBetween([
    'dau:2026-09-13', 'dau:2026-09-14'
  ]));
})().catch(console.error);
```

### Unique Visitor Counting with HyperLogLog

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Each visit appends the visitor ID — deduplication is handled by the HLL.
async function trackVisit(page, visitorId) {
  await redis.pfadd(`hll:${page}`, visitorId);
}

// Approximate unique visitors (±0.81% at scale, ~12 KB per key).
async function uniqueVisitors(page) {
  return redis.pfcount(`hll:${page}`);
}

// Weekly unique visitors without storing a merge: PFCOUNT on many keys
// computes the union in memory.
async function weeklyUniqueVisitors(dayKeys) {
  return redis.pfcount(...dayKeys);
}

(async () => {
  await trackVisit('home', 'user-1');
  await trackVisit('home', 'user-2');
  await trackVisit('home', 'user-1'); // duplicate, ignored
  console.log('Unique home visitors:', await uniqueVisitors('home')); // 2

  await trackVisit('product', 'user-2');
  await trackVisit('product', 'user-3');
  console.log('Weekly unique:', await weeklyUniqueVisitors([
    'hll:home', 'hll:product'
  ])); // 3
})().catch(console.error);
```

### Nearby Location Search with Geospatial Indexes

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Remember: GEOADD takes longitude FIRST, then latitude.
async function addPlace(key, name, longitude, latitude) {
  await redis.geoadd(key, longitude, latitude, name);
}

// Redis 6.2+ — GEOSEARCH replaces the deprecated GEORADIUS family.
// ioredis exposes it via redis.call to keep options explicit.
async function findNearby(key, longitude, latitude, radiusKm, limit = 10) {
  return redis.call(
    'GEOSEARCH', key,
    'FROMLONLAT', longitude, latitude,
    'BYRADIUS', radiusKm, 'km',
    'ASC', 'COUNT', limit, 'WITHDIST'
  );
  // Returns an array of [member, distanceKm, longitude, latitude] triples
  // when both WITHDIST and WITHCOORD are requested; here distances only.
}

// Distance between two stored members
async function distanceBetween(key, memberA, memberB) {
  return redis.geodist(key, memberA, memberB, 'km');
}

(async () => {
  await addPlace('places:jakarta', 'Monas', 106.8171, -6.1754);
  await addPlace('places:jakarta', 'Gelora Bung Karno', 106.8036, -6.2189);

  const nearby = await findNearby('places:jakarta', 106.8171, -6.1754, 10);
  console.log('Nearby places:', nearby);

  const distance = await distanceBetween(
    'places:jakarta', 'Monas', 'Gelora Bung Karno'
  );
  console.log('Distance (km):', distance);
})().catch(console.error);
```

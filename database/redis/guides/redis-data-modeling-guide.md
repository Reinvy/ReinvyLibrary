---
title: "Redis Data Modeling and Schema Design Guide"
description: "A practical guide to designing Redis data models: key naming conventions, hash-based entity modeling, explicit secondary indexes, relationship modeling, sorted-set score design, counters and analytics structures, and schema evolution."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Redis Data Modeling and Schema Design Guide

## Introduction

Redis is not a general-purpose relational database, and modeling data for it is a different discipline. A relational schema starts with normalized tables, foreign keys, and a query planner that joins them dynamically. Redis has none of that: every read is a direct operation on a data structure addressed by a key, and the structure you choose at write time is the structure you pay for at read time for the life of the application.

This makes data modeling the single highest-leverage design decision in a Redis-based system. Get the key layout and structure choices right and Redis serves millions of operations per second on modest hardware; get them wrong and you end up with hot keys, oversized values, N+1 round trips, and a migration that touches every service.

This guide presents a repeatable modeling workflow: start from access patterns instead of entity diagrams, give every key a deliberate name that encodes its purpose, choose the smallest structure that serves the dominant query, build explicit indexes for lookups Redis cannot do natively, and design for evolution from day one. Each best practice is paired with concrete Redis commands, and the implementation steps build one realistic data model — a small marketplace — from scratch.

## Best Practices

### 1. Treat the Key Name as Part of the Schema

In Redis the key is the only addressing mechanism, so the key name carries schema information that a relational database would store in a column. A deliberate naming convention is not cosmetic; it is how you namespace tenants, versions, and data domains on a shared server.

Adopt a consistent, colon-separated format and apply it everywhere:

```text
<domain>:<object>:<id>:<subfield>

user:1000                 # an entity hash
user:by-email:ada@x.com   # a secondary index
cart:1000                 # a per-user data container
product:by-category:books # a category index
clicks:product:42:2026-09-24  # a per-day counter
```

Rules that prevent expensive rewrites later:

- **Use colons as the only separator.** The colon is the convention clients, tools, and Redis itself (cluster hash slots, SCAN MATCH) understand. Do not mix `_`, `-`, and `:` in one key space.
- **Never embed data that changes into the key.** A user's display name, an email address, or a product title are mutable; if they appear in a key, every rename becomes a migration. Store them as field values, not key components.
- **Version the key, not the value.** When a schema changes, old keys and new keys can coexist if the version lives in the name: `user:1000` becomes `user:v2:1000`. There is no `ALTER TABLE` in Redis; the key name is the version marker.
- **Use stable IDs.** Prefer numeric IDs or immutable UUIDs over slugs that can change.
- **Namespace by environment or tenant with a leading segment** (`prod:user:1000`, `tenant7:user:1000`) when one instance serves several logical domains, so a SCAN or a flush can target one namespace.

### 2. Choose the Data Structure by Access Pattern, Not by Data Shape

The most common modeling mistake is asking "what is this data?" instead of "how will this data be read?". Redis structures are specialized access machines, so the read pattern decides the structure:

| Access pattern you need | Redis structure | Example key | Why it fits |
|-------------------------|-----------------|-------------|-------------|
| Read or update an entity by ID | Hash | `user:1000` | Field-level partial updates, compact listpack encoding |
| Store one derived scalar value | String | `user:1000:avatar-url` | Simplest possible read, no parsing |
| Append to a bounded sequence | List | `queue:email:outbox` | O(1) push/pop at both ends |
| Enforce uniqueness or membership | Set | `user:1000:roles` | O(1) add/check/remove, automatic dedupe |
| Rank by score or query a range | Sorted Set | `leaderboard:2026:09` | Ordered by score with O(log N) range reads |
| Append-only event log with replay | Stream | `order:events` | Consumer groups, per-entry IDs, replay |
| Count distinct elements approximately | HyperLogLog | `analytics:visitors:2026-09-24` | Constant ~12 KB memory at any cardinality |
| Track per-user day flags | Bitmap | `analytics:active:2026-09-24` | 1 bit per user, set-union and counting in place |

If a data shape maps to several access patterns, denormalize it into several keys (Practice 5). A single object stored once as a hash and later needing ranking will produce round trips and extra code; storing the object as a hash and its ranking handle as a sorted-set member is the Redis-native shape.

### 3. Model Entities as Hashes for Partial Updates and Compact Memory

An entity with a handful of fields — a user, a product, a session — belongs in a Hash. Each field is updated independently without read-modify-write races, and small hashes are stored with the listpack encoding, which can be dramatically smaller than a JSON string:

```bash
redis-cli HSET user:1000 name "Ada Lovelace" email "ada@example.com" country "GB" \
  created-at 1695600000
redis-cli HGET user:1000 email
redis-cli HINCRBY user:1000 login-count 1
redis-cli HGETALL user:1000
```

Rules of thumb:

- **One hash per entity, fields for attributes.** Profile info, preferences, counters that belong to the entity.
- **Prefer Hashes over String+JSON for mutable entities.** A JSON string forces a full rewrite on every field change and has no field-level atomicity; a hash updates one field with one command.
- **Keep the field count bounded.** Hashes with hundreds of fields are workable but start to behave like big keys; split a heavily accessed subset into its own key (`user:1000:stats`).
- **The whole key expires together.** TTL applies to the key, not individual fields. If fields need different lifetimes, split the entity into two hashes with different TTLs.

### 4. Build Secondary Indexes Explicitly

Redis has no built-in lookup by value, so every non-ID query needs an index you maintain yourself. The standard pattern is a Set (or Sorted Set) whose name encodes the lookup value and whose members are entity IDs:

```bash
# Find the user ID behind an email
redis-cli SADD user:by-email ada@example.com 1000
redis-cli SISMEMBER user:by-email ada@example.com

# Products in a category, ordered by price
redis-cli ZADD product:by-category:books 29.99 5001
redis-cli ZADD product:by-category:books 12.50 5002
redis-cli ZRANGE product:by-category:books 0 9 WITHSCORES
```

Because Redis has no transactions that span keys with rollback, keep the entity write and its index write atomic using MULTI/EXEC or a Lua script:

```bash
redis-cli MULTI
redis-cli HSET product:5001 name "Clean Code" price 29.99 category books
redis-cli ZADD product:by-category:books 29.99 5001
redis-cli EXEC
```

The cost of an index is write amplification: every entity write now touches two keys. Only index the lookup paths your access inventory (Step 1) actually needs, and never index a field you do not query.

### 5. Model Relationships by Denormalizing IDs into Collections

Redis has no joins, so relationships are modeled by storing the IDs of related entities inside a collection. The collection type follows the cardinality and ordering of the relationship:

- **One-to-many, ordered by time**: List or Sorted Set of child IDs (`user:1000:orders` with timestamp scores).
- **One-to-many, membership only**: Set of child IDs (`user:1000:roles`).
- **Many-to-many**: two Sets, one per direction (`user:1000:follows`, `user:1000:followers`).
- **Bounded recent items**: List trimmed with LTRIM (`user:1000:recent-items`, cap 50).

Reading a relationship is a two-step pattern: fetch the ID list, then fetch the entities. Never issue one round trip per ID — pipeline the second step:

```bash
# Get the 10 latest orders for user 1000, then their hashes in one round trip
redis-cli ZREVRANGE user:1000:orders 0 9
redis-cli --pipe <<'EOF'
HGETALL order:9001
HGETALL order:9002
HGETALL order:9003
EOF
```

The trade-off is deliberate duplication (Practice 5 in the caching guide covers the read-path side). Accept some staleness in derived collections and refresh them on write events instead of trying to keep every relation transactionally consistent.

### 6. Design Sorted-Set Scores to Encode Ranking Semantics

The sorted set's score is the entire sorting model, so the score must encode what you want to order by — and it is the cheapest place to encode tie-breaks, direction, and time windows:

```bash
# Rank by a single number: seller rating
redis-cli ZADD seller:leaderboard:rating 4.9 7
redis-cli ZADD seller:leaderboard:rating 4.7 12
redis-cli ZREVRANGE seller:leaderboard:rating 0 2 WITHSCORES

# Feed ordered by time: timestamp as score
redis-cli ZADD newsfeed:user:1000 1695600000 post:501
redis-cli ZREVRANGEBYSCORE newsfeed:user:1000 +inf -inf LIMIT 0 10
```

- **Use timestamps for time-ordered collections.** Sorting, range pagination, and pruning old entries all fall out of one score.
- **Pack rank and tie-break into one score.** A single double holds limited precision, so use a fixed multiplier: score = `points * 1000000 + tiebreak`. This keeps `ZREVRANGE` correct for the primary rank while the fractional part decides equal scores.
- **Zipfian-hot collections belong in time windows.** A global "all-time" leaderboard concentrates writes on one key; windowed keys (`leaderboard:2026:09`) spread the load and make "this month" trivially queryable, matching the sharding practice in Practice 7.
- **Choose direction explicitly.** `ZREVRANGE` for descending (leaderboards, newest-first feeds), `ZRANGE` for ascending (oldest-first, price filters). Do not encode direction with negative scores unless the score has no other meaning.

### 7. Keep Keys Small: Shard by Time or Bucket

Redis executes each command on a single thread, so a key that stores millions of elements makes every operation on it expensive and blocks the server while large values are transferred or deleted. Large collections must be bounded or sharded:

- **Time-windowed keys** for anything that accumulates: leaderboards, analytics counters, event indexes. `leaderboard:2026:09` expires or archives with the month.
- **Bucket-sharded keys** for hot entities: a single product receiving most traffic becomes `product:42:0` through `product:42:3`, selected by `id % 4` on the client.
- **Bounded lists**: cap with `LTRIM` after every push so the collection cannot grow without limit:

```bash
redis-cli RPUSH user:1000:recent-items 9001
redis-cli LTRIM user:1000:recent-items -50 -1
```

- **Bounded streams** with `XTRIM` and a max length, or a max-age policy via `XADD ... MAXLEN`.

A good discipline: before writing a collection key, ask what its maximum size is and what happens at that size. If the answer is "it keeps growing", shard it now.

### 8. Give Every Ephemeral Key an Expiration

Redis is often load-bearing for data whose lifetime is short: sessions, cache entries, rate-limit windows, one-time tokens. Every such key needs a TTL chosen at write time, and the TTL itself is part of the model:

```bash
# Session with an absolute lifetime
redis-cli SETEX session:tk-81f2 3600 '{"user_id":1000}'

# Counter that must self-destruct: set TTL only on first increment
redis-cli INCR rate:user:1000:minute
redis-cli EXPIRE rate:user:1000:minute 60  # only when INCR returned 1
```

Set the EXPIRE conditionally (only when the counter is new) so a hot counter is not refreshed indefinitely by later increments. For derived views with acceptable staleness, TTLs also serve as the cleanup mechanism — the key disappears when it expires, no janitor job needed.

**Mind the mass-expiry thundering herd.** If 100,000 keys all carry the same TTL because they were written in a burst, they expire in the same second and every read misses at once. Add a small random jitter to TTLs of batch-written keys and let reads fall back to the source of truth.

### 9. Plan Schema Evolution with Versioned Keys

Redis schemas evolve, and there is no migration tooling, so evolution must be designed into the key name from the start. The workflow that works in production:

1. **Write the new version alongside the old**: `user:1000` and `user:v2:1000` both receive writes during the transition (dual-write in the application).
2. **Backfill lazily**: on read, if `user:v2:1000` is missing, build it from `user:1000` and write it back (`Write-Through` style) — no offline job required for read-heavily accessed data.
3. **Backfill eagerly with SCAN** for data that must be fully migrated before cutover:

    ```bash
    redis-cli --scan --pattern 'user:*' | while read -r key; do
      redis-cli COPY "$key" "${key/user:/user:v2:}" REPLACE
    done
    ```

4. **Cut over reads with a feature flag**, then stop dual-writes.
5. **Let the old namespace die**: set a short TTL on remaining old keys or delete them in a maintenance window.

Versioning in the key keeps old and new code path-safe on the same server — the single most useful habit for Redis production hygiene.

### 10. Avoid Modeling Anti-Patterns

The same mistakes recur across Redis codebases. Learn them as a checklist:

| Anti-pattern | Consequence | Fix |
|--------------|-------------|-----|
| Unbounded list or set | Memory grows forever, eviction surprises at `maxmemory` | LTRIM cap, XTRIM, or a time-windowed key |
| Oversized entity or JSON blob | Big-key stalls, slow replication and failover | Split fields across hashes, shard by bucket |
| One hot key per popular entity | A single thread carries all traffic for that key | Bucket-shard the key (Practice 7) |
| Per-ID round trips (N+1) | Latency multiplies with the list size | Pipeline or MGET the batch in one round trip |
| `KEYS *` in production code | Blocking scan of the whole keyspace | SCAN with MATCH, or maintain real indexes |
| No TTL on ephemeral data | Stale keys accumulate until memory pressure | EXPIRE at write time (Practice 8) |
| Same prefix for cache and durable data | Eviction policy cannot distinguish them | Separate domains: `cache:` vs the durable namespace |

An anti-pattern is usually a modeling shortcut that felt local and cheap at write time; the fix is always decided one level up, at the key-design level.

## Implementation Steps

The rest of this guide builds a complete data model for a small marketplace — users, products, carts, a seller rating leaderboard, and per-product click analytics — applying every practice above.

### Step 1: Inventory Access Patterns Before Writing Any Key

Start from the product's queries, not from its entity diagram. Write down every read the application performs, its frequency, and the shape the answer must have:

| Query | Frequency | Target structure |
|-------|-----------|------------------|
| Get a user profile by ID | High | Hash `user:1000` |
| Find a user by email (login) | Medium | Set index `user:by-email:<email>` |
| List products in a category | High | Sorted Set `product:by-category:books` |
| Get a product detail page | High | Hash `product:5001` |
| Read a user's cart | High | Hash `cart:1000` |
| Top sellers by rating | Low | Sorted Set `seller:leaderboard:rating` |
| Unique visitors per day | Medium | HyperLogLog `analytics:visitors:2026-09-24` |
| Clicks on a product per day | Medium | String `clicks:product:5001:2026-09-24` |

The inventory is the contract the schema must serve. If a query is missing from this table, it does not exist yet — and you will not design for it.

### Step 2: Define a Key Naming Convention

Adopt `domain:object:id:subfield` with colon separators, lowercase, one vocabulary per domain. The marketplace namespace:

```text
user:1000                    # user entity hash
user:by-email:ada@example.com  # email lookup index
product:5001                 # product entity hash
product:by-category:books    # products of a category, scored by price
cart:1000                   # cart line items: productId -> quantity
seller:leaderboard:rating   # seller ratings, descending
analytics:visitors:2026-09-24  # daily unique visitors (HyperLogLog)
clicks:product:5001:2026-09-24 # daily click counter per product
```

Write the convention into the team's documentation, then treat any key that deviates from it as a bug in review.

### Step 3: Model Primary Entities with Hashes

Users and products are plain entities: a bounded set of attributes mutated independently. Model each as one Hash:

```bash
redis-cli HSET user:1000 name "Ada Lovelace" email "ada@example.com" \
  country "GB" created-at 1695600000 login-count 0
redis-cli HSET product:5001 name "Clean Code" price 29.99 \
  category books stock 42

# Field-level updates with no read-modify-write
redis-cli HINCRBY user:1000 login-count 1
redis-cli HINCRBY product:5001 stock -1

# Full read for the profile page
redis-cli HGETALL user:1000
```

Notice what is not here: no JSON blob under a string key, no per-field keys polluting the keyspace. The hash keeps the entity behind one key, updateable field by field and readable in one round trip.

### Step 4: Create Secondary Indexes

Email lookup and category listing are not ID lookups, so they get explicit indexes maintained atomically with the entity write:

```bash
# Email index: set member = user ID
redis-cli MULTI
redis-cli HSET user:1000 email "ada@example.com"
redis-cli SADD user:by-email ada@example.com 1000
redis-cli EXEC

# Login check
redis-cli SISMEMBER user:by-email ada@example.com

# Category index: sorted set scored by price, so the listing is pre-ordered
redis-cli MULTI
redis-cli HSET product:5001 category books price 29.99
redis-cli ZADD product:by-category:books 29.99 5001
redis-cli EXEC

# Category page, cheapest first
redis-cli ZRANGE product:by-category:books 0 9 WITHSCORES
```

The MULTI/EXEC wrapper makes the entity write and the index write atomic from the perspective of other clients: nobody observes a product that exists but is missing from its category index. Keep the index count small — one index per query path in the Step 1 inventory, nothing more.

### Step 5: Model One-to-Many and Many-to-Many Relationships

The marketplace has two relationships: a user's orders (one-to-many, ordered by time) and a user's followed sellers (many-to-many). Both are ID collections:

```bash
# 1:N — user orders, timestamp-scored for recency
redis-cli ZADD user:1000:orders 1695600000 9001
redis-cli ZADD user:1000:orders 1695700000 9002

# N:N — follows in both directions
redis-cli SADD user:1000:follows 7
redis-cli SADD user:7:followers 1000

# Read the relationship, then the entities — in one round trip
redis-cli ZREVRANGE user:1000:orders 0 9
redis-cli --pipe <<'EOF'
HGETALL order:9001
HGETALL order:9002
EOF
```

The second step is the performance-critical habit: never loop over IDs and issue one command each. Batch the entity reads (pipeline, or MGET/HGETALL in one round trip) so the relationship read costs two commands total regardless of list size.

### Step 6: Encode Ordering and Ranking with Sorted Sets

The seller leaderboard ranks by rating; the product feed orders by time. Both are sorted-set models with explicit score semantics:

```bash
# Leaderboard: score = rating. Ties are broken by inserting a small
# fractional tiebreak, or by packing: score = rating * 1000 + tiebreak_id
redis-cli ZADD seller:leaderboard:rating 4.9 7
redis-cli ZADD seller:leaderboard:rating 4.7 12
redis-cli ZINCRBY seller:leaderboard:rating 0.1 12

# Top 3 with their ratings
redis-cli ZREVRANGE seller:leaderboard:rating 0 2 WITHSCORES

# A seller's rank, 1-indexed for display
redis-cli ZREVRANK seller:leaderboard:rating 12
```

```bash
# Feed: score = event timestamp, newest first
redis-cli ZADD newsfeed:user:1000 1695600000 post:501
redis-cli ZADD newsfeed:user:1000 1695680000 post:502

# Page 2 of the feed (older than the last seen timestamp)
redis-cli ZREVRANGEBYSCORE newsfeed:user:1000 1695679999 -inf LIMIT 0 10
```

Because the score is the sort key, adding a time window to the key name (Practice 7) keeps a hot ranking spread across many keys instead of one.

### Step 7: Model Counters and Analytics with String, Bitmap, HyperLogLog

Analytics shapes are counters, and Redis has a dedicated structure for each flavor:

```bash
# Plain counter: clicks per product per day
redis-cli INCR clicks:product:5001:2026-09-24
redis-cli GET clicks:product:5001:2026-09-24

# Daily active users: one bit per user ID
redis-cli SETBIT analytics:active:2026-09-24 1000 1
redis-cli BITCOUNT analytics:active:2026-09-24

# Unique visitors: HyperLogLog, ~12 KB regardless of traffic
redis-cli PFADD analytics:visitors:2026-09-24 "203.0.113.4"
redis-cli PFADD analytics:visitors:2026-09-24 "203.0.113.9"
redis-cli PFCOUNT analytics:visitors:2026-09-24

# Weekly active users: union of the seven daily bitmaps
redis-cli BITOP OR analytics:active:week-39 \
  analytics:active:2026-09-21 analytics:active:2026-09-22 \
  analytics:active:2026-09-23 analytics:active:2026-09-24
```

Give analytics keys a TTL at first write (Practice 8) so old days expire automatically instead of accumulating forever.

### Step 8: Model Event Logs and Time Series with Streams

When the requirement is an append-only log with ordered replay — order events, audit trails, sensor series — a Stream beats a List because entries carry IDs and support consumer groups for parallel processing:

```bash
# Append an event; the entry ID is a timestamp sequence
redis-cli XADD order:events * event created order-id 9001 amount 29.99
redis-cli XADD order:events * event shipped order-id 9001 carrier "DHL"

# Replay every event of the order
redis-cli XRANGE order:events - +

# Fan out to workers with consumer groups
redis-cli XGROUP CREATE order:events workers 0
redis-cli XREADGROUP GROUP workers worker-1 COUNT 10 STREAMS order:events >
```

Choose a Stream when you need replay, groups, or acknowledgment; choose a List when you need a simple bounded FIFO; choose a Sorted Set when the log is actually a time-ordered ranking that must support range queries.

### Step 9: Validate the Model in a Staging Environment

Before the model reaches production, verify each key with the built-in diagnostic commands:

```bash
# Encoding check: listpack = compact, hashtable = grows beyond listpack limits
redis-cli OBJECT ENCODING user:1000

# Memory cost of one key
redis-cli MEMORY USAGE user:1000

# Find big keys across the instance (off-peak only)
redis-cli --bigkeys

# Find hot keys (Redis 7+)
redis-cli --hotkeys

# Sample the keyspace, never KEYS
redis-cli --scan --pattern 'user:*' | head -20

# Slow commands that slip into production
redis-cli SLOWLOG GET 20
```

Three signs the model is healthy: no key shows up in `--bigkeys`, every entity key reports the compact encoding, and the read paths from Step 1 each resolve in one or two round trips.

### Step 10: Migrate and Evolve the Live Schema

When the marketplace adds a new field with a different shape — say, seller ratings move from a hash field to a ranked structure — follow the versioned-key workflow:

```bash
# 1. Dual-write during transition: keep old and new in sync in the app
# 2. Backfill new keys from old ones with a bounded SCAN copy
redis-cli --scan --pattern 'seller:*' | while read -r key; do
  redis-cli COPY "$key" "${key/seller:/seller:v2:}" REPLACE
done

# 3. Flip reads behind a feature flag, stop dual-writes
# 4. Retire the old namespace: short TTL, then delete in a maintenance window
redis-cli --scan --pattern 'seller:*' | while read -r key; do
  redis-cli EXPIRE "$key" 86400
done
```

The versioned key makes the transition invisible to clients still on the old code path. This is the same discipline as Practice 1: decide the migration strategy when you design the key name, not when you need to rename it.

---
title: "Redis Modules and Redis Stack Cheatsheet"
description: "A comprehensive quick reference for Redis Stack modules — RediSearch indexing and full-text queries, RedisJSON document storage and JSONPath, RedisTimeSeries retention and aggregation, RedisBloom probabilistic structures, and legacy RedisGraph Cypher queries."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Redis Modules and Redis Stack Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Load a module at runtime | `MODULE LOAD /path/to/module.so` | Load a dynamic module into a running Redis server |
| List loaded modules | `MODULE LIST` | Show loaded modules with their versions |
| Create a RediSearch index over hashes | `FT.CREATE idx ON HASH PREFIX 1 product: SCHEMA name TEXT price NUMERIC` | Build a secondary index on existing hash keys |
| Create a RediSearch index over JSON | `FT.CREATE idx ON JSON PREFIX 1 product: SCHEMA $.name AS name TEXT` | Index fields extracted by JSONPath from RedisJSON documents |
| Search an index | `FT.SEARCH idx "@name:widget" LIMIT 0 10` | Full-text query with field targeting and paging |
| Aggregate search results | `FT.AGGREGATE idx "*" GROUPBY 1 @category REDUCE COUNT 0 AS n` | Group and reduce over indexed data |
| Store a JSON document | `JSON.SET user:1 $ '{"name":"Alice","age":30}'` | Create or replace a JSON document at a path |
| Read a JSONPath value | `JSON.GET user:1 $.name` | Fetch a value by JSONPath expression |
| Append to a JSON array | `JSON.ARRAPPEND user:1 $.tags "redis"` | Push elements onto an array inside a document |
| Create a time series | `TS.CREATE temp:room1 RETENTION 86400000 LABELS room room1` | Define a series with retention window and labels |
| Append a sample | `TS.ADD temp:room1 1617972841000 21.5` | Insert a `(timestamp, value)` sample |
| Range query with downsampling | `TS.RANGE temp:room1 1617972841000 1617972901000 AGGREGATION avg 60000` | Query samples bucketed into 60-second averages |
| Create a Bloom filter | `BF.RESERVE seen:url 0.01 1000000` | Allocate a filter with error rate and capacity |
| Check membership in bulk | `BF.MEXISTS seen:url "https://a.example" "https://b.example"` | Test multiple items in one call |
| Track top-K streams | `TOPK.ADD trending:items "item-42"` | Insert items into a Top-K sketch |
| Run a Cypher query | `GRAPH.QUERY social "MATCH (p:Person) RETURN p.name"` | Execute a graph query on the legacy RedisGraph module |

## Common Commands

### RediSearch — Index Management

```text
FT.CREATE idx ON HASH PREFIX 1 product: SCHEMA \
  name TEXT WEIGHT 5.0 SORTABLE \
  price NUMERIC SORTABLE \
  tags TAG SEPARATOR ","

FT.CREATE idx ON JSON PREFIX 1 product: SCHEMA \
  $.name AS name TEXT \
  $.price AS price NUMERIC \
  $.tags[*] AS tags TAG
```

| Command | Purpose |
|---------|---------|
| `FT.CREATE index [ON HASH\|JSON] [PREFIX n prefix ...] [FILTER expr] SCHEMA ...` | Create an index; `HASH` targets hashes, `JSON` targets RedisJSON documents |
| `FT.DROPINDEX index [DD]` | Delete an index; `DD` also deletes the underlying documents |
| `FT.INFO index` | Inspect index definition, field types, and document counts |
| `FT._LIST` | List every index in the server |
| `FT.ALIASADD alias index` | Add an alias so applications never hard-code an index name |
| `FT.ALIASDEL alias` | Remove an alias |
| `FT.ALIASUPDATE alias index` | Point an alias at a different index (atomic reindex swap) |
| `FT.SYNUPDATE index group_id term ...` | Maintain synonym groups used during query expansion |
| `FT.SPELLCHECK index query` | Suggest corrections for misspelled terms |
| `FT.DICTADD dict term ...` | Seed a custom dictionary for spell-check suggestions |
| `FT.EXPLAIN index query` | Show the execution plan a query produces |
| `FT.PROFILE index SEARCH QUERY query` | Profile a query and return counters per operation |
| `FT.CONFIG GET name` | Read a RediSearch runtime setting (for example `timeout`) |
| `FT.CONFIG SET name value` | Change a runtime setting without a server restart |

### RediSearch — Querying

```text
# Term query
FT.SEARCH idx "widget"

# Field targeting
FT.SEARCH idx "@name:widget"

# Numeric range (inclusive brackets, exclusive parentheses)
FT.SEARCH idx "price:[10 100]"
FT.SEARCH idx "price:(10 100]"

# Tag field match (pipe = OR inside a tag query)
FT.SEARCH idx "@tags:{electronics|home}"

# Prefix and fuzzy matching
FT.SEARCH idx "@name:wid*"
FT.SEARCH idx "%wodget%"          # Levenshtein fuzzy, default distance 2

# Boolean logic: AND is implicit, -field excludes, | is OR
FT.SEARCH idx "widget -defective"
FT.SEARCH idx "widget|gadget"

# Geo filter: radius around a lon,lat point
FT.SEARCH idx "@location:[106.8 -6.2 10 km]"

# Scored results with a sortable field
FT.SEARCH idx "@price:[0 50]" SORTBY price DESC LIMIT 0 10
```

```text
# FT.SEARCH full syntax
FT.SEARCH index query [NOCONTENT] [VERBATIM] [NOSTOPWORDS] \
  [WITHSCORES] [WITHPAYLOADS] [SORTBY field [ASC|DESC]] \
  [LIMIT offset num] [PARAMS n name value ...] \
  [DIALECT dialect] [TIMEOUT ms]
```

Aggregation pipelines turn indexed data into grouped statistics without shipping documents to the client:

```text
FT.AGGREGATE idx "*" \
  FILTER "@price > 10" \
  GROUPBY 1 @category \
    REDUCE AVG 1 @price AS avg_price \
    REDUCE COUNT 0 AS items \
  SORTBY 2 @avg_price DESC \
  LIMIT 0 20
```

| Piece | Purpose |
|-------|---------|
| `GROUPBY n field ...` | Partition rows by one or more fields |
| `REDUCE func n arg ... AS alias` | Aggregate each group (`COUNT`, `SUM`, `AVG`, `MAX`, `MIN`, `QUANTILE`, `STDDEV`, `TOLIST`, `COUNT_DISTINCT`, `RANDOM_SAMPLE`) |
| `SORTBY n @field [ASC\|DESC] ...` | Order the result rows |
| `APPLY expr AS alias` | Compute a new column per row |
| `FILTER expr` | Keep rows matching a predicate |
| `CURSOR COUNT n MAXIDLE ms` | Paginate large results; continue with `FT.CURSOR READ index cursor` |

Vector similarity search (Redis 6.2+ with the `VECTOR` field type) ranks documents by distance to an embedding:

```text
FT.CREATE vec_idx ON HASH PREFIX 1 doc: SCHEMA \
  text TEXT \
  embedding VECTOR FLAT 6 TYPE FLOAT32 DIM 384 DISTANCE_METRIC COSINE

FT.SEARCH vec_idx "(*)=>[KNN 5 @embedding $vec AS score]" \
  PARAMS 2 vec "\x00\x01..." DIALECT 2 SORTBY score
```

### RedisJSON — Core Operations

| Command | Purpose |
|---------|---------|
| `JSON.SET key path value [NX\|XX]` | Store a value; `NX` inserts only if absent, `XX` only if present |
| `JSON.GET key [path ...]` | Retrieve a value by path (multiple paths allowed) |
| `JSON.MGET key [key ...] path` | Fetch the same path from several keys at once |
| `JSON.DEL key [path]` | Delete the whole document or a subtree |
| `JSON.FORGET key path` | Alias of `JSON.DEL` scoped to a single path |
| `JSON.TYPE key [path]` | Report the JSON type at a path |
| `JSON.NUMINCRBY key path number` | Increment (or decrement with a negative number) a numeric value |
| `JSON.NUMMULTBY key path number` | Multiply a numeric value |
| `JSON.STRAPPEND key path string` | Append to a string value |
| `JSON.STRLEN key path` | Length of a string value |
| `JSON.ARRAPPEND key path value [value ...]` | Append values to an array |
| `JSON.ARRINSERT key path index value [value ...]` | Insert values at a specific array index |
| `JSON.ARRINDEX key path value [start [stop]]` | Find the first matching element in an array |
| `JSON.ARRTRIM key path start stop` | Trim an array to a range |
| `JSON.ARRPOP key [path [index]]` | Remove and return an element (default last) |
| `JSON.ARRLEN key path` | Array length |
| `JSON.OBJKEYS key path` | Keys of an object |
| `JSON.OBJLEN key path` | Number of object members |
| `JSON.TOGGLE key path` | Flip a boolean value |
| `JSON.RESP key [path]` | Convert JSON to a Redis RESP reply |
| `JSON.DEBUG FIELDS key path` | Size of a value at a path in bytes |

```text
# Pretty-printed output
JSON.GET user:1 INDENT "  " NEWLINE "\n" SPACE " " $.name $.age
```

### RedisJSON — JSONPath Expressions

```text
$               root of the document
$.name          child field "name"
$.address.city  nested field
$..price        recursive descent: every "price" at any depth
$.items[*]      every element of the array "items"
$.items[0]      first element; $.items[-1] last element
$.items[1:3]    array slice
$.tags[?(@.urgent == true)]    filter expression on array elements
```

Only `$.` paths support filters and slices; the legacy `.` path syntax matches a single exact key and is faster for that purpose.

### RedisTimeSeries — Series Management

```text
TS.CREATE temp:room1 \
  RETENTION 86400000 \               # keep 24 hours of samples
  ENCODING COMPRESSED \              # or UNCOMPRESSED
  DUPLICATE_POLICY LAST \            # BLOCK | FIRST | LAST | MIN | MAX | SUM
  LABELS room room1 sensor ds18b20   # free-form labels for filtering
```

| Command | Purpose |
|---------|---------|
| `TS.CREATE key [RETENTION ms] [ENCODING mode] [CHUNK_SIZE bytes] [DUPLICATE_POLICY policy] [IGNORE value] [DECAY] [LABELS label value ...]` | Create a series with retention, compaction policy, and labels |
| `TS.ALTER key [RETENTION ms] [LABELS label value ...] [DUPLICATE_POLICY policy]` | Change settings on an existing series |
| `TS.ADD key timestamp value [RETENTION ms] [ON_DUPLICATE policy] [LABELS ...]` | Append a sample; timestamp `*` means "now" |
| `TS.INCRBY key value [TIMESTAMP ts] [RETENTION ms] ...` | Increment a counter series (also `TS.DECRBY`) |
| `TS.DEL key from_timestamp to_timestamp` | Remove a time range of samples |
| `TS.INFO key` | Retention, labels, chunk counts, and memory usage |
| `TS.QUERYINDEX label=value ...` | Return the keys of all series matching a label filter |

### RedisTimeSeries — Querying and Aggregation

```text
TS.RANGE temp:room1 1617972841000 1617972901000 \
  FILTER_BY_VALUE 18 30 \
  AGGREGATION avg 60000 \
  ALIGN 1617972840000
```

| Option | Purpose |
|--------|---------|
| `AGGREGATION func bucket_ms` | Downsample into fixed buckets with `avg`, `sum`, `min`, `max`, `range`, `count`, `first`, `last`, `std.p`, `std.s`, `var.p`, `var.s`, `twa` |
| `BUCKETTIMESTAMP bt` | Label each bucket with its `-` start, `+` end, or `~` mid timestamp |
| `EMPTY` | Emit buckets with no samples (null values) |
| `FILTER_BY_TS ts ...` | Return only specific timestamps |
| `FILTER_BY_VALUE min max` | Return samples within a value range |
| `COUNT n` | Limit the number of samples |
| `ALIGN value` | Align bucket boundaries to a timestamp, `-` or `+` |
| `LATEST` | Include the latest sample even when outside the range |

Multi-series queries select by labels and merge across keys:

```text
TS.MRANGE 1617972841000 1617972901000 \
  FILTER room=room1 area=front \
  GROUPBY room REDUCE avg \
  WITHLABELS
```

```text
TS.MGET FILTER room=room1   # latest sample of every matching series

TS.QUERYINDEX area=front    # keys of matching series
```

Compaction rules continuously downsample a source series into a destination:

```text
TS.CREATERULE temp:room1 temp:room1:hourly AGGREGATION avg 3600000
TS.DELETERULE temp:room1 temp:room1:hourly
```

### RedisBloom — Probabilistic Structures

Bloom filters answer "have I seen this before?" with a tunable false-positive rate and near-constant memory:

```text
BF.RESERVE seen:url 0.01 1000000        # 1% error rate, ~1M expected items
BF.ADD seen:url "https://a.example"
BF.MADD seen:url "https://b.example" "https://c.example"
BF.EXISTS seen:url "https://a.example"   # (integer) 1
BF.MEXISTS seen:url "https://x.example" "https://y.example"
BF.INFO seen:url                         # capacity, size, filters, items
```

| Bloom command | Purpose |
|---------------|---------|
| `BF.RESERVE key error_rate capacity [EXPANSION n] [NONSCALING]` | Pre-allocate a filter |
| `BF.ADD key item` / `BF.MADD key item ...` | Add one or many items |
| `BF.EXISTS key item` / `BF.MEXISTS key item ...` | Membership test (1 = possibly present, 0 = definitely absent) |
| `BF.INSERT key CAPACITY cap ERROR rate items ... [NOCREATE]` | Add items, creating the filter on demand |
| `BF.SCANDUMP key iter` / `BF.LOADCHUNK key iter data` | Backup and restore a filter across servers |
| `BF.INFO key` | Filter size, element count, and error rate |

Cuckoo filters add deletion to the same idea, and `CF.COUNT` reports approximate multiplicity:

```text
CF.RESERVE seen:ip 1000000
CF.ADDNX seen:ip "203.0.113.7"     # add only if not already counted
CF.COUNT seen:ip "203.0.113.7"
CF.DEL seen:ip "203.0.113.7"       # safe: removes exactly one occurrence
```

Count-Min Sketch estimates frequencies of high-cardinality streams:

```text
CMS.INITBYPROB clicks 0.001 0.001   # error probability and error bound
CMS.INCRBY clicks "page:/home" 1 "page:/checkout" 2
CMS.QUERY clicks "page:/home"       # estimated count
CMS.MERGE totals clicks pageviews WEIGHTS 1 1
```

Top-K keeps the most frequent items with their approximate counts:

```text
TOPK.RESERVE trending:items 5
TOPK.ADD trending:items "item-42"
TOPK.INCRBY trending:items "item-7" 3
TOPK.QUERY trending:items "item-42"
TOPK.LIST trending:items
TOPK.INFO trending:items
```

### RedisGraph — Cypher Queries (Legacy Module)

RedisGraph entered maintenance mode in 2024 — new deployments should use FalkorDB (the community fork) or a dedicated graph store. The commands below still run on servers with the module loaded.

```text
GRAPH.QUERY social "CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})"
GRAPH.QUERY social "MATCH (p:Person)-[:KNOWS]->(f) RETURN p.name, f.name"
GRAPH.RO_QUERY social "MATCH (p:Person) RETURN count(p)"
GRAPH.PROFILE social "MATCH (p:Person) RETURN p.name"
GRAPH.EXPLAIN social "MATCH (p:Person) RETURN p.name"
GRAPH.SLOWLOG social
GRAPH.DELETE social
```

## Code Snippets

### Redis Stack Setup and Module Loading

```bash
# Redis Stack bundles RediSearch, RedisJSON, RedisTimeSeries, and RedisBloom
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest

# Raw Redis: load modules from redis.conf or the command line
redis-server --loadmodule /opt/redis-modules/redisearch.so \
             --loadmodule /opt/redis-modules/rejson.so

# Or load at runtime inside redis-cli
MODULE LOAD /opt/redis-modules/redistimeseries.so
MODULE LIST
```

### RediSearch with Python (redis-py)

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Index hashes with prefix "product:" — name is full-text, price is numeric
r.ft("idx:product").create_index(
    (redis.commands.search.field.TextField("name", weight=5.0),
     redis.commands.search.field.NumericField("price")),
    prefix=["product:"],
)

r.hset("product:1", mapping={"name": "wireless mouse", "price": 25})

# Field-targeted query with numeric range
res = r.ft("idx:product").search('@name:wireless @price:[10 40]')
print(res.total)  # 1

# Aggregation: average price per category
agg = r.ft("idx:product").aggregate(
    "*",
    ["FILTER", "@price > 0",
     "GROUPBY", "1", "@category",
     "REDUCE", "AVG", "1", "@price", "AS", "avg_price"])
print(agg.rows)
```

### RedisJSON with Node.js (node-redis)

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

await client.json.set('user:1', '$', { name: 'Alice', age: 30, tags: ['writer'] });
await client.json.arrAppend('user:1', '$.tags', 'redis');

console.log(await client.json.get('user:1', { path: '$.name' }));  // "Alice"
console.log(await client.json.numIncrBy('user:1', '$.age', 1));    // 31

// Index JSON documents with JSONPath-based schema
await client.ft.create(
  'idx:user',
  { '$.name': { type: 'TEXT', AS: 'name' } },
  { ON: 'JSON', PREFIX: 'user:' },
);

const hits = await client.ft.search('idx:user', '@name:Alice');
console.log(hits.total);
```

### RedisTimeSeries with Python

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

r.ts().create("temp:room1",
              retention_msecs=86_400_000,
              labels={"room": "room1", "area": "front"})

now = int(time.time() * 1000)
r.ts().add("temp:room1", now, 21.5)
r.ts().add("temp:room1", now + 60_000, 22.1)

# 60-second averages over the last 10 minutes
rows = r.ts().range(
    "temp:room1", now - 600_000, now,
    aggregation="avg", bucket_size_msec=60_000)
print(rows)

# Continuous compaction into an hourly series
r.ts().create("temp:room1:hourly", retention_msecs=604_800_000)
r.ts().createrule("temp:room1", "temp:room1:hourly",
                  aggregation="avg", bucket_size_msec=3_600_000)

# Latest value of every series labeled room=room1
print(r.ts().mget(["room=room1"]))
```

### RedisBloom with Python

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Bloom filter: fast duplicate detection for an order-ID stream
r.bf().reserve("seen_orders", 0.01, 1_000_000)
r.bf().add("seen_orders", "order-1234")
print(r.bf().exists("seen_orders", "order-1234"))   # 1
print(r.bf().exists("seen_orders", "order-9999"))   # 0

# Top-K: trending product surface
r.topk().reserve("trending", 5)
r.topk().add("trending", "product-a", "product-b")
print(r.topk().list("trending"))

# Count-Min Sketch: approximate view counts
r.cms().initbyprob("views", 0.001, 0.001)
r.cms().incrby("views", "video-99", 42)
print(r.cms().query("views", "video-99"))
```

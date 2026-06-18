---
title: "Redis Cheatsheet"
description: "A comprehensive quick reference for Redis commands, data types, patterns, and Node.js integration."
category: "database"
technology: "redis"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# Redis Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Set key-value | `SET key value [EX seconds] [NX\|XX]` | Set the value of a key with optional expiry and conditional flags |
| Get value | `GET key` | Get the value of a key |
| Delete key | `DEL key [key ...]` | Delete one or more keys |
| Set expiry | `EXPIRE key seconds` | Set a timeout on a key in seconds |
| Check existence | `EXISTS key [key ...]` | Determine if a key or keys exist |
| List all keys | `KEYS pattern` | Find all keys matching a pattern (avoid in production) |
| Scan keys | `SCAN cursor [MATCH pattern] [COUNT count]` | Iterate keys incrementally (production-safe) |
| Increment | `INCR key` | Increment the integer value of a key by one |
| Append to string | `APPEND key value` | Append a value to a key |
| Get range | `GETRANGE key start end` | Get a substring of the string stored at a key |
| LPUSH | `LPUSH key value [value ...]` | Prepend one or multiple values to a list |
| RPUSH | `RPUSH key value [value ...]` | Append one or multiple values to a list |
| LPOP | `LPOP key [count]` | Remove and get the first elements in a list |
| RPOP | `RPOP key [count]` | Remove and get the last elements in a list |
| LRANGE | `LRANGE key start stop` | Get a range of elements from a list |
| LLEN | `LLEN key` | Get the length of a list |
| SADD | `SADD key member [member ...]` | Add one or more members to a set |
| SMEMBERS | `SMEMBERS key` | Get all the members in a set |
| SISMEMBER | `SISMEMBER key member` | Determine if a given value is a member of a set |
| SINTER | `SINTER key [key ...]` | Intersect multiple sets |
| SUNION | `SUNION key [key ...]` | Union multiple sets |
| HSET | `HSET key field value [field value ...]` | Set multiple hash fields |
| HGET | `HGET key field` | Get the value of a hash field |
| HGETALL | `HGETALL key` | Get all the fields and values in a hash |
| HDEL | `HDEL key field [field ...]` | Delete one or more hash fields |
| ZADD | `ZADD key [NX\|XX] [GT\|LT] [CH] [INCR] score member [score member ...]` | Add one or more members to a sorted set |
| ZRANGE | `ZRANGE key start stop [BYSCORE\|BYLEX] [REV] [LIMIT offset count] [WITHSCORES]` | Return a range of members in a sorted set |
| ZINCRBY | `ZINCRBY key increment member` | Increment the score of a member in a sorted set |
| ZREVRANK | `ZREVRANK key member` | Determine the index of a member in a sorted set, with scores ordered from high to low |
| ZSCORE | `ZSCORE key member` | Get the score associated with a member |
| PUBLISH | `PUBLISH channel message` | Post a message to a channel |
| SUBSCRIBE | `SUBSCRIBE channel [channel ...]` | Listen for messages published to channels |
| MULTI | `MULTI` | Mark the start of a transaction block |
| EXEC | `EXEC` | Execute all commands issued after MULTI |
| WATCH | `WATCH key [key ...]` | Watch keys for changes before executing a transaction |
| INFO | `INFO [section]` | Get server information and statistics |
| CLIENT LIST | `CLIENT LIST` | Get the list of client connections |
| SLOWLOG GET | `SLOWLOG GET [count]` | Get the slow log entries |
| MONITOR | `MONITOR` |实时监听所有 Redis 命令请求 |
| CONFIG GET | `CONFIG GET parameter` | Get the value of a configuration parameter |
| CONFIG SET | `CONFIG SET parameter value` | Set a configuration parameter |
| SAVE | `SAVE` | Synchronously save the dataset to disk (RDB) |
| BGSAVE | `BGSAVE` | Asynchronously save the dataset to disk (RDB) in background |
| AUTH | `AUTH password` | Authenticate to the server with a password |
| ACL SETUSER | `ACL SETUSER username [rules]` | Create or modify an ACL user |
| FLUSHALL | `FLUSHALL [ASYNC\|SYNC]` | Remove all keys from all databases |
| SELECT | `SELECT index` | Change the selected database for the current connection |
| TTL | `TTL key` | Get the time-to-live for a key |
| TYPE | `TYPE key` | Determine the type of value stored at a key |
| RENAME | `RENAME key newkey` | Rename a key |

## Common Commands

### String Operations

```bash
# Basic set and get
SET user:1 "Alice"
GET user:1
# => "Alice"

# Set with expiry (10 seconds)
SET session:token "abc123" EX 10

# Set only if key does not exist
SET coupon:summer "DISCOUNT20" NX

# Atomic increment
INCR page:views
INCRBY page:views 5
DECR counter
DECRBY counter 3

# Get and set atomically
GETSET user:1 "Bob"
# Returns old value, sets new value

# Multiple keys
MSET key1 "value1" key2 "value2"
MGET key1 key2
# => 1) "value1"
#    2) "value2"

# String length and range
STRLEN user:1
GETRANGE user:1 0 3
# => "Alic"
```

### List Operations

```bash
# Queue pattern (FIFO) — RPUSH + LPOP
RPUSH queue "task1"
RPUSH queue "task2"
LPOP queue
# => "task1"

# Stack pattern (LIFO) — LPUSH + LPOP
LPUSH stack "item1"
LPUSH stack "item2"
LPOP stack
# => "item2"

# Get range without removing
LRANGE queue 0 -1
# => 1) "task2"

# Trim list to a given range
LTRIM queue 0 99
# Keeps only the first 100 elements

# Blocking pop — waits for element
BRPOP queue 5
# Blocks for up to 5 seconds

# List length
LLEN queue
```

### Set Operations

```bash
# Add and retrieve members
SADD tags:post:42 "redis"
SADD tags:post:42 "database"
SADD tags:post:42 "cache"
SMEMBERS tags:post:42
# => 1) "redis"
#    2) "database"
#    3) "cache"

# Membership check
SISMEMBER tags:post:42 "redis"
# => (integer) 1

# Set operations
SADD set:a 1 2 3 4
SADD set:b 3 4 5 6
SINTER set:a set:b
# => 1) "3"
#    2) "4"

SUNION set:a set:b
# => 1) "1" 2) "2" 3) "3" 4) "4" 5) "5" 6) "6"

SDIFF set:a set:b
# => 1) "1" 2) "2"

# Random member — useful for sampling
SRANDMEMBER tags:post:42 2
SPOP tags:post:42 1
```

### Hash Operations

```bash
# Store an object
HSET user:100 name "Alice" email "alice@example.com" age 30
HSET user:100 city "Jakarta"

# Get fields
HGET user:100 name
# => "Alice"

HGETALL user:100
# => 1) "name"
#    2) "Alice"
#    3) "email"
#    4) "alice@example.com"
#    5) "age"
#    6) "30"
#    7) "city"
#    8) "Jakarta"

# Get multiple fields
HMGET user:100 name email
# => 1) "Alice"
#    2) "alice@example.com"

# Check field existence
HEXISTS user:100 phone

# Increment a numeric field
HINCRBY user:100 age 1

# Get all field names or values
HKEYS user:100
HVALS user:100

# Delete fields
HDEL user:100 phone

# Get hash length
HLEN user:100
```

### Sorted Set Operations

```bash
# Leaderboard: add players with scores
ZADD leaderboard 1500 "player1"
ZADD leaderboard 2200 "player2"
ZADD leaderboard 1800 "player3"
ZADD leaderboard 1950 "player4"

# Get top 3 (highest scores)
ZREVRANGE leaderboard 0 2 WITHSCORES
# => 1) "player2"
#    2) "2200"
#    3) "player4"
#    4) "1950"
#    5) "player3"
#    6) "1800"

# Get player rank (0-based, high to low)
ZREVRANK leaderboard "player1"
# => 3

# Get player score
ZSCORE leaderboard "player1"
# => "1500"

# Increment score
ZINCRBY leaderboard 50 "player1"

# Get range by score
ZRANGEBYSCORE leaderboard 1500 2000 WITHSCORES
# => members with scores between 1500 and 2000

# Count members in score range
ZCOUNT leaderboard 1500 2000

# Remove members
ZREM leaderboard "player3"

# Get set cardinality
ZCARD leaderboard
```

### Server Administration

```bash
# Redis server info
INFO server
INFO memory
INFO keyspace
INFO stats
INFO persistence

# Check slow log (queries > 10ms by default)
SLOWLOG GET 5
SLOWLOG RESET

# List connected clients
CLIENT LIST

# Kill a client connection
CLIENT KILL addr 127.0.0.1:6379

# Configuration
CONFIG GET maxmemory
CONFIG SET maxmemory 512mb
CONFIG GET timeout
CONFIG GET databases

# Monitor all commands (❗ production warning — heavy)
# MONITOR
# Then Ctrl+C to exit

# Persistence administration
BGSAVE
LASTSAVE
# Check if RDB save succeeded
INFO persistence

# Flush all data
FLUSHALL ASYNC
```

## Code Snippets

### ioredis — Node.js Client Setup

```javascript
const Redis = require('ioredis');

// Basic connection
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'optional-password',
  db: 0,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3
});

// Connection events
redis.on('connect', () => console.log('Connected to Redis'));
redis.on('error', (err) => console.error('Redis error:', err));
redis.on('ready', () => console.log('Redis ready'));
redis.on('close', () => console.log('Redis connection closed'));

// Sentinel setup for high availability
const sentinel = new Redis({
  sentinels: [
    { host: 'sentinel1', port: 26379 },
    { host: 'sentinel2', port: 26379 }
  ],
  name: 'mymaster',
  role: 'master'
});

// Cluster setup
const cluster = new Redis.Cluster([
  { host: '127.0.0.1', port: 7000 },
  { host: '127.0.0.1', port: 7001 }
], {
  scaleReads: 'slave',
  clusterRetryStrategy: (times) => Math.min(times * 100, 3000)
});
```

### ioredis — CRUD and Data Type Operations

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// String operations
async function stringOps() {
  await redis.set('user:1:name', 'Alice');
  await redis.setex('session:abc', 3600, 'active');
  const name = await redis.get('user:1:name');
  const exists = await redis.exists('user:1:name');
  const ttl = await redis.ttl('session:abc');
  await redis.del('user:1:name');
}

// List operations
async function listOps() {
  await redis.rpush('notifications', 'msg1', 'msg2');
  await redis.lpush('notifications', 'urgent-msg');
  const count = await redis.llen('notifications');
  const first = await redis.lpop('notifications');
  const all = await redis.lrange('notifications', 0, -1);
}

// Set operations
async function setOps() {
  await redis.sadd('tags:post:1', 'redis', 'database');
  const members = await redis.smembers('tags:post:1');
  const isMember = await redis.sismember('tags:post:1', 'redis');
  const intersection = await redis.sinter('tags:post:1', 'tags:post:2');
}

// Hash operations
async function hashOps() {
  await redis.hset('user:100', {
    name: 'Alice',
    email: 'alice@example.com',
    age: 30
  });
  const user = await redis.hgetall('user:100');
  const name = await redis.hget('user:100', 'name');
  const fields = await redis.hmget('user:100', 'name', 'email');
}

// Sorted set operations
async function sortedSetOps() {
  await redis.zadd('leaderboard', 1500, 'player1', 2200, 'player2');
  const top3 = await redis.zrevrange('leaderboard', 0, 2, 'WITHSCORES');
  const rank = await redis.zrevrank('leaderboard', 'player1');
  const score = await redis.zscore('leaderboard', 'player1');
}
```

### Pub/Sub Pattern

```javascript
const Redis = require('ioredis');

// Publisher
const publisher = new Redis();

async function publishMessage() {
  await publisher.publish('notifications', JSON.stringify({
    type: 'user_signup',
    userId: 42,
    timestamp: Date.now()
  }));
}

// Subscriber (separate connection recommended)
const subscriber = new Redis();

subscriber.subscribe('notifications', 'system:alerts');

subscriber.on('message', (channel, message) => {
  console.log(`Received on ${channel}:`, JSON.parse(message));
});

// Pattern subscription (supports glob-style patterns)
subscriber.psubscribe('orders:*');

subscriber.on('pmessage', (pattern, channel, message) => {
  console.log(`Pattern ${pattern} matched on ${channel}:`, message);
});
```

### Pipeline and Batching

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Pipeline — commands are buffered and sent in one round trip
async function pipelineExample() {
  const pipeline = redis.pipeline();

  pipeline.set('key1', 'value1');
  pipeline.set('key2', 'value2');
  pipeline.get('key1');
  pipeline.incr('counter');
  pipeline.expire('key1', 3600);

  const results = await pipeline.exec();
  // results => [[null, 'OK'], [null, 'OK'], [null, 'value1'], [null, 1], [null, 1]]
  results.forEach(([err, result], idx) => {
    if (err) console.error(`Command ${idx} failed:`, err);
    else console.log(`Command ${idx}:`, result);
  });
}

// Auto-pipeline: ioredis auto-pipelines commands issued within the same event loop tick
// Useful for batch operations without explicit pipeline management
```

### Transactions (MULTI/EXEC)

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Optimistic locking with WATCH
async function transferFunds(fromId, toId, amount) {
  const result = await redis.watch(`account:${fromId}`, `account:${toId}`);
  if (result !== 'OK') throw new Error('Watch failed');

  const fromBalance = parseInt(await redis.get(`account:${fromId}`) || '0');
  const toBalance = parseInt(await redis.get(`account:${toId}`) || '0');

  if (fromBalance < amount) {
    await redis.unwatch();
    throw new Error('Insufficient funds');
  }

  const multi = redis.multi();
  multi.set(`account:${fromId}`, fromBalance - amount);
  multi.set(`account:${toId}`, toBalance + amount);

  const execResults = await multi.exec();
  // execResults is null if WATCH detected a modification
  if (execResults === null) {
    throw new Error('Transaction failed due to concurrent modification, retry');
  }
  return execResults;
}

// Basic transaction without WATCH
async function updateScore() {
  const [err, score] = await redis
    .multi()
    .incr('player:score')
    .get('player:score')
    .exec();

  console.log('New score:', score);
}
```

### Lua Scripting

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Define a Lua script for atomic operations
const transferScript = `
  local fromKey = KEYS[1]
  local toKey = KEYS[2]
  local amount = tonumber(ARGV[1])

  local fromBalance = tonumber(redis.call('GET', fromKey) or '0')
  if fromBalance < amount then
    return redis.error_reply('Insufficient funds')
  end

  redis.call('DECRBY', fromKey, amount)
  redis.call('INCRBY', toKey, amount)
  return { fromBalance - amount, tonumber(redis.call('GET', toKey) or '0') + amount }
`;

// Load the script (EVALSHA on subsequent calls)
async function runLuaTransfer() {
  const result = await redis.eval(transferScript, 2, 'account:1', 'account:2', 100);
  console.log('Transfer result:', result);
}

// Rate limiting with Lua script (atomic, no race conditions)
const rateLimitScript = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local now = redis.call('TIME')[1]

  redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
  local count = redis.call('ZCARD', key)

  if count >= limit then
    return { 0, tonumber(redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')[2]) + window - now }
  end

  redis.call('ZADD', key, now, now .. ':' .. math.random(1e12))
  redis.call('EXPIRE', key, window)
  return { 1, limit - count - 1 }
`;

async function checkRateLimit(userId) {
  const [allowed, retryAfter] = await redis.eval(
    rateLimitScript, 1, `ratelimit:${userId}`, 100, 60
  );
  if (!allowed) {
    console.log(`Rate limit exceeded, retry after ${retryAfter}s`);
    return false;
  }
  return true;
}
```

### Sorted Set Leaderboard

```javascript
const Redis = require('ioredis');
const redis = new Redis();

const LEADERBOARD_KEY = 'game:leaderboard';

// Submit a score
async function submitScore(playerId, score) {
  await redis.zadd(LEADERBOARD_KEY, score, playerId);
}

// Get top N players
async function getTopPlayers(count = 10) {
  const results = await redis.zrevrange(
    LEADERBOARD_KEY, 0, count - 1, 'WITHSCORES'
  );
  // Results: ['player1', '2200', 'player2', '1950', ...]
  const players = [];
  for (let i = 0; i < results.length; i += 2) {
    players.push({
      id: results[i],
      score: parseInt(results[i + 1]),
      rank: await redis.zrevrank(LEADERBOARD_KEY, results[i])
    });
  }
  return players;
}

// Get player rank and score
async function getPlayerStats(playerId) {
  const [rank, score] = await Promise.all([
    redis.zrevrank(LEADERBOARD_KEY, playerId),
    redis.zscore(LEADERBOARD_KEY, playerId)
  ]);
  return {
    rank: rank !== null ? rank + 1 : null,
    score: score ? parseInt(score) : 0
  };
}

// Get players around a specific player (for pagination)
async function getNeighborhood(playerId, radius = 3) {
  const rank = await redis.zrevrank(LEADERBOARD_KEY, playerId);
  if (rank === null) return [];

  const start = Math.max(0, rank - radius);
  const end = rank + radius;
  return await redis.zrevrange(LEADERBOARD_KEY, start, end, 'WITHSCORES');
}
```

### Rate Limiting Patterns

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Sliding window rate limiter (sorted set based)
class SlidingWindowRateLimiter {
  constructor(limit, windowSeconds, prefix = 'ratelimit') {
    this.limit = limit;
    this.window = windowSeconds * 1000;
    this.prefix = prefix;
  }

  async isAllowed(key) {
    const now = Date.now();
    const windowKey = `${this.prefix}:${key}`;

    // Remove entries outside the window
    await redis.zremrangebyscore(windowKey, 0, now - this.window);

    // Count remaining entries
    const count = await redis.zcard(windowKey);

    if (count >= this.limit) {
      return { allowed: false, remaining: 0 };
    }

    // Add current request timestamp
    await redis.zadd(windowKey, now, `${now}:${Math.random()}`);
    await redis.pexpire(windowKey, this.window);
    return { allowed: true, remaining: this.limit - count - 1 };
  }
}

// Token bucket rate limiter (string based)
class TokenBucketRateLimiter {
  constructor(capacity, refillRate, refillIntervalMs = 1000) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillInterval = refillIntervalMs;
  }

  async consume(key, tokens = 1) {
    const now = Date.now();
    const bucketKey = `${key}:bucket`;
    const timeKey = `${key}:time`;

    // Lua script for atomic token bucket
    const script = `
      local bucketKey = KEYS[1]
      local timeKey = KEYS[2]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local refillInterval = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])
      local tokens = tonumber(ARGV[5])

      local lastRefill = tonumber(redis.call('GET', timeKey) or '0')
      local bucket = tonumber(redis.call('GET', bucketKey) or capacity)

      if lastRefill == 0 then
        lastRefill = now
      end

      local elapsed = now - lastRefill
      local refillCycles = math.floor(elapsed / refillInterval)
      bucket = math.min(capacity, bucket + (refillCycles * refillRate))

      if bucket >= tokens then
        bucket = bucket - tokens
        redis.call('SET', bucketKey, bucket)
        redis.call('SET', timeKey, now)
        return { 1, bucket }
      else
        redis.call('SET', bucketKey, bucket)
        redis.call('SET', timeKey, now)
        return { 0, bucket }
      end
    `;

    const [allowed, remaining] = await redis.eval(
      script, 2, bucketKey, timeKey,
      this.capacity, this.refillRate, this.refillInterval, now, tokens
    );

    return { allowed: allowed === 1, remaining };
  }
}

// Fixed window rate limiter (simplest approach)
class FixedWindowRateLimiter {
  constructor(limit, windowSeconds) {
    this.limit = limit;
    this.window = windowSeconds;
  }

  async isAllowed(key) {
    const windowKey = `fixed:${key}:${Math.floor(Date.now() / 1000 / this.window)}`;
    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, this.window);
    }
    return count <= this.limit ? { allowed: true, remaining: this.limit - count } : { allowed: false, remaining: 0 };
  }
}
```

### Cache Invalidation Strategies

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Cache-aside (lazy loading) with TTL
async function getCachedData(key, fetchFn, ttlSeconds = 300) {
  const cached = await redis.get(key);
  if (cached !== null) {
    return JSON.parse(cached);
  }

  const data = await fetchFn();
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}

// Write-through cache
async function setWithCache(key, data, ttlSeconds = 300) {
  // Write to database first (omitted for brevity)
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
}

// Cache invalidation by pattern
async function invalidateByPattern(pattern) {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    cursor = nextCursor;
  } while (cursor !== '0');
}

// Stale-while-revalidate pattern
async function getWithStaleRevalidate(key, fetchFn, ttlSeconds = 300, staleTtlSeconds = 60) {
  const cached = await redis.get(key);

  if (cached !== null) {
    const parsed = JSON.parse(cached);
    if (parsed.stale === undefined) {
      return parsed;
    }
    // Return stale data and trigger async refresh
    if (parsed.stale < Date.now()) {
      setImmediate(async () => {
        try {
          const freshData = await fetchFn();
          await redis.setex(key, ttlSeconds, JSON.stringify(freshData));
        } catch (err) {
          console.error('Background refresh failed:', err);
        }
      });
    }
    return parsed;
  }

  // Cache miss — fetch fresh
  const data = await fetchFn();
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}

// Cache tag-based invalidation
async function tagCache(key, tags) {
  const tagKeys = tags.map(tag => `tag:${tag}`);
  await redis.sadd(...tagKeys, key);
}

async function invalidateByTag(tag) {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    await redis.del(...keys);
    await redis.del(`tag:${tag}`);
  }
}
```

### Redis Stack: JSON, Search, TimeSeries

```javascript
const Redis = require('ioredis');

// RedisJSON — store and query JSON documents
async function redisJsonExample(redis) {
  // Set a JSON document
  await redis.call('JSON.SET', 'product:1', '$', JSON.stringify({
    id: 1,
    name: 'Wireless Mouse',
    price: 29.99,
    specs: { color: 'black', dpi: 1600 }
  }));

  // Get entire document
  const product = JSON.parse(await redis.call('JSON.GET', 'product:1', '$'));

  // Get nested value
  const price = JSON.parse(await redis.call('JSON.GET', 'product:1', '$.price'));

  // Update nested value
  await redis.call('JSON.SET', 'product:1', '$.price', '24.99');

  // Increment value
  await redis.call('JSON.NUMINCRBY', 'product:1', '$.price', 5);
}

// RediSearch — full-text search and secondary indexing
async function redisSearchExample(redis) {
  // Create an index
  try {
    await redis.call('FT.CREATE', 'idx:products', 'ON', 'JSON', 'PREFIX', '1', 'product:',
      'SCHEMA', '$.name', 'AS', 'name', 'TEXT',
      '$.price', 'AS', 'price', 'NUMERIC',
      '$.specs.color', 'AS', 'color', 'TAG'
    );
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  }

  // Search
  const results = await redis.call('FT.SEARCH', 'idx:products',
    '@name:(mouse) @price:[10 50]', 'LIMIT', 0, 10
  );

  // Aggregation
  const aggResults = await redis.call('FT.AGGREGATE', 'idx:products',
    '*', 'GROUPBY', '1', '@color', 'REDUCE', 'AVG', '1', '@price', 'AS', 'avg_price'
  );
}

// RedisTimeSeries — time-series data
async function redisTimeSeriesExample(redis) {
  // Create a time-series
  try {
    await redis.call('TS.CREATE', 'ts:sensor:temp', 'LABELS', 'sensor', 'temp', 'room', 'server');
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  }

  // Add samples
  await redis.call('TS.ADD', 'ts:sensor:temp', '*', 23.5);
  await redis.call('TS.ADD', 'ts:sensor:temp', '*', 24.1);

  // Query range
  const range = await redis.call('TS.RANGE', 'ts:sensor:temp', '-', '+');
  // range => [[timestamp1, 23.5], [timestamp2, 24.1]]

  // Aggregation query
  const avg = await redis.call('TS.RANGE', 'ts:sensor:temp', '-', '+',
    'AGGREGATION', 'AVG', 60000
  );
}

// Usage
const redis = new Redis();
redisJsonExample(redis).catch(console.error);
redisSearchExample(redis).catch(console.error);
redisTimeSeriesExample(redis).catch(console.error);
```

### ACL and Security Commands

```bash
# Redis 6+ ACL-based authentication

# Create a new user with limited permissions
ACL SETUSER reader on >readonly-pass ~* +@read

# Create a user with read/write access to specific key patterns
ACL SETUSER writer on >write-pass ~users:* ~sessions:* +@write +@read -@dangerous

# Create a user with full access
ACL SETUSER admin on >admin-pass ~* +@all

# List all users
ACL LIST

# Get user information
ACL GETUSER reader

# Delete a user
ACL DELUSER reader

# Whoami — check current user
ACL WHOAMI

# Generate a random password
ACL GENPASS

# Set default user password (legacy AUTH)
CONFIG SET requirepass "my-strong-password"

# Log all failed authentication attempts
ACL LOG
ACL LOG RESET
```

### Persistence Configuration

```bash
# RDB (Redis Database Backup) — point-in-time snapshots
# Configure in redis.conf:
#   save 900 1       # Save if at least 1 key changes in 900 seconds
#   save 300 10      # Save if at least 10 keys change in 300 seconds
#   save 60 10000    # Save if at least 10000 keys change in 60 seconds
#   dbfilename dump.rdb
#   dir /var/lib/redis

# AOF (Append-Only File) — logs every write operation
# Configure in redis.conf:
#   appendonly yes
#   appendfilename "appendonly.aof"
#   appendfsync everysec   # fsync policy: always | everysec | no
#   auto-aof-rewrite-percentage 100
#   auto-aof-rewrite-min-size 64mb

# AOF rewrite (compact)
BGREWRITEAOF

# Check which persistence mode is active
INFO persistence

# Switch between modes at runtime
CONFIG SET appendonly yes
CONFIG SET save ""

# Hybrid persistence (RDB + AOF) — Redis 5+: AOF rewrite generates RDB preamble
# This combines RDB snapshot speed with AOF durability
```

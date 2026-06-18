---
title: "Redis Caching Patterns and Strategies Guide"
description: "A comprehensive guide to Redis caching patterns including cache-aside, write-through, write-behind, read-through, cache invalidation strategies, distributed caching, cache stampede prevention, and production best practices with ioredis and Node.js."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Redis Caching Patterns and Strategies Guide

## Introduction

Caching is one of the most impactful performance optimization techniques in modern application architecture. Redis, with its sub-millisecond latency, rich data structure support, and built-in eviction policies, has become the de facto caching layer for distributed systems. However, effective caching requires more than just storing key-value pairs — it demands careful selection of caching patterns, invalidation strategies, serialization formats, and operational practices.

This guide explores battle-tested Redis caching patterns and strategies: from fundamental architectures like cache-aside and write-through to advanced topics like cache stampede prevention, distributed caching with Redis Cluster, and production security. Whether you are building a REST API, a real-time leaderboard, or a rate-limiting system, the patterns covered here will help you design a robust, performant, and maintainable caching layer.

## Best Practices

### 1. Choose the Right Caching Pattern for Your Workload

Different access patterns demand different caching strategies:

- **Cache-Aside (Lazy Loading)**: Best for read-heavy workloads with infrequent writes. The application code checks the cache first and falls back to the database on a miss. Simple to implement and resilient to cache failures.
- **Read-Through**: The cache layer itself handles database fallback transparently. Reduces boilerplate in application code but requires a cache library that supports this pattern.
- **Write-Through**: Every write goes through the cache to the database. Ensures strong consistency between cache and database at the cost of increased write latency.
- **Write-Behind (Write-Back)**: Writes are acknowledged immediately and asynchronously persisted to the database. Offers the best write performance but introduces risk of data loss on cache failure.

```javascript
// Cache-Aside Pattern Example with ioredis
const Redis = require('ioredis');
const redis = new Redis();

async function getUser(userId) {
  const cacheKey = `user:${userId}`;

  // 1. Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss — fetch from database
  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return null;

  // 3. Populate cache with TTL
  await redis.setex(cacheKey, 3600, JSON.stringify(user));
  return user;
}
```

### 2. Implement Stale-While-Revalidate for Resilience

Stale-while-revalidate is a caching strategy that serves stale data while asynchronously refreshing the cache in the background. This prevents cache miss storms and provides resilience against upstream failures.

```javascript
async function getProduct(productId) {
  const cacheKey = `product:${productId}`;
  const staleKey = `product:${productId}:stale`;

  // Try fresh cache first
  const fresh = await redis.get(cacheKey);
  if (fresh !== null) {
    return JSON.parse(fresh);
  }

  // Try stale cache
  const stale = await redis.get(staleKey);
  if (stale !== null) {
    // Trigger async refresh without awaiting
    refreshProductCache(productId).catch(err =>
      console.error('Background refresh failed:', err)
    );
    return JSON.parse(stale);
  }

  // Complete miss — fetch synchronously
  return refreshProductCache(productId);
}
```

### 3. Adopt an Explicit Cache Invalidation Strategy

Cache invalidation is one of the hardest problems in computer science. Use a combination of these strategies:

- **TTL-Based Expiration**: The simplest and most reliable approach. Set appropriate TTLs based on data volatility. Use `SETEX` or `EXPIRE` commands.
- **Event-Driven Invalidation**: Use Redis Pub/Sub to broadcast invalidation events when data changes. This ensures all application instances invalidate their cache simultaneously.
- **Explicit Deletion**: Directly delete or update cache entries when the underlying data changes. Use `DEL`, `UNLINK`, or `SET` with the same key.

```javascript
// Event-driven cache invalidation with Pub/Sub
const subscriber = new Redis();
const publisher = new Redis();

// Subscribe to invalidation channel
subscriber.subscribe('cache:invalidate');
subscriber.on('message', (channel, message) => {
  const { key } = JSON.parse(message);
  redis.del(key).catch(console.error);
});

// Publish invalidation when data changes
async function updateUser(userId, data) {
  await db.query('UPDATE users SET ... WHERE id = ?', [data, userId]);
  const cacheKey = `user:${userId}`;
  await publisher.publish('cache:invalidate', JSON.stringify({ key: cacheKey }));
}
```

### 4. Prevent Cache Stampedes with Mutex and Probabilistic Early Expiration

A cache stampede (or thundering herd) occurs when many requests simultaneously trigger a cache miss and all attempt to regenerate the same cached value. Mitigate this with:

- **Mutex Locking**: Only one request regenerates the cache; others wait or get served stale data.
- **Probabilistic Early Expiration**: Randomly expire cache entries before their actual TTL to spread regeneration load.

```javascript
// Mutex-based cache stampede prevention
async function getExpensiveData(key, ttl = 300) {
  const lockKey = `lock:${key}`;
  const lockTTL = 10; // seconds

  const cached = await redis.get(key);
  if (cached !== null) {
    return JSON.parse(cached);
  }

  // Try to acquire lock
  const lockAcquired = await redis.set(lockKey, '1', 'EX', lockTTL, 'NX');
  if (!lockAcquired) {
    // Another request is regenerating — wait briefly and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    const retryCached = await redis.get(key);
    if (retryCached) return JSON.parse(retryCached);
    throw new Error('Cache regeneration in progress, try again');
  }

  try {
    const data = await expensiveComputation();
    await redis.setex(key, ttl, JSON.stringify(data));
    return data;
  } finally {
    await redis.del(lockKey);
  }
}
```

```javascript
// Probabilistic Early Expiration (XFetch algorithm)
function shouldRecompute(ttl, beta = 1.0) {
  const now = Date.now() / 1000;
  const age = now - (ttl - (ttl | 0));
  const remaining = ttl - age;
  const chance = Math.random() * beta * Math.log(1 + Math.random());
  return remaining <= chance * ttl;
}
```

### 5. Choose the Right Serialization Format

Serialization impacts both performance and memory usage:

- **JSON**: Human-readable, universally supported, but slower to parse and more memory-intensive. Best for interoperability.
- **MessagePack**: Binary JSON alternative. Faster serialization/deserialization and ~30% smaller payloads than JSON. Use the `msgpackr` or `@msgpack/msgpack` library.
- **Protocol Buffers**: Strongly typed, schema-driven, smallest payload size. Best for high-throughput systems with stable schemas. Use `protobufjs` or Google's official compiler.

```javascript
// Comparing serialization formats with ioredis
const msgpack = require('msgpackr');

const data = { id: 1, name: 'Alice', roles: ['admin', 'editor'] };

// JSON: ~58 bytes
await redis.set('user:1', JSON.stringify(data));

// MessagePack: ~41 bytes (~30% smaller)
await redis.set(Buffer.from('user:1'), msgpack.encode(data));
// Read back
const raw = await redis.getBuffer(Buffer.from('user:1'));
const decoded = msgpack.decode(raw);
```

### 6. Manage Memory Effectively with Eviction Policies

Redis eviction policies determine how keys are removed when `maxmemory` is reached:

- **`allkeys-lru`** (most common): Evicts the least recently used keys across all keys. Best general-purpose policy for caching.
- **`allkeys-lfu`**: Evicts the least frequently used keys. Better when access patterns are stable and some keys are "hot."
- **`volatile-ttl`**: Evicts keys with the shortest remaining TTL. Suitable when TTLs are explicitly set on all cache keys.
- **`noeviction`**: Returns errors on writes when memory is full. Use only for data that must never be evicted.

```bash
# Configure maxmemory and eviction policy
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

```javascript
// Monitor memory usage programmatically
const info = await redis.info('memory');
console.log(info);
// Parse used_memory_human, maxmemory, etc.
```

### 7. Secure Your Redis Cache

Security is often overlooked in caching layers:

- **TLS Encryption**: Always enable TLS for Redis connections in production, especially when traversing untrusted networks.
- **AUTH Password**: Use a strong, unique password with the `REQUIREPASS` directive.
- **ACL Rules** (Redis 6+): Create granular user permissions with restricted command sets and key patterns.

```javascript
// Secure ioredis connection with TLS and AUTH
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6380,
  password: process.env.REDIS_PASSWORD,
  tls: {
    key: fs.readFileSync('client.key'),
    cert: fs.readFileSync('client.crt'),
    ca: [fs.readFileSync('ca.crt')]
  },
  enableAutoPipelining: true,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});
```

### 8. Monitor Cache Performance with Hit Rate Metrics

Track cache efficiency to tune your strategy:

```javascript
async function getWithMetrics(key, fetchFn) {
  const cached = await redis.get(key);
  if (cached !== null) {
    await redis.incr('metrics:cache:hits');
    return JSON.parse(cached);
  }

  await redis.incr('metrics:cache:misses');
  const data = await fetchFn();
  await redis.setex(key, 3600, JSON.stringify(data));

  // Log hit rate periodically
  const hits = parseInt(await redis.get('metrics:cache:hits') || '0');
  const misses = parseInt(await redis.get('metrics:cache:misses') || '0');
  const total = hits + misses;
  if (total > 0 && total % 100 === 0) {
    console.log(`Cache hit rate: ${((hits / total) * 100).toFixed(1)}%`);
  }

  return data;
}
```

### 9. Use Connection Pooling and Retry Strategies with ioredis

Efficient connection management is critical for production Redis usage:

```javascript
const Redis = require('ioredis');

// Cluster connection with retry and backoff
const cluster = new Redis.Cluster([
  { host: '127.0.0.1', port: 7000 },
  { host: '127.0.0.1', port: 7001 },
  { host: '127.0.0.1', port: 7002 }
], {
  clusterRetryStrategy: (times) => Math.min(times * 100, 3000),
  redisOptions: {
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 5) return null; // Give up
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true
  }
});

// Graceful error handling
cluster.on('error', (err) => {
  console.error('Redis Cluster error:', err.message);
});

cluster.on('node error', (err, node) => {
  console.error(`Node ${node} error:`, err.message);
});
```

## Implementation Steps

### Step 1: Assess Your Caching Needs

Before writing any code, analyze your application's data access patterns:

1. **Profile read/write ratios**: Use application logging or APM tools to identify which queries are the most frequent and expensive.
2. **Identify cacheable data**: Not all data benefits from caching. Prioritize:
   - Frequently read, infrequently updated data (e.g., product catalogs, configuration)
   - Computationally expensive results (e.g., aggregated reports, recommendations)
   - Session data with short-lived TTLs
3. **Determine consistency requirements**: Can your application tolerate stale reads? If yes, cache-aside with TTL is sufficient. If strict consistency is required, consider write-through or event-driven invalidation.
4. **Size your Redis instance**: Estimate the total dataset size and choose an appropriate `maxmemory`. Account for Redis serialization overhead (typically 1.5x–2x the raw data size).

### Step 2: Design the Caching Layer Architecture

Lay out your caching infrastructure:

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Application  │────▶│   Redis     │────▶│  Database   │
│ (Node.js)    │     │   Cache     │     │  (Primary)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │            ┌──────┴──────┐
       │            │   Redis     │
       └────────────│   Cluster   │ (optional)
                    │  (sharding) │
                    └─────────────┘
```

For most applications, a single Redis instance with `allkeys-lru` eviction is sufficient. For datasets exceeding a single node's memory:

1. **Redis Cluster**: Automatically shards data across multiple nodes. Use when your dataset exceeds ~25 GB or when you need write scalability.
2. **Redis Sentinel**: Provides high availability with automatic failover. Combine with Cluster for both scale and HA.
3. **Read Replicas**: Offload read traffic to replica nodes. Configure `ioredis` with `preferredSlaves` for read operations.

```javascript
// Redis Cluster with read replica preference
const cluster = new Redis.Cluster(
  [{ host: '127.0.0.1', port: 7000 }],
  {
    scaleReads: 'slave',
    redisOptions: { enableAutoPipelining: true }
  }
);

// Write goes to master, read goes to replica
await cluster.set('key', 'value');        // Master
const val = await cluster.get('key');      // Replica
```

### Step 3: Implement Core Caching Patterns

#### Cache-Aside with Error Handling

This is the most widely used pattern and should be your default:

```javascript
class CacheAside {
  constructor(redis, db, options = {}) {
    this.redis = redis;
    this.db = db;
    this.ttl = options.ttl || 3600;
    this.staleTtl = options.staleTtl || 86400;
    this.prefix = options.prefix || 'cache';
  }

  key(id) {
    return `${this.prefix}:${id}`;
  }

  staleKey(id) {
    return `${this.key(id)}:stale`;
  }

  async get(id, fetchFn) {
    const cacheKey = this.key(id);
    const staleKey = this.staleKey(id);

    try {
      // Fast path: cache hit
      const cached = await this.redis.get(cacheKey);
      if (cached !== null) {
        return JSON.parse(cached);
      }

      // Stale path: serve stale, refresh in background
      const stale = await this.redis.get(staleKey);
      if (stale !== null) {
        this.fetchAndCache(id, fetchFn).catch(err =>
          console.error('Background refresh failed:', err)
        );
        return JSON.parse(stale);
      }

      // Miss path: synchronous fetch
      return await this.fetchAndCache(id, fetchFn);
    } catch (err) {
      console.error('Cache error, falling back to database:', err.message);
      return fetchFn();
    }
  }

  async fetchAndCache(id, fetchFn) {
    const data = await fetchFn();
    if (data === null || data === undefined) return null;

    const cacheKey = this.key(id);
    const staleKey = this.staleKey(id);

    // Pipeline both writes for atomicity
    const pipeline = this.redis.pipeline();
    pipeline.setex(cacheKey, this.ttl, JSON.stringify(data));
    pipeline.setex(staleKey, this.staleTtl, JSON.stringify(data));
    await pipeline.exec();

    return data;
  }

  async invalidate(id) {
    await this.redis.del(this.key(id), this.staleKey(id));
  }
}

// Usage
const cache = new CacheAside(redis, db, { ttl: 300, staleTtl: 3600 });

app.get('/users/:id', async (req, res) => {
  const user = await cache.get(req.params.id, () =>
    db.query('SELECT * FROM users WHERE id = ?', [req.params.id])
  );
  res.json(user);
});
```

#### Write-Through Pattern for Consistency

Use when write consistency between cache and database is critical:

```javascript
class WriteThrough {
  constructor(redis, db, options = {}) {
    this.redis = redis;
    this.db = db;
    this.ttl = options.ttl || 3600;
    this.prefix = options.prefix || 'cache';
  }

  async set(id, data) {
    const cacheKey = `${this.prefix}:${id}`;

    // Write to database first
    await this.db.query('UPDATE users SET ... WHERE id = ?', [data, id]);

    // Then update cache
    await this.redis.setex(cacheKey, this.ttl, JSON.stringify(data));
  }

  async get(id) {
    const cacheKey = `${this.prefix}:${id}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached);
    }

    // Fallback to database
    const data = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (data) {
      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(data));
    }
    return data;
  }
}
```

#### Write-Behind Pattern for High-Throughput Writes

Use when write throughput is critical and eventual consistency is acceptable:

```javascript
class WriteBehind {
  constructor(redis, db, options = {}) {
    this.redis = redis;
    this.db = db;
    this.queueKey = options.queueKey || 'write:queue';
    this.batchSize = options.batchSize || 100;
    this.flushInterval = options.flushInterval || 5000; // ms
    this.isProcessing = false;

    // Start background flush worker
    setInterval(() => this.flush(), this.flushInterval);
  }

  async set(id, data) {
    // Acknowledge immediately, enqueue for persistence
    await this.redis.lpush(this.queueKey, JSON.stringify({ id, data, ts: Date.now() }));

    // Optionally update the cache instantly
    await this.redis.setex(`${this.prefix}:${id}`, this.ttl, JSON.stringify(data));
  }

  async flush() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const batch = [];
      while (batch.length < this.batchSize) {
        const item = await this.redis.rpop(this.queueKey);
        if (!item) break;
        batch.push(JSON.parse(item));
      }

      if (batch.length === 0) return;

      // Batch write to database
      const queries = batch.map(item =>
        this.db.query('UPDATE users SET ... WHERE id = ?', [item.data, item.id])
      );
      await Promise.all(queries);

      console.log(`Flushed ${batch.length} writes to database`);
    } catch (err) {
      console.error('Write-behind flush failed:', err.message);
      // Re-enqueue failed items
    } finally {
      this.isProcessing = false;
    }
  }
}
```

### Step 4: Implement Advanced Redis Patterns

#### Redis as a Rate Limiter

Use Redis as a distributed rate limiter with three common algorithms:

**Sliding Window Log:**

```javascript
async function slidingWindowRateLimit(userId, maxRequests = 10, windowMs = 60000) {
  const key = `ratelimit:${userId}:${Math.floor(Date.now() / windowMs)}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.pexpire(key, windowMs);
  }
  return current <= maxRequests;
}
```

**Token Bucket:**

```javascript
async function tokenBucketRateLimit(userId, capacity = 10, refillRate = 1, refillInterval = 1000) {
  const key = `tokenbucket:${userId}`;
  const now = Date.now();

  const result = await redis.eval(`
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local refill_rate = tonumber(ARGV[2])
    local refill_interval = tonumber(ARGV[3])
    local now = tonumber(ARGV[4])

    local bucket = redis.call('hmget', key, 'tokens', 'last_refill')
    local tokens = tonumber(bucket[1]) or capacity
    local last_refill = tonumber(bucket[2]) or now

    local elapsed = now - last_refill
    local refill_count = math.floor(elapsed / refill_interval) * refill_rate
    tokens = math.min(capacity, tokens + refill_count)

    if tokens >= 1 then
      tokens = tokens - 1
      redis.call('hmset', key, 'tokens', tokens, 'last_refill', now)
      redis.call('pexpire', key, math.ceil(capacity * refill_interval / refill_rate))
      return 1
    else
      return 0
    end
  `, 1, key, capacity, refillRate, refillInterval, now);

  return result === 1;
}
```

**Fixed Window:**

```javascript
async function fixedWindowRateLimit(userId, maxRequests = 100, windowMs = 60000) {
  const windowKey = `fixed:${userId}:${Math.floor(Date.now() / windowMs)}`;
  const count = await redis.incr(windowKey);
  if (count === 1) {
    await redis.pexpire(windowKey, windowMs);
  }
  return count <= maxRequests;
}
```

#### Session Store with Redis

Redis is the industry standard for distributed session storage:

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

app.use(session({
  store: new RedisStore({
    client: redis,
    prefix: 'sess:',
    ttl: 86400 // 24 hours
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // HTTPS only
    httpOnly: true,     // No JS access
    sameSite: 'strict',
    maxAge: 86400000    // 24 hours
  }
}));
```

#### Real-Time Leaderboards with Redis Sorted Sets

Redis sorted sets provide efficient leaderboard operations:

```javascript
// Add/update player score
async function updateScore(gameId, playerId, score) {
  await redis.zadd(`leaderboard:${gameId}`, score, playerId);
}

// Get top 10 players
async function getTopPlayers(gameId, limit = 10) {
  return redis.zrevrange(`leaderboard:${gameId}`, 0, limit - 1, 'WITHSCORES');
}

// Get player rank
async function getPlayerRank(gameId, playerId) {
  const rank = await redis.zrevrank(`leaderboard:${gameId}`, playerId);
  return rank !== null ? rank + 1 : null; // 0-indexed, convert to 1-indexed
}

// Get scores around a player (for pagination)
async function getNeighbors(gameId, playerId, radius = 5) {
  const rank = await redis.zrevrank(`leaderboard:${gameId}`, playerId);
  if (rank === null) return [];
  const start = Math.max(0, rank - radius);
  const end = rank + radius;
  return redis.zrevrange(`leaderboard:${gameId}`, start, end, 'WITHSCORES');
}

// Increment score atomically
async function incrementScore(gameId, playerId, increment) {
  await redis.zincrby(`leaderboard:${gameId}`, increment, playerId);
}

// Remove inactive players
async function cleanupLeaderboard(gameId, retention) {
  const cutoff = Date.now() - retention;
  // Assuming score encodes a timestamp; otherwise use a separate sorted set
  await redis.zremrangebyscore(`leaderboard:${gameId}`, 0, cutoff);
}
```

### Step 5: Set Up Distributed Caching with Redis Cluster

When your dataset grows beyond a single node, Redis Cluster provides automatic sharding:

```javascript
const Redis = require('ioredis');

const cluster = new Redis.Cluster([
  { host: 'redis-node-1', port: 7000 },
  { host: 'redis-node-2', port: 7001 },
  { host: 'redis-node-3', port: 7002 }
], {
  // Enable auto-pipelining for better performance
  enableAutoPipelining: true,

  // Scale reads to replicas if available
  scaleReads: 'slave',

  // Connection pool settings
  redisOptions: {
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
  },

  // Cluster health monitoring
  clusterRetryStrategy: (times) => {
    if (times > 10) return null; // Give up after 10 retries
    return Math.min(times * 100, 3000);
  }
});

cluster.on('connect', () => console.log('Connected to Redis Cluster'));
cluster.on('error', (err) => console.error('Redis Cluster error:', err));
cluster.on('-node', (node) => console.warn(`Node removed: ${node}`));
cluster.on('+node', (node) => console.info(`Node added: ${node}`));

async function waitForCluster() {
  await cluster.connect();
  const info = await cluster.clusterInfo();
  console.log('Cluster state:', info);
}
```

### Step 6: Implement Cache Warming

Pre-populate the cache with frequently accessed data to avoid cold-start misses:

```javascript
async function warmCache() {
  const popularProducts = await db.query(
    'SELECT * FROM products ORDER BY views DESC LIMIT 1000'
  );

  const pipeline = redis.pipeline();
  for (const product of popularProducts) {
    const key = `product:${product.id}`;
    pipeline.setex(key, 3600, JSON.stringify(product));
  }

  await pipeline.exec();
  console.log(`Warmed cache with ${popularProducts.length} products`);
}

// Schedule cache warming on application start
app.on('ready', async () => {
  try {
    await warmCache();
  } catch (err) {
    console.error('Cache warming failed:', err.message);
    // Application can still serve requests; cache will be populated lazily
  }
});
```

### Step 7: Set Up Monitoring and Alerting

Monitor cache performance to detect issues early:

```javascript
// Export metrics for Prometheus/Grafana
const prometheus = {
  cacheHits: new Map(),
  cacheMisses: new Map(),
  cacheLatency: new Map()
};

async function trackOperation(operation, key, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const latency = Date.now() - start;

    // Track latency
    const opKey = `${operation}:${key.split(':')[0]}`;
    if (!prometheus.cacheLatency.has(opKey)) {
      prometheus.cacheLatency.set(opKey, []);
    }
    prometheus.cacheLatency.get(opKey).push(latency);

    return result;
  } catch (err) {
    console.error(`Cache operation ${operation} failed:`, err.message);
    throw err;
  }
}

// Periodically log metrics
setInterval(async () => {
  const info = await redis.info('stats');
  console.log('Redis Stats:', {
    hits: info.keyspace_hits,
    misses: info.keyspace_misses,
    hitRate: info.keyspace_hits / (info.keyspace_hits + info.keyspace_misses)
  });
}, 60000);
```

### Step 8: Establish Operational Procedures

1. **Connection management**: Always use connection pooling. Never create a new Redis connection per request.
2. **Graceful degradation**: Cache failures should never crash your application. Implement circuit breakers and fallback to the primary database.
3. **Key naming convention**: Adopt a consistent `namespace:entity:id` convention (e.g., `user:profile:123`). This makes debugging and monitoring easier.
4. **Avoid dangerous commands**: Never use `KEYS *` in production. Use `SCAN` for iteration and `UNLINK` for asynchronous deletion.
5. **Pipeline batch operations**: Group related Redis commands into pipelines to reduce round trips:

```javascript
// Bad: N round trips
for (const id of ids) {
  await redis.get(`user:${id}`);
}

// Good: 1 round trip
const pipeline = redis.pipeline();
for (const id of ids) {
  pipeline.get(`user:${id}`);
}
const results = await pipeline.exec();
```

1. **Use Lua scripts for atomicity**: Critical multi-key operations should be encapsulated in Lua scripts to ensure atomicity and reduce network round trips.
2. **Monitor memory fragmentation**: Redis memory fragmentation ratio (`mem_fragmentation_ratio`) above 1.5 indicates fragmentation issues. Restart the instance or use `MEMORY PURGE`.
3. **Plan for capacity**: Monitor used_memory vs maxmemory. Set alerts at 75%, 85%, and 95% utilization.

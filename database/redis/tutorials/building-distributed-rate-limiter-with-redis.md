---
title: "Building a Distributed Rate Limiter with Redis"
description: "An advanced hands-on tutorial on building a distributed rate limiter with Redis — covering fixed window, sliding window log, and token bucket algorithms, Lua scripting for atomicity, Express middleware integration, and production hardening for multi-instance deployments."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Distributed Rate Limiter with Redis

## Summary

This tutorial walks you through building a production-grade distributed rate limiter backed by Redis. You will implement three classic algorithms — fixed window counter, sliding window log, and token bucket — make them atomic with Lua scripting, integrate them into an Express application as reusable middleware, and harden the design for multi-instance and multi-region deployments where a shared Redis instance is the single source of truth.

## Target Audience

- Backend developers building public APIs, microservices, or any service that must protect itself from abusive traffic.
- Developers who already know the Redis basics (data structures, TTL, basic commands) and want to apply them to a real distributed-systems problem.
- Expected developer level: Advanced — comfortable with Node.js, asynchronous programming, and basic Redis concepts.

## Prerequisites

- Intermediate knowledge of Redis data structures and commands (strings, sorted sets, `EXPIRE`).
- Node.js 18+ installed, with an `ioredis` client available (`npm install ioredis`).
- A running Redis server (local `redis-server` or a Docker container) on `localhost:6379`.
- Basic familiarity with Express middleware and HTTP status codes.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain the trade-offs between fixed window, sliding window log, and token bucket rate limiting algorithms.
- Implement each algorithm against Redis using the correct data structures and TTL strategy.
- Write Lua scripts that make multi-step rate-limiting checks atomic, eliminating race conditions.
- Integrate a rate limiter into Express as reusable middleware that returns correct `429` responses with `Retry-After` headers.
- Design rate limiting for distributed deployments, including key naming, hash-tagging for cluster mode, and fail-open versus fail-closed behavior.

## Context and Motivation

Public APIs, login endpoints, search endpoints, and webhook consumers all share one problem: they can be overwhelmed by a single caller. A misbehaving client — a buggy retry loop, a scraper, or an attacker — can consume capacity meant for everyone else, degrade latency for all users, and run up infrastructure bills.

Rate limiting solves this by enforcing a simple contract: a caller may perform at most N requests per time window. The hard part is that modern services run many instances behind a load balancer, so an in-memory counter in one Node.js process is useless — instance A would not know about requests handled by instance B. Redis solves this because it is a shared, low-latency, single-threaded data store: every instance talks to the same Redis, counters are consistent by construction, and Lua scripts run atomically with no interleaving from other clients.

This tutorial treats Redis not as a cache but as a coordination primitive. By the end, you will have a rate limiter that is correct under concurrency, cheap to operate, and ready for production.

## Core Content

### Algorithm Overview

All rate limiters answer the same question: *has this caller exceeded N requests within the last W seconds?* They differ in how accurately they measure the window and how much memory they spend.

```text
| Algorithm          | Accuracy              | Memory  | Burst behavior              |
|--------------------|-----------------------|---------|-----------------------------|
| Fixed window       | Coarse (window edges) | O(1)    | Allows 2x burst at boundary |
| Sliding window log | Exact                 | O(N)    | Smooth, no bursts           |
| Sliding window     | Approximate           | O(1)    | Mostly smooth               |
| Token bucket       | Continuous            | O(1)    | Bounded, deliberate bursts  |
```

### Fixed Window Counter

The simplest algorithm: one Redis key per caller per window. Each request increments the key; when the key reaches the limit, the request is rejected. The key carries a TTL equal to the window length, which both expires the counter and deletes the key.

```bash
# First request in the window
SET limiter:user:42 1 NX EX 60
# Subsequent requests
INCR limiter:user:42
```

A naive two-command version has a race: `SET NX` followed by `INCR` is not atomic, and `INCR` then `EXPIRE` loses the TTL if the process dies between them. The fix is a small Lua script that performs the whole check-and-increment in one atomic step.

### Sliding Window Log with Sorted Sets

The fixed window has a well-known weakness: if the limit is 100 requests per minute, a caller can send 100 requests at 11:59:59 and another 100 at 12:00:01 — 200 requests in two seconds. The sliding window log eliminates this by remembering each request's timestamp.

A sorted set keyed by caller stores every request with a score equal to its Unix timestamp:

```bash
# Record a request at time T
ZADD limiter:user:42 T T
# Remove requests older than the window
ZREMRANGEBYSCORE limiter:user:42 -inf (T-60
# Count remaining requests
ZCARD limiter:user:42
# Set/reset TTL so the key dies when idle
EXPIRE limiter:user:42 60
```

This is exact but memory-hungry: one member per request. Under a high per-second request rate the sorted set grows large, and every check does three or four commands. For most APIs the fixed window or token bucket is cheaper and good enough.

### Token Bucket with Lua

The token bucket models capacity as tokens: the bucket holds at most `capacity` tokens, tokens refill at `rate` tokens per second, and a request consumes one token. It allows short bursts up to the bucket size while enforcing a long-term average rate.

Keep two pieces of state per caller: the current token count and the last refill timestamp.

```text
tokens  = min(capacity, tokens + (now - last_refill) * rate)
if tokens >= 1:
    tokens = tokens - 1
    allow = true
else:
    allow = false
```

This mutates two fields and must be atomic — exactly what a Lua script guarantees.

### Atomicity with Lua Scripting

Redis executes Lua scripts atomically: no other client's commands run while a script executes. This makes Lua the standard tool for multi-step rate-limit logic. A script takes the key, the limit, and the window as arguments, performs the check, and returns whether the request is allowed and how long the caller must wait before retrying.

```lua
-- KEYS[1] caller key, ARGV[1] limit, ARGV[2] window seconds,
-- ARGV[3] current unix timestamp
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local current = redis.call('GET', key)
if not current then
  redis.call('SET', key, 1, 'PX', window * 1000)
  return {1, 0}
end
current = tonumber(current)
if current < limit then
  redis.call('INCR', key)
  return {1, 0}
end
local ttl = redis.call('PTTL', key)
if ttl <= 0 then
  redis.call('SET', key, 1, 'PX', window * 1000)
  return {1, 0}
end
return {0, math.ceil(ttl / 1000)}
```

The script returns two values: `1`/`0` for allowed/rejected, and the remaining wait time in seconds, which the API layer surfaces as the `Retry-After` header.

### Key Naming and TTL Hygiene

Choose key names that are unambiguous and namespaced so Redis keys from different features never collide:

```text
ratelimit:{algorithm}:{scope}:{identifier}
ratelimit:fixed:user:42
ratelimit:token:ip:203.0.113.7
ratelimit:bucket:api-key:abc123
```

Every key must carry a TTL. Fixed window keys expire after the window; token bucket keys can use a longer TTL tied to `capacity / rate` plus a small margin, refreshed on every write. A missing TTL is the classic production bug: keys accumulate forever and Redis memory grows without bound.

### Distributed System Considerations

- **Single source of truth**: all application instances read and write the same Redis, so limits hold across the fleet with zero coordination between instances.
- **Clock skew**: pass the timestamp into the Lua script as an argument (taken from the application or a single reference clock) instead of calling `TIME` inside the script per-request — consistent time across all limits avoids edge artifacts.
- **Cluster mode**: in Redis Cluster, keys are sharded by hash slot. Use hash tags such as `ratelimit:{user:42}:fixed` so all keys for one caller land on the same node, making multi-key scripts safe.
- **Fail-open versus fail-closed**: decide what happens when Redis is unreachable. Fail-closed (reject) protects the backend but turns a Redis outage into a full API outage; fail-open (allow) keeps the API up but loses protection. Most production systems choose fail-open for GET-heavy APIs and fail-closed for auth endpoints.
- **Standalone versus shared instances**: a dedicated Redis for rate limiting avoids eviction and latency interference from the cache workload, but costs more. With a shared instance, use `maxmemory-policy allkeys-lru` carefully — LRU eviction of rate-limit keys silently disables protection.

### Testing and Verification

Verify correctness with concurrent requests: fire 100 parallel requests against a limit of 10 per 10 seconds and assert exactly 10 succeed. Also test window-edge behavior on the fixed window algorithm, token bucket refill timing, and the Lua atomicity guarantee by hammering the limiter from several Node.js processes at once.

## Code Examples

### Shared Redis Connection

```javascript
// redis.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  enableOfflineQueue: false, // fail fast when Redis is down
  maxRetriesPerRequest: 1,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

module.exports = redis;
```

### Fixed Window Limiter (Atomic with Lua)

```javascript
// fixedWindow.js
const redis = require('./redis');

const FIXED_WINDOW_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])

local current = redis.call('GET', key)
if not current then
  redis.call('SET', key, 1, 'PX', windowMs)
  return {1, 0}
end
current = tonumber(current)
if current < limit then
  redis.call('INCR', key)
  return {1, 0}
end
local ttl = redis.call('PTTL', key)
if ttl <= 0 then
  redis.call('SET', key, 1, 'PX', windowMs)
  return {1, 0}
end
return {0, math.ceil(ttl / 1000)}
`;

async function fixedWindowLimit(key, limit, windowSeconds) {
  const [allowed, retryAfter] = await redis.eval(
    FIXED_WINDOW_SCRIPT,
    1,
    `ratelimit:fixed:${key}`,
    String(limit),
    String(windowSeconds * 1000)
  );
  return { allowed: allowed === 1, retryAfter };
}

module.exports = { fixedWindowLimit };
```

### Sliding Window Log Limiter

```javascript
// slidingLog.js
const redis = require('./redis');

const SLIDING_LOG_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local windowMs = windowSeconds * 1000
local oldest = now - windowMs

redis.call('ZREMRANGEBYSCORE', key, '-inf', oldest)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldestMember = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfterMs = tonumber(oldestMember[2]) + windowMs - now
  return {0, math.max(1, math.ceil(retryAfterMs / 1000))}
end
redis.call('ZADD', key, now, now .. ':' .. redis.call('INCR', 'ratelimit:seq'))
redis.call('PEXPIRE', key, windowMs * 2)
return {1, 0}
`;

async function slidingLogLimit(key, limit, windowSeconds) {
  const now = Date.now();
  const [allowed, retryAfter] = await redis.eval(
    SLIDING_LOG_SCRIPT,
    1,
    `ratelimit:sliding:${key}`,
    String(limit),
    String(windowSeconds),
    String(now)
  );
  return { allowed: allowed === 1, retryAfter };
}

module.exports = { slidingLogLimit };
```

### Token Bucket Limiter (Lua)

```javascript
// tokenBucket.js
const redis = require('./redis');

const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1]) or capacity
local ts = tonumber(data[2]) or now

local elapsed = math.max(0, now - ts)
tokens = math.min(capacity, tokens + elapsed * refillRate / 1000)

local retryAfter = 0
if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
  redis.call('PEXPIRE', key, math.ceil(capacity / refillRate * 1000) + 1000)
  return {1, 0}
end
retryAfter = math.ceil((1 - tokens) / refillRate * 1000)
redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', key, math.ceil(capacity / refillRate * 1000) + 1000)
return {0, retryAfter}
`;

async function tokenBucketLimit(key, capacity, refillPerSecond) {
  const now = Date.now();
  const [allowed, retryAfterMs] = await redis.eval(
    TOKEN_BUCKET_SCRIPT,
    1,
    `ratelimit:token:${key}`,
    String(capacity),
    String(refillPerSecond),
    String(now)
  );
  return { allowed: allowed === 1, retryAfter: Math.ceil(retryAfterMs / 1000) };
}

module.exports = { tokenBucketLimit };
```

### Express Middleware Integration

```javascript
// rateLimitMiddleware.js
const Redis = require('ioredis');
const { tokenBucketLimit } = require('./tokenBucket');

const redis = new Redis();

function rateLimit({ capacity, refillPerSecond, identifier = (req) => req.ip }) {
  return async function rateLimitMiddleware(req, res, next) {
    if (process.env.RATE_LIMIT_DISABLED === 'true') {
      return next();
    }
    try {
      const key = identifier(req);
      const { allowed, retryAfter } = await tokenBucketLimit(
        key,
        capacity,
        refillPerSecond
      );
      if (!allowed) {
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: 'Too Many Requests',
          retryAfterSeconds: retryAfter,
        });
      }
      return next();
    } catch (err) {
      // Fail-open: Redis unavailable should not take the API down.
      console.error('Rate limiter error, failing open:', err.message);
      return next();
    }
  };
}

module.exports = { rateLimit };
```

```javascript
// app.js
const express = require('express');
const { rateLimit } = require('./rateLimitMiddleware');

const app = express();

app.use('/api', rateLimit({
  capacity: 60,
  refillPerSecond: 1,
  identifier: (req) => `ip:${req.ip}`,
}));

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from a rate-limited route' });
});

app.listen(3000, () => {
  console.log('API listening on :3000');
});
```

### Verifying the Limiter under Load

```bash
# Fire 30 requests in parallel against a 10-per-10s limit
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/hello &
done
wait
```

```text
# Expected output: ten 200 responses followed by twenty 429 responses
200
200
200
200
200
200
200
200
200
200
429
429
429
429
429
429
429
429
429
429
429
429
429
429
429
429
429
429
429
429
```

## Key Insights

- **Lua is non-negotiable for correctness**: any rate-limit check that spans multiple commands (read counter, compare, increment) has a race window under concurrency. A single `EVAL` script makes the whole decision atomic. The classic `INCR` + `EXPIRE` pair is the most common subtle bug — a process crash between the two leaves a key with no TTL that grows forever.
- **Algorithm choice is a memory/accuracy trade-off**: fixed window costs almost nothing but allows 2x bursts at window edges; the sliding window log is exact but stores one member per request; the token bucket gives smooth, bounded bursts with constant memory. For most APIs, token bucket is the best default.
- **TTLs are the second most common production failure**: every rate-limit key needs an expiration. Without it, counters accumulate until Redis runs out of memory, and under `allkeys-lru` eviction your protection silently disappears. Set `PEXPIRE` in the same script that writes the key.
- **Fail-open versus fail-closed is a business decision, not a technical one**: failing open keeps the API alive during a Redis outage but leaves it unprotected; failing closed protects the backend but turns Redis into a single point of failure. Choose per endpoint — auth endpoints fail closed, public read endpoints fail open.
- **Hash tags matter in cluster mode**: without them, multi-key scripts error out and single-key limits for the same caller may land on different shards, breaking the limit entirely. Namespace keys as `ratelimit:{identifier}:fixed` so the shard is stable per caller.
- **Pass time from the caller**: compute the timestamp in the application (or read Redis `TIME` once per request) and pass it into the script as an argument. Calling `TIME` per script is slower, and mixing clocks across instances can produce spurious 429s at window boundaries.

## Next Steps

- Explore the advanced Redis syllabus to place rate limiting inside a broader production Redis skill set — see `database/redis/syllabi/advanced-redis-syllabus.md`.
- Study Lua scripting further with the Lua scripting cheatsheet at `database/redis/cheatsheets/redis-lua-scripting-cheatsheet.md`.
- Extend your limiter with multi-tenant tiers (different limits per API plan), per-user weighted costs, or distributed counters backed by Redis Streams.

## Conclusion

You have built a distributed rate limiter that is correct under concurrency, cheap to run, and ready for multi-instance deployments. The fixed window, sliding window log, and token bucket algorithms each solve a different accuracy/memory trade-off; Lua scripting removes the race conditions that plague naive implementations; and careful key naming, TTL hygiene, and fail-open handling make the limiter safe in production. The same pattern — shared state in Redis, atomic mutation in Lua, enforcement at the edge — generalizes far beyond rate limiting to distributed locks, idempotency keys, and feature flags.

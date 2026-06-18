---
title: "Getting Started with Redis"
description: "A comprehensive introduction to Redis covering installation, core data structures, caching patterns, Pub/Sub messaging, and integration with Node.js applications."
category: "database"
technology: "redis"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Getting Started with Redis

## Summary

Redis is an in-memory data structure store that serves as a database, cache, and message broker. This tutorial walks through installing and configuring Redis, mastering its core data types (strings, lists, sets, hashes, sorted sets), implementing caching patterns, using Pub/Sub for real-time messaging, and integrating Redis with a Node.js application using the ioredis client.

## Target Audience

- Backend Developers, Fullstack Developers, and DevOps engineers.
- Beginner to intermediate level. No prior Redis experience required.

## Prerequisites

- Basic understanding of key-value stores and database concepts.
- Node.js and npm installed (v16 or later) for the integration section.
- A terminal with curl or telnet for testing connectivity.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Install and run Redis locally or via Docker.
- Use the `redis-cli` to interact with a Redis server.
- Work with strings, lists, sets, hashes, and sorted sets.
- Implement caching with TTL and cache-aside patterns.
- Publish and subscribe to real-time messages with Pub/Sub.
- Connect to Redis from Node.js using ioredis.
- Apply basic persistence and security configurations.

## Context and Motivation

Modern applications demand low-latency data access for features like caching, session storage, real-time notifications, and rate limiting. Traditional relational databases struggle to meet sub-millisecond response times under high concurrency.

Redis solves this by keeping the primary dataset in memory, achieving throughput of hundreds of thousands of operations per second. Its versatile data structures go beyond simple key-value stores — lists can act as queues, sorted sets power leaderboards, and streams provide event sourcing. Companies like Twitter, GitHub, and Stack Overflow rely on Redis to deliver responsive, scalable experiences.

Understanding Redis is essential for any developer building performant backend systems. This tutorial gives you a hands-on foundation to use Redis confidently in production.

## Core Content

### Installation and Setup

**Option A — Native install (Linux / macOS):**

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# macOS with Homebrew
brew install redis
brew services start redis
```

**Option B — Docker (cross-platform):**

```bash
docker run --name redis-local -p 6379:6379 -d redis:7-alpine
```

Verify the server is running:

```bash
redis-cli ping
# Output: PONG
```

### The redis-cli Interactive Shell

Launch the client and try basic commands:

```bash
redis-cli
```

```text
127.0.0.1:6379> SET greeting "Hello, Redis!"
OK
127.0.0.1:6379> GET greeting
"Hello, Redis!"
127.0.0.1:6379> EXISTS greeting
(integer) 1
127.0.0.1:6379> DEL greeting
(integer) 1
127.0.0.1:6379> FLUSHALL
OK
```

### Core Data Structures

#### Strings

The most basic type — a binary-safe value up to 512 MB.

```redis
SET user:1:name "Alice"
SET user:1:visits 42
INCR user:1:visits       # → 43
INCRBY user:1:visits 10  # → 53
GET user:1:name          # → "Alice"
GET user:1:visits        # → "53"
```

Strings are the foundation for caching, counters, and session tokens.

#### Lists

Ordered collections (linked lists) — perfect for queues and timelines.

```redis
LPUSH notifications "user1 liked your post"
LPUSH notifications "user2 followed you"
LRANGE notifications 0 -1
# 1) "user2 followed you"
# 2) "user1 liked your post"
RPOP notifications
# → "user1 liked your post"
LLEN notifications
# → 1
```

Use `LPUSH` + `RPOP` for a FIFO queue, or `LPUSH` + `LPOP` for a stack.

#### Sets

Unordered collections of unique strings — great for tags, unique visitors.

```redis
SADD article:42:tags "redis" "database" "tutorial"
SADD article:42:tags "redis" "caching"
SMEMBERS article:42:tags
# 1) "caching"
# 2) "database"
# 3) "redis"
SISMEMBER article:42:tags "database"
# → 1
SCARD article:42:tags
# → 3
```

Set operations (`SINTER`, `SUNION`, `SDIFF`) enable powerful queries like "find articles tagged with both 'redis' and 'tutorial'".

#### Hashes

String-to-string maps — the idiomatic way to store objects.

```redis
HSET user:42 username "alice" email "alice@example.com" joined "2024-01-15"
HGET user:42 email
# → "alice@example.com"
HGETALL user:42
# 1) "username"
# 2) "alice"
# 3) "email"
# 4) "alice@example.com"
# 5) "joined"
# 6) "2024-01-15"
HINCRBY user:42 login_count 1
# → 1
```

Hashes are memory-efficient compared to serialising the whole object as a JSON string.

#### Sorted Sets

Like sets but every member has a score, enabling ordered retrieval.

```redis
ZADD leaderboard 100 "player1" 250 "player2" 175 "player3"
ZRANGE leaderboard 0 -1 WITHSCORES
# 1) "player1"
# 2) "100"
# 3) "player3"
# 4) "175"
# 5) "player2"
# 6) "250"
ZREVRANGE leaderboard 0 2
# 1) "player2"
# 2) "player3"
# 3) "player1"
ZINCRBY leaderboard 50 "player3"
# → "225"
```

Sorted sets power leaderboards, rate-limit windows, and delayed-job queues.

### Implementing a Cache Layer

The cache-aside (lazy loading) pattern is the most common caching strategy:

1. Read from cache first.
2. If missing (cache miss), read from the primary database.
3. Store the fetched data in Redis with a TTL.

```redis
# Set with a 5-minute TTL
SETEX user:42:profile '{"name":"Alice"}' 300

# Check TTL remaining
TTL user:42:profile
# → 294
```

For invalidation, delete the key when the underlying data changes:

```redis
DEL user:42:profile
```

### Pub / Sub Messaging

Redis supports a lightweight publish-subscribe pattern for real-time messaging.

**Subscriber (terminal 1):**

```redis
SUBSCRIBE news:breaking
Reading messages...
```

**Publisher (terminal 2):**

```redis
PUBLISH news:breaking "Server outage reported in region us-east-1"
```

The subscriber immediately receives the message. This is ideal for real-time feeds, WebSocket backends, and inter-service notifications.

### Persistence Configuration

By default Redis snapshots data to disk (`RDB`). Enable Append-Only File (`AOF`) for durability:

```bash
# In redis.conf or via CONFIG SET
appendonly yes
appendfsync everysec
```

AOF logs every write operation and replays it on restart — a good balance between durability and performance.

### Security Basics

```bash
# Set a password in redis.conf
requirepass your-strong-password

# Bind to localhost only (default)
bind 127.0.0.1

# Rename dangerous commands to disable them
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
```

In production, always run Redis behind a firewall and use TLS for external connections.

## Code Examples

### Connecting from Node.js with ioredis

```bash
npm install ioredis
```

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  // password: 'your-strong-password', // uncomment if set
  retryStrategy: (times) => Math.min(times * 100, 3000),
});
```

### Caching Database Queries

```javascript
async function getUserProfile(userId) {
  const cacheKey = `user:${userId}:profile`;

  // 1. Try cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss — simulate database query
  const profile = await db.findUserById(userId);

  // 3. Store in Redis with 5-minute TTL
  await redis.setex(cacheKey, 300, JSON.stringify(profile));

  return profile;
}

// Invalidate on update
async function updateUserProfile(userId, data) {
  await db.updateUser(userId, data);
  await redis.del(`user:${userId}:profile`);
}
```

### Rate Limiting with Sorted Sets

```javascript
async function isRateLimited(userId) {
  const key = `ratelimit:${userId}:api`;
  const windowSize = 60; // 60 seconds
  const maxRequests = 100;
  const now = Date.now();

  // Remove entries outside the window
  await redis.zremrangebyscore(key, 0, now - windowSize * 1000);

  // Count current requests
  const count = await redis.zcard(key);

  if (count >= maxRequests) {
    return true; // rate limited
  }

  // Add current request
  await redis.zadd(key, now, `${now}:${Math.random()}`);
  await redis.expire(key, windowSize);
  return false;
}
```

### Pub/Sub in Node.js

```javascript
// publisher.js
const Redis = require('ioredis');
const publisher = new Redis();

async function notifyEvent(channel, message) {
  await publisher.publish(channel, JSON.stringify(message));
  console.log(`Published to ${channel}`);
}

notifyEvent('orders:new', { orderId: 123, amount: 49.99 });
```

```javascript
// subscriber.js
const Redis = require('ioredis');
const subscriber = new Redis();

subscriber.subscribe('orders:new', (err, count) => {
  console.log(`Subscribed to ${count} channel(s)`);
});

subscriber.on('message', (channel, message) => {
  const data = JSON.parse(message);
  console.log(`Received order ${data.orderId}: $${data.amount}`);
});
```

## Key Insights

- **Strings are the Swiss Army knife**: Use them for caching, counters, session tokens, and distributed locks. Their simplicity hides surprising power when combined with `SETEX`, `INCR`, and `GETSET`.
- **Choose the right structure**: Hashes beat JSON blobs for partial updates. Lists serve as natural queues. Sorted sets are irreplaceable for leaderboards and sliding-window rate limiting.
- **TTL is your friend**: Every cache key should have a TTL to prevent stale data and memory exhaustion. Use `SETEX` or `EXPIRE` consistently.
- **O(N) commands on large keys are dangerous**: `KEYS *` blocks the event loop — use `SCAN` instead. Similarly, `SMEMBERS` on a set with millions of entries can stall the server.
- **Monitor memory**: Use `INFO memory` to track fragmentation and peak usage. Set `maxmemory` with an `allkeys-lru` or `volatile-lru` eviction policy.
- **Avoid long-running Pub/Sub subscribers**: If a subscriber is slow, Redis buffers messages in memory, which can cause unbounded growth. Use a dedicated connection for subscriptions.

## Next Steps

- Explore Redis Streams for event sourcing and consumer groups.
- Learn about Redis Cluster for horizontal sharding.
- Set up Redis Sentinel for high availability.
- Study the `ioredis` Pipeline and Multi (transactions) features for batch operations.

## Conclusion

You have learned how to install and run Redis, manipulate its five core data structures, implement caching and rate limiting, and integrate Redis with Node.js. With this foundation, you are ready to use Redis as a powerful complement to your primary database — unlocking sub-millisecond response times for the data that matters most.

---
title: "Redis Caching Strategy Syllabus"
description: "A six-module syllabus on designing production Redis caches: cache patterns, TTL design, invalidation, stampede protection, observability, and cost control."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Redis Caching Strategy Syllabus

## Overview

Most teams adopt Redis in an afternoon and then spend years repairing the consequences. The commands are simple, but caching is a design discipline: the hard parts are deciding what may be stale and for how long, keeping the cache honest when the database changes, and surviving the moment a hot key expires under full traffic. This six-module course treats the cache as an architectural component with explicit correctness and cost contracts rather than a global variable with a TTL.

Each module runs one week and pairs a short conceptual lecture with a lab against a real Redis instance (Docker Compose, `redis-cli`, and a Node.js or Python client). Learners build a single evolving service — a product catalog API — adding one caching concern per module so that every trade-off from an earlier week remains visible. The course assumes working knowledge of SQL and HTTP; no prior Redis experience is required, though familiarity with Redis data structures helps in Module 1.

By the end, learners can defend a cache design in review: they can state the acceptable staleness window per endpoint, name the invalidation path for every cached key, and point at the dashboard that proves the cache is working and affordable.

## Curriculum

### Module 1: Cache Patterns and the Read Path (Week 1)

- **Why cache at all**
  - Latency budgets: which requests deserve a cache and which should stay on the database
  - Read amplification, hot rows, and the cost curve of repeated identical queries
- **The four patterns**
  - Cache-aside (lazy loading): read-through on miss, populate on success only
  - Read-through: the cache library owns the loader function
  - Write-through and write-behind: consistency versus write latency
  - When write-behind is acceptable and when it silently loses data
- **Key design**
  - Namespacing conventions: `app:v1:product:{id}` and versioning for schema changes
  - Serialization choices (JSON, MessagePack) and payload size limits
  - Caching objects versus caching fragments (lists, counts, rendered HTML)
- **Lab**: add cache-aside to the catalog API and measure p50/p99 with and without it

### Module 2: TTL Design and Staleness Contracts (Week 2)

- **Choosing a lifetime from business rules**
  - Deriving TTL from how often the underlying data actually changes
  - Per-endpoint staleness contracts written down, not guessed
- **TTL mechanics**
  - `EX`, `PX`, `EXAT`, and the difference between relative and absolute expiry
  - Redis expiry is lazy plus sampled: memory is reclaimed gradually, not instantly
- **Jitter and the thundering herd**
  - Adding random spread to TTLs so keys written together do not expire together
  - Negative caching for missing rows, with a much shorter TTL
- **Eviction policy**
  - `allkeys-lru` versus `volatile-lru` versus `noeviction`, and why `noeviction` in a cache is a bug
  - `maxmemory` as a hard budget, and observed eviction rate as a health signal
- **Lab**: instrument the API to emit cache hit ratio per endpoint; tune TTLs and jitter to hit a target

### Module 3: Invalidation and Consistency (Week 3)

- **The two hard problems**
  - Dual writes: database then cache, cache then database, and what breaks in each order
  - Delete-on-write versus update-on-write, and why deleting is usually safer
- **Invalidation strategies**
  - Key-based invalidation with explicit `DEL` after a successful commit
  - Versioned keys: bump `app:v2:` and let old entries expire naturally
  - Tag-based invalidation using sets to track key membership
  - Pub/Sub or Streams as an invalidation bus across services
- **Race conditions**
  - The read-repair race where a slow read repopulates stale data after a write
  - Delayed double delete, and why it is a mitigation rather than a fix
- **Lab**: force a stale read with a concurrent write, reproduce it in a test, then fix it

### Module 4: Stampede and Hot-Key Protection (Week 4)

- **The failure mode**
  - One popular key expires and thousands of requests hit the database at once
  - Why a database that was comfortably provisioned collapses in seconds
- **Mitigations**
  - Probabilistic early recomputation (XFetch) to refresh before expiry
  - Distributed locks (`SET NX PX`) so only one worker recomputes, with lock timeouts and fencing
  - Stale-while-revalidate: serve slightly stale data while one client refreshes
  - Request coalescing inside the application process
- **Hot keys beyond expiry**
  - Single-key skew and Redis Cluster slot hotspots
  - Local in-process L1 caches in front of Redis, and their coherence cost
- **Lab**: load-test a 500 rps endpoint, expire the hot key, and hold p99 under 200 ms

### Module 5: Observability (Week 5)

- **What the cache must prove**
  - Hit ratio per endpoint, miss latency, and the cost of a miss
  - Redis-side metrics: `keyspace_hits`, `keyspace_misses`, `evicted_keys`, `connected_clients`, `used_memory`
  - Slow log and command latency percentiles with `LATENCY DOCTOR`
- **Instrumentation practice**
  - Emitting metrics from the cache wrapper rather than from each call site
  - Tracing cache operations so a slow request can be attributed to cache or database
- **Alerting**
  - Alerts on hit-ratio regression, eviction storms, memory above 85%, and replication lag
  - Dashboards that answer "is the cache helping right now?" in one glance
- **Lab**: build a dashboard and write three alerts that would have caught earlier labs' failures

### Module 6: Cost, Capacity, and Operations (Week 6)

- **Sizing the instance**
  - Working-set estimation from real key counts and average value size
  - Headroom for fragmentation (1.2–1.5x), replicas, and failover buffers
- **Cost levers**
  - Caching what is expensive to compute, not what is cheap to fetch
  - Compressing large values, shortening TTLs, and dropping caches that never hit
  - Managed versus self-hosted trade-offs, and network egress in multi-AZ setups
- **Operational safety**
  - Persistence choices for a cache (usually none, occasionally AOF) and what failover loses
  - Connection pooling, timeouts, and circuit breakers so Redis outages degrade instead of cascade
- **Lab**: produce a capacity and cost model for the catalog API at 10x traffic

## Final Project

Build and document a caching layer for a small e-commerce catalog service. The deliverable includes:

- A running service with at least three cached endpoints, each with a written staleness contract
- Cache-aside reads, delete-on-write invalidation, and jittered TTLs
- Stampede protection on the hottest endpoint, demonstrated by a load test before and after
- A dashboard showing hit ratio, evictions, memory, and p99 with and without cache
- A one-page design note covering key naming, failure behaviour when Redis is down, and monthly cost at 10x current traffic

## Assessment Criteria

- **Weekly labs (40%)**: each lab is graded on whether the measured result supports the claim, not on whether the code runs
- **Design note (10%)**: clarity of staleness contracts and invalidation reasoning
- **Final project (40%)**: correctness under failure, evidence from load tests, and a defensible cost model
- **Peer review (10%)**: quality of review comments on another learner's design note

A project that reports a hit ratio without a latency comparison, or a cost model without a working-set estimate, is marked incomplete regardless of code quality.

## References

- Redis documentation: https://redis.io/docs/latest/
- Redis eviction and expiry internals: https://redis.io/docs/latest/develop/reference/eviction/
- Redis client-side caching and connection pools: https://redis.io/docs/latest/develop/clients/
- Martin Kleppmann, *Designing Data-Intensive Applications* — chapters on replication and consistency
- AWS Builders' Library, "Caching challenges and strategies": https://aws.amazon.com/builders-library/

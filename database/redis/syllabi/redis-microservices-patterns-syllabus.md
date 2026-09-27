---
title: "Redis Microservices Patterns Syllabus"
description: "A comprehensive 12-week advanced curriculum for designing microservices architectures on Redis, covering caching as a service, event-driven messaging, distributed locking, rate limiting, session management, idempotency, feature flags, coordination patterns, and production operations."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Redis Microservices Patterns Syllabus

## Overview

This 12-week advanced syllabus is designed for backend engineers, software architects, and platform engineers who want to master Redis as the coordination backbone of modern microservices architectures. Where general Redis courses treat data structures and caching as isolated topics, this curriculum approaches Redis as the distributed-systems glue that holds a service mesh together: cache-as-a-service with consistent invalidation, event-driven messaging with Redis Streams and Pub/Sub, distributed locking and coordination, rate limiting and quota enforcement at the edge of every service, session management at scale, the Outbox and inbox patterns for reliable event delivery, idempotency keys, distributed counters, feature flags, leader election, and service discovery.

Each module combines deep theoretical foundations with hands-on labs using the Redis CLI, Node.js and Python clients, Docker Compose, and Kubernetes. Learners build progressively: from a single Redis-backed utility service, through messaging and coordination layers, up to a complete microservices platform with multiple services sharing Redis as their shared state substrate. By the end of this course, learners will be able to architect, build, deploy, and operate production-grade microservice systems where Redis provides the caching, messaging, locking, rate limiting, and coordination layers with sub-millisecond latencies and predictable failure behavior.

This syllabus is redis's fourth curriculum and deliberately takes the distributed-systems angle: the first syllabus covered core data structures and general development, the second covered internals and enterprise operations, and the third covered real-time analytics with RedisTimeSeries. This fourth curriculum is the application-architecture view — how redis primitives become production patterns for systems with many services.

## Curriculum

### Module 1: Microservices Foundations and Redis as Shared State (Week 1)

- **Why Microservices Need a Shared-State Layer**
  - Stateless services and where state has to live: sessions, caches, locks, counters, queues
  - Redis as the shared state substrate: in-memory speed, atomic operations, TTL lifecycle
  - The spectrum of coordination stores: Redis vs databases vs message brokers vs dedicated lock services
  - When Redis is the right choice and when it is not (durability limits, large-payload anti-patterns)
- **Redis Topology for Microservices**
  - Centralized Redis Cluster versus per-domain Redis instances versus Redis Enterprise databases
  - Logical database isolation and ACL-based multi-tenancy for service ownership
  - Connection management: pooling, retries, timeouts, and circuit-breaking client patterns
  - Key namespacing conventions: `service:entity:id:field` and cross-service collision avoidance
- **Lab Setup**
  - Docker Compose stack: Redis Stack, a Node.js service, and a Python service
  - Connecting with `redis-cli`, `ioredis`, and `redis-py` with sensible pool configuration
- **Hands-on Lab**: Run two services against one Redis, verify they share state through namespaced keys, and observe pool behavior under concurrent load

### Module 2: Caching as a Service (Week 2)

- **Cache Access Patterns for Services**
  - Cache-aside, read-through, write-through, and write-behind in a multi-service context
  - Per-service cache domains: profiles, catalog, pricing, entitlement — one Redis, many caches
  - TTL design: business-appropriate lifetimes, jitter to avoid synchronized expiry (`SET ... EX` + random margin)
- **Cache Invalidation in Distributed Systems**
  - Explicit invalidation on mutation with a publish-subscribe invalidation channel
  - Cache invalidation buses and the dual-write problem (database then cache, or the reverse)
  - Transactional outbox feeds the cache: invalidating from the same event stream that drives other consumers
- **Cache Stampede and Hot-Key Defense**
  - Mutex locking with `SET NX PX` for first-writer reconstruction
  - Probabilistic early expiration (XFetch) and jittered TTL strategies
  - Hot-key splitting: sharding a popular key into N shards with randomized reads
- **Multi-Level Caching**
  - L1 (in-process) and L2 (Redis) hierarchies and the invalidation consistency problem
  - HTTP caching and CDN layers in front of Redis-backed services
  - Cache serialization: protocol buffers, MessagePack, and JSON trade-offs
- **Hands-on Lab**: Build a product-catalog service with a cache-aside layer, an invalidation channel on writes, and a hot-key sharding demo under simulated traffic

### Module 3: Event-Driven Messaging with Redis (Week 3)

- **Pub/Sub Versus Streams for Service Communication**
  - The fire-and-forget nature of Pub/Sub and its delivery guarantees (or lack thereof)
  - Redis Streams as an append-only log: consumer groups, pending entries, and delivery semantics
  - Choosing the right primitive: fan-out notifications vs durable work queues vs event logs
- **Streams as an Event Bus**
  - Producer/consumer groups with `XADD`, `XREADGROUP`, `XACK`, and `XAUTOCLAIM`
  - Consumer group design: partition by worker, load balancing, and dead-letter handling
  - Stream trimming and retention: `MAXLEN` policies and per-consumer checkpointing
- **Reliable Delivery Patterns**
  - At-least-once delivery and idempotent consumers
  - Processing failures: `XCLAIM` re-delivery and dead-letter streams with `XADD` fallback
  - Backpressure: `BLOCK` reads, slow-consumer detection, and lag monitoring with `XLEN`
- **Hands-on Lab**: Build an order-events pipeline: an order service publishes to a Stream, two competing consumer services process with a consumer group, and failed deliveries land in a dead-letter stream

### Module 4: Distributed Locking and Coordination (Week 4)

- **Locking Fundamentals**
  - Why service-local locks fail across processes: the multi-instance race
  - Redis lock primitive: `SET key value NX PX`, Lua-based release with owner token verification
  - Lock expiry versus critical-section duration: lease-based locking and the fencing problem
- **Redlock and Its Critics**
  - The Redlock algorithm and Martin Kleppmann's analysis: clocks, GC pauses, and fencing tokens
  - When Redlock is defensible and when a consensus store (etcd, ZooKeeper) is the safer choice
  - Practical guidance: fencing tokens, monotonic clocks, and bounded critical sections
- **Coordination Patterns**
  - Leader election with `SET NX` + heartbeat renewal and follower fallback
  - Distributed semaphores with sorted sets and fairness guarantees
  - Work leases for job workers: claim, renew, and release with `PEXPIRE`
- **Hands-on Lab**: Implement a lock manager with owner tokens, simulate a slow critical section, and build a worker-leader election with automatic failover

### Module 5: Rate Limiting and Quota Enforcement (Week 5)

- **Rate Limiting Algorithms on Redis**
  - Fixed window counters with `INCR` + `EXPIRE`
  - Sliding window logs with sorted sets (`ZADD` + `ZREMRANGEBYSCORE` + `ZCARD`)
  - Sliding window counters: two counters per window with `MULTI`/`EXEC` or Lua
  - Token bucket and leaky bucket via Lua scripts for smooth, burst-tolerant limits
- **Distributed Rate Limiting at the Gateway**
  - Enforcing per-client, per-service, and per-API-key quotas from a central Redis
  - Edge versus origin enforcement and the latency budget of a rate-limit check
  - Header propagation: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After`
- **Multi-Layer Quotas**
  - Global, tenant, and user tiers with composite Lua scripts
  - Dynamic quota reconfiguration and per-tenant isolation
  - Burst allowances and algorithmic fairness between tenants
- **Hands-on Lab**: Build an API gateway rate limiter with sliding-window counters, return standard rate-limit headers, and test fairness under a mixed multi-tenant workload

### Module 6: Session Management and User State at Scale (Week 6)

- **Session Storage Patterns**
  - Sticky versus stateless sessions: why stateless wins and where Redis stores the state
  - Session TTLs, sliding renewal with `EXPIRE` on activity, and idle-timeout policies
  - Session data modeling: hashes per session, key rotation, and sensitive-field handling
- **Stateless Authentication Complements**
  - JWT statelessness versus server-side sessions: revocation trade-offs
  - Blacklisting revoked tokens in Redis and refresh-token rotation with `GETDEL`
  - Short-lived access tokens with a Redis-backed revocation list
- **User Presence and Online State**
  - Presence sets, last-seen sorted sets, and atomic heartbeats
  - Online-status fan-out and typing indicators via Pub/Sub
  - Session count dashboards with `SCARD` and per-device session enumeration
- **Hands-on Lab**: Build a session service used by two application services, implement sliding expiration, add token revocation, and expose a live presence endpoint

### Module 7: The Outbox, Inbox, and Saga Patterns (Week 7)

- **The Transactional Outbox Pattern**
  - The dual-write problem: database transaction and event publication must be atomic
  - Outbox table written in the same database transaction, relayed to Redis Streams
  - Outbox relayers: polling, listeners, and the idempotent publish guarantee
- **The Inbox Pattern for Consumers**
  - Deduplicating incoming events with `SET NX` inbox keys
  - Inbox retention, garbage collection, and TTL policies
  - Processing order and partial-failure recovery
- **Sagas and Compensation**
  - Choreographed sagas with Redis Streams as the coordination log
  - Compensation triggers, saga state in Redis hashes, and timeout-driven rollback
  - Correlating saga instances: `saga:id` keys and completion records
- **Hands-on Lab**: Implement an outbox relay for an order service, an inbox deduplicator on the payment service, and a two-step saga with compensation on failure

### Module 8: Idempotency, Distributed Counters, and Deterministic State (Week 8)

- **Idempotency Keys**
  - Accepting `Idempotency-Key` headers and storing results with `SET NX`
  - Key TTLs and the storage of response payloads for replay
  - Race conditions: two concurrent requests with the same key and atomic first-writer wins
- **Distributed Counters and Aggregates**
  - `INCR`/`INCRBY` atomic counters and the anti-pattern of read-modify-write
  - HyperLogLog for distinct-count estimation (`PFADD`/`PFCOUNT`) across services
  - Approximate counting with Bloom filters in front of exact stores
- **Deterministic State Machines**
  - Representing entity state transitions atomically with Lua scripts
  - Compare-and-set workflows and transition-guard validation
  - Exactly-once-effect processing with processed-event markers
- **Hands-on Lab**: Build an idempotent payment endpoint, a shared visit counter with HyperLogLog, and an order state machine guarded by a Lua transition script

### Module 9: Feature Flags, Config Distribution, and A/B Testing (Week 9)

- **Dynamic Configuration and Feature Flags**
  - Centralized config in Redis hashes with watch/notify propagation
  - Flag evaluation at the edge: caching flag values with short TTLs in each service
  - Flag rollback and kill switches with immediate propagation
- **A/B Testing and Experimentation**
  - Consistent assignment: deterministic bucketing with hash-based user allocation
  - Experiment metadata and enrollment counters in Redis
  - Real-time experiment dashboards from Redis counters
- **Dark Launching and Canary Release Support**
  - Routing rules for canary and dark traffic via Redis-backed routing tables
  - Percentage-based rollout state and instant ramp adjustments
  - Feature-flag-driven migration of reads and writes (strangler pattern support)
- **Hands-on Lab**: Build a feature-flag service with push updates, implement deterministic A/B bucketing, and run a canary routing experiment across two service versions

### Module 10: Coordination Patterns — Leader Election, Service Discovery, and Distributed Tracing (Week 10)

- **Leader Election Revisited**
  - Durable leader election with heartbeat leases and leadership epochs
  - Follower promotion and the split-brain problem in the absence of consensus
  - Combining Redis election with fencing tokens for safe failover
- **Service Discovery and Registration**
  - Registering service instances with TTL-based heartbeats in Redis
  - Client-side discovery: reading instance lists from sorted sets
  - Health scoring and traffic draining via weighted sorted sets
- **Distributed Tracing and Correlation**
  - Storing trace and span metadata in Redis with TTL-based retention
  - Correlation-ID lookup for request debugging across services
  - Request logs, error aggregation, and slow-query capture
- **Hands-on Lab**: Build a service registry with heartbeat-based eviction, implement client-side load balancing from the registry, and add a correlation ID lookup endpoint for cross-service debugging

### Module 11: Production Operations for Redis-Backed Microservices (Week 11)

- **Deployment Topologies**
  - Redis Cluster topology for multi-service platforms and slot-based key distribution
  - Kubernetes deployment: Redis Operator, `StatefulSet` storage, and sidecar patterns
  - Network locality: co-locating Redis with services and understanding cross-AZ latency
- **Security for Shared Infrastructure**
  - ACLs per service: `ACL SETUSER` with command and key restrictions
  - TLS in transit, credential rotation, and secret management for client connections
  - Defending the shared Redis: command limits, key-space isolation, and audit logging
- **Observability and Capacity**
  - Latency histograms, hit-rate SLOs, and per-service cache metrics
  - `INFO` command families, `redis-cli --stat`, and Prometheus exporters
  - Capacity planning: memory models, eviction policies, and headroom for failover
- **Failure Scenarios and Recovery**
  - Redis outage behavior: circuit breakers, cache degradation to direct database reads
  - Failover testing: `FAILOVER` command, replica promotion, and client retry behavior
  - Data-loss windows and the trade-off between persistence settings and p99 latency
- **Hands-on Lab**: Deploy the platform on Kubernetes with the Redis Operator, configure per-service ACLs, set up Prometheus dashboards, and run a controlled Redis failover exercise

### Module 12: Capstone Project — Redis-Backed Microservices Platform (Week 12)

- **Project Definition**
  - A small e-commerce platform: catalog, cart, order, payment, and notification services
  - Redis handles all cross-cutting concerns: caching, product search via `FT.SEARCH` indexes, session state, rate limiting at the gateway, the order event bus, distributed locks for inventory, and feature-flag-driven rollout
- **Architecture Requirements**
  - Every service stateless and horizontally scalable, sharing one Redis Cluster
  - Events flow through Redis Streams with at-least-once delivery and idempotent consumers
  - A saga coordinates order creation with payment and inventory compensation
  - Rate limits, ACLs, and observability dashboards in place
- **Delivery Milestones**
  - Milestone 1: catalog caching + inventory locks (weeks 2-4 patterns)
  - Milestone 2: order event bus + saga + outbox/inbox (weeks 3, 7-8 patterns)
  - Milestone 3: gateway rate limiting + session service + feature flags (weeks 5-6, 9 patterns)
  - Milestone 4: Kubernetes deployment + failover drill + monitoring (week 11 patterns)
- **Documentation Deliverable**
  - Architecture decision records for every Redis pattern choice
  - Failure-mode analysis and the degradation story for each service
  - Load-test results with p99 latency and hit-rate measurements

## Final Project

Learners build and deploy a Redis-backed microservices platform: a small e-commerce system with catalog, cart, order, payment, and notification services, all stateless and sharing a single Redis Cluster as the coordination substrate. The platform must use every pattern class from the course: cache-as-a-service with an invalidation channel, event-driven order processing over Redis Streams with an outbox relay and idempotent inbox consumers, distributed locks guarding inventory decrements, sliding-window rate limiting at the API gateway, a session service with token revocation, feature flags driving a staged rollout, and a choreographed saga with compensation for order failures. The final deliverable is the running system deployed on Kubernetes with per-service ACLs, Prometheus monitoring, a controlled failover drill, and architecture decision records documenting each Redis pattern choice.

## Assessment Criteria

- **Assignments**: Weekly module labs are submitted as repositories with runnable code and short write-ups. Each lab is graded on pattern correctness (does the implementation use the intended Redis primitive correctly), edge-case handling (expiry, failure, retry, concurrency), and documentation quality.
- **Module Quizzes**: Short quizzes after each module verify conceptual understanding — delivery semantics of Streams, lock lease behavior, rate-limit algorithm trade-offs, and the dual-write problem.
- **Final Project**: The capstone platform is evaluated against the architecture requirements: all services stateless and sharing Redis correctly, events delivered at-least-once with idempotent consumers, saga compensation working under injected failures, rate limits enforced at the gateway, ACL isolation between services, a successful failover drill with recovery, and load tests demonstrating target p99 latency under concurrent traffic.
- **Presentation**: Learners present their architecture decisions and failure-mode analysis, defending why each Redis pattern was chosen for its specific problem.

## References

- [Redis Documentation — Data Structures](https://redis.io/docs/latest/develop/data-types/)
- [Redis Documentation — Streams and Consumer Groups](https://redis.io/docs/latest/develop/data-types/streams/)
- [Redis Documentation — Redis ACLs](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/)
- [Redis Patterns — Distributed Locks](https://redis.io/docs/latest/develop/patterns/distributed-locks/)
- [Redis Patterns — Rate Limiting](https://redis.io/docs/latest/develop/patterns/rate-limiting/)
- [Redis Blog — The Outbox Pattern](https://redis.io/blog/outbox-pattern/)
- [Martin Kleppmann — How to Do Distributed Locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [Chris Richardson — Microservices Patterns (Saga, Outbox, API Gateway)](https://microservices.io/patterns/data/transactional-outbox.html)
- [Redis University — RU101: Introduction to Redis Data Structures](https://university.redis.com/courses/ru101/)

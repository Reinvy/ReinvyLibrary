---
title: "Redis Development Syllabus"
description: "A comprehensive 12-week curriculum for mastering Redis, covering core data structures, caching patterns, persistence, high availability, clustering, and production deployment."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Redis Development Syllabus

## Overview

This 12-week curriculum provides a structured learning path for developers who want to master Redis, the industry-leading in-memory data structure store. Starting from fundamental concepts and progressing through advanced topics, learners will gain practical experience with Redis data types, caching strategies, persistence mechanisms, high availability, clustering, and production operations. Each week combines theoretical knowledge with hands-on exercises, culminating in a comprehensive capstone project that demonstrates proficiency across the entire Redis ecosystem.

## Curriculum

### Week 1: Introduction to Redis

- **Redis Fundamentals**
  - What is Redis? History, use cases, and comparison with traditional databases
  - Understanding in-memory vs disk-based storage trade-offs
  - Redis architecture overview: single-threaded event loop, multiplexing I/O
- **Installation and Setup**
  - Installing Redis locally (Linux, macOS, Windows via WSL)
  - Running Redis via Docker
  - Configuration file basics: `redis.conf` structure and key directives
- **redis-cli Basics**
  - Connecting to a Redis server: `redis-cli -h <host> -p <port>`
  - Basic commands: `PING`, `SET`, `GET`, `DEL`, `EXISTS`
  - Using `redis-cli --help` and command discovery
  - Redis INFO command for server statistics
- **Hands-on Exercise**: Install Redis, configure it with a custom port, and execute basic CRUD operations

### Week 2: Core Data Structures

- **Strings**
  - SET, GET, MSET, MGET, SETNX, SETEX, PSETEX
  - String operations: APPEND, GETRANGE, SETRANGE, STRLEN
  - Numeric operations: INCR, DECR, INCRBY, INCRBYFLOAT
  - Bit operations: GETBIT, SETBIT, BITCOUNT, BITOP
- **Lists**
  - LPUSH, RPUSH, LPOP, RPOP, LLEN, LRANGE
  - Blocking operations: BLPOP, BRPOP
  - Use cases: message queues, activity feeds, task lists
- **Sets**
  - SADD, SREM, SMEMBERS, SISMEMBER, SCARD
  - Set operations: SINTER, SUNION, SDIFF, SSCAN
  - Use cases: tags, unique visitors, friend relationships
- **Hashes**
  - HSET, HGET, HGETALL, HMGET, HDEL, HEXISTS
  - Hash operations: HINCRBY, HSCAN, HLEN
  - Use cases: object representation, user profiles, session data
- **Sorted Sets**
  - ZADD, ZRANGE, ZRANK, ZSCORE, ZREM
  - Range operations: ZRANGEBYSCORE, ZREVRANGE, ZCOUNT
  - Aggregation: ZUNIONSTORE, ZINTERSTORE
  - Use cases: leaderboards, rate limit counters, time-series data
- **Hands-on Exercise**: Implement a social media feed using Lists, a tagging system with Sets, a leaderboard with Sorted Sets, and user profiles with Hashes

### Week 3: Key Management and Expiration

- **Key Naming Conventions**
  - Namespacing patterns: `object_type:id:field`
  - Hierarchical key design for maintainability
  - Avoiding hot keys and key collisions
- **Key Expiration and TTL**
  - EXPIRE, EXPIREAT, TTL, PTTL, PEXPIRE
  - SET with NX/XX/EX/PX options
  - Key eviction when TTL expires
  - Passive vs active expiration mechanisms
- **Scanning Keys**
  - KEYS command (and why to avoid it in production)
  - SCAN cursor-based iteration with COUNT and MATCH
  - SSCAN, HSCAN, ZSCAN for type-specific iteration
- **Key Space Notifications**
  - Configuring keyspace events in redis.conf
  - Subscribing to key expiration and modification events
  - Use cases: cache invalidation notifications, scheduled tasks
- **Hands-on Exercise**: Implement a session store with automatic TTL expiration and monitor key events via keyspace notifications

### Week 4: Advanced Data Types

- **Bitmaps**
  - SETBIT, GETBIT, BITCOUNT, BITOP, BITPOS, BITFIELD
  - Memory-efficient boolean data representation
  - Use cases: daily active users, feature flags, bloom-filter-like patterns
- **HyperLogLog**
  - PFADD, PFCOUNT, PFMERGE
  - Cardinality estimation with minimal memory (~12KB per key)
  - Use cases: unique visitor counting across time windows
- **Geospatial Indexes**
  - GEOADD, GEODIST, GEORADIUS, GEORADIUSBYMEMBER, GEOSEARCH
  - Store and query latitude/longitude coordinates
  - Use cases: nearby places, ride-hailing apps, location analytics
- **Streams**
  - XADD, XREAD, XRANGE, XREVRANGE, XLEN
  - Consumer groups: XGROUP, XREADGROUP, XACK
  - Pending entries and message delivery guarantees
  - Comparison with Pub/Sub and Kafka
- **Hands-on Exercise**: Implement a location-based store finder using geospatial indexes and a real-time event processing pipeline using Streams with consumer groups

### Week 5: Caching Patterns

- **Cache-Aside (Lazy Loading)**
  - Application-side caching flow: read from cache first, fall back to database
  - SET with TTL for automatic invalidation
  - Handling cache misses and stale data
- **Write-Through and Write-Behind**
  - Synchronous write-through for data consistency
  - Asynchronous write-behind for write optimization
  - Trade-offs between consistency and performance
- **Read-Through Caching**
  - Server-side caching with Redis as primary read store
  - Pre-warming caches on application startup
- **Cache Invalidation Strategies**
  - TTL-based invalidation (passive)
  - Event-driven invalidation via pub/sub
  - Explicit invalidation on data mutation
  - Stale-while-revalidate pattern
- **Cache Stampede Prevention**
  - Mutex locks with SET NX for first-writer
  - Probabilistic early expiration (XFetch algorithm)
  - Thundering herd mitigation strategies
- **Hands-on Exercise**: Build a multi-layer caching system for a product catalog with cache-aside pattern and stampede prevention

### Week 6: Persistence and Durability

- **RDB Snapshots**
  - SAVE vs BGSAVE: synchronous vs fork-based persistence
  - Configuring save intervals in redis.conf
  - RDB file format and compression
  - RDB advantages: compact snapshots, fast restarts
  - RDB limitations: potential data loss between snapshots
- **AOF (Append-Only File)**
  - AOF log recording every write operation
  - fsync policies: always, everysec, no
  - AOF rewrite with BGREWRITEAOF
  - AOF advantages: durability, append-only, human-readable
  - AOF limitations: larger file size, slower restarts
- **Hybrid Persistence (Redis 7+)**
  - Combining RDB and AOF for optimal durability
  - AOF with RDB preamble for fast recovery
- **Backup and Recovery Strategies**
  - Automated backup schedules with cron
  - S3/cloud storage integration for off-site backups
  - Point-in-time recovery with AOF logs
- **Hands-on Exercise**: Configure RDB and AOF persistence, simulate a crash scenario, and recover data from each persistence method

### Week 7: Pub/Sub and Messaging

- **Pub/Sub Fundamentals**
  - PUBLISH, SUBSCRIBE, PSUBSCRIBE, UNSUBSCRIBE
  - Channel naming patterns and wildcards
  - Fire-and-forget delivery semantics
- **Pub/Sub Patterns**
  - Fan-out messaging to multiple subscribers
  - Channel-based routing for event distribution
  - Pattern subscriptions with glob-style patterns
- **Pub/Sub Limitations**
  - No message persistence (messages lost if no subscribers)
  - No acknowledgement mechanism
  - Blocking nature of SUBSCRIBE
- **Redis Streams for Reliable Messaging**
  - Consumer groups for load-balanced message processing
  - Message acknowledgment and pending entry management
  - Message replay from specific IDs
  - Comparison with traditional message queues (RabbitMQ, Kafka)
- **Hands-on Exercise**: Build a real-time notification system using Pub/Sub and a task queue with Streams consumer groups

### Week 8: Lua Scripting and Transactions

- **Redis Transactions**
  - MULTI, EXEC, DISCARD, WATCH, UNWATCH
  - Optimistic locking with WATCH + MULTI
  - Transaction atomicity and rollback behavior
- **Lua Scripting with EVAL**
  - Writing Lua scripts for Redis
  - EVAL and EVALSHA commands
  - Script parameter passing: KEYS[] and ARGV[]
  - Atomic execution guarantees
- **Script Caching and Management**
  - SCRIPT LOAD, SCRIPT EXISTS, SCRIPT FLUSH
  - Script caching for reduced bandwidth
  - SCRIPT KILL for long-running scripts
- **Lua Script Patterns**
  - Compare-and-set with Lua for atomic updates
  - Complex multi-key operations in a single script
  - Rate limiting with time-window scripts
  - Distributed locks with Lua
- **Hands-on Exercise**: Write Lua scripts for atomic inventory management, distributed locks, and a sliding-window rate limiter

### Week 9: High Availability and Replication

- **Redis Replication**
  - Master-replica replication architecture
  - REPLICAOF command and configuration
  - Replication ID and offset tracking
  - Partial resynchronization with PSYNC2
  - Read scaling with replicas
- **Redis Sentinel**
  - Sentinel architecture: monitoring, notification, failover
  - Sentinel quorum and majority requirements
  - Configuring Sentinel for automatic failover
  - Client-side service discovery via Sentinel
- **Failover Scenarios**
  - Manual failover with FAILOVER command
  - Automatic failover with Sentinel
  - Split-brain scenarios and prevention
  - Replica promotion and client reconnection
- **Hands-on Exercise**: Set up a Redis master-replica pair with Sentinel for automatic failover and test various failure scenarios

### Week 10: Redis Cluster

- **Cluster Architecture**
  - Hash slot-based sharding (16384 slots)
  - Cluster nodes: master and replica nodes
  - Gossip protocol for cluster discovery
  - Cluster bus for inter-node communication
- **Cluster Setup and Configuration**
  - redis-cli --cluster create command
  - Cluster configuration directives
  - Creating a cluster with Docker Compose
- **Cluster Operations**
  - Adding and removing nodes
  - Resharding: redistributing hash slots
  - Rebalancing across nodes
  - Failover in cluster mode
- **Client-Side Cluster Handling**
  - MOVED and ASK redirections
  - Cluster-aware Redis clients (ioredis Cluster, redis-py-cluster)
  - Smart client implementations
  - Hash tags for key grouping
- **Hands-on Exercise**: Deploy a 6-node Redis Cluster (3 masters, 3 replicas), practice adding/removing nodes, and implement a cluster-aware client application

### Week 11: Security and Operations

- **Authentication and Access Control**
  - AUTH command and requirepass configuration
  - Redis 6+ ACL: users, permissions, command categories
  - ACL SETUSER, ACL LIST, ACL LOG
  - Default user restrictions and best practices
- **Network Security**
  - TLS/SSL encryption for Redis traffic
  - bind configuration and protected mode
  - Firewall rules and network segmentation
- **Monitoring and Profiling**
  - INFO command sections (server, clients, memory, persistence, stats, replication, cpu, keyspace)
  - MONITOR command (and its performance impact)
  - SLOWLOG GET, SLOWLOG LEN, SLOWLOG RESET
  - MEMORY USAGE, MEMORY STATS, MEMORY DOCTOR
  - Redis Grafana dashboard with redis_exporter
- **Memory Management**
  - maxmemory configuration
  - Eviction policies: allkeys-lru, volatile-lru, allkeys-lfu, volatile-lfu, allkeys-random, volatile-random, volatile-ttl, noeviction
  - Memory defragmentation with MEMORY PURGE
  - Memory analysis with redis-rdb-tools
- **Performance Tuning**
  - Timeout and keepalive settings
  - TCP backlog and maxclients
  - IO threads configuration (Redis 6+)
  - Avoiding long-running commands
- **Hands-on Exercise**: Configure ACL users with granular permissions, enable TLS, set up Prometheus/Grafana monitoring, and tune Redis for high throughput

### Week 12: Capstone Project

- **Project Overview**: Design and build a production-ready real-time analytics dashboard
  - Real-time event ingestion via Redis Streams
  - Aggregation pipeline using Lua scripts and time-series patterns
  - Leaderboards and counters with Sorted Sets
  - Geospatial analytics for user locations
  - Session management with Hashes and TTL
  - High availability with Sentinel or Cluster mode
  - Monitoring and alerting integration
- **Architecture Design**
  - Data flow and component interaction
  - Redis data model design
  - Persistence and backup strategy
  - Scalability and high-availability planning
- **Implementation**
  - Build backend services (Python/Node.js) integrated with Redis
  - Implement caching layers with stampede prevention
  - Deploy with clustering or Sentinel for HA
  - Set up monitoring dashboard
- **Deliverables**
  - Complete working application with source code
  - Architecture documentation and data model diagrams
  - Performance benchmark results
  - Deployment and operations guide
- **Presentation**
  - Code review and architecture walkthrough
  - Performance and scalability discussion
  - Lessons learned and production readiness assessment

## Final Project

Learners will design and build a real-time analytics dashboard that ingests events, processes them in real time using Redis Streams, maintains aggregated counters and leaderboards with Sorted Sets, tracks unique users with HyperLogLog, and provides geospatial analytics. The application must be deployed with high availability (Sentinel or Cluster mode), include proper monitoring and alerting, and demonstrate caching best practices with stampede prevention. Deliverables include the complete source code, architecture documentation, performance benchmarks, and a deployment guide.

## Assessment Criteria

- **Weekly Assignments (40%)**: Practical exercises completed each week demonstrating hands-on proficiency with Redis commands, data structures, and patterns.
- **Mid-Term Quiz (15%)**: Covers Weeks 1-6 fundamentals including data structures, persistence, caching patterns, and basic scripting.
- **Capstone Project (35%)**: Evaluation based on architecture design, code quality, Redis best practices, high availability configuration, monitoring setup, and completeness of deliverables.
- **Participation and Code Reviews (10%)**: Engagement with code reviews, architectural discussions, and documentation quality.

## References

- [Redis Official Documentation](https://redis.io/docs/) — Complete reference for all Redis commands, configuration, and features
- [Redis in Action](https://redis.com/redis-in-action/) — Josiah L. Carlson (Manning Publications)
- [Redis University](https://university.redis.com/) — Free online courses from Redis
- [ioredis Documentation](https://github.com/redis/ioredis) — Popular Node.js Redis client with Cluster and Sentinel support
- [redis-py Documentation](https://github.com/redis/redis-py) — Official Python Redis client library
- [Redis Cluster Specification](https://redis.io/docs/reference/cluster-spec/) — Official cluster specification and internals
- [Redis Streams Documentation](https://redis.io/docs/data-types/streams/) — Comprehensive guide to Redis Streams
- [Awesome Redis](https://github.com/JamzyWang/awesome-redis) — Curated list of Redis resources, tools, and libraries

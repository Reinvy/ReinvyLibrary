---
title: "Advanced Redis Syllabus"
description: "A comprehensive 12-week advanced curriculum for experienced Redis developers covering Redis Stack modules, vector search, internals and performance tuning, Kubernetes-native deployment, Redis Enterprise, Streams in production, observability, and multi-region architecture."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced Redis Syllabus

## Overview

This 12-week advanced syllabus is designed for developers, DevOps engineers, and database administrators who already have hands-on experience with Redis and want to master enterprise-grade operations, modern Redis Stack capabilities, and large-scale system design. The curriculum goes beyond core data structures and basic caching to cover Redis internals and performance tuning, production-grade Streams patterns, vector similarity search for AI workloads, native Kubernetes deployment with the Redis Operator, Redis Enterprise Active-Active geo-distribution, automated observability and capacity planning, and security hardening for regulated environments. Each module combines deep theoretical foundations with production-oriented labs and real-world case studies. The course culminates in a capstone project that requires designing, deploying, and operating a multi-region, high-throughput Redis architecture serving a sample AI-enhanced application.

By the end of this course, learners will be able to design and implement Redis-based solutions for modern microservice and AI architectures, deploy and operate Redis on Kubernetes at scale, tune Redis for sub-millisecond p99 latency under high concurrency, implement vector similarity search pipelines, and build resilient multi-region topologies with automated failover and disaster recovery.

## Curriculum

### Module 1: Redis Internals and Architecture (Week 1)

- **Event Loop and I/O Model**
  - Single-threaded event loop architecture: `aeEventLoop` internals
  - Multiplexing I/O: `select`/`epoll`/`kqueue` backend selection
  - I/O threads in Redis 6+: `io-threads` and `io-threads-do-reads` configuration
  - Threading model evolution: background saving, incremental rehashing, lazy freeing
  - Command processing pipeline: socket → read query → execute → reply → free client
- **Memory Allocators**
  - jemalloc vs glibc malloc: fragmentation characteristics and trade-offs
  - jemalloc arenas and background thread purging
  - Memory overhead per data structure: `redis-memory-for-key` analysis
  - Memory defragmentation strategies: manual (`MEMORY PURGE`), active defrag (`ACTIVE DEFRAG`)
- **Event Loop Tuning**
  - `hz` configuration: accuracy vs CPU trade-off
  - `lfu-decay-time` and `lfu-log-factor` for LFU eviction tuning
  - Latency monitoring with `LATENCY DOCTOR`, `LATENCY HISTOGRAM`
- **Hands-on Lab**: Profile Redis latency with `redis-cli --intrinsic-latency` and `LATENCY HISTOGRAM`, configure I/O threads, and compare allocator fragmentation under different workload patterns

### Module 2: Redis Stack Modules Deep Dive (Week 2)

- **RediSearch**
  - Index creation: `FT.CREATE` with schema, prefixes, stopwords
  - Query syntax: `FT.SEARCH`, `FT.AGGREGATE`, `FT.EXPLAIN`
  - Full-text search: stemming, phonetic matching, fuzzy queries
  - Auto-complete and suggestions with `FT.SUGADD`, `FT.SUGGET`
  - Index aliasing and multi-index search
  - Performance optimization: index sizing, cursors, `GEOFILTER` and `FILTER` clauses
- **RedisJSON**
  - JSON data model and path syntax (`$`, `$.key[*]`, `$.key..subkey`)
  - CRUD operations: `JSON.SET`, `JSON.GET`, `JSON.DEL`, `JSON.ARRAPPEND`
  - JSONPath queries for nested filtering
  - Atomic operations on JSON sub-elements
- **RedisTimeSeries**
  - Time-series data model: key, timestamp, value, labels
  - `TS.CREATE` with retention, chunk size, duplicate policy
  - Aggregation queries: `TS.RANGE`, `TS.MRANGE` with `AVG`, `SUM`, `MIN`, `MAX`, `STD.P`, `COUNT`
  - Downsampling and compaction rules
  - Integration with Prometheus via `redis_exporter`
- **RedisBloom**
  - Bloom filter: `BF.ADD`, `BF.EXISTS`, `BF.INFO`
  - Cuckoo filter: `CF.ADD`, `CF.EXISTS`, `CF.DEL` (supports deletion)
  - Top-K: `TOPK.ADD`, `TOPK.QUERY`, `TOPK.LIST`
  - Count-min sketch: `CMS.INCRBY`, `CMS.QUERY`, `CMS.INFO`
  - T-digest: `TDIGEST.ADD`, `TDIGEST.QUERY`, `TDIGEST.CDF`
- **Hands-on Lab**: Build a document search engine with RediSearch, enrich with JSON storage, add real-time aggregation with TimeSeries, and implement distinct-count approximation with Bloom filters

### Module 3: Vector Similarity Search with Redis (Week 3)

- **Vector Search Fundamentals**
  - Embedding-based search: documents → embeddings → nearest neighbor search
  - Distance metrics: cosine similarity (COSINE), Euclidean distance (L2), inner product (IP)
  - Exact KNN search vs approximate nearest neighbor (ANN)
- **RediSearch Vector Similarity**
  - Creating vector indexes: `FT.CREATE` with `VECTOR` field type
  - Index algorithms: FLAT (exact) and HNSW (approximate)
  - HNSW parameters: M (edges per node), efConstruction, efRuntime
  - Querying with `FT.SEARCH` and vector parameters
  - Hybrid queries: combining vector search with filters and full-text search
- **Production Vector Pipelines**
  - Embedding generation: integrating with OpenAI, Hugging Face, or local models
  - Batch indexing strategies for large datasets
  - Index memory management: compression, quantization
  - Multi-modal vector search: text + image embeddings
- **Use Cases**
  - Semantic product search in e-commerce
  - RAG (Retrieval-Augmented Generation) caching for LLMs
  - Duplicate detection and near-duplicate clustering
  - Recommendation systems with vector similarity
- **Hands-on Lab**: Ingest a dataset of documents, generate embeddings via a local sentence-transformer model, create a HNSW vector index in Redis, and build a semantic search API that combines vector similarity with RediSearch filters

### Module 4: Advanced Redis Streams (Week 4)

- **Streams Architecture Review**
  - Stream key structure: radix tree encoding, consumer groups
  - Message ID format: `<millisecondsTime>-<sequenceNumber>`
  - Range queries: `XRANGE`, `XREVRANGE`, `XREAD`
- **Consumer Groups Deep Dive**
  - Group creation: `XGROUP CREATE` with `$` and `0` delivery strategies
  - Claiming messages: `XAUTOCLAIM`, `XCLAIM` with retry count and idle time
  - Pending entries list: `XPENDING` for dead-letter monitoring
  - Consumer group rebalancing: adding and removing consumers
- **Production Streams Patterns**
  - Exactly-once processing with idempotent consumers
  - Dead-letter queues (DLQ) with separate stream
  - Super consumers: multiple consumers per partition for priority processing
  - Stream sharding: partitioning across multiple streams by key hash
  - Backpressure handling with `MAXLEN` and `XTRIM`
- **Streams vs Other Messaging**
  - Comparison with Kafka: retention semantics, consumer group differences
  - Comparison with RabbitMQ: routing flexibility, protocol overhead
  - When to use Streams vs Pub/Sub vs List-based queues
- **Hands-on Lab**: Implement a multi-consumer event processing pipeline with dead-letter queue, auto-claim recovery, and exactly-once semantics. Compare throughput with Kafka and RabbitMQ under similar workloads

### Module 5: Redis 7+ Features (Week 5)

- **Redis Functions**
  - Functions vs EVAL scripts: versioning, persistence, replication
  - JavaScript engine: `V8_SCRIPT` and `FUNCTION LOAD`
  - Function libraries: `FUNCTION LIST`, `FUNCTION DELETE`
  - Atomic multi-command execution without script caching
- **ACL v2 and Access Control**
  - Fine-grained permission model: `ACL SETUSER` with command and key permissions
  - Command categories: `+@read`, `+@write`, `+@admin`, `+@dangerous`
  - Key-space permissions: `~keys:*` (glob patterns), `%R~keys:*` (selectors)
  - ACL log and authentication failure monitoring
  - `ACL SETUSER` with `reset`, `resetkeys`, `resetchannels`
- **Sharded Pub/Sub**
  - Architecture: hash-slot based channel distribution
  - Commands: `SSUBSCRIBE`, `SPUBLISH`, `SUNSUBSCRIBE`
  - Use cases: cross-node notifications in cluster mode
  - Comparison with regular Pub/Sub: scalability, ordering guarantees
- **Other Redis 7 Improvements**
  - Redis 7.2: auto-failover improvements, `CLUSTER SHARDS` command
  - Redis 7.4: vector set support, new time series features
- **Hands-on Lab**: Migrate existing Lua scripts to Redis Functions, configure ACL v2 with granular user permissions and key-space selectors, implement a sharded Pub/Sub notification system in a Redis Cluster

### Module 6: Redis on Kubernetes (Week 6)

- **Kubernetes-Native Redis Architectures**
  - Redis on bare VMs vs containerized deployments
  - StatefulSets vs Deployments for Redis workloads
  - PersistentVolumeClaim for Redis persistence in containers
  - Resource requests and limits: CPU, memory, ephemeral storage
- **Redis Operator**
  - Redis Operator architecture: custom resource definitions (CRDs)
  - `RedisCluster` resource definition
  - `Redis` (standalone/sentinel) resource definition
  - Automatic failover, backup, and scaling via the operator
  - Operator lifecycle: upgrades, configuration changes
- **Sentinel on Kubernetes**
  - Sentinel as a sidecar vs standalone deployment
  - Headless services for Redis and Sentinel discovery
  - Health checks: liveness, readiness, and startup probes
  - Persistent storage for AOF/RDB in Kubernetes volumes
- **Cluster on Kubernetes**
  - Redis Cluster pod topology spread constraints
  - NodePort, ClusterIP, and LoadBalancer for external access
  - Cross-namespace Redis Cluster access
  - Rolling updates and configuration changes
- **Production Considerations**
  - Network latency in container overlay networks (CNI: Calico, Cilium, Flannel)
  - CPU throttling with `CFS quotas` and Redis latency
  - Pod eviction and graceful shutdown with preStop hooks
  - Monitoring Redis on Kubernetes with kube-prometheus-stack
- **Hands-on Lab**: Deploy a 6-node Redis Cluster on Kubernetes using the Redis Operator, configure automatic failover, set up persistent storage with RDB snapshots, implement monitoring with Prometheus and Grafana, and test pod eviction scenarios

### Module 7: Redis Enterprise and Active-Active Geo-Distribution (Week 7)

- **Redis Enterprise Architecture**
  - Redis Enterprise vs open-source Redis: feature comparison
  - Proxy-based architecture: auto-connection pooling, query routing
  - Multi-tenancy: databases as isolated logical instances
  - Flash tier: RAM + SSD hybrid storage for cost-efficient large datasets
  - Redis on Flash: `FOC` (Flash on Cache) configuration and performance characteristics
- **Active-Active Geo-Distribution (CRDT-Based)**
  - Conflict-free Replicated Data Types (CRDTs) for multi-master replication
  - Conflict resolution strategies: last-writer-wins (LWW), observed-remove (OR-Set)
  - `ConflictResolutionType` configuration per database
  - Cross-region replication latency and bandwidth considerations
  - Active-Active use cases: global session stores, distributed counters, multi-region leaderboards
- **Redis Enterprise Cluster Management**
  - Node provisioning and cluster setup
  - Database creation with sharding and replication
  - Backup and restore: snapshot, periodic backup, streaming
  - Upgrade strategies: rolling upgrades, blue-green deployments
- **Hands-on Lab**: Set up a two-region Redis Enterprise Active-Active deployment (simulated), create a geo-replicated session store, test conflict resolution with concurrent writes, and measure cross-region replication latency

### Module 8: Observability, Performance Tuning, and Capacity Planning (Week 8)

- **Comprehensive Monitoring**
  - Redis metrics taxonomy: throughput, latency, memory, hit rate, replication lag
  - Prometheus integration: `redis_exporter` configuration and metrics
  - Grafana dashboards: Redis overview, cluster health, shard-level drill-down
  - RED method: Rate, Errors, Duration for Redis operations
  - Four golden signals for Redis: latency, saturation, errors, utilization
- **Slow Log and Profiling**
  - Configuring `slowlog-log-slower-than` and `slowlog-max-len`
  - Analyzing slow queries with `Redis FRI` (command tracing)
  - Command statistics: `INFO COMMANDSTATS` for hot commands
  - Big key detection: `redis-cli --bigkeys` and `MEMORY USAGE`
  - Key expiry patterns and TTL monitoring
- **Latency Optimization**
  - Network round-trip optimization: pipelining vs transactions vs Lua
  - Connection pooling best practices per client library
  - TLS handshake overhead and connection reuse
  - Client-side caching (Redis 6+ tracking mode): `CLIENT TRACKING`
  - Avoiding `MONITOR` in production: alternatives for command tracing
- **Capacity Planning**
  - Memory forecasting: data structure overhead growth models
  - Throughput estimation based on hardware profiles
  - Shard count calculation for target throughput and dataset size
  - Redis benchmark methodology: `redis-benchmark` with custom payloads
  - Right-sizing cloud instances for Redis workloads
- **Hands-on Lab**: Set up full Prometheus + Grafana monitoring for a Redis deployment, identify top 5 slow queries with slow log, implement client-side caching in a sample application, and run a capacity planning exercise for a target workload of 100K ops/sec with 50GB dataset

### Module 9: Security Hardening for Enterprise (Week 9)

- **Network Security Architecture**
  - Redis in zero-trust networks: mTLS, SPIFFE, mutual authentication
  - Redis 6/7 TLS configuration: `tls-cert-file`, `tls-key-file`, `tls-ca-cert-file`
  - Network segmentation: VPC, security groups, Calico network policies for K8s
  - Redis Proxy as TLS termination point
- **Encryption at Rest and in Transit**
  - Disk-level encryption: LUKS, dm-crypt for RDB/AOF files
  - Encrypted backups: GPG/AWS KMS for backup archives
  - TLS cipher suite configuration for Redis connections
  - Key rotation strategy for TLS and ACL credentials
- **Authentication and Authorization**
  - ACL v2 enterprise patterns: least-privilege user roles
  - Integration with external identity providers (LDAP, OIDC) via Redis Enterprise
  - Command blacklisting/whitelisting, dangerous commands (`FLUSHALL`, `DEBUG`, `CONFIG`)
  - Auditing with ACL logs and centralized logging
- **Compliance and Auditing**
  - GDPR compliance: encryption, data minimization, right to erasure
  - SOC2 and PCI-DSS considerations for Redis deployments
  - Audit logging: command logging, access logs, configuration changes
  - Immutable backups and WAL archiving for compliance
- **Hands-on Lab**: Configure mTLS for a Redis Cluster, create least-privilege ACL roles for application, backup, and monitoring users, set up centralized ACL audit logging with Elasticsearch, and implement encrypted backup strategy

### Module 10: Redis for AI and ML Workloads (Week 10)

- **Caching Layer for AI Pipelines**
  - LLM response caching: semantic caching with vector similarity
  - Embedding cache: TTL-based and LRU-based strategies
  - Feature store implementation: batch and real-time feature serving
  - Distributed locking for model update coordination
- **Rate Limiting for AI APIs**
  - Token bucket algorithm with Redis Sorted Sets
  - Sliding window counters with Sorted Set timestamps
  - Distributed rate limiting across API gateway instances
  - Per-user, per-model, and per-IP rate limiting tiers
- **Session Management for AI Chat**
  - Session state persistence with RedisJSON
  - Conversation history with Streams for replay
  - Context window management: trimming, summarization triggers
  - Multi-session coordination for agent-based systems
- **Real-Time ML Feature Computation**
  - Streaming feature aggregation with RedisTimeSeries
  - Online feature computation: moving averages, percentile calculations
  - Feature serving for online inference with sub-millisecond latency
  - A/B experiment assignment with Sorted Sets
- **Hands-on Lab**: Build a complete RAG caching layer with Redis vector search, implement a distributed rate limiter for an LLM API gateway, create a real-time feature store for an online recommendation system, and build a session management system for a multi-turn AI chat application

### Module 11: Disaster Recovery, Backup Strategies, and Multi-Region Architectures (Week 11)

- **Backup Strategies**
  - RDB snapshots: `SAVE`, `BGSAVE`, scheduling with `save` directive
  - AOF file management: `BGREWRITEAOF`, AOF rewrite triggers
  - Hybrid persistence (Redis 7): combining RDB and AOF
  - Remote backup: S3/Azure Blob sync, `redis-rdb-tools` for verification
  - Point-in-time recovery with AOF replay
- **Replication Topologies**
  - Chain replication: master → replica → replica
  - Replica priority and failover ordering
  - Read-only replicas for analytics and reporting workloads
  - Replication consistency: `WAIT` command for synchronous replication
- **Multi-Region Architectures**
  - Active-passive: DNS-based failover, replication across regions
  - Active-active (CRDT): Redis Enterprise Active-Active vs open-source limitations
  - Latency budgets for cross-region writes
  - Global replication with Kafka connect and Debezium
  - Regional failover testing: chaos engineering for Redis
- **Disaster Recovery Planning**
  - RPO and RTO objectives for Redis workloads
  - Recovery time estimation based on dataset size and persistence mode
  - Automatic failover testing: Sentinel election, Cluster failover
  - Disaster recovery drills: scheduled, automated chaos experiments
  - Multi-region Kubernetes with Redis Operator
- **Hands-on Lab**: Design and implement a multi-region disaster recovery plan, configure RDB snapshots with off-site S3 backup, test Sentinel failover under network partition, measure RTO/RPO for different persistence modes, and write an automated DR drill script

### Module 12: Capstone Project — Multi-Region AI-Enhanced E-Commerce Platform (Week 12)

- **Project Overview**: Design and build a production-ready, multi-region e-commerce platform that leverages Redis for caching, search, real-time analytics, session management, and AI-powered features. The platform must demonstrate advanced Redis capabilities across stack modules, cluster deployment, vector search, and observability.
- **Architecture Components**
  - Global product catalog with RediSearch full-text and vector search
  - Real-time inventory and pricing with RedisTimeSeries
  - Shopping cart and session management with RedisJSON
  - Personalized recommendations via vector similarity (cosine distance on product embeddings)
  - Distributed rate limiting for API gateway
  - Multi-region active-passive deployment with automated failover
  - Comprehensive monitoring with Prometheus and Grafana
- **Implementation Requirements**
  - Deploy Redis Enterprise or Redis Cluster on Kubernetes (minikube or cloud)
  - Implement vector search pipeline: product embeddings → HNSW index → semantic search + filters
  - Build Stream-backed event pipeline for order processing with consumer groups
  - Configure ACL v2 with least-privilege roles for each microservice
  - Implement client-side caching for hot product data
  - Set up cross-region replication with RDB streaming or Active-Active
- **Deliverables**
  - Complete working application with source code (Python/Node.js)
  - Redis data model documentation with schema definitions
  - Deployment manifests (Kubernetes YAML, Helm charts)
  - Monitoring dashboards (Grafana JSON model)
  - Disaster recovery plan document
  - Performance benchmark results under load

## Final Project

Learners will design and build a multi-region, AI-enhanced e-commerce platform using Redis as the core infrastructural data layer. The platform must integrate RediSearch for full-text and vector-based product search, RedisTimeSeries for real-time inventory analytics, RedisJSON for session state management, Redis Streams for event-driven order processing with consumer groups and dead-letter queues, and RedisBloom for probabilistic duplicate detection. The application must be deployed on Kubernetes using the Redis Operator (or Redis Enterprise), configured with cross-region replication or Active-Active geo-distribution, and monitored with Prometheus and Grafana. Deliverables include the complete source code, architecture documentation, deployment manifests, performance benchmarks, and a disaster recovery plan.

## Assessment Criteria

- **Weekly Assignments (35%)**: Practical exercises completed each week demonstrating hands-on proficiency with Redis Stack modules, Kubernetes deployment, vector search, and advanced operations.
- **Mid-Term Practical Exam (15%)**: Covers Weeks 1-5 fundamentals including internals, Redis Stack, vector search, Streams, and Redis 7+ features. Assessed through a timed, real-world Redis debugging and optimization exercise.
- **Capstone Project (40%)**: Evaluation based on architecture design, Redis data model quality, implementation completeness, monitoring and observability setup, disaster recovery documentation, and performance under load testing.
- **Participation and Peer Review (10%)**: Engagement with code reviews, architectural discussions on Slack/GitHub Discussions, and documentation quality.

## References

- [Redis Official Documentation](https://redis.io/docs/) — Complete reference for all Redis commands, configuration, and features
- [Redis Stack Documentation](https://redis.io/docs/stack/) — Official Redis Stack modules documentation (Search, JSON, TimeSeries, Bloom, Graph)
- [Redis Enterprise Documentation](https://docs.redis.com/) — Redis Enterprise features, Active-Active geo-distribution, and cluster management
- [Redis University](https://university.redis.com/) — Free online courses from Redis, including RU202 (Redis Streams) and RU301 (Redis Security)
- [Redis on Kubernetes](https://github.com/RedisLabs/redis-operator) — Official Redis Operator for Kubernetes
- [Redis Vector Similarity Search](https://redis.io/docs/stack/search/reference/vectors/) — Vector search reference and configuration guide
- [Redis in Action](https://redis.com/redis-in-action/) — Josiah L. Carlson (Manning Publications), expanded coverage of advanced patterns
- [Database Internals](https://www.databass.dev/) — Alex Petrov, for deeper understanding of LSM trees, B-trees, and storage engine architecture

---
title: "Advanced MongoDB Syllabus"
description: "A comprehensive 12-week advanced curriculum for experienced MongoDB developers covering enterprise architecture, sharding, replica set operations, multi-document ACID transactions, change streams, security, performance engineering, Atlas administration, and operational excellence."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced MongoDB Syllabus

## Overview

This 12-week advanced syllabus is designed for developers and database administrators who already have hands-on experience with MongoDB and want to master enterprise-grade operations, architecture, and optimization. The curriculum goes beyond basic CRUD and aggregation to cover distributed systems concepts that power MongoDB at scale: sharding strategies, replica set internals, multi-document ACID transaction semantics, change data capture with change streams, comprehensive security architecture, performance engineering, Atlas cloud administration, backup and disaster recovery, and automated operational tooling. Each module combines deep theoretical foundations with production-oriented labs and real-world case studies. The course culminates in a capstone project that requires designing, deploying, and operating a multi-region, sharded MongoDB cluster serving a sample high-throughput application.

By the end of this course, learners will be able to design shard keys for various access patterns, plan and execute zero-downtime cluster upgrades, tune queries and indexes for sub-millisecond latency, implement end-to-end encryption and RBAC, configure cross-region replication for disaster recovery, and automate routine operational tasks using Ops Manager or Atlas APIs.

## Curriculum

### Module 1: Replica Set Architecture and Internals (Week 1)

- **Election and consensus mechanics**
  - Raft consensus algorithm in MongoDB: leader election, term votes, and commit semantics
  - Priority settings and election timers: `electionTimeoutMillis` tuning
  - Vote-eligible members and hidden/arbiter members
  - How write concern (`w: majority`) interacts with replication

- **Replication mechanics**
  - Oplog structure, sizing, and window management
  - Secondary synchronization: initial sync vs. replication tailing
  - Rollback scenarios: detection, recovery, and best practices to avoid rollbacks
  - Chained replication and its performance implications

- **Read preference and consistency models**
  - Read preference modes: `primary`, `primaryPreferred`, `secondary`, `secondaryPreferred`, `nearest`
  - `maxStalenessSeconds` and latency threshold configuration
  - Causal consistency sessions and `afterClusterTime`
  - Snapshot reads and `readConcern` levels (`local`, `available`, `majority`, `linearizable`, `snapshot`)

- **Production replica set deployment**
  - Minimum recommended topology (3 data-bearing members across 2+ data centers)
  - Hidden members for analytics and backups
  - Delayed members for point-in-time recovery
  - Handling network partitions and split-brain scenarios

### Module 2: Sharding Architecture and Design (Week 2)

- **Sharding fundamentals**
  - Sharded cluster components: `mongos`, `config servers`, shard replica sets
  - Config server replica set (CSRS) requirements
  - Chunk ranges, split points, and the balancer

- **Shard key selection**
  - Shard key characteristics: cardinality, frequency, and monotonicity
  - Ranged vs. hashed sharding
  - Compound shard keys and their trade-offs
  - Zone sharding for data isolation and regulatory compliance
  - Common anti-patterns: monotonically increasing keys, low-cardinality keys, jumbo chunks

- **Balancing and chunk management**
  - Balancer window scheduling
  - Manual chunk splitting and merging
  - `moveChunk` mechanics and the impact on cluster performance
  - Chunk migration throttling and `writeConcern` implications

- **Production sharding considerations**
  - Choosing the right number of shards
  - Pre-splitting for bulk data loads
  - Shard addition, removal, and rebalancing
  - Hot shard mitigation strategies

### Module 3: Multi-Document ACID Transactions (Week 3)

- **Transaction fundamentals**
  - Multi-document ACID guarantee scope (replica set and sharded cluster)
  - Transaction syntax: `startSession`, `startTransaction`, `commitTransaction`, `abortTransaction`
  - Transaction lifetime limits (1000ms default, 16MB write limit)
  - `TransactionTooLargeForCache` error and its resolution

- **Read and write concerns in transactions**
  - Configuring `readConcern` (`snapshot`, `local`, `majority`) per transaction
  - `writeConcern` for transaction commits
  - Causal consistency across transaction boundaries

- **Retry logic and error handling**
  - Transient transaction errors and automatic retry
  - `TransientTransactionError` label handling
  - Implementing exponential backoff with jitter in application code
  - Balancing retries against latency SLOs

- **Performance considerations**
  - Transaction overhead on WiredTiger storage engine
  - `wiredTigerMaxWriteLock` contention
  - Oplog size impact of long-running transactions
  - Application patterns: when to use transactions vs. atomic single-document operations
  - Profiling and monitoring transaction activity

### Module 4: Change Streams and Reactive Data Patterns (Week 4)

- **Change streams fundamentals**
  - `$changeStream` aggregation stage and pipeline structure
  - Resume tokens: `_data` field, token structure, and recovery
  - Open vs. closed change streams

- **Change events and filtering**
  - Event types: `insert`, `update`, `replace`, `delete`, `invalidate`, `drop`, `rename`, `dropDatabase`
  - `$match` filtering on `operationType`, `ns`, and `documentKey`
  - `$project` on `fullDocument` for update lookups
  - `fullDocument: "required"` and `fullDocumentBeforeChange` options

- **Change stream topology**
  - Deployment across replica sets and sharded clusters
  - Sharded cluster considerations: per-shard ordering vs. global ordering
  - Resumability and resume token persistence
  - Coordinating multiple consumers with the same resume token

- **Enterprise integration patterns**
  - Change data capture (CDC) pipelines to data warehouses
  - Event sourcing and CQRS with change streams
  - Triggering cache invalidation and materialized view refresh
  - Change stream integration with Kafka and RabbitMQ

### Module 5: Security Architecture (Week 5)

- **Authentication and authorization**
  - SCRAM, x.509, LDAP, and Kerberos authentication mechanisms
  - Role-Based Access Control (RBAC): built-in roles vs. custom roles
  - Privilege model: actions, resources, and privilege inheritance
  - Local vs. external authorization

- **Transport encryption**
  - TLS/SSL configuration for `mongod`, `mongos`, and clients
  - Certificate management: CA, server, and client certificates
  - Certificate rotation with zero downtime
  - `net.tls` configuration options and FIPS mode

- **Encryption at rest**
  - WiredTiger storage engine encryption
  - Encryption key management with KMIP integration
  - Local key management vs. external key managers
  - Audit log encryption

- **Field-level and client-side encryption**
  - Client-Side Field Level Encryption (CSFLE) architecture
  - Automatic encryption vs. explicit encryption
  - Key vault collection and Key Management Service (KMS) provider configuration
  - Deterministic vs. randomized encryption
  - Queryable Encryption (MongoDB 7.0+)

- **Auditing**
  - System event audit trail configuration
  - Audit filter configuration for targeted event capture
  - Audit log formats: JSON, BSON, syslog
  - Compliance considerations (SOC2, HIPAA, PCI-DSS)

### Module 6: Performance Engineering at Scale (Week 6)

- **Query profiling and optimization**
  - `system.profile` collection: profiling levels and log analysis
  - `explain()` output parsing: `executionStats`, `winningPlan`, `rejectedPlans`
  - Index filter usage for testing index candidates
  - `$indexStats` for index usage analysis

- **Index optimization strategies**
  - Partial, sparse, and wildcard indexes for specialized workloads
  - Flexible indexes and `$**` wildcard index for schema-flexible environments
  - Index builds in production: foreground vs. background (`createIndexes`)
  - Rolling index builds on replica sets
  - Index intersection and covering query analysis

- **Storage engine tuning**
  - WiredTiger cache configuration: `wiredTigerCacheSizeGB`
  - WiredTiger checkpoint interval and journal compression
  - Compression: `snappy`, `zlib`, `zstd` for data and indexes
  - Block compression and prefix compression tuning

- **Memory and I/O management**
  - Working set sizing and page fault tracking
  - `serverStatus` and `dbStats` metrics for capacity planning
  - Read-ahead and filesystem optimization for WiredTiger
  - Connection pooling: `maxPoolSize`, `minPoolSize`, and `waitQueueTimeoutMS`

### Module 7: Backup, Recovery, and Disaster Recovery (Week 7)

- **Backup strategies**
  - `mongodump`/`mongorestore`: use cases, limitations, and point-in-time constraints
  - Filesystem snapshots (LVM, EBS) for consistent backups
  - Ops Manager backup: continuous incremental backup with queryable snapshots
  - Atlas backup: cloud provider snapshots and serverless continuous backups
  - Backup window management and impact on production performance

- **Restore methodologies**
  - Full restore vs. selective restore (collection or database level)
  - Cross-region restore for DR testing
  - Point-in-time recovery from oplog data
  - Validation procedures: checksums, document counts, index verification

- **Disaster recovery planning**
  - RTO and RPO definition for MongoDB workloads
  - Cross-region replica set deployment
  - Automatic failover testing (forced elections)
  - Delayed replica set members for rapid point-in-time recovery
  - DR runbook development and periodic drills

- **Business continuity**
  - Multi-data-center deployment patterns (active-passive, active-active)
  - Backup encryption and off-site storage
  - Monitoring backup health and alerting on failures
  - Compliance audit trails for backup and restore operations

### Module 8: MongoDB Atlas Advanced Administration (Week 8)

- **Atlas architecture and cluster management**
  - Cluster tiers: M0-M2-M5 (serverless), M10-M700 (dedicated), and multi-region
  - Cluster auto-scaling: compute, storage, and IOPS
  - Multi-cloud and multi-region deployments
  - Global clusters with zone sharding

- **Atlas Security features**
  - IP access lists and VPC peering
  - Private endpoints (AWS PrivateLink, Azure Private Link, GCP Private Service Connect)
  - Network peering for multi-cloud topologies
  - Atlas encryption at rest with customer key management (CMK)

- **Atlas Performance and optimization**
  - Performance Advisor: index recommendations and query tuning
  - Real-Time Performance Panel for live workload analysis
  - Atlas Search: Lucene-based full-text search indexes
  - Online archive and tiered storage for cost optimization
  - Data lake integration: Atlas Data Federation and S3-backed querying

- **Atlas Automation and API**
  - Atlas Administration API for cluster provisioning
  - Infrastructure-as-Code with Terraform and Atlas Provider
  - Alert configuration and notification channels
  - Maintenance windows and rolling updates

### Module 9: Data Modeling for Enterprise Workloads (Week 9)

- **Schema design patterns**
  - Operational vs. analytical workload modeling
  - One-to-one, one-to-many, many-to-many: embedding vs. referencing trade-offs
  - Column extension, attribute, and polymorphic design patterns
  - Approximate, computed, and outlier patterns for challenging workloads

- **Time-series and IoT workloads**
  - MongoDB time-series collections: bucket granularity, metaField, and timeField
  - Automatic bucket compaction and secondary indexes on time-series data
  - Schema versioning for evolving IoT data formats
  - Downsampling and retention policies

- **Graph and hierarchical data**
  - Materialized path, nested sets, and references for tree structures
  - `$graphLookup` for recursive graph traversal
  - Graph use cases: social networks, recommendation engines, fraud detection
  - Hybrid modeling with embedded arrays and graph references

- **Migration and schema evolution**
  - Live schema migration strategies: incremental, lazy, and bulk migration
  - `validator` and `validationLevel` for schema governance
  - Backward-compatible schema changes in production
  - Data transformation pipelines for ETL and ELT workflows

### Module 10: Monitoring, Alerting, and Automation (Week 10)

- **Monitoring fundamentals**
  - MongoDB Cloud Manager and Ops Manager monitoring
  - `mongostat` and `mongotop` for real-time cluster insight
  - Key performance indicators: query latency, connections, page faults, oplog window
  - Custom monitoring with `db.currentOp()` and `db.serverStatus()`

- **Alerting and incident response**
  - Critical alert thresholds: replication lag, long queries, assertion count
  - Atlas alert configuration for multi-channel notification
  - Prometheus and Grafana integration via MongoDB exporter
  - Incident response runbooks for common failure scenarios

- **Automation with Ops Manager**
  - Automated deployment, upgrade, and patch management
  - Rolling maintenance procedures (index builds, upgrades)
  - Agent configuration and health monitoring
  - Backup automation and scheduled restore testing

- **Infrastructure as Code**
  - Terraform provider for MongoDB Atlas
  - Kubernetes Operator for MongoDB Enterprise
  - Ansible playbooks for MongoDB automation
  - CI/CD integration for database change management

### Module 11: Migration, Upgrades, and Version Management (Week 11)

- **Version upgrade strategies**
  - MongoDB version numbering and release lifecycle
  - Rolling upgrade procedure for replica sets and sharded clusters
  - Feature compatibility version (`FCV`) management
  - Downgrade considerations and compatibility matrices

- **Data migration patterns**
  - Live migration from legacy MongoDB versions
  - Cross-platform migration (on-premises to Atlas, or vice versa)
  - Heterogeneous migration: RDBMS to MongoDB with ETL pipelines
  - Large dataset migration with low downtime
  - Data validation and reconciliation after migration

- **Hardware and capacity planning**
  - Right-sizing clusters: CPU, memory, storage, and IOPS requirements
  - Vertical vs. horizontal scaling decisions
  - Storage engine comparison for workload-specific optimization
  - Benchmarking methodology for capacity planning

- **Lifecycle management**
  - End-of-life planning and upgrade cadence
  - Driver compatibility with server versions
  - Feature deprecation tracking and migration planning
  - Testing methodology: staging, canary, and blue-green deployment for databases

### Module 12: Capstone Project — Multi-Region E-Commerce Platform (Week 12)

- **Project scope**
  - Design a sharded MongoDB cluster supporting an e-commerce platform handling 50,000 requests per second
  - Deploy across three AWS regions (us-east-1, eu-west-1, ap-southeast-1)
  - Implement order management, inventory tracking, user sessions, and product catalog

- **Architecture requirements**
  - Shard key design for orders (region-based + time-based compound key)
  - Replica set configuration with cross-region read scaling
  - Change streams for inventory synchronization
  - Encryption for PII data (CSFLE) and TLS for all connections

- **Operational requirements**
  - Backup schedule with 1-hour RPO and 4-hour RTO
  - Monitoring dashboards for query latency, replication lag, and resource utilization
  - Automated failover testing and disaster recovery drills
  - Upgrade plan for MongoDB version migration

- **Deliverables**
  - Architecture diagram and shard key analysis document
  - Deployment automation scripts (Terraform or Atlas API)
  - Monitoring and alerting configuration
  - Disaster recovery runbook
  - Performance benchmark report

## Final Project

Learners will design, document, and automate the deployment of a production-ready, multi-region, sharded MongoDB cluster for a high-traffic e-commerce platform. The project must include:

- A written architecture document explaining shard key selection, replication topology, data distribution strategy, and security architecture
- Infrastructure-as-Code automation (Terraform or Atlas API scripts) that provisions the cluster across three cloud regions
- A comprehensive monitoring and alerting configuration covering critical metrics: query latency, replication lag, opcounter rates, page fault rates, and connection utilization
- A disaster recovery runbook detailing failover procedures, backup validation steps, and cross-region recovery times
- A performance benchmark demonstrating the cluster handling the specified throughput with sub-100ms P99 latency

## Assessment Criteria

- **Architecture Design (30%)**: Quality of shard key analysis, replica set topology choices, data distribution strategy, and security architecture. Evaluation includes written rationale explaining trade-offs and alternatives considered.
- **Automation Implementation (25%)**: Completeness and correctness of IaC scripts. Terraform/Atlas API configurations must be syntactically valid and deployable. Version-controlled with meaningful comments.
- **Monitoring and Observability (20%)**: Coverage of critical metrics, appropriate alert thresholds, multi-channel notification setup, and dashboard design. Must include at least 15 distinct metrics across cluster health, query performance, and resource utilization.
- **Disaster Recovery Plan (15%)**: Completeness of the DR runbook, including failover steps, rollback procedures, backup validation, and clearly documented RTO/RPO targets.
- **Performance Validation (10%)**: Benchmarking methodology, load test results, and analysis of bottlenecks. Must demonstrate the cluster meeting or exceeding the target throughput and latency SLOs.

## References

- [MongoDB Production Notes — Official Deployment Guide](https://docs.mongodb.com/manual/administration/production-notes/)
- [MongoDB Sharding Documentation](https://docs.mongodb.com/manual/sharding/)
- [MongoDB Security Reference Architecture](https://www.mongodb.com/collateral/mongodb-security-reference-architecture)
- [MongoDB Atlas Security Checklist](https://docs.atlas.mongodb.com/security-checklist/)
- [MongoDB Change Streams Documentation](https://docs.mongodb.com/manual/changeStreams/)
- [MongoDB Transactions Guide](https://docs.mongodb.com/manual/core/transactions/)
- [MongoDB University: Advanced Deployment (Course)](https://university.mongodb.com/courses/M121/about)
- [MongoDB Performance Best Practices Whitepaper](https://www.mongodb.com/collateral/mongodb-performance-best-practices)
- [WiredTiger Storage Engine Documentation](https://docs.mongodb.com/manual/core/wiredtiger/)
- [MongoDB Ops Manager Documentation](https://docs.opsmanager.mongodb.com/current/)

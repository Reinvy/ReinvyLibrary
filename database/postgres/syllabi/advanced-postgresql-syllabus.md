---
title: "Advanced PostgreSQL Syllabus"
description: "A 12-week advanced curriculum covering PostgreSQL query optimizer internals, advanced indexing, vacuum and bloat management, MVCC and concurrency control, logical replication and high availability, observability, extension ecosystems, data warehousing, security hardening, and disaster recovery."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced PostgreSQL Syllabus

## Overview

This 12-week advanced syllabus is designed for experienced developers and database administrators who already understand PostgreSQL fundamentals and want to master the internals, performance engineering, and production operations that separate a competent user from an expert. The curriculum goes deep into the query optimizer's cost model, advanced index types and when to use them, vacuum and bloat internals, MVCC and locking behavior, logical replication and high-availability architecture, observability tooling, the extension ecosystem, analytical and warehousing patterns, security hardening, and disaster recovery at scale. Each week pairs theory with hands-on labs against a realistic production-shaped dataset. By the end, you will be able to diagnose slow queries from first principles, design indexes that survive real workloads, operate replication and failover safely, and architect a PostgreSQL platform that meets demanding reliability and performance targets.

## Curriculum

### Week 1: Query Optimizer Internals
- **How the Planner Thinks**
  - Parse, rewrite, plan, and execute pipeline
  - Relational algebra and plan tree structure
  - Cost model: startup vs total cost, row estimates, width
  - `EXPLAIN` output anatomy: node types and cost fields
- **Statistics and Estimation**
  - `pg_statistic` and histogram buckets, most-common-values lists
  - Null fraction, distinct counts, correlation
  - `ANALYZE` sampling and statistics targets
  - Extended statistics for correlated columns (`CREATE STATISTICS`)
- **Join Strategies**
  - Nested loop, hash join, merge join: when each wins
  - Join ordering and the `geqo` genetic optimizer
  - Work memory pressure and temp file spills
- **Practical Labs**
  - Reading `EXPLAIN ANALYZE` on a real slow query
  - Using `auto_explain` to capture plans in production
  - Correcting bad estimates with extended statistics

### Week 2: Advanced Indexing Strategies
- **Index Types Deep Dive**
  - B-tree internals: page layout, deduplication, `INCLUDE` columns
  - GIN for JSONB, arrays, and full-text search
  - GiST and SP-GiST for geometry, ranges, and k-NN search
  - BRIN for huge append-only tables
  - Hash, bloom, and partial/expression indexes
- **Index Design Under Real Workloads**
  - Composite index column order and selectivity
  - Covering indexes and index-only scans
  - Correlated vs uncorrelated column ordering
  - When indexes hurt: write amplification and bloat
- **Index Maintenance**
  - Detecting and measuring index bloat
  - `REINDEX CONCURRENTLY` and `pg_repack`
  - Unused index detection with `pg_stat_user_indexes`
- **Practical Labs**
  - Benchmarking GIN vs B-tree vs BRIN on time-series data
  - Building a covering index and verifying index-only scans
  - Simulating bloat and planning a maintenance window

### Week 3: Vacuum, Bloat, and Maintenance Internals
- **MVCC and Dead Tuple Lifecycle**
  - How `UPDATE` and `DELETE` create dead tuples
  - Transaction ID wraparound and `xid` horizons
  - The visibility map and index-only scan acceleration
- **Vacuum Mechanics**
  - `VACUUM` vs `VACUUM FULL` vs `ANALYZE`
  - Autovacuum triggering: thresholds, scale factors, cost limits
  - `n_dead_tup`, `n_live_tup`, and `pg_stat_user_tables`
- **Bloat Management**
  - Table bloat causes and quantification queries
  - `pg_freespacemap` and page density inspection
  - Zero-downtime bloat removal with `pg_repack`
- **Practical Labs**
  - Tuning autovacuum for a high-churn table
  - Measuring bloat with the standard bloat query
  - Running a safe `pg_repack` on a busy production table

### Week 4: MVCC, Locking, and Concurrency Control
- **Isolation Levels Revisited**
  - Read committed, repeatable read, and serializable
  - Snapshot isolation and SSI (serializable snapshot isolation)
  - Anomalies: dirty reads, non-repeatable reads, phantoms, write skew
- **Locking Model**
  - Row-level locks: `FOR UPDATE`, `FOR SHARE`, `FOR NO KEY UPDATE`
  - Table-level lock modes and conflict matrix
  - Lock queues, deadlocks, and `pg_locks` inspection
- **Advisory Locks and Advanced Patterns**
  - Session vs transaction-scoped advisory locks
  - Implementing distributed job queues safely
  - `SKIP LOCKED` for concurrent workers
- **Practical Labs**
  - Reproducing write skew under serializable isolation
  - Diagnosing a lock wait chain with `pg_blocking_pids()`
  - Building a safe worker queue with `SKIP LOCKED`

### Week 5: Logical Replication and High Availability
- **Logical Replication Architecture**
  - Publication and subscription model
  - Row filters, column lists, and DDL replication limits
  - Conflict handling and replica identity requirements
- **Physical Replication Refresher**
  - Streaming replication, WAL shipping, and timelines
  - Synchronous vs asynchronous commit
  - Cascading replication topologies
- **High Availability with Patroni**
  - Patroni, etcd, and the distributed consensus model
  - Automatic failover, `pg_rewind`, and split-brain prevention
  - Zero-downtime switchover procedures
- **Practical Labs**
  - Setting up a three-node Patroni cluster
  - Performing a controlled switchover and a simulated failover
  - Building a logical replication pipeline for a reporting database

### Week 6: Observability and Performance Monitoring
- **Built-in Observability**
  - `pg_stat_statements` and normalized query fingerprints
  - `pg_stat_activity` and `pg_stat_progress_*` views
  - `pg_stat_bgwriter`, `pg_stat_wal`, and I/O statistics
- **Advanced Diagnostics**
  - `pg_wait_sampling` and wait event analysis
  - `pg_stat_statements` top-N tuning workflow
  - `pg_show_plans` and plan capture for slow statements
- **External Monitoring Stack**
  - Prometheus, node_exporter, and postgres_exporter
  - Grafana dashboards and alerting rules
  - pgBadger log analysis workflows
- **Practical Labs**
  - Building a complete Prometheus/Grafana stack for PostgreSQL
  - Identifying a top-5 query list and optimizing each
  - Setting up alerting for replication lag and bloat thresholds

### Week 7: Extension Ecosystem
- **Essential Extensions**
  - `pg_stat_statements`, `pg_trgm`, `pgcrypto`, `uuid-ossp`
  - `pg_partman` for automated partition management
  - `pg_cron` for scheduled maintenance jobs
- **Geospatial with PostGIS**
  - Geometry vs geography, spatial indexes (GiST)
  - Common spatial queries and `ST_` function families
  - PostGIS in production: projection, tiling, and performance
- **Time-Series and Vector Data**
  - TimescaleDB hypertables and continuous aggregates
  - `pgvector` for similarity search and HNSW indexes
  - Choosing the right tool: TimescaleDB vs plain partitioning
- **Practical Labs**
  - Installing and configuring a curated extension set
  - Loading a real geospatial dataset and running spatial queries
  - Building a vector search feature with `pgvector`

### Week 8: Advanced PL/pgSQL and Procedural Programming
- **PL/pgSQL Mastery**
  - Blocks, variables, and control structures
  - Cursors, `FOR` loops, and bulk operations
  - Exception handling and transaction control in procedures
- **Functions, Procedures, and Triggers**
  - `LANGUAGE SQL` vs `plpgsql` vs `plpython3u`
  - Trigger functions and event triggers
  - Constraint triggers and deferred constraints
- **Advanced Patterns**
  - Custom aggregates and window function support functions
  - Dynamic SQL with `EXECUTE` and `format()`
  - Writing idempotent migration functions
- **Practical Labs**
  - Writing a production-grade trigger-based audit trail
  - Implementing a custom aggregate for percentile buckets
  - Building a dynamic ETL procedure with error handling

### Week 9: Data Warehousing and Analytical Patterns
- **Analytical Workload Design**
  - Star and snowflake schemas in PostgreSQL
  - Partitioning at scale: range, list, and hash
  - Incremental materialized view maintenance
- **Foreign Data and Federation**
  - `postgres_fdw` for cross-database queries
  - `file_fdw` and CSV ingestion patterns
  - Sharding options and their trade-offs
- **Columnar and OLAP Approaches**
  - `citus` for distributed analytical workloads
  - `pg_analytics` and columnar storage extensions
  - When to stay row-oriented vs go columnar
- **Practical Labs**
  - Designing a partitioned analytics warehouse
  - Querying across federated databases with `postgres_fdw`
  - Benchmarking an OLAP query set with and without columnar storage

### Week 10: Security Hardening
- **Authentication and Encryption**
  - SCRAM-SHA-256, certificate auth, and LDAP integration
  - TLS configuration and cipher suites
  - Column-level encryption with `pgcrypto`
- **Authorization Deep Dive**
  - Row-level security policies and `WITH CHECK`
  - Column privileges and default privileges
  - `pgaudit` for comprehensive audit logging
- **Operational Security**
  - Secrets management with Vault and Kubernetes
  - Network isolation and `pg_hba.conf` best practices
  - Backup encryption and secure offsite storage
- **Practical Labs**
  - Implementing row-level security for a multi-tenant app
  - Configuring `pgaudit` and reviewing audit output
  - Hardening a production `postgresql.conf` and `pg_hba.conf`

### Week 11: Backup, Recovery, and Disaster Recovery
- **Backup Tooling at Scale**
  - `pgBackRest` architecture: repositories, stanza, and delta restore
  - WAL archiving and retention policies
  - `pg_dump` vs physical backups for different recovery goals
- **Point-in-Time Recovery**
  - Recovery targets: time, transaction ID, and named restore points
  - Restore validation and backup testing discipline
- **Disaster Recovery Strategy**
  - RPO and RTO definitions and trade-offs
  - Multi-region replication and failover runbooks
  - Restoring to a point before a logical corruption event
- **Practical Labs**
  - Configuring `pgBackRest` with encrypted backups
  - Executing a PITR drill and verifying data integrity
  - Writing and rehearsing a full DR runbook

### Week 12: Capstone — Production PostgreSQL Platform
- **Capstone Project**
  - Architect and implement a production-grade PostgreSQL platform
  - Combine Patroni HA, pgBackRest backups, monitoring, and security
  - Document architecture decisions, RPO/RTO, and runbooks
- **Final Review**
  - Performance tuning review of the platform
  - Failover and recovery drills
  - Presenting the design to peers for critique

## Final Project

Learners will design and implement a **Production PostgreSQL Platform** for a fictional high-traffic SaaS application. The project must include:

1. **High Availability**: A three-node Patroni cluster with etcd, automatic failover, and a documented switchover procedure.
2. **Backup and Recovery**: A `pgBackRest` configuration with encrypted backups, WAL archiving, and a proven PITR runbook.
3. **Performance Engineering**: At least three documented query optimizations using `EXPLAIN ANALYZE`, extended statistics, or advanced index design, with before/after metrics.
4. **Observability**: A Prometheus/Grafana stack with dashboards and alerts for replication lag, bloat, and slow queries.
5. **Security Hardening**: Row-level security for multi-tenancy, `pgaudit` enabled, TLS enforced, and secrets externalized.
6. **Analytical Workload**: A partitioned or federated reporting layer serving a realistic OLAP query set.

Deliverables: architecture diagram, configuration files (Patroni, pgBackRest, monitoring), SQL artifacts, benchmark results, and a written runbook covering failover, restore, and maintenance procedures.

## Assessment Criteria

- **Architecture Quality (25%)**: Correct HA design, sensible RPO/RTO choices, and justified technology selections.
- **Performance Engineering (20%)**: Demonstrated ability to diagnose and fix real performance problems with measurable improvements.
- **Operational Readiness (20%)**: Complete, rehearsed runbooks for failover, PITR, and routine maintenance.
- **Security Implementation (15%)**: Correct RLS policies, audit coverage, and hardened configuration.
- **Monitoring and Alerting (10%)**: Dashboards and alerts that would catch real incidents before users notice.
- **Documentation and Communication (10%)**: Clear architecture decisions, trade-off analysis, and professional runbook writing.

## References

- **Official Documentation**: [PostgreSQL Documentation](https://www.postgresql.org/docs/)
  - Internals: [https://www.postgresql.org/docs/current/internals.html](https://www.postgresql.org/docs/current/internals.html)
  - Performance Tips: [https://www.postgresql.org/docs/current/performance-tips.html](https://www.postgresql.org/docs/current/performance-tips.html)
  - High Availability: [https://www.postgresql.org/docs/current/high-availability.html](https://www.postgresql.org/docs/current/high-availability.html)
- **Books**:
  - "PostgreSQL 16 Administration Cookbook" by Simon Riggs and Gianni Ciolli
  - "PostgreSQL Query Optimization" by Hans-Jürgen Schönig
  - "The Art of PostgreSQL" by Dimitri Fontaine
- **Project Docs**:
  - [Patroni Documentation](https://patroni.readthedocs.io/)
  - [pgBackRest User Guide](https://pgbackrest.org/user-guide.html)
  - [PostGIS Documentation](https://postgis.net/documentation/)
  - [TimescaleDB Docs](https://docs.timescale.com/)
  - [pgvector README](https://github.com/pgvector/pgvector)
- **Online Resources**:
  - [pganalyze Blog](https://pganalyze.com/blog) — PostgreSQL performance articles
  - [Depesz EXPLAIN Analyzer](https://explain.depesz.com/) — plan visualization
  - [PostgreSQL Wiki](https://wiki.postgresql.org/) — community knowledge base

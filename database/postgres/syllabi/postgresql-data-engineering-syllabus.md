---
title: "PostgreSQL Data Engineering Syllabus"
description: "A seven-module curriculum that takes experienced developers from relational data modeling and advanced SQL through query performance, ingestion pipelines, partitioning, change data capture, and data quality on PostgreSQL."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# PostgreSQL Data Engineering Syllabus

## Overview

This seven-module curriculum is built for engineers who already write SQL comfortably but want to own the data platform rather than just query it. Each module targets one layer of a production PostgreSQL data stack: schema design, analytical SQL, execution-plan-driven performance work, reliable ingestion, partitioned storage with retention, change data capture into downstream systems, and the constraints and tests that keep derived data trustworthy.

The course is deliberately narrow. It does not cover installation, backup tooling, or high-availability topologies in depth; those belong to a DBA track. Instead it follows a single dataset — an e-commerce order stream — from raw landing table to curated analytics model, so every technique is applied to the same schema and the consequences of each decision remain visible in later modules. Modules 1 through 3 build the foundation, modules 4 through 6 build the pipeline, and module 7 closes the loop with quality gates.

Each module mixes a short conceptual lecture, a guided lab against a local PostgreSQL 16 instance, and a review exercise where learners critique a deliberately flawed design. The final two weeks are reserved for a capstone that requires a working batch and streaming pipeline, not a slide deck.

## Curriculum

### Module 1: Data Modeling for Analytical Workloads (Week 1)

- **Relational foundations revisited**
  - Keys, foreign keys, and the cost of enforcing them during bulk loads
  - Normalization to third normal form and the specific cases where denormalization pays
  - Naming conventions, schemas as namespaces, and separating raw from curated layers
  - Choosing surrogate versus natural keys for fact tables

- **Dimensional modeling in PostgreSQL**
  - Star schemas with `orders`, `order_items`, and conformed dimensions
  - Slowly changing dimensions type 1 and type 2 with validity ranges
  - Bridge tables for many-to-many attributes
  - When a JSONB column beats a side table, and when it becomes a liability

- **Lab**: model the order dataset in both normalized and star form, then measure the row counts and join depth of each.

### Module 2: Advanced SQL for Transformations (Week 2)

- **Composable queries**
  - Common table expressions for staging and readability, and when they are inlined
  - `LATERAL` joins for top-N-per-group and per-row function calls
  - `DISTINCT ON` as a compact deduplication idiom
  - Recursive CTEs for hierarchies and graph walks with cycle detection

- **Analytical aggregates**
  - Window functions: `row_number`, `lag`, `sum() OVER`, frames and `EXCLUDE`
  - `GROUPING SETS`, `ROLLUP`, and `CUBE` for multi-level reports
  - `FILTER (WHERE ...)` and ordered aggregates
  - `generate_series` for gap filling and calendar spines

- **Idempotent writes**
  - `INSERT ... ON CONFLICT DO UPDATE` with `EXCLUDED` and guarded updates
  - `MERGE` semantics and its concurrency caveats
  - Deduplicating with `row_number()` over a natural key
  - Lab: build a daily revenue mart that can be re-run without double counting.

### Module 3: Performance and Execution Plans (Week 3)

- **Reading plans**
  - `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` and the meaning of actual versus estimated rows
  - Scan types: sequential, index, index-only, bitmap heap
  - Join strategies: nested loop, hash join, merge join, and when the planner misjudges
  - Rows-removed-by-filter as the signal for a missing or wrong index

- **Statistics and indexes**
  - `ANALYZE`, default statistics targets, and `CREATE STATISTICS` for correlated columns
  - B-tree, hash, GIN, GiST, and BRIN selection by data shape
  - Partial and covering indexes with `INCLUDE`
  - Write amplification: measuring the cost of every added index

- **Maintenance**
  - Autovacuum thresholds, freeze limits, and transaction ID wraparound
  - `pg_stat_statements` for finding the top offenders by total time
  - Lab: reduce a five-second report query to under two hundred milliseconds.

### Module 4: Ingestion Pipelines (Week 4)

- **Bulk loading**
  - `COPY FROM` with CSV and binary formats versus multi-row `INSERT`
  - Staging tables, `UNLOGGED` tables, and `COPY FREEZE` after a table creation
  - Constraint deferral and index build order during loads
  - Error handling with `ON_ERROR` and rejected-row capture

- **Incremental patterns**
  - Watermarks, high-water marks, and replayed windows
  - Idempotent upserts keyed by `(source, natural_key, updated_at)`
  - Batching strategy: transaction size, lock duration, and checkpointing
  - Handling late and out-of-order records without losing them

- **Orchestration**
  - dbt models layered as staging, intermediate, and mart
  - Airflow or Dagster tasks that fail loudly and resume safely
  - `postgres_fdw` and `file_fdw` for pulling external sources into the warehouse
  - Lab: load a month of order events twice and prove the result is identical.

### Module 5: Partitioning and Data Lifecycle (Week 5)

- **Declarative partitioning**
  - `RANGE` for time, `LIST` for tenant or region, `HASH` for even distribution
  - Partition pruning and why the partition key must appear in predicates
  - Unique constraints and foreign keys across partitions
  - Default partitions as a safety net and a silent performance trap

- **Operations at scale**
  - `ATTACH` and `DETACH PARTITION CONCURRENTLY` for zero-downtime rotation
  - `pg_partman` for automated creation and retention
  - Moving cold partitions to cheaper storage or `pg_dump` archives
  - Monitoring partition count, size skew, and autovacuum coverage

- **Lab**: convert a monolithic events table into monthly partitions without dropping writes, then detach and archive a quarter of data.

### Module 6: Change Data Capture and Streaming (Week 6)

- **Logical replication**
  - `wal_level = logical`, replication slots, and `pgoutput` decoding
  - Publications and subscriptions, including column lists and row filters
  - Replica identity and why `REPLICA IDENTITY FULL` is expensive
  - Slot retention hazards: an abandoned slot will fill the disk

- **Downstream delivery**
  - Debezium PostgreSQL connector and the initial snapshot phase
  - Kafka Connect sink patterns and schema registry compatibility
  - At-least-once delivery, deduplication keys, and exactly-once illusions
  - Monitoring `pg_replication_slots` lag and `pg_stat_replication` state

- **Lab**: stream order changes into a second database and reconcile counts after a forced connector restart.

### Module 7: Data Quality and Governance (Week 7)

- **Constraints as contracts**
  - `NOT NULL`, `CHECK`, and exclusion constraints as executable documentation
  - `NOT VALID` constraints for online rollout on large tables
  - Domain types and enums versus lookup tables
  - Measuring constraint violation rates instead of hiding them

- **Testing and observability**
  - dbt tests: uniqueness, referential integrity, accepted values, freshness
  - Great Expectations suites for distribution and volume anomalies
  - Alerting on row-count deltas and null-rate drift
  - Lineage from source table to mart, recorded in the catalog

- **Governance**
  - Row-level security for multi-tenant marts
  - PII classification, masking views, and column encryption choices
  - Retention policy expressed as code, not as a wiki page
  - Lab: add a quality gate that blocks promotion of a mart when tests fail.

## Final Project

Learners build a compact but complete analytics platform on a single PostgreSQL cluster using the order dataset from the labs. The deliverable includes a star-schema mart with type-2 customer dimension, an idempotent ingestion job that can be replayed for any date range, monthly range partitions with an automated retention job, a logical replication slot feeding a downstream consumer, and a dbt project whose tests gate publication. Each learner submits the schema migrations, the pipeline code, a written explanation of three performance decisions backed by `EXPLAIN` output, and a five-minute demo showing a replayed load and a rejected bad batch.

## Assessment Criteria

- **Weekly labs**: 35% — correctness of the result set, idempotency, and whether the approach survives a second run.
- **Design reviews**: 20% — quality of critique on the flawed-schema exercises, including concrete alternatives.
- **Final project**: 35% — schema quality, pipeline reliability, partition and retention design, and evidence-based performance work.
- **Documentation**: 10% — clarity of the architecture note and reproducibility of the setup instructions.

## References

- PostgreSQL Documentation: Table Partitioning — https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL Documentation: Logical Replication — https://www.postgresql.org/docs/current/logical-replication.html
- PostgreSQL Documentation: Using EXPLAIN — https://www.postgresql.org/docs/current/using-explain.html
- PostgreSQL Documentation: Routine Vacuuming — https://www.postgresql.org/docs/current/routine-vacuuming.html
- PostgreSQL Documentation: COPY — https://www.postgresql.org/docs/current/sql-copy.html
- Debezium Documentation: PostgreSQL Connector — https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- dbt Documentation: Building a dbt Project — https://docs.getdbt.com/docs/build/projects
- pg_partman README — https://github.com/pgpartman/pg_partman

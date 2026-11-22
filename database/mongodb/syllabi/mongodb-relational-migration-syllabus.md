---
title: "MongoDB Relational Database Migration Syllabus"
description: "A ten-module advanced curriculum for engineers moving workloads from relational databases to MongoDB — workload assessment, migration strategy selection, normalized-to-document modeling, type fidelity, bulk loading, change data capture cutovers, application code migration, reconciliation, and legacy decommissioning."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# MongoDB Relational Database Migration Syllabus

## Overview

Most MongoDB material teaches how to build greenfield applications. The harder and far more common problem in production is moving an existing relational workload — years of schema migrations, stored procedures, joins, and reporting queries — onto a document store without losing data, breaking application behaviour, or discovering at cutover that the new data model cannot serve the access patterns the business actually depends on.

This curriculum treats relational-to-MongoDB migration as a discipline with its own phases: assessment, modeling, data movement, incremental sync, application rewriting, validation, and decommissioning. Each phase has failure modes that only appear in production, so the syllabus pairs each module with artifact-driven exercises — an inventory sheet, a mapping table, a reconciliation harness, a rollback runbook — rather than abstract reading.

The course assumes you already know how to write MongoDB queries and indexes. Its focus is the engineering work around the migration: proving equivalence, keeping two systems consistent while both are live, and knowing when it is safe to switch reads and writes over. Ten modules, roughly four to six hours each, ending in a capstone migration with a real cutover rehearsal.

Learners should already be comfortable with SQL schema design and with a MongoDB driver in at least one language. Access to a relational instance (PostgreSQL or MySQL) and a MongoDB replica set is required; Atlas or a local dockerized cluster both work.

## Curriculum

### Module 1: Migration Discovery and Workload Assessment

- **Build the workload inventory before writing a single document**
  - Table sizes, row counts, growth rate, and hot versus cold data split
  - Foreign key graph and the join frequency between each pair of tables
  - Read/write ratio per table, measured from `pg_stat_statements` or the MySQL performance schema rather than guessed
- **Capture the query catalogue**
  - Top queries by total time and by call count, with their parameter distributions
  - Reporting and analytics queries that will not translate one-to-one
  - Batch jobs, cron-driven updates, and anything reading tables directly with raw SQL
- **Classify stored procedures, triggers, and views**
  - Logic that moves into application code versus logic that becomes an aggregation pipeline
  - Trigger-driven side effects that become change streams or application events
- **Produce the go/no-go assessment**
  - Workloads that genuinely benefit from documents (hierarchical, polymorphic, per-tenant variable attributes) versus workloads that are better left relational
  - Estimated effort per phase, and the risk register that will follow the project through cutover

### Module 2: Strategy Selection and Migration Architecture

- **Compare the four migration shapes**
  - Big-bang offline migration with a maintenance window: simplest, shortest consistency surface, highest business risk
  - Phased migration by bounded context or tenant: gradual, requires internal API boundaries to exist already
  - Strangler-fig migration behind a routing layer: keeps both stores authoritative for different traffic
  - Permanent coexistence with CDC synchronization: appropriate when the legacy system cannot be retired
- **Define source-of-truth rules for the transition window**
  - Which store accepts writes at each stage, and how writes are propagated to the other
  - Read paths that tolerate replication lag versus paths that must see their own writes
- **Design the migration topology**
  - Extractor placement relative to the database (network, replication slot, read preference)
  - Staging area and transform service responsibilities
  - Idempotency requirements for every batch and every stream consumer
- **Establish the environment ladder**
  - Development, staging with production-shaped data volumes, and a cutover rehearsal environment
  - Anonymization or subsetting policy for production data used in staging

### Module 3: Modeling the Migrated Workload

- **Translate normalization into document boundaries**
  - One-to-many relationships: embed when the child is bounded and always read with the parent, reference otherwise
  - Many-to-many relationships: reference arrays with `$lookup` for the analytical minority, precomputed copies for the read majority
  - Modeling per access pattern, then validating the model against every query in the catalogue
- **Handle the awkward relational constructs**
  - Join tables that become embedded arrays versus join tables that become their own collections
  - Inheritance and discriminator columns mapped to polymorphic documents with a shared discriminator field
  - Composite keys and surrogate keys: which ones survive as `_id`, which ones become unique indexes
- **Plan schema versioning from day one**
  - A `schemaVersion` field per document and the application-side handling of mixed versions
  - Whether to migrate documents in place, lazily on read, or via a backfill job
- **Review the model with real access patterns before loading data**
  - Dry-run the top twenty queries as aggregation pipelines against a sampled dataset
  - Record the queries that still need `$lookup` and decide whether the model or the query should change
- **Document the mapping table**
  - One row per source column: target field path, transformation rule, nullability, and owner

### Module 4: Data Type Fidelity and Transformation Rules

- **Numeric precision and ranges**
  - Mapping `NUMERIC` and `DECIMAL` to `Decimal128`, and verifying that money never passes through a double
  - Integer widths versus BSON `Int32` and `Int64`: avoiding silent overflow on identity columns
  - Auto-increment keys: when to keep the value, when to switch to `ObjectId`, and how to preserve ordering guarantees
- **Temporal types and time zones**
  - `TIMESTAMP WITH TIME ZONE` to BSON dates (always UTC), and how client libraries reinterpret stored dates
  - Date-only columns that must not acquire a time component
  - Precision truncation when a source column stores microseconds
- **Strings, enums, and binary payloads**
  - `CHAR(n)` padding that must be stripped, case-insensitivity assumptions in the source collation
  - Enums mapped to strings versus numeric codes, considering readability and index size
  - `BLOB` and `TEXT` payloads: GridFS versus embedded binary versus external object storage
- **NULL semantics and constraints**
  - Three-valued logic in SQL versus missing-field behaviour in MongoDB queries
  - Translating `NOT NULL` into JSON Schema validators, and unique constraints into unique indexes with partial filters
- **Build and unit-test the transform layer**
  - Deterministic transform functions with golden-file tests on representative rows
  - A rejection queue for rows that fail validation, with a triage process so nothing is silently dropped

### Module 5: Initial Data Load Engineering

- **Choose the extraction mechanism**
  - Snapshot export with `mongoexport`-style pipelines versus native BSON tooling versus a driver-based bulk reader
  - Consistent reads: extracting from a snapshot or a read replica so the initial load sees a single point in time
- **Load at scale without melting the target cluster**
  - Unordered bulk writes, batch sizing, and backpressure when the target is a shared cluster
  - Dropping secondary indexes before the load and rebuilding them afterwards
  - Load-time tuning: write concern, journaling expectations, and why `w:1` is acceptable only when a replay path exists
- **Validate the load mechanically**
  - Source row counts per table against target document counts per collection
  - Aggregate checksums over numeric and hash columns, compared per partition
  - Sampling-based structural comparison of documents against their source rows
- **Record the load baseline for later reconciliation**
  - The exact snapshot position used, so incremental sync can resume from it without gaps or duplicates

### Module 6: Change Data Capture and Incremental Synchronization

- **Resume from the snapshot, not from "now"**
  - Capturing the source log position at snapshot time and replaying everything after it
  - Change stream resume tokens on the MongoDB side for the reverse direction
- **Pick the capture technology deliberately**
  - Log-based capture (logical replication slots, binlog readers, Debezium-style connectors) versus polling `updated_at` columns
  - Why timestamp polling silently loses deletes and clock-skewed updates
- **Make every consumer idempotent**
  - Upserts keyed by stable identifiers, with delete markers handled explicitly
  - Ordering requirements per document and how to enforce them when parallelism is needed
- **Monitor the gap between the two systems**
  - Lag measured in seconds and in events, alerted on both
  - A continuously running reconciliation job that compares a rotating sample of records
- **Exercise failure paths**
  - Replay after a connector restart, duplicate delivery, and a schema change arriving mid-stream

### Module 7: Application Code Migration

- **Replace relational access patterns at the code level**
  - Moving ORM entity relationships to repository methods that read whole documents
  - Rewriting joins as either embedded reads or `$lookup` stages, and measuring which was worth it
  - Pagination: offset-based SQL paging versus range or `_id`-based cursors, and the correctness bugs offset paging hides
- **Translate transactional boundaries**
  - Single-document atomicity replacing most multi-statement transactions
  - Multi-document transactions where they are genuinely required, with their latency cost accounted for
  - Outbox or saga patterns for cross-service consistency the database no longer provides
- **Handle concurrency and isolation differences**
  - Read concern and write concern levels chosen per operation instead of globally
  - Optimistic concurrency with version fields replacing `SELECT ... FOR UPDATE`
- **Keep a compatibility layer during the transition**
  - A repository abstraction that can serve reads from either store behind a feature flag
  - Contract tests that run against both implementations and must stay green until cutover completes

### Module 8: Validation, Reconciliation, and Cutover Engineering

- **Define equivalence, then test it**
  - Row-level, aggregate-level, and application-level equivalence, each with its own harness
  - Difference budgets: how much drift is acceptable and who signs off on it
- **Run shadow traffic**
  - Mirroring production reads to the new cluster and diffing responses, not just database state
  - Latency comparison per endpoint, with p95 and p99 treated as part of correctness
- **Rehearse the cutover**
  - A timed dry run covering the write freeze, final sync, verification, and traffic flip
  - Rollback triggers written down in advance, with thresholds rather than opinions
- **Execute the cutover runbook**
  - Freeze writes, drain the CDC queue, verify counts and checksums, flip routing, monitor the error budget
  - The first-hour checklist: error rates, latency, replication lag, and the queries most likely to regress
- **Keep the legacy system writable for the rollback window**
  - Reverse CDC or a documented point of no return, chosen before the cutover, not during it

### Module 9: Post-Migration Performance and Index Engineering

- **Rebuild indexes from observed query shapes**
  - Index design from the migrated catalogue, applying equality-sort-range ordering
  - Covered queries for the hottest read paths, and the write cost each index adds
- **Diagnose the new bottlenecks honestly**
  - The profiler and slow-query log on the migrated workload
  - Working set sizing and cache pressure, which rarely matches the relational prediction
  - Aggregation pipelines that spill to disk, and the memory limits that cause it
- **Tune the clusters, not just the queries**
  - Read preference and replica set topology for read-heavy migrated paths
  - Connection pool sizing in the driver, a frequent cause of post-migration latency spikes
- **Re-baseline everything**
  - The same benchmark suite from Module 1, run against the new cluster, with deltas documented

### Module 10: Operations, Governance, and Legacy Decommissioning

- **Operate the new system properly**
  - Backup and point-in-time recovery, tested by restoring into a scratch cluster
  - Monitoring, alerting, and the runbooks the on-call team will actually use
  - Capacity planning from the growth numbers recorded during assessment
- **Govern the data model after migration**
  - Schema validators as a quality gate, and a review process for model changes
  - Retention, archival, and deletion obligations carried over from the legacy system
- **Retire the old system without losing history**
  - Archive strategy: cold relational dump, exported files, or an analytics-only copy
  - Read-only sunset window, credential revocation, and decommission sign-off
- **Run the retrospective that feeds the next migration**
  - Which assessment assumptions held, which did not, and the reusable artifacts the team now owns

## Final Project

Migrate a production-shaped relational e-commerce schema — customers, orders, order lines, products, categories, payments, and an audit log — to MongoDB, end to end.

The deliverable includes the workload assessment and join-frequency matrix, the column-to-field mapping table, the transform layer with golden-file tests, and a fully loaded target cluster with rebuilt indexes. The learner then runs change data capture from the relational source, proves equivalence with a reconciliation harness, mirrors shadow reads, performs a timed cutover rehearsal with a documented rollback path, and finally executes the cutover, re-runs the Module 1 benchmark suite, and writes the decommissioning plan for the legacy database. Evidence is required at every gate: counts and checksums, harness output, cutover timings, and the before-and-after benchmark comparison.

## Assessment Criteria

- **Assignments**: Weekly artifacts graded on completeness and correctness — inventory sheet, mapping table, transform tests, load validation report, CDC lag dashboard, rewritten repository layer, reconciliation harness, and cutover runbook. Late artifacts block the following week's lab.
- **Data integrity**: No unexplained row or document discrepancies at any gate; rejected rows must be triaged and accounted for, never dropped silently.
- **Cutover discipline**: The rehearsal must be timed, the rollback path must be executable and demonstrated at least once, and no step may be improvised during the live cutover.
- **Performance parity**: Migrated read paths must be within an agreed latency budget of the relational baseline, with regressions explained rather than averaged away.
- **Final Project**: Graded on the strength of the evidence trail — a migration is only complete when equivalence, rollback, and post-migration performance are all demonstrated with artifacts, plus a written retrospective naming the assumptions that did not survive contact with production.

## References

- MongoDB documentation: Data modeling and schema design — https://www.mongodb.com/docs/manual/data-modeling/
- MongoDB documentation: Transactions and read/write concern — https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB documentation: Change streams and resume tokens — https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB documentation: Bulk write operations and index build behaviour — https://www.mongodb.com/docs/manual/core/bulk-write-operations/
- MongoDB documentation: Schema validation with JSON Schema — https://www.mongodb.com/docs/manual/core/schema-validation/
- Debezium documentation: MongoDB and relational connectors — https://debezium.io/documentation/
- PostgreSQL documentation: Logical replication and replication slots — https://www.postgresql.org/docs/current/logical-replication.html
- MongoDB University: free courses on data modeling and performance — https://learn.mongodb.com/

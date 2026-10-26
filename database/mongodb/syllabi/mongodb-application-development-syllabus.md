---
title: "MongoDB Application Development Syllabus"
description: "A six-module syllabus that takes application developers from document modeling to production operations on MongoDB, with hands-on labs for query patterns, indexing, aggregation, transactions, and operational runbooks."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# MongoDB Application Development Syllabus

## Overview

This six-module syllabus is written for application developers who already ship features against MongoDB and want to stop treating it as a key-value store with extra steps. Each module is built around a decision a developer actually makes during a sprint: how to shape a document, how a query will execute, which index earns its write cost, when an aggregation pipeline replaces application code, when a transaction is justified, and what to check when production slows down.

The ordering follows the natural dependency chain of the read and write paths. Modeling comes first because every later decision — index shape, pipeline stages, transaction scope — is constrained by it. Queries come next so that modeling mistakes surface immediately in `explain()` output. Indexing, aggregation, and transactions then build on the access patterns established in Module 2. The final module connects these application-level concerns to the operational signals that expose them in production.

By the end, learners can design a schema that survives a year of feature growth, read a query plan without guessing, size and justify every index they create, move heavy data shaping out of the application, use transactions only where atomicity is genuinely required, and diagnose a slow endpoint from `mongosh` in under ten minutes. Each module ships with a lab that runs against a local replica set, so change streams and transactions behave the same as in production.

## Curriculum

### Module 1: Document Modeling That Survives Production

- **Embedding versus referencing**
  - The one-to-few, one-to-many, and one-to-squillions decision framework
  - Why unbounded arrays are the most common production incident in MongoDB
  - The bucket pattern for time-series and append-heavy data
  - Duplicating fields deliberately, with a single owning service per field

- **Modeling for access patterns, not for entities**
  - Starting from the screens and endpoints instead of the ER diagram
  - Polymorphic documents, discriminator fields, and partial indexes
  - Enforcing shape with `$jsonSchema` validation and `validationAction`
  - Keeping documents under the 16 MB limit without hiding relationships

- **Schema evolution**
  - Additive fields and a document `schemaVersion` marker
  - Backfill strategies: lazy on read, batch job, or dual write
  - Reading old and new shapes in the same code path
  - When a rewrite of the collection is cheaper than permanent compatibility code

### Module 2: Query Patterns and the Read Path

- **The find contract**
  - Equality, sort, and range ordering, and why the ESR rule matters
  - Projections as a correctness and performance tool
  - `$elemMatch` versus dot notation on arrays of documents
  - Null handling: missing fields, `null` values, and `$exists` traps

- **Reading the plan**
  - `explain("executionStats")` and the `IXSCAN` versus `COLLSCAN` signal
  - The keys-examined to documents-returned ratio as a tuning target
  - `SORT` stages that spill and the indexes that remove them
  - Query planner cache, plan rejection, and forced hints

- **Consistency choices on reads**
  - `readPreference` effects on secondary lag and stale reads
  - `readConcern` levels: `local`, `majority`, `snapshot`
  - Causal consistency sessions for read-your-own-writes

### Module 3: Indexing for Application Workloads

- **Index design**
  - Compound index prefix rule and why field order is not cosmetic
  - Covering queries: which projections let the index answer alone
  - Multikey indexes on arrays and their cardinality cost
  - Unique, partial, sparse, TTL, and wildcard indexes in practice

- **Cost and safety**
  - Write amplification: measuring the cost of each additional index
  - Rolling index builds on replica sets and hidden indexes for validation
  - `$indexStats` to find indexes no query ever uses
  - Removing an index without breaking a cold code path

- **Verification lab**
  - Build a 5-million-document dataset with `mongosh`
  - Reduce a dashboard query from a collection scan to a covered index
  - Record before and after `keysExamined` figures in a report

### Module 4: Aggregation Framework

- **Pipeline mental model**
  - Documents flowing through stages, not SQL clauses being compiled
  - Pushing `$match` and `$project` to the front of the pipeline
  - `$group` accumulators and memory limits with `allowDiskUse`
  - Deterministic ordering: `$sort` before `$group` versus after

- **Joins and shaping**
  - `$lookup` with `pipeline` for filtered joins and `let` variables
  - `$unwind` with `preserveNullAndEmptyArrays` and its fan-out cost
  - `$facet` for single-pass dashboards with multiple groupings
  - `$setWindowFields` for running totals and rankings

- **Materialized views**
  - `$merge` for incremental rollups and idempotent reruns
  - `$out` versus `$merge` and their locking behavior
  - Scheduling rollups and detecting stale materializations

### Module 5: Transactions and Consistency

- **When atomicity is genuinely required**
  - Single-document atomicity covers more cases than teams expect
  - The two-document rule: funds transfer, inventory reservation, order state
  - Modeling alternatives before reaching for a session
  - The 60-second transaction lifetime and 16 MB oplog entry ceiling

- **Writing correct transaction code**
  - `session.withTransaction()` and the retry loop for `TransientTransactionError`
  - `UnknownTransactionCommitResult` handling on commit
  - `writeConcern: majority` and `readConcern: snapshot` pairing
  - Idempotency keys so a client retry does not double-apply

- **Contention and performance**
  - Write conflicts under concurrent updates to the same document
  - Lock scope, retry storms, and backoff with jitter
  - Measuring transaction overhead before and after adoption

### Module 6: Operations for Application Developers

- **Observing a live system**
  - `db.currentOp()` and `$currentOp` aggregation for long-running work
  - The database profiler and slow-query thresholds that are safe to leave on
  - `mongostat`, `mongotop`, and serverStatus counters worth alerting on
  - Correlating an application trace ID with a slow operation

- **Failure behavior the driver hides**
  - Replica set failover, retryable writes, and `retryWrites=true`
  - Connection pool sizing against server `maxIncomingConnections`
  - `serverSelectionTimeoutMS`, `socketTimeoutMS`, and failure modes
  - Backup awareness: what a restore means for IDs and timestamps

- **Shipping checklist**
  - Connection strings, credentials, and TLS in secret stores
  - Startup validation of required indexes and validators
  - A runbook entry for every alert the service can raise

## Final Project

Learners build an order-management service backed by MongoDB, starting from a blank database and ending with a deployed, observable application. The deliverables are a documented schema with validators and a migration note, a query and index report showing `explain()` output for the five hottest access patterns before and after tuning, an aggregation-based reporting endpoint using `$facet` and a `$merge` rollup, a checkout flow that uses a multi-document transaction with idempotency keys, and an operations runbook covering slow-query triage, index rollback, and restore verification. The project must run against a three-node replica set, and the learner presents one deliberately introduced performance regression along with the diagnostic path that found it.

## Assessment Criteria

- **Assignments**: Six lab assignments, one per module, each graded on whether the artifact runs against a real replica set, whether claims about performance are supported by `explain()` output, and whether error paths are handled rather than assumed.
- **Quizzes**: Short weekly quizzes on modeling trade-offs, index prefix behavior, pipeline stage ordering, and transaction retry semantics.
- **Final Project**: Graded on schema durability under a stated feature-growth scenario, evidence-based index decisions, correctness of the transaction and idempotency logic, and the usefulness of the runbook to someone who did not write the code.
- **Participation**: One peer review of another learner's schema and index report, focused on unjustified indexes and unbounded arrays.

## References

- MongoDB Manual: Data Modeling — https://www.mongodb.com/docs/manual/data-modeling/
- MongoDB Manual: Query Optimization and `explain()` — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: Indexes — https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: Aggregation Pipeline — https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB Manual: Transactions — https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Manual: Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Manual: Monitoring for Performance — https://www.mongodb.com/docs/manual/administration/monitoring/
- MongoDB University: M001 and M320 courses — https://learn.mongodb.com/
- Kleppmann, M. *Designing Data-Intensive Applications*, O'Reilly

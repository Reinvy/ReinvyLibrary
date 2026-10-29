---
title: "PostgreSQL Multi-Tenant SaaS Syllabus"
description: "A 12-week specialization on running multi-tenant SaaS on PostgreSQL — tenant isolation models, row-level security, tenant context through pooled connections, tenant-aware migrations, noisy-neighbour protection, per-tenant backup and data residency, and scaling with sharding."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# PostgreSQL Multi-Tenant SaaS Syllabus

## Overview

Almost every B2B SaaS product eventually runs the same experiment: put hundreds or thousands of paying customers into one PostgreSQL cluster and try to keep them isolated, fast, and billable without building a database per customer. The hard parts are rarely about SQL syntax. They are about decisions that are expensive to reverse — which isolation model to use, how tenant identity travels through a connection pool, how a schema change rolls out to 4,000 tenants without a maintenance window, and what happens when one customer's report saturates the shared I/O.

This 12-week specialization is for backend engineers, database engineers, and platform teams already comfortable with PostgreSQL who now own the multi-tenant layer of a product. It builds one continuous system — a project-management SaaS with organizations, members, projects, and usage-based billing — and revisits it each week as the isolation model, the migration pipeline, and the operational tooling grow around it. Isolation is treated as a spectrum rather than a binary: shared tables with row-level security, schema-per-tenant, database-per-tenant, and shard-per-tenant are all implemented, measured, and compared against the same workload so the trade-offs are observed rather than memorized.

The curriculum deliberately stays away from material covered by general PostgreSQL tracks. Query tuning, indexing internals, and replication topology are prerequisites, not topics. Every week ends with a lab that runs against a seeded ten-thousand-tenant dataset, so learners feel the difference between a design that scales on paper and one that survives contact with real tenant skew.

## Curriculum

### Week 1: The Multi-Tenancy Decision Space
- **Isolation models and what they actually cost**
  - Shared tables with a tenant discriminator column, plus row-level security
  - Schema-per-tenant: shared database, separate namespaces
  - Database-per-tenant and cluster-per-tenant
  - Shard-per-tenant and cell-based architecture
- **Choosing with evidence rather than intuition**
  - Blast radius, noisy neighbour risk, and compliance constraints per model
  - Operational cost curves: migrations, backups, connection counts
  - Model migration paths and which choices are one-way doors

### Week 2: Schema Design for Tenant Skew
- **Keys that carry the tenant everywhere**
  - Composite primary keys on `(tenant_id, id)` and why UUIDs alone are not enough
  - Composite foreign keys that make cross-tenant references impossible
  - Index design with the tenant column leading
- **Data model patterns**
  - Tenant-owned vs shared reference data
  - Soft deletion, archival tables, and per-tenant retention
  - Audit tables that record the acting tenant and user

### Week 3: Row-Level Security in Depth
- **Policy mechanics**
  - Enabling RLS and the default-deny posture
  - `USING` vs `WITH CHECK` and how they map to reads and writes
  - Policies per command, per role, and permissive vs restrictive combination
- **Making policies trustworthy**
  - Session variables versus a lookup function for tenant identity
  - Forcing RLS for table owners with `FORCE ROW LEVEL SECURITY`
  - Testing policies: adversarial queries that try to escape the tenant

### Week 4: Tenant Context Through Connection Pools
- **The pooling problem**
  - Why `SET` leaks across transaction-mode pooled connections
  - `SET LOCAL` inside a transaction, and why transaction boundaries matter
  - PgBouncer modes and what each one permits
- **Propagating identity safely in the application**
  - Per-request transaction wrappers that set tenant context once
  - Guard rails: fail-closed when the tenant is missing
  - Background jobs, migrations, and admin tools that must bypass isolation deliberately

### Week 5: Tenant-Aware Migrations at Scale
- **Shared-table migrations**
  - Expand and contract for zero-downtime column changes
  - Backfills batched by tenant to keep lock and WAL pressure bounded
  - Backward-compatible code rollout ordering
- **Schema-per-tenant migrations**
  - A migration runner that iterates tenants with checkpointing and resumability
  - Drift detection and repair for tenants that missed a release
  - Canary tenants, cohort rollout, and rollback strategy

### Week 6: Noisy Neighbour Control
- **Per-tenant resource governance**
  - Statement timeouts, `idle_in_transaction_session_timeout`, and work memory caps
  - Per-tenant query queues and concurrency limits at the pooler
  - Killing runaway sessions safely and notifying the owning team
- **Fairness under load**
  - Detecting the top talkers with `pg_stat_statements` and activity views
  - Separating heavy analytics from transactional traffic
  - Load-testing with realistic tenant size distributions rather than uniform tenants

### Week 7: Tenant Lifecycle Automation
- **Onboarding**
  - Provisioning a tenant inside a shared cluster versus creating a new database
  - Seeding reference data and defaults idempotently
  - Wiring credentials, roles, and limits at creation time
- **Offboarding and compliance requests**
  - Exporting a single tenant's complete data as portable files
  - Hard deletion with verifiable completion
  - Data residency, retention windows, and legal hold

### Week 8: Per-Tenant Backup and Recovery
- **Recovery granularity**
  - Why full-cluster restores are not an acceptable answer for one customer's mistake
  - Logical export per tenant and point-in-time extraction of a tenant's rows
  - Restoring a single tenant into a scratch database for inspection
- **Proving recovery works**
  - Scheduled restore drills and measured recovery time per tenant
  - Documented runbooks with named owners
  - Reconciliation after partial restores when the tenant has already moved on

### Week 9: Metering, Quotas, and Usage-Based Billing
- **Capturing usage in the database**
  - Event tables partitioned by time with tenant-leading indexes
  - Aggregation strategies that do not scan every event at invoice time
  - Idempotent rollups and late-arriving events
- **Enforcing limits**
  - Soft warnings versus hard blocks, and where each belongs
  - Rate and storage quotas checked without a round trip per request
  - Reconciling metered usage against invoices

### Week 10: Scaling Past a Single Primary
- **Read scaling and partitioning**
  - Routing read traffic per tenant without breaking read-your-writes
  - Declarative partitioning by tenant or by hash of tenant
  - Distinguishing hot tenants and giving them dedicated resources
- **Sharding with Citus**
  - Distributed tables, reference tables, and the distribution column
  - Co-located joins and the cost of cross-shard queries
  - Rebalancing shards and adding nodes without downtime

### Week 11: Observability and Operations for Multi-Tenant Systems
- **Tenant-dimensioned telemetry**
  - Emitting tenant identity into logs, metrics, and traces without leaking PII
  - Dashboards for per-tenant latency, error rate, and connection usage
  - Alerting on cross-tenant anomalies rather than averages
- **Operating the platform**
  - Capacity planning with skewed tenant distributions
  - Upgrades and extension changes across shared and per-tenant schemas
  - Incident response playbooks where the blast radius is a subset of customers

### Week 12: Capstone — Multi-Tenant Platform Delivery
- **Consolidating the system**
  - Running the project-management SaaS on the isolation model chosen in week 1
  - Tenant-aware migrations, quotas, metering, and per-tenant recovery in place
  - A canary tenant migrating from schema-per-tenant to shared tables, or the reverse
- **Evidence and handover**
  - Benchmark results with realistic tenant skew before and after tuning
  - Isolation test suite proving no tenant can read or write another's rows
  - Architecture write-up and operations runbook

## Final Project

Learners deliver a working multi-tenant PostgreSQL platform for a project-management SaaS. The system must support at least 500 seeded tenants with deliberately unequal data volumes, isolate them using the model argued for in week 1, and expose the operational surface a real platform team needs: tenant provisioning, tenant-aware migration execution, per-tenant usage metering with enforced quotas, single-tenant export and restore, and dashboards showing per-tenant latency and connection usage.

The deliverable includes the database schema and role design, the application-side transaction wrapper that establishes tenant context, the migration runner with resumable checkpoints, the isolation test suite, benchmark output from a skewed workload, and a runbook covering onboarding, offboarding, recovery, and incident response. A short design document must justify the isolation model against at least two alternatives, including the migration cost of changing it later.

## Assessment Criteria

- **Assignments**: Weekly labs graded on correctness of RLS policies under adversarial queries, safe tenant-context handling through a transaction-mode pooler, resumability of tenant migration runs, and the accuracy of metering rollups (individual labs plus short quizzes on isolation trade-offs and pooling behaviour).
- **Final Project**: Evaluated on isolation integrity (the test suite proves cross-tenant access is impossible through application paths), operational completeness (provisioning, migrations, quotas, metering, per-tenant recovery all work end to end), performance under tenant skew (documented per-tenant latencies rather than cluster averages), and the quality of the design document and runbook.

## References

- [PostgreSQL row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL declarative partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PgBouncer configuration and pooling modes](https://www.pgbouncer.org/config.html)
- [Citus documentation](https://docs.citusdata.com/)
- [PostgreSQL logical export with pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [AWS SaaS Factory tenancy models](https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.html)

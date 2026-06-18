---
title: "PostgreSQL Syllabus"
description: "A comprehensive 12-week curriculum covering PostgreSQL fundamentals, SQL querying, schema design, indexing, performance optimization, administration, and production deployment."
category: "database"
technology: "postgres"
difficulty: "beginner"
type: "syllabus"
locale: "en"
---

# PostgreSQL Syllabus

## Overview

This 12-week comprehensive syllabus is designed to take a learner from absolute beginner to production-ready PostgreSQL developer. The curriculum progresses systematically through SQL fundamentals, schema design, indexing strategies, query optimization, database administration, backup and recovery, high availability, and security best practices. Each week builds upon the previous, combining theoretical concepts with hands-on exercises and real-world projects. By the end of this course, you will be able to design efficient database schemas, write optimized queries, manage PostgreSQL instances in production, and troubleshoot performance issues confidently.

## Curriculum

### Week 1: Introduction to PostgreSQL
- **What is PostgreSQL?**
  - History, community, and ecosystem
  - Comparison with other relational databases
  - PostgreSQL features and capabilities overview
- **Installation and Setup**
  - Installing PostgreSQL on Linux, macOS, and Windows
  - Verifying installation with `psql --version`
  - Starting, stopping, and restarting the PostgreSQL service
- **The psql Interactive Shell**
  - Connecting to a database: `psql -U postgres -d mydb`
  - Basic meta-commands: `\l`, `\dt`, `\d`, `\du`, `\conninfo`
  - Query execution and result formatting
  - Getting help with `\h` and `\?`

### Week 2: SQL Fundamentals
- **Data Types**
  - Numeric types: `INTEGER`, `BIGINT`, `DECIMAL`, `SERIAL`
  - Character types: `VARCHAR(n)`, `TEXT`, `CHAR(n)`
  - Date/time types: `DATE`, `TIMESTAMP`, `TIMESTAMPTZ`, `INTERVAL`
  - Boolean, UUID, JSON, JSONB, and ARRAY types
- **DDL — Creating and Managing Tables**
  - `CREATE TABLE` with constraints: `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `NOT NULL`, `CHECK`
  - `ALTER TABLE` for schema modifications
  - `DROP TABLE` and `TRUNCATE`
- **DML — Basic CRUD Operations**
  - `INSERT` with single and multiple rows
  - `SELECT` with column selection, aliases, and expressions
  - `UPDATE` with conditions
  - `DELETE` with conditions

### Week 3: Advanced Querying
- **Filtering and Sorting**
  - `WHERE` clause operators: `=`, `<>`, `>`, `<`, `LIKE`, `IN`, `BETWEEN`, `IS NULL`
  - `ORDER BY` with ascending/descending and multiple columns
  - `LIMIT` and `OFFSET` for pagination
  - `DISTINCT` for unique values
- **Aggregate Functions**
  - `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`
  - `GROUP BY` for grouping data
  - `HAVING` for filtering groups
- **Basic Join Operations**
  - `INNER JOIN` and its semantics
  - `LEFT JOIN`, `RIGHT JOIN`, `FULL OUTER JOIN`
  - `CROSS JOIN` use cases
  - `NATURAL JOIN` (and why to avoid it)

### Week 4: Subqueries and Set Operations
- **Subqueries**
  - Scalar subqueries in SELECT and WHERE
  - Row subqueries
  - `EXISTS` and `NOT EXISTS`
  - Subqueries in FROM (derived tables)
  - `ANY`, `ALL`, and `SOME` operators
- **Common Table Expressions (CTEs)**
  - Basic CTE syntax with `WITH`
  - Multiple CTEs in a single query
  - Recursive CTEs for hierarchical data (org charts, tree structures)
- **Set Operations**
  - `UNION` and `UNION ALL`
  - `INTERSECT` and `EXCEPT`

### Week 5: Schema Design and Normalization
- **Database Normalization**
  - First Normal Form (1NF): atomic columns
  - Second Normal Form (2NF): no partial dependencies
  - Third Normal Form (3NF): no transitive dependencies
  - Denormalization trade-offs for read performance
- **Relationships and Constraints**
  - One-to-one, one-to-many, many-to-many relationships
  - Junction tables for many-to-many
  - `FOREIGN KEY` constraints and referential actions (`CASCADE`, `SET NULL`, `RESTRICT`)
  - `CHECK` constraints for data integrity
- **Indexes Fundamentals**
  - What is an index and why use one?
  - B-tree indexes — the default
  - Creating single-column and composite indexes
  - When indexes hurt performance (write overhead)

### Week 6: Indexing Strategies
- **Advanced Index Types**
  - `GIN` indexes for JSONB and full-text search
  - `GiST` indexes for geometric and range data
  - `BRIN` indexes for large, ordered tables
  - Partial indexes for targeted queries
  - Covering indexes with `INCLUDE` columns
- **Query Analysis with EXPLAIN**
  - Reading `EXPLAIN` output: sequential scans, index scans, bitmap scans
  - `EXPLAIN ANALYZE` for actual execution times
  - Identifying slow operations
  - Understanding node types and costs
- **Index Maintenance**
  - Bloat detection with `pg_stat_user_indexes`
  - Rebuilding indexes with `REINDEX`
  - Monitoring unused indexes

### Week 7: Advanced PostgreSQL Features
- **Views and Materialized Views**
  - Creating views for query encapsulation
  - Materialized views for precomputed results
  - `REFRESH MATERIALIZED VIEW`
- **Functions and Stored Procedures**
  - `CREATE FUNCTION` with PL/pgSQL
  - Language options: SQL, PL/pgSQL, PL/Python, PL/V8
  - Stored procedures with `CREATE PROCEDURE`
  - Exception handling with `BEGIN ... EXCEPTION ... END`
- **Triggers and Event-Driven Logic**
  - `CREATE TRIGGER` syntax
  - Trigger functions in PL/pgSQL
  - Statement-level vs row-level triggers
  - `INSTEAD OF` triggers on views

### Week 8: JSON, Full-Text Search, and Extensions
- **JSONB Operations**
  - Storing and indexing JSON data
  - JSONB operators: `->`, `->>`, `#>`, `@>`, `?`, `?|`, `?&`
  - JSONB path queries
  - Updating JSONB documents
- **Full-Text Search**
  - `tsvector` and `tsquery` data types
  - Creating search indexes with GIN
  - Ranking results with `ts_rank`
  - Stemming and dictionaries
- **Useful Extensions**
  - `pgcrypto` for hashing and encryption
  - `uuid-ossp` for UUID generation
  - `pg_trgm` for fuzzy text matching
  - `postgis` for geospatial data
  - `hstore` for key-value pairs

### Week 9: Performance Tuning
- **Server Configuration**
  - `shared_buffers`, `work_mem`, `maintenance_work_mem`
  - `effective_cache_size`, `random_page_cost`
  - `max_connections` and connection pooling
  - `wal_buffers` and checkpoint tuning
- **Query Optimization**
  - Analyzing slow queries with `pg_stat_statements`
  - `ANALYZE` and autovacuum statistics
  - `VACUUM` and table bloat management
  - Rewriting queries for better performance
- **Connection Pooling**
  - Setting up PgBouncer
  - Transaction vs session pooling modes
  - Pool sizing and configuration

### Week 10: Backup, Recovery, and Replication
- **Backup Strategies**
  - `pg_dump` for logical backups
  - `pg_dumpall` for full cluster backups
  - `pg_basebackup` for physical backups
  - Continuous archiving with WAL
- **Point-in-Time Recovery (PITR)**
  - WAL archiving configuration
  - Recovery target settings
  - Performing a restore
- **Replication**
  - Streaming replication setup
  - Synchronous vs asynchronous replication
  - Read replicas for scale-out
  - Promoting a standby

### Week 11: Security and Administration
- **Authentication Methods**
  - `pg_hba.conf` configuration
  - `md5`, `scram-sha-256`, peer, and cert authentication
  - SSL/TLS connections
- **User and Role Management**
  - `CREATE ROLE` and `CREATE USER`
  - Role inheritance and `GRANT`
  - Schema-level and table-level privileges
  - Row-level security policies
- **Auditing and Monitoring**
  - Enabling query logging
  - `pg_stat_activity` for active queries
  - `pg_stat_statements` for query performance
  - Third-party monitoring tools (pgAdmin, pgHero, Datadog)

### Week 12: Production Deployment and Capstone
- **Production Hardening**
  - Systemd service configuration
  - Kernel parameter tuning
  - Monitoring with Prometheus/Grafana
  - Backup verification routines
- **Migration Strategies**
  - Schema migrations with Sqitch or Flyway
  - Zero-downtime migration patterns
  - Testing migrations in staging
- **Capstone Project**
  - Design and implement a full database schema for an e-commerce application
  - Write complex queries with joins, aggregations, and CTEs
  - Create indexes and analyze query performance
  - Set up backup and replication
  - Demonstrate production readiness

## Final Project

Learners will design and implement a complete database backend for an **E-Commerce Platform**. The project must include:

1. **Schema Design**: A fully normalized schema covering users, products, categories, orders, payments, and reviews with appropriate constraints, foreign keys, and indexes.
2. **Advanced Queries**: At least five complex queries demonstrating joins, aggregations, CTEs, window functions, and full-text search.
3. **Performance Optimization**: EXPLAIN ANALYZE analysis identifying at least two query optimizations, with before-and-after performance comparisons.
4. **JSONB Usage**: One feature using JSONB for semi-structured data (e.g., product attributes or custom user preferences).
5. **Backup Strategy**: A documented backup plan including logical and physical backup commands, plus a point-in-time recovery procedure.
6. **Security Implementation**: Role-based access control with at least three distinct roles (admin, staff, read-only analyst).

Deliverables: SQL schema file, query examples with EXPLAIN output, backup scripts, and a brief written summary of design decisions.

## Assessment Criteria

- **Schema Quality (25%)**: Proper normalization, appropriate data types, correct constraint usage, and well-defined relationships.
- **Query Proficiency (25%)**: Correctness, efficiency, and appropriate use of advanced SQL features (CTEs, window functions, full-text search).
- **Performance Analysis (15%)**: Accurate EXPLAIN ANALYZE interpretation and meaningful optimization suggestions.
- **Administration Skills (15%)**: Working backup scripts, replication understanding, and security role setup.
- **Project Documentation (10%)**: Clear explanation of design decisions, trade-offs, and production considerations.
- **Code Quality (10%)**: Well-formatted SQL, proper naming conventions, and comments explaining complex logic.

## References

- **Official Documentation**: [PostgreSQL Documentation](https://www.postgresql.org/docs/)
  - Tutorial: [https://www.postgresql.org/docs/current/tutorial.html](https://www.postgresql.org/docs/current/tutorial.html)
  - Admin Guide: [https://www.postgresql.org/docs/current/admin.html](https://www.postgresql.org/docs/current/admin.html)
  - Performance Tuning: [https://www.postgresql.org/docs/current/performance-tips.html](https://www.postgresql.org/docs/current/performance-tips.html)
- **Books**:
  - "PostgreSQL: Up and Running" by Regina Obe and Leo Hsu
  - "The Art of PostgreSQL" by Dimitri Fontaine
  - "Mastering PostgreSQL 16" by Hans-Jürgen Schönig
- **Online Resources**:
  - [pgMustard](https://www.pgmustard.com/) — EXPLAIN analyzer
  - [PgBouncer Official Docs](https://www.pgbouncer.org/)
  - [Use the Index, Luke](https://use-the-index-luke.com/) — Indexing guide
- **Tools**:
  - pgAdmin 4 — GUI management
  - DBeaver — Cross-platform database tool
  - Sqitch — Database migration management
  - pgbench — Built-in benchmarking tool

---
title: "PostgreSQL Indexing Cheatsheet"
description: "A quick reference for PostgreSQL index types, index creation variants, maintenance, and diagnostics."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# PostgreSQL Indexing Cheatsheet

## Quick Reference Table

| Index Type | Access Method | Best For | Example Use Case |
|------------|---------------|----------|------------------|
| B-tree | `btree` (default) | Equality and range queries, sorting | `WHERE user_id = 42`, `ORDER BY created_at` |
| Hash | `hash` | Simple equality on large values | `WHERE session_id = 'abc...'` |
| GiST | `gist` | Geometric data, ranges, nearest-neighbor | `WHERE location <-> point '(1,2)'` |
| SP-GiST | `spgist` | Partitioned/recursive structures, points | Quad-tree point lookup |
| GIN | `gin` | Arrays, JSONB, full-text search | `WHERE tags @> '{red}'`, `to_tsvector(...)` |
| BRIN | `brin` | Huge tables with natural sort order | Time-series data, log tables |
| Bloom | `bloom` | Multi-column equality filters | `WHERE a = 1 AND b = 2 AND c = 3` |

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Create index | `CREATE INDEX idx_name ON table (col);` | Default B-tree index |
| Create unique index | `CREATE UNIQUE INDEX idx_name ON table (col);` | Enforces uniqueness |
| Create concurrently | `CREATE INDEX CONCURRENTLY idx_name ON table (col);` | No blocking lock on writes |
| Create partial index | `CREATE INDEX idx_name ON table (col) WHERE condition;` | Indexes only matching rows |
| Create expression index | `CREATE INDEX idx_name ON table (lower(col));` | Indexes function result |
| Create covering index | `CREATE INDEX idx_name ON table (col) INCLUDE (col2);` | Index-only scans (PG 11+) |
| Drop index | `DROP INDEX IF EXISTS idx_name;` | Removes an index |
| Rebuild index | `REINDEX INDEX idx_name;` | Rebuilds index to remove bloat |
| Rebuild table indexes | `REINDEX TABLE table_name;` | Rebuilds all indexes on a table |
| Rename index | `ALTER INDEX idx_name RENAME TO new_name;` | Renames an index |
| Cluster on index | `CLUSTER table_name USING idx_name;` | Physically reorders table by index |

## Common Commands

### Creating Basic Indexes

```sql
-- Simple B-tree index (default access method)
CREATE INDEX idx_users_email ON users (email);

-- Composite index: column order matters for query planning
CREATE INDEX idx_orders_customer_created
ON orders (customer_id, created_at DESC);

-- Unique index also serves as a constraint
CREATE UNIQUE INDEX idx_users_email_unique ON users (email);

-- Hash index for large equality-only columns
CREATE INDEX idx_sessions_token ON sessions USING hash (token);
```

### Creating Indexes Without Locking

```sql
-- CONCURRENTLY avoids blocking writes, but cannot run inside a transaction
CREATE INDEX CONCURRENTLY idx_orders_status
ON orders (status);

-- Rebuild a bloated index without blocking
REINDEX INDEX CONCURRENTLY idx_orders_status;
```

### Partial and Expression Indexes

```sql
-- Partial index: only active orders are indexed
CREATE INDEX idx_orders_active
ON orders (created_at DESC)
WHERE status = 'active';

-- Expression index: case-insensitive lookups
CREATE INDEX idx_users_email_lower
ON users (lower(email));

-- Expression index with JSONB field extraction
CREATE INDEX idx_products_price
ON products ((attributes ->> 'price'));
```

### Covering Indexes

```sql
-- INCLUDE columns live in the index but are not searchable keys;
-- enables index-only scans that never touch the heap
CREATE INDEX idx_users_email_covering
ON users (email)
INCLUDE (name, created_at);

-- Verify with an index-only scan
EXPLAIN ANALYZE
SELECT email, name FROM users WHERE email = 'alice@example.com';
```

### Index Maintenance

```bash
# Reindex a specific index
psql -c "REINDEX INDEX idx_orders_customer_created;"

# Reindex all indexes on a table concurrently
psql -c "REINDEX TABLE CONCURRENTLY orders;"

# Reindex the whole database
psql -c "REINDEX DATABASE mydb;"
```

```sql
-- Check index sizes
SELECT
    indexrelid::regclass AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Index Diagnostics

```sql
-- Find unused indexes (idx_scan = 0 after a representative workload)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- List all indexes on a table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders';

-- Find duplicate indexes (same columns, same order)
SELECT
    pg_size_pretty(sum(pg_relation_size(idx))::bigint) AS total_size,
    array_agg(idx) AS indexes
FROM (
    SELECT
        indexrelid::regclass AS idx,
        (indexrelid::regclass::text) AS idx_name,
        indkey::text AS cols
    FROM pg_index
) s
GROUP BY cols
HAVING count(*) > 1;

-- Check index bloat (high dead tuple ratio)
SELECT
    schemaname,
    tablename,
    indexname,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup::numeric / nullif(n_live_tup, 0) * 100, 2) AS dead_pct
FROM pg_stat_user_indexes
WHERE n_live_tup > 0
ORDER BY dead_pct DESC
LIMIT 10;
```

## Code Snippets

### GIN Indexes for JSONB and Full-Text Search

```sql
-- JSONB containment and key-existence queries
CREATE INDEX idx_products_attrs ON products USING gin (attributes);

SELECT * FROM products
WHERE attributes @> '{"color": "red"}';

SELECT * FROM products
WHERE attributes ? 'brand';

-- Full-text search with GIN
CREATE INDEX idx_docs_fts ON documents
USING gin (to_tsvector('english', body));

SELECT title
FROM documents
WHERE to_tsvector('english', body) @@ to_tsquery('postgres & indexing');
```

### GiST and BRIN Indexes

```sql
-- GiST for range overlap
CREATE INDEX idx_reservations_during
ON reservations USING gist (during);

SELECT *
FROM reservations
WHERE during && tsrange('2026-08-01', '2026-08-31');

-- BRIN for time-series tables (orders by natural key order)
CREATE INDEX idx_events_created_brin
ON events USING brin (created_at);

-- BRIN works best when data is physically ordered by the indexed column;
-- run CLUSTER or VACUUM to maintain ordering for large tables
```

### Expression and Partial Indexes in Practice

```sql
-- Partial unique index: enforce uniqueness only for non-deleted rows
CREATE UNIQUE INDEX idx_users_active_email
ON users (email)
WHERE deleted_at IS NULL;

-- Expression index on JSONB with operator class for sorting
CREATE INDEX idx_products_name_collation
ON products ((name COLLATE "C"));

-- Query that can use the expression index
SELECT * FROM users WHERE lower(email) = 'alice@example.com';
```

### Index-Only Scan and EXPLAIN Verification

```sql
-- Create a covering index to satisfy the query
CREATE INDEX idx_orders_customer_total
ON orders (customer_id)
INCLUDE (total_amount, status);

-- The plan should show "Index Only Scan"
EXPLAIN ANALYZE
SELECT customer_id, total_amount, status
FROM orders
WHERE customer_id = 7;

-- Force the planner to show its reasoning
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM users WHERE email = 'bob@example.com';
```

### Dropping and Rebuilding Safely

```sql
-- Before dropping, confirm the index is not used
SELECT indexname, idx_scan FROM pg_stat_user_indexes
WHERE indexname = 'idx_users_email_old';

-- Drop unused index
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_old;

-- Rebuild a bloated index concurrently in production
REINDEX INDEX CONCURRENTLY idx_orders_customer_created;
```

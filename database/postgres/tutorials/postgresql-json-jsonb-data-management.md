---
title: "PostgreSQL JSON and JSONB Data Management"
description: "A comprehensive tutorial on working with JSON and JSONB data types in PostgreSQL — from storage and querying to indexing, performance optimization, and hybrid relational-document patterns."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# PostgreSQL JSON and JSONB Data Management

## Summary

Modern applications often need the flexibility of a document store alongside the rigor of a relational database. PostgreSQL's JSON and JSONB data types give you both in a single system — you can store schemaless documents, index their contents, query deep structures with SQL, and even mix relational columns with JSON attributes in the same table. This tutorial covers the complete toolchain: choosing between JSON and JSONB, inserting and querying documents, using GIN indexes for performance, updating nested values, and applying hybrid relational-document design patterns. You will build a product catalog that demonstrates each technique in a realistic setting.

## Target Audience

- Backend developers and database architects who want to add document flexibility to PostgreSQL without introducing a separate NoSQL database.
- Developers comfortable with basic SQL (CREATE TABLE, SELECT, INSERT, UPDATE) who want to learn PostgreSQL's JSON capabilities.

## Prerequisites

- PostgreSQL 12 or later installed and running (JSONB path queries require PostgreSQL 12+; SQL/JSON `jsonpath` requires PostgreSQL 15+).
- Basic familiarity with SQL and a SQL client (psql, pgAdmin, or DBeaver).
- A sample database to follow along (all examples are self-contained).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Choose the appropriate JSON data type (JSON vs JSONB) based on use case requirements.
- Insert, query, and manipulate JSON documents using PostgreSQL's operator and function APIs.
- Create GIN indexes on JSONB columns for efficient document lookups and full-index scans.
- Update nested fields and array elements within JSONB documents without rewriting the entire document.
- Use SQL/JSON `jsonpath` expressions for pattern-matching queries against JSON structures.
- Design hybrid tables that blend normalized relational columns with flexible JSONB attributes.
- Evaluate performance trade-offs between document-oriented and relational access paths.

## Context and Motivation

Traditional relational databases require a fixed schema — every column must be declared before data is inserted. While this rigidity ensures data integrity, it creates friction when your data model evolves rapidly, when different product categories have different attributes, or when you integrate external APIs that send unpredictable payloads.

NoSQL document stores solve this problem by treating each record as a self-describing document, but they sacrifice joins, transactions, and the mature query optimizer that SQL databases provide.

PostgreSQL bridges this gap. By storing JSON documents inside ordinary tables, you get:

- **Schema flexibility** — each row can have a different JSON structure.
- **Relational power** — JSON columns coexist with indexed relational columns, foreign keys, and JOINs.
- **Query versatility** — query JSON with dedicated operators ( `->`, `->>`, `@>`, `?` ) or with standard SQL/JSON `jsonpath`.
- **Transaction safety** — all the ACID guarantees you expect from PostgreSQL.

This combination makes PostgreSQL an excellent choice for product catalogs, event sourcing, configuration stores, and any domain where data shapes shift over time.

## Core Content

### JSON vs JSONB: Choosing the Right Type

PostgreSQL offers two JSON data types. They accept the same input but differ fundamentally in storage and capability.

**JSON (textual storage):**
- Stores the input text verbatim, preserving whitespace, key order, and duplicate keys.
- Every read operation must re-parse the text, which adds overhead.
- JSON indexes are not supported directly (you need expression indexes on extracted values).
- Useful only when you must preserve the exact byte representation of the input.

**JSONB (binary storage):**
- Parses the input and stores it in a decomposed binary format.
- Eliminates whitespace, deduplicates keys (last value wins), and sorts keys alphabetically.
- Supports a rich set of operators (`@>`, `?`, `?|`, `?&`, `#-`, `||`, `->`, `->>`, `#>`, `#>>`).
- **Supports GIN indexing** — the primary reason to choose JSONB over JSON.
- Slightly slower to insert due to parsing overhead, but significantly faster to read and query.

**Rule of thumb:** Always use JSONB unless you have a specific requirement to preserve the exact text representation (e.g., cryptographic verification of a raw API payload).

```sql
-- Create a table with both columns to compare
CREATE TABLE json_demo (
    id SERIAL PRIMARY KEY,
    data_json JSON,
    data_jsonb JSONB
);

INSERT INTO json_demo (data_json, data_jsonb)
VALUES ('{"name": "Widget", "price": 9.99}'::JSON, '{"name": "Widget", "price": 9.99}'::JSONB);

-- Notice JSONB strips whitespace and reorders keys
SELECT data_json AS json_col, data_jsonb AS jsonb_col FROM json_demo;
```

### Inserting and Querying JSON Data

Inserting JSON into a JSONB column is straightforward — any valid JSON value is accepted. Querying uses a family of operators that extract or test values at a path.

**Core operators:**

```text
| Operator | Purpose                            | Returns  | Example                             |
|----------|------------------------------------|----------|-------------------------------------|
| ->       | Access field by key or array index | JSON     | data->'name'                        |
| ->>      | Access field by key or array index | Text     | data->>'name'                       |
| #>       | Access nested path                 | JSON     | data #> '{address, city}'           |
| #>>      | Access nested path                 | Text     | data #>> '{address, city}'          |
| @>       | Does the left JSONB contain right? | Boolean  | data @> '{"status": "active"}'      |
| ?        | Does the top-level key exist?      | Boolean  | data ? 'email'                      |
| ?|       | Does any of the keys exist?        | Boolean  | data ?| array['phone', 'fax']       |
| ?&       | Do all of the keys exist?          | Boolean  | data ?& array['name', 'email']      |
| ||       | Concatenate two JSONB documents    | JSONB    | data || '{"source": "web"}'         |
| -        | Remove a key from JSONB            | JSONB    | data - 'temporary'                  |
```

```sql
-- Create a product catalog table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert products with different attribute shapes
INSERT INTO products (sku, name, category, attributes) VALUES
('WIDG-001', 'Standard Widget', 'hardware',
 '{"material": "steel", "weight_kg": 1.5, "color": "red", "stock": 100, "dimensions": {"width": 10, "height": 5, "depth": 2}}'),
('WIDG-002', 'Premium Widget', 'hardware',
 '{"material": "titanium", "weight_kg": 0.8, "color": "black", "stock": 50, "certified": true, "dimensions": {"width": 10, "height": 5, "depth": 2}}'),
('DIG-001', 'Basic License', 'software',
 '{"license_type": "single-user", "version": "1.0", "platforms": ["linux", "macos"], "trial_days": 30}'),
('DIG-002', 'Enterprise License', 'software',
 '{"license_type": "unlimited", "version": "2.0", "platforms": ["linux", "macos", "windows"], "trial_days": 0, "features": {"sso": true, "audit": true, "api_access": true}}'),
('SRV-001', 'Consulting Package', 'service',
 '{"hours_included": 40, "rate_per_hour": 150, "specialties": ["deployment", "training"], "remote_only": true}');

-- Query: get all software products (category is a relational column)
SELECT name, attributes->>'license_type' AS license_type
FROM products
WHERE category = 'software';

-- Query: find products with a specific attribute value
SELECT name, attributes->>'material' AS material
FROM products
WHERE attributes @> '{"material": "titanium"}';

-- Query: find products where a key exists
SELECT name FROM products WHERE attributes ? 'certified';

-- Query: access nested values with path operator
SELECT name, attributes #>> '{dimensions, width}' AS width_cm
FROM products
WHERE attributes ? 'dimensions';
```

### JSONB Operators and Functions

PostgreSQL provides dozens of JSONB-specific functions. The most frequently used ones are listed below.

```sql
-- jsonb_each: expand top-level keys into key/value pairs
SELECT id, name, (jsonb_each(attributes)).*
FROM products
WHERE id = 1;

-- jsonb_object_keys: list all top-level keys in a JSONB document
SELECT DISTINCT jsonb_object_keys(attributes) AS attribute_key
FROM products
ORDER BY attribute_key;

-- jsonb_typeof: determine the data type of a value
SELECT name,
       jsonb_typeof(attributes->'material') AS material_type,
       jsonb_typeof(attributes->'platforms') AS platforms_type,
       jsonb_typeof(attributes->'certified') AS certified_type
FROM products WHERE id = 2;

-- jsonb_pretty: format JSONB for human readability
SELECT jsonb_pretty(attributes) FROM products WHERE id = 4;

-- jsonb_array_length: count array elements
SELECT name, jsonb_array_length(attributes->'platforms') AS platform_count
FROM products
WHERE attributes ? 'platforms';

-- jsonb_path_exists: test a jsonpath expression (PostgreSQL 12+)
SELECT name
FROM products
WHERE jsonb_path_exists(attributes, '$.platforms[*] ? (@ == "windows")');

-- jsonb_path_query: extract values matching a jsonpath expression
SELECT name, jsonb_path_query(attributes, '$.specialties[*]') AS specialty
FROM products
WHERE attributes ? 'specialties';
```

### JSONB Indexing with GIN

Without an index, any query that filters on a JSONB attribute performs a sequential scan — acceptable for small tables but disastrous at scale. PostgreSQL provides **GIN (Generalized Inverted Index)** indexes designed for JSONB.

```sql
-- Default GIN index: supports @>, ?, ?|, ?& operators
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- Check the query plan before and after the index
EXPLAIN ANALYZE
SELECT name FROM products WHERE attributes @> '{"material": "titanium"}';
```

The default GIN index handles containment (`@>`), existence (`?`, `?|`, `?&`), and equality checks on full paths. For value equality checks like `attributes->>'color' = 'red'`, you need a different approach:

```sql
-- Expression index for a specific attribute path
CREATE INDEX idx_products_color ON products ((attributes->>'color'));

-- Now this query uses the expression index
EXPLAIN ANALYZE
SELECT name FROM products WHERE attributes->>'color' = 'red';
```

**GIN index considerations:**

- GIN indexes are **larger** than B-tree indexes — expect 2–3× the size of the JSONB data itself.
- Writes to a GIN-indexed JSONB column are **slower** because each key-value pair must be inserted into the inverted index.
- For workloads that query many different attribute paths, the default JSONB GIN index is ideal. For workloads that always filter on the same 2–3 paths, expression indexes on those paths are more compact and faster.
- Use `jsonb_path_ops` operator class for a smaller, faster index when you only use `@>` queries:

```sql
-- Smaller and faster for containment-only queries
CREATE INDEX idx_products_attributes_path_ops
ON products USING GIN (attributes jsonb_path_ops);
```

### Updating and Modifying JSONB Documents

PostgreSQL treats JSONB as a value type — updating a nested field rewrites the entire column. The `jsonb_set()` function helps by providing a path-based API for targeted updates.

```sql
-- Update a single nested field (PostgreSQL 9.5+)
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{stock}',
    '75'::jsonb,
    true   -- create_if_missing
)
WHERE sku = 'WIDG-001';

-- Update a nested key inside an object
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{dimensions, width}',
    '12'::jsonb
)
WHERE sku = 'WIDG-001';

-- Append to a JSONB array
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{platforms}',
    attributes->'platforms' || '["freebsd"]'::jsonb
)
WHERE sku = 'DIG-002';

-- Remove a key from JSONB
UPDATE products
SET attributes = attributes - 'trial_days'
WHERE sku = 'DIG-002';

-- Remove a nested key
UPDATE products
SET attributes = attributes #- '{dimensions}'
WHERE sku = 'WIDG-001';

-- Add or overwrite multiple keys with concatenation
UPDATE products
SET attributes = attributes || '{"color": "blue", "weight_kg": 1.2}'::jsonb
WHERE sku = 'WIDG-001';
```

**Important:** Each UPDATE rewrites the entire JSONB value. If your documents are large (100 KB+) and you update them frequently, consider normalizing the frequently-changed fields into regular columns.

### JSON Path Expressions (SQL/JSON)

PostgreSQL 12 introduced the SQL/JSON `jsonpath` language — a powerful expression syntax for pattern matching within JSON documents. PostgreSQL 15 added `jsonb_set_lax()` and the full SQL/JSON standard functions.

```sql
-- jsonb_path_exists: test pattern without extracting
SELECT name FROM products
WHERE jsonb_path_exists(attributes, '$.features ? (@.sso == true)');

-- jsonb_path_query: extract matching elements as a set of rows
SELECT name, jsonb_path_query(attributes, '$.platforms[*]') AS platform
FROM products
WHERE attributes ? 'platforms';

-- jsonb_path_match: returns true only if the path expression evaluates to true
-- (the path must be a boolean expression)
SELECT name FROM products
WHERE jsonb_path_match(attributes,
    '$.license_type == "unlimited" && $.features.api_access == true');

-- Filter with wildcards and ranges
SELECT name, attributes->>'weight_kg' AS weight
FROM products
WHERE jsonb_path_exists(attributes,
    '$.weight_kg ? (@ >= 0.5 && @ <= 2.0)');
```

**jsonpath grammar quick reference:**

| Expression | Meaning |
|------------|---------|
| `$.key` | Access key at root |
| `$.a.b.c` | Navigate nested objects |
| `$.arr[*]` | Unwrap all array elements |
| `$.arr[0, -1]` | First and last array element |
| `$ ? (@.price > 10)` | Filter predicate |
| `$.key.type()` | Return type (string, number, boolean, array, object) |
| `$.key.double()` | Cast to double for comparison |

### Hybrid Relational-Document Patterns

The real power of PostgreSQL JSONB emerges when you combine relational columns with document attributes in the same table. This section demonstrates three common patterns.

**Pattern 1: Shared columns + flexible attributes**

Normalize fields that every record must have and are frequently queried or indexed; use JSONB for optional or category-specific attributes.

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(10,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipping info stored in JSONB for flexibility
INSERT INTO orders (customer_id, status, total_amount, metadata) VALUES
(1, 'shipped', 149.99,
 '{"shipping": {"method": "express", "tracking": "1Z999AA10123456784", "estimated_delivery": "2026-08-01"},
   "gift": true,
   "notes": "Leave at front door"}'),
(2, 'pending', 29.99,
 '{"shipping": {"method": "standard"},
   "coupon_code": "SAVE10"}');

-- Relational filter + JSONB filter combined
SELECT id, total_amount, metadata->'shipping'->>'method' AS shipping_method
FROM orders
WHERE status = 'shipped'
  AND metadata @> '{"shipping": {"method": "express"}}';
```

**Pattern 2: Event sourcing with JSONB payloads**

Store each domain event as a row, with the event body as a JSONB document. This pattern is foundational for audit logs, CQRS, and temporal queries.

```sql
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    version INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_aggregate
    ON events (aggregate_type, aggregate_id, version);

-- Reconstruct the current state of an aggregate
SELECT payload FROM events
WHERE aggregate_type = 'order' AND aggregate_id = 'a1b2c3d4-...'
ORDER BY version DESC
LIMIT 1;
```

**Pattern 3: Configuration store**

Store application configuration as documents, leveraging JSONB's ability to hold arbitrary hierarchical values while keeping the retrieval interface simple with `@>` and path queries.

```sql
CREATE TABLE config (
    id SERIAL PRIMARY KEY,
    service VARCHAR(100) UNIQUE NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'production',
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO config (service, environment, settings) VALUES
('auth-service', 'production',
 '{"jwt": {"ttl_seconds": 3600, "algorithm": "RS256"}, "rate_limit": {"requests": 100, "window_seconds": 60}, "features": {"mfa": true}}'),
('payment-service', 'production',
 '{"gateway": "stripe", "webhook_secret": "...", "retry_policy": {"max_attempts": 3, "backoff_ms": 1000}}');

-- Find all services that have MFA enabled
SELECT service, settings->'jwt'->>'algorithm' AS jwt_algo
FROM config
WHERE settings @> '{"features": {"mfa": true}}';
```

### Performance Considerations

JSONB is powerful but not free. Keep these guidelines in mind.

**When to use JSONB:**
- Sparse or polymorphic attributes that differ per row (product catalogs, user preferences).
- Rapidly evolving schemas where ALTER TABLE would be disruptive.
- Small embedded documents (under 100 KB) that are read more often than written.
- Event payloads and audit logs where each row has a unique structure.

**When to use relational columns instead:**
- Fields that appear in WHERE clauses with operators other than `@>`, `?`, or path expressions (e.g., range queries, LIKE, foreign key joins).
- Fields that require a NOT NULL constraint or a CHECK constraint.
- Fields that are updated frequently on large documents (every UPDATE rewrites the entire JSONB value).
- Data that must be aggregated with SUM, AVG, or GROUP BY across many rows — relational columns are type-safe and index-friendly.

**JSONB is not a replacement for schema design.** Thoughtful normalization still wins for performance-critical paths. Use JSONB for the flexible edges of your data model, not for the core relationships.

## Code Examples

The following self-contained script creates the product catalog table and runs all the queries demonstrated in this tutorial. You can execute it directly against any PostgreSQL 15+ instance.

```sql
-- =============================================================
-- PostgreSQL JSON/JSONB Tutorial — Complete Example Script
-- =============================================================

-- 1. Table setup
DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seed data
INSERT INTO products (sku, name, category, attributes) VALUES
('WIDG-001', 'Standard Widget', 'hardware',
 '{"material": "steel", "weight_kg": 1.5, "color": "red", "stock": 100, "dimensions": {"width": 10, "height": 5, "depth": 2}}'),
('WIDG-002', 'Premium Widget', 'hardware',
 '{"material": "titanium", "weight_kg": 0.8, "color": "black", "stock": 50, "certified": true, "dimensions": {"width": 10, "height": 5, "depth": 2}}'),
('DIG-001', 'Basic License', 'software',
 '{"license_type": "single-user", "version": "1.0", "platforms": ["linux", "macos"], "trial_days": 30}'),
('DIG-002', 'Enterprise License', 'software',
 '{"license_type": "unlimited", "version": "2.0", "platforms": ["linux", "macos", "windows"], "trial_days": 0, "features": {"sso": true, "audit": true, "api_access": true}}'),
('SRV-001', 'Consulting Package', 'service',
 '{"hours_included": 40, "rate_per_hour": 150, "specialties": ["deployment", "training"], "remote_only": true}');

-- 3. Basic JSON querying
-- 3a. Extract text value
SELECT name, attributes->>'license_type' AS license_type
FROM products
WHERE category = 'software';

-- 3b. Containment check
SELECT name, attributes->>'material' AS material
FROM products
WHERE attributes @> '{"material": "titanium"}';

-- 3c. Key existence check
SELECT name FROM products WHERE attributes ? 'certified';

-- 3d. Nested path access
SELECT name, attributes #>> '{dimensions, width}' AS width_cm
FROM products
WHERE attributes ? 'dimensions';

-- 4. Array and object functions
SELECT name, jsonb_array_length(attributes->'platforms') AS platform_count
FROM products
WHERE attributes ? 'platforms';

-- 5. GIN index
CREATE INDEX idx_products_attributes_gin ON products USING GIN (attributes);

-- 6. JSONB update
UPDATE products SET attributes = jsonb_set(
    attributes, '{stock}', '75'::jsonb, true
) WHERE sku = 'WIDG-001';

UPDATE products SET attributes = attributes || '{"color": "blue"}'::jsonb
WHERE sku = 'WIDG-001';

-- 7. JSON path queries (PostgreSQL 15+)
SELECT name FROM products
WHERE jsonb_path_exists(attributes, '$.features ? (@.sso == true)');

SELECT jsonb_path_query(attributes, '$.specialties[*]') AS specialty
FROM products WHERE attributes ? 'specialties';
```

## Key Insights

- **JSONB over JSON always:** JSONB's binary format, indexing support, and rich operator set make it the right choice for virtually all workloads. Reserve JSON for edge cases where text fidelity matters.
- **GIN indexes are your performance lever:** A JSONB column without a GIN index forces sequential scans. Create `USING GIN (attributes)` on any table that filters on JSONB attributes at query time.
- **jsonb_set() is a convenience, not a magic bullet:** Behind the scenes, every `jsonb_set()` call rewrites the entire document. For documents over 100 KB that receive frequent partial updates, extract the hot fields into regular columns.
- **Hybrid modeling is the killer feature:** The most impactful pattern is not all-JSONB tables but tables with a few relational columns for core access paths and a JSONB column for flexible attributes. This gives you referential integrity where it matters and flexibility where you need it.
- **jsonpath unlocks complex queries:** The `jsonb_path_exists()` and `jsonb_path_query()` functions let you express matching logic that would require procedural code with the operator-based API. Invest in learning `jsonpath` — it pays off for any non-trivial document structure.
- **No full-text search on JSONB values:** The `@>` operator tests containment, not substring matching. If you need to search inside JSONB string values, use PostgreSQL full-text search with `to_tsvector()` on extracted text fields or a dedicated search index.

## Next Steps

- Learn how [PostgreSQL Full-Text Search](/database/postgres/tutorials/postgresql-full-text-search-tutorial) complements JSONB for hybrid search workloads.
- Study the [PostgreSQL Performance Tuning Guide](/database/postgres/guides/postgresql-performance-tuning-guide) for deeper coverage of GIN index internals and write-optimization strategies.
- Explore the [PostgreSQL Syllabus](/database/postgres/syllabi/postgresql-syllabus) for a structured learning path.
- Practice with the [PostgreSQL Query Cheatsheet](/database/postgres/cheatsheets/postgresql-query-cheatsheet) for quick reference on JSONB operators.

## Conclusion

PostgreSQL's JSON and JSONB data types let you bridge the worlds of relational and document databases without leaving the safety and maturity of a single RDBMS. You learned how to choose between JSON and JSONB, query nested documents with operators and functions, accelerate lookups with GIN indexes, update partial documents with `jsonb_set()`, and design hybrid tables that get the best of both paradigms. The key takeaway is strategic placement — use JSONB for the flexible, polymorphic edges of your data model while keeping your core relationships in well-schemaed relational columns. This balance gives you schema flexibility where it adds value and relational rigor where it matters most.

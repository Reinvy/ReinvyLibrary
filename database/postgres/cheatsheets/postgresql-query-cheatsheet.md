---
title: "PostgreSQL Query Cheatsheet"
description: "A comprehensive quick reference for PostgreSQL SQL commands, query patterns, and administration."
category: "database"
technology: "postgres"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# PostgreSQL Query Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Connect to database | `psql -U username -d dbname` | Connect to a PostgreSQL database via CLI |
| List databases | `\l` | List all databases on the server |
| Connect to database | `\c dbname` | Switch to a different database |
| List tables | `\dt` | Show all tables in current schema |
| Describe table | `\d tablename` | Show table columns, types, and constraints |
| List schemas | `\dn` | List all schemas in the database |
| Show query history | `\s` | Display command history |
| Execute from file | `\i /path/to/file.sql` | Run SQL commands from a file |
| Export to CSV | `\copy table TO '/path/file.csv' CSV HEADER` | Export table to CSV file |
| Toggle expanded display | `\x` | Toggle between normal and expanded row display |
| Quit psql | `\q` | Exit the PostgreSQL CLI |
| Create table | `CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL);` | Create a new table with constraints |
| Insert row | `INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');` | Insert a new row into a table |
| Select all | `SELECT * FROM users;` | Retrieve all rows from a table |
| Conditional select | `SELECT * FROM users WHERE age > 18 AND active = true;` | Retrieve rows with conditions |
| Update rows | `UPDATE users SET email = 'new@example.com' WHERE id = 1;` | Update specific columns in matching rows |
| Delete rows | `DELETE FROM users WHERE id = 10;` | Remove rows matching a condition |
| Truncate table | `TRUNCATE TABLE logs;` | Remove all rows quickly, cannot be rolled back |
| Drop table | `DROP TABLE IF EXISTS temp_data;` | Delete the table structure and all data |
| Create index | `CREATE INDEX idx_email ON users (email);` | Create an index for faster queries |
| Create unique index | `CREATE UNIQUE INDEX idx_unique_email ON users (email);` | Create an index that enforces uniqueness |
| Begin transaction | `BEGIN;` | Start a new transaction block |
| Commit changes | `COMMIT;` | Save all changes made in the transaction |
| Rollback | `ROLLBACK;` | Undo all changes made since the last BEGIN |
| Create user | `CREATE USER app_user WITH PASSWORD 'secure_pass';` | Create a new database role/user |
| Grant privileges | `GRANT SELECT, INSERT ON users TO app_user;` | Grant specific permissions to a user |
| Show version | `SELECT version();` | Display PostgreSQL version information |
| Explain query plan | `EXPLAIN ANALYZE SELECT * FROM users WHERE email LIKE '%@example.com';` | Show execution plan with timings |
| Terminate connection | `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'mydb';` | Kill a specific database connection |
| Show active queries | `SELECT * FROM pg_stat_activity WHERE state = 'active';` | List currently running queries |
| Analyze tables | `ANALYZE;` | Update statistics for the query planner |

## Common Commands

### Database Administration

```bash
# Create a new database
createdb my_database

# Drop a database (cannot be undone)
dropdb my_database

# Create a database with specific encoding
createdb -E UTF8 -T template0 my_database

# Backup a database to a file
pg_dump my_database > backup.sql

# Restore a database from a backup
psql my_database < backup.sql

# Backup in custom compressed format
pg_dump -Fc my_database > backup.dump

# Restore from custom format
pg_restore -d my_database backup.dump

# Backup all databases (cluster-wide)
pg_dumpall > full_backup.sql

# Check database size
psql -c "SELECT pg_size_pretty(pg_database_size('my_database'));"

# Check table size
psql -c "SELECT pg_size_pretty(pg_total_relation_size('users'));"
```

### User and Permission Management

```bash
# Create a role with login privileges
psql -c "CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_pass';"

# Create a superuser role
psql -c "CREATE ROLE admin_user WITH SUPERUSER LOGIN PASSWORD 'admin_pass';"

# Grant all privileges on a database
psql -c "GRANT ALL PRIVILEGES ON DATABASE my_database TO app_user;"

# Revoke privileges
psql -c "REVOKE ALL PRIVILEGES ON TABLE users FROM app_user;"

# Alter user password
psql -c "ALTER USER app_user WITH PASSWORD 'new_password';"

# List all users
psql -c "\du"
```

### Monitoring and Diagnostics

```bash
# Check connection count
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Find long-running queries
psql -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;"

# Show table size ranking
psql -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;"

# Check if a table is bloated
psql -c "SELECT schemaname, tablename, n_dead_tup, n_live_tup, round(n_dead_tup::float / n_live_tup * 100, 2) AS dead_pct FROM pg_stat_user_tables WHERE n_live_tup > 0 ORDER BY dead_pct DESC;"

# List unused indexes
psql -c "SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes WHERE idx_scan = 0;"

# Show current vacuum progress
psql -c "SELECT datname, phase, heap_blks_total, heap_blks_scanned, heap_blks_vacuumed FROM pg_stat_progress_vacuum;"
```

## Code Snippets

### SELECT Query Patterns

```sql
-- Basic SELECT with column aliases
SELECT
    first_name || ' ' || last_name AS full_name,
    email,
    EXTRACT(YEAR FROM created_at) AS signup_year
FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;

-- Filtering with multiple conditions
SELECT *
FROM orders
WHERE (status IN ('pending', 'processing'))
  AND total_amount > 100.00
  AND created_at >= '2024-01-01'
  AND created_at < '2025-01-01';

-- LIKE and pattern matching
SELECT *
FROM products
WHERE name ILIKE '%wireless%'    -- case-insensitive LIKE
   OR sku ~ '^PRD-[0-9]{4}$';    -- POSIX regex match

-- DISTINCT ON to get one row per group
SELECT DISTINCT ON (customer_id)
    customer_id,
    order_id,
    total_amount,
    created_at
FROM orders
ORDER BY customer_id, created_at DESC;
```

### JOIN Operations

```sql
-- INNER JOIN with table aliases
SELECT
    u.name,
    u.email,
    o.order_date,
    o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed';

-- LEFT JOIN with NULL check for missing records
SELECT
    c.name AS category,
    p.name AS product
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
WHERE p.id IS NULL;  -- categories with no products

-- Self-join: employees and their managers
SELECT
    e.name AS employee,
    m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;

-- FULL OUTER JOIN with COALESCE
SELECT
    COALESCE(u.name, 'Deleted User') AS user_name,
    o.id AS order_id
FROM users u
FULL OUTER JOIN orders o ON u.id = o.user_id;

-- LATERAL JOIN: computed columns per row
SELECT
    u.name,
    recent.order_id,
    recent.total
FROM users u
LEFT JOIN LATERAL (
    SELECT order_id, total
    FROM orders
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 3
) recent ON true;
```

### Aggregation and Window Functions

```sql
-- GROUP BY with HAVING
SELECT
    category_id,
    COUNT(*) AS product_count,
    ROUND(AVG(price), 2) AS avg_price,
    MAX(price) AS max_price
FROM products
GROUP BY category_id
HAVING COUNT(*) > 5
ORDER BY product_count DESC;

-- Window function: running total
SELECT
    order_date,
    total,
    SUM(total) OVER (ORDER BY order_date) AS running_total
FROM orders
WHERE status = 'completed';

-- Window function: ranking within partition
SELECT
    department,
    employee_name,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rank
FROM employees;

-- Window function: moving average
SELECT
    date,
    revenue,
    AVG(revenue) OVER (
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS seven_day_avg
FROM daily_revenue;

-- GROUPING SETS for multi-level totals
SELECT
    COALESCE(department, 'All') AS department,
    COALESCE(role, 'All') AS role,
    COUNT(*) AS headcount
FROM employees
GROUP BY GROUPING SETS (
    (department, role),
    (department),
    ()
);
```

### Common Table Expressions (CTEs)

```sql
-- Simple CTE for readability
WITH active_users AS (
    SELECT id, name, email
    FROM users
    WHERE status = 'active' AND last_login > CURRENT_DATE - INTERVAL '30 days'
)
SELECT a.name, COUNT(o.id) AS recent_orders
FROM active_users a
LEFT JOIN orders o ON o.user_id = a.id AND o.created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.id, a.name
ORDER BY recent_orders DESC;

-- Recursive CTE: organizational hierarchy
WITH RECURSIVE org_tree AS (
    -- Anchor: top-level managers
    SELECT id, name, manager_id, 1 AS level, name::TEXT AS path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive: direct reports
    SELECT
        e.id,
        e.name,
        e.manager_id,
        ot.level + 1,
        ot.path || ' -> ' || e.name
    FROM employees e
    INNER JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT * FROM org_tree
ORDER BY path;

-- CTE with data modification
WITH deleted AS (
    DELETE FROM sessions
    WHERE expires_at < NOW()
    RETURNING user_id, session_data
)
INSERT INTO session_audit (user_id, session_data, archived_at)
SELECT user_id, session_data, NOW() FROM deleted;
```

### JSON and JSONB Operations

```sql
-- Create table with JSONB column
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert JSONB data
INSERT INTO events (event_type, payload)
VALUES ('page_view', '{"page": "/home", "referrer": "google.com", "duration_ms": 3500}');

-- Query JSONB fields
SELECT
    id,
    payload->>'page' AS page,
    payload->>'referrer' AS referrer,
    (payload->>'duration_ms')::INT AS duration_ms
FROM events
WHERE payload @> '{"page": "/home"}'            -- contains clause
   OR payload ? 'referrer';                       -- key exists

-- Create a GIN index for JSONB queries
CREATE INDEX idx_events_payload ON events USING GIN (payload);

-- Update specific JSONB key
UPDATE events
SET payload = jsonb_set(payload, '{duration_ms}', '"4200"')
WHERE id = 1;

-- Aggregate JSONB objects
SELECT
    event_type,
    jsonb_agg(payload ORDER BY created_at DESC) AS recent_payloads
FROM events
GROUP BY event_type;
```

### Date and Time Functions

```sql
-- Current date/time
SELECT
    NOW() AS current_timestamp,
    CURRENT_DATE AS today,
    CURRENT_TIME AS current_time,
    LOCALTIMESTAMP AS local_tz_time;

-- Date arithmetic
SELECT
    NOW() + INTERVAL '1 day' AS tomorrow,
    NOW() - INTERVAL '7 days' AS one_week_ago,
    NOW() + INTERVAL '2 hours' AS in_two_hours,
    DATE_TRUNC('month', NOW()) AS start_of_month;

-- Extract date parts
SELECT
    EXTRACT(YEAR FROM created_at) AS year,
    EXTRACT(MONTH FROM created_at) AS month,
    EXTRACT(DOW FROM created_at) AS day_of_week,     -- 0=Sunday
    EXTRACT(EPOCH FROM created_at) AS unix_timestamp
FROM orders;

-- Age calculation
SELECT
    name,
    birth_date,
    AGE(birth_date) AS age_interval,
    EXTRACT(YEAR FROM AGE(birth_date)) AS age_years
FROM users;

-- Generate a date series
SELECT generate_series(
    '2025-01-01'::DATE,
    '2025-12-31'::DATE,
    '1 day'::INTERVAL
)::DATE AS date;
```

### Array Operations

```sql
-- Create table with array column
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    ratings INTEGER[]
);

-- Insert arrays
INSERT INTO articles (title, tags, ratings)
VALUES ('PostgreSQL Tips', ARRAY['database', 'sql', 'performance'], ARRAY[4, 5, 5]);

-- Query array elements
SELECT
    title,
    tags[1] AS first_tag,                     -- 1-based indexing
    array_length(tags, 1) AS tag_count,
    ratings[1:2] AS first_two_ratings
FROM articles;

-- Array containment and overlap
SELECT title
FROM articles
WHERE tags @> ARRAY['database']               -- contains 'database'
   OR tags && ARRAY['sql', 'nosql'];            -- overlaps with any

-- Unnest array to rows
SELECT title, unnest(tags) AS tag
FROM articles;

-- Create GIN index for array queries
CREATE INDEX idx_articles_tags ON articles USING GIN (tags);
```

### Full-Text Search

```sql
-- Create table with tsvector column
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    search_vector TSVECTOR
);

-- Populate tsvector column
UPDATE documents
SET search_vector = to_tsvector('english', title || ' ' || body);

-- Create GIN index on tsvector
CREATE INDEX idx_documents_search ON documents USING GIN (search_vector);

-- Automatically maintain tsvector with a trigger
CREATE FUNCTION documents_search_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', NEW.title || ' ' || NEW.body);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_documents_search
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION documents_search_update();

-- Full-text search query
SELECT
    title,
    ts_rank(search_vector, query) AS rank
FROM documents, to_tsquery('english', 'postgresql & (performance | optimization)') AS query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;

-- Highlight matched terms
SELECT
    title,
    ts_headline('english', body, query, 'MaxWords=50, MinWords=20')
FROM documents, to_tsquery('english', 'performance') AS query
WHERE search_vector @@ query;
```

### Conditional Expressions and Control Flow

```sql
-- CASE expression for value mapping
SELECT
    name,
    CASE status
        WHEN 'active' THEN 'Active'
        WHEN 'inactive' THEN 'Inactive'
        WHEN 'banned' THEN 'Suspended'
        ELSE 'Unknown'
    END AS status_label,
    CASE
        WHEN total_spent > 10000 THEN 'VIP'
        WHEN total_spent > 1000 THEN 'Premium'
        WHEN total_spent > 0 THEN 'Standard'
        ELSE 'New'
    END AS customer_tier
FROM users;

-- COALESCE: first non-null value
SELECT
    COALESCE(preferred_name, full_name, 'Anonymous') AS display_name
FROM users;

-- NULLIF: avoid division by zero
SELECT
    product_name,
    total_sales,
    NULLIF(total_returns, 0) AS returns,
    ROUND(total_sales::NUMERIC / NULLIF(total_returns, 0), 2) AS return_rate
FROM sales_summary;

-- GREATEST/LEAST: find min/max across columns
SELECT
    GREATEST(quiz_score, midterm_score, final_score) AS best_score,
    LEAST(quiz_score, midterm_score, final_score) AS worst_score
FROM student_grades;

-- FILTER clause for conditional aggregation
SELECT
    COUNT(*) AS total_orders,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
    AVG(total) FILTER (WHERE status = 'completed') AS avg_completed_value
FROM orders;
```

### Query Performance Optimization

```sql
-- EXPLAIN ANALYZE: understand query execution
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 20;

-- Partial index: index only active users
CREATE INDEX idx_users_active_email ON users (email)
WHERE status = 'active';

-- Covering index: include columns to avoid heap lookups
CREATE INDEX idx_orders_user_date_covering
    ON orders (user_id, created_at DESC)
    INCLUDE (total, status);

-- Concurrent index creation (non-blocking)
CREATE INDEX CONCURRENTLY idx_orders_created ON orders (created_at);

-- Reindex without blocking writes
REINDEX INDEX CONCURRENTLY idx_users_email;

-- Update table statistics
ANALYZE users;
ANALYZE orders;

-- Set configuration for query tuner
SET default_statistics_target = 1000;
```

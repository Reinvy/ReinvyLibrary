---
title: "PostgreSQL CTEs and Recursive Queries Tutorial"
description: "Learn how WITH clauses work in PostgreSQL and how recursive CTEs traverse trees, detect cycles, and roll up hierarchy totals with runnable SQL."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# PostgreSQL CTEs and Recursive Queries Tutorial

## Summary

A common table expression (CTE) names a subquery and makes it reusable inside one statement; a recursive CTE may refer to itself, which turns PostgreSQL into a graph walker over trees. This tutorial covers plain `WITH` clauses, then builds recursive queries for an org chart, adds cycle protection, and finishes with subtree payroll rollups.

## Target Audience

- Backend and data engineers writing analytical SQL against PostgreSQL.
- Developers who currently solve hierarchy problems with recursive application code.
- Expected developer level: **Intermediate** (comfortable with joins, aggregates, and window functions).

## Prerequisites

- PostgreSQL 12 or newer (14+ for the `CYCLE` and `SEARCH` clauses), with `psql` connected to a scratch database where you may create tables.
- Working knowledge of `SELECT`, `JOIN`, `GROUP BY`, and subqueries.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Write `WITH` clauses and chain several CTEs into one readable statement.
- Decide when `MATERIALIZED` should stop the planner from inlining a CTE.
- Structure a recursive CTE as an anchor term plus a recursive term joined by `UNION ALL`.
- Traverse a hierarchy downward and upward while tracking depth.
- Detect cycles with a visited-path array or the built-in `CYCLE` clause.

## Context and Motivation

Hierarchies are everywhere: reporting lines, product categories, bill-of-materials, comment threads, folder trees. Querying one level at a time from application code costs a round trip per level and needs an arbitrary loop guard; a fixed chain of self-joins silently caps the depth and slows down with every level. A recursive CTE expresses the whole traversal as one statement. PostgreSQL evaluates it with a working table — seed rows first, then repeatedly join the previous result against the source until nothing new appears — so there is one plan, one round trip, and the intermediate rows stay available for filtering, aggregation, and ordering.

## Core Content

### Anatomy and Chaining

`WITH name AS (SELECT ...) SELECT ...` defines a named result set that lives only for the duration of the statement. It is not a temporary table: it has no statistics, cannot be indexed, and disappears afterwards. Its value is readability and reuse — one definition, several references. A CTE may reference any CTE defined before it, so a pipeline reads top to bottom: filter, then aggregate, then rank.

### Materialization

Since PostgreSQL 12, a CTE referenced exactly once is inlined into the outer query, so `WITH` is no longer an optimization fence. Add `MATERIALIZED` to force a single evaluation of expensive or volatile work, or `NOT MATERIALIZED` to push predicates into the CTE body.

### Recursive Structure

`WITH RECURSIVE` covers both kinds: the anchor term produces the starting rows, `UNION ALL` combines it with the recursive term, and the recursive term joins the CTE back to the base table. Evaluation repeats until that term returns zero rows. Prefer `UNION ALL` over `UNION`; deduplication sorts every level and discards legitimate rows when a node has several parents.

### Traversal Direction and Depth

Walk downward by seeding the roots (`manager_id IS NULL`) and joining children on `child.manager_id = parent.id`. Walk upward from a leaf by seeding that node and joining parents on `parent.id = node.manager_id`. Keep an explicit `depth` column so you can indent output, order the tree, and add a hard stop for malformed data.

### Cycle Detection

A cycle makes the recursive term generate rows forever. PostgreSQL 14 offers `CYCLE id SET is_cycle USING path`, which tracks visited values and flags repeats. On older versions, carry an array of visited ids and filter with `NOT c.id = ANY(visited)` so the row that would close the loop is never produced.

## Code Examples

Create the sample hierarchy once, then run every example against it:

```sql
-- schema and seed data used by every example below
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    id integer PRIMARY KEY,
    name text NOT NULL,
    manager_id integer REFERENCES employees(id),
    department text NOT NULL,
    salary numeric(10, 2) NOT NULL
);

INSERT INTO employees (id, name, manager_id, department, salary) VALUES
    (1, 'Rina', NULL, 'Executive', 24000),
    (2, 'Budi', 1, 'Engineering', 15000),
    (3, 'Sari', 1, 'Sales', 14000),
    (4, 'Agus', 2, 'Engineering', 11000),
    (5, 'Dewi', 2, 'Engineering', 10500),
    (6, 'Tono', 3, 'Sales', 9000),
    (7, 'Lestari', 4, 'Engineering', 8500);
```

A chained pipeline: aggregate first, then rank the aggregate:

```sql
-- Chain: each CTE consumes the one above it
WITH payroll AS (
    SELECT department, sum(salary) AS total_salary FROM employees GROUP BY department
),
ranked AS (
    SELECT *, rank() OVER (ORDER BY total_salary DESC) AS spend_rank FROM payroll
)
SELECT spend_rank, department, total_salary FROM ranked ORDER BY spend_rank;
```

Recursive traversal downward, with depth and a readable path:

```sql
WITH RECURSIVE org AS (
    SELECT id, name, manager_id, 1 AS depth, name::text AS path
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.manager_id, o.depth + 1, o.path || ' > ' || e.name
    FROM employees e JOIN org o ON e.manager_id = o.id
    WHERE o.depth < 10          -- hard stop for malformed data
)
SELECT depth, repeat('  ', depth - 1) || name AS tree FROM org ORDER BY path;
```

Cycle-safe traversal with the built-in clause (PostgreSQL 14+) over a `categories(id, parent_id)` table, and the portable array variant:

```sql
-- CYCLE keeps the walk finite even when an edge points back up the tree
WITH RECURSIVE parts AS (
    SELECT id, parent_id, 1 AS depth FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.parent_id, p.depth + 1
    FROM categories c JOIN parts p ON c.parent_id = p.id
) CYCLE id SET is_cycle USING path
SELECT id, depth, is_cycle FROM parts ORDER BY path;

-- Works on every supported version: never revisit a node
WITH RECURSIVE walk AS (
    SELECT id, parent_id, ARRAY[id] AS visited FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.parent_id, w.visited || c.id
    FROM categories c JOIN walk w ON c.parent_id = w.id
    WHERE NOT c.id = ANY(w.visited)
)
SELECT id, parent_id, visited FROM walk;
```

Subtree rollups — every node's total payroll, without a self-join per level:

```sql
WITH RECURSIVE subtree AS (
    SELECT id AS root_id, id, salary FROM employees
    UNION ALL
    SELECT s.root_id, e.id, e.salary
    FROM employees e JOIN subtree s ON e.manager_id = s.id
)
SELECT e.name, count(*) - 1 AS reports, sum(s.salary) AS subtree_payroll
FROM subtree s JOIN employees e ON e.id = s.root_id
GROUP BY e.name ORDER BY subtree_payroll DESC;
```

## Key Insights

- Use `UNION ALL` in the recursive term; `UNION` adds a sort at every level and drops rows that appear twice by design.
- Always include a depth guard (`WHERE o.depth < n`). One bad edge otherwise becomes an unbounded query that eats memory and a connection slot.
- Order the result by the accumulated path string, not by `depth` alone, or the tree flattens into level order.
- Recursive CTEs are iterative, not free: each level scans the source unless the parent column (`manager_id`, `parent_id`) is indexed.
- The recursive term cannot contain aggregates or `DISTINCT`, and cannot reference the CTE inside a subquery — aggregate in an outer query instead.
- `CYCLE` requires PostgreSQL 14; keep the visited array narrow (ids, not whole rows) if you support older versions.

## Next Steps

- Replace hand-built path columns with `SEARCH DEPTH FIRST BY id SET ordercol` or `SEARCH BREADTH FIRST`.
- Combine recursive CTEs with window functions for per-level running totals.
- Consider closure tables or `ltree` when hierarchy reads heavily outnumber writes.

## Conclusion

You can now express hierarchies as one statement instead of a loop in application code. You built plain and chained CTEs, moved to recursive traversal with depth tracking, guarded the walk against cycles two ways, and produced subtree aggregates without a single self-join.

---
title: "PostgreSQL Window Functions Tutorial"
description: "Deep-dive SQL tutorial on PostgreSQL window functions: the OVER clause, PARTITION BY, ROW_NUMBER/RANK/DENSE_RANK, LAG/LEAD, aggregate windows, and ROWS BETWEEN framing, with realistic sales analytics examples."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# PostgreSQL Window Functions Tutorial

## Summary

Window functions compute a value across a set of rows related to the current row without collapsing those rows into a single output row. This tutorial explains the `OVER` clause, `PARTITION BY`, ranking functions, `LAG`/`LEAD`, aggregate functions used as windows, and `ROWS BETWEEN` frame control, all applied to a realistic sales dataset. By the end you will write running totals, moving averages, per-salesperson rankings, day-over-day comparisons, and top-per-group queries in plain SQL.

## Target Audience

- SQL developers and backend engineers who write analytical or reporting queries.
- Expected developer level: **Advanced** (comfortable with `GROUP BY`, joins, and subqueries).

## Prerequisites

- A running PostgreSQL instance (11+ recommended; `ROWS`/`RANGE` framing works everywhere, `GROUPS` needs 11+).
- The `psql` client, or any SQL editor connected to a scratch database.
- Solid understanding of `SELECT`, `WHERE`, `GROUP BY`, and `ORDER BY`.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain how `OVER` defines a window of rows for each current row.
- Partition rows with `PARTITION BY` and order them with `ORDER BY` inside `OVER`.
- Rank rows with `ROW_NUMBER()`, `RANK()`, and `DENSE_RANK()` and know when each fits.
- Compare a row to its neighbors with `LAG()` and `LEAD()`.
- Use aggregate functions such as `SUM` and `AVG` as window functions.
- Control the frame precisely with `ROWS BETWEEN` and default-frame caveats.

## Context and Motivation

`GROUP BY` answers "how much per group" but destroys the detail rows, and self-joins for rankings or running totals produce slow, unreadable SQL. Real reporting needs both views at once: every invoice row AND its cumulative total, each salesperson ranked inside their region without losing their row, today's revenue next to yesterday's.

Window functions solve all of this in a single pass over the data. Each row keeps its identity while the window function evaluates over a window — the whole set, a partition, or a moving frame — relative to that row. This is the engine behind running balances, moving averages, leaderboards, cohort retention, session numbers, and "top N per group" reports.

## Core Content

### The OVER Clause

A window function call is `function(args) OVER (window_specification)`. The window specification is what makes it a window function: remove `OVER` from an aggregate and you get the ordinary `GROUP BY` behavior. Inside the specification you can define a partition, a sort order, and a frame.

### PARTITION BY

`PARTITION BY` splits the result set into independent groups, like `GROUP BY` but without collapsing rows. The window function restarts for each partition. Without `PARTITION BY`, the whole result set is a single partition.

### Ranking Functions

- `ROW_NUMBER()`: unique sequential number per row in the window order.
- `RANK()`: same value for tied rows, with gaps (1, 1, 3).
- `DENSE_RANK()`: same value for tied rows, no gaps (1, 1, 2).

### LAG and LEAD

`LAG(col, offset, default)` accesses a row *before* the current row in the window order; `LEAD` accesses a row *after* it. Both return `NULL` when no such row exists unless you supply a default value.

### Aggregate Functions as Windows

`SUM`, `AVG`, `COUNT`, `MIN`, and `MAX` can all be used with `OVER`. With `ORDER BY` in the window, `SUM` becomes a running total; without it, the window is the whole partition and every row repeats the same value.

### Frames: ROWS BETWEEN

The frame decides exactly which rows are included in the computation. Syntax: `ROWS BETWEEN <start> AND <end>` with bounds such as `UNBOUNDED PRECEDING`, `2 PRECEDING`, `CURRENT ROW`, `1 FOLLOWING`, and `UNBOUNDED FOLLOWING`. Critical default: when `ORDER BY` is present, the frame defaults to `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`.

## Code Examples

All examples run against a small sales table — copy this block into `psql` to follow along:

```sql
-- sales.sql — setup for every example in this tutorial
DROP TABLE IF EXISTS sales;

CREATE TABLE sales (
    id          SERIAL PRIMARY KEY,
    region      TEXT          NOT NULL,
    salesperson TEXT          NOT NULL,
    amount      NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    sold_on     DATE          NOT NULL
);

INSERT INTO sales (region, salesperson, amount, sold_on) VALUES
    ('Jakarta', 'Sari',  120.00, '2026-09-01'),
    ('Jakarta', 'Sari',   95.50, '2026-09-02'),
    ('Jakarta', 'Budi',  210.25, '2026-09-02'),
    ('Jakarta', 'Sari',   88.00, '2026-09-05'),
    ('Bandung', 'Dewi',  180.00, '2026-09-01'),
    ('Bandung', 'Dewi',   60.00, '2026-09-03'),
    ('Bandung', 'Agus',  340.75, '2026-09-03'),
    ('Bandung', 'Agus',  150.00, '2026-09-06');
```

A running total with an aggregate window:

```sql
SELECT
    sold_on,
    amount,
    SUM(amount) OVER (ORDER BY sold_on) AS running_total
FROM sales
ORDER BY sold_on;
```

Ranking each salesperson's amounts inside their own partition:

```sql
SELECT
    salesperson,
    amount,
    ROW_NUMBER() OVER (PARTITION BY salesperson ORDER BY amount DESC) AS row_num,
    RANK()       OVER (PARTITION BY salesperson ORDER BY amount DESC) AS rank_pos,
    DENSE_RANK() OVER (PARTITION BY salesperson ORDER BY amount DESC) AS dense_pos
FROM sales
ORDER BY salesperson, amount DESC;
```

Sari's two rows get `row_num` 1 and 2 and the same `rank_pos`; ties expose the difference between `RANK` (leaves gaps) and `DENSE_RANK` (does not) — add a duplicate amount and re-run to see it.

Day-over-day comparison with `LAG`:

```sql
SELECT
    sold_on,
    amount,
    LAG(amount) OVER (ORDER BY sold_on) AS prev_day,
    amount - COALESCE(LAG(amount) OVER (ORDER BY sold_on), 0) AS delta_from_prev
FROM sales
ORDER BY sold_on;
```

`COALESCE` turns the `NULL` produced on the first row into `0` so the delta stays numeric.

A three-day moving average with an explicit frame:

```sql
SELECT
    sold_on,
    amount,
    AVG(amount) OVER (
        ORDER BY sold_on
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS moving_avg_3
FROM sales
ORDER BY sold_on;
```

Row 1 averages only its own value, row 2 averages rows 1–2, and from row 3 onward exactly three rows are in the frame.

Top salesperson per region — a window in a subquery, because `WHERE` cannot reference window results:

```sql
SELECT region, salesperson, amount
FROM (
    SELECT
        region,
        salesperson,
        amount,
        ROW_NUMBER() OVER (PARTITION BY region ORDER BY amount DESC) AS rn
    FROM sales
) AS ranked
WHERE ranked.rn = 1;
```

Switch `ROW_NUMBER()` to `RANK()` if you want every tied top seller included.

Region share against the grand total — an aggregate over an aggregate:

```sql
SELECT
    region,
    SUM(amount) AS region_total,
    ROUND(
        100.0 * SUM(amount) / SUM(SUM(amount)) OVER (),
        2
    ) AS share_pct
FROM sales
GROUP BY region;
```

The inner `SUM(amount)` is the ordinary grouped aggregate; `SUM(...) OVER ()` totals those grouped values across the whole result set.

## Key Insights

- Window functions run after `WHERE`, `GROUP BY`, and `HAVING` but before `ORDER BY` and `LIMIT`. You cannot reference a window result in `WHERE` — wrap it in a subquery or CTE.
- With `ORDER BY` inside `OVER`, the default frame is `RANGE UNBOUNDED PRECEDING TO CURRENT ROW`; duplicate order keys then include *all* peers in the running total. Prefer an explicit `ROWS` frame for deterministic results.
- Each `OVER` clause is an independent pass — two calls with the same specification run twice. Factor it out: `WINDOW w AS (PARTITION BY region ORDER BY amount DESC)` and then `ROW_NUMBER() OVER w`.
- `LAG`/`LEAD` return `NULL` past the edges; pass a default argument or wrap in `COALESCE`. `IGNORE NULLS` for `LAG`/`LEAD` requires PostgreSQL 14+.
- Window evaluation is `O(n log n)` in the partition/order keys; an index on `(partition_col, order_col)` keeps analytical queries fast on large tables.

## Next Steps

- Explore `NTILE()`, `FIRST_VALUE()`/`LAST_VALUE()`, and the `GROUPS` frame mode plus `EXCLUDE` options used for percentiles and quartiles.
- Deepen PostgreSQL analytics in the [advanced PostgreSQL syllabus](../syllabi/advanced-postgresql-syllabus.md).
- Compare window functions with their classic alternatives — correlated subqueries and `LATERAL` joins — in the [PostgreSQL query cheat sheet](../cheatsheets/postgresql-query-cheatsheet.md).

## Conclusion

You can now express running totals, moving averages, rankings, neighbor comparisons, and top-per-group reports as single SQL statements. Window functions keep detail rows intact where `GROUP BY` collapses them, and the `OVER` clause — with `PARTITION BY`, window `ORDER BY`, and `ROWS` frames — gives you precise control over the rows each computation sees. Apply these patterns to balances, leaderboards, and time-series analytics, and reach for `EXPLAIN ANALYZE` to confirm the window pass is using your indexes.

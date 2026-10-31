---
title: "Go Database Access and Connection Pooling Guide"
description: "Production patterns for Go data layers: sizing database/sql pools, enforcing context deadlines, transaction discipline, retry classification, pool observability, and schema migrations."
category: "backend"
technology: "golang"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Go Database Access and Connection Pooling Guide

## Introduction

Most Go services do not fail because the business logic is wrong. They fail because the data layer was written as if a database call were a local function call: a `*sql.DB` created per request, a query executed without a deadline, a transaction left open while a third-party HTTP call runs inside it, and a pool whose limits were left at `0` (unbounded) until the database ran out of connection slots at 3 a.m.

This guide covers the operational discipline that keeps a Go data layer predictable under load. The focus is not SQL syntax — it is the boundary between the process and the database: how many connections exist, how long they live, how long a query is allowed to run, what happens when the database pushes back, and how you find out before your users do.

```text
HTTP handler                      request-scoped context (deadline)
     │
     ▼
service layer ──── business logic, no SQL
     │
     ▼
repository interface ──── WithTx(ctx) / Create(ctx) / ByID(ctx)
     │
     ▼
*sql.DB or pgxpool ──── one shared pool per process, bounded
     │
     ▼
PostgreSQL ──── statement_timeout, lock_timeout, max_connections
```

The mental model to keep: **`*sql.DB` is not a connection, it is a pool manager.** Every method it exposes acquires a connection, uses it, and returns it. Anything that holds one longer than necessary — a leaked `*sql.Rows`, a transaction waiting on an HTTP call — removes capacity from every other request in the process.

## Best Practices

### 1. Treat `*sql.DB` as a Long-Lived Pool, Never a Per-Request Object

Call `sql.Open` once during startup and inject the resulting handle. It is safe for concurrent use by any number of goroutines and it manages a pool internally, so opening one per request multiplies idle connections, defeats connection reuse, and adds TCP plus TLS handshake latency to every call.

### 2. Size the Pool from the Database's Connection Budget

`SetMaxOpenConns(0)` means unlimited, which is the opposite of what you want in production. PostgreSQL allocates a backend process per connection, so the ceiling is `max_connections` on the server, shared with every replica, every migration runner, and every human with `psql`. Divide the budget, do not multiply it.

```text
usable      = max_connections - superuser_reserved_connections - migration/ops headroom
per_process = usable / number_of_replicas

example: max_connections = 100, reserved = 10, replicas = 8
per_process = floor((100 - 10) / 8) = 11
```

Set `MaxIdleConns` equal (or close) to `MaxOpenConns`. A smaller idle ceiling causes healthy connections to be closed and reopened under steady traffic, which looks like a latency sawtooth in dashboards and wasted CPU in the database.

### 3. Carry a Deadline on Every Database Call

Every query should receive a `context.Context` that already has a deadline or cancellation path derived from the caller. Without one, a slow query occupies a pooled connection until the TCP connection dies — potentially minutes — and the queue behind it grows without bound.

```go
ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
defer cancel()

row := db.QueryRowContext(ctx, `SELECT id, total_cents FROM orders WHERE id = $1`, id)
```

### 4. Keep Transactions Short and Network-Free

A transaction holds a pooled connection and, depending on the isolation level and statements used, locks rows that other transactions need. Never make an HTTP call, publish to a queue, or wait on a channel inside an open transaction. Do the I/O first, then open the transaction, then write, then commit.

### 5. Set Server-Side Timeouts as a Second Line of Defense

Application deadlines are advisory; server-side timeouts are enforced. `statement_timeout` stops a runaway query, `lock_timeout` stops a statement from waiting forever on a lock, and `idle_in_transaction_session_timeout` reaps the transaction that a crashed process left open. Set them per role so an analysis session can be generous while the application role is strict.

### 6. Classify Errors as Retryable or Terminal

Retrying an invalid query or a constraint violation is pure amplification. Only serialization failures (`40001`) and deadlocks (`40P01`) are worth retrying, and only when the whole transaction can be replayed. Everything else — `23505` unique violation, `22P02` invalid input, `42P01` missing table — must surface immediately.

### 7. Batch Writes Instead of Looping Single Inserts

A loop of 5,000 `INSERT` statements costs 5,000 round trips and 5,000 pool acquisitions. A single `COPY` or a multi-row `INSERT ... SELECT * FROM unnest($1, $2, $3)` costs one. For bulk loads of tens of thousands of rows, use `pgx.CopyFrom`; it streams binary data and consistently beats any generated SQL.

### 8. Scan into Explicit Columns, Never `SELECT *`

`SELECT *` couples the query to the current table shape: adding a nullable column breaks every `Scan` call that does not expect it, and the wire cost grows silently. List the columns you actually need, and scan into a struct with matching field order.

### 9. Reuse Prepared Statements for Repeated Shapes

Both `database/sql` and `pgx` support prepared statements. Reusing a statement avoids re-parsing identical SQL on every call and produces a stable plan cache on the server. Use the driver's statement cache rather than hand-rolled `Prepare` calls in hot paths, and remember that a prepared statement is scoped to a connection — pool churn means re-preparation.

### 10. Export Pool Metrics and Alert on Saturation

`db.Stats()` exposes the numbers that predict an outage: `OpenConnections`, `InUse`, `Idle`, and `WaitCount` / `WaitDuration`. A rising `WaitCount` with `InUse == MaxOpenConns` means requests are queueing for connections, which is the earliest visible symptom of a slow query eating the pool.

### 11. Version the Schema with Migrations, Not Manual DDL

Every schema change belongs in a numbered migration file committed alongside the code that needs it. A human typing `ALTER TABLE` into a production shell produces a schema that no environment can reproduce, and rollbacks become archaeology instead of a command.

### 12. Choose the Driver Deliberately

`database/sql` with the `pgx` stdlib adapter gives you a standard interface, `database/sql` tooling compatibility, and a well-understood pool. Native `pgxpool` gives you PostgreSQL-specific features (batch pipelining, `COPY`, `LISTEN/NOTIFY`, richer type handling) at the cost of coupling to one database. Pick one per service, and do not mix them against the same database.

## Implementation Steps

### Step 1: Provision the Pool with Explicit Limits

Create the pool once, with limits derived from the sizing formula and lifetimes shorter than any load-balancer or failover event.

```go
package store

import (
    "context"
    "fmt"
    "time"
    "database/sql"

    _ "github.com/jackc/pgx/v5/stdlib"
)

type Config struct {
    DSN             string
    MaxOpenConns    int
    MaxIdleConns    int
    ConnMaxLifetime time.Duration
    ConnMaxIdleTime time.Duration
}

func New(ctx context.Context, cfg Config) (*sql.DB, error) {
    db, err := sql.Open("pgx", cfg.DSN)
    if err != nil {
        return nil, fmt.Errorf("open database: %w", err)
    }

    db.SetMaxOpenConns(cfg.MaxOpenConns)
    db.SetMaxIdleConns(cfg.MaxIdleConns)
    db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
    db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

    pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    if err := db.PingContext(pingCtx); err != nil {
        return nil, fmt.Errorf("ping database: %w", err)
    }
    return db, nil
}
```

Close the pool from a shutdown hook after the HTTP server has drained, so in-flight requests finish before the connections disappear.

### Step 2: Define a Context-Aware Repository Interface

The interface is the contract that keeps SQL out of handlers. It takes a context on every method and exposes an explicit transaction scope.

```go
package store

import (
    "context"
    "database/sql"
)

type Execer interface {
    ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
    QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
    QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

type Order struct {
    ID         string
    CustomerID string
    TotalCents int64
    Status     string
}

type OrderRepository interface {
    WithTx(ctx context.Context, fn func(ctx context.Context, tx Execer) error) error
    Create(ctx context.Context, order *Order) error
    ByID(ctx context.Context, id string) (*Order, error)
    BulkInsert(ctx context.Context, orders []Order) error
}
```

Typing the transaction as `Execer` rather than `*sql.Tx` keeps the callback testable with a fake and prevents it from calling `Commit` or `Rollback` out of order.

### Step 3: Implement Queries with Explicit Columns

```go
type sqlOrderRepository struct {
    db *sql.DB
}

func (r *sqlOrderRepository) ByID(ctx context.Context, id string) (*Order, error) {
    var order Order
    err := r.db.QueryRowContext(ctx,
        `SELECT id, customer_id, total_cents, status
           FROM orders
          WHERE id = $1`, id,
    ).Scan(&order.ID, &order.CustomerID, &order.TotalCents, &order.Status)

    switch {
    case errors.Is(err, sql.ErrNoRows):
        return nil, ErrOrderNotFound
    case err != nil:
        return nil, fmt.Errorf("select order %s: %w", id, err)
    default:
        return &order, nil
    }
}
```

Wrap the error with the operation and the key. The wrapping is what turns a stack trace of `pq: canceling statement due to statement timeout` into a message an on-call engineer can act on.

### Step 4: Build a Transaction Helper That Always Rolls Back

The only reliable transaction pattern is a `defer` that rolls back unless the commit already succeeded. `Rollback` after a successful `Commit` returns `sql.ErrTxDone`, which is safe to ignore.

```go
func (r *sqlOrderRepository) WithTx(ctx context.Context, fn func(ctx context.Context, tx Execer) error) error {
    tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
    if err != nil {
        return fmt.Errorf("begin transaction: %w", err)
    }

    committed := false
    defer func() {
        if committed {
            return
        }
        if rbErr := tx.Rollback(); rbErr != nil && !errors.Is(rbErr, sql.ErrTxDone) {
            log.Printf("rollback failed: %v", rbErr)
        }
    }()

    if err := fn(ctx, tx); err != nil {
        return err
    }
    if err := tx.Commit(); err != nil {
        return fmt.Errorf("commit transaction: %w", err)
    }
    committed = true
    return nil
}
```

### Step 5: Retry Only Serialization and Deadlock Failures

Wrap the whole transaction in a bounded retry with jittered backoff, and stop immediately when the context is done.

```go
func isRetryable(err error) bool {
    var pgErr *pgconn.PgError
    if !errors.As(err, &pgErr) {
        return false
    }
    switch pgErr.Code {
    case "40001": // serialization_failure
        return true
    case "40P01": // deadlock_detected
        return true
    default:
        return false
    }
}

func withRetry(ctx context.Context, attempts int, fn func(context.Context) error) error {
    var err error
    for attempt := 1; attempt <= attempts; attempt++ {
        if err = fn(ctx); err == nil || !isRetryable(err) {
            return err
        }
        delay := time.Duration(1<<(attempt-1)) * 25 * time.Millisecond
        select {
        case <-ctx.Done():
            return fmt.Errorf("retry aborted: %w", ctx.Err())
        case <-time.After(delay):
        }
    }
    return fmt.Errorf("gave up after %d attempts: %w", attempts, err)
}
```

Three attempts is usually enough; exponential growth from 25 ms keeps the total wait inside a typical 3-second request deadline.

### Step 6: Batch Inserts with a Single Round Trip

For 5,000 rows, drop from 5,000 round trips to one.

```go
func (r *pgxOrderRepository) BulkInsert(ctx context.Context, orders []Order) error {
    if len(orders) == 0 {
        return nil
    }

    rows := pgx.CopyFromSlice(len(orders), func(i int) ([]any, error) {
        return []any{orders[i].ID, orders[i].CustomerID, orders[i].TotalCents, orders[i].Status}, nil
    })

    _, err := r.pool.CopyFrom(ctx,
        pgx.Identifier{"orders"},
        []string{"id", "customer_id", "total_cents", "status"},
        rows,
    )
    if err != nil {
        return fmt.Errorf("copy %d orders: %w", len(orders), err)
    }
    return nil
}
```

When `COPY` is not an option — for example, when the insert needs `ON CONFLICT` — use a multi-row `INSERT` fed by `unnest` with three array parameters instead of concatenating placeholders.

### Step 7: Add Health Checks and Pool Metrics

```go
func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 1*time.Second)
    defer cancel()

    stats := s.db.Stats()
    if err := s.db.PingContext(ctx); err != nil {
        http.Error(w, "database unreachable", http.StatusServiceUnavailable)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]any{
        "open":      stats.OpenConnections,
        "in_use":    stats.InUse,
        "idle":      stats.Idle,
        "wait_count": stats.WaitCount,
        "wait_ms":   stats.WaitDuration.Milliseconds(),
    })
}
```

Export the same values to your metrics system on every scrape and alert on `wait_count` increasing while `in_use` equals the configured maximum. That combination is the clearest signal that a slow query, not traffic volume, is the problem.

### Step 8: Run Migrations from CI Before Deploying

Keep migrations in the repository and run them as a discrete step, never from application startup across every replica.

```bash
migrate -path ./migrations -database "$DATABASE_URL" up
migrate -path ./migrations -database "$DATABASE_URL" version
```

Make the pipeline fail if `version` does not match the expected revision after `up`. For zero-downtime deploys, split each migration into an expand step (add nullable column, backfill) and a contract step (add constraint, drop old column) that ships with a later release.

### Step 9: Load-Test the Data Layer and Verify Saturation Behavior

Point a load generator at the real endpoints, then watch the pool rather than the average latency.

```bash
hey -z 60s -c 200 -m GET "http://localhost:8080/orders/01H8Z5T3QK"
```

During the run, inspect the server side from a separate session:

```sql
SELECT state, count(*)
  FROM pg_stat_activity
 WHERE datname = current_database()
 GROUP BY state;
```

If `active` connections stay pinned at the pool ceiling while `WaitCount` climbs, the fix is a faster query or an index — raising `MaxOpenConns` only moves the contention into the database.

### Step 10: Apply Server-Side Guardrails in PostgreSQL

```sql
ALTER ROLE app_user SET statement_timeout = '5s';
ALTER ROLE app_user SET lock_timeout = '2s';
ALTER ROLE app_user SET idle_in_transaction_session_timeout = '30s';
```

Confirm the limits are actually in effect for the application role, since a `SET` in the wrong scope silently does nothing:

```sql
SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'app_user';
```

Together with application deadlines, these three settings bound the worst case: a query cannot run forever, a statement cannot wait forever on a lock, and a leaked transaction cannot hold a snapshot forever.

## Conclusion

A Go data layer is a queue with a fixed number of servers, and every design decision either respects that or pretends it does not. Bound the pool from the database's connection budget, give every call a deadline, keep transactions short and free of network I/O, retry only what is genuinely retryable, batch bulk writes into single round trips, and export pool statistics before you need them. The symptoms of ignoring these rules — latency spikes at peak, connection exhaustion after a failover, transactions that hold locks for minutes — are all cheap to prevent at design time and expensive to diagnose at 3 a.m.

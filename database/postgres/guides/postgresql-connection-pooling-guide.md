---
title: "PostgreSQL Connection Pooling Guide"
description: "A practical guide to PostgreSQL connection pooling with PgBouncer: pooling modes, pool sizing math, timeout budgets, prepared statement handling, and production monitoring."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# PostgreSQL Connection Pooling Guide

## Introduction

Every PostgreSQL connection is a separate operating system process that reserves memory for its own catalog cache, work buffers, and session state. That design makes PostgreSQL stable and easy to reason about, but it also means connections are expensive: on a modest 8 GB server, each idle connection can hold 5–15 MB of resident memory, and the server starts refusing connections or thrashing long before you reach a thousand of them. A Node.js service with a 20-connection pool multiplied across 12 pods already asks for 240 backends; add a few background workers, an analytics job, and a migration runner and you are at `max_connections` with nothing left for administrators.

This guide explains why pooling matters, how to choose between PgBouncer's pooling modes, how to compute a pool size that matches your database rather than your ambitions, and how to keep timeouts, prepared statements, and monitoring correct in production.

## Best Practices

### 1. Size the pool from database capacity, not from request concurrency

The correct pool size is a function of how many queries the database can actually execute in parallel, not how many requests your application receives. Start from CPU cores and add a small allowance for I/O wait:

```text
pool_size_per_instance = (db_cpu_cores * 2) + effective_spindle_count
max_connections        ≈ pool_size_per_instance * app_instances + admin_reserve
```

For an 8-core database, that is roughly 16–20 active backends — not 200. Queueing in front of a saturated database produces worse latency than a shorter queue with a hard cap, because each backend competes for the same locks and buffers.

### 2. Choose the pooling mode that matches your transaction pattern

PgBouncer's `pool_mode` decides when a server connection returns to the pool:

| Mode | Returns connection | Works with session features | Typical use |
| --- | --- | --- | --- |
| `session` | At client disconnect | Yes (advisory locks, `SET`, temp tables) | Legacy apps, ORMs that assume session affinity |
| `transaction` | At `COMMIT` / `ROLLBACK` | No (session state leaks between clients) | Default for stateless web services |
| `statement` | After every statement | No, and multi-statement transactions break | Read-only, autocommit workloads only |

`transaction` mode is the right default for HTTP services: it gives near-session behaviour to short transactions while keeping the backend count proportional to concurrent transactions rather than to open sockets.

### 3. Treat timeouts as a budget, ordered from inner to outer

A request that waits forever is worse than a request that fails fast. Layer the timeouts so each outer layer is strictly larger than the inner one, and make sure the client pool has a queue timeout so that saturation surfaces as an error instead of an unbounded wait.

### 4. Disable server-side prepared statements unless the pool supports them

In `transaction` mode, consecutive statements from one client can land on different server connections, so a `PREPARE` issued earlier may not exist where the `EXECUTE` runs. Either disable statement caching in the driver or enable PgBouncer's protocol-level prepared statement support (`max_prepared_statements` in PgBouncer 1.21+).

### 5. Monitor pool saturation, not just database health

Database metrics will look healthy while clients queue for a connection. Export PgBouncer's `SHOW POOLS` values and alert on `cl_waiting` and on `avg_wait_time` rising, because those are the leading indicators of pool starvation.

## Implementation Steps

### Step 1: Configure PgBouncer

```ini
; /etc/pgbouncer/pgbouncer.ini
[databases]
app = host=10.0.1.20 port=5432 dbname=appdb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction
max_client_conn = 2000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

; Fail fast instead of hanging the request thread
query_wait_timeout = 10
server_idle_timeout = 60
client_idle_timeout = 300

; PgBouncer 1.21+: keep prepared statements working in transaction mode
max_prepared_statements = 200

ignore_startup_parameters = extra_float_digits,options
```

`default_pool_size` is per user/database pair. With 8 application pods each opening 20 client connections, PgBouncer multiplexes them onto 20 server connections total — that is the entire point of the tier.

### Step 2: Point the application at the pooler

```typescript
import { Pool } from "pg";

// Application pool is intentionally small: PgBouncer already multiplexes.
const pool = new Pool({
    host: process.env.PGHOST ?? "pgbouncer.internal",
    port: Number(process.env.PGPORT ?? 6432),
    database: process.env.PGDATABASE ?? "appdb",
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    max: 10,                        // per pod, not per cluster
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000, // queue timeout: fail fast when saturated
    statement_timeout: 15_000,      // server-side cap for any single statement
    application_name: "checkout-api",
});

pool.on("error", (err) => {
    // Idle client errors must be handled or the process crashes
    console.error("unexpected idle client error", err);
});

export async function withTransaction<T>(
    fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
    } finally {
        client.release(); // always release, never rely on GC
    }
}
```

### Step 3: Verify pool behaviour under load

```bash
# Watch queueing in real time while a load test runs
watch -n1 "psql -h pgbouncer.internal -p 6432 -U stats pgbouncer \
  -c 'SHOW POOLS;' -c 'SHOW STATS;'"

# Confirm the database sees few backends while the app opens many clients
psql -h 10.0.1.20 -U postgres -c \
  "SELECT application_name, state, count(*) FROM pg_stat_activity
   GROUP BY 1,2 ORDER BY 3 DESC;"
```

Look for `cl_waiting` staying at zero under expected load. If it rises while `sv_active` sits at `default_pool_size`, the pool is the bottleneck and adding connections will only move the queue into the database.

### Step 4: Roll out safely

Deploy the pooler first, keep direct connections available as a fallback, then move services over one at a time. Reduce `max_connections` in `postgresql.conf` afterwards — a smaller, honest limit prevents a single misconfigured client from exhausting the server.

### Pitfalls and Trade-offs

- **More connections do not mean more throughput.** Throughput plateaus once every CPU core is busy; beyond that, extra backends add lock contention and context switching.
- **Session state is the trap in transaction mode.** `SET`, advisory locks, `LISTEN`, temp tables, and cursors do not survive a transaction boundary. Set them per transaction or use a dedicated session-mode pool for the few jobs that need them.
- **`query_wait_timeout` is a product decision.** Too high and requests time out at the load balancer with no useful error; too low and normal bursts fail. Align it with your p99 latency budget.
- **Migrations bypass the pooler.** DDL and `CREATE INDEX CONCURRENTLY` need a direct connection and often a session lock; run them outside the pooled path.
- **Monitor both tiers.** PgBouncer tells you about client pressure; `pg_stat_activity` tells you about server pressure. Neither alone shows the whole picture.

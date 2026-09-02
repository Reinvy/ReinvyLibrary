---
title: "PostgreSQL Transactions and Concurrency Control Cheatsheet"
description: "A quick reference for PostgreSQL transaction control, isolation levels, locking, MVCC, advisory locks, and concurrency monitoring."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# PostgreSQL Transactions and Concurrency Control Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Start a transaction | `BEGIN;` | Begin a new transaction block |
| Start with explicit isolation | `BEGIN ISOLATION LEVEL SERIALIZABLE;` | Begin with a specific isolation level |
| Commit changes | `COMMIT;` | Make all changes in the transaction permanent |
| Undo changes | `ROLLBACK;` | Discard all changes in the current transaction |
| Set isolation for transaction | `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;` | Change isolation for the current transaction only |
| Show current isolation | `SHOW transaction_isolation;` | Display the active isolation level |
| Mark a savepoint | `SAVEPOINT sp1;` | Set a nested rollback point inside a transaction |
| Roll back to savepoint | `ROLLBACK TO SAVEPOINT sp1;` | Undo changes since the savepoint |
| Lock a row for update | `SELECT ... FOR UPDATE;` | Take an exclusive row lock, blocking concurrent writers |
| Lock without waiting | `SELECT ... FOR UPDATE NOWAIT;` | Fail immediately if the row is already locked |
| Skip locked rows | `SELECT ... FOR UPDATE SKIP LOCKED;` | Skip rows locked by other transactions (job queues) |
| Shared row lock | `SELECT ... FOR SHARE;` | Prevent row deletion/update while allowing concurrent shared locks |
| Session advisory lock | `SELECT pg_advisory_lock(42);` | Acquire a session-level application mutex |
| Try advisory lock | `SELECT pg_try_advisory_lock(42);` | Acquire or return `false` immediately |
| List active locks | `SELECT * FROM pg_locks;` | Show all locks held or awaited in the cluster |
| Find blocking PIDs | `SELECT pg_blocking_pids(pid);` | Show which backends block a given backend |
| Show transaction ID | `SELECT txid_current();` | Return the current transaction ID |
| Check transaction status | `SELECT txid_status(txid_current());` | Report if a transaction committed, aborted, or is in progress |
| Export snapshot | `SELECT pg_export_snapshot();` | Publish the current snapshot for another session |
| Defer constraints | `SET CONSTRAINTS ALL DEFERRED;` | Defer deferrable constraints to commit time |

## Common Commands

### Basic Transaction Control

```sql
-- Autocommit is on by default in psql; wrap statements explicitly
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- both updates become visible atomically

-- Abort the whole transaction on error
BEGIN;
DELETE FROM orders WHERE id = 999;
ROLLBACK;
```

### Savepoints

```sql
BEGIN;
INSERT INTO audit_log (event) VALUES ('batch start');
SAVEPOINT sp_before_items;
INSERT INTO items (name) VALUES ('item-a');
-- something fails conceptually: undo only the items insert
ROLLBACK TO SAVEPOINT sp_before_items;
RELEASE SAVEPOINT sp_before_items;
COMMIT;  -- audit_log row survives, items insert is discarded
```

### Isolation Level Configuration

```sql
-- Per-transaction (recommended)
BEGIN ISOLATION LEVEL REPEATABLE READ;

-- Per-session default (applies to future transactions)
SET default_transaction_isolation = 'serializable';

-- Verify
SHOW transaction_isolation;
```

### Row-Level Locking Modes

```sql
-- FOR UPDATE: strongest row lock, blocks UPDATE/DELETE and all other row locks
SELECT * FROM inventory WHERE sku = 'A-100' FOR UPDATE;

-- FOR NO KEY UPDATE: weaker than FOR UPDATE, allows FOR KEY SHARE
SELECT * FROM inventory WHERE sku = 'A-100' FOR NO KEY UPDATE;

-- FOR SHARE: blocks UPDATE/DELETE but allows concurrent FOR SHARE locks
SELECT * FROM products WHERE id = 7 FOR SHARE;

-- FOR KEY SHARE: allows everything except deleting the row or changing its key
SELECT * FROM products WHERE id = 7 FOR KEY SHARE;

-- Avoid blocking waits
SELECT * FROM jobs WHERE status = 'pending' FOR UPDATE SKIP LOCKED;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;
```

### Advisory Locks

```sql
-- Session-level lock: held until explicitly released or session ends
SELECT pg_advisory_lock(1001);
SELECT pg_advisory_unlock(1001);

-- Transaction-level lock: released automatically at commit/rollback
SELECT pg_advisory_xact_lock(1001);

-- Non-blocking variants return boolean success
SELECT pg_try_advisory_lock(1001);
SELECT pg_try_advisory_xact_lock(1001);

-- Two-key (bigint pair) variant for composite keyspaces
SELECT pg_advisory_lock(1, 2);
```

### Deadlock and Lock Monitoring

```sql
-- Lower the detection interval when deadlocks are frequent (postgresql.conf)
-- deadlock_timeout = 1000ms  (default 1000ms; 1s is already the default)

-- Which backends are blocked, and by whom?
SELECT a.pid, a.state, a.query,
       pg_blocking_pids(a.pid) AS blocked_by
FROM pg_stat_activity a
WHERE a.state = 'active' AND pg_blocking_pids(a.pid) <> '{}';

-- Show lock waits with relation names
SELECT l.locktype, l.mode, l.granted, c.relname,
       a.pid AS waiter, pg_blocking_pids(a.pid) AS blocked_by
FROM pg_locks l
LEFT JOIN pg_class c ON c.oid = l.relation
LEFT JOIN pg_stat_activity a ON a.pid = l.pid
WHERE l.locktype IN ('relation', 'tuple')
ORDER BY l.granted DESC, l.relation;
```

## Code Snippets

### Atomic Transfer with Explicit Transaction

```sql
BEGIN;
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;
SELECT balance FROM accounts WHERE id = 1;  -- verify before committing
COMMIT;
```

### Pessimistic Locking with SELECT FOR UPDATE

```sql
BEGIN;
-- Lock the row so no other transaction can modify it until we commit
SELECT stock FROM inventory WHERE sku = 'A-100' FOR UPDATE;
-- stock is stable here; safe to decrement without lost updates
UPDATE inventory SET stock = stock - 1 WHERE sku = 'A-100';
COMMIT;
```

### Optimistic Concurrency Control with Version Column

```sql
ALTER TABLE documents ADD COLUMN version BIGINT DEFAULT 1;

-- Writer: update only if the version has not changed
UPDATE documents
SET content = 'new body', version = version + 1
WHERE id = 42 AND version = 3;

-- 0 rows affected means someone else committed first; retry by re-reading
```

### Job Queue Worker with SKIP LOCKED

```sql
-- Multiple workers can claim tasks without blocking each other
BEGIN;
SELECT id, payload
FROM job_queue
WHERE status = 'pending'
ORDER BY created_at
LIMIT 10
FOR UPDATE SKIP LOCKED;

UPDATE job_queue SET status = 'processing', started_at = now()
WHERE id IN (SELECT id FROM job_queue WHERE status = 'pending' LIMIT 10 FOR UPDATE SKIP LOCKED);
COMMIT;
```

### Distributed Mutex with Advisory Locks

```sql
-- Ensure only one worker runs a maintenance routine cluster-wide
SELECT pg_try_advisory_lock(9001) AS acquired;

-- In application code:
-- if acquired:
--     try:
--         run_maintenance()
--     finally:
--         SELECT pg_advisory_unlock(9001)
```

### Serializable Retry Pattern

```sql
-- SERIALIZABLE transactions can abort with SQLSTATE 40001.
-- Application pseudo-code: retry the whole transaction on 40001.
BEGIN ISOLATION LEVEL SERIALIZABLE;
UPDATE balances SET total = total + 10 WHERE account_id = 5;
COMMIT;
-- On error 40001 (serialization_failure): ROLLBACK and re-run from BEGIN.
```

### Snapshot Isolation Consistency Check

```sql
-- Repeatable Read: one snapshot for the whole transaction
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT sum(amount) FROM payments WHERE account_id = 5;
-- Later statements in the same transaction see the SAME snapshot,
-- even if other transactions commit in between.
COMMIT;
```

### Deferred Constraint Checking

```sql
-- With a deferrable FK, order of inserts within a transaction does not matter
BEGIN;
SET CONSTRAINTS ALL DEFERRED;
INSERT INTO order_items (order_id, product_id) VALUES (1, 10);
INSERT INTO orders (id) VALUES (1);  -- referenced row inserted after the reference
COMMIT;  -- checked here; passes because both rows now exist
```

### Lock Contention Diagnosis

```sql
SELECT blocked.pid AS blocked_pid,
       blocking.pid AS blocking_pid,
       blocked.query AS blocked_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
  ON blocking.pid = ANY (pg_blocking_pids(blocked.pid))
WHERE blocked.wait_event_type = 'Lock';
```

---
title: "PostgreSQL Change Data Capture with Logical Decoding"
description: "Build a production change data capture pipeline from the PostgreSQL write-ahead log using logical decoding, replication slots, snapshot bootstrapping, and LSN checkpointing."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# PostgreSQL Change Data Capture with Logical Decoding

## Summary

This tutorial walks through building a change data capture (CDC) pipeline that reads row-level `INSERT`, `UPDATE`, and `DELETE` events directly from the PostgreSQL write-ahead log. You will configure logical decoding, create a replication slot, bootstrap a consistent snapshot, stream changes into a downstream table, and checkpoint progress with an LSN so the pipeline survives restarts without losing or duplicating data. The result is a working consumer that keeps an analytics table in sync with an operational table in near real time.

## Target Audience

- Backend, platform, and data engineers who already run PostgreSQL in production.
- Advanced developers comfortable with SQL, transactions, and writing a small long-running service.
- Engineers who have outgrown nightly export jobs or `updated_at` polling.

## Prerequisites

- PostgreSQL 14 or newer (16+ if you want to decode on a standby), with permission to edit `postgresql.conf` and restart the server.
- A superuser or a role with `REPLICATION` and the ability to create replication slots and publications.
- Basic familiarity with WAL, MVCC, and transaction isolation.
- Python 3.9+ with `psycopg2` installed, plus the `wal2json` output plugin available on the server.
- Two schemas in the same database: an operational one and a downstream one for this exercise.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain how logical decoding reconstructs row changes from a physical write-ahead log.
- Choose between the `pgoutput`, `wal2json`, and `test_decoding` output plugins for a given consumer.
- Create, advance, monitor, and safely drop a logical replication slot.
- Bootstrap a downstream replica using an exported snapshot without missing or double-applying rows.
- Implement LSN checkpointing that gives effectively-once delivery through idempotent upserts.
- Prevent the two classic CDC incidents: permanent WAL retention and silent data drift.

## Context and Motivation

The obvious way to replicate data out of PostgreSQL is to poll for changes:

```sql
SELECT * FROM orders WHERE updated_at > :last_seen_at;
```

That query fails in four predictable ways. It cannot see `DELETE` at all, because the row is gone. It misses intermediate states when a row is updated twice between polls. It silently drops rows written by a long transaction whose `COMMIT` lands after your poll already read past a later `updated_at`. And it puts a scatter-gather scan on the primary every few seconds, forever.

Change data capture solves this by reading the write-ahead log instead of the tables. The WAL already contains every change in commit order, so a consumer gets every row version exactly as the database saw it, including deletes, without querying the tables at all. This is the same mechanism logical replication subscriptions are built on, which means the machinery is maintained by the PostgreSQL core team rather than bolted on.

The catch is that reading the WAL is a long-lived contract with the primary. A slot that nobody consumes will pin WAL segments until the disk fills, and a consumer that ignores old tuple semantics will happily corrupt downstream data. This tutorial treats those failure modes as first-class concerns rather than footnotes.

## Core Content

### What Logical Decoding Actually Does

The WAL is a physical log: it stores byte-level page changes, not logical rows. Logical decoding is the layer that interprets those page changes back into a stream of tuples together with the transaction they belong to. The server parses the WAL, tracks transaction boundaries, and hands an output plugin a decoded change set at commit time.

Two things must be true for decoding to work:

- `wal_level` must be `logical`, so the WAL retains the information needed to reconstruct tuples (origin, old tuple keys, and catalog information).
- A replication slot must exist, because the server has to guarantee that the WAL needed by the consumer is not recycled before it is read.

The output plugin decides the wire format. The core decodes; the plugin serializes.

### Output Plugins and Which One to Pick

Three plugins cover almost every case.

```text
| Plugin        | Output          | Use it when                                                        |
|---------------|-----------------|--------------------------------------------------------------------|
| test_decoding | Human-readable  | You are debugging or proving that changes are captured at all      |
| wal2json      | JSON text       | You write your own consumer and want a stable, readable contract   |
| pgoutput      | Binary protocol | You use Debezium, Kafka Connect, or a native subscription          |
```

`test_decoding` is a diagnostic tool and its output format is not something to parse in production. `wal2json` is the friendliest choice for a hand-written consumer because every message is JSON you can log, diff, and replay. `pgoutput` is the protocol used by native logical replication; it is more compact and supports streaming of in-progress transactions, but it requires a binary protocol implementation, so most teams reach for `pgoutput` only through Debezium or a subscription.

This tutorial uses `wal2json` for the consumer and shows `pgoutput` where the two differ.

### Replication Slots Are a Retention Contract

A logical replication slot has two jobs. It identifies a consumer, and it records the last LSN the consumer confirmed. PostgreSQL will not remove WAL past `restart_lsn` for that slot, and it will not remove WAL past `confirmed_flush_lsn` as far as the consumer is concerned.

That guarantee is exactly what makes CDC lossless, and it is also the most common way teams take down a primary. If a consumer stops for a week, the slot stops WAL recycling for a week, and the data directory grows until the disk is full. The blast radius is the entire cluster, not just the pipeline.

Two settings contain the damage. `max_slot_wal_keep_size` caps how much WAL a slot may retain before the server invalidates it (available since PostgreSQL 13), and `pg_replication_slots` gives you the lag in bytes so you can alert long before the cap is hit. Invalidation is not a graceful stop: the slot becomes unusable and the consumer must be rebuilt from a fresh snapshot, so it should be a last resort that you never actually reach.

### Old Tuples, Replica Identity, and the UPDATE Trap

For an `INSERT` the decoded tuple is simply the new row. For a `DELETE` and for an `UPDATE` that changes the primary key, the consumer also needs the old row's identity. That is what `REPLICA IDENTITY` controls.

With the default setting (`REPLICA IDENTITY DEFAULT`), the old tuple contains only the primary key columns. That is enough to locate the row downstream. If your consumer needs the full previous row — for audit tables, or to compute a delta — the table must use `REPLICA IDENTITY FULL`, which writes every old column to the WAL. That setting is expensive on wide tables because it roughly doubles the WAL volume for updates, so enable it deliberately and only where the downstream needs it.

There is a second, subtler trap. PostgreSQL stores large values out of line in TOAST tables, and an `UPDATE` that does not touch a TOASTed column does not rewrite it, so the decoded new tuple omits that column entirely. A consumer that treats the decoded tuple as a full row and overwrites downstream with `NULL` for the missing column will quietly destroy data. Apply decoded changes as partial updates, or read the current value from the source when a column is absent.

### Bootstrapping a Snapshot Without Missing Rows

Streaming only carries changes made after the slot was created. Existing rows must come from somewhere, and the naive order — dump the table, then start streaming — loses every write committed between the two steps.

The correct sequence is: create the slot first, then take a snapshot that is guaranteed to be at or before the slot's starting point, load the snapshot, and only then start consuming from the slot. Because the slot exists from the beginning, every change after the snapshot point is still in the WAL and will be delivered. Some of those changes will already be reflected in the snapshot, which is fine as long as the apply step is idempotent.

```text
Create slot  ──►  Export snapshot  ──►  Load snapshot  ──►  Stream from slot
   (WAL pinned)     (repeatable read)      (bulk load)        (at-least-once)
```

The duplicated work between the snapshot and the stream start is the price of correctness, and it is small.

### Delivery Semantics and Checkpointing

Logical decoding gives you at-least-once delivery. The consumer confirms an LSN, and if it crashes before confirming, the same changes are delivered again after restart. Exactly-once is therefore not a property of the stream — it is a property of the apply step.

The pattern that works is to commit the downstream write and the checkpoint in the same transaction. Either both land or neither does, so a replay after a crash re-reads a transaction that was never applied. Combined with an idempotent upsert guarded by a version or timestamp column, this yields effectively-once behavior for correctly ordered streams.

Keep one checkpoint row per consumer, not per table. The LSN is a position in a single log, and a consumer that tracks positions separately per table will eventually apply out of order.

### Reading the Wire Protocol

Every plugin wraps changes in transaction boundaries, and you need those boundaries to preserve atomicity. `wal2json` in format version 2 emits one JSON document per transaction, with a `change` array. `pgoutput` emits a binary `BEGIN`, one message per row (`I`, `U`, `D`), and a `COMMIT`, all tied to the same transaction. A consumer that applies row messages immediately instead of buffering until `COMMIT` will show partially applied transactions downstream, which is exactly the inconsistency CDC is supposed to prevent.

## Code Examples

### Step 1: Enable Logical Decoding on the Server

Edit `postgresql.conf` and restart the server. `wal_level` cannot be changed with a reload.

```text
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10
max_slot_wal_keep_size = '20GB'
wal_sender_timeout = '60s'
```

Verify the setting took effect:

```sql
SHOW wal_level;

SELECT name, setting, unit
FROM pg_settings
WHERE name IN ('wal_level', 'max_replication_slots', 'max_slot_wal_keep_size');
```

### Step 2: Create the Source Table, Consumer Role, and Slot

The source table carries real-world columns, including one that will be TOASTed so the partial-update behavior is visible.

```sql
CREATE SCHEMA IF NOT EXISTS shop;
CREATE SCHEMA IF NOT EXISTS warehouse;
CREATE SCHEMA IF NOT EXISTS cdc;

CREATE TABLE shop.orders (
    id           bigint PRIMARY KEY,
    customer_id  bigint NOT NULL,
    status       text NOT NULL,
    total_cents  integer NOT NULL CHECK (total_cents >= 0),
    notes        text,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Wide, compressible column: stored out of line in TOAST
ALTER TABLE shop.orders ALTER COLUMN notes SET STORAGE EXTENDED;

INSERT INTO shop.orders (id, customer_id, status, total_cents, notes)
VALUES (1, 100, 'pending', 4200, repeat('gift wrap; ', 2000)),
       (2, 101, 'paid',    9900, NULL);

-- A consumer role with replication rights and read access to the source
CREATE ROLE cdc_consumer WITH LOGIN REPLICATION;
GRANT CONNECT ON DATABASE appdb TO cdc_consumer;
GRANT USAGE ON SCHEMA shop TO cdc_consumer;
GRANT SELECT ON ALL TABLES IN SCHEMA shop TO cdc_consumer;
GRANT USAGE, CREATE ON SCHEMA cdc TO cdc_consumer;
```

Now create the slot. Create it before any snapshot so no change can fall between the two.

```sql
SELECT pg_create_logical_replication_slot('cdc_orders', 'wal2json');
```

### Step 3: Confirm Changes Are Being Captured

Before writing a consumer, prove the pipeline works with `test_decoding` on a throwaway slot. This costs nothing and rules out configuration mistakes.

```sql
SELECT pg_create_logical_replication_slot('cdc_probe', 'test_decoding');

UPDATE shop.orders SET status = 'shipped', updated_at = now() WHERE id = 2;

SELECT lsn, xid, data
FROM pg_logical_slot_peek_changes('cdc_probe', NULL, NULL);

SELECT pg_drop_replication_slot('cdc_probe');
```

`peek_changes` reads without advancing the slot, which is what you want while probing. The same call with `get_changes` advances it — an easy way to lose data by accident.

You can also watch the `wal2json` slot directly from the command line:

```bash
pg_recvlogical -d appdb -S cdc_orders --start \
  -o format-version=2 -o include-transaction=1 -o include-timestamp=1 \
  -f -
```

Only one consumer may be active on a slot at a time. If the Python consumer is running, `pg_recvlogical` will fail with an "active" error rather than steal the slot — that is a safety feature, not a bug.

### Step 4: Prepare the Downstream Tables and Checkpoint

The checkpoint table is the consumer's memory. Putting it in the same database as the target makes the atomic commit possible.

```sql
CREATE TABLE warehouse.orders (
    id          bigint PRIMARY KEY,
    customer_id bigint NOT NULL,
    status      text NOT NULL,
    total_cents integer NOT NULL,
    updated_at  timestamptz NOT NULL
);

CREATE TABLE warehouse.orders_tombstones (
    id          bigint PRIMARY KEY,
    deleted_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cdc.checkpoints (
    consumer   text PRIMARY KEY,
    lsn        pg_lsn NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Step 5: Write the Consumer

The consumer applies each transaction and its checkpoint atomically, then confirms the LSN to the server. Note that the replication connection cannot run ordinary queries, so the apply step uses a second connection.

```python
import json
import logging

import psycopg2
from psycopg2.extras import LogicalReplicationConnection

DSN = "dbname=appdb user=cdc_consumer"
SLOT = "cdc_orders"
CONSUMER = "orders-to-warehouse"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("cdc")


def lsn_to_str(lsn: int) -> str:
    """Render an integer LSN as the X/Y hex form PostgreSQL expects."""
    return "{:X}/{:X}".format(lsn >> 32, lsn & 0xFFFFFFFF)


def apply_upsert(cur, row: dict) -> None:
    cur.execute(
        """
        INSERT INTO warehouse.orders (id, customer_id, status, total_cents, updated_at)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE
           SET customer_id = EXCLUDED.customer_id,
               status      = EXCLUDED.status,
               total_cents = EXCLUDED.total_cents,
               updated_at  = EXCLUDED.updated_at
         WHERE warehouse.orders.updated_at <= EXCLUDED.updated_at
        """,
        (row["id"], row["customer_id"], row["status"], row["total_cents"], row["updated_at"]),
    )


def apply_delete(cur, change: dict) -> None:
    keys = change["oldkeys"]["keyvalues"]
    order_id = keys[0]
    cur.execute(
        "DELETE FROM warehouse.orders WHERE id = %s",
        (order_id,),
    )
    cur.execute(
        """
        INSERT INTO warehouse.orders_tombstones (id) VALUES (%s)
        ON CONFLICT (id) DO UPDATE SET deleted_at = now()
        """,
        (order_id,),
    )


def apply_transaction(tcur, changes: list) -> None:
    for change in changes:
        if change.get("table") != "orders":
            continue
        if change["kind"] in ("insert", "update"):
            # Column presence varies: absent columns were not rewritten
            names = change["columnnames"]
            values = change["columnvalues"]
            apply_upsert(tcur, dict(zip(names, values)))
        elif change["kind"] == "delete":
            apply_delete(tcur, change)
        elif change["kind"] == "truncate":
            tcur.execute("TRUNCATE warehouse.orders")


def consume() -> None:
    replica = psycopg2.connect(DSN, connection_factory=LogicalReplicationConnection)
    rcur = replica.cursor()

    target = psycopg2.connect(DSN)
    target.autocommit = False
    tcur = target.cursor()

    def process(message) -> None:
        try:
            payload = json.loads(message.payload)
            changes = payload["change"] if payload else []
            if changes:
                apply_transaction(tcur, changes)
            tcur.execute(
                """
                INSERT INTO cdc.checkpoints (consumer, lsn)
                VALUES (%s, %s::pg_lsn)
                ON CONFLICT (consumer) DO UPDATE
                   SET lsn = EXCLUDED.lsn, updated_at = now()
                """,
                (CONSUMER, lsn_to_str(message.data_start)),
            )
            target.commit()
        except Exception:
            target.rollback()
            log.exception("transaction failed, stopping before confirming LSN")
            raise

        # Confirm only after the target commit succeeds
        message.cursor.send_feedback(flush_lsn=message.data_start)

    rcur.start_replication(
        slot_name=SLOT,
        decode=False,
        options={"format-version": "2", "include-transaction": "1", "include-timestamp": "1"},
        plugin="wal2json",
    )
    log.info("streaming from slot %s", SLOT)
    rcur.consume_stream(process)


if __name__ == "__main__":
    consume()
```

Two details carry most of the correctness here. `send_feedback` runs only after `target.commit()`, so a crash between apply and confirm replays the transaction instead of losing it. And the upsert's `WHERE warehouse.orders.updated_at <= EXCLUDED.updated_at` makes a replay a no-op rather than a regression to an older row version.

### Step 6: Apply the Snapshot Correctly

For an existing table, run the bootstrap before starting the consumer. Export a snapshot, load it, then stream.

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT pg_export_snapshot();
-- Returns a snapshot identifier such as 00000003-0000001B-1
```

Keep that transaction open and use the identifier in a parallel session:

```bash
pg_dump -d appdb \
  --snapshot=00000003-0000001B-1 \
  --data-only \
  --table=shop.orders \
  -f /tmp/orders_snapshot.sql

psql -d appdb -f /tmp/orders_snapshot.sql
```

The dump and the stream will overlap on some rows. That overlap is harmless because the apply step is idempotent; missing rows would not be.

### Step 7: Monitor Slot Health Before It Becomes an Incident

These two queries are the ones worth putting on a dashboard with an alert.

```sql
SELECT slot_name,
       active,
       plugin,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) AS behind,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn))        AS retained
FROM pg_replication_slots
WHERE slot_type = 'logical'
ORDER BY pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) DESC;
```

```sql
SELECT slot_name,
       total_txns,
       stream_txns,
       spill_txns,
       spill_count,
       spill_bytes
FROM pg_stat_replication_slots;
```

Alert on `behind` crossing a time budget rather than a byte budget — "more than five minutes behind" is meaningful, "more than 500 MB" depends on write volume. Alert again at roughly half of `max_slot_wal_keep_size`, which is the point where you still have room to fix the consumer before the slot is invalidated.

If a consumer is permanently abandoned, drop its slot deliberately:

```sql
SELECT pg_drop_replication_slot('cdc_orders');
```

Check `confirmed_flush_lsn` first and confirm nobody needs the data behind it. Dropping a slot is irreversible, and everything it was holding becomes unrecoverable.

## Key Insights

- **The slot, not the tables, is what you are reading.** Every change is delivered in commit order from the WAL, so deletes and intermediate row versions are captured naturally. Never fall back to polling "just for the missed rows" — that reintroduces the bugs CDC exists to remove.
- **A dead consumer can take down the primary.** Logical slots pin WAL. Set `max_slot_wal_keep_size`, alert on `pg_replication_slots` lag, and treat an inactive slot older than a few hours as a page-worthy event.
- **Replica identity is a per-table cost decision.** Default identity gives you the primary key in old tuples, which is enough to locate a row. `REPLICA IDENTITY FULL` gives you the whole old row at roughly double the WAL cost for wide tables; enable it only where the downstream genuinely needs prior values.
- **TOASTed columns go missing from decoded updates.** An update that does not touch a large column does not include it in the new tuple. Treat decoded rows as partial, patch downstream with `UPDATE ... SET` per present column, or read the source column when absent.
- **Checkpoint in the same transaction as the apply.** Committing the target write and the LSN together turns at-least-once delivery into effectively-once processing. Two separate commits mean duplicated work after every crash.
- **Never share a slot between consumers.** A slot has one confirmed position and one active consumer. Two services reading the same slot will each see a random subset of changes and both will look correct in isolation.
- **Decoding on a standby requires PostgreSQL 16 or newer.** Before that, logical decoding must run on the primary, which puts the CPU cost of decoding on your write path.
- **Ordering is per transaction, not per row globally.** Changes to the same row arrive in commit order, which is all an upsert needs. Do not assume a total order across unrelated tables.
- **Invalidation is a rebuild, not a pause.** Once `max_slot_wal_keep_size` is exceeded the slot is gone, and the pipeline must be re-bootstrapped from a snapshot. Design the bootstrap path to be routine, not a heroic recovery.

## Next Steps

- Replace the hand-written consumer with a native logical replication subscription (`CREATE SUBSCRIPTION`) when the destination is another PostgreSQL database; it uses `pgoutput` and manages slots for you.
- Move the downstream sink to Kafka with Debezium once more than two consumers need the same change stream, so the WAL is read once and fanned out.
- Add schema-change handling: compare `columnnames` against the expected set and fail loudly on unknown columns instead of silently dropping them.
- Read the PostgreSQL documentation on logical decoding and the `wal2json` option reference before tuning batch sizes.
- Study the repository's `postgresql-replication-high-availability-guide` for the failover and monitoring side of the same WAL machinery.

## Conclusion

You configured logical decoding, created a replication slot with the right retention guardrails, bootstrapped a consistent snapshot, and streamed row-level changes into a downstream table with LSN checkpoints that make restarts safe. The pipeline now captures inserts, updates, and deletes in commit order without ever querying the source tables.

The two things worth remembering are both about contracts. The slot is a promise that PostgreSQL will hold WAL for you, and breaking that promise costs disk on the primary. The apply step is a promise that replays are harmless, and breaking that one costs correctness downstream. Keep the snapshot-before-stream order, commit the checkpoint with the data, and monitor slot lag as a production signal rather than a debugging aid.

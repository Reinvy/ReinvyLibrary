---
title: "MongoDB Transactions and Concurrency Control Guide"
description: "Advanced guide to multi-document ACID transactions in MongoDB: snapshot isolation, write conflict handling, retry semantics, optimistic concurrency control, and production tuning."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# MongoDB Transactions and Concurrency Control Guide

## Introduction

MongoDB's document model has always guaranteed atomic operations on a single document, but many real business workflows — moving money between accounts, reserving inventory while creating an order, or syncing a ledger with a profile — need to update several documents atomically. Since MongoDB 4.0, multi-document ACID transactions provide exactly that guarantee on replica sets, and since MongoDB 4.2 they work across sharded clusters as well.

A transaction groups reads and writes into an all-or-nothing unit: either every operation commits and becomes visible to other clients, or none of them do. Under the hood, MongoDB implements transactions with **snapshot isolation** on the WiredTiger storage engine: every transaction sees a consistent snapshot of the data as of the moment the first operation runs, and concurrent committed writes are invisible until the transaction commits. Write conflicts between simultaneous transactions are resolved by aborting one of them, which the application must retry.

This guide goes beyond the "how to start a transaction" tutorial. It explains the concurrency model, the exact retry semantics of transient errors, how to design documents and code paths that minimize conflicts, how to layer optimistic concurrency control on top of transactions, and how to monitor and tune transactions in production. It targets developers who already know MongoDB basics and now need to build correct, high-throughput transactional systems.

## Best Practices

### 1. Keep Transactions Short and Targeted

A transaction holds storage-engine resources and blocks other writers on the documents it touches. The default runtime limit is 60 seconds (`transactionLifetimeLimitSeconds`), and an idle transaction is aborted after the same window. In practice, a transaction should complete in milliseconds. Never perform network I/O, external API calls, or user interaction inside a transaction — they extend the open window and dramatically increase the chance of write conflicts and timeouts.

```javascript
// Wrong: external I/O inside the transaction window
await session.withTransaction(async () => {
  const price = await pricingService.fetchFromRemote(); // network call inside txn
  await orders.updateOne({ _id: orderId }, { $set: { total: price } }, { session });
});

// Right: fetch everything first, then transact only the database work
const price = await pricingService.fetchFromRemote();
await session.withTransaction(async () => {
  await orders.updateOne({ _id: orderId }, { $set: { total: price } }, { session });
});
```

### 2. Prefer the withTransaction Helper Over Manual Start and Commit

The Node.js driver's `session.withTransaction()` callback implements the full retry contract for you: when a `TransientTransactionError` (which includes `WriteConflict`) aborts the transaction, the helper automatically aborts and re-runs the callback. Manual `startTransaction` / `commitTransaction` code must re-implement this loop, and it is easy to get wrong.

```javascript
const session = client.startSession();

try {
  await session.withTransaction(async () => {
    await accounts.updateOne(
      { _id: "alice" },
      { $inc: { balance: -100 } },
      { session }
    );
    await accounts.updateOne(
      { _id: "bob" },
      { $inc: { balance: 100 } },
      { session }
    );
  }, {
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" },
    readPreference: "primary"
  });
} finally {
  await session.endSession();
}
```

### 3. Design for Fewer Write Conflicts

WiredTiger uses document-level concurrency: two transactions can read the same document freely, but if two transactions **write the same document** (or an index entry for it) at the same time, one wins and the other receives a `WriteConflict` and must be retried wholesale. Conflict probability grows with the number of documents a transaction writes and with how "hot" those documents are. A classic hot-spot mistake is a shared counter document that every transaction increments. Dedicated counter documents, or embedding counters in the document being updated, keeps contention low.

```javascript
// Hot document: every transaction increments the same counter -> constant WriteConflicts
await counters.updateOne({ _id: "global_orders" }, { $inc: { value: 1 } }, { session });

// Better: derive the counter from the order documents when possible, or shard counters
// by a natural dimension (per-region, per-shop) so writes spread across documents
```

### 4. Choose Read and Write Concerns Deliberately

Concerns are the knobs that trade throughput against durability and consistency:

- **Read concern `snapshot`** (the default for transactions) reads from a consistent snapshot taken at the transaction's first operation. It gives you repeatable reads: the same query twice inside the transaction returns identical data, even if other clients commit in between.
- **Read concern `local`** returns the most recent data, even if it is not yet committed and could roll back.
- **Write concern `w: "majority"`** at commit makes the transaction's durability depend on a majority of replica set members. With `w: 1`, a commit acknowledged by the primary can still be rolled back if the primary fails before replication.

Use `w: "majority"` for anything financial or business-critical, and accept its latency cost. Never silently downgrade durability just to pass a benchmark.

```javascript
await session.withTransaction(callback, {
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" }
});
```

### 5. Implement the Retry Loop Even When Using Manual Transactions

`withTransaction` handles retries, but you still need to know the contract because you will see it in driver code, ORMs, and your own abstractions. The rule is: on a `TransientTransactionError` (error label on the driver error object), abort and retry the **entire** transaction — never resume from the middle, because the snapshot is gone and partial writes must not leak.

```javascript
let committed = false;
while (!committed) {
  const session = client.startSession();
  try {
    session.startTransaction({ readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    await orders.insertOne(order, { session });
    await inventory.updateOne({ _id: sku }, { $inc: { stock: -1 } }, { session });
    await session.commitTransaction();
    committed = true;
  } catch (error) {
    if (error.hasErrorLabel("TransientTransactionError")) {
      // Safe to retry the whole transaction
    } else {
      throw error;
    }
  } finally {
    await session.endSession();
  }
}
```

### 6. Make Commit Handling Idempotent

When `commitTransaction` is acknowledged, the outcome is certain. But if the network fails **after** the primary commits and **before** the driver receives the acknowledgment, the driver cannot know whether the commit succeeded — the error carries the `UnknownTransactionCommitResult` label. Retrying a commit is safe because commits are idempotent at the server, but you must never blindly re-run the entire transaction body, because that could double-apply writes.

```javascript
try {
  await session.commitTransaction();
} catch (error) {
  if (error.hasErrorLabel("UnknownTransactionCommitResult")) {
    // The commit may have succeeded. Retry commitTransaction only,
    // never re-run the transaction body.
    await session.commitTransaction();
  } else {
    throw error;
  }
}
```

### 7. Avoid DDL and Blocking Operations Inside Transactions

Transactions cannot create, drop, or modify collections and indexes, and they cannot run administrative or user-management commands. Attempting DDL aborts the transaction. Plan schema changes outside transaction traffic, and design your transaction code so that every collection it touches already exists at runtime.

```javascript
// This aborts the transaction with an error:
await session.withTransaction(async () => {
  await db.createCollection("audit_log", { session }); // DDL not allowed in txn
  await db.collection("audit_log").insertOne({ kind: "order_placed" }, { session });
});
```

### 8. Respect Size and Time Limits

Beyond the 60-second runtime limit, transactions write to the oplog like any other operation: the total size of a transaction's writes is bounded by the **maximum oplog entry size (16 MB by default)** on MongoDB 4.0 deployments, and while later versions relax this constraint, very large transactions still put significant pressure on the oplog and on memory. If you need to bulk-apply thousands of writes atomically, question the design: often the same guarantee can be achieved with a single-document "batch job" document plus a versioned commit flag.

### 9. Use Causal Consistency to Chain Reads After Writes

Outside a single transaction, a read that immediately follows a write can be served by a secondary that has not yet replicated that write. Sessions provide **causal consistency**: when you run operations in the same session, later reads are guaranteed to see everything the session's earlier writes (and their dependencies) have done. This is the cheapest way to get read-your-writes guarantees across operations without wrapping everything in transactions.

```javascript
const session = client.startSession();
try {
  await profiles.updateOne({ _id: userId }, { $set: { name } }, { session });
  // This read is causally consistent with the write above:
  const profile = await profiles.findOne({ _id: userId }, { session });
} finally {
  await session.endSession();
}
```

### 10. Monitor Transactions Before Scaling Them

Transactions that abort often are a design smell. Track them like any other production signal: `db.currentOp()` shows running transactions with their `lsid` and `txnNumber`, and the `serverStatus` metrics expose transaction counts. Alert on a rising `WriteConflict` rate before users notice degraded latency. See Step 7 for the exact commands.

## Implementation Steps

### Step 1: Verify Prerequisites

Multi-document transactions require a replica set or a sharded cluster — **not** a standalone `mongod`. Confirm your environment, then connect with the Node.js driver. For a sharded cluster, run MongoDB 4.2+ and make sure every collection a transaction touches already exists.

```bash
# Check that you are talking to a replica set
mongosh --eval 'rs.status().ok'
# 1 means replica set mode; "NotYetInitialized" means the set exists but needs
# rs.initiate(). A standalone server throws "not running with --replSet".
```

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI, {
  retryWrites: true, // enables retryable writes on supported servers
});
await client.connect();
```

### Step 2: Run Your First Multi-Document Transaction

Use `session.withTransaction()` with the `updateMany`-style business operation. The classic example is a funds transfer: debit one account, credit another, atomically.

```javascript
async function transfer(client, fromId, toId, amount) {
  const db = client.db("banking");
  const accounts = db.collection("accounts");
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const debit = await accounts.updateOne(
        { _id: fromId, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { session }
      );
      if (debit.matchedCount === 0) {
        throw new Error("insufficient funds or account not found");
      }
      await accounts.updateOne(
        { _id: toId },
        { $inc: { balance: amount } },
        { session }
      );
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" }
    });

    console.log(`transfer ${fromId} -> ${toId} of ${amount} committed`);
  } finally {
    await session.endSession();
  }
}

await transfer(client, "alice", "bob", 100);
// If any step throws, the transaction is aborted and nothing is persisted.
```

Note the business rule encoded in the filter: `balance: { $gte: amount }` makes the check-and-debit atomic inside the transaction, so a double-spend cannot slip through even if two transfers race.

### Step 3: Handle Transient Errors and Write Conflicts

Even with `withTransaction`, you should understand and, where appropriate, observe the retry behavior. Run two concurrent transfers that touch the same document to see a `WriteConflict` aborted and retried:

```javascript
// Run these two in parallel with two separate clients/sessions
const [r1, r2] = await Promise.allSettled([
  transfer(clientA, "alice", "bob", 50),
  transfer(clientB, "alice", "carol", 30),
]);

// One of them may need several attempts before the driver's withTransaction
// retry loop succeeds. Inspect the outcome:
console.log(r1.status, r2.status);
// Both should eventually be "fulfilled"; a "rejected" result means the retry
// budget was exhausted (too many conflicts on a very hot document).
```

For manual transactions, wrap the flow in the retry loop from Best Practice 5 and log the error labels you observe:

```bash
# On the server side, watch conflict metrics while you hammer the same document:
mongosh --eval 'db.serverStatus().metrics.transactions'
```

### Step 4: Apply Optimistic Concurrency Control with Version Fields

Transactions do not prevent logical conflicts — they surface them as aborts. For read-modify-write flows where you want to detect stale updates without holding locks, add a `version` field and increment it on every write. The update matches on `version`; if the document changed underneath you, `matchedCount` is 0 and the caller decides whether to retry with the fresh version or surface a conflict to the user.

```javascript
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    const doc = await documents.findOne({ _id: docId }, { session });
    if (!doc) throw new Error("document not found");

    const result = await documents.updateOne(
      { _id: docId, version: doc.version },
      { $set: { content: newContent }, $inc: { version: 1 } },
      { session }
    );
    if (result.matchedCount === 0) {
      throw new Error("concurrent modification detected — reload and retry");
    }
  });
} finally {
  await session.endSession();
}
```

This pattern composes naturally with transactions: the conflict check, the write, and the version bump all commit atomically, and concurrent editors are told exactly which version they lost against.

### Step 5: Chain Transactions with Causal Consistency

When a business flow needs several transactions (each with its own snapshot) that must observe each other's writes, run them in the **same session**. Causal consistency guarantees that the second transaction's snapshot includes the first transaction's committed writes.

```javascript
const session = client.startSession();
try {
  // Transaction 1: create the order
  await session.withTransaction(async () => {
    await orders.insertOne(order, { session });
  }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });

  // Transaction 2: read the order back and update the customer profile.
  // Thanks to the shared session, this snapshot definitely contains order.
  await session.withTransaction(async () => {
    const created = await orders.findOne({ _id: order._id }, { session });
    await profiles.updateOne(
      { _id: customerId },
      { $push: { orderIds: created._id } },
      { session }
    );
  }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
} finally {
  await session.endSession();
}
```

Without the shared session, the second transaction could read from a secondary or an earlier snapshot that does not yet include the order — a classic distributed-systems bug.

### Step 6: Tune Concerns and Limits for Production

Set defaults at the client and server level so application code does not have to repeat them:

```javascript
const client = new MongoClient(uri, {
  retryWrites: true,
  writeConcern: { w: "majority", j: true },
  readConcern: { level: "snapshot" },
});
```

On the server, the default 60-second transaction lifetime can be raised for legitimate long-running administrative transactions — but treat any need to raise it as a red flag that transactions are doing too much:

```bash
# Inspect the current limit
mongosh --eval 'db.adminCommand({ getParameter: 1, transactionLifetimeLimitSeconds: 1 })'

# Raise it (advanced, with justification) — requires restart unless using setParameter
mongosh --eval 'db.adminCommand({ setParameter: 1, transactionLifetimeLimitSeconds: 300 })'
```

For sharded clusters, keep the transaction's `readPreference` at `primary` and remember that operations must target an existing collection; a transaction cannot create one on the fly.

### Step 7: Monitor Transaction Health

Use these commands to see live transactions and long-term metrics:

```bash
# Live view of any running transactions (including their lsid and txnNumber)
mongosh --eval 'db.currentOp({ "transaction": { $exists: true } })'

# Cumulative counters: started, committed, aborted, and conflict counts
mongosh --eval 'db.serverStatus().metrics.transactions'

# Slow transactions: look for "transaction" in the profiling log
mongosh --eval 'db.setProfilingLevel(1, { slowms: 100 })'
```

A healthy system aborts rarely. If `transactions.aborted` grows faster than `transactions.committed`, revisit Best Practices 3 and 5: the workload is either hammering hot documents or not retrying correctly. Track `totalTransactionsTimedOut` for transactions that exceed the lifetime limit — they are almost always the result of external I/O inside the transaction window.

## Conclusion

Multi-document transactions give MongoDB applications real ACID guarantees, but they are a concurrency tool, not a performance hack. The disciplines that keep them healthy are the same ones that keep any concurrent system healthy: keep critical sections short, minimize contention on shared documents, retry on transient errors with the correct semantics, and make commit handling idempotent. Combined with causal consistency for cross-transaction reads and optimistic version fields for logical conflict detection, MongoDB transactions cover the full spectrum from hard financial guarantees to optimistic collaborative workflows — as long as you design for the conflicts the storage engine will throw at you.

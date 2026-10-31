---
title: "Redis Transactions, Pipelining, and Atomicity Guide"
description: "Choose and implement the right Redis atomicity primitive: MULTI/EXEC batches, WATCH optimistic locking, Lua scripts and functions, pipelined round trips, distributed locks, and cluster-safe key design."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Redis Transactions, Pipelining, and Atomicity Guide

## Introduction

Redis runs commands one at a time on a single thread, so every individual command is atomic. That guarantee stops at the command boundary. A `GET`, an application-side comparison, and a `SET` are three separate operations with no isolation between them, so two clients doing this concurrently can both read the same value and both write a result derived from it. The classic read-modify-write race is a correctness bug, not a performance problem, and it survives every amount of client-side retry logic.

This guide covers the four mechanisms Redis gives you for closing that gap, and when each one is the right tool:

- `MULTI`/`EXEC` — queue several commands and execute them back-to-back without interleaving.
- `WATCH` — optimistic concurrency control that aborts a transaction when a watched key changed.
- Lua scripts and Redis Functions — server-side read-modify-write executed as a single atomic unit.
- Pipelining — fewer network round trips. A throughput tool that provides no atomicity whatsoever.

It also covers the operational half of the problem: locks with fencing tokens, retry loops that degrade instead of spinning, cluster-mode key design, and the instrumentation that tells you the difference between "contended" and "broken".

The central mistake this guide argues against is conflating pipelining with transactions. They optimize different things, fail differently, and substituting one for the other turns a latency optimization into a data-integrity incident.

## Best Practices

### 1. Remember that Redis has no rollback

`MULTI`/`EXEC` is a queue, not a SQL transaction. Commands are validated for syntax at queue time, then all executed at `EXEC` time; a command that fails at runtime (a type error on a wrongly typed key, `INCR` on a string) does not undo the commands that already succeeded. The rest of the batch still runs. Design so that each queued command either cannot fail or its failure is acceptable, and never rely on atomicity to mean "all or nothing".

### 2. Use `MULTI`/`EXEC` for batching stickiness, not for conditions

A transaction guarantees that nothing else runs between your commands. It cannot see intermediate results and branch on them — `EXEC` returns the whole reply array at the end. If you need "decrement only if the balance is sufficient", that is conditional logic and belongs in a Lua script or behind `WATCH`, not in a plain transaction.

### 3. Treat a failed `EXEC` under `WATCH` as expected traffic

When a watched key is modified by anyone else between `WATCH` and `EXEC`, `EXEC` returns `nil` and nothing is applied. This is normal under contention, not an error. Every `WATCH`-based flow needs a retry loop with a bounded attempt count, exponential backoff with jitter, and a domain-level failure after the last attempt instead of an unbounded spin.

### 4. Prefer a script for contract-level read-modify-write

If the operation is a business rule ("transfer credits", "claim the job if unclaimed"), encode it server-side with `EVAL`/`EVALSHA` or a Redis Function. One round trip, one atomic unit, no retry loop, and the rule lives in one place instead of in every client. The trade-off is that a slow script blocks the whole server, so keep scripts to simple data-structure operations.

### 5. Separate latency from correctness in your design reviews

Pipelining sends N commands without waiting for replies. It is faster because it removes round trips; it is not safer. A pipeline can be interleaved with other clients' commands between any two of its pieces. If a code reviewer cannot say which of your multi-command flows needs atomicity and which only needs speed, the design is not finished.

### 6. Keep transactions and scripts small

Redis is single-threaded per shard. A Lua script that loops over ten thousand keys or performs an O(N) `KEYS` scan pauses every other client for its duration. Keep scripts to a handful of key lookups, avoid loops over unbounded collections, and watch the `lua-time-limit` warning in the log: once exceeded, Redis starts answering other clients with `BUSY` and only `SCRIPT KILL` (for read-only scripts) or a restart recovers it.

### 7. Declare keys properly so cluster mode does not break you

In cluster mode, all keys touched by a transaction or script must map to the same hash slot, or Redis returns `CROSSSLOT`. Declare them in `KEYS` (scripts) so the client can route the call, and use hash tags — keys sharing a `{...}` substring hash only that substring — to co-locate genuinely related keys such as `{order:8842}:total` and `{order:8842}:state`.

### 8. Write scripts to be deterministic and idempotent where possible

Scripts may be re-executed on failover or after a replica promotion, and `EVALSHA` results can be affected by non-deterministic commands (`TIME`, `RANDOMKEY`, `SRANDMEMBER` with random semantics). Prefer passing time and random values in as `ARGV`. Where a script mutates state, make the operation safe to repeat: a compare-and-set is idempotent, an unconditional increment is not.

### 9. Never build a lock without a token, a TTL, and a fence

A lock is `SET key token NX PX ttl`. The token lets you release only your own lock (compare-and-delete in a script, never a bare `DEL`). The TTL prevents a crashed holder from blocking the resource forever. The fencing token — a monotonically increasing number the resource validates — is what actually protects you when a holder pauses past its TTL and a second holder proceeds. Redlock is only as strong as the underlying clocks; for correctness-critical resources, fence at the storage layer.

### 10. Instrument retries, script errors, and pipeline sizes

The signals that separate "healthy contention" from "broken design" are transaction retry counts, `WATCH` abort rates, script error rates, and slow-script warnings. Emit them per operation name, alert on retry-rate spikes, and alert immediately on `BUSY` responses or `lua-time-limit` log lines — those indicate a script that is blocking production traffic.

## Implementation Steps

### Step 1: Classify the operation before choosing a primitive

Write the requirement down as one of four shapes. The classification drives everything else.

```text
Shape                          Primitive                     Retry needed?
-----------------------------  ----------------------------  -------------
N independent writes, no       Pipeline (or MULTI if the     No
conditions between them        batch must not interleave)
Conditional read-modify-write  Lua script / Function         No (retried
                               or WATCH + EXEC               only for WATCH)
Multi-key invariant across     MULTI/EXEC, same slot         No
a small fixed key set
Cross-process mutual           SET NX PX + fencing token     Yes, at the
exclusion                                                    caller level
```

If two shapes apply, the stricter one wins: a flow that needs both speed and atomicity is a transaction, and its throughput is solved by batching at the application layer.

### Step 2: Group writes that must not interleave into a transaction

Use `MULTI` when the guarantee you need is "these commands run consecutively", for example keeping a counter and an index sorted set consistent.

```typescript
import Redis from "ioredis";

const redis = new Redis({ host: "127.0.0.1", port: 6379 });

async function recordVote(pollId: string, option: string): Promise<void> {
  const results = await redis
    .multi()
    .zincrby(`poll:${pollId}:tally`, 1, option)
    .incr(`poll:${pollId}:votes`)
    .exec();

  // exec() returns null when a WATCH aborted, or an array of [err, reply].
  if (results === null) {
    throw new Error(`vote transaction aborted for poll ${pollId}`);
  }

  for (const [err] of results) {
    if (err) {
      throw new Error(`vote transaction failed: ${err.message}`);
    }
  }
}
```

Note what this does *not* do: if `zincrby` fails on a wrongly typed key, `incr` still runs. The `for` loop surfaces the error to the caller, but the partial write is already applied — size transactions so a partial application is tolerable, or move the whole operation into a script.

### Step 3: Add optimistic concurrency with `WATCH` when the decision depends on current state

When the caller must read a value, decide, and write back, watch the key so a concurrent write invalidates your transaction instead of being silently overwritten. Always pair it with a bounded retry loop.

```typescript
async function reserveSeat(
  eventId: string,
  seats: number,
  maxAttempts = 8,
): Promise<boolean> {
  const key = `event:${eventId}:seats_left`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await redis.watch(key);
    const remaining = Number((await redis.get(key)) ?? "0");

    if (remaining < seats) {
      await redis.unwatch();
      return false;
    }

    const applied = await redis.multi().decrby(key, seats).exec();
    if (applied !== null) {
      return true;
    }

    // Aborted by a concurrent writer: back off with jitter, then re-read.
    const backoff = 5 * 2 ** attempt + Math.floor(Math.random() * 25);
    await new Promise((resolve) => setTimeout(resolve, backoff));
  }

  throw new Error(`seat reservation for event ${eventId} gave up after ${maxAttempts} attempts`);
}
```

`WATCH` is per connection: with a pooled client, the watch, read, and `EXEC` must run on the same connection. In `ioredis` a `multi()` chain inherits the connection, but a client-side round-robin pool will break the guarantee — use a dedicated connection or, better, skip to Step 4.

### Step 4: Move business rules into a Lua script

Scripts remove the retry loop entirely: the read, the check, and the write happen as one command, so no other client can interleave.

```lua
-- reserve_seats.lua
-- KEYS[1] = seats_left key
-- ARGV[1] = seats requested
local remaining = tonumber(redis.call("GET", KEYS[1]) or "0")
local requested = tonumber(ARGV[1])

if remaining < requested then
  return -1
end

return redis.call("DECRBY", KEYS[1], requested)
```

Register it once at startup and call it with `EVALSHA` afterwards; the script body then travels over the wire only once.

```typescript
import { readFileSync } from "node:fs";

const script = readFileSync("./lua/reserve_seats.lua", "utf8");
redis.defineCommand("reserveSeats", { numberOfKeys: 1, lua: script });

// Later: 1 key, 1 argument, one round trip, no retry loop.
const remaining = await (redis as any).reserveSeats(`event:${eventId}:seats_left`, seats);
if (remaining === -1) {
  throw new Error("sold out");
}
```

### Step 5: Promote hot scripts to Redis Functions

Redis 7 ships server-side functions: a named library of scripts that survives client disconnects and does not depend on the script cache staying warm after a `SCRIPT FLUSH` or a restart. Use them for rules that are called from multiple services.

```bash
redis-cli FUNCTION LOAD REPLACE "#!lua name=inventory
redis.register_function('claim_item', function(keys, args)
  local available = tonumber(redis.call('GET', keys[1]) or '0')
  local wanted = tonumber(args[1])
  if available < wanted then
    return -1
  end
  return redis.call('DECRBY', keys[1], wanted)
end)"
```

Call it with `FCALL claim_item 1 inventory:sku:42 3`. Because the library is versioned and replicated, a failover does not leave some nodes without the rule — the operational failure mode that `EVALSHA` hits when the script cache is empty under load.

### Step 6: Batch independent work with a pipeline, and keep it out of the correctness path

Pipelines exist to remove round trips. Use them for read fan-out and for writes that are genuinely independent — nothing in the batch depends on another element's reply.

```typescript
async function loadProducts(ids: string[]) {
  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.hgetall(`product:${id}`);
  }

  const replies = await pipeline.exec(); // one round trip for the whole batch
  if (replies === null) {
    throw new Error("pipeline produced no replies");
  }

  return replies.map(([err, value]) => {
    if (err) throw err;
    return value as Record<string, string>;
  });
}
```

A pipeline is not atomic: other clients' commands land between your elements. Everything you learned about ordering above still applies — if element 5 depends on element 4's write, it is a transaction, not a pipeline.

### Step 7: Build a lock that fails safely

When a cross-process lock is unavoidable, make the release conditional and pass a fence to the protected resource.

```typescript
import { randomUUID } from "node:crypto";

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

async function withLock<T>(
  resource: string,
  ttlMs: number,
  work: () => Promise<T>,
): Promise<T> {
  const key = `lock:${resource}`;
  const token = randomUUID();

  const acquired = await redis.set(key, token, "PX", ttlMs, "NX");
  if (acquired !== "OK") {
    throw new Error(`could not acquire lock ${resource}`);
  }

  try {
    return await work();
  } finally {
    // Only delete the lock if it is still ours: a bare DEL here can release
    // a lock that a second holder legitimately acquired after our TTL expired.
    await redis.eval(RELEASE_SCRIPT, 1, key, token);
  }
}
```

The `finally` block is not decoration. The most common production lock bug is a slow task that outlives its TTL, followed by the original holder deleting the *new* holder's lock, and two workers entering the critical section at once.

### Step 8: Make every transaction and script single-slot

Under Redis Cluster, a transaction or script that touches keys in different hash slots returns `CROSSSLOT`. Design the key layout so related keys share a slot, and keep the tag stable across the whole lifetime of the data.

```text
# Two slots: the transaction fails with CROSSSLOT
MULTI
DECR order:8842:remaining
INCR order:8842:reserved
EXEC

# One slot: both keys hash only "order:8842"
MULTI
DECR {order:8842}:remaining
INCR {order:8842}:reserved
EXEC
```

Hash tags concentrate data on one shard, so use them for entity-local invariants only — a single hot tag can pin an entire workload to one master.

### Step 9: Instrument contention before it becomes an incident

Emit a counter for every aborted transaction, every script error, and every lock acquisition failure, labelled by operation name. Then verify from the server side as well.

```bash
# Per-command call and error rates since the last INFO reset
redis-cli INFO commandstats | grep -E "cmdstat_(eval|evalsha|fcall|multi|exec)"

# Anything above ~10ms deserves a look; a Lua script over lua-time-limit is an incident
redis-cli SLOWLOG GET 10
redis-cli CONFIG GET slowlog-log-slower-than lua-time-limit busy-reply-threshold
```

Alert on a rising retry rate (a design smell: shorten the critical section, or move the rule into a script) and page on `BUSY` replies (a script is blocking the server).

### Step 10: Prove the guarantees under concurrency

Correctness claims about atomicity are only meaningful under load. Run the contested path with many concurrent clients and assert the invariant, not just the absence of errors.

```bash
# 50 concurrent connections, 16 commands per pipeline, 100k operations
redis-benchmark -h 127.0.0.1 -p 6379 -c 50 -P 16 -n 100000 -t set,get

# Then run your own invariant check: for a stock counter, reserved + sold
# must never exceed the initial quantity, and no value may go negative.
```

If the invariant holds under load and the retry rate stays flat as concurrency rises, the primitive is right. If retries grow linearly with concurrency, the critical section is too large — that is the signal to replace `WATCH` with a script.

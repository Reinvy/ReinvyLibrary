---
title: "Elysia.js Performance Tuning and Benchmarking Guide"
description: "How to measure, profile, and optimize an Elysia.js service on Bun: a reproducible benchmark harness, schema-validation cost, per-request allocations, Bun.serve tuning, caching, database round-trips, and CI regression gates."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Elysia.js Performance Tuning and Benchmarking Guide

## Introduction

Elysia advertises throughput numbers that most teams never reproduce, and the gap is rarely the framework. It is the handler that rebuilds a TypeBox schema on every request, the response that serializes an object graph three times, the `await` that fans out to four sequential queries, or the load test that ran on a laptop with `--watch` enabled and a debugger attached. Performance work on an Elysia service is therefore two disciplines braided together: a benchmark you can trust, and a ranked list of the costs actually present in your request path.

This guide assumes the application already works — routes, plugins, validation, and error handling are in place — and covers what to do when the p95 latency chart starts trending the wrong way. Every step produces a number you can compare before and after; no step asks you to accept a change on faith.

The optimizations here are ordered by measured impact in a typical Elysia service on Bun: schema validation, per-request allocation, serialization, server options, caching, and finally the database layer, which usually dominates all of the above combined.

## Best Practices

### Measure before you change anything

Every optimization is a hypothesis about where time goes, and most of those hypotheses are wrong. Capture a baseline — requests per second, p50, p95, p99, and resident memory — on the exact commit you intend to modify. Without that number, a "faster" implementation is indistinguishable from a regression that happens to feel better.

### Keep construction out of the request path

The single most common Elysia performance bug is work that belongs at module scope being executed per request: schemas defined inside the handler, regexes compiled inline, `new URL()` called repeatedly on the same string, configuration objects rebuilt on each call. Anything that depends only on code — not on the request — should be created once when the module loads.

### Make validation the cheapest part of the request

Elysia's TypeBox validation is fast because the schema compiles to a validator once. That guarantee breaks when you rebuild the schema per request, when you enable expensive coercion on every field, or when a `t.Union` of large object variants forces the validator to try every branch. Keep schemas as module constants, prefer discriminated unions over open unions, and reserve `t.Transform` for the few fields that genuinely need it.

### Prefer static routes and exact methods

Elysia compiles routes into an optimized router, but a path with parameters or wildcards still costs more than a literal one. Where a set of known values exists, `/v1/users/me` beats `/v1/users/:id` for the hot path. Grouping handlers in a named plugin also lets Elysia's type system and runtime reuse the compiled route table instead of re-registering it.

### Compile the artifact and warm it before you judge it

A cold JSC process is not representative. Compile with `bun build --compile` for production and run a warmup phase — several thousand requests — before the measurement window opens. Without warmup you are benchmarking the JIT, not the application.

### Bound the request before you handle it

`maxRequestBodySize` and `idleTimeout` are not only safety valves; they are performance controls. A handler that accepts an unbounded payload spends its budget on parsing and memory growth. Reject oversized requests at the server, and disable body parsing entirely on routes that only read headers.

### Cache at the layer closest to the data

The cheapest request is the one that never reaches the handler. Order your caching by risk: HTTP-level `Cache-Control` and ETags, then a short-TTL in-process cache for read-heavy derived data, then a shared cache such as Redis when multiple instances must agree. An in-process cache with no invalidation story is a correctness bug wearing a performance costume.

### Treat database round-trips as the real latency budget

In a service that touches a database, the handler's own CPU cost is usually a rounding error next to network round-trips. Count queries per request, remove N+1 loops, batch independent reads, and reuse prepared statements. A 10% improvement in validation matters far less than removing two sequential queries.

### Gate regressions in CI instead of rediscovering them

A performance number that only exists in a pull request description is lost within a week. Run the benchmark on every change to a hot path, compare against a committed baseline, and fail the build when p95 latency or throughput moves beyond an explicit tolerance. This is the only optimization that keeps working after the author of the optimization has moved on.

## Implementation Steps

### Step 1: Build a reproducible benchmark harness

Fix every input that can vary: concurrency, duration, payload size, CPU count, and the build mode. Run the load generator on a separate machine or at least a separate process, and never benchmark against a `--watch` server.

```typescript
// bench/server.ts — boot the app the same way production does
import { app } from '../src/index'

app.listen({ port: 3100, idleTimeout: 30, maxRequestBodySize: 1024 * 1024 })
console.log('bench server ready on :3100')
```

```bash
# Warm the JIT first, then measure a fixed window
bun run bench/server.ts &
npx autocannon -c 50 -d 5 http://localhost:3100/v1/users/me   # warmup
npx autocannon -c 50 -d 30 -j http://localhost:3100/v1/users/me > baseline.json
```

`-c 50` sets concurrent connections, `-d 30` the measurement window in seconds, and `-j` emits JSON so the numbers can be committed and compared mechanically. Keep a `bench/` folder with the harness in version control — a benchmark that lives in someone's shell history cannot gate a build.

### Step 2: Capture and record the baseline

Extract the three numbers that matter and store them next to the commit hash.

```bash
python3 - <<'PY'
import json, statistics
data = json.load(open('baseline.json'))
lat = data['latency']
print(f"rps={data['requests']['average']:.0f}")
print(f"p50={lat['p50']}ms p95={lat['p97_5']}ms p99={lat['p99']}ms max={lat['max']}ms")
print(f"errors={data['errors']} timeouts={data['timeouts']}")
PY
```

Record `rps`, `p95`, `p99`, and error rate. If errors or timeouts are non-zero, the run is invalid — investigate saturation before drawing conclusions. Save the file as `bench/baseline/<commit>.json` so the regression gate in Step 10 has something to compare against.

### Step 3: Profile the request path instead of guessing

Bun ships a CPU profiler and a heap profiler. Both write artifacts you can open in Chrome DevTools or `speedscope`.

```bash
# CPU profile: find the hot frames under real load
bun --cpu-prof --cpu-prof-dir=./prof bench/server.ts &
npx autocannon -c 50 -d 20 http://localhost:3100/v1/orders

# Heap profile: confirm whether allocation churn is driving GC pauses
bun --heap-prof --heap-prof-dir=./prof bench/server.ts &
```

Look for three specific patterns in the flame graph: validator compilation inside handler frames, `JSON.stringify` called more than once per request, and symbol or object creation in a loop. A profile that shows no framework frames above 5% is telling you the time is spent in your code or in I/O — tune accordingly.

### Step 4: Make schema validation a one-time cost

Schemas belong at module scope; referencing the same `t.Object` reference from several routes lets Elysia reuse the compiled validator.

```typescript
// src/schemas/order.ts — defined once, imported everywhere
import { t } from 'elysia'

export const OrderStatus = t.Union([
  t.Literal('pending'),
  t.Literal('paid'),
  t.Literal('shipped')
])

export const OrderBody = t.Object({
  items: t.Array(t.Object({ sku: t.String({ minLength: 1 }), qty: t.Integer({ minimum: 1 }) }), {
    minItems: 1,
    maxItems: 50
  }),
  coupon: t.Optional(t.String({ maxLength: 32 }))
}, { additionalProperties: false })
```

Two concrete wins follow from this shape. First, an open `t.Union` of object variants is evaluated branch by branch; a discriminated union keyed on a literal field short-circuits. Second, coercion (`t.Numeric`, `t.Boolean`) costs a parse per field — use it only on values that arrive as strings, and use `t.Integer` when the client already sends a number.

```typescript
// Avoid: recompiled per request, and coerces fields that are already typed
app.post('/orders', ({ body }) => createOrder(body as any), {
  body: t.Object({ qty: t.Numeric(), total: t.Numeric() })
})
```

### Step 5: Eliminate per-request construction

Walk the hot handler and move every value that does not depend on the request to module scope.

```typescript
// src/routes/users.ts
import { Elysia, t } from 'elysia'
import { UserParams, UserResponse } from '../schemas/user'
import { users } from '../repositories/users'

// Hoisted: created once at startup
const cacheControl = 'private, max-age=15'
const selectFields = { id: true, name: true, email: true } as const

export const userRoutes = new Elysia({ prefix: '/v1/users' })
  .get('/me', async ({ user, set }) => {
    set.headers['cache-control'] = cacheControl
    return users.findById(user.id, selectFields) // no schema rebuild, no config object
  }, { response: UserResponse })
  .get('/:id', async ({ params }) => users.findById(params.id, selectFields), {
    params: UserParams,
    response: UserResponse
  })
```

The second win here is `selectFields`: returning whole rows forces the serializer and the database to move columns the client never reads. Narrow projections are usually worth more than any micro-optimization in the handler body.

### Step 6: Tune the server options that bound work

`Bun.serve` accepts limits that Elysia passes through on `listen`. Set them deliberately rather than accepting defaults tuned for general use.

```typescript
app.listen({
  port: Number(process.env.PORT ?? 3000),
  idleTimeout: 30,                        // seconds; drop idle keep-alive sockets
  maxRequestBodySize: 2 * 1024 * 1024,    // reject large bodies before parsing
  development: false                      // no verbose error overlays in production
})
```

For services that also serve WebSockets, do not enable per-message deflate for small high-frequency frames — the compression cost exceeds the bandwidth saved. And if a route never reads a body, prefer `GET` semantics over accepting and discarding an upload.

### Step 7: Add a cache with an explicit invalidation story

Cache only data whose staleness you can bound in time or events.

```typescript
// src/cache/ttl.ts — bounded in-process cache, no unbounded growth
type Entry<T> = { value: T; expires: number }

export function createTtlCache<T>(ttlMs: number, maxEntries = 5_000) {
  const store = new Map<string, Entry<T>>()
  return {
    get(key: string): T | undefined {
      const hit = store.get(key)
      if (!hit) return undefined
      if (hit.expires < Date.now()) {
        store.delete(key)
        return undefined
      }
      return hit.value
    },
    set(key: string, value: T) {
      if (store.size >= maxEntries) store.delete(store.keys().next().value as string)
      store.set(key, { value, expires: Date.now() + ttlMs })
    }
  }
}
```

A capped map with a TTL keeps memory predictable and eviction cheap. Pair it with `ETag` + `If-None-Match` responses on public reads so clients stop paying for bytes they already have, and use Redis when several instances must invalidate together.

### Step 8: Attack the database layer

Count queries per request before touching anything else. A single N+1 loop will outweigh every other item in this guide.

```typescript
// Before: one query per order, plus one per customer
const orders = await db.order.findMany({ where: { userId } })
for (const order of orders) order.customer = await db.customer.findUnique({ where: { id: order.customerId } })

// After: one query with a join, narrow projection, prepared statement
const orders = await db.order.findMany({
  where: { userId },
  select: { id: true, total: true, status: true, customer: { select: { id: true, name: true } } }
})
```

Then check the pool: a pool smaller than your concurrency starves the event loop under load, while a pool larger than the database's connection limit produces timeouts that look like application errors. Size it to the database's capacity, not to the number of requests you hope to serve.

### Step 9: Ship the compiled artifact and re-measure

Run the benchmark again against the production build, not the development server.

```bash
bun build --compile --target=bun-linux-x64-modern src/index.ts --outfile dist/api
./dist/api &
npx autocannon -c 50 -d 30 -j http://localhost:3000/v1/users/me > after.json
```

Compare `after.json` against the baseline from Step 2 and attribute each delta to one change. If a change did not move a number, revert it — unmeasured complexity is a cost with no return. On memory-constrained instances, `bun --smol` trades some throughput for a smaller heap and is worth measuring separately rather than assuming.

### Step 10: Gate the improvement in CI

Turn the baseline into a build condition so the win survives future pull requests.

```yaml
# .github/workflows/bench.yml
name: bench
on: [pull_request]
jobs:
  measure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run bench/harness.ts --out after.json
      - run: python3 bench/compare.py bench/baseline/main.json after.json --p95-tolerance 0.10
```

`compare.py` should exit non-zero when p95 latency grows past the tolerance or throughput drops below it. Keep the tolerance loose enough to survive noisy shared runners — 10% is a reasonable start — and refuse to merge on a real regression. Record every accepted baseline change in the pull request that caused it, so the history explains itself.

### Step 11: Document the wins and the cost

Close the loop by writing down what changed, what it bought, and what it cost in complexity. A short table in the pull request is enough, and it prevents a future contributor from re-introducing the code you just removed.

```text
| Change                          | p95 before | p95 after | Note                          |
|---------------------------------|------------|-----------|-------------------------------|
| Module-scope schemas            | 41 ms      | 33 ms     | reusable compiled validators  |
| Narrowed select projections     | 33 ms      | 24 ms     | 40% fewer columns transferred |
| TTL cache on catalog reads      | 24 ms      | 9 ms      | 15s TTL, event-invalidated    |
| Compiled binary deployment      | 9 ms       | 8 ms      | removes runtime transpile     |
```

Note honestly which changes moved nothing. A tuning guide that only reports successes teaches the next engineer to cargo-cult the failures.

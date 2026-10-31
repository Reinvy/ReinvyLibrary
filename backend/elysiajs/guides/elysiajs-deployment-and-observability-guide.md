---
title: "Elysia.js Deployment and Observability Guide"
description: "A practical guide to shipping Elysia.js services on Bun: production builds, graceful shutdown, structured logs with request ids, Prometheus metrics, health probes, and tracing."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Elysia.js Deployment and Observability Guide

## Introduction

An Elysia app that passes `bun test` is not yet a service you can operate. Between the two sit the decisions that decide whether an incident is a five-minute fix or a two-hour guess: how the artifact is built, whether in-flight requests survive a deploy, what a log line actually contains, and whether the readiness probe tells the load balancer the truth.

This guide covers the operational half of an Elysia service on Bun, assuming routes, plugins, and error handling already exist. Every snippet drops into `src/index.ts` or a `src/observability/` folder and gets hardened from there.

## Best Practices

### Build one artifact and run it unchanged

Compile with `bun build` in CI and deploy the output. Booting `bun --watch src/index.ts` in production transpiles TypeScript on every start and ships sources, tests, and dev dependencies into the image.

### Log structured events, not sentences

Emit JSON with a fixed field set — `level`, `msg`, `requestId`, `method`, `path`, `status`, `durationMs`. Free-form text cannot be filtered at 3 a.m. Generate the id at the edge and echo it in `x-request-id` so a support ticket maps to a log line.

### Drain before you exit

On `SIGTERM`: stop accepting connections, let in-flight requests finish, flush logs, exit. Without it every rolling deploy drops requests. Keep the drain deadline below the orchestrator's kill timeout so your exit code stays informative.

## Implementation Steps

### Step 1: Produce a production build

```bash
# Compile a self-contained binary for the target platform
bun build --compile --target=bun-linux-x64-modern src/index.ts --outfile dist/api

# Boot the artifact with no source tree present
./dist/api & curl -sf http://localhost:3000/healthz && echo "boot ok"
```

The binary embeds the Bun runtime, so the image needs only the binary plus a CA bundle. Build per architecture (`bun-linux-arm64`) on mixed nodes.

### Step 2: Wire graceful shutdown

```typescript
// src/lifecycle.ts
import type { Elysia } from 'elysia'

export function registerShutdown(app: Elysia, drainMs = 10_000) {
  let closing = false
  const shutdown = async (signal: string) => {
    if (closing) return
    closing = true
    const timer = setTimeout(() => process.exit(1), drainMs)
    try {
      await app.stop() // stop accepting, wait for in-flight handlers
      clearTimeout(timer)
      console.log(JSON.stringify({ level: 'info', msg: 'shutdown:done', signal }))
      process.exit(0)
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', msg: 'shutdown:failed', error: String(error) }))
      process.exit(1)
    }
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}
```

### Step 3: Log every request with a correlation id

```typescript
// src/observability/logger.ts
import { Elysia } from 'elysia'
import pino from 'pino'

export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })

export const requestLogger = new Elysia({ name: 'request-logger' })
  .derive({ as: 'global' }, ({ request, set }) => {
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
    set.headers['x-request-id'] = requestId
    return { requestId, log: logger.child({ requestId }) }
  })
  .onAfterResponse({ as: 'global' }, ({ request, set, requestId, log }) =>
    log.info({ method: request.method, path: new URL(request.url).pathname, status: set.status ?? 200 }, 'request')
  )
  .as('global')
```

`derive` runs before handlers, so downstream plugins see typed `requestId` and `log` on the context. Logging in `onAfterResponse` means the status code is already final.

### Step 4: Expose Prometheus metrics

```typescript
// src/observability/metrics.ts
import { Elysia } from 'elysia'
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client'

const registry = new Registry()
collectDefaultMetrics({ register: registry })
const labels = ['method', 'route', 'status']

export const httpRequests = new Counter({
  name: 'http_requests_total', help: 'Total HTTP requests', labelNames: labels, registers: [registry]
})
export const httpDuration = new Histogram({
  name: 'http_request_duration_seconds', help: 'Request duration', labelNames: labels,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5], registers: [registry]
})

export const metricsPlugin = new Elysia({ name: 'metrics' }).get('/metrics', ({ set }) => {
  set.headers['content-type'] = registry.contentType
  return registry.metrics()
})
```

Buckets should follow your SLO; the set above suits a p95 target near 250 ms. Keep `/metrics` on an internal listener or behind a network policy.

### Step 5: Split health endpoints

```typescript
// src/observability/health.ts
import { Elysia } from 'elysia'

const within = (ms: number) => new Promise<boolean>((r) => setTimeout(() => r(false), ms))

export const healthPlugin = new Elysia({ name: 'health' })
  .get('/healthz', () => ({ status: 'ok' })) // liveness: no dependency checks
  .get('/readyz', async ({ db, cache, status }) => {
    const [dbOk, cacheOk] = await Promise.all([
      Promise.race([db.query('select 1').then(() => true), within(750)]),
      Promise.race([cache.ping().then(() => true), within(750)])
    ])
    if (!dbOk || !cacheOk) return status(503, { status: 'degraded', db: dbOk, cache: cacheOk })
    return { status: 'ok', db: true, cache: true }
  })
```

Mount both before any auth guard and hide them from the public spec with `detail: { hide: true }`. A readiness endpoint that waits forever is worse than none — always race it against a timeout.

### Step 6: Trace across services

Elysia runs on Bun, so start `NodeSDK` from `@opentelemetry/sdk-node` with an `OTLPTraceExporter` pointed at your collector before the app is constructed, and shut it down inside `registerShutdown`, or the final spans are dropped. Auto-instrumentation coverage on Bun is uneven: if HTTP spans never appear, wrap handlers manually with `tracer.startActiveSpan` from `@opentelemetry/api` instead of debugging the instrumentation layer.

### Step 7: Package the artifact

```dockerfile
FROM oven/bun:1-debian AS build
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build --compile --target=bun-linux-x64-modern src/index.ts --outfile dist/api

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl && useradd --system --uid 10001 app
COPY --from=build /app/dist/api /usr/local/bin/api
USER app
HEALTHCHECK --interval=10s --timeout=2s CMD curl -fsS http://localhost:3000/healthz || exit 1
ENTRYPOINT ["/usr/local/bin/api"]
```

Then verify what your platform will check: boot with a bad `DATABASE_URL` and confirm a non-zero exit with a clear message, and send `SIGTERM` under load to confirm zero failed requests plus a `shutdown:done` line.

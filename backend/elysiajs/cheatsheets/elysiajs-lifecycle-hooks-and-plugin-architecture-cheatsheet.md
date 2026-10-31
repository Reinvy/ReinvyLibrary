---
title: "Elysia.js Lifecycle Hooks and Plugin Architecture Cheatsheet"
description: "A deep reference for Elysia.js request lifecycle phases and their execution order, derive versus resolve, hook scoping with as(), macros, plugin identity through name and seed, lazy loading, guard composition, and response mapping in production Bun services."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Elysia.js Lifecycle Hooks and Plugin Architecture Cheatsheet

Elysia's speed comes from its lifecycle: a fixed, ordered pipeline where every hook is a compile-time candidate for inlining. That same fixed ordering is what makes large Elysia codebases either elegantly composable or completely opaque. This cheatsheet is a reference for the hooks themselves, the phases they run in, and the plugin rules that decide whether a hook fires once, twice, or never. It assumes you already know routing and TypeBox schemas; the focus is composition and ordering.

## Quick Reference Table

| Hook / API | Runs at | Primary use |
|------------|---------|-------------|
| `onRequest` | Before anything is parsed | Raw request inspection, early rejection, request IDs |
| `onParse` | Body parsing is in progress | Custom content types, signing checks over the raw body |
| `onTransform` | After parsing, before validation | Normalising payloads and headers into context |
| `derive` | Before validation | Cheap synchronous context values derived from headers |
| `resolve` | After validation | Validated context values, database lookups, session loading |
| `onBeforeHandle` | After validation, before the handler | Authorisation gates, rate limits, tenant resolution |
| `onAfterHandle` | After the handler returns | Response enrichment, logging, cache writes |
| `mapResponse` | Response is being serialised | Custom serialisers, header injection, compression decisions |
| `onAfterResponse` | Response has been sent | Metrics, audit trails, fire-and-forget work |
| `onError` | When any phase throws | Central error mapping, correlated error responses |
| `onStart` | Server starts listening | Warm caches, connection pools, background workers |
| `onStop` | Server is shutting down | Graceful draining, flushing queues |
| `macro` | Route definition time | Reusable per-route behaviour with coercible options |
| `macro` with `resolve` | Request time, after validation | Macros that need request data, not just options |
| `.as('scoped')` | Hook declaration | Share a hook with the parent instance only |
| `.as('global')` | Hook declaration | Share a hook with the root instance and every descendant |
| `new Elysia({ name })` | Plugin creation | Grants plugin identity so it is mounted only once |
| `new Elysia({ seed })` | Plugin creation | Per-mount configuration for a named plugin |
| `Elysia.lazy` | Plugin creation | Deferred registration of a heavy plugin module |
| `$.decorator` | Plugin factory | Flattened plugin trees without duplicate decorators |
| `guard({ ... })` | Route definition time | Apply hooks, schemas, and error handlers to a route group |
| `trace` | Request time, opt-in | Step-by-step lifecycle timings during debugging |

## Common Commands

### Scaffolding a Plugin Module

```bash
# Create a plugin directory
mkdir -p src/plugins/auth src/plugins/rate-limit

# Generate a plugin file and its test side by side
touch src/plugins/auth/index.ts src/plugins/auth/index.test.ts

# Install the plugins used throughout this cheatsheet
bun add elysia @elysiajs/bearer @elysiajs/cors @elysiajs/opentelemetry

# Optional: schema-aware plugin contracts
bun add -d @sinclair/typebox
```

### Running and Type-Checking the App

```bash
# Development with hot reload
bun --watch src/index.ts

# Type-check the whole plugin graph before shipping
bunx tsc --noEmit

# Run the lifecycle and plugin tests
bun test src/plugins

# Run a single lifecycle test with verbose output
bun test src/plugins/auth/index.test.ts --rerun-each 1
```

### Inspecting Hook Order at Runtime

```bash
# Turn on Elysia's lifecycle tracing for one boot
ELYSIA_TRACE=true bun run src/index.ts

# Count how many times a plugin is actually mounted
grep -rn "new Elysia({" src/plugins | wc -l

# Find hooks that leak into every route
grep -rn "as('global')" src/plugins

# Find anonymous plugins (no name means no deduplication)
grep -rn "new Elysia()" src/plugins
```

## Code Snippets

### Canonical Lifecycle Order

```typescript
import { Elysia } from 'elysia';

const app = new Elysia()
  .onRequest(({ request }) => {
    console.log('1 onRequest', request.method);
  })
  .onParse(async ({ request, contentType }) => {
    console.log('2 onParse', contentType);
  })
  .onTransform(({ body }) => {
    console.log('3 onTransform');
  })
  .derive(() => {
    console.log('4 derive');
    return { startedAt: performance.now() };
  })
  .resolve(({ startedAt }) => {
    console.log('5 resolve');
    return { elapsed: () => performance.now() - startedAt };
  })
  .onBeforeHandle(() => {
    console.log('6 onBeforeHandle');
  })
  .get('/', () => {
    console.log('7 handler');
    return { ok: true };
  })
  .onAfterHandle(() => {
    console.log('8 onAfterHandle');
  })
  .mapResponse(({ response }) => {
    console.log('9 mapResponse');
    return response;
  })
  .onAfterResponse(() => {
    console.log('10 onAfterResponse');
  });

app.listen(3000);
```

The order is the contract. Anything that must see a validated body belongs in `onBeforeHandle` or `resolve`, never in `onTransform` — validation has not run yet at that point.

### Reading Raw Bodies with onParse

`onParse` exists so you can own content types Elysia does not parse for you. It also lets you inspect a payload before it becomes a JavaScript object, which is the only place signature verification is meaningful.

```typescript
import { Elysia } from 'elysia';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const signedPayload = new Elysia({ name: 'signed-payload' })
  .onParse(async ({ request, contentType }) => {
    if (contentType !== 'application/x-signed') return;

    const raw = await request.text();
    const signature = request.headers.get('x-signature') ?? '';
    const expected = createHmac('sha256', Bun.env.SIGNING_SECRET ?? '')
      .update(raw)
      .digest('hex');

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    const valid = a.length === b.length && timingSafeEqual(a, b);

    if (!valid) {
      throw new Error('SIGNATURE_INVALID');
    }

    // Returning a value replaces parsed body
    return JSON.parse(raw);
  });
```

Returning `undefined` from `onParse` hands control back to the default parser, so multiple parsers can coexist safely.

### derive versus resolve

```typescript
import { Elysia, t } from 'elysia';

export const sessionContext = new Elysia({ name: 'session-context' })
  // derive runs BEFORE validation: only touch headers and params
  .derive(({ request }) => ({
    requestId: request.headers.get('x-request-id') ?? crypto.randomUUID(),
    userAgent: request.headers.get('user-agent') ?? 'unknown'
  }))
  // resolve runs AFTER validation: body and query are safe to read
  .resolve(async ({ request, params, status }) => {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return status(401, { error: 'MISSING_TOKEN' });
    }

    const session = await verifyToken(token);

    if (!session) {
      return status(401, { error: 'INVALID_TOKEN' });
    }

    return { session };
  })
  .get('/me/:id', ({ session, requestId, params }) => ({
    requestId,
    userId: params.id,
    tenant: session.tenantId
  }), {
    params: t.Object({ id: t.String() })
  });
```

Returning a `status()` value from `resolve` short-circuits the pipeline — the handler never runs — which is exactly the behaviour you want from an authentication gate.

### Scoped Hooks with as

By default a hook is local: it applies to routes declared after it on the same instance. `.as('scoped')` pushes it to the parent instance. `.as('global')` pushes it to the root instance.

```typescript
import { Elysia } from 'elysia';

const timing = new Elysia({ name: 'timing' })
  .onRequest(({ request }) => {
    (request as Request & { startedAt: number }).startedAt = performance.now();
  })
  // Export to the direct parent only
  .as('scoped');

const api = new Elysia({ prefix: '/api' })
  .use(timing)
  .get('/items', () => ({ items: [] }));

const root = new Elysia()
  .use(api)
  .get('/health', () => ({ ok: true }));
```

`timing` covers `/api/items` but not `/health`, because `scoped` stops at the instance that mounted it. If you need the hook everywhere, declare the same hook with `.as('global')` on the root plugin — and then audit every route, because "global" is the single most common source of duplicate side effects in Elysia apps.

### Macros for Reusable Route Guards

```typescript
import { Elysia, t } from 'elysia';

export const policy = new Elysia({ name: 'policy' })
  .macro({
    // Enable with: { permission: 'billing:read' }
    permission(permission: string) {
      return {
        beforeHandle({ session, status }) {
          if (!session.roles.includes(permission)) {
            return status(403, { error: 'FORBIDDEN', permission });
          }
        }
      };
    },

    // Macro that needs request data: declare `resolve` instead of `beforeHandle`
    tenantScoped: {
      resolve({ session, params, status }) {
        if (session.tenantId !== params.tenantId) {
          return status(404, { error: 'TENANT_NOT_FOUND' });
        }
        return { tenantId: session.tenantId };
      }
    }
  });

const app = new Elysia()
  .use(sessionContext)
  .use(policy)
  .get('/invoices', ({ tenantId }) => ({ tenantId, invoices: [] }), {
    tenantScoped: true,
    params: t.Object({ tenantId: t.String() })
  })
  .delete('/invoices/:id', ({ status }) => status(204), {
    permission: 'billing:write',
    params: t.Object({ id: t.String() })
  });
```

Prefer macros over global `onBeforeHandle` for anything conditional. A macro is opt-in at the route, greppable by name, and shows up in the route's own definition instead of hiding three files away.

### Plugin Identity and Deduplication

```typescript
import { Elysia } from 'elysia';

// Named plugin: mounting it twice is a no-op after the first mount
export const logger = new Elysia({ name: 'logger' })
  .decorate('log', (event: string, data?: unknown) => {
    console.log(JSON.stringify({ event, data, at: Date.now() }));
  })
  .onAfterResponse(({ log, request }) => {
    log('http', { url: request.url });
  });

// Anonymous plugin: every mount creates a NEW decorator and hook set
export const untracked = new Elysia()
  .decorate('trace', (msg: string) => console.log(msg));
```

Deduplication is keyed on `name`, not on the module path or the value. Two plugins sharing a `name` are treated as the same plugin, so a library and your local fork of it that both call themselves `logger` will silently collapse into one. Namespace names for anything you publish.

### Seeding Plugin Configuration

```typescript
import { Elysia } from 'elysia';

interface CacheConfig {
  ttl: number;
  prefix: string;
}

export const cache = (config: CacheConfig) =>
  new Elysia({
    name: 'cache',
    seed: config
  })
    .decorate('cache', {
      key(id: string) {
        return `${config.prefix}:${id}`;
      },
      async get<T>(id: string): Promise<T | null> {
        const hit = await redis.get(config.prefix + ':' + id);
        return hit ? (JSON.parse(hit) as T) : null;
      },
      async set(id: string, value: unknown) {
        await redis.set(config.prefix + ':' + id, JSON.stringify(value), 'EX', config.ttl);
      }
    });

// Two mounts, two configurations, one deduplicated plugin identity
const app = new Elysia()
  .use(cache({ ttl: 30, prefix: 'short' }))
  .use(cache({ ttl: 3600, prefix: 'long' }));
```

`seed` is what makes a named plugin safely configurable. Without it, the second `use()` would be ignored entirely and the first configuration would silently win.

### Lazy-Loaded Plugins

```typescript
import { Elysia } from 'elysia';

// Heavy plugin evaluated only when the module is imported
export const reporting = Elysia.lazy(() =>
  import('./reporting').then(({ reportingPlugin }) => reportingPlugin)
);

// Conditional plugin: only register when a dependency exists
const otel = Elysia.lazy(async () => {
  if (!Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return new Elysia({ name: 'otel-disabled' });
  }

  const { opentelemetry } = await import('@elysiajs/opentelemetry');
  return opentelemetry();
});

const app = new Elysia()
  .use(otel)
  .use(reporting)
  .get('/health', () => ({ ok: true }));
```

Lazy plugins resolve at boot rather than at import time. They are the right tool for optional observability, feature-flagged modules, and anything that pulls a large dependency you do not want in the cold-start path.

### Guard Composition for Route Groups

```typescript
import { Elysia, t } from 'elysia';

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .guard({
    headers: t.Object({
      authorization: t.String({ minLength: 8 })
    }),
    beforeHandle({ headers, status }) {
      if (!headers.authorization.startsWith('Bearer ')) {
        return status(401, { error: 'BEARER_REQUIRED' });
      }
    },
    detail: { tags: ['Admin'] }
  })
  .get('/stats', ({ session }) => ({ session, stats: {} }))
  // A second guard composes: nested routes inherit both layers
  .guard({
    beforeHandle({ session, status }) {
      if (!session.isAdmin) {
        return status(403, { error: 'ADMIN_ONLY' });
      }
    }
  })
  .post('/keys', ({ status }) => status(201, { created: true }), {
    body: t.Object({ label: t.String() })
  });
```

Guards nest outward-in: the outer guard's hooks run first, then the inner guard's, then the route's own hooks. Keep guards for invariants that genuinely apply to a whole subtree; anything route-specific belongs in a macro.

### Response Mapping and Header Injection

```typescript
import { Elysia } from 'elysia';

const app = new Elysia()
  .onAfterHandle(({ set, response }) => {
    set.headers['x-content-type-options'] = 'nosniff';
    return response;
  })
  .mapResponse(({ response, set, path }) => {
    // Only touch JSON responses; leave streams and files alone
    if (path.startsWith('/files')) return response;

    return new Response(
      JSON.stringify({ data: response }),
      {
        headers: {
          ...set.headers,
          'content-type': 'application/json; charset=utf-8'
        }
      }
    );
  });
```

`mapResponse` sees whatever the handler produced, including a `status()` object, so it must handle every shape. Returning `undefined` falls through to the next mapper, which is a clean way to layer mappers without fighting each other.

### Error Handling Inside the Lifecycle

```typescript
import { Elysia } from 'elysia';

class DomainError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string
  ) {
    super(message);
  }
}

const errors = new Elysia({ name: 'errors' })
  .onError(({ error, code, set, request }) => {
    const requestId = request.headers.get('x-request-id') ?? 'unknown';

    if (error instanceof DomainError) {
      set.status = error.status;
      return { code: error.code, message: error.message, requestId };
    }

    if (code === 'VALIDATION') {
      set.status = 422;
      return { code: 'VALIDATION_FAILED', message: error.message, requestId };
    }

    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { code: 'NOT_FOUND', message: 'Route does not exist', requestId };
    }

    console.error({ requestId, error });
    set.status = 500;
    return { code: 'INTERNAL', message: 'Unexpected error', requestId };
  })
  .as('global');
```

`onError` is the only hook that receives Elysia's `code` string, which distinguishes framework-level failures (`VALIDATION`, `NOT_FOUND`, `PARSE`) from your own thrown errors. Branch on `code` first and on error type second — that ordering keeps validation errors from being reported as 500s.

### WebSocket Lifecycle Hooks

```typescript
import { Elysia, t } from 'elysia';

const app = new Elysia()
  .use(sessionContext)
  .ws('/ws', {
    // Runs once per connection, before any message
    beforeHandle({ data, status }) {
      if (!data.headers.authorization) {
        return status(401);
      }
    },
    open(ws) {
      ws.subscribe('broadcast');
      ws.send({ type: 'ready' });
    },
    message(ws, message) {
      // Validation via schema below guarantees the shape here
      ws.publish('broadcast', { type: 'chat', text: message.text });
    },
    drain(ws) {
      // Backpressure relieved — safe to resume producing
      ws.send({ type: 'resumed' });
    },
    close(ws, code, reason) {
      ws.unsubscribe('broadcast');
      console.log('closed', code, reason);
    },
    body: t.Object({
      text: t.String({ minLength: 1 })
    })
  });
```

WebSocket routes accept the same `beforeHandle` / `resolve` gates as HTTP routes, so authorisation logic can be shared verbatim between the two transports.

### Shutdown Hooks for Graceful Draining

```typescript
import { Elysia } from 'elysia';

const app = new Elysia()
  .onStart(async ({ server }) => {
    await redis.connect();
    console.log('started on port', server?.port);
  })
  .onStop(async () => {
    // Stop accepting new work, then drain
    await queue.pause();
    await queue.drain();
    await redis.quit();
    console.log('drained and stopped');
  })
  .get('/health', () => ({ ok: true }));

// Wire container signals to Elysia's stop lifecycle
process.on('SIGTERM', () => app.stop());
process.on('SIGINT', () => app.stop());
```

`onStop` is where in-flight background work belongs. Without it, a rolling deploy will drop queued jobs and half-finished writes while the old container exits.

---
title: "Elysia.js Production Patterns Guide"
description: "A comprehensive guide to production-grade Elysia.js application patterns including plugin architecture, middleware composition, error handling, validation, and deployment strategies."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Elysia.js Production Patterns Guide

## Introduction

Elysia.js is a high-performance Bun-native web framework designed for TypeScript-first development with end-to-end type safety. Its plugin system, lifecycle hooks, and TypeBox-based validation make it an excellent choice for production applications. This guide covers battle-tested patterns for building maintainable, secure, and performant Elysia APIs at scale.

Unlike traditional Express.js applications that rely heavily on middleware chaining and mutable request objects, Elysia introduces a structured plugin architecture, typed context with `decorate()` and `derive()`, and runtime validation via TypeBox schemas. These features shift the development paradigm from "just a router" to a full-featured application framework with built-in OpenAPI generation.

## Best Practices

### Plugin-based Modular Architecture

Organize features as isolated plugins with their own routes, hooks, and state. Each plugin encapsulates a bounded context, making the codebase testable, independently deployable, and easy to reason about.

```typescript
// Each plugin is a self-contained unit
import { Elysia } from 'elysia'

export const healthPlugin = (app: Elysia) =>
  app.get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
  }))
```

**Key rules**:
- Use `Elysia({ prefix: '/api/v1/users' })` for route scoping within plugins.
- Never share mutable state between plugins — use `decorate()` for shared resources.
- Keep each plugin file under 200 lines; split large plugins into sub-plugins.
- Export the `App` type from `src/index.ts` for Eden Treaty client generation.

### TypeBox Validation for Runtime Safety

Define all input schemas with `@sinclair/typebox` and pass them to `body()`, `query()`, `params()`, or `headers()` guards. This generates OpenAPI schemas automatically and provides strict runtime validation with zero manual schema maintenance.

```typescript
import { t } from 'elysia'

export const PaginationSchema = t.Object({
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
  sort: t.Optional(t.String())
})
```

**Benefits**: The TypeBox schema serves as a single source of truth — it validates input, types the handler parameters, and feeds the OpenAPI/Swagger documentation — eliminating the DTO duplication common in Express.js applications.

### Guard-based Authorization

Implement reusable guard functions for authentication and authorization using the `.guard()` group method. This applies middleware to route groups without duplicating logic.

```typescript
app.group('/admin', (app) =>
  app
    .guard((app) =>
      app
        .use(adminGuard)
        .get('/dashboard', dashboardHandler)
        .get('/metrics', metricsHandler)
    )
)
```

**Pattern**: Place authorization guards as close to the route as possible. Avoid global guards that apply to every route — not all endpoints need authentication.

### Centralized Error Handling with Typed Errors

Create a global error handler with `.onError()` that catches all errors, maps them to structured HTTP responses, and logs appropriately. Use typed `AppError` classes for predictable error flows.

```typescript
app.onError(({ error, code, set }) => {
  if (code === 'NOT_FOUND') {
    set.status = 404
    return { success: false, message: 'Route not found' }
  }
  // Structured response for all error types
  set.status = 500
  return { success: false, message: 'Internal server error' }
})
```

### Lifecycle Hook Discipline

Use Elysia's lifecycle hooks consistently for cross-cutting concerns:

- `onBeforeHandle` — request logging, rate limiting, request validation setup
- `onAfterHandle` — response transformation, audit trails
- `onResponse` — metric collection, response time tracking
- `onError` — structured error responses, error reporting services

```typescript
app.onBeforeHandle(({ request }) => {
  console.log(`→ ${request.method} ${request.url}`)
})

app.onResponse(({ response, set }) => {
  set.headers['X-Response-Time'] = `${performance.now()}ms`
})
```

### Eden Treaty for Type-Safe Clients

Generate a type-safe client with Eden Treaty to eliminate manual API client maintenance. When the server schema changes, the client types update automatically.

```typescript
// server/src/index.ts
const app = new Elysia().use(usersPlugin).listen(3000)
export type App = typeof app

// client/src/api.ts
import { edenTreaty } from '@elysiajs/eden'
import type { App } from '../server/src'

const api = edenTreaty<App>('http://localhost:3000')
const { data, error } = await api.users.index.get({ query: { page: 1 } })
// data is fully typed!
```

### Structured Dependency Injection

Use `decorate()` to inject shared dependencies (database connections, caches, configurations) into the Elysia context. This keeps route handlers clean, testable, and decoupled from instantiation logic.

```typescript
app.decorate('db', pool)
app.decorate('config', env)
app.decorate('cache', redisClient)
```

### Graceful Shutdown

Register signal handlers that close database connections, stop background jobs, and flush logs before exiting. This prevents data corruption and ensures zero-downtime deployments.

```typescript
process.on('SIGTERM', async () => {
  await app.stop()
  await pool.end()
  process.exit(0)
})
```

## Implementation Steps

### Step 1: Scaffold the Project

Create a feature-based directory structure and set up the main entry point:

```text
src/
  plugins/
    auth/
      auth.plugin.ts
      auth.guard.ts
    users/
      users.plugin.ts
      users.schema.ts
    health/
      health.plugin.ts
  shared/
    errors/
      app-error.ts
    middleware/
      logger.ts
      error-handler.ts
    config/
      env.ts
  index.ts
```

```bash
bun init
bun add elysia @sinclair/typebox @elysiajs/swagger @elysiajs/cors @elysiajs/eden
```

Create the application composer:

```typescript
// src/index.ts
import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { authPlugin } from './plugins/auth/auth.plugin'
import { usersPlugin } from './plugins/users/users.plugin'
import { healthPlugin } from './plugins/health/health.plugin'
import { errorHandler } from './shared/middleware/error-handler'
import { logger } from './shared/middleware/logger'

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .use(logger)
  .use(errorHandler)
  .use(healthPlugin)
  .use(authPlugin)
  .use(usersPlugin)
  .listen(3000)

console.log(`🦊 Elysia running at http://localhost:${app.server?.port}`)

export type App = typeof app
```

### Step 2: Create Reusable Guards and Middleware

Authentication guards are a cross-cutting concern that every protected plugin needs. Implement them as composable functions:

```typescript
// src/plugins/auth/auth.guard.ts
import { Elysia, t } from 'elysia'

export const authGuard = (app: Elysia) =>
  app
    .derive({ as: 'global' }, async ({ request, error }) => {
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return error(401, {
          success: false,
          message: 'Missing or invalid authorization header'
        })
      }

      const token = authHeader.slice(7)
      const user = await validateToken(token)
      if (!user) {
        return error(401, {
          success: false,
          message: 'Invalid or expired token'
        })
      }

      return { user }
    })
```

**Guard composition pattern**: Combine multiple guards by chaining `.use()` calls inside a `.guard()` group. For example, combine `authGuard` with `roleGuard('admin')` for admin-only routes:

```typescript
app.guard((app) =>
  app
    .use(authGuard)
    .use(adminGuard)
    .get('/admin/users', listAllUsers)
)
```

### Step 3: Define Input Schemas with TypeBox

Centralize all request schemas for reuse across guards, handlers, and client code:

```typescript
// src/plugins/users/users.schema.ts
import { t } from 'elysia'

export const CreateUserSchema = t.Object({
  name: t.String({ minLength: 2, maxLength: 100 }),
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8, maxLength: 128 }),
  role: t.Optional(t.Union([t.Literal('admin'), t.Literal('user')]))
})

export const UpdateUserSchema = t.Partial(CreateUserSchema)

export const UserParamsSchema = t.Object({
  id: t.String({ format: 'uuid' })
})
```

**Schema reuse strategy**: Export schemas from a central location and share them between the server and client packages using a monorepo structure. This ensures validation rules are never duplicated or out of sync.

### Step 4: Build Feature Plugins

Feature plugins combine guards, schemas, and lifecycle hooks into cohesive units:

```typescript
// src/plugins/users/users.plugin.ts
import { Elysia, t } from 'elysia'
import { authGuard } from '../auth/auth.guard'
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserParamsSchema
} from './users.schema'

export const usersPlugin = (app: Elysia) =>
  app.group('/users', (app) =>
    app
      // Public: user registration
      .post(
        '/',
        async ({ body, error }) => {
          const user = await createUser(body)
          return { success: true, data: user }
        },
        { body: CreateUserSchema }
      )
      // Protected: all other user operations
      .guard((app) =>
        app
          .use(authGuard)
          .onBeforeHandle(({ request }) => {
            console.log(`[USERS] ${request.method} ${request.url}`)
          })
          .get('/', async ({ query }) => {
            const users = await listUsers(query)
            return { success: true, data: users }
          })
          .get('/:id', async ({ params: { id }, error }) => {
            const found = await findUserById(id)
            if (!found) {
              return error(404, { success: false, message: 'User not found' })
            }
            return { success: true, data: found }
          })
          .put('/:id', async ({ params: { id }, body }) => {
            const updated = await updateUser(id, body)
            return { success: true, data: updated }
          })
          .delete('/:id', async ({ params: { id } }) => {
            await deleteUser(id)
            return { success: true, message: 'User deleted' }
          })
      )
  )
```

**Plugin communication pattern**: When plugins need to communicate, use `decorate()` to expose shared services rather than importing plugin internals directly. For example, an audit plugin can decorate the context with `audit.log()`, and other plugins consume it via context.

### Step 5: Implement Centralized Error Handling

A typed error system enables consistent, predictable error responses:

```typescript
// src/shared/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`)
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(400, 'VALIDATION_ERROR', 'Invalid request data', details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message)
  }
}
```

Wire the global error handler to catch and format all errors:

```typescript
// src/shared/middleware/error-handler.ts
import { Elysia } from 'elysia'
import { AppError } from '../errors/app-error'

export const errorHandler = (app: Elysia) =>
  app.onError(({ error, code, set }) => {
    // Known application errors (typed)
    if (error instanceof AppError) {
      set.status = error.statusCode
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null
        }
      }
    }

    // Validation errors from TypeBox
    if (code === 'VALIDATION') {
      set.status = 400
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.all ?? null
        }
      }
    }

    // Unknown errors — log and return generic response
    console.error('[UNHANDLED]', error)
    set.status = 500
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }
  })
```

### Step 6: Wire Dependencies with Decorate

Use `decorate()` to provide shared resources throughout the application:

```typescript
// src/index.ts — extended with dependency injection
import { Elysia } from 'elysia'
import { db } from './shared/db'
import { config } from './shared/config/env'
import { cache } from './shared/cache'

const app = new Elysia()
  .decorate('db', db)
  .decorate('config', config)
  .decorate('cache', cache)
  .use(errorHandler)
  .use(authPlugin)
  .use(usersPlugin)
  .listen(3000)
```

Route handlers access these via the context object with full type inference:

```typescript
app.get('/stats', async ({ db, cache }) => {
  const stats = await cache.getOrFetch('app:stats', () =>
    db.query('SELECT count(*) as total FROM users')
  )
  return { success: true, data: stats }
})
```

### Step 7: Graceful Shutdown and Production Deployment

Implement graceful shutdown to ensure zero-downtime deployments and data integrity:

```typescript
// src/index.ts — graceful shutdown
async function shutdown(signal: string) {
  console.log(`[SHUTDOWN] Received ${signal}, shutting down gracefully...`)
  await app.stop()
  await db.close()
  await cache.disconnect()
  console.log('[SHUTDOWN] All connections closed. Goodbye.')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
```

**Production deployment options**:

```bash
# Run directly with Bun (recommended)
bun run --env-file=.env.production src/index.ts

# Compile to a standalone binary
bun build --compile --target=bun-linux-x64-modern src/index.ts --outfile=elysia-api

# Run with Docker
docker run -p 3000:3000 -e DATABASE_URL=... oven/bun ./elysia-api
```

**Performance tuning tips**:
- Enable compression with `@elysiajs/compression` for API responses.
- Use connection pooling for database connections and reuse them via `decorate()`.
- Set `maxBodySize` in Elysia config to prevent large payload attacks.
- Configure CORS explicitly with allowed origins rather than using wildcards.

### Step 8: Testing with Bun Test Runner

Write focused integration tests for plugins and error handlers:

```typescript
// tests/plugins/users.test.ts
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { usersPlugin } from '../../src/plugins/users/users.plugin'

function createTestApp() {
  return new Elysia().use(usersPlugin)
}

describe('Users Plugin', () => {
  it('POST /users — creates a user with valid data', async () => {
    const app = createTestApp()
    const response = await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'securePass123'
        })
      })
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('POST /users — rejects invalid email', async () => {
    const app = createTestApp()
    const response = await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John',
          email: 'not-an-email',
          password: 'short'
        })
      })
    )
    expect(response.status).toBe(400)
  })

  it('GET /users/:id — returns 404 for nonexistent user', async () => {
    const app = createTestApp()
    const response = await app.handle(
      new Request('http://localhost/users/nonexistent-id')
    )
    expect(response.status).toBe(404)
  })
})
```

Run the test suite:

```bash
bun test                    # Development — watch mode
bun test --reporter=github  # CI — GitHub Actions annotations
bun test --coverage         # Coverage report
```

**Test isolation pattern**: Create a fresh `Elysia` instance per test case using a factory function. This prevents state leakage between tests and ensures deterministic results.

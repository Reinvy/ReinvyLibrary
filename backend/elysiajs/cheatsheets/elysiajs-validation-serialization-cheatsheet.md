---
title: "Elysia.js Validation and Serialization Cheatsheet"
description: "A quick reference for Elysia.js schema validation with TypeBox and Standard Schema validators — covering inline body/query/params/headers schemas, coercion and defaults, custom error messages, validation error handling, and response serialization."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Elysia.js Validation and Serialization Cheatsheet

## Quick Reference Table

| Action | Syntax | Description |
|--------|--------|-------------|
| Validate request body | `body: t.Object({ ... })` | Rejects requests whose JSON body fails the schema with HTTP 422 |
| Validate query string | `query: t.Object({ page: t.Numeric() })` | Coerces and validates `?page=2` |
| Validate path params | `params: t.Object({ id: t.Numeric() })` | Validates segments such as `/user/:id` |
| Validate headers | `headers: t.Object({ authorization: t.String() })` | Validates request headers |
| Validate cookies | `cookie: t.Object({ session: t.String() })` | Validates cookie values |
| Make a field optional | `t.Optional(t.String())` | Allows the key to be absent |
| Provide a default value | `t.String({ default: 'guest' })` | Fills the value in when the key is absent |
| Coerce strings to numbers | `t.Numeric()` | Turns `"42"` from query/params into `42` |
| Reject unknown keys | `t.Object({ ... }, { additionalProperties: false })` | Blocks extra fields for strict input hygiene |
| Custom error message | `t.Number({ error: 'must be a number' })` | Returns a human-readable message on failure |
| List every failure | `error.all` | Array of `{ path, summary, message, value }` |
| Validate handler output | `response: t.Object({ ... })` | Serializes and validates the response body |
| Per-status response schema | `response: { 200: Ok, 404: Err }` | Types and validates each HTTP status separately |
| Use Zod or another validator | `body: z.object({ ... })` | Any Standard Schema validator works out of the box |

## Common Commands

### Project Setup and Dependencies

```bash
# Create a new Bun project (Elysia runs on Bun)
bun init -y

# Install Elysia — TypeBox (the `t` helper) is bundled in
bun add elysia

# Optional: Standard Schema validators work without a plugin
bun add zod
bun add valibot
```

### Running and Testing

```bash
# Start the API server
bun run src/index.ts

# Development mode with automatic restart on file changes
bun run --watch src/index.ts

# Run the test suite with Bun's test runner
bun test
```

### Probing Validation Behavior

```bash
# POST a body that violates the schema — expect HTTP 422
curl -s -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{"name":"Reinvy"}'

# Path param that fails t.Numeric() — expect HTTP 422
curl -s http://localhost:3000/user/not-a-number

# Valid payload — expect HTTP 200
curl -s -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{"name":"Reinvy","age":30}'
```

## Code Snippets

### Inline Validation for Body, Query, Params, and Headers

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .post(
    '/users/:id',
    ({ body, params, query, headers }) => {
      return { body, params, query, headers }
    },
    {
      // JSON body schema — runs before the handler
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 80 }),
        age: t.Optional(t.Number({ minimum: 0, maximum: 120 })),
        tags: t.Array(t.String({ maxLength: 20 }))
      }),
      // Path params
      params: t.Object({
        id: t.Numeric() // "42" -> 42
      }),
      // Query string
      query: t.Object({
        page: t.Optional(t.Numeric({ default: 1 })),
        limit: t.Optional(t.Numeric({ default: 20 }))
      }),
      // Headers
      headers: t.Object({
        authorization: t.String({ minLength: 20 })
      })
    }
  )
  .listen(3000)
```

Any failed schema results in a `ValidationError` with `code: 'VALIDATION'` and HTTP status 422 before the handler ever runs.

### TypeBox Schema Building Blocks

```typescript
import { t } from 'elysia'

// Union — the value must match one of several shapes
const IdOrSlug = t.Union([t.Numeric(), t.String({ minLength: 3 })])

// Intersection — combine two object schemas
const Timestamped = t.Intersect([
  t.Object({ createdAt: t.String({ format: 'date-time' }) }),
  t.Object({ updatedAt: t.String({ format: 'date-time' }) })
])

// Array with element rules and a size cap
const Tags = t.Array(t.String({ minLength: 2, maxLength: 16 }), {
  maxItems: 10
})

// Record — arbitrary keys with a value schema
const Metadata = t.Record(
  t.String(),
  t.Union([t.String(), t.Number(), t.Boolean()])
)

// Literal unions for closed sets of allowed values
const Role = t.Union([
  t.Literal('admin'),
  t.Literal('member'),
  t.Literal('guest')
])

// Nullable wraps a value that may also be null
const Nickname = t.Nullable(t.String())

// Recursive schemas for tree-shaped data
const CategoryNode = t.Recursive((Self) =>
  t.Object({
    name: t.String(),
    children: t.Array(Self)
  })
)
```

### Coercion, Defaults, and Transforms

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .get(
    '/search',
    ({ query }) => query,
    {
      query: t.Object({
        // Coerce "3" -> 3 when reading the query string
        page: t.Numeric({ default: 1 }),
        q: t.String({ default: '' })
      })
    }
  )
  .post(
    '/events',
    ({ body }) => body,
    {
      body: t.Object({
        // Default fills the value when the key is absent
        channel: t.String({ default: 'general' }),
        // Transform: decode raw input into a richer runtime value
        // and encode it back for serialization
        timestamp: t.Transform(
          t.String({ format: 'date-time' }),
          (value) => new Date(value),     // decode: input -> runtime
          (value) => value.toISOString()  // encode: runtime -> output
        )
      })
    }
  )
  .listen(3000)
```

`t.Numeric()` is the idiomatic way to coerce query and path values: the string `"42"` arrives in the handler as the number `42`, and your TypeScript types match the runtime values.

### Custom Error Messages with validationDetail

```typescript
import { Elysia, t, validationDetail } from 'elysia'

const app = new Elysia()
  .post(
    '/login',
    ({ body }) => body,
    {
      body: t.Object({
        // Static custom message for this field
        email: t.String({ format: 'email', error: 'email is not valid' }),
        password: t.String({
          minLength: 8,
          error: 'password must be at least 8 characters'
        })
      })
    }
  )
  // Strict mode: reject payloads carrying unknown keys
  .post(
    '/register',
    ({ body }) => body,
    {
      body: t.Object(
        {
          username: t.String({ minLength: 3 }),
          role: t.Union([t.Literal('admin'), t.Literal('member')])
        },
        { additionalProperties: false }
      )
    }
  )
  // validationDetail produces an OpenAPI-compliant detail object
  .post(
    '/account',
    ({ body }) => body,
    {
      body: t.Object({
        username: t.String({
          minLength: 3,
          error: validationDetail('username is too short')
        })
      })
    }
  )
  .listen(3000)
```

The `error` property on any schema accepts a static string or a `validationDetail(...)` object. It can also be a function for programmatically computed messages.

### Global Validation Error Handling with onError

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .onError(({ code, error, set, path }) => {
    // Non-validation errors fall through to a generic response
    if (code !== 'VALIDATION') {
      set.status = 500
      return { success: false, message: 'Internal server error' }
    }

    set.status = 422
    return {
      success: false,
      // error.all lists every failed field
      fields: error.all.map((item) => ({
        path: item.path,
        message: item.summary,
        value: item.value
      })),
      path
    }
  })
  .post(
    '/users',
    ({ body }) => body,
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: 'email' }),
        age: t.Number({ minimum: 18 })
      })
    }
  )
  .listen(3000)
```

When the narrowed `code` is `'VALIDATION'`, `error` is typed as `ValidationError`. Use `error.type` to learn which part failed (`'body'`, `'query'`, `'params'`, `'headers'`, or `'cookie'`) and `error.all` to enumerate every offending field. For production, avoid echoing raw validation internals; return only the mapped summary.

| Error code | Default status | Meaning |
|------------|----------------|---------|
| VALIDATION | 422 | Request failed schema validation |
| PARSE | 400 | Request body could not be parsed |
| NOT_FOUND | 404 | No route matched the request path |
| INVALID_COOKIE_SIGNATURE | 400 | Cookie signature check failed |
| INTERNAL_SERVER_ERROR | 500 | Unhandled error in a handler |
| UNKNOWN | 500 | Unregistered or unrecognized error |

### Response Serialization and Per-Status Schemas

```typescript
import { Elysia, t } from 'elysia'

const Ok = t.Object({
  id: t.Numeric(),
  name: t.String(),
  joinedAt: t.String({ format: 'date-time' })
})

const NotFound = t.Object({
  error: t.Literal('NOT_FOUND'),
  message: t.String()
})

const app = new Elysia()
  .get(
    '/users/:id',
    ({ params, store }) => {
      const user = store.users[params.id]
      if (!user) {
        return { error: 'NOT_FOUND', message: `no user with id ${params.id}` }
      }
      return {
        id: params.id,
        name: user.name,
        joinedAt: user.joinedAt.toISOString()
      }
    },
    {
      params: t.Object({ id: t.Numeric() }),
      // Per-status response schemas: handler output is validated
      // against the schema for the status it returns
      response: {
        200: Ok,
        404: NotFound
      }
    }
  )
  .state('users', {
    1: { name: 'Reinvy', joinedAt: new Date('2026-01-15T08:00:00Z') }
  } as Record<number, { name: string; joinedAt: Date }>)
  .listen(3000)
```

Declaring a `response` schema gives you three things at once: runtime validation of handler output, serialization of the shape, and OpenAPI documentation generated from the same single source of truth.

### Standard Schema: Zod, Valibot, and Other Validators

```typescript
import { Elysia, t } from 'elysia'
import { z } from 'zod'
import * as v from 'valibot'

const app = new Elysia()
  .get(
    '/id/:id',
    ({ params, query }) => {
      return { id: params.id, name: query.name }
    },
    {
      // Zod schema — works directly via Standard Schema support
      params: z.object({
        id: z.coerce.number()
      }),
      query: v.object({
        name: v.literal('Lilith')
      })
    }
  )
  .post(
    '/report',
    ({ body }) => body,
    {
      // Valibot schema
      body: v.object({
        reason: v.pipe(v.string(), v.minLength(5)),
        urgent: v.boolean()
      })
    }
  )
  .get(
    '/dashboard',
    ({ query }) => query,
    {
      // TypeBox remains first-class alongside Standard Schema validators
      query: t.Object({
        page: t.Numeric({ default: 1 }),
        limit: t.Numeric({ default: 50 })
      })
    }
  )
  .listen(3000)
```

Elysia implements Standard Schema, so Zod, Valibot, ArkType, Effect Schema, Yup, Joi, and TypeBox can be mixed freely — even on different parts of the same route. `ValidationError.all` reports failures uniformly regardless of which validator produced them.

### Registering Typed Error Codes

```typescript
import { Elysia, t } from 'elysia'

class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

const app = new Elysia()
  // Register custom error classes to get typed code narrowing
  .error({ QuotaExceededError })
  .onError(({ code, error, set }) => {
    switch (code) {
      case 'QuotaExceededError':
        set.status = 429
        return { success: false, message: error.message }
      case 'VALIDATION':
        set.status = 422
        return { success: false, fields: error.all }
      default:
        set.status = 500
        return { success: false, message: 'Internal server error' }
    }
  })
  .post(
    '/upload',
    ({ body }) => {
      if (body.projections > 5) {
        throw new QuotaExceededError('projection limit reached')
      }
      return { success: true }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        projections: t.Numeric({ minimum: 0 })
      }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        422: t.Object({ success: t.Boolean(), fields: t.Any() }),
        429: t.Object({ success: t.Boolean(), message: t.String() })
      }
    }
  )
  .listen(3000)
```

Combining registered error classes with per-status response schemas keeps your error surface fully typed end to end — clients receive a documented, validated error body for every failure mode.

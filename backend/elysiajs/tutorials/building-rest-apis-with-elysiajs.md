---
title: "Building REST APIs with ElysiaJS"
description: "A step-by-step tutorial on building high-performance REST APIs using ElysiaJS, the Bun-native web framework with end-to-end type safety."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building REST APIs with ElysiaJS

## Summary

This tutorial guides you through building a complete REST API using **ElysiaJS**, a fast and type-safe web framework built specifically for the Bun runtime. You will learn how to set up an Elysia project, define routes with validation, integrate middleware, handle errors, connect to a database, and structure a real-world API. By the end, you will have a fully functional task management API.

## Target Audience

- Backend developers familiar with JavaScript or TypeScript.
- Developers curious about Bun and modern high-performance web frameworks.
- Intermediate level: comfortable with REST principles and basic TypeScript.

## Prerequisites

- Basic knowledge of JavaScript/TypeScript and HTTP concepts.
- [Bun](https://bun.sh) installed on your system (`curl -fsSL https://bun.sh/install | bash`).
- A text editor or IDE (VS Code recommended).
- `curl` or any API client (Postman, Thunder Client) for testing endpoints.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Scaffold a new ElysiaJS project using the official CLI.
- Define typed routes with request validation using Elysia's schema system.
- Implement middleware for logging, authentication, and error handling.
- Structure a modular API using Elysia's plugin system.
- Integrate a database (SQLite via Bun's built-in driver) for persistence.
- Apply best practices for production-ready API design.

## Context and Motivation

Traditional Node.js frameworks like Express.js have powered backend development for over a decade. However, they carry architectural overhead from the CommonJS era and lack first-class TypeScript integration. **ElysiaJS** solves this by being written from the ground up for **Bun** — a JavaScript runtime that bundles a transpiler, package manager, and native APIs into a single binary.

Elysia's key differentiators are:
- **TypeBox integration**: Automatic request/response validation with inferred TypeScript types — no separate schema declaration.
- **Extreme performance**: Benchmarks show Elysia outperforming Express and Fastify on Bun.
- **Plugin ecosystem**: Modular, composable plugins that mirror the Express middleware pattern but with type safety.
- **Zero dependencies**: Elysia itself is dependency-free; type safety comes from TypeBox as an optional peer dependency.

For teams building greenfield APIs in 2025+, ElysiaJS represents a paradigm shift: **blazing speed without sacrificing developer experience**.

## Core Content

### Setting Up the Project

Create a new Elysia project using the official scaffolding tool:

```bash
bun create elysia task-api
cd task-api
```

This generates a minimal project with TypeScript configured. The entry point is `src/index.ts`. Install the validation and CORS plugins:

```bash
bun add @elysiajs/cors @elysiajs/swagger
```

### Anatomy of an Elysia App

Open `src/index.ts`. The core building block is the `Elysia` instance:

```typescript
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .get('/', () => 'Hello Elysia')
  .listen(3000)

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`)
```

Run with:

```bash
bun run dev
```

Visit `http://localhost:3000/swagger` to see the auto-generated Swagger UI.

### Defining Routes with Validation

Elysia's schema validation uses **TypeBox** — a library that defines JSON Schema via TypeScript types. The schema is then used to validate the request body, query parameters, and path parameters, while simultaneously inferring the correct TypeScript types.

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .post('/tasks', ({ body }) => {
    return { id: crypto.randomUUID(), ...body }
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      completed: t.Optional(t.Boolean({ default: false }))
    })
  })
  .listen(3000)
```

The `t.Object` schema automatically:
- Validates incoming JSON against the schema.
- Returns a 422 error with a descriptive message if validation fails.
- Infers the TypeScript type of `body` so you get autocompletion in your IDE.

### Path Parameters and Query Strings

```typescript
const app = new Elysia()
  .get('/tasks/:id', ({ params: { id } }) => {
    return { id, message: `Fetching task ${id}` }
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' })
    })
  })
  .get('/tasks', ({ query: { page, limit } }) => {
    return { page, limit }
  }, {
    query: t.Object({
      page: t.Optional(t.Number({ default: 1 })),
      limit: t.Optional(t.Number({ default: 10 }))
    })
  })
```

### Middleware and Guards

Elysia middleware runs before your route handler. Use `.derive()` to inject shared context (like a database connection or authenticated user), and `.onBeforeHandle()` for guards.

```typescript
const auth = new Elysia()
  .derive(({ headers }) => {
    const token = headers['authorization']?.replace('Bearer ', '')
    if (!token) throw new Error('Missing auth token')
    return { user: { id: 'user_123', role: 'admin' } }
  })

const app = new Elysia()
  .use(auth)
  .get('/protected', ({ user }) => {
    return { message: `Hello ${user.id}` }
  })
```

### Plugin System

For production apps, split your routes into plugins — separate Elysia instances that encapsulate related logic.

```typescript
// tasks.ts
import { Elysia, t } from 'elysia'

const tasks = new Elysia({ prefix: '/tasks' })
  .get('/', () => {
    return { tasks: [] }
  })
  .post('/', ({ body }) => {
    return { id: crypto.randomUUID(), ...body }
  }, {
    body: t.Object({
      title: t.String(),
      description: t.Optional(t.String())
    })
  })
  .get('/:id', ({ params: { id } }) => {
    return { id, title: 'Sample Task' }
  })

// index.ts
import { Elysia } from 'elysia'
import { tasks } from './tasks'

const app = new Elysia()
  .use(tasks)
  .listen(3000)
```

### Database Integration with Bun SQLite

Bun ships with a built-in SQLite driver. Here is a complete CRUD implementation:

```typescript
import { Database } from 'bun:sqlite'

const db = new Database('tasks.db')

// Initialize table
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

const tasks = new Elysia({ prefix: '/tasks' })
  .get('/', () => {
    return db.query('SELECT * FROM tasks ORDER BY created_at DESC').all()
  })
  .post('/', ({ body }: { body: { title: string; description?: string } }) => {
    const id = crypto.randomUUID()
    db.run('INSERT INTO tasks (id, title, description) VALUES (?, ?, ?)', [
      id, body.title, body.description || null
    ])
    return db.query('SELECT * FROM tasks WHERE id = ?').get(id)
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      description: t.Optional(t.String())
    })
  })
  .put('/:id', ({ params, body }: { params: { id: string }; body: any }) => {
    const existing = db.query('SELECT * FROM tasks WHERE id = ?').get(params.id)
    if (!existing) throw new Error('Task not found')
    db.run(
      'UPDATE tasks SET title = ?, description = ?, completed = ? WHERE id = ?',
      [body.title ?? existing.title, body.description ?? existing.description, body.completed ?? existing.completed, params.id]
    )
    return db.query('SELECT * FROM tasks WHERE id = ?').get(params.id)
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      completed: t.Optional(t.Boolean())
    })
  })
  .delete('/:id', ({ params }) => {
    const existing = db.query('SELECT * FROM tasks WHERE id = ?').get(params.id)
    if (!existing) throw new Error('Task not found')
    db.run('DELETE FROM tasks WHERE id = ?', [params.id])
    return { success: true }
  })
```

### Error Handling

Elysia uses the `.onError()` lifecycle hook to catch errors globally:

```typescript
const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422
      return { error: 'Validation failed', details: error.message }
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Resource not found' }
    }
    // Generic server error
    console.error(error)
    set.status = 500
    return { error: 'Internal server error' }
  })
```

### Lifecycle Summary

Elysia processes each request through a lifecycle pipeline:

1. **Request** → `onRequest` hooks
2. **Parse** → body parsing and schema validation
3. **Transform** → `onTransform` (modify request before guards)
4. **Before Handle** → `onBeforeHandle` (authentication, authorization)
5. **Handle** → your route handler
6. **After Handle** → `onAfterHandle` (response transformation)
7. **Error** → `onError` if any step throws

## Code Examples

### Complete Task API — `src/index.ts`

```typescript
import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { Database } from 'bun:sqlite'

// ── Database Setup ──
const db = new Database('tasks.db')
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

// ── Plugins ──
const tasks = new Elysia({ prefix: '/api/tasks' })
  .get('/', () => {
    return db.query('SELECT * FROM tasks ORDER BY created_at DESC').all()
  })
  .post('/', ({ body }) => {
    const id = crypto.randomUUID()
    db.run('INSERT INTO tasks (id, title, description) VALUES (?, ?, ?)', [
      id, body.title, body.description || null
    ])
    return db.query('SELECT * FROM tasks WHERE id = ?').get(id)
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      description: t.Optional(t.String())
    })
  })
  .get('/:id', ({ params, error }) => {
    const task = db.query('SELECT * FROM tasks WHERE id = ?').get(params.id)
    if (!task) return error(404, { error: 'Task not found' })
    return task
  })
  .put('/:id', ({ params, body, error }) => {
    const existing = db.query('SELECT * FROM tasks WHERE id = ?').get(params.id) as any
    if (!existing) return error(404, { error: 'Task not found' })
    db.run(
      'UPDATE tasks SET title = ?, description = ?, completed = ? WHERE id = ?',
      [body.title ?? existing.title, body.description ?? existing.description, body.completed ?? existing.completed, params.id]
    )
    return db.query('SELECT * FROM tasks WHERE id = ?').get(params.id)
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      completed: t.Optional(t.Boolean())
    })
  })
  .delete('/:id', ({ params, error }) => {
    const existing = db.query('SELECT * FROM tasks WHERE id = ?').get(params.id)
    if (!existing) return error(404, { error: 'Task not found' })
    db.run('DELETE FROM tasks WHERE id = ?', [params.id])
    return { success: true }
  })

// ── App ──
const app = new Elysia()
  .use(cors({ origin: '*' }))
  .use(swagger({ path: '/docs' }))
  .use(tasks)
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422
      return { error: 'Validation failed' }
    }
    set.status = 500
    return { error: 'Internal server error' }
  })
  .listen(3000)

console.log(`🦊 Elysia running at http://localhost:3000`)
console.log(`📖 Swagger docs at http://localhost:3000/docs`)
```

### Testing with curl

```bash
# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn ElysiaJS","description":"Complete the tutorial"}'

# List all tasks
curl http://localhost:3000/api/tasks

# Get a single task
curl http://localhost:3000/api/tasks/<UUID>

# Update a task
curl -X PUT http://localhost:3000/api/tasks/<UUID> \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Delete a task
curl -X DELETE http://localhost:3000/api/tasks/<UUID>
```

## Key Insights

- **Type safety is automatic**: With Elysia + TypeBox, your schema and TypeScript types are always in sync. A change to the schema updates the inferred type everywhere — no more manual interface declarations.
- **Bun native is the performance edge**: Elysia on Bun consistently benchmarks 2-4x faster than Express on Node.js for throughput and latency. The `bun:sqlite` driver is also significantly faster than better-sqlite3 on Node.
- **Plugin over middleware**: Elysia's plugin model is cleaner than Express middleware. Each plugin has its own scope, prefix, and lifecycle — preventing the common Express problem of middleware ordering bugs.
- **Swagger is free**: Adding the `@elysiajs/swagger` plugin generates OpenAPI 3.0 docs automatically from your route schemas. No JSDoc annotations or YAML files needed.
- **Eden Treaty for client code**: Elysia ships with Eden Treaty — a type-safe HTTP client that infers your API types from the server code, giving you end-to-end type safety from backend to frontend.

## Next Steps

- Explore [Eden Treaty](https://elysiajs.com/eden/overview.html) for type-safe client-server communication.
- Learn about Elysia's [WebSocket support](https://elysiajs.com/patterns/websocket.html) for real-time features.
- Integrate a production-grade database like PostgreSQL via Drizzle ORM with Elysia.
- Add authentication flows with JWT using the `@elysiajs/jwt` plugin.
- Study the full Elysia documentation at [elysiajs.com](https://elysiajs.com).

## Conclusion

ElysiaJS reimagines web framework design by leveraging Bun's full potential — delivering exceptional performance, automatic type safety, and a clean plugin architecture. In this tutorial, you built a complete REST API with CRUD operations, request validation, database persistence, and Swagger documentation. The patterns you learned — schema-first validation, plugin-based modularity, and lifecycle hooks — are foundational for building production-grade APIs with Elysia. As the Bun ecosystem matures, Elysia is positioned to become the default choice for high-performance TypeScript backends.

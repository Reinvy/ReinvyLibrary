---
title: "Elysia.js Cheatsheet"
description: "A quick reference guide for Elysia.js covering app setup, routing, validation with TypeBox, middleware and hooks, plugins, state injection, CORS, error handling, Swagger documentation, WebSocket support, testing, and deployment with Bun."
category: "backend"
technology: "elysiajs"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# Elysia.js Cheatsheet

## Quick Reference Table

| Action | Code / Pattern | Description |
|--------|---------------|-------------|
| Initialize project | `bun init -y && bun add elysia` | Create a new Bun project and install Elysia |
| Basic app setup | `const app = new Elysia().listen(PORT)` | Create and start an Elysia server |
| GET route | `app.get('/path', handler)` | Handle GET requests at a given path |
| POST route | `app.post('/path', handler)` | Handle POST requests at a given path |
| PUT route | `app.put('/path/:id', handler)` | Handle PUT requests with a route parameter |
| DELETE route | `app.delete('/path/:id', handler)` | Handle DELETE requests with a route parameter |
| Route param | `params.id` (from `Context`) | Access dynamic route segment (`/users/:id`) |
| Query string | `query.page` (from `Context`) | Access URL query parameter (`?page=2`) |
| Request body | `body` (from `Context`) | Access parsed JSON request body |
| Send JSON | `return { key: value }` or `context.set` | Return JSON response directly |
| Set status code | `set.status = 201` | Set HTTP status before sending response |
| Guard routes | `app.guard({ ... }, app => ... )` | Apply hooks/validation to a group of routes |
| Group routes | `app.group('/prefix', app => ... )` | Prefix a group of routes |
| TypeBox schema | `t.Object({ name: t.String() })` | Define request/response validation schemas |
| Validate body | `app.post('/', ({ body }) => body, { schema: { body } })` | Validate request body against a TypeBox schema |
| Hook: before handle | `app.onBeforeHandle(({ request }) => { ... })` | Middleware that runs before route handler |
| Hook: after handle | `app.onAfterHandle(({ response }) => { ... })` | Middleware that runs after route handler |
| Hook: on error | `app.onError(({ error, set }) => { ... })` | Global error handler |
| Hook: on request | `app.onRequest(({ request }) => { ... })` | Hook that fires on every incoming request |
| Hook: on response | `app.onResponse(({ response }) => { ... })` | Hook that fires on every outgoing response |
| Plugin system | `app.use(plugin)` | Mount an Elysia plugin |
| State injection | `app.state('key', value)` | Inject global state accessible in handlers |
| Decorator injection | `app.decorate('name', value)` | Inject custom methods/properties into context |
| Cookie handling | `cookie` (from `Context`) | Read and set cookies via `set.cookie` |
| CORS | `app.use(cors())` | Enable cross-origin requests (needs `@elysiajs/cors`) |
| Swagger docs | `app.use(swagger())` | Generate OpenAPI documentation (needs `@elysiajs/swagger`) |
| WebSocket | `app.ws('/ws', { message(ws, data) { ... } })` | Handle WebSocket connections |
| Static files | `app.use(static())` | Serve static files (needs `@elysiajs/static`) |
| File upload | Use `body` with `t.File()` | Handle multipart file uploads |
| Environment config | `Bun.env.VAR_NAME` | Access environment variables via Bun |
| Run tests | `bun test` | Run tests with Bun test runner |
| Start server | `bun run src/index.ts` | Run the Elysia server entry point |

## Common Commands

### Project Setup

```bash
# Create a new Bun project
mkdir my-elysia-api && cd my-elysia-api
bun init -y

# Install Elysia
bun add elysia

# Install common Elysia plugins
bun add @elysiajs/cors @elysiajs/swagger @elysiajs/static @elysiajs/websocket

# Install TypeBox for schema validation
bun add @sinclair/typebox

# Development runner with watch mode
bun --watch src/index.ts
```

### Bun CLI & Development

```bash
# Run the application
bun run src/index.ts

# Run with file watching (auto-restart on changes)
bun --watch src/index.ts

# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Bun repl
bun repl
```

### Elysia Project Structure

```bash
# Common file structure for Elysia projects
my-elysia-api/
├── src/
│   ├── index.ts          # Entry point
│   ├── app.ts            # App configuration
│   ├── routes/
│   │   ├── users.ts      # User routes (plugin)
│   │   └── index.ts      # Route aggregator
│   ├── plugins/
│   │   └── auth.ts       # Auth plugin
│   ├── schemas/
│   │   └── user.ts       # TypeBox schemas
│   └── models/
│       └── user.ts       # Data models
├── test/
│   └── app.test.ts       # Tests
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Testing with Bun

```bash
# Install test dependencies
bun add -d @types/bun

# Run all tests
bun test

# Run specific test file
bun test test/users.test.ts

# Run tests with coverage report
bun test --coverage

# Example test command
bun test --preload ./src/setup.ts
```

### Environment Variables with Bun

```bash
# Access environment variables
Bun.env.PORT
Bun.env.DATABASE_URL
Bun.env.JWT_SECRET

# .env file (auto-loaded by Bun)
# PORT=3000
# DATABASE_URL=postgres://localhost:5432/mydb

# Use in scripts
# bun run src/index.ts
```

### Docker Deployment

```dockerfile
# Dockerfile for Elysia.js with Bun
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install

# Copy source
COPY . .

# Build TypeScript
RUN bun build src/index.ts --outdir ./dist

# Production image
FROM oven/bun:1-slim
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules

EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
```

```bash
# Build and run with Docker
docker build -t my-elysia-api .
docker run -p 3000:3000 my-elysia-api
```

## Code Snippets

### Basic Elysia App Setup

```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';

const app = new Elysia()
  // --- Plugins ---
  .use(cors())
  .use(swagger())
  .use(staticPlugin())

  // --- Routes ---
  .get('/', () => ({ message: 'Elysia API running' }))

  .get('/health', () => ({ status: 'ok', timestamp: Date.now() }))

  // --- Start server ---
  .listen(3000);

console.log(`🦊 Elysia running at ${app.server?.hostname}:${app.server?.port}`);
```

### Routing: GET, POST, PUT, DELETE

```typescript
import { Elysia, t } from 'elysia';

const app = new Elysia();

// GET — list items
app.get('/users', () => {
  return { users: [{ id: 1, name: 'Alice' }] };
});

// GET with params — single item
app.get('/users/:id', ({ params: { id } }) => {
  return { user: { id: Number(id), name: 'Alice' } };
});

// POST — create item
app.post('/users', ({ body }) => {
  // body is typed based on schema
  return { created: body };
}, {
  schema: {
    body: t.Object({
      name: t.String(),
      email: t.String({ format: 'email' })
    })
  }
});

// PUT — update item
app.put('/users/:id', ({ params: { id }, body }) => {
  return { updated: { id: Number(id), ...body } };
});

// DELETE — remove item
app.delete('/users/:id', ({ params: { id } }) => {
  return { deleted: Number(id) };
});

app.listen(3000);
```

### Route Groups and Guards

```typescript
import { Elysia, t } from 'elysia';

const app = new Elysia();

// --- Group routes under a prefix ---
app.group('/api/v1', app =>
  app
    .get('/users', () => ({ users: [] }))
    .get('/users/:id', ({ params: { id } }) => ({ user: { id } }))
    .post('/users', ({ body }) => ({ created: body }))
);

// --- Guard: apply hooks/schema to a group ---
app.guard(
  {
    schema: {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: 'email' })
      })
    },
    beforeHandle: ({ request }) => {
      // Check auth header
      if (!request.headers.get('Authorization')) {
        return { error: 'Unauthorized', status: 401 };
      }
    }
  },
  app =>
    app.post('/admin/users', ({ body }) => ({ created: body }))
);

app.listen(3000);
```

### TypeBox Schema Validation

```typescript
import { Elysia, t } from 'elysia';

// --- Define reusable schemas ---
const UserSchema = t.Object({
  id: t.Number(),
  name: t.String({ minLength: 2, maxLength: 100 }),
  email: t.String({ format: 'email' }),
  age: t.Optional(t.Number({ minimum: 0, maximum: 150 })),
  role: t.Enum({ admin: 'admin', user: 'user', guest: 'guest' })
});

const CreateUserSchema = t.Object({
  name: t.String({ minLength: 2 }),
  email: t.String({ format: 'email' }),
  age: t.Optional(t.Number({ minimum: 0 })),
  role: t.Optional(t.String())
});

// --- Apply schemas to routes ---
const app = new Elysia()
  .post('/users', ({ body }) => {
    // body is typed as inferred from CreateUserSchema
    return { created: body };
  }, {
    schema: {
      body: CreateUserSchema,
      response: t.Object({ created: UserSchema }),
      // query: t.Object({ page: t.Number() }),
      // params: t.Object({ id: t.String() })
    }
  })
  .listen(3000);
```

### Middleware and Hooks

```typescript
import { Elysia } from 'elysia';

const app = new Elysia()

  // --- onRequest: fires on every incoming request ---
  .onRequest(({ request }) => {
    console.log(`[${request.method}] ${request.url}`);
  })

  // --- onBeforeHandle: runs before route handler (like middleware) ---
  .onBeforeHandle(({ request, set }) => {
    const auth = request.headers.get('Authorization');
    if (!auth) {
      set.status = 401;
      return { error: 'Authorization header required' };
    }
    // Return a value to short-circuit the handler
  })

  // --- onAfterHandle: runs after route handler ---
  .onAfterHandle(({ response }) => {
    // Transform or log the response
    console.log('Response:', response);
  })

  // --- onError: global error handler ---
  .onError(({ error, set }) => {
    console.error('Error:', error);
    set.status = 500;
    return { error: 'Internal server error', message: error.message };
  })

  // --- onResponse: fires on every outgoing response ---
  .onResponse(({ response, set }) => {
    set.headers['X-Powered-By'] = 'Elysia';
  })

  .get('/secure', () => ({ secret: 'data' }))
  .listen(3000);
```

### Plugin System

```typescript
import { Elysia } from 'elysia';

// --- Define a plugin ---
const authPlugin = (app: Elysia) =>
  app
    .decorate('auth', {
      isAuthenticated(request: Request): boolean {
        return request.headers.has('Authorization');
      }
    })
    .onBeforeHandle(({ auth, request, set }) => {
      if (!auth.isAuthenticated(request)) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
    });

// --- Define another plugin ---
const loggerPlugin = new Elysia({ name: 'logger' })
  .onRequest(({ request }) => {
    console.log(`${request.method} ${request.url}`);
  });

// --- Use plugins in the main app ---
const app = new Elysia()
  .use(authPlugin)
  .use(loggerPlugin)
  .get('/admin', ({ auth }) => ({
    message: 'Welcome admin!',
    auth: auth.isAuthenticated
  }))
  .listen(3000);
```

### State and Decorator Injection

```typescript
import { Elysia } from 'elysia';

const app = new Elysia()

  // --- State injection (reactive global state) ---
  .state('counter', 0)
  .state('config', {
    appName: 'MyAPI',
    version: '1.0.0'
  })

  // --- Decorator injection (custom methods on context) ---
  .decorate('utils', {
    formatDate(date: Date): string {
      return date.toISOString();
    },
    capitalize(str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  })

  // --- Access state and decorators in handlers ---
  .get('/counter', ({ store, utils }) => {
    store.counter++;
    return {
      counter: store.counter,
      formatted: utils.formatDate(new Date())
    };
  })

  .get('/config', ({ store }) => store.config)
  .listen(3000);
```

### Cookie and Session Handling

```typescript
import { Elysia, t } from 'elysia';
import { cookie } from '@elysiajs/cookie';

const app = new Elysia()
  .use(cookie())

  // --- Set a cookie ---
  .get('/set-cookie', ({ setCookie }) => {
    setCookie('session', 'abc123', {
      httpOnly: true,
      maxAge: 3600,
      path: '/',
      secure: true
    });
    return { message: 'Cookie set' };
  })

  // --- Read a cookie ---
  .get('/read-cookie', ({ cookie }) => {
    return { session: cookie?.session || 'no session' };
  })

  // --- Delete a cookie ---
  .get('/clear-cookie', ({ removeCookie }) => {
    removeCookie('session');
    return { message: 'Cookie removed' };
  })

  .listen(3000);
```

**Note:** Install with `bun add @elysiajs/cookie`.

### File Upload with Elysia

```typescript
import { Elysia, t } from 'elysia';

const app = new Elysia()

  // --- Single file upload ---
  .post('/upload', async ({ body: { file } }) => {
    // file is a File object (multipart)
    const buffer = await file.arrayBuffer();
    const filename = `${Date.now()}-${file.name}`;

    // Write to disk using Bun
    await Bun.write(`uploads/${filename}`, buffer);

    return { filename, size: file.size, type: file.type };
  }, {
    schema: {
      body: t.Object({
        file: t.File({ maxSize: '5m' })
      })
    }
  })

  // --- Multiple files ---
  .post('/uploads', async ({ body: { files } }) => {
    const results = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const filename = `${Date.now()}-${file.name}`;
      await Bun.write(`uploads/${filename}`, buffer);
      results.push({ filename, size: file.size });
    }
    return { uploaded: results };
  }, {
    schema: {
      body: t.Object({
        files: t.Array(t.File({ maxSize: '5m' }))
      })
    }
  })

  .listen(3000);
```

**Note:** Install with `bun add @elysiajs/file-upload` if not included by default.

### CORS Configuration

```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

const app = new Elysia()
  // --- Allow all origins (development only) ---
  // .use(cors())

  // --- Restrict to specific origins ---
  .use(
    cors({
      origin: ['https://myapp.com', 'https://admin.myapp.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400
    })
  )
  .get('/data', () => ({ secret: 'data' }))
  .listen(3000);
```

**Note:** Install with `bun add @elysiajs/cors`.

### Error Handling Patterns

```typescript
import { Elysia } from 'elysia';

// --- Custom error class ---
class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const app = new Elysia()

  // --- Global error handler ---
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        error: error.name,
        message: error.message,
        details: error.details
      };
    }

    // Handle validation errors from TypeBox
    if (error.message?.includes('Expected')) {
      set.status = 400;
      return { error: 'Validation Error', message: error.message };
    }

    // Default 500
    console.error('Unhandled error:', error);
    set.status = 500;
    return { error: 'Internal Server Error' };
  })

  // --- Routes using custom errors ---
  .get('/items/:id', ({ params: { id }, set }) => {
    if (id === '0') {
      throw new AppError(404, 'Item not found', { itemId: id });
    }
    return { id: Number(id), name: 'Item' };
  })

  .get('/validate', ({ query: { page } }) => {
    // Elysia + TypeBox automatically validates
    return { page };
  }, {
    schema: {
      query: t.Object({
        page: t.Number({ minimum: 1 })
      })
    }
  })

  .listen(3000);
```

### Swagger / OpenAPI Documentation

```typescript
import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';

const app = new Elysia()
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'My Elysia API',
          version: '1.0.0',
          description: 'API documentation generated by Elysia Swagger'
        },
        tags: [
          { name: 'Users', description: 'User endpoints' },
          { name: 'Health', description: 'Health check' }
        ]
      }
    })
  )

  .get('/health', () => ({ status: 'ok' }), {
    detail: {
      tags: ['Health'],
      summary: 'Health check endpoint'
    }
  })

  .post('/users', ({ body }) => ({ created: body }), {
    detail: {
      tags: ['Users'],
      summary: 'Create a new user'
    },
    schema: {
      body: t.Object({
        name: t.String(),
        email: t.String({ format: 'email' })
      }),
      response: t.Object({
        created: t.Object({
          name: t.String(),
          email: t.String({ format: 'email' })
        })
      })
    }
  })

  .listen(3000);

console.log(`Swagger docs available at http://localhost:3000/docs`);
```

**Note:** Install with `bun add @elysiajs/swagger`.

### WebSocket Support

```typescript
import { Elysia } from 'elysia';
import { websocket } from '@elysiajs/websocket';

const app = new Elysia()
  .use(websocket())

  // --- WebSocket route ---
  .ws('/ws', {
    // On client connection
    open(ws) {
      console.log('Client connected');
      ws.send({ type: 'welcome', message: 'Welcome to the WebSocket server!' });
    },

    // On incoming message
    message(ws, data) {
      console.log('Received:', data);
      // Echo back
      ws.send({ type: 'echo', data, timestamp: Date.now() });
    },

    // On connection close
    close(ws) {
      console.log('Client disconnected');
    },

    // On error
    drain(ws) {
      console.log('Backpressure relieved');
    }
  })

  // --- Broadcast route (HTTP endpoint to send to all clients) ---
  .get('/broadcast', ({ server }) => {
    const message = { type: 'broadcast', text: 'Hello everyone!' };
    server?.publish('/ws', message);
    return { sent: true };
  })

  .listen(3000);
```

**Note:** Install with `bun add @elysiajs/websocket`. Elysia's WebSocket is built on `@elysiajs/websocket` package.

### Testing with Bun Test Runner

```typescript
// test/app.test.ts
import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';

// Helper to create a test app
function createTestApp() {
  return new Elysia()
    .get('/hello', () => ({ message: 'Hello, World!' }))
    .get('/users/:id', ({ params: { id } }) => ({ user: { id: Number(id) } }))
    .post('/echo', ({ body }) => ({ echo: body }));
}

describe('Elysia App', () => {
  it('should respond to GET /hello', async () => {
    const app = createTestApp();

    const response = await app
      .handle(new Request('http://localhost/hello'))
      .then(res => res.json());

    expect(response).toEqual({ message: 'Hello, World!' });
  });

  it('should handle route params', async () => {
    const app = createTestApp();

    const response = await app
      .handle(new Request('http://localhost/users/42'))
      .then(res => res.json());

    expect(response).toEqual({ user: { id: 42 } });
  });

  it('should handle POST with body', async () => {
    const app = createTestApp();

    const response = await app
      .handle(
        new Request('http://localhost/echo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Alice' })
        })
      )
      .then(res => res.json());

    expect(response).toEqual({ echo: { name: 'Alice' } });
  });

  it('should return 404 for unknown routes', async () => {
    const app = createTestApp();

    const response = await app.handle(
      new Request('http://localhost/not-found')
    );

    expect(response.status).toBe(404);
  });
});
```

### Variable Path Patterns

```typescript
import { Elysia } from 'elysia';

const app = new Elysia()

  // --- Named params ---
  .get('/users/:userId/books/:bookId', ({ params }) => {
    return params; // { userId: string, bookId: string }
  })

  // --- Optional param (prefix with ?) ---
  .get('/products/:id?', ({ params }) => {
    if (params.id) {
      return { product: { id: params.id } };
    }
    return { products: [] };
  })

  // --- Wildcard (catch-all) param ---
  .get('/files/*', ({ params }) => {
    return { path: params['*'] };
  })

  .listen(3000);
```

### Production Deployment with Bun

```typescript
// src/index.ts — production-ready entry point
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';

const app = new Elysia()
  .use(cors())
  .use(swagger({
    path: '/docs',
    documentation: {
      info: {
        title: 'Production API',
        version: '1.0.0'
      }
    }
  }))
  .get('/health', () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  }))
  .listen(Bun.env.PORT || 3000);

console.log(`Server running on port ${app.server?.port}`);
```

```bash
# Production deployment commands
# Build TypeScript
bun build src/index.ts --outdir ./dist --target bun

# Start in production
NODE_ENV=production bun run dist/index.js

# Or use bun directly with hot reload disabled
bun run src/index.ts
```

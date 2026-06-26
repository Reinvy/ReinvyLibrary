---
title: "Bun Production Patterns Guide"
description: "A comprehensive guide to production-ready patterns and best practices for building, testing, and deploying applications with the Bun runtime — covering development workflows, performance optimization, and deployment strategies."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Bun Production Patterns Guide

## Introduction

Bun is an all-in-one JavaScript runtime and toolkit that includes a bundler, test runner, native SQLite client, and package manager. Its performance-focused design — powered by the JavaScriptCore engine instead of V8 — gives developers faster startup times, lower memory usage, and a streamlined development experience compared to Node.js or Deno.

This guide covers production-ready patterns for building and deploying Bun applications: from development environment setup and testing strategies to performance tuning, error handling, and deployment. Whether you are migrating an existing Node.js project or starting fresh with Bun, these practices will help you build robust, maintainable, and scalable applications.

## Best Practices

- **Use Bun's built-in toolchain** — Prefer `bun run`, `bun test`, `bun build`, and `bun install` over external tools. Bun's native implementations are faster, reduce dependency overhead, and provide consistent behavior across environments. Avoid mixing Bun with npm, npx, or pnpm in the same project.

- **Structure projects as Bun workspaces** — Use Bun's workspace support in `package.json` for monorepos. Workspaces share a single lockfile and hoist dependencies efficiently, reducing install times and disk usage compared to npm workspaces or yarn.

- **Prefer TypeScript with no build step** — Bun runs TypeScript natively without a compilation step before execution. Write `.ts` files directly and run them with `bun run`. For production distribution, use `bun build` to bundle TypeScript into JavaScript, but during development, skip the build step entirely.

- **Use `bun:sqlite` for embedded data storage** — Bun's built-in SQLite client (`bun:sqlite`) is significantly faster than `better-sqlite3` or `sql.js` because it bypasses Node.js bindings. Use it for embedded databases, caching layers, analytics, and single-process applications where a full PostgreSQL or MySQL database is unnecessary.

- **Implement graceful shutdown** — Register signal handlers for `SIGTERM` and `SIGINT` to close database connections, flush pending writes, and stop HTTP servers cleanly. Bun's `process.on` API works identically to Node.js but integration with `Bun.serve()` requires explicit server closure.

- **Optimize for Bun's JavaScriptCore engine** — Unlike V8, JavaScriptCore optimizes for different patterns. Prefer `for...of` loops over `forEach`, use `const` and `let` over `var`, and avoid V8-specific optimizations like inline caches that assume V8 behavior. Profile with `bun:jsc` to understand JSC-specific performance characteristics.

- **Use environment validation at startup** — Load and validate all required environment variables at application startup using `Bun.env` combined with a validation library (Zod or TypeBox). Fail fast with descriptive error messages rather than allowing a misconfigured application to serve traffic.

- **Employ connection pooling for production SQLite** — While `bun:sqlite` is fast, concurrent write access from multiple processes requires care. Use a single `Database` instance per process (Bun shares the connection across async tasks safely within one thread), and enable WAL mode for better concurrent read performance.

- **Write tests with `bun test`** — Bun's built-in test runner is Jest-compatible and significantly faster. Use `bun test` for unit tests, integration tests, and snapshot testing. Its native TypeScript support eliminates the need for ts-jest or @swc/jest configuration.

- **Bundle for production with `bun build`** — Use `bun build` to create optimized bundles for deployment. Target `bun` for Bun runtime, `node` for Node.js compatibility, or `browser` for frontend code. The bundler supports code splitting, minification, source maps, and tree-shaking out of the box.

## Implementation Steps

### Step 1: Initialize a Production-Ready Project

1. Create a new Bun project with `bun init`:

```bash
bun init -y
```

1. Configure the project structure:

```text
my-bun-app/
├── src/
│   ├── index.ts          # Entry point
│   ├── routes/           # Route handlers
│   ├── db/               # Database layer
│   ├── middleware/       # Request middleware
│   └── lib/             # Shared utilities
├── tests/               # Test files
├── scripts/             # Build and deploy scripts
├── bun.lock             # Bun lockfile
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project manifest
```

1. Configure TypeScript for Bun:

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "noEmit": true
  }
}
```

1. Add the `bun-types` package for type definitions:

```bash
bun add -d bun-types
```

### Step 2: Set Up Environment Validation

1. Create environment schema and validation:

```typescript
// src/lib/env.ts
import z from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_PATH: z.string().default('./data/app.db'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().transform(s => s.split(',')),
});

// Validate all env vars at startup
export const env = envSchema.parse(Bun.env);
```

1. Run validation before starting the server:

```typescript
// src/index.ts
import { env } from './lib/env';
// If env vars are invalid, the process exits here with a clear error

console.log(`Starting server in ${env.NODE_ENV} mode on port ${env.PORT}`);
```

### Step 3: Build a Production HTTP Server

1. Create a modular HTTP server with routing:

```typescript
// src/server.ts
import { env } from './lib/env';

interface RouteHandler {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, params: Record<string, string>) => Response | Promise<Response>;
}

export function createRouter() {
  const routes: RouteHandler[] = [];

  return {
    get(path: string, handler: RouteHandler['handler']) {
      routes.push({ method: 'GET', path, handler });
    },
    post(path: string, handler: RouteHandler['handler']) {
      routes.push({ method: 'POST', path, handler });
    },
    match(method: string, url: string) {
      for (const route of routes) {
        if (route.method !== method) continue;
        const pattern = new URLPattern({ pathname: route.path });
        const match = pattern.exec(url);
        if (match) {
          return { handler: route.handler, params: match.pathname.groups };
        }
      }
      return null;
    },
  };
}

export function startServer(router: ReturnType<typeof createRouter>) {
  const server = Bun.serve({
    port: env.PORT,
    async fetch(req: Request) {
      const url = new URL(req.url);
      const match = router.match(req.method, url.pathname);

      if (!match) {
        return new Response('Not Found', { status: 404 });
      }

      try {
        return await match.handler(req, match.params);
      } catch (error) {
        console.error('Unhandled error:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    },
  });

  console.log(`Server listening on http://localhost:${server.port}`);
  return server;
}
```

1. Implement graceful shutdown:

```typescript
// src/index.ts
import { createRouter, startServer } from './server';
import { env } from './lib/env';

const router = createRouter();

// Register routes
router.get('/api/health', () => Response.json({ status: 'ok' }));
router.get('/api/users/:id', async (req, params) => {
  return Response.json({ userId: params.id });
});

const server = startServer(router);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully');
  server.stop();
  // Close database connections, flush logs, etc.
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received — shutting down gracefully');
  server.stop();
  process.exit(0);
});
```

### Step 4: Implement Database Access with bun:sqlite

1. Create a database module with WAL mode and connection management:

```typescript
// src/db/database.ts
import { Database } from 'bun:sqlite';
import { env } from '../lib/env';

let db: Database | null = null;

export function getDatabase(): Database {
  if (!db) {
    db = new Database(env.DATABASE_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA busy_timeout = 5000');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
```

1. Create a type-safe repository pattern:

```typescript
// src/db/users.ts
import { getDatabase } from './database';

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export function createUser(name: string, email: string): User {
  const db = getDatabase();
  const query = db.query(
    'INSERT INTO users (name, email) VALUES ($name, $email) RETURNING *'
  );
  return query.get({ $name: name, $email: email }) as User;
}

export function findUserById(id: number): User | null {
  const db = getDatabase();
  const query = db.query('SELECT * FROM users WHERE id = $id');
  return query.get({ $id: id }) as User | null;
}

export function listUsers(): User[] {
  const db = getDatabase();
  return db.query('SELECT * FROM users ORDER BY createdAt DESC').all() as User[];
}
```

### Step 5: Write Tests with bun test

1. Create test files using Bun's test runner:

```typescript
// tests/users.test.ts
import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { getDatabase, closeDatabase } from '../src/db/database';
import { createUser, findUserById } from '../src/db/users';

// Use in-memory database for tests
process.env.DATABASE_PATH = ':memory:';

beforeAll(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
});

afterAll(() => {
  closeDatabase();
});

describe('User Repository', () => {
  test('creates a user and returns the record', () => {
    const user = createUser('Alice', 'alice@example.com');
    expect(user.id).toBeGreaterThan(0);
    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@example.com');
  });

  test('finds a user by id', () => {
    const user = createUser('Bob', 'bob@example.com');
    const found = findUserById(user.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Bob');
  });

  test('returns null for non-existent user', () => {
    const user = findUserById(99999);
    expect(user).toBeNull();
  });
});
```

1. Run tests:

```bash
bun test
```

1. Enable watch mode for development:

```bash
bun test --watch
```

### Step 6: Configure Logging and Error Handling

1. Create a structured logger:

```typescript
// src/lib/logger.ts
import { env } from './env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[env.LOG_LEVEL];
}

export const logger = {
  debug(msg: string, data?: Record<string, unknown>) {
    if (shouldLog('debug')) {
      console.log(JSON.stringify({ level: 'debug', msg, data, time: new Date().toISOString() }));
    }
  },
  info(msg: string, data?: Record<string, unknown>) {
    if (shouldLog('info')) {
      console.log(JSON.stringify({ level: 'info', msg, data, time: new Date().toISOString() }));
    }
  },
  warn(msg: string, data?: Record<string, unknown>) {
    if (shouldLog('warn')) {
      console.warn(JSON.stringify({ level: 'warn', msg, data, time: new Date().toISOString() }));
    }
  },
  error(msg: string, error?: Error, data?: Record<string, unknown>) {
    if (shouldLog('error')) {
      console.error(JSON.stringify({
        level: 'error',
        msg,
        error: error?.message,
        stack: error?.stack,
        data,
        time: new Date().toISOString(),
      }));
    }
  },
};
```

1. Create a centralized error handler:

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode }
    );
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  return Response.json(
    { error: { message: 'Internal Server Error' } },
    { status: 500 }
  );
}
```

### Step 7: Bundle for Production

1. Build the application for the Bun runtime:

```bash
bun build ./src/index.ts --outdir ./dist --target bun --minify --sourcemap
```

1. Create a production entry script:

```bash
#!/bin/bash
# scripts/start.sh
NODE_ENV=production bun run ./dist/index.js
```

1. For Docker-based deployment, create a multi-stage Dockerfile:

```dockerfile
# Dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build ./src/index.ts --outdir ./dist --target bun --minify --sourcemap

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["bun", "run", "./dist/index.js"]
```

Key points about the Docker setup:
- The `oven/bun:1-slim` image is only ~120 MB, significantly smaller than Node.js-based images.
- Use `--frozen-lockfile` in CI builds to ensure reproducible installs.
- The compiled output in `./dist` is a self-contained JavaScript bundle ready for Bun runtime.

### Step 8: Set Up CI/CD with Environment-Specific Configs

1. Create environment-specific ecosystem files for deployment:

```json
// ecosystem.production.json
{
  "name": "my-bun-app",
  "script": "./dist/index.js",
  "instances": "max",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3000"
  }
}
```

1. Add health check and readiness endpoints:

```typescript
// src/routes/health.ts
import { getDatabase } from '../db/database';

export async function healthCheck(): Promise<Response> {
  try {
    const db = getDatabase();
    db.query('SELECT 1').get();
    return Response.json({
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    return Response.json(
      { status: 'unhealthy', error: 'database connection failed' },
      { status: 503 }
    );
  }
}
```

### Step 9: Performance Profiling and Benchmarking

1. Use `bun:jsc` for runtime introspection:

```typescript
// scripts/profile.ts
import { heapStats, memoryUsage } from 'bun:jsc';

console.log('Heap stats:', heapStats());
console.log('Memory usage:', memoryUsage());
```

1. Benchmark route handlers:

```typescript
// tests/benchmarks/benchmark.ts
import { bench, run } from 'bun:test';

// Run with: bun test tests/benchmarks/benchmark.ts

bench('JSON serialization', () => {
  JSON.stringify({ hello: 'world', numbers: [1, 2, 3] });
});

bench('SHA-256 hash', async () => {
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hello'));
});

await run();
```

### Step 10: Migrate from Node.js to Bun

1. Verify that your project's dependencies are compatible with Bun:

```bash
bun add express
bun add -d typescript @types/bun
```

1. Replace Node.js specific patterns:

| Node.js Pattern | Bun Equivalent |
|----------------|----------------|
| `fs.readFileSync(path, 'utf-8')` | `await Bun.file(path).text()` |
| `fs.writeFileSync(path, data)` | `await Bun.write(path, data)` |
| `crypto.randomBytes(16).toString('hex')` | `crypto.randomUUID()` |
| `child_process.exec('ls -la')` | `Bun.$`\`ls -la\` |
| `path.join(__dirname, 'file.txt')` | `import.meta.dir + '/file.txt'` |
| `process.env.PORT` | `Bun.env.PORT` |
| `console.log()` / `util.inspect()` | `console.log()` same but use `Bun.inspect()` for deep objects |
| `server.close()` | `server.stop()` (from `Bun.serve()`) |

1. Update the `start` script in `package.json`:

```json
{
  "scripts": {
    "start": "bun run src/index.ts",
    "dev": "bun --watch src/index.ts",
    "test": "bun test",
    "build": "bun build ./src/index.ts --outdir ./dist --target bun --minify"
  }
}
```

## Conclusion

Adopting Bun for production applications brings significant performance benefits through faster startup, lower memory usage, and a streamlined toolchain. The patterns covered in this guide — structured project scaffolding, environment validation, modular HTTP servers, type-safe database access with `bun:sqlite`, comprehensive testing with `bun test`, structured logging, and Docker-based deployment — provide a solid foundation for building and operating Bun applications at scale.

Start by setting up a new project with `bun init` and the project structure outlined in Step 1, then gradually adopt the production practices as your application grows. Bun's native TypeScript support, built-in bundler, and Jest-compatible test runner mean fewer dependencies, simpler configuration, and faster development cycles compared to traditional Node.js workflows.

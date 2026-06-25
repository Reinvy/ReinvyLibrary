---
title: "Getting Started with Bun"
description: "A comprehensive introduction to Bun — an all-in-one JavaScript runtime, package manager, test runner, and bundler. Learn installation, core APIs, and production workflows."
category: "backend"
technology: "bun"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Getting Started with Bun

## Summary

This tutorial introduces Bun, the all-in-one JavaScript runtime and toolkit designed for speed. You will learn how to install Bun, use its built-in package manager, write HTTP servers and file operations, integrate SQLite databases, run tests, and deploy Bun applications to production.

## Target Audience

- Backend developers and full-stack JavaScript/TypeScript developers.
- Developers familiar with Node.js or Deno looking for a faster runtime alternative.

## Prerequisites

- Basic knowledge of JavaScript (ES modules, arrow functions, `async`/`await`).
- Familiarity with terminal/command-line usage.
- No prior Bun experience required.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Install and configure Bun on your development machine.
- Use `bun` CLI commands to initialize, run, and debug projects.
- Create an HTTP server using `Bun.serve()` with routing and middleware patterns.
- Read and write files using `Bun.file()` and `Bun.write()`.
- Perform SQLite database operations with `Bun.sqlite()`.
- Write and execute tests using Bun's built-in test runner.
- Manage dependencies with `bun install`, `bun add`, and `bun remove`.
- Build and bundle TypeScript projects for production deployment.

## Context and Motivation

JavaScript runtime performance has become a critical bottleneck as applications grow in complexity. While Node.js has been the dominant server-side runtime for over a decade, its architecture — rooted in 2009-era V8 design — introduces inherent latency in module resolution, package installation, and script execution. Bun was created to address these pain points directly.

Bun is built on top of **JavaScriptCore** (the engine powering Safari) rather than V8, and it includes a native package manager that resolves dependencies up to 30× faster than npm. It also ships with a built-in test runner (Node.js-compatible), a bundler, and a transpiler — eliminating the need for separate tools like Webpack, Babel, or Jest in many projects.

For teams working with **Elysia.js** (already covered in this library), Bun is the native runtime that enables Elysia's performance characteristics. Bun also simplifies full-stack TypeScript development by natively understanding TypeScript and JSX without configuration, removing the traditional `tsc` or `Babel` compilation step.

## Core Content

### Installation

Bun provides a single install script for macOS, Linux, and Windows (via WSL):

```bash
curl -fsSL https://bun.sh/install | bash
```

After installation, verify the version:

```bash
bun --version
```

For alternative installation methods (npm, Homebrew, or downloading binaries), refer to the [official documentation](https://bun.sh/docs/installation).

### Project Initialization

Create a new project and initialize it with Bun:

```bash
mkdir my-bun-project
cd my-bun-project
bun init
```

The `bun init` command prompts you for project details and generates a `package.json`, `tsconfig.json`, and an entry file (`index.ts`). Bun projects use TypeScript by default, but plain JavaScript is fully supported.

### Running Scripts

Execute a file with Bun:

```bash
bun run index.ts
```

Bun also supports inline scripts and watch mode:

```bash
# Run once
bun -e "console.log('Hello from Bun!')"

# Watch mode — restarts on file changes
bun --watch index.ts
```

### Package Management

Bun is a drop-in replacement for npm, Yarn, and pnpm. All familiar commands work as expected:

```bash
# Install dependencies from package.json
bun install

# Add a dependency
bun add express
bun add -d typescript    # dev dependency

# Remove a dependency
bun remove express

# Update all dependencies
bun update
```

Bun installs dependencies using a global module cache — identical to pnpm's strategy — which means the second project on your machine that installs the same package is nearly instantaneous.

### HTTP Server with Bun.serve()

Bun includes a native HTTP server that handles requests without any framework:

```typescript
const server = Bun.serve({
  port: 3000,
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response('Welcome to Bun!', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (url.pathname === '/api/hello' && request.method === 'GET') {
      return Response.json({ message: 'Hello from Bun!' });
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Server running on http://localhost:${server.port}`);
```

Key features of `Bun.serve()`:

- **Automatic TLS/SSL**: Pass `tls: { key, cert }` to enable HTTPS without reverse proxy setup.
- **Streaming responses**: Return `Response` objects with `ReadableStream` bodies for SSE or large payloads.
- **WebSocket support**: Add a `websocket` handler alongside `fetch` for real-time bidirectional communication.

### File I/O

Bun provides fast, ergonomic file APIs:

```typescript
// Read a file as text
const content = await Bun.file('data.txt').text();
console.log(content);

// Read a file as JSON
const config = await Bun.file('config.json').json();
console.log(config.port);

// Write to a file
await Bun.write('output.txt', 'Hello, file system!');

// Stream a file to HTTP response
const file = Bun.file('large-file.mp4');
return new Response(file);
```

`Bun.file()` returns a `BunFile` object that lazily reads the file. It supports `text()`, `json()`, `arrayBuffer()`, `stream()`, and direct conversion to a `Response` body — making it ideal for static file serving.

### SQLite Integration

Bun ships with a built-in, high-performance SQLite client. No separate `sqlite3` npm package needed:

```typescript
import { Database } from 'bun:sqlite';

// Open or create a database
const db = new Database('app.db');

// Create a table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  )
`);

// Insert data
const insert = db.prepare('INSERT INTO users (name, email) VALUES ($name, $email)');
insert.run({ $name: 'Alice', $email: 'alice@example.com' });

// Query data
const users = db.query('SELECT * FROM users').all();
console.log(users);

// Prepared statements for safety
const getUser = db.prepare('SELECT * FROM users WHERE id = $id');
const user = getUser.get({ $id: 1 });
console.log(user);

db.close();
```

`bun:sqlite` is a native binding to SQLite, making it significantly faster than the `better-sqlite3` npm package. It supports prepared statements, transactions, and WAL mode.

### Environment Variables

Bun provides built-in `.env` file loading and a convenient `Bun.env` object:

```bash
# .env
DATABASE_URL=sqlite://app.db
PORT=3000
```

```typescript
console.log(Bun.env.PORT);        // "3000"
console.log(Bun.env.DATABASE_URL); // "sqlite://app.db"
```

No `dotenv` package required — Bun automatically loads `.env`, `.env.local`, `.env.production`, and other standard env files.

### Testing with Bun

Bun includes a Jest-compatible test runner with zero configuration:

```typescript
// math.test.ts
import { describe, expect, test, beforeAll } from 'bun:test';

function add(a: number, b: number): number {
  return a + b;
}

describe('math utilities', () => {
  beforeAll(() => {
    console.log('Setting up test suite...');
  });

  test('adds two positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('adds negative numbers', () => {
    expect(add(-1, -1)).toBe(-2);
  });
});
```

Run tests:

```bash
bun test
```

Bun's test runner supports:

- **Snapshot testing** (`toMatchSnapshot`)
- **Mock functions** (`mock`)
- **Spies** (`spyOn`)
- **Timers** (`fakeTimers`)
- **Lifecycle hooks** (`beforeAll`, `afterAll`, `beforeEach`, `afterEach`)
- **Watch mode** (`bun test --watch`)

### Bundling for Production

Bun can bundle your application for production with its built-in bundler:

```bash
bun build ./src/index.ts --outdir ./dist --target bun
```

The `--target bun` flag optimizes the output for the Bun runtime. For browser applications, use `--target browser`; for Node.js compatibility, use `--target node`. The bundler automatically handles TypeScript, JSX, CSS imports, and code splitting.

## Code Examples

### Complete REST API Server

```typescript
import { Database } from 'bun:sqlite';

const db = new Database(':memory:');
db.run(`
  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0
  )
`);
db.run("INSERT INTO tasks (title) VALUES ('Learn Bun'), ('Build an API'), ('Deploy to production')");

const server = Bun.serve({
  port: 3001,
  fetch(request) {
    const url = new URL(request.url);

    // GET /tasks — list all tasks
    if (url.pathname === '/tasks' && request.method === 'GET') {
      const tasks = db.query('SELECT * FROM tasks').all();
      return Response.json(tasks);
    }

    // GET /tasks/:id — get single task
    const taskMatch = url.pathname.match(/^\/tasks\/(\d+)$/);
    if (taskMatch && request.method === 'GET') {
      const task = db.query('SELECT * FROM tasks WHERE id = $id').get({ $id: +taskMatch[1] });
      if (!task) return new Response('Not found', { status: 404 });
      return Response.json(task);
    }

    return new Response('Not found', { status: 404 });
  },
});

console.log(`Task API running on http://localhost:${server.port}`);
```

### File Server with Streaming

```typescript
Bun.serve({
  port: 3002,
  fetch(request) {
    const url = new URL(request.url);
    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;

    // Attempt to serve the file
    const file = Bun.file(`./public${filePath}`);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response('Not found', { status: 404 });
  },
});
```

## Key Insights

- **Bun is not a fork of Node.js**: It is a ground-up rewrite using JavaScriptCore, not V8. Most Node.js APIs are implemented as compatibility layers, so existing packages generally work, but native C++ addons may not.
- **The native package manager is a major differentiator**: `bun install` can reduce CI pipeline times by 50–80% compared to npm, especially in Docker builds where caching is limited.
- **SQLite is built-in, not an afterthought**: Unlike Node.js where SQLite requires a C++ addon compilation step, Bun's `bun:sqlite` is available immediately — a significant advantage for lightweight data storage and prototyping.
- **TypeScript works without configuration**: Bun natively understands TypeScript and JSX, eliminating the need for `tsc` or `Babel` in most projects. This removes an entire layer of tooling complexity.
- **Watch mode is first-class**: `bun --watch` provides automatic restarts on file changes, making development iteration faster without relying on third-party tools like `nodemon` or `ts-node-dev`.

## Next Steps

- Explore **Elysia.js** — a Bun-native web framework that leverages Bun's performance for fast HTTP servers with type-safe validation (covered in this library).
- Try Bun's **WebSocket API** with `Bun.serve({ websocket })` for real-time features.
- Set up a CI/CD pipeline using **GitHub Actions** that leverages `bun install` for faster dependency installation.
- Deploy your Bun application using Docker with the `oven/bun` base image.

## Conclusion

Bun represents a significant leap forward in JavaScript runtime performance and developer experience. Its integrated toolchain — package manager, test runner, bundler, and transpiler — reduces the complexity of modern JavaScript development while delivering dramatic speed improvements. By mastering Bun, you gain access to a modern runtime that complements the existing ecosystem and enables faster, simpler full-stack development workflows.

---
title: "Bun CLI and API Cheatsheet"
description: "A comprehensive quick reference for Bun CLI commands, built-in APIs, package management, test runner, and configuration — covering everything from daily development workflows to production deployment."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Bun CLI and API Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Create new project | `bun init` | Interactive project scaffolding (package.json, tsconfig.json, entry file) |
| Run a file | `bun run index.ts` | Execute TypeScript/JavaScript file |
| Watch mode | `bun --watch app.ts` | Auto-restart on file changes (replaces nodemon) |
| Install dependencies | `bun install` | Fast dependency installation from lockfile |
| Add a package | `bun add express` | Add runtime dependency |
| Add dev dependency | `bun add -d typescript` | Add devDependency |
| Remove a package | `bun remove lodash` | Uninstall and remove from package.json |
| Run tests | `bun test` | Jest-compatible test runner execution |
| Build for production | `bun build ./src/index.ts --outdir ./dist --target bun` | Bundle for Bun runtime |
| Format code | `bun run prettier --write .` | Run any npm package via bunx |
| Run package binary | `bunx prisma generate` | npx-equivalent for one-off commands |
| Shell command inline | `bun -e "console.log(1 + 1)"` | Execute inline script without file |
| Start REPL | `bun repl` | Interactive Bun REPL |
| Create binary | `bun build --compile ./src/index.ts --outfile myapp` | Compile to standalone executable |
| Check version | `bun --version` | Display installed Bun version |

## Common Commands

### Project Initialization

```bash
# Interactive project scaffolding
bun init

# Create a blank package.json only
bun init -y

# Initialize with specific entry point
bun init --entry=src/index.ts
```

### Running Scripts

```bash
# Run a file
bun run index.ts
bun run src/server.ts

# Run package.json script
bun run dev
bun run build
bun run start

# Execute inline script
bun -e "const x = await Bun.file('data.json').json(); console.log(x)"

# Run in watch mode (auto-restart on change)
bun --watch app.ts

# Hot reload (same as --watch)
bun --hot app.ts

# Inspect with debugger
bun --inspect app.ts
bun --inspect-brk app.ts
```

### Package Management

```bash
# Install from package.json
bun install

# Install with frozen lockfile (CI)
bun install --frozen-lockfile

# Install production dependencies only
bun install --production

# Add a package
bun add lodash
bun add zod@3.22.0
bun add @types/node -d

# Remove a package
bun remove axios

# Update all dependencies
bun update

# Update a specific package
bun update zod

# Run a package binary without installing
bunx prisma db push
bunx create-vite my-app

# List installed packages
bun pm ls

# Cache operations
bun pm cache list
bun pm cache clean
```

### Bundling

```bash
# Basic bundle for Bun runtime
bun build ./src/index.ts --outdir ./dist --target bun

# Bundle for browser
bun build ./src/index.ts --outdir ./dist --target browser

# Bundle for Node.js
bun build ./src/index.ts --outdir ./dist --target node

# Production minification
bun build ./src/index.ts --outdir ./dist --minify

# Generate source maps
bun build ./src/index.ts --outdir ./dist --sourcemap

# Bundle with external packages
bun build ./src/index.ts --outdir ./dist --external react

# Split into multiple chunks
bun build ./src/index.ts --outdir ./dist --splitting

# Compile to single binary executable
bun build --compile ./src/index.ts --outfile myapp
```

### Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run a specific test file
bun test tests/api.test.ts

# Run tests matching a pattern
bun test --test-name-pattern "auth"

# Update snapshots
bun test --update-snapshots

# Run tests with more verbose output
bun test --verbose
```

### TypeScript & Environment

```bash
# Type-check without running
bun run tsc --noEmit

# Generate TypeScript declarations
bun build ./src/index.ts --outdir ./dist --declaration

# Load specific .env file
bun --env-file=.env.production run app.ts
```

## Code Snippets

### HTTP Server — Bun.serve()

```typescript
// Basic HTTP server
Bun.serve({
  port: 3000,
  fetch(request) {
    return new Response("Hello, Bun!");
  },
});

// Server with routing
const server = Bun.serve({
  port: 3000,
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/users" && request.method === "GET") {
      return Response.json([{ id: 1, name: "Alice" }]);
    }
    if (url.pathname === "/api/users" && request.method === "POST") {
      return new Response("Created", { status: 201 });
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Listening on http://localhost:${server.port}`);

// TLS/HTTPS server
Bun.serve({
  port: 443,
  tls: {
    key: Bun.file("key.pem"),
    cert: Bun.file("cert.pem"),
  },
  fetch(request) {
    return new Response("Secure connection!");
  },
});

// WebSocket server
Bun.serve({
  port: 3000,
  fetch(request, server) {
    if (request.headers.get("upgrade") === "websocket") {
      return server.upgrade(request);
    }
    return new Response("WebSocket server");
  },
  websocket: {
    message(ws, message) {
      ws.send(`Echo: ${message}`);
    },
    open(ws) {
      console.log("Client connected");
    },
    close(ws) {
      console.log("Client disconnected");
    },
  },
});
```

### File I/O

```typescript
// Read file as text
const text = await Bun.file("data.txt").text();

// Read file as JSON
const json = await Bun.file("config.json").json();

// Read file as ArrayBuffer
const buffer = await Bun.file("image.png").arrayBuffer();

// Read file as stream
const stream = Bun.file("video.mp4").stream();

// Write string to file
await Bun.write("output.txt", "Hello, world!");

// Write JSON to file
await Bun.write("data.json", JSON.stringify({ key: "value" }, null, 2));

// Write Response to file
await Bun.write("page.html", await fetch("https://example.com"));

// Check if file exists
const file = Bun.file("path/to/file");
const exists = await file.exists();
const size = file.size;
const type = file.type;

// Stream file directly as HTTP response
Bun.serve({
  port: 3000,
  fetch() {
    return new Response(Bun.file("public/index.html"));
  },
});

// Writeable stream
const writer = Bun.file("output.txt").writer();
await writer.write("First line\n");
await writer.write("Second line\n");
await writer.end();
```

### SQLite — bun:sqlite

```typescript
import { Database } from "bun:sqlite";

// Open or create database
const db = new Database("app.db");

// In-memory database
const mem = new Database(":memory:");

// Create table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  )
`);

// Insert with prepared statement
const insert = db.prepare(
  "INSERT INTO users (name, email) VALUES ($name, $email)"
);
insert.run({ $name: "Bob", $email: "bob@example.com" });

// Query all rows
const all = db.query("SELECT * FROM users").all();

// Query single row
const user = db.query("SELECT * FROM users WHERE id = $id").get({ $id: 1 });

// Query with mapped types
type User = { id: number; name: string; email: string };
const users = db.query<User, []>("SELECT * FROM users").all();

// Transactions
const addUser = db.transaction(
  (name: string, email: string) => {
    db.run("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);
    return db.query("SELECT last_insert_rowid()").get();
  }
);
addUser("Charlie", "charlie@example.com");

// WAL mode for concurrent reads
db.run("PRAGMA journal_mode = WAL;");

// Close connection
db.close();
```

### Environment & Configuration

```typescript
// Read environment variable
const port = Bun.env.PORT;
const dbUrl = Bun.env.DATABASE_URL;

// With type coercion
const timeout = parseInt(Bun.env.TIMEOUT || "5000", 10);

// Check for required env vars
if (!Bun.env.API_KEY) {
  throw new Error("API_KEY is required");
}

// Type-safe env access
const env = {
  PORT: parseInt(Bun.env.PORT || "3000", 10),
  NODE_ENV: Bun.env.NODE_ENV || "development",
  DATABASE_URL: Bun.env.DATABASE_URL || "",
};

// Load custom env file
// Run with: bun --env-file=.env.local app.ts
// Or: bun --env-file=.env.production app.ts

// Bun automatically loads: .env, .env.local, .env.production
```

### Testing API — bun:test

```typescript
import { describe, expect, test, beforeAll, mock, spyOn } from "bun:test";

// Basic test
test("adds 1 + 2 to equal 3", () => {
  expect(1 + 2).toBe(3);
});

// Async test
test("fetches data", async () => {
  const response = await fetch("https://api.example.com/data");
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data).toHaveProperty("results");
});

// Grouped tests
describe("UserService", () => {
  beforeAll(() => {
    // Setup
  });

  test("creates a new user", () => {
    // ...
  });

  test("finds existing user", () => {
    // ...
  });
});

// Mock functions
const fetchMock = mock(() => Response.json({ id: 1 }));
const response = await fetchMock();
expect(fetchMock).toHaveBeenCalledTimes(1);

// Snapshot testing
test("matches snapshot", () => {
  const data = { user: { name: "Alice", age: 30 } };
  expect(data).toMatchSnapshot();
});

// Timers
import { fakeTimers } from "bun:test";
fakeTimers();

// Lifecycle hooks
beforeAll(() => { /* before all tests */ });
afterAll(() => { /* after all tests */ });
beforeEach(() => { /* before each test */ });
afterEach(() => { /* after each test */ });
```

### Process Management

```typescript
// Spawn a child process
const proc = Bun.spawn(["echo", "Hello from Bun!"]);
const output = await new Response(proc.stdout).text();
console.log(output); // "Hello from Bun!"

// Spawn with stdin
const proc2 = Bun.spawn(["wc", "-w"], {
  stdin: Bun.file("input.txt"),
});

// Spawn with pipes
const proc3 = Bun.spawn(["node", "server.js"], {
  env: { PORT: "3001" },
  cwd: "/path/to/project",
});

// Read stdout as text
const text = await Bun.readableStreamToText(proc3.stdout);

// Get exit code
const exitCode = await proc3.exited;

// Run shell command
const result = await Bun.$`echo "Hello from Bun!"`;
console.log(result.text());

// Shell pipe
const piped = await Bun.$`cat package.json | jq '.name'`;
console.log(piped.text());

// Kill process
proc.kill();
```

### Built-in Modules

```typescript
// bun:sqlite — SQLite database
import { Database } from "bun:sqlite";

// bun:test — Test runner
import { describe, expect, test, mock } from "bun:test";

// bun:ffi — Foreign function interface
import { dlopen, suffix } from "bun:ffi";

// bun:wrap — Built-in module wrapping
import { gc, drain } from "bun:jsc";

// bun — Global APIs (no import needed)
// Bun.serve(), Bun.file(), Bun.write(), Bun.env, Bun.spawn(), Bun.build()
// Bun.version, Bun.revision, Bun.nanoseconds(), Bun.sleep(), Bun.hash()
```

### Performance & Debugging

```typescript
// High-resolution time
const start = Bun.nanoseconds();
// ... do work ...
const elapsed = Bun.nanoseconds() - start;
console.log(`Took ${elapsed / 1_000_000}ms`);

// Sleep / delay
await Bun.sleep(1000); // sleep 1 second
await Bun.sleep(50);   // sleep 50ms

// Memory usage
const usage = process.memoryUsage();
console.log(usage);

// Inspector for Chrome DevTools
// bun --inspect app.ts
// Then open chrome://inspect in Chrome

// Bun's built-in hash function
const hash = await Bun.hash("my-string");
// Synchronous version
const hashSync = Bun.hashSync("my-string");
```

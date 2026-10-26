---
title: "Building a REST API with Bun and Hono"
description: "Build a typed REST API with Hono on Bun — routing, Zod validation, request-ID middleware, centralized error handling, bun:test coverage, and deployment."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a REST API with Bun and Hono

## Summary

Build a task-management REST API with Hono on the Bun runtime: typed routing, Zod validation, correlation-aware logging, one error formatter, in-process tests, and two deployment paths.

## Target Audience

- Backend developers who know HTTP and TypeScript and want a small, fast stack.
- Intermediate developers comfortable with async/await, JSON APIs, and generics.

## Prerequisites

- Bun 1.1+ installed (`bun --version`), plus Node.js 20+ for editor tooling.
- `bun add hono @hono/zod-validator zod && bun add -d @types/bun` in a fresh `bun init -y` project.
- Familiarity with REST semantics, HTTP status codes, and `curl` for manual checks.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Serve a Hono app through `Bun.serve` with graceful shutdown.
- Type path and query parameters and validate bodies with Zod.
- Apply middleware for request IDs, logging, and CORS.
- Centralize expected and unexpected failures, then test and deploy.

## Context and Motivation

Express-style APIs on Node carry a long middleware chain, a separate transpile step, and a heavy dependency tree. Hono is a Web-standard router of roughly 14 kB with real TypeScript inference, so `c.req.param("id")` is typed at compile time. Bun supplies native TypeScript, a built-in test runner, and `Bun.serve`, which handles tens of thousands of requests per second per core. The payoff is a service readable in one sitting, where validation and error shapes are defined once and reused by tests and clients alike.

## Core Content

### Layering, validation, and errors

Keep transport (routes, middleware) separate from domain logic (services). `app.ts` assembles the Hono instance and is exported for tests; `index.ts` owns `Bun.serve` and signal handling, so tests never bind a port.

`@hono/zod-validator` turns a schema into middleware that parses `json`, `query`, or `param`, so `c.req.valid("json")` is inferred with no casts. Model expected failures (404, 409 on duplicates) as `HttpError` with a status and machine-readable code; log unexpected ones with the request ID and return an opaque 500. `app.onError` formats both.

## Code Examples

### Errors and error middleware

```typescript
// src/errors.ts
import type { Context } from "hono";

export class HttpError extends Error {
    constructor(
        public readonly status: 400 | 404 | 409 | 422 | 500,
        message: string,
        public readonly code = "error",
    ) {
        super(message);
    }
}

export function onError(err: Error, c: Context) {
    const requestId = c.get("requestId") ?? "unknown";
    if (err instanceof HttpError) return c.json({ error: { code: err.code, message: err.message, requestId } }, err.status);
    // Unexpected: log with correlation, leak nothing to the client
    console.error(JSON.stringify({ level: "error", requestId, message: err.message }));
    return c.json({ error: { code: "internal_error", message: "Unexpected error", requestId } }, 500);
}
```

### Typed routes with validation

```typescript
// src/routes/tasks.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HttpError } from "../errors";
import { listTasks, createTask } from "../services/tasks";

const createSchema = z.object({ title: z.string().min(1).max(120), done: z.boolean().default(false) });
export const tasks = new Hono<{ Variables: { requestId: string } }>();

tasks.get("/", async (c) => c.json({ items: await listTasks(c.req.query("done") === "true") }));
tasks.post("/", zValidator("json", createSchema, (result) => {
    if (!result.success) throw new HttpError(422, "Invalid payload", "validation_failed");
}), async (c) => c.json(await createTask(c.req.valid("json")), 201));
```

### App assembly and server entrypoint

```typescript
// src/app.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { onError } from "./errors";
import { tasks } from "./routes/tasks";

export const app = new Hono<{ Variables: { requestId: string } }>();

app.use("*", createMiddleware<{ Variables: { requestId: string } }>(async (c, next) => {
    const id = c.req.header("x-request-id") ?? crypto.randomUUID();
    c.set("requestId", id); c.header("x-request-id", id);
    const start = performance.now();
    await next();
    console.log(JSON.stringify({ requestId: id, path: c.req.path, status: c.res.status, ms: Math.round(performance.now() - start) }));
}));
app.use("/api/*", cors({ origin: ["https://app.example.com"], maxAge: 600 }));
app.route("/api/tasks", tasks);
app.onError(onError);
```

```typescript
// src/index.ts
import { app } from "./app";

const server = Bun.serve({ port: Number(Bun.env.PORT ?? 3000), fetch: app.fetch });

for (const sig of ["SIGTERM", "SIGINT"] as const) process.on(sig, () => server.stop().then(() => process.exit(0)));
console.log(`listening on :${server.port}`);
```

### Tests and deploy

Run the suite with `bun test`; it calls the app in-process, so no port is bound. Deploy with `bun src/index.ts` or `bun build --compile --minify src/index.ts --outfile ./dist/api`.

```typescript
// src/app.test.ts
import { expect, it } from "bun:test";
import { app } from "./app";

const post = (title: string) =>
    app.request("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) });

it("creates a task", async () => {
    const res = await post("write tests");
    expect(res.status).toBe(201);
    expect(res.headers.get("x-request-id")).toBeTruthy();
});

it("rejects an empty title", async () => {
    const res = await post("");
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("validation_failed");
});
```

## Key Insights

- Export the app from `app.ts` and keep `Bun.serve` in `index.ts`, so tests stay port-free.
- Validate once at the boundary, then trust the inferred types downstream.
- Echo `x-request-id` on every response so a screenshot of a failure is searchable in logs.
- One process serves all requests and Hono does not cap JSON body size: avoid shared mutable state and add a size guard on public endpoints.
- `bun build --compile` handles native addons poorly; if you need `bcrypt`, deploy a Bun process.

## Next Steps

- Add persistence with `bun:sqlite` and Drizzle, wrapping writes in transactions.
- Layer authentication with Hono's `bearerAuth` middleware and scoped tokens.
- Split the API into packages with the Bun Workspaces monorepo cheatsheet.

## Conclusion

You now have typed routes, boundary validation, correlated logging, a single error formatter, and fast in-process tests in a stack small enough to read end to end. Persistence, auth, and deploy automation are now additive rather than structural changes.

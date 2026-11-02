---
title: "Building a GraphQL API with Bun and GraphQL Yoga"
description: "A project-based tutorial on building a production-shaped GraphQL API on Bun with GraphQL Yoga — SDL schema design, typed resolvers, request-scoped context for authentication, DataLoader batching to kill N+1 queries, cursor pagination, subscriptions over Bun's native WebSocket support, and testing the whole schema with bun test."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a GraphQL API with Bun and GraphQL Yoga

## Summary

In this project-based tutorial you will build a **project tracker GraphQL API** on top of Bun using GraphQL Yoga. Starting from a single schema file and `Bun.serve()`, you will add request-scoped context for authentication and authorization, batched data loading with DataLoader to eliminate N+1 queries, cursor-based pagination that survives concurrent writes, live updates through GraphQL subscriptions running on Bun's built-in WebSocket server, and an end-to-end test suite executed with `bun test`. The end result is a single-process API that serves queries, mutations, and subscriptions from one port with no Express and no separate WebSocket server.

## Target Audience

- Backend and fullstack developers who already ship REST APIs and need to add a typed, client-driven GraphQL surface.
- Developers comfortable with TypeScript generics, async resolvers, and SQL who want a realistic GraphQL architecture instead of a resolver that returns a hardcoded array.
- Teams evaluating Bun as a production runtime who want to see its HTTP, WebSocket, SQLite, and test APIs working together in one service.

## Prerequisites

- Solid TypeScript: generics, discriminated unions, `async`/`await`, and module resolution.
- Working knowledge of GraphQL fundamentals — types, queries, mutations, resolvers, and fragments.
- Bun installed locally (`bun --version`) and basic familiarity with `bun install`, `bun run`, and `bun test`.
- Familiarity with relational modeling and basic SQL, since the data layer uses `bun:sqlite`.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Design an SDL-first GraphQL schema whose nullability and input types encode real domain rules.
- Wire GraphQL Yoga into `Bun.serve()` and expose a single endpoint that handles both HTTP operations and WebSocket subscriptions.
- Build a request-scoped context that carries an authenticated viewer, a per-request SQLite handle, and per-request loaders.
- Eliminate N+1 query patterns with DataLoader batching and prove the reduction by counting SQL statements.
- Implement Relay-style cursor pagination and explain why offset pagination breaks under concurrent inserts.
- Authorize at the field boundary using resolver-level guards that cannot be bypassed by a nested query.
- Test queries, mutations, and authorization failures with `bun test` against an in-memory database.

## Context and Motivation

REST works well when clients consume one resource shape at a time, but product surfaces rarely behave that way. An activity feed needs a project, its owner, its last five tasks, and each task's assignee in one round trip. In REST that is either four endpoints and a lot of client orchestration, or one endpoint that over-fetches fields the screen never renders. GraphQL moves that decision to the client, and a schema makes the contract explicit and checkable.

The hard part is never the schema file. It is everything around it: batching so nested resolvers do not issue a query per row, authorization that a client cannot dodge by nesting deeper, pagination that is stable while the dataset changes, and a server that handles long-lived subscriptions without a second process. Those are exactly the concerns that separate a demo from an API you can put behind a mobile client.

Bun is unusually well suited to this shape of service because the pieces you would otherwise assemble from several libraries ship in the runtime: `Bun.serve()` handles HTTP and upgrades to WebSocket on the same port, `bun:sqlite` gives a synchronous embedded database with prepared statements, and `bun test` runs the suite without a separate test runner. GraphQL Yoga layers onto that as a `fetch`-style handler, which is exactly the function signature `Bun.serve()` expects.

## Core Content

### Why a schema-first GraphQL layer on Bun

Two decisions shape the rest of this tutorial. The first is **SDL-first**: you write `schema.graphql` as the source of truth and map resolvers onto it, rather than generating the schema from decorators or code-first builders. SDL keeps the contract reviewable in a pull request, gives you a file to diff when the API changes, and lets frontend teams read the schema without reading TypeScript.

The second is **one process, one port**. `Bun.serve()` accepts an HTTP `fetch` handler and a `websocket` handler in the same configuration object, so HTTP and `ws://` traffic share a listener and a TLS certificate. GraphQL Yoga's `yoga.fetch` is a standard `(Request) => Response` function, so it drops straight into that handler.

```text
Bun.serve({
  fetch: handles /graphql (queries + mutations)
  websocket: handles subscriptions on the same port
})
        |
        v
GraphQL Yoga  ->  schema.graphql  ->  resolvers
                                   ->  context (viewer, db, loaders)
                                   ->  data sources (bun:sqlite)
```

### Designing nullability so the schema carries the rules

Nullability is the most consequential choice in SDL. Marking a field non-null (`Project!`) promises clients the value always exists, and a resolver that returns `null` for it fails the entire parent object. The rule used here: **non-null for fields the domain guarantees, nullable for fields whose absence is meaningful**.

A `Task` always has an `id`, a `title`, and a `status`, so those are non-null. Its `assignee` is nullable because unassigned tasks are legitimate. Its `dueAt` is nullable because not every task has a deadline. A list of tasks is non-null (`[Task!]!`) — the list itself always exists, though it may be empty — because returning `null` for "no tasks" forces every client into a null check that means nothing.

Input and output types are kept separate even when they look identical. `CreateTaskInput` omits `id` and `createdAt` because the server owns them; sharing one type for both directions is how clients end up sending fields the server silently ignores.

### Request-scoped context: viewer, database, loaders

Context is the only channel resolvers share, and its lifetime is exactly one request. Three things belong in it:

1. The **viewer** — the authenticated user or `null` for anonymous requests, resolved once from the `Authorization` header.
2. The **database handle** — a `bun:sqlite` `Database` instance bound to the request, or a scoped query facade.
3. The **loaders** — DataLoader instances created fresh per request so their caches never leak across users.

Point three is the one worth stating plainly: a module-level DataLoader is a correctness bug waiting to happen. Its cache is keyed by ID only, so request A's cached `Project:7` would be served to request B even if request B's viewer must not see it. Creating loaders inside the context factory scopes the cache to the request and makes it disappear when the response is sent.

### Killing N+1 queries with DataLoader

A naive resolver for `Project.tasks` runs one `SELECT ... WHERE project_id = ?` per project. A query returning fifty projects therefore issues fifty-one statements. DataLoader collapses that into one: within a single tick it collects every requested `projectId` into a batch, executes `SELECT ... WHERE project_id IN (...)` once, and returns results in the order requested.

Batching only helps if the batch function is honest about shape. `loadMany` returns an array that must have the same length as the keys array, with `Error` entries where a lookup failed and `null` where the row does not exist. Returning a shorter array silently misaligns results — the classic DataLoader bug where task lists appear attached to the wrong project.

### Authorization at the field boundary

Authentication answers "who are you"; authorization answers "may you see this". Encoding authorization in the top-level mutation only is insufficient, because GraphQL clients can reach the same data through nested paths. A `project(id:)` query guarded by an ownership check is worthless if `viewer.projects` returns the same rows unguarded.

The pattern used here is a small set of guard helpers (`requireViewer`, `requireProjectAccess`, `requireTaskAccess`) called from every resolver that returns protected data, plus a result-level rule: fields that expose sensitive scalars (such as `Project.internalNotes`) resolve to `null` unless the viewer holds the `admin` role. Resolvers are the enforcement point; the schema is only the shape.

### Cursor pagination that survives concurrent writes

Offset pagination (`LIMIT 20 OFFSET 40`) is easy and wrong for feeds. If a row is inserted while a client pages forward, every subsequent page shifts by one and the client sees a duplicate; a delete produces a silent skip. Cursor pagination keys off the last row the client actually received, so inserts and deletes cannot move the window.

The implementation uses a compound cursor of `(createdAt, id)` and a `WHERE (created_at, id) < (?, ?)` predicate. The `id` tiebreaker matters: timestamps collide at second or millisecond resolution, and without a stable secondary key two rows sharing a timestamp can be included twice or dropped. The response exposes `edges`, `pageInfo.hasNextPage`, and `pageInfo.endCursor`, so the client never constructs a cursor itself.

### Subscriptions over Bun's WebSocket handler

Subscriptions push data when server-side state changes. Two transports exist: WebSocket and server-sent events. WebSocket is the better fit here because `Bun.serve()` already owns the upgrade handshake — you forward the socket to Yoga's `subscribe` API and let the schema's `Subscription` type define what clients may listen for.

The operational detail that bites in production is cleanup. Each subscription holds a socket and an async iterator; when a client disconnects mid-stream you must signal the iterator to return and drop it from the topic map. Skipping this leaks a generator per closed tab, and since each generator may hold a SQLite statement handle, the leak is not just memory. The example below stores the `AbortController` alongside the socket and aborts it on `close`.

## Code Examples

### Project layout and dependencies

```text
project-tracker/
  package.json
  schema.graphql
  src/
    db.ts
    loaders.ts
    context.ts
    resolvers.ts
    server.ts
  tests/
    api.test.ts
```

```bash
mkdir project-tracker && cd project-tracker
bun init -y
bun add graphql yoga graphql-yoga dataloader
```

### The schema

```graphql
type Query {
  viewer: User
  project(id: ID!): Project
  projects(first: Int = 20, after: String): ProjectConnection!
  task(id: ID!): Task
}

type Mutation {
  createProject(input: CreateProjectInput!): CreateProjectPayload!
  createTask(input: CreateTaskInput!): CreateTaskPayload!
  assignTask(taskId: ID!, assigneeId: ID): UpdateTaskPayload!
}

type Subscription {
  taskStatusChanged(projectId: ID!): Task!
}

type User {
  id: ID!
  name: String!
  email: String!
  role: Role!
}

enum Role {
  MEMBER
  ADMIN
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

type Project {
  id: ID!
  name: String!
  owner: User!
  tasks(first: Int = 10, after: String): TaskConnection!
  internalNotes: String
  createdAt: String!
}

type Task {
  id: ID!
  title: String!
  status: TaskStatus!
  assignee: User
  dueAt: String
  project: Project!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type ProjectEdge {
  cursor: String!
  node: Project!
}

type ProjectConnection {
  edges: [ProjectEdge!]!
  pageInfo: PageInfo!
}

type TaskEdge {
  cursor: String!
  node: Task!
}

type TaskConnection {
  edges: [TaskEdge!]!
  pageInfo: PageInfo!
}

input CreateProjectInput {
  name: String!
}

input CreateTaskInput {
  projectId: ID!
  title: String!
  dueAt: String
}

type CreateProjectPayload {
  project: Project!
}

type CreateTaskPayload {
  task: Task!
}

type UpdateTaskPayload {
  task: Task!
}
```

### Database layer with `bun:sqlite`

```typescript
import { Database } from "bun:sqlite";

export type Role = "MEMBER" | "ADMIN";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export function createDatabase(path = ":memory:") {
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'MEMBER'
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL REFERENCES users(id),
      internal_notes TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'TODO',
      assignee_id INTEGER REFERENCES users(id),
      due_at TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, created_at, id);
    CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at, id);
  `);

  return db;
}

export type Db = ReturnType<typeof createDatabase>;

export function encodeCursor(createdAt: number, id: number): string {
  return Buffer.from(`${createdAt}:${id}`, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): { createdAt: number; id: number } {
  const [rawCreatedAt, rawId] = Buffer.from(cursor, "base64url").toString("utf8").split(":");
  const createdAt = Number(rawCreatedAt);
  const id = Number(rawId);
  if (!Number.isFinite(createdAt) || !Number.isFinite(id)) {
    throw new Error("Invalid cursor");
  }
  return { createdAt, id };
}
```

### Batched loaders

```typescript
import DataLoader from "dataloader";
import type { Db } from "./db";

export function createLoaders(db: Db, viewerId: number | null) {
  const tasksByProject = new DataLoader<number, unknown[]>(async (projectIds) => {
    const placeholders = projectIds.map(() => "?").join(", ");
    const rows = db
      .query(
        `SELECT * FROM tasks WHERE project_id IN (${placeholders}) ORDER BY created_at DESC`,
      )
      .all(...projectIds) as Array<{ project_id: number }>;

    const grouped = new Map<number, unknown[]>();
    for (const id of projectIds) grouped.set(id, []);
    for (const row of rows) grouped.get(row.project_id)!.push(row);
    return projectIds.map((id) => grouped.get(id) ?? []);
  });

  const userById = new DataLoader<number, unknown>(async (ids) => {
    const unique = [...new Set(ids)];
    const placeholders = unique.map(() => "?").join(", ");
    const rows = db
      .query(`SELECT * FROM users WHERE id IN (${placeholders})`)
      .all(...unique) as Array<{ id: number }>;
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => byId.get(id) ?? null);
  });

  const projectById = new DataLoader<number, unknown>(async (ids) => {
    const unique = [...new Set(ids)];
    const placeholders = unique.map(() => "?").join(", ");
    const rows = db
      .query(`SELECT * FROM projects WHERE id IN (${placeholders})`)
      .all(...unique) as Array<{ id: number }>;
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => byId.get(id) ?? null);
  });

  return { tasksByProject, userById, projectById, viewerId };
}

export type Loaders = ReturnType<typeof createLoaders>;
```

Two invariants make or break these batch functions. Every returned array must be exactly as long as the input array, and it must follow the input order. `loadMany`-style callers with a missing row expect `null` in that slot, never a gap.

### Context factory and guards

```typescript
import type { Db } from "./db";
import { createLoaders, type Loaders } from "./loaders";

export type Viewer = { id: number; email: string; role: "MEMBER" | "ADMIN" };

export type Context = {
  db: Db;
  viewer: Viewer | null;
  loaders: Loaders;
  publish: (projectId: number, task: unknown) => void;
};

export function requireViewer(ctx: Context): Viewer {
  if (!ctx.viewer) throw new Error("UNAUTHENTICATED: sign in to continue");
  return ctx.viewer;
}

async function resolveViewer(db: Db, token: string | null): Promise<Viewer | null> {
  if (!token) return null;
  // In production verify a signed JWT here; this tutorial keeps the token
  // as a user id so the authorization logic stays in focus.
  const row = db.query("SELECT id, email, role FROM users WHERE id = ?").get(Number(token)) as
    | Viewer
    | null;
  return row ?? null;
}

export async function createContext(
  db: Db,
  headers: Headers,
  publish: Context["publish"],
): Promise<Context> {
  const token = headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const viewer = await resolveViewer(db, token);
  return {
    db,
    viewer,
    // Fresh per request: the DataLoader cache must never outlive the viewer it was built for.
    loaders: createLoaders(db, viewer?.id ?? null),
    publish,
  };
}

export async function assertProjectAccess(ctx: Context, projectId: number) {
  const viewer = requireViewer(ctx);
  const project = ctx.db
    .query("SELECT id, owner_id FROM projects WHERE id = ?")
    .get(projectId) as { id: number; owner_id: number } | null;
  if (!project) throw new Error("NOT_FOUND: project does not exist");
  if (viewer.role !== "ADMIN" && project.owner_id !== viewer.id) {
    throw new Error("FORBIDDEN: you do not have access to this project");
  }
  return project;
}
```

### Resolvers with cursors and guards

```typescript
import { decodeCursor, encodeCursor, type Db } from "./db";
import { assertProjectAccess, requireViewer, type Context } from "./context";

type ProjectRow = {
  id: number;
  name: string;
  owner_id: number;
  internal_notes: string | null;
  created_at: number;
};

export const resolvers = {
  Query: {
    viewer: (_: unknown, __: unknown, ctx: Context) =>
      ctx.viewer ? ctx.loaders.userById.load(ctx.viewer.id) : null,

    project: async (_: unknown, args: { id: string }, ctx: Context) => {
      const id = Number(args.id);
      return ctx.loaders.projectById.load(id);
    },

    projects: async (
      _: unknown,
      args: { first: number; after: string | null },
      ctx: Context,
    ) => {
      const viewer = requireViewer(ctx);
      const limit = Math.min(Math.max(args.first, 1), 100);
      const params: number[] = [];
      let where = "WHERE owner_id = ?";
      params.push(viewer.id);

      if (args.after) {
        const { createdAt, id } = decodeCursor(args.after);
        where += " AND (created_at < ? OR (created_at = ? AND id < ?))";
        params.push(createdAt, createdAt, id);
      }

      const rows = ctx.db
        .query(
          `SELECT * FROM projects ${where} ORDER BY created_at DESC, id DESC LIMIT ?`,
        )
        .all(...params, limit + 1) as ProjectRow[];

      const hasNextPage = rows.length > limit;
      const page = hasNextPage ? rows.slice(0, limit) : rows;
      const last = page.at(-1);

      return {
        edges: page.map((node) => ({
          cursor: encodeCursor(node.created_at, node.id),
          node,
        })),
        pageInfo: {
          hasNextPage,
          endCursor: last ? encodeCursor(last.created_at, last.id) : null,
        },
      };
    },
  },

  Mutation: {
    createProject: async (_: unknown, args: { input: { name: string } }, ctx: Context) => {
      const viewer = requireViewer(ctx);
      const createdAt = Date.now();
      const row = ctx.db
        .query(
          "INSERT INTO projects (name, owner_id, created_at) VALUES (?, ?, ?) RETURNING *",
        )
        .get(args.input.name, viewer.id, createdAt) as ProjectRow;
      return { project: row };
    },

    assignTask: async (
      _: unknown,
      args: { taskId: string; assigneeId: string | null },
      ctx: Context,
    ) => {
      const taskId = Number(args.taskId);
      const task = ctx.db.query("SELECT project_id FROM tasks WHERE id = ?").get(taskId) as
        | { project_id: number }
        | null;
      if (!task) throw new Error("NOT_FOUND: task does not exist");
      await assertProjectAccess(ctx, task.project_id);

      if (args.assigneeId) {
        ctx.db
          .query("UPDATE tasks SET assignee_id = ? WHERE id = ?")
          .run(Number(args.assigneeId), taskId);
      } else {
        ctx.db.query("UPDATE tasks SET assignee_id = NULL WHERE id = ?").run(taskId);
      }

      const updated = ctx.db.query("SELECT * FROM tasks WHERE id = ?").get(taskId);
      return { task: updated };
    },
  },

  Project: {
    owner: (project: ProjectRow, _: unknown, ctx: Context) =>
      ctx.loaders.userById.load(project.owner_id),

    tasks: async (
      project: ProjectRow,
      args: { first: number; after: string | null },
      ctx: Context,
    ) => {
      const limit = Math.min(Math.max(args.first, 1), 100);
      const params: unknown[] = [project.id];
      let where = "WHERE project_id = ?";
      if (args.after) {
        const { createdAt, id } = decodeCursor(args.after);
        where += " AND (created_at < ? OR (created_at = ? AND id < ?))";
        params.push(createdAt, createdAt, id);
      }
      const rows = ctx.db
        .query(
          `SELECT * FROM tasks ${where} ORDER BY created_at DESC, id DESC LIMIT ?`,
        )
        .all(...params, limit + 1) as Array<{ created_at: number; id: number }>;

      const hasNextPage = rows.length > limit;
      const page = hasNextPage ? rows.slice(0, limit) : rows;
      const last = page.at(-1);
      return {
        edges: page.map((node) => ({
          cursor: encodeCursor(node.created_at, node.id),
          node,
        })),
        pageInfo: {
          hasNextPage,
          endCursor: last ? encodeCursor(last.created_at, last.id) : null,
        },
      };
    },

    // Field-level rule: sensitive scalars vanish for non-admins, no matter how deep the query nests.
    internalNotes: (project: ProjectRow, _: unknown, ctx: Context) =>
      ctx.viewer?.role === "ADMIN" ? project.internal_notes : null,
  },

  Task: {
    // Kept nullable on the schema so an unassigned task does not fail the parent.
    assignee: (task: { assignee_id: number | null }, _: unknown, ctx: Context) =>
      task.assignee_id ? ctx.loaders.userById.load(task.assignee_id) : null,

    project: (task: { project_id: number }, _: unknown, ctx: Context) =>
      ctx.loaders.projectById.load(task.project_id),

    status: (task: { status: string }) => task.status,
  },
};
```

### Server: HTTP operations and subscriptions on one port

```typescript
import { createSchema, createYoga } from "graphql-yoga";
import { readFileSync } from "node:fs";
import { createDatabase } from "./db";
import { createContext, type Context } from "./context";
import { resolvers } from "./resolvers";

const db = createDatabase(process.env.DATABASE_PATH ?? ":memory:");

// Minimal pub/sub: project id -> set of listener callbacks.
const topics = new Map<number, Set<(payload: unknown) => void>>();

function publish(projectId: number, task: unknown) {
  for (const listener of topics.get(projectId) ?? []) listener(task);
}

function subscribe(projectId: number, listener: (payload: unknown) => void) {
  const set = topics.get(projectId) ?? new Set();
  set.add(listener);
  topics.set(projectId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) topics.delete(projectId);
  };
}

const typeDefs = readFileSync(new URL("../schema.graphql", import.meta.url), "utf8");

const yoga = createYoga<{ upgrade: boolean }>({
  schema: createSchema({
    typeDefs,
    resolvers: {
      ...resolvers,
      Subscription: {
        taskStatusChanged: {
          subscribe: async function* (_: unknown, args: { projectId: string }, ctx: Context) {
            const projectId = Number(args.projectId);
            const queue: unknown[] = [];
            let resolveNext: (() => void) | null = null;
            const unsubscribe = subscribe(projectId, (task) => {
              queue.push(task);
              resolveNext?.();
            });
            const abort = ctx.signal;
            try {
              while (!abort.aborted) {
                if (queue.length === 0) {
                  await new Promise<void>((resolve) => {
                    resolveNext = resolve;
                    abort.addEventListener("abort", () => resolve(), { once: true });
                  });
                }
                const next = queue.shift();
                if (next !== undefined) yield { taskStatusChanged: next };
              }
            } finally {
              unsubscribe();
            }
          },
          resolve: (payload: unknown) => payload,
        },
      },
    },
  }),
  context: ({ request }) => createContext(db, request.headers, publish),
  graphqlEndpoint: "/graphql",
});

const server = Bun.serve({
  port: Number(process.env.PORT ?? 4000),
  // HTTP queries and mutations go straight to Yoga's fetch handler.
  fetch: (request, srv) => {
    const url = new URL(request.url);
    if (url.pathname === "/graphql" && request.headers.get("upgrade") === "websocket") {
      if (srv.upgrade(request, { data: { projectId: Number(url.searchParams.get("projectId")) } })) {
        return undefined as unknown as Response;
      }
      return new Response("Expected websocket upgrade", { status: 400 });
    }
    return yoga.fetch(request);
  },
  websocket: {
    async message(ws, raw) {
      // Yoga's subscribe() drives the same schema over the socket.
      const result = await yoga.fetch(
        new Request(`http://localhost/graphql`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-websocket": "1" },
          body: typeof raw === "string" ? raw : new TextDecoder().decode(raw),
        }),
      );
      const payload = await result.text();
      ws.send(payload);
    },
    close(ws) {
      // Abort every stream owned by this socket so its iterator and
      // any held SQLite statement handles are released.
      ws.data?.abort?.abort();
    },
  },
});

console.log(`GraphQL API ready on ${server.url}graphql`);
```

### Seeding and a first query

```bash
bun -e '
const { Database } = require("bun:sqlite");
const db = new Database(process.env.DATABASE_PATH ?? ":memory:");
db.exec("INSERT INTO users (id, name, email, role) VALUES (1, \"Ada\", \"ada@example.com\", \"ADMIN\")");
db.exec("INSERT INTO projects (id, name, owner_id, created_at) VALUES (1, \"Launch\", 1, 1700000000000)");
console.log("seeded");
'
```

```bash
curl -s http://localhost:4000/graphql \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer 1' \
  -d '{"query":"{ viewer { name role } projects(first: 2) { edges { cursor node { name tasks(first: 3) { edges { node { title status } } } } } pageInfo { hasNextPage endCursor } } }"}'
```

### Testing with `bun test`

```typescript
import { describe, expect, test, beforeEach } from "bun:test";
import { createSchema } from "graphql-yoga";
import { graphql } from "graphql";
import { readFileSync } from "node:fs";
import { executeOperation } from "graphql-yoga";
import { createDatabase } from "../src/db";
import { createContext } from "../src/context";
import { resolvers } from "../src/resolvers";

const typeDefs = readFileSync(new URL("../schema.graphql", import.meta.url), "utf8");

let db: ReturnType<typeof createDatabase>;

beforeEach(() => {
  db = createDatabase();
  db.exec("INSERT INTO users (id, name, email, role) VALUES (1, 'Ada', 'ada@example.com', 'ADMIN')");
  db.exec("INSERT INTO users (id, name, email, role) VALUES (2, 'Grace', 'grace@example.com', 'MEMBER')");
  db.exec("INSERT INTO projects (id, name, owner_id, internal_notes, created_at) VALUES (1, 'Launch', 1, 'margin 40%', 1700000000000)");
  db.exec("INSERT INTO tasks (id, project_id, title, created_at) VALUES (1, 1, 'Write spec', 1700000000001)");
  db.exec("INSERT INTO tasks (id, project_id, title, created_at) VALUES (2, 1, 'Ship beta', 1700000000002)");
});

async function run(query: string, token: string | null) {
  const schema = createSchema({ typeDefs, resolvers });
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const ctx = await createContext(db, headers, () => {});
  return graphql({ schema, source: query, contextValue: ctx });
}

describe("project tracker schema", () => {
  test("lists a project with its tasks in one query", async () => {
    const result = await run("{ projects(first: 1) { edges { node { name tasks(first: 10) { edges { node { title } } } } } } }", "1");
    expect(result.errors).toBeUndefined();
    const edge = (result.data as any).projects.edges[0];
    expect(edge.node.tasks.edges.map((e: any) => e.node.title)).toEqual(["Ship beta", "Write spec"]);
  });

  test("hides internal notes from non-admins", async () => {
    const result = await run("{ projects(first: 1) { edges { node { internalNotes } } } }", "2");
    expect((result.data as any).projects.edges[0].node.internalNotes).toBeNull();
  });

  test("rejects anonymous access to projects", async () => {
    const result = await run("{ projects(first: 1) { edges { node { name } } } }", null);
    expect(result.errors?.[0]?.message).toContain("UNAUTHENTICATED");
  });

  test("returns a stable cursor for the next page", async () => {
    const result = await run("{ projects(first: 1) { pageInfo { hasNextPage endCursor } } }", "1");
    const pageInfo = (result.data as any).projects.pageInfo;
    expect(typeof pageInfo.endCursor).toBe("string");
  });
});
```

```bash
bun test
```

## Key Insights

- **Create DataLoaders per request, never at module scope.** Their cache is keyed by ID alone; a shared loader leaks rows across viewers and turns an authorization check into a suggestion.
- **Batch functions must return input-length, input-ordered arrays.** A short array or a reordered one attaches children to the wrong parents, and the failure surfaces only under concurrent nesting.
- **Authorization belongs in resolvers, not only in entry points.** A guarded `project(id:)` query proves nothing if `viewer.projects` returns the same rows unguarded — clients traverse whatever path the schema exposes.
- **Cursor pagination needs a tiebreaker column.** `(created_at, id)` is stable; `created_at` alone can duplicate or skip rows when timestamps collide.
- **Keep nullability honest.** Non-null promises fail the entire parent object when violated, so reserve `!` for values the domain guarantees and let genuinely optional fields be nullable.
- **Abort subscription iterators on socket close.** Each live iterator may hold a generator and a prepared statement; leaking one per closed tab degrades the process in hours, not days.
- **Cap `first` server-side.** Clamp the page size (100 here) so a client cannot request the entire table through a single nested field.
- **Measure the batching win instead of assuming it.** Log statement counts for a nested query before and after enabling loaders; fifty-one statements collapsing to four is the evidence that the resolver is correct.

## Next Steps

- Add persisted-query support and a query-depth limit to protect the endpoint from adversarial nesting.
- Introduce a `@defer` directive on expensive nested fields so slow `tasks` lists stream after the project shell renders.
- Configure GraphQL Yoga's health-check and graphiql flags per environment, and put the endpoint behind a rate limiter keyed by viewer.
- Read the Bun performance optimization guide in this repository to profile resolver hot paths with `bun --inspect` and SQLite `EXPLAIN QUERY PLAN`.
- Continue with the advanced Bun syllabus for runtime internals, worker threads, and native module boundaries.

## Conclusion

You built a GraphQL API that speaks one schema across queries, mutations, and subscriptions from a single Bun process. The schema file owns the contract, the context carries the viewer and per-request loaders, resolvers enforce access at the field boundary, and cursors keep pagination stable while data changes underneath. Those four decisions — not the choice of library — are what make the API safe to ship. From here the highest-leverage additions are protections around the perimeter: depth limits, persisted queries, and rate limiting, followed by profiling the resolvers that run most often.

---
title: "Building a Full-Stack Type-Safe Application with Elysia.js and Eden Treaty"
description: "A project-based tutorial on building a full-stack application with Elysia.js and Eden Treaty, featuring a typed API server backed by Bun SQLite and a React client that shares end-to-end type safety with zero code generation."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Full-Stack Type-Safe Application with Elysia.js and Eden Treaty

## Summary

This tutorial walks you through building **Bookmarkly**, a full-stack bookmark manager, using **Elysia.js** on the server and **React** on the client, connected through **Eden Treaty** — Elysia's signature end-to-end type-safety layer. You will define the entire API contract once with TypeBox schemas, expose it from the server as a single `App` type, and consume it from the browser with a fully typed client that requires **zero code generation**. By the end, you will have a working CRUD application with search, tag filtering, typed error handling, and optimistic UI updates — where a change to a server schema immediately becomes a compile-time error in the client if anything breaks.

## Target Audience

- Backend developers who are comfortable with TypeScript and want to explore Bun-native frameworks.
- Frontend developers who want to eliminate hand-written API clients and type drift between server and client.
- Developers who have completed a basic Elysia.js tutorial (such as Building REST APIs with ElysiaJS) and want to go deeper into Elysia's type-level features.
- Intermediate to advanced level: this tutorial assumes you understand REST concepts, TypeScript generics, and React hooks.

## Prerequisites

- **Bun** installed (version 1.1 or later). Verify with `bun --version`.
- Solid understanding of TypeScript (types, interfaces, generics, `typeof` and `infer`).
- Basic familiarity with Elysia.js routing and the TypeBox schema system.
- Basic React knowledge (components, hooks, forms).
- A REST client (curl, Postman, or Hoppscotch) for quick smoke tests.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain what Eden Treaty is and how it differs from code-generation tools like OpenAPI generators or tRPC.
- Structure a Bun workspace monorepo with separate server and web packages.
- Define a reusable API contract using TypeBox schemas and extract static types from them.
- Build a typed Elysia.js CRUD API with validated params, query strings, bodies, and response schemas.
- Implement typed error responses with Elysia's `error` helper and a global validation error handler.
- Generate an Eden Treaty client from the server's `App` type.
- Consume the typed client from a React application with automatic inference of request and response types.
- Handle typed errors, search, filtering, and optimistic updates with confidence that the UI can never call the API incorrectly.

## Context and Motivation

Every full-stack TypeScript project eventually faces the same drift problem: the server evolves, the hand-written client does not, and the compiler cannot tell you where. Teams solve this with OpenAPI code generation (a build step that can rot), GraphQL (a whole new protocol), or tRPC (which ties you to one framework's conventions). Elysia.js takes a different path. Because Elysia is built on TypeBox, every route, body, query, and response already carries a precise runtime schema — and those schemas *are* TypeScript types. Eden Treaty simply reuses that same type information on the client side, wiring up a fetch-based client whose method names, parameters, and return types mirror your routes exactly.

The result is a contract defined once, enforced at runtime by the server, and enforced at compile time by the client. No codegen, no separate schema package to keep in sync, no `any` escape hatches. This tutorial shows you the full pattern on a realistic project so you can adopt it on your next full-stack app.

## Core Content

### Why End-to-End Type Safety Matters

Think about the last time a backend renamed a field or changed a response shape. The frontend team found out at runtime — often through a bug report. With Eden Treaty, that same change surfaces as a red squiggle in the editor the moment the server type updates. The type system becomes a communication channel between the two halves of your application:

- **One source of truth**: the TypeBox schemas on the server are the only place the contract lives.
- **Compile-time catch**: every client call is checked against the current server shape.
- **Typed errors**: failure responses are part of the contract, so the UI handles them deliberately instead of guessing.
- **Zero build step**: there is no generator to run, no artifacts to commit, and no drift between generated and hand-written code.

### The Project: Bookmarkly

Bookmarkly is a bookmark manager with a small but realistic feature set:

- Create, list, update, and delete bookmarks (URL + title + tags).
- Search bookmarks by keyword in the title or URL.
- Filter bookmarks by tag.
- Typed 404 errors for missing bookmarks and typed 400 errors for invalid input.
- A React client that consumes the API through Eden Treaty with optimistic UI.

### Project Structure

Create a Bun workspace monorepo so the client can import the server's types directly:

```text
bookmarkly/
├── package.json
├── server/
│   ├── package.json
│   └── src/
│       └── index.ts
└── web/
    ├── package.json
    ├── index.html
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        └── api.ts
```

The root `package.json` declares the workspace:

```json
{
  "name": "bookmarkly",
  "private": true,
  "workspaces": ["server", "web"]
}
```

The server package has a name and an export map that points at the TypeScript source. Bun can run TypeScript directly, so the client can import types straight from `src/index.ts`:

```json
{
  "name": "@bookmarkly/server",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Install dependencies once from the root:

```bash
bun install
```

### Defining Shared Schemas with TypeBox

The contract starts with TypeBox schemas. These serve double duty: Elysia validates every request and response against them at runtime, and TypeScript derives static types from them at compile time.

```typescript
import { t } from 'elysia';
import type { Static } from '@sinclair/typebox';

export const BookmarkSchema = t.Object({
  id: t.Number(),
  url: t.String({ format: 'uri' }),
  title: t.String({ minLength: 1, maxLength: 200 }),
  tags: t.Array(t.String()),
  createdAt: t.String()
});

export const CreateBookmarkSchema = t.Object({
  url: t.String({ format: 'uri' }),
  title: t.String({ minLength: 1, maxLength: 200 }),
  tags: t.Optional(t.Array(t.String()))
});

export const UpdateBookmarkSchema = t.Partial(CreateBookmarkSchema);

export const ErrorSchema = t.Object({
  error: t.String()
});

export type Bookmark = Static<typeof BookmarkSchema>;
export type CreateBookmark = Static<typeof CreateBookmarkSchema>;
```

Note the `format: 'uri'` constraint: TypeBox validates it at runtime, so a client can never save a malformed URL. The static types extracted with `Static<typeof ...>` are exactly what the client will use.

### Building the Typed API Server

The server is a single Elysia instance with a SQLite database via Bun's built-in `bun:sqlite` driver — no external database dependency.

```typescript
import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Database } from 'bun:sqlite';

const db = new Database('bookmarkly.db');

db.run(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

interface BookmarkRow {
  id: number;
  url: string;
  title: string;
  tags: string;
  created_at: string;
}

// Convert a raw row into the shape declared by BookmarkSchema
function mapRow(row: BookmarkRow) {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at
  };
}
```

Tags are stored as a JSON string in SQLite and parsed on the way out — a pragmatic choice that keeps the schema simple while still giving the client a proper string array.

#### Creating and Reading Bookmarks

The create route validates its body against `CreateBookmarkSchema` and declares its response shapes with the `response` option:

```typescript
const app = new Elysia()
  .use(cors())
  .get('/health', () => ({ status: 'ok' }))
  .post('/bookmarks', ({ body, set }) => {
    const tagsJson = JSON.stringify(body.tags ?? []);
    const row = db
      .query('INSERT INTO bookmarks (url, title, tags) VALUES (?, ?, ?) RETURNING *')
      .get(body.url, body.title, tagsJson) as BookmarkRow;

    set.status = 201;
    return mapRow(row);
  }, {
    body: CreateBookmarkSchema,
    response: {
      201: BookmarkSchema,
      400: ErrorSchema
    }
  })
  .get('/bookmarks', ({ query }) => {
    const { tag, search } = query;

    const where: string[] = [];
    const params: unknown[] = [];

    if (search) {
      where.push('(title LIKE ? OR url LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (tag) {
      where.push('tags LIKE ?');
      params.push(`%"${tag}"%`);
    }

    let sql = 'SELECT * FROM bookmarks';
    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';

    const rows = db.query(sql).all(...params) as BookmarkRow[];
    return rows.map(mapRow);
  }, {
    query: t.Object({
      tag: t.Optional(t.String({ minLength: 1 })),
      search: t.Optional(t.String({ minLength: 1 }))
    }),
    response: {
      200: t.Array(BookmarkSchema)
    }
  });
```

The `query` schema is pure TypeBox — Elysia parses and validates the query string, then hands you a fully typed `query` object. `search` and `tag` are optional, and the client's autocomplete will know that.

#### Updating and Deleting Bookmarks

The update route uses `t.Numeric()` for the `:id` param (Elysia converts the string segment to a number), a partial body, and a typed 404:

```typescript
  .put('/bookmarks/:id', ({ params, body, error }) => {
    const existing = db
      .query('SELECT * FROM bookmarks WHERE id = ?')
      .get(params.id) as BookmarkRow | null;

    if (!existing) {
      return error(404, { error: 'Bookmark not found' });
    }

    const url = body.url ?? existing.url;
    const title = body.title ?? existing.title;
    const tags = body.tags !== undefined ? JSON.stringify(body.tags) : existing.tags;

    const row = db
      .query('UPDATE bookmarks SET url = ?, title = ?, tags = ? WHERE id = ? RETURNING *')
      .get(url, title, tags, params.id) as BookmarkRow;

    return mapRow(row);
  }, {
    params: t.Object({ id: t.Numeric() }),
    body: UpdateBookmarkSchema,
    response: {
      200: BookmarkSchema,
      404: ErrorSchema
    }
  })
  .delete('/bookmarks/:id', ({ params, error }) => {
    const result = db.query('DELETE FROM bookmarks WHERE id = ?').run(params.id);

    if (result.changes === 0) {
      return error(404, { error: 'Bookmark not found' });
    }

    return { success: true };
  }, {
    params: t.Object({ id: t.Numeric() }),
    response: {
      200: t.Object({ success: t.Boolean() }),
      404: ErrorSchema
    }
  });
```

The `error` helper returns a response with the given status code and body. Because `404: ErrorSchema` is declared, both the runtime and the client know exactly what a 404 looks like.

#### Typed Error Responses

A global error handler converts TypeBox validation failures into the same `{ error: string }` shape, so the client only ever has to deal with one error format:

```typescript
const app = new Elysia()
  .use(cors())
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: error.message };
    }
  })
  // ...routes...
```

Any request body, query, or param that fails validation now produces a 400 with a readable message — and Eden Treaty types that 400 on the client.

#### Exposing the App Type

The magic step: export the type of the whole app instance. This single type carries every route, schema, and error shape:

```typescript
export type App = typeof app;

app.listen(3000);

console.log(`Bookmarkly API running at http://localhost:${app.server?.port}`);
```

The client needs `npm-style` clarity here: run the server with `bun run server/src/index.ts` and verify the endpoints with curl before touching the frontend:

```bash
curl -s http://localhost:3000/health
curl -s -X POST http://localhost:3000/bookmarks \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://bun.sh","title":"Bun docs","tags":["runtime"]}'
```

### Building the Eden Treaty Client

Eden Treaty is a small package that turns the `App` type into a fully typed fetch client. Install it in the web workspace:

```bash
bun add @elysiajs/eden
```

Then create `web/src/api.ts` — the entire client in four lines:

```typescript
import { edenTreaty } from '@elysiajs/eden';
import type { App } from '@bookmarkly/server';

export const api = edenTreaty<App>('http://localhost:3000');
```

At runtime this is a plain `fetch` wrapper. At compile time it is a deep mapped type where every path segment becomes a method chain:

```typescript
// GET /bookmarks?search=elysia&tag=backend
const listRes = await api.bookmarks.get({
  query: { search: 'elysia', tag: 'backend' }
});

// POST /bookmarks
const createRes = await api.bookmarks.post({
  body: { url: 'https://elysiajs.com', title: 'Elysia.js', tags: ['framework'] }
});

// GET /bookmarks/:id
const getRes = await api.bookmarks({ id: 1 }).get();

// PUT /bookmarks/:id
const updateRes = await api.bookmarks({ id: 1 }).put({
  body: { title: 'Elysia.js — Bun-native framework' }
});

// DELETE /bookmarks/:id
const deleteRes = await api.bookmarks({ id: 1 }).delete();
```

Every call returns a discriminated union of `{ data, error }`. Success gives you the typed payload; failure gives you a typed error with its status code:

```typescript
const res = await api.bookmarks({ id: 999 }).get();

if (res.error) {
  // res.error.value is { error: string } — the server validated this shape
  console.error(`Status ${res.error.status}: ${res.error.value.error}`);
} else {
  // res.data is Bookmark — fully inferred from BookmarkSchema
  console.log(res.data.title);
}
```

### Consuming the API from React

#### Setting Up the Vite Client

Scaffold the web app with Vite's React TypeScript template, then wire the workspace dependency:

```bash
cd web
bun create vite . --template react-ts
bun add @bookmarkly/server@*
```

In `web/tsconfig.json`, make sure the server sources are included so the type import resolves:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src", "../server/src"]
}
```

#### The Typed API Module

`web/src/api.ts` re-exports the client plus a client-side `Bookmark` type extracted from the shared schema:

```typescript
import { edenTreaty } from '@elysiajs/eden';
import type { App } from '@bookmarkly/server';
import { BookmarkSchema } from '@bookmarkly/server';
import type { Static } from '@sinclair/typebox';

export const api = edenTreaty<App>('http://localhost:3000');

export type Bookmark = Static<typeof BookmarkSchema>;
```

The client never re-declares the `Bookmark` shape by hand — if the server schema changes, this type changes with it.

#### Rendering the Bookmark List

`App.tsx` loads the list with typed query parameters and renders it:

```tsx
import { useEffect, useState } from 'react';
import { api, type Bookmark } from './api';

export function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await api.bookmarks.get({
        query: search ? { search } : {}
      });

      if (res.error) {
        setError(res.error.value.error);
        return;
      }
      setBookmarks(res.data);
    };

    load();
  }, [search]);

  return (
    <main>
      <h1>Bookmarkly</h1>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search bookmarks"
      />
      {error && <p role="alert">{error}</p>}
      <ul>
        {bookmarks.map((bookmark) => (
          <li key={bookmark.id}>
            <a href={bookmark.url}>{bookmark.title}</a>
            <span>{bookmark.tags.join(', ')}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

#### Adding and Editing Bookmarks

The create form posts a body whose type is checked by the compiler — a missing field or a mistyped URL shape fails the build, not the runtime:

```tsx
function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.bookmarks.post({
      body: {
        url,
        title,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      }
    });

    if (res.error) {
      alert(res.error.value.error);
      return;
    }
    setUrl('');
    setTitle('');
    setTags('');
    onCreated();
  };

  return (
    <form onSubmit={submit}>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, comma, separated" />
      <button type="submit">Save</button>
    </form>
  );
}
```

#### Deleting with Optimistic UI

Deleting is a good showcase for the typed error union: the UI removes the row immediately, then rolls back if the server reports a 404:

```tsx
function BookmarkRow({ bookmark, onDeleted }: { bookmark: Bookmark; onDeleted: () => void }) {
  const remove = async () => {
    const res = await api.bookmarks({ id: bookmark.id }).delete();

    if (res.error) {
      alert(res.error.value.error);
      return;
    }
    onDeleted();
  };

  return (
    <li>
      <a href={bookmark.url}>{bookmark.title}</a>
      <span>{bookmark.tags.join(', ')}</span>
      <button onClick={remove}>Delete</button>
    </li>
  );
}
```

For the full optimistic pattern you would keep the deleted bookmark in state and restore it on `res.error`; the important part is that `res.error.value.error` is a typed string, never an unknown.

### Going Further: Prefixes, Uploads, and Deployment

- **Route prefixes**: if you mount routes under a prefix (`.group('/api', (app) => app...)`), Eden Treaty adds a nesting level, and a bare `/` route becomes `.index` — for example `api.api.bookmarks.index.get()`.
- **File uploads**: Elysia supports `t.File()` in body schemas, and Eden Treaty types `multipart/form-data` bodies for you — useful for avatar uploads or CSV imports.
- **Deployment**: because the client is plain fetch, you can host the API and the static bundle separately, or serve the built `web/dist` from the Elysia server with `static` middleware for a single-process deploy.
- **Plugins**: the `@elysiajs/swagger` plugin documents the same schemas automatically, giving you OpenAPI docs for free — but the client never needs them, since the types are already shared.

## Code Examples

### Complete Server Entrypoint

`server/src/index.ts` — the whole typed API in one file:

```typescript
import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Database } from 'bun:sqlite';

const db = new Database('bookmarkly.db');

db.run(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

interface BookmarkRow {
  id: number;
  url: string;
  title: string;
  tags: string;
  created_at: string;
}

function mapRow(row: BookmarkRow) {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at
  };
}

const BookmarkSchema = t.Object({
  id: t.Number(),
  url: t.String({ format: 'uri' }),
  title: t.String({ minLength: 1, maxLength: 200 }),
  tags: t.Array(t.String()),
  createdAt: t.String()
});

const CreateBookmarkSchema = t.Object({
  url: t.String({ format: 'uri' }),
  title: t.String({ minLength: 1, maxLength: 200 }),
  tags: t.Optional(t.Array(t.String()))
});

const UpdateBookmarkSchema = t.Partial(CreateBookmarkSchema);

const ErrorSchema = t.Object({
  error: t.String()
});

const app = new Elysia()
  .use(cors())
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: error.message };
    }
  })
  .get('/health', () => ({ status: 'ok' }))
  .post('/bookmarks', ({ body, set }) => {
    const tagsJson = JSON.stringify(body.tags ?? []);
    const row = db
      .query('INSERT INTO bookmarks (url, title, tags) VALUES (?, ?, ?) RETURNING *')
      .get(body.url, body.title, tagsJson) as BookmarkRow;

    set.status = 201;
    return mapRow(row);
  }, {
    body: CreateBookmarkSchema,
    response: {
      201: BookmarkSchema,
      400: ErrorSchema
    }
  })
  .get('/bookmarks', ({ query }) => {
    const { tag, search } = query;

    const where: string[] = [];
    const params: unknown[] = [];

    if (search) {
      where.push('(title LIKE ? OR url LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (tag) {
      where.push('tags LIKE ?');
      params.push(`%"${tag}"%`);
    }

    let sql = 'SELECT * FROM bookmarks';
    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';

    const rows = db.query(sql).all(...params) as BookmarkRow[];
    return rows.map(mapRow);
  }, {
    query: t.Object({
      tag: t.Optional(t.String({ minLength: 1 })),
      search: t.Optional(t.String({ minLength: 1 }))
    }),
    response: {
      200: t.Array(BookmarkSchema)
    }
  })
  .put('/bookmarks/:id', ({ params, body, error }) => {
    const existing = db
      .query('SELECT * FROM bookmarks WHERE id = ?')
      .get(params.id) as BookmarkRow | null;

    if (!existing) {
      return error(404, { error: 'Bookmark not found' });
    }

    const url = body.url ?? existing.url;
    const title = body.title ?? existing.title;
    const tags = body.tags !== undefined ? JSON.stringify(body.tags) : existing.tags;

    const row = db
      .query('UPDATE bookmarks SET url = ?, title = ?, tags = ? WHERE id = ? RETURNING *')
      .get(url, title, tags, params.id) as BookmarkRow;

    return mapRow(row);
  }, {
    params: t.Object({ id: t.Numeric() }),
    body: UpdateBookmarkSchema,
    response: {
      200: BookmarkSchema,
      404: ErrorSchema
    }
  })
  .delete('/bookmarks/:id', ({ params, error }) => {
    const result = db.query('DELETE FROM bookmarks WHERE id = ?').run(params.id);

    if (result.changes === 0) {
      return error(404, { error: 'Bookmark not found' });
    }

    return { success: true };
  }, {
    params: t.Object({ id: t.Numeric() }),
    response: {
      200: t.Object({ success: t.Boolean() }),
      404: ErrorSchema
    }
  });

export type App = typeof app;

app.listen(3000);

console.log(`Bookmarkly API running at http://localhost:${app.server?.port}`);
```

### Complete React App

`web/src/App.tsx` — list, search, create, and delete wired to the typed client:

```tsx
import { useEffect, useState } from 'react';
import { api, type Bookmark } from './api';

export function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await api.bookmarks.get({
      query: search ? { search } : {}
    });

    if (res.error) {
      setError(res.error.value.error);
      return;
    }
    setBookmarks(res.data);
  };

  useEffect(() => {
    load();
  }, [search]);

  const remove = async (id: number) => {
    const res = await api.bookmarks({ id }).delete();
    if (res.error) {
      alert(res.error.value.error);
      return;
    }
    setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== id));
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const url = (form.elements.namedItem('url') as HTMLInputElement).value;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const rawTags = (form.elements.namedItem('tags') as HTMLInputElement).value;

    const res = await api.bookmarks.post({
      body: {
        url,
        title,
        tags: rawTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      }
    });

    if (res.error) {
      alert(res.error.value.error);
      return;
    }
    form.reset();
    load();
  };

  return (
    <main>
      <h1>Bookmarkly</h1>
      <form onSubmit={submit}>
        <input name="url" placeholder="https://..." required />
        <input name="title" placeholder="Title" required />
        <input name="tags" placeholder="tags, comma, separated" />
        <button type="submit">Save</button>
      </form>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search bookmarks"
      />
      {error && <p role="alert">{error}</p>}
      <ul>
        {bookmarks.map((bookmark) => (
          <li key={bookmark.id}>
            <a href={bookmark.url}>{bookmark.title}</a>
            <span>{bookmark.tags.join(', ')}</span>
            <button onClick={() => remove(bookmark.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

## Key Insights

- **A single source of truth beats duplicated contracts**: defining the API once with TypeBox and sharing the `App` type means the client can never drift from the server — this is the core value proposition of Eden Treaty.
- **TypeBox schemas are runtime validation AND compile-time types**: the same object that rejects a malformed request at runtime produces the type that rejects a broken client call at compile time. There is no second definition to maintain.
- **Typed errors are part of the contract**: declaring `404: ErrorSchema` and using the `error` helper means every failure path is a known shape. The `{ data, error }` discriminated union forces the UI to handle failures deliberately.
- **Eden Treaty costs almost nothing at runtime**: it is a thin fetch wrapper; all the magic happens in the type system. You pay zero bytes of generated client code and get full autocomplete for free.
- **Watch out for query and param validation**: optional query fields (`t.Optional`) keep the client call ergonomic, while `t.Numeric()` on params removes the classic string-to-number bug in route handlers.
- **Performance consideration**: each Eden Treaty call is a normal fetch — use React Query or similar for caching and deduplication in larger apps, and keep the server's response schemas lean to avoid validating payloads you do not need.

## Next Steps

- Explore Elysia's real-time features: follow the Elysia.js Real-Time Applications with WebSocket and SSE guide to push typed events to the client.
- Deepen your security posture with the Elysia.js Security Hardening guide — strict schemas, JWT auth, and rate limiting build naturally on the contract you defined here.
- Harden the server for production with the Elysia.js Production Patterns guide (logging, observability, plugin structure).
- Work through the Advanced Elysia.js syllabus for a structured path into plugins, testing, and deployment.
- Try adding file uploads with `t.File()`, or extend the workspace with a mobile client that reuses the same `App` type.

## Conclusion

Elysia.js and Eden Treaty give you something most TypeScript stacks only approximate: a full-stack contract enforced by the compiler in both directions. In this tutorial you built a complete bookmark manager — a typed CRUD API with search and filtering, a React client consuming it through a four-line Eden Treaty setup, and typed errors everywhere in between. The pattern scales from a two-package monorepo to large teams: define schemas once, export the `App` type, and let the compiler keep every consumer honest. As you grow Bookmarkly into a production service, everything you learned — strict schemas, typed errors, shared contracts — becomes the foundation of a codebase where the frontend and backend simply cannot disagree.

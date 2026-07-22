---
title: "Building a URL Shortener with Elysia.js"
description: "A project-based tutorial on building a URL shortener service with Elysia.js, featuring short code generation, click analytics, and API key authentication."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a URL Shortener with Elysia.js

## Summary

This tutorial walks you through building a fully functional URL shortener service using **Elysia.js** and **Bun SQLite**. You will learn how to generate unique short codes, persist URL mappings to a database, track click analytics with referrer and user-agent data, protect your API with API key authentication, and serve both a REST API and a redirect handler — all within a single Elysia application. By the end, you will have a production-ready URL shortener deployed as a standalone service.

## Target Audience

- Backend developers familiar with TypeScript or JavaScript.
- Developers who have basic knowledge of REST APIs and want to learn Elysia.js through a practical project.
- Bun users looking for a real-world application example.

## Prerequisites

- **Bun** installed (version 1.1 or later). Verify with `bun --version`.
- Basic understanding of TypeScript syntax (types, interfaces, async/await).
- Familiarity with HTTP concepts (routes, methods, status codes, redirects).
- A REST client (curl, Postman, or Hoppscotch) for testing the API.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Set up an Elysia.js project with TypeScript and Bun.
- Design and integrate a Bun SQLite database schema for URL storage and analytics.
- Implement short code generation with collision-resistant logic.
- Build REST API endpoints for creating, listing, updating, and deleting short URLs.
- Create an API key authentication guard to protect management endpoints.
- Implement a redirect handler that logs click analytics before redirecting.
- Document the API automatically with Elysia's Swagger plugin.
- Apply rate limiting to prevent abuse.

## Context and Motivation

URL shorteners are a ubiquitous piece of internet infrastructure. Services like bit.ly and TinyURL transform long, unwieldy URLs into compact, shareable links while providing valuable click analytics. Building one from scratch is an excellent project for learning a web framework because it touches nearly every important concept: routing, database integration, authentication, caching, rate limiting, and redirect handling.

Elysia.js is particularly well suited for this task — its lightweight runtime on Bun means sub-millisecond redirects, and its built-in TypeBox validation ensures your API stays type-safe with minimal boilerplate. By implementing this project, you will gain practical experience that transfers directly to building other data-driven Elysia services.

## Core Content

### Project Scaffolding

Start by creating a new Elysia project with TypeScript:

```bash
mkdir elysia-url-shortener
cd elysia-url-shortener
bun init -y
bun add elysia @elysiajs/swagger @elysiajs/rate-limit
bun add -d @types/bun
```

Next, create the main entry point and the database module:

```text
elysia-url-shortener/
├── src/
│   ├── index.ts          # Application entry point
│   ├── db.ts             # SQLite database setup and queries
│   ├── auth.ts           # API key authentication guard
│   ├── routes/
│   │   ├── shortener.ts  # URL shortening CRUD routes
│   │   └── redirect.ts   # Redirect and analytics handler
│   └── utils.ts          # Short code generation and helpers
├── package.json
└── tsconfig.json
```

### Database Schema Design

The URL shortener needs two tables: one for storing URL mappings and another for click analytics. Open `src/db.ts`:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("data/urlshortener.db");

// Enable WAL mode for better concurrent read performance
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA foreign_keys = ON;");

db.run(`
  CREATE TABLE IF NOT EXISTS urls (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code  TEXT    NOT NULL UNIQUE,
    long_url    TEXT    NOT NULL,
    api_key_id  INTEGER NOT NULL DEFAULT 0,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS clicks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code  TEXT    NOT NULL,
    clicked_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    referrer    TEXT    DEFAULT '',
    user_agent  TEXT    DEFAULT '',
    ip_address  TEXT    DEFAULT '',
    FOREIGN KEY (short_code) REFERENCES urls(short_code)
  )
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_clicks_short_code
  ON clicks(short_code)
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_urls_short_code
  ON urls(short_code)
`);

export { db };
```

**Schema considerations**: Using `short_code` as a `UNIQUE` column prevents duplicate entries at the database level. The `clicks` table stores every redirect event separately, enabling per-link analytics and time-based aggregation. The `api_key_id` field links each URL to the API key that created it, enabling per-key scoping in multi-tenant deployments.

### Short Code Generation

Short codes must be compact, URL-safe, and collision-resistant. A 7-character alphanumeric code using a base-62 alphabet (26 lowercase + 26 uppercase + 10 digits) provides over 3.5 trillion combinations. Write `src/utils.ts`:

```typescript
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 7;

/**
 * Generate a cryptographically random short code.
 * Uses crypto.getRandomValues() for true randomness rather than Math.random().
 */
export function generateShortCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

/**
 * Validate that a URL has an acceptable scheme.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Format click count data for API responses.
 */
export function formatAnalytics(rows: Array<{ date: string; count: number }>) {
  return rows.map((row) => ({
    date: row.date,
    clicks: row.count,
  }));
}
```

The `crypto.getRandomValues()` function provides cryptographically secure randomness, which matters for short codes — predictable codes would let anyone enumerate all shortened URLs in the system. The code also validates URL schemes to prevent `javascript:` or `file:` protocol abuse.

### API Key Authentication Guard

Write `src/auth.ts` to create an Elysia guard that authenticates requests using an `X-API-Key` header:

```typescript
import { Elysia, t } from "elysia";

// In-memory API key store (swap with a database table in production)
const API_KEYS = new Map<string, number>([
  ["sk-demo-key-001", 1],
  ["sk-demo-key-002", 2],
]);

/**
 * Elysia guard that validates the X-API-Key header.
 * Attaches the apiKeyId to the request context on success.
 */
export const apiKeyGuard = new Elysia({ name: "api-key-guard" })
  .guard({
    headers: t.Object({
      "x-api-key": t.String({ minLength: 8 }),
    }),
  })
  .resolve(({ headers, set }) => {
    const apiKey = headers["x-api-key"];
    const apiKeyId = API_KEYS.get(apiKey);

    if (!apiKeyId) {
      set.status = 401;
      return {
        success: false as const,
        error: "Invalid or missing API key",
      };
    }

    return {
      success: true as const,
      apiKeyId,
    };
  });
```

This guard runs before any route that uses it. If the `X-API-Key` header is missing or invalid, the request is rejected with a 401 status before reaching the route handler. In production, you would store API keys in the SQLite database with hashed secrets.

### URL Shortening Routes

Write `src/routes/shortener.ts` with full CRUD operations:

```typescript
import { Elysia, t } from "elysia";
import { db } from "../db";
import { generateShortCode, isValidUrl } from "../utils";
import { apiKeyGuard } from "../auth";

export const shortenerRoutes = new Elysia({ prefix: "/api" })
  .use(apiKeyGuard)
  .guard({
    // All routes in this group require authentication
    beforeHandle: ({ set, success }) => {
      if (!success) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
    },
  })
  .post(
    "/shorten",
    async ({ body, apiKeyId }) => {
      const { url, customCode } = body;

      if (!isValidUrl(url)) {
        return { error: "Invalid URL. Must start with http:// or https://" };
      }

      let shortCode = customCode;
      if (shortCode) {
        // Check custom code uniqueness
        const existing = db
          .query("SELECT id FROM urls WHERE short_code = ?")
          .get(shortCode) as { id: number } | undefined;
        if (existing) {
          return { error: "Custom code already in use" };
        }
        if (shortCode.length < 4 || shortCode.length > 16) {
          return { error: "Custom code must be 4-16 characters" };
        }
      } else {
        // Generate with collision retry
        for (let attempt = 0; attempt < 10; attempt++) {
          shortCode = generateShortCode();
          const existing = db
            .query("SELECT id FROM urls WHERE short_code = ?")
            .get(shortCode) as { id: number } | undefined;
          if (!existing) break;
          shortCode = null;
        }
        if (!shortCode) {
          return { error: "Could not generate unique code. Try again." };
        }
      }

      db.run(
        "INSERT INTO urls (short_code, long_url, api_key_id) VALUES (?, ?, ?)",
        [shortCode, url, apiKeyId]
      );

      return {
        shortCode,
        longUrl: url,
        shortUrl: `https://short.example/${shortCode}`,
      };
    },
    {
      body: t.Object({
        url: t.String({ format: "uri" }),
        customCode: t.Optional(t.String({ maxLength: 16 })),
      }),
      detail: { summary: "Create a shortened URL", tags: ["URLs"] },
    }
  )
  .get(
    "/urls",
    async ({ apiKeyId }) => {
      const rows = db
        .query(
          `SELECT short_code, long_url, is_active, created_at,
                  (SELECT COUNT(*) FROM clicks WHERE clicks.short_code = urls.short_code) AS click_count
           FROM urls WHERE api_key_id = ? ORDER BY created_at DESC`
        )
        .all(apiKeyId) as Array<{
        short_code: string;
        long_url: string;
        is_active: number;
        created_at: string;
        click_count: number;
      }>;

      return rows.map((r) => ({
        shortCode: r.short_code,
        longUrl: r.long_url,
        isActive: r.is_active === 1,
        clickCount: r.click_count,
        createdAt: r.created_at,
      }));
    },
    { detail: { summary: "List all URLs for this API key", tags: ["URLs"] } }
  )
  .delete(
    "/urls/:shortCode",
    async ({ params: { shortCode }, apiKeyId }) => {
      const url = db
        .query("SELECT id FROM urls WHERE short_code = ? AND api_key_id = ?")
        .get(shortCode, apiKeyId) as { id: number } | undefined;

      if (!url) {
        return { error: "URL not found or not owned by this API key" };
      }

      db.run("DELETE FROM clicks WHERE short_code = ?", [shortCode]);
      db.run("DELETE FROM urls WHERE id = ?", [url.id]);
      return { deleted: true, shortCode };
    },
    {
      params: t.Object({ shortCode: t.String() }),
      detail: { summary: "Delete a shortened URL", tags: ["URLs"] },
    }
  );
```

### Redirect Handler with Click Analytics

Write `src/routes/redirect.ts`. This handler runs on the root level (no `/api` prefix) so that `GET /abc1234` performs the redirect:

```typescript
import { Elysia, t } from "elysia";
import { db } from "../db";

export const redirectRoutes = new Elysia().get(
  "/:shortCode",
  async ({ params: { shortCode }, request, set }) => {
    const url = db
      .query(
        "SELECT long_url FROM urls WHERE short_code = ? AND is_active = 1"
      )
      .get(shortCode) as { long_url: string } | undefined;

    if (!url) {
      set.status = 404;
      return { error: "Short URL not found or deactivated" };
    }

    // Log the click (non-blocking insert)
    db.run(
      "INSERT INTO clicks (short_code, referrer, user_agent, ip_address) VALUES (?, ?, ?, ?)",
      [
        shortCode,
        request.headers.get("referer") || request.headers.get("referrer") || "",
        request.headers.get("user-agent") || "",
        request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      ]
    );

    set.status = 302;
    set.headers["Location"] = url.long_url;
    return;
  },
  {
    params: t.Object({ shortCode: t.String({ minLength: 4, maxLength: 16 }) }),
    detail: { summary: "Redirect to the original URL", tags: ["Redirect"] },
  }
);
```

**Important detail**: The redirect handler must return `undefined` (or no body) when setting a redirect status. Returning a string or object would set a body alongside the 302 header, which browsers may ignore but violates HTTP semantics. The empty `return;` ensures no body is sent.

### Analytics Endpoints

Add analytics queries to `src/routes/shortener.ts` inside the existing guard group:

```typescript
  .get(
    "/urls/:shortCode/analytics",
    async ({ params: { shortCode }, apiKeyId }) => {
      // Verify ownership
      const url = db
        .query("SELECT id FROM urls WHERE short_code = ? AND api_key_id = ?")
        .get(shortCode, apiKeyId) as { id: number } | undefined;

      if (!url) {
        return { error: "URL not found or not owned by this API key" };
      }

      // Total clicks
      const total = db
        .query("SELECT COUNT(*) AS count FROM clicks WHERE short_code = ?")
        .get(shortCode) as { count: number };

      // Daily breakdown (last 30 days)
      const daily = db
        .query(
          `SELECT date(clicked_at) AS date, COUNT(*) AS count
           FROM clicks
           WHERE short_code = ? AND clicked_at >= datetime('now', '-30 days')
           GROUP BY date(clicked_at)
           ORDER BY date ASC`
        )
        .all(shortCode) as Array<{ date: string; count: number }>;

      // Top referrers
      const referrers = db
        .query(
          `SELECT referrer, COUNT(*) AS count
           FROM clicks
           WHERE short_code = ?
           GROUP BY referrer
           ORDER BY count DESC
           LIMIT 10`
        )
        .all(shortCode) as Array<{ referrer: string; count: number }>;

      return {
        shortCode,
        totalClicks: total.count,
        dailyBreakdown: daily,
        topReferrers: referrers,
      };
    },
    {
      params: t.Object({ shortCode: t.String() }),
      detail: { summary: "Get click analytics for a short URL", tags: ["Analytics"] },
    }
  );
```

### Application Assembly and Rate Limiting

Now wire everything together in `src/index.ts`:

```typescript
import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { rateLimit } from "@elysiajs/rate-limit";
import { shortenerRoutes } from "./routes/shortener";
import { redirectRoutes } from "./routes/redirect";

const app = new Elysia()
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "URL Shortener API",
          version: "1.0.0",
          description: "A URL shortener service built with Elysia.js",
        },
      },
    })
  )
  .use(
    rateLimit({
      max: 100,          // Max requests per window
      duration: 60000,   // Window duration in ms (1 minute)
      errorResponse: {
        status: 429,
        body: { error: "Rate limit exceeded. Try again later." },
      },
    })
  )
  .use(shortenerRoutes)
  .use(redirectRoutes)
  .get("/", () => ({
    service: "Elysia URL Shortener",
    version: "1.0.0",
    docs: "/docs",
  }))
  .listen(3000);

console.log(`🚀 URL Shortener running at http://localhost:3000`);
console.log(`📖 API documentation at http://localhost:3000/docs`);
```

Run the application:

```bash
bun run src/index.ts
```

You should see output similar to:

```text
🚀 URL Shortener running at http://localhost:3000
📖 API documentation at http://localhost:3000/docs
```

### Testing the Service

Create a short URL:

```bash
curl -s -X POST http://localhost:3000/api/shorten \
  -H "X-API-Key: sk-demo-key-001" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very-long-path-that-needs-shortening"}' | bunx --bun prettyjson
```

Expected response:

```json
{
  "shortCode": "aB3xK9m",
  "longUrl": "https://example.com/very-long-path-that-needs-shortening",
  "shortUrl": "https://short.example/aB3xK9m"
}
```

Test the redirect:

```bash
curl -v http://localhost:3000/aB3xK9m
```

The response should include a `302 Found` status with a `Location` header pointing to the original URL. The redirect logs a click entry automatically.

Check analytics:

```bash
curl -s http://localhost:3000/api/urls/aB3xK9m/analytics \
  -H "X-API-Key: sk-demo-key-001" | bunx --bun prettyjson
```

After a few redirects, you should see click counts, daily breakdowns, and referrer information.

## Code Examples

### Complete Project Structure

```text
elysia-url-shortener/
├── src/
│   ├── index.ts
│   ├── db.ts
│   ├── auth.ts
│   ├── utils.ts
│   └── routes/
│       ├── shortener.ts
│       └── redirect.ts
├── data/                    # Created at runtime (SQLite DB)
├── package.json
└── tsconfig.json
```

### Key Code Snippets

**Collision-resistant code generation** — the retry loop handles the extremely rare case where `crypto.getRandomValues()` produces a code that already exists:

```typescript
for (let attempt = 0; attempt < 10; attempt++) {
  shortCode = generateShortCode();
  const existing = db
    .query("SELECT id FROM urls WHERE short_code = ?")
    .get(shortCode);
  if (!existing) break;
  shortCode = null;
}
```

**Subquery for click counts** — the list endpoint returns each URL with its total clicks using a correlated subquery:

```typescript
SELECT short_code, long_url, is_active, created_at,
       (SELECT COUNT(*) FROM clicks WHERE clicks.short_code = urls.short_code) AS click_count
FROM urls WHERE api_key_id = ?
```

**Transactional click logging** — each redirect atomically inserts an analytics record:

```typescript
db.run(
  "INSERT INTO clicks (short_code, referrer, user_agent, ip_address) VALUES (?, ?, ?, ?)",
  [shortCode, referrer, userAgent, ipAddress]
);
```

## Key Insights

- **Use cryptographically random short codes**: `crypto.getRandomValues()` prevents enumeration attacks. Predictable codes (like auto-increment IDs or `Math.random()`) let anyone discover all shortened URLs in the system.
- **Correlated subqueries avoid N+1**: The `SELECT` subquery for click counts runs once per row in a single SQL round-trip rather than requiring separate queries for each URL.
- **Rate limiting protects the redirect endpoint too**: The global `rateLimit()` plugin applies to all routes including the unauthenticated redirect handler, preventing abuse from bots that repeatedly request nonexistent short codes.
- **Return no body on 302 redirect**: When setting a `302` status with a `Location` header, leave the return value empty (`return;`). Returning a body alongside a redirect violates HTTP semantics and can confuse some clients.
- **Schema design enables scaling**: Separating `urls` and `clicks` into different tables means you can archive old analytics independently without affecting the redirect speed. The `short_code` index on `clicks` keeps aggregate queries fast even with millions of entries.

## Next Steps

- Add **custom slug validation** with profanity filters and reserved-word checks.
- Implement **URL expiration** with a TTL column and a periodic cleanup worker.
- Add **QR code generation** for each short URL using the `qrcode` npm package.
- Explore **link rotation** — multiple long URLs per short code with traffic-split percentages.
- Integrate **Redis caching** with ioredis to serve the most popular redirects without hitting SQLite.

## Conclusion

You have built a complete URL shortener service with Elysia.js that handles code generation, database persistence, authentication, click analytics, and rate limiting — all running on Bun's fast runtime. The project architecture separates concerns across database, auth, and route modules, making it straightforward to extend with new features. The skills you applied here — schema-first design, guard-based authentication, correlated subqueries, and event logging — transfer directly to any data-driven web service you build with Elysia.js.

---
title: "Next.js Route Handlers and API Design Cheatsheet"
description: "A quick reference for building production APIs with Next.js Route Handlers: method exports, async params, cookies and headers, streaming and SSE, signed webhooks, CORS preflight, caching modes, validation, rate limiting, and background work."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Next.js Route Handlers and API Design Cheatsheet

## Quick Reference Table

| Action | Code / Config | Description |
|--------|---------------|-------------|
| Define a handler | `app/api/items/route.ts` | The file path is the URL: `/api/items` |
| Export a method | `export async function GET(request)` | One named export per HTTP method |
| Unsupported method | Not exported | Next.js answers 405 automatically |
| Dynamic segment | `app/api/items/[id]/route.ts` | URL becomes `/api/items/:id` |
| Handler signature | `(request, { params })` | Second argument carries route params |
| Await params | `const { id } = await params` | Params are a Promise in Next.js 15+ |
| Query string | `request.nextUrl.searchParams.get('page')` | Returns a string or `null`, never a number |
| JSON body | `await request.json()` | Throws `SyntaxError` on invalid JSON |
| Raw body | `await request.text()` | Required before HMAC signature checks |
| JSON response | `Response.json(data, { status: 201 })` | Plain Web API, no Next-specific wrapper |
| Force static | `export const dynamic = 'force-static'` | GET output cached at build time |
| Force dynamic | `export const dynamic = 'force-dynamic'` | Runs on every request |
| Time revalidation | `export const revalidate = 60` | Cache the GET response for 60 seconds |
| Purge by tag | `revalidateTag('items')` | Invalidates cached fetches tagged `items` |
| Streaming | `new Response(readableStream, init)` | Web Streams, no Node pipe chains |
| SSE headers | `text/event-stream` | Pair with `Cache-Control: no-cache, no-transform` |
| CORS preflight | `export async function OPTIONS(request)` | Must return the `Access-Control-Allow-*` headers |
| Read cookie | `request.cookies.get('session')?.value` | Request cookie store, string or undefined |
| Set cookie | `response.cookies.set(name, value, options)` | Emits `Set-Cookie`; needs a `NextResponse` |
| Read header | `request.headers.get('authorization')` | Header names are case-insensitive |
| Runtime | `export const runtime = 'nodejs'` | Default; switch to `'edge'` for Edge targets |
| Timeout hint | `export const maxDuration = 30` | Platform-enforced limit in seconds |
| Background work | `after(() => audit(event))` | Runs once the response has been sent |
| Client IP | `x-forwarded-for` header | Trust it only behind a proxy you control |

## Common Commands

### Project Setup

```bash
npx create-next-app@latest my-api --typescript --app --no-tailwind --no-eslint
cd my-api
npm run dev
```

### Inspecting the Route Tree

```bash
# Every route handler currently defined
find app -name 'route.ts' -o -name 'route.js'

# Build summary shows each handler and whether it is static or dynamic
npm run build
```

### Exercising Endpoints

```bash
# Collection read
curl -s http://localhost:3000/api/items

# Create with a JSON body
curl -s -X POST http://localhost:3000/api/items \
  -H 'Content-Type: application/json' \
  -d '{"name":"widget","price":9.99}'

# Inspect the preflight response
curl -s -i -X OPTIONS http://localhost:3000/api/items \
  -H 'Origin: https://app.example.com' \
  -H 'Access-Control-Request-Method: POST'

# Follow a streamed response without buffering
curl -sN http://localhost:3000/api/stream

# Self-signed webhook for local testing
curl -s -X POST http://localhost:3000/api/webhooks/orders \
  -H "x-signature: ${SIG}" \
  --data-binary @payload.json
```

### Verifying Cache Behavior

```bash
# Static handlers appear as prerendered in the build output
npm run build | grep -A6 'api/'

# Confirm what the CDN or browser is allowed to cache
curl -sI http://localhost:3000/api/items | grep -i 'cache-control'
```

## Code Snippets

### Collection Handler (app/api/items/route.ts)

```typescript
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get('page') ?? '1');
  const items = await db.item.findMany({ skip: (page - 1) * 20, take: 20 });
  return Response.json({ items, page });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const item = await db.item.create({ data: body });
  return Response.json(item, { status: 201 });
}
```

### Dynamic Segment with Async Params

```typescript
import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = await db.item.findUnique({ where: { id } });

  if (!item) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  return Response.json(item, {
    headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
  });
}
```

### Consistent Error Envelope

```typescript
import { ZodError } from 'zod';

type ApiError = { error: string; message: string; details?: unknown };

const fail = (status: number, error: string, message: string, details?: unknown) =>
  Response.json({ error, message, details } satisfies ApiError, { status });

const CreateItem = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = CreateItem.parse(await request.json());
    const item = await db.item.create({ data: payload });
    return Response.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return fail(400, 'invalid_json', 'Request body is not valid JSON');
    }
    if (error instanceof ZodError) {
      return fail(422, 'validation_failed', 'Payload failed validation', error.issues);
    }
    throw error;
  }
}
```

### Server-Sent Events Stream

```typescript
export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();
  let tick: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      tick = setInterval(() => {
        const payload = JSON.stringify({ at: Date.now(), load: process.memoryUsage().heapUsed });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }, 1_000);
    },
    cancel() {
      clearInterval(tick);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
```

### Signed Webhook Receiver

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const provided = request.headers.get('x-signature') ?? '';

  const expected = createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(raw)
    .digest('hex');

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: 'invalid_signature' }, { status: 401 });
  }

  const event = JSON.parse(raw);

  // Idempotency: providers retry, so dedupe on the event id before acting
  const seen = await db.webhookEvent.findUnique({ where: { id: event.id } });
  if (seen) return Response.json({ received: true, duplicate: true });

  await db.webhookEvent.create({ data: { id: event.id, payload: event } });
  await queue.enqueue(event);

  return Response.json({ received: true });
}
```

### CORS Preflight for a Browser Client

```typescript
const ALLOWED = new Set(['https://app.example.com', 'http://localhost:3000']);

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED.has(origin) ? origin : 'https://app.example.com';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin')),
  });
}
```

### Cookie Session Rotation

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (!token || !(await verifySession(token))) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('session', await rotateSession(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
```

### Caching Modes and Tag Purging

```typescript
// app/api/items/route.ts — cache the read, tag it, purge it on write
import { revalidateTag } from 'next/cache';

export async function GET() {
  const items = await fetch('https://internal.example.com/items', {
    next: { tags: ['items'], revalidate: 60 },
  }).then((res) => res.json());

  return Response.json(items);
}

export async function POST(request: NextRequest) {
  await db.item.create({ data: await request.json() });
  revalidateTag('items');
  return Response.json({ ok: true }, { status: 201 });
}
```

### Token Bucket Rate Limiting

```typescript
const buckets = new Map<string, { tokens: number; updated: number }>();
const CAPACITY = 20;
const REFILL_PER_SECOND = 2;

function take(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: CAPACITY, updated: now };

  bucket.tokens = Math.min(
    CAPACITY,
    bucket.tokens + ((now - bucket.updated) / 1000) * REFILL_PER_SECOND,
  );
  bucket.updated = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}

// Inside a handler — the map is per instance, use Redis in multi-instance deploys
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';

  if (!take(ip)) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': '1' } },
    );
  }

  return Response.json({ ok: true });
}
```

### Background Work After the Response

```typescript
import { after } from 'next/server';

export async function POST(request: NextRequest) {
  const event = await request.json();

  after(async () => {
    await analytics.track(event);
  });

  return Response.json({ accepted: true }, { status: 202 });
}
```

---
title: "Cheat Sheet Route Handler dan Desain API Next.js"
description: "Referensi cepat untuk membangun API produksi dengan Route Handler Next.js: ekspor per method, params async, cookie dan header, streaming serta SSE, webhook bertanda tangan, preflight CORS, mode caching, validasi, rate limiting, dan pekerjaan latar belakang."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Route Handler dan Desain API Next.js

## Tabel Referensi Cepat

| Aksi | Kode / Konfigurasi | Deskripsi |
|------|--------------------|-----------|
| Mendefinisikan handler | `app/api/items/route.ts` | Path file adalah URL: `/api/items` |
| Mengekspor method | `export async function GET(request)` | Satu named export per method HTTP |
| Method tidak didukung | Tidak diekspor | Next.js otomatis menjawab 405 |
| Segmen dinamis | `app/api/items/[id]/route.ts` | URL menjadi `/api/items/:id` |
| Signature handler | `(request, { params })` | Argumen kedua membawa params rute |
| Await params | `const { id } = await params` | Params berupa Promise di Next.js 15+ |
| Query string | `request.nextUrl.searchParams.get('page')` | Mengembalikan string atau `null`, bukan angka |
| Body JSON | `await request.json()` | Melempar `SyntaxError` jika JSON tidak valid |
| Body mentah | `await request.text()` | Wajib sebelum verifikasi tanda tangan HMAC |
| Respons JSON | `Response.json(data, { status: 201 })` | Web API biasa, tanpa wrapper khusus Next.js |
| Paksa statis | `export const dynamic = 'force-static'` | Output GET di-cache saat build |
| Paksa dinamis | `export const dynamic = 'force-dynamic'` | Dijalankan pada setiap request |
| Revalidasi waktu | `export const revalidate = 60` | Cache respons GET selama 60 detik |
| Hapus cache per tag | `revalidateTag('items')` | Membatalkan fetch yang diberi tag `items` |
| Streaming | `new Response(readableStream, init)` | Web Streams, tanpa rantai pipe Node |
| Header SSE | `text/event-stream` | Pasangkan dengan `Cache-Control: no-cache, no-transform` |
| Preflight CORS | `export async function OPTIONS(request)` | Harus mengembalikan header `Access-Control-Allow-*` |
| Baca cookie | `request.cookies.get('session')?.value` | Cookie request, berupa string atau undefined |
| Set cookie | `response.cookies.set(name, value, options)` | Menulis `Set-Cookie`; butuh `NextResponse` |
| Baca header | `request.headers.get('authorization')` | Nama header tidak peka huruf besar-kecil |
| Runtime | `export const runtime = 'nodejs'` | Default; ganti ke `'edge'` untuk target Edge |
| Batas waktu | `export const maxDuration = 30` | Batas dari platform dalam detik |
| Kerja latar belakang | `after(() => audit(event))` | Berjalan setelah respons terkirim |
| IP klien | Header `x-forwarded-for` | Percayai hanya di belakang proxy milik sendiri |

## Perintah Umum

### Setup Proyek

```bash
npx create-next-app@latest my-api --typescript --app --no-tailwind --no-eslint
cd my-api
npm run dev
```

### Melihat Pohon Rute

```bash
# Semua route handler yang saat ini ada
find app -name 'route.ts' -o -name 'route.js'

# Ringkasan build menunjukkan setiap handler statis atau dinamis
npm run build
```

### Menguji Endpoint

```bash
# Baca koleksi
curl -s http://localhost:3000/api/items

# Buat data dengan body JSON
curl -s -X POST http://localhost:3000/api/items \
  -H 'Content-Type: application/json' \
  -d '{"name":"widget","price":9.99}'

# Periksa respons preflight
curl -s -i -X OPTIONS http://localhost:3000/api/items \
  -H 'Origin: https://app.example.com' \
  -H 'Access-Control-Request-Method: POST'

# Ikuti respons streaming tanpa buffering
curl -sN http://localhost:3000/api/stream

# Webhook bertanda tangan untuk pengujian lokal
curl -s -X POST http://localhost:3000/api/webhooks/orders \
  -H "x-signature: ${SIG}" \
  --data-binary @payload.json
```

### Memverifikasi Perilaku Cache

```bash
# Handler statis muncul sebagai prerendered di output build
npm run build | grep -A6 'api/'

# Pastikan aturan cache yang dikirim ke CDN atau browser
curl -sI http://localhost:3000/api/items | grep -i 'cache-control'
```

## Potongan Kode

### Handler Koleksi (app/api/items/route.ts)

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

### Segmen Dinamis dengan Params Async

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

### Amplop Error yang Konsisten

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
      return fail(400, 'invalid_json', 'Body request bukan JSON yang valid');
    }
    if (error instanceof ZodError) {
      return fail(422, 'validation_failed', 'Payload gagal validasi', error.issues);
    }
    throw error;
  }
}
```

### Stream Server-Sent Events

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

### Penerima Webhook Bertanda Tangan

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

  // Idempotensi: provider mengulang kiriman, jadi dedupe berdasarkan id event
  const seen = await db.webhookEvent.findUnique({ where: { id: event.id } });
  if (seen) return Response.json({ received: true, duplicate: true });

  await db.webhookEvent.create({ data: { id: event.id, payload: event } });
  await queue.enqueue(event);

  return Response.json({ received: true });
}
```

### Preflight CORS untuk Klien Browser

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

### Rotasi Cookie Sesi

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

### Mode Caching dan Penghapusan per Tag

```typescript
// app/api/items/route.ts — cache pembacaan, beri tag, hapus saat menulis
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

### Rate Limiting Token Bucket

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

// Di dalam handler — map hanya per instance, pakai Redis untuk deploy multi-instance
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

### Pekerjaan Latar Belakang Setelah Respons

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

---
title: "Cheat Sheet Lifecycle Hook dan Arsitektur Plugin Elysia.js"
description: "Referensi mendalam tentang fase lifecycle request Elysia.js beserta urutan eksekusinya, derive versus resolve, scoping hook dengan as(), macro, identitas plugin melalui name dan seed, lazy loading, komposisi guard, dan response mapping pada layanan Bun produksi."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Lifecycle Hook dan Arsitektur Plugin Elysia.js

Kecepatan Elysia berasal dari lifecycle-nya: pipeline berurutan yang tetap, di mana setiap hook adalah kandidat untuk di-inline saat kompilasi. Urutan tetap yang sama itulah yang membuat codebase Elysia berukuran besar bisa terasa sangat komposabel atau justru sama sekali tidak transparan. Cheat sheet ini adalah referensi untuk hook itu sendiri, fase di mana ia berjalan, dan aturan plugin yang menentukan apakah sebuah hook dieksekusi sekali, dua kali, atau tidak sama sekali. Materi ini mengasumsikan kamu sudah memahami routing dan skema TypeBox; fokusnya adalah komposisi dan pengurutan.

## Tabel Referensi Cepat

| Hook / API | Berjalan pada | Kegunaan utama |
|------------|---------------|----------------|
| `onRequest` | Sebelum apa pun di-parse | Inspeksi request mentah, penolakan dini, request ID |
| `onParse` | Body sedang di-parse | Content type kustom, verifikasi signature atas body mentah |
| `onTransform` | Setelah parsing, sebelum validasi | Menormalkan payload dan header ke dalam context |
| `derive` | Sebelum validasi | Nilai context sinkron yang murah dari header |
| `resolve` | Setelah validasi | Nilai context tervalidasi, query database, pemuatan sesi |
| `onBeforeHandle` | Setelah validasi, sebelum handler | Gerbang otorisasi, rate limit, resolusi tenant |
| `onAfterHandle` | Setelah handler mengembalikan nilai | Pengayaan response, logging, penulisan cache |
| `mapResponse` | Response sedang diserialisasi | Serializer kustom, injeksi header, keputusan kompresi |
| `onAfterResponse` | Response sudah terkirim | Metrik, jejak audit, pekerjaan fire-and-forget |
| `onError` | Saat ada fase yang melempar error | Pemetaan error terpusat, response error terkorelasi |
| `onStart` | Server mulai mendengarkan | Pemanasan cache, connection pool, worker latar |
| `onStop` | Server sedang dimatikan | Graceful draining, flush antrean |
| `macro` | Saat definisi route | Perilaku per-route yang dapat dipakai ulang dengan opsi |
| `macro` dengan `resolve` | Saat request, setelah validasi | Macro yang butuh data request, bukan hanya opsi |
| `.as('scoped')` | Saat deklarasi hook | Membagikan hook hanya ke instance induk |
| `.as('global')` | Saat deklarasi hook | Membagikan hook ke instance root dan semua turunannya |
| `new Elysia({ name })` | Saat pembuatan plugin | Memberi identitas plugin agar hanya dipasang sekali |
| `new Elysia({ seed })` | Saat pembuatan plugin | Konfigurasi per-mount untuk plugin bernama |
| `Elysia.lazy` | Saat pembuatan plugin | Penundaan registrasi modul plugin yang berat |
| `$.decorator` | Saat factory plugin | Pohon plugin yang diratakan tanpa dekorator duplikat |
| `guard({ ... })` | Saat definisi route | Menerapkan hook, skema, dan error handler ke satu grup |
| `trace` | Saat request, bersifat opt-in | Timing lifecycle langkah demi langkah untuk debugging |

## Perintah Umum

### Menyiapkan Modul Plugin

```bash
# Membuat direktori plugin
mkdir -p src/plugins/auth src/plugins/rate-limit

# Membuat file plugin dan test-nya berdampingan
touch src/plugins/auth/index.ts src/plugins/auth/index.test.ts

# Memasang plugin yang dipakai di sepanjang cheat sheet ini
bun add elysia @elysiajs/bearer @elysiajs/cors @elysiajs/opentelemetry

# Opsional: kontrak plugin yang sadar skema
bun add -d @sinclair/typebox
```

### Menjalankan dan Memeriksa Tipe Aplikasi

```bash
# Development dengan hot reload
bun --watch src/index.ts

# Memeriksa tipe seluruh graf plugin sebelum rilis
bunx tsc --noEmit

# Menjalankan test lifecycle dan plugin
bun test src/plugins

# Menjalankan satu test lifecycle dengan output verbose
bun test src/plugins/auth/index.test.ts --rerun-each 1
```

### Memeriksa Urutan Hook saat Runtime

```bash
# Mengaktifkan tracing lifecycle Elysia untuk satu kali boot
ELYSIA_TRACE=true bun run src/index.ts

# Menghitung berapa kali sebuah plugin benar-benar terpasang
grep -rn "new Elysia({" src/plugins | wc -l

# Mencari hook yang bocor ke semua route
grep -rn "as('global')" src/plugins

# Mencari plugin anonim (tanpa name berarti tanpa deduplikasi)
grep -rn "new Elysia()" src/plugins
```

## Potongan Kode

### Urutan Lifecycle Kanonis

```typescript
import { Elysia } from 'elysia';

const app = new Elysia()
  .onRequest(({ request }) => {
    console.log('1 onRequest', request.method);
  })
  .onParse(async ({ request, contentType }) => {
    console.log('2 onParse', contentType);
  })
  .onTransform(({ body }) => {
    console.log('3 onTransform');
  })
  .derive(() => {
    console.log('4 derive');
    return { startedAt: performance.now() };
  })
  .resolve(({ startedAt }) => {
    console.log('5 resolve');
    return { elapsed: () => performance.now() - startedAt };
  })
  .onBeforeHandle(() => {
    console.log('6 onBeforeHandle');
  })
  .get('/', () => {
    console.log('7 handler');
    return { ok: true };
  })
  .onAfterHandle(() => {
    console.log('8 onAfterHandle');
  })
  .mapResponse(({ response }) => {
    console.log('9 mapResponse');
    return response;
  })
  .onAfterResponse(() => {
    console.log('10 onAfterResponse');
  });

app.listen(3000);
```

Urutan ini adalah kontraknya. Apa pun yang harus melihat body yang sudah tervalidasi harus berada di `onBeforeHandle` atau `resolve`, jangan pernah di `onTransform` — validasi belum berjalan pada titik itu.

### Membaca Body Mentah dengan onParse

`onParse` ada agar kamu bisa menangani content type yang tidak di-parse Elysia secara default. Hook ini juga memungkinkanmu memeriksa payload sebelum menjadi objek JavaScript, dan itulah satu-satunya tempat verifikasi signature menjadi bermakna.

```typescript
import { Elysia } from 'elysia';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const signedPayload = new Elysia({ name: 'signed-payload' })
  .onParse(async ({ request, contentType }) => {
    if (contentType !== 'application/x-signed') return;

    const raw = await request.text();
    const signature = request.headers.get('x-signature') ?? '';
    const expected = createHmac('sha256', Bun.env.SIGNING_SECRET ?? '')
      .update(raw)
      .digest('hex');

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    const valid = a.length === b.length && timingSafeEqual(a, b);

    if (!valid) {
      throw new Error('SIGNATURE_INVALID');
    }

    // Nilai yang dikembalikan menggantikan body hasil parsing
    return JSON.parse(raw);
  });
```

Mengembalikan `undefined` dari `onParse` menyerahkan kendali kembali ke parser default, sehingga beberapa parser dapat hidup berdampingan dengan aman.

### derive versus resolve

```typescript
import { Elysia, t } from 'elysia';

export const sessionContext = new Elysia({ name: 'session-context' })
  // derive berjalan SEBELUM validasi: hanya sentuh header dan params
  .derive(({ request }) => ({
    requestId: request.headers.get('x-request-id') ?? crypto.randomUUID(),
    userAgent: request.headers.get('user-agent') ?? 'unknown'
  }))
  // resolve berjalan SETELAH validasi: body dan query aman dibaca
  .resolve(async ({ request, params, status }) => {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return status(401, { error: 'MISSING_TOKEN' });
    }

    const session = await verifyToken(token);

    if (!session) {
      return status(401, { error: 'INVALID_TOKEN' });
    }

    return { session };
  })
  .get('/me/:id', ({ session, requestId, params }) => ({
    requestId,
    userId: params.id,
    tenant: session.tenantId
  }), {
    params: t.Object({ id: t.String() })
  });
```

Mengembalikan nilai `status()` dari `resolve` akan memotong pipeline — handler tidak pernah berjalan — dan itulah perilaku yang kamu inginkan dari sebuah gerbang autentikasi.

### Hook Terbatas dengan as

Secara default sebuah hook bersifat lokal: ia hanya berlaku untuk route yang dideklarasikan setelahnya pada instance yang sama. `.as('scoped')` mendorongnya ke instance induk. `.as('global')` mendorongnya ke instance root.

```typescript
import { Elysia } from 'elysia';

const timing = new Elysia({ name: 'timing' })
  .onRequest(({ request }) => {
    (request as Request & { startedAt: number }).startedAt = performance.now();
  })
  // Diekspor hanya ke induk langsung
  .as('scoped');

const api = new Elysia({ prefix: '/api' })
  .use(timing)
  .get('/items', () => ({ items: [] }));

const root = new Elysia()
  .use(api)
  .get('/health', () => ({ ok: true }));
```

`timing` mencakup `/api/items` tetapi tidak `/health`, karena `scoped` berhenti pada instance yang memasangnya. Jika kamu butuh hook di mana-mana, deklarasikan hook yang sama dengan `.as('global')` pada plugin root — lalu audit setiap route, sebab "global" adalah sumber efek samping ganda paling umum di aplikasi Elysia.

### Macro untuk Guard Route yang Dapat Dipakai Ulang

```typescript
import { Elysia, t } from 'elysia';

export const policy = new Elysia({ name: 'policy' })
  .macro({
    // Aktifkan dengan: { permission: 'billing:read' }
    permission(permission: string) {
      return {
        beforeHandle({ session, status }) {
          if (!session.roles.includes(permission)) {
            return status(403, { error: 'FORBIDDEN', permission });
          }
        }
      };
    },

    // Macro yang butuh data request: deklarasikan `resolve`, bukan `beforeHandle`
    tenantScoped: {
      resolve({ session, params, status }) {
        if (session.tenantId !== params.tenantId) {
          return status(404, { error: 'TENANT_NOT_FOUND' });
        }
        return { tenantId: session.tenantId };
      }
    }
  });

const app = new Elysia()
  .use(sessionContext)
  .use(policy)
  .get('/invoices', ({ tenantId }) => ({ tenantId, invoices: [] }), {
    tenantScoped: true,
    params: t.Object({ tenantId: t.String() })
  })
  .delete('/invoices/:id', ({ status }) => status(204), {
    permission: 'billing:write',
    params: t.Object({ id: t.String() })
  });
```

Pilih macro dibanding `onBeforeHandle` global untuk apa pun yang bersifat kondisional. Macro bersifat opt-in di level route, mudah dicari berdasarkan nama, dan tampil pada definisi route itu sendiri alih-alih tersembunyi tiga file jauhnya.

### Identitas Plugin dan Deduplikasi

```typescript
import { Elysia } from 'elysia';

// Plugin bernama: memasangnya dua kali tidak berefek setelah mount pertama
export const logger = new Elysia({ name: 'logger' })
  .decorate('log', (event: string, data?: unknown) => {
    console.log(JSON.stringify({ event, data, at: Date.now() }));
  })
  .onAfterResponse(({ log, request }) => {
    log('http', { url: request.url });
  });

// Plugin anonim: setiap mount membuat dekorator dan set hook BARU
export const untracked = new Elysia()
  .decorate('trace', (msg: string) => console.log(msg));
```

Deduplikasi dikunci pada `name`, bukan pada path modul atau nilainya. Dua plugin yang memakai `name` sama dianggap plugin yang sama, sehingga pustaka pihak ketiga dan fork lokalmu yang keduanya menyebut diri `logger` akan diam-diam melebur menjadi satu. Beri namespace pada nama apa pun yang kamu publikasikan.

### Seed Konfigurasi Plugin

```typescript
import { Elysia } from 'elysia';

interface CacheConfig {
  ttl: number;
  prefix: string;
}

export const cache = (config: CacheConfig) =>
  new Elysia({
    name: 'cache',
    seed: config
  })
    .decorate('cache', {
      key(id: string) {
        return `${config.prefix}:${id}`;
      },
      async get<T>(id: string): Promise<T | null> {
        const hit = await redis.get(config.prefix + ':' + id);
        return hit ? (JSON.parse(hit) as T) : null;
      },
      async set(id: string, value: unknown) {
        await redis.set(config.prefix + ':' + id, JSON.stringify(value), 'EX', config.ttl);
      }
    });

// Dua mount, dua konfigurasi, satu identitas plugin yang terdeduplikasi
const app = new Elysia()
  .use(cache({ ttl: 30, prefix: 'short' }))
  .use(cache({ ttl: 3600, prefix: 'long' }));
```

`seed` adalah yang membuat plugin bernama aman dikonfigurasi. Tanpanya, `use()` kedua akan diabaikan sepenuhnya dan konfigurasi pertama menang secara diam-diam.

### Plugin dengan Lazy Loading

```typescript
import { Elysia } from 'elysia';

// Plugin berat dievaluasi hanya saat modulnya diimpor
export const reporting = Elysia.lazy(() =>
  import('./reporting').then(({ reportingPlugin }) => reportingPlugin)
);

// Plugin kondisional: hanya didaftarkan bila dependensinya tersedia
const otel = Elysia.lazy(async () => {
  if (!Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return new Elysia({ name: 'otel-disabled' });
  }

  const { opentelemetry } = await import('@elysiajs/opentelemetry');
  return opentelemetry();
});

const app = new Elysia()
  .use(otel)
  .use(reporting)
  .get('/health', () => ({ ok: true }));
```

Plugin lazy diselesaikan saat boot, bukan saat import. Ini alat yang tepat untuk observability opsional, modul di balik feature flag, dan apa pun yang menarik dependensi besar yang tidak kamu inginkan ada di jalur cold start.

### Komposisi Guard untuk Grup Route

```typescript
import { Elysia, t } from 'elysia';

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .guard({
    headers: t.Object({
      authorization: t.String({ minLength: 8 })
    }),
    beforeHandle({ headers, status }) {
      if (!headers.authorization.startsWith('Bearer ')) {
        return status(401, { error: 'BEARER_REQUIRED' });
      }
    },
    detail: { tags: ['Admin'] }
  })
  .get('/stats', ({ session }) => ({ session, stats: {} }))
  // Guard kedua akan dikomposisikan: route bersarang mewarisi kedua lapisan
  .guard({
    beforeHandle({ session, status }) {
      if (!session.isAdmin) {
        return status(403, { error: 'ADMIN_ONLY' });
      }
    }
  })
  .post('/keys', ({ status }) => status(201, { created: true }), {
    body: t.Object({ label: t.String() })
  });
```

Guard bersarang dari luar ke dalam: hook guard terluar berjalan lebih dulu, lalu guard dalam, lalu hook milik route itu sendiri. Simpan guard untuk invariant yang benar-benar berlaku pada seluruh subtree; apa pun yang spesifik route sebaiknya masuk ke macro.

### Response Mapping dan Injeksi Header

```typescript
import { Elysia } from 'elysia';

const app = new Elysia()
  .onAfterHandle(({ set, response }) => {
    set.headers['x-content-type-options'] = 'nosniff';
    return response;
  })
  .mapResponse(({ response, set, path }) => {
    // Hanya sentuh response JSON; biarkan stream dan file apa adanya
    if (path.startsWith('/files')) return response;

    return new Response(
      JSON.stringify({ data: response }),
      {
        headers: {
          ...set.headers,
          'content-type': 'application/json; charset=utf-8'
        }
      }
    );
  });
```

`mapResponse` melihat apa pun yang dihasilkan handler, termasuk objek `status()`, sehingga ia harus menangani setiap bentuk. Mengembalikan `undefined` akan meneruskan ke mapper berikutnya, cara yang bersih untuk melapisi mapper tanpa saling bertabrakan.

### Penanganan Error di Dalam Lifecycle

```typescript
import { Elysia } from 'elysia';

class DomainError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string
  ) {
    super(message);
  }
}

const errors = new Elysia({ name: 'errors' })
  .onError(({ error, code, set, request }) => {
    const requestId = request.headers.get('x-request-id') ?? 'unknown';

    if (error instanceof DomainError) {
      set.status = error.status;
      return { code: error.code, message: error.message, requestId };
    }

    if (code === 'VALIDATION') {
      set.status = 422;
      return { code: 'VALIDATION_FAILED', message: error.message, requestId };
    }

    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { code: 'NOT_FOUND', message: 'Route does not exist', requestId };
    }

    console.error({ requestId, error });
    set.status = 500;
    return { code: 'INTERNAL', message: 'Unexpected error', requestId };
  })
  .as('global');
```

`onError` adalah satu-satunya hook yang menerima string `code` dari Elysia, yang membedakan kegagalan level framework (`VALIDATION`, `NOT_FOUND`, `PARSE`) dari error yang kamu lempar sendiri. Bercabanglah berdasarkan `code` lebih dulu dan tipe error kemudian — urutan itu mencegah error validasi dilaporkan sebagai 500.

### Hook Lifecycle WebSocket

```typescript
import { Elysia, t } from 'elysia';

const app = new Elysia()
  .use(sessionContext)
  .ws('/ws', {
    // Berjalan sekali per koneksi, sebelum pesan apa pun
    beforeHandle({ data, status }) {
      if (!data.headers.authorization) {
        return status(401);
      }
    },
    open(ws) {
      ws.subscribe('broadcast');
      ws.send({ type: 'ready' });
    },
    message(ws, message) {
      // Validasi lewat skema di bawah menjamin bentuk data di sini
      ws.publish('broadcast', { type: 'chat', text: message.text });
    },
    drain(ws) {
      // Backpressure mereda — aman untuk melanjutkan produksi
      ws.send({ type: 'resumed' });
    },
    close(ws, code, reason) {
      ws.unsubscribe('broadcast');
      console.log('closed', code, reason);
    },
    body: t.Object({
      text: t.String({ minLength: 1 })
    })
  });
```

Route WebSocket menerima gerbang `beforeHandle` / `resolve` yang sama seperti route HTTP, sehingga logika otorisasi dapat dipakai ulang apa adanya di kedua transport tersebut.

### Hook Shutdown untuk Graceful Draining

```typescript
import { Elysia } from 'elysia';

const app = new Elysia()
  .onStart(async ({ server }) => {
    await redis.connect();
    console.log('started on port', server?.port);
  })
  .onStop(async () => {
    // Berhenti menerima pekerjaan baru, lalu tiriskan
    await queue.pause();
    await queue.drain();
    await redis.quit();
    console.log('drained and stopped');
  })
  .get('/health', () => ({ ok: true }));

// Sambungkan sinyal container ke lifecycle stop milik Elysia
process.on('SIGTERM', () => app.stop());
process.on('SIGINT', () => app.stop());
```

`onStop` adalah tempat untuk pekerjaan latar yang sedang berjalan. Tanpanya, deploy bergulir akan menjatuhkan job yang masih dalam antrean dan penulisan yang belum selesai saat container lama keluar.

---
title: "Cheat Sheet Elysia.js"
description: "Panduan referensi cepat untuk Elysia.js mencakup pengaturan aplikasi, routing, validasi dengan TypeBox, middleware dan hooks, plugin, injeksi state, CORS, penanganan error, dokumentasi Swagger, dukungan WebSocket, pengujian, dan deployment dengan Bun."
category: "backend"
technology: "elysiajs"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Elysia.js

## Tabel Referensi Cepat

| Aksi | Kode / Pola | Deskripsi |
|------|-------------|-----------|
| Inisialisasi proyek | `bun init -y && bun add elysia` | Membuat proyek Bun baru dan menginstal Elysia |
| Pengaturan dasar aplikasi | `const app = new Elysia().listen(PORT)` | Membuat dan menjalankan server Elysia |
| Route GET | `app.get('/path', handler)` | Menangani permintaan GET di jalur tertentu |
| Route POST | `app.post('/path', handler)` | Menangani permintaan POST di jalur tertentu |
| Route PUT | `app.put('/path/:id', handler)` | Menangani permintaan PUT dengan parameter route |
| Route DELETE | `app.delete('/path/:id', handler)` | Menangani permintaan DELETE dengan parameter route |
| Parameter route | `params.id` (dari `Context`) | Mengakses segmen route dinamis (`/users/:id`) |
| Query string | `query.page` (dari `Context`) | Mengakses parameter query URL (`?page=2`) |
| Body permintaan | `body` (dari `Context`) | Mengakses body JSON yang di-parse |
| Kirim JSON | `return { key: value }` atau `context.set` | Mengembalikan respons JSON langsung |
| Atur kode status | `set.status = 201` | Mengatur status HTTP sebelum mengirim respons |
| Guard route | `app.guard({ ... }, app => ... )` | Menerapkan hooks/validasi ke sekelompok route |
| Grup route | `app.group('/prefix', app => ... )` | Memberi prefiks pada sekelompok route |
| Skema TypeBox | `t.Object({ name: t.String() })` | Mendefinisikan skema validasi request/response |
| Validasi body | `app.post('/', ({ body }) => body, { schema: { body } })` | Memvalidasi body request terhadap skema TypeBox |
| Hook: before handle | `app.onBeforeHandle(({ request }) => { ... })` | Middleware yang berjalan sebelum handler route |
| Hook: after handle | `app.onAfterHandle(({ response }) => { ... })` | Middleware yang berjalan setelah handler route |
| Hook: on error | `app.onError(({ error, set }) => { ... })` | Penanganan error global |
| Hook: on request | `app.onRequest(({ request }) => { ... })` | Hook yang dipicu pada setiap request masuk |
| Hook: on response | `app.onResponse(({ response }) => { ... })` | Hook yang dipicu pada setiap response keluar |
| Sistem plugin | `app.use(plugin)` | Memasang plugin Elysia |
| Injeksi state | `app.state('key', value)` | Menyuntikkan state global yang dapat diakses di handler |
| Injeksi dekorator | `app.decorate('name', value)` | Menyuntikkan metode/properti kustom ke dalam context |
| Penanganan cookie | `cookie` (dari `Context`) | Membaca dan mengatur cookie melalui `set.cookie` |
| CORS | `app.use(cors())` | Mengaktifkan permintaan lintas asal (butuh `@elysiajs/cors`) |
| Dokumen Swagger | `app.use(swagger())` | Membuat dokumentasi OpenAPI (butuh `@elysiajs/swagger`) |
| WebSocket | `app.ws('/ws', { message(ws, data) { ... } })` | Menangani koneksi WebSocket |
| File statis | `app.use(static())` | Menyajikan file statis (butuh `@elysiajs/static`) |
| Unggah file | Gunakan `body` dengan `t.File()` | Menangani unggah file multipart |
| Konfigurasi env | `Bun.env.VAR_NAME` | Mengakses variabel lingkungan melalui Bun |
| Jalankan tes | `bun test` | Menjalankan tes dengan Bun test runner |
| Mulai server | `bun run src/index.ts` | Menjalankan entry point server Elysia |

## Perintah Umum

### Pengaturan Proyek

```bash
# Membuat proyek Bun baru
mkdir my-elysia-api && cd my-elysia-api
bun init -y

# Menginstal Elysia
bun add elysia

# Menginstal plugin Elysia umum
bun add @elysiajs/cors @elysiajs/swagger @elysiajs/static @elysiajs/websocket

# Menginstal TypeBox untuk validasi skema
bun add @sinclair/typebox

# Menjalankan development dengan mode watch
bun --watch src/index.ts
```

### CLI Bun & Development

```bash
# Menjalankan aplikasi
bun run src/index.ts

# Menjalankan dengan file watching (auto-restart saat ada perubahan)
bun --watch src/index.ts

# Menjalankan tes
bun test

# Menjalankan tes dalam mode watch
bun test --watch

# Menjalankan tes dengan coverage
bun test --coverage

# Bun repl
bun repl
```

### Struktur Proyek Elysia

```bash
# Struktur file umum untuk proyek Elysia
my-elysia-api/
├── src/
│   ├── index.ts          # Entry point
│   ├── app.ts            # Konfigurasi aplikasi
│   ├── routes/
│   │   ├── users.ts      # Route pengguna (plugin)
│   │   └── index.ts      # Agregator route
│   ├── plugins/
│   │   └── auth.ts       # Plugin auth
│   ├── schemas/
│   │   └── user.ts       # Skema TypeBox
│   └── models/
│       └── user.ts       # Model data
├── test/
│   └── app.test.ts       # Tes
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Pengujian dengan Bun

```bash
# Menginstal dependensi pengujian
bun add -d @types/bun

# Menjalankan semua tes
bun test

# Menjalankan file tes tertentu
bun test test/users.test.ts

# Menjalankan tes dengan laporan coverage
bun test --coverage

# Contoh perintah tes
bun test --preload ./src/setup.ts
```

### Variabel Lingkungan dengan Bun

```bash
# Mengakses variabel lingkungan
Bun.env.PORT
Bun.env.DATABASE_URL
Bun.env.JWT_SECRET

# File .env (dimuat otomatis oleh Bun)
# PORT=3000
# DATABASE_URL=postgres://localhost:5432/mydb

# Penggunaan di scripts
# bun run src/index.ts
```

### Deployment Docker

```dockerfile
# Dockerfile untuk Elysia.js dengan Bun
FROM oven/bun:1 AS base
WORKDIR /app

# Menginstal dependensi
COPY package.json bun.lock ./
RUN bun install

# Menyalin source
COPY . .

# Build TypeScript
RUN bun build src/index.ts --outdir ./dist

# Image produksi
FROM oven/bun:1-slim
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules

EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
```

```bash
# Build dan jalankan dengan Docker
docker build -t my-elysia-api .
docker run -p 3000:3000 my-elysia-api
```

## Potongan Kode

### Pengaturan Dasar Aplikasi Elysia

```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';

const app = new Elysia()
  // --- Plugin ---
  .use(cors())
  .use(swagger())
  .use(staticPlugin())

  // --- Route ---
  .get('/', () => ({ message: 'Elysia API running' }))

  .get('/health', () => ({ status: 'ok', timestamp: Date.now() }))

  // --- Mulai server ---
  .listen(3000);

console.log(`🦊 Elysia running at ${app.server?.hostname}:${app.server?.port}`);
```

### Routing: GET, POST, PUT, DELETE

```typescript
import { Elysia, t } from 'elysia';

const app = new Elysia();

// GET — daftar item
app.get('/users', () => {
  return { users: [{ id: 1, name: 'Alice' }] };
});

// GET dengan params — item tunggal
app.get('/users/:id', ({ params: { id } }) => {
  return { user: { id: Number(id), name: 'Alice' } };
});

// POST — buat item
app.post('/users', ({ body }) => {
  // body memiliki tipe berdasarkan skema
  return { created: body };
}, {
  schema: {
    body: t.Object({
      name: t.String(),
      email: t.String({ format: 'email' })
    })
  }
});

// PUT — perbarui item
app.put('/users/:id', ({ params: { id }, body }) => {
  return { updated: { id: Number(id), ...body } };
});

// DELETE — hapus item
app.delete('/users/:id', ({ params: { id } }) => {
  return { deleted: Number(id) };
});

app.listen(3000);
```

### Grup Route dan Guard

```typescript
import { Elysia, t } from 'elysia';

const app = new Elysia();

// --- Grup route dengan prefiks ---
app.group('/api/v1', app =>
  app
    .get('/users', () => ({ users: [] }))
    .get('/users/:id', ({ params: { id } }) => ({ user: { id } }))
    .post('/users', ({ body }) => ({ created: body }))
);

// --- Guard: terapkan hooks/skema ke grup ---
app.guard(
  {
    schema: {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: 'email' })
      })
    },
    beforeHandle: ({ request }) => {
      // Periksa header auth
      if (!request.headers.get('Authorization')) {
        return { error: 'Unauthorized', status: 401 };
      }
    }
  },
  app =>
    app.post('/admin/users', ({ body }) => ({ created: body }))
);

app.listen(3000);
```

### Validasi Skema TypeBox

```typescript
import { Elysia, t } from 'elysia';

// --- Definisikan skema yang dapat digunakan ulang ---
const UserSchema = t.Object({
  id: t.Number(),
  name: t.String({ minLength: 2, maxLength: 100 }),
  email: t.String({ format: 'email' }),
  age: t.Optional(t.Number({ minimum: 0, maximum: 150 })),
  role: t.Enum({ admin: 'admin', user: 'user', guest: 'guest' })
});

const CreateUserSchema = t.Object({
  name: t.String({ minLength: 2 }),
  email: t.String({ format: 'email' }),
  age: t.Optional(t.Number({ minimum: 0 })),
  role: t.Optional(t.String())
});

// --- Terapkan skema ke route ---
const app = new Elysia()
  .post('/users', ({ body }) => {
    // body memiliki tipe yang disimpulkan dari CreateUserSchema
    return { created: body };
  }, {
    schema: {
      body: CreateUserSchema,
      response: t.Object({ created: UserSchema }),
      // query: t.Object({ page: t.Number() }),
      // params: t.Object({ id: t.String() })
    }
  })
  .listen(3000);
```

### Middleware dan Hooks

```typescript
import { Elysia } from 'elysia';

const app = new Elysia()

  // --- onRequest: dipicu pada setiap request masuk ---
  .onRequest(({ request }) => {
    console.log(`[${request.method}] ${request.url}`);
  })

  // --- onBeforeHandle: berjalan sebelum handler route (seperti middleware) ---
  .onBeforeHandle(({ request, set }) => {
    const auth = request.headers.get('Authorization');
    if (!auth) {
      set.status = 401;
      return { error: 'Authorization header required' };
    }
    // Mengembalikan nilai untuk mempersingkat handler
  })

  // --- onAfterHandle: berjalan setelah handler route ---
  .onAfterHandle(({ response }) => {
    // Transformasi atau log respons
    console.log('Response:', response);
  })

  // --- onError: penanganan error global ---
  .onError(({ error, set }) => {
    console.error('Error:', error);
    set.status = 500;
    return { error: 'Internal server error', message: error.message };
  })

  // --- onResponse: dipicu pada setiap response keluar ---
  .onResponse(({ response, set }) => {
    set.headers['X-Powered-By'] = 'Elysia';
  })

  .get('/secure', () => ({ secret: 'data' }))
  .listen(3000);
```

### Sistem Plugin

```typescript
import { Elysia } from 'elysia';

// --- Definisikan plugin ---
const authPlugin = (app: Elysia) =>
  app
    .decorate('auth', {
      isAuthenticated(request: Request): boolean {
        return request.headers.has('Authorization');
      }
    })
    .onBeforeHandle(({ auth, request, set }) => {
      if (!auth.isAuthenticated(request)) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
    });

// --- Definisikan plugin lain ---
const loggerPlugin = new Elysia({ name: 'logger' })
  .onRequest(({ request }) => {
    console.log(`${request.method} ${request.url}`);
  });

// --- Gunakan plugin di aplikasi utama ---
const app = new Elysia()
  .use(authPlugin)
  .use(loggerPlugin)
  .get('/admin', ({ auth }) => ({
    message: 'Welcome admin!',
    auth: auth.isAuthenticated
  }))
  .listen(3000);
```

### Injeksi State dan Dekorator

```typescript
import { Elysia } from 'elysia';

const app = new Elysia()

  // --- Injeksi state (state global reaktif) ---
  .state('counter', 0)
  .state('config', {
    appName: 'MyAPI',
    version: '1.0.0'
  })

  // --- Injeksi dekorator (metode kustom pada context) ---
  .decorate('utils', {
    formatDate(date: Date): string {
      return date.toISOString();
    },
    capitalize(str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  })

  // --- Akses state dan dekorator di handler ---
  .get('/counter', ({ store, utils }) => {
    store.counter++;
    return {
      counter: store.counter,
      formatted: utils.formatDate(new Date())
    };
  })

  .get('/config', ({ store }) => store.config)
  .listen(3000);
```

### Penanganan Cookie dan Session

```typescript
import { Elysia, t } from 'elysia';
import { cookie } from '@elysiajs/cookie';

const app = new Elysia()
  .use(cookie())

  // --- Mengatur cookie ---
  .get('/set-cookie', ({ setCookie }) => {
    setCookie('session', 'abc123', {
      httpOnly: true,
      maxAge: 3600,
      path: '/',
      secure: true
    });
    return { message: 'Cookie set' };
  })

  // --- Membaca cookie ---
  .get('/read-cookie', ({ cookie }) => {
    return { session: cookie?.session || 'no session' };
  })

  // --- Menghapus cookie ---
  .get('/clear-cookie', ({ removeCookie }) => {
    removeCookie('session');
    return { message: 'Cookie removed' };
  })

  .listen(3000);
```

**Catatan:** Instal dengan `bun add @elysiajs/cookie`.

### Unggah File dengan Elysia

```typescript
import { Elysia, t } from 'elysia';

const app = new Elysia()

  // --- Unggah file tunggal ---
  .post('/upload', async ({ body: { file } }) => {
    // file adalah objek File (multipart)
    const buffer = await file.arrayBuffer();
    const filename = `${Date.now()}-${file.name}`;

    // Tulis ke disk menggunakan Bun
    await Bun.write(`uploads/${filename}`, buffer);

    return { filename, size: file.size, type: file.type };
  }, {
    schema: {
      body: t.Object({
        file: t.File({ maxSize: '5m' })
      })
    }
  })

  // --- Banyak file ---
  .post('/uploads', async ({ body: { files } }) => {
    const results = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const filename = `${Date.now()}-${file.name}`;
      await Bun.write(`uploads/${filename}`, buffer);
      results.push({ filename, size: file.size });
    }
    return { uploaded: results };
  }, {
    schema: {
      body: t.Object({
        files: t.Array(t.File({ maxSize: '5m' }))
      })
    }
  })

  .listen(3000);
```

**Catatan:** Instal dengan `bun add @elysiajs/file-upload` jika belum termasuk bawaan.

### Konfigurasi CORS

```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

const app = new Elysia()
  // --- Mengizinkan semua asal (hanya development) ---
  // .use(cors())

  // --- Membatasi ke asal spesifik ---
  .use(
    cors({
      origin: ['https://myapp.com', 'https://admin.myapp.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400
    })
  )
  .get('/data', () => ({ secret: 'data' }))
  .listen(3000);
```

**Catatan:** Instal dengan `bun add @elysiajs/cors`.

### Pola Penanganan Error

```typescript
import { Elysia } from 'elysia';

// --- Kelas error kustom ---
class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const app = new Elysia()

  // --- Penanganan error global ---
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        error: error.name,
        message: error.message,
        details: error.details
      };
    }

    // Menangani error validasi dari TypeBox
    if (error.message?.includes('Expected')) {
      set.status = 400;
      return { error: 'Validation Error', message: error.message };
    }

    // Default 500
    console.error('Unhandled error:', error);
    set.status = 500;
    return { error: 'Internal Server Error' };
  })

  // --- Route menggunakan error kustom ---
  .get('/items/:id', ({ params: { id }, set }) => {
    if (id === '0') {
      throw new AppError(404, 'Item not found', { itemId: id });
    }
    return { id: Number(id), name: 'Item' };
  })

  .get('/validate', ({ query: { page } }) => {
    // Elysia + TypeBox memvalidasi secara otomatis
    return { page };
  }, {
    schema: {
      query: t.Object({
        page: t.Number({ minimum: 1 })
      })
    }
  })

  .listen(3000);
```

### Dokumentasi Swagger / OpenAPI

```typescript
import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';

const app = new Elysia()
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'My Elysia API',
          version: '1.0.0',
          description: 'Dokumentasi API yang dihasilkan oleh Elysia Swagger'
        },
        tags: [
          { name: 'Users', description: 'Endpoint pengguna' },
          { name: 'Health', description: 'Pemeriksaan kesehatan' }
        ]
      }
    })
  )

  .get('/health', () => ({ status: 'ok' }), {
    detail: {
      tags: ['Health'],
      summary: 'Endpoint pemeriksaan kesehatan'
    }
  })

  .post('/users', ({ body }) => ({ created: body }), {
    detail: {
      tags: ['Users'],
      summary: 'Membuat pengguna baru'
    },
    schema: {
      body: t.Object({
        name: t.String(),
        email: t.String({ format: 'email' })
      }),
      response: t.Object({
        created: t.Object({
          name: t.String(),
          email: t.String({ format: 'email' })
        })
      })
    }
  })

  .listen(3000);

console.log(`Dokumen Swagger tersedia di http://localhost:3000/docs`);
```

**Catatan:** Instal dengan `bun add @elysiajs/swagger`.

### Dukungan WebSocket

```typescript
import { Elysia } from 'elysia';
import { websocket } from '@elysiajs/websocket';

const app = new Elysia()
  .use(websocket())

  // --- Route WebSocket ---
  .ws('/ws', {
    // Saat klien terhubung
    open(ws) {
      console.log('Klien terhubung');
      ws.send({ type: 'welcome', message: 'Selamat datang di server WebSocket!' });
    },

    // Saat menerima pesan
    message(ws, data) {
      console.log('Diterima:', data);
      // Kirim balik
      ws.send({ type: 'echo', data, timestamp: Date.now() });
    },

    // Saat koneksi ditutup
    close(ws) {
      console.log('Klien terputus');
    },

    // Saat error
    drain(ws) {
      console.log('Tekanan balik berkurang');
    }
  })

  // --- Route broadcast (endpoint HTTP untuk mengirim ke semua klien) ---
  .get('/broadcast', ({ server }) => {
    const message = { type: 'broadcast', text: 'Halo semuanya!' };
    server?.publish('/ws', message);
    return { sent: true };
  })

  .listen(3000);
```

**Catatan:** Instal dengan `bun add @elysiajs/websocket`. WebSocket Elysia dibangun di atas paket `@elysiajs/websocket`.

### Pengujian dengan Bun Test Runner

```typescript
// test/app.test.ts
import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';

// Helper untuk membuat aplikasi tes
function createTestApp() {
  return new Elysia()
    .get('/hello', () => ({ message: 'Hello, World!' }))
    .get('/users/:id', ({ params: { id } }) => ({ user: { id: Number(id) } }))
    .post('/echo', ({ body }) => ({ echo: body }));
}

describe('Aplikasi Elysia', () => {
  it('harus merespons GET /hello', async () => {
    const app = createTestApp();

    const response = await app
      .handle(new Request('http://localhost/hello'))
      .then(res => res.json());

    expect(response).toEqual({ message: 'Hello, World!' });
  });

  it('harus menangani parameter route', async () => {
    const app = createTestApp();

    const response = await app
      .handle(new Request('http://localhost/users/42'))
      .then(res => res.json());

    expect(response).toEqual({ user: { id: 42 } });
  });

  it('harus menangani POST dengan body', async () => {
    const app = createTestApp();

    const response = await app
      .handle(
        new Request('http://localhost/echo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Alice' })
        })
      )
      .then(res => res.json());

    expect(response).toEqual({ echo: { name: 'Alice' } });
  });

  it('harus mengembalikan 404 untuk route yang tidak dikenal', async () => {
    const app = createTestApp();

    const response = await app.handle(
      new Request('http://localhost/not-found')
    );

    expect(response.status).toBe(404);
  });
});
```

### Pola Path Variabel

```typescript
import { Elysia } from 'elysia';

const app = new Elysia()

  // --- Parameter bernama ---
  .get('/users/:userId/books/:bookId', ({ params }) => {
    return params; // { userId: string, bookId: string }
  })

  // --- Parameter opsional (awali dengan ?) ---
  .get('/products/:id?', ({ params }) => {
    if (params.id) {
      return { product: { id: params.id } };
    }
    return { products: [] };
  })

  // --- Wildcard (catch-all) parameter ---
  .get('/files/*', ({ params }) => {
    return { path: params['*'] };
  })

  .listen(3000);
```

### Deployment Produksi dengan Bun

```typescript
// src/index.ts — entry point siap produksi
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';

const app = new Elysia()
  .use(cors())
  .use(swagger({
    path: '/docs',
    documentation: {
      info: {
        title: 'Production API',
        version: '1.0.0'
      }
    }
  }))
  .get('/health', () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  }))
  .listen(Bun.env.PORT || 3000);

console.log(`Server berjalan di port ${app.server?.port}`);
```

```bash
# Perintah deployment produksi
# Build TypeScript
bun build src/index.ts --outdir ./dist --target bun

# Mulai dalam produksi
NODE_ENV=production bun run dist/index.js

# Atau gunakan bun langsung tanpa hot reload
bun run src/index.ts
```

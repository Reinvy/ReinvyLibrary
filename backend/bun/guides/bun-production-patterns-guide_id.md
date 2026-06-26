---
title: "Panduan Pola Produksi Bun"
description: "Panduan komprehensif tentang pola dan praktik terbaik untuk membangun, menguji, dan menyebarkan aplikasi dengan runtime Bun — meliputi alur kerja pengembangan, optimalisasi performa, dan strategi deployment."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Pola Produksi Bun

## Pendahuluan

Bun adalah runtime dan toolkit JavaScript all-in-one yang mencakup bundler, test runner, klien SQLite native, dan package manager. Desainnya yang berfokus pada performa — didukung oleh mesin JavaScriptCore alih-alih V8 — memberikan waktu startup yang lebih cepat, penggunaan memori yang lebih rendah, dan pengalaman pengembangan yang lebih efisien dibandingkan Node.js atau Deno.

Panduan ini mencakup pola-pola siap-produksi untuk membangun dan menyebarkan aplikasi Bun: dari pengaturan lingkungan pengembangan dan strategi pengujian hingga penyesuaian performa, penanganan error, dan deployment. Baik Anda memigrasikan proyek Node.js yang sudah ada atau memulai dari awal dengan Bun, praktik-praktik ini akan membantu Anda membangun aplikasi yang kokoh, mudah dirawat, dan dapat diskalakan.

## Praktik Terbaik

- **Gunakan toolchain bawaan Bun** — Utamakan `bun run`, `bun test`, `bun build`, dan `bun install` daripada alat eksternal. Implementasi native Bun lebih cepat, mengurangi ketergantungan dependensi, dan memberikan perilaku yang konsisten di semua lingkungan. Hindari mencampur Bun dengan npm, npx, atau pnpm dalam proyek yang sama.

- **Strukturkan proyek sebagai workspace Bun** — Gunakan dukungan workspace Bun di `package.json` untuk monorepo. Workspace berbagi satu lockfile dan menaikkan dependensi secara efisien, mengurangi waktu instalasi dan penggunaan disk dibandingkan npm workspaces atau yarn.

- **Utamakan TypeScript tanpa langkah build** — Bun menjalankan TypeScript secara native tanpa langkah kompilasi sebelum eksekusi. Tulis file `.ts` secara langsung dan jalankan dengan `bun run`. Untuk distribusi produksi, gunakan `bun build` untuk menggabungkan TypeScript menjadi JavaScript, tetapi selama pengembangan, lewati langkah build sepenuhnya.

- **Gunakan `bun:sqlite` untuk penyimpanan data embedded** — Klien SQLite bawaan Bun (`bun:sqlite`) secara signifikan lebih cepat daripada `better-sqlite3` atau `sql.js` karena melewati binding Node.js. Gunakan untuk database embedded, lapisan cache, analytics, dan aplikasi proses tunggal di mana database PostgreSQL atau MySQL skala penuh tidak diperlukan.

- **Implementasikan graceful shutdown** — Daftarkan signal handler untuk `SIGTERM` dan `SIGINT` untuk menutup koneksi database, menyelesaikan penulisan yang tertunda, dan menghentikan server HTTP secara bersih. API `process.on` Bun bekerja identik dengan Node.js tetapi integrasi dengan `Bun.serve()` memerlukan penutupan server secara eksplisit.

- **Optimalkan untuk mesin JavaScriptCore Bun** — Tidak seperti V8, JavaScriptCore mengoptimalkan pola yang berbeda. Utamakan loop `for...of` daripada `forEach`, gunakan `const` dan `let` daripada `var`, dan hindari optimasi khusus V8 seperti inline caches yang mengasumsikan perilaku V8. Profil dengan `bun:jsc` untuk memahami karakteristik performa khusus JSC.

- **Gunakan validasi lingkungan saat startup** — Muat dan validasi semua variabel lingkungan yang diperlukan saat startup aplikasi menggunakan `Bun.env` yang dikombinasikan dengan library validasi (Zod atau TypeBox). Gagal segera dengan pesan error deskriptif daripada membiarkan aplikasi yang salah konfigurasi melayani lalu lintas.

- **Gunakan connection pooling untuk SQLite produksi** — Meskipun `bun:sqlite` cepat, akses tulis bersamaan dari beberapa proses memerlukan perhatian. Gunakan satu instance `Database` per proses (Bun berbagi koneksi di seluruh task async dengan aman dalam satu thread), dan aktifkan mode WAL untuk performa baca bersamaan yang lebih baik.

- **Tulis tes dengan `bun test`** — Test runner bawaan Bun kompatibel dengan Jest dan secara signifikan lebih cepat. Gunakan `bun test` untuk unit test, integration test, dan snapshot testing. Dukungan TypeScript nativenya menghilangkan kebutuhan konfigurasi ts-jest atau @swc/jest.

- **Bundle untuk produksi dengan `bun build`** — Gunakan `bun build` untuk membuat bundle yang dioptimalkan untuk deployment. Targetkan `bun` untuk runtime Bun, `node` untuk kompatibilitas Node.js, atau `browser` untuk kode frontend. Bundler mendukung code splitting, minifikasi, source maps, dan tree-shaking secara langsung.

## Langkah Implementasi

### Langkah 1: Inisialisasi Proyek Siap-Produksi

1. Buat proyek Bun baru dengan `bun init`:

```bash
bun init -y
```

1. Konfigurasi struktur proyek:

```text
my-bun-app/
├── src/
│   ├── index.ts          # Entry point
│   ├── routes/           # Route handlers
│   ├── db/               # Lapisan database
│   ├── middleware/       # Middleware permintaan
│   └── lib/             # Utilitas bersama
├── tests/               # File tes
├── scripts/             # Script build dan deploy
├── bun.lock             # Lockfile Bun
├── tsconfig.json        # Konfigurasi TypeScript
└── package.json         # Manifes proyek
```

1. Konfigurasi TypeScript untuk Bun:

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "noEmit": true
  }
}
```

1. Tambahkan paket `bun-types` untuk definisi tipe:

```bash
bun add -d bun-types
```

### Langkah 2: Siapkan Validasi Lingkungan

1. Buat skema lingkungan dan validasi:

```typescript
// src/lib/env.ts
import z from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_PATH: z.string().default('./data/app.db'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().transform(s => s.split(',')),
});

// Validasi semua env var saat startup
export const env = envSchema.parse(Bun.env);
```

1. Jalankan validasi sebelum memulai server:

```typescript
// src/index.ts
import { env } from './lib/env';
// Jika env var tidak valid, proses berhenti di sini dengan error yang jelas

console.log(`Memulai server dalam mode ${env.NODE_ENV} pada port ${env.PORT}`);
```

### Langkah 3: Bangun Server HTTP Produksi

1. Buat server HTTP modular dengan routing:

```typescript
// src/server.ts
import { env } from './lib/env';

interface RouteHandler {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, params: Record<string, string>) => Response | Promise<Response>;
}

export function createRouter() {
  const routes: RouteHandler[] = [];

  return {
    get(path: string, handler: RouteHandler['handler']) {
      routes.push({ method: 'GET', path, handler });
    },
    post(path: string, handler: RouteHandler['handler']) {
      routes.push({ method: 'POST', path, handler });
    },
    match(method: string, url: string) {
      for (const route of routes) {
        if (route.method !== method) continue;
        const pattern = new URLPattern({ pathname: route.path });
        const match = pattern.exec(url);
        if (match) {
          return { handler: route.handler, params: match.pathname.groups };
        }
      }
      return null;
    },
  };
}

export function startServer(router: ReturnType<typeof createRouter>) {
  const server = Bun.serve({
    port: env.PORT,
    async fetch(req: Request) {
      const url = new URL(req.url);
      const match = router.match(req.method, url.pathname);

      if (!match) {
        return new Response('Not Found', { status: 404 });
      }

      try {
        return await match.handler(req, match.params);
      } catch (error) {
        console.error('Unhandled error:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    },
  });

  console.log(`Server listening on http://localhost:${server.port}`);
  return server;
}
```

1. Implementasikan graceful shutdown:

```typescript
// src/index.ts
import { createRouter, startServer } from './server';
import { env } from './lib/env';

const router = createRouter();

// Daftarkan routes
router.get('/api/health', () => Response.json({ status: 'ok' }));
router.get('/api/users/:id', async (req, params) => {
  return Response.json({ userId: params.id });
});

const server = startServer(router);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM diterima — mematikan secara graceful');
  server.stop();
  // Tutup koneksi database, flush log, dll.
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT diterima — mematikan secara graceful');
  server.stop();
  process.exit(0);
});
```

### Langkah 4: Implementasi Akses Database dengan bun:sqlite

1. Buat modul database dengan mode WAL dan manajemen koneksi:

```typescript
// src/db/database.ts
import { Database } from 'bun:sqlite';
import { env } from '../lib/env';

let db: Database | null = null;

export function getDatabase(): Database {
  if (!db) {
    db = new Database(env.DATABASE_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA busy_timeout = 5000');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
```

1. Buat pola repository yang type-safe:

```typescript
// src/db/users.ts
import { getDatabase } from './database';

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export function createUser(name: string, email: string): User {
  const db = getDatabase();
  const query = db.query(
    'INSERT INTO users (name, email) VALUES ($name, $email) RETURNING *'
  );
  return query.get({ $name: name, $email: email }) as User;
}

export function findUserById(id: number): User | null {
  const db = getDatabase();
  const query = db.query('SELECT * FROM users WHERE id = $id');
  return query.get({ $id: id }) as User | null;
}

export function listUsers(): User[] {
  const db = getDatabase();
  return db.query('SELECT * FROM users ORDER BY createdAt DESC').all() as User[];
}
```

### Langkah 5: Menulis Tes dengan bun test

1. Buat file tes menggunakan test runner Bun:

```typescript
// tests/users.test.ts
import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { getDatabase, closeDatabase } from '../src/db/database';
import { createUser, findUserById } from '../src/db/users';

// Gunakan database in-memory untuk tes
process.env.DATABASE_PATH = ':memory:';

beforeAll(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
});

afterAll(() => {
  closeDatabase();
});

describe('User Repository', () => {
  test('membuat user dan mengembalikan record', () => {
    const user = createUser('Alice', 'alice@example.com');
    expect(user.id).toBeGreaterThan(0);
    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@example.com');
  });

  test('mencari user berdasarkan id', () => {
    const user = createUser('Bob', 'bob@example.com');
    const found = findUserById(user.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Bob');
  });

  test('mengembalikan null untuk user yang tidak ada', () => {
    const user = findUserById(99999);
    expect(user).toBeNull();
  });
});
```

1. Jalankan tes:

```bash
bun test
```

1. Aktifkan watch mode untuk pengembangan:

```bash
bun test --watch
```

### Langkah 6: Konfigurasi Logging dan Penanganan Error

1. Buat logger terstruktur:

```typescript
// src/lib/logger.ts
import { env } from './env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[env.LOG_LEVEL];
}

export const logger = {
  debug(msg: string, data?: Record<string, unknown>) {
    if (shouldLog('debug')) {
      console.log(JSON.stringify({ level: 'debug', msg, data, time: new Date().toISOString() }));
    }
  },
  info(msg: string, data?: Record<string, unknown>) {
    if (shouldLog('info')) {
      console.log(JSON.stringify({ level: 'info', msg, data, time: new Date().toISOString() }));
    }
  },
  warn(msg: string, data?: Record<string, unknown>) {
    if (shouldLog('warn')) {
      console.warn(JSON.stringify({ level: 'warn', msg, data, time: new Date().toISOString() }));
    }
  },
  error(msg: string, error?: Error, data?: Record<string, unknown>) {
    if (shouldLog('error')) {
      console.error(JSON.stringify({
        level: 'error',
        msg,
        error: error?.message,
        stack: error?.stack,
        data,
        time: new Date().toISOString(),
      }));
    }
  },
};
```

1. Buat penangan error terpusat:

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode }
    );
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  return Response.json(
    { error: { message: 'Internal Server Error' } },
    { status: 500 }
  );
}
```

### Langkah 7: Bundle untuk Produksi

1. Build aplikasi untuk runtime Bun:

```bash
bun build ./src/index.ts --outdir ./dist --target bun --minify --sourcemap
```

1. Buat script entry produksi:

```bash
#!/bin/bash
# scripts/start.sh
NODE_ENV=production bun run ./dist/index.js
```

1. Untuk deployment berbasis Docker, buat Dockerfile multi-stage:

```dockerfile
# Dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build ./src/index.ts --outdir ./dist --target bun --minify --sourcemap

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["bun", "run", "./dist/index.js"]
```

Poin-poin penting tentang setup Docker:
- Image `oven/bun:1-slim` hanya sekitar 120 MB, secara signifikan lebih kecil daripada image berbasis Node.js.
- Gunakan `--frozen-lockfile` dalam build CI untuk memastikan instalasi yang reprodusibel.
- Output yang dikompilasi di `./dist` adalah bundle JavaScript mandiri yang siap untuk runtime Bun.

### Langkah 8: Siapkan CI/CD dengan Konfigurasi Spesifik Lingkungan

1. Buat file ekosistem spesifik lingkungan untuk deployment:

```json
// ecosystem.production.json
{
  "name": "my-bun-app",
  "script": "./dist/index.js",
  "instances": "max",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3000"
  }
}
```

1. Tambahkan endpoint health check dan readiness:

```typescript
// src/routes/health.ts
import { getDatabase } from '../db/database';

export async function healthCheck(): Promise<Response> {
  try {
    const db = getDatabase();
    db.query('SELECT 1').get();
    return Response.json({
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    return Response.json(
      { status: 'unhealthy', error: 'koneksi database gagal' },
      { status: 503 }
    );
  }
}
```

### Langkah 9: Profiling Performa dan Benchmark

1. Gunakan `bun:jsc` untuk introspeksi runtime:

```typescript
// scripts/profile.ts
import { heapStats, memoryUsage } from 'bun:jsc';

console.log('Heap stats:', heapStats());
console.log('Memory usage:', memoryUsage());
```

1. Benchmark route handler:

```typescript
// tests/benchmarks/benchmark.ts
import { bench, run } from 'bun:test';

// Jalankan dengan: bun test tests/benchmarks/benchmark.ts

bench('Serialisasi JSON', () => {
  JSON.stringify({ hello: 'world', numbers: [1, 2, 3] });
});

bench('Hash SHA-256', async () => {
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hello'));
});

await run();
```

### Langkah 10: Migrasi dari Node.js ke Bun

1. Verifikasi bahwa dependensi proyek Anda kompatibel dengan Bun:

```bash
bun add express
bun add -d typescript @types/bun
```

1. Ganti pola spesifik Node.js:

| Node.js Pattern | Bun Equivalent |
|----------------|----------------|
| `fs.readFileSync(path, 'utf-8')` | `await Bun.file(path).text()` |
| `fs.writeFileSync(path, data)` | `await Bun.write(path, data)` |
| `crypto.randomBytes(16).toString('hex')` | `crypto.randomUUID()` |
| `child_process.exec('ls -la')` | `Bun.$`\`ls -la\` |
| `path.join(__dirname, 'file.txt')` | `import.meta.dir + '/file.txt'` |
| `process.env.PORT` | `Bun.env.PORT` |
| `console.log()` / `util.inspect()` | `console.log()` sama tapi gunakan `Bun.inspect()` untuk objek dalam |
| `server.close()` | `server.stop()` (dari `Bun.serve()`) |

1. Perbarui script `start` di `package.json`:

```json
{
  "scripts": {
    "start": "bun run src/index.ts",
    "dev": "bun --watch src/index.ts",
    "test": "bun test",
    "build": "bun build ./src/index.ts --outdir ./dist --target bun --minify"
  }
}
```

## Kesimpulan

Mengadopsi Bun untuk aplikasi produksi memberikan manfaat performa yang signifikan melalui startup yang lebih cepat, penggunaan memori yang lebih rendah, dan toolchain yang efisien. Pola-pola yang dibahas dalam panduan ini — scaffolding proyek terstruktur, validasi lingkungan, server HTTP modular, akses database type-safe dengan `bun:sqlite`, pengujian komprehensif dengan `bun test`, logging terstruktur, dan deployment berbasis Docker — menyediakan fondasi yang kokoh untuk membangun dan mengoperasikan aplikasi Bun dalam skala besar.

Mulailah dengan menyiapkan proyek baru menggunakan `bun init` dan struktur proyek yang diuraikan di Langkah 1, kemudian secara bertahap terapkan praktik produksi seiring pertumbuhan aplikasi Anda. Dukungan TypeScript native Bun, bundler bawaan, dan test runner yang kompatibel dengan Jest berarti lebih sedikit dependensi, konfigurasi yang lebih sederhana, dan siklus pengembangan yang lebih cepat dibandingkan alur kerja Node.js tradisional.

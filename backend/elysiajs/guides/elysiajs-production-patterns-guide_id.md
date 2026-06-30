---
title: "Panduan Pola Produksi Elysia.js"
description: "Panduan komprehensif tentang pola aplikasi Elysia.js tingkat produksi termasuk arsitektur plugin, komposisi middleware, penanganan error, validasi, dan strategi deployment."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Pola Produksi Elysia.js

## Pendahuluan

Elysia.js adalah framework web berkinerja tinggi yang dibangun di atas Bun, dirancang untuk pengembangan berbasis TypeScript dengan type safety menyeluruh. Sistem plugin, lifecycle hooks, dan validasi berbasis TypeBox menjadikannya pilihan tepat untuk aplikasi produksi. Panduan ini mencakup pola-pola yang telah teruji untuk membangun API Elysia yang mudah dipelihara, aman, dan berkinerja tinggi dalam skala besar.

Tidak seperti aplikasi Express.js tradisional yang sangat bergantung pada rantai middleware dan objek request yang mutable, Elysia memperkenalkan arsitektur plugin terstruktur, context bertipe dengan `decorate()` dan `derive()`, serta validasi runtime melalui skema TypeBox. Fitur-fitur ini menggeser paradigma pengembangan dari "sekadar router" menjadi framework aplikasi lengkap dengan pembuatan OpenAPI bawaan.

## Praktik Terbaik

### Arsitektur Modular Berbasis Plugin

Atur fitur sebagai plugin terisolasi dengan rute, hook, dan state-nya sendiri. Setiap plugin merangkum bounded context, membuat codebase mudah diuji, dapat di-deploy secara independen, dan mudah dipahami.

```typescript
// Setiap plugin adalah unit yang mandiri
import { Elysia } from 'elysia'

export const healthPlugin = (app: Elysia) =>
  app.get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
  }))
```

**Aturan utama**:
- Gunakan `Elysia({ prefix: '/api/v1/users' })` untuk pembatasan rute dalam plugin.
- Jangan pernah berbagi state mutable antar plugin — gunakan `decorate()` untuk resource bersama.
- Jaga setiap file plugin di bawah 200 baris; pecah plugin besar menjadi sub-plugin.
- Ekspor tipe `App` dari `src/index.ts` untuk pembuatan klien Eden Treaty.

### Validasi TypeBox untuk Keamanan Runtime

Definisikan semua skema input dengan `@sinclair/typebox` dan berikan ke guard `body()`, `query()`, `params()`, atau `headers()`. Ini menghasilkan skema OpenAPI secara otomatis dan menyediakan validasi runtime yang ketat tanpa pemeliharaan skema manual.

```typescript
import { t } from 'elysia'

export const PaginationSchema = t.Object({
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
  sort: t.Optional(t.String())
})
```

**Manfaat**: Skema TypeBox berfungsi sebagai sumber kebenaran tunggal — memvalidasi input, memberi tipe parameter handler, dan memberi makan dokumentasi OpenAPI/Swagger — menghilangkan duplikasi DTO yang umum terjadi di aplikasi Express.js.

### Otorisasi Berbasis Guard

Implementasikan fungsi guard yang dapat digunakan kembali untuk autentikasi dan otorisasi menggunakan metode grup `.guard()`. Ini menerapkan middleware ke grup rute tanpa menduplikasi logika.

```typescript
app.group('/admin', (app) =>
  app
    .guard((app) =>
      app
        .use(adminGuard)
        .get('/dashboard', dashboardHandler)
        .get('/metrics', metricsHandler)
    )
)
```

**Pola**: Tempatkan guard otorisasi sedekat mungkin dengan rute. Hindari guard global yang berlaku untuk setiap rute — tidak semua endpoint memerlukan autentikasi.

### Penanganan Error Terpusat dengan Error Bertipe

Buat penangan error global dengan `.onError()` yang menangkap semua error, memetakannya ke respons HTTP terstruktur, dan mencatatnya dengan tepat. Gunakan kelas `AppError` bertipe untuk alur error yang dapat diprediksi.

```typescript
app.onError(({ error, code, set }) => {
  if (code === 'NOT_FOUND') {
    set.status = 404
    return { success: false, message: 'Route tidak ditemukan' }
  }
  // Respons terstruktur untuk semua tipe error
  set.status = 500
  return { success: false, message: 'Terjadi kesalahan internal server' }
})
```

### Disiplin Lifecycle Hook

Gunakan lifecycle hooks Elysia secara konsisten untuk concern lintas potong:

- `onBeforeHandle` — pencatatan request, rate limiting, persiapan validasi request
- `onAfterHandle` — transformasi respons, audit trail
- `onResponse` — pengumpulan metrik, pelacakan waktu respons
- `onError` — respons error terstruktur, layanan pelaporan error

```typescript
app.onBeforeHandle(({ request }) => {
  console.log(`→ ${request.method} ${request.url}`)
})

app.onResponse(({ response, set }) => {
  set.headers['X-Response-Time'] = `${performance.now()}ms`
})
```

### Eden Treaty untuk Klien Type-Safe

Hasilkan klien type-safe dengan Eden Treaty untuk menghilangkan pemeliharaan klien API secara manual. Ketika skema server berubah, tipe klien diperbarui secara otomatis.

```typescript
// server/src/index.ts
const app = new Elysia().use(usersPlugin).listen(3000)
export type App = typeof app

// client/src/api.ts
import { edenTreaty } from '@elysiajs/eden'
import type { App } from '../server/src'

const api = edenTreaty<App>('http://localhost:3000')
const { data, error } = await api.users.index.get({ query: { page: 1 } })
// data memiliki tipe yang lengkap!
```

### Dependency Injection Terstruktur

Gunakan `decorate()` untuk menyuntikkan dependensi bersama (koneksi database, cache, konfigurasi) ke dalam konteks Elysia. Ini menjaga handler rute tetap bersih, mudah diuji, dan terpisah dari logika instansiasi.

```typescript
app.decorate('db', pool)
app.decorate('config', env)
app.decorate('cache', redisClient)
```

### Graceful Shutdown

Daftarkan handler sinyal yang menutup koneksi database, menghentikan job latar belakang, dan membuang log sebelum keluar. Ini mencegah korupsi data dan memastikan deployment tanpa downtime.

```typescript
process.on('SIGTERM', async () => {
  await app.stop()
  await pool.end()
  process.exit(0)
})
```

## Langkah Implementasi

### Langkah 1: Membuat Proyek

Buat struktur direktori berbasis fitur dan siapkan entry point utama:

```text
src/
  plugins/
    auth/
      auth.plugin.ts
      auth.guard.ts
    users/
      users.plugin.ts
      users.schema.ts
    health/
      health.plugin.ts
  shared/
    errors/
      app-error.ts
    middleware/
      logger.ts
      error-handler.ts
    config/
      env.ts
  index.ts
```

```bash
bun init
bun add elysia @sinclair/typebox @elysiajs/swagger @elysiajs/cors @elysiajs/eden
```

Buat composer aplikasi:

```typescript
// src/index.ts
import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { authPlugin } from './plugins/auth/auth.plugin'
import { usersPlugin } from './plugins/users/users.plugin'
import { healthPlugin } from './plugins/health/health.plugin'
import { errorHandler } from './shared/middleware/error-handler'
import { logger } from './shared/middleware/logger'

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .use(logger)
  .use(errorHandler)
  .use(healthPlugin)
  .use(authPlugin)
  .use(usersPlugin)
  .listen(3000)

console.log(`🦊 Elysia berjalan di http://localhost:${app.server?.port}`)

export type App = typeof app
```

### Langkah 2: Membuat Guard dan Middleware yang Dapat Digunakan Kembali

Guard autentikasi adalah concern lintas potong yang dibutuhkan setiap plugin yang dilindungi. Implementasikan sebagai fungsi yang dapat dikomposisi:

```typescript
// src/plugins/auth/auth.guard.ts
import { Elysia, t } from 'elysia'

export const authGuard = (app: Elysia) =>
  app
    .derive({ as: 'global' }, async ({ request, error }) => {
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return error(401, {
          success: false,
          message: 'Header otorisasi tidak ada atau tidak valid'
        })
      }

      const token = authHeader.slice(7)
      const user = await validateToken(token)
      if (!user) {
        return error(401, {
          success: false,
          message: 'Token tidak valid atau kedaluwarsa'
        })
      }

      return { user }
    })
```

**Pola komposisi guard**: Gabungkan beberapa guard dengan merantai panggilan `.use()` di dalam grup `.guard()`. Misalnya, gabungkan `authGuard` dengan `roleGuard('admin')` untuk rute khusus admin:

```typescript
app.guard((app) =>
  app
    .use(authGuard)
    .use(adminGuard)
    .get('/admin/users', listAllUsers)
)
```

### Langkah 3: Mendefinisikan Skema Input dengan TypeBox

Sentralisasikan semua skema request untuk digunakan kembali di guard, handler, dan kode klien:

```typescript
// src/plugins/users/users.schema.ts
import { t } from 'elysia'

export const CreateUserSchema = t.Object({
  name: t.String({ minLength: 2, maxLength: 100 }),
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8, maxLength: 128 }),
  role: t.Optional(t.Union([t.Literal('admin'), t.Literal('user')]))
})

export const UpdateUserSchema = t.Partial(CreateUserSchema)

export const UserParamsSchema = t.Object({
  id: t.String({ format: 'uuid' })
})
```

**Strategi penggunaan kembali skema**: Ekspor skema dari lokasi terpusat dan bagikan antara paket server dan klien menggunakan struktur monorepo. Ini memastikan aturan validasi tidak pernah diduplikasi atau tidak sinkron.

### Langkah 4: Membangun Plugin Fitur

Plugin fitur menggabungkan guard, skema, dan lifecycle hooks menjadi unit yang kohesif:

```typescript
// src/plugins/users/users.plugin.ts
import { Elysia, t } from 'elysia'
import { authGuard } from '../auth/auth.guard'
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserParamsSchema
} from './users.schema'

export const usersPlugin = (app: Elysia) =>
  app.group('/users', (app) =>
    app
      // Publik: registrasi pengguna
      .post(
        '/',
        async ({ body, error }) => {
          const user = await createUser(body)
          return { success: true, data: user }
        },
        { body: CreateUserSchema }
      )
      // Dilindungi: semua operasi pengguna lainnya
      .guard((app) =>
        app
          .use(authGuard)
          .onBeforeHandle(({ request }) => {
            console.log(`[USERS] ${request.method} ${request.url}`)
          })
          .get('/', async ({ query }) => {
            const users = await listUsers(query)
            return { success: true, data: users }
          })
          .get('/:id', async ({ params: { id }, error }) => {
            const found = await findUserById(id)
            if (!found) {
              return error(404, { success: false, message: 'Pengguna tidak ditemukan' })
            }
            return { success: true, data: found }
          })
          .put('/:id', async ({ params: { id }, body }) => {
            const updated = await updateUser(id, body)
            return { success: true, data: updated }
          })
          .delete('/:id', async ({ params: { id } }) => {
            await deleteUser(id)
            return { success: true, message: 'Pengguna dihapus' }
          })
      )
  )
```

**Pola komunikasi plugin**: Ketika plugin perlu berkomunikasi, gunakan `decorate()` untuk mengekspos layanan bersama daripada mengimpor internal plugin secara langsung. Misalnya, plugin audit dapat menghias konteks dengan `audit.log()`, dan plugin lain mengonsumsinya melalui konteks.

### Langkah 5: Implementasi Penanganan Error Terpusat

Sistem error bertipe memungkinkan respons error yang konsisten dan dapat diprediksi:

```typescript
// src/shared/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} tidak ditemukan`)
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(400, 'VALIDATION_ERROR', 'Data request tidak valid', details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Tidak terotorisasi') {
    super(401, 'UNAUTHORIZED', message)
  }
}
```

Hubungkan penangan error global untuk menangkap dan memformat semua error:

```typescript
// src/shared/middleware/error-handler.ts
import { Elysia } from 'elysia'
import { AppError } from '../errors/app-error'

export const errorHandler = (app: Elysia) =>
  app.onError(({ error, code, set }) => {
    // Error aplikasi yang dikenal (bertipe)
    if (error instanceof AppError) {
      set.status = error.statusCode
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null
        }
      }
    }

    // Error validasi dari TypeBox
    if (code === 'VALIDATION') {
      set.status = 400
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validasi request gagal',
          details: error.all ?? null
        }
      }
    }

    // Error tidak dikenal — catat dan kembalikan respons generik
    console.error('[TIDAK TERATASI]', error)
    set.status = 500
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan yang tidak terduga'
      }
    }
  })
```

### Langkah 6: Menghubungkan Dependensi dengan Decorate

Gunakan `decorate()` untuk menyediakan resource bersama di seluruh aplikasi:

```typescript
// src/index.ts — diperluas dengan dependency injection
import { Elysia } from 'elysia'
import { db } from './shared/db'
import { config } from './shared/config/env'
import { cache } from './shared/cache'

const app = new Elysia()
  .decorate('db', db)
  .decorate('config', config)
  .decorate('cache', cache)
  .use(errorHandler)
  .use(authPlugin)
  .use(usersPlugin)
  .listen(3000)
```

Handler rute mengakses ini melalui objek konteks dengan inferensi tipe penuh:

```typescript
app.get('/stats', async ({ db, cache }) => {
  const stats = await cache.getOrFetch('app:stats', () =>
    db.query('SELECT count(*) as total FROM users')
  )
  return { success: true, data: stats }
})
```

### Langkah 7: Graceful Shutdown dan Deployment Produksi

Implementasikan graceful shutdown untuk memastikan deployment tanpa downtime dan integritas data:

```typescript
// src/index.ts — graceful shutdown
async function shutdown(signal: string) {
  console.log(`[SHUTDOWN] Menerima ${signal}, mematikan secara bertahap...`)
  await app.stop()
  await db.close()
  await cache.disconnect()
  console.log('[SHUTDOWN] Semua koneksi ditutup. Selesai.')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
```

**Opsi deployment produksi**:

```bash
# Jalankan langsung dengan Bun (direkomendasikan)
bun run --env-file=.env.production src/index.ts

# Kompilasi ke binary mandiri
bun build --compile --target=bun-linux-x64-modern src/index.ts --outfile=elysia-api

# Jalankan dengan Docker
docker run -p 3000:3000 -e DATABASE_URL=... oven/bun ./elysia-api
```

**Tips tuning performa**:
- Aktifkan kompresi dengan `@elysiajs/compression` untuk respons API.
- Gunakan connection pooling untuk koneksi database dan gunakan kembali melalui `decorate()`.
- Atur `maxBodySize` di konfigurasi Elysia untuk mencegah serangan payload besar.
- Konfigurasikan CORS secara eksplisit dengan origin yang diizinkan daripada menggunakan wildcard.

### Langkah 8: Pengujian dengan Bun Test Runner

Tulis pengujian integrasi yang terfokus untuk plugin dan penangan error:

```typescript
// tests/plugins/users.test.ts
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { usersPlugin } from '../../src/plugins/users/users.plugin'

function createTestApp() {
  return new Elysia().use(usersPlugin)
}

describe('Plugin Users', () => {
  it('POST /users — membuat pengguna dengan data valid', async () => {
    const app = createTestApp()
    const response = await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'securePass123'
        })
      })
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('POST /users — menolak email tidak valid', async () => {
    const app = createTestApp()
    const response = await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John',
          email: 'bukan-email',
          password: 'pendek'
        })
      })
    )
    expect(response.status).toBe(400)
  })

  it('GET /users/:id — mengembalikan 404 untuk pengguna yang tidak ada', async () => {
    const app = createTestApp()
    const response = await app.handle(
      new Request('http://localhost/users/id-tidak-ada')
    )
    expect(response.status).toBe(404)
  })
})
```

Jalankan rangkaian pengujian:

```bash
bun test                    # Pengembangan — mode watch
bun test --reporter=github  # CI — anotasi GitHub Actions
bun test --coverage         # Laporan cakupan
```

**Pola isolasi pengujian**: Buat instance `Elysia` baru per kasus pengujian menggunakan fungsi pabrik. Ini mencegah kebocoran state antar pengujian dan memastikan hasil yang deterministik.

---
title: "Cheat Sheet Validasi dan Serialisasi Elysia.js"
description: "Referensi cepat validasi skema Elysia.js dengan TypeBox dan validator Standard Schema — mencakup skema inline body/query/params/headers, koersi dan nilai default, pesan error kustom, penanganan error validasi, dan serialisasi respons."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Validasi dan Serialisasi Elysia.js

## Tabel Referensi Cepat

| Aksi | Sintaks | Deskripsi |
|------|---------|-----------|
| Validasi body request | `body: t.Object({ ... })` | Menolak request yang body JSON-nya gagal validasi skema dengan HTTP 422 |
| Validasi query string | `query: t.Object({ page: t.Numeric() })` | Melakukan koersi dan memvalidasi `?page=2` |
| Validasi parameter path | `params: t.Object({ id: t.Numeric() })` | Memvalidasi segmen seperti `/user/:id` |
| Validasi header | `headers: t.Object({ authorization: t.String() })` | Memvalidasi header request |
| Validasi cookie | `cookie: t.Object({ session: t.String() })` | Memvalidasi nilai cookie |
| Membuat field opsional | `t.Optional(t.String())` | Mengizinkan key tidak ada |
| Memberikan nilai default | `t.String({ default: 'guest' })` | Mengisi nilai saat key tidak ada |
| Koersi string menjadi angka | `t.Numeric()` | Mengubah `"42"` dari query/params menjadi `42` |
| Menolak key yang tidak dikenal | `t.Object({ ... }, { additionalProperties: false })` | Memblokir field tambahan untuk kebersihan input yang ketat |
| Pesan error kustom | `t.Number({ error: 'harus berupa angka' })` | Mengembalikan pesan yang mudah dibaca saat gagal |
| Mendaftar semua kegagalan | `error.all` | Array berisi `{ path, summary, message, value }` |
| Validasi output handler | `response: t.Object({ ... })` | Melakukan serialisasi dan validasi body respons |
| Skema respons per status | `response: { 200: Ok, 404: Err }` | Memberi tipe dan memvalidasi setiap status HTTP secara terpisah |
| Menggunakan Zod atau validator lain | `body: z.object({ ... })` | Validator Standard Schema apa pun langsung berfungsi |

## Perintah Umum

### Setup Proyek dan Dependensi

```bash
# Membuat proyek Bun baru (Elysia berjalan di atas Bun)
bun init -y

# Memasang Elysia — TypeBox (helper `t`) sudah disertakan
bun add elysia

# Opsional: validator Standard Schema berfungsi tanpa plugin
bun add zod
bun add valibot
```

### Menjalankan dan Menguji

```bash
# Menjalankan server API
bun run src/index.ts

# Mode pengembangan dengan restart otomatis saat file berubah
bun run --watch src/index.ts

# Menjalankan rangkaian tes dengan test runner Bun
bun test
```

### Menguji Perilaku Validasi

```bash
# POST body yang melanggar skema — harapkan HTTP 422
curl -s -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{"name":"Reinvy"}'

# Parameter path yang gagal t.Numeric() — harapkan HTTP 422
curl -s http://localhost:3000/user/not-a-number

# Payload valid — harapkan HTTP 200
curl -s -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{"name":"Reinvy","age":30}'
```

## Potongan Kode

### Validasi Inline untuk Body, Query, Params, dan Headers

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .post(
    '/users/:id',
    ({ body, params, query, headers }) => {
      return { body, params, query, headers }
    },
    {
      // Skema body JSON — dijalankan sebelum handler
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 80 }),
        age: t.Optional(t.Number({ minimum: 0, maximum: 120 })),
        tags: t.Array(t.String({ maxLength: 20 }))
      }),
      // Parameter path
      params: t.Object({
        id: t.Numeric() // "42" -> 42
      }),
      // Query string
      query: t.Object({
        page: t.Optional(t.Numeric({ default: 1 })),
        limit: t.Optional(t.Numeric({ default: 20 }))
      }),
      // Header
      headers: t.Object({
        authorization: t.String({ minLength: 20 })
      })
    }
  )
  .listen(3000)
```

Skema apa pun yang gagal menghasilkan `ValidationError` dengan `code: 'VALIDATION'` dan status HTTP 422 sebelum handler dieksekusi.

### Blok Penyusun Skema TypeBox

```typescript
import { t } from 'elysia'

// Union — nilai harus cocok dengan salah satu bentuk
const IdOrSlug = t.Union([t.Numeric(), t.String({ minLength: 3 })])

// Intersection — menggabungkan dua skema objek
const Timestamped = t.Intersect([
  t.Object({ createdAt: t.String({ format: 'date-time' }) }),
  t.Object({ updatedAt: t.String({ format: 'date-time' }) })
])

// Array dengan aturan elemen dan batas ukuran
const Tags = t.Array(t.String({ minLength: 2, maxLength: 16 }), {
  maxItems: 10
})

// Record — key arbitrer dengan skema nilai
const Metadata = t.Record(
  t.String(),
  t.Union([t.String(), t.Number(), t.Boolean()])
)

// Union literal untuk himpunan nilai yang diizinkan
const Role = t.Union([
  t.Literal('admin'),
  t.Literal('member'),
  t.Literal('guest')
])

// Nullable membungkus nilai yang juga boleh bernilai null
const Nickname = t.Nullable(t.String())

// Skema rekursif untuk data berbentuk pohon
const CategoryNode = t.Recursive((Self) =>
  t.Object({
    name: t.String(),
    children: t.Array(Self)
  })
)
```

### Koersi, Nilai Default, dan Transformasi

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .get(
    '/search',
    ({ query }) => query,
    {
      query: t.Object({
        // Koersi "3" -> 3 saat membaca query string
        page: t.Numeric({ default: 1 }),
        q: t.String({ default: '' })
      })
    }
  )
  .post(
    '/events',
    ({ body }) => body,
    {
      body: t.Object({
        // Default mengisi nilai saat key tidak ada
        channel: t.String({ default: 'general' }),
        // Transform: mendekode input mentah menjadi nilai runtime
        // yang lebih kaya, lalu mengenkode kembali untuk serialisasi
        timestamp: t.Transform(
          t.String({ format: 'date-time' }),
          (value) => new Date(value),     // decode: input -> runtime
          (value) => value.toISOString()  // encode: runtime -> output
        )
      })
    }
  )
  .listen(3000)
```

`t.Numeric()` adalah cara idiomatis untuk melakukan koersi nilai query dan path: string `"42"` tiba di handler sebagai angka `42`, sehingga tipe TypeScript Anda selalu cocok dengan nilai runtime.

### Pesan Error Kustom dengan validationDetail

```typescript
import { Elysia, t, validationDetail } from 'elysia'

const app = new Elysia()
  .post(
    '/login',
    ({ body }) => body,
    {
      body: t.Object({
        // Pesan kustom statis untuk field ini
        email: t.String({ format: 'email', error: 'email tidak valid' }),
        password: t.String({
          minLength: 8,
          error: 'password minimal 8 karakter'
        })
      })
    }
  )
  // Mode ketat: menolak payload yang membawa key tak dikenal
  .post(
    '/register',
    ({ body }) => body,
    {
      body: t.Object(
        {
          username: t.String({ minLength: 3 }),
          role: t.Union([t.Literal('admin'), t.Literal('member')])
        },
        { additionalProperties: false }
      )
    }
  )
  // validationDetail menghasilkan objek detail yang sesuai OpenAPI
  .post(
    '/account',
    ({ body }) => body,
    {
      body: t.Object({
        username: t.String({
          minLength: 3,
          error: validationDetail('username terlalu pendek')
        })
      })
    }
  )
  .listen(3000)
```

Properti `error` pada skema apa pun menerima string statis atau objek `validationDetail(...)`. Properti ini juga dapat berupa fungsi untuk pesan yang dihitung secara terprogram.

### Penanganan Error Validasi Global dengan onError

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .onError(({ code, error, set, path }) => {
    // Error non-validasi diteruskan ke respons generik
    if (code !== 'VALIDATION') {
      set.status = 500
      return { success: false, message: 'Terjadi kesalahan internal' }
    }

    set.status = 422
    return {
      success: false,
      // error.all mendaftar setiap field yang gagal
      fields: error.all.map((item) => ({
        path: item.path,
        message: item.summary,
        value: item.value
      })),
      path
    }
  })
  .post(
    '/users',
    ({ body }) => body,
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: 'email' }),
        age: t.Number({ minimum: 18 })
      })
    }
  )
  .listen(3000)
```

Ketika `code` yang dipersempit adalah `'VALIDATION'`, `error` memiliki tipe `ValidationError`. Gunakan `error.type` untuk mengetahui bagian mana yang gagal (`'body'`, `'query'`, `'params'`, `'headers'`, atau `'cookie'`) dan `error.all` untuk mendaftar setiap field yang bermasalah. Untuk produksi, hindari menggemakan detail validasi mentah; kembalikan hanya ringkasan yang telah dipetakan.

| Kode error | Status default | Arti |
|------------|----------------|------|
| VALIDATION | 422 | Request gagal validasi skema |
| PARSE | 400 | Body request tidak dapat diurai |
| NOT_FOUND | 404 | Tidak ada route yang cocok dengan path request |
| INVALID_COOKIE_SIGNATURE | 400 | Pemeriksaan tanda tangan cookie gagal |
| INTERNAL_SERVER_ERROR | 500 | Error tak tertangani di dalam handler |
| UNKNOWN | 500 | Error tak terdaftar atau tak dikenal |

### Serialisasi Respons dan Skema Respons per Status

```typescript
import { Elysia, t } from 'elysia'

const Ok = t.Object({
  id: t.Numeric(),
  name: t.String(),
  joinedAt: t.String({ format: 'date-time' })
})

const NotFound = t.Object({
  error: t.Literal('NOT_FOUND'),
  message: t.String()
})

const app = new Elysia()
  .get(
    '/users/:id',
    ({ params, store }) => {
      const user = store.users[params.id]
      if (!user) {
        return { error: 'NOT_FOUND', message: `tidak ada user dengan id ${params.id}` }
      }
      return {
        id: params.id,
        name: user.name,
        joinedAt: user.joinedAt.toISOString()
      }
    },
    {
      params: t.Object({ id: t.Numeric() }),
      // Skema respons per status: output handler divalidasi
      // terhadap skema untuk status yang dikembalikannya
      response: {
        200: Ok,
        404: NotFound
      }
    }
  )
  .state('users', {
    1: { name: 'Reinvy', joinedAt: new Date('2026-01-15T08:00:00Z') }
  } as Record<number, { name: string; joinedAt: Date }>)
  .listen(3000)
```

Mendeklarasikan skema `response` memberi tiga manfaat sekaligus: validasi runtime output handler, serialisasi bentuk respons, dan dokumentasi OpenAPI yang dihasilkan dari satu sumber kebenaran yang sama.

### Standard Schema: Zod, Valibot, dan Validator Lainnya

```typescript
import { Elysia, t } from 'elysia'
import { z } from 'zod'
import * as v from 'valibot'

const app = new Elysia()
  .get(
    '/id/:id',
    ({ params, query }) => {
      return { id: params.id, name: query.name }
    },
    {
      // Skema Zod — langsung berfungsi melalui dukungan Standard Schema
      params: z.object({
        id: z.coerce.number()
      }),
      query: v.object({
        name: v.literal('Lilith')
      })
    }
  )
  .post(
    '/report',
    ({ body }) => body,
    {
      // Skema Valibot
      body: v.object({
        reason: v.pipe(v.string(), v.minLength(5)),
        urgent: v.boolean()
      })
    }
  )
  .get(
    '/dashboard',
    ({ query }) => query,
    {
      // TypeBox tetap kelas satu di samping validator Standard Schema
      query: t.Object({
        page: t.Numeric({ default: 1 }),
        limit: t.Numeric({ default: 50 })
      })
    }
  )
  .listen(3000)
```

Elysia mengimplementasikan Standard Schema, sehingga Zod, Valibot, ArkType, Effect Schema, Yup, Joi, dan TypeBox dapat dicampur dengan bebas — bahkan pada bagian berbeda dari route yang sama. `ValidationError.all` melaporkan kegagalan secara seragam apa pun validator yang menghasilkannya.

### Mendaftarkan Kode Error Bertipe

```typescript
import { Elysia, t } from 'elysia'

class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

const app = new Elysia()
  // Mendaftarkan kelas error kustom untuk narrowing kode bertipe
  .error({ QuotaExceededError })
  .onError(({ code, error, set }) => {
    switch (code) {
      case 'QuotaExceededError':
        set.status = 429
        return { success: false, message: error.message }
      case 'VALIDATION':
        set.status = 422
        return { success: false, fields: error.all }
      default:
        set.status = 500
        return { success: false, message: 'Terjadi kesalahan internal' }
    }
  })
  .post(
    '/upload',
    ({ body }) => {
      if (body.projections > 5) {
        throw new QuotaExceededError('batas proyeksi tercapai')
      }
      return { success: true }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        projections: t.Numeric({ minimum: 0 })
      }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        422: t.Object({ success: t.Boolean(), fields: t.Any() }),
        429: t.Object({ success: t.Boolean(), message: t.String() })
      }
    }
  )
  .listen(3000)
```

Menggabungkan kelas error terdaftar dengan skema respons per status menjaga permukaan error Anda sepenuhnya bertipe dari ujung ke ujung — klien menerima body error yang terdokumentasi dan tervalidasi untuk setiap mode kegagalan.

---
title: "Membangun REST API dengan ElysiaJS"
description: "Tutorial langkah demi langkah untuk membangun REST API berperforma tinggi menggunakan ElysiaJS, framework web native Bun dengan type safety menyeluruh."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun REST API dengan ElysiaJS

## Ringkasan

Tutorial ini memandu Anda dalam membangun REST API lengkap menggunakan **ElysiaJS**, sebuah framework web yang cepat dan type-safe yang dibuat khusus untuk runtime Bun. Anda akan mempelajari cara menyiapkan proyek Elysia, mendefinisikan route dengan validasi, mengintegrasikan middleware, menangani error, terhubung ke database, dan menyusun API dunia nyata. Pada akhirnya, Anda akan memiliki API manajemen tugas yang berfungsi penuh.

## Target Audiens

- Pengembang backend yang akrab dengan JavaScript atau TypeScript.
- Pengembang yang penasaran dengan Bun dan framework web modern berperforma tinggi.
- Level menengah: nyaman dengan prinsip REST dan TypeScript dasar.

## Prasyarat

- Pengetahuan dasar JavaScript/TypeScript dan konsep HTTP.
- [Bun](https://bun.sh) terinstal di sistem Anda (`curl -fsSL https://bun.sh/install | bash`).
- Editor teks atau IDE (VS Code direkomendasikan).
- `curl` atau klien API apa pun (Postman, Thunder Client) untuk menguji endpoint.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membuat proyek ElysiaJS baru menggunakan CLI resmi.
- Mendefinisikan route yang diketik (typed routes) dengan validasi request menggunakan sistem skema Elysia.
- Mengimplementasikan middleware untuk logging, autentikasi, dan penanganan error.
- Menyusun API modular menggunakan sistem plugin Elysia.
- Mengintegrasikan database (SQLite via driver bawaan Bun) untuk persistensi data.
- Menerapkan praktik terbaik untuk desain API yang siap produksi.

## Konteks dan Motivasi

Framework Node.js tradisional seperti Express.js telah mendukung pengembangan backend selama lebih dari satu dekade. Namun, mereka membawa beban arsitektur dari era CommonJS dan tidak memiliki integrasi TypeScript kelas satu. **ElysiaJS** memecahkan masalah ini dengan ditulis dari awal untuk **Bun** — runtime JavaScript yang menggabungkan transpiler, manajer paket, dan API native ke dalam satu biner.

Keunggulan utama Elysia:
- **Integrasi TypeBox**: Validasi request/response otomatis dengan tipe TypeScript yang diinferensi — tanpa deklarasi skema terpisah.
- **Performa ekstrem**: Tolok ukur menunjukkan Elysia mengungguli Express dan Fastify di Bun.
- **Ekosistem plugin**: Plugin modular dan dapat dikomposisi yang meniru pola middleware Express namun dengan type safety.
- **Zero dependencies**: Elysia sendiri bebas dependensi; type safety berasal dari TypeBox sebagai peer dependency opsional.

Untuk tim yang membangun API baru di tahun 2025+, ElysiaJS mewakili perubahan paradigma: **kecepatan luar biasa tanpa mengorbankan pengalaman pengembang**.

## Konten Inti

### Menyiapkan Proyek

Buat proyek Elysia baru menggunakan alat scaffolding resmi:

```bash
bun create elysia task-api
cd task-api
```

Ini menghasilkan proyek minimal dengan TypeScript terkonfigurasi. Titik masuknya adalah `src/index.ts`. Instal plugin validasi dan CORS:

```bash
bun add @elysiajs/cors @elysiajs/swagger
```

### Anatomi Aplikasi Elysia

Buka `src/index.ts`. Blok bangunan utamanya adalah instance `Elysia`:

```typescript
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .get('/', () => 'Halo Elysia')
  .listen(3000)

console.log(`🦊 Elysia berjalan di ${app.server?.hostname}:${app.server?.port}`)
```

Jalankan dengan:

```bash
bun run dev
```

Kunjungi `http://localhost:3000/swagger` untuk melihat Swagger UI yang dibuat otomatis.

### Mendefinisikan Route dengan Validasi

Validasi skema Elysia menggunakan **TypeBox** — sebuah library yang mendefinisikan JSON Schema melalui tipe TypeScript. Skema ini kemudian digunakan untuk memvalidasi body request, parameter query, dan parameter path, sekaligus menginferensi tipe TypeScript yang benar.

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .post('/tasks', ({ body }) => {
    return { id: crypto.randomUUID(), ...body }
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      completed: t.Optional(t.Boolean({ default: false }))
    })
  })
  .listen(3000)
```

`t.Object` secara otomatis:
- Memvalidasi JSON yang masuk terhadap skema.
- Mengembalikan error 422 dengan pesan deskriptif jika validasi gagal.
- Menginferensi tipe TypeScript dari `body` sehingga Anda mendapatkan autocompletion di IDE.

### Parameter Path dan Query String

```typescript
const app = new Elysia()
  .get('/tasks/:id', ({ params: { id } }) => {
    return { id, pesan: `Mengambil tugas ${id}` }
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' })
    })
  })
  .get('/tasks', ({ query: { page, limit } }) => {
    return { page, limit }
  }, {
    query: t.Object({
      page: t.Optional(t.Number({ default: 1 })),
      limit: t.Optional(t.Number({ default: 10 }))
    })
  })
```

### Middleware dan Guard

Middleware Elysia berjalan sebelum handler route Anda. Gunakan `.derive()` untuk menyuntikkan konteks bersama (seperti koneksi database atau pengguna terautentikasi), dan `.onBeforeHandle()` untuk guard.

```typescript
const auth = new Elysia()
  .derive(({ headers }) => {
    const token = headers['authorization']?.replace('Bearer ', '')
    if (!token) throw new Error('Token autentikasi tidak ditemukan')
    return { user: { id: 'user_123', role: 'admin' } }
  })

const app = new Elysia()
  .use(auth)
  .get('/protected', ({ user }) => {
    return { pesan: `Halo ${user.id}` }
  })
```

### Sistem Plugin

Untuk aplikasi produksi, pisahkan route Anda ke dalam plugin — instance Elysia terpisah yang merangkum logika terkait.

```typescript
// tasks.ts
import { Elysia, t } from 'elysia'

const tasks = new Elysia({ prefix: '/tasks' })
  .get('/', () => {
    return { tasks: [] }
  })
  .post('/', ({ body }) => {
    return { id: crypto.randomUUID(), ...body }
  }, {
    body: t.Object({
      title: t.String(),
      description: t.Optional(t.String())
    })
  })
  .get('/:id', ({ params: { id } }) => {
    return { id, title: 'Contoh Tugas' }
  })

// index.ts
import { Elysia } from 'elysia'
import { tasks } from './tasks'

const app = new Elysia()
  .use(tasks)
  .listen(3000)
```

### Integrasi Database dengan Bun SQLite

Bun dilengkapi dengan driver SQLite bawaan. Berikut adalah implementasi CRUD lengkap:

```typescript
import { Database } from 'bun:sqlite'

const db = new Database('tasks.db')

// Inisialisasi tabel
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

const tasks = new Elysia({ prefix: '/tasks' })
  .get('/', () => {
    return db.query('SELECT * FROM tasks ORDER BY created_at DESC').all()
  })
  .post('/', ({ body }: { body: { title: string; description?: string } }) => {
    const id = crypto.randomUUID()
    db.run('INSERT INTO tasks (id, title, description) VALUES (?, ?, ?)', [
      id, body.title, body.description || null
    ])
    return db.query('SELECT * FROM tasks WHERE id = ?').get(id)
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      description: t.Optional(t.String())
    })
  })
  .put('/:id', ({ params, body }: { params: { id: string }; body: any }) => {
    const existing = db.query('SELECT * FROM tasks WHERE id = ?').get(params.id)
    if (!existing) throw new Error('Tugas tidak ditemukan')
    db.run(
      'UPDATE tasks SET title = ?, description = ?, completed = ? WHERE id = ?',
      [body.title ?? existing.title, body.description ?? existing.description, body.completed ?? existing.completed, params.id]
    )
    return db.query('SELECT * FROM tasks WHERE id = ?').get(params.id)
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      completed: t.Optional(t.Boolean())
    })
  })
  .delete('/:id', ({ params }) => {
    const existing = db.query('SELECT * FROM tasks WHERE id = ?').get(params.id)
    if (!existing) throw new Error('Tugas tidak ditemukan')
    db.run('DELETE FROM tasks WHERE id = ?', [params.id])
    return { success: true }
  })
```

### Penanganan Error

Elysia menggunakan lifecycle hook `.onError()` untuk menangkap error secara global:

```typescript
const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422
      return { error: 'Validasi gagal', detail: error.message }
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Sumber daya tidak ditemukan' }
    }
    // Error server umum
    console.error(error)
    set.status = 500
    return { error: 'Terjadi kesalahan internal server' }
  })
```

### Ringkasan Lifecycle

Elysia memproses setiap request melalui pipeline lifecycle:

1. **Request** → hook `onRequest`
2. **Parse** → penguraian body dan validasi skema
3. **Transform** → `onTransform` (modifikasi request sebelum guard)
4. **Before Handle** → `onBeforeHandle` (autentikasi, otorisasi)
5. **Handle** → handler route Anda
6. **After Handle** → `onAfterHandle` (transformasi response)
7. **Error** → `onError` jika ada langkah yang melempar error

## Contoh Kode

### API Tugas Lengkap — `src/index.ts`

```typescript
import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { Database } from 'bun:sqlite'

// ── Setup Database ──
const db = new Database('tasks.db')
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

// ── Plugin ──
const tasks = new Elysia({ prefix: '/api/tasks' })
  .get('/', () => {
    return db.query('SELECT * FROM tasks ORDER BY created_at DESC').all()
  })
  .post('/', ({ body }) => {
    const id = crypto.randomUUID()
    db.run('INSERT INTO tasks (id, title, description) VALUES (?, ?, ?)', [
      id, body.title, body.description || null
    ])
    return db.query('SELECT * FROM tasks WHERE id = ?').get(id)
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      description: t.Optional(t.String())
    })
  })
  .get('/:id', ({ params, error }) => {
    const task = db.query('SELECT * FROM tasks WHERE id = ?').get(params.id)
    if (!task) return error(404, { error: 'Tugas tidak ditemukan' })
    return task
  })
  .put('/:id', ({ params, body, error }) => {
    const existing = db.query('SELECT * FROM tasks WHERE id = ?').get(params.id) as any
    if (!existing) return error(404, { error: 'Tugas tidak ditemukan' })
    db.run(
      'UPDATE tasks SET title = ?, description = ?, completed = ? WHERE id = ?',
      [body.title ?? existing.title, body.description ?? existing.description, body.completed ?? existing.completed, params.id]
    )
    return db.query('SELECT * FROM tasks WHERE id = ?').get(params.id)
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      completed: t.Optional(t.Boolean())
    })
  })
  .delete('/:id', ({ params, error }) => {
    const existing = db.query('SELECT * FROM tasks WHERE id = ?').get(params.id)
    if (!existing) return error(404, { error: 'Tugas tidak ditemukan' })
    db.run('DELETE FROM tasks WHERE id = ?', [params.id])
    return { success: true }
  })

// ── Aplikasi ──
const app = new Elysia()
  .use(cors({ origin: '*' }))
  .use(swagger({ path: '/docs' }))
  .use(tasks)
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422
      return { error: 'Validasi gagal' }
    }
    set.status = 500
    return { error: 'Terjadi kesalahan internal server' }
  })
  .listen(3000)

console.log(`🦊 Elysia berjalan di http://localhost:3000`)
console.log(`📖 Dokumentasi Swagger di http://localhost:3000/docs`)
```

### Pengujian dengan curl

```bash
# Buat tugas baru
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Belajar ElysiaJS","description":"Selesaikan tutorial ini"}'

# Lihat semua tugas
curl http://localhost:3000/api/tasks

# Lihat satu tugas
curl http://localhost:3000/api/tasks/<UUID>

# Perbarui tugas
curl -X PUT http://localhost:3000/api/tasks/<UUID> \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Hapus tugas
curl -X DELETE http://localhost:3000/api/tasks/<UUID>
```

## Insight Penting

- **Type safety otomatis**: Dengan Elysia + TypeBox, skema dan tipe TypeScript Anda selalu sinkron. Perubahan pada skema memperbarui tipe yang diinferensi di mana-mana — tidak perlu lagi deklarasi interface manual.
- **Native Bun adalah keunggulan performa**: Elysia di Bun secara konsisten 2-4x lebih cepat dari Express di Node.js dalam hal throughput dan latensi. Driver `bun:sqlite` juga jauh lebih cepat dari better-sqlite3 di Node.
- **Plugin lebih baik dari middleware**: Model plugin Elysia lebih bersih daripada middleware Express. Setiap plugin memiliki scope, prefix, dan lifecycle sendiri — mencegah masalah umum Express berupa bug urutan middleware.
- **Swagger gratis**: Menambahkan plugin `@elysiajs/swagger` menghasilkan dokumentasi OpenAPI 3.0 secara otomatis dari skema route Anda. Tidak perlu anotasi JSDoc atau file YAML.
- **Eden Treaty untuk kode klien**: Elysia dilengkapi dengan Eden Treaty — klien HTTP type-safe yang menginferensi tipe API Anda dari kode server, memberikan type safety menyeluruh dari backend ke frontend.

## Langkah Berikutnya

- Jelajahi [Eden Treaty](https://elysiajs.com/eden/overview.html) untuk komunikasi klien-server yang type-safe.
- Pelajari dukungan [WebSocket](https://elysiajs.com/patterns/websocket.html) Elysia untuk fitur real-time.
- Integrasikan database produksi seperti PostgreSQL melalui Drizzle ORM dengan Elysia.
- Tambahkan alur autentikasi dengan JWT menggunakan plugin `@elysiajs/jwt`.
- Pelajari dokumentasi Elysia lengkap di [elysiajs.com](https://elysiajs.com).

## Kesimpulan

ElysiaJS mendefinisikan ulang desain framework web dengan memanfaatkan potensi penuh Bun — memberikan performa luar biasa, type safety otomatis, dan arsitektur plugin yang bersih. Dalam tutorial ini, Anda telah membangun REST API lengkap dengan operasi CRUD, validasi request, persistensi database, dan dokumentasi Swagger. Pola yang Anda pelajari — validasi berbasis skema, modularitas berbasis plugin, dan lifecycle hooks — adalah fondasi untuk membangun API kelas produksi dengan Elysia. Seiring ekosistem Bun yang terus matang, Elysia diposisikan untuk menjadi pilihan utama untuk backend TypeScript berperforma tinggi.

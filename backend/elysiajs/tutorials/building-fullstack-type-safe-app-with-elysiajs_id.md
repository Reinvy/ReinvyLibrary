---
title: "Membangun Aplikasi Full-Stack dengan Type Safety End-to-End menggunakan Elysia.js dan Eden Treaty"
description: "Tutorial berbasis proyek untuk membangun aplikasi full-stack dengan Elysia.js dan Eden Treaty, dilengkapi API server bertipe yang digerakkan Bun SQLite dan klien React yang berbagi type safety end-to-end tanpa pembuatan kode sama sekali."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Full-Stack dengan Type Safety End-to-End menggunakan Elysia.js dan Eden Treaty

## Ringkasan

Tutorial ini memandu Anda membangun **Bookmarkly**, aplikasi pengelola bookmark full-stack, menggunakan **Elysia.js** di sisi server dan **React** di sisi klien, terhubung melalui **Eden Treaty** — lapisan type safety end-to-end khas Elysia. Anda akan mendefinisikan seluruh kontrak API sekali menggunakan skema TypeBox, mengeksposnya dari server sebagai satu tipe `App`, dan mengonsumsinya dari peramban dengan klien bertipe penuh yang membutuhkan **nol pembuatan kode**. Pada akhirnya, Anda akan memiliki aplikasi CRUD yang berfungsi dengan pencarian, filter tag, penanganan error bertipe, dan pembaruan UI optimistis — di mana perubahan pada skema server langsung menjadi error kompilasi di klien jika ada yang rusak.

## Target Audiens

- Developer backend yang nyaman dengan TypeScript dan ingin menjelajahi framework berbasis Bun.
- Developer frontend yang ingin menghilangkan API client tulisan tangan dan pergeseran tipe antara server dan klien.
- Developer yang telah menyelesaikan tutorial dasar Elysia.js (seperti Building REST APIs with ElysiaJS) dan ingin mendalami fitur-fitur tingkat-tipe Elysia.
- Tingkat menengah hingga mahir: tutorial ini mengasumsikan Anda memahami konsep REST, generics TypeScript, dan React hooks.

## Prasyarat

- **Bun** terinstal (versi 1.1 atau lebih baru). Verifikasi dengan `bun --version`.
- Pemahaman yang solid tentang TypeScript (tipe, interface, generics, `typeof` dan `infer`).
- Keakraban dasar dengan routing Elysia.js dan sistem skema TypeBox.
- Pengetahuan dasar React (komponen, hooks, form).
- REST client (curl, Postman, atau Hoppscotch) untuk pengujian cepat.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan apa itu Eden Treaty dan bagaimana perbedaannya dengan alat pembuat kode seperti OpenAPI generator atau tRPC.
- Menyusun monorepo workspace Bun dengan paket server dan web yang terpisah.
- Mendefinisikan kontrak API yang dapat dipakai ulang menggunakan skema TypeBox dan mengekstrak tipe statis darinya.
- Membangun API CRUD Elysia.js bertipe dengan params, query string, body, dan skema respons yang tervalidasi.
- Mengimplementasikan respons error bertipe menggunakan helper `error` Elysia dan penangan error validasi global.
- Membuat klien Eden Treaty dari tipe `App` server.
- Mengonsumsi klien bertipe dari aplikasi React dengan inferensi otomatis tipe request dan response.
- Menangani error bertipe, pencarian, filtering, dan pembaruan optimistis dengan keyakinan bahwa UI tidak akan pernah salah memanggil API.

## Konteks dan Motivasi

Setiap proyek full-stack TypeScript pada akhirnya menghadapi masalah pergeseran (drift) yang sama: server berevolusi, klien tulisan tangan tidak mengikuti, dan kompiler tidak bisa memberi tahu Anda di mana. Tim menyelesaikannya dengan pembuatan kode OpenAPI (langkah build yang bisa membusuk), GraphQL (protokol baru yang utuh), atau tRPC (yang mengikat Anda pada konvensi satu framework). Elysia.js mengambil jalan berbeda. Karena Elysia dibangun di atas TypeBox, setiap route, body, query, dan respons sudah membawa skema runtime yang presisi — dan skema tersebut *adalah* tipe TypeScript. Eden Treaty cukup memakai kembali informasi tipe yang sama di sisi klien, merangkai klien berbasis fetch yang nama method, parameter, dan tipe kembaliannya mencerminkan route Anda secara persis.

Hasilnya adalah kontrak yang didefinisikan sekali, ditegakkan saat runtime oleh server, dan ditegakkan saat kompilasi oleh klien. Tanpa pembuatan kode, tanpa paket skema terpisah yang harus dijaga sinkron, tanpa celah `any`. Tutorial ini menunjukkan pola lengkapnya pada proyek yang realistis sehingga Anda dapat mengadopsinya pada aplikasi full-stack berikutnya.

## Konten Inti

### Mengapa Type Safety End-to-End Itu Penting

Ingat terakhir kali backend mengganti nama field atau mengubah bentuk respons. Tim frontend mengetahuinya saat runtime — sering kali lewat laporan bug. Dengan Eden Treaty, perubahan yang sama muncul sebagai garis merah di editor begitu tipe server diperbarui. Sistem tipe menjadi saluran komunikasi antara dua bagian aplikasi Anda:

- **Satu sumber kebenaran**: skema TypeBox di server adalah satu-satunya tempat kontrak itu hidup.
- **Deteksi saat kompilasi**: setiap pemanggilan klien diperiksa terhadap bentuk server terkini.
- **Error bertipe**: respons kegagalan adalah bagian dari kontrak, sehingga UI menanganinya dengan sengaja alih-alih menebak.
- **Tanpa langkah build**: tidak ada generator yang harus dijalankan, tidak ada artefak yang harus di-commit, dan tidak ada pergeseran antara kode hasil generator dan kode tulisan tangan.

### Proyek: Bookmarkly

Bookmarkly adalah pengelola bookmark dengan fitur yang kecil namun realistis:

- Membuat, mencantumkan, memperbarui, dan menghapus bookmark (URL + judul + tag).
- Mencari bookmark berdasarkan kata kunci pada judul atau URL.
- Memfilter bookmark berdasarkan tag.
- Error 404 bertipe untuk bookmark yang tidak ditemukan dan error 400 bertipe untuk input tidak valid.
- Klien React yang mengonsumsi API melalui Eden Treaty dengan UI optimistis.

### Struktur Proyek

Buat monorepo workspace Bun agar klien dapat mengimpor tipe server secara langsung:

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

`package.json` di root mendeklarasikan workspace:

```json
{
  "name": "bookmarkly",
  "private": true,
  "workspaces": ["server", "web"]
}
```

Paket server memiliki nama dan peta ekspor yang menunjuk ke sumber TypeScript. Bun dapat menjalankan TypeScript secara langsung, sehingga klien dapat mengimpor tipe langsung dari `src/index.ts`:

```json
{
  "name": "@bookmarkly/server",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Pasang dependensi sekali dari root:

```bash
bun install
```

### Mendefinisikan Skema Bersama dengan TypeBox

Kontrak dimulai dari skema TypeBox. Skema ini bekerja ganda: Elysia memvalidasi setiap request dan respons terhadapnya saat runtime, dan TypeScript menurunkan tipe statis darinya saat kompilasi.

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

Perhatikan batasan `format: 'uri'`: TypeBox memvalidasinya saat runtime, sehingga klien tidak akan pernah bisa menyimpan URL yang salah bentuk. Tipe statis yang diekstrak dengan `Static<typeof ...>` persis seperti yang akan digunakan klien.

### Membangun API Server Bertipe

Server adalah satu instance Elysia dengan database SQLite melalui driver bawaan Bun `bun:sqlite` — tanpa dependensi database eksternal.

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

// Mengubah baris mentah menjadi bentuk yang dideklarasikan BookmarkSchema
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

Tag disimpan sebagai string JSON di SQLite dan di-parse saat keluar — pilihan pragmatis yang menjaga skema tetap sederhana sambil tetap memberi klien array string yang layak.

#### Membuat dan Membaca Bookmark

Route pembuatan memvalidasi body-nya terhadap `CreateBookmarkSchema` dan mendeklarasikan bentuk responsnya dengan opsi `response`:

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

Skema `query` adalah TypeBox murni — Elysia meng-parse dan memvalidasi query string, lalu menyerahkan objek `query` bertipe penuh kepada Anda. `search` dan `tag` bersifat opsional, dan autocomplete klien akan mengetahuinya.

#### Memperbarui dan Menghapus Bookmark

Route pembaruan menggunakan `t.Numeric()` untuk param `:id` (Elysia mengonversi segmen string menjadi angka), body parsial, dan 404 bertipe:

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

Helper `error` mengembalikan respons dengan kode status dan body yang diberikan. Karena `404: ErrorSchema` dideklarasikan, baik runtime maupun klien tahu persis seperti apa bentuk 404.

#### Respons Error Bertipe

Penangan error global mengonversi kegagalan validasi TypeBox menjadi bentuk `{ error: string }` yang sama, sehingga klien hanya perlu berurusan dengan satu format error:

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

Setiap body, query, atau param request yang gagal validasi kini menghasilkan 400 dengan pesan yang dapat dibaca — dan Eden Treaty mengetik 400 tersebut di klien.

#### Mengekspos Tipe App

Langkah ajaibnya: ekspor tipe dari seluruh instance app. Satu tipe ini membawa setiap route, skema, dan bentuk error:

```typescript
export type App = typeof app;

app.listen(3000);

console.log(`Bookmarkly API running at http://localhost:${app.server?.port}`);
```

Jalankan server dengan `bun run server/src/index.ts` dan verifikasi endpoint dengan curl sebelum menyentuh frontend:

```bash
curl -s http://localhost:3000/health
curl -s -X POST http://localhost:3000/bookmarks \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://bun.sh","title":"Bun docs","tags":["runtime"]}'
```

### Membangun Klien Eden Treaty

Eden Treaty adalah paket kecil yang mengubah tipe `App` menjadi klien fetch bertipe penuh. Pasang di workspace web:

```bash
bun add @elysiajs/eden
```

Lalu buat `web/src/api.ts` — seluruh klien dalam empat baris:

```typescript
import { edenTreaty } from '@elysiajs/eden';
import type { App } from '@bookmarkly/server';

export const api = edenTreaty<App>('http://localhost:3000');
```

Saat runtime ini hanyalah pembungkus `fetch` biasa. Saat kompilasi ini adalah tipe terpetakan dalam di mana setiap segmen path menjadi rantai method:

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
  body: { title: 'Elysia.js — framework natif Bun' }
});

// DELETE /bookmarks/:id
const deleteRes = await api.bookmarks({ id: 1 }).delete();
```

Setiap pemanggilan mengembalikan union terdiskriminasi dari `{ data, error }`. Keberhasilan memberi Anda payload bertipe; kegagalan memberi Anda error bertipe dengan kode statusnya:

```typescript
const res = await api.bookmarks({ id: 999 }).get();

if (res.error) {
  // res.error.value bertipe { error: string } — bentuk ini divalidasi server
  console.error(`Status ${res.error.status}: ${res.error.value.error}`);
} else {
  // res.data bertipe Bookmark — sepenuhnya diinferensikan dari BookmarkSchema
  console.log(res.data.title);
}
```

### Mengonsumsi API dari React

#### Menyiapkan Klien Vite

Buat aplikasi web dengan template React TypeScript Vite, lalu hubungkan dependensi workspace:

```bash
cd web
bun create vite . --template react-ts
bun add @bookmarkly/server@*
```

Di `web/tsconfig.json`, pastikan sumber server disertakan agar impor tipe dapat terselesaikan:

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

#### Modul API Bertipe

`web/src/api.ts` mengekspor ulang klien plus tipe `Bookmark` sisi klien yang diekstrak dari skema bersama:

```typescript
import { edenTreaty } from '@elysiajs/eden';
import type { App } from '@bookmarkly/server';
import { BookmarkSchema } from '@bookmarkly/server';
import type { Static } from '@sinclair/typebox';

export const api = edenTreaty<App>('http://localhost:3000');

export type Bookmark = Static<typeof BookmarkSchema>;
```

Klien tidak pernah mendeklarasikan ulang bentuk `Bookmark` secara manual — jika skema server berubah, tipe ini ikut berubah.

#### Merender Daftar Bookmark

`App.tsx` memuat daftar dengan parameter query bertipe dan merendernya:

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

#### Menambah dan Mengedit Bookmark

Form pembuatan mengirim body yang tipenya diperiksa kompiler — field yang hilang atau bentuk URL yang salah akan menggagalkan build, bukan runtime:

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

#### Menghapus dengan UI Optimistis

Menghapus adalah ajang yang bagus untuk union error bertipe: UI menghapus baris seketika, lalu memutar balik jika server melaporkan 404:

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

Untuk pola optimistis penuh, Anda akan menyimpan bookmark yang dihapus di state dan memulihkannya saat `res.error`; bagian pentingnya adalah `res.error.value.error` adalah string bertipe, bukan sesuatu yang tidak diketahui.

### Melangkah Lebih Jauh: Prefix, Upload, dan Deployment

- **Prefix route**: jika Anda memasang route di bawah prefix (`.group('/api', (app) => app...)`), Eden Treaty menambah satu tingkat nesting, dan route `/` polos menjadi `.index` — misalnya `api.api.bookmarks.index.get()`.
- **Upload file**: Elysia mendukung `t.File()` dalam skema body, dan Eden Treaty mengetik body `multipart/form-data` untuk Anda — berguna untuk upload avatar atau impor CSV.
- **Deployment**: karena klien hanyalah fetch biasa, Anda dapat meng-host API dan bundel statis secara terpisah, atau menyajikan `web/dist` yang sudah di-build dari server Elysia dengan middleware `static` untuk deploy satu proses.
- **Plugin**: plugin `@elysiajs/swagger` mendokumentasikan skema yang sama secara otomatis, memberi Anda dokumentasi OpenAPI gratis — tetapi klien tidak pernah membutuhkannya, karena tipe sudah dibagikan.

## Contoh Kode

### Entrypoint Server Lengkap

`server/src/index.ts` — seluruh API bertipe dalam satu file:

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

### Aplikasi React Lengkap

`web/src/App.tsx` — daftar, pencarian, pembuatan, dan penghapusan yang terhubung ke klien bertipe:

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

## Insight Penting

- **Satu sumber kebenaran mengalahkan kontrak yang diduplikasi**: mendefinisikan API sekali dengan TypeBox dan membagikan tipe `App` berarti klien tidak akan pernah bisa melenceng dari server — ini adalah proposisi nilai inti Eden Treaty.
- **Skema TypeBox adalah validasi runtime DAN tipe kompilasi**: objek yang sama yang menolak request salah bentuk saat runtime menghasilkan tipe yang menolak pemanggilan klien yang rusak saat kompilasi. Tidak ada definisi kedua yang perlu dirawat.
- **Error bertipe adalah bagian dari kontrak**: mendeklarasikan `404: ErrorSchema` dan menggunakan helper `error` berarti setiap jalur kegagalan memiliki bentuk yang diketahui. Union terdiskriminasi `{ data, error }` memaksa UI menangani kegagalan dengan sengaja.
- **Eden Treaty hampir tidak memakan biaya runtime**: ia adalah pembungkus fetch tipis; semua keajaiban terjadi di sistem tipe. Anda membayar nol byte kode klien hasil generator dan mendapatkan autocomplete penuh secara gratis.
- **Waspadai validasi query dan param**: field query opsional (`t.Optional`) menjaga pemanggilan klien tetap ergonomis, sementara `t.Numeric()` pada params menghilangkan bug klasik konversi string-ke-angka di route handler.
- **Pertimbangan performa**: setiap pemanggilan Eden Treaty adalah fetch biasa — gunakan React Query atau sejenisnya untuk caching dan deduplication di aplikasi yang lebih besar, dan jaga skema respons server tetap ramping agar tidak memvalidasi payload yang tidak Anda butuhkan.

## Langkah Berikutnya

- Jelajahi fitur real-time Elysia: ikuti panduan Elysia.js Real-Time Applications with WebSocket and SSE untuk mengirim event bertipe ke klien.
- Perdalam postur keamanan Anda dengan panduan Elysia.js Security Hardening — skema ketat, autentikasi JWT, dan rate limiting dibangun dengan alami di atas kontrak yang Anda definisikan di sini.
- Perkuat server untuk produksi dengan panduan Elysia.js Production Patterns (logging, observability, struktur plugin).
- Kerjakan silabus Advanced Elysia.js untuk jalur terstruktur menuju plugin, pengujian, dan deployment.
- Coba tambahkan upload file dengan `t.File()`, atau perluas workspace dengan klien mobile yang memakai ulang tipe `App` yang sama.

## Kesimpulan

Elysia.js dan Eden Treaty memberi Anda sesuatu yang hanya didekati oleh kebanyakan tumpukan TypeScript: kontrak full-stack yang ditegakkan kompiler di kedua arah. Dalam tutorial ini Anda membangun pengelola bookmark lengkap — API CRUD bertipe dengan pencarian dan filtering, klien React yang mengonsumsinya melalui pengaturan Eden Treaty empat baris, dan error bertipe di semua titik. Pola ini berskala dari monorepo dua paket hingga tim besar: definisikan skema sekali, ekspor tipe `App`, dan biarkan kompiler menjaga setiap konsumen tetap jujur. Saat Anda mengembangkan Bookmarkly menjadi layanan produksi, semua yang Anda pelajari — skema ketat, error bertipe, kontrak bersama — menjadi fondasi codebase di mana frontend dan backend tidak mungkin berselisih.

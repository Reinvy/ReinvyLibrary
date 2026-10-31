---
title: "Cheat Sheet Dokumentasi OpenAPI Elysia.js"
description: "Referensi cepat untuk mendokumentasikan API Elysia.js dengan plugin Swagger — pembuatan OpenAPI dari schema, tag dan ringkasan, skema keamanan, serta ekspor spesifikasi."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Dokumentasi OpenAPI Elysia.js

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Memasang plugin | `bun add @elysiajs/swagger` | Menambahkan pembuatan OpenAPI 3 ke aplikasi |
| Mendaftarkan plugin | `.use(swagger())` | Menyajikan UI dokumentasi di `/swagger` |
| Memindahkan UI | `swagger({ path: '/docs' })` | Mengubah lokasi pemasangan UI |
| Mengisi metadata | `documentation: { info: { version: '1.2.0' } }` | Menulis `info.version` dan kawan-kawannya |
| Menjelaskan operasi | `detail: { summary: '...' }` | Judul operasi yang tampil di UI |
| Mengelompokkan operasi | `detail: { tags: ['Users'] }` | Membuat bagian yang bisa dilipat di UI |
| Menyembunyikan rute | `detail: { hide: true }` | Mengeluarkan rute dari spec |
| Mendokumentasikan body | `body: t.Object({ ... })` | Dikonversi menjadi `requestBody` |
| Mendokumentasikan respons | `response: { 200: Ok, 404: Err }` | Satu respons terdokumentasi per status |
| Mendokumentasikan param path | `params: t.Object({ id: t.Numeric() })` | Dikonversi menjadi `parameters` bertipe |
| Menempelkan skema keamanan | `detail: { security: [{ bearerAuth: [] }] }` | Menandai operasi sebagai terlindungi |

## Perintah Umum

```bash
# Menambahkan plugin Swagger bersama Elysia
bun add elysia @elysiajs/swagger

# Menjalankan server pengembangan dengan hot reload
bun run --watch src/index.ts

# Memastikan spec tersaji lalu menampilkan daftar path terdokumentasi
curl -s http://localhost:3000/swagger/json | jq -r '.paths | keys[]'
```

### Memeriksa dan Mengekspor Spesifikasi

```bash
# Menyimpan dokumen OpenAPI hasil pembuatan ke disk
curl -s http://localhost:3000/swagger/json -o openapi.json

# Memvalidasi dokumen terhadap skema OpenAPI 3
bunx @redocly/cli lint openapi.json

# Membuat tipe TypeScript untuk konsumen dari spec yang tersimpan
bunx openapi-typescript openapi.json -o src/types/api.d.ts
```

## Potongan Kode

### Penyiapan Minimal

```typescript
import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'

const app = new Elysia()
  .use(
    swagger({
      path: '/docs',
      documentation: { info: { title: 'API Inventaris Reinvy', version: '1.0.0' } }
    })
  )
  .listen(3000)
```

Setiap rute yang dideklarasikan otomatis muncul di spec, tetapi rute tanpa blok `detail` akan mendapat ringkasan hasil generate yang cepat usang.

### Tag, Ringkasan, dan Deskripsi

```typescript
const app = new Elysia()
  .use(swagger({ path: '/docs' }))
  .get('/products/:id', ({ params }) => getProduct(params.id), {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    detail: {
      tags: ['Products'],
      summary: 'Mengambil produk berdasarkan id',
      description: 'Mengembalikan satu produk beserta level stok saat ini.'
    }
  })
```

Jaga daftar `tags` tetap sedikit dan stabil — tag adalah bagian navigasi, bukan sekadar label. Sembunyikan probe health dan scraper metrik dengan `detail: { hide: true }` daripada mendokumentasikan endpoint yang tidak seharusnya dipanggil.

### Skema Autentikasi Bearer

```typescript
const app = new Elysia()
  .use(
    swagger({
      path: '/docs',
      documentation: {
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      }
    })
  )
  .guard({ detail: { security: [{ bearerAuth: [] }] } })
  .use(ordersPlugin)
```

Menaruh `security` pada sebuah guard membuatnya berlaku untuk semua rute di dalam grup, sehingga tombol "Authorize" di UI mencakup seluruh permukaan yang terlindungi.

### Skema Respons per Status

```typescript
import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'

const Product = t.Object({
  id: t.String({ format: 'uuid' }),
  name: t.String(),
  stock: t.Integer({ minimum: 0 })
})

const NotFound = t.Object({
  error: t.Literal('NOT_FOUND'),
  message: t.String()
})

const app = new Elysia()
  .use(swagger({ path: '/docs' }))
  .get('/products/:id', async ({ params, status }) => {
    const product = await findProduct(params.id)
    // Mengembalikan 404 bertipe saat produk tidak ditemukan
    if (!product) return status(404, { error: 'NOT_FOUND', message: 'Produk tidak ada' })
    return product
  }, {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    response: { 200: Product, 404: NotFound },
    detail: { tags: ['Products'], summary: 'Mengambil satu produk' }
  })
```

Skema respons berfungsi ganda: memvalidasi keluaran saat runtime dan mengisi `responses` pada spec. Tanpa itu, konsumen hanya melihat entri `200` tanpa tipe.

### Mengekspor Spesifikasi di CI

```typescript
// scripts/export-openapi.ts
import { app } from '../src/index'

const response = await app.handle(new Request('http://localhost/docs/json'))

if (!response.ok) {
  console.error(`Ekspor spec gagal: HTTP ${response.status}`)
  process.exit(1)
}

const spec = await response.json()
await Bun.write('openapi.json', JSON.stringify(spec, null, 2))
console.log(`Menulis ${Object.keys(spec.paths).length} path`)
```

Jalankan skrip ini di CI lalu diff hasilnya; perubahan tak terduga pada `openapi.json` adalah sinyal breaking change bagi klien hilir.

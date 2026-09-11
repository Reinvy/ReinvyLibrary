---
title: "Tutorial Upload File dan Streaming dengan Elysia.js"
description: "Tutorial tingkat menengah tentang penanganan upload file dan respons streaming dengan Elysia.js dan Bun — mencakup @elysiajs/multipart, validasi upload, ReadableStream, serta contoh lengkap upload gambar dan streaming JSON."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Tutorial Upload File dan Streaming dengan Elysia.js

## Ringkasan

Tutorial ini menunjukkan cara menerima upload file dan menghasilkan respons streaming dengan Elysia.js yang berjalan di atas Bun. Anda akan memvalidasi gambar dengan `@elysiajs/multipart`, menyimpannya ke disk secara aman, lalu membangun endpoint streaming NDJSON (newline-delimited JSON) — diakhiri dengan satu aplikasi lengkap yang dapat dijalankan untuk mengunggah gambar dan mengalirkan hasil pemrosesan kembali ke klien.

## Target Audiens

- Backend Developer yang membangun API dengan Bun dan Elysia.js.
- Tingkat menengah. Pengetahuan dasar TypeScript dan HTTP diasumsikan sudah dimiliki.

## Prasyarat

- Bun 1.1+ terinstal (`curl -fsSL https://bun.sh/install | bash`) dan proyek baru via `bun create elysia upload-demo`.
- Pemahaman tentang HTTP multipart/form-data dan standar web Fetch `Request`/`Response`.
- API client yang dapat mengirim data multipart dan membaca stream NDJSON (curl atau Insomnia).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mengurai upload multipart dengan plugin `@elysiajs/multipart`.
- Memvalidasi tipe file, ukuran, dan keberadaan field dengan skema serta pemeriksaan manual.
- Menyimpan file yang diunggah dengan aman menggunakan `Bun.write` dan nama file unik.
- Membangun respons streaming dengan `ReadableStream` dan `TextEncoder`.
- Mengalirkan NDJSON sehingga klien mengonsumsi event saat event itu tiba.
- Menangani error upload dan stream dengan hook `onError` Elysia.

## Konteks dan Motivasi

Upload file ada di mana-mana — foto profil, dokumen, video — tetapi pendekatan naif "baca seluruh file ke memori" akan runtuh di bawah beban nyata. Video 200 MB akan menghabiskan sebagian besar RAM per permintaan, dan klien yang harus menunggu seluruh respons sebelum melihat apa pun menciptakan UX yang buruk untuk pekerjaan lambat seperti resize gambar atau pembuatan laporan.

Elysia.js, yang dibangun di atas Bun, bersandar pada platform web: penguraian multipart ditangani plugin `@elysiajs/multipart`, upload tiba sebagai objek `File` yang dapat dialirkan ke disk alih-alih di-buffer, dan respons hanyalah `ReadableStream` web biasa. Kombinasi ini memungkinkan Anda membangun upload hemat memori dan endpoint progresif berbasis event — seperti endpoint yang mengalirkan status pemrosesan per gambar alih-alih satu blob JSON yang memblokir — tanpa menarik mekanisme framework yang berat.

## Konten Inti

### Plugin @elysiajs/multipart

Pasang dengan `bun add @elysiajs/multipart`. Saat diterapkan pada skema `body` sebuah rute, setiap field file dari formulir multipart diekspos sebagai objek `File` standar. Plugin mendukung limit melalui `multipart({ limits: { fileSize, files, fields, parts } })`; ketika limit terlampaui, permintaan ditolak sebelum handler Anda berjalan.

### Validasi Upload

Dua lapisan validasi sama-sama penting. Validasi skema menolak permintaan yang bentuknya salah (field hilang, tipe salah) dengan status 422. Validasi konten — memeriksa `file.type` terhadap daftar izin dan menegakkan ukuran maksimum — melindungi dari payload berbahaya yang secara teknis adalah body multipart yang valid. Jangan pernah hanya mempercayai tipe MIME yang dideklarasikan klien; periksa magic bytes jika upload bersifat sensitif keamanan.

### Respons Streaming

Respons streaming mengembalikan `Response` yang body-nya berupa `ReadableStream`. Server menulis potongan data dengan `controller.enqueue()`, dan klien menerima data secara bertahap. Untuk JSON, gunakan NDJSON: satu objek JSON per baris, dengan newline sebagai pembatas frame — mudah diurai klien baris demi baris dan ideal untuk event progres.

## Contoh Kode

Pasang plugin dan siapkan direktori upload:

```bash
bun add @elysiajs/multipart && mkdir -p uploads
```

`src/index.ts` — upload gambar dengan validasi, plus endpoint streaming NDJSON:

```typescript
import { Elysia } from 'elysia'
import { multipart } from '@elysiajs/multipart'
import { randomUUID } from 'node:crypto'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const UPLOAD_DIR = './uploads'

const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422
      return { error: 'Permintaan tidak valid', detail: error.message }
    }
    set.status = 500
    return { error: 'Error internal', detail: (error as Error).message }
  })
  .post(
    '/upload',
    async ({ body }) => {
      const file = body.file
      // Validasi tingkat konten: tipe dan ukuran — jangan percaya klien saja
      if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error(`Tipe gambar tidak didukung: ${file.type}`)
      }
      if (file.size > MAX_SIZE) {
        throw new Error(`Gambar melebihi batas ${MAX_SIZE / 1024 / 1024} MB`)
      }
      const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
      const filename = `${randomUUID()}.${ext}`
      const destination = `${UPLOAD_DIR}/${filename}`
      // Alirkan ke disk dalam potongan alih-alih me-buffer seluruh file
      await Bun.write(destination, file.stream())
      return { ok: true, filename, size: file.size, url: `/files/${filename}` }
    },
    {
      body: multipart({ limits: { fileSize: MAX_SIZE, files: 1, fields: 2 } })
    }
  )
  .get('/process', () => {
    // Stream NDJSON: laporkan progres per item, bukan satu respons memblokir
    const encoder = new TextEncoder()
    const tasks = ['resize', 'optimize', 'hash', 'upload']
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for (const task of tasks) {
            controller.enqueue(encoder.encode(JSON.stringify({ status: 'processing', task }) + '\n'))
            await Bun.sleep(250) // simulasi kerja nyata
          }
          controller.enqueue(encoder.encode(JSON.stringify({ status: 'done', tasks }) + '\n'))
        } catch (err) {
          controller.enqueue(encoder.encode(JSON.stringify({ status: 'error', error: (err as Error).message }) + '\n'))
        } finally {
          controller.close()
        }
      }
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    })
  })
  .listen(3000)

console.log(`Demo upload berjalan di http://localhost:${app.server?.port}`)
```

Uji upload:

```bash
curl -s -X POST http://localhost:3000/upload \
  -F "file=@photo.png" | bun -e 'console.log(await Bun.stdin.json())'
```

Konsumsi stream NDJSON saat event tiba:

```bash
curl -s -N http://localhost:3000/process
# {"status":"processing","task":"resize"}
# {"status":"processing","task":"optimize"}
# ...satu baris per detik, dialirkan secara bertahap
```

## Insight Penting

- Terapkan `limits` di `multipart()` — memeriksa ukuran hanya di dalam handler tetap me-buffer body yang terlalu besar terlebih dahulu, sehingga memboroskan memori.
- `Bun.write(destination, file.stream())` menulis potongan saat tiba; `await file.arrayBuffer()` pada file 200 MB akan melonjakkan memori. Gunakan streaming setiap kali file bisa berukuran besar.
- Gunakan helper `isFile` dari plugin untuk membedakan file dari field teks saat formulir mencampur keduanya (misalnya `file` plus string `caption`).
- Gunakan UUID atau timestamp pada nama file tersimpan; jangan pernah percaya nama asli, yang mungkin mengandung urutan path traversal (`../`).
- Pembingkaian NDJSON (satu objek JSON per baris) adalah format JSON streaming dengan gesekan paling rendah. Selalu set `Content-Type` eksplisit dan pertimbangkan `Cache-Control: no-store` agar perantara tidak me-buffer respons.

## Langkah Berikutnya

- Jelajahi helper `stream` bawaan Elysia dan plugin `ServerSentEvents` untuk kasus SSE (event-streaming).
- Tambahkan autentikasi pada upload dengan plugin `bearer` atau JWT, kuota penyimpanan per pengguna, dan `Bun.file()` dengan range-request untuk melayani file secara efisien.

## Kesimpulan

Anda membangun endpoint upload gambar hemat memori dengan `@elysiajs/multipart`, validasi tipe dan ukuran yang benar, serta penyimpanan disk yang aman — ditambah endpoint streaming NDJSON yang mendorong event progres alih-alih satu respons memblokir. Kedua pola ini mencakup mayoritas kebutuhan API media dan data real-time di atas stack Bun + Elysia.

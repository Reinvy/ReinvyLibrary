---
title: "Panduan Penanganan Error di Express.js"
description: "Panduan praktis penanganan error terpusat di Express: error operasional versus kesalahan pemrograman, penerusan error async, kelas error kustom, pemetaan status HTTP, dan logging dengan id korelasi."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Penanganan Error di Express.js

## Pendahuluan

Express hanya menyediakan satu strategi bawaan untuk error: panggil `next(err)` dan pada akhirnya fungsi dengan empat argumen akan dijalankan. Untuk aplikasi kecil itu cukup. Di produksi tidak, karena sebuah sistem harus menjawab empat pertanyaan terpisah: apa yang gagal, siapa yang terdampak, apa yang boleh dilihat klien, dan bagaimana menemukan baris log terkait enam jam kemudian.

Pola kegagalannya mudah ditebak. Handler melempar error di dalam fungsi `async` dan Express diam-diam membiarkan request menggantung sampai klien timeout. Stack trace bocor ke respons JSON. Satu blok `catch` mengembalikan `500` untuk kesalahan validasi yang seharusnya `422`. Log ditulis tanpa identitas request, sehingga mencocokkannya dengan tiket dukungan menjadi tebakan.

Panduan ini menjelaskan arsitektur error terpusat yang menjaga handler tetap tipis, membuat respons error dapat diprediksi, dan menghasilkan log yang benar-benar bisa dicari. Semua pola di sini berjalan di Express 4 maupun Express 5 dengan perbedaan kecil pada perlakuan promise yang ditolak.

## Praktik Terbaik

- **Pusatkan, jangan memformat di handler.** Handler cukup melempar error atau memanggil `next(err)`; hanya satu middleware error yang menentukan status HTTP dan body respons. Jika pemformatan tersebar di handler, setiap endpoint akan menyimpang.
- **Pisahkan error operasional dari kesalahan pemrograman.** Error operasional (input tidak valid, data tidak ditemukan, timeout layanan lain) memang diharapkan dan dipetakan ke 4xx/5xx tertentu dengan pesan aman. Kesalahan pemrograman (salah ketik, null dereference, tipe keliru) adalah bug: kembalikan `500` generik, catat stack lengkap, dan kirim alert.
- **Gunakan kelas error kustom, bukan pencocokan string.** `AppError` dengan `status`, `code`, dan `isOperational` menghapus `if (message.includes('not found'))` dari setiap handler.
- **Perlakukan `expose` sebagai saklar keamanan.** Hanya pesan dari error operasional yang boleh sampai ke klien. Stack trace, potongan SQL, dan nama host internal tidak pernah boleh.
- **Bungkus setiap handler async.** Express 5 meneruskan promise yang ditolak secara otomatis; Express 4 tidak. `asyncHandler` eksplisit menjaga kode tetap portabel dan niatnya terlihat jelas.
- **Catat log satu kali, di batas aplikasi.** Dua lapisan yang mencatat kegagalan sama akan menghasilkan alert ganda. Middleware error adalah satu-satunya titik logging, dan ia membutuhkan id request, route, id pengguna, serta kode error.
- **Teruskan id request.** Terima `x-request-id` dari gateway bila ada, jika tidak buat UUID, simpan di `req.id`, kembalikan lewat header respons, dan sertakan di setiap baris log.
- **Jangan menelan error demi respons yang "bersih".** `catch (e) {}` menyembunyikan invarian yang rusak; tangkap hanya untuk menerjemahkan, lalu lempar ulang atau teruskan.
- **Bedakan "tidak ditemukan" dari "tidak diizinkan".** Mengembalikan `404` untuk sumber daya yang tidak boleh dilihat pemanggil sering kali disengaja; `403` membocorkan keberadaannya. Putuskan per sumber daya dan konsisten.

## Langkah Implementasi

### Langkah 1: Definisikan tipe error

```javascript
class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const badRequest = (msg, details) => new AppError(msg, 400, 'BAD_REQUEST', details);
const notFound = (msg = 'sumber daya tidak ditemukan') => new AppError(msg, 404, 'NOT_FOUND');
const conflict = (msg) => new AppError(msg, 409, 'CONFLICT');
```

Apa pun yang bukan `AppError` secara definisi tidak terduga. Aturan tunggal itu yang menjadi dasar seluruh desain berikutnya.

### Langkah 2: Petakan error domain ke kode status HTTP

| Situasi | Status | Kode | Pesan untuk klien |
|---------|--------|------|-------------------|
| Field hilang atau format salah | 400 | `VALIDATION_ERROR` | Detail per field |
| Token tidak ada atau tidak valid | 401 | `UNAUTHENTICATED` | `autentikasi diperlukan` |
| Terautentikasi tetapi tidak berhak | 403 | `FORBIDDEN` | `tidak diizinkan` |
| Entitas tidak ada | 404 | `NOT_FOUND` | `sumber daya tidak ditemukan` |
| Duplikat kunci atau versi bentrok | 409 | `CONFLICT` | Alasan yang bisa dibaca manusia |
| Melebihi batas laju | 429 | `RATE_LIMITED` | Petunjuk waktu coba ulang |
| Dependensi eksternal gagal | 502 | `UPSTREAM_ERROR` | `layanan sementara tidak tersedia` |
| Tidak tertangani | 500 | `INTERNAL_ERROR` | `kesalahan internal server` |

Simpan tabel pemetaan di satu modul agar diskusi review menjadi mekanis, bukan soal selera.

### Langkah 3: Bungkus handler async

```javascript
// Express 4 membutuhkan ini; Express 5 sudah meneruskan promise secara native
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.patch('/orders/:id', asyncHandler(async (req, res) => {
  const order = await orders.findByPk(req.params.id);
  if (!order) throw notFound('order tidak ditemukan');

  if (order.status === 'shipped') {
    throw conflict('order yang sudah dikirim tidak dapat diubah');
  }

  await order.update(pick(req.body, ['note', 'address']));
  res.json(order);
}));
```

Handler kini terbaca sebagai alur lurus. Tidak ada `try`/`catch` per route, dan tidak ada jalur error yang terlupakan.

### Langkah 4: Tambahkan id request paling awal

```javascript
const { randomUUID } = require('crypto');

app.use((req, res, next) => {
  req.id = req.get('x-request-id') || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});
```

Daftarkan ini paling pertama. Semua middleware berikutnya, termasuk error handler dan access logger, boleh bergantung pada `req.id` yang sudah ada.

### Langkah 5: Pasang handler terminal

```javascript
const logger = require('./logger');

app.use((req, res) => {
  res.status(404).json({ error: 'route tidak ditemukan', requestId: req.id });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err); // stream atau unduhan sudah dimulai

  const operational = err instanceof AppError && err.isOperational;
  const status = operational ? err.status : 500;
  const code = operational ? err.code : 'INTERNAL_ERROR';

  logger.error({
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id ?? null,
    status,
    code,
    message: err.message,
    stack: operational ? undefined : err.stack,
  });

  res.status(status).json({
    error: operational ? err.message : 'kesalahan internal server',
    code,
    requestId: req.id,
    ...(operational && err.details ? { details: err.details } : {}),
  });
});
```

Perhatikan asimetrinya: log selalu menerima pesan dan stack lengkap, sedangkan respons hanya memuat informasi yang boleh diketahui pemanggil. Keduanya membawa `requestId`, yaitu kunci penghubung antara laporan pengguna dan penyimpanan log Anda.

### Langkah 6: Gagal keras saat start, tenang saat melayani

Kesalahan pemrograman tetap perlu perhatian. Hubungkan `process.on('unhandledRejection')` dan `process.on('uncaughtException')` untuk mencatat error lalu keluar dengan kode non-nol agar supervisor menjalankan proses yang bersih. Menelannya begitu saja membuat layanan berjalan dalam keadaan tidak terdefinisi, yang lebih buruk daripada restart.

### Langkah 7: Verifikasi dengan tes dan smoke check

```bash
# Error operasional: harapkan 404, ada kode, dan ada request id
curl -si http://localhost:3000/orders/tidak-ada | head -n 8

# Payload tidak valid: harapkan 400 dengan detail field
curl -si -X POST http://localhost:3000/orders \
  -H 'Content-Type: application/json' -d '{"qty":"banyak"}'

# Kesalahan pemrograman: harapkan 500 tanpa stack trace di body
curl -si http://localhost:3000/orders/boom | grep -i 'express\|at '
```

Uji tiga hal dalam integration test: kode status, field `code`, dan tidak adanya `stack` untuk error non-operasional. Asersi itu menangkap sebagian besar regresi pada lapisan error.

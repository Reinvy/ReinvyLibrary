---
title: "Cheat Sheet Middleware Express.js"
description: "Referensi ringkas middleware Express: cakupan application versus router, urutan eksekusi, error handler, parser bawaan, paket pihak ketiga, dan pola pembungkus async."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Middleware Express.js

Middleware adalah fungsi dengan tanda tangan `(req, res, next)`. Express menjalankan middleware sesuai urutan pendaftarannya, sehingga sebagian besar bug produksi berasal dari urutan, cakupan, dan lupa memanggil `next()`.

## Tabel Referensi Cepat

| Aksi | Kode / Pola | Deskripsi |
|------|-------------|-----------|
| Middleware level aplikasi | `app.use(fn)` | Dijalankan untuk setiap request yang masuk ke aplikasi |
| Middleware dengan prefiks path | `app.use('/api', fn)` | Hanya jalan bila prefiks path cocok |
| Middleware level router | `router.use(fn)` | Hanya jalan untuk request yang masuk ke router tersebut |
| Middleware level route | `app.get('/x', fn1, fn2, handler)` | Rantai dijalankan dari kiri ke kanan untuk satu route saja |
| Memasang router | `app.use('/users', usersRouter)` | Memberi prefiks pada semua route router dan memotong mount path |
| Meneruskan kendali | `next()` | Lanjut ke middleware berikutnya di stack |
| Melewati route aktif | `next('route')` | Keluar dari route saat ini dan mencoba route berikutnya yang cocok |
| Menghentikan dengan error | `next(err)` | Lompat ke error handler 4-arity terdekat |
| Error handler | `app.use((err, req, res, next) => {})` | Wajib 4 parameter, jika tidak Express menganggapnya middleware biasa |
| Parser body JSON | `express.json({ limit: '1mb' })` | Parser bawaan untuk `application/json` |
| Parser URL-encoded | `express.urlencoded({ extended: true })` | Parser bawaan untuk form HTML |
| File statis | `express.static('public', { maxAge: '1d' })` | Menyajikan file sekaligus mengatur header cache |
| Parser cookie | `cookieParser(secret)` | Pihak ketiga; mengisi `req.cookies` dan `req.signedCookies` |
| Header keamanan | `helmet()` | Mengatur CSP, HSTS, dan header pengerasan lain |
| Logging request | `morgan('combined')` | Satu baris access log untuk tiap request |
| Keamanan async | `asyncHandler(fn)` | Meneruskan promise yang ditolak ke error handler |

## Perintah Umum

### Memasang paket middleware yang biasa dipakai

```bash
# Dependensi inti
npm install express cookie-parser cors helmet morgan compression

# Perkakas khusus pengembangan
npm install --save-dev nodemon supertest
```

### Memeriksa perilaku middleware dari shell

```bash
# Periksa header respons yang ditambahkan helmet dan compression
curl -sI http://localhost:3000/health | grep -Ei 'content-security|x-frame|content-encoding'

# Pastikan parser body menolak JSON yang rusak atau terlalu besar
curl -s -X POST http://localhost:3000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"email":'
```

## Potongan Kode

### Middleware level aplikasi

```javascript
const express = require('express');
const requestId = require('express-request-id');

const app = express();

// Jalan pertama untuk setiap request, menambahkan id korelasi untuk log
app.use(requestId());

// Jalan untuk semua verb dan path di bawah titik pemasangan
app.use((req, res, next) => {
  res.setHeader('X-Request-Id', req.id);
  next(); // lupa memanggil ini adalah penyebab umum request menggantung
});
```

### Middleware level router dan pemasangan path

```javascript
const { Router } = require('express');
const usersRouter = Router();

// Middleware lingkup router: hanya request yang masuk router ini yang melewatinya
usersRouter.use((req, res, next) => {
  req.scope = 'users';
  next();
});

usersRouter.get('/:id', (req, res) => {
  // Hanya req.params.id, karena mount path sudah dipotong
  res.json({ id: req.params.id, scope: req.scope });
});

// Mount path dihapus dari req.url tetapi tetap ada di req.baseUrl
app.use('/api/v1/users', usersRouter);
```

### Parser bawaan dan aset statis

```javascript
// Parser harus didaftarkan sebelum route yang membaca req.body
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static('public', { maxAge: '1d', etag: true }));

app.post('/api/users', (req, res) => {
  if (!req.body.email) {
    return res.status(422).json({ error: 'email wajib diisi' });
  }
  res.status(201).json({ email: req.body.email });
});
```

### Urutan: autentikasi sebelum handler

```javascript
function requireApiKey(req, res, next) {
  const key = req.get('x-api-key');
  if (!key) return res.status(401).json({ error: 'api key tidak ada' });
  req.apiKey = key;
  next();
}

// Dipasang sebelum route terproteksi, sehingga selalu dijalankan lebih dulu
app.use('/api', requireApiKey);
app.use('/api/orders', ordersRouter);
app.use('/api/reports', reportsRouter);
```

### Pola pembungkus async

```javascript
// Express 4 tidak menangkap promise yang ditolak; bungkus setiap handler async
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/orders/:id', asyncHandler(async (req, res) => {
  const order = await orderRepository.findById(req.params.id);
  if (!order) {
    const err = new Error('order tidak ditemukan');
    err.status = 404;
    throw err; // diteruskan ke middleware error oleh pembungkus
  }
  res.json(order);
}));
```

### Middleware error dan penangkap 404

```javascript
// Penangkap 404 harus setelah semua route tetapi sebelum error handler
app.use((req, res) => {
  res.status(404).json({ error: 'tidak ditemukan', path: req.originalUrl });
});

// Empat argumen, selalu paling akhir: Express mengenali error handler dari arity
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err); // biarkan handler bawaan menutup socket
  const status = err.status || 500;
  console.error(JSON.stringify({ requestId: req.id, status, message: err.message }));
  res.status(status).json({ error: err.expose ? err.message : 'kesalahan internal', requestId: req.id });
});
```

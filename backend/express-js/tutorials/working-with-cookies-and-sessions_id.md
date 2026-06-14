---
title: "Bekerja dengan Cookie dan Session di Express JS"
description: "Tutorial ini menjelaskan cara mengelola status (state) pengguna di Express.js menggunakan cookie dan session. Materi ini membahas dasar-dasar HTTP yang bersifat"
category: "backend"
technology: "express-js"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Bekerja dengan Cookie dan Session di Express JS

## Ringkasan Singkat

Tutorial ini menjelaskan cara mengelola status (state) pengguna di Express.js menggunakan cookie dan session. Materi ini membahas dasar-dasar HTTP yang bersifat stateless, bagaimana cookie menyimpan sejumlah kecil data di sisi klien, dan bagaimana session menyediakan cara yang aman untuk menyimpan data pengguna di sisi server di berbagai permintaan (request).

## Untuk Siapa Materi Ini

Materi ini ditujukan untuk developer Node.js tingkat pemula hingga menengah yang ingin memahami cara mengimplementasikan manajemen state dasar, pelacakan pengguna, dan autentikasi sederhana dalam aplikasi Express sebelum beralih ke topik lanjutan seperti JWT.

## Prasyarat

- Pemahaman dasar tentang JavaScript dan Node.js.
- Keakraban dengan routing dasar dan middleware di Express.js.
- Pemahaman tentang bagaimana siklus HTTP request dan response bekerja.

## Tujuan Belajar

- Memahami sifat HTTP yang stateless dan mengapa manajemen state diperlukan.
- Mempelajari cara mengurai (parse), mengatur, dan menghapus cookie di Express.js menggunakan `cookie-parser`.
- Mempelajari cara mengimplementasikan session di sisi server menggunakan `express-session`.
- Memahami perbedaan antara cookie dan session, serta kapan harus menggunakan masing-masing.
- Memahami praktik terbaik (best practices) untuk mengamankan cookie dan session.

## Konteks dan Motivasi

HTTP adalah protokol yang *stateless*, artinya setiap permintaan bersifat independen dan server tidak mengingat permintaan sebelumnya. Namun, aplikasi web modern perlu mengingat pengguna—apakah mereka sudah login, apa saja barang yang ada di keranjang belanja mereka, atau apa preferensi tema mereka. Cookie dan session adalah mekanisme mendasar untuk menjembatani celah ini, memungkinkan state untuk bertahan di berbagai permintaan (request).

## Materi Inti

### 1. Masalah Stateless

Ketika pengguna mengunjungi aplikasi Anda, browser mereka mengirimkan HTTP request. Secara default, ketika mereka berpindah ke halaman lain dan mengirimkan permintaan kedua, server tidak tahu bahwa itu adalah pengguna yang sama. Untuk melacak pengguna, server harus memberikan "label" (sebuah cookie) kepada klien, yang kemudian dikirim kembali oleh klien pada setiap permintaan berikutnya.

### 2. Bekerja dengan Cookie

Cookie adalah string teks kecil yang disimpan di browser klien. Cookie dikirim bersamaan dengan setiap HTTP request ke domain yang membuatnya.
Di Express, Anda dapat mengatur cookie menggunakan `res.cookie()` dan membaca cookie menggunakan middleware `cookie-parser`.

- **Mengatur Cookie:** `res.cookie('nama', 'nilai', opsi)`
- **Membaca Cookie:** `req.cookies.nama` (membutuhkan `cookie-parser`)
- **Menghapus Cookie:** `res.clearCookie('nama')`

### 3. Bekerja dengan Session

Sementara cookie menyimpan data di sisi klien, session menyimpan data di sisi server. Server menghasilkan Session ID yang unik, menyimpannya dalam sebuah cookie di browser klien, dan menyimpan data session yang sebenarnya (seperti ID pengguna atau barang di keranjang) di memori server atau database.
Middleware `express-session` adalah cara standar untuk menangani session di Express.

- **Mengatur Data Session:** `req.session.userId = 123`
- **Membaca Data Session:** `const userId = req.session.userId`
- **Menghancurkan Session:** `req.session.destroy()`

### 4. Cookie vs. Session

- **Cookie:** Disimpan di klien. Ukurannya terbatas (biasanya 4KB). Dapat dimodifikasi oleh pengguna jika tidak ditandatangani (signed) atau dienkripsi. Cocok untuk data yang tidak sensitif seperti preferensi.
- **Session:** Disimpan di server. Ukurannya tidak terbatas. Aman karena klien hanya memegang Session ID. Cocok untuk data sensitif seperti status autentikasi.

## Contoh / Ilustrasi

### Contoh 1: Implementasi Dasar Cookie

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();

// Middleware untuk mengurai cookie
app.use(cookieParser());

// Route untuk mengatur cookie
app.get('/set-cookie', (req, res) => {
  res.cookie('theme', 'dark', { maxAge: 900000, httpOnly: true });
  res.send('Cookie telah berhasil diatur!');
});

// Route untuk membaca cookie
app.get('/get-cookie', (req, res) => {
  const theme = req.cookies.theme;
  res.send(`Tema saat ini adalah: ${theme || 'default'}`);
});
```

### Contoh 2: Implementasi Dasar Session

```javascript
const express = require('express');
const session = require('express-session');
const app = express();

// Middleware untuk mengatur session
app.use(session({
  secret: 'my_super_secret_key', // Digunakan untuk menandatangani cookie session ID
  resave: false,                 // Jangan simpan session jika tidak dimodifikasi
  saveUninitialized: false,      // Jangan buat session sampai ada yang disimpan
  cookie: { secure: false }      // Atur ke true jika menggunakan HTTPS
}));

// Route untuk login dan mengatur data session
app.get('/login', (req, res) => {
  req.session.user = { id: 1, username: 'john_doe' };
  res.send('Login berhasil dan session dibuat!');
});

// Route untuk mengakses data session
app.get('/profile', (req, res) => {
  if (req.session.user) {
    res.send(`Selamat datang kembali, ${req.session.user.username}`);
  } else {
    res.status(401).send('Silakan login terlebih dahulu.');
  }
});

// Route untuk logout dan menghancurkan session
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.send('Logout berhasil.');
  });
});
```

## Insight Penting

- **Keamanan Itu Penting:** Selalu gunakan `httpOnly: true` untuk cookie yang berisi informasi sensitif (seperti session ID) agar tidak bisa diakses oleh JavaScript di sisi klien. Hal ini membantu mencegah serangan XSS.
- **Flag Secure:** Di production yang menggunakan HTTPS, selalu atur `secure: true` pada cookie Anda agar cookie hanya dikirim melalui koneksi yang terenkripsi.
- **Penyimpanan Session:** Secara default, `express-session` menyimpan data session di memori. Ini tidak masalah untuk development, namun dapat menyebabkan kebocoran memori (memory leak) dan hilang saat server di-restart. Untuk production, selalu gunakan penyimpanan session khusus (session store) seperti Redis atau database.
- **Masalah Skalabilitas:** Session yang stateful dapat membuat skalabilitas horizontal menjadi sulit karena data session pengguna terikat pada server tertentu. Itulah sebabnya autentikasi stateless seperti JWT sering lebih disukai untuk API yang terdistribusi.

## Ringkasan Akhir

- HTTP bersifat stateless, tetapi aplikasi web membutuhkan state.
- Cookie menyimpan sejumlah kecil data di sisi klien.
- Session menyimpan data di sisi server dan menggunakan cookie untuk melacak Session ID.
- `cookie-parser` digunakan untuk mengelola cookie biasa, sedangkan `express-session` digunakan untuk mengelola session di sisi server.
- Selalu terapkan praktik keamanan terbaik (flag `httpOnly`, `secure`) saat bekerja dengan cookie dan session.

## Langkah Belajar Berikutnya

- Authentication and Authorization with JWT in Express
- Caching in Express JS APIs with Redis
- Express JS Security Best Practices

## Metadata

- Level: Pemula / Menengah
- Topik utama: Express.js
- Topik terkait: State Management, Authentication
- Kata kunci: Express, Cookie, Session, express-session, cookie-parser, State
- Estimasi waktu baca: 8 menit

---
title: "Mengimplementasikan Refresh Token dengan JWT di Express.js"
description: "Tutorial ini menjelaskan cara mengimplementasikan mekanisme Refresh Token yang aman pada aplikasi Express.js. Anda akan mempelajari tujuan dari refresh token, a"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Mengimplementasikan Refresh Token dengan JWT di Express.js

## Ringkasan

Tutorial ini menjelaskan cara mengimplementasikan mekanisme Refresh Token yang aman pada aplikasi Express.js. Anda akan mempelajari tujuan dari refresh token, alur autentikasinya, dan bagaimana menulis kode untuk mengelola access token berumur pendek bersamaan dengan refresh token berumur panjang.

---

## Target Audiens

* Backend Developer, Fullstack Developer
* Menengah (Intermediate)

---

## Prasyarat

* Pemahaman dasar tentang routing dan middleware Express.js.
* Familiar dengan konsep Autentikasi dan Otorisasi.
* Telah menyelesaikan tutorial "Authentication and Authorization Using JWT in Express.js".

---

## Tujuan Pembelajaran

Setelah membaca materi ini, pembaca akan memahami:

* Mengapa Access Token harus memiliki masa berlaku (lifespan) yang singkat.
* Apa itu Refresh Token dan mengapa ia diperlukan.
* Alur lengkap dari proses login, mengakses rute yang dilindungi, dan memperbarui token.
* Cara mengimplementasikan logika untuk menerbitkan dan memverifikasi Refresh Token di Express.js.
* Best practice dan pertimbangan keamanan untuk menyimpan dan menangani token.

---

## Konteks dan Motivasi

Dalam autentikasi standar berbasis JWT, sebuah Access Token diberikan kepada pengguna saat berhasil login. Jika token ini memiliki masa kedaluwarsa yang lama dan entah bagaimana disadap oleh penyerang (misalnya, melalui serangan XSS), penyerang tersebut mendapatkan akses jangka panjang ke akun pengguna. Ini adalah risiko keamanan yang sangat besar.

Untuk memitigasi hal ini, Access Token diberikan masa berlaku yang sangat singkat (misalnya, 15 menit). Namun, memaksa pengguna untuk login kembali setiap 15 menit akan memberikan pengalaman pengguna (user experience) yang buruk. Di sinilah Refresh Token berperan. Refresh Token adalah token berumur panjang (misalnya, 7 hari) yang *hanya* dapat digunakan untuk meminta Access Token baru ketika yang lama kedaluwarsa. Memahami cara mengimplementasikan strategi dua-token ini sangat penting untuk membangun aplikasi web modern yang aman.

---

## Konten Inti

### 1. Konsep Inti

Alur standarnya melibatkan dua jenis token:

* **Access Token:** Memiliki umur pendek (misalnya, 15 menit). Digunakan untuk mengakses endpoint API yang dilindungi. Biasanya dikirim melalui header `Authorization`.
* **Refresh Token:** Memiliki umur panjang (misalnya, 7 hari). Digunakan *hanya* untuk mendapatkan Access Token baru. Token ini sering kali disimpan dengan aman (misalnya, dalam cookie `HttpOnly` atau database) dan dikirim ke endpoint spesifik `/refresh`.

### 2. Alur Autentikasi

1. **Login:** Pengguna mengirimkan kredensial. Jika valid, server menghasilkan Access Token dan Refresh Token. Refresh Token disimpan (sering kali di memori untuk aplikasi sederhana, atau di database untuk produksi). Kedua token dikirim kembali ke klien.
2. **Mengakses Resource:** Klien menggunakan Access Token untuk mengakses rute yang dilindungi.
3. **Token Kedaluwarsa:** Saat Access Token kedaluwarsa, server merespons dengan status `401 Unauthorized` (atau `403 Forbidden`).
4. **Memperbarui Token:** Klien menangkap error ini dan mengirimkan Refresh Token ke endpoint `/refresh`.
5. **Validasi:** Server memverifikasi Refresh Token. Jika valid dan terdaftar di penyimpanan server, server menerbitkan Access Token *baru*.
6. **Logout:** Klien meminta untuk logout, dan server menghapus Refresh Token dari penyimpanannya, sehingga membuatnya tidak berlaku lagi.

### 3. Langkah Implementasi

Kita akan menggunakan array di dalam memori (in-memory) untuk menyimpan refresh token demi kesederhanaan, tetapi pada aplikasi nyata, Anda harus menyimpannya di dalam database.

Pertama, pastikan Anda telah menginstal package yang dibutuhkan:

```bash
npm install express jsonwebtoken
```

---

## Contoh Kode

### 1. Setup dan Rute Login

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const ACCESS_TOKEN_SECRET = 'rahasia_access_token_anda';
const REFRESH_TOKEN_SECRET = 'rahasia_refresh_token_anda';

// Penyimpanan in-memory untuk refresh token (gunakan database di produksi!)
let refreshTokens = [];

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Simulasi autentikasi pengguna
  if (username === 'admin' && password === 'password') {
    const user = { name: username };

    // 1. Generate Access Token (Umur pendek)
    const accessToken = jwt.sign(user, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

    // 2. Generate Refresh Token (Umur panjang)
    const refreshToken = jwt.sign(user, REFRESH_TOKEN_SECRET);

    // 3. Simpan Refresh Token
    refreshTokens.push(refreshToken);

    // 4. Kirim kedua token ke klien
    return res.json({ accessToken, refreshToken });
  }

  res.status(401).json({ message: 'Kredensial tidak valid' });
});
```

### 2. Middleware Rute yang Dilindungi

Bagian ini mirip dengan tutorial dasar JWT.

```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token tidak ditemukan' });

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Access token tidak valid atau telah kedaluwarsa' });
    req.user = user;
    next();
  });
};

app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Ini adalah rute yang dilindungi', user: req.user });
});
```

### 3. Endpoint Refresh Token

Endpoint ini menerima refresh token dan mengembalikan access token yang baru.

```javascript
app.post('/refresh', (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(401).json({ message: 'Refresh token diperlukan' });

  // Periksa apakah refresh token ada di penyimpanan kita
  if (!refreshTokens.includes(token)) {
      return res.status(403).json({ message: 'Refresh token tidak valid' });
  }

  jwt.verify(token, REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Signature refresh token tidak valid' });

    // Generate Access Token yang baru
    // Kita hanya membutuhkan username, jadi kita ekstrak dari payload user yang telah di-decode
    const accessToken = jwt.sign({ name: user.name }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

    res.json({ accessToken });
  });
});
```

### 4. Endpoint Logout

Logout bertugas menghapus refresh token dari penyimpanan server sehingga tidak bisa lagi digunakan untuk menghasilkan access token baru.

```javascript
app.post('/logout', (req, res) => {
  const { token } = req.body;

  // Hapus token dari penyimpanan in-memory kita
  refreshTokens = refreshTokens.filter(t => t !== token);

  res.status(204).send(); // 204 No Content
});

app.listen(3000, () => {
  console.log('Server berjalan pada port 3000');
});
```

---

## Insight Penting

* **Strategi Penyimpanan:** Menyimpan Refresh Token dalam cookie `HttpOnly` sering dianggap sebagai pendekatan yang paling aman terhadap serangan XSS, sementara Access Token dapat disimpan di memori pada sisi klien (client-side).
* **Membatalkan Token (Token Invalidation):** Karena JWT bersifat *stateless*, Anda tidak dapat membatalkan Access Token tertentu sebelum ia kedaluwarsa. Mekanisme Refresh Token menyelesaikan masalah ini: jika akun pengguna diretas atau diblokir, Anda dapat menghapus Refresh Token-nya dari database. Ketika Access Token 15-menit mereka kedaluwarsa, mereka tidak akan bisa mendapatkan token baru.
* **Rotasi Refresh Token (Refresh Token Rotation):** Untuk keamanan ekstra, Anda bisa menerapkan *Refresh Token Rotation*. Dengan pendekatan ini, setiap kali Refresh Token digunakan untuk mendapatkan Access Token baru, server juga menerbitkan Refresh Token *baru* dan membatalkan yang lama. Jika penyerang menggunakan Refresh Token curian, server akan mendeteksi penggunaan ulang (reuse) tersebut dan dapat membatalkan semua token milik pengguna tersebut.
* **Pemisahan Rahasia (Secrets Separation):** Selalu gunakan kunci rahasia (secret key) yang berbeda untuk Access Token (`ACCESS_TOKEN_SECRET`) dan Refresh Token (`REFRESH_TOKEN_SECRET`) Anda.

---

## Kesimpulan

* Menggunakan Access Token yang berumur panjang adalah risiko keamanan. Mereka harus memiliki masa berlaku yang singkat.
* Refresh Token adalah token berumur panjang yang digunakan secara khusus untuk meminta Access Token baru ketika token yang lama kedaluwarsa.
* Server harus melacak Refresh Token mana saja yang valid (misalnya, di dalam database) sehingga server dapat mencabutnya jika diperlukan (seperti saat logout atau saat terjadi pelanggaran keamanan).
* Endpoint `/refresh` memverifikasi Refresh Token yang diberikan dan, jika valid, akan menerbitkan Access Token yang baru.

---

## Langkah Berikutnya

* Implementasikan penyimpanan Refresh Token menggunakan database nyata (seperti PostgreSQL dengan Prisma) daripada array in-memory.
* Pelajari cara menyimpan token secara aman di frontend menggunakan cookie `HttpOnly`.
* Eksplorasi pola keamanan tingkat lanjut seperti *Refresh Token Rotation*.

---

---
title: "Autentikasi dan Otorisasi Menggunakan JWT di Express.js"
description: "Materi ini membahas cara mengamankan aplikasi Express.js menggunakan JSON Web Token (JWT). Anda akan belajar bagaimana mengautentikasi pengguna saat login dan m"
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Autentikasi dan Otorisasi Menggunakan JWT di Express.js

## Ringkasan Singkat

Materi ini membahas cara mengamankan aplikasi Express.js menggunakan JSON Web Token (JWT). Anda akan belajar bagaimana mengautentikasi pengguna saat login dan mengotorisasi akses ke rute-rute yang dilindungi.

---

## Untuk Siapa Materi Ini

* Target pembaca: Developer Backend, Fullstack Developer
* Level pembaca: Menengah (Intermediate)

---

## Prasyarat

Sebaiknya Anda sudah memahami:

* Dasar-dasar Express.js (Routing dan Middleware)
* Konsep REST API dasar
* Pemahaman dasar tentang database dan pengambilan data pengguna (misal: Prisma atau ORM lainnya)

---

## Tujuan Belajar

Setelah membaca materi ini, Anda akan memahami:

* Perbedaan antara Autentikasi dan Otorisasi
* Konsep dasar JSON Web Token (JWT) dan strukturnya
* Cara membuat (sign) dan memverifikasi JWT di Express.js
* Cara membuat middleware otorisasi untuk melindungi rute API

---

## Konteks dan Motivasi

Dalam pengembangan aplikasi web modern, keamanan adalah aspek yang sangat krusial. Ketika membangun REST API dengan Express.js, server berjalan secara *stateless*. Artinya, server tidak menyimpan status login pengguna (session) secara default. Untuk mengatasi hal ini, JSON Web Token (JWT) menjadi standar industri yang aman dan efisien untuk memverifikasi identitas pengguna dan memastikan mereka memiliki hak akses ke resource tertentu tanpa membebani server dengan penyimpanan session. Memahami JWT adalah keterampilan fundamental yang wajib dimiliki oleh setiap developer backend.

---

## Materi Inti

### 1. Autentikasi vs Otorisasi

Banyak orang sering tertukar antara dua istilah ini:

* **Autentikasi (Authentication):** Menjawab pertanyaan *"Siapa Anda?"*. Ini adalah proses verifikasi identitas pengguna (contoh: mengecek kecocokan email dan password).
* **Otorisasi (Authorization):** Menjawab pertanyaan *"Apa yang boleh Anda lakukan?"*. Ini adalah proses mengecek apakah pengguna yang sudah terautentikasi memiliki izin untuk mengakses rute atau resource tertentu (contoh: mengecek apakah role pengguna adalah Admin).

### 2. Apa itu JSON Web Token (JWT)?

JWT adalah standar terbuka (RFC 7519) yang mendefinisikan cara ringkas dan mandiri untuk mengirimkan informasi secara aman antar pihak sebagai objek JSON. Informasi ini dapat diverifikasi dan dipercaya karena ditandatangani (signed) secara digital.

Sebuah JWT terdiri dari tiga bagian, yang dipisahkan oleh titik (`.`):

1. **Header:** Berisi jenis token dan algoritma signing yang digunakan (misal: HMAC SHA256 atau RSA).
2. **Payload:** Berisi klaim (claims) atau informasi entitas pengguna (misal: ID pengguna, email, role). Hindari menaruh informasi sensitif seperti password di sini.
3. **Signature:** Digunakan untuk memverifikasi bahwa pengirim token adalah yang sebenarnya dan bahwa pesan tidak diubah di tengah jalan. Dibuat dengan menggabungkan Header, Payload, dan sebuah *Secret Key*.

### 3. Alur Kerja JWT di Express

1. **Login:** Pengguna mengirimkan kredensial (email dan password).
2. **Validasi:** Server memvalidasi kredensial ke database.
3. **Pembuatan Token:** Jika valid, server membuat (sign) JWT yang berisi identitas pengguna dan mengembalikannya ke klien.
4. **Penyimpanan:** Klien menyimpan token ini (biasanya di LocalStorage, SessionStorage, atau HTTP-only Cookie).
5. **Permintaan Lanjutan:** Setiap kali klien meminta rute yang dilindungi, klien menyertakan JWT ini di header `Authorization` (dengan format `Bearer <token>`).
6. **Verifikasi:** Server memeriksa JWT melalui middleware. Jika valid, akses diberikan.

---

## Contoh / Ilustrasi

### Instalasi Package

Kita perlu menginstal `jsonwebtoken` untuk mengelola token.

```bash
npm install jsonwebtoken
```

### 1. Membuat Endpoint Login (Autentikasi)

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

const SECRET_KEY = 'rahasia_super_aman_anda'; // Dalam aplikasi nyata, gunakan process.env.JWT_SECRET

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Simulasi cek database (Anggap saja login berhasil)
  if (username === 'admin' && password === 'password123') {
    // 1. Siapkan payload
    const payload = {
      id: 1,
      username: 'admin',
      role: 'admin'
    };

    // 2. Buat token dengan masa berlaku 1 jam
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

    // 3. Kirim token ke pengguna
    return res.json({
      message: 'Login berhasil',
      token
    });
  }

  // Jika gagal, log error ke konsol (internal) dan kembalikan pesan umum (keamanan)
  console.error('Login gagal: Username atau password salah');
  res.status(401).json({ message: 'Kredensial tidak valid' });
});
```

### 2. Membuat Middleware Otorisasi

```javascript
// Middleware untuk memverifikasi token
const authenticateToken = (req, res, next) => {
  // Ambil header Authorization
  const authHeader = req.headers['authorization'];

  // Format token biasanya adalah "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.error('Akses ditolak: Token tidak disediakan');
    return res.status(401).json({ message: 'Akses ditolak, token tidak ada' });
  }

  // Verifikasi token
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.error('Token tidak valid atau kadaluarsa', err);
      return res.status(403).json({ message: 'Token tidak valid atau kadaluarsa' });
    }

    // Jika valid, simpan payload pengguna ke dalam req untuk rute selanjutnya
    req.user = user;
    next();
  });
};
```

### 3. Melindungi Rute dengan Middleware

```javascript
// Rute ini hanya bisa diakses jika ada token yang valid
app.get('/api/profile', authenticateToken, (req, res) => {
  // req.user berisi data dari JWT Payload (id, username, role)
  res.json({
    message: 'Selamat datang di profil Anda',
    user: req.user
  });
});

app.listen(3000, () => console.log('Server berjalan di port 3000'));
```

---

## Insight Penting

* **Rahasiakan Secret Key:** Jangan pernah menaruh *Secret Key* (kunci rahasia) secara hardcode di dalam source code, apalagi mengunggahnya ke repositori publik. Selalu gunakan variabel lingkungan (Environment Variables) seperti `process.env.JWT_SECRET`.
* **Payload Publik:** Informasi di bagian Payload pada JWT hanya di-*encode* (Base64), bukan dienkripsi. Siapa pun yang memiliki token Anda bisa mendekode dan membaca isinya. Oleh karena itu, jangan pernah menyimpan data sensitif seperti password, nomor kartu kredit, atau rahasia lainnya di dalam Payload JWT.
* **Masa Berlaku Token (Expiration):** Selalu tentukan waktu kedaluwarsa (`expiresIn`) saat membuat token. Token yang berlaku selamanya sangat berbahaya jika token tersebut dicuri (Token Hijacking). Praktik terbaik adalah memberikan masa berlaku token yang pendek dan menggunakan mekanisme *Refresh Token*.
* **Penanganan Error:** Sesuai standar keamanan, saat terjadi error verifikasi token, log detail aslinya menggunakan `console.error(err)` dan kembalikan respon generik (`401` atau `403`) agar tidak memberikan celah informasi kepada penyerang (Information Exposure).

---

## Ringkasan Akhir

* Autentikasi adalah verifikasi identitas, otorisasi adalah verifikasi hak akses.
* JWT (JSON Web Token) digunakan untuk mentransfer identitas antar entitas dengan aman dalam bentuk token terenkripsi (di bagian signature).
* `jwt.sign()` digunakan untuk menghasilkan token setelah pengguna berhasil masuk.
* Token dikirim dalam HTTP header, biasanya di `Authorization: Bearer <token>`.
* Middleware Express.js mengadopsi `jwt.verify()` untuk mencegat permintaan yang masuk, memverifikasi keabsahan token, dan memutuskan apakah rute diizinkan untuk diakses.

---

## Langkah Belajar Berikutnya

* Implementasi konsep *Refresh Token* untuk memperpanjang sesi JWT dengan aman.
* Integrasikan proses autentikasi JWT dengan ORM seperti Prisma untuk memverifikasi data riil dari database.
* Mempelajari cara hashing password dengan bcrypt sebelum memvalidasinya untuk autentikasi.

---

## Metadata

* Level: Intermediate
* Topik utama: Express.js, Authentication, Security
* Topik terkait: Middleware, JWT, Authorization
* Kata kunci: jwt, json web token, login, express, middleware, keamanan api
* Estimasi waktu baca: 10 menit

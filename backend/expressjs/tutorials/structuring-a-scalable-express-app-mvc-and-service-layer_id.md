---
title: "Menata Struktur Aplikasi Express.js yang Skalabel: MVC dan Service Layer"
description: "Materi ini membahas cara menata struktur aplikasi Express.js yang terus berkembang menggunakan pola arsitektur Model-View-Controller (MVC) yang diperkuat dengan"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Menata Struktur Aplikasi Express.js yang Skalabel: MVC dan Service Layer

## Ringkasan Singkat

Materi ini membahas cara menata struktur aplikasi Express.js yang terus berkembang menggunakan pola arsitektur Model-View-Controller (MVC) yang diperkuat dengan *Service Layer*. Anda akan belajar cara memisahkan routing, logika bisnis, dan akses database untuk menciptakan arsitektur backend yang mudah dipelihara, mudah diuji, dan skalabel.

## Untuk Siapa Materi Ini

- **Target pembaca:** Pengembang web tingkat menengah yang sedang membangun API dengan Express.js.
- **Level:** Menengah (Intermediate).

## Prasyarat

- Pemahaman tentang konsep dasar Express.js (Routing dan Middleware).
- Telah menyelesaikan [Memahami Routing dan Middleware Dasar di Express.js](Basic%20Routing%20and%20Middleware%20in%20Express_ID.md).
- Pemahaman dasar tentang asynchronous JavaScript dan RESTful API.

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan mampu:

- Memahami keterbatasan menaruh seluruh logika di dalam satu *route handler*.
- Menerapkan pola arsitektur MVC dalam konteks Express.js.
- Memperkenalkan *Service Layer* untuk mengisolasi logika bisnis utama.
- Mengatur struktur folder proyek untuk skalabilitas jangka panjang.
- Menulis kode yang lebih bersih dan lebih mudah untuk diuji secara otomatis.

## Konteks dan Motivasi

Saat baru mulai menggunakan Express.js, sangat umum untuk menaruh semuanya—validasi request, query database, logika bisnis, dan format response—langsung ke dalam callback `app.get()` atau `router.post()`. Meskipun cara ini berhasil untuk aplikasi sederhana, ia akan dengan cepat berubah menjadi mimpi buruk bernama "fat controller" (controller yang terlalu gemuk) seiring berkembangnya aplikasi. Kode menjadi sulit dibaca, mustahil digunakan ulang, dan sangat sulit untuk diuji.

Dengan mengadopsi arsitektur terstruktur seperti MVC bersama dengan *Service Layer*, Anda membagi tanggung jawab menjadi bagian-bagian yang jelas dan berbeda. *Controllers* menangani HTTP request, *Services* menangani "aturan bisnis", dan *Models* menangani penyimpanan data. Pemisahan fokus (*separation of concerns*) ini adalah rahasia untuk membangun aplikasi Node.js berskala besar yang siap untuk *enterprise*.

## Materi Inti

### 1. Masalah dengan "Fat Controllers"

Sebuah *anti-pattern* (praktik buruk) yang umum di Express.js adalah "fat controller", di mana sebuah *route handler* melakukan terlalu banyak hal:

```javascript
// Anti-pattern: Semuanya ditaruh di satu tempat
router.post('/register', async (req, res) => {
  try {
    // 1. Validasi
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ error: 'Email dan password dibutuhkan' });
    }

    // 2. Cek database
    const existingUser = await db.query('SELECT * FROM users WHERE email = ?', [req.body.email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User sudah ada' });
    }

    // 3. Logika bisnis (hashing password)
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // 4. Insert ke database
    const newUser = await db.query('INSERT INTO users (email, password) VALUES (?, ?)', [req.body.email, hashedPassword]);

    // 5. Format response
    res.status(201).json({ id: newUser.insertId, email: req.body.email });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

Kode ini sulit diuji tanpa memalsukan (*mocking*) seluruh siklus HTTP request/response dan database. Saatnya kita memecahnya.

### 2. Solusinya: Controllers, Services, dan Models

Untuk memperbaiki masalah controller yang terlalu gemuk, kita memisahkan logika ke dalam tiga lapisan berbeda:

1. **Routes (`routes/`)**: Mendefinisikan endpoint (URL) dan memetakannya ke controller tertentu.
2. **Controllers (`controllers/`)**: Menangani lapisan HTTP. Controller mengekstrak data dari request (`req.body`, `req.params`), mengopernya ke service, dan mengirimkan HTTP response (`res.status().json()`).
3. **Services (`services/`)**: Berisi logika bisnis inti. Service menerima data murni, memprosesnya, berinteraksi dengan Models, dan mengembalikan hasil. Lapisan ini *sama sekali tidak tahu* menahu soal HTTP request atau response.
4. **Models (`models/` atau `repositories/`)**: Menangani interaksi langsung dengan database (misal: query Prisma atau SQL murni).

### 3. Rekomendasi Struktur Folder

Struktur proyek yang skalabel akan terlihat seperti ini:

```text
src/
├── controllers/    # Penanganan Request/Response HTTP
│   └── user.controller.js
├── services/       # Logika Bisnis murni
│   └── user.service.js
├── routes/         # Definisi Rute API
│   └── user.routes.js
├── models/         # Skema/Query Database
│   └── user.model.js
├── middlewares/    # Middleware kustom (auth, error handler, dll)
└── app.js          # Pengaturan utama aplikasi Express
```

### 4. Langkah-langkah Refactoring

Mari kita ubah contoh sebelumnya menggunakan arsitektur baru kita.

**Langkah A: Lapisan Service (`services/user.service.js`)**

Service menangani *bagaimana* suatu proses dilakukan. Perhatikan bahwa tidak ada objek `req` atau `res` di sini.

```javascript
const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');

const registerUser = async (email, password) => {
  const existingUser = await userModel.findByEmail(email);
  if (existingUser) {
    throw new Error('User sudah ada');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await userModel.create(email, hashedPassword);

  return { id: newUser.id, email: newUser.email };
};

module.exports = {
  registerUser
};
```

**Langkah B: Lapisan Controller (`controllers/user.controller.js`)**

Controller menangani terjemahan proses HTTP-nya.

```javascript
const userService = require('../services/user.service');

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password dibutuhkan' });
    }

    // Panggil service, oper data murni
    const user = await userService.registerUser(email, password);

    res.status(201).json(user);
  } catch (error) {
    if (error.message === 'User sudah ada') {
      return res.status(400).json({ error: error.message });
    }
    // Oper error ke global error handler
    next(error);
  }
};

module.exports = {
  register
};
```

**Langkah C: Lapisan Route (`routes/user.routes.js`)**

Router hanya bertugas menyambungkan URL HTTP ke controller.

```javascript
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

router.post('/register', userController.register);

module.exports = router;
```

## Contoh / Ilustrasi

Bayangkan Anda sedang menjalankan sebuah restoran:

1. **Route adalah Menu:** Menu memberitahu pelanggan apa yang bisa mereka pesan (misal: `POST /order-pizza`).
2. **Controller adalah Pelayan:** Pelayan mencatat pesanan pelanggan (HTTP Request), memvalidasi bahwa pesanan masuk akal, dan membawanya ke dapur. Ketika makanan sudah siap, pelayan membawanya kembali ke meja (HTTP Response). Pelayan *tidak* memasak makanannya.
3. **Service Layer adalah Koki (Chef):** Koki menerima detail pesanan, mengikuti resep (logika bisnis), dan memutuskan bahan apa yang dibutuhkan. Koki tidak peduli bagaimana cara pelanggan memesan makanannya; ia hanya peduli cara membuatnya dengan benar.
4. **Model adalah Dapur/Kulkas:** Ini adalah tempat di mana bahan mentah (Database) disimpan dan diambil oleh sang koki.

## Insight Penting

- **Dapat Digunakan Ulang (*Reusability*):** Karena lapisan Services bersifat independen dari Express.js, Anda dapat menggunakan kembali logika `userService.registerUser` di *CLI tool*, *resolver* GraphQL, atau *cron job* tanpa harus mengubah kodenya.
- **Mudah Diuji (*Testability*):** Anda dapat dengan mudah melakukan *unit test* pada lapisan Service dengan mengoper variabel biasa (misal: `registerUser('test@test.com', 'password')`) tanpa memerlukan alat bantu seperti Supertest untuk memalsukan HTTP request.
- **Jaga Controller Tetap Ramping:** Aturan praktis yang baik adalah controller jarang sekali boleh melebihi 10-15 baris kode. Jika sebuah controller melakukan manipulasi data yang berat, segera pindahkan logika tersebut turun ke lapisan Service.

## Ringkasan Akhir

- "Fat controllers" mencampurkan logika HTTP, aturan bisnis, dan query database, membuat kode sulit dipelihara dan diuji.
- Lapisan Controller seharusnya hanya menangani HTTP request dan response.
- Lapisan Service seharusnya berisi logika bisnis murni, terpisah dari kerangka kerja web (Express).
- Menata aplikasi Anda ke dalam Routes, Controllers, Services, dan Models menjamin pemisahan fokus dan skalabilitas jangka panjang.

## Langkah Belajar Berikutnya

Sekarang setelah aplikasi Anda terstruktur dengan baik, Anda disarankan untuk mempelajari:

- [Data Validation and Error Handling in Express](Data%20Validation%20and%20Error%20Handling%20in%20Express_ID.md) (Untuk memindahkan validasi dari controller menggunakan middleware seperti Joi atau Zod).
- [Testing Express API with Jest and Supertest](Testing%20Express%20API%20with%20Jest%20and%20Supertest_ID.md) (Untuk melihat betapa mudahnya menguji fungsi-fungsi service yang sudah dipisahkan).

## Metadata

- **Level:** Menengah (Intermediate)
- **Topik utama:** Express.js, Backend Architecture
- **Topik terkait:** MVC, Service Layer, Refactoring, Clean Code
- **Kata kunci:** express folder structure, express mvc, express service layer, node architecture, fat controller
- **Estimasi waktu baca:** 10 - 15 menit

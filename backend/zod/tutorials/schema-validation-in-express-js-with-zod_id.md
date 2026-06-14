---
title: "Validasi Skema di Express JS dengan Zod"
description: "Materi ini berfokus pada penggunaan Zod, sebuah pustaka deklarasi dan validasi skema yang mengutamakan TypeScript, di dalam aplikasi Express.js. Anda akan mempe"
category: "backend"
technology: "zod"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Validasi Skema di Express JS dengan Zod

## Ringkasan Singkat

Materi ini berfokus pada penggunaan Zod, sebuah pustaka deklarasi dan validasi skema yang mengutamakan TypeScript, di dalam aplikasi Express.js. Anda akan mempelajari cara mendefinisikan skema validasi yang kuat untuk permintaan (request) yang masuk dan mengintegrasikannya dengan mulus sebagai middleware untuk meningkatkan keamanan dan keandalan API Anda.

## Untuk Siapa Materi Ini

- **Target Pembaca:** Developer backend tingkat menengah yang ingin menulis logika validasi yang lebih bersih dan andal.
- **Level:** Menengah.

## Prasyarat

- Pemahaman yang kuat tentang JavaScript dan Node.js.
- Pemahaman tentang konsep routing dan middleware di Express.js.
- Telah menyelesaikan tutorial [Data Validation and Error Handling in Express](Data%20Validation%20and%20Error%20Handling%20in%20Express.md).

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan dapat:

- Memahami keuntungan menggunakan pustaka validasi skema seperti Zod dibandingkan validasi manual.
- Mendefinisikan skema data menggunakan Zod untuk `req.body`, `req.query`, dan `req.params`.
- Membuat middleware Express yang dapat digunakan ulang (reusable) untuk memvalidasi permintaan masuk terhadap skema Zod.
- Mengekstrak tipe TypeScript langsung dari skema Zod (bagi pengguna TypeScript).
- Memformat dan menangani error validasi Zod dengan rapi.

## Konteks dan Motivasi

Pada tutorial sebelumnya tentang Validasi Data, kita belajar bahwa validasi manual dengan pernyataan `if-else` bisa menjadi sangat panjang dan sulit dikelola, terutama saat berhadapan dengan objek bersarang yang kompleks. Bayangkan memeriksa sebuah objek dengan 10 field, di mana masing-masing memiliki persyaratan tipe, panjang, dan format yang berbeda.

Zod menyelesaikan masalah ini dengan memungkinkan Anda mendefinisikan sebuah "skema"—cetak biru tentang bagaimana seharusnya bentuk data Anda—dengan cara yang ringkas dan mudah dibaca. Kemudian secara otomatis memeriksa apakah data yang masuk cocok dengan cetak biru tersebut. Zod sangat disukai di ekosistem JavaScript/TypeScript modern karena ramah developer, menghilangkan kode boilerplate, dan memberikan pengalaman developer (DX) yang sangat baik. Dengan mengintegrasikan Zod ke dalam aplikasi Express Anda, Anda memastikan integritas data sebelum data tersebut mencapai logika bisnis inti atau database Anda.

## Materi Inti

### 1. Apa itu Zod?

Zod adalah pustaka deklarasi dan validasi skema. Anda mendefinisikan bentuk data Anda sekali, dan Zod menangani baik validasi (memeriksa apakah data sudah benar) maupun parsing (mengubah data, seperti mengubah string menjadi angka).

### 2. Menginstal Zod

Untuk menggunakan Zod dalam proyek Anda, instal melalui npm:

```bash
npm install zod
```

### 3. Mendefinisikan Skema Zod

Sebuah skema mendefinisikan struktur yang diharapkan dan aturan-aturan untuk data Anda. Berikut adalah contoh skema registrasi pengguna:

```javascript
const { z } = require('zod');

const registerSchema = z.object({
  username: z.string().min(3, 'Username minimal harus 3 karakter'),
  email: z.string().email('Format email tidak valid'),
  age: z.number().int().min(18, 'Usia minimal harus 18 tahun').optional(),
  password: z.string().min(8, 'Password minimal harus 8 karakter')
});
```

### 4. Memvalidasi Data dengan Zod

Zod menyediakan metode seperti `.parse()` dan `.safeParse()`.

- `.parse(data)`: Mengembalikan data yang tervalidasi atau melemparkan (throw) error jika validasi gagal.
- `.safeParse(data)`: Mengembalikan objek berisi boolean `success`. Jika true, data tersedia di `.data`. Jika false, detail error ada di `.error`. Untuk middleware Express, menggunakan `.parse()` di dalam blok `try/catch` atau memeriksa hasil dari `.safeParse()` adalah pendekatan yang sama-sama baik.

### 5. Membuat Middleware Validasi yang Dapat Digunakan Ulang

Alih-alih memanggil `.parse()` secara manual di setiap rute, kita dapat membuat sebuah middleware factory yang menerima skema Zod dan memvalidasi permintaan.

```javascript
// middleware/validate.js
const validate = (schema) => (req, res, next) => {
  try {
    // Kita memvalidasi request body berdasarkan skema yang diberikan
    schema.parse(req.body);
    next();
  } catch (error) {
    // Jika validasi gagal, Zod melempar ZodError
    return res.status(400).json({
      error: 'Validasi gagal',
      details: error.errors // Berisi pesan error untuk setiap field secara spesifik
    });
  }
};

module.exports = validate;
```

### 6. Menerapkan Middleware pada Rute

Sekarang, Anda dapat dengan mudah melindungi rute Anda dengan memasang middleware validasi tersebut.

```javascript
const express = require('express');
const { z } = require('zod');
const validate = require('./middleware/validate');

const app = express();
app.use(express.json()); // Penting untuk parsing JSON body

// Definisikan skema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

// Gunakan middleware di dalam rute
app.post('/api/login', validate(loginSchema), (req, res) => {
  // Jika kode sampai ke sini, kita 100% yakin req.body memiliki email dan password yang valid
  const { email, password } = req.body;
  res.json({ message: 'Login berhasil', email });
});
```

## Contoh / Ilustrasi

Bayangkan Anda sedang mengelola klub eksklusif dengan aturan berpakaian dan daftar anggota yang ketat.

- **Validasi Manual:** Penjaga pintu (bouncer) melihat Anda, meminta ID Anda, menghitung usia Anda, memeriksa sepatu Anda, memeriksa kemeja Anda, dan jika ada yang salah, ia memberi tahu alasannya. Ia melakukan ini secara manual untuk setiap orang, mengikuti daftar periksa di kepalanya yang bisa menjadi berantakan.
- **Validasi Zod:** Penjaga pintu tersebut memiliki alat pemindai (scanner) berteknologi tinggi dengan pengaturan yang sudah ditentukan ("Harus >18, memakai sepatu formal, memegang tiket VIP"). Anda berjalan melewati pemindai. Jika Anda tidak cocok persis dengan pengaturannya, alat itu langsung berbunyi dan mencetak tiket yang menyebutkan dengan tepat apa kekurangan Anda. Zod adalah alat pemindai berteknologi tinggi untuk data API Anda.

## Insight Penting

- **Safe Parsing vs. Throwing Errors:** Menggunakan `.parse()` akan melempar error, yang harus Anda tangkap (biasanya di dalam blok try-catch). Menggunakan `.safeParse()` tidak melempar error; melainkan mengembalikan sebuah objek hasil. Keduanya valid, tetapi menggunakan `.parse()` di dalam middleware yang dibungkus `try/catch` adalah pola yang sangat umum dan bersih.
- **Memvalidasi Bagian Request Lainnya:** Anda tidak terbatas hanya pada `req.body`. Anda dapat memvalidasi `req.query` (untuk parameter pencarian atau paginasi) dan `req.params` (seperti ID pada URL). Anda bahkan bisa menulis middleware yang memvalidasi ketiganya sekaligus.
- **Membuang Kunci Tidak Dikenal (Strip Unknown Keys):** Secara default, Zod mengabaikan kunci (key) ekstra yang tidak didefinisikan dalam skema objek. Ini baik untuk keamanan (mencegah prototype pollution atau injeksi data yang tidak terduga). Anda dapat menegakkan aturan yang lebih ketat dengan menggunakan `.strict()`, yang membuat validasi gagal jika ada kunci tambahan yang tidak dikenal.

## Ringkasan Akhir

- Zod adalah alat yang kuat untuk menggantikan validasi data manual yang rumit.
- Anda mendefinisikan skema yang mendeskripsikan bentuk dan aturan yang tepat dari data yang Anda harapkan.
- Dengan membungkus validasi Zod di dalam sebuah middleware Express, Anda menjaga handler rute Anda tetap bersih dan hanya fokus pada logika bisnis.
- Ini secara signifikan meningkatkan keandalan API dengan menangkap request yang buruk sejak awal.

## Langkah Belajar Berikutnya

Sekarang karena Anda dapat menjamin bentuk data yang masuk, Anda dapat dengan aman melanjutkan ke:

- [Express With Prisma](Express%20With%20Prisma.md) (Pelajari cara menyimpan data yang sudah divalidasi ini dengan aman ke dalam database).
- Jelajahi fitur Zod tingkat lanjut seperti *custom refinements*, validasi regex, dan transformasi data selama validasi.

## Metadata

- Level: Menengah
- Topik utama: Express.js, Backend Development
- Topik terkait: Validation, Zod, Middleware, Security
- Kata kunci: express zod validation, validasi skema, zod middleware, keamanan api
- Estimasi waktu baca: 8 - 12 menit

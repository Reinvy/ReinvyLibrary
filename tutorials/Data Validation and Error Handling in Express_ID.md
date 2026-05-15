# Validasi Data dan Penanganan Error Terpusat di Express.js

## Ringkasan Singkat

Materi ini membahas pentingnya memvalidasi data yang masuk dari *client* sebelum diproses oleh aplikasi, serta cara menangani *error* secara terpusat dan aman. Anda akan belajar cara mencegah *bug* dan melindungi sistem dari kebocoran informasi melalui teknik *error handling* yang benar.

## Untuk Siapa Materi Ini

- **Target Pembaca:** *Developer backend* pemula hingga menengah.
- **Level:** Menengah (Intermediate).

## Prasyarat

- Memahami dasar JavaScript (terutama *callback* dan penanganan *promise*/*async-await*).
- Telah memahami konsep *Routing* dan *Middleware* di Express.js.
- Memiliki pemahaman dasar tentang HTTP *Methods* dan HTTP *Status Codes*.

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan mampu:

- Memahami mengapa validasi data sangat penting di sisi server (*backend*).
- Menerapkan validasi dasar pada data yang masuk melalui *request* (`req.body`, `req.query`, atau `req.params`).
- Membangun *middleware error handling* terpusat di Express.js.
- Menjaga keamanan aplikasi dengan mencatat *error* secara internal dan mengembalikan pesan generik kepada *client*.

## Konteks dan Motivasi

Dalam pengembangan *web*, kita tidak boleh pernah mempercayai data yang dikirimkan oleh pengguna ("*Never trust user input*"). Pengguna bisa saja mengirimkan format *email* yang salah, tipe data yang tidak sesuai, atau bahkan kode berbahaya yang dapat merusak *database* kita. Oleh karena itu, validasi data adalah lapisan pertahanan pertama.

Selain itu, saat *error* terjadi—entah karena kesalahan input atau masalah server seperti koneksi *database* yang terputus—aplikasi Express.js standar seringkali membocorkan jejak kode (*stack trace*) ke *client*. Hal ini sangat berbahaya karena membuka celah informasi bagi peretas (*Information Exposure*). Kita butuh mekanisme terpusat untuk menangkap *error* dan menangani balasan secara aman.

## Materi Inti

### 1. Pentingnya Validasi Data

Validasi data bertujuan memastikan bahwa *request* yang diterima aplikasi memiliki format dan tipe data yang sesuai dengan ekspektasi sebelum sistem menghabiskan sumber daya (seperti query ke *database*).
Jika sebuah data harus berupa nomor telepon (angka), sistem harus menolak *request* sejak awal apabila yang dikirimkan adalah huruf. Anda dapat memvalidasi data secara manual dengan `if-else`, atau menggunakan *library* validasi khusus seperti `Zod`, `Joi`, atau `express-validator`.

### 2. Validasi Data Sederhana di Express

Berikut adalah contoh validasi manual di dalam *route handler* sebelum data diproses:

```javascript
app.post('/api/users', (req, res) => {
  const { username, age } = req.body;

  // Validasi manual
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username wajib diisi dan harus berupa teks.' });
  }

  if (typeof age !== 'number' || age < 18) {
    return res.status(400).json({ error: 'Umur minimal adalah 18 tahun dan harus berupa angka.' });
  }

  // Jika lolos validasi, lanjutkan proses (misal simpan ke database)
  res.status(201).json({ message: 'User berhasil dibuat!' });
});
```

### 3. Penanganan Error di Express (*Error Handling*)

Dalam Express.js, jika sebuah *route* mengalami *error* (misalnya proses asinkron gagal), aplikasi dapat berhenti (*crash*) atau mengirimkan respons *error default* berupa format HTML beserta *stack trace*-nya.
Untuk menghindari hal ini, Express menyediakan *Error Handling Middleware*.

*Middleware* ini unik karena menerima 4 argumen: `(err, req, res, next)`.
Express akan otomatis mengenali *middleware* dengan 4 argumen ini sebagai *error handler*.

### 4. Menerapkan Penanganan Error Terpusat yang Aman

Sesuai dengan praktik terbaik keamanan, kita harus menghindari *Information Exposure*. Saat terjadi kegagalan sistem internal, kita tidak boleh mengirimkan detail kegagalan ke pengguna.

Langkah yang benar adalah:

1. Catat detail *error* secara internal (menggunakan `console.error` atau *logger* seperti Winston).
2. Kirim pesan generik seperti "Internal Server Error" ke *client*.

**Contoh Implementasi:**

```javascript
const express = require('express');
const app = express();

app.get('/data', async (req, res, next) => {
  try {
    // Simulasi error saat mengambil data dari database
    throw new Error('Database Timeout at 10.0.0.5');
  } catch (error) {
    // Melempar error ke middleware error handler
    next(error);
  }
});

// ERROR HANDLING MIDDLEWARE TERPUSAT
// Selalu letakkan di bagian paling bawah, setelah semua app.use() dan route lain
app.use((err, req, res, next) => {
  // 1. Log error lengkap HANYA di sisi server (aman)
  console.error('[ERROR TERPUSAT]:', err.message);

  // 2. Kirim balasan generik ke client
  res.status(500).json({
    error: 'Internal Server Error. Terjadi masalah pada server, silakan coba lagi nanti.'
  });
});

app.listen(3000, () => console.log('Server berjalan...'));
```

## Contoh / Ilustrasi

Bayangkan aplikasi Anda adalah sebuah **Pabrik Roti**.

1. **Validasi Data:** Ini adalah pos pemeriksaan bahan baku. Jika tepung yang datang ternyata adalah pasir, petugas (*validator*) langsung menolak kiriman tersebut sebelum pasir masuk ke mesin pengaduk.
2. **Error Handling Terpusat:** Misalkan sebuah mesin rusak di dalam pabrik sehingga produksi berhenti. Mandor (sistem log internal) akan mencatat detail mesin mana yang rusak ("Mesin pengaduk B patah baut"). Namun, satpam di depan (respons server) hanya memberi tahu pembeli, *"Mohon maaf, toko sedang mengalami gangguan teknis."* tanpa perlu menjelaskan urusan baut patah di dalam mesin.

## Insight Penting

- **Jangan Tunda Validasi:** Lakukan validasi seawal mungkin dalam alur *request*. Jangan menyentuh *database* atau *API* eksternal sebelum data dipastikan bersih (*sanitized*) dan valid.
- **Fungsi `next(err)`:** Dalam fungsi *asynchronous* (`async/await`), jika terjadi *error*, Anda **wajib** menangkapnya dengan `try...catch` dan melempar *error* tersebut menggunakan `next(err)` agar bisa ditangkap oleh *error handler* terpusat.
- **Keamanan Data:** Mengekspos log *error* asli (seperti kueri SQL gagal, IP *database*, atau rahasia *environment*) melalui *response API* sangat membantu *hacker* untuk meretas sistem Anda.

## Ringkasan Akhir

- Validasi data memastikan input dari *client* benar, aman, dan sesuai harapan sebelum diproses.
- Express memiliki *Error Handling Middleware* khusus dengan *signature* 4 argumen `(err, req, res, next)`.
- Praktik terbaik untuk keamanan adalah dengan mencatat detail *error* secara internal di *server*, sementara *client* hanya menerima pesan *error* umum (*generic message*).

## Langkah Belajar Berikutnya

Setelah memahami alur data yang valid dan penanganan *error*, langkah yang tepat selanjutnya adalah:

- [Express With Prisma](Express%20With%20Prisma.md) (Mempelajari integrasi *database* dengan asumsi data Anda sudah tervalidasi).
- Mempelajari *library* validasi skema modern seperti **Zod** atau **Joi** untuk Express.js (Materi Lanjutan).

## Metadata

- **Level:** Menengah
- **Topik utama:** Express.js, Backend Development
- **Topik terkait:** Validasi, Error Handling, Security, Middleware
- **Kata kunci:** express validation, error handling middleware, express security, information exposure
- **Estimasi waktu baca:** 8 - 10 menit

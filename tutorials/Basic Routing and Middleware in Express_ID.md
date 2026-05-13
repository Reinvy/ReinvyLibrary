# Memahami Routing dan Middleware Dasar di Express.js

## Ringkasan Singkat

Materi ini membahas konsep fundamental dalam Express.js: *Routing* (pengaturan rute) dan *Middleware* (perantara). Anda akan belajar bagaimana mengatur alur data dari *request* masuk hingga *response* keluar, serta bagaimana menyisipkan logika tambahan di tengah-tengah proses tersebut dengan cara yang terstruktur.

## Untuk Siapa Materi Ini

- **Target pembaca:** Pengembang web pemula hingga menengah.
- **Level:** Dasar (Foundation).

## Prasyarat

- Pemahaman dasar tentang JavaScript (terutama *callback* dan *arrow function*).
- Telah mengikuti materi [Install Express JS](Install%20Express%20JS.md) dan berhasil menjalankan server Express.js pertama.
- Memahami konsep dasar HTTP Method (GET, POST, PUT, DELETE).

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan mampu:

- Mengerti bagaimana Express.js menangani berbagai jenis rute URL.
- Memisahkan rute ke dalam file yang berbeda menggunakan `express.Router()`.
- Memahami konsep, siklus hidup, dan cara kerja *middleware*.
- Membuat *middleware* kustom sederhana, seperti pencatat log (*logger*).
- Menerapkan praktik terbaik dalam menangani error pada rute (menghindari eksposur informasi sistem).

## Konteks dan Motivasi

Dalam membangun aplikasi web yang nyata, Anda tidak akan menaruh semua logika kode di dalam satu file `app.js`. Seiring bertambahnya fitur, Anda membutuhkan cara untuk mengatur jalan pintas (*routes*) secara rapi dan modular. Di sinilah *Routing* masuk.

Selanjutnya, seringkali Anda perlu melakukan pengecekan sebelum sebuah rute dieksekusi (misal: "Apakah user ini sudah login?", "Apakah data yang dikirim valid?"). Alih-alih mengulang kode pengecekan di setiap rute, Express.js menggunakan konsep **Middleware**. Menguasai dua hal ini adalah kunci untuk membangun API dan aplikasi Express yang *scalable* dan rapi.

## Materi Inti

### 1. Apa itu Routing?

*Routing* merujuk pada bagaimana aplikasi merespons permintaan (*request*) dari *client* menuju *endpoint* tertentu, yang terdiri dari URI (atau path) dan metode permintaan HTTP (GET, POST, dll).

Struktur dasar sebuah *route* di Express:

```javascript
app.METHOD(PATH, HANDLER)
```

- `app` adalah *instance* dari express.
- `METHOD` adalah metode HTTP (get, post, put, delete, dll) dalam huruf kecil.
- `PATH` adalah path/rute di server (misalnya `/`, `/users`, `/produk`).
- `HANDLER` adalah fungsi (*callback*) yang dieksekusi ketika rute tersebut diakses.

### 2. Menggunakan `express.Router`

Untuk aplikasi besar, mendefinisikan rute di `app.js` akan membuatnya penuh sesak. Express menyediakan `express.Router` untuk membuat *handler* rute modular yang bisa dipasang dan dilepas.

**Contoh: Membuat rute untuk pengguna (`routes/users.js`)**

```javascript
const express = require('express');
const router = express.Router();

// Rute ini akan merespons GET /users/
router.get('/', (req, res) => {
  res.send('Menampilkan daftar pengguna');
});

// Rute ini akan merespons POST /users/
router.post('/', (req, res) => {
  res.send('Menambahkan pengguna baru');
});

module.exports = router;
```

**Memasang rute di `app.js`:**

```javascript
const express = require('express');
const app = express();
const usersRouter = require('./routes/users');

// Hubungkan rute /users ke usersRouter
app.use('/users', usersRouter);

app.listen(3000, () => console.log('Server berjalan di port 3000'));
```

### 3. Apa itu Middleware?

Bayangkan *middleware* sebagai "satpam" atau "penerjemah" yang berdiri di antara *Request* yang datang dan *Response* yang akan dikirim.

*Middleware* adalah fungsi yang memiliki akses ke objek *request* (`req`), objek *response* (`res`), dan fungsi *middleware* selanjutnya (biasanya diberi nama `next`) dalam siklus hidup permintaan/respons.

Fungsi *middleware* dapat melakukan tugas berikut:

1. Menjalankan kode apa pun.
2. Mengubah objek request dan response (misal: menambahkan data user setelah verifikasi token).
3. Mengakhiri siklus request-response (misal: jika user belum login, langsung tolak dengan kode 401).
4. Memanggil *middleware* selanjutnya dalam tumpukan menggunakan fungsi `next()`.

### 4. Membuat Middleware Kustom

Mari kita buat *middleware* pencatat log sederhana. *Middleware* ini akan mencetak waktu setiap kali ada *request* masuk.

```javascript
const express = require('express');
const app = express();

// Fungsi Middleware
const loggerMiddleware = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] Request ke: ${req.url}`);

  // WAJIB: Panggil next() agar proses lanjut ke middleware/route berikutnya
  next();
};

// Pasang middleware secara global (berlaku untuk semua rute)
app.use(loggerMiddleware);

app.get('/', (req, res) => {
  res.send('Halo dari Express!');
});

app.listen(3000);
```

### 5. Penanganan Error yang Aman (Best Practice)

Ketika terjadi kesalahan dalam kode Anda, sangat berbahaya jika Anda langsung mengirimkan detail error sistem ke klien (disebut *Information Exposure*). Ini dapat dimanfaatkan oleh peretas.

Praktik terbaik: Catat (*log*) detail error secara internal (di server), lalu kembalikan pesan *error* generik ke pengguna.

```javascript
app.get('/data-rahasia', (req, res) => {
  try {
    // Simulasi error saat mengakses database
    throw new Error('Database connection failed: Timeout at 192.168.1.100');
  } catch (error) {
    // 1. Log error detail hanya di server untuk keperluan debugging (aman)
    console.error('[ERROR INTERNAL]', error);

    // 2. Kembalikan pesan generik ke klien (tanpa mengekspos IP atau detail)
    res.status(500).send('Internal Server Error. Silakan coba lagi nanti.');
  }
});
```

## Contoh / Ilustrasi

Bayangkan Anda sedang memasuki sebuah gedung perkantoran mewah (Aplikasi Express Anda).

1. **Pintu Utama (Router Utama):** Tempat semua orang masuk.
2. **Resepsionis (Middleware Authentication):** Sebelum masuk ke lorong (`/admin`), resepsionis mengecek ID Anda. Jika ID salah, Anda tidak diizinkan masuk dan langsung disuruh pulang (`res.send('Unauthorized')`). Jika benar, resepsionis mempersilakan Anda lanjut (`next()`).
3. **Lorong Lantai 3 (Router `/admin`):** Anda diarahkan ke tempat yang spesifik sesuai tujuan Anda.
4. **Ruang Rapat (Handler Akhir):** Tempat Anda akhirnya diterima dan dilayani sesuai keperluan Anda (`res.send('Selamat datang Admin')`).

## Insight Penting

- **Jangan Lupa `next()`**: Kesalahan paling umum pemula adalah lupa memanggil `next()` di dalam fungsi *middleware*. Jika `next()` tidak dipanggil dan `res.send()` juga tidak dilakukan, permintaan dari klien akan "menggantung" (*hanging/timeout*).
- **Urutan itu Krusial**: Express mengeksekusi *middleware* secara berurutan (*top-to-bottom*) sesuai urutan Anda menuliskan `app.use()`. Pastikan *middleware* keamanan (seperti verifikasi token) diletakkan *sebelum* rute yang memerlukan perlindungan.
- **Keamanan Informasi**: Selalu ikuti prinsip "Log detail internally, return generic safely" untuk menghindari bocornya arsitektur sistem Anda ke dunia luar.

## Ringkasan Akhir

- *Routing* digunakan untuk mengarahkan permintaan dari *client* (URL & Method) ke kode yang tepat (*handler*).
- `express.Router()` membantu merapikan aplikasi dengan memecah rute menjadi modul-modul terpisah.
- *Middleware* adalah fungsi yang berada di tengah-tengah alur request/response, berguna untuk log, autentikasi, modifikasi *request*, dan sebagainya.
- Penanganan error yang aman wajib dilakukan di sisi server untuk melindungi informasi sensitif.

## Langkah Belajar Berikutnya

Setelah Anda memahami Routing dan Middleware, Anda siap untuk:

- [Integrasi Express dengan Multer](Express%20With%20Multer.md) (Untuk belajar mengunggah file).
- [Integrasi Express dengan Prisma](Express%20With%20Prisma.md) (Untuk menghubungkan API Anda dengan Database).

## Metadata

- **Level:** Dasar (Foundation)
- **Topik utama:** Express.js, Backend Development
- **Topik terkait:** Routing, Middleware, Web API
- **Kata kunci:** express router, express middleware, next function, node.js, api error handling
- **Estimasi waktu baca:** 7 - 10 menit

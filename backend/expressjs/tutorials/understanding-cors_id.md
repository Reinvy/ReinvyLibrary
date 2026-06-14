---
title: "Memahami CORS di Express JS"
description: "Materi ini menjelaskan Cross-Origin Resource Sharing (CORS), alasan mengapa browser menerapkannya, dan cara mengonfigurasinya dengan mudah serta aman di dalam a"
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Memahami CORS di Express JS

## Ringkasan Singkat

Materi ini menjelaskan Cross-Origin Resource Sharing (CORS), alasan mengapa browser menerapkannya, dan cara mengonfigurasinya dengan mudah serta aman di dalam aplikasi Express.js Anda. Anda akan belajar bagaimana mengizinkan aplikasi frontend di domain yang berbeda untuk berkomunikasi dengan API backend Anda.

---

## Untuk Siapa Materi Ini

* **Target pembaca:** Developer frontend yang sedang mempelajari backend, dan developer backend yang membangun API untuk dikonsumsi oleh single-page applications (SPA) modern.
* **Level pembaca:** Pemula hingga Menengah.

---

## Prasyarat

Sebelum memulai materi ini, Anda sebaiknya sudah memahami:

* Dasar-dasar JavaScript.
* Cara membuat server Express sederhana (lihat "Basic Routing and Middleware in Express").
* Apa itu HTTP method dan HTTP header.

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Konsep Same-Origin Policy (SOP) dan mengapa kebijakan ini ada.
* Apa itu CORS dan bagaimana cara ia menyelesaikan masalah komunikasi lintas domain.
* Cara menginstal dan mengonfigurasi middleware `cors` di Express.js.
* Perbedaan antara *simple request* dan *preflight request* (`OPTIONS`).
* Best practice untuk mengonfigurasi CORS secara aman di lingkungan *production*.

---

## Konteks dan Motivasi

Dalam pengembangan web modern, sangat umum untuk memisahkan frontend dan backend. Sebagai contoh, aplikasi React Anda mungkin di-*host* di `https://my-frontend.com` sementara API Express.js Anda berada di `https://api.my-backend.com`.

Ketika frontend Anda mencoba mengambil data dari API Anda, browser akan turun tangan dan memblokir *request* tersebut secara *default*. Ini disebabkan oleh mekanisme keamanan yang disebut **Same-Origin Policy (SOP)**.

CORS adalah mekanisme standar yang memberi tahu browser, "Tidak apa-apa, backend ini secara eksplisit mengizinkan *request* dari frontend ini." Memahami CORS adalah tahap wajib bagi setiap developer *full-stack* atau *backend*, karena "error CORS" adalah salah satu kendala paling umum saat menghubungkan antar aplikasi.

---

## Materi Inti

### 1. Same-Origin Policy (SOP)

Same-Origin Policy adalah konsep keamanan fundamental yang diimplementasikan oleh browser web. Kebijakan ini mendikte bahwa sebuah halaman web hanya dapat meminta sumber daya (*resources*) dari **origin (asal) yang sama** yang menyajikan halaman tersebut.

Sebuah "origin" ditentukan oleh kombinasi tiga hal:

1. **Protokol** (contoh: `http://`, `https://`)
2. **Domain** (contoh: `localhost`, `example.com`)
3. **Port** (contoh: `:3000`, `:8080`)

Jika salah satu dari ketiga hal ini berbeda antara frontend dan backend, maka itu dianggap sebagai **Cross-Origin** *request*.

### 2. Apa itu CORS?

Cross-Origin Resource Sharing (CORS) adalah mekanisme berbasis HTTP-header yang memungkinkan server untuk menunjukkan origin (domain, skema, atau port) selain miliknya sendiri dari mana browser harus mengizinkan pemuatan sumber daya.

Ketika *cross-origin request* dibuat, browser mengharapkan server merespons dengan header CORS tertentu (seperti `Access-Control-Allow-Origin`). Jika header ini hilang atau tidak cocok dengan origin frontend, browser akan melemparkan *error* CORS dan menyembunyikan respons dari kode frontend.

### 3. Simple vs. Preflight Request

Browser menangani *cross-origin request* dengan dua cara utama:

* **Simple Request:** *Request* standar seperti `GET` atau `POST` dengan header dasar. Browser mengirimkan *request*, dan jika server merespons dengan header CORS yang benar, browser mengizinkan frontend untuk membaca respons tersebut.
* **Preflight Request:** Untuk *request* yang kompleks (contoh: menggunakan `PUT`, `DELETE`, atau mengirim data `application/json`), browser terlebih dahulu mengirimkan *request* `OPTIONS` ke server. Ini adalah pemeriksaan "preflight" yang bertanya kepada server, "Apakah Anda mengizinkan *request* spesifik ini?". Jika server menyetujui, browser kemudian mengirimkan *request* yang sebenarnya.

### 4. Menangani CORS di Express.js

Meskipun Anda bisa mengatur header CORS secara manual menggunakan `res.setHeader()`, Express menyediakan *middleware* khusus yang sangat mudah dikonfigurasi bernama `cors` yang membuat proses ini menjadi sangat mudah.

---

## Contoh / Ilustrasi

### Langkah 1: Instalasi

Pertama, instal paket `cors` via npm:

```bash
npm install cors
```

### Langkah 2: Konfigurasi Dasar (Mengizinkan Semua Origin)

Cara paling sederhana untuk menggunakan CORS adalah mengizinkan *request* dari *semua* origin. **Peringatan: Ini hanya direkomendasikan untuk API publik atau pengembangan lokal.**

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Aktifkan CORS untuk semua rute dan semua origin
app.use(cors());

app.get('/api/data', (req, res) => {
    res.json({ message: 'Data ini dapat diakses dari domain mana saja!' });
});

app.listen(3000, () => {
    console.log('Server berjalan pada port 3000');
});
```

### Langkah 3: Konfigurasi Aman (Mengizinkan Origin Tertentu)

Di lingkungan *production*, Anda harus membatasi CORS untuk hanya mengizinkan *request* dari aplikasi frontend terpercaya Anda.

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Definisikan daftar origin terpercaya (whitelist)
const whitelist = ['https://my-frontend.com', 'http://localhost:5173'];

const corsOptions = {
    origin: function (origin, callback) {
        // Izinkan request tanpa origin (seperti aplikasi mobile atau request curl)
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Tidak diizinkan oleh CORS'));
        }
    },
    // Opsional: Izinkan cookies dikirim secara cross-origin
    credentials: true,
    // Opsional: Tentukan HTTP method apa saja yang diizinkan
    methods: ['GET', 'POST', 'PUT', 'DELETE']
};

// Terapkan konfigurasi CORS terbatas
app.use(cors(corsOptions));

app.get('/api/secure-data', (req, res) => {
    res.json({ message: 'Hanya origin terpercaya yang dapat melihat ini.' });
});

app.listen(3000, () => console.log('Server aman berjalan'));
```

---

## Insight Penting

* **CORS melindungi Browser, bukan Server:** Miskonsepsi umum adalah bahwa CORS mengamankan API Anda. Tidak. Alat seperti Postman atau `curl` tidak menerapkan CORS; mereka akan selalu bisa mengenai API Anda. CORS murni mencegah *website berbahaya di browser pengguna* dari membuat *request* yang tidak sah ke server Anda atas nama pengguna.
* **Bahaya Wildcard `*`:** Jangan pernah menggunakan `Access-Control-Allow-Origin: *` jika aplikasi Anda membutuhkan cookies atau kredensial autentikasi (menggunakan `credentials: true`). Browser secara eksplisit akan memblokir kombinasi ini untuk alasan keamanan.
* **Menangani Error Preflight:** Jika Anda melihat *request* `OPTIONS` gagal di *network tab* Anda, itu berarti server Anda tidak dikonfigurasi dengan benar untuk menangani *preflight request* untuk rute atau *method* spesifik tersebut. Middleware `cors` biasanya menangani ini secara otomatis saat diterapkan secara global via `app.use()`.

---

## Ringkasan Akhir

* SOP (Same-Origin Policy) memblokir aplikasi frontend dari memanggil API backend di domain yang berbeda secara *default*.
* CORS adalah cara standar untuk merelaksasi kebijakan ini dengan aman.
* Browser menggunakan *request* Preflight (`OPTIONS`) untuk memeriksa izin sebelum mengirim *request* yang kompleks.
* Middleware `cors` di Express menyederhanakan manajemen header.
* Selalu gunakan daftar origin (whitelist) di *production* daripada mengizinkan semua origin (`*`).

---

## Langkah Belajar Berikutnya

Sekarang API Anda dapat berkomunikasi dengan aman dengan aplikasi frontend, Anda siap untuk mempelajari tentang:

* **Deploying Express JS Applications to Production:** Pelajari cara meng-*host* API dan frontend Anda dengan aman.
* **Express JS Security Best Practices:** Selami lebih dalam untuk melindungi server Anda dengan alat seperti Helmet dan Rate Limiting.

---

## Metadata

* Level: Pemula
* Topik utama: Express JS
* Topik terkait: Keamanan, Middleware, Web Browser
* Kata kunci: express, cors, api, cross-origin, keamanan
* Estimasi waktu baca: 10 menit

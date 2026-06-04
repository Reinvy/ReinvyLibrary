# Implementing OAuth 2.0 Authentication in Express JS with Passport

## Ringkasan Singkat

Materi ini membahas cara mengimplementasikan autentikasi OAuth 2.0 pada aplikasi Express.js menggunakan library Passport.js. Anda akan mempelajari cara mengintegrasikan login sosial (khususnya Google OAuth), mengelola sesi pengguna, dan menangani alur autentikasi secara aman.

---

## Untuk Siapa Materi Ini

* Target pembaca: Backend Developer, Fullstack Developer
* Level pembaca: Menengah (Intermediate)

---

## Prasyarat

Untuk memahami materi ini dengan baik, Anda sebaiknya sudah menguasai:

* Dasar-dasar routing dan middleware pada Express.js.
* Pemahaman umum tentang konsep autentikasi.
* Familiar dengan penggunaan Cookie dan Session di Express.js.

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Konsep inti dari alur kerja (flow) OAuth 2.0.
* Cara mengkonfigurasi Passport.js untuk autentikasi OAuth 2.0 di Express.js.
* Cara mendaftarkan dan menggunakan strategi Passport (contoh: Google OAuth20).
* Cara melakukan serialisasi dan deserialisasi pengguna untuk manajemen sesi.

---

## Konteks dan Motivasi

Dalam aplikasi web modern, memaksa pengguna untuk membuat username dan password baru seringkali membuat mereka enggan mendaftar. OAuth 2.0 memungkinkan pengguna untuk masuk (login) menggunakan akun yang sudah mereka miliki dari penyedia seperti Google, GitHub, atau Facebook.

Passport.js adalah middleware autentikasi paling populer untuk Node.js. Library ini menyederhanakan proses "jabat tangan" (handshake) OAuth 2.0 yang kompleks, sehingga memudahkan integrasi berbagai strategi autentikasi ke dalam aplikasi Express tanpa harus membangunnya dari awal. Memahami Passport dan OAuth sangat penting untuk membangun aplikasi yang aman dan ramah pengguna.

---

## Materi Inti

### Apa itu OAuth 2.0?

OAuth 2.0 adalah kerangka kerja otorisasi (authorization framework) yang memungkinkan aplikasi untuk mendapatkan akses terbatas ke akun pengguna di sebuah layanan HTTP (seperti Google atau Facebook) tanpa mengekspos password pengguna. Cara kerjanya adalah dengan mendelegasikan autentikasi pengguna ke layanan yang meng-host akun tersebut, dan memberikan izin kepada aplikasi pihak ketiga untuk mengakses data akun pengguna.

### Mengapa Passport.js?

Passport adalah middleware autentikasi untuk Node.js. Sifatnya sangat fleksibel dan modular, memungkinkan Anda memilih dari lebih dari 500 "strategi" (mekanisme autentikasi). Daripada menulis logika kustom untuk alur OAuth setiap penyedia (provider), Passport mengabstraksi bagian-bagian yang berulang (seperti me-redirect ke penyedia, menangani callback, dan menukar kode dengan token).

### Alur OAuth 2.0 dengan Passport

1. **Client Request:** Pengguna mengklik tombol "Login with Google".
2. **Redirection:** Server Express (melalui Passport) me-redirect pengguna ke halaman persetujuan (consent screen) Google.
3. **User Consent:** Pengguna login ke Google dan memberikan izin kepada aplikasi Anda.
4. **Callback:** Google me-redirect pengguna kembali ke URL callback di server Express Anda, sambil membawa kode otorisasi (authorization code).
5. **Token Exchange:** Passport secara otomatis menukarkan kode ini dengan Access Token dan mengambil profil pengguna.
6. **Session Creation:** Aplikasi Anda memproses data profil (misalnya, menyimpannya ke database) dan Passport melakukan serialisasi pengguna ke dalam sesi.

---

## Contoh / Ilustrasi

Berikut adalah implementasi praktis Google OAuth 2.0 menggunakan `passport` dan `passport-google-oauth20`.

### 1. Instalasi

Pertama, instal paket-paket yang dibutuhkan:

```bash
npm install express express-session passport passport-google-oauth20 dotenv
```

### 2. Mengatur Strategi Passport

Buat file `passport.js` untuk mengkonfigurasi strategi Anda. Anda perlu mendapatkan `CLIENT_ID` dan `CLIENT_SECRET` dari Google Cloud Console.

```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

// Konfigurasi Strategi Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // Di aplikasi nyata, Anda akan mencari atau membuat user di database di sini
    const user = {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value
    };

    // Teruskan objek user ke tahap selanjutnya (serialisasi)
    return done(null, user);
  }
));

// Serialisasi user ke dalam sesi
passport.serializeUser((user, done) => {
  done(null, user.id); // Simpan hanya ID user di dalam sesi
});

// Deserialisasi user dari sesi
passport.deserializeUser((id, done) => {
  // Di aplikasi nyata, Anda akan mengambil data user lengkap dari database menggunakan ID
  const mockUser = { id: id, name: 'John Doe' };
  done(null, mockUser);
});

module.exports = passport;
```

### 3. Integrasi dengan Express

Sekarang, gabungkan semuanya di dalam `app.js` Anda:

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('./passport'); // Import konfigurasi passport
const app = express();

// 1. Middleware Session WAJIB diinisialisasi sebelum Passport
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
}));

// 2. Inisialisasi Passport dan dukungan sesinya
app.use(passport.initialize());
app.use(passport.session());

// 3. Definisikan Route

// Route untuk memulai autentikasi Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Route callback tempat Google me-redirect setelah autentikasi
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Autentikasi berhasil
    res.redirect('/profile');
  }
);

// Middleware untuk memproteksi route
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { // Fungsi ditambahkan oleh Passport
    return next();
  }
  res.redirect('/login');
}

// Route Profile (Dilindungi)
app.get('/profile', isAuthenticated, (req, res) => {
  res.send(`Selamat datang ${req.user.name}!`); // req.user diisi oleh deserializeUser
});

app.get('/logout', (req, res, next) => {
  req.logout((err) => { // Fungsi ditambahkan oleh Passport
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('Server berjalan pada port 3000');
});
```

---

## Insight Penting

* **Ketergantungan pada Sesi:** Implementasi standar OAuth dengan Passport sangat bergantung pada `express-session`. Pastikan middleware sesi Anda dikonfigurasi dengan benar dan diletakkan *sebelum* `passport.initialize()` dan `passport.session()`.
* **API Stateless (JWT vs Sesi):** Jika Anda membangun API murni yang stateless (misalnya untuk aplikasi mobile), menggunakan sesi mungkin bukan pilihan ideal. Passport dapat dikonfigurasi untuk menggunakan JWT, atau Anda dapat menerbitkan JWT di dalam rute callback OAuth daripada mengandalkan `passport.session()`.
* **Keamanan:** Jangan pernah melakukan commit `CLIENT_ID` atau `CLIENT_SECRET` Anda ke dalam source control (seperti GitHub). Selalu gunakan environment variable (`dotenv`).
* **Serialisasi/Deserialisasi:** `serializeUser` menentukan data apa dari objek pengguna yang disimpan di dalam cookie sesi (biasanya hanya ID untuk menjaga agar ukuran cookie tetap kecil). `deserializeUser` menggunakan ID tersebut untuk mengambil profil pengguna secara penuh pada request-request berikutnya.

---

## Ringkasan Akhir

* OAuth 2.0 mendelegasikan proses autentikasi ke penyedia pihak ketiga, yang meningkatkan pengalaman pengguna (user experience).
* Passport.js mengabstraksi kerumitan alur OAuth menjadi beberapa fungsi middleware yang sederhana.
* Strategi Google memerlukan Client ID, Client Secret, dan Callback URL yang sudah didaftarkan dan diverifikasi.
* Passport menggunakan `serializeUser` dan `deserializeUser` untuk mengelola status (state) autentikasi di seluruh HTTP request melalui mekanisme sesi.

---

## Langkah Belajar Berikutnya

* Pelajari cara mengintegrasikan Passport dengan database seperti MongoDB (menggunakan Mongoose) atau PostgreSQL (menggunakan Prisma) untuk menyimpan profil pengguna secara permanen.
* Pelajari cara menggabungkan login OAuth 2.0 dengan JWT untuk autentikasi stateless pada aplikasi Single Page Application (SPA).
* Coba implementasikan beberapa strategi autentikasi sekaligus (misalnya Google, GitHub, dan Login Lokal dengan Email/Password).

---

## Metadata

* Level: Menengah
* Topik utama: Authentication
* Topik terkait: Express.js, Security, OAuth 2.0, Sessions
* Kata kunci: passport.js, oauth2, google login, express authentication
* Estimasi waktu baca: 15 menit

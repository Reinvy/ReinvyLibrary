---
title: "Implementing OAuth 2.0 Authentication in Express JS"
description: "Materi ini membahas cara mengintegrasikan autentikasi OAuth 2.0 ke dalam aplikasi Express.js. Kita akan fokus menggunakan Passport.js dengan strategi Google OAu"
category: "backend"
technology: "passport-js"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Implementing OAuth 2.0 Authentication in Express JS

## Ringkasan Singkat

Materi ini membahas cara mengintegrasikan autentikasi OAuth 2.0 ke dalam aplikasi Express.js. Kita akan fokus menggunakan Passport.js dengan strategi Google OAuth 2.0 untuk memungkinkan pengguna login secara aman menggunakan akun Google mereka tanpa perlu mengelola kata sandi secara terpisah.

## Untuk Siapa Materi Ini

- **Target Audience:** Developer backend tingkat menengah yang ingin menerapkan *social login* atau autentikasi pihak ketiga.
- **Level:** Menengah.

## Prasyarat

- Pemahaman yang solid tentang *routing* dan *middleware* pada Express.js.
- Terbiasa dengan konsep autentikasi dan manajemen sesi (*session management*) di Express.js.
- Pemahaman dasar tentang cara kerja *redirect* dan *callback* pada HTTP.

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan dapat:

- Memahami alur dasar OAuth 2.0 untuk aplikasi web.
- Mengonfigurasi aplikasi di Google Developer Console untuk mendapatkan kredensial klien (*client credentials*).
- Mengimplementasikan Passport.js dengan `passport-google-oauth20` di aplikasi Express.js.
- Mengamankan rute sehingga hanya pengguna yang terautentikasi yang dapat mengaksesnya.
- Menangani *callback* OAuth dan mengelola sesi pengguna secara efektif.

## Konteks dan Motivasi

Pada aplikasi web modern, memaksa pengguna untuk membuat dan mengingat kata sandi baru untuk setiap layanan dapat menciptakan hambatan dan memicu praktik keamanan yang buruk (seperti penggunaan ulang kata sandi). OAuth 2.0 menyelesaikan masalah ini dengan mengizinkan pengguna untuk melakukan autentikasi melalui penyedia terpercaya (seperti Google, GitHub, atau Facebook). Bagi developer, ini mendelegasikan kompleksitas manajemen kredensial dan verifikasi identitas kepada penyedia tersebut, sehingga aplikasi menjadi lebih aman dan meningkatkan pengalaman pendaftaran pengguna.

## Materi Inti

### 1. Alur Aplikasi Web OAuth 2.0

OAuth 2.0 adalah kerangka kerja otorisasi yang memungkinkan aplikasi memperoleh akses terbatas ke akun pengguna pada layanan HTTP. Alur umum untuk aplikasi web meliputi:

1. **Redirection (Pengalihan):** Pengguna mengklik "Login with Google" dan dialihkan ke layar persetujuan (*consent screen*) Google.
2. **Consent (Persetujuan):** Pengguna memberikan izin kepada aplikasi untuk mengakses informasi profil dasar mereka.
3. **Callback:** Google mengalihkan kembali pengguna ke aplikasi Anda dengan membawa kode otorisasi (*authorization code*).
4. **Token Exchange (Pertukaran Token):** Server Anda menukar kode otorisasi tersebut dengan token akses (*access token*) (dan mungkin *refresh token*).
5. **Profile Fetch (Pengambilan Profil):** Server Anda menggunakan token akses untuk mengambil data profil pengguna dan mencatat mereka masuk (login).

### 2. Mengatur Google Cloud Console

Sebelum menulis kode, Anda harus mendaftarkan aplikasi Anda ke Google:

- Pergi ke [Google Cloud Console](https://console.cloud.google.com/).
- Buat proyek baru dan navigasikan ke **APIs & Services > Credentials**.
- Konfigurasikan **OAuth consent screen**.
- Buat kredensial **OAuth client ID** (Web application).
- Tambahkan Authorized redirect URI (misalnya, `http://localhost:3000/auth/google/callback`).
- Simpan **Client ID** dan **Client Secret** Anda.

### 3. Mengintegrasikan Passport.js

Passport adalah *middleware* autentikasi untuk Node.js. Passport menyediakan pendekatan modular yang menggunakan "strategi" (*strategies*). Untuk Google OAuth 2.0, kita menggunakan paket `passport-google-oauth20`. Anda juga memerlukan `express-session` untuk mempertahankan sesi login.

## Contoh / Ilustrasi

Berikut adalah contoh lengkap pengaturan Google OAuth 2.0 di dalam aplikasi Express.js.

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// 1. Konfigurasi Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'super_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Setel ke true jika menggunakan HTTPS
}));

// 2. Inisialisasi Passport dan pulihkan status autentikasi dari sesi
app.use(passport.initialize());
app.use(passport.session());

// 3. Konfigurasi Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret',
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // Pada aplikasi nyata, Anda akan mencari atau membuat user di database di sini
    // misalnya, User.findOrCreate({ googleId: profile.id }, function (err, user) { return done(err, user); });

    // Untuk contoh ini, kita hanya meneruskan objek profil sebagai user
    return done(null, profile);
  }
));

// 4. Serialize dan Deserialize User
// Serialization menentukan data mana dari objek user yang harus disimpan di sesi
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialization mengambil user berdasarkan data yang disimpan dalam sesi
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// 5. Menentukan Rute (Routes)
app.get('/', (req, res) => {
  res.send('<h1>Home</h1><a href="/auth/google">Login with Google</a>');
});

// Rute untuk memulai autentikasi Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Rute callback Google
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Autentikasi berhasil, alihkan ke profil.
    res.redirect('/profile');
  }
);

// Middleware proteksi rute
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

// Rute yang dilindungi (Protected route)
app.get('/profile', ensureAuthenticated, (req, res) => {
  res.send(`<h1>Profile</h1><p>Welcome, ${req.user.displayName}!</p><a href="/logout">Logout</a>`);
});

// Rute logout
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
```

## Insight Penting

- **Manajemen Sesi:** Strategi OAuth 2.0 di Passport sangat bergantung pada sesi. Pastikan konfigurasi sesi Anda aman, terutama di lingkungan produksi, dengan menggunakan *secret* yang kuat, cookie yang aman, dan penyimpanan sesi persisten seperti Redis.
- **Privasi Data:** Selalu minta *scope* seminimal mungkin yang diperlukan (misalnya, `['profile', 'email']`). Meminta *scope* yang terlalu luas dapat membuat pengguna enggan menyelesaikan proses login.
- **Menangani Duplikat:** Saat pengguna login melalui Google, mereka mungkin sudah memiliki akun yang dibuat dengan email yang sama menggunakan kata sandi tradisional. Tentukan strategi penyambungan akun (*account-linking strategy*) (misalnya, menautkan ID Google ke akun email yang sudah ada) untuk menghindari pembuatan pengguna ganda.
- **Konteks Keamanan:** Jangan pernah mengekspos `Client Secret` Anda di *frontend* atau menyimpannya di dalam *version control* (seperti git). Selalu gunakan variabel lingkungan (*environment variables* melalui file `.env`).

## Ringkasan Akhir

- OAuth 2.0 mendelegasikan autentikasi ke penyedia pihak ketiga yang tepercaya, sehingga meningkatkan keamanan dan pengalaman pengguna.
- Passport.js dengan strategi `passport-google-oauth20` menyediakan cara yang bersih dan modular untuk mengimplementasikan Google Login di Express.js.
- Prosesnya melibatkan pengalihan pengguna ke Google untuk persetujuan, menangani *callback* yang berisi kode otorisasi, dan menukarnya dengan informasi profil pengguna.
- Menggunakan `express-session`, Anda dapat mempertahankan status terautentikasi (*authenticated state*) pada semua *request* berikutnya menggunakan *session cookie*.

## Langkah Belajar Berikutnya

- Menerapkan *account linking* untuk menangani pengguna yang login menggunakan *social provider* dan kredensial tradisional.
- Mengeksplorasi implementasi OAuth 2.0 yang *stateless* menggunakan JWT sebagai pengganti *session cookie*.
- Menambahkan penyedia OAuth tambahan seperti GitHub atau Facebook menggunakan strategi Passport mereka masing-masing.

## Metadata

- Level: Menengah
- Topik utama: Authentication, Express JS
- Topik terkait: Passport.js, OAuth 2.0, Security
- Kata kunci: Express, OAuth, Google Login, Passport, Autentikasi
- Estimasi waktu baca: 12 menit

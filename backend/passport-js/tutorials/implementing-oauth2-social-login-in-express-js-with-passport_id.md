---
title: "Mengimplementasikan OAuth2 Social Login di Express JS dengan Passport"
description: "Materi ini membahas cara mengimplementasikan autentikasi OAuth2 di Express.js menggunakan library Passport.js, dengan fokus khusus pada Google Social Login. And"
category: "backend"
technology: "passport-js"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Mengimplementasikan OAuth2 Social Login di Express JS dengan Passport

## Ringkasan Singkat

Materi ini membahas cara mengimplementasikan autentikasi OAuth2 di Express.js menggunakan *library* Passport.js, dengan fokus khusus pada Google Social Login. Anda akan belajar cara mengonfigurasi strategi autentikasi, menangani sesi pengguna, dan mengintegrasikan penyedia login pihak ketiga ke dalam aplikasi Anda secara mulus.

---

## Untuk Siapa Materi Ini

- **Target Pembaca:** *Developer backend* yang ingin menambahkan fitur *social login* ke aplikasi Express mereka.
- **Level:** Menengah (Intermediate).

---

## Prasyarat

- Pemahaman dasar tentang *routing* dan *middleware* di Express.js.
- Terbiasa dengan manajemen sesi dan *cookie* (misalnya, menggunakan `express-session`).
- Pengetahuan dasar tentang cara kerja *request* HTTP dan *callback*.

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

- Konsep fundamental OAuth2 dan cara kerja *social login*.
- Cara mengatur dan mengonfigurasi Passport.js dengan Express.
- Cara mengimplementasikan strategi `passport-google-oauth20` untuk Google Login.
- Cara mengelola proses serialisasi dan deserialisasi pengguna dalam sesi.

---

## Konteks dan Motivasi

Dalam aplikasi *web* modern, memaksa pengguna untuk membuat *username* dan *password* baru dapat menciptakan keengganan. Mengimplementasikan "Login dengan Google" (atau penyedia lain) melalui OAuth2 akan menyederhanakan proses orientasi, meningkatkan tingkat konversi, dan mengalihkan beban pengelolaan *password* yang aman kepada penyedia identitas tepercaya. Passport.js adalah *middleware* autentikasi yang paling populer dan modular untuk Node.js, menjadikannya standar industri untuk mengintegrasikan strategi-strategi ini.

---

## Materi Inti

### Memahami OAuth2 dan Passport.js

OAuth2 adalah kerangka kerja otorisasi yang memungkinkan sebuah aplikasi untuk mendapatkan akses terbatas ke akun pengguna pada layanan HTTP (seperti Google, Facebook, atau GitHub). Alih-alih menangani *password* pengguna, aplikasi Anda akan menerima "access token" dari penyedia layanan.

**Passport.js** bertindak sebagai *middleware* perantara di Express. Passport menyembunyikan kompleksitas autentikasi dengan menggunakan "strategi" (*strategies*). Sebuah strategi hanyalah sebuah paket yang dirancang untuk mengautentikasi *request* menggunakan metode tertentu (misal: Local, OAuth, JWT).

### Komponen Utama

1. **Konfigurasi Strategi:** Mengatur kredensial klien pihak ketiga (Client ID, Client Secret) dan URL *callback*.
2. **Serialisasi Sesi:** Passport perlu mengetahui data apa (biasanya ID pengguna) yang harus disimpan di dalam *cookie* sesi untuk mengidentifikasi pengguna pada *request* berikutnya.
3. **Deserialisasi Sesi:** Passport mengekstrak ID dari *cookie* sesi dan menggunakannya untuk mengambil objek pengguna secara lengkap dari *database* Anda.
4. **Rute Autentikasi:** Satu rute untuk mengarahkan pengguna ke penyedia layanan, dan rute lainnya (*callback*) untuk menangani respons dari penyedia tersebut.

---

## Contoh / Ilustrasi

### 1. Instalasi

Pertama, instal paket-paket yang diperlukan. Anda akan membutuhkan Express, express-session (untuk menjaga pengguna tetap login), dan paket-paket Passport.

```bash
npm install express express-session passport passport-google-oauth20
```

### 2. Pengaturan Dasar dan Konfigurasi Strategi

Di bawah ini adalah contoh lengkap dan minimal untuk mengatur Google OAuth2.

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// 1. Konfigurasi Middleware Sesi
app.use(session({
  secret: 'kunci_rahasia_anda',
  resave: false,
  saveUninitialized: false
}));

// 2. Inisialisasi Passport dan pulihkan status autentikasi dari sesi (jika ada)
app.use(passport.initialize());
app.use(passport.session());

// 3. Konfigurasi Strategi Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // Di sini, Anda biasanya mencari atau membuat pengguna di database Anda
    // Untuk contoh ini, kita hanya meneruskan profil tersebut
    return done(null, profile);
  }
));

// 4. Serialisasi Pengguna: Menentukan data mana dari objek pengguna yang harus disimpan dalam sesi
passport.serializeUser((user, done) => {
  done(null, user.id); // Hanya menyimpan Google ID
});

// 5. Deserialisasi Pengguna: Mengambil pengguna berdasarkan ID yang disimpan
passport.deserializeUser((id, done) => {
  // Biasanya: User.findById(id, (err, user) => done(err, user));
  // Simulasi pengambilan data:
  done(null, { id: id, name: "Pengguna Google" });
});

// --- Rute ---

// Rute untuk memulai login Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Rute callback yang ditangani oleh Google setelah login berhasil
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Autentikasi berhasil, arahkan ke beranda.
    res.redirect('/dashboard');
  }
);

// Rute yang dilindungi
app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`Selamat datang, ${req.user.name}!`);
  } else {
    res.redirect('/auth/google');
  }
});

// Rute logout
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('Server berjalan di port 3000');
});
```

*(Catatan: Dalam aplikasi nyata, ganti `process.env.GOOGLE_CLIENT_ID` dan `process.env.GOOGLE_CLIENT_SECRET` dengan kredensial yang didapatkan dari Google Developer Console).*

---

## Insight Penting

- **Manajemen State:** *Social login* dengan Passport sangat bergantung pada sesi. Pastikan `express-session` Anda dikonfigurasi dengan aman, terutama di tahap *production* (misalnya, menggunakan penyimpanan yang andal seperti Redis, dan mengatur `secure: true` untuk *cookie* melalui HTTPS).
- **Keamanan:** Jangan pernah menaruh *Client ID* dan *Client Secret* secara langsung di dalam kode (*hardcode*). Selalu gunakan *environment variables*.
- **Penanganan Error:** Perhatikan opsi `failureRedirect` pada rute *callback*. Pengguna mungkin menolak otorisasi atau kesalahan jaringan mungkin terjadi; aplikasi Anda harus menangani hal ini dengan baik.
- **Fungsi Callback `done`:** Di Passport, fungsi `done` menandakan selesainya suatu langkah. Meneruskan `null` sebagai argumen pertama berarti tidak terjadi *error*; argumen kedua adalah objek pengguna (atau ID).
- **OAuth Tanpa State (API):** Jika Anda membangun API tanpa sesi, Anda tidak akan menggunakan `passport.session()`. Alih-alih, di rute *callback*, Anda akan menghasilkan JWT (JSON Web Token) dan mengembalikannya ke *client*.

---

## Ringkasan Akhir

- OAuth2 mendelegasikan autentikasi ke penyedia pihak ketiga seperti Google.
- Passport.js menyederhanakan integrasi OAuth2 di Express melalui pola "Strategi".
- Alur kerjanya meliputi konfigurasi strategi, pengaturan serialisasi/deserialisasi sesi, dan pembuatan rute login serta *callback*.
- Praktik keamanan terbaik, seperti mengamankan *cookie* sesi dan menggunakan *environment variables* untuk kredensial, sangatlah penting.

---

## Langkah Belajar Berikutnya

- Pelajari cara mengintegrasikan *database* (seperti MongoDB/Mongoose atau PostgreSQL/Prisma) di dalam *callback* Strategi untuk menyimpan akun pengguna secara permanen.
- Jelajahi autentikasi *stateless* menggunakan Passport.js yang dikombinasikan dengan JSON Web Tokens (JWT) untuk aplikasi SPA atau klien *mobile*.
- Tambahkan penyedia *social login* lainnya seperti GitHub, Facebook, atau Twitter menggunakan strategi Passport masing-masing.

---

## Metadata

- Level: Menengah
- Topik utama: Autentikasi, Express.js
- Topik terkait: OAuth2, Passport.js, Social Login
- Kata kunci: express, passport, oauth2, google login, autentikasi
- Estimasi waktu baca: 10 menit

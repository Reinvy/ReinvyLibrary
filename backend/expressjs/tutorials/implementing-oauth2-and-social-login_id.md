---
title: "Menerapkan OAuth2 dan Social Login di Express.js"
description: "Materi ini menjelaskan cara menerapkan OAuth2 untuk mengaktifkan Social Login (seperti Google, GitHub, atau Facebook) pada aplikasi Express.js menggunakan libra"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Menerapkan OAuth2 dan Social Login di Express.js

## Ringkasan Singkat

Materi ini menjelaskan cara menerapkan OAuth2 untuk mengaktifkan Social Login (seperti Google, GitHub, atau Facebook) pada aplikasi Express.js menggunakan library Passport.js. Anda akan mempelajari bagaimana alur OAuth2 bekerja dan cara mengintegrasikannya dengan aman, memungkinkan pengguna untuk masuk tanpa perlu membuat kata sandi baru.

---

## Untuk Siapa Materi Ini

- **Target Pembaca:** Developer backend tingkat menengah.
- **Level:** Menengah.

---

## Prasyarat

- Pemahaman tentang routing dan middleware dasar di Express.js.
- Terbiasa dengan manajemen sesi dan cookie di Express.js.
- Pengetahuan dasar tentang konsep autentikasi.

---

## Tujuan Belajar

Setelah membaca materi ini, Anda akan memahami:

- Bagaimana protokol OAuth2 bekerja untuk autentikasi dan otorisasi.
- Cara mengonfigurasi Passport.js dengan strategi Google OAuth2 di Express.js.
- Cara mengelola sesi pengguna setelah social login berhasil.
- Manfaat dan potensi masalah dari menggunakan penyedia identitas pihak ketiga.

---

## Konteks dan Motivasi

Dalam aplikasi web modern, memaksa pengguna untuk membuat dan mengingat kata sandi tambahan dapat meningkatkan friksi dan menurunkan tingkat pendaftaran. Social Login menyelesaikan masalah ini dengan memungkinkan pengguna untuk melakukan autentikasi menggunakan akun mereka yang sudah ada dari penyedia seperti Google, GitHub, atau Apple.

Di balik layar, proses ini biasanya didukung oleh OAuth2 (Open Authorization). Ini adalah protokol standar yang memungkinkan pengguna memberikan izin kepada aplikasi pihak ketiga akses terbatas ke sumber daya mereka tanpa mengekspos kata sandi. Memahami cara menerapkan OAuth2 di Express.js adalah keterampilan yang sangat dicari untuk membangun aplikasi yang modern, ramah pengguna, dan aman.

---

## Materi Inti

### 1. Memahami Alur OAuth2

Sebelum masuk ke kode, sangat penting untuk memahami alur tingkat tinggi OAuth2 untuk autentikasi (sering disebut sebagai OpenID Connect):

1. **Pengguna meminta login:** Pengguna mengklik "Login dengan Google" di situs Anda.
2. **Redirect ke Penyedia:** Server Anda mengarahkan pengguna ke layar persetujuan Google.
3. **Pengguna memberikan izin:** Pengguna masuk ke Google dan memberikan aplikasi Anda izin untuk mengakses profil mereka.
4. **Callback dengan Authorization Code:** Google mengarahkan pengguna kembali ke server Anda dengan "authorization code" (kode otorisasi) sementara.
5. **Menukar Kode dengan Token:** Server Anda secara rahasia menukar kode ini dengan Google untuk mendapatkan Access Token (dan terkadang Refresh Token atau ID Token) beserta informasi profil pengguna.
6. **Pembuatan Sesi:** Server Anda menggunakan info profil untuk membuat atau meloginkan pengguna, lalu membuat sesi.

### 2. Mengatur Passport.js

Di ekosistem Node.js, [Passport.js](https://www.passportjs.org/) adalah standar de facto untuk autentikasi. Passport.js menggunakan "strategi" untuk penyedia yang berbeda. Untuk Google, kita menggunakan `passport-google-oauth20`.

Anda juga memerlukan `express-session` agar pengguna tetap login antar permintaan.

### 3. Mengonfigurasi Strategi Google

Pertama, Anda harus membuat kredensial (Client ID dan Client Secret) di Google Cloud Console.

Kemudian, konfigurasikan Passport di aplikasi Express Anda:

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// Mengkonfigurasi Sesi
app.use(session({
  secret: 'kunci_rahasia_super_anda',
  resave: false,
  saveUninitialized: false
}));

// Inisialisasi Passport dan pulihkan status autentikasi, jika ada, dari sesi.
app.use(passport.initialize());
app.use(passport.session());

// Mengkonfigurasi Strategi Google
passport.use(new GoogleStrategy({
    clientID: 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
    callbackURL: '/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // Pada aplikasi nyata, Anda akan mencari atau membuat pengguna di database Anda di sini
    // Contoh: User.findOrCreate({ googleId: profile.id }, function (err, user) { return done(err, user); });

    // Untuk contoh ini, kita hanya meneruskan profil sebagai pengguna
    return done(null, profile);
  }
));

// Serialize dan Deserialize User
passport.serializeUser((user, done) => {
  // Simpan user.id di dalam sesi
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // Ambil pengguna dari database berdasarkan ID
  // Contoh: User.findById(id, function(err, user) { done(err, user); });
  done(null, { id: id, name: 'John Doe' }); // Pengguna contoh
});
```

### 4. Membuat Rute Autentikasi

Anda memerlukan dua rute: satu untuk memulai proses login, dan satu untuk menangani callback dari Google.

```javascript
// 1. Memulai proses login
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. Menangani callback setelah Google mengautentikasi pengguna
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Autentikasi berhasil, arahkan ke beranda.
    res.redirect('/dashboard');
  }
);
```

### 5. Melindungi Rute

Untuk melindungi rute, Anda dapat memeriksa apakah `req.isAuthenticated()` bernilai true.

```javascript
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.send(`Selamat datang, ${req.user.name}`);
});
```

---

## Contoh / Ilustrasi

Bayangkan Anda ingin masuk ke sebuah klub eksklusif (aplikasi Anda), tetapi Anda lupa membawa ID Anda.
Alih-alih mengisi formulir panjang untuk mendapatkan ID baru dari klub, penjaga pintu bertanya, "Apakah Anda punya SIM?" (Google).
Anda menunjukkan SIM Anda. Penjaga pintu mempercayai pemerintah (Google) yang mengeluarkannya, mencatat nama Anda, dan membiarkan Anda masuk.
OAuth2 adalah proses membangun kepercayaan ini antara aplikasi Anda dan penyedia identitas pihak ketiga.

---

## Insight Penting

- **Keamanan Client Secret:** Jangan pernah mengekspos `Client Secret` Anda di kode frontend atau repositori publik. Itu harus tetap aman di server backend Anda, biasanya disimpan dalam variabel `.env`.
- **Ketidakcocokan Callback URL:** Kesalahan paling umum di OAuth2 adalah `redirect_uri_mismatch`. Pastikan URL callback yang dikonfigurasi di Google Cloud Console Anda sama persis dengan `callbackURL` dalam strategi Passport Anda.
- **Menangani Pengguna yang Sudah Ada:** Jika pengguna mendaftar dengan email/password dan kemudian mencoba login dengan Google menggunakan email yang sama, aplikasi Anda harus dengan elegan menangani penggabungan (linking) akun tersebut daripada memunculkan pesan error email ganda.

---

## Ringkasan Akhir

- OAuth2 memungkinkan autentikasi yang aman dan tanpa kata sandi menggunakan penyedia pihak ketiga.
- Passport.js menyederhanakan implementasi OAuth2 di Express melalui strategi seperti `passport-google-oauth20`.
- Proses ini membutuhkan Client ID dan Client Secret dari penyedia layanan.
- Anda harus menangani pengalihan (redirect) awal ke penyedia dan rute callback untuk menukar authorization code.
- Sesi biasanya digunakan untuk mempertahankan status autentikasi setelah social login OAuth2 berhasil.

---

## Langkah Belajar Berikutnya

- Jelajahi penerapan beberapa penyedia OAuth (misalnya, GitHub, Facebook) bersama dengan Google.
- Pelajari cara mengintegrasikan OAuth2 dengan JSON Web Tokens (JWT) alih-alih menggunakan sesi untuk autentikasi stateless.
- Implementasikan logika penggabungan akun (account linking) di database Anda (misalnya, menggabungkan login Google dengan login email yang sudah ada).

---

## Metadata

- Level: Menengah
- Topik utama: Express.js, Backend Development
- Topik terkait: Authentication, OAuth2, Security, Passport.js
- Kata kunci: express oauth2, passport js, google login, social login, openid connect
- Estimasi waktu baca: 10 - 15 menit

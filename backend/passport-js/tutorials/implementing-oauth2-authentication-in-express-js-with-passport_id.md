---
title: "Implementing OAuth2 Authentication in Express JS with Passport"
description: "Tutorial ini membahas cara mengimplementasikan autentikasi OAuth2 di aplikasi Express JS menggunakan library populer passport dan strategi passport-google-oauth"
category: "backend"
technology: "passport-js"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Implementing OAuth2 Authentication in Express JS with Passport

## Ringkasan Singkat

Tutorial ini membahas cara mengimplementasikan autentikasi OAuth2 di aplikasi Express JS menggunakan library populer `passport` dan strategi `passport-google-oauth20`. Materi ini memberikan cara yang solid, aman, dan ramah pengguna untuk mengautentikasi pengguna menggunakan penyedia pihak ketiga seperti Google.

---

## Untuk Siapa Materi Ini

* Backend developer yang menggunakan Express JS
* Developer yang ingin mengintegrasikan login pihak ketiga (SSO)
* Level: Menengah

---

## Prasyarat

* Pemahaman dasar tentang routing dan middleware Express JS
* Familiar dengan session di Express (`express-session`)
* Pengetahuan dasar tentang konsep autentikasi
* Akun Google Cloud Console untuk membuat kredensial OAuth

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Konsep inti OAuth2 dan perbedaannya dengan autentikasi username/password tradisional.
* Cara mengonfigurasi dan menggunakan Passport.js di aplikasi Express.
* Cara mengimplementasikan Google OAuth2 untuk login dan registrasi pengguna.
* Praktik terbaik untuk mengelola sesi pengguna dan data profil setelah login OAuth yang sukses.

---

## Konteks dan Motivasi

Dalam aplikasi web modern, memaksa pengguna untuk membuat username dan password baru akan menciptakan friksi. OAuth2 memungkinkan pengguna untuk login menggunakan akun mereka yang sudah ada dari penyedia terpercaya seperti Google, Facebook, atau GitHub. Hal ini tidak hanya meningkatkan pengalaman pengguna dengan mengaktifkan Single Sign-On (SSO) tetapi juga meningkatkan keamanan, karena aplikasi Anda tidak perlu menyimpan atau mengelola password pengguna secara langsung. `passport.js` adalah library standar di ekosistem Node.js untuk mengimplementasikan berbagai strategi autentikasi, termasuk OAuth2, dengan cara yang bersih dan modular.

---

## Materi Inti

### Apa itu OAuth2?

OAuth2 adalah framework otorisasi yang memungkinkan aplikasi untuk mendapatkan akses terbatas ke akun pengguna pada layanan HTTP, seperti Google atau GitHub. Cara kerjanya adalah dengan mendelegasikan autentikasi pengguna ke layanan yang meng-host akun pengguna dan mengotorisasi aplikasi pihak ketiga untuk mengakses akun tersebut.

### Mengapa Menggunakan Passport.js?

Passport adalah middleware autentikasi untuk Node.js. Ia sangat fleksibel dan modular, serta mendukung lebih dari 500 strategi autentikasi (lokal, OAuth, OpenID). Menggunakan Passport menyelamatkan Anda dari keharusan menulis logika autentikasi kompleks dari awal dan memastikan Anda mengikuti standar praktik terbaik industri.

### 1. Menyiapkan Kredensial Google

Sebelum menulis kode, Anda membutuhkan Client ID dan Client Secret dari Google:

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat project baru.
3. Navigasi ke "APIs & Services" > "Credentials".
4. Buat kredensial "OAuth client ID".
5. Set application type ke "Web application".
6. Tambahkan Authorized redirect URI (contoh: `http://localhost:3000/auth/google/callback`).
7. Simpan Client ID dan Client Secret dengan aman.

### 2. Setup dan Konfigurasi Dasar

Pertama, instal paket yang dibutuhkan.

```bash
npm install express express-session passport passport-google-oauth20 dotenv
```

Selanjutnya, konfigurasi Passport dan Express.

### 3. Mengimplementasikan Strategi

Anda perlu memberi tahu Passport cara menggunakan strategi Google dan cara menangani serialisasi data pengguna untuk sesi.

---

## Contoh / Ilustrasi

Berikut adalah contoh lengkap dan minimal dalam mengimplementasikan Google OAuth2 di Express.

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// 1. Konfigurasi Middleware Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'kunci_rahasia_yang_sangat_aman',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set ke true jika menggunakan HTTPS di production
}));

// 2. Inisialisasi Passport dan pulihkan status autentikasi, jika ada, dari sesi.
app.use(passport.initialize());
app.use(passport.session());

// 3. Konfigurasi Strategi Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'client-id-anda',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'client-secret-anda',
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    // Pada aplikasi nyata, Anda akan mencari atau membuat pengguna di database di sini.
    // Untuk contoh ini, kita hanya meneruskan profil tersebut.
    // Contoh: User.findOrCreate({ googleId: profile.id }, function (err, user) { return cb(err, user); });

    // Mensimulasikan pencarian database:
    const user = {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails && profile.emails[0].value
    };
    return cb(null, user);
  }
));

// 4. Serialize dan Deserialize User
// Serialization memberi tahu Passport data apa yang disimpan dalam sesi (biasanya hanya ID pengguna).
passport.serializeUser(function(user, done) {
  done(null, user);
});

// Deserialization menggunakan ID yang disimpan untuk mengambil objek pengguna lengkap pada request berikutnya.
passport.deserializeUser(function(user, done) {
  // Pada aplikasi nyata, Anda akan mengambil pengguna dari DB menggunakan ID yang disimpan.
  done(null, user);
});

// --- Routes ---

// Route Beranda
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`<h1>Halo, ${req.user.name}</h1> <a href="/logout">Logout</a>`);
  } else {
    res.send(`<h1>Selamat Datang</h1> <a href="/auth/google">Login dengan Google</a>`);
  }
});

// 5. Route Autentikasi
// Mengarahkan pengguna ke Google untuk autentikasi. Kita meminta scope profile dan email.
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 6. Route Callback
// Google mengarahkan kembali ke URL ini setelah autentikasi.
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Autentikasi sukses, arahkan kembali ke beranda.
    res.redirect('/');
  }
);

// 7. Route Logout
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

const PORT = process.env.PORT || 3000;
// Export untuk testing
if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`Server berjalan pada port ${PORT}`);
    });
}
module.exports = app;
```

---

## Insight Penting

* **Keamanan via Secrets:** Jangan pernah melakukan hardcode pada Client ID atau Client Secret Anda. Selalu gunakan environment variables (file `.env`).
* **Manajemen Sesi:** OAuth2 sangat bergantung pada sesi untuk mempertahankan status login setelah alur autentikasi awal selesai. Pastikan `express-session` Anda dikonfigurasi dengan aman, terutama di tahap production (contoh: menggunakan secure cookies, session stores yang tepat seperti Redis).
* **Mencari vs Membuat Pengguna:** Callback `verify` dalam strategi Passport adalah tempat terjadinya jembatan krusial antara penyedia OAuth dan database aplikasi Anda. Anda harus menangani dua kasus ini: pengguna lama yang login, dan pengguna baru yang mendaftar melalui OAuth.
* **Penyimpanan Token:** Callback strategi menyediakan `accessToken` dan `refreshToken`. Jika Anda hanya perlu mengautentikasi pengguna, Anda umumnya tidak perlu menyimpan token-token ini. Namun, jika aplikasi Anda perlu melakukan panggilan API ke Google atas nama pengguna (contoh: membaca kalender mereka), Anda harus menyimpan token ini dengan aman di database.

---

## Ringkasan Akhir

* OAuth2 menyederhanakan proses login pengguna dengan memindahkan tugas autentikasi ke penyedia pihak ketiga yang tepercaya.
* `passport.js` adalah alat standar untuk mengimplementasikan autentikasi di Express, karena menyediakan arsitektur modular melalui berbagai strategi.
* Mengimplementasikan Google OAuth2 membutuhkan penyiapan kredensial di Google Cloud Console.
* Integrasi ini melibatkan konfigurasi strategi `passport-google-oauth20`, menyiapkan middleware sesi, menulis logika serialisasi/deserialisasi, dan membuat rute login serta callback yang diperlukan.

---

## Langkah Belajar Berikutnya

* Integrasi Database: Modifikasi strategi callback untuk menyimpan dan mengambil pengguna dari database nyata seperti MongoDB (menggunakan Mongoose) atau PostgreSQL.
* Manajemen Token: Pelajari cara menangani dan menyegarkan (`refresh`) token OAuth jika Anda perlu mengakses Google APIs atas nama pengguna.
* Menggabungkan Strategi: Pelajari cara mengimplementasikan autentikasi Lokal (username/password) sekaligus OAuth pada aplikasi yang sama.

---

## Metadata

* Level: Menengah
* Topik utama: Autentikasi Express JS
* Topik terkait: OAuth2, Passport.js, Keamanan, Session
* Kata kunci: express, oauth2, passport, login google, sso, autentikasi
* Estimasi waktu baca: 15 menit

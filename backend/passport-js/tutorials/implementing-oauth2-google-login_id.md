---
title: "Implementasi Login Google OAuth2 di Express JS"
description: "Tutorial ini menjelaskan cara mengimplementasikan autentikasi Google OAuth2 di aplikasi Express.js menggunakan passport dan passport-google-oauth20. Anda akan b"
category: "backend"
technology: "passport-js"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Implementasi Login Google OAuth2 di Express JS

## Ringkasan Singkat

Tutorial ini menjelaskan cara mengimplementasikan autentikasi Google OAuth2 di aplikasi Express.js menggunakan `passport` dan `passport-google-oauth20`. Anda akan belajar bagaimana mengautentikasi pengguna secara aman melalui akun Google mereka, menangani *callback*, dan mengelola *session* dengan efektif.

## Untuk Siapa Materi Ini

- **Target Pembaca:** *Back-end developer* tingkat menengah.
- **Level:** Menengah (Intermediate).

## Prasyarat

- Pemahaman kuat tentang *routing* dan *middleware* Express.js.
- Familiar dengan manajemen *session* dan *cookie* (lihat [Understanding Cookies and Session Management in Express JS](Understanding%20Cookies%20and%20Session%20Management%20in%20Express%20JS_ID.md)).
- Pemahaman dasar tentang konsep Autentikasi dan Otorisasi.
- Memiliki akun Google Cloud Console untuk membuat kredensial OAuth.

## Tujuan Belajar

- Memahami alur OAuth 2.0 dan bagaimana kerjanya dengan Google.
- Mengonfigurasi Google Cloud Console untuk mendapatkan *Client ID* dan *Client Secret*.
- Mengintegrasikan `passport` dan `passport-google-oauth20` ke dalam aplikasi Express.js.
- Melakukan *serialize* dan *deserialize* pengguna untuk mempertahankan sesi login.
- Menangani *callback* dari Google dengan aman dan mengambil profil pengguna.

## Konteks dan Motivasi

Pengguna saat ini enggan membuat kata sandi baru untuk setiap situs yang mereka kunjungi. Mengimplementasikan "Login dengan Google" menggunakan OAuth 2.0 memberikan pengalaman *onboarding* yang mulus, meningkatkan tingkat konversi, dan menyerahkan keamanan kata sandi kepada Google. Namun, mengimplementasikan OAuth secara manual melibatkan *handshake* dan validasi token yang kompleks. Passport.js menyederhanakan hal ini dengan menyediakan abstraksi yang seragam di berbagai strategi autentikasi, memungkinkan Anda menambahkan *social login* yang andal ke aplikasi Express Anda dengan mudah.

## Materi Inti

### 1. Memahami Alur OAuth2

OAuth 2.0 adalah kerangka kerja otorisasi. Untuk Login Google, alurnya adalah:

1. **Redirect**: Pengguna mengklik "Login dengan Google" dan diarahkan ke layar persetujuan (*consent screen*) Google.
2. **Consent**: Pengguna memberikan izin kepada aplikasi Anda untuk membaca profil/email mereka.
3. **Callback**: Google mengarahkan pengguna kembali ke server Anda dengan membawa kode otorisasi (`code`).
4. **Token Exchange**: Server Anda menukar kode tersebut dengan `access_token` di belakang layar.
5. **Profile Fetch**: Server Anda menggunakan `access_token` tersebut untuk mengambil informasi profil pengguna dari Google.

### 2. Mengatur Google Cloud Console

Sebelum menulis kode, Anda memerlukan kredensial:

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru.
3. Navigasi ke **APIs & Services > Credentials**.
4. Klik **Create Credentials** dan pilih **OAuth client ID**.
5. Pilih **Web application** sebagai jenis aplikasi.
6. Tambahkan `http://localhost:3000` ke **Authorized JavaScript origins**.
7. Tambahkan `http://localhost:3000/auth/google/callback` ke **Authorized redirect URIs**.
8. Simpan **Client ID** dan **Client Secret** yang dihasilkan. Jaga kerahasiaannya di file `.env` Anda!

### 3. Menginstal Dependensi

Anda akan membutuhkan Express, Express Session, Passport, dan Google Strategy:

```bash
npm install express express-session passport passport-google-oauth20 dotenv
```

### 4. Mengonfigurasi Passport dan Express

Buat aplikasi Express dan konfigurasi manajemen sesi serta Passport.

```javascript
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// Konfigurasi Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'kunci_rahasia_super',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Ubah jadi true jika menggunakan HTTPS di produksi
}));

// Inisialisasi Passport
app.use(passport.initialize());
app.use(passport.session());

// Database bohongan (mock) untuk tujuan ilustrasi
const mockUserDatabase = [];

// Konfigurasi Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
    callbackURL: "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    // Di aplikasi nyata, Anda akan mencari atau membuat user di database
    let user = mockUserDatabase.find(u => u.googleId === profile.id);

    if (!user) {
      user = {
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : ''
      };
      mockUserDatabase.push(user);
    }

    // Teruskan objek user ke tahap selanjutnya (serialization)
    return cb(null, user);
  }
));

// Menyimpan ID pengguna ke dalam session (Serialize)
passport.serializeUser((user, done) => {
  done(null, user.googleId);
});

// Mengambil data pengguna dari session berdasarkan ID (Deserialize)
passport.deserializeUser((id, done) => {
  const user = mockUserDatabase.find(u => u.googleId === id);
  done(null, user);
});
```

### 5. Mendefinisikan Route

Sekarang, tentukan *route* yang memicu autentikasi dan menangani *callback*.

```javascript
// 1. Route untuk memulai Login Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. Route callback yang dituju oleh Google
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Autentikasi berhasil, arahkan ke beranda.
    res.redirect('/profile');
  }
);

// Middleware untuk melindungi route
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) { return next(); }
  res.status(401).send('Harap login terlebih dahulu.');
};

// Route profil yang dilindungi
app.get('/profile', ensureAuthenticated, (req, res) => {
  res.send(`Selamat datang, ${req.user.name}! Email Anda adalah ${req.user.email}`);
});

// Route logout
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

## Contoh / Ilustrasi

Bayangkan Anda memasuki sebuah klub eksklusif (aplikasi Anda). Alih-alih mendaftar dan memberikan KTP untuk difotokopi (registrasi tradisional), Anda cukup menunjukkan kartu VIP yang dicap oleh otoritas terpercaya seperti Walikota (Google). Klub tersebut percaya pada Walikota. Saat Anda menunjukkan kartu tersebut, klub bertanya kepada Walikota, "Apakah orang ini sah?" Walikota menjawab, "Ya, ini nama dan email publiknya." Klub lalu mengizinkan Anda masuk dan memberi Anda gelang sementara (*Session Cookie*) agar mereka tidak perlu menelepon Walikota setiap kali Anda pergi ke bar.

## Insight Penting

- **Selalu Gunakan Environment Variables**: Jangan pernah menulis paksa (*hardcode*) `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di kode. Selalu gunakan file `.env` dan tambahkan ke `.gitignore`.
- **Session Store**: Dalam contoh ini, kita menggunakan memori bawaan (*default memory store*) untuk sesi, yang **TIDAK** ditujukan untuk produksi karena bisa menyebabkan kebocoran memori (*memory leak*) dan data hilang saat server *restart*. Gunakan Redis (`connect-redis`) atau database utama Anda untuk penyimpanan sesi di lingkungan produksi.
- **Menangani Pengguna Lama**: Jika seorang pengguna sebelumnya mendaftar dengan email/password biasa, lalu di lain waktu mengklik "Login dengan Google" menggunakan email yang *sama*, Anda memerlukan logika untuk menautkan ID Google ke akun mereka yang sudah ada alih-alih membuat akun ganda.
- **HTTPS adalah Wajib**: OAuth2 sangat bergantung pada kerahasiaan token dan *callback*. Di lingkungan produksi (*production*), URL *callback* Anda wajib menggunakan HTTPS.

## Ringkasan Akhir

- OAuth2 memungkinkan pengguna untuk melakukan autentikasi menggunakan penyedia eksternal seperti Google, meningkatkan pengalaman pengguna dan keamanan.
- `passport.js` dan `passport-google-oauth20` menyembunyikan kompleksitas pertukaran token dan alur *redirect*.
- Proses ini melibatkan pengarahan pengguna ke Google, menangani *callback* dengan kode otorisasi, mengambil profil, dan menetapkan sesi lokal.
- Manajemen sesi yang aman dan konfigurasi variabel lingkungan (*environment variables*) sangat penting untuk implementasi yang aman.

## Langkah Belajar Berikutnya

- Mengintegrasikan database yang tepat (seperti MongoDB atau PostgreSQL) untuk menyimpan data pengguna secara permanen.
- [Implementing Refresh Tokens with JWT in Express](Implementing%20Refresh%20Tokens%20with%20JWT%20in%20Express_ID.md).
- Menambahkan *social login* alternatif (misalnya, GitHub atau Facebook) menggunakan strategi Passport lainnya.

## Metadata

- Level: Menengah (Intermediate)
- Topik utama: Express.js, Authentication
- Topik terkait: OAuth2, Passport.js, Session Management, Security
- Kata kunci: express js, google login, oauth2, passport, passport-google-oauth20, autentikasi
- Estimasi waktu baca: 10 - 15 menit

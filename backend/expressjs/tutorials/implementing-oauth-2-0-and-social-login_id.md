---
title: "Mengimplementasikan OAuth 2.0 dan Social Login di Express JS"
description: "Panduan lengkap cara mengintegrasikan login sosial Google OAuth 2.0 ke dalam aplikasi Express.js menggunakan Passport.js."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Mengimplementasikan OAuth 2.0 dan Social Login di Express JS

## Ringkasan

Tutorial ini memandu Anda mengintegrasikan login sosial Google OAuth 2.0 ke dalam aplikasi Express.js menggunakan Passport.js, menjelaskan alur otorisasi OAuth, registrasi klien di Google Console, konfigurasi route callback, dan manajemen sesi.

## Target Audiens

Pengembang backend tingkat menengah yang ingin meningkatkan kemudahan pendaftaran pengguna dengan menyediakan fitur login sosial pihak ketiga yang aman.

## Prasyarat

- Pemahaman tentang Express.js, session middleware, dan konsep dasar Passport.js.
- Akun Google Developer untuk membuat credentials Client ID.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Menjelaskan alur kerja otorisasi OAuth 2.0 (Authorization Code flow).
- Mendaftarkan aplikasi di Google Cloud Console dan membuat kredensial Client.
- Mengonfigurasi strategi `passport-google-oauth20` di Express.
- Menangani rute callback OAuth dan memetakan profil pengguna ke database lokal.

## Konteks dan Motivasi

Pengguna cenderung malas membuat kata sandi baru untuk setiap website baru. Social login mempermudah pendaftaran dan login hanya dengan satu klik, serta menyerahkan tanggung jawab keamanan password dan multi-faktor autentikasi (MFA) kepada penyedia identitas tepercaya seperti Google, GitHub, atau Facebook.

## Konten Inti

### 1. Instalasi Dependensi

Instal Passport, strategi Google OAuth 2.0, dotenv, dan express-session:

```bash
npm install passport passport-google-oauth20 express-session dotenv
```

### 2. Mendaftarkan Aplikasi di Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru.
3. Konfigurasikan **OAuth consent screen** (User Type: External).
4. Masuk ke tab **Credentials**, klik **Create Credentials**, pilih **OAuth client ID**.
5. Pilih tipe aplikasi **Web application**.
6. Di bagian **Authorized redirect URIs**, tambahkan:
   `http://localhost:3000/auth/google/callback`
7. Klik Simpan lalu salin **Client ID** dan **Client Secret** ke file `.env` Anda.

```env
GOOGLE_CLIENT_ID="id_klien_anda"
GOOGLE_CLIENT_SECRET="secret_klien_anda"
SESSION_SECRET="supersecretkey"
```

### 3. Mengonfigurasi Strategi Google OAuth

Konfigurasikan Passport untuk memproses token identitas dari Google:

```javascript
// passport-oauth.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Cari pengguna di database lokal menggunakan profile.id (Google ID)
      // Jika pengguna belum terdaftar, buat baris data baru.
      const user = { id: profile.id, displayName: profile.displayName };
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));
```

## Contoh Kode

Siapkan endpoint pengalihan dan callback di Express:

```javascript
// app.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();
require('./passport-oauth');

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Endpoint untuk memicu login Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Endpoint Callback tempat Google mengarahkan pengguna kembali
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login-failed' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// Route Dashboard yang terproteksi
app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Akses tidak diizinkan" });
  }
  res.json({ message: `Berhasil login sebagai ${req.user.displayName} via Google!` });
});

app.listen(3000, () => console.log('Server berjalan di port 3000'));
```

## Insight Penting

- **Cakupan Scope**: Hanya minta scope yang Anda butuhkan (seperti `profile` dan `email`). Meminta scope yang terlalu luas dapat membuat pengguna enggan melakukan login.
- **Parameter State**: Parameter `state` membantu mencegah serangan CSRF (Cross-Site Request Forgery). Passport.js menangani hal ini secara otomatis di latar belakang.
- **Keamanan Sesi**: Google OAuth 2.0 berhasil dikonfigurasi dengan aman di aplikasi Express Anda.

## Langkah Berikutnya

- Hubungkan helper database simulasi dengan database nyata menggunakan Mongoose atau Prisma.
- Implementasikan login dengan GitHub OAuth.

## Kesimpulan

Integrasi login sosial menggunakan Google OAuth 2.0 berhasil diselesaikan secara modular menggunakan Passport.js.

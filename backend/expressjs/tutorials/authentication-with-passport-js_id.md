---
title: "Autentikasi dengan Passport JS di Express"
description: "Pelajari cara mengimplementasikan autentikasi lokal yang aman (username dan password) di aplikasi Express.js menggunakan middleware Passport.js."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Autentikasi dengan Passport JS di Express

## Ringkasan

Tutorial ini memandu Anda dalam menyiapkan Autentikasi Lokal (username dan password) pada aplikasi Express.js menggunakan library Passport.js, mengamankan sesi pengguna (sessions), dan membatasi akses route privat.

## Target Audiens

Pengembang backend tingkat menengah yang ingin memahami autentikasi berbasis sesi (session-based) dan pengaturan strategi modular di Node.js.

## Prasyarat

- Pemahaman yang baik tentang Express.js dan middleware sesi (`express-session`).
- Node.js terinstal secara lokal.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Memahami arsitektur modular Passport dan konsep "Strategy".
- Mengonfigurasi `passport-local` untuk memvalidasi kredensial pengguna dari database.
- Mengimplementasikan serialisasi dan deserialisasi sesi.
- Melindungi rute Express menggunakan middleware autentikasi.

## Konteks dan Motivasi

Autentikasi adalah fitur utama dalam hampir semua aplikasi web. Membuat logika autentikasi dari nol sangat rentan terhadap celah keamanan. Passport.js menyediakan ekosistem modular yang matang dengan lebih dari 500+ strategi autentikasi, memungkinkan Anda mengelola sesi dengan aman serta memudahkan integrasi login sosial (seperti Google/GitHub) di masa mendatang.

## Konten Inti

### 1. Instalasi Dependensi

Instal Passport, strategi lokal, middleware sesi, dan bcryptjs:

```bash
npm install passport passport-local express-session bcryptjs
```

### 2. Konfigurasi Strategi Lokal

Definisikan cara Passport memverifikasi kredensial pengguna:

```javascript
// passport-config.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// Helper simulasi database
const findUserByUsername = (username) => {
  // Pada nyatanya: return await db.users.findUnique({ where: { username } });
  return { id: 1, username: 'admin', passwordHash: 'hashed_password' };
};

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = findUserByUsername(username);
    if (!user) {
      return done(null, false, { message: 'Username salah.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return done(null, false, { message: 'Password salah.' });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Serialisasi User
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  // Cari user berdasarkan ID di database
  done(null, { id: 1, username: 'admin' });
});
```

### 3. Integrasi dengan Express

Inisialisasi Passport dan sesi di aplikasi Express Anda:

```javascript
// app.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('./passport-config');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
```

## Contoh Kode

Berikut cara memproses login dan mengamankan rute privat:

```javascript
// Route Autentikasi
app.post('/api/login', passport.authenticate('local', {
  successRedirect: '/api/dashboard',
  failureRedirect: '/api/login-failed'
}));

// Middleware pelindung rute
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Akses tidak diizinkan (Unauthorized)" });
}

app.get('/api/dashboard', ensureAuthenticated, (req, res) => {
  res.json({ message: `Selamat datang di dashboard, ${req.user.username}!` });
});
```

## Insight Penting

- **Konsep Serialisasi**: Proses serialisasi hanya menyimpan ID pengguna dalam cookie sesi agar data berukuran kecil. Deserialisasi menanyakan database di setiap request berikutnya untuk memuat detail pengguna ke dalam `req.user`.
- **Keamanan Bcrypt**: Selalu lakukan hashing password sebelum disimpan ke database menggunakan bcrypt. Jangan pernah membandingkan password teks mentah.
- **Keamanan Sesi**: Di tahap produksi, pastikan cookie sesi menggunakan opsi `secure: true` (wajib HTTPS) dan `httpOnly: true` untuk menghindari serangan Cross-Site Scripting (XSS).

## Langkah Berikutnya

- Hubungkan helper database simulasi dengan database nyata menggunakan Mongoose atau Prisma.
- Implementasikan fitur logout dan validasi request input data login.

## Kesimpulan

Autentikasi lokal menggunakan Passport.js berhasil dikonfigurasi dan diintegrasikan dengan Express.js.

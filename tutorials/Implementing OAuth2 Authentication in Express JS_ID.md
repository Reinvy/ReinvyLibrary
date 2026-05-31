# Implementasi Autentikasi OAuth2 di Express JS

## Ringkasan Singkat

Tutorial ini menjelaskan cara mengimplementasikan autentikasi OAuth2 di aplikasi Express JS. Anda akan belajar cara mengintegrasikan login pihak ketiga (seperti Google atau GitHub) menggunakan Passport.js, yang memungkinkan autentikasi pengguna secara aman dan mulus tanpa harus mengelola kata sandi secara lokal.

## Untuk Siapa Materi Ini

Developer backend tingkat menengah yang sudah memahami dasar-dasar routing, middleware, dan memiliki pengalaman dengan Express JS. Keakraban dengan manajemen sesi (session) atau JWT akan sangat membantu, meskipun tidak diwajibkan.

## Prasyarat

- Pemahaman dasar tentang Node.js dan Express JS.
- Pengetahuan tentang apa itu middleware dan cara kerjanya di Express.
- Pemahaman dasar tentang HTTP dan RESTful API.
- Familiar dengan konsep manajemen sesi atau autentikasi berbasis token.

## Tujuan Belajar

- Memahami alur otorisasi OAuth2.
- Belajar cara mengonfigurasi Passport.js dengan strategi OAuth2.
- Mengatur rute untuk memulai alur OAuth2 dan menangani callback.
- Mengelola sesi pengguna atau token setelah autentikasi berhasil.
- Menerapkan middleware untuk melindungi rute yang memerlukan autentikasi.

## Konteks dan Motivasi

Dalam aplikasi web modern, memaksa pengguna untuk membuat dan mengingat kata sandi baru untuk setiap layanan akan menciptakan hambatan dan risiko keamanan. OAuth2 memungkinkan aplikasi Anda untuk mendelegasikan autentikasi kepada penyedia pihak ketiga yang tepercaya (seperti Google, Facebook, atau GitHub). Hal ini tidak hanya meningkatkan pengalaman pengguna dengan menawarkan tombol "Login dengan...", tetapi juga mengalihkan beban keamanan kata sandi dan manajemen kredensial ke penyedia yang terspesialisasi. Memahami OAuth2 sangat penting untuk membangun API dan aplikasi web modern yang ramah pengguna dan aman.

## Materi Inti

### 1. Memahami Alur OAuth2

OAuth2 adalah kerangka kerja otorisasi, tetapi sering digunakan untuk autentikasi (biasanya melalui OpenID Connect). Alur "Authorization Code" yang umum melibatkan:

1. **Permintaan Klien:** Pengguna mengklik "Login dengan Penyedia". Aplikasi Anda mengarahkan mereka ke URL otorisasi penyedia.
2. **Persetujuan Pengguna:** Pengguna login ke penyedia dan memberikan izin kepada aplikasi Anda untuk mengakses profil mereka.
3. **Kode Otorisasi:** Penyedia mengarahkan kembali pengguna ke URL callback aplikasi Anda dengan menyertakan kode otorisasi sementara.
4. **Pertukaran Token:** Server backend Anda secara aman menukarkan kode ini dengan Access Token (dan berpotensi Refresh Token) dari penyedia.
5. **Akses Data:** Aplikasi Anda menggunakan Access Token untuk mengambil informasi profil pengguna.

### 2. Mengatur Passport.js

Passport.js adalah middleware autentikasi paling populer untuk Express. Ia menggunakan "strategi" untuk mendukung berbagai mekanisme autentikasi. Untuk OAuth2, Anda biasanya akan menggunakan strategi spesifik seperti `passport-google-oauth20` atau `passport-github2`.

Untuk menggunakan Passport, Anda perlu menginisialisasinya dan mengintegrasikannya dengan manajemen sesi Anda (jika menggunakan sesi).

### 3. Mengonfigurasi Strategi

Anda harus mendaftarkan aplikasi Anda di penyedia OAuth untuk mendapatkan `clientID` dan `clientSecret`. Anda memberikan kredensial ini, bersama dengan `callbackURL`, untuk mengonfigurasi strategi. Strategi ini juga memerlukan fungsi callback verifikasi, yang dieksekusi ketika penyedia mengembalikan profil pengguna. Di sinilah Anda biasanya mencari atau membuat pengguna di database Anda.

### 4. Routing

Anda memerlukan dua rute utama untuk proses OAuth:

- **Rute Inisiasi:** Mengarahkan pengguna ke penyedia.
- **Rute Callback:** URL tempat penyedia mengarahkan kembali setelah pengguna memberikan persetujuan. Di sini, Passport menukarkan kode dengan token dan memanggil callback verifikasi Anda.

## Contoh / Ilustrasi

Berikut adalah contoh implementasi autentikasi OAuth2 GitHub menggunakan Passport.js.

### Langkah 1: Instal Dependensi

Anda biasanya akan menginstal paket-paket ini:

```bash
npm install express passport passport-github2 express-session dotenv
```

### Langkah 2: Konfigurasi Aplikasi

```javascript
require('dotenv').config();
const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');

const app = express();

// Konfigurasi middleware sesi
app.use(session({
  secret: 'super_secret_session_key',
  resave: false,
  saveUninitialized: false
}));

// Inisialisasi Passport dan pulihkan status autentikasi, jika ada, dari sesi.
app.use(passport.initialize());
app.use(passport.session());

// Serialisasi: Menentukan data apa dari objek pengguna yang harus disimpan di sesi
passport.serializeUser((user, done) => {
  done(null, user.id); // Biasanya hanya menyimpan ID pengguna
});

// Deserialisasi: Mengambil objek pengguna berdasarkan ID yang disimpan
passport.deserializeUser((id, done) => {
  // Dalam aplikasi nyata, kueri database Anda untuk pengguna berdasarkan ID
  const user = { id: id, username: 'example_user' };
  done(null, user);
});

// Konfigurasi Strategi GitHub
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || 'dummy_client_id',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy_client_secret',
    callbackURL: "http://localhost:3000/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // Dalam aplikasi nyata, Anda akan mencari atau membuat pengguna di database Anda di sini.
    // Untuk contoh ini, kita hanya meneruskan profil sebagai pengguna yang terautentikasi.
    return done(null, profile);
  }
));

// Rute untuk memulai alur OAuth
app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }));

// Rute callback yang ditangani oleh Passport
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Autentikasi berhasil, arahkan ke beranda.
    res.redirect('/profile');
  });

// Middleware rute terlindungi
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send('Unauthorized. Please log in.');
}

// Rute Profil Terlindungi
app.get('/profile', ensureAuthenticated, (req, res) => {
  res.send(`Halo, ${req.user.username || req.user.displayName}! Ini adalah profil Anda.`);
});

app.get('/login', (req, res) => {
  res.send('Login Gagal atau Silakan Login.');
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
```

## Insight Penting

- **Keamanan Client Secret:** Jangan pernah mengekspos `clientSecret` Anda di kode frontend atau repositori publik. Ini harus disimpan dengan aman di backend Anda, biasanya menggunakan environment variables.
- **Parameter State:** Implementasi OAuth modern menggunakan parameter `state` untuk mencegah serangan Cross-Site Request Forgery (CSRF) selama fase callback. Passport menangani ini secara otomatis untuk sebagian besar strategi.
- **API Stateless (JWT):** Jika Anda membangun REST API yang stateless, Anda mungkin tidak ingin menggunakan `express-session`. Sebagai gantinya, di rute callback, setelah Passport mengautentikasi pengguna, Anda dapat menghasilkan JWT dan mengirimkannya kembali ke klien (misalnya, melalui cookie HttpOnly yang aman atau dalam fragmen URL redirect).
- **Banyak Penyedia:** Anda dapat dengan mudah menambahkan beberapa strategi (Google, Facebook, dll.) ke aplikasi yang sama menggunakan pengaturan `passport.initialize()` yang sama, hanya dengan mengonfigurasi rute inisiasi dan callback yang berbeda untuk setiap penyedia.

## Ringkasan Akhir

- OAuth2 mendelegasikan autentikasi ke penyedia pihak ketiga, meningkatkan pengalaman pengguna dan keamanan.
- Alur standarnya melibatkan mengarahkan pengguna ke penyedia, menerima kode otorisasi, dan menukarkannya dengan access token di backend.
- Passport.js menyederhanakan integrasi OAuth di Express melalui ekosistem berbasis strateginya.
- Mengamankan aplikasi Anda melibatkan pengelolaan kredensial OAuth (Client ID dan Secret) dengan benar dan membuat sesi pengguna atau menghasilkan token dengan benar setelah callback berhasil.

## Langkah Belajar Berikutnya

- Pelajari cara menerbitkan JWT sebagai pengganti sesi setelah login OAuth berhasil.
- Jelajahi Role-Based Access Control (RBAC) untuk mengelola apa yang dapat dilakukan oleh pengguna yang terautentikasi.
- Pahami cara menangani penautan akun (misalnya, login dengan Google dan GitHub ke akun yang sama).

## Metadata

- Level: Menengah
- Topik utama: Autentikasi
- Topik terkait: Keamanan, Middleware, Routing
- Kata kunci: OAuth2, Passport.js, Social Login, Autentikasi, Express
- Estimasi waktu baca: 15 menit

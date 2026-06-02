# Implementing OAuth 2.0 Authentication in Express JS

## Ringkasan Singkat

Tutorial ini membahas implementasi autentikasi OAuth 2.0 pada aplikasi Express.js menggunakan Passport.js dan strategi Google OAuth 2.0. Materi ini memberikan pendekatan yang lugas untuk mengaktifkan login sosial (social login), memungkinkan pengguna untuk masuk dengan aman tanpa harus membuat kata sandi baru.

## Untuk Siapa Materi Ini

* Target pembaca: Intermediate Backend Developers, Full-stack Developers
* Level pembaca: Menengah (Intermediate)

## Prasyarat

* Pemahaman dasar tentang routing dan middleware di Express.js.
* Familiaritas dengan `express-session` atau konsep manajemen sesi.
* Pemahaman dasar tentang apa itu OAuth (walaupun akan dijelaskan secara singkat).
* Node.js sudah terinstal di lingkungan pengembangan Anda.

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Bagaimana OAuth 2.0 bekerja secara konseptual untuk autentikasi.
* Cara mengonfigurasi Google Cloud Console untuk mendapatkan kredensial OAuth (Client ID dan Secret).
* Cara mengatur dan mengonfigurasi Passport.js dengan `passport-google-oauth20` di Express.
* Cara mengelola sesi yang diautentikasi setelah login OAuth berhasil.

## Konteks dan Motivasi

Menerapkan autentikasi dari awal bisa menjadi sangat kompleks dan berisiko. Pengguna juga lebih menyukai kemudahan daripada harus membuat akun baru untuk setiap aplikasi. OAuth 2.0 menyelesaikan kedua masalah ini dengan memungkinkan aplikasi mendelegasikan autentikasi secara aman kepada penyedia tepercaya seperti Google, GitHub, atau Facebook. Ini tidak hanya meningkatkan pengalaman pendaftaran pengguna (social login) tetapi juga memindahkan beban penyimpanan kata sandi yang aman ke penyedia identitas, membuat aplikasi Anda pada dasarnya lebih aman.

## Materi Inti

### 1. Memahami OAuth 2.0 dan Passport.js

OAuth 2.0 sebenarnya adalah framework otorisasi, tetapi sangat sering digunakan untuk autentikasi (biasanya melalui OpenID Connect). Alur kerjanya umumnya melibatkan:

1. Pengguna mengklik "Login with Google".
2. Aplikasi mengarahkan pengguna ke layar persetujuan (consent screen) Google.
3. Pengguna memberikan izin.
4. Google mengarahkan kembali ke aplikasi dengan membawa kode otorisasi.
5. Aplikasi menukar kode tersebut dengan access token (dan profil pengguna).

**Passport.js** adalah middleware autentikasi standar untuk Node.js. Ia menyederhanakan alur kompleks ini menjadi serangkaian langkah konfigurasi dan route.

### 2. Mengatur Kredensial Google

Sebelum menulis kode, Anda memerlukan kredensial:

1. Pergi ke [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru.
3. Navigasi ke **APIs & Services > Credentials**.
4. Klik **Create Credentials > OAuth client ID**.
5. Konfigurasi Consent Screen jika diminta.
6. Set Application Type menjadi "Web application".
7. Tambahkan Authorized redirect URI (contoh: `http://localhost:3000/auth/google/callback`).
8. Simpan dan catat **Client ID** serta **Client Secret** Anda.

### 3. Paket yang Dibutuhkan

Anda akan membutuhkan beberapa paket untuk menangani sesi dan OAuth:

```bash
npm install express express-session passport passport-google-oauth20 dotenv
```

### 4. Mengimplementasikan Alur Autentikasi

Kita akan menggunakan `express-session` untuk menjaga pengguna tetap login, menginisialisasi `passport`, mengonfigurasi `GoogleStrategy`, dan mengatur rute untuk login serta menangani callback.

## Contoh / Ilustrasi

Berikut adalah contoh lengkap dan minimalis dari aplikasi Express yang mengintegrasikan Google OAuth 2.0.

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const PORT = 3000;

// 1. Konfigurasi Express Session
app.use(session({
  secret: 'my_super_secret_key', // Di production, gunakan string acak yang kuat dari .env
  resave: false,
  saveUninitialized: false,
}));

// 2. Inisialisasi Passport dan pulihkan status autentikasi, jika ada, dari sesi
app.use(passport.initialize());
app.use(passport.session());

// 3. Konfigurasi Strategi Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    // Pada aplikasi nyata, Anda akan mencari atau membuat pengguna di database Anda di sini.
    // Untuk contoh ini, kita hanya mengembalikan objek profil.
    return cb(null, profile);
  }
));

// 4. Serialize dan Deserialize User
// Serialization menentukan apa yang disimpan di dalam sesi (misal: ID pengguna)
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

// Deserialization mengambil data pengguna berdasarkan identifier yang disimpan
passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

// 5. Definisi Routes

// Homepage
app.get('/', (req, res) => {
  res.send('<h1>Home</h1><a href="/auth/google">Login with Google</a>');
});

// Memulai alur Google OAuth
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Route callback dari Google
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Autentikasi berhasil, arahkan ke home atau dashboard.
    res.redirect('/profile');
  }
);

// Route Profil yang Dilindungi
app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.send(`<h1>Welcome, ${req.user.displayName}</h1><a href="/logout">Logout</a>`);
});

// Route Logout
app.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
```

## Insight Penting

* **Keamanan Sesi:** Pastikan Anda mengonfigurasi `express-session` dengan benar untuk produksi. Gunakan cookie aman (`cookie: { secure: true }`) jika Anda menggunakan HTTPS, dan gunakan penyimpan sesi yang tepat (seperti Redis atau MongoDB) daripada MemoryStore bawaan untuk mencegah kebocoran memori.
* **Integrasi Database:** Pada fungsi callback verifikasi `GoogleStrategy`, jangan hanya mengembalikan `profile`. Anda harus melakukan query ke database untuk melihat apakah pengguna dengan ID Google tersebut sudah ada. Jika tidak ada, buatlah record pengguna baru.
* **Pemisahan Tanggung Jawab (Separation of Concerns):** Simpan konfigurasi Passport Anda di file terpisah (misalnya, `config/passport.js`) alih-alih menjejalkannya di `server.js` atau `app.js` utama Anda.
* **Parameter State:** Untuk keamanan tambahan, implementasikan parameter `state` pada alur OAuth Anda guna mencegah serangan Cross-Site Request Forgery (CSRF). `passport-google-oauth20` dapat menangani ini dengan meneruskan `{ state: true }` dalam opsi autentikasi.

## Ringkasan Akhir

* OAuth 2.0 mendelegasikan autentikasi ke penyedia pihak ketiga seperti Google, menawarkan pengalaman "Social Login" yang mulus.
* Passport.js adalah middleware tangguh yang mengabstraksi kompleksitas alur OAuth.
* Implementasi Google OAuth memerlukan pengaturan kredensial di Google Cloud Console.
* Alurnya terdiri dari pengalihan (redirect) ke Google, menerima kode otorisasi, dan menukarnya dengan detail profil pengguna.
* Sesi biasanya digunakan untuk mempertahankan status login pengguna di seluruh permintaan (requests) setelah autentikasi berhasil.

## Langkah Belajar Berikutnya

* Authentication and Authorization with JWT in Express
* Handling File Uploads in Express JS with Multer
* Understanding Cookies and Session Management in Express JS
* Implementing Role-Based Access Control in Express JS

## Metadata

* Level: Intermediate
* Topik utama: Authentication, Express.js
* Topik terkait: OAuth 2.0, Passport.js, Security
* Kata kunci: express, oauth, passport, google login, authentication
* Estimasi waktu baca: 10 menit

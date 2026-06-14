# Mengimplementasikan Autentikasi OAuth2 dengan Passport di Express JS

## Ringkasan Singkat

Tutorial ini menjelaskan cara mengimplementasikan autentikasi OAuth2 pada aplikasi Express.js menggunakan library populer `passport`. Kita akan fokus pada integrasi "Login dengan Google" sebagai contoh praktis untuk mendemonstrasikan alur OAuth2, termasuk mengatur aplikasi di Google Developer Console, mengonfigurasi *strategy* Passport, dan mengelola sesi pengguna.

## Untuk Siapa Materi Ini

Materi ini dirancang untuk developer backend level menengah (intermediate) yang sudah memiliki pemahaman dasar tentang Express.js, *routing*, dan manajemen sesi (*session management*), serta ingin menambahkan fitur login sosial pihak ketiga (seperti Google, GitHub, atau Facebook) ke aplikasi mereka dengan aman.

## Prasyarat

- Pemahaman dasar tentang *routing* dan *middleware* di Express.js.
- Keakraban dengan konsep autentikasi dan sesi (*sessions*).
- Node.js sudah terinstal di komputer lokal Anda.
- Pemahaman dasar tentang cara kerja API dan *callback*.

## Tujuan Belajar

- Memahami konsep dasar dan alur kerja (*flow*) dari protokol OAuth2.
- Mempelajari cara mengonfigurasi aplikasi OAuth2 (contoh: Google OAuth2).
- Mempelajari cara mengintegrasikan `passport` dan `passport-google-oauth20` ke dalam aplikasi Express.js.
- Memahami cara menangani rute *callback* autentikasi dan mengelola sesi pengguna setelah berhasil login dengan OAuth2.

## Konteks dan Motivasi

Aplikasi web modern sering kali menawarkan kemampuan bagi pengguna untuk login menggunakan akun mereka yang sudah ada dari penyedia layanan seperti Google, Facebook, atau GitHub. Hal ini meningkatkan pengalaman pengguna (*user experience*) dengan menghilangkan kebutuhan untuk membuat dan mengingat kata sandi baru, yang sering kali juga meningkatkan tingkat konversi. OAuth2 adalah protokol standar industri untuk otorisasi yang memungkinkan hal ini terjadi. Mengimplementasikan OAuth2 dari nol bisa menjadi sangat kompleks dan rentan terhadap kesalahan, tetapi menggunakan library `passport` di Express.js secara signifikan menyederhanakan prosesnya, menyediakan cara standar untuk menangani berbagai strategi autentikasi.

## Materi Inti

### 1. Memahami Alur OAuth2

OAuth2 memungkinkan sebuah aplikasi untuk mengakses sumber daya yang dihosting oleh aplikasi web lain atas nama pengguna. Alur "Social Login" yang umum meliputi:

1. **Pengguna** mengklik "Login dengan Google".
2. **Aplikasi** mengarahkan pengguna ke layar persetujuan (*consent screen*) Google.
3. **Pengguna** login ke Google dan memberikan izin kepada Aplikasi untuk mengakses profil mereka.
4. **Google** mengarahkan pengguna kembali ke Aplikasi dengan membawa kode otorisasi (*authorization code*).
5. **Aplikasi** menukarkan kode otorisasi tersebut dengan *access token* (dan opsional *refresh token*) secara langsung ke Google.
6. **Aplikasi** menggunakan *access token* untuk mengambil data profil pengguna dan membuat pengguna tersebut dalam keadaan login (authenticated).

### 2. Mengatur Google Developer Console

Untuk menggunakan Google OAuth2, Anda harus membuat sebuah proyek di [Google Cloud Console](https://console.cloud.google.com/):

1. Buat proyek baru.
2. Navigasi ke **APIs & Services > Credentials**.
3. Klik **Create Credentials > OAuth client ID**.
4. Konfigurasikan *OAuth consent screen* jika diminta (pilih "External" untuk pengujian).
5. Set *Application type* menjadi **Web application**.
6. Tambahkan **Authorized redirect URI** (misalnya, `http://localhost:3000/auth/google/callback`).
7. Simpan **Client ID** dan **Client Secret**. Jaga kerahasiaan secret tersebut!

### 3. Menginstal Dependensi

Anda akan membutuhkan Express, Passport, Google Strategy, dan pengelola sesi (*session manager*).

```bash
npm install express passport passport-google-oauth20 express-session
```

### 4. Mengonfigurasi Passport dan Express

Anda perlu mengonfigurasi `express-session` untuk mengelola sesi pengguna, menginisialisasi Passport, dan mengatur Passport Google Strategy menggunakan Client ID dan Secret Anda. Anda juga perlu mendefinisikan bagaimana Passport melakukan proses serialisasi dan deserialisasi informasi pengguna ke dan dari sesi.

### 5. Membuat Rute Autentikasi

Anda membutuhkan dua rute utama:

- Rute untuk memulai proses autentikasi (mengarahkan pengguna ke Google).
- Rute *callback* di mana Google akan mengarahkan pengguna kembali ke aplikasi Anda beserta kode otorisasinya.

## Contoh / Ilustrasi

Berikut adalah contoh minimal dan lengkap dari aplikasi Express yang menggunakan `passport-google-oauth20`:

```javascript
// app.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// 1. Konfigurasi Express Session
app.use(session({
  secret: 'kunci_rahasia_super_anda', // Ganti dengan secret yang kuat di production
  resave: false,
  saveUninitialized: true,
}));

// 2. Inisialisasi Passport
app.use(passport.initialize());
app.use(passport.session());

// 3. Konfigurasi Google Strategy
passport.use(new GoogleStrategy({
    clientID: 'CLIENT_ID_GOOGLE_ANDA',         // Ganti dengan Client ID Anda
    clientSecret: 'CLIENT_SECRET_GOOGLE_ANDA', // Ganti dengan Client Secret Anda
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // Pada aplikasi nyata, Anda akan mencari atau membuat user di database di sini.
    // Untuk contoh ini, kita hanya meneruskan profile sebagai objek user.
    return done(null, profile);
  }
));

// 4. Serialisasi dan Deserialisasi User
passport.serializeUser(function(user, done) {
  // Menyimpan identifier unik pengguna ke dalam sesi
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  // Pada aplikasi nyata, ambil data user dari database menggunakan id
  // Untuk contoh ini, kita menggunakan objek user tiruan (mock)
  done(null, { id: id, name: 'User Tiruan' });
});

// 5. Rute Autentikasi

// Memulai proses Login Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

// Rute Callback dari Google
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Autentikasi berhasil, arahkan ke halaman utama/profil.
    res.redirect('/profile');
  });

// 6. Contoh Rute yang Dilindungi (Protected Route)
app.get('/profile', (req, res) => {
  // req.isAuthenticated() disediakan oleh Passport
  if (req.isAuthenticated()) {
      res.send(`<h1>Selamat datang, ${req.user.name}</h1><a href="/logout">Logout</a>`);
  } else {
      res.redirect('/auth/google');
  }
});

// 7. Rute Logout
app.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.get('/', (req, res) => {
    res.send('<a href="/auth/google">Login dengan Google</a>');
});

app.listen(3000, () => {
  console.log('Server berjalan di http://localhost:3000');
});
```

## Insight Penting

- **Keamanan (Security):** Jangan pernah mengekspos `clientSecret` Anda ke kode sisi klien (frontend) atau men-commit-nya ke repositori publik. Selalu gunakan *environment variables* (`.env`).
- **Scopes (Cakupan):** Parameter `scope` di dalam `passport.authenticate` mendefinisikan informasi apa yang Anda minta dari pengguna (misalnya, `['profile', 'email']`). Hanya minta data yang benar-benar Anda butuhkan.
- **API Stateless:** Jika Anda membangun API yang sepenuhnya *stateless* (misalnya, backend untuk React/Vue SPA atau aplikasi mobile) dan bukan aplikasi web tradisional yang dirender oleh server, Anda mungkin tidak menggunakan `express-session`. Sebagai gantinya, setelah rute *callback* OAuth berhasil, server Anda akan menghasilkan sebuah JWT (JSON Web Token) dan mengirimkannya kembali ke klien.
- **Integrasi Database:** *Callback* `verify` di dalam `GoogleStrategy` adalah tempat di mana Anda menjembatani penyedia OAuth dan database Anda sendiri. Anda harus mencari pengguna berdasarkan ID Google mereka, dan jika belum ada, buat rekam jejak pengguna baru sebelum memanggil `done(null, user)`.

## Ringkasan Akhir

- OAuth2 menyediakan cara yang aman dan ramah pengguna untuk mengimplementasikan login sosial.
- `passport.js` bertindak sebagai *middleware* untuk Node.js yang mengabstraksi kompleksitas berbagai strategi autentikasi.
- Mengimplementasikan Google OAuth2 membutuhkan pengaturan kredensial di Google Developer Console, mengonfigurasi `passport-google-oauth20`, menangani sesi, dan mendefinisikan rute untuk login dan *callback*.
- Selalu amankan *client secrets* Anda dan tangani data pengguna dengan bertanggung jawab.

## Langkah Belajar Berikutnya

- [Authentication and Authorization with JWT in Express_ID](Authentication%20and%20Authorization%20with%20JWT%20in%20Express_ID.md)
- [Working with Cookies and Sessions in Express JS_ID](Working%20with%20Cookies%20and%20Sessions%20in%20Express%20JS_ID.md)
- [Environment Variables in Express JS_ID](Environment%20Variables%20in%20Express%20JS_ID.md)

## Metadata

- Level: Menengah
- Topik utama: Autentikasi, Express.js
- Topik terkait: Passport.js, OAuth2, Keamanan, Sesi
- Kata kunci: express, passport, oauth2, login google, autentikasi, social login
- Estimasi waktu baca: 12 menit

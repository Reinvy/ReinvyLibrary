---
title: "Implementasi OAuth 2.0 dan Social Login di Express JS"
description: "Materi ini memberikan panduan komprehensif tentang implementasi OAuth 2.0 dan social login (seperti \"Login dengan Google\") dalam aplikasi Express.js. Anda akan"
category: "backend"
technology: "passport-js"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Implementasi OAuth 2.0 dan Social Login di Express JS

## Ringkasan Singkat

Materi ini memberikan panduan komprehensif tentang implementasi OAuth 2.0 dan *social login* (seperti "Login dengan Google") dalam aplikasi Express.js. Anda akan mempelajari alur teoretis OAuth dan cara mengaplikasikannya secara praktis menggunakan `Passport.js` untuk memungkinkan autentikasi pihak ketiga yang aman dan lancar.

---

## Untuk Siapa Materi Ini

* **Target Audience:** Developer backend tingkat menengah yang membangun aplikasi Node.js.
* **Level:** Menengah hingga Lanjut (Intermediate to Advanced).

---

## Prasyarat

* Pemahaman yang kuat tentang routing dan middleware Express.js.
* Terbiasa dengan konsep autentikasi dan manajemen sesi (session) di Express.js.
* Pengalaman sebelumnya atau pemahaman tentang [Understanding Cookies and Session Management in Express JS_ID](Understanding%20Cookies%20and%20Session%20Management%20in%20Express%20JS_ID.md).

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Konsep inti dan alur protokol OAuth 2.0.
* Cara mendaftarkan aplikasi pada penyedia pihak ketiga (misalnya, Google Developer Console) untuk mendapatkan Client ID dan Client Secret.
* Cara mengonfigurasi dan mengintegrasikan `Passport.js` dengan strategi `passport-google-oauth20` di aplikasi Express.
* Cara menangani sesi pengguna dengan aman setelah login OAuth berhasil.

---

## Konteks dan Motivasi

Dalam aplikasi web modern, memaksa pengguna untuk membuat dan mengingat set kredensial baru (username dan password) seringkali menimbulkan gesekan (*friction*) dan menurunkan tingkat konversi. *Social login* memungkinkan pengguna untuk melakukan autentikasi menggunakan akun yang sudah ada dari penyedia seperti Google, GitHub, atau Facebook.

OAuth 2.0 adalah protokol standar industri untuk otorisasi. Protokol ini memungkinkan aplikasi pihak ketiga untuk mendapatkan akses terbatas ke layanan web tanpa mengekspos kredensial pengguna. Mengimplementasikan OAuth secara aman sangat krusial untuk melindungi data pengguna sekaligus memberikan pengalaman yang mulus. Dengan memanfaatkan `Passport.js`, developer dapat mengabstraksikan kerumitan alur OAuth menjadi pola middleware yang terstandarisasi dan dapat digunakan kembali.

---

## Materi Inti

### 1. Apa itu OAuth 2.0?

OAuth 2.0 (Open Authorization) adalah framework yang memungkinkan sebuah aplikasi mendapatkan akses terbatas ke akun pengguna pada layanan HTTP, seperti Google, Facebook, atau GitHub.

Alih-alih pengguna memberikan kata sandi mereka secara langsung ke aplikasi Anda, OAuth bekerja dengan mengarahkan (*redirect*) pengguna ke penyedia (misalnya, Google) untuk masuk dan memberikan izin. Setelah berhasil, penyedia akan mengarahkan kembali ke aplikasi Anda membawa *Authorization Code* atau *Access Token*.

### 2. Alur OAuth 2.0 (Authorization Code Grant)

Untuk aplikasi web berbasis server seperti Express, Authorization Code Grant adalah alur standarnya:

1. **Inisiasi Pengguna:** Pengguna mengklik "Login dengan Google".
2. **Permintaan Otorisasi:** Aplikasi Anda mengarahkan pengguna ke layar persetujuan (*consent screen*) Google, meminta izin spesifik (seperti akses `profile`, `email`).
3. **Pemberian Izin:** Pengguna masuk ke Google dan menyetujui akses tersebut.
4. **Kode Otorisasi (Authorization Code):** Google mengarahkan pengguna kembali ke URL *callback* aplikasi Anda, meneruskan kode otorisasi pada *query parameter* URL.
5. **Pertukaran Token (Token Exchange):** Server aplikasi Anda secara aman menukarkan kode otorisasi tersebut dengan *Access Token* (dan opsional *Refresh Token*) secara langsung dengan server Google.
6. **Mengambil Data Pengguna:** Aplikasi Anda menggunakan Access Token tersebut untuk meminta informasi profil pengguna dari Google.
7. **Pembuatan Sesi:** Aplikasi Anda mencatat pengguna sebagai *logged in* (misalnya, membuat sesi atau menerbitkan JWT).

### 3. Menyiapkan Penyedia (Google)

Sebelum menulis kode, Anda harus mendaftarkan aplikasi Anda di Google:

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru.
3. Navigasi ke **APIs & Services > Credentials**.
4. Konfigurasikan **OAuth consent screen**.
5. Buat kredensial **OAuth client ID** (Web application).
6. Tambahkan Authorized redirect URI (contoh: `http://localhost:3000/auth/google/callback`).
7. Catat **Client ID** dan **Client Secret** Anda. (Jangan pernah memasukkan ini ke version control!).

### 4. Implementasi dengan Passport.js

`Passport.js` adalah middleware autentikasi untuk Node.js. Ia menggunakan "strategi" untuk mengautentikasi *request*. Kita akan menggunakan `passport-google-oauth20`.

#### Langkah 4.1: Instalasi

```bash
npm install express express-session passport passport-google-oauth20
```

#### Langkah 4.2: Setup Dasar Server Express dan Session

OAuth di Passport biasanya mengandalkan sesi untuk menjaga pengguna tetap masuk di seluruh *request*.

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('passport');

const app = express();

// Konfigurasi sesi
app.use(session({
    secret: 'KUNCI_RAHASIA_SUPER_ANDA',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Ubah jadi true di production dengan HTTPS
}));

// Inisialisasi Passport dan pulihkan status autentikasi dari sesi (jika ada).
app.use(passport.initialize());
app.use(passport.session());
```

#### Langkah 4.3: Mengonfigurasi Strategi Google

```javascript
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'client-id-anda',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'client-secret-anda',
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    // Callback ini dieksekusi setelah token berhasil ditukarkan.
    // Di sini, Anda biasanya mencari atau membuat user di database.
    console.log("Profil Google:", profile);

    // Di aplikasi nyata:
    // User.findOrCreate({ googleId: profile.id }, function (err, user) {
    //   return cb(err, user);
    // });

    // Untuk contoh ini, kita cukup meneruskan profil sebagai objek user
    return cb(null, profile);
  }
));
```

#### Langkah 4.4: Serialization dan Deserialization

Passport perlu mengetahui bagaimana cara menyimpan pengguna ke dalam sesi dan bagaimana cara mengambilnya kembali.

```javascript
// Serialize user untuk disimpan di session
passport.serializeUser(function(user, cb) {
  cb(null, user); // Di aplikasi nyata, Anda mungkin hanya menyimpan user.id
});

// Deserialize user dari session
passport.deserializeUser(function(obj, cb) {
  cb(null, obj); // Di aplikasi nyata, Anda mencari user berdasarkan ID di DB
});
```

#### Langkah 4.5: Membuat Route

Kita membutuhkan tiga route utama: pemicu (trigger), *callback*, dan rute yang diproteksi.

```javascript
// 1. Memicu alur OAuth
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. Callback tempat Google mengarahkan setelah persetujuan
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Autentikasi berhasil, arahkan ke beranda atau profil.
    res.redirect('/profile');
  });

// 3. Rute yang diproteksi
app.get('/profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized. Silakan login.');
    }
    res.send(`<h1>Selamat datang, ${req.user.displayName}</h1><a href="/logout">Logout</a>`);
});

// 4. Rute logout
app.get('/logout', (req, res, next) => {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
});
```

---

## Contoh / Ilustrasi

Bayangkan Anda ingin masuk ke klub eksklusif (Aplikasi Express Anda).

1. Daripada memberikan KTP dan password Anda ke penjaga pintu, Anda bilang: "Google bisa menjamin saya."
2. Penjaga pintu (Aplikasi Express) mengirim Anda ke loket Google yang aman (`/auth/google`).
3. Anda login di loket Google dan berkata, "Ya, saya izinkan klub ini mengetahui nama dan email saya."
4. Google memberi Anda tiket sekali pakai khusus (Authorization Code) dan mengirim Anda kembali ke pintu belakang klub (`/auth/google/callback`).
5. Server klub mengambil tiket tersebut, diam-diam berbicara dengan Google untuk memverifikasinya, dan menukarnya dengan kartu VIP (Access Token).
6. Klub kemudian menulis nama Anda di daftar tamu mereka (Session) dan mempersilakan Anda masuk ke ruang VIP (`/profile`).

---

## Insight Penting

* **Parameter State untuk Keamanan:** Untuk mencegah serangan CSRF (*Cross-Site Request Forgery*) selama alur OAuth, pastikan parameter `state` digunakan (Passport menanganinya secara otomatis di versi terbaru, tetapi penting untuk dipahami).
* **Jangan Pernah Mengekspos Client Secret:** `clientSecret` tidak boleh dikirim ke *frontend* atau di-*commit* ke source control. Selalu gunakan *environment variables* (`process.env.GOOGLE_CLIENT_SECRET`).
* **Menangani Pengguna yang Sudah Ada:** Jika pengguna login dengan Google, tetapi akun dengan email tersebut sudah ada melalui pendaftaran standar, Anda memerlukan logika untuk menautkan akun tersebut dengan rapi, alih-alih membuat duplikat atau menghasilkan *error*.
* **Pemisahan Konteks (Separation of Concerns):** Simpan konfigurasi Passport Anda di file terpisah (misalnya, `config/passport.js`) daripada menumpuknya di file utama `app.js` Anda.

---

## Ringkasan Akhir

* OAuth 2.0 adalah protokol otorisasi yang memungkinkan pengguna memberikan izin ke aplikasi pihak ketiga untuk mengakses data mereka tanpa membagikan kata sandi.
* Alur Authorization Code Grant adalah metode standar dan paling aman untuk aplikasi berbasis server.
* `Passport.js` menyederhanakan implementasi OAuth dengan menyediakan strategi seperti `passport-google-oauth20`.
* Alur tersebut melibatkan *redirect* ke penyedia layanan, menangani *callback*, bertukar token, dan mengelola sesi pengguna.
* Praktik keamanan terbaik melibatkan perlindungan pada *client secret* dan penggunaan sesi secara aman.

---

## Langkah Belajar Berikutnya

* [Implementing Role-Based Access Control in Express JS_ID](Implementing%20Role-Based%20Access%20Control%20in%20Express%20JS_ID.md) (Untuk membatasi rute tertentu hanya bagi admin).
* Pelajari tentang pengamanan API menggunakan JWT alih-alih sesi untuk integrasi OAuth *stateless* (sering digunakan di *Single Page Applications*).

---

## Metadata

* Level: Menengah
* Topik utama: Express.js, Keamanan, Autentikasi
* Topik terkait: OAuth 2.0, Passport.js, Social Login
* Kata kunci: express oauth, passport js, google login, node js oauth2
* Estimasi waktu baca: 12 - 15 menit

---
title: "Autentikasi dengan Passport JS di Express"
description: "Materi ini membahas cara mengimplementasikan autentikasi di Express.js menggunakan Passport.js, middleware autentikasi yang populer dan fleksibel untuk Node.js."
category: "backend"
technology: "passport-js"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Autentikasi dengan Passport JS di Express

## Ringkasan Singkat

Materi ini membahas cara mengimplementasikan autentikasi di Express.js menggunakan Passport.js, *middleware* autentikasi yang populer dan fleksibel untuk Node.js. Materi ini menjelaskan cara mengatur autentikasi lokal (*username* dan *password*) dan menyentuh sedikit tentang arsitektur berbasis strategi yang modular.

---

## Untuk Siapa Materi Ini

- Target audiens: Developer web tingkat menengah.
- Level: Menengah (*Intermediate*).

---

## Prasyarat

Beberapa hal yang sebaiknya sudah dipahami:

- *Routing* dan *middleware* dasar Express.js.
- Pemahaman tentang *Cookies* dan *Session Management* di Express JS.
- Keakraban dengan operasi *database* dasar (misalnya, MongoDB dengan Mongoose atau serupa).
- Pengetahuan umum tentang konsep autentikasi.

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

- Cara kerja Passport.js dan arsitektur berbasis strateginya.
- Cara mengimplementasikan autentikasi lokal menggunakan `passport-local`.
- Cara melakukan *serialize* dan *deserialize* *user* untuk mempertahankan sesi *login*.
- *Best practice* untuk menyusun *route* dan *middleware* autentikasi.

---

## Konteks dan Motivasi

Autentikasi adalah kebutuhan inti untuk sebagian besar aplikasi web. Membangun sistem autentikasi dari awal bisa menjadi kompleks dan rentan terhadap kesalahan, melibatkan *hashing password* yang aman, manajemen sesi, dan penanganan kesalahan (*error handling*) yang kuat. Passport.js memecahkan ini dengan menyediakan *framework* autentikasi yang komprehensif, aman, dan dapat diperluas (*extensible*). Dengan menggunakan Passport, *developer* dapat mengimplementasikan berbagai metode autentikasi (lokal, OAuth, OpenID) secara konsisten, menghemat waktu, dan mengurangi risiko keamanan. Ini adalah standar industri di ekosistem Node.js.

---

## Materi Inti

### 1. Apa itu Passport.js?

Passport adalah *middleware* autentikasi untuk Node.js. Tujuan utamanya adalah untuk mengautentikasi *request*, yang dilakukannya melalui serangkaian *plugin* yang dapat diperluas yang dikenal sebagai **strategi**. Passport tidak memasang *route* atau mengasumsikan skema *database* tertentu, menjadikannya sangat fleksibel.

### 2. Arsitektur Berbasis Strategi

Passport menggunakan konsep **Strategi** untuk mengautentikasi *request*. Ada lebih dari 500 strategi yang tersedia, mulai dari autentikasi lokal (*username* dan *password*) hingga autentikasi yang didelegasikan (misalnya, Google, Facebook, Twitter melalui OAuth).

Untuk menggunakan Passport, Anda mengonfigurasi strategi spesifik yang dibutuhkan aplikasi Anda. Dalam tutorial ini, kita fokus pada `passport-local`, yang menggunakan *username* dan *password*.

### 3. Komponen Inti Passport

Mengimplementasikan Passport melibatkan tiga komponen utama:

- **Strategi Autentikasi:** Logika yang menentukan cara memverifikasi kredensial *user*.
- **Middleware Aplikasi:** Menginisialisasi Passport dan menghubungkannya ke sesi.
- **Sesi (Serialization/Deserialization):** Menyimpan informasi *user* dalam sesi sehingga mereka tetap terautentikasi di seluruh *request*.

### 4. Menyiapkan Strategi Lokal Passport

Untuk mengautentikasi menggunakan *username* dan *password*, Anda harus mengonfigurasi `LocalStrategy`. Strategi ini memerlukan fungsi *callback* yang memverifikasi kredensial yang diberikan terhadap *database* Anda.

Jika kredensial valid, *callback* mengembalikan objek *user*. Jika tidak valid, fungsi akan mengembalikan `false`, seringkali dengan pesan kesalahan.

### 5. Mengelola Sesi

Dalam aplikasi web pada umumnya, kredensial hanya dikirimkan selama *login* awal. *Request* selanjutnya diautentikasi melalui sesi. Passport mengharuskan Anda untuk menentukan bagaimana *user* di-*serialize* ke dalam sesi dan di-*deserialize* dari sesi.

- **Serialization:** Menentukan data mana dari objek *user* yang harus disimpan dalam sesi (biasanya ID *user*).
- **Deserialization:** Mengambil seluruh objek *user* berdasarkan ID yang disimpan dari *database* pada *request* berikutnya.

---

## Contoh / Ilustrasi

Berikut adalah contoh komprehensif menyiapkan Passport dengan strategi lokal di aplikasi Express.

### Langkah 1: Instal Dependencies

```bash
npm install express express-session passport passport-local
```

### Langkah 2: Konfigurasi Passport dan Strategi

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const app = express();
app.use(express.urlencoded({ extended: false }));

// Dummy database user
const users = [{ id: 1, username: 'testuser', password: 'password123' }];

// 1. Konfigurasi Local Strategy
passport.use(new LocalStrategy(
  (username, password, done) => {
    // Cari user di database
    const user = users.find(u => u.username === username);

    if (!user) {
      return done(null, false, { message: 'Username salah.' });
    }
    if (user.password !== password) {
      return done(null, false, { message: 'Password salah.' });
    }

    // Autentikasi berhasil
    return done(null, user);
  }
));

// 2. Serialize user ke sesi
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// 3. Deserialize user dari sesi
passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user);
});

// Inisialisasi sesi dan Passport
app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Route Login
app.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login-failed'
}));

// Middleware Route Terlindungi (Protected Route)
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.send(`Selamat datang di dashboard Anda, ${req.user.username}!`);
});

app.listen(3000, () => console.log('Server berjalan di port 3000'));
```

### Penjelasan Kode

- Kita mengonfigurasi `LocalStrategy` yang memeriksa apakah *username* dan *password* cocok dengan *database* tiruan (*dummy*) kita.
- `passport.serializeUser` menyimpan `user.id` ke dalam sesi.
- `passport.deserializeUser` menggunakan `id` dari sesi untuk mengambil objek *user* lengkap, yang kemudian dilampirkan ke `req.user`.
- *Route* `/login` menggunakan `passport.authenticate`, yang secara otomatis menangani proses *login*.
- *Middleware* `isAuthenticated` menggunakan `req.isAuthenticated()` (disediakan oleh Passport) untuk melindungi *route* `/dashboard`.

---

## Insight Penting

- **Separation of Concerns:** Simpan logika autentikasi (konfigurasi strategi) dalam file terpisah (misalnya, `config/passport.js`) untuk menjaga file *routing* tetap bersih.
- **Keamanan:** Jangan pernah menyimpan *password plain text* di *production*. Selalu *hash password* menggunakan *library* seperti `bcrypt` sebelum menyimpannya dan gunakan `bcrypt.compare` di dalam `LocalStrategy` Anda.
- **API Stateless:** Jika Anda membangun RESTful API (misalnya, untuk aplikasi *mobile* atau *frontend* React), Anda mungkin tidak menggunakan sesi. Sebagai gantinya, Anda dapat menggunakan Passport dengan strategi `passport-jwt` untuk mengautentikasi *request* menggunakan JSON Web Tokens.
- **Error Handling:** Gunakan *callback custom* dengan `passport.authenticate` jika Anda memerlukan kontrol terperinci atas respons alih-alih pengalihan (*redirect*) otomatis.

---

## Ringkasan Akhir

- Passport.js adalah *middleware* autentikasi serbaguna untuk Express yang menggunakan arsitektur berbasis strategi.
- `passport-local` digunakan untuk autentikasi *username* dan *password* tradisional.
- Status autentikasi dipertahankan menggunakan sesi melalui `serializeUser` dan `deserializeUser`.
- Passport melampirkan *user* yang diautentikasi ke objek *request* (`req.user`) dan menyediakan metode *helper* seperti `req.isAuthenticated()`.

---

## Langkah Belajar Berikutnya

- Pelajari cara melakukan *hashing password* dengan `bcrypt` bersama Passport.
- Pelajari tentang *Authentication and Authorization with JWT in Express* untuk API yang *stateless*.
- Implementasikan *login* sosial menggunakan strategi OAuth (misalnya, `passport-google-oauth20`).
- Pahami *Implementing Role-Based Access Control in Express JS* untuk mengelola izin *user*.

---

## Metadata

- Level: Menengah
- Topik utama: Express JS, Autentikasi
- Topik terkait: Middleware, Keamanan, Manajemen Sesi
- Kata kunci: express js, passport js, autentikasi, local strategy, login
- Estimasi waktu baca: 15 menit

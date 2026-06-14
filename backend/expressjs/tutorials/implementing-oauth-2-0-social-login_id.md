---
title: "Implementing OAuth 2.0 Social Login in Express JS"
description: "Materi ini menjelaskan cara mengintegrasikan social login OAuth 2.0 (seperti Google dan GitHub) ke dalam aplikasi Express.js menggunakan library Passport.js yan"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Implementing OAuth 2.0 Social Login in Express JS

## Ringkasan Singkat

Materi ini menjelaskan cara mengintegrasikan *social login* OAuth 2.0 (seperti Google dan GitHub) ke dalam aplikasi Express.js menggunakan *library* Passport.js yang populer. Anda akan mempelajari alur OAuth, cara mengonfigurasi *strategy*, dan cara menerbitkan JWT atau menggunakan *session* setelah *social login* berhasil.

---

## Untuk Siapa Materi Ini

* Developer backend yang ingin mengizinkan pengguna masuk dengan akun Google atau GitHub mereka.
* Developer yang sudah paham dasar Express.js dan ingin mengimplementasikan OAuth 2.0.
* Siapa saja yang tertarik memahami cara kerja autentikasi terdelegasi (delegated authentication) dalam praktiknya.

---

## Prasyarat

* Pemahaman dasar tentang Node.js dan Express.js.
* Familiar dengan konsep Autentikasi dan Otorisasi.
* Pengetahuan dasar tentang JWT atau Session (lihat "Understanding Cookies and Session Management in Express JS" atau "Authentication and Authorization with JWT in Express").

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Konsep inti dan alur dari protokol OAuth 2.0.
* Cara menggunakan Passport.js dan *strategy*-nya untuk menangani *social login*.
* Cara mengatur aplikasi OAuth Google dan GitHub untuk mendapatkan Client ID dan Secret.
* Cara mengintegrasikan data pengguna dari penyedia OAuth ke dalam database aplikasi Anda.
* Cara bertransisi dari login OAuth yang sukses menjadi *session* atau JWT yang terautentikasi.

---

## Konteks dan Motivasi

Pada aplikasi web modern, memaksa pengguna untuk membuat username dan password baru seringkali menciptakan hambatan (friction) dan menurunkan tingkat pendaftaran. Mengimplementasikan "Login dengan Google" atau "Login dengan GitHub" memberikan pengalaman pengguna yang mulus, menyerahkan urusan keamanan password kepada raksasa teknologi, dan memastikan Anda mendapatkan alamat email yang sudah terverifikasi. OAuth 2.0 adalah standar industri untuk otorisasi terdelegasi ini. Meskipun alur OAuth bisa rumit jika dibuat dari awal, *library* seperti Passport.js menyederhanakan proses ini secara signifikan untuk developer Express.

---

## Materi Inti

### 1. Memahami Alur OAuth 2.0

OAuth 2.0 pada dasarnya adalah tentang mendelegasikan akses. Dalam konteks *social login*, Anda meminta penyedia (seperti Google) untuk mengautentikasi pengguna dan memberikan Anda beberapa informasi profil mereka (seperti email dan nama).

Alur tipikalnya terlihat seperti ini:

1. **Pengguna mengklik "Login with Google".**
2. **Redirect ke Penyedia:** Server Anda mengarahkan pengguna ke layar persetujuan (consent screen) Google.
3. **Pengguna Mengautentikasi & Menyetujui:** Pengguna login ke Google dan setuju untuk membagikan data profil mereka dengan aplikasi Anda.
4. **Callback dengan Authorization Code:** Google mengarahkan pengguna kembali ke server Anda dengan membawa "Authorization Code" sementara.
5. **Menukar Code dengan Access Token:** Server Anda mengirimkan Code ini (bersama dengan Client ID dan Client Secret Anda) langsung ke Google untuk ditukar dengan Access Token.
6. **Mengambil Profil Pengguna:** Server Anda menggunakan Access Token untuk mengambil data profil pengguna dari API Google.
7. **Login/Register Pengguna:** Server Anda mencari atau membuat pengguna di database Anda dan membuat mereka login (melalui *session* atau JWT).

Passport.js menangani langkah 4, 5, dan 6 untuk Anda secara otomatis.

### 2. Mengatur Proyek dan Penyedia (Providers)

Pertama, instal *package* yang diperlukan. Anda membutuhkan `passport`, dan *strategy* spesifik untuk penyedia yang ingin Anda gunakan.

```bash
npm install express passport passport-google-oauth20 jsonwebtoken dotenv
```

Sebelum menulis kode, Anda perlu mendaftarkan aplikasi Anda ke penyedia OAuth:

* **Google:** Buka Google Cloud Console, buat proyek, konfigurasikan OAuth consent screen, dan buat kredensial OAuth client ID. Tetapkan URI redirect yang diizinkan (misalnya, `http://localhost:3000/auth/google/callback`).
* **GitHub:** Buka Developer Settings di GitHub Anda, buat OAuth App baru, dan tetapkan authorization callback URL.

Simpan kredensial yang didapatkan di file `.env` Anda:

```env
GOOGLE_CLIENT_ID=client_id_google_anda
GOOGLE_CLIENT_SECRET=client_secret_google_anda
JWT_SECRET=kunci_rahasia_jwt_anda
PORT=3000
```

### 3. Mengonfigurasi Passport dan Google Strategy

Konfigurasikan Passport untuk menggunakan *strategy* `passport-google-oauth20`. Ini melibatkan pemberian kredensial Anda dan sebuah fungsi *callback* `verify` yang berjalan setelah Passport berhasil mengambil profil pengguna.

```javascript
// passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Simulasi database
const users = [];

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // Fungsi ini berjalan setelah Google mengautentikasi pengguna
    // dan mengirimkan kembali objek 'profile'.

    try {
      // 1. Cek apakah pengguna sudah ada di database Anda
      let user = users.find(u => u.googleId === profile.id);

      if (!user) {
        // 2. Jika tidak, buat pengguna baru berdasarkan profil Google
        user = {
          id: users.length + 1,
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value
        };
        users.push(user);
        console.log("Pengguna baru dibuat:", user.name);
      } else {
        console.log("Pengguna lama login:", user.name);
      }

      // 3. Panggil 'done' untuk meneruskan pengguna ke langkah berikutnya
      // Argumen pertama adalah untuk error, yang kedua adalah objek pengguna
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

module.exports = passport;
```

### 4. Membuat Rute OAuth

Sekarang, integrasikan Passport ke rute Express Anda. Anda membutuhkan dua rute untuk setiap penyedia: satu untuk memulai proses, dan satu untuk menangani *callback*.

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const passport = require('./passport'); // Impor passport yang sudah dikonfigurasi
const jwt = require('jsonwebtoken');

const app = express();

// Inisialisasi middleware passport
app.use(passport.initialize());

// Rute 1: Memicu alur Google OAuth
// Kita meminta scope 'profile' dan 'email'
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Rute 2: Menangani callback dari Google
// Jika sukses, kita membuat JWT dan mengirimkannya ke klien
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // Jika kita mencapai titik ini, autentikasi berhasil.
    // Passport menempelkan objek pengguna ke 'req.user' (dari verify callback).

    const user = req.user;

    // Buat JWT untuk aplikasi kita
    const token = jwt.sign(
      { userId: user.id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Di aplikasi frontend nyata, Anda mungkin akan redirect ke URL frontend
    // dan mengirimkan token melalui query parameter atau menetapkannya di cookie yang aman.
    // Untuk contoh API ini, kita hanya mengembalikannya sebagai JSON.
    res.json({
        message: 'Login sukses',
        token: token,
        user: user
    });
  }
);

app.listen(process.env.PORT, () => {
  console.log(`Server berjalan di port ${process.env.PORT}`);
});
```

Perhatikan `session: false`. Passport secara tradisional menggunakan *session* berbasis server. Jika Anda membangun API modern dan ingin menerbitkan JWT, Anda harus menonaktifkan *session* secara eksplisit agar Passport tidak mencoba menyerialisasi pengguna ke dalam *session* Express.

---

## Contoh / Ilustrasi

Bayangkan alur OAuth seperti memasuki klub VIP (aplikasi Anda).

1. Anda pergi ke penjaga pintu, tetapi Anda tidak memiliki ID untuk klub ini.
2. Penjaga pintu berkata, "Pergi ambil tiket masuk dari kantor pemerintah setempat (Google)."
3. Anda pergi ke kantor tersebut, menunjukkan SIM Anda, dan mereka memberi Anda kertas bercap sementara (Authorization Code).
4. Anda membawa kertas bercap itu kembali ke penjaga pintu.
5. Penjaga pintu mengambil kertas itu, pergi ke telepon aman, menelepon kantor tersebut, dan memverifikasi bahwa capnya asli (menukar Code dengan Access Token).
6. Kantor pemerintah mengkonfirmasi identitas Anda melalui telepon (Data Profil).
7. Penjaga pintu akhirnya membiarkan Anda masuk dan memberi Anda gelang VIP (JWT) sehingga Anda tidak perlu mengulang proses tersebut sepanjang malam.

---

## Insight Penting

* **Batasan Keamanan (Security Constraints):** Penyedia OAuth hampir selalu mewajibkan `HTTPS` untuk URI redirect di lingkungan produksi. Selama pengembangan lokal, mereka biasanya membuat pengecualian untuk `http://localhost`.
* **Parameter State:** Untuk keamanan yang lebih baik terhadap serangan CSRF, alur OAuth menggunakan parameter `state`. Passport menangani hal ini secara otomatis di sebagian besar *strategy*, memastikan respons cocok dengan request.
* **Keunikan Email:** Saat menggabungkan akun (misalnya, pengguna login dengan Google, lalu kemudian dengan GitHub), berhati-hatilah. Cek apakah email dari GitHub sudah ada di database Anda. Jika ada, Anda mungkin ingin menautkan GitHub ID ke akun yang sudah ada tersebut daripada membuat duplikat.
* **Menangani Token di Frontend:** Tantangan umum adalah bagaimana cara mendapatkan JWT dari API backend kembali ke frontend SPA terpisah (seperti React atau Vue) setelah redirect. Solusi umumnya meliputi:
    1. Melakukan redirect kembali ke URL frontend dengan menyertakan token di query string (misalnya, `http://frontend.com/login/success?token=ey...`). Frontend membaca URL tersebut, menyimpan token, dan menghapusnya dari URL.
    2. Membuat backend menetapkan cookie `HttpOnly` yang berisi token sebelum melakukan redirect ke frontend.

---

## Ringkasan Akhir

* OAuth 2.0 mengizinkan pengguna untuk login menggunakan penyedia pihak ketiga, meningkatkan pengalaman dan keamanan pengguna.
* Passport.js adalah library standar untuk menangani OAuth di Node.js, menyembunyikan proses pertukaran token yang kompleks.
* Alurnya meliputi mengarahkan pengguna ke penyedia, menangani *callback* dengan kode, dan menukar kode tersebut dengan data pengguna.
* Anda perlu mendaftarkan aplikasi Anda ke penyedia untuk mendapatkan Client ID dan Secret.
* Setelah *social login* OAuth berhasil, aplikasi Anda harus menerbitkan bentuk autentikasinya sendiri (seperti JWT atau *Session* cookie) untuk mempertahankan status login pengguna.

---

## Langkah Belajar Berikutnya

* Coba tambahkan penyedia kedua, seperti GitHub atau Facebook, menggunakan `passport-github2` atau `passport-facebook`.
* Implementasikan *account linking*, yang memungkinkan pengguna untuk menghubungkan beberapa akun sosial ke satu profil di database Anda.
* Pelajari "Authentication and Authorization with JWT in Express" untuk memperdalam pemahaman Anda tentang cara melindungi rute menggunakan token yang baru saja Anda hasilkan.

---

## Metadata

* Level: Menengah
* Topik utama: Express.js, Authentication, OAuth 2.0
* Topik terkait: Security, Passport.js, JWT, Single Sign-On (SSO)
* Kata kunci: express oauth, passport js, social login, google login, github login, sso
* Estimasi waktu baca: 15 menit

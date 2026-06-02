# Implementing OAuth2 Authentication in Express JS

## Ringkasan Singkat

Materi ini membahas integrasi autentikasi OAuth2 dalam aplikasi Express.js menggunakan Passport.js. Anda akan belajar cara memungkinkan pengguna untuk *login* menggunakan penyedia pihak ketiga seperti Google atau GitHub, mengelola alur autentikasi secara aman, dan menangani sesi pengguna.

## Untuk Siapa Materi Ini

- **Target Audience:** Developer *backend* tingkat menengah yang ingin menambahkan fitur *social login* ke aplikasi mereka.
- **Level:** Menengah (Intermediate).

## Prasyarat

- Pemahaman yang kuat tentang *routing* dan *middleware* di Express.js.
- Terbiasa dengan manajemen sesi dan *cookies* di Express.js.
- Pemahaman dasar tentang bagaimana konsep OAuth2 bekerja.
- Telah membaca [Authentication and Authorization with JWT in Express](Authentication%20and%20Authorization%20with%20JWT%20in%20Express_ID.md).

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan dapat:

- Memahami alur kerja autentikasi OAuth2.
- Menyiapkan aplikasi OAuth2 pihak ketiga (misalnya, Google Console) untuk mendapatkan Client ID dan Client Secret.
- Menginstal dan mengonfigurasi Passport.js dengan strategi OAuth2.
- Membuat *route* untuk *login*, *callback*, dan *logout* pada OAuth2.
- Menyimpan dan mengambil data pengguna dari *database* secara aman setelah autentikasi berhasil.

## Konteks dan Motivasi

Membangun sistem autentikasi sendiri (*username* dan *password*) dari awal rawan terhadap kesalahan dan menambah kerumitan bagi pengguna yang harus mengingat *password* baru lagi. OAuth2 menyelesaikan masalah ini dengan memungkinkan pengguna untuk melakukan autentikasi secara aman menggunakan akun mereka yang sudah ada dari penyedia terpercaya seperti Google, GitHub, atau Facebook.

Bagi developer, mengintegrasikan OAuth2 mengurangi risiko kebocoran *password* karena aplikasi Anda tidak pernah menyimpan *password* pengguna. Passport.js adalah *middleware* autentikasi paling populer untuk Node.js, yang menyediakan cara elegan dan modular untuk mengintegrasikan ratusan strategi autentikasi yang berbeda, termasuk OAuth2.

## Materi Inti

### 1. Alur Kerja OAuth2

Alur kerja OAuth2 umumnya melibatkan beberapa langkah kunci:

1. **Pengguna Memulai Login:** Pengguna mengklik "Login with Google".
2. **Redirect ke Provider:** Aplikasi Anda mengarahkan pengguna ke server otorisasi Google.
3. **Pengguna Memberi Izin:** Pengguna *login* ke Google dan memberikan izin kepada aplikasi Anda untuk mengakses profil mereka.
4. **Callback:** Google mengarahkan pengguna kembali ke aplikasi Anda beserta kode otorisasi.
5. **Tukar Kode dengan Token:** Aplikasi Anda menukar kode tersebut dengan *access token* (dan opsional *refresh token*) di balik layar.
6. **Ambil Profil:** Aplikasi Anda menggunakan token tersebut untuk mengambil data profil pengguna dan membuat mereka *login* di sistem Anda.

### 2. Menyiapkan Passport.js

Pertama, Anda perlu menginstal *package* yang dibutuhkan. Untuk contoh ini, kita akan menggunakan strategi Google OAuth2.

```bash
npm install passport passport-google-oauth20 express-session
```

### 3. Mengonfigurasi Strategi

Anda harus mendapatkan Client ID dan Client Secret dari penyedia layanan (misalnya, Google Cloud Console) dan memberikannya ke Passport.

```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Cek apakah user sudah ada di database
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Jika belum, buat user baru
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value
        });
      }

      // Kembalikan objek user
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));
```

### 4. Serialisasi Sesi (Session Serialization)

Passport perlu tahu bagaimana cara menyimpan pengguna ke dalam sesi dan bagaimana cara mengambil data mereka pada permintaan berikutnya.

```javascript
passport.serializeUser((user, done) => {
  // Hanya simpan ID user di session untuk menghemat ruang
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Ambil objek user secara utuh dari database menggunakan ID
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
```

### 5. Membuat Route Autentikasi

Sekarang, Anda perlu membuat *route* yang memulai proses *login* dan menangani proses *callback*.

```javascript
const express = require('express');
const app = express();

// Inisialisasi middleware session
app.use(require('express-session')({ secret: 'kunci_rahasia', resave: false, saveUninitialized: false }));

// Inisialisasi Passport dan pulihkan status autentikasi dari session (jika ada)
app.use(passport.initialize());
app.use(passport.session());

// Route untuk memulai alur login
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Route untuk callback dari Google
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Autentikasi berhasil, redirect ke halaman utama/dashboard.
    res.redirect('/dashboard');
  }
);

// Route untuk mengecek apakah user sudah login
app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`Selamat datang ${req.user.name}`);
  } else {
    res.redirect('/login');
  }
});

// Route untuk logout
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});
```

## Contoh / Ilustrasi

Bayangkan OAuth2 seperti menggunakan tiket parkir *valet* untuk mendapatkan kunci kamar hotel tertentu.

1. Anda menyerahkan mobil (kredensial) Anda kepada petugas *valet* (Google).
2. Petugas *valet* memberi Anda tiket (kode otorisasi).
3. Anda memberikan tiket tersebut ke resepsionis hotel (*backend* Express Anda).
4. Resepsionis memverifikasi tiket tersebut dengan petugas *valet* dan memberi Anda kunci kamar (session cookie/JWT).
5. Anda menggunakan kunci kamar tersebut untuk mengakses kamar Anda (*protected routes*). Aplikasi Anda tidak pernah memegang langsung kunci mobil (*password*) Anda.

## Insight Penting

- **Keamanan di atas Kenyamanan:** Jangan pernah mengekspos `clientSecret` Anda ke *frontend*. Pertukaran kode otorisasi menjadi *access token* harus terjadi secara aman di sisi *backend* Express Anda.
- **Parameter State:** Gunakan parameter `state` selama permintaan otorisasi untuk mencegah serangan Cross-Site Request Forgery (CSRF).
- **API Stateless:** Jika Anda membangun API yang sepenuhnya RESTful (misalnya, untuk aplikasi mobile atau SPA), menggunakan sesi mungkin tidak ideal. Dalam kasus tersebut, Anda dapat menggunakan Passport untuk menangani alur OAuth2 dan kemudian menerbitkan JWT di *route callback* alih-alih bergantung pada `express-session`.

## Ringkasan Akhir

- OAuth2 mendelegasikan proses autentikasi ke penyedia pihak ketiga yang terpercaya, meningkatkan keamanan dan pengalaman pengguna.
- Passport.js menyederhanakan integrasi OAuth2 di Express menggunakan strategi tertentu (seperti `passport-google-oauth20`).
- Proses ini melibatkan mendefinisikan strategi, mengelola serialisasi/deserialisasi, dan mengatur *route* untuk *login* dan *callback*.
- Selalu lakukan pertukaran token di sisi *backend* untuk menjaga kerahasiaan kunci (*secrets*).

## Langkah Belajar Berikutnya

- [Implementing Role-Based Access Control in Express JS](Implementing%20Role-Based%20Access%20Control%20in%20Express%20JS_ID.md)
- [Express JS Security Best Practices](Express%20JS%20Security%20Best%20Practices_ID.md)

## Metadata

- Level: Menengah
- Topik utama: Express.js, Backend Development, Authentication
- Topik terkait: OAuth2, Passport.js, Security, Session Management
- Kata kunci: express oauth2, passport js, google login, social login, authentication
- Estimasi waktu baca: 10 - 15 menit

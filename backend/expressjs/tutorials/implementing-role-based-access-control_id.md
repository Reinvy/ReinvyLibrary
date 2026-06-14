---
title: "Implementing Role-Based Access Control in Express JS"
description: "Materi ini membahas cara mengimplementasikan Role-Based Access Control (RBAC) pada aplikasi Express.js. Anda akan mempelajari cara membatasi akses ke rute-rute"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Implementing Role-Based Access Control in Express JS

## Ringkasan Singkat

Materi ini membahas cara mengimplementasikan *Role-Based Access Control* (RBAC) pada aplikasi Express.js. Anda akan mempelajari cara membatasi akses ke rute-rute tertentu berdasarkan *role* (peran) pengguna, memastikan bahwa hanya personel yang berwenang yang dapat melakukan operasi sensitif.

## Untuk Siapa Materi Ini

- **Target Audience:** Pengembang *backend* yang ingin mengamankan aplikasi Express mereka dengan menetapkan dan menegakkan peran pengguna.
- **Level:** Menengah.

## Prasyarat

- Pemahaman dasar tentang *routing* dan *middleware* Express.js.
- Familiar dengan autentikasi pengguna (misalnya menggunakan JWT).
- Pengetahuan tentang kode status HTTP, khususnya `401 Unauthorized` dan `403 Forbidden`.

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan dapat:

- Memahami perbedaan antara autentikasi dan otorisasi.
- Merancang arsitektur berbasis peran (*role-based*) yang sederhana.
- Membuat *middleware* untuk memeriksa peran pengguna di Express.js.
- Mengamankan *endpoint* tertentu berdasarkan izin yang diperlukan.

## Konteks dan Motivasi

Autentikasi memverifikasi *siapa* pengguna itu, tetapi otorisasi menentukan *apa* yang boleh mereka lakukan. Dalam aplikasi dunia nyata, tidak semua pengguna memiliki hak istimewa yang sama. Misalnya, pengguna biasa tidak seharusnya bisa menghapus akun pengguna lain, sementara administrator harus memiliki akses penuh. Menerapkan *Role-Based Access Control* (RBAC) memungkinkan Anda memisahkan tanggung jawab ini dengan rapi, membuat aplikasi Anda lebih aman, dapat diskalakan (*scalable*), dan lebih mudah dipelihara seiring bertambah kompleksnya persyaratan izin.

## Materi Inti

### 1. Konsep RBAC

*Role-Based Access Control* (RBAC) adalah metode untuk membatasi akses sistem kepada pengguna yang berwenang berdasarkan peran yang ditetapkan untuk mereka. Daripada memeriksa apakah pengguna tertentu memiliki izin untuk melakukan suatu tindakan, Anda menetapkan peran kepada pengguna (seperti "admin", "editor", atau "user") dan kemudian memeriksa apakah peran tersebut memiliki izin yang diperlukan.

### 2. Menyiapkan Model Pengguna

Untuk mengimplementasikan RBAC, data pengguna Anda harus menyertakan properti peran. Baik Anda menggunakan MongoDB dengan Mongoose atau SQL dengan Prisma/Sequelize, skema pengguna Anda kira-kira akan terlihat seperti ini:

```javascript
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['user', 'editor', 'admin'],
    default: 'user'
  }
});
```

### 3. Middleware Autentikasi

Sebelum Anda dapat mengotorisasi pengguna, Anda harus mengautentikasi mereka. Asumsikan Anda memiliki *middleware* `authenticateUser` yang memverifikasi JWT dan melampirkan *payload* pengguna ke objek `req`.

```javascript
const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // Diasumsikan payload berisi { id, role }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
```

### 4. Membuat Middleware Otorisasi

Sekarang, buat *factory* *middleware* yang menerima peran yang diizinkan sebagai argumen dan mengembalikan fungsi *middleware*.

```javascript
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Periksa apakah req.user ada (ditetapkan oleh authenticateUser)
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Periksa apakah peran pengguna termasuk dalam peran yang diizinkan
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Forbidden: You do not have permission to access this resource'
      });
    }

    next();
  };
};

module.exports = { authenticateUser, authorizeRoles };
```

## Contoh / Ilustrasi

Mari kita terapkan *middleware* ini untuk mengamankan rute tertentu di aplikasi Express.

```javascript
const express = require('express');
const { authenticateUser, authorizeRoles } = require('./middlewares/auth');

const router = express.Router();

// Rute publik: Tidak butuh autentikasi
router.get('/public', (req, res) => {
  res.json({ message: 'This is public data' });
});

// Rute terlindungi: Setiap pengguna yang terautentikasi dapat mengakses
router.get('/profile', authenticateUser, (req, res) => {
  res.json({ message: 'This is your profile data', user: req.user });
});

// Rute editor: Hanya editor dan admin yang dapat mengakses
router.post('/articles', authenticateUser, authorizeRoles('editor', 'admin'), (req, res) => {
  res.json({ message: 'Article created successfully' });
});

// Rute admin: Hanya admin yang dapat mengakses
router.delete('/users/:id', authenticateUser, authorizeRoles('admin'), (req, res) => {
  res.json({ message: `User ${req.params.id} deleted` });
});

module.exports = router;
```

Dalam pengaturan ini:

- Pengunjung tanpa token hanya dapat mengakses `/public`.
- Pengguna dengan peran `user` dapat mengakses `/profile` tetapi menerima status `403 Forbidden` jika mereka mencoba mengakses `/articles` atau `/users/:id`.
- Pengguna dengan peran `editor` dapat mengakses `/profile` dan `/articles`, tetapi tidak dapat mengakses `/users/:id`.
- Pengguna dengan peran `admin` memiliki akses ke semua rute.

## Insight Penting

- **Autentikasi Terlebih Dahulu:** Selalu jalankan *middleware* autentikasi *sebelum* *middleware* otorisasi. Anda tidak dapat memverifikasi peran jika Anda tidak tahu siapa penggunanya.
- **401 vs 403:** Gunakan `401 Unauthorized` ketika pengguna tidak masuk (*login*) atau token tidak valid. Gunakan `403 Forbidden` ketika pengguna terautentikasi tetapi tidak memiliki izin yang diperlukan.
- **Skalabilitas:** Untuk skenario yang lebih kompleks yang melibatkan sumber daya tertentu (misalnya, editor hanya dapat mengedit artikel *milik mereka sendiri* tetapi bukan milik orang lain), RBAC mungkin tidak cukup. Dalam kasus tersebut, pertimbangkan *Attribute-Based Access Control* (ABAC) atau menambahkan pengecekan izin tingkat sumber daya di dalam *handler* rute Anda.

## Ringkasan Akhir

- RBAC memisahkan pengguna ke dalam peran-peran dengan izin tertentu.
- Anda harus mengautentikasi pengguna dan melampirkan datanya ke objek *request* sebelum menerapkan RBAC.
- Buat *middleware* yang fleksibel yang menerima *array* peran yang diizinkan dan memeriksanya terhadap peran pengguna saat ini.
- Amankan rute dengan menggabungkan *middleware* `authenticateUser` dan `authorizeRoles`.

## Langkah Belajar Berikutnya

- Pelajari cara mengimplementasikan *Attribute-Based Access Control* (ABAC) untuk perizinan yang lebih mendetail (*fine-grained*).
- Eksplorasi integrasi logika otorisasi dengan kueri basis data untuk memfilter hasil berdasarkan peran pengguna.

## Metadata

- Level: Menengah
- Topik utama: Express.js, Security, Authorization
- Topik terkait: Authentication, JWT, Middleware
- Kata kunci: express authorization, rbac, role based access control, middleware, express roles
- Estimasi waktu baca: 10 - 15 menit

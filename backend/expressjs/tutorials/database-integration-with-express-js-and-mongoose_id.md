---
title: "Integrasi Database dengan Express JS dan Mongoose"
description: "Tutorial ini menjelaskan cara menghubungkan aplikasi Express JS ke database MongoDB menggunakan Mongoose. Anda akan mempelajari dasar-dasar Mongoose, cara membu"
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Integrasi Database dengan Express JS dan Mongoose

## Ringkasan Singkat

Tutorial ini menjelaskan cara menghubungkan aplikasi Express JS ke database MongoDB menggunakan Mongoose. Anda akan mempelajari dasar-dasar Mongoose, cara membuat koneksi database, mendefinisikan skema, membuat model, dan melakukan operasi dasar CRUD (Create, Read, Update, Delete) di dalam rute Express Anda.

## Untuk Siapa Materi Ini

Developer backend pemula hingga menengah yang sudah memiliki pemahaman dasar tentang Express JS dan ingin belajar cara menyimpan data secara permanen menggunakan MongoDB dan Mongoose.

## Prasyarat

- Pengetahuan dasar tentang JavaScript dan Node.js.
- Pemahaman tentang dasar-dasar Express JS (routing, middleware).
- MongoDB yang sudah berjalan (baik secara lokal maupun via MongoDB Atlas).
- Keakraban dengan JSON dan konsep dasar database.

## Tujuan Belajar

- Memahami peran pustaka Object Data Modeling (ODM) seperti Mongoose.
- Membangun koneksi antara aplikasi Express dan database MongoDB.
- Membuat skema dan model Mongoose untuk menyusun struktur data.
- Mengimplementasikan operasi CRUD dasar (Create, Read, Update, Delete) menggunakan rute Express dan Mongoose.
- Menangani error koneksi database dengan baik.

## Konteks dan Motivasi

Sebagian besar aplikasi di dunia nyata perlu menyimpan data secara permanen. Express JS tidak dilengkapi dengan solusi database bawaan, sehingga Anda harus mengintegrasikannya sendiri. MongoDB, sebuah database dokumen NoSQL, sangat populer di ekosistem Node.js (seringkali menjadi bagian dari stack MERN). Walaupun Anda bisa menggunakan driver MongoDB bawaan, Mongoose menyediakan lapisan struktur yang sangat dibutuhkan. Mongoose memungkinkan Anda untuk mendefinisikan skema, mengatur tipe data, memvalidasi data sebelum disimpan, dan menyediakan kemampuan query yang kuat, sehingga interaksi dengan database menjadi jauh lebih mudah dan andal.

## Materi Inti

### 1. Apa itu Mongoose?

Mongoose adalah pustaka Object Data Modeling (ODM) untuk MongoDB dan Node.js. Pustaka ini mengelola hubungan antar data, menyediakan validasi skema, dan menerjemahkan antara objek dalam kode dan representasi objek tersebut di dalam MongoDB.

### 2. Mengatur Koneksi

Sebelum berinteraksi dengan database, Anda perlu terhubung kepadanya. Hal ini biasanya dilakukan di file aplikasi utama Anda (misalnya, `app.js` atau `server.js`) menggunakan `mongoose.connect()`.

```javascript
const mongoose = require('mongoose');

// Praktik terbaik adalah menyimpan URI Anda di environment variable
const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/my_express_db';

mongoose.connect(dbURI)
  .then(() => console.log('Berhasil terhubung ke MongoDB'))
  .catch((err) => console.error('Error koneksi MongoDB:', err));
```

### 3. Mendefinisikan Skema dan Model

Di MongoDB, sebuah koleksi dapat menyimpan dokumen dengan struktur yang berbeda-beda. Mongoose memperkenalkan skema (schema) untuk memaksakan struktur tertentu. Sebuah skema memetakan ke koleksi MongoDB dan mendefinisikan bentuk dokumen di dalam koleksi tersebut. Model adalah versi kompilasi dari skema, yang menyediakan antarmuka untuk berinteraksi dengan database.

```javascript
const mongoose = require('mongoose');

// Mendefinisikan Skema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, // Validasi data
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true, // Memastikan email unik di dalam koleksi
    lowercase: true
  },
  age: {
    type: Number,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Membuat Model
const User = mongoose.model('User', userSchema);

module.exports = User;
```

### 4. Melakukan Operasi CRUD

Setelah Anda memiliki model, Anda dapat menggunakannya di dalam handler rute Express Anda untuk melakukan operasi CRUD.

**Create (POST):** Gunakan `Model.create()` atau instansiasi model baru lalu panggil `.save()`.
**Read (GET):** Gunakan `Model.find()` untuk banyak dokumen atau `Model.findById()` / `Model.findOne()` untuk satu dokumen tunggal.
**Update (PUT/PATCH):** Gunakan `Model.findByIdAndUpdate()`.
**Delete (DELETE):** Gunakan `Model.findByIdAndDelete()`.

## Contoh / Ilustrasi

Berikut adalah contoh lengkap yang menunjukkan router Express yang mengintegrasikan model `User` Mongoose yang telah didefinisikan di atas:

```javascript
const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Asumsikan model disimpan di sini

// CREATE: Menambah user baru
router.post('/users', async (req, res) => {
  try {
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// READ: Mendapatkan semua user
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// READ: Mendapatkan satu user berdasarkan ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE: Memperbarui user berdasarkan ID
router.patch('/users/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Mengembalikan dokumen yang sudah diperbarui
      runValidators: true // Menjalankan validasi skema saat update
    });
    if (!updatedUser) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE: Menghapus user berdasarkan ID
router.delete('/users/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.status(200).json({ message: 'User berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
```

## Insight Penting

- **Selalu gunakan `async/await`**: Operasi database bersifat asinkron. Menggunakan `async/await` (dipadukan dengan blok `try/catch`) membuat kode Anda lebih bersih dan mudah dibaca dibandingkan dengan callback yang bersarang atau rantai promise.
- **Environment Variables**: Jangan pernah menulis langsung (hardcode) string koneksi MongoDB Anda di dalam source code, terutama jika mengandung kredensial. Gunakan environment variables (seperti `dotenv`).
- **Validasi adalah Kunci**: Manfaatkan validator bawaan Mongoose (misal: `required`, `min`, `max`, `match`) untuk memastikan hanya data valid yang masuk ke database Anda. Anda juga dapat menulis validator kustom.
- **Menangani `_id`**: MongoDB secara otomatis memberikan `_id` unik (ObjectId) ke setiap dokumen. Anda tidak perlu mendefinisikannya di skema Anda kecuali Anda memiliki alasan khusus untuk menimpanya.

## Ringkasan Akhir

- Mongoose adalah ODM yang menyediakan solusi terstruktur berbasis skema untuk memodelkan data aplikasi di MongoDB.
- `mongoose.connect()` membangun koneksi antara Express dan database.
- Sebuah **Skema** mendefinisikan struktur dan aturan untuk data Anda.
- Sebuah **Model** mengompilasi skema dan menyediakan metode untuk melakukan query dan manipulasi database (operasi CRUD).
- Menangani operasi asinkron dengan benar dan memvalidasi data sangat penting untuk integrasi database yang tangguh.

## Langkah Belajar Berikutnya

- Query Mongoose lanjutan (filtering, sorting, pagination).
- Bekerja dengan populasi Mongoose (menangani relasi antar koleksi yang berbeda).
- Validasi Data dan Penanganan Error di API Express.

## Metadata

- Level: Pemula
- Topik utama: Express JS, Database
- Topik terkait: MongoDB, Mongoose, Node.js
- Kata kunci: express, mongoose, mongodb, database, crud, odm, schema, model
- Estimasi waktu baca: 10 menit

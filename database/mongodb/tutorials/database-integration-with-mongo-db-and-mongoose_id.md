---
title: "Database Integration with MongoDB and Mongoose in Express JS"
description: "Tutorial ini menjelaskan cara menghubungkan dan berinteraksi dengan database MongoDB di aplikasi Express.js menggunakan Mongoose. Anda akan belajar cara mengatu"
category: "database"
technology: "mongodb"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Database Integration with MongoDB and Mongoose in Express JS

## Ringkasan Singkat

Tutorial ini menjelaskan cara menghubungkan dan berinteraksi dengan database MongoDB di aplikasi Express.js menggunakan Mongoose. Anda akan belajar cara mengatur koneksi, mendefinisikan schema, membuat model, dan melakukan operasi dasar CRUD (Create, Read, Update, Delete).

## Untuk Siapa Materi Ini

Developer backend tingkat pemula hingga menengah yang sudah memahami routing dan middleware Express.js, dan ingin belajar cara mengintegrasikan database NoSQL (MongoDB) ke dalam aplikasi Express mereka.

## Prasyarat

- Pemahaman dasar tentang Node.js dan Express.js.
- Familiar dengan konsep API RESTful.
- Node.js dan npm sudah terinstal di komputer Anda.
- Akses ke database MongoDB (baik instalasi lokal maupun MongoDB Atlas).

## Tujuan Belajar

- Memahami apa itu MongoDB dan Mongoose serta mengapa keduanya sering digunakan bersama.
- Belajar cara membuat koneksi ke database MongoDB di aplikasi Express.
- Belajar cara mendefinisikan struktur data menggunakan Mongoose Schema dan Model.
- Mengimplementasikan operasi CRUD pada route Express menggunakan Mongoose.

## Konteks dan Motivasi

Sebagian besar aplikasi di dunia nyata membutuhkan cara untuk menyimpan data secara permanen. MongoDB adalah database NoSQL populer yang sangat cocok disandingkan dengan Node.js karena menyimpan data dalam bentuk dokumen yang mirip JSON (BSON). Namun, berinteraksi langsung dengan driver native MongoDB terkadang bisa terlalu panjang kodenya dan tidak memiliki validasi data bawaan.

Mongoose adalah library Object Data Modeling (ODM) untuk MongoDB dan Node.js. Mongoose menyediakan solusi berbasis schema yang lugas untuk memodelkan data aplikasi Anda. Library ini mencakup fitur type casting, validasi, query builder, dan business logic hooks, sehingga interaksi database di Express menjadi jauh lebih aman dan mudah dikelola.

## Materi Inti

### 1. Instalasi Dependensi

Untuk memulai, Anda perlu menginstal `mongoose` di proyek Express Anda.

```bash
npm install mongoose
```

### 2. Terhubung ke MongoDB

Anda harus membuka koneksi database saat server Express Anda menyala. Buat file terpisah atau tambahkan logika koneksi di file aplikasi utama Anda.

```javascript
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/my_express_db')
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch((err) => console.error('MongoDB connection error:', err));
```

*Catatan: Di lingkungan produksi, selalu simpan connection string Anda di environment variable (misalnya `process.env.MONGODB_URI`).*

### 3. Mendefinisikan Schema dan Model

Schema di Mongoose mendefinisikan struktur dokumen, nilai default, validator, dll. Model adalah versi terkompilasi dari Schema, yang menyediakan antarmuka untuk berinteraksi dengan database.

Buat file bernama `User.js` di dalam folder `models`:

```javascript
const mongoose = require('mongoose');

// Define the Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
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

// Compile the Model
const User = mongoose.model('User', userSchema);

module.exports = User;
```

### 4. Melakukan Operasi CRUD

Setelah model didefinisikan, Anda dapat menggunakannya di route Express untuk melakukan operasi CRUD. Model Mongoose menyediakan metode bawaan seperti `.find()`, `.findById()`, `.create()`, `.findByIdAndUpdate()`, dan `.findByIdAndDelete()`.

## Contoh / Ilustrasi

Berikut adalah contoh router Express yang mengimplementasikan operasi CRUD untuk model `User`.

```javascript
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// CREATE: Tambah user baru
router.post('/users', async (req, res) => {
  try {
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    console.error(error);
    // Pesan error generik untuk menghindari Information Exposure
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// READ: Ambil semua user
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// READ: Ambil user berdasarkan ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// UPDATE: Perbarui user berdasarkan ID
router.put('/users/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // Kembalikan dokumen terbaru dan jalankan validator schema
    );
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE: Hapus user berdasarkan ID
router.delete('/users/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
```

## Insight Penting

- **Validasi:** Selalu definisikan field yang wajib (`required`), constraint unik, dan tipe data di schema Mongoose Anda. Ini adalah garis pertahanan pertama Anda terhadap data yang buruk.
- **`runValidators` saat Update:** Secara default, Mongoose tidak menjalankan validator saat menggunakan `.findByIdAndUpdate()`. Anda harus menyertakan `{ runValidators: true }` di dalam objek options.
- **Error Handling:** Saat constraint unik (seperti `email: { unique: true }`) dilanggar, MongoDB akan melempar error duplicate key (kode 11000). Pastikan Anda menangkap error ini dan mengembalikan respons yang sesuai. Jangan mengembalikan pesan error database mentah ke klien untuk mencegah Information Exposure.
- **Operasi Asinkron:** Semua operasi database Mongoose bersifat asinkron (asynchronous). Selalu gunakan `async/await` dan bungkus logika Anda dalam blok `try/catch`.

## Ringkasan Akhir

- **Mongoose** adalah library ODM yang memudahkan bekerja dengan MongoDB di Node.js dengan menyediakan schema dan model.
- Anda terhubung ke MongoDB menggunakan `mongoose.connect()`.
- **Schema** mendefinisikan struktur data Anda, sementara **Model** digunakan untuk berinteraksi dengan database.
- Anda dapat dengan mudah melakukan operasi CRUD di route Express menggunakan metode model Mongoose seperti `.find()`, `.save()`, `.findByIdAndUpdate()`, dan `.findByIdAndDelete()`.

## Langkah Belajar Berikutnya

- Pelajari cara mengimplementasikan relasi antar model yang berbeda (Population di Mongoose).
- Jelajahi operator query tingkat lanjut di MongoDB (misalnya, `$gt`, `$in`, `$regex`).
- Pahami cara menyusun aplikasi Express yang terstruktur dan scalable menggunakan arsitektur MVC (Model-View-Controller).

## Metadata

- Level: Pemula hingga Menengah
- Topik utama: Express.js, Database Integration
- Topik terkait: MongoDB, Mongoose, Node.js, CRUD
- Kata kunci: express mongoose, mongodb express, mongoose schema, mongoose crud, express database
- Estimasi waktu baca: 10 menit

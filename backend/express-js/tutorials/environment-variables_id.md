---
title: "Environment Variables di Express JS"
description: "Tutorial ini menjelaskan cara mengelola konfigurasi dan informasi sensitif secara aman dalam aplikasi Express.js menggunakan environment variables. Anda akan be"
category: "backend"
technology: "express-js"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Environment Variables di Express JS

## Ringkasan Singkat

Tutorial ini menjelaskan cara mengelola konfigurasi dan informasi sensitif secara aman dalam aplikasi Express.js menggunakan environment variables. Anda akan belajar cara menggunakan package `dotenv` untuk menjaga rahasia agar tidak masuk ke dalam source code dan membuat aplikasi Anda mudah beradaptasi dengan berbagai lingkungan (environment).

## Untuk Siapa Materi Ini

- **Target Audience:** Developer backend dan full-stack engineer yang sedang membangun aplikasi Express.js.
- **Level:** Pemula hingga Menengah.

## Prasyarat

- Pemahaman dasar tentang routing dan setup server di Express.js.
- Familiar dengan module Node.js dan ekosistem `npm`.
- Sudah membaca [Basic Routing and Middleware in Express](Basic%20Routing%20and%20Middleware%20in%20Express_ID.md).

## Tujuan Belajar

- Memahami apa itu environment variables dan mengapa mereka diperlukan.
- Mempelajari cara mengintegrasikan package `dotenv` dalam aplikasi Express.js.
- Mengetahui cara menstrukturkan konfigurasi agar tidak mengekspos data rahasia.
- Mampu menangani beberapa environment (misal: development, testing, production) tanpa hambatan.

## Konteks dan Motivasi

Saat membangun aplikasi, Anda sering kali perlu terhubung ke database, memanggil API pihak ketiga, dan mengelola kunci rahasia (seperti JWT secret). Menuliskan nilai-nilai ini secara langsung (hardcoding) ke dalam source code adalah risiko keamanan yang besar, terutama saat kode di-push ke sistem version control seperti GitHub. Jika penyerang mendapatkan akses ke repository Anda, mereka otomatis mendapatkan semua rahasia Anda.

Environment variables menyelesaikan masalah ini dengan memisahkan konfigurasi dari codebase. Dengan menyuntikkan variabel saat runtime, aplikasi Anda dapat beradaptasi dengan berbagai environment (local development, staging, production) tanpa mengubah satu baris kode pun, sehingga data sensitif tetap aman.

## Materi Inti

### 1. Apa itu Environment Variables?

Environment variables adalah nilai dinamis yang dapat memengaruhi cara sebuah proses berjalan pada komputer. Dalam konteks Node.js, mereka adalah pasangan *key-value* (kunci-nilai) yang disimpan dalam objek `process.env`.

### 2. Setup `dotenv`

Cara paling umum untuk mengelola environment variables saat development Node.js adalah menggunakan package `dotenv`. Package ini memuat variabel dari file `.env` ke dalam `process.env`.

Pertama, instal package tersebut:

```bash
npm install dotenv
```

### 3. Membuat File `.env`

Buat sebuah file bernama `.env` di direktori utama (root) proyek Anda. Tambahkan variabel Anda sebagai pasangan key-value:

```env
PORT=3000
DATABASE_URL=mongodb://localhost:27017/myapp
JWT_SECRET=supersecretkey123
NODE_ENV=development
```

**Langkah Krusial:** Selalu tambahkan `.env` ke dalam file `.gitignore` Anda agar file tersebut tidak pernah di-commit ke version control.

### 4. Integrasi dengan Express.js

Untuk menggunakan variabel ini, require dan konfigurasi `dotenv` sedini mungkin di entry point aplikasi Anda (biasanya `index.js` atau `app.js`).

```javascript
// Muat environment variables sejak awal
require('dotenv').config();

const express = require('express');
const app = express();

// Mengakses variabel
const PORT = process.env.PORT || 3000;
const DB_URL = process.env.DATABASE_URL;

app.get('/', (req, res) => {
  res.send(`Server berjalan di mode ${process.env.NODE_ENV}.`);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

### 5. Mengelola Konfigurasi di Aplikasi yang Lebih Besar

Daripada mengakses `process.env` secara langsung di berbagai file, praktik terbaiknya adalah memusatkan konfigurasi di satu file khusus (misal: `config/env.js`). Hal ini memungkinkan Anda untuk memvalidasi variabel dan memberikan nilai default secara aman.

```javascript
// config/env.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  env: process.env.NODE_ENV || 'development'
};
```

Kemudian, import file konfigurasi ini di mana pun dibutuhkan.

## Contoh / Ilustrasi

Bayangkan kode Anda adalah sebuah cetak biru (blueprint) rumah, dan environment variables adalah warna catnya. Anda tidak ingin menggambar blueprint dengan tinta merah hanya karena rumah pertama akan berwarna merah. Sebaliknya, Anda menggambar blueprint yang netral (kode Anda) dan memutuskan warna cat (environment variable) tepat sebelum mengecat. Dengan cara ini, blueprint yang sama persis dapat digunakan untuk rumah merah (development), rumah biru (staging), dan rumah hijau (production).

## Insight Penting

- **Jangan pernah commit `.env`:** Ini adalah kesalahan yang paling sering terjadi. Selalu pastikan `.env` terdaftar di dalam `.gitignore` Anda.
- **Sediakan `.env.example`:** Untuk membantu developer lain mengetahui variabel apa saja yang dibutuhkan, buat file `.env.example` dengan nilai palsu (dummy) dan commit file ini ke repository Anda.
- **Fail Fast:** Jika variabel yang sangat penting (seperti URL database) tidak ada, lebih baik aplikasi langsung crash saat startup daripada error tak terduga di kemudian waktu. Anda bisa memvalidasi `process.env` menggunakan library seperti `joi` atau `zod`.
- **Platform Hosting:** Di environment production (seperti Vercel, Heroku, atau AWS), Anda tidak mengunggah file `.env`. Sebaliknya, Anda mengatur environment variables secara langsung di dashboard atau pipeline deployment platform tersebut.

## Ringkasan Akhir

- Environment variables menjaga data sensitif seperti API keys dan kredensial database agar tidak berada di dalam source code.
- Gunakan package `dotenv` untuk memuat file `.env` lokal selama proses development.
- Selalu tambahkan `.env` ke dalam `.gitignore`.
- Pusatkan konfigurasi environment Anda untuk memvalidasi dan mengelola nilai default dengan mudah.
- Andalkan pengaturan platform deployment Anda untuk variabel di production.

## Langkah Belajar Berikutnya

- [Structuring a Scalable Express App (MVC and Service Layer)](Structuring%20a%20Scalable%20Express%20App%20(MVC%20and%20Service%20Layer)_ID.md)
- [Deploying Express JS Applications to Production](Deploying%20Express%20JS%20Applications%20to%20Production_ID.md)

## Metadata

- Level: Pemula
- Topik utama: Express.js, Backend Development
- Topik terkait: Configuration, Security, Environment Variables
- Kata kunci: express, dotenv, environment variables, process.env, configuration
- Estimasi waktu baca: 5 - 8 minutes

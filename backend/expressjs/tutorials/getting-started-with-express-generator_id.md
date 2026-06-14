---
title: "Langkah Membuat Project Express.js dengan Express Generator"
description: "Tutorial tentang cara mengimplementasikan dan membuat boilerplate project Express.js menggunakan tool Express Generator."
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Langkah Membuat Project Express.js dengan Express Generator

## Ringkasan

Tutorial ini memandu Anda dalam menggunakan tool baris perintah Express Generator untuk membuat struktur awal proyek Express.js dengan cepat.

## Target Audiens

Pengembang web pemula yang ingin melewati proses konfigurasi dasar dan langsung membangun proyek Express.js dengan struktur folder standar.

## Prasyarat

- Node.js dan npm telah terinstal di komputer Anda.
- Pemahaman dasar tentang JavaScript dan perintah CLI dasar.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Menginstal Express Generator secara global.
- Membuat proyek baru dengan atau tanpa view engine.
- Menginstal dependensi proyek dan menjalankan server lokal.
- Memahami struktur proyek bawaan dan menambahkan route sederhana.

## Konteks dan Motivasi

Membangun proyek Express.js dari nol mengharuskan kita membuat struktur folder, mengonfigurasi middleware, dan menyiapkan file statis. Express Generator mengotomatiskan hal ini sehingga pengembang dapat langsung berfokus menulis logika bisnis.

## Konten Inti

### 1. Instalasi

Instal Express Generator secara global menggunakan perintah berikut:

```bash
npm install -g express-generator
```

### 2. Membuat Proyek Baru

Anda dapat membuat proyek dengan view engine (seperti Pug/EJS) atau tanpa view engine untuk API JSON murni.

#### Membuat Proyek Tanpa View Engine (Direkomendasikan untuk API)

```bash
express nama-proyek --no-view
```

### 3. Menjalankan Aplikasi

Masuk ke direktori proyek, instal dependensi, lalu jalankan server:

```bash
cd nama-proyek
npm install
npm start
```

Aplikasi Anda akan berjalan di `http://localhost:3000`.

## Contoh Kode

Berikut cara menambahkan route baru di dalam file `routes/index.js` yang dihasilkan:

```javascript
// routes/index.js
const express = require('express');
const router = express.Router();

router.get('/api/welcome', (req, res) => {
  res.json({ message: "Selamat datang di API Express Anda!" });
});

module.exports = router;
```

## Insight Penting

- **Fokus API**: Gunakan opsi `--no-view` jika Anda mengembangkan backend untuk Frontend modern (React, Mobile, dll.) untuk meminimalkan beban rendering server.
- **Manajemen Proses**: Di lingkungan produksi, gunakan PM2 untuk menjaga server tetap hidup:
  ```bash
  npm install -g pm2
  pm2 start bin/www --name "aplikasi-saya"
  ```

## Langkah Berikutnya

- Integrasikan database MongoDB menggunakan Mongoose atau PostgreSQL menggunakan Prisma.
- Pelajari validasi request menggunakan Zod.

## Kesimpulan

Aplikasi Anda telah berhasil dibuat menggunakan Express Generator. Anda telah memahami struktur proyek dasar dan menambahkan rute custom.

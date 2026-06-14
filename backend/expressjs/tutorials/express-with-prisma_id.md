---
title: "Langkah Integrasi Prisma dengan Express.js"
description: "Tutorial komprehensif tentang cara mengintegrasikan Prisma ORM dengan Express.js, mengatur skema database, migrasi, dan penulisan query."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Langkah Integrasi Prisma dengan Express.js

## Ringkasan

Tutorial ini memandu Anda dalam mengintegrasikan Prisma ORM ke dalam aplikasi Express.js. Anda akan mempelajari cara menyambungkan database PostgreSQL, menulis skema Prisma, menjalankan migrasi database, serta menulis query CRUD dalam route Express.

## Target Audiens

Pengembang backend tingkat menengah yang menginginkan manipulasi database relasional yang aman (type-safe) dan modern pada Express.js.

## Prasyarat

- Node.js dan database PostgreSQL/MySQL terinstal secara lokal.
- Pemahaman dasar tentang Express.js dan konsep SQL.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Menginstal Prisma CLI dan Prisma Client di proyek.
- Mengatur variabel lingkungan URL database.
- Mendefinisikan model di dalam file `schema.prisma` dan menjalankan migrasi.
- Menginisialisasi Prisma Client dan menggunakannya di dalam rute Express untuk operasi CRUD.

## Konteks dan Motivasi

Sebelumnya, pengembang harus menulis query SQL mentah atau mengandalkan ORM berat seperti Sequelize yang sulit dikonfigurasi. Prisma hadir dengan menyediakan antarmuka query yang aman secara tipe data (type-safe), pembuat skema intuitif, dan alat migrasi otomatis.

## Konten Inti

### 1. Instalasi Dependensi

Instal Prisma CLI sebagai dependensi development dan Prisma Client sebagai dependensi inti:

```bash
npm install prisma --save-dev
npm install @prisma/client
```

### 2. Inisialisasi Prisma

Jalankan perintah berikut untuk membuat skema awal dan file konfigurasi:

```bash
npx prisma init
```

Perintah ini akan membuat folder `prisma` baru berisi file `schema.prisma` serta menambahkan file `.env`.

### 3. Konfigurasi Database

Edit URL koneksi database Anda di file `.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/nama_database?schema=public"
```

Tambahkan model di dalam file `prisma/schema.prisma`:

```prisma
model User {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
}
```

### 4. Migrasi Database

Terapkan model ke dalam database dengan perintah migrasi:

```bash
npx prisma migrate dev --name init
```

## Contoh Kode

Buat file koneksi tunggal untuk Prisma Client:

```javascript
// db.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
module.exports = prisma;
```

Gunakan Prisma Client di dalam route rute Express:

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();
const prisma = require('../db');

// Mengambil semua data user
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Menambahkan user baru
router.post('/users', async (req, res) => {
  const { name, email } = req.body;
  try {
    const user = await prisma.user.create({
      data: { name, email }
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
```

## Insight Penting

- **Manajemen Koneksi**: Pastikan instance Prisma Client hanya diinisialisasi satu kali. Pembuatan instance berulang di setiap handler rute akan menghabiskan limit koneksi database Anda.
- **Prisma Studio**: Jalankan perintah `npx prisma studio` untuk membuka antarmuka grafis (GUI) di browser guna mengelola data database secara visual.
- **Keamanan Variabel**: Selalu simpan URL database Anda dalam file `.env` dan jangan pernah men-commit variabel ini ke GitHub.

## Langkah Berikutnya

- Pelajari cara membuat relasi antar tabel (satu-ke-banyak, banyak-ke-banyak) di Prisma.
- Terapkan seeding data dummy untuk memudahkan pengujian route.

## Kesimpulan

Integrasi Prisma dengan Express.js berhasil diselesaikan. Anda telah mempelajari dasar-dasar skema, migrasi, dan eksekusi query CRUD.

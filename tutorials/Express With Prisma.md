# Langkah Integrasi Prisma dengan Express.js

## 1. Install Prisma CLI

Install Prisma CLI secara global menggunakan perintah berikut:

```bash
npm install -g prisma
```

## 2. Tambahkan Prisma ke Proyek

Masuk ke direktori proyek Anda dan instal dependensi Prisma:

```bash
npm install prisma @prisma/client
```

## 3. Inisialisasi Prisma

Inisialisasi Prisma di dalam proyek dengan perintah berikut:

```bash
npx prisma init
```

Perintah ini akan membuat file `prisma/schema.prisma` dan folder `.env` untuk konfigurasi database.

## 4. Konfigurasi Database

Edit file `.env` dan tambahkan URL koneksi database Anda. Contoh untuk database PostgreSQL:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/nama_database"
```

## 5. Definisikan Model di Schema Prisma

Edit file `prisma/schema.prisma` untuk menambahkan model database Anda. Contoh:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
}
```

## 6. Migrasi Database

Jalankan migrasi untuk membuat tabel di database Anda:

```bash
npx prisma migrate dev --name init
```

## 7. Gunakan Prisma Client di Express.js

Buat instance Prisma Client di file baru, misalnya `prisma.js`:

```javascript
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = prisma;
```

## 8. Contoh Penggunaan di Routes

Gunakan Prisma Client di file rute. Contoh untuk `routes/index.js`:

```javascript
const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// Mendapatkan semua user
router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Menambahkan user baru
router.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await prisma.user.create({
      data: { name, email },
    });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
```

## 9. Uji Endpoint

Gunakan Postman atau alat serupa untuk menguji endpoint. Jalankan server:

```bash
npm start
```

Coba akses endpoint berikut:

- **GET /users**: Mendapatkan semua user.
- **POST /users**: Menambahkan user baru dengan `name` dan `email` di body request.

## 10. Dokumentasi Prisma

Gunakan perintah berikut untuk membuka Prisma Studio (GUI untuk database):

```bash
npx prisma studio
```

Ini akan membantu Anda melihat data secara visual.

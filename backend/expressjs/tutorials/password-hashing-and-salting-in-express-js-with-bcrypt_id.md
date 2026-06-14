---
title: "Password Hashing and Salting di Express JS dengan Bcrypt"
description: "Materi ini membahas cara menyimpan kata sandi (password) pengguna secara aman di aplikasi Express.js Anda menggunakan Bcrypt. Anda akan mempelajari perbedaan kr"
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Password Hashing and Salting di Express JS dengan Bcrypt

## Ringkasan Singkat

Materi ini membahas cara menyimpan kata sandi (password) pengguna secara aman di aplikasi Express.js Anda menggunakan Bcrypt. Anda akan mempelajari perbedaan krusial antara hashing, salting, dan enkripsi, serta mengapa menyimpan kata sandi dalam bentuk teks biasa adalah celah keamanan yang sangat fatal.

---

## Untuk Siapa Materi Ini

- Target pembaca: Backend Developer, Fullstack Developer
- Level pembaca: Pemula hingga Menengah

---

## Prasyarat

Anda sebaiknya sudah memahami:

- Dasar-dasar Express.js (Routing dan Middleware)
- Konsep dasar REST API (Menangani request POST)
- JSON dan cara mengekstrak data dari `req.body`

---

## Tujuan Belajar

Setelah membaca materi ini, Anda akan memahami:

- Mengapa kata sandi teks biasa (plain-text) tidak boleh disimpan di database
- Perbedaan antara enkripsi, hashing, dan salting
- Cara menggunakan library `bcrypt` untuk melakukan hashing secara aman sebelum menyimpannya
- Cara memverifikasi data login pengguna dengan password yang sudah di-hash

---

## Konteks dan Motivasi

Keamanan adalah fondasi dasar dalam backend development. Salah satu kesalahan paling umum dan paling merusak yang bisa dilakukan developer adalah menyimpan kata sandi pengguna dalam bentuk teks biasa (plain-text) di dalam database. Jika database tersebut suatu saat bocor (data breach), peretas akan langsung mendapatkan akses ke semua kata sandi pengguna. Mengingat banyak orang sering menggunakan kata sandi yang sama di berbagai layanan, kebocoran di aplikasi Anda bisa membahayakan akun mereka di tempat lain.

Untuk mencegah hal ini, standar industri mewajibkan developer untuk melakukan "hashing" dan "salting" pada kata sandi. Ini memastikan bahwa meskipun peretas berhasil mencuri database, mereka tidak dapat dengan mudah membaca atau mengembalikan kata sandi ke bentuk aslinya. Mempelajari cara mengamankan kata sandi dengan benar adalah keahlian mutlak bagi setiap backend developer yang menangani autentikasi pengguna.

---

## Materi Inti

### 1. Bahaya Plain-Text Password

Jika Anda menyimpan kata sandi apa adanya (misalnya, `"password123"`), siapa pun yang memiliki akses database (termasuk hacker jahat atau bahkan admin database nakal) bisa melihatnya. Ini melanggar prinsip dasar privasi dan keamanan data.

### 2. Enkripsi vs Hashing

- **Enkripsi (Encryption):** Adalah fungsi dua arah. Anda mengubah data menjadi format rahasia, tetapi Anda (atau siapa saja yang memiliki kunci dekripsi) bisa mengembalikannya (reverse) menjadi data asli. Ini bagus untuk menyimpan nomor kartu kredit, tetapi **buruk** untuk kata sandi, karena jika kuncinya dicuri, semua kata sandi bisa dikembalikan.
- **Hashing:** Adalah fungsi matematika satu arah. Hashing mengambil input (kata sandi) dan mengubahnya menjadi string karakter dengan panjang tetap. Anda tidak bisa mengembalikan hash untuk mendapatkan kata sandi aslinya. Saat pengguna login, Anda cukup melakukan hash lagi pada input mereka dan membandingkannya dengan hash yang tersimpan.

### 3. Apa itu Salting?

Jika dua pengguna memiliki kata sandi yang sama (`"123456"`), hasil hash mereka akan identik. Peretas sering menggunakan daftar hash yang sudah dihitung sebelumnya (disebut Rainbow Tables) untuk dengan cepat membobol kata sandi umum.

**Salting** menyelesaikan masalah ini dengan menambahkan string karakter acak (salt) ke kata sandi *sebelum* melakukan hashing. Ini berarti meskipun dua pengguna memiliki kata sandi yang sama, hasil hash akhir mereka akan sangat berbeda karena "salt" mereka berbeda.

### 4. Menggunakan Bcrypt di Express

`bcrypt` adalah library standar industri yang menangani hashing dan salting secara aman. Bcrypt sengaja dirancang agar berjalan lambat (by design) untuk membuat serangan tebakan "brute-force" menjadi tidak layak dilakukan. Jumlah putaran (salt rounds) menentukan seberapa lambat dan amannya proses hashing tersebut (umumnya 10 atau 12 putaran direkomendasikan).

---

## Contoh / Ilustrasi

### Instalasi Package

Pertama, instal library:

```bash
npm install bcrypt
```

*(Catatan: Ada juga `bcryptjs`, implementasi murni JavaScript, yang lebih mudah diinstal di beberapa sistem operasi jika `bcrypt` native gagal, tetapi `bcrypt` native umumnya lebih cepat.)*

### 1. Hashing Password Saat Registrasi

```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.json());

// Simulasi Database
const usersDB = [];

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Tentukan jumlah putaran salt (salt rounds)
    const saltRounds = 10;

    // 2. Hash kata sandi beserta salt-nya
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Simpan pengguna di database dengan kata sandi yang sudah di-hash
    const newUser = {
      id: usersDB.length + 1,
      username: username,
      password: hashedPassword // JANGAN PERNAH menyimpan 'password' mentah
    };

    usersDB.push(newUser);

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 2. Memverifikasi Password Saat Login

```javascript
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Cari pengguna di database
    const user = usersDB.find(u => u.username === username);
    if (!user) {
      // Gunakan pesan error generik demi keamanan
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 2. Bandingkan kata sandi input dengan hash yang tersimpan
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      res.json({ message: 'Login successful!' });
    } else {
      // Sekali lagi, pesan error generik
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## Insight Penting

- **Pesan Error Generik (Generic Error Messages):** Perhatikan bahwa saat login, entah pengguna tidak ditemukan atau kata sandi salah, kita mengembalikan pesan yang sama `"Invalid username or password"`. Ini mencegah peretas mengetahui username mana saja yang terdaftar di sistem Anda (Serangan User Enumeration).
- **Eksekusi Asynchronous:** Hashing adalah operasi yang berat bagi CPU. Selalu gunakan versi asynchronous (`bcrypt.hash` dan `bcrypt.compare`) dengan `async/await` daripada versi synchronous-nya (`bcrypt.hashSync`). Metode synchronous akan memblokir event loop Node.js, membuat seluruh server Anda terhenti sementara menunggu hash diproses.
- **Faktor Biaya (Salt Rounds):** Meningkatkan putaran salt (misal, dari 10 menjadi 12) secara eksponensial meningkatkan waktu yang dibutuhkan untuk hashing. Meskipun ini membuatnya lebih aman terhadap serangan brute-force, ini juga memberi beban lebih pada server Anda. Seimbangkan keamanan dengan performa server.

---

## Ringkasan Akhir

- Jangan pernah menyimpan kata sandi dalam bentuk teks biasa (plain text).
- Kata sandi harus di-hash (satu arah), bukan dienkripsi (dua arah).
- Salting menambahkan data acak ke kata sandi sebelum di-hash, melindunginya dari serangan Rainbow Table.
- Library `bcrypt` secara otomatis menangani pembuatan salt, penggabungan, dan hashing kata sandi.
- Gunakan `bcrypt.hash()` untuk mengamankan kata sandi saat registrasi, dan `bcrypt.compare()` untuk memverifikasinya saat login.

---

## Langkah Belajar Berikutnya

- [Authentication and Authorization with JWT in Express](Authentication%20and%20Authorization%20with%20JWT%20in%20Express_ID.md) (Pelajari cara menerbitkan token setelah berhasil login).
- Pelajari cara mengintegrasikan logika ini dengan database nyata menggunakan ORM seperti Prisma atau Mongoose.

---

## Metadata

- Level: Pemula hingga Menengah
- Topik utama: Express.js, Keamanan
- Topik terkait: Autentikasi, Bcrypt, Hashing, Password
- Kata kunci: bcrypt, hash, salt, keamanan password, autentikasi express
- Estimasi waktu baca: 8 menit

---
title: "Langkah Membuat Project Express.js dengan Express Generator"
description: "Tutorial komprehensif tentang cara mengimplementasikan Langkah Membuat Project Express.js dengan Express Generator pada pengembangan aplikasi."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Langkah Membuat Project Express.js dengan Express Generator

## 1. Install Node.js

Pastikan Node.js sudah terinstal di sistem Anda. Jika belum, unduh dan instal Node.js dari [situs resmi Node.js](https://nodejs.org/).

## 2. Install Express Generator

Instal Express Generator secara global dengan perintah berikut:

```bash
npm install -g express-generator
```

## 3. Buat Proyek Baru

Gunakan perintah berikut untuk membuat proyek baru dengan Express Generator. Gantilah `nama-proyek` dengan nama proyek Anda.

### Dengan View Engine

Jika Anda ingin menggunakan view engine seperti `pug` atau `ejs`, gunakan perintah berikut:

```bash
express nama-proyek --view=pug
```

Gantilah `pug` dengan view engine yang diinginkan, seperti `ejs` atau `hbs`.

### Tanpa View Engine

Jika Anda tidak memerlukan view engine, gunakan opsi `--no-view`:

```bash
express nama-proyek --no-view
```

Opsi ini akan menghilangkan folder `views` dari struktur proyek.

## 4. Instal Dependensi

Masuk ke direktori proyek dan instal semua dependensi dengan perintah:

```bash
cd nama-proyek
npm install
```

## 5. Menjalankan Aplikasi

Jalankan aplikasi menggunakan perintah berikut:

```bash
npm start
```

Secara default, aplikasi akan berjalan di `http://localhost:3000`.

## 6. Struktur Proyek

Jika Anda membuat proyek tanpa view engine, struktur proyek akan terlihat seperti ini:

```plaintext
nama-proyek/
├── bin/
├── public/
├── routes/
├── app.js
├── package.json
```

- **bin/**: Tempat konfigurasi server.
- **public/**: Folder untuk file statis seperti CSS, JavaScript, gambar.
- **routes/**: Folder untuk mendefinisikan rute aplikasi.
- **app.js**: File utama untuk konfigurasi dan inisialisasi aplikasi Express.

## 7. Menambahkan Rute

Untuk menambahkan rute baru, buka file di dalam folder `routes` (misalnya `index.js`) dan tambahkan kode berikut:

```javascript
router.get("/rute-baru", function (req, res, next) {
  res.send("Ini adalah rute baru!");
});
```

## 8. Menambahkan Middleware

Tambahkan middleware di file `app.js`. Contoh untuk logging:

```javascript
app.use(function (req, res, next) {
  console.log(`${req.method} ${req.url}`);
  next();
});
```

## 9. Menyelesaikan Proyek

Saat proyek selesai, siapkan untuk produksi dengan menggunakan `pm2` atau `forever` untuk menjaga aplikasi tetap berjalan:

```bash
npm install -g pm2
pm2 start bin/www
```

---
title: "Streaming and Downloading Files in Express JS"
description: "Materi ini menjelaskan berbagai metode untuk mengirimkan atau menyajikan file kepada klien (client) di Express.js. Anda akan mempelajari cara memicu unduhan fil"
category: "backend"
technology: "expressjs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Streaming and Downloading Files in Express JS

## Ringkasan Singkat

Materi ini menjelaskan berbagai metode untuk mengirimkan atau menyajikan file kepada klien (client) di Express.js. Anda akan mempelajari cara memicu unduhan file menggunakan `res.download()`, menyajikan file statis menggunakan `res.sendFile()`, dan menangani transfer file berukuran besar secara efisien menggunakan Node.js Streams untuk mengoptimalkan penggunaan memori dan performa server.

## Untuk Siapa Materi Ini

- **Target Audience:** Developer backend yang perlu menyajikan (serve) atau mentransfer file dari aplikasi Express ke klien.
- **Level:** Menengah (Intermediate).

## Prasyarat

- Pemahaman tentang konsep dasar Express.js (Routing dan Middleware).
- Keakraban dengan modul bawaan Node.js yaitu `fs` (File System).
- Pemahaman dasar tentang bagaimana *request* dan *response* HTTP bekerja.

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan mampu:

- Memicu peramban (browser) klien untuk mengunduh file menggunakan `res.download()`.
- Menyajikan file statis secara langsung ke browser menggunakan `res.sendFile()`.
- Memahami konsep Node.js Streams dan mengapa hal tersebut diperlukan untuk menangani file berukuran besar.
- Mengimplementasikan *file streaming* menggunakan `fs.createReadStream()` dan metode `.pipe()`.

## Konteks dan Motivasi

Dalam banyak aplikasi web, menyajikan file kepada pengguna adalah kebutuhan yang mendasar. Ini bisa berupa menghasilkan dan mengunduh *invoice* PDF, menyajikan gambar, atau menyediakan file video berukuran besar. Meskipun mengirim file kecil itu mudah, mengirim file besar dengan cara yang salah dapat menghabiskan seluruh memori server yang tersedia dan menyebabkan aplikasi mogok (*crash*).

Express menyediakan metode bawaan untuk menyajikan file secara sederhana, namun memahami kapan harus menggunakan metode tersebut dibandingkan kapan harus turun ke *level* native Node.js Streams sangat penting untuk membangun backend yang *scalable* dan berperforma tinggi.

## Materi Inti

### 1. Memaksa Unduhan File dengan `res.download()`

Ketika Anda ingin browser pengguna memunculkan dialog "Simpan Sebagai" (*Save As*) daripada menampilkan file tersebut di dalam browser, gunakan `res.download()`. Metode ini secara otomatis mengatur *header* HTTP yang sesuai (seperti `Content-Disposition: attachment`) dan menangani proses transfer file.

```javascript
const express = require('express');
const path = require('path');
const app = express();

app.get('/download/invoice', (req, res) => {
  // Bangun path absolut ke file
  const filePath = path.join(__dirname, 'files', 'invoice-123.pdf');

  // Kirim file sebagai attachment (lampiran)
  res.download(filePath, 'Invoice_Anda.pdf', (err) => {
    if (err) {
      // Tangani error, tapi jangan ekspos path internal ke klien
      console.error('Unduhan file gagal:', err);
      if (!res.headersSent) {
        res.status(500).send('Tidak dapat mengunduh file.');
      }
    }
  });
});
```

### 2. Menyajikan File ke Browser dengan `res.sendFile()`

Jika Anda ingin file ditampilkan di dalam browser (seperti menampilkan gambar atau membuka PDF di tab baru) daripada memaksa unduhan, gunakan `res.sendFile()`. Metode ini akan mengatur *header* `Content-Type` yang benar berdasarkan ekstensi file.

```javascript
app.get('/view/image', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'logo.png');

  // Catatan: res.sendFile membutuhkan path absolut kecuali Anda mengatur opsi 'root'
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error saat mengirim file:', err);
      res.status(err.status || 500).send('Error saat menyajikan file');
    }
  });
});
```

### 3. Menangani File Besar dengan Node.js Streams

Baik `res.download()` maupun `res.sendFile()` sangat nyaman dan cocok untuk sebagian besar ukuran file. Namun di balik layar, jika Anda mencoba membaca file berukuran masif (misalnya, video 2GB) ke dalam memori sekaligus menggunakan `fs.readFile`, server Anda akan kehabisan RAM dan mengalami *crash*.

**Streams** memungkinkan Anda membaca file secara bertahap (*chunk by chunk*) dan mengirimkannya ke klien saat sedang dibaca. Karena objek `res` pada Express adalah sebuah *Writable Stream*, Anda dapat melakukan `pipe()` dari sebuah *Readable Stream* (file tersebut) langsung ke dalamnya.

```javascript
const fs = require('fs');

app.get('/stream/video', (req, res) => {
  const filePath = path.join(__dirname, 'media', 'large-video.mp4');

  // Opsional: Dapatkan statistik file untuk mengatur header (seperti Content-Length)
  fs.stat(filePath, (err, stats) => {
    if (err) {
      return res.status(404).send('Video tidak ditemukan');
    }

    res.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': 'video/mp4',
    });

    // Buat read stream dan alirkan (pipe) ke response
    const readStream = fs.createReadStream(filePath);

    readStream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr);
      res.end(); // Tutup koneksi jika terjadi error
    });

    readStream.pipe(res);
  });
});
```

## Contoh / Ilustrasi

Bayangkan Anda sedang mengisi kolam renang (browser klien) dengan air dari sebuah waduk raksasa (file besar di server Anda).

- Menggunakan `fs.readFile()` ibarat mencoba mengangkat seluruh waduk sekaligus untuk menuangkannya ke dalam kolam. Punggung Anda kemungkinan besar akan patah (server *crash* karena error *out-of-memory*).
- **Streaming** (`fs.createReadStream().pipe(res)`) ibarat menyambungkan selang dari waduk ke kolam. Air mengalir terus menerus secara bertahap (*chunk by chunk*). Server Anda hanya membutuhkan memori yang cukup untuk menampung air yang saat itu berada di dalam selang, membuatnya sangat efisien terlepas dari seberapa besar waduk tersebut.

## Insight Penting

- **Selalu Gunakan Path Absolut:** Saat menggunakan `res.sendFile()` atau `res.download()`, selalu berikan *path* absolut untuk mencegah serangan *directory traversal*. Gunakan `path.join(__dirname, '...')`.
- **Atur Header dengan Hati-hati:** Saat melakukan *streaming* file secara manual, pastikan Anda mengatur `Content-Type` yang benar. Jika Anda ingin *stream* memicu unduhan, tambahkan `'Content-Disposition': 'attachment; filename="file.ext"'` pada *header* Anda.
- **Bersihkan (Clean Up) Saat Terjadi Error:** Saat menggunakan *streams*, dengarkan (listen) *event* `'error'` pada *read stream* untuk menutup *response* dengan elegan (`res.end()`) jika pembacaan file gagal di tengah jalan, hal ini mencegah klien menggantung (*hanging*) tanpa batas waktu.
- **Gunakan `express.static()` untuk Aset Statis:** Untuk menyajikan file frontend statis (CSS, JS, gambar), jangan membuat *route* manual dengan `res.sendFile()`. Sebaliknya, gunakan *middleware* bawaan `express.static('public')`.

## Ringkasan Akhir

- Gunakan `res.download(path)` untuk memaksa browser klien mengunduh file.
- Gunakan `res.sendFile(path)` untuk mengirim file agar browser dapat merender atau menampilkannya.
- Gunakan `fs.createReadStream(path).pipe(res)` untuk melakukan *streaming* file besar secara bertahap (*chunk-by-chunk*), untuk melindungi memori server Anda.

## Langkah Belajar Berikutnya

- [Handling File Uploads in Express JS with Multer](Handling%20File%20Uploads%20in%20Express%20JS%20with%20Multer.md) (Pelajari proses sebaliknya: menerima file dari klien).
- Pelajari tentang HTTP Range Requests untuk memungkinkan penjedaan (pause) dan pelanjutan (resume) *stream* video atau unduhan berukuran besar.

## Metadata

- Level: Menengah
- Topik utama: Express.js, File Handling
- Topik terkait: Streams, Node.js Core, HTTP Headers
- Kata kunci: res.download, res.sendFile, nodejs streams, pipe, melayani file
- Estimasi waktu baca: 8 - 10 menit

---
title: "Handling File Downloads and Streaming in Express JS"
description: "Materi ini membahas cara efektif menangani unduhan file (file downloads) dan melakukan streaming file berukuran besar di Express.js. Anda akan mempelajari perbe"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Handling File Downloads and Streaming in Express JS

## Ringkasan

Materi ini membahas cara efektif menangani unduhan file (*file downloads*) dan melakukan *streaming* file berukuran besar di Express.js. Anda akan mempelajari perbedaan antara mengirim file kecil sebagai lampiran dan men-streaming file besar secara efisien untuk mengoptimalkan penggunaan memori serta meningkatkan performa di sisi *client*.

## Target Audiens

- **Target Audience:** *Backend developer* yang perlu melayani permintaan file ke *client*, terutama file besar seperti video, audio, atau dokumen berukuran masif.
- **Level:** Menengah.

## Prasyarat

- Pemahaman dasar tentang *routing* dan *middleware* di Express.js.
- Familiar dengan modul `fs` (File System) bawaan Node.js.
- Disarankan telah menyelesaikan tutorial [Handling File Uploads in Express JS with Multer](Handling%20File%20Uploads%20in%20Express%20JS%20with%20Multer_ID.md).

## Tujuan Pembelajaran

Setelah menyelesaikan materi ini, Anda akan dapat:

- Menggunakan `res.download()` untuk meminta *client* mengunduh file.
- Memahami perbedaan antara `res.sendFile()` dan `res.download()`.
- Menggunakan *streams* Node.js untuk menyajikan file besar secara efisien.
- Mengimplementasikan pengiriman konten parsial (HTTP 206) untuk *streaming* media seperti video.

## Konteks dan Motivasi

Saat membangun aplikasi *web*, Anda akan sering kali perlu memungkinkan pengguna untuk mengunduh file, seperti laporan, faktur, atau media. Untuk file kecil, metode sederhana sudah cukup. Namun, memuat file video sebesar 1GB langsung ke dalam memori *server* sebelum mengirimkannya ke *client* akan menyebabkan *server* Express Anda *crash* karena kehabisan memori (*out-of-memory*).

*Streaming* memecahkan masalah ini dengan membaca file dalam potongan-potongan kecil (*chunks*) dan mengirimkannya ke *client* sepotong demi sepotong. Hal ini menjaga penggunaan memori tetap rendah dan memungkinkan *client* untuk mulai memproses data seketika, yang sangat penting untuk *streaming* video atau mengunduh aset berukuran besar.

## Konten Inti

### 1. Mengirim Unduhan Sederhana

Jika Anda memiliki file yang relatif kecil dan ingin memaksa *browser* untuk mengunduhnya (bukan menampilkannya di jendela *browser*), Express menyediakan metode `res.download()`. Metode ini secara otomatis mengatur *header* `Content-Disposition` menjadi `attachment`.

```javascript
const express = require('express');
const path = require('path');
const app = express();

app.get('/download/report', (req, res, next) => {
  const filePath = path.join(__dirname, 'files', 'annual_report.pdf');

  // res.download(path, filename, callback)
  res.download(filePath, 'Report_2023.pdf', (err) => {
    if (err) {
      // Tangani error, tetapi jangan ekspos path internal server
      console.error('File download failed:', err.message);
      if (!res.headersSent) {
        res.status(404).send('File not found or an error occurred.');
      }
    }
  });
});
```

### 2. Menggunakan `res.sendFile()`

Jika Anda ingin menampilkan file di dalam *browser* (misalnya gambar atau PDF) daripada memaksa unduhan, gunakan `res.sendFile()`. Ini akan mengatur *header* `Content-Type` yang sesuai berdasarkan ekstensi file.

```javascript
app.get('/view/image', (req, res) => {
  const imagePath = path.join(__dirname, 'images', 'logo.png');
  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error('Error sending file:', err.message);
      res.status(404).send('Image not found.');
    }
  });
});
```

### 3. Streaming File Besar

Untuk file yang sangat besar, membaca seluruh isi file ke dalam memori menggunakan `fs.readFile` sangatlah berbahaya. Sebagai gantinya, kita menggunakan `fs.createReadStream` dari Node.js dan mengalirkannya (*pipe*) ke objek *response* (`res`), yang pada dasarnya adalah *writable stream*.

```javascript
const fs = require('fs');

app.get('/stream/large-file', (req, res) => {
  const filePath = path.join(__dirname, 'files', 'large_dataset.csv');

  // Atur headers yang sesuai
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="dataset.csv"');

  const fileStream = fs.createReadStream(filePath);

  // Pipe read stream ke response writable stream
  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    console.error('Stream error:', err.message);
    res.status(500).send('Error streaming file.');
  });
});
```

### 4. Video Streaming dengan Konten Parsial (HTTP 206)

Untuk memungkinkan pengguna melompati bagian video ke depan/belakang (*scrubbing*) di pemutar video, Anda harus menangani *header* HTTP `Range` dan merespons dengan status `206 Partial Content`.

```javascript
app.get('/video', (req, res) => {
  const videoPath = path.join(__dirname, 'videos', 'sample.mp4');

  // Pastikan file ada sebelum membaca stats
  if (!fs.existsSync(videoPath)) {
    return res.status(404).send('Video not found');
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Parse Range
    // Contoh: "bytes=32324-"
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);

    file.on('error', (err) => {
      console.error('Stream error:', err.message);
    });
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});
```

## Contoh Kode

Bayangkan Anda sedang menyajikan sup di sebuah restoran.

- **`res.download` / `fs.readFile`:** Ini seperti mencoba menyajikan seluruh kuali raksasa berisi sup dalam satu mangkuk masif ke pelanggan. Mangkuknya bisa pecah, atau pelayannya bisa menjatuhkannya (Kehabisan Memori).
- **Streaming (`fileStream.pipe(res)`):** Ini seperti menggunakan sendok sayur untuk terus-menerus menuangkan sup dari kuali ke mangkuk pelanggan sedikit demi sedikit. Cara ini terkelola, efisien, dan memastikan sup sampai ke pelanggan dengan aman tanpa membebani siapa pun.
- **Konten Parsial (Range Requests):** Pelanggan berkata, "Saya hanya mau bagian bawah dari supnya." Anda mengukur dengan tepat di mana bagian bawah tersebut dimulai dan hanya menyajikan porsi spesifik itu.

## Insight Penting

- **Selalu tangani *error* pada *streams*:** Jika file tidak ada atau izin ditolak, *error* pada *stream* yang tidak tertangani akan menyebabkan aplikasi Node.js Anda *crash*. Selalu dengarkan *event* `'error'` pada *stream* Anda.
- **`res.download` menggunakan *streams* di balik layar:** Express cukup pintar untuk menggunakan *streams* di dalam `res.download()` dan `res.sendFile()`. Namun, menggunakan `createReadStream` secara manual memberi Anda kontrol lebih besar, terutama untuk hal-hal seperti pelacakan progres, kompresi data secara langsung (*on-the-fly*), atau menangani permintaan `Range` untuk media.
- **Keamanan:** Jangan pernah membangun *path* file secara langsung menggunakan *input* pengguna (misalnya, `path.join(__dirname, req.query.fileName)`). Hal ini menyebabkan kerentanan *Path Traversal* di mana penyerang dapat mengunduh file sensitif seperti `/etc/passwd`. Selalu sanitasi nama file dan batasi ke direktori tertentu.

## Kesimpulan

- Gunakan `res.download()` untuk memaksa unduhan file dengan mudah.
- Gunakan `res.sendFile()` untuk menampilkan file secara *native* di dalam *browser*.
- Gunakan `fs.createReadStream()` yang dipasangkan dengan `res` untuk menangani file besar secara manual demi mencegah kehabisan memori *server*.
- Implementasikan *Range requests* untuk mendukung fungsionalitas *streaming* video/audio dan lompat-waktu (*scrubbing*).

## Langkah Berikutnya

- Pelajari cara mengompresi data yang sedang di-*stream* secara langsung (*on-the-fly*) menggunakan modul bawaan Node.js `zlib`.
- Eksplorasi cara menyimpan dan melakukan *streaming* file secara langsung dari *Cloud Storage* (seperti AWS S3) alih-alih dari *file system* lokal.

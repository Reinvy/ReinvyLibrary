---
title: "Logging dan Monitoring di Express JS"
description: "Materi ini membahas cara menerapkan pencatatan (logging) dan pemantauan (monitoring) dalam aplikasi Express.js. Anda akan belajar untuk beralih dari sekadar men"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Logging dan Monitoring di Express JS

## Ringkasan Singkat

Materi ini membahas cara menerapkan pencatatan (logging) dan pemantauan (monitoring) dalam aplikasi Express.js. Anda akan belajar untuk beralih dari sekadar menggunakan `console.log()` menjadi menerapkan logging HTTP terstruktur dengan Morgan dan logging di tingkat aplikasi dengan Winston, agar aplikasi Anda lebih mudah dipelihara dan di-debug.

## Untuk Siapa Materi Ini

- **Target Audience:** Developer backend yang ingin membuat aplikasinya lebih mudah di-debug dan dipantau saat berada di lingkungan produksi (production).
- **Level:** Menengah (Intermediate).

## Prasyarat

- Pemahaman dasar tentang routing dan middleware di Express.js.
- Terbiasa melakukan debugging pada aplikasi JavaScript.
- Memahami perbedaan antara lingkungan pengembangan (development) dan produksi (production).

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan dapat:

- Memahami keterbatasan penggunaan `console.log()` di lingkungan produksi.
- Menerapkan pencatatan request HTTP menggunakan middleware Morgan.
- Mengatur pencatatan aplikasi terstruktur menggunakan Winston.
- Membedakan berbagai level log (info, error, debug, dll.) dan mengarahkan log tersebut ke tujuan yang berbeda (console, file).

## Konteks dan Motivasi

Saat membangun aplikasi Express di komputer lokal, `console.log()` terasa cukup untuk keperluan debugging. Namun, saat aplikasi Anda sudah dirilis ke tahap produksi, output standar console ini bisa dengan mudah hilang, sulit dicari, dan tidak memiliki konteks penting (seperti kapan kejadiannya atau seberapa parah error-nya). Jika aplikasi Anda mengalami crash atau ada pengguna yang melaporkan error, Anda butuh cara sistematis untuk melacak apa yang sebenarnya terjadi.

Logging yang baik menyediakan catatan sejarah tentang perilaku aplikasi Anda. Dengan menggabungkan pencatat request HTTP (untuk melacak traffic yang masuk) dan pencatat aplikasi (untuk melacak alur logika bisnis dan error), Anda bisa dengan cepat mendiagnosis masalah, memantau performa, dan memahami perilaku pengguna.

## Materi Inti

### 1. Masalah dengan `console.log()`

Fungsi `console.log()` berjalan secara sinkron pada beberapa lingkungan, tidak memiliki kategorisasi (semuanya dianggap sebagai output standar biasa), dan format datanya tidak konsisten. Di lingkungan produksi, Anda membutuhkan hal-hal berikut:

- **Level Log (Log Levels):** Membedakan mana yang merupakan pesan informasi, peringatan, atau error kritis.
- **Penanda Waktu (Timestamps):** Mengetahui waktu kejadian dengan presisi.
- **Tujuan Log (Transports):** Mengirim catatan ke berbagai tempat, seperti file, database, atau layanan pemantauan eksternal.

### 2. HTTP Request Logging dengan Morgan

Morgan adalah middleware pembuat log request HTTP untuk Node.js. Ia secara otomatis mencatat detail tentang request yang masuk, seperti metode HTTP, URL, kode status (status code), dan waktu respons (response time).

Untuk menggunakan Morgan, instal melalui npm: `npm install morgan`.

```javascript
const express = require('express');
const morgan = require('morgan');
const app = express();

// Gunakan format 'dev' untuk lingkungan pengembangan
// Format ini memberikan warna pada output agar lebih mudah dibaca
app.use(morgan('dev'));

// Untuk produksi, Anda mungkin membutuhkan format yang lebih lengkap seperti 'combined'
// app.use(morgan('combined'));
```

### 3. Application Logging dengan Winston

Winston adalah pustaka (library) logging serbaguna untuk Node.js. Ia memungkinkan Anda membuat log terstruktur (biasanya dalam format JSON) dan mengarahkannya ke berbagai tujuan (disebut *transports*).

Untuk menggunakan Winston, instal dengan: `npm install winston`.

```javascript
const winston = require('winston');

// Konfigurasi logger
const logger = winston.createLogger({
  level: 'info', // Level log default
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Simpan semua log dengan level 'error' dan yang lebih parah ke dalam 'error.log'
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // Simpan semua log dengan level 'info' dan yang lebih parah ke dalam 'combined.log'
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Jika kita tidak berada di lingkungan produksi, tampilkan juga log ke console dengan format yang lebih sederhana
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Contoh penggunaan
logger.info('Aplikasi berhasil dijalankan.');
logger.error('Koneksi ke database gagal.');
```

### 4. Menggabungkan Morgan dan Winston

Anda dapat mengonfigurasi Morgan untuk mengirim catatan request HTTP-nya melalui Winston. Dengan cara ini, semua log aplikasi Anda terpusat di satu tempat dan diformat secara konsisten.

```javascript
const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      // Konfigurasi Morgan untuk menggunakan logger Winston dengan level 'info'
      write: (message) => logger.info(message.trim()),
    },
  }
);

app.use(morganMiddleware);
```

## Contoh / Ilustrasi

Bayangkan Anda sedang menjalankan sebuah hotel besar:

- **Morgan adalah Buku Tamu Resepsionis:** Ia mencatat setiap orang yang masuk, kamar apa yang mereka minta, dan berapa lama waktu yang dibutuhkan resepsionis untuk memberikan kuncinya.
- **Winston adalah Sistem Manajemen Internal:** Ia mencatat apa yang terjadi di balik layar. Jika sebuah pipa bocor di lantai 4 (`logger.error()`), atau jika dapur berhasil menerima kiriman bahan makanan baru (`logger.info()`), Winston mencatatnya beserta waktu dan tingkat keparahannya.

Hanya mengandalkan `console.log()` sama seperti staf hotel yang hanya meneriakkan pembaruan tersebut di lorong—cepat atau lambat, pesan penting tersebut akan tenggelam dalam keramaian.

## Insight Penting

- **Struktur Sangat Penting:** Dalam produksi, menyimpan log dalam format JSON sangat disarankan. Hal ini memungkinkan alat pengumpul log (seperti Datadog, ELK stack, atau Splunk) untuk dengan mudah membaca, mengurai (parse), dan mencari isi log Anda.
- **Jangan Mencatat Data Sensitif:** Berhati-hatilah agar tidak memasukkan password pengguna, API keys, atau informasi identitas pribadi (PII) ke dalam log. Selalu lakukan sanitasi data sebelum dicatat jika diperlukan.
- **Pahami Level Log:** Gunakan level `error` untuk kegagalan sistem yang membutuhkan penanganan segera, `warn` untuk situasi tak terduga yang belum tentu error, `info` untuk kejadian umum dalam siklus aplikasi, dan `debug` untuk melacak informasi detail selama tahap pengembangan.

## Ringkasan Akhir

- Penggunaan `console.log()` tidak cukup memadai untuk aplikasi di lingkungan produksi.
- Gunakan **Morgan** untuk mencatat request HTTP yang masuk secara otomatis.
- Gunakan **Winston** untuk membuat log aplikasi yang berjenjang dan terstruktur, serta menyimpannya ke dalam file atau layanan eksternal.
- Menggabungkan Morgan dan Winston akan memusatkan seluruh sistem pencatatan pada aplikasi Anda.

## Langkah Belajar Berikutnya

- [Deploying Express JS Applications to Production_ID](Deploying%20Express%20JS%20Applications%20to%20Production_ID.md)
- [Express JS Security Best Practices_ID](Express%20JS%20Security%20Best%20Practices_ID.md)

## Metadata

- Level: Menengah
- Topik utama: Express.js, Backend Development, Monitoring
- Topik terkait: Middleware, Logging, Debugging, Production
- Kata kunci: express logging, morgan, winston, production monitoring, error tracking
- Estimasi waktu baca: 8 - 12 menit

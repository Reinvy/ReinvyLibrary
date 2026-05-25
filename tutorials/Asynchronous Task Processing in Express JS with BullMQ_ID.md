# Pemrosesan Tugas Asinkron di Express JS dengan BullMQ

## Ringkasan Singkat

Tutorial ini memperkenalkan pemrosesan tugas asinkron di Express.js menggunakan BullMQ dan Redis. Anda akan belajar cara memindahkan operasi berat yang memakan waktu dari event loop utama Node.js ke worker di latar belakang, sehingga meningkatkan responsivitas dan skalabilitas aplikasi web Anda.

## Untuk Siapa Materi Ini

Developer Express.js tingkat menengah hingga mahir yang sedang membangun aplikasi yang membutuhkan penanganan tugas komputasi berat, pengiriman email massal, pemrosesan gambar, atau integrasi dengan API pihak ketiga yang lambat tanpa memblokir request HTTP yang masuk.

## Prasyarat

- Pemahaman kuat tentang dasar-dasar Node.js dan Express.js.
- Keakraban dengan event loop Node.js dan pemrograman asinkron (Promises, async/await).
- Pemahaman dasar tentang Redis (karena BullMQ bergantung pada Redis untuk menyimpan antrean tugas).
- Node.js dan Redis sudah terinstal di mesin lokal Anda.

## Tujuan Belajar

- Memahami konsep pekerjaan di latar belakang (background jobs) dan mengapa itu diperlukan di lingkungan Node.js yang single-threaded.
- Mempelajari cara mengatur BullMQ dengan Redis di aplikasi Express.js.
- Mempelajari cara mendefinisikan antrean (queues), produsen (pembuat pekerjaan), dan pekerja (pemroses pekerjaan).
- Memahami cara menangani peristiwa pekerjaan (sukses, gagal, progres) dengan anggun.
- Mendapatkan wawasan tentang praktik terbaik untuk menstruktur tugas asinkron.

## Konteks dan Motivasi

Node.js berjalan di atas event loop dengan single-thread. Jika API Express Anda menerima permintaan yang memerlukan pemrosesan berat (seperti membuat PDF besar, mengubah ukuran gambar resolusi tinggi, atau mengirim email ke ribuan pengguna), tugas tersebut akan memblokir event loop. Selama event loop diblokir, server Anda tidak dapat merespons request masuk lainnya, yang menyebabkan waktu respons yang lambat dan pengalaman pengguna yang buruk.

Untuk mengatasi ini, kita menggunakan sistem antrean pesan (message queue) seperti BullMQ. Daripada memproses tugas berat tersebut segera selama request HTTP berlangsung, server Express Anda hanya menambahkan "pekerjaan" (job) ke dalam antrean dan langsung merespons pengguna (misalnya, "Tugas sedang diproses"). Sebuah proses terpisah di latar belakang (seorang worker) akan mengambil pekerjaan dari antrean dan memprosesnya secara asinkron.

## Materi Inti

### Apa itu BullMQ?

BullMQ adalah library antrean pesan yang cepat, andal, dan kuat untuk Node.js berbasis Redis. BullMQ menyediakan fitur seperti penjadwalan pekerjaan, pekerjaan tertunda, percobaan ulang (retries), kontrol konkurensi, dan banyak lagi.

### Mengatur Proyek

Pertama, instal dependensi yang diperlukan:

```bash
npm install express bullmq ioredis
```

*Catatan: `ioredis` adalah klien Redis untuk Node.js yang kuat dan berfokus pada performa yang digunakan BullMQ di balik layar.*

### 1. Menghubungkan ke Redis

BullMQ membutuhkan koneksi ke Redis. Mari kita buat konfigurasi koneksi yang dapat digunakan bersama.

```javascript
// redisClient.js
const { Redis } = require('ioredis');

const redisConnection = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null // Diperlukan oleh BullMQ
});

module.exports = redisConnection;
```

### 2. Membuat Antrean (Produsen)

Antrean (queue) adalah tempat Anda menambahkan pekerjaan. Di dalam aplikasi Express Anda, Anda akan bertindak sebagai produsen yang mendorong pekerjaan ke dalam antrean ini.

```javascript
// emailQueue.js
const { Queue } = require('bullmq');
const redisConnection = require('./redisClient');

const emailQueue = new Queue('EmailQueue', { connection: redisConnection });

async function addEmailJob(emailData) {
  // Menambahkan pekerjaan bernama 'sendWelcomeEmail' ke dalam antrean
  await emailQueue.add('sendWelcomeEmail', emailData, {
    attempts: 3,          // Coba ulang hingga 3 kali jika gagal
    backoff: {
      type: 'exponential',
      delay: 1000         // Tunggu 1 detik, 2 detik, 4 detik di antara percobaan ulang
    }
  });
}

module.exports = { addEmailJob };
```

### 3. Mengatur Pekerja (Konsumen / Worker)

Worker bertanggung jawab untuk mengambil pekerjaan dari antrean dan memprosesnya. Di lingkungan produksi (production), worker sering kali berjalan sebagai proses Node.js yang terpisah, tetapi untuk kesederhanaan, kita dapat menjalankannya di proyek yang sama.

```javascript
// emailWorker.js
const { Worker } = require('bullmq');
const redisConnection = require('./redisClient');

const emailWorker = new Worker('EmailQueue', async (job) => {
  console.log(`Memproses job ${job.id} bertipe ${job.name}`);
  const { to, subject, body } = job.data;

  // Simulasi tugas yang memakan waktu (misalnya, mengirim email)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Gagal secara acak untuk mendemonstrasikan percobaan ulang (opsional)
  if (Math.random() < 0.2) {
    throw new Error('Simulasi kegagalan jaringan secara acak');
  }

  console.log(`Email terkirim ke ${to}`);
  return { status: 'success' };
}, { connection: redisConnection });

// Event listener untuk memantau status pekerjaan
emailWorker.on('completed', (job, returnvalue) => {
  console.log(`Job ${job.id} selesai!`, returnvalue);
});

emailWorker.on('failed', (job, err) => {
  console.log(`Job ${job.id} gagal dengan error: ${err.message}`);
});
```

### 4. Integrasi dengan Route Express

Sekarang, mari kita hubungkan antrean kita ke rute Express agar kita dapat memicu pekerjaan melalui request HTTP.

```javascript
// app.js
const express = require('express');
const { addEmailJob } = require('./emailQueue');
require('./emailWorker'); // Menginisialisasi worker untuk mendengarkan antrean

const app = express();
app.use(express.json());

app.post('/api/register', async (req, res) => {
  try {
    const { email, name } = req.body;

    // 1. Simpan pengguna ke database (operasi cepat)
    // const user = await db.users.create({ email, name });

    // 2. Tambahkan tugas email ke antrean (operasi cepat)
    await addEmailJob({
      to: email,
      subject: 'Selamat datang di platform kami!',
      body: `Hai ${name}, terima kasih telah bergabung.`
    });

    // 3. Merespons pengguna dengan segera!
    res.status(202).json({
      message: 'Pengguna berhasil mendaftar. Email selamat datang sedang diproses.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(3000, () => {
  console.log('Server berjalan di port 3000');
});
```

## Contoh / Ilustrasi

Bayangkan sebuah restoran cepat saji.

- **Rute Express** adalah kasir yang menerima pesanan Anda. Mereka menerima uang Anda, memberi Anda nomor pesanan (respons HTTP), dan segera pindah melayani pelanggan berikutnya. Mereka TIDAK memasak makanannya.
- **Server Redis** adalah papan tiket di dapur tempat kasir meletakkan tiket pesanan Anda.
- **Worker BullMQ** adalah koki di dapur yang mengambil tiket dari papan dan memasak makanan secara asinkron.

Jika kasir juga harus memasak setiap makanan sebelum mengambil pesanan berikutnya, antrean akan menjadi sangat lambat (inilah yang terjadi ketika Anda memblokir event loop Node.js).

## Insight Penting

- **Pemisahan Peran (Separation of Concerns):** Pisahkan server web Anda (Express) dari worker Anda. Di lingkungan produksi, sangat disarankan untuk menjalankan Express API dan BullMQ Workers di kontainer atau mesin virtual yang berbeda. Ini memungkinkan Anda untuk mengukur (scale) keduanya secara independen berdasarkan lalu lintas request versus beban pemrosesan latar belakang.
- **Idempotensi:** Pastikan tugas worker Anda bersifat idempoten. Karena pekerjaan mungkin dicoba ulang jika terjadi kegagalan, memproses pekerjaan yang sama dua kali seharusnya tidak menyebabkan efek samping yang tidak diinginkan (misalnya, menagih pembayaran pelanggan dua kali).
- **Graceful Shutdown (Penghentian Anggun):** Terapkan penghentian yang anggun untuk worker Anda. Ketika server melakukan restart atau dimatikan, Anda pasti ingin worker menyelesaikan pekerjaan yang sedang berjalan terlebih dahulu atau menghentikannya dengan aman, alih-alih membunuhnya di tengah eksekusi. Gunakan `worker.close()` selama urutan shutdown.
- **Pantau Antrean Anda:** Gunakan alat seperti `bull-board` untuk memvisualisasikan antrean Anda, melacak pekerjaan yang gagal, dan memantau kinerja worker secara visual.

## Ringkasan Akhir

- Pemrosesan tugas asinkron sangat penting untuk menjaga aplikasi Express.js tetap responsif.
- BullMQ adalah sistem antrean tangguh yang didukung oleh Redis.
- Alur kerja terdiri dari **Queue** (untuk menyimpan pekerjaan), **Produsen** (aplikasi Express Anda yang menambahkan pekerjaan), dan **Worker** (proses latar belakang yang mengeksekusi pekerjaan).
- Memindahkan tugas berat dapat mencegah terblokirnya event loop single-thread Node.js.

## Langkah Belajar Berikutnya

- Pelajari cara mengimplementasikan tugas berulang (repeatable jobs) layaknya CRON menggunakan BullMQ.
- Eksplorasi cara mengatur `bull-board` untuk mendapatkan antarmuka pengguna (GUI) pemantauan antrean Anda.
- Pelajari strategi Graceful Shutdown di Node.js untuk memastikan worker menyelesaikan tugasnya sebelum server dimatikan.

## Metadata

- Level: Menengah
- Topik utama: Express.js, Optimasi Performa
- Topik terkait: Message Queues, Redis, Pemrosesan Asinkron, BullMQ
- Kata kunci: express js background jobs, bullmq tutorial, node js event loop, redis task queue, async processing
- Estimasi waktu baca: 10 menit

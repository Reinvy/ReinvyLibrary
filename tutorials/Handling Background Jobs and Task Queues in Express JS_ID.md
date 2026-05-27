# Menangani Background Jobs dan Task Queues di Express JS

## Ringkasan Singkat

Tutorial ini mengeksplorasi cara menangani tugas-tugas berat atau berjalan lama (long-running tasks) di aplikasi Express JS menggunakan *background jobs* dan *task queues*. Dengan mendelegasikan operasi berat seperti pengiriman email, pemrosesan gambar, atau impor data ke *worker* di latar belakang, Anda dapat menjaga API tetap cepat, responsif, dan menghindari terblokirnya *event loop* Node.js.

---

## Untuk Siapa Materi Ini

* **Target pembaca:** Backend developer, Express JS engineer, dan perancang API.
* **Level pembaca:** Menengah (Intermediate).

---

## Prasyarat

* Pemahaman dasar tentang Express JS dan Node.js.
* Familiaritas dengan *event loop* Node.js dan pemrograman asinkron.
* Pengetahuan dasar tentang Redis (sering digunakan sebagai penyimpanan utama untuk antrean tugas).

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Mengapa memblokir *event loop* Node.js dengan tugas-tugas sinkron atau berjalan lama adalah masalah besar.
* Apa itu *background jobs* dan *task queues*, serta kapan harus menggunakannya.
* Cara mengimplementasikan *task queue* yang tangguh menggunakan BullMQ dan Redis di aplikasi Express.
* Praktik terbaik (best practices) untuk menstruktur *worker*, menangani tugas yang gagal, dan melakukan proses ulang (retry).

---

## Konteks dan Motivasi

Node.js berjalan dalam satu *thread* (single-threaded) dan menggunakan model I/O yang berbasis peristiwa (*event-driven*) dan tidak memblokir (*non-blocking*). Meskipun ini membuat Express sangat efisien untuk menangani ribuan permintaan secara bersamaan, hal ini juga berarti bahwa mengeksekusi tugas berat CPU atau memanggil API pihak ketiga yang lambat langsung di dalam fungsi *route* akan memblokir *event loop*. Saat *event loop* diblokir, aplikasi Anda tidak dapat memproses permintaan lain yang masuk, yang mengakibatkan performa memburuk dan *timeout*.

*Background jobs* memecahkan masalah ini dengan memindahkan beban kerja berat keluar dari *thread* API utama. Alih-alih memproses tugas tersebut secara langsung saat itu juga, aplikasi Express dengan cepat memasukkan "pekerjaan" (*job*) ke dalam antrean (*queue*) dan merespons pengguna. Proses (atau *worker*) terpisah kemudian akan mengambil *job* dari antrean dan mengeksekusinya secara independen. Arsitektur ini sangat penting untuk operasi seperti membuat laporan PDF, mengirim email massal, memproses file video/audio, atau menyinkronkan data dengan layanan eksternal.

---

## Materi Inti

### 1. Masalah dengan Pemrosesan Langsung (Inline Processing)

Bayangkan sebuah *route* di mana pengguna mengunggah gambar beresolusi tinggi, dan server harus mengubah ukurannya menjadi beberapa *thumbnail* sebelum memberikan respons. Jika pemrosesan memakan waktu 5 detik, pengguna harus menunggu 5 detik untuk mendapatkan respons. Lebih buruk lagi, pengguna lain yang mencoba mengakses situs selama 5 detik tersebut juga akan tertunda. Ini yang disebut dengan "memblokir *event loop*".

### 2. Apa itu Task Queue?

*Task queue* adalah struktur data (seringkali didukung oleh basis data dalam memori yang cepat seperti Redis) yang menyimpan *jobs* yang sedang menunggu untuk diproses.

* **Producer:** Aplikasi Express yang membuat *jobs* dan memasukkannya ke dalam antrean.
* **Queue:** Lapisan penyimpanan yang menampung *jobs* yang berstatus tertunda (pending), aktif, selesai, atau gagal.
* **Consumer/Worker:** Proses Node.js terpisah (atau *thread*) yang secara konstan memeriksa antrean, mengambil *jobs*, dan mengeksekusinya.

### 3. Memilih Library Antrean

Untuk Node.js dan Express, [BullMQ](https://docs.bullmq.io/) (penerus dari library Bull) adalah standar industri saat ini. Library ini bergantung pada Redis, menyediakan fitur lanjutan seperti percobaan ulang *job* (retries), pekerjaan yang ditunda (delayed jobs), pembatasan akses (rate-limiting), serta alur parent-child, dan sangat bisa diandalkan.

### 4. Arsitektur Dasar dengan BullMQ

Dalam pengaturan umum, Anda akan memiliki server API Express dan satu (atau lebih) proses *worker* di latar belakang. Saat permintaan masuk, *controller* Express menginisiasi `Queue` BullMQ dan memanggil `queue.add('namaJob', data)`. *Controller* tersebut kemudian langsung mengembalikan respons `202 Accepted`. Di file terpisah (yang biasanya dijalankan sebagai proses berbeda di *production*), sebuah `Worker` BullMQ mendengarkan antrean yang sama dan memproses *job* tersebut secara asinkron.

---

## Contoh / Ilustrasi

Mari implementasikan *background job* sederhana untuk mengirim email selamat datang saat pengguna mendaftar. Kita akan menggunakan `bullmq` dan `ioredis`.

### 1. Install Dependensi

```bash
npm install bullmq ioredis
```

### 2. Pengaturan Queue (queue.js)

```javascript
const { Queue } = require('bullmq');

// Koneksi ke Redis
const connection = {
  host: '127.0.0.1',
  port: 6379
};

// Buat instance antrean (queue) baru
const emailQueue = new Queue('EmailQueue', { connection });

module.exports = emailQueue;
```

### 3. Route Express (Producer) (app.js)

```javascript
const express = require('express');
const emailQueue = require('./queue');

const app = express();
app.use(express.json());

app.post('/register', async (req, res) => {
  try {
    const { email, username } = req.body;

    // Simpan data user ke database di sini...

    // Masukkan job email ke antrean daripada mengirimnya secara inline
    await emailQueue.add('sendWelcomeEmail', {
      email,
      username
    }, {
      attempts: 3, // Coba lagi hingga 3 kali jika gagal
      backoff: { type: 'exponential', delay: 1000 } // Jeda waktu sebelum mencoba kembali
    });

    // Beri respons secepatnya
    res.status(202).json({ message: 'User registered, welcome email is being processed.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(3000, () => console.log('API listening on port 3000'));
```

### 4. Proses Worker (worker.js)

```javascript
const { Worker } = require('bullmq');

const connection = {
  host: '127.0.0.1',
  port: 6379
};

// Worker ini memproses jobs dari 'EmailQueue'
const worker = new Worker('EmailQueue', async (job) => {
  console.log(`Processing job ${job.id} of type ${job.name}...`);
  const { email, username } = job.data;

  // Simulasi proses pengiriman email (contohnya memanggil SendGrid atau AWS SES)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log(`Successfully sent welcome email to ${email}`);
}, { connection });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

Untuk menjalankan kode ini, pastikan Redis sudah berjalan di lokal Anda, lalu jalankan API (`node app.js`), dan jalankan worker (`node worker.js`).

---

## Insight Penting

* **Idempotensi:** Pastikan *background jobs* Anda bersifat idempoten. Jika sebuah *job* gagal di tengah jalan dan dijalankan ulang, eksekusi kedua kalinya tidak boleh menimbulkan efek samping yang tidak diinginkan (seperti menagih kartu kredit dua kali).
* **Pisahkan Proses:** Walaupun Anda *bisa* menjalankan *worker* di proses Node.js yang sama dengan aplikasi Express, ini bertentangan dengan tujuan utama memindahkan beban kerja CPU. Selalu jalankan *worker* sebagai proses terpisah di *production* (misalnya di dalam *container* Docker terpisah).
* **Penanganan Error dan Percobaan Ulang (Retries):** Gangguan jaringan sementara pasti akan terjadi. Selalu konfigurasi percobaan ulang dengan metode *exponential backoff* untuk *jobs* yang berkomunikasi dengan API eksternal.
* **Dead Letter Queues (DLQ):** Awasi terus *jobs* yang gagal berulang kali. BullMQ memungkinkan Anda menangani pekerjaan yang gagal, mencatatnya, atau memindahkannya ke DLQ sehingga Anda bisa mengecek mengapa pekerjaan itu gagal tanpa memblokir antrean utama.
* **Hindari Memasukkan Semua Hal ke Antrean:** Jangan gunakan *task queue* untuk operasi ringan dan cepat yang memang memerlukan respons sinkron segera ke pihak klien. *Task queues* dirancang khusus untuk operasi yang hasilnya tidak perlu ditunggu oleh klien secara langsung.

---

## Ringkasan Akhir

* Memblokir *event loop* Node.js dengan pemrosesan yang berat menurunkan performa API dan merusak pengalaman pengguna.
* *Background jobs* memindahkan tugas-tugas berat, lambat, atau rawan error keluar dari siklus *request-response* standar.
* Tool seperti BullMQ dan Redis menyediakan sistem antrean yang tangguh, lengkap dengan fitur coba ulang (*retries*), pengontrolan konkurensi, dan manajemen *state* pekerjaan.
* Selalu pisahkan server API dan proses *worker* untuk memaksimalkan responsivitas dan kemampuan *scaling* aplikasi Anda.

---

## Langkah Belajar Berikutnya

* Jelajahi fitur lanjutan dari BullMQ seperti *delayed jobs*, *repeatable (cron) jobs*, dan *job events*.
* Pelajari cara menerapkan WebSockets atau Server-Sent Events (SSE) untuk memberi notifikasi ke sisi klien (frontend) saat *background job* telah selesai diproses.
* Pelajari materi "Dockerizing Express JS Applications" untuk mengetahui cara mendistribusikan *container* API dan Worker Anda bersama-sama dengan *instance* Redis.

---

## Metadata

* **Level:** Menengah
* **Topik utama:** Express JS, Background Jobs, Task Queues
* **Topik terkait:** Performa, Arsitektur, Redis
* **Kata kunci:** Express, BullMQ, Redis, Tugas Latar Belakang, Event Loop, Antrean, Worker
* **Estimasi waktu baca:** 10 menit

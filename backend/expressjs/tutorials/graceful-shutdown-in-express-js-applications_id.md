---
title: "Graceful Shutdown di Aplikasi Express JS"
description: "Materi ini membahas konsep \"Graceful Shutdown\" pada aplikasi Express.js. Di sini dijelaskan cara menghentikan server Node.js dengan aman, memastikan bahwa semua"
category: "backend"
technology: "expressjs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Graceful Shutdown di Aplikasi Express JS

## Ringkasan Singkat

Materi ini membahas konsep "Graceful Shutdown" pada aplikasi Express.js. Di sini dijelaskan cara menghentikan *server* Node.js dengan aman, memastikan bahwa semua *request* yang sedang berjalan diselesaikan dan sumber daya eksternal (seperti koneksi *database*) ditutup dengan benar sebelum aplikasi benar-benar mati (*exit*).

---

## Untuk Siapa Materi Ini

- **Target Pembaca:** *Developer backend* level menengah hingga mahir.
- **Level:** Menengah (Intermediate).

---

## Prasyarat

- Pemahaman kuat tentang JavaScript dan Node.js.
- Pengalaman membangun *API* dengan Express.js.
- Pengetahuan dasar tentang *system signals* (seperti `SIGTERM` dan `SIGINT`) dan lingkungan *deployment* aplikasi.

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

- Definisi dan pentingnya melakukan *graceful shutdown*.
- Bagaimana Node.js menangani *system signals* saat menghentikan sebuah proses.
- Langkah-langkah untuk mengimplementasikan *graceful shutdown* dalam aplikasi Express.
- Cara yang benar untuk menutup koneksi *server*, *pool database*, dan membersihkan *timer* sebelum *exit*.

---

## Konteks dan Motivasi

Saat mende-deploy aplikasi Express.js Anda, baik di mesin virtual (VM), lingkungan *container* seperti Docker, atau *Platform as a Service* (PaaS), lingkungan tersebut sesekali akan perlu menghentikan atau me-restart aplikasi Anda. Hal ini bisa terjadi selama proses *deployment* baru, *scaling* (penambahan/pengurangan server), atau pemeliharaan sistem.

Jika aplikasi Anda berhenti secara tiba-tiba ("hard" shutdown), pengguna yang sedang melakukan *request* akan mengalami putus koneksi atau *timeout* secara mendadak. Lebih parahnya, koneksi *database* yang sedang aktif bisa dibiarkan menggantung, yang berpotensi menyebabkan batas koneksi penuh atau data menjadi korup. *Graceful shutdown* memastikan bahwa aplikasi berhenti menerima *request* baru, menyelesaikan *request* yang sedang diproses, menutup sumber daya secara elegan, lalu keluar (*exit*) dengan aman.

---

## Materi Inti

### 1. Apa itu System Signals?

Ketika sistem operasi ingin menghentikan suatu proses, ia akan mengirimkan sebuah sinyal (*signal*). Dua sinyal paling umum yang perlu Anda tangani adalah:

- `SIGINT` (Signal Interrupt): Dikirimkan ketika pengguna menekan `Ctrl+C` di terminal.
- `SIGTERM` (Signal Terminate): Dikirimkan oleh *process manager* (seperti systemd, PM2, atau Docker/Kubernetes) untuk meminta aplikasi berhenti dengan sopan.

### 2. Proses dari Graceful Shutdown

Sebuah *graceful shutdown* biasanya mengikuti langkah-langkah berurutan berikut:

1. **Menerima Sinyal:** Mendengarkan kemunculan sinyal `SIGINT` atau `SIGTERM`.
2. **Berhenti Menerima Request Baru:** Memerintahkan *server* Express untuk berhenti mendengarkan (*listening*) pada *port*-nya.
3. **Menyelesaikan Request Berjalan:** Menunggu *server* selesai memberikan respons pada *request* HTTP yang masih aktif.
4. **Menutup Sumber Daya:** Menutup koneksi ke *database* (misalnya MongoDB, PostgreSQL), Redis, atau layanan eksternal lainnya.
5. **Keluar (Exit):** Menghentikan proses Node.js menggunakan `process.exit(0)` (sukses) atau `process.exit(1)` (jika terjadi error saat proses shutdown).

### 3. Implementasi Graceful Shutdown di Express

Secara bawaan (*default*), memanggil fungsi `server.close()` pada *HTTP server* Node.js akan menghentikannya dari menerima koneksi baru, namun *server* tersebut akan menunggu koneksi yang sudah ada sampai selesai.

```javascript
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  // Simulasi request yang lambat
  setTimeout(() => {
    res.send('Request selesai dengan sukses!');
  }, 5000);
});

const server = app.listen(port, () => {
  console.log(`Server mendengarkan di http://localhost:${port}`);
});

// Fungsi untuk menangani proses shutdown
const gracefulShutdown = (signal) => {
  console.log(`\nMenerima ${signal}. Memulai graceful shutdown...`);

  // 1. Menghentikan server dari menerima request baru
  server.close(() => {
    console.log('HTTP server ditutup. Semua request berjalan telah selesai.');

    // 2. Menutup koneksi database (Simulasi)
    console.log('Menutup koneksi database...');
    // db.close()

    // 3. Keluar dari proses dengan bersih
    console.log('Proses keluar secara bersih.');
    process.exit(0);
  });

  // Opsional: Lakukan shutdown paksa jika proses memakan waktu terlalu lama
  setTimeout(() => {
    console.error('Tidak dapat menutup koneksi tepat waktu, memaksa shutdown');
    process.exit(1);
  }, 10000); // batas waktu 10 detik
};

// Mendengarkan system signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### 4. Menangani Koneksi Keep-Alive

Satu kasus khusus pada HTTP *server* Node.js adalah koneksi "keep-alive". Seorang *client* mungkin menahan koneksinya tetap terbuka tanpa mengirimkan *request*. Pemanggilan `server.close()` biasa akan menunggu tanpa batas waktu hingga koneksi-koneksi ini terputus, sehingga mencegah *server* untuk melakukan *shutdown*.
Untuk mengatasinya, versi Node.js modern menyediakan opsi seperti `server.closeAllConnections()` atau dengan melacak koneksi aktif secara manual untuk menghancurkan (*destroy*) *socket* yang menganggur selama proses *shutdown*. Alternatifnya, pustaka seperti `stoppable` dapat membantu mengelola hal ini secara otomatis.

---

## Contoh / Ilustrasi

Bayangkan **Waktu Tutup Restoran**.

1. **Sinyal:** Pada pukul 21:45, manajer mengumumkan restoran akan segera tutup (`SIGTERM`).
2. **Berhenti Menerima Request Baru:** Tuan rumah (host) mengunci pintu depan. Tidak ada pelanggan baru yang boleh masuk (`server.close()`).
3. **Menyelesaikan Request Berjalan:** Dapur terus memasak untuk pelanggan yang sudah duduk, dan pelayan melayani mereka sampai mereka selesai makan.
4. **Menutup Sumber Daya:** Setelah pelanggan terakhir pergi, staf membersihkan dapur, mematikan oven (menutup koneksi database), dan menghitung uang di kasir.
5. **Keluar (Exit):** Manajer mematikan lampu dan mengunci pintu belakang (`process.exit(0)`).

Sebuah "hard shutdown" ibarat manajer mematikan semua lampu dan mengusir semua orang pada pukul 21:45 tepat, bahkan jika mereka baru separuh jalan menghabiskan makanan mereka.

---

## Insight Penting

- **Kubernetes dan Docker:** Dalam infrastruktur modern, orkestrator *container* sangat bergantung pada *graceful shutdown*. Kubernetes mengirimkan `SIGTERM` dan menunggu durasi *grace period* tertentu (biasanya 30 detik) sebelum mengirimkan `SIGKILL` secara paksa. Jika aplikasi Anda tidak menangani `SIGTERM`, ia akan mati tiba-tiba ketika waktu *grace period* habis.
- **Fallback Timeout:** Selalu implementasikan `setTimeout` selama proses *shutdown* Anda. Jika koneksi *database* hang (macet) saat mencoba ditutup, Anda tidak ingin proses Node.js Anda terjebak dalam kondisi *zombie* selamanya. Lakukan *exit* secara paksa jika *shutdown* memakan waktu terlalu lama.
- **Statelessness:** *Graceful shutdown* jauh lebih mudah jika aplikasi Anda bersifat *stateless* (tidak menyimpan *state*/kondisi). Jika Anda memproses *background jobs* yang berjalan lama, Anda akan memerlukan logika yang lebih kompleks untuk menjeda atau mengembalikan pekerjaan tersebut ke antrean (requeue) sebelum *exit*.

---

## Ringkasan Akhir

- *Graceful shutdown* mencegah gangguan pada pengguna dan korupsi data ketika *server* dihentikan.
- Node.js mendengarkan sinyal dari OS seperti `SIGTERM` dan `SIGINT`.
- Prosesnya melibatkan penghentian *HTTP server* (`server.close()`), menunggu *request* selesai, menutup sumber daya eksternal, dan akhirnya menghentikan proses.
- Selalu sertakan mekanisme batas waktu (*timeout*) untuk melakukan *exit* paksa jika proses *graceful shutdown* macet.

---

## Langkah Belajar Berikutnya

- Pelajari cara mengimplementasikan antrean pemrosesan tugas latar belakang (*background job processing queues*, seperti BullMQ) yang mendukung jeda dengan aman (*graceful pausing*).
- [Deploying Express JS Applications to Production](Deploying%20Express%20JS%20Applications%20to%20Production.md)
- [Dockerizing Express JS Applications](Dockerizing%20Express%20JS%20Applications.md)

---

## Metadata

- **Level:** Menengah (Intermediate)
- **Topik utama:** Express.js, Deployment, Keandalan (Reliability)
- **Topik terkait:** Process Management, Node.js Events, DevOps
- **Kata kunci:** graceful shutdown, sigterm, sigint, server close, express deployment
- **Estimasi waktu baca:** 7 - 10 menit

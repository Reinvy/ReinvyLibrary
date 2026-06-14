---
title: "Scaling Express JS Applications with PM2 and Clustering"
description: "Materi ini membahas cara men-scale aplikasi Express.js Anda untuk menangani lebih banyak trafik dan memaksimalkan sumber daya server. Anda akan mempelajari kete"
category: "backend"
technology: "expressjs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Scaling Express JS Applications with PM2 and Clustering

## Ringkasan Singkat

Materi ini membahas cara men-*scale* aplikasi Express.js Anda untuk menangani lebih banyak trafik dan memaksimalkan sumber daya *server*. Anda akan mempelajari keterbatasan sifat *single-thread* pada Node.js, cara mengatasinya menggunakan modul bawaan `cluster`, dan cara mengelola *deployment* di *production* secara efektif menggunakan PM2, sebuah *process manager* tingkat lanjut.

---

## Untuk Siapa Materi Ini

* **Target Audience:** *Developer backend* tingkat menengah hingga mahir yang menyiapkan aplikasi untuk lingkungan *production* dengan trafik tinggi.
* **Level:** Menengah - Mahir.

---

## Prasyarat

* Pemahaman kuat tentang membangun dan menjalankan aplikasi Express.js.
* Terbiasa mengeksekusi perintah di *terminal*.
* Pemahaman dasar tentang arsitektur *server* (*CPU core*, *process*, *thread*).
* Telah membaca [Deploying Express JS Applications to Production](Deploying%20Express%20JS%20Applications%20to%20Production_ID.md).

---

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan dapat:

* Memahami mengapa aplikasi Express.js standar tidak dapat memanfaatkan *CPU multi-core* secara *default*.
* Mengimplementasikan fitur *clustering* bawaan Node.js untuk men-*scale* aplikasi Anda di beberapa *CPU core*.
* Menginstal dan mengonfigurasi PM2 untuk men-*scale*, mengelola, dan memantau *process* Express.js secara otomatis.
* Memastikan aplikasi Anda tetap tersedia (*highly available*) dengan fitur *zero-downtime reload* dan *restart* otomatis.

---

## Konteks dan Motivasi

Node.js, pada dasarnya, berjalan pada satu *thread*. Ini berarti secara bawaan, sebuah aplikasi Express.js hanya dapat memanfaatkan satu *core* dari *CPU server*, terlepas dari berapa banyak *core* yang sebenarnya dimiliki *server* tersebut. Jika Anda melakukan *deploy* aplikasi Express dasar pada *server* dengan 8 *core*, Anda membuang 7/8 dari daya komputasi Anda, dan aplikasi Anda akan kewalahan di bawah beban berat karena satu *core* tersebut menjadi *bottleneck*.

Untuk menangani lebih banyak *request* bersamaan dan benar-benar melakukan *scaling*, kita perlu menjalankan beberapa *instance* dari aplikasi Express kita. Melakukan ini secara manual sangat melelahkan dan rentan kesalahan. Di sinilah *process manager* seperti PM2 dan teknik seperti *clustering* menjadi sangat penting. Mereka memungkinkan kita untuk menjalankan beberapa *worker process* yang berbagi *port* yang sama, secara dramatis meningkatkan kapasitas (*throughput*) dan memberikan ketahanan jika satu *process* mengalami kegagalan (*crash*).

---

## Materi Inti

### 1. Masalah Single-Thread di Node.js

Node.js menggunakan *event loop* yang berjalan pada satu *thread*. Meskipun model ini sangat efisien untuk tugas yang bergantung pada I/O (seperti melakukan *query database* atau membuat *request* jaringan), model ini menjadi *bottleneck* untuk tugas yang intensif CPU atau ketika menghadapi volume *request* bersamaan yang masif.

Jika sebuah *thread* terblokir, tidak ada *request* lain yang dapat diproses. Selain itu, satu *process* Node.js tidak dapat secara otomatis men-*scale* untuk memanfaatkan *CPU core* tambahan yang tersedia di *server* modern.

### 2. Native Clustering di Node.js

Modul bawaan `cluster` memungkinkan Anda untuk dengan mudah membuat *child process* (*worker*) yang berbagi *port server* yang sama. *Process master* mendengarkan pada *port* tersebut dan mendistribusikan koneksi masuk di antara *worker process* menggunakan pendekatan *round-robin*.

Berikut adalah cara Anda mengimplementasikan *clustering* dasar:

```javascript
const cluster = require('cluster');
const os = require('os');
const express = require('express');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);
  console.log(`Forking ${numCPUs} workers...`);

  // Fork worker untuk setiap CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Menangani worker yang crash
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {
  // Worker dapat berbagi koneksi TCP apa pun
  // Dalam hal ini adalah server HTTP Express
  const app = express();

  app.get('/', (req, res) => {
    res.send(`Hello from worker ${process.pid}`);
  });

  app.listen(3000, () => {
    console.log(`Worker ${process.pid} started`);
  });
}
```

Meskipun *native clustering* berfungsi, mengelolanya secara manual (menangani *restart* dengan lancar, *logging*, pemantauan) sangat kompleks. Inilah sebabnya mengapa standar industri adalah menggunakan *process manager* khusus.

### 3. Memperkenalkan PM2 (Process Manager 2)

PM2 adalah *process manager* di lingkungan *production* untuk aplikasi Node.js dengan *load balancer* bawaan. Ia menyederhanakan *clustering*, menjaga aplikasi tetap hidup selamanya (*restart* otomatis), dan menyediakan alat pemantauan yang canggih.

**Instalasi:**
Biasanya diinstal secara global di *server*.

```bash
npm install pm2 -g
```

### 4. Scaling dengan PM2

PM2 menyembunyikan kode modul `cluster` yang kompleks. Anda menulis aplikasi Express *single-thread* standar, dan PM2 menangani *clustering* untuk Anda.

Misalkan Anda memiliki `server.js` sederhana:

```javascript
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Hello World!'));
app.listen(3000, () => console.log('Server running on port 3000'));
```

Untuk menjalankan aplikasi ini dalam *cluster mode* menggunakan semua *CPU core* yang tersedia, jalankan:

```bash
pm2 start server.js -i max
```

* `-i max` memberi tahu PM2 untuk mendeteksi secara otomatis jumlah CPU yang tersedia dan menjalankan *process* sebanyak mungkin. Anda juga dapat menentukan angka (misalnya, `-i 4`).

### 5. Mengelola Process dengan PM2

PM2 menyediakan perintah penting untuk lingkungan *production*:

* **Daftar process:** `pm2 list`
* **Pantau resource (CPU/RAM):** `pm2 monit`
* **Lihat log:** `pm2 logs`
* **Restart app:** `pm2 restart <app_name_or_id>`
* **Zero-downtime reload:** `pm2 reload <app_name_or_id>` (Sangat penting untuk *deployment production*)
* **Stop app:** `pm2 stop <app_name_or_id>`

### 6. Menggunakan File Ecosystem

Untuk *deployment production*, mengonfigurasi PM2 melalui *command line* rentan kesalahan. Sebagai gantinya, gunakan file `ecosystem.config.js` untuk mendefinisikan lingkungan *deployment* Anda.

```javascript
// ecosystem.config.js
module.exports = {
  apps : [{
    name: "my-express-api",
    script: "./server.js",
    instances: "max", // Scale di semua core
    exec_mode: "cluster", // Aktifkan cluster mode
    watch: false, // Nonaktifkan watch mode di production
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}
```

Untuk memulai aplikasi menggunakan file konfigurasi:

```bash
pm2 start ecosystem.config.js --env production
```

---

## Contoh / Ilustrasi

Bayangkan sebuah dapur restoran.

* **Single-Threaded Node.js:** Hanya ada satu koki di dapur. Meskipun dapur memiliki 8 kompor (*CPU core*), sang koki hanya bisa memasak satu hidangan dalam satu waktu. Pesanan akan menumpuk dengan cepat.
* **Clustering / PM2:** Restoran mempekerjakan 8 koki (*worker*) dan menugaskan masing-masing pada satu kompor. Seorang kepala pelayan (*Master Process*/PM2) menerima semua pesanan masuk (*HTTP request*) dan membagikannya kepada koki mana pun yang sedang tersedia. Jika seorang koki secara tidak sengaja membakar hidangan dan perlu keluar (*worker crash*), kepala pelayan segera membawa koki pengganti (`cluster.fork()` / *restart* otomatis) tanpa menutup restoran.

---

## Insight Penting

* **Statefulness:** Ketika Anda menggunakan *clustering*, *instance* aplikasi Anda berjalan di ruang memori yang terisolasi. Anda **tidak dapat** menyimpan data sesi (*session*) atau *state* aplikasi di dalam memori (misalnya, `let activeUsers = {}`) karena *Worker A* tidak akan mengetahui tentang pengguna yang disimpan di *Worker B*. Anda harus menggunakan penyimpanan eksternal yang dibagikan seperti Redis untuk sesi, *caching*, dan manajemen *state*.
* **Zero-Downtime Reloads:** Menggunakan `pm2 reload` alih-alih `pm2 restart` sangat penting untuk *pipeline* CI/CD. PM2 akan melakukan *restart worker* satu per satu secara elegan (*graceful*), memastikan bahwa selalu ada setidaknya satu *worker* yang tersedia untuk menangani trafik masuk selama proses *deployment*.
* **Logging:** Ketika berjalan dalam *cluster mode*, keluaran `console.log` dari semua *worker* akan digabungkan. Gunakan `pm2 logs` untuk melihatnya. Untuk aplikasi *production* yang serius, pertimbangkan untuk mengintegrasikan log PM2 dengan layanan *logging* eksternal (seperti Datadog atau *ELK stack*).

---

## Ringkasan Akhir

* Node.js bersifat *single-thread*; tidak dapat memanfaatkan *CPU multi-core* secara *default*.
* Modul bawaan `cluster` memungkinkan *scaling* dengan memunculkan *child process* yang berbagi *port* yang sama.
* PM2 adalah alat standar industri yang menyederhanakan *clustering*, *restart* otomatis, dan pemantauan *process*.
* Gunakan `pm2 start app.js -i max` atau konfigurasi file `ecosystem.config.js` untuk mengaktifkan *cluster mode*.
* Saat melakukan *scaling*, aplikasi Anda harus berstatus tanpa status (*stateless*). Andalkan layanan eksternal seperti Redis untuk *state* yang dibagikan.

---

## Langkah Belajar Berikutnya

* [Dockerizing Express JS Applications](Dockerizing%20Express%20JS%20Applications_ID.md) (Pelajari cara mengontainerisasi aplikasi Anda, sebuah pendekatan alternatif atau pelengkap untuk *scaling*).
* [Caching in Express JS APIs with Redis](Caching%20in%20Express%20JS%20APIs%20with%20Redis_ID.md) (Penting untuk mengelola *state* di lingkungan yang terkluster).

---

## Metadata

* Level: Menengah
* Topik utama: Express.js, Backend Development, Scaling, Production Deployment
* Topik terkait: PM2, Clustering, High Availability, Load Balancing
* Kata kunci: express scaling, nodejs cluster, pm2, load balancing, production ready express
* Estimasi waktu baca: 10 - 15 menit

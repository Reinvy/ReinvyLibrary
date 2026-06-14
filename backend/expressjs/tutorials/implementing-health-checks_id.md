---
title: "Menerapkan Health Checks di Express JS"
description: "Tutorial ini membahas konsep esensial penerapan health checks dalam aplikasi Express.js. Anda akan mempelajari cara membuat endpoint yang melaporkan status apli"
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Menerapkan Health Checks di Express JS

## Ringkasan Singkat

Tutorial ini membahas konsep esensial penerapan *health checks* dalam aplikasi Express.js. Anda akan mempelajari cara membuat *endpoint* yang melaporkan status aplikasi ke alat infrastruktur, memastikan ketersediaan tinggi, dan pemantauan yang mulus di lingkungan produksi.

---

## Untuk Siapa Materi Ini

- **Target Pembaca:** *Backend developer* menengah, *DevOps engineer*, dan administrator sistem.
- **Level:** Menengah.

---

## Prasyarat

- Pemahaman tentang *routing* dan dasar-dasar Express.js.
- Familiar dengan konsep *deployment* atau *containerization* (misalnya, Docker).
- Pemahaman dasar tentang cara kerja *load balancer* atau orkestrator kontainer (seperti Kubernetes).

---

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan dapat:

- Memahami apa itu *health checks* dan mengapa mereka sangat penting untuk sistem produksi.
- Membedakan antara *Liveness probe* dan *Readiness probe*.
- Menerapkan *endpoint health check* yang tangguh dalam aplikasi Express.js.
- Mengintegrasikan pengecekan *database* atau layanan eksternal ke dalam status kesehatan aplikasi Anda.

---

## Konteks dan Motivasi

Ketika Anda melakukan *deploy* aplikasi Express.js ke produksi, terutama di lingkungan berbasis kontainer (seperti Docker) atau platform orkestrasi (seperti Kubernetes), infrastruktur perlu mengetahui apakah aplikasi Anda benar-benar berjalan dan siap menangani lalu lintas jaringan (*traffic*).

Proses yang "berjalan" belum tentu berarti "sehat" atau "siap". Misalnya, server mungkin menyala, tetapi koneksi ke *database* mungkin gagal, atau server sedang kelebihan beban. Dengan menyediakan *endpoint health check* khusus, *load balancer* dan orkestrator dapat secara otomatis me-*restart* kontainer yang gagal atau berhenti mengirimkan lalu lintas ke *instance* yang tidak sehat, sehingga secara signifikan meningkatkan keandalan sistem dan *uptime*.

---

## Materi Inti

### 1. Apa itu Health Check?

*Health check* adalah HTTP *endpoint* khusus (biasanya `/health` atau `/status`) yang diekspos oleh aplikasi Anda. Alat pemantauan infrastruktur akan mengakses (*ping*) *endpoint* ini pada interval yang teratur. Jika mengembalikan status `200 OK`, layanan dianggap sehat. Jika mengembalikan *error* atau *timeout*, layanan dianggap tidak sehat.

### 2. Liveness vs. Readiness Probes

Dalam infrastruktur modern (seperti Kubernetes), *health check* sering dibagi menjadi dua jenis:

- **Liveness Probe:** "Apakah aplikasi sedang berjalan?" Jika ini gagal, sistem akan me-*restart* aplikasi. Ini hanya memeriksa apakah proses server hidup dan responsif.
- **Readiness Probe:** "Apakah aplikasi siap menerima *traffic*?" Jika ini gagal, sistem tidak akan me-*restart* aplikasi, tetapi akan menghapusnya dari kelompok *load balancer* sehingga tidak ada *request* baru yang dikirim kepadanya. Ini berguna saat aplikasi baru menyala dan sedang memuat *cache*, atau ketika layanan dependen (seperti *database*) sementara tidak tersedia.

### 3. Liveness Health Check Dasar

Bentuk paling sederhana dari *health check* adalah *endpoint* yang hanya mengembalikan `200 OK`.

```javascript
app.get('/health/liveness', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});
```

### 4. Readiness Health Check Komprehensif

Pengecekan *readiness* harus memverifikasi koneksi ke layanan pendukung esensial, seperti *database* atau *cache* Anda.

```javascript
app.get('/health/readiness', async (req, res) => {
  try {
    // Contoh: Pengecekan koneksi database (pseudo-code)
    // await mongoose.connection.db.admin().ping();

    // Contoh: Pengecekan koneksi Redis (pseudo-code)
    // await redisClient.ping();

    res.status(200).json({
      status: 'READY',
      services: {
        database: 'UP',
        redis: 'UP'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Health Check Failed]', error);
    res.status(503).json({
      status: 'NOT_READY',
      error: 'Dependent services are unavailable'
    });
  }
});
```

### 5. Best Practices

- **Jaga agar tetap cepat:** *Health checks* dipanggil secara berkala (misalnya, setiap 5-10 detik). Jangan memasukkan *query* berat atau operasi yang lambat di *endpoint* ini.
- **Jangan mengekspos data sensitif:** Jangan pernah mengembalikan alamat IP internal, riwayat *error* sistem (*stack trace*), atau kredensial dalam respons *health check*.
- **Gunakan kode status standar:** `200` untuk sehat, `503` (*Service Unavailable*) untuk kondisi tidak sehat.

---

## Contoh / Ilustrasi

Mari kita buat contoh aplikasi Express yang lengkap dan dapat dijalankan dengan pengecekan *liveness* dan *readiness*. Kita akan mensimulasikan koneksi *database*.

```javascript
const express = require('express');
const app = express();

// Simulasi status koneksi database
let isDatabaseConnected = true;

// Simulasi kegagalan database setelah 30 detik
setTimeout(() => {
  isDatabaseConnected = false;
  console.log('Simulated database disconnection.');
}, 30000);

// 1. Liveness Check: Hanya memeriksa apakah server Express responsif
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ALIVE' });
});

// 2. Readiness Check: Memeriksa layanan dependen (misal: database)
app.get('/health/ready', (req, res) => {
  if (isDatabaseConnected) {
    res.status(200).json({
      status: 'READY',
      checks: { database: 'OK' }
    });
  } else {
    // 503 Service Unavailable adalah standar untuk readiness check yang gagal
    res.status(503).json({
      status: 'UNAVAILABLE',
      checks: { database: 'FAILED' }
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

*Ilustrasi:* Bayangkan aplikasi Anda adalah sebuah restoran.

- **Liveness** berarti pintu depan restoran tidak terkunci dan staf ada di dalam.
- **Readiness** berarti dapur memiliki gas dan bahan makanan, sehingga mereka benar-benar dapat memasak. Jika gas terputus (*database down*), restoran masih "hidup", tetapi tidak "siap" untuk melayani pelanggan.

---

## Insight Penting

- **Separation of Concerns:** Jangan campur adukkan *liveness* dan *readiness*. Jika *database* mati, Anda ingin berhenti mengirimkan *traffic* ke aplikasi (*Readiness* = Gagal), tetapi Anda *tidak* ingin Kubernetes terus-menerus me-*restart* aplikasi dalam *loop* (*Liveness* = Lulus). Me-*restart* aplikasi tidak akan memperbaiki *database* eksternal.
- **Keamanan:** Terkadang *developer* meletakkan *health checks* di belakang proses autentikasi. **Jangan lakukan ini untuk infrastruktur.** Kubernetes atau *Load Balancer* Anda tidak seharusnya memerlukan token JWT untuk mengakses `/health`. Biarkan terbuka namun aman (tanpa memuat data sensitif).
- **Integrasi Graceful Shutdown:** *Health checks* sering kali bekerja beriringan dengan *Graceful Shutdown*. Saat aplikasi menerima sinyal `SIGTERM` untuk dimatikan, Anda dapat segera membuat *Readiness check* gagal agar *load balancer* berhenti mengirimkan *request* baru, sementara aplikasi menyelesaikan proses yang sudah ada.

---

## Ringkasan Akhir

- *Health checks* sangat penting untuk keandalan sistem, memungkinkan infrastruktur memantau status aplikasi.
- **Liveness probes** memeriksa apakah proses aplikasi berjalan dan responsif.
- **Readiness probes** memeriksa apakah aplikasi sepenuhnya siap untuk menangani lalu lintas jaringan, termasuk konektivitas layanan dependen.
- Jaga *health checks* tetap cepat dan hindari mengekspos informasi internal yang sensitif.

---

## Langkah Belajar Berikutnya

- [Graceful Shutdown in Express JS Applications](Graceful%20Shutdown%20in%20Express%20JS%20Applications.md)
- [Logging and Monitoring in Express JS](Logging%20and%20Monitoring%20in%20Express%20JS.md)
- [Deploying Express JS Applications to Production](Deploying%20Express%20JS%20Applications%20to%20Production.md)

---

## Metadata

- Level: Menengah
- Topik utama: Backend Development, Express.js, DevOps
- Topik terkait: Health Checks, Liveness Probe, Readiness Probe, Kubernetes, Docker
- Kata kunci: express health check, nodejs readiness probe, liveness probe, express status endpoint
- Estimasi waktu baca: 8 - 10 menit

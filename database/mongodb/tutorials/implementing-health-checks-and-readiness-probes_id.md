---
title: "Mengimplementasikan Health Checks dan Readiness Probes di Express JS"
description: "Tutorial ini menjelaskan cara mengimplementasikan health checks (pemeriksaan kesehatan) dan readiness probes (pemeriksaan kesiapan) pada aplikasi Express.js. An"
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Mengimplementasikan Health Checks dan Readiness Probes di Express JS

## Ringkasan Singkat

Tutorial ini menjelaskan cara mengimplementasikan *health checks* (pemeriksaan kesehatan) dan *readiness probes* (pemeriksaan kesiapan) pada aplikasi Express.js. Anda akan mempelajari perbedaan antara *liveness* dan *readiness*, mengapa keduanya sangat penting untuk *deployment* modern seperti Docker dan Kubernetes, serta bagaimana membangun *endpoint* yang andal untuk memantau status aplikasi Anda.

## Untuk Siapa Materi Ini

*Developer backend* tingkat menengah hingga mahir yang sedang menyiapkan aplikasi Express.js mereka untuk lingkungan produksi (*production*), kontainerisasi, atau sistem orkestrasi seperti Kubernetes.

## Prasyarat

- Pemahaman yang solid tentang *routing* dan *middleware* di Express.js.
- Keakraban dasar dengan konsep *deployment*, kontainerisasi (Docker), atau orkestrasi (Kubernetes).
- Pemahaman mengenai kode status HTTP dan operasi asinkron di Node.js.

## Tujuan Belajar

- Memahami perbedaan antara *liveness probes* (health checks) dan *readiness probes*.
- Mempelajari cara mengimplementasikan *endpoint health check* yang sederhana maupun tingkat lanjut di Express.js.
- Memahami cara mengintegrasikan status *database* atau layanan eksternal ke dalam pemeriksaan kesiapan (*readiness checks*).
- Menghindari kesalahan umum yang dapat menyebabkan kegagalan beruntun (*cascading failures*) di *production*.

## Konteks dan Motivasi

Dalam infrastruktur modern, aplikasi jarang di-*deploy* sebagai *instance* tunggal yang statis. Aplikasi dikelola oleh orkestrator seperti Kubernetes atau *load balancer* yang perlu mengetahui apakah sebuah *instance* aplikasi berjalan dengan baik.
Jika aplikasi *crash*, sistem perlu merestartnya (*Liveness*). Jika aplikasi masih dalam proses *booting* atau sementara terputus dari *database*-nya, sistem harus berhenti mengirimkan *traffic* kepadanya sampai pulih (*Readiness*). Tanpa pemeriksaan ini, pengguna mungkin mengalami *timeout*, *error*, atau kegagalan yang tidak disadari (*silent failures*).

## Materi Inti

### 1. Liveness vs Readiness

Sangat penting untuk memahami perbedaan antara dua jenis probe utama ini:

- **Liveness Probe (Health Check):** Menjawab pertanyaan, "Apakah aplikasi sedang berjalan?" Jika ini gagal, sistem (seperti Kubernetes) akan merestart kontainer. Ini harus berupa pemeriksaan sederhana yang tidak bergantung pada layanan eksternal.
- **Readiness Probe:** Menjawab pertanyaan, "Apakah aplikasi siap menerima *traffic*?" Jika ini gagal, sistem akan berhenti mengirimkan *request* HTTP ke *instance* ini tetapi tidak merestartnya. Pemeriksaan ini sering kali memverifikasi koneksi ke *database*, *cache*, atau API eksternal.

### 2. Basic Liveness Check

*Liveness check* harus seringan mungkin. Ia hanya perlu mengonfirmasi bahwa *server* Express merespons terhadap *request* HTTP.

### 3. Advanced Readiness Check

*Readiness check* lebih kompleks. Ia perlu memastikan bahwa dependensi aplikasi berfungsi. Sebagai contoh, jika aplikasi Express Anda membutuhkan koneksi MongoDB untuk melayani *request*, *readiness probe* harus memeriksa koneksi tersebut.

### 4. Menangani Kegagalan Probe dengan Anggun

Ketika *readiness probe* gagal, kembalikan kode status HTTP yang sesuai, biasanya `503 Service Unavailable`. Jangan mengembalikan `500 Internal Server Error` kecuali mekanisme probe itu sendiri yang rusak. Berikan respons JSON yang merinci komponen spesifik mana yang gagal untuk membantu proses *debugging*.

## Contoh / Ilustrasi

Berikut adalah contoh implementasi *endpoint liveness* dan *readiness* dalam aplikasi Express menggunakan simulasi koneksi *database*.

```javascript
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Terhubung ke database (simulasi)
mongoose.connect('mongodb://localhost:27017/myapp', { useNewUrlParser: true });

// --- Liveness Probe ---
// Hanya mengembalikan 200 OK jika server berjalan.
app.get('/health/liveness', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Application is running' });
});

// --- Readiness Probe ---
// Memeriksa apakah database terhubung dan siap.
app.get('/health/readiness', async (req, res) => {
  try {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const dbState = mongoose.connection.readyState;

    if (dbState === 1) {
      res.status(200).json({ status: 'READY', components: { database: 'UP' } });
    } else {
      res.status(503).json({ status: 'NOT_READY', components: { database: 'DOWN' } });
    }
  } catch (error) {
    res.status(503).json({ status: 'NOT_READY', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

## Insight Penting

- **Buat Liveness Checks Sederhana:** Jangan pernah melakukan *query* ke *database* di dalam *liveness check*. Jika *database* *down*, semua *instance* aplikasi Anda akan gagal dalam *liveness checks* dan direstart secara bersamaan, menyebabkan pemadaman massal (*cascading failure*).
- **Timeout Itu Penting:** Pastikan probe Anda merespons dengan cepat. Jika probe memakan waktu terlalu lama, orkestrator akan menganggapnya sebagai kegagalan. Gunakan *timeout* yang ketat pada pemeriksaan *database* dalam *readiness probe*.
- **Keamanan:** Pertimbangkan untuk mengamankan *endpoint health* Anda atau mengeksposnya pada *port* internal yang berbeda sehingga tidak dapat diakses dari internet publik, mencegah potensi serangan *Denial of Service* (DoS) pada probe itu sendiri.

## Ringkasan Akhir

- *Health checks* sangat esensial untuk orkestrasi kontainer dan *load balancing*.
- **Liveness probes** menentukan apakah aplikasi perlu direstart.
- **Readiness probes** menentukan apakah aplikasi dapat dengan aman menerima *traffic*.
- Desain *liveness probes* agar cepat dan terisolasi, sementara *readiness probes* sebaiknya memverifikasi dependensi kritis seperti *database*.

## Langkah Belajar Berikutnya

- Graceful Shutdown in Express JS Applications.
- Dockerizing Express JS Applications.
- Deploying Express JS Applications to Production.

## Metadata

- Level: Menengah
- Topik utama: Express JS
- Topik terkait: Deployment, DevOps, Containerization, Kubernetes
- Kata kunci: health check, liveness probe, readiness probe, express health, kubernetes, docker
- Estimasi waktu baca: 8 menit

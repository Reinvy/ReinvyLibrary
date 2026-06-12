# Implementasi Health Checks di Express JS

## Ringkasan Singkat

Materi ini menjelaskan pentingnya mengimplementasikan *endpoint health check* dan *readiness probe* pada aplikasi Express.js Anda. Anda akan belajar bagaimana merancang *endpoint* ini untuk menginformasikan *load balancer*, orkestrator (seperti Kubernetes), dan sistem *monitoring* apakah aplikasi Anda hidup dan siap menerima *traffic* (lalu lintas data).

## Untuk Siapa Materi Ini

- **Target Audience:** Backend Developer dan DevOps Engineer.
- **Level:** Menengah.

## Prasyarat

- Pemahaman dasar tentang *routing* di Express.js.
- Familiaritas dengan konsep *load balancing* dan orkestrasi kontainer (misalnya, Docker, Kubernetes).
- Pemahaman tentang *HTTP status codes*.

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan dapat:

- Memahami perbedaan antara *Liveness Probe* dan *Readiness Probe*.
- Mengimplementasikan *endpoint* `/health` sederhana untuk menandakan aplikasi berjalan (*uptime*).
- Mengimplementasikan *endpoint* `/ready` untuk memverifikasi koneksi *database* dan layanan eksternal.
- Mengintegrasikan *health checks* dengan mulus ke dalam arsitektur aplikasi Express.js.

## Konteks dan Motivasi

Saat melakukan *deployment* aplikasi Express.js ke lingkungan *production* (produksi), terutama di lingkungan berbasis kontainer seperti Kubernetes atau di belakang AWS *Application Load Balancer* (ALB), infrastruktur membutuhkan cara yang andal untuk mengetahui apakah aplikasi Anda berfungsi dengan benar.

Jika aplikasi Anda *crash* tetapi kontainernya masih berjalan, *load balancer* mungkin akan terus mengirimkan *traffic* ke sana, yang mengakibatkan kegagalan *request* bagi pengguna. Dengan mengekspos *endpoint health check*, infrastruktur dapat mendeteksi secara otomatis saat aplikasi tidak sehat, berhenti mengirimkan *traffic* ke sana, dan berpotensi melakukan *restart* (menghidupkan ulang) aplikasi.

Ada dua konsep utama yang perlu dipahami:

1. **Liveness (Health Check):** Apakah aplikasi berjalan? (Jika tidak, *restart* aplikasi).
2. **Readiness:** Apakah aplikasi siap melayani *traffic*? (Apakah *database* dan *cache* terhubung? Jika tidak, jangan kirimkan *traffic* ke sana dulu, tetapi jangan di-*restart*).

## Materi Inti

### 1. The Liveness Probe (Health Check Dasar)

*Liveness probe* adalah *endpoint* yang sangat sederhana, biasanya `/health` atau `/ping`. Satu-satunya tugasnya adalah mengembalikan status `200 OK` dengan segera. Jika *endpoint* ini gagal merespons atau mengembalikan *error* `5xx`, infrastruktur menganggap aplikasi telah *crash* atau *deadlock* dan akan me-*restart*-nya.

*Endpoint* ini **tidak boleh** mengecek dependensi eksternal seperti *database*. Ia hanya mengecek apakah *server* Express itu sendiri hidup dan dapat memproses suatu *request*.

### 2. The Readiness Probe

*Readiness probe*, seringkali `/ready` atau `/health/ready`, lebih kompleks. Ia memverifikasi apakah aplikasi telah sepenuhnya diinisialisasi dan semua dependensi kritisnya (seperti *database*, *cache* Redis, atau *API* pihak ketiga) terhubung dan merespons.

Jika *endpoint* ini gagal (misalnya, mengembalikan `503 Service Unavailable`), *load balancer* akan berhenti mengirimkan *traffic* ke instans khusus ini sampai *endpoint* tersebut berhasil lagi. Ini **tidak akan** me-*restart* aplikasi.

### 3. Implementasi di Express.js

Berikut adalah cara Anda dapat mengimplementasikan kedua *endpoint* dalam aplikasi Express.js pada umumnya:

```javascript
const express = require('express');
const mongoose = require('mongoose'); // Contoh dependensi database

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. Liveness Probe ---
// Hanya mengembalikan 200 OK jika server berjalan.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// --- 2. Readiness Probe ---
// Mengecek koneksi ke database dan layanan kritis lainnya.
app.get('/ready', async (req, res) => {
  try {
    // Contoh: Mengecek status koneksi Mongoose
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      return res.status(200).json({
        status: 'ready',
        database: 'connected'
      });
    } else {
      // Jika database tidak siap, kembalikan 503 Service Unavailable
      return res.status(503).json({
        status: 'not ready',
        database: 'disconnected'
      });
    }
  } catch (error) {
    // Catat error secara internal untuk debugging
    console.error('[Readiness Check Error]:', error);

    // Kembalikan pesan generic ke client
    res.status(503).json({
      status: 'error',
      message: 'Service is not ready'
    });
  }
});

// Route lainnya...
app.get('/api/users', (req, res) => {
  res.json([{ name: 'Alice' }]);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

### 4. Best Practices untuk Health Checks

- **Jaga Liveness Tetap Sederhana:** Jangan letakkan logika yang berat di dalam *liveness probe*. Ia dipanggil secara sering (misalnya, setiap 5-10 detik). Jika butuh waktu terlalu lama untuk merespons, sistem mungkin salah mengira bahwa aplikasi telah mati.
- **Lindungi Endpoints (Opsional):** Jika *endpoint health* Anda mengekspos informasi sistem yang sensitif (seperti detail versi dependensi atau alamat IP internal), pertimbangkan untuk menambahkan autentikasi dasar atau membatasi akses hanya ke IP jaringan internal. Namun, *endpoint* `/health` sederhana biasanya aman untuk tetap bersifat publik.
- **Integrasi Graceful Shutdown:** Pastikan *health check* Anda bekerja dengan baik dengan logika *Graceful Shutdown* Anda. Saat sinyal *shutdown* diterima, *readiness probe* harus segera mulai mengembalikan `503` agar *traffic* dialihkan (*drained*), sedangkan *liveness probe* harus terus mengembalikan `200` sampai proses akhirnya berhenti.

## Contoh / Ilustrasi

Bayangkan aplikasi Express Anda adalah sebuah **Restoran**.

- **Liveness Probe (`/health`):** Manajer mengecek apakah koki hadir secara fisik di dapur dan sadar. Jika koki pingsan, manajer perlu menyewa yang baru (*restart* kontainer).
- **Readiness Probe (`/ready`):** Manajer mengecek apakah gas menyala, bahan-bahan telah tiba, dan oven panas. Jika bahan-bahan belum tiba (*database disconnected*), koki hidup tetapi tidak bisa memasak. Manajer tidak akan memecat koki, tetapi mereka akan memasang tanda "Tutup Sementara" di pintu sampai bahan-bahan tiba (berhenti mengarahkan *traffic*).

## Insight Penting

- **Kesalahan Umum:** Mengecek koneksi *database* di dalam *probe* `/health` (*Liveness*). Jika *database down*, *liveness probe* gagal, dan Kubernetes akan terus me-*restart* kontainer aplikasi Anda. Me-*restart* aplikasi tidak akan memperbaiki *database* yang rusak, dan *restart* yang konstan hanya memakan lebih banyak CPU dan menunda pemulihan. Hanya cek *database* di dalam *Readiness probe*.
- **Timeouts:** Pastikan *readiness check* Anda memiliki *timeout* yang ketat (misalnya, 2-3 detik). Jika melakukan *query database* memakan waktu 10 detik, itu pertanda adanya masalah, dan *endpoint* harus gagal dengan cepat (*fail fast*) daripada menggantung tanpa batas waktu.

## Ringkasan Akhir

- *Health checks* sangat penting bagi *load balancer* dan orkestrator untuk merutekan *traffic* dengan benar dan mengelola siklus hidup aplikasi.
- **Liveness probes (`/health`)** menunjukkan apakah proses aplikasi sedang berjalan dan harus sangat ringan.
- **Readiness probes (`/ready`)** menunjukkan apakah aplikasi berhasil menangani *request* dengan mengecek dependensi kritis seperti *database*.
- Mengimplementasikan hal ini dengan benar mencegah *downtime* dan meningkatkan keandalan aplikasi di *production*.

## Langkah Belajar Berikutnya

- [Graceful Shutdown in Express JS Applications](Graceful%20Shutdown%20in%20Express%20JS%20Applications_ID.md)
- [Logging and Monitoring in Express JS](Logging%20and%20Monitoring%20in%20Express%20JS_ID.md)
- [Dockerizing Express JS Applications](Dockerizing%20Express%20JS%20Applications_ID.md)

## Metadata

- **Level:** Menengah
- **Topik utama:** Express JS, DevOps, Production Readiness
- **Topik terkait:** Liveness Probe, Readiness Probe, Kubernetes, Load Balancing
- **Kata kunci:** express health check, liveness probe, readiness probe, express production, load balancer health
- **Estimasi waktu baca:** 6 - 8 menit

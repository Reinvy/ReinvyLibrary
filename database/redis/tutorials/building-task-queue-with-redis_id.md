---
title: "Membangun Antrean Tugas dengan Redis"
description: "Tutorial praktis membangun antrean tugas yang andal dengan Redis lists dan sorted sets — mencakup antrean FIFO, worker blocking, tugas terjadwal, logika retry, pemantauan antrean, dan implementasi Node.js yang lengkap."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Antrean Tugas dengan Redis

## Ringkasan

Antrean tugas (task queue) adalah fondasi penting dalam arsitektur aplikasi modern — mereka memisahkan pemrosesan permintaan dari pekerjaan latar belakang, menyerap lonjakan lalu lintas, dan memungkinkan eksekusi asinkron yang andal. Redis, dengan struktur data list yang ringan dan operasi blocking bawaan, menyediakan fondasi yang sangat baik untuk membangun antrean tugas kustom tanpa beban operasional dari sistem antrean khusus seperti RabbitMQ atau Amazon SQS. Tutorial ini memandu implementasi antrean tugas siap-produksi menggunakan Redis lists, dimulai dengan pola FIFO klasik menggunakan LPUSH dan BRPOP, kemudian menambahkan keandalan dengan BRPOPLPUSH backup list, penjadwalan tugas tertunda dengan sorted sets, logika retry dengan exponential backoff, dan pemantauan kesehatan — semuanya dengan implementasi Node.js lengkap menggunakan pustaka ioredis.

## Target Audiens

- Backend Developer, Fullstack Developer, dan DevOps engineer.
- Tingkat menengah. Familiar dengan dasar-dasar Redis (tipe data inti) dan Node.js diasumsikan.

## Prasyarat

- Redis 5.0 atau lebih baru terinstal (lokal, Docker, atau instance cloud).
- Node.js 18 atau lebih baru dan npm terinstal.
- Pengetahuan dasar tentang perintah Redis CLI dan pustaka ioredis.
- Pemahaman tentang pemrograman asinkron dengan Node.js (async/await, Promise).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mengimplementasikan antrean FIFO menggunakan Redis lists (LPUSH + BRPOP).
- Membangun antrean andal dengan BRPOPLPUSH untuk pemulihan dari kegagalan.
- Membuat proses worker dengan penghentian bertahap (graceful shutdown) dan konkurensi yang dapat dikonfigurasi.
- Menjadwalkan tugas tertunda menggunakan Redis sorted sets.
- Mengimplementasikan logika retry dengan exponential backoff dan dead-letter queue.
- Memantau kedalaman antrean, laju pemrosesan, dan kesehatan worker.
- Memahami trade-off antara antrean berbasis Redis dan message broker khusus.

## Konteks dan Motivasi

Dalam setiap aplikasi yang tidak sepele, operasi tertentu tidak dapat dijalankan secara sinkron dalam siklus permintaan-respons HTTP: mengirim email konfirmasi, memproses unggahan gambar, menghasilkan laporan PDF, menyinkronkan data dengan API eksternal, atau menjalankan job batch malam hari. Tugas-tugas ini memerlukan eksekusi asinkron — tetapi juga membutuhkan jaminan. Jika server crash di tengah operasi, tugas tidak boleh hilang. Jika API hilir lambat, tugas lain tidak boleh terblokir. Jika tugas gagal sementara, tugas harus dicoba ulang, bukan ditinggalkan.

Sistem produksi sering beralih ke message broker khusus — RabbitMQ, Apache Kafka, Amazon SQS — untuk memenuhi persyaratan ini. Ini adalah alat yang hebat, tetapi mereka memperkenalkan kompleksitas operasional yang signifikan: manajemen cluster, penyesuaian konfigurasi, pemeliharaan pustaka klien, dan biaya infrastruktur. Untuk banyak aplikasi — khususnya startup, proyek sampingan, dan alat internal — beban ini tidak sebanding dengan kebutuhan antrean yang sebenarnya.

Redis menawarkan titik tengah yang menarik. Struktur data list-nya cocok secara alami untuk antrean FIFO: RPUSH memasukkan dari satu ujung, BLPOP mengeluarkan dari ujung lain dengan semantik blocking yang menghilangkan busy-waiting. Sorted set-nya dapat menjadwalkan tugas tertunda dengan presisi milidetik. Persistensi, replikasi, dan ketersediaan tinggi (Sentinel, Cluster) bawaan Redis memberikan jaminan ketahanan yang dibutuhkan antrean produksi. Dan karena banyak aplikasi sudah menggunakan Redis untuk caching dan penyimpanan sesi, menambahkan kemampuan antrean tidak memerlukan infrastruktur baru sama sekali.

Tutorial ini membangun antrean tugas secara bertahap — dimulai dari yang sederhana, kemudian menambahkan fitur keandalan saat kebutuhan dunia nyata muncul.

## Konten Inti

### Memahami Redis Lists sebagai Antrean

Redis lists adalah struktur data linked list yang dioptimalkan untuk operasi di kedua ujung. Enam perintah membentuk fondasi antrean berbasis list:

| Perintah | Operasi | Kompleksitas Waktu |
|----------|---------|-------------------|
| `LPUSH key value [value ...]` | Menyisipkan satu atau lebih nilai di kepala | O(1) per nilai |
| `RPUSH key value [value ...]` | Menyisipkan satu atau lebih nilai di ekor | O(1) per nilai |
| `LPOP key` | Menghapus dan mengembalikan elemen pertama | O(1) |
| `RPOP key` | Menghapus dan mengembalikan elemen terakhir | O(1) |
| `BLPOP key [key ...] timeout` | LPOP blocking — menunggu elemen | O(1) |
| `BRPOP key [key ...] timeout` | RPOP blocking — menunggu elemen | O(1) |

Untuk antrean FIFO (first-in, first-out), producer mendorong ke ekor (RPUSH) dan consumer mengambil dari kepala (BLPOP). Ini memastikan tugas diproses sesuai urutan pengajuannya.

### Pola Antrean FIFO dengan RPUSH dan BLPOP

Antrean Redis paling sederhana hanya menggunakan dua perintah:

```text
Producer → RPUSH antrean:tugas "kirim-email"
Consumer → BLPOP antrean:tugas 0
```

Timeout `0` berarti blokir tanpa batas hingga elemen tersedia. Consumer tetap diam, mengonsumsi hampir nol sumber daya, dan bangun seketika saat tugas tiba. Ini jauh lebih efisien daripada polling dengan sleep loop.

Berikut adalah producer minimal:

```javascript
// producer.js — memasukkan tugas ke antrean
const Redis = require('ioredis');
const redis = new Redis();

async function enqueue(antrean, tugas) {
  await redis.rpush(antrean, JSON.stringify(tugas));
}

// Penggunaan
await enqueue('antrean:tugas', {
  type: 'kirim_email',
  to: 'user@example.com',
  template: 'selamat_datang'
});
```

Dan consumer minimal:

```javascript
// worker.js — consumer blocking
const Redis = require('ioredis');
const redis = new Redis();

async function startWorker(antrean) {
  while (true) {
    const hasil = await redis.blpop(antrean, 0);
    const tugas = JSON.parse(hasil[1]);
    await prosesTugas(tugas);
  }
}

async function prosesTugas(tugas) {
  console.log(`Memproses: ${tugas.type}`);
  // Eksekusi tugas...
}
```

Pola ini berfungsi, tetapi memiliki kelemahan kritis: jika worker crash setelah `blpop` menghapus tugas dari antrean tetapi sebelum `prosesTugas` selesai, tugas akan **hilang secara permanen**. Bagian berikutnya mengatasi ini dengan pola keandalan BRPOPLPUSH.

### Membangun Antrean Andal dengan BRPOPLPUSH

Redis menyediakan perintah `BRPOPLPUSH` (dan varian blocking `BLMOVE` di Redis 6.2+) yang secara atomik memindahkan elemen dari satu list ke list lain. Ini memungkinkan pola **backup list**: tugas yang di-pop dipindahkan ke list pemrosesan sebelum dieksekusi, memastikan tugas dapat dipulihkan jika worker crash.

```javascript
async function startReliableWorker(antrean, pemrosesan) {
  while (true) {
    // Pindahkan secara atomik dari antrean ke list pemrosesan (blokir hingga tersedia)
    const hasil = await redis.blpop(antrean, 0);
    const tugasJson = hasil[1];

    // Dorong ke list pemrosesan via lpush
    await redis.lpush(pemrosesan, tugasJson);

    try {
      const tugas = JSON.parse(tugasJson);
      await eksekusiTugas(tugas);
      // Sukses — hapus dari list pemrosesan
      await redis.lrem(pemrosesan, 1, tugasJson);
    } catch (err) {
      // Gagal — hapus dari pemrosesan dan tangani kegagalan
      await redis.lrem(pemrosesan, 1, tugasJson);
      await tanganiKegagalan(tugasJson, err);
    }
  }
}
```

Dengan `BRPOPLPUSH` (atau `BLMOVE`), pemindahan bersifat atomik — elemen di-pop dari sumber dan di-push ke tujuan dalam satu operasi. Jika worker mati setelah pemindahan, tugas tetap berada di list pemrosesan dan dapat dipulihkan oleh proses pemulihan saat start ulang:

```javascript
// recover.js — memulihkan tugas yatim saat worker startup
async function recoverOrphaned(sumber, pemrosesan) {
  while (true) {
    const yatim = await redis.rpoplpush(pemrosesan, sumber);
    if (!yatim) break;
    console.log(`Tugas yatim dipulihkan: ${yatim}`);
  }
}
```

**Penting**: `BRPOPLPUSH` menyediakan semantik pengiriman **setidaknya-sekali** (at-least-once). Sebuah tugas mungkin diproses lebih dari sekali jika worker crash setelah menyelesaikan tugas tetapi sebelum menghapusnya dari list pemrosesan. Tugas harus dirancang agar idempoten.

### Tugas Tertunda dengan Sorted Sets

Banyak beban kerja memerlukan eksekusi tertunda: mencoba ulang tugas yang gagal setelah 30 detik, menjadwalkan email selamat datang 24 jam setelah pendaftaran, atau menunda pemrosesan tidak mendesak ke jam sepi. Redis sorted sets menyediakan solusi yang elegan.

Pola ini menggunakan sorted set sebagai antrean penundaan, dengan tugas diserialisasi sebagai member dan timestamp yang dijadwalkan sebagai score:

```javascript
// menjadwalkan tugas untuk eksekusi di masa depan
async function scheduleDelayed(antrean, tugas, delayMs) {
  const executeAt = Date.now() + delayMs;
  await redis.zadd(antrean, executeAt, JSON.stringify(tugas));
}

// polling untuk tugas yang jatuh tempo dan memindahkannya ke antrean kerja
async function processDelayedQueue(antreanTertunda, antreanKerja) {
  while (true) {
    const now = Date.now();
    // Ambil dan hapus semua tugas dengan score <= now secara atomik
    const tugas = await redis.zrangebyscore(antreanTertunda, 0, now);

    if (tugas.length > 0) {
      // Hapus dari sorted set
      await redis.zremrangebyscore(antreanTertunda, 0, now);

      for (const tugasJson of tugas) {
        await redis.rpush(antreanKerja, tugasJson);
      }
    }

    // Tunggu sebelum polling lagi
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

Untuk presisi yang lebih tinggi, gabungkan polling dengan perintah count sorted set untuk memeriksa kedalaman antrean, dan sesuaikan interval polling secara dinamis:

```javascript
async function smartPoll(antreanTertunda, antreanKerja, minInterval = 200, maxInterval = 5000) {
  while (true) {
    const now = Date.now();

    // Intip tugas paling awal
    const next = await redis.zrange(antreanTertunda, 0, 0, 'WITHSCORES');
    if (next.length === 2) {
      const nextTime = parseInt(next[1], 10);
      const waitFor = Math.min(Math.max(nextTime - now, minInterval), maxInterval);

      if (nextTime <= now) {
        const tugas = await redis.zrangebyscore(antreanTertunda, 0, now);
        await redis.zremrangebyscore(antreanTertunda, 0, now);
        for (const t of tugas) {
          await redis.rpush(antreanKerja, t);
        }
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, waitFor));
    } else {
      await new Promise(resolve => setTimeout(resolve, maxInterval));
    }
  }
}
```

### Logika Retry dan Penanganan Error

Kegagalan tidak dapat dihindari dalam sistem terdistribusi. Antrean produksi harus membedakan antara kegagalan sementara (timeout jaringan, ketidaktersediaan API sementara) dan kegagalan permanen (input tidak valid, pelanggaran aturan bisnis).

#### Retry Queue dengan Exponential Backoff

Gunakan sorted set untuk penjadwalan retry, dengan penundaan yang meningkat di antara percobaan:

```javascript
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000; // penundaan dasar 1 detik

async function tanganiKegagalan(tugasJson, error, attempt = 1) {
  const tugas = JSON.parse(tugasJson);

  if (attempt >= MAX_RETRIES) {
    // Kegagalan permanen — pindahkan ke dead-letter queue
    await redis.rpush('queue:dead-letter', tugasJson);
    console.error(`Tugas gagal permanen setelah ${attempt} percobaan:`, tugas.type);
    return;
  }

  // Exponential backoff: 1d, 2d, 4d, 8d, 16d
  const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
  tugas._retryAttempt = attempt + 1;
  tugas._lastError = error.message;

  const executeAt = Date.now() + delay;
  await redis.zadd('queue:retry', executeAt, JSON.stringify(tugas));
  console.log(`Menjadwalkan retry ${attempt + 1} untuk ${tugas.type} dalam ${delay}ms`);
}
```

#### Dead-Letter Queue

Tugas yang melebihi jumlah retry maksimum dipindahkan ke dead-letter queue (DLQ) untuk pemeriksaan manual atau alerting:

```javascript
// dlq-monitor.js — pemroses dead-letter queue
async function monitorDeadLetter() {
  while (true) {
    const deadTask = await redis.blpop('queue:dead-letter', 0);
    const tugas = JSON.parse(deadTask[1]);

    console.error('DEAD LETTER:', {
      type: tugas.type,
      attempts: tugas._retryAttempt,
      lastError: tugas._lastError,
      timestamp: new Date().toISOString()
    });

    // Opsional: kirim alert ke Slack, PagerDuty, dll.
  }
}
```

#### Membedakan Tipe Kegagalan

Tidak semua error harus memicu retry. Klasifikasikan error berdasarkan tipe:

```javascript
class TransientError extends Error {
  constructor(message) { super(message); this.name = 'TransientError'; }
}

class PermanentError extends Error {
  constructor(message) { super(message); this.name = 'PermanentError'; }
}

async function eksekusiTugas(tugas) {
  try {
    switch (tugas.type) {
      case 'kirim_email':
        await kirimEmail(tugas.to, tugas.subject);
        break;
      case 'proses_gambar':
        await prosesGambar(tugas.url);
        break;
      default:
        throw new PermanentError(`Tipe tugas tidak dikenal: ${tugas.type}`);
    }
  } catch (error) {
    if (error instanceof PermanentError) {
      // Langsung kirim ke DLQ tanpa retry
      await redis.rpush('queue:dead-letter', JSON.stringify({ ...tugas, _error: error.message }));
      return;
    }
    throw error; // Error sementara diteruskan ke penangan retry
  }
}
```

### Memantau Kesehatan Antrean

Antrean tanpa observabilitas adalah kotak hitam. Lacak metrik ini menggunakan pola kunci Redis:

**Kedalaman Antrean**: Panjang antrean kerja mengungkapkan tekanan backlog.

```javascript
async function getQueueDepth(antrean) {
  return await redis.llen(antrean);
}
```

**Laju Pemrosesan**: Lacak berapa banyak tugas yang selesai per menit menggunakan sorted set dengan timestamp granularitas menit.

```javascript
async function recordProcessed(tipeTugas) {
  const menit = Math.floor(Date.now() / 60000);
  await redis.zincrby('metrics:processed', 1, `${tipeTugas}:${menit}`);
}

async function getProcessingRate(tipeTugas, menitKembali = 5) {
  const now = Math.floor(Date.now() / 60000);
  const start = now - menitKembali;
  const results = await redis.zrangebyscore('metrics:processed', start, now, 'WITHSCORES');
  const rate = {};
  for (let i = 0; i < results.length; i += 2) {
    if (results[i].startsWith(tipeTugas)) {
      rate[results[i]] = parseInt(results[i + 1], 10);
    }
  }
  return rate;
}
```

**Heartbeat Worker**: Worker secara periodik memperbarui kunci dengan TTL untuk menandakan kelangsungan hidup.

```javascript
async function workerHeartbeat(workerId, ttlSeconds = 30) {
  await redis.set(`worker:heartbeat:${workerId}`, Date.now(), 'EX', ttlSeconds);
}

async function getLiveWorkers() {
  const keys = await redis.keys('worker:heartbeat:*');
  const workers = [];
  for (const key of keys) {
    const heartbeat = await redis.get(key);
    workers.push({ id: key.replace('worker:heartbeat:', ''), lastSeen: parseInt(heartbeat, 10) });
  }
  return workers;
}
```

### Penghentian Bertahap (Graceful Shutdown)

Proses worker harus menyelesaikan tugas yang sedang berlangsung sebelum dimatikan untuk menghindari retry yang tidak perlu:

```javascript
async function startWorkerWithGracefulShutdown(antrean, pemrosesan) {
  let shuttingDown = false;

  process.on('SIGTERM', () => {
    console.log('Mematikan secara bertahap...');
    shuttingDown = true;
  });
  process.on('SIGINT', () => {
    shuttingDown = true;
  });

  while (!shuttingDown) {
    try {
      // Gunakan timeout pendek alih-alih blocking tanpa batas
      const hasil = await redis.blpop(antrean, 1);
      if (!hasil) continue;

      const tugasJson = hasil[1];
      await redis.lpush(pemrosesan, tugasJson);

      const tugas = JSON.parse(tugasJson);
      await eksekusiTugas(tugas);

      await redis.lrem(pemrosesan, 1, tugasJson);
      await recordProcessed(tugas.type);
    } catch (err) {
      console.error('Error worker:', err);
    }
  }

  console.log('Worker berhenti. Tugas dalam proses tetap di list pemrosesan.');
  process.exit(0);
}
```

## Contoh Kode

Berikut adalah implementasi lengkap dan mandiri dari antrean tugas berbasis Redis. Simpan file-file ini ke direktori proyek dan jalankan dengan `node <nama-file>.js`.

### Struktur Direktori

```text
redis-task-queue/
├── package.json
├── queue.js          # Operasi inti antrean
├── worker.js         # Proses worker dengan graceful shutdown
├── producer.js       # Producer / pengirim tugas
├── delayed-worker.js # Penjadwal tugas tertunda
└── monitor.js        # Pemantau kesehatan antrean
```

### package.json

```json
{
  "name": "redis-task-queue",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "ioredis": "^5.4.0"
  }
}
```

### queue.js — Operasi Inti Antrean

```javascript
import Redis from 'ioredis';

const redis = new Redis();

// Konstanta
const WORK_QUEUE = 'queue:tasks';
const PROCESSING_QUEUE = 'queue:processing';
const RETRY_QUEUE = 'queue:retry';
const DEAD_LETTER_QUEUE = 'queue:dead-letter';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

// Memasukkan tugas ke antrean
export async function enqueue(tugas) {
  await redis.rpush(WORK_QUEUE, JSON.stringify(tugas));
  return tugas;
}

// Polling antrean tertunda dan memindahkan tugas yang jatuh tempo ke antrean kerja
export async function processDelayedQueue() {
  const now = Date.now();
  const due = await redis.zrangebyscore(RETRY_QUEUE, 0, now);

  if (due.length > 0) {
    await redis.zremrangebyscore(RETRY_QUEUE, 0, now);
    for (const tugasJson of due) {
      await redis.rpush(WORK_QUEUE, tugasJson);
    }
  }
}

// Menangani kegagalan tugas dengan exponential backoff
export async function handleFailure(tugasJson, error, attempt = 1) {
  const tugas = JSON.parse(tugasJson);

  if (attempt >= MAX_RETRIES) {
    tugas._finalError = error.message;
    await redis.rpush(DEAD_LETTER_QUEUE, JSON.stringify(tugas));
    console.error(`[DLQ] ${tugas.type} gagal permanen setelah ${attempt} percobaan`);
    return;
  }

  const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
  tugas._retryAttempt = attempt + 1;
  tugas._lastError = error.message;
  tugas._scheduledAt = Date.now() + delay;

  await redis.zadd(RETRY_QUEUE, Date.now() + delay, JSON.stringify(tugas));
  console.log(`[RETRY] ${tugas.type} percobaan ${attempt + 1} dalam ${delay}ms`);
}

// Metrik antrean
export async function getQueueDepth() {
  const [tugas, pemrosesan, retry, dead] = await Promise.all([
    redis.llen(WORK_QUEUE),
    redis.llen(PROCESSING_QUEUE),
    redis.zcard(RETRY_QUEUE),
    redis.llen(DEAD_LETTER_QUEUE),
  ]);
  return { tasks: tugas, processing: pemrosesan, retry, dead };
}

export { WORK_QUEUE, PROCESSING_QUEUE, RETRY_QUEUE, DEAD_LETTER_QUEUE };
```

### worker.js — Proses Worker Andal

```javascript
import Redis from 'ioredis';
import {
  WORK_QUEUE, PROCESSING_QUEUE,
  handleFailure, processDelayedQueue, getQueueDepth
} from './queue.js';

const redis = new Redis();
let shuttingDown = false;

process.on('SIGTERM', () => { shuttingDown = true; });
process.on('SIGINT', () => { shuttingDown = true; });

// Router eksekusi tugas
async function executeTask(tugas) {
  switch (tugas.type) {
    case 'kirim_email':
      console.log(`Mengirim email ke ${tugas.to}: ${tugas.subject}`);
      // Simulasi kerja
      await new Promise(r => setTimeout(r, 500));
      break;

    case 'proses_gambar':
      console.log(`Memproses gambar: ${tugas.url}`);
      await new Promise(r => setTimeout(r, 1000));
      break;

    case 'buat_laporan':
      console.log(`Membuat laporan: ${tugas.reportId}`);
      await new Promise(r => setTimeout(r, 2000));
      break;

    default:
      throw new Error(`Tipe tugas tidak dikenal: ${tugas.type}`);
  }
}

// Loop utama worker
async function startWorker(workerId) {
  console.log(`Worker ${workerId} dimulai`);

  while (!shuttingDown) {
    try {
      // Polling antrean tertunda secara periodik
      await processDelayedQueue();

      // Blocking pop dengan timeout 1 detik
      const hasil = await redis.blpop(WORK_QUEUE, 1);
      if (!hasil) continue;

      const tugasJson = hasil[1];

      // Pindahkan ke list pemrosesan untuk pemulihan crash
      await redis.lpush(PROCESSING_QUEUE, tugasJson);
      const tugas = JSON.parse(tugasJson);
      tugas._workerId = workerId;

      console.log(`Memproses: ${tugas.type} (${tugas.id || 'tanpa-id'})`);

      // Eksekusi dengan konteks retry
      const attempt = tugas._retryAttempt || 1;
      try {
        await executeTask(tugas);
        // Sukses — hapus dari list pemrosesan
        await redis.lrem(PROCESSING_QUEUE, 1, tugasJson);
        // Catat metrik
        await redis.zincrby('metrics:processed', 1, `${tugas.type}`);
      } catch (err) {
        await redis.lrem(PROCESSING_QUEUE, 1, tugasJson);
        await handleFailure(tugasJson, err, attempt);
      }
    } catch (err) {
      console.error('Error worker:', err);
    }
  }

  console.log('Worker dimatikan dengan baik');
  process.exit(0);
}

const workerId = process.argv[2] || `worker-${Date.now()}`;
startWorker(workerId);
```

### producer.js — Mengirim Tugas ke Antrean

```javascript
import { enqueue } from './queue.js';

async function main() {
  const tugas = [
    { id: '1', type: 'kirim_email', to: 'alice@example.com', subject: 'Selamat Datang!' },
    { id: '2', type: 'kirim_email', to: 'bob@example.com', subject: 'Tagihan Anda' },
    { id: '3', type: 'proses_gambar', url: 'https://example.com/foto.jpg' },
    { id: '4', type: 'buat_laporan', reportId: 'RPT-2026-001' },
    { id: '5', type: 'kirim_email', to: 'carol@example.com', subject: 'Newsletter' },
    { id: '6', type: 'tugas_tidak_dikenal', payload: 'akan gagal' },
  ];

  for (const t of tugas) {
    await enqueue(t);
    console.log(`Dimasukkan: ${t.type} (${t.id})`);
  }

  console.log('Semua tugas telah dimasukkan');
  process.exit(0);
}

main();
```

### delayed-worker.js — Penjadwal Tugas Tertunda

```javascript
import Redis from 'ioredis';

const redis = new Redis();

async function scheduleTask(tugas, delayMs) {
  const executeAt = Date.now() + delayMs;
  await redis.zadd('queue:delayed', executeAt, JSON.stringify(tugas));
  console.log(`Menjadwalkan ${tugas.type} dalam ${delayMs}ms (pada ${new Date(executeAt).toISOString()})`);
}

async function main() {
  // Jadwalkan email selamat datang 10 detik dari sekarang
  await scheduleTask(
    { id: 'd1', type: 'kirim_email', to: 'dave@example.com', subject: 'Selamat Datang (tertunda)' },
    10000
  );

  // Jadwalkan laporan 30 detik dari sekarang
  await scheduleTask(
    { id: 'd2', type: 'buat_laporan', reportId: 'RPT-NIGHTLY' },
    30000
  );

  console.log('Tugas tertunda telah dijadwalkan. Jalankan worker.js untuk memprosesnya saat jatuh tempo.');
  process.exit(0);
}

main();
```

### monitor.js — Dashboard Kesehatan Antrean

```javascript
import Redis from 'ioredis';
import { getQueueDepth } from './queue.js';

const redis = new Redis();

async function showMetrics() {
  const depth = await getQueueDepth();
  const processed = await redis.zrange('metrics:processed', -10, -1, 'WITHSCORES');
  const liveWorkers = [];

  const heartbeatKeys = await redis.keys('worker:heartbeat:*');
  for (const key of heartbeatKeys) {
    const ts = await redis.get(key);
    liveWorkers.push({ id: key.replace('worker:heartbeat:', ''), lastSeen: new Date(parseInt(ts, 10)) });
  }

  console.log('\n=== Metrik Antrean ===');
  console.log(`Antrean kerja:   ${depth.tasks}`);
  console.log(`Diproses:        ${depth.processing}`);
  console.log(`Retry:           ${depth.retry}`);
  console.log(`Dead letter:     ${depth.dead}`);
  console.log(`Worker aktif:    ${liveWorkers.length}`);

  if (processed.length > 1) {
    console.log('\nPemrosesan terbaru:');
    for (let i = 0; i < processed.length; i += 2) {
      console.log(`  ${processed[i]}: ${processed[i + 1]}`);
    }
  }

  console.log('====================\n');
}

// Jalankan setiap 5 detik
setInterval(showMetrics, 5000);
showMetrics();
```

### Menjalankan Sistem

```bash
# Install dependensi
npm install ioredis

# Mulai instance Redis (jika belum berjalan)
redis-server --daemonize yes

# Mulai worker (di terminal 1)
node worker.js worker-1

# Masukkan tugas ke antrean (di terminal 2)
node producer.js

# Jadwalkan tugas tertunda (di terminal 2)
node delayed-worker.js

# Pantau kesehatan antrean (di terminal 3)
node monitor.js
```

## Insight Penting

- **Redis lists ideal untuk antrean FIFO karena LPUSH dan BRROP keduanya adalah operasi O(1)**, dan semantik blocking BRPOP menghilangkan busy-waiting. Worker yang menggunakan `blpop(queue, 0)` mengonsumsi hampir nol CPU saat idle.
- **BRPOPLPUSH (atau BLMOVE) sangat penting untuk keandalan** — secara atomik memindahkan tugas ke list pemrosesan, mencegah kehilangan data saat worker crash. Tanpanya, crash antara `blpop` dan eksekusi tugas akan kehilangan tugas secara permanen.
- **Selalu rancang tugas agar idempoten**. Antrean Redis menyediakan pengiriman setidaknya-sekali — sebuah tugas mungkin diproses beberapa kali jika worker crash setelah menyelesaikan pekerjaan tetapi sebelum menghapusnya dari list pemrosesan. Tugas idempoten menghasilkan hasil yang sama terlepas dari berapa kali dieksekusi.
- **Sorted sets memungkinkan eksekusi tertunda yang presisi** dengan biaya polling. Pola smart-poll (memeriksa timestamp tugas paling awal untuk menentukan durasi tidur) meminimalkan pemborosan CPU sambil mempertahankan presisi penjadwalan.
- **Dead-letter queue bukan opsional** — dalam produksi, tugas akhirnya gagal secara permanen. Tanpa DLQ, tugas-tugas tersebut akan berputar dalam retry tanpa batas atau dibuang secara diam-diam. Arahkan semua kegagalan permanen ke list khusus dan beri peringatan pada kedalamannya.
- **Exponential backoff mencegah retry storm** — ketika layanan hilir mengalami degradasi, mencoba ulang segera dengan kecepatan penuh hanya akan memperburuk keadaan. Mengalikan penundaan dengan 2 pada setiap percobaan (1d, 2d, 4d, 8d, 16d) memberi layanan waktu untuk pulih.
- **Antrean Redis mengorbankan throughput untuk kesederhanaan** — mereka tidak memiliki routing, deduplikasi pesan, dan langganan persisten. Untuk beban kerja yang melebihi 10.000 tugas/detik atau memerlukan routing yang kompleks, evaluasi message broker khusus seperti RabbitMQ atau Kafka.

## Langkah Berikutnya

- Jelajahi struktur data Redis Streams untuk messaging persisten berbasis consumer group — dibahas dalam tutorial [Redis Streams Event-Driven Architecture](redis-streams-event-driven-architecture.md).
- Pelajari pola caching Redis dan strategi produksi dalam [Panduan Pola Caching Redis](../guides/redis-caching-patterns-guide.md).
- Pelajari Persistensi dan Ketahanan Data Redis dalam [Panduan Persistensi Redis](../guides/redis-persistence-and-data-durability-guide.md).
- Bangun dashboard analitik real-time lengkap menggunakan pola metrik dan pemantauan dari tutorial ini.

## Kesimpulan

Redis menyediakan fondasi yang sangat mumpuni untuk membangun antrean tugas produksi. Dimulai hanya dengan dua perintah — RPUSH dan BLPOP — Anda dapat mengimplementasikan antrean FIFO yang fungsional. Dengan menambahkan BRPOPLPUSH untuk keandalan, sorted sets untuk eksekusi tertunda, logika retry exponential-backoff, dan dead-letter queue untuk penanganan kegagalan, Anda sampai pada sistem yang memenuhi kebutuhan banyak aplikasi dunia nyata tanpa beban operasional dari message broker khusus.

Trade-off ini disengaja: antrean Redis menawarkan kesederhanaan dan latensi rendah dengan mengorbankan fitur-fitur canggih seperti routing pesan, pengiriman tepat-sekali, dan langganan persisten. Bagi banyak tim — terutama yang sudah menjalankan Redis untuk caching atau penyimpanan sesi — trade-off ini sangat layak dilakukan.

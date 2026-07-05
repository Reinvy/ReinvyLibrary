---
title: "Membangun Arsitektur Microservices dengan PM2"
description: "Sebuah tutorial komprehensif tentang mengelola beberapa layanan microservices Node.js dengan PM2, meliputi file ekosistem multi-aplikasi, pengurutan dependensi layanan, komunikasi antar-proses, dan pemantauan terpusat."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Arsitektur Microservices dengan PM2

## Ringkasan

Aplikasi modern jarang berbentuk monolitik — terdiri dari beberapa layanan: server API, worker latar belakang, gateway WebSocket, pemroses tugas terjadwal, dan lainnya. PM2 unggul tidak hanya dalam mengelola satu proses Node.js tetapi juga dalam mengorkestrasi beberapa layanan dalam satu ekosistem terpadu. Tutorial ini mengajarkan Anda cara mendefinisikan, mengorkestrasi, memantau, dan menerapkan sekelompok layanan mikro Node.js menggunakan satu konfigurasi PM2, meliputi pengurutan dependensi, sinyal antar-proses, agregasi log, penskalaan per-layanan, dan strategi penerapan produksi.

## Target Audiens

- Pengembang backend dan insinyur DevOps yang mengelola arsitektur multi-layanan Node.js.
- Pengembang yang sudah familiar dengan penggunaan dasar PM2 (start, stop, list) yang ingin mengorkestrasi beberapa layanan.
- Tingkat mahir: mengasumsikan pengetahuan kerja tentang dasar-dasar PM2, Node.js, dan Linux.

## Prasyarat

- Node.js 18+ dan npm terinstal.
- PM2 terinstal secara global (`npm install -g pm2`).
- Pengalaman dasar dengan perintah PM2 dan file ekosistem.
- Familiar dengan proses Linux dan sinyal.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mendefinisikan beberapa layanan (server API, worker queue, penjadwal, gateway WebSocket) dalam satu file ekosistem PM2.
- Mengonfigurasi variabel lingkungan khusus layanan, aturan penskalaan, dan kebijakan mulai ulang.
- Mengorkestrasi urutan mulai layanan dengan strategi penantian antar-dependensi.
- Menerapkan penghentian secara graceful di seluruh armada microservices.
- Mengagregasi dan memusatkan log dari semua layanan.
- Menerapkan aplikasi multi-layanan dengan strategi zero-downtime.
- Memantau dan men-debug komunikasi antar-layanan di produksi.

## Konteks dan Motivasi

Sebuah monolit Node.js tipikal berjalan sebagai satu proses — satu `app.js`, satu `pm2 start`, satu baris log `SERVER_READY`. Namun saat aplikasi Anda berkembang, Anda secara alami akan mendekomposisinya menjadi layanan-layanan khusus: API HTTP yang menangani permintaan pengguna, proses worker yang memproses tugas latar belakang, penjadwal cron yang memicu laporan malam hari, dan gateway WebSocket yang mendorong pembaruan waktu nyata ke klien yang terhubung.

Mengelola setiap layanan ini dengan sesi PM2 terpisah, jendela terminal terpisah, atau pipeline CI/CD terpisah menciptakan gesekan operasional. Variabel lingkungan melenceng antar layanan. Log tersebar di berbagai file. Satu layanan mati diam-diam sementara yang lain terus berjalan, menyebabkan korupsi data secara halus. Urutan mulai ulang penting — worker harus terhubung ke kumpulan basis data API, tetapi jika API belum siap, worker akan crash dalam loop startup.

File ekosistem multi-aplikasi PM2 menyelesaikan semua ini. Anda mendefinisikan setiap layanan dalam satu konfigurasi, mengatur dependensinya, mengonfigurasi penskalaan dan kebijakan mulai ulang per-layanan, dan mengorkestrasinya sebagai satu sistem terpadu. Tutorial ini memandu Anda melalui arsitektur multi-layanan yang realistis dan mengajarkan pola-pola yang menjaga microservices tetap berjalan andal di produksi.

## Konten Inti

### 1. Mendesain Arsitektur Multi-Layanan

Pertimbangkan backend e-commerce tipikal yang didekomposisi menjadi empat layanan:

| Layanan | Peran | Port | Instance |
|---------|-------|------|----------|
| `api` | API RESTful HTTP (Express.js) | 3000 | `max` (semua core) |
| `worker` | Pemroses tugas latar belakang (Bull/BullMQ) | — | 2 |
| `scheduler` | Tugas terjadwal berbasis cron | — | 1 |
| `websocket` | Gateway event waktu nyata (Socket.IO) | 4000 | 1 |

Setiap layanan memiliki kebutuhan yang berbeda:
- **API** membutuhkan throughput tinggi dan menggunakan semua core CPU dalam mode cluster.
- **Worker** mengambil tugas dari Redis — dua instance mencegah konflik sambil memaksimalkan throughput.
- **Scheduler** harus berjalan sebagai singleton — instance duplikat akan memicu tugas cron yang sama dua kali.
- **Gateway WebSocket** mengelola status koneksi dalam memori dan harus dimulai ulang secara graceful.

### 2. Mendefinisikan Banyak Aplikasi dalam File Ekosistem

File `ecosystem.config.js` menerima array `apps`, di mana setiap elemen mendefinisikan satu layanan:

```javascript
module.exports = {
  apps: [
    {
      name: 'api',
      script: 'services/api/src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
      },
      max_memory_restart: '500M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
    },
    {
      name: 'worker',
      script: 'services/worker/src/index.js',
      instances: 2,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
        QUEUE_CONCURRENCY: '5',
      },
      max_memory_restart: '300M',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      merge_logs: true,
    },
    {
      name: 'scheduler',
      script: 'services/scheduler/src/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
      },
      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log',
    },
    {
      name: 'websocket',
      script: 'services/websocket/src/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        WS_PORT: 4000,
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
      },
      max_memory_restart: '400M',
      error_file: './logs/websocket-error.log',
      out_file: './logs/websocket-out.log',
    },
  ],
};
```

Mulai semua layanan dengan satu perintah:

```bash
pm2 start ecosystem.config.js
```

### 3. Dependensi Layanan dan Urutan Startup

Ketika layanan saling bergantung, urutan startup sangat penting. Layanan `api` dan `websocket` membutuhkan Redis tersedia sebelum mereka dapat membuat koneksi. Worker membutuhkan basis data siap. PM2 tidak memberlakukan urutan startup secara default — semua layanan mulai bersamaan.

**Opsi A — Health check wait loop**: Setiap layanan menunggu dependensinya dalam kode startupnya sendiri:

```javascript
// services/api/src/server.js
const waitForRedis = async (retries = 10, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const redis = new Redis(process.env.REDIS_URL);
      await redis.ping();
      await redis.quit();
      console.log('[api] Redis is ready');
      return;
    } catch {
      console.log(`[api] Waiting for Redis... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('[api] Redis did not become ready');
};

const start = async () => {
  await waitForRedis();
  const app = express();
  // ... registrasi rute, middleware
  app.listen(process.env.PORT, () => {
    console.log(`[api] Listening on port ${process.env.PORT}`);
  });
};
start();
```

**Opsi B — `wait_ready` dan `listen_timeout` PM2**: PM2 memiliki mekanisme sinyal siap bawaan. Konfigurasikan layanan dependen untuk menunggu notifikasi siap:

```javascript
module.exports = {
  apps: [
    {
      name: 'redis-dependency',
      script: 'services/redis-sidecar/index.js',
      wait_ready: true,
      listen_timeout: 30000,
    },
    {
      name: 'api',
      script: 'services/api/src/server.js',
      wait_ready: true,
      listen_timeout: 30000,
    },
  ],
};
```

Di layanan Anda, kirim sinyal siap setelah inisialisasi:

```javascript
// services/api/src/server.js
const app = express();
await waitForRedis();
app.listen(process.env.PORT, () => {
  console.log('[api] Server started, signaling ready');
  if (process.send) process.send('ready');
});
```

Kemudian mulai layanan dengan:

```bash
pm2 start ecosystem.config.js --only 'redis-dependency'
# Tunggu sinyal siap, lalu:
pm2 start ecosystem.config.js --only 'api'
```

**Opsi C — Dependency gaya systemd (alat eksternal)**: Untuk rantai dependensi yang kompleks, gunakan skrip pembungkus yang mengorkestrasi startup:

```bash
#!/bin/bash
# scripts/start-all.sh
pm2 start ecosystem.config.js --only 'redis-sidecar'
pm2 wait  # Tunggu semua proses yang dimulai siap
pm2 start ecosystem.config.js --only 'api,worker,websocket'
```

### 4. Komunikasi Antar-Layanan dengan Sinyal Proses

Ketika microservices perlu mengomunikasikan peristiwa shutdown atau reload, penerusan sinyal PM2 sangat penting:

```javascript
// services/websocket/src/index.js
const connections = new Set();

process.on('SIGUSR2', () => {
  console.log('[websocket] Received SIGUSR2 — draining connections...');
  for (const socket of connections) {
    socket.emit('server-maintenance');
    socket.disconnect(true);
  }
  connections.clear();
  console.log('[websocket] All connections drained');
});

process.on('SIGTERM', async () => {
  console.log('[websocket] Received SIGTERM — shutting down...');
  // Berhenti menerima koneksi baru
  // Kosongkan koneksi yang ada dengan batas waktu
  const drainTimeout = setTimeout(() => {
    console.log('[websocket] Drain timeout — force exiting');
    process.exit(1);
  }, 30000);
  // Tutup semua soket dengan graceful
  for (const socket of connections) {
    socket.disconnect(true);
  }
  clearTimeout(drainTimeout);
  process.exit(0);
});
```

Kirim sinyal ke layanan tertentu:

```bash
# Muat ulang koneksi WebSocket tanpa memulai ulang layanan lain
pm2 sendSignal SIGUSR2 websocket

# Mulai ulang seluruh sistem secara graceful
pm2 reload ecosystem.config.js
```

### 5. Strategi Mulai Ulang Per-Layanan

Layanan yang berbeda membutuhkan perilaku mulai ulang yang berbeda:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    // API: restart selamanya, tetapi dengan backoff
    {
      name: 'api',
      script: 'services/api/src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      exp_backoff_restart_delay: 100,
      // Exponential backoff: 100ms, 200ms, 400ms, ... hingga 30s
    },
    // Worker: berhenti setelah 5 crash — perlu intervensi manual
    {
      name: 'worker',
      script: 'services/worker/src/index.js',
      instances: 2,
      max_restarts: 5,
      min_uptime: '5s',
      restart_delay: 10000,
    },
    // Scheduler: auto-restart dengan penundaan tetap 30s
    {
      name: 'scheduler',
      script: 'services/scheduler/src/index.js',
      instances: 1,
      max_restarts: 3,
      restart_delay: 30000,
    },
    // WebSocket: selalu restart segera
    {
      name: 'websocket',
      script: 'services/websocket/src/index.js',
      instances: 1,
      max_restarts: 0, // 0 berarti tidak terbatas
    },
  ],
};
```

| Strategi | Kapan Digunakan |
|----------|-----------------|
| Restart tak terbatas (`max_restarts: 0`) | Layanan kritis yang harus selalu berjalan |
| Terbatas dengan backoff | Layanan dengan dependensi sementara (database, Redis) |
| Terbatas dengan penundaan tetap | Tugas terjadwal yang tidak kritis |
| Berhenti setelah N crash | Layanan yang membutuhkan investigasi manual setelah kegagalan berulang |

### 6. Agregasi Log di Seluruh Layanan

Dengan banyak layanan, file log yang tersebar menjadi tidak terkelola. Pusatkan mereka:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    // Setiap layanan menulis ke direktori yang sama
    {
      name: 'api',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    // ... ulangi untuk setiap layanan
  ],
};
```

Gunakan plugin rotasi log PM2 untuk semua layanan:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

Lihat log dari semua layanan dengan satu perintah:

```bash
# Semua layanan, streaming
pm2 logs

# Hanya layanan tertentu
pm2 logs api worker

# 100 baris terakhir dari layanan tertentu
pm2 logs websocket --lines 100

# Log berformat JSON untuk konsumsi programatik
pm2 logs --json --lines 50 > /tmp/recent-logs.json
```

Untuk manajemen log terpusat di produksi, teruskan log PM2 ke sistem eksternal. Setiap layanan dapat menulis JSON terstruktur yang dikirim oleh pengirim log (Filebeat, Fluentd) ke Elasticsearch atau Loki:

```javascript
// services/api/src/logger.js
const log = (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    service: 'api',
    level,
    message,
    ...meta,
  };
  // PM2 menangkap stdout untuk out_file
  process.stdout.write(JSON.stringify(entry) + '\n');
};

log('info', 'Server started', { port: process.env.PORT, instances: 'max' });
```

### 7. Deployment Multi-Layanan Zero-Downtime

Saat menerapkan pembaruan di beberapa microservices, urutannya penting. Pendekatan standarnya adalah:

1. **Worker pertama** — penangan tugas yang diperbarui dapat memproses tugas baru sementara instance API lama masih berjalan.
2. **API berikutnya** — muat ulang bergulir di seluruh instance API (zero downtime).
3. **WebSocket terakhir** — pengosongan koneksi memastikan klien terhubung kembali ke gateway yang diperbarui.

Terapkan ini dengan skrip deployment:

```bash
#!/bin/bash
# scripts/deploy.sh
set -e

echo "Mengambil kode terbaru..."
git pull origin main
npm install --production

echo "Membangun ulang layanan..."
npm run build

echo "Memuat ulang worker (penangan tugas)..."
pm2 reload worker --update-env
sleep 5

echo "Memuat ulang API (bergulir, zero-downtime)..."
pm2 reload api --update-env
sleep 10

echo "Memuat ulang WebSocket (pengosongan koneksi)..."
pm2 sendSignal SIGUSR2 websocket
sleep 3
pm2 reload websocket --update-env

echo "Memuat ulang scheduler..."
pm2 reload scheduler --update-env

echo "Deployment selesai."
pm2 status
```

Untuk zero-downtime sejati dengan mode cluster, `pm2 reload` melakukan restart bergulir — memulai ulang worker satu per satu sambil menjaga sisanya tetap melayani lalu lintas:

```bash
pm2 reload api --update-env
# PM2: [api] [worker:1] reloading...
# PM2: [api] [worker:1] reloaded (waiting for ready signal)
# PM2: [api] [worker:2] reloading...
# PM2: [api] [worker:2] reloaded (waiting for ready signal)
```

### 8. Memantau Armada Multi-Layanan

Pantau semua layanan sekilas:

```bash
pm2 status
# ┌──────────────┬────┬─────────┬──────┬─────────┬─────────┬──────────┐
# │ App name     │ id │ mode    │ pid  │ status  │ restart │ uptime   │
# ├──────────────┼───┼──────────┼──────┼─────────┼─────────┼──────────┤
# │ api          │ 0  │ cluster │ 1234 │ online  │ 0       │ 2h       │
# │ api          │ 1  │ cluster │ 1235 │ online  │ 0       │ 2h       │
# │ worker       │ 2  │ fork    │ 1236 │ online  │ 1       │ 1h       │
# │ worker       │ 3  │ fork    │ 1237 │ online  │ 0       │ 1h       │
# │ scheduler    │ 4  │ fork    │ 1238 │ online  │ 0       │ 30m      │
# │ websocket    │ 5  │ fork    │ 1239 │ online  │ 2       │ 45m      │
# └──────────────┴───┴──────────┴──────┴─────────┴─────────┴──────────┘
```

Periksa layanan individual:

```bash
pm2 show api
pm2 show worker
```

Gunakan `pm2 monit` untuk penggunaan sumber daya waktu nyata di semua layanan — menampilkan dasbor langsung CPU dan memori per proses, dikelompokkan berdasarkan nama layanan.

Untuk observabilitas produksi, sediakan endpoint kesehatan di setiap layanan yang dapat dipoll oleh PM2:

```javascript
// services/api/src/health.js
const checkHealth = async () => {
  const checks = {
    redis: await pingRedis(),
    database: await pingDatabase(),
    uptime: process.uptime(),
  };
  const healthy = Object.values(checks).every(Boolean);
  return { status: healthy ? 'ok' : 'degraded', checks };
};
```

## Contoh Kode

### Struktur Proyek Microservices Lengkap

```text
project/
├── ecosystem.config.js
├── services/
│   ├── api/
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── health.js
│   │   └── package.json
│   ├── worker/
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   └── jobs/
│   │   └── package.json
│   ├── scheduler/
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   └── tasks/
│   │   └── package.json
│   └── websocket/
│       ├── src/
│       │   ├── index.js
│       │   └── handlers/
│       └── package.json
├── scripts/
│   ├── deploy.sh
│   └── start-all.sh
└── logs/
```

### File Ekosistem Lengkap dengan Semua Fitur

```javascript
// ecosystem.config.js
const commonConfig = {
  env: {
    NODE_ENV: 'production',
    REDIS_URL: 'redis://localhost:6379',
  },
  error_file: './logs/err.log',
  out_file: './logs/out.log',
  merge_logs: true,
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
};

module.exports = {
  apps: [
    {
      ...commonConfig,
      name: 'api',
      script: 'services/api/src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      env: {
        PORT: 3000,
      },
    },
    {
      ...commonConfig,
      name: 'worker',
      script: 'services/worker/src/index.js',
      instances: 2,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      max_restarts: 5,
      restart_delay: 10000,
      env: {
        QUEUE_CONCURRENCY: '5',
      },
    },
    {
      ...commonConfig,
      name: 'scheduler',
      script: 'services/scheduler/src/index.js',
      instances: 1,
      exec_mode: 'fork',
      max_restarts: 3,
      restart_delay: 30000,
    },
    {
      ...commonConfig,
      name: 'websocket',
      script: 'services/websocket/src/index.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      max_restarts: 0,
      env: {
        WS_PORT: 4000,
      },
    },
  ],
};
```

### Integrasi Health Check

```javascript
// services/api/src/server.js
const express = require('express');
const Redis = require('ioredis');

const app = express();

async function checkDependencies() {
  const redis = new Redis(process.env.REDIS_URL);
  try {
    await redis.ping();
    await redis.quit();
    return { redis: true };
  } catch {
    return { redis: false };
  }
}

app.get('/health', async (req, res) => {
  const checks = await checkDependencies();
  const isHealthy = Object.values(checks).every(Boolean);
  res.status(isHealthy ? 200 : 503).json({
    service: 'api',
    status: isHealthy ? 'healthy' : 'degraded',
    checks,
    uptime: process.uptime(),
  });
});

async function waitForRedis() {
  const redis = new Redis(process.env.REDIS_URL);
  for (let i = 0; i < 10; i++) {
    try {
      await redis.ping();
      await redis.quit();
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Redis unavailable');
}

async function start() {
  await waitForRedis();
  app.listen(process.env.PORT, () => {
    console.log(`[api] Listening on port ${process.env.PORT}`);
    if (process.send) process.send('ready');
  });
}

start().catch(err => {
  console.error('[api] Failed to start:', err);
  process.exit(1);
});
```

## Insight Penting

- **Gunakan satu file ekosistem untuk mengatur semuanya**: Mendefinisikan semua layanan dalam satu `ecosystem.config.js` menghilangkan penyimpangan konfigurasi dan membuat arsitektur microservices Anda dapat direproduksi di berbagai lingkungan.
- **Sesuaikan strategi restart dengan kritikalitas layanan**: Layanan kritis (gateway API, WebSocket) harus restart tanpa batas, sementara proses worker harus terdegradasi secara graceful setelah kegagalan berulang untuk mencegah korupsi tugas.
- **Sinyal siap mencegah kegagalan berantai**: Gunakan `wait_ready` dan `process.send('ready')` untuk memastikan layanan dimulai hanya setelah dependensinya melaporkan siap.
- **Agregasi log bersifat non-negotiable**: Dengan beberapa layanan, file log per-proses menjadi tidak terkelola. Pusatkan dengan `merge_logs: true`, output JSON terstruktur, dan pengirim log untuk produksi.
- **Restart bergulir menjaga sistem tetap online**: `pm2 reload` memulai ulang worker cluster satu per satu, menjaga layanan tetap tersedia selama deployment. Gabungkan dengan graceful shutdown untuk pembaruan zero-downtime yang sesungguhnya.
- **Pengosongan koneksi berbasis sinyal melindungi pengguna**: Gunakan `SIGUSR2` atau sinyal kustom untuk mengosongkan koneksi WebSocket aktif atau tugas yang sedang berlangsung sebelum memulai ulang, mencegah kehilangan data.

## Langkah Berikutnya

- Jelajahi API programatik PM2 untuk menyematkan manajemen proses ke dalam alat Anda sendiri: `pm2.connect()`, `pm2.start()`, `pm2.list()`.
- Siapkan PM2 Plus (sebelumnya Keymetrics) untuk pemantauan terpusat di beberapa server dan layanan.
- Pelajari tentang PM2 di lingkungan kontainer — menjalankan PM2 di dalam Docker dan mengintegrasikannya dengan Kubernetes untuk orkestrasi hibrida.

## Kesimpulan

PM2 bertransformasi dari manajer proses satu-proses menjadi orkestrator microservices yang kuat saat Anda memanfaatkan kemampuan file ekosistem multi-aplikasi. Dengan mendefinisikan semua layanan dalam satu konfigurasi, mengatur strategi restart per-layanan, menerapkan pengurutan startup yang sadar dependensi, dan memusatkan log serta pemantauan, Anda dapat mengelola arsitektur microservices lengkap dengan kesederhanaan yang sama yang dibawa PM2 ke manajemen satu proses. Pola-pola dalam tutorial ini — health check loop, sinyal siap, pengosongan koneksi berbasis sinyal, deployment bergulir — berskala dari backend dua-layanan hingga armada produksi penuh.

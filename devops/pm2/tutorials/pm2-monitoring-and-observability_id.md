---
title: "Monitoring dan Observabilitas Aplikasi dengan PM2"
description: "Tutorial komprehensif tentang monitoring aplikasi Node.js yang dikelola oleh PM2, mencakup alat CLI bawaan, API metrik kustom, integrasi monitoring eksternal, agregasi log, alerting, dan praktik terbaik observabilitas produksi."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Monitoring dan Observabilitas Aplikasi dengan PM2

## Ringkasan

Menjalankan aplikasi Node.js di produksi dengan PM2 hanyalah setengah dari perjuangan — memahami bagaimana aplikasi tersebut berperilaku di bawah beban, mendeteksi anomali sebelum menjadi kegagalan, dan menjaga visibilitas ke dalam kesehatan proses adalah yang membedakan deployment yang andal dari yang rapuh. PM2 menyediakan ekosistem monitoring yang kaya: dari dashboard CLI interaktif `pm2 monit` dan API metrik bawaan hingga integrasi yang mulus dengan platform observabilitas eksternal seperti Prometheus, Grafana, dan PM2 Plus (sebelumnya Keymetrics). Tutorial ini mencakup setiap lapisan observabilitas PM2 — pemeriksaan kesehatan tingkat proses, pengumpulan metrik waktu nyata, metrik aplikasi kustom, strategi agregasi log, alerting, dan integrasi dengan tumpukan monitoring modern — sehingga Anda dapat membangun pipeline observabilitas tingkat produksi di sekitar aplikasi yang dikelola PM2.

## Target Audiens

- Pengembang backend dan teknisi DevOps yang menjalankan aplikasi Node.js dengan PM2 di lingkungan produksi atau staging.
- Pengembang yang sudah mengetahui perintah PM2 dasar (`pm2 start`, `pm2 list`, `pm2 logs`) dan ingin menambahkan monitoring serta alerting yang kuat.
- Tingkat menengah hingga mahir: diasumsikan memiliki pemahaman tentang Node.js, dasar-dasar PM2, dan manajemen proses Linux.

## Prasyarat

- Node.js 16+ dan npm terinstal.
- PM2 terinstal secara global (`npm install -g pm2`).
- Aplikasi yang dikelola PM2 yang sedang berjalan (atau kesediaan untuk membuat aplikasi sampel untuk pengujian).
- Pemahaman dasar tentang baris perintah Linux, JSON, dan konsep HTTP.
- Untuk bagian Prometheus/Grafana: Docker dan Docker Compose terinstal (opsional tetapi direkomendasikan).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menginterpretasikan dashboard status proses PM2 dan mendiagnosis masalah umum menggunakan `pm2 monit`, `pm2 show`, dan `pm2 status`.
- Menginstrumentasi aplikasi Node.js Anda dengan API metrik kustom PM2 untuk mengekspos KPI yang relevan dengan bisnis.
- Menyiapkan PM2 Plus (Keymetrics) untuk monitoring waktu nyata berbasis cloud, alerting, dan analisis tren historis.
- Mengonfigurasi pengumpulan metrik Prometheus dari proses yang dikelola PM2 dan memvisualisasikannya di Grafana.
- Mengimplementasikan agregasi log terstruktur dan memusatkan log dari beberapa proses PM2.
- Mengonfigurasi aturan alerting untuk crash proses, kebocoran memori, dan perilaku abnormal.
- Membangun pipeline observabilitas produksi yang lengkap menggunakan alat bawaan dan eksternal PM2.

## Konteks dan Motivasi

### Mengapa Monitoring Penting di Luar Pemeriksaan Kesehatan Dasar

Fitur PM2 yang paling terlihat adalah menjaga proses tetap hidup — jika terjadi crash, PM2 secara otomatis memulai ulang. Namun, proses yang terus-menerus restart (proses "flapping") mungkin tidak terdeteksi sampai pengguna mengeluh. Kebocoran memori terakumulasi secara bertahap: kebocoran 50 MB mungkin membutuhkan waktu berhari-hari untuk memicu pembunuhan OOM. Latensi permintaan dapat menurun secara perlahan seiring terisinya kumpulan koneksi. Tanpa monitoring, degradasi diam-diam ini menjadi insiden produksi.

### Tiga Pilar Observabilitas PM2

Fitur observabilitas PM2 mencakup tiga lapisan:

1. **Monitoring CLI bawaan** — `pm2 monit`, `pm2 show`, `pm2 status` menyediakan snapshot CPU, memori, loop delay, dan status proses secara real-time langsung di terminal. Tidak diperlukan konfigurasi.
2. **Metrik aplikasi kustom** — API metrik PM2 memungkinkan Anda menginstrumentasi kode untuk mengekspos metrik bisnis (tingkat permintaan, tingkat kesalahan, kedalaman antrean, ukuran pool database) di samping metrik sistem.
3. **Integrasi eksternal** — PM2 Plus menyediakan dashboard hosted dengan grafik historis dan alerting. Untuk pengaturan mandiri, endpoint metrik PM2 terintegrasi dengan Prometheus, dan log terstruktur dapat diumpankan ke Elasticsearch, Loki, atau platform agregasi log lainnya.

### Apa yang Dibangun dalam Tutorial Ini

Pada akhirnya, Anda akan memiliki tumpukan observabilitas yang berfungsi:

```text
┌──────────────────────┐      ┌──────────────────┐
│  Proses PM2           │──────▶  pm2 monit (CLI) │
│  (Aplikasi Node.js)   │      └──────────────────┘
│                       │──────▶  PM2 Plus (Cloud)│
│  Metrik Kustom:       │      └──────────────────┘
│  - Tingkat req HTTP   │──────▶  Prometheus ──▶ Grafana
│  - Tingkat error      │      └──────────────────────┘
│  - Ukuran pool DB     │──────▶  Agregasi Log
│  - Kedalaman antrean  │      (Loki / ELK / File)
└──────────────────────┘      └──────────────────────┘
```

## Konten Inti

### Memahami Perintah Monitoring Bawaan PM2

PM2 dilengkapi dengan beberapa perintah CLI yang memberikan visibilitas langsung ke kesehatan proses tanpa alat tambahan.

#### `pm2 status` (atau `pm2 list`)

Perintah paling dasar yang menunjukkan ID proses, nama, mode (fork vs cluster), status, penggunaan CPU, dan penggunaan memori:

```text
┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┐
│ id  │ name         │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │
├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┤
│ 0   │ api-server   │ default     │ 1.0.0   │ cluster │ 12345    │ 2D     │ 0    │ online    │
│ 1   │ worker       │ default     │ 1.0.0   │ fork    │ 12346    │ 2D     │ 1    │ online    │
│ 2   │ scheduler    │ default     │ 1.0.0   │ fork    │ 12347    │ 1D     │ 3    │ online    │
└─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┘
```

Indikator kunci yang perlu diperhatikan:

- **Status**: `online` adalah normal. `stopped`, `errored`, atau `launching` menandakan masalah.
- **↺ (jumlah restart)**: Jumlah restart yang tinggi menandakan proses sering crash. Selidiki log dengan `pm2 logs <name> --lines 50`.
- **Uptime**: Jika uptime sering diatur ulang (sementara jumlah restart meningkat), proses sedang flapping.
- **Memory**: Bandingkan memori antar instance. Instance yang mengonsumsi memori jauh lebih banyak daripada yang lain dapat mengindikasikan kebocoran.

#### `pm2 show <name>`

Menampilkan metadata dan metrik terperinci untuk satu proses:

```text
 Describing process with id 0 - name api-server
┌───────────────────┬───────────────────┐
│ status            │ online            │
│ name              │ api-server        │
│ version           │ 1.0.0             │
│ restarts          │ 0                 │
│ uptime            │ 2D                │
│ script path       │ /app/dist/server  │
│ script args       │ N/A               │
│ error log path    │ /var/log/pm2/err  │
│ out log path      │ /var/log/pm2/out  │
│ pid path          │ /var/run/pm2/pid  │
│ interpreter       │ node              │
│ interpreter args  │ N/A               │
│ script id         │ 0                 │
│ exec mode         │ cluster_mode      │
│ node.js version   │ 20.11.0           │
│ watch & reload    │ ✘                 │
│ unstable restarts │ 0                 │
│ created at        │ 2026-07-12T10:00  │
└───────────────────┴───────────────────┘
```

Perhatikan **unstable restarts** — penghitung ini bertambah ketika proses crash lebih dari 15 kali dalam jendela 30 detik. PM2 memasuki status "errored" dan berhenti restart otomatis jika unstable restarts melebihi ambang yang dikonfigurasi.

#### `pm2 describe <id>`

Mirip dengan `pm2 show` tetapi mengembalikan output JSON yang dapat diurai mesin, berguna untuk pembuatan skrip pemeriksaan monitoring:

```bash
pm2 describe 0 --json | jq '.monit'
```

#### `pm2 prettylist`

Mengeluarkan seluruh status daemon PM2 sebagai JSON yang diformat. Ini adalah sumber data terkaya untuk skrip monitoring eksternal:

```bash
pm2 prettylist | jq '.[0] | {name: .name, pid: .pid, monit: .pm2_env.monit, unstable_restarts: .pm2_env.unstable_restarts}'
```

### Dashboard Interaktif: `pm2 monit`

Perintah `pm2 monit` membuka dashboard terminal real-time yang diperbarui setiap detik. Ini menampilkan:

- **Bagian atas**: Semua proses dengan CPU dan memori real-time.
- **Bagian bawah** (proses yang dipilih): Tampilan terperinci yang menunjukkan:
  - Penggunaan CPU (persentase)
  - Penggunaan memori (absolut dan heap proses)
  - **Loop delay** (kelambatan event loop dalam milidetik) — penting untuk mendeteksi event loop yang terblokir
  - **Active handles** dan **active requests** (penghitung internal libuv)

```text
 PM2 Monitoring (tekan Ctrl+C untuk keluar)

 ┌─ Process List ─────────────────────────────────────────────────────┐
 │[0] api-server     MEM: 45.3 MB    CPU: 2.1%    loop: 1.23ms      │
 │[1] worker         MEM: 28.7 MB    CPU: 0.5%    loop: 0.89ms      │
 │[2] scheduler      MEM: 12.1 MB    CPU: 0.1%    loop: 0.45ms      │
 └───────────────────────────────────────────────────────────────────┘

 ┌─ Detail api-server ───────────────────────────────────────────────┐
 │ ● Loop delay        : 1.23 ms                                      │
 │ ● Active handles    : 12                                            │
 │ ● Active requests   : 3                                             │
 │ ● Heap Size         : 32.1 MB / 64.0 MB                             │
 │ ● Heap Usage        : 50.2%                                         │
 │ ● Used Heap Size    : 32.1 MB                                       │
 │ ● Event Loop Lag    : 0.23 ms avg, 2.15 ms max                      │
 │ ● CPU               : 2.1%                                          │
 │ ● Memory            : 45.3 MB                                       │
 └────────────────────────────────────────────────────────────────────┘
```

**Loop delay** adalah salah satu metrik paling berharga di `pm2 monit`. Loop delay yang secara konsisten di atas 100 ms mengindikasikan operasi pemblokiran sinkron (komputasi berat, I/O sinkron, atau rantai Promise dalam) yang menurunkan throughput. Ketika loop delay melonjak hingga detik, aplikasi pada dasarnya tidak responsif.

### Metrik Tingkat Aplikasi dengan API Metrik PM2

PM2 menyediakan API metrik programatis (`@pm2/io`) yang memungkinkan Anda menginstrumentasi aplikasi dengan metrik kustom. Metrik ini muncul di `pm2 monit`, PM2 Plus, dan scraper yang kompatibel dengan Prometheus.

#### Instalasi dan Konfigurasi

```bash
npm install @pm2/io
```

Buat modul metrik di aplikasi Anda:

```javascript
// metrics.js
const io = require('@pm2/io');

// Gauge: nilai yang dapat naik atau turun (tingkat permintaan saat ini, memori, dll.)
const httpRequestRate = io.metric({
  name: 'HTTP Request Rate',
  type: 'gauge', // 'gauge' | 'counter' | 'meter' | 'histogram'
});

// Counter: nilai yang hanya meningkat (total permintaan, kesalahan, dll.)
const totalRequests = io.counter({
  name: 'Total Requests',
});

// Meter: tingkat kejadian per detik
const errorRate = io.meter({
  name: 'Error Rate',
  samples: 60, // menyimpan 60 sampel untuk rata-rata bergerak
});

// Histogram: distribusi statistik nilai (persentil latensi)
const requestLatency = io.histogram({
  name: 'Request Latency (ms)',
  measurement: 'mean', // 'mean' | 'min' | 'max' | 'stddev' | 'count'
});

module.exports = { httpRequestRate, totalRequests, errorRate, requestLatency };
```

#### Mengintegrasikan Metrik ke dalam Aplikasi Express

```javascript
// server.js
const express = require('express');
const metrics = require('./metrics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: melacak tingkat permintaan dan latensi
app.use((req, res, next) => {
  const start = Date.now();
  metrics.totalRequests.inc(); // increment penghitung total

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.requestLatency.update(duration); // merekam latensi

    // Memperbarui gauge tingkat permintaan berdasarkan jendela geser
    // (pendekatan sederhana — diperbarui setiap permintaan)
    metrics.httpRequestRate.set(Math.round(1000 / duration));

    if (res.statusCode >= 400) {
      metrics.errorRate.mark(); // menandai kejadian error
    }
  });

  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/users', async (req, res) => {
  // Simulasi kueri database
  await new Promise(r => setTimeout(r, Math.random() * 50));
  res.json([{ id: 1, name: 'Alice' }]);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

#### Menjalankan dengan PM2

```bash
pm2 start server.js --name api-server -i 2
```

Setelah dijalankan, jalankan `pm2 monit` dan Anda akan melihat metrik kustom muncul di bagian terpisah di bawah detail proses:

```text
 ┌─ Custom Metrics ───────────────────────────────────────────────────┐
 │ ● HTTP Request Rate  : 12 req/s                                    │
 │ ● Total Requests      : 45,892                                      │
 │ ● Error Rate          : 0.23 events/s                               │
 │ ● Request Latency (ms): mean: 23.4  min: 2.1  max: 145.2           │
 └────────────────────────────────────────────────────────────────────┘
```

#### Pola Metrik Kustom Tingkat Lanjut

**Melacak Penggunaan Pool Koneksi Database**

```javascript
// database-pool-metric.js
const io = require('@pm2/io');

class PoolMonitor {
  constructor(pool) {
    this.pool = pool;
    this.activeConnections = io.metric({
      name: 'DB Active Connections',
    });
    this.idleConnections = io.metric({
      name: 'DB Idle Connections',
    });
    this.pendingRequests = io.metric({
      name: 'DB Pending Requests',
    });

    // Poll setiap 5 detik
    this.interval = setInterval(() => this.refresh(), 5000);
  }

  refresh() {
    this.activeConnections.set(this.pool.totalCount - this.pool.idleCount);
    this.idleConnections.set(this.pool.idleCount);
    this.pendingRequests.set(this.pool.waitingRequestsCount);
  }

  stop() {
    clearInterval(this.interval);
  }
}

module.exports = PoolMonitor;
```

**Melacak Kedalaman Antrean (Bull/BullMQ)**

```javascript
// queue-metric.js
const io = require('@pm2/io');
const Queue = require('bull');

const taskQueue = new Queue('task-processing', 'redis://localhost:6379');

const queueDepth = io.metric({
  name: 'Task Queue Depth',
});

const queueLatency = io.histogram({
  name: 'Queue Processing Latency (ms)',
  measurement: 'mean',
});

// Poll kedalaman antrean setiap 10 detik
setInterval(async () => {
  const count = await taskQueue.getWaitingCount();
  queueDepth.set(count);
}, 10000);

// Melacak latensi per-job
taskQueue.process(async (job) => {
  const start = Date.now();
  // ... proses job ...
  queueLatency.update(Date.now() - start);
});
```

### Pelacakan Konfigurasi dengan Metrik Runtime

PM2 secara otomatis mengumpulkan metrik runtime — latensi event loop, statistik garbage collection, dan pelacakan HTTP — ketika `@pm2/io` diinisialisasi. Ini memberikan visibilitas mendalam ke dalam runtime Node.js itu sendiri.

#### Monitoring Event Loop

```javascript
const io = require('@pm2/io');

// PM2 secara otomatis melacak metrik event loop
// Akses melalui io.loopMetrics
const loopHistogram = io.histogram({
  name: 'Event Loop Delay (ms)',
  measurement: 'p95',
});

// Periksa kesehatan event loop secara periodik
setInterval(() => {
  const delay = io.loopMetrics?.delay();
  if (delay) {
    loopHistogram.update(delay);
    if (delay > 100) {
      console.warn(`PERINGATAN: Event loop terblokir selama ${delay}ms`);
    }
  }
}, 1000);
```

#### Metrik Garbage Collection

```javascript
// Pelacakan garbage collection (Node.js 20+ dengan --expose-gc)
const io = require('@pm2/io');

if (global.gc) {
  const gcDuration = io.histogram({
    name: 'GC Pause Duration (ms)',
    measurement: 'max',
  });

  const gcFrequency = io.meter({
    name: 'GC Frequency',
    samples: 60,
  });

  // Monkey-patch gc untuk melacak panggilan (disederhanakan — gunakan perf_hooks di produksi)
  const originalGc = global.gc;
  global.gc = function() {
    const start = Date.now();
    originalGc.call(global);
    gcDuration.update(Date.now() - start);
    gcFrequency.mark();
  };
}
```

### Integrasi Monitoring Eksternal: PM2 Plus

PM2 Plus (sebelumnya Keymetrics) adalah platform monitoring SaaS resmi untuk PM2. Ini menyediakan:

- Dashboard real-time dengan data historis (CPU, memori, loop delay).
- Grafik metrik kustom dengan rentang waktu yang dapat dikonfigurasi.
- Aturan alerting yang dipicu oleh ambang metrik atau kejadian proses.
- Kolaborasi tim dengan dashboard bersama dan saluran notifikasi.
- Integrasi dengan Slack, PagerDuty, email, dan webhook.

#### Konfigurasi

```bash
# Install modul PM2 Plus
pm2 install pm2-server-monit

# Tautkan instance PM2 Anda ke PM2 Plus
pm2 link <secret-key> <public-key> <machine-name>
```

Kunci secret dan public tersedia dari dashboard PM2 Plus setelah membuat akun di `https://app.pm2.io/`.

#### Mengonfigurasi Alerting

Setelah terhubung, Anda dapat mengatur alerting dari antarmuka web PM2 Plus:

| Tipe Alert | Ambang | Contoh Kasus Penggunaan |
|---|---|---|
| Penggunaan memori | `> 512 MB` | Mendeteksi kebocoran memori |
| Penggunaan CPU | `> 80% selama 5 menit` | Perencanaan kapasitas |
| Loop delay | `> 500 ms` | Event loop terblokir |
| Jumlah restart | `> 5 dalam 10 menit` | Proses flapping |
| Metrik kustom | Error Rate > 10/menit | Lonjakan error aplikasi |

### Monitoring Mandiri: Prometheus + Grafana

Untuk tim yang memerlukan monitoring mandiri (lingkungan terisolasi, persyaratan kedaulatan data, atau optimalisasi biaya), PM2 dapat mengekspos metrik dalam format Prometheus melalui endpoint metrik `@pm2/io`.

#### Langkah 1: Ekspos Endpoint Metrik

```javascript
// metrics-server.js — Server HTTP metrik mandiri
const io = require('@pm2/io');
const http = require('http');

// Format eksportir Prometheus bawaan PM2
const server = http.createServer((req, res) => {
  if (req.url === '/metrics') {
    const metrics = io.getMetrics(); // mengembalikan array objek metrik
    const prometheusOutput = metrics.map(m => formatPrometheus(m)).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(prometheusOutput);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

function formatPrometheus(metric) {
  // Mengonversi metrik PM2 ke format teks Prometheus
  const name = metric.name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_');

  const lines = [`# HELP pm2_${name} ${metric.name}`, `# TYPE pm2_${name} gauge`];

  if (typeof metric.value === 'object') {
    // Metrik histogram memiliki beberapa nilai
    for (const [key, val] of Object.entries(metric.value)) {
      lines.push(`pm2_${name}{quantile="${key}"} ${val}`);
    }
  } else {
    lines.push(`pm2_${name} ${metric.value}`);
  }

  return lines.join('\n');
}

const PORT = 9095;
server.listen(PORT, () => {
  console.log(`Metrics server listening on http://localhost:${PORT}/metrics`);
});
```

Jalankan sebagai proses PM2 terpisah:

```bash
pm2 start metrics-server.js --name metrics-exporter --no-autorestart
```

#### Langkah 2: Konfigurasi Scrape Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'pm2-apps'
    static_configs:
      - targets: ['localhost:9095']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

#### Langkah 3: Dashboard Grafana

Buat dashboard Grafana dengan panel untuk:

- **CPU dan Memori** per proses (time series, satu garis per nama proses).
- **Event Loop Delay** (heatmap atau time series dengan garis ambang peringatan di 100ms).
- **Metrik kustom** (tingkat permintaan, tingkat error, kedalaman antrean).
- **Kejadian restart** (anotasi pada garis waktu ketika proses restart).

### Agregasi Log dan Logging Terpusat

PM2 mengelola file log untuk setiap proses. Di produksi, Anda memerlukan agregasi log terpusat untuk mencari, memfilter, dan memberi alert di semua proses dan host.

#### Konfigurasi Log PM2

Konfigurasikan perilaku log di file ecosystem Anda:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      error_file: '/var/log/pm2/api-error.log',   // output stderr
      out_file: '/var/log/pm2/api-out.log',         // output stdout
      merge_logs: true,                              // menggabungkan semua instance
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',     // timestamp ISO
      log_type: 'json',                              // log JSON terstruktur
    },
  ],
};
```

#### Logging JSON Terstruktur

Untuk agregasi log yang efektif, keluarkan log sebagai JSON terstruktur daripada teks bebas:

```javascript
// logger.js — Logger JSON terstruktur
function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    pid: process.pid,
    app: process.env.name || 'unknown',
    ...meta,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

module.exports = { log };
```

Penggunaan:

```javascript
const logger = require('./logger');

logger.log('info', 'Server started', { port: 3000 });
logger.log('error', 'Database connection failed', { error: err.message, retry: 3 });
```

Ketika `log_type: 'json'` diatur di file ecosystem, PM2 menambahkan setiap objek JSON pada barisnya sendiri, membuatnya langsung dapat dicerna oleh pengirim log seperti Filebeat, Promtail, atau Fluentd.

#### Mengirim Log ke Loki (Grafana Stack)

```yaml
# promtail-config.yml
scrape_configs:
  - job_name: pm2
    static_configs:
      - targets: ['localhost']
        labels:
          job: pm2
          __path__: /var/log/pm2/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
            pid: pid
            app: app
      - labels:
          level: level
          app: app
      - timestamp:
          source: timestamp
          format: RFC3339
```

### Alerting dan Remediasi Otomatis

Di luar alerting PM2 Plus, Anda dapat membangun pipeline alerting Anda sendiri menggunakan API PM2 dan layanan eksternal.

#### Pemeriksaan Kesehatan Programatis dengan Alert Slack

```javascript
// health-monitor.js
const pm2 = require('pm2');
const https = require('https');

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const CHECK_INTERVAL = 30_000; // 30 detik
const MEMORY_THRESHOLD_MB = 500;
const LOOP_DELAY_THRESHOLD_MS = 200;

function sendSlackAlert(message) {
  if (!SLACK_WEBHOOK_URL) return;
  const data = JSON.stringify({ text: `🚨 PM2 Alert: ${message}` });
  const url = new URL(SLACK_WEBHOOK_URL);
  const req = https.request({ hostname: url.hostname, path: url.pathname, method: 'POST' });
  req.write(data);
  req.end();
}

function checkProcesses() {
  pm2.list((err, processes) => {
    if (err) {
      console.error('Failed to list PM2 processes:', err);
      return;
    }

    processes.forEach(proc => {
      const monit = proc.pm2_env.monit || {};
      const memoryMB = Math.round(monit.memory / 1024 / 1024);

      // Periksa penggunaan memori tinggi
      if (memoryMB > MEMORY_THRESHOLD_MB) {
        sendSlackAlert(
          `*${proc.name}* memori di ${memoryMB} MB (ambang: ${MEMORY_THRESHOLD_MB} MB)`
        );
      }

      // Periksa unstable restarts
      if (proc.pm2_env.unstable_restarts > 3) {
        sendSlackAlert(
          `*${proc.name}* memiliki ${proc.pm2_env.unstable_restarts} unstable restarts`
        );
      }

      // Periksa loop delay melalui data pm2 monit
      const loopDelay = monit.loop_delay || 0;
      if (loopDelay > LOOP_DELAY_THRESHOLD_MS) {
        sendSlackAlert(
          `*${proc.name}* loop delay di ${loopDelay} ms (ambang: ${LOOP_DELAY_THRESHOLD_MS} ms)`
        );
      }
    });
  });
}

setInterval(checkProcesses, CHECK_INTERVAL);
console.log('PM2 Health Monitor started (checking every 30 seconds)');
```

Jalankan sebagai proses PM2 terpisah untuk memonitor semua proses lainnya:

```bash
pm2 start health-monitor.js --name health-monitor
```

#### Auto-Remediasi yang Graceful dengan Aksi PM2

API programatis PM2 memungkinkan tindakan pemulihan otomatis:

```javascript
// auto-remediation.js
const pm2 = require('pm2');

async function remediateProcess(processName) {
  return new Promise((resolve, reject) => {
    pm2.list((err, processes) => {
      if (err) return reject(err);

      const target = processes.find(p => p.name === processName);
      if (!target) return reject(new Error('Process not found'));

      // Strategi 1: Reload (zero-downtime) jika mode cluster
      if (target.pm2_env.exec_mode === 'cluster_mode') {
        pm2.reload(processName, (err) => {
          if (err) reject(err);
          else resolve('reloaded');
        });
      }
      // Strategi 2: Restart (downtime singkat) jika mode fork
      else {
        pm2.restart(processName, (err) => {
          if (err) reject(err);
          else resolve('restarted');
        });
      }
    });
  });
}
```

### Membangun Dashboard Monitoring Lengkap (HTML/JS)

Untuk tim yang menginginkan dashboard web ringan tanpa ketergantungan eksternal, Anda dapat membangunnya menggunakan Web API bawaan PM2:

```bash
# Aktifkan web API PM2
pm2 web [port]  # port default 9615
```

Ini mengekspos REST API di `http://localhost:9615/` yang mengembalikan data proses JSON. Anda dapat mengonsumsinya dari aplikasi frontend atau alat monitoring apa pun:

```bash
curl http://localhost:9615/ | jq '.'
```

## Contoh Kode

### File Ecosystem Lengkap dengan Konfigurasi Monitoring

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      // Proses aplikasi
      name: 'api-server',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      error_file: '/var/log/pm2/api-error.log',
      out_file: '/var/log/pm2/api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_type: 'json',
      // Strategi restart
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      autorestart: true,
      cron_restart: '0 4 * * *', // restart harian jam 4 pagi untuk penyegaran memori
    },
    {
      // Eksportir metrik untuk scraping Prometheus
      name: 'metrics-exporter',
      script: 'metrics-server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: false, // tidak perlu me-restart endpoint stateless
      env: {
        PORT: 9095,
      },
    },
    {
      // Pemantau kesehatan dengan alert Slack
      name: 'health-monitor',
      script: 'health-monitor.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
      },
    },
  ],
};
```

### Skrip: Dump Metrik Historis ke CSV

Gunakan skrip ini untuk membuang metrik PM2 pada interval reguler untuk analisis pasca-fakta:

```bash
#!/bin/bash
# metrics-dump.sh
OUTPUT="/var/log/pm2/metrics-$(date +%Y%m%d).csv"
echo "timestamp,name,status,memory_mb,cpu_pct,uptime_sec,restarts,loop_delay_ms" > "$OUTPUT"

while true; do
  pm2 prettylist | jq -r '
    .[] | [
      now | strftime("%Y-%m-%dT%H:%M:%SZ"),
      .name,
      .pm2_env.status,
      (.pm2_env.monit.memory / 1024 / 1024 | floor),
      .pm2_env.monit.cpu,
      .pm2_env.pm_uptime // 0,
      .pm2_env.restart_time // 0,
      .pm2_env.monit.loop_delay // 0
    ] | @csv
  ' >> "$OUTPUT"
  sleep 60
done
```

## Insight Penting

- **Metrik loop delay adalah sinyal peringatan dini paling penting Anda.** Loop delay yang meningkat (terlihat di `pm2 monit`) mengindikasikan pemblokiran sinkron sebelum metrik CPU atau memori menunjukkan anomasi. Atur alert di `> 100 ms` untuk intervensi proaktif.
- **Pisahkan monitoring dari yang dimonitoring.** Jalankan eksportir metrik (`metrics-server.js`) dan pemantau kesehatan (`health-monitor.js`) sebagai proses PM2 mereka sendiri dengan `autorestart: false`. Ini memisahkan bidang monitoring dari bidang aplikasi — bahkan jika aplikasi crash, endpoint metrik Anda masih merespons.
- **Logging JSON terstruktur adalah keharusan di produksi.** Log teks bebas dapat dibaca manusia tetapi tidak ramah mesin. Dengan `log_type: 'json'` di file ecosystem Anda dan output JSON dari aplikasi, alat agregasi log (Loki, ELK, Datadog) dapat mengindeks setiap bidang secara otomatis.
- **PM2 Plus vs Prometheus/Grafana mandiri**: PM2 Plus adalah konfigurasi nol dan menyertakan alerting bawaan tetapi memerlukan langganan berbayar pada skala besar. Prometheus + Grafana memerlukan lebih banyak pengaturan tetapi memberikan kepemilikan data penuh dan terintegrasi dengan infrastruktur monitoring yang sudah ada.
- **API metrik PM2 (`@pm2/io`) bekerja dalam mode fork dan cluster**, tetapi metrik kustom bersifat per-proses. Dalam mode cluster, setiap instance memiliki kolektor metriknya sendiri. Agregasikan metrik di lapisan monitoring (aturan perekaman Prometheus atau kueri tingkat dashboard) daripada di dalam aplikasi.
- **`max_memory_restart` adalah jaring pengaman, bukan strategi monitoring.** Mengatur `max_memory_restart: '500M'` di file ecosystem akan me-restart proses ketika melebihi 500 MB, tetapi restart mengatur ulang semua metrik dalam proses. Gunakan sebagai upaya terakhir — pantau tren memori secara proaktif sehingga Anda tidak pernah mencapai batas secara tidak terduga.
- **Unstable restart lebih berbahaya daripada restart normal.** Ketika PM2 mendeteksi lebih dari 15 crash dalam 30 detik, ia menandai proses sebagai "errored" dan berhenti restart otomatis. Pantau `pm2_env.unstable_restarts` di pipeline alerting Anda dan hubungi teknisi piket segera ketika penghitung ini bertambah.

## Langkah Berikutnya

- Ikuti **Panduan Deployment Produksi PM2** (`id: devops/pm2/guides/pm2-production-deployment-guide.md`) untuk mengintegrasikan pengaturan monitoring ini ke dalam pipeline CI/CD lengkap dengan deployment blue-green dan rollback otomatis.
- Pelajari **Arsitektur Mikroservis dengan PM2** (`id: devops/pm2/tutorials/pm2-microservices-architecture.md`) untuk menerapkan pola monitoring ini di seluruh deployment multi-layanan dengan agregasi log terpusat dan metrik per-layanan.
- Jelajahi **Silabus Manajemen Proses PM2** (`id: devops/pm2/syllabi/pm2-process-management-syllabus.md`) untuk jalur pembelajaran terstruktur yang mencakup segalanya dari manajemen proses dasar hingga monitoring dan deployment tingkat perusahaan.
- Untuk deployment Kubernetes, pelajari **Praktik Terbaik Produksi Kubernetes** (`id: devops/kubernetes/guides/kubernetes-production-best-practices.md`) untuk memahami bagaimana pola monitoring PM2 diterjemahkan ke lingkungan orkestrasi kontainer.

## Kesimpulan

Kemampuan monitoring PM2 melampaui sekadar pemeriksaan kesehatan proses sederhana. Dari dashboard `pm2 monit` interaktif yang menyediakan metrik CPU, memori, dan event loop secara real-time, hingga API metrik kustom yang memungkinkan Anda menginstrumentasi KPI tingkat aplikasi, hingga integrasi eksternal dengan PM2 Plus, Prometheus, Grafana, dan platform agregasi log — PM2 menyediakan tumpukan observabilitas lengkap untuk aplikasi Node.js di produksi.

Dengan mengimplementasikan pola-pola dalam tutorial ini — logging JSON terstruktur, metrik aplikasi kustom, pemantauan kesehatan proaktif dengan alerting, dan integrasi dengan infrastruktur observabilitas yang sudah ada — Anda mengubah PM2 dari manajer proses menjadi platform monitoring yang komprehensif. Tim Anda mendapatkan visibilitas yang diperlukan untuk mendeteksi anomali sejak dini, mendiagnosis masalah dengan cepat, dan menjaga keandalan yang dibutuhkan aplikasi produksi.

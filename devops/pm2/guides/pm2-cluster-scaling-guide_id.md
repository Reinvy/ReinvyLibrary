---
title: "Panduan Scaling Cluster PM2"
description: "Panduan praktis cluster mode PM2: cara kerja model primary/worker, menentukan jumlah instance, menangani sticky session dan state bersama, menetapkan batas memori, serta menyetel auto-restart untuk skala produksi."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Scaling Cluster PM2

## Pendahuluan

Node.js menjalankan aplikasi Anda pada satu thread, sehingga satu proses hanya memakai satu core CPU berapa pun jumlah core mesinnya. Di mesin 16 core, `pm2 start app.js` membiarkan 15 core menganggur sementara seluruh request mengantre di belakang satu event loop. Cluster mode menutup celah itu: PM2 melakukan fork satu worker per core dan membiarkan sistem operasi membagi koneksi masuk ke semuanya.

Mekanismenya bukan sihir. PM2 hanyalah supervisor tipis di atas modul `cluster` bawaan Node — proses primary membuka listening socket sekali, lalu mewariskannya ke setiap worker. Karena itu, scaling yang baik jauh lebih ditentukan oleh apa yang disimpan aplikasi di memori prosesnya daripada oleh flag `instances: 'max'`, sebab session, cache, counter, dan jadwal job semuanya rusak begitu ada worker kedua.

## Praktik Terbaik

### 1. Pahami Apa yang Sebenarnya Dilakukan Cluster Mode

Dengan `exec_mode: 'cluster'`, PM2 menjalankan proses primary yang memiliki socket lalu melakukan fork N worker; modul `cluster` Node yang memilih worker penerima koneksi. Linux dan macOS memakai round-robin (`SCHED_RR`), sedangkan di Windows hanya primary yang menerima koneksi dan menyerahkannya lewat IPC. Beban dibagi per *koneksi*, bukan per request — klien keep-alive akan terus masuk ke worker yang sama — dan memori tiap proses tidak terlihat oleh worker lain.

### 2. Sesuaikan Jumlah Instance dengan Core dan Jenis Beban

`instances: 'max'` setara `os.cpus().length`, default yang wajar untuk API yang CPU-bound tetapi tidak universal: sisakan satu core untuk OS, daemon PM2, dan sidecar bila mesin juga menjalankan Redis atau nginx. Untuk layanan yang berat memori, ukur berdasarkan RAM — empat worker berukuran 400 MB tidak muat di kontainer 2 GB. Oversubscription ringan aman untuk proxy yang I/O-bound; untuk pekerjaan CPU-bound gunakan core fisik, bukan hyperthread.

### 3. Jaga Agar Worker Tetap Stateless

Apa pun yang tersimpan di memori satu worker tidak terlihat oleh worker lain. Session in-memory, cache berbasis `Map`, penghitung percobaan login, dan registri room websocket semuanya rusak saat di-cluster — pengguna yang login di worker 3 akan tampak anonim di worker 7. Pindahkan state bersama ke Redis atau database, dan perlakukan memori proses sebagai cache sekali pakai dengan TTL pendek. Keputusan inilah yang menentukan berhasil atau tidaknya cluster mode bagi Anda.

### 4. Jadikan Sticky Session sebagai Pilihan Terakhir

Round-robin PM2 tidak mengikat klien ke worker tertentu, dan PM2 tidak menyediakan opsi sticky session. Bila ada dependensi lama yang benar-benar menuntut afinitas, tentukan routing di luar PM2 — upstream nginx dengan `ip_hash`, atau satu worker per port di belakang cookie affinity. Lebih baik perbaiki akar masalahnya: session store berbasis Redis hanya menambah satu dependensi dan menghapus satu kelas bug produksi.

### 5. Jalankan Job Terjadwal di Luar Cluster

Scheduler di dalam kode aplikasi akan berjalan sekali per worker — delapan worker berarti delapan job duplikat. Cache warmer dan consumer queue yang tidak aman untuk konkurensi berperilaku sama. Tempatkan pekerjaan terjadwal di aplikasi fork-mode terpisah dalam file ecosystem yang sama, atau lindungi dengan distributed lock. `NODE_APP_INSTANCE` (diatur lewat `instance_var`) menandai worker mana Anda berjalan, cukup untuk pemilihan leader dalam satu host.

### 6. Tetapkan Batas Memori per Worker, Bukan per Aplikasi

`max_memory_restart` berlaku untuk setiap worker secara individual: `'512M'` dengan delapan worker berarti sekitar 4 GB RSS. Perintah ini juga merupakan restart, bukan garbage collection — PM2 mematikan worker dan menjalankan penggantinya, sehingga request yang sedang berjalan terputus bila shutdown tidak melakukan drain. Jaga batas ini di atas `--max-old-space-size` dan di bawah limit kontainer, lalu buat alert pada jumlah restart alih-alih menganggapnya sebagai perlindungan.

### 7. Buat Restart Murah, Lalu Rolling Alih-alih Restart Penuh

Crash loop pada delapan worker mengalikan beban ke sistem hilir sebanyak delapan kali: naikkan `min_uptime` agar boot yang lambat tidak dihitung sebagai crash, batasi `max_restarts`, dan aktifkan `exp_backoff_restart_delay` supaya dependensi yang sedang gagal tidak dibanjiri. Deploy dengan `pm2 reload` — worker diganti satu per satu, penggantinya online sebelum pendahulunya dihentikan — atau `startOrReload` yang idempoten. Jangan pakai `pm2 restart` di produksi: seluruh grup dimatikan sekaligus dan dipastikan ada jeda.

## Langkah Implementasi

### Langkah 1: Ukur Baseline Satu Proses

Catat throughput dan saturasi CPU untuk satu proses lebih dulu, karena tanpa itu Anda tidak bisa membedakan apakah worker tambahan membantu atau justru ada bottleneck bersama (database, API eksternal, lock) yang menjadi penghambat sebenarnya.

```bash
npm install -g autocannon
autocannon -c 100 -d 20 http://localhost:3000/api/health   # throughput baseline
pm2 monit                                                  # saturasi core
```

Bila satu worker menempel di 100% CPU dan throughput naik linear setelah worker kedua ditambahkan, beban Anda CPU-bound dan cluster mode akan memberi hasil. Bila CPU tetap rendah tetapi latency meningkat, bottleneck ada di sistem hilir dan worker tambahan hanya menambah kontensi.

### Langkah 2: Keluarkan State Bersama Sebelum Scaling

Pindahkan session dan counter keluar dari memori proses, lengkap dengan perilaku gagal yang eksplisit:

```javascript
// lib/session.js
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 2000)
});
redis.on('error', (err) => console.error('[session] redis error', err.message));

async function getSession(sessionId) {
    if (!sessionId) return null;
    try {
        const raw = await redis.get(`sess:${sessionId}`);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.error('[session] gagal membaca session', err.message);
        return null; // fail closed: tanpa session lebih baik daripada session salah
    }
}

module.exports = { redis, getSession };
```

### Langkah 3: Tulis File Ecosystem untuk Cluster

Aplikasi `scheduler` sengaja dipisah dalam fork mode satu instance agar job cron hanya berjalan sekali per host:

```javascript
// ecosystem.config.js
module.exports = {
    apps: [
        {
            name: 'api',
            script: './dist/server.js',
            exec_mode: 'cluster',
            instances: process.env.WEB_CONCURRENCY || 'max',
            wait_ready: true,
            listen_timeout: 15000,
            kill_signal: 'SIGTERM',
            kill_timeout: 10000,
            min_uptime: 5000,
            max_restarts: 10,
            exp_backoff_restart_delay: 200,
            max_memory_restart: '512M',
            node_args: '--max-old-space-size=448', // di bawah max_memory_restart
            env_production: { NODE_ENV: 'production', PORT: 3000 }
        },
        { name: 'scheduler', script: './dist/scheduler.js', exec_mode: 'fork', instances: 1 }
    ]
};
```

Batas heap V8 448 MB berada di bawah `max_memory_restart`, sehingga V8 melakukan GC sebelum PM2 mematikan worker.

### Langkah 4: Sinyalkan Kesiapan dan Lakukan Drain dengan Rapi

```javascript
const { createServer } = require('./app');
const { redis } = require('./lib/session');
async function main() {
    await redis.ping(); // dependensi diverifikasi sebelum menyatakan siap
    const server = createServer();
    server.listen(process.env.PORT || 3000, () => {
        console.log(`[worker ${process.env.NODE_APP_INSTANCE}] listening`);
        if (process.send) process.send('ready');
    });
    const shutdown = (signal) => {
        console.log(`[worker] menerima ${signal}, mulai drain`);
        server.close(async () => {
            await redis.quit().catch(() => {});
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 8000).unref(); // masih di dalam kill_timeout
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
main().catch((err) => {
    console.error('[worker] bootstrap gagal', err);
    process.exit(1);
});
```

### Langkah 5: Kunci Pekerjaan Singleton

```javascript
const instance = process.env.NODE_APP_INSTANCE;
// Hanya worker pertama yang menjalankan tugas singleton per host
if (instance === undefined || instance === '0') startCacheWarmer();
```

Ini hanya berlaku sebagai leader dalam satu host. Untuk banyak host, gunakan Redis lock (`SET key token NX PX 30000`) dengan pelepasan yang memverifikasi token.

### Langkah 6: Verifikasi Distribusi, Reload, dan Monitor Worker

```bash
pm2 start ecosystem.config.js --env production
autocannon -c 100 -d 30 http://localhost:3000/api/health &
pm2 reload api --update-env
pm2 jlist | jq -r '.[] | select(.name=="api") | "id=\(.pm2_env.pm_id) restarts=\(.pm2_env.restart_time)"'
```

Nol respons `5xx` selama reload berarti handshake kesiapan dan anggaran drain sudah benar; pertumbuhan memori yang tidak merata antar worker biasanya menandakan cache per proses menyimpan data yang seharusnya ada di Redis. Terakhir, buat alert per worker, bukan agregat: worker yang tidak `online`, jumlah restart yang naik tanpa deployment, atau status `stopping` yang melewati `kill_timeout`. Restart yang naik pada trafik stabil umumnya berarti `max_memory_restart` terpicu — bisa karena kebocoran memori, bisa karena batasnya terlalu ketat untuk working set sebenarnya.

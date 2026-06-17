---
title: "Mengelola Aplikasi Node.js dengan PM2"
description: "Tutorial komprehensif tentang penggunaan PM2 untuk mengelola, memantau, dan men-deploy aplikasi Node.js di produksi dengan proses clustering, zero-downtime reload, dan logging tingkat lanjut."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Mengelola Aplikasi Node.js dengan PM2

## Ringkasan

PM2 adalah process manager tingkat produksi untuk aplikasi Node.js yang menjaga layanan Anda tetap berjalan, menangani clustering untuk CPU multi-core, menyediakan deployment tanpa downtime, serta menawarkan monitoring dan manajemen log bawaan. Tutorial ini mencakup instalasi, konfigurasi, manajemen proses, clustering, file ecosystem, strategi deployment, dan monitoring — semua yang Anda butuhkan untuk menjalankan aplikasi Node.js secara andal di produksi.

## Target Audiens

- Backend developer dan DevOps engineer yang men-deploy aplikasi Node.js.
- Developer yang telah menggunakan `node app.js` di pengembangan dan menginginkan solusi siap produksi.
- Level menengah: familiaritas dengan Node.js, npm, dan perintah Linux dasar diasumsikan sudah dimiliki.

## Prasyarat

- Node.js 16+ dan npm terinstal.
- Aplikasi Node.js sederhana untuk diuji (atau buat contoh yang disediakan).
- Familiaritas dasar dengan baris perintah Linux.
- Akses SSH ke server Linux (untuk bagian deployment).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menginstal PM2 dan mengelola proses aplikasi (start, stop, restart, delete).
- Menskalakan aplikasi di seluruh core CPU menggunakan mode cluster PM2.
- Membuat dan memelihara file konfigurasi ecosystem.
- Melakukan reload tanpa downtime dan penghentian aplikasi secara graceful.
- Menyiapkan rotasi log, dashboard monitoring, dan startup hooks.
- Men-deploy aplikasi secara terprogram dan melalui keymetrics untuk monitoring jarak jauh.

## Konteks dan Motivasi

Menjalankan aplikasi Node.js dengan `node app.js` memang berfungsi di laptop Anda, tetapi di produksi risikonya jauh lebih tinggi. Aplikasi Anda perlu bertahan dari crash, restart secara otomatis, menggunakan semua core CPU yang tersedia, menangani lonjakan lalu lintas tanpa downtime, dan memberikan visibilitas terhadap kesehatannya. Mengimplementasikan semua ini secara manual rentan terhadap kesalahan dan membuang waktu yang seharusnya digunakan untuk membangun fitur.

PM2 memecahkan masalah-masalah ini di luar kotak. PM2 adalah process manager standar de facto untuk Node.js di produksi, digunakan oleh perusahaan dari semua skala karena sudah teruji, mudah dikonfigurasi, dan kaya akan fitur. Tutorial ini memberikan semua yang Anda butuhkan untuk beralih dari `node app.js` ke deployment produksi yang tangguh, terpantau, dan ter-cluster.

## Konten Inti

### Instalasi

PM2 didistribusikan sebagai paket npm dan harus diinstal secara global:

```bash
npm install -g pm2
```

Verifikasi instalasi:

```bash
pm2 --version
```

### Memulai Aplikasi

Cara termudah untuk menggunakan PM2 adalah dengan memulai aplikasi secara langsung:

```bash
pm2 start app.js
```

PM2 memberikan setiap proses sebuah **nama** (berasal dari nama file) dan **ID** (bertambah secara otomatis). Anda juga dapat menentukan nama kustom:

```bash
pm2 start app.js --name my-api
```

### Mengelola Proses

PM2 menyediakan perintah intuitif untuk seluruh siklus hidup proses:

```bash
pm2 list                    # Daftar semua proses yang dikelola
pm2 stop my-api             # Hentikan proses (tetap dalam daftar)
pm2 restart my-api          # Mulai ulang proses
pm2 delete my-api           # Hapus proses dari daftar PM2
pm2 start app.js --watch    # Mulai ulang otomatis saat file berubah (mode dev)
```

Perintah `pm2 list` menampilkan tabel dengan status setiap proses, penggunaan CPU/memori, uptime, dan jumlah restart.

### Memahami Status Proses

| Status    | Deskripsi                                                               |
|-----------|-------------------------------------------------------------------------|
| `online`  | Proses berjalan normal.                                                 |
| `stopped` | Proses telah dihentikan melalui `pm2 stop` tetapi tetap terdaftar.       |
| `errored` | Proses crash karena error yang tidak tertangani atau kode keluar > 0.    |
| `launching` | Proses sedang dalam tahap memulai.                                    |

PM2 secara otomatis me-restart proses apa pun yang keluar secara tidak terduga, berdasarkan strategi restart yang dikonfigurasi.

### Mode Cluster

Node.js berjalan pada satu thread secara default, yang berarti hanya dapat menggunakan satu core CPU. Di server multi-core, ini membuang-buang sumber daya. **Mode cluster** PM2 membuat satu worker process per core CPU dan mendistribusikan koneksi masuk ke seluruh worker tersebut menggunakan round-robin load balancer sistem operasi.

Mulai aplikasi dalam mode cluster:

```bash
pm2 start app.js -i max
```

Flag `-i` menentukan jumlah instance:
- `max` — satu instance per core CPU (direkomendasikan untuk sebagian besar kasus).
- `-i 2` — tepat 2 instance.
- `-i -1` — satu kurang dari jumlah core (menyisakan satu core kosong).

Verifikasi mode cluster:

```bash
pm2 list
# Anda akan melihat beberapa proses dengan nama yang sama, ID berbeda
```

### File Ecosystem

Mengetikkan flag di baris perintah bersifat rapuh. **File ecosystem** (`ecosystem.config.js`) menyimpan semua konfigurasi Anda dalam file yang dikontrol versi:

```javascript
module.exports = {
  apps: [
    {
      name: 'my-api',
      script: 'app.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      }
    }
  ]
};
```

Mulai menggunakan file ecosystem:

```bash
pm2 start ecosystem.config.js
# Atau dengan environment tertentu:
pm2 start ecosystem.config.js --env production
```

### Graceful Shutdown dan Zero-Downtime Reload

Ketika me-restart aplikasi, Anda ingin menghindari permintaan yang terputus. PM2 mendukung **graceful shutdown** — ia mengirim sinyal `SIGINT` atau `SIGTERM` dan menunggu proses ditutup dengan baik sebelum memulai penggantinya.

Di aplikasi Anda, dengarkan sinyal shutdown:

```javascript
process.on('SIGINT', async () => {
  console.log('Menerima SIGINT. Mematikan secara graceful...');
  await server.close();       // Berhenti menerima koneksi baru
  await db.disconnect();      // Tutup koneksi database
  process.exit(0);
});
```

Konfigurasikan file ecosystem untuk graceful shutdown:

```javascript
module.exports = {
  apps: [{
    name: 'my-api',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    kill_timeout: 5000,        // Tunggu 5 detik sebelum paksa kill
    listen_timeout: 3000,      // Tunggu 3 detik sebelum anggap aplikasi siap
    shutdown_with_message: true
  }]
};
```

Lakukan **zero-downtime reload**:

```bash
pm2 reload ecosystem.config.js
```

Tidak seperti `pm2 restart` yang menghentikan dan memulai setiap proses satu per satu, `pm2 reload` me-restart worker satu per satu sehingga aplikasi tetap tersedia selama proses berlangsung. Dalam mode cluster, ini benar-benar tanpa downtime.

### Manajemen Log

PM2 menangkap stdout dan stderr untuk setiap proses secara otomatis:

```bash
pm2 logs          # Tail semua log
pm2 logs my-api   # Tail log untuk proses tertentu
pm2 logs --lines 100  # Tampilkan 100 baris terakhir
```

Secara default, log akan terus membesar tanpa batas. Instal `pm2-logrotate` untuk mengelola file log:

```bash
pm2 install pm2-logrotate
```

Konfigurasikan rotasi log:

```bash
pm2 set pm2-logrotate:max_size 10M     # Rotasi pada 10MB
pm2 set pm2-logrotate:retain 7          # Simpan 7 file rotasi
pm2 set pm2-logrotate:compress true     # Kompres file rotasi dengan gzip
pm2 set pm2-logrotate:interval '1d'     # Atau rotasi harian
```

### Startup Hooks

Pastikan proses PM2 Anda restart secara otomatis saat server reboot:

```bash
pm2 startup
```

Ini menghasilkan dan menginstal unit systemd (atau yang setara) yang meluncurkan PM2 saat boot. Kemudian simpan daftar proses saat ini:

```bash
pm2 save
```

Sekarang aplikasi Anda akan bertahan dari reboot server tanpa intervensi manual.

### Monitoring dan Metrik

PM2 menyediakan beberapa cara untuk memantau proses yang berjalan.

Dashboard terminal real-time:

```bash
pm2 monit
```

Ini menampilkan penggunaan CPU/memori per proses, metrik permintaan, dan output log dalam dashboard bergaya curses.

Monitoring terprogram melalui API PM2:

```javascript
const pm2 = require('pm2');

pm2.connect((err) => {
  if (err) throw err;
  pm2.list((err, list) => {
    list.forEach(proc => {
      console.log(`${proc.name}: CPU ${proc.monit.cpu}%, Memori ${(proc.monit.memory / 1024 / 1024).toFixed(1)}MB`);
    });
    pm2.disconnect();
  });
});
```

Untuk monitoring jarak jauh yang lebih canggih, PM2 menawarkan **Keymetrics** — dashboard SaaS untuk metrik, peringatan, dan manajemen deployment di seluruh server.

## Contoh Kode

### Contoh: Aplikasi Express dengan Graceful Shutdown

Buat `app.js`:

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ status: 'ok', pid: process.pid });
});

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server started pada port ${process.env.PORT || 3000} [PID: ${process.pid}]`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nMematikan secara graceful...');
  server.close(() => {
    console.log('Server ditutup. Keluar.');
    process.exit(0);
  });
});
```

### Contoh: File Ecosystem Komprehensif

Buat `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'my-api',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '500M',
    kill_timeout: 5000,
    listen_timeout: 3000,
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### Contoh: Konfigurasi Deployment

PM2 juga dapat mengorkestrasi deployment dari mesin lokal ke server jarak jauh:

```javascript
module.exports = {
  apps: [{
    name: 'my-api',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    }
  }],
  deploy: {
    production: {
      user: 'deploy',
      host: 'server-anda.com',
      ref: 'origin/main',
      repo: 'git@github.com:organisasi-anda/repo-anda.git',
      path: '/var/www/my-api',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
```

Deploy dengan satu perintah:

```bash
pm2 deploy ecosystem.config.js production
```

## Insight Penting

- **Selalu gunakan `exec_mode: 'cluster'` dan `instances: 'max'` di produksi** — ini adalah peningkatan performa paling berdampak untuk server multi-core.
- **Graceful shutdown bersifat non-negotiable** — konfigurasikan handler `SIGINT` dan `kill_timeout` di file ecosystem Anda untuk mencegah permintaan yang terputus selama deploy dan restart.
- **Jalankan `pm2 startup` dan `pm2 save` setelah setiap deploy** — tanpa ini, reboot server berarti intervensi manual untuk memulai ulang aplikasi Anda.
- **Gunakan `pm2 reload` daripada `pm2 restart` di produksi** — reload memulai ulang worker satu per satu, memberikan update tanpa downtime.
- **File log PM2 dapat tumbuh dengan cepat dan memenuhi disk Anda** — selalu instal `pm2-logrotate` dan konfigurasikan batas retensi di server produksi.
- **Pantau sejak awal, pantau sesering mungkin** — `pm2 monit` dan API PM2 memberikan wawasan real-time; jangan menunggu sampai terjadi gangguan untuk menemukan kebocoran memori atau lonjakan CPU.

## Langkah Berikutnya

- Pelajari tentang **deployment terkontainerisasi** dengan Docker dan PM2 di tutorial Dockerizing a Full-Stack Application.
- Jelajahi **Keymetrics** (pm2.io) untuk dashboard multi-server, peringatan, dan riwayat metrik.
- Siapkan **integrasi CI/CD** — jalankan `pm2 deploy` dari pipeline GitHub Actions atau GitLab CI Anda.
- Baca dokumentasi resmi PM2 untuk topik lanjutan: [pm2.keymetrics.io/docs](https://pm2.keymetrics.io/docs)

## Kesimpulan

PM2 mengubah proses Node.js sederhana menjadi layanan produksi yang tangguh. Anda telah mempelajari cara menginstal PM2, mengelola proses, menskalakan di seluruh core CPU dengan mode cluster, mengonfigurasi file ecosystem, melakukan reload tanpa downtime dengan graceful shutdown, mengelola log, menyiapkan startup otomatis, dan memantau aplikasi Anda. Keterampilan ini penting untuk setiap deployment Node.js di produksi dan akan menghemat waktu berjam-jam dalam manajemen proses manual dan pemecahan masalah.

---
title: "Cheat Sheet PM2"
description: "Referensi cepat komprehensif untuk PM2 process manager — perintah CLI, konfigurasi ecosystem file, mode cluster, zero-downtime reload, manajemen log, dan strategi deployment."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet PM2

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Menjalankan aplikasi | `pm2 start app.js` | Menjalankan aplikasi Node.js dengan PM2 |
| Menjalankan dengan nama | `pm2 start app.js --name myapi` | Memberi nama kustom pada proses untuk pengelolaan yang lebih mudah |
| Menampilkan semua proses | `pm2 list` (atau `pm2 ls`, `pm2 status`) | Menampilkan semua proses yang dikelola dengan status, uptime, dan penggunaan sumber daya |
| Menampilkan detail proses | `pm2 show <id\|nama>` | Menampilkan metadata detail, path log, dan variabel lingkungan untuk suatu proses |
| Menghentikan proses | `pm2 stop <id\|nama>` | Menghentikan proses secara graceful (SIGINT) |
| Menghentikan semua proses | `pm2 stop all` | Menghentikan semua proses di bawah manajemen PM2 |
| Memulai ulang proses | `pm2 restart <id\|nama>` | Restart paksa (stop lalu start) |
| Reload tanpa downtime | `pm2 reload <id\|nama>` | Reload graceful tanpa downtime — me-restart worker satu per satu |
| Menghapus proses | `pm2 delete <id\|nama>` | Menghapus proses dari daftar proses PM2 |
| Menghapus semua proses | `pm2 delete all` | Menghapus semua proses dari PM2 |
| Menjalankan di cluster mode | `pm2 start app.js -i max` | Fork satu process per core CPU (`max` = semua core) |
| Menskala instance cluster | `pm2 scale <nama> <N>` | Menskala aplikasi cluster ke N instance secara dinamis |
| Melihat log | `pm2 logs` | Menampilkan semua log dalam mode streaming |
| Melihat log aplikasi tertentu | `pm2 logs <nama>` | Menstreaming log untuk aplikasi tertentu saja |
| Melihat N baris terakhir | `pm2 logs --lines 200` | Menampilkan N baris terakhir log tanpa streaming |
| Membersihkan semua log | `pm2 flush` | Menghapus semua file log |
| Dashboard monitoring | `pm2 monit` | Dashboard terminal real-time untuk metrik CPU, memori, dan request |
| Menyimpan daftar proses | `pm2 save` | Membuat snapshot daftar proses saat ini untuk dipulihkan saat reboot |
| Memulihkan daftar tersimpan | `pm2 resurrect` | Menjalankan ulang semua proses dari snapshot terakhir |
| Membuat script startup | `pm2 startup` | Membuat dan mengonfigurasi init script untuk auto-start PM2 saat boot |
| Mematikan daemon PM2 | `pm2 kill` | Mematikan daemon PM2 sepenuhnya |
| Memperbarui PM2 | `pm2 updatePM2` | Memperbarui PM2 di memori setelah upgrade npm global |
| Menampilkan metrik CPU/memori | `pm2 prettylist` | Mengeluarkan JSON terstruktur dengan metrik detail untuk semua proses |

## Perintah Umum

### Manajemen Proses

```bash
# Menjalankan aplikasi dengan nama kustom dan mode watch
pm2 start server.js --name api-server --watch

# Menjalankan dengan interpreter berbeda (misalnya ts-node untuk TypeScript)
pm2 start server.ts --interpreter ts-node

# Menjalankan dengan variabel lingkungan inline
pm2 start app.js --env production --node-args="--max-old-space-size=512"

# Menghentikan, merestart, menghapus
pm2 stop api-server
pm2 restart api-server
pm2 delete api-server

# Mendeskripsikan proses secara detail
pm2 describe api-server

# Mengirim sinyal kustom ke suatu proses
pm2 sendSignal SIGUSR2 api-server
```

### Mode Cluster

```bash
# Menjalankan dengan 4 instance
pm2 start app.js -i 4

# Menjalankan dengan satu instance per CPU (mendeteksi core otomatis)
pm2 start app.js -i max

# Menskala ke jumlah instance tertentu
pm2 scale api-server 6

# Reload cluster secara graceful (tanpa downtime)
pm2 reload all

# Reload aplikasi tertentu secara graceful
pm2 reload api-server
```

### Ecosystem File

```bash
# Membuat template ecosystem file
pm2 init

# Menjalankan menggunakan ecosystem file
pm2 start ecosystem.config.js

# Menjalankan dengan environment tertentu
pm2 start ecosystem.config.js --env production

# Menghentikan semua aplikasi yang didefinisikan di ecosystem file
pm2 stop ecosystem.config.js

# Menghapus semua aplikasi dari ecosystem file
pm2 delete ecosystem.config.js
```

### Manajemen Log

```bash
# Melihat log dengan timestamp
pm2 logs --timestamp

# Menggabungkan log dari semua instance aplikasi cluster
pm2 logs api-server --merge-logs

# Mengeluarkan log dalam format JSON untuk konsumsi programatik
pm2 logs --json

# Melihat log error saja
pm2 logs --err

# Mengatur path log kustom untuk suatu proses
pm2 start app.js --log /var/log/myapp/app.log \
  --output /var/log/myapp/out.log \
  --error /var/log/myapp/err.log

# Rotasi log (memerlukan modul pm2-logrotate)
pm2 install pm2-logrotate
```

### Startup & Init System

```bash
# Membuat script startup systemd
pm2 startup systemd

# Menyimpan daftar proses saat ini agar aktif saat boot
pm2 save

# Perintah startup akan mengeluarkan command yang perlu dijalankan sebagai root:
#   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy

# Menonaktifkan startup saat boot
pm2 unstartup systemd

# Mengecek apakah startup sudah dikonfigurasi
pm2 startup status
```

### Monitoring & Metrik

```bash
# Meluncurkan dashboard terminal
pm2 monit

# Melihat daftar dengan metrik yang diperluas
pm2 list

# Menampilkan penggunaan CPU dan memori untuk setiap proses
pm2 prettylist

# Mengaktifkan monitoring jarak jauh Keymetrics / PM2 Plus
pm2 link <secret> <public>

# Membuka dashboard web
pm2 open

# Menampilkan metrik proses dalam format JSON
pm2 jlist

# Menampilkan penggunaan memori per proses
pm2 describe api-server | grep "memory"
```

### Operasi Lanjutan

```bash
# Graceful shutdown: mengirim SIGINT, lalu SIGKILL setelah timeout
pm2 start app.js --kill-timeout 5000

# Restart otomatis saat melebihi batas memori
pm2 start app.js --max-memory-restart 500M

# Menonaktifkan auto-restart saat crash
pm2 start app.js --no-autorestart

# Penundaan restart (ms) antar restart otomatis
pm2 start app.js --restart-delay 3000

# Memantau direktori source untuk perubahan
pm2 start app.js --watch --watch-ignore="node_modules"

# Menggabungkan log dari semua instance cluster ke satu stream
pm2 start app.js -i max --merge-logs

# Menggunakan lokasi file konfigurasi PM2 tertentu
pm2 start /etc/pm2/ecosystem.config.js
```

## Potongan Kode

### Ecosystem File Dasar

```javascript
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      max_memory_restart: '500M',
      kill_timeout: 5000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true
    }
  ]
};
```

### Ecosystem File dengan Banyak Aplikasi

```javascript
module.exports = {
  apps: [
    {
      name: 'web',
      script: './dist/web.js',
      instances: 2,
      env_production: {
        PORT: 3000
      }
    },
    {
      name: 'worker',
      script: './dist/worker.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        QUEUE_CONCURRENCY: 5
      }
    },
    {
      name: 'scheduler',
      script: './dist/cron.js',
      cron_restart: '0 3 * * *',
      autorestart: false,
      exec_mode: 'fork'
    }
  ]
};
```

### Graceful Shutdown dalam Kode Aplikasi

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Halo dari aplikasi yang dikelola PM2!');
});

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server mendengarkan di port ${process.env.PORT || 3000}`);
});

// Mendengarkan sinyal graceful shutdown dari PM2
process.on('SIGINT', () => {
  console.log('Menerima SIGINT — mematikan secara graceful...');
  server.close(() => {
    // Menutup koneksi database, membersihkan sumber daya
    console.log('Server ditutup. Keluar.');
    process.exit(0);
  });

  // Pematian paksa jika graceful close terlalu lama
  setTimeout(() => {
    console.error('Pematian paksa setelah timeout.');
    process.exit(1);
  }, 5000);
});
```

### Konfigurasi Deployment PM2

```javascript
module.exports = {
  apps: [{
    name: 'api-server',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster'
  }],
  deploy: {
    production: {
      user: 'deploy',
      host: ['api1.example.com', 'api2.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:org/myapp.git',
      path: '/var/www/myapp',
      'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/www/myapp',
      ssh_options: 'StrictHostKeyChecking=no'
    },
    staging: {
      user: 'deploy',
      host: 'staging.example.com',
      ref: 'origin/develop',
      repo: 'git@github.com:org/myapp.git',
      path: '/var/www/myapp-staging',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};
```

### Rotasi Log dengan pm2-logrotate

```bash
# Menginstal modul rotasi log
pm2 install pm2-logrotate

# Mengonfigurasi interval rotasi dan retensi
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 60
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# Melihat konfigurasi saat ini
pm2 conf pm2-logrotate
```

### API PM2 untuk Penggunaan Programatik

```javascript
const pm2 = require('pm2');

pm2.connect((err) => {
  if (err) {
    console.error('Gagal terhubung ke daemon PM2:', err);
    process.exit(1);
  }

  pm2.start({
    name: 'my-app',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: { PORT: 3000 }
  }, (err, apps) => {
    if (err) {
      console.error('Gagal menjalankan aplikasi:', err);
      pm2.disconnect();
      return;
    }
    console.log('Aplikasi berjalan:', apps.map(a => a.name));

    // Menampilkan semua proses
    pm2.list((err, list) => {
      console.log('Proses berjalan:', list.length);
      list.forEach(proc => {
        console.log(`- ${proc.name}: ${proc.pm2_env.status}`);
      });
      pm2.disconnect();
    });
  });
});
```

### Dukungan Source Map untuk Produksi

```javascript
// Di ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api-server',
    script: './dist/server.js',
    // Mengaktifkan source maps untuk stack trace yang bermakna
    source_map_support: true,
    // Meningkatkan memori untuk pemrosesan source map jika diperlukan
    node_args: '--enable-source-maps'
  }]
};
```

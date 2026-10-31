---
title: "Cheat Sheet Logging PM2"
description: "Referensi cepat untuk lokasi log PM2, penggabungan log cluster, rotasi dengan pm2-logrotate, keluaran JSON, dan pola grep untuk debugging produksi."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Logging PM2

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Alirkan semua log | `pm2 logs --timestamp` | Menampilkan seluruh stream `out` dan `error` yang dikelola daemon |
| Alirkan satu aplikasi | `pm2 logs api --err` | Membatasi ke satu proses; `--err` atau `--out` memilih satu stream |
| Cuplikan untuk skrip | `pm2 logs api --nostream --lines 500` | Mencetak 500 baris terakhir lalu keluar, tidak mengikuti |
| Cari lokasi file log | `ls -lh ~/.pm2/logs/` | Tata letak bawaan: `<app>-out.log` dan `<app>-error.log` |
| Gabungkan log cluster | `merge_logs: true` | Menulis semua worker cluster ke satu file per stream |
| Kosongkan log | `pm2 flush api` | Mengosongkan file tanpa me-restart proses |
| Buka ulang file handle | `pm2 reloadLogs` | Wajib setelah rotasi yang mengganti inode |
| Pasang rotasi | `pm2 install pm2-logrotate` | Modul komunitas untuk merotasi file log PM2 |
| Batasi ukuran file | `pm2 set pm2-logrotate:max_size 10M` | Rotasi segera setelah file melewati 10 MB |
| Simpan riwayat | `pm2 set pm2-logrotate:retain 7` | Menyimpan tujuh file hasil rotasi terakhir |
| Kompres file lama | `pm2 set pm2-logrotate:compress true` | Meng-gzip file lama agar pertumbuhan disk melambat |
| Keluaran machine-readable | `pm2 logs api --json` | Satu objek JSON per baris, bukan teks berwarna |

## Perintah Umum

### Menemukan dan Mengukur Log

```bash
# Lokasi bawaan seluruh file log proses
ls -lh ~/.pm2/logs/

# Pastikan path persis yang dipakai PM2 untuk satu aplikasi
pm2 describe api | grep -E "out log path|error log path"

# Total disk yang dipakai log, plus log milik daemon
du -sh ~/.pm2/logs/ && tail -n 50 ~/.pm2/pm2.log
```

### Streaming dan Penyaringan

```bash
# Ikuti stream error satu aplikasi dengan timestamp, lepas di 200 baris
pm2 logs api --err --timestamp --nostream --lines 200

# Cari respons HTTP 5xx pada stream mentah
pm2 logs api --raw --nostream --lines 5000 | grep -E '"status":5[0-9]{2}'

# Hitung error per menit untuk mendeteksi lonjakan
pm2 logs api --raw --nostream --lines 5000 \
    | grep -i error \
    | awk -F'"timestamp":"' '{print substr($2, 1, 16)}' \
    | sort | uniq -c
```

### Rotasi dengan pm2-logrotate

```bash
# Pasang modul rotasi (berjalan sebagai proses khusus di dalam PM2)
pm2 install pm2-logrotate

# Rotasi pada 10 MB, simpan 14 file, kompres yang lama
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true

# Tambahkan rotasi harian tengah malam di samping pemicu ukuran
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# Periksa konfigurasi modul yang sedang aktif
pm2 conf pm2-logrotate
```

### Keluaran JSON dan Terstruktur

```bash
# Pembungkus JSON milik PM2 untuk setiap baris log
pm2 logs api --json --nostream --lines 3

# Keluaran mentah aplikasi tanpa prefiks tambahan dari PM2
pm2 logs api --raw --nostream --lines 50

# Saring log terstruktur dengan jq bila aplikasi sudah menghasilkan JSON
pm2 logs api --raw --nostream --lines 1000 | jq -c 'select(.level >= 50)'
```

## Potongan Kode

### Konfigurasi Ecosystem dengan Pengaturan Logging

```javascript
module.exports = {
  apps: [
    {
      name: 'api',
      script: './dist/server.js',
      instances: 4,
      exec_mode: 'cluster',
      // Gabungkan seluruh worker cluster ke satu file per stream
      merge_logs: true,
      // Beri prefiks waktu pada setiap baris agar grep per jam mudah
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      // Path eksplisit agar log ada di volume data, bukan disk root
      out_file: '/var/log/reinvy/api-out.log',
      error_file: '/var/log/reinvy/api-error.log',
      env_production: { NODE_ENV: 'production' }
    }
  ]
};
```

### Logger Terstruktur yang Ramah PM2

```javascript
// logger.js — satu objek JSON per baris agar pm2 logs --json tetap bisa di-parse
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { app: process.env.PM2_APP_NAME, pid: process.pid },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    }
  }
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  process.exit(1);
});

module.exports = logger;
```

### logrotate Eksternal untuk Rotasi di Level Host

```ini
# /etc/logrotate.d/pm2-reinvy-api
/var/log/reinvy/api-*.log {
    daily
    rotate 14
    size 10M
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    su deploy deploy
}
```

```bash
# copytruncate mempertahankan inode, jadi PM2 tetap menulis ke file yang sama
sudo logrotate -d /etc/logrotate.d/pm2-reinvy-api   # uji coba dulu
sudo logrotate -f /etc/logrotate.d/pm2-reinvy-api   # paksa satu kali rotasi

# Bila rotasi memindahkan file, PM2 harus membuka ulang handle-nya
pm2 reloadLogs
# Setelah pembersihan manual, pastikan ukurannya benar-benar turun
du -sh ~/.pm2/logs/
```

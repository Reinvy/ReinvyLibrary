---
title: "Panduan Deployment Produksi dan Monitoring dengan PM2"
description: "Panduan komprehensif untuk men-deploy aplikasi Node.js ke produksi dengan PM2, mencakup konfigurasi ecosystem file, cluster mode, deployment tanpa downtime, manajemen log, monitoring, dan integrasi CI/CD."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Deployment Produksi dan Monitoring dengan PM2

## Pendahuluan

PM2 adalah process manager utama untuk aplikasi Node.js di lingkungan produksi. Meskipun memulai dengan PM2 cukup sederhana, menjalankan aplikasi dengan andal dalam skala besar memerlukan konfigurasi ecosystem file, rotasi log, cluster mode, monitoring, dan pipeline deployment yang cermat. Panduan ini mengkonsolidasikan praktik terbaik yang telah teruji untuk deployment produksi dengan PM2, mencakup semuanya mulai dari ecosystem file khusus lingkungan hingga integrasi CI/CD otomatis. Mengikuti pola-pola ini memastikan aplikasi Node.js Anda tetap online, terdegradasi dengan baik di bawah beban, dan menyediakan data observabilitas yang dibutuhkan tim operasi Anda.

## Praktik Terbaik

### 1. Gunakan Ecosystem File untuk Konfigurasi yang Reproducible

Selalu kelola konfigurasi PM2 melalui `ecosystem.config.js` (atau `.json`) daripada flag CLI. Ecosystem file dapat di-version control, mendokumentasikan dirinya sendiri, dan menghilangkan risiko konfigurasi yang tidak konsisten antar lingkungan.

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "api",
      script: "dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
```

### 2. Pisahkan Override Khusus Lingkungan

Pertahankan file ecosystem dasar dan perluas dengan override khusus lingkungan, daripada menduplikasi konfigurasi. Ini menjaga pengaturan umum di satu tempat dan membuat perbedaan lingkungan menjadi eksplisit.

```javascript
// ecosystem.config.js — basis bersama
const common = {
  script: "dist/server.js",
  instances: "max",
  exec_mode: "cluster",
  max_memory_restart: "500M",
  error_file: "./logs/err.log",
  out_file: "./logs/out.log",
  combine_logs: true,
  merge_logs: true,
  log_date_format: "YYYY-MM-DD HH:mm:ss Z",
};

module.exports = {
  apps: [
    {
      ...common,
      name: "api",
      env: { NODE_ENV: "development" },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        instances: "max",
        max_memory_restart: "1G",
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 4000,
        instances: 2,
      },
    },
  ],
};
```

Jalankan dengan flag target lingkungan:
```bash
pm2 start ecosystem.config.js --env production
pm2 start ecosystem.config.js --env staging
```

### 3. Aktifkan Cluster Mode untuk Pemanfaatan Multi-Core

Atur `exec_mode: "cluster"` dan `instances: "max"` untuk membuat satu worker per inti CPU. PM2 menangani load-balancing antar worker melalui scheduler round-robin bawaan. Ini adalah perubahan paling berdampak untuk throughput pada mesin multi-core.

```javascript
{
  exec_mode: "cluster",
  instances: "max",  // atau angka tetap seperti 4
}
```

**Penting**: Cluster mode membutuhkan aplikasi Anda untuk bersifat stateless. Data sesi, cache dalam memori, dan koneksi WebSocket harus dieksternalisasi (Redis, database) atau mode `sticky` harus diaktifkan melalui reverse proxy seperti Nginx.

### 4. Konfigurasikan Graceful Shutdown dengan Signal Handling

Aplikasi produksi harus menangani sinyal `SIGINT` / `SIGTERM` untuk menutup koneksi database, menyelesaikan permintaan yang sedang berlangsung, dan membersihkan log sebelum keluar. Tanpa ini, PM2 dapat mematikan proses secara paksa dan menyebabkan kehilangan data.

```javascript
// Di aplikasi Node.js Anda
process.on("SIGINT", async () => {
  console.log("SIGINT diterima — mematikan secara graceful...");
  await server.close();
  await db.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM diterima — mematikan secara graceful...");
  await server.close();
  await db.disconnect();
  process.exit(0);
});
```

Konfigurasikan kill timeout PM2 di file ecosystem:
```javascript
{
  kill_timeout: 5000,  // Tunggu 5 detik untuk shutdown graceful
  listen_timeout: 3000, // Tunggu 3 detik untuk aplikasi mulai mendengarkan
}
```

### 5. Siapkan Rotasi Log Otomatis

Manajemen log bawaan PM2 (`pm2-logrotate`) mencegah log menghabiskan seluruh ruang disk. Instal dan konfigurasikan sebagai modul PM2:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval "0 0 * * *"
```

| Pengaturan | Rekomendasi | Deskripsi |
|------------|-------------|-----------|
| `max_size` | `100M` | Putar file log ketika mencapai ukuran ini |
| `retain` | `7` | Simpan 7 file rotasi per log |
| `compress` | `true` | Kompres file rotasi dengan Gzip |
| `rotateInterval` | `0 0 * * *` | Ekspresi cron untuk rotasi berbasis waktu (setiap tengah malam) |

### 6. Implementasikan Health Check dan Restart Otomatis

PM2 dapat secara otomatis me-restart aplikasi jika menjadi tidak responsif. Konfigurasikan endpoint health check dan kebijakan restart PM2 untuk deployment yang dapat menyembuhkan diri sendiri.

```javascript
{
  min_uptime: "10s",        // Waktu minimal berjalan sebelum dianggap "berhasil"
  max_restarts: 10,         // Maksimal restart tidak stabil berturut-turut
  restart_delay: 3000,      // Jeda antar restart (ms)
  autorestart: true,        // Restart otomatis saat crash (default)
  watch: false,             // Nonaktifkan file watching di produksi
}
```

Untuk health check tingkat aplikasi, sediakan endpoint khusus:

```javascript
// health.js
app.get("/health", async (req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? "healthy" : "degraded",
    pid: process.pid,
    uptime: process.uptime(),
    memoryMB: Math.round(memoryUsage),
  });
});
```

### 7. Monitor dengan Alat Bawaan PM2 dan Integrasi Eksternal

PM2 menyediakan beberapa tingkat monitoring tergantung pada kebutuhan observabilitas Anda.

**Monitoring CLI cepat:**
```bash
pm2 monit            # Dashboard terminal real-time (CPU, memori, log)
pm2 status           # Daftar proses dengan status
pm2 show <app>       # Informasi proses detail
pm2 prettylist       # Output JSON yang dapat dibaca mesin
```

**Agregasi metrik dengan PM2.io (keymetrics):**
```bash
pm2 link <secret> <public>  # Hubungkan ke dashboard PM2.io
```

**Integrasi Prometheus:** Ekspos metrik PM2 melalui `@pm2/io` dan kumpulkan:
```javascript
const pm2 = require("@pm2/io");

const meter = pm2.meter({
  name: "req/min",
  type: "meter",
});

app.use((req, res, next) => {
  meter.mark();
  next();
});
```

### 8. Gunakan Dukungan Source Map untuk Pelacakan Error

Saat men-deploy kode transpilasi (TypeScript, Babel), konfigurasikan PM2 untuk menggunakan source maps sehingga stack trace menunjuk ke baris sumber asli, bukan output kompilasi.

```javascript
{
  source_map_support: true,
  force: true,  // Paksa aktif meskipun NODE_OPTIONS disetel
}
```

Gabungkan dengan library logging terstruktur (seperti `pino`) untuk output error yang dapat ditindaklanjuti:

```javascript
const pino = require("pino");
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});
```

### 9. Terapkan Batas Memori untuk Mencegah OOM

Atur `max_memory_restart` untuk secara otomatis me-restart proses ketika melebihi ambang batas memori. Ini menangkap kebocoran memori sebelum memicu OOM killer di tingkat OS.

```javascript
{
  max_memory_restart: "500M",  // Restart jika heap melebihi 500MB
}
```

Untuk batas heap tingkat Node.js, berikan `--max-old-space-size` melalui `node_args`:
```javascript
{
  node_args: "--max-old-space-size=1024",
}
```

### 10. Amankan Daemon dan API PM2

Daemon PM2 berkomunikasi melalui Unix socket secara default, tetapi API HTTP bawaan harus diamankan di produksi.

```bash
# Nonaktifkan API HTTP sepenuhnya (direkomendasikan)
pm2 unconfig web

# Atau ikat ke localhost saja dengan autentikasi
pm2 web --only-localhost
```

Pastikan daemon PM2 berjalan di bawah pengguna non-root dengan hak akses terbatas:

```bash
# Buat pengguna sistem khusus
sudo useradd --system --no-create-home pm2-user
sudo chown -R pm2-user:pm2-user /var/www/myapp
```

## Langkah Implementasi

### Langkah 1: Buat File Ecosystem

Mulai dengan membuat file ecosystem yang komprehensif mencakup semua lingkungan. Tempatkan di root proyek dan commit ke version control.

```bash
touch ecosystem.config.js
```

Tulis konfigurasi dasar dengan default yang siap produksi:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "myapp",
      script: "dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      max_memory_restart: "1G",
      kill_timeout: 5000,
      listen_timeout: 3000,
      source_map_support: true,
      error_file: "./logs/error.log",
      out_file: "./logs/output.log",
      combine_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 4000,
        instances: 2,
      },
    },
  ],
};
```

### Langkah 2: Instal PM2 dan Rotasi Log Secara Global

Instal PM2 secara global di server produksi dan siapkan rotasi log sebagai modul PM2.

```bash
# Instal PM2 secara global
npm install -g pm2

# Instal dan konfigurasikan rotasi log
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

Simpan daftar proses PM2 agar dapat bangkit kembali saat server reboot:

```bash
pm2 save
pm2 startup   # Membuat skrip systemd/init untuk memulai PM2 otomatis saat boot
```

### Langkah 3: Deploy Aplikasi

Build dan jalankan aplikasi dengan profil lingkungan produksi.

```bash
# Build aplikasi
npm ci --omit=dev
npm run build

# Jalankan dengan konfigurasi produksi
pm2 start ecosystem.config.js --env production

# Verifikasi semuanya berjalan
pm2 status
pm2 show myapp
```

### Langkah 4: Konfigurasikan Reload Tanpa Downtime

Untuk pembaruan bergulir tanpa menjatuhkan permintaan, gunakan `pm2 reload` daripada `pm2 restart`. Reload me-restart worker satu per satu, menunggu setiap worker menyelesaikan permintaan yang sedang berlangsung sebelum menggantinya.

```bash
# Reload semua worker satu per satu (tanpa downtime)
pm2 reload ecosystem.config.js --env production

# Atau reload aplikasi tertentu
pm2 reload myapp
```

Untuk memverifikasi tanpa downtime, jalankan loop curl berkelanjutan selama reload:

```bash
while true; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health; sleep 0.1; done
```

### Langkah 5: Siapkan Integrasi Systemd untuk Persistensi Boot

Perintah `startup` PM2 menghasilkan layanan systemd yang memulai daemon PM2 saat server boot.

```bash
# Generate dan aktifkan skrip startup
pm2 startup systemd

# Ini akan mencetak perintah yang harus dijalankan dengan sudo, misalnya:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy

# Simpan daftar proses saat ini
pm2 save
```

Verifikasi layanan systemd:

```bash
sudo systemctl status pm2-deploy  # atau pm2-root tergantung pengguna
sudo systemctl enable pm2-deploy
```

### Langkah 6: Siapkan Monitoring Health Check

Konfigurasikan PM2 untuk me-restart aplikasi Anda jika health check gagal dengan menggabungkan kebijakan restart bawaan PM2 dengan alat monitoring eksternal.

Buat skrip health check sederhana yang dapat digunakan PM2 secara eksternal:

```bash
#!/bin/bash
# healthcheck.sh
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$STATUS" != "200" ]; then
  echo "Health check gagal dengan status $STATUS"
  exit 1
fi
echo "Health check berhasil"
exit 0
```

Integrasikan dengan monitoring tingkat sistem (misalnya, Docker HEALTHCHECK atau systemd timer):

```bash
# Tambahkan ke crontab untuk pemeriksaan periodik
*/5 * * * * /home/deploy/healthcheck.sh || pm2 restart myapp
```

### Langkah 7: Integrasikan dengan Pipeline CI/CD

Tambahkan perintah deployment PM2 ke pipeline CI/CD Anda. Berikut adalah contoh GitHub Actions.

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci --omit=dev

      - name: Build
        run: npm run build

      - name: Deploy via rsync
        run: |
          rsync -avz --delete \
            --exclude node_modules \
            --exclude .git \
            ./ deploy@${{ secrets.HOST }}:/var/www/myapp/

      - name: Reload application
        run: |
          ssh deploy@${{ secrets.HOST }} "cd /var/www/myapp && \
            npm ci --omit=dev && \
            pm2 reload ecosystem.config.js --env production"
```

### Langkah 8: Siapkan Alerting

Konfigurasikan PM2.io atau layanan monitoring pihak ketiga untuk memberi alert pada event restart proses dan ambang batas sumber daya.

**Dengan PM2.io (Keymetrics):**
```bash
pm2 link <SECRET_KEY> <PUBLIC_KEY>
```

Kemudian konfigurasikan aturan alert di dashboard PM2.io untuk:
- Jumlah restart proses melebihi ambang batas dalam jendela waktu
- Penggunaan CPU di atas 90% selama lebih dari 5 menit
- Memori heap mendekati batas `max_memory_restart`

**Dengan Prometheus + Grafana standalone:**

Tambahkan agen `@pm2/io` dan ekspos metrik:

```javascript
const io = require("@pm2/io");

// Ekspos metrik kustom
const httpRequests = io.meter({ name: "http.requests", samples: 60 });
const activeConnections = io.gauge({ name: "http.connections" });

app.use((req, res, next) => {
  httpRequests.mark();
  activeConnections.set(server.connections());
  next();
});
```

Konfigurasikan Prometheus untuk mengumpulkan endpoint metrik yang diekspos oleh `@pm2/io`, lalu bangun dashboard Grafana untuk visibilitas real-time.

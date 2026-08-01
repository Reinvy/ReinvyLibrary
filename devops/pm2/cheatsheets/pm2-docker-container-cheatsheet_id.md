---
title: "Cheat Sheet PM2 dalam Kontainer Docker"
description: "Referensi cepat untuk menjalankan PM2 di dalam kontainer Docker — entrypoint pm2-runtime, semantik PID 1, penerusan sinyal, logging ke stdout, health check, dan kebijakan restart."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet PM2 dalam Kontainer Docker

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Jalankan PM2 sebagai entrypoint kontainer | `pm2-runtime start app.js` | PM2 khusus kontainer: berjalan di foreground, meneruskan sinyal, dan memungut proses zombie |
| Jalankan PM2 klasik di foreground | `pm2 start app.js --no-daemon` | Alternatif bila image Anda sudah memiliki proses init terpisah (misalnya tini) |
| Mulai dari file ecosystem | `pm2-runtime start ecosystem.config.js` | Entrypoint kontainer dengan konfigurasi ecosystem lengkap |
| Instal PM2 di dalam image | `RUN npm install -g pm2@5` | Langkah Dockerfile; pin versi mayor untuk build yang reproducible |
| Tetapkan perintah kontainer | `CMD ["pm2-runtime", "start", "ecosystem.config.js"]` | CMD bentuk exec agar PM2 menerima sinyal secara langsung, bukan lewat shell |
| Lihat log kontainer | `docker logs <kontainer>` | pm2-runtime mengalirkan log aplikasi ke stdout/stderr secara otomatis |
| Periksa proses saat runtime | `docker exec -it <kontainer> pm2 list` | Debug status PM2 tanpa masuk ke shell interaktif |
| Hentikan kontainer secara graceful | `docker stop -t 15 <kontainer>` | Beri PM2 waktu untuk menuntaskan koneksi sebelum Docker mengirim SIGKILL |
| Restart saat gagal | `docker run --restart unless-stopped ...` | Kebijakan restart Docker menggantikan `pm2 startup` plus `pm2 save` di kontainer |
| Tambahkan health check | `HEALTHCHECK CMD node healthcheck.js` | Instruksi Dockerfile untuk pemeriksaan liveness dan readiness |
| Skala instance cluster | `pm2-runtime start app.js -i 4` | Jumlah instance eksplisit lebih dapat diprediksi daripada `max` di dalam kontainer |
| Reap proses yatim | (bawaan pm2-runtime) | PM2 yang berjalan sebagai PID 1 membersihkan proses zombie dari child yang crash |

## Perintah Umum

### Dockerfile: Menginstal PM2

```dockerfile
FROM node:20-slim

WORKDIR /app

# Instal PM2 secara global dan pin versi mayor untuk image yang reproducible
RUN npm install -g pm2@5

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# pm2-runtime menjaga PM2 tetap di foreground dan meneruskan sinyal ke aplikasi
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
```

### Dockerfile: PM2 Klasik dengan Proses Init

```dockerfile
FROM node:20-slim

# tini bertindak sebagai PID 1; PM2 berjalan sebagai proses child biasa di foreground
RUN apt-get update && apt-get install -y tini \
    && npm install -g pm2@5

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["pm2", "start", "ecosystem.config.js", "--no-daemon"]
```

### Menjalankan dengan pm2-runtime

```bash
# Mode foreground dengan penerusan sinyal otomatis
pm2-runtime start server.js

# Dengan file ecosystem (direkomendasikan untuk image multi-aplikasi)
pm2-runtime start ecosystem.config.js

# Mode cluster di dalam kontainer
pm2-runtime start app.js -i 4

# Berikan variabel lingkungan dari host atau orkestrator saat runtime
docker run -e NODE_ENV=production -e PORT=8080 myapp-image
```

### Logging: Membuat docker logs Berfungsi

```bash
# pm2-runtime sudah mengirim log ke stdout/stderr, jadi tidak perlu konfigurasi tambahan
docker logs -f myapp-container

# Lihat N baris terakhir tanpa streaming
docker logs --tail 200 myapp-container

# Ikuti log dari dalam kontainer (mode PM2 klasik)
docker exec -it myapp-container pm2 logs --lines 100

# Streaming hanya output error
docker logs myapp-container 2>&1 | grep -i error
```

### Health Check dan Kebijakan Restart

```bash
# Restart level kontainer menggantikan pm2 startup dan pm2 save di dalam Docker
docker run -d --restart unless-stopped --name api myapp-image

# Verifikasi kebijakan restart dari kontainer yang berjalan
docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' api

# Jalankan probe kesehatan sekali terhadap kontainer yang berjalan
docker exec -it api node healthcheck.js && echo "sehat"
```

### Debugging di Dalam Kontainer

```bash
# Daftar semua proses yang dikelola PM2
docker exec -it myapp-container pm2 list

# Tampilkan metadata detail untuk satu aplikasi
docker exec -it myapp-container pm2 show api

# Streaming log aplikasi
docker exec -it myapp-container pm2 logs --lines 200

# Buka shell di dalam kontainer yang berjalan untuk inspeksi lebih dalam
docker exec -it myapp-container sh
```

### Penghentian Graceful dan Penerusan Sinyal

```bash
# Hentikan dengan masa tenggang 15 detik sebelum Docker meningkatkan ke SIGKILL
docker stop -t 15 myapp-container

# pm2-runtime meneruskan SIGTERM/SIGINT ke aplikasi dan menunggu handler
# shutdown aplikasi selesai sebelum kontainer keluar

# Paksa hentikan segera (gunakan hanya sebagai upaya terakhir)
docker kill myapp-container
```

## Potongan Kode

### Dockerfile Minimal dengan pm2-runtime

```dockerfile
FROM node:20-slim

WORKDIR /app

RUN npm install -g pm2@5

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["pm2-runtime", "start", "ecosystem.config.js"]
```

### File Ecosystem untuk Image Kontainer

```javascript
module.exports = {
  apps: [
    {
      name: 'api',
      script: './dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      // pm2-runtime menggabungkan log ke stdout/stderr secara otomatis
      merge_logs: true,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'worker',
      script: './dist/worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true
    }
  ]
};
```

### Dockerfile dengan Healthcheck dan Pengguna Non-Root

```dockerfile
FROM node:20-slim

RUN npm install -g pm2@5

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Jalankan sebagai pengguna non-root untuk pertahanan berlapis
RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["pm2-runtime", "start", "ecosystem.config.js"]
```

### docker-compose.yml dengan Kebijakan Restart dan Healthcheck

```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 5s
      retries: 3
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### Handler Shutdown Graceful untuk SIGTERM

```javascript
const express = require('express');
const app = express();

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`API mendengarkan di port ${process.env.PORT || 3000}`);
});

// pm2-runtime meneruskan SIGTERM ke aplikasi saat kontainer dihentikan
process.on('SIGTERM', () => {
  console.log('SIGTERM diterima — menuntaskan koneksi...');
  server.close(() => {
    console.log('Server ditutup, keluar dengan bersih.');
    process.exit(0);
  });
  // Jaring pengaman jika penuntasan koneksi terlalu lama
  setTimeout(() => process.exit(1), 10000).unref();
});
```

### Skrip Healthcheck Sederhana

```javascript
// healthcheck.js — keluar dengan kode 0 ketika aplikasi dalam keadaan sehat
const http = require('http');

const req = http.get(
  { host: '127.0.0.1', port: process.env.PORT || 3000, path: '/health' },
  (res) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('sehat');
      process.exit(0);
    }
    process.exit(1);
  }
);

req.on('error', () => process.exit(1));
req.setTimeout(3000, () => process.exit(1));
```

### Menyuntikkan Konfigurasi Tanpa Membangun Ulang Image

```bash
# Berikan secret dan konfigurasi saat runtime; jangan pernah membakarnya ke dalam image
docker run -d --name api \
  -e DATABASE_URL='postgres://user:pass@db:5432/app' \
  -e API_KEY='secret-value' \
  --restart unless-stopped \
  myapp-image
```

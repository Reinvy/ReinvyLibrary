---
title: "Tutorial Deployment Zero-Downtime dengan PM2"
description: "Men-deploy layanan Node.js tanpa menjatuhkan request: cluster mode, pm2 reload versus restart, graceful shutdown, penjagaan health check, pergantian blue-green, dan rollback."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Tutorial Deployment Zero-Downtime dengan PM2

## Ringkasan

Tutorial ini mengubah API Node.js satu proses menjadi cluster PM2 yang diganti worker demi worker sementara request tetap mengalir. Anda akan menambahkan graceful shutdown, penjaga kesiapan, health check, pergantian blue-green antara dua aplikasi PM2, dan rollback yang selesai dalam hitungan detik.

## Target Audiens

- Backend dan DevOps engineer yang sudah menjalankan Node.js di produksi dengan PM2 serta terbiasa dengan process manager, reverse proxy, dan skrip shell (menengah sampai mahir).

## Prasyarat

- Node.js 20+ dan PM2 5 terpasang global (`npm install -g pm2@5`).
- Layanan HTTP dengan route `/health`, driver database, serta host Linux yang menjalankan systemd.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Menjelaskan kapan `pm2 reload` benar-benar zero-downtime dan kapan tidak.
- Mengonfigurasi cluster mode dengan `wait_ready`, `listen_timeout`, dan `kill_timeout`.
- Menerapkan handler shutdown yang menuntaskan request berjalan sebelum keluar.
- Menjalankan pergantian blue-green antara dua aplikasi PM2 dan rollback dengan aman.

## Konteks dan Motivasi

`pm2 restart` mematikan semua worker sekaligus. Pada API yang sibuk itu berarti ratusan milidetik koneksi ditolak, atau ledakan 502 dari proxy — tak terlihat di dasbor, jelas terlihat di laporan uptime dan di alur checkout. PM2 menyediakan primitif untuk penggantian bergulir, tetapi hanya bekerja bila aplikasi bekerja sama: ia harus mengumumkan kesiapan dan menutup server saat diminta, bukan mati di tengah request. Tutorial ini membangun kerja sama tersebut.

## Konten Inti

### Bagaimana reload mengganti worker, dan kapan gagal

Pada cluster mode, `pm2 reload` menyalakan worker baru, menunggu sinyal kesiapan, lalu menghentikan worker lama, sehingga proxy selalu punya upstream hidup. Pada fork mode hanya ada satu proses per aplikasi: `reload` berubah menjadi restart dan trafik terputus. Gunakan `pm2 restart` untuk penghentian paksa, `pm2 reload` untuk penggantian bergulir, dan `pm2 gracefulReload` bila koneksi berumur panjang (WebSocket, SSE) harus dituntaskan sebelum worker lama pensiun.

### Anggaran kesiapan dan health check

`listen_timeout` adalah batas waktu PM2 menunggu `process.send('ready')`; bila habis, PM2 menganggap worker siap dan melanjutkan. `kill_timeout` adalah masa tenggang sebelum `SIGKILL`. Worker yang berhasil boot belum tentu mampu melayani, jadi kesiapan seharusnya berarti: database terjangkau, migrasi selesai, cache hangat. Lakukan itu sebelum mengirim sinyal siap dan sediakan pemeriksaan yang sama lewat HTTP, agar skrip deploy dan orchestrator memakai definisi "sehat" yang sama.

### Blue-green dengan dua nama aplikasi PM2

Jalankan rilis baru sebagai aplikasi kedua pada port lain, verifikasi, pindahkan upstream proxy, lalu hentikan aplikasi lama. PM2 tidak mengelola pergantian itu — reverse proxy yang melakukannya. Imbalannya: rollback hanya perlu membalik upstream, sementara rilis lama masih hidup dan hangat.

## Contoh Kode

### Aplikasi: kesiapan plus pengurasan koneksi

```javascript
const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const server = http.createServer(async (req, res) => {
  if (req.url !== '/health') return res.writeHead(200).end('ok');
  try {
    await pool.query('SELECT 1');
    res.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}');
  } catch (err) {
    res.writeHead(503, { 'content-type': 'application/json' }).end('{"status":"degraded"}');
    console.error('pemeriksaan health gagal', err.message);
  }
});

server.listen(process.env.PORT || 3000, async () => {
  try {
    await pool.query('SELECT 1');
    if (process.send) process.send('ready'); // baru sekarang worker layak dipakai
  } catch (err) {
    console.error('pemeriksaan kesiapan gagal', err.message);
    process.exit(1);
  }
});

let sedangMati = false;
function shutdown(signal) {
  if (sedangMati) return;
  sedangMati = true;
  console.log(`${signal} diterima, menguras koneksi`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref(); // tetap di bawah kill_timeout
}

['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));
```

### File ecosystem dengan anggaran deployment

```javascript
const shared = {
  script: './server.js',
  instances: 'max',
  exec_mode: 'cluster',
  wait_ready: true,
  listen_timeout: 10000,
  kill_timeout: 12000
};

module.exports = {
  apps: [
    // Dua warna dari satu rilis; hanya nama dan PORT yang berbeda
    { ...shared, name: 'api-blue', env_production: { NODE_ENV: 'production', PORT: 3000 } },
    { ...shared, name: 'api-green', env_production: { NODE_ENV: 'production', PORT: 3001 } }
  ]
};
```

### Deploy terjaga health check yang membatalkan rilis rusak

```bash
#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="/srv/reinvy/releases/$(date +%Y%m%d%H%M%S)"
HEALTH_URL="http://127.0.0.1:3001/health"

# 1. Kirim kode ke direktori rilis yang tidak berubah
git clone --depth 1 --branch "$1" git@github.com:reinvy/api.git "$RELEASE_DIR"
cd "$RELEASE_DIR" && npm ci --omit=dev
# 2. Ganti warna yang menganggur dan tunggu probe health-nya lolos
pm2 reload ecosystem.config.js --only api-green --update-env
curl -fsS --retry 20 --retry-delay 1 --retry-connrefused --max-time 3 \
    "$HEALTH_URL" >/dev/null || {
        echo "green tidak sehat, hentikan dan batalkan" >&2
        pm2 delete api-green
        exit 1
    }
# 3. Pindahkan upstream proxy dan hentikan warna sebelumnya
sed -i 's/127.0.0.1:300[01]/127.0.0.1:3001/' /etc/nginx/conf.d/api.conf
nginx -t && nginx -s reload
pm2 delete api-blue
```

### Rollback dalam satu perintah

```bash
# Jalankan ulang rilis sebelumnya sebagai blue dan arahkan proxy kembali
PREVIOUS_RELEASE="$(ls -1d /srv/reinvy/releases/* | tail -n 2 | head -n 1)"
cd "$PREVIOUS_RELEASE"
pm2 start ecosystem.config.js --only api-blue --env production
until curl -fsS --max-time 3 http://127.0.0.1:3000/health >/dev/null; do sleep 1; done
sed -i 's/127.0.0.1:3001/127.0.0.1:3000/' /etc/nginx/conf.d/api.conf
nginx -t && nginx -s reload && pm2 delete api-green
```

## Insight Penting

- `reload` hanya zero-downtime di cluster mode; satu proses fork mode ditambah reload sama dengan restart yang lebih berbelit, dan `wait_ready` tidak berarti apa-apa tanpa sinyal kesiapan.
- Setel `kill_timeout` di atas anggaran pengurasan Anda dan biarkan aplikasi keluar sendiri. Proses yang butuh `SIGKILL` menandakan bug pada handler shutdown, bukan parameter yang perlu disetel.
- Koneksi berumur panjang tidak pernah selesai dikuras oleh `server.close()`; lacak secara eksplisit atau gunakan `gracefulReload` dengan pesan `shutdown`.
- Blue-green menggandakan memori selama pergantian; siapkan host untuk dua rilis.

## Langkah Berikutnya

- Jalankan `pm2 save` setiap kali struktur berubah dan tambahkan `pm2 startup systemd`, agar daftar proses yang dihidupkan ulang saat boot cocok dengan yang berjalan.
- Pindahkan rotasi log ke `pm2-logrotate` agar cluster jangka panjang tidak memenuhi disk.

## Kesimpulan

Anda kini punya deployment yang mengganti worker satu per satu, menunggu kesiapan nyata, menguras koneksi dengan bersih, dan bisa dibalik dengan satu perintah. Pola ini bukan sihir PM2 — melainkan PM2 ditambah aplikasi yang mengumumkan kesiapan dan keluar saat diminta.

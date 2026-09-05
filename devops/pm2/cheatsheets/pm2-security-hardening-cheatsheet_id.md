---
title: "Cheat Sheet Pengamanan PM2"
description: "Referensi cepat untuk mengamankan process manager PM2 di produksi — pengguna khusus dengan hak istimewa minimal, perlindungan daemon dan soket IPC, penguatan runtime Node.js, manajemen rahasia, keamanan rantai pasok dependensi, dan penguncian unit systemd."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Pengamanan PM2

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Membuat pengguna sistem khusus | `sudo useradd --system --home /opt/deploy --shell /bin/bash deploy` | Menjalankan daemon PM2 dan aplikasinya dengan akun layanan tanpa hak istimewa, bukan sebagai root |
| Berpindah ke pengguna aplikasi | `sudo -u deploy -i` | Menjalankan semua perintah PM2 sebagai pengguna deploy agar daemon dan aplikasi berbagi satu identitas |
| Menginstal PM2 untuk pengguna tersebut | `npm install -g pm2@5` | Menginstal ke prefix npm milik pengguna deploy, bukan secara sistem-wide sebagai root |
| Menjalankan aplikasi sebagai pengguna | `pm2 start ecosystem.config.js --env production` | Proses yang dikelola mewarisi hak istimewa terbatas dari pengguna deploy |
| Membuat skrip boot untuk pengguna | `sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /opt/deploy` | Membuat unit systemd yang mem-boot daemon PM2 sebagai pengguna deploy |
| Menyimpan daftar proses | `pm2 save` | Snapshot agar `pm2 resurrect` memulihkan aplikasi setelah reboot |
| Membatasi direktori home PM2 | `chmod 700 /opt/deploy` dan `chmod 700 /opt/deploy/.pm2` | Hanya pengguna deploy yang dapat membaca log, file dump, dan soket IPC |
| Memblokir akses grup dan publik ke file baru | `umask 077` | File yang dibuat daemon bersifat privat secara default |
| Memeriksa izin soket IPC | `ls -la /opt/deploy/.pm2/pub.sock` | Soket UNIX milik daemon tidak boleh dijangkau pengguna lain |
| Mengikat port berhak istimewa dengan aman | `sudo setcap 'cap_net_bind_service=+ep' "$(command -v node)"` | Memungkinkan proses Node.js non-root mendengarkan di port di bawah 1024 |
| Memverifikasi kapabilitas | `getcap "$(command -v node)"` | Memastikan kapabilitas efektif terpasang pada biner Node.js |
| Membatasi memori runtime | `NODE_OPTIONS: "--max-old-space-size=512"` pada blok `env` ecosystem | Mencegah pertumbuhan heap tak terkendali di dalam proses aplikasi |
| Mengaudit dependensi produksi | `npm audit --omit=dev --audit-level=high` | Menandai kerentanan yang diketahui pada pohon dependensi yang dipasang |
| Instalasi yang dapat direproduksi | `npm ci` | Menginstal persis versi yang dikunci di `package-lock.json` |
| Memindai rahasia yang tertinggal | `grep -RIn -e password -e secret -e token -e "api[_-]?key" . --exclude-dir=node_modules` | Menangkap kredensial yang tertinggal di kode sumber sebelum masuk ke git |
| Mengunci layanan PM2 | `sudo systemctl edit pm2-deploy` | Menerapkan override penguncian systemd seperti pada bagian Potongan Kode |

## Perintah Umum

### Membuat Akun Layanan Khusus

```bash
# Membuat akun sistem tanpa hak istimewa untuk workload PM2
sudo useradd --system --home /opt/deploy --shell /bin/bash deploy
sudo mkdir -p /opt/deploy
sudo chown deploy:deploy /opt/deploy

# Berpindah ke pengguna deploy dan verifikasi identitas
sudo -u deploy -i
whoami   # -> deploy
```

Jangan pernah menjalankan `pm2 start` dengan `sudo` kecuali perintah tertentu (seperti `pm2 startup`) memang membutuhkan root. Daemon yang dimiliki root berarti setiap aplikasi yang dikelola berjalan dengan hak istimewa root, dan setiap kompromi pada satu aplikasi menjadi kompromi pada seluruh host.

### Menginstal PM2 sebagai Pengguna Deploy

```bash
# Sebagai pengguna deploy: instal PM2 ke prefix milik pengguna itu sendiri
sudo -u deploy -i
npm install -g pm2@5
pm2 --version

# Menjalankan aplikasi dengan akun terbatas
pm2 start ecosystem.config.js --env production
pm2 save
```

Kunci versi mayor PM2 (`pm2@5`) agar upgrade `latest` yang tidak terkunci tidak mengubah perilaku daemon secara diam-diam di produksi.

### Melindungi Direktori Home PM2 dan Soket IPC

```bash
# Memperketat izin direktori home PM2
chmod 700 /opt/deploy
chmod 700 /opt/deploy/.pm2

# Memastikan file baru (log, dump, soket) tidak dapat dibaca publik
echo "umask 077" >> /opt/deploy/.bashrc

# Memverifikasi soket IPC bersifat privat
ls -la /opt/deploy/.pm2/pub.sock
# Diharapkan: srwx------ (soket, hanya baca/tulis oleh pemilik)

# Memverifikasi file log tidak terekspos ke pengguna lain
ls -la /opt/deploy/.pm2/logs/
```

Direktori `.pm2` berisi soket IPC daemon, file dump proses, dan semua log aplikasi. Jika pengguna lain dapat membacanya, mereka dapat mengamati variabel lingkungan, pola permintaan, dan topologi layanan internal.

### Mengikat Port Berhak Istimewa Tanpa Root

```bash
# Memberikan kapabilitas bind port di bawah 1024 ke biner Node.js
sudo setcap 'cap_net_bind_service=+ep' "$(command -v node)"

# Memastikan kapabilitas terpasang
getcap "$(command -v node)"

# Menghapus kapabilitas jika tidak lagi dibutuhkan
sudo setcap -r "$(command -v node)"
```

Dengan kapabilitas ini, aplikasi non-root dapat mendengarkan di port 80 atau 443 secara langsung, sehingga tidak perlu lagi menjalankan PM2 sebagai root atau membungkusnya dengan proxy `sudo` hanya untuk keperluan pengikatan port.

### Mengaudit dan Mengunci Dependensi

```bash
# Di dalam direktori aplikasi
cd /opt/deploy/app

# Memeriksa pohon dependensi produksi untuk kerentanan yang diketahui
npm audit --omit=dev --audit-level=high

# Menginstal persis apa yang dideklarasikan package-lock.json
npm ci --omit=dev

# Meninjau paket yang tertinggal secara berkala
npm outdated
```

Gunakan `npm ci`, bukan `npm install`, dalam pipeline deployment. `npm install` dapat mengubah lockfile dan memperkenalkan versi yang tidak dideklarasikan; `npm ci` langsung gagal jika lockfile tidak cocok.

### Memindai Rahasia yang Bocor

```bash
# Pemindaian cepat sebelum push untuk kredensial di repositori
grep -RInE "(password|passwd|secret|token|api[_-]?key)\s*[:=]" \
  --include="*.js" --include="*.json" --include="*.env*" \
  --exclude-dir=node_modules /opt/deploy/app || true

# Memastikan file ecosystem tidak membawa kredensial
grep -n "PASSWORD\|API_KEY" ecosystem.config.js || echo "bersih"
```

Jika sebuah rahasia pernah masuk ke riwayat git, rotasi segera — menghapus file saja tidak cukup, karena kredensial tetap ada di riwayat commit.

### Mengunci Unit Systemd

```bash
# pm2 startup mencetak nama unit, biasanya pm2-deploy.service
sudo systemctl edit pm2-deploy
```

Terapkan override penguncian dari bagian Potongan Kode, lalu muat ulang:

```bash
sudo systemctl daemon-reload
sudo systemctl restart pm2-deploy
sudo systemctl status pm2-deploy --no-pager
```

Verifikasi layanan berjalan sebagai pengguna deploy, bukan sebagai root:

```bash
systemctl show pm2-deploy -p User -p NoNewPrivileges -p ProtectSystem
```

## Potongan Kode

### File Ecosystem yang Sadar Keamanan

```javascript
// ecosystem.config.js — dasar hak istimewa minimal untuk workload PM2
module.exports = {
  apps: [
    {
      name: 'api',
      script: 'dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      // Jangan pernah menyimpan kredensial di sini: akan terlihat di `pm2 describe`
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'
      },
      out_file: '/opt/deploy/.pm2/logs/api-out.log',
      error_file: '/opt/deploy/.pm2/logs/api-error.log',
      merge_logs: true,
      time: true
    }
  ]
};
```

### Memuat Rahasia Saat Runtime

```javascript
// Di dalam aplikasi: baca kredensial dari file 0600 milik pengguna deploy
const fs = require('fs');

function loadSecrets(path = '/opt/deploy/secrets/api.json') {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (err) {
    console.error('Gagal memuat rahasia — menolak untuk memulai');
    process.exit(1);
  }
}

// Gagal tertutup: jangan mundur ke kredensial kosong atau hard-coded
const secrets = loadSecrets();
```

Simpan file rahasia dengan `chmod 600 /opt/deploy/secrets/api.json` dan jauhkan dari repositori sepenuhnya. Memuat rahasia dari file yang dilindungi membuatnya tidak muncul di daftar proses, file ecosystem, maupun log PM2.

### File Override Systemd

```ini
# /etc/systemd/system/pm2-deploy.service.d/override.conf
[Service]
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/opt/deploy/.pm2/logs
RestrictSUIDSGID=true
RestrictNamespaces=true
```

```bash
# Terapkan dan verifikasi
sudo systemctl daemon-reload
sudo systemctl restart pm2-deploy
systemctl show pm2-deploy -p NoNewPrivileges -p ProtectSystem --no-pager
```

Flag `NoNewPrivileges=true` sangat penting untuk process manager: bahkan jika aplikasi yang dikelola dikompromikan, aplikasi itu tidak dapat meningkatkan hak istimewa melalui biner setuid. `ProtectSystem=full` membuat direktori sistem menjadi read-only, dan `ReadWritePaths` hanya mengizinkan direktori yang benar-benar ditulis oleh daemon PM2.

### Pemindaian Rahasia di CI

```bash
# Langkah continuous integration: gagalkan build jika ada kredensial bocor
if grep -RInE "(password|passwd|secret|token|api[_-]?key)\s*[:=]" \
     --exclude-dir=node_modules --exclude-dir=.git .; then
  echo "Potensi rahasia terdeteksi di repositori" >&2
  exit 1
fi
echo "Pemindaian rahasia lolos"
```

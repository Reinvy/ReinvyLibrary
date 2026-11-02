---
title: "Cheat Sheet Ekosistem Modul PM2 dan Modul Kustom"
description: "Referensi cepat untuk sistem modul PM2 — instalasi dan pembaruan modul dari npm atau repositori, konfigurasi per modul, penulisan modul internal dengan entry point pmx, baris kustom pada daftar proses, serta pengemasan untuk distribusi privat."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Ekosistem Modul PM2 dan Modul Kustom

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Memasang modul dari npm | `pm2 install pm2-logrotate` | Mengunduh paket ke `~/.pm2/node_modules` dan mengawasinya sebagai modul, bukan aplikasi |
| Mengunci versi tertentu | `pm2 install pm2-logrotate@3.0.0` | Meneruskan spesifikasi ke npm sehingga seluruh host memasang build yang sama |
| Memasang langsung dari repositori | `pm2 install pm2-hive/pm2-docker` | Menerima singkatan `owner/repo` saat modul belum dipublikasikan |
| Memperbarui modul terpasang | `pm2 module:update pm2-logrotate` | Menyelesaikan ulang modul ke versi terbaru yang cocok tanpa menyentuh aplikasi |
| Me-restart modul saja | `pm2 restart pm2-logrotate` | Mendaur ulang proses modul; aplikasi tetap mempertahankan uptime |
| Memeriksa modul | `pm2 describe pm2-logrotate` | Menampilkan path skrip modul, jumlah restart, memori, dan interpreter yang dipakai |
| Membuat kerangka modul | `pm2 module:generate pm2-heartbeat` | Membuat folder boilerplate berisi `package.json`, entry point, dan README |
| Memasang dari folder lokal | `pm2 install ./pm2-heartbeat` | Mode pengembangan: pemantauan file aktif sehingga setiap perubahan me-restart modul |
| Menampilkan konfigurasi efektif | `pm2 conf pm2-logrotate` | Mencetak nilai konfigurasi yang benar-benar dilihat modul yang berjalan |
| Mengubah satu nilai | `pm2 set pm2-logrotate:retain 14` | Menulis ke `~/.pm2/module_conf.json` dan me-restart modul secara otomatis |
| Membaca satu nilai | `pm2 get pm2-logrotate:retain` | Mencetak satu kunci konfigurasi untuk skrip dan health check |
| Menghapus override | `pm2 unset pm2-logrotate:retain` | Membuang override sehingga nilai bawaan `config` dari `package.json` berlaku kembali |
| Mengubah beberapa nilai | `pm2 multiset "pm2-logrotate:retain 14 pm2-logrotate:compress true"` | Satu perjalanan ke daemon untuk sekumpulan kunci |
| Mengalirkan log modul | `pm2 logs pm2-logrotate --lines 100` | Log modul berada di tata letak `~/.pm2/logs` yang sama dengan log aplikasi |
| Mengemas untuk distribusi privat | `pm2 package` | Memvalidasi folder modul dan membangun tarball untuk hosting internal |
| Menerbitkan versi baru | `pm2 publish --npm` | Menaikkan versi minor, melakukan commit, push, dan menjalankan `npm publish` |

## Perintah Umum

### Memasang dan Memperbarui Modul

```bash
# Pasang modul komunitas dan pastikan terdaftar sebagai modul, bukan aplikasi
pm2 install pm2-logrotate
pm2 describe pm2-logrotate | grep -E "script path|exec mode|status"

# Perbarui di tempat, lalu verifikasi versi yang benar-benar berjalan
pm2 module:update pm2-logrotate
pm2 describe pm2-logrotate | grep -E "version|restarts"

# Pasang dari repositori Git bila paketnya belum dipublikasikan
pm2 install pm2-hive/pm2-docker

# Hapus modul sepenuhnya (entri proses, folder, dan blok konfigurasinya)
pm2 uninstall pm2-heartbeat
```

Instalasi modul menjalankan npm di bawah `PM2_HOME` milik daemon, sehingga `~/.pm2/node_modules` adalah tempat semua modul terpasang. Menghapus folder itu secara manual akan merusak seluruh modul di host tanpa peringatan; selalu gunakan `pm2 uninstall`.

### Memeriksa Modul Terpasang

```bash
# Modul muncul di daftar proses biasa bersama aplikasi
pm2 ls

# Baca metadata runtime modul, termasuk path skrip yang dipakai
pm2 describe pm2-logrotate

# Pastikan isi disk dan versi yang terpasang
ls -1 ~/.pm2/node_modules | grep -v -E "^(\.|@pm2|pmx|pm2$)"
cat ~/.pm2/node_modules/pm2-logrotate/package.json | grep '"version"'

# Cetak seluruh override konfigurasi yang tersimpan untuk semua modul
cat ~/.pm2/module_conf.json
```

`module_conf.json` berada langsung di bawah `PM2_HOME`. Dua daemon dengan nilai `PM2_HOME` berbeda karena itu memiliki konfigurasi modul yang terpisah — inilah penyebab umum sebuah perbaikan "berhasil di staging tetapi tidak di produksi".

### Mengonfigurasi Modul

```bash
# Tampilkan semua kunci konfigurasi yang diekspos modul
pm2 conf pm2-logrotate

# Ubah satu kunci; modul akan restart sendiri setelah penulisan
pm2 set pm2-logrotate:retain 14

# Ubah beberapa kunci sekaligus dalam satu panggilan
pm2 multiset "pm2-logrotate:retain 14 pm2-logrotate:compress true pm2-logrotate:max_size 20M"

# Baca satu kunci untuk skrip pemantauan
pm2 get pm2-logrotate:retain

# Hapus override sehingga nilai bawaan paket berlaku
pm2 unset pm2-logrotate:retain
```

Nilai dikonversi otomatis menjadi boolean, number, atau string berdasarkan nilai yang sudah ada, dan setiap `pm2 set` me-restart modul tujuan. Gabungkan kunci yang berkaitan dengan `pm2 multiset` agar modul hanya di-restart sekali, bukan tiga kali.

### Menulis Modul Langsung di Folder Kerja

```bash
# Buat boilerplate, lalu pasang folder itu sendiri
pm2 module:generate pm2-heartbeat
cd pm2-heartbeat
pm2 install .

# Mode watch aktif, sehingga mengubah index.js langsung me-restart modul
pm2 logs pm2-heartbeat --lines 50

# Paksa restart saat yang berubah adalah metadata package.json, bukan kode
pm2 restart pm2-heartbeat

# Hapus instalasi lokal setelah eksperimen selesai
pm2 uninstall pm2-heartbeat
```

Instalasi folder menyimpan tautan ke salinan kerja Anda, sehingga modul yang Anda edit adalah modul yang berjalan. Jangan pernah membiarkan instalasi folder tertinggal di host produksi: pohon sumber menjadi dependensi runtime.

### Mengemas dan Menerbitkan

```bash
# Validasi dan bangun tarball untuk registry internal atau artifact store
cd pm2-heartbeat
pm2 package
ls -1 *.tar.gz

# Terbitkan: menaikkan versi minor, commit, push, lalu menjalankan npm publish
pm2 publish --npm

# Atau kirim tarball ke host yang tidak dapat mengakses npm
scp pm2-heartbeat-*.tar.gz deploy@host:/opt/pm2-modules/
ssh deploy@host "cd /opt/pm2-modules && tar -xzf pm2-heartbeat-*.tar.gz && pm2 install ./package"
```

## Potongan Kode

### package.json Modul dengan Nilai Konfigurasi Bawaan

```json
{
  "name": "pm2-heartbeat",
  "version": "1.0.0",
  "description": "Mengirim metrik heartbeat dan menyediakan health check sesuai permintaan",
  "dependencies": {
    "pmx": "latest"
  },
  "config": {
    "interval_seconds": 30,
    "endpoint": "https://status.internal/ingest",
    "verbose": false
  },
  "apps": [
    {
      "script": "index.js",
      "merge_logs": true,
      "max_memory_restart": "200M",
      "env": {
        "PM2_EXTRA_DISPLAY": "true"
      }
    }
  ],
  "author": "Platform Team",
  "license": "MIT"
}
```

Blok `config` menyediakan nilai bawaan yang dapat ditimpa oleh `pm2 set`. Blok `apps` mendeskripsikan cara proses modul diawasi, sehingga semua opsi yang sah pada ecosystem file — `merge_logs`, `max_memory_restart`, `env` — juga berfungsi di sini.

### Entry Point Modul dengan pmx.initModule

```javascript
const pmx = require('pmx');

// initModule mengembalikan konfigurasi hasil resolusi dan menghubungkan modul ke daemon
const conf = pmx.initModule(
  {
    // Opsional: pantau PID eksternal alih-alih proses modul itu sendiri
    pid: pmx.resolvePidPaths(['/var/run/redis.pid']),
  },
  (err, resolved) => {
    if (err) {
      console.error('inisialisasi modul gagal:', err.message);
      process.exit(1);
    }

    require('./heartbeat')(resolved);
  }
);

process.on('SIGINT', () => {
  console.log('modul berhenti, interval heartbeat:', conf.interval_seconds);
  process.exit(0);
});
```

### Membaca Nilai Konfigurasi di Dalam Logika Bisnis

```javascript
// heartbeat.js — menerima konfigurasi hasil resolusi dari pmx.initModule
module.exports = function heartbeat(conf) {
  const intervalMs = Number(conf.interval_seconds) * 1000;
  const endpoint = conf.endpoint;

  const timer = setInterval(async () => {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ts: Date.now(), host: require('os').hostname() }),
      });
      if (conf.verbose) console.log('heartbeat terkirim');
    } catch (error) {
      // Jangan melempar error dari dalam timer: modul akan restart berulang
      console.error('heartbeat gagal:', error.message);
    }
  }, intervalMs);

  process.on('SIGTERM', () => clearInterval(timer));
};
```

Setiap nilai dari `config` sudah dikonversi tipenya, sehingga `verbose` berupa boolean meskipun operator menulis `pm2 set pm2-heartbeat:verbose true`. Baca ulang konfigurasi saat restart alih-alih menyimpannya pada saat impor di dalam timer berumur panjang.

### Baris Tampilan Kustom di pm2 ls

```json
{
  "apps": [
    {
      "script": "index.js",
      "env": {
        "PM2_EXTRA_DISPLAY": "true"
      }
    }
  ]
}
```

```javascript
const pmx = require('pmx');

// Menggantikan baris proses bawaan dengan informasi yang dibutuhkan operator
pmx.configureModule({
  human_info: [
    ['Status', 'heartbeat berjalan'],
    ['Endpoint', 'status.internal'],
    ['Interval', '30 detik'],
  ],
});
```

Menyetel `PM2_EXTRA_DISPLAY` pada `env` modul adalah syarat yang mengaktifkan baris kustom; tanpa itu PM2 tetap menampilkan kolom proses standar dan keluaran `configureModule` diabaikan.

### Skrip Instalasi Modul yang Idempoten

```bash
#!/usr/bin/env bash
set -euo pipefail

MODULE="pm2-logrotate"
WANTED_CONFIG="pm2-logrotate:retain=14"

if pm2 describe "$MODULE" >/dev/null 2>&1; then
  echo "$MODULE sudah terpasang, memperbarui"
  pm2 module:update "$MODULE"
else
  echo "$MODULE belum ada, memasang"
  pm2 install "$MODULE"
fi

pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 conf "$MODULE" | grep -q "retain" || {
  echo "konfigurasi tidak diterapkan" >&2
  exit 1
}
echo "modul siap: $WANTED_CONFIG"
```

Jalankan skrip ini dari pipeline deploy sebelum `pm2 reload` agar host baru dan host lama mengarah ke keadaan modul yang sama. Penjagaan dengan `pm2 describe` membuat skrip aman dijalankan pada setiap deploy.

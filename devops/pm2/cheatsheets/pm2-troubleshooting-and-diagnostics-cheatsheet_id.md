---
title: "Cheat Sheet Troubleshooting dan Diagnostik PM2"
description: "Referensi cepat berbasis gejala untuk mendiagnosis kegagalan PM2 — crash loop, exit code, konflik port, restart karena memori, masalah daemon dan socket, serta forensik log."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Troubleshooting dan Diagnostik PM2

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Ambil status semua proses | `pm2 list` | Status, jumlah restart, uptime, dan memori tiap aplikasi |
| Ambil snapshot yang bisa diparse mesin | `pm2 jlist` | Array JSON semua proses, aman untuk diumpankan ke jq |
| Periksa satu aplikasi secara mendalam | `pm2 describe reinvy-api` | Path script, mode eksekusi, penghitung restart, path log, env |
| Tampilkan hanya aliran error | `pm2 logs reinvy-api --err` | Melewati kebisingan stdout dan menunjukkan penyebab kematian proses |
| Tampilkan N baris terakhir tanpa streaming | `pm2 logs --lines 300 --nostream` | Membaca ekor log out dan error, lalu keluar |
| Bersihkan log lama sebelum reproduksi | `pm2 flush reinvy-api` | Mengosongkan file log agar kegagalan baru tidak ambigu |
| Amati restart secara langsung | `pm2 monit` | Dashboard terminal untuk CPU, memori, dan aktivitas restart |
| Ubah kebijakan restart saat runtime | `pm2 start app.js --exp-backoff-restart-delay=200` | Backoff eksponensial antar restart untuk aplikasi yang tidak stabil |
| Naikkan batas restart karena memori | `pm2 restart reinvy-api --max-memory-restart 768M` | Me-restart proses ketika RSS melewati batas |
| Ikuti log milik daemon | `tail -f ~/.pm2/pm2.log` | Mencatat restart daemon, kegagalan spawn, dan kegagalan CLI |
| Baca log error daemon God | `tail -n 100 ~/.pm2/pm2.log` | Tempat pertama yang dicek ketika proses tidak pernah muncul |
| Pastikan daemon masih hidup | `pm2 ping` | Mencetak "pong" ketika daemon God merespons |
| Matikan lalu bangun ulang daemon | `pm2 kill` lalu `pm2 resurrect` | Membersihkan daemon yang macet sambil mempertahankan daftar proses tersimpan |
| Hasilkan bundel dukungan | `pm2 report` | Membuang versi, info sistem, log daemon, dan dump setiap aplikasi |
| Periksa izin socket IPC | `ls -l ~/.pm2/pub.sock ~/.pm2/rpc.sock` | Mode yang diharapkan `srw-------` milik user deploy |
| Cari pemilik port yang terpakai | `ss -ltnp` | Memetakan port yang mendengarkan ke pid pemiliknya |
| Lacak proses yang di-spawn PM2 | `ps -o pid,ppid,cmd -p $(pgrep -f 'reinvy-api')` | Memastikan command line sebenarnya dan pid induknya |
| Periksa supervisor di dalam container | `docker exec -it api pm2 list` | Memastikan PM2 hidup di dalam container yang berjalan |
| Verifikasi resurrection saat boot | `systemctl status pm2-deploy` | Menunjukkan apakah unit init berjalan dan apa yang dicatatnya |
| Hitung restart dari waktu ke waktu | `pm2 jlist` plus `jq '[.[] \| {name, restarts: .pm2_env.restart_time}]'` | Mengubah penghitung restart menjadi snapshot yang bisa dibandingkan |
| Deteksi aplikasi errored dalam script | `pm2 jlist` plus `jq -e 'any(.[]; .pm2_env.status != "online")'` | Keluar dengan non-zero ketika ada aplikasi yang tidak online |
| Reset penghitung setelah perbaikan | `pm2 reset all` | Mengosongkan penghitung restart agar insiden berikutnya terukur |
| Jalankan aplikasi tanpa daemon | `node app.js` | Melewati PM2 sepenuhnya untuk memisahkan bug aplikasi dari bug supervisor |
| Jalankan di foreground | `pm2 start app.js --no-daemon` | Menahan daemon di terminal Anda untuk output langsung |

## Perintah Umum

### Triase dalam Tiga Puluh Detik

```bash
# 1. Apa yang benar-benar berjalan, dan berapa kali tiap aplikasi restart?
pm2 list

# 2. Bekukan status itu sebagai JSON agar bisa dibandingkan nanti
pm2 jlist > /tmp/pm2-before.json

# 3. Untuk apa pun yang errored atau berkedip, baca output error terbaru
pm2 logs reinvy-api --err --lines 200 --nostream

# 4. Pastikan daemon itu sendiri sehat
pm2 ping && tail -n 40 ~/.pm2/pm2.log
```

Satu putaran empat perintah di atas memisahkan tiga kelas kegagalan yang sangat
berbeda: aplikasi yang crash, supervisor yang tidak bisa men-spawn, atau daemon
yang macet.

### Membaca Penghitung Restart

```bash
# Jumlah restart, uptime, dan flag ketidakstabilan untuk satu aplikasi
pm2 describe reinvy-api | grep -E "restarts|uptime|unstable|status|exec mode"

# Urutkan semua aplikasi berdasarkan jumlah restart, tertinggi lebih dulu
pm2 jlist > /tmp/pm2-state.json
jq -r '.[] | [.pm2_env.restart_time, .name, .pm2_env.status] | @tsv' /tmp/pm2-state.json | sort -rn
```

Jumlah restart tinggi dengan status yang terlihat sehat berarti crash loop
lambat: aplikasi boot, melayani beberapa saat, lalu mati. Jumlah tinggi dengan
status `errored` berarti PM2 sudah menyerah. Ketika `unstable_restarts` lebih
besar dari nol, PM2 telah mendeteksi siklus start-crash dan mulai menerapkan
`min_uptime`.

### Menerjemahkan Exit Code

```bash
# PM2 mencatat exit code terakhir di dalam environment proses
pm2 describe reinvy-api | grep -E "exit code|status"

# Ketika PM2 menyerah, ia berhenti men-spawn ulang dan menandai aplikasi errored
pm2 list --no-color | grep -w errored
```

```text
| Exit code | Sinyal | Penyebab umum                                    | Pemeriksaan pertama            |
|-----------|--------|--------------------------------------------------|--------------------------------|
| 0         | tidak  | Aplikasi selesai dengan sengaja (job, script one-shot) | Haruskah tetap hidup?    |
| 1         | tidak  | Exception tak tertangani saat startup            | pm2 logs <name> --err          |
| 12        | tidak  | Node kehabisan heap saat memparse konfigurasi    | --max-old-space-size, payload  |
| 127       | tidak  | Path interpreter atau script salah               | pm2 describe <name> cwd/exec   |
| 134       | SIGABRT| Kegagalan native module atau assertion           | Flag build native, versi node  |
| 137       | SIGKILL| OOM killer atau kill paksa                       | dmesg, limit memori container  |
| 143       | SIGTERM| Supervisor atau orkestrator menghentikannya      | Timing deploy/reload           |
| 246       | SIGINT | Penghentian graceful secara manual               | Normal saat reload             |
```

### Menyelesaikan Konflik Port dan Alamat

```bash
# Siapa yang memiliki port 3000 sekarang?
ss -ltnp | grep ':3000'

# Semua proses yang dikelola PM2 plus apa pun yang mendengarkan
pm2 list
sudo ss -ltnp | awk 'NR>1 {print $4, $6}'

# Restart hanya aplikasi yang kalah balapan, setelah port dibebaskan
pm2 restart reinvy-api --update-env
```

`EADDRINUSE` di log error hampir selalu berarti child yatim dari restart keras,
salinan kedua yang dijalankan di luar PM2, atau instance cluster yang
dikonfigurasi dengan port tetap alih-alih `process.env.PORT`.

### Mendiagnosis Restart karena Memori dan OOM Kill

```bash
# Awasi RSS tiap proses; pola gigi gergaji berarti restart memori berulang
pm2 list

# Periksa apakah OOM killer kernel ikut campur
sudo dmesg -T | grep -i -E "oom|killed process"

# Batas memori container versus yang diizinkan PM2
docker stats --no-stream api
pm2 describe reinvy-api | grep -E "max memory restart|memory"
```

Setel `max_memory_restart` di bawah batas container atau host. Jika nilainya di
atas plafon kernel, OOM killer menang dan Anda mendapat SIGKILL alih-alih
restart terkendali dengan baris log yang bisa dibaca.

### Memperbaiki Kegagalan Izin dan Socket

```bash
# Daemon milik user yang salah tidak bisa diajak bicara oleh CLI user deploy
ls -ld ~/.pm2
ls -l ~/.pm2/pub.sock ~/.pm2/rpc.sock

# Perbaiki kepemilikan setelah keliru menjalankan sudo
sudo chown -R deploy:deploy /home/deploy/.pm2
chmod 700 /home/deploy/.pm2

# Pastikan CLI bisa menjangkau daemon
pm2 ping
```

Menjalankan `pm2` dengan `sudo` satu kali saja akan membuat socket dan file log
milik root. Setiap perintah berikutnya sebagai user deploy lalu gagal dengan
error IPC atau `EACCES` sampai kepemilikan diperbaiki atau daemon dibangun ulang
di bawah akun yang benar.

### Memulihkan Daemon yang Macet

```bash
# Upaya terakhir: bongkar daemon, lalu pulihkan daftar proses tersimpan
pm2 save
pm2 kill
pm2 resurrect

# Jika daftar prosesnya sendiri rusak, mulai bersih dari file ecosystem
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

`pm2 kill` menghentikan daemon God beserta seluruh child-nya. Jalankan hanya
setelah `pm2 save`, jika tidak, daftar proses yang belum tersimpan akan hilang
dan aplikasi harus dideklarasikan ulang dari file ecosystem.

### Mengumpulkan Bundel Diagnostik

```bash
# PM2 menghasilkan satu laporan berisi versi, log daemon, dan dump aplikasi
pm2 report > /tmp/pm2-report.txt

# Tambahkan konteks sistem di sekitarnya
node --version
uname -a
systemctl status pm2-deploy --no-pager >> /tmp/pm2-report.txt
```

Laporan ini adalah cara tercepat menyerahkan kegagalan yang bisa direproduksi
kepada orang lain: ia menangkap versi PM2, Node, dan kernel bersama log daemon
serta dump proses terakhir yang diketahui.

### Forensik Log untuk Investigasi Crash

```bash
# Bersihkan, reproduksi, lalu baca — hindari mengejar kegagalan lama
pm2 flush reinvy-api
# ...picu request atau deploy yang gagal...
pm2 logs reinvy-api --err --lines 60 --nostream

# Kaitkan dengan pandangan daemon pada momen yang sama
tail -n 80 ~/.pm2/pm2.log
```

Membaca log yang sudah dibersihkan setelah reproduksi yang disengaja adalah
perbedaan antara stack trace yang bisa dipercaya dan yang terkubur di bawah
berjam-jam output rutin.

## Potongan Kode

### File Ecosystem dengan Kebijakan Restart yang Aman untuk Diagnostik

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'reinvy-api',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      // Tahan crash loop alih-alih membiarkannya berputar selamanya
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 2000,
      exp_backoff_restart_delay: 200,
      // Restart sebelum OOM killer kernel melakukannya
      max_memory_restart: '640M',
      // Satukan output setiap instance di satu tempat dan beri timestamp
      merge_logs: true,
      time: true,
      error_file: '/var/log/pm2/reinvy-api.err.log',
      out_file: '/var/log/pm2/reinvy-api.out.log',
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

### Script Triase untuk Cron atau CI

```bash
#!/usr/bin/env bash
# pm2-triage.sh — keluar non-zero ketika ada yang mati atau berkedip
set -euo pipefail

STATE=$(mktemp)
pm2 jlist > "$STATE"

BAD=$(jq -r '[.[] | select(.pm2_env.status != "online")] | length' "$STATE")
FLAPPING=$(jq -r '[.[] | select(.pm2_env.restart_time > 5)] | length' "$STATE")

if [ "$BAD" -gt 0 ] || [ "$FLAPPING" -gt 0 ]; then
  jq -r '.[] | "\(.name)\t\(.pm2_env.status)\trestarts=\(.pm2_env.restart_time)"' "$STATE"
  pm2 report > /tmp/pm2-report.txt 2>/dev/null || true
  exit 1
fi

echo "semua aplikasi online, jumlah restart normal"
```

### Membaca Penghitung Restart Tanpa CLI

```javascript
// restart-audit.js — ambil snapshot yang bisa dibandingkan untuk review pasca-insiden
const { execFileSync } = require('node:child_process');

const raw = execFileSync('pm2', ['jlist'], { encoding: 'utf8' });
const snapshot = JSON.parse(raw).map((proc) => ({
  name: proc.name,
  status: proc.pm2_env.status,
  restarts: proc.pm2_env.restart_time,
  unstable: proc.pm2_env.unstable_restarts,
  uptimeMs: Date.now() - proc.pm2_env.pm_uptime,
  rssMb: Math.round((proc.monit?.memory ?? 0) / 1024 / 1024),
  exitCode: proc.pm2_env.exit_code,
}));

console.table(snapshot);
```

### Probe Kesehatan Terprogram dengan Remediasi

```javascript
// health-probe.js — restart hanya yang benar-benar rusak, catat tindakannya
const pm2 = require('pm2');

pm2.connect((connectErr) => {
  if (connectErr) {
    console.error('daemon tidak terjangkau:', connectErr.message);
    process.exit(2);
  }

  pm2.list((listErr, apps) => {
    if (listErr) {
      console.error('list gagal:', listErr.message);
      pm2.disconnect();
      process.exit(2);
    }

    const broken = apps.filter(
      (app) => app.pm2_env.status !== 'online' || app.pm2_env.restart_time > 5,
    );

    broken.forEach((app) => {
      console.warn(
        `me-restart ${app.name}: status=${app.pm2_env.status} restarts=${app.pm2_env.restart_time}`,
      );
      pm2.restart(app.name, (restartErr) => {
        if (restartErr) console.error(`restart ${app.name} gagal:`, restartErr.message);
      });
    });

    pm2.disconnect();
    process.exit(broken.length > 0 ? 1 : 0);
  });
});
```

### Memeriksa Kegagalan Resurrection Saat Boot

```bash
# Unit init berjalan, gagal, atau tidak pernah terpicu
systemctl status pm2-deploy --no-pager
journalctl -u pm2-deploy --since "-30 min" --no-pager

# Pastikan dump tersimpan ada — resurrect tidak punya apa pun untuk dipulihkan tanpanya
ls -l ~/.pm2/dump.pm2

# Jalankan resurrection manual untuk memunculkan error sebenarnya
pm2 resurrect
```

### Preflight Sebelum Deploy yang Menangkap Tersangka Biasa

```bash
#!/usr/bin/env bash
# preflight.sh — jalankan sebelum pm2 reload di pipeline deploy
set -euo pipefail

echo "node: $(node --version)"
echo "pm2:  $(pm2 --version)"

# Port sudah dipakai sesuatu di luar PM2?
if ss -ltn | grep -q ':3000 '; then
  echo "port 3000 sudah terikat — menolak reload" >&2
  ss -ltnp | grep ':3000 ' >&2 || true
  exit 1
fi

# Ruang disk untuk log
df -h /var/log/pm2 | tail -n 1

# File ecosystem harus bisa diparse sebelum PM2 melihatnya
node -e "require('./ecosystem.config.js'); console.log('konfigurasi ecosystem OK')"
```

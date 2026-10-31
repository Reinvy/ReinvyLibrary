---
title: "Cheat Sheet Pemecahan Masalah dan Debugging Docker"
description: "Referensi cepat untuk mendiagnosis dan men-debug container, image, jaringan, sumber daya, dan build Docker menggunakan CLI Docker."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Pemecahan Masalah dan Debugging Docker

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Tampilkan kode keluar dan status | `docker inspect -f '{{.State.Status}} exit={{.State.ExitCode}}' <container>` | Mendiagnosis mengapa container berhenti |
| Stream event secara langsung | `docker events --filter container=<container>` | Pantau event start, stop, die, dan kill secara real time |
| Penggunaan sumber daya langsung | `docker stats --no-stream <container>` | Snapshot CPU, memori, dan jaringan untuk satu container |
| Proses di dalam container | `docker top <container>` | Daftar proses yang terlihat dari host beserta PID-nya |
| Rincian penggunaan disk | `docker system df` | Lihat ruang yang dipakai image, container, volume, dan cache |
| Log dengan timestamp | `docker logs -t --tail 100 <container>` | 100 baris log terakhir dengan timestamp |
| Status kesehatan | `docker inspect -f '{{.State.Health.Status}}' <container>` | Starting, healthy, atau unhealthy untuk container dengan healthcheck |
| Apakah terkena OOM-kill? | `docker inspect -f '{{.State.OOMKilled}}' <container>` | true ketika kernel OOM killer menghentikan proses |
| Binding port | `docker port <container>` | Memetakan port host yang dipublikasikan ke port container |
| Pengaturan jaringan | `docker inspect -f '{{json .NetworkSettings.Networks}}' <container>` | IP, gateway, dan jaringan yang terpasang dalam format JSON |
| Perubahan filesystem | `docker diff <container>` | Baris berflag A, D, atau C untuk perubahan sejak container dimulai |
| Salin file keluar | `docker cp <container>:/var/log/app.log ./` | Ambil file dari container untuk inspeksi di luar container |
| Timpa entrypoint | `docker run --rm -it --entrypoint sh <image>` | Dapatkan shell pada image yang entrypoint-nya gagal |
| Tampilkan layer image | `docker history --no-trunc <image>` | Lihat setiap layer dan instruksi yang membuatnya |
| Jalankan beberapa diagnostik | `docker exec -it <container> sh -c 'ps aux; cat /etc/resolv.conf'` | Eksekusi beberapa perintah diagnostik sekaligus |
| Output build lengkap | `docker build --progress=plain -t <name> .` | Cetak setiap langkah BuildKit dengan durasinya, bukan tampilan ringkas |

## Perintah Umum

### Status Container dan Kode Keluar

```bash
# Dapatkan objek status mentah sebuah container
docker inspect -f '{{json .State}}' <container> | jq .

# Kode keluar saja (0 = bersih, 137 = SIGKILL, 130 = SIGINT, ...)
docker inspect -f '{{.State.ExitCode}}' <container>

# Blokir sampai container keluar, lalu cetak kode keluarnya
docker wait <container>

# Kebijakan restart yang berlaku
docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' <container>

# Berapa kali container sudah di-restart
docker inspect -f '{{.RestartCount}}' <container>
```

Kode keluar umum yang perlu dikenali saat container berhenti mendadak:

```text
0    Program keluar dengan bersih
1    Error aplikasi (exception tidak tertangkap, assertion gagal)
125  Daemon Docker sendiri gagal memulai container
126  Perintah dalam image tidak dapat dipanggil
127  Perintah tidak ditemukan (entrypoint atau biner hilang dari image)
128+n    Dihentikan oleh sinyal n (mis. 137 = SIGKILL, 143 = SIGTERM, 139 = SIGSEGV)
130  Diinterupsi Ctrl+C (SIGINT) pada sesi interaktif
137  Di-OOM-kill oleh kernel atau dihentikan dengan kill -9
```

### Health Check dan Probe

```bash
# Riwayat kesehatan lengkap untuk container dengan HEALTHCHECK
docker inspect --format '{{json .State.Health}}' <container> | jq .

# Kode keluar probe kesehatan terakhir (0 = sehat)
docker inspect -f '{{(last .State.Health.Log).ExitCode}}' <container>

# Daftar hanya container yang tidak sehat
docker ps --filter health=unhealthy

# Ubah kebijakan restart container yang sedang berjalan
docker update --restart unless-stopped <container>

# Periksa definisi healthcheck yang tertanam di dalam image
docker inspect -f '{{json .Config.Healthcheck}}' <image>
```

### Debugging Jaringan

```bash
# Tampilkan pemetaan port yang dipublikasikan
docker port <container>

# Container yang terpasang pada sebuah jaringan, beserta IP-nya
docker network inspect -f '{{json .Containers}}' <network> | jq .

# Resolusi DNS dari dalam container (aman untuk busybox)
docker exec <container> nslookup <service-name>

# Konfigurasi resolver yang benar-benar dipakai
docker exec <container> cat /etc/resolv.conf

# Uji konektivitas ke container lain berdasarkan nama
docker exec <container> sh -c 'wget -qO- http://db:5432 || echo unreachable'

# Port host sudah terpakai? Cari proses yang memegangnya
ss -ltnp | grep :8080
```

```text
# Gejala klasik konflik port
docker: Error response from daemon: driver failed programming external
connectivity on endpoint web (Bind for 0.0.0.0:8080 failed: port is
already allocated).
```

```bash
# Diagnosa mengapa dua container tidak bisa saling terhubung:
# pastikan keduanya berbagi jaringan yang sama
docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' <container-a>
```

### Pemecahan Masalah Sumber Daya

```bash
# Snapshot CPU/memori satu kali untuk semua container
docker stats --no-stream

# Tampilan langsung untuk satu container
docker stats <container>

# Pastikan OOM kill dari kernel, bukan crash aplikasi
docker inspect -f '{{.State.OOMKilled}}' <container>

# Pesan OOM dari kernel (perlu akses root di host)
dmesg | grep -i -A2 'out of memory'

# Sesuaikan limit container yang berjalan (langsung berlaku)
docker update --memory 512m --cpus 0.5 <container>

# Ruang yang dipakai image, container, volume, dan build cache
docker system df

# Urutkan image dari yang terbesar
docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' | sort -k2 -h
```

### Inspeksi Image dan Layer

```bash
# Setiap layer beserta ukuran dan instruksi yang membuatnya
docker history --no-trunc <image>

# Jumlah layer pada image
docker image inspect -f '{{json .RootFS.Layers}}' <image> | jq 'length'

# File yang ditambah, diubah, atau dihapus pada container berjalan
docker diff <container>

# Bandingkan filesystem container dengan image-nya tanpa commit
docker export <container> -o container-fs.tar
tar -tf container-fs.tar | head -50

# Inspeksi metadata image, termasuk ENV dan EXPOSE
docker image inspect -f '{{json .Config}}' <image> | jq '.Env, .ExposedPorts'
```

### Debugging Build

```bash
# Output BuildKit lengkap dan terurut dengan durasi per langkah
docker build --progress=plain -t <name> .

# Lewati layer cache untuk mengisolasi masalah cache basi
docker build --no-cache --progress=plain -t <name> .

# Bangun ulang satu target pada Dockerfile multi-stage
docker build --target <stage-name> -t <name> .

# Debug langkah RUN yang gagal dengan mencetak setiap perintah
# (awali langkah dengan `set -x` lalu build ulang dengan --no-cache)
docker build --progress=plain --no-cache -t <name> . 2>&1 | tail -40

# Ukuran build cache dan cara memangkasnya
docker buildx du
docker builder prune -f
```

Saat langkah `RUN` gagal, penyebab paling umum adalah indeks manajer paket yang tidak lengkap, akses jaringan yang dimatikan dengan `--network=none`, atau perintah yang berhasil secara interaktif tetapi gagal di konteks build (tanpa terminal, direktori kerja berbeda, flag shell non-interaktif). Tambahkan `set -eux` di awal `RUN` yang gagal lalu build ulang dengan `--progress=plain --no-cache` untuk melihat setiap perintah yang benar-benar dieksekusi.

### Log, Event, dan Driver

```bash
# Timestamp + 100 baris terakhir, sambil mengikuti output baru
docker logs -t -f --tail 100 <container>

# Log dari rentang waktu tertentu
docker logs --since 2026-10-09T08:00:00 <container>
docker logs --until 30m <container>

# Semua event satu jam terakhir, difilter berdasarkan tipe
docker events --since 1h --filter type=container

# Pantau khusus event die/kill/oom
docker events --filter event=die --filter event=kill --filter event=oom
```

## Potongan Kode

### Container Debug Sekali Pakai yang Berbagi Namespace Jaringan

```bash
# Pasang container toolkit sekali pakai ke jaringan container yang bermasalah
docker run --rm -it --network container:<broken-container> \
  nicolaka/netshoot \
  tcpdump -i eth0 -nn port 8080
```

Image netshoot berisi tcpdump, dig, curl, iperf, iftop, dan puluhan alat jaringan lain, sehingga Anda tidak perlu menginstal apa pun di dalam image produksi.

### Memeriksa Container yang Langsung Keluar

```bash
# Jaga proses tetap hidup agar bisa diperiksa (menimpa ENTRYPOINT)
docker run --rm -d --name debug-me --entrypoint sleep <image> 3600

# Sekarang periksa environment, file, dan proses selama berjalan
docker exec -it debug-me sh
> env
> ls -la /app
> cat /app/config.yml

# Bersihkan
docker rm -f debug-me
```

### One-Liner Go-Template untuk Inspect

```bash
# Status, environment, dan bind mount dalam satu tampilan terstruktur
docker inspect -f '{{json .}}' <container> | jq '.State, .Config.Env, .HostConfig.Binds'

# Ringkasan kesehatan berbentuk tab untuk scripting
docker inspect -f '{{.Name}}\t{{.State.Status}}\t{{.State.ExitCode}}\t{{.RestartCount}}' <container>

# Array JSON ditampilkan sebagai daftar per baris (tanpa jq)
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' <container>
```

### Healthcheck Minimal

```dockerfile
FROM node:20-alpine

HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "server.js"]
```

Healthcheck mengubah container yang tampak mati tanpa keterangan menjadi informasi yang dapat ditindaklanjuti: `docker ps` melaporkan `unhealthy`, orchestrator dapat me-restart-nya, dan proxy dapat berhenti mengarahkan traffic ke container tersebut.

### Skrip Entrypoint Menunggu Dependency

```bash
#!/bin/sh
# entrypoint.sh — tahan startup sampai database menerima koneksi
set -e

until nc -z db 5432; do
  echo "menunggu db:5432..."
  sleep 2
done

exec "$@"
```

```dockerfile
FROM alpine:3.20
RUN apk add --no-cache netcat-openbsd
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["sh"]
```

Gunakan pola ini sebagai pengganti trik `sleep 10`: pola ini menghilangkan seluruh kelas kegagalan startup yang bergantung pada timing tanpa mengasumsikan nilai yang dikeraskan.

### Rotasi Log di daemon.json

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Terapkan dengan me-restart daemon: `sudo systemctl restart docker`. Pengaturan ini membatasi pemakaian disk log `json-file` default hingga kira-kira 30 MB per container, mencegah gangguan "no space left on device" pada host yang sibuk.

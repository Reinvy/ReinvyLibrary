---
title: "Cheat Sheet Keamanan Docker"
description: "Referensi cepat untuk mengeraskan container dan image Docker: user non-root, capability yang dibuang, profil seccomp, batas resource, pemindaian image, penanganan secret, dan filesystem read-only."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Keamanan Docker

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Menjalankan sebagai UID non-root | `docker run --user 10001:10001 myapp` | Menimpa user image sehingga proses tidak bisa menulis di luar path miliknya |
| Membuat root filesystem tidak bisa diubah | `docker run --read-only --tmpfs /tmp myapp` | Mencegah manipulasi binary saat runtime; pasangkan dengan tmpfs untuk ruang tulis sementara |
| Membuang seluruh capability | `docker run --cap-drop ALL myapp` | Menghapus semua capability Linux, lalu tambahkan kembali hanya yang benar-benar dibutuhkan |
| Menambah satu capability | `docker run --cap-drop ALL --cap-add NET_BIND_SERVICE myapp` | Memungkinkan bind ke port istimewa tanpa berjalan sebagai root |
| Mematikan eskalasi privilege | `docker run --security-opt no-new-privileges myapp` | Mencegah binary setuid dan file capability menaikkan hak akses |
| Memakai profil seccomp | `docker run --security-opt seccomp=./seccomp.json myapp` | Membatasi permukaan syscall hanya pada daftar yang diizinkan |
| Memakai profil AppArmor | `docker run --security-opt apparmor=docker-default myapp` | Membatasi akses file, mount, dan jaringan melalui LSM host |
| Mematikan profil default Docker | `docker run --security-opt seccomp=unconfined myapp` | Hanya untuk debugging; ini menghapus filter syscall sepenuhnya |
| Membatasi memori dan CPU | `docker run --memory 512m --cpus 1.5 myapp` | Mencegah pengurasan resource oleh tetangga dan membatasi dampak kebocoran |
| Membatasi jumlah proses | `docker run --pids-limit 100 myapp` | Menghentikan fork bomb yang bisa melumpuhkan host |
| Memindai image | `docker scout cves myapp:latest` | Melaporkan CVE yang diketahui beserta versi perbaikannya |
| Menggagalkan build karena CVE kritis | `docker scout cves --exit-code --only-severity critical myapp:latest` | Menjadikan pemindaian sebagai gate CI, bukan sekadar laporan |
| Menandatangani dan memverifikasi image | `cosign sign --key cosign.key registry.io/myapp:1.4.0` | Membuktikan artefak berasal dari pipeline Anda sebelum dideploy |
| Memeriksa capability efektif | `docker inspect -f '{{json .HostConfig.CapDrop}}' myapp` | Memastikan apa yang benar-benar diberikan saat runtime |
| Mengaudit docker socket | `ls -l /var/run/docker.sock` | Keanggotaan grup pada file ini setara dengan root di host |
| Membuat SBOM | `docker buildx build --sbom=true -t myapp .` | Menghasilkan software bill of materials bersama image |

## Perintah Umum

### Flag Pengerasan Runtime

```bash
# Menjalankan container dengan baseline aman: user tanpa hak istimewa, root
# filesystem read-only, dan tanpa privilege tambahan
docker run -d --name api \
  --user 10001:10001 \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 200 \
  --memory 512m --cpus 1.0 \
  registry.io/api:1.4.0

# Memastikan flag benar-benar diterapkan
docker inspect -f '{{.Config.User}} ro={{.HostConfig.ReadonlyRootfs}}' api
docker inspect -f '{{json .HostConfig.CapDrop}}' api
```

Berjalan sebagai UID 10001 menghilangkan keuntungan utama penyerang di dalam container: bind mount milik root, binary yang bisa ditulis, dan kemampuan memasang perkakas baru. Pasangkan `--read-only` dengan mount `--tmpfs` eksplisit, karena aplikasi yang menulis ke `/tmp` atau direktori cache akan gagal saat start.

### Capability dan Privilege

```bash
# Melihat capability yang diberikan ke container
docker inspect -f '{{json .HostConfig.CapAdd}} {{json .HostConfig.CapDrop}}' api

# Memeriksa capability proses dari dalam container
docker exec api grep Cap /proc/1/status

# Mendekode bitmask dengan capsh (dari paket libcap2-bin)
docker run --rm alpine sh -c 'apk add -q libcap && capsh --decode=00000000a80425fb'
```

Flag `--privileged` mematikan semua mekanisme perlindungan sekaligus: seluruh capability, filter seccomp, AppArmor, dan aturan device cgroup. Perlakukan ini sebagai kompromi pada host dan jangan pernah memakainya di luar lab hardware berdurasi singkat.

### Pemindaian Image dan Supply Chain

```bash
# Meninjau gambaran cepat dan CVE pada image yang dibangun
docker scout quickview registry.io/api:1.4.0
docker scout cves --only-severity critical,high registry.io/api:1.4.0

# Alternatif pemindai
trivy image --severity HIGH,CRITICAL --exit-code 1 registry.io/api:1.4.0
grype registry.io/api:1.4.0 -o table

# Memverifikasi tanda tangan sebelum deploy
cosign verify --key cosign.pub registry.io/api:1.4.0
```

### Secret Saat Runtime

```bash
# Me-mount secret sebagai file, bukan sebagai environment variable
printf '%s' "$DB_PASSWORD" | docker secret create db_password -
docker run -d --secret db_password --name api registry.io/api:1.4.0

# Padanan Compose dengan secret berbasis file
docker compose up -d   # lihat potongan kode di bawah
```

Environment variable bocor melalui `docker inspect`, `/proc/1/environ`, crash dump, dan proses anak. File di bawah `/run/secrets` di-mount di memori dan tidak muncul di metadata image.

## Potongan Kode

### Dockerfile Multi-Stage yang Diperkeras

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
# Membuat user tanpa hak istimewa dan meninggalkan root sepenuhnya
RUN addgroup -S app && adduser -S -G app -u 10001 app
WORKDIR /app
COPY --from=build --chown=10001:10001 /app /app
USER 10001:10001
EXPOSE 3000
# Build gagal bila endpoint health tidak tersedia saat runtime
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "server.js"]
```

### Service Compose dengan Baseline Keamanan

```yaml
services:
  api:
    image: registry.io/api:1.4.0
    user: "10001:10001"
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
      - seccomp:./seccomp-strict.json
    pids_limit: 200
    mem_limit: 512m
    cpus: 1.0
    secrets:
      - db_password
    ports:
      - "127.0.0.1:3000:3000"

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Profil Seccomp Minimal

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["read", "write", "openat", "close", "fstat", "mmap", "exit_group"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Mulailah dari profil default Docker lalu hapus syscall yang tidak dipakai, jangan menulis allowlist dari nol. Profil buatan tangan biasanya membuat runtime gagal dalam beberapa menit, lalu diganti dengan `seccomp=unconfined` yang justru lebih buruk daripada tidak melakukan apa pun.

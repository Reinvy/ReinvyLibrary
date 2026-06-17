---
title: "Cheat Sheet Perintah Docker"
description: "Panduan referensi cepat untuk perintah CLI Docker esensial, instruksi Dockerfile, dan sintaks Docker Compose."
category: "devops"
technology: "docker"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Perintah Docker

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Menampilkan kontainer berjalan | `docker ps` | Menampilkan kontainer aktif beserta status, port, dan nama |
| Menampilkan semua kontainer | `docker ps -a` | Menyertakan kontainer yang berhenti dalam daftar |
| Mengunduh image | `docker pull <image>:<tag>` | Mengunduh image dari registry (bawaan Docker Hub) |
| Membangun image | `docker build -t <nama>:<tag> .` | Membangun image dari Dockerfile di direktori saat ini |
| Menjalankan kontainer | `docker run -d --name <nama> <image>` | Memulai kontainer dalam mode terpisah dengan nama kustom |
| Menjalankan dengan port | `docker run -p 8080:80 <image>` | Memetakan port host 8080 ke port kontainer 80 |
| Menjalankan dengan volume | `docker run -v /host/path:/container/path <image>` | Memasang direktori host ke dalam kontainer |
| Menghentikan kontainer | `docker stop <container>` | Menghentikan kontainer yang berjalan secara baik (SIGTERM) |
| Memulai kontainer | `docker start <container>` | Memulai kontainer yang sebelumnya dihentikan |
| Menghapus kontainer | `docker rm <container>` | Menghapus kontainer yang sudah berhenti |
| Paksa hapus kontainer | `docker rm -f <container>` | Memaksa menghapus kontainer yang sedang berjalan |
| Melihat log | `docker logs <container>` | Mengambil log dari sebuah kontainer |
| Mengikuti log | `docker logs -f <container>` | Mengalirkan log secara real-time (setara tail -f) |
| Eksekusi perintah | `docker exec -it <container> bash` | Membuka shell interaktif di dalam kontainer yang berjalan |
| Inspeksi kontainer | `docker inspect <container>` | Melihat metadata detail kontainer (JSON) |
| Daftar image | `docker images` | Menampilkan semua image Docker yang tersimpan lokal |
| Hapus image | `docker rmi <image>` | Menghapus image dari penyimpanan lokal |
| Hapus sumber daya tak terpakai | `docker system prune` | Membersihkan image, kontainer, volume, dan jaringan yang menggantung |
| Hapus semua yang tak terpakai | `docker system prune -a` | Menghapus semua image yang tidak terpakai |
| Salin dari kontainer | `docker cp <container>:/path /local/path` | Menyalin file dari kontainer ke host |
| Salin ke kontainer | `docker cp /local/path <container>:/path` | Menyalin file dari host ke kontainer yang berjalan |
| Daftar jaringan | `docker network ls` | Menampilkan semua jaringan Docker |
| Buat jaringan | `docker network create <nama>` | Membuat jaringan bridge baru |
| Daftar volume | `docker volume ls` | Menampilkan semua volume Docker |
| Buat volume | `docker volume create <nama>` | Membuat volume bernama baru |

## Perintah Umum

### Manajemen Image

```bash
# Mencari image di Docker Hub
docker search nginx

# Memberi tag image untuk registry
docker tag myapp:latest myregistry.com/myapp:latest

# Mengunggah image ke registry
docker push myregistry.com/myapp:latest

# Menyimpan image ke file tarball
docker save -o myapp.tar myapp:latest

# Memuat image dari file tarball
docker load -i myapp.tar

# Menampilkan riwayat image
docker history myapp:latest
```

### Siklus Hidup Kontainer

```bash
# Menjalankan kontainer di latar depan (interaktif)
docker run -it --rm ubuntu:22.04 bash

# Menjalankan dengan variabel lingkungan
docker run -e DATABASE_URL=postgres://localhost -d postgres:16

# Menjalankan dengan batasan sumber daya
docker run --memory="512m" --cpus="1.0" nginx:alpine

# Memulai ulang kontainer
docker restart my-container

# Menjeda / melanjutkan proses
docker pause my-container
docker unpause my-container

# Mengganti nama kontainer
docker rename old-name new-name

# Menunggu kontainer selesai dan mendapatkan kode keluar
docker wait my-container
```

### Instruksi Dockerfile

```dockerfile
# Image dasar
FROM node:20-alpine AS builder

# Mengatur direktori kerja
WORKDIR /app

# Menyalin file
COPY package*.json ./
COPY src/ ./src/

# Menjalankan perintah saat build
RUN npm ci --only=production

# Mengatur variabel lingkungan
ENV NODE_ENV=production

# Membuka port
EXPOSE 3000

# Menentukan perintah startup
CMD ["node", "server.js"]

# Entrypoint alternatif
ENTRYPOINT ["docker-entrypoint.sh"]

# Menambahkan label metadata
LABEL maintainer="team@example.com" \
      version="1.0.0"

# Membuat titik mount
VOLUME ["/data"]

# Berganti pengguna untuk keamanan
USER node

# Multi-stage build: menyalin dari stage builder
COPY --from=builder /app/dist ./dist

# Pemeriksaan kesehatan
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Docker Compose

```bash
# Memulai layanan dalam mode terpisah
docker compose up -d

# Membangun dan memulai layanan
docker compose up --build -d

# Menghentikan dan menghapus kontainer
docker compose down

# Menghentikan dan menghapus semuanya (termasuk volume)
docker compose down -v

# Melihat log semua layanan
docker compose logs -f

# Membangun ulang layanan tertentu
docker compose build web

# Eksekusi perintah di layanan yang berjalan
docker compose exec web npm test

# Menampilkan layanan yang berjalan
docker compose ps

# Menentukan skala layanan
docker compose up -d --scale api=3
```

## Potongan Kode

### Dockerfile Node.js Minimal

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

### Multi-Stage Build untuk Go

```dockerfile
FROM golang:1.22 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/server .

FROM scratch
COPY --from=build /app/server /server
EXPOSE 8080
CMD ["/server"]
```

### Docker Compose untuk Aplikasi Full-Stack

```yaml
version: "3.8"
services:
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
volumes:
  pgdata:
```

### Isolasi Jaringan dengan Compose

```yaml
version: "3.8"
services:
  frontend:
    build: ./frontend
    networks:
      - frontend
  backend:
    build: ./backend
    networks:
      - frontend
      - backend
  db:
    image: postgres:16-alpine
    networks:
      - backend

networks:
  frontend:
  backend:
```

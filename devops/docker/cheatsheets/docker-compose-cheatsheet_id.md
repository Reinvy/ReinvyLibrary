---
title: "Cheat Sheet Docker Compose"
description: "Referensi cepat untuk spesifikasi dan CLI Docker Compose — definisi service, urutan startup dengan healthcheck, profil, secret dan config, interpolasi variabel lingkungan, jaringan kustom, volume bernama, penggabungan multi-file, dan perintah compose harian untuk workload produksi."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Docker Compose

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Validasi dan render konfigurasi | `docker compose config` | Parse, interpolasi, dan cetak konfigurasi gabungan yang efektif |
| Jalankan service secara detached | `docker compose up -d` | Buat dan jalankan semua container yang didefinisikan di compose.yaml |
| Build lalu jalankan | `docker compose up --build -d` | Bangun ulang image sebelum (membuat ulang) container |
| Jalankan satu service | `docker compose up -d db` | Luncurkan hanya service db beserta dependensinya |
| Hentikan dan hapus container | `docker compose down` | Hapus container dan network default dari proyek |
| Down termasuk volume | `docker compose down -v` | Sekaligus hapus volume bernama yang dideklarasikan di file |
| Streaming log service | `docker compose logs -f --tail=100 web` | Ikuti baris terakhir dari satu atau lebih service |
| Jalankan perintah sekali jalan | `docker compose run --rm api npm test` | Mulai container baru dari definisi service lalu jalankan perintah |
| Eksekusi di container berjalan | `docker compose exec api bash` | Jalankan perintah di dalam container service yang sedang berjalan |
| Tampilkan nama service | `docker compose config --services` | Tampilkan nama service setelah interpolasi dan penggabungan file |
| Skala replika | `docker compose up -d --scale api=3` | Jalankan tiga replika dari sebuah service yang direplikasi |
| Aktifkan profil | `docker compose --profile debug up -d` | Mulai service yang digerbangi oleh profil debug |
| Watch dan hot-reload | `docker compose watch` | Bangun ulang dan mulai ulang service saat file sumber berubah |
| Tampilkan environment terhitung | `docker compose config --environment` | Cetak variabel lingkungan efektif untuk service |
| Salin file | `docker compose cp api:/data/app.log .` | Salin file antara container service dan host |
| Streaming event proyek | `docker compose events` | Keluarkan event siklus hidup container secara real time |

## Perintah Umum

### Siklus Hidup Proyek

```bash
# Validasi dan tampilkan konfigurasi gabungan yang efektif
docker compose config

# Buat dan mulai container dalam mode detached
docker compose up -d

# Buat ulang semua container, abaikan status cache
docker compose up -d --force-recreate

# Hapus container yatim yang tersisa dari file compose lama
docker compose up -d --remove-orphans

# Hentikan container tanpa menghapusnya
docker compose stop

# Mulai container yang sebelumnya dihentikan
docker compose start

# Mulai ulang semua service, atau satu service saja
docker compose restart
docker compose restart api

# Hentikan dengan normal lalu hapus container dan network default
docker compose down

# Sekaligus hapus volume bernama dan image yang dibangun lokal
docker compose down -v --rmi local

# Hentikan paksa sebuah service tanpa shutdown yang normal
docker compose kill api
```

### Membangun dan Menerbitkan Image

```bash
# Bangun image untuk semua service menggunakan cache layer
docker compose build

# Bangun tanpa memakai ulang layer cache dari build sebelumnya
docker compose build --no-cache

# Bangun sekumpulan service secara paralel
docker compose build --parallel api worker

# Terbitkan image yang telah diberi tag oleh langkah build compose
docker compose push

# Tarik image terbaru tanpa membangun ulang
docker compose pull --ignore-pull-failures
```

### Inspeksi dan Debugging

```bash
# Tampilkan service yang berjalan beserta container-nya
docker compose ps

# Sertakan container yang telah dihentikan
docker compose ps -a

# Cetak konfigurasi efektif dalam format JSON
docker compose config --format json

# Tampilkan kunci tingkat atas: services, volumes, dan profiles
docker compose config --services
docker compose config --volumes
docker compose config --profiles

# Tampilkan variabel lingkungan persis seperti yang akan disuntikkan
docker compose config --environment

# Selesaikan port sisi host dari sebuah port container
docker compose port api 3000

# Tampilkan tabel proses di dalam container service
docker compose top

# Bandingkan working tree dengan container yang berjalan
docker compose diff
```

### Log dan Mode Ikuti

```bash
# Ikuti log dari semua service
docker compose logs -f

# 200 baris terakhir dari satu service dengan timestamp
docker compose logs --tail=200 --timestamps api

# Baris yang dikeluarkan dalam sepuluh menit terakhir
docker compose logs --since=10m web

# Hanya baris berlevel error
docker compose logs --level=error api
```

### Menjalankan Perintah

```bash
# Perintah sekali jalan di container BARU (migrasi, seed, skrip)
docker compose run --rm api npm run db:migrate

# Sekali jalan dengan entrypoint kustom, tanpa TTY (aman untuk CI)
docker compose run --rm -T --entrypoint node api -e "console.log(1)"

# Eksekusi perintah di dalam container yang sedang berjalan
docker compose exec api bash

# Eksekusi non-interaktif untuk skrip dan job CI
docker compose exec -T api npm test

# Salin file keluar dari container service
docker compose cp api:/app/coverage/clover.xml ./coverage/
```

### Penskalaan dan Tugas Sekali Jalan

```bash
# Jalankan tiga replika dari sebuah service
docker compose up -d --scale worker=3

# Kembali ke satu replika
docker compose up -d --scale worker=1

# Luncurkan job sekali jalan terhadap proyek yang sedang berjalan
docker compose run --rm job ./run-etl --date=2026-09-27
```

### Profil dan Penggabungan Multi-File

```bash
# Mulai service yang digerbangi oleh profil debug
docker compose --profile debug up -d

# Aktifkan beberapa profil sekaligus lewat environment
COMPOSE_PROFILES=debug,tracing docker compose up -d

# Gabungkan file override di atas file compose dasar
docker compose -f compose.yaml -f compose.prod.yaml up -d

# Arahkan seluruh proyek ke kumpulan file kustom
COMPOSE_FILE=compose.yaml:overrides/web.yaml docker compose config
```

## Potongan Kode

### File Compose Produksi Lengkap

```yaml
name: shop

services:
  api:
    build:
      context: ./api
      target: production
    image: registry.example.com/shop/api:1.4.0
    restart: unless-stopped
    init: true
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://app:${DB_PASSWORD}@db:5432/shop
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-fs", "http://localhost:3000/healthz"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    ports:
      - "127.0.0.1:3000:3000"
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
    networks:
      - backend

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: shop
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d shop"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    networks:
      - backend

networks:
  backend:

volumes:
  pgdata:
```

### Interpolasi Variabel Lingkungan

```yaml
services:
  web:
    image: nginx:alpine
    environment:
      # Nilai polos — tidak terjadi substitusi
      NODE_ENV: development
      # Substitusi dengan default pengganti
      PORT: "${PORT:-8080}"
      # Substitusi dengan default kosong
      DEBUG: "${DEBUG-}"
      # Variabel wajib — startup gagal jika tidak ada
      SECRET: "${SECRET:?SECRET harus diatur di environment}"
      # Nilai alternatif hanya jika variabel diatur
      VERSION: "${VERSION:+set}"
      # Tanda dollar yang di-escape — tanpa interpolasi
      SQL: "SELECT $$price FROM items"
```

| Pola | Hasil |
|------|-------|
| `${VAR}` | Nilai VAR, string kosong jika tidak diatur |
| `${VAR:-default}` | `default` saat VAR tidak diatur atau kosong |
| `${VAR-default}` | `default` hanya saat VAR tidak diatur |
| `${VAR:?msg}` | Error berisi `msg` saat VAR tidak diatur atau kosong |
| `${VAR:+alt}` | `alt` hanya saat VAR diatur dan tidak kosong |
| `$$` | Tanda dollar literal, menonaktifkan interpolasi |

### Urutan Startup dengan Healthcheck

```yaml
services:
  api:
    image: shop/api:1.4.0
    depends_on:
      db:
        condition: service_healthy
      seed:
        condition: service_completed_successfully

  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d shop"]
      interval: 5s
      timeout: 3s
      retries: 10

  seed:
    image: shop/db-seed:1.0.0
    environment:
      SEED_ONLY: "true"
    command: ["sh", "-c", "seed && sleep 2"]
    depends_on:
      db:
        condition: service_healthy
```

### Profil, Secret, dan Config

```yaml
services:
  app:
    image: shop/api:1.4.0
    profiles: ["production", "staging"]
    secrets:
      - db_password
      - source: aws_access_key
        target: AWS_ACCESS_KEY_ID
        uid: "1000"
        mode: 0440
    configs:
      - nginx_conf

secrets:
  db_password:
    file: ./secrets/db_password.txt
  aws_access_key:
    external: true
    name: shop-aws-key

configs:
  nginx_conf:
    file: ./nginx.conf
```

### Jaringan Kustom dan IP Statis

```yaml
services:
  app:
    image: shop/api:1.4.0
    networks:
      frontend:
        aliases:
          - api.internal
      backend:
        ipv4_address: 172.28.0.10

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
          gateway: 172.28.0.1
```

### Volume Bernama, Bind Mount, dan tmpfs

```yaml
services:
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backups:/backups:ro
      - type: tmpfs
        target: /dev/shm
        tmpfs:
          size: 268435456  # 256 MiB

  app:
    image: shop/api:1.4.0
    volumes:
      - type: bind
        source: ./config/app.yaml
        target: /etc/app/config.yaml
        read_only: true
      - type: volume
        source: logs
        target: /var/log/app
        volume:
          nocopy: true

volumes:
  pgdata:
    driver: local
  logs:
    name: shop-logs
```

### Penggabungan dan Perluasan dengan Banyak File

```yaml
# compose.yaml — definisi dasar
services:
  web:
    image: shop/web:1.0.0
    environment:
      - NODE_ENV=development
    ports:
      - "3000:3000"
```

```yaml
# compose.prod.yaml — override produksi
services:
  web:
    image: shop/web:1.0.0
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
```

```yaml
# Bidang ekstensi x- yang dibagikan melalui anchor
x-api-defaults: &api-defaults
  restart: unless-stopped
  init: true
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
    interval: 30s
    timeout: 3s

services:
  orders:
    <<: *api-defaults
    image: shop/orders:1.2.0
  payments:
    <<: *api-defaults
    image: shop/payments:1.1.0
```

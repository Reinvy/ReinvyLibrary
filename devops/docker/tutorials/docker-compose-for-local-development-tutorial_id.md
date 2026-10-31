---
title: "Tutorial Docker Compose untuk Pengembangan Lokal"
description: "Membangun stack pengembangan lokal yang reprodusibel dengan Docker Compose: service, bind mount, hot reload, healthcheck, urutan dependensi, file environment, dan profile."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Tutorial Docker Compose untuk Pengembangan Lokal

## Ringkasan

Tutorial ini membangun stack pengembangan lokal berisi tiga service — API, PostgreSQL, dan Redis — menggunakan Docker Compose. Anda akan mengonfigurasi bind mount dengan hot reload, healthcheck yang mengatur urutan startup, pelapisan file environment, serta profile agar satu file cukup untuk kebutuhan harian maupun alur debugging tambahan.

## Target Audiens

- Backend dan fullstack developer yang menjalankan aplikasi multi-service di laptop.
- Platform engineer yang bertanggung jawab membuat proses onboarding cukup dengan satu perintah.
- Developer tingkat menengah yang sudah nyaman dengan `docker run` dan ingin lingkungan yang reprodusibel.

## Prasyarat

- Docker Engine 24+ dengan plugin Compose v2 (`docker compose version`).
- Pemahaman dasar tentang Dockerfile, image, dan container, serta satu proyek application server.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membedakan bind mount dan named volume serta memilih jenis yang tepat untuk tiap path.
- Mengonfigurasi hot reload yang tetap berjalan setelah container di-restart.
- Memakai `healthchecks` dengan `depends_on: condition: service_healthy` untuk menghilangkan race saat startup.
- Melapisi konfigurasi dengan `env_file` dan memakai profile Compose untuk perkakas opsional.

## Konteks dan Motivasi

Satu service biasanya butuh database, cache, dan kadang queue. Menginstal semuanya secara native menghasilkan lingkungan yang berjalan di satu mesin tetapi rusak di mesin lain. Compose mendeskripsikan seluruh stack sebagai kode, sehingga `docker compose up` adalah keseluruhan proses setup.

Masalah yang menyakitkan bukanlah "bagaimana menjalankan container", melainkan: mengapa proses saya tidak mendeteksi perubahan file, mengapa API crash sebelum Postgres siap, dan mengapa `node_modules` saya tertimpa. Tutorial ini memusatkan perhatian pada detail tersebut.

## Konten Inti

### Service dan model Compose

File Compose mendeklarasikan service, network, dan volume. Setiap service memperoleh nama DNS yang sama dengan nama service-nya, sehingga API menghubungi database melalui host `db`, bukan `localhost` — di dalam container, `localhost` adalah container itu sendiri.

### Bind mount versus named volume

- **Bind mount** (`./src:/app/src`) memetakan direktori host ke dalam container; perubahan di host langsung terlihat, dan inilah yang memungkinkan hot reload.
- **Named volume** (`pgdata:/var/lib/postgresql/data`) dikelola Docker, bertahan setelah `down`, dan cocok untuk file database serta `node_modules`.

Jebakan klasiknya adalah me-mount seluruh proyek (`./:/app`) sementara `node_modules` di host dikompilasi untuk OS yang berbeda. Solusinya named volume di `/app/node_modules`: Docker mengisinya dari image saat pertama kali dijalankan, dan volume itu menutupi direktori host.

### Healthcheck dan urutan startup

`depends_on` tanpa kondisi hanya menunggu container *dibuat*, bukan menunggu proses di dalamnya menerima koneksi. Postgres butuh satu sampai dua detik untuk inisialisasi, sehingga API yang menjalankan migrasi saat boot akan gagal secara intermiten. `healthcheck` memeriksa sebuah perintah secara berkala dan menandai container sehat; `condition: service_healthy` membuat startup deterministik.

### Profile untuk service opsional

Profile menandai service agar hanya berjalan saat diminta. Mail catcher, admin UI, dan profiler sebaiknya berada di balik profile: `docker compose --profile tools up`. Perintah `up` default tetap ringan, dan tidak ada baris yang perlu dikomentari untuk menonaktifkannya.

## Contoh Kode

### File Compose

```yaml
# compose.yaml
services:
    api:
        build:
            context: .
            target: development
        command: npm run dev
        ports:
            - "3000:3000"
        environment:
            DATABASE_URL: postgres://app:app@db:5432/app
            REDIS_URL: redis://cache:6379
        env_file:
            - .env.local
        volumes:
            - ./src:/app/src
            - ./package.json:/app/package.json:ro
            - node_modules:/app/node_modules
        depends_on:
            db:
                condition: service_healthy
            cache:
                condition: service_started
        healthcheck:
            test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
            interval: 10s
            timeout: 3s
            retries: 5
            start_period: 20s
    db:
        image: postgres:16-alpine
        environment:
            POSTGRES_USER: app
            POSTGRES_PASSWORD: app
            POSTGRES_DB: app
        ports:
            - "5432:5432"
        volumes:
            - pgdata:/var/lib/postgresql/data
        healthcheck:
            test: ["CMD-SHELL", "pg_isready -U app -d app"]
            interval: 5s
            timeout: 3s
            retries: 10
    cache:
        image: redis:7-alpine
        command: ["redis-server", "--appendonly", "yes"]
        volumes:
            - redisdata:/data
    mailpit:
        image: axllent/mailpit:latest
        profiles: ["tools"]
        ports:
            - "8025:8025"

volumes:
    pgdata:
    redisdata:
    node_modules:
```

### Tahap development pada Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]
```

Target `development` menyertakan dependency pengembangan dan watcher; target `production` terpisah akan memangkasnya. Karena `node_modules` berupa volume, pohon dependensi dari image itulah yang benar-benar dijalankan container.

### Perintah sehari-hari

```bash
docker compose up -d --wait              # jalankan dan tunggu sampai sehat
docker compose up -d --build api         # build ulang satu service
docker compose logs -f --tail=100 api    # ikuti log satu service
docker compose --profile tools up -d     # sertakan service berprofile
docker compose down -v                   # teardown, volume ikut terhapus
```

## Insight Penting

- **Mount sumbernya, bukan akar proyek**: mount sempit seperti `./src:/app/src` menghindari file hasil build tertimpa dan sangat menurunkan beban file sharing di macOS.
- **`depends_on` saja tidak cukup**: tanpa `condition: service_healthy`, query pertama setelah cold start berlomba dengan inisialisasi Postgres dan gagal kira-kira satu dari tiga kali.
- **`--wait` membuat skrip jujur**: `docker compose up -d --wait` menunggu semua service ber-healthcheck dinyatakan sehat, sehingga onboarding dan CI menjadi satu perintah yang andal.
- **Pelapisan konfigurasi**: nilai bersama di `compose.yaml`, override non-rahasia di `.env.local` melalui `env_file`, dan file itu tidak pernah di-commit. Compose juga menginterpolasi `${VAR}` dari `.env` di akar proyek.
- **Waspadai clock drift setelah laptop sleep**: healthcheck bisa melaporkan status basi saat bangun; `docker compose restart api` biasanya lebih cepat daripada menelusuri aplikasi.

## Langkah Berikutnya

- Pindahkan urusan mendekati produksi (secret, batas resource, restart policy) ke overlay `compose.prod.yaml`.
- Baca panduan networking Docker Compose untuk memahami bridge network dan service discovery.
- Pelajari Testcontainers agar image service yang sama dapat dipakai di integration test.

## Kesimpulan

Anda kini memiliki stack di mana database terbukti siap sebelum API berjalan, perubahan kode memuat ulang server tanpa build ulang, dependensi tersimpan di volume yang tidak bisa dirusak host, dan perkakas opsional tidak mengganggu jalur default. Itulah bedanya file compose demo dengan file yang bisa diandalkan tim setiap hari.

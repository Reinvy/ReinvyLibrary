---
title: "Panduan Jaringan Docker Compose dan Orkestrasi Multi-Layanan"
description: "Panduan komprehensif tentang pola jaringan Docker Compose, orkestrasi multi-layanan, dan konfigurasi siap-produksi untuk aplikasi yang dikontainerisasi."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Jaringan Docker Compose dan Orkestrasi Multi-Layanan

## Pendahuluan

Docker Compose adalah standar de facto untuk mendefinisikan dan menjalankan aplikasi Docker multi-kontainer. Meskipun dasar-dasar `docker-compose.yml` cukup sederhana, membangun setup yang tangguh dan berorientasi produksi membutuhkan pemahaman mendalam tentang jaringan Compose, pola orkestrasi layanan, dan manajemen konfigurasi. Panduan ini mencakup praktik terbaik untuk mendesain jaringan, menghubungkan layanan, mengelola dependensi, dan menyusun file Compose untuk lingkungan pengembangan maupun produksi. Pada akhirnya, Anda akan mampu membangun arsitektur multi-layanan yang mudah dipelihara, dapat diamati, dan andal.

## Praktik Terbaik

- **Gunakan jaringan kustom daripada bridge bawaan**: Jaringan `bridge` bawaan tidak menyediakan resolusi DNS otomatis antar kontainer. Definisikan jaringan bernama untuk mengisolasi grup layanan dan memungkinkan penemuan layanan berdasarkan nama kontainer.

- **Pisahkan jaringan frontend dan backend**: Tempatkan reverse proxy dan layanan yang menghadap publik di jaringan `frontend`, serta layanan internal (database, cache, antrean pesan) di jaringan `backend`. Prinsip hak akses minimal ini mencegah paparan langsung layanan internal.

- **Deklarasikan `depends_on` dengan kondisi secara eksplisit**: Gunakan `condition: service_healthy` atau `condition: service_started` untuk mengontrol urutan startup. Tanpa kondisi, `depends_on` hanya menunggu kontainer mulai, bukan layanan di dalamnya siap.

- **Pin citra layanan ke tag dan digest spesifik**: Hindari `:latest` di produksi. Referensikan citra berdasarkan versi semantik dan digest SHA256 untuk memastikan deployment yang dapat direproduksi.

- **Gunakan file lingkungan (`.env`) untuk konfigurasi**: Simpan rahasia dan nilai spesifik lingkungan di luar `docker-compose.yml`. Referensikan placeholder `${VARIABLE}` dan muat nilai dari file `.env` atau lingkungan shell.

- **Terapkan health check untuk setiap layanan**: Health check memungkinkan Compose melaporkan kesiapan layanan dan memungkinkan kondisi `depends_on`. Gunakan `curl`, `wget`, atau endpoint khusus aplikasi.

- **Gunakan named volume daripada bind mount untuk layanan stateful**: Named volume dikelola oleh Docker, portabel di berbagai lingkungan, dan berkinerja lebih baik di macOS dan Windows. Cadangkan bind mount untuk skenario hot-reloading di pengembangan.

- **Tetapkan batasan sumber daya pada semua layanan**: Definisikan `deploy.resources.limits` (CPU, memori) untuk mencegah satu kontainer menghabiskan sumber daya host. Gunakan `deploy.resources.reservations` untuk menjamin sumber daya minimum.

- **Log ke output terstruktur (JSON/NDJSON)**: Buat layanan menulis log terstruktur ke stdout/stderr dan biarkan driver logging Docker menangani agregasi. Ini memungkinkan pengumpulan log terpusat dengan alat seperti Loki, Elasticsearch, atau CloudWatch.

- **Version control file Compose bersama kode aplikasi**: Simpan definisi Compose di repositori yang sama dengan aplikasi. Tag rilis sehingga deployment sesuai dengan konfigurasi Compose yang tepat yang digunakan selama pengujian.

## Langkah Implementasi

### Langkah 1: Definisikan Struktur Proyek

Atur repositori Anda untuk memisahkan kode aplikasi dari konfigurasi infrastruktur:

```text
project/
├── docker-compose.yml
├── docker-compose.override.yml   # pengembangan (development)
├── docker-compose.prod.yml       # produksi (production)
├── .env                          # variabel lingkungan (diabaikan git)
├── .env.example                  # template terdokumentasi
├── services/
│   ├── api/
│   │   ├── Dockerfile
│   │   └── src/
│   ├── frontend/
│   │   ├── Dockerfile
│   │   └── src/
│   └── worker/
│       ├── Dockerfile
│       └── src/
└── nginx/
    └── default.conf
```

### Langkah 2: Buat Arsitektur Multi-Jaringan

Rancang `docker-compose.yml` Anda dengan tiga tingkatan jaringan:

```yaml
networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.1.0/24
  monitoring:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.2.0/24
```

- **frontend**: reverse proxy, API gateway, aplikasi web publik.
- **backend**: layanan aplikasi, database, antrean pesan, cache.
- **monitoring**: Prometheus, Grafana, Loki; terisolasi dari lalu lintas aplikasi.

### Langkah 3: Hubungkan Layanan ke Jaringan

Lampirkan setiap layanan ke jaringan yang dibutuhkannya. Sebuah layanan dapat menjadi anggota beberapa jaringan:

```yaml
services:
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    networks:
      - frontend
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

  api:
    build: ./services/api
    expose:
      - "3000"
    networks:
      - frontend
      - backend
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 40s

  worker:
    build: ./services/worker
    networks:
      - backend
    env_file: .env
    depends_on:
      redis:
        condition: service_started
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    networks:
      - backend
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    networks:
      - backend
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

Poin penting dalam hubungan ini:
- Reverse proxy **nginx** hanya berada di jaringan `frontend`; ia tidak dapat menjangkau database.
- Layanan **api** menjadi jembatan antara `frontend` dan `backend`, bertindak sebagai pintu gerbang ke sumber daya backend.
- **Worker** hanya di `backend` — ia mengonsumsi antrean dan menulis ke database tanpa paparan publik.
- **postgres** dan **redis** terisolasi di jaringan `backend` tanpa port yang diekspos ke host.

### Langkah 4: Konfigurasi Health Check dengan Dependensi

Health check mengubah urutan startup sederhana menjadi dependensi yang digated oleh kesiapan. Kombinasi `depends_on` dengan `condition: service_healthy` memastikan layanan hanya dimulai setelah dependensinya beroperasi penuh.

```yaml
services:
  api:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started  # lebih cepat: redis siap hampir seketika
```

Untuk kasus di mana layanan memerlukan waktu untuk inisialisasi (misalnya menjalankan migrasi database), gunakan pola **init container** melalui entrypoint kustom:

```yaml
  migration-runner:
    build: ./services/api
    command: ["npx", "prisma", "migrate", "deploy"]
    networks:
      - backend
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    profiles:
      - init  # hanya berjalan ketika ditargetkan secara eksplisit
```

Jalankan migrasi sebelum memulai aplikasi:

```bash
docker compose --profile init run --rm migration-runner
docker compose up -d api worker
```

### Langkah 5: Gunakan Override Compose untuk Konfigurasi Spesifik Lingkungan

Compose mendukung banyak file yang digabungkan secara berurutan. Definisikan pengaturan bersama di file dasar dan override nilai spesifik lingkungan di file pendamping.

**docker-compose.override.yml** (pengembangan — dimuat otomatis):

```yaml
services:
  api:
    ports:
      - "3000:3000"
    volumes:
      - ./services/api/src:/app/src:ro
    environment:
      NODE_ENV: development

  postgres:
    ports:
      - "5432:5432"  # ekspos untuk alat debugging lokal

  redis:
    ports:
      - "6379:6379"
```

**docker-compose.prod.yml** (produksi — dimuat secara eksplisit):

```yaml
services:
  api:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: "1G"
        reservations:
          cpus: "0.5"
          memory: "512M"

  worker:
    restart: unless-stopped
    deploy:
      replicas: 3  # skala worker dengan docker compose up --scale
      resources:
        limits:
          cpus: "1"
          memory: "512M"

  nginx:
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro

  postgres:
    deploy:
      resources:
        limits:
          memory: "2G"
    volumes:
      - pgdata:/var/lib/postgresql/data
    # produksi: tambahkan label backup
    labels:
      - "backup=true"
```

Jalankan produksi dengan:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Langkah 6: Konfigurasi Logging dan Monitoring

Kirim log terstruktur ke stdout dan salurkan melalui driver logging Docker:

```yaml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        tag: "api"
```

Untuk deployment produksi, beralih ke driver logging terpusat:

```yaml
services:
  api:
    logging:
      driver: "loki"
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-retries: "3"
        loki-external-labels: "job=docker,env=production,service=api"
```

Tambahkan stack monitoring di file Compose yang sama:

```yaml
services:
  prometheus:
    image: prom/prometheus:v2.52
    networks:
      - monitoring
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"

  grafana:
    image: grafana/grafana:11.0
    networks:
      - monitoring
      - frontend  # dapat diakses melalui reverse proxy
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
```

### Langkah 7: Kelola Rahasia dan Konfigurasi

Jangan pernah menulis rahasia secara hardcode. Gunakan Docker secrets (mode Docker Swarm) atau file lingkungan:

```yaml
services:
  api:
    env_file:
      - .env  # nilai non-sensitif
      - .env.prod  # ditimpa saat deploy
    # Untuk Swarm:
    # secrets:
    #   - db_password
    # environment:
    #   DATABASE_URL: "postgresql://user:${POSTGRES_PASSWORD}@postgres:5432/mydb"
```

Contoh file `.env`:

```ini
# .env
POSTGRES_DB=mydb
POSTGRES_USER=app_user
POSTGRES_PASSWORD=changeme
REDIS_URL=redis://redis:6379
API_PORT=3000
NODE_ENV=production
```

### Langkah 8: Terapkan Batasan Sumber Daya dan Scaling

Tetapkan batasan sumber daya untuk menjamin stabilitas host:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: "1G"
        reservations:
          cpus: "0.25"
          memory: "256M"
```

Skala layanan stateless secara horizontal:

```bash
# Skala API menjadi 3 replika
docker compose up -d --scale api=3 api

# Skala worker secara independen
docker compose up -d --scale worker=5 worker
```

Untuk deployment Swarm produksi, gunakan `deploy.replicas` di file Compose daripada flag CLI.

### Langkah 9: Uji Jaringan dan Ketahanan

Sebelum dipromosikan ke produksi, validasi pengaturan jaringan:

```bash
# Verifikasi resolusi DNS antar layanan
docker compose exec api sh -c "getent hosts postgres"
docker compose exec api sh -c "getent hosts redis"

# Uji konektivitas dari layanan API
docker compose exec api sh -c "curl -f http://postgres:5432 && echo 'OK'"

# Periksa isolasi jaringan: nginx seharusnya TIDAK bisa menjangkau postgres
docker compose exec nginx sh -c "curl -f http://postgres:5432 && echo 'BREACH' || echo 'ISOLATED'"

# Simulasikan kegagalan layanan dan amati pemulihan health check
docker compose pause postgres
# ... tunggu health check gagal ...
docker compose unpause postgres
# ... amati API pulih melalui health check ...

# Lihat log real-time dari semua layanan
docker compose logs -f --tail=50
```

### Langkah 10: Daftar Periksa Deployment Produksi

Sebelum melakukan deployment ke produksi, verifikasi hal-hal berikut:

| Periksa | Tindakan |
|---------|----------|
| **Tag citra dipin** | Semua nilai `image:` menggunakan tag semantik + digest SHA256 |
| **Rahasia dieksternalisasi** | Tidak ada rahasia di `docker-compose.yml`; gunakan `.env` atau Swarm secrets |
| **Health check didefinisikan** | Setiap layanan memiliki blok `healthcheck` |
| **Batas sumber daya ditetapkan** | `deploy.resources.limits` dikonfigurasi untuk setiap layanan |
| **Logging dikonfigurasi** | Driver log diatur dengan rotasi atau agregasi log eksternal |
| **Kebijakan restart ditetapkan** | `restart: unless-stopped` pada semua layanan |
| **Jaringan diisolasi** | Layanan internal tidak terhubung ke jaringan publik |
| **Strategi cadangan didokumentasikan** | Volume persisten memiliki label atau skrip backup |
| **File override divalidasi** | `docker compose config` menghasilkan output yang diharapkan |
| **Pipeline CI/CD diuji** | File Compose melalui staging sebelum produksi |

Validasi konfigurasi Compose akhir:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

Ini mencetak konfigurasi yang telah digabung dan diinterpolasi — sumber kebenaran untuk apa yang sebenarnya akan di-deploy.

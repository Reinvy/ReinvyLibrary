---
title: "Membuat Aplikasi Full-Stack dengan Docker"
description: "Panduan langkah demi langkah untuk mengontainerisasi aplikasi multi-layanan (Node.js, React, PostgreSQL) menggunakan Docker dan Docker Compose."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membuat Aplikasi Full-Stack dengan Docker

## Ringkasan

Tutorial ini memandu Anda dalam mengontainerisasi aplikasi full-stack lengkap menggunakan Docker dan Docker Compose. Anda akan membuat Dockerfile untuk server API Node.js dan frontend React, mengonfigurasi layanan database PostgreSQL dengan volume persisten, menghubungkan semuanya dalam file Compose, dan mempelajari pola untuk alur kerja pengembangan dan produksi.

## Target Audiens

- Pengembang backend dan full-stack yang akrab dengan Node.js, React, dan PostgreSQL.
- Pengembang yang memahami konsep dasar Docker (image, container, port) tetapi belum menyusun aplikasi multi-layanan.
- Level Menengah.

## Prasyarat

- Docker Engine dan Docker Compose terinstal di komputer Anda.
- Keakraban dasar dengan baris perintah.
- Pengetahuan kerja tentang Node.js dan React.
- Editor kode (VS Code disarankan).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menulis Dockerfile multi-tahap yang efisien untuk aplikasi Node.js dan React.
- Mengonfigurasi Docker Compose untuk mengorkestrasi beberapa layanan.
- Menyiapkan penyimpanan persisten untuk database menggunakan volume bernama.
- Mengelola variabel lingkungan di seluruh layanan dengan aman.
- Menggunakan bind mount untuk hot-reloading di mode pengembangan.
- Memisahkan konfigurasi build untuk lingkungan pengembangan dan produksi.

## Konteks dan Motivasi

Aplikasi modern jarang berjalan sebagai satu proses tunggal. Aplikasi web tipikal terdiri dari frontend, server API, database, cache, dan seringkali antrean pesan. Menyiapkan layanan-layanan ini secara manual di setiap mesin pengembang menyebabkan masalah "di mesin saya berhasil" yang terkenal. Docker memecahkan masalah ini dengan mengemas setiap layanan beserta dependensi dan konfigurasi runtime yang tepat ke dalam container yang portabel. Docker Compose kemudian memungkinkan Anda mendefinisikan dan menjalankan seluruh tumpukan dengan satu perintah, memastikan bahwa setiap anggota tim Anda — dan setiap target deployment — melihat lingkungan yang sama.

## Konten Inti

### Memahami Arsitektur Aplikasi

Aplikasi contoh memiliki tiga layanan:

1. **Layanan API** — REST API Node.js/Express yang menyajikan data dari database PostgreSQL.
2. **Layanan Frontend** — Aplikasi halaman tunggal React yang dibangun dengan Vite dan mengonsumsi API.
3. **Layanan Database** — PostgreSQL untuk penyimpanan data persisten.

Setiap layanan berjalan di container-nya sendiri. API dan frontend dibangun dari image Docker kustom, sementara PostgreSQL menggunakan image resmi `postgres`.

### Menulis Dockerfile untuk API

Dockerfile untuk API Node.js harus menggunakan **build multi-tahap** untuk menjaga ukuran image tetap kecil. Tahap pertama menginstal dependensi produksi, dan tahap kedua hanya menyalin artefak yang diperlukan saat runtime.

Mulailah dengan image dasar Node.js, atur direktori kerja, salin manifes dependensi, instal paket, lalu salin kode sumber. Gunakan pengguna `node` sebagai pengganti root untuk keamanan yang lebih baik.

### Menulis Dockerfile untuk Frontend

Frontend React juga diuntungkan dari build multi-tahap. Tahap pertama menginstal dependensi dan menjalankan build produksi (misalnya, `npm run build`). Tahap kedua menggunakan server web ringan seperti Nginx untuk menyajikan file statis.

Pendekatan ini mengecilkan image frontend dari ratusan megabita (lingkungan Node penuh) menjadi di bawah 50 MB (file statis di belakang Nginx).

### Mengonfigurasi Database

PostgreSQL tidak memerlukan Dockerfile kustom. Image resmi dikonfigurasi sepenuhnya melalui variabel lingkungan dan volume:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` menentukan kredensial database.
- Volume bernama mempertahankan data di seluruh restart container.
- Skrip inisialisasi dapat dipasang ke `/docker-entrypoint-initdb.d/` untuk mengisi database pada saat pertama kali dijalankan.

### Mendefinisikan Layanan dengan Docker Compose

Docker Compose adalah lapisan orkestrasi. File `compose.yaml` mendefinisikan ketiga layanan, konteks build mereka, port, volume, variabel lingkungan, dan dependensi.

Konsep kunci Compose yang dibahas:

- **Konteks build** — menunjuk ke direktori yang berisi Dockerfile setiap layanan.
- **Pemetaan port** — memetakan port container ke port host agar layanan dapat berkomunikasi.
- **Volume** — volume bernama untuk persistensi database; bind mount untuk hot-reload pengembangan.
- **Variabel lingkungan** — disuntikkan ke dalam container dari file `.env` atau inline.
- **Depends on** — memastikan database dimulai sebelum API, dan API dimulai sebelum frontend (jika sesuai).
- **Health check** — memverifikasi bahwa suatu layanan benar-benar siap sebelum layanan dependen mencoba terhubung.

### Mengelola Komunikasi Jaringan

Docker Compose secara otomatis membuat jaringan default untuk semua layanan yang didefinisikan dalam file. Layanan dapat saling menjangkau melalui nama layanan mereka (misalnya, API terhubung ke `db:5432` alih-alih `localhost:5432`). Tidak diperlukan konfigurasi jaringan manual.

### Konfigurasi Pengembangan vs Produksi

Gunakan **beberapa file Compose** (atau profil Compose) untuk memisahkan kebutuhan pengembangan dan produksi:

- **Pengembangan**: Bind mount untuk live code reload, port debug diekspos, logging lebih verbose.
- **Produksi**: Image pra-bangun dari registry, tanpa bind mount, batasan sumber daya, kebijakan restart, dan health check.

### Menjalankan Tumpukan

Dengan file Compose yang siap, satu perintah membangun dan memulai semua layanan:

```bash
docker compose up --build
```

Menghentikan tumpukan sama sederhananya:

```bash
docker compose down
```

Untuk mempertahankan data database di seluruh restart, gunakan `docker compose down` tanpa flag `-v` (ini mempertahankan volume bernama).

## Contoh Kode

### Struktur Proyek

```text
fullstack-app/
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── .dockerignore
│   └── src/
│       ├── index.js
│       ├── db.js
│       └── routes/
│           └── items.js
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .dockerignore
│   ├── vite.config.js
│   ├── nginx.conf
│   └── src/
│       ├── App.jsx
│       └── main.jsx
├── db/
│   └── init.sql
├── compose.yaml
└── .env
```

### Dockerfile API (Multi-Tahap)

```dockerfile
# Tahap 1: Instal dependensi produksi
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Tahap 2: Image runtime
FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
USER appuser
EXPOSE 3000
CMD ["node", "src/index.js"]
```

### .dockerignore untuk API

```text
node_modules
npm-debug.log
.git
.env
```

### Kode Server API

```javascript
// src/index.js
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'app',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME || 'fullstack_app',
});

app.use(express.json());

app.get('/api/items', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Kueri database gagal:', err);
    res.status(500).json({ error: 'Kesalahan server internal' });
  }
});

app.post('/api/items', async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nama diperlukan' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO items (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Penyisipan gagal:', err);
    res.status(500).json({ error: 'Kesalahan server internal' });
  }
});

pool.query(`
  CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
  )
`).then(() => {
  app.listen(PORT, () => {
    console.log(`Server API berjalan di port ${PORT}`);
  });
}).catch((err) => {
  console.error('Gagal menginisialisasi database:', err);
  process.exit(1);
});
```

### Dockerfile Frontend (Multi-Tahap dengan Nginx)

```dockerfile
# Tahap 1: Build aplikasi React
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Tahap 2: Sajikan dengan Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf Frontend

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### .dockerignore Frontend

```text
node_modules
dist
.git
.env
```

### Skrip Inisialisasi Database

```sql
-- db/init.sql
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO items (name, description) VALUES
  ('Item Contoh 1', 'Ini adalah item contoh pertama.'),
  ('Item Contoh 2', 'Ini adalah item contoh kedua.')
ON CONFLICT DO NOTHING;
```

### File Docker Compose

```yaml
# compose.yaml
services:
  db:
    image: postgres:16-alpine
    container_name: fullstack-db
    env_file:
      - .env
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-app}"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: fullstack-api
    ports:
      - "3000:3000"
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: ${POSTGRES_DB}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./api/src:/app/src

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: fullstack-frontend
    ports:
      - "8080:80"
    depends_on:
      - api

volumes:
  pgdata:
```

### File Variabel Lingkungan

```text
# .env
POSTGRES_USER=app
POSTGRES_PASSWORD=ganti_di_produksi
POSTGRES_DB=fullstack_app
```

### File Override Pengembangan

```yaml
# compose.dev.yaml
services:
  api:
    environment:
      - NODE_ENV=development
    command: npx nodemon src/index.js

  frontend:
    build:
      target: build
    ports:
      - "5173:5173"
    command: npx vite --host 0.0.0.0
```

Jalankan tumpukan pengembangan dengan:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

## Insight Penting

- **Build multi-tahap sangat penting untuk image produksi.** Mereka secara drastis mengurangi ukuran image dan menghilangkan dependensi yang tidak perlu. API Node.js turun dari ~1 GB menjadi ~200 MB; frontend React dari ~1,5 GB menjadi ~50 MB.
- **Gunakan health check untuk dependensi layanan.** `depends_on` saja hanya menunggu container dimulai, bukan proses di dalamnya siap. Health check pada PostgreSQL mencegah API mogok karena database masih melakukan inisialisasi.
- **Jangan pernah menuliskan rahasia (secrets) secara hardcode di Dockerfile.** Variabel lingkungan dari file `.env` atau pipeline CI/CD Anda menjaga kredensial tetap di luar kontrol versi dan layer image.
- **Bind mount memungkinkan pengalaman pengembangan yang mulus.** Memasang direktori kode sumber Anda ke dalam container berarti Anda dapat mengedit file secara lokal dan proses yang berjalan langsung mendeteksi perubahan — tanpa perlu rebuild.
- **File `.dockerignore` sama pentingnya dengan Dockerfile.** File ini mencegah `node_modules`, artefak build, dan file konfigurasi lokal dikirim ke daemon Docker, mempercepat build dan menjaga image tetap bersih.
- **Pisahkan file Compose untuk pengembangan dan produksi** untuk menghindari penyimpangan konfigurasi. Pengembang mendapatkan hot-reload dan port debug; produksi mendapatkan batasan sumber daya, kebijakan restart, dan image pra-bangun.

## Langkah Berikutnya

- Pelajari lebih dalam tentang orkestrasi Docker dengan [sillabus Docker Swarm](../syllabi/docker-containerization-syllabus.md) yang tersedia di perpustakaan ini.
- Pelajari cara mengoptimalkan image Docker lebih lanjut dengan caching layer dan base image distroless.
- Jelajahi alat pemindaian keamanan Docker seperti Docker Scout dan Trivy.
- Pelajari dasar-dasar Kubernetes untuk membawa orkestrasi container ke tingkat berikutnya.

## Kesimpulan

Anda telah belajar cara mengontainerisasi aplikasi full-stack menggunakan Docker dan Docker Compose. Anda menulis Dockerfile multi-tahap yang efisien untuk API Node.js dan frontend React, mengonfigurasi PostgreSQL dengan volume persisten, menghubungkan semuanya dalam file Compose, dan mempelajari pola untuk lingkungan pengembangan dan produksi. Dengan keterampilan ini, Anda dapat mengemas aplikasi multi-layanan apa pun ke dalam tumpukan portabel dan reprodusibel yang bekerja secara identik di setiap mesin — dari laptop Anda hingga server produksi.

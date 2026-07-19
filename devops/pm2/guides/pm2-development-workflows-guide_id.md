---
title: "Panduan Alur Kerja Pengembangan dan Development Lokal dengan PM2"
description: "Panduan komprehensif tentang penggunaan PM2 secara efektif di lingkungan pengembangan lokal — mode watch, pola hot reloading, integrasi debugger, manajemen lingkungan, dan konfigurasi ekosistem yang berfokus pada pengembangan."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Alur Kerja Pengembangan dan Development Lokal dengan PM2

## Pendahuluan

PM2 dikenal luas sebagai process manager utama untuk aplikasi Node.js di lingkungan produksi, tetapi kemampuannya dalam pengembangan lokal sering kali diabaikan. Selama pengembangan, Anda menghadapi tantangan yang berbeda dari produksi: Anda membutuhkan siklus umpan balik yang cepat, reload otomatis saat file berubah, kemampuan attach debugger yang mulus, dan kemampuan untuk beralih antar konfigurasi lingkungan tanpa intervensi manual. PM2 menyediakan serangkaian fitur kaya yang dirancang khusus untuk alur kerja ini — mulai dari mode watch bawaan dan sinyal reload yang graceful hingga akses API programatik dan integrasi dengan Docker Compose.

Panduan ini mengkonsolidasikan pola-pola yang telah teruji untuk menggunakan PM2 di lingkungan pengembangan lokal. Anda akan mempelajari cara mengonfigurasi file ekosistem untuk pengembangan, memanfaatkan aturan watch dan ignore-watch PM2 untuk pemantauan file yang efisien, berintegrasi dengan Node.js inspector untuk debugging langkah demi langkah, mengelola monorepo multi-layanan dengan satu instance PM2, dan menyiapkan kontainer pengembangan dengan PM2 di dalam Docker. Pada akhirnya, Anda akan memiliki setup pengembangan yang cukup mirip dengan konfigurasi produksi Anda untuk menghilangkan kejutan lingkungan, namun tetap cepat, fleksibel, dan ramah bagi pengembang.

## Praktik Terbaik

### 1. Gunakan File Ekosistem Terpisah untuk Pengembangan dan Produksi

Mempertahankan konfigurasi ekosistem yang terpisah untuk setiap lingkungan mencegah pengaturan pengembangan (seperti mode watch dan logging file) bocor ke produksi. Buatlah `ecosystem.dev.config.js` khusus di samping `ecosystem.config.js` produksi Anda.

```javascript
// ecosystem.dev.config.js
module.exports = {
  apps: [
    {
      name: "api",
      script: "src/server.js",
      watch: true,
      ignore_watch: ["node_modules", "coverage", ".git", "dist"],
      watch_options: {
        followSymlinks: false,
      },
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        LOG_LEVEL: "debug",
      },
      node_args: "--inspect=9229",
    },
  ],
};
```

Jalankan konfigurasi pengembangan secara eksplisit:

```bash
pm2 start ecosystem.dev.config.js
pm2 logs api --lines 50
```

### 2. Manfaatkan Mode Watch dengan Aturan Ignore yang Cerdas

Opsi `watch` PM2 secara otomatis me-restart aplikasi Anda saat file berubah. Kunci dari setup watch yang efisien adalah daftar `ignore_watch` yang dikurasi dengan hati-hati, yang mengecualikan direktori non-source. Tanpa ini, PM2 dapat me-restart aplikasi Anda puluhan kali selama satu `npm install`.

```javascript
// Konfigurasi watch optimal untuk proyek Node.js
{
  watch: true,
  ignore_watch: [
    "node_modules",
    "coverage",
    ".git",
    "dist",         // Jangan restart saat output build berubah
    "build",
    "logs",
    "tmp",
    ".nyc_output",
    "*.log",
    "Dockerfile",
    "docker-compose*.yml",
  ],
  watch_options: {
    usePolling: false,       // Gunakan event file system asli (lebih cepat)
    interval: 1000,          // Interval polling ms (hanya relevan untuk network fs)
  },
}
```

Untuk setup monorepo di mana aplikasi Anda bergantung pada paket sibling, perluas scope watch untuk menyertakan direktori yang ter-link:

```javascript
{
  watch: ["src", "../shared-lib/src"],
  ignore_watch: ["node_modules", "../shared-lib/node_modules"],
}
```

### 3. Integrasikan Node.js Debugger dengan PM2

PM2 mendukung flag CLI Node.js melalui konfigurasi `node_args`, yang berarti Anda dapat mengaktifkan inspector bawaan langsung dari file ekosistem Anda. Ini memungkinkan Anda untuk meng-attach VS Code, Chrome DevTools, atau debugger lainnya ke proses yang dikelola PM2.

```javascript
// Aktifkan inspector pada port kustom untuk pengembangan
{
  node_args: "--inspect=0.0.0.0:9229",
}
```

Gabungkan ini dengan flag `--only` PM2 untuk memulai aplikasi tertentu dalam mode debug sementara aplikasi lain berjalan normal:

```bash
# Mulai hanya service API dengan debugger terpasang
pm2 start ecosystem.dev.config.js --only api

# Mulai semua service tapi restart worker dalam mode debug
pm2 delete worker
pm2 start ecosystem.dev.config.js --only worker --node-args "--inspect=9230"
```

Untuk integrasi VS Code, tambahkan konfigurasi launch ke `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to PM2 API",
      "port": 9229,
      "restart": true,
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app"
    }
  ]
}
```

### 4. Konfigurasi Graceful Shutdown dengan Timeout yang Ramah Pengembangan

Graceful shutdown sangat penting dalam produksi untuk menyelesaikan permintaan yang sedang berlangsung, tetapi dalam pengembangan Anda sering menginginkan siklus restart yang lebih cepat. Konfigurasikan kill timeout dan listen timeout terpisah untuk pengembangan agar siklus iterasi tetap cepat sambil tetap menerapkan pembersihan yang tepat.

```javascript
{
  // Pengembangan: timeout lebih pendek untuk iterasi lebih cepat
  kill_timeout: 2000,        // Tunggu 2 detik untuk graceful shutdown
  listen_timeout: 2000,      // Tunggu 2 detik untuk aplikasi mulai mendengarkan
  shutdown_with_message: true, // Kirim pesan shutdown kustom
}
```

Implementasikan signal handler di aplikasi Anda yang melakukan pembersihan tetapi keluar dengan cepat:

```javascript
// server.js
const server = require("http").createServer(app);

process.on("SIGINT", async () => {
  console.log("Melakukan shutdown secara graceful...");
  await server.close();
  // Dalam pengembangan, lewati pemutusan database untuk kecepatan
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Menerima SIGTERM — melakukan shutdown...");
  await server.close();
  process.exit(0);
});

server.listen(3000);
```

### 5. Kelola Variabel Lingkungan dengan File `.env` dan Override Ekosistem

Simpan variabel khusus lingkungan dalam file `.env` dan referensikan dalam konfigurasi ekosistem Anda menggunakan opsi `env_file` PM2. Ini menjaga kerahasiaan tetap keluar dari version control sambil mempertahankan pemisahan yang bersih antar lingkungan.

```bash
# .env.development
DATABASE_URL=postgres://localhost:5432/myapp_dev
REDIS_URL=redis://localhost:6379
API_KEY=dev-key-12345
LOG_LEVEL=debug
```

```javascript
// ecosystem.dev.config.js
module.exports = {
  apps: [
    {
      name: "api",
      script: "src/server.js",
      env_file: ".env.development",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
    },
    {
      name: "worker",
      script: "src/worker.js",
      env_file: ".env.development",
      env: {
        NODE_ENV: "development",
        QUEUE_CONCURRENCY: 2,
      },
    },
  ],
};
```

PM2 memuat variabel dalam urutan ini (yang lebih akhir menimpa yang lebih awal): blok `env` default → `env_file` → blok `env_*` khusus lingkungan → variabel lingkungan shell. Gunakan prioritas ini untuk melapiskan konfigurasi secara terprediksi.

### 6. Struktur Logging Pengembangan untuk Keterbacaan

Dalam produksi, Anda biasanya menggunakan logging JSON terstruktur (dengan Pino atau Bunyan) untuk pemrosesan mesin. Dalam pengembangan, prioritaskan keterbacaan manusia dengan output yang diformat dan level log berwarna.

```javascript
// ecosystem.dev.config.js — logging pengembangan
{
  output: "./logs/dev-out.log",
  error: "./logs/dev-err.log",
  log_date_format: "HH:mm:ss.SSS",
  merge_logs: true,         // Gabungkan stream stdout dan stderr
}
```

Salurkan log PM2 melalui formatter untuk keterbacaan yang lebih baik:

```bash
# Lihat log dengan timestamp dan output berwarna
pm2 logs api --format --raw | npx pino-pretty --colorize

# Ikuti beberapa service dengan label
pm2 logs --nostream
pm2 prettylog api worker scheduler
```

### 7. Gunakan PM2 untuk Orkestrasi Layanan Monorepo

Saat bekerja dengan monorepo yang berisi banyak service (server API, background worker, WebSocket gateway, cron jobs), file ekosistem multi-aplikasi PM2 menyediakan satu perintah untuk memulai, menghentikan, dan memantau semua service secara bersamaan. Ini adalah peningkatan produktivitas yang signifikan dibandingkan mengelola terminal terpisah atau panel tmux.

```javascript
// ecosystem.dev.config.js — orkestrasi monorepo
const path = require("path");

module.exports = {
  apps: [
    {
      name: "api-gateway",
      cwd: "./packages/gateway",
      script: "src/index.js",
      watch: ["./packages/gateway/src"],
      env: { PORT: 3000, NODE_ENV: "development" },
    },
    {
      name: "user-service",
      cwd: "./packages/user-service",
      script: "src/index.js",
      watch: ["./packages/user-service/src"],
      env: { PORT: 3001, DATABASE_URL: "postgres://localhost:5432/users" },
    },
    {
      name: "worker",
      cwd: "./packages/worker",
      script: "src/index.js",
      watch: ["./packages/worker/src"],
      env: { QUEUE_CONCURRENCY: 2, NODE_ENV: "development" },
    },
    {
      name: "scheduler",
      cwd: "./packages/scheduler",
      script: "src/index.js",
      watch: ["./packages/scheduler/src"],
      env: { CRON_INTERVAL: "*/5 * * * *" },
    },
  ],
};
```

Mulai semua service dengan satu perintah:

```bash
pm2 start ecosystem.dev.config.js
pm2 status   # Menampilkan semua 4 service dengan status masing-masing
```

### 8. Padukan PM2 dengan Docker Compose untuk Lingkungan Lokal yang Konsisten

Docker Compose menyediakan service infrastruktur (PostgreSQL, Redis, RabbitMQ) sementara PM2 mengelola proses aplikasi Node.js Anda. Pemisahan ini menjaga urusan aplikasi tetap dalam domain PM2 dan urusan infrastruktur dalam domain Docker.

```yaml
# docker-compose.dev.yml
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp_dev
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
      - "9229:9229"
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis
    command: npx pm2 start ecosystem.dev.config.js --no-daemon

volumes:
  pgdata:
```

Di dalam Dockerfile pengembangan, instal PM2 secara global dan pastikan entrypoint memulai PM2 di foreground:

```dockerfile
# Dockerfile.dev
FROM node:20-slim

WORKDIR /app

RUN npm install -g pm2

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000 9229

CMD ["npx", "pm2-runtime", "start", "ecosystem.dev.config.js"]
```

### 9. Uji Konfigurasi PM2 Sebelum Mendeploy ke Produksi

PM2 menyediakan perintah untuk memvalidasi file ekosistem Anda dan mensimulasikan konfigurasi tanpa benar-benar memulai proses. Gunakan ini dalam alur kerja lokal Anda untuk menangkap kesalahan sintaks dan penyimpangan konfigurasi sebelum mencapai produksi.

```bash
# Validasi sintaks file ekosistem
pm2 ecosystem --validate ecosystem.config.js

# Dry-run: tampilkan apa yang akan dilakukan PM2 tanpa memulai apapun
pm2 start ecosystem.config.js --dry-run

# Tampilkan konfigurasi efektif yang telah di-resolve
pm2 show api --format json
```

Untuk pengujian otomatis, gunakan API programatik PM2 dalam rangkaian pengujian Anda:

```javascript
// tests/pm2-config.test.js
const pm2 = require("pm2");

describe("Konfigurasi ekosistem PM2", () => {
  beforeAll((done) => {
    pm2.connect((err) => {
      if (err) return done(err);
      pm2.start("./ecosystem.dev.config.js", done);
    });
  });

  afterAll((done) => {
    pm2.stop("api", () => {
      pm2.disconnect(done);
    });
  });

  test("Service API berjalan dan merespons", async () => {
    const proc = await new Promise((resolve) => {
      pm2.describe("api", (err, list) => resolve(list[0]));
    });
    expect(proc).toBeDefined();
    expect(proc.pm2_env.status).toBe("online");
  });

  test("Service worker terdaftar", async () => {
    const proc = await new Promise((resolve) => {
      pm2.describe("worker", (err, list) => resolve(list[0]));
    });
    expect(proc.pm2_env.name).toBe("worker");
  });
});
```

### 10. Gunakan Max Memory Restart PM2 sebagai Jaring Pengaman Pengembangan

Kebocoran memori dapat terjadi selama pengembangan dan tidak terdeteksi hingga menyebabkan insiden produksi. Tetapkan batas `max_memory_restart` yang konservatif dalam konfigurasi pengembangan Anda untuk menangkap kebocoran lebih awal dalam siklus pengembangan.

```javascript
{
  // Pengembangan: batas memori lebih ketat untuk deteksi kebocoran dini
  max_memory_restart: "300M",
}
```

Gabungkan ini dengan pembuatan heap dump saat restart untuk menangkap profil memori guna dianalisis:

```bash
# Hasilkan heap dump sebelum PM2 me-restart proses
pm2 trigger api heapdump
```

## Langkah Implementasi

### Langkah 1: Siapkan File Ekosistem Pengembangan

Buat file ekosistem khusus pengembangan di root proyek Anda:

```bash
touch ecosystem.dev.config.js
```

Tulis konfigurasi dasar dengan mode watch aktif dan pengaturan yang sesuai untuk pengembangan:

```javascript
// ecosystem.dev.config.js
module.exports = {
  apps: [
    {
      name: "app",
      script: "src/index.js",
      watch: true,
      ignore_watch: ["node_modules", ".git", "coverage", "logs", "dist"],
      watch_options: {
        followSymlinks: false,
      },
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        LOG_LEVEL: "debug",
      },
      node_args: "--inspect=9229",
      kill_timeout: 2000,
      listen_timeout: 2000,
      max_memory_restart: "300M",
    },
  ],
};
```

### Langkah 2: Konfigurasi Hook Linter dan Formatter Lokal

Mode watch PM2 me-restart aplikasi Anda saat file berubah. Padukan dengan file watcher yang melakukan lint dan format kode Anda sebelum PM2 mendeteksi perubahan, mencegah restart loop dari sintaks yang rusak:

```bash
# Instal onchange untuk file-watching linting
npm install --save-dev onchange

# Di package.json scripts
{
  "dev": "pm2 start ecosystem.dev.config.js && onchange 'src/**/*.js' -- npx eslint --fix {{changed}}"
}
```

### Langkah 3: Mulai Lingkungan Pengembangan

Jalankan konfigurasi pengembangan dan verifikasi bahwa semua proses berjalan:

```bash
# Mulai dengan konfigurasi pengembangan
pm2 start ecosystem.dev.config.js

# Verifikasi semua proses online
pm2 status

# Pantau log secara real-time
pm2 logs app --format

# Akses output proses yang berjalan
pm2 show app
```

### Langkah 4: Debug Aplikasi dengan Inspector

Attach Node.js debugger ke proses yang dikelola PM2:

```bash
# Pastikan proses dimulai dengan --inspect
pm2 show app | grep "inspect"

# Verifikasi bahwa inspector tersedia
curl -s http://localhost:9229/json/list | python3 -m json.tool
```

Buka `chrome://inspect` di Chrome atau konfigurasi konfigurasi attach VS Code untuk terhubung ke port 9229. Tetapkan breakpoint di kode sumber Anda dan picu jalur kode yang relevan — PM2 akan menjeda eksekusi di breakpoint sambil terus mengelola siklus hidup proses.

### Langkah 5: Simulasikan Pengujian Konfigurasi Sebelum Deployment

Jalankan pemeriksaan validasi pada konfigurasi ekosistem Anda untuk memastikan sintaksnya benar dan sesuai dengan perilaku yang diharapkan:

```bash
# Periksa kesalahan sintaks di file ekosistem
node -e "require('./ecosystem.dev.config.js')"

# Dry-run untuk melihat nilai yang di-resolve
pm2 start ecosystem.dev.config.js --dry-run

# Verifikasi bahwa proses restart saat file berubah
echo "// test" >> src/index.js
sleep 2
pm2 status | grep "restart"
```

### Langkah 6: Transisi Antara Pengembangan dan Produksi

Saat beralih dari pengembangan ke deployment produksi, tukar file ekosistem dan nonaktifkan pengaturan khusus pengembangan:

```bash
# Hentikan instance pengembangan
pm2 delete ecosystem.dev.config.js

# Mulai konfigurasi produksi
pm2 start ecosystem.config.js --env production

# Verifikasi peralihan
pm2 status
```

Gunakan flag `--env` PM2 untuk memilih blok lingkungan tanpa mengubah file konfigurasi:

```bash
# Mulai dengan override lingkungan staging
pm2 start ecosystem.dev.config.js --env staging

# Timpa nilai tertentu melalui CLI
pm2 start ecosystem.dev.config.js --env production --node-args ""
```

Pendekatan ini menjaga file ekosistem pengembangan Anda sebagai satu-satunya sumber kebenaran sambil memungkinkan override khusus lingkungan melalui sistem konfigurasi berlapis PM2.

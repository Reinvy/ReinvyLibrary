---
title: "Panduan Manajemen Environment di PM2"
description: "Praktik terbaik mengelola konfigurasi environment di PM2: blok env pada ecosystem.config.js, NODE_ENV, dotenv, serta memisahkan secret dari konfigurasi biasa di dev, staging, dan produksi."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Manajemen Environment di PM2

## Pendahuluan

PM2 menjalankan aplikasi Node.js sebagai proses daemon berumur panjang, tetapi nilai yang dibaca aplikasi saat mulai — URL basis data, kunci API, feature flag — berbeda antara laptop Anda, server staging, dan produksi. Panduan ini menunjukkan cara memberikan nilai-nilai tersebut ke PM2 dengan benar menggunakan blok `env` pada `ecosystem.config.js`, konvensi `NODE_ENV`, `dotenv` untuk pemuatan berbasis file, serta aturan jelas tentang apa yang masuk ke config versus apa yang harus diperlakukan sebagai secret.

## Praktik Terbaik

- **Gunakan satu `ecosystem.config.js` per proyek**: simpan nama proses, path script, dan pengaturan level aplikasi dalam satu file yang dikomit per environment (`--env staging`, `--env production`). Ini membuat deployment dapat diulang dan mudah ditinjau.
- **Utamakan blok `env` biasa daripada varian `env_<nama>`**: PM2 menggabungkan blok `env` dasar dengan blok `env_<nama>` untuk environment yang Anda pilih lewat `--env`. Letakkan nilai bersama di `env` dan override spesifik environment di blok bernama.
- **Setel `NODE_ENV` secara eksplisit dan akurat**: Express, Laravel, dan sebagian besar framework mengubah perilaku (logging, cache, verbositas error) berdasarkan `NODE_ENV`. Jangan biarkan bernilai `undefined` — itu diam-diam mengaktifkan jalur kode khusus development di produksi.
- **Jangan pernah mengomit secret di `ecosystem.config.js`**: file ini sering masuk ke repositori. Simpan secret di secret manager (AWS Secrets Manager, Vault) atau di file `.env` di server, lalu interpolasikan saat deployment.
- **Biarkan `dotenv` menangani config berbasis file**: ketika alat deployment sudah menyalin `.env` ke server, jaga `ecosystem.config.js` bebas secret dan muat file di aplikasi (`import 'dotenv/config'`) atau gunakan `env_file` pada file ecosystem.
- **Gagal cepat saat variabel hilang**: validasi variabel environment wajib saat aplikasi mulai dan keluar dengan pesan error yang jelas, alih-alih crash belakangan dengan error basis data yang membingungkan.

## Langkah Implementasi

### Langkah 1: Buat file ecosystem dengan blok env

Mulai dari satu `ecosystem.config.js` yang mendeklarasikan blok `env` bersama serta override `env_staging` dan `env_production`. PM2 menggabungkannya saat Anda memberikan `--env`.

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'blog-api',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        LOG_LEVEL: 'debug',
        APP_URL: 'http://localhost:3000',
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 8080,
        LOG_LEVEL: 'info',
        APP_URL: 'https://staging.example.com',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
        LOG_LEVEL: 'warn',
        APP_URL: 'https://example.com',
      },
    },
  ],
};
```

### Langkah 2: Muat secret secara terpisah, jangan pernah di file ecosystem

`ecosystem.config.js` hanya boleh membawa konfigurasi non-secret. Gunakan `dotenv` di dalam aplikasi untuk memuat file `.env` yang berisi secret. File tersebut hanya ada di server dan dikecualikan dari version control.

```bash
# .gitignore
.env
.env.staging
.env.production
```

```javascript
// src/config.js
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
});

// Gagal cepat: keluar dengan pesan jelas, bukan crash di tengah request.
const result = schema.safeParse(process.env);
if (!result.success) {
  console.error('Variabel environment hilang atau tidak valid:');
  for (const issue of result.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = result.data;
```

### Langkah 3: Interpolasi secret saat deployment

Jika pipeline deployment memiliki akses ke secret manager, interpolasi nilai ke file `.env` di server sebelum menjalankan PM2, sehingga sumber kebenaran tetap secret manager dan repositori — bukan file yang diedit manual di satu mesin.

```bash
# .github/workflows/deploy.yml (cuplikan)
- name: Tulis file env produksi
  run: |
    echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> .env
    echo "REDIS_URL=${{ secrets.REDIS_URL }}" >> .env
    echo "STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY }}" >> .env

- name: Deploy dengan PM2
  run: |
    npm ci --omit=dev
    npm run build
    pm2 start ecosystem.config.js --env production
    pm2 save
```

### Langkah 4: Jalankan di environment yang tepat dan verifikasi

Mulai proses dengan `--env` yang sesuai, lalu pastikan proses memakai nilai yang diharapkan. Blok `env_<nama>` selalu menang atas blok `env` dasar untuk kunci yang didefinisikannya.

```bash
# Jalankan environment staging
pm2 start ecosystem.config.js --env staging

# Periksa environment hasil gabungan proses yang berjalan
pm2 env 0

# Pastikan NODE_ENV dan APP_URL benar-benar aktif
pm2 env 0 | grep -E 'NODE_ENV|APP_URL|LOG_LEVEL'

# Simpan daftar proses agar bertahan setelah mesin reboot
pm2 save
```

Jika ada nilai yang terlihat salah, pastikan file benar-benar diparsing oleh `dotenv` dan tidak ada proses lama ber-environment basi yang masih berjalan: `pm2 delete all` diikuti `pm2 start` baru mencegah kebingungan akibat state sisa dari proses sebelumnya.

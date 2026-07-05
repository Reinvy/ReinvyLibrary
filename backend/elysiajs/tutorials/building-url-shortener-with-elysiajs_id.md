---
title: "Membangun URL Shortener dengan Elysia.js"
description: "Tutorial berbasis proyek untuk membangun layanan pemendek URL (URL shortener) dengan Elysia.js, mencakup pembuatan kode pendek, analitik klik, dan autentikasi API key."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun URL Shortener dengan Elysia.js

## Ringkasan

Tutorial ini memandu Anda dalam membangun layanan pemendek URL (URL shortener) yang lengkap menggunakan **Elysia.js** dan **Bun SQLite**. Anda akan mempelajari cara menghasilkan kode pendek yang unik, menyimpan pemetaan URL ke database, melacak analitik klik dengan data referrer dan user-agent, melindungi API dengan autentikasi API key, serta menyajikan REST API dan penangan pengalihan (redirect handler) — semuanya dalam satu aplikasi Elysia. Pada akhirnya, Anda akan memiliki layanan pemendek URL yang siap produksi.

## Target Audiens

- Pengembang backend yang terbiasa dengan TypeScript atau JavaScript.
- Pengembang yang memiliki pengetahuan dasar tentang REST API dan ingin mempelajari Elysia.js melalui proyek praktis.
- Pengguna Bun yang mencari contoh aplikasi dunia nyata.

## Prasyarat

- **Bun** terinstal (versi 1.1 atau lebih baru). Verifikasi dengan `bun --version`.
- Pemahaman dasar sintaks TypeScript (tipe, antarmuka, async/await).
- Keakraban dengan konsep HTTP (rute, metode, kode status, pengalihan).
- REST client (curl, Postman, atau Hoppscotch) untuk menguji API.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menyiapkan proyek Elysia.js dengan TypeScript dan Bun.
- Mendesain dan mengintegrasikan skema database Bun SQLite untuk penyimpanan URL dan analitik.
- Mengimplementasikan pembuatan kode pendek dengan logika tahan-benturan (collision-resistant).
- Membangun endpoint REST API untuk membuat, menampilkan, memperbarui, dan menghapus URL pendek.
- Membuat guard autentikasi API key untuk melindungi endpoint manajemen.
- Mengimplementasikan penangan pengalihan yang mencatat analitik klik sebelum mengalihkan.
- Mendokumentasikan API secara otomatis dengan plugin Swagger Elysia.
- Menerapkan pembatasan laju (rate limiting) untuk mencegah penyalahgunaan.

## Konteks dan Motivasi

Pemendek URL adalah infrastruktur internet yang ada di mana-mana. Layanan seperti bit.ly dan TinyURL mengubah URL panjang menjadi tautan ringkas yang mudah dibagikan sambil menyediakan analitik klik yang berharga. Membangunnya dari awal adalah proyek yang sangat baik untuk mempelajari framework web karena mencakup hampir semua konsep penting: routing, integrasi database, autentikasi, caching, pembatasan laju, dan penanganan pengalihan.

Elysia.js sangat cocok untuk tugas ini — runtime ringannya di atas Bun menghasilkan pengalihan di bawah satu milidetik, dan validasi TypeBox bawaan memastikan API Anda tetap type-safe dengan sedikit boilerplate. Dengan mengimplementasikan proyek ini, Anda akan mendapatkan pengalaman praktis yang dapat ditransfer langsung ke pembuatan layanan Elysia berbasis data lainnya.

## Konten Inti

### Persiapan Proyek

Mulai dengan membuat proyek Elysia baru dengan TypeScript:

```bash
mkdir elysia-url-shortener
cd elysia-url-shortener
bun init -y
bun add elysia @elysiajs/swagger @elysiajs/rate-limit
bun add -d @types/bun
```

Selanjutnya, buat entry point utama dan modul database:

```text
elysia-url-shortener/
├── src/
│   ├── index.ts          # Entry point aplikasi
│   ├── db.ts             # Setup dan query SQLite
│   ├── auth.ts           # Guard autentikasi API key
│   ├── routes/
│   │   ├── shortener.ts  # Rute CRUD pemendekan URL
│   │   └── redirect.ts   # Penangan pengalihan dan analitik
│   └── utils.ts          # Pembuatan kode pendek dan helper
├── package.json
└── tsconfig.json
```

### Desain Skema Database

Pemendek URL membutuhkan dua tabel: satu untuk menyimpan pemetaan URL dan satu lagi untuk analitik klik. Buat `src/db.ts`:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("data/urlshortener.db");

// Aktifkan mode WAL untuk performa baca konkuren yang lebih baik
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA foreign_keys = ON;");

db.run(`
  CREATE TABLE IF NOT EXISTS urls (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code  TEXT    NOT NULL UNIQUE,
    long_url    TEXT    NOT NULL,
    api_key_id  INTEGER NOT NULL DEFAULT 0,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS clicks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code  TEXT    NOT NULL,
    clicked_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    referrer    TEXT    DEFAULT '',
    user_agent  TEXT    DEFAULT '',
    ip_address  TEXT    DEFAULT '',
    FOREIGN KEY (short_code) REFERENCES urls(short_code)
  )
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_clicks_short_code
  ON clicks(short_code)
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_urls_short_code
  ON urls(short_code)
`);

export { db };
```

**Pertimbangan skema**: Menggunakan `short_code` sebagai kolom `UNIQUE` mencegah entri duplikat di tingkat database. Tabel `clicks` menyimpan setiap peristiwa pengalihan secara terpisah, memungkinkan analitik per-tautan dan agregasi berbasis waktu. Kolom `api_key_id` menghubungkan setiap URL dengan API key yang membuatnya, memungkinkan lingkup per-key dalam penyebaran multi-tenant.

### Pembuatan Kode Pendek

Kode pendek harus ringkas, aman untuk URL, dan tahan benturan. Kode alfanumerik 7-karakter menggunakan alfabet base-62 (26 huruf kecil + 26 huruf besar + 10 digit) menyediakan lebih dari 3,5 triliun kombinasi. Buat `src/utils.ts`:

```typescript
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 7;

/**
 * Menghasilkan kode pendek acak secara kriptografis.
 * Menggunakan crypto.getRandomValues() untuk keacakan sejati, bukan Math.random().
 */
export function generateShortCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

/**
 * Memvalidasi bahwa URL memiliki skema yang dapat diterima.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Memformat data jumlah klik untuk respons API.
 */
export function formatAnalytics(rows: Array<{ date: string; count: number }>) {
  return rows.map((row) => ({
    date: row.date,
    clicks: row.count,
  }));
}
```

Fungsi `crypto.getRandomValues()` menyediakan keacakan yang aman secara kriptografis, yang penting untuk kode pendek — kode yang dapat diprediksi akan memungkinkan siapa pun untuk menghitung semua URL yang dipendekkan dalam sistem. Kode ini juga memvalidasi skema URL untuk mencegah penyalahgunaan protokol `javascript:` atau `file:`.

### Guard Autentikasi API Key

Buat `src/auth.ts` untuk membuat guard Elysia yang mengautentikasi permintaan menggunakan header `X-API-Key`:

```typescript
import { Elysia, t } from "elysia";

// Penyimpanan API key dalam memori (ganti dengan tabel database di produksi)
const API_KEYS = new Map<string, number>([
  ["sk-demo-key-001", 1],
  ["sk-demo-key-002", 2],
]);

/**
 * Guard Elysia yang memvalidasi header X-API-Key.
 * Menambahkan apiKeyId ke konteks permintaan jika berhasil.
 */
export const apiKeyGuard = new Elysia({ name: "api-key-guard" })
  .guard({
    headers: t.Object({
      "x-api-key": t.String({ minLength: 8 }),
    }),
  })
  .resolve(({ headers, set }) => {
    const apiKey = headers["x-api-key"];
    const apiKeyId = API_KEYS.get(apiKey);

    if (!apiKeyId) {
      set.status = 401;
      return {
        success: false as const,
        error: "API key tidak valid atau tidak ada",
      };
    }

    return {
      success: true as const,
      apiKeyId,
    };
  });
```

Guard ini berjalan sebelum rute apa pun yang menggunakannya. Jika header `X-API-Key` tidak ada atau tidak valid, permintaan ditolak dengan status 401 sebelum mencapai penangan rute. Dalam produksi, Anda akan menyimpan API key di database SQLite dengan hash rahasia.

### Rute Pemendekan URL

Buat `src/routes/shortener.ts` dengan operasi CRUD lengkap:

```typescript
import { Elysia, t } from "elysia";
import { db } from "../db";
import { generateShortCode, isValidUrl } from "../utils";
import { apiKeyGuard } from "../auth";

export const shortenerRoutes = new Elysia({ prefix: "/api" })
  .use(apiKeyGuard)
  .guard({
    // Semua rute dalam grup ini memerlukan autentikasi
    beforeHandle: ({ set, success }) => {
      if (!success) {
        set.status = 401;
        return { error: "Tidak terotorisasi" };
      }
    },
  })
  .post(
    "/shorten",
    async ({ body, apiKeyId }) => {
      const { url, customCode } = body;

      if (!isValidUrl(url)) {
        return { error: "URL tidak valid. Harus diawali http:// atau https://" };
      }

      let shortCode = customCode;
      if (shortCode) {
        // Periksa keunikan kode kustom
        const existing = db
          .query("SELECT id FROM urls WHERE short_code = ?")
          .get(shortCode) as { id: number } | undefined;
        if (existing) {
          return { error: "Kode kustom sudah digunakan" };
        }
        if (shortCode.length < 4 || shortCode.length > 16) {
          return { error: "Kode kustom harus 4-16 karakter" };
        }
      } else {
        // Hasilkan dengan percobaan ulang benturan
        for (let attempt = 0; attempt < 10; attempt++) {
          shortCode = generateShortCode();
          const existing = db
            .query("SELECT id FROM urls WHERE short_code = ?")
            .get(shortCode) as { id: number } | undefined;
          if (!existing) break;
          shortCode = null;
        }
        if (!shortCode) {
          return { error: "Tidak dapat menghasilkan kode unik. Coba lagi." };
        }
      }

      db.run(
        "INSERT INTO urls (short_code, long_url, api_key_id) VALUES (?, ?, ?)",
        [shortCode, url, apiKeyId]
      );

      return {
        shortCode,
        longUrl: url,
        shortUrl: `https://short.example/${shortCode}`,
      };
    },
    {
      body: t.Object({
        url: t.String({ format: "uri" }),
        customCode: t.Optional(t.String({ maxLength: 16 })),
      }),
      detail: { summary: "Membuat URL yang dipendekkan", tags: ["URLs"] },
    }
  )
  .get(
    "/urls",
    async ({ apiKeyId }) => {
      const rows = db
        .query(
          `SELECT short_code, long_url, is_active, created_at,
                  (SELECT COUNT(*) FROM clicks WHERE clicks.short_code = urls.short_code) AS click_count
           FROM urls WHERE api_key_id = ? ORDER BY created_at DESC`
        )
        .all(apiKeyId) as Array<{
        short_code: string;
        long_url: string;
        is_active: number;
        created_at: string;
        click_count: number;
      }>;

      return rows.map((r) => ({
        shortCode: r.short_code,
        longUrl: r.long_url,
        isActive: r.is_active === 1,
        clickCount: r.click_count,
        createdAt: r.created_at,
      }));
    },
    { detail: { summary: "Mendaftar semua URL untuk API key ini", tags: ["URLs"] } }
  )
  .delete(
    "/urls/:shortCode",
    async ({ params: { shortCode }, apiKeyId }) => {
      const url = db
        .query("SELECT id FROM urls WHERE short_code = ? AND api_key_id = ?")
        .get(shortCode, apiKeyId) as { id: number } | undefined;

      if (!url) {
        return { error: "URL tidak ditemukan atau tidak dimiliki oleh API key ini" };
      }

      db.run("DELETE FROM clicks WHERE short_code = ?", [shortCode]);
      db.run("DELETE FROM urls WHERE id = ?", [url.id]);
      return { deleted: true, shortCode };
    },
    {
      params: t.Object({ shortCode: t.String() }),
      detail: { summary: "Menghapus URL yang dipendekkan", tags: ["URLs"] },
    }
  );
```

### Penangan Pengalihan dengan Analitik Klik

Buat `src/routes/redirect.ts`. Penangan ini berjalan di tingkat root (tanpa prefiks `/api`) sehingga `GET /abc1234` melakukan pengalihan:

```typescript
import { Elysia, t } from "elysia";
import { db } from "../db";

export const redirectRoutes = new Elysia().get(
  "/:shortCode",
  async ({ params: { shortCode }, request, set }) => {
    const url = db
      .query(
        "SELECT long_url FROM urls WHERE short_code = ? AND is_active = 1"
      )
      .get(shortCode) as { long_url: string } | undefined;

    if (!url) {
      set.status = 404;
      return { error: "URL pendek tidak ditemukan atau dinonaktifkan" };
    }

    // Catat klik (insert non-blocking)
    db.run(
      "INSERT INTO clicks (short_code, referrer, user_agent, ip_address) VALUES (?, ?, ?, ?)",
      [
        shortCode,
        request.headers.get("referer") || request.headers.get("referrer") || "",
        request.headers.get("user-agent") || "",
        request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      ]
    );

    set.status = 302;
    set.headers["Location"] = url.long_url;
    return;
  },
  {
    params: t.Object({ shortCode: t.String({ minLength: 4, maxLength: 16 }) }),
    detail: { summary: "Mengalihkan ke URL asli", tags: ["Redirect"] },
  }
);
```

**Detail penting**: Penangan pengalihan harus mengembalikan `undefined` (atau tanpa body) saat mengatur status pengalihan. Mengembalikan string atau objek akan mengatur body bersama header 302, yang mungkin diabaikan oleh browser tetapi melanggar semantik HTTP. `return;` kosong memastikan tidak ada body yang dikirim.

### Endpoint Analitik

Tambahkan query analitik ke `src/routes/shortener.ts` di dalam grup guard yang sudah ada:

```typescript
  .get(
    "/urls/:shortCode/analytics",
    async ({ params: { shortCode }, apiKeyId }) => {
      // Verifikasi kepemilikan
      const url = db
        .query("SELECT id FROM urls WHERE short_code = ? AND api_key_id = ?")
        .get(shortCode, apiKeyId) as { id: number } | undefined;

      if (!url) {
        return { error: "URL tidak ditemukan atau tidak dimiliki oleh API key ini" };
      }

      // Total klik
      const total = db
        .query("SELECT COUNT(*) AS count FROM clicks WHERE short_code = ?")
        .get(shortCode) as { count: number };

      // Rincian harian (30 hari terakhir)
      const daily = db
        .query(
          `SELECT date(clicked_at) AS date, COUNT(*) AS count
           FROM clicks
           WHERE short_code = ? AND clicked_at >= datetime('now', '-30 days')
           GROUP BY date(clicked_at)
           ORDER BY date ASC`
        )
        .all(shortCode) as Array<{ date: string; count: number }>;

      // Referrer teratas
      const referrers = db
        .query(
          `SELECT referrer, COUNT(*) AS count
           FROM clicks
           WHERE short_code = ?
           GROUP BY referrer
           ORDER BY count DESC
           LIMIT 10`
        )
        .all(shortCode) as Array<{ referrer: string; count: number }>;

      return {
        shortCode,
        totalClicks: total.count,
        dailyBreakdown: daily,
        topReferrers: referrers,
      };
    },
    {
      params: t.Object({ shortCode: t.String() }),
      detail: { summary: "Mendapatkan analitik klik untuk URL pendek", tags: ["Analytics"] },
    }
  );
```

### Perakitan Aplikasi dan Pembatasan Laju

Sekarang hubungkan semuanya di `src/index.ts`:

```typescript
import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { rateLimit } from "@elysiajs/rate-limit";
import { shortenerRoutes } from "./routes/shortener";
import { redirectRoutes } from "./routes/redirect";

const app = new Elysia()
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "URL Shortener API",
          version: "1.0.0",
          description: "Layanan pemendek URL yang dibangun dengan Elysia.js",
        },
      },
    })
  )
  .use(
    rateLimit({
      max: 100,          // Maksimal permintaan per jendela
      duration: 60000,   // Durasi jendela dalam ms (1 menit)
      errorResponse: {
        status: 429,
        body: { error: "Batas laju terlampaui. Coba lagi nanti." },
      },
    })
  )
  .use(shortenerRoutes)
  .use(redirectRoutes)
  .get("/", () => ({
    service: "Elysia URL Shortener",
    version: "1.0.0",
    docs: "/docs",
  }))
  .listen(3000);

console.log(`🚀 URL Shortener berjalan di http://localhost:3000`);
console.log(`📖 Dokumentasi API di http://localhost:3000/docs`);
```

Jalankan aplikasi:

```bash
bun run src/index.ts
```

Anda akan melihat output seperti:

```text
🚀 URL Shortener berjalan di http://localhost:3000
📖 Dokumentasi API di http://localhost:3000/docs
```

### Menguji Layanan

Buat URL pendek:

```bash
curl -s -X POST http://localhost:3000/api/shorten \
  -H "X-API-Key: sk-demo-key-001" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very-long-path-that-needs-shortening"}' | bunx --bun prettyjson
```

Respons yang diharapkan:

```json
{
  "shortCode": "aB3xK9m",
  "longUrl": "https://example.com/very-long-path-that-needs-shortening",
  "shortUrl": "https://short.example/aB3xK9m"
}
```

Uji pengalihan:

```bash
curl -v http://localhost:3000/aB3xK9m
```

Respons harus menyertakan status `302 Found` dengan header `Location` yang mengarah ke URL asli. Pengalihan mencatat entri klik secara otomatis.

Periksa analitik:

```bash
curl -s http://localhost:3000/api/urls/aB3xK9m/analytics \
  -H "X-API-Key: sk-demo-key-001" | bunx --bun prettyjson
```

Setelah beberapa pengalihan, Anda akan melihat jumlah klik, rincian harian, dan informasi referrer.

## Contoh Kode

### Struktur Proyek Lengkap

```text
elysia-url-shortener/
├── src/
│   ├── index.ts
│   ├── db.ts
│   ├── auth.ts
│   ├── utils.ts
│   └── routes/
│       ├── shortener.ts
│       └── redirect.ts
├── data/                    # Dibuat saat runtime (database SQLite)
├── package.json
└── tsconfig.json
```

### Potongan Kode Utama

**Pembuatan kode dengan percobaan ulang benturan** — loop percobaan ulang menangani kasus yang sangat jarang terjadi ketika `crypto.getRandomValues()` menghasilkan kode yang sudah ada:

```typescript
for (let attempt = 0; attempt < 10; attempt++) {
  shortCode = generateShortCode();
  const existing = db
    .query("SELECT id FROM urls WHERE short_code = ?")
    .get(shortCode);
  if (!existing) break;
  shortCode = null;
}
```

**Subquery untuk jumlah klik** — endpoint daftar mengembalikan setiap URL dengan total kliknya menggunakan correlated subquery:

```typescript
SELECT short_code, long_url, is_active, created_at,
       (SELECT COUNT(*) FROM clicks WHERE clicks.short_code = urls.short_code) AS click_count
FROM urls WHERE api_key_id = ?
```

**Pencatatan klik transaksional** — setiap pengalihan secara atomik memasukkan catatan analitik:

```typescript
db.run(
  "INSERT INTO clicks (short_code, referrer, user_agent, ip_address) VALUES (?, ?, ?, ?)",
  [shortCode, referrer, userAgent, ipAddress]
);
```

## Insight Penting

- **Gunakan kode pendek acak secara kriptografis**: `crypto.getRandomValues()` mencegah serangan enumerasi. Kode yang dapat diprediksi (seperti ID auto-increment atau `Math.random()`) memungkinkan siapa pun menemukan semua URL yang dipendekkan dalam sistem.
- **Correlated subquery menghindari N+1**: Subquery `SELECT` untuk jumlah klik berjalan sekali per baris dalam satu kali perjalanan SQL, bukan memerlukan query terpisah untuk setiap URL.
- **Pembatasan laju melindungi endpoint pengalihan juga**: Plugin `rateLimit()` global berlaku untuk semua rute termasuk penangan pengalihan yang tidak terautentikasi, mencegah penyalahgunaan dari bot yang berulang kali meminta kode pendek yang tidak ada.
- **Jangan kirim body pada pengalihan 302**: Saat mengatur status `302` dengan header `Location`, biarkan nilai kembali kosong (`return;`). Mengembalikan body bersamaan dengan pengalihan melanggar semantik HTTP dan dapat membingungkan beberapa klien.
- **Desain skema memungkinkan penskalaan**: Memisahkan tabel `urls` dan `clicks` berarti Anda dapat mengarsipkan analitik lama secara independen tanpa memengaruhi kecepatan pengalihan. Indeks `short_code` pada tabel `clicks` menjaga query agregat tetap cepat bahkan dengan jutaan entri.

## Langkah Berikutnya

- Tambahkan **validasi slug kustom** dengan filter kata-kata kasar dan pemeriksaan kata cadangan.
- Implementasikan **kedaluwarsa URL** dengan kolom TTL dan pekerja pembersihan berkala.
- Tambahkan **generasi QR code** untuk setiap URL pendek menggunakan paket npm `qrcode`.
- Jelajahi **rotasi tautan** — beberapa URL panjang per kode pendek dengan persentase pembagian lalu lintas.
- Integrasikan **caching Redis** dengan ioredis untuk melayani pengalihan paling populer tanpa mengenai SQLite.

## Kesimpulan

Anda telah membangun layanan pemendek URL lengkap dengan Elysia.js yang menangani pembuatan kode, persistensi database, autentikasi, analitik klik, dan pembatasan laju — semuanya berjalan di atas runtime Bun yang cepat. Arsitektur proyek memisahkan concern ke dalam modul database, autentikasi, dan rute, membuatnya mudah untuk dikembangkan dengan fitur-fitur baru. Keterampilan yang Anda terapkan di sini — desain schema-first, autentikasi berbasis guard, correlated subquery, dan pencatatan peristiwa — dapat ditransfer langsung ke layanan web berbasis data apa pun yang Anda bangun dengan Elysia.js.

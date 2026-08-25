---
title: "Panduan Pengamanan Elysia.js"
description: "Panduan pengamanan tingkat lanjut untuk aplikasi Elysia.js — header keamanan, validasi TypeBox yang ketat, autentikasi JWT dengan rotasi refresh token, otorisasi berbasis guard, proteksi CSRF, rate limiting, pertahanan SSRF, penguatan rantai pasok, dan pencatatan log keamanan."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Pengamanan Elysia.js

## Pendahuluan

Elysia.js adalah framework web berbasis Bun yang berfokus pada performa tinggi dan keamanan tipe menyeluruh dengan model siklus hidup yang dapat diprediksi. Fondasi tersebut memberi pengembang keunggulan nyata saat mengamankan API: validasi bersifat deklaratif dan terpusat, hook berjalan dalam urutan yang deterministik, dan runtime (Bun) cukup modern untuk mengekspos primitif Web Crypto, streaming, serta timeout kelas satu. Namun, keamanan tipe saja tidak membuat aplikasi menjadi aman. Ancaman gaya OWASP — autentikasi yang rusak, CSRF, injection, SSRF, eksposur data berlebihan, bypass rate limit, dan kompromi rantai pasok — tetap berlaku dan membutuhkan pertahanan yang disengaja.

Panduan ini ditulis untuk tim yang sudah men-deploy layanan Elysia.js dan ingin menaikkan baseline keamanan mereka ke standar produksi. Panduan ini mencakup seluruh permukaan serangan API Elysia yang umum: apa yang harus dikonfigurasi di lapisan HTTP, bagaimana menyusun validasi agar input yang salah format atau berbahaya tidak pernah mencapai logika bisnis, bagaimana merancang autentikasi dan otorisasi yang gagal dalam keadaan terkunci (fail closed), bagaimana melindungi sesi berbasis cookie dari CSRF, bagaimana bertahan dari serangan brute force dan penipisan sumber daya, bagaimana mencegah server-side request forgery saat API memanggil layanan lain, dan terakhir bagaimana memperkuat dependensi, secret, dan runtime. Setiap bagian memasangkan praktik terbaik yang konkret dengan kode Elysia yang dapat dijalankan agar Anda dapat mengadopsi pola tersebut secara bertahap.

## Praktik Terbaik

### 1. Pasang Security Header di Tepi Aplikasi

Header respons HTTP adalah lapisan pertahanan termurah dan paling andal untuk klien berbasis browser. Header memberi tahu browser cara memperlakukan respons Anda: jangan pernah menebak tipe konten, jangan pernah menyematkan halaman dalam frame, jangan pernah mengirim referrer lengkap, dan batasi fitur browser yang boleh digunakan halaman Anda. Pada aplikasi Elysia, Anda harus menerapkan header ini secara global sehingga setiap respons — termasuk error dan 404 — ikut tercakup. Plugin berikut memasang seperangkat header standar industri pada setiap permintaan:

```typescript
import { Elysia } from 'elysia'

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export const securityHeaders = new Elysia().onRequest(({ set }) => {
  set.headers['Content-Security-Policy'] = CSP
  set.headers['X-Content-Type-Options'] = 'nosniff'
  set.headers['X-Frame-Options'] = 'DENY'
  set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
  set.headers['Permissions-Policy'] =
    'camera=(), microphone=(), geolocation=(), payment=()'
  set.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
  set.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
  set.headers['X-Powered-By'] = ''
})
```

Hook `onRequest` berjalan sebelum logika routing mana pun, sehingga `set.headers` di sini adalah tempat paling awal yang mungkin untuk memodifikasi respons. Perhatikan bahwa mengosongkan `X-Powered-By` dengan string kosong menghilangkan banner default Elysia yang mengiklankan framework tersebut kepada pemindai.

### 2. Validasi Setiap Input dengan Skema TypeBox yang Ketat

Fitur andalan Elysia untuk keamanan adalah validasi runtime deklaratif melalui TypeBox. Setiap skema `body`, `query`, `params`, dan `headers` ditegakkan sebelum handler berjalan, dan payload yang tidak valid dipotong dengan error `VALIDATION`. Kesalahan yang paling sering dilakukan tim adalah membiarkan skema terbuka: secara default objek TypeBox mengabaikan properti yang tidak dikenal, yang secara diam-diam memungkinkan serangan mass-assignment dan polusi parameter. Selalu tutup permukaan skema:

```typescript
import { Elysia, t } from 'elysia'

const CreateUserSchema = t.Object(
  {
    name: t.String({ minLength: 2, maxLength: 100 }),
    email: t.String({ format: 'email', maxLength: 254 }),
    password: t.String({
      minLength: 12,
      maxLength: 128,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$',
    }),
    role: t.Optional(t.Union([t.Literal('user'), t.Literal('admin')])),
  },
  { additionalProperties: false },
)

export const users = new Elysia()
  .post('/users', async ({ body }) => {
    // body sudah divalidasi penuh, bertipe ketat, dan tidak mengandung kunci tambahan
    return createUser(body)
  }, {
    body: CreateUserSchema,
    detail: { tags: ['users'] },
  })
```

Tiga aturan membuat pendekatan ini kedap udara. Pertama, selalu berikan `{ additionalProperties: false }` sehingga kunci JSON yang tidak dikenal ditolak alih-alih dibuang diam-diam. Kedua, terapkan batasan panjang dan format (`minLength`, `maxLength`, `format`, `pattern`) pada setiap string — string tanpa batas adalah liabilitas untuk memori dan ReDoS. Ketiga, jaga skema tetap dipakai bersama antara API dan klien dengan Eden Treaty sehingga frontend tidak akan pernah bisa mengirim bentuk yang tidak diharapkan server.

### 3. Autentikasi dengan JWT Bertanda Tangan Berumur Pendek

Untuk layanan khusus API, model autentikasi paling tangguh adalah stateless: tandatangani access token berumur pendek dengan algoritma kuat, verifikasi di setiap permintaan, dan simpan refresh token terpisah yang dapat dicabut. Plugin `@elysiajs/jwt` membungkus implementasi Web Crypto dan memungkinkan Anda mengunci algoritma alih-alih menerima apa pun yang diklaim header token:

```typescript
import { jwt } from '@elysiajs/jwt'

const ACCESS_TTL_SECONDS = 15 * 60 // 15 menit

export const auth = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET!, // minimal 32 byte acak, dirotasi rutin
      alg: 'HS256',
    }),
  )
  .derive(async ({ jwt, request }) => {
    const header = request.headers.get('authorization')
    if (!header?.startsWith('Bearer ')) {
      return { currentUser: null }
    }
    const payload = await jwt.verify(header.slice(7))
    if (!payload || typeof payload.sub !== 'string') {
      return { currentUser: null }
    }
    return { currentUser: { id: payload.sub, role: payload.role as Role } }
  })
```

Jaga access token tetap berumur pendek (5–15 menit) sehingga token yang bocor hanya berguna dalam jendela waktu yang kecil. Sertakan klaim `jti` (ID token unik) serta `iat`/`exp`, dan validasi `iss` dan `aud` saat Anda memiliki lebih dari satu layanan. Simpan refresh token dalam bentuk hash dengan `Bun.password` (argon2id), jangan pernah dalam teks polos, sehingga kebocoran basis data tidak menjadi kebocoran sesi.

### 4. Tegakkan Otorisasi dengan Guard Terpusat

Autentikasi menjawab "siapa Anda?"; otorisasi menjawab "apa yang boleh Anda lakukan?". `guard` Elysia dan hook `beforeHandle` di tingkat rute adalah tempat idiomatis untuk otorisasi. Pusatkan pemeriksaan dalam guard yang dapat digunakan ulang sehingga endpoint baru tidak mungkin dirilis tanpa guard, dan buat setiap pemeriksaan gagal dalam keadaan terkunci — konteks yang hilang harus diperlakukan sebagai `401`, dan pengguna terautentikasi tanpa peran yang dibutuhkan harus mendapat `403`:

```typescript
import { Elysia } from 'elysia'

export type Role = 'user' | 'admin'

export function requireRole(...roles: Role[]) {
  return new Elysia().guard({
    beforeHandle({ currentUser, set }) {
      if (!currentUser) {
        set.status = 401
        return { error: 'Unauthorized' }
      }
      if (!roles.includes(currentUser.role)) {
        set.status = 403
        return { error: 'Forbidden' }
      }
    },
  })
}

export const adminApi = new Elysia()
  .use(requireRole('admin'))
  .get('/users', listUsers)
  .post('/users', createUser, { body: CreateUserSchema })
```

Utamakan menurunkan (derive) pengguna aktif sekali di scope induk (seperti pada Praktik 3) lalu menyusun guard peran di atasnya, alih-alih mengurai ulang token di setiap rute. Jika aturan otorisasi Anda kompleks — multi-tenant, pemeriksaan pemilik sumber daya, scope — modelkan sebagai fungsi predikat kecil dan gabungkan di dalam guard agar aturan tetap mudah diuji.

### 5. Perkuat Sesi Berbasis Cookie terhadap CSRF

Jika layanan Elysia Anda menerbitkan cookie sesi (misalnya refresh token untuk aplikasi satu halaman), Anda harus bertahan dari cross-site request forgery. Browser dengan senang hati akan melampirkan cookie sesi ke permintaan yang dikirim dari origin berbahaya, sehingga server tidak bisa hanya memercayai cookie. Pertahanannya berlapis: pasang atribut cookie yang ketat, verifikasi header `Origin` pada metode yang mengubah keadaan, dan gunakan token double-submit sehingga setiap mutasi membutuhkan nilai yang tidak bisa dibaca penyerang.

```typescript
// Saat login/penerbitan sesi: pasang cookie token yang tidak bisa ditebak
setCookie('csrf_token', crypto.randomUUID(), {
  httpOnly: false, // dapat dibaca SPA melalui document.cookie
  secure: true,
  sameSite: 'strict',
  path: '/',
})
```

SPA kemudian mengirim kembali nilai tersebut di header `X-CSRF-Token`, dan server membandingkannya dengan cookie pada setiap permintaan yang mengubah keadaan:

```typescript
import { Elysia } from 'elysia'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export const csrfProtection = new Elysia().onBeforeHandle(
  ({ request }) => {
    if (SAFE_METHODS.has(request.method.toUpperCase())) return

    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    if (!origin || !host) {
      return new Response('Forbidden: missing Origin', { status: 403 })
    }

    let originHost: string
    try {
      originHost = new URL(origin).host
    } catch {
      return new Response('Forbidden: malformed Origin', { status: 403 })
    }
    if (originHost !== host) {
      return new Response('Forbidden: cross-origin', { status: 403 })
    }

    const headerToken = request.headers.get('x-csrf-token')
    const cookieToken = /(?:^|;\s*)csrf_token=([^;]+)/.exec(
      request.headers.get('cookie') ?? '',
    )?.[1]
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return new Response('Forbidden: CSRF token mismatch', { status: 403 })
    }
  },
)
```

Untuk API JSON murni yang dikonsumsi klien server-to-server, risiko CSRF minimal — tetapi pemeriksaan `Origin` tetap murah dan layak dipertahankan. Untuk SPA yang menghadap browser, pola double-submit di atas adalah pertahanan minimum yang layak.

### 6. Terapkan Rate Limit untuk Bertahan dari Brute Force dan DoS

Endpoint autentikasi, API pencarian publik, dan semua sumber daya yang memicu pekerjaan mahal membutuhkan rate limiting. Jendela tetap per-IP adalah baseline; setelah autentikasi Anda juga harus mengunci bucket per pengguna dan per rute. Plugin berikut mengimplementasikan sliding window di atas peta dalam memori yang dibatasi — cocok untuk instance tunggal, dan mudah diganti dengan Redis saat Anda melakukan penskalaan horizontal:

```typescript
import { Elysia } from 'elysia'

interface Bucket {
  count: number
  resetAt: number
}

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 100
const MAX_BUCKETS = 10_000
const buckets = new Map<string, Bucket>()

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export const rateLimiter = new Elysia().onRequest(({ request }) => {
  const now = Date.now()
  const key = clientKey(request)

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k)
    }
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  bucket.count += 1
  if (bucket.count > MAX_PER_WINDOW) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    })
  }
})
```

Jangan pernah memercayai `x-forwarded-for` secara membabi buta — header tersebut dapat dipalsukan saat proxy tepi tidak menimpanya; jadikan ingress Anda (nginx, load balancer L7, atau CDN) satu-satunya sumber header itu. Untuk endpoint login khususnya, terapkan batas per-akun yang jauh lebih ketat (misalnya 5 percobaan per menit per email) sebagai tambahan dari batas per-IP.

### 7. Cegah Injection dan SSRF pada Data serta Pemanggilan Keluar

Dua keluarga injection masih mendominasi pelanggaran dunia nyata: SQL injection melalui query yang dibangun dari string, dan server-side request forgery melalui URL yang disuplai pengguna. Untuk yang pertama, aturannya absolut — jangan pernah menyisipkan input pengguna ke dalam teks SQL; selalu gunakan query berparameter atau ORM:

```typescript
import { sql } from 'drizzle-orm'

// Aman: driver mengikat nilai sebagai parameter
const user = await db.execute(
  sql`SELECT * FROM users WHERE email = ${email}`,
)

// Tidak aman: jangan pernah lakukan ini
// const user = await db.execute(`SELECT * FROM users WHERE email = '${email}'`)
```

Untuk yang kedua, setiap permintaan keluar yang dibuat API Anda atas nama pengguna harus divalidasi terhadap daftar izin (allow-list) skema dan host, dan tidak boleh diizinkan menjangkau infrastruktur internal. Lihat Langkah 8 untuk implementasi `safeFetch` lengkap yang memblokir rentang IP privat dan menolak mengikuti redirect secara otomatis.

### 8. Perkuat Rantai Pasok dan Secret Runtime

Kode Anda bisa sempurna dan layanan Anda tetap bisa dikompromikan melalui dependensi berbahaya, secret yang bocor, atau runtime yang terlalu berkuasa. Jadikan hal berikut bagian dari definisi selesai (definition-of-done):

- **Audit dependensi di CI**: jalankan `bun audit` pada setiap pull request dan gagalkan build untuk advisory `high` dan `critical`.
- **Kunci lockfile**: `bun.lock` harus di-commit dan dipasang dengan `--frozen-lockfile` di CI dan produksi.
- **Jangan pernah meng-commit secret**: berkas `.env` tidak ikut di-commit ke repositori; dokumentasikan variabel di `.env.example` dengan nilai placeholder dan suntikkan nilai asli melalui orchestrator atau secret manager.
- **Validasi lingkungan saat boot**: gagal cepat saat startup jika variabel wajib hilang, alih-alih crash di tengah permintaan.
- **Jalankan sebagai pengguna tanpa hak istimewa**: container tidak boleh berjalan sebagai root (lihat Langkah 9 untuk Dockerfile yang diperkuat).
- **Batasi eksposur**: nonaktifkan banner `X-Powered-By` (Praktik 1), hindari stack trace dalam respons produksi, dan jaga API tetap di belakang proxy yang mengakhiri TLS dengan HTTP/2 aktif.

### 9. Catat Log Peristiwa Keamanan dan Siapkan Tinjauan Insiden

Anda tidak dapat merespons serangan yang tidak Anda lihat. Setiap kegagalan autentikasi, penolakan guard, penolakan validasi, dan tembakan rate limit harus ditulis ke log terstruktur dengan ID korelasi agar insiden dapat direkonstruksi dari awal sampai akhir. Gunakan `console.error`/`console.warn` dengan satu objek JSON per peristiwa — Bun menulis JSON lines secara native dan pipeline log Anda dapat menyerapnya tanpa olah-urai yang rumit. Logger keamanan minimal adalah komponen terakhir dalam aplikasi referensi (Langkah 10), dan harus dipasangkan dengan aturan alerting pada pola `event="validation_failure" ATAU event="guard_denied" ATAU status=429`.

## Langkah Implementasi

### Langkah 1: Siapkan Baseline Proyek yang Diperkuat

Mulai dari proyek Bun baru dengan TypeScript ketat dan tata letak berorientasi keamanan. Setiap perhatian dari panduan ini mendapat modulnya sendiri sehingga penguatan bersifat eksplisit dan dapat diaudit:

```bash
bun init -y
bun add elysia @elysiajs/jwt @elysiajs/cookie @sinclair/typebox
bun add -d typescript @types/bun
```

```text
src/
├── app.ts                          # Komposisi instance Elysia (root)
├── env.ts                          # validasi skema env (gagal cepat)
├── plugins/
│   ├── security-headers.ts         # Praktik 1
│   ├── error-handler.ts            # error bertipe terpusat
│   ├── rate-limiter.ts             # Praktik 6
│   └── csrf.ts                     # Praktik 5
├── modules/
│   ├── auth/
│   │   ├── auth.plugin.ts          # Praktik 3 (JWT + derive)
│   │   └── auth.routes.ts          # login / refresh / logout
│   └── users/
│       ├── users.routes.ts         # Praktik 4 (guard)
│       └── users.service.ts
└── db/
    ├── schema.ts
    └── client.ts
```

Aktifkan `strict` dan `noUncheckedIndexedAccess` di `tsconfig.json`, dan tambahkan `.env` ke `.gitignore` sebelum hal lain.

### Langkah 2: Tambahkan Security Header Global melalui Plugin

Buat `src/plugins/security-headers.ts` dengan plugin dari Praktik 1. Daftarkan plugin tersebut paling awal di aplikasi root sehingga setiap respons — termasuk 404 dan error — membawa rangkaian header lengkap:

```typescript
import { Elysia } from 'elysia'
import { securityHeaders } from './plugins/security-headers'

const app = new Elysia({
  serve: {
    idleTimeout: 30,
    maxRequestBodySize: 1024 * 1024,
    compression: true,
  },
})
  .use(securityHeaders)
  .get('/health', () => ({ ok: true, at: new Date().toISOString() }))
  .listen(Number(process.env.PORT ?? 3000))

export type App = typeof app
```

Opsi `serve` juga membatasi body permintaan hingga 1 MB dan mengaktifkan kompresi respons; `idleTimeout` bertahan dari koneksi bergaya slowloris yang menahan socket tetap terbuka tanpa menyelesaikan permintaan.

### Langkah 3: Definisikan Skema TypeBox Ketat untuk Semua Input

Pusatkan setiap skema permintaan dalam modul `schemas` dan selalu berikan `{ additionalProperties: false }`. Tambahkan plugin `error-handler` bersama sehingga error validasi dan kegagalan internal mengembalikan JSON yang konsisten dan tidak informatif:

```typescript
import { Elysia } from 'elysia'

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export const errorHandler = new Elysia()
  .error({ UNAUTHORIZED: UnauthorizedError, FORBIDDEN: ForbiddenError })
  .onError(({ code, error, set }) => {
    if (code === 'UNAUTHORIZED') {
      set.status = 401
      return { error: error.message }
    }
    if (code === 'FORBIDDEN') {
      set.status = 403
      return { error: error.message }
    }
    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Invalid request' } // jangan pernah mengembalikan output validator lengkap
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Not Found' }
    }
    set.status = 500
    return { error: 'Internal Server Error' }
  })
```

Jangan pernah mengembalikan pesan exception mentah atau stack trace kepada klien. Pesan detail validator dapat memuat bagian internal skema yang berguna bagi penyerang; catat di sisi server saja (Langkah 10) dan kembalikan `Invalid request` yang generik kepada pemanggil.

### Langkah 4: Implementasikan Autentikasi JWT dengan Rotasi Token

Bangun modul autentikasi dari Praktik 3, dan tambahkan rute login yang memverifikasi kredensial dengan `Bun.password`, menerbitkan access token berumur pendek, dan merotasi refresh token yang di-hash:

```typescript
import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { cookie } from '@elysiajs/cookie'

const ACCESS_TTL_SECONDS = 15 * 60
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60
const REFRESH_COOKIE = 'refresh_token'

export const auth = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET!,
      alg: 'HS256',
    }),
  )
  .use(
    cookie({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    }),
  )
  .post(
    '/auth/login',
    async ({ body, jwt, setCookie, set }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.email, body.email),
      })
      if (!user || !(await Bun.password.verify(body.password, user.passwordHash))) {
        set.status = 401
        return { error: 'Invalid credentials' }
      }

      const accessToken = await jwt.sign({
        sub: user.id,
        role: user.role,
        jti: crypto.randomUUID(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
      })

      const refreshToken = crypto.randomUUID()
      const refreshHash = await Bun.password.hash(refreshToken, {
        algorithm: 'argon2id',
      })
      // Simpan refreshHash + masa berlaku untuk pengguna ini, dan cabut saat logout
      await db.insert(refreshSessions).values({
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
      })

      setCookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: REFRESH_TTL_SECONDS,
      })

      return { accessToken, expiresIn: ACCESS_TTL_SECONDS }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email', maxLength: 254 }),
        password: t.String({ minLength: 8, maxLength: 128 }),
      }),
    },
  )
```

Pada setiap refresh, rotasikan refresh token: terbitkan nilai acak baru, ganti hash yang tersimpan, dan cabut yang lama. Refresh token adalah kredensial bearer — dengan men-hash saat disimpan, dump basis data tidak langsung membocorkan sesi yang masih aktif.

### Langkah 5: Tegakkan Otorisasi Berbasis Guard dengan Konteks Turunan

Rangkaikan guard `requireRole` dari Praktik 4 ke rute modul, lalu susun aplikasi root:

```typescript
import { auth } from './modules/auth/auth.plugin'
import { adminApi } from './modules/users/users.routes'

const app = new Elysia()
  .use(securityHeaders)
  .use(errorHandler)
  .use(rateLimiter)
  .use(csrfProtection)
  .use(auth)
  .use(adminApi)
  .get('/me', ({ currentUser }) => {
    if (!currentUser) {
      return { error: 'Unauthorized' }
    }
    return currentUser
  })
  .listen(Number(process.env.PORT ?? 3000))
```

Perhatikan bahwa `derive` di plugin `auth` memiliki scope pada semua yang menggunakannya, sehingga `currentUser` tersedia di `adminApi` dan di handler root tanpa penguraian ulang. Setiap rute yang membaca `currentUser` tetap harus menangani kasus `null` secara eksplisit — itulah default fail-closed.

### Langkah 6: Lindungi Sesi Berbasis Cookie dari CSRF

Karena alur login menyimpan refresh token dalam cookie, tambahkan plugin `csrfProtection` dari Praktik 5 ke aplikasi root. Urutan penting: plugin berjalan di `onBeforeHandle`, setelah `rateLimiter` (yang berjalan di `onRequest`), dan sebelum handler mana pun. Saat login dan refresh, pasang juga cookie `csrf_token` agar SPA dapat menggemakannya kembali di header `X-CSRF-Token`. Jika klien mobile native adalah satu-satunya konsumen Anda, plugin CSRF dapat dilewati — tetapi pemeriksaan `Origin` lintas-origin yang sama tetap menjadi penguatan tanpa biaya untuk klien web.

### Langkah 7: Tambahkan Rate Limiting dan Pembatasan Permintaan

Daftarkan plugin `rateLimiter` dari Praktik 6 paling awal di komposisi sehingga menghitung setiap permintaan, termasuk yang kemudian gagal autentikasi. Lalu tambahkan guard per pengguna untuk endpoint sensitif seperti login dan reset kata sandi:

```typescript
export function userRateLimit(limit: number, windowMs: number) {
  const userBuckets = new Map<string, Bucket>()
  return new Elysia().guard({
    beforeHandle({ currentUser, request, set }) {
      if (!currentUser) return
      const now = Date.now()
      const url = new URL(request.url)
      const key = `${currentUser.id}:${request.method}:${url.pathname}`
      const bucket = userBuckets.get(key)
      if (!bucket || bucket.resetAt <= now) {
        userBuckets.set(key, { count: 1, resetAt: now + windowMs })
        return
      }
      bucket.count += 1
      if (bucket.count > limit) {
        return new Response('Too Many Requests', { status: 429 })
      }
    },
  })
}
```

Untuk deployment multi-instance, pindahkan peta bucket ke Redis dengan skrip `INCR` + `EXPIRE` agar batas dibagi di seluruh replika; peta dalam memori hanya menyimpan keadaan per instance.

### Langkah 8: Perkuat HTTP Keluar terhadap SSRF

Buat helper `safeFetch` yang dipakai semua pemanggilan keluar. Helper ini memvalidasi skema dan host terhadap daftar izin, memblokir alamat privat dan link-local (termasuk setelah resolusi DNS, untuk menahan DNS rebinding), dan menolak mengikuti redirect secara otomatis:

```typescript
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const ALLOWED_PROTOCOLS = new Set(['https:'])
const ALLOWED_HOSTS = new Set(['api.example.com', 'hooks.example.com'])
const PRIVATE_IP = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
]

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host === '::1' || host === '::') return true
  if (host.endsWith('.internal') || host.endsWith('.local')) return true
  if (isIP(host) && PRIVATE_IP.some((re) => re.test(host))) return true
  return false
}

async function resolveSafe(url: URL): Promise<URL> {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error('Only HTTPS URLs are allowed')
  }
  if (ALLOWED_HOSTS.size > 0 && !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error('Host is not allow-listed')
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error('Host is blocked')
  }
  const addresses = await lookup(url.hostname, { all: true })
  for (const { address } of addresses) {
    if (isIP(address) && PRIVATE_IP.some((re) => re.test(address))) {
      throw new Error('Resolved address is private')
    }
  }
  return url
}

export async function safeFetch(rawUrl: string, init?: RequestInit) {
  const url = await resolveSafe(new URL(rawUrl))
  return fetch(url, {
    ...init,
    redirect: 'manual', // jangan pernah mengikuti redirect secara otomatis
    signal: AbortSignal.timeout(5_000),
  })
}
```

Jika layanan Anda harus memanggil layanan internal, letakkan di jaringan terpisah dengan kebijakan egress tersendiri alih-alih memperluas daftar izin dengan rentang privat — daftar izin hanya untuk host publik.

### Langkah 9: Audit Dependensi, Secret, dan Pengaturan Runtime

Jalankan perintah audit secara lokal dan di CI:

```bash
bun audit                       # audit dependensi penuh
bun audit --production          # pemeriksaan advisory khusus produksi
```

Validasi lingkungan saat boot agar miskonfigurasi gagal cepat dan jelas. Contoh berikut menggunakan `Value.Parse` TypeBox dari `@sinclair/typebox/value`, yang melempar error pada variabel pertama yang hilang atau tidak valid:

```typescript
import { Value } from '@sinclair/typebox/value'
import { t } from 'elysia'

const EnvSchema = t.Object(
  {
    NODE_ENV: t.Union([
      t.Literal('development'),
      t.Literal('test'),
      t.Literal('production'),
    ]),
    PORT: t.String({ default: '3000' }),
    JWT_SECRET: t.String({ minLength: 32 }),
    DATABASE_URL: t.String({ minLength: 1 }),
    LOG_LEVEL: t.Optional(
      t.Union([
        t.Literal('debug'),
        t.Literal('info'),
        t.Literal('warn'),
        t.Literal('error'),
      ]),
    ),
  },
  { additionalProperties: true },
)

export const env = Value.Parse(EnvSchema, Bun.env)
```

Dokumentasikan setiap variabel di `.env.example` yang di-commit dengan nilai placeholder:

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=openssl-rand-hex-32-bytes
DATABASE_URL=postgres://app:CHANGE_ME@db.internal:5432/app
LOG_LEVEL=info
```

Terakhir, deploy sebagai pengguna tanpa hak istimewa. Container minimal yang diperkuat untuk layanan Elysia yang dikompilasi:

```dockerfile
FROM oven/bun:1.2 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build --compile ./src/index.ts --outfile /app/server

FROM debian:bookworm-slim
RUN useradd --create-home --uid 10001 appuser
COPY --from=build /app/server /usr/local/bin/server
USER appuser
EXPOSE 3000
CMD ["server"]
```

### Langkah 10: Rangkaikan Log Peristiwa Keamanan dan Lakukan Tinjauan Akhir

Lampirkan logger keamanan ke aplikasi root yang mengeluarkan JSON terstruktur untuk peristiwa yang penting, lalu jalankan checklist tinjauan model ancaman sebelum setiap rilis:

```typescript
import { Elysia } from 'elysia'

function logSecurityEvent(
  event: string,
  request: Request,
  extra: Record<string, unknown> = {},
) {
  console.warn(
    JSON.stringify({
      event,
      at: new Date().toISOString(),
      method: request.method,
      path: new URL(request.url).pathname,
      ip:
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-real-ip') ??
        'unknown',
      ...extra,
    }),
  )
}

export const securityLogger = new Elysia()
  .onError(({ code, error, request }) => {
    if (code === 'VALIDATION') {
      logSecurityEvent('validation_failure', request, {
        detail: error.message,
      })
    }
  })
  .onResponse(({ request, set }) => {
    if (set.status >= 400) {
      logSecurityEvent('client_error', request, { status: set.status })
    }
  })
```

Checklist tinjauan akhir:

- **Header**: CSP, nosniff, frame deny, referrer policy, permissions policy hadir di setiap respons; `X-Powered-By` dihapus.
- **Validasi**: setiap rute memiliki skema `body`/`query`/`params` dengan `additionalProperties: false`; tidak ada rute yang menerima input `unknown` mentah.
- **Autentikasi**: access token kedaluwarsa dalam 15 menit atau kurang; `alg` dikunci; refresh token di-hash saat disimpan dan dirotasi setiap digunakan.
- **Otorisasi**: setiap rute yang dilindungi menyusun `requireRole` atau guard setara; deny-by-default untuk konteks yang hilang.
- **CSRF**: pemeriksaan `Origin` pada semua metode pengubah keadaan; token double-submit untuk klien browser yang terautentikasi cookie.
- **Rate limit**: jendela per-IP plus bucket per pengguna yang lebih ketat pada endpoint autentikasi; `Retry-After` dikembalikan pada 429.
- **SSRF**: semua lalu lintas keluar melalui `safeFetch`; rentang privat dan DNS rebinding diblokir; redirect dinonaktifkan.
- **Rantai pasok**: `bun audit` hijau di CI; lockfile dikunci; secret disuntikkan, tidak di-commit.
- **Runtime**: pengguna container tanpa hak istimewa; batas ukuran body dan idle timeout ditetapkan; TLS diakhiri di tepi.

Meninjau checklist ini setelah setiap perubahan — bukan hanya saat peluncuran — adalah kunci agar penguatan tidak lapuk seiring evolusi codebase.

---
title: "Panduan Autentikasi dan Otorisasi SvelteKit"
description: "Panduan komprehensif untuk mengimplementasikan autentikasi dan otorisasi yang aman di SvelteKit — mencakup autentikasi berbasis sesi dengan cookie HTTP-only, proteksi rute melalui hooks, RBAC, integrasi OAuth 2.0/OIDC, pertahanan CSRF, dan pengujian alur autentikasi."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Autentikasi dan Otorisasi SvelteKit

## Pendahuluan

Autentikasi — memverifikasi siapa pengguna — dan otorisasi — memverifikasi apa yang boleh dilakukan pengguna — adalah dua pilar keamanan hampir semua aplikasi nyata. Di SvelteKit, arsitektur server-first dari framework ini memberi Anda seperangkat primitif yang rapi untuk membangun keduanya dengan benar: `hooks.server.ts` berjalan sebelum setiap permintaan, fungsi `load` di `+page.server.ts` menggerbang akses data, dan form actions menangani mutasi dengan progressive enhancement bawaan.

Panduan ini menunjukkan cara merakit primitif-primitif tersebut menjadi sistem autentikasi kelas produksi. Anda akan mempelajari cara mengimplementasikan autentikasi berbasis sesi dengan cookie HTTP-only, memusatkan validasi sesi di hooks, melindungi grup rute dengan guard layout, menegakkan kontrol akses berbasis peran (RBAC) di fungsi load, mengintegrasikan login eksternal melalui OAuth 2.0 / OpenID Connect, mempertahankan diri dari CSRF, memperkuat aplikasi dengan security headers dan rate limiting, serta menguji seluruh alur dengan pengujian unit dan end-to-end.

Pendekatan dalam panduan ini sengaja dibuat library-agnostic: kami mengimplementasikan sesi, hashing kata sandi, dan izin secara langsung sehingga Anda memahami setiap keputusan keamanan. Pada titik di mana library yang teruji menyelamatkan Anda dari kesalahan halus — terutama alur provider OAuth — kami mengadopsinya secara eksplisit.

## Praktik Terbaik

### 1. Utamakan Sesi Server-Side yang Disimpan dalam Cookie HTTP-Only

Simpan token sesi acak yang tidak dapat ditebak dalam cookie `httpOnly` dan simpan catatan sesi — beserta masa kedaluwarsa dan referensi penggunanya — di server. Flag cookie `httpOnly` mencegah JavaScript membaca token, yang menetralkan sebagian besar payload XSS umum. Setel `sameSite=lax` untuk menghentikan pengiriman cookie lintas-situs pada sebagian besar skenario CSRF, dan `secure` di produksi agar cookie hanya dikirim melalui HTTPS.

```typescript
// src/lib/server/session.ts
export function sessionCookie(token: string): string[] {
  return [
    `session=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=2592000', // 30 hari
    ...(import.meta.env.PROD ? ['Secure'] : [])
  ];
}
```

### 2. Validasi Sesi di Satu Guard Hooks

Fungsi `handle` di `hooks.server.ts` adalah satu-satunya tempat yang melihat setiap permintaan masuk, sehingga tempat tersebut adalah titik tunggal yang tepat untuk resolusi sesi. Selesaikan pengguna sekali dan lampirkan ke `event.locals`; setiap fungsi load dan form action kemudian dapat mempercayai `locals.user` tanpa mengurai cookie berulang kali. Menjaga logika ini di satu tempat berarti perbaikan keamanan — mengganti algoritma hashing atau memperketat masa kedaluwarsa — cukup dilakukan di satu file.

### 3. Kelompokkan Rute yang Dilindungi dan Guard Seluruh Layout

Gunakan route groups SvelteKit untuk memisahkan area publik dari area terautentikasi:

```text
src/routes/
  +layout.svelte          # shell publik
  +page.svelte            # halaman beranda
  (auth)/
    +layout.server.ts     # mengarahkan pengguna yang belum autentikasi
    +layout.svelte        # shell terautentikasi
    account/
      +page.svelte        # /account — memerlukan login
    settings/
      +page.svelte        # /settings — memerlukan login
  login/
    +page.svelte          # halaman login publik
```

Guard level layout tidak dapat dilewati hanya dengan menautkan ke halaman bersarang, karena load layout berjalan untuk setiap rute dalam grup tersebut.

### 4. Periksa Ulang Otorisasi di Dalam Fungsi Load dan Form Actions

Guard layout menangani pertanyaan "apakah pengguna ini sudah login?" — tetapi otorisasi ("bolehkah pengguna ini melakukan ini?") harus diperiksa ulang di batas data. Sebuah layout dashboard mungkin dipakai bersama oleh admin dan member; fungsi `load` untuk panel admin harus memverifikasi perannya sendiri. Jangan pernah mengandalkan penyembunyian UI: selalu tegakkan di fungsi load server atau form action, karena hanya di situlah kode berjalan dengan otoritas server.

### 5. Hash Kata Sandi dengan Argon2id

Jangan pernah menyimpan kata sandi plaintext atau hash yang lemah. Argon2id adalah hash memory-hard yang direkomendasikan saat ini: ia menahan serangan GPU, bertahan dari timing attacks, dan diimplementasikan oleh paket yang terawat dengan baik. Selalu setel salt acak per pengguna (library membuatkannya untuk Anda) dan faktor kerja yang sesuai dengan perangkat keras yang akan memverifikasi login.

### 6. Buat Sesi Berumur Pendek dan Rotasi Token-nya

Cookie sesi yang dicuri hanya seberbahaya masa hidupnya. Setel masa kedaluwarsa yang masuk akal (jam hingga sebulan tergantung aplikasi), dan rotasi token sesi saat terjadi perubahan hak istimewa — setelah login, setelah reset kata sandi, dan saat eskalasi peran — dengan menghapus sesi lama dan menerbitkan sesi baru. Rotasi menjamin bahwa penyerang yang memutar ulang token lama akan terkunci begitu pengguna melakukan autentikasi ulang.

### 7. Serahkan Login Pihak Ketiga ke OAuth 2.0 / OpenID Connect

Jangan mengimplementasikan alur kata sandi Google/GitHub sendiri. Gunakan alur authorization code OAuth 2.0 standar dengan PKCE dari provider, verifikasi klaim `sub` dari ID token (OIDC) atau respons profil, lalu tautkan identitas yang dikembalikan ke catatan pengguna lokal Anda. Library kecil yang diaudit seperti `arctic` menghilangkan pekerjaan pembukuan PKCE dan menjaga handler provider Anda tetap ringkas.

### 8. Pertahankan Mutasi dari CSRF

Cookie `SameSite=lax` menghentikan browser mengirim cookie sesi pada POST lintas-situs, yang menggagalkan sebagian besar serangan CSRF. Tambahkan lapisan kedua untuk endpoint yang mengubah state: verifikasi header `Origin` permintaan terhadap origin aplikasi Anda, dan gunakan form actions SvelteKit (yang mengirim POST form same-origin) daripada menerima JSON telanjang dari origin sembarangan.

### 9. Tegakkan RBAC dengan Model Izin, Bukan Hanya Nama Peran

Model otorisasi sebagai izin — `post:create`, `user:delete`, `billing:view` — dan kelompokkan izin ke dalam peran. Memeriksa `user.role === 'admin'` menjadi tidak terawat begitu peran kedua membutuhkan sebagian dari kekuasaan admin. Tabel yang memetakan pasangan `(role, permission)` memungkinkan Anda menjawab "dapatkah pengguna ini melakukan aksi ini?" dengan satu query dan menjaga logika pemeriksaan tetap independen dari hierarki peran.

### 10. Setel Security Headers dan Baseline Penguatan

Tambahkan baseline security headers — `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security` — plus rate limiting pada endpoint login, registrasi, dan reset kata sandi. Proyek SvelteKit umumnya menerapkannya secara terpusat dengan hook `handle` atau peta header bergaya middleware yang tidak bergantung pada adapter, sehingga setiap respons terlindungi tanpa kerja per-rute.

### 11. Uji Alur Auth di Level Unit, Integrasi, dan E2E

Kode autentikasi sangat penting bagi keamanan dan terkenal mudah rusak oleh refactor. Uji unit untuk hashing kata sandi dan helper sesi, uji integrasi untuk fungsi load dengan `locals.user` yang di-mock, dan jalankan pengujian end-to-end Playwright untuk perjalanan kanonik: login sukses, login gagal, redirect rute terlindungi, kedaluwarsa sesi, dan logout.

## Langkah Implementasi

### Langkah 1: Rancang Skema Sesi

Buat tabel `sessions` yang menyimpan hash token, bukan token itu sendiri, sehingga kebocoran basis data tidak membocorkan sesi yang dapat dipakai. Simpan referensi pengguna, masa kedaluwarsa, dan metadata rotasi opsional.

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member',
  created_at    INTEGER NOT NULL
);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  expires_at    INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE permissions (
  role       TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role, permission)
);
```

Isi tabel permissions dengan peran awal Anda:

```sql
INSERT INTO permissions (role, permission) VALUES
  ('member', 'post:create'),
  ('member', 'post:read'),
  ('admin',  'post:create'),
  ('admin',  'post:delete'),
  ('admin',  'user:delete'),
  ('admin',  'billing:view');
```

### Langkah 2: Implementasikan Hashing Kata Sandi dan Helper Sesi

Pasang dependensi untuk hashing dan pembuatan token yang aman:

```bash
npm install @node-rs/argon2
```

Tulis helper hashing dan utilitas token sesi:

```typescript
// src/lib/server/auth.ts
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,  // 19 MiB
    timeCost: 2,
    parallelism: 1
  });
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return verify(hash, password);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
```

### Langkah 3: Bangun Form Actions Login dan Logout

Buat `src/routes/login/+page.server.ts` dengan form action yang memverifikasi kredensial, membuat sesi, dan mengembalikan header `Set-Cookie`. Form actions menjaga alur login tetap progresif — berfungsi tanpa JavaScript dan meningkat secara otomatis.

```typescript
// src/routes/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { hashSessionToken, generateSessionToken, verifyPassword } from '$lib/server/auth';
import { sessionCookie } from '$lib/server/session';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');

    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as { id: string; password_hash: string } | undefined;

    if (!user || !(await verifyPassword(user.password_hash, password))) {
      return fail(400, { error: 'Invalid email or password.' });
    }

    const token = generateSessionToken();
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;

    db.prepare(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(crypto.randomUUID(), user.id, hashSessionToken(token), expiresAt, Math.floor(Date.now() / 1000));

    cookies.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    redirect(303, '/account');
  }
};
```

Untuk logout, hapus catatan sesi dan bersihkan cookie:

```typescript
// src/routes/logout/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { hashSessionToken } from '$lib/server/auth';

export const actions: Actions = {
  default: async ({ cookies }) => {
    const token = cookies.get('session');
    if (token) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSessionToken(token));
    }
    cookies.delete('session', { path: '/' });
    redirect(303, '/login');
  }
};
```

### Langkah 4: Baca dan Validasi Sesi di Hooks

Pusatkan resolusi sesi di `src/hooks.server.ts`. Selesaikan token, cari hash-nya, periksa kedaluwarsanya, dan lampirkan pengguna ke `event.locals`:

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { hashSessionToken } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session');

  if (token) {
    const session = db
      .prepare(
        `SELECT s.id AS session_id, s.expires_at, u.*
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`
      )
      .get(hashSessionToken(token)) as
      | { session_id: string; expires_at: number; id: string; email: string; role: string }
      | undefined;

    if (session && session.expires_at > Math.floor(Date.now() / 1000)) {
      event.locals.user = {
        id: session.id,
        email: session.email,
        role: session.role
      };
      event.locals.sessionId = session.session_id;
    } else if (session) {
      // Kedaluwarsa: bersihkan dan buang cookie
      db.prepare('DELETE FROM sessions WHERE id = ?').run(session.session_id);
      event.cookies.delete('session', { path: '/' });
    }
  }

  return resolve(event);
};
```

Deklarasikan tipe locals di `src/app.d.ts`:

```typescript
// src/app.d.ts
declare global {
  namespace App {
    interface Locals {
      user?: { id: string; email: string; role: string };
      sessionId?: string;
    }
  }
}

export {};
```

### Langkah 5: Lindungi Rute dengan Guard Layout

Definisikan guard di server layout grup rute yang dilindungi. Setiap rute di dalam `(auth)` mewarisinya:

```typescript
// src/routes/(auth)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    redirect(303, '/login');
  }
  return { user: locals.user };
};
```

Untuk halaman login, tambahkan guard kebalikannya — arahkan pengguna yang sudah terautentikasi agar menjauh:

```typescript
// src/routes/login/+page.server.ts (load)
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    redirect(303, '/account');
  }
};
```

### Langkah 6: Implementasikan Izin RBAC di Fungsi Load

Tambahkan helper otorisasi yang dapat digunakan ulang untuk memeriksa izin terhadap peran pengguna:

```typescript
// src/lib/server/authorize.ts
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { Locals } from '$lib/types';

export async function requirePermission(
  locals: Locals,
  permission: string
): Promise<void> {
  const user = locals.user;
  if (!user) {
    error(401, 'Authentication required.');
  }

  const row = db
    .prepare('SELECT 1 FROM permissions WHERE role = ? AND permission = ?')
    .get(user.role, permission);

  if (!row) {
    error(403, 'You do not have permission to perform this action.');
  }
}
```

Lalu panggil di bagian atas fungsi load dan actions yang dilindungi:

```typescript
// src/routes/(auth)/admin/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/authorize';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
  await requirePermission(locals, 'user:delete');
  const users = db.prepare('SELECT id, email, role FROM users').all();
  return { users };
};

export const actions: Actions = {
  deleteUser: async ({ locals, request }) => {
    await requirePermission(locals, 'user:delete');
    const data = await request.formData();
    db.prepare('DELETE FROM users WHERE id = ?').run(String(data.get('userId')));
  }
};
```

### Langkah 7: Integrasikan OAuth 2.0 dengan Provider Eksternal

Pasang `arctic` untuk alur provider yang sesuai standar:

```bash
npm install arctic
```

Buat instance provider, lalu tangani alur dua kaki — arahkan ke provider, tukar kode:

```typescript
// src/lib/server/oauth.ts
import { GitHub } from 'arctic';

export const github = new GitHub(
  import.meta.env.VITE_GITHUB_CLIENT_ID,
  import.meta.env.VITE_GITHUB_CLIENT_SECRET
);
```

```typescript
// src/routes/login/github/+server.ts
import { redirect } from '@sveltejs/kit';
import { generateState, generateCodeVerifier } from 'arctic';
import type { RequestHandler } from './$types';
import { github } from '$lib/server/oauth';

export const GET: RequestHandler = async ({ cookies }) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = github.createAuthorizationURL(state, codeVerifier, ['read:user', 'user:email']);

  cookies.set('oauth_state', state, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600 });
  cookies.set('oauth_code_verifier', codeVerifier, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600 });

  redirect(302, url.toString());
};
```

Tukar authorization code di rute callback, verifikasi identitas provider yang dikembalikan, dan upsert pengguna lokal:

```typescript
// src/routes/login/github/callback/+server.ts
import { redirect } from '@sveltejs/kit';
import { generateState, generateCodeVerifier } from 'arctic';
import type { RequestHandler } from './$types';
import { github } from '$lib/server/oauth';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies.get('oauth_state');
  const codeVerifier = cookies.get('oauth_code_verifier');

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    redirect(303, '/login?error=oauth_state_mismatch');
  }

  const tokens = await github.validateAuthorizationCode(code, codeVerifier);
  const githubUser = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokens.accessToken}` }
  }).then((r) => r.json());

  const email = githubUser.email ?? `${githubUser.login}@users.noreply.github.com`;
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    // Jangan pernah menyimpan kata sandi untuk pengguna khusus OAuth: tandai akun sebagai tertaut OAuth
    db.prepare('INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), email, '', 'member', Math.floor(Date.now() / 1000));
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  // Terbitkan cookie sesi normal, persis seperti alur kata sandi
  const token = generateSessionToken();
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  db.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), user.id, hashSessionToken(token), expiresAt, Math.floor(Date.now() / 1000));

  cookies.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });
  cookies.delete('oauth_state', { path: '/' });
  cookies.delete('oauth_code_verifier', { path: '/' });

  redirect(303, '/account');
};
```

### Langkah 8: Perkuat Headers dan Terapkan Rate Limit pada Endpoint Auth

Terapkan security headers secara terpusat di hook `handle` sehingga setiap respons — termasuk halaman error — membawanya:

```typescript
// src/hooks.server.ts (diperluas)
import type { Handle } from '@sveltejs/kit';

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Frame-Options': 'DENY'
};

export const handle: Handle = async ({ event, resolve }) => {
  // ...resolusi sesi dari Langkah 4...

  const response = await resolve(event);
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  return response;
};
```

Beri rate limit pada percobaan login dengan store in-memory kecil yang dikunci berdasarkan IP dan email. Di produksi, pindahkan ke store bersama (Redis atau basis data Anda) agar bertahan dari restarts dan diskalakan lintas instance:

```typescript
// src/lib/server/rate-limit.ts
const attempts = new Map<string, number[]>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    attempts.set(key, recent);
    return true;
  }
  recent.push(now);
  attempts.set(key, recent);
  return false;
}
```

### Langkah 9: Tulis Pengujian Unit dan E2E untuk Alur Auth

Uji unit helper murni — round-trip pembuatan token, verifikasi hashing kata sandi, dan pencarian izin:

```typescript
// src/lib/server/auth.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateSessionToken, hashSessionToken } from './auth';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword(hash, 'correct horse battery staple')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
  });
});

describe('session tokens', () => {
  it('stores a hash, never the raw token', () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).not.toBe(token);
    expect(hashSessionToken(token)).toHaveLength(64);
  });
});
```

End-to-end dengan Playwright — uji perilaku redirect dan cookie yang sesungguhnya di browser:

```typescript
// tests/auth.spec.ts
import { expect, test } from '@playwright/test';

test('unauthenticated users are redirected to /login', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login/);
});

test('successful login reaches the protected area', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('member@example.com');
  await page.getByLabel('Password').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByText('Welcome back')).toBeVisible();
});

test('logout clears the session', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('member@example.com');
  await page.getByLabel('Password').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login/);
});
```

Jalankan rangkaian pengujian di CI setelah setiap push:

```bash
npm run test:unit && npm run test:e2e
```

## Langkah Berikutnya

Dengan fondasi autentikasi dan otorisasi yang aman, jelajahi lebih lanjut penguatan siklus hidup sesi Anda — endpoint pencabutan sesi, dashboard manajemen perangkat, multi-factor authentication dengan TOTP, dan audit logging untuk perubahan hak istimewa. Masing-masing dibangun secara alami di atas model sesi dan izin yang baru Anda implementasikan.

## Kesimpulan

Hooks, load functions, dan form actions SvelteKit memetakan dengan rapi ke primitif keamanan yang dibutuhkan setiap aplikasi. Dengan memusatkan validasi sesi di `hooks.server.ts`, menegakkan izin di batas data dengan pemeriksaan izin eksplisit, menyerahkan verifikasi identitas ke provider OAuth, dan mempertahankan lapisan transport dengan cookie, headers, dan rate limits, Anda mendapatkan arsitektur autentikasi yang aman secara default dan mudah diperluas. Struktur yang sama dapat diskalakan dari proyek solo dengan login kata sandi hingga platform multi-tenant dengan OAuth, RBAC, dan audit trails — karena setiap kekhawatiran berada di tepat satu tempat.

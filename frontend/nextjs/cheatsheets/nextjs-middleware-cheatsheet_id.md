---
title: "Cheat Sheet Middleware Next.js"
description: "Referensi cepat middleware Next.js: konfigurasi matcher, redirect dan rewrite, pembatasan akses berbasis auth, header request dan response, cookie, serta batasan Edge runtime yang menentukan apa yang aman dijalankan di sana."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Middleware Next.js

## Tabel Referensi Cepat

| Aksi | Kode / Konfigurasi | Deskripsi |
|------|--------------------|-----------|
| Batasi ke satu cabang path | `matcher: ['/dashboard/:path*']` | Berjalan untuk `/dashboard` dan seluruh path di bawahnya |
| Kecualikan aset internal | `matcher: ['/((?!api\|_next/static\|_next/image\|favicon.ico).*)']` | Berjalan di semua path kecuali aset statis dan route API |
| Cocokkan berdasarkan kondisi | `matcher: [{ source: '/api/:path*', has: [{ type: 'header', key: 'x-csrf' }] }]` | Pencocokan bersyarat memakai `has` / `missing` |
| Redirect | `NextResponse.redirect(new URL('/login', req.url), 307)` | Mengembalikan redirect; 307 mempertahankan method |
| Rewrite internal | `NextResponse.rewrite(new URL('/beta', req.url))` | Menyajikan konten lain tanpa mengubah URL di browser |
| Loloskan request | `NextResponse.next()` | Lanjut ke page atau route handler |
| Teruskan header | `NextResponse.next({ request: { headers } })` | Header request hasil modifikasi terlihat oleh handler |
| Header response | `res.headers.set('X-Frame-Options', 'DENY')` | Menempelkan header keamanan atau cache |
| Baca cookie | `request.cookies.get('session')?.value` | Nilainya string; `undefined` bila tidak ada |
| Set cookie | `res.cookies.set('sid', value, { httpOnly: true })` | Menghasilkan `Set-Cookie` pada response |
| Baca path | `request.nextUrl.pathname` | Pathname hasil decode, dipakai untuk pencocokan dan log |
| Clone URL | `request.nextUrl.clone()` | Cara aman mengubah path atau search param |
| URL dasar | `request.url` | URL absolut dengan skema dan host, wajib untuk `new URL()` |
| Lewati prefetch | `request.headers.get('next-router-prefetch')` | Request prefetch sebaiknya tidak melewati pengecekan berat |
| API Node.js | Tidak tersedia | Edge runtime tanpa `fs`, `path`, `net`, `Buffer`, dan `eval` |
| Runtime Node | `runtime: 'nodejs'` pada `config` | Keluar dari Edge runtime secara eksperimental (15.2+) |

## Perintah Umum

### Development dan Build

```bash
npx next dev            # middleware berjalan pada setiap request yang cocok
npx next build          # menampilkan ukuran bundle middleware di ringkasan route
npx next start          # server produksi; middleware juga aktif di sini
```

### Verifikasi Perilaku dengan curl

```bash
# Ikuti rantai redirect dan tampilkan setiap status
curl -sIL http://localhost:3000/dashboard | grep -iE '^(HTTP|location)'

# Harapkan 307 + Location: /login ketika cookie session tidak ada
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/dashboard

# Request yang sama dengan cookie, untuk menguji jalur sukses
curl -s -o /dev/null -w '%{http_code}\n' -H 'Cookie: session=valid-token' http://localhost:3000/dashboard

# Periksa header yang disuntikkan middleware
curl -sI http://localhost:3000/ | grep -i 'x-request-id'
```

## Potongan Kode

### Konfigurasi Matcher

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    return NextResponse.next(); // hanya berjalan pada path yang dideklarasikan
}

export const config = {
    // Array harus literal statis — variabel tidak dapat dianalisis saat build
    matcher: [
        '/dashboard/:path*',
        '/account/:path*',
        '/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)',
    ],
};
```

### Pembatasan Akses dengan JWT yang Aman di Edge

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // kompatibel edge, memakai Web Crypto

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('session')?.value;
    if (!token) {
        const login = new URL('/login', request.url);
        login.searchParams.set('next', request.nextUrl.pathname);
        return NextResponse.redirect(login);
    }
    try {
        await jwtVerify(token, secret); // melempar error bila kedaluwarsa atau signature salah
        return NextResponse.next();
    } catch {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('session'); // bersihkan token yang tidak terpakai
        return response;
    }
}

export const config = { matcher: ['/dashboard/:path*', '/account/:path*'] };
```

### Rewrite dan Proxy dengan Penerusan Header

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();

    // Uji A/B internal: rewrite, bukan redirect
    if (url.pathname === '/pricing' && request.cookies.get('beta')?.value === '1') {
        url.pathname = '/pricing-v2';
        return NextResponse.rewrite(url);
    }

    // Proxy API eksternal melalui origin yang sama
    if (url.pathname.startsWith('/api/legacy')) {
        const path = url.pathname.replace('/api/legacy', '');
        const target = new URL(path, process.env.LEGACY_API_URL);
        const headers = new Headers(request.headers);
        headers.set('x-forwarded-host', request.headers.get('host') ?? '');
        headers.delete('cookie'); // jangan pernah bocorkan cookie session ke upstream
        return NextResponse.rewrite(target, { request: { headers } });
    }
    return NextResponse.next();
}
```

### Header Keamanan dan Request ID

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const requestId = crypto.randomUUID(); // global Web Crypto, tanpa import
    const headers = new Headers(request.headers);
    headers.set('x-request-id', requestId);

    const response = NextResponse.next({ request: { headers } });
    response.headers.set('x-request-id', requestId);
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
}
```

### Batasan Edge Runtime yang Perlu Diingat

```typescript
// Diizinkan: fetch, Web Crypto (crypto.subtle), TextEncoder/TextDecoder, URL, Headers, cookie
// Tidak diizinkan: fs, path, net, child_process, Buffer, native addon, eval, SDK khusus Node
// Tanpa body response: middleware hanya boleh redirect, rewrite, atau mengubah header.

export const config = {
    matcher: ['/app/:path*'],
    // runtime: 'nodejs', // eksperimental: mengaktifkan API Node, cold start lebih lambat
};
```

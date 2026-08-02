---
title: "Cheat Sheet Caching dan Revalidasi Next.js"
description: "Referensi cepat untuk menguasai caching Next.js — empat lapisan caching (Request Memoization, Data Cache, Full Route Cache, Router Cache), revalidasi berbasis waktu dan on-demand, ISR, unstable_cache, header cache, dan debugging perilaku cache di produksi."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Caching dan Revalidasi Next.js

## Tabel Referensi Cepat

| Aksi | Kode / Konfigurasi | Deskripsi |
|------|--------------------|-----------|
| Request Memoization | Default dengan `fetch` | React mendeduplikasi fetch identik dalam satu proses render (per permintaan) |
| Nonaktifkan Data Cache | `fetch(url, { cache: 'no-store' })` | Melewati cache HTTP persisten untuk satu fetch |
| Revalidasi berbasis waktu | `fetch(url, { next: { revalidate: 3600 } })` | Cache respons dan revalidasi maksimal sekali per jam |
| Revalidasi berbasis tag | `fetch(url, { next: { tags: ['posts'] } })` | Beri tag data cache agar bisa dibersihkan on-demand |
| ISR tingkat segmen | `export const revalidate = 60` | Revalidasi seluruh segmen rute setiap 60 detik |
| Paksa rendering dinamis | `export const dynamic = 'force-dynamic'` | Menonaktifkan optimasi statis dan Full Route Cache untuk segmen |
| Revalidasi sebuah path | `revalidatePath('/blog')` | Membersihkan Data Cache dan Full Route Cache untuk path tertentu |
| Revalidasi berdasarkan tag | `revalidateTag('posts')` | Membersihkan semua entri cache bertag `posts` |
| Cache data arbitrer | `unstable_cache(fn, ['key'], { revalidate: 300 })` | Memoisasi query database atau komputasi yang mahal |
| Lewati cache per permintaan | `noStore()` | Mengecualikan permintaan saat ini dari Data Cache dan Full Route Cache |
| Periksa status cache | header `x-nextjs-cache: HIT` | Verifikasi `HIT` / `MISS` / `STALE` pada respons produksi |
| Segarkan Router Cache | `router.refresh()` | Mengambil ulang payload RSC rute saat ini di sisi klien |

## Perintah Umum

### Build dan Inspeksi

```bash
# Buat build produksi dan periksa output rute statis/dinamis
npm run build

# Jalankan server produksi (caching hanya berlaku di produksi, bukan dev)
npm start

# Periksa header status cache sebuah halaman
curl -sI https://example.com/blog | grep -i x-nextjs-cache
# x-nextjs-cache: HIT | MISS | STALE

# Periksa header status cache endpoint route handler
curl -sI https://example.com/api/posts | grep -i x-nextjs-cache
```

### Referensi Header Cache

```text
x-nextjs-cache: HIT      # Respons dilayani dari cache
x-nextjs-cache: MISS     # Respons tidak ada di cache, dirender lalu disimpan
x-nextjs-cache: STALE    # Dilayani versi basi sambil revalidasi di latar belakang
x-nextjs-cache: BYPASS   # Caching dilewati (rute dinamis, no-store, dll.)
```

### Flag Lingkungan

```bash
# Nonaktifkan Data Cache saat build (semua fetch berperilaku no-store)
NEXT_DISABLE_DATA_CACHE=1 npm run build

# Nonaktifkan Full Route Cache saat build (selalu rendering dinamis)
NEXT_DISABLE_FULL_ROUTE_CACHE=1 npm run build
```

## Potongan Kode

### Revalidasi Berbasis Waktu (ISR)

```typescript
// app/blog/page.tsx
// Revalidasi halaman ini maksimal sekali setiap 60 detik
export const revalidate = 60;

async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 3600 }, // override per-fetch: 1 jam
  });
  if (!res.ok) throw new Error('Gagal mengambil posts');
  return res.json();
}

export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <ul>
      {posts.map((post: { id: string; title: string }) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### Revalidasi Berbasis Tag

```typescript
// app/products/page.tsx
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { tags: ['products'] },
  });
  if (!res.ok) throw new Error('Gagal mengambil products');
  return res.json();
}

// app/actions.ts
'use server';

import { revalidateTag } from 'next/cache';

export async function refreshProducts() {
  // Invalidasi semua fetch bertag 'products'
  revalidateTag('products');
}
```

### Revalidasi Path dari Server Action

```typescript
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const title = String(formData.get('title') ?? '');
  if (!title) {
    return { error: 'Judul wajib diisi' };
  }

  const post = await db.post.create({ data: { title } });

  // Bersihkan indeks blog dan rute dinamis post baru
  revalidatePath('/blog');
  revalidatePath(`/blog/${post.slug}`);
  redirect(`/blog/${post.slug}`);
}
```

### Cache Query Database dengan unstable_cache

```typescript
// lib/dashboard.ts
import { unstable_cache } from 'next/cache';
import { db } from './db';

export const getDashboardStats = unstable_cache(
  async () => {
    const [users, orders] = await Promise.all([
      db.user.count(),
      db.order.aggregate({ _sum: { total: true } }),
    ]);
    return { users, revenue: orders._sum.total ?? 0 };
  },
  ['dashboard-stats'], // kunci cache (deps)
  { revalidate: 300, tags: ['dashboard'] } // 5 menit, tag 'dashboard'
);
```

### Menonaktifkan Caching

```typescript
// app/live/page.tsx
import { noStore } from 'next/cache';

export default async function LivePage() {
  noStore(); // dynamic: force-dynamic, fetchCache: force-no-store
  const events = await getLiveEvents();
  return <pre>{JSON.stringify(events, null, 2)}</pre>;
}
```

### Route Handler dengan Cache-Control CDN

```typescript
// app/api/weather/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const data = await getWeather();

  const response = NextResponse.json(data);
  // Cache di CDN selama 60 detik, izinkan stale-while-revalidate 300 detik
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );
  return response;
}
```

### Debug Header Cache

```bash
# Di produksi, konfirmasi lapisan cache mana yang melayani respons
curl -sI https://example.com/dashboard | grep -iE 'x-nextjs-cache|cache-control'
```

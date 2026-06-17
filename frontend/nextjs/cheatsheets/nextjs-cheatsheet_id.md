---
title: "Cheat Sheet Next.js"
description: "Panduan referensi cepat untuk Next.js — mencakup App Router, konvensi routing, strategi rendering, Server dan Client Components, pengambilan data, caching, middleware, API routes, autentikasi, dan deployment."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Next.js

## Tabel Referensi Cepat

| Aksi | Kode / Konfigurasi | Deskripsi |
|------|--------------------|-----------|
| Membuat proyek | `npx create-next-app@latest my-app` | Membuat proyek Next.js baru dengan App Router secara default |
| Server dev | `npm run dev` | Memulai server pengembangan dengan hot module replacement (default :3000) |
| Build produksi | `npm run build` | Membuat build produksi yang dioptimalkan dengan halaman static/SSR |
| Menjalankan produksi | `npm start` | Menjalankan server produksi setelah `npm run build` |
| Ekspor statis | `next.config.js` → `output: 'export'` | Menghasilkan situs statis penuh (tanpa server Node.js) |
| Route halaman | `app/page.tsx` | Memetakan ke `/` (root route) |
| Route dinamis | `app/blog/[slug]/page.tsx` | Memetakan ke `/blog/:slug` |
| Route catch-all | `app/blog/[...slug]/page.tsx` | Memetakan `/blog/a/b/c` → `{ slug: ['a','b','c'] }` |
| Catch-all opsional | `app/blog/[[...slug]]/page.tsx` | Memetakan ke `/blog` dan `/blog/a/b` |
| Route group | `app/(marketing)/about/page.tsx` | Mengelompokkan route tanpa memengaruhi URL |
| Route paralel | `app/@team/page.tsx` dan `app/@analytics/page.tsx` | Merender beberapa slot tampilan independen dalam layout yang sama |
| Intercepting route | `app/feed/(..)photo/[id]/page.tsx` | Memuat route dari dalam layout saat ini (pola modal) |
| Loading UI | `app/blog/loading.tsx` | Menampilkan status loading instan (Suspense boundary) |
| Error UI | `app/blog/error.tsx` | Error boundary sisi klien untuk segmen route |
| Not found | `app/blog/not-found.tsx` | Halaman 404 kustom untuk segmen route tertentu |
| Layout | `app/blog/layout.tsx` | UI bersama yang bertahan di seluruh child route (tidak re-render) |
| Template | `app/blog/template.tsx` | UI bersama yang re-render pada setiap navigasi (re-mount state) |
| Middleware | `middleware.ts` di root proyek | Menjalankan kode sebelum setiap request (redirect, rewrite, header) |

## Perintah Umum

### Pembuatan Proyek

```bash
# Membuat proyek Next.js 14+ baru dengan App Router (default)
npx create-next-app@latest my-app --typescript --tailwind --eslint

# Dengan opsi spesifik
npx create-next-app@latest my-app --typescript --app --src-dir --import-alias "@/*"

# Upgrade Next.js di proyek yang sudah ada
npm install next@latest react@latest react-dom@latest
```

### Pengembangan

```bash
# Memulai server pengembangan
npm run dev

# Build untuk produksi
npm run build

# Analisis ukuran bundle (membutuhkan @next/bundle-analyzer)
ANALYZE=true npm run build

# Memulai server produksi
npm start

# Memeriksa lint semua file
npm run lint

# Menjalankan lint dengan auto-fix
npm run lint -- --fix
```

### Variabel Lingkungan

```bash
# Hanya pengembangan
# .env.local — menimpa semua file .env lainnya
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Semua lingkungan (di-commit ke repo)
# .env
NEXT_PUBLIC_API_URL="https://api.example.com"

# Hanya produksi
# .env.production
API_SECRET="production-secret"
```

### Ekspor Statis

```bash
# Konfigurasi di next.config.js
# output: 'export'
# Kemudian build dan deploy folder 'out/' ke hosting statis
npm run build

# Uji secara lokal
npx serve@latest out
```

## Potongan Kode

### Halaman (Server Component — Default)

```typescript
// app/page.tsx
export default function HomePage() {
  return (
    <main>
      <h1>Selamat Datang di Next.js</h1>
    </main>
  );
}
```

### Halaman Route Dinamis

```typescript
// app/blog/[slug]/page.tsx
interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BlogPost({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const post = await getPost(slug);

  return (
    <article>
      <h1>{post.title}</h1>
      {preview === 'true' && <p className="preview-badge">Mode pratinjau</p>}
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

### Layout (Kerangka Persisten)

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aplikasi Saya',
  description: 'Dibuat dengan create next app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased">
        <nav>{/* navigasi persisten */}</nav>
        {children}
        <footer>{/* footer persisten */}</footer>
      </body>
    </html>
  );
}
```

### Layout Bersarang

```typescript
// app/blog/layout.tsx
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      <aside>{/* sidebar blog — bertahan di seluruh sub-route blog */}</aside>
      {children}
    </section>
  );
}
```

### Loading UI (Suspense Boundary)

```typescript
// app/blog/loading.tsx
export default function Loading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
      <div className="h-4 w-full bg-gray-100 rounded mb-2" />
      <div className="h-4 w-3/4 bg-gray-100 rounded mb-2" />
      <div className="h-4 w-1/2 bg-gray-100 rounded" />
    </div>
  );
}
```

### Error Boundary

```typescript
// app/blog/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 text-center">
      <h2>Terjadi kesalahan!</h2>
      <p className="text-red-600">{error.message}</p>
      <button onClick={() => reset()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
        Coba lagi
      </button>
    </div>
  );
}
```

### Halaman Not Found

```typescript
// app/blog/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="p-8 text-center">
      <h2>Postingan tidak ditemukan</h2>
      <p>Tidak dapat menemukan postingan blog yang diminta.</p>
      <Link href="/blog" className="text-blue-500 underline">
        Kembali ke blog
      </Link>
    </div>
  );
}
```

### Pengambilan Data — Server Component

```typescript
// app/products/page.tsx
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 }, // ISR: revalidasi setiap jam
  });
  if (!res.ok) throw new Error('Gagal mengambil data produk');
  return res.json();
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <ul>
      {products.map((product: any) => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  );
}
```

### Pengambilan Data — Client Component dengan SWR

```typescript
// app/dashboard/page.tsx
'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Dashboard() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher, {
    refreshInterval: 30000, // polling setiap 30 detik
  });

  if (isLoading) return <p>Memuat...</p>;
  if (error) return <p>Gagal memuat data pengguna</p>;

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

### Server Action (Penanganan Formulir)

```typescript
// app/contact/page.tsx
'use server';

import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  message: z.string().min(10),
});

export default async function submitContact(formData: FormData) {
  'use server';

  const validated = schema.parse({
    email: formData.get('email'),
    message: formData.get('message'),
  });

  await sendEmail(validated.email, validated.message);
  return { success: true };
}
```

```typescript
// app/contact/page.tsx (lanjutan — komponen form)
'use client';

import { useActionState } from 'react';

const initialState = { success: false, error: null as string | null };

function submitForm(prevState: typeof initialState, formData: FormData) {
  'use server';
  // logika server action
}

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitForm, initialState);

  return (
    <form action={formAction}>
      <input name="email" type="email" required disabled={pending} />
      <textarea name="message" required disabled={pending} minLength={10} />
      <button type="submit" disabled={pending}>
        {pending ? 'Mengirim...' : 'Kirim'}
      </button>
      {state.success && <p className="text-green-600">Pesan terkirim!</p>}
      {state.error && <p className="text-red-600">{state.error}</p>}
    </form>
  );
}
```

### Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Redirect pengguna yang belum login
  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Menambahkan header kustom
  const response = NextResponse.next();
  response.headers.set('x-request-id', crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*'],
};
```

### API Route (Route Handler)

```typescript
// app/api/products/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  const products = await db.products.findMany({
    where: category ? { category } : undefined,
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const body = await request.json();
  const product = await db.products.create({ data: body });

  return NextResponse.json(product, { status: 201 });
}
```

### Pembuatan Path Statis (generateStaticParams)

```typescript
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getPostSlugs();

  return posts.map((post: { slug: string }) => ({
    slug: post.slug,
  }));
}

// Opsional: revalidasi on-demand
export const revalidate = 3600; // detik
```

### Optimasi Gambar

```typescript
import Image from 'next/image';

export default function Hero() {
  return (
    <Image
      src="/images/hero.webp"
      alt="Banner hero"
      width={1200}
      height={630}
      priority // preload gambar (gunakan hanya untuk Above The Fold)
      className="rounded-lg"
    />
  );
}
```

### Optimasi Font

```typescript
// app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${robotoMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

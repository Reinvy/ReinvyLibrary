---
title: "Struktur Proyek Next.js dan Praktik Terbaik"
description: "Panduan komprehensif untuk mengorganisir aplikasi Next.js dengan App Router, mencakup konvensi struktur folder, pola komponen, strategi pengambilan data, dan optimalisasi performa."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Struktur Proyek Next.js dan Praktik Terbaik

## Pendahuluan

Next.js telah berevolusi secara signifikan sejak diperkenalkannya App Router di versi 13. Paradigma baru ini beralih dari routing berbasis halaman ke model routing berbasis sistem file yang dibangun di atas React Server Components. Panduan ini menyediakan pendekatan terstruktur untuk mengorganisir proyek Next.js, mencakup konvensi folder, batasan server versus client, pola pengambilan data, dan teknik optimalisasi performa. Mengikuti praktik terbaik ini memastikan aplikasi yang mudah dipelihara, skalabel, dan berperforma tinggi yang memanfaatkan sepenuhnya kekuatan App Router.

## Praktik Terbaik

### 1. Organisasi Berdasarkan Fitur, Bukan Tipe

Kelompokkan file terkait berdasarkan domain fitur, bukan peran teknis. Struktur berbasis fitur menjaga komponen, hook, dan utilitas yang saling terkait tetap berada di satu tempat dan memudahkan penalaran tentang batasan aplikasi.

```text
src/
  app/              # Halaman dan layout App Router
  features/
    auth/           # Fitur autentikasi
      components/   # UI spesifik autentikasi
      hooks/        # Hook spesifik autentikasi
      utils/        # Utilitas autentikasi
      api/          # Route API autentikasi
    dashboard/      # Fitur dashboard
      components/
      hooks/
      utils/
  lib/              # Utilitas dan konfigurasi bersama
  ui/               # Komponen design system bersama
```

### 2. Gunakan Server Components Secara Default

App Router Next.js secara bawaan menggunakan React Server Components (RSC). Pertahankan komponen di server sebisa mungkin — mereka mengurangi JavaScript sisi client, mempercepat muatan halaman awal, dan dapat mengakses database serta sistem file secara langsung. Hanya tambahkan `"use client"` ketika Anda membutuhkan interaktivitas: event handler, API khusus browser, state, atau efek.

**Kapan menggunakan `"use client"`:**
- Formulir dengan `useState` atau form action yang membutuhkan umpan balik client
- UI interaktif (modal, dropdown, tab dengan animasi)
- Komponen yang menggunakan `useEffect`, `useContext`, atau API browser
- Library komponen pihak ketiga yang membutuhkan client

### 3. Pusatkan Pengambilan Data di Server Components

Ambil data langsung di Server Components daripada menggunakan `useEffect` di client. Ini menghilangkan waterfalls client-server, memungkinkan deduplikasi permintaan otomatis, dan mendukung streaming dengan batasan Suspense.

```typescript
// app/dashboard/page.tsx — Server Component
import { Suspense } from "react";
import { DashboardContent } from "./dashboard-content";
import { DashboardSkeleton } from "./dashboard-skeleton";

export default async function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
```

### 4. Gunakan Route Groups untuk Organisasi Logis

Route Groups (`(groupName)`) mengorganisir route tanpa memengaruhi jalur URL. Gunakan untuk memisahkan bagian aplikasi, menerapkan layout berbeda, atau mengisolasi alur autentikasi.

```text
app/
  (marketing)/
    page.tsx          → /
    about/page.tsx    → /about
  (dashboard)/
    layout.tsx        → Layout dashboard (terautentikasi)
    dashboard/
      page.tsx        → /dashboard
  (auth)/
    layout.tsx        → Layout auth (kartu terpusat)
    login/page.tsx    → /login
    register/page.tsx → /register
```

### 5. Simpan Kode Bersama di Direktori `lib` Khusus

Tempatkan utilitas bersama, client database, helper API, konstanta konfigurasi, dan definisi tipe di direktori `lib/` tingkat atas. Ini menciptakan batasan yang jelas antara logika aplikasi dan infrastruktur yang dapat digunakan kembali.

```text
lib/
  db.ts               # Client database (Prisma, Drizzle)
  session.ts          # Manajemen sesi
  api-client.ts       # Client API eksternal
  constants.ts        # Konstanta seluruh aplikasi
  utils.ts            # Fungsi utilitas murni
  types.ts            # Tipe TypeScript bersama
```

### 6. Utamakan `fetch` dengan Caching Next.js daripada Panggilan Database Mentah

Next.js memperluas fungsi `fetch` bawaan dengan semantik caching dan revalidation. Gunakan `fetch` untuk panggilan API dan `cache()` (dari React) untuk kueri database guna mengaktifkan kontrol cache yang lebih terperinci dengan `revalidateTag` dan `revalidatePath`.

```typescript
import { cache } from "react";
import { db } from "@/lib/db";

export const getPosts = cache(async () => {
  return db.post.findMany({ where: { published: true } });
});
```

### 7. Struktur Route API dengan Pola Route Handler

Gunakan konvensi route handler App Router (`route.ts`) untuk endpoint API. Ekspor fungsi bernama (`GET`, `POST`, `PUT`, `DELETE`) daripada satu fungsi handler, menjaga setiap metode tetap fokus dan dapat diuji.

```typescript
// app/api/posts/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";

export async function GET() {
  const posts = await getPosts();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Tidak terotorisasi" }, { status: 401 });
  const body = await request.json();
  const post = await createPost(body);
  return NextResponse.json(post, { status: 201 });
}
```

### 8. Gunakan Environment Variables dengan Validasi

Akses environment variables melalui objek konfigurasi yang divalidasi, bukan `process.env` secara langsung. Ini menangkap variabel yang hilang pada waktu build dan memberikan type safety.

```typescript
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

## Langkah Implementasi

### Langkah 1: Siapkan Struktur Proyek

Inisialisasi proyek Next.js baru dan segera buat struktur folder sebelum menulis kode aplikasi.

```bash
npx create-next-app@latest my-app --typescript --tailwind --app --src-dir
cd my-app
```

Buat struktur direktori berbasis fitur:

```bash
mkdir -p src/features/{auth,dashboard,posts,settings}/{components,hooks,utils,api}
mkdir -p src/lib src/ui
```

### Langkah 2: Siapkan Library Bersama

Konfigurasikan client database, manajemen sesi, dan utilitas bersama di `src/lib/`. Pilih ORM database (Prisma atau Drizzle) dan siapkan layer koneksi.

```bash
npm install @prisma/client
npx prisma init
```

Buat `src/lib/db.ts` dengan pola singleton Prisma client, dan `src/lib/env.ts` dengan validasi Zod untuk environment variables.

### Langkah 3: Bangun Hierarki Layout Aplikasi

Buat root layout yang membungkus seluruh aplikasi, lalu gunakan Route Groups untuk menerapkan layout berbeda untuk bagian yang berbeda.

```bash
touch src/app/layout.tsx
mkdir -p src/app/\(marketing\) src/app/\(dashboard\) src/app/\(auth\)
```

Setiap route group mendapatkan `layout.tsx` sendiri dengan navigasi bersama, sidebar, atau penjaga autentikasi untuk bagian tersebut.

### Langkah 4: Implementasikan Modul Fitur

Bangun satu fitur lengkap (misalnya, daftar posting blog) untuk memvalidasi arsitektur. Mulai dengan Server Component yang mengambil data secara langsung, bungkus dalam batasan Suspense, dan tambahkan loading skeleton.

Buat `src/features/posts/components/post-list.tsx` sebagai Server Component, dan `src/features/posts/components/post-list-skeleton.tsx` untuk state loading.

### Langkah 5: Tambahkan Client Components untuk Interaktivitas

Identifikasi elemen interaktif (kolom pencarian, kontrol paginasi, toggle tema) dan ekstrak menjadi Client Components. Tempatkan di direktori `components/` fitur tersebut dan impor ke parent Server Component tanpa menambahkan `"use client"` ke parent.

```typescript
// Client Component yang ditempatkan bersama fiturnya
"use client";
export function PostSearch({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <input
      type="search"
      onChange={(e) => onSearch(e.target.value)}
      placeholder="Cari posting..."
      className="border p-2 rounded"
    />
  );
}
```

### Langkah 6: Tambahkan Route Handler API

Buat endpoint API menggunakan pola route handler untuk mutasi sisi client (misalnya, membuat posting, login pengguna). Tempatkan di `app/api/<resource>/route.ts`.

```bash
mkdir -p src/app/api/posts
touch src/app/api/posts/route.ts
```

### Langkah 7: Konfigurasi Caching dan Revalidation

Siapkan ISR (Incremental Static Regeneration) untuk halaman yang bisa statis dengan pembaruan periodik, dan gunakan `revalidateTag` serta `revalidatePath` untuk invalidasi cache on-demand setelah mutasi.

```typescript
export const revalidate = 3600; // Revalidasi halaman ini setiap jam

// Atau untuk revalidasi on-demand di route handler
import { revalidateTag } from "next/cache";

export async function POST() {
  await createPost();
  revalidateTag("posts");
  return Response.json({ success: true });
}
```

### Langkah 8: Uji dan Verifikasi

Jalankan server development, verifikasi bahwa halaman dirender dengan benar, periksa bahwa Server Components menghasilkan JavaScript client yang minimal, dan pastikan pengambilan data berjalan tanpa waterfalls. Gunakan `next build` untuk mengonfirmasi build produksi yang bersih.

```bash
npm run dev   # Verifikasi di development
npm run build # Konfirmasi build produksi berhasil
```

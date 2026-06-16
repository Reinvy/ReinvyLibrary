---
title: "Membangun Blog Full-Stack dengan Next.js App Router"
description: "Tutorial langsung mengenai App Router Next.js, React Server Components, Server Actions, pola pengambilan data, dan deployment."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Blog Full-Stack dengan Next.js App Router

## Ringkasan

Dalam tutorial ini, Anda akan membangun aplikasi blog yang siap produksi menggunakan App Router Next.js. Anda akan mempelajari cara memanfaatkan React Server Components untuk rendering, Server Actions untuk penanganan formulir, routing dinamis untuk postingan individual, dan cara men-deploy aplikasi ke Vercel. Pada akhirnya, Anda akan memiliki blog yang berfungsi penuh dengan kemampuan manajemen konten.

## Target Audiens

- Developer frontend dan full-stack yang nyaman dengan React.
- Developer yang ingin beralih dari Pages Router ke App Router.
- Ekspektasi tingkat kemampuan pembaca: Menengah.

## Prasyarat

- Pengetahuan dasar React (komponen, hooks, props).
- Node.js 18+ terinstal di komputer Anda.
- Editor kode (VS Code direkomendasikan).
- Akun Vercel gratis untuk deployment (opsional tetapi direkomendasikan).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membuat proyek Next.js dengan App Router.
- Membangun layout menggunakan sistem routing bersarang.
- Membuat rute statis dan dinamis menggunakan konvensi berbasis file.
- Mengambil dan menampilkan data menggunakan React Server Components.
- Menangani pengiriman formulir dan mutasi dengan Server Actions.
- Mengimplementasikan loading states, error boundaries, dan halaman not-found.
- Men-deploy aplikasi Next.js ke Vercel.

## Konteks dan Motivasi

Next.js telah berevolusi secara signifikan sejak diperkenalkannya App Router di versi 13.4. App Router mewakili pergeseran paradigma dari routing berbasis halaman sisi klien ke arsitektur server-first yang memanfaatkan React Server Components (RSC). Pendekatan ini secara drastis mengurangi JavaScript sisi klien, meningkatkan kecepatan muat halaman awal, dan menyederhanakan pengambilan data dengan menjalankan kueri basis data langsung di komponen Anda.

Bagi developer yang membangun aplikasi berbasis konten seperti blog, App Router menyediakan kombinasi ideal antara static site generation (SSG) untuk pengiriman konten yang cepat dan server-side rendering (SSR) untuk fitur dinamis. Memahami cara menggunakan App Router secara efektif sangat penting untuk pengembangan Next.js modern.

## Konten Inti

### Menyiapkan Proyek

Mulailah dengan membuat proyek Next.js baru dengan App Router yang diaktifkan:

```bash
npx create-next-app@latest nextjs-blog --typescript --tailwind --eslint --app --src-dir
cd nextjs-blog
```

Flag `--app` mengaktifkan App Router dan menghasilkan struktur direktori `src/app/`.

### Memahami Konvensi File App Router

App Router menggunakan paradigma routing berbasis file-system di dalam `src/app/`:

| File | Konvensi | Tujuan |
| :--- | :--- | :--- |
| `page.tsx` | UI segmen rute | Mendefinisikan UI utama untuk suatu rute |
| `layout.tsx` | Layout bersama | Membungkus halaman anak dan bertahan antar navigasi |
| `loading.tsx` | UI loading | Menampilkan fallback saat halaman sedang dimuat |
| `error.tsx` | Error boundary | Menangkap error di segmen dan anak-anaknya |
| `not-found.tsx` | UI 404 | Menampilkan saat rute atau sumber daya tidak ditemukan |

### Membuat Root Layout

Buka `src/app/layout.tsx` untuk melihat root layout. Layout ini membungkus setiap halaman dalam aplikasi:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Blog Next.js Saya",
  description: "Blog full-stack dibangun dengan App Router Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### Membangun Halaman Beranda

Ganti halaman beranda default di `src/app/page.tsx` dengan halaman arahan blog. Kita akan menggunakan React Server Component untuk mengambil postingan blog langsung dari sistem file:

```typescript
import Link from "next/link";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
}

const posts: BlogPost[] = [
  {
    slug: "getting-started-with-nextjs",
    title: "Memulai dengan Next.js",
    excerpt: "Pelajari cara membangun aplikasi web modern dengan React framework untuk produksi.",
    date: "2026-06-01",
  },
  {
    slug: "server-components-explained",
    title: "React Server Components Dijelaskan",
    excerpt: "Pahami bagaimana Server Components meningkatkan performa dan menyederhanakan pengambilan data.",
    date: "2026-06-05",
  },
  {
    slug: "mastering-server-actions",
    title: "Menguasai Server Actions",
    excerpt: "Pendalaman tentang mutasi dan penanganan formulir di App Router.",
    date: "2026-06-10",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-4xl font-bold">Blog Saya</h1>
      <p className="mb-8 text-lg text-gray-600">
        Pemikiran tentang Next.js, React, dan pengembangan web modern.
      </p>
      <div className="space-y-6">
        {posts.map((post) => (
          <article key={post.slug} className="border-b pb-6">
            <Link href={`/posts/${post.slug}`} className="group">
              <h2 className="text-xl font-semibold group-hover:text-blue-600">
                {post.title}
              </h2>
            </Link>
            <p className="mt-1 text-gray-600">{post.excerpt}</p>
            <time className="mt-2 block text-sm text-gray-400">{post.date}</time>
          </article>
        ))}
      </div>
    </main>
  );
}
```

### Membuat Rute Dinamis untuk Postingan Individual

Buat segmen rute dinamis dengan menambahkan folder menggunakan kurung siku:

```bash
mkdir -p src/app/posts/[slug]
```

Buat `src/app/posts/[slug]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";

interface BlogPost {
  slug: string;
  title: string;
  content: string;
  date: string;
}

const posts: Record<string, BlogPost> = {
  "getting-started-with-nextjs": {
    slug: "getting-started-with-nextjs",
    title: "Memulai dengan Next.js",
    content: `Next.js adalah framework React yang memungkinkan server-side rendering, static site generation, dan pengembangan full-stack. Framework ini menyediakan routing berbasis file-system, optimasi performa bawaan, dan ekosistem plugin yang kaya.

Dalam postingan ini, kita menjelajahi fitur inti Next.js dan cara memulai membangun aplikasi web modern.`,
    date: "2026-06-01",
  },
  "server-components-explained": {
    slug: "server-components-explained",
    title: "React Server Components Dijelaskan",
    content: `React Server Components memungkinkan Anda merender komponen di server, mengirim hanya HTML yang dihasilkan ke klien. Ini mengurangi ukuran bundle dan meningkatkan performa dengan menyimpan dependensi berat di server.

Server Components dapat mengakses sistem file, basis data, dan sumber daya sisi server lainnya secara langsung.`,
    date: "2026-06-05",
  },
  "mastering-server-actions": {
    slug: "mastering-server-actions",
    title: "Menguasai Server Actions",
    content: `Server Actions adalah fungsi yang berjalan di server tetapi dapat dipanggil dari klien. Mereka menyederhanakan penanganan formulir dan mutasi data dengan menghilangkan kebutuhan akan rute API terpisah.

Untuk menggunakan Server Action, definisikan fungsi async dengan direktif 'use server'.`,
    date: "2026-06-10",
  },
};

interface Props {
  params: { slug: string };
}

export default function PostPage({ params }: Props) {
  const post = posts[params.slug];

  if (!post) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-8 block text-blue-600 hover:underline">
        &larr; Kembali ke Beranda
      </Link>
      <article>
        <h1 className="mb-2 text-3xl font-bold">{post.title}</h1>
        <time className="mb-8 block text-sm text-gray-400">{post.date}</time>
        <div className="prose max-w-none leading-relaxed text-gray-700">
          {post.content.split("\n\n").map((paragraph, i) => (
            <p key={i} className="mb-4">{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
```

### Mengimplementasikan Loading State

Buat `src/app/posts/[slug]/loading.tsx` untuk menampilkan skeleton saat halaman dimuat:

```typescript
export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 h-4 w-24 animate-pulse bg-gray-200" />
      <div className="mb-2 h-8 w-3/4 animate-pulse bg-gray-200" />
      <div className="mb-8 h-4 w-32 animate-pulse bg-gray-200" />
      <div className="space-y-4">
        <div className="h-4 w-full animate-pulse bg-gray-200" />
        <div className="h-4 w-5/6 animate-pulse bg-gray-200" />
        <div className="h-4 w-4/5 animate-pulse bg-gray-200" />
      </div>
    </main>
  );
}
```

### Menambahkan Halaman 404 Kustom

Buat `src/app/not-found.tsx`:

```typescript
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="mb-4 text-6xl font-bold text-gray-300">404</h1>
      <p className="mb-6 text-lg text-gray-600">
        Halaman yang Anda cari tidak ditemukan.
      </p>
      <Link href="/" className="text-blue-600 hover:underline">
        Kembali ke beranda
      </Link>
    </main>
  );
}
```

### Menambahkan Server Actions untuk Pendaftaran Newsletter

Server Actions sangat ideal untuk menangani pengiriman formulir tanpa membuat rute API terpisah. Buat komponen baru di `src/app/newsletter-form.tsx`:

```typescript
"use client";

import { useActionState } from "react";
import { submitNewsletter } from "./actions";

export default function NewsletterForm() {
  const [state, formAction, isPending] = useActionState(submitNewsletter, {
    message: "",
    success: false,
  });

  return (
    <form action={formAction} className="rounded-lg border p-6">
      <h2 className="mb-2 text-xl font-semibold">Berlangganan newsletter kami</h2>
      <p className="mb-4 text-sm text-gray-600">
        Dapatkan postingan terbaru dikirim ke email Anda.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          placeholder="anda@contoh.com"
          required
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Mendaftarkan..." : "Berlangganan"}
        </button>
      </div>
      {state.message && (
        <p className={`mt-2 text-sm ${state.success ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

Buat Server Action di `src/app/actions.ts`:

```typescript
"use server";

import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email("Silakan masukkan alamat email yang valid"),
});

interface FormState {
  message: string;
  success: boolean;
}

export async function submitNewsletter(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get("email") as string;

  const result = emailSchema.safeParse({ email });

  if (!result.success) {
    return {
      message: result.error.errors[0].message,
      success: false,
    };
  }

  try {
    // Dalam aplikasi nyata, Anda akan menyimpan email ke basis data
    console.log(`Mendaftarkan email: ${email}`);

    return {
      message: "Terima kasih telah berlangganan!",
      success: true,
    };
  } catch (error) {
    return {
      message: "Terjadi kesalahan. Silakan coba lagi nanti.",
      success: false,
    };
  }
}
```

### Menggunakan Route Groups untuk Layout Autentikasi

Route groups memungkinkan Anda mengatur kode tanpa memengaruhi URL. Buat `src/app/(auth)/` untuk mengelompokkan halaman terkait autentikasi:

```bash
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(auth\)/register
```

Buat `src/app/(auth)/login/page.tsx`:

```typescript
export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-24">
      <h1 className="mb-6 text-2xl font-bold">Masuk</h1>
      <form className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Kata Sandi
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Masuk
        </button>
      </form>
    </main>
  );
}
```

### Men-deploy ke Vercel

Deploy blog Anda ke Vercel, platform yang dibuat oleh pencipta Next.js:

```bash
npm run build
```

Kemudian hubungkan repositori Git Anda ke Vercel, atau gunakan Vercel CLI:

```bash
npx vercel --prod
```

## Contoh Kode

Berikut adalah struktur direktori lengkap dari proyek akhir:

```text
nextjs-blog/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── posts/
│   │   │   └── [slug]/
│   │   │       ├── loading.tsx
│   │   │       └── page.tsx
│   │   ├── actions.ts
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── newsletter-form.tsx
│   │   ├── not-found.tsx
│   │   └── page.tsx
│   └── ...
├── public/
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

Root layout `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Blog Next.js Saya",
  description: "Blog full-stack dibangun dengan App Router Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

## Insight Penting

- **Server Components adalah default**: Di App Router, setiap komponen di direktori `app/` adalah React Server Component secara default. Anda hanya menambahkan `'use client'` jika memerlukan interaktivitas (event handlers, hooks, API browser). Ini mengurangi JavaScript sisi klien dengan menyimpan rendering di server.
- **Konvensi berbasis file menyederhanakan manajemen state**: Alih-alih mengelola loading states dan error boundaries secara manual, buat file `loading.tsx` dan `error.tsx` di segmen rute Anda. Next.js secara otomatis menghubungkannya ke React Suspense dan Error Boundaries.
- **Server Actions menghilangkan boilerplate**: Pengiriman formulir tidak lagi memerlukan rute API terpisah. Definisikan fungsi `'use server'` yang berjalan di server dan dapat dipanggil langsung dari komponen klien melalui form actions.
- **Route groups menjaga URL tetap bersih**: Gunakan sintaks `(namaGroup)` folder untuk mengatur kode tanpa mengubah struktur URL. Ini sangat berguna untuk autentikasi, dashboard, dan bagian admin.
- **Segmen dinamis dengan penanganan error**: Selalu tangani kasus ketika parameter dinamis tidak cocok dengan data apa pun. Gunakan fungsi `notFound()` dari `next/navigation` untuk memicu boundary `not-found.tsx` terdekat daripada merender halaman yang rusak.

## Langkah Berikutnya

- Jelajahi Next.js Middleware untuk autentikasi dan redirect.
- Pelajari Incremental Static Regeneration (ISR) untuk konten yang berubah seiring waktu.
- Integrasikan headless CMS seperti Sanity atau Contentful untuk mengelola postingan blog.
- Tambahkan fitur pencarian menggunakan prop `searchParams` di komponen halaman.

## Kesimpulan

Anda telah membangun blog yang berfungsi penuh menggunakan App Router Next.js. Anda membuat rute dinamis dengan pola `[slug]`, mengimplementasikan loading states dengan `loading.tsx`, menangani 404 dengan `not-found.tsx`, menggunakan Server Actions untuk penanganan formulir, dan mengatur rute menggunakan route groups. Arsitektur ini menyediakan fondasi yang kokoh untuk membangun aplikasi berbasis konten yang cepat, skalabel, dan mudah dipelihara.

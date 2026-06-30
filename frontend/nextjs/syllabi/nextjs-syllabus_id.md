---
title: "Silabus Pengembangan Next.js"
description: "Kurikulum komprehensif 12 minggu yang mencakup App Router Next.js, pola routing, Server dan Client Components, pengambilan data, autentikasi, deployment, dan proyek akhir."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Next.js

## Ringkasan

Silabus 12 minggu ini dirancang untuk pengembang yang sudah memiliki dasar React dan ingin menguasai Next.js serta arsitektur App Router modern. Kurikulum berjalan dari konsep routing dasar hingga pola lanjutan seperti parallel dan intercepting routes, Server Actions, strategi caching, autentikasi, dan deployment produksi. Setiap minggu dibangun di atas minggu sebelumnya, dan diakhiri dengan proyek akhir yang mendemonstrasikan semua konsep utama. Setelah menyelesaikan kursus ini, peserta akan siap untuk merancang, membangun, dan men-deploy aplikasi Next.js dunia nyata dengan percaya diri.

## Kurikulum

### Minggu 1: Fondasi Next.js

- **Apa itu Next.js?**
  - Gambaran umum framework, sejarah, dan transisi dari Pages Router ke App Router
  - Keunggulan: SSR, SSG, ISR, routing berbasis file, API routes
  - Perbandingan Next.js dengan meta-framework React lainnya (Remix, Gatsby)
- **Penyiapan Proyek dan Lingkungan Pengembangan**
  - `create-next-app` dengan opsi TypeScript, ESLint, Tailwind CSS
  - Struktur proyek (`app/`, `public/`, file konfigurasi)
  - Server pengembangan, hot reloading, dan prompt React Server Components
- **Aplikasi App Router Pertama**
  - Membuat halaman dan layout pertama
  - Memahami konvensi direktori `app/`
  - Navigasi dasar dengan komponen `<Link>`

### Minggu 2: Dasar-Dasar Routing

- **Konvensi File**
  - `page.tsx`: Mendefinisikan segmen rute
  - `layout.tsx`: UI bersama di seluruh rute
  - `loading.tsx`: UI loading dan streaming
  - `error.tsx`: Batas error per segmen rute
  - `not-found.tsx`: Halaman 404 khusus
- **Rute Bersarang dan Layout**
  - Membuat segmen rute bersarang dengan folder
  - Layout bersarang dan pewarisan template
  - Route Groups `(group)` untuk pemisahan organisasi
- **Tautan dan Navigasi**
  - Perilaku prefetching komponen `<Link>`
  - Hook `useRouter` untuk navigasi programatik
  - Hook `usePathname` dan `useSearchParams`

### Minggu 3: Rute Dinamis dan Routing Lanjutan

- **Segmen Rute Dinamis**
  - Pola `[slug]` dan `[...catchAll]`
  - `generateStaticParams` untuk generasi statis dengan rute dinamis
  - `generateMetadata` untuk metadata SEO dinamis
- **Parallel Routes**
  - Konvensi `@slot` untuk layout bergaya dashboard
  - Render rute independen dalam layout yang sama
  - Render bersyarat berdasarkan status rute
- **Intercepting Routes**
  - Pola `(.)segment` untuk overlay modal
  - Menggabungkan parallel dan intercepting routes untuk UI kompleks
  - Pola galeri foto dan detail feed

### Minggu 4: Server dan Client Components

- **React Server Components (RSC)**
  - Model mental: komponen yang berjalan di server
  - Keunggulan: zero bundle size, akses database langsung, code splitting otomatis
  - Streaming HTML yang di-render server
- **Client Components**
  - Direktif `'use client'`
  - Kapan menggunakan client vs server components
  - Menyisipkan server dan client components
- **Pola Komposisi**
  - Meneruskan server components sebagai children ke client components
  - Mengekstrak batas client untuk interaktivitas
  - Menghindari jebakan umum (serialisasi, mengimpor kode server ke client)

### Minggu 5: Pengambilan Data

- **Pengambilan Data di Sisi Server**
  - `fetch` dengan `cache: 'force-cache'`, `'no-store'`, dan `{ next: { revalidate } }`
  - Kueri database langsung di server components
  - Pengambilan data paralel dengan `Promise.all`
- **Pengambilan Data di Sisi Client**
  - `useEffect` vs hook `use` (React 19)
  - Pola integrasi SWR dan TanStack Query
  - Optimistic updates dan invalidasi cache
- **Streaming dan Suspense**
  - Streaming UI yang di-render server dengan `<Suspense>`
  - Status loading granular per komponen
  - Konvensi `loading.js` dan batas streaming

### Minggu 6: Server Actions dan Mutasi

- **Dasar-Dasar Server Actions**
  - Direktif `'use server'`
  - Form actions dengan `<form action={serverAction}>`
  - Validasi ulang data dengan `revalidatePath` dan `revalidateTag`
- **Mutasi dan Penanganan Form**
  - Menggunakan `useActionState` untuk status pending dan error validasi
  - Upload file dengan Server Actions
  - Progressive enhancement: form yang berfungsi tanpa JavaScript
- **Praktik Terbaik Server Actions**
  - Pemeriksaan otorisasi di dalam Server Actions
  - Rate limiting dan penanganan error
  - Optimistic updates di sisi client

### Minggu 7: Middleware, Autentikasi, dan Keamanan

- **Middleware Next.js**
  - Konvensi `middleware.ts` dan urutan eksekusi
  - Pencocokan permintaan dengan konfigurasi `matcher`
  - Redirect, rewrite, dan manipulasi header
- **Strategi Autentikasi**
  - Integrasi NextAuth.js / Auth.js
  - Autentikasi berbasis session vs JWT
  - Melindungi rute dengan middleware
- **Praktik Terbaik Keamanan**
  - Perlindungan CSRF dengan Server Actions
  - Header Content Security Policy
  - Rate limiting dan perlindungan API routes

### Minggu 8: Caching dan Performa

- **Arsitektur Caching Next.js**
  - Full Route Cache, Data Cache, Router Cache
  - Bagaimana setiap cache bekerja dan kapan di-invalidasi
  - `noStore()`, `revalidateTag()`, dan `revalidatePath()` secara mendalam
- **Rendering Statis dan Dinamis**
  - Static Site Generation (SSG) saat build
  - Incremental Static Regeneration (ISR)
  - Rendering dinamis dan memilih keluar dari caching
- **Optimasi Performa**
  - Optimasi gambar dengan `next/image`
  - Optimasi font dengan `next/font`
  - Analisis bundle dengan `@next/bundle-analyzer`
  - Core Web Vitals dan optimasi Lighthouse

### Minggu 9: API Routes dan Route Handlers

- **Route Handlers**
  - Konvensi `route.ts` untuk endpoint API
  - Handler GET, POST, PUT, DELETE
  - Pembantu Request dan Response
- **Keamanan Middleware dan API**
  - Konfigurasi CORS untuk API routes
  - Rate limiting dengan `lru-cache` atau Upstash
  - Verifikasi tanda tangan Webhook
- **Pekerjaan Latar Belakang dan Webhooks**
  - Menjalankan tugas latar belakang dengan Serverless functions
  - Implementasi penerima webhook
  - Cron jobs dengan Vercel Cron

### Minggu 10: Manajemen State dan State Global

- **React Context dengan Server Components**
  - Context provider khusus server
  - State berbasis cookie untuk server components
  - Membaca cookie dan header dengan `next/headers`
- **Manajemen State di Sisi Client**
  - Zustand, Jotai, atau Redux dengan Next.js
  - Pencegahan ketidakcocokan hidrasi
  - Menyimpan state ke localStorage
- **Manajemen State URL**
  - Parameter pencarian sebagai sumber kebenaran
  - `useSearchParams` dan `useRouter` untuk pembaruan URL
  - Pola shallow routing

### Minggu 11: Testing, Debugging, dan Deployment

- **Strategi Testing**
  - Unit testing dengan Vitest
  - Integration testing dengan React Testing Library
  - E2E testing dengan Playwright atau Cypress
  - Testing Server Actions dan API routes
- **Debugging dan Monitoring**
  - React DevTools dan Next.js DevTools
  - Debugging server component dengan `server-only`
  - Logging dengan `pino` atau `winston`
- **Deployment**
  - Deployment Vercel: environment variables, preview deployments
  - Deployment Docker untuk self-hosted Next.js
  - Mode server Node.js vs mode serverless

### Minggu 12: Proyek Akhir

- **Spesifikasi Proyek**
  - Aplikasi full-stack menggunakan semua konsep yang dipelajari
  - Jenis proyek yang disarankan: toko e-commerce, alat manajemen proyek, platform blog dengan CMS
- **Perencanaan Arsitektur**
  - Desain rute dan hierarki layout
  - Model data dan desain API
  - Alur autentikasi dan otorisasi
- **Tahap Implementasi**
  - Minggu 1-4 proyek: halaman inti, layout, pengambilan data
  - Minggu 5-8 proyek: mutasi, autentikasi, penyempurnaan
  - Minggu 9-12 proyek: testing, optimasi performa, deployment
- **Review Akhir dan Presentasi**
  - Daftar periksa code review
  - Laporan audit performa
  - Deployment ke produksi

## Proyek Akhir

Peserta akan membangun **aplikasi full-stack siap produksi** sesuai pilihan mereka. Proyek harus mendemonstrasikan:

- **Arsitektur App Router** dengan setidaknya tiga level layout bersarang
- **Setidaknya dua route groups** untuk pemisahan organisasi
- **Rute dinamis** dengan `generateStaticParams` dan metadata
- **Parallel routes** (misalnya dashboard dengan panel independen) dikombinasikan dengan **intercepting routes** (misalnya overlay modal untuk tampilan detail)
- **Server Actions** untuk semua mutasi dengan `useActionState` untuk status pending dan error
- **Autentikasi** menggunakan NextAuth.js dengan setidaknya satu penyedia OAuth dan penyedia kredensial
- **Pengambilan data** menggunakan fetch sisi server dengan revalidasi dan SWR/TanStack Query sisi client
- **Middleware** untuk perlindungan rute dan manipulasi header
- **Penanganan error komprehensif** dengan halaman error dan not-found khusus
- **Testing** dengan setidaknya 80% coverage (Vitest + testing-library) dan E2E tests untuk alur pengguna kritis
- **Deployment produksi** ke Vercel dengan domain khusus, environment variables, dan monitoring

Contoh ide proyek:

- **Platform E-Commerce**: Katalog produk, keranjang dengan Server Actions, alur checkout, dashboard admin dengan parallel routes, manajemen pesanan
- **Alat Manajemen Proyek**: Papan Kanban, kolaborasi tim, pembaruan real-time, akses berbasis peran, dashboard pelaporan
- **Sistem Manajemen Konten**: Platform blog dengan editor markdown, pustaka media, peran pengguna, dashboard analitik, optimasi SEO

## Kriteria Penilaian

- **Tugas Mingguan (30%)**
  - 10 tugas coding mingguan (Minggu 1-10)
  - Setiap tugas dibangun di atas konsep minggu sebelumnya
  - Dinilai berdasarkan kebenaran, kualitas kode, dan kepatuhan pada konvensi Next.js
  - Pengumpulan terlambat dikenakan penalti 10% per hari

- **Kuis (20%)**
  - 4 kuis (akhir Minggu 3, 6, 9, 11)
  - Campuran pertanyaan pemahaman konseptual dan analisis kode
  - Pilihan ganda, jawaban singkat, dan pertanyaan code review
  - Nilai kelulusan minimal 70% diperlukan untuk melanjutkan ke proyek akhir

- **Proyek Akhir (40%)**
  - Kualitas kode dan keputusan arsitektur (15%)
  - Kelengkapan fitur terhadap spesifikasi (10%)
  - Cakupan dan kualitas testing (5%)
  - Audit performa dan aksesibilitas (5%)
  - Kesiapan deployment dan produksi (5%)

- **Partisipasi dan Code Review (10%)**
  - Peer code review pada dua proyek teman sekelas
  - Partisipasi aktif dalam diskusi desain
  - Kualitas dokumentasi (README, dokumentasi API, petunjuk penyiapan)

## Referensi

- [Dokumentasi Resmi Next.js](https://nextjs.org/docs) - Referensi lengkap App Router
- [Kursus Belajar Next.js](https://nextjs.org/learn) - Tutorial interaktif oleh tim Vercel
- [RFC React Server Components](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md) - Spesifikasi resmi RSC
- [Dokumentasi NextAuth.js](https://next-auth.js.org/) - Pustaka autentikasi untuk Next.js
- [Dokumentasi Vercel](https://vercel.com/docs) - Fitur deployment dan platform
- [The App Router Playbook](https://vercel.com/app-router) - Pola dan contoh dunia nyata
- [Kursus Web Dev Simplified Next.js](https://www.youtube.com/@WebDevSimplified) - Tutorial video
- [Panduan Next.js Josh W. Comeau](https://www.joshwcomeau.com/nextjs/) - Pembahasan mendalam tentang internal Next.js

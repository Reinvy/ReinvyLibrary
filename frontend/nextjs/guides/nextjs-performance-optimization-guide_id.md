---
title: "Panduan Optimasi Performa Next.js"
description: "Panduan optimasi Next.js yang berbasis pengukuran: analisis bundle, code splitting per rute, dynamic import untuk kode klien berat, pemuatan font dengan next/font, ISR dan Partial Prerendering, serta pengukuran lapangan Core Web Vitals."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Optimasi Performa Next.js

## Pendahuluan

Sebagian besar masalah "aplikasi Next.js lambat" bukan berasal dari Next.js. Penyebabnya adalah terlalu banyak JavaScript yang dikirim ke klien, main thread terblokir skrip pihak ketiga, font yang dimuat terlambat, atau setiap rute dirender dinamis padahal isinya jarang berubah. Panduan ini menetapkan urutan kerja: ukur Core Web Vitals yang nyata, serang biaya terbesar, lalu verifikasi bahwa perubahan benar-benar menggeser metrik. Mengoptimasi dengan urutan lain hanya menghasilkan perubahan yang terdengar meyakinkan tanpa efek yang terlihat pengguna.

Cakupan panduan ini adalah aplikasi App Router pada Next.js 14/15. Semua isi berlaku juga untuk Pages Router kecuali Partial Prerendering, yang hanya tersedia di App Router.

## Praktik Terbaik

- **Ukur sebelum menyentuh kode.** Pisahkan metrik berdasarkan kelas perangkat dan rute; skor Lighthouse 98 di laptop developer tidak berarti apa-apa bagi Android kelas menengah di jaringan 4G. Data lapangan (CrUX, Speed Insights, atau beacon sendiri) adalah sumber kebenaran, data lab hanya alat debug.
- **Tetapkan anggaran bundle per rute.** Tentukan batas eksplisit — misalnya 170 kB first-load JS untuk rute konten — dan gagalkan CI ketika pull request melewatinya. Anggaran mengubah "bundle-nya besar" menjadi angka yang bisa ditinjau.
- **Jaga batas klien tetap sempit.** `"use client"` menandai sebuah modul beserta seluruh graf impornya sebagai kode klien. Turunkan penanda itu ke komponen daun yang butuh state atau event; ambil data dan render struktur di Server Component di atasnya.
- **Ganti impor statis widget berat dengan `next/dynamic`.** Editor, grafik, peta, dan pemutar video biasanya di bawah lipatan dan layak mendapat chunk terpisah. Selalu sediakan skeleton berukuran sama agar penukaran tidak menyebabkan pergeseran layout.
- **Muat font dengan `next/font`, jangan pernah dengan `<link>` ke Google Fonts.** `next/font` menghosting sendiri saat build, menyuntikkan `font-display: swap`, dan menghasilkan fallback dengan metrik yang cocok sehingga pergeseran akibat font jarak jauh hilang.
- **Utamakan rendering statis dan tervalidasi ulang.** Membaca `cookies()`, `headers()`, atau `searchParams` memaksa seluruh rute menjadi dinamis; isolasi bagian dinamis di balik `<Suspense>`.
- **Cache dengan sengaja, bukan kebetulan.** `fetch` tidak di-cache secara default di Next.js 15; setel `revalidate` atau `cache: "force-cache"` pada data yang toleran, dan beri tag untuk invalidasi lewat `revalidateTag`.
- **Perlakukan INP sebagai masalah kode.** Long task dari pohon hidrasi besar dan handler tanpa throttle mendominasi Interaction to Next Paint. Pecah pekerjaan, tunda pembaruan yang tidak mendesak dengan `startTransition`, dan virtualisasi daftar panjang.

## Langkah Implementasi

### Langkah 1: Bentuk baseline

Tambahkan pengukuran lapangan dengan hook `useReportWebVitals` dan kirim sampel ke endpoint analitik Anda beserta rute dan kelas perangkat, jika tidak Anda tidak bisa mengaitkan regresi dengan penyebabnya.

```typescript
// app/web-vitals.tsx
"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
    useReportWebVitals((metric) => {
        const body = JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating, path: location.pathname });
        // sendBeacon bertahan saat halaman ditutup; fallback ke fetch keepalive
        if (!navigator.sendBeacon("/api/vitals", body)) {
            void fetch("/api/vitals", { method: "POST", body, keepalive: true });
        }
    });
    return null;
}
```

Pasang sekali di root layout dan catat baseline dua minggu per rute sebelum mengubah apa pun.

### Langkah 2: Analisis bundle

```bash
npm install --save-dev @next/bundle-analyzer
ANALYZE=true npm run build
```

```javascript
// next.config.mjs
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig = {
    experimental: { optimizePackageImports: ["lucide-react", "date-fns"] },
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
```

Baca treemap yang diurutkan berdasarkan ukuran hasil parse, bukan ukuran mentah. Dependensi 200 kB yang ter-tree-shake menjadi 8 kB bukan masalah; impor barrel ikon 40 kB yang menarik 900 modul adalah masalah.

### Langkah 3: Persempit batas klien

```tsx
// app/products/page.tsx  (Server Component)
import { getProducts } from "@/lib/products";
import { AddToCartButton } from "./add-to-cart-button";

export default async function ProductsPage() {
    const products = await getProducts();
    return (
        <ul>
            {products.map((product) => (
                <li key={product.id}>
                    <h2>{product.name}</h2>
                    {/* hanya daun ini yang dikirim ke browser */}
                    <AddToCartButton productId={product.id} />
                </li>
            ))}
        </ul>
    );
}
```

### Langkah 4: Tunda widget berat

```tsx
import dynamic from "next/dynamic";

const RevenueChart = dynamic(() => import("@/components/revenue-chart"), {
    loading: () => <div className="h-80 w-full animate-pulse rounded bg-gray-100" />,
    ssr: false, // pustaka grafik menyentuh window saat impor
});
```

Skeleton harus persis sama dimensinya dengan komponen akhir; placeholder yang tidak cocok menukar ukuran bundle dengan CLS. Untuk widget di bawah lipatan, render hanya ketika `IntersectionObserver` melaporkan sudah terlihat.

### Langkah 5: Optimasi font

```typescript
// app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="id" className={inter.variable}>
            <body className="font-sans">{children}</body>
        </html>
    );
}
```

Maksimal dua keluarga font, dan hanya bobot yang benar-benar dipakai — setiap bobot tambahan adalah satu file lagi yang bersaing bandwidth dengan gambar LCP Anda.

### Langkah 6: Dorong pekerjaan ke cache

| Perilaku data | Setelan | Efek |
| --- | --- | --- |
| Berubah tiap jam | `export const revalidate = 3600` | ISR: HTML statis, diregenerasi di latar belakang |
| Berubah saat diedit | `fetch(url, { next: { tags: ["posts"] } })` | `revalidateTag("posts")` bertarget setelah penulisan |
| Spesifik per pengguna | `<Suspense>` di sekitar komponen anak yang dipersonalisasi | Shell tetap statis, hanya lubangnya yang streaming |

Partial Prerendering menerapkan ide yang sama pada level rute: shell statis disajikan seketika dan bagian dinamis dialirkan menyusul. Aktifkan per rute dengan `experimental.ppr` dan jaga fallback layout tetap stabil agar bagian dinamis tidak bergeser.

### Langkah 7: Verifikasi dan jaga

Jalankan ulang pengukuran lapangan untuk rute dan kelas perangkat yang sama, lalu bandingkan dengan baseline. Perubahan yang tidak menggeser LCP, INP, atau CLS secara terukur hanyalah noise — kembalikan. Setelah itu tambahkan anggaran bundle ke CI agar pull request berikutnya tidak diam-diam membatalkan pekerjaan ini. Pemeriksaan lab tetap berguna untuk iterasi lokal:

```bash
npx lighthouse http://localhost:3000/checkout --preset=desktop --quiet \
    --chrome-flags="--headless" --output=json --output-path=./lh.json
```

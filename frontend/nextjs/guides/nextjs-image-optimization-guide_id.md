---
title: "Panduan Optimasi Gambar di Next.js"
description: "Panduan praktis mengoptimalkan gambar di Next.js dengan next/image, mencakup format modern (WebP/AVIF), pembuatan srcset responsif, priority loading, header caching, dan konfigurasi remotePatterns."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Optimasi Gambar di Next.js

## Pendahuluan

Gambar biasanya merupakan aset terbesar pada sebuah halaman web dan tempat paling mudah kehilangan performa. Next.js menyediakan komponen bawaan `next/image` yang membungkus elemen `<img>` browser dengan optimasi otomatis: gambar diubah ukuran dan dikompres sesuai permintaan, disajikan dalam format modern (WebP/AVIF), dibuatkan `srcset` responsif, dan dimuat secara lazy secara bawaan — semuanya terjadi saat request berjalan tanpa pipeline build manual. Panduan ini membahas praktik terbaik dalam memakai komponen tersebut secara efektif beserta konfigurasi yang membuatnya cepat di production.

## Praktik Terbaik

- **Selalu gunakan `next/image`, bukan `<img>` mentah**: Anda mendapatkan resize, negosiasi format, lazy loading, dan petunjuk content-visibility secara gratis. Pengecualiannya hanya gambar dekoratif di CSS background dan gambar dari origin di luar aplikasi yang sengaja tidak diproksi.
- **Biarkan Next.js menegosiasikan format modern (WebP/AVIF)**: AVIF memberikan kompresi terbaik (sekitar 50% lebih kecil daripada JPEG pada kualitas yang sama) tetapi lebih berat untuk di-encode; WebP adalah fallback yang aman untuk browser lama. Gunakan `images.formats: ["image/avif", "image/webp"]` pada `next.config` agar optimizer mengembalikan AVIF ketika header `Accept` browser mendukungnya.
- **Tetapkan `sizes` untuk setiap gambar responsif**: tanpa `sizes`, Next.js menyajikan satu gambar berukuran sesuai rasio piksel perangkat dan `srcset`-nya hampir tidak berguna. Deklarasi `sizes="(max-width: 768px) 100vw, 75vw"` memberi tahu browser kandidat mana yang harus diunduh, yang langsung memangkas bandwidth di perangkat seluler.
- **Gunakan `priority` hanya untuk gambar LCP**: `priority` menonaktifkan lazy loading dan menambahkan `<link rel="preload">` — benar untuk elemen largest contentful paint, dan menjadi bug performa jika diterapkan ke semua gambar di halaman.
- **Batasi gambar remote dengan `remotePatterns`**: secara bawaan next/image menolak URL yang tidak terdaftar di `images.remotePatterns`. Selalu beri allowlist hostname (dan pola pathname) secara eksplisit, jangan memakai wildcard catch-all; pola ini dicocokkan sebagai suffix, sehingga `pathname: "/images/**"` hanya cocok dengan path tersebut.
- **Cache gambar hasil optimasi secara agresif**: output optimizer bersifat immutable dan aman di-cache selama setahun; pastikan proksi/CDN Anda tidak re-validate atau mengoptimasi ulang file yang sudah dioptimasi.

## Langkah Implementasi

### Langkah 1: Aktifkan Komponen

`next/image` adalah bagian dari paket `next` — tanpa langkah instalasi selain memiliki aplikasi Next.js (App Router atau Pages Router). Impor di mana pun Anda akan memakai `<img>`:

```tsx
import Image from "next/image";
import profilePic from "@/public/profile.jpg"; // static import untuk gambar lokal

export default function Profile() {
  return (
    <Image
      src={profilePic}
      alt="Foto profil"
      width={400}
      height={400}
      className="rounded-full"
    />
  );
}
```

Untuk gambar lokal, impor file memberikan `width` dan `height` intrinsik secara otomatis, mencegah layout shift (CLS). Untuk URL remote, Anda harus menyediakannya sendiri seperti pada Langkah 3.

### Langkah 2: Sajikan Format Modern

Konfigurasikan daftar format optimizer di `next.config.ts`. Bawaan sudah menghasilkan WebP saat browser mendukungnya; tambahkan AVIF untuk kompresi yang lebih kuat:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    quality: 75,
  },
};

export default nextConfig;
```

Perkiraan penghematan: JPEG → WebP ≈ 25–35% lebih kecil, JPEG → AVIF ≈ 50% lebih kecil pada kualitas visual serupa. Lakukan rebuild (`next build`) setelah mengubah formats agar setiap gambar ter-cache dibuat ulang.

### Langkah 3: Izinkan Gambar Remote dengan `remotePatterns`

Untuk mengoptimalkan gambar yang di-hosting di tempat lain, beri allowlist pada origin-nya:

```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.example.com", pathname: "/images/**" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
```

```tsx
import Image from "next/image";

export default function Poster({ src }: { src: string }) {
  // src berasal dari origin yang tepercaya dan sudah di-allowlist
  return (
    <Image
      src={src}
      alt="Poster film"
      width={400}
      height={600}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg=="
    />
  );
}
```

`hostname` wajib diisi; `protocol`, `port`, dan `pathname` bersifat opsional. Pasangan `placeholder="blur"` + `blurDataURL` memberikan placeholder gambar berkualitas rendah saat gambar asli sedang diunduh.

### Langkah 4: Buat `srcset` Realistis dengan `sizes`

Prop `sizes` adalah pengungkit bandwidth terbesar. Prop ini memberi tahu browser lebar rendering gambar pada setiap breakpoint viewport, sehingga browser memilih file yang tepat dari `srcset` yang dihasilkan Next.js berdasarkan device sizes yang Anda konfigurasikan:

```tsx
<Image
  src="https://cdn.example.com/images/banner.jpg"
  alt="Banner"
  width={1920}
  height={600}
  sizes="(max-width: 768px) 100vw, 75vw"
  priority
/>
```

Tanpa `sizes`, gambar selebar 1920px di ponsel 375px akan mengunduh file 1920px penuh. Dengan deklarasi di atas, browser memilih kandidat ~375px–750px. Sesuaikan `images.deviceSizes` dan `images.imageSizes` di `next.config` bila bawaan (`[640, 750, 828, 1080, 1200, 1920, 2048, 3840]`) tidak cocok dengan tata letak Anda.

### Langkah 5: Prioritaskan Hanya Gambar LCP

Gambar hero di atas lipatan sebaiknya mendapat `priority` (preload + eager loading); sisanya tetap lazy, yang memang bawaan:

```tsx
// Baik: elemen LCP di-preload dan dimuat eager
<Image src={hero} alt="Hero" width={1600} height={900} priority sizes="100vw" />

// Hindari: priority di mana-mana menonaktifkan lazy loading dan membloat preload
// <Image src={card1} alt="Kartu" width={400} height={300} priority />
```

Ukur dengan Lighthouse: gambar yang ditandai sebagai LCP harus tampil tanpa layout shift, dan tidak ada gambar non-LCP yang memakai `priority`.

### Langkah 6: Konfigurasi Caching dan Revalidasi

Gambar hasil optimasi disajikan dengan `Cache-Control: public, max-age=31536000, immutable` secara bawaan karena URL-nya content-addressed (width, quality, dan format ada di query string). Dua hal yang perlu diperiksa di production:

- **Tetapkan `expireTime` yang masuk akal** jika Anda mengunggah ulang gambar dengan URL yang sama — optimizer men-cache hasilnya dan cache tersebut harus akhirnya menyadari file sumber yang baru:

```typescript
const nextConfig: NextConfig = {
  images: { expireTime: 86400 }, // detik; optimasi ulang jika lebih tua dari 24 jam
};
```

- **Cache aset asli di edge** agar optimizer tidak mengambilnya berulang kali. Jika Anda menyajikan gambar asli melalui route sendiri, tambahkan header berumur panjang — tetapi jangan pernah menimpa cache immutable pada respons yang sudah dioptimasi:

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/images/source/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=2592000" }],
      },
    ];
  },
};
```

Strategi revalidasi: biarkan ukuran/format turunan ter-cache selamanya, simpan gambar asli di bawah `stale-while-revalidate`, dan buat ulang sesuai permintaan ketika file sumber berubah.

## Ringkasan

Ikuti checklist ini untuk setiap gambar yang Anda rilis: gunakan `next/image`, pertahankan `priority` hanya pada gambar LCP, deklarasikan `sizes` untuk gambar responsif, beri allowlist origin remote dengan `remotePatterns`, aktifkan format AVIF/WebP, dan biarkan cache immutable optimizer bekerja. Setiap poin terlihat kecil, tetapi bersama-sama mereka memangkas payload gambar hingga setengah atau lebih pada halaman yang umum.

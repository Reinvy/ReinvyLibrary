---
title: "Cheat Sheet Tailwind CSS"
description: "Referensi cepat untuk utility class Tailwind CSS, perintah CLI, konfigurasi, dan pola umum."
category: "frontend"
technology: "tailwindcss"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Tailwind CSS

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Inisialisasi proyek | `npm init -y && npm install -D tailwindcss` | Instal Tailwind CSS sebagai dev dependency |
| Buat konfigurasi | `npx tailwindcss init` | Hasilkan tailwind.config.js |
| Buat konfigurasi (lengkap) | `npx tailwindcss init --full` | Hasilkan konfigurasi lengkap dengan semua default |
| Build CSS | `npx tailwindcss -i ./src/input.css -o ./dist/output.css` | Build CSS dari input ke output |
| Mode pantau | `npx tailwindcss -i ./src/input.css -o ./dist/output.css --watch` | Build ulang saat file berubah |
| Minifikasi output | `npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify` | Optimasi untuk produksi |
| PostCSS CLI | `npx tailwindcss build src/style.css -o dist/style.css` | Build melalui plugin PostCSS |
| Mulai CDN | `<script src="https://cdn.tailwindcss.com"></script>` | Gunakan Tailwind via CDN (hanya development) |

## Perintah Umum

### Instalasi & Setup

```bash
# Instal via npm
npm install -D tailwindcss

# Buat file konfigurasi
npx tailwindcss init

# Instal dengan PostCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Perintah Build

```bash
# Build development (tanpa minifikasi dengan source maps)
npx tailwindcss -i ./src/input.css -o ./dist/output.css

# Mode pantau untuk development
npx tailwindcss -i ./src/input.css -o ./dist/output.css --watch

# Build produksi (diminifikasi)
NODE_ENV=production npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify
```

### Opsi CLI Tailwind

```bash
# Tampilkan semua opsi yang tersedia
npx tailwindcss --help

# Build dengan custom postcss config
npx tailwindcss -c ./tailwind.config.js -i ./src/input.css -o ./dist/output.css

# Tentukan path konten
npx tailwindcss --content "./src/**/*.{html,js}" -i ./src/input.css -o ./dist/output.css
```

## Potongan Kode

### Setup Input CSS

```css
/* src/input.css — Arahan Tailwind */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Opsional: custom base styles */
@layer base {
  h1 {
    @apply text-2xl font-bold;
  }
  a {
    @apply text-blue-600 hover:underline;
  }
}
```

### Konfigurasi (tailwind.config.js)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        heading: ['Inter', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      screens: {
        'xs': '375px',
        '3xl': '1920px',
      },
    },
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
```

### Pola Layout Responsif

```html
<!-- Grid kartu responsif -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold">Judul Kartu</h3>
    <p class="text-gray-600 mt-2">Konten kartu</p>
  </div>
</div>

<!-- Layout sidebar responsif -->
<div class="flex flex-col md:flex-row min-h-screen">
  <aside class="w-full md:w-64 bg-gray-100 p-4">
    <!-- Konten sidebar -->
  </aside>
  <main class="flex-1 p-6">
    <!-- Konten utama -->
  </main>
</div>

<!-- Tipografi responsif -->
<p class="text-sm sm:text-base lg:text-lg">
  Teks yang menyesuaikan ukuran di setiap breakpoint.
</p>
```

### Utility Flexbox

```html
<!-- Memusatkan konten -->
<div class="flex items-center justify-center h-64">
  <span>Tengah</span>
</div>

<!-- Jarak antar item -->
<div class="flex justify-between items-center">
  <div>Kiri</div>
  <div>Kanan</div>
</div>

<!-- Kolom flex dengan gap -->
<div class="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<!-- Arah flex responsif -->
<div class="flex flex-col md:flex-row gap-6">
  <div class="flex-1">Kolom di mobile, baris di desktop</div>
  <div class="flex-1">Item fleksibel dengan lebar sama</div>
</div>
```

### Utility Grid

```html
<!-- Grid dasar -->
<div class="grid grid-cols-3 gap-4">
  <div class="bg-blue-100 p-4">1</div>
  <div class="bg-blue-100 p-4">2</div>
  <div class="bg-blue-100 p-4">3</div>
</div>

<!-- Grid auto-fit -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <!-- Kartu akan tersusun otomatis -->
</div>

<!-- Kolom bentangan -->
<div class="grid grid-cols-4 gap-4">
  <div class="col-span-2">Bentang 2 kolom</div>
  <div class="col-span-1">Normal</div>
  <div class="col-span-1">Normal</div>
</div>
```

### Spasi & Ukuran

```html
<!-- Margin (m, mx, my, mt, mr, mb, ml) -->
<div class="m-4 mx-auto mt-8 mb-4 p-6">
  Singkatan margin: m-0 hingga m-96; juga negatif: -m-4
</div>

<!-- Padding -->
<div class="p-4 px-6 py-2 pt-8 pb-4 pl-10 pr-10">
  Singkatan padding: p-0 hingga p-96
</div>

<!-- Lebar -->
<div class="w-full w-1/2 w-3/4 w-64 w-auto max-w-4xl min-w-0">
  Kelas lebar
</div>

<!-- Tinggi -->
<div class="h-full h-screen h-64 h-auto min-h-screen max-h-96">
  Kelas tinggi
</div>
```

### Utility Tipografi

```html
<!-- Ukuran font -->
<p class="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
  Ukuran teks responsif
</p>
<h1 class="text-4xl font-bold tracking-tight">Judul</h1>
<h2 class="text-3xl font-semibold">Subjudul</h2>
<h3 class="text-2xl font-medium">Judul Seksi</h3>

<!-- Ketebalan font -->
<p class="font-thin font-light font-normal font-medium font-semibold font-bold font-black">
  Varian ketebalan font
</p>

<!-- Tinggi baris -->
<p class="leading-none leading-tight leading-snug leading-normal leading-relaxed leading-loose">
  Utility line-height
</p>

<!-- Perataan & dekorasi teks -->
<p class="text-left text-center text-right text-justify">
  Perataan
</p>
<p class="underline line-through no-underline">Dekorasi teks</p>
<p class="uppercase lowercase capitalize">Transformasi teks</p>
<p class="truncate">Teks panjang yang akan dipotong dengan elipsis jika melebihi lebar kontainer</p>
```

### Warna & Latar Belakang

```html
<!-- Warna teks -->
<p class="text-gray-900 text-blue-600 text-red-500 text-green-600 text-white">
  Warna teks menggunakan skala bayangan (50-950)
</p>

<!-- Warna latar -->
<div class="bg-gray-100 bg-blue-500 bg-gradient-to-r from-cyan-500 to-blue-500">
  Latar belakang dengan gradien
</div>

<!-- Utility opacity -->
<div class="bg-black bg-opacity-50 text-white text-opacity-75">
  Pengubah opacity (0-100 dalam langkah 5 atau 10)
</div>
```

### Border & Radius

```html
<!-- Ketebalan border -->
<div class="border border-2 border-4 border-0 border-b-2 border-l-4">
  Ketebalan border: 0, 2, 4, 8
</div>

<!-- Warna border -->
<div class="border border-gray-200 border-blue-500 border-red-300">
  Warna border menggunakan palet yang sama dengan teks
</div>

<!-- Radius border -->
<div class="rounded rounded-sm rounded-md rounded-lg rounded-xl rounded-2xl rounded-3xl rounded-full">
  Varian radius border
</div>
<div class="rounded-t-lg rounded-b-none rounded-l-full rounded-r-md">
  Sudut individual
</div>
```

### Efek & Transformasi

```html
<!-- Bayangan kotak -->
<div class="shadow-sm shadow-md shadow-lg shadow-xl shadow-2xl shadow-inner shadow-none">
  Elevasi bayangan
</div>

<!-- Transformasi -->
<div class="scale-75 scale-110 rotate-45 -rotate-12 translate-x-4 translate-y-2 skew-x-6">
  Utility transformasi
</div>

<!-- Transisi -->
<button class="transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg focus:ring-2">
  Arahkan kursor
</button>
```

### Varian State

```html
<!-- Hover, Focus, Active -->
<button class="bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 active:bg-blue-800 disabled:opacity-50">
  Tombol Interaktif
</button>

<!-- Group hover -->
<div class="group hover:bg-gray-50 p-4 rounded-lg cursor-pointer">
  <h3 class="text-gray-900 group-hover:text-blue-600">Judul Kartu</h3>
  <p class="text-gray-500 group-hover:text-gray-700">Deskripsi kartu muncul saat hover</p>
</div>

<!-- Peer modifier -->
<div>
  <input type="checkbox" class="peer" />
  <label class="peer-checked:text-blue-600">Label kondisi tercentang</label>
  <p class="hidden peer-checked:block">Konten ini muncul saat checkbox dicentang</p>
</div>
```

### Mode Gelap

```html
<!-- Aktifkan mode gelap via class -->
<html class="dark">
<body class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <div class="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
    <h2 class="text-gray-900 dark:text-white">Kartu Mode Gelap</h2>
    <p class="text-gray-600 dark:text-gray-300">Kartu ini beradaptasi ke mode gelap</p>
  </div>
</body>
</html>
```

### Komponen Kustom dengan @apply

```css
/* Di file CSS atau library komponen Anda */
@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center px-6 py-3 
           bg-blue-600 text-white font-medium rounded-lg 
           hover:bg-blue-700 focus:outline-none focus:ring-2 
           focus:ring-blue-500 focus:ring-offset-2 
           transition-colors duration-200 
           disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .card {
    @apply bg-white rounded-xl shadow-md overflow-hidden 
           hover:shadow-lg transition-shadow duration-300;
  }
}
```

### Integrasi Framework

```html
<!-- Next.js dengan Tailwind -->
<div className="container mx-auto px-4 py-8">
  <h1 className="text-4xl font-bold text-gray-900">Halo Next.js</h1>
</div>

<!-- Vue.js dengan Tailwind -->
<template>
  <div class="flex flex-col items-center min-h-screen bg-gray-50">
    <header class="w-full bg-white shadow-sm p-4">
      <h1 class="text-2xl font-semibold text-center">Vue + Tailwind</h1>
    </header>
  </div>
</template>

<!-- React dengan Tailwind -->
function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold text-gray-900">React + Tailwind</h1>
      </div>
    </div>
  );
}
```

### Penggunaan Plugin

```javascript
// tailwind.config.js — menambahkan plugin
module.exports = {
  plugins: [
    require('@tailwindcss/forms'),
    // Mereset elemen form agar lebih mudah di-styling
    require('@tailwindcss/typography'),
    // Kelas Prose untuk konten rich text
    require('@tailwindcss/aspect-ratio'),
    // Utility rasio aspek (aspect-w-16 aspect-h-9)
    require('@tailwindcss/container-queries'),
    // Dukungan container query (@sm, @md, @lg)
  ],
}
```

```html
<!-- Plugin Typography -->
<article class="prose prose-lg prose-blue dark:prose-invert max-w-none">
  <h1>Konten Rich Text</h1>
  <p>Di-styling secara otomatis dengan plugin typography.</p>
</article>

<!-- Plugin Aspect Ratio -->
<div class="aspect-w-16 aspect-h-9">
  <iframe src="https://www.youtube.com/embed/..." class="w-full h-full"></iframe>
</div>

<!-- Plugin Container Queries -->
<div class="@container">
  <div class="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 gap-4">
    <!-- Responsif terhadap kontainer, bukan viewport -->
  </div>
</div>
```

### Optimasi Produksi

```javascript
// tailwind.config.js — optimasi produksi
module.exports = {
  content: [
    // Path **eksplisit** saja — tidak ada glob lebar yang memindai node_modules
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // PurgeCSS berjalan otomatis di produksi saat content dikonfigurasi
  safelist: [
    // Kelas yang dibuat secara dinamis di JS
    'bg-red-500',
    'bg-green-500',
    'bg-blue-500',
  ],
}
```

```bash
# Build untuk produksi dengan environment flag
NODE_ENV=production npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify

# Perkiraan ukuran output untuk proyek tipikal:
# - Development: ~3-4 MB (semua kelas tersedia)
# - Produksi: ~10-50 KB (hanya kelas yang digunakan)
```

### Animasi

```html
<!-- Animasi bawaan -->
<div class="animate-spin">Memuat</div>
<div class="animate-ping">Indikator ping</div>
<div class="animate-pulse">Kerangka pulse</div>
<div class="animate-bounce">Memantul</div>
<div class="animate-none">Tanpa animasi</div>

<!-- Animasi kustom -->
<div class="animate-fade-in">
  Animasi kustom yang didefinisikan di tailwind.config.js
</div>
```

```javascript
// Animasi kustom di tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
};
```

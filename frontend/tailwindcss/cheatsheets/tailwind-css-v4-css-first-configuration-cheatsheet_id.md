---
title: "Cheat Sheet Konfigurasi CSS-First Tailwind CSS v4"
description: "Referensi cepat untuk sistem konfigurasi CSS-first Tailwind CSS v4: token desain @theme, utilitas kustom @utility, varian @variant dan @custom-variant, @plugin, deteksi konten otomatis, serta jalur upgrade dari v3."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Konfigurasi CSS-First Tailwind CSS v4

## Tabel Referensi Cepat

| Direktif / Perintah | Sintaks | Fungsi |
|---------------------|---------|--------|
| Titik masuk | `@import "tailwindcss";` | Menggantikan tiga direktif `@tailwind` lama |
| Token desain | `@theme { --color-brand-500: oklch(...); }` | Mendefinisikan warna, font, spacing, dan lainnya sebagai variabel CSS |
| Utilitas kustom | `@utility card { ... }` | Membuat utilitas yang dapat dipakai ulang dengan dukungan varian |
| Varian kustom | `@variant hocus (&:hover, &:focus);` | Menambahkan selektor varian kustom |
| Varian singkat | `@custom-variant dark (&:where(.dark, .dark *));` | Mendefinisikan varian dalam satu baris |
| Plugin JS | `@plugin "@tailwindcss/forms";` | Memuat plugin JavaScript dari CSS |
| Sumber konten tambahan | `@source "../components/**/*.html";` | Menambahkan jalur untuk deteksi konten otomatis |
| Jembatan konfigurasi lama | `@config "../../tailwind.config.js";` | Memuat konfigurasi JS gaya v3 di v4 |
| Referensi gaya | `@reference "./main.css";` | Mengimpor gaya untuk `@apply` tanpa mengeluarkan CSS-nya |
| Menyusun utilitas | `@apply flex items-center;` | Membangun kelas komponen dari utilitas |
| Alat upgrade | `npx @tailwindcss/upgrade` | Memigrasikan proyek v3 ke v4 secara otomatis |

## Perintah Umum

### Instalasi (v4)

```bash
# Pasang paket v4 dan plugin Vite
npm install tailwindcss @tailwindcss/vite
```

### Setup Plugin Vite

```javascript
// vite.config.js — daftarkan plugin Tailwind
import tailwindcss from '@tailwindcss/vite'

export default {
  plugins: [tailwindcss()],
}
```

### Setup PostCSS

```bash
npm install tailwindcss @tailwindcss/postcss
```

```javascript
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### Penggunaan CLI

```bash
# Pasang CLI mandiri
npm install -D @tailwindcss/cli

# Build sekali
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css

# Mode watch
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --watch

# Build produksi (minified)
NODE_ENV=production npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --minify
```

### Upgrade dari v3

```bash
# Jalankan alat upgrade (menulis ulang file konfigurasi dan CSS di tempat)
npx @tailwindcss/upgrade
```

## Potongan Kode

### Titik Masuk Minimal v4

```css
/* src/input.css — satu import ini menggantikan
   @tailwind base; @tailwind components; @tailwind utilities; */
@import "tailwindcss";
```

### Mendefinisikan Token Desain dengan @theme

```css
@import "tailwindcss";

@theme {
  /* Warna menjadi utilitas: text-brand-500, bg-brand-500, border-brand-500, ... */
  --color-brand-50: oklch(0.97 0.02 240);
  --color-brand-500: oklch(0.62 0.19 240);
  --color-brand-900: oklch(0.32 0.12 240);

  /* Font menjadi utilitas: font-display */
  --font-display: "Inter", system-ui, sans-serif;

  /* Tambahan skala spacing: mt-18, p-18, gap-18, ... */
  --spacing-18: 4.5rem;

  /* Breakpoint menjadi varian: @3xl:flex, ... */
  --breakpoint-3xl: 100rem;

  /* Shadow: shadow-glow */
  --shadow-glow: 0 0 24px rgb(59 130 246 / 0.5);
}
```

### Mereferensikan Token di CSS Kustom

```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.62 0.19 240);
}

/* Token adalah variabel CSS biasa — dapat digunakan di mana saja */
.card-accent {
  background-color: var(--color-brand-500);
}

/* Utilitas yang dihasilkan dari token merujuk variabel yang sama */
.card-accent {
  @apply bg-brand-500;
}
```

### Utilitas Kustom dengan @utility

```css
@import "tailwindcss";

@utility text-balance {
  text-wrap: balance;
}

@utility card {
  @apply rounded-2xl border border-gray-200 bg-white p-6 shadow-sm;
}
```

```html
<!-- Utilitas kustom mendukung varian seperti utilitas bawaan -->
<p class="text-balance">Pembungkusan teks yang seimbang</p>
<div class="card hover:shadow-lg">Kartu dengan efek hover</div>
```

### Varian Kustom dengan @variant dan @custom-variant

```css
@import "tailwindcss";

/* Varian multi-selektor */
@variant hocus (&:hover, &:focus);

/* Mode gelap berbasis kelas (menggantikan darkMode: 'class' di konfigurasi JS) */
@custom-variant dark (&:where(.dark, .dark *));

/* Varian atribut data */
@custom-variant required (&[data-required="true"]);
```

```html
<button class="bg-blue-500 hocus:bg-blue-700">Hover atau fokus</button>
<div class="bg-white dark:bg-gray-900">Sadar mode gelap</div>
<input class="border-gray-300 required:border-red-500" data-required="true" />
```

### Memuat Plugin JavaScript

```css
@import "tailwindcss";
@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";
```

### Sumber Konten Eksplisit

```css
@import "tailwindcss";

/* Deteksi otomatis biasanya cukup; tambahkan sumber saat file
   berada di luar akar proyek atau menggunakan nama kelas dinamis */
@source "../shared-components/**/*.html";
@source "../../node_modules/@acme/ui/dist/*.js";
```

### Mode Gelap dengan Strategi Media Default

```css
@import "tailwindcss";

/* v4 menggunakan prefers-color-scheme secara default — tanpa konfigurasi */
```

```html
<div class="bg-white dark:bg-gray-900">Mengikuti preferensi sistem</div>
```

### Nilai dan Properti Arbitrer

```html
<!-- Nilai arbitrer bekerja di v4 sama seperti v3 -->
<div class="w-[calc(100%-2rem)] bg-[oklch(0.62_0.19_240)]"></div>

<!-- Properti arbitrer -->
<div class="[mask-image:linear-gradient(black,transparent)]"></div>
```

### Menerapkan Utilitas Antar File dengan @reference

```css
/* components/button.css — gunakan kembali utilitas dari file utama
   tanpa menduplikasi CSS yang dihasilkan */
@reference "./main.css";

.btn {
  @apply inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white;
}
```

### Memigrasikan Konfigurasi v3 dengan @config

```css
@import "tailwindcss";

/* Menjembatani tailwind.config.js yang sudah ada selama migrasi bertahap */
@config "../../tailwind.config.js";
```

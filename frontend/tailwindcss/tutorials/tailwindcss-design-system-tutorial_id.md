---
title: "Membangun Design System dengan Tailwind CSS"
description: "Tutorial praktis membangun design system berbasis token dengan Tailwind CSS v4 — mendefinisikan token tema untuk warna, spacing, font, dan breakpoint, menyusun komponen button, input, dan card dengan @layer serta @apply, dan menambahkan custom variant."
category: "frontend"
technology: "tailwindcss"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Design System dengan Tailwind CSS

## Ringkasan

Dalam tutorial ini Anda akan mengubah tumpukan utility class yang tersebar menjadi design system yang dapat digunakan ulang: token tema untuk warna, spacing, font, dan breakpoint pada lapisan `@theme` bergaya CSS-first dari Tailwind CSS v4, CSS variable yang mengganti tema saat runtime, serta komponen Button, Input, dan Card yang disusun dengan `@layer components` dan `@apply`. Hasilnya adalah satu berkas `app.css` yang dapat dikonsumsi halaman mana pun di proyek Anda.

## Target Audiens

- Frontend developer yang sudah menulis utility Tailwind dan ingin komponen yang konsisten serta dapat digunakan ulang.
- Pengelola design system yang menyeragamkan token di banyak aplikasi.
- Developer tingkat menengah yang nyaman dengan HTML, CSS custom property, dan npm.

## Prasyarat

- Pemahaman dasar HTML dan CSS, termasuk CSS custom property (`--token: value`).
- Terbiasa dengan utility class Tailwind (`px-4`, `text-sm`, `md:flex`).
- Node.js 20+ dan npm terpasang, beserta terminal.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mendefinisikan token desain untuk warna, spacing, font, dan breakpoint di lapisan `@theme`.
- Memetakan CSS variable yang dapat berganti saat runtime menjadi utility Tailwind dengan `@theme inline`.
- Menyusun komponen Button, Input, dan Card menggunakan `@layer components` dan `@apply`.
- Mendaftarkan custom variant dengan `@custom-variant` dan memvalidasi token di CI.

## Konteks dan Motivasi

Utility class sangat skalabel untuk layout, tetapi buruk untuk konsistensi brand — tanpa token, satu engineer menulis `bg-blue-600` dan engineer lain menulis `bg-indigo-600` di halaman yang sama. Design system berbasis token menyelesaikan masalah ini: token menjadikan keputusan desain bersumber tunggal, dan lapisan komponen tipis memberi nama pada keputusan tersebut agar dapat digunakan ulang seluruh tim.

## Konten Inti

### 1. Token Dulu: Lapisan `@theme`

Tailwind v4 bersifat CSS-first; token hidup di CSS, bukan di konfigurasi JavaScript. Setiap namespace `@theme` memetakan ke prefiks utility:

| Namespace token | Contoh token | Utility yang dihasilkan |
| --- | --- | --- |
| `--color-*` | `--color-brand-500` | `bg-brand-500`, `text-brand-500`, `ring-brand-500` |
| `--spacing-*` | `--spacing-lg` | `p-lg`, `m-lg`, `gap-lg` |
| `--font-*` | `--font-display` | `font-display` |
| `--breakpoint-*` | `--breakpoint-lg` | `lg:*` |

### 2. Theming Runtime dengan Token CSS Variable

Token yang ditulis di `@theme` bersifat statis saat build. Untuk tema yang berganti di browser, deklarasikan CSS variable biasa pada `:root` dan `[data-theme="dark"]`, lalu publikasikan ulang dengan `@theme inline` — kata kunci `inline` membuat utility merujuk langsung ke variable, sehingga pergantian tema berlaku tanpa build ulang.

### 3. Class Komponen dengan `@layer components` dan `@apply`

`@layer components` mendaftarkan class yang berada di antara base style dan utility, sehingga utility pada elemen tetap menang. `@apply` memungkinkan class tersebut memakai kembali utility berbasis token, menjaga komponen tetap ringkas dan token tetap menjadi acuan. Jaga lapisan ini tetap tipis — hanya pola yang benar-benar berulang yang layak masuk.

### 4. Custom Variant

`@custom-variant` memberi nama pada kombinasi selector yang sering Anda ulang, misalnya pasangan hover-dan-focus atau scope tema gelap. Berbeda dari `@apply`, variant dapat dikomposisikan ke utility, sehingga `.hocus:underline` dan `md:hocus:ring-2` sama-sama bekerja.

## Contoh Kode

### Langkah 1: Pasang Tailwind CLI

```bash
npm install --save-dev tailwindcss @tailwindcss/cli
npx @tailwindcss/cli -i ./src/app.css -o ./dist/app.css --minify
```

### Langkah 2: Definisikan Token dan Komponen

```css
/* src/app.css — token desain dan komponen (Tailwind v4) */
@import "tailwindcss";

/* Token statis: warna, spacing, font, breakpoint. */
@theme {
  --color-brand-500: oklch(0.62 0.19 250);
  --color-brand-600: oklch(0.55 0.19 250);
  --color-danger-500: oklch(0.58 0.22 27);
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  --font-display: "Satoshi", "Inter", sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --radius-card: 0.75rem;
}

/* Token runtime: diganti oleh [data-theme] tanpa build ulang. */
:root {
  --surface: oklch(1 0 0);
  --surface-raised: oklch(0.97 0.005 250);
  --text-strong: oklch(0.22 0.02 250);
  --border-subtle: oklch(0.9 0.01 250);
}

[data-theme="dark"] {
  --surface: oklch(0.2 0.02 250);
  --surface-raised: oklch(0.26 0.02 250);
  --text-strong: oklch(0.96 0.005 250);
  --border-subtle: oklch(0.36 0.02 250);
}

/* `inline` menjaga utility tetap menunjuk ke variable, bukan nilai beku. */
@theme inline {
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-text-strong: var(--text-strong);
  --color-border-subtle: var(--border-subtle);
}

/* Custom variant: pasangan interaksi + scope tema gelap. */
@custom-variant hocus (&:hover, &:focus-visible);
@custom-variant theme-dark (&:where([data-theme="dark"] *));

@layer components {
  .btn {
    @apply inline-flex items-center justify-center gap-sm rounded-card px-lg py-sm font-body text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50;
  }
  .btn-primary { @apply bg-brand-500 text-white hover:bg-brand-600; }
  .btn-ghost { @apply bg-transparent text-text-strong hover:bg-surface-raised; }
  .input {
    @apply block w-full rounded-card border border-border-subtle bg-surface px-md py-sm font-body text-sm text-text-strong placeholder:text-text-strong/50 aria-invalid:border-danger-500 aria-invalid:ring-2 aria-invalid:ring-danger-500/30;
  }
  .card { @apply rounded-card border border-border-subtle bg-surface-raised p-lg; }
  .card-title { @apply font-display text-lg font-semibold text-text-strong; }
}
```

### Langkah 3: Pakai Design System-nya

```html
<!doctype html>
<html lang="id" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="./dist/app.css" />
    <title>Pratinjau design system</title>
  </head>
  <body class="bg-surface p-lg font-body text-text-strong">
    <form class="card mx-auto max-w-md space-y-md">
      <h1 class="card-title">Masuk</h1>
      <label class="block">
        <span class="mb-xs block text-sm font-medium">Email</span>
        <input class="input" type="email" name="email" required aria-invalid="false" />
      </label>
      <button class="btn btn-primary w-full" type="submit">Lanjutkan</button>
      <button class="btn btn-ghost hocus:underline w-full" type="button">Pakai SSO</button>
    </form>
  </body>
</html>
```

### Langkah 4: Jaga Token di CI

Komponen yang merujuk token yang sudah dihapus akan kehilangan styling secara diam-diam; skrip ini membuat build gagal:

```javascript
// scripts/check-tokens.mjs
import { readFile } from "node:fs/promises";

const REQUIRED_TOKENS = ["--color-brand-500", "--color-danger-500", "--font-display", "--spacing-lg", "--breakpoint-lg"];
const cssPath = process.argv[2] ?? "./src/app.css";

try {
  const css = await readFile(cssPath, "utf8");
  const missing = REQUIRED_TOKENS.filter((t) => !css.includes(`${t}:`));
  if (missing.length) throw new Error(`token hilang: ${missing.join(", ")}`);
  console.log(`Seluruh ${REQUIRED_TOKENS.length} token desain tersedia.`);
} catch (error) {
  console.error(`Pemeriksaan design system gagal: ${error.message}`);
  process.exit(1);
}
```

Jalankan dengan `node scripts/check-tokens.mjs` sebelum langkah build Tailwind di CI.

## Insight Penting

- **Token lebih penting daripada class**: Jika dua komponen butuh nilai yang sama, itu layak jadi token; jika butuh *string* class yang sama, itu layak masuk `@layer components`.
- **`@theme inline` wajib untuk tema runtime**: Tanpa `inline`, utility menangkap nilai variable saat build dan pergantian `data-theme` seolah tidak berefek.
- **`@apply` dari berkas lain butuh reference**: Pada blok Vue, Svelte, atau CSS Modules, tambahkan `@reference "../app.css";` sebelum `@apply`.
- **Beri nama sesuai peran, bukan warna**: `--color-danger-500` tetap bertahan saat rebranding; `--color-red-500` tidak.

## Langkah Berikutnya

- Tambahkan token varian semantik untuk state sukses, peringatan, dan info.
- Hubungkan tombol dark-mode yang disimpan di `localStorage` ke `data-theme`.

## Kesimpulan

Anda telah membangun design system berbasis token dengan Tailwind CSS v4: token `@theme`, CSS variable `@theme inline` untuk theming runtime, komponen Button, Input, dan Card dengan `@layer components` dan `@apply`, custom variant `hocus`, serta penjaga CI yang menjaga komponen dan token tetap sinkron — semuanya dalam satu berkas.

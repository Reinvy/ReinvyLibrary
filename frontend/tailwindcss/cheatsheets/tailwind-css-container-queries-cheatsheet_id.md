---
title: "Cheat Sheet Container Queries dan Komponen Responsif Tailwind CSS"
description: "Referensi lanjutan untuk styling dengan container query Tailwind CSS: container inline-size dan size, container bernama, varian min/max serta rentang, unit panjang container query, ukuran container kustom pada namespace tema --container-*, dan pola produksi untuk komponen yang benar-benar portabel."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Container Queries dan Komponen Responsif Tailwind CSS

Breakpoint viewport menjawab "seberapa lebar jendela browser?". Container query menjawab "seberapa lebar ruang yang diberikan ke komponen ini?" — pertanyaan yang sebenarnya dibutuhkan oleh card yang dipakai ulang, widget sidebar, atau tabel data. Tailwind CSS v4 sudah menyertakan dukungan container query di core, sehingga plugin `@tailwindcss/container-queries` tidak lagi diperlukan.

## Tabel Referensi Cepat

| Utility atau varian | Contoh | Fungsinya |
|---------------------|--------|-----------|
| `@container` | `class="@container"` | Menandai elemen sebagai container query berukuran inline-size |
| `@container-size` | `class="@container-size"` | Menandai elemen sebagai size container (inline dan block size) |
| `@container/{nama}` | `class="@container/card"` | Container inline-size bernama yang bisa dituju eksplisit oleh turunannya |
| `@container-size/{nama}` | `class="@container-size/panel"` | Size container bernama |
| `@3xs` … `@7xl` | `class="@md:flex-row"` | Varian lebar container, mobile-first (berlaku pada ukuran itu ke atas) |
| `@max-*` | `class="@max-md:flex-col"` | Berlaku di bawah ukuran container yang disebut |
| Varian rentang | `class="@sm:@max-lg:hidden"` | Menumpuk varian min dan max menjadi satu rentang |
| `@min-[475px]` | `class="@min-[475px]:grid-cols-2"` | Lebar container minimum arbitrer tanpa mengubah tema |
| `@max-[960px]` | `class="@max-[960px]:hidden"` | Lebar container maksimum arbitrer |
| `@min-[400px]:@max-[700px]` | `class="@min-[400px]:@max-[700px]:block"` | Rentang query arbitrer |
| `cqw` `cqi` | `class="w-[50cqw]"` | Unit container query yang bisa dipakai di nilai arbitrer |
| `cqh` `cqb` `cqmin` `cqmax` | `class="h-[30cqb]"` | Unit block-size dan min/max container (butuh size container) |
| `--container-*` | `@theme { --container-8xl: 96rem; }` | Mendefinisikan ukuran container tambahan, dipakai bersama `max-w-*` |

## Perintah Umum

### Instalasi dan Build dengan CLI v4

```bash
# Instalasi core — plugin container query tidak dibutuhkan lagi
npm install tailwindcss @tailwindcss/postcss postcss

# Build sekali jalan lewat CLI
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --minify

# Mode watch saat mengiterasi layout komponen
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --watch
```

### Melepas Plugin v3 yang Lama

```bash
# Proyek v3 membutuhkan plugin; v4 menyediakan API yang sama di core
npm install -D @tailwindcss/container-queries
git grep -n "container-queries" -- '*.js' '*.ts' '*.mjs'
```

```javascript
// tailwind.config.js — hanya diperlukan pada Tailwind v3
module.exports = {
  plugins: [require('@tailwindcss/container-queries')],
}
```

### Referensi Ukuran Container

```text
| Varian | Lebar minimum  | Varian | Lebar minimum     |
|--------|----------------|--------|-------------------|
| @3xs   | 16rem (256px)  | @2xl   | 42rem (672px)     |
| @2xs   | 18rem (288px)  | @3xl   | 48rem (768px)     |
| @xs    | 20rem (320px)  | @4xl   | 56rem (896px)     |
| @sm    | 24rem (384px)  | @5xl   | 64rem (1024px)    |
| @md    | 28rem (448px)  | @6xl   | 72rem (1152px)    |
| @lg    | 32rem (512px)  | @7xl   | 80rem (1280px)    |
| @xl    | 36rem (576px)  |        |                   |
```

Ukuran container sengaja lebih kecil daripada breakpoint viewport (`sm` adalah 40rem, `@sm` adalah 24rem) karena sebuah komponen jarang memakai seluruh lebar viewport. Setiap ukuran juga punya pasangan `@max-*`: `@max-md` dikompilasi menjadi `@container (width < 28rem)`.

### Bentuk CSS yang Dihasilkan

```text
@container       →  .\@container { container-type: inline-size }
@sm:flex-row     →  @container (width >= 24rem) { ... }
@max-md:flex-col →  @container (width < 28rem) { ... }
@sm:@max-lg:...  →  @container (24rem <= width < 32rem) { ... }
@container/card  →  container-type: inline-size; container-name: card
@md/card:grid    →  @container card (width >= 28rem) { ... }
```

### Memformat Daftar Class

```bash
# prettier-plugin-tailwindcss mengurutkan tumpukan varian secara deterministik
npm install -D prettier prettier-plugin-tailwindcss
npx prettier --write "src/**/*.{html,jsx,tsx,vue,svelte}"
```

## Potongan Kode

### Query Viewport Versus Query Container

```html
<!-- Media query: kedua card berganti layout pada lebar jendela yang sama,
     sehingga card di sidebar sudah dianggap "besar" padahal kolomnya sempit -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <aside class="col-span-1">
    <article class="flex items-center gap-4 sm:flex-col">
      <img src="/cover.webp" alt="" class="h-16 w-16 rounded-lg object-cover">
      <h3 class="text-lg">Card sidebar</h3>
    </article>
  </aside>
</div>

<!-- Container query: setiap card merespons kolom yang benar-benar ditempatinya -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <aside class="col-span-1">
    <article class="@container">
      <div class="flex items-center gap-4 @md:flex-col @md:items-start">
        <img src="/cover.webp" alt="" class="h-16 w-16 rounded-lg object-cover">
        <h3 class="text-base @md:text-lg">Card sidebar</h3>
      </div>
    </article>
  </aside>
</div>
```

### Card yang Berubah Layout dalam Tiga Tahap

```html
<article class="@container rounded-xl border border-slate-200 bg-white shadow-sm">
  <div class="flex flex-col gap-4 p-4 @md:flex-row @md:items-start @md:gap-6 @2xl:p-6">
    <img
      src="/product.webp"
      alt=""
      class="h-40 w-full rounded-lg object-cover @md:h-24 @md:w-24 @2xl:h-32 @2xl:w-32"
    >
    <div class="flex flex-col gap-2 @md:flex-1">
      <h2 class="text-lg font-semibold text-slate-900 @2xl:text-xl">Buku Catatan Lapangan</h2>
      <p class="text-sm text-slate-600 @max-md:line-clamp-2">
        Sampul kanvas berlapis lilin, 192 halaman dot-grid, jilidan lay-flat.
      </p>
      <div class="flex items-center gap-3 @max-sm:flex-col @max-sm:items-stretch">
        <span class="text-base font-semibold text-slate-900">Rp420.000</span>
        <button class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white @max-sm:mt-2">
          Tambah ke keranjang
        </button>
      </div>
    </div>
  </div>
</article>
```

### Container Bernama yang Bersarang

```html
<!-- Dua container nyata di dalam pohon: shell halaman dan widget itu sendiri -->
<div class="@container/main min-h-screen">
  <main class="p-4 @lg/main:p-8">
    <section class="@container/widget rounded-lg bg-slate-50 p-4">
      <header class="flex flex-col gap-1 @sm/widget:flex-row @sm/widget:items-center @sm/widget:justify-between">
        <h2 class="text-base font-semibold @md/widget:text-lg">Pendapatan mingguan</h2>
        <span class="text-xs text-slate-500 @max-md/widget:hidden">Diperbarui 4 menit lalu</span>
      </header>
      <dl class="mt-4 grid grid-cols-1 gap-4 @md/widget:grid-cols-2 @2xl/widget:grid-cols-4">
        <div><dt class="text-xs uppercase text-slate-500">MRR</dt><dd class="text-xl font-semibold">Rp42,1jt</dd></div>
        <div><dt class="text-xs uppercase text-slate-500">Churn</dt><dd class="text-xl font-semibold">1,8%</dd></div>
      </dl>
    </section>
  </main>
</div>
```

Container bernama menjadi penting begitu dua container bersarang: `@md:` tanpa nama diresolusikan ke container leluhur terdekat, yang sering justru widget terdalam padahal yang dimaksud adalah shell halaman.

### Varian Rentang untuk Lebar Menengah

```html
<!-- Sidebar hanya tampil di rentang lebar menengah, disembunyikan saat shell sangat kecil atau sangat besar -->
<div class="@container">
  <div class="grid grid-cols-1 @lg:grid-cols-[16rem_1fr]">
    <nav class="hidden @lg:@max-4xl:block @lg:@max-4xl:border-r @lg:@max-4xl:pr-4">
      <a href="/docs" class="block py-1 text-sm text-slate-600">Dokumentasi</a>
      <a href="/api" class="block py-1 text-sm text-slate-600">API</a>
    </nav>
    <article class="prose max-w-none">...</article>
  </div>
</div>
```

### Unit Container Query

```html
<!-- Container inline-size: cqw dan cqi valid, cqh dan cqb tidak -->
<section class="@container rounded-2xl bg-slate-900 p-6 text-white">
  <h1 class="text-[clamp(1.25rem,6cqw,3rem)] font-bold leading-tight">
    Tipografi yang diskalakan oleh card, bukan oleh jendela
  </h1>
  <div class="mt-4 h-[40cqw] max-h-64 w-[60cqw] bg-slate-700"></div>
</section>

<!-- Size container: unit block seperti cqb juga bisa diresolusikan -->
<section class="@container-size flex h-96 items-end bg-slate-100 p-6">
  <div class="w-full bg-white p-4 shadow-sm" style="min-height: 30cqb">...</div>
</section>
```

`cqw` adalah persentase lebar container, `cqh` tingginya, `cqi` dan `cqb` ukuran inline serta block-nya, sedangkan `cqmin`/`cqmax` mengambil yang lebih kecil dan lebih besar dari keduanya. Unit ini hanya teresolusi jika ada query container di atasnya, sehingga elemen tanpa container leluhur akan jatuh ke unit viewport kecil.

### Ukuran Container Kustom di Tema

```css
@import "tailwindcss";

@theme {
  /* Menambah varian @8xl:* dan max-w-8xl — satu namespace, dua keluarga utility */
  --container-8xl: 96rem;
  --container-card: 22rem;
}

/* Opsional: container yang mempertahankan intrinsic sizing-nya sendiri */
@utility container-inline {
  container-type: inline-size;
}
```

```html
<div class="@container">
  <div class="grid grid-cols-1 @card:grid-cols-2 @8xl:grid-cols-4">...</div>
</div>
```

### Layout Shell yang Ditentukan Oleh Kolom Konten

```html
<div class="flex min-h-screen">
  <aside class="hidden w-64 shrink-0 border-r lg:block">...</aside>
  <main class="@container flex-1 min-w-0 p-6">
    <div class="grid grid-cols-1 gap-6 @xl:grid-cols-2 @5xl:grid-cols-3">
      <article class="rounded-lg border p-4">...</article>
      <article class="rounded-lg border p-4">...</article>
      <article class="rounded-lg border p-4">...</article>
    </div>
  </main>
</div>
```

`min-w-0` pada container bukan pilihan opsional di layout flex dan grid: tanpa itu item flex menolak menyusut di bawah lebar intrinsik kontennya, sehingga container query tidak pernah melihat ukuran sempit yang ingin didesain.

### Tabel Data yang Berubah Menjadi Card

```html
<div class="@container overflow-x-auto">
  <table class="hidden w-full text-sm @2xl:table">
    <thead class="border-b text-left text-xs uppercase text-slate-500">
      <tr><th class="py-2">Order</th><th class="py-2">Pelanggan</th><th class="py-2">Total</th></tr>
    </thead>
    <tbody>
      <tr class="border-b"><td class="py-2">#1024</td><td class="py-2">Ada L.</td><td class="py-2">Rp1.440.000</td></tr>
    </tbody>
  </table>

  <ul class="grid gap-3 @2xl:hidden">
    <li class="rounded-lg border p-4">
      <p class="font-medium">#1024 · Ada L.</p>
      <p class="text-sm text-slate-600">Rp1.440.000</p>
    </li>
  </ul>
</div>
```

### Fallback Deteksi Fitur

```css
/* Hanya aktifkan container query saat browser mendukungnya */
@supports (container-type: inline-size) {
  .card-shell {
    container-type: inline-size;
  }

  @container (width >= 28rem) {
    .card-shell .card-body {
      display: flex;
      gap: 1.5rem;
    }
  }
}

/* Fallback CSS biasa untuk browser lainnya */
@supports not (container-type: inline-size) {
  @media (min-width: 40rem) {
    .card-shell .card-body {
      display: flex;
      gap: 1.5rem;
    }
  }
}
```

### Memverifikasi Query di Test Komponen

```typescript
// Playwright: ubah ukuran container, bukan viewport — mengubah ukuran jendela
// hanya memenuhi media query dan membuat varian container tidak teruji.
import { test, expect } from '@playwright/test'

test('card produk berganti ke layout horizontal di container lebar', async ({ page }) => {
  await page.goto('/products/buku-catatan-lapangan')
  const shell = page.getByTestId('card-shell')
  const body = page.getByTestId('card-body')

  await shell.evaluate((el) => {
    (el as HTMLElement).style.width = '240px'
  })
  await expect(body).toHaveCSS('flex-direction', 'column')

  await shell.evaluate((el) => {
    (el as HTMLElement).style.width = '560px'
  })
  await expect(body).toHaveCSS('flex-direction', 'row')
})
```

Dua aturan praktis untuk pengujian: periksa lebar container itu sendiri dan bukan lebar viewport, serta beri container lebar eksplisit di test — `container-type: inline-size` membuat shell tidak lagi melebar mengikuti kontennya, sehingga container test tanpa lebar bisa kolaps dan memicu semua varian `@max-*` sekaligus.

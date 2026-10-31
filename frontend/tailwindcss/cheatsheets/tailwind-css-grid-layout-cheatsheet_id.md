---
title: "Cheat Sheet Grid Layout Tailwind CSS"
description: "Referensi praktis CSS Grid di Tailwind CSS: template kolom dan baris, span serta penempatan, pola auto-fit dan minmax, pengaturan gap, grid responsif, dan named area lewat arbitrary value."
category: "frontend"
technology: "tailwindcss"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Grid Layout Tailwind CSS

## Tabel Referensi Cepat

| Tujuan | Kelas | CSS yang Dihasilkan |
|--------|-------|---------------------|
| Mengaktifkan grid | `grid` | `display: grid` |
| Kolom sama lebar | `grid-cols-3` | `grid-template-columns: repeat(3, minmax(0, 1fr))` |
| Tanpa template | `grid-cols-none` | `grid-template-columns: none` |
| Kolom arbitrer | `grid-cols-[200px_1fr_80px]` | track tetap plus fleksibel |
| Baris sama tinggi | `grid-rows-2` | `grid-template-rows: repeat(2, minmax(0, 1fr))` |
| Subgrid | `grid-cols-subgrid` | `grid-template-columns: subgrid` |
| Rentang kolom | `col-span-2` | `grid-column: span 2 / span 2` |
| Rentang seluruh kolom | `col-span-full` | `grid-column: 1 / -1` |
| Tempatkan per garis | `col-start-2 col-end-4` | `grid-column: 2 / 4` |
| Penempatan otomatis | `col-auto` | `grid-column: auto` |
| Rentang baris | `row-span-2` | `grid-row: span 2 / span 2` |
| Arah aliran | `grid-flow-col` | `grid-auto-flow: column` |
| Pengisian rapat | `grid-flow-row-dense` | mengisi celah akibat span |
| Ukuran track implisit | `auto-rows-[minmax(12rem,auto)]` | `grid-auto-rows: …` |
| Gap seragam | `gap-6` | `gap: 1.5rem` |
| Gap per sumbu | `gap-x-8 gap-y-2` | `column-gap` / `row-gap` |
| Perataan item | `items-center` | `align-items: center` |
| Perataan satu item | `justify-self-end` | `justify-self: end` |

## Perintah Umum

### Instalasi dan Build

```bash
# Tailwind CSS v4 dengan CLI mandiri
npm install -D tailwindcss @tailwindcss/cli

# Kompilasi sekali lalu pantau perubahan
npx @tailwindcss/cli -i ./src/app.css -o ./public/build.css --watch
```

```bash
# Tailwind CSS v4 dengan Vite
npm install -D tailwindcss @tailwindcss/vite

# Build produksi (memastikan kelas grid ikut dihasilkan)
npm run build
```

Kelas dinamis seperti `grid-cols-${n}` tidak akan pernah dihasilkan jika teksnya tidak muncul secara utuh di source. Daftarkan lewat `@source inline(...)` pada v4, atau gunakan peta statis seperti contoh di bawah.

## Potongan Kode

### Kolom Sama Lebar dengan Span

```html
<section class="grid grid-cols-1 gap-4 md:grid-cols-6">
  <div class="rounded-xl bg-white p-6 shadow-sm md:col-span-4">Grafik utama</div>
  <aside class="rounded-xl bg-white p-6 shadow-sm md:col-span-2">Ringkasan</aside>
  <div class="rounded-xl bg-white p-6 shadow-sm md:col-span-full">Umpan aktivitas</div>
</section>
```

### Auto-Fit: Responsif Tanpa Breakpoint

```html
<div class="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-6">
  <article class="rounded-2xl border border-gray-200 p-6">Kartu satu</article>
  <article class="rounded-2xl border border-gray-200 p-6">Kartu dua</article>
  <article class="rounded-2xl border border-gray-200 p-6">Kartu tiga</article>
</div>
```

`auto-fit` meruntuhkan track kosong sehingga kartu yang tersisa melebar memenuhi baris. Ganti dengan `auto-fill` bila track kosong harus tetap dicadangkan dan kartu tidak boleh tumbuh melewati ukuran minimumnya.

### Sidebar Plus Konten Fleksibel

```html
<div class="grid min-h-screen grid-cols-[16rem_minmax(0,1fr)]">
  <nav class="border-r border-gray-200 bg-gray-50 p-4">Navigasi</nav>
  <main class="p-8">
    <div class="grid gap-6 xl:grid-cols-3">
      <section class="xl:col-span-2">Laporan</section>
      <aside>Filter</aside>
    </div>
  </main>
</div>
```

`minmax(0,1fr)` penting: `1fr` polos memiliki minimum otomatis sebesar `min-content`, sehingga tabel atau blok kode yang panjang dapat merusak layout.

### Layout Bento dengan Span Baris dan Kolom

```html
<div class="grid auto-rows-[9rem] grid-cols-4 gap-4">
  <div class="col-span-2 row-span-2 rounded-2xl bg-indigo-600 p-6 text-white">Hero</div>
  <div class="rounded-2xl bg-white p-6 shadow-sm">Statistik A</div>
  <div class="rounded-2xl bg-white p-6 shadow-sm">Statistik B</div>
  <div class="col-span-2 rounded-2xl bg-white p-6 shadow-sm">Tren</div>
</div>
```

Baris yang diatur lewat `auto-rows-[…]` memberi acuan tinggi yang dapat dilipatgandakan span, sehingga grid bento tetap rapi saat isi berubah.

### Named Area dengan Arbitrary Property

```html
<div
  class="grid grid-cols-3 grid-rows-[auto_1fr_auto] gap-4
    [grid-template-areas:'header_header_header'_'sidebar_main_main'_'footer_footer_footer']"
>
  <header class="[grid-area:header] bg-gray-900 p-4 text-white">Header</header>
  <nav class="[grid-area:sidebar] bg-gray-100 p-4">Sidebar</nav>
  <main class="[grid-area:main] p-4">Konten</main>
  <footer class="[grid-area:footer] bg-gray-100 p-4">Footer</footer>
</div>
```

Garis bawah berubah menjadi spasi di dalam arbitrary value; setiap grup dalam tanda kutip adalah satu baris. Named area memungkinkan perubahan bentuk halaman hanya dengan menyunting satu kelas, dan media query dapat menimpanya:

```html
<div class="grid gap-4 md:[grid-template-areas:'header_header'_'sidebar_main']">…</div>
```

### Subgrid agar Kartu Sejajar

```html
<div class="grid grid-cols-3 gap-6">
  <article class="grid grid-rows-subgrid row-span-3 gap-2 rounded-xl border p-4">
    <h3 class="text-lg font-semibold">Judul</h3>
    <p class="text-sm text-gray-600">Deskripsi dengan panjang yang berbeda-beda.</p>
    <button class="justify-self-start rounded bg-indigo-600 px-3 py-1.5 text-white">Buka</button>
  </article>
</div>
```

Subgrid membuat baris judul, isi, dan tombol tetap sejajar antar kartu meskipun panjang deskripsi berbeda — solusi umum untuk footer kartu yang tampak berantakan.

### Jumlah Kolom Dinamis yang Tetap Ter-generate

```typescript
const COLUMN_CLASS: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6'
};

export function gridColumns(count: number): string {
    const found = COLUMN_CLASS[count];
    if (!found) {
        console.warn(`Jumlah kolom grid tidak didukung: ${count}, memakai nilai 1`);
        return COLUMN_CLASS[1];
    }
    return `${found} gap-6`;
}
```

Template literal seperti `grid-cols-${count}` tidak menghasilkan apa pun karena Tailwind memindai teks source, bukan nilai runtime. Peta statis menjaga semua kelas tetap terlihat oleh scanner dan gagal secara eksplisit alih-alih diam-diam merender grid satu kolom.

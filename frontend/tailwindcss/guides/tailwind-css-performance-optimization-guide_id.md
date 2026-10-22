---
title: "Panduan Optimasi Performa Tailwind CSS"
description: "Panduan praktis menjaga keluaran Tailwind CSS tetap kecil dan cepat: pemindaian konten eksplisit, nama kelas yang aman untuk JIT, safelist minimal, kebersihan CSS layer, dan anggaran ukuran di CI."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Optimasi Performa Tailwind CSS

## Pendahuluan

Keluaran Tailwind adalah CSS hasil generate, sehingga kerja performa sebagian besar adalah tentang apa yang diputuskan compiler untuk dikirim. Proyek yang dikonfigurasi baik mengirim 8–20 KB CSS terkompresi untuk satu aplikasi penuh; proyek yang salah konfigurasi bisa mengirim ratusan kilobyte, sebagian besar untuk kelas yang hanya muncul di mock desain atau komentar. Selisihnya jarang berasal dari framework — melainkan dari deteksi konten, disiplin penamaan kelas, dan cara berkas akhir dibundel serta di-cache.

Panduan ini membahas tuas yang benar-benar mengubah jumlah byte: bagaimana Tailwind v4 menemukan kandidat kelas, mengapa string kelas yang dirakit dinamis diam-diam menghasilkan nol CSS, kapan safelist dibenarkan, bagaimana urutan `@layer` mencegah perang override, dan bagaimana menegakkan anggaran ukuran agar regresi gagal di CI alih-alih di produksi.

## Praktik Terbaik

- **Ukur ukuran gzip, bukan ukuran sumber.** Stylesheet mentah 300 KB bisa menjadi 15 KB di jaringan. Catat ukuran transfer sesuai kompresi server Anda, atau Anda akan mengoptimalkan angka yang salah.
- **Buat sumber konten eksplisit.** Mengandalkan deteksi otomatis di monorepo ikut menarik story, tes, dan dokumentasi. Deklarasikan direktori yang benar-benar merender UI dengan `@source` dan kecualikan sisanya dengan `@source not`.
- **Jangan pernah merakit nama kelas dari potongan.** `` `bg-${color}-500` `` tidak dapat dideteksi karena scanner membaca teks biasa, bukan nilai runtime. Keluarkan string kelas utuh atau petakan ke sana.
- **Safelist secara bedah.** Gunakan `@source inline(...)` untuk kelas yang memang hanya ada di CMS atau basis data. Safelist "untuk berjaga-jaga" membangun kembali masalah yang dulu diselesaikan JIT.
- **Jaga cascade tetap berlapis.** Mendaftarkan `base`, `components`, dan `utilities` secara berurutan membuat utilitas selalu mengalahkan kelas komponen tanpa `!important`, sehingga spesifisitas tetap rendah dan terprediksi.
- **Gunakan `@utility` untuk utilitas kustom.** Kelas tulisan tangan di luar layer utilitas bersaing dengan keluaran Tailwind dan memaksa eskalasi; `@utility` menempatkannya di layer yang benar lengkap dengan dukungan varian.
- **Kirim satu berkas CSS statis.** Hindari Play CDN di produksi: ia mengompilasi di browser, memblokir paint, dan tidak dapat di-cache antar deploy.
- **Cache berdasarkan content hash.** Nama berkas seperti `app.8f3c21.css` dengan header immutable membuat pengunjung berulang tidak melakukan permintaan CSS sama sekali, yang jauh lebih berdampak daripada menghemat satu kilobyte.

## Langkah Implementasi

### Langkah 1: Tetapkan Baseline

Catat ukuran mentah dan gzip serta jumlah selector unik sebelum mengubah apa pun. Sesuatu yang tidak bisa diukur ulang bukanlah optimasi.

```bash
npm run build
CSS=dist/assets/index-*.css
wc -c $CSS
gzip -c $CSS | wc -c
```

### Langkah 2: Deklarasikan Sumber Konten

Arahkan Tailwind ke berkas yang benar-benar merender markup, lalu kecualikan konten hasil generate atau tes. Glob `@source` eksplisit juga membuat ekstensi tidak umum (`.mdx`, `.vue`, `.svelte`) terlihat oleh scanner.

```css
@import "tailwindcss";

@source "../app/**/*.{ts,tsx,mdx}";
@source "../components/**/*.{ts,tsx}";
@source not "../components/**/*.stories.tsx";
@source not "../**/*.test.tsx";
```

Jika paket UI berada di luar root aplikasi, tambahkan melalui path atau gunakan `@source "../../packages/ui"`. Glob yang hilang adalah penyebab paling umum dari "style saya hilang di produksi".

### Langkah 3: Hapus Perakitan Kelas Dinamis

String dinamis tidak terlihat oleh scanner. Ganti interpolasi dengan tabel lookup yang nilainya berupa literal utuh, sehingga setiap kelas ada secara verbatim di berkas sumber.

```typescript
const toneClasses = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
    danger: "bg-rose-50 text-rose-700 ring-rose-600/20",
} as const;

type Tone = keyof typeof toneClasses;

export function Badge({ tone, label }: { tone: Tone; label: string }) {
    const classes = toneClasses[tone];
    if (!classes) {
        throw new Error(`Tone badge tidak dikenal: ${tone}`);
    }
    return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}>{label}</span>;
}
```

Aturan yang sama berlaku untuk props: prop `size` harus memetakan ke `p-2`, `p-4`, `p-6`, bukan `` `p-${size}` ``.

### Langkah 4: Safelist Hanya Konten yang Tidak Bisa Dipindai

Kelas yang disimpan di CMS, feature flag, atau basis data tidak dapat dideteksi. Alih-alih mematikan kebersihan JIT, inline persis kelas yang dipakai, opsional dengan brace expansion untuk matriks kecil.

```css
/* Hanya varian yang dapat dikeluarkan CMS */
@source inline("prose-h2:text-slate-900");
@source inline("{,dark:}bg-{slate,blue}-{50,100}");
```

Setiap pola yang di-safelist adalah CSS yang dibayar semua pengguna, jadi jaga matriks di bawah selusin kombinasi dan tinjau setiap kuartal.

### Langkah 5: Rapikan Layer dan Disiplin Override

Kelas komponen kustom masuk ke `@layer components`, dan helper sekali pakai ke `@utility`. Ini menjaga urutan cascade yang dimaksud dan menghapus godaan menambah `!important` saat gaya komponen menolak ditimpa.

```css
@layer components {
    .card {
        @apply rounded-xl border border-slate-200 bg-white p-6 shadow-sm;
    }
}

@utility text-balance-safe {
    text-wrap: balance;
    max-inline-size: 60ch;
}
```

### Langkah 6: Bundel dan Kompresi dengan Sengaja

Minifikasi dengan Lightning CSS yang sudah termasuk dalam toolchain v4, dan pertahankan stylesheet sebagai satu aset ber-hash yang bisa di-preload. Memecah CSS per route hanya menguntungkan bila antar-route hampir tidak berbagi apa pun.

```json
{
    "scripts": {
        "build": "vite build",
        "build:css": "tailwindcss -i src/style.css -o dist/app.css --minify"
    }
}
```

```html
<link rel="preload" href="/assets/app.8f3c21.css" as="style" />
<link rel="stylesheet" href="/assets/app.8f3c21.css" />
```

### Langkah 7: Tegakkan Anggaran di CI

Anggaran mengubah performa menjadi invarian build. Gagalkan pipeline ketika CSS terkompresi melewati batas yang disepakati, dan cetak selisihnya agar penulis perubahan melihat apa yang ia tambahkan.

```javascript
import { globSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 25;
const files = globSync("dist/assets/*.css");

if (files.length === 0) {
    console.error("Aset CSS tidak ditemukan. Apakah build sudah dijalankan?");
    process.exit(1);
}

const total = files.reduce((sum, file) => sum + statSync(file).size, 0);
const gzipped = files.reduce((sum, file) => sum + gzipSync(readFileSync(file)).length, 0);
const kb = Math.round(gzipped / 1024);

console.log(`CSS: ${files.length} berkas, ${Math.round(total / 1024)} KB mentah, ${kb} KB gzip`);

if (kb > BUDGET_KB) {
    console.error(`Melebihi anggaran: ${kb} KB > ${BUDGET_KB} KB`);
    process.exit(1);
}
```

### Langkah 8: Verifikasi di Browser

Pastikan optimasi bertahan saat bertemu kenyataan: cek bahwa permintaan CSS di-cache dengan header immutable, tidak ada stylesheet pihak ketiga yang memblokir render, dan largest contentful paint tidak mundur pada profil throttled.

```bash
curl -sI https://example.com/assets/app.8f3c21.css | grep -i -E "cache-control|content-encoding"
```

Harapkan `cache-control: public, max-age=31536000, immutable` dan `content-encoding: gzip` atau `br`.

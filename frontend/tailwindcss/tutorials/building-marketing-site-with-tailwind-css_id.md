---
title: "Membangun Situs Marketing dengan Tailwind CSS"
description: "Rancang dan rilis halaman landing marketing lengkap dengan Tailwind CSS v4: hero fluid, CTA yang fokus konversi, grid fitur, animasi scroll, dan mode gelap yang aksesibel."
category: "frontend"
technology: "tailwindcss"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Situs Marketing dengan Tailwind CSS

## Ringkasan

Bangun halaman landing marketing siap produksi dari folder kosong menggunakan Tailwind CSS v4. Anda akan menyusun hero fluid, skala tipografi responsif, CTA yang aksesibel, grid fitur, animasi scroll, dan tombol mode gelap yang tersimpan — tanpa pustaka komponen.

## Target Audiens

- Pengembang frontend yang menguasai HTML/CSS dan ingin proses berulang untuk halaman marketing.
- Pengembang fullstack yang merilis halaman produk sendiri dengan token desain konsisten.

## Prasyarat

- Node.js 20+ dan npm, serta browser dengan DevTools.
- Pemahaman CSS custom property, flexbox, dan grid.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan mampu:

- Menyiapkan Vite + Tailwind v4 dengan lapisan token desain kustom.
- Membangun hero dengan tipografi fluid tanpa override breakpoint.
- Merancang CTA dengan focus state yang terlihat dan semantik ARIA yang benar.
- Menambahkan animasi scroll yang menghormati `prefers-reduced-motion`.
- Menerapkan tombol mode gelap yang tersimpan dengan aman.

## Konteks dan Motivasi

Halaman marketing adalah permukaan dengan trafik tertinggi yang dimiliki banyak tim, tetapi justru paling jarang direkayasa dengan benar. Tim marketing butuh seksi baru setiap minggu, desainer butuh konsistensi, dan setiap dependensi menambah anggaran JavaScript untuk halaman yang tugas utamanya memuat seketika. Tailwind cocok karena sistem desain hidup di markup dan token, bukan di pohon komponen runtime.

Pola kegagalan yang harus dihindari adalah akumulasi: kelas ad-hoc, warna hex sekali pakai, dan tiga gaya tombol di lima seksi berbeda. Perlakukan halaman ini sebagai sistem desain kecil dengan kumpulan token bernama yang sempit.

## Konten Inti

### Menyiapkan Proyek Tailwind v4

Tailwind v4 mengonfigurasi dirinya dari CSS, bukan `tailwind.config.js`, dan plugin Vite resmi menangani deteksi konten sehingga tidak ada array `content` yang perlu dirawat manual.

```bash
npm create vite@latest marketing-site -- --template vanilla
cd marketing-site && npm install
npm install tailwindcss @tailwindcss/vite
```

Daftarkan plugin di `vite.config.js`. Setelah itu stylesheet Anda menjadi satu-satunya sumber kebenaran untuk warna, font, dan skala tampilan fluid.

### Anatomi Hero, Skala Tipografi, dan CTA

Hero punya empat tugas: menyatakan proposisi nilai, menunjukkan bukti, menawarkan satu aksi utama, dan memuat cepat. Gunakan `<section>` semantik dengan satu `<h1>`, paragraf sekitar 65 karakter per baris, dan grup tombol. Teks rata kiri dengan visual di sisi kanan lebih cepat dipindai dan reflow-nya dapat diprediksi.

Alih-alih `text-4xl md:text-5xl lg:text-6xl` di setiap level heading, definisikan langkah fluid sekali dengan `clamp(min, preferred, max)`. Nilai tengah berbasis `vw` membuat ukuran teks tumbuh kontinu, bukan melompat, dan nilai maksimum menjaga ukuran tampilan tetap wajar di monitor ultrawide.

CTA adalah tombol, bukan `<div>` yang diberi gaya: gunakan `<a>` untuk navigasi dan `<button>` untuk aksi di halaman. Kontras label harus mencapai 4.5:1 dan focus ring harus terlihat di atas tombol maupun latar halaman, yang dicapai dengan `focus-visible:ring-2` plus offset. Pertahankan satu aksi utama per viewport; aksi sekunder memakai gaya outline atau ghost.

### Grid Fitur dengan Ritme Konsisten

Gunakan `grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]` agar jumlah kolom menyesuaikan tanpa breakpoint. Beri setiap kartu struktur internal identik (ikon, judul, satu paragraf) dan batasi teks dengan `line-clamp-3`, sehingga panjang teks yang tidak sama tidak merusak baseline visual maupun tinggi kartu.

### Animasi dan Mode Gelap

Animasi seharusnya mengonfirmasi sebab-akibat, bukan sekadar dekorasi: translate-and-fade singkat saat elemen masuk lewat `IntersectionObserver` sudah cukup, dibungkus `motion-safe:`. Detail kritisnya adalah fallback — tambahkan kelas animasi lewat JavaScript, bukan menulis `opacity-0` di HTML, agar konten tetap terlihat ketika JS gagal.

Tailwind v4 memakai `prefers-color-scheme` secara default. Untuk tombol manual, daftarkan varian `dark` yang terikat kelas, terapkan kelas pada `<html>` sebelum paint pertama agar tidak ada kilatan, lalu simpan pilihan di `localStorage`. Nilai simpanan yang tidak ada berarti "ikuti sistem" dan jatuh ke media query.

### Pagar Aksesibilitas

Satu `<h1>` dengan level heading menurun berurutan; gambar dekoratif memakai `alt=""` sementara gambar bermakna mendeskripsikan isi; tautan berikon saja membawa `aria-label` plus teks `sr-only`; target interaktif minimal 44x44 piksel CSS.

## Contoh Kode

Lapisan token dan pendaftaran varian dark di `src/style.css`:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
    --color-brand-500: oklch(0.62 0.19 258);
    --color-brand-600: oklch(0.55 0.2 258);
    --text-display: clamp(2.5rem, 1.5rem + 4.5vw, 4.75rem);
    --text-display--line-height: 1.05;
}
```

Hero dan grid fitur di `index.html`:

```html
<main class="mx-auto max-w-6xl px-6">
    <section class="grid gap-12 py-20 md:grid-cols-2 md:items-center md:py-28">
        <div>
            <h1 class="mt-4 text-display font-semibold text-slate-900 dark:text-white">Kirim API Anda dua kali lebih cepat</h1>
            <p class="mt-6 max-w-prose text-slate-600 dark:text-slate-300">Hasilkan klien bertipe, tes, dan dokumentasi dari satu berkas skema.</p>
            <div class="mt-8 flex flex-wrap items-center gap-4">
                <a href="/signup" class="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none">Mulai gratis</a>
                <a href="#features" class="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">Lihat cara kerjanya</a>
            </div>
        </div>
        <img src="/hero-dashboard.png" width="960" height="720" loading="eager" alt="Dashboard menampilkan kode klien hasil generate dan tes yang lulus" class="w-full rounded-2xl border border-slate-200 shadow-2xl dark:border-slate-800" />
    </section>
    <section id="features" class="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-6 pb-24">
        <article class="rounded-xl border border-slate-200 p-6 dark:border-slate-800">
            <h2 class="font-semibold text-slate-900 dark:text-white">Bertipe secara default</h2>
            <p class="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">Setiap endpoint menjadi fungsi bertipe dengan bentuk request dan response yang terinferensi.</p>
        </article>
    </section>
</main>
```

Tombol tema dan animasi reveal di `src/main.js`:

```javascript
const root = document.documentElement;
const stored = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
if (stored === "dark" || (stored === null && prefersDark)) root.classList.add("dark");

document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
    const isDark = root.classList.toggle("dark");
    try {
        localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch (error) {
        console.warn("Preferensi tema tidak dapat disimpan", error);
    }
});

const targets = document.querySelectorAll("[data-reveal]");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("opacity-100"));
} else {
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.replace("opacity-0", "opacity-100");
            observer.unobserve(entry.target);
        }
    }, { threshold: 0.15 });
    targets.forEach((el) => {
        el.classList.add("opacity-0", "transition-opacity", "duration-500");
        observer.observe(el);
    });
}
```

## Insight Penting

- Letakkan penjaga kilatan tema di `<script>` inline pada `<head>`; skrip module berjalan setelah paint dan pengguna melihat kilatan putih.
- Perluas tema lewat `@theme`, jangan menebar `text-[#3b82f6]`; satu penggantian nama token langsung memperbarui seluruh halaman.
- `focus-visible` hanya aktif untuk pengguna keyboard; `focus` juga terpicu saat klik mouse dan menyisakan cincin yang mengganggu. Gambar di atas fold butuh `width`/`height` eksplisit.

## Langkah Berikutnya

- Baca panduan optimasi performa Tailwind CSS untuk memangkas stylesheet yang dikirim.
- Pelajari silabus accessibility engineering untuk alur audit dan pengujian screen reader.

## Kesimpulan

Anda kini memiliki halaman marketing yang dibangun dari lapisan token bernama, bukan tumpukan utilitas sekali pakai. Tipografi fluid menggantikan tangga breakpoint, CTA dan focus style aksesibel sejak awal, grid fitur menyesuaikan tanpa media query, dan tombol tema terhindar dari kilatan maupun kegagalan penyimpanan. Kerangka yang sama bisa diperluas ke tabel harga, testimoni, dan FAQ tanpa token baru.

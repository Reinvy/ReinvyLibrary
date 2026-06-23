---
title: "Silabus Tailwind CSS"
description: "Silabus komprehensif 12 minggu untuk mempelajari Tailwind CSS — dari fundamental utility-first dan konfigurasi hingga desain responsif, tema kustom, ekstraksi komponen, integrasi framework, dan optimasi produksi."
category: "frontend"
technology: "tailwindcss"
difficulty: "beginner"
type: "syllabus"
locale: "id"
---

# Silabus Tailwind CSS

## Ringkasan

Tailwind CSS telah menjadi salah satu framework CSS paling populer dalam pengembangan web modern dengan memperkenalkan pendekatan utility-first yang mengutamakan komposabilitas, konsistensi, dan iterasi cepat. Tidak seperti framework CSS tradisional yang menawarkan komponen siap pakai, Tailwind menyediakan kelas utilitas tingkat rendah yang memungkinkan Anda membangun desain kustom langsung di markup Anda.

Silabus 12 minggu ini menyediakan jalur pembelajaran terstruktur dari pemula absolut hingga pengembang Tailwind yang siap produksi. Dimulai dari fundamental paradigma utility-first dan berlanjut melalui desain responsif, tema kustom, ekstraksi komponen, pengembangan plugin, integrasi framework, dan optimasi produksi tingkat lanjut. Setiap modul dibangun di atas modul sebelumnya, menggabungkan pembelajaran konseptual dengan latihan langsung dan proyek dunia nyata. Di akhir kursus, peserta akan menyelesaikan proyek capstone berupa halaman landing enterprise dengan sistem desain responsif penuh, menunjukkan kemahiran di setiap aspek utama Tailwind CSS.

## Kurikulum

### Minggu 1: Fundamental Utility-First CSS
- **Memahami Paradigma Utility-First**
  - Apa itu utility-first CSS dan perbedaannya dengan CSS semantik
  - Perbandingan dengan Bootstrap, Bulma, dan pendekatan CSS vanilla
  - Keuntungan: komposabilitas, konsistensi, tanpa konvensi penamaan
- **Instalasi dan Pengaturan**
  - Menginstal Tailwind melalui npm, CDN, dan Play CDN
  - Scaffolding proyek dan struktur direktori
  - Direktif `@tailwind`: `base`, `components`, `utilities`
- **Langkah Pertama dengan Kelas Utilitas**
  - Utilitas tipografi: `text-*`, `font-*`, `leading-*`, `tracking-*`
  - Utilitas spasi: `p-*`, `m-*`, `space-*`
  - Utilitas latar belakang dan border
- **Latihan**: Membuat ulang komponen kartu sederhana hanya menggunakan kelas utilitas

### Minggu 2: CLI Tailwind dan Workflow Build
- **Pendalaman CLI Tailwind**
  - Instalasi dan konfigurasi dengan `npx tailwindcss init`
  - Pipeline file input/output dan mode watch
  - Path konten dan konfigurasi purge
- **Integrasi PostCSS**
  - Menggunakan Tailwind sebagai plugin PostCSS
  - Menggabungkan dengan Autoprefixer dan plugin PostCSS lainnya
  - Pengaturan dengan bundler populer (Vite, Webpack, Parcel)
- **Build Produksi**
  - Minifikasi dan tree-shaking
  - Flag `--minify` dan optimasi output
- **Latihan**: Konfigurasi pipeline build lengkap dengan Vite + Tailwind

### Minggu 3: Sistem Tipografi dan Spasi
- **Sistem Tipografi**
  - Utilitas font family dan ukuran (`font-sans`, `font-mono`, `text-xs` hingga `text-9xl`)
  - Berat font, tinggi baris, dan letter spacing
  - Utilitas perataan, dekorasi, dan transformasi teks
  - Plugin `@tailwindcss/typography` untuk konten prosa
- **Sistem Spasi**
  - Memahami skala spasi (kenaikan 0.25rem)
  - Padding dan margin: sisi individu, sumbu, dan varian responsif
  - Spasi antar anak dengan `space-*`
- **Latihan**: Menata halaman artikel blog menggunakan utilitas tipografi dan spasi

### Minggu 4: Desain Responsif dengan Breakpoint dan Container Queries
- **Sistem Breakpoint Responsif**
  - Breakpoint default: `sm`, `md`, `lg`, `xl`, `2xl`
  - Desain responsif berbasis prefiks: `md:text-center`, `lg:flex`
  - Breakpoint kustom via `theme.extend.screens`
- **Pola Container dan Layout**
  - Kelas `container` dan perataan tengah
  - Pola padding responsif untuk layout edge-to-edge
- **Container Queries**
  - Plugin `@tailwindcss/container-queries`
  - Prefiks `@sm:`, `@md:`, `@lg:` untuk responsivitas berbasis container
  - Kapan menggunakan container queries vs breakpoint queries
- **Latihan**: Membangun layout dashboard responsif yang beradaptasi di setiap breakpoint

### Minggu 5: Sistem Layout Flexbox dan Grid
- **Utilitas Flexbox**
  - `flex`, `flex-row`, `flex-col` dan kontrol arah
  - Perataan: `justify-*`, `items-*`, `content-*`, `self-*`
  - Pembungkusan flex, grow, shrink dengan `flex-*`, `grow`, `shrink`
  - Utilitas gap untuk layout flex dan grid
- **Utilitas Grid**
  - `grid`, `grid-cols-*`, `grid-rows-*` template layout
  - Span kolom dan baris dengan `col-span-*`, `row-span-*`
  - Auto-fit dan auto-fill dengan `grid-cols-auto-*`
  - Area template grid dan garis grid bernama
- **Latihan**: Membuat grid produk responsif yang bertransisi dari 1 ke 4 kolom

### Minggu 6: Tema Kustom dan Konfigurasi
- **Arsitektur Konfigurasi Tailwind**
  - Struktur `tailwind.config.js`: `theme`, `plugins`, `content`, `darkMode`
  - Menggunakan `theme.extend` untuk menambah nilai kustom tanpa kehilangan default
  - Override vs extend token desain
- **Strategi Token Desain**
  - Palet warna: penamaan semantik (`primary`, `danger`) vs penamaan visual (`blue-500`)
  - Skala spasi kustom, font family, dan border radius
  - Variabel CSS untuk theming dinamis lintas penyewa atau produk white-label
- **Direktif `@apply`**
  - Mengekstrak pola utilitas ke dalam kelas CSS kustom
  - Praktik terbaik dan jebakan penggunaan `@apply`
  - Kapan menggunakan `@apply` vs abstraksi komponen JS
- **Latihan**: Konfigurasi sistem desain brand lengkap dengan warna, font, dan spasi kustom

### Minggu 7: Arsitektur Dark Mode
- **Strategi Dark Mode**
  - Dark mode berbasis kelas (`darkMode: 'class'`)
  - Dark mode berbasis media query (`darkMode: 'media'`)
  - Implementasi toggle dengan JavaScript atau state framework
- **Utilitas Dark Mode**
  - Prefiks varian `dark:`
  - Dark mode untuk latar belakang, teks, border, dan bayangan
  - Menggabungkan dark mode dengan varian responsif dan state
- **Dark Mode Persisten**
  - Menyimpan preferensi dengan `localStorage`
  - Mencegah flash tema yang salah dengan script inline
- **Latihan**: Menambahkan dukungan dark mode ke situs marketing multi-halaman

### Minggu 8: Strategi Ekstraksi Komponen
- **Kapan Mengekstrak Komponen**
  - Aturan Tiga: ketika pola utilitas berulang tiga kali
  - Menyeimbangkan keterbacaan markup dengan abstraksi komponen
- **Pendekatan Ekstraksi**
  - Komponen JS/React (lebih disukai untuk sebagian besar proyek)
  - Direktif `@apply` dengan `@layer components`
  - `@layer utilities` untuk kelas utilitas kustom
  - Potongan HTML yang dapat digunakan kembali dengan partials/include
- **Pustaka Pola dan Sistem Desain**
  - Membangun pustaka komponen dengan Tailwind
  - Dokumentasi dengan Storybook atau Histoire
  - Versi dan distribusi token desain
- **Latihan**: Mengekstrak sistem komponen tombol dengan varian (primary, secondary, ghost, ukuran)

### Minggu 9: Pengembangan Plugin Kustom
- **Arsitektur Plugin**
  - Fungsi `plugin()` dan API-nya
  - Mendaftarkan utilitas baru dengan `addUtilities`
  - Mendaftarkan komponen baru dengan `addComponents`
  - Menambahkan gaya dasar baru dengan `addBase`
- **Varian Plugin**
  - Membuat modifier varian kustom
  - API `addVariant` untuk utilitas berbasis state
- **Plugin Resmi**
  - `@tailwindcss/forms`: reset dan gaya elemen form
  - `@tailwindcss/typography`: styling konten prosa
  - `@tailwindcss/aspect-ratio`: utilitas rasio aspek
  - `@tailwindcss/container-queries`: dukungan container query
- **Latihan**: Membangun plugin Tailwind kustom yang menambahkan utilitas animasi untuk pustaka mikro-interaksi

### Minggu 10: Integrasi Framework (Next.js, Vue.js, React)
- **Integrasi Next.js**
  - Menyiapkan Tailwind dengan Next.js 14+
  - Menggunakan `clsx` dan `tailwind-merge` untuk kelas kondisional
  - Pertimbangan styling Server Components vs Client Components
  - Alternatif CSS-in-JS dan kompatibilitas Tailwind
- **Integrasi Vue.js**
  - Tailwind dengan Vue 3 dan Vite
  - Binding kelas dengan array dan objek `:class`
  - Interaksi gaya scoped dan Tailwind
- **React dan CRA / Vite**
  - Tailwind dengan template Vite React
  - Props komponen sebagai pembangun kelas Tailwind
  - Perbandingan styled components vs Tailwind
- **React Native dengan NativeWind**
  - Utilitas mirip Tailwind untuk React Native
  - Styling spesifik platform dengan varian NativeWind
- **Latihan**: Membangun komponen kartu yang sama di Next.js, Vue, dan React Native menggunakan Tailwind/NativeWind

### Minggu 11: Strategi Testing untuk Utility-First CSS
- **Visual Regression Testing**
  - Menyiapkan Percy atau Chromatic untuk snapshot testing komponen
  - Integrasi Storybook untuk diffing visual
  - Tes visual spesifik breakpoint
- **Playwright dan E2E Testing**
  - Menguji layout responsif di berbagai ukuran viewport
  - Verifikasi toggle dark mode
  - Pengujian aksesibilitas dengan axe-core
- **Linting dan Kualitas Kode**
  - `eslint-plugin-tailwindcss` untuk urutan kelas dan konflik
  - `prettier-plugin-tailwindcss` untuk pengurutan kelas otomatis
  - Validasi pola kelas kustom
- **Latihan**: Menyiapkan pipeline testing lengkap dengan visual regression, E2E, dan linting

### Minggu 12: Optimasi Produksi dan Proyek Capstone
- **Optimasi Kinerja**
  - Tree-shaking gaya yang tidak terpakai dengan content paths
  - Pola content path eksplisit untuk purge maksimal
  - Manajemen safelist untuk kelas yang dibangun secara dinamis
  - Monitoring dan budgeting ukuran bundle CSS
- **Ekstraksi CSS Kritis**
  - Inline CSS kritis untuk konten di atas lipatan
  - Alat dan plugin untuk generasi CSS kritis
- **CDN dan Edge Deployment**
  - Tailwind di edge runtime (Cloudflare Workers, Vercel Edge)
  - Tailwind berbasis CDN untuk situs statis
- **Proyek Capstone**: Membangun halaman landing enterprise dengan:
  - Sistem desain responsif penuh
  - Dark mode dengan persistensi preferensi pengguna
  - Plugin kustom untuk utilitas animasi yang dapat digunakan kembali
  - Integrasi framework (Next.js, Vue, atau React)
  - Build produksi dengan bundle CSS yang dioptimalkan
  - Rangkaian tes visual regression

## Proyek Akhir

Proyek capstone adalah halaman landing enterprise yang menunjukkan kemahiran di semua aspek Tailwind CSS. Peserta akan membangun situs marketing multi-halaman dengan sistem desain responsif lengkap, theming kustom, dark mode, ekstraksi komponen yang dapat digunakan kembali, integrasi framework, dan pipeline build yang dioptimalkan untuk produksi.

Hasil kerja utama:
1. **Konfigurasi Sistem Desain**: `tailwind.config.js` dengan token brand kustom (warna, tipografi, spasi) menggunakan `theme.extend`, penamaan warna semantik, dan integrasi variabel CSS untuk theming dinamis
2. **Layout Responsif**: Halaman landing multi-bagian yang responsif penuh (hero, fitur, harga, testimoni, footer) yang beradaptasi di semua breakpoint menggunakan prefiks responsif dan container queries
3. **Pustaka Komponen**: Kumpulan komponen yang dapat digunakan kembali (Button, Card, Navbar, Modal, Input Form) yang diekstrak menggunakan model komponen framework pilihan, dengan props varian yang tepat dan manajemen kelas kondisional menggunakan `clsx`/`tailwind-merge`
4. **Dark Mode**: Dukungan dark mode penuh dengan persistensi preferensi pengguna di `localStorage`, mencegah flash tema yang salah
5. **Plugin Kustom**: Setidaknya satu plugin Tailwind kustom yang menambahkan kelas utilitas atau varian baru (misalnya utilitas animasi, varian berbasis scroll, state form kustom)
6. **Testing dan Kualitas**: Tes visual regression untuk komponen kunci, ESLint dengan `eslint-plugin-tailwindcss`, dan Prettier dengan `prettier-plugin-tailwindcss`
7. **Build Produksi**: Bundle CSS yang dioptimalkan dengan content paths yang benar, entri safelist untuk kelas dinamis, dan critical CSS inlining untuk konten di atas lipatan

## Kriteria Penilaian

- **Tugas Mingguan (30%)**: Setiap minggu mencakup latihan langsung yang memperkuat konsep modul. Latihan dievaluasi berdasarkan kebenaran, kepatuhan terhadap praktik terbaik Tailwind, dan responsivitas.
- **Kuis Modul (20%)**: Kuis singkat di akhir minggu 3, 6, dan 9 menguji pemahaman konseptual tentang sistem spasi, arsitektur konfigurasi, dan pengembangan plugin.
- **Proyek Pustaka Komponen (20%)**: Proyek tengah kursus (minggu 7–8) untuk merancang dan membangun pustaka komponen yang dapat digunakan kembali. Dinilai berdasarkan desain komponen, kualitas dokumentasi, dan keputusan strategi ekstraksi.
- **Proyek Capstone Akhir (30%)**: Proyek halaman landing enterprise dievaluasi berdasarkan kualitas sistem desain, implementasi responsif, arsitektur dark mode, desain plugin, optimasi produksi, dan cakupan tes.

## Referensi

- [Dokumentasi Resmi Tailwind CSS](https://tailwindcss.com/docs)
- [Repositori GitHub Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)
- [Tailwind CSS Play](https://play.tailwindcss.com/) — Playground online untuk eksperimen
- [Tailwind UI](https://tailwindui.com/) — Template komponen resmi
- [Tailwind Elements](https://tailwind-elements.com/) — Pustaka komponen gratis
- [Tailwind Cheat Sheet (Tidak Resmi)](https://nerdcave.com/tailwind-cheat-sheet)
- [Awesome Tailwind CSS](https://github.com/aniftyco/awesome-tailwindcss) — Sumber daya terkurasi
- [Refactoring UI oleh Adam Wathan & Steve Schoger](https://refactoringui.com/) — Buku prinsip desain oleh kreator Tailwind
- [Panduan Praktik Terbaik Tailwind CSS (ReinvyLibrary)](../guides/tailwind-css-best-practices-guide_id.md)
- [Lembar Cheat Tailwind CSS (ReinvyLibrary)](../cheatsheets/tailwind-css-cheatsheet_id.md)

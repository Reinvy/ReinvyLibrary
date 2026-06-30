---
title: "Membangun Landing Page Responsif dengan Tailwind CSS"
description: "Tutorial berbasis proyek tentang membangun landing page pemasaran yang lengkap dan responsif menggunakan Tailwind CSS — mencakup layout, tipografi, mode gelap, animasi, dan optimasi produksi."
category: "frontend"
technology: "tailwindcss"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Membangun Landing Page Responsif dengan Tailwind CSS

## Ringkasan

Dalam tutorial berbasis proyek ini, Anda akan membangun landing page pemasaran yang lengkap dari awal menggunakan Tailwind CSS. Mulai dari penyiapan proyek dengan Tailwind CLI, Anda akan membuat komponen dunia nyata — bilah navigasi, bagian hero, grid fitur, kartu harga, testimoni, akordeon FAQ, dan footer — sambil mempelajari pola desain responsif, tema mode gelap, animasi hover dan fokus, serta optimasi build produksi. Pada akhirnya, Anda akan memiliki landing page yang siap di-deploy dan alur kerja yang dapat digunakan kembali untuk membangun proyek Tailwind.

## Target Audiens

- Pengembang frontend dan desainer yang memahami dasar-dasar HTML dan CSS dan ingin belajar Tailwind CSS melalui proyek praktis.
- Pemula Tailwind CSS yang telah menyelesaikan tutorial fundamental dan ingin menerapkan keterampilan tersebut.
- Siapa pun yang ingin membangun halaman pemasaran yang cepat dan responsif tanpa menulis CSS kustom.

## Prasyarat

- Pengetahuan dasar HTML (tag, atribut, nama kelas).
- Keakraban dengan konsep CSS seperti flexbox dan grid (pemahaman konseptual sudah cukup).
- Node.js 16+ dan npm terinstal di komputer Anda.
- Editor kode (VS Code direkomendasikan).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membangun proyek Tailwind CSS menggunakan Tailwind CLI dengan konfigurasi kustom.
- Membangun layout responsif menggunakan kelas utilitas Tailwind dan prefiks breakpoint (`sm`, `md`, `lg`, `xl`).
- Menerapkan utilitas tipografi, spasi, warna, dan latar belakang untuk membuat komponen UI yang rapi.
- Mengimplementasikan mode gelap menggunakan strategi `class` Tailwind.
- Menambahkan animasi dan transisi berbasis hover, fokus, dan grup tanpa menulis CSS kustom.
- Mengoptimalkan build akhir untuk produksi menggunakan mekanisme pemurrian Tailwind.

## Konteks dan Motivasi

Landing page pemasaran adalah salah satu proyek pengembangan web yang paling umum. Baik Anda meluncurkan produk SaaS, aplikasi seluler, atau portofolio pribadi, landing page adalah kesan pertama yang dilihat pengunjung tentang karya Anda. Membangunnya dari awal dengan CSS mentah bisa memakan waktu — mengelola breakpoint responsif, spasi yang konsisten, skema warna, dan mode gelap di puluhan komponen dengan cepat menjadi berulang.

Tailwind CSS memecahkan masalah ini dengan menyediakan kelas utilitas tingkat rendah yang memungkinkan Anda menyusun desain langsung di HTML Anda. Alih-alih beralih antara file HTML dan file CSS, Anda membangun semuanya di satu tempat. Hasilnya adalah iterasi yang lebih cepat, desain yang lebih konsisten, dan bundel CSS yang lebih kecil di produksi.

Dalam proyek ini, Anda akan membangun landing page untuk produk SaaS fiksi bernama "FlowBoard" — alat manajemen proyek. Keterampilan yang Anda pelajari di sini berlaku langsung ke situs pemasaran, portofolio, atau landing page produk apa pun.

## Konten Inti

### Penyiapan Proyek dengan Tailwind CLI

Mulailah dengan membuat direktori proyek baru dan menginisialisasinya dengan npm:

```bash
mkdir flowboard-landing
cd flowboard-landing
npm init -y
```

Instal Tailwind CSS, PostCSS, dan Tailwind CLI sebagai dependensi pengembangan:

```bash
npm install -D tailwindcss @tailwindcss/cli
```

Buat file CSS input utama di `src/input.css`:

```css
@import "tailwindcss";
```

Buat file `tailwind.config.js` untuk mengaktifkan mode gelap melalui strategi `class`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./*.html', './src/**/*.html'],
};
```

Buat file `index.html` dan hubungkan langkah build di `package.json`:

```json
"scripts": {
  "dev": "tailwindcss -i src/input.css -o src/output.css --watch",
  "build": "tailwindcss -i src/input.css -o src/output.css --minify"
}
```

Jalankan `npm run dev` untuk memulai Tailwind CLI dalam mode pantau. Setiap kali Anda menyimpan file HTML, CSS output akan dibuat ulang hanya dengan kelas yang Anda gunakan.

### Struktur Dokumen HTML

Buat kerangka HTML dasar di `index.html`. Keputusan utamanya adalah kelas `dark` pada elemen `<html>` — Anda akan mengalihkannya secara terprogram dengan JavaScript nanti.

```html
<!DOCTYPE html>
<html lang="id" class="">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FlowBoard — Manajemen Proyek, Disederhanakan</title>
  <link rel="stylesheet" href="src/output.css" />
</head>
<body class="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased transition-colors duration-300">

  <!-- Semua konten halaman di sini -->

  <script src="src/main.js"></script>
</body>
</html>
```

`transition-colors duration-300` pada `<body>` memastikan transisi warna yang halus saat mengganti mode gelap.

### Membangun Bilah Navigasi

Bilah navigasi mencakup logo, tautan navigasi utama, tombol pengalih mode gelap, dan tombol ajakan bertindak (CTA). Di perangkat seluler, semuanya disembunyikan di balik menu hamburger.

```html
<!-- Navigasi -->
<nav class="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <a href="#" class="flex items-center gap-2">
        <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-sm">F</span>
        </div>
        <span class="font-bold text-xl">FlowBoard</span>
      </a>

      <!-- Tautan Nav Desktop -->
      <div class="hidden md:flex items-center gap-8">
        <a href="#features" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Fitur</a>
        <a href="#pricing" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Harga</a>
        <a href="#testimonials" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Testimoni</a>
        <a href="#faq" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">FAQ</a>
      </div>

      <!-- Sisi kanan: Pengalih mode gelap + CTA -->
      <div class="flex items-center gap-4">
        <button id="dark-toggle" class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Alihkan mode gelap">
          <!-- Ikon matahari (ditampilkan dalam mode gelap) -->
          <svg id="sun-icon" class="hidden dark:block w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          <!-- Ikon bulan (ditampilkan dalam mode terang) -->
          <svg id="moon-icon" class="block dark:hidden w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        </button>
        <a href="#" class="hidden sm:inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Mulai Gratis</a>
      </div>

      <!-- Hamburger seluler -->
      <button id="menu-toggle" class="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Alihkan menu">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
    </div>
  </div>

  <!-- Menu Seluler (tersembunyi secara default) -->
  <div id="mobile-menu" class="hidden md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
    <div class="px-4 py-4 space-y-3">
      <a href="#features" class="block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600">Fitur</a>
      <a href="#pricing" class="block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600">Harga</a>
      <a href="#testimonials" class="block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600">Testimoni</a>
      <a href="#faq" class="block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600">FAQ</a>
      <a href="#" class="block text-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg">Mulai Gratis</a>
    </div>
  </div>
</nav>
```

Pola Tailwind utama yang digunakan di sini:

- **`fixed top-0 left-0 right-0 z-50`** — menempelkan navbar ke atas dengan z-index tinggi sehingga melayang di atas konten lain.
- **`bg-white/80 backdrop-blur-md`** — latar belakang semi-transparan dengan efek buram, menciptakan tampilan "kaca buram" modern.
- **`dark:bg-gray-950/80 dark:border-gray-800`** — varian mode gelap untuk setiap warna latar belakang dan batas.
- **`hidden md:flex`** — menyembunyikan tautan navigasi desktop di perangkat seluler, menampilkannya dari breakpoint `md` (768px) ke atas.
- **`hidden sm:inline-flex`** — menyembunyikan tombol CTA di layar ekstra kecil.
- **`md:hidden`** — menampilkan hamburger hanya di perangkat seluler.
- **`hover:text-indigo-600`** dan **`transition-colors`** — perubahan warna saat hover dengan transisi halus.

### Bagian Hero dengan Latar Belakang Gradien

Bagian hero adalah hal pertama yang dilihat pengunjung. Bagian ini harus mengomunikasikan proposisi nilai produk dengan jelas melalui judul, subteks, tombol CTA, dan elemen visual.

```html
<!-- Bagian Hero -->
<section class="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    <div class="text-center max-w-4xl mx-auto">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-full mb-6">
        <span class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
        Baru: Saran tugas bertenaga AI
      </div>
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
        Manajemen Proyek,
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Disederhanakan.</span>
      </h1>
      <p class="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        FlowBoard menyatukan tugas, jadwal, dan komunikasi tim Anda ke dalam satu dashboard yang indah. Berhenti berpindah-pindah alat — mulailah mengirimkan hasil.
      </p>
      <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="#" class="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all duration-200 text-center">
          Mulai Uji Coba Gratis
        </a>
        <a href="#" class="w-full sm:w-auto px-8 py-3.5 border border-gray-300 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all duration-200 text-center">
          Tonton Demo
        </a>
      </div>
    </div>

    <!-- Visual hero / pratinjau dashboard -->
    <div class="mt-16 relative max-w-5xl mx-auto">
      <div class="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-950 via-transparent to-transparent z-10 pointer-events-none"></div>
      <div class="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl">
        <img src="https://placehold.co/1200x675/e2e8f0/475569?text=Pratinjau+Dashboard" alt="Pratinjau dashboard FlowBoard" class="w-full" />
      </div>
    </div>
  </div>
</section>
```

Teknik yang perlu diperhatikan:

- **`text-transparent bg-clip-text bg-gradient-to-r`** — membuat efek teks gradien untuk kata yang ditekankan.
- **`shadow-lg shadow-indigo-600/25`** — bayangan berwarna yang cocok dengan warna merek dengan opasitas.
- **`animate-pulse`** — animasi detak bawaan Tailwind untuk titik badge "langsung".
- **`bg-gradient-to-t from-white via-transparent to-transparent`** — overlay gradien pada gambar dashboard untuk menciptakan kedalaman.
- **`tracking-tight`** — spasi huruf yang lebih rapat untuk judul, praktik desain yang umum.

### Bagian Fitur dengan Kartu Ikon

Bagian fitur menampilkan poin penjualan utama produk menggunakan grid kartu yang responsif.

```html
<!-- Bagian Fitur -->
<section id="features" class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
        Semua yang Anda butuhkan untuk mengirimkan lebih cepat
      </h2>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        FlowBoard menggabungkan manajemen tugas, kolaborasi real-time, dan pelaporan dalam satu pengalaman yang mulus.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <!-- Kartu Fitur 1 -->
      <div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200">
        <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Manajemen Tugas</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Buat, tetapkan, dan prioritaskan tugas dengan papan kanban drag-and-drop. Tetapkan tanggal jatuh tempo dan dependensi.</p>
      </div>

      <!-- Kartu Fitur 2 -->
      <div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200">
        <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Kolaborasi Tim</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Komentar real-time, @sebutan, dan umpan aktivitas menjaga semua orang tetap selaras tanpa utas surel yang tak ada habisnya.</p>
      </div>

      <!-- Kartu Fitur 3 -->
      <div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200">
        <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Analitik & Laporan</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Lacak kecepatan, burndown, dan cycle time dengan dashboard yang dapat disesuaikan. Ekspor laporan untuk pemangku kepentingan.</p>
      </div>

      <!-- Kartu Fitur 4 -->
      <div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200">
        <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Jadwal & Peta Jalan</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Jadwal proyek visual dengan tampilan bergaya Gantt. Rencanakan sprint dan petakan dependensi antar tim.</p>
      </div>

      <!-- Kartu Fitur 5 -->
      <div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200">
        <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Keamanan Perusahaan</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Kepatuhan SOC 2, integrasi SSO, kontrol akses berbasis peran yang terperinci, dan pencatatan audit.</p>
      </div>

      <!-- Kartu Fitur 6 -->
      <div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200">
        <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Berbagi File</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Unggah file drag-and-drop dengan pratinjau, riwayat versi, dan integrasi dengan Google Drive serta Dropbox.</p>
      </div>
    </div>
  </div>
</section>
```

Pola utama:

- **`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`** — grid responsif dari 1 kolom di seluler menjadi 3 di desktop.
- **`group` dan `group-hover:scale-110`** — kelas `group` pada induk memungkinkan anak merespons status hover induk, memungkinkan ikon membesar saat kartu di-hover.
- **`shadow-sm hover:shadow-lg hover:shadow-indigo-600/5`** — elevasi bayangan halus saat hover dengan warna merek.
- **`hover:border-indigo-600`** — perubahan warna batas saat hover kartu untuk status interaktif yang jelas.

### Bagian Harga dengan Kartu Berjenjang

Bagian harga memungkinkan pengunjung membandingkan paket sekilas. Menyoroti paket "paling populer" dengan perlakuan visual berbeda mendorong konversi.

```html
<!-- Bagian Harga -->
<section id="pricing" class="py-20 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
        Harga sederhana dan transparan
      </h2>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
        Mulai gratis, tingkatkan saat Anda berkembang. Tanpa biaya tersembunyi.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      <!-- Paket Starter -->
      <div class="p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Starter</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Untuk tim kecil yang baru memulai.</p>
        <div class="mt-6">
          <span class="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
          <span class="text-gray-500 dark:text-gray-400">/bulan</span>
        </div>
        <ul class="mt-6 space-y-3">
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Hingga 5 anggota tim
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            3 proyek aktif
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Papan kanban dasar
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Dukungan komunitas
          </li>
        </ul>
        <a href="#" class="mt-8 block text-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:border-indigo-600 dark:hover:border-indigo-500 transition-colors">Mulai</a>
      </div>

      <!-- Paket Pro (Paling Populer) -->
      <div class="relative p-8 bg-white dark:bg-gray-800 rounded-2xl border-2 border-indigo-600 dark:border-indigo-500 shadow-xl shadow-indigo-600/10 scale-105">
        <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full uppercase tracking-wider">Paling Populer</div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Pro</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Untuk tim yang berkembang dan pengguna power.</p>
        <div class="mt-6">
          <span class="text-4xl font-bold text-gray-900 dark:text-white">$29</span>
          <span class="text-gray-500 dark:text-gray-400">/bulan</span>
        </div>
        <ul class="mt-6 space-y-3">
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Anggota tim tak terbatas
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Proyek tak terbatas
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Tampilan jadwal & Gantt
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Dukungan prioritas
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Akses API & webhook
          </li>
        </ul>
        <a href="#" class="mt-8 block text-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200">Mulai Uji Coba Gratis</a>
      </div>

      <!-- Paket Enterprise -->
      <div class="p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Enterprise</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Untuk organisasi dengan kebutuhan lanjutan.</p>
        <div class="mt-6">
          <span class="text-4xl font-bold text-gray-900 dark:text-white">$99</span>
          <span class="text-gray-500 dark:text-gray-400">/bulan</span>
        </div>
        <ul class="mt-6 space-y-3">
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Semua fitur Pro
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            SSO & SAML
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Log audit & kepatuhan
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Manajer akun khusus
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Integrasi kustom
          </li>
        </ul>
        <a href="#" class="mt-8 block text-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:border-indigo-600 dark:hover:border-indigo-500 transition-colors">Hubungi Penjualan</a>
      </div>
    </div>
  </div>
</section>
```

Keputusan desain:

- **`border-2 border-indigo-600 scale-105`** — kartu "paling populer" memiliki batas warna merek yang lebih tebal dan sedikit lebih besar, secara alami menarik perhatian.
- **`absolute -top-3.5 left-1/2 -translate-x-1/2`** — badge diposisikan untuk menimpa batas kartu, menciptakan jangkar visual yang rapi.
- **`uppercase tracking-wider`** — teks badge menggunakan huruf kapital dengan spasi huruf yang ditingkatkan untuk tampilan premium.

### Bagian Testimoni

Bukti sosial membangun kepercayaan. Bagian ini menggunakan grid sederhana dengan avatar, kutipan, dan atribusi.

```html
<!-- Bagian Testimoni -->
<section id="testimonials" class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
        Dicintai oleh tim di seluruh dunia
      </h2>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
        Lihat apa yang pelanggan kami katakan tentang FlowBoard.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex gap-1 mb-4">
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        </div>
        <p class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
          "FlowBoard mengubah cara tim remote kami berkolaborasi. Kami beralih dari pesan Slack dan spreadsheet yang tersebar menjadi satu sumber kebenaran. Papan kanban-nya sangat intuitif."
        </p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">SK</div>
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">Sarah Kim</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">CTO, Lighthouse Studio</p>
          </div>
        </div>
      </div>

      <div class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex gap-1 mb-4">
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        </div>
        <p class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
          "Tampilan jadwal dan Gantt saja sudah sepadan dengan harganya. Kami mengelola belasan proyek bersamaan dan FlowBoard memberi kami kejelasan yang tidak pernah kami dapatkan dengan alat lama."
        </p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-semibold">MR</div>
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">Marcus Rivera</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Direktur PMO, BuildForge Inc.</p>
          </div>
        </div>
      </div>

      <div class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex gap-1 mb-4">
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        </div>
        <p class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
          "Sebagai desainer lepas, FlowBoard membantu saya menjaga proyek klien tetap terorganisir tanpa kerumitan alat enterprise. Berbagi file dan riwayat versi adalah pengubah permainan."
        </p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-semibold">AL</div>
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">Aiko Lopez</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Desainer Independen</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

Peringkat bintang menggunakan pola SVG berulang. Perhatikan bahwa `fill="currentColor"` Tailwind dengan `text-yellow-400` mewarnai bintang tanpa memerlukan fill SVG terpisah. Setiap kartu testimoni mandiri dengan pola avatar yang konsisten menggunakan latar belakang gradien.

### Bagian FAQ dengan Akordeon Interaktif

Bagian FAQ menyajikan pertanyaan umum. Interaksi akordeon menggunakan JavaScript vanilla.

```html
<!-- Bagian FAQ -->
<section id="faq" class="py-20 px-4 sm:px-6 lg:px-8">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
        Pertanyaan yang sering diajukan
      </h2>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
        Semua yang perlu Anda ketahui tentang FlowBoard.
      </p>
    </div>

    <div class="space-y-4">
      <!-- Item FAQ 1 -->
      <div class="faq-item border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button class="faq-question w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span>Bisakah saya mencoba FlowBoard secara gratis?</span>
          <svg class="faq-chevron w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
          <div class="px-6 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Ya! FlowBoard menawarkan tingkat gratis yang murah hati untuk hingga 5 anggota tim dan 3 proyek aktif. Tidak perlu kartu kredit. Tingkatkan ke Pro saat tim Anda melampaui paket starter.
          </div>
        </div>
      </div>

      <!-- Item FAQ 2 -->
      <div class="faq-item border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button class="faq-question w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span>Integrasi apa yang Anda dukung?</span>
          <svg class="faq-chevron w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
          <div class="px-6 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            FlowBoard terintegrasi dengan Slack, GitHub, GitLab, Google Drive, Dropbox, Jira, dan lebih dari 50 alat lainnya. API terbuka dan webhook kami memungkinkan Anda membangun integrasi kustom juga.
          </div>
        </div>
      </div>

      <!-- Item FAQ 3 -->
      <div class="faq-item border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button class="faq-question w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span>Apakah data saya aman?</span>
          <svg class="faq-chevron w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
          <div class="px-6 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Tentu. FlowBoard bersertifikasi SOC 2 Type II, mendukung SAML/SSO, dan mengenkripsi data saat istirahat dan dalam perjalanan. Kami menggunakan AWS dengan cadangan redundan dan SLA ketersediaan 99,99% untuk paket enterprise.
          </div>
        </div>
      </div>

      <!-- Item FAQ 4 -->
      <div class="faq-item border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button class="faq-question w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span>Bisakah saya mengekspor data saya jika keluar?</span>
          <svg class="faq-chevron w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
          <div class="px-6 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Ya, Anda dapat mengekspor semua proyek, tugas, dan file sebagai CSV atau JSON kapan saja. Kami percaya pada portabilitas data — tidak ada kontrak yang mengikat.
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

### Bagian Footer

Footer menutup halaman dengan tautan, merek, dan pemberitahuan hak cipta.

```html
<!-- Footer -->
<footer class="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
      <div class="col-span-2 md:col-span-1">
        <a href="#" class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-sm">F</span>
          </div>
          <span class="font-bold text-xl text-gray-900 dark:text-white">FlowBoard</span>
        </a>
        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Manajemen proyek untuk tim modern. Dibangun dengan cinta.
        </p>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Produk</h4>
        <ul class="space-y-2">
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Fitur</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Harga</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Integrasi</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Catatan Perubahan</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Perusahaan</h4>
        <ul class="space-y-2">
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Tentang</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Blog</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Karir</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Kontak</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Hukum</h4>
        <ul class="space-y-2">
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privasi</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Ketentuan</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Keamanan</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Kebijakan Cookie</a></li>
        </ul>
      </div>
    </div>
    <div class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
      &copy; 2026 FlowBoard. Hak cipta dilindungi.
    </div>
  </div>
</footer>
```

### JavaScript untuk Interaktivitas

Landing page membutuhkan dua perilaku JavaScript: pengalihan mode gelap dengan penyimpanan localStorage dan akordeon FAQ. Buat `src/main.js`:

```javascript
// Pengalih Mode Gelap
const darkToggle = document.getElementById('dark-toggle');
const html = document.documentElement;

// Periksa localStorage untuk preferensi yang disimpan
if (localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  html.classList.add('dark');
}

darkToggle.addEventListener('click', () => {
  html.classList.toggle('dark');
  localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
});

// Akordeon FAQ
document.querySelectorAll('.faq-question').forEach(button => {
  button.addEventListener('click', () => {
    const item = button.parentElement;
    const answer = item.querySelector('.faq-answer');
    const chevron = item.querySelector('.faq-chevron');
    const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';

    // Tutup semua item FAQ lain yang terbuka
    document.querySelectorAll('.faq-answer').forEach(a => {
      a.style.maxHeight = '0px';
    });
    document.querySelectorAll('.faq-chevron').forEach(c => {
      c.classList.remove('rotate-180');
    });

    // Buka item ini jika sebelumnya tertutup
    if (!isOpen) {
      answer.style.maxHeight = answer.scrollHeight + 'px';
      chevron.classList.add('rotate-180');
    }
  });
});

// Pengalih Menu Seluler
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

menuToggle.addEventListener('click', () => {
  mobileMenu.classList.toggle('hidden');
});
```

Implementasi mode gelap:
- Memeriksa `localStorage` terlebih dahulu untuk preferensi yang disimpan.
- Jatuh kembali ke preferensi sistem melalui `prefers-color-scheme: dark`.
- Pemanggilan `html.classList.toggle('dark')` memicu setiap varian kelas `dark:` di seluruh halaman.

Akordeon menggunakan JavaScript untuk mengalihkan `max-height` antara `0` dan `scrollHeight`, yang menghasilkan transisi CSS yang halus. Mengklik item baru secara otomatis menutup item yang sebelumnya terbuka.

### Build Produksi

Saat Anda siap untuk men-deploy, jalankan build produksi:

```bash
npm run build
```

Ini menghasilkan file CSS yang diminifikasi di `src/output.css` yang hanya berisi kelas utilitas yang digunakan di HTML Anda. Bundel yang dihasilkan biasanya di bawah 10 KB, dibandingkan dengan pustaka Tailwind CSS lengkap yang berukuran beberapa megabita.

Deploy seluruh folder proyek ke penyedia hosting statis mana pun — Netlify, Vercel, GitHub Pages, atau bucket S3 sederhana.

## Contoh Kode

### Struktur Proyek Lengkap

```text
flowboard-landing/
├── index.html
├── package.json
├── tailwind.config.js
├── src/
│   ├── input.css        # @import "tailwindcss"
│   ├── output.css       # Hasil generate (gitignore file ini)
│   └── main.js          # Mode gelap, akordeon FAQ, menu seluler
```

### Contoh: Menggunakan Utilitas `group` Tailwind untuk Efek Hover Kartu

Kelas `group` memungkinkan beberapa elemen anak merespons status hover induk. Pola ini digunakan di kartu fitur untuk memperbesar ikon dan meninggikan bayangan:

```html
<div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 hover:border-indigo-600 shadow-sm hover:shadow-lg transition-all duration-200">
  <!-- Ikon membesar saat kartu di-hover -->
  <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
    <svg class="w-6 h-6 text-indigo-600">...</svg>
  </div>
  <h3 class="text-lg font-semibold">Manajemen Tugas</h3>
  <p class="text-gray-600 text-sm">...</p>
</div>
```

### Contoh: Mode Gelap dengan Strategi `class`

Setiap komponen menyertakan varian `dark:` untuk warna latar belakang, teks, batas, dan bayangan:

```html
<div class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
```

`transition-colors duration-300` pada `<body>` memastikan transisi warna yang halus saat pengguna mengalihkan mode gelap.

## Insight Penting

- **Gunakan `group` dan `group-hover` untuk interaksi majemuk** — ini menghilangkan kebutuhan JavaScript untuk efek hover kartu sederhana. Elemen anak mana pun dapat merespons status hover induk dengan `group-hover:`.
- **Mode gelap dengan strategi `class` memberi pengguna kendali** — dengan menyimpan preferensi di `localStorage` dan menghormati `prefers-color-scheme`, Anda menghormati pilihan eksplisit dan default sistem.
- **Setiap `px-*` dan `py-*` relatif terhadap ukuran font dasar** — skala spasi Tailwind menggunakan satuan `rem`, yang diskalakan dengan preferensi ukuran font browser pengguna, memastikan aksesibilitas.
- **Prefiks breakpoint dapat digabungkan dengan utilitas apa pun** — `md:flex`, `lg:grid-cols-3`, `sm:text-xl` — Anda tidak pernah menulis `@media` query secara manual.
- **Tailwind CSS produksi sangat kecil** — mekanisme pemurrian berarti CSS akhir Anda hanya berisi kelas yang Anda gunakan, biasanya 5–15 KB terkompresi untuk landing page.

## Langkah Berikutnya

- Jelajahi **animasi Tailwind CSS** — `animate-bounce`, `animate-spin`, dan `@keyframes` kustom untuk desain gerak yang lebih lanjut.
- Pelajari tentang **plugin Tailwind CSS** — plugin resmi `@tailwindcss/typography` untuk konten teks kaya, `@tailwindcss/forms` untuk elemen formulir bergaya, dan `@tailwindcss/aspect-ratio`.
- Dalami pengetahuan Anda dengan **Panduan Praktik Terbaik Tailwind CSS** untuk arsitektur sistem desain, strategi ekstraksi komponen, dan pengujian.
- Ikuti **Silabus Tailwind CSS** untuk jalur pembelajaran terstruktur 12 minggu yang mencakup segalanya dari fundamental utilitas hingga sistem desain enterprise.

## Kesimpulan

Dalam tutorial ini, Anda membangun landing page pemasaran yang lengkap dan responsif untuk produk SaaS menggunakan Tailwind CSS. Anda belajar cara membangun proyek dengan Tailwind CLI, membuat komponen dunia nyata menggunakan kelas utilitas, mengimplementasikan layout responsif dengan prefiks breakpoint, dan menambahkan mode gelap dengan strategi `class`. Pendekatan berbasis proyek berarti Anda dapat menggunakan kembali pola-pola ini untuk produk, proyek klien, atau situs portofolio Anda sendiri. Tailwind CSS memungkinkan Anda beriterasi dengan cepat, menjaga bundel CSS tetap kecil, dan mempertahankan desain yang konsisten — semuanya dari HTML Anda.

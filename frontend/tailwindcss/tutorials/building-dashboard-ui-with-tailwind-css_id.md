---
title: "Membangun Dashboard UI dengan Tailwind CSS"
description: "Tutorial berbasis proyek tentang membangun antarmuka dashboard admin responsif menggunakan Tailwind CSS — mencakup navigasi sidebar, kartu statistik, tabel data, integrasi grafik, mode gelap, dan tata letak responsif."
category: "frontend"
technology: "tailwindcss"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Dashboard UI dengan Tailwind CSS

## Ringkasan

Dashboard adalah salah satu pola UI yang paling umum dalam aplikasi web modern — mulai dari platform analitik dan panel admin e-commerce hingga alat manajemen proyek dan backend SaaS. Dalam tutorial berbasis proyek ini, Anda akan membangun antarmuka dashboard admin yang lengkap menggunakan Tailwind CSS tanpa menulis satu baris CSS kustom pun. Mulai dari penyiapan proyek dengan Tailwind CLI, Anda akan membuat dashboard profesional yang dilengkapi dengan sidebar yang dapat dilipat, kartu ringkasan statistik, tabel data dengan pencarian dan paginasi, tempat grafik interaktif, tema mode gelap, dan tata letak responsif seluler. Pada akhirnya, Anda akan memiliki template dashboard yang dapat digunakan kembali dan pemahaman mendalam tentang cara menyusun tata letak kompleks dengan kelas utilitas.

## Target Audiens

- Developer frontend dan desainer UI yang sudah nyaman dengan dasar-dasar HTML dan CSS.
- Developer yang telah menyelesaikan tutorial dasar Tailwind CSS dan ingin menerapkan keterampilan tersebut ke proyek tata letak kompleks di dunia nyata.
- Siapa pun yang perlu membangun antarmuka dashboard atau panel admin dengan cepat tanpa menulis CSS kustom.

## Prasyarat

- Pengetahuan dasar HTML (elemen semantik, atribut class, atribut data).
- Keakraban dengan konsep CSS seperti flexbox dan grid (pemahaman konseptual sudah cukup untuk mengikuti kelas utilitas Tailwind).
- Node.js 16+ dan npm terinstal di mesin pengembangan Anda.
- Editor kode (VS Code direkomendasikan dengan ekstensi Tailwind CSS IntelliSense untuk autocomplete).
- Keakraban dasar dengan kelas utilitas Tailwind CSS (prefix responsif, spacing, warna).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menyiapkan proyek Tailwind CSS dengan CLI dan mengkonfigurasi nilai tema kustom untuk sistem desain dashboard.
- Membangun navigasi sidebar responsif dengan submenu yang dapat dilipat dan penyorotan status aktif.
- Mendesain header dashboard dengan input pencarian, lencana notifikasi, dan dropdown profil pengguna.
- Membangun grid kartu statistik menggunakan utilitas grid responsif Tailwind.
- Membuat tabel data dengan header kolom yang dapat diurutkan, filter pencarian, dan kontrol paginasi.
- Mengintegrasikan Chart.js dengan komponen pembungkus bergaya Tailwind untuk visualisasi data.
- Menerapkan mode gelap dengan strategi `class` Tailwind dan toggle manual.
- Membangun tata letak responsif seluler dengan menu hamburger yang menampilkan/menyembunyikan sidebar.
- Menyusun tata letak kompleks berkualitas produksi sepenuhnya dari kelas utilitas.

## Konteks dan Motivasi

Setiap aplikasi web yang mengelola data — apakah itu platform e-commerce, alat manajemen proyek, sistem manajemen konten, atau layanan analitik — membutuhkan dashboard. Dashboard adalah pusat komando di mana pengguna memantau metrik utama, mengelola sumber daya, dan mengambil tindakan. Namun membangun dashboard dari awal seringkali berarti bergelut dengan tata letak CSS yang kompleks, breakpoint responsif, tema mode gelap, dan pola komponen yang dapat digunakan kembali.

Tailwind CSS unggul dalam jenis pekerjaan ini. Pendekatan utility-first memungkinkan Anda menyusun tata letak kompleks langsung di HTML, menghilangkan perpindahan konteks antara file HTML dan CSS. Desain responsif menjadi semudah menambahkan prefix breakpoint (`sm:`, `md:`, `lg:`, `xl:`). Mode gelap adalah toggle kelas tunggal. Token desain kustom — warna, spacing, font — dikonfigurasi sekali di `tailwind.config.js` dan digunakan di mana saja.

Dalam tutorial ini, Anda akan membangun dashboard admin dunia nyata yang dapat menjadi fondasi untuk aplikasi web berbasis data apa pun. Teknik yang Anda pelajari — sidebar responsif, tabel data, kartu statistik, integrasi grafik, mode gelap — dapat ditransfer langsung ke proyek Tailwind CSS apa pun.

## Konten Inti

### Persiapan Proyek dan Konfigurasi

Mulailah dengan menyiapkan proyek Tailwind CSS baru menggunakan CLI. Ini memberi Anda kontrol penuh atas proses build dan konfigurasi tanpa mengikat Anda ke framework tertentu.

```bash
mkdir tailwind-dashboard
cd tailwind-dashboard
npm init -y
npm install -D tailwindcss @tailwindcss/cli
npx tailwindcss init
```

Konfigurasikan path `content` di `tailwind.config.js` untuk memindai file HTML Anda bagi penggunaan kelas:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: "#1e293b",
          hover: "#334155",
          active: "#0f172a",
        },
      },
    },
  },
  plugins: [],
};
```

Aktifkan mode gelap melalui strategi `class` — ini memungkinkan Anda mengontrol mode gelap secara manual dengan toggle JavaScript daripada mengandalkan preferensi sistem pengguna.

Buat file CSS entry Anda di `src/input.css`:

```css
@import "tailwindcss";
```

Tambahkan skrip build dan watch ke `package.json`:

```json
{
  "scripts": {
    "build": "npx @tailwindcss/cli -i src/input.css -o dist/output.css",
    "watch": "npx @tailwindcss/cli -i src/input.css -o dist/output.css --watch"
  }
}
```

Buat file `index.html` di root proyek. Di sinilah semua markup dashboard akan berada.

### Arsitektur Tata Letak Dashboard

Tata letak dashboard mengikuti struktur tiga wilayah:

- **Sidebar** — kolom kiri tetap yang berisi menu navigasi, logo, dan info pengguna.
- **Area konten utama** — kolom kanan yang dapat digulir berisi header dan konten halaman.

```text
┌──────────┬──────────────────────────────────────┐
│          │  Header (pencarian, notifikasi,      │
│ Sidebar  │  dropdown profil, toggle mode gelap) │
│          ├──────────────────────────────────────┤
│  Logo    │                                      │
│  Tautan  │  Konten Halaman                      │
│  Nav     │  ┌────┬────┬────┬────┐               │
│          │  │Card│Card│Card│Card│               │
│  User    │  ├────┴────┴────┴────┤               │
│  Footer  │  │  Area Grafik      │               │
│          │  ├───────────────────┤               │
│          │  │  Tabel Data       │               │
│          │  └───────────────────┘               │
└──────────┴──────────────────────────────────────┘
```

### Membangun Sidebar

Sidebar adalah kolom konten tetap di sebelah kiri. Berisi logo merek, tautan navigasi dengan ikon, dan bagian profil pengguna di bagian bawah. Pada perangkat seluler, sidebar disembunyikan secara default dan ditampilkan saat pengguna mengklik tombol menu hamburger.

```html
<!-- Overlay Sidebar (khusus seluler) -->
<div id="sidebarOverlay" class="fixed inset-0 bg-black/50 z-30 hidden lg:hidden"></div>

<!-- Sidebar -->
<aside id="sidebar" class="fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar text-slate-300 
  -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out">

  <!-- Logo -->
  <div class="flex items-center gap-3 px-6 h-16 border-b border-slate-700">
    <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
      <span class="text-white font-bold text-sm">D</span>
    </div>
    <span class="text-white font-semibold text-lg">Dashboard</span>
  </div>

  <!-- Navigasi -->
  <nav class="px-4 py-6 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
    <!-- Item navigasi -->
    <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
      bg-sidebar-active text-white transition-colors duration-150"
      data-active="true">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">...</svg>
      <span>Ringkasan</span>
    </a>

    <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
      text-slate-300 hover:bg-sidebar-hover hover:text-white transition-colors duration-150">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">...</svg>
      <span>Analitik</span>
    </a>

    <!-- Submenu yang dapat dilipat -->
    <div x-data="{ open: false }">
      <button @click="open = !open"
        class="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium
        text-slate-300 hover:bg-sidebar-hover hover:text-white transition-colors duration-150">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">...</svg>
          <span>Manajemen</span>
        </div>
        <svg class="w-4 h-4 transition-transform duration-200" :class="open && 'rotate-180'"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div x-show="open" class="ml-10 mt-1 space-y-1">
        <a href="#" class="block px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-sidebar-hover
          hover:text-white transition-colors duration-150">Pengguna</a>
        <a href="#" class="block px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-sidebar-hover
          hover:text-white transition-colors duration-150">Peran</a>
        <a href="#" class="block px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-sidebar-hover
          hover:text-white transition-colors duration-150">Izin</a>
      </div>
    </div>
  </nav>

  <!-- Footer Profil Pengguna -->
  <div class="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-slate-700 bg-sidebar">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-indigo-400 flex items-center justify-center text-white text-sm font-medium">
        JD
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate">Jane Doe</p>
        <p class="text-xs text-slate-400 truncate">jane@example.com</p>
      </div>
      <button class="p-1.5 rounded-lg hover:bg-sidebar-hover transition-colors">
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  </div>
</aside>
```

**Pola sidebar utama:**
- Gunakan `fixed top-0 left-0 z-40 h-screen` untuk menempelkan sidebar ke tepi kiri viewport.
- Kombinasi `-translate-x-full lg:translate-x-0` menyembunyikan sidebar di luar layar pada perangkat seluler (`< lg`) dan menampilkannya di posisi pada desktop.
- Overlay (`fixed inset-0 bg-black/50 z-30`) berada di belakang sidebar pada perangkat seluler untuk menggelapkan konten utama dan menangkap klik untuk menutup.
- Item nav aktif menggunakan `bg-sidebar-active text-white` sementara item tidak aktif menggunakan warna slate redup yang mencerah saat di-hover.
- Submenu yang dapat dilipat menggunakan `x-data` dan `x-show` dari Alpine.js untuk interaktivitas ringan tanpa framework JavaScript yang berat.

### Membangun Header

Header berada di bagian atas area konten utama. Berisi menu hamburger (hanya terlihat di perangkat seluler), bilah pencarian, ikon notifikasi dengan lencana, toggle mode gelap, dan avatar profil pengguna.

```html
<!-- Header -->
<header class="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
  <div class="flex items-center justify-between h-16 px-4 sm:px-6">

    <!-- Kiri: Hamburger + Pencarian -->
    <div class="flex items-center gap-4 flex-1">
      <!-- Hamburger (khusus seluler) -->
      <button id="menuBtn" class="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 
        dark:hover:bg-slate-800 transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Pencarian -->
      <div class="hidden sm:flex items-center flex-1 max-w-md">
        <div class="relative w-full">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none"
            stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Cari..."
            class="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600
            bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100
            placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
            focus:border-transparent transition-colors duration-150" />
        </div>
      </div>
    </div>

    <!-- Kanan: Aksi -->
    <div class="flex items-center gap-2 sm:gap-3">

      <!-- Toggle Mode Gelap -->
      <button id="darkToggle"
        class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800
        dark:text-slate-400 transition-colors duration-150">
        <!-- Ikon matahari (ditampilkan di mode gelap) -->
        <svg id="sunIcon" class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <!-- Ikon bulan (ditampilkan di mode terang) -->
        <svg id="moonIcon" class="w-5 h-5 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      <!-- Notifikasi -->
      <button class="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100
        dark:hover:bg-slate-800 dark:text-slate-400 transition-colors duration-150">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>

      <!-- Avatar -->
      <div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
        JD
      </div>
    </div>
  </div>
</header>
```

**Pola header utama:**
- `sticky top-0 z-20` menjaga header tetap menempel di bagian atas saat konten digulir.
- Tombol hamburger menggunakan `lg:hidden` — hanya muncul di layar yang lebih kecil dari breakpoint `lg`.
- Input pencarian adalah `hidden sm:flex` — menghilang di layar sangat kecil untuk menghemat ruang.
- Toggle mode gelap beralih antara ikon matahari dan bulan menggunakan `dark:block` dan `dark:hidden`.
- Lencana notifikasi menggunakan `absolute` dengan gaya titik `w-2 h-2`.

### Grid Kartu Statistik

Kartu statistik menyediakan metrik sekilas. Gunakan grid responsif yang menampilkan 4 kartu di layar besar, 2 di layar sedang, dan 1 di layar kecil:

```html
<!-- Kartu Statistik -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
  <!-- Kartu: Pendapatan -->
  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6
    hover:shadow-md transition-shadow duration-200">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Total Pendapatan</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">Rp 45.231.000</p>
        <p class="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
          <span class="font-medium">+20,1%</span> dari bulan lalu
        </p>
      </div>
      <div class="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center
        text-indigo-600 dark:text-indigo-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  </div>

  <!-- Kartu: Pelanggan -->
  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6
    hover:shadow-md transition-shadow duration-200">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Pelanggan</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">2.350</p>
        <p class="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
          <span class="font-medium">+180</span> minggu ini
        </p>
      </div>
      <div class="w-12 h-12 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center
        text-cyan-600 dark:text-cyan-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
    </div>
  </div>

  <!-- Kartu: Pesanan -->
  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6
    hover:shadow-md transition-shadow duration-200">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Pesanan Aktif</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">147</p>
        <p class="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
          <span class="font-medium">+24</span> sejak kemarin
        </p>
      </div>
      <div class="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center
        text-amber-600 dark:text-amber-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
    </div>
  </div>

  <!-- Kartu: Tingkat Konversi -->
  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6
    hover:shadow-md transition-shadow duration-200">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Tingkat Konversi</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">3,24%</p>
        <p class="text-sm text-rose-600 dark:text-rose-400 mt-1">
          <span class="font-medium">-0,5%</span> dari minggu lalu
        </p>
      </div>
      <div class="w-12 h-12 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center
        text-rose-600 dark:text-rose-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
    </div>
  </div>
</div>
```

**Pola kartu statistik utama:**
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` membuat grid kartu responsif yang beradaptasi di berbagai breakpoint.
- Setiap kartu menggunakan `rounded-xl shadow-sm border` untuk tampilan yang bersih dan terangkat.
- Wadah ikon menggunakan latar belakang berwarna (misalnya, `bg-indigo-50 text-indigo-600`) yang beradaptasi ke mode gelap dengan `dark:bg-indigo-900/30 dark:text-indigo-400`.
- Tren positif menggunakan `text-emerald-600`, tren negatif menggunakan `text-rose-600` — keduanya dengan varian mode gelap.
- `hover:shadow-md transition-shadow` menambahkan interaktivitas halus tanpa membebani desain.

### Area Grafik dengan Chart.js

Untuk visualisasi data nyata, integrasikan Chart.js di dalam wadah bergaya Tailwind. Pertama, sertakan library:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

Kemudian buat wadah kartu dengan elemen canvas:

```html
<!-- Kartu Grafik -->
<div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mt-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Ringkasan Pendapatan</h3>
    <div class="flex items-center gap-2">
      <select class="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5
        bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none
        focus:ring-2 focus:ring-indigo-500">
        <option>7 hari terakhir</option>
        <option>30 hari terakhir</option>
        <option>90 hari terakhir</option>
      </select>
    </div>
  </div>
  <div class="relative h-72">
    <canvas id="revenueChart"></canvas>
  </div>
</div>

<script>
  const ctx = document.getElementById("revenueChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
      datasets: [
        {
          label: "Pendapatan",
          data: [12400, 18200, 15800, 22100, 19400, 25700, 23100],
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#6366f1",
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => "$" + value.toLocaleString(),
          },
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  });
</script>
```

**Pola integrasi grafik:**
- Bungkus kanvas Chart.js dalam wadah `relative h-72` untuk mengontrol dimensi grafik tanpa `maintainAspectRatio`.
- Gunakan dropdown pemilih periode untuk mendemonstrasikan bagaimana filter akan terhubung ke data grafik dalam aplikasi nyata.
- Warna grafik (`borderColor`, `pointBackgroundColor`) harus sesuai dengan warna utama sistem desain Tailwind Anda (`#6366f1` untuk indigo-500).
- Untuk mode gelap, render ulang grafik dengan warna grid yang disesuaikan — salah satu pendekatannya adalah mendengarkan toggle mode gelap dan memanggil `chart.destroy()` diikuti dengan `Chart()` baru dengan opsi yang sadar mode gelap.

### Membangun Tabel Data

Tabel data adalah komponen inti dashboard. Contoh ini mencakup kolom yang dapat diurutkan, filter baris yang dapat dicari, lencana status, dan kontrol paginasi:

```html
<!-- Bagian Tabel Data -->
<div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mt-6">
  <!-- Header Tabel -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4
    border-b border-slate-200 dark:border-slate-700">
    <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Pesanan Terbaru</h3>
    <div class="flex items-center gap-3 w-full sm:w-auto">
      <div class="relative flex-1 sm:flex-initial">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none"
          stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Filter pesanan..."
          class="pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600
          bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100
          placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
          focus:border-transparent w-full sm:w-64" />
      </div>
      <button class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium
        rounded-lg transition-colors duration-150">
        + Pesanan Baru
      </button>
    </div>
  </div>

  <!-- Tabel -->
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-slate-200 dark:border-slate-700">
          <th class="text-left px-6 py-3 font-semibold text-slate-900 dark:text-white cursor-pointer
            hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <div class="flex items-center gap-1">
              Pesanan
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
          </th>
          <th class="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Pelanggan</th>
          <th class="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Status</th>
          <th class="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Tanggal</th>
          <th class="text-right px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50
          dark:hover:bg-slate-700/30 transition-colors duration-150">
          <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">#ORD-001</td>
          <td class="px-6 py-4 text-slate-600 dark:text-slate-300">Alice Johnson</td>
          <td class="px-6 py-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              Selesai
            </span>
          </td>
          <td class="px-6 py-4 text-slate-500 dark:text-slate-400">2026-07-14</td>
          <td class="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">Rp 342.000</td>
        </tr>
        <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50
          dark:hover:bg-slate-700/30 transition-colors duration-150">
          <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">#ORD-002</td>
          <td class="px-6 py-4 text-slate-600 dark:text-slate-300">Bob Martinez</td>
          <td class="px-6 py-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              Diproses
            </span>
          </td>
          <td class="px-6 py-4 text-slate-500 dark:text-slate-400">2026-07-14</td>
          <td class="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">Rp 1.280.500</td>
        </tr>
        <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50
          dark:hover:bg-slate-700/30 transition-colors duration-150">
          <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">#ORD-003</td>
          <td class="px-6 py-4 text-slate-600 dark:text-slate-300">Carol Chen</td>
          <td class="px-6 py-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              Dikirim
            </span>
          </td>
          <td class="px-6 py-4 text-slate-500 dark:text-slate-400">2026-07-13</td>
          <td class="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">Rp 785.000</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Paginasi -->
  <div class="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700">
    <p class="text-sm text-slate-500 dark:text-slate-400">Menampilkan 1-3 dari 147</p>
    <div class="flex items-center gap-2">
      <button class="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600
        text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
        transition-colors duration-150 disabled:opacity-50" disabled>
        Sebelumnya
      </button>
      <button class="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white">1</button>
      <button class="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600
        text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
        transition-colors duration-150">2</button>
      <button class="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600
        text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
        transition-colors duration-150">3</button>
      <button class="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600
        text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
        transition-colors duration-150">Selanjutnya</button>
    </div>
  </div>
</div>
```

**Pola tabel data utama:**
- Tabel dibungkus dalam `overflow-x-auto` untuk memungkinkan pengguliran horizontal di layar sempit sambil menjaga tabel tetap utuh.
- Lencana status menggunakan warna semantik — `emerald` untuk Selesai, `amber` untuk Diproses, `blue` untuk Dikirim — semuanya dengan varian mode gelap.
- Baris tabel memiliki `hover:bg-slate-50` untuk interaktivitas tingkat baris dan `transition-colors` untuk efek hover yang halus.
- Header kolom yang dapat diurutkan menyertakan ikon panah SVG dan perlakuan `cursor-pointer hover:text-indigo-600`.
- Bilah paginasi terpisah dengan rapi dari badan tabel menggunakan pemisah `border-t` dan jarak responsif.

### Implementasi Mode Gelap

Mode gelap menggunakan strategi `class` Tailwind. Menoggle kelas `dark` pada elemen root `<html>` mengalihkan semua komponen ke varian gelapnya:

```html
<script>
  // Saat halaman dimuat, periksa localStorage untuk preferensi mode gelap
  if (localStorage.getItem("darkMode") === "true") {
    document.documentElement.classList.add("dark");
  }

  // Handler toggle
  document.getElementById("darkToggle").addEventListener("click", function () {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("darkMode", isDark);
  });
</script>
```

**Pola mode gelap yang digunakan di seluruh dashboard:**
- `dark:bg-slate-800` untuk latar belakang kartu, `dark:bg-slate-900` untuk latar belakang halaman utama.
- `dark:border-slate-700` untuk batas yang menggelap di mode gelap.
- `dark:text-white` dan `dark:text-slate-300` untuk teks pada latar belakang gelap.
- `dark:bg-slate-700/30` untuk status hover pada baris tabel dan elemen interaktif.
- Elemen berwarna (lencana status, latar belakang ikon) menggunakan varian gelap semi-transparan: `dark:bg-emerald-900/30 dark:text-emerald-400`.

### Responsivitas Seluler

Dashboard beradaptasi di tiga breakpoint:

- **Seluler (`< sm`)**: Tata letak satu kolom. Sidebar disembunyikan di balik toggle hamburger. Kartu statistik ditumpuk secara vertikal. Tabel menggulir secara horizontal. Header hanya menampilkan ikon penting.
- **Tablet (`sm` ke `lg`)**: Kartu statistik ditampilkan dalam grid 2 kolom. Pencarian terlihat. Beberapa label sidebar mungkin terpotong.
- **Desktop (`lg+`)**: Tata letak penuh dengan sidebar tetap, grid statistik 4 kolom, semua elemen UI terlihat.

JavaScript toggle sidebar:

```html
<script>
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const menuBtn = document.getElementById("menuBtn");

  function openSidebar() {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closeSidebar() {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  menuBtn.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);
</script>
```

## Contoh Kode

### Struktur Halaman Lengkap

Untuk referensi, berikut adalah struktur HTML lengkap halaman dashboard:

```html
<!DOCTYPE html>
<html lang="id" class="">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dashboard Admin</title>
  <link href="dist/output.css" rel="stylesheet" />
  <script defer src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="bg-slate-50 dark:bg-slate-950 antialiased">

  <!-- Overlay Sidebar -->
  <div id="sidebarOverlay" class="fixed inset-0 bg-black/50 z-30 hidden lg:hidden"></div>

  <!-- Sidebar -->
  <aside id="sidebar" class="fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar text-slate-300
    -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out">
    <!-- Konten sidebar dari atas -->
  </aside>

  <!-- Konten Utama -->
  <div class="lg:pl-64">
    <!-- Header -->
    <header>...</header>

    <!-- Konten Halaman -->
    <main class="p-4 sm:p-6 lg:p-8">
      <!-- Judul Halaman -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Selamat datang kembali, Jane! Berikut adalah yang terjadi hari ini.
        </p>
      </div>

      <!-- Kartu Statistik -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <!-- ... -->
      </div>

      <!-- Grafik -->
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200
        dark:border-slate-700 p-6 mt-6">
        <!-- ... -->
      </div>

      <!-- Tabel Data -->
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200
        dark:border-slate-700 mt-6">
        <!-- ... -->
      </div>
    </main>
  </div>

  <!-- JavaScript -->
  <script>
    // Toggle mode gelap
    if (localStorage.getItem("darkMode") === "true") {
      document.documentElement.classList.add("dark");
    }
    document.getElementById("darkToggle").addEventListener("click", function () {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("darkMode", isDark);
    });

    // Toggle sidebar
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const menuBtn = document.getElementById("menuBtn");

    menuBtn.addEventListener("click", () => {
      sidebar.classList.remove("-translate-x-full");
      overlay.classList.remove("hidden");
      document.body.classList.add("overflow-hidden");
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.add("-translate-x-full");
      overlay.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
    });
  </script>
</body>
</html>
```

### Render Ulang Grafik Mode Gelap

Saat pengguna menoggle mode gelap, grafik membutuhkan warna grid dan teks yang diperbarui. Berikut adalah pola yang menangani hal ini:

```javascript
const chartColors = {
  grid: { light: "rgba(0,0,0,0.05)", dark: "rgba(255,255,255,0.05)" },
  text: { light: "#64748b", dark: "#94a3b8" },
};

function createChart(canvasId) {
  const isDark = document.documentElement.classList.contains("dark");
  const ctx = document.getElementById(canvasId).getContext("2d");

  return new Chart(ctx, {
    type: "line",
    data: { /* ... */ },
    options: {
      scales: {
        y: {
          grid: { color: isDark ? chartColors.grid.dark : chartColors.grid.light },
          ticks: { color: isDark ? chartColors.text.dark : chartColors.text.light },
        },
        x: {
          grid: { display: false },
          ticks: { color: isDark ? chartColors.text.dark : chartColors.text.light },
        },
      },
    },
  });
}

let revenueChart = createChart("revenueChart");

document.getElementById("darkToggle").addEventListener("click", function () {
  if (revenueChart) revenueChart.destroy();
  setTimeout(() => { revenueChart = createChart("revenueChart"); }, 50);
});
```

### Generator Item Nav Sidebar (JavaScript)

Untuk dashboard dengan menu navigasi dinamis, buat item sidebar dari array data:

```javascript
const navItems = [
  { label: "Ringkasan", icon: "home", href: "#", active: true },
  { label: "Analitik", icon: "chart", href: "#", active: false },
  { label: "Pesanan", icon: "cart", href: "#", active: false },
  { label: "Pelanggan", icon: "users", href: "#", active: false },
  { label: "Pengaturan", icon: "cog", href: "#", active: false },
];

function renderNav(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = items.map(item => `
    <a href="${item.href}"
      class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
      ${item.active
        ? "bg-sidebar-active text-white"
        : "text-slate-300 hover:bg-sidebar-hover hover:text-white"}
      transition-colors duration-150">
      ${getIcon(item.icon)}
      <span>${item.label}</span>
    </a>
  `).join("");
}
```

## Insight Penting

- **Komposisi utility-first itu scalable**: Dashboard dibangun sepenuhnya dari kelas utilitas tujuan tunggal — tidak ada CSS kustom yang ditulis. Ini membuat desain konsisten, mudah dipelihara, dan mudah diiterasi. Setiap komponen menggunakan skala spacing yang sama (`p-4`, `p-6`, `gap-4`), radius border yang sama (`rounded-xl`, `rounded-lg`), dan palet warna yang sama.
- **Prefix responsif adalah kekuatan super tata letak**: Pola `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` memungkinkan Anda mendefinisikan seluruh perilaku responsif sebuah wadah dalam satu string kelas. Tidak ada media queries, tidak ada file breakpoint, tidak ada CSS override.
- **Mode gelap adalah keputusan sistem desain, bukan setelahnya**: Dengan menambahkan varian `dark:` ke setiap kelas yang mendefinisikan properti visual (latar belakang, teks, border, bayangan, hover), mode gelap muncul secara alami. Strategi `class` memberi pengguna kontrol atas preferensi tema, dan `localStorage` mempertahankannya di seluruh sesi.
- **State lebih mudah dengan varian bawaan Tailwind**: Varian hover (`hover:`), focus (`focus:`), disabled (`disabled:`), dan group-hover (`group-hover:`) menghilangkan kebutuhan akan definisi state CSS terpisah. Dikombinasikan dengan `transition-colors duration-150`, bahkan komponen interaktif yang kompleks tetap sederhana.
- **Integrasikan Chart.js dengan wadah pembungkus, bukan inline**: Tempatkan elemen canvas di dalam wadah `relative` dengan tinggi tetap untuk mengontrol ukuran grafik. Ini menghindari jebakan umum di mana grafik melampaui batas yang dimaksudkan.
- **Token desain di config menjaga konsistensi sistem**: Mendefinisikan warna kustom (seperti palet warna `sidebar`) di `tailwind.config.js` berarti Anda merujuk `bg-sidebar` di mana saja daripada mengulang nilai heksadesimal. Ini membuat perubahan tema global menjadi edit satu baris.

## Langkah Berikutnya

- Pelajari cara menambahkan autentikasi dan perlindungan rute ke dashboard Anda dengan membaca **Panduan Penanganan Formulir dan Validasi Vue.js** atau **Panduan Autentikasi dan Otorisasi Next.js**.
- Jelajahi **Panduan Praktik Terbaik Tailwind CSS** untuk pola yang lebih dalam tentang arsitektur sistem desain dan strategi ekstraksi komponen.
- Tambahkan data backend nyata dengan mengintegrasikan dashboard Anda dengan framework seperti **Express.js** atau **NestJS** — lihat berbagai tutorial API untuk panduan.
- Pertimbangkan untuk menambahkan reaktivitas **Svelte** atau **Vue.js** untuk membuat submenu sidebar dan interaksi grafik sepenuhnya dinamis tanpa Alpine.js.

## Kesimpulan

Dalam tutorial ini, Anda telah membangun antarmuka dashboard admin yang lengkap hanya menggunakan kelas utilitas Tailwind CSS — tanpa CSS kustom, tanpa CSS-in-JS, tanpa library komponen siap pakai. Anda belajar cara menyusun sistem navigasi sidebar responsif dengan submenu yang dapat dilipat, kartu statistik yang beradaptasi di berbagai breakpoint, tabel data dengan kolom yang dapat diurutkan dan lencana status, integrasi Chart.js untuk visualisasi data, dan sistem mode gelap yang mempertahankan preferensi pengguna di seluruh sesi.

Pola yang telah Anda bangun di sini — grid tata letak responsif, toggle varian berbasis state, tema mode gelap, dan komposisi komponen dari utilitas — adalah fondasi pengembangan Tailwind CSS profesional. Setiap proyek yang Anda bangun mulai dari titik ini akan mendapat manfaat dari model mental yang sama: sistem desain yang diekspresikan sebagai batasan di `tailwind.config.js`, tata letak yang disusun dari utilitas responsif, dan variasi visual yang didorong oleh varian state bawaan.

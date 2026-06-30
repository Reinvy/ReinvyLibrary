---
title: "Silabus Pengembangan Frontend Vue.js"
description: "Kurikulum 12 minggu yang komprehensif mencakup Vue.js 3, Composition API, Vue Router, Pinia, pengujian, optimasi performa, SSR dengan Nuxt 3, dan proyek capstone."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Frontend Vue.js

## Ringkasan

Silabus 12 minggu ini dirancang untuk mengembangkan developer dari tingkat JavaScript menengah menjadi developer frontend Vue.js yang terampil. Kurikulum mencakup pengembangan Vue.js 3 modern menggunakan Composition API, Single File Components, routing sisi klien dengan Vue Router, manajemen state dengan Pinia, validasi form, integrasi API, pola desain komponen, pengujian otomatis dengan Vitest dan Vue Test Utils, teknik optimasi performa, server-side rendering dengan Nuxt 3, dan diakhiri dengan proyek capstone yang mendemonstrasikan semua keterampilan yang dipelajari. Setiap minggu menggabungkan pembelajaran konseptual dengan latihan coding langsung.

## Kurikulum

### Minggu 1: Vue.js 3 & Setup Vite
- Pengenalan ekosistem Vue.js 3 dan model reaktivitas
- Pembuatan proyek dengan `npm create vue@latest` dan Vite
- Memahami struktur proyek: `src/`, `public/`, `vite.config.js`
- Menjalankan dev server dan build untuk produksi
- **Latihan**: Buat proyek Vue baru dengan Vue Router dan Pinia aktif, jelajahi struktur file default

### Minggu 2: Pendalaman Composition API
- `ref` vs `reactive`: kapan menggunakan masing-masing
- Properti `computed` dan perilaku caching
- `watch` vs `watchEffect`: kasus penggunaan dan perbedaan
- `toRef` dan `toRefs` untuk destructuring reaktivitas
- Pola lanjutan: fungsi composable untuk penggunaan ulang logika
- **Latihan**: Bangun aplikasi counter reaktif dan composable konverter mata uang

### Minggu 3: Pola Single File Component
- Sintaks `<script setup>` dan keuntungannya
- Sintaks template: interpolasi, direktif, binding class dan style
- Scoped styles, CSS modules, dan deep selectors (`:deep()`)
- Komponen dinamis dengan `<component :is="">`
- **Latihan**: Bangun komponen antarmuka tab dengan rendering dinamis

### Minggu 4: Routing dengan Vue Router
- Membuat instance router dengan `createRouter` dan `createWebHistory`
- Named routes, nested routes, dan pencocokan rute dinamis
- Navigation guards: `beforeEach`, `beforeEnter`, `beforeRouteLeave`
- Meta field rute dan animasi transisi
- Lazy loading komponen rute untuk code splitting
- **Latihan**: Bangun dashboard multi-halaman dengan profil pengguna bersarang dan guard auth

### Minggu 5: Manajemen State dengan Pinia
- Setup Pinia di aplikasi Vue 3
- Setup stores (gaya Composition API) vs Options stores
- Getters untuk state turunan dan properti computed
- Actions untuk mutasi sinkron dan asinkron
- Plugin: persistensi state dengan `pinia-plugin-persistedstate`
- **Latihan**: Bangun store keranjang belanja dengan fungsionalitas tambah/hapus/perbarui

### Minggu 6: Form dan Validasi
- Binding dua arah dengan `v-model` pada elemen form
- Komponen `v-model` kustom dengan `modelValue` dan `update:modelValue`
- Pola validasi form: validasi manual, kesalahan validasi computed
- Menggunakan library: VeeValidate dengan skema Zod/Yup
- **Latihan**: Bangun form registrasi multi-langkah dengan validasi real-time

### Minggu 7: Integrasi API
- Mengambil data dengan Fetch API bawaan dan Axios
- Pola state loading, kosong, dan error
- Membatalkan request dengan `AbortController`
- Interceptor di Axios untuk token auth dan penanganan error
- Strategi caching dan deduplikasi untuk panggilan API
- **Latihan**: Bangun halaman daftar produk dengan pencarian, paginasi, dan penanganan error

### Minggu 8: Pola Desain Komponen
- Validasi props dengan `defineProps` dan TypeScript
- Typing emits dengan `defineEmits`
- Slots: default, named, scoped slots untuk delegasi render
- `provide` / `inject` untuk injeksi dependensi di pohon komponen yang dalam
- Higher-order components dan renderless components
- **Latihan**: Bangun komponen tabel data yang dapat digunakan kembali dengan kolom yang dapat diurutkan dan action slots

### Minggu 9: Pengujian dengan Vitest dan Vue Test Utils
- Setup Vitest di proyek Vue 3
- Menulis unit test untuk composables dan fungsi utilitas
- Mounting komponen dengan `mount` dan `shallowMount`
- Menguji props, emits, slots, dan reaktivitas
- Mocking panggilan API dengan `vi.mock`
- **Latihan**: Tulis test untuk store keranjang belanja dan komponen tabel data

### Minggu 10: Optimasi Performa
- Lazy loading komponen dengan `defineAsyncComponent`
- Menggunakan `KeepAlive` untuk menyimpan cache state komponen
- `Suspense` untuk penanganan dependensi asinkron
- Memoization dengan `computed` dan `v-memo`
- Virtual scrolling dengan library seperti `vue-virtual-scroller`
- Analisis bundle dengan `vite-plugin-inspect` dan `rollup-plugin-visualizer`
- **Latihan**: Optimalkan komponen daftar besar dengan virtual scrolling dan lazy loading

### Minggu 11: SSR dengan Nuxt 3
- Pengenalan arsitektur dan konvensi Nuxt 3
- Routing berbasis file di direktori `pages/`
- Server routes dengan `server/api/` dan `server/routes/`
- Pengambilan data dengan `useFetch`, `useAsyncData`, dan `$fetch`
- Auto-imports, modules, dan konfigurasi Nuxt
- Target deployment: Node.js server, Vercel, Netlify
- **Latihan**: Migrasi SPA Vue yang ada ke Nuxt 3 dengan SSR

### Minggu 12: Proyek Capstone
- Desain dan bangun aplikasi full-stack lengkap menggunakan Vue.js 3
- Harus mencakup: Composition API, Vue Router dengan guards, manajemen state Pinia, validasi form, integrasi API, unit test, dan optimasi performa
- Opsional: Nuxt 3, TypeScript, i18n, E2E test dengan Playwright
- Presentasikan arsitektur proyek, tantangan, dan solusi

## Proyek Akhir

Siswa akan membangun **Aplikasi Manajemen Tugas** (gaya Jira) dengan persyaratan berikut:

- Autentikasi pengguna dengan form login/register (berbasis JWT)
- Operasi CRUD proyek dan tugas dengan REST API (dapat menggunakan JSON Server atau backend sungguhan)
- Papan tugas drag-and-drop dengan kolom kanban (To Do, In Progress, Done)
- Pencarian dan pemfilteran real-time berdasarkan status, prioritas, dan penanggung jawab
- Dashboard dengan grafik yang menampilkan statistik tugas
- Desain responsif dengan transisi dan animasi Vue
- Unit test untuk store dan komponen (minimum 80% coverage pada jalur kritis)
- Opsional: Deployment Nuxt 3 SSR, mode gelap (tailwindcss), E2E test

## Kriteria Penilaian

- **Tugas Mingguan (40%)**: Setiap minggu memiliki latihan coding yang dievaluasi berdasarkan kebenaran, kualitas kode, dan kepatuhan terhadap praktik terbaik Vue.js.
- **Proyek Akhir (50%)**: Dievaluasi berdasarkan desain arsitektur, organisasi kode, kelengkapan fitur, cakupan pengujian, dan performa.
- **Partisipasi & Review Kode (10%)**: Kontribusi peer review dan keterlibatan dalam diskusi.

## Referensi

- [Dokumentasi Resmi Vue.js](https://vuejs.org/guide/introduction.html)
- [Dokumentasi Vue Router](https://router.vuejs.org/)
- [Dokumentasi Pinia](https://pinia.vuejs.org/)
- [Dokumentasi Vite](https://vitejs.dev/)
- [Dokumentasi Vitest](https://vitest.dev/)
- [Panduan Vue Test Utils](https://test-utils.vuejs.org/)
- [Dokumentasi Nuxt 3](https://nuxt.com/docs)
- [Dokumentasi VeeValidate](https://vee-validate.logaretm.com/v4/)
- [Awesome Vue](https://github.com/vuejs/awesome-vue) — daftar terkurasi sumber daya Vue

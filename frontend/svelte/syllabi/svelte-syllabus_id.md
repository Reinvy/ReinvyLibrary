---
title: "Silabus Pengembangan Svelte dan SvelteKit"
description: "Kursus komprehensif 12 minggu yang mencakup fundamental Svelte, routing SvelteKit, manajemen state, formulir, pengujian, autentikasi, optimalisasi performa, dan deployment — dari dasar hingga aplikasi full-stack siap produksi."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Svelte dan SvelteKit

## Ringkasan

Kurikulum 12 minggu ini menyediakan jalur pembelajaran komprehensif untuk pengembangan web modern dengan Svelte dan SvelteKit. Dimulai dengan model komponen reaktif Svelte dan filosofi peningkatan progresif (progressive enhancement), kursus ini berkembang menuju aplikasi full-stack siap produksi menggunakan sistem routing berbasis file SvelteKit, rendering sisi server, dan sistem deployment berbasis adapter. Setiap modul menggabungkan fondasi konseptual dengan latihan langsung, yang berpuncak pada proyek aplikasi full-stak sebagai proyek akhir.

## Kurikulum

### Modul 1: Fundamental Svelte dan Persiapan Proyek
- **Filosofi Svelte**: Reaktivitas waktu kompilasi, boilerplate minimal, peningkatan progresif
- **Penyiapan Proyek**: Membuat proyek Svelte dengan `npm create svelte@latest`, integrasi Vite, gambaran struktur direktori
- **Arsitektur Komponen**: Struktur file `.svelte` (skrip, markup, gaya), komponen file tunggal, komposisi komponen
- **Sintaks Templat**: Ekspresi dinamis `{}`, rendering HTML dengan `{@html}`, komentar
- **Deklarasi Reaktif**: Sintaks label `$:`, pernyataan reaktif vs penugasan, pelacakan dependensi
- **Props dan Komunikasi Komponen**: `export let` untuk props, `createEventDispatcher` untuk event, penerusan event
- **CSS Terlingkup**: Isolasi gaya tingkat komponen, pengubah `:global()`, properti kustom CSS

### Modul 2: Reaktivitas dan State
- **Pendalaman Pernyataan Reaktif**: Rantai deklarasi reaktif, blok reaktif, efek samping
- **Store**: Store `writable`, `readable`, `derived`, langganan otomatis dengan prefiks `$`, store kustom
- **API Konteks**: `setContext` dan `getContext`, komunikasi pohon komponen tanpa prop drilling
- **Siklus Hidup Komponen**: `onMount`, `onDestroy`, `beforeUpdate`, `afterUpdate`, `tick`
- **Direktif Binding**: `bind:value`, `bind:this`, `bind:group`, `bind:checked`, binding komponen
- **Array dan Objek Reaktif**: Pola pembaruan immutable, operator spread, metode array

### Modul 3: Alur Kontrol dan Logika Templat
- **Rendering Bersyarat**: Blok `{#if}`, `{:else if}`, `{:else}`, `{#if}` dengan promise
- **Rendering Perulangan**: Blok `{#each}`, blok each dengan kunci `{#each items as item (key)}`, destructuring
- **Blok Await**: `{#await}`, `{:then}`, `{:catch}` untuk penanganan promise
- **Penanganan Event**: `on:click`, `on:submit`, pengubah event (`preventDefault`, `stopPropagation`, `once`, `self`), event komponen
- **Direktif Transisi**: `transition:`, `in:`, `out:`, `animate:`, transisi bawaan (fade, fly, slide, scale, blur, crossfade)
- **Direktif Aksi**: Fungsi aksi kustom, `use:action`, aksi dengan parameter

### Modul 4: Routing dan Layout SvelteKit
- **Struktur Proyek SvelteKit**: `src/routes`, `src/lib`, aset statis, variabel lingkungan
- **Routing Berbasis File**: `+page.svelte`, `+page.server.js`, parameter dinamis `[slug]`, parameter sisa `[...path]`
- **Sistem Layout**: `+layout.svelte`, layout bertingkat, `+layout.server.js`, grup layout `(group)`
- **Halaman Error dan Loading**: `+error.svelte`, batas error `+layout.svelte`, `+loading.svelte`
- **Penangan Endpoint**: `+server.js` untuk rute API, penangan GET/POST/PUT/DELETE, pembantu request dan response
- **Resolusi Rute**: Impor alias `@/`, pencocokan rute, pola routing lanjutan

### Modul 5: Pemuatan Data dan Fungsi Server
- **Data Halaman Server**: Fungsi `load` di `+page.server.js`, data bersama `+layout.server.js`
- **Fungsi Load Universal**: `+page.js` dan `+layout.js` untuk data klien + server, kapan menggunakan masing-masing
- **Aksi Formulir**: Objek aksi `+page.server.js`, `use:enhance`, peningkatan progresif, hasil aksi
- **Event Permintaan**: `cookies`, `locals`, `url`, `params`, `request`, `fetch`, `platform`, `setHeaders`
- **Streaming Data**: Streaming promise dalam fungsi load, rendering progresif dengan `{#await}`
- **Strategi Caching**: `setHeaders`, `Cache-Control`, caching CDN, stale-while-revalidate

### Modul 6: Formulir dan Peningkatan Progresif
- **Pendalaman Aksi Formulir SvelteKit**: Aksi bernama, penanganan hasil aksi, redirect dan invalidate
- **Direktif `use:enhance`**: Peningkatan progresif otomatis, siklus pengiriman formulir, callback kustom
- **Validasi Sisi Klien**: Validasi skema Zod, tampilan error dalam formulir, validasi waktu nyata
- **Validasi Sisi Server**: Helper `fail()`, error validasi dalam data formulir, error tingkat bidang
- **Unggahan File**: `multipart/form-data`, penanganan file dalam aksi, unggahan streaming
- **UI Optimistis**: Memperbarui UI sebelum konfirmasi server, pemulihan saat error, callback use:enhance

### Modul 7: Pengujian
- **Pengaturan Pengujian Unit**: Konfigurasi Vitest dengan Svelte, `@sveltejs/vite-plugin-svelte` untuk pengujian
- **Pengujian Komponen**: `@testing-library/svelte`, merender komponen, menanyakan elemen, event pengguna
- **Pengujian Store**: Menguji store reaktif, store derived, logika store kustom
- **Pengujian Rute SvelteKit**: Menguji fungsi load dengan utilitas pengujian `@sveltejs/kit`, mocking `cookies` dan `locals`
- **Pengujian Aksi Formulir**: Pengujian unit aksi formulir, logika validasi, perilaku redirect dan invalidate
- **Pengujian E2E dengan Playwright**: Menyiapkan Playwright, pola page object, menguji navigasi, formulir, dan alur auth
- **Cakupan Pengujian**: Vitest `--coverage`, integrasi CI, ambang batas cakupan

### Modul 8: Autentikasi dan Otorisasi
- **Manajemen Sesi**: Sesi berbasis cookie dengan API `cookies`, cookie yang ditandatangani, store sesi
- **Integrasi OAuth**: Alur OAuth2 dengan SvelteKit, PKCE, login sosial (GitHub, Google)
- **Autentikasi JWT**: Auth berbasis token, pola access/refresh token, cookie httpOnly
- **Rute yang Dilindungi**: Guard fungsi load, pemeriksaan auth `+layout.server.js`, redirect saat akses tidak terautentikasi
- **Kontrol Akses Berbasis Peran**: Model izin, pola middleware dengan hooks.server.js
- **Perlindungan CSRF**: Perlindungan CSRF bawaan SvelteKit, validasi token kustom

### Modul 9: Pola SvelteKit Lanjutan
- **Sistem Hooks**: `hooks.server.js` dan `hooks.client.js`, fungsi `handle` dan `handleError`
- **Modul Khusus Server**: Direktori `$lib/server`, mencegah impor kode server di sisi klien
- **Modul Loading**: Modul `$app`, modul lingkungan (`$env/static/private`, `$env/dynamic/private`, `$env/static/public`, `$env/dynamic/public`)
- **Service Worker**: `src/service-worker.js`, strategi caching, dukungan offline, notifikasi push
- **Integrasi WebSocket**: Penanganan WebSocket sisi server, pembaruan waktu nyata dengan store
- **Internasionalisasi**: `svelte-i18n` atau `typesafe-i18n`, rute yang dilokalkan, pergantian lokal secara dinamis

### Modul 10: Optimalisasi Performa
- **Pemisahan Kode**: Impor dinamis, komponen yang dimuat malas (lazy-loaded), `{#await}` untuk komponen asinkron
- **Optimasi Gambar**: `@sveltejs/enhanced-img`, `svelte-image`, gambar responsif, pemuatan malas
- **Analisis Bundel**: Analisis bundel Vite, tree shaking, chunk manual, kesadaran biaya impor
- **Strategi Rendering Sisi Server**: Mode SSR, `ssr=false` untuk halaman statis, rendering hibrida
- **Generasi Situs Statis**: `adapter-static`, prerender, opsi `prerender` dalam konfigurasi halaman
- **Rendering Edge**: Fungsi edge `adapter-cloudflare` dan `adapter-vercel`, strategi cache
- **Anggaran Performa**: Lighthouse CI, pelacakan Core Web Vitals, pemantauan ukuran bundel

### Modul 11: Aksesibilitas dan Internasionalisasi
- **HTML Semantik di Svelte**: Pola komponen yang dapat diakses, atribut ARIA, anotasi peran
- **Navigasi Keyboard**: Manajemen fokus dengan `bind:this`, fokus trapping, tautan lompat
- **Dukungan Pembaca Layar**: Wilayah langsung (live regions), pengumuman `aria-live`, formulir yang dapat diakses
- **Warna dan Kontras**: Desain sadar tema, kepatuhan WCAG, pertimbangan mode gelap
- **Internasionalisasi (i18n)**: Deteksi lokal, file terjemahan, format tanggal/angka, pluralisasi
- **Pengujian Aksesibilitas**: Integrasi axe-core, `@accesslint/audit`, pemeriksaan aXe Playwright
- **Dukungan RTL**: Penanganan teks kanan-ke-kiri, dukungan tata letak bidirectional

### Modul 12: Deployment dan Proyek Akhir
- **Sistem Adapter**: Adapter Node (`adapter-node`), adapter statis (`adapter-static`), adapter platform (Vercel, Netlify, Cloudflare, AWS Lambda)
- **Konfigurasi Lingkungan**: Variabel lingkungan publik vs privat, file `.env`, konfigurasi khusus deployment
- **Integrasi Berkelanjutan**: GitHub Actions untuk SvelteKit, pipeline lint, test, build
- **Deployment Docker**: Dockerfile untuk SvelteKit dengan adapter Node, multi-stage build, health check
- **Pemantauan dan Analitik**: Pelacakan error dengan Sentry, integrasi analitik, logging
- **Proyek Akhir**: Aplikasi full-stack yang menggabungkan semua konsep yang dipelajari — routing SvelteKit, autentikasi, integrasi database, penanganan formulir, pengujian, dan deployment

## Proyek Akhir

Peserta didik akan membangun **aplikasi web full-stack** yang menunjukkan penguasaan Svelte dan SvelteKit. Proyek akhir harus mencakup:

- **Autentikasi Pengguna**: Registrasi, login, dan manajemen sesi dengan autentikasi berbasis cookie atau OAuth
- **Lapisan Data**: Pemuatan data sisi server dengan fungsi load, aksi formulir untuk mutasi, integrasi database melalui adapter server
- **Routing**: Beberapa segmen rute, parameter dinamis, layout bertingkat, batas error
- **Manajemen State**: Store atau API Konteks untuk state sisi klien, sinkronisasi state server
- **Peningkatan Progresif**: Aksi formulir dengan `use:enhance`, degradasi anggun, UI optimistis
- **Pengujian**: Pengujian unit untuk komponen dan store, pengujian E2E Playwright untuk alur pengguna kritis
- **Aksesibilitas**: Markup sesuai WCAG, navigasi keyboard, dukungan pembaca layar
- **Deployment**: Deployment kontainer dengan Docker atau adapter platform (Vercel, Netlify, Cloudflare)

Contoh ide proyek: papan tugas kolaboratif waktu nyata, platform berbagi resep sosial, dasbor manajemen proyek dengan ruang kerja tim.

## Kriteria Penilaian

- **Tugas Modul (40%)**: Latihan langsung mingguan setelah setiap modul, dikirimkan sebagai pull request
- **Proyek Tengah Semester (20%)**: Aplikasi SvelteKit multi-halaman yang menunjukkan routing, pemuatan data, formulir, dan autentikasi, dievaluasi berdasarkan kebenaran, kualitas kode, dan cakupan pengujian
- **Proyek Akhir (40%)**: Aplikasi full-stack dievaluasi berdasarkan:
  - Kelengkapan fungsional dan pengalaman pengguna
  - Organisasi kode dan praktik terbaik Svelte
  - Cakupan pengujian (>70% untuk pengujian unit, alur E2E kritis)
  - Kepatuhan aksesibilitas (WCAG 2.1 AA)
  - Metrik performa (skor Lighthouse >80)
  - Kualitas deployment dan dokumentasi

## Referensi

- [Dokumentasi Resmi Svelte](https://svelte.dev/docs)
- [Dokumentasi Resmi SvelteKit](https://kit.svelte.dev/docs)
- [Tutorial Svelte (Interaktif)](https://learn.svelte.dev/)
- [Dokumentasi Vitest](https://vitest.dev/guide/)
- [Dokumentasi Playwright](https://playwright.dev/docs/intro)
- [Panduan Aksesibilitas Web MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Svelte Testing Library](https://testing-library.com/docs/svelte-testing-library/intro)
- [Resep Svelte Society](https://sveltesociety.dev/recipes)

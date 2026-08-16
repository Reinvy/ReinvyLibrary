---
title: "Silabus Arsitektur Svelte 5 Runes dan SvelteKit Tingkat Lanjut"
description: "Kurikulum 12 minggu tingkat lanjut untuk pengembang Svelte berpengalaman yang mencakup model reaktivitas runes Svelte 5, snippets dan render props, server islands, arsitektur state berskala besar, pemuatan dan cache data tingkat lanjut, rekayasa performa, penguatan keamanan, observabilitas, dan desain aplikasi berskala monorepo."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Arsitektur Svelte 5 Runes dan SvelteKit Tingkat Lanjut

## Ringkasan

Silabus 12 minggu tingkat lanjut ini dirancang untuk pengembang yang sudah membangun aplikasi dengan Svelte dan SvelteKit dan ingin menguasai framework tersebut pada skala produksi. Sementara kurikulum Svelte pengantar berfokus pada sintaks komponen, stores, formulir, dan cara men-deploy aplikasi, kursus ini melangkah satu tingkat lebih dalam: model reaktivitas runes Svelte 5 (`$state`, `$derived`, `$effect`, `$props`, dan lainnya), snippets sebagai primitif komposisi, server islands dan strategi rendering tingkat lanjut, invalidasi cache dan pola data streaming, rekayasa performa dengan anggaran terukur, penguatan keamanan, observabilitas, serta pengorganisasian basis kode besar dengan monorepo dan micro-frontend.

Setiap modul memasangkan fondasi konseptual yang mendalam dengan lab langsung yang mengharuskan membaca keluaran compiler, memprofilkan aplikasi nyata, dan merancang diagram arsitektur. Kursus ini berpuncak pada proyek akhir di mana peserta didik merancang dan membangun aplikasi SvelteKit berskala besar untuk tim multi-anggota dengan arsitektur state berbasis runes, server islands, tata letak paket monorepo, dan observabilitas produksi.

Di akhir kursus ini, peserta didik akan mampu menjelaskan bagaimana compiler Svelte mengubah runes menjadi reaktivitas fine-grained, memigrasikan pohon komponen lama dari `$:` ke runes, merancang API komponen berbasis snippet, memilih di antara SSR, statis, client-side, dan server islands per rute, membangun pipeline pemuatan data yang tangguh dengan invalidasi cache, memprofilkan serta mengoptimalkan performa bundle dan runtime, menguatkan aplikasi terhadap serangan web umum, dan mengoperasikan layanan SvelteKit di produksi dengan tracing dan feature flags.

## Kurikulum

### Modul 1: Model Runes dan Migrasi Svelte 5 (Minggu 1)

- **Dari `$:` ke runes**
  - Mengapa Svelte 5 mengganti deklarasi reaktif `$:` dan props `export let` dengan runes
  - Pergeseran model mental: penanda reaktivitas eksplisit, bukan inferensi compiler
  - `$state`, `$derived`, `$effect`, `$props`, `$bindable`, `$inspect`, `$host` sekilas
- **Reaktivitas universal**
  - Menggunakan runes di luar komponen: modul `.svelte.ts` dan `.svelte.js`
  - State reaktif dalam kelas biasa dan modul fungsi
  - Mode runes vs mode legacy: memilih file dengan flag compiler `runes`
- **Strategi migrasi**
  - Alat migrasi otomatis dan keterbatasannya
  - `$props()` vs `export let`: destructuring, nilai bawaan, dan rest props
  - Mengonversi stores ke runes dan sebaliknya: pola interoperabilitas
  - Jebakan migrasi umum: `$effect` terlalu sering terpicu, semantik snapshot, perubahan `bind:`
- **Lab Langsung**: Migrasikan aplikasi Svelte 4 legacy multi-komponen ke runes, memverifikasi setiap perubahan perilaku dengan panduan migrasi Svelte 5

### Modul 2: Internal Reaktivitas dan Pendalaman Runes (Minggu 2)

- **Bagaimana runes dikompilasi**
  - Membaca keluaran compiler: `svelte.compile` dan panggilan sinyal yang dihasilkan
  - Sinyal di baliknya: `set`, `get`, `safe_not_equal`, dan graf reaktif
  - Pembaruan fine-grained vs diffing virtual DOM: mengapa Svelte 5 menghindari menjalankan ulang seluruh komponen
- **Rune `$state` secara mendalam**
  - `$state.raw` untuk objek dan array besar yang tidak reaktif
  - `$state.snapshot` dan meneruskan state reaktif melintasi batas
  - Reaktivitas dalam, proxy, dan semantik `structuredClone` pada snapshot
- **Rune `$effect` secara mendalam**
  - Dependensi, urutan efek, dan `$effect.pre`
  - `$effect.tracking` untuk mendeteksi konteks reaktif
  - `$effect.root` untuk manajemen siklus hidup efek manual
  - Kapan tidak menggunakan efek: nilai turunan dan event handler lebih dulu
- **Rune `$derived` secara mendalam**
  - `$derived.by` untuk derivasi multi-pernyataan
  - Evaluasi lazy dan caching nilai turunan
  - Menghindari rantai turunan yang menghitung ulang graf yang sama
- **Kontrol `untrack` dan `deep`**
  - Mengabaikan dependensi dengan `untrack`
  - Memilih reaktivitas dalam dengan `deep` pada `$state`
- **Lab Langsung**: Instrumentasikan komponen dengan log `$inspect` dan `$effect`, telusuri graf dependensinya, dan restrukturisasi komponen yang `$effect`-nya terlalu sering terpicu

### Modul 3: Komposisi Komponen Tingkat Lanjut dengan Snippets (Minggu 3)

- **Snippets sebagai primitif komposisi baru**
  - Dasar `{#snippet nama()}` dan `{@render nama()}`
  - Props snippet: meneruskan markup sebagai data
  - Konten snippet bawaan dengan `children`
- **Render props dan komponen tanpa render**
  - Membangun komponen renderless dengan snippets
  - Kontrak `{@render}` dan props snippet bertipe di TypeScript
  - Membandingkan snippets dengan sintaks slot lama dan mengapa slot tidak digunakan lagi dalam mode runes
- **Snippets rekursif dan bersarang**
  - Snippets rekursif untuk pohon dan data bersarang
  - Meneruskan snippets ke snippets: pola snippet tingkat tinggi
  - Daftar snippet ber-`key` dan masalah memoization
- **Merancang API snippets**
  - Kapan menggunakan props snippet vs props komponen vs slot
  - Stabilitas API: kontrak snippet sebagai antarmuka publik
  - Mendokumentasikan props snippet untuk design system
- **Lab Langsung**: Refaktor komponen data-table dari komposisi berbasis slot ke berbasis snippet, lalu bangun komponen renderless `<Query>` yang menerima snippet query, loading, dan error

### Modul 4: Strategi Rendering Tingkat Lanjut dan Server Islands (Minggu 4)

- **Mode rendering ditinjau ulang**
  - CSR, SSR, SSG/prerender, dan fallback SPA: memilih per rute
  - Opsi halaman `ssr`, `prerender`, dan `csr` secara mendalam
  - Rendering hibrida: mencampur mode dalam satu aplikasi
- **Server Islands**
  - Fitur eksperimental `server-islands`: men-cache region dinamis di dalam halaman statis
  - Props island, lazy loading, dan konten fallback
  - Kapan server islands mengungguli SSR penuh dan kapan tidak
- **Streaming dan rendering progresif**
  - Streaming promise dari fungsi load ke klien
  - `{#await}` dengan data streaming dan UI kerangka
  - Menggabungkan streaming dengan server islands untuk konten personal
- **Rendering edge dan adapters**
  - Pemilihan adapter: node, static, vercel, netlify, cloudflare, dan edge functions
  - Men-deploy ke runtime edge: batasan pada API Node
  - Kontrol cache di edge: `Cache-Control`, aturan CDN, dan `setHeaders`
- **Lab Langsung**: Ubah halaman daftar produk menjadi HTML statis yang di-prerender dengan server island untuk keranjang personal, lalu ukur TTFB dan LCP sebelum dan sesudah

### Modul 5: Arsitektur State untuk Aplikasi Besar (Minggu 5)

- **Runes vs stores: memilih primitif yang tepat**
  - Kapan stores masih menang: pustaka lintas framework, kode legacy, singleton modul
  - Mengonversi state berbasis store ke runes: pola dan trade-off
  - Arsitektur hibrida: runes di komponen, stores di batas
- **Pola state berbasis context**
  - `setContext` dan `getContext` dengan runes
  - Pohon state ter-scope: state per-rute, per-fitur, per-instansi
  - Menghindari bug state global: state tingkat modul sebagai anti-pola
- **Server state dan cache klien**
  - Fungsi load SvelteKit sebagai sumber kebenaran
  - Lapisan cache klien: TanStack Query, store ala SWR, dan cache kustom
  - Pembaruan optimistis dan strategi invalidasi cache
- **State formulir berskala besar**
  - Superforms dan validasi zod untuk formulir kompleks
  - State formulir multi-langkah dengan runes
  - Persistensi draf dan antrean offline
- **Lab Langsung**: Rancang pohon state berbasis runes untuk dashboard multi-tenant dengan context per-tenant, lalu integrasikan cache server-state untuk data jarak jauh

### Modul 6: Pemuatan Data Tingkat Lanjut, Cache, dan Streaming (Minggu 6)

- **Arsitektur fungsi load**
  - Pemuatan data paralel dan eliminasi waterfall
  - Data layout bersama vs data halaman: semantik `invalidate` dan `invalidateAll`
  - `depends` dan kunci invalidasi kustom
- **Header cache dan CDN**
  - Strategi `Cache-Control` untuk data terautentikasi dan publik
  - `setHeaders` dalam fungsi load dan hooks
  - Pola stale-while-revalidate dan revalidasi latar belakang
- **Pola data streaming**
  - Data tertunda dengan promise dalam `load`
  - Respons ter-chunk dan SSE untuk data langsung
  - Pola integrasi WebSocket untuk fitur real-time
- **Penanganan error dalam pipeline data**
  - Semantik `error()` dan `redirect()`
  - Error yang diharapkan vs tidak diharapkan: `handleError` dalam hooks
  - Data fallback dan degradasi yang anggun
- **Lab Langsung**: Profil rute yang berat waterfall, paralelkan fungsi load-nya, tambahkan invalidasi berbasis `depends`, dan streaming endpoint laporan lambat dengan promise

### Modul 7: Routing dan Middleware SvelteKit Tingkat Lanjut (Minggu 7)

- **Route groups dan layout tingkat lanjut**
  - Layout `(group)`, override `+layout@`, dan resolusi layout tingkat rute
  - Pola reset `+page@` dan `+layout@`
  - Parameter opsional dan rest, pencocokan rute dengan fungsi `match`
- **Hooks dan middleware**
  - `handle`, `handleFetch`, `handleError`, dan `reroute` secara mendalam
  - Komposisi urutan dari beberapa hooks
  - Injeksi request ID, middleware logging, dan middleware auth
- **Batas kode server-only dan isomorfik**
  - `$lib/server` dan graf modul server-only
  - `$env/static/*` vs `$env/dynamic/*` dan inlining waktu build
  - Mencegah kebocoran rahasia ke bundle klien
- **Form actions tingkat lanjut**
  - Named actions, komposisi aksi, dan pengiriman formulir lintas rute
  - Kustomisasi `use:enhance` dan kontrol konkurensi optimistis
  - Upload file dengan streaming dan event progres
- **Lab Langsung**: Bangun shell aplikasi multi-tenant dengan route groups, urutan hook yang menambahkan request ID dan pemeriksaan auth, serta formulir named-action dengan pembaruan optimistis

### Modul 8: Rekayasa Performa Berskala Besar (Minggu 8)

- **Optimasi bundle**
  - Menganalisis bundle dengan `vite-bundle-visualizer` dan keluaran Rollup
  - Code splitting, dynamic import, dan pemuatan rute lazy
  - Tree-shaking kode runes dan menghindari dependensi besar yang tidak disengaja
- **Performa runtime**
  - Profiling dengan panel performa browser dan peringatan dev Svelte
  - Menghindari layout thrash dan kerja `$effect` yang tidak perlu
  - Virtualisasi daftar panjang: `svelte-virtual-list` dan windowing kustom
- **Performa gambar dan aset**
  - `enhanced:img` dan pipeline gambar SvelteKit
  - Gambar responsif, srcset, dan format modern
  - Pemuatan font dan pengiriman CSS
- **Anggaran Core Web Vitals**
  - Anggaran LCP, INP, CLS dan penegakan di CI
  - Lighthouse CI dan asersi performa Playwright
  - Integrasi real-user monitoring
- **Lab Langsung**: Profil rute lambat, terapkan optimasi gambar dan code splitting, lalu pasang anggaran Lighthouse CI yang menggagalkan build saat terjadi regresi

### Modul 9: Strategi Pengujian Tingkat Lanjut (Minggu 9)

- **Menguji runes dan logika reaktif**
  - Unit test modul `.svelte.ts` secara terisolasi
  - Menguji perilaku `$effect` dengan fake timer Vitest
  - Snapshot testing keluaran compiler dari runes
- **Pengujian komponen dengan snippets**
  - Menguji props snippet dengan `@testing-library/svelte`
  - Pola pengujian komponen renderless
  - Mocking context dan data load
- **Pengujian integrasi dan E2E**
  - Playwright untuk perjalanan pengguna kritis
  - Menguji server islands dan respons streaming
  - Mocking API dan intersepsi permintaan
- **Pengujian regresi visual dan aksesibilitas**
  - Regresi visual dengan screenshot Playwright
  - Pemeriksaan aksesibilitas aXe otomatis di CI
  - Alur kerja component storybook untuk design system
- **Lab Langsung**: Bangun piramida pengujian untuk fitur berbasis runes: unit test untuk modul state, pengujian komponen untuk API snippet, dan pengujian E2E untuk alur yang dirender island

### Modul 10: Penguatan Keamanan (Minggu 10)

- **Autentikasi dan otorisasi berskala besar**
  - Manajemen sesi dengan cookie httpOnly dan rotasi
  - Pola integrasi OAuth2 dan OIDC dengan SvelteKit
  - Kontrol akses berbasis peran dan atribut dalam hooks
- **Permukaan serangan aplikasi web**
  - Vektor XSS dalam `{@html}` dan konten pengguna
  - Proteksi CSRF: pemeriksaan asal bawaan SvelteKit dan token kustom
  - Keamanan injeksi SQL dan query ORM
  - Open redirect dan SSRF dalam fungsi load yang banyak fetch
- **Header keamanan dan CSP**
  - Content Security Policy dengan skrip inline SvelteKit
  - `X-Frame-Options`, `Referrer-Policy`, dan `Permissions-Policy`
  - HSTS dan flag cookie aman
- **Keamanan dependensi dan supply chain**
  - Integritas lockfile dan `npm audit` di CI
  - Generasi SBOM dan pemindaian kerentanan
  - Rate limiting dan pencegahan penyalahgunaan di edge
- **Lab Langsung**: Perkuat aplikasi contoh terhadap daftar periksa: CSP, flag cookie, CSRF, dan alur OAuth dengan PKCE, lalu verifikasi dengan OWASP ZAP atau pemindai serupa

### Modul 11: Observabilitas, Feature Flags, dan Operasi Produksi (Minggu 11)

- **Logging terstruktur dan tracing**
  - Request ID dan correlation ID melalui hooks
  - Instrumentasi OpenTelemetry untuk SvelteKit
  - Distributed tracing melintasi fungsi load dan panggilan eksternal
- **Pelacakan error dan alerting**
  - Integrasi Sentry dan `handleError`
  - Source maps untuk bundle produksi yang diminifikasi
  - Alerting pada tingkat error dan SLO latensi
- **Feature flags dan pengiriman progresif**
  - Evaluasi flag sisi server dan sisi klien
  - Rendering yang digerakkan flag dengan server islands
  - A/B testing dan rilis canary
- **Monitoring dan analitik**
  - Real-user monitoring untuk Web Vitals
  - Pelacakan event kustom dengan analitik ramah privasi
  - Monitoring biaya dan kapasitas untuk deployment serverless
- **Lab Langsung**: Instrumentasikan aplikasi SvelteKit yang di-deploy dengan trace OpenTelemetry dan Sentry, tambahkan feature flag yang mengganti varian server island, dan verifikasi trace di dashboard

### Modul 12: Monorepo, Micro-Frontend, dan Proyek Akhir (Minggu 12)

- **Arsitektur monorepo**
  - pnpm workspaces dan Turborepo untuk proyek SvelteKit
  - Paket bersama: UI kit, konfigurasi, tipe, dan skema validasi
  - Build caching dan orkestrasi tugas
- **Micro-frontend dengan Svelte**
  - Module federation dan deployment independen
  - Menyusun islands dari aplikasi beberapa tim
  - Design system bersama dan strategi versioning
- **Design system dengan Svelte**
  - API komponen berbasis snippet untuk design system
  - Token tema dan CSS custom properties
  - Dokumentasi dengan Storybook dan playground interaktif
- **Proyek akhir**
  - Persyaratan, tinjauan arsitektur, dan alur kerja tim
  - Anggaran performa, keamanan, dan observabilitas
  - Kriteria presentasi dan code review
- **Lab Langsung**: Buat monorepo dengan paket UI bersama dan dua aplikasi SvelteKit, susun server island dari paket bersama, dan presentasikan arsitektur proyek akhir

## Proyek Akhir

Peserta didik akan merancang dan membangun **aplikasi SvelteKit berskala produksi** yang menunjukkan penguasaan runes Svelte 5 dan arsitektur SvelteKit tingkat lanjut. Proyek akhir harus mencakup:

- **Arsitektur state berbasis runes**: Modul state `.svelte.ts` dengan `$state`, `$derived`, dan `$effect` yang digunakan dengan benar, plus state ter-scope context untuk isolasi multi-tenant atau multi-fitur
- **Rendering tingkat lanjut**: Setidaknya satu server island, satu rute yang di-prerender, dan satu alur data streaming
- **API komponen berbasis snippet**: Komponen renderless atau komposabel yang mengekspos props snippet, didokumentasikan sebagai antarmuka publik
- **Pipeline data**: Fungsi load paralel, invalidasi berbasis `depends`, dan pembaruan optimistis dengan kontrol cache
- **Keamanan**: CSP, flag cookie aman, formulir aman CSRF, dan alur auth berbasis OAuth atau sesi
- **Pengujian**: Unit test untuk modul state reaktif, pengujian komponen untuk API snippet, dan Playwright E2E untuk perjalanan kritis
- **Observabilitas**: Logging terstruktur dengan request ID, pelacakan error, dan setidaknya satu feature flag
- **Tata letak monorepo**: Paket bersama (UI, tipe, konfigurasi) yang dikonsumsi oleh setidaknya satu aplikasi atau paket lain

Contoh ide proyek: dashboard analitik multi-tenant dengan island per-tenant, toko e-commerce dengan katalog yang di-prerender dan island keranjang personal, atau platform kolaborasi real-time dengan pembaruan streaming dan UI optimistis.

## Kriteria Penilaian

- **Lab Modul (40%)**: Lab langsung mingguan yang dikirim sebagai pull request, dievaluasi berdasarkan kebenaran, pilihan arsitektur, dan refleksi tertulis
- **Tinjauan Arsitektur Tengah Semester (20%)**: Dokumen arsitektur tertulis plus walkthrough kode yang mencakup desain runes, strategi rendering, dan arsitektur state, dievaluasi berdasarkan kejelasan dan analisis trade-off
- **Proyek Akhir (40%)**: Dievaluasi berdasarkan:
  - Kelengkapan fungsional dan kegunaan dunia nyata
  - Penggunaan runes yang benar dan idiomatis (tanpa penyalahgunaan `$effect`, semantik snapshot yang tepat)
  - Kesesuaian strategi rendering (islands, prerender, streaming dipilih dengan tepat)
  - Cakupan pengujian (>70% untuk unit test, alur E2E kritis)
  - Kepatuhan daftar periksa keamanan dan header yang diperkuat
  - Anggaran performa (skor Lighthouse >80, LCP < 2,5 detik, INP < 200 ms)
  - Kualitas observabilitas (request ID, trace, pelacakan error)
  - Organisasi kode dan struktur monorepo

## Referensi

- [Dokumentasi Svelte 5](https://svelte.dev/docs/svelte)
- [Panduan Migrasi Svelte 5](https://svelte.dev/docs/svelte/v5-migration-guide)
- [Dokumentasi SvelteKit](https://kit.svelte.dev/docs)
- [Server Islands (SvelteKit)](https://kit.svelte.dev/docs/server-islands)
- [Superforms (Pustaka Formulir untuk SvelteKit)](https://superforms.rocks/)
- [TanStack Query untuk Svelte](https://tanstack.com/query/latest/docs/framework/svelte/overview)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [Dokumentasi Sentry SvelteKit](https://docs.sentry.io/platforms/javascript/guides/sveltekit/)
- [Dokumentasi Turborepo](https://turborepo.com/docs)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

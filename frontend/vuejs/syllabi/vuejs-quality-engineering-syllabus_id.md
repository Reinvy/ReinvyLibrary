---
title: "Silabus Rekayasa Kualitas Vue.js"
description: "Kurikulum 8 minggu tingkat lanjut yang mencakup seluruh tumpukan rekayasa kualitas untuk aplikasi Vue.js 3: strategi pengujian dan piramida pengujian frontend, pengujian unit dengan Vitest dan Vue Test Utils, pengujian composable dan store Pinia, pengujian komponen dan interaksi, pengujian end-to-end dengan Playwright, pengujian regresi visual dan aksesibilitas, pengujian mutasi dan kontrak, anggaran performa, serta gerbang kualitas CI/CD dengan proyek akhir berupa pipeline kualitas kelas produksi."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Kualitas Vue.js

## Ringkasan

Silabus 8 minggu ini dirancang untuk pengembang Vue.js yang ingin melampaui mentalitas "di mesin saya jalan" dan membangun kepercayaan yang terukur serta dapat diulang pada basis kode frontend. Rekayasa kualitas memperlakukan pengujian sebagai sebuah disiplin: setiap lapisan piramida pengujian disengaja, setiap tes membuktikan nilainya, dan setiap penggabungan kode dijamin oleh sinyal kualitas otomatis, bukan pengecekan manual. Kurikulum ini mencakup pengujian unit dengan Vitest dan Vue Test Utils, pengujian composable dan store Pinia secara terisolasi, pengujian komponen dan interaksi, pengujian end-to-end dengan Playwright, pengujian regresi visual dan audit aksesibilitas, pengujian mutasi dan kontrak, anggaran performa, serta perangkat CI/CD yang mengubah semuanya menjadi gerbang kualitas. Di akhir program, peserta akan membangun pipeline kualitas lengkap untuk aplikasi Vue.js yang realistis — pipeline yang menjalankan ratusan tes, memblokir regresi, dan menghasilkan laporan kualitas yang mudah dibaca pada setiap pull request.

## Kurikulum

### Minggu 1: Strategi Pengujian dan Lanskap Pengujian Vue

- Mode kegagalan QA manual: kebutaan regresi, kelelahan klik, dan biaya penemuan bug yang terlambat
- Piramida pengujian frontend: unit → komponen → e2e, dan di mana aplikasi Vue sebenarnya gagal
- Apa yang diuji dalam aplikasi Vue: props dan emits, state turunan, alur pengguna, output yang dirender; apa yang tidak diuji: internal framework, detail implementasi, snapshot indah untuk segala hal
- Struktur dan penamaan tes: Arrange-Act-Assert, nama tes berbasis perilaku, tata letak file tes per fitur
- Mengatur runner: Vitest dengan `jsdom` dan `happy-dom`, bagian test di `vite.config.ts`, globals vs impor eksplisit
- Perkakas cakupan kode: provider `v8`, ambang cakupan, dan ekonomi cakupan (baris mana yang pantas mendapat 100%)
- **Latihan**: Siapkan proyek Vite + Vue 3 dengan Vitest terkonfigurasi, tambahkan skrip `npm run test` yang bisa dijalankan CI, dan tulis pengujian unit pertama untuk fungsi utilitas murni

### Minggu 2: Dasar Pengujian Unit dengan Vitest dan Vue Test Utils

- Strategi mounting: `mount` vs `shallowMount`, kapan stubbing komponen anak adalah keputusan yang tepat, dan trade-off dengan ketahanan refaktor
- Menguji permukaan input komponen: variasi `props`, default `defineProps`, asersi payload `defineEmits` dengan `emitted()`
- Menguji slot dan scoped slot: merender konten slot, meng-assert props slot
- Perilaku komponen asinkron: `flushPromises`, `nextTick`, menunggu pembaruan bertingkat, menguji fetch di `onMounted`
- Strategi mocking: mock modul `vi.mock`, spy parsial `vi.spyOn`, asersi panggilan `vi.fn`, `vi.stubGlobal` untuk API browser
- Meng-assert output yang dirender: kueri teks dan struktur, konvensi data-testid, menghindari over-assertion
- **Latihan**: Uji unit komponen tabel data — rendering berbasis props, emit saat baris dipilih, state loading dan kosong, pemuatan data asinkron

### Minggu 3: Menguji Composable dan Store Pinia Secara Terisolasi

- Mengapa composable layak mendapat harness pengujian sendiri: logika yang diekstrak dari pohon komponen
- Menguji state reaktif: meng-assert mutasi `ref`/`reactive` setelah pemanggilan composable, penjadwalan efek dengan `effectScope`
- Menguji `computed` dan `watch`: asersi state turunan, kondisi pemicu callback watch, perilaku pembersihan
- Menguji logika berbasis waktu: fake timers Vitest (`vi.useFakeTimers`), composable debounce/throttle, loop polling
- Menguji store Pinia dengan `createTestingPinia`: pengujian unit store tanpa aplikasi sungguhan, mock dependensi store
- Menguji aksi store yang memanggil API: menyuntikkan klien yang di-mock, meng-assert transisi state loading/error/success
- Menguji pasangan `provide`/`inject`: menulis komponen harness yang mengonsumsi injection keys
- **Latihan**: Ekstrak composable `usePagination` dan store Pinia `useAuthStore` dari aplikasi yang ada, lalu tulis rangkaian unit lengkap untuk keduanya

### Minggu 4: Pola Pengujian Komponen dan Interaksi

- Dari `trigger` ke `user-event`: simulasi interaksi realistis, `@testing-library/user-event`, semantik keyboard dan pointer
- Menguji alur kompleks: formulir multi-langkah, field yang saling bergantung, tampilan error validasi, jalur submit
- Pengujian router: `createRouter` dengan `createMemoryHistory`, mock `useRoute`/`useRouter`, meng-assert navigasi setelah aksi
- Menguji komponen teleport dan transition: target mounting `Teleport`, stubbing transition, `TransitionStub`
- Menguji batas provide/inject dan komposisi komponen: komponen wrapper, `global.provide`
- Menguji error boundary dan suspense: asersi `onErrorCaptured`, konten fallback komponen async
- Higiene tes flaky: selektor deterministik, menghindari sleep berbasis waktu, membatasi lingkup kueri
- **Latihan**: Bangun dan uji formulir checkout interaktif — state validasi, reaktivitas ringkasan keranjang, submit pesanan dengan navigasi rute

### Minggu 5: Pengujian End-to-End dengan Playwright

- Filosofi e2e: perjalanan pengguna di atas potongan halaman, menjaga kecepatan suite agar bisa berjalan di setiap PR
- Setup proyek Playwright untuk aplikasi Vue: konfigurasi webServer, baseURL, trace dan screenshot saat gagal
- Model page object: merangkum selektor dan aksi, skenario tes yang dapat dibaca dalam bahasa sederhana
- Intersepsi dan mocking jaringan: `page.route`, stubbing API untuk eksekusi e2e yang deterministik, memblokir permintaan pihak ketiga
- Fixture dan data tes: fungsi factory, state backend yang di-seed, isolasi antar-tes
- Pengujian lintas browser dan viewport mobile: proyek browser, preset devices, asersi responsif
- Debugging kegagalan e2e: trace viewer, mode `--ui`, inspeksi langkah demi langkah
- **Latihan**: Tulis suite e2e perjalanan pembelian lengkap — daftar produk, keranjang, checkout, konfirmasi pesanan — dengan respons API yang di-mock dan cakupan viewport mobile

### Minggu 6: Pengujian Regresi Visual dan Aksesibilitas

- Mengapa regresi visual lolos dari pengujian unit: CSS, mesin rendering, dan konteks tata letak
- Pengujian visual dengan Storybook + Chromatic: cakupan story sebagai kontrak visual, alur review, baseline dan persetujuan
- Strategi snapshot dan pemeliharaan: kapan snapshot membantu (ikon, grafik, design token) dan kapan menjadi kebisingan
- Pengujian aksesibilitas: integrasi axe-core (`jest-axe` di tes komponen, `@axe-core/playwright` di e2e), pemeriksaan WCAG 2.2 AA
- Pengujian navigasi keyboard dan manajemen fokus: urutan tab, fokus trap, skip links
- Kontras warna dan penskalaan teks: asersi kontras otomatis, checklist verifikasi manual
- Membangun gerbang regresi a11y: kegagalan axe menggagalkan CI, ambang keparahan, storybook addon a11y
- **Latihan**: Tambahkan cakupan regresi visual ke kumpulan komponen design system dan pasang axe-core di suite komponen serta suite e2e

### Minggu 7: Teknik Kualitas Tingkat Lanjut

- Pengujian mutasi dengan StrykerJS: mengukur efektivitas tes, rasio `kill`, triase mutant yang bertahan, run mutasi inkremental
- Pengujian kontrak: MSW untuk simulasi kontrak API di tes, Pact untuk kontrak consumer-driven dengan tim backend
- Pengujian berbasis properti dengan `fast-check`: menghasilkan input, asersi invarian, menyusutkan kasus yang gagal
- Rekayasa data tes: factory dengan Faker, seeder, menghindari fixture mutable yang dibagi
- Pengujian performa: anggaran Lighthouse CI (LCP, TBT, CLS, ukuran bundle), gerbang regresi performa, alur profiling
- Manajemen tes flaky: strategi karantina, kebijakan retry, analisis akar masalah, dashboard flake
- Menguji kode yang sensitif terhadap performa: profiling CPU di tes, asersi virtualisasi daftar besar
- **Latihan**: Jalankan Stryker pada suite komponen dari Minggu 2, perbaiki klaster mutant terlemah, dan tambahkan anggaran Lighthouse CI ke alur pull request

### Minggu 8: Gerbang Kualitas dan Integrasi CI/CD

- Mendesain gerbang kualitas penggabungan: suite mana yang berjalan pada event apa (PR, push ke main, nightly), paralelisme dan sharding
- Ambang cakupan sebagai kebijakan: cakupan diff vs cakupan total, menggagalkan build pada baris berubah yang tidak tercakup
- Desain pipeline CI: workflow GitHub Actions untuk Vitest, Playwright, Chromatic, Lighthouse CI; penerbitan artefak dan laporan
- Pelaporan dan visibilitas tes: JUnit XML, lencana cakupan, dasbor kualitas, pelacakan tren
- Branch protection dalam praktik: required checks, wiring status checks, persyaratan review
- Budaya dan metrik kualitas: tingkat kebocoran cacat, time-to-green, flake rate; menggunakan metrik untuk mendorong perubahan proses
- Peran rekayasa kualitas: mengadvokasi gerbang, menulis perbaikan testability ke dalam komponen, mentoring
- **Integrasi capstone**: gabungkan setiap lapisan dari Minggu 1-7 menjadi satu pipeline kualitas kelas produksi
- **Latihan**: Terapkan pipeline kualitas capstone pada repositori sungguhan dan hasilkan laporan kualitas tertulis yang mencakup cakupan, skor mutasi, temuan a11y, anggaran performa, dan riwayat flake

## Proyek Akhir

Peserta membangun **pipeline kualitas** untuk aplikasi Vue.js 3 yang realistis (aplikasi bergaya dashboard dengan formulir, tabel data, logika berbasis composable, dan navigasi terarah). Hasil akhirnya adalah pipeline yang berjalan pada setiap pull request dan mencakup: suite unit dan komponen dengan penegakan cakupan diff, suite e2e yang mencakup perjalanan pengguna utama, baseline regresi visual untuk komponen design system, gerbang aksesibilitas berbasis axe, skor mutasi Stryker di atas ambang yang disepakati untuk modul kritis, anggaran performa Lighthouse CI, dan workflow CI yang melaporkan semua sinyal dalam komentar pull request. Laporan kualitas tertulis mendokumentasikan strategi, metrik, dan bagaimana setiap gerbang mengubah kemampuan tim untuk meluncurkan dengan percaya diri.

## Kriteria Penilaian

- **Tugas**: Latihan mingguan dinilai berdasarkan kualitas tes, bukan volume: asersi yang bermakna (tanpa tes tautologis), isolasi unit yang benar, penanganan asinkron yang deterministik, dan batas mocking yang tepat. Setiap minggu mencakup kuis singkat tentang konsep minggu tersebut (trade-off piramida pengujian, strategi mocking, desain gerbang).
- **Proyek Akhir**: Pipeline capstone divalidasi terhadap checklist: setiap lapisan tes hadir dan hijau, penegakan cakupan diff aktif, skor mutasi mencapai ambang yang disepakati, suite e2e berjalan di workflow CI, gerbang a11y dan performa terpasang, laporan diterbitkan, dan laporan kualitas tertulis mencerminkan sinyal yang diukur secara akurat. Kredit juga diberikan untuk pengecualian yang dapat dipertahankan — tes yang sengaja dilewati dengan alasan terdokumentasi lebih bernilai daripada tes yang ditulis hanya untuk menaikkan angka cakupan.

## Referensi

- [Dokumentasi Vitest](https://vitest.dev/) — test runner, mocking, fake timers, cakupan
- [Vue Test Utils](https://test-utils.vuejs.org/) — mounting, event yang dipancarkan, slot, stubs
- [Testing Library — Vue Testing Library](https://testing-library.com/docs/vue-testing-library/intro/) — kueri dan interaksi yang berpusat pada pengguna
- [Dokumentasi Playwright](https://playwright.dev/docs/intro) — pengujian e2e, page objects, intersepsi jaringan
- [Panduan pengujian Pinia](https://pinia.vuejs.org/cookbook/testing.html) — pengujian unit store dengan `createTestingPinia`
- [StrykerJS](https://stryker-mutator.io/) — pengujian mutasi
- [MSW (Mock Service Worker)](https://mswjs.io/) — mocking API di tes
- [Pact](https://docs.pact.io/) — pengujian kontrak consumer-driven
- [fast-check](https://fast-check.dev/) — pengujian berbasis properti
- [axe-core](https://github.com/dequelabs/axe-core) — mesin aturan aksesibilitas
- [Chromatic](https://www.chromatic.com/) — pengujian regresi visual untuk Storybook
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) — anggaran dan gerbang performa

---
title: "Silabus Rekayasa E-Commerce SvelteKit"
description: "Kurikulum 12 minggu tingkat lanjut untuk membangun storefront dan platform e-commerce kelas produksi dengan SvelteKit, mencakup arsitektur headless commerce, katalog produk dan pencarian faceted, rekayasa keranjang dan checkout, integrasi pembayaran dan webhook, manajemen pesanan, inventaris dan harga, personalisasi, anggaran performa, kepatuhan fraud dan PCI-DSS, serta observabilitas e-commerce."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa E-Commerce SvelteKit

## Ringkasan

Silabus 12 minggu tingkat lanjut ini dirancang untuk pengembang yang sudah membangun aplikasi dengan Svelte dan SvelteKit dan ingin menguasai disiplin khusus rekayasa e-commerce. E-commerce bukan sekadar aplikasi web: ia menggabungkan storefront yang cepat dan kritis terhadap SEO dengan inti transaksional berintegritas tinggi — keranjang, pesanan, pembayaran, inventaris — di mana satu inkonsistensi saja dapat merugikan secara finansial. Sementara kurikulum Svelte pengantar mencakup komponen, stores, dan deployment, dan silabus runes tingkat lanjut berfokus pada internal framework, kursus ini menerapkan SvelteKit pada seluruh domain commerce: arsitektur katalog, pencarian faceted, state keranjang, checkout bertahap, integrasi penyedia pembayaran, siklus hidup pesanan, rekayasa inventaris dan harga, personalisasi, anggaran performa, fraud dan kepatuhan, serta observabilitas khusus commerce.

Setiap modul memasangkan fondasi konseptual yang mendalam dengan lab langsung yang membangun storefront yang berfungsi secara bertahap: di akhir kursus setiap peserta didik telah merakit sistem commerce kelas produksi yang lengkap — katalog, keranjang, checkout, pembayaran, manajemen pesanan, dan admin — bukan sekadar demo mainan. Kursus ini berpuncak pada proyek akhir di mana peserta didik merancang dan membangun storefront mereka sendiri, dengan integritas webhook pembayaran, konsistensi inventaris, anggaran performa, dan penguatan keamanan sebagai persyaratan kelas satu.

Di akhir kursus ini, peserta didik akan mampu memodelkan domain commerce (produk, varian, pesanan, pembayaran, inventaris), memilih antara arsitektur monolithic dan headless commerce, membangun halaman katalog yang dioptimalkan untuk SEO dengan pencarian faceted, merekayasa state keranjang dengan runes dan persistensi server-side, mengimplementasikan checkout bertahap dengan validasi yang kokoh dan pembuatan pesanan idempoten, mengintegrasikan penyedia pembayaran dengan capture yang dikonfirmasi webhook serta refund, menegakkan state machine siklus hidup pesanan, menjaga konsistensi inventaris dan harga di bawah konkurensi, mempersonalisasi storefront dengan rekomendasi dan promosi, memenuhi anggaran Core Web Vitals pada halaman commerce, menguatkan checkout terhadap fraud dan penyalahgunaan, serta mengamati seluruh funnel pembelian di produksi.

## Kurikulum

### Modul 1: Fondasi Arsitektur E-Commerce (Minggu 1)

- **Model domain commerce**
  - Entitas inti: produk, varian, SKU, harga, stok, kategori, pelanggan, keranjang, pesanan, pembayaran, pengiriman
  - Hierarki produk/varian/SKU dan pemodelan atribut
  - Mengapa storefront bukanlah commerce platform: pemisahan frontend dan back-office
- **Commerce monolithic vs headless**
  - Platform ter-hosting (Shopify, BigCommerce) dan batasannya
  - Inti commerce sumber terbuka (Medusa, Saleor) dan penyedia API-first (commercetools, integrasi Stripe kustom)
  - Composable commerce: mengorkestrasi katalog, keranjang, pembayaran, dan pemenuhan sebagai layanan terpisah
- **Arsitektur storefront dengan SvelteKit**
  - Route groups untuk storefront publik, akun pelanggan, dan bagian admin
  - Modul fitur: katalog, keranjang, checkout, pesanan, pembayaran
  - Batas server/client: mengambil data di load functions vs setelah mount
  - Commerce client bertipe dan konfigurasi berbasis environment per penyedia
- **Lab Langsung**: Scaffold shell storefront SvelteKit dengan route groups, UI kit bersama, dan stub commerce client bertipe

### Modul 2: Katalog Produk dan Pencarian (Minggu 2)

- **Pemodelan data produk**
  - Hierarki produk → varian → SKU dan nilai opsi
  - Skema relasional ternormalisasi vs document-oriented; kapan kolom JSON membantu
  - Mata uang, daftar harga, dan sumber kebenaran untuk penetapan harga
- **Merender halaman katalog**
  - Server-side rendering untuk halaman produk dan kategori yang kritis terhadap SEO
  - Prerender katalog statis dan cache headers untuk katalog dinamis
  - Paginasi dan URL kanonik untuk daftar kategori
- **Pencarian faceted**
  - Pencarian full-text dengan PostgreSQL FTS atau SQLite FTS5
  - Mesin khusus (Meilisearch, Algolia) dan sinkronisasi indeks
  - Facets, filter, urutan, dan state filter berbasis URL yang mendukung berbagi dan deep link
- **Citra produk**
  - `enhanced:img` dan pipeline citra SvelteKit
  - Responsive srcset, format modern, pengiriman CDN, dan carousel dengan lazy loading
- **Lab Langsung**: Bangun halaman kategori faceted dengan filter tersinkron-URL yang didukung pencarian full-text

### Modul 3: Keranjang Belanja dan Arsitektur State (Minggu 3)

- **Model data keranjang**
  - Line items, varian, kuantitas, harga satuan, mata uang
  - Keranjang tamu vs keranjang terdaftar: keranjang sesi anonim dan penggabungan nanti
- **State keranjang sisi klien dengan runes**
  - Modul keranjang `$state` di `.svelte.ts` yang digunakan bersama lintas aplikasi
  - Total dan jumlah turunan; pembaruan kuantitas optimistis di mini-cart
  - Persistensi ke localStorage dan rehidrasi
- **Keranjang sisi server**
  - Tabel keranjang dan line items; cookie keranjang yang mengikat sesi tamu
  - Mutasi melalui form actions dan endpoint API; invalidasi berbasis `depends()`
  - Menggabungkan keranjang tamu ke keranjang terdaftar saat login
- **Konkurensi dan konsistensi**
  - Memvalidasi ulang harga saat checkout alih-alih mempercayai nilai yang tersimpan di klien
  - Kolom versi dan optimistic concurrency untuk mencegah lost update
- **Lab Langsung**: Implementasikan keranjang dengan state runes, persistensi server-side, dan strategi penggabungan tamu-ke-pengguna

### Modul 4: Alur Checkout dan Validasi (Minggu 4)

- **Desain checkout bertahap**
  - Langkah pengiriman, pembayaran, dan tinjauan dengan persistensi progres
  - State langkah dengan runes yang bertahan saat navigasi tanpa kehilangan data formulir
- **Formulir kokoh dengan Superforms dan Zod**
  - Skema validasi bersama antara klien dan server
  - Validasi server-side sebagai sumber kebenaran, validasi klien untuk UX
  - Rendering error di tingkat field dan formulir
- **Pengiriman**
  - Validasi alamat dengan pencarian kode pos
  - Metode pengiriman, perhitungan tarif, dan ambang gratis ongkir
- **Pajak, diskon, dan total pesanan**
  - Perhitungan pajak berbasis tujuan
  - Kode promo dan aturan validasinya; batasan penumpukan diskon
  - Rincian total: subtotal, diskon, pajak, ongkir
- **Pembuatan pesanan idempoten**
  - Idempotency keys agar percobaan ulang tidak pernah membuat pesanan ganda
  - Reservasi stok saat pembuatan pesanan vs capture saat pembayaran
- **Lab Langsung**: Selesaikan alur checkout dengan Superforms, pengiriman tervalidasi, dan pembuatan pesanan idempoten

### Modul 5: Integrasi Pembayaran dan Webhook (Minggu 5)

- **Lanskap penyedia pembayaran**
  - Stripe, PayPal, Paddle, dan penyedia regional dengan metode pembayaran lokal
  - Payment Intents vs Setup Intents; 3-D Secure dan Strong Customer Authentication
- **Pola integrasi checkout**
  - Checkout redirect ter-hosting vs element pembayaran tertanam
  - Dompet digital: Apple Pay dan Google Pay
  - Tidak pernah menyentuh data kartu mentah: minimalisasi lingkup PCI-DSS
- **Konfirmasi server-side**
  - Alur pembayaran authorize-on-checkout, capture-on-fulfillment
  - Webhook untuk konfirmasi asinkron; verifikasi tanda tangan dan pemrosesan idempoten
  - Merekonsiliasi payment intents dengan ID pesanan internal
- **Refund dan sengketa**
  - Refund penuh dan sebagian; alur pembalikan dan penanganan sengketa
- **Lab Langsung**: Integrasikan Stripe dengan pembayaran terkonfirmasi webhook dan endpoint refund

### Modul 6: Manajemen Pesanan dan Pemenuhan (Minggu 6)

- **Siklus hidup pesanan**
  - State machine: pending → paid → fulfillment required → fulfilled → shipped → delivered, plus state cancelled, failed, dan returned
  - Menegakkan transisi di sisi server dan mencatat audit log
- **Dashboard admin**
  - Daftar pesanan dengan filter, tampilan detail pesanan, dan tombol aksi
  - Kontrol akses berbasis peran dengan pengaman berbasis hooks untuk rute admin
- **Integrasi pemenuhan**
  - API label pengiriman, nomor pelacakan, dan webhook carrier
  - Pengiriman parsial dan backorder
- **Notifikasi pelanggan**
  - Email transaksional konfirmasi pesanan dan pengiriman; SMS untuk kejadian penting
- **Lab Langsung**: Bangun admin pesanan dengan transisi state yang ditegakkan dan integrasi webhook pemenuhan

### Modul 7: Rekayasa Inventaris dan Harga (Minggu 7)

- **Model inventaris**
  - Level stok, reservasi saat checkout, pengurangan saat pembayaran, dan alur restok
  - Ketersediaan multi-gudang dan berbasis lokasi; pencegahan overselling
- **Rekayasa harga**
  - Daftar harga, konversi mata uang, harga promo dan berjenjang
  - Memvalidasi ulang harga dan menginvalidasi cache saat harga berubah
- **Sinkronisasi back-office**
  - Polling vs webhook untuk sinkronisasi katalog dan inventaris
  - Pola outbox untuk pengiriman event yang andal ke sistem ERP/OMS
- **Lab Langsung**: Implementasikan inventaris berbasis reservasi dengan pengurangan stok yang aman terhadap race condition

### Modul 8: Personalisasi, Rekomendasi, dan Promosi (Minggu 8)

- **Permukaan personalisasi**
  - Homepage personal, produk yang baru dilihat, dan rekomendasi
  - Sinyal perilaku tanpa analytics berat: event lokal plus analytics ramah privasi
- **Sistem rekomendasi**
  - Rekomendasi berbasis aturan (item terkait, juga-dibeli, terlaris)
  - Collaborative filtering dan kemiripan berbasis embedding
  - Widget rekomendasi yang dirender di klien vs di server
- **Mesin promosi**
  - Promosi persentase, nominal tetap, dan promosi bersyarat di level item dan keranjang
  - Aturan penumpukan dan invariant validasi
- **Eksperimentasi**
  - Varian berbasis flag untuk checkout dan eksperimen merchandising
  - Mengukur dampak konversi setiap varian
- **Lab Langsung**: Bangun homepage personal dengan rekomendasi produk dan mesin promosi dengan aturan penumpukan

### Modul 9: Rekayasa Performa Commerce (Minggu 9)

- **Core Web Vitals untuk commerce**
  - LCP pada halaman produk dan kategori; INP pada keranjang dan checkout interaktif
  - Menegakkan anggaran di CI dengan Lighthouse CI dan assertion performa Playwright
- **Strategi rendering per tipe halaman**
  - Kombinasi SSR, prerender, dan CSR yang dipilih per tipe halaman
  - Cache headers CDN dan stale-while-revalidate untuk halaman katalog
  - Respons ter-stream untuk konten personal
- **Pengiriman citra dan aset**
  - Pipeline `enhanced:img`, resizing CDN, negosiasi format, dan priority hints
- **Efisiensi frontend**
  - Code splitting level rute dan pemuatan tertunda widget keranjang
  - Idle-loading komponen di bawah lipatan
- **Real-user monitoring**
  - Data lapangan sebagai sumber kebenaran, bukan hanya data lab
- **Lab Langsung**: Capai anggaran LCP dan INP pada halaman produk dan tegakkan di CI

### Modul 10: Keamanan, Fraud, dan Kepatuhan (Minggu 10)

- **Fondasi keamanan web untuk commerce**
  - XSS melalui deskripsi produk dan konten ulasan; Content Security Policy
  - CSRF pada checkout dan form actions: origin checks dan token
  - Session fixation dan penguatan cookie untuk pelanggan yang login
- **Fraud dan penyalahgunaan**
  - Card testing dan serangan bot pada endpoint checkout dan auth
  - Velocity checks, rate limiting, dan device fingerprinting
  - 3-D Secure sebagai sinyal fraud; alat risiko penyedia pembayaran (Stripe Radar)
- **Kepatuhan**
  - Minimalisasi lingkup PCI DSS dan batas tanggung jawab merchant
  - GDPR/CCPA: minimalisasi data, persetujuan, dan permintaan subjek data
  - Persyaratan PSD2/Strong Customer Authentication
- **Lab Langsung**: Kuatkan checkout terhadap bot card-testing dan tambahkan Content Security Policy

### Modul 11: Pengujian, Observabilitas, dan Operasi Commerce (Minggu 11)

- **Menguji inti commerce**
  - Unit testing logika keranjang dan harga sebagai fungsi murni
  - Component testing untuk widget keranjang, katalog, dan promo
  - E2E Playwright untuk jalur pembelian emas dan injeksi kegagalan webhook
  - Contract testing terhadap sandbox penyedia pembayaran
- **Observabilitas**
  - Logging terstruktur dengan request IDs di seluruh perjalanan checkout; tracing OpenTelemetry
  - Pelacakan error pada kegagalan pembayaran dan pemrosesan webhook
  - Analisis funnel: produk → keranjang → checkout → pembelian; analytics pendapatan
  - Alerting pada kegagalan webhook, tingkat error checkout, dan anomali pesanan
- **Operasi commerce**
  - Job rekonsiliasi untuk pesanan, pembayaran, dan inventaris
  - Feature flags dan peluncuran bertahap untuk perubahan checkout
- **Lab Langsung**: Telusuri pembelian penuh dengan OpenTelemetry dan konfigurasikan alert funnel

### Modul 12: Skala, Integrasi Headless, dan Capstone (Minggu 12)

- **Menskalakan storefront**
  - Skala horizontal SSR, edge rendering, dan offload CDN
  - Read replicas, lapisan cache, dan pemrosesan pesanan latar berbasis antrean
  - Deployment multi-region dan pertimbangan residensi data
- **Integrasi ekosistem headless**
  - ERP/OMS, CRM, platform email, analytics, mesin pajak, dan payment gateway
  - Arsitektur webhook dan pola outbox dalam skala besar
- **Proyek capstone**
  - Persyaratan, tinjauan arsitektur, dan alur kerja tim
  - Anggaran performa, keamanan, dan observabilitas
  - Kriteria presentasi dan code review
- **Lab Langsung**: Jalankan tinjauan arsitektur untuk storefront yang dirancang menangani 10.000 sesi konkuren

## Proyek Akhir

Peserta didik akan merancang dan membangun **storefront e-commerce dan dashboard admin kelas produksi yang lengkap** di SvelteKit yang menunjukkan penguasaan rekayasa commerce. Capstone harus mencakup:

- **Katalog**: Model data produk dan varian dengan halaman kategori yang dirender untuk SEO dan pencarian faceted
- **Keranjang**: State keranjang berbasis runes dengan persistensi server-side dan strategi penggabungan tamu-ke-pengguna
- **Checkout**: Checkout bertahap dengan formulir tervalidasi server, perhitungan ongkir, dan pembuatan pesanan idempoten
- **Pembayaran**: Integrasi penyedia pembayaran dengan capture terkonfirmasi webhook, verifikasi tanda tangan, dan alur refund
- **Manajemen pesanan**: State machine siklus hidup pesanan yang ditegakkan server-side dengan antarmuka admin
- **Inventaris**: Level stok berbasis reservasi dengan pengurangan aman terhadap race condition dan pencegahan overselling
- **Personalisasi**: Setidaknya satu permukaan rekomendasi dan mesin promosi dengan aturan penumpukan
- **Quality gates**: Anggaran Core Web Vitals yang ditegakkan di CI, unit dan E2E test untuk jalur pembelian, serta daftar periksa keamanan (CSP, CSRF, rate limiting)
- **Observabilitas**: Logging terstruktur dengan request IDs, pelacakan funnel pembelian, dan alerting pada kegagalan pembayaran

Contoh ide proyek: storefront fesyen multi-merek dengan inventaris varian ukuran dan warna, toko barang digital dengan pemenuhan instan melalui pengiriman license key, atau storefront kotak langganan dengan pembayaran berulang dan peramalan inventaris.

## Kriteria Penilaian

- **Tugas**: Lab langsung setiap modul dikumpulkan dan ditinjau. Lab dinilai berdasarkan kebenaran fungsional (perilaku commerce berfungsi end to end), integritas (tidak ada pesanan ganda, tidak ada stok oversold, webhook terverifikasi), dan kualitas kode (kontrak bertipe, formulir tervalidasi, struktur yang mudah dibaca).
- **Proyek Akhir**: Capstone dievaluasi terhadap daftar fitur yang disyaratkan, dengan bobot khusus pada integritas transaksional — pembuatan pesanan idempoten, inventaris aman terhadap race condition, dan pembayaran terkonfirmasi webhook — ditambah anggaran performa yang lulus di CI, kepatuhan daftar periksa penguatan keamanan, dan kualitas tinjauan arsitektur.

## Referensi

- [Dokumentasi SvelteKit](https://kit.svelte.dev/docs) — routing, hooks, adapters, dan form actions
- [Dokumentasi Runes Svelte 5](https://svelte.dev/docs/svelte/what-are-runes) — `$state`, `$derived`, `$effect`, dan reaktivitas universal
- [Superforms](https://superforms.rocks/) — validasi formulir SvelteKit dengan skema Zod
- [Dokumentasi Stripe Payments](https://docs.stripe.com/payments) — Payment Intents, webhook, dan refund
- [Dokumentasi Meilisearch](https://www.meilisearch.com/docs) — pencarian faceted dan sinkronisasi indeks
- [Dokumentasi Playwright](https://playwright.dev/docs) — pengujian E2E jalur pembelian
- [Web Vitals](https://web.dev/vitals/) — Core Web Vitals untuk halaman commerce
- [OWASP Top Ten](https://owasp.org/www-project-top-ten/) — keamanan aplikasi web untuk alur checkout
- [Stripe Radar](https://stripe.com/radar) — alat deteksi dan pencegahan fraud

---
title: "Silabus Arsitektur Produksi dan Performa Next.js Tingkat Lanjut"
description: "Kurikulum lanjutan 12 minggu untuk pengembang Next.js yang berpengalaman, mencakup internal React Server Components, arsitektur cache Next.js secara mendalam, Partial Prerendering dan edge rendering, optimasi streaming dan INP, anggaran performa, pola lapisan data berskala besar, penguatan keamanan, observabilitas, pengujian berskala besar, serta arsitektur multi-zone dan monorepo."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Arsitektur Produksi dan Performa Next.js Tingkat Lanjut

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk pengembang yang telah mengirimkan aplikasi Next.js ke produksi dan ingin menguasai kerangka kerja ini pada skala platform. Sementara kurikulum Next.js tingkat pengantar berfokus pada routing, Server dan Client Components, Server Actions, autentikasi, dan cara men-deploy aplikasi, kursus ini masuk beberapa lapis lebih dalam: mekanisme payload React Server Components di level protokol, arsitektur cache secara lengkap dan interaksinya dengan CDN, Partial Prerendering dan edge runtime, rekayasa performa streaming dan interaksi, anggaran performa bundle dan gambar, pola lapisan data untuk aplikasi bervolume tinggi, penguatan keamanan, observabilitas dan keandalan, pengujian berskala besar, serta penataan codebase besar dengan monorepo dan deployment multi-zone.

Setiap modul memasangkan fondasi konseptual yang mendalam dengan lab langsung yang mengharuskan pembacaan output hasil kompilasi, pembuatan profil metrik produksi, dan perancangan diagram arsitektur. Kursus ini mencapai puncaknya pada proyek akhir di mana peserta didik merancang dan membangun platform Next.js berskala besar untuk tim multi-developer dengan strategi cache yang disengaja, rendering hibrida per rute, API yang di-deploy di edge, observabilitas produksi, dan anggaran performa yang terukur.

Di akhir kursus ini, peserta didik akan mampu menjelaskan bagaimana server components diserialisasi dan dialirkan ke klien, merancang strategi invalidasi cache yang bertahan saat lonjakan trafik, memilih mode rendering yang tepat untuk setiap rute, mendiagnosis dan memperbaiki regresi INP dan LCP, membangun lapisan akses data yang melindungi dari query N+1 dan fetch beruntun, menguatkan aplikasi terhadap SSRF, IDOR, dan penyalahgunaan, mengoperasikan layanan Next.js dengan tracing dan log terstruktur, serta menata codebase multi-tim tanpa mengikat jadwal rilis antar-tim.

## Kurikulum

### Modul 1: React Server Components dan Payload RSC (Minggu 1)

- **Protokol RSC**
  - Cara server components diserialisasi menjadi payload RSC: format wire Flight
  - Tag skrip `__next_f`, batas streaming, dan hidrasi progresif
  - Apa saja yang dapat melewati batas server/klien: props yang dapat diserialisasi, referensi Server Actions, serta pembatasan pada fungsi, tanggal, dan instance kelas
- **Batas `use client` secara mendalam**
  - Di mana batas digambar dan mengapa seluruh subtree menjadi client-rendered
  - Paket `server-only` dan `client-only` serta penegakan graph impor
  - Meneruskan Server Components sebagai children vs mengimpor client components ke dalam server components
- **Streaming dan Suspense di level protokol**
  - Bagaimana `<Suspense>` membuat chunk streaming dan bagaimana browser merakitnya
  - Konvensi `loading.tsx`, cangkang suspense bersarang, dan pengaturan runtime `streaming-ssr`
  - Bailout SSR: kapan API dinamis memaksa SSR dokumen penuh
- **Lab Praktik**: Bangun aplikasi RSC kecil, tangkap payload jaringan, dan identifikasi setiap chunk yang diserialisasi serta batas Suspense yang terkait

### Modul 2: Arsitektur Cache Next.js Secara Mendalam (Minggu 2)

- **Empat cache ditinjau ulang**
  - Full Route Cache, Data Cache, Router Cache, dan lapisan memoization fetch
  - Cache mana yang melayani apa, di mana ia berada (memori server, disk, CDN, browser), dan pemicu invalidasinya
  - Bagaimana `revalidate`, `noStore()`, `revalidatePath`, dan `revalidateTag` berinteraksi dengan setiap lapisan
- **Data Cache dan integrasi CDN**
  - Header `Cache-Control` yang dipancarkan per mode rendering dan cara Vercel serta CDN self-hosted menghormatinya
  - Semantik stale-while-revalidate, `s-maxage`, dan `stale-if-error`
  - Cache tags dan On-Demand Revalidation: menandai data pihak ketiga dan memvalidasi ulang dari webhook
- **Router Cache dan navigasi klien**
  - Bagaimana prefetching mengisi Router Cache dan jendela kedaluwarsa 30 detik/5 menit
  - Konfigurasi `staleTimes` dan perilaku navigasi dinamis
- **Debugging cache-hell**
  - Trace cache dari `next build`, header `x-nextjs-cache`, dan `unstable_cache` untuk sumber data khusus
- **Lab Praktik**: Instrumentasi aplikasi dengan header `x-nextjs-cache`, rancang alur invalidasi berbasis tag yang dipicu webhook, dan verifikasi cache hit di setiap lapisan

### Modul 3: Strategi Rendering Tingkat Lanjut (Minggu 3)

- **Partial Prerendering (PPR)**
  - Model PPR: cangkang statis dengan lubang dinamis yang dialirkan saat permintaan
  - Mengaktifkan dengan `experimental.ppr`, API dinamis yang diizinkan, dan aturan batas statis/dinamis
  - Kapan PPR lebih unggul daripada rendering statis penuh atau dinamis penuh
- **Rendering statis, dinamis, dan ISR berskala besar**
  - ISR dengan `generateStaticParams`: pembuatan massal, granularitas `revalidate`, dan cache edge CDN
  - Revalidasi on-demand halaman ISR dan batasan minimum 15 menit
  - Memilih per rute: kerangka keputusan berdasarkan kesegaran data, personalisasi, dan bentuk trafik
- **Edge vs Node.js runtime**
  - Sandbox Edge runtime: batasan pada API Node, `fs`, dan modul native
  - Node.js runtime dengan `experimental.serverActions` dan beban kerja berdurasi panjang
  - Konfigurasi segmen rute dan runtime per rute
- **Output standalone dan self-hosting**
  - `output: 'standalone'`, server produksi minimal, dan desain image Docker
  - Build zero-config, `next start` vs custom server, serta konfigurasi proxy dan gzip
- **Lab Praktik**: Ubah aplikasi trafik menengah ke PPR, pisahkan rute di berbagai runtime, dan deploy server standalone dalam kontainer Docker

### Modul 4: Streaming, Suspense, dan Performa Interaksi (Minggu 4)

- **First paint streaming**
  - Merancang cangkang agar first paint cepat: konten penting di atas lipatan pada chunk awal
  - Urutan chunk, petunjuk `preload`, dan penjadwalan `ReactDOMServer`
  - Menghindari waterfall: panggilan `fetch` paralel, preload level rute, dan helper `cache()`
- **Interaktivitas dan INP**
  - Bagaimana hidrasi bersaing dengan responsivitas input pada perangkat kelas bawah
  - Mengurangi permukaan client component yang perlu dihidrasi: memindahkan interaktivitas ke islands
  - Delegasi event, `requestIdleCallback` untuk hidrasi non-kritis, dan penjadwalan skrip pihak ketiga
- **Rekayasa LCP**
  - Pipa image secara mendalam: ukuran `next/image`, `priority`, `sizes`, dan optimizer CDN
  - Strategi font: `next/font`, `font-display`, preloading, dan `size-adjust` untuk mencegah layout shift
  - Resource hints: `preload`, `preconnect`, dan modulepreload untuk chunk rute
- **Mengukur performa**
  - Core Web Vitals di lab dan di lapangan, data RUM, dan anggaran regresi
- **Lab Praktik**: Profil LCP dan INP aplikasi di Chrome DevTools dan WebPageTest, rancang ulang cangkang untuk streaming, dan ukur ulang perbaikannya

### Modul 5: Anggaran Performa dan Optimasi Bundle (Minggu 5)

- **Anatomi bundle**
  - Cara App Router memecah kode: chunk per rute, chunk bersama, dan dinding batas server/klien
  - Laporan `next build`, `@next/bundle-analyzer`, dan membaca graph modul
  - Penegakan anggaran bundle klien dengan pemeriksaan `bundle-analyzer` di CI dan tooling size-limit
- **Turbopack dan performa build**
  - Turbopack dev dan `next build --turbopack`: kompilasi inkremental, persistent caching, dan CI lebih cepat
  - Membandingkan output webpack vs Turbopack untuk build produksi
- **Strategi code-splitting**
  - Dynamic imports, `next/dynamic`, `ssr: false`, dan lazy loading level rute
  - Ekstraksi library, jebakan tree-shaking dengan barrel files, dan kebersihan dependensi server-only
- **Module Federation dan micro-frontends**
  - Berbagi remote modules antar aplikasi Next.js, penyelarasan versi, dan isolasi kegagalan
- **Lab Praktik**: Tetapkan anggaran 170 KB JS klien untuk aplikasi demo, kurangi di bawah anggaran menggunakan teknik di atas, dan sambungkan pemeriksaan ke CI

### Modul 6: Pola Lapisan Data Berskala Besar (Minggu 6)

- **Arsitektur akses data sisi server**
  - Lapisan akses data: repository dan query yang diisolasi dari komponen
  - Mencegah query N+1, over-fetching, dan serialisasi nilai yang tidak dapat diserialisasi
  - Memoization `cache()`, deduplikasi per permintaan, dan `unstable_cache` untuk caching lintas permintaan
- **Database dan manajemen koneksi**
  - Connection pooling, penggunaan ulang prepared statement, dan batas koneksi serverless
  - Pola ORM dengan Prisma/Drizzle: perencanaan query, batch loading, dan indeks
  - Read replicas, lapisan cache (Redis), dan strategi cache-aside vs write-through
- **Fetch data klien dengan RSC**
  - Desain batas: data yang di-fetch server vs data yang di-fetch klien dengan TanStack Query
  - Hidrasi query klien dari payload server, dan pembaruan optimistis dengan Server Actions
- **Pekerjaan latar dan antrian**
  - Tugas panjang di luar jalur permintaan: antrian (BullMQ, Inngest), webhook, dan job terjadwal
  - Kunci idempotensi, retry dengan backoff, dan semantik exactly-once untuk mutasi
- **Lab Praktik**: Refactor akses data halaman ke lapisan repository dengan query termemoisasi, tambahkan lapisan cache-aside Redis, dan pindahkan job ekspor yang lambat ke antrian

### Modul 7: Penguatan Keamanan untuk Produksi (Minggu 7)

- **Arsitektur autentikasi dan otorisasi**
  - Manajemen sesi berskala besar: JWT vs sesi database, rotasi, dan pencabutan
  - Access control berbasis peran dan atribut, pemeriksaan izin di dalam Server Actions dan Route Handlers
  - Multi-tenancy dan row-level security: membatasi query dan mencegah IDOR
- **Permukaan serangan sisi server**
  - Pencegahan SSRF saat mengambil URL dari pengguna: allowlist, DNS rebinding, dan validasi URL
  - Pertahanan injeksi untuk `dangerouslySetInnerHTML`, SQL injection melalui query raw ORM, dan command injection
  - Validasi input dengan Zod di batas permintaan dan penguatan upload file
- **Header dan penguatan respons**
  - Content Security Policy dengan nonce untuk skrip inline, aturan `headers()` di `next.config.js`
  - HSTS, X-Frame-Options, Referrer-Policy, dan Permissions-Policy
  - CORS untuk Route Handlers, flag cookie (`HttpOnly`, `Secure`, `SameSite`), dan CSRF untuk endpoint yang mengubah status
- **Rate limiting dan perlindungan penyalahgunaan**
  - Rate limiting edge dengan Vercel/Cloudflare, token buckets, dan deteksi bot
  - Melindungi Server Actions dan API routes dari brute force dan scraping
- **Lab Praktik**: Jalankan audit keamanan terhadap aplikasi yang disediakan, perbaiki temuan SSRF dan IDOR, tambahkan CSP dengan nonce, dan deploy rate limit di edge

### Modul 8: Observabilitas dan Keandalan (Minggu 8)

- **Log terstruktur**
  - Log JSON dengan pino, ID permintaan yang diteruskan melalui header, dan level log di produksi
  - Korelasi: menyatukan log, trace, dan error dengan trace ID bersama
- **Tracing dengan OpenTelemetry**
  - `instrumentation.ts`, integrasi OpenTelemetry Next.js untuk server components, Route Handlers, dan fetch
  - Span untuk query database, panggilan eksternal, dan rendering; strategi sampling di produksi
- **Pelacakan error dan pemantauan klien**
  - Error boundaries, `global-error.tsx`, dan pelaporan error ke Sentry
  - Real User Monitoring: koleksi Web Vitals, session replay, dan ambang alerting
- **Praktik keandalan**
  - Health checks dan readiness probes untuk deployment self-hosted
  - Feature flags untuk rilis bertahap, canary deploy, dan rollback instan
  - Degradasi yang anggun saat API hulu atau database terganggu
- **Lab Praktik**: Instrumentasi aplikasi proyek akhir dengan OpenTelemetry, kirim log ke collector, siapkan Sentry untuk error server dan klien, dan verifikasi trace mencakup seluruh jalur permintaan

### Modul 9: Pengujian Berskala Besar (Minggu 9)

- **Piramida pengujian untuk Next.js**
  - Unit test logika murni dan utilitas dengan Vitest
  - Component test Server dan Client Components dengan React Testing Library: mocking `next/navigation`, `next/headers`, dan fetch
  - Menguji Server Actions end to end dengan alur `useActionState`
- **Pengujian E2E dengan Playwright**
  - Sharding melintasi mesin CI, penggunaan ulang web-server, dan pengambilan trace saat gagal
  - Menguji status streaming dan Suspense, intersepsi rute dengan `page.route`, dan mocking jaringan
- **Visual regression dan uji performa**
  - Perbandingan screenshot untuk regresi tata letak, dan anggaran Lighthouse CI
- **Contract testing untuk API routes**
  - Kontrak OpenAPI untuk Route Handlers dan consumer-driven contract tests
- **Lab Praktik**: Tambahkan suite Playwright dengan CI bersharding, component test untuk form Server Action, dan gerbang anggaran Lighthouse CI ke aplikasi contoh

### Modul 10: Monorepo, Multi-Zone, dan Arsitektur Micro-Frontend (Minggu 10)

- **Arsitektur monorepo dengan Turborepo**
  - Tata letak workspace: apps, packages, UI bersama, dan paket database
  - Remote caching, task pipelines, dan build yang sadar graph dependensi
  - Konfigurasi TypeScript bersama, ESLint config, dan paket internal dengan `output: 'standalone'`
- **Next.js Multi-Zones**
  - Beberapa aplikasi Next.js di bawah satu domain: `assetPrefix`, rewrites, dan navigasi bersama
  - Berbagi status autentikasi dan tata letak antar zone; deploy yang dibatasi per zone
- **Adopsi inkremental dan pola strangler**
  - Memigrasikan aplikasi Pages Router lama ke App Router rute demi rute
  - Rilis bertahap berbasis parallel routes dan pembagian trafik tingkat fitur
- **Topologi tim**
  - Kepemilikan kode, batas kontrak antar tim, dan manajemen dependensi
- **Lab Praktik**: Ubah satu repo menjadi monorepo Turborepo dengan paket bersama, dan pisahkan sebagian aplikasi menjadi zone Next.js kedua

### Modul 11: CI/CD dan Platform Deployment (Minggu 11)

- **Strategi platform deployment**
  - Vercel vs self-hosted di Kubernetes atau VM: trade-off build, runtime, dan biaya
  - Preview deployment per PR, promosi environment, dan rilis immutable
  - Edge functions, region, dan pertimbangan residensi data
- **Deployment Docker dan kontainerisasi**
  - Multi-stage builds, `output: 'standalone'`, base image minimal, dan pengguna non-root
  - Health checks, graceful shutdown, dan scaling horizontal dengan sesi tersimpan secara eksternal
- **Migrasi database dan rilis**
  - Migrasi skema dengan Prisma/Drizzle di CI, strategi zero-downtime, dan backfill
  - Manajemen environment variable dan rotasi secret
- **Desain pipeline CI**
  - Feedback cepat: tahapan lint, typecheck, unit, component, dan E2E dengan caching
  - Pemeriksaan anggaran bundle, pemindaian dependensi, dan pemeriksaan lisensi
- **Lab Praktik**: Kontainerisasi aplikasi proyek akhir dengan Dockerfile multi-stage, sambungkan pipeline CI dengan tahapan ter-cache, dan deploy ke environment staging dengan URL preview

### Modul 12: Proyek Akhir — Platform Produksi (Minggu 12)

- **Spesifikasi proyek**
  - Bangun platform Next.js berskala besar sesuai pilihan peserta didik: dashboard SaaS, marketplace, platform konten, atau perkakas pengembang
  - Persyaratan: setidaknya tiga mode rendering, strategi cache yang disengaja, permukaan API yang dilindungi edge, dan anggaran performa
- **Perencanaan arsitektur**
  - Peta rute dengan keputusan rendering per rute, desain lapisan akses data, dan diagram invalidasi cache
  - Threat model keamanan dan rencana observabilitas
- **Fase implementasi**
  - Minggu 1-4: pembuatan monorepo, rute inti, lapisan data, dan cangkang streaming
  - Minggu 5-8: strategi cache, penguatan keamanan, dan suite pengujian
  - Minggu 9-12: observabilitas, CI/CD, optimasi performa ke anggaran, dan deploy produksi
- **Tinjauan akhir dan presentasi**
  - Penjelasan arsitektur, laporan audit performa, dan dokumen respons insiden

## Proyek Akhir

Peserta didik akan merancang dan membangun **platform Next.js kelas produksi** yang menunjukkan penguasaan arsitektur tingkat lanjut. Proyek harus mencakup:

- **Rendering hibrida**: setidaknya tiga mode rendering digunakan (statis, ISR, dinamis, atau PPR) dengan dasar pertimbangan terdokumentasi per rute
- **Strategi cache**: penggunaan Data Cache atau `unstable_cache` dengan invalidasi on-demand berbasis tag yang terhubung ke webhook atau aksi admin
- **Arsitektur streaming**: cangkang berbasis Suspense yang mencapai anggaran LCP/INP terukur (misalnya LCP di bawah 2,0 detik, INP di bawah 200 ms pada perangkat kelas menengah)
- **Permukaan API yang dilindungi edge**: rate limiting, autentikasi, dan otorisasi level baris pada semua endpoint yang mengubah status
- **Penguatan keamanan**: CSP dengan nonce, security headers, fetch eksternal yang aman dari SSRF, dan input yang tervalidasi
- **Observabilitas**: tracing OpenTelemetry, log JSON terstruktur dengan request ID, dan pelacakan error untuk server dan klien
- **Gerbang kualitas otomatis**: pengujian E2E Playwright bersharding, component test untuk Server Actions, dan anggaran Lighthouse CI di pipeline
- **Deployment**: build `output: 'standalone'` dalam kontainer atau deployment platform dengan preview environment dan health checks

Contoh ide proyek:

- **Dashboard Analitik SaaS**: workspace multi-tenant dengan row-level security, dashboard real-time melalui streaming, dan pipeline ingest webhook
- **Platform Marketplace**: pencarian produk dengan ISR, alur checkout dengan Server Actions dan pembayaran idempoten, serta zona admin
- **Platform Konten**: CMS dengan artikel ber-render PPR, revalidasi berbasis tag dari webhook CMS, dan pipeline media yang di-cache di edge

## Kriteria Penilaian

- **Lab Modul (30%)**
  - 11 lab praktik (Modul 1-11), masing-masing menghasilkan artefak yang dapat diverifikasi: tangkapan jaringan, trace header cache, laporan profiler, atau gerbang CI
  - Dinilai berdasarkan kebenaran, kedalaman analisis, dan dokumentasi temuan

- **Kuis (20%)**
  - 4 kuis di akhir Modul 3, 6, 9, dan 11
  - Campuran pertanyaan konseptual, analisis skenario arsitektur, dan tinjauan kode atas pola dunia nyata

- **Proyek Akhir (40%)**
  - Kualitas arsitektur dan keputusan rendering per rute (10%)
  - Pencapaian cache dan anggaran performa (10%)
  - Postur keamanan dan model otorisasi (10%)
  - Cakupan pengujian, gerbang kualitas CI, dan observabilitas (10%)

- **Partisipasi dan Tinjauan Sejawat (10%)**
  - Tinjauan arsitektur atas proyek akhir satu rekan terhadap checklist keamanan dan performa
  - Kontribusi pada diskusi desain dan kualitas dokumentasi

## Referensi

- [Dokumentasi Next.js](https://nextjs.org/docs) - Referensi App Router, caching, rendering, dan konfigurasi
- [RFC React Server Components](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md) - Protokol RSC dan aturan serialisasi
- [Kursus Belajar Next.js](https://nextjs.org/learn) - Kurikulum App Router interaktif
- [Dokumentasi Metrik Performa Web](https://web.dev/articles/vitals) - Definisi dan ambang LCP, INP, dan CLS
- [Dokumentasi OpenTelemetry](https://opentelemetry.io/docs/) - Instrumentasi tracing dan metrik
- [Dokumentasi Playwright](https://playwright.dev/docs/ci) - Pengujian E2E dan sharding CI
- [Dokumentasi Turborepo](https://turborepo.com/docs) - Task pipeline monorepo dan remote caching
- [Dokumentasi Vercel](https://vercel.com/docs) - Deployment, edge functions, dan preview environment

---
title: "Silabus Self-Hosting dan Platform Engineering Next.js"
description: "Kurikulum dua belas modul untuk menjalankan Next.js di infrastruktur yang Anda kelola sendiri — internal build output, container, cache handler bersama, topologi proxy, rilis tanpa downtime, dan runbook produksi."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Self-Hosting dan Platform Engineering Next.js

## Ringkasan

Sebagian besar materi Next.js berhenti di tombol deploy. Silabus ini justru dimulai dari
titik itu. Ini adalah program dua belas minggu untuk engineer yang harus mengoperasikan
aplikasi Next.js di infrastruktur milik timnya sendiri — VM telanjang, Kubernetes, atau
satu VPS di belakang nginx — dan yang sudah lelah menebak apa yang dilakukan framework
antara `next build` dan request pertama.

Pergeseran cara berpikir yang dipaksakan kurikulum ini adalah bahwa deployment Next.js
self-hosted bukan "server Node dengan langkah tambahan". Ada empat lapisan yang harus
bekerja sama: artefak build dengan kontrak file yang ketat, renderer saat request dengan
semantik cache-nya sendiri, lapisan penyimpanan bersama yang membuat regenerasi inkremental
bertahan di banyak instance, dan edge jaringan yang punya pendapat sendiri soal header
cache. Rusak salah satunya, dan Anda mendapat halaman basi, render ganda, atau rollout yang
memutus request yang sedang berjalan.

Setiap modul berakhir dengan artefak yang bisa langsung Anda tempel ke review insiden:
trace, dump header cache, laporan load test, runbook. Total beban sekitar 8–10 jam per
modul termasuk lab. Peserta diharapkan sudah nyaman dengan App Router, React Server
Components, dan dasar-dasar Docker.

## Kurikulum

### Modul 1: Artefak Build dan Kontraknya

- **Apa yang sebenarnya dihasilkan `next build`**
  - `.next/standalone` versus `.next/server`: file mana yang dibaca server produksi dan mana yang tidak pernah disentuh
  - Output file tracing dan mengapa dependency native opsional (`sharp`, `@swc/core`) terlepas secara diam-diam
  - Nilai `next.config.js` yang dipanggang saat build versus dibaca saat runtime — sumber sebagian besar bug "jalan di lokal, salah di staging"
- **Pemilihan runtime**
  - Runtime Node versus Edge: apa yang tidak tersedia di masing-masing, dan cara mengaudit batas route
  - Siklus hidup request pada mode self-hosted: middleware, lalu route handler atau render RSC, lalu respons streaming
- **Lab**: Build aplikasi referensi, lalu jalankan server standalone dari direktori bersih yang hanya berisi file hasil tracing

### Modul 2: Mengemas Next.js ke Dalam Container dengan Benar

- **Image multi-stage**
  - Tahap builder dengan dependency lengkap, tahap runner hanya dengan output hasil tracing
  - Urutan layer yang ramah cache untuk lockfile dan instalasi `node_modules`
  - User non-root, root filesystem read-only, dan path yang harus writable untuk lapisan cache
- **Dasar operasional**
  - Endpoint health versus readiness: apa yang sebenarnya harus diperiksa masing-masing
  - Penanganan signal dan graceful shutdown; mengapa `next start` tidak boleh menjadi PID 1 di produksi
  - Anggaran ukuran image dan biaya membawa tooling build ke tahap runner
- **Lab**: Hasilkan image di bawah 200 MB yang boot di bawah tiga detik dan lolos readiness probe

### Modul 3: Cache Bersama dan Regenerasi Inkremental dalam Skala

- **Cache default adalah risiko**
  - Mengapa cache berbasis file-system bekerja pada satu instance tetapi pecah tanpa suara di tiga instance
  - Kontrak `cacheHandler`: `get`, `set`, `revalidateTag`, dan jaminan yang harus dipenuhi tiap pemanggilan
- **Membangun lapisan bersama**
  - Cache handler berbasis Redis dengan indeks tag dan penegakan TTL
  - Endpoint revalidasi on-demand, terautentikasi, dengan semantik idempoten
  - Kendali cache stampede: single-flight regeneration alih-alih N render bersamaan
- **Lab**: Jalankan tiga instance di belakang load balancer dan buktikan satu revalidasi tag mencapai semuanya dalam 500 ms

### Modul 4: Topologi Proxy dan CDN

- **Edge di depan renderer**
  - nginx, Caddy, dan Traefik sebagai reverse proxy: preservasi header, timeout, buffering
  - Header cache mana yang dikeluarkan Next.js dan mana yang ditulis ulang proxy; jebakan header `Vary` seputar cookie dan locale
  - Aset statis versus HTML hasil render: dua kebijakan cache yang sama sekali berbeda
- **Perpindahan keras dan lembut**
  - `stale-while-revalidate` sebagai strategi degradasi, bukan trik performa
  - Asset prefixing dan cache busting ketika CDN memiliki TTL panjang
- **Lab**: Tangkap dan beri anotasi pada jalur header penuh dari browser ke renderer ke cache untuk tiga tipe route

### Modul 5: Instance Stateless dan Topologi Sesi

- **Di mana identitas instance bocor**
  - Rate limiter in-memory, penghitung per-proses, dan upload file lokal sebagai penghambat scaling
  - Session store: sesi Redis versus cookie bertanda tangan, serta trade-off pencabutan sesi
  - Sticky session sebagai alat diagnosis, bukan sebagai arsitektur
- **State lintas layanan**
  - Distributed lock untuk job sekali-jalan yang dipicu dari Server Action
  - Idempotency key untuk mutasi yang mungkin diulang melewati proxy
- **Lab**: Naikkan dari satu ke lima instance di bawah beban tanpa kehilangan sesi atau menagih mutasi dua kali

### Modul 6: Rilis Tanpa Downtime

- **Strategi rollout**
  - Blue-green dengan pengalihan trafik, rolling dengan readiness gate, canary dengan perbandingan metrik
  - Connection draining: berapa lama sebenarnya respons streaming yang sedang berjalan untuk selesai
  - Urutan migrasi ketika skema dan kode harus berubah bersamaan
- **Kemampuan kembali**
  - Cache warming sebelum pengalihan supaya pengguna pertama bukan renderer pertama
  - Rollback yang tidak memerlukan build ulang, dan kebijakan retensi artefak yang memungkinkannya
- **Lab**: Deploy perubahan skema yang breaking melintasi dua rilis dengan nol request gagal di load generator

### Modul 7: Merangkai Observability

- **Instrumentasi dari dalam**
  - Hook `instrumentation.ts`, registrasi OpenTelemetry SDK, dan konfigurasi exporter
  - Span yang mengikuti request dari proxy melewati render RSC hingga ke lapisan data
  - Structured logging dengan request dan trace identifier yang dipropagasikan dari edge
- **Sinyal yang penting**
  - Timing sisi server versus Core Web Vitals lapangan; mengapa angka lab tidak pernah cocok dengan angka lapangan
  - Taksonomi error: kegagalan build, error render, hydration mismatch, timeout upstream
- **Lab**: Telusuri satu halaman lambat dari ujung ke ujung dan kaitkan latensinya ke span tertentu, bukan ke dugaan

### Modul 8: Akses Data dan Anggaran Koneksi

- **Pooling di bawah konkurensi bergaya serverless**
  - Satu client per proses versus per request; mode kegagalan yang dihasilkan masing-masing
  - PgBouncer, batas koneksi Prisma, dan aritmetika instance kali ukuran pool kali replika
  - Query timeout yang selalu lebih pendek dari timeout proxy
- **Batas cache**
  - Apa yang pantas masuk cache Next.js, apa yang masuk Redis, dan apa yang tetap di database
  - Kepemilikan invalidasi: satu penulis, satu namespace tag, tanpa penghapusan berserakan
- **Lab**: Lakukan load test sampai database menolak koneksi, lalu perbaiki anggarannya bukan ambangnya

### Modul 9: Mengeraskan Deployment Self-Hosted

- **Header dan kebijakan konten**
  - CSP dengan propagasi nonce melalui middleware dan proses render
  - HSTS, frame ancestors, dan header yang cenderung dihilangkan proxy
- **Kontrol akses di perimeter**
  - Rate limiting yang bertahan di banyak instance, dengan dimensi kunci yang tepat
  - Distribusi secret tanpa memanggang nilainya ke dalam image; rotasi tanpa build ulang
- **Lab**: Lolos checklist review keamanan internal dengan bukti untuk setiap butir

### Modul 10: Kapasitas, Biaya, dan Load Testing

- **Mengukur sebelum berjanji**
  - Skenario k6 yang memodelkan navigasi nyata, bukan hanya menghantam homepage
  - Persentil latensi sebagai mata uang SLO; mengapa rata-rata menyembunyikan insiden
  - Model kapasitas: request per detik per instance pada p95 tetap, plus kebijakan headroom
- **Sinyal scaling**
  - CPU versus kedalaman antrean versus event-loop lag sebagai input autoscaling
  - Perilaku cold start dan biaya scaling ke nol
- **Lab**: Terbitkan dokumen sizing dengan jumlah instance yang bisa dipertahankan dan asumsi headroom yang dinyatakan

### Modul 11: Runbook dan Respons Insiden

- **Artefak operasional**
  - Runbook untuk lima kegagalan yang benar-benar terjadi: cache miss storm, koneksi habis, rilis buruk, timeout upstream, sertifikat kedaluwarsa
  - Desain alert: page berbasis gejala, dashboard berbasis penyebab
  - Error budget dan rapat review yang disuplainya
- **Melatih kegagalan**
  - Game day dengan cache handler yang sengaja dirusak dan rilis yang macet
  - Tulisan pasca-insiden yang berakhir pada perubahan kode atau konfigurasi, bukan pada "lebih hati-hati"
- **Lab**: Tulis dan jalankan runbook yang belum pernah dilihat rekan Anda, dengan pengukuran waktu

### Modul 12: Capstone — Miliki Platformnya

- **Integrasi**
  - Gabungkan container, cache, proxy, observability, dan strategi rilis menjadi satu model operasi
  - Dokumentasikan arsitektur sebagai kumpulan keputusan beserta alternatif yang ditolak secara eksplisit
- **Review**
  - Peer review terhadap checklist tiap modul
  - Injeksi kegagalan langsung yang belum pernah dilihat kandidat
- **Lab**: Presentasikan platform, lalu bertahanlah dari injeksi tersebut

## Proyek Akhir

Bangun dan operasikan **Relay**, platform konten self-hosted dengan tiga instance di
belakang reverse proxy, `cacheHandler` berbasis Redis, dan proses rilis yang
terdokumentasi. Artefak yang wajib ada:

- Image produksi yang dibangun dengan mode multi-stage dan berjalan sebagai user non-root
- Bukti revalidasi tag lintas instance, ditangkap dari ketiga instance
- Trace header beranotasi yang menunjukkan aset statis dan HTML hasil render menempuh jalur cache berbeda
- Trace OpenTelemetry untuk satu request yang melintasi proxy, render, dan database
- Laporan load test dengan rekomendasi kapasitas dan headroom yang dinyatakan
- Lima runbook, salah satunya Anda jalankan langsung saat game day
- Drill rollback tertulis dengan waktu pemulihan terukur

Platform harus bertahan dari satu kegagalan yang diinjeksikan instruktur tanpa pemberitahuan:
node cache yang dimatikan, rilis yang macet, atau connection pool yang habis. Pemulihan
dinilai dari waktu dan dari apakah runbook diikuti tanpa improvisasi.

## Kriteria Penilaian

- **Lab per modul (40%)**: Dinilai dari apakah artefak membuktikan klaimnya. Screenshot bukan
  bukti; trace, dump header, atau laporan load adalah bukti.
- **Decision record (15%)**: Setiap modul menghasilkan catatan singkat yang menyebutkan
  trade-off dan alternatif yang ditolak. Catatan kabur bernilai nol, walau kodenya jalan.
- **Proyek akhir (35%)**: Kebenaran pada kondisi multi-instance, cakupan observability di jalur
  kritis, dan rollback yang benar-benar berjalan.
- **Respons injeksi kegagalan (10%)**: Waktu pemulihan, kepatuhan pada runbook, dan kualitas
  perubahan lanjutan.
- **Ambang kelulusan**: 75% keseluruhan, tanpa satu kategori pun di bawah 60%. Lab yang hanya
  bekerja pada satu instance tidak dihitung lulus.

## Referensi

- Dokumentasi self-hosting dan deployment Next.js — https://nextjs.org/docs/app/building-your-application/deploying
- Referensi konfigurasi `cacheHandler` Next.js — https://nextjs.org/docs/app/api-reference/next-config-js/incrementalCacheHandlerPath
- Instrumentasi OpenTelemetry JavaScript — https://opentelemetry.io/docs/languages/js/
- Dokumentasi Docker multi-stage build — https://docs.docker.com/build/building/multi-stage/
- Panduan caching dan proxying nginx — https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/
- Referensi konfigurasi PgBouncer — https://www.pgbouncer.org/config.html
- Dokumentasi load testing k6 — https://grafana.com/docs/k6/latest/
- Google SRE Workbook, bab tentang SLO dan respons insiden
- Betsy Beyer dkk., *Site Reliability Engineering* (bab alerting dan postmortem)

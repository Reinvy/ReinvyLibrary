---
title: "Silabus Lanjutan Internal Runtime Bun"
description: "Kurikulum lanjutan 12 minggu yang komprehensif untuk pengembang JavaScript berpengalaman yang mencakup arsitektur internal Bun, akses mesin JavaScriptCore, binding FFI native, addon N-API, manajemen memori, profiling kinerja, pengembangan plugin, dan pengerasan produksi."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Lanjutan Internal Runtime Bun

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk pengembang JavaScript dan TypeScript berpengalaman yang sudah membangun aplikasi dengan Bun dan ingin menguasai runtime itu sendiri. Kurikulum ini melampaui sekadar menulis aplikasi Bun untuk mengeksplorasi apa yang terjadi di balik layar: arsitektur inti Zig dan C++, mesin JavaScriptCore, Foreign Function Interface (bun:ffi) untuk memanggil pustaka native, penulisan addon N-API dan Zig, garbage collection dan manajemen memori, profiling CPU dan heap, sistem plugin dan macro, pemrograman sistem tingkat rendah, serta pengerasan produksi untuk layanan dengan throughput tinggi.

Setiap modul menggabungkan fondasi teoretis yang mendalam dengan lab praktik yang mengharuskan peserta menulis binding native sungguhan, memprofil aplikasi yang berjalan, dan men-debug kebocoran memori. Kursus berpuncak pada proyek akhir di mana peserta membangun layanan real-time berkinerja tinggi yang didukung ekstensi native dan mengoptimalkannya terhadap anggaran kinerja yang terukur.

Di akhir kursus ini, peserta akan mampu menjelaskan bagaimana Bun mengeksekusi JavaScript dan berkomunikasi dengan sistem operasi, memanggil pustaka C arbitrer secara aman dari JavaScript, menulis dan mengemas addon native, mendiagnosis dan memperbaiki masalah memori dan CPU dengan profiler, membangun plugin khusus dan macro waktu-kompilasi, serta mengoperasikan layanan Bun yang mempertahankan throughput tinggi dengan latensi yang dapat diprediksi.

## Kurikulum

### Modul 1: Arsitektur Bun dan Internal JavaScriptCore (Minggu 1)

- **Arsitektur runtime Bun**
  - Inti Zig dan binding C++: bagaimana lapisan native Bun diorganisasi
  - Mesin JavaScriptCore: mengapa Bun memilih JSC alih-alih V8
  - Urutan startup: shell, bootstrap runtime, pemuatan graf modul
  - Peran kompiler JIT B3 dan FTL dari WebKit
- **Resolusi modul dan runtime ESM**
  - Registri modul internal dan resolver Bun
  - Internal resolusi `bun.lock` dan hoisting workspace
  - Modul native vs modul JavaScript dalam graf runtime
- **Tur modul bawaan**
  - `bun:ffi`, `bun:jsc`, `bun:sqlite`, `bun:test`, `bun:stream`
  - Bagaimana modul bawaan diekspos ke JavaScript tanpa pembungkus gaya Node
- **Lab Praktik**: Ukur waktu startup Bun dibandingkan Node.js, inspeksi internal `process.versions`, dan enumerasi semua modul bawaan dengan `Bun.which` dan dynamic import

### Modul 2: Foreign Function Interface dengan bun:ffi (Minggu 2)

- **Memanggil pustaka native dari JavaScript**
  - Memuat pustaka bersama dengan `dlopen` dan `Bun.ffi`
  - Mendefinisikan tanda tangan fungsi C: `dlopen`, `CFunction`, `ptr`, `CString`
  - Tipe data FFI: `i32`, `u64`, `f64`, `ptr`, `CStruct`
  - Mengoper dan mengembalikan pointer, string, dan struct
- **Pola FFI lanjutan**
  - Callback dari kode native ke JavaScript
  - Mengelola kepemilikan memori melintasi batas FFI
  - Keamanan thread dan kendala thread utama
  - Penanganan error ketika kode native mengembalikan kode kesalahan
- **Karakteristik kinerja**
  - Overhead FFI vs N-API vs JavaScript murni
  - Mengelompokkan panggilan native untuk mengamortisasi biaya transisi
  - Kapan FFI adalah alat yang tepat dan kapan bukan
- **Lab Praktik**: Bungkus pustaka C kecil (misalnya implementasi CRC32 atau kompresi libz) dan panggil dari server HTTP Bun

### Modul 3: bun:jsc dan Akses Tingkat Mesin (Minggu 3)

- **Permukaan API JavaScriptCore di Bun**
  - `Bun.jsc` dan `jsc.evaluate`: menjalankan kode terhadap objek global baru
  - `jsc.gc()`: memaksa garbage collection
  - `jsc.memoryUsage()`: membaca statistik memori mesin
  - `jsc.vm()`: akses virtual machine tingkat rendah
- **Fondasi garbage collection**
  - Generasi kolektor JSC dan pipeline penandaan
  - Heuristik pertumbuhan heap dan penjadwalan GC
  - Pelaporan memori eksternal dan dampaknya pada keputusan GC
- **Introspeksi dan debugging**
  - Membuang statistik heap dan jumlah objek
  - Menginspeksi tier JIT: interpreter, baseline, DFG, FTL
  - Mendeteksi anomali tingkat mesin pada proses berumur panjang
- **Lab Praktik**: Bangun skrip diagnostik kecil yang melaporkan penggunaan memori JSC seiring waktu saat workload uji berjalan

### Modul 4: Modul Native dan N-API (Minggu 4)

- **Kapan menulis modul native**
  - Mengidentifikasi jalur panas terikat komputasi yang membenarkan kode native
  - Membandingkan pendekatan: FFI, addon N-API, pustaka statis Zig
  - Stabilitas ABI dan masalah versioning
- **N-API dalam praktik**
  - Menyiapkan `node-gyp` dengan lapisan kompatibilitas Bun
  - Menulis addon C++ minimal yang mengekspos fungsi komputasi
  - Menangani napi_env, napi_value, dan async work
  - Membangun dan memuat addon di dalam proses Bun
- **Modul native Zig untuk Bun**
  - Kompatibilitas ABI C Zig dan mengapa ia cocok dengan Bun
  - Mengompilasi pustaka Zig dan mengikatnya dengan bun:ffi
  - Mendistribusikan kode native sebagai paket npm dengan biner per platform
- **Lab Praktik**: Tulis addon N-API yang mempercepat workload numerik, lalu bandingkan throughput-nya dengan implementasi JavaScript murni

### Modul 5: Manajemen Memori dan Diagnosis Kebocoran (Minggu 5)

- **Model memori proses Bun**
  - Heap JavaScript vs heap native vs memori eksternal
  - Buffer dan TypedArray: di mana byte sebenarnya berada
  - Jalur retensi dan mengapa closure bocor
- **Perkakas deteksi kebocoran**
  - Heap snapshot dan analisis retensi objek
  - `WeakRef` dan `FinalizationRegistry` untuk eviction cache
  - Instrumentasi layanan berumur panjang untuk melacak pertumbuhan heap
  - Pengujian tekanan dengan `--smol` dan mode heap terbatas
- **Pola mitigasi**
  - Stream dan backpressure untuk membatasi buffering
  - Pooling sumber daya native dan penutupan handle
  - Kebersihan event listener pada server berumur panjang
- **Lab Praktik**: Masukkan kebocoran yang disengaja pada layanan demo, temukan dengan heap snapshot, dan perbaiki

### Modul 6: Profiling Kinerja dan Optimasi (Minggu 6)

- **Profiling penggunaan CPU**
  - `--cpu-prof` dan profiler sampling
  - Membaca flame graph dan mengidentifikasi fungsi panas
  - Artefak profiling terkait JIT dan cara menginterpretasikannya
- **Profiling dengan protokol DevTools**
  - `Bun.inspect` dan integrasi Chrome DevTools
  - CPU profile, heap profile, dan performance trace
  - Profiling workload WebSocket dan HTTP
- **Microbenchmark dengan `bun test --bench`**
  - Menulis benchmark stabil yang menghindari jebakan optimizer
  - Membandingkan implementasi dan melacak regresi
  - Alur kerja optimasi berbasis benchmark
- **Buku pedoman optimasi**
  - Mengurangi alokasi pada loop panas
  - Menghindari transisi FFI yang berlebihan
  - Streaming payload besar alih-alih buffering
  - Menyetel konkurensi `Bun.serve` dan pengaturan keep-alive
- **Lab Praktik**: Profil API sampel, identifikasi tiga titik panas teratas, optimalkan, dan buktikan peningkatannya dengan benchmark sebelum/sesudah

### Modul 7: Plugin dan Macro Waktu-Kompilasi (Minggu 7)

- **API plugin Bun**
  - Hook `onResolve` dan `onLoad`
  - Memuat tipe file khusus dan modul virtual
  - Mencegat import untuk codegen dan instrumentasi
- **Macro: kode yang berjalan saat build**
  - Modul macro dan konvensi ekspor `macro`
  - Menyisipkan komputasi mahal ke dalam bundle
  - Kapan macro aman dan kapan melanggar ekspektasi
- **Loader khusus**
  - Mentransformasi Svelte, Vue, CSS, dan format khusus saat build
  - Menggabungkan plugin dengan pipeline bundler
  - Caching dan incremental build dengan plugin
- **Lab Praktik**: Tulis plugin yang memuat file konfigurasi YAML dan macro yang menghitung tabel pencarian saat build

### Modul 8: Pemrograman Sistem Tingkat Rendah (Minggu 8)

- **Integrasi proses dan shell**
  - `Bun.spawn` dan `Bun.spawnSync`: kontrol proses penuh
  - Template literal `Bun.$` dan pipeline shell
  - Menangkap stream, kode keluar, dan sinyal
- **Jaringan di bawah HTTP**
  - `Bun.connect` dan socket TCP mentah
  - Protokol khusus dan penguraian pesan berbingkai
  - Unix domain socket untuk komunikasi antar-proses
- **Internal sistem file**
  - `Bun.file` dan pembacaan zero-copy
  - `Bun.write` dan penggantian file atomik
  - Watch mode dan file watcher dalam skala besar
- **Lab Praktik**: Bangun broker permintaan TCP minimal yang merutekan pesan berbingkai antar proses klien

### Modul 9: Sistem Type-Safe dan Desain Berbasis Skema (Minggu 9)

- **Kontrak API schema-first**
  - Skema Zod sebagai sumber kebenaran tunggal
  - Menghasilkan tipe dan dokumentasi OpenAPI dari skema
  - Validasi runtime tanpa penurunan kinerja
- **Type safety ujung ke ujung**
  - Paket tipe bersama antara server dan klien
  - API gaya RPC dengan prosedur bertipe
  - Contract testing terhadap skema yang dihasilkan
- **Validasi pada jalur panas**
  - Validator terkompilasi vs validasi dinamis
  - Mengelompokkan dan mendeduplikasi kerja validasi
  - Agregasi error dan respons kegagalan terstruktur
- **Lab Praktik**: Bangun layanan RPC bertipe di mana klien dan server berbagi skema dan kedua sisi menegakkan kontrak yang sama

### Modul 10: Pola Pengujian Lanjutan (Minggu 10)

- **Pengujian berbasis properti**
  - Menghasilkan input dan menemukan counterexample
  - Mengintegrasikan fast-check dengan `bun test`
  - Menguji invarian struktur data dan parser
- **Menguji batas native**
  - Mocking panggilan FFI dan modul native
  - Fixture untuk pustaka yang sulit dijalankan di CI
  - Golden-file testing untuk keluaran biner
- **Anggaran cakupan dan regresi**
  - Menegakkan ambang cakupan di CI
  - Gerbang regresi benchmark dengan `bun test --bench`
  - Snapshot testing untuk respons API dan bentuk error
- **Lab Praktik**: Tulis pengujian properti untuk parser JSON dan tambahkan gerbang regresi benchmark ke pipeline CI sampel

### Modul 11: Pengerasan Produksi dan Observabilitas (Minggu 11)

- **Fondasi operasional**
  - Graceful shutdown dan penanganan sinyal
  - Endpoint health check dan readiness probe
  - Logging JSON terstruktur dan korelasi log
- **Integrasi observabilitas**
  - Tracing OpenTelemetry untuk permintaan
  - Mengekspos endpoint metrik untuk Prometheus
  - Menangkap metrik memori JSC untuk dashboard
- **Pengerasan kontainer dan deployment**
  - Build Docker multi-stage dengan image resmi `oven/bun`
  - Menjalankan Bun dengan batas memori dan CPU yang ketat
  - Manajemen secrets dan validasi lingkungan
- **Pola keandalan**
  - Circuit breaker dan retry dengan exponential backoff
  - Antrean terbatas dan backpressure untuk layanan hilir
  - Pengujian injeksi kegagalan untuk ketahanan
- **Lab Praktik**: Keraskan layanan sampel dengan graceful shutdown, health check, tracing OpenTelemetry, dan endpoint metrik Prometheus

### Modul 12: Proyek Akhir (Minggu 12)

- **Desain proyek akhir**
  - Menentukan layanan real-time berkinerja tinggi dengan komponen komputasi native
  - Mendefinisikan anggaran kinerja terukur (throughput, latensi p99, batas memori)
  - Memilih strategi integrasi native: FFI, N-API, atau Zig
- **Implementasi dan optimasi**
  - Membangun layanan dengan `Bun.serve` dan WebSocket
  - Profiling, optimasi, dan profiling ulang terhadap anggaran
  - Menulis pengujian dan benchmark yang komprehensif
- **Pengiriman**
  - Mengkontainerisasi layanan akhir
  - Mendokumentasikan arsitektur, hasil profiling, dan runbook operasional
  - Menyajikan bukti kinerja dan trade-off desain

## Proyek Akhir

**Layanan Real-Time Berkinerja Tinggi Berbasis Native**

Bangun layanan real-time lengkap dengan Bun yang mendelegasikan workload intensif komputasi ke kode native. Contoh konkret: server chat WebSocket dengan side-channel native yang menghitung skor kemiripan, menghasilkan thumbnail, atau mengompresi payload melalui pustaka C/Zig yang Anda bind sendiri.

Proyek harus menunjukkan:

1. **Integrasi native** — binding bun:ffi, addon N-API, atau pustaka Zig yang dikompilasi dan dimuat ke dalam proses Bun
2. **Komunikasi real-time** — pengiriman WebSocket atau SSE dengan penanganan klien yang baik
3. **Kerja kinerja terukur** — bukti profiling sebelum/sesudah yang menunjukkan jalur native mengungguli baseline JavaScript murni
4. **Disiplin memori** — bukti heap snapshot bahwa layanan bebas bocor di bawah beban berkelanjutan
5. **Kesiapan produksi** — image Docker, health check, logging terstruktur, dan trace OpenTelemetry

**Deliverable**:
- Kode sumber lengkap dalam repositori Git
- Laporan benchmark dan profiling (flame graph, grafik memori, angka sebelum/sesudah)
- Rangkaian pengujian dengan pengujian properti dan gerbang regresi benchmark
- Dockerfile dan dokumentasi deployment
- Catatan arsitektur yang menjelaskan setiap batas native

## Kriteria Penilaian

- **Tugas Mingguan (30%)**: Lab praktik yang dikirim sebagai pull request, dievaluasi pada kebenaran, keamanan kode native, dan kepatuhan terhadap alur kerja profiling-first. Setiap lab harus menyertakan bukti apa yang diukur.
- **Proyek Tengah Semester (20%)**: Jatuh tempo setelah Modul 6 — layanan yang diprofil dan dioptimalkan dengan binding FFI atau N-API yang berfungsi, dikirim dengan laporan kinerja sebelum/sesudah.
- **Proyek Akhir (40%)**: Layanan capstone yang dijelaskan di atas, dievaluasi pada kualitas integrasi native, bukti kinerja, stabilitas memori, cakupan pengujian, dan kualitas dokumentasi.
- **Partisipasi Review Kode (10%)**: Review sejawat atas setidaknya tiga pengiriman capstone peserta lain, berfokus pada keamanan batas native, metodologi profiling, dan pengerasan operasional.

## Referensi

- [Dokumentasi Resmi Bun](https://bun.sh/docs) — Referensi runtime, CLI, dan modul bawaan
- [Dokumentasi FFI Bun](https://bun.sh/docs/api/ffi) — Panduan Foreign Function Interface
- [Dokumentasi Plugin Bun](https://bun.sh/docs/bundler/plugins) — Dokumentasi API plugin dan macro
- [Repositori GitHub Bun](https://github.com/oven-sh/bun) — Kode sumber, isu, dan catatan rilis
- [Dokumentasi JavaScriptCore](https://docs.webkit.org/JavaScriptCore/) — Dokumentasi internal mesin dan JIT
- [Dokumentasi Node-API (N-API)](https://nodejs.org/api/n-api.html) — Referensi API addon native
- [Referensi Bahasa Zig](https://ziglang.org/documentation/master/) — Zig untuk pengembangan modul native
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/) — Instrumentasi tracing dan metrik
- [Dokumentasi Prometheus](https://prometheus.io/docs/introduction/overview/) — Koleksi metrik dan alerting

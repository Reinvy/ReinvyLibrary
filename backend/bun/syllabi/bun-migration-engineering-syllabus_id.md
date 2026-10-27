---
title: "Silabus Rekayasa Migrasi Bun"
description: "Kurikulum lanjutan 12 minggu untuk tim yang memindahkan layanan Node.js produksi ke Bun — mencakup audit kompatibilitas, migrasi lockfile dan toolchain, addon native dan interop ESM, porting pipeline test dan build, pengujian paritas diferensial, cutover CI/CD, serta adopsi hibrida bertahap dengan jalur rollback yang terdokumentasi."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Migrasi Bun

## Ringkasan

Silabus lanjutan 12 minggu ini ditujukan bagi engineer yang sudah menjalankan layanan Node.js di produksi dan telah memutuskan untuk mengevaluasi atau mengadopsi Bun — dan kini perlu melakukannya tanpa merusak apa pun. Jika silabus Bun umum mengajarkan runtime dari dasar, silabus lanjutan membedah internal runtime, dan silabus full-stack membangun aplikasi baru di atas Bun, kursus ini dikhususkan sepenuhnya pada persoalan migrasi: memindahkan basis kode Node.js yang sudah berjalan ke Bun dengan bukti, bukan dengan optimisme.

Migrasi bukanlah penulisan ulang. Migrasi adalah disiplin rekayasa kompatibilitas yang terdiri dari audit, pengujian diferensial, inventaris celah, cutover bertahap, dan rencana rollback. Kurikulum mengikuti disiplin tersebut dari awal hingga akhir: mengaudit basis kode untuk risiko kompatibilitas, mengonversi manajemen paket dan lockfile, memetakan permukaan built-in `node:` yang benar-benar dipakai kode, mengurai perbedaan resolusi ESM dan CommonJS, menangani addon native serta binary prebuilt, memindahkan suite Jest atau Vitest ke `bun:test`, menggantikan pipeline build multi-alat dengan `bun build`, membuktikan paritas perilaku melalui harness yang menjalankan kedua runtime secara berdampingan, mengonsolidasikan tooling TypeScript dan lint, memindahkan CI dan image container, lalu mengadopsi Bun secara bertahap per layanan sambil tetap menyediakan Node.js untuk beban kerja yang memang membutuhkannya.

Setiap modul menghasilkan artefak konkret yang menyuplai proyek akhir: register risiko, lockfile hasil konversi, matriks kompatibilitas, laporan paritas test, diff pipeline build, matriks CI, dan runbook cutover. Di akhir kursus, peserta telah memigrasikan layanan nyata dengan angka sebelum/sesudah yang terukur dan rollback yang sudah dilatih.

## Kurikulum

### Modul 1: Strategi Migrasi dan Model Kompatibilitas (Minggu 1)

- **Apa yang sebenarnya dijanjikan kompatibilitas Bun**
  - Bun sebagai pengganti Node.js drop-in: tujuan yang dinyatakan versus kondisi nyata saat ini
  - Tiga mode eksekusi: `bun run`, `bun --bun run`, dan fallback Node.js untuk lifecycle script
  - Halaman pelacakan kompatibilitas Node.js dan cara membacanya sebagai masukan rekayasa, bukan materi promosi
  - Perbedaan semantik yang bukan bug: resolusi modul, global `process`, dan perilaku timing
- **Menyusun audit kesiapan migrasi**
  - Menginventarisasi layanan, pohon dependensi, dan target deployment-nya
  - Mengklasifikasikan setiap dependensi: JavaScript murni, binary prebuilt, build node-gyp, atau khusus platform
  - Memberi skor risiko berdasarkan dampak kegagalan dan biaya rollback, bukan berdasarkan jumlah baris kode
  - Menulis decision record yang menyatakan apa arti "berhasil" secara numerik
- **Memilih bentuk migrasi**
  - Cutover penuh, cutover per layanan, dan adopsi hanya pada tooling pengembangan
  - Kapan Bun hanya layak di jalur build dan test sementara Node.js tetap menjalankan produksi
  - Model biaya: jam engineering, biaya CI dua runtime, dan anggaran risiko operasional
- **Lab Praktik**: Menyusun audit kesiapan migrasi satu halaman untuk layanan nyata di organisasi Anda, termasuk tabel risiko dependensi yang berperingkat dan rekomendasi bentuk migrasi

### Modul 2: Manajemen Paket dan Migrasi Lockfile (Minggu 2)

- **Dari npm, pnpm, atau Yarn ke `bun install`**
  - Mengonversi `package-lock.json`, `pnpm-lock.yaml`, atau `yarn.lock` menjadi `bun.lock`
  - Memverifikasi bahwa graf dependensi hasil resolusi sama dengan lockfile lama sebelum mempercayai yang baru
  - Perbedaan resolusi peer dependency dan cara Bun melaporkan konflik
  - `overrides`, `resolutions`, dan dependensi berpatch gaya pnpm di bawah Bun
- **Perilaku instalasi yang berbeda**
  - Lifecycle script tidak dijalankan secara default: `trustedDependencies` dan trade-off keamanannya
  - Penanganan `.npmrc`: token autentikasi registry, registry berscope, dan proxy privat
  - Tata letak cache global, hardlink, dan implikasinya di dalam container
  - `--frozen-lockfile`, `--production`, dan instalasi yang reprodusibel di CI
- **Workspace dan monorepo**
  - Memigrasikan definisi workspace dan tautan antar paket
  - Perbedaan hoisting dan dependensi yang diam-diam mengandalkannya
  - Memfilter instalasi dan skrip per workspace dengan `--filter`
  - Menerbitkan library dari monorepo yang dikelola Bun tanpa merusak konsumen npm
- **Lab Praktik**: Mengonversi repositori nyata ke `bun.lock`, membandingkan pohon hasil resolusi dengan lockfile sebelumnya, menyelesaikan setiap selisih, dan mendokumentasikan keputusan trusted dependency

### Modul 3: Permukaan API Built-in Node.js (Minggu 3)

- **Memetakan apa yang benar-benar dipakai kode Anda**
  - Menghasilkan laporan penggunaan import `node:` dan require built-in di seluruh basis kode
  - Memprioritaskan berdasarkan frekuensi pemanggilan dan seberapa krusial modul tersebut bagi kebenaran sistem
  - Memisahkan "harus berperilaku identik" dari "berbeda tetapi masih dapat diterima"
- **Pemeriksaan realitas modul per modul**
  - `fs` dan `fs/promises`: permukaan sync, callback, dan promise, flag streaming, serta penanganan `Dirent`
  - `path`, `os`, `url`, dan `querystring`: kasus tepi pada path gaya Windows dan parsing URL
  - `http` dan `https`: perilaku server, keep-alive, trailer, dan semantik agent
  - `stream`: `pipeline`, `pump`, object mode, dan backpressure pada implementasi Bun
  - Catatan kompatibilitas `crypto`, `zlib`, `worker_threads`, `child_process`, dan `cluster`
- **Mengisi celah nyata**
  - Menulis shim kompatibilitas tipis untuk built-in yang baru didukung sebagian
  - Mengganti dependensi yang tidak didukung dengan padanan native Bun (`bun:sqlite` untuk `better-sqlite3`)
  - Mengisolasi paket khusus Node yang tak tergantikan di balik batas child process
  - Mengumpulkan semua shim dalam satu paket internal agar mudah dihapus di kemudian hari
- **Lab Praktik**: Menyusun matriks kompatibilitas built-in untuk layanan Anda, termasuk satu shim yang berfungsi dan satu dependensi yang ditukar dengan modul native Bun

### Modul 4: Resolusi Modul dan Interop ESM/CommonJS (Minggu 4)

- **Titik di mana aturan resolusi menyimpang**
  - Resolver Bun versus algoritma Node: penebakan ekstensi, indeks direktori, dan conditional exports
  - Peta `exports`, field `imports`, dan flag `--conditions` di bawah Bun
  - `type: "module"` versus `.mjs`/`.cjs`, dan cara Bun memperlakukan berkas `.js` secara berbeda secara default
  - Import absolut dan beralias: `paths` di `tsconfig`, alias di `bunfig.toml`, dan nama workspace
- **Bahaya interop dalam praktik**
  - Dual-package hazard: dua salinan library dengan state terpisah
  - Interop default export: `module.exports` yang dikonsumsi sebagai `import x from` dan sebaliknya
  - `__dirname`, `__filename`, dan `require` di dalam berkas ESM
  - Interaksi top-level await dengan dependensi CommonJS
- **Tuas konfigurasi**
  - `bunfig.toml`: `preload`, pengaturan `install`, alias, dan konfigurasi test
  - Opsi `tsconfig.json` yang dihormati Bun versus opsi yang hanya dibaca `tsc`
  - Skrip preload sebagai titik migrasi untuk setup global dan monkey patch
- **Lab Praktik**: Mengonversi layanan CommonJS ke ESM di bawah Bun, mendokumentasikan setiap error resolusi yang muncul dan perbaikan minimal yang dipilih

### Modul 5: Addon Native dan Dependensi Binary (Minggu 5)

- **Mengaudit dependensi native**
  - Mendeteksi binary `.node`, paket platform prebuilt, dan skrip build postinstall
  - Memeriksa kebutuhan versi N-API dan kompatibilitas ABI dengan Bun
  - Matriks platform: apa yang harus dibangun untuk `linux-x64`, `linux-arm64`, dan `darwin-arm64`
- **Membuat kode native berjalan**
  - Menjalankan build node-gyp melalui penanganan lifecycle script Bun
  - Memuat binary prebuilt dan menangani `MODULE_NOT_FOUND` untuk paket platform yang hilang
  - Mendiagnosis segfault dan error abort yang hanya muncul di bawah Bun
  - Kapan harus mempertahankan sidecar process Node.js untuk satu dependensi native yang membandel
- **Mengganti alih-alih memindahkan**
  - `better-sqlite3` ke `bun:sqlite`: selisih API, transaksi, dan semantik prepared statement
  - Library gambar dan kripto: alternatif JavaScript murni atau WASM beserta biayanya
  - Driver basis data: verifikasi perilaku `pg`, `mysql2`, dan `ioredis`
- **Lab Praktik**: Menjalankan proyek dengan setidaknya satu dependensi native di bawah Bun, atau mendokumentasikan keputusan terukur untuk mengisolasi dependensi tersebut

### Modul 6: Migrasi Suite Test dan Pengujian Paritas (Minggu 6)

- **Memindahkan suite Jest, Vitest, dan Mocha ke `bun:test`**
  - Global yang kompatibel dengan Jest: `describe`, `test`, `expect`, `beforeEach`, dan API timeout
  - Mocking: `mock()`, `mock.module()`, semantik spy, dan pemulihan state antar test
  - Snapshot: migrasi, perbedaan format, dan commit snapshot yang diperbarui secara sengaja
  - Coverage: reporter `--coverage`, ambang batas, dan cara menjaga angka lama tetap sebanding
  - Terjemahan konfigurasi: `jest.config.js`, `setupFilesAfterEach`, dan pipeline transform yang digantikan preload
- **Menjalankan kedua runtime secara berdampingan**
  - Harness diferensial yang mengeksekusi berkas test yang sama di bawah Node.js dan Bun
  - Perbandingan golden output untuk test yang menghasilkan teks atau JSON
  - Mengklasifikasi kegagalan: hanya lingkungan, urutan assertion, timing, atau perbedaan perilaku nyata
  - Contract test pada batas HTTP sebagai bukti paritas yang paling tahan lama
- **Menetapkan ambang paritas**
  - Persentase suite yang lulus sebagai gate, plus allowlist eksplisit untuk perbedaan yang diketahui
  - Timeout, test flaky, dan isolasi test yang hanya gagal pada eksekusi paralel
  - Mengubah laporan paritas menjadi gate rilis di CI
- **Lab Praktik**: Memigrasikan suite test nyata, menghasilkan laporan paritas dengan tabel tingkat kelulusan, dan menerbitkan allowlist perbedaan yang tersisa beserta justifikasinya

### Modul 7: Migrasi Pipeline Build dan Bundling (Minggu 7)

- **Menggantikan pipeline webpack, Rollup, esbuild, dan tsc**
  - Target `bun build`: `bun`, `node`, dan `browser`, serta apa yang berubah pada masing-masing target
  - Entry point, splitting, minifikasi, sourcemap, dan penanganan paket eksternal
  - Loader untuk berkas CSS, JSON, teks, dan aset tanpa ekosistem plugin
  - Di mana `bun build` belum menjadi pengganti sehingga bundler khusus tetap dipertahankan
- **Build library dan CLI**
  - Menghasilkan output ESM dan CJS untuk konsumen npm dengan `--format`
  - Berkas deklarasi: `tsc --emitDeclarationOnly` bersama `bun build`
  - Executable satu berkas dengan `bun build --compile` dan target kompilasi silang
  - Perbandingan ukuran dan waktu startup terhadap output build sebelumnya
- **Konsolidasi skrip dan task**
  - Menggantikan `ts-node`, `tsx`, `nodemon`, dan `concurrently` dengan `bun --watch` dan `bun run`
  - `bunx` versus `npx`, dan pinning versi untuk reprodusibilitas
  - `Bun.which`, `Bun.spawn`, dan `Bun.$` untuk skrip build yang sebelumnya ditulis dengan bash atau Node
- **Lab Praktik**: Memindahkan pipeline build produksi ke `bun build`, membandingkan ukuran bundle dan waktu cold start dengan output sebelumnya, serta mendokumentasikan bagian yang harus tetap memakai alat lama

### Modul 8: Verifikasi Perilaku dan Baseline Performa (Minggu 8)

- **Membuktikan kesetaraan, bukan mengasumsikannya**
  - Shadow traffic: mengirim permintaan cermin ke instance Bun dan membandingkan responsnya
  - Diffing tingkat respons: status, header, bentuk body, dan envelope error
  - Perbandingan tracing untuk distribusi latensi dan perilaku ekor
  - Memverifikasi background job, tugas cron, dan konsumen queue secara terpisah dari HTTP
- **Baseline performa**
  - Mengukur waktu startup, request per detik, latensi p99, dan RSS dibandingkan Node.js
  - Membenchmark jalur yang penting bagi produk Anda, bukan angka hello-world generik
  - Mengisolasi efek `--smol`, pemanasan JIT, dan penggunaan ulang koneksi
  - Merekam hasil dalam skrip benchmark reprodusibel yang masuk ke repositori
- **Pengujian mode kegagalan**
  - Crash yang dipaksakan, batas OOM, dan graceful shutdown di bawah Bun
  - Penanganan sinyal, pengurasan permintaan yang sedang berjalan, dan timeout stop container
  - Kompatibilitas format log dan pengiriman log dengan observabilitas yang sudah ada
- **Lab Praktik**: Membangun laporan paritas dan performa untuk satu layanan, termasuk latensi p99, waktu startup, plafon memori, dan setidaknya satu mode kegagalan yang diuji

### Modul 9: Konsolidasi Toolchain dan Keamanan Tipe (Minggu 9)

- **TypeScript di bawah Bun**
  - Model transpile-only Bun: apa yang dihapus dan apa yang tidak pernah diperiksa tipenya
  - Menjaga `tsc --noEmit` sebagai gate CI terpisah dan mengonfigurasinya untuk resolusi Bun
  - Pengaturan `tsconfig`: `moduleResolution: "bundler"`, `types`, dan paritas alias path dengan `bunfig.toml`
  - Penyiapan editor dan language server agar import terselesaikan sama seperti di runtime
- **Mengonsolidasikan alat pendukung**
  - Integrasi ESLint dan Prettier tanpa kehilangan set aturan yang sudah ada
  - Penanganan variabel lingkungan: `Bun.env`, urutan pemuatan `.env`, dan validasi env bertipe
  - Menggantikan dotenv, cross-env, dan rimraf dengan padanan runtime atau Bun shell
  - Debugging: `--inspect`, Chrome DevTools protocol, dan kualitas source map
- **Dokumentasi dan onboarding**
  - Menulis panduan migrasi untuk tim: perintah, jebakan, dan di mana alat lama masih dipakai
  - Menjaga satu sumber kebenaran untuk skrip agar kedua runtime tetap reprodusibel
- **Lab Praktik**: Mengonsolidasikan toolchain sebuah layanan dan mengukur selisih pengalaman pengembang: waktu instalasi, jumlah skrip, dan waktu hingga permintaan pertama

### Modul 10: Cutover CI/CD dan Container (Minggu 10)

- **Migrasi pipeline CI**
  - Memasang Bun di GitHub Actions dengan `oven-sh/setup-bun` dan meng-cache direktori cache Bun
  - Menjalankan matriks dua runtime agar Node.js tetap hijau sampai cutover disetujui
  - Instalasi frozen lockfile, eksekusi skrip `--bun`, dan isolasi kegagalan per matriks
  - Kebersihan artifact dan cache key ketika kedua runtime membangun proyek yang sama
- **Image container**
  - Dockerfile multi-stage pada image resmi `oven/bun` dengan stage runtime yang ramping
  - Ukuran image, caching layer, dan waktu startup dibandingkan image Node.js sebelumnya
  - Pengguna non-root, filesystem read-only, dan penanganan sinyal untuk stop yang graceful
  - Batas memori dan efek `--smol` pada container kecil
- **Strategi rilis**
  - Cutover canary dan blue-green dengan pemeriksaan error budget yang terukur
  - Health check, gate readiness, dan pemicu rollback otomatis
  - Perilaku driver basis data di bawah beban sebagai kejutan produksi yang paling umum
  - Menulis runbook cutover dan melatih rollback sebelum pergantian sebenarnya
- **Lab Praktik**: Mengirim pipeline CI dua runtime dan image container Bun, lalu melakukan rollback yang telah dilatih ke image sebelumnya

### Modul 11: Adopsi Bertahap dan Runtime Hibrida (Minggu 11)

- **Pola strangler untuk runtime**
  - Memindahkan satu layanan setiap kali, diurutkan berdasarkan risiko bukan berdasarkan antusiasme
  - Paket internal bersama yang harus menerbitkan output dua runtime
  - Feature flag dan pemecahan trafik selama periode transisi
  - Mempertahankan Node.js tanpa batas waktu untuk beban kerja yang membutuhkannya
- **Peluncuran di tingkat organisasi**
  - Enablement internal: workshop, repositori starter, dan checklist migrasi
  - Mengukur laba atas investasi: menit CI yang dihemat, waktu instalasi yang dihemat, insiden yang dihindari
  - Tata kelola: siapa yang menyetujui cutover, bukti apa yang disyaratkan, dan kapan layanan dikembalikan
  - Gate sunset untuk pipeline lama dan penghapusan shim kompatibilitas
- **Pemeliharaan jangka panjang**
  - Melacak rilis Bun terhadap allowlist kompatibilitas Anda
  - Meningkatkan Bun secara sengaja: pinning, peninjauan changelog, dan suite regresi
  - Mengumpan balik perbedaan yang teramati ke basis pengetahuan bersama
- **Lab Praktik**: Menulis rencana adopsi bertahap untuk sistem multi-layanan dengan urutan, pemilik, syarat bukti, dan kriteria pembalikan yang eksplisit

### Modul 12: Proyek Akhir — Layanan Nyata di Atas Bun (Minggu 12)

- **Lingkup dan perencanaan**
  - Memilih layanan Node.js nyata dengan dependensi yang tidak sepele
  - Mengunci ambang paritas dan target performa sebelum menulis kode
  - Mendokumentasikan register risiko dan jalur rollback
- **Eksekusi**
  - Manajemen paket, shim built-in, resolusi dependensi native, dan migrasi test
  - Porting pipeline build, matriks CI, dan image container
  - Bukti paritas diferensial dan angka benchmark terhadap baseline Node.js
- **Pengiriman**
  - Migrasi berbasis pull request dengan riwayat commit yang dapat diaudit
  - Laporan migrasi tertulis: apa yang mudah, apa yang sulit, apa yang ditinggalkan
  - Latihan rollback dan runbook yang dapat diikuti engineer lain tanpa pendampingan

## Proyek Akhir

**Migrasi Layanan Node.js ke Bun dengan Bukti Paritas**

Ambil satu layanan Node.js nyata yang tidak sepele dan migrasikan ke Bun dari awal hingga akhir, dengan bukti pada setiap tahap, bukan sekadar klaim keberhasilan.

Proyek harus menunjukkan:

1. **Audit kompatibilitas** — tabel risiko dependensi dan built-in dengan keputusan eksplisit untuk setiap item berisiko tinggi
2. **Toolchain hasil konversi** — `bun.lock`, keputusan trusted dependency, dan instalasi CI yang reprodusibel
3. **Suite test yang termigrasi** — berjalan di bawah `bun test`, dengan laporan paritas yang menunjukkan tingkat kelulusan dan allowlist perbedaan yang berjustifikasi
4. **Pipeline build hasil porting** — output `bun build` dibandingkan dengan bundle sebelumnya pada ukuran dan cold start
5. **Perilaku dan performa terukur** — contract test HTTP diferensial plus angka sebelum/sesudah untuk startup, throughput, latensi p99, dan plafon memori
6. **Cerita deployment** — matriks CI dua runtime, image container Bun, rencana cutover canary, dan rollback yang telah dilatih
7. **Laporan migrasi** — catatan jujur tentang celah yang ditemukan, shim yang ditambahkan, dan apa pun yang sengaja ditinggal di Node.js

**Luaran**:

- Repositori Git dengan riwayat migrasi dalam bentuk pull request yang dapat ditinjau
- Matriks kompatibilitas dan register risiko
- Harness paritas beserta laporan terbarunya
- Skrip benchmark dan hasilnya yang masuk ke repositori
- Dockerfile, workflow CI, dan runbook cutover
- Ringkasan eksekutif satu halaman yang menyatakan apakah migrasi memenuhi kriteria keberhasilan yang ditetapkan

## Kriteria Penilaian

- **Tugas Mingguan (30%)**: Artefak dikumpulkan sebagai pull request — audit, lockfile, shim, laporan paritas, dan pipeline. Dinilai berdasarkan kualitas bukti, bukan hanya pada hal yang berfungsi. Setiap pengumpulan harus menyatakan apa yang diukur dan apa yang diaproksimasi.
- **Tinjauan Tengah Kursus (20%)**: Setelah Modul 6 — layanan yang menjalankan suite test-nya di bawah Bun dengan laporan paritas terbit dan daftar perbedaan tersisa yang eksplisit dan berjustifikasi.
- **Proyek Akhir (40%)**: Migrasi proyek akhir, dinilai berdasarkan ketelitian audit, bukti paritas, pengukuran performa, kesiapan deployment, kualitas rollback, dan kejujuran laporan migrasi.
- **Tinjauan Sejawat dan Kebergunaan Runbook (10%)**: Meninjau dua migrasi proyek akhir lain, ditambah penilaian apakah engineer lain dapat menjalankan runbook cutover dan rollback yang dikumpulkan tanpa perlu bertanya.

## Referensi

- [Dokumentasi Bun](https://bun.sh/docs) — Referensi runtime, manajer paket, test runner, dan bundler
- [Kompatibilitas Node.js di Bun](https://bun.sh/docs/runtime/nodejs-apis) — Daftar resmi API `node:` yang didukung beserta perbedaan yang diketahui
- [Migrasi ke Bun](https://bun.sh/guides) — Panduan resmi untuk memindahkan proyek yang sudah ada ke Bun
- [bun test](https://bun.sh/docs/cli/test) — Dokumentasi test runner, termasuk catatan kompatibilitas Jest
- [bun build](https://bun.sh/docs/bundler) — Bundler, executable satu berkas, dan kompilasi silang
- [oven-sh/setup-bun](https://github.com/oven-sh/setup-bun) — Action GitHub Actions yang dipakai pada modul CI
- [Image Docker oven/bun](https://hub.docker.com/r/oven/bun) — Image container resmi untuk modul deployment

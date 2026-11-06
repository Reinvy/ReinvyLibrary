---
title: "Silabus Rekayasa Migrasi Tailwind CSS"
description: "Silabus lanjutan 10 minggu untuk para engineer yang memodernisasi codebase yang sudah ada dengan Tailwind CSS — mencakup kerangka keputusan migrasi, audit style dan token, penerjemahan konfigurasi v3 ke v4, pemetaan utility berbasis codemod, koeksistensi CSS legacy, konsolidasi design system, gerbang visual regression, rollout bertahap, dan dekomisioning style legacy."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Migrasi Tailwind CSS

## Ringkasan

Sebagian besar pekerjaan Tailwind di produksi bukanlah proyek greenfield. Tim mewarisi tema Bootstrap, SCSS yang ditulis tangan, library komponen BEM, CSS Modules, dan konfigurasi Tailwind v3 yang mendahului arsitektur CSS-first — lalu diminta memodernisasi codebase tersebut tanpa membekukan roadmap produk. Rekayasa migrasi karenanya menjadi disiplin tersendiri: sebagian soal urutan kerja, sebagian transformasi otomatis, sebagian perubahan organisasi, dan jauh lebih sering gagal karena cakupan yang tidak dibatasi daripada karena ada utility class yang belum tersedia.

Silabus lanjutan 10 minggu ini memperlakukan migrasi sebagai masalah rekayasa dengan tahapan yang terukur. Jika silabus dasar membahas fundamental utility-first, silabus lanjutan membahas rekayasa design system dan variant, dan silabus rekayasa aksesibilitas mengorganisasi pekerjaan di sekitar kepatuhan WCAG, maka kursus ini mengorganisasi pekerjaan di sekitar *memindahkan sistem yang sudah ada dari satu rezim styling ke rezim lain*. Setiap modul memasangkan satu konsep migrasi dengan artefak yang harus dihasilkan peserta — laporan audit, tema hasil penerjemahan, codemod, lapisan koeksistensi, suite visual regression, buku catatan deprecation — sehingga pada akhirnya peserta memiliki playbook migrasi yang lengkap dan dapat dipertanggungjawabkan, bukan sekadar kumpulan opini.

Kurikulum ini sengaja menempatkan pengambilan keputusan dan pengukuran di depan. Minggu 1–3 menetapkan apakah migrasi layak dilakukan, apa yang sebenarnya ada di dalam codebase, dan seperti apa arsitektur targetnya. Minggu 4–6 menangani mekanika tersulit: penerjemahan konfigurasi, pemetaan class otomatis, dan menjalankan dua sistem styling berdampingan tanpa perang specificity. Minggu 7–9 membahas konsekuensi tingkat sistem: konsolidasi design token, visual regression sebagai jaring pengaman, dan rollout bertahap dengan jalur deprecation yang nyata. Minggu 10 menutup dengan bagian yang paling sering diabaikan engineer — pekerjaan organisasi dan pasca-migrasi yang menentukan apakah sistem baru bertahan setelah bersentuhan dengan tim.

Prasyarat: kemahiran kerja dengan Tailwind CSS (utility, variant, prefix responsif), kenyamanan dengan specificity CSS, cascade layer, dan custom property, serta kecukupan fluency tooling Node.js untuk membaca dan mengubah build pipeline. Tidak diperlukan pengalaman migrasi sebelumnya.

## Kurikulum

### Minggu 1: Kerangka Keputusan Migrasi dan Pemodelan Cakupan

- **Empat Bentuk Migrasi**
  - Greenfield dengan tepi legacy: permukaan baru memakai Tailwind, permukaan lama dibiarkan sampai tersentuh oleh pekerjaan fitur
  - Restyle seluruh aplikasi: seluruh lapisan view dibangun ulang di sistem baru dengan tenggat tetap
  - Strangler bertahap: route atau komponen dimigrasi satu per satu di balik batas yang stabil
  - Upgrade toolchain saja: tetap di Tailwind tetapi berpindah dari v3 ke v4, dari config-first ke CSS-first
  - Mengapa memilih bentuknya lebih dulu mencegah mode kegagalan paling umum — upaya "migrasi semua, kapan saja" yang tanpa batas
- **Pemodelan Biaya dan Risiko**
  - Estimasi berbasis inventaris: jumlah komponen, jumlah permukaan, dan variasi desain sebagai pendorong biaya yang sebenarnya
  - Register risiko: regresi visual, regresi aksesibilitas, pergeseran ukuran bundle, kerusakan theming, penurunan throughput developer
  - Anggaran migrasi: seberapa besar duplikasi sementara yang dapat diterima, dan berapa lama jendela koeksistensi boleh dibiarkan terbuka
- **Input Keputusan dan Kriteria Go/No-Go**
  - Kapan menulis ulang lebih murah daripada migrasi, dan bagaimana menilainya secara jujur
  - Batasan framework (server component, interop CSS-in-JS, shadow DOM, iframe)
  - Kapasitas tim, bandwidth review, dan apakah migrasi dapat diparalelkan
- **Latihan**: Tulis memo keputusan migrasi dua halaman untuk aplikasi legacy nyata atau simulasi, yang menyebutkan bentuk migrasi, register risiko, jendela koeksistensi, dan tiga kriteria no-go yang eksplisit

### Minggu 2: Audit Baseline — Style, Token, dan Inventaris Permukaan

- **Membangun Inventaris**
  - Mengenumerasi route, komponen, dan partial bersama, lalu memeringkatkannya berdasarkan trafik dan frekuensi perubahan
  - Mengklasifikasi setiap permukaan: marketing statis, padat formulir, padat data, interaktif/animatif
  - Membedakan komponen yang harus dimigrasi lebih dulu (churn tinggi) dari yang bisa menunggu (beku)
- **Arkeologi CSS dan Token**
  - Mengekstrak design system de facto dari variabel SCSS, custom property CSS, dan konfigurasi framework (`$theme-colors` Bootstrap, `theme.extend` Tailwind v3)
  - Mendeteksi nilai yang nyaris duplikat — dua belas nuansa abu-abu dan sembilan biru yang sedikit berbeda yang ada karena tidak ada yang memiliki skalanya
  - Memetakan nama semantik legacy ke kosakata token yang dinormalisasi sebelum ada perubahan kode
  - Mengukur CSS mati: selector yang tidak lagi dirujuk template mana pun dan bisa langsung dihapus alih-alih dimigrasi
- **Metrik Variasi dan Utang**
  - Menghitung nilai spacing, warna, radius, shadow, dan ukuran font yang berbeda per permukaan
  - Titik panas specificity: kepadatan `!important`, selector descendant yang dalam, selector ID
  - Laporan baseline pra-migrasi sebagai artefak yang menjadi pembanding bagi seluruh minggu berikutnya
- **Latihan**: Hasilkan audit baseline untuk satu aplikasi nyata: tabel inventaris permukaan, lembar ekstraksi token, daftar CSS mati, dan jumlah variasi per dimensi desain

### Minggu 3: Arsitektur Target dan Model Tailwind v4

- **Arsitektur CSS-First**
  - Bagaimana v4 menggeser konfigurasi JavaScript dari pusat gravitasi: `@import "tailwindcss"`, `@theme`, `@utility`, dan `@custom-variant`
  - Variabel tema sebagai custom property CSS sungguhan, dan apa yang berubah karenanya untuk theming runtime dan pekerjaan multi-brand
  - Pembangkitan utility sesuai permintaan dan implikasinya bagi waktu build serta deteksi konten
- **Kontrol Layering dan Cascade**
  - Semantik `@layer` di v4 dan bagaimana layer hasil generate Tailwind berinteraksi dengan CSS aplikasi
  - Di mana stylesheet legacy sebaiknya diletakkan agar specificity-nya tetap terprediksi selama koeksistensi
  - `@utility` untuk segelintir utility kustom yang benar-benar perlu, dibandingkan nilai arbitrer sekali pakai
- **Merancang Sistem Target**
  - Menetapkan kontrak token: ramp primitif, alias semantik, dan token tingkat komponen
  - Memilih permukaan variant: atribut `data-*`, state variant `aria-*`, dan container query
  - Menentukan batas komponen — apa yang menjadi komponen React/Vue/Svelte, apa yang tetap berupa class recipe
  - Menulis architecture decision record yang akan dipatuhi seluruh proses migrasi berikutnya
- **Latihan**: Susun arsitektur target untuk aplikasi yang diaudit pada Minggu 2 — kerangka `@theme`, rencana layer, daftar batas komponen, dan ADR yang mendokumentasikan trade-off-nya

### Minggu 4: Penerjemahan Konfigurasi — Config v3 ke Tema CSS-First

- **Penerjemahan Mekanis**
  - Memetakan key `theme.extend` ke namespace `@theme`: warna, spacing, ukuran font, radius, shadow, breakpoint
  - Menerjemahkan registrasi plugin ke `@plugin` dan `@utility`
  - Menangani variant kustom yang dideklarasikan melalui `addVariant`, serta migrasi pola bergaya `safelist`
- **Celah Semantik yang Merusak Bila Naif**
  - Konstruksi class dinamis dan classname berbentuk template literal yang tidak terlihat oleh scanner
  - Warna yang dihitung saat runtime dan pergeseran dari nilai JS ke variabel CSS
  - Perubahan perilaku preflight dan dampaknya pada base style legacy
- **Strategi Verifikasi**
  - Membandingkan CSS hasil generate sebelum dan sesudah: token demi token, nilai demi nilai
  - Membuktikan paritas dengan set fixture kecil sebelum menyentuh permukaan produk
  - Strategi pinning versi agar perubahan konfigurasi tidak pernah masuk diam-diam bersama kenaikan dependensi
- **Latihan**: Terjemahkan konfigurasi v3 yang tidak sepele ke tema CSS-first v4, lalu buktikan paritasnya dengan membandingkan output utility hasil generate untuk set fixture berisi 50 class

### Minggu 5: Pemetaan Class Berbasis Codemod

- **Mengapa Penulisan Ulang Class Secara Manual Tidak Skalabel**
  - Jumlah komponen versus kapasitas review; kurva kelelahan yang menghasilkan inkonsistensi senyap
  - Apa yang dapat diotomatiskan codemod dengan aman versus apa yang menuntut keputusan manusia
- **Membangun Tabel Pemetaan**
  - Nama desain legacy ke keluarga utility: `btn-primary` menjadi class recipe, `.card` menjadi komponen, `.mt-20px` menjadi `mt-5`
  - Pemetaan ambigu — nilai yang tidak punya padanan utility persis dan butuh keputusan (dibulatkan, tema diperluas, atau drift visual diterima)
  - Mencatat setiap keputusan sehingga tabelnya menjadi dokumentasi permanen
- **Menulis dan Menjalankan Codemod**
  - Transformasi berbasis AST dengan jscodeshift atau ts-morph alih-alih regex atas template
  - Varian HTML dan template framework: JSX, Vue SFC, Svelte, dan template hasil render server butuh parser berbeda
  - Idempotensi, dry run, review diff, dan syarat keamanan "dapat di-revert dalam satu commit"
  - Membersihkan residu: string class yatim, blok style kosong, dan import yang tidak terpakai
- **Latihan**: Tulis codemod yang menulis ulang setidaknya lima pola class legacy pada dua dialek template, jalankan dalam mode dry run pada codebase sampel, dan review diff-nya untuk mencari false positive

### Minggu 6: Koeksistensi, Isolasi Preflight, dan Kontrol Specificity

- **Menjalankan Dua Sistem Sekaligus**
  - Kontrak koeksistensi: stylesheet mana dimuat di mana, dalam layer apa, dan siapa yang menang
  - Membatasi cakupan Tailwind agar tidak mereset permukaan legacy — strategi isolasi preflight dan batas stylesheet per route
  - Teknik scoping container dan komponen untuk widget legacy yang ditanam
- **Disiplin Specificity dan Urutan Pemuatan**
  - Bagaimana cascade layer meratakan pertarungan specificity, dan mode kegagalan ketika CSS legacy dimuat di luar layer mana pun
  - Utang `!important`: menahannya, lalu menghapusnya dalam satu putaran yang tercatat
  - CSS pihak ketiga yang tidak dapat diubah: wrapping, isolasi shadow DOM, atau penerimaan yang disengaja
- **Styling Lintas Batas**
  - Komponen hasil migrasi yang dirender di dalam layout legacy, dan partial legacy di dalam shell hasil migrasi
  - State bersama: focus ring, perilaku hover dan active, dark mode, serta direktif RTL di lintas batas
  - Checklist uji interop yang wajib dipenuhi setiap PR koeksistensi
- **Latihan**: Implementasikan koeksistensi untuk satu route — Tailwind dibatasi pada shell hasil migrasi, CSS legacy dipertahankan untuk anak yang belum disentuh — lalu dokumentasikan rencana layer dan tiga risiko interop yang ditemukan

### Minggu 7: Konsolidasi Design System dan Token

- **Dari Variasi Hasil Audit ke Skala yang Dikelola**
  - Meruntuhkan tabel token hasil ekstraksi menjadi ramp yang dapat dipertahankan: lebih sedikit nilai, langkah yang disengaja, maksud yang terdokumentasi
  - Alias semantik sebagai kontrak yang memungkinkan redesign visual terjadi tanpa menyentuh komponen
  - Konsolidasi multi-brand dan white-label: satu lapisan primitif, banyak lapisan semantik
- **Migrasi Library Komponen**
  - Memigrasi primitif lebih dulu (button, input, badge, card) lalu menyusun ke atas
  - Class recipe versus API komponen: di mana variant bergaya `cva` mengalahkan penyusunan string kondisional
  - Memindahkan state interaksi secara setia — disabled, loading, invalid, read-only — bukan hanya happy path
- **Theming dan Kebutuhan Runtime**
  - Dark mode dan tema kontras tinggi sebagai set token, bukan override class
  - Kepadatan yang dikendalikan pengguna dan penggantian brand yang digerakkan atribut data
  - Mencegah sistem baru menumpuk kembali variasi yang baru saja dihapus audit: aturan kontribusi dan gerbang review
- **Latihan**: Konsolidasikan lembar token Minggu 2 menjadi ramp yang dikelola dengan alias semantik, lalu migrasikan satu keluarga komponen dan tunjukkan diff penggunaan token sebelum/sesudah

### Minggu 8: Visual Regression dan Gerbang Kualitas Migrasi

- **Jaring Pengaman**
  - Mengapa unit test tidak menangkap regresi styling, dan mengapa diff screenshot adalah satu-satunya cakupan yang kredibel untuk restyle
  - Strategi pengambilan baseline: fixture stabil, data yang di-seed, font dan animasi deterministik
  - Penyetelan threshold agar noise tidak melatih tim untuk mengabaikan kegagalan
- **Tooling dan Penyambungan CI**
  - Assertion screenshot Playwright, matriks per viewport dan per tema, serta biaya matriks yang terlalu besar
  - Menangani flakiness: jam dibekukan, transisi dimatikan, viewport tetap, penantian pemuatan font
  - Menggating PR migrasi: diff visual wajib, pemindaian aksesibilitas wajib, delta ukuran bundle dilaporkan
- **Melampaui Piksel**
  - Pemeriksaan regresi aksesibilitas (visibilitas fokus, kontras, landmark) pada setiap permukaan hasil migrasi
  - Penegakan anggaran bundle: ukuran CSS, pertumbuhan utility tak terpakai, dan biaya nilai arbitrer
  - Sinyal performa: layout shift yang muncul akibat perubahan spacing atau metrik font
- **Latihan**: Bangun suite visual regression yang mencakup setidaknya enam permukaan pada dua viewport dan dua tema, lalu sambungkan ke CI sebagai check wajib dengan kebijakan threshold yang terdokumentasi

### Minggu 9: Rollout Bertahap, Feature Flag, dan Deprecation

- **Menyusun Urutan Rollout**
  - Strategi per route dan per komponen, serta cara memilihnya per permukaan
  - Feature flag untuk styling: kapan flag sepadan dengan kompleksitasnya dan bagaimana mematikannya sesuai jadwal
  - Validasi parallel run: menyajikan permukaan lama dan baru kepada pengguna internal sebelum flip
- **Buku Catatan Deprecation**
  - Setiap stylesheet, mixin, dan partial legacy mendapat pemilik, kriteria penghapusan, dan tanggal target
  - Mendeteksi dan membuktikan kode mati sebelum dihapus: pemindaian referensi, cakupan dari trafik nyata, penghapusan bertahap
  - Masalah "10 persen terakhir": segelintir layar yang tidak ingin disentuh siapa pun, dan cara menutupnya secara paksa
- **Rollback dan Respons Insiden**
  - Merancang migrasi agar setiap permukaan dapat di-revert secara independen dalam satu deploy
  - Seperti apa insiden styling pada pukul dua pagi, dan runbook yang mempersingkatnya
  - Review pasca-insiden yang berfokus pada penyebab sistemik alih-alih PR individual
- **Latihan**: Hasilkan rencana rollout dengan urutan per permukaan, inventaris feature flag dengan tanggal kill, dan buku catatan deprecation yang setiap entrinya memiliki pemilik dan kriteria penghapusan

### Minggu 10: Rollout Organisasi dan Rekayasa Pasca-Migrasi

- **Membuat Sistem Baru Bertahan**
  - Enablement: dokumentasi internal, contoh yang sudah dikerjakan, sesi pairing, dan ritme office hours migrasi
  - Penegakan lint dan review — melarang nilai arbitrer kecuali sebagai pengecualian, menegakkan penggunaan token, menangkap regresi class legacy
  - Tata kelola kontribusi: siapa yang boleh menambah token, siapa yang boleh menambah variant, dan bagaimana usulan ditinjau
- **Mempertahankan Hasil**
  - Memensiunkan lapisan kompatibilitas, stylesheet ganda, dan skrip codemod setelah tugasnya selesai
  - Instrumentasi sistem setelah migrasi: adopsi token, drift variasi, tren bundle, dan kepatuhan aksesibilitas
  - Audit enam bulan: apakah codebase telah menumpuk kembali utang yang baru saja dihapus migrasi
- **Mengomunikasikan Pekerjaan**
  - Melaporkan progres migrasi kepada pimpinan engineering dalam istilah risiko yang berkurang dan throughput yang meningkat, bukan jumlah class yang dikonversi
  - Menulis retrospektif yang benar-benar akan dibaca oleh migrasi berikutnya
- **Latihan**: Tulis paket enablement untuk migrasi Anda — panduan kontribusi satu halaman, set aturan lint, proposal tata kelola untuk perubahan token, dan rencana instrumentasi 90 hari pasca-migrasi

## Proyek Akhir

Migrasikan aplikasi frontend legacy — disediakan sebagai aplikasi multi-permukaan realistis dengan SCSS era Bootstrap, konfigurasi Tailwind v3 yang baru diadopsi sebagian, dan setidaknya satu widget pihak ketiga — ke arsitektur CSS-first Tailwind v4, dan serahkan sebagai paket migrasi yang reproducible, bukan sekadar restyle yang sudah jadi.

Deliverable terdiri dari enam artefak:

1. **Memo keputusan migrasi** yang menyebutkan bentuk migrasi, register risiko, jendela koeksistensi, dan kriteria no-go yang eksplisit.
2. **Audit baseline** berisi inventaris permukaan, lembar token hasil ekstraksi, daftar CSS mati, dan jumlah variasi per dimensi desain.
3. **Arsitektur target** yang terdiri dari implementasi `@theme`, rencana cascade layer, daftar batas komponen, dan ADR yang mencatat trade-off-nya.
4. **Transformasi otomatis** — codemod dengan tabel pemetaan terdokumentasi, mode dry run yang idempoten, dan diff yang sudah direview pada setidaknya tiga keluarga komponen.
5. **Gerbang kualitas** — suite visual regression yang tersambung CI mencakup dua viewport dan dua tema, ditambah pemindaian aksesibilitas dan pemeriksaan anggaran bundle.
6. **Paket rollout dan deprecation** — urutan per permukaan, inventaris feature flag dengan tanggal kill, buku catatan deprecation dengan pemilik, dan rencana instrumentasi 90 hari.

Setidaknya satu route harus dimigrasi sepenuhnya dari ujung ke ujung dengan CSS legacy terbukti terhapus, dan setiap permukaan legacy yang tersisa harus tercantum dalam buku catatan dengan pemilik bernama dan kriteria penghapusan.

## Kriteria Penilaian

- **Latihan mingguan (40%)**: Artefak setiap minggu dinilai dari kelengkapan, bukti, dan kualitas keputusan. Audit tanpa angka, codemod tanpa tabel pemetaan, atau rencana rollout tanpa pemilik akan bernilai rendah terlepas dari kerapiannya.
- **Kebenaran migrasi (20%)**: Apakah tema hasil penerjemahan menghasilkan utility yang setara? Apakah codemod mempertahankan perilaku dan menangani kedua dialek template? Apakah keputusan cascade layer dan koeksistensi dapat dipertanggungjawabkan dan benar-benar diterapkan?
- **Ketatnya gerbang kualitas (15%)**: Cakupan matriks visual regression, alasan kebijakan threshold, tidak adanya test flaky, dan apakah gerbang tersebut benar-benar akan menangkap regresi spacing atau warna.
- **Realisme rollout (15%)**: Kredibilitas urutan dan estimasi, adanya jalur rollback independen, serta apakah buku catatan deprecation akan bertahan saat bersentuhan dengan tim produk yang sibuk.
- **Paket proyek akhir (10%)**: Apakah keenam artefak menyatu menjadi set dokumen yang dapat dieksekusi kolega tanpa perlu bertanya kepada penulisnya.
- **Kriteria distinction**: Proyek yang lulus memigrasi satu permukaan dengan benar. Proyek bernilai distinction membuktikan bahwa migrasinya dapat diulang — bukti paritas, transformasi otomatis, gerbang yang ditegakkan, dan jalur deprecation yang benar-benar ditutup alih-alih menggantung.

## Referensi

- Dokumentasi Tailwind CSS — upgrade dari v3 ke v4, variabel tema, `@utility`, dan cascade layer: https://tailwindcss.com/docs/upgrade-guide
- Blog Tailwind CSS — arsitektur v4, engine Oxide, dan alasan di balik konfigurasi CSS-first: https://tailwindcss.com/blog
- MDN Web Docs — cascade layer CSS, custom property, dan specificity: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade
- Dokumentasi jscodeshift dan ts-morph untuk codemod berbasis AST: https://jscodeshift.com/ dan https://ts-morph.com/
- Perbandingan visual dan assertion screenshot Playwright: https://playwright.dev/docs/test-snapshots
- Web Almanac — bab CSS, sebagai landasan mengenai payload CSS di dunia nyata dan pola legacy: https://almanac.httparchive.org/
- "Refactoring UI" oleh Adam Wathan dan Steve Schoger — untuk penalaran desain di balik ramp token dan skala spacing
- Working Effectively with Legacy Code oleh Michael C. Feathers — characterization test dan identifikasi seam, yang langsung berlaku untuk pekerjaan styling brownfield

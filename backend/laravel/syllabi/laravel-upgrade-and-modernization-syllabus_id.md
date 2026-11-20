---
title: "Silabus Rekayasa Upgrade dan Modernisasi Laravel"
description: "Kurikulum lanjutan 10 minggu tentang modernisasi aplikasi Laravel warisan, mencakup penilaian versi, jaring pengaman characterization test, upgrade runtime PHP, codemod otomatis dengan Rector, migrasi versi mayor framework, perubahan skema tanpa downtime, penggantian build frontend, utang paket, deployment canary, dan program modernisasi berkelanjutan."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Upgrade dan Modernisasi Laravel

## Ringkasan

Sebagian besar aplikasi Laravel di produksi bukanlah proyek baru. Umurnya empat sampai delapan tahun, berjalan di versi framework yang dirilis sebelum lini LTS saat ini, memegang lockfile Composer yang tidak berani diregenerasi siapa pun, dan membawa test suite yang hanya mencakup happy path dari fitur yang sudah tidak penting lagi. Masalah rekayasa yang dihadapi tim bukan "belajar Laravel" — melainkan "memindahkan sistem yang sedang berjalan melewati tiga versi mayor framework dan dua versi mayor PHP tanpa kehilangan satu hari pendapatan atau satu pesanan pun."

Silabus lanjutan 10 minggu ini memperlakukan masalah tersebut sebagai disiplin, bukan pekerjaan rutin. Setiap modul mengasumsikan peserta sudah menulis Laravel setiap hari dan sekarang membutuhkan pertimbangan untuk mengubah sistem hidup secara aman: cara mengukur apa yang benar-benar berisiko, cara membangun jaring pengaman sebelum menyentuh satu baris kode, cara memekanisasi bagian yang mekanis dengan codemod alih-alih menyunting ribuan titik pemanggilan secara manual, dan cara menyusun upgrade multi-bulan agar setiap minggu berakhir dengan artefak yang bisa di-deploy, bukan branch berumur panjang yang menyimpang dari produksi.

Kurikulum ini sengaja diurutkan berdasarkan risiko ketakterbalikan. Penilaian dan cakupan tes datang lebih dulu karena keduanya murah dan membuat setiap langkah berikutnya bisa dibalik. Runtime dan codemod menyusul karena keduanya menghasilkan diff mekanis yang mudah ditinjau. Migrasi framework dan lapisan data datang setelahnya, karena perubahan skema adalah satu-satunya keputusan dalam seluruh program ini yang tidak bisa dikembalikan dengan `git revert`. Frontend, utang dependensi, dan deployment mengikuti, ditutup dengan pekerjaan operasional untuk membuktikan sistem hasil upgrade berperilaku lebih baik daripada yang lama — serta kebiasaan modernisasi berkelanjutan yang mencegah terbentuknya jeda lima tahun berikutnya.

Lulusan mampu menjawab, dalam sebuah design review, mengapa setiap langkah upgrade diurutkan seperti itu, di mana batas rollback pada tiap tahap, dan bagaimana mereka akan membuktikan sistem baru tidak diam-diam lebih buruk daripada sistem yang digantikannya.

## Kurikulum

### Modul 1: Penilaian Upgrade dan Pemetaan Risiko (Minggu 1)

- **Inventaris Sebelum Opini**
  - Matriks versi: `php -v`, `composer show laravel/framework`, dan selisih antara lini yang terpasang dengan lini yang masih didukung
  - `composer outdated --direct` versus `--all`: dependensi langsung adalah kewajiban Anda, dependensi transitif adalah batasan Anda
  - Membaca `composer.lock` sebagai dokumen kompatibilitas: paket mana yang memaku framework, dan mana yang memaku PHP itu sendiri
  - Menemukan batasan versi yang membuat upgrade mustahil tanpa langkah antara (`"laravel/framework": "^8.0"` pada paket yang tidak dirawat siapa pun)
- **Memetakan Permukaan Aplikasi**
  - Route, perintah konsol, job, task terjadwal, event listener, dan notifikasi — enam titik masuk yang semuanya harus dijalankan
  - Menemukan kopling framework yang akan rusak: service provider kustom yang menyentuh internal container, kelas `Kernel` yang dioverride, array middleware `app/Http/Kernel.php`
  - Sensus API usang dengan analisis statis, bukan grep: simbol apa saja yang dihapus antara versi Anda dan versi target
  - Inventaris integrasi pihak ketiga: driver pembayaran, mail, storage, queue, dan search yang membawa kebutuhan versinya sendiri
- **Penilaian Risiko dan Pengurutan**
  - Memberi skor pekerjaan berdasarkan radius ledakan (jalur pendapatan, autentikasi, integritas data) versus usaha
  - Memilih jalur upgrade: satu lompatan besar dengan codemod, atau hop bertahap (8 → 9 → 10 → 11) yang masing-masing dikirim ke produksi
  - Kapan hop bertahap menang (setiap hop bisa dibalik, tim belajar perkakasnya) dan kapan biayanya lebih besar (tiga siklus deploy, tiga jendela regresi)
  - Menulis ADR upgrade: versi target, pengurutan, batas rollback, dan non-goal yang dinyatakan eksplisit
- **Lab Praktik**: Susun penilaian upgrade satu halaman untuk aplikasi Laravel 8 warisan yang disediakan — matriks versi, daftar dependensi penghambat, rincian pekerjaan berskor risiko, dan rekomendasi pengurutan dengan batas rollback dinyatakan per tahap

### Modul 2: Membangun Jaring Pengaman Lebih Dulu (Minggu 2)

- **Mengapa Cakupan Tes Mendahului Kode**
  - Aturan yang tidak nyaman: upgrade tanpa tes regresi adalah penulisan ulang dengan langkah tambahan
  - Cakupan sebagai batas bawah, bukan tujuan — 60% cakupan pada jalur pendapatan mengalahkan 95% cakupan pada feature flag yang sudah mati
  - Mengidentifikasi jalur kritis: route yang memindahkan uang, mengautentikasi pengguna, atau menulis data yang tidak bisa direkonstruksi
- **Characterization Test untuk Kode Tanpa Tes**
  - Golden-master testing: rekam respons HTTP nyata untuk sebuah route, lalu bandingkan byte demi byte setelah upgrade
  - Merekam fixture dari data berbentuk produksi, setelah dibersihkan dari informasi pribadi
  - Membuat snapshot output perintah konsol, payload queue, dan isi mail — bagian yang gagal secara senyap
  - Menguji perilaku, bukan implementasi: apa yang dibekukan dan apa yang dibiarkan bebas agar upgrade punya ruang bergerak
- **Infrastruktur Tes yang Bertahan Melewati Upgrade**
  - Isolasi lapisan database: transaksi per tes versus skema baru, dan mengapa parallel testing mengubah jawabannya
  - Pest versus PHPUnit di berbagai versi framework — sintaks yang akan dan tidak akan bertahan saat lompatan versi
  - Memalsukan tepi sistem: `Http::fake()`, `Queue::fake()`, `Mail::fake()` dipakai sebagai lapisan stabilisasi selama migrasi
  - Contract test untuk batas pihak ketiga agar kenaikan versi SDK muncul sebagai satu tes gagal, bukan insiden produksi
- **Mengukur Baseline**
  - Membekukan baseline performa: latensi p50/p95, jumlah query per request, puncak memori
  - Menyimpan baseline sebagai artefak di repositori agar perbandingan pasca-upgrade bukan latihan mengandalkan ingatan
  - Disiplin terhadap noise baseline: cache hangat, dataset tetap, pengulangan menjalankan, dan variansi yang dilaporkan
- **Lab Praktik**: Ambil alur checkout Laravel 8 yang belum bertes, bangun suite characterization yang memaku perilaku saat ini byte demi byte, dan rekam baseline performa yang akan menjadi pembanding sistem hasil upgrade

### Modul 3: Modernisasi Runtime PHP (Minggu 3)

- **Runtime Adalah Upgrade yang Sebenarnya**
  - PHP 7.4 ke 8.4 sebagai rangkaian perubahan perilaku, bukan nomor versi: deprecation, ketegasan tipe, dan ekstensi yang dihapus
  - Perubahan yang benar-benar menghantam codebase Laravel: properti dinamis, parameter nullable implisit, perbandingan string-ke-angka, `#[\ReturnTypeWillChange]` pada ArrayAccess
  - JIT dalam praktik: mengapa mengaktifkannya bukan kemenangan otomatis untuk beban kerja web satu-request-per-proses
  - Memilih target: minor terbaru yang didukung versus satu di belakangnya demi kompatibilitas ekstensi
- **Adopsi Sistem Tipe**
  - Properti bertipe dan constructor promotion diterapkan pada kelas warisan tanpa mengubah perilaku
  - Enum menggantikan state machine berbasis konstanta kelas — termasuk cast Eloquent yang membuatnya tersimpan dengan benar
  - `readonly` untuk value object, dan jebakan serialisasi yang ditimbulkannya pada job di queue
  - Sintaks callable kelas satu dan named argument yang dipakai untuk menghapus indireksi berbasis reflection
- **Analisis Statis sebagai Kompas Migrasi**
  - Memasang Larastan dan memulai dari level yang gagal hari ini, lalu menaikkannya per direktori
  - File baseline: menerima error yang sudah ada tanpa menerima error baru
  - Membaca error analisis statis saat upgrade: apakah ini bug tipe sungguhan, atau tanda tangan metode yang diubah framework di bawah Anda
  - Menyambungkan level analisis ke CI sehingga kemajuan modernisasi terukur selama berbulan-bulan, bukan berdasarkan perasaan
- **Lab Praktik**: Pindahkan codebase Laravel 8 PHP 7.4 ke PHP 8.4 dengan Larastan pada level 5, menggunakan baseline per direktori agar upgrade mendarat dalam kenaikan yang bisa ditinjau, bukan satu PR sepanjang 4.000 baris

### Modul 4: Codemod Otomatis dengan Rector (Minggu 4)

- **Mengapa Menyunting Manual Tidak Skalabel**
  - Aritmetika perubahan mekanis: 500 titik pemanggilan helper yang diganti nama, masing-masing adalah peluang typo yang tidak ditinjau siapa pun
  - Codemod sebagai transformasi yang bisa ditinjau, direproduksi, dan dijalankan ulang — diff-nya adalah dokumentasinya
  - Di mana codemod berhenti: logika bisnis, batas arsitektur, dan apa pun yang membutuhkan pengetahuan domain
- **Bekerja dengan Rector**
  - Instalasi dan konfigurasi: `rector.php` sebagai kumpulan path dan rule set, diberi versi bersama aplikasi
  - Rule set Laravel (`LARAVEL_80`, `LARAVEL_90`, `LARAVEL_100`, `LARAVEL_110`) dan rule set level PHP, diterapkan berurutan, bukan sekaligus
  - Dry run sebagai alat inventaris: keluaran `--dry-run` adalah peta seberapa banyak utang mekanis yang ada
  - Membaca diff codemod secara kritis — transformasi otomatis yang bisa dikompilasi tetapi mengubah semantik
- **Aturan Kustom untuk Pola Anda Sendiri**
  - Menulis aturan untuk abstraksi internal yang membungkus API framework yang telah dihapus
  - Menggunakan aturan tersebut untuk memigrasikan titik pemanggilan DAN menghapus wrapper-nya setelahnya
  - Menguji aturan terhadap fixture sebelum dilepas ke codebase
- **Disiplin dan Gate CI**
  - Satu rule set per pull request; commit codemod tidak pernah dicampur dengan perubahan perilaku
  - `--dry-run` di CI sebagai pendeteksi penyimpangan yang gagal ketika sintaks warisan baru masuk
  - Anggaran tinjauan: sebesar apa PR codemod boleh tumbuh sebelum peninjau berhenti membaca (dan apa yang harus dilakukan sebagai gantinya)
- **Lab Praktik**: Bangun pipeline Rector yang meng-upgrade pemanggilan framework pada codebase Laravel 8 ke permukaan API Laravel 11, ditambah satu aturan kustom untuk wrapper internal, dikirim sebagai rangkaian pull request satu-aturan dengan diff bersih

### Modul 5: Migrasi Versi Mayor Framework (Minggu 5)

- **Membaca Panduan Upgrade sebagai Spesifikasi**
  - Panduan upgrade sebagai daftar periksa perilaku, bukan changelog: apa yang berubah, apa yang dihapus, apa yang berubah makna secara senyap
  - Membangun artefak pelacak dari panduan dengan setiap item dipetakan ke tes atau lokasi kode
  - Medan per versi: Laravel 9 (Symfony 6, migrasi stub anonim), Laravel 10 (tipe native, default `Predis` yang diusangkan), Laravel 11 (skeleton ramping, `bootstrap/app.php`), Laravel 12 (era starter kit, kenaikan dependensi)
- **Menulis Ulang Bootstrap Aplikasi**
  - `app/Http/Kernel.php`, `app/Console/Kernel.php`, dan `app/Exceptions/Handler.php` yang melebur ke dalam `bootstrap/app.php`
  - Mendeklarasikan ulang middleware, grup middleware, alias middleware route, dan prioritasnya pada API fluent yang baru
  - Rendering dan reporting exception yang didaftarkan melalui permukaan berbasis closure yang baru
  - Penjadwalan yang pindah dari `Kernel::schedule()` ke `routes/console.php`, dan apa yang terjadi bila task didefinisikan di kedua tempat
- **Perubahan Permukaan Container, Facade, dan Helper**
  - Perpindahan facade dan contract antar versi, serta alias yang menjaga import lama tetap terkompilasi
  - Helper yang dihapus dan konsolidasi API string/array (metode `Str`, `Arr` yang dipindahkan dari helper)
  - Perubahan perilaku Eloquent: `Model::preventLazyLoading` bawaan, perilaku cast, semantik `upsert`
  - Carbon 2 ke Carbon 3: tanda selisih, default mutable versus immutable, dan assertion tanggal dalam tes
- **Penyelarasan Dependensi**
  - Menaikkan `laravel/framework`, `symfony/*`, PHPUnit, dan Collision bersama-sama — semuanya satu unit kompatibilitas
  - Menyelesaikan pohon konflik `composer update` dengan membaca batasan, bukan dengan menghapus lockfile
  - Disiplin membangun ulang container: build yang reproducible, kebutuhan platform (`config.platform.php`), dan paritas ekstensi antara CI dan produksi
- **Lab Praktik**: Migrasikan aplikasi Laravel 9 ke Laravel 12, termasuk penulisan ulang `bootstrap/app.php` dengan paritas middleware dan exception penuh, serta buktikan paritasnya dengan suite characterization dari Modul 2

### Modul 6: Migrasi Lapisan Data dan Skema (Minggu 6)

- **Keputusan yang Tidak Bisa Dibalik**
  - Mengapa perubahan skema adalah batas rollback sesungguhnya: kode bisa dibalik dalam hitungan detik, kolom yang dihapus tidak kembali
  - Expand-contract sebagai pola bawaan: tambah bentuk baru, tulis ganda, backfill, alihkan pembacaan, hapus bentuk lama pada rilis berikutnya
  - Squashing migrasi untuk direktori `migrations/` warisan dan menghasilkan schema dump untuk instalasi baru
- **Mekanika Migrasi Tanpa Downtime**
  - Locking di MySQL dan PostgreSQL: statement `ALTER` mana yang memblokir penulisan dan berapa lama
  - Online DDL, `ALGORITHM=INPLACE`, dan kapan kolom nullable dengan default tetap membangun ulang tabel
  - Backfill dalam batch dari job di queue, dengan idempotensi dan checkpoint kemajuan
  - Urutan deploy: migrate-first versus migrate-after, dan kode yang harus toleran terhadap kedua skema selama jendela transisi
- **Modernisasi Engine dan Charset**
  - MySQL 5.7 ke 8.0 sebagai upgrade di dalam upgrade: kolasi `utf8mb4`, kata kunci terlarang, `ONLY_FULL_GROUP_BY`
  - Perilaku kolom JSON dan perbedaan query yang merusak kode pelaporan
  - Lompatan versi PostgreSQL dan keputusan `pg_upgrade` versus logical replication
  - Connection pooling dan lapisan proxy (PgBouncer, ProxySQL) yang mengubah perilaku migrasi
- **Semantik Model dan Query**
  - Cast yang berubah makna antar versi, dan tes yang menangkapnya
  - `Model::preventSilentlyDiscardingAttributes` dan `preventAccessingMissingAttributes` sebagai pagar pengaman saat migrasi
  - Paparan N+1 setelah upgrade: mengapa jumlah query berubah dan bagaimana baseline dari Modul 2 membuktikannya
- **Lab Praktik**: Lakukan migrasi expand-contract pada tabel orders berbentuk produksi — tambah kolom baru, tulis ganda, backfill 2 juta baris dalam batch, alihkan pembacaan, dan buktikan tidak ada request gagal di bawah beban sepanjang proses

### Modul 7: Penggantian Frontend dan Pipeline Build (Minggu 7)

- **Mix ke Vite**
  - Dunia webpack Laravel Mix versus dev server ESM Vite: apa yang benar-benar berubah bagi aplikasi
  - Memigrasikan `webpack.mix.js` ke `vite.config.js` — entry point, alias, dan jalan keluar plugin legacy
  - Penggantian direktif Blade (`@vite` versus `mix()`) dan mode kegagalan manifest mismatch di produksi
  - Versioning aset, cache busting, dan invalidasi CDN selama peralihan
- **Modernisasi Lapisan View**
  - Ekstraksi komponen Blade dari include yang terduplikasi, dan sintaks komponen anonim yang muncul di tengah upgrade
  - Memilih jalur rendering ke depan: Blade plus Alpine, Livewire, atau Inertia — biaya migrasi masing-masing
  - Server-side rendering yang diperkenalkan tanpa memutus kontrak HTML yang sudah ada
  - Perubahan pipeline CSS: PostCSS, lompatan versi Tailwind, dan regresi purge-safelist yang menyertainya
- **Penggantian Progresif**
  - Routing strangler-fig: memasang frontend baru di balik prefiks path sementara halaman Blade lama tetap melayani
  - Sesi dan autentikasi bersama di antara dua frontend selama transisi
  - Feature flag sebagai saklar antara view lama dan baru, dengan rollout per tenant
- **Lab Praktik**: Ganti build aplikasi Blade berbasis Mix dengan Vite, migrasikan satu area fitur ke arsitektur komponen di balik feature flag, dan tunjukkan build produksi yang berfungsi dengan aset ber-hash dan flag rollback yang bekerja

### Modul 8: Utang Dependensi dan Paket (Minggu 8)

- **Menilai Kekayaan yang Ada**
  - Paket terbengkalai: `composer audit`, penanda abandonment Packagist, dan paket yang maintainer-nya berhenti membalas
  - Kepemilikan langsung versus transitif: paket mana yang benar-benar bisa Anda pilih untuk diganti
  - Matriks kompatibilitas yang disusun manual ketika README paket belum diperbarui sejak Laravel 8
- **Keputusan Penggantian**
  - Ganti, fork, vendor, atau implementasi ulang — kriteria keputusan dan biaya masing-masing selama tiga tahun
  - Memilih paket yang terawat dibanding fork, dan kondisi di mana fork adalah pilihan benar (permukaan kecil, jalur kritis, kebutuhan proprietary)
  - Membungkus SDK pihak ketiga di balik antarmuka Anda sendiri agar penggantian berikutnya cukup mengubah satu file
  - Menghapus paket: menemukan paket yang terpasang untuk fitur yang sudah dihapus dua tahun lalu
- **Kopling Framework di Dalam Paket**
  - Paket yang menyentuh internal container atau meng-override kelas framework — yang rusak pada setiap upgrade mayor
  - Paket first-party yang didukung resmi dan irama versi independennya (Horizon, Telescope, Sanctum, Passport, Sail)
  - Meninjau risiko upgrade paket tak terawat dengan membaca service provider-nya, bukan batasan versinya
- **Kebijakan untuk Masa Depan**
  - Pembaruan dependensi otomatis (Dependabot, Renovate) yang dikelompokkan agar kebisingan patch tidak menyembunyikan kenaikan mayor
  - Tinjauan utang upgrade bulanan: seberapa jauh aplikasi boleh tertinggal dari lini framework
  - Mendokumentasikan aturan "tidak ada dependensi tak terawat baru" yang mencegah proyek modernisasi berikutnya
- **Lab Praktik**: Audit pohon dependensi warisan dengan minimal 30 paket langsung, klasifikasikan masing-masing sebagai pertahankan, upgrade, ganti, atau hapus, dan eksekusi dua penggantian di balik antarmuka dengan contract test yang membuktikan perilaku tetap terjaga

### Modul 9: Mengirim Upgrade (Minggu 9)

- **Strategi Deployment**
  - Blue/green versus canary versus rolling: mana yang benar-benar didukung infrastruktur Anda dan apa yang diasumsikan masing-masing terhadap database
  - Batasan urutan migrasi: apa yang harus dikirim sebelum, bersamaan dengan, dan setelah perubahan skema
  - Memanaskan rilis baru: opcache, config cache, route cache, view cache, dan lonjakan latensi cold-start
  - Worker queue dan masalah kompatibilitas payload lama/baru selama deploy bergulir
- **Observabilitas sebagai Uji Penerimaan**
  - Dashboard dibuat sebelum deploy, bukan sesudahnya: tingkat error, latensi p95, kedalaman queue, tingkat kegagalan job, jumlah koneksi DB
  - Membandingkan dengan baseline Modul 2 memakai toleransi eksplisit, bukan perasaan
  - Kesinambungan structured logging dan tracing melewati pergantian versi
  - Ambang alert yang diperketat selama jendela rilis, dan aturan tegas siapa yang menarik pemicu rollback
- **Rehearsal Rollback**
  - Melatih rollback di staging dengan data berbentuk produksi, termasuk arah skema yang tidak bisa dibatalkan
  - Membatasi waktu keputusan: berapa lama setelah deploy buruk rollback masih lebih murah daripada perbaikan maju
  - Feature flag yang membuat rollback bersifat parsial, bukan total
- **Lab Praktik**: Jalankan deployment canary aplikasi Laravel hasil upgrade ke lingkungan staging dengan pengalihan trafik 10%, lakukan rehearsal rollback dari awal sampai akhir, dan serahkan perbandingan metrik sebelum/sesudah dengan toleransi yang dinyatakan di muka

### Modul 10: Modernisasi Berkelanjutan (Minggu 10)

- **Mencegah Jeda Lima Tahun Berikutnya**
  - Kebijakan versi yang didukung dengan jarak maksimum tertulis (misalnya, tidak pernah lebih dari satu versi mayor di belakang)
  - Menjadwalkan pekerjaan upgrade sebagai kapasitas berulang, bukan proyek heroik tahunan
  - Melacak jendela dukungan framework dan PHP terhadap kalender rilis Anda sendiri
- **Pagar Pengaman yang Menjaga Codebase Tetap Bisa Di-upgrade**
  - Deprecation logging di produksi: memunculkan `E_DEPRECATED` dan notifikasi deprecation framework sebelum berubah menjadi penghapusan
  - Analisis statis dan dry run codemod sebagai gate CI permanen, sehingga sintaks warisan tidak bisa masuk kembali
  - Architectural fitness function: tes yang gagal ketika sebuah controller mengimpor SDK secara langsung atau sebuah paket menyentuh container
  - Kebijakan dependensi yang dikodekan di CI, bukan di halaman wiki yang tidak dibaca siapa pun
- **Memori Institusional**
  - Menulis runbook upgrade sambil mengerjakannya, agar upgrade kedua menjadi daftar periksa, bukan investigasi
  - ADR untuk keputusan pengurutan yang akan dipertanyakan enam bulan kemudian
  - Dokumentasi serah terima: apa yang rusak, dalam urutan apa, dan tes mana yang membuktikannya
- **Mengukur Program**
  - Metrik yang penting setelah upgrade: frekuensi deploy yang pulih, tingkat insiden, latensi p95, usia dependensi
  - Struktur retrospektif yang menghasilkan perubahan kebijakan konkret, bukan teater retrospektif
- **Lab Praktik**: Terbitkan proposal program modernisasi untuk aplikasi yang Anda upgrade — kebijakan jarak versi, pagar pengaman CI dengan konfigurasi nyata, template tinjauan kuartalan, dan runbook yang diturunkan dari pekerjaan Minggu 1-9

## Proyek Akhir

Modernisasikan aplikasi manajemen pesanan Laravel 8 / PHP 7.4 warisan yang disediakan menjadi Laravel 12 / PHP 8.4, dikirim sebagai rangkaian rilis berbentuk produksi, bukan satu peralihan tunggal.

Aplikasi dikirim dengan utang yang disengaja: jalur checkout tanpa tes, build Mix, tiga paket terbengkalai termasuk satu yang membungkus helper framework yang telah dihapus, direktori `migrations/` dengan 140 entri tanpa schema dump, dan `app/Http/Kernel.php` yang membawa prioritas middleware kustom. Proyek ini menuntut peserta untuk:

- Menghasilkan penilaian upgrade dan ADR dari Modul 1, termasuk rincian pekerjaan berskor risiko
- Membangun suite characterization yang memaku alur checkout dan refund byte demi byte, serta merekam baseline performa
- Meng-upgrade runtime PHP dengan Larastan aktif pada level yang dinaikkan bertahap dan baseline yang di-commit
- Mengirim migrasi mekanis sebagai rangkaian pull request Rector satu-aturan dengan diff bersih dan mudah ditinjau
- Memigrasikan framework ke Laravel 12 termasuk penulisan ulang `bootstrap/app.php` dengan paritas middleware dan exception yang terverifikasi
- Melakukan perubahan skema expand-contract pada tabel orders dengan backfill batch minimal satu juta baris dan nol request gagal di bawah beban
- Mengganti build Mix dengan Vite dan memigrasikan satu area fitur di balik feature flag
- Mengganti atau memensiunkan paket terbengkalai di balik antarmuka dengan contract test
- Menjalankan deployment canary dengan dashboard yang dibuat lebih dulu dan rollback yang telah dilatih
- Menyerahkan proposal modernisasi berkelanjutan dari Modul 10

Keluarannya adalah repositori plus binder operasional: runbook upgrade, kumpulan ADR, perbandingan metrik pasca-upgrade terhadap baseline, dan konfigurasi pagar pengaman yang menjaga codebase tetap bisa di-upgrade. Penilai harus mampu merekonstruksi seluruh upgrade dari binder tersebut tanpa mewawancarai peserta.

## Kriteria Penilaian

- **Lab Mingguan (40%)**: Setiap lab modul dinilai berdasarkan apakah artefaknya akan lolos tinjauan engineer senior — suite characterization yang benar-benar memaku perilaku, pipeline codemod dengan diff bersih, migrasi yang berjalan tanpa locking, canary dengan dashboard yang dibuat lebih dulu. Tidak ada nilai parsial untuk artefak yang hanya bekerja pada happy path.
- **Disiplin Code Review (15%)**: Pull request harus memisahkan perubahan mekanis dari perubahan perilaku. Codemod yang dicampur dengan perbaikan logika, atau perubahan skema yang dibundel dengan refactor, kehilangan poin meskipun berhasil berjalan.
- **Bukti Rollback (15%)**: Setiap tahap rilis harus punya batas rollback yang dinyatakan dan minimal satu rehearsal. Tahap tanpa cerita rollback dianggap tahap yang belum selesai, terlepas dari apakah deploy-nya berhasil.
- **Proyek Akhir (25%)**: Dinilai berdasarkan kebenaran keadaan akhir (aplikasi berperilaku identik atau lebih baik pada suite perilaku yang dipaku), eksekusi tanpa downtime di bawah load test, dan kualitas binder operasional. Upgrade yang berfungsi tanpa binder memperoleh paling banyak separuh poin proyek.
- **Standar Kelulusan**: Semua lab modul dikumpulkan, kedua load test terlewati tanpa request gagal, suite characterization hijau pada sistem hasil upgrade, dan rehearsal rollback benar-benar dijalankan — bukan hanya dideskripsikan.

## Referensi

- [Panduan Upgrade Laravel](https://laravel.com/docs/upgrade) — spesifikasi per versi yang menjadi dasar kursus ini
- [Catatan Rilis Laravel](https://laravel.com/docs/releases) — jendela dukungan, kebijakan versi, dan apa yang berubah pada setiap lini mayor
- [Rector](https://getrector.com/documentation) — refactoring otomatis, rule set, dan penulisan aturan kustom
- [Larastan](https://github.com/larastan/larastan) — ekstensi PHPStan untuk Laravel, dengan perilaku level dan baseline yang dipakai di Modul 3
- [PHP: Migrasi dari PHP 7.4 ke 8.x](https://www.php.net/manual/en/appendices.php) — lampiran perubahan yang merusak pada runtime
- [Dokumentasi Pest](https://pestphp.com/docs) — API pengujian yang dipakai untuk suite characterization
- [Panduan Upgrade Symfony](https://symfony.com/doc/current/contributing/code/bc.html) — kebijakan BC di balik kenaikan mayor Laravel sendiri
- [Martin Fowler: StranglerFigApplication](https://martinfowler.com/bliki/StranglerFigApplication.html) — pola penggantian progresif yang dipakai di Modul 7
- [Pola Expand/Contract](https://martinfowler.com/bliki/ParallelChange.html) — disiplin migrasi skema di Modul 6
- [Operasi Online DDL MySQL 8.0](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html) — perubahan mana yang mengunci dan mana yang tidak
- [Dokumentasi Renovate](https://docs.renovatebot.com/) — pembaruan dependensi berkelompok dan kebijakan dari Modul 8
- [Google SRE Workbook: Canarying Releases](https://sre.google/workbook/canarying-releases/) — landasan strategi deployment untuk Modul 9

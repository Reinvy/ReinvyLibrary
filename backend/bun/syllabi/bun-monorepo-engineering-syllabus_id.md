---
title: "Silabus Rekayasa Monorepo dan Arsitektur Workspace Bun"
description: "Kurikulum lanjutan 12 minggu untuk tim rekayasa yang menjalankan beberapa aplikasi dan paket bersama dalam satu workspace Bun — mencakup topologi workspace, graf instalasi dan symlink, desain batas paket, katalog versi, orkestrasi tugas, publikasi paket internal, CI berbasis dampak, dan build container per aplikasi."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Monorepo dan Arsitektur Workspace Bun

## Ringkasan

Sebagian besar tim mengadopsi monorepo secara tidak sengaja: satu utilitas bersama disalin ke tiga repositori, seseorang mengekstraknya, lalu aplikasi kedua membutuhkannya, dan dalam setahun "monorepo" itu menjadi kumpulan proyek yang saling longgar, butuh sembilan menit untuk instalasi, dan melakukan deploy semuanya sekaligus tanpa peduli ada perubahan atau tidak. Silabus ini memperlakukan monorepo sebagai persoalan arsitektur, bukan persoalan tata letak folder, dan menggunakan workspace Bun sebagai fondasinya karena satu lockfile, penyaringan tugas bawaan, dan penautan yang sadar workspace membuat mekanismenya terlihat, bukan tersembunyi di balik rantai plugin.

Kursus ini ditujukan bagi engineer yang sudah mampu membangun dan merilis satu aplikasi Bun atau Node.js dan kini harus melakukannya untuk sebuah sistem yang terdiri dari beberapa aplikasi, pustaka bersama, tooling internal, dan paket konfigurasi yang dirawat oleh beberapa tim. Posisinya melengkapi silabus Bun lainnya tanpa mengulanginya: silabus pengembangan umum mengajarkan runtime, silabus internal runtime turun ke bawah permukaan API, silabus full-stack membangun satu produk, dan silabus migrasi memindahkan layanan Node.js yang sudah ada. Silabus ini berbicara tentang repositori sebagai satu kesatuan — bagaimana graf workspace dibentuk, bagaimana dependensi mengalir di dalamnya, bagaimana pekerjaan dijadwalkan melintasinya, dan bagaimana CI serta deployment berhenti berbanding lurus dengan ukuran repositori.

Setiap modul diakhiri dengan lab yang meninggalkan artefak di dalam repositori: catatan keputusan topologi, diagnosis resolusi, seperangkat aturan batas, kebijakan katalog, graf tugas, rencana rilis, workflow ter-shard, atau build per aplikasi. Proyek akhir menggabungkan artefak tersebut menjadi monorepo yang berjalan dengan peningkatan instalasi, build, dan CI yang terukur dibandingkan baseline yang tercatat, karena monorepo yang tidak terbukti lebih cepat daripada polyrepo yang digantikannya hanya menambah biaya koordinasi.

## Kurikulum

### Modul 1: Ekonomi Monorepo dan Topologi Workspace (Minggu 1)

- **Menentukan apakah monorepo adalah unit yang tepat**
  - Biaya sesungguhnya: keterikatan irama rilis, radius dampak satu commit buruk, beban CI, dan perawatan tooling
  - Manfaat sesungguhnya: perubahan lintas potong yang atomik, satu graf dependensi, konfigurasi bersama, dan kemudahan menemukan kode
  - Polyrepo, monorepo, dan hibrida: apa yang menjadi murah dan apa yang menjadi mahal pada masing-masing pilihan
  - Mengukur ukuran repositori: berapa banyak aplikasi dan paket sebelum graf memerlukan tata kelola sendiri
- **Merancang topologi sebelum menambah aplikasi kedua**
  - Pemisahan `apps/` dan `packages/`, serta apa yang tidak masuk keduanya (skrip, tooling, fixture)
  - Konvensi penamaan dan scope yang tahan pertumbuhan: `@acme/api`, `@acme/ui`, `@acme/config`, `@acme/testing`
  - Taksonomi batas: aplikasi yang bisa di-deploy, pustaka yang dipublikasikan, pustaka internal saja, paket konfigurasi, dan utilitas pengujian
  - Catatan keputusan topologi: menuliskan aturan yang menentukan di mana paket baru diletakkan
- **Manifest workspace akar**
  - Glob `workspaces`, pola negatif, dan alasan glob yang terlalu luas menua dengan buruk
  - Dependensi khusus akar versus dependensi per paket, serta bagaimana satu dependensi akar yang salah bocor ke semua paket
  - Skrip terpusat dan perbedaan antara akar sebagai koordinator dan akar sebagai sebuah paket
- **Lab Praktik**: Menyusun catatan keputusan topologi dan struktur repositori untuk tiga aplikasi dan enam paket, beserta aturan eksplisit penempatan paket baru

### Modul 2: Graf Instalasi, Penautan, dan Resolusi (Minggu 2)

- **Bagaimana satu lockfile menjadi banyak pohon `node_modules`**
  - `bun install` di akar: apa yang dijamin `bun.lock` tunggal dan apa yang tidak
  - Penautan hoisted versus isolated serta mode kegagalan yang dipertukarkan masing-masing
  - Paket workspace yang berupa symlink: apa yang sebenarnya dibuat `workspace:*` di disk
  - Mengapa import yang berjalan di lokal tetap bisa gagal di build container
- **Mendiagnosis resolusi, bukan menebak**
  - Membaca graf resolusi dan menemukan paket mana yang menarik dependensi transitif tertentu
  - Deteksi duplikat: dua salinan pustaka yang sama masuk melalui jalur berbeda
  - Penempatan peer dependency di workspace, dan mengapa React atau sebuah driver harus ter-resolve sebagai tepat satu salinan
  - Melacak import yang gagal dari pesan error kembali ke manifest, bukan ke pembersihan cache
- **Reprodusibilitas dan kepercayaan**
  - `--frozen-lockfile` di CI dan makna diff lockfile saat review
  - Trusted dependency dan skrip siklus hidup: paket mana yang diizinkan mengeksekusi kode saat instalasi
  - Instalasi offline dan vendored untuk lingkungan build yang dibatasi
  - Performa instalasi sebagai properti arsitektur: kunci cache, penggunaan ulang store, serta instalasi dingin versus hangat
- **Lab Praktik**: Menyisipkan dependensi duplikat dengan sengaja, mendiagnosisnya dari graf resolusi, menghapusnya, dan mencatat waktu instalasi dingin serta hangat sebelum dan sesudah

### Modul 3: Batas Paket dan Protokol Workspace (Minggu 3)

- **Membuat batas dapat ditegakkan, bukan sekadar niat**
  - Konsumen internal versus eksternal: paket mana yang boleh diimpor oleh aplikasi mana
  - Peta `exports` sebagai API publik paket, dan menutup jalur internal di baliknya
  - `workspace:*` versus rentang semver terbitan: memilih berdasarkan apakah paket keluar dari repositori
  - Mencegah deep import ke dalam pohon sumber paket lain
- **Batas tipe dan build**
  - Berkas `tsconfig.json` per paket dengan konfigurasi dasar bersama
  - Project reference dan pemeriksaan tipe inkremental melintasi graf
  - Paket khusus tipe yang membawa kontrak bersama tanpa beban runtime
  - Path alias: kemudahan versus keterikatan tersembunyi yang merusak output terbitan
- **Penegakan di dalam repositori**
  - Aturan lint dan pemeriksaan batas import yang menggagalkan build saat terjadi pelanggaran
  - Konvensi review untuk perubahan lintas paket dan siapa yang harus menyetujuinya
  - Deprekasi dan penghapusan: mempensiunkan paket tanpa diam-diam merusak tiga aplikasi
- **Lab Praktik**: Menutup satu paket di balik peta `exports`, menambahkan pemeriksaan batas import, dan menunjukkan build gagal pada import terlarang sebelum akhirnya lolos bersih

### Modul 4: Katalog Versi dan Tata Kelola Dependensi (Minggu 4)

- **Masalah versi bersama**
  - Mengapa dua versi sebuah framework dalam satu repositori biasanya merupakan cacat, bukan kemudahan
  - Mekanisme `catalog`: menyatakan versi satu kali dan merujuknya dari setiap workspace
  - Menentukan dependensi mana yang masuk katalog dan mana yang harus tetap lokal
  - Menaikkan satu entri katalog dan memahami radius dampak sebenarnya
- **Proses tata kelola**
  - Satu pemilik untuk dependensi infrastruktur bersama, beserta jalur eskalasi ketika sebuah aplikasi memerlukan pengecualian
  - Irama peningkatan: terjadwal, berbasis keamanan, dan oportunistik
  - Pull request pembaruan dependensi otomatis yang menghormati katalog alih-alih melawannya
  - Membaca diff lockfile saat review: gejolak transitif yang tidak diminta siapa pun
- **Kebijakan sebagai kode**
  - Memblokir salinan duplikat paket kritis di CI
  - Allow-list dependensi berdasarkan scope, lisensi, dan status pemeliharaan
  - Mencatat pengecualian dengan pemilik dan tanggal kedaluwarsa, bukan komentar permanen
- **Lab Praktik**: Mengonversi tiga aplikasi ke set dependensi berbasis katalog, menambahkan gate versi duplikat di CI, dan mendokumentasikan satu pengecualian yang dibenarkan

### Modul 5: Orkestrasi Tugas dan Graf Build (Minggu 5)

- **Menjalankan pekerjaan lintas workspace**
  - Penyaringan berdasarkan nama paket, glob, dan path, serta bagaimana filter tersusun
  - Eksekusi berurutan sesuai dependensi: apa yang diurutkan otomatis oleh Bun dan apa yang tidak bisa diketahuinya
  - Run paralel dan sekuensial: kapan konkurensi aman dan kapan ia merusak output
  - Perbedaan antara tugas yang harus berjalan sekali di akar dan tugas yang harus berjalan per paket
- **Merancang tugas yang mudah di-cache**
  - Input deterministik: berkas sumber, konfigurasi, variabel lingkungan, dan artefak hasil pembangkitan
  - Kunci cache yang memuat semua hal yang dapat mengubah output, dan tidak memuat yang tidak bisa
  - Build inkremental: apa yang harus dilewati pada run kedua dan bagaimana membuktikannya
  - Menghindari badai rebuild ketika satu paket bersama berubah dan sebelas konsumen ikut terbangun
- **Lingkar umpan balik bagi developer**
  - Mode watch melintasi graf tanpa memantau seluruh repositori
  - Membatasi run lokal pada "paket ini dan semua yang bergantung padanya"
  - Menjaga daftar tugas akar tetap kecil agar orang masih memakainya
- **Lab Praktik**: Membangun graf tugas build, test, dan typecheck yang terfilter dan berurutan sesuai dependensi, lalu mengukur run kedua dan menunjukkan apa yang dilewati

### Modul 6: Publikasi Paket Internal dan Rekayasa Rilis (Minggu 6)

- **Ketika sebuah paket keluar dari workspace**
  - Paket khusus internal yang tidak pernah terbit, dan paket terbitan yang dikonsumsi di luar repositori
  - Kewajiban ganda paket terbitan: ia harus bisa dibangun mandiri, bukan hanya di dalam monorepo
  - Menyiapkan tarball dan memeriksa apa yang sebenarnya ikut terkirim sebelum mempublikasikan apa pun
- **Versioning melintasi graf**
  - Versioning independen versus tetap, dan mengapa pustaka UI bersama memaksa pilihan tertentu
  - Changeset atau pencatatan niat setara, sehingga kenaikan versi direview, bukan ditebak
  - Kanal pra-rilis dan dist-tag untuk konsumen staging
  - Mengoordinasikan perubahan yang merusak bersama aplikasi yang harus bermigrasi pada jendela yang sama
- **Mempublikasikan dengan aman**
  - Konfigurasi registry privat untuk paket internal
  - Provenance, penandatanganan, dan perbedaan antara "terbit" dan "tepercaya"
  - Mempublikasikan dari CI saat merge, bukan dari laptop, dengan token yang hanya bercakupan registry
  - Dry run, dan kebiasaan memeriksa manifest yang dipak sebelum registry melakukannya
- **Lab Praktik**: Mempublikasikan satu paket internal melalui kanal pra-rilis, mengonsumsinya dari proyek sementara di luar repositori, lalu mempromosikannya ke versi stabil dengan entri changeset

### Modul 7: Strategi Pengujian di Seluruh Workspace (Minggu 7)

- **Apa yang diubah monorepo dalam hal pengujian**
  - Unit test per paket versus integration test di akar versus end-to-end test terhadap aplikasi yang sudah di-deploy
  - Paket pengujian bersama: fixture, factory, dan harness yang tidak boleh masuk ke bundle produksi
  - Agregasi cakupan lintas paket, dan mengapa ambang per paket menyembunyikan paket mati
  - Isolasi test ketika beberapa paket menyentuh database atau filesystem yang sama
- **Menjalankan test yang tepat**
  - Run terfilter saat pengembangan dan di CI
  - Pemilihan berbasis dampak: memetakan berkas yang berubah ke paket dan aplikasi yang harus diuji ulang
  - Contract test antara paket internal dan aplikasi yang mengonsumsinya
  - Karantina test flaky tanpa mengubah suite menjadi sekadar saran
- **Umpan balik cepat tanpa keyakinan palsu**
  - Memisahkan suite menjadi gate cepat dan run malam yang mendalam
  - Kebersihan snapshot lintas paket yang berbagi komponen
  - Mereproduksi kegagalan yang hanya muncul di CI secara lokal dengan perintah terfilter yang sama
- **Lab Praktik**: Menerapkan pemilihan test berbasis dampak untuk graf enam paket, lalu membuktikan bahwa paket yang dependensinya tidak berubah memang dilewati

### Modul 8: CI untuk Monorepo — Cache, Shard, dan Cakupan (Minggu 8)

- **Instalasi adalah masalah performa pertama**
  - Kunci cache berbasis hash lockfile dan apa yang membatalkannya
  - Menyimpan package store antar run alih-alih meng-cache `node_modules`
  - Instalasi frozen dan biaya lockfile yang berubah di setiap branch
  - Langkah setup Bun dalam workflow CI, dipin pada satu versi alih-alih mengambang
- **Membuat pipeline sebanding dengan perubahan**
  - Menentukan himpunan perubahan dari diff dan memetakannya ke workspace
  - Sharding matriks per paket, dengan pembagian seimbang alih-alih alfabetis
  - Membangun graf sekali dan membagikan artefak alih-alih membangun ulang di tiap job
  - Trade-off gagal-cepat versus laporan lengkap saat dua belas paket berjalan paralel
- **Kebersihan workflow**
  - Grup konkurensi yang membatalkan run tergantikan pada branch yang sama
  - Pipeline pull request dan branch main yang terpisah dengan cakupan berbeda
  - Pemeriksaan seluruh repositori (lint, lisensi, aturan batas) yang tidak boleh diduplikasi per paket
  - Pelacakan biaya: menit CI per merge, dan commit yang diam-diam menggandakannya
- **Lab Praktik**: Memecah satu workflow monolitik menjadi job instalasi, matriks test ter-shard, dan build bergerbang, lalu mencatat waktu dinding serta biaya menit dibanding sebelumnya

### Modul 9: Build Container dan Deployment per Aplikasi (Minggu 9)

- **Satu repositori, banyak image**
  - Mengapa lockfile di akar mempersulit Dockerfile `COPY package.json` yang naif
  - Build multi-stage yang sadar workspace: hanya menginstal yang dibutuhkan satu aplikasi
  - Urutan layer yang menjaga layer dependensi tetap hangat saat sumber berubah
  - Identitas image: tag berdasarkan aplikasi dan commit, bukan berdasarkan repositori
- **Hanya men-deploy yang berubah**
  - Memetakan perubahan hasil merge ke himpunan aplikasi yang harus dirilis
  - Pipeline deploy independen dengan langkah build bersama
  - Konfigurasi lingkungan per aplikasi, bukan per repositori
  - Rollback yang bercakupan satu aplikasi
- **Batas waktu build dan waktu runtime**
  - Kapan sebuah paket harus dikompilasi ke dalam image dan kapan bisa dipasang dari registry
  - Aset bersama, font, dan berkas statis lintas aplikasi
  - Menjauhkan paket khusus pengembangan dari image produksi
- **Lab Praktik**: Menulis Dockerfile multi-stage yang sadar workspace untuk satu aplikasi, membangunnya dari cache dingin, dan menunjukkan ukuran image dibanding salinan akar yang naif

### Modul 10: Keamanan Tipe dan Linting pada Skala Repositori (Minggu 10)

- **Pemeriksaan tipe sebagai operasi graf**
  - Project reference dan mode `--build` lintas paket
  - Berkas informasi inkremental dan tempat yang tepat untuk menyimpannya
  - Responsivitas editor ketika repositori memiliki dua puluh proyek
  - Membedakan "tipe rusak" dari "tipe belum dibangun"
- **Berbagi konfigurasi tanpa berbagi nasib**
  - Paket konfigurasi untuk `tsconfig`, aturan linter, dan pengaturan formatter
  - Perubahan konfigurasi yang berversi dan efeknya pada semua paket sekaligus
  - Override per paket yang harus dibenarkan, bukan diakumulasi
  - Menjauhkan tipe hasil pembangkitan (skema, klien API) dari jalur kritis pemeriksaan tipe
- **Menegakkan aturan yang penting**
  - Pemeriksaan batas, siklus import, dan dependensi tak terpakai di satu tempat
  - Cakupan lint: aturan seluruh repositori versus aturan per paket
  - Pre-commit hook yang tetap berada di bawah anggaran waktu yang berguna
- **Lab Praktik**: Menambahkan project reference ke enam paket, mengukur typecheck dingin dan hangat, serta memangkas run hangat setidaknya setengah melalui konfigurasi inkremental

### Modul 11: Rantai Pasok, Kebersihan, dan Perawatan Jangka Panjang (Minggu 11)

- **Risiko dependensi dalam graf bersama**
  - Mengaudit workspace ketika satu dependensi transitif rentan menjangkau delapan paket
  - Menambal dependensi secara lokal dan mencatat alasan tambalan itu ada
  - Penegakan kebijakan lisensi pada aplikasi dan paket terbitan
  - Meninjau dependensi baru sebagai keputusan arsitektur, bukan diff satu baris
- **Kebersihan repositori yang mencegah pembusukan**
  - Mendeteksi paket tak terpakai, dependensi tak terpakai, dan entri workspace yatim
  - Kode mati dan tumpukan utilitas duplikat: mode kegagalan setiap monorepo
  - Tinjauan graf berkala: batas mana yang sudah terkikis sejak audit terakhir
  - Dokumentasi yang tetap benar: peta topologi yang dihasilkan dari repositori, bukan ditulis tangan
- **Mengoperasikan repositori sebagai produk**
  - Pemilik, kanal dukungan, dan proses perubahan terdokumentasi untuk paket bersama
  - Membimbing tim baru masuk ke workspace tanpa memberi mereka seluruh graf
  - Jalur keluar: mengekstrak paket ke repositori sendiri ketika memang seharusnya keluar
  - Metrik yang penting: waktu instalasi, durasi CI, frekuensi deploy, dan lead time perubahan
- **Lab Praktik**: Menjalankan audit kebersihan, menyusun daftar remediasi berurut radius dampak, dan menulis rencana ekstraksi untuk satu paket yang seharusnya keluar dari repositori

### Modul 12: Proyek Akhir — Monorepo Bun yang Bertata Kelola (Minggu 12)

- **Cakupan dan baseline**
  - Tiga aplikasi dan minimal enam paket, dengan setidaknya satu pustaka yang dapat dipublikasikan
  - Baseline tercatat: waktu instalasi, durasi CI, dan waktu sampai deploy pertama dari polyrepo atau setup naif
- **Konsolidasi**
  - Catatan keputusan topologi, dependensi berbasis katalog, dan batas yang ditegakkan
  - Graf tugas berurutan sesuai dependensi dengan perilaku inkremental yang bekerja
  - Test berbasis dampak dan CI ter-shard
  - Image container per aplikasi dan deploy independen
- **Pengiriman**
  - Repositori yang bisa dimasuki tim lain hanya dengan dokumentasi tertulis
  - Laporan sebelum-dan-sesudah berisi angka, termasuk hal yang justru menjadi lebih lambat dan alasannya
  - Dokumen tata kelola: kepemilikan, irama peningkatan, proses pengecualian, dan persyaratan review

## Proyek Akhir

**Mengonsolidasikan Polyrepo menjadi Workspace Bun yang Bertata Kelola**

Ambil tiga aplikasi kecil yang saat ini berbagi kode dengan cara menyalin atau mempublikasikan paket ad-hoc, lalu konsolidasikan menjadi satu workspace Bun dengan peningkatan yang terukur dan dapat dipertahankan.

Proyek harus menunjukkan:

1. **Catatan keputusan topologi** — taksonomi batas, aturan penamaan, dan uji penempatan paket baru
2. **Instalasi yang reprodusibel** — satu lockfile, instalasi frozen di CI, keputusan trusted dependency, serta waktu instalasi dingin dan hangat
3. **Batas yang ditegakkan** — peta `exports` yang tertutup, pemeriksaan batas import yang menggagalkan build saat dilanggar, dan tanpa deep import
4. **Dependensi bertata kelola** — katalog versi untuk dependensi infrastruktur bersama, plus gate CI yang memblokir duplikat paket kritis
5. **Graf tugas berurutan dependensi** — tugas build, test, dan typecheck terfilter dengan perilaku inkremental yang terbukti
6. **CI berbasis dampak** — matriks ter-shard yang melewati paket tak tersentuh, dengan angka waktu dinding dan menit CI dibanding baseline
7. **Satu paket terbitan** — pustaka internal dengan versioning changeset yang dirilis melalui kanal pra-rilis lalu dipromosikan
8. **Pengiriman per aplikasi** — Dockerfile sadar workspace untuk setiap aplikasi dan pipeline deploy yang hanya mengirim aplikasi yang berubah
9. **Laporan yang jujur** — apa yang membaik, apa yang memburuk, trade-off yang diterima, dan apa yang akan dilakukan berbeda

**Luaran**:

- Repositori Git dengan riwayat konsolidasi sebagai pull request yang dapat direview
- Catatan keputusan topologi dan dokumen tata kelola
- Workflow CI untuk pull request dan branch main, beserta matriks test ter-shard
- Dockerfile dan konfigurasi deploy per aplikasi
- Hasil benchmark untuk instalasi, typecheck, test, dan CI penuh, masing-masing dipasangkan dengan baseline-nya
- Ringkasan satu halaman yang menyatakan apakah konsolidasi memenuhi kriteria keberhasilan yang ditetapkan

## Kriteria Penilaian

- **Tugas Mingguan (30%)**: Artefak repositori yang dikirim sebagai pull request — catatan keputusan, diagnosis resolusi, aturan batas, kebijakan katalog, graf tugas, rencana rilis, dan workflow. Dinilai berdasarkan apakah artefak itu membatasi keputusan berikutnya, bukan sekadar mendokumentasikan keadaan saat ini.
- **Tinjauan Tengah Semester (20%)**: Setelah Modul 6 — workspace dengan batas yang ditegakkan, dependensi berbasis katalog, dan graf tugas berurutan dependensi yang bekerja, didemonstrasikan pada clone baru.
- **Proyek Akhir (40%)**: Konsolidasi capstone, dinilai berdasarkan kepadatan topologi, reprodusibilitas, penegakan batas, proporsionalitas CI, disiplin rilis, independensi deployment, dan ketepatan laporan sebelum-sesudah.
- **Review Sejawat dan Kebergunaan Dokumentasi (10%)**: Meninjau dua repositori capstone lain, plus penilaian apakah engineer baru dapat bergabung ke workspace dan mengirim perubahan hanya dengan dokumentasi yang diserahkan.

## Referensi

- [Bun Workspaces](https://bun.sh/docs/install/workspaces) — Konfigurasi workspace, penautan, dan eksekusi skrip terfilter
- [Bun Package Manager](https://bun.sh/docs/cli/install) — Flag instalasi, perilaku lockfile, trusted dependency, dan caching
- [bun install catalog](https://bun.sh/docs/install/catalogs) — Katalog versi bersama untuk dependensi workspace
- [bun publish](https://bun.sh/docs/cli/publish) — Publikasi paket, dist-tag, dan konfigurasi registry
- [bun pm](https://bun.sh/docs/cli/pm) — Packing, listing, dan pemeriksaan graf dependensi
- [Bun Test Runner](https://bun.sh/docs/cli/test) — Penyaringan test, cakupan, dan penggunaan di CI
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html) — Build inkremental lintas paket
- [oven-sh/setup-bun](https://github.com/oven-sh/setup-bun) — Setup GitHub Actions yang dipakai di seluruh modul CI
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/) — Pola layer dan stage untuk image per aplikasi

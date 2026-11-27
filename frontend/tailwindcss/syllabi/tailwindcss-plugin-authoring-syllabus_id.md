---
title: "Silabus Rekayasa Penulisan Plugin Tailwind CSS"
description: "Silabus lanjutan 10 minggu untuk engineer yang memperluas Tailwind CSS itu sendiri — mencakup arsitektur plugin, model ekstensi CSS-first di v4, utilitas dinamis, variabel kustom, layer base dan komponen, pengemasan preset dan tema, penulisan TypeScript, pengujian CSS otomatis, penganggaran biaya build, serta publikasi paket ekosistem yang terpelihara."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Penulisan Plugin Tailwind CSS

## Ringkasan

Sebagian besar kursus Tailwind mengajarkan cara memakai framework. Kursus ini mengajarkan cara memperluasnya. Menulis plugin adalah disiplin yang berbeda dari menata aplikasi: keluaran Anda adalah API yang dikompilasi oleh tim lain, bug Anda muncul sebagai nama kelas yang rusak di markup orang lain, dan keputusan desain Anda menjadi permanen begitu sebuah versi minor sudah dirilis. Keterampilan yang terlibat — desain titik ekstensi, validasi tipe nilai, disiplin cascade layer, pengujian CSS yang dihasilkan, dan manajemen rilis — tidak dibahas di kurikulum Tailwind tingkat aplikasi mana pun.

Silabus lanjutan 10 minggu ini berdiri di samping jalur Tailwind yang sudah ada, bukan di atasnya. Silabus dasar memperkenalkan plugin dalam satu minggu sebagai fitur yang dipakai; silabus advanced membahas rekayasa design system dan varian dari sisi konsumen; silabus aksesibilitas dan migrasi menyusun pekerjaan seputar kepatuhan dan modernisasi kode lama. Di sini batasan pengorganisasinya adalah *kepengarangan*: setiap modul menanyakan apa yang dibutuhkan untuk merilis ekstensi yang dapat diandalkan oleh engineer lain.

Alurnya disengaja. Minggu 1–2 membangun pemahaman tentang permukaan ekstensi dan perubahannya pada arsitektur CSS-first v4, karena plugin yang secara konsep sama kini punya dua implementasi yang sangat berbeda. Minggu 3–5 masuk dalam ke tiga primitif penulisan — utilitas dinamis, varian, serta layer base dan komponen — tempat hampir semua bug nyata bersarang. Minggu 6–7 memperlakukan pengemasan sebagai masalah rekayasa: desain preset, kontrak tema, tipe TypeScript, dan pengujian yang memeriksa CSS hasil kompilasi alih-alih snapshot markup. Minggu 8–9 membahas dua kekuatan yang menentukan apakah sebuah plugin bertahan di produksi: biaya build dan disiplin rilis. Minggu 10 adalah proyek puncak, ketika peserta merilis rangkaian plugin lengkap dengan dokumentasi dan pipeline rilis.

Prasyarat: pengetahuan Tailwind CSS yang solid setara silabus advanced (utilitas, varian, nilai arbitrer, konfigurasi tema), terbiasa membaca CSS hasil kompilasi, dan cukup mahir TypeScript untuk menulis fungsi bertipe serta declaration file. Familiaritas dengan PostCSS, pengemasan npm, dan test runner diasumsikan. Tidak diperlukan pengalaman menulis plugin sebelumnya.

## Kurikulum

### Minggu 1: Arsitektur Plugin dan Permukaan Ekstensi

- **Posisi Plugin dalam Pipeline**
  - Dari pemindaian sumber ke CSS terkompilasi: ekstraksi kandidat, resolusi utilitas, penerapan varian, emisi layer
  - Mengapa keluaran plugin dikompilasi, bukan diinterpretasi — dan apa artinya bagi informasi yang bisa diketahui plugin saat build
  - Perbedaan antara memperluas tema, memperluas himpunan utilitas, dan memperluas himpunan varian
- **Primitif Penulisan**
  - Utilitas statis versus utilitas dinamis (pencocokan), serta profil biaya masing-masing
  - Gaya base untuk default elemen, kelas komponen untuk resep multi-properti, utilitas untuk deklarasi satu tujuan
  - Varian sebagai sumbu ortogonal: plugin utilitas dan plugin varian dapat dikomposisikan tanpa saling mengetahui
- **Memilih Titik Ekstensi yang Tepat**
  - Kebutuhan sekali pakai masuk ke `@utility` atau nilai arbitrer, bukan plugin
  - Pola berulang dalam satu basis kode masuk ke kelas komponen atau class recipe
  - Kebutuhan yang dipakai lintas basis kode, atau diparameterkan oleh nilai yang dibawa nama kelas, adalah kasus plugin yang sesungguhnya
  - Uji pemeliharaan: apakah Anda masih akan memiliki ini dalam delapan belas bulan, dan apakah jawabannya mengubah desain
- **Latihan**: Untuk enam permintaan styling nyata, klasifikasikan masing-masing sebagai nilai arbitrer, `@utility`, kelas komponen, ekstensi tema, atau plugin — lalu tulis justifikasi satu paragraf untuk dua yang berakhir sebagai plugin

### Minggu 2: Model Ekstensi CSS-First di v4

- **Dua Implementasi dari Satu Gagasan**
  - JavaScript plugin API (`addUtilities`, `matchUtilities`, `addVariant`, `addBase`, `addComponents`, `theme()`, `e()`) dan apa yang masih diberikannya
  - Ekstensi native CSS di v4: `@utility`, `@custom-variant`, `@theme`, `@source`, dan `@plugin` untuk memuat plugin JavaScript
  - Mengapa ekosistem tidak sekadar menulis ulang plugin dalam CSS — perilaku dinamis dan berparameter nilai masih memerlukan kode
- **Memindahkan Plugin dari v3 ke v4**
  - Utilitas statis yang berpindah bersih ke blok `@utility`
  - Akses tema yang berubah bentuk: dari `theme('colors.brand.500')` ke CSS custom property yang dipancarkan `@theme`
  - Varian terdaftar menjadi `@custom-variant`, dan kasus yang masih memerlukan `addVariant`
  - Strategi kompatibilitas: satu paket yang mendukung kedua major tanpa mem-fork sumber
- **Arsitektur Hibrida**
  - Entry point CSS yang mendeklarasikan token dan utilitas statis, plus entry point JavaScript untuk yang dinamis
  - Peta `exports` paket yang membuat konsumen mengimpor permukaan yang tepat sesuai versi Tailwind mereka
  - Menguji kedua jalur dalam satu repositori tanpa menduplikasi fixture
- **Latihan**: Ambil plugin JavaScript v3 kecil dan hasilkan port CSS-first v4, dengan implementasi v3 tetap berjalan di balik entry point bersyarat versi, serta fixture yang menguji keduanya

### Minggu 3: Utilitas Dinamis dan Validasi Nilai

- **Cara Kerja Utilitas Pencocokan**
  - Mendeklarasikan famili yang menerima nilai dari nama kelas, dan bagaimana parser kandidat mengalirkannya
  - Inferensi tipe nilai versus tipe eksplisit, serta di mana inferensi salah: warna yang tampak seperti panjang, angka yang berarti dua hal
  - Modifier: sintaks slash opasitas, nilai negatif, dan utilitas multi-sumbu
- **Validasi sebagai Kontrak API**
  - Menolak nilai tidak valid secara nyaring saat build alih-alih memancarkan CSS mati secara diam-diam
  - Penyempitan tipe nilai (`color`, `length`, `percentage`, `number`, `absolute-size`) dan kelas input yang diterima masing-masing
  - Nilai arbitrer pada utilitas dinamis: apa yang seharusnya dilakukan `[13px]` polos, dan kapan mendukungnya justru sebuah kesalahan
  - Mendukung nilai negatif tanpa menimbulkan tabrakan dengan famili yang sudah ada
- **Komposisi dan Penamaan**
  - Higiene namespace: bagaimana nama utilitas plugin dapat membayangi utilitas inti, dan mengapa itu hampir selalu bug
  - Kesadaran prefix dan separator — utilitas harus mengikuti konfigurasi konsumen alih-alih mengunci konvensi `-`
  - Deklarasi versus aturan penuh: kapan utilitas dinamis memerlukan lebih dari satu properti
- **Latihan**: Implementasikan famili utilitas dinamis dengan nilai bertipe, satu modifier, dukungan nilai negatif, dan penolakan eksplisit saat build untuk input tidak valid, lalu dokumentasikan tata bahasa nilai yang diterimanya

### Minggu 4: Penulisan Varian

- **Varian Statis, Fungsional, dan Gabungan**
  - Varian statis yang memancarkan satu selector, dan pola pseudo-class yang menuntutnya
  - Varian fungsional yang menerima nilai — pola di balik semua varian bergaya `data-*` dan `aria-*`
  - Varian gabungan dan bertumpuk: bagaimana urutan berinteraksi dengan rantai varian milik konsumen
- **Varian At-Rule dan Lingkungan**
  - Varian media dan supports, termasuk perilaku fallback saat kondisinya tidak didukung
  - Varian container query serta `dir`/`rtl` dan hubungannya dengan konteks container yang disiapkan konsumen
  - Varian print, forced-colors, dan reduced-motion sebagai titik ekstensi yang bersinggungan dengan aksesibilitas
- **Selector yang Tidak Mudah Rusak**
  - Meng-escape nilai dengan aman agar nilai atribut dari konsumen tidak dapat menyuntikkan selector
  - Ekspektasi spesifisitas: varian plugin tidak boleh memenangkan pertarungan yang seharusnya ia kalahkan di dalam cascade layer
  - Interaksi dengan preflight dan dengan varian buatan plugin lain
- **Latihan**: Rilis satu varian fungsional berbasis atribut data plus satu varian at-rule, buktikan penumpukan yang benar dengan varian inti pada kedua urutan, dan tambahkan pengujian yang memeriksa selector terpancar untuk nilai atribut yang berbahaya

### Minggu 5: Gaya Base, Komponen, dan Disiplin Layer

- **Layer Base**
  - Apa yang layak masuk gaya base (default elemen, penghalusan font, normalisasi kontrol form) dan apa yang sama sekali tidak
  - Interaksi preflight: menambahinya, menimpanya secara sengaja, dan jalur opt-out bagi konsumen
  - Mengapa plugin yang mereset elemen secara global pada akhirnya akan dicabut oleh tim yang memasangnya
- **Kelas Komponen**
  - Resep multi-properti dan trade-off-nya dibanding mengirim komponen JSX atau framework
  - Kemampuan ditimpa: kelas komponen harus dapat diperluas oleh utilitas tanpa eskalasi `!important`
  - Penamaan sebagai API publik — nama kelas komponen tidak dapat diubah tanpa rilis breaking
- **Cascade Layer dan Urutan Cetak**
  - Di mana keluaran plugin berada relatif terhadap preflight, utilitas inti, dan CSS aplikasi
  - Jaminan urutan yang boleh dan tidak boleh diasumsikan plugin, serta cara mendokumentasikan yang dibutuhkannya
  - Mendeteksi konflik layer pada setup konsumen yang memuat CSS dalam urutan tidak biasa
- **Latihan**: Bangun plugin yang menambahkan normalisasi base, satu kelas komponen, dan satu utilitas — lalu tunjukkan bahwa konsumen dapat menimpa ketiganya dengan utilitas biasa tanpa `!important`

### Minggu 6: Preset, Kontrak Tema, dan Pengemasan Multi-Brand

- **Merancang Preset**
  - Apa yang boleh dimiliki preset: ramp token, alias semantik, breakpoint, ukuran container
  - Kontrak tema — himpunan kecil nama yang boleh diandalkan konsumen, sisanya dinyatakan internal secara eksplisit
  - Semantik extend versus override, dan kejutan yang dialami konsumen ketika preset diam-diam mengganti skala inti
- **Arsitektur Token untuk Distribusi**
  - Ramp primitif dengan alias semantik di atasnya, dikirim sebagai CSS custom property di v4 dan sebagai konfigurasi tema di v3
  - Preset multi-brand dan white-label: satu layer primitif, beberapa layer semantik, tanpa nilai terduplikasi
  - Mode gelap dan kontras tinggi yang diekspresikan sebagai himpunan token, bukan penimpaan selector
- **Memversikan API Visual**
  - Mengapa mengubah nilai warna adalah patch dan menghapus nama token adalah major
  - Mekanisme deprekasi nama token: alias, peringatan, lalu penghapusan lintas dua major
  - Memigrasikan konsumen dengan codemod yang dirilis bersama versi breaking
- **Latihan**: Publikasikan satu preset dasar plus dua preset brand yang berbagi satu layer primitif dan hanya berbeda pada alias semantik, dengan tabel kontrak terdokumentasi dan catatan deprekasi untuk satu token yang diganti nama

### Minggu 7: Penulisan TypeScript, Pengujian, dan Dokumentasi

- **Penulisan Bertipe**
  - Tipe opsi plugin, tata bahasa nilai generik, dan declaration file yang membuat plugin dapat dipakai tanpa membaca sumbernya
  - Di mana TypeScript tidak dapat menolong — apa pun yang diputuskan parser kandidat saat build
  - Mengekspor tipe untuk konsumen yang membangun komponen pembungkus di sekitar kelas yang dihasilkan
- **Menguji CSS yang Dihasilkan**
  - Mengompilasi fixture dengan build Tailwind sungguhan dan memeriksa CSS terpancar, utilitas demi utilitas
  - Strategi golden file dengan diff yang disengaja dan dapat ditinjau, bukan penerimaan snapshot buta
  - Pengujian negatif: nilai tidak valid harus menggagalkan build, dan utilitas yang terbayangi harus tertangkap
  - Pengujian berbentuk konsumen: satu fixture aplikasi per major yang didukung, per dialek framework, dan per preset brand
- **Dokumentasi sebagai Bagian dari Deliverable**
  - Tabel tata bahasa nilai, contoh penimpaan, dan bagian eksplisit "apa yang tidak akan dilakukan plugin ini"
  - Contoh interaktif yang merupakan artefak build itu sendiri, agar dokumentasi tidak menyimpang dari perilaku
  - Disiplin changelog dan catatan upgrade yang menyebut tepat kelas dan token yang berubah
- **Latihan**: Tambahkan pengetikan lengkap, rangkaian pengujian pemeriksaan CSS dengan sedikitnya satu kasus negatif, dan halaman dokumentasi bertabel tata bahasa nilai ke plugin dari minggu-minggu sebelumnya

### Minggu 8: Biaya Build dan Penganggaran Kinerja

- **Berapa Biaya Plugin**
  - Biaya waktu kompilasi famili pencocokan besar versus utilitas statis, dan mengapa inferensi tidak gratis
  - Muatan terpancar: bagaimana utilitas dinamis yang terlalu permisif dapat mengalikan CSS konsumen dengan orde besaran
  - Interaksi pemindaian konten: utilitas yang hanya muncul lewat komposisi string, dan masalah safelist
- **Mengukur, Bukan Menebak**
  - Aplikasi fixture sebagai harness benchmark, dengan waktu build dan ukuran keluaran dicatat per commit
  - Ambang regresi di CI agar kenaikan biaya menjadi pemeriksaan yang gagal, bukan penemuan yang lambat
  - Membandingkan dengan utilitas tulisan tangan yang setara untuk mengetahui apakah abstraksinya layak
- **Merancang di Bawah Anggaran**
  - Membatasi ruang nilai bila memungkinkan, dan mendokumentasikan trade-off saat memilih tidak membatasinya
  - Memilih pembangkitan statis daripada pencocokan runtime untuk himpunan yang terbatas
  - Berkoordinasi dengan strategi purge dan layer konsumen alih-alih melawannya
- **Latihan**: Lakukan benchmark rangkaian plugin pada aplikasi fixture, tetapkan anggaran waktu build dan ukuran CSS, lalu refaktor satu famili yang biayanya tidak sepadan dengan rentang nilainya

### Minggu 9: Publikasi, Versi, dan Pemeliharaan Ekosistem

- **Pengemasan**
  - Keluaran ganda ESM dan CommonJS, peta `exports`, dan entry point yang dipisah per major Tailwind
  - Rentang peer dependency yang tidak menjebak konsumen pada versi yang tidak dapat mereka tingkatkan
  - Mengirim file CSS dan preset sebagai artefak paket kelas satu, bukan pelengkap repositori
- **Rekayasa Rilis**
  - Semver untuk API styling: apa yang dihitung breaking ketika perubahannya "hanya sebuah nilai"
  - Changelog yang dapat ditindaklanjuti konsumen, plus codemod dan pengujian codemod untuk versi breaking
  - Otomasi rilis, provenance, dan toolchain terpin agar rilis dapat direproduksi
- **Pemeliharaan dari Waktu ke Waktu**
  - Mengikuti major hulu, dan jendela kompatibilitas yang dijanjikan kepada konsumen
  - Menyortir issue yang sebenarnya masalah konfigurasi, dan menulis dokumentasi yang mengakhirinya
  - Mengetahui kapan menyerahkan plugin ke komunitas, menggabungkannya ke inti, atau menghentikannya
- **Latihan**: Publikasikan rangkaian ke registry dengan tag prerelease, keluaran ganda, rentang peer yang mencakup kedua major yang didukung, changelog, dan satu codemod beserta pengujiannya

### Minggu 10: Proyek Puncak — Rangkaian Plugin Kelas Produksi

- **Konsolidasi**
  - Merakit famili utilitas, varian, layer base dan komponen, serta preset menjadi satu paket yang koheren
  - Mengaudit permukaan publik: setiap kelas, token, varian, dan opsi yang diekspor harus disengaja dan terdokumentasi
  - Menyelaraskan tata bahasa nilai agar rangkaian terbaca sebagai satu API, bukan empat kecelakaan
- **Pengerasan**
  - Matriks pengujian penuh lintas major Tailwind, dialek framework, dan kedua preset brand
  - Verifikasi anggaran kinerja dan profil biaya terdokumentasi per famili
  - Tinjauan aksesibilitas untuk apa pun yang dipancarkan plugin secara default — kontras token default, gaya fokus, gerakan
- **Perilisan**
  - Situs dokumentasi dengan contoh langsung yang dibangun dari paket itu sendiri
  - Alur kerja rilis, changelog, panduan kontribusi, dan template issue yang meminta keluaran build
  - Janji kompatibilitas tertulis yang menyatakan versi yang didukung dan masa pemberitahuan untuk penghapusan
- **Latihan**: Presentasikan rangkaian tersebut seolah kepada pengadopsi eksternal: instruksi pemasangan, referensi tata bahasa nilai, catatan migrasi dari pendekatan naif, profil biaya, dan kebijakan dukungan

## Proyek Akhir

Bangun, dokumentasikan, uji, dan publikasikan rangkaian plugin Tailwind CSS dengan kualitas open-source sesungguhnya. Rangkaian harus memperluas framework pada sedikitnya tiga dari empat dimensi ekstensi — famili utilitas dinamis, varian kustom, layer base atau komponen, preset tema — dan harus mendukung Tailwind v3 maupun v4 dari satu repositori.

Deliverable berisi tujuh artefak:

1. **Sumber paket** dengan permukaan publik terdokumentasi, keluaran ganda ESM/CommonJS, dan entry point bersyarat versi untuk kedua major Tailwind.
2. **Famili utilitas dinamis** dengan tata bahasa nilai eksplisit, penanganan modifier, dukungan nilai negatif bila relevan, dan penolakan input tidak valid saat build.
3. **Sedikitnya satu varian kustom** — fungsional atau at-rule — dengan pengujian yang membuktikan penumpukan benar terhadap varian inti pada kedua urutan.
4. **Preset atau paket tema** dengan kontrak token tertulis, dua varian brand yang berbagi satu layer primitif, dan catatan deprekasi untuk sedikitnya satu token yang diganti nama.
5. **Rangkaian pengujian** yang mengompilasi fixture dengan build Tailwind sungguhan dan memeriksa CSS terpancar, termasuk pengujian negatif untuk nilai tidak valid dan fixture berbentuk konsumen per major.
6. **Profil biaya** — dampak waktu build dan CSS terpancar yang terukur pada aplikasi fixture, dengan ambang CI dan justifikasi rentang nilai setiap famili.
7. **Paket rilis** — changelog, kebijakan semver, panduan kontribusi, halaman dokumentasi dengan tabel tata bahasa nilai dan contoh langsung, serta satu codemod beserta pengujiannya untuk satu perubahan breaking.

Rangkaian harus terpasang bersih dari registry ke proyek fixture baru pada kedua major Tailwind yang didukung, dan developer lain harus dapat mengadopsinya hanya dengan dokumentasi yang dikirimkan.

## Kriteria Penilaian

- **Latihan mingguan (35%)**: Setiap artefak mingguan dinilai dari apakah ia akan bertahan di tangan konsumen nyata: tata bahasa nilai yang menolak input sampah, varian yang tidak rusak saat ditumpuk, preset yang kontraknya eksplisit. Kode yang berjalan tanpa kontrak terdokumentasi bernilai rendah.
- **Ketepatan pemilihan titik ekstensi (15%)**: Apakah kasus plugin dibedakan dengan benar dari `@utility`, kelas komponen, dan ekstensi tema — plugin yang dibangun baik namun seharusnya tidak pernah menjadi plugin adalah kegagalan desain.
- **Kebenaran CSS yang dipancarkan (20%)**: Perilaku validasi, escaping selector, penempatan layer, kemampuan ditimpa tanpa `!important`, dan paritas antara jalur v3 dan v4.
- **Ketatnya pengujian (15%)**: Pemeriksaan pada level CSS alih-alih snapshot markup, pengujian negatif yang bermakna, diff golden file yang disengaja, dan cakupan matriks konsumen.
- **Disiplin biaya (5%)**: Kinerja yang diukur bukan diklaim, ambang yang ditegakkan, dan setiap rentang nilai dapat dipertanggungjawabkan terhadap biaya build-nya.
- **Kualitas rilis dan dokumentasi (10%)**: Dapat dipasang pada kedua major, changelog yang dapat ditindaklanjuti, codemod beserta pengujiannya, dan dokumentasi yang cukup lengkap untuk adopsi tanpa menghubungi penulis.
- **Kriteria distingsi**: Proyek yang lulus mengirim plugin yang berjalan. Proyek bermutu distingsi mengirim ekstensi yang dapat diadopsi, ditingkatkan, dan pada akhirnya diambil alih tim lain — dengan janji kompatibilitas, profil biaya, dan dokumentasi yang membuat serah terima itu berjalan tanpa gejolak.

## Referensi

- Dokumentasi Tailwind CSS — menulis plugin, functions dan directives, serta model konfigurasi CSS-first: https://tailwindcss.com/docs/plugins
- Dokumentasi Tailwind CSS — menambahkan utilitas kustom, varian kustom, dan variabel tema: https://tailwindcss.com/docs/adding-custom-styles
- Blog Tailwind CSS — arsitektur v4 dan alasan di balik ekstensi CSS-first: https://tailwindcss.com/blog
- Sumber dan definisi tipe plugin API Tailwind CSS — `tailwindcss/plugin` dan antarmuka `PluginAPI`: https://github.com/tailwindlabs/tailwindcss
- Dokumentasi PostCSS — pipeline transformasi tempat plugin dikompilasi: https://postcss.org/
- Dokumentasi npm — peta `exports` paket, rentang peer dependency, dan provenance: https://docs.npmjs.com/cli/v10/configuring-npm/package-json
- Semantic Versioning 2.0.0 — dan pertanyaan yang lebih sulit tentang apa yang dihitung breaking bagi API visual: https://semver.org/
- Dokumentasi Vitest dan Playwright — pengujian pemeriksaan CSS dan matriks fixture konsumen: https://vitest.dev/ dan https://playwright.dev/
- "Designing Design Systems" dan "Atomic Design" oleh Brad Frost — kontrak token dan pelapisan komponen yang menginformasikan desain preset

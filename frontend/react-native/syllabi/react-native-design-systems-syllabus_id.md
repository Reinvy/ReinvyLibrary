---
title: "Silabus Rekayasa Design System React Native"
description: "Kurikulum lanjutan sepuluh modul untuk membangun dan mengelola design system React Native: pipeline token, arsitektur theming, API komponen, kontrak aksesibilitas, token motion, visual regression testing, dan adopsi lintas tim."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Design System React Native

## Ringkasan

Sebagian besar tim React Native bukan punya masalah komponen, melainkan masalah konsistensi. Lima tim masing-masing membuat tombolnya sendiri, memilih abu-abu yang sedikit berbeda, menangani dark mode dengan caranya sendiri, dan produkpun melenceng sampai redesign memakan biaya satu kuartal. Design system adalah jawaban rekayasa atas penyimpangan itu: paket token, primitif, dan aturan komposisi yang berversi, sehingga pilihan yang benar sekaligus menjadi pilihan yang paling murah.

Silabus ini ditujukan bagi pengembang yang sudah mengirim aplikasi React Native ke produksi dan kini harus memiliki lapisan bersama yang dipakai tim lain. Design system diperlakukan sebagai perangkat lunak dengan permukaan API, proses rilis, pengujian, masa deprekasi, dan metrik adopsi — bukan sekadar folder komponen ber-style. Bagian spesifik platform sangat menentukan: iOS dan Android berbeda dalam penskalaan tipografi, elevasi, umpan balik ripple, dan urutan fokus; design system yang mengabaikan perbedaan itu menghasilkan aplikasi yang terasa asing di salah satu platform.

Sepuluh modul disusun mengikuti urutan bagaimana design system benar-benar dibangun lalu bertahan: menetapkan kosakata, mengotomatiskan pipeline, mengimplementasikan theming, membenahi tipografi dan layout, merancang API komponen, menanamkan aksesibilitas ke dalam API tersebut, mendefinisikan motion, menguji dan mengelola rilis, lalu memigrasikan tim nyata ke atasnya. Setiap modul kira-kira satu minggu belajar paruh waktu dengan lab yang menghasilkan artefak yang dipakai ulang di proyek akhir, sehingga tidak ada pekerjaan yang terbuang.

## Kurikulum

### Modul 1: Fondasi Design System dan Taksonomi Token (Minggu 1)

- **Mengapa design system ada**
  - Biaya nyata dari duplikasi: state tidak konsisten, bug aksesibilitas yang berulang, dan gesekan saat redesign
  - Apa yang bukan design system: bukan galeri komponen, bukan pembelian UI kit, bukan sekadar library Figma
  - Keputusan cakupan: satu aplikasi, satu brand, atau platform multi-brand
- **Tingkatan token**
  - Token primitif: skala mentah untuk warna, spacing, radius, tipografi, dan elevasi
  - Token semantik: nama berbasis maksud seperti `surface`, `text-muted`, `danger` yang tetap berlaku saat rebranding
  - Token komponen: override sempit dengan masa berlaku eksplisit, bukan jalan keluar permanen
  - Aturan yang menjaga token tetap sehat: komponen hanya boleh membaca token semantik, tidak pernah primitif
- **Kontrak platform**
  - iOS Human Interface Guidelines versus Material 3: di mana paritas tepat dan di mana perbedaan justru benar
  - Mendokumentasikan perbedaan yang disengaja agar menjadi keputusan, bukan kebetulan
- **Lab**: Audit satu aplikasi layar demi layar, kumpulkan setiap nilai warna, spacing, dan font yang di-hardcode, lalu terbitkan taksonomi token beserta jumlah pelanggaran per layar

### Modul 2: Pipeline Token (Minggu 2)

- **Sumber kebenaran**
  - Alat desain mengekspor JSON dalam format W3C Design Tokens Community Group
  - Meninjau perubahan token sebagai pull request dengan diff visual, bukan serah terima lisan
- **Build dan validasi**
  - Mentransformasi satu sumber token menjadi konstanta TypeScript, color asset iOS, dan resource Android
  - Validasi otomatis: aturan penamaan, nilai duplikat, pemeriksaan kontras, dan token yatim
- **Distribusi**
  - Menerbitkan paket token dengan semantic versioning dan changelog
  - Konsumsi di workspace monorepo versus registry privat, beserta jebakan cache dan resolusi pada masing-masing pendekatan
- **Lab**: Bangun pipeline token yang mengubah sumber JSON menjadi konstanta bertipe dengan pemeriksaan CI yang gagal bila token diubah nama atau dihapus tanpa kenaikan versi mayor

### Modul 3: Arsitektur Theming (Minggu 3)

- **Pengiriman tema di React Native**
  - Provider tema dengan context yang sempit dan stabil serta hook yang tidak memicu render ulang seluruh pohon
  - Memisahkan context statis (spacing, radius, tipografi) dari context dinamis (skema warna) agar perubahan skema tidak merender ulang semuanya
  - Pergantian tema saat runtime, persistensi, dan kedipan tema salah saat cold start
- **Integrasi skema dan platform**
  - Bereaksi terhadap tampilan sistem, serta menjaga status bar dan navigation bar tetap sinkron
  - Membaca tampilan native tanpa menunggu frame JavaScript pertama
- **Theming multi-brand**
  - Satu paket komponen, beberapa tema brand, dan cara mencegah kondisional brand bocor ke dalam komponen
  - Meng-override satu permukaan brand tanpa mem-fork komponen
- **Lab**: Konversi aplikasi ke provider tema dengan skema terang, gelap, dan kontras tinggi, hilangkan kedipan tema pada frame pertama, dan buktikan lewat uji render-count bahwa perubahan skema tidak merender ulang subtree yang tidak terpengaruh

### Modul 4: Tipografi, Ikonografi, dan Dynamic Type (Minggu 4)

- **Sistem tipografi**
  - Skala tipe sebagai token: ukuran, line height, ketebalan, letter spacing, dan rasio antar nilainya
  - Font kustom: pemuatan, fallback sebelum font siap, dan menghindari pergeseran layout saat font tiba
- **Penskalaan teks**
  - Perilaku penskalaan font sistem, batas pengali maksimum, dan titik munculnya pemotongan teks pada kontainer bertinggi tetap
  - Merancang layar yang tetap terpakai pada ukuran aksesibilitas terbesar yang didukung
- **Ikonografi**
  - Ikon vektor versus ikon font: biaya bundle, cache, dan konsistensi rendering
  - Token ukuran ikon, penyelarasan optis, serta ikon dekoratif versus ikon bermakna
- **Lab**: Bangun ulang gaya teks aplikasi sebagai token, pastikan setiap layar lolos tinjauan pada skala teks maksimum di kedua platform, dan laporkan setiap cacat pemotongan atau pemendekan yang ditemukan

### Modul 5: Layout, Responsivitas, dan Adaptasi Platform (Minggu 5)

- **Primitif layout**
  - Primitif stack, inline, dan grid yang dibangun dari token spacing, serta alasan margin ad-hoc membuat nilai menyimpang
  - Safe area, notch, dan penghindaran keyboard sebagai primitif, bukan perbaikan per layar
- **Perilaku responsif**
  - Breakpoint yang diturunkan dari dimensi jendela, serta pergantian layout tanpa kedipan akibat remount
  - Layout tablet, foldable, dan lanskap, serta titik ketika layout mobile seharusnya menjadi dua panel
- **Adaptasi platform**
  - Elevasi versus shadow, ripple versus highlight, dan perbedaan hit-slop antar platform
  - Layout kanan-ke-kiri, ikon yang harus dicerminkan, dan komponen yang rusak saat arah berubah
- **Lab**: Bangun primitif layout, lalu refaktor tiga layar representatif untuk memakainya dan verifikasi perilaku yang benar di ponsel, tablet, lanskap, skala teks terbesar, dan kanan-ke-kiri

### Modul 6: Desain API Komponen (Minggu 6)

- **Permukaan API**
  - Union varian dan ukuran yang membuat kombinasi tidak valid mustahil dinyatakan
  - Komposisi di atas konfigurasi: slot, children, dan compound component versus ledakan prop boolean
  - Prop terkendali dan tak-terkendali, penerusan ref, serta identitas stabil untuk library animasi
- **Perilaku dan kontrak**
  - State ditekan, makna disabled, state loading, dan perbedaan antara disabled secara visual dan benar-benar disabled
  - Penamaan, nilai default, dan dokumentasi yang dihasilkan dari tipe agar dokumentasi tidak melenceng
- **Evolusi**
  - Menambah prop itu mudah, menghapusnya yang sulit: peringatan deprekasi, codemod, dan disiplin semver
- **Lab**: Rancang dan dokumentasikan lima primitif dengan API varian bertipe, termasuk satu compound component, serta terbitkan rencana deprekasi untuk prop yang sengaja dihapus

### Modul 7: Aksesibilitas sebagai Kontrak Komponen (Minggu 7)

- **Semantik**
  - Prop role, label, hint, dan state, serta mengelompokkan anak agar pembaca layar mengumumkan satu elemen yang bermakna
  - Urutan fokus, menyembunyikan elemen dekoratif, dan menjebak fokus pada modal
- **Persepsi**
  - Kontras warna ditegakkan di tingkat token sehingga permukaan bertema tidak mungkin mengirim teks tak terbaca
  - Reduced motion dan reduced transparency sebagai input tema kelas satu
  - Ukuran target sentuh dan dukungan input alternatif
- **Verifikasi**
  - Aturan lint untuk prop aksesibilitas, asersi unit pada pohon aksesibilitas hasil render, dan pemeriksaan pembaca layar secara terjadwal
  - Pengujian dengan VoiceOver dan TalkBack, termasuk cacat yang hanya ditemukan lewat pemeriksaan manual
- **Lab**: Lakukan audit aksesibilitas pada paket komponen, perbaiki seluruh temuan, dan tambahkan pemeriksaan otomatis agar kelas cacat yang sama tidak kembali tanpa terdeteksi

### Modul 8: Token Motion dan Interaksi (Minggu 8)

- **Sistem motion**
  - Token durasi dan easing yang terikat pada maksud: masuk, keluar, penekanan, dan perubahan state
  - Primitif animasi bersama agar layar tidak meracik kurva waktu sendiri-sendiri
- **Implementasi**
  - Animasi di UI thread, transisi berbasis gestur, dan menghindari patah-patah akibat thread JavaScript
  - Fallback reduced motion yang tetap menjaga makna tanpa gerakan
- **Umpan balik**
  - Umpan balik tekanan, perubahan state optimistis, dan skeleton yang tidak terasa lebih lambat daripada kontennya
- **Lab**: Definisikan himpunan token motion, implementasikan primitif masuk, keluar, dan tekanan, lalu tunjukkan mode reduced motion yang mempertahankan tingkat penyelesaian tugas yang sama

### Modul 9: Pengujian, Tata Kelola, dan Rilis (Minggu 9)

- **Strategi pengujian**
  - Uji unit dan interaksi untuk perilaku, ditambah snapshot test yang dipakai secara sempit untuk struktur, bukan styling
  - Cakupan visual regression yang digerakkan oleh story komponen dan ditinjau sebagai gambar pada pull request
  - Anggaran performa: jumlah render, selisih ukuran bundle, dan biaya startup per komponen yang ditambahkan
- **Tata kelola**
  - Model kontribusi: siapa yang boleh menambah komponen, apa yang disyaratkan RFC, dan siapa yang meninjau API
  - Masa deprekasi, panduan migrasi, dan changelog yang bisa ditindaklanjuti manusia
  - Versioning di monorepo ketika beberapa aplikasi memakai versi mayor berbeda
- **Lab**: Sambungkan paket ke CI dengan visual regression, diffing permukaan API, dan anggaran bundle, lalu terbitkan rilis dengan changelog dan pemberitahuan deprekasi

### Modul 10: Adopsi, Migrasi, dan Dokumentasi (Minggu 10)

- **Migrasi**
  - Adopsi bertahap: membungkus komponen lama agar kode baru memakai sistem sementara layar lama tetap berjalan
  - Codemod untuk penggantian mekanis, dan proses tinjauan untuk perubahan yang tidak bisa diotomatiskan
  - Mengukur adopsi dengan data nyata: jumlah import, sisa nilai style yang di-hardcode, dan layar yang sudah dimigrasikan
- **Pemberdayaan**
  - Dokumentasi yang menjawab kapan memakai apa, dengan contoh langsung dan kode siap salin
  - Serah terima desain yang memetakan komponen alat desain ke komponen library secara satu-ke-satu
  - Office hours, pairing, dan umpan balik yang mengubah keluhan konsumen menjadi item backlog
- **Lab**: Migrasikan satu area fitur nyata secara menyeluruh, terbitkan laporan adopsi dengan metrik sebelum dan sesudah, lalu jalankan sesi tinjauan di mana pengembang lain membangun layar hanya dengan dokumentasi

## Proyek Akhir

Peserta menyerahkan **paket design system React Native yang berversi beserta laporan adopsi** untuk produk multi-tim yang realistis. Paket wajib memuat pipeline token yang membangun dari satu sumber menjadi konstanta bertipe dan kedua platform native, tema terang, gelap, dan kontras tinggi tanpa kedipan pada frame pertama, minimal dua belas primitif terdokumentasi yang mencakup layout, tipografi, input, umpan balik, dan navigasi, himpunan token motion dengan fallback reduced motion, serta kontrak aksesibilitas yang ditegakkan pemeriksaan otomatis. Repositori harus memuat cakupan visual regression di CI, anggaran bundle dan render dengan baseline tercatat, changelog, dan kebijakan deprekasi. Laporan adopsi harus menunjukkan dua area fitur contoh yang telah dimigrasikan dengan angka sebelum dan sesudah yang terukur: nilai style hardcode yang hilang, komponen duplikat yang dihapus, dan cacat aksesibilitas yang ditutup.

## Kriteria Penilaian

- **Lab modul (50 persen)**: Setiap lab dinilai dari apakah artefaknya berjalan, apakah pengukurannya dapat direproduksi, dan apakah trade-off didokumentasikan dengan bukti, bukan preferensi. Lab yang mengklaim konsistensi membaik harus menunjukkan angka di balik klaim tersebut.
- **Proyek akhir (35 persen)**: Dinilai dari arsitektur token dan tema, ketepatan API komponen, kekuatan cakupan aksesibilitas dan visual regression, kredibilitas metrik adopsi, serta apakah pengembang di luar proyek dapat membangun layar hanya bermodal dokumentasi.
- **Tinjauan desain (15 persen)**: Dua sesi presentasi terekam di mana peserta mempertahankan sebuah keputusan, misalnya menerima perbedaan platform, menolak prop yang diusulkan, atau memilih rilis breaking dibanding jalan keluar sementara, serta menjawab sanggahan peninjau.

## Referensi

- Dokumentasi React Native: Accessibility, Style, Appearance, Layout Props, dan PixelRatio
- Spesifikasi format W3C Design Tokens Community Group
- Dokumentasi Style Dictionary untuk build token multi-platform
- Panduan Material Design 3 dan Apple Human Interface Guidelines
- WCAG 2.2, khususnya kontras, ukuran target, dan animasi dari interaksi
- Dokumentasi React Native Reanimated untuk primitif animasi di UI thread
- Dokumentasi Storybook for React Native dan panduan alur visual regression
- Dokumentasi Tokens Studio untuk ekspor token dari alat desain
- "Design Systems" karya Alla Kholmatova, untuk sisi kosakata dan tata kelola pekerjaan ini

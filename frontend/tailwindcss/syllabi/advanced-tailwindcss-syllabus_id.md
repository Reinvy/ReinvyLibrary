---
title: "Silabus Tailwind CSS Lanjutan"
description: "Silabus lanjutan 10 minggu untuk para engineer yang sudah menguasai dasar Tailwind — mencakup rekayasa design system dengan variabel CSS, integrasi komponen headless, penguasaan variant lanjutan dan nilai arbitrer, performa dalam skala besar, serta arsitektur theming tingkat enterprise."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Tailwind CSS Lanjutan

## Ringkasan

Silabus lanjutan 10 minggu ini dirancang untuk pengembang yang telah menyelesaikan kurikulum Tailwind CSS dari tingkat pemula hingga menengah dan siap melangkah melampaui dasar-dasar utility-first menuju rekayasa produksi yang serius. Jika silabus pertama mengajarkan Anda cara *menggunakan* Tailwind, kursus ini mengajarkan cara *berarsitektur* dengannya — membangun design system yang digerakkan oleh design token, mengintegrasikan gaya utility dengan pustaka komponen headless, menguasai variant lanjutan dan nilai arbitrer, serta menjaga ukuran bundel CSS tetap kecil dalam skala enterprise.

Kursus ini sengaja tidak mengulang dasar-dasar. Setiap modul mengasumsikan kefasihan dengan utility inti dan berfokus pada keputusan yang membedakan pengguna Tailwind yang kompeten dari engineer yang dapat meluncurkan design system multi-brand yang digunakan oleh puluhan tim. Modul berjalan dari internal konfigurasi, melalui varian lanjutan dan arsitektur theming, hingga performa, integrasi UI headless, dan akhirnya sebuah proyek puncak: pustaka komponen multi-brand yang sepenuhnya dapat diubah tema dengan anggaran bundel yang ketat. Pada akhirnya, peserta didik siap memegang kendali adopsi Tailwind di seluruh organisasi.

## Kurikulum

### Minggu 1: Internal Tailwind dan Alur Kompilator
- **Bagaimana Tailwind Sebenarnya Membangun CSS Anda**
  - Langkah pemindaian: bagaimana glob konten dicocokkan dan kandidat diekstraksi
  - Generasi kandidat: dari string class di markup Anda menjadi aturan yang dihasilkan
  - Internal `@tailwindcss/vite` dan `@tailwindcss/postcss` serta perbedaan Tailwind v4 dari v3
- **Konfigurasi CSS-First (v4)**
  - Direktif `@theme` dan `@utility`, namespace `--color-*`, dan generasi class secara on-the-fly
  - Migrasi `tailwind.config.js` v3 ke model v4 `@import "tailwindcss"`
  - Hubungan antara design token, `@theme`, dan utility yang dihasilkan
- **Memahami Output yang Dihasilkan**
  - Bagaimana layer (`base`, `components`, `utilities`) memengaruhi cascade dan spesifisitas
  - Membaca CSS terkompilasi untuk men-debug override yang tak terduga
- **Latihan**: Siapkan proyek v4 dengan konfigurasi CSS-first, lalu periksa CSS terkompilasi untuk berbagai utility dan petakan setiap aturan kembali ke token sumbernya

### Minggu 2: Variant Lanjutan dan Komposisi Variant
- **Internal Variant**
  - Bagaimana variant seperti `hover:`, `focus:`, `dark:`, dan `group-hover:` diperluas menjadi aturan selektor
  - Placeholder selektor `&` dan bagaimana ia terkomposisi dengan pseudo-class serta at-rules
- **Menyusun dan Menumpuk Variant**
  - `group-hover:`, `peer-checked:`, `has-[:checked]:`, dan menumpuk beberapa variant (`group-hover:focus:`)
  - Variant `:has()` dan styling yang digerakkan selektor modern
- **Variant Kustom dengan `@custom-variant`**
  - Mendefinisikan variant sendiri untuk state yang tidak disediakan Tailwind
  - Membangun variant kompleks seperti `data-[state=open]:` untuk komponen headless
  - Menggabungkan variant kustom dengan variant arbitrer (`aria-*`, `supports-*`, `not-*`)
- **Latihan**: Bangun `@custom-variant` untuk state terbuka/tertutup menu headless dan untuk state indeterminate pada checkbox, lalu komposisikan keduanya dengan variant yang ada

### Minggu 3: Nilai Arbitrer dan Batas-Batas Sistem
- **Sintaks Nilai Arbitrer**
  - `grid-cols-[1fr_2fr]`, `w-[clamp(1rem,5vw,3rem)]`, `bg-[url(...)]`
  - Kapan nilai arbitrer adalah keputusan yang tepat dan kapan itu menandakan design token yang hilang
- **Properti Arbitrer dan Tipe Data**
  - `[mask-image:...]`, properti CSS arbitrer, dan resolusi `data-type`
  - Bekerja dengan nilai arbitrer untuk pecahan, min/maks, dan perhitungan fungsi CSS
- **Variant Arbitrer**
  - `[&>*]:`, `[@media(any-hover:hover)]:`, `[:nth-child(3)]:` dan kasus penggunaannya
  - Meng-escape karakter khusus dalam nilai arbitrer
- **Tata Kelola Penggunaan Arbitrer**
  - Menegakkan disiplin design token dengan aturan linting
  - Katup pengaman nilai arbitrer vs. penyebaran: kapan memformalkan sebuah class
- **Latihan**: Gunakan nilai arbitrer untuk mereproduksi perhitungan tata letak yang kompleks (misalnya `grid-cols-[repeat(auto-fill,minmax(200px,1fr))]`) dan refaktor pola arbitrer yang terlalu sering digunakan menjadi token tema

### Minggu 4: Design Token dan Arsitektur Theming
- **Sistem Design Token**
  - Menyusun skala warna, tipografi, spasi, dan radius sebagai token semantik
  - Lapisan token primitif vs. semantik (`--color-blue-500` vs `--color-brand-strong`)
  - Konvensi penamaan token dan efeknya terhadap keberlanjutan (*maintainability*)
- **Variabel CSS sebagai Tulang Punggung Theming**
  - Menggerakkan utility dengan referensi `var()` sehingga tema dapat berganti saat runtime
  - Theming multi-brand: menukar nilai token tanpa membangun ulang
  - Theming runtime, peralihan tema, dan theming preferensi pengguna yang digabungkan
- **Mode Gelap dalam Skala Besar**
  - Melampaui bonus `dark:` sederhana menuju strategi theming penuh
  - Kapan secara strategis menggunakan variant `dark:` vs. penukaran token
- **Latihan**: Arsitekturkan design system dua brand (misalnya "Korporasi A" dan "Korporasi B") yang sepenuhnya digerakkan variabel CSS, dengan mode gelap didefinisikan sebagai tema lain, bukan sesuatu yang ditambahkan belakangan

### Minggu 5: Integrasi Komponen Headless
- **Integrasi Headless UI dan Radix**
  - Mengapa pustaka headless mengekspos state sebagai atribut `data-*` dan mengapa itu penting
  - Men-styling komponen Radix dan Headless UI melalui variant `data-[state=...]:`
- **Pola Styling untuk Komponen Terkomposisi**
  - Merender props dan atribut data pada primitif
  - Menggabungkan variant kustom dengan utility Tailwind untuk interaksi kompleks
  - Komponen polimorfik dan pola `asChild` / `Slot`
- **Styling yang Digerakkan Aksesibilitas**
  - Men-styling state `aria-*`, focus-within, dan focus-visible untuk kebenaran a11y
  - Menghormati `prefers-reduced-motion` dan `prefers-color-scheme`
- **Latihan**: Bangun dialog, dropdown menu, dan tabs yang dapat diakses dan sepenuhnya di-styling menggunakan primitif Radix dengan Tailwind, digerakkan murni oleh variant `data-` dan `aria-`, tanpa CSS kustom

### Minggu 6: Pustaka Komponen dan Design System
- **Membangun Pustaka Komponen yang Dapat Digunakan Ulang**
  - Utility `cn()` yang menggabungkan `clsx` dan `tailwind-merge` untuk resolusi konflik
  - API yang digerakkan variant dengan `cva` (Class Variance Authority) dan `tailwind-variants`
  - Variant majemuk dan slot untuk komponen kompleks
- **Theming Komponen dengan `data-slot` dan Variabel CSS**
  - Mengekspos design token kepada konsumen komponen
  - `@reference` dan resolusi utility lintas paket dalam monorepo
- **Mendistribusikan Gaya Tailwind**
  - Menerbitkan pustaka yang menyertakan konfigurasi Tailwind atau tema CSS-first
  - Memastikan konsumen dapat menimpa dan memperluas design system Anda
- **Latihan**: Buat kerangka pustaka komponen yang diterbitkan dengan variant `cva`, dapat diubah tema melalui variabel CSS, dan dapat dikonsumsi dari aplikasi demo

### Minggu 7: Optimasi Performa dan Bundel dalam Skala Besar
- **Rekayasa Ukuran Bundel**
  - Bagaimana pemindaian konten memengaruhi ukuran output dan cara menulis glob konten yang presisi
  - Safelisting, direktif `@source`, dan kasus tepi dengan string class dinamis
  - Mendeteksi dan menghapus class mati dalam basis kode besar
- **Bahaya Konstruksi Class Dinamis**
  - Mengapa penggabungan string memecah pemindai dan cara menulis kode yang menjaga class
  - Mengizinkan nilai dinamis sambil tetap aman dari purge (nama class lengkap dalam peta)
- **Pemantauan dan Anggaran**
  - Anggaran ukuran CSS di CI, audit CSS Lighthouse, dan pelacakan tren jangka panjang
  - Mengurangi aturan duplikat di banyak komponen
- **Latihan**: Profilkan CSS terkompilasi dari aplikasi besar, perkecil ukurannya dengan menyempurnakan sumber konten dan penggunaan token, lalu tambahkan gerbang anggaran di CI

### Minggu 8: Server Components, Islands, dan Styling Edge
- **Styling dalam Model Rendering Modern**
  - Tailwind di dalam React Server Components, Next.js App Router, dan SSR
  - Batas styling client vs. server dan kapan CSS dihilangkan dari payload
- **Arsitektur Islands dan Hidrasi Parsial**
  - Menjaga utility CSS tetap dibagikan sambil menghidrasi hanya island interaktif
  - Tailwind dengan Astro, Qwik, dan framework islands lainnya
- **Pertimbangan Edge dan CDN**
  - Ekstraksi Critical CSS dan inlining gaya di atas lipatan
  - Tailwind pada runtime edge dan host situs statis
- **Latihan**: Integrasikan Tailwind ke proyek islands Astro, ekstrak critical CSS, dan verifikasi bahwa payload awal hanya berisi gaya di atas lipatan

### Minggu 9: Pengujian, Kualitas, dan Developer Experience
- **Pengujian Visual dan Interaksi**
  - Pengujian regresi visual komponen bertema di berbagai brand dan mode
  - Pengujian responsif dan peralihan tema berbasis Playwright
- **Mengoptimalkan Developer Experience Tailwind**
  - `prettier-plugin-tailwindcss` untuk pengurutan class yang konsisten
  - `eslint-plugin-tailwindcss` untuk konflik, class tidak dikenal, dan penegakan aturan
  - Tooling editor, IntelliSense, dan konsistensi class di seluruh proyek
- **Menegakkan Disiplin Design Token**
  - Aturan lint yang memblokir nilai arbitrer dan literal warna mentah di luar token
  - Pemeriksaan otomatis bahwa tidak ada utility yang lolos dari sistem token
- **Latihan**: Siapkan jalur kualitas lengkap: pengurutan class, lint konflik, regresi visual di berbagai brand, dan pemeriksaan aksesibilitas — semuanya memblokir CI

### Minggu 10: Proyek Puncak — Pustaka Komponen Multi-Brand Bertema
- **Ringkasan Cakupan**: Bangun pustaka komponen multi-brand kelas produksi dengan persyaratan berikut:
  - Setidaknya tiga brand berbeda yang dapat diubah tema hanya melalui variabel CSS tanpa perubahan kode
  - Mode gelap diimplementasikan sebagai tema, dapat dialihkan saat runtime
  - Dialog, dropdown, dan tabs berbasis headless (Radix atau Headless UI) yang di-styling murni dengan variant Tailwind
  - API komponen yang digerakkan variant menggunakan `cva` atau `tailwind-variants` dengan variant majemuk
  - Bundel CSS di bawah anggaran ketat, ditegakkan oleh gerbang CI
  - Pengujian regresi visual + aksesibilitas di berbagai tema dan viewport
- **Hasil Akhir**: Pustaka demo yang diterbitkan + aplikasi showcase yang mendemonstrasikan setiap teknik dari kursus ini

## Proyek Akhir

Proyek puncak adalah **pustaka komponen multi-brand yang sepenuhnya bertema** yang mencerminkan pekerjaan design system enterprise nyata. Peserta didik akan mengarsitekturkan sistem token, mengeksposnya melalui variabel CSS, membangun komponen ber-gaya headless, dan mengirim semuanya di bawah anggaran performa yang ketat.

Deliverable utama:
1. **Arsitektur Token**: Sistem token primitif + semantik dalam `@theme`, dengan token semantik menggerakkan utility melalui variabel CSS
2. **Theming Multi-Brand**: Setidaknya tiga brand yang dapat dialihkan saat runtime dengan menukar nilai variabel, tanpa membangun ulang dan tanpa perubahan kode klien
3. **Mode Gelap sebagai Tema**: Mode gelap diimplementasikan sebagai state tema keempat, dilapiskan di atas tema brand
4. **Suite Komponen Headless**: Dialog, dropdown, dan tabs dibangun di atas pustaka headless, di-styling seluruhnya dengan variant Tailwind (`data-[state=...]:`, `aria-*`, `group-hover:`, variant kustom)
5. **API yang Digerakkan Variant**: API komponen berbasis `cva` dengan variant majemuk, styling slot, dan resolusi konflik `cn()`
6. **Gerbang Performa**: Anggaran bundel CSS yang ditegakkan CI dengan pengukuran dan pelacakan tren yang terlihat
7. **Gerbang Kualitas**: Pengurutan class `prettier-plugin-tailwindcss`, penegakan `eslint-plugin-tailwindcss`, pengujian regresi visual di berbagai brand/tema, dan pemeriksaan a11y

## Kriteria Penilaian

- **Tugas Rekayasa Mingguan (40%)**: Setiap minggu menyertakan latihan rekayasa langsung yang dinilai berdasarkan ketepatan arsitektur, kebenaran mekanisme Tailwind yang digunakan, dan kepatuhan terhadap disiplin token — bukan hanya hasil visual.
- **Review Desain Modul (20%)**: Review pada minggu 4, 6, dan 7 di mana peserta didik mempresentasikan arsitektur token, struktur pustaka komponen, dan temuan performa mereka untuk dikritik.
- **Kualitas Kode dan Lint (10%)**: Penggunaan pengurutan class, lint konflik, dan penegakan disiplin token yang konsisten di seluruh kode yang dikumpulkan.
- **Proyek Puncak Akhir (30%)**: Pustaka multi-brand dinilai berdasarkan arsitektur token, kebenaran theming, kualitas integrasi headless, desain API variant, kepatuhan anggaran performa CI, dan cakupan pengujian.

## Referensi

- [Dokumentasi Tailwind CSS](https://tailwindcss.com/docs)
- [Panduan Upgrade Tailwind CSS v4](https://tailwindcss.com/docs/upgrade-guide)
- [Class Variance Authority (cva)](https://cva.style/)
- [Dokumentasi tailwind-merge](https://github.com/dcastil/tailwind-merge)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [Headless UI](https://headlessui.com/)
- [prettier-plugin-tailwindcss](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)
- [eslint-plugin-tailwindcss](https://github.com/francoismassart/eslint-plugin-tailwindcss)
- [Silabus Tailwind CSS (ReinvyLibrary)](./tailwind-css-syllabus_id.md)

---
title: "Silabus Arsitektur dan Modularisasi Aplikasi Swift"
description: "Kurikulum lanjutan 10 minggu tentang merancang dan memodularisasi basis kode Swift berskala besar — desain berlapis, graf modul Swift Package Manager, dependency injection, batas fitur, navigasi dan state yang skalabel, design system, optimasi waktu build, hingga migrasi monolit secara bertahap."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Arsitektur dan Modularisasi Aplikasi Swift

## Ringkasan

Silabus lanjutan 10 minggu ini ditujukan bagi engineer iOS yang bekerja pada basis kode yang sudah melampaui satu app target: ratusan layar, belasan kontributor, dan waktu build yang diukur dalam satuan menit. Sebagian besar kurikulum Swift mengajarkan fitur — view SwiftUI, networking, persistensi. Kurikulum ini mengajarkan struktur tempat fitur-fitur tersebut hidup, serta keputusan-keputusan yang menentukan apakah sebuah basis kode tetap cepat untuk diubah setelah tahun ketiga.

Materi bergerak dari fondasi arsitektur hingga migrasi modular penuh. Peserta memulai dengan mendiagnosis aplikasi yang belum dimodularisasi: mengukur coupling, memetakan keterkaitan dependensi, dan memisahkan logika domain dari kode framework. Selanjutnya peserta merancang arsitektur berlapis, memecah basis kode menjadi modul Swift Package Manager dengan arah dependensi yang eksplisit, menyambungkan dependensi melalui composition root alih-alih singleton global, serta mengalirkan navigasi dan state bersama melewati batas modul tanpa membocorkan detail implementasi. Modul-modul akhir membahas design system sebagai modul berversi, performa build graph dan kompilasi inkremental, distribusi binary framework, serta aturan tata kelola agar graf modul tidak kembali membusuk menjadi monolit.

Setiap modul memadukan teori desain dengan refactor pada aplikasi contoh realistis yang disertakan dalam repositori kursus. Proyek akhir berupa migrasi arsitektur penuh yang dikirim sebagai rangkaian pull request yang mudah di-review, bukan sebagai penulisan ulang total — karena begitulah pekerjaan ini sesungguhnya terjadi di tim produksi.

Prasyarat: pengalaman Swift dan SwiftUI yang kuat (setara dengan silabus Pengembangan iOS dan SwiftUI Lanjutan), terbiasa dengan konfigurasi project dan scheme Xcode, serta memiliki setidaknya satu aplikasi yang sudah dirilis atau basis kode tim berukuran sekitar 20 ribu baris sebagai studi kasus.

## Kurikulum

### Modul 1: Fondasi Arsitektur dan Mendiagnosis Coupling (Minggu 1)

- **Apa yang sebenarnya diberikan arsitektur**
  - Biaya perubahan sebagai metrik sesungguhnya: waktu kompilasi, radius dampak, cakupan review, waktu onboarding
  - Perbedaan antara modularitas, pelapisan, dan abstraksi — serta masalah mana yang diperbaiki oleh masing-masing
  - Mengapa "MVVM dengan folder" berhenti berskala begitu satu target melewati beberapa ratus berkas
- **Mengukur titik awal**
  - Memetakan graf dependensi saat ini secara manual dan dengan tooling (analisis import, diagnostik `swift package`)
  - Mengenali god type, referensi melingkar, dan singleton mutable yang dipakai bersama
  - Mencatat baseline: waktu clean build, waktu build inkremental, durasi test suite, jumlah berkas per fitur
- **Mode kegagalan yang harus diantisipasi**
  - Modul "Utils" bersama yang berubah menjadi monolit kedua
  - Coupling framework di dalam logika domain (import UIKit dan SwiftUI bocor ke aturan bisnis)
  - Abstraksi prematur: modul dibuat sebelum batasannya benar-benar dipahami
- **Lab Praktik**: Audit aplikasi contoh kursus, buat peta dependensi dan lembar metrik baseline, lalu tulis proposal satu halaman yang menyebut tiga titik coupling terburuk

### Modul 2: Arsitektur Berlapis dan Pemodelan Domain (Minggu 2)

- **Memilih tulang punggung struktur**
  - Organisasi feature-first versus layer-first dan kondisi kapan masing-masing unggul
  - Clean Architecture, hexagonal architecture, dan MVC/MVVM tanpa upacara berlebihan
  - Pelapisan pragmatis: presentation, domain, dan data sebagai batas minimum yang tidak bisa dikurangi
- **Pemodelan domain di Swift**
  - Tipe value, state machine berbasis `enum`, dan membuat state ilegal tidak dapat direpresentasikan
  - Batas yang didefinisikan protokol (`Repository`, `Service`, `UseCase`) serta penamaan yang tahan refactor
  - Memodelkan error sebagai hasil bertipe, bukan `NSError` berbasis string
- **Menjaga framework tetap di tepi**
  - Target domain tanpa `import UIKit` atau `import SwiftUI` sama sekali
  - Adapter yang menerjemahkan antara tipe framework dan tipe domain
  - Menguji aturan domain tanpa menyalakan simulator
- **Lab Praktik**: Ekstrak aturan bisnis satu fitur dari view model ke lapisan domain yang bebas framework, lalu tambahkan unit test yang berjalan di bawah satu detik tanpa boot simulator

### Modul 3: Modularisasi dengan Swift Package Manager (Minggu 3)

- **Dasar-dasar desain modul**
  - Apa yang layak menjadi modul: kohesi, kepemilikan, dan irama rilis sebagai faktor penentu
  - Trade-off granularitas — terlalu sedikit modul versus satu modul per tipe
  - Konvensi penamaan dan namespace untuk package internal
- **Struktur package dan manifest**
  - Anatomi `Package.swift`: target, product, dependency, dan platform requirement
  - Package lokal di dalam workspace versus repositori per package
  - Import `@_exported`, visibilitas modul eksplisit, dan menghindari API surface yang bocor tanpa sengaja
- **Arah dependensi**
  - Graf asiklik dan mengapa domain tidak boleh bergantung pada presentation
  - Modul umbrella/interface agar fitur berkomunikasi melalui kontrak
  - Mendeteksi dan memutus siklus sebelum mengeras
- **Lab Praktik**: Pecah aplikasi contoh menjadi package domain, package networking, dan dua package fitur, lalu pastikan grafnya asiklik dengan `swift package show-dependencies`

### Modul 4: Dependency Injection dan Composition Root (Minggu 4)

- **Mengapa singleton menghambat modularisasi**
  - Coupling tersembunyi lewat `.shared` dan state global; biaya pada pengujian dan paralelisme
  - Membedakan service tingkat aplikasi dari dependensi per fitur
- **Strategi injeksi**
  - Constructor injection sebagai default; property injection untuk tipe yang diwajibkan framework
  - Injeksi berbasis environment di SwiftUI dan batasannya di persimpangan modul
  - Container ringan tanpa framework pihak ketiga: registry, factory, dan closure `Sendable`
- **Composition root**
  - Satu titik perakitan di app target yang membangun object graph
  - Menjaga root tetap tipis: factory per fitur, bukan berkas wiring ribuan baris
  - Scoping: dependensi selama aplikasi hidup, selama sesi, dan selama satu layar
- **Lab Praktik**: Hapus seluruh singleton dari aplikasi contoh, sambungkan graf dari composition root, dan tunjukkan satu fitur yang diuji hanya dengan fake yang diinjeksi

### Modul 5: Modul Fitur, Batas, dan Kontrak (Minggu 5)

- **Mendefinisikan API publik sebuah fitur**
  - Permukaan publik minimal: view masuk, tipe route, dan satu interface fitur
  - `internal` sebagai default dan kebiasaan review yang menjaganya demikian
  - Memversikan kontrak internal saat fitur berevolusi secara mandiri
- **Komunikasi antar fitur tanpa coupling**
  - Event dan observer, protokol delegate, dan async stream sebagai tiga pola yang layak
  - Deep link dan registry route bersama
  - Menghindari modul "model bersama" yang diedit semua fitur
- **Penegakan batas**
  - Aturan import dan konfigurasi lint yang menggagalkan build saat ada import ilegal
  - Target test per modul agar pelanggaran batas muncul sebagai galat kompilasi, bukan crash
  - Checklist review kode untuk perubahan lintas modul
- **Lab Praktik**: Tambahkan modul fitur kedua yang mengonsumsi fitur pertama hanya melalui interface-nya, lalu tambahkan aturan import yang memblokir arah sebaliknya

### Modul 6: Navigasi dan Routing dalam Skala Besar (Minggu 6)

- **Navigasi sebagai masalah yang dimodelkan**
  - Enum route, destination bertipe, dan state path yang dimiliki di luar view
  - `NavigationStack` dan `NavigationPath` melewati batas modul
  - Coordinator dan router: biayanya dan kapan manfaatnya sepadan
- **Memisahkan layar satu dari yang lain**
  - Factory destination yang didaftarkan per modul fitur
  - Mengirim identifier dan tipe value alih-alih objek hidup antar modul
  - Menangani deep link melalui model route yang sama dengan navigasi dalam aplikasi
- **Navigasi multi-platform dan multi-scene**
  - Split view iPad, jendela macOS, dan ornament visionOS dari satu model route
  - Restorasi state antar peluncuran
- **Lab Praktik**: Ganti rantai `NavigationLink` ad hoc dengan lapisan routing yang me-resolve destination dari factory yang didaftarkan fitur, termasuk deep link ke layar bersarang

### Modul 7: Manajemen State Melewati Batas Modul (Minggu 7)

- **Di mana state seharusnya berada**
  - State view lokal, state fitur, dan state aplikasi — serta aturan untuk menaikkannya
  - Framework Observation antar modul: model `@Observable` yang dimiliki fitur
  - Menghindari objek state aplikasi global yang menghidupkan kembali monolit dalam satu berkas
- **Berbagi state tanpa berbagi implementasi**
  - Proyeksi read-only yang dipublikasikan lewat protokol
  - Async stream dan `AsyncSequence` untuk sinyal antar fitur
  - Persistensi sebagai batas service, bukan handle database bersama
- **Konkurensi di aplikasi modular**
  - Isolasi actor per modul dan batas `Sendable` di antaranya
  - Konkurensi ketat Swift 6 sebagai pendorong arsitektur
  - Menghindari data race di persimpangan tempat modul bertemu
- **Lab Praktik**: Bangun alur notifikasi antar fitur menggunakan kontrak async stream, sambil menjaga kedua modul fitur tetap tanpa import satu sama lain

### Modul 8: Design System dan Modul UI Bersama (Minggu 8)

- **Design system yang tidak menjadi monolit baru**
  - Token (warna, spacing, tipografi, motion) sebagai data, bukan konstanta hardcoded
  - Modul komponen versus satu "UI" yang menjadi wadah serba ada
  - Mengelola tipografi dan perilaku dynamic type secara terpusat
- **Distribusi dan versi**
  - Semantic versioning untuk package UI internal dan kebijakan deprecation
  - Pengembangan berbasis preview melewati batas modul
  - Tema dan varian brand tanpa mem-fork komponen
- **Aksesibilitas sebagai kontrak modul**
  - Trait aksesibilitas default yang sudah tertanam di komponen bersama
  - Mengaudit komponen sekali, bukan per layar
  - Kunci lokalisasi tinggal bersama komponen yang memakainya
- **Lab Praktik**: Ekstrak tiga view yang berulang menjadi package design system berversi dengan styling berbasis token, dukungan dynamic type, dan katalog preview

### Modul 9: Performa Build, CI, dan Distribusi Binary (Minggu 9)

- **Membuat build modular lebih cepat, bukan lebih lambat**
  - Mengapa modularisasi berlebihan dapat menaikkan total waktu build dan cara mengukurnya
  - Optimasi whole-module, kompilasi inkremental, dan caching tingkat target
  - Build timeline dan `-debug-time-function-bodies` untuk mencari titik panas
- **CI untuk graf modul**
  - Deteksi target terdampak agar perubahan satu baris tidak membangun semuanya
  - Eksekusi test paralel per modul dan bundel hasil bersama
  - Strategi cache untuk dependensi dan derived data
- **Modul binary dan prebuilt**
  - XCFramework serta linkage statis versus dinamis di aplikasi modular
  - Kapan mendistribusikan modul binary ke konsumen pihak ketiga versus package sumber
  - Visibilitas simbol dan stabilitas API untuk artefak binary
- **Lab Praktik**: Tambahkan deteksi target terdampak ke CI, lalu ukur dan dokumentasikan waktu build sebelum dan sesudah untuk perubahan yang representatif

### Modul 10: Migrasi, Tata Kelola, dan Kepemimpinan Arsitektur (Minggu 10)

- **Migrasi bertahap**
  - Migrasi strangler-fig: mengiris modul dari aplikasi yang sedang berjalan tanpa membekukan fitur
  - Menyusun urutan pekerjaan agar setiap pull request dapat di-review dan dirilis secara mandiri
  - Feature flag dan jalur ganda selama transisi, serta kedisiplinan untuk menghapus jalur lama
- **Menjaga graf tetap sehat sepanjang waktu**
  - Architecture decision record (ADR) dan mengapa tim kecil pun membutuhkannya
  - Pemeriksaan graf dependensi di CI, kepemilikan modul, dan CODEOWNERS
  - Metrik yang menyingkap pembusukan: jumlah siklus, pertumbuhan modul, latensi review
- **Memimpin perubahan**
  - Menulis proposal, mempertahankan trade-off, dan menegosiasikan cakupan dengan product
  - Meng-onboard engineer baru ke basis kode modular
  - Mengenali kapan kemurnian arsitektur menelan biaya lebih besar daripada manfaatnya
- **Lab Praktik**: Susun rencana migrasi untuk proyek akhir, lengkap dengan pemecahan PR yang berurutan dan strategi rollback per langkah

## Proyek Akhir

Peserta mengambil aplikasi contoh yang belum dimodularisasi (sekitar 15 ribu baris, lima fitur, tiga singleton bersama) dan menghasilkan migrasi arsitektur lengkap dalam rangkaian pull request yang dapat di-review. Hasil yang diwajibkan:

- Lapisan domain tanpa import framework, tercakup unit test cepat yang berjalan tanpa simulator
- Minimal lima modul Swift Package Manager dengan graf dependensi asiklik yang didokumentasikan eksplisit
- Composition root di app target yang membangun object graph, tanpa singleton global tersisa di kode fitur
- Lapisan routing yang me-resolve setiap destination melalui factory yang didaftarkan fitur, termasuk minimal satu deep link
- Package design system berversi dengan styling berbasis token yang dipakai minimal tiga layar
- CI yang dikonfigurasi dengan deteksi target terdampak dan eksekusi test per modul, beserta pengukuran waktu build sebelum dan sesudah
- Architecture decision record tertulis untuk setiap batas utama, plus README yang menjelaskan graf modul kepada kontributor baru

Pengumpulan mencakup rangkaian PR itu sendiri — rencana migrasi dan commit bertahap dinilai bersama kondisi akhir, karena pengiriman bertahap adalah keterampilan yang diajarkan di sini.

## Kriteria Penilaian

- **Tugas (40%)**: satu kuis per modul ditambah lab mingguan yang dinilai berdasarkan ketepatan refactor, sifat minimal, dan penjelasannya. Lab bersifat individual; masing-masing dikumpulkan sebagai branch dengan catatan desain singkat mengenai trade-off yang dipertimbangkan.
- **Proyek Akhir (45%)**: dinilai dari ketepatan arsitektur (arah dependensi, kejelasan batas, tidak ada kebocoran), pengiriman bertahap (ukuran PR, kemudahan review, urutan yang aman), hasil terukur (waktu build, durasi test, jumlah siklus sebelum dan sesudah), serta dokumentasi (ADR, README modul, catatan onboarding).
- **Partisipasi Review Kode (10%)**: setiap peserta me-review dua pull request migrasi rekan menggunakan rubrik kursus, memeriksa pelanggaran batas, permukaan API publik, dan cakupan test di persimpangan modul.
- **Review Sebaya (5%)**: retrospektif singkat atas arsitektur rekan, mengidentifikasi satu risiko struktural dan mengusulkan mitigasi yang konkret.

## Referensi

- Apple Developer Documentation — Swift Packages: https://developer.apple.com/documentation/xcode/swift-packages
- Repositori dan dokumentasi Swift Package Manager: https://github.com/swiftlang/swift-package-manager
- The Swift Programming Language — Access Control: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/accesscontrol/
- Apple Developer Documentation — Framework Observation: https://developer.apple.com/documentation/observation
- Apple Developer Documentation — Navigasi SwiftUI: https://developer.apple.com/documentation/swiftui/navigation
- Apple Developer Documentation — XCFramework: https://developer.apple.com/documentation/xcode/creating-a-multi-platform-binary-framework-bundle
- Sesi WWDC — "Creating a Great Modular Architecture", "Meet Swift Package Manager", dan pembahasan migrasi konkurensi Swift
- Martin Fowler — Strangler Fig Application: https://martinfowler.com/bliki/StranglerFigApplication.html
- "A Philosophy of Software Design" — John Ousterhout (kedalaman modul dan kompleksitas interface)
- "Clean Architecture" — Robert C. Martin (dependency rule dan desain batas)

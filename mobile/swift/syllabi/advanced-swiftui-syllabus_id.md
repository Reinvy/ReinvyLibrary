---
title: "Silabus SwiftUI Lanjutan"
description: "Kurikulum lanjutan 10 minggu untuk menguasai SwiftUI modern — manajemen state observable, SwiftData, arsitektur navigasi, layout kustom, animasi, optimasi performa, dan pengembangan aplikasi multi-platform."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus SwiftUI Lanjutan

## Ringkasan

Silabus 10 minggu ini dirancang bagi pengembang yang sudah memahami dasar-dasar SwiftUI dan ingin mencapai tingkat lanjutan. Fokus utamanya adalah tumpukan teknologi SwiftUI modern: makro `@Observable` dan kerangka kerja observation, persistensi SwiftData, arsitektur `NavigationStack` dan `NavigationSplitView`, protokol `Layout` untuk layout kustom, teknik animasi kelas produksi, pembuatan profil performa dengan Instruments, pengembangan aplikasi multi-platform, serta aksesibilitas. Setiap minggu memadukan pendalaman konsep dengan latihan langsung, dan kursus ini berpuncak pada proyek akhir multi-platform yang menggabungkan seluruh topik yang dipelajari.

**Durasi**: 10 minggu (disarankan: 10–15 jam per minggu)
**Prasyarat**: Penguasaan dasar Swift yang solid, pemahaman kerja dasar SwiftUI (view, modifier, `@State`/`@Binding`), dan pengalaman membangun setidaknya satu aplikasi SwiftUI secara utuh
**Metode**: Belajar mandiri dengan penilaian berbasis proyek

## Kurikulum

### Minggu 1: Kerangka Kerja Observation dan Manajemen State Modern

- **Makro `@Observable`**
  - Cara kerja kerangka kerja observation dalam melacak akses properti
  - Migrasi dari `@StateObject`/`@ObservedObject`/`@EnvironmentObject` ke `@Observable`
  - `@Bindable` untuk binding dua arah ke properti observable
- **Kepemilikan dan siklus hidup**
  - `@State` dengan model observable, injeksi `@Environment`
  - State lingkup aplikasi vs. lingkup scene vs. lingkup view
- **Menghindari render berlebih**
  - Invalidasi view secara granular dan model evaluasi ulang `body`
  - `@ObservationIgnored` untuk properti yang tidak diamati
- **Pola praktis**
  - View model, store, dan service object dengan `@Observable`
  - Menguji model observable dengan `withObservationTracking`
- **Latihan**: Refaktor aplikasi `ObservableObject` lama ke kerangka kerja observation dan ukur pengurangan jumlah render

### Minggu 2: Pendalaman SwiftData

- **Lapisan model SwiftData**
  - `@Model`, relasi, dan batasan unik
  - Strategi migrasi: ringan, bertahap, dan migrasi kustom
- **Siklus hidup ModelContext**
  - Main actor context vs. background context
  - Konfigurasi `ModelContainer`, in-memory store untuk preview dan pengujian
- **Kueri dan pengurutan**
  - `@Query` dengan predicate, sort descriptor, dan batas pengambilan
  - Kueri dinamis dengan makro `#Predicate`
- **Integrasi SwiftData dan SwiftUI**
  - Model observable dan manajemen undo
  - Sinkronisasi CloudKit dengan `ModelConfiguration`
- **Latihan**: Bangun aplikasi perpustakaan dengan relasi satu-ke-banyak, pencarian, dan sinkronisasi CloudKit

### Minggu 3: Arsitektur Navigasi

- **Dasar NavigationStack**
  - Navigasi berbasis nilai dengan `NavigationLink(value:)` dan `navigationDestination`
  - Enum rute bertipe untuk navigasi aman saat kompilasi
  - Mengelola `NavigationPath` secara terprogram (push, pop, pop-to-root)
- **NavigationSplitView**
  - Tata letak tiga kolom untuk iPad dan macOS
  - Kontrol visibilitas kolom dan pemilihan detail
- **Pola navigasi lanjutan**
  - Deep link dengan `onOpenURL` dan scene phase
  - Navigasi berbasis tab yang dikombinasikan dengan stack
  - Koordinasi presentasi sheet dan full-screen-cover
- **Pemulihan state**
  - Menyimpan dan memulihkan `NavigationPath` antar peluncuran aplikasi
- **Latihan**: Bangun aplikasi master-detail dengan rute bertipe, deep link, dan pemulihan state

### Minggu 4: Layout Kustom dan Komposisi View

- **Protokol `Layout`**
  - Implementasi `sizeThatFits` dan `placeSubviews`
  - Kontainer layout kustom (flow layout, radial layout, masonry grid)
  - `LayoutValueKey` untuk atribut layout per subview
- **PreferenceKey dan modifier view kustom**
  - Menyebarkan informasi anak ke atas pohon view
  - Membangun modifier dan ekstensi view yang dapat digunakan ulang
- **Komposisi lanjutan**
  - `ViewThatFits`, `AnyLayout` untuk layout adaptif
  - View kontainer kustom dengan `@ViewBuilder` dan result builder
- **Latihan**: Implementasikan kontainer flow layout dan view tag-cloud menggunakan protokol `Layout`

### Minggu 5: Animasi dan Transisi Lanjutan

- **Fisika animasi**
  - Parameter spring (response, dampingFraction, blendDuration)
  - Animasi interaktif dengan `Animation.spring` dan modifier `animatable`
- **Matched geometry effects**
  - `matchedGeometryEffect` untuk transisi shared-element
  - Animasi hero antara layar daftar dan detail
- **Animasi phase dan keyframe**
  - `PhaseAnimator` dan `KeyframeAnimator` untuk animasi multi-langkah
- **Efek berbasis scroll**
  - `scrollTargetLayout`, `scrollPosition`, dan efek paralaks
- **Animasi sadar performa**
  - Penggunaan `drawingGroup` dan `compositingGroup`, menganimasikan transform vs. layout
- **Latihan**: Bangun animasi kartu terbalik, alur onboarding dengan shared element, dan header yang mengecil saat scroll

### Minggu 6: Optimasi Performa dan Profiling

- **Dasar pipeline rendering**
  - Cara SwiftUI merender: diffing, invalidasi, dan pass menggambar
  - Menghindari evaluasi body yang tidak perlu dengan view `Equatable`
- **Performa List dan Grid**
  - Identitas stabil dengan `id(_:)`, praktik terbaik `ForEach`
  - Kontainer lazy, prefetching, dan jebakan reuse sel
- **Alur kerja Instruments**
  - Time Profiler, Core Animation, dan instruments SwiftUI
  - Mendeteksi biaya tersembunyi: blur, shadow, dan rendering di luar layar
- **Manajemen memori**
  - Capture list, menghindari retain cycle pada closure
  - Jebakan `@State` vs. model bertipe referensi
- **Latihan**: Buat profil aplikasi berat-list, identifikasi tiga hambatan rendering teratas, dan perbaiki dengan peningkatan yang terukur

### Minggu 7: Alur Data Lanjutan dan Integrasi

- **Binding dan fokus**
  - Proyeksi `Binding` kustom, `FocusState` untuk form
  - Varian `onChange` dan debouncing input pengguna
- **Nilai environment kustom**
  - Injeksi service, tema, dan konfigurasi aplikasi melalui `EnvironmentValues`
- **Interoperabilitas dengan UIKit**
  - `UIViewRepresentable` dan `UIViewControllerRepresentable`
  - Membungkus komponen UIKit kompleks (peta, pemutar video, editor kustom)
- **Networking dan caching**
  - Lapisan networking async/await dengan state observable
  - Strategi cache disk dan memori, background refresh
- **Latihan**: Bangun layar pengaturan dengan form berbasis fokus dan service tema yang diinjeksi via environment kustom

### Minggu 8: SwiftUI Multi-Platform

- **Desain adaptif**
  - Size class, `horizontalSizeClass`, dan layout adaptif
  - Kondisi kompilasi `#if os(...)` dan organisasi kode bersama
- **Fitur khusus platform**
  - iOS: widget, Live Activities, pencarian Spotlight
  - macOS: perintah menu bar, pintasan keyboard, manajemen jendela
  - watchOS: komplikasi dan navigasi khusus watch
  - visionOS: scene volumetrik, pertimbangan desain spasial
- **Berbagi kode antar platform**
  - Target framework dan organisasi Swift Package
  - Pola arsitektur aplikasi lintas platform
- **Latihan**: Perluas aplikasi iOS yang ada ke macOS dan watchOS dengan berbagi model inti dan logika bisnis

### Minggu 9: Aksesibilitas, Lokalisasi, dan Kesiapan Produksi

- **Aksesibilitas**
  - VoiceOver, dynamic type, dan modifier aksesibilitas
  - Accessibility tree dan custom actions
  - Pengujian dengan Accessibility Inspector Xcode
- **Lokalisasi**
  - String catalog, plural, dan tata letak kanan-ke-kiri
  - Memformat tanggal, angka, dan ukuran dengan `FormatStyle`
- **Pengujian dan CI**
  - Unit testing model observable dan store SwiftData
  - UI testing dengan XCUITest, snapshot testing
  - Pipeline Xcode Cloud atau GitHub Actions
- **Kesiapan App Store**
  - Konfigurasi debug vs. release, app thinning, dan manajemen aset
- **Latihan**: Audit aplikasi yang ada untuk masalah aksesibilitas dan lokalisasi, lalu tambahkan pipeline CI dengan unit test dan UI test

### Minggu 10: Proyek Akhir

- **Perencanaan proyek**
  - Pengumpulan kebutuhan, arsitektur informasi, dan desain model data
  - Memilih arsitektur navigasi dan target platform
- **Pembangunan aplikasi penuh**
  - Persistensi SwiftData, navigasi lanjutan, layout kustom
  - Animasi produksi dan profiling performa
  - Tahap aksesibilitas dan lokalisasi
- **Jaminan kualitas**
  - Rangkaian unit test, UI test, dan snapshot test
  - Validasi performa dengan Instruments
- **Presentasi akhir dan code review**

## Proyek Akhir

Proyek akhir adalah aplikasi SwiftUI multi-platform berkualitas produksi yang menunjukkan penguasaan konsep lanjutan yang dipelajari dalam kursus ini. Peserta memilih salah satu opsi berikut atau mengusulkan ide sendiri:

1. **Media Library Manager** — Pelacak film dan acara TV dengan SwiftData, rak layout flow kustom, transisi detail matched-geometry, widget, dan sinkronisasi CloudKit.
2. **Personal Finance Dashboard** — Pelacak pengeluaran dengan grafik, navigasi tab kustom, deep link ke laporan tertentu, dan ekstra menu bar macOS.
3. **Health and Fitness Companion** — Perencana latihan dengan integrasi HealthKit, animasi berbasis scroll, desain aksesibilitas-pertama, dan aplikasi pendamping watchOS.
4. **Collaborative Project Manager** — Papan tugas dengan layout kustom drag-and-drop, pembaruan real-time, pintasan keyboard di macOS, dan caching offline-first.

**Persyaratan**:
- Minimal dua target platform (misalnya iOS + macOS atau iOS + watchOS) yang berbagi inti yang sama
- Persistensi SwiftData dengan minimal satu relasi dan strategi migrasi
- Arsitektur navigasi bertipe dengan dukungan deep link
- Minimal satu implementasi `Layout` kustom
- Animasi matched geometry atau keyframe di alur utama pengguna
- Bukti profiling performa yang menunjukkan perbaikan berdasarkan data Instruments
- Tahap aksesibilitas penuh (VoiceOver, dynamic type) dan lokalisasi untuk minimal dua bahasa
- Minimal 15 unit test dan 8 UI test

## Kriteria Penilaian

- **Tugas (40%)**
  - Latihan mingguan (9 latihan × 4% = 36%)
  - Partisipasi code review (4%)
- **Proyek Akhir (50%)**
  - Arsitektur dan manajemen state (15%)
  - Kelengkapan fitur dan kedalaman teknis (15%)
  - Performa dan kualitas kode (10%)
  - Aksesibilitas, lokalisasi, dan pengujian (10%)
- **Partisipasi (10%)**
  - Kontribusi forum diskusi
  - Peer code review dan kualitas dokumentasi

## Referensi

- [Apple: Dokumentasi SwiftUI](https://developer.apple.com/documentation/swiftui)
- [Apple: Kerangka Kerja Observation](https://developer.apple.com/documentation/observation)
- [Apple: Dokumentasi SwiftData](https://developer.apple.com/documentation/swiftdata)
- [Apple: Sesi WWDC tentang SwiftUI dan SwiftData](https://developer.apple.com/videos/)
- [Hacking with Swift: SwiftUI Lanjutan](https://www.hackingwithswift.com/quick-start/swiftui)
- [Swift by Sundell](https://www.swiftbysundell.com)
- [Point-Free: SwiftUI dan Arsitektur](https://www.pointfree.co)
- [Kodeco: Tutorial SwiftUI Lanjutan](https://www.kodeco.com/ios)

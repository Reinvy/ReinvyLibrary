---
title: "Silabus Pengembangan iOS"
description: "Kurikulum 12 minggu yang komprehensif untuk belajar pengembangan iOS native dengan Swift, mencakup dasar-dasar hingga proyek kapstone."
category: "mobile"
technology: "swift"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan iOS

## Ringkasan

Silabus 12 minggu ini menyediakan jalur pembelajaran terstruktur untuk menguasai pengembangan iOS native dengan Swift. Dirancang untuk pelajar dengan pengalaman pemrograman dasar yang ingin menjadi pengembang iOS yang mahir. Kurikulum ini berkembang dari dasar-dasar Swift dan penguasaan Xcode IDE melalui UIKit dan SwiftUI, jaringan, penyimpanan data, konkurensi, dan berpuncak pada proyek kapstone yang mendemonstrasikan semua keterampilan yang diperoleh.

**Durasi**: 12 minggu (direkomendasikan: 10–15 jam per minggu)
**Prasyarat**: Pengetahuan pemrograman dasar (variabel, perulangan, fungsi)
**Metode**: Belajar mandiri dengan penilaian berbasis proyek

## Kurikulum

### Minggu 1: Dasar-Dasar Swift

- **Dasar sintaks Swift**
  - Variabel, konstanta, dan tipe data
  - Inferensi tipe dan keamanan tipe
  - Interpolasi string
- **Kontrol alur**
  - if/else, pernyataan switch
  - Perulangan for-in, while
- **Koleksi**
  - Array, dictionary, set
- **Fungsi**
  - Parameter fungsi dan nilai kembali
  - Label argumen dan nilai default
- **Proyek mini**: Kalkulator baris perintah

### Minggu 2: Xcode IDE dan Pengaturan Proyek

- **Ikhtisar antarmuka Xcode**
  - Navigator, editor, area utilitas
  - Skema dan konfigurasi build
- **Template proyek**
  - Single view, SwiftUI, template game
- **Dasar Interface Builder**
  - Storyboard dan file XIB
  - Outlet dan action
- **Manajemen simulator dan perangkat**
- **Integrasi Git di Xcode**
- **Proyek mini**: Aplikasi Hello World dengan storyboard

### Minggu 3: Dasar-Dasar UIKit

- **Siklus hidup UIView dan UIViewController**
  - viewDidLoad, viewWillAppear, viewDidAppear
- **Komponen UI umum**
  - UILabel, UIButton, UITextField, UIImageView
- **Pola target-action**
- **Arsitektur MVC di iOS**
- **Debugging di Xcode**
  - Breakpoints, konsol LLDB
- **Proyek mini**: Layar login dengan storyboard

### Minggu 4: Auto Layout dan Desain Responsif

- **Dasar Auto Layout**
  - Constraints dan intrinsic content size
  - Safe area guides dan layout margins
- **NSLayoutConstraint secara terprogram**
- **UIStackView**
  - Stack horizontal dan vertikal
  - Distribusi dan alignment
- **Size classes dan trait collections**
- **Tata letak adaptif untuk berbagai ukuran layar**
- **Proyek mini**: Kartu profil responsif

### Minggu 5: Navigasi dan Tab Bar

- **UINavigationController**
  - Push dan pop view controller
  - Kustomisasi navigation bar
- **UITabBarController**
  - Tab bar dengan beberapa view controller
- **Segues dan storyboard references**
- **Presentasi modal**
- **Container view controller**
- **Proyek mini**: Aplikasi pengaturan multi-layar

### Minggu 6: TableView dan CollectionView

- **Dasar UITableView**
  - Pola DataSource dan Delegate
  - Reuse dan dequeuing sel
- **UITableViewCell kustom**
- **UICollectionView**
  - Flow layout dan compositional layout
- **Diffable data sources**
- **Pull-to-refresh dan infinite scrolling**
- **Proyek mini**: Aplikasi feed berita dengan artikel

### Minggu 7: Jaringan dan API

- **Dasar URLSession**
  - Data tasks, download tasks
- **Parsing JSON dengan Codable**
- **Konsumsi REST API**
  - GET, POST, PUT, DELETE
- **Penanganan error dalam jaringan**
- **Async/await untuk panggilan jaringan**
- **Proyek mini**: Aplikasi cuaca dengan API langsung

### Minggu 8: CoreData dan Penyimpanan Data

- **Pengaturan CoreData stack**
  - NSPersistentContainer, managed context
- **Operasi CRUD**
  - Create, read, update, delete
- **NSFetchRequest dan predicates**
- **CoreData dengan UITableView**
- **UserDefaults untuk preferensi sederhana**
- **FileManager untuk penyimpanan dokumen**
- **Proyek mini**: Aplikasi daftar tugas dengan persistensi

### Minggu 9: Dasar-Dasar SwiftUI

- **Ikhtisar sintaks deklaratif**
  - View protocol, @State, @Binding
- **View SwiftUI umum**
  - Text, Image, Button, List, Form
- **Kontainer tata letak**
  - VStack, HStack, ZStack
- **Modifier dan komposisi view**
- **Pratinjau SwiftUI**
- **Proyek mini**: Layar profil dengan SwiftUI

### Minggu 10: Konkurensi (async/await)

- **Model konkurensi Swift**
  - Fungsi async dan await
- **Task dan TaskGroup**
- **Actor untuk isolasi data**
- **MainActor untuk pembaruan UI**
- **Menjembatani completion handler ke async/await**
- **Proyek mini**: Pengunduh gambar paralel

### Minggu 11: Siklus Hidup Aplikasi dan Topik Lanjutan

- **Status siklus hidup aplikasi**
  - Not running, foreground, background, suspended
- **SceneDelegate dan AppDelegate**
- **Notifikasi push (pengaturan dasar)**
- **Ikhtisar ekstensi aplikasi**
  - Widget, share extensions
- **Aksesibilitas di iOS**
- **Internasionalisasi dan lokalisasi**
- **Proyek mini**: Ekstensi widget untuk aplikasi daftar tugas

### Minggu 12: Proyek Kapstone

- **Perencanaan dan desain proyek**
  - User stories, wireframe, model data
- **Pengembangan aplikasi iOS full-stack**
  - Frontend: SwiftUI atau UIKit
  - Backend: Integrasi REST API
  - Data: Caching CoreData/SwiftData
- **Dasar pengujian**
  - Unit test dengan XCTest
  - UI test dengan XCUITest
- **Persiapan App Store**
  - Ikon aplikasi, tangkapan layar, metadata
- **Presentasi akhir dan tinjauan kode**

## Proyek Akhir

Proyek kapstone adalah aplikasi iOS dengan fitur lengkap yang menunjukkan penguasaan semua konsep yang dibahas dalam kursus. Siswa memilih dari opsi berikut atau mengusulkan ide mereka sendiri:

1. **Aplikasi Feed Media Sosial** — Postingan, suka, komentar dengan caching CoreData dan notifikasi push.
2. **Browser Produk E-Commerce** — Daftar produk, keranjang, alur checkout dengan integrasi REST API.
3. **Pelacak Kebugaran** — Pencatatan latihan, pelacakan tujuan, integrasi HealthKit, dan visualisasi data.
4. **Manajer Resep** — Buat, edit, cari resep dengan dukungan gambar dan sinkronisasi cloud.

**Persyaratan**:
- Minimal 4 layar dengan navigasi.
- Integrasi jaringan dengan setidaknya satu REST API.
- Penyimpanan data lokal (CoreData atau SwiftData).
- Setidaknya 10 unit test dan 5 UI test.
- Penanganan error dan status loading yang tepat.
- Dukungan aksesibilitas (dynamic type, VoiceOver).

## Kriteria Penilaian

- **Tugas (40%)**
  - Proyek mini mingguan (10 proyek × 3% masing-masing = 30%)
  - Partisipasi tinjauan kode (10%)
- **Proyek Akhir (50%)**
  - Fungsionalitas dan kelengkapan (15%)
  - Kualitas kode dan arsitektur (15%)
  - Cakupan dan kualitas pengujian (10%)
  - Desain UI/UX dan kerapian (10%)
- **Partisipasi (10%)**
  - Kontribusi forum diskusi
  - Tinjauan kode rekan sejawat
  - Kualitas dokumentasi dan README

## Referensi

- [Dokumentasi Resmi Swift oleh Apple](https://docs.swift.org/swift-book/)
- [Dokumentasi Pengembang Apple: UIKit](https://developer.apple.com/documentation/uikit)
- [Dokumentasi Pengembang Apple: SwiftUI](https://developer.apple.com/documentation/swiftui)
- [Hacking with Swift](https://www.hackingwithswift.com)
- [Ray Wenderlich (Kodeco) Tutorial iOS](https://www.kodeco.com/ios)
- [Swift by Sundell](https://www.swiftbysundell.com)
- [CS193p Kursus Stanford (YouTube)](https://www.youtube.com/playlist?list=PLpGHT1n4-mAsxuRxVPv7kj4-dQYoC3VVu)

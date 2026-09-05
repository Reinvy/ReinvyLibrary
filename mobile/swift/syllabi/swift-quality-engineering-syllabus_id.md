---
title: "Silabus Pengujian dan Rekayasa Kualitas Swift"
description: "Kurikulum 10 minggu tingkat lanjut untuk menguasai pengujian dan rekayasa kualitas Swift — pengujian unit XCTest, test double, framework Swift Testing, pengembangan berbasis pengujian, pengujian async dan Combine, pengujian UI XCUITest, snapshot testing, pengujian performa dan keandalan, cakupan kode dan analisis statis, pipeline pengujian CI/CD, serta arsitektur aplikasi yang dapat diuji."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Pengujian dan Rekayasa Kualitas Swift

## Ringkasan

Kurikulum tingkat lanjut 10 minggu ini dirancang untuk insinyur iOS yang ingin menguasai sisi pengujian dan kualitas dalam pengembangan Swift. Berbeda dengan kursus iOS umum yang membahas pengujian hanya sebagai satu modul, kurikulum ini mendalami seluruh tumpukan rekayasa kualitas: merancang test target dan test plan, menulis pengujian unit dengan test double dan dependency injection, mengadopsi framework Swift Testing yang modern, mempraktikkan pengembangan berbasis pengujian (TDD), menguji kode async dan Combine, membangun rangkaian UI XCUITest yang kokoh, menambahkan cakupan snapshot dan visual regression, mengukur performa dan keandalan, serta mengintegrasikan semuanya ke dalam pipeline CI dengan gerbang cakupan kode dan analisis statis.

Setiap modul menggabungkan fondasi teoretis dengan praktik laboratorium langsung menggunakan Xcode, XCTest, XCUITest, serta perangkat produksi nyata seperti GitHub Actions, Xcode Cloud, fastlane, SwiftLint, dan iOSSnapshotTestCase. Peserta belajar secara progresif: dari satu test target, melalui rangkaian unit dan UI, hingga pipeline kualitas continuous integration yang lengkap sebagai proyek kapstone. Pada akhir kursus ini, peserta akan mampu merancang aplikasi Swift yang mudah diuji, menegakkan gerbang kualitas di CI, dan menjaga basis kode iOS yang besar tetap aman untuk di-refactor dengan pengujian yang cepat, andal, dan bermakna.

## Kurikulum

### Modul 1: Fondasi Pengujian dan Penyiapan Test Target (Minggu 1)

- **Mengapa Pengujian Penting**
  - Biaya cacat yang ditemukan terlambat dan nilai jaring pengaman regresi
  - Piramida pengujian mobile: lapisan unit, integrasi, dan UI beserta trade-off biaya/nilainya
  - Rekayasa kualitas sebagai disiplin: shift-left testing dan definisi selesai (definition of done) bersama
- **XCTest dan Test Target**
  - Membuat test target unit dan UI di Xcode; konfigurasi test host dan aplikasi host
  - Siklus hidup pengujian: `setUp`, `tearDown`, dan isolasi antar-pengujian
  - Keluarga assertion `XCTAssert` dan menulis pesan kegagalan yang menjelaskan maksud
- **Test Plan dan Konfigurasi Pengujian**
  - Test plan, konfigurasi, dan skema; pengujian berulang untuk mengungkap flakiness
  - Pengujian paralel di banyak simulator
  - Memfilter dan memfokuskan dengan `-only-testing` dan `-skip-testing`
- **Eksekusi Pengujian Lewat Baris Perintah**
  - Menjalankan pengujian dengan `xcodebuild test` dan opsi destination
  - Membaca bundel `.xcresult` dan ringkasan hasil
- **Praktik Laboratorium**: Buat test target unit dan UI untuk aplikasi iOS pemula, tulis rangkaian pengujian model, dan jalankan dari terminal dengan `xcodebuild`

### Modul 2: Pengujian Unit dengan XCTest dan Test Double (Minggu 2)

- **Merancang agar Mudah Diuji**
  - Protokol sebagai seam; constructor injection versus property injection
  - Memisahkan logika bisnis murni dari efek samping seperti networking dan persistensi
- **Test Double dalam Praktik**
  - Mock, stub, fake, spy, dan dummy: kapan menggunakan masing-masing
  - Test double yang ditulis manual melalui konformansi protokol
  - Men-stub `URLSession` dengan `URLProtocol` dan mendekode fixture JSON
- **Pola Assertion**
  - `XCTAssertEqual` dengan akurasi untuk floating point; `XCTAssertThrowsError` untuk jalur error
  - `XCTUnwrap` untuk pengujian optional yang aman
- **Organisasi Pengujian**
  - Struktur Given-When-Then dan penamaan yang berfokus pada perilaku
  - Menjaga pengujian independen, deterministik, dan cepat
- **Praktik Laboratorium**: Refactor view model networking agar menggunakan seam protokol, lalu tulis pengujian unit dengan double in-memory dan `URLProtocol` yang di-stub

### Modul 3: Framework Swift Testing dan Desain Pengujian Modern (Minggu 3)

- **Framework Swift Testing**
  - Fungsi `@Test`, makro `#expect`, dan tipe `Suite`
  - Pengujian terparameterisasi yang digerakkan oleh koleksi argumen
  - Trait: tag, batas waktu, referensi bug, dan trait kondisional
- **Membandingkan XCTest dan Swift Testing**
  - Kapan memigrasikan rangkaian yang ada dan cara menginterop kedua framework dalam satu target
  - `#require` untuk keluar lebih awal dan unwrapping kondisional
- **Menulis Pengujian yang Ekspresif**
  - Ekspektasi deskriptif dengan komentar kustom dan kegagalan yang berfokus pada masalah
  - Organisasi file dan konvensi penamaan untuk rangkaian modern
- **Praktik Laboratorium**: Konversi rangkaian XCTest yang ada ke Swift Testing, tambahkan pengujian terparameterisasi untuk fungsi validasi, dan lampirkan trait referensi bug

```swift
import Testing

@Suite("Perhitungan total keranjang")
struct CartTotalTests {
    @Test("Menerapkan diskon persentase",
          arguments: [(100.0, 10.0, 90.0), (250.0, 25.0, 187.5)])
    func percentageDiscount(total: Double, percent: Double, expected: Double) {
        #expect(Cart.total(afterDiscount: total, percent: percent) == expected)
    }
}
```

### Modul 4: Pengembangan Berbasis Pengujian di Swift (Minggu 4)

- **Siklus TDD**
  - Red, green, refactor: menulis pengujian gagal terkecil terlebih dahulu
  - Perbaikan bug dengan test-first: reproduksi kegagalan, perbaiki, dan kunci dengan pengujian regresi
- **Merancang Melalui Pengujian**
  - Pengujian sebagai spesifikasi perilaku yang dapat dieksekusi
  - Menemukan API dari sudut pandang pengujian sebelum mengimplementasikannya
- **Bekerja dengan Kode Warisan**
  - Characterization test yang mengunci perilaku yang ada
  - Memperkenalkan seam ke kode yang sulit diuji dan refactor bertahap di bawah rangkaian yang hijau
- **Jebakan dan Disiplin TDD**
  - Menguji perilaku, bukan detail implementasi
  - Menghindari pengujian tautologis dan menyeimbangkan kecepatan dengan cakupan yang bermakna
- **Praktik Laboratorium**: Bangun fitur keranjang belanja dengan gaya TDD — tulis pengujian gagal untuk logika harga (diskon, pajak, aturan kuantitas), implementasikan fitur, dan refactor sambil menjaga rangkaian tetap hijau

### Modul 5: Menguji Konkurensi, Combine, dan Actor (Minggu 5)

- **Menguji Kode Async/Await**
  - Menandai fungsi pengujian dengan `async` dan menunggu di dalam pengujian
  - `XCTestExpectation` untuk kode berbasis callback; semantik fulfillment dan `wait`
- **Menguji Pipeline Combine**
  - Mengumpulkan nilai dengan subscriber kustom; menguji operator dan jalur error
  - Menggerakkan pipeline dengan `PassthroughSubject` dan `CurrentValueSubject` dalam pengujian
- **Isolasi Actor dan Data Race**
  - Menguji metode actor dan fungsi pengujian yang terisolasi `@MainActor`
  - Mendeteksi data race dengan mengaktifkan Thread Sanitizer pada proses pengujian
- **Waktu yang Deterministik**
  - Menyuntikkan scheduler dan clock agar pengujian tidak pernah bergantung pada waktu nyata
  - Mengontrol timer dan perilaku debounce dalam pengujian
- **Praktik Laboratorium**: Tulis pengujian async untuk klien API, uji pipeline Combine yang melakukan mapping dan retry, lalu aktifkan Thread Sanitizer untuk menangkap race pada cache bersama

### Modul 6: Pengujian UI dengan XCUITest (Minggu 6)

- **Dasar Pengujian UI**
  - `XCUIApplication`, kueri elemen, dan accessibility tree
  - Launch argument dan launch environment untuk konfigurasi pengujian
  - Mengetuk, mengetik, menggeser, dan menunggu keberadaan elemen
- **Menulis Alur UI yang Kokoh**
  - Pola page object untuk pengujian UI yang mudah dipelihara
  - Menunggu dengan expectation dan menghindari sleep tetap
  - Accessibility identifier sebagai hook yang stabil dan terpisah dari layout
- **Mengelola Pengujian UI yang Flaky**
  - Strategi retry dan karantina; pertimbangan eksekusi paralel
  - Melampirkan screenshot dan video untuk diagnosis kegagalan
- **Praktik Laboratorium**: Tulis pengujian UI end-to-end untuk alur login-dan-feed menggunakan page object dan launch argument yang men-stub lapisan jaringan

### Modul 7: Snapshot dan Visual Regression Testing (Minggu 7)

- **Dasar Snapshot Testing**
  - Golden file dan perbandingan piksel dengan iOSSnapshotTestCase
  - Merekam baseline dan memverifikasi snapshot; meninjau diff
- **Strategi Snapshot**
  - Snapshot tingkat komponen untuk view yang dapat digunakan ulang
  - Perangkat tetap, size class, trait, dan varian lokalisasi
  - Kapan snapshot memberi nilai jelas dan kapan menjadi beban pemeliharaan
- **Visual Regression di CI**
  - Menghasilkan gambar diff, mengelola baseline, dan alur persetujuan
  - Menggabungkan snapshot test dengan UI test untuk cakupan penuh
- **Praktik Laboratorium**: Tambahkan snapshot test untuk tiga komponen yang dapat digunakan ulang, buat baseline, rusak layout secara sengaja, dan pastikan alur diff CI menangkap regresi tersebut

### Modul 8: Pengujian Performa dan Keandalan (Minggu 8)

- **Pengujian Performa dengan XCTest**
  - Blok `measure` dan baseline `XCTMetric`
  - Mengukur waktu startup, memori, dan frame rate di berbagai proses pengujian
  - Mengelola baseline dan mendeteksi regresi performa
- **Deteksi Memori dan Kebocoran**
  - Menggunakan instrument Leaks dalam proses pengujian; pemeriksaan weak reference capture
  - Menguji retain cycle pada closure, delegate, dan coordinator
- **Keandalan dan Jalur Error**
  - Fault injection: kegagalan jaringan, timeout, dan kondisi kosong
  - Mensimulasikan koneksi lambat dan tidak stabil dengan Network Link Conditioner
  - Integrasi crash reporting (Crashlytics, Sentry) dan symbolication
- **Praktik Laboratorium**: Tambahkan baseline performa untuk pipeline pemuatan gambar, tulis leak test untuk coordinator, dan simulasikan skenario kegagalan jaringan untuk memverifikasi penanganan error

### Modul 9: Cakupan Kode, Analisis Statis, dan Gerbang Kualitas CI (Minggu 9)

- **Cakupan Kode**
  - Mengumpulkan cakupan dengan `xcodebuild` dan membaca laporan Xcode
  - Menetapkan target cakupan yang menyeimbangkan usaha dan nilai
  - Mengidentifikasi cabang yang belum diuji dan kasus batas
- **Analisis Statis dan Gaya Kode**
  - Menerapkan SwiftLint dan `swift-format` di CI
  - Pemeriksaan konkurensi ketat dan bahasa mode Swift 6
  - Aturan kustom yang melarang API berbahaya
- **Pipeline Pengujian CI**
  - GitHub Actions untuk iOS: `xcodebuild`, `xcresulttool`, dan unggah artifact
  - Alur kerja Xcode Cloud dan laporan fastlane `scan`
  - Cache dependensi dan simulator untuk umpan balik cepat
- **Gerbang Kualitas dan Budaya Tim**
  - Job pengujian wajib, ambang cakupan, dan kebijakan merge
  - Laporan pengujian, dasbor flaky test, dan ruang karantina
- **Praktik Laboratorium**: Bangun alur kerja GitHub Actions yang menjalankan pengujian unit dan UI pada setiap pull request, mengunggah artifact `.xcresult`, menerapkan SwiftLint, dan menggagalkan build saat cakupan turun di bawah ambang

```yaml
name: iOS Tests
on: pull_request
jobs:
  test:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      - run: xcodebuild test -scheme App -destination 'platform=iOS Simulator,name=iPhone 16' -enableCodeCoverage YES
      - run: xcrun xcresulttool export attachments --path result.xcresult
        if: always()
```

### Modul 10: Kapstone — Rekayasa Kualitas untuk Aplikasi iOS Produksi (Minggu 10)

- **Cakupan Kapstone**
  - Aplikasi ukuran menengah yang disediakan dengan lapisan networking, state, dan UI yang belum diuji
  - Membangun pipeline rekayasa kualitas yang lengkap dari awal hingga akhir
- **Deliverable yang Diwajibkan**
  - Penyiapan test target, pengujian unit dengan double, dan migrasi Swift Testing
  - Fitur yang dibangun dengan TDD, rangkaian UI dan snapshot, serta baseline performa
  - Alur kerja CI dengan analisis statis, gerbang cakupan, dan unggah artifact
- **Menyajikan Hasil**
  - Dokumen strategi pengujian yang menjelaskan keputusan dan trade-off cakupan
  - Panduan menyeluruh atas pipeline akhir dan metrik kualitasnya
- **Praktik Laboratorium**: Integrasikan praktik sepuluh minggu ke dalam satu pipeline kualitas kelas produksi dan presentasikan hasilnya

## Proyek Akhir

Peserta harus menyerahkan penyiapan rekayasa kualitas kelas produksi untuk aplikasi iOS yang disediakan. Pengumpulan mencakup: dokumen strategi pengujian yang menjelaskan lapisan pengujian yang dipilih beserta trade-off-nya; pengujian unit yang mencakup logika bisnis dengan test double dan migrasi Swift Testing untuk setidaknya satu modul; fitur yang dibangun dengan TDD beserta pengujian regresinya; alur XCUITest untuk perjalanan pengguna utama dengan page object; baseline snapshot untuk komponen yang dapat digunakan ulang; baseline performa untuk startup dan satu pipeline inti; serta alur kerja CI yang menjalankan rangkaian lengkap, menegakkan analisis statis, dan gagal saat cakupan turun di bawah ambang yang disepakati. Repository harus build dan lulus seluruh pipeline-nya pada checkout yang bersih.

## Kriteria Penilaian

- **Tugas**: Setiap praktik laboratorium mingguan dinilai berdasarkan kualitas pengujian — assertion yang bermakna, penggunaan double yang tepat, perilaku yang deterministik, dan organisasi yang bersih. Lab harus lulus pada checkout baru, dan pengujian yang flaky atau berbasis sleep akan dikenakan penalti.
- **Proyek Akhir**: Proyek dievaluasi berdasarkan cakupan logika bisnis (target ≥ 80%), ketangguhan rangkaian UI dan snapshot, kelengkapan baseline performa, kebenaran gerbang kualitas CI, serta kejelasan dokumen strategi pengujian. Pipeline harus benar-benar gagal ketika regresi diperkenalkan, membuktikan bahwa gerbang berfungsi.

## Referensi

- Dokumentasi Apple: XCTest, framework Swift Testing, XCUITest, dan Xcode Cloud
- Dokumentasi Apple: Xcode Test Plans dan referensi `xcodebuild`
- Dokumentasi fastlane: `scan` dan pelaporan pengujian
- Dokumentasi GitHub Actions: alur kerja build iOS dan macOS
- Dokumentasi SwiftLint dan swift-format
- Dokumentasi iOSSnapshotTestCase (Uber)
- Point-Free: sumber daya pengujian dan dependency injection

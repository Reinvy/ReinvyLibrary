---
title: "Panduan Lokalisasi dan Internasionalisasi Swift"
description: "Panduan praktis untuk merilis aplikasi Swift dan SwiftUI dalam puluhan bahasa: String Catalog, variasi plural dan perangkat, pemformatan sadar-locale, cerminan layout untuk aksara kanan-ke-kiri, lokalisasi aset, pengujian pseudolocale, dan otomatisasi ekstraksi string di CI."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Lokalisasi dan Internasionalisasi Swift

## Pendahuluan

Internasionalisasi (i18n) adalah kerja rekayasa yang membuat aplikasi *dapat diterjemahkan*: tidak ada string yang di-hardcode, layout yang tetap utuh saat teks memanjang, tanggal dan angka yang mengikuti locale, serta mesin layout yang mencerminkan dirinya dengan benar untuk aksara kanan-ke-kiri. Lokalisasi (l10n) adalah kerja penerjemahan yang menyusul. Banyak tim melakukannya terbalik — mereka mencoba menempelkan terjemahan pada basis kode berorientasi bahasa Inggris, lalu berbulan-bulan berjuang melawan tombol terpotong, aturan plural yang rusak, dan layar pengaturan yang sama sekali tidak ada dalam bahasa Arab.

Panduan ini membahas sisi rekayasanya. Diasumsikan sudah ada aplikasi Swift atau SwiftUI, dan kita menelusuri jalur lengkapnya: mengaudit string yang di-hardcode, bermigrasi ke String Catalog, menambahkan variasi plural dan kesesuaian gramatikal, mengganti pemformatan manual dengan API `FormatStyle`, menangani layout kanan-ke-kiri, melokalkan aset dan metadata, serta mengotomatiskan ekstraksi dan validasi agar terjemahan tidak pernah melenceng dari kode.

Gagasan utamanya: aplikasi yang terlokalisasi hanya memiliki dua jenis string — **string tampilan**, yang selalu melewati sistem lokalisasi, dan **identifier**, yang tidak pernah melewatinya. Sebagian besar bug lokalisasi lahir dari kekeliruan membedakan keduanya: memasukkan string hasil terjemahan ke dalam kunci API, path URL, atau perbandingan.

## Praktik Terbaik

### 1. Eksternalkan Semua String yang Dilihat Pengguna Sejak Hari Pertama

Menambahkan lokalisasi belakangan jauh lebih mahal daripada memulainya sejak awal. Setiap string yang sampai ke layar — label, tombol, alert, empty state, label aksesibilitas, notifikasi, pesan error, bahkan menu developer — harus diselesaikan melalui sistem lokalisasi.

Aturan praktisnya: jika pengguna bisa membacanya, string itu harus berasal dari katalog. Literal `Text("Save")` aman karena SwiftUI memperlakukannya sebagai kunci lokalisasi, tetapi `"Save"` yang diteruskan ke API non-`LocalizedStringKey` tidak demikian. Auditlah literal mentah yang mengalir ke `.accessibilityLabel`, judul `UIAlertController`, properti `String` pada view model, dan nama event analytics yang ditampilkan ke pengguna.

### 2. Gunakan String Catalog sebagai Satu-satunya Sumber Kebenaran

String Catalog (`.xcstrings`, Xcode 15 ke atas) menggantikan pasangan warisan `.strings` dan `.stringsdict` dengan satu berkas JSON yang memuat kunci, terjemahan, variasi plural, variasi perangkat, komentar, dan status terjemahan. Berkas ini mudah di-diff, bisa di-merge dengan bersih di pull request, dan memungkinkan Xcode mengekstraksi string secara otomatis saat build.

Pertahankan tepat satu katalog per target, bukan tabel yang berserakan. Satu katalog membuat kebasian (staleness) terlihat jelas: apa pun yang bertanda *Needs Review* atau *New* adalah string yang belum diterjemahkan. Pelacakan status bawaan katalog ini menggantikan skrip buatan sendiri yang dulu harus ditulis terhadap berkas `.strings`.

### 3. Rancang Layout untuk Pemuaian Teks

Bahasa Inggris adalah salah satu bahasa paling ringkas di dunia. Kata majemuk bahasa Jerman rutin 30-40% lebih panjang, dan bahasa Finlandia serta Hungaria bisa menggandakan label pendek. Tombol yang dipaskan untuk "Save" akan terpotong pada "Speichern" dan hancur pada "Tallenna muutokset".

Rancang dengan mempertimbangkan pemuaian: utamakan lebar fleksibel dengan `Spacer` ketimbang frame tetap, biarkan label membungkus ke dua baris sebelum dipotong, hindari layout multi-kolom yang ukuran kolomnya ditentukan oleh string bahasa Inggris, dan sisakan sekitar 40% ruang cadangan untuk setiap kontrol satu baris berlebar tetap. Double-Length Pseudolanguage di preview Xcode adalah cara tercepat melihat kerusakannya sebelum penerjemah menemukannya.

### 4. Jangan Pernah Memformat Tanggal, Angka, atau Mata Uang Secara Manual

`String(format: "%d items")` menghasilkan `1234 items` — tanpa pemisah ribuan, tanpa digit khusus locale, dan tanpa pengelompokan yang benar untuk bahasa yang mengelompokkan per sepuluh ribu. Perakitan string manual untuk tanggal ("\(day)/\(month)/\(year)") lebih buruk lagi: ia mengubah makna secara diam-diam bagi pembaca Amerika Serikat (urutan bulan/hari).

Selalu gunakan format style yang disediakan Swift:

- `Date.now.formatted(date: .long, time: .shortened)` untuk tanggal yang dilihat pengguna
- `1234.5.formatted(.number.precision(.fractionLength(2)))` untuk angka
- `price.formatted(.currency(code: "EUR"))` untuk nilai uang
- `Measurement<UnitLength>` dengan `.formatted()` untuk satuan
- `ByteCountFormatStyle` untuk ukuran berkas dan transfer

API-API ini membaca locale aktif untuk pemisah, bentuk digit, urutan, dan penempatan mata uang, serta telah tercakup dalam uji kualitas lokalisasi Apple.

### 5. Modelkan Pluralisasi dan Kesesuaian Gramatikal Secara Eksplisit

Satu string "item(s)" gagal di sebagian besar bahasa. Bahasa Polandia punya empat kategori plural, bahasa Arab punya enam, dan bahasa Rusia membedakan "1", "2-4", serta "5+". Jangan implementasikan ini dengan percabangan `if count == 1` — aturannya tidak ada di kode Anda, melainkan di CLDR.

String Catalog mendukung variasi plural per bahasa, sehingga katalog menyimpan kategori yang benar untuk tiap locale sementara kode Anda hanya meneruskan jumlahnya. Serupa dengan itu, bahasa dengan gender gramatikal (Spanyol, Prancis, Jerman, Hindi) memerlukan kesesuaian antara adjektiva, artikel, dan nomina — modelkan ini sebagai kunci terpisah atau gunakan format specifier yang membawa nomina sebagai parameter, alih-alih menyambung potongan frasa.

### 6. Letakkan Dukungan Kanan-ke-Kiri di Lapisan Layout

Jangan mengkhususkan bahasa Arab atau Ibrani di kode view. Gunakan layout semantik di SwiftUI maupun UIKit dan biarkan arah teks menentukan hasilnya:

- Utamakan `leading` dan `trailing` ketimbang `left` dan `right` pada padding dan alignment SwiftUI
- Gunakan `leadingAnchor` dan `trailingAnchor` di Auto Layout, jangan `leftAnchor`
- Gunakan `.imageScale` dan `.flipsForRightToLeftLayoutDirection(true)` untuk ikon berdireksi
- Setel `semanticContentAttribute` pada view kustom yang memuat gambar berdireksi

Lalu verifikasi dengan menjalankan seluruh aplikasi memakai argumen `-AppleLanguages "(ar)"` atau dengan menyetel `.environment(\.layoutDirection, .rightToLeft)` di preview. Konten teks tidak boleh diurutkan ulang secara manual — mesin rendering yang menangani teks bidireksional; pengurutan ulang manual justru merusak string campuran Latin/Arab.

### 7. Pisahkan String Tampilan dari Identifier

Kelas bug lokalisasi yang paling merusak adalah memperlakukan string hasil terjemahan sebagai identifier. Contoh yang muncul di produksi:

- Judul tab yang terlokalisasi dipakai sebagai tag seleksi `TabView`
- Nama tampilan enum hasil terjemahan dipakai sebagai kunci dictionary atau nilai query API
- String pengurutan terlokalisasi dibandingkan untuk kesamaan guna menentukan perilaku
- URL atau path berkas yang dibangun dari segmen terlokalisasi

Beri setiap nilai domain sebuah identifier stabil yang tidak dilokalkan, plus string tampilan terpisah yang diselesaikan melalui katalog. Ini juga menjaga analytics tetap stabil lintas bahasa: event bernama `checkout_started` tidak boleh berubah menjadi `paiement_commence`.

### 8. Lokalkan Aset, Metadata, dan Notifikasi

String hanyalah sebagian permukaan. Lokalkan juga:

- **Asset catalog**: gambar yang memuat teks, ilustrasi dengan salinan tertanam, serta simbol mata uang atau bendera
- **String Info.plist**: melalui `InfoPlist.xcstrings`, yang mencakup prompt izin dan nama tampilan aplikasi
- **Metadata App Store**: daftar di toko itu sendiri, yang dikelola terpisah di App Store Connect
- **Notifikasi**: kunci payload push serta salinan notifikasi lokal terjadwal, termasuk judul aksi kategori yang diregistrasi saat peluncuran

Prompt izin perlu perhatian khusus: string izin kamera yang terdengar janggal dalam bahasa pengguna merupakan titik penurunan konversi yang terukur, dan termasuk salah satu string terakhir yang diingat untuk diterjemahkan.

### 9. Uji Pseudolocale dan Setiap Locale di CI

Kenali kegagalan layout dan encoding sebelum terjemahan asli ada. Pseudolocale mengganti karakter dengan versi beraksen dan memanjangkan panjang teks sehingga string yang belum terlokalisasi, pemotongan, dan pemformatan yang di-hardcode menjadi terlihat:

- **Pseudolanguage beraksen** (`en-XA`): aksen mengungkap string yang tidak pernah melewati sistem lokalisasi
- **Pseudolanguage panjang ganda**: mengungkap pemotongan dan asumsi lebar tetap
- **Pseudolanguage kanan-ke-kiri**: mengungkap celah cerminan layout

Jalankan setidaknya pseudolocale beraksen dan RTL pada rangkaian UI test, lalu tambahkan satu locale asli berstring panjang (Jerman) dan satu locale RTL asli (Arab) ke matriks smoke test.

### 10. Otomatiskan Ekstraksi String dan Pemeriksaan Kebasian

Terjemahan menjadi basi begitu seorang developer menyunting teks bahasa Inggris. Otomatisasi yang menjaga hal ini tetap jujur:

- Ekstraksi string pada setiap merge agar kunci baru muncul di katalog
- Gagalkan build ketika katalog memuat kunci yang belum diterjemahkan untuk locale yang sudah dirilis
- Ekspor berkas lokalisasi untuk penerjemah secara terjadwal (`xcodebuild -exportLocalizations`)
- Impor kembali terjemahan dan pastikan aplikasi tetap dapat dikompilasi

Perlakukan katalog sebagai keluaran yang ditinjau di pull request, bukan sebagai berkas yang hanya disunting lewat GUI yang cuma diketahui satu orang.

## Langkah Implementasi

### Langkah 1: Audit String yang Di-hardcode dan Aktifkan String Catalog

Mulai dengan mengukur besar masalahnya. Cari literal string yang diteruskan ke API tampilan, lalu aktifkan String Catalog untuk setiap target.

```bash
# Temukan literal string yang mengalir ke API UI umum
grep -RIn --include="*.swift" -E '\.(text|title|accessibilityLabel|placeholder)\s*=\s*"' Sources/ \
  | grep -v "LocalizedStringResource"
```

Pemindaian cepat terhadap literal `String` yang ditetapkan ke label memberi angka awal yang berguna. Apa pun yang ditemukan pemindaian adalah entitas yang butuh kunci lokalisasi, atau identifier yang butuh komentar penanda bahwa ia memang sengaja tidak dilokalkan.

Aktifkan katalog dari menu File Xcode (New File, String Catalog), atau dengan menambahkan berkasnya langsung ke resources target:

```text
Sources/
├── Resources/
│   └── Localizable.xcstrings     # satu katalog per target
├── Features/
│   └── Checkout/
└── App/
    └── MyApp.swift
```

Setelah build pertama, ekstraktor Apple mengisi katalog dengan setiap string yang dapat dilokalkan dan dapat diselesaikan secara statis. String yang tidak dapat diekstraksi — kunci dinamis yang dibangun saat runtime, atau string di resource non-Swift — harus ditambahkan secara manual.

### Langkah 2: Migrasikan Titik Pemanggilan SwiftUI dan UIKit

SwiftUI menyelesaikan literal string pada `Text`, `Label`, `Button`, dan `.navigationTitle` sebagai `LocalizedStringKey` secara otomatis, jadi sebagian besar migrasi justru berupa penghapusan akal-akalan, bukan penambahan pemanggilan.

```swift
import SwiftUI

struct CheckoutSummaryView: View {
    let itemCount: Int
    let total: Decimal

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // LocalizedStringKey: diselesaikan dari katalog saat render
            Text("Order summary", comment: "Section header on the checkout screen")

            // Jangan pernah menyisipkan angka ke dalam kunci; gunakan format specifier
            Text("^[\(itemCount) item](inflect: true)")

            // Mata uang sadar-locale, tanpa pemformatan manual
            Text(total.formatted(.currency(code: "USD")))
        }
    }
}
```

Bentuk `Text("^[\(itemCount) item](inflect: true)")` membiarkan sistem menerapkan aturan infleksi yang tersimpan pada variasi plural di katalog tanpa percabangan di kode. Untuk konteks di luar `Text` — view model, judul view controller, isi alert — gunakan `String(localized:)` secara eksplisit:

```swift
// View model yang mengembalikan string tampilan (bukan identifier)
var statusDescription: String {
    String(
        localized: "order.status.pending",
        defaultValue: "Awaiting payment",
        comment: "Order status shown in the order list"
    )
}

// UIKit
titleLabel.text = String(localized: "profile.title", defaultValue: "Profile")
navigationItem.title = String(localized: "profile.navigation.title", defaultValue: "Profile")
```

Perhatikan perbedaan maksudnya: kunci dengan prefiks stabil (`order.status.pending`) lebih mudah ditinjau secara massal, sementara memakai kalimat bahasa Inggris sebagai kunci lebih mudah untuk aplikasi kecil dan ekstraktor Xcode. Pilih satu konvensi per proyek dan tegakkan saat review — konvensi yang bercampur membuat diff terjemahan sulit dibaca.

### Langkah 3: Tambahkan Variasi Plural dan Format Specifier

Aturan plural berada di katalog, bukan di Swift. Pilih kunci di Xcode, aktifkan "Vary by Plural", dan editor akan menampilkan kategori CLDR yang benar untuk setiap bahasa.

```text
Key: order.items.count
  %lld items selected

English (one):      %lld item selected
English (other):    %lld items selected
Indonesian (other): %lld item dipilih
Polish (one):       %lld element wybrany
Polish (few):       %lld elementy wybrane
Polish (many):      %lld elementów wybranych
Arabic (zero):      لا توجد عناصر
Arabic (one):       عنصر واحد
Arabic (two):       عنصران
Arabic (few):       %lld عناصر
Arabic (many):      %lld عنصرًا
Arabic (other):     %lld عنصر
```

Titik pemanggilan yang cocok hanya meneruskan angkanya; katalog yang menyediakan pemilihan kategorinya:

```swift
Text("order.items.count \(selection.count)")
```

Beberapa aturan menjaga kunci plural tetap sehat seiring waktu:

- Jangan pernah menyambung potongan plural dengan string lain — infleksi nomina bergantung pada keseluruhan frasa
- Gunakan `%lld` untuk jumlah, bukan `%@` dengan angka yang sudah diformat, agar pengelompokan digit dikendalikan katalog
- Tambahkan kategori `zero` secara eksplisit untuk bahasa yang memerlukannya; jangan biarkan `other` menelannya diam-diam
- Pertahankan komentar pada kunci yang menjelaskan konteksnya, karena "items" di keranjang berbeda dari "items" di pengiriman

String Catalog juga mendukung "Vary by Device", yang berguna untuk string yang harus berbeda antara layout iPhone dan iPad — misalnya judul navigasi yang perlu ringkas pada lebar compact.

### Langkah 4: Ganti Pemformatan Manual dengan API FormatStyle

Setiap `String(format:)` manual untuk tanggal, angka, atau satuan adalah bug lokalisasi yang menunggu meledak. Gantikan dengan format style bertipe.

```swift
import Foundation

struct OrderPresenter {
    let locale: Locale

    func formattedTotal(_ amount: Decimal, currencyCode: String) -> String {
        amount.formatted(
            .currency(code: currencyCode)
                .locale(locale)
                .presentation(.narrow)
        )
    }

    func formattedShipDate(_ date: Date) -> String {
        date.formatted(
            .dateTime.weekday(.wide).month(.wide).day().locale(locale)
        )
    }

    func formattedFileSize(_ bytes: Int64) -> String {
        bytes.formatted(.byteCount(style: .file).locale(locale))
    }

    func formattedDistance(_ meters: Double) -> String {
        Measurement(value: meters, unit: UnitLength.meters)
            .formatted(.measurement(width: .abbreviated, usage: .road).locale(locale))
    }
}
```

Dua helper tambahan penting untuk ketepatan:

- **Tanggal relatif**: gunakan `RelativeDateTimeFormatter` atau `.relative(presentation:)` untuk "3 hari lalu", yang otomatis mempluralkan dan mengurutkan frasa sesuai locale.
- **Nama dan alamat**: gunakan `PersonNameComponentsFormatter` dan `CNPostalAddressFormatter` ketimbang merangkai "Belakang, Depan" — urutan nama dan tata letak alamat adalah properti locale, bukan preferensi pemformatan.

Ketika format tetap yang dapat dibaca mesin memang diperlukan (payload API, baris log, kunci cache), kunci locale-nya secara eksplisit alih-alih bergantung pada pengaturan pengguna:

```swift
let apiFormatter = DateFormatter()
apiFormatter.locale = Locale(identifier: "en_US_POSIX")
apiFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZ"
```

`en_US_POSIX` adalah locale tetap kanonis untuk format wire. Memakai `Locale.current` di sana adalah bug klasik: pengguna dengan pengaturan kalender Buddhis atau Jepang akan membuat serialisasi tahun yang berbeda dari yang diharapkan backend Anda.

### Langkah 5: Lokalkan Perilaku Pengurutan, Pencarian, dan Perbandingan

Perbandingan dan pengurutan tidak terlihat sampai pengguna menggulir daftar dan menemukan "Ångström" terarsip di bawah A di satu locale dan setelah Z di locale lain.

```swift
// Mengurutkan nama tampilan sesuai ekspektasi locale pengguna
let sorted = contacts.sorted {
    $0.displayName.localizedStandardCompare($1.displayName) == .orderedAscending
}

// Pencarian yang mengabaikan besar-kecil huruf dan diakritik sesuai locale
let matches = contacts.filter {
    $0.displayName.range(of: query, options: [.caseInsensitive, .diacriticInsensitive],
                         range: nil, locale: .current) != nil
}
```

Hindari `lowercased()` untuk perbandingan yang dilihat pengguna: huruf ı tanpa titik dalam bahasa Turki membuat `"I".lowercased()` bukan `"i"` pada locale Turki, dan `.lowercased()` tanpa locale menghasilkan hasil yang tidak konsisten untuk pencarian maupun pengurutan. Simpan `localizedCaseInsensitiveContains` di lapisan UI dan sisakan perbandingan string persis untuk identifier.

### Langkah 6: Bangun Layout Kanan-ke-Kiri yang Benar

Layout semantik, plus pemeriksaan eksplisit untuk gambar dan animasi berdireksi.

```swift
struct DirectionalChevron: View {
    var body: some View {
        Image(systemName: "chevron.forward")
            // SF Symbols yang memuat arah bercermin otomatis;
            // ini menegaskan maksudnya untuk aset kustom.
            .flipsForRightToLeftLayoutDirection(true)
    }
}

#Preview("Arabic, RTL") {
    CheckoutSummaryView(itemCount: 3, total: 42)
        .environment(\.locale, Locale(identifier: "ar_SA"))
        .environment(\.layoutDirection, .rightToLeft)
}
```

Tiga detail yang mudah terlewat:

- Progress bar, slider, dan chart dibaca dari kanan ke kiri; pastikan kode penggambaran kustom memakai layout direction dari environment, bukan perhitungan kiri-ke-kanan yang di-hardcode.
- Gestur yang menyiratkan arah (geser untuk menghapus, geser untuk kembali) harus mengikuti arah visual yang dicerminkan, yang memang ditangani UIKit untuk kontrol standar tetapi tidak untuk gesture recognizer kustom.
- Teks bidireksional yang mencampur nama merek Latin dengan kalimat Arab ditangani mesin teks — jangan pernah menyisipkan karakter kontrol arah untuk "memperbaiki" rendering, dan jangan pernah membalik string secara manual.

### Langkah 7: Lokalkan Aset, Info.plist, dan Pengalaman Peluncuran

Lokalisasi tingkat aset memakai varian terlokalisasi di dalam asset catalog, bukan salinan seluruh bundle dalam direktori `.lproj`.

```text
Assets.xcassets/
└── HeroImage.imageset/
    ├── Contents.json                 # merujuk varian terlokalisasi
    ├── HeroImage.png                 # varian default (base)
    └── HeroImage.ar.png              # varian terlokalisasi untuk bahasa Arab
```

Lalu tangani string yang tidak pernah melewati kode Swift:

```text
Resources/
├── InfoPlist.xcstrings    # prompt izin, nama tampilan aplikasi
└── Localizable.xcstrings  # katalog utama
```

Jaga nama tampilan aplikasi yang terlokalisasi tetap pendek — ia tampil di bawah ikon dengan ruang yang sempit bagi bahasa berstring panjang. Dan registrasikan kategori notifikasi dengan judul aksi terlokalisasi saat peluncuran, sebelum notifikasi apa pun bisa datang, agar judulnya sudah tersedia ketika sistem membutuhkannya.

### Langkah 8: Pratinjau dan Uji dengan Pseudolocale

Tambahkan jalannya pseudolocale ke preview maupun rangkaian test, agar regresi layout ditangkap otomatisasi dan bukan oleh penerjemah.

```bash
# Jalankan rangkaian UI test dengan memaksa pseudolocale dan locale RTL
xcodebuild test \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -testLanguage en-XA

xcodebuild test \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -testLanguage ar
```

Dukung dengan uji pemotongan tingkat piksel di tempat yang paling penting — tab bar, toolbar, dan kontrol berlebar tetap:

```swift
func testToolbarLabelsAreNotTruncatedInGerman() {
    let app = XCUIApplication()
    app.launchArguments += ["-AppleLanguages", "(de)", "-AppleLocale", "de_DE"]
    app.launch()

    let saveButton = app.buttons["common.action.save"]
    XCTAssertTrue(saveButton.waitForExistence(timeout: 5))
    XCTAssertFalse(saveButton.label.hasSuffix("…"),
                   "Save button label is truncated in German")
}
```

Memastikan label tidak berakhir dengan elipsis adalah pemeriksaan murah bersinyal tinggi. Perluas ke tiga atau empat kontrol yang secara historis paling dulu rusak.

### Langkah 9: Otomatiskan Ekstraksi dan Validasi di CI

Jadikan katalog sebagai artefak build yang diverifikasi, diekspor, dan diimpor ulang secara terjadwal.

```bash
#!/bin/bash
set -euo pipefail

# 1. Ekstraksi string dan perbarui katalog di tempat
xcodebuild -exportLocalizations \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -localizationPath ./build/localizations \
  -exportLanguage en

# 2. Gagalkan build jika locale yang dirilis punya kunci belum diterjemahkan
python3 scripts/check_localization_coverage.py \
  --catalog Sources/Resources/Localizable.xcstrings \
  --required-locales en,de,ar,ja \
  --min-coverage 1.0

# 3. Impor keluaran penerjemah dan build ulang
xcodebuild -importLocalizations \
  -project MyApp.xcodeproj \
  -localizationPath ./translations/incoming
```

Pemeriksa cakupan adalah skrip kecil atas JSON katalog: setiap kunci membawa dictionary `localizations` dan nilai `state` per unit seperti `translated`, `needs_review`, dan `new`. Menggagalkan build atas kunci `new` di locale yang sudah dirilis menangkap persis regresi yang biasanya terkirim sebagai string bahasa Inggris di build bahasa Jepang.

### Langkah 10: Rilis Locale Secara Bertahap

Rilis sebuah locale hanya ketika string, pemformatan, dan layout-nya sudah terverifikasi. Locale yang terlokalisasi sebagian lebih buruk daripada tidak ada lokalisasi sama sekali: pengguna melihat bahasa mereka di judul navigasi dan bahasa Inggris di pesan error.

Urutan yang bisa dipakai per locale:

1. Aktifkan locale dan biarkan katalog menunjukkan celah cakupan yang sebenarnya
2. Terjemahkan string navigasi tingkat atas dan onboarding lebih dulu
3. Verifikasi tiga alur dengan trafik tertinggi dari awal sampai akhir di locale tersebut
4. Pastikan rendering tanggal, mata uang, dan satuan dengan data nyata
5. Tambahkan locale itu ke matriks smoke test sebelum mengaktifkannya di daftar toko

Simpan daftar locale yang dirilis di manifes aplikasi, bukan hanya digerbangi preferensi pengguna; daftar itu adalah janji kualitas, dan seharusnya menyusut sebelum diam-diam memburuk.

## Kesimpulan

Lokalisasi adalah properti basis kode, bukan lapisan yang ditambahkan di akhir. Tiga kebiasaan yang membuat semuanya bekerja adalah: setiap string yang dilihat pengguna diselesaikan melalui katalog, setiap tanggal, angka, dan satuan melewati `FormatStyle`, dan setiap layout memakai arah semantik. Lengkapi dengan variasi plural yang tersimpan di katalog, jalannya pseudolocale di CI, serta pemeriksa cakupan otomatis yang menggagalkan build ketika locale yang dirilis punya kunci belum diterjemahkan — maka menambah bahasa baru menjadi tugas penerjemahan, bukan proyek rekayasa.

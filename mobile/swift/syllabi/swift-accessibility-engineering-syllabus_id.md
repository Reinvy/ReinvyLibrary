---
title: "Silabus Rekayasa Aksesibilitas Swift"
description: "Kurikulum lanjutan 10 minggu tentang merekayasa aksesibilitas ke dalam aplikasi iOS dengan Swift — accessibility tree, semantik, reflow Dynamic Type, fokus VoiceOver, input assistif, audit otomatis, gate CI, dan design system yang aksesibel dalam skala besar."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Aksesibilitas Swift

## Ringkasan

Silabus lanjutan 10 minggu ini dirancang untuk engineer iOS yang sudah mengirim fitur SwiftUI dan UIKit dan kini membutuhkan aksesibilitas sebagai bagian sistematis dari proses rekayasa, bukan pekerjaan bersih-bersih menjelang rilis. Jika materi pengantar berhenti pada "tambahkan accessibility label", kurikulum ini memperlakukan aksesibilitas sebagai disiplin rekayasa: Anda akan mempelajari bagaimana platform mengekspos antarmuka Anda sebagai pohon semantik, bagaimana membentuk pohon itu secara sengaja, bagaimana menjaga layout tetap utuh di seluruh rentang Dynamic Type, bagaimana merancang jalur fokus dan input assistif untuk alur yang kompleks, bagaimana membuat komponen hasil gambar sendiri dan gesture tetap terpakai tanpa penglihatan atau tanpa sentuhan, serta bagaimana menegakkan semuanya dengan audit otomatis dan gate CI sehingga regresi tidak pernah sampai ke pengguna.

Kurikulum ini sengaja disusun bertahap. Minggu 1 sampai 3 membangun model mental dan alat tingkat rendah — accessibility tree, modifier semantik, dan layout adaptif. Minggu 4 sampai 7 menangani lapisan interaksi yang tidak dapat dinilai alat otomatis untuk Anda: manajemen fokus, input assistif, preferensi warna dan gerak, alternatif media, serta komponen kustom. Minggu 8 sampai 10 mengubah keahlian menjadi proses: otomasi audit, pengujian sadar-aksesibilitas dalam integrasi berkelanjutan, dan kontrak design system tingkat komponen yang menjaga basis kode besar tetap aksesibel saat tumbuh. Proyek akhir meminta peserta membawa aplikasi yang sudah ada dari kondisi awal yang tidak diketahui menjadi kondisi terdokumentasi, terukur, dan terlindungi dari regresi — bentuk pekerjaan yang sama dengan yang diterima senior engineer di tim nyata.

## Kurikulum

### Modul 1: Aksesibilitas sebagai Disiplin Rekayasa (Minggu 1)

- **Mengapa aksesibilitas masuk ke definition of done**
  - Alasan produk, hukum, dan pemeliharaan: pengguna yang tereksklusi, regulasi aksesibilitas regional, dan biaya perbaikan di kemudian hari
  - Cacat aksesibilitas adalah cacat perangkat lunak: reproduksibilitas, tingkat keparahan, kepemilikan, dan risiko regresi
  - Tiga mode kegagalan — tidak terlihat oleh teknologi assistif, terekspos tetapi semantiknya salah, dan terekspos tetapi tidak terpakai
- **Model aksesibilitas platform**
  - Bagaimana sistem membangun accessibility tree dari hierarki view Anda dan mengapa pohon itu, bukan piksel, adalah antarmuka sebenarnya
  - Elemen, label, value, trait, hint, dan action sebagai kontrak yang Anda terbitkan ke teknologi assistif
  - Jarak antara hierarki visual dan hierarki semantik, serta mengapa keduanya sering tidak sepakat
- **Standar dan ekspektasi**
  - Kriteria sukses WCAG yang memetakan dengan jelas ke mobile native: kontras non-teks, name/role/value, urutan fokus, ukuran target, dan gerak
  - Ekspektasi platform versus batas minimum legal, dan cara menulis standar aksesibilitas internal yang benar-benar dapat diuji
- **Pengukuran baseline**
  - Menjalankan walkthrough VoiceOver pertama dengan screen curtain aktif dan mencatat setiap jalan buntu
  - Accessibility Inspector: audit, inspeksi, dan color contrast picker
  - Menyusun laporan baseline: layar yang diaudit, cacat yang ditemukan, keparahan, pemilik
- **Lab Praktik**: Audit tiga layar aplikasi contoh dengan VoiceOver dan Accessibility Inspector, lalu catat setiap temuan sebagai tiket yang dapat direproduksi beserta keparahan dan rekaman

### Modul 2: Semantik dan Accessibility Tree (Minggu 2)

- **Bagaimana view menjadi elemen**
  - Pembuatan elemen otomatis untuk kontrol standar dan titik di mana ia menurun diam-diam pada view tersusun
  - Container versus leaf: memilih antara mengekspos anak atau menggabungkannya menjadi satu elemen
  - Mengapa container tanpa label dibacakan kosong, dan mengapa penggabungan berlebihan merusak granularitas navigasi
- **Mendeklarasikan semantik di SwiftUI**
  - `accessibilityLabel`, `accessibilityValue`, dan `accessibilityHint` — apa yang masuk ke masing-masing dan apa yang tidak
  - Trait: `.isButton`, `.isHeader`, `.isSelected`, `.isImage`, `.isSummaryElement`, serta memperbarui trait sesuai state
  - Mengatur struktur dengan `.accessibilityElement(children:)` dan mengganti pohon visual dengan pohon semantik melalui `.accessibilityRepresentation`
- **Mendeklarasikan semantik di UIKit**
  - `isAccessibilityElement`, `accessibilityLabel`, `accessibilityTraits`, dan `UIAccessibilityCustomAction`
  - View container, `accessibilityElements`, dan pengurutan ketika urutan otomatis salah
- **Label yang bertahan terhadap lokalisasi dan state**
  - Menjaga label bebas dari kata jenis kontrol dan state agar tidak terjadi pengumuman ganda
  - Pluralisasi, gender gramatikal, dan bahasa RTL melalui String Catalogs
  - Menurunkan label dari data nyata, bukan menuliskan "button" atau "item" secara hardcode
- **Lab Praktik**: Rombak daftar kartu dan form dengan gaya kustom agar keduanya menerbitkan pohon yang benar, lalu verifikasi jumlah elemen, urutan, trait, dan pengumuman dengan VoiceOver dan Inspector

```swift
struct MeterCard: View {
    let label: String
    let reading: Double

    var body: some View {
        VStack(alignment: .leading) {
            Text(label).font(.headline)
            Text(reading, format: .number.precision(.fractionLength(1)))
                .font(.title2)
        }
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(label))
        .accessibilityValue(Text("\(reading, format: .number.precision(.fractionLength(1))) kilowatt"))
        .accessibilityAddTraits(.isStaticText)
    }
}
```

### Modul 3: Dynamic Type dan Reflow Layout (Minggu 3)

- **Skala tipografi sebagai batasan layout**
  - Text style bernama, ukuran relatif, dan mengapa ukuran point hardcode merusak skala
  - `@ScaledMetric` untuk spasi dan ukuran ikon yang harus ikut membesar bersama teks
  - Mendukung rentang penuh dari extra small sampai ukuran aksesibilitas, tempat font bisa membesar tiga kali lipat
- **Merancang layout yang mengalir ulang, bukan terpotong**
  - Penyebab umum: tinggi tetap, `lineLimit(1)`, baris berdampingan, dan gambar yang menumpuk teks
  - `ViewThatFits`, `AnyLayout`, dan beralih dari horizontal ke vertikal pada ukuran besar melalui `dynamicTypeSize`
  - Pola tombol dan baris multi-baris yang tetap dapat disentuh pada ukuran aksesibilitas
- **Mendeteksi pemotongan dan tumpang tindih**
  - Membaca `.dynamicTypeSize` dari environment dan menyesuaikan konten alih-alih menyembunyikannya
  - Verifikasi dengan panel Environment Overrides pada setiap langkah skala
  - Scrollability sebagai cadangan, dan kasus ketika scroll view justru jawaban yang salah
- **Lab Praktik**: Ubah dashboard dua kolom menjadi sepenuhnya terpakai pada ukuran aksesibilitas 5, dokumentasikan setiap keputusan layout, dan ambil perbandingan sebelum/sesudah

### Modul 4: Fokus, Navigasi, dan Input Assistif (Minggu 4)

- **Fokus VoiceOver sebagai state kelas satu**
  - Hubungan antara fokus visual, fokus aksesibilitas, dan identitas view
  - `@AccessibilityFocusState` untuk memindahkan fokus setelah navigasi, presentasi sheet, dan error validasi
  - Mengumumkan perubahan state asinkron dengan `AccessibilityNotification.Announcement` alih-alih memperbarui layar secara diam-diam
- **Struktur navigasi**
  - Heading sebagai jalur cepat melalui layar panjang, dan penggunaan rotor untuk melompat antar heading
  - Rotor kustom dan custom action yang mengekspos operasi sekunder tanpa memenuhi jalur utama
  - Kebenaran modal: penahanan fokus, gesture penutup, dan pemulihan fokus saat kembali
- **Input assistif di luar VoiceOver**
  - Voice Control: pemanggilan berbasis label, overlay bernomor, dan menjaga perintah suara tetap tidak ambigu
  - Switch Control dan Full Keyboard Access: elemen yang dapat difokus, penanganan tombol, dan indikator fokus yang terlihat
  - Ukuran target minimum dan biaya dari affordance yang hanya berupa gesture
- **Lab Praktik**: Buat alur checkout tiga langkah dapat dinavigasi hanya dengan VoiceOver, Voice Control, dan Full Keyboard Access — tanpa sentuhan langsung — lalu perbaiki setiap perangkap fokus yang ditemukan

```swift
struct CheckoutView: View {
    @AccessibilityFocusState private var focus: Field?
    @State private var cardNumber = ""
    @State private var error: String?

    enum Field: Hashable { case card, expiry }

    var body: some View {
        Form {
            TextField("Nomor kartu", text: $cardNumber)
                .accessibilityFocused($focus, equals: .card)
            TextField("Masa berlaku", text: .constant(""))
                .accessibilityFocused($focus, equals: .expiry)
            if let error {
                Text(error).foregroundStyle(.red)
            }
        }
        .onChange(of: error) { _, newValue in
            guard let newValue else { return }
            focus = .card
            AccessibilityNotification.Announcement(newValue).post()
        }
    }
}
```

### Modul 5: Warna, Kontras, dan Kesetaraan Non-Visual (Minggu 5)

- **Kontras yang tetap bertahan**
  - Ambang kontras teks dan non-teks, serta pengukurannya terhadap warna yang benar-benar dirender, bukan sekadar token desain
  - Warna semantik, latar elevated, dan material yang menggeser kontras di dark mode
  - Increase Contrast dan Reduce Transparency sebagai varian kelas satu, bukan tambahan belakangan
- **Jangan pernah hanya mengandalkan warna**
  - Status disampaikan melalui ikon, bentuk, teks, dan posisi secara bersamaan
  - Differentiate Without Color: pola, outline, dan badge teks untuk seri chart dan chip status
  - Tombol hanya-ikon: label untuk teknologi assistif dan affordance visual yang redundan bagi semua orang
- **Kesetaraan media**
  - Caption untuk video, transkrip untuk audio, dan teks alternatif yang menjelaskan tujuan, bukan penampilan
  - Menghormati audio description dan menurunkan audio latar selama konten bersuara
- **Lab Praktik**: Jalankan audit kontras pada tampilan terang, gelap, dan kontras tinggi aplikasi contoh, lalu perbaiki setiap kegagalan tanpa meratakan desain visualnya

### Modul 6: Gerak, Beban Kognitif, dan Alternatif Media (Minggu 6)

- **Preferensi gerak**
  - Reduce Motion dan perbedaan antara animasi dekoratif dan transisi yang komunikatif
  - Cadangan crossfade, override tingkat transaksi, dan menjaga perubahan state tetap terbaca tanpa pergerakan
  - Menghindari gerak yang berjalan otomatis dan parallax yang tidak dapat dimatikan
- **Aksesibilitas kognitif**
  - Navigasi yang dapat diprediksi, penempatan kontrol yang konsisten, dan menghindari perubahan konteks yang mengejutkan
  - Pencegahan error: konfirmasi untuk aksi destruktif, undo alih-alih peringatan, dan timeout yang longgar
  - Copy berbahasa sederhana, satu ide per layar, dan indikator progres yang menyatakan posisi pengguna
- **Aksesibilitas data dan chart**
  - Menjelaskan tren dan outlier dalam teks, bukan mengulang setiap nilai
  - Chart descriptor yang aksesibel agar teknologi assistif dapat menyajikan seri data sebagai audio atau ringkasan
  - Ringkasan untuk tabel padat dan daftar panjang, plus affordance lompat ke konten
- **Lab Praktik**: Tambahkan jalur Reduce Motion dan ringkasan aksesibilitas pada layar analitik beranimasi, lalu tulis copy deskriptif untuk dua chart dalam kedua bahasa yang didukung

### Modul 7: Komponen Kustom dan Gesture Lanjutan (Minggu 7)

- **Membuat konten hasil gambar tetap aksesibel**
  - Kapan mengekspos canvas sebagai satu elemen dan kapan memproyeksikan overlay semantik tersembunyi
  - `.accessibilityRepresentation` untuk menggantikan kontrol hasil gambar kustom dengan kontrol nyata
  - Menjaga overlay tetap sinkron dengan state visual tanpa menduplikasi sumber kebenaran
- **Gesture dengan padanan yang aksesibel**
  - Drag, swipe, pinch, dan long-press: selalu berpasangan dengan custom action atau kontrol Adjustable
  - Kontrak `adjustableAction` untuk stepper, slider, dan scrubber
  - Widget radar, gauge, dan timeline yang tetap terpakai tanpa sentuhan presisi
- **Umpan balik redundan**
  - Menggabungkan haptik, suara, dan pengumuman untuk konfirmasi tanpa pengumuman berlebihan
  - Debounce pengumuman pada permukaan yang diperbarui cepat seperti penghitung langsung
  - Memastikan tidak ada informasi penting yang hanya disampaikan lewat haptik atau suara
- **Lab Praktik**: Ubah papan drag-to-reorder dan scrubber kustom menjadi komponen yang bekerja dengan custom action VoiceOver dan Switch Control, lalu buktikan dengan walkthrough yang hanya memakai input assistif

### Modul 8: Audit Otomatis, Pengujian, dan Gate CI (Minggu 8)

- **API audit platform**
  - Audit aksesibilitas XCTest: pemeriksaan kontras, dynamic type, deteksi elemen, area sentuh, dan pemotongan teks
  - Membatasi audit pada layar yang bermakna dan memfilter temuan yang diketahui aman secara eksplisit
  - Audit Accessibility Inspector versus audit di dalam test: apa yang ditangkap masing-masing dan apa yang terlewat oleh keduanya
- **Cakupan test untuk kontrak semantik**
  - Menguji identifier, label, trait, dan value di UI test agar semantik tidak dapat mengalami regresi diam-diam
  - Memverifikasi perpindahan fokus dan pengumuman pasca-aksi dalam test otomatis
  - Snapshot test yang menyertakan varian ukuran aksesibilitas
- **Gagalkan build, bukan rilis**
  - Menyambungkan audit ke job CI dan menandainya sebagai required check
  - Aturan triase: ambang keparahan, waiver dengan masa berlaku, dan kepemilikan kegagalan
  - Melaporkan hasil di tempat engineer biasanya melihat, dengan tautan ke rekaman dan tangkapan layar
- **Lab Praktik**: Tambahkan rangkaian audit aksesibilitas ke pipeline CI aplikasi contoh, buat gagal pada regresi yang sengaja dimasukkan, lalu jadikan merge bergantung pada hasil hijau

```bash
xcodebuild test \
  -scheme SampleApp \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -only-testing:SampleAppUITests/AccessibilityAuditTests
```

### Modul 9: Design System Aksesibel dalam Skala Besar (Minggu 9)

- **Kontrak komponen**
  - Setiap komponen menerbitkan perilaku label, value, trait, dan action — didokumentasikan berdampingan dengan API visualnya
  - Merancang permukaan aksesibilitas lebih dulu: apa yang harus diumumkan komponen sebelum bagaimana ia terlihat
  - Mencegah komponen yang menerima label tetapi membuangnya di dalam
- **Token dan batasan**
  - Token tipografi, spasi, dan warna yang tidak dapat mengekspresikan kombinasi tidak aksesibel
  - Aturan lint dan preview yang gagal pada tinggi tetap, batas satu baris, dan state hanya-warna
  - Fixture dan preview aksesibilitas untuk teks besar, kontras tinggi, dan gerak tereduksi
- **Tata kelola yang bertahan terhadap pergantian tim**
  - Checklist review yang cukup singkat untuk benar-benar dipakai, plus definition of done yang menyebut aksesibilitas secara eksplisit
  - Pelatihan, champion per tim, dan backlog bersama untuk perbaikan lintas tim
  - Mengukur kemajuan: layar yang diaudit, cacat terbuka per keparahan, tingkat regresi, median waktu perbaikan
- **Lab Praktik**: Ekstrak tiga komponen aksesibel dari aplikasi ke modul bersama dengan kontrak terdokumentasi, preview untuk konfigurasi ekstrem, dan aturan lint yang memblokir regresi paling umum

### Modul 10: Proyek Akhir — Rekayasa Aksesibilitas untuk Aplikasi Produksi (Minggu 10)

- **Audit dan penetapan cakupan**
  - Memilih layar dan alur dengan nilai pengguna tertinggi dan kepadatan cacat terbesar
  - Menentukan standar yang akan dipegang rilis ini dan menuliskannya sebagai kriteria yang dapat diuji
- **Perbaikan pada basis kode nyata**
  - Mengurutkan perbaikan berdasarkan dampak pengguna, bukan kemudahan, dan mengelompokkan isu sistemik ke dalam pekerjaan komponen
  - Menangani permukaan UIKit legacy, SDK pihak ketiga, dan WebView yang tidak sepenuhnya Anda kendalikan
  - Mengomunikasikan trade-off dan keputusan produk kepada pemangku kepentingan non-teknis
- **Verifikasi dan serah terima**
  - Perlindungan regresi: audit mana, test mana, pass manual mana
  - Dokumentasi dan rencana pemeliharaan dengan pemilik yang jelas dan irama review
- **Lab Praktik**: Presentasikan audit proyek akhir, catatan perbaikan, gate CI yang ditambahkan, dan kondisi sebelum/sesudah yang terukur kepada dewan review simulasi

## Proyek Akhir

Peserta mengambil aplikasi iOS berbentuk produksi yang disediakan dengan utang aksesibilitas nyata — campuran SwiftUI dan UIKit, chart kustom, interaksi drag, alur onboarding, dan antarmuka yang baru sebagian dilokalisasi — lalu menjalankan siklus rekayasa aksesibilitas lengkap di atasnya.

Hasil kerja terdiri dari empat bagian. Pertama, baseline terukur: audit minimal delapan layar dan tiga alur ujung-ke-ujung pada VoiceOver, Voice Control, Switch Control, dan seluruh rentang Dynamic Type, dengan temuan diklasifikasikan menurut keparahan dan akar penyebab. Kedua, implementasi perbaikan: koreksi pohon semantik, layout adaptif yang bertahan pada ukuran teks aksesibilitas, manajemen fokus untuk navigasi dan error, dukungan preferensi warna dan gerak, serta padanan aksesibel untuk setiap gesture kustom. Ketiga, otomasi: rangkaian audit aksesibilitas XCTest plus test kontrak semantik yang tersambung ke integrasi berkelanjutan sebagai required check. Keempat, paket serah terima: kontrak aksesibilitas tingkat komponen untuk design system bersama, adendum definition of done, dan laporan tertulis singkat yang menunjukkan metrik mana yang bergerak.

Penilaian mengutamakan perbaikan akar masalah dibanding tambalan per layar — mengganti tinggi hardcode pada komponen baris bersama bernilai lebih tinggi daripada menyesuaikan dua puluh layar satu per satu, dan aturan lint yang mencegah satu kelas cacat bernilai lebih tinggi daripada perbaikan tunggal mana pun.

## Kriteria Penilaian

- **Lab praktik mingguan (30%)**: Setiap lab dinilai berdasarkan apakah jalur teknologi assistif yang dinyatakan benar-benar bekerja ujung-ke-ujung, apakah pohon semantik disusun secara sengaja dan bukan kebetulan, serta apakah temuan dicatat secara reproducible dengan keparahan dan bukti.
- **Audit aksesibilitas tengah kurikulum (20%)**: Audit terstruktur atas lima layar yang diserahkan pada akhir Minggu 5, dinilai berdasarkan cakupan lintas modalitas, akurasi klasifikasi keparahan, dan kualitas rencana perbaikan tertulis.
- **Proyek akhir (40%)**: Dinilai berdasarkan peningkatan yang terukur dari baseline, perbaikan akar masalah pada isu sistemik, perlindungan regresi di CI, dan kejelasan dokumentasi serah terima. Proyek akhir yang memperbaiki banyak layar tetapi membiarkan komponen bersama tetap rusak dibatasi pada nilai lulus.
- **Kualitas kode dan review (10%)**: Penamaan semantik, tidak adanya logika aksesibilitas yang terduplikasi, label yang terlokalisasi, dan partisipasi review — termasuk kualitas umpan balik yang diberikan atas temuan aksesibilitas rekan.

## Referensi

- Apple Human Interface Guidelines — Accessibility: <https://developer.apple.com/design/human-interface-guidelines/accessibility>
- Dokumentasi Accessibility Apple Developer: <https://developer.apple.com/accessibility/>
- Referensi modifier aksesibilitas SwiftUI: <https://developer.apple.com/documentation/swiftui/view-accessibility>
- Panduan aksesibilitas UIKit: <https://developer.apple.com/documentation/uikit/accessibility-for-uikit>
- Panduan pengguna Accessibility Inspector: <https://developer.apple.com/documentation/accessibility/inspector>
- Menulis audit aksesibilitas dengan XCTest: <https://developer.apple.com/documentation/xctest/performing_accessibility_audits>
- Web Content Accessibility Guidelines (WCAG) 2.2: <https://www.w3.org/TR/WCAG22/>
- Panduan aksesibilitas mobile dari Web Accessibility Initiative: <https://www.w3.org/WAI/standards-guidelines/mobile/>

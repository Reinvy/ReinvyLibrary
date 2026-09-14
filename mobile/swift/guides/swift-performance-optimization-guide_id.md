---
title: "Panduan Optimalisasi Performa Swift"
description: "Panduan praktis berbasis pengukuran untuk mengoptimalkan performa aplikasi Swift dan iOS: profiling Instruments dan baseline XCTMetric, pemilihan koleksi dan algoritma, semantik copy-on-write, pengurangan beban ARC, efisiensi body SwiftUI, caching dengan anggaran, penurunan resolusi gambar, waktu peluncuran, dan efisiensi energi."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Optimalisasi Performa Swift

## Pendahuluan

Pengguna merasakan performa secara subjektif: scroll yang tersendat, peluncuran yang lambat, baterai yang cepat habis. Pengukuran objektif untuk semua itu ada, tetapi sebagian besar upaya optimalisasi sia-sia ketika menyasar kode yang sebenarnya tidak lambat. Panduan ini mengambil pendekatan berbasis pengukuran untuk performa Swift dan iOS: tetapkan baseline, buat profil untuk menemukan hot path yang sesungguhnya, terapkan optimalisasi yang tepat sasaran, dan kunci perbaikannya dengan tes regresi otomatis.

Optimalisasi yang dibahas di sini terbagi dalam lima lapisan yang saling berinteraksi:

- **Efisiensi algoritmik**: memilih koleksi dan algoritma yang tepat, yang dapat mengubah jalur O(n²) menjadi O(n) — biasanya satu-satunya kemenangan terbesar yang tersedia.
- **Semantik nilai dan memori**: menjaga jaminan copy-on-write, mengurangi lalu lintas reference counting, dan menghindari salinan tersembunyi.
- **Rendering**: menjaga body view SwiftUI tetap murah agar mesin diffing dapat bekerja, dan memindahkan gambar berat keluar dari pohon view.
- **Data dan jaringan**: caching dengan anggaran eksplisit, menurunkan resolusi gambar sebelum decode, dan menggunakan kembali koneksi.
- **Peluncuran dan energi**: memangkas kerja yang menghambat frame pertama dan merancang kerja latar yang menghormati baterai.

Prinsip panduan di seluruh dokumen ini sederhana: **ukur dulu, optimalkan setelahnya, dan buktikan peningkatannya**. Setiap rekomendasi dalam panduan ini dipasangkan dengan cara mengukurnya, karena optimalisasi yang tidak bisa diukur adalah regresi yang tidak bisa dideteksi. Di platform Apple, build Release menggunakan `-O` whole-module optimization sementara build Debug menggunakan `-Onone` — jadi selalu benchmark konfigurasi Release di perangkat fisik: simulator memiliki profil CPU dan memori yang berbeda, dan angka Debug tidak memberi tahu apa pun tentang perilaku produksi.

## Praktik Terbaik

### Ukur Sebelum Mengoptimalkan

Buat profil di perangkat fisik menggunakan konfigurasi Release, dan bentuk hipotesis tentang ke mana waktu dihabiskan sebelum mengubah kode. Aturan 80/20 berlaku sangat keras pada kode iOS: segelintir fungsi biasanya menyumbang hampir seluruh waktu CPU di sebuah layar. Time Profiler di Instruments mengambil sampel call stack pada frekuensi tinggi dan memeringkat fungsi berdasarkan self time dan total time — mulai dari sana, bukan dari membaca kode.

Dua alat pengukuran yang saling melengkapi mencakup sebagian besar kebutuhan:

- **Instruments** untuk eksplorasi interaktif: Time Profiler untuk CPU, Allocations untuk pertumbuhan memori, Leaks untuk retain cycle, dan Energy Log untuk dampak baterai.
- **Metrik performa XCTest** untuk pengukuran otomatis yang dapat diulang: `XCTClockMetric` untuk waktu berjalan dan `XCTMemoryMetric` untuk puncak memori, direkam lewat `measure(metrics:)`.

Instrumentasi khusus dengan `os_signpost` mengisi celah di antara keduanya — ia menandai awal dan akhir interval bernama yang langsung muncul di track Points of Interest pada Instruments, sehingga Anda dapat mengukur operasi tertentu (decode gambar, parse JSON, kueri basis data) di dalam alur pengguna yang nyata tanpa menebak-nebak:

```swift
import os.signpost

let perfLog = OSLog(subsystem: "com.example.app", category: .pointsOfInterest)

func parseCatalog(_ data: Data) throws -> [Product] {
    let id = OSSignpostID(log: perfLog)
    os_signpost(.begin, log: perfLog, name: "parse-catalog", signpostID: id)
    defer { os_signpost(.end, log: perfLog, name: "parse-catalog", signpostID: id) }
    return try decoder.decode([Product].self, from: data)
}
```

Aturan praktis untuk memprioritaskan: jika sebuah fungsi menghabiskan kurang dari 1% total waktu CPU pada Time Profiler, hampir tidak pernah layak dioptimalkan. Temukan tiga frame teratas lebih dulu; semua hal lain hanyalah kebisingan sampai ketiganya diperbaiki.

### Pilih Koleksi dan Algoritma yang Tepat

Koleksi pustaka standar Swift memiliki karakteristik kompleksitas yang sangat berbeda, dan memilih yang salah adalah sumber paling umum dari perilaku O(n²) yang tidak disengaja:

| Koleksi | Akses tipikal | Pemeriksaan keanggotaan | Sisip/append |
|---------|---------------|------------------------|--------------|
| `Array` | O(1) menurut indeks | O(n) `contains` | O(1) di akhir, O(n) di indeks 0 |
| `Set`   | —             | O(1) rata-rata          | O(1) rata-rata (rehash teramortisasi) |
| `Dictionary` | O(1) menurut kunci | O(1) menurut kunci | O(1) rata-rata |
| `ContiguousArray` | O(1) menurut indeks | O(n) `contains` | O(1) di akhir |

Jebakan klasiknya adalah pemeriksaan keanggotaan di dalam loop: `users.filter { blockedIDs.contains($0.id) }` menjalankan `contains` — pemindaian O(n) — untuk setiap pengguna, sehingga seluruh operasi menjadi O(n·m). Mengonversi daftar blokir menjadi `Set` lebih dulu menurunkannya menjadi O(n + m). Pola yang sama muncul dengan `firstIndex(of:)` di dalam loop, pemindaian `removeAll(where:)`, dan loop bersarang di atas data yang sama — setiap kali Anda mencari sesuatu berulang kali, jadikan hash sekali.

Untuk array, perhatikan posisi mutasi: menyisip di depan (`insert(_:at: 0)`) adalah O(n) karena setiap elemen bergeser; append adalah O(1) teramortisasi. Jika Anda membangun daftar dalam urutan terbalik dan membutuhkannya dalam urutan maju, lakukan append lalu `reverse()` sekali di akhir. `filter` mengalokasikan array baru — untuk koleksi panas yang besar, `removeAll(where:)` in-place menghindari alokasi tersebut.

### Pertahankan Jaminan Copy-on-Write

`Array`, `Dictionary`, `Set`, dan `String` adalah tipe nilai yang dibacking penyimpanan referensi dengan implementasi copy-on-write (COW): menetapkan atau meneruskannya adalah kenaikan referensi O(1), dan buffer yang mendasarinya hanya diduplikasi ketika terjadi mutasi. Selama tidak ada mutasi, salinan pada dasarnya gratis — jadi musuhnya bukan meneruskan nilai, melainkan **memutasi buffer bersama secara tidak perlu**.

Pembunuh COW yang paling umum:

- Memutasi nilai yang baru saja disalin, padahal salinan itu dibuat untuk pembacaan yang tidak pernah terjadi.
- Memanggil fungsi `mutating` (atau operator mutasi seperti `+=` pada array) pada nilai yang berumur panjang di dalam loop, memaksa salinan buffer penuh pada setiap iterasi.
- Tipe nilai buatan sendiri yang disokong referensi dan menyalin penyimpanannya di setiap titik mutasi tanpa memeriksa keunikan lebih dulu.

Untuk tipe COW buatan sendiri, periksa keunikan sebelum menyalin. `isKnownUniquelyReferenced(_:)` memberi tahu Anda apakah referensi pendukung dimiliki secara eksklusif; jika ya, mutasi di tempat:

```swift
final class Storage<Value> {
    var value: Value
    init(_ value: Value) { self.value = value }
}

struct Vector {
    private var storage: Storage<[Double]>

    init(_ values: [Double]) {
        storage = Storage(values)
    }

    mutating func append(_ element: Double) {
        if !isKnownUniquelyReferenced(&storage) {
            storage = Storage(storage.value)   // salin hanya saat dibagi
        }
        storage.value.append(element)
    }
}
```

Cara cepat menemukan salinan tersembunyi: pada template Allocations di Instruments, urutkan menurut "Size" dan cari alokasi `_ArrayBuffer` / `_ContiguousArrayBuffer` yang bertambah selama loop panas. Jika ukuran buffer mengikuti durasi loop, COW sedang dikalahkan.

### Kurangi Lalu Lintas ARC pada Hot Path

Automatic Reference Counting menjaga instance kelas tetap hidup dengan menaikkan dan menurunkan retain count pada setiap penugasan referensi kuat dan keluar dari scope. Untuk objek kecil yang sering dibuat, lalu lintas retain/release dapat mendominasi kerja yang sesungguhnya — inilah sebabnya model nilai kecil (sebuah `Point`, `OrderLine`, warna) sebaiknya berupa `struct`: sama sekali tidak membawa overhead reference counting.

Ketika tipe referensi tidak bisa dihindari, kurangi lalu lintasnya:

- Capture list: setiap closure yang menangkap objek secara kuat memperpanjang umurnya. Gunakan `[weak self]` (atau `[unowned self]` ketika Anda dapat membuktikan closure tidak akan hidup lebih lama dari `self`) sehingga penangkapan tidak memaksa pergantian retain/release dan tidak membuat retain cycle:

```swift
timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
    self?.refreshBadge()
}
```

- Utamakan struktur yang tidak berubah di dalam loop. Loop yang berulang kali menetapkan properti kelas membayar retain/release per iterasi; nilai lokal yang dihitung sekali dan ditetapkan sekali tidak.
- Sadari bahwa `Array` berisi instance kelas menaikkan retain count setiap elemen ketika array disalin (penyalinan buffer berjalan menyusuri elemen). Jika Anda memegang array referensi besar secara read-only di tempat yang stabil, jadikan `let` sekali dan teruskan, jangan membangunnya ulang.
- Gunakan `withExtendedLifetime(_:_:)` ketika Anda memegang referensi yang tidak diretensi (pointer unsafe, interop `unowned`) dan perlu menjamin objek tetap hidup untuk operasi dalam scope.

Struct juga berkomposisi lebih baik dengan semantik nilai: model `struct` dengan properti `let` dapat disalin, di-cache, dan di-diff dengan mudah — optimalisasi `Equatable` SwiftUI pada bagian berikutnya bergantung persis pada hal ini.

### Jaga Body View SwiftUI Tetap Murah

SwiftUI melakukan diff pada pohon view: setiap kali state yang diandalkan sebuah view berubah, `body`-nya dievaluasi ulang dan hasilnya dibandingkan dengan evaluasi sebelumnya untuk menghasilkan pembaruan seminimal mungkin. Karena itu model biayanya adalah **komputasi body adalah biaya rendering**. Tiga aturan berikut berlaku:

1. **Jangan mengerjakan kerja nyata di dalam `body`**. Pemformatan, decoding, dan pengambilan data termasuk properti tersimpan, view model, atau modifier `task` — jangan pernah inline di `body` yang dikomputasi. Jika `body` menjalankan kueri basis data atau parse JSON, ia berjalan pada setiap perubahan state.
2. **Buat diff subpohon murah dengan `Equatable` dan `equatable()`**. Dua view dengan nilai identik seharusnya tidak dievaluasi ulang `body`-nya sama sekali. Jadikan view daun konform `Equatable` (model struct ber-semantik nilai membuat ini sepele) dan terapkan `.equatable()` di titik pemakaian pada induk:

```swift
struct ProductRow: View, Equatable {
    let product: Product

    var body: some View {
        HStack {
            ProductThumbnail(url: product.imageURL)
            VStack(alignment: .leading) {
                Text(product.name).font(.headline)
                Text(product.price.formatted(.currency(code: "USD")))
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// Di List milik induk:
ForEach(viewModel.products) { product in
    ProductRow(product: product).equatable()
}
```

1. **Gunakan kontainer lazy dan rendering khusus untuk konten mahal**. `LazyVStack` / `LazyHStack` (dan `LazyVGrid`) membuat instance view anak hanya ketika tergulir ke tampilan — gunakan untuk daftar yang lebih panjang dari satu layar. Untuk bentuk kompleks, gradien, blur, dan konten berlapis, `.drawingGroup()` mengompositkan subpohon menjadi satu renderer di luar layar, menukar rasterisasi sekali dengan kompositing GPU yang cepat:

```swift
ZStack {
    Circle().fill(AngularGradient(colors: [.orange, .pink, .purple], center: .center))
    Image(systemName: "sparkles").font(.system(size: 48)).foregroundStyle(.white)
}
.frame(width: 160, height: 160)
.drawingGroup()
```

Untuk konten yang sepenuhnya imperatif (grafik, efek partikel, aplikasi menggambar), `Canvas` mem-bypass diff pohon view sepenuhnya dan menggambar langsung ke graphics context — alat yang tepat ketika konten berubah lebih cepat daripada hierarki view dapat di-diff secara berguna.

### Cache dengan Anggaran

Caching mengubah kerja mahal yang berulang menjadi satu kali lintasan yang mahal. Di Swift, `NSCache` adalah default yang tepat untuk cache objek: tidak seperti `Dictionary`, ia aman untuk thread, dan melakukan eviction otomatis di bawah tekanan memori selama Anda memberikan batas biaya dan jumlah. Cache tanpa anggaran adalah kebocoran memori dengan niat baik — selalu tetapkan batas dan berikan biaya saat menyisipkan:

```swift
final class ImageCache {
    static let shared = ImageCache()

    private let cache: NSCache<NSString, UIImage> = {
        let cache = NSCache<NSString, UIImage>()
        cache.totalCostLimit = 50 * 1024 * 1024      // 50 MB piksel ter-decode
        cache.countLimit = 200
        return cache
    }()

    func image(forKey key: String) -> UIImage? {
        cache.object(forKey: key as NSString)
    }

    func setImage(_ image: UIImage, forKey key: String) {
        let cost = Int(image.size.width * image.size.height * 4)  // byte buffer piksel
        cache.setObject(image, forKey: key as NSString, cost: cost)
    }
}
```

Untuk respons HTTP, `URLCache` (dipakai bersama oleh `URLSession`) menyediakan cache on-disk dengan header cache HTTP (`ETag`, `Cache-Control`) yang mengerjakan invalidasi untuk Anda. Tuning secara eksplisit daripada mengandalkan default:

```swift
let urlCache = URLCache(memoryCapacity: 20 * 1024 * 1024, diskCapacity: 100 * 1024 * 1024)
URLCache.shared = urlCache
```

Bersihkan cache pada `didReceiveMemoryWarning` hanya untuk bagian yang dapat dibangun ulang dengan murah — `NSCache` sudah menangani ini secara otomatis, jadi cadangkan pembersihan manual untuk data turunan besar dalam memori.

### Turunkan Resolusi dan Decode Gambar Sebelum Ditampilkan

Gambar ter-decode memakai `lebar × tinggi × 4` byte di memori. Foto 4000×3000 ter-decode menjadi 48 MB; jika ditampilkan sebagai thumbnail 200×150, 99% memori dan waktu decode-nya terbuang. ImageIO dapat membuat thumbnail langsung dari data terkompresi — ia hanya membaca sebanyak yang diperlukan dari file dan mendecode pada ukuran target. Ini adalah satu-satunya optimalisasi memori paling efektif untuk aplikasi yang sarat gambar:

```swift
import ImageIO

func downsampleImage(at url: URL, maxPixelSize: Int) -> UIImage? {
    let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let source = CGImageSourceCreateWithURL(url as CFURL, sourceOptions) else {
        return nil
    }
    let options = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maxPixelSize
    ] as CFDictionary
    guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options) else {
        return nil
    }
    return UIImage(cgImage: cgImage)
}
```

Berikan ukuran tampilan dalam poin dikali skala layar sebagai `maxPixelSize` (thumbnail sekitar 400 px untuk sel 200 poin pada 2x), jalankan panggilan di luar thread utama, dan simpan thumbnail yang dihasilkan (jangan pernah gambar ukuran penuh) ke `NSCache` Anda. Hindari `UIImage(contentsOfFile:)` dan `UIImage(named:)` untuk aset besar — keduanya mendecode pada resolusi penuh seketika; utamakan downsampling ImageIO untuk apa pun yang lebih besar dari area tampilan.

### Optimalkan Waktu Peluncuran Aplikasi

Peluncuran adalah anggaran keras yang terlihat pengguna: aplikasi harus merender frame pertamanya dalam satu atau dua detik pada perangkat modern, dan tinjauan App Store serta pengguna sama-sama menghukum start yang lambat. Peluncuran terdiri dari memuat eksekutabel dan pustaka dinamisnya (`dyld`), menjalankan initializer global dan `main`, lalu membangun layar pertama. Tuas utamanya:

- **Lebih sedikit pustaka dinamis**: masing-masing menambah waktu muat — `DYLD_PRINT_STATISTICS=1` (diatur di environment variable skema) mencetak rincian waktu muat per pustaka saat peluncuran. Gunakan framework dengan bijak, utamakan static linking untuk modul internal, dan pertimbangkan menggabungkan framework kecil.
- **Tanpa kerja di inisialisasi global**: initializer `let`/`var` di level teratas dan efek samping bergaya `+load` berjalan sebelum `main`. Jaga state global tetap lazy — misalnya `static let shared = ...` untuk singleton, atau `lazy var` — sehingga tidak ada yang mahal berjalan sampai digunakan pertama kali.
- **Tunda yang tidak menghalangi frame pertama**: logika bisnis, prewarming cache, dan analitik dapat pindah ke latar belakang. Pola umumnya adalah memulai task berprioritas rendah yang melakukan prewarm cache yang dibutuhkan layar pertama:

```swift
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Hanya setup sinkron yang benar-benar wajib di sini (crash reporter, init analitik).
    Task.detached(priority: .utility) {
        await CacheWarmer.prewarm()
    }
    return true
}
```

Ukur peluncuran dengan trace `Launch` atau dengan mengatur environment variable bertipe `_DYLD_PRINT_STATISTICS`, dan periksa ulang setelah setiap penambahan dependensi — dependensi menumbuhkan waktu peluncuran secara diam-diam.

### Rancang untuk Efisiensi Energi

Baterai cepat habis adalah masalah performa: pengguna mencopot aplikasi yang menghabiskan daya saat layar menyala. Model biaya energinya berbeda dari waktu CPU — biaya terbesar adalah aktivitas radio (seluler), tampilan, dan wakeup CPU paksa dari timer. Praktik yang menghormati baterai:

- **Gabungkan dan kelompokkan kerja**: daripada banyak permintaan kecil, lakukan batching — radio membakar daya paling besar saat membangun/mematikan koneksi, bukan saat mentransfer.
- **Utamakan push daripada polling**: refresh aplikasi di latar belakang harus dijadwalkan dengan `BGAppRefreshTask` / `BGProcessingTask` (yang dikelompokkan sistem ke dalam jendela efisien) daripada `Timer` berulang:

```swift
let request = BGAppRefreshTaskRequest(identifier: "com.example.app.refresh")
request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
try BGTaskScheduler.shared.submit(request)
```

- **Hindari timer rapat dan churn animasi**: timer berulang 0,1 detik memaksa CPU bangun puluhan kali per detik. `CADisplayLink` hanya untuk konten yang benar-benar berubah per frame; pertimbangkan `Timer` dengan interval yang lebih masuk akal dan penjadwalan sekali jalan.
- **Hormati Low Power Mode dan state latar**: jeda kerja non-esensial di `sceneDidEnterBackground`, hentikan pembaruan lokasi ketika pengguna diam, dan gunakan `ProcessInfo.processInfo.isLowPowerModeEnabled` untuk menonaktifkan kerja opsional.

## Langkah Implementasi

### Langkah 1: Tetapkan Baseline dengan XCTMetric

Sebelum mengubah apa pun, tulis tes performa yang mengukur perilaku saat ini dengan metrik yang Anda pedulikan. `measure(metrics:)` menjalankan blok berulang kali dan merekam statistiknya:

```swift
final class OrderAggregationPerformanceTests: XCTestCase {
    func testAggregateTenThousandOrders() throws {
        let orders = makeSampleOrders(count: 10_000)
        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
            _ = OrderAggregator.aggregatePerCustomer(orders)
        }
    }
}
```

Jalankan ini pada konfigurasi Release di perangkat, catat baseline (waktu jam `Average` dan `Peak Memory`), dan commit tesnya. Baseline ini adalah angka yang harus dikalahkan setiap optimalisasi berikutnya — dan tes yang sama, dengan ambang yang lebih longgar, menjadi gerbang regresi pada Langkah 9.

### Langkah 2: Buat Profil Hot Path dengan Instruments

Buka Instruments (Product ▸ Profile) di perangkat, pilih template **Time Profiler**, dan rekam alur pengguna nyata melalui layar yang ingin Anda optimalkan — scroll, memuat, memfilter. Lalu:

1. Hentikan perekaman dan urutkan daftar simbol menurut **Self Time** (menurun).
1. Identifikasi tiga frame teratas: itulah target optimalisasi Anda.
1. Buka call tree dan perluas frame yang bersalah untuk menemukan kode *Anda* (bukan framework sistem) yang memanggilnya.

Temuan yang khas: pasangan `filter`/`contains` atau decode JSON dari payload yang seharusnya lebih kecil. Tuliskan fungsi-fungsi tersebut beserta persentase self time-nya — Anda akan membuat profil ulang setelah setiap perubahan untuk mengonfirmasi bahwa peningkatan itu menurunkan posisinya dalam daftar.

### Langkah 3: Ganti Algoritma dan Koleksi yang Tidak Efisien

Terapkan perbaikan kompleksitas dari Praktik Terbaik 2 pada hot path yang teridentifikasi. Perbaikan buku teks — pemeriksaan keanggotaan yang diubah menjadi pencarian `Set` — juga yang paling umum:

```swift
// Sebelum: O(n·m) — contains memindai blockedIDs untuk setiap pengguna
let blockedIDs: [Int] = loadBlockedIDs()
let visible = users.filter { !blockedIDs.contains($0.id) }

// Sesudah: O(n + m) — bangun hash set sekali
let blockedSet = Set(loadBlockedIDs())
let visible = users.filter { !blockedSet.contains($0.id) }
```

Pertukaran berdaya hasil tinggi lain: `firstIndex(of:)` dalam loop → `Dictionary` yang dikunci oleh properti yang dicari; pembangunan dengan `insert(_:at: 0)` → akumulasi dengan `append` lalu `reverse()`; beberapa kali lintasan `filter` pada array yang sama → satu lintasan dengan predikat gabungan. Jalankan ulang tes baseline Langkah 1 setelah setiap perubahan — pertukaran yang tidak menggerakkan metrik berarti bukan itu masalahnya.

### Langkah 4: Lindungi Efisiensi Copy-on-Write

Audit hot path untuk mutasi nilai yang dibagikan. Pemeriksaan paling bernilai adalah `isKnownUniquelyReferenced` pada kontainer COW buatan sendiri (contoh `Vector` di Praktik Terbaik 3), dan yang paling sering terjadi adalah loop yang memutasi array yang diteruskan ke sana:

```swift
// Sebelum: append ke array bersama dapat menyalin seluruh buffer per titik panggil
func collectIDs(_ ids: inout [Int], from batch: [Int]) {
    ids.append(contentsOf: batch)   // append teramortisasi O(1), tetapi periksa titik panggil
}

// Sesudah: alokasikan sekali, dan biarkan pemanggil memiliki buffer
func collectIDs(ids: [Int], from batch: [Int]) -> [Int] {
    var result = ids
    result.reserveCapacity(ids.count + batch.count)
    result.append(contentsOf: batch)
    return result
}
```

Periksa juga `Array(repeating:count:)` dengan jumlah besar (tidak apa-apa — O(n) sekali), dan pengindeksan `String` dalam loop: memajukan `String.Index` adalah O(1) per langkah tetapi *matematika* indeks absolut tidak — iterasi dengan `indices` atau `enumerated()` daripada menghitung offset berulang kali.

### Langkah 5: Kurangi Overhead Reference Counting

Pindai fungsi yang dioptimalkan untuk instance kelas yang dibuat per iterasi dan untuk closure yang menangkapnya. Terapkan secara berurutan:

1. Ubah model nilai kecil tanpa state yang dipakai di hot path dari `class` menjadi `struct` (mereka memang seharusnya tipe nilai — lihat Praktik Terbaik 4).
1. Tambahkan capture list ke setiap closure yang menangkap `self` atau model: `[weak self]` (atau `[unowned self]` ketika umur closure terbukti lebih pendek).
1. Untuk referensi yang diretensi dan dibutuhkan pada bagian kritis yang singkat, bungkus bagian tersebut dengan `withExtendedLifetime` untuk menghindari retain/release berulang di perbatasan:

```swift
func renderInto(_ context: CGContext, with layer: CALayer) {
    withExtendedLifetime(layer) {
        layer.render(in: context)
    }
}
```

Langkah ini halus: optimalisasi ARC jarang terlihat dalam micro-benchmark karena kompiler menyisipkan retain yang sama dengan yang Anda hapus. Imbalannya muncul dalam waktu CPU *agregat* selama fitur berjalan lama (scroll feed, memproses batch) — yang persis diukur oleh Time Profiler dan baseline Langkah 1.

### Langkah 6: Optimalkan Jalur Rendering SwiftUI

Terapkan aturan body view di tempat profiler menunjukkan kerja render:

1. Pindahkan kerja pemformatan dan data keluar dari `body` ke properti tersimpan atau view model.
1. Tambahkan konformansi `Equatable` pada view daun dan `.equatable()` di titik pemakaian pada daftar dan grid panjang.
1. Ganti daftar panjang dari `VStack`/`HStack` ke `LazyVStack`/`LazyHStack` dan kontainer grid ke varian lazy-nya.
1. Untuk efek visual berat (beberapa gradien, blur, bayangan di atas konten berlapis), bungkus subpohon dengan `.drawingGroup()` dan verifikasi dengan instrumen **Core Animation** bahwa rendering berpindah ke jalur kompositing GPU.
1. Untuk konten yang diperbarui setiap frame (grafik, grafik langsung), gunakan `Canvas` dan gambar secara imperatif daripada membangun ulang pohon view.

Ukur frame rate scroll dengan template **Animation Hitches** di Instruments (`Hitches and Hitches duration` pada profil core animation) sebelum dan sesudah — targetnya adalah durasi hitch nol pada kecepatan scroll yang dituntut konten Anda.

### Langkah 7: Turunkan Resolusi Gambar dan Gunakan Cache Beranggaran

Ganti decoding resolusi penuh dengan downsample ImageIO pada Praktik Terbaik 7, dan arahkan semua thumbnail melalui `NSCache` beranggaran (Praktik Terbaik 6). Perangkaian khas untuk sel daftar:

```swift
struct ProductThumbnail: View {
    let url: URL
    let displaySize: CGFloat

    var body: some View {
        Image(uiImage: ImageCache.shared.image(forKey: url.absoluteString) ??
            placeholder)
            .resizable()
            .scaledToFill()
            .task {
                if ImageCache.shared.image(forKey: url.absoluteString) == nil {
                    let scale = UIScreen.main.scale
                    let thumbnail = await Task.detached(priority: .utility) {
                        downsampleImage(at: url, maxPixelSize: Int(displaySize * scale))
                    }.value
                    if let thumbnail {
                        ImageCache.shared.setImage(thumbnail, forKey: url.absoluteString)
                    }
                }
            }
    }
}
```

Verifikasi dengan instrumen Allocations: setelah scroll melewati 500 thumbnail, puncak memori harus tetap datar (cache dibatasi) alih-alih tumbuh seiring jarak scroll.

### Langkah 8: Pangkas Kerja Waktu Peluncuran

1. Atur environment variable skema `DYLD_PRINT_STATISTICS` (dan varian rincinya) lalu luncurkan aplikasi, catat total waktu muat dylib. Tinjau kontributor teratas: apakah ada framework besar yang dapat dimuat lazy, di-link statis, atau diganti?
1. Cari pernyataan level teratas di modul Anda — initializer `let` global dan kode apa pun di scope file — dan ubah yang mahal menjadi `lazy` atau singleton `static let`.
1. Pindahkan setup non-esensial dari `didFinishLaunchingWithOptions` ke task utility yang terlepas atau ke kemunculan layar pertama, sehingga frame pertama ter-render sebelum kerja opsional dimulai (lihat pola `CacheWarmer` di Praktik Terbaik 8).
1. Verifikasi waktu-ke-frame-pertama dengan peluncuran baru dan bandingkan dengan baseline. Ulangi setelah setiap pembaruan dependensi — ini regresi paling senyap di basis kode.

### Langkah 9: Gerbang Rilis dengan Tes Regresi Performa

Ubah baseline Langkah 1 menjadi ambang yang ditegakkan sehingga regresi performa menggagalkan build alih-alih sampai ke pengguna. `XCTMetric` memungkinkan Anda menegaskan nilai terukur (atau mendaftarkannya sebagai baseline):

```swift
final class OrderAggregationPerformanceTests: XCTestCase {
    func testAggregateTenThousandOrdersStaysFast() throws {
        let orders = makeSampleOrders(count: 10_000)
        measure(metrics: [XCTClockMetric()]) {
            _ = OrderAggregator.aggregatePerCustomer(orders)
        }
        // Baseline didaftarkan dari sesi optimalisasi (Langkah 1). Tes gagal
        // ketika waktu rata-rata melebihi baseline lebih dari toleransi.
    }
}
```

Di Xcode, jalankan tesnya, buka tab **Performance** pada hasil, dan pilih **Set Baseline** pada metriknya — jalankan berikutnya akan membandingkannya, menandai tes gagal (kuning, dalam toleransi, atau merah, terlampaui) ketika performa menurun. Hubungkan target tes performa ke CI bersama tes unit: pada setiap pull request, CI menjalankan suite di perangkat atau runner yang stabil dan menandai hasil merah mana pun. Anggaran performa yang ditegakkan adalah satu-satunya yang bertahan menghadapi roadmap yang sibuk — inilah yang membuat seluruh upaya optimalisasi menjadi tahan lama.

## Kesimpulan

Kerja performa Swift memiliki urutan operasi yang andal: ukur, targetkan, ubah, ukur ulang, kunci. Mulailah dari lapisan algoritmik — koleksi O(n²) hampir selalu kemenangan terbesar yang belum tergarap — lalu lindungi perilaku memori (COW dan ARC), jaga lapisan rendering tetap jujur dengan body view yang murah dan kontainer lazy, cache dengan anggaran eksplisit, dan jangan biarkan kerja peluncuran atau energi menyelinap tanpa terdeteksi. Setiap lapisan memiliki metrik yang menempel padanya: Instruments untuk eksplorasi, XCTMetric untuk penegakan. Ketika sebuah angka bergerak ke arah yang salah dan CI menangkapnya, loopnya menutup — baseline yang Anda tetapkan di Langkah 1 adalah wasit untuk setiap perubahan di masa depan.

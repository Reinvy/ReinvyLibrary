---
title: "Cheat Sheet Manajemen Memori dan ARC Swift"
description: "Referensi cepat untuk Automatic Reference Counting (ARC), referensi strong/weak/unowned, siklus retain, daftar tangkapan closure, tipe nilai copy-on-write, penggunaan autoreleasepool, dan alat debugging memori di Swift."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Manajemen Memori dan ARC Swift

## Tabel Referensi Cepat

| Konsep | Kode / Kata Kunci | Deskripsi |
|--------|-------------------|-----------|
| Referensi kuat | `var owner: Car?` | Default; menambah hitungan retain, menjaga objek tetap hidup |
| Referensi lemah | `weak var delegate: Delegate?` | Tidak menambah hitungan retain; menjadi `nil` saat didealokasi |
| Referensi unowned | `unowned let parent: Parent` | Tidak menambah hitungan retain; crash jika diakses setelah dealokasi |
| Daftar tangkapan | `[weak self]` | Menangkap `self` secara lemah di dalam closure |
| Daftar tangkapan | `[unowned self]` | Menangkap `self` secara unowned di dalam closure |
| Autorelease pool | `autoreleasepool { }` | Menguras objek sementara di dalam badan perulangan |
| Copy-on-write | `struct` dengan `Array`/`Dictionary` | Berbagi penyimpanan sampai dimutasi, lalu menyalin |
| Deinitializer | `deinit { }` | Dipanggil saat referensi kuat terakhir dilepas |
| Cek hitungan retain | `CFGetRetainCount(obj)` | Inspeksi khusus debugging dari hitungan retain saat ini |
| Peringatan memori | `didReceiveMemoryWarning` | Hook UIKit untuk membersihkan cache saat tekanan memori |
| Deteksi kebocoran | Template Leaks di Instruments | Memprofil objek yang bocor dan tidak pernah dilepas |
| Debug grafik | Memory Graph Debugger di Xcode | Memvisualisasikan referensi objek dan siklus |

## Perintah Umum

### Profiling dengan Instruments

```bash
# Memprofil aplikasi di Xcode
# Product > Profile (Cmd + I), lalu pilih template Leaks

# Menjalankan Instruments dari baris perintah dengan template Leaks
xcrun xctrace record --template Leaks --launch -- ./YourApp.app

# Merekam alokasi dengan template Allocations
xcrun xctrace record --template Allocation --launch -- ./YourApp.app
```

### Inspeksi Memori dari Baris Perintah

```bash
# Menampilkan region memori dan ukurannya untuk sebuah proses
vmmap <pid>

# Mencetak call stack yang mengalokasikan sebuah alamat
malloc_history <pid> <address>

# Membuang heap dan mencari sebuah simbol
leaks <pid>

# Mendaftar semua alokasi heap yang masih hidup dikelompokkan per kelas
heap <pid>
```

### Debugging Memori dengan LLDB

```bash
# Di konsol debugger Xcode
# Mencetak hitungan retain sebuah objek (khusus build debug)
po CFGetRetainCount(someObject)

# Mencetak alamat objek Swift
po unsafeBitCast(someObject, to: UnsafeRawPointer.self)

# Mengaktifkan pencatatan stack malloc untuk melihat backtrace alokasi
# Edit Scheme > Run > Diagnostics > Malloc Stack (All Allocator Freezes)
```

## Potongan Kode

### Siklus Retain Antara Dua Kelas

```swift
// MARK: - Siklus retain (bocor)
final class Parent {
    var child: Child?
}

final class Child {
    var parent: Parent?   // Referensi kuat balik membuat siklus
}

// MARK: - Diperbaiki dengan weak
final class ParentFixed {
    var child: ChildFixed?
}

final class ChildFixed {
    weak var parent: ParentFixed?   // Weak memutus siklus
}
```

### Pola Delegate dengan Referensi Lemah

```swift
// MARK: - Delegate weak menghindari siklus
protocol NetworkServiceDelegate: AnyObject {
    func didFinishLoading()
}

final class NetworkService {
    weak var delegate: NetworkServiceDelegate?   // Delegate harus weak
}

final class ViewController: NetworkServiceDelegate {
    let service = NetworkService()

    init() {
        service.delegate = self   // Tidak ada siklus: delegate bersifat weak
    }

    func didFinishLoading() {
        print("Selesai dimuat")
    }
}
```

### Daftar Tangkapan pada Closure

```swift
// MARK: - Weak self untuk closure yang melarikan diri
final class ImageDownloader {
    var onComplete: (() -> Void)?

    func download() {
        // [weak self] menghindari penangkapan self secara kuat
        DispatchQueue.global().async { [weak self] in
            guard let self else { return }
            self.processData()
        }
    }

    // MARK: - Unowned self saat self hidup lebih lama dari closure
    func processData() {
        onComplete = { [unowned self] in
            self.render()   // Aman hanya jika self dijamin masih hidup
        }
    }

    private func render() {
        print("Merender")
    }
}
```

### Keputusan Unowned vs Weak

```swift
// MARK: - Weak: referensi mungkin menjadi nil (delegate, kebanyakan closure)
class A {
    weak var b: B?
}

// MARK: - Unowned: referensi tidak pernah nil selama digunakan
// (misalnya parent-child saat child tidak pernah hidup lebih lama dari parent)
class Parent {
    var child: Child!
}

class Child {
    unowned let parent: Parent

    init(parent: Parent) {
        self.parent = parent
    }
}
```

### Autoreleasepool untuk Perulangan Ketat

```swift
// MARK: - Tanpa autoreleasepool: memori melonjak pada perulangan besar
for i in 0..<100_000 {
    let data = Data(repeating: 0, count: 1024)
    process(data)
}

// MARK: - Dengan autoreleasepool: objek sementara dikuras tiap iterasi
for i in 0..<100_000 {
    autoreleasepool {
        let data = Data(repeating: 0, count: 1024)
        process(data)
    }
}

func process(_ data: Data) {
    // Pekerjaan simulasi
    print(data.count)
}
```

### Semantik Nilai Copy-on-Write

```swift
// MARK: - Array berbagi penyimpanan sampai dimutasi
var first = [1, 2, 3]
var second = first        // Berbagi buffer yang sama — belum ada salinan

second.append(4)          // Mutasi memicu penyalinan
print(first.count)        // 3
print(second.count)       // 4

// MARK: - Struct dengan referensi di dalamnya tetap perlu hati-hati
struct User {
    var name: String
    var avatar: UIImage   // UIImage adalah tipe referensi
}

var userA = User(name: "A", avatar: image)
var userB = userA
userB.name = "B"          // Hanya name yang disalin; avatar masih dibagikan
```

### Mendeteksi Kebocoran Saat Runtime

```swift
// MARK: - Log deinit membantu memastikan dealokasi
final class ViewModel {
    deinit {
        print("ViewModel didealokasi")
    }
}

// MARK: - Kontainer weak untuk menguji dealokasi
final class LeakProbe {
    weak var instance: AnyObject?

    init(_ instance: AnyObject) {
        self.instance = instance
    }

    var isDeallocated: Bool {
        instance == nil
    }
}

// MARK: - Penggunaan dalam unit test
func testViewModelDeallocates() {
    var viewModel: ViewModel? = ViewModel()
    let probe = LeakProbe(viewModel!)

    viewModel = nil
    assert(probe.isDeallocated, "ViewModel bocor!")
}
```

### Manajemen Referensi yang Aman untuk Thread

```swift
// MARK: - Actor mengisolasi state tanpa lock
actor Counter {
    private var value = 0

    func increment() {
        value += 1
    }
}

// MARK: - Kelas @unchecked Sendable yang digunakan dengan hati-hati
final class Cache: @unchecked Sendable {
    private let lock = NSLock()
    private var storage: [String: Data] = [:]

    func set(_ data: Data, for key: String) {
        lock.lock()
        storage[key] = data
        lock.unlock()
    }
}
```

### Penanganan Peringatan Memori

```swift
// MARK: - Membersihkan cache saat tekanan memori
final class ImageCache {
    static let shared = ImageCache()
    private var cache: [String: UIImage] = [:]

    func purge() {
        cache.removeAll()
    }
}

// MARK: - Integrasi UIKit
final class GalleryViewController: UIViewController {
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        ImageCache.shared.purge()
    }
}
```

---
title: "Cheat Sheet Swift"
description: "Panduan referensi cepat yang mencakup sintaks Swift, komponen UIKit, modifier view SwiftUI, pola jaringan, dan pintasan Xcode."
category: "mobile"
technology: "swift"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Swift

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Deklarasi variabel | `var nama = "nilai"` | Variabel yang dapat diubah |
| Deklarasi konstanta | `let maxItems = 100` | Tidak dapat diubah (lebih disukai) |
| Tipe optional | `var nama: String?` | Mungkin nil |
| Force unwrap | `nama!` | Crash jika nil — gunakan hati-hati |
| Unwrap bersyarat | `if let n = nama { }` | Optional binding aman |
| Guard unwrap | `guard let n = nama else { return }` | Keluar awal jika nil |
| Nil-coalescing | `nama ?? "default"` | Berikan default jika nil |
| Fungsi | `func tambah(a: Int, b: Int) -> Int { a + b }` | Fungsi dasar |
| Closure | `{ $0 + $1 }` | Closure singkatan |
| Iterasi array | `items.forEach { print($0) }` | Perulangan array |
| Transformasi map | `items.map { $0 * 2 }` | Transformasi setiap elemen |
| Fungsi async | `func fetch() async throws -> Data` | Konkurensi Swift |
| Panggilan await | `let data = try await fetch()` | Tunggu hingga selesai |
| Property wrapper | `@State var count = 0` | State SwiftUI |
| Pewarisan class | `class Dog: Animal { }` | Subclassing |
| Adopsi protokol | `struct Car: Codable { }` | Mematuhi protokol |
| Extension | `extension String { }` | Tambahkan fungsionalitas |

## Perintah Umum

### Pintasan Xcode

```bash
# Build dan jalankan
Cmd + R

# Build untuk pengujian
Cmd + U

# Hentikan aplikasi
Cmd + .

# Buka cepat (pencarian file)
Cmd + Shift + O

# Tampilkan/sembunyikan navigator
Cmd + 0

# Tampilkan/sembunyikan area debug
Cmd + Shift + Y

# Tampilkan/sembunyikan utilitas
Cmd + Option + 0

# Indentasi ke kiri
Cmd + [

# Indentasi ke kanan
Cmd + ]

# Komentar/batal komentar
Cmd + /

# Lompat ke definisi
Cmd + Ctrl + J

# Cari di file
Cmd + F

# Cari dan ganti di proyek
Cmd + Shift + F
```

### Swift Package Manager (SPM)

```bash
# Buat paket Swift
swift package init --type executable

# Build paket
swift build

# Jalankan tes
swift test

# Generate proyek Xcode
swift package generate-xcodeproj

# Perbarui dependensi
swift package update

# Selesaikan dependensi
swift package resolve
```

### CocoaPods

```bash
# Instal CocoaPods
sudo gem install cocoapods

# Inisialisasi Podfile
pod init

# Instal pods
pod install

# Perbarui pods
pod update

# Daftar pods usang
pod outdated

# Cari pod
pod search Alamofire
```

### Git (di dalam Xcode)

```bash
# Buat repositori baru
git init

# Stage semua perubahan
git add .

# Commit dengan pesan
git commit -m "Initial commit"

# Push ke remote
git push origin main

# Buat dan pindah ke branch baru
git checkout -b fitur/fitur-baru
```

## Potongan Kode

### Pola Sintaks Swift

```swift
// MARK: - Enum dengan associated values
enum HasilJaringan {
    case sukses(data: Data)
    case gagal(error: Error)
    case memuat
}

// MARK: - Struct dengan Codable
struct Pengguna: Codable, Identifiable {
    let id: Int
    let nama: String
    let email: String
    
    enum CodingKeys: String, CodingKey {
        case id, nama, email
    }
}

// MARK: - Class dengan weak delegate
protocol MyDelegate: AnyObject {
    func didFinishTask()
}

class TaskManager {
    weak var delegate: MyDelegate?
}

// MARK: - Protokol dengan implementasi default
protocol DapatSapa {
    func sapa() -> String
}

extension DapatSapa {
    func sapa() -> String {
        return "Halo!"
    }
}

// MARK: - Extension dengan computed property
extension Double {
    var celciusToFahrenheit: Double {
        return self * 9 / 5 + 32
    }
}
```

### Pola Komponen UIKit

```swift
// MARK: - UILabel terprogram
let titleLabel = UILabel()
titleLabel.text = "Selamat Datang"
titleLabel.font = UIFont.systemFont(ofSize: 18, weight: .bold)
titleLabel.textColor = .black
titleLabel.textAlignment = .center
titleLabel.numberOfLines = 0
titleLabel.translatesAutoresizingMaskIntoConstraints = false
view.addSubview(titleLabel)

// MARK: - UIButton dengan target-action
let button = UIButton(type: .system)
button.setTitle("Tekan Saya", for: .normal)
button.addTarget(self, action: #selector(buttonTapped), for: .touchUpInside)
button.translatesAutoresizingMaskIntoConstraints = false
view.addSubview(button)

@objc func buttonTapped() {
    print("Tombol ditekan!")
}

// MARK: - UITextField delegate
class ViewController: UIViewController, UITextFieldDelegate {
    let textField = UITextField()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        textField.delegate = self
        textField.placeholder = "Masukkan nama Anda"
        textField.borderStyle = .roundedRect
    }
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }
}
```

### Modifier View SwiftUI

```swift
// MARK: - Modifier View Umum
Text("Halo, SwiftUI!")
    .font(.title)                          // Ukuran/berat font
    .foregroundColor(.blue)                // Warna teks
    .padding()                             // Padding default
    .padding(.horizontal, 16)              // Padding spesifik
    .background(Color.yellow)              // Warna latar
    .cornerRadius(8)                       // Sudut membulat
    .shadow(radius: 4)                     // Efek bayangan
    .opacity(0.8)                          // Transparansi
    .frame(width: 200, height: 100)        // Bingkai tetap
    .offset(x: 10, y: -5)                 // Offset posisi
    .rotationEffect(.degrees(45))          // Rotasi
    .scaleEffect(1.5)                      // Skala

// MARK: - Modifier Kustom
struct GayaKartu: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: .gray.opacity(0.3), radius: 8, x: 0, y: 4)
    }
}

extension View {
    func gayaKartu() -> some View {
        modifier(GayaKartu())
    }
}
```

### Jaringan URLSession

```swift
// MARK: - Permintaan GET dengan async/await
func fetchPengguna() async throws -> [Pengguna] {
    let url = URL(string: "https://api.example.com/users")!
    let (data, response) = try await URLSession.shared.data(from: url)
    
    guard let httpResponse = response as? HTTPURLResponse,
          (200...299).contains(httpResponse.statusCode) else {
        throw URLError(.badServerResponse)
    }
    
    return try JSONDecoder().decode([Pengguna].self, from: data)
}

// MARK: - Permintaan POST
func buatPengguna(nama: String, email: String) async throws -> Pengguna {
    let url = URL(string: "https://api.example.com/users")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = ["name": nama, "email": email]
    request.httpBody = try JSONEncoder().encode(body)
    
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode(Pengguna.self, from: data)
}

// MARK: - Unduh dengan progres
func unduhFile(url: URL) async throws -> URL {
    let (fileURL, _) = try await URLSession.shared.download(from: url)
    return fileURL
}
```

### Pengaturan CoreData Stack

```swift
// MARK: - CoreData Stack (iOS 15+)
import CoreData

class CoreDataStack {
    static let shared = CoreDataStack()
    
    lazy var persistentContainer: NSPersistentContainer = {
        let container = NSPersistentContainer(name: "MyApp")
        container.loadPersistentStores { _, error in
            if let error = error {
                fatalError("CoreData gagal: \(error)")
            }
        }
        return container
    }()
    
    var context: NSManagedObjectContext {
        persistentContainer.viewContext
    }
    
    func simpan() {
        if context.hasChanges {
            try? context.save()
        }
    }
    
    func fetch<T: NSManagedObject>(_ type: T.Type) -> [T] {
        let request = T.fetchRequest()
        return (try? context.fetch(request)) as? [T] ?? []
    }
}
```

### Pola GCD / Async-Await

```swift
// MARK: - DispatchQueue main async
DispatchQueue.main.async {
    // Perbarui UI
}

// MARK: - Antrian latar belakang global
DispatchQueue.global(qos: .background).async {
    // Pekerjaan berat
    DispatchQueue.main.async {
        // Kembali ke main untuk UI
    }
}

// MARK: - DispatchGroup untuk beberapa tugas
let group = DispatchGroup()

group.enter()
tugas1 { group.leave() }

group.enter()
tugas2 { group.leave() }

group.notify(queue: .main) {
    // Semua tugas selesai
}

// MARK: - Async/await dengan Task
Task {
    do {
        let pengguna = try await fetchPengguna()
        print(pengguna)
    } catch {
        print("Error: \(error)")
    }
}

// MARK: - TaskGroup untuk operasi paralel
func fetchSemua() async throws -> [Pengguna] {
    try await withThrowingTaskGroup(of: [Pengguna].self) { group in
        let urls = ["https://api1.com/users", "https://api2.com/users"]
        for url in urls {
            group.addTask {
                let (data, _) = try await URLSession.shared.data(from: URL(string: url)!)
                return try JSONDecoder().decode([Pengguna].self, from: data)
            }
        }
        
        var semuaPengguna: [Pengguna] = []
        for try await pengguna in group {
            semuaPengguna.append(contentsOf: pengguna)
        }
        return semuaPengguna
    }
}
```

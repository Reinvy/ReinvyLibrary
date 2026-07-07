---
title: "Panduan Concurrency Swift: async/await, Actors, dan Structured Concurrency"
description: "Panduan komprehensif tentang concurrency modern Swift yang mencakup async/await, actors, structured concurrency, dan pola desain thread-safe untuk aplikasi iOS dan macOS."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Concurrency Swift: async/await, Actors, dan Structured Concurrency

## Pendahuluan

Modern Swift Concurrency, yang diperkenalkan di Swift 5.5 dan disempurnakan hingga Swift 5.7+, secara fundamental mengubah cara pengembang iOS dan macOS menulis kode asinkronus. Sebelum perubahan ini, pemrograman asinkronus bergantung pada completion handler, delegate callback, dan DispatchQueue — pola yang sering mengarah ke nested closure yang dalam, manajemen thread manual, dan bug data-race yang sulit dilacak.

Swift Concurrency menyediakan model terstruktur yang ditegakkan oleh compiler, dibangun di atas tiga pilar:

- **async/await**: Menulis kode asinkronus yang terbaca seperti kode sinkronus, dengan titik suspensi di level bahasa tanpa piramida callback.
- **Actors**: Melindungi state yang dapat berubah dengan jaminan isolasi waktu kompilasi, menghilangkan seluruh kelas race condition tanpa penguncian manual.
- **Structured Concurrency**: Mendefinisikan hierarki task di mana parent task secara otomatis mengelola masa hidup child task, memastikan tidak ada task yang terabaikan atau tetap berjalan setelah konteksnya dihancurkan.

Panduan ini membahas setiap pilar dengan pola tingkat produksi, strategi migrasi, dan pitfall umum. Pada akhirnya, Anda akan mampu merefaktor kode berbasis callback lama menjadi Swift Concurrency yang aman dan mudah dipelihara, serta mendesain sistem konkuren baru dengan benar sejak awal.

## Praktik Terbaik

### Utamakan Structured Concurrency Dibandingkan Unstructured Tasks

Selalu gunakan structured concurrency (`async let`, `await`, task groups) ketika masa hidup child task terikat dengan scope parent. Cadangkan unstructured tasks (`Task { }` dan `Task.detached { }`) untuk pekerjaan fire-and-forget seperti logging atau analytics yang harus tetap berjalan setelah konteks saat ini selesai.

### Gunakan `async let` untuk Paralelisme dengan Jumlah Tetap

Ketika jumlah operasi paralel sudah diketahui saat kompilasi, gunakan `async let`. Compiler menjamin semua child task selesai (atau dibatalkan) sebelum scope parent keluar.

```swift
func loadDashboard() async throws -> Dashboard {
    async let user = fetchCurrentUser()
    async let posts = fetchRecentPosts()
    async let stats = fetchAnalytics()
    return try await Dashboard(user: user, posts: posts, stats: stats)
}
```

### Gunakan Task Groups untuk Fanout Dinamis

Ketika jumlah operasi paralel hanya diketahui saat runtime (misalnya memetakan array), gunakan `withThrowingTaskGroup`.

```swift
func fetchProfiles(for userIDs: [UserID]) async throws -> [UserProfile] {
    try await withThrowingTaskGroup(of: UserProfile.self) { group in
        for id in userIDs {
            group.addTask { try await self.api.fetchProfile(id) }
        }
        var profiles: [UserProfile] = []
        for try await profile in group {
            profiles.append(profile)
        }
        return profiles
    }
}
```

### Tandai Semua Pembaruan UI dengan `@MainActor`

SwiftUI views dan UIKit view controllers harus memperbarui UI di main thread. Daripada mengingat untuk dispatch ke `DispatchQueue.main` secara manual, annotate tipe atau method dengan `@MainActor`.

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var name = ""

    func updateName(_ new: String) async {
        try? await api.saveName(new)
        name = new  // dijamin di main thread
    }
}
```

### Gunakan Actors untuk Shared Mutable State

Gantikan lock manual dan serial dispatch queue dengan actors. Compiler mencegah akses eksternal ke state yang dapat berubah tanpa melalui batasan isolasi.

```swift
actor ScoreTracker {
    private var scores: [String: Int] = [:]

    func recordScore(_ points: Int, for player: String) {
        scores[player, default: 0] += points
    }

    func leaderboard(limit: Int = 10) -> [(String, Int)] {
        scores.sorted { $0.value > $1.value }.prefix(limit).map { ($0.key, $0.value) }
    }
}
```

### Cegah Kejutan Reentrancy pada Actor

Method actor bersifat *reentrant* — sebuah `await` di dalam method actor akan menangguhkan dan memungkinkan pekerjaan lain dieksekusi pada actor yang sama sebelum method dilanjutkan. Lindungi invariant dengan memvalidasi state setelah setiap titik suspensi.

```swift
actor BankAccount {
    private var balance: Double = 0

    func transfer(amount: Double, to other: BankAccount) async {
        guard balance >= amount else { return }
        // Titik reentrancy: task lain mungkin telah mengubah balance di sini!
        balance -= amount
        await other.deposit(amount: amount)
    }
}
```

Gunakan pola non-reentrant ketika atomicitas sangat penting, atau restruktur kode untuk check-and-act dalam satu blok sinkronus jika memungkinkan.

### Patuhi `Sendable` untuk Komunikasi Antar-Actor

Tipe yang melewati batas actor harus sesuai dengan `Sendable`. Compiler memeriksa ini secara otomatis. Gunakan `@unchecked Sendable` hanya sebagai upaya terakhir dan dokumentasikan jaminan thread-safety.

```swift
struct UserProfile: Sendable {
    let id: UUID
    let name: String
    let email: String
}
```

### Tangani Pembatalan Secara Kooperatif

Task yang berjalan lama harus memeriksa pembatalan secara berkala dan membersihkan resource dengan cepat. Gunakan `try Task.checkCancellation()` untuk pemeriksaan sederhana atau `Task.isCancelled` untuk jalur non-throwing.

```swift
func processLargeDataset(_ items: [Item]) async throws -> [Result] {
    try Task.checkCancellation()
    return try await withThrowingTaskGroup(of: Result.self) { group in
        for item in items {
            guard !Task.isCancelled else { break }
            group.addTask { try await processItem(item) }
        }
        var results: [Result] = []
        for try await result in group {
            results.append(result)
            // Periksa pembatalan secara berkala di antara hasil
            try Task.checkCancellation()
        }
        return results
    }
}
```

### Jembatani API Berbasis Continuation dengan `withCheckedContinuation`

Saat membungkus API berbasis callback yang sudah ada (delegate URLSession, callback CoreLocation, dll.), gunakan `withCheckedContinuation` atau `withCheckedThrowingContinuation`.

```swift
extension CLLocationManager {
    func requestCurrentLocation() async throws -> CLLocation {
        return try await withCheckedThrowingContinuation { continuation in
            let delegate = LocationContinuationDelegate(continuation: continuation)
            self.delegate = delegate
            self.requestLocation()
        }
    }
}
```

### Pilih Prioritas Task yang Tepat

Prioritas task harus mencerminkan kepentingan pekerjaan bagi pengguna, bukan digunakan sebagai hack penjadwalan. Gunakan `.medium` secara default kecuali ada alasan jelas yang terlihat pengguna untuk menaikkan atau menurunkan prioritas.

```swift
Task(priority: .userInitiated) {
    await viewModel.loadImmediatelyVisibleContent()
}

Task(priority: .background) {
    await cache.prefetchNextPage()
}
```

## Langkah Implementasi

### Langkah 1: Audit Kode Asinkronus yang Ada

Identifikasi setiap penggunaan completion handler, `DispatchQueue`, `OperationQueue`, delegate, dan panggilan balik `Timer` di basis kode Anda. Tag setiap kemunculan dengan kategorinya:

- Fire-and-forget (logging, analytics): dapat tetap tidak terstruktur atau migrasi ke `Task`
- Pengambilan data (jaringan, database): kandidat utama untuk async/await
- Shared mutable state (cache, penyimpanan dalam memori): kandidat untuk isolasi actor

Gunakan daftar periksa berikut untuk setiap file:

1. Cari closure `@escaping` yang mewakili completion handler.
1. Cari `DispatchQueue.main.async`, `DispatchQueue.global()`, dan pembuatan queue kustom.
1. Cari delegate callback yang dapat diganti dengan async streams (`AsyncStream` / `AsyncSequence`).
1. Identifikasi state yang dapat berubah yang diakses dari beberapa thread (global atau singleton).

### Langkah 2: Migrasi Completion Handler ke async/await

Ubah callback menjadi fungsi async throwing menggunakan pola refactoring yang terfokus.

Mulai dengan fungsi leaf — panggilan jaringan atau database yang paling dalam — dan bekerja ke luar.

Sebelum (completion handler):

```swift
func fetchUser(id: UUID, completion: @escaping (Result<User, Error>) -> Void) {
    URLSession.shared.dataTask(with: url(for: id)) { data, _, error in
        if let error = error {
            completion(.failure(error))
        } else if let data = data, let user = try? decoder.decode(User.self, from: data) {
            completion(.success(user))
        } else {
            completion(.failure(DecodingError.dataCorrupted(.init(codingPath: []))))
        }
    }.resume()
}
```

Sesudah (async/await):

```swift
func fetchUser(id: UUID) async throws -> User {
    let (data, _) = try await URLSession.shared.data(from: url(for: id))
    return try decoder.decode(User.self, from: data)
}
```

Untuk setiap fungsi yang dimigrasi, perbarui pemanggilnya secara rekursif hingga tidak ada lagi completion handler dalam rantai panggilan.

### Langkah 3: Perkenalkan Actors untuk Shared State

Identifikasi setiap kelas yang menyimpan mutable state yang diakses secara konkuren. Ganti yang cocok dengan model actor.

Sebelum (kelas dengan serial queue — manual, rawan error):

```swift
final class ImageCache {
    private var cache: [URL: UIImage] = [:]
    private let queue = DispatchQueue(label: "com.app.imagecache", attributes: .concurrent)

    func image(for url: URL) -> UIImage? {
        queue.sync { cache[url] }
    }

    func setImage(_ image: UIImage, for url: URL) {
        queue.async(flags: .barrier) { self.cache[url] = image }
    }
}
```

Sesudah (actor — keamanan yang ditegakkan compiler):

```swift
actor ImageCache {
    private var cache: [URL: UIImage] = [:]

    func image(for url: URL) -> UIImage? {
        cache[url]
    }

    func setImage(_ image: UIImage, for url: URL) {
        cache[url] = image
    }

    func clear() {
        cache.removeAll()
    }
}
```

Tips migrasi:

1. Mulai dengan cache dan penyimpanan di level leaf (tanpa ketergantungan eksternal pada tipe non-Sendable).
1. Ubah computed properties yang mengakses isolated state menjadi method agar batas actor menjadi eksplisit.
1. Jika sebuah kelas mencampur state dan UI (misalnya view model), pertahankan sebagai `@MainActor class` daripada mengonversinya menjadi actor.

### Langkah 4: Adopsi Structured Concurrency di View Model

View model dan controller adalah tempat ideal untuk mengganti manajemen task manual dengan pola terstruktur.

Sebelum (pelacakan pembatalan manual):

```swift
final class FeedViewModel {
    private var fetchTask: Task<Void, Never>?
    private var refreshTask: Task<Void, Never>?

    func loadFeed() {
        fetchTask?.cancel()
        fetchTask = Task { [weak self] in
            let posts = try? await self?.api.fetchFeed()
            await MainActor.run { self?.posts = posts ?? [] }
        }
    }
}
```

Sesudah (terstruktur dengan pembatalan task-scoped):

```swift
@MainActor
final class FeedViewModel {
    func loadFeed() async {
        do {
            let posts = try await api.fetchFeed()
            self.posts = posts
        } catch is CancellationError {
            // Task dibatalkan, tidak perlu penanganan error
        } catch {
            self.error = error.localizedDescription
        }
    }
}
```

Ketika view menghilang, SwiftUI secara otomatis membatalkan task jika method view model dipanggil melalui `Task` di modifier `.task`:

```swift
struct FeedView: View {
    @StateObject private var viewModel = FeedViewModel()

    var body: some View {
        List(viewModel.posts) { post in
            PostRow(post: post)
        }
        .task { await viewModel.loadFeed() }
    }
}
```

### Langkah 5: Tambahkan Dukungan AsyncSequence untuk Stream

Gantikan delegate callback berkelanjutan dengan `AsyncStream` atau konformansi `AsyncSequence`.

Sebelum (delegate):

```swift
class LocationManager: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    var onUpdate: ((CLLocation) -> Void)?

    func start() {
        manager.delegate = self
        manager.startUpdatingLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        onUpdate?(location)
    }
}
```

Sesudah (async stream):

```swift
class LocationManager: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var continuation: AsyncStream<CLLocation>.Continuation?

    func locations() -> AsyncStream<CLLocation> {
        AsyncStream { continuation in
            self.continuation = continuation
            continuation.onTermination = { [weak self] _ in
                self?.manager.stopUpdatingLocation()
            }
        }
    }

    func start() {
        manager.delegate = self
        manager.startUpdatingLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        continuation?.yield(location)
    }
}
```

### Langkah 6: Tulis Tes untuk Kode Konkuren

Menguji kode async memerlukan dukungan async/await `XCTest`. Uji isolasi actor dengan mengekses pola akses konkuren.

```swift
final class ScoreTrackerTests: XCTestCase {
    func testConcurrentScoring() async {
        let tracker = ScoreTracker()

        await withTaskGroup(of: Void.self) { group in
            for i in 0..<100 {
                group.addTask { await tracker.recordScore(1, for: "player-\(i % 10)") }
            }
        }

        let leaderboard = await tracker.leaderboard()
        XCTAssertEqual(leaderboard.count, 10)
        for (_, score) in leaderboard {
            XCTAssertEqual(score, 10)
        }
    }
}
```

Praktik pengujian utama:

1. Gunakan `await` saat memanggil method actor dari tes — suspensi bersifat transparan di XCTest.
1. Uji jalur pembatalan dengan membatalkan task yang menjalankan fungsi async dan memastikan hasilnya adalah `CancellationError`.
1. Gunakan `XCTestExpectation` dengan async/await saat menguji kode bridging yang melibatkan delegate atau callback.
1. Jalankan tes dengan flag `-parallel-testing` untuk menemukan bug isolasi actor.

### Langkah 7: Profil dan Optimalkan

Gunakan Instruments untuk memverifikasi bahwa perubahan concurrency Anda meningkatkan kinerja, bukan menurunkannya.

1. Buka Instruments dan pilih template **Swift Concurrency** trace.
1. Jalankan aplikasi dan gunakan fitur yang telah direfaktor.
1. Periksa panel **Task Creation** dan **Actor Contention**:

   - Kontensi actor yang tinggi (task menunggu akses actor) menunjukkan actor adalah bottleneck. Pertimbangkan untuk membaginya menjadi beberapa actor, atau gunakan fungsi `@Sendable` untuk mengurangi waktu di executor actor.
   - Pembuatan task yang berlebihan menunjukkan task terlalu banyak dan terlalu kecil. Gabungkan operasi kecil ke dalam task yang lebih sedikit.
   - Pembatalan task yang tidak terduga menunjuk pada ketidakcocokan siklus hidup — verifikasi hubungan parent-child task.

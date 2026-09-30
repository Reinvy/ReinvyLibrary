---
title: "Tugas Latar Belakang Swift: BGTaskScheduler, Background URLSession, dan Eksekusi Cerdas"
description: "Tutorial lanjutan untuk membangun eksekusi latar belakang yang andal pada aplikasi iOS menggunakan BGTaskScheduler, background URLSession, manajemen siklus hidup aplikasi, dan penjadwalan yang hemat baterai."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Tugas Latar Belakang Swift: BGTaskScheduler, Background URLSession, dan Eksekusi Cerdas

## Ringkasan

Tutorial ini mengajarkan cara menjalankan pekerjaan secara andal saat aplikasi iOS Anda tidak berada di latar depan (foreground). Anda akan mempelajari siklus hidup aplikasi iOS, dua kelas tugas BGTaskScheduler, background URLSession untuk transfer data besar, serta pola-pola praktis — penanganan tenggat waktu, penjadwalan hemat daya, dan pengujian dengan debugger — yang membuat pekerjaan latar belakang tetap benar dan ramah baterai. Proyek akhir menyatukan semuanya dalam sebuah pipeline lengkap pembaruan cache dan unggah antrean.

## Target Audiens

- Pengembang iOS yang sudah membangun atau sedang membangun aplikasi yang membutuhkan pembaruan data berkala, unggahan, atau unduhan media.
- Level pengembang yang diharapkan: Mahir — Anda diharapkan nyaman dengan konkurensi Swift (`async/await`), `URLSession`, dan siklus hidup aplikasi `UIKit`/`SwiftUI`.

## Prasyarat

- Xcode 15 atau lebih baru dengan iPhone fisik untuk pengujian (mode latar belakang tidak berjalan andal di Simulator).
- Akun Apple Developer berbayar untuk mengaktifkan kapabilitas Background Modes dan menguji perilaku penjadwalan yang sesungguhnya.
- Pengetahuan kerja tentang konkurensi Swift, `async/await`, `Task`, dan `URLSession`.
- Pemahaman tentang callback siklus hidup `UIApplicationDelegate` / `@UIApplicationDelegateAdaptor`.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan status-status aplikasi iOS dan mode eksekusi apa saja yang diberikan iOS untuk pekerjaan latar belakang.
- Mendaftarkan, mengonfigurasi, dan mengimplementasikan handler `BGAppRefreshTask` dan `BGProcessingTask` dengan benar.
- Menjalankan unduhan besar melalui `URLSession` latar belakang yang bertahan saat aplikasi ditangguhkan (suspended).
- Menangani tenggat waktu tugas, expiration handler, dan pembatalan tanpa merusak status aplikasi.
- Menjadwalkan pekerjaan latar belakang yang hemat daya dan mengujinya dengan perintah debugger `BGTaskScheduler`.
- Mendiagnosis kegagalan umum: identifier yang tidak terdaftar, izin Info.plist yang hilang, dan tugas yang tidak pernah berjalan.

## Konteks dan Motivasi

Pengguna mengharapkan aplikasi terasa instan, tetapi data yang mereka butuhkan sering berubah saat aplikasi ditutup — feed berita, peta offline, antrean unggah foto, atau unduhan video yang seharusnya selesai semalaman. Menjalankan pekerjaan itu di latar depan menghabiskan baterai dan merusak pengalaman pengguna; menjalankannya secara naif di latar belakang membuat aplikasi Anda dihentikan (killed).

iOS menyelesaikan ini dengan kontrak eksekusi latar belakang yang ketat. Sistem yang memutuskan *kapan* aplikasi Anda boleh berjalan, berdasarkan kondisi perangkat, level baterai, dan pola pemakaian pengguna. Aplikasi yang menghormati kontrak akan dijadwalkan dengan andal; aplikasi yang mencoba menjaga dirinya tetap hidup dengan trik diam-diam akan ditangguhkan, dihentikan, atau ditolak dalam proses review. Tutorial ini mengajarkan Anda bekerja *sesuai* kontrak — perbedaan antara penjadwal yang berjalan pukul 02.00 dan yang tidak pernah berjalan sama sekali hampir selalu adalah kesalahan konfigurasi atau API yang kecil.

## Konten Inti

### Siklus Hidup Aplikasi iOS dan Status Background

Aplikasi iOS bergerak melalui lima status: `Not Running`, `Inactive`, `Active`, `Background`, dan `Suspended`. Status `Background` adalah jendela singkat — biasanya beberapa detik — yang diberikan ketika pengguna meninggalkan aplikasi atau sebuah peristiwa membangunkan aplikasi. Dalam status ini Anda mendapat waktu untuk:

- Menyelesaikan pekerjaan yang sedang berjalan dan menyimpan status.
- Merespons tugas latar belakang yang diluncurkan (melalui `BGTaskScheduler`).
- Melanjutkan transfer `URLSession` latar belakang yang sedang berlangsung.
- Merespons notifikasi push, peristiwa lokasi, atau audio latar belakang (saat mode latar belakang yang sesuai diaktifkan).

Saat waktu Anda habis, UIKit memanggil `applicationDidEnterBackground`, dan tidak lama kemudian aplikasi ditangguhkan: kode berhenti berjalan, timer berhenti, dan proses dibekukan. Satu-satunya cara untuk menjalankan kode nanti adalah cara-cara yang dibahas tutorial ini — Anda tidak bisa menggunakan `Timer` atau `DispatchQueue.asyncAfter` untuk "membangunkan diri sendiri".

### BGTaskScheduler: Dua Kelas Tugas

`BGTaskScheduler` (diperkenalkan di iOS 13) mengelola dua jenis pekerjaan:

| Kelas tugas | Paling cocok untuk | Frekuensi | Kondisi |
|-------------|--------------------|-----------|---------|
| `BGAppRefreshTask` | Pembaruan kecil dan cepat (mengambil data baru, pembaruan badge) | Ditentukan sistem, kira-kira beberapa kali per hari | Oportunistik; berjalan saat perangkat dipakai atau di Wi-Fi, sering digabung dengan peluncuran aplikasi |
| `BGProcessingTask` | Pekerjaan berat (unggahan, pemrosesan media, pemeliharaan basis data, unduhan besar) | Jauh lebih jarang — biasanya sekali sehari atau kurang | Biasanya membutuhkan perangkat terhubung daya dan Wi-Fi; dapat berjalan beberapa menit |

Keduanya dijadwalkan *di muka* dengan memanggil `submit(_:)`. Saat sistem memutuskan momennya tepat, sistem meluncurkan aplikasi Anda di latar belakang dan memanggil handler yang Anda daftarkan untuk identifier tersebut. Sebuah handler harus:

1. Menerima tugas dan segera mengambil expiration handler-nya (`AsyncTask`/`BGTask` mengekspos `expirationHandler`).
2. Melakukan pekerjaan, atau melahirkan `Task` untuk pekerjaan itu sementara handler menunggu.
3. Memanggil `task.setTaskCompleted(success:)` setelah selesai — atau membiarkan expiration handler berjalan jika waktu habis.

Tugas yang tidak pernah memanggil `setTaskCompleted` menghabiskan anggaran, dan sistem dapat mengklasifikasikan aplikasi sebagai berperilaku buruk.

### Menyiapkan Kapabilitas Background Modes

Identifier tugas latar belakang berada di `Info.plist` di bawah `BGTaskSchedulerPermittedIdentifiers`, dan kapabilitasnya sendiri harus diaktifkan di tab Signing & Capabilities target:

```text
Capability: Background Modes
  ✓ Background fetch (mengaktifkan penjadwalan BGAppRefreshTask)
  ✓ Background processing (mengaktifkan penjadwalan BGProcessingTask)
```

Entri plist harus cocok persis dengan identifier:

```xml
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
    <string>com.example.myapp.refresh</string>
    <string>com.example.myapp.upload</string>
</array>
```

Ketidakcocokan antara identifier yang didaftarkan dan entri plist adalah penyebab paling umum tugas "tidak pernah berjalan". Sistem diam-diam mengabaikan identifier yang tidak dikenalnya.

### Registrasi Saat Peluncuran

Daftarkan handler lebih awal — di `application(_:didFinishLaunchingWithOptions:)` — sehingga peluncuran latar belakang memiliki handler yang siap sebelum sistem mengirimkan tugas:

```swift
import UIKit
import BackgroundTasks

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "com.example.myapp.refresh",
            using: nil
        ) { task in
            self.handleAppRefresh(task: task as! BGAppRefreshTask)
        }

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "com.example.myapp.upload",
            using: nil
        ) { task in
            self.handleProcessing(task: task as! BGProcessingTask)
        }

        return true
    }
}
```

### Mengimplementasikan Tugas App Refresh

Tugas refresh pendek — anggap sebagai kerabat yang lebih ketat dari `application(_:performFetchWithCompletionHandler:)`. Jadwalkan refresh *berikutnya* sebelum pekerjaan selesai, sehingga selalu ada permintaan yang tertunda di penjadwal:

```swift
func handleAppRefresh(task: BGAppRefreshTask) {
    // 1. Ambil expiration handler di awal.
    let expiration = task.expirationHandler
    // 2. Jadwalkan refresh berikutnya segera (pengiriman dini, lihat di bawah).
    scheduleAppRefresh()

    let operation = Task { @MainActor in
        do {
            try await FeedStore.shared.refresh()
            task.setTaskCompleted(success: true)
        } catch {
            task.setTaskCompleted(success: false)
        }
    }

    // 3. Jika sistem mengambil kembali waktu, batalkan pekerjaan yang berjalan.
    task.expirationHandler = {
        operation.cancel()
        expiration?()
    }
}
```

Poin-poin penting:

- `scheduleAppRefresh()` dipanggil *di dalam* handler, bukan setelah selesai. Jika sebuah handler selesai tanpa mengirimkan permintaan baru, aplikasi kehilangan slotnya di antrean penjadwal.
- Expiration handler harus membatalkan `Task` yang sedang berjalan — jika tidak, aplikasi terus bekerja melewati anggarannya dan dihentikan di tengah penulisan, berisiko merusak status.
- Status apa pun yang ditulis selama tugas harus ditulis secara atomik atau bersifat idempoten, karena kedaluwarsa dapat memotong pekerjaan di byte mana pun.

### Mengimplementasikan Tugas Processing

Tugas processing dapat berjalan menit-menit dengan daya + Wi-Fi, tetapi disiplin yang sama berlaku — dan taruhannya lebih tinggi karena kesabaran sistem tidak tanpa batas:

```swift
func handleProcessing(task: BGProcessingTask) {
    let expiration = task.expirationHandler

    // Jadwalkan ulang untuk malam berikutnya sebelum melakukan pekerjaan berat.
    scheduleProcessingTask()

    let operation = Task {
        do {
            try await MediaUploader.shared.drainQueue()
            try await VideoDownloader.shared.resumePending()
            task.setTaskCompleted(success: true)
        } catch {
            task.setTaskCompleted(success: false)
        }
    }

    task.expirationHandler = {
        operation.cancel()
        expiration?()
    }
}
```

Pengaman dunia nyata yang harus Anda tambahkan:

- Periksa `ProcessInfo.processInfo.isLowPowerModeEnabled` dan lewati seluruhnya pekerjaan berat saat mode tersebut aktif — pengguna memilih hemat baterai, dan tugas akan dijadwalkan ulang untuk jendela yang lebih sesuai.
- Pecah pekerjaan panjang menjadi titik-titik pemeriksaan. Jika antrean unggah Anda memiliki 400 item, pertahankan kursor setelah setiap batch 25 item, sehingga eksekusi yang kedaluwarsa melanjutkan dari tempat berhenti alih-alih memulai dari awal.
- Gunakan `NSProgress` atau callback progres untuk memantau kemajuan; sistem dapat menggunakannya untuk membuat keputusan penjadwalan yang lebih cerdas pada versi OS yang lebih baru.

### Background URLSession: Unduhan yang Bertahan Saat Suspensi

`BGAppRefreshTask` untuk pekerjaan cepat, tetapi unduhan media 2 GB tidak muat di jendela tugas mana pun. Untuk itu, iOS menyediakan transfer *latar belakang*: `URLSession` yang dikonfigurasi dengan identifier background yang dilanjutkan sistem bahkan saat aplikasi Anda ditangguhkan atau dihentikan.

```swift
import Foundation

final class DownloadManager: NSObject, URLSessionDownloadDelegate {

    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.background(withIdentifier: "com.example.myapp.downloads")
        config.sessionSendsLaunchEvents = true
        config.isDiscretionary = true           // biarkan sistem menunggu daya + Wi-Fi
        config.waitsForConnectivity = true      // antrekan alih-alih gagal di jaringan tidak stabil
        return URLSession(configuration: config, delegate: self, delegateQueue: nil)
    }()

    func enqueue(_ url: URL) {
        let request = URLRequest(url: url)
        let task = session.downloadTask(with: request)
        task.resume()
    }

    func urlSession(
        _ session: URLSession,
        downloadTask: URLSessionDownloadTask,
        didFinishDownloadingTo location: URL
    ) {
        // Pindahkan file dari lokasi sementara SEGERA — file akan dihapus
        // ketika callback kembali.
        let destination = FileManager.default
            .temporaryDirectory
            .appendingPathComponent(UUID().uuidString + ".mp4")
        try? FileManager.default.moveItem(at: location, to: destination)
        // Lalu serahkan ke lapisan penyimpanan Anda dan pertahankan metadata.
    }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: Error?
    ) {
        if let error = error {
            handle(error) // kegagalan jaringan, penyimpanan tidak cukup, dll.
        }
    }
}
```

Aturan penting untuk transfer latar belakang:

- Saat transfer selesai (atau gagal), sistem meluncurkan ulang aplikasi Anda *di latar belakang* dan memanggil `application(_:handleEventsForBackgroundURLSession:completionHandler:)` pada app delegate. Anda harus menyimpan completion handler hingga delegate sesi menyelesaikan semua callback:

```swift
func application(
    _ application: UIApplication,
    handleEventsForBackgroundURLSession identifier: String,
    completionHandler: @escaping () -> Void
) {
    // Buat ulang konfigurasi sesi yang SAMA (identifier sama) sehingga
    // sistem menghubungkan ulang aplikasi ke transfer yang sedang berjalan.
    backgroundSessionCompletionHandler = completionHandler
    _ = DownloadManager.shared.session
}
```

- Panggil completion handler yang disimpan di `urlSessionDidFinishEvents(forBackgroundURLSession:)`; aplikasi akan dihentikan jika tidak dipanggil tepat waktu.

### Menjadwalkan dan Mengirimkan Pekerjaan

Pengiriman selalu melalui `BGTaskScheduler` bersama:

```swift
func scheduleAppRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: "com.example.myapp.refresh")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // paling cepat 15 menit
    do {
        try BGTaskScheduler.shared.submit(request)
    } catch {
        // BGError: .tooManyPendingTaskRequests, .notPermitted, .unavailable, ...
        print("Submit gagal: \(error)")
    }
}

func scheduleProcessingTask() {
    let request = BGProcessingTaskRequest(identifier: "com.example.myapp.upload")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 60 * 60)
    request.requiresNetworkConnectivity = true
    request.requiresExternalPower = true
    do {
        try BGTaskScheduler.shared.submit(request)
    } catch {
        print("Submit gagal: \(error)")
    }
}
```

`earliestBeginDate` adalah *petunjuk* — sistem tidak pernah wajib menjalankan tugas Anda lebih awal, hanya tidak menjalankannya sebelum waktu itu. Perlakukan sebagai "jangan jalankan sebelum X", bukan "jalankan pada X". Semakin banyak flag diskresioner yang Anda tetapkan, semakin banyak kebebasan penjadwalan yang dimiliki sistem, dan semakin andal tugas Anda akhirnya berjalan.

### Menguji Tugas Latar Belakang dalam Pengembangan

Waktu penjadwalan nyata mustahil ditunggu dalam loop pengembangan. Xcode menyediakan kaitan debugger yang memicu tugas secara langsung:

```bash
# Luncurkan aplikasi dengan debugger tugas latar belakang diaktifkan:
e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"com.example.myapp.refresh"]

# Dan untuk mensimulasikan kedaluwarsa segera:
e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateExpirationForTaskWithIdentifier:@"com.example.myapp.refresh"]
```

Jalankan ini di LLDB saat aplikasi ditangguhkan. Catatan:

- API privat ini hanya berfungsi di build debug; hapus dari kode rilis.
- Uji pada perangkat fisik — di Simulator, penjadwal tidak melakukan peluncuran seperti di perangkat keras.
- Amati `_simulateLaunchForTaskWithIdentifier:` memicu handler yang terdaftar, lalu pastikan `setTaskCompleted` dipanggil dengan memeriksa konsol.

### Jebakan Umum

- **Identifier tidak cocok**: `register(forTaskWithIdentifier:)`, `BGTaskSchedulerPermittedIdentifiers`, dan `BGTaskSchedulerRequest` harus menggunakan string yang sama persis. Salin-tempel dari satu konstanta.
- **Lupa menjadwalkan ulang**: handler yang tidak pernah mengirimkan permintaan berikutnya menyebabkan aplikasi keluar dari jadwal sepenuhnya.
- **Membocorkan expiration handler**: ambil dulu, lalu timpa `task.expirationHandler` dengan pembungkus Anda sendiri. Jika tidak pernah menimpanya, kedaluwarsa default membatalkan tugas secara diam-diam dan kode pembersihan Anda tidak pernah berjalan.
- **Pekerjaan mahal di `sceneDidEnterBackground`**: callback ini berjalan *sebelum* suspensi tetapi tidak memberi banyak waktu; tugas latar belakang seharusnya berada di handler khusus, bukan di callback siklus hidup.
- **Memanggil completion handler dua kali**: untuk sesi latar belakang, completion `handleEventsForBackgroundURLSession` harus dipanggil tepat sekali, setelah callback delegate terakhir.
- **Perilaku yang memusuhi baterai**: membuang `isDiscretionary` dan `requiresExternalPower` membuat transfer berjalan dalam kondisi buruk, yang dihukum sistem dengan slot penjadwalan yang semakin jarang.

## Contoh Kode

### Pipeline Lengkap Pembaruan Cache + Unggah

Aplikasi berikut menggabungkan kedua kelas tugas dan sesi latar belakang dalam satu pipeline realistis. Aplikasi menyegarkan feed JSON di setiap jendela refresh dan menguras antrean unggah foto selama jendela processing.

```swift
import UIKit
import BackgroundTasks

struct AppConfiguration {
    static let refreshID = "com.example.myapp.refresh"
    static let uploadID = "com.example.myapp.upload"
    static let sessionID = "com.example.myapp.uploads"
}

final class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: AppConfiguration.refreshID,
            using: nil
        ) { task in
            self.handleRefresh(task: task as! BGAppRefreshTask)
        }

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: AppConfiguration.uploadID,
            using: nil
        ) { task in
            self.handleUpload(task: task as! BGProcessingTask)
        }

        return true
    }

    private func handleRefresh(task: BGAppRefreshTask) {
        let originalExpiration = task.expirationHandler
        Self.scheduleRefresh()

        let work = Task {
            do {
                try await FeedStore.shared.refresh()
                task.setTaskCompleted(success: true)
            } catch {
                task.setTaskCompleted(success: false)
            }
        }

        task.expirationHandler = {
            work.cancel()
            originalExpiration?()
        }
    }

    private func handleUpload(task: BGProcessingTask) {
        let originalExpiration = task.expirationHandler
        Self.scheduleUpload()

        let work = Task {
            // Pengurasan dengan titik pemeriksaan: antrean menyimpan kursor setiap batch.
            do {
                try await UploadQueue.shared.drainBatchIfNeeded()
                task.setTaskCompleted(success: true)
            } catch {
                task.setTaskCompleted(success: false)
            }
        }

        task.expirationHandler = {
            work.cancel()
            originalExpiration?()
        }
    }

    static func scheduleRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: AppConfiguration.refreshID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    static func scheduleUpload() {
        let request = BGProcessingTaskRequest(identifier: AppConfiguration.uploadID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 60 * 60)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = true
        try? BGTaskScheduler.shared.submit(request)
    }
}
```

### Sesi Latar Belakang yang Dibalut Actor

Bug umum adalah berbagi `URLSession` lintas thread. Actor yang memiliki sesi akan menyerialkan akses dan membuat callback delegate bebas dari kondisi balapan:

```swift
actor DownloadCoordinator: URLSessionDownloadDelegate {

    nonisolated private lazy var session: URLSession = {
        let config = URLSessionConfiguration.background(withIdentifier: "com.example.myapp.downloads")
        config.isDiscretionary = true
        config.waitsForConnectivity = true
        return URLSession(configuration: config, delegate: self, delegateQueue: nil)
    }()

    var pendingCompletion: (() -> Void)?

    func enqueue(url: URL) {
        session.downloadTask(with: URLRequest(url: url)).resume()
    }

    nonisolated func urlSession(
        _ session: URLSession,
        downloadTask: URLSessionDownloadTask,
        didFinishDownloadingTo location: URL
    ) {
        // Callback delegate nonisolated — serahkan jalur file ke actor.
        let destination = Self.persist(location: location)
        Task { await self.record(destination: destination, task: downloadTask) }
    }

    nonisolated func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        Task { await self.issueCompletion() }
    }

    private func record(destination: URL, task: URLSessionDownloadTask) {
        // Perbarui metadata library aplikasi.
    }

    private func issueCompletion() {
        pendingCompletion?()
        pendingCompletion = nil
    }

    private static func persist(location: URL) -> URL {
        let dest = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
        try? FileManager.default.moveItem(at: location, to: dest)
        return dest
    }
}
```

### Memverifikasi Jadwal saat Runtime

Tambahkan layar debug kecil yang mencetak apa yang tertunda di penjadwal, sehingga Anda dapat memastikan logika pengiriman ulang benar-benar mendaftarkan permintaan baru:

```swift
func pendingTaskStatus() async {
    let pending = await BGTaskScheduler.shared.pendingTaskRequests()
    for request in pending {
        print("Pending: \(request.identifier)")
    }
}
```

## Insight Penting

- **Jadwalkan lebih awal, jadwalkan selalu**: kirimkan permintaan *berikutnya* di awal setiap handler. Penjadwal tidak menyimpan memori tentang aplikasi Anda antar peluncuran, dan handler yang tidak mengirim ulang akan diam-diam menghapus aplikasi dari jendela-jendela mendatang.
- **Expiration handler adalah satu-satunya jaring pengaman Anda**: ambil yang asli, bungkus, dan batalkan `Task` yang sedang berjalan di dalamnya. Melewatkan ini berarti pekerjaan berlanjut melewati anggaran dan aplikasi dihentikan di tengah penulisan.
- **Sesi latar belakang untuk transfer, tugas untuk pekerjaan**: `BGAppRefreshTask`/`BGProcessingTask` menjalankan *kode*; `URLSession` latar belakang memindahkan *data*. Gabungkan keduanya: gunakan tugas processing untuk melanjutkan unduhan yang tertunda, dan biarkan sesi membawa transfernya.
- **`earliestBeginDate` adalah lantai, bukan alarm**: ia tidak pernah membuat pekerjaan berjalan lebih cepat; ia hanya melarang eksekusi lebih awal. Tetapkan kondisi diskresioner dan biarkan sistem memilih momen terbaik.
- **Jebakan — konsistensi identifier**: satu string yang dibagi antara `BGTaskSchedulerPermittedIdentifiers`, panggilan `register`, dan permintaan. Satu salah ketik menghasilkan tugas yang diabaikan secara diam-diam.
- **Pertimbangan performa**: setiap detik eksekusi latar belakang menghabiskan baterai. Utamakan `requiresExternalPower` + `requiresNetworkConnectivity` untuk pekerjaan berat, hormati Low Power Mode, dan rancang pekerjaan agar dapat dilanjutkan sehingga eksekusi yang kedaluwarsa tidak menyia-nyiakan apa pun.

## Langkah Berikutnya

- Pelajari Panduan Optimasi Performa Swift untuk rekayasa baterai dan waktu peluncuran yang lebih dalam (`guides/swift-performance-optimization-guide.md`).
- Jelajahi panduan Keamanan dan Proteksi Data iOS untuk melindungi file yang ditulis oleh pekerjaan latar belakang dengan level akses Keychain yang benar (`guides/swift-ios-security-data-protection-guide.md`).
- Padukan tutorial ini dengan panduan konkurensi Swift (`guides/swift-concurrency-async-await-actors-guide.md`) untuk memodelkan pekerjaan jangka panjang dengan actor dan task group.

## Kesimpulan

Anda sekarang memahami kontrak lengkap eksekusi latar belakang di iOS: siklus hidup aplikasi, dua kelas tugas `BGTaskScheduler`, transfer `URLSession` latar belakang, dan disiplin penjadwalan yang membuat pekerjaan latar belakang andal dan ramah baterai. Anda dapat mendaftarkan identifier, mengirimkan permintaan dengan kondisi yang tepat, menangani kedaluwarsa tanpa merusak status, dan menguji perilaku penjadwalan nyata dengan hook simulasi LLDB. Yang terpenting, Anda mengetahui mode kegagalannya — ketidakcocokan identifier, pengiriman ulang yang hilang, dan completion handler yang terlupakan — yang memisahkan penjadwal yang berjalan pukul 02.00 dari yang tidak pernah berjalan sama sekali.

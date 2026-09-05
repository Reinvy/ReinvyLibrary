---
title: "Panduan Keamanan dan Perlindungan Data iOS dengan Swift"
description: "Panduan mendalam yang membahas perlindungan Keychain, kelas proteksi data, App Transport Security, sertifikat pinning, LocalAuthentication, Secure Enclave, dan deteksi jailbreak untuk aplikasi iOS."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Keamanan dan Perlindungan Data iOS dengan Swift

## Pendahuluan

iOS adalah salah satu platform konsumen paling terkunci di dunia, tetapi keamanan bawaan platform yang kuat tidak membuat aplikasi Anda aman dengan sendirinya. Menyimpan token akses di `UserDefaults`, mencatat kata sandi ke konsol, atau menurunkan lalu lintas HTTP secara diam-diam dapat membocorkan data pengguna bahkan pada perangkat yang sudah diperbarui penuh. Panduan ini berfokus pada kontrol keamanan yang benar-benar Anda kendalikan dari Swift: melindungi rahasia dengan Keychain, mengenkripsi file saat disimpan dengan kelas Data Protection, memaksakan HTTPS dengan App Transport Security, memverifikasi identitas server dengan sertifikat pinning, mengautentikasi pengguna dengan Face ID dan Touch ID, serta bertahan dari lingkungan yang sudah diotak-atik (jailbreak) — sambil tetap menjelaskan trade-off antara keamanan dan kemudahan penggunaan.

Panduan ini mengasumsikan Anda sudah merilis aplikasi iOS dan memahami dasar-dasar konkurasi serta networking di Swift. Setiap rekomendasi di sini dibingkai dalam model ancaman yang realistis: musuh seperti apa yang Anda hadapi, berapa biaya mitigasinya, dan bagaimana memverifikasi bahwa kontrolnya benar-benar berfungsi.

## Praktik Terbaik

### 1. Simpan Rahasia di Keychain, Jangan Pernah di UserDefaults

Keychain adalah database terenkripsi yang didukung perangkat keras dan dikelola oleh `securityd`. Item di dalamnya dienkripsi dengan kunci perangkat yang diturunkan dari hardware UID dan tanda tangan kode aplikasi Anda, sehingga tidak dapat dibaca oleh aplikasi lain di perangkat yang sama dan akan hancur saat aplikasi dihapus. Sebaliknya, `UserDefaults` menulis plist teks polos ke dalam kontainer aplikasi, yang dapat dibaca oleh siapa pun dengan perangkat jailbreak, salinan cadangan, atau akses sistem file melalui debugger. Aturan praktisnya:

- Simpan token akses, token refresh, kata sandi, kunci API, dan kunci kriptografi di Keychain.
- Simpan hanya preferensi yang tidak sensitif (tema, fitur flag) di `UserDefaults`.
- Jangan pernah menyimpan token di `UserDefaults` "sementara" — data sementara cenderung menjadi permanen.
- Selalu set `kSecAttrAccessible` secara eksplisit; bawaan mungkin tidak sesuai kebutuhan Anda.
- Buang spasi dan baris baru dari string sebelum di-hash atau dibandingkan, dan selalu bandingkan nilai sensitif dengan utilitas waktu-konstan jika tersedia.

Untuk passcode per-aplikasi atau pembukaan fitur, kombinasikan Keychain dengan level aksesibilitas `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` (lihat di bawah) alih-alih membuat enkripsi sendiri.

### 2. Pilih Level Aksesibilitas Keychain dengan Hati-Hati

Atribut `kSecAttrAccessible` mengontrol **kapan** sebuah item Keychain dapat dibaca, dan varian `ThisDeviceOnly` mencegah item dipindahkan ke cadangan iCloud Keychain atau ke perangkat lain. Pilih level paling ketat yang masih memungkinkan fitur Anda:

- `kSecAttrAccessibleWhenUnlocked` — dapat dibaca selama perangkat tidak terkunci; item menjadi tidak terbaca saat perangkat terkunci. Default yang baik untuk token sesi.
- `kSecAttrAccessibleAfterFirstUnlock` — dapat dibaca setelah perangkat pertama kali dibuka, termasuk saat terkunci setelahnya. Diperlukan untuk tugas latar belakang seperti penanganan notifikasi push yang berjalan sebelum pengguna membuka kunci perangkat.
- `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` / `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` — sama seperti di atas tetapi tidak pernah dicadangkan atau disinkronkan via iCloud; paling disarankan untuk sebagian besar token aplikasi.
- `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` — hanya dapat dibaca saat perangkat tidak terkunci **dan** passcode aktif; jika pengguna tidak memiliki passcode, item tidak dapat dibuat sama sekali. Gunakan untuk rahasia paling sensitif seperti kunci pembayaran atau kunci enkripsi utama.

Perlu dicatat bahwa `kSecUseDataProtectionKeychain` sudah usang dan tidak perlu lagi — proteksi data Keychain selalu aktif di iOS 13 dan seterusnya.

### 3. Lindungi File dengan Kelas Data Protection

Setiap file di kontainer aplikasi iOS dapat diberi kelas Data Protection yang mengikat kunci enkripsi file ke status kunci perangkat. Sistem mengenkripsi isi file dengan kunci per-file, yang dibungkus oleh kunci kelas yang hanya tersedia dalam kondisi buka tertentu:

| Kelas proteksi | Ketersediaan | Contoh penggunaan |
|---|---|---|
| `complete` | Hanya saat perangkat tidak terkunci | Riwayat chat, draf, data akun yang ditampilkan di UI |
| `completeUnlessOpen` | Saat tidak terkunci; file yang sudah terbuka tetap terbaca saat terkunci | Pemutaran media, file yang ditulis oleh tugas latar belakang |
| `completeUntilFirstUserAuthentication` | Setelah pembukaan pertama, termasuk saat terkunci setelahnya | Default untuk sebagian besar aplikasi; cocok untuk cache dan konten unduhan |
| `none` | Selalu | Cache tidak sensitif dengan volume tinggi |

Default untuk file yang dibuat aplikasi adalah `completeUntilFirstUserAuthentication`, sebab itu file yang dibuat oleh fetch latar belakang masih dapat dibaca saat perangkat terkunci. Jika file berisi data pengguna sensitif yang seharusnya hanya terlihat dalam sesi tidak terkunci, tandai `complete` secara eksplisit.

### 4. Paksakan HTTPS dengan App Transport Security

App Transport Security (ATS) aktif secara bawaan dan memblokir koneksi `http://` teks polos dari `URLSession`, `NSURLConnection`, dan API terkait. Jangan pernah menonaktifkannya secara global: kunci `NSAllowsArbitraryLoads` membutuhkan justifikasi saat peninjauan App Store dan membuka setiap permintaan terhadap intersepsi pasif. Jika harus berbicara dengan endpoint HTTP lawas, tambahkan pengecualian sempit untuk domain itu saja, dan utamakan `NSExceptionAllowsInsecureHTTPLoads = false` dengan jalur migrasi ke depan. Perhatikan juga bahwa ATS **tidak** berlaku untuk `WKWebView` — jika Anda menyematkan konten web yang memuat sumber daya jarak jauh, konfigurasikan Content Security Policy (CSP) di sisi server dan pertimbangkan untuk membatasi navigasi.

### 5. Pasang Sertifikat untuk Endpoint Kritis

Transport Layer Security melindungi dari penyadapan pasif, tetapi rantai sertifikat server diverifikasi terhadap sekumpulan root CA publik — artinya CA mana pun yang salah menerbitkan sertifikat untuk domain Anda (atau CA yang dikompromikan) dapat menyamar sebagai API Anda. Sertifikat atau public key pinning memaksa klien untuk hanya menerima sertifikat/kunci publik yang dikenal, meningkatkan standar terhadap serangan man-in-the-middle. Pasang **kunci publik**, bukan sertifikat, sehingga Anda bertahan dari rotasi sertifikat selama pasangan kunci masih stabil:

- Pasang digest SHA-256 SPKI (SubjectPublicKeyInfo) dari kunci penandatangan API Anda.
- Simpan minimal dua pin (kunci saat ini + kunci cadangan) agar rotasi kunci tidak mengunci pengguna.
- Gagal-tutup (fail closed) pada pin yang tidak dikenal, tetapi catat ketidakcocokan pin untuk diagnosis.
- Pertimbangkan pustaka seperti TrustKit untuk manajemen kebijakan dan pelaporan, atau implementasikan pinning manual di `URLSessionDelegate` (ditunjukkan di langkah implementasi).

### 6. Wajibkan Biometrik dengan LocalAuthentication

`LocalAuthentication` memungkinkan Anda meminta Face ID atau Touch ID tanpa aplikasi Anda pernah melihat data biometrik — perbandingan terjadi di dalam Secure Enclave. Gunakan `LAContext.canEvaluatePolicy` untuk memeriksa ketersediaan, dan selalu berikan string `localizedReason` yang bisa dipahami pengguna (sistem menampilkannya di prompt). Untuk operasi bernilai tinggi (membuka dompet, mengungkap kunci utama), evaluasi access control yang menggabungkan fallback passcode dengan kemampuan biometrik, dan perlakukan autentikasi gagal dengan backoff eksponensial alih-alih mengizinkan percobaan tanpa batas. Ingat bahwa `deviceOwnerAuthentication` menyertakan passcode perangkat sebagai fallback, sedangkan `deviceOwnerAuthenticationWithBiometrics` tidak.

### 7. Simpan Kunci Kriptografi di Secure Enclave

Untuk kunci asimetris yang menandatangani atau mendekripsi data sensitif (alur ala Apple Pay, pasangan kunci E2EE, lisensi aplikasi), buat kunci di dalam Secure Enclave dengan `SecKeyCreateRandomKey` dan atribut `kSecAttrTokenIDSecureEnclave`. Materi kunci privat tidak pernah keluar dari Enclave — bahkan OS pun tidak dapat mengekspornya — dan Anda dapat mewajibkan otorisasi biometrik untuk setiap penggunaan dengan melampirkan `SecAccessControl` ber-`biometryCurrentSet`. Gunakan pola ini alih-alih menyimpan blob kunci privat mentah di Keychain, yang masih bisa digunakan oleh siapa pun yang memiliki akses ke item Keychain tersebut.

### 8. Pertahankan Diri dari Lingkungan yang Diotak-Atik

Lingkungan jailbreak dan perangkat yang dimodifikasi mengalahkan banyak jaminan iOS: pembatasan sandbox dilonggarkan, akses sistem file setara root, dan patching runtime (misalnya Frida) dimungkinkan. Jika aplikasi Anda menangani uang, konten berlisensi, atau data yang diatur, lapisi dengan pemeriksaan integritas, tetapi perlakukan itu sebagai **pencegahan, bukan jaminan mutlak** — setiap teknik deteksi jailbreak dapat dilewati dengan usaha yang cukup. Sinyal yang berguna:

- Keberadaan artefak jailbreak (Cydia, MobileSubstrate, SSH, Apt).
- Kemampuan menulis di luar sandbox.
- Deteksi keterpasangan debugger (`sysctl` dengan `P_TRACED`).
- Validasi tanda tangan kode dengan `SecStaticCodeCheckValidity`.

Lindungi juga dari kegagalan integritas yang lebih sederhana: app switcher memotret UI Anda secara bawaan, jadi sembunyikan layar sensitif (saldo bank, pratinjau chat) dari tangkapan layar dengan menutup jendela saat aplikasi kehilangan status aktif.

### 9. Hindari Kesalahan Secure-Coding yang Umum

- **Mencatat rahasia**: jangan pernah mencatat token, kata sandi, atau data pembayaran; gunakan redaksi privasi `OSLog` (`\(token, privacy: .private)`) dan tandai kolom publik secara eksplisit.
- **Deserialisasi tidak aman**: gunakan `Codable` dengan model yang ketat, atau `NSSecureCoding` untuk data `NSKeyedArchiver`; jangan pernah membongkar arsip dari sumber tidak tepercaya dengan `unarchiveTopLevelObjectWithData` tanpa secure coding aktif.
- **Jebakan WebView**: hindari `UIWebView` lawas (sudah usang) dan muat konten jarak jauh di `WKWebView` hanya jika diperlukan; nonaktifkan fitur yang tidak Anda pakai (`javaScriptCanOpenWindowsAutomatically`, `allowsBackForwardNavigationGestures` bila sesuai).
- **Kebocoran salin-tempel**: kolom sensitif yang tidak boleh disalin harus mengatur `UITextField.isSecureTextEntry` atau memakai nilai tertutup di UI; pertimbangkan menonaktifkan paste di konteks sensitif.
- **Payload push**: jangan pernah menaruh konten sensitif di payload notifikasi push — payload transit melalui server Apple dan muncul di pusat notifikasi; kirim notifikasi senyap dan ambil kontennya lewat TLS sebagai gantinya.

### 10. Perkuat Rantai Pasokan

Framework pihak ketiga membawa permukaan serangan yang sama besarnya dengan kode Anda sendiri, dan dependensi yang dikompromikan adalah vektor serangan yang populer. Mitigasi:

- Pasang versi eksak di `Package.resolved` (Xcode mencatat revisi dan checksum yang terselesaikan).
- Tinjau dependensi baru untuk status pemeliharaan, lisensi, dan cakupan izin; utamakan paket kecil dan fokus daripada paket monolitik.
- Tambahkan pemindaian dependensi (OWASP Dependency-Check, Snyk, atau GitHub Dependabot) ke CI.
- Verifikasi identitas pengirim saat mengunduh framework biner; utamakan Swift Package Manager atau CocoaPods daripada biner yang dijatuhkan manual.

## Langkah Implementasi

### Langkah 1: Definisikan Model Ancaman

Tuliskan apa yang Anda lindungi, dari siapa, dan apa yang terjadi jika bocor:

1. Inventarisasi data sensitif: token, kata sandi, data pembayaran, PII, kunci privat.
2. Identifikasi musuh yang realistis: pencurian data biasa dari perangkat yang dicuri, malware di perangkat, penyerang jaringan, CA jahat, pengguna jailbreak, akses orang dalam ke cadangan.
3. Untuk setiap item, pilih kontrol termurah yang memitigasi ancaman: Keychain `ThisDeviceOnly` untuk token, Data Protection `complete` untuk file, ATS + pinning untuk jaringan, LocalAuthentication untuk aksi bernilai tinggi.

Simpan dokumen ini di repositori; itu adalah justifikasi yang dibutuhkan peninjau dan maintainer masa depan.

### Langkah 2: Tambahkan Wrapper Keychain dengan Aksesibilitas Eksplisit

Buat layanan Keychain kecil yang mudah diuji. Gunakan `kSecClassGenericPassword` dengan bundle identifier Anda sebagai nama layanan untuk memberi namespace pada item:

```swift
import Foundation
import Security

struct KeychainStore {
    let service: String = Bundle.main.bundleIdentifier ?? "com.example.app"

    func save(_ data: Data, key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecValueData as String: data
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        if status == errSecDuplicateItem {
            try update(data, key: key)
        } else if status != errSecSuccess {
            throw KeychainError(status: status)
        }
    }

    func read(key: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw KeychainError(status: status) }
        return result as? Data
    }

    func delete(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError(status: status)
        }
    }

    private func update(_ data: Data, key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        let attributes: [String: Any] = [kSecValueData as String: data]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        guard status == errSecSuccess else { throw KeychainError(status: status) }
    }
}

struct KeychainError: Error {
    let status: OSStatus
    init(status: OSStatus) { self.status = status }
}
```

Migrasikan token lama yang tersimpan di `UserDefaults` dengan membacanya sekali, menyimpannya di Keychain, lalu menghapus kunci `UserDefaults` tersebut. Rilis migrasi ini dalam versi yang sama dengan pengenalan wrapper Keychain.

### Langkah 3: Lindungi File Sensitif dengan Data Protection

Untuk file yang seharusnya hanya dapat dibaca saat perangkat tidak terkunci, minta kelas `complete` saat pembuatan:

```swift
let fileURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    .appendingPathComponent("drafts.json")

let data = try JSONEncoder().encode(draft)
try data.write(to: fileURL, options: [.completeFileProtection])
```

Untuk file yang sudah ada, set atributnya secara eksplisit:

```swift
try FileManager.default.setAttributes(
    [.protectionKey: FileProtectionType.complete],
    ofItemAtPath: fileURL.path
)
```

Jika Anda menggunakan Core Data, terapkan proteksi ke persistent store; store bawaan hanya `completeUntilFirstUserAuthentication`:

```swift
let storeDescription = NSPersistentStoreDescription(url: storeURL)
storeDescription.setOption(FileProtectionType.complete as NSObject,
                           forKey: NSPersistentStoreFileProtectionKey)
container.persistentStoreDescriptions = [storeDescription]
```

Saat store dilindungi `complete` dan perangkat terkunci, pembacaan gagal dengan `NSFileReadNoPermissionError` atau error Core Data — tangani error itu dengan menampilkan status "buka kunci untuk melanjutkan" alih-alih crash.

### Langkah 4: Konfigurasikan ATS dan Kunci Keamanan Info.plist

Pertahankan ATS aktif secara global dan tambahkan pengecualian sempit hanya jika benar-benar diperlukan:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSAllowsLocalNetworking</key>
    <true/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>legacy-api.example.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
            <key>NSIncludesSubdomains</key>
            <false/>
        </dict>
    </dict>
</dict>
```

`NSAllowsLocalNetworking` mengizinkan koneksi jaringan lokal (localhost, `.local`, IP privat) yang berguna untuk pengembangan dan debug di perangkat tanpa melemahkan ATS untuk host publik. Hapus setiap pengecualian yang tidak lagi digunakan, dan jadwalkan pensiunnya endpoint HTTP lawas.

### Langkah 5: Implementasikan Public Key Pinning dengan URLSession

Hitung digest SHA-256 SPKI API Anda (menggunakan `openssl s_client`/`openssl x509 -pubkey` plus `sha256`, atau alat seperti `ssl-pin`), simpan digest sebagai konstanta waktu build, dan tegakkan di delegate sesi:

```swift
import CryptoKit
import Foundation

final class PinningDelegate: NSObject, URLSessionDelegate {
    private let pinnedSPKIHash: String

    init(pinnedSPKIHash: String) {
        self.pinnedSPKIHash = pinnedSPKIHash
    }

    func urlSession(_ session: URLSession,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        var secError: CFError?
        guard SecTrustEvaluateWithError(serverTrust, &secError),
              let serverKey = SecTrustCopyKey(serverTrust),
              let keyData = SecKeyCopyExternalRepresentation(serverKey, nil) as Data? else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        let digest = SHA256.hash(data: keyData)
        let digestHex = digest.map { String(format: "%02x", $0) }.joined()

        guard digestHex == pinnedSPKIHash else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        completionHandler(.useCredential, URLCredential(trust: serverTrust))
    }
}
```

Gunakan delegate saat membuat sesi:

```swift
let session = URLSession(configuration: .ephemeral,
                         delegate: PinningDelegate(pinnedSPKIHash: "..."),
                         delegateQueue: nil)
```

Simpan konstanta pin cadangan untuk generasi kunci berikutnya dan ganti pin aktif selama window pemeliharaan, jangan pernah dalam keadaan darurat. Tambahkan unit test yang memberi delegate tantangan trust yang benar dan salah lalu memastikan disposisi completion handler-nya.

### Langkah 6: Tambahkan Autentikasi Biometrik

Lindungi alur sensitif dengan Face ID atau Touch ID melalui `LocalAuthentication`:

```swift
import LocalAuthentication

enum BiometricGate {
    static func authenticate(reason: String) async throws -> Bool {
        let context = LAContext()
        var policyError: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &policyError) else {
            throw BiometricError.unavailable(policyError)
        }
        return try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)
    }
}

enum BiometricError: Error {
    case unavailable(NSError?)
}
```

Untuk kunci yang hanya boleh digunakan **setelah** persetujuan biometrik, lampirkan access control ke pembuatan item Keychain sehingga Secure Enclave yang menegakkannya:

```swift
let accessControl = SecAccessControlCreateWithFlags(
    kCFAllocatorDefault,
    kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
    [.biometryCurrentSet, .devicePasscode],
    nil
)
```

Lalu berikan `kSecAttrAccessControl: accessControl` di query Keychain; setiap pembacaan akan meminta Face ID/Touch ID.

### Langkah 7: Tambahkan Deteksi Integritas dan Jailbreak

Tambahkan modul integritas yang mandiri. Jaga tetap defensif dan tidak memblokir: catat pelanggaran, turunkan fitur jika perlu, tetapi jangan hard-crash — penyerang cukup mem-patch pemeriksaan itu dari loop crash.

```swift
import Darwin

enum IntegrityChecker {
    static func jailbreakSignals() -> [String] {
        let paths = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/usr/sbin/sshd",
            "/usr/bin/ssh",
            "/etc/apt",
            "/private/var/stash",
            "/var/lib/cydia"
        ]
        let existing = paths.filter { FileManager.default.fileExists(atPath: $0) }

        // Probe lolos-sandbox: sandbox standar menolak penulisan di sini.
        let probePath = "/private/jailbreak-probe.txt"
        let writable = (try? "probe".write(toFile: probePath, atomically: true, encoding: .utf8)) != nil

        return existing + (writable ? ["sandbox-escape-write"] : [])
    }

    static func isBeingDebugged() -> Bool {
        var info = kinfo_proc()
        var size = MemoryLayout<kinfo_proc>.stride
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        guard sysctl(&mib, u_int(mib.count), &info, &size, nil, 0) == 0 else { return false }
        return (info.kp_proc.p_flag & P_TRACED) != 0
    }
}
```

Sembunyikan layar sensitif dari tangkapan app switcher:

```swift
// Di scene delegate Anda
func sceneWillResignActive(_ scene: UIScene) {
    let shield = UIView(frame: window?.bounds ?? .zero)
    shield.backgroundColor = .systemBackground
    shield.tag = 9_001
    window?.addSubview(shield)
}

func sceneDidBecomeActive(_ scene: UIScene) {
    window?.viewWithTag(9_001)?.removeFromSuperview()
}
```

Dokumentasikan sinyal yang diharapkan dalam analytics dan beri peringatan pada lonjakan tak terduga (misalnya banyak pengguna melaporkan flag jailbreak setelah rilis adalah tanda peringatan aplikasi yang dibungkus ulang).

### Langkah 8: Audit Dependensi dan Konfigurasi Build

1. Tinjau `Package.resolved` dan pastikan setiap pin memiliki checksum serta revisi yang dikendalikan tim Anda.
2. Jalankan pemindaian kerentanan dependensi di CI dan blokir merge pada temuan tingkat tinggi.
3. Hapus framework yang tidak terpakai dan nonaktifkan kemampuan yang tidak diperlukan di file entitlement penandatanganan.
4. Pastikan build rilis menggunakan konfigurasi release dengan optimasi kompiler, dan pertimbangkan stripping simbol.

```bash
# Contoh pemeriksaan dependensi di CI (Dependabot/pemindai OSV memberi sinyal yang sama)
swift package resolve
grep -c '"checksum"' Package.resolved   # > 0 berarti pin yang terselesaikan di-checksum
```

1. Pastikan keychain access groups di entitlement cocok dengan prefiks team ID sehingga berbagi lintas-aplikasi bersifat disengaja, bukan tidak sengaja.

### Langkah 9: Tulis Tes Keamanan

Kontrol keamanan yang tidak diotomasi akan membusuk. Tambahkan tes yang menggagalkan build ketika kontrol mengalami regresi:

- Round-trip Keychain: save/read/delete berhasil dan mengembalikan byte yang sama; menghapus kunci yang tidak ada tidak melempar error.
- Konfigurasi ATS: tegaskan bahwa `Bundle.main` tidak mengandung `NSAllowsArbitraryLoads = true` di Info.plist rilis.
- Pinning: beri delegate sesi tantangan trust yang valid dan tidak valid lalu tegaskan disposisinya.
- Data protection: buat file dengan `.completeFileProtection` dan tegaskan atribut proteksinya.
- Secure coding: arsipkan/bongkar model dengan `NSSecureCoding` dan tegaskan bahwa kelas tak dikenal ditolak.
- Higiene `UserDefaults`: grep kode untuk nama token yang disimpan via `UserDefaults` (tes regex sederhana) dan gagalkan jika cocok.

```swift
import XCTest

final class SecurityConfigurationTests: XCTestCase {
    func testATSIsNotDisabledGlobally() throws {
        let info = Bundle.main.object(forInfoDictionaryKey: "NSAppTransportSecurity") as? [String: Any]
        let arbitraryLoads = info?["NSAllowsArbitraryLoads"] as? Bool
        XCTAssertNotEqual(arbitraryLoads, true)
    }

    func testTokensNotPersistedInUserDefaults() throws {
        let defaults = UserDefaults.standard.dictionaryRepresentation().keys
        XCTAssertFalse(defaults.contains { $0.localizedCaseInsensitiveContains("token") })
    }
}
```

### Langkah 10: Jalankan Checklist Keamanan Rilis

Sebelum merilis, telusuri checklist bersama tim:

1. Tidak ada `NSAllowsArbitraryLoads = true`; hanya pengecualian terbatas yang tersisa.
2. Semua token, kunci, dan kata sandi tersimpan di Keychain dengan aksesibilitas `ThisDeviceOnly`.
3. File sensitif menggunakan proteksi `complete` atau `completeUnlessOpen`.
4. Endpoint API kritis ter-pin dan pin cadangan terdokumentasi.
5. Gerbang biometrik tersedia untuk aksi bernilai tinggi dan gagal-tutup.
6. Sinyal deteksi jailbreak/debugger dicatat dan dipantau.
7. Pin `Package.resolved` di-checksum; tidak ada dependensi yang tidak terpelihara atau rentan.
8. Tidak ada rahasia di log, payload push, atau event analytics.
9. Build rilis ditandatangani dengan sertifikat distribusi; entitlement hanya berisi kemampuan yang dibutuhkan.
10. Tes keamanan lolos di CI dan dokumen model ancaman mutakhir.

Perlakukan checklist sebagai artefak hidup — setiap fitur baru yang menyentuh data atau jaringan harus menambah satu baris ke dalamnya, dan setiap mitigasi harus memiliki tes otomatis yang membuatnya konkret.

---
title: "Membangun Lapisan Jaringan Modern di Swift dengan Async/Await"
description: "Tutorial mendalam tentang membangun lapisan jaringan siap-produksi di Swift menggunakan async/await, URLSession, dan pola konkurensi modern."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Lapisan Jaringan Modern di Swift dengan Async/Await

## Ringkasan

Tutorial ini mengajarkan cara membangun lapisan jaringan tingkat produksi di Swift menggunakan model konkurensi async/await modern yang diperkenalkan di Swift 5.5. Anda akan belajar membuat klien jaringan yang dapat digunakan kembali, berbasis protokol, yang menangani autentikasi, pembuatan permintaan, penguraian respons, manajemen kesalahan, penyimpanan cache, dan pengujian — persis seperti fondasi jaringan yang digunakan dalam aplikasi iOS profesional.

## Target Audiens

- Pengembang iOS dengan pengetahuan dasar Swift yang ingin mengadopsi konkurensi modern Swift.
- Pengembang tingkat menengah yang ingin membangun arsitektur jaringan yang skalabel dan dapat diuji.
- Pengembang yang terbiasa dengan jaringan berbasis completion-handler yang beralih ke async/await.

## Prasyarat

- Xcode 14+ dan Swift 5.7+ (untuk dukungan async/await dan Actors).
- Pemahaman dasar Swift: protokol, generics, enum, dan penanganan kesalahan.
- Keakraban dengan konsep RESTful API (metode HTTP, kode status, JSON).
- iPhone simulator atau perangkat dengan iOS 15+ (async/await membutuhkan iOS 13+, tetapi beberapa fitur seperti `AsyncSequence` bekerja optimal di iOS 15+).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mendesain lapisan jaringan berbasis protokol dengan metode async/await.
- Mengimplementasikan pembungkus URLSession dengan penanganan kesalahan dan validasi kode status yang tepat.
- Membuat pembangun permintaan yang dapat digunakan kembali dengan decoding respons generik.
- Menangani alur autentikasi termasuk pembaruan token otomatis.
- Membangun lapisan cache dengan kebijakan kedaluwarsa menggunakan NSCache dan penyimpanan sistem file.
- Mengimplementasikan logika percobaan ulang permintaan dengan exponential backoff.
- Menulis pengujian unit yang komprehensif untuk kode jaringan menggunakan XCTest mocking.
- Mengintegrasikan lapisan jaringan ke dalam aplikasi SwiftUI dengan status pemuatan dan kesalahan yang tepat.

## Konteks dan Motivasi

Aplikasi iOS modern sangat bergantung pada komunikasi jaringan. Pendekatan tradisional menggunakan URLSession dengan completion handlers (`@escaping (Result<T, Error>) -> Void`) menghasilkan callback bersarang yang dalam, jalur penanganan kesalahan yang kompleks, dan manajemen threading yang melelahkan. Model konkurensi terstruktur Swift dengan `async/await` mengubah kode jaringan menjadi urutan linear yang mudah dibaca dan lebih mudah dipahami serta dipelihara.

Lapisan jaringan yang diarsitektur dengan baik memisahkan tanggung jawab, memusatkan penanganan autentikasi dan kesalahan, serta membuat pengujian menjadi mudah. Tanpa fondasi ini, aplikasi iOS mengakumulasi panggilan URLSession yang tersebar, penanganan kesalahan yang diduplikasi, dan logika jaringan yang sulit diuji. Dengan berinvestasi pada lapisan jaringan yang tepat sejak awal, Anda mendapatkan konsistensi, testabilitas, dan fleksibilitas untuk mengganti implementasi yang mendasarinya tanpa menyentuh logika bisnis.

## Konten Inti

### Mendesain Protokol Jaringan

Fondasi dari lapisan jaringan yang dapat diuji adalah protokol yang mengabstraksi klien HTTP yang mendasarinya. Definisikan protokol `HTTPClient` dengan satu metode async throwing yang mengambil permintaan dan mengembalikan data yang telah didekode:

```swift
import Foundation

/// Representasi permintaan HTTP ringan yang merangkum semua
/// parameter yang diperlukan untuk melakukan panggilan jaringan.
public struct HTTPRequest {
    public let url: URL
    public let method: HTTPMethod
    public let headers: [String: String]
    public let body: Data?

    public init(
        url: URL,
        method: HTTPMethod = .get,
        headers: [String: String] = [:],
        body: Data? = nil
    ) {
        self.url = url
        self.method = method
        self.headers = headers
        self.body = body
    }
}

public enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
    case head = "HEAD"
}

/// Tipe kesalahan jaringan generik yang memetakan kegagalan tingkat HTTP
/// ke dalam kasus kesalahan domain-spesifik.
public enum NetworkError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int, data: Data?)
    case decodingError(DecodingError)
    case noInternetConnection
    case timeout
    case cancelled

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "URL tidak valid."
        case .invalidResponse:
            return "Server mengembalikan respons yang tidak valid."
        case .httpError(let statusCode, _):
            return "Kesalahan HTTP \(statusCode)."
        case .decodingError(let error):
            return "Decoding gagal: \(error.localizedDescription)"
        case .noInternetConnection:
            return "Tidak ada koneksi internet."
        case .timeout:
            return "Permintaan timeout."
        case .cancelled:
            return "Permintaan dibatalkan."
        }
    }
}
```

### Membangun Klien URLSession

Implementasikan protokol `HTTPClient` menggunakan URLSession Apple dengan dukungan async/await. Klien ini menangani validasi respons, pemeriksaan kode status, dan pemetaan kesalahan:

```swift
import Foundation

public final class URLSessionHTTPClient: HTTPClient {
    private let session: URLSession
    private let decoder: JSONDecoder
    private let requestTimeout: TimeInterval

    public init(
        session: URLSession = .shared,
        decoder: JSONDecoder = JSONDecoder(),
        requestTimeout: TimeInterval = 30
    ) {
        self.session = session
        self.decoder = decoder
        self.requestTimeout = requestTimeout
    }

    public func request<T: Decodable>(
        _ httpRequest: HTTPRequest
    ) async throws -> T {
        let urlRequest = try buildURLRequest(from: httpRequest)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch let error as URLError {
            throw mapURLError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(
                statusCode: httpResponse.statusCode,
                data: data
            )
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch let error as DecodingError {
            throw NetworkError.decodingError(error)
        }
    }

    private func buildURLRequest(from httpRequest: HTTPRequest) throws -> URLRequest {
        var urlRequest = URLRequest(url: httpRequest.url)
        urlRequest.httpMethod = httpRequest.method.rawValue
        urlRequest.allHTTPHeaderFields = httpRequest.headers
        urlRequest.httpBody = httpRequest.body
        urlRequest.timeoutInterval = requestTimeout
        return urlRequest
    }

    private func mapURLError(_ error: URLError) -> NetworkError {
        switch error.code {
        case .notConnectedToInternet, .networkConnectionLost:
            return .noInternetConnection
        case .timedOut:
            return .timeout
        case .cancelled:
            return .cancelled
        default:
            return .invalidResponse
        }
    }
}
```

### Menambahkan Interceptor Permintaan untuk Autentikasi

Lapisan jaringan dunia nyata perlu menangani token autentikasi secara transparan. Buat protokol interceptor dan implementasi yang melampirkan token Bearer ke setiap permintaan dan secara otomatis memperbarui token yang kedaluwarsa:

```swift
import Foundation

/// Interceptor dapat memodifikasi permintaan sebelum dikirim dan menangani
/// respons sebelum dikembalikan ke pemanggil.
public protocol RequestInterceptor: AnyObject {
    func adapt(_ request: HTTPRequest) async throws -> HTTPRequest
    func retry(
        _ request: HTTPRequest,
        dueTo error: Error
    ) async -> RetryAction
}

public enum RetryAction {
    case retry
    case doNotRetry
}
```

Sekarang implementasikan interceptor autentikasi dengan pembaruan token otomatis:

```swift
import Foundation

public final class AuthInterceptor: RequestInterceptor {
    private let tokenProvider: TokenProvider

    public init(tokenProvider: TokenProvider) {
        self.tokenProvider = tokenProvider
    }

    public func adapt(_ request: HTTPRequest) async throws -> HTTPRequest {
        let token = try await tokenProvider.validToken()
        var headers = request.headers
        headers["Authorization"] = "Bearer \(token)"
        return HTTPRequest(
            url: request.url,
            method: request.method,
            headers: headers,
            body: request.body
        )
    }

    public func retry(
        _ request: HTTPRequest,
        dueTo error: Error
    ) async -> RetryAction {
        guard case .httpError(let statusCode, _) = error,
              statusCode == 401 else {
            return .doNotRetry
        }

        do {
            try await tokenProvider.refreshToken()
            return .retry
        } catch {
            return .doNotRetry
        }
    }
}

public protocol TokenProvider {
    func validToken() async throws -> String
    func refreshToken() async throws
}
```

### Membangun Klien API yang Dapat Dikomposisi

Gabungkan klien HTTP, interceptor, dan komponen lainnya ke dalam satu `APIClient` yang digunakan aplikasi Anda. Klien menangani pipeline interceptor secara transparan:

```swift
import Foundation

public actor APIClient {
    private let httpClient: HTTPClient
    private let interceptor: RequestInterceptor?
    private let retryCount: Int

    public init(
        httpClient: HTTPClient = URLSessionHTTPClient(),
        interceptor: RequestInterceptor? = nil,
        retryCount: Int = 2
    ) {
        self.httpClient = httpClient
        self.interceptor = interceptor
        self.retryCount = retryCount
    }

    public func request<T: Decodable>(
        _ httpRequest: HTTPRequest
    ) async throws -> T {
        var currentRequest = httpRequest
        var attempts = 0

        // Terapkan adaptasi interceptor
        if let interceptor {
            currentRequest = try await interceptor.adapt(currentRequest)
        }

        repeat {
            do {
                return try await httpClient.request(currentRequest)
            } catch {
                attempts += 1

                // Periksa apakah perlu mencoba ulang
                guard attempts <= retryCount,
                      let interceptor,
                      case .retry = await interceptor.retry(currentRequest, dueTo: error) else {
                    throw error
                }

                // Adaptasi ulang permintaan setelah percobaan ulang (token mungkin sudah diperbarui)
                currentRequest = try await interceptor.adapt(httpRequest)
            }
        } while true
    }
}
```

### Mengimplementasikan Cache Respons

Tambahkan dukungan cache untuk mengurangi penggunaan jaringan dan meningkatkan pengalaman offline. Gunakan cache komposit dengan tingkatan memori (NSCache) dan disk:

```swift
import Foundation

public protocol ResponseCache {
    func cache<T: Cachable>(_ object: T, for key: String, expiry: TimeInterval)
    func object<T: Cachable>(for key: String) -> T?
    func remove(for key: String)
    func clear()
}

public protocol Cachable: Codable {
    var cacheKey: String { get }
}

public final class CompositeCache: ResponseCache {
    private let memoryCache = NSCache<NSString, CacheEntry>()
    private let fileManager = FileManager.default
    private let cacheDirectory: URL

    public init(cacheDirectoryName: String = "networking-cache") {
        let cachesDir = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
        cacheDirectory = cachesDir.appendingPathComponent(cacheDirectoryName, isDirectory: true)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        memoryCache.countLimit = 100
        memoryCache.totalCostLimit = 5 * 1024 * 1024 // 5 MB
    }

    public func cache<T: Cachable>(_ object: T, for key: String, expiry: TimeInterval = 300) {
        let entry = CacheEntry(
            data: try! JSONEncoder().encode(object),
            expiry: Date().addingTimeInterval(expiry)
        )
        // Tingkatan memori
        memoryCache.setObject(entry, forKey: key as NSString, cost: entry.data.count)

        // Tingkatan disk
        let fileURL = cacheDirectory.appendingPathComponent(key.md5Hash)
        try? entry.data.write(to: fileURL)
    }

    public func object<T: Cachable>(for key: String) -> T? {
        // Tingkatan memori terlebih dahulu
        if let entry = memoryCache.object(forKey: key as NSString),
           entry.expiry > Date() {
            return try? JSONDecoder().decode(T.self, from: entry.data)
        }

        // Tingkatan disk
        let fileURL = cacheDirectory.appendingPathComponent(key.md5Hash)
        guard let data = try? Data(contentsOf: fileURL) else { return nil }

        if let entry = try? JSONDecoder().decode(CacheEntry.self, from: data),
           entry.expiry > Date() {
            // Promosikan ke memori
            memoryCache.setObject(entry, forKey: key as NSString, cost: entry.data.count)
            return try? JSONDecoder().decode(T.self, from: entry.data)
        }

        // Kedaluwarsa — bersihkan
        try? fileManager.removeItem(at: fileURL)
        return nil
    }

    public func remove(for key: String) {
        memoryCache.removeObject(forKey: key as NSString)
        let fileURL = cacheDirectory.appendingPathComponent(key.md5Hash)
        try? fileManager.removeItem(at: fileURL)
    }

    public func clear() {
        memoryCache.removeAllObjects()
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
}

private final class CacheEntry: NSObject, Codable {
    let data: Data
    let expiry: Date

    init(data: Data, expiry: Date) {
        self.data = data
        self.expiry = expiry
    }
}
```

### Mengimplementasikan Percobaan Ulang dengan Exponential Backoff

Untuk kegagalan sementara, implementasikan penangan percobaan ulang yang menggunakan exponential backoff dengan jitter untuk menghindari masalah thundering herd:

```swift
import Foundation

public struct RetryPolicy: Sendable {
    public let maxAttempts: Int
    public let baseDelay: TimeInterval
    public let maxDelay: TimeInterval
    public let enableJitter: Bool

    public init(
        maxAttempts: Int = 3,
        baseDelay: TimeInterval = 1.0,
        maxDelay: TimeInterval = 30.0,
        enableJitter: Bool = true
    ) {
        self.maxAttempts = maxAttempts
        self.baseDelay = baseDelay
        self.maxDelay = maxDelay
        self.enableJitter = enableJitter
    }

    /// Menghitung penundaan untuk nomor percobaan tertentu menggunakan exponential backoff.
    public func delay(for attempt: Int) -> TimeInterval {
        let exponential = baseDelay * pow(2.0, Double(attempt - 1))
        let clamped = min(exponential, maxDelay)

        if enableJitter {
            let jitter = Double.random(in: 0...clamped * 0.1)
            return clamped + jitter
        }

        return clamped
    }
}

/// Menentukan kode status HTTP dan tipe kesalahan mana yang dapat dicoba ulang.
public protocol RetryableErrorPolicy {
    func shouldRetry(error: Error, attempt: Int) -> Bool
}

public struct DefaultRetryPolicy: RetryableErrorPolicy {
    private let retryableStatusCodes: Set<Int> = [408, 429, 500, 502, 503, 504]

    public init() {}

    public func shouldRetry(error: Error, attempt: Int) -> Bool {
        if case .httpError(let statusCode, _) = error as? NetworkError,
           retryableStatusCodes.contains(statusCode) {
            return true
        }

        if case .timeout = error as? NetworkError { return true }
        if case .noInternetConnection = error as? NetworkError { return true }

        return false
    }
}
```

### Mengintegrasikan dengan SwiftUI

Buat pola view model yang mengintegrasikan lapisan jaringan dengan tampilan SwiftUI menggunakan `@MainActor` untuk pembaruan UI:

```swift
import SwiftUI

@MainActor
@Observable
final class UserListViewModel {
    private let apiClient: APIClient

    var users: [User] = []
    var isLoading = false
    var error: Error?

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    func loadUsers() async {
        isLoading = true
        error = nil

        do {
            let request = HTTPRequest(
                url: URL(string: "https://api.example.com/users")!,
                method: .get
            )
            users = try await apiClient.request(request)
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func refresh() async {
        users = []
        await loadUsers()
    }
}

struct UserListView: View {
    @State private var viewModel = UserListViewModel()

    var body: some View {
        List(viewModel.users) { user in
            VStack(alignment: .leading) {
                Text(user.name).font(.headline)
                Text(user.email).font(.subheadline).foregroundColor(.secondary)
            }
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView("Memuat pengguna…")
            }
            if let error = viewModel.error {
                ContentUnavailableView(
                    "Gagal Memuat",
                    systemImage: "wifi.slash",
                    description: Text(error.localizedDescription)
                )
            }
        }
        .refreshable {
            await viewModel.refresh()
        }
        .task {
            await viewModel.loadUsers()
        }
    }
}
```

### Menguji Lapisan Jaringan

Tulis pengujian unit dengan menyuntikkan klien HTTP mock. Gunakan dukungan tes async Swift dengan `XCTest`:

```swift
import XCTest
@testable import MyApp

final class APIClientTests: XCTestCase {

    func testSuccessfulRequestDecodesResponse() async throws {
        let mockData = try JSONEncoder().encode(User(id: 1, name: "Alice", email: "alice@example.com"))
        let mockClient = MockHTTPClient(result: .success(mockData))
        let apiClient = APIClient(httpClient: mockClient)

        let request = HTTPRequest(url: URL(string: "https://api.example.com/users/1")!)
        let user: User = try await apiClient.request(request)

        XCTAssertEqual(user.name, "Alice")
    }

    func testHTTPErrorThrowsNetworkError() async {
        let mockClient = MockHTTPClient(result: .failure(NetworkError.httpError(statusCode: 404, data: nil)))
        let apiClient = APIClient(httpClient: mockClient)

        let request = HTTPRequest(url: URL(string: "https://api.example.com/nonexistent")!)

        do {
            let _: User = try await apiClient.request(request)
            XCTFail("Expected error but got success")
        } catch let error as NetworkError {
            guard case .httpError(let statusCode, _) = error else {
                XCTFail("Unexpected error type")
                return
            }
            XCTAssertEqual(statusCode, 404)
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testAuthInterceptorAddsBearerToken() async throws {
        let mockTokenProvider = MockTokenProvider(token: "test-token-123")
        let interceptor = AuthInterceptor(tokenProvider: mockTokenProvider)
        let mockClient = MockHTTPClient(result: .success(Data()))
        let apiClient = APIClient(
            httpClient: mockClient,
            interceptor: interceptor
        )

        let request = HTTPRequest(url: URL(string: "https://api.example.com/protected")!)
        let _: EmptyResponse = try await apiClient.request(request)

        let capturedRequest = mockClient.capturedRequest
        XCTAssertEqual(capturedRequest?.headers["Authorization"], "Bearer test-token-123")
    }

    func testRetryOn503ThenSucceeds() async throws {
        let mockClient = MockHTTPClient(
            results: [
                .failure(NetworkError.httpError(statusCode: 503, data: nil)),
                .success(try! JSONEncoder().encode(User(id: 1, name: "Bob", email: "bob@example.com")))
            ]
        )
        let apiClient = APIClient(
            httpClient: mockClient,
            retryCount: 2
        )

        let request = HTTPRequest(url: URL(string: "https://api.example.com/users/1")!)
        let user: User = try await apiClient.request(request)

        XCTAssertEqual(user.name, "Bob")
        XCTAssertEqual(mockClient.requestCount, 2)
    }
}

// MARK: - Pembantu Tes

final class MockHTTPClient: HTTPClient {
    private let results: [Result<Data, Error>]
    private var currentIndex = 0
    var capturedRequest: HTTPRequest?
    var requestCount = 0
    private let lock = NSLock()

    init(result: Result<Data, Error>) {
        self.results = [result]
    }

    init(results: [Result<Data, Error>]) {
        self.results = results
    }

    func request<T: Decodable>(_ httpRequest: HTTPRequest) async throws -> T {
        lock.withLock {
            capturedRequest = httpRequest
            requestCount += 1
        }

        let index: Int = lock.withLock {
            let i = currentIndex
            currentIndex = min(currentIndex + 1, results.count - 1)
            return i
        }

        let result = results[index]
        let data = try result.get()
        return try JSONDecoder().decode(T.self, from: data)
    }
}

final class MockTokenProvider: TokenProvider {
    private let token: String
    private var didRefresh = false

    init(token: String) {
        self.token = token
    }

    func validToken() async throws -> String {
        token
    }

    func refreshToken() async throws {
        didRefresh = true
    }
}
```

## Contoh Kode

Kode lapisan jaringan lengkap disediakan di seluruh bagian Konten Inti di atas. Berikut adalah contoh ringkas yang dapat dijalankan yang mendemonstrasikan seluruh pipeline — permintaan, autentikasi, percobaan ulang, dan decoding respons — dalam satu file Swift:

```swift
import Foundation

// MARK: - Model
struct User: Codable, Identifiable, Cachable {
    let id: Int
    let name: String
    let email: String

    var cacheKey: String { "user_\(id)" }
}

// MARK: - Penggunaan
let apiClient = APIClient(
    httpClient: URLSessionHTTPClient(requestTimeout: 15),
    interceptor: AuthInterceptor(
        tokenProvider: MyTokenProvider()
    ),
    retryCount: 2
)

let request = HTTPRequest(
    url: URL(string: "https://api.example.com/users")!,
    method: .get,
    headers: ["Accept": "application/json"]
)

Task {
    do {
        let users: [User] = try await apiClient.request(request)
        print("Memuat \(users.count) pengguna")
    } catch {
        print("Gagal: \(error.localizedDescription)")
    }
}
```

## Insight Penting

- **Desain protocol-first**: Dengan mendefinisikan `HTTPClient` sebagai protokol, Anda dapat mengganti implementasi (URLSession, Alamofire, atau klien mock) tanpa mengubah kode aplikasi sama sekali. Ini adalah fondasi testabilitas.
- **Isolasi Actor untuk keamanan thread**: Gunakan `actor` untuk `APIClient` untuk menjamin bahwa mutasi state (penghitung percobaan ulang, state token) aman untuk thread tanpa penguncian manual.
- **Race condition pembaruan token**: `AuthInterceptor` dapat dipanggil oleh beberapa permintaan konkuren saat terjadi 401. Pastikan `TokenProvider.refreshToken()` Anda idempoten — biasanya dengan menggunakan actor yang mengkoordinasikan pembaruan dan mengantre permintaan yang menunggu.
- **Invalidasi cache itu sulit**: Kedaluwarsa berbasis waktu (`expiry: TimeInterval`) adalah strategi cache yang paling sederhana dan benar. Hindari pertumbuhan tak terbatas dengan memberlakukan batas jumlah dan biaya pada cache memori.
- **Exponential backoff dengan jitter**: Saat mencoba ulang setelah 429 (Too Many Requests) atau 503 (Service Unavailable), tambahkan jitter acak ke penundaan untuk mencegah semua klien mencoba ulang secara bersamaan (thundering herd).
- **Pembatalan task**: Metode async/await URLSession secara otomatis mendukung pembatalan kooperatif Swift. Periksa `Task.isCancelled` sebelum memulai percobaan ulang dan lempar `NetworkError.cancelled` untuk menghentikan loop percobaan ulang.

## Langkah Berikutnya

- Jelajahi Swift OpenAPI Generator untuk klien HTTP yang aman tipe yang dihasilkan dari spesifikasi OpenAPI.
- Pelajari tentang async sequences (`AsyncSequence`, `AsyncStream`, `AsyncAlgorithms`) untuk data real-time, WebSocket, dan konsumsi API yang dipaginasi.
- Pelajari paket `Swift Async Algorithms` untuk menggabungkan, menggabungkan, dan membatasi kecepatan async sequences.
- Tinjau [panduan konkurensi Swift async/await actors](mobile/swift/guides/swift-concurrency-async-await-actors-guide.md) untuk cakupan lebih dalam tentang actors, structured concurrency, dan Sendable.

## Kesimpulan

Anda telah membangun lapisan jaringan siap-produksi di Swift menggunakan async/await yang menangani permintaan, autentikasi, percobaan ulang, cache, dan pengujian. Arsitektur berbasis protokol memisahkan aplikasi Anda dari implementasi HTTP yang mendasarinya, membuatnya mudah untuk diuji, dipelihara, dan diperluas. Dengan mengadopsi konkurensi terstruktur Swift, kode jaringan Anda sekarang linear, mudah dibaca, dan bebas dari callback bersarang yang menghantui pola jaringan Swift sebelumnya. Fondasi ini dapat diskalakan dari aplikasi sederhana dengan satu endpoint hingga arsitektur multi-layanan yang kompleks dengan puluhan endpoint API.

---
title: "Building a Modern Networking Layer in Swift with Async/Await"
description: "A deep-dive tutorial on constructing a production-ready networking layer in Swift using async/await, URLSession, and modern concurrency patterns."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Modern Networking Layer in Swift with Async/Await

## Summary

This tutorial teaches you how to build a production-grade networking layer in Swift using the modern async/await concurrency model introduced in Swift 5.5. You will learn to create a reusable, protocol-based networking client that handles authentication, request building, response parsing, error management, caching, and testing — exactly the kind of networking foundation used in professional iOS applications.

## Target Audience

- iOS developers with basic Swift knowledge who want to adopt Swift modern concurrency.
- Intermediate developers looking to build scalable, testable networking architectures.
- Developers familiar with completion-handler-based networking who are migrating to async/await.

## Prerequisites

- Xcode 14+ and Swift 5.7+ (for async/await and Actors support).
- Basic understanding of Swift: protocols, generics, enums, and error handling.
- Familiarity with RESTful API concepts (HTTP methods, status codes, JSON).
- An iOS simulator or device running iOS 15+ (async/await requires iOS 13+, but some features like `AsyncSequence` work best on iOS 15+).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Design a protocol-based networking layer with async/await methods.
- Implement URLSession wrappers with proper error handling and status code validation.
- Create reusable request builders with generic response decoding.
- Handle authentication flows including automatic token refresh.
- Build a caching layer with expiry policies using NSCache and file system storage.
- Implement request retry logic with exponential backoff.
- Write comprehensive unit tests for network code using XCTest mocking.
- Integrate the networking layer into a SwiftUI application with proper loading and error states.

## Context and Motivation

Modern iOS applications depend heavily on network communication. The traditional approach using URLSession with completion handlers (`@escaping (Result<T, Error>) -> Void`) leads to deeply nested callbacks, complex error handling paths, and tedious threading management. Swift's structured concurrency model with `async/await` transforms network code into linear, readable sequences that are easier to reason about and maintain.

A well-architected networking layer separates concerns, centralizes authentication and error handling, and makes testing straightforward. Without this foundation, iOS applications accumulate scattered URLSession calls, duplicated error handling, and difficult-to-test networking logic. By investing in a proper networking layer upfront, you gain consistency, testability, and the flexibility to swap underlying implementations without touching business logic.

## Core Content

### Designing the Networking Protocol

The foundation of a testable networking layer is a protocol that abstracts the underlying HTTP client. Define an `HTTPClient` protocol with a single async throwing method that takes a request and returns decoded data:

```swift
import Foundation

/// A lightweight HTTP request representation that encapsulates all
/// parameters needed to make a network call.
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

/// A generic networking error type that maps HTTP-level failures
/// into domain-specific error cases.
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
            return "The URL is invalid."
        case .invalidResponse:
            return "The server returned an invalid response."
        case .httpError(let statusCode, _):
            return "HTTP error \(statusCode)."
        case .decodingError(let error):
            return "Decoding failed: \(error.localizedDescription)"
        case .noInternetConnection:
            return "No internet connection available."
        case .timeout:
            return "The request timed out."
        case .cancelled:
            return "The request was cancelled."
        }
    }
}
```

### Building the URLSession Client

Implement the `HTTPClient` protocol using Apple's URLSession with async/await support. The client handles response validation, status code checking, and error mapping:

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

### Adding Request Interceptors for Authentication

A real-world networking layer needs to handle authentication tokens transparently. Create an interceptor protocol and an implementation that attaches Bearer tokens to every request and automatically refreshes expired tokens:

```swift
import Foundation

/// An interceptor can modify requests before they are sent and handle
/// responses before they are returned to the caller.
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

Now implement an authentication interceptor with automatic token refresh:

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

### Building the Composable API Client

Compose the HTTP client, interceptor, and any other concerns into a single `APIClient` that your application uses. The client handles the interceptor pipeline transparently:

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

        // Apply interceptor adaption
        if let interceptor {
            currentRequest = try await interceptor.adapt(currentRequest)
        }

        repeat {
            do {
                return try await httpClient.request(currentRequest)
            } catch {
                attempts += 1

                // Check if we should retry
                guard attempts <= retryCount,
                      let interceptor,
                      case .retry = await interceptor.retry(currentRequest, dueTo: error) else {
                    throw error
                }

                // Re-adapt request after retry (token may have been refreshed)
                currentRequest = try await interceptor.adapt(httpRequest)
            }
        } while true
    }
}
```

### Implementing Response Caching

Add caching support to reduce network usage and improve offline experience. Use a composite cache with memory (NSCache) and disk tiers:

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
        // Memory tier
        memoryCache.setObject(entry, forKey: key as NSString, cost: entry.data.count)

        // Disk tier
        let fileURL = cacheDirectory.appendingPathComponent(key.md5Hash)
        try? entry.data.write(to: fileURL)
    }

    public func object<T: Cachable>(for key: String) -> T? {
        // Memory tier first
        if let entry = memoryCache.object(forKey: key as NSString),
           entry.expiry > Date() {
            return try? JSONDecoder().decode(T.self, from: entry.data)
        }

        // Disk tier
        let fileURL = cacheDirectory.appendingPathComponent(key.md5Hash)
        guard let data = try? Data(contentsOf: fileURL) else { return nil }

        if let entry = try? JSONDecoder().decode(CacheEntry.self, from: data),
           entry.expiry > Date() {
            // Promote to memory
            memoryCache.setObject(entry, forKey: key as NSString, cost: entry.data.count)
            return try? JSONDecoder().decode(T.self, from: entry.data)
        }

        // Expired — clean up
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

### Implementing Retry with Exponential Backoff

For transient failures, implement a retry handler that uses exponential backoff with jitter to avoid thundering herd problems:

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

    /// Calculates the delay for a given attempt number using exponential backoff.
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

/// Determines which HTTP status codes and error types are retryable.
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

### Integrating with SwiftUI

Create a view model pattern that integrates the networking layer with SwiftUI views using `@MainActor` for UI updates:

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
                ProgressView("Loading users…")
            }
            if let error = viewModel.error {
                ContentUnavailableView(
                    "Failed to Load",
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

### Testing the Networking Layer

Write unit tests by injecting a mock HTTP client. Use Swift's async test support with `XCTest`:

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

// MARK: - Test Helpers

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

## Code Examples

The complete networking layer code is provided throughout the Core Content section above. Here is a condensed runnable example that demonstrates the full pipeline — request, authentication, retry, and response decoding — in a single Swift file:

```swift
import Foundation

// MARK: - Model
struct User: Codable, Identifiable, Cachable {
    let id: Int
    let name: String
    let email: String

    var cacheKey: String { "user_\(id)" }
}

// MARK: - Usage
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
        print("Loaded \(users.count) users")
    } catch {
        print("Failed: \(error.localizedDescription)")
    }
}
```

## Key Insights

- **Protocol-first design**: By defining `HTTPClient` as a protocol, you can swap implementations (URLSession, Alamofire, or mock clients) without changing any application code. This is the foundation of testability.
- **Actor isolation for thread safety**: Use `actor` for the `APIClient` to guarantee that state mutations (retry counters, token state) are thread-safe without manual locking.
- **Token refresh race condition**: The `AuthInterceptor` can be called by multiple concurrent requests when a 401 occurs. Ensure your `TokenProvider.refreshToken()` is idempotent — typically by using an actor that coordinates refresh and queues waiting requests.
- **Cache invalidation is hard**: A time-based expiry (`expiry: TimeInterval`) is the simplest correct cache strategy. Avoid unbounded growth by enforcing count and cost limits on the memory cache.
- **Exponential backoff with jitter**: When retrying after a 429 (Too Many Requests) or 503 (Service Unavailable), add random jitter to the delay to prevent all clients from retrying simultaneously (thundering herd).
- **Task cancellation**: URLSession's async/await methods automatically support Swift's cooperative cancellation. Check `Task.isCancelled` before starting a retry and throw `NetworkError.cancelled` to stop the retry loop.

## Next Steps

- Explore Swift OpenAPI Generator for type-safe HTTP clients generated from OpenAPI specifications.
- Learn about async sequences (`AsyncSequence`, `AsyncStream`, `AsyncAlgorithms`) for real-time data, WebSocket, and paginated API consumption.
- Study `Swift Async Algorithms` package for combining, merging, and throttling async sequences.
- Review the [Swift concurrency async/await actors guide](mobile/swift/guides/swift-concurrency-async-await-actors-guide.md) for deeper coverage of actors, structured concurrency, and Sendable.

## Conclusion

You have built a production-ready networking layer in Swift using async/await that handles requests, authentication, retries, caching, and testing. The protocol-based architecture decouples your application from the underlying HTTP implementation, making it straightforward to test, maintain, and extend. By adopting Swift's structured concurrency, your network code is now linear, readable, and free from the callback nesting that plagued earlier Swift networking patterns. This foundation scales from a simple single-endpoint app to complex multi-service architectures with dozens of API endpoints.

---
title: "Swift iOS Best Practices Guide"
description: "An architectural and practical guide covering MVVM, dependency injection, protocol-oriented programming, memory management, testing, and CI/CD for iOS apps."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Swift iOS Best Practices Guide

## Introduction

Building production-grade iOS applications requires more than just knowing Swift syntax and UIKit APIs. This guide covers architectural patterns, memory management, error handling, testing strategies, and CI/CD practices that professional iOS teams use to build maintainable, scalable, and high-quality apps. Whether you are working on a greenfield SwiftUI project or maintaining a large UIKit codebase, these best practices will help you write cleaner, safer, and more performant code.

## Best Practices

### MVVM Architecture

**Model-View-ViewModel (MVVM)** is the preferred architecture for modern iOS apps. It separates concerns clearly:

- **Model**: Data and business logic (structs, CoreData entities, network models).
- **View**: UI layer (UIViewControllers, SwiftUI Views). Should be as dumb as possible — only display state and forward user actions.
- **ViewModel**: Mediator that holds presentation logic and view state. It transforms model data into a format the view can consume.

#### SwiftUI + MVVM Example

```swift
// Model
struct User: Codable, Identifiable {
    let id: Int
    let name: String
}

// ViewModel
@MainActor
class UserListViewModel: ObservableObject {
    @Published var users: [User] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    func loadUsers() async {
        isLoading = true
        errorMessage = nil
        do {
            let (data, _) = try await URLSession.shared.data(from: URL(string: "https://api.example.com/users")!)
            users = try JSONDecoder().decode([User].self, from: data)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// View
struct UserListView: View {
    @StateObject private var viewModel = UserListViewModel()
    
    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if let error = viewModel.errorMessage {
                    Text(error).foregroundColor(.red)
                } else {
                    List(viewModel.users) { user in
                        Text(user.name)
                    }
                }
            }
            .navigationTitle("Users")
            .task { await viewModel.loadUsers() }
        }
    }
}
```

### Dependency Injection

Dependency injection (DI) makes your code testable and decouples components. Avoid singletons — instead, inject dependencies through initializers.

```swift
// Protocol for abstraction
protocol UserServiceProtocol {
    func fetchUsers() async throws -> [User]
}

// Concrete implementation
class UserService: UserServiceProtocol {
    func fetchUsers() async throws -> [User] {
        // Network call
        return []
    }
}

// Mock for testing
class MockUserService: UserServiceProtocol {
    func fetchUsers() async throws -> [User] {
        return [User(id: 1, name: "Test User")]
    }
}

// ViewModel with injected dependency
class UserViewModel: ObservableObject {
    private let userService: UserServiceProtocol
    
    init(userService: UserServiceProtocol = UserService()) {
        self.userService = userService
    }
}

// Usage in production
let viewModel = UserViewModel(userService: UserService())

// Usage in tests
let testViewModel = UserViewModel(userService: MockUserService())
```

### Protocol-Oriented Programming

Swift is a protocol-oriented language. Prefer protocol inheritance over class inheritance, use protocol extensions for default implementations, and leverage generics for type-safe abstractions.

```swift
// Define behavior with protocols
protocol Cacheable {
    associatedtype CacheKey: Hashable
    func cache(_ value: Self, for key: CacheKey)
    func retrieve(for key: CacheKey) -> Self?
}

// Protocol extension with default behavior
extension Cacheable {
    func cache(_ value: Self, for key: CacheKey) {
        UserDefaults.standard.set(try? JSONEncoder().encode(value), forKey: "\(key)")
    }
    
    func retrieve(for key: CacheKey) -> Self? {
        guard let data = UserDefaults.standard.data(forKey: "\(key)") else { return nil }
        return try? JSONDecoder().decode(Self.self, from: data)
    }
}

// Conform without extra boilerplate
struct UserSettings: Codable, Cacheable {
    typealias CacheKey = String
    var isDarkMode: Bool
    var fontSize: Int
}
```

### Memory Management (ARC, Retain Cycles, Weak/Unowned)

Swift uses Automatic Reference Counting (ARC). Retain cycles occur when two objects hold strong references to each other, preventing deallocation.

```swift
// Retain cycle example
class Parent {
    var child: Child?
}

class Child {
    var parent: Parent?  // Strong reference back → retain cycle
}

// Fix with weak reference
class Child {
    weak var parent: Parent?  // Weak — does not increase retain count
}

// Closure retain cycles
class NetworkManager {
    var onCompletion: (() -> Void)?
    
    func fetchData() {
        // ❌ Captures self strongly
        onCompletion = {
            self.doSomething()
        }
        
        // ✅ Uses weak self
        onCompletion = { [weak self] in
            guard let self = self else { return }
            self.doSomething()
        }
        
        // ✅ Uses unowned when self will never be nil
        onCompletion = { [unowned self] in
            self.doSomething()
        }
    }
    
    func doSomething() { }
}
```

**Guidelines**:
- Use `weak` when the reference can become nil (most common for delegates and closures).
- Use `unowned` when you are certain the reference will never be nil during its use (risky — prefer `weak` unless performance-critical).

### Error Handling Patterns

Use Swift's `Result` type or throwing functions for predictable error handling. Avoid force-unwrapping and bare `try!`.

```swift
// Domain-specific errors
enum NetworkError: LocalizedError {
    case invalidURL
    case noData
    case decodingFailed(Error)
    case serverError(statusCode: Int)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "The URL is invalid."
        case .noData: return "No data received from server."
        case .decodingFailed(let error): return "Failed to decode: \(error.localizedDescription)"
        case .serverError(let code): return "Server error with status code \(code)."
        }
    }
}

// Result type for completion handlers
func fetchData(completion: @escaping (Result<Data, NetworkError>) -> Void) {
    guard let url = URL(string: "https://api.example.com/data") else {
        completion(.failure(.invalidURL))
        return
    }
    
    URLSession.shared.dataTask(with: url) { data, response, error in
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
            completion(.failure(.serverError(statusCode: httpResponse.statusCode)))
            return
        }
        guard let data = data else {
            completion(.failure(.noData))
            return
        }
        completion(.success(data))
    }.resume()
}
```

### Testing (XCTest, UI Tests)

Write tests that validate behavior, not implementation. Use `XCTest` for unit tests and `XCUITest` for UI tests.

```swift
// Unit test example
import XCTest
@testable import MyApp

class UserViewModelTests: XCTestCase {
    var viewModel: UserViewModel!
    
    override func setUp() {
        super.setUp()
        viewModel = UserViewModel(userService: MockUserService())
    }
    
    func testLoadUsersPopulatesList() async throws {
        await viewModel.loadUsers()
        XCTAssertFalse(viewModel.users.isEmpty)
        XCTAssertEqual(viewModel.users.count, 1)
        XCTAssertEqual(viewModel.users.first?.name, "Test User")
    }
    
    func testLoadUsersSetsLoadingState() async throws {
        XCTAssertFalse(viewModel.isLoading)
        // Start loading
        let task = Task { await viewModel.loadUsers() }
        // Assert loading state during execution
        XCTAssertTrue(viewModel.isLoading)
        await task.value
        XCTAssertFalse(viewModel.isLoading)
    }
}
```

### Modular App Architecture with SPM

Break your app into feature modules using Swift Package Manager. Each module has a clear boundary and minimal dependencies.

```plaintext
MyApp/
├── App/
│   └── Entry point, AppDelegate
├── Features/
│   ├── LoginFeature/
│   ├── FeedFeature/
│   └── ProfileFeature/
├── Core/
│   ├── Networking/
│   ├── Persistence/
│   └── UIComponents/
└── Shared/
    └── Extensions, Utilities
```

Create packages with `swift package init --name Networking --type library` and add them via **File → Add Package Dependencies** in Xcode.

### Performance Optimization

- **Lazy loading**: Load data only when needed. Use `LazyVStack`/`LazyHStack` in SwiftUI and cell dequeuing in UIKit.
- **Image caching**: Use `NSCache` or third-party libraries like Kingfisher/SDWebImage to cache downloaded images.
- **Avoid overdrawing**: Use `draw(_:)` sparingly. Prefer `CALayer` compositing.
- **Background threading**: Move heavy computation off the main thread.
- **Memory warnings**: Respond to `didReceiveMemoryWarning` by purging caches.

### Security (Keychain, App Transport Security)

```swift
// Keychain wrapper using SecItem*
import Security

struct KeychainService {
    static func save(key: String, data: Data) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        SecItemDelete(query as CFDictionary)
        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }
    
    static func load(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess else { return nil }
        return result as? Data
    }
}

// App Transport Security — configure in Info.plist
// <key>NSAppTransportSecurity</key>
// <dict>
//     <key>NSAllowsArbitraryLoads</key>
//     <false/>
// </dict>
```

### CI/CD with Xcode Cloud / GitHub Actions

```yaml
# .github/workflows/ios-ci.yml
name: iOS CI

on:
  push:
    branches: [main, development]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode.app
      - name: Build
        run: xcodebuild build -project MyApp.xcodeproj -scheme MyApp -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15'
      - name: Test
        run: xcodebuild test -project MyApp.xcodeproj -scheme MyApp -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15'
```

## Implementation Steps

### Step 1: Project Setup and Architecture Baseline

1. Create a new Xcode project with SwiftUI (or UIKit, depending on your target).
2. Set up the folder structure: `App`, `Features`, `Core`, `Shared`.
3. Initialize Swift Package Manager modules for shared components (Networking, UIComponents).
4. Implement the base MVVM pattern with `ObservableObject` ViewModels.
5. Set up a `DependencyContainer` for centralized dependency injection.

### Step 2: Implement Core Services

1. Build the networking layer using `URLSession` with `async/await` and proper error handling.
2. Create a `PersistenceService` protocol with `CoreDataStack` and `SwiftDataStore` implementations.
3. Implement `KeychainService` for secure token storage.
4. Add `ImageCacheService` using `NSCache` for efficient image loading.

### Step 3: Feature Module Implementation

1. For each feature (Login, Feed, Profile):
   - Define the Model (data + business logic).
   - Implement the ViewModel with `@Published` properties and async methods.
   - Build the View with proper state handling (loading, error, empty, success).
   - Register dependencies in the container.
   - Write unit tests for the ViewModel with mocked services.

### Step 4: Testing and Quality Assurance

1. Write unit tests for all ViewModels covering success, error, and loading states.
2. Write UI tests for critical user flows (login, navigation, data submission).
3. Add snapshot tests for UI components using `swift-snapshot-testing`.
4. Ensure code coverage is above 70% on core modules.
5. Run the full test suite locally before committing.

### Step 5: CI/CD Pipeline Configuration

1. Create GitHub Actions workflow (`.github/workflows/ios-ci.yml`) that builds and tests on every push.
2. Add `xcodebuild` commands for building and testing on a simulator.
3. Optionally configure Xcode Cloud for automatic TestFlight distribution.
4. Set up Danger (or SwiftLint) for automated code review comments on PRs.

### Step 6: Performance and Security Audit

1. Profile with Instruments to identify memory leaks and retain cycles.
2. Audit all closures for `[weak self]` capture lists.
3. Verify that all network calls respect App Transport Security.
4. Check Keychain usage for tokens and sensitive data.
5. Run the leaks instrument and fix any detected issues.

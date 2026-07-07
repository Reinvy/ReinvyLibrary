---
title: "Swift Concurrency: async/await, Actors, and Structured Concurrency Guide"
description: "A comprehensive guide to modern Swift concurrency covering async/await, actors, structured concurrency, and thread-safe design patterns for iOS and macOS apps."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Swift Concurrency: async/await, Actors, and Structured Concurrency Guide

## Introduction

Modern Swift Concurrency, introduced in Swift 5.5 and refined through Swift 5.7+, fundamentally changes how iOS and macOS developers write asynchronous code. Before this shift, asynchronous programming relied on completion handlers, delegate callbacks, and DispatchQueue — patterns that often led to deeply nested closures, manual thread management, and subtle data-race bugs.

Swift Concurrency provides a structured, compiler-enforced model built on three pillars:

- **async/await**: Write asynchronous code that reads like synchronous code, with language-level suspension points instead of callback pyramids.
- **Actors**: Protect mutable state with compile-time isolation guarantees, eliminating an entire class of race conditions without manual locking.
- **Structured Concurrency**: Define task hierarchies where parent tasks automatically manage child-task lifetimes, ensuring no task is accidentally orphaned or left running after its context is destroyed.

This guide walks through each pillar with production-grade patterns, migration strategies, and common pitfalls. By the end, you will be able to refactor legacy callback-based code into safe, maintainable Swift Concurrency and design new concurrent systems correctly from the start.

## Best Practices

### Prefer Structured Concurrency Over Unstructured Tasks

Always use structured concurrency (`async let`, `await`, task groups) when the lifetime of child tasks is tied to the parent scope. Reserve unstructured tasks (`Task { }` and `Task.detached { }`) for fire-and-forget work like logging or analytics that must outlive the current context.

### Use `async let` for Fixed-Fanout Parallelism

When you know the exact number of parallel operations at compile time, use `async let`. The compiler guarantees all child tasks complete (or are cancelled) before the parent scope exits.

```swift
func loadDashboard() async throws -> Dashboard {
    async let user = fetchCurrentUser()
    async let posts = fetchRecentPosts()
    async let stats = fetchAnalytics()
    return try await Dashboard(user: user, posts: posts, stats: stats)
}
```

### Use Task Groups for Dynamic Fanout

When the number of parallel operations is known only at runtime (mapping over an array), use `withThrowingTaskGroup`.

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

### Mark All UI Updates with `@MainActor`

SwiftUI views and UIKit view controllers must update on the main thread. Rather than remembering to dispatch to `DispatchQueue.main` manually, annotate the type or method with `@MainActor`.

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var name = ""

    func updateName(_ new: String) async {
        try? await api.saveName(new)
        name = new  // guaranteed on main thread
    }
}
```

### Use Actors for Shared Mutable State

Replace manual locks and serial dispatch queues with actors. The compiler prevents external access to mutable state without going through an isolation boundary.

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

### Prevent Actor Reentrancy Surprises

Actor methods are *reentrant* — an `await` inside an actor method suspends and allows other work to execute on the same actor before the method resumes. Protect invariants by validating state after every suspension point.

```swift
actor BankAccount {
    private var balance: Double = 0

    func transfer(amount: Double, to other: BankAccount) async {
        guard balance >= amount else { return }
        // Reentrancy point: another task may have changed balance here!
        balance -= amount
        await other.deposit(amount: amount)
    }
}
```

Use non-reentrant patterns when atomicity is critical, or restructure the code to check-and-act within a single synchronous block wherever possible.

### Conform to `Sendable` for Cross-Actor Communication

Types passed across actor boundaries must conform to `Sendable`. The compiler checks this automatically. Use `@unchecked Sendable` only as a last resort and document the thread-safety guarantee.

```swift
struct UserProfile: Sendable {
    let id: UUID
    let name: String
    let email: String
}
```

### Handle Cancellation Cooperatively

Long-running tasks should check for cancellation at regular intervals and clean up resources promptly. Use `try Task.checkCancellation()` for simple checks or `Task.isCancelled` for non-throwing paths.

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
            // Periodically check cancellation between results
            try Task.checkCancellation()
        }
        return results
    }
}
```

### Bridge Continuation-Based APIs with `withCheckedContinuation`

When wrapping existing callback-based APIs (URLSession delegates, CoreLocation callbacks, etc.), use `withCheckedContinuation` or `withCheckedThrowingContinuation`.

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

### Choose the Right Task Priority

Task priority should reflect the user-facing importance of the work, not be used as a scheduling hack. Default to `.medium` unless there is a clear user-visible reason to raise or lower priority.

```swift
Task(priority: .userInitiated) {
    await viewModel.loadImmediatelyVisibleContent()
}

Task(priority: .background) {
    await cache.prefetchNextPage()
}
```

## Implementation Steps

### Step 1: Audit Existing Asynchronous Code

Identify every use of completion handlers, `DispatchQueue`, `OperationQueue`, delegates, and `Timer` callbacks in your codebase. Tag each occurrence with its category:

- Fire-and-forget (logging, analytics): can stay unstructured or migrate to `Task`
- Data fetching (network, database): primary candidate for async/await
- Shared mutable state (caches, in-memory stores): candidate for actor isolation

Use the following checklist for each file:

1. Search for `@escaping` closures that represent completion handlers.
1. Search for `DispatchQueue.main.async`, `DispatchQueue.global()`, and custom queue creations.
1. Search for delegate callbacks that could be replaced with async streams (`AsyncStream` / `AsyncSequence`).
1. Identify any global or singleton mutable state accessed from multiple threads.

### Step 2: Migrate Completion Handlers to async/await

Transform callbacks into throwing async functions using a focused refactoring pattern.

Start with leaf functions — the deepest network or database calls — and work outward.

Before (completion handler):

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

After (async/await):

```swift
func fetchUser(id: UUID) async throws -> User {
    let (data, _) = try await URLSession.shared.data(from: url(for: id))
    return try decoder.decode(User.self, from: data)
}
```

For each migrated function, update its callers recursively until there are no more completion handlers in the call chain.

### Step 3: Introduce Actors for Shared State

Identify every class that holds mutable state accessed concurrently. Replace those that fit the actor model.

Before (class with serial queue — manual, error-prone):

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

After (actor — compiler-enforced safety):

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

Migration tips:

1. Start with leaf-level caches and stores (no external dependencies on non-Sendable types).
1. Extracted computed properties that access isolated state into methods so the actor boundary is explicit.
1. If a class mixes state and UI (a view model), keep it as `@MainActor class` rather than converting it to an actor.

### Step 4: Adopt Structured Concurrency in View Models

View models and controllers are ideal places to replace manual task management with structured patterns.

Before (manual cancellation tracking):

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

After (structured with task-scoped cancellation):

```swift
@MainActor
final class FeedViewModel {
    func loadFeed() async {
        do {
            let posts = try await api.fetchFeed()
            self.posts = posts
        } catch is CancellationError {
            // Task was cancelled, no error handling needed
        } catch {
            self.error = error.localizedDescription
        }
    }
}
```

When the view disappears, SwiftUI cancels the task automatically if the view model method is called via a `Task` in a `.task` modifier:

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

### Step 5: Add AsyncSequence Support for Streams

Replace delegate-based continuous callbacks with `AsyncStream` or `AsyncSequence` conformances.

Before (delegate):

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

After (async stream):

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

### Step 6: Write Tests for Concurrent Code

Testing async code requires `XCTest`'s async/await support. Test actor isolation by exercising concurrent access patterns.

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

Key testing practices:

1. Use `await` when calling actor methods from tests — the suspension is transparent in XCTest.
1. Test cancellation paths by cancelling the task that runs the async function and asserting the result is a `CancellationError`.
1. Use `XCTestExpectation` with async/await when testing bridging code that involves delegates or callbacks.
1. Run tests with the `-parallel-testing` flag to surface actor isolation bugs.

### Step 7: Profile and Optimize

Use Instruments to verify your concurrency changes improved performance rather than regressing it.

1. Open Instruments and select the **Swift Concurrency** trace template.
1. Run the app and exercise the refactored features.
1. Inspect the **Task Creation** and **Actor Contention** panels:

   - High actor contention (tasks waiting on actor access) indicates an actor is a bottleneck. Consider splitting it into multiple actors, or using `@Sendable` functions to reduce time on the actor's executor.
   - Excessive task creation suggests too many fine-grained tasks. Batch small operations into fewer tasks.
   - Unexpected task cancellations point to lifecycle mismatches — verify parent-child task relationships.

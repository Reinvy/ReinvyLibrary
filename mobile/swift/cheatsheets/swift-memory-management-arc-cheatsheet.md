---
title: "Swift Memory Management and ARC Cheat Sheet"
description: "A quick reference for Automatic Reference Counting (ARC), strong/weak/unowned references, retain cycles, closure capture lists, copy-on-write value types, autoreleasepool usage, and memory debugging tools in Swift."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Swift Memory Management and ARC Cheat Sheet

## Quick Reference Table

| Concept | Code / Keyword | Description |
|---------|----------------|-------------|
| Strong reference | `var owner: Car?` | Default; increments the retain count, keeps the object alive |
| Weak reference | `weak var delegate: Delegate?` | Does not increment retain count; becomes `nil` when deallocated |
| Unowned reference | `unowned let parent: Parent` | Does not increment retain count; crashes if accessed after deallocation |
| Capture list | `[weak self]` | Captures `self` weakly inside a closure |
| Capture list | `[unowned self]` | Captures `self` unowned inside a closure |
| Autorelease pool | `autoreleasepool { }` | Drains temporary objects inside a loop body |
| Copy-on-write | `struct` with `Array`/`Dictionary` | Shares storage until mutated, then copies |
| Deinitializer | `deinit { }` | Called when the last strong reference is released |
| Retain count check | `CFGetRetainCount(obj)` | Debug-only inspection of the current retain count |
| Memory warning | `didReceiveMemoryWarning` | UIKit hook to purge caches under pressure |
| Leak detection | Instruments Leaks template | Profiles leaked objects that are never released |
| Graph debugging | Xcode Memory Graph Debugger | Visualizes object references and cycles |

## Common Commands

### Instruments Profiling

```bash
# Profile the app in Xcode
# Product > Profile (Cmd + I), then choose the Leaks template

# Run Instruments from the command line with the Leaks template
xcrun xctrace record --template Leaks --launch -- ./YourApp.app

# Record allocations with the Allocations template
xcrun xctrace record --template Allocation --launch -- ./YourApp.app
```

### Command-Line Memory Inspection

```bash
# Show memory regions and their sizes for a process
vmmap <pid>

# Print the call stack that allocated a given address
malloc_history <pid> <address>

# Dump the heap and search for a symbol
leaks <pid>

# List all live heap allocations grouped by class
heap <pid>
```

### LLDB Memory Debugging

```bash
# In the Xcode debugger console
# Print the retain count of an object (debug builds only)
po CFGetRetainCount(someObject)

# Print a Swift object's address
po unsafeBitCast(someObject, to: UnsafeRawPointer.self)

# Enable malloc stack logging to see allocation backtraces
# Edit Scheme > Run > Diagnostics > Malloc Stack (All Allocator Freezes)
```

## Code Snippets

### Retain Cycle Between Two Classes

```swift
// MARK: - Retain cycle (leak)
final class Parent {
    var child: Child?
}

final class Child {
    var parent: Parent?   // Strong back-reference creates a cycle
}

// MARK: - Fixed with weak
final class ParentFixed {
    var child: ChildFixed?
}

final class ChildFixed {
    weak var parent: ParentFixed?   // Weak breaks the cycle
}
```

### Delegate Pattern With Weak Reference

```swift
// MARK: - Weak delegate avoids a cycle
protocol NetworkServiceDelegate: AnyObject {
    func didFinishLoading()
}

final class NetworkService {
    weak var delegate: NetworkServiceDelegate?   // Delegates must be weak
}

final class ViewController: NetworkServiceDelegate {
    let service = NetworkService()

    init() {
        service.delegate = self   // No cycle: delegate is weak
    }

    func didFinishLoading() {
        print("Loaded")
    }
}
```

### Closure Capture Lists

```swift
// MARK: - Weak self for escaping closures
final class ImageDownloader {
    var onComplete: (() -> Void)?

    func download() {
        // [weak self] avoids capturing self strongly
        DispatchQueue.global().async { [weak self] in
            guard let self else { return }
            self.processData()
        }
    }

    // MARK: - Unowned self when self outlives the closure
    func processData() {
        onComplete = { [unowned self] in
            self.render()   // Safe only if self is guaranteed alive
        }
    }

    private func render() {
        print("Rendering")
    }
}
```

### Unowned vs Weak Decision

```swift
// MARK: - Weak: reference may become nil (delegates, most closures)
class A {
    weak var b: B?
}

// MARK: - Unowned: reference is never nil during use
// (e.g., parent-child where the child never outlives the parent)
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

### Autoreleasepool for Tight Loops

```swift
// MARK: - Without autoreleasepool: memory spikes on large loops
for i in 0..<100_000 {
    let data = Data(repeating: 0, count: 1024)
    process(data)
}

// MARK: - With autoreleasepool: temporary objects drain each iteration
for i in 0..<100_000 {
    autoreleasepool {
        let data = Data(repeating: 0, count: 1024)
        process(data)
    }
}

func process(_ data: Data) {
    // Simulated work
    print(data.count)
}
```

### Copy-on-Write Value Semantics

```swift
// MARK: - Arrays share storage until mutated
var first = [1, 2, 3]
var second = first        // Shares the same buffer — no copy yet

second.append(4)          // Mutation triggers a copy
print(first.count)        // 3
print(second.count)       // 4

// MARK: - Struct with a reference inside still needs care
struct User {
    var name: String
    var avatar: UIImage   // UIImage is a reference type
}

var userA = User(name: "A", avatar: image)
var userB = userA
userB.name = "B"          // Only name is copied; avatar is still shared
```

### Detecting Leaks at Runtime

```swift
// MARK: - Deinit logging helps confirm deallocation
final class ViewModel {
    deinit {
        print("ViewModel deallocated")
    }
}

// MARK: - Weak tracking container for testing deallocation
final class LeakProbe {
    weak var instance: AnyObject?

    init(_ instance: AnyObject) {
        self.instance = instance
    }

    var isDeallocated: Bool {
        instance == nil
    }
}

// MARK: - Usage in a unit test
func testViewModelDeallocates() {
    var viewModel: ViewModel? = ViewModel()
    let probe = LeakProbe(viewModel!)

    viewModel = nil
    assert(probe.isDeallocated, "ViewModel leaked!")
}
```

### Thread-Safe Reference Management

```swift
// MARK: - Actors isolate state without locks
actor Counter {
    private var value = 0

    func increment() {
        value += 1
    }
}

// MARK: - @unchecked Sendable class used with care
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

### Memory Warning Handling

```swift
// MARK: - Purge caches on memory pressure
final class ImageCache {
    static let shared = ImageCache()
    private var cache: [String: UIImage] = [:]

    func purge() {
        cache.removeAll()
    }
}

// MARK: - UIKit integration
final class GalleryViewController: UIViewController {
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        ImageCache.shared.purge()
    }
}
```

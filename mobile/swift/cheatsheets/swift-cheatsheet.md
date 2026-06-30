---
title: "Swift Cheat Sheet"
description: "A quick reference guide covering Swift syntax, UIKit components, SwiftUI view modifiers, networking patterns, and Xcode shortcuts."
category: "mobile"
technology: "swift"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# Swift Cheat Sheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Declare variable | `var name = "value"` | Mutable variable |
| Declare constant | `let maxItems = 100` | Immutable (preferred) |
| Optional type | `var name: String?` | May be nil |
| Force unwrap | `name!` | Crash if nil — use cautiously |
| Conditionally unwrap | `if let n = name { }` | Safe optional binding |
| Guard unwrap | `guard let n = name else { return }` | Early exit on nil |
| Nil-coalescing | `name ?? "default"` | Provide default if nil |
| Function | `func add(a: Int, b: Int) -> Int { a + b }` | Basic function |
| Closure | `{ $0 + $1 }` | Inline closure shorthand |
| Array iteration | `items.forEach { print($0) }` | Loop over array |
| Map transform | `items.map { $0 * 2 }` | Transform each element |
| Async function | `func fetch() async throws -> Data` | Swift concurrency |
| Await call | `let data = try await fetch()` | Suspend until result |
| Property wrapper | `@State var count = 0` | SwiftUI state |
| Class inheritance | `class Dog: Animal { }` | Subclassing |
| Protocol adoption | `struct Car: Codable { }` | Conform to protocol |
| Extension | `extension String { }` | Add functionality |

## Common Commands

### Xcode Shortcuts

```bash
# Build and run
Cmd + R

# Build for testing
Cmd + U

# Stop running app
Cmd + .

# Open quickly (file search)
Cmd + Shift + O

# Show/hide navigator
Cmd + 0

# Show/hide debug area
Cmd + Shift + Y

# Show/hide utilities
Cmd + Option + 0

# Indent selection left
Cmd + [

# Indent selection right
Cmd + ]

# Comment/uncomment selection
Cmd + /

# Jump to definition
Cmd + Ctrl + J

# Find in file
Cmd + F

# Find and replace in project
Cmd + Shift + F
```

### Swift Package Manager (SPM)

```bash
# Create a Swift package
swift package init --type executable

# Build the package
swift build

# Run tests
swift test

# Generate Xcode project
swift package generate-xcodeproj

# Update dependencies
swift package update

# Resolve dependencies
swift package resolve
```

### CocoaPods

```bash
# Install CocoaPods
sudo gem install cocoapods

# Initialize Podfile
pod init

# Install pods
pod install

# Update pods
pod update

# Outdated pods list
pod outdated

# Search for a pod
pod search Alamofire
```

### Git (within Xcode)

```bash
# Create a new repository (in project directory)
git init

# Stage all changes
git add .

# Commit with message
git commit -m "Initial commit"

# Push to remote
git push origin main

# Create and switch to new branch
git checkout -b feature/new-feature
```

## Code Snippets

### Swift Syntax Patterns

```swift
// MARK: - Enums with associated values
enum NetworkResult {
    case success(data: Data)
    case failure(error: Error)
    case loading
}

// MARK: - Struct with Codable
struct User: Codable, Identifiable {
    let id: Int
    let name: String
    let email: String
    
    enum CodingKeys: String, CodingKey {
        case id, name, email
    }
}

// MARK: - Class with weak delegate
protocol MyDelegate: AnyObject {
    func didFinishTask()
}

class TaskManager {
    weak var delegate: MyDelegate?
}

// MARK: - Protocol with default implementation
protocol Greetable {
    func greet() -> String
}

extension Greetable {
    func greet() -> String {
        return "Hello!"
    }
}

// MARK: - Extension with computed property
extension Double {
    var celsiusToFahrenheit: Double {
        return self * 9 / 5 + 32
    }
}
```

### UIKit Component Patterns

```swift
// MARK: - Programmatic UILabel
let titleLabel = UILabel()
titleLabel.text = "Welcome"
titleLabel.font = UIFont.systemFont(ofSize: 18, weight: .bold)
titleLabel.textColor = .black
titleLabel.textAlignment = .center
titleLabel.numberOfLines = 0
titleLabel.translatesAutoresizingMaskIntoConstraints = false
view.addSubview(titleLabel)

// MARK: - UIButton with target-action
let button = UIButton(type: .system)
button.setTitle("Tap Me", for: .normal)
button.addTarget(self, action: #selector(buttonTapped), for: .touchUpInside)
button.translatesAutoresizingMaskIntoConstraints = false
view.addSubview(button)

@objc func buttonTapped() {
    print("Button tapped!")
}

// MARK: - UITextField delegate
class ViewController: UIViewController, UITextFieldDelegate {
    let textField = UITextField()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        textField.delegate = self
        textField.placeholder = "Enter your name"
        textField.borderStyle = .roundedRect
    }
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }
}
```

### SwiftUI View Modifiers

```swift
// MARK: - Common View Modifiers
Text("Hello, SwiftUI!")
    .font(.title)                          // Font size/weight
    .foregroundColor(.blue)                // Text color
    .padding()                             // Default padding
    .padding(.horizontal, 16)              // Specific padding
    .background(Color.yellow)              // Background color
    .cornerRadius(8)                       // Rounded corners
    .shadow(radius: 4)                     // Shadow effect
    .opacity(0.8)                          // Transparency
    .frame(width: 200, height: 100)        // Fixed frame
    .offset(x: 10, y: -5)                 // Position offset
    .rotationEffect(.degrees(45))          // Rotation
    .scaleEffect(1.5)                      // Scale

// MARK: - Custom Modifier
struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: .gray.opacity(0.3), radius: 8, x: 0, y: 4)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}
```

### URLSession Networking

```swift
// MARK: - GET request with async/await
func fetchUsers() async throws -> [User] {
    let url = URL(string: "https://api.example.com/users")!
    let (data, response) = try await URLSession.shared.data(from: url)
    
    guard let httpResponse = response as? HTTPURLResponse,
          (200...299).contains(httpResponse.statusCode) else {
        throw URLError(.badServerResponse)
    }
    
    return try JSONDecoder().decode([User].self, from: data)
}

// MARK: - POST request
func createUser(name: String, email: String) async throws -> User {
    let url = URL(string: "https://api.example.com/users")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = ["name": name, "email": email]
    request.httpBody = try JSONEncoder().encode(body)
    
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode(User.self, from: data)
}

// MARK: - Download with progress
func downloadFile(url: URL) async throws -> URL {
    let (fileURL, _) = try await URLSession.shared.download(from: url)
    return fileURL
}
```

### CoreData Stack Setup

```swift
// MARK: - CoreData Stack (iOS 15+)
import CoreData

class CoreDataStack {
    static let shared = CoreDataStack()
    
    lazy var persistentContainer: NSPersistentContainer = {
        let container = NSPersistentContainer(name: "MyApp")
        container.loadPersistentStores { _, error in
            if let error = error {
                fatalError("CoreData failed: \(error)")
            }
        }
        return container
    }()
    
    var context: NSManagedObjectContext {
        persistentContainer.viewContext
    }
    
    func save() {
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

### GCD / Async-Await Patterns

```swift
// MARK: - DispatchQueue main async
DispatchQueue.main.async {
    // Update UI
}

// MARK: - Global background queue
DispatchQueue.global(qos: .background).async {
    // Heavy work
    DispatchQueue.main.async {
        // Back to main for UI
    }
}

// MARK: - DispatchGroup for multiple tasks
let group = DispatchGroup()

group.enter()
task1 { group.leave() }

group.enter()
task2 { group.leave() }

group.notify(queue: .main) {
    // All tasks done
}

// MARK: - Async/await with Task
Task {
    do {
        let users = try await fetchUsers()
        print(users)
    } catch {
        print("Error: \(error)")
    }
}

// MARK: - TaskGroup for parallel operations
func fetchAll() async throws -> [User] {
    try await withThrowingTaskGroup(of: [User].self) { group in
        let urls = ["https://api1.com/users", "https://api2.com/users"]
        for url in urls {
            group.addTask {
                let (data, _) = try await URLSession.shared.data(from: URL(string: url)!)
                return try JSONDecoder().decode([User].self, from: data)
            }
        }
        
        var allUsers: [User] = []
        for try await users in group {
            allUsers.append(contentsOf: users)
        }
        return allUsers
    }
}
```

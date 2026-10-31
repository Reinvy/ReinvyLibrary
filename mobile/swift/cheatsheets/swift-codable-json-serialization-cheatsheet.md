---
title: "Swift Codable and JSON Serialization Cheat Sheet"
description: "A quick reference for Swift's Codable protocol: encoding and decoding structs, classes, and enums to and from JSON, key/date/data strategies, containers, property wrappers, DecodingError diagnostics, and JSONSerialization streaming."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Swift Codable and JSON Serialization Cheat Sheet

## Quick Reference Table

| Concept | Code / Keyword | Description |
|---------|----------------|-------------|
| Codable conformance | `struct User: Codable` | Synthesized when every stored property is itself Codable |
| Encodable protocol | `func encode(to encoder: Encoder) throws` | The single requirement for encoding |
| Decodable protocol | `init(from decoder: Decoder) throws` | The single requirement for decoding |
| CodingKeys | `enum CodingKeys: String, CodingKey` | Maps Swift property names to JSON key names |
| JSONEncoder | `JSONEncoder()` | Encodes Swift values into JSON `Data` |
| JSONDecoder | `JSONDecoder()` | Decodes JSON `Data` into Swift values |
| Pretty printed output | `encoder.outputFormatting = [.prettyPrinted, .sortedKeys]` | Human-readable, deterministic output |
| Key strategy | `decoder.keyDecodingStrategy = .convertFromSnakeCase` | Maps `user_name` to `userName` automatically |
| Date strategy | `decoder.dateDecodingStrategy = .iso8601` | ISO-8601 strings; alternatives are `.millisecondsSince1970`, `.secondsSince1970`, `.deferredToDate` |
| Data strategy | `encoder.dataEncodingStrategy = .base64` | Encodes `Data` as a base64 string |
| Non-conforming floats | `encoder.nonConformingFloatEncodingStrategy = .convertToString(positiveInfinity: "Infinity", negativeInfinity: "-Infinity", nan: "NaN")` | Maps Infinity and NaN to strings instead of throwing |
| Optional property | `var nickname: String?` | Missing key decodes as `nil`; a non-Optional property throws |
| Failable decode | `try decoder.decodeIfPresent(Type.self, forKey: key)` | Nil when the key is missing or null |
| Keyed container | `let c = try decoder.container(keyedBy: CodingKeys.self)` | Access named keys |
| Unkeyed container | `var c = try decoder.unkeyedContainer()` | Decode array elements one at a time |
| Single-value container | `try decoder.singleValueContainer().decode(String.self)` | For enums and single-value wrappers |
| Nested container | `c.nestedContainer(keyedBy: Keys.self, forKey: key)` | Encode a dictionary of structs inline |
| Class inheritance | `let s = try encoder.superEncoder(forKey: .parent)` | Encodes the superclass payload; mirror with `superDecoder` |
| Property wrapper | `@propertyWrapper struct Trimming: Codable` | Wrapper's Codable conformance is used by the synthesized code |
| JSONSerialization | `JSONSerialization.jsonObject(with: data)` | Non-Codable fallback bridging to `NSArray` and `NSDictionary` |
| Top-level fragments | `JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed)` | Accepts a bare string or number at the top level |
| Streaming parse | `JSONSerialization.jsonObject(with: InputStream, options: [])` | Parses huge payloads without loading all bytes into memory |
| PropertyList round-trip | `PropertyListEncoder()` / `PropertyListDecoder()` | Same Codable API for XML or binary plists |
| DecodingError cases | `.keyNotFound`, `.typeMismatch`, `.valueNotFound`, `.dataCorrupted` | Every case carries a `codingPath` and context |

## Common Commands

### Validating Encoded JSON

```bash
# Pretty-print the JSON an app just encoded
jq . encoded.json

# Validate syntax; prints nothing and exits 0 when the file is valid
jq empty encoded.json

# Inspect a single path in a large payload
jq '.users[0].profile' encoded.json
```

### Round-Tripping Between JSON and Property Lists

```bash
# Convert a plist to JSON (mirrors PropertyListDecoder -> JSONEncoder)
plutil -convert json -o out.json in.plist

# Convert JSON back to a plist
plutil -convert xml1 -o out.plist in.json
```

### Running and Testing Codable Code

```bash
# Run a standalone Swift script that uses Codable
swift codable_demo.swift

# Run only the encode/decode round-trip tests in a package
swift test --filter CodableTests
```

### Debugging Decode Failures

```bash
# LLDB: print the human-readable description of a DecodingError
po error

# Print the coding path of the failed key to find where the payload diverged
po error.codingPath
```

## Code Snippets

### Basic Round-Trip

```swift
struct User: Codable {
    let id: Int
    let name: String
    let email: String
}

let user = User(id: 1, name: "Ayu", email: "ayu@example.com")

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
let data = try encoder.encode(user)
print(String(data: data, encoding: .utf8)!)

let decoder = JSONDecoder()
let decoded = try decoder.decode(User.self, from: data)
print(decoded.name)
```

### CodingKeys and Snake Case

```swift
struct Profile: Codable {
    let userName: String
    let avatarURL: URL

    enum CodingKeys: String, CodingKey {
        case userName = "user_name"
        case avatarURL = "avatar_url"
    }
}

// Strategy alternative: no CodingKeys needed when names line up
let decoder = JSONDecoder()
decoder.keyDecodingStrategy = .convertFromSnakeCase   // user_name -> userName
```

### Custom init(from:) with decodeIfPresent

```swift
struct Order: Decodable {
    let id: String
    let items: [String]
    let discount: Double?   // missing or null -> nil

    enum CodingKeys: String, CodingKey {
        case id, items, discount
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        items = try c.decode([String].self, forKey: .items)
        discount = try c.decodeIfPresent(Double.self, forKey: .discount)
    }
}
```

### Custom encode(to:) with Nested Containers

```swift
struct Shipment: Encodable {
    let trackingNumber: String
    let destination: Address

    enum CodingKeys: String, CodingKey {
        case trackingNumber, destination
    }

    enum DestinationKeys: String, CodingKey {
        case city, country
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(trackingNumber, forKey: .trackingNumber)
        var dest = c.nestedContainer(keyedBy: DestinationKeys.self,
                                     forKey: .destination)
        try dest.encode(destination.city, forKey: .city)
        try dest.encode(destination.country, forKey: .country)
    }
}
```

### Codable for Enums

```swift
// Raw-value enums get synthesized Codable for free
enum Role: String, Codable {
    case admin, member, guest
}

// Associated-value enums need a manual implementation
enum LoginResult: Codable {
    case success(token: String)
    case failure(message: String)

    enum CodingKeys: String, CodingKey { case type, token, message }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: .type) {
        case "success":
            self = .success(token: try c.decode(String.self, forKey: .token))
        case "failure":
            self = .failure(message: try c.decode(String.self, forKey: .message))
        default:
            throw DecodingError.dataCorrupted(
                DecodingError.Context(codingPath: decoder.codingPath,
                                      debugDescription: "Unknown result type"))
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .success(let token):
            try c.encode("success", forKey: .type)
            try c.encode(token, forKey: .token)
        case .failure(let message):
            try c.encode("failure", forKey: .type)
            try c.encode(message, forKey: .message)
        }
    }
}
```

### Date Strategies

```swift
let decoder = JSONDecoder()

// ISO-8601 strings: "2026-08-17T08:00:00Z"
decoder.dateDecodingStrategy = .iso8601

// Unix timestamps in milliseconds or seconds
decoder.dateDecodingStrategy = .millisecondsSince1970
decoder.dateDecodingStrategy = .secondsSince1970

// Fully custom: any DateFormatter
let formatter = DateFormatter()
formatter.locale = Locale(identifier: "en_US_POSIX")
formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
decoder.dateDecodingStrategy = .formatted(formatter)
```

### DecodingError Diagnostics

```swift
func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
    do {
        return try JSONDecoder().decode(T.self, from: data)
    } catch let error as DecodingError {
        switch error {
        case .keyNotFound(let key, let ctx):
            print("Missing key \(key.stringValue) at \(ctx.codingPath)")
        case .typeMismatch(let type, let ctx):
            print("Type mismatch: expected \(type) at \(ctx.codingPath)")
        case .valueNotFound(let type, let ctx):
            print("Null where \(type) expected at \(ctx.codingPath)")
        case .dataCorrupted(let ctx):
            print("Invalid JSON at \(ctx.codingPath): \(ctx.debugDescription)")
        default:
            print("Decode failed: \(error)")
        }
        throw error
    }
}
```

### Property Wrapper with Codable

```swift
@propertyWrapper
struct Trimming: Codable {
    private var value: String

    init(wrappedValue: String) {
        value = wrappedValue
    }

    var wrappedValue: String {
        get { value }
        set { value = newValue.trimmingCharacters(in: .whitespacesAndNewlines) }
    }
}

struct SignupForm: Codable {
    @Trimming var name: String   // wrapper conformance is used automatically
}
```

### Streaming Large JSON with JSONSerialization

```swift
import Foundation

// For multi-gigabyte payloads, parse from a stream instead of loading
// the whole file into a single Data value.
let stream = InputStream(url: url)!
stream.open()
defer { stream.close() }

let json = try JSONSerialization.jsonObject(with: stream,
                                            options: [.mutableContainers])
if let root = json as? [String: Any] {
    print(root.keys)
}
```

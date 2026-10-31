---
title: "Cheat Sheet Codable dan Serialisasi JSON Swift"
description: "Referensi cepat untuk protokol Codable Swift: menyandikan dan memecahkan kode struct, kelas, dan enum ke dan dari JSON, strategi key/tanggal/data, container, property wrapper, diagnostik DecodingError, dan streaming JSONSerialization."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Codable dan Serialisasi JSON Swift

## Tabel Referensi Cepat

| Konsep | Kode / Kata Kunci | Deskripsi |
|--------|-------------------|-----------|
| Konformansi Codable | `struct User: Codable` | Disintesis otomatis saat setiap properti tersimpan bersifat Codable |
| Protokol Encodable | `func encode(to encoder: Encoder) throws` | Satu-satunya persyaratan untuk penyandian |
| Protokol Decodable | `init(from decoder: Decoder) throws` | Satu-satunya persyaratan untuk pemecahan kode |
| CodingKeys | `enum CodingKeys: String, CodingKey` | Memetakan nama properti Swift ke nama key JSON |
| JSONEncoder | `JSONEncoder()` | Menyandikan nilai Swift menjadi `Data` JSON |
| JSONDecoder | `JSONDecoder()` | Memecahkan `Data` JSON menjadi nilai Swift |
| Output pretty printed | `encoder.outputFormatting = [.prettyPrinted, .sortedKeys]` | Output mudah dibaca dan deterministik |
| Strategi key | `decoder.keyDecodingStrategy = .convertFromSnakeCase` | Memetakan `user_name` ke `userName` secara otomatis |
| Strategi tanggal | `decoder.dateDecodingStrategy = .iso8601` | String ISO-8601; alternatif: `.millisecondsSince1970`, `.secondsSince1970`, `.deferredToDate` |
| Strategi Data | `encoder.dataEncodingStrategy = .base64` | Menyandikan `Data` sebagai string base64 |
| Float non-konforman | `encoder.nonConformingFloatEncodingStrategy = .convertToString(positiveInfinity: "Infinity", negativeInfinity: "-Infinity", nan: "NaN")` | Memetakan Infinity dan NaN ke string alih-alih melempar error |
| Properti opsional | `var nickname: String?` | Key yang hilang dipecahkan sebagai `nil`; properti non-Opsional melempar error |
| Decode failable | `try decoder.decodeIfPresent(Type.self, forKey: key)` | Nil saat key tidak ada atau bernilai null |
| Container keyed | `let c = try decoder.container(keyedBy: CodingKeys.self)` | Mengakses key bernama |
| Container unkeyed | `var c = try decoder.unkeyedContainer()` | Memecahkan elemen array satu per satu |
| Container single-value | `try decoder.singleValueContainer().decode(String.self)` | Untuk enum dan wrapper nilai tunggal |
| Container bersarang | `c.nestedContainer(keyedBy: Keys.self, forKey: key)` | Menyandikan dictionary struct secara inline |
| Pewarisan kelas | `let s = try encoder.superEncoder(forKey: .parent)` | Menyandikan payload superclass; gunakan `superDecoder` untuk kebalikannya |
| Property wrapper | `@propertyWrapper struct Trimming: Codable` | Konformansi Codable wrapper dipakai oleh kode sintesis |
| JSONSerialization | `JSONSerialization.jsonObject(with: data)` | Alternatif non-Codable yang menjembatani ke `NSArray` dan `NSDictionary` |
| Fragmen tingkat atas | `JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed)` | Menerima string atau angka tunggal di tingkat atas |
| Parsing streaming | `JSONSerialization.jsonObject(with: InputStream, options: [])` | Mem-parsing payload besar tanpa memuat semua byte ke memori |
| Pertukaran Property List | `PropertyListEncoder()` / `PropertyListDecoder()` | API Codable yang sama untuk plist XML atau biner |
| Kasus DecodingError | `.keyNotFound`, `.typeMismatch`, `.valueNotFound`, `.dataCorrupted` | Setiap kasus membawa `codingPath` dan konteks |

## Perintah Umum

### Memvalidasi JSON Hasil Sandi

```bash
# Pretty-print JSON yang baru disandikan oleh aplikasi
jq . encoded.json

# Validasi sintaks; tidak mencetak apa pun dan keluar 0 saat file valid
jq empty encoded.json

# Inspeksi satu jalur tertentu pada payload besar
jq '.users[0].profile' encoded.json
```

### Bolak-Balik Antara JSON dan Property List

```bash
# Ubah plist menjadi JSON (meniru alur PropertyListDecoder -> JSONEncoder)
plutil -convert json -o out.json in.plist

# Ubah JSON kembali menjadi plist
plutil -convert xml1 -o out.plist in.json
```

### Menjalankan dan Menguji Kode Codable

```bash
# Jalankan skrip Swift mandiri yang memakai Codable
swift codable_demo.swift

# Jalankan hanya pengujian pertukaran encode/decode dalam package
swift test --filter CodableTests
```

### Men-debug Kegagalan Decode

```bash
# LLDB: cetak deskripsi yang mudah dibaca dari sebuah DecodingError
po error

# Cetak coding path key yang gagal untuk menemukan titik penyimpangan payload
po error.codingPath
```

## Potongan Kode

### Pertukaran Data Dasar

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

### CodingKeys dan Snake Case

```swift
struct Profile: Codable {
    let userName: String
    let avatarURL: URL

    enum CodingKeys: String, CodingKey {
        case userName = "user_name"
        case avatarURL = "avatar_url"
    }
}

// Alternatif strategi: tidak perlu CodingKeys saat penamaan sudah selaras
let decoder = JSONDecoder()
decoder.keyDecodingStrategy = .convertFromSnakeCase   // user_name -> userName
```

### init(from:) Kustom dengan decodeIfPresent

```swift
struct Order: Decodable {
    let id: String
    let items: [String]
    let discount: Double?   // hilang atau null -> nil

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

### encode(to:) Kustom dengan Container Bersarang

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

### Codable untuk Enum

```swift
// Enum berbasis raw value otomatis mendapat Codable sintesis
enum Role: String, Codable {
    case admin, member, guest
}

// Enum dengan associated value memerlukan implementasi manual
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
                                      debugDescription: "Tipe hasil tidak dikenal"))
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

### Strategi Tanggal

```swift
let decoder = JSONDecoder()

// String ISO-8601: "2026-08-17T08:00:00Z"
decoder.dateDecodingStrategy = .iso8601

// Timestamp Unix dalam milidetik atau detik
decoder.dateDecodingStrategy = .millisecondsSince1970
decoder.dateDecodingStrategy = .secondsSince1970

// Sepenuhnya kustom: DateFormatter apa pun
let formatter = DateFormatter()
formatter.locale = Locale(identifier: "en_US_POSIX")
formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
decoder.dateDecodingStrategy = .formatted(formatter)
```

### Diagnostik DecodingError

```swift
func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
    do {
        return try JSONDecoder().decode(T.self, from: data)
    } catch let error as DecodingError {
        switch error {
        case .keyNotFound(let key, let ctx):
            print("Key hilang \(key.stringValue) di \(ctx.codingPath)")
        case .typeMismatch(let type, let ctx):
            print("Tipe tak cocok: diharapkan \(type) di \(ctx.codingPath)")
        case .valueNotFound(let type, let ctx):
            print("Null padahal \(type) diharapkan di \(ctx.codingPath)")
        case .dataCorrupted(let ctx):
            print("JSON tidak valid di \(ctx.codingPath): \(ctx.debugDescription)")
        default:
            print("Decode gagal: \(error)")
        }
        throw error
    }
}
```

### Property Wrapper dengan Codable

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
    @Trimming var name: String   // konformansi wrapper dipakai otomatis
}
```

### Streaming JSON Besar dengan JSONSerialization

```swift
import Foundation

// Untuk payload berukuran multi-gigabyte, parse dari stream alih-alih
// memuat seluruh file ke dalam satu nilai Data.
let stream = InputStream(url: url)!
stream.open()
defer { stream.close() }

let json = try JSONSerialization.jsonObject(with: stream,
                                            options: [.mutableContainers])
if let root = json as? [String: Any] {
    print(root.keys)
}
```

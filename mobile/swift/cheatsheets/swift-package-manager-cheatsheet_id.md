---
title: "Cheat Sheet Swift Package Manager dan Manajemen Dependensi"
description: "Referensi cepat untuk API manifest Package.swift, aturan versi dependensi, binary target, bundel resource, plugin build tool, konfigurasi registry, dan perintah SPM yang dipakai di pipeline CI."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Swift Package Manager dan Manajemen Dependensi

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Membuat package library | `swift package init --type library` | Menghasilkan Sources, Tests, dan manifest |
| Membuat package executable | `swift package init --type executable` | Menambahkan target dengan titik masuk program |
| Build debug | `swift build` | Mengompilasi semua target untuk triple host |
| Build release | `swift build -c release` | Build teroptimasi dengan whole-module optimization |
| Build satu produk | `swift build --product MyApp` | Membatasi build hanya pada satu produk |
| Menampilkan path bin | `swift build --show-bin-path` | Mengetahui direktori output untuk skrip |
| Menjalankan tes | `swift test` | Membangun dan menjalankan semua target tes |
| Memfilter tes | `swift test --filter MySuite` | Menjalankan suite atau nama tes sesuai regex |
| Menjalankan coverage | `swift test --enable-code-coverage` | Menghasilkan data coverage untuk `llvm-cov` |
| Thread sanitizer | `swift test --sanitize=thread` | Mendeteksi data race pada kode paralel |
| Menyelesaikan dependensi | `swift package resolve` | Menulis atau menyegarkan `Package.resolved` |
| Memperbarui sesuai aturan | `swift package update` | Mengabaikan pin sekali, lalu menyelesaikan ulang ke versi terbaru yang diizinkan |
| Melihat graf dependensi | `swift package show-dependencies` | Mencetak pohon dependensi hasil resolusi |
| Deskripsi dalam JSON | `swift package describe --type json` | Laporan target dan dependensi yang mudah diparsing |
| Membuang manifest | `swift package dump-package` | Mencetak manifest persis seperti yang diparsing SPM |
| Menghitung checksum artifact | `swift package compute-checksum X.xcframework.zip` | Menghasilkan nilai `checksum:` untuk `.binaryTarget` |
| Mengarsipkan source | `swift package archive-source` | Memaketkan package menjadi zip untuk rilis |
| Membersihkan cache | `swift package purge-cache` | Menghapus checkout dan repo yang sudah diunduh |
| Melihat daftar plugin | `swift package plugin --list` | Menampilkan plugin build dan command yang bisa dijalankan |
| Menyematkan versi tools | `swift package tools-version --set-current` | Menulis ulang baris tools-version sesuai toolchain aktif |
| Menyetel mirror registry | `swift package config set-mirror --original-url URL --mirror-url MIRROR` | Mengalihkan URL sumber ke mirror internal |
| Menyetel registry | `swift package-registry set https://registry.example.com` | Mengonfigurasi endpoint registry package |
| Memasang bundel SDK | `swift sdk install URL --checksum SHA256` | Menambahkan bundel SDK untuk kompilasi silang |
| Build dengan SDK | `swift build --swift-sdk arm64-apple-ios` | Kompilasi silang memakai SDK yang sudah dipasang |

## Perintah Umum

### Penyiapan Package dan Penyuntingan Manifest

```bash
# Membuat package di direktori saat ini
swift package init --type library --name MyKit

# Membuat package executable dengan produk yang bisa dijalankan
swift package init --type executable --name mycli

# Membuat package kosong lalu menulis Package.swift secara manual
swift package init --type empty

# Menyelaraskan manifest dengan versi tools toolchain aktif
swift package tools-version --set-current

# Mencetak manifest seperti hasil parsing SPM (langsung menangkap kesalahan API)
swift package dump-package

# Memastikan target dan produk yang dihasilkan SPM
swift package describe --type json
```

### Build, Tes, dan Menjalankan Program

```bash
# Build debug dan release
swift build
swift build -c release

# Membangun satu produk atau target saja
swift build --product MyApp
swift build --target MyKit

# Menampilkan lokasi hasil build
swift build --show-bin-path

# Menjalankan produk executable, argumen diteruskan setelah --
swift run mycli generate --output ./out

# Menjalankan seluruh suite tes, atau subset yang difilter
swift test
swift test --filter MyKitTests

# Tes paralel beserta code coverage
swift test --parallel --enable-code-coverage

# Melihat coverage dari eksekusi tes sebelumnya
xcrun llvm-cov report .build/debug/MyPackageTests.xctest/Contents/MacOS/MyPackageTests \
  -instr-profile .build/debug/codecov/default.profdata

# Menjalankan tes dengan sanitizer
swift test --sanitize=address
swift test --sanitize=thread

# Membersihkan artifact build, module cache, atau semuanya termasuk checkout
swift package clean
rm -rf .build
swift package reset
```

### Resolusi Dependensi dan Penyematan Versi

```bash
# Menyelesaikan semua dependensi lalu menulis Package.resolved
swift package resolve

# Menerima versi yang lebih baru selama masih sesuai aturan, kemudian menulis ulang lock file
swift package update

# Memperbarui satu dependensi tertentu berdasarkan namanya
swift package update MyKit

# Melihat hasil resolusi yang sebenarnya
swift package show-dependencies
swift package show-dependencies --format json

# Memverifikasi lock file tetap reproduksibel di CI (gagal bila resolve akan berubah)
swift package resolve --force-resolved-versions 2>/dev/null || swift build --disable-automatic-resolution

# Memeriksa dan membersihkan cache SPM bersama saat checkout tampak rusak
ls ~/Library/Caches/org.swift.swiftpm
swift package purge-cache
```

### Registry, Mirror, dan Build Offline

```bash
# Mengarahkan SPM ke registry package privat atau hasil mirror
swift package-registry set https://packages.example.com
swift package-registry login https://packages.example.com --token "$REGISTRY_TOKEN"

# Membaca konfigurasi registry yang sedang berlaku
swift package-registry print-configuration

# Mengalihkan URL upstream ke mirror internal (proxy korporat / CI tanpa internet)
swift package config set-mirror \
  --original-url https://github.com/apple/swift-argument-parser.git \
  --mirror-url https://git.internal.example.com/mirrors/swift-argument-parser.git

# Melihat dan menghapus mirror yang sudah dikonfigurasi
swift package config get-mirror --original-url https://github.com/apple/swift-argument-parser.git
swift package config unset-mirror --original-url https://github.com/apple/swift-argument-parser.git

# Memanaskan cache sebelum build offline, lalu build tanpa akses jaringan
swift package resolve
swift build --disable-automatic-resolution
```

### Publikasi dan Kebersihan Rilis

```bash
# Memastikan package bisa dibangun secara terisolasi sebelum diberi tag
swift build -c release
swift test -c release

# Menghasilkan arsip source untuk aset rilis
swift package archive-source

# Menghitung checksum untuk zip XCFramework yang sudah dibangun
swift package compute-checksum MyKit.xcframework.zip

# Memastikan versi tools yang tercatat di manifest
grep swift-tools-version Package.swift
```

### Kompilasi Silang dan Bundel SDK

```bash
# Melihat bundel SDK yang sudah terpasang untuk toolchain
swift sdk list

# Memasang bundel SDK (checksum wajib untuk bundel jarak jauh)
swift sdk install https://download.swift.org/swift-sdk/static-sdk-arm64-apple-ios.artifactbundle.zip \
  --checksum 7d3f0e0f5b1a4c9d2e6f8a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d

# Kompilasi silang package memakai SDK yang sudah terpasang
swift build --swift-sdk arm64-apple-ios

# Menghapus bundel SDK yang tidak lagi dipakai
swift sdk remove arm64-apple-ios
```

## Potongan Kode

### Manifest Minimal dengan Batas Platform

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MyKit",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
        .watchOS(.v10),
        .visionOS(.v1)
    ],
    products: [
        .library(name: "MyKit", targets: ["MyKit"]),
        .executable(name: "mycli", targets: ["MyCLI"])
    ],
    targets: [
        .target(name: "MyKit"),
        .executableTarget(
            name: "MyCLI",
            dependencies: ["MyKit"]
        ),
        .testTarget(
            name: "MyKitTests",
            dependencies: ["MyKit"]
        )
    ]
)
```

### Aturan Versi Dependensi

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MyApp",
    dependencies: [
        // Default yang disarankan: versi 1.2.3 ke atas sampai (tanpa menyertakan) 2.0.0
        .package(url: "https://github.com/apple/swift-argument-parser.git", from: "1.2.3"),

        // Rentang eksplisit dan pin tepat
        .package(url: "https://github.com/apple/swift-log.git", .upToNextMajor(from: "1.5.0")),
        .package(url: "https://github.com/apple/swift-nio.git", .upToNextMinor(from: "2.60.0")),
        .package(url: "https://github.com/apple/swift-collections.git", exact: "1.1.0"),

        // Pelacakan branch dan revisi — hindari pada branch rilis
        .package(url: "https://github.com/example/experimental.git", branch: "main"),
        .package(url: "https://github.com/example/pinned.git", revision: "9f8e7d6c5b4a3210"),

        // Checkout lokal untuk pengembangan, cocok untuk monorepo atau klon bersebelahan
        .package(path: "../SharedModels"),

        // Dependensi berbasis registry (id menggantikan URL sumber)
        .package(id: "apple.swift-log", from: "1.5.0")
    ],
    targets: [
        .target(
            name: "MyApp",
            dependencies: [
                // Membedakan dua package yang mengekspos produk bernama sama
                .product(name: "ArgumentParser", package: "swift-argument-parser"),
                .product(name: "Logging", package: "swift-log")
            ],
            path: "Sources/App"
        )
    ]
)
```

### Target Tes dan Plugin

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MyKit",
    products: [.library(name: "MyKit", targets: ["MyKit"])],
    dependencies: [
        .package(url: "https://github.com/apple/swift-format.git", from: "510.1.0")
    ],
    targets: [
        .target(name: "MyKit"),
        .testTarget(
            name: "MyKitTests",
            dependencies: ["MyKit"],
            // Pengaturan khusus tes tidak ikut masuk ke target produksi
            swiftSettings: [.enableUpcomingFeature("ExistentialAny")]
        ),
        // Command plugin yang bisa dipanggil konsumen dari baris perintah
        .plugin(
            name: "FormatSources",
            capability: .command(
                intent: .custom(verb: "format-sources", description: "Memformat semua sumber di tempat"),
                permissions: [.writeToPackageDirectory(reason: "Menulis ulang sumber Swift")]
            ),
            dependencies: [.product(name: "SwiftFormat", package: "swift-format")]
        ),
        // Build tool plugin yang menghasilkan kode sebelum kompilasi
        .plugin(
            name: "GenerateAPIClient",
            capability: .buildTool()
        )
    ]
)
```

```bash
# Menjalankan command plugin; flag izin harus diberikan sebelum verb
swift package --allow-writing-to-package-directory format-sources

# Melihat semua plugin yang diekspos package
swift package plugin --list
```

### Binary Target dan XCFramework

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "AnalyticsKit",
    products: [.library(name: "AnalyticsKit", targets: ["AnalyticsKit"])],
    targets: [
        .target(
            name: "AnalyticsKit",
            dependencies: ["AnalyticsCore"]
        ),
        // Artifact jarak jauh: url plus SHA-256 dari zip
        .binaryTarget(
            name: "AnalyticsCore",
            url: "https://cdn.example.com/analytics-core-2.3.0.xcframework.zip",
            checksum: "b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2"
        ),
        // Artifact yang ikut di repo: path relatif terhadap akar package
        .binaryTarget(
            name: "VendorSDK",
            path: "VendorSDK.xcframework"
        )
    ]
)
```

```bash
# Menghasilkan checksum yang diharapkan SPM untuk binary target jarak jauh
swift package compute-checksum analytics-core-2.3.0.xcframework.zip

# Memverifikasi artifact tetap terselesaikan di mesin bersih (tanpa checkout cache)
rm -rf .build && swift package resolve && swift build
```

### Bundel Resource dan Aset Terlokalisasi

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "DesignSystem",
    defaultLocalization: "en",
    targets: [
        .target(
            name: "DesignSystem",
            resources: [
                // Process memproses seluruh folder: mengompilasi asset catalog, menjaga xib tetap utuh
                .process("Resources"),
                // Copy menyalin berkas byte-per-byte — wajib untuk lisensi dan data siap pakai
                .copy("PrivacyInfo.xcprivacy")
            ]
        )
    ]
)
```

```swift
import Foundation

// Mengakses resource yang diproses melalui accessor bundle yang dihasilkan
let bundle = Bundle.module

func loadTemplate(named name: String) -> Data? {
    guard let url = bundle.url(forResource: name, withExtension: "json") else {
        return nil
    }
    return try? Data(contentsOf: url)
}

// String terlokalisasi yang dikirim di dalam bundel package
let title = String(
    localized: "dashboard.title",
    bundle: .module
)
```

### Trait Package dan Pengaturan Kondisional

```swift
// swift-tools-version: 6.1
import PackageDescription

let package = Package(
    name: "NetworkingKit",
    traits: [
        // Trait yang bisa diaktifkan konsumen pada baris dependensinya
        .trait(name: "Metrics"),
        // Aktif secara default kecuali konsumen menonaktifkan semua default
        .default(enabledTraits: ["Metrics"])
    ],
    targets: [
        .target(
            name: "NetworkingKit",
            swiftSettings: [
                // Hanya dikompilasi saat trait Metrics diaktifkan
                .define("METRICS_ENABLED", .when(traits: ["Metrics"])),
                // Pengaman untuk migrasi ke Swift 6 language mode
                .enableUpcomingFeature("ExistentialAny"),
                .enableExperimentalFeature("StrictConcurrency")
            ]
        )
    ]
)
```

```swift
// Sisi konsumen: menonaktifkan trait default bila tidak diinginkan
.target(
    name: "App",
    dependencies: [
        .product(
            name: "NetworkingKit",
            package: "networking-kit",
            condition: nil,
            traits: [.defaults]
        )
    ]
)
```

### Cache Build di CI

```bash
# Langkah CI deterministik: gagal cepat bila Package.resolved sudah kedaluwarsa
set -euo pipefail
swift package resolve
git diff --exit-code Package.resolved || {
  echo "Package.resolved sudah usang — jalankan swift package resolve lalu commit hasilnya."
  exit 1
}

# Cache dependensi SPM antar job dengan lock file sebagai kunci cache
# (key: swiftpm-$(hashFiles('Package.resolved')))
swift build -c release --disable-automatic-resolution
swift test -c release --parallel
```

```text
# Direktori cache CI yang umum untuk Swift package
~/.cache/org.swift.swiftpm            # toolchain Linux
~/Library/Caches/org.swift.swiftpm    # toolchain macOS
.build                                # artifact per package (cache dengan hati-hati)
```

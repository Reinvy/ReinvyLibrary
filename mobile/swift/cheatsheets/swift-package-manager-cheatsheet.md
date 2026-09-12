---
title: "Swift Package Manager and Dependency Management Cheat Sheet"
description: "A quick reference for the Package.swift manifest API, dependency version rules, binary targets, resource bundles, build tool plugins, registry configuration, and the SPM commands used in CI pipelines."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Swift Package Manager and Dependency Management Cheat Sheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Scaffold a library | `swift package init --type library` | Creates Sources, Tests, and a manifest |
| Scaffold an executable | `swift package init --type executable` | Adds a main entry point target |
| Build debug | `swift build` | Compiles all targets for the host triple |
| Build release | `swift build -c release` | Optimized build with whole-module optimization |
| Build one product | `swift build --product MyApp` | Limits the build to a single product |
| Print the bin path | `swift build --show-bin-path` | Resolves the output directory for scripts |
| Run tests | `swift test` | Builds and executes every test target |
| Filter tests | `swift test --filter MySuite` | Runs suites or test names matching a regex |
| Coverage run | `swift test --enable-code-coverage` | Emits coverage data for `llvm-cov` |
| Thread sanitizer | `swift test --sanitize=thread` | Detects data races in parallel code |
| Resolve dependencies | `swift package resolve` | Writes or refreshes `Package.resolved` |
| Update within rules | `swift package update` | Ignores pins once, then re-resolves to latest allowed |
| Inspect the graph | `swift package show-dependencies` | Prints the resolved dependency tree |
| Describe as JSON | `swift package describe --type json` | Machine-readable target and dependency report |
| Dump the manifest | `swift package dump-package` | Prints the manifest exactly as SPM parsed it |
| Checksum an artifact | `swift package compute-checksum X.xcframework.zip` | Produces the `checksum:` value for `.binaryTarget` |
| Archive the source | `swift package archive-source` | Zips the package for release upload |
| Purge the cache | `swift package purge-cache` | Clears downloaded checkouts and repos |
| List plugin commands | `swift package plugin --list` | Shows runnable build and command plugins |
| Pin the tools version | `swift package tools-version --set-current` | Rewrites the tools-version line to the active toolchain |
| Set a registry mirror | `swift package config set-mirror --original-url URL --mirror-url MIRROR` | Redirects a source URL to an internal mirror |
| Set the registry | `swift package-registry set https://registry.example.com` | Configures a package registry endpoint |
| Install an SDK bundle | `swift sdk install URL --checksum SHA256` | Adds a cross-compilation SDK bundle |
| Build against an SDK | `swift build --swift-sdk arm64-apple-ios` | Cross-compiles with a previously installed SDK |

## Common Commands

### Package Scaffolding and Manifest Editing

```bash
# Create a package in the current directory
swift package init --type library --name MyKit

# Create an executable package with a runnable product
swift package init --type executable --name mycli

# Create an empty package and write Package.swift by hand
swift package init --type empty

# Re-point the manifest at the active toolchain's tools version
swift package tools-version --set-current

# Print the manifest as SPM parsed it (catches API mistakes instantly)
swift package dump-package

# Confirm the synthesized targets and products
swift package describe --type json
```

### Building, Testing, and Running

```bash
# Debug and release builds
swift build
swift build -c release

# Build a single product or target
swift build --product MyApp
swift build --target MyKit

# Show where the build products landed
swift build --show-bin-path

# Run an executable product with arguments passed after --
swift run mycli generate --output ./out

# Run the whole test suite, or a filtered subset
swift test
swift test --filter MyKitTests

# Parallel testing with code coverage
swift test --parallel --enable-code-coverage

# Inspect coverage produced by the previous run
xcrun llvm-cov report .build/debug/MyPackageTests.xctest/Contents/MacOS/MyPackageTests \
  -instr-profile .build/debug/codecov/default.profdata

# Sanitized test runs
swift test --sanitize=address
swift test --sanitize=thread

# Clean build artifacts, the module cache, or everything including checkouts
swift package clean
rm -rf .build
swift package reset
```

### Dependency Resolution and Version Pinning

```bash
# Resolve every dependency and write Package.resolved
swift package resolve

# Accept newer versions allowed by the declared rules, then rewrite the lock file
swift package update

# Update a single dependency by name
swift package update MyKit

# Inspect what was actually resolved
swift package show-dependencies
swift package show-dependencies --format json

# Verify the lock file is reproducible in CI (fails when a resolve would change it)
swift package resolve --force-resolved-versions 2>/dev/null || swift build --disable-automatic-resolution

# Inspect and clear the shared SPM cache when checkouts look corrupted
ls ~/Library/Caches/org.swift.swiftpm
swift package purge-cache
```

### Registry, Mirrors, and Offline Builds

```bash
# Point SPM at a private or mirrored package registry
swift package-registry set https://packages.example.com
swift package-registry login https://packages.example.com --token "$REGISTRY_TOKEN"

# Read the effective registry configuration
swift package-registry print-configuration

# Rewrite an upstream URL to an internal mirror (corporate proxy / air-gapped CI)
swift package config set-mirror \
  --original-url https://github.com/apple/swift-argument-parser.git \
  --mirror-url https://git.internal.example.com/mirrors/swift-argument-parser.git

# List and remove configured mirrors
swift package config get-mirror --original-url https://github.com/apple/swift-argument-parser.git
swift package config unset-mirror --original-url https://github.com/apple/swift-argument-parser.git

# Prime the cache before an offline build, then build without network access
swift package resolve
swift build --disable-automatic-resolution
```

### Publishing and Release Hygiene

```bash
# Verify the package builds in isolation before tagging
swift build -c release
swift test -c release

# Produce a distributable source archive for a release asset
swift package archive-source

# Compute the checksum for a prebuilt XCFramework zip
swift package compute-checksum MyKit.xcframework.zip

# Confirm the tools version recorded in the manifest
grep swift-tools-version Package.swift
```

### Cross-Compilation and SDK Bundles

```bash
# List the SDK bundles already installed for the toolchain
swift sdk list

# Install an SDK bundle (checksum is required for remote bundles)
swift sdk install https://download.swift.org/swift-sdk/static-sdk-arm64-apple-ios.artifactbundle.zip \
  --checksum 7d3f0e0f5b1a4c9d2e6f8a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d

# Cross-compile the package against the installed SDK
swift build --swift-sdk arm64-apple-ios

# Remove an SDK bundle that is no longer needed
swift sdk remove arm64-apple-ios
```

## Code Snippets

### Minimal Manifest with Platform Floor

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

### Dependency Version Rules

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MyApp",
    dependencies: [
        // Recommended default: any version from 1.2.3 up to (but excluding) 2.0.0
        .package(url: "https://github.com/apple/swift-argument-parser.git", from: "1.2.3"),

        // Explicit ranges and exact pins
        .package(url: "https://github.com/apple/swift-log.git", .upToNextMajor(from: "1.5.0")),
        .package(url: "https://github.com/apple/swift-nio.git", .upToNextMinor(from: "2.60.0")),
        .package(url: "https://github.com/apple/swift-collections.git", exact: "1.1.0"),

        // Branch and revision tracking — avoid these on release branches
        .package(url: "https://github.com/example/experimental.git", branch: "main"),
        .package(url: "https://github.com/example/pinned.git", revision: "9f8e7d6c5b4a3210"),

        // Local development checkout, ideal for a monorepo or a sibling clone
        .package(path: "../SharedModels"),

        // Registry-based dependency (id replaces the source URL)
        .package(id: "apple.swift-log", from: "1.5.0")
    ],
    targets: [
        .target(
            name: "MyApp",
            dependencies: [
                // Disambiguate when two packages expose a product with the same name
                .product(name: "ArgumentParser", package: "swift-argument-parser"),
                .product(name: "Logging", package: "swift-log")
            ],
            path: "Sources/App"
        )
    ]
)
```

### Testing and Plugin Targets

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
            // Test-specific settings stay out of the shipping target
            swiftSettings: [.enableUpcomingFeature("ExistentialAny")]
        ),
        // A command plugin consumers can invoke from the command line
        .plugin(
            name: "FormatSources",
            capability: .command(
                intent: .custom(verb: "format-sources", description: "Formats all sources in place"),
                permissions: [.writeToPackageDirectory(reason: "Rewrites Swift sources")]
            ),
            dependencies: [.product(name: "SwiftFormat", package: "swift-format")]
        ),
        // A build tool plugin that generates code before compilation
        .plugin(
            name: "GenerateAPIClient",
            capability: .buildTool()
        )
    ]
)
```

```bash
# Run a command plugin; permission flags must be passed before the verb
swift package --allow-writing-to-package-directory format-sources

# List every plugin the package exposes
swift package plugin --list
```

### Binary Targets and XCFrameworks

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
        // Remote artifact: url plus the SHA-256 of the zip
        .binaryTarget(
            name: "AnalyticsCore",
            url: "https://cdn.example.com/analytics-core-2.3.0.xcframework.zip",
            checksum: "b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2"
        ),
        // Vendored artifact: path is relative to the package root
        .binaryTarget(
            name: "VendorSDK",
            path: "VendorSDK.xcframework"
        )
    ]
)
```

```bash
# Generate the checksum SPM expects for a remote binary target
swift package compute-checksum analytics-core-2.3.0.xcframework.zip

# Verify the artifact resolves on a clean machine (no cached checkouts)
rm -rf .build && swift package resolve && swift build
```

### Resource Bundles and Localized Assets

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
                // Process rules for a whole folder: compiles asset catalogs, keeps xibs intact
                .process("Resources"),
                // Copy keeps a file byte-for-byte — required for licenses and prebuilt data
                .copy("PrivacyInfo.xcprivacy")
            ]
        )
    ]
)
```

```swift
import Foundation

// Access a processed resource through the generated bundle accessor
let bundle = Bundle.module

func loadTemplate(named name: String) -> Data? {
    guard let url = bundle.url(forResource: name, withExtension: "json") else {
        return nil
    }
    return try? Data(contentsOf: url)
}

// Localized strings shipped inside the package bundle
let title = String(
    localized: "dashboard.title",
    bundle: .module
)
```

### Package Traits and Conditional Settings

```swift
// swift-tools-version: 6.1
import PackageDescription

let package = Package(
    name: "NetworkingKit",
    traits: [
        // A trait consumers can enable on their dependency line
        .trait(name: "Metrics"),
        // Enabled unless the consumer disables all defaults
        .default(enabledTraits: ["Metrics"])
    ],
    targets: [
        .target(
            name: "NetworkingKit",
            swiftSettings: [
                // Compiles only when the Metrics trait is enabled
                .define("METRICS_ENABLED", .when(traits: ["Metrics"])),
                // Guardrails for Swift 6 language mode migrations
                .enableUpcomingFeature("ExistentialAny"),
                .enableExperimentalFeature("StrictConcurrency")
            ]
        )
    ]
)
```

```swift
// Consuming side: disable default traits when you do not want them
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

### Caching the Build in CI

```bash
# Deterministic CI step: fail fast when Package.resolved is out of date
set -euo pipefail
swift package resolve
git diff --exit-code Package.resolved || {
  echo "Package.resolved is stale — run swift package resolve and commit the result."
  exit 1
}

# Cache SPM dependencies between jobs using the lock file as the cache key
# (key: swiftpm-$(hashFiles('Package.resolved')))
swift build -c release --disable-automatic-resolution
swift test -c release --parallel
```

```text
# Typical CI cache directories for Swift packages
~/.cache/org.swift.swiftpm            # Linux toolchains
~/Library/Caches/org.swift.swiftpm    # macOS toolchains
.build                                # per-package artifacts (cache with care)
```

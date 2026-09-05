---
title: "Kotlin Multiplatform and Compose Multiplatform Guide"
description: "A comprehensive guide to sharing code across Android, iOS, desktop, and web with Kotlin Multiplatform and Compose Multiplatform — covering project structure, expect/actual, shared business logic, UI sharing, and platform integration."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Kotlin Multiplatform and Compose Multiplatform Guide

## Introduction

Kotlin Multiplatform (KMP) has evolved from a promising experiment into a production-ready way to share business logic across Android, iOS, desktop, and web targets. When combined with Compose Multiplatform, the same declarative UI codebase can render natively on Android, iOS, macOS, Windows, Linux, and the web. This drastically reduces the amount of platform-specific code you write while keeping your application architecture clean and testable.

This guide presents industry-proven best practices for structuring a Kotlin Multiplatform project, using `expect`/`actual` to isolate platform differences, sharing domain and data layers, sharing UI with Compose Multiplatform, and integrating with native platform APIs. Whether you are starting a greenfield KMP app or migrating an existing Android codebase, these practices will help you build a maintainable, cross-platform product without sacrificing native quality.

## Best Practices

### 1. Separate Shared Logic from Platform UI

Keep the shared module focused on the **domain** and **data** layers: models, use cases, repositories, and networking. Do not dump Android-specific or iOS-specific code into the common source set. The UI layer can either be fully shared (Compose Multiplatform) or platform-native, but the core logic must always remain framework-agnostic.

**Anti-pattern**: Putting `Activity`, `Composable`, or `UIViewController` references into the shared common code.

```kotlin
// ❌ Anti-pattern — Android framework type leaks into the shared module
class SharedRepository {
    fun fetch(context: Context): String { /* ... */ }
}
```

```kotlin
// ✅ Recommended — shared code depends only on Kotlin and Kotlinx libraries
class SharedRepository(
    private val api: ApiClient
) {
    suspend fun fetch(): Result<String> {
        return runCatching { api.get("/data").body() }
    }
}
```

### 2. Model Platform Variability with `expect` / `actual`

The `expect`/`actual` mechanism is the primary tool for abstracting platform-specific behavior. Declare an `expect` declaration in the common source set and provide matching `actual` implementations in each platform source set. Use it sparingly — prefer interfaces and dependency injection where possible, and reserve `expect`/`actual` for true platform capabilities.

```kotlin
// commonMain
expect fun platformName(): String

// androidMain
actual fun platformName(): String = "Android ${Build.VERSION.SDK_INT}"

// iosMain
actual fun platformName(): String =
    UIDevice.currentDevice.systemName + " " + UIDevice.currentDevice.systemVersion
```

### 3. Keep Dependencies in the Right Source Sets

Declare dependencies in the source set where they are actually used. Common libraries (Kotlinx Coroutines, kotlinx.serialization, Ktor) go in `commonMain`; platform libraries (AndroidX, UIKit, Foundation) go in their own source sets. This prevents accidental platform coupling and keeps the build graph honest.

```kotlin
sourceSets {
    commonMain.dependencies {
        implementation(libs.kotlinx.coroutines.core)
        implementation(libs.ktor.client.core)
        implementation(libs.kotlinx.serialization.json)
    }
    androidMain.dependencies {
        implementation(libs.androidx.core.ktx)
        implementation(libs.ktor.client.okhttp)
    }
    iosMain.dependencies {
        implementation(libs.ktor.client.darwin)
    }
}
```

### 4. Prefer Libraries That Are Themselves Multiplatform

Whenever possible, choose libraries with first-class KMP support: **Ktor** for networking, **kotlinx.serialization** for JSON, **kotlinx.coroutines** for concurrency, **SQLDelight** or **Room with KMP support** for persistence, and **Koin** or **kotlin-inject** for dependency injection. Using multiplatform libraries means you write the integration once in `commonMain` and it runs everywhere.

### 5. Design for Small Platform Interfaces

A common mistake is building enormous `expect` declarations with dozens of functions. Instead, design small, focused platform interfaces and keep the `actual` implementations thin. If a platform capability is complex, wrap it behind a repository or provider interface that you can mock in tests.

```kotlin
interface PlatformContextProvider {
    fun currentPlatformName(): String
    fun isDebugBuild(): Boolean
}
```

### 6. Use Compose Multiplatform for Shared UI — Deliberately

Compose Multiplatform lets you write the UI once and render it on Android, iOS, desktop, and web. It is a powerful choice, but decide deliberately: if your app is heavily iOS-focused with deep reliance on native iOS UX conventions, a fully shared Compose UI may not fit every screen. A pragmatic pattern is **shared business logic + shared Compose screens for common flows + native screens for platform-specific flows**.

### 7. Test in Common Code

Put unit tests in `commonTest` so they run on every target. Use `kotlin.test`, `kotlinx.coroutines.test`, and mock libraries that support KMP. Shared tests give you the highest return on testing effort because they verify the logic that is reused across all platforms.

### 8. Manage Platform-Specific Configuration with Source Set Hierarchies

Use the intermediate source sets (e.g., `iosMain` covering both `iosArm64` and `iosSimulatorArm64`) to share code between closely related targets without duplicating it. This reduces the surface area where you must write `actual` implementations.

## Implementation Steps

### Step 1: Scaffold the Multiplatform Project

Create a new Kotlin Multiplatform project. With Android Studio, use the **Kotlin Multiplatform** wizard; for a shared Compose UI, select the **Compose Multiplatform** application template. The generated structure separates the shared code from the platform entry points:

```text
myapp/
├── composeApp/                # Shared Compose UI + common logic
│   ├── src/
│   │   ├── commonMain/        # Shared code (domain, data, UI)
│   │   │   └── kotlin/...
│   │   ├── androidMain/       # Android entry point + actuals
│   │   ├── iosMain/           # iOS entry point + actuals
│   │   ├── desktopMain/       # Desktop entry point + actuals
│   │   └── commonTest/        # Shared tests
│   └── build.gradle.kts
├── iosApp/                    # Native iOS Xcode project
├── gradle/libs.versions.toml
└── settings.gradle.kts
```

### Step 2: Configure the Compose Multiplatform Plugin

Enable the Compose Multiplatform Gradle plugin and declare the targets and source sets you intend to support in `composeApp/build.gradle.kts`:

```kotlin
plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidApplication)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
}

kotlin {
    androidTarget()
    listOf(
        iosArm64(),
        iosSimulatorArm64()
    ).forEach { iosTarget ->
        iosTarget.binaries.framework {
            baseName = "ComposeApp"
            isStatic = true
        }
    }
    jvm("desktop")

    sourceSets {
        commonMain.dependencies {
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.ui)
        }
        androidMain.dependencies {
            implementation(libs.androidx.activity.compose)
        }
    }
}
```

### Step 3: Write the Shared Domain and Data Layers

Define your business models, use cases, and repositories in `commonMain`. These are the classes that run unchanged on every platform, so keep them free of any platform-specific imports.

```kotlin
// commonMain/kotlin/com/example/app/data/UserRepository.kt
@Serializable
data class User(val id: String, val name: String)

interface UserRepository {
    suspend fun getUser(id: String): User
}

class NetworkUserRepository(
    private val client: HttpClient
) : UserRepository {
    override suspend fun getUser(id: String): User {
        return client.get("https://api.example.com/users/$id")
            .body()
    }
}
```

### Step 4: Add `expect` / `actual` for Platform Capabilities

Identify the small set of platform capabilities your app needs — device name, safe area insets, haptics, deep-link handling — and model them with `expect`/`actual`.

```kotlin
// commonMain
expect fun deviceDescription(): String

// androidMain
actual fun deviceDescription(): String =
    "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}"

// iosMain
actual fun deviceDescription(): String =
    UIDevice.currentDevice.model + " " + UIDevice.currentDevice.systemVersion
```

### Step 5: Build the Shared UI with Compose Multiplatform

Write composables once in `commonMain` and reuse them across all targets. Use the Material 3 components from Compose, which render natively on each platform.

```kotlin
@Composable
fun GreetingScreen(platformName: String) {
    var count by remember { mutableStateOf(0) }
    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = { count++ }) {
                Text("+")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Hello from $platformName")
            Text("You have pressed $count times")
        }
    }
}
```

### Step 6: Wire Up the Platform Entry Points

Each target needs a minimal entry point that hosts the shared Compose UI. On Android this is an `Activity`; on iOS it is a `MainViewController`; on desktop it is a `main` function.

```kotlin
// androidMain
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            App()
        }
    }
}

// iosMain
fun MainViewController(): UIViewController = ComposeUIViewController { App() }

// desktopMain
fun main() = application {
    Window(onCloseRequest = ::exitApplication, title = "KMP App") {
        App()
    }
}
```

### Step 7: Connect the iOS App to the Shared Framework

The `iosApp` Xcode project links the generated framework produced by the shared module. Set the framework `baseName` to match what your Xcode target imports, and call the generated `MainViewController` from the Swift entry point.

```swift
import UIKit
import ComposeApp

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = MainViewControllerKt.MainViewController()
        window?.makeKeyAndVisible()
        return true
    }
}
```

### Step 8: Write Shared Tests

Place tests that exercise your shared logic in `commonTest`. They run on every configured target, catching regressions across the board.

```kotlin
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.test.runTest

class UserRepositoryTest {
    @Test
    fun defaultUserHasEmptyFavoriteList() = runTest {
        val repo = FakeUserRepository()
        val user = repo.getUser("u1")
        assertEquals("u1", user.id)
    }
}
```

### Step 9: Build, Test, and Verify on All Targets

Run the shared tests and build each target to confirm everything compiles and passes:

```bash
./gradlew :composeApp:allTests
./gradlew :composeApp:assembleDebug        # Android
./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64
./gradlew :composeApp:run                  # Desktop
```

Iterate until all targets build cleanly. Keep the shared code coverage high, because tests in `commonTest` are your safety net for every platform at once.

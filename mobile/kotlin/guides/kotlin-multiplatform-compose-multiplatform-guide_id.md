---
title: "Panduan Kotlin Multiplatform dan Compose Multiplatform"
description: "Panduan komprehensif untuk berbagi kode lintas Android, iOS, desktop, dan web dengan Kotlin Multiplatform dan Compose Multiplatform — mencakup struktur proyek, expect/actual, logika bisnis bersama, berbagi UI, dan integrasi platform."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Kotlin Multiplatform dan Compose Multiplatform

## Pendahuluan

Kotlin Multiplatform (KMP) telah berevolusi dari sekadar eksperimen yang menjanjikan menjadi cara yang siap produksi untuk berbagi logika bisnis di seluruh Android, iOS, desktop, dan web. Jika dikombinasikan dengan Compose Multiplatform, basis kode UI deklaratif yang sama dapat dirender secara native di Android, iOS, macOS, Windows, Linux, dan web. Hal ini secara drastis mengurangi jumlah kode khusus platform yang harus Anda tulis, sekaligus menjaga arsitektur aplikasi tetap bersih dan mudah diuji.

Panduan ini menyajikan praktik terbaik yang terbukti di industri untuk menyusun proyek Kotlin Multiplatform, menggunakan `expect`/`actual` untuk mengisolasi perbedaan platform, berbagi lapisan domain dan data, berbagi UI dengan Compose Multiplatform, serta berintegrasi dengan API native platform. Baik Anda memulai aplikasi KMP baru maupun memigrasikan basis kode Android yang sudah ada, praktik-praktik ini akan membantu Anda membangun produk lintas platform yang dapat dipelihara tanpa mengorbankan kualitas native.

## Praktik Terbaik

### 1. Pisahkan Logika Bersama dari UI Platform

Jaga modul bersama tetap fokus pada lapisan **domain** dan **data**: model, use case, repository, dan jaringan. Jangan menaruh kode khusus Android atau iOS ke dalam source set umum. Lapisan UI dapat sepenuhnya dibagikan (Compose Multiplatform) atau native per platform, tetapi logika inti harus selalu tetap agnostik terhadap framework.

**Anti-pola**: Menaruh referensi `Activity`, `Composable`, atau `UIViewController` ke dalam kode umum bersama.

```kotlin
// ❌ Anti-pola — tipe framework Android bocor ke modul bersama
class SharedRepository {
    fun fetch(context: Context): String { /* ... */ }
}
```

```kotlin
// ✅ Disarankan — kode bersama hanya bergantung pada Kotlin dan pustaka Kotlinx
class SharedRepository(
    private val api: ApiClient
) {
    suspend fun fetch(): Result<String> {
        return runCatching { api.get("/data").body() }
    }
}
```

### 2. Modelkan Variabilitas Platform dengan `expect` / `actual`

Mekanisme `expect`/`actual` adalah alat utama untuk mengabstraksi perilaku khusus platform. Deklarasikan deklarasi `expect` di source set umum dan sediakan implementasi `actual` yang cocok di setiap source set platform. Gunakan secukupnya — lebih baik gunakan interface dan injeksi dependensi jika memungkinkan, dan cadangkan `expect`/`actual` untuk kemampuan platform yang sesungguhnya.

```kotlin
// commonMain
expect fun platformName(): String

// androidMain
actual fun platformName(): String = "Android ${Build.VERSION.SDK_INT}"

// iosMain
actual fun platformName(): String =
    UIDevice.currentDevice.systemName + " " + UIDevice.currentDevice.systemVersion
```

### 3. Jaga Dependensi di Source Set yang Tepat

Deklarasikan dependensi di source set tempat dependensi tersebut sebenarnya digunakan. Pustaka umum (Kotlinx Coroutines, kotlinx.serialization, Ktor) masuk ke `commonMain`; pustaka platform (AndroidX, UIKit, Foundation) masuk ke source set-nya sendiri. Ini mencegah penggandengan platform yang tidak disengaja dan menjaga grafik build tetap jujur.

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

### 4. Utamakan Pustaka yang Sudah Mendukung Multiplatform

Jika memungkinkan, pilih pustaka dengan dukungan KMP kelas satu: **Ktor** untuk jaringan, **kotlinx.serialization** untuk JSON, **kotlinx.coroutines** untuk konkurensi, **SQLDelight** atau **Room dengan dukungan KMP** untuk persistensi, serta **Koin** atau **kotlin-inject** untuk injeksi dependensi. Menggunakan pustaka multiplatform berarti Anda menulis integrasinya sekali di `commonMain` dan berjalan di mana saja.

### 5. Rancang Antarmuka Platform yang Kecil

Kesalahan umum adalah membangun deklarasi `expect` yang sangat besar dengan puluhan fungsi. Sebaliknya, rancang antarmuka platform yang kecil dan fokus, serta jaga implementasi `actual` tetap tipis. Jika kemampuan platform itu kompleks, bungkus di balik antarmuka repository atau provider yang dapat Anda tiru dalam pengujian.

```kotlin
interface PlatformContextProvider {
    fun currentPlatformName(): String
    fun isDebugBuild(): Boolean
}
```

### 6. Gunakan Compose Multiplatform untuk UI Bersama — Secara Sadar

Compose Multiplatform memungkinkan Anda menulis UI sekali dan merendernya di Android, iOS, desktop, dan web. Ini adalah pilihan yang kuat, tetapi putuskan secara sadar: jika aplikasi Anda sangat berfokus pada iOS dengan ketergantungan mendalam pada konvensi UX native iOS, UI Compose yang sepenuhnya dibagikan mungkin tidak cocok untuk setiap layar. Pola yang pragmatis adalah **logika bisnis bersama + layar Compose bersama untuk alur umum + layar native untuk alur khusus platform**.

### 7. Uji di Kode Bersama

Letakkan pengujian unit di `commonTest` sehingga berjalan di setiap target. Gunakan `kotlin.test`, `kotlinx.coroutines.test`, dan pustaka mock yang mendukung KMP. Pengujian bersama memberi Anda pengembalian usaha pengujian tertinggi karena memverifikasi logika yang digunakan kembali di semua platform.

### 8. Kelola Konfigurasi Khusus Platform dengan Hierarki Source Set

Gunakan source set antara (misalnya, `iosMain` yang mencakup `iosArm64` dan `iosSimulatorArm64`) untuk berbagi kode antara target yang saling terkait tanpa menggandakannya. Ini mengurangi area permukaan tempat Anda harus menulis implementasi `actual`.

## Langkah Implementasi

### Langkah 1: Membuat Kerangka Proyek Multiplatform

Buat proyek Kotlin Multiplatform yang baru. Dengan Android Studio, gunakan wizard **Kotlin Multiplatform**; untuk UI Compose bersama, pilih templat aplikasi **Compose Multiplatform**. Struktur yang dihasilkan memisahkan kode bersama dari titik masuk platform:

```text
myapp/
├── composeApp/                # UI Compose bersama + logika umum
│   ├── src/
│   │   ├── commonMain/        # Kode bersama (domain, data, UI)
│   │   │   └── kotlin/...
│   │   ├── androidMain/       # Titik masuk Android + actuals
│   │   ├── iosMain/           # Titik masuk iOS + actuals
│   │   ├── desktopMain/       # Titik masuk desktop + actuals
│   │   └── commonTest/        # Pengujian bersama
│   └── build.gradle.kts
├── iosApp/                    # Proyek Xcode iOS native
├── gradle/libs.versions.toml
└── settings.gradle.kts
```

### Langkah 2: Konfigurasi Plugin Compose Multiplatform

Aktifkan plugin Gradle Compose Multiplatform dan deklarasikan target serta source set yang ingin Anda dukung di `composeApp/build.gradle.kts`:

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

### Langkah 3: Menulis Lapisan Domain dan Data Bersama

Definisikan model bisnis, use case, dan repository Anda di `commonMain`. Kelas-kelas ini berjalan tanpa perubahan di setiap platform, jadi jaga agar bebas dari impor khusus platform apa pun.

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

### Langkah 4: Tambahkan `expect` / `actual` untuk Kemampuan Platform

Identifikasi kumpulan kecil kemampuan platform yang dibutuhkan aplikasi Anda — nama perangkat, inset area aman, haptik, penanganan deep link — dan modelkan dengan `expect`/`actual`.

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

### Langkah 5: Membangun UI Bersama dengan Compose Multiplatform

Tulis composable sekali di `commonMain` dan gunakan kembali di semua target. Gunakan komponen Material 3 dari Compose, yang dirender secara native di setiap platform.

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

### Langkah 6: Menghubungkan Titik Masuk Platform

Setiap target membutuhkan titik masuk minimal yang menampung UI Compose bersama. Di Android ini adalah `Activity`; di iOS ini adalah `MainViewController`; di desktop ini adalah fungsi `main`.

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

### Langkah 7: Menghubungkan Aplikasi iOS ke Framework Bersama

Proyek Xcode `iosApp` menautkan framework yang dihasilkan oleh modul bersama. Setel `baseName` framework agar cocok dengan impor target Xcode Anda, dan panggil `MainViewController` yang dihasilkan dari titik masuk Swift.

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

### Langkah 8: Menulis Pengujian Bersama

Letakkan pengujian yang menguji logika bersama Anda di `commonTest`. Pengujian ini berjalan di setiap target yang dikonfigurasi, menangkap regresi di semua platform sekaligus.

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

### Langkah 9: Build, Uji, dan Verifikasi di Semua Target

Jalankan pengujian bersama dan build setiap target untuk memastikan semuanya terkompilasi dan lolos:

```bash
./gradlew :composeApp:allTests
./gradlew :composeApp:assembleDebug        # Android
./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64
./gradlew :composeApp:run                  # Desktop
```

Ulangi hingga semua target ter-build dengan bersih. Jaga cakupan kode bersama tetap tinggi, karena pengujian di `commonTest` adalah jaring pengaman Anda untuk setiap platform sekaligus.

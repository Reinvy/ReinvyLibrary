---
title: "Cheat Sheet Pengamanan Android Kotlin"
description: "Referensi cepat untuk mengamankan aplikasi Android yang dibangun dengan Kotlin — enkripsi berbasis Keystore, EncryptedSharedPreferences, certificate pinning, Network Security Config, autentikasi biometrik, deteksi root dan emulator, WebView aman, SQLCipher, ProGuard/R8, dan penguncian manifest."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Pengamanan Android Kotlin

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Enkripsi preferensi aplikasi | `EncryptedSharedPreferences` dari `androidx.security:security-crypto` | Membungkus SharedPreferences dengan nilai AES-256 dan kunci AES-SIV yang didukung Android Keystore |
| Membuat kunci berbasis hardware | `KeyGenerator` dengan `AndroidKeyStore` | Membuat kunci AES/HMAC yang material privatnya tidak pernah keluar dari secure element |
| Menyimpan nilai sensitif | `MasterKey.Builder(context)` | Kunci master terpusat untuk EncryptedSharedPreferences dan helper kripto lainnya |
| Memblokir HTTP cleartext | `android:usesCleartextTraffic="false"` di manifest | Memaksa semua koneksi menggunakan HTTPS di tingkat platform |
| Membatasi kebijakan jaringan | `network_security_config.xml` dengan `base-config` dan `domain-config` | Mengontrol cleartext dan trust anchor per domain, bukan secara global |
| Mem-pin sertifikat API | `CertificatePinner.Builder().add(host, pin)` di OkHttp | Melindungi dari serangan MITM oleh CA yang jahat atau disusupi |
| Autentikasi biometrik | `BiometricPrompt` dari `androidx.biometric:biometric` | Membatasi aksi sensitif di balik sidik jari, wajah, atau kredensial perangkat |
| Enkripsi database Room | `SupportFactory` dari `net.zetetic:android-database-sqlcipher` | Enkripsi database penuh AES-256 dengan SQLCipher |
| Mencegah SQL injection | `@Query` Room dengan argumen `:parameter` terikat | Parameter di-escape oleh binding SQLite, tidak pernah dirangkai string |
| Membatasi komponen terekspor | `android:exported="false"` pada activity, service, provider internal | Menyembunyikan komponen aplikasi dari peluncuran aplikasi lain |
| Menonaktifkan backup rahasia | `android:allowBackup="false"` plus `dataExtractionRules` | Mencegah adb dan cloud backup mengekstrak kunci dan token |
| Mendeteksi perangkat root | Memeriksa biner `su` dan `Build.TAGS` | Memungkinkan aplikasi menolak berjalan dengan hak istimewa tinggi |
| Mendeteksi emulator | Memeriksa `Build.FINGERPRINT`, `Build.MODEL`, `Build.MANUFACTURER` | Menghalangi lingkungan analisis menjalankan aplikasi |
| Mengecilkan dan mengaburkan kode rilis | `isMinifyEnabled = true` dengan R8 | Menghapus kode mati dan mengganti nama kelas serta anggota |
| Menghapus log debug | Melindungi panggilan `Log.d(...)` dengan `BuildConfig.DEBUG` | Mencegah data sensitif bocor melalui log rilis |
| Mengunci WebView | `allowFileAccess = false`, `MIXED_CONTENT_NEVER_ALLOW` | Mengurangi permukaan serangan WebView untuk konten tertanam |
| Mengunci pohon dependensi | `dependencyLocking` Gradle dengan lockfile | Melindungi dari pencurian rantai pasok pada dependensi transitif |
| Memverifikasi tanda tangan APK | `apksigner verify --verbose app-release.apk` | Memastikan artefak rilis menggunakan skema v2/v3 dan sertifikat valid |

## Perintah Umum

### Menambahkan Dependensi Keamanan

```kotlin
// app/build.gradle.kts
dependencies {
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("net.zetetic:android-database-sqlcipher:4.5.4")
    implementation("androidx.sqlite:sqlite-ktx:2.4.0")
}
```

Pin versi eksak daripada rentang mengambang agar pembaruan transitif tidak diam-diam mengubah perilaku kriptografi.

### Mengaktifkan R8, Penyusutan, dan Obfuskasi

```kotlin
// app/build.gradle.kts
android {
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

### Menjalankan Pemeriksaan Keamanan Android Lint

```bash
# Menjalankan lint pada seluruh proyek
./gradlew lint

# Lokasi laporan
# app/build/reports/lint-results-release.html
```

Kategori `Security` dan `SecurityWarning` pada lint akan menandai komponen terekspor, `allowBackup=false` yang hilang, lalu lintas cleartext, dan pengaturan WebView yang tidak aman.

### Memeriksa APK Rilis

```bash
# Memverifikasi tanda tangan APK (skema v2/v3)
apksigner verify --verbose app-release.apk

# Menampilkan detail sertifikat penandatangan
apksigner verify --print-certs app-release.apk

# Menampilkan atribut manifest seperti allowBackup dan usesCleartextTraffic
aapt dump badging app-release.apk
```

Selalu verifikasi artefak yang benar-benar diunggah ke toko aplikasi, bukan varian debug yang dibangun lokal.

### Membuat dan Memverifikasi Keystore Penandatanganan

```bash
# Membuat keystore rilis (simpan offline, jangan pernah di version control)
keytool -genkeypair -v \
  -keystore release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias release

# Memeriksa keystore yang ada tanpa mencetak kata sandinya
keytool -list -v -keystore release.jks
```

### Memindai Kebocoran Rahasia

```bash
# Mencari pola kredensial umum di seluruh pohon sumber
grep -RIn -e "password" -e "secret" -e "api[_-]?key" -e "BEGIN RSA PRIVATE KEY" . \
  --exclude-dir=build --exclude-dir=.gradle --exclude-dir=.git

# Menemukan file kunci yang tidak sengaja tertinggal
find . -name "*.jks" -o -name "*.keystore" -o -name "*.p12" -o -name "service_account*.json"
```

## Potongan Kode

### EncryptedSharedPreferences dengan MasterKey

```kotlin
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val securePrefs = EncryptedSharedPreferences.create(
    context,
    "secure_prefs",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

securePrefs.edit().putString("auth_token", token).apply()
val token = securePrefs.getString("auth_token", null)
```

Jangan menyimpan token sesi, kunci API, atau PII di `SharedPreferences` biasa.

### Membuat Kunci AES Berbasis Keystore

```kotlin
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.KeyGenerator

val keyGen = KeyGenerator.getInstance(
    KeyProperties.KEY_ALGORITHM_AES,
    "AndroidKeyStore"
)

val spec = KeyGenParameterSpec.Builder(
    "app_secret_key",
    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
)
    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
    .setUserAuthenticationRequired(true)
    .setInvalidatedByBiometricEnrollment(true)
    .build()

keyGen.init(spec)
val key = keyGen.generateKey()
```

Saat `setUserAuthenticationRequired(true)` diaktifkan, kunci hanya dapat dipakai setelah autentikasi biometrik atau kredensial perangkat berhasil.

### Mengenkripsi Data dengan Cipher Keystore

```kotlin
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec

val cipher = Cipher.getInstance("AES/GCM/NoPadding")
cipher.init(Cipher.ENCRYPT_MODE, key)

val iv = cipher.iv
val ciphertext = cipher.doFinal(plaintext)

// Simpan IV bersama ciphertext — IV tidak bersifat rahasia
val payload = Base64.encodeToString(
    iv + SEPARATOR + ciphertext,
    Base64.NO_WRAP
)
```

Untuk dekripsi, inisialisasi ulang cipher dengan `Cipher.DECRYPT_MODE`, kunci yang sama, dan IV tersimpan melalui `GCMParameterSpec(128, iv)`.

### Certificate Pinning dengan OkHttp

```kotlin
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient

val certificatePinner = CertificatePinner.Builder()
    .add("api.example.com", "sha256/AAAA...primaryPin")
    .add("api.example.com", "sha256/BBBB...backupPin")
    .build()

val client = OkHttpClient.Builder()
    .certificatePinner(certificatePinner)
    .build()
```

Pin setidaknya dua sertifikat agar rotasi kunci tidak membuat aplikasi offline, dan jadwalkan pengecekan kedaluwarsa pin sebelum tanggal rotasi yang sebenarnya.

### Konfigurasi Keamanan Jaringan

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.example.com</domain>
        <pin-set expiration="2027-01-01">
            <pin digest="SHA-256">base64EncodedPin1</pin>
            <pin digest="SHA-256">base64EncodedPin2</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

`base-config` ini menolak cleartext secara global, sedangkan `domain-config` menambahkan pinning khusus untuk host API.

### Mengonfigurasi Manifest untuk Keamanan

```xml
<application
    android:allowBackup="false"
    android:fullBackupContent="false"
    android:usesCleartextTraffic="false"
    android:networkSecurityConfig="@xml/network_security_config"
    android:dataExtractionRules="@xml/data_extraction_rules"
    android:debuggable="false" />

<activity android:name=".MainActivity" android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity>

<activity android:name=".InternalActivity" android:exported="false" />
<provider android:name=".InternalProvider" android:exported="false" />
```

Setiap komponen yang tidak perlu diluncurkan oleh aplikasi lain harus `exported="false"`.

### Mengecualikan Rahasia dari Backup dan Transfer Perangkat

```xml
<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="sharedpref" path="secure_prefs.xml" />
        <exclude domain="database" path="app.db" />
    </cloud-backup>
    <device-transfer>
        <exclude domain="sharedpref" path="secure_prefs.xml" />
        <exclude domain="database" path="app.db" />
    </device-transfer>
</data-extraction-rules>
```

### Autentikasi dengan BiometricPrompt

```kotlin
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat

val executor = ContextCompat.getMainExecutor(context)
val prompt = BiometricPrompt(
    activity,
    executor,
    object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(
            result: BiometricPrompt.AuthenticationResult
        ) {
            // Buka kunci cipher Keystore dan keluarkan rahasia
        }

        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) = Unit
        override fun onAuthenticationFailed() = Unit
    }
)

val promptInfo = BiometricPrompt.PromptInfo.Builder()
    .setTitle("Konfirmasi identitas Anda")
    .setSubtitle("Buka kunci kredensial terenkripsi")
    .setAllowedAuthenticators(
        BIOMETRIC_STRONG or DEVICE_CREDENTIAL
    )
    .build()

prompt.authenticate(promptInfo)
```

Untuk keamanan maksimal, kombinasikan `BiometricPrompt` dengan kunci Keystore `setUserAuthenticationRequired(true)` sehingga rahasia hanya dapat didekripsi setelah autentikasi berhasil.

### Deteksi Root dan Emulator

```kotlin
import android.os.Build
import java.io.File

object DeviceIntegrityChecks {
    private val rootIndicators = listOf(
        "/system/bin/su",
        "/system/xbin/su",
        "/sbin/su",
        "/system/app/Superuser.apk",
        "/system/etc/init.d/99SuperSUDaemon"
    )

    fun isRooted(): Boolean =
        rootIndicators.any { File(it).exists() } ||
            Build.TAGS?.contains("test-keys") == true

    fun isEmulator(): Boolean =
        Build.FINGERPRINT.startsWith("generic") ||
            Build.MODEL.contains("google_sdk") ||
            Build.MODEL.contains("Emulator") ||
            Build.MANUFACTURER.contains("Genymotion")
}
```

Heuristik ini menghalangi perusakan kasual, tetapi bukan pengganti layanan attestation sisi server seperti Play Integrity API.

### Mengamankan WebView

```kotlin
webView.settings.apply {
    javaScriptEnabled = true // hanya jika konten yang dimuat tepercaya
    allowFileAccess = false
    allowContentAccess = false
    javaScriptCanOpenWindowsAutomatically = false
    mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
}

webView.webViewClient = object : android.webkit.WebViewClient() {
    override fun shouldOverrideUrlLoading(
        view: android.webkit.WebView,
        request: android.webkit.WebResourceRequest
    ): Boolean = request.url.scheme != "https"
}
```

Jangan pernah mengaktifkan `setAllowFileAccess` atau `setAllowUniversalAccessFromFileURLs` untuk konten yang dimuat melalui jaringan.

### Query Room yang Aman dari SQL Injection

```kotlin
import androidx.room.Dao
import androidx.room.Query

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE email = :email LIMIT 1")
    suspend fun findByEmail(email: String): User?
}
```

Selalu ikat input pengguna sebagai parameter bernama. Merangkai nilai ke SQL mentah membuka celah injeksi ala `WHERE 1=1`.

### Mengenkripsi Room dengan SQLCipher

```kotlin
import net.zetetic.database.sqlcipher.SupportFactory

// Dapatkan passphrase dari penyimpanan berbasis Keystore, bukan dari sumber kode
val passphrase = securePrefs.getString("db_passphrase", null)
val factory = SupportFactory(passphrase!!.toByteArray())

val db = Room.databaseBuilder(
    context,
    AppDatabase::class.java,
    "app.db"
)
    .openHelperFactory(factory)
    .build()
```

SQLCipher mengenkripsi seluruh file database dengan AES-256, sehingga backup yang dicuri atau direktori data APK yang ditarik hanya menghasilkan ciphertext.

### Menjaga Model dengan Aturan ProGuard

```text
# Pertahankan field model Gson/Retrofit untuk serialisasi berbasis refleksi
-keepclassmembers class com.example.app.data.model.** { <fields>; }

# Pertahankan nama implementasi Parcelable dan field CREATOR-nya
-keepnames class * implements android.os.Parcelable

# Pertahankan konstruktor default kelas model
-keepclassmembers class com.example.app.data.model.** {
    public <init>();
}
```

Tambahkan aturan `-keep` eksplisit untuk apa pun yang diakses melalui refleksi; R8 tidak dapat menyimpulkan penggunaan tersebut dari bytecode.

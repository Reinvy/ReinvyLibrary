---
title: "Kotlin Android Security Hardening Cheatsheet"
description: "A quick reference for hardening Android apps built with Kotlin — Keystore-backed encryption, EncryptedSharedPreferences, certificate pinning, Network Security Config, biometric authentication, root and emulator detection, secure WebView, SQLCipher, ProGuard/R8, and manifest lockdown."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Kotlin Android Security Hardening Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Encrypt app preferences | `EncryptedSharedPreferences` from `androidx.security:security-crypto` | Wraps SharedPreferences with AES-256 values and AES-SIV keys backed by the Android Keystore |
| Generate a hardware-backed key | `KeyGenerator` with `AndroidKeyStore` | Creates AES/HMAC keys whose private material never leaves the secure element |
| Store sensitive values | `MasterKey.Builder(context)` | Central master key used by EncryptedSharedPreferences and other crypto helpers |
| Block cleartext HTTP | `android:usesCleartextTraffic="false"` in the manifest | Forces every connection to use HTTPS at the platform level |
| Scope network security policy | `network_security_config.xml` with `base-config` and `domain-config` | Controls cleartext and trust anchors per domain instead of globally |
| Pin API certificates | `CertificatePinner.Builder().add(host, pin)` in OkHttp | Protects against MITM attacks by rogue or compromised CAs |
| Authenticate via biometrics | `BiometricPrompt` from `androidx.biometric:biometric` | Gates sensitive actions behind fingerprint, face, or device credential |
| Encrypt the Room database | `SupportFactory` from `net.zetetic:android-database-sqlcipher` | Full-database AES-256 encryption with SQLCipher |
| Prevent database SQL injection | Room `@Query` with bound `:parameter` arguments | Parameters are escaped by SQLite bindings, never string-concatenated |
| Restrict exported components | `android:exported="false"` on internal activities, services, providers | Hides app components from being launched by other applications |
| Disable backups of secrets | `android:allowBackup="false"` plus `dataExtractionRules` | Prevents adb and cloud backup from exfiltrating keys and tokens |
| Detect rooted devices | Check `su` binaries and `Build.TAGS` | Lets apps decline to run under elevated privileges |
| Detect emulators | Check `Build.FINGERPRINT`, `Build.MODEL`, `Build.MANUFACTURER` | Blocks analysis environments from running the app |
| Shrink and obfuscate release code | `isMinifyEnabled = true` with R8 | Removes dead code and renames classes and members |
| Strip debug logging | Guard `Log.d(...)` calls with `BuildConfig.DEBUG` | Prevents sensitive data leaking through release logs |
| Lock down WebView | `allowFileAccess = false`, `MIXED_CONTENT_NEVER_ALLOW` | Reduces the WebView attack surface for embedded content |
| Pin the dependency tree | Gradle `dependencyLocking` with lockfiles | Protects against supply-chain tampering of transitive dependencies |
| Verify the APK signature | `apksigner verify --verbose app-release.apk` | Confirms the release artifact uses schemes v2/v3 and a valid certificate |

## Common Commands

### Adding Security Dependencies

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

Pin exact versions instead of floating ranges so a transitive update cannot silently change cryptographic behavior.

### Enabling R8 Shrinking and Obfuscation

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

### Running Android Lint Security Checks

```bash
# Run lint on the whole project
./gradlew lint

# Report location
# app/build/reports/lint-results-release.html
```

Lint's `Security` and `SecurityWarning` categories flag exported components, missing `allowBackup=false`, cleartext traffic, and unsafe WebView settings.

### Inspecting the Release APK

```bash
# Verify the APK signature (v2/v3 schemes)
apksigner verify --verbose app-release.apk

# Print the signing certificate details
apksigner verify --print-certs app-release.apk

# Dump manifest attributes such as allowBackup and usesCleartextTraffic
aapt dump badging app-release.apk
```

Always verify the artifact that is actually uploaded to the store, not a locally built debug variant.

### Generating and Verifying the Signing Keystore

```bash
# Generate a release keystore (store it offline, never in version control)
keytool -genkeypair -v \
  -keystore release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias release

# Inspect an existing keystore without printing the password
keytool -list -v -keystore release.jks
```

### Scanning for Leaked Secrets

```bash
# Search the source tree for common credential patterns
grep -RIn -e "password" -e "secret" -e "api[_-]?key" -e "BEGIN RSA PRIVATE KEY" . \
  --exclude-dir=build --exclude-dir=.gradle --exclude-dir=.git

# Locate accidental key files
find . -name "*.jks" -o -name "*.keystore" -o -name "*.p12" -o -name "service_account*.json"
```

## Code Snippets

### EncryptedSharedPreferences with a MasterKey

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

Do not store session tokens, API keys, or PII in plain `SharedPreferences`.

### Generating a Keystore-Backed AES Key

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

When `setUserAuthenticationRequired(true)` is set, the key can only be used after a successful biometric or device-credential unlock.

### Encrypting Data with the Keystore Cipher

```kotlin
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec

val cipher = Cipher.getInstance("AES/GCM/NoPadding")
cipher.init(Cipher.ENCRYPT_MODE, key)

val iv = cipher.iv
val ciphertext = cipher.doFinal(plaintext)

// Persist the IV alongside the ciphertext — it is not secret
val payload = Base64.encodeToString(
    iv + SEPARATOR + ciphertext,
    Base64.NO_WRAP
)
```

For decryption, re-initialize the cipher with `Cipher.DECRYPT_MODE`, the same key, and the stored IV via `GCMParameterSpec(128, iv)`.

### OkHttp Certificate Pinning

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

Pin at least two certificates so key rotation does not take the app offline, and schedule pin expiry checks before real rotation dates.

### Network Security Configuration

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

This base-config rejects cleartext globally, while the `domain-config` adds pinning for the API host only.

### Configuring the Manifest for Security

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

Every component that does not need to be launched by other apps must be `exported="false"`.

### Excluding Secrets from Backup and Device Transfer

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

### BiometricPrompt Authentication

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
            // Unlock the Keystore cipher and release the secret
        }

        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) = Unit
        override fun onAuthenticationFailed() = Unit
    }
)

val promptInfo = BiometricPrompt.PromptInfo.Builder()
    .setTitle("Confirm your identity")
    .setSubtitle("Unlock the encrypted credential")
    .setAllowedAuthenticators(
        BIOMETRIC_STRONG or DEVICE_CREDENTIAL
    )
    .build()

prompt.authenticate(promptInfo)
```

For maximum security combine `BiometricPrompt` with a `setUserAuthenticationRequired(true)` Keystore key so the secret is only decryptable after a successful authentication.

### Root and Emulator Detection

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

These heuristics deter casual tampering but are not a substitute for a server-side attestation service such as Play Integrity API.

### Securing WebView

```kotlin
webView.settings.apply {
    javaScriptEnabled = true // only when the loaded content is trusted
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

Never enable `setAllowFileAccess` or `setAllowUniversalAccessFromFileURLs` for content loaded over the network.

### SQL-Injection-Safe Room Queries

```kotlin
import androidx.room.Dao
import androidx.room.Query

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE email = :email LIMIT 1")
    suspend fun findByEmail(email: String): User?
}
```

Always bind user input as named parameters. String-concatenating values into raw SQL opens the door to `WHERE 1=1` style injection.

### Encrypting Room with SQLCipher

```kotlin
import net.zetetic.database.sqlcipher.SupportFactory

// Obtain the passphrase from a Keystore-backed store, never from source
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

SQLCipher encrypts the entire database file with AES-256, so a stolen backup or pulled APK data directory yields only ciphertext.

### Keeping Models with ProGuard Rules

```text
# Keep fields of Gson/Retrofit model classes for reflection-based serialization
-keepclassmembers class com.example.app.data.model.** { <fields>; }

# Keep names of Parcelable implementations and their CREATOR fields
-keepnames class * implements android.os.Parcelable

# Keep the default constructor of model classes
-keepclassmembers class com.example.app.data.model.** {
    public <init>();
}
```

Add explicit `-keep` rules for anything accessed via reflection; R8 cannot infer those usages from bytecode.

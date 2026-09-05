---
title: "Swift iOS Security and Data Protection Guide"
description: "A deep-dive guide covering Keychain protection, data protection classes, App Transport Security, certificate pinning, LocalAuthentication, Secure Enclave, and jailbreak detection for iOS apps."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Swift iOS Security and Data Protection Guide

## Introduction

iOS is one of the most locked-down consumer platforms in existence, but the platform's strong default security does not make an app secure by itself. Storing an access token in `UserDefaults`, logging a password to the console, or silently downgrading HTTP traffic can expose user data even on a perfectly patched device. This guide focuses on the security controls you actually control from Swift: protecting secrets with the Keychain, encrypting files at rest with Data Protection classes, enforcing HTTPS with App Transport Security, verifying server identity with certificate pinning, authenticating users with Face ID and Touch ID, and defending against tampered (jailbroken) environments, while keeping the trade-offs between security and usability explicit.

The guide assumes you already ship an iOS app and understand the basics of Swift concurrency and networking. Every recommendation here is framed in terms of a realistic threat model: what adversary you are defending against, what the mitigation costs, and how to verify the control actually works.

## Best Practices

### 1. Store Secrets in the Keychain, Never in UserDefaults

The Keychain is an encrypted, hardware-backed database managed by `securityd`. Items are encrypted with device keys derived from the hardware UID and your app's code signature, so they cannot be read by another app on the same device and are destroyed when the app is uninstalled. In contrast, `UserDefaults` writes a plaintext property list into the app container, where it is readable by anyone with a jailbroken device, a backup, or access to the file system through a debugger. Rules of thumb:

- Store access tokens, refresh tokens, passwords, API keys, and cryptographic keys in the Keychain.
- Store only non-sensitive preferences (theme, feature flags) in `UserDefaults`.
- Never store tokens in `UserDefaults` "temporarily" — temporary data has a way of becoming permanent.
- Always set `kSecAttrAccessible` explicitly; the default may not match your needs.
- Strip whitespace and newlines from strings before hashing or comparing them, and always compare sensitive values with constant-time utilities where available.

For a configurable per-app passcode or a feature unlock, combine the Keychain with the `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` accessibility level (see below) instead of inventing your own encryption.

### 2. Choose Keychain Accessibility Levels Deliberately

The `kSecAttrAccessible` attribute controls **when** a Keychain item can be read, and `ThisDeviceOnly` variants prevent items from migrating to iCloud Keychain backups or to other devices. Pick the strictest level your feature allows:

- `kSecAttrAccessibleWhenUnlocked` — readable while the device is unlocked; the item becomes unreadable while the device is locked. Good default for session tokens.
- `kSecAttrAccessibleAfterFirstUnlock` — readable after the first unlock of the device, even while locked afterwards. Required for background tasks such as push notification handling that run before the user unlocks the device.
- `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` / `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` — same as above but never backed up or synced via iCloud; preferred for most app tokens.
- `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` — readable only when the device is unlocked **and** a passcode is enabled; if the user has no passcode, the item cannot be created at all. Use for the most sensitive secrets such as payment keys or master encryption keys.

Note that `kSecUseDataProtectionKeychain` is deprecated and no longer needed — Keychain data protection is always enabled on iOS 13 and later.

### 3. Protect Files with Data Protection Classes

Every file in an iOS app container can be assigned a Data Protection class that ties the file's encryption keys to the device's lock state. The system encrypts the file contents with a per-file key, wrapped by a class key that is only available under specific unlock conditions:

| Protection class | Availability | Use case |
|---|---|---|
| `complete` | Only while the device is unlocked | Chat history, drafts, account data displayed in the UI |
| `completeUnlessOpen` | While unlocked; already-open files stay readable when locked | Media playback, files written by background tasks |
| `completeUntilFirstUserAuthentication` | After first unlock, even while locked afterwards | Default for most apps; good for caches and downloaded content |
| `none` | Always | Non-sensitive, high-volume caches |

The default for app-created files is `completeUntilFirstUserAuthentication`, which is why a file created by a background fetch can be read while the device is locked. If the file contains sensitive user data that should only be visible in an unlocked session, mark it `complete` explicitly.

### 4. Enforce HTTPS with App Transport Security

App Transport Security (ATS) is on by default and blocks plaintext `http://` connections from `URLSession`, `NSURLConnection`, and related APIs. Never disable it globally: the `NSAllowsArbitraryLoads` key requires justification during App Store review and opens every request to passive interception. When you must talk to a legacy HTTP endpoint, add a narrow exception for that domain only, and prefer `NSExceptionAllowsInsecureHTTPLoads = false` with a future migration path. Also note that ATS does **not** apply to `WKWebView` — if you embed web content that loads remote resources, configure a Content Security Policy (CSP) on the server side and consider restricting navigation.

### 5. Pin Certificates for Critical Endpoints

Transport Layer Security protects against passive eavesdropping, but the server's certificate chain is validated against a set of publicly trusted root CAs — which means any CA mis-issuing a certificate for your domain (or a compromised CA) could impersonate your API. Certificate or public key pinning forces the client to accept only a known certificate/public key, raising the bar against man-in-the-middle attacks. Pin the **public key** rather than the certificate so you survive certificate rotation as long as the key pair is stable:

- Pin the SPKI (SubjectPublicKeyInfo) SHA-256 digest of your API's signing key.
- Keep at least two pins (current + backup key) so key rotation does not lock users out.
- Fail closed on unknown pins, but log pin mismatches for diagnostics.
- Consider a library such as TrustKit for policy management and reporting, or implement pinning manually in `URLSessionDelegate` (shown in the implementation steps).

### 6. Require Biometrics with LocalAuthentication

`LocalAuthentication` lets you ask for Face ID or Touch ID without your app ever seeing the biometric data — the comparison happens inside the Secure Enclave. Use `LAContext.canEvaluatePolicy` to check availability, and always provide a `localizedReason` string that the user can understand (the system displays it in the prompt). For the highest-value operations (opening a wallet, revealing a master key), evaluate an access control that combines the passcode fallback with the biometric capability, and treat a failed authentication with an exponential backoff rather than allowing unlimited retries. Remember that `deviceOwnerAuthentication` includes the device passcode as a fallback, while `deviceOwnerAuthenticationWithBiometrics` does not.

### 7. Keep Cryptographic Keys in the Secure Enclave

For asymmetric keys that sign or decrypt sensitive data (Apple Pay-style flows, E2EE key pairs, app licensing), generate the key inside the Secure Enclave with `SecKeyCreateRandomKey` and the `kSecAttrTokenIDSecureEnclave` attribute. The private key material never leaves the Enclave — even the OS cannot export it — and you can require biometric authorization for every use by attaching a `SecAccessControl` with `biometryCurrentSet`. Use this pattern instead of storing a raw private key blob in the Keychain, which would still be usable by anyone with access to the Keychain item.

### 8. Defend Against Tampered Environments

Jailbroken and modified-device environments defeat many of iOS's guarantees: sandbox restrictions are relaxed, file system access is root-level, and runtime patching (e.g., Frida) is possible. If your app handles money, proprietary content, or regulated data, layer in integrity checks, but treat them as **deterrence, not absolute guarantees** — every jailbreak detection technique can be bypassed with enough effort. Useful signals:

- Presence of jailbreak artifacts (Cydia, MobileSubstrate, SSH, Apt).
- Ability to write outside the sandbox.
- Debugger attachment detection (`sysctl` with `P_TRACED`).
- Code signature validation with `SecStaticCodeCheckValidity`.

Also protect against simpler integrity failures: the app switcher snapshots your UI by default, so hide sensitive screens (bank balances, chat previews) from snapshots by covering the window when the app resigns active.

### 9. Avoid Common Secure-Coding Mistakes

- **Logging secrets**: never log tokens, passwords, or payment data; use `OSLog` privacy redaction (`\(token, privacy: .private)`) and prefix public fields explicitly.
- **Insecure deserialization**: use `Codable` with a strict model, or `NSSecureCoding` for `NSKeyedArchiver` data; never unarchive data from an untrusted source with `unarchiveTopLevelObjectWithData` without secure coding enabled.
- **WebView pitfalls**: avoid legacy `UIWebView` (deprecated) and load remote content in `WKWebView` only when needed; disable features you do not use (`javaScriptCanOpenWindowsAutomatically`, `allowsBackForwardNavigationGestures` where appropriate).
- **Copy/paste leakage**: sensitive fields that should not be copied should set `UITextField.isSecureTextEntry` or mask values in the UI; consider disabling paste in sensitive contexts.
- **Push payloads**: never put sensitive content in push notification payloads — they transit through Apple's servers and appear in the notification center; send a silent notification and fetch the content over TLS instead.

### 10. Harden the Supply Chain

Third-party frameworks ship as much attack surface as your own code, and a compromised dependency is a popular attack vector. Mitigations:

- Pin exact versions in `Package.resolved` (Xcode records the resolved revision and checksum).
- Review new dependencies for maintenance status, license, and permission scope; prefer small, focused packages over monolithic ones.
- Add dependency scanning (OWASP Dependency-Check, Snyk, or GitHub Dependabot) to CI.
- Verify the sender's identity when downloading binary frameworks; prefer Swift Package Manager or CocoaPods over hand-dropped binaries.

## Implementation Steps

### Step 1: Define the Threat Model

Write down what you are protecting, from whom, and what happens if it leaks:

1. Inventory sensitive data: tokens, passwords, payment data, PII, private keys.
2. Identify the realistic adversaries: casual data theft from a stolen device, malware on the device, network attackers, a malicious CA, jailbreak users, insider access to backups.
3. For each item, choose the cheapest control that mitigates the threat: Keychain `ThisDeviceOnly` for tokens, Data Protection `complete` for files, ATS + pinning for network, LocalAuthentication for high-value actions.

Record this document in the repo; it is the justification reviewers and future maintainers need.

### Step 2: Add a Keychain Wrapper with Explicit Accessibility

Create a small, testable Keychain service. Use `kSecClassGenericPassword` with your bundle identifier as the service name to namespace items:

```swift
import Foundation
import Security

struct KeychainStore {
    let service: String = Bundle.main.bundleIdentifier ?? "com.example.app"

    func save(_ data: Data, key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecValueData as String: data
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        if status == errSecDuplicateItem {
            try update(data, key: key)
        } else if status != errSecSuccess {
            throw KeychainError(status: status)
        }
    }

    func read(key: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw KeychainError(status: status) }
        return result as? Data
    }

    func delete(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError(status: status)
        }
    }

    private func update(_ data: Data, key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        let attributes: [String: Any] = [kSecValueData as String: data]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        guard status == errSecSuccess else { throw KeychainError(status: status) }
    }
}

struct KeychainError: Error {
    let status: OSStatus
    init(status: OSStatus) { self.status = status }
}
```

Migrate existing tokens held in `UserDefaults` by reading them once, storing them in the Keychain, and removing the `UserDefaults` key. Ship this migration in the same release that introduces the Keychain wrapper.

### Step 3: Protect Sensitive Files with Data Protection

For files that should only be readable while the device is unlocked, request the `complete` class at creation time:

```swift
let fileURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    .appendingPathComponent("drafts.json")

let data = try JSONEncoder().encode(draft)
try data.write(to: fileURL, options: [.completeFileProtection])
```

For existing files, set the attribute explicitly:

```swift
try FileManager.default.setAttributes(
    [.protectionKey: FileProtectionType.complete],
    ofItemAtPath: fileURL.path
)
```

If you use Core Data, apply protection to the persistent store; the default stores are only `completeUntilFirstUserAuthentication`:

```swift
let storeDescription = NSPersistentStoreDescription(url: storeURL)
storeDescription.setOption(FileProtectionType.complete as NSObject,
                           forKey: NSPersistentStoreFileProtectionKey)
container.persistentStoreDescriptions = [storeDescription]
```

When the store is protected with `complete` and the device is locked, reads fail with `NSFileReadNoPermissionError` or a Core Data error — handle that error by showing a "unlock to continue" state instead of crashing.

### Step 4: Configure ATS and Info.plist Security Keys

Keep ATS globally enabled and add narrow exceptions only where truly needed:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSAllowsLocalNetworking</key>
    <true/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>legacy-api.example.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
            <key>NSIncludesSubdomains</key>
            <false/>
        </dict>
    </dict>
</dict>
```

`NSAllowsLocalNetworking` permits local-network (localhost, `.local`, private IPs) connections useful for development and on-device debugging without weakening ATS for public hosts. Remove every exception you no longer use, and schedule the retirement of any legacy HTTP endpoint.

### Step 5: Implement Public Key Pinning with URLSession

Compute the SHA-256 digest of your API's SPKI (using `openssl s_client`/`openssl x509 -pubkey` plus `sha256`, or a tool such as `ssl-pin`), store the digest as a build-time constant, and enforce it in the session delegate:

```swift
import CryptoKit
import Foundation

final class PinningDelegate: NSObject, URLSessionDelegate {
    private let pinnedSPKIHash: String

    init(pinnedSPKIHash: String) {
        self.pinnedSPKIHash = pinnedSPKIHash
    }

    func urlSession(_ session: URLSession,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        var secError: CFError?
        guard SecTrustEvaluateWithError(serverTrust, &secError),
              let serverKey = SecTrustCopyKey(serverTrust),
              let keyData = SecKeyCopyExternalRepresentation(serverKey, nil) as Data? else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        let digest = SHA256.hash(data: keyData)
        let digestHex = digest.map { String(format: "%02x", $0) }.joined()

        guard digestHex == pinnedSPKIHash else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        completionHandler(.useCredential, URLCredential(trust: serverTrust))
    }
}
```

Use the delegate when building your session:

```swift
let session = URLSession(configuration: .ephemeral,
                         delegate: PinningDelegate(pinnedSPKIHash: "..."),
                         delegateQueue: nil)
```

Keep a backup pin constant for the next key generation and switch the active pin during a maintenance window, never in an emergency. Add a unit test that feeds a known-good and a known-bad trust challenge and asserts the completion handler disposition.

### Step 6: Add Biometric Authentication

Protect sensitive flows with Face ID or Touch ID through `LocalAuthentication`:

```swift
import LocalAuthentication

enum BiometricGate {
    static func authenticate(reason: String) async throws -> Bool {
        let context = LAContext()
        var policyError: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &policyError) else {
            throw BiometricError.unavailable(policyError)
        }
        return try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)
    }
}

enum BiometricError: Error {
    case unavailable(NSError?)
}
```

For keys that must be usable **only after** biometric approval, attach the access control to the Keychain item creation so the Secure Enclave enforces it:

```swift
let accessControl = SecAccessControlCreateWithFlags(
    kCFAllocatorDefault,
    kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
    [.biometryCurrentSet, .devicePasscode],
    nil
)
```

Then pass `kSecAttrAccessControl: accessControl` in the Keychain query; every read will prompt for Face ID/Touch ID.

### Step 7: Add Integrity and Jailbreak Detection

Add a self-contained integrity module. Keep it defensive and non-blocking: log violations, optionally degrade features, but do not hard-crash — attackers simply patch the check out of a crash loop.

```swift
import Darwin

enum IntegrityChecker {
    static func jailbreakSignals() -> [String] {
        let paths = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/usr/sbin/sshd",
            "/usr/bin/ssh",
            "/etc/apt",
            "/private/var/stash",
            "/var/lib/cydia"
        ]
        let existing = paths.filter { FileManager.default.fileExists(atPath: $0) }

        // Sandbox escape probe: a stock sandbox denies writes here.
        let probePath = "/private/jailbreak-probe.txt"
        let writable = (try? "probe".write(toFile: probePath, atomically: true, encoding: .utf8)) != nil

        return existing + (writable ? ["sandbox-escape-write"] : [])
    }

    static func isBeingDebugged() -> Bool {
        var info = kinfo_proc()
        var size = MemoryLayout<kinfo_proc>.stride
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        guard sysctl(&mib, u_int(mib.count), &info, &size, nil, 0) == 0 else { return false }
        return (info.kp_proc.p_flag & P_TRACED) != 0
    }
}
```

Hide sensitive screens from the app switcher snapshots:

```swift
// In your scene delegate
func sceneWillResignActive(_ scene: UIScene) {
    let shield = UIView(frame: window?.bounds ?? .zero)
    shield.backgroundColor = .systemBackground
    shield.tag = 9_001
    window?.addSubview(shield)
}

func sceneDidBecomeActive(_ scene: UIScene) {
    window?.viewWithTag(9_001)?.removeFromSuperview()
}
```

Document the expected signals in your analytics and alert on unexpected spikes (e.g., many users reporting jailbreak flags after a release is a warning sign of a repackaged app).

### Step 8: Audit Dependencies and Build Configuration

1. Review `Package.resolved` and confirm every pin has a checksum and a revision your team controls.
2. Run a dependency vulnerability scan in CI and block merges on high-severity findings.
3. Remove unused frameworks and disable unnecessary capabilities in the signing entitlement file.
4. Verify release builds use the release configuration with compiler optimizations, and consider stripping symbols.

```bash
# Example CI dependency check (Dependabot/OSV scanner produces the same signal)
swift package resolve
grep -c '"checksum"' Package.resolved   # > 0 means resolved pins are checksummed
```

1. Confirm the app's keychain access groups in the entitlements match the team ID prefix so cross-app sharing is intentional, not accidental.

### Step 9: Write Security Tests

Security controls that are not automated rot. Add tests that fail the build when a control regresses:

- Keychain round-trip: save/read/delete succeeds and returns the same bytes; deleting a missing key does not throw.
- ATS configuration: assert `Bundle.main` does not contain `NSAllowsArbitraryLoads = true` in the release Info.plist.
- Pinning: feed the session delegate a valid and an invalid trust challenge and assert the disposition.
- Data protection: create a file with `.completeFileProtection` and assert its protection attribute.
- Secure coding: archive/unarchive a model with `NSSecureCoding` and assert unknown classes are rejected.
- `UserDefaults` hygiene: grep the codebase for token names stored via `UserDefaults` (a simple regex test) and fail on matches.

```swift
import XCTest

final class SecurityConfigurationTests: XCTestCase {
    func testATSIsNotDisabledGlobally() throws {
        let info = Bundle.main.object(forInfoDictionaryKey: "NSAppTransportSecurity") as? [String: Any]
        let arbitraryLoads = info?["NSAllowsArbitraryLoads"] as? Bool
        XCTAssertNotEqual(arbitraryLoads, true)
    }

    func testTokensNotPersistedInUserDefaults() throws {
        let defaults = UserDefaults.standard.dictionaryRepresentation().keys
        XCTAssertFalse(defaults.contains { $0.localizedCaseInsensitiveContains("token") })
    }
}
```

### Step 10: Run the Release Security Checklist

Before shipping, walk the checklist with the team:

1. No `NSAllowsArbitraryLoads = true`; only scoped exceptions remain.
2. All tokens, keys, and passwords live in the Keychain with `ThisDeviceOnly` accessibility.
3. Sensitive files use `complete` or `completeUnlessOpen` protection.
4. Critical API endpoints are pinned and the backup pin is documented.
5. Biometric gates are in place for high-value actions and fail closed.
6. Jailbreak/debugger detection signals are logged and monitored.
7. `Package.resolved` pins are checksummed; no unmaintained or vulnerable dependencies.
8. No secrets in logs, push payloads, or analytics events.
9. Release build is signed with the distribution certificate; entitlements contain only needed capabilities.
10. Security tests pass in CI and the threat model document is up to date.

Treat the checklist as a living artifact — every new feature that touches data or networking should add a row to it, and every mitigation should have an automated test that makes it concrete.

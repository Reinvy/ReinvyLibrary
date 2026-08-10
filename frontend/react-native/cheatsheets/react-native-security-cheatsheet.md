---
title: "React Native Security Cheatsheet"
description: "A quick reference for securing React Native apps: secure storage, certificate pinning, jailbreak detection, secrets management, and app hardening."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# React Native Security Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Store secrets securely | `expo-secure-store` | Keychain-backed storage on iOS, Keystore-backed on Android |
| Pin server certificate | `react-native-ssl-pinning` | Lock HTTPS connections to a known certificate or public key |
| Detect compromised device | `react-native-device-info` | Refuse to run on rooted, jailbroken, or emulated devices |
| Hide API keys | `react-native-config` | Keep secrets out of the JS bundle via native build config |
| Obfuscate JS bundle | `react-native-obfuscator` | Rename symbols and mangle the release bundle |
| Encrypt local database | `react-native-sqlite-storage` + SQLCipher | Encrypt SQLite data at rest |
| Validate deep links | `Linking.getInitialURL()` + allowlist | Block spoofed or unexpected deep link payloads |
| Force HTTPS traffic | `android:usesCleartextTraffic="false"` | Disable cleartext HTTP on Android |
| Harden WebView | `react-native-webview` props | Restrict navigation, scripts, and mixed content |
| Protect auth tokens | Keychain access level | Bind tokens to the device and require unlock |

## Common Commands

### Installing Security Packages

```bash
# Secure storage backed by iOS Keychain / Android Keystore
npx expo install expo-secure-store

# Certificate pinning for fetch and image requests
npm install react-native-ssl-pinning

# Device integrity and hardware information
npm install react-native-device-info

# Encrypted SQLite via SQLCipher
npm install react-native-sqlite-storage

# Build-time secrets from native config (.env)
npm install react-native-config

# Release bundle obfuscation (dev dependency)
npm install --save-dev react-native-obfuscator
```

### Generating a Pinning Certificate

```bash
# Export the server's public certificate as PEM
openssl s_client -connect api.example.com:443 -showcerts \
  < /dev/null 2>/dev/null | openssl x509 -outform PEM > cert.pem

# Compute the SHA-256 public key hash used for pinning
openssl x509 -in cert.pem -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary | openssl enc -base64
```

### Release Builds and Bundle Inspection

```bash
# Android release build (Hermes bytecode by default on RN 0.70+)
cd android && ./gradlew assembleRelease

# iOS release build
cd .. && npx react-native run-ios --configuration Release

# Inspect the produced bundle format
file android/app/build/generated/assets/react/release/index.android.bundle
```

## Code Snippets

### Secure Storage with expo-secure-store

```javascript
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

// Save a token: iOS Keychain / Android Keystore, never AsyncStorage
await SecureStore.setItemAsync(TOKEN_KEY, accessToken, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});

// Read it back when the app starts
const token = await SecureStore.getItemAsync(TOKEN_KEY);

// Remove it on logout or session expiry
await SecureStore.deleteItemAsync(TOKEN_KEY);
```

### Certificate Pinning with react-native-ssl-pinning

```javascript
import { fetch } from 'react-native-ssl-pinning';

const response = await fetch('https://api.example.com/v1/me', {
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` },
  sslPinning: {
    certs: ['cert'], // name of the .pem in android/app/src/main/assets
  },
  timeoutInterval: 10000,
});

if (response.status === 200) {
  const profile = await response.json();
}
```

### Jailbreak and Root Detection

```javascript
import DeviceInfo from 'react-native-device-info';

function deviceIsCompromised() {
  return DeviceInfo.isRooted() || DeviceInfo.isRootedEmulator();
}

// Fail closed: block sensitive flows on compromised devices
if (deviceIsCompromised()) {
  // Abort the session, log the event, and warn the user
}
```

### Keeping Secrets Out of the Bundle

```text
# .env — never commit this file
API_BASE_URL=https://api.example.com
API_KEY=sk_live_4f8a1c2d
```

```javascript
import Config from 'react-native-config';

// Values are injected at build time from the native layer
const baseUrl = Config.API_BASE_URL;
const apiKey = Config.API_KEY;
```

### Release Bundle Hardening

```text
Bundle type            | Tool                    | Reverse-engineering difficulty
-----------------------|-------------------------|-------------------------------
Plain JS bundle        | Metro (dev builds)      | Trivial — readable source
Hermes bytecode        | Hermes (RN 0.70+)      | Moderate — needs Hermes tooling
Obfuscated Hermes      | react-native-obfuscator | High — renamed symbols + bytecode
```

```javascript
// metro.config.js — integrate obfuscation into the transform pipeline
const obfuscator = require('react-native-obfuscator');

module.exports = {
  transformer: {
    transform: (src, filename, options) => {
      const result = require('metro-transform-worker').transform(
        src,
        filename,
        options,
      );
      return {
        ...result,
        code: obfuscator.obfuscate(result.code, filename),
      };
    },
  },
};
```

### Encrypted Database with SQLCipher

```javascript
import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG = false;
SQLite.enablePromise(true);

// The key is derived from a secret stored in expo-secure-store
const db = await SQLite.openDatabase(
  { name: 'app.db', key: dbKey, location: 'default' },
);

const [rows] = await db.executeSql(
  'SELECT * FROM messages WHERE user_id = ?',
  [userId],
);
```

### Deep Link Validation

```javascript
import { Linking } from 'react-native';

const allowedHosts = ['example.com', 'www.example.com'];

const handleOpenURL = async (event) => {
  const { url } = event;
  const parsed = new URL(url);

  // Reject links from unexpected hosts (spoofed QR codes, push payloads)
  if (!allowedHosts.includes(parsed.hostname)) {
    return;
  }

  if (parsed.pathname === '/reset-password') {
    // Proceed with the password reset flow
  }
};

Linking.addEventListener('url', handleOpenURL);
```

### WebView Hardening

```javascript
import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: 'https://example.com' }}
  originWhitelist={['https://*']}
  javaScriptEnabled
  domStorageEnabled
  mixedContentMode="never"
  allowFileAccess={false}
  onShouldStartLoadWithRequest={(request) =>
    request.url.startsWith('https://')
  }
/>;
```

### Android Network Security Config

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application
  android:usesCleartextTraffic="false"
  android:networkSecurityConfig="@xml/network_security_config">
</application>
```

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
```

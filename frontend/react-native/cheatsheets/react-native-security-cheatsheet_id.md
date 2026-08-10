---
title: "Cheat Sheet Keamanan React Native"
description: "Referensi cepat untuk mengamankan aplikasi React Native: penyimpanan aman, certificate pinning, deteksi jailbreak, manajemen rahasia, dan penguatan aplikasi."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Keamanan React Native

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Simpan rahasia dengan aman | `expo-secure-store` | Penyimpanan berbasis Keychain di iOS, Keystore di Android |
| Pasang sertifikat server | `react-native-ssl-pinning` | Kunci koneksi HTTPS ke sertifikat atau public key yang dikenal |
| Deteksi perangkat yang disusupi | `react-native-device-info` | Tolak berjalan di perangkat rooted, jailbroken, atau emulator |
| Sembunyikan API key | `react-native-config` | Jaga rahasia keluar dari bundle JS via konfigurasi native |
| Obfuskasi bundle JS | `react-native-obfuscator` | Ganti nama simbol dan acak bundle rilis |
| Enkripsi database lokal | `react-native-sqlite-storage` + SQLCipher | Enkripsi data SQLite saat disimpan |
| Validasi deep link | `Linking.getInitialURL()` + allowlist | Blokir payload deep link yang dipalsukan atau tak terduga |
| Paksa lalu lintas HTTPS | `android:usesCleartextTraffic="false"` | Nonaktifkan HTTP cleartext di Android |
| Perkuat WebView | properti `react-native-webview` | Batasi navigasi, skrip, dan mixed content |
| Lindungi token autentikasi | tingkat akses Keychain | Ikat token ke perangkat dan wajibkan unlock |

## Perintah Umum

### Memasang Paket Keamanan

```bash
# Penyimpanan aman berbasis Keychain iOS / Keystore Android
npx expo install expo-secure-store

# Certificate pinning untuk permintaan fetch dan gambar
npm install react-native-ssl-pinning

# Informasi integritas perangkat dan perangkat keras
npm install react-native-device-info

# SQLite terenkripsi via SQLCipher
npm install react-native-sqlite-storage

# Rahasia saat build dari konfigurasi native (.env)
npm install react-native-config

# Obfuskasi bundle rilis (dev dependency)
npm install --save-dev react-native-obfuscator
```

### Membuat Sertifikat untuk Pinning

```bash
# Ekspor sertifikat publik server sebagai PEM
openssl s_client -connect api.example.com:443 -showcerts \
  < /dev/null 2>/dev/null | openssl x509 -outform PEM > cert.pem

# Hitung hash SHA-256 public key yang dipakai untuk pinning
openssl x509 -in cert.pem -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary | openssl enc -base64
```

### Build Rilis dan Inspeksi Bundle

```bash
# Build rilis Android (bytecode Hermes secara default di RN 0.70+)
cd android && ./gradlew assembleRelease

# Build rilis iOS
cd .. && npx react-native run-ios --configuration Release

# Periksa format bundle yang dihasilkan
file android/app/build/generated/assets/react/release/index.android.bundle
```

## Potongan Kode

### Penyimpanan Aman dengan expo-secure-store

```javascript
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

// Simpan token: Keychain iOS / Keystore Android, jangan pernah AsyncStorage
await SecureStore.setItemAsync(TOKEN_KEY, accessToken, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});

// Baca kembali saat aplikasi dimulai
const token = await SecureStore.getItemAsync(TOKEN_KEY);

// Hapus saat logout atau sesi berakhir
await SecureStore.deleteItemAsync(TOKEN_KEY);
```

### Certificate Pinning dengan react-native-ssl-pinning

```javascript
import { fetch } from 'react-native-ssl-pinning';

const response = await fetch('https://api.example.com/v1/me', {
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` },
  sslPinning: {
    certs: ['cert'], // nama file .pem di android/app/src/main/assets
  },
  timeoutInterval: 10000,
});

if (response.status === 200) {
  const profile = await response.json();
}
```

### Deteksi Jailbreak dan Root

```javascript
import DeviceInfo from 'react-native-device-info';

function perangkatDisusupi() {
  return DeviceInfo.isRooted() || DeviceInfo.isRootedEmulator();
}

// Fail closed: blokir alur sensitif pada perangkat yang disusupi
if (perangkatDisusupi()) {
  // Hentikan sesi, catat kejadian, dan beri peringatan ke pengguna
}
```

### Menjaga Rahasia Keluar dari Bundle

```text
# .env — jangan pernah commit file ini
API_BASE_URL=https://api.example.com
API_KEY=sk_live_4f8a1c2d
```

```javascript
import Config from 'react-native-config';

// Nilai disuntikkan saat build dari lapisan native
const baseUrl = Config.API_BASE_URL;
const apiKey = Config.API_KEY;
```

### Penguatan Bundle Rilis

```text
Jenis bundle              | Alat                   | Tingkat kesulitan reverse-engineering
--------------------------|------------------------|--------------------------------------
Bundle JS polos           | Metro (build dev)      | Sepele — sumber mudah dibaca
Bytecode Hermes           | Hermes (RN 0.70+)     | Sedang — butuh perkakas Hermes
Hermes terobfuskasi       | react-native-obfuscator | Tinggi — simbol diganti + bytecode
```

```javascript
// metro.config.js — integrasikan obfuskasi ke pipeline transform
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

### Database Terenkripsi dengan SQLCipher

```javascript
import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG = false;
SQLite.enablePromise(true);

// Kunci diturunkan dari rahasia yang disimpan di expo-secure-store
const db = await SQLite.openDatabase(
  { name: 'app.db', key: dbKey, location: 'default' },
);

const [rows] = await db.executeSql(
  'SELECT * FROM messages WHERE user_id = ?',
  [userId],
);
```

### Validasi Deep Link

```javascript
import { Linking } from 'react-native';

const daftarHostDiizinkan = ['example.com', 'www.example.com'];

const tanganiOpenURL = async (event) => {
  const { url } = event;
  const parsed = new URL(url);

  // Tolak tautan dari host tak terduga (QR code palsu, payload push)
  if (!daftarHostDiizinkan.includes(parsed.hostname)) {
    return;
  }

  if (parsed.pathname === '/reset-password') {
    // Lanjutkan alur reset kata sandi
  }
};

Linking.addEventListener('url', tanganiOpenURL);
```

### Penguatan WebView

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

### Konfigurasi Keamanan Jaringan Android

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

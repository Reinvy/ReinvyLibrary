---
title: "Panduan CI CD React Native"
description: "Panduan praktis merilis aplikasi React Native dengan EAS Build, fastlane, penandatanganan kode terkelola, kanal beta, pembaruan OTA, dan pemantauan rilis yang menangkap regresi sebelum pengguna menemukannya."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan CI CD React Native

## Pendahuluan

Rilis React Native bukan satu artefak, melainkan empat: binary iOS, binary Android, bundle JavaScript yang dimuat masing-masing, dan metadata yang memberi tahu tester serta toko aplikasi tentang apa yang berubah. Sebagian besar masalah rilis muncul karena keempatnya dibiarkan melenceng — build yang ditandatangani dengan keystore salah, pembaruan OTA didorong ke kanal yang tidak dibaca build mana pun, atau `versionCode` yang ditolak Play Console setelah build empat puluh menit.

Panduan ini menjaga semuanya tetap sejalan: EAS Build untuk artefak terkompilasi, fastlane ketika Anda butuh lane native atau otomasi metadata toko, kredensial disimpan di satu tempat terkelola, dan EAS Update untuk perbaikan khusus JavaScript di balik kontrak runtime version yang eksplisit. Hasilnya adalah rilis yang bisa Anda ulangi pada Jumat sore tanpa menahan napas.

## Praktik Terbaik

### Jadikan Lingkungan sebagai Build Profile

Setiap masalah rilis yang dimulai dengan "tadi berhasil di build preview" adalah masalah konfigurasi. Profil `eas.json` sebaiknya memetakan satu-ke-satu ke lingkungan — `development` (dev client, internal), `preview` (tester internal, API staging), `production` (binary toko) — dan setiap profil memiliki `env`, channel, serta mode distribusinya sendiri; lihat profil production dan preview pada Langkah 2. Tidak ada bagian dari sebuah lingkungan yang boleh hidup di shell pengembang.

### Simpan Kredensial Penandatanganan di Satu Tempat

Keystore di dalam repo, provisioning profile di laptop, dan secret CI yang tidak cocok dengan keduanya adalah kegagalan signing tiga arah yang klasik. Pilih satu pemilik: kredensial terkelola EAS (`eas credentials`) atau keystore Anda sendiri yang diunggah sekali sebagai secret base64. Aturan yang penting: tidak ada manusia yang butuh materi signing secara lokal untuk merilis — CI harus bisa build hanya dengan token.

```bash
# Unggah keystore Android sekali saja, sebagai secret CI
base64 -i release.keystore | pbcopy   # -> ANDROID_KEYSTORE_BASE64
# Jangan pernah commit *.keystore, *.jks, *.p12, atau *.mobileprovision
```

### Turunkan Nomor Versi dan Build Secara Mekanis

`versionCode` dan `buildNumber` yang diedit manual menyebabkan unggahan ditolak dan build ganda yang membingungkan. Setel `appVersionSource: "remote"` agar EAS yang melacaknya, biarkan `autoIncrement` menaikkannya di setiap build production, dan beri tag commit dengan versi pemasaran yang akan dirilis. Jika nomor build harus reproducible, hitung dari jumlah commit — hitung, jangan diketik.

### Kirim JavaScript Lewat OTA, Dijaga Runtime Version

EAS Update bisa mengirim perbaikan JS dalam hitungan menit, dan juga bisa membuat aplikasi mati karena mengharapkan modul native yang tidak dimilikinya. Kunci `runtimeVersion.policy` ke `appVersion` (atau `fingerprint` untuk jaminan lebih ketat) agar pembaruan hanya sampai ke binary yang permukaan native-nya cocok. Perlakukan OTA sebagai jalur cepat untuk perbaikan, bukan pengganti review toko ketika izin atau kode native berubah.

```bash
# Aman: perbaikan khusus JS pada kanal production
eas update --branch production --message "fix: perbaiki pembulatan total checkout"
```

### Gerbang Promosi Berupa Pemeriksaan, dan Rilis Harus Terpantau

Build hanya yang lolos typecheck, lint, dan test, lalu promosikan dengan mengirim artefak yang sama alih-alih membangun ulang — build ulang untuk production berarti binary yang disetujui tester bukan binary yang diterima pengguna. Dan rilis tanpa pelaporan crash adalah peluncuran buta. Unggah source map dan debug symbol saat build, tandai event dengan versi aplikasi dan kanal OTA, serta pakai staged rollout (persentase Play Console, phased release di App Store Connect) agar build buruk hanya menjangkau lima persen pengguna, bukan semuanya.

## Langkah Implementasi

### Langkah 1: Siapkan Proyek

Pasang EAS CLI, hubungkan proyek, dan tambahkan `expo-updates`. Project ID adalah yang dipakai CI untuk autentikasi, jadi tempatnya di `app.config.ts`.

```bash
npm install --global eas-cli
eas init
npx expo install expo-updates
```

```typescript
// app.config.ts
export default {
    expo: {
        name: 'Reinvy',
        slug: 'reinvy',
        version: '2.4.0',
        runtimeVersion: { policy: 'appVersion' },
        updates: { url: 'https://u.expo.dev/00000000-0000-0000-0000-000000000000' },
        extra: { eas: { projectId: '00000000-0000-0000-0000-000000000000' } },
    },
};
```

### Langkah 2: Definisikan Profil Build, Submit, dan Update

`eas.json` adalah kontrak yang dibaca CI. Sertakan blok `submit` agar unggah ke toko cukup satu perintah, dan setel `appVersionSource` di level teratas.

```json
{
    "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
    "build": {
        "development": { "developmentClient": true, "distribution": "internal" },
        "preview": { "distribution": "internal", "channel": "preview" },
        "production": { "channel": "production", "autoIncrement": true }
    },
    "submit": { "production": {} }
}
```

### Langkah 3: Autentikasi CI Tanpa Laptop

Buat access token Expo, simpan sebagai `EXPO_TOKEN`, dan biarkan pipeline bertindak sebagai identitas mesin. Untuk toko, `eas submit` menerima App Store Connect API key dan service account JSON Play, keduanya disuntikkan sebagai secret.

### Langkah 4: Bangun Pipeline

Satu workflow, satu job, langkah bersyarat: pemeriksaan di setiap jalankan, build preview pada pull request, build production plus submit pada tag versi. `concurrency` mencegah dua rilis berebut nomor build yang sama.

```yaml
name: release
on:
    push: { tags: ['v*'] }
    pull_request:

concurrency:
    group: release-${{ github.ref }}
    cancel-in-progress: false

jobs:
    release:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with: { node-version: 20, cache: npm }
            - run: npm ci
            - run: npx tsc --noEmit && npm test -- --ci
            - if: github.event_name == 'pull_request'
              run: npx eas-cli build --profile preview --platform all --non-interactive
              env: { EXPO_TOKEN: '${{ secrets.EXPO_TOKEN }}' }
            - if: startsWith(github.ref, 'refs/tags/v')
              run: npx eas-cli build --profile production --platform all --non-interactive --auto-submit
              env: { EXPO_TOKEN: '${{ secrets.EXPO_TOKEN }}' }
```

### Langkah 5: Tambahkan fastlane Saat Lane Native Dibutuhkan

EAS menutup sebagian besar kebutuhan, tetapi fastlane tetap unggul untuk metadata toko, screenshot, dan proyek iOS multi-target. Jaga Fastfile tetap tipis — build dan unggah — lalu biarkan workflow yang mengatur orkestrasinya.

```ruby
# fastlane/Fastfile
platform :ios do
  lane :beta do
    upload_to_testflight(ipa: ENV.fetch("IPA_PATH"), skip_waiting_for_build_processing: true)
  rescue => e
    UI.user_error!("Unggahan TestFlight gagal: #{e.message}")
  end
end
```

### Langkah 6: Terbitkan dan Verifikasi Pembaruan OTA

Terbitkan ke kanal yang benar-benar dibaca build, lalu pastikan pembaruan terlihat pada kanal itu sebelum diumumkan. Salah nama kanal gagal secara diam-diam: unggahan berhasil dan tidak ada yang sampai ke pengguna.

```bash
eas update --branch production --message "fix: pembulatan total keranjang" --non-interactive
eas channel:view production --json | jq '.updateBranch.name, .runtimeVersion'
```

### Langkah 7: Hubungkan Pemantauan ke Rilis

Hubungkan Sentry pada commit yang sama dengan perubahan konfigurasi build, cap kanal OTA ke tag rilis, dan unggah source map di setiap build agar stack trace terbaca. Lalu pantau tiga angka: sesi tanpa crash (di atas 99,5%), adopsi versi baru dalam 48 jam, dan tingkat keberhasilan OTA — rollout yang macet di lima persen biasanya berarti pemeriksaan pembaruan rusak, bukan pengguna yang lambat beradaptasi.

```typescript
// src/monitoring.ts
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    release: `${Updates.runtimeVersion}@${Updates.updateId ?? 'embedded'}`,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0.2,
});
```

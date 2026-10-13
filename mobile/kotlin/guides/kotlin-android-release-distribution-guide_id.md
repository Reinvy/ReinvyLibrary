---
title: "Panduan Rilis dan Distribusi Aplikasi Android Kotlin"
description: "Panduan komprehensif untuk merilis aplikasi Android produksi yang dibangun dengan Kotlin — versioning, Play App Signing, penyusutan R8, App Bundle, track Play Console, peluncuran bertahap, otomatisasi rilis CI dengan fastlane, dan pemantauan pasca-rilis."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Rilis dan Distribusi Aplikasi Android Kotlin

## Pendahuluan

Mengantarkan aplikasi Android ke pengguna melibatkan jauh lebih banyak hal daripada sekadar menulis kode Kotlin yang hebat. Pipeline rilis — versioning, penandatanganan, penyusutan, pengemasan, publikasi, dan pemantauan — adalah tempat kualitas produksi benar-benar dibuktikan. Rilis yang dikonfigurasi dengan buruk bisa mengirim build yang bisa di-debug, membocorkan keystore, menyajikan APK yang terlalu besar ke setiap perangkat, atau meluncurkan pembaruan yang bermasalah ke seluruh basis pengguna sekaligus.

Panduan ini mencakup siklus hidup rilis dan distribusi secara lengkap untuk aplikasi Android Kotlin: dari strategi versioning semantik, Play App Signing dan optimasi R8, hingga publikasi ke Google Play dengan peluncuran bertahap dan pipeline fastlane yang terotomatisasi. Tujuannya adalah proses rilis yang dapat diulang dan diaudit, yang bisa dijalankan dengan percaya diri oleh siapa pun di tim, dan yang gagal dengan lantang di CI alih-alih senyap di produksi.

## Praktik Terbaik

Praktik di bawah ini diurutkan kurang lebih mengikuti tahapan sebuah rilis. Praktik-praktik ini menggabungkan panduan resmi Android/Google Play dengan pelajaran dari pengoperasian pipeline rilis dalam skala besar.

### 1. Strategi Versioning

Perlakukan `versionCode` dan `versionName` sebagai kontrak dengan Play Store dan dengan pengguna Anda.

- Gunakan nilai `versionCode` bertipe integer yang selalu naik — setiap unggahan ke Play harus memiliki `versionCode` lebih tinggi dari sebelumnya. Turunkan dari satu sumber tunggal, misalnya nomor build CI, sehingga dua engineer tidak akan pernah mengunggah kode yang sama dua kali.
- Gunakan `versionName` semantik untuk manusia (`2.3.1`), dan simpan pemetaan antara keduanya agar catatan rilis dapat merujuknya.
- Beri suffix yang berbeda untuk build non-rilis (`versionNameSuffix = "-dev"`) dan `applicationIdSuffix` khusus untuk flavor staging, sehingga build debug tidak akan pernah tertukar dengan build rilis.
- Generate versi dari version catalog atau `gradle.properties` alih-alih hard-code di `build.gradle.kts`, agar skrip dan fastlane dapat membacanya.

### 2. Manajemen Penandatanganan dan Keystore

- Daftarkan **Play App Signing**: Google yang memegang kunci penandatanganan aplikasi Anda, dan Anda menandatangani unggahan dengan kunci unggah (upload key) yang terpisah. Jika kunci unggah bocor, Anda bisa mencabutnya di Play Console tanpa kehilangan kemampuan menerbitkan pembaruan — ini tidak mungkin dilakukan jika kunci penandatanganan aplikasi hilang.
- Aplikasi baru yang dibuat setelah Agustus 2021 diwajibkan menggunakan Play App Signing. Daftarkan sejak awal; Anda tidak bisa mendaftar setelah aplikasi mencapai track produksi.
- Generate keystore unggahan Anda sekali dengan `keytool`, simpan file `.jks`/`.keystore` secara offline (backup terenkripsi), dan jangan pernah mengirimkannya ke version control. Letakkan path dan password-nya di file `keystore.properties` yang di-gitignore, atau di secret CI.
- Pisahkan penandatanganan debug dan rilis secara ketat. Memasang build bertanda tangan rilis di perangkat lalu menimpanya dengan build debug memerlukan uninstall penuh — otomatiskan pemeriksaan ini agar tidak pernah mengejutkan Anda.
- Di CI, muat kredensial penandatanganan dari environment (keystore ber-encode base64 + password sebagai secret), dan gagalkan build segera jika secret tidak ada.

### 3. Penyusutan, Obfuskasi, dan Optimasi dengan R8

- Aktifkan R8 untuk build rilis (`isMinifyEnabled = true`). R8, shrinker default sejak Android Gradle Plugin 3.4, menghapus kode dan resource yang tidak terpakai serta mengganti nama pengenal, yang mengecilkan APK dan membuatnya lebih sulit di-reverse engineering secara kasual.
- Tulis aturan keep `proguard-rules.pro` secara hati-hati, bukan defensif. Setiap aturan `-keep` melemahkan penyusutan, jadi tambahkan hanya jika R8 terbukti membutuhkannya (refleksi, serialisasi, annotation processor, entry point native).
- Simpan file mapping untuk setiap rilis (`-printmapping mapping.txt`) dan unggah ke Crashlytics agar stack trace yang ter-deobfuscate selalu tersedia.
- Pertimbangkan mode penuh R8 (**full mode**, `android.enableR8.fullMode=true`), yang menerapkan optimasi yang lebih ketat sejak awal, tetapi uji secara menyeluruh sebelum mengaktifkannya.
- Tambahkan baseline profile untuk perjalanan pengguna yang kritis agar cold start lebih cepat dan jank berkurang pada eksekusi pertama — profile ini ikut terkirim sebagai bagian dari app bundle dan tidak memerlukan perubahan di Play Console.

### 4. Pengiriman dengan App Bundle

- Selalu publikasikan **Android App Bundle (AAB)** alih-alih APK universal. Play menggunakan bundle untuk membuat APK yang dioptimalkan khusus perangkat (per density, ABI, dan bahasa), yang biasanya memangkas ukuran unduhan secara signifikan.
- Jaga agar unduhan inti yang bisa diinstal sekecil mungkin. Jika aplikasi Anda mengirim media besar, model ML, atau konten game, pindahkan ke **asset pack** (delivery install-time, fast-follow, atau on-demand) alih-alih membesarkan modul dasar.
- Cadangkan **feature delivery** (Play Feature Delivery) untuk fungsionalitas yang benar-benar opsional — komponen langsung seperti fitur AR atau paket lokalisasi dapat dikirim on-demand.
- Verifikasi bundle yang dihasilkan di CI dengan `bundletool` sebelum diunggah, sehingga kesalahan pengemasan tidak pernah sampai ke store.

### 5. Track Play Console dan Peluncuran Bertahap

- Gunakan tangga track secara penuh: **internal testing** (umpan balik cepat dari kelompok kecil terpercaya), **closed testing** (beta dengan grup undangan), **open testing** (beta publik opt-in), lalu **production**.
- Selalu luncurkan rilis produksi secara bertahap: publikasikan ke persentase kecil (misalnya 1–5%), pantau crash-free users dan Play Vitals selama sehari penuh, lalu naikkan melalui 10%, 20%, 50%, hingga 100%.
- Jangan pernah rollback dengan mengunggah `versionCode` lama — Play melarangnya. Rollback dilakukan dengan menghentikan rollout rilis berjalan atau mempromosikan rilis sebelumnya ke produksi dengan kode baru.
- Simpan catatan rilis di `releasenotes/` per versi (konvensi fastlane) sehingga setiap track mendapatkan catatan yang konsisten dalam semua bahasa yang didukung.

### 6. Quality Gate Rilis di CI

- Definisikan pipeline rilis yang menjalankan lint, unit test, dan instrumented test pada setiap push, dan memblokir branch rilis kecuali semuanya hijau.
- Tambahkan analisis statis (misalnya detekt atau ktlint) dan pemeriksaan kerentanan dependensi ke dalam gate.
- Validasi artefak rilis itu sendiri: pastikan sertifikat penandatanganan dengan `apksigner verify`, pastikan `versionCode` naik, pastikan file mapping ada, dan pastikan AAB dibangun dari checkout yang bersih.
- Jadikan rilis sebagai job eksplisit yang dipicu — bukan efek samping dari merge biasa.

### 7. Otomatisasi Rilis

- Otomatiskan dengan **fastlane** (lane untuk `beta`, `internal`, `production`) atau plugin **Gradle Play Publisher**. Keduanya mengunggah bundle, mengelola track, mempromosikan rilis, dan memperbarui listing store dari CI.
- Simpan keystore unggahan dan password sebagai secret CI, dan dekripsi/muat hanya di dalam pipeline — tidak pernah di repo.
- Tag setiap rilis di git dengan nama versinya, dan generate catatan rilis dari diff tag (`git log previous-tag..tag`) agar catatan tetap akurat.
- Otomatiskan screenshot dengan fastlane `snapshot`/`screengrab` agar listing store tidak pernah menampilkan UI yang usang.

### 8. Pemantauan dan Operasi Pasca-Rilis

- Integrasikan Crashlytics (atau crash reporter pilihan Anda) dan unggah file mapping R8 secara otomatis agar crash ter-deobfuscate.
- Pantau **Play Vitals** — crash rate, ANR rate, dan waktu startup — sebagai metrik kesehatan rilis, bukan sekadar laporan crash.
- Sediakan kill switch jarak jauh (Firebase Remote Config) yang dapat menonaktifkan fitur yang bermasalah tanpa mengirim biner baru.
- Susun playbook rollback terlebih dahulu: hentikan rollout, kembalikan feature flag, dan jika perlu promosikan rilis sebelumnya — dengan rencana komunikasi yang jelas kepada pengguna.

## Langkah Implementasi

Langkah-langkah di bawah ini membawa proyek Android Kotlin dari pengaturan pengembangan sehari-hari menuju pipeline rilis yang sepenuhnya otomatis dan terpantau.

### Langkah 1: Konfigurasi Versioning

Tentukan satu sumber versi. Pola paling sederhana dan kokoh adalah membaca nomor build dari CI dan menggunakan nilai lokal sebagai cadangan:

```kotlin
// app/build.gradle.kts
android {
    defaultConfig {
        versionCode = (System.getenv("BUILD_NUMBER") ?: "1").toInt()
        versionName = "2.3.1"
    }
    buildTypes {
        getByName("release") {
            versionNameSuffix = null
        }
        getByName("debug") {
            versionNameSuffix = "-dev"
        }
    }
}
```

Arahkan CI ke sumber kebenaran tersebut. Contoh potongan job rilis untuk GitHub Actions:

```yaml
- name: Compute build number
  id: build_number
  run: echo "number=${{ github.run_number }}" >> "$GITHUB_OUTPUT"

- name: Build release bundle
  run: ./gradlew bundleRelease
  env:
    BUILD_NUMBER: ${{ steps.build_number.outputs.number }}
```

Sekarang setiap build dari CI mendapatkan `versionCode` unik yang selalu naik, dan build lokal memakai nilai default 1.

### Langkah 2: Menyiapkan Konfigurasi Penandatanganan

Generate keystore unggahan sekali dan simpan secara offline:

```bash
keytool -genkeypair -v -keystore release.keystore -alias release \
  -keyalg RSA -keysize 2048 -validity 10000
```

Simpan kredensial di file properti yang di-gitignore:

```text
# keystore.properties (jangan pernah meng-commit file ini)
storeFile=/secure/offline/path/release.keystore
storePassword=REPLACE_ME
keyAlias=release
keyPassword=REPLACE_ME
```

Hubungkan ke konfigurasi penandatanganan Gradle:

```kotlin
// app/build.gradle.kts
import java.util.Properties

val keystoreProperties = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) load(f.inputStream())
}

android {
    signingConfigs {
        create("release") {
            storeFile = file(keystoreProperties.getProperty("storeFile") ?: "")
            storePassword = keystoreProperties.getProperty("storePassword")
            keyAlias = keystoreProperties.getProperty("keyAlias")
            keyPassword = keystoreProperties.getProperty("keyPassword")
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

Jika `keystore.properties` tidak ada di mesin lokal, konfigurasi penandatanganan rilis akan jatuh ke path file kosong — sehingga build rilis lokal gagal cepat alih-alih menandatangani dengan kunci placeholder. Di CI, buat file properti dari secret:

```bash
echo "storeFile=$KEYSTORE_FILE" >> keystore.properties
echo "storePassword=$KEYSTORE_PASSWORD" >> keystore.properties
echo "keyAlias=$KEY_ALIAS" >> keystore.properties
echo "keyPassword=$KEY_PASSWORD" >> keystore.properties
```

### Langkah 3: Mengaktifkan R8 dan Mengelola Aturan

Aktifkan penyusutan dan pengurangan resource untuk build rilis:

```kotlin
// app/build.gradle.kts
android {
    buildTypes {
        getByName("release") {
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

Tambahkan aturan keep hanya jika R8 tidak dapat menyimpulkan penggunaannya — refleksi, serialisasi, dan entry point native. Titik awal yang minimal:

```text
# Pertahankan model yang diserialisasi Gson (berbasis refleksi)
-keep class com.example.app.data.** { *; }

# Anotasi dan anggota yang diakses secara reflektif
-keepattributes Signature, InnerClasses, EnclosingMethod

# Simpan file mapping untuk deobfuskasi crash
-printmapping mapping.txt
```

Bangun rilis sekali dan periksa hasilnya:

```bash
./gradlew bundleRelease
ls -lh app/build/outputs/bundle/release/app-release.aab
ls -l app/build/outputs/mapping/release/mapping.txt
```

Lalu uji build rilis secara manual — alur autentikasi, deep link, dan analitik — karena R8 sering membuang jalur kode yang hanya dijangkau refleksi saat runtime.

### Langkah 4: Membangun dan Memverifikasi App Bundle

Hasilkan AAB dan validasi sebelum meninggalkan CI:

```bash
./gradlew bundleRelease
# Periksa isi bundle
unzip -l app/build/outputs/bundle/release/app-release.aab
```

Gunakan `bundletool` untuk membuat APK universal dari bundle dan uji coba di perangkat atau emulator:

```bash
bundletool build-apks --bundle=app-release.aab --output=app-release.apks --mode=universal
bundletool install-apks --apks=app-release.apks
```

Verifikasi tanda tangan APK rilis (atau split yang diekstrak dari bundle) dengan `apksigner`:

```bash
apksigner verify --print-certs app-release.apk
```

Fingerprint sertifikat harus cocok dengan kunci unggahan Anda, dan output harus mengonfirmasi skema penandatanganan `v1`/`v2` (dan idealnya `v3`). Jika ada pemeriksaan yang gagal, hentikan rilis — AAB yang tidak valid membuang satu siklus review Play yang utuh.

### Langkah 5: Mengunggah ke Play Console dan Menyiapkan Track

1. Unggah `app-release.aab` di Play Console → **Release → Production → Create new release** (atau track yang lebih awal). Tambahkan catatan rilis dan konfirmasi badge versi menampilkan `versionCode`/`versionName` yang benar.
2. Distribusikan build pertama ke **internal testing** (hingga 100 tester undangan email) dan perbaiki apa pun yang mereka laporkan.
3. Promosikan artefak yang sama ke **closed testing**, lalu **open testing**, untuk mengumpulkan umpan balik opt-in.
4. Luncurkan ke **production** secara bertahap: pilih "Staged rollout" dan mulai dari 1–5%. Pantau crash-free sessions dan Play Vitals, lalu naikkan 10% → 20% → 50% → 100% selama beberapa hari berturut-turut.

```text
| Track            | Audiens                             | Kegunaan                        |
|------------------|-------------------------------------|---------------------------------|
| Internal testing | Hingga 100 tester via daftar email  | QA cepat untuk setiap build     |
| Closed testing   | Grup undangan via tautan Play       | Beta kurasi dengan target user  |
| Open testing     | Siapa pun yang opt-in via tautan    | Beta publik sebelum peluncuran  |
| Production       | Semua pengguna (atau % bertahap)    | Rilis publik                    |
```

Untuk rollout bertahap, Play menangani eksposur gradual berdasarkan persentase; pengguna di luar persentase tersebut tetap memakai versi sebelumnya hingga promosi berikutnya.

### Langkah 6: Mengotomatisasi Rilis dengan fastlane

Pasang fastlane dan buat kumpulan lane yang minimal:

```ruby
# fastlane/Fastfile
default_platform(:android)

platform :android do
  desc "Unggah build untuk internal testing"
  lane :internal do
    gradle(task: "bundleRelease")
    upload_to_play_store(
      track: "internal",
      release_status: "completed"
    )
  end

  desc "Promosikan build internal ke produksi (bertahap 5%)"
  lane :production_staged do
    upload_to_play_store(
      track: "production",
      rollout: "0.05"
    )
  end
end
```

Dari CI, dekripsi secret keystore, jalankan lane, dan tag rilis:

```bash
echo "$KEYSTORE_BASE64" | base64 --decode > release.keystore
bundle exec fastlane internal
git tag -a v2.3.1 -m "Release 2.3.1"
git push origin v2.3.1
```

Parameter `rollout: "0.05"` melakukan rollout produksi bertahap secara otomatis — biner yang sama yang sudah divalidasi di internal testing mulai live di 5%, dan lane berikutnya mempromosikannya ke 100%.

### Langkah 7: Memantau dan Mengoperasikan Rilis

Pastikan pelaporan crash terhubung untuk build rilis. Dengan plugin Gradle Firebase Crashlytics, file mapping terunggah otomatis selama `bundleRelease`; verifikasi di log build. Jika memakai pipeline kustom, unggah `mapping.txt` secara eksplisit:

```bash
curl -X POST https://crashlytics.googleapis.com/uploads \
  -H "Authorization: Bearer $CRASHLYTICS_TOKEN" \
  --upload-file app/build/outputs/mapping/release/mapping.txt
```

Siapkan rutinitas harian kesehatan rilis:

- Periksa **Play Vitals** untuk crash rate, ANR rate, dan regresi waktu startup dibanding rilis sebelumnya.
- Pantau Crashlytics untuk issue baru yang dikelompokkan per versi — lonjakan pada `versionCode` tertentu adalah sinyal pertama rollout yang buruk.
- Simpan flag Remote Config untuk setiap fitur berisiko, dengan nilai "off" yang terdokumentasi, sehingga insiden dapat dimitigasi dalam hitungan menit.
- Tentukan urutan rollback: hentikan rollout bertahap segera, nonaktifkan flag, dan hanya promosikan rilis sebelumnya jika masalah tidak bisa diperbaiki.

```text
Checklist perawatan rilis
1. versionCode naik                  — diverifikasi di CI
2. AAB ditandatangani kunci unggah    — diverifikasi apksigner
3. File mapping diarsipkan            — crash ter-deobfuscate
4. Internal testing lulus             — tanda tangan QA
5. Rollout bertahap 1-5%              — dipantau selama 24 jam
6. Play Vitals hijau                  — crash/ANR rate stabil
7. Feature flag siap                  — kill switch aktif
```

Sebuah rilis tidak "selesai" pada rollout 100% — rilis selesai ketika loop pemantauan di atas berjalan dan playbook rollback sudah pernah dilatih.

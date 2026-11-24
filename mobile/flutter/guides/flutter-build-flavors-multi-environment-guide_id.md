---
title: "Panduan Build Flavor dan Konfigurasi Multi-Lingkungan Flutter"
description: "Panduan praktis untuk menyusun aplikasi Flutter dengan build flavor, konfigurasi compile-time, pengaturan native per lingkungan, serta build flavor otomatis untuk development, staging, dan production."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Build Flavor dan Konfigurasi Multi-Lingkungan Flutter

## Pendahuluan

Hampir setiap aplikasi Flutter yang benar-benar dipakai pengguna pada akhirnya membutuhkan lebih dari satu target deployment. Build development berbicara dengan API lokal atau sandbox, build staging mengarah ke backend pra-produksi, dan build production dikirim ke store dengan analitik aktif serta debugging dimatikan. Sebagian produk melangkah lebih jauh: satu basis kode yang dikompilasi menjadi beberapa aplikasi bermerek untuk klien berbeda, masing-masing dengan application ID, ikon, dan endpoint sendiri.

Build flavor adalah jawaban Flutter untuk masalah ini. Flavor adalah varian build bernama yang dipilih saat build (`flutter build apk --flavor staging`). Dikombinasikan dengan konfigurasi compile-time, flavor memungkinkan satu basis kode menghasilkan beberapa aplikasi berbeda tanpa memecah source tree, tanpa conditional import, dan tanpa memelihara proyek paralel yang perlahan menyimpang.

Bagian yang rumit adalah flavor bukan satu saklar tunggal. Flavor melintasi empat lapisan yang harus saling konsisten:

| Lapisan | Yang dikendalikan | Tempat didefinisikan |
|---------|-------------------|----------------------|
| Konfigurasi Dart | Endpoint API, feature flag, level logging | `--dart-define` / `--dart-define-from-file` |
| Android | `applicationId`, label aplikasi, konfigurasi signing, resource | product flavor di `android/app/build.gradle` |
| iOS | Bundle identifier, nama tampilan, entitlement, provisioning | skema Xcode plus berkas `.xcconfig` |
| Entry point build | `main_*.dart` mana yang dijalankan, nama flavor yang diteruskan | pemanggilan `flutter run` / `flutter build` |

Panduan ini membahas cara merancang struktur tersebut sekali, mengimplementasikannya di kedua platform, dan menghubungkannya ke CI sehingga setiap flavor menjadi target build kelas satu. Panduan ini mengasumsikan Anda sudah memiliki aplikasi Flutter yang berhasil dikompilasi dan berjalan di Android serta iOS.

## Praktik Terbaik

### 1. Rancang Matriks Lingkungan Sebelum Menyentuh Gradle

Tuliskan setiap lingkungan, host API yang dipakai, apakah logging dan analitik aktif, serta identifier yang dibutuhkan di masing-masing store. Matriks satu halaman memaksa keputusan yang mahal untuk diubah belakangan — terutama bundle identifier, yang tidak bisa diubah setelah rilis production pertama tanpa membuat listing store baru.

Contoh matriks untuk aplikasi dengan tiga lingkungan:

| Pengaturan | development | staging | production |
|------------|-------------|---------|------------|
| Base URL API | `http://10.0.2.2:8080` | `https://api-staging.example.com` | `https://api.example.com` |
| Logging verbose | aktif | aktif | nonaktif |
| Pelaporan crash | nonaktif | aktif (proyek terpisah) | aktif |
| Sufiks application ID | `.dev` | `.staging` | tidak ada |
| Nama tampilan | `Notes Dev` | `Notes Staging` | `Notes` |

Menentukan ini di awal mencegah pola kegagalan klasik ketika seorang developer menambahkan lingkungan keempat secara mendadak dan konfigurasi native diam-diam kembali memakai nilai production.

### 2. Pertahankan Satu Basis Kode, Ubah Hanya Konfigurasinya

Flavor ada agar perilaku yang berubah, bukan source code-nya. Hindari memecah sebagian besar `lib/` di balik pengecekan `if (flavor == 'dev')` yang tersebar di widget. Sebagai gantinya, selesaikan konfigurasi sekali saat startup menjadi objek immutable lalu injeksikan. Kode yang membaca `AppConfig.baseUrl` tidak perlu tahu flavor mana yang menghasilkan nilai itu, sehingga aplikasi tetap mudah diuji dengan config palsu yang diinjeksikan.

### 3. Konstanta Compile-Time Lebih Baik daripada Pencarian Runtime

Nilai `--dart-define` ditanam ke dalam biner hasil kompilasi dan diakses melalui `String.fromEnvironment`. Ini punya tiga keunggulan dibanding membaca aset JSON saat runtime: nilainya tidak bisa dimanipulasi dengan mengedit aset di dalam APK, nilai yang hilang muncul sebagai string kosong saat pengembangan alih-alih sebagai exception runtime di jalur jaringan yang lambat, dan compiler dapat membuang kode yang merujuk konstanta kosong.

Gunakan `--dart-define-from-file` untuk konfigurasi yang lebih besar, dan simpan satu berkas JSON per lingkungan di version control (tanpa rahasia di dalamnya).

### 4. Jangan Pernah Meng-commit Rahasia

Konstanta compile-time dapat diekstrak dari biner. Apa pun yang dipublikasikan ke store — API key, password signing, token pihak ketiga — sudah bocor begitu aplikasi dirilis. Perlakukan flavor sebagai cara memilih konfigurasi *non-rahasia* yang aktif, dan suntikkan rahasia sesungguhnya lewat environment variable CI atau secret manager saat build. Untuk kunci sisi klien yang memang harus ada di biner (kunci SDK peta, write key analitik), batasi penggunaannya di sisi server berdasarkan bundle ID dan rotasi bila bocor.

### 5. Jaga Identifier Platform Tetap Paralel

Sufiks `applicationId` Android dan sufiks bundle identifier iOS harus menggambarkan lingkungan yang sama. Jika build staging Android memakai `com.example.notes.staging` sementara iOS memakai `com.example.notes.Staging` (huruf kapital) atau `com.example.staging.notes`, dashboard store, sertifikat push notification, dan berkas asosiasi deep link akan rusak dengan cara yang khas per lingkungan dan sulit didiagnosis.

Pakai sufiks huruf kecil yang sama di kedua platform dan validasi di CI dengan membandingkan identifier pada artefak hasil build.

### 6. Beri Setiap Flavor Identitas yang Jelas

Build non-production harus langsung dikenali saat dipegang. Ubah nama tampilan (`Notes Dev`) dan idealnya ikon peluncur atau banner berwarna di bagian atas layar. Praktik tunggal ini menghilangkan bug flavor yang paling umum dan paling mahal: mengirim build staging ke production, atau melaporkan bug terhadap lingkungan yang salah.

Banner yang hanya aktif di build non-production dan diimplementasikan di satu tempat, dikendalikan oleh konstanta flavor compile-time, sangat murah dan mencegah insiden nyata.

### 7. Gagal Cepat Saat Konfigurasi Hilang

Nilai `String.fromEnvironment` yang kosong adalah kegagalan senyap. Build yang tidak dapat menyelesaikan host API-nya seharusnya gagal pada frame pertama di mode debug dengan pesan yang jelas, bukan melakukan permintaan ke `https://` dengan host kosong lalu muncul sebagai timeout yang membingungkan. Tambahkan assertion di factory konfigurasi agar kesalahan tertangkap saat pengembangan, bukan di laporan bug.

### 8. Perlakukan Setiap Flavor sebagai Target CI Kelas Satu

Jika hanya production yang dibangun di CI, flavor staging akan membusuk: perubahan Gradle atau Xcode akan memecahkannya berminggu-minggu sebelum ada yang menyadari, biasanya sehari sebelum rilis. Bangun semua flavor di setiap pull request, minimal sebagai langkah assemble tanpa signing, dan arsipkan build bertanda tangan hanya di branch rilis. Regresi flavor murah diperbaiki pada hari kemunculannya dan mahal diperbaiki di tengah jendela rilis.

### 9. Jaga Entry Point Tetap Tipis

Berkas `main_*.dart` khusus flavor seharusnya hanya dua baris: bootstrap konfigurasi lalu panggil `runApp` bersama. Logika bisnis, dependency injection, dan routing berada di entry point bersama. Entry point tipis berarti flavor baru hanya butuh satu berkas kecil, dan perubahan pada startup aplikasi tidak perlu diulang di tiga tempat.

## Langkah Implementasi

### Langkah 1: Tulis Matriks Lingkungan

Buat matriks yang dapat dibaca mesin di root repo sehingga kode, konfigurasi native, dan CI membaca sumber kebenaran yang sama:

```text
config/
├── env.development.json
├── env.staging.json
└── env.production.json
```

Setiap berkas hanya memuat nilai non-rahasia:

```json
{
  "APP_ENV": "staging",
  "API_BASE_URL": "https://api-staging.example.com",
  "ENABLE_VERBOSE_LOGGING": true,
  "ENABLE_CRASH_REPORTING": true,
  "SENTRY_DSN": ""
}
```

Commit berkas-berkas ini. Berkas tersebut mendokumentasikan kontrak antara aplikasi dan setiap backend, serta membuat perbedaan flavor dapat ditinjau dalam pull request alih-alih tersembunyi di skrip build.

### Langkah 2: Bangun Lapisan Konfigurasi Dart

Definisikan satu objek konfigurasi immutable dengan satu factory per lingkungan dan satu factory compile-time untuk build rilis:

```dart
// lib/core/config/app_config.dart
class AppConfig {
  const AppConfig({
    required this.environment,
    required this.apiBaseUrl,
    required this.enableVerboseLogging,
    required this.enableCrashReporting,
  });

  final String environment;
  final String apiBaseUrl;
  final bool enableVerboseLogging;
  final bool enableCrashReporting;

  static const _env = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'development',
  );

  static const _apiBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const _verbose = bool.fromEnvironment('ENABLE_VERBOSE_LOGGING');

  /// Diselesaikan sekali saat startup lalu diinjeksikan lewat widget tree.
  static Future<AppConfig> load() async {
    if (_apiBaseUrl.isNotEmpty) {
      return AppConfig(
        environment: _env,
        apiBaseUrl: _apiBaseUrl,
        enableVerboseLogging: _verbose,
        enableCrashReporting:
            bool.fromEnvironment('ENABLE_CRASH_REPORTING'),
      );
    }
    throw StateError(
      'API_BASE_URL tidak tersedia. Build dengan '
      '--dart-define-from-file=config/env.$_env.json',
    );
  }
}
```

Perhatikan asimetri yang disengaja: development boleh jatuh ke default lokal, tetapi build apa pun yang mencapai perangkat pengguna nyata harus gagal dengan jelas bila konfigurasinya hilang.

### Langkah 3: Tambahkan Penjaga Startup dan Banner Flavor

Selesaikan konfigurasi sebelum `runApp`, dan tampilkan penanda visual pada build non-production:

```dart
// lib/main.dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final config = await AppConfig.load();
  runApp(NotesApp(config: config));
}

class EnvironmentBanner extends StatelessWidget {
  const EnvironmentBanner({super.key, required this.child, required this.config});

  final Widget child;
  final AppConfig config;

  @override
  Widget build(BuildContext context) {
    if (config.environment == 'production') return child;
    return Column(
      children: [
        Material(
          color: config.environment == 'staging'
              ? Colors.orange.shade700
              : Colors.blueGrey.shade700,
          child: SafeArea(
            bottom: false,
            child: SizedBox(
              width: double.infinity,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(
                  config.environment.toUpperCase(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 11),
                ),
              ),
            ),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}
```

### Langkah 4: Konfigurasi Product Flavor Android

Deklarasikan flavor di `android/app/build.gradle` (Groovy DSL; padanan Kotlin DSL menggunakan blok `create("staging")`):

```groovy
android {
    flavorDimensions "environment"

    productFlavors {
        development {
            dimension "environment"
            applicationIdSuffix ".dev"
            versionNameSuffix "-dev"
            resValue "string", "app_name", "Notes Dev"
        }
        staging {
            dimension "environment"
            applicationIdSuffix ".staging"
            versionNameSuffix "-staging"
            resValue "string", "app_name", "Notes Staging"
        }
        production {
            dimension "environment"
            resValue "string", "app_name", "Notes"
        }
    }
}
```

Lalu rujuk resource yang dihasilkan di `android/app/src/main/AndroidManifest.xml` alih-alih label yang di-hardcode:

```text
android:label="@string/app_name"
```

Hapus label lama seperti `android:label="Notes"`, karena label yang di-hardcode menimpa label khusus flavor dan menghasilkan nama aplikasi yang identik di launcher.

### Langkah 5: Konfigurasi Skema dan Berkas xcconfig iOS

iOS tidak memiliki konsep product flavor; padanannya adalah satu skema Xcode per lingkungan, masing-masing mengarah ke `.xcconfig` sendiri.

Pertama buat berkas konfigurasi di bawah `ios/Flutter/`:

```text
ios/Flutter/
├── Debug.xcconfig
├── Release.xcconfig
├── Debug-staging.xcconfig
├── Release-staging.xcconfig
├── Debug-production.xcconfig
└── Release-production.xcconfig
```

Setiap berkas flavor menyertakan konfigurasi dasar dan hanya menimpa yang berbeda:

```text
#include "Debug.xcconfig"
APP_DISPLAY_NAME = Notes Staging
BUNDLE_ID_SUFFIX = .staging
```

Ekspos bundle identifier melalui build setting yang ditentukan pengguna pada target Runner, lalu rujuk variabelnya di `Info.plist`:

```text
PRODUCT_BUNDLE_IDENTIFIER = com.example.notes$(BUNDLE_ID_SUFFIX)
CFBundleDisplayName = $(APP_DISPLAY_NAME)
```

Ulangi pola tersebut untuk `Release-*.xcconfig`, lalu buat satu skema per lingkungan di Xcode (Product → Scheme → Manage Schemes) dan arahkan aksi Run/Archive setiap skema ke pasangan konfigurasi yang sesuai. Verifikasi dengan:

```bash
flutter build ios --flavor staging --config-only
```

### Langkah 6: Tangani Aset dan Placeholder Native per Flavor

Ketika flavor membutuhkan ikon atau konfigurasi Firebase berbeda, gunakan folder resource platform alih-alih logika runtime:

```text
android/app/src/
├── development/res/values/strings.xml
├── staging/res/values/strings.xml
├── production/res/values/strings.xml
└── main/res/mipmap-*/ic_launcher.png
```

Untuk manifest placeholder Android (host deep link, kunci peta), definisikan per flavor:

```groovy
productFlavors {
    staging {
        manifestPlaceholders = [deepLinkHost: "staging.example.com"]
    }
    production {
        manifestPlaceholders = [deepLinkHost: "example.com"]
    }
}
```

Di iOS, letakkan `GoogleService-Info.plist` di folder khusus flavor dan tambahkan build phase yang menyalin berkas yang tepat, atau gunakan proyek Firebase terpisah yang diikat melalui argumen `-configuration` pada skema. Menjaga berkas khusus flavor tetap di luar `main` mencegah kredensial satu lingkungan bocor ke build lain.

### Langkah 7: Permudah Menjalankan Flavor Secara Lokal

Dokumentasikan perintah persisnya di README agar tidak ada yang mengimprovisasi. Sepasang perintah yang konsisten per lingkungan menjaga build lokal selaras dengan CI:

```bash
flutter run --flavor development \
  --dart-define-from-file=config/env.development.json

flutter build appbundle --flavor production --release \
  --dart-define-from-file=config/env.production.json
```

Tambahkan konfigurasi launch VS Code agar IDE meneruskan argumen yang sama, dan pertahankan nama flavor dalam huruf kecil tanpa tanda hubung — nama tersebut menjadi nama task Gradle dan nama konfigurasi Xcode, di mana spasi serta huruf kapital menimbulkan gesekan yang bisa dihindari.

### Langkah 8: Otomatiskan Matriks Build di CI

Bangun setiap flavor pada setiap pull request. Matrix job GitHub Actions membuat biaya tetap terlihat dan cakupannya lengkap:

```yaml
name: build-flavors
on: [pull_request]

jobs:
  android:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        flavor: [development, staging, production]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
      - run: flutter pub get
      - run: |
          flutter build apk --flavor ${{ matrix.flavor }} \
            --dart-define-from-file=config/env.${{ matrix.flavor }}.json
```

Rahasia — kunci signing, kredensial store — disuntikkan sebagai environment variable tingkat job hanya pada workflow rilis, tidak pernah ke berkas JSON flavor. Tambahkan langkah yang memastikan konfigurasi hasil resolusi sesuai lingkungan yang diharapkan, misalnya dengan memeriksa `AndroidManifest.xml` hasil build untuk sufiks application ID yang benar.

### Langkah 9: Verifikasi Matriks Sebelum Setiap Rilis

Perlakukan verifikasi sebagai daftar periksa bernomor yang dijalankan sama persis di laptop maupun di CI:

1. Build ketiga flavor untuk Android dan iOS tanpa peringatan konfigurasi hilang.
2. Pastikan application ID dan nama tampilan setiap artefak sesuai matriks.
3. Jalankan setiap build non-production dan pastikan banner lingkungan muncul.
4. Pastikan build production tidak menampilkan banner, tidak mengaktifkan logging verbose, dan memakai host API production.
5. Pastikan tidak ada rahasia di berkas konfigurasi yang di-commit.

Rilis yang lolos kelima pemeriksaan ini tidak mungkin secara tidak sengaja mengirim konfigurasi staging kepada pengguna — itulah inti dari seluruh struktur ini.

## Kesimpulan

Build flavor adalah kontrak antara tiga lapisan yang tidak disatukan Flutter secara otomatis: konfigurasi Dart compile-time, product flavor Android, serta skema iOS dengan berkas xcconfig. Merancang matriks lingkungan lebih dulu, menyelesaikan konfigurasi sekali saat startup menjadi objek yang diinjeksikan, menjaga identifier platform tetap paralel, dan membangun setiap flavor di CI mengubah proses manual yang rapuh menjadi proses yang dapat diprediksi.

Mulailah dengan menulis matriks dan memindahkan satu URL yang di-hardcode ke `--dart-define-from-file`. Kemudian tambahkan flavor Android, lalu skema iOS, dan terakhir matriks CI. Setiap langkah bermanfaat secara mandiri, dan keadaan akhirnya — satu basis kode, beberapa aplikasi yang mudah dibedakan, tanpa rahasia di repositori — adalah yang memungkinkan tim merilis ke staging seSantai merilis ke production.

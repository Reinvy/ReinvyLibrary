---
title: "Panduan Platform Channels dan Integrasi Native Flutter"
description: "Panduan komprehensif untuk menjembatani Flutter dan kode native — method, event, dan basic message channels, pembuatan kode type-safe dengan Pigeon, dart:ffi untuk pustaka C, threading, penanganan error, dan pengujian kode platform channel di Android dan iOS."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Platform Channels dan Integrasi Native Flutter

## Pendahuluan

Flutter merender UI-nya di setiap platform dari satu basis kode Dart, tetapi sebagian kemampuan hidup di luar dunia Dart: autentikasi biometrik, token registrasi notifikasi push, geolokasi latar belakang, sensor data kesehatan, lembar berbagi sistem, dan pustaka C level rendah. Ketika paket pub.dev tidak mencakup kebutuhan Anda, Anda harus menulis kode native dan menjembataninya ke Dart. Jembatan itulah yang disebut **platform channel**.

Panduan ini membahas tiga strategi integrasi yang ditawarkan Flutter, kapan menggunakannya, dan cara mengimplementasikannya dengan aman:

- **Platform channels** (`MethodChannel`, `EventChannel`, `BasicMessageChannel`) — komunikasi imperatif langsung antara Dart dan Kotlin/Swift.
- **Pigeon** — pembuatan kode saat kompilasi yang mengubah protokol channel tulisan tangan menjadi stub API type-safe dan null-safe dalam tiga bahasa sekaligus.
- **`dart:ffi`** — pengikatan langsung ke pustaka C tanpa overhead platform channel, ideal untuk pustaka komputasi berat yang telah dikompilasi untuk perangkat seluler.

Di luar perangkaian, panduan ini mencakup mode kegagalan yang merusak aplikasi nyata: kesalahan threading (memanggil API platform di luar main thread), `PlatformException` yang tidak tertangani sehingga membuat pengguna crash, payload terlalu besar yang menyendat channel, dan kontrak channel tanpa versi yang rusak ketika aplikasi diperbarui secara independen dari sisi platform. Menerapkan praktik ini menjaga batas Dart/native tetap membosankan, dapat diprediksi, dan mudah diuji.

## Praktik Terbaik

### 1. Utamakan Pigeon daripada MethodChannel tulisan tangan untuk kebutuhan di luar percobaan

`MethodChannel` tulisan tangan mengikat kode Dart Anda ke string ajaib (`'getBatteryLevel'`) dan payload `Map` tanpa tipe. Pigeon menghasilkan kelas Dart, Kotlin, dan Swift dari satu file definisi protokol, sehingga nama method, tipe argumen, dan tipe hasil diperiksa saat kompilasi di setiap bahasa. Mengganti nama method di file definisi akan memutus build di ketiga sisi, bukan gagal diam-diam saat runtime. Gunakan `MethodChannel` mentah hanya untuk prototipe kecil dan eksperimen sekali pakai; gunakan Pigeon untuk apa pun yang dirilis.

### 2. Buat satu channel per area fitur, jangan pernah satu channel raksasa

Satu channel bernama `com.example.app/native` dengan empat puluh method akan menjadi statement switch yang tidak terpelihara di kedua sisi dan menciptakan bottleneck serialisasi. Beri nama channel berdasarkan fitur (`com.example.app/battery`, `com.example.app/geolocation`) sehingga setiap modul native memiliki kontrak kecil yang fokus. Channel yang terpisah per fitur juga gagal secara independen: jika handler satu fitur melempar error, channel lain tetap berfungsi.

### 3. Perlakukan platform main thread sebagai hal yang sakral

Panggilan method platform yang dikirim dari Dart tiba di **main thread platform** (main thread Android atau main thread iOS). Pekerjaan yang memang harus dilakukan API platform di sana — membaca sensor, menanyakan layanan sistem — tidak masalah, tetapi apa pun yang lambat (jaringan, I/O file, kriptografi, pemrosesan gambar) akan memblokir UI di sisi native dan dapat memicu dialog `ANR` Android atau pembunuhan watchdog iOS. Pindahkan pekerjaan berat ke background thread di sisi platform, lalu kirim hasil melalui callback, yang dengan benar marshaling kembali ke platform main thread.

### 4. Modelkan kegagalan secara eksplisit dengan PlatformException

Kode native gagal dengan cara yang tidak bisa diprediksi Dart: perangkat keras tidak tersedia, izin ditolak, `null` dari callback OS. Mengembalikan `null` secara diam-diam menyembunyikan kegagalan; melempar `PlatformException` membawa `code`, `message`, dan `details` yang bisa dicabangkan oleh kode Dart. Tangkap di batas Dart dan terjemahkan ke tipe error aplikasi Anda sendiri, sehingga seluruh aplikasi tidak pernah melihat error platform mentah.

### 5. Jaga payload tetap kecil dan dapat diserialisasi JSON

Pesan channel disalin melintasi batas engine, sehingga pesan yang besar atau banyak akan lambat. Kirim map kecil berisi primitif, bukan blob biner besar — untuk gambar, audio, atau file, tulis ke disk atau shared storage lalu kirim path-nya. Tetapkan tipe payload secara eksplisit (semua kunci dan nilai dengan tipe yang diketahui) daripada mengandalkan map dinamis; ini mencegah cast `null` diam-diam di sisi platform.

### 6. Beri versi pada kontrak channel

Kode Dart dan kode platform dikirim dalam biner yang sama, tetapi plugin dapat diperbarui secara independen melalui pub.dev, dan pengguna Android lama mungkin menjalankan build native hasil cache. Definisikan versi kontrak (misalnya, handshake `getPlatformVersion` atau kolom versi dalam payload) dan minta kedua sisi menolak ketidaksesuaian. Ini mengubah error runtime yang membingungkan menjadi pesan "perbarui plugin" yang jelas.

### 7. Bungkus channel di belakang interface dan mock dalam pengujian

Jangan pernah memanggil `MethodChannel.invokeMethod` langsung dari kode widget atau bisnis. Bungkus setiap channel dalam kelas repository atau service kecil di belakang interface abstrak; produksi menyuntikkan implementasi berbasis channel asli, pengujian menyuntikkan fake. Ini menjaga kode platform channel keluar dari widget tree Anda, membuat unit dan widget test hermetis, dan memungkinkan Anda menguji jalur error dengan melempar `PlatformException` dari fake.

### 8. Utamakan federated plugin untuk fungsionalitas native yang dapat digunakan kembali

Jika logika native Anda tidak spesifik aplikasi — bisa melayani aplikasi Flutter mana pun — kemas sebagai plugin dengan implementasi platform dalam paket pub terpisah. Federated plugin memungkinkan aplikasi bergantung pada paket sisi aplikasi sementara implementasi Android dan iOS diselesaikan secara otomatis. Ini adalah jalur yang digunakan tim Flutter untuk plugin first-party dan struktur jangka panjang yang benar untuk apa pun yang ingin Anda open-source.

## Langkah Implementasi

### Langkah 1: Pilih strategi integrasi

Tentukan jembatan mana yang sesuai dengan kebutuhan:

- **`MethodChannel`** — panggilan request/response sekali jalan ke API platform (membaca nilai, melakukan aksi, mengembalikan hasil). Pilihan default untuk sebagian besar integrasi.
- **`EventChannel`** — data berkelanjutan atau berbasis callback: aliran sensor, perubahan level baterai, pembaruan lokasi, status panggilan telepon.
- **`BasicMessageChannel`** — pengiriman pesan dua arah bergaya streaming tanpa semantik method, berguna untuk percakapan berumur panjang (misalnya jembatan WebView).
- **Pigeon** — semua hal di atas sebagai kontrak type-safe hasil generate; hampir selalu lebih disukai daripada channel tulisan tangan.
- **`dart:ffi`** — memanggil pustaka C/C++ yang sudah ada (kompresi, pemrosesan sinyal, algoritma berat alokasi memori) di mana round-trip channel hanya menambah overhead yang tidak perlu.

Jika ragu, mulai dengan Pigeon: Pigeon membuatkan plumbing channel untuk Anda dan menyisakan logika platform sebagai kelas biasa yang Anda implementasikan.

### Langkah 2: Siapkan struktur platform

Untuk integrasi tingkat aplikasi (tanpa plugin), kode native berada di folder platform proyek Flutter Anda:

```text
my_app/
├── lib/
│   ├── main.dart
│   └── services/
│       └── battery_service.dart
├── android/app/src/main/kotlin/com/example/my_app/
│   └── MainActivity.kt
└── ios/Runner/
    └── AppDelegate.swift
```

Nama channel adalah pengidentifikasi reverse-DNS. Nama itu harus **persis sama** di sisi Dart, Kotlin, dan Swift — engine tidak melakukan normalisasi apa pun, sehingga `com.example.app/battery` di satu sisi dan `com.example.app/Battery` di sisi lain tidak akan pernah terhubung secara diam-diam.

Untuk fungsionalitas yang dapat digunakan kembali, buat plugin sebagai gantinya:

```bash
flutter create --template=plugin --platforms=android,ios native_battery
```

Template plugin menyediakan boilerplate registrasi `MethodChannel` di `registerWith`/`register` untuk kedua platform, yang merupakan boilerplate yang sama yang digantikan Pigeon.

### Langkah 3: Implementasikan MethodChannel ujung-ke-ujung

Sisi Dart mendeklarasikan channel dan memanggil method:

```dart
import 'package:flutter/services.dart';

class BatteryService {
  static const MethodChannel _channel = MethodChannel('com.example.app/battery');

  Future<int> getBatteryLevel() async {
    try {
      final int? level = await _channel.invokeMethod<int>('getBatteryLevel');
      return level ?? -1;
    } on PlatformException catch (e) {
      throw BatteryException(e.code, e.message ?? 'Error baterai tidak diketahui');
    }
  }
}
```

Sisi Android mendaftarkan handler dan menjawab di platform main thread:

```kotlin
package com.example.my_app

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.example.app/battery"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "getBatteryLevel" -> result.success(getBatteryLevel())
                    else -> result.notImplemented()
                }
            }
    }

    private fun getBatteryLevel(): Int {
        val batteryManager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    }
}
```

Sisi iOS mengimplementasikan kontrak yang sama dengan `FlutterMethodChannel`:

```swift
import Flutter
import UIKit

public class SwiftBatteryPlugin: NSObject, FlutterPlugin {
    public static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(
            name: "com.example.app/battery",
            binaryMessenger: registrar.messenger()
        )
        let instance = SwiftBatteryPlugin()
        registrar.addMethodCallDelegate(instance, channel: channel)
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "getBatteryLevel":
            result(Int(UIDevice.current.batteryLevel * 100))
        default:
            result(FlutterMethodNotImplemented)
        }
    }
}
```

Panggil service dari Dart persis seperti API async lainnya:

```dart
final battery = await batteryService.getBatteryLevel();
```

### Langkah 4: Alirkan data dengan EventChannel

`EventChannel` mendorong nilai dari sisi platform ke Dart, bukan menunggu permintaan. Sisi Dart membuka broadcast stream:

```dart
import 'package:flutter/services.dart';

class AccelerometerService {
  static const EventChannel _channel = EventChannel('com.example.app/accelerometer');

  Stream<Map<String, double>> values() {
    return _channel
        .receiveBroadcastStream()
        .map((event) => Map<String, double>.from(event as Map));
  }
}
```

Sisi Android mengimplementasikan `StreamHandler`, yang menerima callback siklus hidup listener:

```kotlin
class AccelerometerStreamHandler(
    private val context: Context
) : EventChannel.StreamHandler {

    private var sensorManager: SensorManager? = null
    private var listener: SensorEventListener? = null

    override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
        val manager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val accelerometer = manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                events?.success(mapOf(
                    "x" to event.values[0],
                    "y" to event.values[1],
                    "z" to event.values[2]
                ))
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) { }
        }
        manager.registerListener(listener, accelerometer, SensorManager.SENSOR_DELAY_UI)
        sensorManager = manager
    }

    override fun onCancel(arguments: Any?) {
        sensorManager?.unregisterListener(listener)
        sensorManager = null
        listener = null
    }
}
```

Daftarkan stream handler pada binary messenger yang sama:

```kotlin
EventChannel(
    flutterEngine.dartExecutor.binaryMessenger,
    "com.example.app/accelerometer"
).setStreamHandler(AccelerometerStreamHandler(this))
```

Panggil `events.error(code, message, details)` dari `onSensorChanged` ketika sensor mengirim data tidak valid; error tersebut akan merambat ke stream Dart sebagai `PlatformException`.

### Langkah 5: Buat kontrak type-safe dengan Pigeon

Pigeon mengubah interface Dart biasa menjadi stub kelas Kotlin/Swift yang cocok. Pertama buat file protokolnya:

```dart
// pigeons/battery_api.dart
import 'package:pigeon/pigeon.dart';

class BatteryInfo {
  BatteryInfo({required this.level, required this.isCharging});
  final int level;
  final bool isCharging;
}

@HostApi()
abstract class BatteryApi {
  @async
  BatteryInfo getBatteryInfo();
}
```

Generate stub platform:

```bash
dart run pigeon --input pigeons/battery_api.dart \
  --dart_out lib/generated/battery_api.g.dart \
  --kotlin_out android/app/src/main/kotlin/com/example/my_app/BatteryApi.g.kt \
  --swift_out ios/Runner/BatteryApi.g.swift
```

Sisi Dart kini memanggil method yang bertipe kuat — tanpa string ajaib:

```dart
final api = BatteryApi();
final BatteryInfo info = await api.getBatteryInfo();
```

Implementasikan kelas abstrak Kotlin hasil generate:

```kotlin
class BatteryApiImpl(private val context: Context) : BatteryApi {
    override suspend fun getBatteryInfo(): BatteryInfo {
        val manager = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val level = manager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val charging = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { filter ->
            context.registerReceiver(null, filter)
        }?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) == BatteryManager.BATTERY_STATUS_CHARGING
        return BatteryInfo(level, charging)
    }
}
```

Anotasi `@async` Pigeon menghasilkan suspend function di Kotlin dan method berbasis callback di Swift, sehingga Anda tidak pernah menulis plumbing channel dengan tangan. Stub hasil generate dibuat ulang pada setiap proses code generation, jadi jangan diedit; implementasikan kelas dasar hasil generate sebagai gantinya.

### Langkah 6: Ikat pustaka C dengan dart:ffi

Untuk pustaka C/C++, `dart:ffi` memanggil tabel simbol native secara langsung:

```dart
import 'dart:ffi';
import 'dart:io';
import 'package:ffi/ffi.dart';

typedef _SumC = Int32 Function(Int32 a, Int32 b);
typedef _SumDart = int Function(int a, int b);

final DynamicLibrary _lib = Platform.isAndroid
    ? DynamicLibrary.open('libnative_utils.so')
    : DynamicLibrary.process();

final int Function(int, int) nativeSum =
    _lib.lookupFunction<_SumC, _SumDart>('native_sum');

void main() {
  print('3 + 4 = ${nativeSum(3, 4)}');
}
```

Gunakan `DynamicLibrary.open` dengan nama pustaka yang dibundel di Android, `DynamicLibrary.process()` untuk simbol yang sudah di-link, dan `DynamicLibrary.executable()` di iOS untuk simbol yang diekspor oleh runner. Panggil `calloc`/`malloc` dari `package:ffi` untuk API yang berorientasi pointer dan `free` setiap alokasi yang Anda miliki — GC Dart tidak mengetahui heap memori native.

### Langkah 7: Tangani threading dengan benar

Handler platform channel berjalan di platform main thread. Ketika API platform memblokir (request jaringan, resolusi `CLLocationManager`, pengambilan kamera), pindahkan:

```swift
public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    if call.method == "fetchProfile" {
        DispatchQueue.global(qos: .userInitiated).async {
            let profile = self.fetchProfile() // panggilan jaringan yang memblokir
            DispatchQueue.main.async { result(profile) }
        }
    } else {
        result(FlutterMethodNotImplemented)
    }
}
```

```kotlin
private val executor = Executors.newSingleThreadExecutor()

MethodChannel(engine.dartExecutor.binaryMessenger, "com.example.app/profile")
    .setMethodCallHandler { call, result ->
        if (call.method == "fetchProfile") {
            executor.execute {
                val profile = fetchProfile() // panggilan jaringan yang memblokir
                runOnUiThread { result.success(profile) }
            }
        } else {
            result.notImplemented()
        }
    }
```

Callback `result` melakukan marshaling kembali ke platform main thread; panggil tepat satu kali, dari main thread — memanggil dua kali akan melempar error, dan tidak pernah memanggilnya membuat future Dart menggantung selamanya.

### Langkah 8: Uji kode platform channel

Uji sisi Dart tanpa perangkat apa pun dengan mem-mock message handler:

```dart
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const MethodChannel channel = MethodChannel('com.example.app/battery');

  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'getBatteryLevel') return 87;
      return null;
    });
  });

  test('mengembalikan level baterai dari channel yang di-mock', () async {
    final service = BatteryService();
    expect(await service.getBatteryLevel(), 87);
  });
}
```

Uji jalur kegagalan dengan melempar error dari mock:

```dart
setMockMethodCallHandler(channel, (call) async {
  throw PlatformException(
    code: 'UNAVAILABLE',
    message: 'Tidak ada perangkat keras baterai',
  );
});
```

Karena setiap channel berada di balik `BatteryService`, lapisan widget tidak pernah tahu bahwa platform channel itu ada, dan pengujian yang sama berjalan di Dart VM, di perangkat, dan di CI.

### Langkah 9: Beri versi dan kembangkan kontrak

Tambahkan method handshake ke channel agar kedua sisi menegosiasikan kompatibilitas sebelum lalu lintas nyata mengalir:

```dart
Future<bool> supportsContract(int version) async {
  return await _channel.invokeMethod<bool>('supportsContract', version) ?? false;
}
```

Di sisi platform, jawab `true` hanya ketika versi yang diminta berada dalam rentang yang diimplementasikan, jika tidak `result.error('CONTRACT_MISMATCH', ...)`. Untuk payload yang membawa map, sertakan kolom versi `"v": 2` dan biarkan penerima melakukan switch padanya, sehingga klien lama dan baru dapat saling beroperasi selama proses rilis.

## Kesimpulan

Batas Dart/native adalah jahitan berisiko tertinggi dalam aplikasi Flutter: batas itu berjalan di luar jaminan keamanan Dart, dieksekusi di thread yang tidak dikenal, dan gagal dengan `PlatformException` alih-alih exception yang sudah ditangani kode Anda. Menerapkan praktik dalam panduan ini — Pigeon daripada string ajaib, channel yang terpisah per fitur, threading yang disiplin, pemodelan error yang eksplisit, kontrak dengan versi, dan pengujian dengan mock — membuat jahitan itu dapat diprediksi. Mulailah dengan jembatan terkecil yang memenuhi kebutuhan, bungkus dalam service bertipe, dan Anda dapat menambahkan kemampuan native ke aplikasi Flutter mana pun tanpa mengubah lapisan platform menjadi aplikasi kedua yang tidak berani disentuh siapa pun.

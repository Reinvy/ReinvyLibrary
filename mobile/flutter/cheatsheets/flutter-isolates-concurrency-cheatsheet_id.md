---
title: "Cheat Sheet Isolate dan Konkurensi Flutter"
description: "Referensi cepat konkurensi Flutter — event loop, microtask, Isolate.run, compute, isolate worker berumur panjang, pengiriman pesan, TransferableTypedData, penanganan error, dan aturan thread platform."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Isolate dan Konkurensi Flutter

## Tabel Referensi Cepat

| Tugas | Kode / API | Deskripsi |
|-------|------------|-----------|
| Impor library | `import 'dart:isolate';` | Memberi akses ke `Isolate`, `ReceivePort`, `SendPort`, `TransferableTypedData` |
| Menjalankan pekerjaan sekali jalan | `Isolate.run(() => heavyJob(input))` | Membuat isolate berumur pendek dan mengembalikan `Future` berisi hasilnya |
| Menjalankan fungsi sederhana di luar thread UI | `compute(parseJson, payload)` | Pembungkus Foundation di atas `Isolate.run` untuk fungsi top-level atau statis |
| Membuat worker persisten | `Isolate.spawn(workerMain, sendPort)` | Menjaga isolate tetap hidup untuk banyak pekerjaan berulang |
| Membuat kanal pesan | `final rp = ReceivePort();` | Membuka port yang `sendPort`-nya bisa diberikan ke isolate lain |
| Mengirim pesan | `sendPort.send(message)` | Mengirim objek yang sendable ke isolate penerima |
| Mendengarkan pesan | `rp.listen((msg) { ... })` | Menangani pesan masuk pada isolate saat ini |
| Menunggu satu balasan | `await rp.first` | Cara singkat untuk pola request/response sekali pakai |
| Berhenti mendengarkan dan melepas port | `rp.close()` | Menutup port agar isolate dapat dibersihkan garbage collector |
| Mematikan worker | `await isolate.kill(priority: Isolate.immediate)` | Menghentikan isolate tanpa menunggu antrean event-nya |
| Memindahkan byte tanpa salinan | `TransferableTypedData.fromList([bytes])` | Serah terima buffer `Uint8List` besar tanpa penyalinan |
| Mengukur biaya frame | `flutter run --profile` | Hanya profile mode yang memberi pengukuran waktu yang valid |

## Perintah Umum

### Setup Proyek dan Dependensi

```bash
# dart:isolate dan dart:async sudah termasuk di SDK — tanpa dependensi.
# Tambahkan package hanya bila menginginkan abstraksi worker tingkat tinggi.
dart pub add worker_manager
dart pub add flutter_isolate

# Pastikan library isolate dapat di-resolve untuk semua target yang dikirim.
dart analyze lib
```

### Menjalankan dan Memprofilkan Kode Konkuren

```bash
# Profile mode: pengukuran waktu nyata untuk startup isolate dan anggaran frame.
flutter run --profile

# Lacak aktivitas isolate di DevTools (CPU profiler + timeline).
flutter run --profile --verbose

# Jalankan beban kerja dan rekam timeline untuk mencari frame drop.
flutter drive --profile --target=test_driver/isolate_benchmark.dart

# Pastikan isolate utama tidak pernah memblokir selama benchmark.
flutter screenshot --type=rasterizer --observatory-uri=http://127.0.0.1:8181/
```

### Membenchmark Overhead Isolate

```bash
# Micro-benchmark biaya spawn dibanding menggunakan ulang worker persisten.
dart run benchmark/isolate_spawn_benchmark.dart

# Jalankan unit test yang sadar isolate di Dart VM.
dart test test/isolate/worker_test.dart

# Jalankan test yang sama di perangkat untuk membandingkan biaya spawn mobile.
flutter test --platform=vm test/isolate
```

## Potongan Kode

### Pekerjaan Sekali Jalan dengan Isolate.run

`Isolate.run` adalah pilihan default: membuat, menjalankan, mengembalikan hasil, lalu membersihkan diri otomatis.

```dart
import 'dart:isolate';

class ParsedReport {
  const ParsedReport(this.rows, this.total);

  final int rows;
  final double total;
}

Future<ParsedReport> parseReport(String rawCsv) {
  // Closure berjalan di isolate baru. Hasilnya (dan exception yang
  // dilempar) dipindahkan kembali ke pemanggil secara otomatis.
  return Isolate.run(() {
    final lines = rawCsv.split('\n').where((l) => l.trim().isNotEmpty);
    var total = 0.0;
    for (final line in lines.skip(1)) {
      total += double.tryParse(line.split(',').last) ?? 0;
    }
    return ParsedReport(lines.length - 1, total);
  });
}
```

Aturan yang membuat pola ini aman:

- Closure tidak boleh menangkap `BuildContext`, widget, `Stream`, atau handle `File` yang masih terbuka.
- Nilai yang bisa dikirim adalah primitif, `String`, `List`, `Map`, `Set`, `Uint8List`, `TransferableTypedData`, dan instance kelas yang tidak dianotasi dengan `@pragma('vm:isolate-unsendable')`.
- Exception yang dilempar di dalam closure akan dilempar ulang pada isolate pemanggil dengan stack trace asli tetap utuh.

### compute() untuk Fungsi Top-Level

`compute` masih tersedia dan merupakan jalur terpendek bila fungsinya sudah top-level.

```dart
import 'package:flutter/foundation.dart';

int countWords(String text) {
  return text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
}

Future<int> wordCount(String document) => compute(countWords, document);
```

`compute` tidak dapat menangkap closure. Bila pekerjaan membutuhkan beberapa input, bungkus semuanya dalam satu objek sendable lalu kirim objek itu sebagai message.

```dart
class CountRequest {
  const CountRequest(this.text, this.minLength);
  final String text;
  final int minLength;
}

int countLongWords(CountRequest request) {
  return request.text
      .split(RegExp(r'\s+'))
      .where((w) => w.length >= request.minLength)
      .length;
}

Future<int> longWords(String text) =>
    compute(countLongWords, CountRequest(text, 6));
```

### Isolate Worker Berumur Panjang dengan Port

Buat worker persisten ketika pekerjaan datang terus-menerus — biaya spawn menjadi dominan bila tidak.

```dart
import 'dart:isolate';

class WorkerHandle {
  WorkerHandle._(this._isolate, this._inbox, this._replies);

  final Isolate _isolate;
  final SendPort _inbox;
  final ReceivePort _replies;

  static Future<WorkerHandle> start() async {
    final replies = ReceivePort();
    final isolate = await Isolate.spawn(
      _workerMain,
      replies.sendPort,
      debugName: 'image-thumbnail-worker',
      onError: replies.sendPort,
      onExit: replies.sendPort,
    );
    final inbox = await replies.first as SendPort;
    return WorkerHandle._(isolate, inbox, replies);
  }

  Future<Object?> run(Object? job) async {
    _inbox.send(job);
    return _replies.first;
  }

  Future<void> dispose() async {
    _inbox.send(_shutdown);
    _replies.close();
    _isolate.kill(priority: Isolate.immediate);
  }
}

const _shutdown = '__shutdown__';

Future<void> _workerMain(SendPort outbound) async {
  final inbox = ReceivePort();
  outbound.send(inbox.sendPort); // berikan port request ke pemanggil
  await for (final message in inbox) {
    if (message == _shutdown) break;
    outbound.send(_process(message));
  }
  inbox.close();
}

int _process(Object? job) => job.toString().length;
```

Urutan handshake penting: worker membuat `ReceivePort` sendiri dan mengirim `SendPort` pasangannya sebelum pemanggil mengirim pekerjaan apa pun. Mengirim pekerjaan sebelum handshake selesai akan melempar error pada port yang sudah tertutup.

### Mengalirkan Hasil dengan Isolate.exit

`Isolate.exit` mengembalikan nilai akhir dan langsung menghentikan isolate — lebih murah daripada mengirim hasil lalu mematikan.

```dart
import 'dart:isolate';

Future<List<int>> primesBelow(int limit) => Isolate.run(() {
      final primes = <int>[];
      for (var n = 2; n < limit; n++) {
        if (primes.every((p) => n % p != 0)) primes.add(n);
      }
      // Isolate.run sudah memakai Isolate.exit di dalamnya; untuk isolate
      // yang dibuat manual panggil Isolate.exit(replyPort, result).
      return primes;
    });
```

Untuk isolate yang dibuat manual, `Isolate.exit(replyPort, result)` memindahkan kepemilikan objek hasil alih-alih menyalinnya — cara tercepat mengembalikan list besar.

### Memindahkan Buffer Besar dengan TransferableTypedData

Menyalin megabyte lewat port itu lambat. Pindahkan kepemilikannya.

```dart
import 'dart:isolate';
import 'dart:typed_data';

Future<Uint8List> invert(Uint8List pixels) async {
  final reply = ReceivePort();
  await Isolate.spawn(_invertMain, [reply.sendPort, pixels]);
  final result = await reply.first as TransferableTypedData;
  reply.close();
  return result.materialize().asUint8List();
}

void _invertMain(List<Object> args) {
  final sendPort = args[0] as SendPort;
  final bytes = args[1] as Uint8List;
  for (var i = 0; i < bytes.length; i++) {
    bytes[i] = 255 - bytes[i];
  }
  sendPort.send(TransferableTypedData.fromList([bytes]));
}
```

`materialize()` hanya boleh dipanggil sekali per `TransferableTypedData`; buffer di sisi pengirim menjadi kosong setelah transfer.

### Propagasi Error dan Strategi Restart

```dart
import 'dart:isolate';

Future<T> guarded<T>(Future<T> Function() run, {int attempts = 3}) async {
  Object? lastError;
  for (var attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run();
    } catch (error, stack) {
      lastError = error;
      // Isolate itu murah: ulangi dengan isolate baru daripada
      // memeriksa state internal isolate yang sudah crash.
      if (attempt == attempts) Error.throwWithStackTrace(error, stack);
    }
  }
  throw StateError('unreachable: $lastError');
}
```

Saat memakai `Isolate.spawn` langsung, berikan port `onError` dan `onExit`. Tanpa keduanya, error tak tertangkap di dalam worker menjadi senyap dan pemanggil menunggu selamanya.

```dart
import 'dart:isolate';

Future<void> spawnWithDiagnostics(Future<void> Function() body) async {
  final events = ReceivePort();
  final isolate = await Isolate.spawn(
    (_) => body(),
    null,
    onError: events.sendPort,
    onExit: events.sendPort,
    errorsAreFatal: true,
  );
  await for (final event in events) {
    if (event is List && event.length == 2) {
      // [errorMessage, stackTraceString] dikirim oleh port error.
      break;
    }
    break; // null dari port exit berarti isolate selesai dengan bersih.
  }
  events.close();
  isolate.kill(priority: Isolate.immediate);
}
```

### Membatalkan dan Mematikan Worker

Dart tidak menyediakan cancellation token yang bisa masuk ke dalam body isolate yang sedang berjalan. Pembatalan bersifat kooperatif: periksa flag pada event loop worker sendiri, atau matikan isolate lalu buat ulang.

```dart
import 'dart:async';
import 'dart:isolate';

class CancellableJob {
  CancellableJob(this._handle);
  final WorkerHandle _handle;
  var _cancelled = false;

  void cancel() => _cancelled = true;

  Future<void> run() async {
    while (!_cancelled) {
      final chunk = await _handle.run('next-chunk');
      if (chunk == null) break;
      // proses chunk
    }
  }
}
```

`isolate.kill(priority: Isolate.immediate)` menghentikan isolate di tengah eksekusi dan tidak pernah menjalankan blok `finally`. Gunakan `Isolate.beforeNextEvent` bila pesan yang sudah diantrekan perlu diproses lebih dulu.

### Aturan Thread Platform untuk Plugin

Panggilan channel berjalan pada thread UI platform, bukan pada isolate Dart yang Anda buat. Perbedaan inilah yang menentukan di mana kode boleh berjalan.

```text
Isolate UI Dart        → widget, gesture, routing, setState
Isolate worker Dart    → komputasi murni, parsing, kripto, pemrosesan gambar
Thread UI platform     → handler MethodChannel yang menyentuh hierarki view
Thread background platform → IO file, jaringan, decoder sensor
```

Konsekuensi praktis:

- Isolate worker tidak dapat memanggil `MethodChannel`. Akses plugin harus terjadi pada isolate UI; kirim hasilnya ke worker setelahnya.
- `RootIsolateToken` diperlukan ketika isolate background membutuhkan API plugin melalui `BackgroundIsolateBinaryMessenger` untuk sedikit plugin yang mendukungnya.

```dart
import 'dart:isolate';
import 'package:flutter/services.dart';

Future<void> notifyFromBackground(RootIsolateToken token) async {
  final messenger = BackgroundIsolateBinaryMessenger.ensureInitialized(token);
  await messenger.handlePlatformMessage(
    'app.channel/events',
    const StringCodec().encodeMessage('thumbnail-ready'),
    (_) {},
  );
}
```

### State Aman Konkurensi dengan Fasad Worker

Jauhkan urusan isolate dari widget dengan membungkus worker di balik service kecil yang mengekspos future.

```dart
import 'dart:async';

class ThumbnailService {
  ThumbnailService._(this._worker);
  final WorkerHandle _worker;

  static Future<ThumbnailService> create() async =>
      ThumbnailService._(await WorkerHandle.start());

  Future<Object?> build(Object? request) => _worker.run(request);

  Future<void> dispose() => _worker.dispose();
}

// Di stateful widget: buat sekali di initState, dispose di dispose,
// dan jangan simpan referensi melewati batas rebuild widget.
```

Jangan pernah membagikan instance koleksi yang mutable antar isolate — setiap isolate menerima salinan dari apa pun yang dikirim, sehingga penulisan di satu sisi tidak terlihat di sisi lain. Perlakukan setiap message sebagai snapshot immutable.

### Menguji Kode Isolate

```bash
# Unit-test fungsi murni di isolate utama — cepat dan deterministik.
dart test test/isolate/worker_test.dart

# Uji jalur spawn yang sebenarnya.
flutter test integration_test/isolate_worker_test.dart -d <device-id>
```

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('worker mengembalikan nilai yang sama dengan fungsi in-process', () async {
    final handle = await WorkerHandle.start();
    addTearDown(handle.dispose);

    final result = await handle.run('hello');
    expect(result, 5); // kontrak yang sama dengan _process('hello')
  });
}
```

Selalu dispose worker di `addTearDown` atau `dispose()`; isolate yang bocor menjaga proses test tetap hidup dan menggantungkan CI.

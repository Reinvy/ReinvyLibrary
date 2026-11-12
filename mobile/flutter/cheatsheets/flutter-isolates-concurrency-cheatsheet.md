---
title: "Flutter Isolates and Concurrency Cheatsheet"
description: "A quick reference for Flutter concurrency — the event loop, microtasks, Isolate.run, compute, long-lived worker isolates, message passing, TransferableTypedData, error handling, and platform thread rules."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Flutter Isolates and Concurrency Cheatsheet

## Quick Reference Table

| Task | Code / API | Description |
|------|------------|-------------|
| Import the library | `import 'dart:isolate';` | Gives access to `Isolate`, `ReceivePort`, `SendPort`, `TransferableTypedData` |
| Run one-off background work | `Isolate.run(() => heavyJob(input))` | Spawns a short-lived isolate and returns a `Future` with the result |
| Run a simple function off-thread | `compute(parseJson, payload)` | Foundation wrapper over `Isolate.run` for top-level or static functions |
| Spawn a persistent worker | `Isolate.spawn(workerMain, sendPort)` | Keeps an isolate alive for repeated jobs |
| Create a message channel | `final rp = ReceivePort();` | Opens a port whose `sendPort` can be handed to another isolate |
| Send a message | `sendPort.send(message)` | Delivers any sendable object to the receiving isolate |
| Listen for messages | `rp.listen((msg) { ... })` | Handles incoming messages on the current isolate |
| Await a single reply | `await rp.first` | Convenience for one-shot request/response |
| Stop listening and free the port | `rp.close()` | Closes the port so the isolate can be garbage collected |
| Kill a worker | `await isolate.kill(priority: Isolate.immediate)` | Terminates the isolate without waiting for its event queue |
| Transfer bytes without copying | `TransferableTypedData.fromList([bytes])` | Zero-copy hand-off of large `Uint8List` buffers |
| Measure frame cost | `flutter run --profile` | Profile mode is the only mode where timing is meaningful |

## Common Commands

### Project Setup and Dependencies

```bash
# dart:isolate and dart:async ship with the SDK — no dependency needed.
# Only add a package when you want a higher-level worker abstraction.
dart pub add worker_manager
dart pub add flutter_isolate

# Confirm the isolate libraries resolve for every target you ship.
dart analyze lib
```

### Running and Profiling Concurrent Code

```bash
# Profile mode: real timing for isolate startup and frame budget.
flutter run --profile

# Trace isolate activity in DevTools (CPU profiler + timeline).
flutter run --profile --verbose

# Drive a workload and capture a timeline for frame drops.
flutter drive --profile --target=test_driver/isolate_benchmark.dart

# Check that the main isolate never blocks during the benchmark.
flutter screenshot --type=rasterizer --observatory-uri=http://127.0.0.1:8181/
```

### Benchmarking Isolate Overhead

```bash
# Micro-benchmark spawn cost versus reusing a long-lived worker.
dart run benchmark/isolate_spawn_benchmark.dart

# Run isolate-aware unit tests in the Dart VM.
dart test test/isolate/worker_test.dart

# Run the same tests on a device to compare mobile spawn cost.
flutter test --platform=vm test/isolate
```

## Code Snippets

### One-Off Work with Isolate.run

`Isolate.run` is the default choice: it spawns, runs, returns, and tears down automatically.

```dart
import 'dart:isolate';

class ParsedReport {
  const ParsedReport(this.rows, this.total);

  final int rows;
  final double total;
}

Future<ParsedReport> parseReport(String rawCsv) {
  // The closure runs on a fresh isolate. Its result (and thrown
  // exceptions) are marshalled back to the caller automatically.
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

Rules that keep this safe:

- The closure must not capture a `BuildContext`, a widget, a `Stream`, or an open `File` handle.
- Sendable values are primitives, `String`, `List`, `Map`, `Set`, `Uint8List`, `TransferableTypedData`, and instances of classes annotated with `@pragma('vm:isolate-unsendable')` **not** present.
- Exceptions thrown inside the closure are re-thrown on the caller's isolate with the original stack trace preserved.

### compute() for Top-Level Functions

`compute` still exists and is the shortest path when the function is already top-level.

```dart
import 'package:flutter/foundation.dart';

int countWords(String text) {
  return text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
}

Future<int> wordCount(String document) => compute(countWords, document);
```

`compute` cannot capture closures. If the work needs several captured inputs, wrap them in a single sendable object and pass that as the message.

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

### Long-Lived Worker Isolate with Ports

Spawn a persistent worker when jobs arrive continuously — spawn cost dominates otherwise.

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
  outbound.send(inbox.sendPort); // hand the caller our request port
  await for (final message in inbox) {
    if (message == _shutdown) break;
    outbound.send(_process(message));
  }
  inbox.close();
}

int _process(Object? job) => job.toString().length;
```

The handshake order matters: the worker creates its own `ReceivePort` and sends the matching `SendPort` back before the caller sends any job. Sending a job before the handshake completes throws on a closed port.

### Streaming Results with Isolate.exit

`Isolate.exit` returns the final value and terminates instantly — cheaper than sending a result and then killing.

```dart
import 'dart:isolate';

Future<List<int>> primesBelow(int limit) => Isolate.run(() {
      final primes = <int>[];
      for (var n = 2; n < limit; n++) {
        if (primes.every((p) => n % p != 0)) primes.add(n);
      }
      // Isolate.run already uses Isolate.exit under the hood; for a
      // manually spawned isolate call Isolate.exit(replyPort, result).
      return primes;
    });
```

For a manually spawned isolate, `Isolate.exit(replyPort, result)` transfers ownership of the result object instead of copying it — the fastest way to return a large list.

### Transferring Large Buffers with TransferableTypedData

Copying megabytes through a port is slow. Transfer ownership instead.

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

`materialize()` can be called exactly once per `TransferableTypedData`; the buffer is emptied on the sending side after the transfer.

### Error Propagation and Restart Strategy

```dart
import 'dart:isolate';

Future<T> guarded<T>(Future<T> Function() run, {int attempts = 3}) async {
  Object? lastError;
  for (var attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run();
    } catch (error, stack) {
      lastError = error;
      // Isolates are cheap: retry with a fresh one rather than
      // inspecting the crashed isolate's internal state.
      if (attempt == attempts) Error.throwWithStackTrace(error, stack);
    }
  }
  throw StateError('unreachable: $lastError');
}
```

When using `Isolate.spawn` directly, pass an `onError` port and a `onExit` port. Without them, an uncaught error inside the worker is silent and the caller awaits forever.

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
      // [errorMessage, stackTraceString] delivered by the error port.
      break;
    }
    break; // null from the exit port means the isolate ended cleanly.
  }
  events.close();
  isolate.kill(priority: Isolate.immediate);
}
```

### Cancelling and Shutting Down Workers

Dart has no cancellation token that reaches inside a running isolate body. Cancellation is cooperative: check a flag on the worker's own event loop, or kill the isolate and respawn.

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
      // process chunk
    }
  }
}
```

`isolate.kill(priority: Isolate.immediate)` stops the isolate mid-execution and never runs `finally` blocks. Use `Isolate.beforeNextEvent` when you need queued messages drained first.

### Platform Thread Rules for Plugins

Channel calls run on the platform's UI thread, never on a Dart isolate you spawned. That distinction decides where code may run.

```text
Dart UI isolate   → widgets, gestures, routing, setState
Dart worker isolate → pure computation, parsing, crypto, image work
Platform UI thread → MethodChannel handlers touching the view hierarchy
Platform background thread → file IO, network, sensor decoders
```

Practical consequences:

- A worker isolate cannot call `MethodChannel`. Plugin access must happen on the UI isolate; send the result to the worker afterwards.
- `RootIsolateToken` is required when a background isolate needs plugin APIs through `BackgroundIsolateBinaryMessenger` for the few plugins that support it.

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

### Concurrency-Safe State with a Worker Facade

Keep isolate plumbing out of widgets by wrapping a worker behind a small service that exposes futures.

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

// In a stateful widget: create once in initState, dispose in dispose,
// and never hold a reference across a widget rebuild boundary.
```

Never share mutable collection instances across isolates — each isolate gets its own copy of whatever was sent, so writes on one side are invisible on the other. Treat every message as an immutable snapshot.

### Testing Isolate Code

```bash
# Unit-test the pure function on the main isolate — fast and deterministic.
dart test test/isolate/worker_test.dart

# Exercise the real spawn path.
flutter test integration_test/isolate_worker_test.dart -d <device-id>
```

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('worker returns the same value as the in-process function', () async {
    final handle = await WorkerHandle.start();
    addTearDown(handle.dispose);

    final result = await handle.run('hello');
    expect(result, 5); // same contract as _process('hello')
  });
}
```

Always dispose workers in `addTearDown` or `dispose()`; leaked isolates keep the test process alive and hang CI.

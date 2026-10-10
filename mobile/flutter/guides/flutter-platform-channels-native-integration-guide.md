---
title: "Flutter Platform Channels and Native Integration Guide"
description: "A comprehensive guide to bridging Flutter and native code — method, event, and basic message channels, type-safe code generation with Pigeon, dart:ffi for C libraries, threading, error handling, and testing platform-channel code on Android and iOS."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Flutter Platform Channels and Native Integration Guide

## Introduction

Flutter renders its UI on every platform from a single Dart codebase, but some capabilities live outside the Dart world: biometric authentication, push notification registration tokens, background geolocation, health-data sensors, system share sheets, and low-level C libraries. When a pub.dev package does not cover what you need, you must write native code and bridge it into Dart. That bridge is the **platform channel** system.

This guide covers the three integration strategies Flutter offers, when to use each one, and how to implement them safely:

- **Platform channels** (`MethodChannel`, `EventChannel`, `BasicMessageChannel`) — direct, imperative communication between Dart and Kotlin/Swift.
- **Pigeon** — compile-time code generation that turns a hand-written channel protocol into type-safe, null-safe API stubs in all three languages.
- **`dart:ffi`** — direct binding to C libraries without any platform channel overhead, ideal for compute-heavy libraries already compiled for mobile.

Beyond wiring, the guide covers the failure modes that sink real apps: threading mistakes (calling a platform API off the main thread), `PlatformException` handling that crashes users, oversized payloads that stall the channel, and unversioned channel contracts that break when the app updates independently of the platform side. Following these practices keeps the Dart/native boundary boring, predictable, and testable.

## Best Practices

### 1. Prefer Pigeon over hand-written MethodChannel for anything beyond toy usage

A hand-written `MethodChannel` couples your Dart code to magic strings (`'getBatteryLevel'`) and untyped `Map` payloads. Pigeon generates Dart, Kotlin, and Swift classes from a single protocol definition file, so method names, argument types, and return types are checked at compile time in every language. Renaming a method in the definition file breaks the build on all three sides instead of failing silently at runtime. Use raw `MethodChannel` for small prototypes and one-off experiments; use Pigeon for anything that ships.

### 2. Scope one channel per feature area, never one giant channel

A single channel named `com.example.app/native` with forty methods becomes an unmaintainable switch statement on both sides and creates a serialization bottleneck. Name channels by feature (`com.example.app/battery`, `com.example.app/geolocation`) so each native module owns a small, focused contract. Feature-scoped channels also fail independently: if one feature's handler throws, the other channels keep working.

### 3. Treat the platform main thread as sacred

Platform method calls dispatched from Dart arrive on the **platform's main thread** (the Android main thread or iOS main thread). Work the platform APIs must do there — read a sensor, query a system service — is fine, but anything slow (network, file I/O, cryptography, image processing) blocks UI on the native side and can trigger Android `ANR` dialogs or iOS watchdog kills. Move heavy work to a background thread on the platform side, then deliver the result through the callback, which correctly marshals back to the platform main thread.

### 4. Model failure explicitly with PlatformException

Native code fails in ways Dart cannot predict: hardware unavailable, permissions denied, `null` from an OS callback. Returning `null` silently hides the failure; throwing `PlatformException` carries a `code`, `message`, and `details` that Dart code can branch on. Catch it at the boundary in Dart and translate it into your app's own error type, so the rest of the app never sees raw platform errors.

### 5. Keep payloads small and JSON-serializable

Channel messages are copied across the engine boundary, so large or numerous messages are slow. Pass small maps of primitives, not large binary blobs — for images, audio, or files, write to disk or shared storage and pass a path. Type the payload explicitly (all keys and values with known types) instead of relying on dynamic maps; this prevents silent `null` casts on the platform side.

### 6. Version the channel contract

The Dart code and the platform code ship in the same binary, but plugins can be updated independently through pub.dev, and older Android users may run a cached native build. Define a contract version (for example, a `getPlatformVersion` handshake or a version field in the payload) and have both sides reject mismatches. This converts confusing runtime errors into a clear "upgrade the plugin" message.

### 7. Wrap channels behind an interface and mock them in tests

Never call `MethodChannel.invokeMethod` directly in widget or business code. Wrap every channel in a small repository or service class behind an abstract interface; production injects the real channel-backed implementation, tests inject a fake. This keeps platform-channel code out of your widget tree, makes unit and widget tests hermetic, and lets you test error paths by throwing `PlatformException` from the fake.

### 8. Prefer federated plugins for reusable native functionality

If your native logic is not app-specific — it could serve any Flutter app — package it as a plugin with platform implementations in separate pub packages. Federated plugins let the app depend on the app-facing package while Android and iOS implementations are resolved automatically. This is the path the Flutter team uses for first-party plugins and the correct long-term structure for anything you plan to open-source.

## Implementation Steps

### Step 1: Choose the integration strategy

Decide which bridge fits the requirement:

- **`MethodChannel`** — one-shot request/response calls to platform APIs (read a value, perform an action, return a result). The default choice for most integrations.
- **`EventChannel`** — continuous or callback-driven data: sensor streams, battery level changes, location updates, phone call state.
- **`BasicMessageChannel`** — bidirectional, streaming-style message passing without method semantics, useful for long-lived conversations (for example, a WebView bridge).
- **Pigeon** — any of the above as a type-safe generated contract; almost always preferred over hand-written channels.
- **`dart:ffi`** — calling existing C/C++ libraries (compression, signal processing, mallocs-heavy algorithms) where a channel round-trip would add needless overhead.

When in doubt, start with Pigeon: it generates the channel plumbing for you and leaves the platform logic as plain classes you implement.

### Step 2: Set up the platform structure

For an app-level integration (no plugin), the native code lives in the platform folders of your Flutter project:

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

The channel name is a reverse-DNS identifier. It must match **exactly** on the Dart, Kotlin, and Swift sides — the engine performs no normalization, so `com.example.app/battery` on one side and `com.example.app/Battery` on the other silently never connect.

For reusable functionality, create a plugin instead:

```bash
flutter create --template=plugin --platforms=android,ios native_battery
```

The plugin template scaffolds `MethodChannel` registration in `registerWith`/`register` for both platforms, which is the same boilerplate Pigeon replaces.

### Step 3: Implement a MethodChannel end-to-end

The Dart side declares the channel and invokes methods:

```dart
import 'package:flutter/services.dart';

class BatteryService {
  static const MethodChannel _channel = MethodChannel('com.example.app/battery');

  Future<int> getBatteryLevel() async {
    try {
      final int? level = await _channel.invokeMethod<int>('getBatteryLevel');
      return level ?? -1;
    } on PlatformException catch (e) {
      throw BatteryException(e.code, e.message ?? 'Unknown battery error');
    }
  }
}
```

The Android side registers the handler and answers on the platform main thread:

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

The iOS side implements the same contract with `FlutterMethodChannel`:

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

Call the service from Dart exactly like any other async API:

```dart
final battery = await batteryService.getBatteryLevel();
```

### Step 4: Stream data with EventChannel

`EventChannel` pushes values from the platform side to Dart instead of waiting for a request. The Dart side opens a broadcast stream:

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

The Android side implements `StreamHandler`, which receives the listener lifecycle callbacks:

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

Register the stream handler on the same binary messenger:

```kotlin
EventChannel(
    flutterEngine.dartExecutor.binaryMessenger,
    "com.example.app/accelerometer"
).setStreamHandler(AccelerometerStreamHandler(this))
```

Call `events.error(code, message, details)` from `onSensorChanged` when the sensor supplies invalid data; the error propagates to the Dart stream as a `PlatformException`.

### Step 5: Generate a type-safe contract with Pigeon

Pigeon turns a plain Dart interface into matching Kotlin/Swift class stubs. First create the protocol file:

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

Generate the platform stubs:

```bash
dart run pigeon --input pigeons/battery_api.dart \
  --dart_out lib/generated/battery_api.g.dart \
  --kotlin_out android/app/src/main/kotlin/com/example/my_app/BatteryApi.g.kt \
  --swift_out ios/Runner/BatteryApi.g.swift
```

The Dart side now calls a strongly typed method — no magic strings:

```dart
final api = BatteryApi();
final BatteryInfo info = await api.getBatteryInfo();
```

Implement the generated Kotlin abstract class:

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

Pigeon's `@async` annotation generates a suspend function on Kotlin and a callback-based method on Swift, so you never hand-write channel plumbing. The generated stubs are re-created on every code-generation run, so do not edit them; implement the generated base classes instead.

### Step 6: Bind C libraries with dart:ffi

For C/C++ libraries, `dart:ffi` calls into the native symbol table directly:

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

Use `DynamicLibrary.open` with the bundled library name on Android, `DynamicLibrary.process()` for symbols already linked, and `DynamicLibrary.executable()` on iOS for symbols exported by the runner. Call `calloc`/`malloc` from `package:ffi` for pointer-heavy APIs and `free` every allocation you own — the Dart GC does not know about native heap memory.

### Step 7: Handle threading correctly

Platform channel handlers run on the platform main thread. When a platform API blocks (network requests, `CLLocationManager` resolution, camera capture), offload it:

```swift
public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    if call.method == "fetchProfile" {
        DispatchQueue.global(qos: .userInitiated).async {
            let profile = self.fetchProfile() // blocking network call
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
                val profile = fetchProfile() // blocking network call
                runOnUiThread { result.success(profile) }
            }
        } else {
            result.notImplemented()
        }
    }
```

The `result` callback marshals back to the platform main thread; only call it once, exactly once, and from the main thread — calling it twice throws, and never calling it leaves the Dart future pending forever.

### Step 8: Test platform-channel code

Unit-test the Dart side without any device by mocking the message handler:

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

  test('returns battery level from the mocked channel', () async {
    final service = BatteryService();
    expect(await service.getBatteryLevel(), 87);
  });
}
```

Test the failure path by throwing from the mock:

```dart
setMockMethodCallHandler(channel, (call) async {
  throw PlatformException(
    code: 'UNAVAILABLE',
    message: 'No battery hardware',
  );
});
```

Because every channel lives behind `BatteryService`, the widget layer never knows a platform channel exists, and the same tests run in the Dart VM, on a device, and in CI.

### Step 9: Version and evolve the contract

Add a handshake method to the channel so both sides negotiate compatibility before real traffic flows:

```dart
Future<bool> supportsContract(int version) async {
  return await _channel.invokeMethod<bool>('supportsContract', version) ?? false;
}
```

On the platform side, respond `true` only when the requested version is within the implemented range, otherwise `result.error('CONTRACT_MISMATCH', ...)`. For payloads that carry maps, include a `"v": 2` version field and let the receiver switch on it, so old and new clients interoperate during rollout.

## Conclusion

The Dart/native boundary is the highest-risk seam in a Flutter app: it runs outside Dart's safety guarantees, executes on unfamiliar threads, and fails with `PlatformException` instead of exceptions your code already handles. Applying the practices in this guide — Pigeon over magic strings, feature-scoped channels, disciplined threading, explicit error modeling, versioned contracts, and mocked tests — makes that seam predictable. Start with the smallest bridge that meets the requirement, wrap it in a typed service, and you can add native capabilities to any Flutter app without turning the platform layer into a second application that nobody dares to touch.

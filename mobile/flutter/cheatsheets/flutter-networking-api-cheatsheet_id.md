---
title: "Cheat Sheet Networking dan Integrasi API Flutter"
description: "Panduan referensi cepat untuk networking Flutter — klien HTTP, Dio, serialisasi JSON, interceptor, penanganan error, timeout, pembatalan permintaan, dan unggah file."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Networking dan Integrasi API Flutter

## Tabel Referensi Cepat

| Tugas | Kode / Paket | Deskripsi |
|-------|--------------|-----------|
| Menambahkan klien HTTP | `dart pub add http` | Klien HTTP ringan untuk panggilan REST |
| Menambahkan Dio | `dart pub add dio` | Klien HTTP kaya fitur dengan interceptor dan pembatalan |
| Menambahkan anotasi JSON | `dart pub add json_annotation` | Anotasi untuk model `json_serializable` |
| Menambahkan alat build | `dart pub add --dev build_runner json_serializable` | Generator kode untuk model JSON |
| Permintaan GET | `http.get(Uri.parse('https://api.example.com/items'))` | Mengambil data dari sebuah endpoint |
| POST dengan payload JSON | `http.post(uri, headers: {'Content-Type': 'application/json'}, body: jsonEncode(payload))` | Mengirim data JSON ke server |
| Mengatur timeout | `http.get(uri).timeout(const Duration(seconds: 10))` | Membatalkan permintaan setelah 10 detik |
| GET dengan Dio | `dio.get('/items')` | GET menggunakan base URL yang dikonfigurasi |
| POST dengan Dio | `dio.post('/items', data: payload)` | POST dengan encoding JSON otomatis |
| Membatalkan permintaan | `dio.get(uri, cancelToken: token)` | Menghentikan permintaan yang sedang berjalan |
| Mengunggah file | `FormData.fromMap({'file': await MultipartFile.fromFile(path)})` | Unggah file multipart |
| Mendekode respons | `jsonDecode(response.body)` | Mengubah string JSON menjadi objek Dart |
| Koneksi WebSocket | `WebSocketChannel.connect(Uri.parse('wss://...'))` | Komunikasi dua arah secara real-time |
| Konfigurasi global Dio | `BaseOptions(baseUrl: ..., connectTimeout: ...)` | Base URL, timeout, dan header bersama |
| Menambahkan interceptor | `InterceptorsWrapper(onRequest: ..., onResponse: ..., onError: ...)` | Logging, token autentikasi, dan percobaan ulang |

## Perintah Umum

### Menambahkan Dependensi

```bash
flutter pub add http
flutter pub add dio
flutter pub add json_annotation
flutter pub add --dev build_runner json_serializable
```

### Menjalankan Generasi Kode

```bash
dart run build_runner build --delete-conflicting-outputs
dart run build_runner watch
```

### Menguji Endpoint dengan curl

```bash
curl -X GET https://api.example.com/items
curl -X POST https://api.example.com/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Phone", "price": 499}'
curl -X GET https://api.example.com/items \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Potongan Kode

### GET Dasar dengan Paket http

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<List<dynamic>> fetchItems() async {
  final uri = Uri.parse('https://api.example.com/items');
  final response = await http.get(uri).timeout(const Duration(seconds: 10));

  if (response.statusCode == 200) {
    return jsonDecode(response.body) as List<dynamic>;
  }
  throw Exception('Permintaan gagal dengan status ${response.statusCode}');
}
```

### POST dengan Body JSON

```dart
Future<Map<String, dynamic>> createItem(String name, int price) async {
  final uri = Uri.parse('https://api.example.com/items');
  final response = await http.post(
    uri,
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'name': name, 'price': price}),
  );

  if (response.statusCode == 201) {
    return jsonDecode(response.body) as Map<String, dynamic>;
  }
  throw Exception('Gagal membuat item: ${response.statusCode}');
}
```

### Setup Klien Dio dengan BaseOptions

```dart
final dio = Dio(
  BaseOptions(
    baseUrl: 'https://api.example.com',
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'Accept': 'application/json'},
  ),
);
```

### Interceptor untuk Logging dan Token Autentikasi

```dart
import 'package:flutter/foundation.dart';

dio.interceptors.add(
  InterceptorsWrapper(
    onRequest: (options, handler) {
      final token = authRepository.readToken();
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      debugPrint('--> ${options.method} ${options.path}');
      handler.next(options);
    },
    onError: (error, handler) {
      debugPrint('<-- ERROR ${error.response?.statusCode}');
      handler.next(error);
    },
  ),
);
```

### Model JSON dengan json_serializable

```dart
import 'package:json_annotation/json_annotation.dart';

part 'item.g.dart';

@JsonSerializable()
class Item {
  const Item({required this.id, required this.name, this.price});

  factory Item.fromJson(Map<String, dynamic> json) => _$ItemFromJson(json);

  final int id;
  final String name;
  final int? price;

  Map<String, dynamic> toJson() => _$ItemToJson(this);
}
```

Penggunaan:

```dart
final item = Item.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
```

### Penanganan Error dengan Result Bertipe Sealed

```dart
sealed class ApiResult<T> {}

class ApiSuccess<T> extends ApiResult<T> {
  ApiSuccess(this.data);
  final T data;
}

class ApiFailure<T> extends ApiResult<T> {
  ApiFailure(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
}

Future<ApiResult<Item>> fetchItem(int id) async {
  try {
    final response = await dio.get('/items/$id');
    return ApiSuccess(Item.fromJson(response.data as Map<String, dynamic>));
  } on DioException catch (e) {
    return ApiFailure(e.message ?? 'Error jaringan', statusCode: e.response?.statusCode);
  }
}
```

### Timeout dan Pembatalan dengan CancelToken

```dart
final cancelToken = CancelToken();

// Berikan token ke setiap permintaan yang mungkin ingin dibatalkan.
final response = await dio.get('/items', cancelToken: cancelToken);

// Hentikan permintaan dari callback lain, misalnya metode dispose().
cancelToken.cancel('Permintaan dibatalkan oleh pengguna');
```

### Unggah File Multipart

```dart
Future<void> uploadAvatar(File image) async {
  final formData = FormData.fromMap({
    'avatar': await MultipartFile.fromFile(image.path, filename: 'avatar.jpg'),
  });

  final response = await dio.post('/users/me/avatar', data: formData);
  if (response.statusCode != 200) {
    throw Exception('Unggah gagal: ${response.statusCode}');
  }
}
```

### Percobaan Ulang dengan Exponential Backoff

```dart
Future<T> withRetry<T>(Future<T> Function() request, {int maxAttempts = 3}) async {
  var attempt = 0;
  while (true) {
    try {
      return await request();
    } on DioException catch (e) {
      attempt++;
      final retryable = e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response?.statusCode == 429 ||
          (e.response?.statusCode ?? 0) >= 500;
      if (!retryable || attempt >= maxAttempts) {
        rethrow;
      }
      await Future.delayed(Duration(seconds: 2 * attempt));
    }
  }
}
```

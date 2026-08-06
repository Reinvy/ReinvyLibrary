---
title: "Flutter Networking and API Integration Cheatsheet"
description: "A quick reference guide for Flutter networking — HTTP clients, Dio, JSON serialization, interceptors, error handling, timeouts, cancellation, and file uploads."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Flutter Networking and API Integration Cheatsheet

## Quick Reference Table

| Task | Code / Package | Description |
|------|----------------|-------------|
| Add HTTP client | `dart pub add http` | Lightweight HTTP client for REST calls |
| Add Dio | `dart pub add dio` | Feature-rich HTTP client with interceptors and cancellation |
| Add JSON annotations | `dart pub add json_annotation` | Annotations for `json_serializable` models |
| Add build tools | `dart pub add --dev build_runner json_serializable` | Code generator for JSON models |
| GET request | `http.get(Uri.parse('https://api.example.com/items'))` | Fetch data from an endpoint |
| POST JSON payload | `http.post(uri, headers: {'Content-Type': 'application/json'}, body: jsonEncode(payload))` | Send JSON data to the server |
| Set a timeout | `http.get(uri).timeout(const Duration(seconds: 10))` | Abort the request after 10 seconds |
| Dio GET | `dio.get('/items')` | GET using the configured base URL |
| Dio POST | `dio.post('/items', data: payload)` | POST with automatic JSON encoding |
| Cancel a request | `dio.get(uri, cancelToken: token)` | Abort an in-flight request |
| Upload a file | `FormData.fromMap({'file': await MultipartFile.fromFile(path)})` | Multipart file upload |
| Decode a response | `jsonDecode(response.body)` | Convert a JSON string into Dart objects |
| WebSocket connection | `WebSocketChannel.connect(Uri.parse('wss://...'))` | Real-time bidirectional communication |
| Global Dio config | `BaseOptions(baseUrl: ..., connectTimeout: ...)` | Shared base URL, timeouts, and headers |
| Add an interceptor | `InterceptorsWrapper(onRequest: ..., onResponse: ..., onError: ...)` | Logging, auth tokens, and retries |

## Common Commands

### Adding Dependencies

```bash
flutter pub add http
flutter pub add dio
flutter pub add json_annotation
flutter pub add --dev build_runner json_serializable
```

### Running Code Generation

```bash
dart run build_runner build --delete-conflicting-outputs
dart run build_runner watch
```

### Testing Endpoints with curl

```bash
curl -X GET https://api.example.com/items
curl -X POST https://api.example.com/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Phone", "price": 499}'
curl -X GET https://api.example.com/items \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Code Snippets

### Basic GET with the http Package

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<List<dynamic>> fetchItems() async {
  final uri = Uri.parse('https://api.example.com/items');
  final response = await http.get(uri).timeout(const Duration(seconds: 10));

  if (response.statusCode == 200) {
    return jsonDecode(response.body) as List<dynamic>;
  }
  throw Exception('Request failed with status ${response.statusCode}');
}
```

### POST with a JSON Body

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
  throw Exception('Failed to create item: ${response.statusCode}');
}
```

### Dio Client Setup with BaseOptions

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

### Interceptors for Logging and Auth Tokens

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

### JSON Model with json_serializable

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

Usage:

```dart
final item = Item.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
```

### Error Handling with a Sealed Result

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
    return ApiFailure(e.message ?? 'Network error', statusCode: e.response?.statusCode);
  }
}
```

### Timeouts and Cancellation with CancelToken

```dart
final cancelToken = CancelToken();

// Pass the token to every request you may want to cancel.
final response = await dio.get('/items', cancelToken: cancelToken);

// Abort the request from another callback, for example a dispose() method.
cancelToken.cancel('Request cancelled by user');
```

### Multipart File Upload

```dart
Future<void> uploadAvatar(File image) async {
  final formData = FormData.fromMap({
    'avatar': await MultipartFile.fromFile(image.path, filename: 'avatar.jpg'),
  });

  final response = await dio.post('/users/me/avatar', data: formData);
  if (response.statusCode != 200) {
    throw Exception('Upload failed: ${response.statusCode}');
  }
}
```

### Retry with Exponential Backoff

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

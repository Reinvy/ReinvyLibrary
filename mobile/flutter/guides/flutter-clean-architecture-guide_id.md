---
title: "Panduan Arsitektur Clean Architecture Flutter"
description: "Panduan komprehensif tentang implementasi Clean Architecture di aplikasi Flutter, meliputi struktur folder, manajemen state, injeksi dependensi, dan strategi pengujian."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Arsitektur Clean Architecture Flutter

## Pendahuluan

Clean Architecture, yang dipopulerkan oleh Robert C. Martin, adalah filosofi desain perangkat lunak yang memisahkan kode ke dalam lapisan-lapisan berbeda dengan aturan dependensi yang ketat. Di Flutter, arsitektur ini membantu tim membangun aplikasi yang dapat diuji, mudah dipelihara, dan skalabel dengan mengisolasi logika bisnis dari kerangka kerja UI dan dependensi eksternal.

Panduan ini mencakup pola Clean Architecture praktis untuk Flutter, termasuk organisasi folder, manajemen state dengan Riverpod, injeksi dependensi, penanganan error, dan pengujian di setiap lapisan. Anda akan mempelajari cara menyusun proyek Flutter siap produksi yang dapat diskalakan di berbagai fitur dan tim.

## Praktik Terbaik

### 1. Arsitektur Tiga Lapisan dengan Aturan Dependensi Ketat

Atur kode Anda ke dalam tiga lapisan inti — **data**, **domain**, dan **presentasi** — dengan dependensi mengarah ke dalam: presentasi bergantung pada domain, data bergantung pada domain, dan domain tidak bergantung pada apa pun di luar.

- **Lapisan domain** (paling dalam): Berisi entitas, use case, dan antarmuka repositori. Tidak ada Flutter, tidak ada paket pihak ketiga — murni Dart.
- **Lapisan data**: Mengimplementasikan kontrak repositori dari domain. Menangani panggilan API, basis data lokal, dan sumber data.
- **Lapisan presentasi**: Berisi widget UI dan pengontrol manajemen state. Bergantung pada domain melalui use case atau abstraksi repositori.

### 2. Pola Repository untuk Akses Data

Abstraksi akses data di balik antarmuka repositori yang didefinisikan di lapisan domain. Ini memungkinkan Anda mengganti implementasi (REST API → cache lokal → mock) tanpa menyentuh logika bisnis.

- Definisikan kelas abstrak `Repository` di domain.
- Implementasikan di lapisan data menggunakan `RepositoryImpl`.
- Suntikkan implementasi saat startup aplikasi melalui wadah injeksi dependensi.

### 3. Use Case untuk Tanggung Jawab Tunggal

Setiap use case (interactor) merangkum satu operasi bisnis. Ini menjaga kelas tetap kecil, teruji, dan dapat digunakan kembali di berbagai layar.

- Use case menggunakan repositori sebagai dependensi dan mengekspos satu metode seperti `call()` atau `execute()`.
- Alur kompleks menggabungkan beberapa use case melalui komposisi, bukan pewarisan.

### 4. Manajemen State dengan Riverpod

Gunakan Riverpod sebagai lapisan manajemen state yang menjembatani presentasi dan domain. Provider adalah perekat yang menghubungkan use case ke pohon widget.

- `FutureProvider` / `StreamProvider` untuk data asinkron dari use case.
- `StateNotifierProvider` atau `NotifierProvider` untuk state yang dapat berubah yang menggabungkan beberapa use case.
- Override provider dalam pengujian memungkinkan injeksi dependensi dengan nilai mock.

### 5. Value Object Imutabel dan Freezed

Gunakan paket `freezed` untuk kelas data imutabel dengan dukungan copy-with, union type untuk kelas hasil tersegel, dan pembuatan `==` / `hashCode` otomatis.

- Definisikan entitas dan model sebagai kelas `@freezed`.
- Gunakan union tersegel untuk tipe `Result<T>`: `Success<T>` dan `Failure<T>`.

### 6. Injeksi Dependensi melalui Konstruktor

Utamakan injeksi konstruktor daripada service locator. Berikan dependensi secara eksplisit melalui pohon widget menggunakan provider Riverpod atau wadah DI yang ringan.

- Gunakan `ref.watch` / `ref.read` dari Riverpod untuk mengakses provider.
- Hindari singleton global — ini mempersulit pengujian dan refaktorisasi.

### 7. Pengujian di Setiap Lapisan

Tulis unit test untuk domain (use case, entitas), data (repositori, sumber data), dan presentasi (provider, widget test). Gunakan mock untuk dependensi eksternal.

- **Domain**: Unit test murni — tidak perlu mock untuk entitas.
- **Data**: Mock klien HTTP dan konektor basis data.
- **Presentasi**: Override provider Riverpod dengan implementasi mock.

## Langkah Implementasi

### Langkah 1: Tentukan Struktur Folder Proyek

Mulai dengan tata letak berbasis fitur di dalam `lib/`:

```text
lib/
├── app/
│   ├── app.dart                  # MaterialApp + pengaturan router
│   └── app_router.dart           # Konfigurasi GoRouter atau Navigator 2.0
├── core/
│   ├── error/
│   │   └── failures.dart         # Kelas sealed Failure
│   ├── network/
│   │   └── network_info.dart     # Abstraksi konektivitas
│   └── usecase/
│       └── usecase.dart          # Kelas abstrak UseCase dasar
├── features/
│   └── <nama_fitur>/
│       ├── data/
│       │   ├── datasources/
│       │   │   ├── <nama>_remote_data_source.dart
│       │   │   └── <nama>_local_data_source.dart
│       │   ├── models/
│       │   │   └── <nama>_model.dart
│       │   └── repositories/
│       │       └── <nama>_repository_impl.dart
│       ├── domain/
│       │   ├── entities/
│       │   │   └── <nama>.dart
│       │   ├── repositories/
│       │   │   └── <nama>_repository.dart   # Kontrak abstrak
│       │   └── usecases/
│       │       └── ambil_<nama>.dart
│       └── presentation/
│           ├── providers/
│           │   └── <nama>_provider.dart
│           ├── pages/
│           │   └── <nama>_page.dart
│           └── widgets/
│               └── <nama>_widget.dart
├── main.dart                    # Entry point dengan ProviderScope
└── providers.dart               # Deklarasi provider tingkat atas
```

### Langkah 2: Siapkan Dependensi

Tambahkan berikut ini ke `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5
  freezed_annotation: ^2.4.1
  json_annotation: ^4.9.0
  go_router: ^14.2.0
  dio: ^5.4.0
  get_it: ^7.7.0         # Opsional — Riverpod sering menggantikannya
  dartz: ^0.10.1         # Either type untuk penanganan error fungsional

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.9
  freezed: ^2.5.2
  json_serializable: ^6.7.1
  riverpod_generator: ^2.4.0
  mockito: ^5.4.4
  mocktail: ^1.0.3
```

### Langkah 3: Buat Lapisan Domain

Definisikan entitas, kontrak repositori, dan use case.

**Entitas** — Dart murni, tanpa anotasi:

```dart
// features/example/domain/entities/user.dart
class User {
  final String id;
  final String name;
  final String email;

  const User({
    required this.id,
    required this.name,
    required this.email,
  });
}
```

**Kontrak repositori** — kelas abstrak:

```dart
// features/example/domain/repositories/user_repository.dart
abstract class UserRepository {
  Future<User> getUserById(String id);
}
```

**Use case** — tanggung jawab tunggal:

```dart
// features/example/domain/usecases/get_user.dart
import 'package:dartz/dartz.dart';

import '../repositories/user_repository.dart';

class GetUser {
  final UserRepository repository;

  GetUser(this.repository);

  Future<Either<Failure, User>> call(String id) {
    return repository.getUserById(id);
  }
}
```

### Langkah 4: Implementasikan Lapisan Data

**Model** dengan serialisasi JSON:

```dart
// features/example/data/models/user_model.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_model.freezed.dart';
part 'user_model.g.dart';

@freezed
class UserModel with _$UserModel {
  const factory UserModel({
    required String id,
    required String name,
    required String email,
  }) = _UserModel;

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);

  // Konversi ke entitas domain
  const UserModel._();
  User toDomain() => User(id: id, name: name, email: email);
}
```

**Sumber data** — panggilan API jarak jauh:

```dart
// features/example/data/datasources/user_remote_data_source.dart
import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'user_remote_data_source.g.dart';

class UserRemoteDataSource {
  final Dio dio;

  UserRemoteDataSource(this.dio);

  Future<UserModel> fetchUser(String id) async {
    final response = await dio.get('/users/$id');
    return UserModel.fromJson(response.data);
  }
}

@riverpod
UserRemoteDataSource userRemoteDataSource(UserRemoteDataSourceRef ref) {
  return UserRemoteDataSource(ref.watch(dioProvider));
}
```

**Implementasi repositori** — memetakan model data ke entitas domain:

```dart
// features/example/data/repositories/user_repository_impl.dart
import 'package:dartz/dartz.dart';

import '../../domain/entities/user.dart';
import '../../domain/repositories/user_repository.dart';
import '../datasources/user_remote_data_source.dart';
import '../models/user_model.dart';

class UserRepositoryImpl implements UserRepository {
  final UserRemoteDataSource remoteDataSource;

  UserRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, User>> getUserById(String id) async {
    try {
      final model = await remoteDataSource.fetchUser(id);
      return Right(model.toDomain());
    } on Exception catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }
}
```

### Langkah 5: Hubungkan Lapisan Presentasi

Buat provider Riverpod yang memanggil use case dan mengekspos state ke UI:

```dart
// features/example/presentation/providers/user_provider.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'user_provider.g.dart';

@riverpod
class UserNotifier extends _$UserNotifier {
  @override
  AsyncValue<User> build(String userId) {
    _fetchUser(userId);
    return const AsyncLoading();
  }

  Future<void> _fetchUser(String id) async {
    final getUseCase = ref.read(getUserProvider);
    state = await AsyncValue.guard(() => getUseCase(id));
  }
}
```

Bangun halaman UI:

```dart
// features/example/presentation/pages/user_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class UserPage extends ConsumerWidget {
  final String userId;

  const UserPage({super.key, required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(userNotifierProvider(userId));

    return Scaffold(
      appBar: AppBar(title: const Text('Profil Pengguna')),
      body: userAsync.when(
        data: (user) => Column(
          children: [
            Text('Nama: ${user.name}'),
            Text('Email: ${user.email}'),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
```

### Langkah 6: Konfigurasi Injeksi Dependensi

Deklarasikan provider tingkat atas di file pusat:

```dart
// lib/providers.dart
import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'providers.g.dart';

@riverpod
Dio dio(DioRef ref) {
  return Dio(BaseOptions(baseUrl: 'https://api.example.com'));
}

@riverpod
UserRepository userRepository(UserRepositoryRef ref) {
  final dataSource = ref.watch(userRemoteDataSourceProvider);
  return UserRepositoryImpl(remoteDataSource: dataSource);
}

@riverpod
GetUser getUser(GetUserRef ref) {
  return GetUser(ref.watch(userRepositoryProvider));
}
```

### Langkah 7: Tulis Pengujian

**Domain — pengujian use case (Dart murni, tidak perlu mock)**:

```dart
// test/features/example/domain/usecases/get_user_test.dart
void main() {
  group('GetUser', () {
    test('mengembalikan user ketika repositori berhasil', () async {
      final mockRepo = MockUserRepository();
      when(() => mockRepo.getUserById('1'))
          .thenAnswer((_) async => Right(testUser));

      final useCase = GetUser(mockRepo);
      final result = await useCase('1');

      expect(result, Right(testUser));
    });
  });
}
```

**Data — pengujian repositori dengan sumber data mock**:

```dart
// test/features/example/data/repositories/user_repository_impl_test.dart
void main() {
  group('UserRepositoryImpl', () {
    test('mengembalikan entitas User ketika fetch berhasil', () async {
      final mockDataSource = MockUserRemoteDataSource();
      when(() => mockDataSource.fetchUser('1'))
          .thenAnswer((_) async => testUserModel);

      final repo = UserRepositoryImpl(remoteDataSource: mockDataSource);
      final result = await repo.getUserById('1');

      expect(result.isRight(), true);
      result.fold(
        (l) => fail('Diharapkan Right'),
        (r) => expect(r, testUser),
      );
    });
  });
}
```

## Insight Penting

- **Pembalikan dependensi** adalah disiplin inti — kode domain tidak boleh mengimpor dari data atau Flutter. Ini membuat logika bisnis portabel dan dapat diuji tanpa emulator atau mock HTTP.
- **Organisasi berbasis fitur** berskala dengan baik karena setiap fitur mandiri. Anggota tim baru dapat mengerjakan fitur terpisah tanpa konflik merge di `lib/`.
- **Menggunakan freezed + union tersegel** untuk `Result<T>` menghilangkan jebakan null-safety dan memaksa penanganan error eksplisit di setiap titik panggilan.
- **Override provider Riverpod** membuat widget testing menjadi mudah — suntikkan use case mock tanpa memodifikasi kode produksi.
- **Hindari rekayasa berlebihan**: mulailah dengan lapisan domain + presentasi untuk layar sederhana. Tambahkan lapisan data dan abstraksi repositori hanya saat Anda membutuhkan beberapa sumber data atau ingin mengganti implementasi.

## Langkah Berikutnya

1. Jalankan `dart run build_runner build --delete-conflicting-outputs` untuk menghasilkan kode freezed dan Riverpod.
2. Tambahkan `flutter_lints` atau `very_good_analysis` untuk menegakkan aturan impor Clean Architecture.
3. Jelajahi **BLoC** sebagai alternatif lapisan manajemen state — BLoC menggunakan stream sebagai pengganti provider dan cocok untuk fitur yang sarat event.
4. Baca [panduan arsitektur Flutter resmi](https://docs.flutter.dev/app-architecture) untuk rekomendasi terbaru dari Google.
5. Siapkan `mocktail` untuk contract testing jika lapisan data Anda melibatkan banyak interaksi API.

## Kesimpulan

Clean Architecture di Flutter, jika dikombinasikan dengan Riverpod untuk manajemen state dan freezed untuk model imutabel, menyediakan fondasi yang kokoh untuk aplikasi produksi. Pemisahan tiga lapisan mengisolasi logika bisnis dari masalah kerangka kerja, memungkinkan pengujian komprehensif, refaktorisasi yang mudah, dan kolaborasi yang lancar antar tim. Dengan mengikuti struktur folder, pola repositori, dan praktik injeksi dependensi yang diuraikan di sini, Anda dapat membangun aplikasi Flutter yang tetap terpelihara saat berkembang dari satu fitur hingga puluhan fitur.

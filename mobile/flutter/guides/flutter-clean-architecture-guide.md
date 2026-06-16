---
title: "Flutter Clean Architecture Guide"
description: "A comprehensive guide to implementing Clean Architecture in Flutter applications, covering folder structure, state management, dependency injection, and testing strategies."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Flutter Clean Architecture Guide

## Introduction

Clean Architecture, popularized by Robert C. Martin, is a software design philosophy that separates code into distinct layers with strict dependency rules. In Flutter, this architecture helps teams build testable, maintainable, and scalable applications by isolating business logic from UI frameworks and external dependencies.

This guide covers practical Clean Architecture patterns for Flutter, including folder organization, state management with Riverpod, dependency injection, error handling, and testing at every layer. You will learn how to structure a production-ready Flutter project that scales across teams and features.

## Best Practices

### 1. Three-Layer Architecture with Strict Dependency Rule

Organize your code into three core layers — **data**, **domain**, and **presentation** — where dependencies point inward: presentation depends on domain, data depends on domain, and domain depends on nothing external.

- **Domain layer** (innermost): Contains entities, use cases, and repository interfaces. No Flutter, no third-party packages — pure Dart only.
- **Data layer**: Implements repository contracts from domain. Handles API calls, local databases, and data sources.
- **Presentation layer**: Contains UI widgets and state management controllers. Depends on domain via use cases or repository abstractions.

### 2. Repository Pattern for Data Access

Abstract data access behind repository interfaces defined in the domain layer. This lets you swap implementations (REST API → local cache → mock) without touching business logic.

- Define a `Repository` abstract class in domain.
- Implement it in the data layer using `RepositoryImpl`.
- Inject the implementation at app startup via a dependency injection container.

### 3. Use Cases for Single Responsibility

Each use case (interactor) encapsulates one business operation. This keeps classes small, testable, and reusable across different screens.

- A use case takes a repository as a dependency and exposes a single method like `call()` or `execute()`.
- Complex flows combine multiple use cases through composition, not inheritance.

### 4. State Management with Riverpod

Use Riverpod as the state management layer that bridges presentation and domain. Providers are the glue that wire use cases into the widget tree.

- `FutureProvider` / `StreamProvider` for async data from use cases.
- `StateNotifierProvider` or `NotifierProvider` for mutable state that combines multiple use cases.
- Provider overrides in tests allow dependency injection with mock values.

### 5. Immutable Value Objects and Freezed

Use the `freezed` package for immutable data classes with copy-with support, union types for sealed result classes, and automatic `==` / `hashCode` generation.

- Define entities and models as `@freezed` classes.
- Use sealed unions for `Result<T>` types: `Success<T>` and `Failure<T>`.

### 6. Dependency Injection via Constructor

Prefer constructor injection over service locators. Pass dependencies explicitly through the widget tree using Riverpod providers or a lightweight DI container.

- Use Riverpod's `ref.watch` / `ref.read` to access providers.
- Avoid global singletons — they make testing and refactoring harder.

### 7. Testing at Every Layer

Write unit tests for domain (use cases, entities), data (repositories, data sources), and presentation (providers, widget tests). Use mocks for external dependencies.

- **Domain**: Pure unit tests — no mocks needed for entities.
- **Data**: Mock HTTP clients and database connectors.
- **Presentation**: Override Riverpod providers with mock implementations.

## Implementation Steps

### Step 1: Define the Project Folder Structure

Start with a feature-based layout inside `lib/`:

```text
lib/
├── app/
│   ├── app.dart                  # MaterialApp + router setup
│   └── app_router.dart           # GoRouter or Navigator 2.0 config
├── core/
│   ├── error/
│   │   └── failures.dart         # Failure sealed class
│   ├── network/
│   │   └── network_info.dart     # Connectivity abstraction
│   └── usecase/
│       └── usecase.dart          # Base UseCase abstract class
├── features/
│   └── <feature_name>/
│       ├── data/
│       │   ├── datasources/
│       │   │   ├── <name>_remote_data_source.dart
│       │   │   └── <name>_local_data_source.dart
│       │   ├── models/
│       │   │   └── <name>_model.dart
│       │   └── repositories/
│       │       └── <name>_repository_impl.dart
│       ├── domain/
│       │   ├── entities/
│       │   │   └── <name>.dart
│       │   ├── repositories/
│       │   │   └── <name>_repository.dart   # Abstract contract
│       │   └── usecases/
│       │       └── get_<name>.dart
│       └── presentation/
│           ├── providers/
│           │   └── <name>_provider.dart
│           ├── pages/
│           │   └── <name>_page.dart
│           └── widgets/
│               └── <name>_widget.dart
├── main.dart                    # Entry point with ProviderScope
└── providers.dart               # Top-level provider declarations
```

### Step 2: Set Up Dependencies

Add the following to `pubspec.yaml`:

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
  get_it: ^7.7.0         # Optional — Riverpod often replaces this
  dartz: ^0.10.1         # Either type for functional error handling

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

### Step 3: Create the Domain Layer

Define an entity, a repository contract, and a use case.

**Entity** — pure Dart, no annotations:

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

**Repository contract** — abstract class:

```dart
// features/example/domain/repositories/user_repository.dart
abstract class UserRepository {
  Future<User> getUserById(String id);
}
```

**Use case** — single responsibility:

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

### Step 4: Implement the Data Layer

**Model** with JSON serialization:

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

  // Convert to domain entity
  const UserModel._();
  User toDomain() => User(id: id, name: name, email: email);
}
```

**Data source** — remote API call:

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

**Repository implementation** — maps data models to domain entities:

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

### Step 5: Wire Up the Presentation Layer

Create a Riverpod provider that calls the use case and exposes state to the UI:

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

Build the UI page:

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
      appBar: AppBar(title: const Text('User Profile')),
      body: userAsync.when(
        data: (user) => Column(
          children: [
            Text('Name: ${user.name}'),
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

### Step 6: Configure Dependency Injection

Declare top-level providers in a central file:

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

### Step 7: Write Tests

**Domain — use case test (pure Dart, no mocks needed)**:

```dart
// test/features/example/domain/usecases/get_user_test.dart
void main() {
  group('GetUser', () {
    test('returns user when repository succeeds', () async {
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

**Data — repository test with mocked data source**:

```dart
// test/features/example/data/repositories/user_repository_impl_test.dart
void main() {
  group('UserRepositoryImpl', () {
    test('returns User entity on successful fetch', () async {
      final mockDataSource = MockUserRemoteDataSource();
      when(() => mockDataSource.fetchUser('1'))
          .thenAnswer((_) async => testUserModel);

      final repo = UserRepositoryImpl(remoteDataSource: mockDataSource);
      final result = await repo.getUserById('1');

      expect(result.isRight(), true);
      result.fold(
        (l) => fail('Expected Right'),
        (r) => expect(r, testUser),
      );
    });
  });
}
```

## Key Insights

- **Dependency inversion** is the core discipline — domain code must never import from data or Flutter. This makes business logic portable and testable without emulators or HTTP mocks.
- **Feature-based organization** scales because each feature is self-contained. New team members can work on separate features without merge conflicts in `lib/`.
- **Using freezed + sealed unions** for `Result<T>` eliminates null-safety pitfalls and forces explicit error handling at every call site.
- **Riverpod provider overrides** make widget testing trivial — inject mock use cases without modifying any production code.
- **Avoid over-engineering**: start with domain + presentation layers for simple screens. Add the data and repository abstraction layers only when you need multiple data sources or want to swap implementations.

## Next Steps

1. Run `dart run build_runner build --delete-conflicting-outputs` to generate the freezed and Riverpod code.
2. Add `flutter_lints` or `very_good_analysis` to enforce Clean Architecture import rules.
3. Explore **BLoC** as an alternative state management layer — it uses streams instead of providers and works well for event-heavy features.
4. Read the [official Flutter architecture guide](https://docs.flutter.dev/app-architecture) for Google's evolving recommendations.
5. Set up `mocktail` for contract testing if your data layer involves multiple API interactions.

## Conclusion

Clean Architecture in Flutter, when combined with Riverpod for state management and freezed for immutable models, provides a robust foundation for production applications. The three-layer separation isolates business logic from framework concerns, enabling comprehensive testing, easy refactoring, and smooth collaboration across teams. By following the folder structure, repository pattern, and dependency injection practices outlined here, you can build Flutter applications that remain maintainable as they grow from a single feature to dozens.

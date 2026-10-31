---
title: "Cheat Sheet Riverpod Flutter"
description: "Referensi cepat Riverpod di Flutter — tipe provider, ref.watch versus ref.read, family, autoDispose, AsyncValue, code generation, dan override untuk test."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Riverpod Flutter

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Baca sekali, tanpa rebuild | `ref.read(p)` | Di dalam callback seperti `onPressed` |
| Berlangganan dan rebuild | `ref.watch(p)` | Di dalam `build()`; rebuild saat berubah |
| Reaksi tanpa rebuild | `ref.listen(p, (prev, next) {})` | Snackbar, navigasi, dialog |
| Paksa hitung ulang | `ref.invalidate(p)` | Buang cache; dihitung lagi saat dibaca |
| Hitung ulang dan tunggu | `await ref.refresh(p.future)` | Invalidasi sekaligus baca ulang |
| Provider berparameter | `p.family<T, Arg>((ref, arg) => ...)` | Satu instance per argumen berbeda |
| Buang saat tak terpakai | `p.autoDispose` | State dilepas ketika listener terakhir pergi |
| State yang bisa diubah | `NotifierProvider<N, T>` | `Notifier<T>` dengan `build()` dan method |
| State asinkron | `AsyncNotifierProvider<N, T>` | `AsyncNotifier<T>` dengan `Future<T> build()` |
| Aliran nilai | `StreamProvider<T>` | Rebuild pada setiap event yang dipancarkan |
| Loading/error/data | `AsyncValue<T>` | `when`, `maybeWhen`, `valueOrNull` |
| Provider hasil generate | `@riverpod` + `build_runner` | Provider type-safe tanpa generik manual |
| Pertahankan dengan codegen | `@Riverpod(keepAlive: true)` | Menonaktifkan pembuangan otomatis |
| Tukar saat test | `overrides: [p.overrideWithValue(v)]` | Mengganti provider di `ProviderScope` |

## Perintah Umum

### Penyiapan dan Code Generation

```bash
# Paket inti (wajib untuk provider manual maupun hasil generate)
flutter pub add flutter_riverpod

# Rangkaian code generation (opsional, disarankan untuk kode baru)
flutter pub add dev:riverpod_generator dev:build_runner dev:custom_lint dev:riverpod_lint
flutter pub add riverpod_annotation

# Build sekali; flag ini membersihkan file hasil generate yang basi
dart run build_runner build --delete-conflicting-outputs

# Generate ulang saat menyimpan, lalu jalankan test dan aturan lint
dart run build_runner watch -d
flutter test
dart run custom_lint
```

## Potongan Kode

### Provider Manual: Sinkron, Asinkron, dan Notifier

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Nilai turunan: hanya dihitung ulang saat dependensinya berubah
final totalProvider = Provider<double>((ref) {
  final items = ref.watch(cartProvider);
  return items.fold(0, (sum, item) => sum + item.price * item.quantity);
});

// Baca asinkron, di-cache per argumen, dengan penerjemahan error
final userProvider = FutureProvider.family<User, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  try {
    return await api.fetchUser(id);
  } on ApiException catch (error) {
    throw UserLoadException('Gagal memuat pengguna $id', error);
  }
});

// State yang bisa diubah, dimiliki oleh Notifier
class CartNotifier extends Notifier<List<CartItem>> {
  @override
  List<CartItem> build() => const [];

  void add(CartItem item) => state = [...state, item];
}

final cartProvider =
    NotifierProvider<CartNotifier, List<CartItem>>(CartNotifier.new);
```

### Watch, Read, dan Listen di Widget

```dart
class CartBadge extends ConsumerWidget {
  const CartBadge({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final total = ref.watch(totalProvider);

    // Efek samping hanya di listen, jangan pernah di build
    ref.listen<int>(cartCountProvider, (previous, next) {
      if (next > (previous ?? 0)) showAddedSnackBar(context);
    });
    return Text('\$${total.toStringAsFixed(2)}');
  }
}

// Callback memakai read agar widget tidak ikut rebuild
onPressed: () => ref.read(cartProvider.notifier).add(item),
```

### Menangani Status AsyncValue

```dart
final userAsync = ref.watch(userProvider(userId));

return userAsync.when(
  data: (user) => UserProfile(user: user),
  loading: () => const Center(child: CircularProgressIndicator()),
  error: (error, stackTrace) => ErrorPanel(
    message: error is UserLoadException ? error.message : 'Terjadi kesalahan',
    onRetry: () => ref.invalidate(userProvider(userId)),
  ),
);
```

### autoDispose dan Code Generation

```dart
// autoDispose membebaskan state per layar saat navigasi; urutannya penting
final productProvider =
    FutureProvider.autoDispose.family<Product, String>((ref, id) async {
  return ref.watch(apiClientProvider).fetchProduct(id);
});
```

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'counter.g.dart';

// Menghasilkan counterProvider; tambahkan keepAlive: true agar tidak dibuang
@riverpod
class Counter extends _$Counter {
  @override
  int build() => 0;

  void increment() => state++;
}
```

### Testing dengan Override

```dart
// Widget test: ganti provider jaringan dengan implementasi fake
testWidgets('menampilkan nama pengguna', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        apiClientProvider.overrideWithValue(FakeApiClient()),
        userProvider('42').overrideWith((ref) async => const User(name: 'Ada')),
      ],
      child: const MaterialApp(home: ProfileScreen(userId: '42')),
    ),
  );

  await tester.pumpAndSettle();
  expect(find.text('Ada'), findsOneWidget);
});

// Unit test tanpa widget: ProviderContainer().read(totalProvider)
```

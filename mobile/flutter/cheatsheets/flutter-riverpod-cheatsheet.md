---
title: "Flutter Riverpod Cheatsheet"
description: "Quick reference for Riverpod in Flutter — provider types, ref.watch versus ref.read, families, autoDispose, AsyncValue, code generation, and test overrides."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Flutter Riverpod Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Read once, no rebuild | `ref.read(p)` | Inside callbacks such as `onPressed` |
| Subscribe and rebuild | `ref.watch(p)` | Inside `build()`; rebuilds on change |
| React without rebuilding | `ref.listen(p, (prev, next) {})` | Snackbars, navigation, dialogs |
| Force recompute | `ref.invalidate(p)` | Drops cache; recomputes on next read |
| Recompute and await | `await ref.refresh(p.future)` | Invalidate plus immediate re-read |
| Parameterized provider | `p.family<T, Arg>((ref, arg) => ...)` | One instance per distinct argument |
| Dispose when unused | `p.autoDispose` | Frees state when the last listener leaves |
| Mutable state | `NotifierProvider<N, T>` | `Notifier<T>` with `build()` plus methods |
| Async state | `AsyncNotifierProvider<N, T>` | `AsyncNotifier<T>` with `Future<T> build()` |
| Stream of values | `StreamProvider<T>` | Rebuilds on every emitted event |
| Loading/error/data | `AsyncValue<T>` | `when`, `maybeWhen`, `valueOrNull` |
| Generated provider | `@riverpod` + `build_runner` | Type-safe provider without manual generics |
| Keep alive with codegen | `@Riverpod(keepAlive: true)` | Opts out of automatic disposal |
| Test-time swap | `overrides: [p.overrideWithValue(v)]` | Replace a provider in `ProviderScope` |

## Common Commands

### Setup and Code Generation

```bash
# Core package (required for manual and generated providers)
flutter pub add flutter_riverpod

# Code generation toolchain (optional, recommended for new code)
flutter pub add dev:riverpod_generator dev:build_runner dev:custom_lint dev:riverpod_lint
flutter pub add riverpod_annotation

# One-off build; the flag removes stale generated files
dart run build_runner build --delete-conflicting-outputs

# Regenerate on save, then run the suites and lint rules
dart run build_runner watch -d
flutter test
dart run custom_lint
```

## Code Snippets

### Manual Providers: Sync, Async, and Notifier

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Derived value: recomputes only when its dependencies change
final totalProvider = Provider<double>((ref) {
  final items = ref.watch(cartProvider);
  return items.fold(0, (sum, item) => sum + item.price * item.quantity);
});

// Async read, cached per argument, with error translation
final userProvider = FutureProvider.family<User, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  try {
    return await api.fetchUser(id);
  } on ApiException catch (error) {
    throw UserLoadException('Failed to load user $id', error);
  }
});

// Mutable state owned by a Notifier
class CartNotifier extends Notifier<List<CartItem>> {
  @override
  List<CartItem> build() => const [];

  void add(CartItem item) => state = [...state, item];
}

final cartProvider =
    NotifierProvider<CartNotifier, List<CartItem>>(CartNotifier.new);
```

### Watch, Read, and Listen in a Widget

```dart
class CartBadge extends ConsumerWidget {
  const CartBadge({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final total = ref.watch(totalProvider);

    // Side effects belong in listen, never in build
    ref.listen<int>(cartCountProvider, (previous, next) {
      if (next > (previous ?? 0)) showAddedSnackBar(context);
    });
    return Text('\$${total.toStringAsFixed(2)}');
  }
}

// Callbacks use read so the widget does not rebuild
onPressed: () => ref.read(cartProvider.notifier).add(item),
```

### Handling AsyncValue States

```dart
final userAsync = ref.watch(userProvider(userId));

return userAsync.when(
  data: (user) => UserProfile(user: user),
  loading: () => const Center(child: CircularProgressIndicator()),
  error: (error, stackTrace) => ErrorPanel(
    message: error is UserLoadException ? error.message : 'Unexpected error',
    onRetry: () => ref.invalidate(userProvider(userId)),
  ),
);
```

### autoDispose and Code Generation

```dart
// autoDispose frees per-screen state on navigation; order matters
final productProvider =
    FutureProvider.autoDispose.family<Product, String>((ref, id) async {
  return ref.watch(apiClientProvider).fetchProduct(id);
});
```

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'counter.g.dart';

// Generates counterProvider; add keepAlive: true to opt out of disposal
@riverpod
class Counter extends _$Counter {
  @override
  int build() => 0;

  void increment() => state++;
}
```

### Testing with Overrides

```dart
// Widget test: swap the network provider for a fake
testWidgets('renders the user name', (tester) async {
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

// Unit test without widgets: ProviderContainer().read(totalProvider)
```

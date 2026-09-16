---
title: "Flutter State Management Cheatsheet"
description: "A quick reference guide for Flutter state management — setState, ValueNotifier, InheritedWidget, Provider, Riverpod, Bloc, and GetX with comparison tables, setup commands, and ready-to-use snippets."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Flutter State Management Cheatsheet

## Quick Reference Table

| Approach | Key API / Package | Best For |
|----------|-------------------|----------|
| setState | `StatefulWidget` + `setState()` | Local widget state, small UI toggles |
| ValueNotifier | `ValueNotifier` + `ValueListenableBuilder` | A single reactive field with minimal boilerplate |
| InheritedWidget | `InheritedWidget` + `InheritedModel` | Sharing read-only config down the tree |
| Provider | `provider` + `ChangeNotifier` | Balanced default for small to medium apps |
| Riverpod | `flutter_riverpod`, `Notifier` / `AsyncNotifier` | Compile-safe, testable, scalable applications |
| Bloc | `flutter_bloc`, `Bloc` / `Cubit` | Complex domain logic with a strict event-to-state flow |
| GetX | `get`, `GetxController` | Rapid MVVM development with an all-in-one toolbox |

### Choosing an Approach

- Local UI state that only one widget needs → `setState` or `ValueNotifier`
- Immutable config or theme data for the whole tree → `InheritedWidget`
- App-wide state with a familiar, low-friction API → `Provider` + `ChangeNotifier`
- Large or fast-growing apps that need strong typing and testability → `Riverpod`
- Teams that want strict architecture discipline → `Bloc`
- MVVM-style rapid prototyping with routing and DI included → `GetX`

## Common Commands

### Adding Dependencies

```bash
# Provider (ChangeNotifier based)
flutter pub add provider

# Riverpod (code generation is optional, needed only for advanced providers)
flutter pub add flutter_riverpod
flutter pub add riverpod_annotation dev:riverpod_generator dev:build_runner dev:custom_lint dev:riverpod_lint

# Bloc
flutter pub add flutter_bloc

# GetX
flutter pub add get
```

### Running Code Generation for Riverpod

```bash
# Generate provider classes from annotations once
dart run build_runner build --delete-conflicting-outputs

# Regenerate automatically while developing
dart run build_runner watch
```

### Debugging State

```bash
# Run the app with the Flutter inspector attached
flutter run

# Track rebuilds in DevTools
# DevTools > Timeline > track widget rebuilds

# Hot restart (Shift+R) re-runs initState and resets widget state;
# hot reload (R) keeps state — use restart when state misbehaves

# Run tests that assert on state transitions
flutter test
```

## Code Snippets

### Counter with setState

```dart
class CounterPage extends StatefulWidget {
  const CounterPage({super.key});

  @override
  State<CounterPage> createState() => _CounterPageState();
}

class _CounterPageState extends State<CounterPage> {
  int _count = 0;

  void _increment() {
    setState(() => _count++);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('$_count'),
            FilledButton(onPressed: _increment, child: const Text('Add')),
          ],
        ),
      ),
    );
  }
}
```

### Single Reactive Field with ValueNotifier

```dart
// Keep the notifier in the widget (or a plain class) and pass it in
final ValueNotifier<int> _count = ValueNotifier<int>(0);

// In build() — the builder only rebuilds when the value changes
ValueListenableBuilder<int>(
  valueListenable: _count,
  builder: (context, value, child) {
    return Text('$value');
  },
);

// Mutate from anywhere the notifier is reachable
_count.value++;
```

### App-Wide Counter with Provider and ChangeNotifier

```dart
class CounterModel extends ChangeNotifier {
  int _count = 0;
  int get count => _count;

  void increment() {
    _count++;
    notifyListeners();
  }
}
```

```dart
// Provide the model at the top of the tree
ChangeNotifierProvider(
  create: (_) => CounterModel(),
  child: const MyApp(),
);
```

```dart
// Consume: context.watch rebuilds on change, context.read does not
final count = context.watch<CounterModel>().count;
context.read<CounterModel>().increment();
```

### Compile-Safe Counter with Riverpod

```dart
// 1. Define a Notifier that owns the state and its mutations
class CounterNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void increment() => state++;
}

// 2. Declare the provider at the top level — no BuildContext required
final counterProvider = NotifierProvider<CounterNotifier, int>(
  CounterNotifier.new,
);

// 3. Watch from any ConsumerWidget
class CounterView extends ConsumerWidget {
  const CounterView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('$count'),
        FilledButton(
          onPressed: () => ref.read(counterProvider.notifier).increment(),
          child: const Text('Add'),
        ),
      ],
    );
  }
}
```

### Event-Driven Counter with Bloc (Cubit)

```dart
// 1. A Cubit exposes methods that emit new states
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);

  void increment() => emit(state + 1);
}

// 2. Provide it above the widgets that consume it
BlocProvider(
  create: (_) => CounterCubit(),
  child: const CounterApp(),
);

// 3. Consume with BlocBuilder, trigger events with context.read
BlocBuilder<CounterCubit, int>(
  builder: (context, count) => Text('$count'),
);
context.read<CounterCubit>().increment();
```

### Rapid MVVM Counter with GetX

```dart
// 1. Controller extends GetxController; state is observable
class CounterController extends GetxController {
  final count = 0.obs;

  void increment() => count.value++;
}

// 2. Put the controller into the tree
final c = Get.put(CounterController());

// 3. Observe with Obx — rebuilds only the widget inside
Obx(() => Text('${c.count.value}'));

// 4. Mutate from anywhere without BuildContext
Get.find<CounterController>().increment();
```

### Choosing a Strategy at a Glance

```text
setState          → state that only the widget itself needs
ValueNotifier     → a single field that changes often, no model class
InheritedWidget   → config/theme-style data, read-only for descendants
Provider          → app-wide state in small/medium apps, familiar API
Riverpod          → large apps, compile-safe providers, easy testing
Bloc              → strict event/state discipline, larger teams
GetX              → MVVM-style rapid development, all-in-one toolkit
```

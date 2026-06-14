---
title: "State Management with Provider in Flutter"
description: "A comprehensive tutorial on managing application state in Flutter using the Provider package, covering ChangeNotifier, Consumer, and MultiProvider patterns."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# State Management with Provider in Flutter

## Summary

This tutorial explores how to manage application state in Flutter using the **Provider** package. You will learn how to set up Provider in a Flutter project, create observable models with `ChangeNotifier`, consume state changes with `Consumer` and `context.watch`, and compose multiple providers using `MultiProvider`. By the end, you will have a working counter and a to-do list app demonstrating real-world state management.

## Target Audience

- Mobile developers with basic Flutter widget knowledge.
- Expected developer level: **Intermediate** (familiar with Dart and Flutter's widget tree).

## Prerequisites

- Flutter SDK installed (version 3.0 or later).
- A code editor (VS Code or Android Studio) with Flutter extensions.
- Basic understanding of Dart classes and Flutter's `StatefulWidget` lifecycle.
- Familiarity with `pubspec.yaml` dependency management.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Install and configure the `provider` package in a Flutter project.
- Create a model class that extends `ChangeNotifier`.
- Expose state changes using `ChangeNotifierProvider` at the widget-tree level.
- Consume state with `Consumer`, `context.watch`, and `context.read`.
- Compose multiple providers with `MultiProvider` for scalable architecture.
- Decide when to use Provider vs. other state management solutions.

## Context and Motivation

As Flutter applications grow, passing callbacks and data down the widget tree becomes cumbersome and error-prone — a problem known as **prop drilling**. State management libraries solve this by providing a centralised mechanism to share data across distant widgets without tightly coupling them.

The `provider` package, endorsed by the Flutter team, is the recommended starting point for most apps because it is simple, testable, and integrates naturally with `InheritedWidget`. Understanding Provider builds a solid foundation for later exploring Riverpod, BLoC, or Redux when your needs outgrow Provider's scope.

## Core Content

### What is Provider?

Provider is a lightweight wrapper around Flutter's `InheritedWidget` that makes state available anywhere in the widget tree. Instead of threading data through constructors, you "provide" a value at the top of the tree and "consume" it wherever needed.

### The ChangeNotifier Model

`ChangeNotifier` is a class from the `flutter/foundation.dart` library. It can notify listeners when its internal state changes. You create a subclass that holds your business logic and call `notifyListeners()` whenever a property changes.

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

### Providing State

Wrap the part of the widget tree that needs access with `ChangeNotifierProvider<CounterModel>`. The `create` callback instantiates the model once; Provider handles disposal automatically.

```dart
ChangeNotifierProvider<CounterModel>(
  create: (_) => CounterModel(),
  child: MyApp(),
);
```

### Consuming State

There are three common ways to consume provided state:

1. **`Consumer<CounterModel>`** — rebuilds its child whenever the model changes. Best for small widgets that should only update when the specific model changes.

2. **`context.watch<CounterModel>()`** — rebuilds the entire widget when the model changes. Use in build methods when the whole widget depends on the value.

3. **`context.read<CounterModel>()`** — reads the value without subscribing to changes. Use in callbacks (e.g., button `onPressed`).

```dart
// Consumer — only rebuilds this Text widget
Consumer<CounterModel>(
  builder: (context, counter, child) => Text('${counter.count}'),
);

// context.read — no rebuild, just call a method
ElevatedButton(
  onPressed: () => context.read<CounterModel>().increment(),
  child: Icon(Icons.add),
);
```

### MultiProvider

When your app needs multiple state objects, wrap the tree with `MultiProvider` to keep the code flat and readable.

```dart
MultiProvider(
  providers: [
    ChangeNotifierProvider(create: (_) => CounterModel()),
    ChangeNotifierProvider(create: (_) => TodoListModel()),
  ],
  child: MyApp(),
);
```

## Code Examples

### Complete Counter App

Create a new Flutter project and replace `lib/main.dart` with the code below.

**Step 1 — Add the dependency to `pubspec.yaml`:**

```yaml
dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.2
```

**Step 2 — Define the counter model (`counter_model.dart`):**

```dart
import 'package:flutter/foundation.dart';

class CounterModel extends ChangeNotifier {
  int _count = 0;
  int get count => _count;

  void increment() {
    _count++;
    notifyListeners();
  }

  void reset() {
    _count = 0;
    notifyListeners();
  }
}
```

**Step 3 — Wire up Provider in `main.dart`:**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'counter_model.dart';

void main() {
  runApp(
    ChangeNotifierProvider<CounterModel>(
      create: (_) => CounterModel(),
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Provider Counter',
      home: CounterScreen(),
    );
  }
}

class CounterScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final count = context.watch<CounterModel>().count;
    return Scaffold(
      appBar: AppBar(title: const Text('Provider Counter')),
      body: Center(
        child: Text(
          '$count',
          style: const TextStyle(fontSize: 48),
        ),
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton(
            onPressed: () => context.read<CounterModel>().increment(),
            child: const Icon(Icons.add),
          ),
          const SizedBox(height: 8),
          FloatingActionButton.small(
            onPressed: () => context.read<CounterModel>().reset(),
            child: const Icon(Icons.refresh),
          ),
        ],
      ),
    );
  }
}
```

### Todo List with MultiProvider

Extend the app with a separate to-do model and combine them with `MultiProvider`.

**`todo_model.dart`:**

```dart
import 'package:flutter/foundation.dart';

class Todo {
  final String title;
  final bool completed;
  Todo({required this.title, this.completed = false});
}

class TodoListModel extends ChangeNotifier {
  final List<Todo> _todos = [];

  List<Todo> get todos => List.unmodifiable(_todos);

  void addTodo(String title) {
    _todos.add(Todo(title: title));
    notifyListeners();
  }

  void toggleTodo(int index) {
    final todo = _todos[index];
    _todos[index] = Todo(title: todo.title, completed: !todo.completed);
    notifyListeners();
  }
}
```

Update `main()` to use `MultiProvider`:

```dart
void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => CounterModel()),
        ChangeNotifierProvider(create: (_) => TodoListModel()),
      ],
      child: const MyApp(),
    ),
  );
}
```

## Key Insights

- **Provider is not a state-management library on its own** — it is a DI (dependency injection) wrapper. The actual state logic lives in your `ChangeNotifier` (or other notifier) classes. Keep them clean and focused on business logic.
- **Never call `notifyListeners()` inside the constructor** — it triggers a rebuild before the widget tree is ready, causing a runtime error.
- **Use `context.read` for event handlers** and **`context.watch` / `Consumer` for UI output**. Mixing them up causes unnecessary rebuilds or stale UI.
- **Avoid deep nesting of single providers** — use `MultiProvider` from the start. It is trivial to add later but painful to refactor after dozens of widgets depend on it.
- **Provider is sufficient for small-to-medium apps.** If you find yourself building complex dependency graphs or need fine-grained rebuild control, consider upgrading to Riverpod or BLoC.

## Next Steps

- Learn about **Riverpod** — a compile-safe, testable evolution of Provider.
- Explore **BLoC (Business Logic Component)** for event-driven state management.
- Read the official [Provider documentation](https://pub.dev/packages/provider).
- Build a full Flutter syllabus to structure a learning path.

## Conclusion

You have learned how to integrate the Provider package into a Flutter project, create observable models with `ChangeNotifier`, consume state using `Consumer`, `context.watch`, and `context.read`, and compose multiple models with `MultiProvider`. This pattern keeps your widget tree clean, your business logic testable, and your app ready to scale.

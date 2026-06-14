---
title: "Manajemen State dengan Provider di Flutter"
description: "Tutorial komprehensif tentang mengelola state aplikasi di Flutter menggunakan paket Provider, mencakup ChangeNotifier, Consumer, dan pola MultiProvider."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Manajemen State dengan Provider di Flutter

## Ringkasan

Tutorial ini mengeksplorasi cara mengelola state aplikasi di Flutter menggunakan paket **Provider**. Anda akan mempelajari cara mengatur Provider di proyek Flutter, membuat model yang dapat diamati dengan `ChangeNotifier`, mengonsumsi perubahan state dengan `Consumer` dan `context.watch`, serta menggabungkan beberapa provider menggunakan `MultiProvider`. Di akhir sesi, Anda akan memiliki aplikasi penghitung dan daftar tugas (to-do list) yang menunjukkan manajemen state di dunia nyata.

## Target Audiens

- Pengembang mobile dengan pengetahuan dasar widget Flutter.
- Ekspektasi tingkat kemampuan: **Menengah** (familiar dengan Dart dan widget tree Flutter).

## Prasyarat

- Flutter SDK terinstal (versi 3.0 atau lebih baru).
- Editor kode (VS Code atau Android Studio) dengan ekstensi Flutter.
- Pemahaman dasar tentang kelas Dart dan siklus hidup `StatefulWidget` Flutter.
- Familiar dengan manajemen dependensi `pubspec.yaml`.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Memasang dan mengonfigurasi paket `provider` di proyek Flutter.
- Membuat kelas model yang memperluas `ChangeNotifier`.
- Mengekspos perubahan state menggunakan `ChangeNotifierProvider` di tingkat widget tree.
- Mengonsumsi state dengan `Consumer`, `context.watch`, dan `context.read`.
- Menggabungkan banyak provider dengan `MultiProvider` untuk arsitektur yang skalabel.
- Menentukan kapan harus menggunakan Provider dibandingkan solusi manajemen state lainnya.

## Konteks dan Motivasi

Seiring pertumbuhan aplikasi Flutter, mengoper callback dan data ke bawah widget tree menjadi rumit dan rawan kesalahan — masalah yang dikenal sebagai **prop drilling**. Library manajemen state menyelesaikan ini dengan menyediakan mekanisme terpusat untuk berbagi data antar widget yang berjauhan tanpa mengikatnya secara kaku.

Paket `provider`, yang direkomendasikan oleh tim Flutter, adalah titik awal yang ideal untuk sebagian besar aplikasi karena sederhana, dapat diuji, dan terintegrasi secara alami dengan `InheritedWidget`. Memahami Provider membangun fondasi yang kokoh untuk nantinya menjelajahi Riverpod, BLoC, atau Redux ketika kebutuhan Anda melampaui cakupan Provider.

## Konten Inti

### Apa itu Provider?

Provider adalah pembungkus ringan di atas `InheritedWidget` milik Flutter yang membuat state tersedia di mana saja dalam widget tree. Alih-alih mengoper data melalui konstruktor, Anda "menyediakan" nilai di puncak tree dan "mengonsumsinya" di mana pun diperlukan.

### Model ChangeNotifier

`ChangeNotifier` adalah kelas dari library `flutter/foundation.dart`. Kelas ini dapat memberi tahu pendengar (listeners) ketika state internalnya berubah. Anda membuat subkelas yang menampung logika bisnis Anda dan memanggil `notifyListeners()` setiap kali properti berubah.

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

### Menyediakan State (Providing)

Bungkus bagian widget tree yang membutuhkan akses dengan `ChangeNotifierProvider<CounterModel>`. Callback `create` menginstansiasi model satu kali; Provider menangani pembuangan (disposal) secara otomatis.

```dart
ChangeNotifierProvider<CounterModel>(
  create: (_) => CounterModel(),
  child: MyApp(),
);
```

### Mengonsumsi State (Consuming)

Ada tiga cara umum untuk mengonsumsi state yang disediakan:

1. **`Consumer<CounterModel>`** — membangun ulang child-nya saat model berubah. Cocok untuk widget kecil yang hanya perlu diperbarui ketika model tertentu berubah.

2. **`context.watch<CounterModel>()`** — membangun ulang seluruh widget saat model berubah. Gunakan di metode build ketika seluruh widget bergantung pada nilai tersebut.

3. **`context.read<CounterModel>()`** — membaca nilai tanpa berlangganan perubahan. Gunakan di callback (misalnya, `onPressed` tombol).

```dart
// Consumer — hanya membangun ulang widget Text ini
Consumer<CounterModel>(
  builder: (context, counter, child) => Text('${counter.count}'),
);

// context.read — tanpa rebuild, cukup panggil method
ElevatedButton(
  onPressed: () => context.read<CounterModel>().increment(),
  child: Icon(Icons.add),
);
```

### MultiProvider

Ketika aplikasi Anda membutuhkan banyak objek state, bungkus tree dengan `MultiProvider` untuk menjaga kode tetap rapi dan mudah dibaca.

```dart
MultiProvider(
  providers: [
    ChangeNotifierProvider(create: (_) => CounterModel()),
    ChangeNotifierProvider(create: (_) => TodoListModel()),
  ],
  child: MyApp(),
);
```

## Contoh Kode

### Aplikasi Counter Lengkap

Buat proyek Flutter baru dan ganti `lib/main.dart` dengan kode di bawah ini.

**Langkah 1 — Tambahkan dependensi ke `pubspec.yaml`:**

```yaml
dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.2
```

**Langkah 2 — Definisikan model counter (`counter_model.dart`):**

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

**Langkah 3 — Pasang Provider di `main.dart`:**

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

### Daftar Tugas dengan MultiProvider

Perluas aplikasi dengan model to-do terpisah dan gabungkan dengan `MultiProvider`.

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

Perbarui `main()` untuk menggunakan `MultiProvider`:

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

## Insight Penting

- **Provider bukan library manajemen state itu sendiri** — ia adalah pembungkus DI (dependency injection). Logika state yang sebenarnya berada di kelas `ChangeNotifier` Anda. Jaga agar kelas-kelas tersebut tetap bersih dan fokus pada logika bisnis.
- **Jangan pernah memanggil `notifyListeners()` di dalam konstruktor** — ini memicu rebuild sebelum widget tree siap, menyebabkan runtime error.
- **Gunakan `context.read` untuk event handler** dan **`context.watch` / `Consumer` untuk output UI**. Mencampurkannya menyebabkan rebuild yang tidak perlu atau UI yang basi.
- **Hindari penumpukan provider tunggal yang dalam** — gunakan `MultiProvider` sejak awal. Menambahkannya nanti itu mudah, tetapi merefaktor setelah puluhan widget bergantung padanya sangat menyakitkan.
- **Provider cukup untuk aplikasi kecil hingga menengah.** Jika Anda mulai membutuhkan graf dependensi yang kompleks atau kontrol rebuild yang lebih terperinci, pertimbangkan untuk beralih ke Riverpod atau BLoC.

## Langkah Berikutnya

- Pelajari tentang **Riverpod** — evolusi Provider yang aman saat kompilasi dan mudah diuji.
- Jelajahi **BLoC (Business Logic Component)** untuk manajemen state berbasis event.
- Baca [dokumentasi Provider resmi](https://pub.dev/packages/provider).
- Bangun silabus Flutter lengkap untuk menyusun jalur pembelajaran.

## Kesimpulan

Anda telah mempelajari cara mengintegrasikan paket Provider ke dalam proyek Flutter, membuat model yang dapat diamati dengan `ChangeNotifier`, mengonsumsi state menggunakan `Consumer`, `context.watch`, dan `context.read`, serta menggabungkan banyak model dengan `MultiProvider`. Pola ini menjaga widget tree tetap bersih, logika bisnis Anda dapat diuji, dan aplikasi Anda siap untuk berkembang.

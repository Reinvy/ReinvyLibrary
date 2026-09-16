---
title: "Cheat Sheet Manajemen State Flutter"
description: "Panduan referensi cepat untuk manajemen state Flutter — setState, ValueNotifier, InheritedWidget, Provider, Riverpod, Bloc, dan GetX lengkap dengan tabel perbandingan, perintah setup, dan potongan kode siap pakai."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Manajemen State Flutter

## Tabel Referensi Cepat

| Pendekatan | API / Paket Kunci | Cocok untuk |
|------------|-------------------|-------------|
| setState | `StatefulWidget` + `setState()` | State lokal widget, toggle UI kecil |
| ValueNotifier | `ValueNotifier` + `ValueListenableBuilder` | Satu field reaktif dengan boilerplate minimal |
| InheritedWidget | `InheritedWidget` + `InheritedModel` | Membagikan konfigurasi read-only ke bawah pohon widget |
| Provider | `provider` + `ChangeNotifier` | Default seimbang untuk aplikasi kecil hingga menengah |
| Riverpod | `flutter_riverpod`, `Notifier` / `AsyncNotifier` | Aplikasi yang aman secara kompilasi, mudah diuji, dan skalabel |
| Bloc | `flutter_bloc`, `Bloc` / `Cubit` | Logika domain kompleks dengan alur event-ke-state yang ketat |
| GetX | `get`, `GetxController` | Pengembangan MVVM cepat dengan toolbox all-in-one |

### Memilih Pendekatan

- State UI lokal yang hanya dibutuhkan satu widget → `setState` atau `ValueNotifier`
- Konfigurasi atau tema yang bersifat immutable untuk seluruh pohon → `InheritedWidget`
- State lintas aplikasi dengan API familier dan minim gesekan → `Provider` + `ChangeNotifier`
- Aplikasi besar atau berkembang cepat yang butuh typing kuat dan mudah diuji → `Riverpod`
- Tim yang ingin disiplin arsitektur yang ketat → `Bloc`
- Prototyping cepat ala MVVM dengan routing dan DI sekaligus → `GetX`

## Perintah Umum

### Menambahkan Dependensi

```bash
# Provider (berbasis ChangeNotifier)
flutter pub add provider

# Riverpod (generasi kode opsional, hanya untuk provider tingkat lanjut)
flutter pub add flutter_riverpod
flutter pub add riverpod_annotation dev:riverpod_generator dev:build_runner dev:custom_lint dev:riverpod_lint

# Bloc
flutter pub add flutter_bloc

# GetX
flutter pub add get
```

### Menjalankan Generasi Kode untuk Riverpod

```bash
# Menghasilkan kelas provider dari anotasi satu kali
dart run build_runner build --delete-conflicting-outputs

# Membuat ulang secara otomatis selama pengembangan
dart run build_runner watch
```

### Debugging State

```bash
# Menjalankan aplikasi dengan Flutter inspector terpasang
flutter run

# Melacak rebuild di DevTools
# DevTools > Timeline > track widget rebuilds

# Hot restart (Shift+R) menjalankan ulang initState dan mereset state widget;
# hot reload (R) mempertahankan state — gunakan restart saat state bermasalah

# Menjalankan pengujian yang memverifikasi transisi state
flutter test
```

## Potongan Kode

### Counter dengan setState

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

### Satu Field Reaktif dengan ValueNotifier

```dart
// Simpan notifier di widget (atau kelas biasa) lalu kirimkan ke bawah
final ValueNotifier<int> _count = ValueNotifier<int>(0);

// Di dalam build() — builder hanya rebuild saat nilai berubah
ValueListenableBuilder<int>(
  valueListenable: _count,
  builder: (context, value, child) {
    return Text('$value');
  },
);

// Ubah dari mana saja selama notifier dapat diakses
_count.value++;
```

### Counter Lintas Aplikasi dengan Provider dan ChangeNotifier

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
// Berikan model di bagian atas pohon widget
ChangeNotifierProvider(
  create: (_) => CounterModel(),
  child: const MyApp(),
);
```

```dart
// Konsumsi: context.watch rebuild saat berubah, context.read tidak
final count = context.watch<CounterModel>().count;
context.read<CounterModel>().increment();
```

### Counter Aman Kompilasi dengan Riverpod

```dart
// 1. Definisi Notifier yang memiliki state beserta perubahannya
class CounterNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void increment() => state++;
}

// 2. Deklarasi provider di level atas — tanpa BuildContext
final counterProvider = NotifierProvider<CounterNotifier, int>(
  CounterNotifier.new,
);

// 3. Watch dari ConsumerWidget mana pun
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

### Counter Berbasis Event dengan Bloc (Cubit)

```dart
// 1. Cubit mengekspos metode yang mengeluarkan state baru
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);

  void increment() => emit(state + 1);
}

// 2. Berikan di atas widget yang mengonsumsinya
BlocProvider(
  create: (_) => CounterCubit(),
  child: const CounterApp(),
);

// 3. Konsumsi dengan BlocBuilder, picu event dengan context.read
BlocBuilder<CounterCubit, int>(
  builder: (context, count) => Text('$count'),
);
context.read<CounterCubit>().increment();
```

### Counter MVVM Cepat dengan GetX

```dart
// 1. Controller memperluas GetxController; state bersifat observable
class CounterController extends GetxController {
  final count = 0.obs;

  void increment() => count.value++;
}

// 2. Masukkan controller ke dalam pohon widget
final c = Get.put(CounterController());

// 3. Amati dengan Obx — hanya widget di dalamnya yang rebuild
Obx(() => Text('${c.count.value}'));

// 4. Ubah dari mana saja tanpa BuildContext
Get.find<CounterController>().increment();
```

### Memilih Strategi Sekilas

```text
setState          → state yang hanya dibutuhkan widget itu sendiri
ValueNotifier     → satu field yang sering berubah, tanpa kelas model
InheritedWidget   → data konfigurasi/tema, read-only untuk turunan
Provider          → state lintas aplikasi di aplikasi kecil/menengah
Riverpod          → aplikasi besar, provider aman kompilasi, mudah diuji
Bloc              → disiplin event/state yang ketat, tim lebih besar
GetX              → pengembangan cepat ala MVVM, toolkit all-in-one
```

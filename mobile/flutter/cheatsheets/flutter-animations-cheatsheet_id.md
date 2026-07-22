---
title: "Cheat Sheet Animasi dan Transisi Flutter"
description: "Panduan referensi cepat untuk API animasi Flutter — animasi implisit, animasi eksplisit, transisi, widget gerakan, dan teknik animasi."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Animasi dan Transisi Flutter

## Tabel Referensi Cepat

| Aksi | Widget / Kode | Deskripsi |
|------|---------------|-----------|
| Animasi properti container | `AnimatedContainer(duration: const Duration(milliseconds: 300), ...)` | Menganimasikan perubahan warna, ukuran, padding, border, dan lainnya secara implisit |
| Efek fade in/out | `AnimatedOpacity(opacity: _terlihat ? 1.0 : 0.0, duration: ..., child: ...)` | Menganimasikan perubahan opacity dengan efek fade halus |
| Ubah ukuran halus | `AnimatedSize(duration: ..., curve: Curves.easeInOut, child: ...)` | Menganimasikan perubahan ukuran child |
| Animasi posisi | `AnimatedPositioned(left: _x, top: _y, duration: ..., child: ...)` | Menganimasikan posisi child di dalam Stack |
| Animasi padding | `AnimatedPadding(padding: EdgeInsets.all(_pad), duration: ..., child: ...)` | Menganimasikan perubahan padding dengan halus |
| Cross-fade antar widget | `AnimatedCrossFade(firstChild: ..., secondChild: ..., crossFadeState: ..., duration: ...)` | Melakukan cross-fade antara dua widget |
| Animasi skala | `AnimatedScale(scale: _skala, duration: ..., child: ...)` | Menganimasikan perubahan skala (ukuran) |
| Animasi properti tema | `AnimatedTheme(data: ThemeData(...), duration: ..., child: ...)` | Menganimasikan perubahan tema |
| Transisi gaya teks | `AnimatedDefaultTextStyle(style: _style, duration: ..., child: Text(...))` | Menganimasikan perubahan style teks |
| Penukar dengan animasi | `AnimatedSwitcher(duration: ..., child: Widget(key: ValueKey(_kunci)))` | Transisi animasi saat menukar widget |
| Daftar insert/hapus | `AnimatedList(key: _listKey, itemBuilder: ...)` | Insert dan hapus item teranimasi dalam daftar |
| Navigasi halaman | `PageView(children: [...], pageController: _controller)` | Halaman yang bisa digeser dengan transisi animasi |
| Toggle antar widget | `AnimatedSwitcher(layoutBuilder: ..., transitionBuilder: ..., child: ...)` | Transisi kustom saat menukar child widget |

## Perintah Umum

### Setup Animation Controller

```dart
class _KeadaanWidget extends State<WidgetSaya> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animasi;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _animasi = Tween(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
    _controller.forward(); // atau .repeat() atau .animateTo(0.5)
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

### Jenis-Jenis Tween

```dart
Tween<double>(begin: 0.0, end: 100.0)
IntTween(begin: 0, end: 10)
ColorTween(begin: Colors.red, end: Colors.blue)
SizeTween(begin: Size(100, 100), end: Size(200, 200))
AlignmentTween(begin: Alignment.topLeft, end: Alignment.bottomRight)
BorderRadiusTween(begin: BorderRadius.circular(0), end: BorderRadius.circular(20))
RectTween(begin: Rect.fromLTWH(0, 0, 100, 100), end: Rect.fromLTWH(50, 50, 200, 200))
OffsetTween(begin: Offset.zero, end: Offset(100, 100))
```

### Referensi Kurva

```dart
Curves.linear            // Kecepatan konstan
Curves.easeIn            // Mulai lambat, akhir cepat
Curves.easeOut           // Mulai cepat, akhir lambat
Curves.easeInOut         // Mulai dan akhir lambat, tengah cepat
Curves.bounceIn          // Efek memantul di awal
Curves.bounceOut         // Efek memantul di akhir
Curves.elasticIn         // Overshoot elastis di awal
Curves.elasticOut        // Overshoot elastis di akhir
Curves.fastOutSlowIn     // Kurva material standar
Curves.decelerate        // Mulai cepat, melambat
Curves.easeInBack        // Sedikit overshoot di awal
Curves.easeOutBack       // Sedikit overshoot di akhir
```

### Pola Animasi Staggered

```dart
// Menjalankan beberapa animasi dengan jeda bertahap
final Interval _intervalPertama = const Interval(0.0, 0.5, curve: Curves.easeIn);
final Interval _intervalKedua = const Interval(0.3, 0.8, curve: Curves.easeOut);

Animation<double> _pertama = Tween(begin: 0.0, end: 1.0).animate(
  CurvedAnimation(parent: _controller, curve: _intervalPertama),
);
Animation<double> _kedua = Tween(begin: 0.0, end: 1.0).animate(
  CurvedAnimation(parent: _controller, curve: _intervalKedua),
);
```

## Potongan Kode

### Animasi Implisit (Tanpa Controller)

```dart
// Container yang menganimasikan warna, ukuran, dan bentuk
AnimatedContainer(
  duration: const Duration(milliseconds: 300),
  curve: Curves.easeInOut,
  width: _diperluas ? 200 : 100,
  height: _diperluas ? 200 : 100,
  color: _diperluas ? Colors.blue : Colors.red,
  decoration: BoxDecoration(
    borderRadius: BorderRadius.circular(_diperluas ? 100 : 10),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.2),
        blurRadius: _diperluas ? 20 : 5,
      ),
    ],
  ),
  child: const Center(child: Text('Tekan saya')),
)

// Fade widget masuk dan keluar
AnimatedOpacity(
  opacity: _terlihat ? 1.0 : 0.0,
  duration: const Duration(milliseconds: 500),
  child: const Text('Sekarang kamu melihat saya'),
)

// Animasi antar dua warna dengan gaya teks
AnimatedDefaultTextStyle(
  style: TextStyle(
    fontSize: _besar ? 32 : 16,
    color: _besar ? Colors.blue : Colors.grey,
    fontWeight: _tebal ? FontWeight.bold : FontWeight.normal,
  ),
  duration: const Duration(milliseconds: 400),
  child: const Text('Teks Bergaya'),
)

// Cross-fade antara dua widget yang berbeda
AnimatedCrossFade(
  duration: const Duration(milliseconds: 300),
  crossFadeState: _tampilPertama
      ? CrossFadeState.showFirst
      : CrossFadeState.showSecond,
  firstChild: const Icon(Icons.star, size: 64),
  secondChild: Column(
    mainAxisSize: MainAxisSize.min,
    children: const [
      Icon(Icons.favorite, size: 48, color: Colors.red),
      Text('Hati'),
    ],
  ),
)
```

### Animasi Eksplisit dengan AnimationController

```dart
class AnimasiMemantul extends StatefulWidget {
  const AnimasiMemantul({super.key});

  @override
  State<AnimasiMemantul> createState() => _KeadaanAnimasiMemantul();
}

class _KeadaanAnimasiMemantul extends State<AnimasiMemantul>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animasiPantul;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _animasiPantul = Tween(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.bounceOut),
    );
    _controller.repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animasiPantul,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, -_animasiPantul.value * 50),
          child: child,
        );
      },
      child: const FlutterLogo(size: 100),
    );
  }
}
```

### Animasi Hero (Transisi Halaman)

```dart
// Halaman sumber
GestureDetector(
  onTap: () {
    Navigator.push(context, MaterialPageRoute(
      builder: (context) => const HalamanDetail(),
    ));
  },
  child: Hero(
    tag: 'hero-image-${item.id}',
    child: Image.network(item.thumbnailUrl),
  ),
)

// Halaman tujuan
Hero(
  tag: 'hero-image-${item.id}',
  child: Image.network(item.fullResolutionUrl),
)
```

### AnimatedBuilder Tween Kustom

```dart
AnimatedBuilder(
  animation: _controller,
  builder: (context, child) {
    return Opacity(
      opacity: _animasi.value,
      child: Transform.rotate(
        angle: _animasi.value * 6.28, // Rotasi penuh (2π)
        child: Transform.scale(
          scale: _animasi.value,
          child: child,
        ),
      ),
    );
  },
  child: const FlutterLogo(size: 150),
)
```

### TweenAnimationBuilder (Mandiri)

```dart
// TweenAnimationBuilder — animasi tween mandiri tanpa controller
TweenAnimationBuilder<double>(
  tween: Tween(begin: 0.0, end: 1.0),
  duration: const Duration(milliseconds: 600),
  curve: Curves.easeOut,
  builder: (context, value, child) {
    return Opacity(
      opacity: value,
      child: Transform.translate(
        offset: Offset(0, 30 * (1 - value)),
        child: child,
      ),
    );
  },
  child: const Card(
    child: Padding(
      padding: EdgeInsets.all(24.0),
      child: Text('Kartu Geser dengan Fade-in'),
    ),
  ),
)
```

### Transisi Geser (Rute Kustom)

```dart
// Kustom transisi geser ke atas
Navigator.push(context, PageRouteBuilder(
  pageBuilder: (context, animation, secondaryAnimation) =>
      const HalamanBaruSaya(),
  transitionsBuilder: (context, animation, secondaryAnimation, child) {
    const mulai = Offset(0.0, 1.0);
    const akhir = Offset.zero;
    const kurva = Curves.easeInOut;

    var tween = Tween(begin: mulai, end: akhir)
        .chain(CurveTween(curve: kurva));
    var offsetAnimation = animation.drive(tween);

    return SlideTransition(
      position: offsetAnimation,
      child: child,
    );
  },
));
```

### Animasi Spring Berbasis Fisika

```dart
SpringDescription(
  mass: 1.0,        // Massa lebih berat = lebih lambat, lebih banyak momentum
  stiffness: 100.0,  // Stiffness lebih tinggi = lebih cepat, lebih responsif
  damping: 10.0,     // Damping lebih tinggi = lebih sedikit pantulan
);

// Penggunaan dengan AnimationController
_controller = AnimationController(
  vsync: this,
  duration: const Duration(milliseconds: 500), // Diabaikan untuk spring
);
_spring = SpringSimulation(
  SpringDescription(mass: 1, stiffness: 100, damping: 10),
  0.0,     // mulai
  1.0,     // akhir
  0.0,     // kecepatan awal
);
_controller.animateWith(_spring);
```

### Operasi CRUD AnimatedList

```dart
final GlobalKey<AnimatedListState> _kunciDaftar = GlobalKey<AnimatedListState>();
final List<String> _item = [];

// Insert item dengan animasi
void _insertItem(int index, String item) {
  _item.insert(index, item);
  _kunciDaftar.currentState?.insertItem(index, duration: const Duration(milliseconds: 300));
}

// Hapus item dengan animasi
void _hapusItem(int index) {
  final itemDihapus = _item.removeAt(index);
  _kunciDaftar.currentState?.removeItem(
    index,
    (context, animation) => SizeTransition(
      sizeFactor: animation,
      child: Card(child: ListTile(title: Text(itemDihapus))),
    ),
    duration: const Duration(milliseconds: 300),
  );
}

// Widget AnimatedList
AnimatedList(
  key: _kunciDaftar,
  initialItemCount: _item.length,
  itemBuilder: (context, index, animation) {
    return SizeTransition(
      sizeFactor: animation,
      child: ListTile(
        title: Text(_item[index]),
        trailing: IconButton(
          icon: const Icon(Icons.delete),
          onPressed: () => _hapusItem(index),
        ),
      ),
    );
  },
)
```

### ValueNotifier dengan AnimatedBuilder

```dart
// Animasi reaktif ringan tanpa StatefulWidget
final ValueNotifier<double> _notifierSkala = ValueNotifier<double>(1.0);

// Pemicu
_ketikaTap() {
  _notifierSkala.value = 1.3;
  Future.delayed(const Duration(milliseconds: 200), () {
    _notifierSkala.value = 1.0;
  });
}

// Widget
ValueListenableBuilder<double>(
  valueListenable: _notifierSkala,
  builder: (context, skala, child) {
    return Transform.scale(
      scale: skala,
      child: child,
    );
  },
  child: ElevatedButton(
    onPressed: _ketikaTap,
    child: const Text('Tekan Saya'),
  ),
)
```

---
title: "Cheat Sheet Widget Flutter"
description: "Panduan referensi cepat untuk widget inti Flutter — tata letak, input, navigasi, gaya, dan manajemen status."
category: "mobile"
technology: "flutter"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Widget Flutter

## Tabel Referensi Cepat

| Aksi | Widget / Kode | Deskripsi |
|------|---------------|-----------|
| Memusatkan anak | `Center(child: ...)` | Memusatkan widget anak di dalam induknya |
| Menambah padding | `Padding(padding: EdgeInsets.all(16.0), child: ...)` | Menambahkan ruang kosong di sekitar anak |
| Menyusun horizontal | `Row(children: [...])` | Menempatkan anak dalam tata letak flex horizontal |
| Menyusun vertikal | `Column(children: [...])` | Menempatkan anak dalam tata letak flex vertikal |
| Menumpuk widget | `Stack(children: [...])` | Menempatkan anak di atas satu sama lain |
| Membungkus anak | `Wrap(children: [...])` | Membungkus anak ke baris/kolom berikutnya jika meluap |
| Ukuran expanded | `Expanded(child: ...)` | Membuat anak mengisi ruang yang tersedia di Row/Column |
| Sized box | `SizedBox(width: 100, height: 50)` | Kotak ukuran tetap untuk jarak atau batasan |
| Kontainer styling | `Container(width: 100, height: 100, color: Colors.blue)` | Kotak dengan dekorasi, padding, margin |
| Teks | `Text('Halo', style: TextStyle(fontSize: 18))` | Menampilkan teks bergaya |
| Gambar dari aset | `Image.asset('assets/logo.png')` | Menampilkan gambar dari bundel aplikasi |
| Gambar dari jaringan | `Image.network('https://contoh.com/gambar.png')` | Menampilkan gambar dari URL |
| Ikon | `Icon(Icons.home, color: Colors.blue, size: 32)` | Menampilkan ikon Material Design |
| Tombol elevated | `ElevatedButton(onPressed: () {}, child: Text('Kirim'))` | Tombol material dengan elevasi |
| Tombol teks | `TextButton(onPressed: () {}, child: Text('Batal'))` | Tombol hanya teks |
| Tombol outlined | `OutlinedButton(onPressed: () {}, child: Text('Simpan'))` | Tombol dengan garis tepi |
| Kolom input | `TextField(controller: _controller, decoration: InputDecoration(labelText: 'Nama'))` | Kolom input teks |
| Form wrapper | `Form(key: _formKey, child: ...)` | Mengelompokkan dan memvalidasi field form |
| Daftar item | `ListView(children: [...])` | Daftar widget yang dapat digulir |
| Daftar lazy | `ListView.builder(itemCount: n, itemBuilder: (ctx, i) => Widget)` | Daftar gulir efisien (bangun sesuai permintaan) |
| Grid item | `GridView.builder(gridDelegate: ..., itemBuilder: ...)` | Tata letak grid yang dapat digulir |
| Scroll view | `SingleChildScrollView(child: ...)` | Kontainer gulir untuk satu anak |
| App bar | `AppBar(title: Text('Beranda'), actions: [...])` | Bilah aplikasi atas dengan aksi |
| Navigasi bawah | `BottomNavigationBar(items: [...], onTap: _onTabTapped)` | Bilang navigasi bawah |
| Tab bar | `TabBar(tabs: [...])` / `TabBarView(children: [...])` | Navigasi berbasis tab |
| Menu drawer | `Drawer(child: ...)` | Panel menu samping, digunakan dengan Scaffold |
| Snackbar | `ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Tersimpan!')))` | Pesan sementara di bawah |
| Dialog peringatan | `showDialog(context: context, builder: (ctx) => AlertDialog(...))` | Kotak dialog modal |
| Indikator loading | `CircularProgressIndicator()` | Indikator loading berputar |
| Progress linear | `LinearProgressIndicator(value: 0.5)` | Bilah progress horizontal |
| Kartu | `Card(child: ..., elevation: 4)` | Kartu material dengan sudut membulat dan bayangan |
| Safe area | `SafeArea(child: ...)` | Menghindari UI sistem (notch, status bar, home indicator) |
| Gesture detector | `GestureDetector(onTap: () {}, child: ...)` | Mendeteksi gestur (tap, seret, tekan lama) |
| Efek InkWell | `InkWell(onTap: () {}, child: ...)` | Efek tinta material saat ditekan |
| Stream builder | `StreamBuilder<T>(stream: ..., builder: (ctx, snap) => Widget)` | Membangun UI secara reaktif dari Stream |
| Future builder | `FutureBuilder<T>(future: ..., builder: (ctx, snap) => Widget)` | Membangun UI secara reaktif dari Future |

## Perintah Umum

### Setup Proyek

```bash
# Membuat proyek Flutter baru
flutter create aplikasi_saya

# Membuat proyek dengan platform tertentu
flutter create --platforms android,ios,web aplikasi_saya

# Menambahkan dependensi paket
flutter pub add provider

# Menambahkan dev dependensi
flutter pub add --dev flutter_lints

# Menginstal semua dependensi dari pubspec.yaml
flutter pub get

# Memperbarui dependensi ke versi terbaru yang kompatibel
flutter pub upgrade
```

### Pengembangan

```bash
# Menjalankan aplikasi di perangkat/emulator yang terhubung
flutter run

# Menjalankan dengan perangkat tertentu
flutter run -d chrome

# Menjalankan dalam mode rilis
flutter run --release

# Hot reload (saat aplikasi berjalan, tekan 'r' di terminal)
# Atau gunakan tombol hot reload di IDE

# Hot restart (tekan 'R' di terminal)
flutter run

# Menjalankan tes
flutter test

# Menjalankan file tes tertentu
flutter test test/widget_test.dart

# Menganalisis kode untuk masalah
flutter analyze
```

### Build & Deploy

```bash
# Membangun APK untuk Android
flutter build apk

# Membangun app bundle untuk Play Store
flutter build appbundle

# Membangun arsip iOS
flutter build ios

# Membangun rilis web
flutter build web

# Memeriksa perangkat/emulator yang terinstal
flutter devices

# Melihat daftar emulator yang tersedia
flutter emulators --launch <id_emulator>
```

## Potongan Kode

### Scaffold Aplikasi Dasar

```dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Aplikasi Flutter Saya',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Beranda')),
      body: const Center(child: Text('Halo, Flutter!')),
    );
  }
}
```

### Pola Tata Letak Umum

```dart
// Tata letak kolom dengan spasi
Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: [
    const Text('Judul', style: TextStyle(fontSize: 24)),
    const SizedBox(height: 8),
    const Text('Subjudul'),
    const SizedBox(height: 16),
    ElevatedButton(
      onPressed: () {},
      child: const Text('Aksi'),
    ),
  ],
)

// Baris responsif dengan expanded children
Row(
  children: [
    Expanded(
      flex: 2,
      child: Container(color: Colors.red, height: 100),
    ),
    const SizedBox(width: 8),
    Expanded(
      flex: 1,
      child: Container(color: Colors.blue, height: 100),
    ),
  ],
)

// Stack dengan positioned children
Stack(
  children: [
    Container(width: 200, height: 200, color: Colors.grey[300]),
    const Positioned(
      top: 10,
      right: 10,
      child: Icon(Icons.star, color: Colors.amber, size: 32),
    ),
    const Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Text('Label bawah', textAlign: TextAlign.center),
    ),
  ],
)
```

### Stateful Widget dengan Penanganan Form

```dart
class FormLogin extends StatefulWidget {
  const FormLogin({super.key});

  @override
  State<FormLogin> createState() => _FormLoginState();
}

class _FormLoginState extends State<FormLogin> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      // Simulasi panggilan API
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Login berhasil!')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          TextFormField(
            controller: _emailController,
            decoration: const InputDecoration(
              labelText: 'Email',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.email),
            ),
            keyboardType: TextInputType.emailAddress,
            validator: (value) {
              if (value == null || value.isEmpty) return 'Email wajib diisi';
              if (!value.contains('@')) return 'Masukkan email yang valid';
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _passwordController,
            decoration: const InputDecoration(
              labelText: 'Kata Sandi',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.lock),
            ),
            obscureText: true,
            validator: (value) {
              if (value == null || value.length < 6) {
                return 'Kata sandi minimal 6 karakter';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleSubmit,
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Login'),
            ),
          ),
        ],
      ),
    );
  }
}
```

### ListView dengan Pull-to-Refresh

```dart
class DaftarItem extends StatefulWidget {
  const DaftarItem({super.key});

  @override
  State<DaftarItem> createState() => _DaftarItemState();
}

class _DaftarItemState extends State<DaftarItem> {
  final List<String> _items = List.generate(20, (i) => 'Item ${i + 1}');

  Future<void> _refresh() async {
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      _items.insert(0, 'Item Baru ${DateTime.now().second}');
    });
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView.builder(
        itemCount: _items.length,
        itemBuilder: (context, index) {
          return ListTile(
            leading: CircleAvatar(child: Text('${index + 1}')),
            title: Text(_items[index]),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Mengetuk ${_items[index]}')),
              );
            },
          );
        },
      ),
    );
  }
}
```

### Navigasi Antar Layar

```dart
// Navigasi ke layar baru (push)
Navigator.of(context).push(
  MaterialPageRoute(builder: (context) => const LayarDetail(id: 42)),
);

// Navigasi dan tunggu hasil
final hasil = await Navigator.of(context).push<String>(
  MaterialPageRoute(builder: (context) => const LayarPemilih()),
);
// hasil berisi nilai yang diberikan ke Navigator.pop(context, value)

// Kembali dengan hasil
Navigator.of(context).pop('item_terpilih');

// Ganti rute saat ini (tanpa tombol kembali)
Navigator.of(context).pushReplacement(
  MaterialPageRoute(builder: (context) => const HalamanBeranda()),
);

// Hapus semua rute dan push rute baru
Navigator.of(context).pushAndRemoveUntil(
  MaterialPageRoute(builder: (context) => const HalamanLogin()),
  (route) => false,
);
```

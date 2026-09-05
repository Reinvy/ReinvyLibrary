---
title: "Panduan Optimasi Performa Flutter"
description: "Panduan komprehensif untuk mengoptimalkan performa aplikasi Flutter — memahami pipeline rendering, meminimalkan rebuild widget, memindahkan pekerjaan berat ke isolate, mengoptimalkan gambar, mengurangi waktu startup, dan mengukur perbaikan dengan DevTools."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Optimasi Performa Flutter

## Pendahuluan

Flutter merender pada 60 frame per detik di kebanyakan perangkat dan hingga 120 fps di layar ber-refresh-rate tinggi. Setiap frame memiliki anggaran waktu yang ketat — sekitar 16,7 ms pada 60 fps dan 8,3 ms pada 120 fps. Ketika sebuah frame melewati anggarannya, UI menjadi patah (jank), animasi tersendat, dan pengguna menganggap aplikasi lambat atau tidak responsif. Optimasi performa di Flutter adalah disiplin untuk menjaga setiap frame tetap berada di dalam anggarannya dengan memahami ke mana waktu dihabiskan dalam pipeline rendering dan secara sistematis menghilangkan pemborosan di setiap tahap.

Panduan ini mencakup perangkat optimasi Flutter secara lengkap: cara kerja fase build, layout, paint, dan raster; cara menghilangkan rebuild widget yang tidak perlu dengan konstruktor `const`, key, dan state yang ter-scope; cara menjaga daftar panjang tetap mulus dengan pembangunan lazy dan penggunaan ulang item; cara memindahkan komputasi berat dari thread UI ke isolate; cara mengoptimalkan pemuatan dan decoding gambar; cara mengurangi jank kompilasi shader, waktu cold start, dan ukuran aplikasi; serta cara mengukur semuanya dengan alat profiling Flutter DevTools alih-alih menebak. Pada akhirnya, Anda akan memiliki alur kerja optimasi yang berulang yang mengubah prototipe patah menjadi aplikasi produksi 60 fps.

## Praktik Terbaik

### 1. Kenali Pipeline Frame Sebelum Mengoptimalkan Apa Pun

Setiap frame yang terlihat di Flutter melewati empat fase: **build** (konstruksi pohon widget), **layout** (menentukan ukuran dan posisi), **paint** (merekam perintah menggambar), dan **raster** (rasterisasi GPU terhadap perintah yang direkam). Tiga fase pertama berjalan di thread UI; rasterisasi berjalan di thread raster. Frame yang patah hampir selalu disebabkan oleh salah satu dari dua masalah: thread UI terlalu lama (build atau layout yang mahal), atau thread raster terlalu lama (painting kompleks, kompilasi shader, atau decode gambar besar).

- **Ukur dulu**: jalankan aplikasi dalam mode profile (`flutter run --profile`) sebelum mengubah apa pun. Mode debug 2-10 kali lebih lambat dan menghasilkan pengukuran yang menyesatkan.
- **Gunakan performance overlay**: atur `showPerformanceOverlay: true` pada widget aplikasi atau tekan `P` di inspector DevTools untuk melihat dua grafik batang waktu frame thread UI dan raster.
- **Baca timeline DevTools**: timeline Flutter DevTools menunjukkan dengan tepat fase mana yang menghabiskan anggaran setiap frame, termasuk widget mana yang memanggil `build` dan berapa lama.
- **Profil di perangkat asli**: GPU dan CPU emulator berperilaku berbeda dari perangkat fisik; pengukuran waktu frame di emulator tidak representatif.

### 2. Gunakan Konstruktor const di Mana Saja yang Memungkinkan

Widget `const` dibuat sekali dan digunakan ulang sepanjang umur aplikasi. Ketika induknya rebuild, Flutter dapat melewati rebuild subtree `const` sepenuhnya karena instance widget-nya identik (`identical()` mengembalikan true). Ini adalah optimasi termurah dengan dampak terbesar di Flutter — tidak butuh biaya penulisan dan menghilangkan seluruh subtree pekerjaan di setiap frame.

- Utamakan `const` pada setiap widget yang argumen konstruktornya merupakan konstanta waktu kompilasi: `const Text(...)`, `const Icon(...)`, `const EdgeInsets.all(8)`, `const SizedBox(height: 16)`.
- Gunakan konstruktor `const` untuk widget stateless pembantu yang tidak menerima parameter yang berubah.
- Jalankan `dart fix --apply` secara berkala — secara otomatis menyisipkan banyak keyword `const` yang hilang.
- Perhatikan lint analyzer `prefer_const_constructors` dan `prefer_const_literals_to_create_immutables` dan biarkan keduanya aktif.

### 3. Jaga Metode build() Tetap Murni, Cepat, dan Bebas Efek Samping

Metode `build` harus merupakan fungsi murni dari inputnya — tidak boleh melakukan I/O, mengurai payload besar, atau mengalokasikan objek yang mahal. Apa pun yang lambat di dalam `build` berjalan pada setiap rebuild widget tersebut, yang bisa terjadi berkali-kali per detik selama animasi atau perubahan state.

- **Tanpa panggilan jaringan atau pembacaan database di `build`**: ambil data di `initState` atau sebagai respons terhadap event, lalu simpan di state.
- **Tanpa parsing file atau decoding JSON di `build`**: decode sekali dan simpan hasilnya di cache.
- **Hindari membuat objek baru di `build`**: angkat instance `TextStyle`, `EdgeInsets`, dan `BoxDecoration` statis ke field `final` atau nilai `const` agar tidak dialokasikan ulang setiap build.
- **Hindari `print()` di build rilis**: pemformatan string dan I/O konsol ternyata mahal di jalur panas; gunakan `debugPrint` dan lindungi dengan `kReleaseMode`.
- **Tunda pekerjaan dengan `addPostFrameCallback`**: apa pun yang tidak memengaruhi frame saat ini — navigasi, snackbar, analytics — sebaiknya dijalankan setelah frame dikomit.

### 4. Scope State Management untuk Meminimalkan Rebuild

Penyebab jank paling umum di aplikasi Flutter nyata adalah me-rebuild bagian pohon widget yang jauh lebih besar dari yang diperlukan ketika sebagian kecil state berubah. Jika `ChangeNotifier` disediakan tinggi di pohon dan seluruh layar mendengarkannya, setiap notifikasi akan me-rebuild seluruh layar.

- **Gunakan selector**: dengan Provider, `context.select<T, R>((value) => value.field)` me-rebuild hanya ketika field yang dipilih berubah; dengan Riverpod, `ref.watch(provider.select((value) => value.field))` melakukan hal yang sama. Dengan Bloc, gunakan `BlocSelector` atau petakan state ke view model yang minimal.
- **Pecah widget besar menjadi kecil**: layar dengan header, daftar, dan bilah bawah sebaiknya menjadi tiga widget, masing-masing hanya mendengarkan state yang ditampilkannya.
- **Gunakan `ValueListenableBuilder`, `StreamBuilder`, dan `AnimatedBuilder` di daun pohon**: ketiganya hanya me-rebuild subtree builder-nya ketika nilainya berubah, membiarkan sisa pohon tidak tersentuh.
- **Gunakan `RepaintBoundary` di sekitar subtree painting yang mahal**: peta, custom painter, dan gradien kompleks di-repaint secara terisolasi alih-alih memaksa seluruh layar repaint.

### 5. Bangun Daftar Secara Lazy dan Gunakan Ulang Item

Daftar panjang adalah sumber jank klasik. Membangun setiap item daftar secara eager, atau gagal menggunakan ulang widget item, mengubah scroll 60 fps menjadi tersendat begitu daftar melebihi satu layar.

- **Selalu gunakan konstruktor daftar lazy**: `ListView.builder`, `ListView.separated`, `SliverList`, dan `SliverGrid` hanya membangun item yang terlihat ditambah cache extent kecil. Jangan pernah membangun `ListView` dari daftar `children:` yang sudah dimaterialisasi ketika jumlah item bisa besar.
- **Beri daftar petunjuk extent tetap**: atur `itemExtent` (atau `prototypeItem`) ketika item memiliki tinggi seragam atau hampir seragam agar fase layout tidak perlu mengukur setiap item.
- **Gunakan ulang widget item dengan key**: beri item `ValueKey` yang stabil sehingga Flutter dapat mencocokkan widget item lama dan baru saat scroll dan menggunakan ulang element serta render object-nya.
- **Atur `cacheExtent` secara sengaja**: cache extent bawaan (250 piksel logis) menyeimbangkan memori dan kehalusan; naikkan hanya jika scroll terasa patah karena item mahal untuk dibangun.
- **Hindari `shrinkWrap: true` di dalam scrollable**: daftar `shrinkWrap` harus me-layout semua anaknya untuk menghitung tingginya, mengalahkan lazy sepenuhnya. Gunakan `CustomScrollView` dengan `SliverList`/`SliverToBoxAdapter` sebagai gantinya.

### 6. Pindahkan Komputasi Berat ke Isolate

Dart bersifat single-threaded di isolate UI. Pekerjaan apa pun yang terikat CPU — decoding JSON payload besar, pemrosesan gambar, enkripsi, perhitungan kompleks — memblokir rendering frame selama berjalan. Solusinya adalah menjalankan pekerjaan tersebut di isolate latar belakang dan mengirim hasilnya kembali.

- **Gunakan `Isolate.run()` untuk tugas berat satu kali**: membuat isolate berumur pendek, menjalankan callback, dan mengembalikan `Future` berisi hasilnya.
- **Gunakan `compute()` untuk kasus sederhana**: `compute(function, message)` adalah wrapper tipis di atas `Isolate.run` yang berfungsi baik ketika callback berupa fungsi top-level atau statis.
- **Gunakan isolate berumur panjang untuk pekerjaan berulang**: jika aplikasi terus-menerus memproses data (misalnya aplikasi chat yang mendecode pesan masuk), buat isolate khusus dengan `Isolate.spawn` dan berkomunikasi melalui pasangan `SendPort`/`ReceivePort` untuk menghindari biaya startup isolate per tugas.
- **Hanya kirim data polos antar isolate**: isolate Dart tidak berbagi memori; kirim string JSON, byte, atau daftar primitif, jangan pernah widget atau referensi `BuildContext`.

### 7. Optimalkan Pemuatan dan Decoding Gambar

Decoding gambar berjalan di thread UI dan bisa memakan waktu puluhan milidetik per gambar — sumber jank frame-pertama terbesar di aplikasi yang sarat gambar. Foto 4000x3000 yang didecode pada resolusi penuh lalu diperkecil oleh widget membuang CPU dan memori dalam jumlah besar.

- **Decode pada ukuran tampilan**: berikan `cacheWidth` dan `cacheHeight` ke `Image.network` dan `Image.asset` (atau bungkus gambar dengan `ResizeImage`) agar Flutter mendecode versi yang sudah diperkecil alih-alih original beresolusi penuh.
- **Gunakan paket caching gambar**: `cached_network_image` menambahkan cache disk, widget placeholder/error, dan manajemen cache memori otomatis di atas widget `Image` standar.
- **Sediakan aset dengan ukuran yang tepat**: berikan varian `1x`, `2x`, dan `3x` untuk gambar bawaan dan biarkan Flutter memilih yang benar melalui mekanisme `scale`/`devicePixelRatio`.
- **Utamakan format modern**: WebP dan AVIF jauh lebih kecil daripada PNG/JPEG untuk kualitas visual yang sama; konversi aset besar selama pipeline build.
- **Hindari decoding di `build`**: gunakan `precacheImage()` saat startup atau setelah frame pertama untuk gambar yang diketahui akan segera dibutuhkan, dan tampilkan placeholder ringan selama gambar dimuat.

### 8. Cegah Jank Kompilasi Shader

Pertama kali efek visual baru (gradien, blur, sudut membulat, shader kustom) muncul di layar, GPU harus mengompilasi shader-nya, yang dapat menghentikan thread raster selama ratusan milidetik. Pengguna melihat ini sebagai hentakan yang terasa pertama kali mereka membuka layar.

- **Aktifkan Impeller**: Impeller, mesin rendering baru Flutter, mengompilasi shader terlebih dahulu saat build dan menghilangkan sebagian besar jank kompilasi shader runtime. Ini adalah bawaan di iOS dan dapat diaktifkan di Android dengan `--enable-impeller`.
- **Panaskan shader secara sengaja**: jika Impeller bukan pilihan, jalankan aplikasi sekali melewati layar umumnya dan kumpulkan cache shader SkSL (`--cache-sksl`), lalu bundel sehingga run asli pertama menemukan shader yang sudah dikompilasi.
- **Jaga efek tetap konsisten**: menggunakan set `BoxDecoration`, `ClipRRect`, dan konfigurasi gradien yang sama di seluruh aplikasi mengurangi jumlah shader berbeda yang perlu dikompilasi.
- **Hindari penggunaan efek mahal secara berlebihan**: blur (`ImageFilter.blur`, `BackdropFilter`) dan lapisan `Opacity` besar memaksa rendering offscreen melalui `saveLayer` — gunakan dengan hemat dan bungkus dengan `RepaintBoundary` agar tidak repaint lebih sering dari yang diperlukan.

### 9. Kurangi Waktu Startup dan Ukuran Aplikasi

Cold start adalah kesan performa pertama. Isolate utama yang bengkak, inisialisasi plugin yang berat, atau APK yang terlalu besar membuat aplikasi terasa lambat sebelum frame pertama pun dirender.

- **Tunda inisialisasi yang tidak kritikal**: inisialisasi analytics, socket chat, dan layanan latar belakang setelah frame pertama menggunakan `addPostFrameCallback` atau `Future.microtask`, bukan di `main()`.
- **Gunakan pemuatan ditangguhkan untuk fitur yang jarang dipakai**: `DeferredLibrary` (Dart) dan deferred components Android memungkinkan aplikasi mengunduh kode fitur berat sesuai permintaan alih-alih mengirimkannya di unduhan awal.
- **Pecah APK Android**: `flutter build apk --split-per-abi` menghasilkan APK per arsitektur yang lebih kecil; `--target-platform` membatasi build hanya pada platform yang benar-benar Anda dukung.
- **Audit dependensi**: setiap plugin menambahkan kode native dan biaya inisialisasi. Hapus paket yang tidak terpakai dan utamakan alternatif yang lebih ringan untuk kebutuhan sederhana.
- **Aktifkan tree shaking dan obfuscation untuk rilis**: `flutter build apk --obfuscate --split-declarations` mengecilkan payload Dart (ingat simpan file mapping untuk men-debug stack trace).

### 10. Ukur dengan Alat Profiling, Bukan Tebakan

Cara tercepat membuang waktu berjam-jam adalah mengoptimalkan apa yang menurut Anda lambat. Flutter menyediakan rangkaian alat profiling lengkap yang memberi tahu persis ke mana waktu pergi, dan alur kerjanya sama setiap kali: reproduksi, ukur, perbaiki, ukur ulang.

- **Mode profile adalah kebenaran**: `flutter run --profile` dan `flutter build --profile` menggunakan kompilasi rilis dengan profiling aktif — angka yang berarti berasal dari sini.
- **Gunakan timeline DevTools**: rekam sesi, klik frame yang patah, dan baca fase mana (build, layout, paint, raster) yang melebihi anggaran dan widget mana yang di-rebuild.
- **Gunakan performance overlay di dalam aplikasi**: `showPerformanceOverlay: true` memberikan pembacaan waktu frame UI/raster secara langsung selama pengujian manual.
- **Lacak jumlah rebuild**: `debugPrintBuildTimings` (atau `BuildTimeline` di DevTools) melaporkan berapa lama `build` setiap widget berlangsung, langsung menyingkap titik panas rebuild.
- **Otomatiskan dengan integration test**: `integration_test` dengan `traceAction()` menangkap timeline selama alur pengguna terskrip, dan `flutter drive --profile` dapat mengeluarkan ringkasan timeline JSON yang bisa Anda bandingkan antar commit untuk menangkap regresi di CI.

## Langkah Implementasi

### Langkah 1: Tetapkan Baseline Performa

Optimasi tanpa baseline hanyalah tebakan. Mulailah dengan mengukur perilaku aplikasi saat ini sehingga Anda dapat membuktikan setiap perubahan membantu.

- Jalankan aplikasi di perangkat Android kelas menengah fisik (target umum paling menuntut) dalam mode profile: `flutter run --profile`.
- Aktifkan performance overlay dan jelajahi alur utama aplikasi — beranda, scroll daftar, layar detail, layar sarat gambar — dan catat di mana frame melebihi anggaran.
- Tangkap timeline DevTools untuk alur terburuk dan catat fase (build/layout/paint/raster) yang mendominasi setiap frame patah.
- Tuliskan tiga pelanggar teratas dengan angka konkret. Ini menjadi daftar tugas Anda.

### Langkah 2: Hilangkan Rebuild Widget yang Tidak Perlu

Rebuild adalah sumber jank yang paling umum dan paling mudah diperbaiki. Serang berdasarkan daya ungkit: konstruktor `const` dulu, lalu scope state.

- Jalankan `dart fix --apply` dan aktifkan lint `prefer_const_constructors`, lalu tinjau diff untuk memastikan setiap perubahan aman.
- Audit arsitektur state: ganti pendengar seluruh layar dengan selector. Dengan Provider:

```dart
// Sebelum: seluruh layar rebuild ketika salah satu field user berubah.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<UserController>();
    return Column(
      children: [
        Text(user.name),
        Text(user.email),
        // ... puluhan widget lain yang tidak bergantung pada objek user
      ],
    );
  }
}

// Sesudah: hanya widget Text yang rebuild ketika field pilihannya berubah.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(context.select<UserController, String>((c) => c.user.name)),
        Text(context.select<UserController, String>((c) => c.user.email)),
        // ... widget lain tidak lagi rebuild saat user berubah
      ],
    );
  }
}
```

- Bungkus subtree painting mahal (custom painter, peta, gradien kompleks) dengan `RepaintBoundary` sehingga repaint induk tidak ikut me-repaint subtree tersebut.
- Jalankan ulang performance overlay dan pastikan penurunan frame terkait rebuild hilang sebelum melanjutkan.

### Langkah 3: Haluskan Scroll dan Daftar

Dengan rebuild terkendali, sumber jank berikutnya biasanya adalah rendering daftar selama scroll.

- Ganti `ListView(children: [...])` yang eager dengan `ListView.builder` untuk daftar apa pun yang bisa melebihi satu layar.
- Tambahkan `itemExtent` ketika tinggi item seragam — ini melompati pengukuran per item sepenuhnya.
- Beri item `ValueKey` stabil yang berasal dari datanya (misalnya `ValueKey(item.id)`) untuk memungkinkan penggunaan ulang element.
- Periksa timeline saat scroll: jika frame masih melebihi anggaran, pastikan widget item itu sendiri murah — pindahkan apa pun yang mahal di dalam item ke widget kecilnya sendiri dengan konstruktor `const`.
- Jika gambar muncul selama scroll, pastikan gambar didecode pada ukuran tampilan (Langkah 5 membahas ini) — decode di thread UI selama frame scroll akan membuat patah apa pun struktur daftarnya.

### Langkah 4: Pindahkan Pekerjaan Berat dari Thread UI

Operasi apa pun yang memblokir thread UI lebih dari beberapa milidetik sebaiknya berada di isolate.

- Temukan panggilan berat: parsing JSON besar, kompresi file, manipulasi gambar, kripto, atau perhitungan kompleks — timeline DevTools menunjukkannya sebagai gap build atau frame panjang tanpa aktivitas paint.
- Pindahkan pekerjaan berat satu kali ke `Isolate.run`:

```dart
import 'dart:convert';
import 'dart:isolate';

Future<List<Item>> parseItems(String rawJson) async {
  // Berjalan di isolate latar belakang; UI tetap responsif.
  return Isolate.run(() {
    final decoded = jsonDecode(rawJson) as List<dynamic>;
    return decoded
        .map((e) => Item.fromJson(e as Map<String, dynamic>))
        .toList();
  });
}
```

- Untuk pemrosesan berkelanjutan (pesan chat masuk, data sensor), buat isolate berumur panjang dengan `Isolate.spawn` dan berkomunikasi melalui `SendPort`/`ReceivePort` untuk menghindari overhead spawn per tugas.
- Ukur ulang: waktu frame thread UI sekarang harus tetap datar bahkan ketika pekerjaan berat berjalan.

### Langkah 5: Optimalkan Gambar dan Pengiriman Aset

Decode gambar adalah jank tersembunyi klasik: frame terlihat baik-baik saja, tetapi decode di tengah frame scroll meledakkan anggaran.

- Tambahkan `cacheWidth`/`cacheHeight` ke setiap `Image.network` dan `Image.asset` ketika ukuran tampilan diketahui:

```dart
// Sebelum: mendecode original penuh (misalnya 4000x3000) padahal widget
// hanya pernah menampilkan thumbnail 200x200.
Image.network(
  photoUrl,
  width: 200,
  height: 200,
  fit: BoxFit.cover,
)

// Sesudah: Flutter mendecode bitmap yang diperkecil, menggunakan sebagian
// kecil dari memori dan waktu decode.
Image.network(
  photoUrl,
  width: 200,
  height: 200,
  fit: BoxFit.cover,
  cacheWidth: 200,
  cacheHeight: 200,
)
```

- Ganti `Image.network` dengan `CachedNetworkImage` dari `cached_network_image` untuk mendapatkan cache disk serta state placeholder/error.
- Konversi aset bawaan besar ke WebP dan sediakan varian `1x`/`2x`/`3x` sehingga perangkat ber-DPI tinggi tidak melakukan upscale.
- Untuk layar sarat gambar, `precacheImage` beberapa gambar pertama setelah frame pertama sehingga scroll dimulai dengan cache yang hangat.
- Jalankan ulang uji scroll — jank terkait gambar seharusnya hilang.

### Langkah 6: Tingkatkan Cold Start dan Ukuran Aplikasi

Startup dan ukuran instalasi membentuk kesan pertama. Kurangi keduanya dengan audit yang sama.

- Tinjau `main()`: pindahkan inisialisasi analytics, chat, dan sinkronisasi ke callback setelah frame pertama.
- Pastikan build rilis menggunakan tree shaking dan obfuscation, serta pecah APK per ABI:

```bash
flutter build apk --release --split-per-abi --obfuscate --split-declarations
```

- Hapus plugin dan dependensi yang tidak terpakai; periksa `flutter pub deps` untuk paket transitif yang duplikat atau berat.
- Pertimbangkan pemuatan ditangguhkan untuk fitur besar yang jarang digunakan (misalnya panel admin atau editor berat) agar tidak menjadi bagian dari unduhan awal.
- Ukur cold start sebelum dan sesudah dengan `adb shell am start -W` (Android) atau template Instruments App Launch (iOS) dan konfirmasi perbaikannya.

### Langkah 7: Verifikasi dengan Pemeriksaan Performa Berkelanjutan

Regresi performa merayap masuk secara diam-diam; satu-satunya pertahanan adalah pengukuran otomatis.

- Tambahkan `integration_test` yang berjalan melalui alur inti aplikasi dan menangkap timeline dengan `traceAction()`:

```dart
import 'package:integration_test/integration_test.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('feed utama scroll pada 60 fps', (tester) async {
    final timeline = await traceAction(() async {
      // Scroll terskrip melalui feed utama.
    });
    // Gagalkan build jika rata-rata waktu build frame melebihi anggaran.
    expect(
      timeline.summary!.build.buildTime.inMicroseconds ~/ 1000,
      lessThan(16),
    );
  });
}
```

- Jalankan dalam mode profile di CI: `flutter test integration_test --profile -d <device>`.
- Lacak waktu build frame, waktu raster, dan ukuran aplikasi di dashboard CI sehingga regresi tertangkap pada hari ia mendarat, bukan seminggu sebelum rilis.
- Simpan baseline dari Langkah 1 sebagai titik referensi — perubahan apa pun di masa depan tidak boleh memperburuk angka tersebut.

## Kesimpulan

Flutter memberi Anda 60-120 kesempatan per detik untuk membuktikan aplikasi Anda cepat, dan setiap frame yang patah adalah gejala pekerjaan yang tidak perlu terjadi di jalur kritis. Alur kerja optimasinya sistematis: pahami pipeline frame, hilangkan rebuild yang tidak perlu dengan `const` dan state ter-scope, bangun daftar secara lazy, pindahkan komputasi berat ke isolate, decode gambar pada ukuran tampilan, cegah jank shader, kurangi startup dan ukuran, serta — yang terpenting — ukur setiap perubahan dengan alat profiling DevTools dalam mode profile.

Mulailah dengan baseline, perbaiki pelanggar terukur terbesar, ukur ulang, dan ulangi. Sebagian besar aplikasi mencapai 60 fps mulus dengan dua atau tiga perbaikan pertama — konstruktor `const`, scoping state berbasis selector, dan pengaturan ukuran decode gambar. Sisanya dari panduan ini adalah perangkat yang Anda gunakan ketika kemenangan mudah telah selesai. Diterapkan secara konsisten dan diverifikasi berkelanjutan, praktik-praktik ini menjaga aplikasi Flutter Anda terasa instan di setiap perangkat, dari ponsel Android kelas bawah hingga flagship terbaru.

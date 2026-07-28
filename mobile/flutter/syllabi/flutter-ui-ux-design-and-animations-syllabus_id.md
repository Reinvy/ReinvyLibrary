---
title: "Silabus Desain UI/UX dan Animasi Flutter"
description: "Kurikulum terfokus yang mencakup prinsip desain UI/UX Flutter, custom painting, sistem animasi, penanganan gesture, dan pembuatan antarmuka lintas platform yang memukau secara visual."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Desain UI/UX dan Animasi Flutter

## Ringkasan

Silabus ini menyediakan kurikulum terstruktur untuk menguasai desain UI/UX dan animasi di Flutter. Siswa akan berkembang dari prinsip desain fundamental dan komposisi tata letak hingga custom painting tingkat lanjut, animasi implisit dan eksplisit, interaksi berbasis gesture, dan pengalaman visual yang dioptimalkan kinerjanya. Pada akhirnya, peserta didik akan mampu membangun aplikasi Flutter berkualitas produksi dengan antarmuka animasi kustom yang memukau pengguna di berbagai platform.

## Kurikulum

### Modul 1: Fondasi Desain untuk Flutter
- **Material Design 3 dan Pedoman Antarmuka Manusia**: Memahami tema Material You (M3), skema warna, sistem tipografi, dan kustomisasi bentuk.
- **Penguasaan Komposisi Tata Letak**: Penggunaan lanjutan Row, Column, Flex, Expanded, Flexible, Stack, dan CustomMultiChildLayout.
- **Desain Responsif dan Adaptif**: MediaQuery, LayoutBuilder, OrientationBuilder, dan widget adaptif platform (Material vs Cupertino).
- **Implementasi Sistem Desain**: Membuat theme data yang dapat digunakan kembali, pustaka widget kustom, dan skala spasi/ukuran yang konsisten.

### Modul 2: Custom Painting dan Rendering Tingkat Rendah
- **Dasar-Dasar CustomPainter**: API Canvas, melukis path, bentuk, gradien, dan bayangan.
- **Kliping dan Transformasi**: ClipPath, ClipRRect, CustomClipper, dan widget Transform untuk efek visual.
- **CustomRenderObject**: Kapan menggunakan RenderObject dibandingkan CustomPainter, melakukan tata letak kustom, dan pengujian hit.
- **Pertimbangan Kinerja dalam Melukis**: Repaint boundaries, menghindari rebuild yang tidak perlu, dan menggunakan `shouldRepaint` secara efektif.

### Modul 3: Sistem Animasi Flutter
- **Animasi Implisit**: AnimatedContainer, AnimatedOpacity, AnimatedPadding, AnimatedPositioned, AnimatedSwitcher — kapan dan bagaimana menggunakannya.
- **Animasi Eksplisit**: AnimationController, Tween, CurvedAnimation, pendengar AnimationStatus, dan manajemen ticker.
- **Animasi Staggered**: Mengurutkan beberapa animasi dengan interval, Interval tweens, dan membangun urutan masuk/keluar yang kompleks.
- **Animasi Hero**: Transisi elemen bersama antar rute, tag Hero kustom, dan flightShuttleBuilder.

### Modul 4: Teknik Animasi dan Pustaka Pendukung
- **Animasi Berbasis Fisika**: SpringSimulation, GravitySimulation, dan FrictionSimulation untuk gerakan yang terasa alami.
- **Integrasi Lottie dan Rive**: Memutar, mengontrol, dan menyinkronkan animasi vektor kompleks di Flutter.
- **Widget animasi bawaan Flutter**: AnimatedBuilder, AnimatedWidget, TweenAnimationBuilder, dan kapan memilih masing-masing.
- **Transisi Rute dan Halaman**: Custom PageRouteBuilder, SlideTransition, ScaleTransition, RotationTransition, dan kustomisasi CupertinoPageRoute.

### Modul 5: Penanganan Gesture dan Pengalaman Interaktif
- **Pendalaman GestureDetector**: Pengenal gesture, arena gesture, disambiguasi, dan gesture kustom.
- **Drag, Swipe, dan Dismiss**: Draggable, DragTarget, Dismissible, dan interaksi geser-untuk-menghapus kustom.
- **InteractiveViewer**: Konten yang dapat diperbesar dan digeser, batasan terbatas vs tidak terbatas, dan transformation controllers.
- **Umpan Balik Sentuhan dan Haptics**: Kustomisasi splash InkWell, HapticFeedback, dan respons sentuhan spesifik platform.

### Modul 6: Topik Lanjutan dan Poles Produksi
- **Efek Shader dan Fragment**: Menggunakan FragmentProgram untuk efek visual yang dipercepat GPU, blur, filter warna, dan backdrops.
- **Gradien Animasi dan Gradien Mesh**: Membuat latar belakang gradien yang mengalir, efek gradien mesh, dan tekstur noise.
- **Scroll Physics dan Efek**: CustomScrollView, SliverAppBar, NestedScrollView, dan animasi berbasis scroll melalui pendengar ScrollController.
- **Profil Kinerja untuk UI**: Inspektor Flutter DevTools, analisis hitung rebuild, repaint rainbow, dan mengurangi shader compilation jank.

## Proyek Akhir

Siswa akan merancang dan mengimplementasikan aplikasi Flutter yang kaya secara visual dengan antarmuka animasi kustom. Opsi proyek contoh meliputi:

- **Aplikasi Bercerita Interaktif**: Aplikasi buku cerita anak-anak dengan animasi membalik halaman, pergerakan karakter dengan fisika, dan transisi animasi antar adegan.
- **Aplikasi Galeri Produk**: Penampil produk e-commerce dengan animasi hero, spanduk hero animasi, transisi halaman kustom, dan interaksi geser-untuk-menyukai.
- **Dasbor Kebugaran**: Dasbor kesehatan dengan grafik animasi (berbasis painter), indikator detak jantung berdenyut, lingkaran progres animasi, dan efek parallax scrolling.

Semua proyek harus menunjukkan setidaknya satu custom painter, satu urutan animasi staggered, satu interaksi berbasis gesture, dan adaptasi tata letak responsif.

## Kriteria Penilaian

- **Tugas Modul**: 30% (Latihan implementasi sistem desain, tantangan komposisi widget, demonstrasi teknik animasi).
- **Proyek Tengah Semester**: 30% (Prototipe multi-layar dengan custom painting dan animasi implisit/eksplisit).
- **Proyek Akhir dan Presentasi**: 40% (Polis visual, kualitas animasi, desain interaksi gesture, optimasi kinerja, dan presentasi tinjauan kode).

## Referensi

- **Dokumentasi Resmi**: [Flutter UI](https://docs.flutter.dev/ui), [Flutter Animations](https://docs.flutter.dev/ui/animations)
- **Sumber YouTube**: Saluran YouTube Resmi Flutter, Seri Animasi Flutter, Tutorial Flutter Marcus Ng.
- **Buku**: "Flutter UI Design" oleh Simone Alessandria, "Flutter Animation" oleh David Serrano.
- **Alat**: Rive.app untuk animasi vektor, LottieFiles untuk animasi siap pakai, Flutter DevTools untuk profil kinerja.

---
title: "Silabus Rekayasa Mobile Flutter"
description: "Kurikulum 8 modul yang membawa pengembang dari dasar Dart hingga merilis aplikasi Flutter produksi, mencakup widget, manajemen state, networking, pengujian, performa, rekayasa rilis, dan arsitektur aplikasi."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Mobile Flutter

## Ringkasan

Silabus delapan modul ini dirancang untuk pengembang yang sudah menulis kode dalam setidaknya satu bahasa dan ingin menjadi engineer Flutter yang produktif. Urutannya mengikuti alur kerja produksi yang sebenarnya: fondasi bahasa lebih dulu, lalu model widget, lalu state, lalu batas jaringan, lalu gerbang kualitas (pengujian dan performa), dan terakhir rekayasa rilis serta arsitektur. Setiap modul menghasilkan satu penambahan yang berjalan pada aplikasi yang sama, sehingga peserta tidak pernah mempelajari satu fitur secara terisolasi. Kursus ini sengaja berorientasi framework namun tidak berhenti di framework — setiap modul menjelaskan apa yang Flutter kerjakan untuk Anda dan apa yang sengaja diserahkan kepada Anda, karena batas itulah tempat sebagian besar bug produksi bersembunyi.

Tidak ada modul yang mengasumsikan proyek Flutter sudah ada. Setiap modul dimulai dari baseline yang dapat dijalankan, menambahkan satu kemampuan, dan ditutup dengan checklist tinjauan agar peserta dapat menilai pekerjaannya sendiri sebelum mengumpulkan. Kurva kesulitannya disengaja: modul 1 sampai 4 bersifat terpandu, sedangkan modul 5 sampai 8 secara bertahap menyerahkan lebih banyak keputusan desain.

## Kurikulum

### Modul 1: Dart untuk Pengembang Aplikasi
- **Inti bahasa**: null safety yang sound, `final` versus `const`, inisialisasi `late`, jebakan inferensi tipe
- **Koleksi dan record**: karakteristik performa `List`/`Map`/`Set`, record dan destrukturisasi pola
- **Kelas dan pemodelan data**: konstruktor, factory constructor, pola `copyWith`, kontrak `equality` dan `hashCode`
- **Primitif asinkron**: `Future`, `async`/`await`, `Stream`, `StreamController`, propagasi error antar await
- **Isolate**: kapan event loop tidak lagi cukup, `Isolate.run`, pengiriman pesan, menghindari state mutable bersama
- **Penanganan error**: exception versus tipe hasil sealed, `try`/`catch` pada kode asinkron, `Error` versus `Exception`
- **Latihan**: membangun model domain bertipe dan parser JSON berbasis isolate yang dibandingkan dengan isolate utama

### Modul 2: Model Widget dan Layout
- **Semua adalah widget**: `StatelessWidget` versus `StatefulWidget`, kemurnian `build`, element tree dan render tree
- **Algoritma layout**: constraint mengalir ke bawah dan ukuran mengalir ke atas, biaya `Expanded`, `Flexible`, `IntrinsicHeight`
- **Komposisi dibanding pewarisan**: mengekstrak widget alih-alih method, kapan fungsi builder memperburuk rebuild
- **Scrolling**: `ListView.builder`, `SliverList`, `CustomScrollView`, lazy loading dan caching viewport
- **Styling**: `ThemeData`, `ColorScheme.fromSeed`, text scaling, mode gelap, breakpoint responsif
- **Aksesibilitas pada layout**: label semantics, urutan fokus, perilaku overflow pada skala teks 200%
- **Latihan**: membangun layar dashboard responsif yang tampil benar dari ponsel 320dp hingga tablet

### Modul 3: Manajemen State
- **State lokal**: `setState`, mengangkat state ke atas, objek controller dan pembuangannya
- **InheritedWidget dan Provider**: injeksi dependensi melalui tree, `context.watch` versus `context.read`
- **Riverpod**: provider, `ref.watch`/`ref.listen`, `AsyncValue` untuk state loading dan error, family provider
- **BLoC**: event, state, stream, kapan state machine lebih tepat dibanding provider
- **Memilih perkakas**: ukuran tim, kemudahan pengujian, cakupan rebuild, biaya migrasi — dan mengapa "yang terbaik" bergantung konteks
- **Menguji state**: override `ProviderContainer`, repository fake, memeriksa urutan state yang dipancarkan
- **Latihan**: merefaktor dashboard ke Riverpod dengan state loading, kosong, dan error yang eksplisit

### Modul 4: Networking dan Persistensi Data
- **Klien HTTP**: `package:http` versus `dio`, interceptor, retry, pembatalan request
- **Serialisasi**: `json_serializable`, union `freezed`, penanganan field nullable dan field tak dikenal secara defensif
- **Lapisan repository**: memetakan error transport ke kegagalan domain, menghindari kebocoran status code ke UI
- **Caching**: cache TTL di memori, `shared_preferences`, `sqflite` dan Drift untuk data relasional
- **Offline-first**: sumber kebenaran lokal, antrean sinkronisasi, strategi resolusi konflik
- **Dasar keamanan**: certificate pinning, `flutter_secure_storage` untuk token, rotasi refresh token
- **Latihan**: mengimplementasikan daftar produk yang mendukung offline dengan Drift dan refresh di latar belakang

### Modul 5: Pengujian dan Gerbang Kualitas
- **Unit test**: test Dart murni, fake dibanding mock, menguji jalur error sebaik jalur bahagia
- **Widget test**: `WidgetTester`, `pumpWidget`, `pumpAndSettle`, pencarian berdasarkan key versus teks
- **Golden test**: deteksi regresi rendering, pemuatan font, stabilitas berkas golden di CI
- **Integration test**: `integration_test` di perangkat, menggerakkan navigasi nyata dan fake jaringan
- **Analisis statis**: `analysis_options.yaml`, `flutter_lints`, aturan lint kustom, penegakan di CI
- **Integrasi CI**: caching `pub` dan Gradle, sharding test, penyimpanan artefak golden untuk tinjauan diff
- **Latihan**: mencapai lapisan repository dan widget yang teruji dengan pipeline yang gagal saat cakupan menurun

### Modul 6: Rekayasa Performa
- **Anggaran frame**: 16,6ms pada 60fps, 8,3ms pada 120fps, jank versus jank kompilasi shader
- **Kendali rebuild**: konstruktor `const`, `RepaintBoundary`, `ValueListenableBuilder`, memecah provider
- **DevTools**: performance overlay, timeline trace, atribusi thread UI versus raster
- **Daftar dan gambar**: `itemExtent`, `cacheWidth`/`cacheHeight`, `precacheImage`, batas memori
- **Startup**: deferred component, audit inisialisasi eager, `--trace-startup`
- **Memori**: eviksi image cache, `leak_tracker` di test, snapshot memori DevTools saat beban tinggi
- **Latihan**: memprofil feed yang janky, mengidentifikasi biaya dominan, dan menunjukkan perbaikan yang terukur

### Modul 7: Rekayasa Rilis
- **Mode build**: debug, profile, release; tree shaking ikon; `--obfuscate` dan berkas simbol
- **Android**: konfigurasi signing, Play App Signing, kebijakan `minSdk`/`targetSdk`, App Bundle
- **iOS**: sertifikat dan provisioning profile, TestFlight, jebakan review App Store
- **CI/CD**: Codemagic atau GitHub Actions, cache `pub` dan Gradle, versioning dari `pubspec.yaml`
- **Observabilitas**: Crashlytics/Sentry, logging terstruktur, feature flag untuk rollout bertahap
- **Kepatuhan store**: privacy manifest, deklarasi data safety, persentase rollout bertahap
- **Latihan**: merilis build bertanda tangan ke track internal dan build TestFlight dari CI

### Modul 8: Arsitektur dalam Skala Besar
- **Pelapisan**: lapisan presentation, domain, dan data; arah dependensi dan kontrak batas
- **Struktur feature-first**: tata letak folder yang bertahan saat tim tumbuh, menghindari folder `utils` sebagai tempat sampah
- **Navigasi**: `Navigator 2.0`, `go_router`, deep link, guard, restorasi state
- **Injeksi dependensi**: injeksi konstruktor lebih dulu, kapan service locator merusak testabilitas dan mengapa
- **Lokalisasi dan aksesibilitas**: `flutter_localizations`, berkas ARB, semantics, ukuran target sentuh minimum
- **Refactoring aman**: ekstraksi seam, migrasi berjalan paralel, kebijakan deprecation tertulis
- **Latihan**: merestrukturisasi proyek akhir menjadi modul fitur dengan batas terdokumentasi dan router

## Proyek Akhir

Peserta membangun **Fieldnotes**, aplikasi pengumpulan data lapangan yang offline-first. Cakupan wajib: model domain bertipe dengan abstraksi repository; alur dashboard dan detail yang dirender responsif; state Riverpod atau BLoC dengan state error dan kosong yang eksplisit; persistensi lokal di Drift yang disinkronkan dengan backend REST, termasuk antrean retry untuk penulisan yang gagal; unit test, widget test, dan golden test yang berjalan di CI; layar daftar terprofil tanpa jank pada 60fps; build rilis bertanda tangan yang didistribusikan lewat track internal; serta dokumen arsitektur singkat yang menjelaskan batas lapisan, navigasi, dan kebijakan konflik offline. Penilaian menekankan seberapa baik lapisan tetap terpisah saat ditinjau, bukan jumlah fitur.

## Kriteria Penilaian

- **Tugas modul**: delapan penambahan kecil, masing-masing dinilai dari kebenaran, gaya Flutter idiomatik, dan cakupan pengujian jalur kegagalan — 40% dari nilai akhir.
- **Kuis**: tiga kuis singkat tentang siklus hidup widget, trade-off manajemen state, dan anggaran frame — 15%.
- **Code review**: dua tinjauan sejawat (modul 4 dan 7) dinilai dari kualitas dan kekhususan umpan balik — 10%.
- **Proyek Akhir**: berbobot arsitektur (25%), pengujian dan CI (20%), bukti performa (20%), serta kesiapan rilis (20%) — 35%.
- **Ambang lulus**: semua gerbang kualitas hijau di CI, tidak ada error asinkron yang tak tertangani pada build terprofil, dan jalur offline terbukti bekerja dengan jaringan dimatikan.

## Referensi

- [Dokumentasi Flutter](https://docs.flutter.dev/)
- [Tur Bahasa Dart](https://dart.dev/language)
- [Katalog Widget Flutter](https://docs.flutter.dev/ui/widgets)
- [Dokumentasi Riverpod](https://riverpod.dev/docs/introduction/getting_started)
- [Dokumentasi BLoC Library](https://bloclibrary.dev/)
- [Praktik Terbaik Performa Flutter](https://docs.flutter.dev/perf/best-practices)
- [Ikhtisar Pengujian Flutter](https://docs.flutter.dev/testing/overview)
- [DevTools — Tampilan Performance](https://docs.flutter.dev/tools/devtools/performance)
- [Deployment Flutter — Android](https://docs.flutter.dev/deployment/android)
- [Deployment Flutter — iOS](https://docs.flutter.dev/deployment/ios)
- [Effective Dart](https://dart.dev/effective-dart)

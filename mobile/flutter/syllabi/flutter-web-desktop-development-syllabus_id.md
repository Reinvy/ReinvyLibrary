---
title: "Silabus Pengembangan Flutter Web dan Desktop"
description: "Kurikulum berbasis proyek untuk mengirim aplikasi Flutter melampaui mobile — aplikasi web responsif, aplikasi desktop untuk Windows, macOS, dan Linux, serta pengetahuan rendering, perkakas, dan deployment yang membuat pengiriman multi-platform menjadi andal."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Flutter Web dan Desktop

## Ringkasan

Silabus ini membimbing peserta didik yang sudah menguasai Flutter mobile untuk memasuki dunia web dan desktop. Materi mencakup cara pohon widget yang sama dirender di setiap platform, strategi tata letak responsif, integrasi platform (API browser, sistem berkas, manajemen jendela), serta jalur deployment modern untuk web dan tiga sistem operasi desktop. Setiap modul memadukan konsep dengan pembangunan langsung, dan kursus diakhiri dengan aplikasi web + desktop kelas produksi yang dikirim untuk minimal dua platform.

## Kurikulum

### Modul 1: Model Multi-Platform Flutter
- **Bagaimana Flutter merender di mana saja**: rendering Skia/Impeller, pipeline widget → elemen → render object, dan alasan kode UI portabel sementara platform channel tidak.
- **Target yang didukung**: Android, iOS, web (HTML renderer vs CanvasKit vs skwasm), Windows, macOS, Linux, dan embedded.
- **Anatomi proyek**: scaffolding platform `flutter create`, folder runner `web/`, serta import kondisional dengan `dart:io` vs `dart:html` vs abstraksi seperti `universal_io`.

### Modul 2: Arsitektur Tata Letak Responsif
- **Breakpoint dan ukuran**: `MediaQuery`, `LayoutBuilder`, `OrientationBuilder`, dan model `BoxConstraints`.
- **Widget adaptif**: pola untuk master-detail, navigation rail vs bottom navigation, dan tabel data responsif.
- **Grid dan tipografi**: daftar responsif berbasis sliver, `SliverGridDelegateWithMaxCrossAxisExtent`, dan skala tipe yang mengalir ulang pada berbagai lebar.

### Modul 3: Esensi Flutter Web
- **Mesin rendering web**: memilih antara HTML renderer dan CanvasKit, trade-off performa, dan pemuatan font web.
- **Routing dan deep link**: integrasi web `go_router`, strategi URL (hash vs path), serta perilaku riwayat/tombol kembali browser.
- **SEO dan dukungan crawler**: HTML semantik, `Semantics` kustom, meta tag, tag `og:`, dan opsi prerendering.
- **API khusus web**: interop `package:web`, penyimpanan browser (localStorage, IndexedDB via `idb_shim`), dan event listener.

### Modul 4: Jendela dan Lifecycle Desktop
- **Manajemen jendela**: API `window_manager` — ukuran, posisi, maximize/minimize, fullscreen, dan title bar kustom.
- **Lifecycle aplikasi**: event lifecycle khusus desktop, shutdown vs minimisasi aplikasi, dan penerapan single-instance.
- **Banyak jendela**: arsitektur multi-jendela dengan `desktop_multi_window` dan kapan arsitektur ini tepat digunakan.

### Modul 5: Integrasi Lokal — Berkas, Menu, dan Pintasan
- **Akses berkas**: `file_picker`, `path_provider`, dan pola dialog berkas yang aman.
- **Menu dan tray**: menu bar native dengan `menu_bar`, ikon system tray, dan context menu.
- **Keyboard dan mouse**: sistem `Shortcuts`/`Actions`/`Focus`, pintasan keyboard, status hover, dan kustomisasi kursor mouse.

### Modul 6: Platform Channel dan Interop
- **Method channel dan Pigeon**: pembuatan kode type-safe dengan Pigeon dan debugging channel dari ujung ke ujung.
- **FFI dan interop JS**: memanggil pustaka C native dan JavaScript browser dengan `dart:ffi` serta `package:web`.
- **Abstraksi lintas platform**: menyembunyikan perbedaan platform di balik interface dan dependency injection.

### Modul 7: State dan Persistensi Lintas Platform
- **Tinjauan state management**: pola Riverpod dan Bloc yang tidak bergantung platform.
- **Strategi persistensi**: shared_preferences, Drift/SQLite, dan Hive di berbagai mesin penyimpanan web/desktop.
- **Offline dan caching**: service worker di web, lapisan caching lokal, dan sinkronisasi latar belakang.

### Modul 8: Fitur Desktop Kelas Atas
- **Integrasi sistem**: membuka URL dan berkas eksternal dengan `url_launcher`, menjalankan perintah sistem, dan variabel lingkungan.
- **Notifikasi**: notifikasi lokal lintas platform (`flutter_local_notifications`).
- **High-DPI dan aksesibilitas**: penanganan rasio piksel, penskalaan teks, dan pohon aksesibilitas platform.

### Modul 9: Rekayasa Performa untuk Web dan Desktop
- **Performa startup**: tree shaking, deferred loading (`deferred as`), code splitting di web, dan implikasi AOT.
- **Anggaran frame**: menghindari jank tata letak, penempatan `RepaintBoundary`, dan jank kompilasi shader di desktop.
- **Perkakas profiling**: frame chart DevTools, performance overlay, dan profiling memori per platform.

### Modul 10: Pengujian Lintas Platform
- **Unit dan widget test**: menjaga logika tetap netral platform agar satu rangkaian pengujian dapat dipakai bersama.
- **Integration dan golden test**: golden test akurat per piksel per platform, dan `flutter drive` di desktop.
- **Runner pengujian web dan desktop**: menjalankan pengujian headless di Chrome, Edge, dan shell desktop; konfigurasi matriks CI.

### Modul 11: Build, Tanda Tangan, dan Deployment
- **Deployment web**: rilis ke hosting statis (Firebase Hosting, Netlify, Vercel), caching CDN, dan pipeline continuous delivery.
- **Pengemasan desktop**: `msix` untuk Windows, `dmg`/`pkg` untuk macOS, serta AppImage/deb/snap untuk Linux.
- **Penandatanganan dan notarisasi**: code signing, Authenticode Windows, notarisasi macOS dengan `xcrun notarytool`, dan mekanisme pembaruan.

### Modul 12: Capstone — Mengirim Produk Multi-Platform
- **Definisi produk**: pilih perkakas produktivitas atau data (misalnya aplikasi catatan local-first, dashboard, atau admin console internal).
- **Rencana build**: UI responsif, target web + satu desktop, platform channel sesuai kebutuhan, dan pengujian.
- **Daftar periksa rilis**: anggaran performa, pemeriksaan aksesibilitas, penandatanganan/notarisasi, dan rilis bertahap.

## Proyek Akhir

Peserta didik membangun dan mengirim aplikasi web + desktop secara lengkap. Hasil akhir harus mencakup:

- Tata letak responsif yang bekerja dari lebar ponsel hingga lebar desktop.
- Build web yang berfungsi dan di-deploy ke URL publik (hosting statis) dengan routing dan meta tag SEO yang benar.
- Build desktop untuk **dua** platform dari Windows, macOS, atau Linux, lengkap dengan pengemasan dan penandatanganan.
- Minimal satu integrasi platform yang mendalam (akses berkas, fitur jendela native, menu tray, atau platform channel native yang didefinisikan dengan Pigeon).
- Rangkaian pengujian otomatis yang lulus dan anggaran performa yang terdokumentasi.

## Kriteria Penilaian

- **Tugas**: 30% — latihan tata letak responsif, latihan deployment web, dan tugas jendela/persistensi desktop.
- **Kuis**: 10% — arsitektur rendering, mekanika platform channel, dan aturan pengemasan.
- **Proyek Akhir & Presentasi**: 60% — kebenaran multi-platform, kualitas integrasi platform, performa dalam anggaran, kebersihan kode, dan demo langsung di depan kelas.

## Referensi

- **Dokumentasi Resmi**: [flutter.dev/multi-platform](https://flutter.dev/multi-platform), [Flutter web renderers](https://docs.flutter.dev/platform-integration/web/renderers), [Desktop support](https://docs.flutter.dev/platform-integration/desktop)
- **Referensi API**: [package:web](https://pub.dev/documentation/web), [window_manager](https://pub.dev/packages/window_manager), [Pigeon](https://pub.dev/packages/pigeon), [go_router](https://pub.dev/packages/go_router)
- **Buku**: "Flutter in Action" oleh Eric Windmill; "Pragmatic Flutter" oleh Priyanka Tyagi
- **Talks**: sesi multi-platform Flutter Forward dan Flutter Engage di kanal YouTube resmi Flutter

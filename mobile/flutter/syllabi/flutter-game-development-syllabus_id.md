---
title: "Silabus Pengembangan Game Flutter"
description: "Kurikulum tingkat lanjut untuk membangun game 2D berkualitas produksi dengan Flutter dan mesin game Flame — game loop dan sistem komponen, sprite dan animasi, fisika dengan Forge2D, penanganan input, audio, partikel dan shader, multipemain, monetisasi, dan penerbitan ke toko aplikasi."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Game Flutter

## Ringkasan

Silabus ini melatih peserta didik untuk membangun game 2D yang lengkap dan halus menggunakan Flutter dengan mesin game Flame. Kurikulum ini melampaui aplikasi UI biasa menuju rendering waktu nyata, game loop, arsitektur komponen, simulasi fisika, dan integrasi game spesifik platform. Selama dua belas modul, peserta didik berkembang dari game loop minimal hingga game berkelas arkade yang utuh: sprite dan animasi, fisika Forge2D, input multi-sentuh dan keyboard, audio prosedural, efek partikel dan shader, kamera dan latar paralaks, sistem penyimpanan, papan peringkat dan multipemain waktu nyata, profiling performa, serta monetisasi. Kurikulum ini berorientasi praktik — setiap modul diakhiri dengan hasil karya yang dapat dimainkan, dan proyek akhirnya adalah game lengkap yang siap dirilis ke Play Store dan App Store.

## Kurikulum

### Modul 1: Fundamental Game dan Mesin Flame
- **Game Loop**: Cara kerja game waktu nyata — siklus update dan render, delta time, timestep tetap vs variabel, dan independensi frame-rate.
- **Dasar-dasar Flame**: Menyiapkan paket `flame`, widget inang `GameWidget`, siklus hidup kelas `Game` (`onLoad`, `update`, `render`), dan menjalankan jendela game pertama.
- **Sistem Komponen**: `Component`, `PositionComponent`, `SpriteComponent`, dan hierarki transform induk-anak yang menata setiap game Flame.
- **Arsitektur Proyek**: Mengorganisasi proyek game — folder untuk komponen, sistem, aset, level, dan audio; memisahkan logika game dari widget UI.

### Modul 2: Rendering, Sprite, dan Animasi
- **Sprite dan SpriteSheet**: Memuat gambar dengan `Sprite` dan `SpriteSheet`, mengekstrak frame, dan mengelola texture atlas untuk efisiensi memori.
- **Animasi**: `SpriteAnimationComponent` dan `SpriteAnimationGroupComponent`, frame rate, serta perpindahan antar status idle, lari, lompat, dan serang.
- **Efek Visual**: Sistem efek — `ScaleEffect`, `MoveEffect`, `RotateEffect`, `OpacityEffect`, `SequenceEffect`, dan `ParallelEffect` untuk menambah "juice" tanpa kode tween manual.
- **Lapisan dan Urutan Rendering**: `CompositionLayer` dan urutan gambar, latar belakang, latar depan, serta urutan overlay untuk kesan kedalaman.

### Modul 3: Logika Game Loop dan Tabrakan
- **Logika Update**: Menggerakkan entitas dengan kecepatan dan percepatan di `update(double dt)`, membatasi posisi ke batas layar, dan kondisi game over.
- **Timer dan Spawning**: `TimerComponent` Flame, memunculkan gelombang musuh, object pooling untuk peluru dan partikel, serta penskalaan tingkat kesulitan.
- **Deteksi Tabrakan**: Tipe `Hitbox` (lingkaran, poligon, persegi), `CollisionCallbacks` (`onCollisionStart`, `onCollisionEnd`), dan filter tabrakan untuk lapisan pemain, musuh, dan proyektil.
- **Sistem Gameplay**: Pencatatan skor, nyawa, sistem kombo, dan menyusun aturan permainan sebagai sistem yang dapat diuji, bukan kode komponen yang tersebar.

### Modul 4: Fisika dengan Forge2D
- **Integrasi Forge2D**: Menambahkan `flame_forge2d` ke game Flame, `Forge2DGame.world`, dan konversi antara koordinat dunia Flutter dan meter fisika.
- **Bodies dan Fixtures**: Tipe `BodyDef` (statis, dinamis, kinematis), bentuk, densitas, friksi, dan restitusi untuk pergerakan, lompatan, dan gesekan yang realistis.
- **Joints dan Constraints**: Revolute, prismatic, distance, dan weld joint untuk ragdoll, rantai, pivot, dan platform bergerak.
- **Penanganan Kontak**: Callback `ContactListener`, memfilter kontak berdasarkan nama body, dan mereaksikan tabrakan menjadi peristiwa gameplay (kerusakan, item, pantulan).

### Modul 5: Penanganan Input
- **Input Pointer dan Sentuhan**: `TapCallbacks`, `DragCallbacks`, dan `PanCallbacks`, konversi koordinat layar ke koordinat dunia, serta dukungan multi-sentuh.
- **Keyboard dan Mouse**: `KeyboardEvents`, pergerakan tombol wasd/panah, dan penargetan dengan mouse untuk build desktop dan web.
- **Dukungan Gamepad**: Jembatan `flame_gamepad` untuk kontroler fisik di platform Android, iOS, dan desktop.
- **Input UI vs Game**: Menggabungkan gesture Flutter dengan input Flame, tombol sebagai widget overlay, dan prioritas input selama menu dan cutscene.

### Modul 6: Audio dan Polish
- **Musik Latar dan Efek Suara**: `AudioPool` dan `AudioPlayer` untuk pemutaran efisien, memuat aset dari `assets/audio`, dan meredam musik saat suara UI.
- **Audio Prosedural**: Membangkitkan efek suara sederhana dengan pustaka `dart_melty_soundfont` dan osilator untuk prototipe tanpa placeholder.
- **Juice dan Umpan Balik**: Guncangan layar, kilatan saat terkena serangan, teks skor melayang, dan umpan balik haptic dengan `HapticFeedback` agar gameplay terasa responsif.
- **Aksesibilitas dalam Game**: Palet ramah buta warna, tingkat audio yang dapat dikonfigurasi, opsi jeda dan aksesibilitas, serta pertimbangan reduced-motion.

### Modul 7: Status Game, Penyimpanan, dan Level
- **State Machine Game**: Memodelkan status menu, bermain, jeda, game over, dan level selesai dengan state machine yang eksplisit.
- **Persistence**: Menyimpan skor tertinggi, level terbuka, dan pengaturan dengan `shared_preferences`, `hive`, atau `sqflite`; serialisasi JSON file simpan.
- **Data Desain Level**: Mendefinisikan level sebagai data (format peta Tiled dengan `flame_tiled`, atau JSON) dan memuatnya saat runtime dengan factory `Component`.
- **Checkpoint dan Replayability**: Sistem checkpoint, nyawa dan lanjut bermain, serta progresi membuka konten agar pemain tetap terlibat antar sesi.

### Modul 8: Rendering Lanjutan — Partikel, Shader, dan Kamera
- **Sistem Partikel**: `ParticleSystemComponent` Flame, variasi `Particle` (lingkaran, sprite, computed), dan konfigurasi efek ledakan, asap, hujan, serta jejak.
- **Shader**: Fragment shader dengan `flame_shaders` atau GLSL kustom, efek glow dan distorsi, serta pemanasan shader untuk menghindari jeda frame pertama.
- **Kamera dan Scrolling**: `CameraComponent` dengan target ikut, zoom, guncangan, dan penanganan viewport; latar paralaks dengan `ParallaxComponent`.
- **Custom Painting**: Integrasi `CustomPainter` untuk terrain prosedural, minimap, dan elemen HUD yang dirender langsung ke kanvas game.

### Modul 9: Multipemain, Papan Peringkat, dan Layanan
- **Papan Peringkat dan Prestasi**: Integrasi Firebase, Google Play Games Services, dan Game Center untuk skor dan prestasi.
- **Multipemain Waktu Nyata**: Ruang berbasis WebSocket dengan `web_socket_channel`, logika server yang otoritatif, interpolasi klien, dan kompensasi latensi.
- **Mode Bergiliran dan Async**: Pola multipemain asinkron (pass-and-play, cloud save) dan penanganan koneksi ulang untuk jaringan seluler.
- **Autentikasi dan Anti-Cheat**: Autentikasi anonim untuk tamu, token sesi, dan validasi skor di sisi server untuk mencegah kecurangan lokal.

### Modul 10: Optimasi Performa dan Profiling
- **Anggaran Frame**: Memahami anggaran frame 16 ms, pengurangan draw-call, dan menghindari alokasi per frame di `update` dan `render`.
- **Manajemen Aset dan Memori**: Caching `Image`, membuang sprite yang tidak terpakai, kompresi texture atlas, dan menghindari jebakan `RepaintBoundary` layar penuh.
- **Alat Profiling**: Menggunakan Flutter DevTools (grafik frame, memori, CPU), performance overlay, serta `FpsComponent` dan pelacakan step-time Flame.
- **Isolate untuk Kerja Berat**: `Isolate.run` untuk generasi prosedural, pathfinding, dan kompresi file simpan di luar thread UI.

### Modul 11: Monetisasi, Analitik, dan Ekonomi Game
- **Integrasi Iklan**: Setup `google_mobile_ads` — iklan banner, interstitial, dan rewarded yang ditempatkan tanpa merusak alur permainan.
- **Pembelian Dalam Aplikasi**: `in_app_purchase` untuk consumable (koin, nyawa), non-consumable (versi penuh), dan langganan; validasi tanda terima pembelian.
- **Desain Ekonomi Game**: Menyeimbangkan sumber dan sasaran mata uang, monetisasi kosmetik vs pay-to-win, serta loop retensi pemain.
- **Analitik**: Peristiwa game Firebase Analytics (mulai/selesai level, tayangan iklan, pembelian), analisis funnel, dan pengujian A/B tuning ekonomi.

### Modul 12: Pengujian dan Penerbitan
- **Menguji Logika Game**: Unit test untuk skor, aturan tabrakan, dan state machine; widget test untuk HUD dan menu; integration test dengan `integration_test` yang menjalankan game loop.
- **CI/CD untuk Game**: Pipeline GitHub Actions / Codemagic yang menjalankan analisis, pengujian, dan membangun artefak rilis bertanda tangan untuk Android dan iOS.
- **Penerbitan ke Toko**: Trek rilis Play Console dan App Store Connect, materi listing toko (screenshot, trailer), rating konten, dan deklarasi privasi untuk data game.
- **Manajemen Rilis**: Daftar periksa pra-rilis, peluncuran bertahap, pemantauan crash dengan Crashlytics, dan pembaruan konten pasca-peluncuran.

## Proyek Akhir

Peserta didik akan merancang, membangun, dan menerbitkan game 2D lengkap pilihan mereka (platformer, endless runner, top-down shooter, atau game arkade puzzle). Cakupan proyek yang disarankan:

- **Gameplay Inti**: Game pemain tunggal yang halus dengan minimal tiga level atau tingkat kesulitan meningkat, diimplementasikan dengan sistem komponen Flame dan menampilkan fisika, tabrakan, audio, serta minimal satu efek visual lanjutan (partikel, shader, atau kamera paralaks).
- **Sistem Meta**: Sistem penyimpanan dengan skor tertinggi dan progres terbuka, alur jeda/menu, serta satu integrasi layanan daring (papan peringkat, prestasi, atau multipemain waktu nyata sebagai bonus).
- **Monetisasi dan Analitik**: Iklan rewarded atau pembelian dalam aplikasi yang terintegrasi tanpa menurunkan kualitas gameplay, plus peristiwa analitik untuk penyelesaian level dan retensi.
- **Kesiapan Rilis**: Game diuji (unit + widget + minimal satu integration test), pipeline CI hijau, performa dalam anggaran frame di perangkat kelas menengah, dan dikirim ke trek tertutup Play atau TestFlight.

## Kriteria Penilaian

- **Tugas**: 40% — dua belas latihan praktik (satu per modul): game loop yang berfungsi, karakter pemain beranimasi, demo tabrakan, sandbox fisika, game input multi-sentuh, efek reaktif audio, sistem simpan/muat, scene partikel, unggah skor jaringan, build teroptimasi profiling, integrasi iklan/IAP, dan rangkaian pengujian logika game.
- **Proyek Akhir**: 60% — Evaluasi game yang selesai: kelengkapan dan keseruan gameplay, arsitektur kode dan penggunaan sistem komponen, kebenaran fisika dan input, polish visual dan audio, performa di perangkat target, kesiapan toko, serta kualitas dokumentasi desain dan pengujian yang menyertainya.

## Referensi

- **Dokumentasi Resmi**: [https://docs.flame-engine.org](https://docs.flame-engine.org), [https://flutter.dev/games](https://flutter.dev/games)
- **Firebase untuk Game**: Dokumentasi Firebase (Firestore realtime, Authentication, Analytics, Remote Config), Dokumentasi Google Play Games Services.
- **Fisika dan Audio**: Dokumentasi GitHub dan API Forge2D, dokumentasi paket dart_melty_soundfont.
- **Penerbitan**: Bantuan Google Play Console, Dokumentasi App Store Connect, pedoman privasi apple.com untuk game.
- **Komunitas**: Discord dan GitHub Discussions Flame, tutorial "Game Development with Flame" dari tim Flame dan Flutter.

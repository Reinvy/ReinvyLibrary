---
title: "Silabus Pemrograman Flutter"
description: "Rancangan kurikulum komprehensif mulai dari pemrograman Dart dasar hingga pembuatan dan penerbitan aplikasi mobile cross-platform menggunakan Flutter."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Pemrograman Flutter

## Ringkasan

Silabus ini menguraikan jalur belajar komprehensif untuk menguasai Flutter, framework UI dari Google untuk membangun aplikasi cross-platform. Peserta akan belajar bahasa pemrograman Dart, membuat tampilan UI dasar dan tingkat lanjut, menguasai pengelolaan state, hingga menerbitkan aplikasi ke app store.

## Kurikulum

### Modul 1: Pengenalan & Dasar-dasar Dart
- **Pengenalan Flutter**: Sejarah, kelebihan arsitektur cross-platform, dan instalasi Flutter SDK.
- **Pemrograman Dart**: Variabel, tipe data, control flow, fungsi, Object-Oriented Programming (OOP), pemrograman asinkron (Futures, Stream, async/await).

### Modul 2: Fondasi UI Flutter & Navigasi
- **Sistem Widget**: StatelessWidget vs StatefulWidget, BuildContext, hierarki widget.
- **Widget UI Dasar**: Container, Text, Row, Column, Image, ElevatedButton.
- **Layout & Scrolling**: Stack, Positioned, ListView, GridView, pengaturan margin/padding.
- **Navigasi**: Rute dasar, named routes, dan pengiriman argumen antar halaman.

### Modul 3: Pengelolaan State (State Management)
- **State Dasar**: Penggunaan setState dan siklus hidup (lifecycle) StatefulWidget.
- **Pola Provider**: Penggunaan ChangeNotifierProvider, Consumer, Selector.
- **BLoC & Riverpod**: Konsep inti, aliran Event-to-State, dan pemilihan state management yang tepat untuk skala besar.

### Modul 4: Integrasi API & Penyimpanan Lokal
- **Jaringan (Networking)**: Pemanggilan API HTTP (menggunakan http/dio), parsing JSON, dan rendering data dinamis.
- **Penyimpanan Lokal**: Shared Preferences, SQLite, Hive.

### Modul 5: Jembatan Native & Optimalisasi
- **Platform Channels**: Komunikasi dengan kode native Java/Kotlin (Android) dan Swift (iOS).
- **Performa**: Profiling, debugging lag UI, dan optimalisasi penggunaan memori.
- **Pengujian**: Unit testing, Widget testing, dan Integration testing.

## Proyek Akhir

Peserta didik akan membangun aplikasi mobile lengkap yang siap rilis (misalnya, e-commerce, cuaca, atau obrolan) yang memenuhi ketentuan:
- Terkoneksi dengan RESTful API eksternal.
- Menggunakan database lokal untuk penyimpanan offline.
- Menerapkan Riverpod atau BLoC untuk pengelolaan state.
- Mengikuti arsitektur kode Clean Architecture.

## Kriteria Penilaian

- **Tugas & Kuis**: 30% (Dasar pemrograman Dart, tugas tata letak UI).
- **Proyek Menengah**: 20% (Aplikasi multi-halaman dengan integrasi data lokal).
- **Proyek Akhir & Presentasi**: 50% (Fungsionalitas aplikasi, kualitas kode, presentasi demo aplikasi, dan review kode).

## Referensi

- **Dokumentasi Resmi**: [https://flutter.dev/docs](https://flutter.dev/docs)
- **Kanal YouTube**: Flutter Official YouTube Channel, CodeWithAndrea.
- **Buku**: "Flutter in Action" oleh Eric Windmill.

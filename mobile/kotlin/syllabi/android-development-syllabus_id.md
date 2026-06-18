---
title: "Silabus Pengembangan Android"
description: "Kurikulum terstruktur 12 minggu untuk mempelajari pengembangan aplikasi Android dengan Kotlin, dari dasar hingga proyek kapstone."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Android

## Ringkasan

Silabus 12 minggu ini menyediakan kurikulum komprehensif berbasis proyek untuk menguasai pengembangan Android dengan Kotlin. Ini mencakup seluruh stack Android modern: dasar-dasar bahasa Kotlin, perkakas Android Studio, UI Jetpack Compose, persistensi data, jaringan, injeksi dependensi, pengujian, integrasi Firebase, optimasi performa, dan berpuncak pada proyek kapstone. Kurikulum ini dirancang untuk pengembang dengan pengalaman pemrograman dasar yang ingin membangun aplikasi Android siap produksi menggunakan praktik terbaik terkini.

## Kurikulum

### Minggu 1: Dasar-Dasar Kotlin
- **Dasar Kotlin**: val/var, inferensi tipe, string, dan tipe dasar
- **Aliran kontrol**: if, when, for, while
- **Fungsi**: argumen bernama, parameter default, fungsi ekstensi
- **Kotlin berorientasi objek**: kelas, pewarisan, interface, data class, sealed class
- **Null safety**: tipe nullable, safe call, operator Elvis, non-null assertion
- **Praktik**: Bangun aplikasi CLI sederhana dengan Kotlin

### Minggu 2: Android Studio dan Gradle
- **Pengaturan Android Studio**: SDK manager, AVD manager, konfigurasi emulator
- **Struktur proyek**: manifes, resource, file build Gradle
- **Gradle Kotlin DSL**: plugin, dependensi, varian produk, tipe build
- **AGP (Android Gradle Plugin)**: konfigurasi, katalog versi
- **Praktik**: Buat aplikasi Hello World dengan beberapa varian build

### Minggu 3: Dasar-Dasar Jetpack Compose
- **Filosofi Compose**: UI deklaratif, fungsi composable, rekomposisi
- **Composable dasar**: Text, Button, Image, TextField, Icon
- **Composable tata letak**: Column, Row, Box, Scaffold
- **Modifier**: ukuran, padding, perataan, clickable, background, border
- **State di Compose**: remember, mutableStateOf, rememberSaveable
- **Praktik**: Bangun aplikasi counter dan komponen kartu profil

### Minggu 4: Material Design 3 dan Theming
- **Material Design 3**: Material You, warna dinamis, tipografi, bentuk
- **Theming**: skema warna terang/gelap, tema kustom
- **Komponen Material**: TopAppBar, NavigationBar, Card, FloatingActionButton, BottomSheet
- **Daftar dan grid**: LazyColumn, LazyRow, LazyVerticalGrid
- **Praktik**: Bangun aplikasi daftar tugas dengan theming Material Design 3

### Minggu 5: Navigasi
- **Navigation Component**: NavHost, NavController, rute
- **Meneruskan argumen**: NavArgs, argumen serializable/parcelable
- **BottomNavigation dan NavigationBar**: navigasi multi-tab
- **Graph navigasi bersarang**: navigasi modular
- **Deep linking**: navigasi berbasis intent
- **Praktik**: Bangun aplikasi multi-layar dengan navigasi bawah

### Minggu 6: Persistensi Data — Room dan DataStore
- **Room database**: Entity, DAO, Database, TypeConverters
- **Relasi Room**: satu-ke-satu, satu-ke-banyak, banyak-ke-banyak
- **Migrasi**: pembuatan versi skema dan migrasi data
- **DataStore Preferences**: penyimpanan key-value untuk pengaturan
- **DataStore Proto**: penyimpanan data bertipe dengan Protocol Buffers
- **Praktik**: Bangun aplikasi catatan dengan persistensi Room

### Minggu 7: Jaringan dan Pekerjaan Latar Belakang
- **Retrofit**: pengaturan, interceptor, konverter, penanganan error
- **Serialisasi Kotlin**: kotlinx.serialization dengan JSON
- **WorkManager**: tugas latar belakang, kendala, merantai worker
- **OkHttp**: interceptor, caching, timeout
- **Chucker**: inspector HTTP untuk debugging
- **Praktik**: Bangun aplikasi cuaca mengambil data dari API publik

### Minggu 8: Injeksi Dependensi dengan Hilt
- **Konsep DI**: DI manual vs Dagger vs Hilt
- **Pengaturan Hilt**: @HiltAndroidApp, @AndroidEntryPoint, @HiltViewModel
- **Modul dan provider**: @Module, @Provides, @Binds, @Singleton
- **Qualifier**: @Named, qualifier kustom
- **Injeksi ViewModel**: @HiltViewModel dengan SavedStateHandle
- **Praktik**: Refaktor aplikasi cuaca untuk menggunakan Hilt DI

### Minggu 9: Pengujian
- **Unit test**: JUnit 5, Mockito, Turbine untuk pengujian Flow
- **Pengujian ViewModel**: TestDispatcher, runTest, asersi StateFlow
- **Pengujian Repository**: API palsu, database Room in-memory
- **Pengujian UI Compose**: createComposeRule, SemanticsMatchers, onNodeWithText
- **Pengujian ujung-ke-ujung**: Espresso, Compose Test dengan Navigation
- **Praktik**: Tulis unit test dan UI test untuk aplikasi catatan

### Minggu 10: Integrasi Firebase
- **Pengaturan Firebase**: konfigurasi proyek, google-services.json
- **Authentication**: email/password, Google Sign-In, auth anonim
- **Cloud Firestore**: koleksi, dokumen, listener real-time, persistensi offline
- **Firebase Cloud Messaging**: notifikasi push, saluran notifikasi
- **Firebase Analytics**: pelacakan event, properti pengguna
- **Praktik**: Tambahkan autentikasi dan sinkronisasi real-time ke aplikasi tugas

### Minggu 11: Performa dan Optimasi
- **Android Profiler**: CPU, memori, jaringan, profiling energi
- **Manajemen memori**: LeakCanary, kebocoran memori, garbage collection
- **Pemuatan gambar**: Coil vs Glide, caching disk, strategi placeholder
- **Baseline Profiles**: membuat dan mengintegrasikan profil startup
- **Optimasi daftar lazy**: key, tipe konten, animasi item
- **ProGuard/R8**: pengecilan, obfuskasi, aturan optimasi
- **Praktik**: Profil dan optimasi waktu startup aplikasi cuaca

### Minggu 12: Proyek Kapstone
- **Perencanaan proyek**: kebutuhan, wireframe, desain arsitektur
- **Implementasi**: MVVM + Clean Architecture penuh dengan Hilt
- **Penyelesaian fitur**: navigasi, persistensi data, jaringan
- **Pengujian**: unit test, UI test, QA manual
- **Deployment Play Store**: AAB yang ditandatangani, daftar toko, rilis bertahap
- **Presentasi**: demo, review kode, dokumentasi

## Proyek Akhir

Siswa akan membangun aplikasi Android lengkap sesuai pilihan mereka (misalnya, pelacak kebugaran, manajer pengeluaran, atau buku resep) yang menunjukkan penguasaan terhadap:

- UI Jetpack Compose dengan theming Material Design 3
- Navigasi multi-layar dengan BottomNavigation
- Room database dengan minimal dua entitas terkait
- Retrofit networking dengan API REST nyata
- Injeksi dependensi Hilt di seluruh aplikasi
- ViewModel + StateFlow untuk manajemen state
- Unit test dan Compose UI test
- Firebase Authentication dan Firestore (atau yang setara)
- Build rilis dengan optimasi ProGuard/R8
- Dipublikasikan sebagai alpha closed-track di Google Play Console

## Kriteria Penilaian

- **Tugas (40%)**: 10 latihan pengkodean mingguan dinilai berdasarkan kebenaran, kualitas kode, dan kepatuhan pada praktik terbaik (masing-masing 4%).
- **Kuis (10%)**: Dua kuis online yang mencakup sintaks Kotlin, arsitektur Android, dan pengetahuan konseptual.
- **Proyek Akhir (50%)**: Dievaluasi berdasarkan:
  - Fungsionalitas dan kelengkapan (20%)
  - Arsitektur dan organisasi kode (15%)
  - Kualitas desain UI/UX (10%)
  - Cakupan pengujian (5%)

## Referensi

- [Dokumentasi Resmi Android Developers](https://developer.android.com/docs)
- [Dokumentasi Bahasa Kotlin](https://kotlinlang.org/docs/home.html)
- [Dokumen Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Panduan Material Design 3](https://m3.material.io/)
- [Google Codelabs untuk Android](https://codelabs.developers.google.com/?cat=android)
- [Panduan Arsitektur Android](https://developer.android.com/topic/architecture)

---
title: "Silabus Pengembangan React Native"
description: "Kurikulum komprehensif 12 minggu yang mencakup React Native dari dasar hingga deployment produksi, termasuk manajemen state, navigasi, modul native, dan publikasi ke toko aplikasi."
category: "frontend"
technology: "react-native"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan React Native

## Ringkasan

Silabus 12 minggu ini dirancang untuk pengembang yang ingin menguasai React Native untuk pengembangan aplikasi mobile lintas platform. Dimulai dari penyiapan lingkungan pengembangan dan konsep inti, kurikulum ini berlanjut melalui navigasi, manajemen state, API perangkat native, optimasi performa, pengujian, dan diakhiri dengan proyek kapstone yang dipublikasikan ke toko aplikasi. Setiap modul menggabungkan fondasi teoretis dengan latihan coding langsung dan pengerjaan proyek dunia nyata.

Di akhir kursus ini, peserta akan mampu membangun, menguji, men-debug, dan menyebarkan aplikasi iOS dan Android berkualitas produksi menggunakan React Native.

## Kurikulum

### Modul 1: Penyiapan Lingkungan dan Konsep Inti (Minggu 1)
- **Gambaran umum React Native dan ekosistemnya**
  - Perbandingan dengan Flutter, SwiftUI, Jetpack Compose
  - Kapan memilih React Native dibandingkan framework lain
- **Penyiapan lingkungan pengembangan**
  - Node.js, Watchman, Ruby (untuk CocoaPods)
  - React Native CLI vs. alur kerja Expo
  - Konfigurasi Android Studio (AVD) dan Xcode
- **Pembuatan proyek**
  - `npx react-native init` vs. `npx create-expo-app`
  - Memahami struktur proyek
  - Dasar-dasar Metro bundler
- **Aplikasi pertama: Halo Dunia di perangkat dan simulator**
  - Menjalankan di iOS Simulator dan Android Emulator
  - Menggunakan Expo Go untuk pembuatan prototipe cepat

### Modul 2: Dasar-Dasar React Native (Minggu 2)
- **Pembahasan mendalam komponen inti**
  - View, Text, ScrollView, FlatList, SectionList
  - TextInput, TouchableOpacity, Pressable
  - Image, ActivityIndicator, Modal
- **Styling di React Native**
  - Sistem tata letak Flexbox
  - API StyleSheet dan gaya inline
  - Desain responsif dengan Dimensions dan useWindowDimensions
- **Kode khusus platform**
  - Modul Platform (iOS vs. Android)
  - Ekstensi file `.ios.js` dan `.android.js`
- **Dasar-dasar debugging**
  - React Native DevTools (Flipper, React DevTools)
  - Console logging dan Chrome Debugger

### Modul 3: Navigasi dan Routing (Minggu 3)
- **Pustaka React Navigation**
  - Stack Navigator (native stack vs. JS stack)
  - Tab Navigator (bottom tabs, material tabs)
  - Drawer Navigator
- **Pola navigasi**
  - Melewatkan parameter antar layar
  - Konfigurasi deep linking
  - Alur autentikasi (navigasi bersyarat)
- **Kustomisasi header**
  - Header khusus layar
  - Tombol header kustom dan styling

### Modul 4: Manajemen State (Minggu 4)
- **State lokal dengan useState dan useReducer**
- **Context API untuk state global**
  - Membuat dan menggunakan context
  - Pola Context dengan useReducer
- **Manajemen state pihak ketiga**
  - Zustand untuk state ringan
  - Redux Toolkit untuk aplikasi kompleks
  - Gambaran umum MobX State Tree
- **Menyimpan state**
  - AsyncStorage dan MMKV
  - Penyimpanan aman dengan react-native-keychain

### Modul 5: Jaringan dan Data (Minggu 5)
- **Permintaan HTTP dengan fetch dan Axios**
  - Pola integrasi REST API
  - Penanganan error dan state pemuatan
- **GraphQL dengan Apollo Client**
  - Query, mutasi, subscription
- **Data real-time**
  - Integrasi WebSocket
  - Firebase Realtime Database dan Firestore
- **Arsitektur offline-first**
  - NetInfo untuk deteksi konektivitas
  - Strategi caching lokal dengan React Query

### Modul 6: API Perangkat Native (Minggu 6)
- **Kamera dan penanganan gambar**
  - react-native-image-picker dan react-native-camera
  - Manipulasi gambar dan kompresi
- **Lokasi dan peta**
  - react-native-maps (Google Maps, Apple Maps)
  - API Geolokasi dan lokasi latar belakang
- **Sensor perangkat**
  - Accelerometer, gyroscope, magnetometer (expo-sensors)
- **Notifikasi**
  - Notifikasi push (Firebase Cloud Messaging, APNs)
  - Notifikasi lokal dengan notifee

### Modul 7: Modul Native dan Bridging (Minggu 7)
- **Memahami arsitektur bridge**
  - Thread JavaScript vs. thread native
  - Hambatan serialisasi JSON
- **Menulis modul native kustom (Android)**
  - Membuat modul Toast native
  - Mengekspos metode ke JavaScript
- **Menulis modul native kustom (iOS)**
  - Bridging Objective-C dan Swift
  - RCT_EXPORT_MODULE dan RCT_EXPORT_METHOD
- **Turbo Modules (Arsitektur Baru)**
  - Pengenalan JSI (JavaScript Interface)
  - Fabric renderer dan panggilan native sinkron

### Modul 8: Optimasi Performa (Minggu 8)
- **Performa rendering**
  - Optimasi FlatList (getItemLayout, windowSize, removeClippedSubviews)
  - Menghindari render ulang yang tidak perlu (React.memo, useMemo, useCallback)
  - InteractionManager dan runAfterInteractions
- **Optimasi gambar**
  - react-native-fast-image untuk gambar cache
  - Strategi pemuatan gambar responsif
- **Manajemen memori**
  - Profiling dengan Flipper dan Instruments
  - Mendeteksi dan memperbaiki kebocoran memori
- **Optimasi ukuran bundel**
  - Konfigurasi Metro bundler
  - Code splitting dan lazy loading
  - Mesin Hermes (mesin JavaScript untuk Android)

### Modul 9: Pengujian (Minggu 9)
- **Pengujian unit**
  - Setup dan konfigurasi Jest
  - Menguji komponen dengan React Native Testing Library
  - Mocking modul native
- **Pengujian integrasi**
  - Menguji alur navigasi
  - Tes integrasi manajemen state
- **Pengujian end-to-end**
  - Setup Detox (iOS dan Android)
  - Menulis skenario tes E2E
- **Integrasi Berkelanjutan**
  - GitHub Actions untuk React Native
  - Menjalankan tes di CI (dengan emulator Android dan simulator iOS)

### Modul 10: Animasi (Minggu 10)
- **API Animated**
  - Animated.timing, Animated.spring, Animated.decay
  - Interpolasi dan transformasi
  - Animated.event untuk animasi berbasis gesture
- **Reanimated 2/3**
  - Worklets dan thread UI
  - Shared values, animasi, dan transisi
  - Layout animations
- **Penanganan gesture**
  - Pustaka React Native Gesture Handler
  - Gesture pan, pinch, rotation, dan Fling
  - Menyusun gesture majemuk

### Modul 11: Kesiapan Produksi dan Deployment (Minggu 11)
- **Ikon aplikasi dan layar splash**
  - Membuat ikon untuk semua resolusi
  - Layar splash animasi
- **Code signing dan sertifikat**
  - iOS: Apple Developer Program, provisioning profiles
  - Android: Pembuatan keystore dan signing Google Play
- **Distribusi ke toko aplikasi**
  - Pengiriman Apple App Store Connect
  - Publikasi Google Play Console
  - TestFlight dan jalur pengujian internal
- **Pembaruan over-the-air**
  - CodePush (Microsoft App Center)
  - Expo Updates (EAS Update)
- **Analitik dan pelaporan crash**
  - Firebase Crashlytics
  - Integrasi Sentry

### Modul 12: Proyek Kapstone (Minggu 12)
- **Perencanaan proyek dan desain arsitektur**
  - Pohon komponen dan struktur navigasi
  - Arsitektur manajemen state
  - Desain API dan skema database
- **Implementasi**
  - Pengembangan langsung sepenuhnya
  - Pair programming dan sesi review kode
- **Pengujian dan jaminan kualitas**
  - Cakupan pengujian komprehensif
  - QA manual di perangkat fisik
  - Profiling performa
- **Deployment**
  - Pengiriman ke toko aplikasi (App Store iOS dan/atau Google Play)
  - Pemantauan pasca-peluncuran

## Proyek Akhir

Peserta akan membangun aplikasi **berbagi resep sosial full-stack** bernama "RecipeShare" — aplikasi mobile lengkap di mana pengguna dapat membuat, berbagi, menemukan, dan menyimpan resep. Proyek ini harus mencakup fitur-fitur berikut:

- **Autentikasi pengguna**: Login email dan sosial (Google, Apple)
- **Manajemen profil**: Profil pengguna dengan avatar, bio, dan koleksi resep
- **CRUD resep**: Membuat, mengedit, menghapus resep dengan foto, daftar bahan, dan petunjuk langkah demi langkah
- **Fitur sosial**: Suka, komentar, ikuti, dan bagikan
- **Pencarian dan penemuan**: Pencarian resep teks lengkap dengan filter (masakan, pantangan diet, waktu memasak)
- **Dukungan offline**: Membaca resep cache dan menyimpan favorit secara offline
- **Notifikasi push**: Saran resep dan peringatan interaksi sosial
- **Animasi**: Transisi halus dan mikro-interaksi di seluruh aplikasi
- **Publikasi**: Aplikasi harus berhasil dipublikasikan di setidaknya satu toko aplikasi (TestFlight diterima)

## Kriteria Penilaian

- **Tugas (40%)**: Latihan coding mingguan dan kuis
  - Modul 1-4: Proyek awal cepat dan kuis pemahaman
  - Modul 5-7: Tugas integrasi API dan modul native
  - Modul 8-10: Tugas optimasi performa dan animasi
  - Modul 11: Checklist pengiriman ke toko aplikasi

- **Proyek Tengah Semester (20%)**: Aplikasi React Native mandiri yang lebih kecil
  - Harus menggunakan navigasi, manajemen state, dan setidaknya dua API perangkat
  - Pengumpulan dengan kode sumber dan dokumentasi
  - Dievaluasi berdasarkan kualitas kode, arsitektur, dan fungsionalitas

- **Proyek Kapstone Akhir (40%)**
  - Fungsionalitas dan kelengkapan fitur (30%)
  - Kualitas kode, arsitektur, dan cakupan pengujian (25%)
  - Desain UI/UX dan animasi (20%)
  - Optimasi performa (10%)
  - Bukti publikasi ke toko aplikasi (15%)

## Referensi

- [Dokumentasi Resmi React Native](https://reactnative.dev/docs/getting-started)
- [Dokumentasi Expo](https://docs.expo.dev/)
- [Dokumentasi React Navigation](https://reactnavigation.org/docs/getting-started/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Dokumentasi Reanimated 3](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [Firebase untuk React Native](https://rnfirebase.io/)
- [Detox E2E Testing](https://wix.github.io/Detox/)
- [Blog React Native](https://reactnative.dev/blog/)
- "React Native in Action" oleh Nader Dabit (Manning Publications)
- "Fullstack React Native" oleh Devin Abbott dan Houssein Djirdeh

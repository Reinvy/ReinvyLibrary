---
title: "Silabus Arsitektur React Native dan Rekayasa Platform Tingkat Lanjut"
description: "Kurikulum lanjutan 12 minggu untuk pengembang React Native yang berpengalaman, mencakup internal New Architecture (Fabric, Turbo Modules, JSI, Codegen, Bridgeless), rekayasa modul native dan C++, internal Hermes dan engine JavaScript, rekayasa performa tingkat lanjut, arsitektur aplikasi berskala besar, arsitektur data offline-first, penguatan keamanan, animasi tingkat lanjut, pengujian berskala besar, observabilitas, dan rekayasa rilis."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Arsitektur React Native dan Rekayasa Platform Tingkat Lanjut

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk pengembang yang telah mengirimkan aplikasi React Native ke produksi dan ingin menguasai kerangka kerja ini pada skala platform. Sementara kurikulum React Native tingkat pengantar berfokus pada komponen, navigasi, manajemen state, API perangkat, pengujian, dan cara menerbitkan aplikasi, kursus ini masuk beberapa lapis lebih dalam: internal New Architecture — renderer Fabric, Turbo Modules, JSI, Codegen, dan mode Bridgeless — inti C++ yang memungkinkan panggilan native sinkron, desain modul native kelas produksi di Android dan iOS, bytecode Hermes dan garbage collection, rekayasa performa tingkat lanjut dengan anggaran frame dan optimasi startup, penataan codebase berskala besar dengan modular monolith dan monorepo, arsitektur data offline-first dengan sync engine dan CRDT, penguatan keamanan terhadap reverse engineering dan serangan MITM, rekayasa animasi dan gesture tingkat lanjut di UI thread, pengujian berskala besar dengan component-driven dan contract testing, observabilitas, dan rekayasa rilis dengan peluncuran bertahap.

Setiap modul memasangkan fondasi konseptual yang mendalam dengan lab langsung yang mengharuskan pembacaan kode hasil kompilasi, pembuatan profil aplikasi nyata, pemeriksaan log native, dan perancangan diagram arsitektur. Kursus ini mencapai puncaknya pada proyek akhir di mana peserta didik merancang dan membangun platform React Native local-first berskala besar dengan New Architecture diaktifkan, Turbo Modules dan komponen Fabric kustom, sinkronisasi offline, penguatan keamanan, anggaran performa yang terukur, dan pipeline rilis bertahap.

Di akhir kursus ini, peserta didik akan mampu menjelaskan bagaimana Fabric melakukan commit UI ke sisi native, menulis Turbo Module dalam Kotlin, Swift, dan C++, memindahkan pekerjaan keluar dari JavaScript thread dengan JSI, mendiagnosis dan memperbaiki regresi startup dan anggaran frame, memilih strategi sinkronisasi data yang tepat untuk aplikasi offline-first, menguatkan aplikasi terhadap perusakan dan pencurian data, menata codebase multi-tim tanpa mengikat jadwal rilis, serta mengoperasikan aplikasi React Native dengan observabilitas dan peluncuran yang terkendali.

## Kurikulum

### Modul 1: Fondasi New Architecture (Minggu 1)

- **Renderer Fabric secara mendalam**
  - Pohon komponen, pohon shadow, dan pipeline commit dari elemen React ke tampilan native
  - Bagaimana state dan props mengalir melalui sistem mount Fabric
  - View flattening dan bagaimana renderer mengurangi jumlah tampilan native
- **Turbo Modules**
  - Pemuatan modul secara lazy dan mengapa kemacetan serialisasi bridge hilang
  - Pemanggilan metode native langsung dengan binding JavaScript Interface (JSI)
  - Panggilan sinkron vs. asinkron beserta implikasi threading-nya
- **Mode Bridgeless dan Interop Layer**
  - Apa arti "bridgeless": tanpa bridge lama, tanpa registry modul bridge
  - Interop Layer yang membuat modul native lama tetap berfungsi melalui API lama
  - Jalur migrasi: flag opt-in, aplikasi hibrida, dan urutan peluncuran
- **Codegen**
  - Kontrak berbasis spec: spec TypeScript yang menghasilkan kode antarmuka native
  - Tipe yang dihasilkan di kedua sisi batas dan pembuatan versi spec
- **Lab Praktik**: Aktifkan New Architecture di aplikasi kecil, tangkap profil thread native selama transisi layar, dan identifikasi pekerjaan commit Fabric versus pekerjaan JavaScript

### Modul 2: JSI dan Lapisan C++ (Minggu 2)

- **JavaScript Interface**
  - Semantik `jsi::Runtime`, `jsi::Value`, `jsi::Object`, `jsi::Function`, dan `jsi::String`
  - Host object dan hybrid object: menjembatani kelas C++ ke dalam JavaScript
  - Membuat dan memasang modul JSI ke dalam runtime
- **Threading dan konkurensi**
  - JavaScript thread versus thread native: di mana panggilan JSI berjalan
  - Mengeksekusi pekerjaan secara sinkron di JS thread dari kode native beserta bahayanya
  - Callback, promise, dan propagasi error melewati batas
- **Kepemilikan memori**
  - Kepemilikan JavaScript versus kepemilikan C++ (`std::shared_ptr`, masa hidup `jsi::HostObject`)
  - Referensi lemah dan menghindari siklus antara objek JS dan native
  - Kebocoran memori di JSI: event listener, dekorator, dan instalasi global
- **Karakteristik performa**
  - Kapan panggilan JSI sinkron layak digunakan dan kapan panggilan itu menghentikan UI
  - Menghindari penggunaan JSI berlebihan: batching, menyimpan hasil native, dan marshaling minimal
- **Lab Praktik**: Tulis host object C++ kecil, ekspos ke JavaScript, dan ukur overhead panggilan dibandingkan panggilan bridge lama

### Modul 3: Modul Native Kelas Produksi (Minggu 3)

- **Desain modul native di Android (Kotlin)**
  - Siklus hidup modul, registry NativeModule, dan aturan afinitas thread
  - Coroutine dan suspend function yang diekspos ke JavaScript
  - Menghindari pekerjaan di main thread dan ANR (Application Not Responding)
- **Desain modul native di iOS (Swift)**
  - Struktur modul Swift, interop `@objc`, dan antrean modul
  - Penggunaan Grand Central Dispatch (GCD) dan modul main-queue
- **Kontrak spec**
  - Menulis spec TypeScript dan membuat ulang kode dengan Codegen
  - Menjaga stabilitas kontrak di berbagai versi aplikasi dan pustaka
- **Event dan listener**
  - Event native-ke-JavaScript: siklus hidup emit, manajemen listener, dan kebocoran retained-listener
  - Backpressure: membatasi event native ketika JS thread jenuh
- **Penanganan error dan pengujian**
  - Melewati batas dengan error terstruktur dan kode error
  - Unit-test modul native dengan JUnit dan XCTest, plus mock di sisi JavaScript
- **Lab Praktik**: Bangun Turbo Module yang mengalirkan data sensor perangkat dan verifikasi pembersihan listener selama perpindahan layar yang cepat

### Modul 4: Renderer Fabric dan Komponen Kustom (Minggu 4)

- **Pohon shadow dan layout**
  - Mesin layout Yoga: lintasan layout flexbox, propagasi dirty, dan fungsi measure
  - Kapan layout berjalan di UI thread dan biayanya saat scrolling
- **Komponen Fabric kustom**
  - Mounting, diffing props, pembaruan state, dan perintah
  - `measure`, `onLayout`, dan metode native imperatif
- **View flattening dan recycling**
  - Bagaimana tampilan bersarang diratakan menjadi satu tampilan native
  - Recycling tampilan dalam daftar dan menghindari alokasi per frame
- **Interop dengan komponen lama**
  - Kapan komponen tidak dapat dimigrasikan ke Fabric dan bagaimana interop menjaganya tetap hidup
  - Jurang performa tampilan interop dan cara menghapusnya secara bertahap
- **Lab Praktik**: Implementasikan tampilan Fabric kustom (misalnya, permukaan video native) dan buat profil biaya mount serta layout-nya dalam daftar yang dapat digulir

### Modul 5: Rekayasa Performa Tingkat Lanjut (Minggu 5)

- **Urutan startup dan Time to Interactive**
  - Jalur cold-start: peluncuran native, pemuatan bytecode Metro/Hermes, evaluasi JavaScript, first paint
  - Membuat profil fase startup dan memangkas waktu di setiap fase
  - Rendering tertunda, layar kerangka, dan inisialisasi native yang lazy
- **Anggaran frame dan jank**
  - Anggaran frame 16,6 ms dan ke mana waktu pergi: JS thread, UI thread, I/O native
  - Memindahkan pekerjaan keluar dari JS thread: worklet, modul native, dan data yang dihitung sebelumnya
  - Mendiagnosis jank dengan Perfetto, Instruments, dan flamegraph React DevTools
- **Optimasi pipeline render**
  - Menghindari re-render tak perlu dengan `React.memo`, `useMemo`, dan `useCallback` dalam skala besar
  - Internal FlatList: `getItemLayout`, `windowSize`, `maxToRenderPerBatch`, dan recycling sel
  - InteractionManager dan penjadwalan tugas tertunda tanpa menghalangi gesture
- **Memori dan gambar**
  - Pipeline decode gambar, downsampling, dan caching (serta kapan memakai pustaka gambar native)
  - Mendeteksi pertumbuhan memori native dan kebocoran dengan heap snapshot
- **Lab Praktik**: Instrumentasikan cold start aplikasi, identifikasi fase dominan, terapkan dua optimasi, dan ukur perbaikannya

### Modul 6: Internal Hermes dan Engine JavaScript (Minggu 6)

- **Arsitektur Hermes**
  - Runtime Hermes dan model kompilasi bytecode ahead-of-time
  - Mengapa bytecode AOT mengalahkan parsing JIT untuk mobile: trade-off startup dan memori
  - Flag Hermes di konfigurasi Metro: `hermesc`, transformasi bytecode, dan opsi kompilasi
- **Startup dan snapshotting**
  - Bundle bytecode terkompilasi dan bagaimana menghemat waktu startup
  - Global snapshot: berbagi state runtime yang tidak berubah antar peluncuran
  - Trade-off: pembuatan snapshot dan kode yang tidak dapat di-snapshot
- **Garbage collection dan memori**
  - GC Hades yang konkuren, ukuran heap, dan jeda GC
  - Heap snapshot, analisis masa hidup objek, dan perburuan kebocoran di Hermes
  - Mengendalikan tekanan alokasi di jalur panas
- **Perbandingan engine**
  - JavaScriptCore versus Hermes di iOS dan Android: kapan JSC masih masuk akal
  - Konfigurasi engine, dukungan `Intl`, dan implikasi polyfill
- **Lab Praktik**: Ganti build ke bytecode Hermes, periksa bundle hasil kompilasi, dan gunakan heap snapshot untuk menemukan serta memperbaiki kebocoran memori

### Modul 7: Arsitektur Aplikasi Berskala Besar (Minggu 7)

- **Modular monolith**
  - Modul fitur, batas modul, dan aturan dependensi yang ditegakkan dengan dependency-cruiser
  - Pola feature-slice: UI, state, API, dan pembungkus native per fitur
  - Menghindari dependensi melingkar dan modul god yang terpusat
- **Micro-frontend di mobile**
  - Module federation dengan Repack dan modul federasi yang di-deploy secara independen
  - Pembuatan versi modul federasi dan kontrak runtime
  - Kapan micro-frontend membantu versus kapan modular monolith lebih sederhana
- **Monorepo**
  - Menata aplikasi, paket, dan pustaka dengan Nx atau Turborepo
  - Konfigurasi TypeScript bersama, katalog versi dependensi, dan pipeline codegen
  - Menegakkan scoping perubahan dan build yang dapat di-cache di CI
- **Feature flag dan eksperimen**
  - Infrastruktur flag, konfigurasi jarak jauh, dan A/B testing di level modul
  - Kill switch dan peluncuran progresif yang terkait dengan batas fitur
- **Lab Praktik**: Pecah aplikasi contoh menjadi modul fitur, tambahkan aturan dependensi, dan jalankan build cacheable ala monorepo

### Modul 8: Arsitektur Data Offline Tingkat Lanjut (Minggu 8)

- **Arsitektur local-first**
  - Merancang database perangkat sebagai sumber kebenaran: WatermelonDB, RxDB, dan SQLite
  - Migrasi skema di perangkat dan kontrak sinkronisasi dengan server
- **Mesin sinkronisasi**
  - Sinkronisasi pull/push, delta token, dan umpan perubahan terpagina
  - Penulisan berbasis antrean dengan kunci idempotensi serta retry dengan backoff
- **Resolusi konflik dan CRDT**
  - Last-write-wins versus merge level bidang dan vector clock
  - CRDT untuk data kolaboratif: penggabungan tanpa konflik tanpa resolver terpusat
  - Pembaruan optimistis dan membatalkan mutasi yang gagal
- **Sinkronisasi latar belakang**
  - WorkManager di Android dan BGTaskScheduler di iOS untuk sinkronisasi tertunda
  - Batasan baterai dan jaringan, penanganan konektivitas, dan observabilitas sinkronisasi
- **Invalidasi cache**
  - Kebijakan staleness, eviction cache, dan invalidasi selektif berdasarkan mutasi
  - Menyajikan data basi saat kegagalan jaringan dengan indikator yang jelas
- **Lab Praktik**: Bangun aplikasi catatan local-first dengan penulisan offline, sinkronisasi berbasis antrean, dan resolusi konflik, lalu verifikasi perilakunya saat jaringan dimatikan

### Modul 9: Arsitektur Keamanan Secara Mendalam (Minggu 9)

- **Pemodelan ancaman untuk mobile**
  - Reverse engineering, repackaging, serangan MITM, dan ancaman data-at-rest
  - Mengidentifikasi aset yang layak dilindungi dan model penyerang untuk setiap aset
- **Penyimpanan aman**
  - iOS Keychain dan penyimpanan berbasis Android Keystore dengan react-native-keychain
  - EncryptedSharedPreferences, buka kunci biometrik, dan rotasi kunci
  - Yang tidak boleh disimpan di perangkat: token, kunci, dan aturan PII
- **Keamanan jaringan**
  - Certificate pinning beserta perawatannya: backup pin dan server key pinning
  - Android Network Security Config dan pengecualian ATS (App Transport Security) iOS
  - Mendeteksi dan mencatat kegagalan TLS tanpa memutus trafik produksi
- **Integritas dan ketahanan terhadap perusakan**
  - Deteksi jailbreak dan root, pemeriksaan integritas runtime, dan anti-debugging
  - Play Integrity API dan App Attest untuk keputusan kepercayaan sisi server
  - Obfuskasi kode dan meminimalkan logika bernilai tinggi di JavaScript
- **Keamanan rantai pasokan dan dependensi**
  - Mengaudit dependensi, lockfile, dan pemindaian kerentanan otomatis
  - Code signing, kebersihan rahasia CI, dan mencegah substitusi paket berbahaya
- **Lab Praktik**: Perkuat aplikasi contoh dengan pinning, penyimpanan aman, dan pemeriksaan integritas, lalu coba dekripsi penyimpanannya dan dokumentasikan apa yang menghentikan serangan tersebut

### Modul 10: Rekayasa Animasi dan Gesture Tingkat Lanjut (Minggu 10)

- **Reanimated 4 dan UI thread**
  - Worklet dan cara kerjanya di UI thread tanpa perjalanan bolak-balik bridge
  - Shared values, animated props, dan sinkronisasi pohon render
  - Layout animations dan API transisi `entering`/`exiting`
- **Transisi elemen bersama**
  - Shared transition tags antar layar dan driver native di baliknya
  - Mengoordinasikan elemen bersama dengan pustaka navigasi
- **Komposisi gesture**
  - Gesture Handler: pan, pinch, rotation, fling, dan long-press dalam kombinasi
  - Relasi gesture simultan, eksklusif, dan gagal
  - Animasi berbasis gesture: menyeret, snapping, dan fisika momentum
- **Rendering kustom dengan Skia**
  - react-native-skia: rendering canvas, shader, dan efek berakselerasi GPU
  - Kapan merender dengan Skia versus pohon tampilan native
- **Anggaran performa animasi**
  - Menjaga pekerjaan animasi di luar JS thread dan mengukur biaya UI thread
  - Mengurangi overdraw dan menghindari layout thrash selama animasi
- **Lab Praktik**: Bangun tumpukan kartu berbasis gesture dengan transisi elemen bersama dan verifikasi seluruh animasi berjalan tanpa keterlibatan JS thread

### Modul 11: Pengujian, Observabilitas, dan Rekayasa Rilis Berskala Besar (Minggu 11)

- **Pengujian berskala besar**
  - Pengembangan component-driven dengan Storybook untuk React Native
  - Visual regression testing dengan Chromatic dan baseline snapshot
  - Contract testing antara aplikasi dan API dengan Pact
  - Property-based testing untuk reducer, logika sinkronisasi, dan parser
- **Gerbang regresi performa di CI**
  - Anggaran ukuran bundle, pemeriksaan ukuran bytecode, dan pemantauan bobot dependensi
  - Detektor regresi startup dan anggaran frame di perangkat CI
  - Analisis flamegraph dengan ambang kegagalan otomatis
- **Observabilitas**
  - Pelaporan crash dengan Crashlytics dan Sentry: pengelompokan, breadcrumb, dan symbolication
  - Real User Monitoring (RUM): transisi layar, latensi API, dan skor kesehatan aplikasi
  - Log terstruktur, propagasi trace, dan mengorelasikan log JS dan native
- **Rekayasa rilis**
  - Peluncuran bertahap, gerbang crash-free rate, dan aturan rollback otomatis
  - Manajemen Android App Bundle (AAB) dan arsip iOS
  - Pembaruan over-the-air dengan expo-updates atau CodePush beserta batas keamanannya
- **Lab Praktik**: Tambahkan Storybook dan visual regression ke sebuah fitur, pasang RUM, dan latih peluncuran bertahap dengan gerbang crash

### Modul 12: Proyek Akhir (Minggu 12)

- **Perencanaan proyek dan desain arsitektur**
  - Arsitektur multi-modul dengan New Architecture diaktifkan
  - Desain model data, kontrak sinkronisasi, dan dokumen keamanan
  - Definisi anggaran performa dan rencana observabilitas
- **Implementasi**
  - Turbo Modules kustom dan setidaknya satu komponen Fabric kustom
  - Lapisan data offline-first dengan resolusi konflik
  - Penguatan keamanan dan animasi di UI thread
- **Jaminan kualitas**
  - Tes component-driven, visual regression, dan contract testing di CI
  - Gerbang regresi performa dan QA manual di perangkat fisik
  - Tinjauan keamanan dan walkthrough model ancaman
- **Deployment**
  - Peluncuran bertahap ke setidaknya satu jalur toko aplikasi dengan gerbang crash
  - Pemantauan pasca-peluncuran dan runbook rollback yang terdokumentasi

## Proyek Akhir

Peserta didik akan membangun **"FieldNote"** — platform pengumpulan data lapangan dan kolaborasi tim local-first di mana tim mobile mencatat observasi, foto, dan geodata di lapangan lalu menyinkronkannya ke workspace terpusat. Aplikasi ini harus mencakup fitur-fitur berikut:

- **New Architecture**: Fabric dan Turbo Modules diaktifkan, dengan setidaknya satu Turbo Module kustom (misalnya, kompresor media native) dan satu komponen Fabric kustom (misalnya, permukaan anotasi peta native)
- **Lapisan data offline-first**: Semua catatan dibuat offline, penulisan berantre dengan idempotensi, sinkronisasi berbasis delta, dan resolusi konflik level bidang
- **Autentikasi dan keamanan**: Buka kunci biometrik, penyimpanan token berbasis Keychain/Keystore, certificate pinning, attestation integritas, dan model ancaman yang terdokumentasi
- **Kolaborasi**: Koleksi bersama dengan penggabungan bidang berbasis CRDT dan pembaruan optimistis
- **UI tingkat lanjut**: Interaksi peta berbasis gesture dan transisi elemen bersama, dengan animasi sepenuhnya di luar JS thread
- **Anggaran performa**: Cold start di bawah ambang yang ditentukan dan frame rate scrolling di atas ambang yang ditentukan, diverifikasi oleh gerbang CI
- **Observabilitas**: Pemantauan crash-free rate, dasbor RUM, dan log terstruktur ujung ke ujung
- **Rilis**: Peluncuran bertahap ke TestFlight atau internal testing Google Play dengan gerbang crash dan runbook rollback yang terdokumentasi

## Kriteria Penilaian

- **Tugas (30%)**: Lab mingguan dan pemeriksaan pemahaman
  - Modul 1-4: Lab New Architecture dan implementasi modul native
  - Modul 5-6: Laporan analisis performa dan engine
  - Modul 7-8: Kiriman desain arsitektur dan sinkronisasi offline
  - Modul 9-10: Tugas rekayasa keamanan dan animasi
  - Modul 11: Daftar periksa pengujian, observabilitas, dan latihan rilis

- **Proyek Tengah Semester (20%)**: Aplikasi React Native tingkat lanjut yang berdiri sendiri
  - Harus menggunakan New Architecture, setidaknya satu Turbo Module, dan lapisan data offline
  - Dievaluasi berdasarkan keputusan arsitektur, kualitas kode native, dan bukti performa

- **Proyek Akhir (50%)**
  - Arsitektur dan adopsi New Architecture (20%)
  - Sinkronisasi offline dan integritas data (20%)
  - Penguatan keamanan dan kepatuhan model ancaman (15%)
  - Pencapaian anggaran performa (15%)
  - Cakupan pengujian dan gerbang CI (15%)
  - Kualitas rilis dan bukti observabilitas (15%)

## Referensi

- [Dokumentasi New Architecture React Native](https://reactnative.dev/docs/architecture-landing-page)
- [Dokumentasi Fabric Renderer dan Turbo Modules](https://reactnative.dev/docs/next/architecture/fabric-renderer)
- [Dokumentasi JSI (JavaScript Interface)](https://reactnative.dev/docs/next/architecture/jsi)
- [Dokumentasi Codegen](https://reactnative.dev/docs/next/architecture/codegen)
- [Dokumentasi Mesin JavaScript Hermes](https://hermesengine.dev/docs/)
- [Dokumentasi Performa React Native](https://reactnative.dev/docs/performance)
- [Dokumentasi Reanimated 4](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [react-native-skia](https://shopify.github.io/react-native-skia/)
- [WatermelonDB](https://watermelondb.dev/)
- [RxDB Offline-First Database](https://rxdb.info/)
- [Repack Module Federation untuk React Native](https://repack.pro/)
- [react-native-keychain](https://github.com/oblador/react-native-keychain)
- [Dokumentasi Sentry React Native](https://docs.sentry.io/platforms/react-native/)
- [Firebase Crashlytics untuk React Native](https://rnfirebase.io/crashlytics/usage)
- [Storybook untuk React Native](https://storybook.js.org/docs/react-native)
- [Detox E2E Testing](https://wix.github.io/Detox/)
- [Blog React Native — Pembaruan New Architecture](https://reactnative.dev/blog/)
- "React Native in Action" oleh Nader Dabit (Manning Publications)
- "Professional React Native" oleh Alexander Benedikt Kuttig (Packt Publishing)

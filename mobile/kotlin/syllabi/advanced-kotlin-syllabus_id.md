---
title: "Silabus Kotlin Tingkat Lanjut"
description: "Kurikulum 12 minggu tingkat lanjut untuk menguasai internal bahasa Kotlin, coroutine dan Flow di balik layar, Kotlin Multiplatform, perkakas compiler, dan rekayasa performa."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Kotlin Tingkat Lanjut

## Ringkasan

Silabus 12 minggu ini dirancang untuk pengembang yang sudah lancar menulis Kotlin dan ingin memahami bahasa ini pada level compiler, runtime, dan perkakas ekosistemnya. Berbeda dengan Silabus Pengembangan Android untuk pemula hingga menengah yang berfokus pada pembuatan aplikasi, kurikulum ini menyelami lebih dalam: bagaimana compiler Kotlin mengubah kode Anda, apa jadinya fungsi suspend saat runtime, bagaimana Flow mengalirkan nilai tanpa memblokir thread, cara berbagi kode antar platform dengan Kotlin Multiplatform, serta cara mengukur dan menghilangkan hambatan performa. Setiap modul memadukan kedalaman konseptual dengan latihan langsung, dan kursus ini berpuncak pada proyek kapstone yang menggabungkan perkakas compiler, distribusi multiplatform, dan pengoptimalan performa kelas produksi.

## Kurikulum

### Minggu 1: Pendalaman Sistem Tipe Kotlin
- **Variansi generik**: `out`/`in` deklarasi-site vs proyeksi use-site, variansi dan kovariansi koleksi
- **Proyeksi tipe**: proyeksi `Star`, internal `TypeProjection`, kapan proyeksi menjadi tidak aman
- **Parameter tipe reified**: fungsi inline, `T::class` saat runtime, pemeriksaan tipe pada generik terhapus
- **Inline value class**: `@JvmInline value class`, penghindaran boxing, semantik equals/hashCode, batasan
- **Tipe lanjutan**: `Nothing`, `Unit` vs `Void`, pendekatan intersection dan union, type alias
- **Praktik**: Bangun DSL builder yang aman terhadap tipe menggunakan variansi, tipe reified, dan inline class

### Minggu 2: Internal Compiler Kotlin
- **Pipeline compiler**: frontend (parser, binding, inferensi tipe) vs backend (IR, codegen)
- **PSI dan pohon sintaks**: bagaimana IDE dan compiler berbagi analisis, struktur KtFile
- **Intermediate Representation (IR)**: pembuatan IR, pass lowering, validasi IR
- **Codegen Kotlin/Native vs JVM**: backend LLVM, perbedaan model memori, biner native
- **Plugin compiler**: plugin FIR, transformasi IR, pemuatan classpath plugin compiler
- **Praktik**: Periksa bytecode terkompilasi dengan flag `kotlinc -X...` dan dekompilasi fungsi suspend

### Minggu 3: Coroutine di Balik Layar
- **Gaya continuation-passing**: bagaimana `suspend` dikompilasi, interface `Continuation`, `CoroutineImpl`
- **State machine**: resume berbasis label, titik suspensi, dispatch `resumeWith`
- **Dispatcher secara mendalam**: work-stealing pool `Dispatchers.Default`, berbagi thread `IO`, semantik `Unconfined`
- **Mekanisme pembatalan**: pembatalan kooperatif, `CancellationException`, konteks `NonCancellable`
- **Konkurensi terstruktur**: `coroutineScope` vs `supervisorScope`, hierarki Job, propagasi kegagalan induk-anak
- **Praktik**: Tulis `ContinuationInterceptor` kustom dan telusuri suspensi/resume dengan logging debug

### Minggu 4: Internal Flow dan Operator Lanjutan
- **Flow dingin vs panas**: builder Flow, eksekusi blok `flow {}`, mekanisme `StateFlow` dan `SharedFlow`
- **Backpressure dan buffering**: `buffer`, `conflate`, `collectLatest`, internal flow berbasis channel
- **Fusi operator**: bagaimana `map`, `filter`, `transform` tersusun menjadi satu flow, operator terfusi
- **Konteks Flow**: perpindahan konteks upstream `flowOn`, `withContext` dan transparansi eksepsi
- **Pengujian flow**: `runTest`, `TestScope`, waktu virtual, asersi `Turbine`, kontrol background scope
- **Praktik**: Implementasikan operator flow kustom dan pipeline sadar backpressure dengan `buffer` dan `conflate`

### Minggu 5: Dasar-Dasar Kotlin Multiplatform
- **Struktur proyek KMP**: plugin Gradle `multiplatform`, source set, hierarki `commonMain`/`platformMain`
- **Deklarasi expect/actual**: fungsi, kelas, properti, dan resolusi saat kompilasi
- **Pola logika bersama**: lapisan repository/service dalam kode umum, UI khusus platform dipisahkan
- **Library kotlinx**: coroutines, serialization, dan datetime di semua platform
- **Batas interop**: memanggil API platform dari kode umum, pembekuan data yang melintasi batas
- **Praktik**: Ekstrak modul validasi dan jaringan bersama yang dipakai aplikasi Android dan klien JVM desktop

### Minggu 6: Kotlin/Native dan Manajemen Memori
- **Runtime Kotlin/Native**: alokator memori native, GC pada native, penelusuran graf objek
- **Model memori**: memory manager baru, state immutable bersama, `AtomicReference` pada native
- **Interop C**: binding cinterop, pointer, tipe `CPointer`, alokasi dan pelepasan memori
- **Interop Objective-C/Swift**: mengekspor framework Kotlin, `@ObjCName`, desain API ramah Swift
- **Konkurensi pada native**: pembekuan vs MM baru, worker thread, `kotlinx.coroutines` pada native
- **Praktik**: Bangun library native kecil dengan API C dan panggil dari Kotlin/Native

### Minggu 7: kotlinx.serialization di Produksi
- **Kerangka serialization**: `@Serializable`, `KSerializer`, `SerializersModule`, serialization kontekstual
- **Polimorfisme**: hierarki sealed class, `@Polymorphic`, diskriminator kelas, polimorfisme terbuka
- **Serializer kustom**: implementasi `KSerializer`, output JSON kustom, parsing lunak
- **Format selain JSON**: CBOR, ProtoBuf, properties, format kustom via `StringFormat`/`BinaryFormat`
- **Performa dan stabilitas**: evolusi skema, kunci tak dikenal, default nullable, payload besar
- **Praktik**: Rancang format wire berversi untuk API publik dengan migrasi kompatibel mundur

### Minggu 8: Pemrosesan Anotasi dengan KSP dan Plugin Compiler
- **Dasar KSP**: `SymbolProcessor`, `Resolver`, API `KSFile`/`KSClassDeclaration`
- **KSP vs KAPT**: resolusi tipe, pemrosesan inkremental, perbandingan performa
- **Pembuatan kode**: menghasilkan sumber Kotlin, `CodeGenerator`, pengemasan file hasil generate
- **Dasar plugin compiler**: transformasi IR untuk fitur level bahasa, kapan plugin mengalahkan KSP
- **Integrasi Gradle**: konfigurasi `ksp {}`, build inkremental, pelaporan error
- **Praktik**: Tulis prosesor KSP yang menghasilkan mapper database aman tipe dari kelas beranotasi

### Minggu 9: Rekayasa Performa dan Profiling
- **Analisis alokasi**: escape analysis, eliminasi boxing, churn objek di jalur panas
- **Perkakas profiling**: JVM Flight Recorder, `async-profiler`, profiler Kotlin/Native, heap dump
- **Benchmarking**: JMH pada JVM, `kotlinx.benchmark` untuk multiplatform, jebakan warmup dan pengukuran
- **Pemilihan struktur data**: `Array` vs `List` vs sequence, array primitif, manfaat `@JvmInline`
- **Optimasi compiler**: flag `-X`, fungsi contract, fungsi inline dan biayanya
- **Praktik**: Profil aplikasi contoh, identifikasi tiga hotspot alokasi teratas, dan hilangkan semuanya

### Minggu 10: Pemrograman Fungsional Secara Mendalam
- **Tipe data aljabar**: hierarki sealed sebagai sum type, product type, ekshaustif
- **Abstraksi higher-kinded**: functor, monad, monad transformer dengan Arrow
- **Ekosistem Arrow-kt**: `Either`, `Option`, `IO`/`Effect`, optik dengan `arrow-optics`
- **Sistem efek**: efek berbasis suspend vs `IO`, keamanan resource dengan `use`/`bracket`
- **Pola komposisi**: penanganan error fungsional, akumulasi validasi, event sourcing
- **Praktik**: Refaktor layanan imperatif menjadi pipeline fungsional dengan error bertipe

### Minggu 11: Konkurensi, Atomic, dan Paralelisme
- **Model memori JVM**: happens-before, semantik volatile, publikasi aman
- **Primitif atomik**: `AtomicInteger`, `AtomicReference`, loop CAS, struktur lock-free
- **Strategi penguncian**: synchronized, `ReentrantLock`, read-write lock, striping
- **Paralelisme berbasis coroutine**: dekomposisi paralel, pola `async`/`await`, work stealing
- **Konfinemen thread**: konteks single-threaded, event loop, penyetelan dispatcher
- **Praktik**: Bangun cache konkuren lock-free dan verifikasi di bawah stress test

### Minggu 12: Proyek Kapstone
- **Pembatasan proyek**: pilih library multiplatform bersama atau proyek perkakas compiler
- **Arsitektur**: terapkan struktur KMP, error bertipe, serialization, dan teknik performa
- **Implementasi**: bangun library dengan kode hasil generate, serializer kustom, dan jalur panas teroptimasi
- **Validasi**: benchmark, profil, tulis pengujian berbasis properti, dan dokumentasikan trade-off
- **Presentasi**: sampaikan design review yang menjelaskan keputusan compiler dan runtime

## Proyek Akhir

Peserta membangun **Library Kotlin Multiplatform Tingkat Lanjut dengan Perkakas Compiler** — library bersama berkualitas produksi yang mendemonstrasikan setiap lapisan kurikulum. Proyek yang kuat menggabungkan: modul KMP yang mengekspos logika bisnis bersama ke konsumen Android, iOS, dan JVM; prosesor KSP yang menghasilkan mapper atau serializer aman tipe dari model beranotasi; serializer kustom dengan format wire berversi dan kompatibel mundur; pemrosesan konkuren berbasis coroutine dengan backpressure terukur; serta laporan performa yang didukung profiling dan benchmark yang menunjukkan peningkatan terukur dibandingkan baseline naif. Luaran mencakup sumber kode lengkap, README yang mendokumentasikan keputusan desain, dan video penjelasan singkat atau design review tertulis.

## Kriteria Penilaian

- **Tugas**: Latihan hands-on mingguan (inspeksi compiler, operator kustom, prosesor KSP, benchmark) dikumpulkan sebagai repositori kecil, masing-masing dinilai berdasarkan kebenaran, kedalaman analisis, dan kualitas kode.
- **Kuis**: Dua kuis singkat yang mencakup aturan variansi sistem tipe, semantik state machine coroutine, dan kasus tepi serialization.
- **Proyek Akhir**: Dievaluasi berdasarkan kesolidan arsitektur (struktur KMP dan desain expect/actual), kebenaran dan kegunaan kode hasil generate, kualitas analisis performa (bukti profiling, metodologi benchmark), serta kejelasan design review tertulis.
- **Partisipasi**: Review kode terhadap kiriman rekan pada minggu 5 dan 9, menilai kualitas umpan balik konstruktif.

## Referensi

- [Dokumentasi Kotlin — Topik Lanjutan](https://kotlinlang.org/docs/advanced-topics.html)
- [Panduan Coroutine Kotlin (dokumentasi kotlinlang.org)](https://kotlinlang.org/docs/coroutines-guide.html)
- [Dokumentasi Kotlin Multiplatform](https://kotlinlang.org/docs/multiplatform.html)
- [Dokumentasi Kotlin/Native dan Memory Manager](https://kotlinlang.org/docs/native-overview.html)
- [Repositori GitHub kotlinx.serialization](https://github.com/Kotlin/kotlinx.serialization)
- [Dokumentasi KSP (Kotlin Symbol Processing)](https://kotlinlang.org/docs/ksp-overview.html)
- [Library Pemrograman Fungsional Arrow-kt](https://arrow-kt.io/)
- [JetBrains Academy — Jalur Kotlin Tingkat Lanjut](https://www.jetbrains.com/academy/)

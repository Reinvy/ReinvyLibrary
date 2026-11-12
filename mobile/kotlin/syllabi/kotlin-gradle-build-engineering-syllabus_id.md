---
title: "Silabus Rekayasa Build Gradle Kotlin"
description: "Kurikulum 12 minggu tingkat lanjut tentang memperlakukan build Gradle sebagai perangkat lunak produksi: convention plugin, version catalog, KSP, konfigurasi varian, build cache, infrastruktur pengujian, dan rekayasa build di CI untuk proyek Kotlin dan Android."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Build Gradle Kotlin

## Ringkasan

Silabus 12 minggu ini memperlakukan build Gradle sebagai perangkat lunak produksi yang layak mendapat ketelitian yang sama dengan kode aplikasi. Jika Silabus Pengembangan Android membahas cara menulis aplikasi dan Silabus Kotlin Lanjutan membahas internal bahasa serta kompilator, kurikulum ini menyasar lapisan yang paling jarang dirancang secara sengaja oleh tim: build itu sendiri. Materi mencakup bagaimana proyek Kotlin multi-modul benar-benar me-resolve dependensi, mengapa skrip build membusuk menjadi salin-tempel, dan bagaimana menggantinya dengan version catalog serta convention plugin yang telah dikompilasi. Setelah itu kurikulum berlanjut ke toolchain kompilator Kotlin, pipeline processor KSP, variant API Android, mekanika configuration cache dan build cache, infrastruktur pengujian, konfigurasi shrinking, publikasi modul, serta rekayasa build di CI termasuk remote cache dan reproducible build. Setiap modul memadankan mekanisme dengan pengukuran: sebuah perubahan hanya dianggap benar ketika build scan membuktikan build lebih cepat atau pipeline CI membuktikan hasilnya stabil. Kursus ini diakhiri dengan proyek akhir yang memodernisasi proyek multi-modul realistis dari awal hingga akhir. Peserta diharapkan sudah nyaman membangun dan menjalankan proyek Kotlin atau Android serta membaca skrip build Groovy atau Kotlin DSL, tetapi tidak diperlukan pengalaman rekayasa build sebelumnya.

## Kurikulum

### Minggu 1: Model Eksekusi Gradle
- **Siklus hidup build**: fase inisialisasi, konfigurasi, dan eksekusi, serta alasan batas antar-fase berpengaruh besar pada performa
- **Settings dan struktur proyek**: `settings.gradle.kts`, included build, perbedaan jalur proyek dan tata letak direktori
- **Mekanika task graph**: registrasi versus konfigurasi task, dependensi task, `dependsOn` versus `mustRunAfter`
- **Internal Kotlin DSL**: accessor bertipe aman, accessor yang dihasilkan, delegasi dengan `by`, fungsi ekstensi pada `Project`
- **API lazy**: `Provider`, `Property`, `map`, `flatMap`, dan alasan blok `afterEvaluate` yang eager merusak caching
- **Praktik**: Lacak task graph nyata dengan `gradle :app:assembleDebug --dry-run` dan jelaskan setiap task dalam rantainya

### Minggu 2: Manajemen Dependensi dan Version Catalog
- **Deklarasi dependensi**: implementation versus api, compileOnly, runtimeOnly, dan risiko kebocoran akibat `api`
- **Version catalog**: struktur `libs.versions.toml`, alias, bundle, dan berbagi catalog antar-build
- **Keselarasan BOM dan platform**: impor `platform()`, platform yang dipaksakan, BOM Kotlin versus BOM Compose
- **Resolusi konflik**: `resolutionStrategy`, versi yang dipaksakan, `dependencyInsight` dan `dependencyUpdates`
- **Constraint dan capability**: blok `constraints`, virtual platform, capability yang saling eksklusif
- **Praktik**: Konsolidasikan string dependensi yang berserakan ke satu version catalog dan dokumentasikan hasil resolusi konfliknya

### Minggu 3: Convention Plugin dan Build Logic
- **Masalah salin-tempel**: bagaimana jumlah modul melipatgandakan blok skrip build yang terduplikasi
- **buildSrc versus build-logic**: included build, biaya waktu build, dan tempat yang tepat untuk masing-masing
- **Precompiled script plugin**: plugin `kotlin-dsl`, berkas konvensi `*.gradle.kts`, penerapan berdasarkan id
- **Plugin biner**: kelas extension bertipe, implementasi `Plugin<Project>`, validasi konfigurasi plugin
- **Konvensi yang dapat dikomposisi**: plugin berlapis (base, library, feature, compose) yang tersusun rapi
- **Praktik**: Ekstrak konfigurasi bersama proyek empat modul ke dalam build-logic dengan convention plugin yang dapat dikomposisi

### Minggu 4: Toolchain Kompilator Kotlin
- **Manajemen toolchain**: `jvmToolchain`, penyediaan otomatis, resolver foojay, kegagalan ketidakcocokan toolchain di CI
- **DSL compiler options**: blok `compilerOptions`, flag opt-in, `freeCompilerArgs`, mode progressive
- **Versi bahasa dan API**: penetapan `languageVersion` dan `apiVersion`, urutan migrasi ke K2
- **Pengaturan ketat**: `allWarningsAsErrors`, explicit API mode untuk library, anotasi opt-in
- **Kompilasi inkremental**: apa yang membatalkan cache inkremental Kotlin dan cara mendiagnosis rebuild penuh
- **Praktik**: Konfigurasikan modul library dengan explicit API mode dan penegakan warning-as-error, lalu perbaiki setiap pelanggaran yang muncul

### Minggu 5: Pemrosesan Anotasi dengan KSP
- **kapt versus KSP**: alasan stub kapt mahal, pohon keputusan migrasi
- **Mekanika KSP**: putaran pemrosesan simbol, sumber yang dihasilkan, konfigurasi dan argumen `ksp`
- **Konfigurasi processor**: ekspor skema Room, opsi kompilator Hilt, penerusan argumen per varian
- **Pemrosesan multi-putaran dan multi-modul**: visibilitas kode yang dihasilkan, `kspTest`, menghindari generasi sirkular
- **Pemrosesan inkremental**: dukungan inkremental di sisi processor, debugging invalidasi cache
- **Praktik**: Migrasikan modul berbasis kapt (Room dan Hilt) ke KSP, lalu bandingkan waktu build bersih dan inkremental lewat build scan

### Minggu 6: Konfigurasi Varian dan Build Android
- **Variant API**: `androidComponents.onVariants`, `beforeVariants`, dan legacy variant API yang sudah usang
- **Build type dan flavor**: dimensi flavor, urutan dimensi, filter varian untuk pengembangan lokal
- **Source set dan manifest merging**: resource per varian, placeholder manifest, penyelesaian konflik merge
- **BuildConfig dan konstanta yang dihasilkan**: `buildConfigField`, `resValue`, endpoint dan feature flag per varian
- **Manipulasi output**: penyesuaian sufiks application ID, version code, dan nama artefak per varian
- **Praktik**: Konfigurasikan tiga flavor dengan endpoint dan sufiks berbeda, lalu batasi build lokal ke satu varian saja

### Minggu 7: Performa Build dan Caching
- **Configuration cache**: pola plugin yang didukung, `notCompatibleWithConfigurationCache`, strategi migrasi
- **Mekanika build cache**: input dan output task, task yang cacheable, kunci cache lokal versus remote
- **Eksekusi paralel dan on-demand**: `org.gradle.parallel`, penggunaan worker API, menghindari state mutable bersama
- **Alat profiling**: `--profile`, timeline build scan, pemisahan waktu konfigurasi dan eksekusi
- **Pengukuran yang jujur**: benchmark build bersih, cache hangat versus dingin, menghindari pengukuran lokal yang menyesatkan
- **Praktik**: Ambil baseline build scan, hilangkan setiap pelanggaran configuration cache, dan dokumentasikan percepatan yang terukur

### Minggu 8: Infrastruktur Pengujian sebagai Urusan Build
- **Test suite**: JVM test suite, `useJUnitPlatform`, dependensi dan system property per suite
- **Test fixture**: plugin `java-test-fixtures` dan test fixtures Android, berbagi fake antar-modul
- **Uji instrumented versus unit**: pengkabelan source set, `testOptions`, managed device, matriks emulator
- **Paralelisme dan sharding**: `maxParallelForks`, distribusi pengujian ke shard CI, isolasi flaky test
- **Filter dan pelaporan**: filter test untuk pemilihan modul terdampak, laporan agregat, penyimpanan output kegagalan
- **Praktik**: Pecah satu task test monolitik menjadi suite unit, berbasis fixture, dan instrumented yang siap difilter di CI

### Minggu 9: Shrinking, Resource, dan Konfigurasi Startup
- **Konfigurasi R8 di build**: `proguardFiles`, consumer rule dari modul library, pengemasan rule
- **Mendiagnosis output shrinker**: `-whyareyoukeeping`, laporan missing class, penyimpanan berkas mapping
- **Resource shrinking**: `shrinkResources`, `keep.xml`, deteksi resource berlebih, referensi resource dinamis
- **Baseline profile**: pembuatan dan pengemasan baseline profile, pengukuran startup di CI
- **Inspeksi artefak**: `apkanalyzer`, inspeksi isi AAB, atribusi ukuran dex dan resource
- **Praktik**: Tambahkan consumer ProGuard rule ke modul library, perbaiki perilaku yang rusak akibat shrinker, dan ukur peningkatan startup dengan baseline profile

### Minggu 10: Publikasi dan Distribusi Modul
- **Dasar maven-publish**: publication, repository, kustomisasi POM, Gradle module metadata
- **Konvensi publikasi**: plugin publikasi yang dapat dipakai ulang, koordinat konsisten, penurunan versi dari tag git
- **Signing dan staging**: konfigurasi signing GPG, staging Sonatype atau Nexus, hook otomatisasi rilis
- **Publikasi Kotlin Multiplatform**: publication per target, metadata common, pembuatan source jar
- **Artefak dokumentasi**: integrasi Dokka, kesetaraan javadoc jar, publikasi dokumentasi di CI
- **Praktik**: Publikasikan modul library nyata ke repository Maven lokal dengan artefak tertandatangani, sumber, dan dokumentasi Dokka

### Minggu 11: Rekayasa Build di CI
- **Remote build cache**: penyiapan node cache, akses read-only versus read-write untuk branch yang tidak dipercaya
- **Verifikasi dan penguncian dependensi**: `verification-metadata.xml`, lockfile, manajemen checksum dalam skala besar
- **Reproducible build**: normalisasi timestamp, urutan arsip, verifikasi output deterministik
- **Desain pipeline CI**: deteksi modul terdampak, strategi matriks, penggunaan ulang artefak antar-job
- **Observabilitas build**: publikasi build scan, analitik kegagalan, pelacakan waktu build sebagai metrik
- **Praktik**: Rangkai pipeline CI dengan remote cache, verifikasi dependensi, dan gate regresi waktu build

### Minggu 12: Proyek Akhir
- **Penentuan cakupan**: pilih proyek Kotlin atau Android multi-modul dengan duplikasi nyata, build lambat, dan penggunaan processor campuran
- **Rencana modernisasi**: version catalog, convention plugin build-logic, penetapan toolchain, migrasi KSP
- **Pekerjaan performa**: kompatibilitas configuration cache, remote build cache, build scan sebelum dan sesudah yang terukur
- **Pengerasan CI**: pemilihan pengujian modul terdampak, verifikasi dependensi, artefak rilis yang reproducible
- **Presentasi**: sampaikan tinjauan rekayasa build yang mencakup arsitektur build, pengukuran, dan risiko rollback

## Proyek Akhir

Peserta menyerahkan **Platform Build Kotlin yang Dimodernisasi**: proyek multi-modul realistis yang diubah dari skrip build terduplikasi per modul menjadi build `build-logic` berlapis dengan convention plugin yang dapat dikomposisi serta satu version catalog tunggal. Kiriman yang kuat menunjukkan: setiap modul menerapkan konvensi berdasarkan plugin id tanpa blok konfigurasi hasil salin-tempel; toolchain Kotlin ditetapkan dengan explicit API mode dan penegakan warning pada modul library; pemrosesan anotasi dimigrasikan dari kapt ke KSP dengan peningkatan build inkremental yang terukur; build Android dikonfigurasi lewat variant API dengan flavor dan konstanta per varian; configuration cache aktif tanpa pelanggaran; remote build cache terpasang di CI dengan akses read-only untuk pull request; suite pengujian dipecah menjadi lapisan unit, fixture, dan instrumented dengan filter modul terdampak; consumer ProGuard rule dan baseline profile dikirim dari modul yang tepat; serta artefak library yang dipublikasikan lengkap dengan sumber dan dokumentasi. Deliverable mencakup repository, build scan sebelum dan sesudah, dokumen arsitektur build yang ringkas, dan pipeline CI yang gagal ketika terjadi regresi waktu build.

## Kriteria Penilaian

- **Tugas**: Latihan langsung mingguan (pelacakan task graph, konsolidasi catalog, ekstraksi convention plugin, pengerasan toolchain, migrasi KSP, penyiapan varian, migrasi cache, pemecahan test suite, perbaikan shrinking, publikasi) yang dinilai berdasarkan kebenaran, kemampuan pakai ulang build logic, dan kualitas pengukuran yang disertakan.
- **Kuis**: Dua kuis singkat yang mencakup fase siklus hidup Gradle, deklarasi input/output task dan cacheability, batasan configuration cache, semantik variant API, serta resolusi dan verifikasi dependensi.
- **Proyek Akhir**: Dievaluasi berdasarkan kualitas arsitektur build (pelapisan convention plugin, kebersihan catalog), hasil performa (peningkatan waktu build dan cache hit yang terverifikasi), kebenaran dan keamanan (verifikasi dependensi, artefak reproducible, rencana rollback), serta kejelasan tinjauan build tertulis.
- **Partisipasi**: Tinjauan sejawat atas build logic pada minggu 5 dan 9, dinilai dari kualitas umpan balik mengenai desain API dan kebenaran caching.

## Referensi

- [Panduan Pengguna Gradle — Authoring Builds](https://docs.gradle.org/current/userguide/userguide.html)
- [Primer Gradle Kotlin DSL](https://docs.gradle.org/current/userguide/kotlin_dsl.html)
- [Version Catalog Gradle](https://docs.gradle.org/current/userguide/version_catalogs.html)
- [Configuration Cache Gradle](https://docs.gradle.org/current/userguide/configuration_cache.html)
- [Build Cache Gradle](https://docs.gradle.org/current/userguide/build_cache.html)
- [Dokumentasi Kotlin Gradle Plugin](https://kotlinlang.org/docs/gradle-configure-project.html)
- [Referensi Compiler Options Kotlin](https://kotlinlang.org/docs/gradle-compiler-options.html)
- [Quickstart KSP dan Migrasi dari kapt](https://kotlinlang.org/docs/ksp-migrate-from-kapt.html)
- [Android Gradle Plugin — Konfigurasi Build Variant](https://developer.android.com/build/build-variants)
- [Android — Shrink, Obfuscate, dan Optimize Aplikasi](https://developer.android.com/build/shrink-code)
- [Ringkasan Baseline Profile](https://developer.android.com/topic/performance/baselineprofiles/overview)
- [Plugin Maven Publish Gradle](https://docs.gradle.org/current/userguide/publishing_maven.html)
- [Verifikasi Dependensi](https://docs.gradle.org/current/userguide/dependency_verification.html)

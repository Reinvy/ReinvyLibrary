---
title: "Silabus Rekayasa Performa Android Kotlin"
description: "Kurikulum 12 minggu tingkat lanjut untuk merekayasa aplikasi Android yang cepat, mulus, dan efisien dengan Kotlin — optimasi startup, anggaran frame dan rendering, performa Compose, profiling memori dan energi, pengurangan ukuran APK, serta pengujian performa di CI."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Performa Android Kotlin

## Ringkasan

Silabus 12 minggu ini melatih peserta untuk memperlakukan performa sebagai properti aplikasi Android yang diukur dan direkayasa, bukan sekadar pelengkap di akhir pengembangan. Jika Silabus Pengembangan Android memperkenalkan performa hanya sebagai satu minggu terakhir dan Silabus Kotlin Lanjutan memprofil lapisan bahasa dan JVM, kurikulum ini masuk lebih dalam ke platform: bagaimana startup aplikasi sebenarnya digerakkan oleh inisialisasi `Application` dan baseline profiles, bagaimana sebuah frame bertahan melalui pipeline choreographer, bagaimana Compose memutuskan apa yang perlu direkomposisi, bagaimana kebocoran memori dan bitmap berperilaku di bawah tekanan memori Android, bagaimana pengurasan baterai dan ukuran payload jaringan menurunkan kualitas pengalaman, serta bagaimana R8 dan App Bundles mengecilkan apa yang dikirim ke Play Store. Setiap minggu memadukan landasan konseptual dengan latihan terukur menggunakan Perfetto, JankStats, Macrobenchmark, LeakCanary, Battery Historian, atau dasbor Android Vitals. Peserta diharapkan sudah lancar membangun aplikasi Android dengan Kotlin dan Compose; kursus diakhiri dengan proyek kapstone yang mengaudit aplikasi nyata secara menyeluruh, mengukur kemacetan kinerjanya, memperbaikinya, dan membuktikan perbaikannya dengan pengukuran sebelum dan sesudah.

## Kurikulum

### Minggu 1: Pola Pikir Performa dan Fondasi Pengukuran
- **Mengapa performa adalah fitur**: riset retensi pengguna, ambang batas Android Vitals, dampak bisnis dari latensi startup dan jank
- **Metrik yang penting**: waktu mulai dingin/hangat/panas, waktu-ke-frame-pertama, frame terjatuh dan persentase jank, tingkat ANR, sesi bebas-crash, wakeup berlebihan, frame beku
- **Perangkat pengukuran**: trace Perfetto, Systrace, `adb shell dumpsys`, `screenrecord`, dasar-dasar pustaka JankStats
- **Anggaran performa**: menetapkan anggaran per jalur (startup < 2 dtk di perangkat kelas bawah, anggaran frame 16 ms, tugas thread utama < 10 ms)
- **Strategi perangkat dasar**: pengujian di perangkat kelas menengah-bawah, efek throttling CPU dan termal, selisih emulator versus perangkat fisik
- **Latihan**: Ambil trace Perfetto dari cold start aplikasi, identifikasi lima segmen terlama, dan tulis dokumen anggaran performa satu halaman

### Minggu 2: Optimasi Startup Aplikasi
- **Jenis startup**: definisi cold, warm, dan hot start serta bagaimana sistem memfasenya (spawn proses, `Application.onCreate`, frame pertama)
- **Audit kelas `Application`**: menunda pekerjaan — `enableStrictMode`, biaya inisialisasi `contentProvider`, inisialisasi `androidx.startup`, singleton lazy
- **Diet thread utama**: memindahkan pekerjaan disk, jaringan, dan refleksi dari jalur kritis, penalti `StrictMode`, thread pool dan coroutine dispatchers
- **Splash screen dan frame pertama**: API `SplashScreen`, themed launch screens, menghindari layout thrash sebelum draw pertama
- **Baseline Profiles**: cara kerja Cloud Profiles dan baseline profiles, membuatnya dengan Macrobenchmark, trade-off instalasi profil dan waktu kompilasi
- **Latihan**: Kurangi cold start sebesar 30% di perangkat kelas bawah, verifikasi dengan `adb shell am start -W` dan trace Perfetto sebelum/sesudah

### Minggu 3: Rendering dan Anggaran Frame 16 ms
- **Pipeline grafis**: Choreographer, vsync, `SurfaceFlinger`, triple buffering, dan tempat jank lahir
- **Analisis waktu frame**: garis waktu frame Perfetto, dumpsys `gfx-info`, identifikasi fase binder, layout, draw, dan rasterisasi
- **JankStats di produksi**: pustaka JankStats, listener durasi frame, heuristik dan pengelompokan jank, pelaporan ke analitik
- **Overdraw dan invalidasi**: GPU overdraw (debug overdraw `adb shell dumpsys gfxinfo`), menghindari redraw redundan di views dan Compose
- **Layer dan efek**: biaya alpha, elevation, blur dan shadow, menghindari kebocoran layer, `clipToOutline` dan hardware layers
- **Latihan**: Pasang JankStats pada aplikasi, reproduksi scroll yang janky di perangkat kelas bawah, dan perbaiki masalah pipeline frame dengan peningkatan terukur

### Minggu 4: Pendalaman Performa Jetpack Compose
- **Model komposisi ulang**: cara Compose melacak pembacaan status, hitungan skip, dan mengapa "recomposition berjalan" tidak sama dengan "recomposition dibutuhkan"
- **Stabilitas dan skippability**: anotasi `@Stable`/`@Immutable`, parameter tidak stabil, aturan lint untuk stabilitas, mode `strong skipping`
- **Cakupan state**: `derivedStateOf`, `remember`, `rememberUpdatedState`, hoisting state, meminimalkan cakupan pembacaan
- **Daftar dan lazy layouts**: item key `LazyColumn`, `contentType`, jumlah item besar, menghindari jebakan komposisi ulang `items`
- **Animasi dan grafis tak terbatas**: biaya `Animatable`, `rememberInfiniteTransition`, `graphicsLayer` untuk transformasi, menghindari alokasi `Modifier.*`
- **Latihan**: Gunakan laporan compiler Compose untuk menstabilkan layar, potong separuh miss cakupan komposisi ulang, dan verifikasi waktu frame dengan Macrobenchmark

### Minggu 5: Manajemen Memori dan Profiling
- **Model memori Android**: batas heap per aplikasi, `lowmemorykiller`, `lmkd`, proses mati dan dibuat ulang, `onTrimMemory`
- **Deteksi kebocoran**: heap dump LeakCanary, Memory Profiler Android Studio, analisis retained size, pola kebocoran umum (konteks, listener, coroutine)
- **Memori bitmap**: `ARGB_8888` versus `RGB_565`, downsampling dengan `inSampleSize`, cache memori Coil/Glide, hardware bitmaps
- **Garbage collection**: jeda GC di ART, tekanan alokasi, churn objek di jalur panas, menghindari alokasi di `draw`/komposisi
- **Data besar dan memory-mapped**: `ByteBuffer`, set JSON besar, paginasi koleksi besar, penentuan ukuran dan eviction `LruCache`
- **Latihan**: Reproduksi kebocoran, ambil dan analisis heap dump, hilangkan kebocoran, dan konfirmasi memori stabil pada sesi 100 scroll

### Minggu 6: Optimasi Energi dan Baterai
- **Anatomi baterai**: Battery Historian dan Battery Stats, `dumpsys batterystats`, rincian discharge per paket, bucket Doze dan App Standby
- **Wake lock dan alarm**: wake lock `PowerManager`, `AlarmManager` dan alarm presisi, pembatasan `setExactAndAllowWhileIdle`
- **Penjadwalan WorkManager**: pekerjaan yang dapat ditunda, `uniqueWork`, constraints, kebijakan backoff, penggabungan pekerjaan jaringan
- **Sensor dan lokasi**: sensor batching, `SENSOR_DELAY_UI` versus game, throttling permintaan lokasi, batas foreground service
- **Jaringan dan wake-up**: penggabungan upload, koalesensi pesan push, menghindari wakeup per pesan, `JobScheduler`
- **Latihan**: Ukur pengurasan baterai aplikasi selama jendela 12 jam idle-plus-pakai, hilangkan tiga penyebab wake-up terbesar, dan ukur kembali selisihnya

### Minggu 7: Optimasi Ukuran APK dan Build
- **Anggaran ukuran dan alasannya**: dampak konversi instalasi, wawasan ukuran Play Console, split per-ABI dan per-density
- **R8 dan ProGuard**: shrinking, obfuscation, optimasi, keep rules, laporan `-printusage` dan missing-class, eliminasi kode khusus debug
- **Penyusutan resource**: `shrinkResources`, penghapusan resource tak terpakai, `resConfigs`, batasan locale dan density
- **App Bundles dan Dynamic Delivery**: publikasi AAB, APK per perangkat, on-demand dan asset packs untuk fitur besar
- **Performa build**: Gradle configuration cache, build cache, kompilasi inkremental Kotlin, mencegah pembengkakan dependensi dengan analisis dependensi
- **Latihan**: Potong ukuran APK 25% dengan aturan R8, penyusutan resource, dan pembersihan dependensi, lalu verifikasi ukuran APK per perangkat dari AAB

### Minggu 8: Performa Jaringan dan Pemuatan Gambar
- **Fondasi HTTP**: connection pooling, penggunaan ulang sesi TLS, timing interceptor OkHttp, `cacheControl`
- **Payload respons**: ukuran JSON dan biaya parsing, performa kotlinx.serialization, trade-off protobuf dan gzip, desain paginasi dan cursor
- **Pipeline gambar**: siklus permintaan Coil/Glide, penentuan ukuran cache memori dan disk, biaya `size` dan `crossfade`, strategi preload dan placeholder
- **Offline dan retry**: caching offline-first, stale-while-revalidate, exponential backoff, network security config
- **Observabilitas jaringan**: Network Inspector, logging OkHttp, penelusuran timeline dengan Perfetto, pemantauan Firebase Performance
- **Latihan**: Profil feed berbasis gambar yang lambat, terapkan cache-first loading dan kompresi payload, dan dokumentasikan peningkatan latensi median

### Minggu 9: Performa Penyimpanan, Database, dan IO
- **SQLite dan Room**: perencanaan query, `EXPLAIN QUERY PLAN`, indeks, panduan `@Index`, menghindari N+1 dengan relasi dan `Flow`
- **Disiplin transaksi**: `withTransaction`, insert massal, `TRUNCATE` versus `DELETE`, menghindari transaksi per baris
- **DataStore, file, dan serialisasi**: Preferences DataStore versus Proto DataStore, IO file di dispatcher latar belakang, buffering `Okio`
- **IO di thread yang tepat**: deteksi akses disk di thread utama, penalti disk-read `StrictMode`, batas `Dispatchers.IO`
- **Penanganan data besar**: paginasi hasil set besar, streaming dengan `Flow`, trade-off memori dari memuat seluruh tabel
- **Latihan**: Optimasi query feed berbasis Room dari 800 ms menjadi di bawah 100 ms di perangkat kelas bawah menggunakan indeks dan batch transaksi

### Minggu 10: Stabilitas — ANR, Crash, dan StrictMode
- **Anatomi ANR**: jenis ANR input dispatch, broadcast, dan service, siklus dialog ANR, pengujian `adb shell am hang`
- **Pelanggaran thread utama**: menemukan penyebab ANR dengan trace (`/data/anr/`), lock terblokir, panggilan binder, timeout `Choreographer`
- **Kesehatan crash**: crash-free user rate, pengelompokan crash Android Vitals, praktik terbaik `Thread.UncaughtExceptionHandler`, simbol crash native
- **StrictMode sebagai pagar**: mengaktifkan di debug, `detectAll`, penalti logging versus death, penerapan dalam staged rollouts
- **Pemulihan dan ketahanan**: alur pemulihan crash, pemulihan state, startup setelah crash, menghindari crash loop
- **Latihan**: Picu ANR secara artifisial, ambil dan baca trace ANR, perbaiki panggilan yang memblokir, dan tambahkan pagar StrictMode untuk mencegah regresi

### Minggu 11: Pengujian Performa dan Gerbang CI
- **Fondasi Macrobenchmark**: `MacrobenchmarkRule`, benchmark startup dan scroll, `startupMode`, mode kompilasi
- **Pembuatan Baseline Profile**: `BaselineProfileRule`, profile consumers, mengirim profil dalam AAB, mengukur peningkatan aplikasi terinstal
- **Microbenchmark dan perf tingkat unit**: `MicrobenchmarkRule`, mengukur biaya metode, menghindari varians perangkat pengujian
- **Integrasi CI**: Gradle Managed Devices, Firebase Test Lab, grafik benchmark dan ambang gerbang, gagalkan build pada regresi
- **Pengukuran berkelanjutan**: menyimpan artefak benchmark, menjalankan nightly, alerting pada penyimpangan jank dan startup, pemantauan Android Vitals pasca-rilis
- **Latihan**: Tambahkan Macrobenchmark startup dengan baseline profile ke proyek, sambungkan ke CI dengan ambang regresi, dan buktikan baseline profile yang digabung mempercepat cold start

### Minggu 12: Kapstone — Audit dan Optimasi Performa Menyeluruh
- **Rencana audit**: pilih aplikasi nyata, tetapkan metrik keberhasilan dan anggaran, inventarisasi titik masalah yang diketahui, jadikan baseline setiap target dengan trace
- **Optimasi sistematis**: terapkan teknik startup, rendering, Compose, memori, baterai, ukuran, jaringan, dan IO sesuai urutan prioritas
- **Disiplin pengukuran**: trace sebelum/sesudah untuk setiap perubahan, eksperimen satu variabel, dokumentasikan setiap perbaikan dengan angka
- **CI dan perlindungan regresi**: tambahkan benchmark dan ambang otomatis, perbarui baseline profiles, kirim suite regresi performa
- **Pelaporan**: tulis laporan audit performa dengan hasil kuantitatif, analisis biaya-manfaat setiap perubahan, dan rekomendasi lanjutan
- **Presentasi**: demo pengalaman sebelum/sesudah di perangkat kelas bawah, pertahankan hasil pengukuran, dan serahkan daftar periksa audit yang dapat direproduksi

## Proyek Akhir

Peserta memilih aplikasi Android nyata (aplikasi sendiri, proyek open source, atau aplikasi referensi yang disediakan) dan menjalankan siklus rekayasa performa yang lengkap: menetapkan anggaran terukur, mengambil trace baseline Perfetto/Macrobenchmark, mengidentifikasi kemacetan teratas di startup, rendering, komposisi ulang Compose, memori, baterai, ukuran, jaringan, dan penyimpanan, menerapkan perbaikan sesuai urutan prioritas, dan membuktikan setiap peningkatan dengan pengukuran sebelum/sesudah yang berpasangan. Deliverable mencakup dokumen anggaran performa, daftar periksa audit yang digunakan, suite benchmark otomatis dengan ambang CI, dan laporan akhir yang mengukur peningkatan menyeluruh — misalnya waktu cold start turun sesuai persentase target, persentase jank berkurang setengahnya, atau crash-free rate naik melewati ambang baik Android Vitals. Proyek dinilai berdasarkan ketelitian metodologi pengukuran, dampak nyata dari perbaikan, dan keterulangan hasil pada perangkat uji kelas bawah yang didokumentasikan.

## Kriteria Penilaian

- **Tugas**: Latihan pengukuran mingguan (trace Perfetto, integrasi JankStats, analisis heap dump, laporan battery historian) dinilai berdasarkan kelengkapan metodologi pengukuran, ketepatan diagnosis, dan kualitas bukti sebelum/sesudah. Kuis mencakup interpretasi trace, mekanika pipeline frame, aturan stabilitas Compose, dan ambang Android Vitals.
- **Proyek Akhir**: Kapstone divalidasi terhadap anggaran performa yang ditetapkan — setiap peningkatan yang diklaim harus didukung trace atau benchmark yang dapat direproduksi pada perangkat uji dan mode kompilasi yang dideklarasikan. Kredit diberikan untuk perbaikan yang angkanya bertahan di beberapa kali penjalanan, untuk gerbang regresi CI yang efektif, dan untuk pelaporan jujur atas perbaikan yang tidak menggerakkan metrik.

## Referensi

- [Dokumentasi performa Android](https://developer.android.com/topic/performance)
- [Dokumentasi tracing Perfetto](https://perfetto.dev/docs/)
- [Dasbor Android Vitals](https://developer.android.com/topic/performance/vitals)
- [Panduan performa startup aplikasi](https://developer.android.com/topic/performance/app-startup)
- [Panduan Baseline Profiles](https://developer.android.com/studio/profile/baselineprofiles)
- [Dokumentasi Macrobenchmark](https://developer.android.com/topic/performance/benchmarking/macrobenchmark-overview)
- [Dokumentasi performa Jetpack Compose](https://developer.android.com/jetpack/compose/performance)
- [Dokumentasi LeakCanary](https://square.github.io/leakcanary/)
- [Battery Historian](https://github.com/google/battery-historian)
- [Panduan mengurangi ukuran APK](https://developer.android.com/topic/performance/reduce-apk-size)
- [Pustaka JankStats](https://developer.android.com/jetpack/androidx/releases/jankstats)

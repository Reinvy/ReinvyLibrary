---
title: "Silabus Platform Engineering React Native"
description: "Kurikulum lanjutan enam modul yang mengubah pengembang React Native senior menjadi platform engineer yang bertanggung jawab atas arsitektur aplikasi, native module, anggaran performa, pipeline rilis, observabilitas, dan keamanan mobile."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Platform Engineering React Native

## Ringkasan

Sebagian besar materi React Native mengajarkan cara membangun layar aplikasi. Silabus ini mengajarkan peran lainnya: platform engineer yang memiliki fondasi bersama tempat tim produk membangun di atasnya. Artinya, arsitektur rendering dan migrasi New Architecture, lapisan native module yang menjembatani JavaScript ke Kotlin dan Swift, anggaran performa serta memori agar aplikasi besar tetap mulus di perangkat Android kelas menengah, pipeline rilis dan over-the-air yang mengirim ratusan build per tahun, tumpukan observabilitas yang bisa menjawab "kenapa aplikasi ini crash di Samsung A14?", serta postur keamanan yang melindungi kredensial dan data pengguna di perangkat yang tidak Anda kendalikan.

Enam modul disusun mengikuti cara tim platform benar-benar matang: pahami runtime-nya dulu, lalu perluas secara native, lalu ukur, lalu rilis dengan aman, lalu observasi di produksi, lalu perkuat keamanannya. Setiap modul memakan waktu satu sampai dua minggu belajar paruh waktu dengan lab praktik yang menghasilkan artefak yang bisa dipakai ulang pada proyek akhir — dokumen keputusan desain, native module yang berjalan, harness benchmark, skrip rilis, dasbor, atau threat model.

Setiap lab dinilai dengan batasan produksi, bukan contoh mainan: cold start di perangkat kelas bawah, selisih ukuran bundle, crash-free session rate, dampak frame p95, dan waktu rollback. Peserta menyelesaikan kursus dengan platform handbook untuk aplikasi React Native nyata yang dipakai banyak tim.

## Kurikulum

### Modul 1: Runtime dan Arsitektur (Minggu 1–2)

- **Cara React Native melakukan rendering**
  - Tiga thread: JavaScript, native/UI, dan shadow tree
  - Renderer Fabric, alur render, serta efek layout sinkron
  - TurboModules dan JSI — mengapa bridge lama menjadi bottleneck
- **Perencanaan migrasi**
  - Interop layer dan adopsi bertahap alih-alih menulis ulang total
  - Audit library untuk kompatibilitas New Architecture
  - Feature flag agar kedua renderer bisa berjalan selama rollout
- **Arsitektur repositori dalam skala besar**
  - Struktur monorepo: app shell, paket bersama, design system, paket platform
  - Batas dependensi dan hal yang tidak boleh diimpor oleh paket bersama
  - Kepemilikan kode dan aturan CODEOWNERS untuk mencegah kopling tak sengaja
- **Lab**: Menyusun architecture decision record yang memetakan setiap dependensi pihak ketiga ke status New Architecture beserta urutan migrasi dan tingkat risikonya

### Modul 2: Native Module dan Lapisan Platform (Minggu 3–4)

- **Menulis TurboModule**
  - File spec TypeScript, keluaran codegen, dan jaminan dari kode yang dihasilkan
  - Implementasi Kotlin dengan siklus hidup `ReactContext` dan dispatch ke main thread
  - Implementasi Swift/Objective-C dan registrasi modul
- **Komponen Fabric**
  - Kapan native view dibenarkan dibanding komposisi JavaScript murni
  - Props, event, pembaruan state, dan pengukuran layout dari sisi native
- **JSI dan state C++ bersama**
  - Panggilan sinkron dan kondisi aman penggunaannya
  - Host object, kepemilikan memori, dan pencegahan kebocoran di batas bahasa
- **Lab**: Merilis TurboModule yang menjalankan kapabilitas perangkat nyata (pembuatan kunci aman atau telemetri baterai) lengkap dengan definisi tipe, unit test di kedua platform, dan fallback terdokumentasi untuk perangkat yang tidak mendukung

### Modul 3: Performance Engineering (Minggu 5–6)

- **Mengukur sebelum mengoptimalkan**
  - Trace startup: TTI, cold start, dan biaya evaluasi bundle
  - Pengukuran frame dengan performance monitor serta Systrace/Perfetto
  - Bytecode Hermes: apa yang berubah dan cara melakukan profiling
- **Anggaran rendering**
  - FlatList versus FlashList, windowing, dan `getItemLayout`
  - Disiplin memoisasi dan pencegahan kaskade re-render
  - Dekode gambar, caching, dan tekanan memori di Android
- **Bundle dan memori**
  - Analisis bundle, tree shaking, dan pemuatan rute secara lazy
  - Ukuran binary native: Hermes, ABI, dan aturan ProGuard/R8
  - Deteksi kebocoran dengan heap snapshot dan Memory Profiler Android Studio
- **Lab**: Membangun harness benchmark yang dapat diulang untuk mencatat cold start, frame time p95, dan memori puncak per commit, lalu memangkas waktu startup minimal 30 persen

### Modul 4: Release Engineering (Minggu 7–8)

- **Pipeline build**
  - Desain CI: caching, job paralel, dan instalasi dependensi yang reproducible
  - Signing, keystore, dan pengelolaan secret di CI
  - Strategi versioning dan otomasi changelog
- **Pembaruan over-the-air**
  - Cara kerja OTA ala CodePush dan batasan kebijakan store
  - Rollout bertahap, penargetan kohort, dan pemicu rollback otomatis
  - Kompatibilitas bundle JS OTA dengan versi binary native
- **Pengiriman ke store**
  - Android App Bundle, staged rollout Play, dan phased release iOS
  - Menangani penolakan review dan jalur hotfix
- **Lab**: Membangun pipeline rilis yang menghasilkan artefak bertanda tangan, mengirim pembaruan OTA ke kohort internal, dan melakukan rollback otomatis ketika crash-free session turun di bawah ambang

### Modul 5: Observabilitas di Produksi (Minggu 9–10)

- **Pelaporan crash dan error**
  - Simbolikasi crash native, error boundary JavaScript, dan stack trace Hermes
  - Pengelompokan, deduplikasi, dan kepemilikan triage
- **Telemetri produk dan performa**
  - Skema event terstruktur dan kontrak analytics yang berversi
  - Waktu muat layar, latensi jaringan, dan trace interaksi
  - Instrumentasi yang aman privasi dan penanganan consent
- **Alerting dan diagnosis**
  - SLO mobile: crash-free sessions dan tingkat ANR
  - Runbook yang menghubungkan alert ke dasbor, rilis, dan pemilik
- **Lab**: Melakukan instrumentasi aplikasi contoh secara menyeluruh, membangun dasbor crash-free sessions dan waktu startup per versi aplikasi serta kelas perangkat, lalu menulis runbook untuk alert regresi startup

### Modul 6: Keamanan dan Hardening Mobile (Minggu 11–12)

- **Threat model untuk aplikasi publik**
  - Perangkat bersifat hostile: jailbreak/root, instrumentasi, dan repackaging
  - Apa yang bisa dan tidak bisa dilindungi kode sisi klien
- **Secret dan penyimpanan**
  - Keychain dan Keystore, kunci dengan gerbang biometrik, serta database lokal terenkripsi
  - Mengapa menaruh API key di bundle selalu menjadi temuan
- **Jaringan dan transport**
  - Trade-off certificate pinning dan rencana rotasi
  - Deteksi jailbreak sebagai sinyal, bukan gerbang tunggal
- **Supply chain**
  - Review dependensi, integritas lockfile, dan risiko skrip postinstall
  - Pembuatan SBOM untuk build mobile
- **Lab**: Melakukan review keamanan aplikasi contoh, menghasilkan threat model berprioritas beserta mitigasinya, serta mengimplementasikan certificate pinning dan penyimpanan kredensial aman dengan prosedur rotasi terdokumentasi

## Proyek Akhir

Peserta menghasilkan **platform handbook dan reference implementation** untuk aplikasi React Native fiktif namun realistis dengan banyak tim: empat squad produk merilis ke satu binary. Deliverable berisi monorepo yang berjalan dengan paket platform bersama, minimal satu TurboModule kustom dan satu komponen Fabric, harness benchmark yang terhubung ke CI, pipeline rilis dengan build bertanda tangan serta OTA bertahap dengan rollback otomatis, dasbor observabilitas untuk crash-free sessions dan waktu startup per versi dan kelas perangkat, serta bagian keamanan berisi threat model, strategi pinning, dan keluaran SBOM. Setiap artefak harus didukung pengukuran atau konfigurasi yang benar-benar masuk ke repositori, bukan sekadar narasi.

## Kriteria Penilaian

- **Lab modul (50 persen)**: Setiap lab dinilai dari apakah artefaknya berjalan, apakah pengukurannya dapat direproduksi, dan apakah trade-off didokumentasikan dengan bukti, bukan opini.
- **Proyek akhir (35 persen)**: Dinilai dari koherensi arsitektur di keenam area, kebenaran alur rilis dan rollback, kegunaan dasbor observabilitas, serta kredibilitas threat model dan mitigasinya.
- **Design review (15 persen)**: Dua sesi presentasi terekam di mana peserta mempertahankan sebuah keputusan — misalnya memilih native view dibanding komposisi JavaScript, atau menerima regresi startup demi sebuah fitur — dan menjawab sanggahan reviewer.

## Referensi

- Dokumentasi React Native: panduan New Architecture, TurboModules, Fabric, dan JSI
- Komunitas React Native: release notes, upgrade helper, dan diskusi breaking change
- Dokumentasi Android developer: App Bundle, ProGuard/R8, Perfetto, dan staged rollout Play
- Dokumentasi Apple developer: code signing, Keychain Services, dan phased release
- Repositori dan dokumentasi bytecode Hermes
- "The Pragmatic Programmer" untuk decision record dan penalaran trade-off
- Google SRE Workbook, bab tentang SLO dan runbook, diadaptasi untuk mobile
- OWASP Mobile Application Security Verification Standard (MASVS)

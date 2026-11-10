---
title: "Silabus Rekayasa Keamanan Android Kotlin"
description: "Kurikulum lanjutan 10 minggu untuk merekayasa aplikasi Android yang aman dengan Kotlin — pemodelan ancaman terhadap MASVS, kriptografi berbasis Keystore, strategi transport dan pinning, OAuth dengan PKCE dan sesi terikat biometrik, Play Integrity dan anti-tampering, pengerasan komponen serta IPC, kustodi signing key dan integritas supply chain, rekayasa privasi, serta praktik pengujian keamanan berbasis ancaman."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Keamanan Android Kotlin

## Ringkasan

Silabus lanjutan 10 minggu ini memperlakukan keamanan Android sebagai disiplin rekayasa yang mencakup seluruh siklus hidup produk, bukan sebagai daftar periksa yang dijalankan menjelang rilis. Jika Cheatsheet Pengerasan Keamanan Android Kotlin menyediakan potongan kode siap tempel, kurikulum ini membangun penalaran untuk memilih potongan mana yang benar untuk ancaman tertentu: bagaimana memodelkan apa yang sebenarnya diincar penyerang dari aplikasi Anda, bagaimana kunci dibuat, dilindungi, dirotasi, dan dihancurkan, bagaimana sesi diikat ke perangkat dan ke manusia, bagaimana aplikasi membuktikan integritasnya sendiri ke backend, dan bagaimana pipeline rilis menjaga signing key serta dependensi tetap tepercaya.

Setiap minggu memadukan model ancaman dengan lab praktik menggunakan perkakas produksi — Android Keystore dan StrongBox, Network Security Config, OkHttp, Custom Tabs dengan PKCE, BiometricPrompt dengan crypto object, Play Integrity API, R8, MobSF, Frida, dan verifikasi dependensi Gradle. Kursus ini mengasumsikan peserta sudah lancar membangun aplikasi Android dengan Kotlin dan Compose serta nyaman dengan coroutine, Gradle, dan autentikasi HTTP dasar. Kursus ditutup dengan proyek akhir berupa tinjauan keamanan menyeluruh pada aplikasi nyata: model ancaman, temuan, remediasi, dan bukti bahwa setiap remediasi tetap bertahan saat diserang.

## Kurikulum

### Minggu 1: Pemodelan Ancaman dan Permukaan Serangan Android

- **Makna rekayasa keamanan di mobile**: posisi penyerang, mengapa "server sudah aman" bukan model ancaman mobile, dan perbedaan antara kerentanan dan cacat desain
- **Inventarisasi aset dan klasifikasi data**: mengidentifikasi kredensial, token, data pribadi, alur pembayaran, dan logika proprietary, lalu mengklasifikasikan masing-masing berdasarkan sensitivitas dan dampak jika bocor
- **Pemodelan ancaman secara praktis**: STRIDE diterapkan pada aplikasi Android, diagram aliran data yang mencakup perangkat, backend, dan SDK pihak ketiga, serta batas kepercayaan di tepi sandbox aplikasi
- **Standar acuan**: kategori OWASP MASVS (storage, crypto, auth, network, platform interaction, code quality, resilience, privacy) dan bagaimana MASVS-L1/L2/R dipetakan ke tingkat risiko aplikasi
- **Konteks regulasi**: kewajiban GDPR dan UU PDP Indonesia, minimalisasi data, batas retensi, dan apa yang sebenarnya harus dicatat sebagai "persetujuan"
- **Praktik**: Menyusun model ancaman satu halaman untuk aplikasi contoh yang beririsan dengan perbankan — aset, titik masuk, batas kepercayaan, lima ancaman teratas yang diperingkat berdasarkan kemungkinan dan dampak, serta kontrol MASVS yang terkait

### Minggu 2: Kriptografi dan Data Saat Disimpan

- **Dasar Android Keystore**: pembuatan kunci di dalam TEE atau StrongBox, alias kunci, purpose dan padding, serta mengapa materi kunci yang terekspor menghapus seluruh manfaatnya
- **Desain hierarki kunci**: master key di Keystore yang membungkus data-encryption key, kunci per record, versi kunci, dan rotasi tanpa mengenkripsi ulang seluruh data
- **Memilih primitif dengan benar**: AES-GCM dengan nonce unik, mengapa ECB dan IV statis bersifat katastrofik, authenticated encryption versus MAC terpisah, dan kapan HMAC hanya untuk integritas
- **Kebijakan akses kunci**: `setUserAuthenticationRequired`, durasi validitas autentikasi, invalidasi saat pendaftaran biometrik berubah, dan penanganan `KeyPermanentlyInvalidatedException`
- **Penyimpanan terstruktur**: EncryptedSharedPreferences untuk rahasia kecil, Room berbasis SQLCipher untuk basis data, enkripsi streaming untuk berkas, dan biaya dekripsi blob besar di main thread
- **Mode kegagalan**: kebocoran melalui backup dan transfer perangkat, `allowBackup`, basis data yang terekspor, log yang menangkap payload terdekripsi, serta crash reporter yang mengunggah isi memori
- **Praktik**: Membangun modul Kotlin kecil yang menyimpan refresh token dan basis data lokal di balik DEK yang dibungkus Keystore, lalu menyerang build sendiri dengan menarik direktori data aplikasi dari emulator yang di-root

### Minggu 3: Keamanan Transport dan Strategi Pinning

- **TLS sebagai batas bawah, bukan fitur**: minimum TLS 1.2, cipher suite di Android modern, dan mengapa cleartext harus mustahil secara struktural, bukan sekadar dihindari secara konvensi
- **Network Security Config**: `cleartextTrafficPermitted="false"`, pin per domain, debug-overrides untuk pengembangan lokal, dan mempercayai CA pengguna hanya pada build debug
- **Mekanika pinning**: certificate pinning versus public-key pinning, masa berlaku pin dan pin cadangan, biaya operasional rotasi pin, serta apa yang terjadi bila kumpulan pin salah
- **Implementasi pinning**: `CertificatePinner` pada OkHttp, pin pada network security config, dan trade-off antara kedalaman pinning dan kelincahan rilis
- **Pengerasan sisi server yang berpasangan dengan pinning**: token berumur pendek, mutual TLS untuk API bernilai tinggi, header integritas, dan perlindungan replay
- **Anti-pola**: mempercayai semua sertifikat di build rilis, mematikan verifikasi hostname, mem-pin sertifikat leaf yang berotasi setiap 90 hari, dan mengirim pin yang tidak dapat dirotasi dari jarak jauh
- **Praktik**: Mengonfigurasi Network Security Config dengan pin cadangan dan debug override, memverifikasi melalui proxy bahwa build yang salah konfigurasi gagal secara tertutup, lalu menulis runbook untuk rotasi pin darurat

### Minggu 4: Autentikasi, Sesi, dan Pengikatan Biometrik

- **OAuth 2.0 dan OIDC di Android**: authorization code flow dengan PKCE, mengapa implicit flow sudah mati, Custom Tabs dibanding WebView tertanam, dan verifikasi redirect URI dengan App Links
- **Siklus hidup token**: access token versus refresh token, batas penyimpanan, rotasi refresh dan deteksi penyalahgunaan ulang, revokasi saat logout, dan inventaris sesi multi-perangkat
- **Pengikatan biometrik**: BiometricPrompt dengan `CryptoObject`, mengikat kunci pada autentikasi yang berhasil, dan membedakan pembukaan cepat dari otorisasi bertingkat untuk aksi sensitif
- **Autentikasi bertingkat**: aturan autentikasi ulang untuk pembayaran, perubahan profil, dan ekspor kunci, serta cara merancangnya tanpa merusak pengalaman pengguna
- **Higiene sesi**: batas waktu idle dan absolut, validasi ulang saat kembali dari background, perlindungan screenshot dan recents dengan `FLAG_SECURE`, serta pembatasan clipboard untuk rahasia
- **Pemulihan akun sebagai jalur serangan**: kelemahan OTP SMS, SIM swap, alur pergantian perangkat, dan mengapa pemulihan menuntut ketelitian yang sama dengan login
- **Praktik**: Mengimplementasikan login PKCE melalui Custom Tabs dengan refresh token yang dilindungi Keystore, membatasi konfirmasi pembayaran di balik kunci terikat biometrik, dan membuktikan bahwa berkas token yang dicuri tidak dapat diputar ulang setelah logout

### Minggu 5: Integritas Aplikasi, Anti-Tampering, dan Resiliensi

- **Apa yang bisa dan tidak bisa dibuktikan oleh atestasi integritas**: verdict Play Integrity API, nonce permintaan, verifikasi di sisi server, dan batas kepercayaan sisi klien
- **Verifikasi signature**: membaca sertifikat signing saat runtime, mendeteksi build hasil repackaging, dan sia-sianya pemeriksaan murni sisi klien dibanding atestasi yang diverifikasi server
- **Deteksi root dan emulator**: sinyal praktis, false positive pada ROM kustom, dan memperlakukan deteksi sebagai sinyal risiko yang menaikkan kontrol server, bukan pemblokiran keras
- **Obfuscation dan shrinking**: konfigurasi R8 yang menjaga reflection dan serialisasi, penggantian nama kelas dan resource, penghapusan logging debug di rilis, dan verifikasi bahwa shrinker tidak merusak jalur kritis keamanan
- **Ketahanan terhadap reverse engineering**: apa yang dapat dipulihkan Frida, objection, dan dekompilasi statis dari build tanpa perlindungan, serta pertahanan mana yang benar-benar menaikkan biaya serangan
- **Desain fail-safe**: jalur degradasi saat atestasi gagal, pembatasan fitur secara bertahap, dan tidak pernah membocorkan alasan spesifik kegagalan pemeriksaan
- **Praktik**: Menambahkan verifikasi Play Integrity pada endpoint login, menjalankan build rilis melalui MobSF dan skrip hook Frida, mendokumentasikan apa yang berhasil dipulihkan penyerang, lalu memperkuat temuan dengan nilai tertinggi

### Minggu 6: Pengerasan Komponen, IPC, dan WebView

- **Masalah komponen terekspor**: default `android:exported`, intent filter yang diam-diam mengekspos activity, dan rutinitas audit manifest
- **Deep link dan App Link**: App Links terverifikasi dengan asset links, skema kustom tak terverifikasi sebagai permukaan serangan, injeksi parameter, dan rantai open redirect
- **Content provider dan berbagi berkas**: konfigurasi jalur `FileProvider`, flag grant, kebocoran melalui `ClipData`, dan menghindari kesalahan bergaya `MODE_WORLD_READABLE`
- **Broadcast dan PendingIntent**: paparan broadcast implisit, flag `PendingIntent` mutable versus immutable, dan intent redirection ketika aplikasi jahat memasok target
- **Pembajakan task dan activity**: task affinity, jebakan `singleTask`, dan pertahanan layar sensitif terhadap overlay serta tapjacking
- **Keamanan WebView**: paparan JavaScript bridge, risiko `addJavascriptInterface`, pengaturan akses berkas, pemeriksaan origin sebelum memuat URL, dan rendering aman untuk HTML tak tepercaya
- **Praktik**: Mengaudit manifest dan penggunaan WebView aplikasi contoh, mengeksploitasi satu komponen terekspor dari aplikasi kedua, lalu memperbaikinya dan membuktikan eksploit tidak lagi berhasil

### Minggu 7: Rahasia, Signing Key, dan Integritas Supply Chain

- **Higiene rahasia**: menghilangkan kredensial dari source dan `BuildConfig`, injeksi lewat environment di CI, dan mengapa obfuscation bukan perlindungan rahasia
- **Kustodi signing key**: upload key versus app signing key, Play App Signing, penyimpanan kunci di hardware token atau secret store terkelola, serta rencana pemulihan bila kunci hilang
- **Pengerasan CI/CD**: token dengan cakupan sempit, protected branch, build rilis yang reproducible, penandatanganan artefak, dan jejak audit siapa mengirim apa
- **Kepercayaan pada dependensi**: verifikasi dependensi Gradle dengan checksum, dependency locking, penyaringan konten repositori, dan peninjauan dependensi transitif sebelum dikirim
- **Risiko SDK pihak ketiga**: apa yang sebenarnya dikumpulkan SDK analitik dan iklan, perjanjian pemrosesan data, rencana penghapusan SDK, dan deteksi panggilan jaringan hantu
- **SBOM dan provenance**: menghasilkan software bill of materials untuk artefak Android, melacak pustaka native, dan merespons ketika dependensi transitif dikompromikan
- **Praktik**: Mengaktifkan verifikasi dan penguncian dependensi Gradle pada proyek nyata, menghapus pola kunci yang bocor dari riwayat, dan menghasilkan SBOM untuk APK rilis

### Minggu 8: Rekayasa Privasi dan Minimalisasi Data

- **Izin sebagai kontrak data**: alur izin runtime, izin media granular, lokasi perkiraan versus presisi, dan biaya meminta lebih banyak dari yang dibutuhkan
- **Identifier dan pelacakan**: kebijakan advertising ID, kemampuan reset, alternatif pengganti device fingerprint, dan event analitik yang diam-diam berubah menjadi data pribadi
- **Higiene logging dan telemetri**: logging terstruktur dengan redaksi, menonaktifkan log verbose di rilis, pembersihan crash report, dan mencegah PII masuk ke properti analitik
- **Paparan layar dan clipboard**: `FLAG_SECURE`, penekanan thumbnail di recents, risiko autofill serta keyboard, dan pembatasan akses clipboard di Android modern
- **Backup dan transfer**: `dataExtractionRules`, mengecualikan data sensitif dari backup cloud dan transfer antar perangkat, serta menguji jalur restore
- **Siklus hidup data**: penegakan retensi, penghapusan saat akun ditutup, kedaluwarsa cache lokal, dan cara membuktikan penghapusan kepada auditor
- **Praktik**: Mengklasifikasikan setiap event analitik pada aplikasi contoh, menghapus atau melakukan pseudonimisasi pada field personal, dan memverifikasi lewat tangkapan jaringan bahwa tidak ada data sensitif yang keluar dari perangkat

### Minggu 9: Pengujian Keamanan Berbasis Ancaman

- **Analisis statis di dalam build**: pemeriksaan keamanan Android Lint, aturan `semgrep` untuk Kotlin dan Gradle, ruleset keamanan detekt, dan menggagalkan build alih-alih hanya membuat tiket
- **Analisis biner dan manifest**: pemindaian MobSF, dekode `apktool`, `apkanalyzer`, dan membandingkan build rilis dengan build debug untuk menemukan konfigurasi yang bocor
- **Analisis dinamis**: instrumentasi Frida, skrip objection, intersepsi proxy dengan mitmproxy, dan mengapa bypass pinning pada perangkat root bukan berarti aplikasi rusak
- **Invarian keamanan sebagai pengujian**: uji instrumentasi yang memastikan cleartext diblokir, tidak ada komponen terekspor, dan rahasia tidak berada di `BuildConfig`
- **Perencanaan pengujian berbasis serangan**: menurunkan kasus uji dari model ancaman minggu 1, memprioritaskan berdasarkan kemudahan eksploitasi, dan menguji regresi temuan yang sudah diperbaiki
- **Kesiapan bug bounty**: definisi cakupan, laporan berkualitas reproduksi, SLA triase, dan mengubah temuan eksternal menjadi pengujian permanen
- **Praktik**: Menjalankan uji statis dan dinamis lengkap pada aplikasi contoh, menghasilkan register temuan dengan severity dan proof of concept, lalu mengubah tiga temuan teratas menjadi pengujian otomatis

### Minggu 10: SDLC Aman, Pemantauan, dan Respons Insiden

- **Keamanan dalam alur kerja pengembangan**: security champion, gerbang tinjauan desain untuk perubahan auth dan kripto, serta pembaruan model ancaman sebagai bagian dari pekerjaan fitur
- **Gerbang rilis**: persetujuan checklist MASVS, pemindaian dependensi dan rahasia di CI, irama penetration test, serta apa yang memblokir rilis dan apa yang dikirim dengan risiko tercatat
- **Pemantauan runtime**: telemetri kegagalan atestasi, pola autentikasi anomali, peringatan kegagalan pinning, dan sinyal rate limit yang menandakan penyalahgunaan otomatis
- **Respons kerentanan**: SLA patch berdasarkan severity, koordinasi dengan jadwal review Play Store, mekanisme forced update, dan komunikasi risiko kepada pengguna
- **Respons insiden**: playbook kebocoran signing key, SDK yang dikompromikan, dan basis data token yang dicuri, termasuk deteksi, penahanan, dan kewajiban pengungkapan
- **Budaya keamanan**: tinjauan pasca-insiden tanpa mencari kambing hitam, default aman di pustaka bersama, dan dokumentasi kepemilikan kunci yang selalu mutakhir
- **Praktik**: Menulis dokumen gerbang keamanan rilis dan playbook kebocoran untuk aplikasi proyek akhir, lalu menjalankan latihan tabletop pada skenario kompromi signing key

## Proyek Akhir

Peserta memilih aplikasi Android nyata — milik sendiri, proyek open source, atau aplikasi referensi yang disediakan — dan menjalankan keterlibatan rekayasa keamanan secara menyeluruh. Keluarannya adalah paket tinjauan keamanan yang memuat: model ancaman dengan aset, batas kepercayaan, dan ancaman terperingkat yang dipetakan ke kontrol MASVS; register temuan dengan severity, proof of concept, dan remediasi untuk setiap isu; perbaikan yang benar-benar diimplementasikan untuk temuan berisiko tertinggi di ranah penyimpanan, transport, autentikasi, IPC, dan integritas; bukti bahwa setiap perbaikan bertahan (tangkapan jaringan, pengujian, atau eksploit yang kini gagal dengan cara berbeda); serta checklist pengembangan perangkat lunak aman yang diadopsi tim, mencakup verifikasi dependensi, pemindaian rahasia, gerbang rilis, dan playbook insiden.

Keterlibatan ini harus digerakkan oleh ancaman, bukan oleh perkakas: setiap temuan dapat dilacak ke ancaman yang dimodelkan, dan setiap remediasi menjelaskan ancaman mana yang dikurangi serta risiko residual apa yang tersisa. Peserta mempresentasikan tinjauan seperti kepada engineering lead, mempertahankan penetapan severity, membandingkan biaya setiap perbaikan dengan risiko yang dihilangkan, dan mengidentifikasi setidaknya satu risiko yang secara sadar diterima beserta alasannya yang terdokumentasi.

## Kriteria Penilaian

- **Tugas**: Lab mingguan dinilai berdasarkan apakah ancaman didemonstrasikan secara konkret, apakah remediasi benar-benar menangani akar masalah dan bukan gejalanya, serta apakah bukti membuktikan perbaikan (tangkapan, pengujian yang lulus, atau eksploit yang gagal). Kuis mencakup semantik kebijakan kunci Keystore, trade-off pinning dan rotasi, kebenaran alur PKCE, verifikasi atestasi, dan aturan ekspor manifest.
- **Proyek Akhir**: Dievaluasi berdasarkan ketelitian model ancaman, akurasi penetapan severity, kelengkapan remediasi pada setidaknya empat kategori MASVS, kualitas paket bukti, serta realisme gerbang rilis dan playbook insiden. Temuan tanpa bukti yang dapat direproduksi, atau perbaikan yang hanya bekerja pada perangkat uji yang di-root, akan dikurangi nilainya.
- **Pertimbangan profesional**: Nilai lebih diberikan untuk kemampuan mengidentifikasi apa yang tidak dapat dilindungi platform, menolak kepercayaan sisi klien ketika verifikasi server diperlukan, dan mendokumentasikan risiko yang diterima secara eksplisit alih-alih menyembunyikannya.

## Referensi

- [OWASP Mobile Application Security Verification Standard](https://mas.owasp.org/MASVS/)
- [OWASP Mobile Application Security Testing Guide](https://mas.owasp.org/MASTG/)
- [Praktik terbaik keamanan Android](https://developer.android.com/privacy-and-security/security-best-practices)
- [Android Keystore system](https://developer.android.com/privacy-and-security/keystore)
- [Network Security Configuration](https://developer.android.com/privacy-and-security/security-config)
- [Panduan autentikasi biometrik](https://developer.android.com/identity/sign-in/biometric-auth)
- [Play Integrity API](https://developer.android.com/google/play/integrity)
- [Verifikasi App Links](https://developer.android.com/training/app-links/verify-android-applinks)
- [Shrinking dan obfuscation dengan R8](https://developer.android.com/build/shrink-code)
- [Verifikasi dependensi Gradle](https://docs.gradle.org/current/userguide/dependency_verification.html)
- [Praktik terbaik privasi Android](https://developer.android.com/privacy-and-security/privacy-best-practices)
- [Perkakas OWASP Mobile Security Testing Guide](https://mas.owasp.org/MASTG/Tools/)

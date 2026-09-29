---
title: "Silabus Machine Learning On-Device React Native"
description: "Kurikulum lanjutan 12 minggu untuk pengembang React Native yang ingin membangun fitur AI mobile yang menjaga privasi dengan inferensi on-device — mencakup TensorFlow Lite, MediaPipe, Core ML, delegasi NNAPI dan GPU/NPU, konversi dan kuantisasi model, computer vision, NLP on-device, AI generatif edge dengan LLM dan RAG, rekayasa performa inferensi, serta pipeline pembaruan model."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Machine Learning On-Device React Native

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk pengembang React Native yang sudah merilis aplikasi produksi dan ingin menambahkan fitur machine learning yang berjalan sepenuhnya di perangkat pengguna. Sementara kurikulum React Native standar berfokus pada komponen, navigasi, manajemen state, dan API perangkat, kursus ini membangun keterampilan rekayasa ML on-device secara menyeluruh: memilih antara TensorFlow Lite, MediaPipe, Core ML, dan ONNX Runtime; mengonversi dan melakukan kuantisasi model agar muat dalam anggaran memori perangkat seluler; menjalankan inferensi dari thread JavaScript tanpa membuat UI tersendat; menghubungkan delegasi native (GPU, NNAPI, Core ML, NPU) demi kecepatan; membangun fitur computer vision seperti klasifikasi gambar, deteksi objek, dan segmentasi; NLP on-device dengan embedding dan penerjemahan; AI generatif edge dengan LLM terkuantisasi dan retrieval-augmented generation lokal; serta mengirim model dengan aman melalui aset bawaan, pembaruan OTA, dan pipeline data yang menjaga privasi.

Setiap modul memadukan fondasi konseptual dengan lab langsung yang mengharuskan menjalankan inferensi di simulator dan perangkat sungguhan, memprofil penggunaan CPU/GPU/NPU, mengukur dampak cold-start dan anggaran frame, serta mengevaluasi kualitas model sebelum dirilis. Kursus diakhiri dengan proyek akhir di mana peserta merancang dan membangun aplikasi React Native yang mengutamakan privasi dengan setidaknya dua fitur ML on-device — satu berbasis computer vision dan satu berbasis bahasa — dengan model terkuantisasi, anggaran inferensi yang terukur, strategi fallback yang elegan, dan pipeline pembaruan model yang berversi.

Setelah menyelesaikan kursus ini, peserta akan mampu memilih runtime inferensi dan delegasi yang tepat untuk suatu tugas, mengonversi dan melakukan kuantisasi model dari PyTorch/JAX/Keras untuk deployment seluler, menjembatani inferensi native ke React Native tanpa memblokir thread UI, memprofil dan mengoptimalkan latensi, memori, dan konsumsi daya inferensi, menerapkan fitur vision dan NLP on-device yang andal, mengintegrasikan LLM terkuantisasi dengan RAG lokal, serta mengirim pembaruan model dengan aman di setiap rilis aplikasi.

## Kurikulum

### Modul 1: Fondasi ML On-Device (Minggu 1)

- **Mengapa inferensi on-device**
  - Privasi dan minimalisasi data: data sensitif tidak pernah meninggalkan perangkat
  - Latensi dan ketersediaan offline: tanpa ketergantungan jaringan untuk inferensi
  - Biaya: nol biaya server per inferensi dan tanpa batas rate API
  - Trade-off dibanding API cloud: ukuran model, gesekan pembaruan, fragmentasi perangkat
- **Lanskap ML seluler**
  - TensorFlow Lite, MediaPipe Tasks, Core ML, ONNX Runtime, ML Kit
  - Tempat masing-masing runtime: konversi lintas-framework, jalur akselerasi OS, API tugas siap pakai
  - Apple Silicon (ANE) versus delegasi GPU/NPU/DSP Android
- **Siklus hidup model di perangkat seluler**
  - Pelatihan terjadi di cloud; inferensi terjadi di edge
  - Pipeline umum: latih → konversi → kuantisasi → validasi → bundel → kirim → perbarui
- **Lab Langsung**: Pasang binding TensorFlow Lite di aplikasi React Native, bundel pengklasifikasi gambar kecil, dan jalankan inferensi pertama di iOS Simulator dan Android Emulator

### Modul 2: TensorFlow Lite di React Native (Minggu 2)

- **Ekosistem tflite-react-native**
  - Pilihan paket: `tflite-react-native`, `react-native-fast-tflite`, dan pembungkus modul native
  - Format model FlatBuffers dan mengapa file `.tflite` bukan sekadar bobot mentah
  - Membundel model dengan Metro: ekstensi aset, konfigurasi resolver di `metro.config.js`
- **Dasar-dasar interpreter**
  - Memuat model dari aset bawaan versus sistem file
  - Bentuk tensor input/output, dtype, dan kontrak normalisasi
  - Menjalankan inferensi: mode interpreter sinkron versus asinkron
- **Masalah threading**
  - Mengapa inferensi di thread JavaScript membekukan UI
  - Memindahkan pekerjaan ke thread native worker dengan `InteractionManager` dan dispatch native
- **Lab Langsung**: Bangun hook `useTFLite` yang dapat dipakai ulang untuk memuat model, melakukan warm-up, dan menjalankan inferensi di luar thread JS

### Modul 3: MediaPipe Tasks dan API Vision Siap Pakai (Minggu 3)

- **Ikhtisar MediaPipe Tasks**
  - API berbasis tugas: klasifikasi gambar, deteksi objek, landmark wajah, pose, tangan, segmentasi gambar
  - Kapan API tugas mengungguli interpreter mentah: preprocessing, postprocessing, dan helper visualisasi bawaan
- **Mengintegrasikan MediaPipe dengan React Native**
  - `@mediapipe/tasks-vision` dengan WebAssembly versus binding MediaPipe native
  - Pipeline kamera: memberi umpan gambar dari `CameraRoll` atau frame langsung dari `react-native-vision-camera`
  - Tipe hasil: klasifikasi, deteksi, landmark, dan koordinat ternormalisasi
- **Kendala real-time**
  - Melewatkan frame dan memproses setiap frame ke-N
  - Mengecilkan frame input ke ukuran input model
  - Rendering overlay dengan Skia atau komponen SVG
- **Lab Langsung**: Bangun aplikasi overlay landmark pose yang melacak orang dalam umpan kamera langsung dan menggambar kerangka secara real-time

### Modul 4: Integrasi Core ML di iOS (Minggu 4)

- **Pipeline Core ML**
  - Mengapa Core ML penting: akselerasi Apple Neural Engine di iPhone modern
  - Format `.mlmodel` dan `.mlpackage`, provenans model melalui Xcode
  - Mengonversi model `.tflite`/ONNX ke Core ML dengan `coremltools`
- **Core ML dari React Native**
  - Menulis modul native Swift yang membungkus `MLModel` dan `MLModelPrediction`
  - Mengirim input `MLMultiArray` dan mendekode output
  - Kontrol: `MLPredictionOptions` (kebijakan CPU/GPU/ANE), dispatch completion handler ke JS
- **ANE versus CPU/GPU**
  - Kebijakan `computeUnits` dan kapan membatasi eksekusi
  - Trade-off daya versus latensi pada inferensi berkelanjutan
- **Lab Langsung**: Tulis pembungkus Swift untuk pengklasifikasi gambar Core ML, panggil dari JS, dan konfirmasi akselerasi ANE dengan Instruments

### Modul 5: Akselerasi Android dengan NNAPI dan Delegasi GPU (Minggu 5)

- **Backend inferensi Android**
  - NNAPI (Neural Networks API) dan HAL vendor: GPU, DSP, NPU
  - Delegasi GPU TFLite dan backend CPU XNNPACK
  - Memilih delegasi saat runtime berdasarkan kemampuan perangkat
- **Eksekusi heterogen**
  - Delegasi parsial: op yang tidak dapat dijalankan delegasi GPU jatuh ke CPU
  - Benchmark delegasi: `tflite_benchmark_model` dan pengukuran waktu dalam aplikasi
- **Spesifik React Native Android**
  - Modul native Kotlin yang membungkus `Interpreter` dengan `Delegate.NNAPI`/`Delegate.GPU`
  - Menghindari ANR: executor latar belakang, handoff `BlockingQueue`, dan resolusi promise JS
- **Lab Langsung**: Profil model yang sama dengan delegasi CPU, GPU, dan NNAPI di dua perangkat Android dan dokumentasikan trade-off latensi/akurasi/daya

### Modul 6: Konversi dan Optimasi Model (Minggu 6)

- **Dasar-dasar konversi**
  - TensorFlow SavedModel/Keras → TFLite dengan converter
  - PyTorch → ONNX → TFLite/Core ML: jembatan lintas-framework
  - Pipeline JAX/Hugging Face dan `optimum` untuk ekspor
- **Kuantisasi mendalam**
  - Kuantisasi pasca-pelatihan: dynamic range, float16, dan int8
  - Kuantisasi integer penuh dengan dataset representatif dan kalibrasi
  - Pelatihan sadar-kuantisasi dan mengapa ia mempertahankan akurasi di hardware edge
- **Bedah model**
  - Pruning dan distilasi untuk model berukuran seluler
  - Model sparse dan block-sparsity di NNAPI
  - Mengukur segitiga ukuran/akurasi/latensi
- **Lab Langsung**: Ambil model PyTorch 200MB, konversi melalui empat tahap optimasi, dan catat ukuran, delta akurasi, dan latensi inferensi di setiap tahap

### Modul 7: Aplikasi Computer Vision (Minggu 7)

- **Klasifikasi gambar dan pengenalan butir halus**
  - Keluarga EfficientNet/MobileNet dan preprocessing input (normalisasi mean/std)
  - Dekode top-k dan ambang keyakinan
- **Deteksi objek**
  - SSD, EfficientDet-Lite, varian YOLO: anchor box, postprocessing NMS di JS
  - Menggambar bounding box dengan pemetaan koordinat yang benar (ruang model versus ruang view)
- **Segmentasi gambar**
  - Model DeepLab/selfie: mask kelas per piksel
  - Postprocessing mask: alpha compositing, penggantian latar belakang
- **Pola integrasi kamera**
  - Frame processor `react-native-vision-camera`, hook barcode/QR, dan overlay AR
- **Lab Langsung**: Bangun detektor objek yang menyoroti objek terdeteksi dalam umpan kamera langsung dengan overlay Skia dan ambang keyakinan yang dapat disesuaikan

### Modul 8: NLP On-Device (Minggu 8)

- **Model teks di perangkat seluler**
  - MobileBERT, DistilBERT, dan transformer kecil untuk klasifikasi dan tanya-jawab
  - Tokenisasi on-device: port tokenizer WordPiece/SentencePiece di JS dan native
  - Batas panjang sekuens dan strategi pemotongan
- **Embedding dan pencarian semantik**
  - Sentence encoder untuk embedding lokal (misalnya universal sentence encoder-lite)
  - Penyimpanan embedding dengan SQLite/MMKV dan pencarian kemiripan kosinus
  - Pencarian semantik lokal atas catatan, email, atau riwayat obrolan
- **Speech dan penerjemahan**
  - Mesin speech-to-text on-device dan varian whisper-tiny
  - Model penerjemahan mesin dan deteksi bahasa di edge
- **Lab Langsung**: Bangun fitur pencarian semantik lokal yang membuat embedding catatan pengguna on-device dan mengembalikan hasil relevan tanpa panggilan jaringan

### Modul 9: AI Generatif Edge dan RAG Lokal (Minggu 9)

- **LLM on-device: apa yang realistis**
  - LLM kecil terkuantisasi (1B–8B pada 4-bit/8-bit) dan jejak memorinya
  - Runtime gaya llama.cpp/GGUF di React Native melalui modul native
  - Ekspektasi kecepatan pembangkitan token dan pola UX interaktif
- **Retrieval-augmented generation lokal**
  - Memecah basis pengetahuan menjadi chunk dan membuat embedding on-device
  - Retrieval: pencarian vektor atas embedding lokal, lalu penyusunan prompt
  - Batasan grounding: manajemen jendela konteks dan sitasi jawaban
- **Strategi hybrid edge/cloud**
  - Menjalankan model kecil secara lokal untuk permintaan yang sensitif privasi
  - Eskalasi ke API cloud untuk pembangkitan kompleks dengan persetujuan
- **Lab Langsung**: Jalankan LLM kecil terkuantisasi dengan pipeline RAG lokal yang menjawab pertanyaan dari basis pengetahuan bawaan, sepenuhnya offline

### Modul 10: Rekayasa Performa Inferensi (Minggu 10)

- **Anggaran latensi**
  - Mendefinisikan SLO inferensi: cold start, inferensi hangat, dampak frame p95
  - Strategi startup: pramuat model, inferensi warmup, inisialisasi delegasi malas
- **Rekayasa memori**
  - Pemetaan memori model (`mmap`) versus pemuatan ke heap
  - Penggunaan ulang buffer tensor dan menghindari alokasi per frame
  - Profil memori puncak dengan Xcode Instruments dan Android Studio Profiler
- **Daya dan termal**
  - Inferensi berkelanjutan versus semburan: perilaku throttle ANE/DSP
  - Pengukuran dampak baterai dan kualitas adaptif (turunkan fps, resolusi lebih rendah)
- **Overhead bridging**
  - Meminimalkan salinan JS↔native untuk tensor besar (memori bersama, penggunaan ulang objek)
  - Batching dan menggabungkan prediksi
- **Lab Langsung**: Profil aplikasi dari ujung ke ujung dan kurangi latensi inferensi p95 setidaknya 40 persen tanpa mengubah model

### Modul 11: Pengiriman Model, Pembaruan, dan Privasi (Minggu 11)

- **Strategi bundling dan unduhan**
  - Mengirim model kecil di dalam bundel aplikasi
  - Pembaruan model OTA: unduhan bertanda tangan, pertukaran atomik, dan pin versi
  - Uji A/B model dan rollout bertahap versi model baru
- **Validasi model sebelum rilis**
  - Set tes gambar emas dan gerbang akurasi per kelas
  - Deteksi drift antar versi model pada kelompok perangkat yang sama
- **Privasi dan keamanan**
  - Threat modeling: ekstraksi model, input adversarial, eksfiltrasi data
  - Konteks inferensi aman, artefak yang dilindungi keychain, dan pemeriksaan integritas
  - Regulasi privasi: manfaat pemrosesan lokal GDPR dan persyaratan keterbukaan
- **Lab Langsung**: Implementasikan alur pembaruan model OTA bertanda tangan dengan rollback dan evaluasi versi model baru terhadap set tes emas sebelum rollout

### Modul 12: Proyek Akhir (Minggu 12)

- **Ringkasan proyek**
  - Rancang dan bangun aplikasi react-native yang mengutamakan privasi dengan setidaknya dua fitur ML on-device: satu fitur computer vision dan satu fitur berbasis bahasa
  - Contoh arah: aplikasi kamera asisten yang membacakan pemandangan dengan suara, jurnal kesehatan lokal dengan pencarian semantik dan wawasan gaya hidup, atau pendamping penerjemahan offline dan pencarian visual
- **Persyaratan rekayasa**
  - Model dikonversi dan dikuantisasi agar berjalan dalam anggaran memori yang terdokumentasi
  - Inferensi sepenuhnya di luar thread JS dengan dampak frame p95 terukur di bawah 16 ms
  - Pipeline pembaruan model yang ditandatangani, berversi, dengan rollback
  - Degradasi yang elegan saat akselerasi hardware tidak tersedia
- **Hasil akhir**
  - Repositori sumber, laporan provenans dan optimasi model, hasil benchmark, serta demo singkat di iOS dan Android

## Proyek Akhir

Peserta membangun aplikasi React Native produksi yang mengutamakan privasi, menggabungkan fitur computer vision on-device dengan fitur bahasa on-device. Proyek ini mengintegrasikan setidaknya dua runtime atau delegasi inferensi, mengirim model terkuantisasi dengan rantai optimasi yang terdokumentasi (konversi → kuantisasi → validasi), menjaga semua inferensi di luar thread JavaScript dengan anggaran dampak frame 16 ms yang terukur, dan menyertakan pipeline pembaruan model OTA bertanda tangan dengan rollback. Hasil akhir harus menyertakan laporan provenans model (sumber pelatihan, langkah konversi, delta akurasi), benchmark performa yang membandingkan delegasi dan perangkat, serta demonstrasi langsung di perangkat keras iOS dan Android.

## Kriteria Penilaian

- **Tugas**: Lab langsung mingguan dinilai berdasarkan inferensi yang berfungsi di perangkat, pemilihan runtime/delegasi yang tepat, dan pengukuran performa yang terdokumentasi (latensi, memori, daya).
- **Portofolio Optimasi Model**: Latihan konversi dan kuantisasi di tengah kursus dinilai berdasarkan laporan trade-off ukuran/akurasi/latensi dan reproduktibilitas rantai optimasi.
- **Proyek Akhir**: Dievaluasi berdasarkan kualitas dan keandalan dua fitur ML, anggaran inferensi terukur (dampak frame p95 di bawah 16 ms, cold start di bawah target terdokumentasi), ketangguhan alur pembaruan dan rollback OTA, pengamanan privasi, serta kejelasan dokumentasi rekayasa.
- **Kualitas Kode**: Kode modul native harus aman terhadap thread, sadar alokasi, dan bebas kebocoran; integrasi JS harus terdegradasi dengan elegan ketika delegasi atau model tidak tersedia.

## Referensi

- Dokumentasi TensorFlow Lite (developer.android.com)
- Panduan MediaPipe Tasks (ai.google.dev/edge/mediapipe)
- Dokumentasi Core ML dan coremltools (developer.apple.com)
- Dokumentasi seluler ONNX Runtime (onnxruntime.ai)
- Dokumentasi paket react-native-fast-tflite dan tflite-react-native
- Proyek llama.cpp dan dokumentasi format GGUF
- Halaman referensi "Machine Learning at Apple" dan NNAPI Android
- Materi kursus "AI at the Edge" dari O'Reilly dan materi praktis ML on-device

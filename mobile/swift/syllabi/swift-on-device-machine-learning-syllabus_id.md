---
title: "Silabus Machine Learning On-Device dengan Swift"
description: "Kurikulum lanjutan 12 minggu untuk membangun aplikasi iOS produksi dengan Core ML, Create ML, framework Vision, dan optimasi Apple Neural Engine."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Machine Learning On-Device dengan Swift

## Ringkasan

Silabus 12 minggu ini melatih developer untuk merilis aplikasi iOS produksi yang didukung oleh machine learning on-device. Kursus ini mencakup seluruh siklus hidup model — pengumpulan dan pelabelan data, pelatihan dengan Create ML, konversi dan optimasi dengan coremltools, integrasi melalui runtime Core ML serta framework Vision/Natural Language, rekayasa performa terhadap CPU/GPU/Neural Engine, personalisasi yang menjaga privasi, dan praktik rilis pembaruan model yang aman.

Kursus ini dirancang end-to-end: setiap modul memasangkan konsep dengan pekerjaan model langsung, dan proyek akhir mensyaratkan pengiriman aplikasi nyata yang siap masuk App Store dengan model ML yang berjalan sepenuhnya di perangkat. Di akhir kursus, peserta memahami bukan hanya cara memanggil model, tetapi cara memilih format model, mengukur kualitas inferensi, mengoptimalkan latensi di Neural Engine, dan memperbarui model di lapangan tanpa merusak privasi atau pengalaman pengguna.

Prasyarat: pengalaman Swift dan SwiftUI yang solid (setara dengan silabus iOS Development dan Advanced SwiftUI), familiar dengan perangkat Xcode, dan pemahaman dasar tentang apa itu model machine learning. Pengalaman melatih model tidak diperlukan — pelatihan dilakukan melalui alat tingkat-tinggi dari Apple, dengan matematika ML dijaga pada level konseptual.

## Kurikulum

### Modul 1: Lanskap ML On-Device dan Fondasi Core ML (Minggu 1)
- **Alasan memilih ML on-device**
  - Privasi (tidak ada data yang meninggalkan perangkat), latensi, ketersediaan offline, biaya per inferensi
  - Trade-off dibanding ML sisi server: ukuran model, kecepatan pembaruan, anggaran komputasi
- **Format model Core ML dan kontainer model**
  - `.mlmodel` (Xcode 14 dan sebelumnya) vs model terkompilasi `.mlmodelc`
  - MLModel, MLModelConfiguration, MLModelDescription, nama dan tipe fitur
- **Memuat dan menjalankan model pertama**
  - Inferensi sinkron vs prediksi asinkron dengan `MLModel.prediction(from:)` dan `MLModel.predictions(from:)`
  - MLFeatureValue, penanganan input multi-array dan gambar
- **Di mana model berjalan**
  - computeUnits (.all, .cpuOnly, .cpuAndGPU, .cpuAndNeuralEngine)
  - Antipattern sesi per-view SwiftUI dan cache model

### Modul 2: Persiapan Data dan Pelatihan dengan Create ML (Minggu 2)
- **Pipeline pengumpulan dan pelabelan data**
  - Menyusun dataset klasifikasi/regresi, pembagian train/test/validation
  - Alat pelabelan: UI Create ML vs framework Create ML (MLImageClassifier, MLSoundClassifier, MLWordTagger, MLRegressor, MLRecommender, MLActivityClassifier)
- **Melatih classifier pertama**
  - `MLImageClassifier(trainingData:validationData:)`, metrik evaluasi, membaca confusion matrix
  - Sinyal overfitting: kesenjangan akurasi antara training dan validation
- **Hygiene data**
  - Keseimbangan kelas, dasar augmentasi, noise label, disiplin set uji tersimpan
  - Aturan praktis ukuran dataset per tipe model

### Modul 3: Konversi dan Optimasi Model dengan coremltools (Minggu 3)
- **Dasar konversi**
  - Mengonversi checkpoint PyTorch/TensorFlow: jalur torchscript/onnx, `.convert()` dan unified conversion API
  - Output model: distribusi probabilitas, vektor fitur, embedding
- **Teknik pengurangan ukuran**
  - Kuantisasi bobot (int8, int16) dan pengukuran dampak akurasi
  - Pruning dan paletisasi (ML Program), batasan versi deployment minimum
- **Format ML Program**
  - Dukungan bentuk fleksibel, `flexibleShapeRange`, dukungan tensor berkelompok
  - Pratinjau model terkonversi di Xcode dan validasi dengan `coremltools.models.MLModel`

### Modul 4: Integrasi Model ke dalam Aplikasi SwiftUI (Minggu 4)
- **Arsitektur untuk fitur bertenaga ML**
  - Lapisan layanan model, dependency injection, pola inferensi asinkron
  - Memuat beberapa model; registri model dan strategi lazy-loading
- **Integrasi SwiftUI**
  - Penanganan status/progress selama inferensi, task yang dapat dibatalkan dengan Task groups
  - Menampilkan prediksi, confidence, dan penjelasan (feature importance XGBoost, atribusi ala SHAP jika didukung)
- **Penanganan error dan fallback**
  - Model tidak didukung di perangkat (pemeriksaan ketersediaan), UX mode terdegradasi
  - Feature flags untuk menonaktifkan fitur ML secara halus

### Modul 5: Computer Vision dengan Framework Vision (Minggu 5)
- **Integrasi framework Vision**
  - VNCoreMLRequest, VNImageRequestHandler, tipe observasi (VNClassificationObservation, VNDetectedObjectObservation)
  - Penanganan orientasi dan cropping untuk inferensi akurat
- **Tugas vision di dunia nyata**
  - Object detection dengan model bawaan (VNDetectRectangles, VNDetectHumanRectangles, VNDetectFaceRectangles)
  - Pengenalan teks (VNRecognizeTextRequest) dan pemindaian barcode/QR
  - Klasifikasi gambar dan saliency (VNSaliencyImageObservation)
- **Pola performa**
  - Menggunakan ulang request handler, analisis streaming dari kamera, throttling frame

### Modul 6: Bahasa Alami dan Audio dengan Framework Natural Language dan SoundAnalysis (Minggu 6)
- **Framework Natural Language**
  - NLLanguageRecognizer, NLTokenizer, NLTagger, NLModel untuk NLP khusus
  - Analisis sentimen, embedding (NLEmbedding), dan pencarian semantik di perangkat
- **ML audio dan sensor**
  - SNAudioFileAnalyzer dan SNClassifySoundRequest untuk klasifikasi suara
  - Pengenalan ucapan on-device (SFSpeechRecognizer) dan penggabungan audio ML dengan model Core ML
  - Pipeline sensor: ekstraksi fitur accelerometer/gyroscope untuk pengenalan aktivitas
- **Pertimbangan privasi untuk fitur pengumpul data**
  - Izin mikrofon/kamera, jaminan pemrosesan on-device, minimalisasi data

### Modul 7: Personalisasi On-Device dan Siklus Pembaruan (Minggu 7)
- **Strategi personalisasi**
  - Penyesuaian ambang batas per pengguna, fine-tuning per pengguna dengan dataset kecil on-device
  - `MLUpdateTask` dan pembaruan model on-device dengan data pelatihan
- **Manajemen pembaruan**
  - Mengunduh pembaruan model melalui jaringan, penggantian atomik, rollback saat kualitas menurun
  - Versioning model dan koordinasi dengan versi aplikasi
- **Evaluasi di produksi**
  - Metrik online: sampling kualitas inferensi, pencatatan prediksi dengan persetujuan pengguna
  - Mendeteksi drift distribusi input dan memicu pelatihan ulang

### Modul 8: Rekayasa Performa pada CPU, GPU, dan Neural Engine (Minggu 8)
- **Profil inferensi**
  - Template Core ML Instruments, rincian per lapisan, penyesuaian `MLModelConfiguration`
  - Anggaran latensi: UI yang digerakkan frame, inferensi batch, dan strategi cache
- **Routing unit komputasi**
  - Kapan ANE menang vs GPU vs CPU, tekanan memori, thermal throttling
  - Presisi campuran dan jalur inferensi hanya-integer
- **Dampak baterai dan termal**
  - Pengujian beban berkelanjutan, profil daya, mengurangi frekuensi inferensi dengan deteksi perubahan

### Modul 9: ML yang Menjaga Privasi dan Siap Produksi (Minggu 9)
- **Rekayasa privasi**
  - Konsep differential privacy, konsep federated learning (private federated learning milik Apple)
  - Minimalisasi data, jaminan hanya-on-device, label Privasi App untuk fitur ML
- **Keamanan**
  - Integritas model, menghindari pencurian model melalui trade-off obfuskasi, validasi input terhadap adversarial examples
- **Jaminan kualitas**
  - Suite pengujian golden-image, gerbang regresi akurasi otomatis di CI, snapshot output model

### Modul 10: ML Generatif di Perangkat dan Framework Baru (Minggu 10)
- **Transformer dan LLM on-device**
  - Dukungan Core ML untuk arsitektur transformer, small language models, penanganan tokenizer
  - Analisis anggaran memori untuk model besar, pemuatan mmap, dan generasi streaming
- **Stable Diffusion dan generasi media**
  - Pipeline Core ML Stable Diffusion, generasi di ruang laten, kontrol anggaran komputasi
- **Memilih model secara bertanggung jawab**
  - Risiko halusinasi, filter keselamatan, batas kemampuan model kecil on-device

### Modul 11: Deployment, A/B Testing, dan Operasional (Minggu 11)
- **Integrasi App Store**
  - Membundel model, pola unduh-setelah-instal, app thinning dan anggaran ukuran
  - Unduhan model latar belakang dengan BGTaskScheduler atau BackgroundAssets
- **Eksperimen**
  - A/B testing fitur ML, peluncuran bertahap, definisi metrik kunci untuk fitur ML
- **Pemantauan operasional**
  - Metrik jarak jauh (opt-in), pemantauan crash dan memori untuk inferensi, peringatan saat SLO kualitas dilanggar

### Modul 12: Proyek Akhir — Aplikasi ML On-Device Produksi (Minggu 12)
- **Membangun aplikasi lengkap** yang menggabungkan setidaknya dua tipe model (misalnya, klasifikasi gambar plus NLP atau klasifikasi suara)
- **Persyaratan**
  - Model terlatih atau terkonversi dengan akurasi terdokumentasi, dioptimasi untuk ukuran dan latensi
  - UX dengan degradasi halus pada perangkat yang tidak didukung, perilaku offline-first
  - Privasi: tidak ada data mentah pengguna yang meninggalkan perangkat; pipeline pembaruan dengan rollback
- **Luaran**: aplikasi, model card (akurasi, ukuran, latensi), laporan performa, dan rencana rilis

## Proyek Akhir

Peserta mengirimkan aplikasi iOS siap produksi yang fitur ML-nya berjalan sepenuhnya on-device. Aplikasi harus mengintegrasikan setidaknya dua tipe model (contoh: classifier gambar buatan Create ML plus alur pengenalan teks Vision; classifier suara dengan fallback NLP on-device), menyertakan langkah optimasi terdokumentasi (kuantisasi atau pruning dengan pengukuran ukuran dan akurasi sebelum/sesudah), dan menerapkan mekanisme pembaruan model over-the-air dengan rollback. Model card dan laporan performa singkat yang mencakup latensi inferensi, memori, dan dampak baterai pada setidaknya dua perangkat fisik harus menyertai pengiriman.

## Kriteria Penilaian

- **Tugas (40%)**: satu kuis singkat per modul plus lab praktik mingguan — melatih model, mengonversi checkpoint, memprofil jalur inferensi, membangun pipeline Vision. Lab dinilai berdasarkan kebenaran, kualitas dokumentasi, dan hasil terukur (akurasi, ukuran, latensi).
- **Proyek Akhir (50%)**: dievaluasi berdasarkan kedalaman teknis (pilihan model dan keputusan optimasi), kesiapan produksi (penanganan error, privasi, pipeline pembaruan), pengalaman pengguna (UX mode terdegradasi, perilaku offline), dan kualitas model card serta laporan performa.
- **Peer Review (10%)**: setiap peserta meninjau proyek satu rekan menggunakan rubrik penilaian, memeriksa dokumentasi model, klaim privasi, dan keterulangan pengukuran.

## Referensi

- Dokumentasi Apple Developer — Core ML: https://developer.apple.com/documentation/coreml
- Dokumentasi Apple Developer — Create ML: https://developer.apple.com/documentation/createml
- Dokumentasi Apple Developer — Vision: https://developer.apple.com/documentation/vision
- Dokumentasi Apple Developer — Natural Language: https://developer.apple.com/documentation/naturallanguage
- Dokumentasi Apple Developer — SoundAnalysis: https://developer.apple.com/documentation/soundanalysis
- Apple Machine Learning Research: https://machinelearning.apple.com
- Dokumentasi coremltools: https://coremltools.readme.io
- Video WWDC — sesi "Core ML", "Vision", "Natural Language", "Create ML", dan sesi Core ML tentang LLM on-device
- Kode sampel dan model garden "On-Device Machine Learning": https://developer.apple.com/machine-learning/models

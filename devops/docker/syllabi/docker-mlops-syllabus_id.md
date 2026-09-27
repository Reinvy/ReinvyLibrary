---
title: "Silabus MLOps dan Beban Kerja Data dengan Docker"
description: "Silabus kursus 12 minggu tingkat lanjut bagi insinyur ML dan data yang mencakup kontainer berakselerasi GPU, lingkungan pelatihan yang reproducible, serving model, pipeline MLOps, tumpukan data engineering dalam kontainer, basis data vektor, serta pengoperasian platform ML produksi dengan Docker."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus MLOps dan Beban Kerja Data dengan Docker

## Ringkasan

Silabus ini adalah kurikulum 12 minggu tingkat lanjut bagi insinyur ML, insinyur data, dan insinyur platform yang ingin menjalankan beban kerja machine learning dan data di atas Docker dengan tingkat ketelitian yang sama seperti kontainer aplikasi tradisional. Jika kursus Docker umum mengajarkan image, jaringan, dan Compose, dan silabus platform engineering menggali internal runtime, kursus ini mengkhususkan diri pada siklus hidup machine learning: kontainer berakselerasi GPU, lingkungan pelatihan yang reproducible, pelacakan eksperimen, serving model, pipeline MLOps, data engineering dalam kontainer, serta basis data vektor untuk beban kerja retrieval. Setiap minggu memadukan pendalaman konsep dengan lab langsung yang membangun dan menjalankan infrastruktur ML nyata, dan kursus ini berpuncak pada proyek akhir di mana peserta membangun platform ML kelas produksi sepenuhnya dengan Docker dan Compose.

## Kurikulum

### Minggu 1: Mengapa Kontainer untuk Machine Learning
- **Masalah Reproducibility**
  - Environment drift, dependency hell, dan mode kegagalan "di mesin saya berfungsi"
  - Bagaimana image membekukan seluruh toolchain: OS, CUDA, driver, Python, dan bobot model
- **Komponen Platform ML**
  - Loop CI/CD, pelatihan, model registry, serving, dan monitoring
  - Posisi Docker vs. bare metal, VM, dan platform terorkestrasi
- **Lab**: Jalankan skrip pelatihan PyTorch sederhana dari image yang dipin dan bandingkan dengan lingkungan yang terinstal di host

### Minggu 2: Kontainer Berakselerasi GPU
- **NVIDIA Container Toolkit**
  - Bagaimana kontrak driver GPU bekerja: driver di host, toolkit di dalam kontainer
  - `nvidia-container-runtime` dan flag `--gpus`
- **Image Dasar CUDA**
  - Tag `nvidia/cuda`, varian cuDNN, dan image resmi PyTorch
  - Mencocokkan versi CUDA dengan kapabilitas driver
- **Lab**: Jalankan sampel CUDA dan pekerjaan pelatihan GPU, memverifikasi visibilitas perangkat dan isolasi VRAM

### Minggu 3: Membangun Image ML yang Efisien
- **Layer Caching untuk Dependensi Besar**
  - Mengurutkan layer `pip`/`conda` untuk reuse cache yang maksimal
  - Cache mount untuk pip dan package manager; `uv` untuk resolusi yang lebih cepat
- **Optimasi Ukuran**
  - Multi-stage build untuk image inferensi, distroless dan layer runtime minimal
  - Pembuatan SBOM dan pemindaian kerentanan untuk image ML
- **Lab**: Optimalkan image pelatihan dan image serving, mengukur waktu build dan ukuran akhir

### Minggu 4: Lingkungan Data Science Interaktif
- **Jupyter Docker Stacks**
  - Image Jupyter resmi dan varian tag-nya
  - Memperluas image dengan dependensi proyek
- **Development Containers**
  - VS Code Dev Containers dan Codespaces untuk data science
  - Workspace Docker Compose yang menggabungkan Jupyter, Postgres, dan Redis
- **Lab**: Siapkan workspace data science berbasis Compose dengan layanan Jupyter berkemampuan GPU

### Minggu 5: Pelatihan yang Reproducible
- **Kontainer Pelatihan Ephemeral**
  - Satu kontainer per run, versi ter-pin, dan penanganan seed
  - Checkpointing ke volume dan object storage cloud
- **Hyperparameter Tuning**
  - Menjalankan studi Optuna sebagai worker dalam kontainer
  - Trial paralel dengan penskalaan Compose
- **Pelatihan Terdistribusi**
  - DeepSpeed, Horovod, dan Ray dalam kontainer
  - Penjadwalan multi-GPU, komunikasi NCCL, dan jaringan kontainer untuk pekerjaan terdistribusi
- **Lab**: Jalankan pencarian hyperparameter di seluruh kontainer paralel dan pekerjaan pelatihan terdistribusi kecil

### Minggu 6: Pelacakan Eksperimen dan Model Registry
- **MLflow dalam Kontainer**
  - Topologi tracking server, artifact store, dan backend store
  - Mengontainerkan MLflow dengan MinIO sebagai backend artefak
- **Lineage dan Reproducibility**
  - Mencatat digest image, dataset, dan parameter dalam runs
  - Mempromosikan model melalui registry dengan lingkungan bertahap
- **Lab**: Dirikan tumpukan MLflow + MinIO dan daftarkan model dari kontainer pelatihan

### Minggu 7: Arsitektur Serving Model
- **Framework Serving**
  - Kontainer TorchServe, TensorFlow Serving, dan Triton Inference Server
  - ONNX Runtime dan serving model terkuantisasi
- **Mekanisme Serving**
  - Dynamic batching, warm model, dan alokasi sumber daya GPU/CPU
  - Health check, readiness probe, dan graceful shutdown untuk kontainer inferensi
- **Lab**: Deploy kontainer Triton Inference Server dan uji beban terhadap model torchscript

### Minggu 8: Pipeline MLOps dengan Docker
- **CI/CD untuk Machine Learning**
  - Membangun dan menguji image ML di GitHub Actions
  - Trigger pelatihan, gerbang validasi data, dan aturan promosi model
- **Versi Data dan Model**
  - DVC untuk dataset dan model, tahap pipeline yang dikontainerisasi
  - DAG Airflow untuk pelatihan ulang terjadwal
- **Lab**: Bangun pipeline CI yang melatih model, mendaftarkannya di MLflow, dan men-deploy image serving saat merge

### Minggu 9: Data Engineering dalam Kontainer
- **Platform Data di Docker**
  - Airflow, Spark, Kafka, dan dbt dalam kontainer
  - Pola ELT dan object storage dengan MinIO
- **Jaringan untuk Pipeline Data**
  - Jaringan Compose yang menghubungkan produsen, broker, dan warehouse
  - Batas sumber daya dan backpressure pada beban kerja streaming
- **Lab**: Dirikan tumpukan ELT yang mengingest, mentransformasi, dan memuat sebuah dataset

### Minggu 10: Basis Data Vektor dan Beban Kerja RAG
- **Infrastruktur Vector Search**
  - Kontainer Milvus, Qdrant, dan pgvector
  - Pipeline embedding dan pembangunan indeks berakselerasi GPU
- **Retrieval-Augmented Generation**
  - Mengontainerkan layanan embedding, penyimpanan vektor, dan backend generasi
  - Menjaga layanan retrieval tetap sehat dan observable
- **Lab**: Bangun pipeline RAG di mana dokumen di-embedding, diindeks di Qdrant, dan dikueri melalui kontainer serving

### Minggu 11: Keamanan, Kepatuhan, dan Biaya untuk Kontainer ML
- **Mengamankan Beban Kerja ML**
  - Penandatanganan image dengan cosign, pemindaian registry, dan kebersihan supply chain
  - Enkripsi model, penanganan secret, dan pengguna kontainer berprivilege minimal
- **Tata Kelola dan Kontrol Biaya**
  - Kuota GPU, pola spot-instance, dan pemantauan biaya untuk armada ML
  - Isolasi multi-tenant saat berbagi node GPU
- **Lab**: Tandatangani dan pindai image ML, terapkan runtime non-root, dan pasang metrik biaya/penggunaan

### Minggu 12: Proyek Akhir
- **Ruang Lingkup Proyek**: Rekayasa platform ML end-to-end dengan Docker dan Compose
  - Pipeline pelatihan GPU reproducible yang menghasilkan model terdaftar
  - Registry MLflow + MinIO dengan lingkungan bertahap
  - Layanan inferensi Triton atau TorchServe dengan health check dan metrik
  - Layanan basis data vektor untuk retrieval, beserta pipeline embedding
  - Otomasi CI/CD yang melatih ulang dan men-deploy ulang saat merge
- **Deliverables**: Blueprint platform, Dockerfile, tumpukan Compose, pipeline CI, konfigurasi serving, dan runbook operasional

## Proyek Akhir

Peserta akan merancang dan mengoperasikan platform ML kelas produksi yang dibangun sepenuhnya di atas Docker dan Compose. Proyek harus mencakup:

- Pipeline pelatihan reproducible yang berjalan sebagai kontainer ephemeral, memberi versi data dengan DVC, dan mendaftarkan model dengan MLflow yang didukung MinIO
- Lapisan serving model (Triton, TorchServe, atau TensorFlow Serving) dengan dynamic batching, health check, dan metrik
- Layanan basis data vektor (Qdrant atau Milvus) yang diberi makan oleh pipeline embedding dalam kontainer untuk beban kerja retrieval
- Otomasi CI/CD yang membangun image, menjalankan validasi, melatih ulang secara terjadwal, dan mempromosikan model melalui lingkungan bertahap
- Kebersihan keamanan: image yang ditandatangani dan dipindai, pengguna runtime non-root, dan akses GPU berprivilege minimal
- Runbook operasional yang mencakup observabilitas, rollback, dan kontrol biaya untuk armada GPU

Hasilnya dinilai berdasarkan seberapa dalam peserta memahami siklus hidup ML dalam kontainer — bukan sekadar merakit file Compose yang berfungsi.

## Kriteria Penilaian

- **Lab (40%)**: Lab langsung mingguan yang membangun dan menjalankan kontainer GPU, pekerjaan pelatihan, endpoint serving, dan pipeline data, dievaluasi berdasarkan kebenaran dan kesolidan operasional.
- **Midterm Deep-Dive (20%)**: Analisis tertulis dan demonstrasi subsistem pilihan (misalnya internal kontainerisasi GPU atau performa serving model) yang menjelaskan arsitekturnya dengan bukti dari run langsung.
- **Proyek Akhir (40%)**: Proyek platform ML end-to-end, dievaluasi berdasarkan reproducibility, keandalan serving, kebersihan keamanan, dokumentasi, dan kesolidan keputusan arsitektural.
- **Bonus (hingga 10%)**: Kontribusi infrastruktur yang dapat digunakan ulang (base image, template CI, atau dasbor pemantauan) yang melampaui proyek pribadi peserta.

## Referensi

- [Dokumentasi NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/index.html)
- [Image Kontainer NVIDIA CUDA](https://hub.docker.com/r/nvidia/cuda)
- [Jupyter Docker Stacks](https://jupyter-docker-stacks.readthedocs.io/)
- [Dokumentasi MLflow](https://mlflow.org/docs/latest/index.html)
- [Dokumentasi Triton Inference Server](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/index.html)
- [Dokumentasi TorchServe](https://pytorch.org/serve/)
- [Dokumentasi DVC](https://dvc.org/doc)
- [Dokumentasi Apache Airflow](https://airflow.apache.org/docs/)
- [Dokumentasi Qdrant](https://qdrant.tech/documentation/)
- [Dokumentasi Milvus](https://milvus.io/docs)
- [Dokumentasi Docker](https://docs.docker.com/)

---
title: "Silabus MLOps dengan GitHub Actions"
description: "Kurikulum lanjutan 12 minggu untuk insinyur ML dan praktisi DevOps yang mencakup seluruh siklus hidup machine learning yang diorkestrasi dengan GitHub Actions: CI untuk kode ML dan validasi data, versioning dataset dengan DVC dan pipeline artefak, pipeline training dengan GPU dan sweep matriks, integrasi pelacakan eksperimen dengan MLflow dan Weights & Biases, model registry dan promosi bertahap, evaluasi offline dan gerbang regresi, deployment model batch dan online dengan canary release, pemantauan drift dan retraining otomatis, pipeline fitur dan feature store, serta keamanan, tata kelola, dan kepatuhan untuk alur kerja ML."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus MLOps dengan GitHub Actions

## Ringkasan

Silabus lanjutan 12 minggu ini mengajarkan insinyur ML, data scientist, dan praktisi DevOps cara mengoperasikan seluruh siklus hidup machine learning di atas GitHub Actions. Kursus ini memperlakukan Actions sebagai lapisan orkestrasi dan kontrol untuk MLOps: satu platform berbasis peristiwa tempat pipeline data, pekerjaan training, pelacakan eksperimen, model registry, deployment, dan pemantauan semuanya berjalan sebagai alur kerja yang dapat diaudit dan direproduksi. Peserta melampaui kesenjangan klasik "dari notebook ke produksi" dan membangun lapisan otomasi yang membuat pengiriman model menjadi cepat, dapat diulang, dan aman.

Kurikulum ini mengasumsikan pengetahuan kerja tentang Python, git, dan penggunaan dasar GitHub Actions. Setiap minggu memadukan fondasi teknis dengan lab langsung di repositori sungguhan: memvalidasi data di CI, melakukan versioning dataset dengan DVC, menyapu hyperparameter di runner GPU self-hosted, mencatat run ke MLflow, mengunci merge dengan evaluasi offline, men-deploy model dengan strategi canary, dan menutup siklus dengan retraining otomatis yang dipicu oleh drift. Kursus ini berpuncak pada proyek akhir: platform MLOps lengkap, dari ingest data mentah hingga inferensi produksi yang dipantau, semuanya dibangun di atas GitHub Actions.

Pada akhir kursus, peserta akan mampu merancang pipeline training yang dapat direproduksi, menegakkan gerbang kualitas model di CI, mengintegrasikan pelacakan eksperimen dan model registry, men-deploy workload batch dan serving online secara aman, memantau model di produksi, dan mengotomasi retraining — semuanya diekspresikan sebagai alur kerja berversi yang dapat ditinjau, diaudit, dan dijalankan ulang oleh anggota tim mana pun.

## Kurikulum

### Minggu 1: Fondasi MLOps dan Lapisan Orkestrasi Actions

- **Apa itu MLOps dan mengapa diperlukan**
  - Siklus hidup model: data → training → evaluasi → deployment → pemantauan → retraining
  - Empat pilar: reproduktibilitas, CI/CD, tata kelola, dan observabilitas
  - Pola kegagalan umum: notebook yang menyimpang, retraining manual, degradasi yang tidak terpantau
- **GitHub Actions sebagai control plane MLOps**
  - Trigger berbasis peristiwa yang memetakan ke peristiwa siklus hidup: push, pull_request, schedule, workflow_dispatch
  - Job matriks untuk sweep paralel, artefak untuk transfer model, cache untuk dataset dan dependensi
  - Environment dengan protection rules sebagai gerbang promosi model
  - Reusable workflows sebagai pustaka pipeline emas untuk tim ML
- **Tata letak repositori untuk proyek ML**
  - Pola monorepo: `data/`, `features/`, `models/`, `training/`, `deploy/`, `.github/workflows/`
  - Memisahkan kode eksperimen dari kode pipeline produksi
  - CODEOWNERS untuk mewajibkan peninjauan perubahan alur kerja dan model
- **Lab Langsung**: Membuat monorepo ML dengan kerangka alur kerja untuk CI, training, dan deployment

### Minggu 2: CI untuk Kode Machine Learning

- **Analisis statis dan gerbang kualitas kode**
  - Linting dan format dengan ruff dan black; pemeriksaan tipe dengan mypy dan pyright
  - Menerapkan gaya pada Python, notebook, dan definisi fitur SQL
  - Pre-commit hooks yang dijalankan di CI untuk pemeriksaan lokal dan remote yang konsisten
- **Pengujian unit kode model**
  - Menguji transformasi data, pembangun fitur, dan preprocessing sebagai fungsi murni
  - Menguji pembungkus model dengan fixture sintetis dan output emas
  - Ambang cakupan (coverage) dan desain failure-first
- **Notebook CI**
  - Linting notebook dengan nbqa, eksekusi dengan papermill, dan strategi peninjauan diff
  - Mengonversi notebook menjadi skrip untuk jalur produksi
- **Validasi data di CI**
  - Pemeriksaan skema dengan pandera dan Great Expectations
  - Suite kendala: rentang, kardinalitas, tingkat nilai hilang, pemeriksaan distribusi
- **Manajemen dependensi dan caching**
  - Lockfile dengan uv, poetry, atau pip-tools; caching pohon dependensi antar-run
  - Pemindaian kerentanan paket Python di setiap push
- **Lab Langsung**: Membuat alur kerja CI yang menjalankan lint, pemeriksaan tipe, pengujian unit, dan suite Great Expectations, yang menggagalkan build jika ada pelanggaran

### Minggu 3: Versioning Data dan Pipeline Artefak

- **Strategi versioning dataset**
  - Pipeline DVC dengan pointer `.dvc`, caching berbasis hash, dan penyimpanan remote
  - lakeFS untuk melakukan branch pada dataset besar; Hugging Face datasets untuk korpora publik; Git LFS untuk aset kecil
  - Melacak provenance: versi dataset → SHA commit → run alur kerja
- **Artefak, cache, dan object storage**
  - Kapan artefak GitHub cocok (output kecil) vs kapan menggunakan S3, GCS, atau Azure Blob (dataset besar)
  - Job pemanasan cache untuk menjaga data training tetap panas antar-run
  - Kebijakan retensi dan pengendalian biaya penyimpanan
- **Pipeline data terjadwal**
  - Alur kerja ingest berbasis cron yang menarik data baru dan memperbarui snapshot berversi
  - Trigger kondisional: hanya retrain saat hash data berubah
- **Lineage dan reproduktibilitas**
  - Manifest yang mencatat hash input, versi kode, dan parameter untuk setiap run
  - Mereproduksi run historis apa pun dari manifestnya
- **Lab Langsung**: Menerapkan pipeline DVC di Actions yang mengunduh data mentah, memvalidasinya, dan mendorong snapshot berversi ke S3 dengan pemulihan cache

### Minggu 4: Pipeline Training di Runner CI

- **Runner GitHub-hosted vs self-hosted untuk training**
  - Batas runner hosted: hanya CPU, batas memori, batas waktu job 6 jam
  - Memilih runner self-hosted untuk workload GPU: label kustom, kapasitas khusus
  - Autoscaling armada runner dengan instance ephemeral dan spot pricing
- **Sweep hyperparameter dengan strategi matriks**
  - Mengodekan grid parameter sebagai dimensi matriks
  - Eksekusi job paralel, batas konkurensi, dan ukuran sweep yang sadar biaya
  - Mengumpulkan artefak per-run untuk perbandingan
- **Training terdistribusi**
  - Menjalankan job torchrun, Horovod, atau Ray Train dari Actions
  - Koordinasi multi-job: shard training sebagai job fan-out, agregasi sebagai fan-in
  - Menyinkronkan hasil melalui artefak atau shared object storage
- **Kontrol keandalan dan biaya**
  - Timeout, retry, dan notifikasi kegagalan
  - Concurrency groups dengan `cancel-in-progress` untuk menghentikan run training basi
  - Anggaran: membatasi ukuran sweep, menggunakan spot instance, menjadwalkan training di luar jam sibuk
- **Lab Langsung**: Menjalankan sweep hyperparameter berbasis matriks di runner GPU self-hosted dan menggabungkan hasilnya ke dalam artefak perbandingan

### Minggu 5: Integrasi Pelacakan Eksperimen

- **Platform pelacakan dan integrasi alur kerja**
  - MLflow Tracking, Weights & Biases, Neptune, dan Comet dari CI
  - Menyuntikkan konteks: run ID, SHA commit, branch, dan parameter sebagai tag
  - Kerangka auto-logging dan pencatatan metrik eksplisit
- **Dari run CI ke eksperimen yang dapat dibandingkan**
  - Konvensi penamaan dan tagging sehingga setiap run training CI menjadi eksperimen kelas satu
  - Membandingkan hasil sweep berdasarkan metrik; memilih juara berdasarkan ambang
  - Otomasi seleksi model: menulis run id terbaik ke artefak untuk langkah hilir
- **Melaporkan kembali ke loop pengembang**
  - Memposting tabel metrik dan bagan perbandingan sebagai komentar pull request
  - Notifikasi Slack atau email saat training selesai dan saat terjadi regresi
- **Lab Langsung**: Melacak sweep ke MLflow dan memposting tiga run teratas sebagai tabel terformat di komentar pull request

### Minggu 6: Model Registry dan Manajemen Versi

- **Arsitektur registry**
  - MLflow Model Registry: versi, stage, dan transisi
  - Registry OCI (GHCR, ECR, ACR) untuk image model siap serving
  - Format serialisasi: pickle, ONNX, dan format native framework
- **Provenance dan auditabilitas**
  - Menautkan setiap versi terdaftar ke SHA commit, run alur kerja, dan manifest datanya
  - Model cards: penggunaan yang dimaksudkan, data training, metrik, keterbatasan, dan catatan fairness
- **Alur kerja promosi**
  - Environment dengan reviewer yang disyaratkan sebagai gerbang persetujuan (staging → production)
  - Staging versi baru, menjalankan smoke test, dan mempromosikan saat hijau
  - Rollback otomatis ke versi juara sebelumnya
- **Lab Langsung**: Mendaftarkan run sweep terbaik ke registry dan mempromosikannya melalui environment staging dengan persetujuan reviewer

### Minggu 7: Evaluasi dan Pengujian Model

- **Evaluasi offline**
  - Evaluasi terhadap set tes emas dan data holdout
  - Pengujian regresi: membandingkan kandidat baru dengan juara saat ini
  - Suite metrik: akurasi, precision/recall, kalibrasi, proksi biaya latensi
- **Gerbang kualitas di CI**
  - Memblokir merge saat metrik evaluasi menurun melewati ambang
  - Memposting laporan evaluasi di pull request
  - Failure-first: mewajibkan tes dan evaluasi lulus sebelum promosi training
- **Pemeriksaan awal drift dan ketahanan**
  - Deteksi data drift pada data masuk sebelum retraining
  - Set tes adversarial, kasus tepi, dan out-of-distribution
  - Evaluasi bias dan fairness pada atribut yang dilindungi
  - Pemeriksaan keamanan model ML: probe evasion dan prompt-injection untuk LLM
- **Lab Langsung**: Membuat alur kerja evaluasi yang memblokir pull request saat metrik offline mengalami regresi dan memposting laporan yang dapat dibaca manusia

### Minggu 8: Deployment Model: Batch dan Online Serving

- **Pipeline inferensi batch**
  - Alur kerja scoring terjadwal atas partisi data baru
  - Job batch paralel dengan pola matriks atau fan-out; menulis output skor ke penyimpanan
- **Online serving**
  - Membangun image serving dengan FastAPI, Triton, TensorFlow Serving, atau TorchServe
  - Menerbitkan image ke GHCR dan men-deploy ke target cloud (SageMaker, Vertex AI, AKS, Lambda)
  - Men-deploy infrastruktur sebagai kode dari Actions: invokasi Terraform, Bicep, atau CDK
- **Strategi rilis yang aman**
  - Deployment blue/green dengan peralihan lalu lintas
  - Canary release dengan lalu lintas inkremental dan rollback otomatis saat lonjakan error rate
  - Environment protection rules untuk persetujuan deploy produksi
- **Lab Langsung**: Men-deploy image model FastAPI dengan strategi canary dan trigger rollback otomatis

### Minggu 9: Pemantauan Model dan Retraining Otomatis

- **Sinyal pemantauan**
  - Data drift, concept drift, dan prediction drift
  - Alat: Evidently, whylogs, dan metrik Prometheus dari endpoint serving
  - Dasbor dan perutean alert ke Slack atau PagerDuty
- **Alur kerja pemantauan terjadwal**
  - Job cron yang menghitung statistik drift dan membandingkannya dengan ambang
  - Alert saat ambang dilanggar dengan tautan yang dapat dijalankan ke alur kerja retraining
- **Lingkaran retraining otomatis**
  - Alert drift → alur kerja retraining → evaluasi offline → PR promosi
  - Persetujuan human-in-the-loop untuk model yang dipromosikan otomatis
  - Pipeline umpan balik yang mengumpulkan prediksi dan label produksi untuk set training berikutnya
- **Lab Langsung**: Menghubungkan alert drift ke alur kerja retraining otomatis yang menghasilkan PR model untuk persetujuan reviewer

### Minggu 10: Pipeline Fitur dan Feature Store

- **Rekayasa fitur sebagai pipeline**
  - Job batch terjadwal yang mengubah data mentah menjadi nilai fitur
  - Backfilling fitur historis dengan kebenaran point-in-time
- **Feature store**
  - Feast, Tecton, dan feature store cloud: tampilan offline/materialized dan online serving
  - Konsistensi online/offline dan pencegahan training-serving skew
- **Validasi dan versioning fitur**
  - Pemeriksaan CI pada definisi fitur baru: skema, tingkat null, dan pergeseran distribusi
  - Versioning fitur dan dataset training yang dibangun darinya
- **Lab Langsung**: Membangun pipeline fitur terjadwal yang memperbarui feature store Feast dan memvalidasi fitur baru di CI

### Minggu 11: Keamanan, Tata Kelola, dan Kepatuhan untuk Alur Kerja ML

- **Rahasia dan akses cloud**
  - Federasi OIDC untuk kredensial cloud berumur pendek, bukan kunci berumur panjang
  - Membatasi izin: kebijakan trust minimal untuk akses training, S3, dan registry
  - Secret scanning dan reviewer wajib untuk perubahan alur kerja
- **Privasi data dan kontrol akses**
  - Redaksi PII dalam pipeline, kontrol akses artefak, dan repositori dataset privat
  - Kebijakan retensi dan penghapusan data sebagai job otomatis
- **Tata kelola model**
  - Registry dan model cards sebagai jejak audit untuk setiap model yang dipromosikan
  - Rantai persetujuan untuk transisi staging dan produksi
  - Pelaporan kepatuhan dari log run alur kerja dan pengaturan retensi
- **Keamanan rantai pasok untuk dependensi ML**
  - Pembuatan SBOM, audit dependensi (pip-audit, trivy), dan attestation SLSA
  - Mengunci versi action ke commit SHA
- **Tata kelola biaya**
  - Alert anggaran pada pengeluaran Actions, kuota runner, dan batas ukuran sweep
- **Lab Langsung**: Mengganti kunci cloud statis dengan autentikasi OIDC untuk job training dan menambahkan pemeriksaan kebijakan yang memblokir deployment dengan izin berlebih

### Minggu 12: Capstone — Platform MLOps End-to-End dengan GitHub Actions

- **Cakupan capstone**: membangun platform MLOps lengkap di GitHub Actions untuk dataset nyata
  - Tata letak repositori dengan reusable workflows dan pustaka pipeline emas
  - Gerbang kualitas CI: lint, pemeriksaan tipe, tes, dan validasi data
  - Training yang dapat direproduksi dengan versioning data, pelacakan eksperimen, dan registry
  - Deployment bertahap dengan canary release dan persetujuan environment
  - Pemantauan dengan retraining otomatis yang dipicu drift dan persetujuan manusia
- **Hasil akhir**
  - Alur kerja yang berfungsi di repositori yang telah ditinjau
  - Dokumen arsitektur yang menjelaskan siklus hidup dan desain penanganan kegagalan
  - Demo langsung yang menunjukkan promosi model penuh dari push ke produksi dengan simulasi peristiwa drift
- **Presentasi dan peninjauan rekan**
  - Setiap peserta mempresentasikan platformnya dan mempertahankan keputusan desain
  - Umpan balik rekan tentang kualitas alur kerja, keamanan, dan kematangan operasional

## Proyek Akhir

Peserta merancang dan mengimplementasikan **platform MLOps end-to-end yang dibangun di atas GitHub Actions** untuk dataset nyata pilihan mereka (tabular, gambar, teks, atau deret waktu). Platform harus mengubah dataset mentah menjadi model terpantau di produksi sepenuhnya melalui alur kerja otomatis: gerbang CI yang memvalidasi kode dan data, dataset berversi yang dipulihkan dari penyimpanan remote, training yang dapat direproduksi dengan pelacakan eksperimen tingkat run, model registry berversi dengan provenance, promosi bertahap melalui environment persetujuan, deployment canary dari image serving, dan pemantauan drift yang terhubung ke pipeline retraining otomatis dengan persetujuan manusia. Proyek harus mencakup dokumen arsitektur tertulis dan demonstrasi langsung yang mencakup setidaknya satu siklus promosi penuh plus satu simulasi peristiwa drift yang memicu retraining.

## Kriteria Penilaian

- **Tugas**: Lab langsung mingguan (40%) dinilai berdasarkan kebenaran alur kerja, reproduktibilitas hasil, dan kepatuhan terhadap gerbang kualitas. Checkpoint desain minggu ke-6 (10%) mendokumentasikan arsitektur platform yang diusulkan sebelum capstone.
- **Proyek Akhir**: Dievaluasi berdasarkan kelengkapan siklus otomasi (30%), kualitas model dan ketelitian evaluasi (10%), praktik keamanan dan tata kelola (5%), serta kejelasan dokumen arsitektur dan demo (5%).
- **Ambang kelulusan**: Pipeline end-to-end yang berfungsi tanpa langkah manual, mengunci setiap promosi pada evaluasi yang lulus, dan terbukti melakukan retraining pada peristiwa drift yang disimulasikan.

## Referensi

- Dokumentasi resmi GitHub Actions — alur kerja, reusable workflows, environment, artefak, cache, dan OIDC
- Google Cloud Architecture Center — whitepaper "MLOps: Continuous delivery and automation pipelines in machine learning"
- Dokumentasi DVC — versioning data dan reproduktibilitas pipeline
- Dokumentasi MLflow — tracking, model registry, dan API proyek
- Dokumentasi Evidently AI — deteksi drift dan pemantauan model
- Dokumentasi Great Expectations dan pandera — validasi data
- Dokumentasi Feast — desain feature store dan konsistensi online/offline
- Kursus Made With ML dan MLOps untuk pola MLOps terapan dan studi kasus

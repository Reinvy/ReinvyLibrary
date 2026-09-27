---
title: "Silabus Rekayasa Platform AI Kubernetes"
description: "Kurikulum lanjutan 12 minggu yang komprehensif untuk platform engineer Kubernetes yang membangun infrastruktur AI produksi — penjadwalan GPU dan device plugin, manajemen kuota Kueue, Kubeflow dan Training Operator, Ray di Kubernetes, serving model dengan KServe dan mesin inferensi LLM, storage dan networking performa tinggi untuk training terdistribusi, CI/CD ML dan model registry, observabilitas GPU, optimasi biaya, serta proyek puncak platform AI multi-tenant."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Platform AI Kubernetes

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk operator Kubernetes, SRE, dan platform engineer yang sudah mengoperasikan cluster di produksi dan kini perlu menjalankan beban kerja AI dan machine learning dalam skala besar. Jika kurikulum Kubernetes umum mengajarkan cara menjalankan layanan web, kursus ini berfokus pada beban kerja yang melanggar aturan normal: job training terdistribusi yang membutuhkan GPU utuh dan interkoneksi berlatensi sangat rendah, layanan inferensi yang harus autoscale dari nol di jalur kritis, serta pipeline data yang memindahkan terabyte data antara object storage dan filesystem cepat.

Kurikulum disusun dalam tiga fase. Minggu 1–4 membangun fondasi cluster yang siap AI: perangkat keras GPU dan device plugin, penjadwalan khusus serta manajemen kuota berbasis Kueue, tipe beban kerja untuk training dan fine-tuning, dan autoscaling untuk beban kerja GPU yang bersifat bursty. Minggu 5–8 merakit tumpukan perangkat lunak AI: Kubeflow dan training operator-nya, runtime terdistribusi Ray, serving model dengan KServe dan mesin inferensi LLM, serta lapisan storage yang menjaga aliran dataset, checkpoint, dan bobot model. Minggu 9–12 mencakup disiplin platform engineering di sekitar beban kerja: networking performa tinggi untuk training terdistribusi, CI/CD ML dan manajemen siklus hidup model, observabilitas GPU dan optimasi biaya, serta proyek puncak di mana peserta merancang dan membangun platform AI multi-tenant untuk tim ML fiktif.

Setiap modul memadukan landasan konseptual yang dalam dengan lab praktis yang mengharuskan penerapan tooling nyata — memasang NVIDIA device plugin, mengonfigurasi kuota Kueue, menjalankan job training PyTorch terdistribusi, menyajikan model dengan KServe dan vLLM, serta merangkai dashboard GPU. Di akhir kursus, peserta akan mampu merancang platform AI siap produksi di Kubernetes, menjadwalkan dan memberi kuota beban kerja GPU dengan aman, menjalankan training terdistribusi dan serving inferensi dalam skala besar, serta mengoperasikan platform dengan visibilitas pemanfaatan GPU, keandalan, dan biaya yang bermakna.

## Kurikulum

### Modul 1: Karakteristik Beban Kerja AI dan Perangkat Keras GPU di Kubernetes (Minggu 1)

- **Mengapa Kubernetes untuk AI/ML**
  - Taksonomi beban kerja: training, fine-tuning, inferensi, pra-pemrosesan data, dan bagaimana masing-masing membebani cluster secara berbeda
  - Pergeseran dari microservices berorientasi CPU ke beban kerja batch dan serving yang terikat akselerator
  - Yang berubah secara operasional: job berjalan lama, toleransi interupsi spot, afinitas multi-GPU, artefak berukuran besar
- **Perangkat keras GPU dan akselerator**
  - GPU NVIDIA (A100/H100/L40S/kartu konsumen), AMD Instinct, dan TPU cloud: kapabilitas dan trade-off
  - Profil memori GPU, topologi NVLink/NVSwitch, dan pengaruhnya terhadap penjadwalan pod
  - Memilih bentuk node GPU: node pool GPU khusus vs. node campuran
- **Mengekspos akselerator ke pod**
  - Extended resources dan kerangka device plugin (`nvidia.com/gpu`, plugin AMD dan Intel)
  - Deployment NVIDIA Device Plugin, siklus hidup daemonset plugin, dan health check
  - Label node GPU, taint, dan toleration untuk segregasi beban kerja
- **Lab Praktis**: Pasang NVIDIA device plugin di node GPU, beri label dan taint pada node pool, lalu jadwalkan pod tes CUDA yang mengalokasikan sejumlah GPU tertentu

### Modul 2: Berbagi GPU, Partisi, dan Penjadwalan Mendalam (Minggu 2)

- **Menjadwalkan beban kerja GPU**
  - Cara kube-scheduler mengikat extended resources; penghitungan resource dan risiko overcommit
  - Node affinity, taint, dan toleration untuk node pool GPU; jebakan node selector di node campuran CPU/GPU
  - Topologi penjadwalan yang menghormati interkoneksi GPU-ke-GPU (domain NVLink) dan NUMA
- **Berbagi dan partisi GPU**
  - NVIDIA MIG: profil compute instance dan slice memori, MIG di A100/H100
  - Time-slicing, vGPU, dan MPS (Multi-Process Service) untuk oversubscription
  - Vendor berbagi GPU dan trade-off keadilan/biaya dari setiap pendekatan
- **Penempatan tingkat lanjut untuk training**
  - Masalah gang scheduling: pod dari sebuah job terdistribusi harus dimulai bersamaan atau tidak sama sekali
  - Volcano, Koordinator, dan mesin penjadwalan batch/gang lainnya
  - Preemption dan priority class untuk beban kerja AI
- **Lab Praktis**: Aktifkan MIG atau time-slicing di node GPU, alokasikan dua pod ke satu GPU fisik, dan tunjukkan dampak isolasi serta throughput dari setiap mode

### Modul 3: Kueue dan Manajemen Kuota untuk Beban Kerja AI (Minggu 3)

- **Masalah antrean di platform ML**
  - Mengapa fair-share penting: notebook interaktif vs. training batch vs. inferensi yang sensitif terhadap latensi
  - Integrasi rantai admission: Kueue sebagai admission webhook untuk antrean beban kerja
- **Internal Kueue**
  - Objek Workload, ClusterQueue, dan LocalQueue; model admission dan peminjaman kuota
  - ResourceFlavor untuk resource heterogen (model GPU, spot vs. on-demand)
  - Peminjaman kuota, berbagi cohort, dan preemption berbasis prioritas
- **Mengintegrasikan Kueue dengan training operator**
  - Integrasi bawaan Kueue: Job, PyTorchJob, RayJob, dan pod biasa
  - MultiKueue untuk distribusi beban kerja lintas cluster
  - Mengamati status antrean: kubectl kueue, events, dan metrik dashboard
- **Lab Praktis**: Definisikan ClusterQueue dan LocalQueue untuk cluster dua tim, kirim job training melalui Kueue, dan amati perilaku admission, peminjaman, dan preemption

### Modul 4: Beban Kerja Training dan Kubeflow Training Operator (Minggu 4)

- **Primitif training bawaan Kubernetes**
  - Job, CronJob, dan batch API asli; kebijakan restart dan backoff untuk training
  - Pod template untuk training: shared memory, hugepages, init container untuk staging dataset
  - Checkpoint dari perspektif penjadwalan: mengapa GPU yang dapat di-preempt membutuhkan checkpoint yang sering
- **Kubeflow Training Operator**
  - CRD PyTorchJob, TFJob, MPIJob, dan XGBoostJob
  - Topologi master/worker yang diekspor per framework; penanganan rendezvous dan world-size
  - Penanganan kegagalan: restart, batas backoff, dan kebijakan penjadwalan pod (gang scheduling)
- **Fine-tuning dan beban kerja kustom**
  - Kapan menggunakan Job biasa vs. Training Operator vs. Ray
  - Beban kerja interaktif: server notebook Jupyter dan VS Code di namespace khusus
  - Observabilitas job: metrik training, log, dan eksposur tensorboard
- **Lab Praktis**: Jalankan PyTorchJob terdistribusi dengan dua replika worker, naikkan skala, suntikkan kegagalan pod, dan verifikasi perilaku restart operator serta pemulihan checkpoint

### Modul 5: Ray di Kubernetes (Minggu 5)

- **Arsitektur Ray**
  - Ray head, worker, dan penjadwal terdistribusi; task, actor, dan object store
  - Mengapa tim memilih Ray untuk training, tuning hyperparameter, dan serving dalam satu runtime
- **Operator KubeRay**
  - CRD RayCluster: template head group dan worker group, konfigurasi autoscaling
  - RayJob: pengiriman job, pelacakan status, dan pembersihan cluster
  - Deployment Ray Serve di Kubernetes: deployment graphs dan ingress HTTP
- **Integrasi Ray dan Kueue**
  - Menangguhkan dan melanjutkan RayJob dengan kuota Kueue
  - Semantik placement group dan gang scheduling di dalam Ray di Kubernetes
  - Kebijakan penskalaan: Ray autoscaler vs. node autoscaler Kubernetes vs. Karpenter
- **Lab Praktis**: Deploy operator KubeRay, jalankan RayCluster dengan worker group autoscaling, kirim job tuning hyperparameter terdistribusi, dan amati scale-up serta scale-down cluster

### Modul 6: Serving Model dengan KServe dan Mesin Inferensi LLM (Minggu 6)

- **Pola arsitektur serving**
  - Inferensi online vs. batch; protokol inferensi v1 predict dan v2 (KServe gRPC/HTTP)
  - Serving bergaya serverless: scale-to-zero, autoscaling berbasis permintaan, dan trade-off cold-start
  - Strategi pemuatan model: pre-loaded, lazy loading, dan serving multi-model bergaya model-mesh
- **KServe secara mendalam**
  - CRD InferenceService: komponen predictor, transformer, dan explainer
  - Autoscaling dengan KPA dan integrasi Knative; canary rollout dan pembagian traffic
  - Serving runtime: SKLearnServer, TorchServe, Triton Inference Server, dan runtime kustom
- **Mesin inferensi LLM**
  - vLLM, TensorRT-LLM, dan Text Generation Inference (TGI) di Kubernetes
  - Continuous batching, manajemen KV-cache, dan penempatan tensor-parallel lintas GPU
  - Autoscaling dan antrean yang sadar GPU untuk endpoint LLM di bawah beban
- **Lab Praktis**: Deploy InferenceService yang menyajikan LLM dengan vLLM, konfigurasikan scale-to-zero dan canary rollout, lalu uji beban endpoint sambil mengamati pemanfaatan GPU

### Modul 7: Platform Kubeflow dan Tooling MLOps (Minggu 7)

- **Kubeflow sebagai platform terintegrasi**
  - Central Dashboard, multi-user profile, dan provisioning namespace
  - Notebook server: pemilihan image, alokasi GPU, dan idle shutdown
- **Pipeline dan orkestrasi**
  - Kubeflow Pipelines dan KFP SDK: komponen, pipeline, dan penjadwalan run
  - Argo Workflows sebagai mesin DAG alternatif di Kubernetes
  - Orkestrasi berbasis event: trigger Kafka dan KEDA untuk pipeline ML
- **Katib untuk tuning hyperparameter**
  - CRD Experiment, Trial, dan Suggestion; algoritma pencarian (Bayesian, random, grid)
  - Early stopping dan anggaran resource untuk eksperimen tuning
- **Lab Praktis**: Dirikan Kubeflow di sebuah cluster (atau operator esensial saja), buat multi-user profile, dan jalankan pipeline dua langkah dengan trial tuning Katib di GPU

### Modul 8: Storage untuk Beban Kerja AI (Minggu 8)

- **Siklus hidup data AI**
  - Staging dataset, artefak model, checkpoint, dan log: kebutuhan durabilitas dan kecepatan yang berbeda
  - Object storage sebagai sistem pencatatan utama (S3, MinIO, GCS) dan kesenjangan POSIX
- **Filesystem dan driver CSI**
  - ReadWriteMany untuk training terdistribusi: NFS, JuiceFS, CephFS, dan parallel filesystem (Lustre, GPFS)
  - Driver CSI, storage class, dan provisioning dinamis untuk data ML
  - NVMe lokal dan volume ephemeral untuk checkpoint panas; lapisan cache di atas object storage
- **Checkpoint dan artefak model**
  - Checkpoint langsung ke object storage vs. checkpoint berbasis PVC
  - Pola model registry: menyimpan bobot, metadata, dan lineage (MLflow, Hugging Face)
  - Pola transfer data: init container, sidecar, dan job sinkronisasi eksplisit
- **Lab Praktis**: Provisioning storage class ReadWriteMany, pasang ke job training terdistribusi, implementasikan checkpoint ke object storage, dan ukur waktu staging dataset

### Modul 9: Networking Performa Tinggi untuk Training Terdistribusi (Minggu 9)

- **Tuntutan networking dari AI**
  - Pola traffic AllReduce dan NCCL; mengapa bandwidth east-west mendominasi training
  - RDMA, InfiniBand, dan RoCE: kapan Kubernetes perlu mengeksposnya ke pod
  - Masalah CNI bawaan untuk training multi-GPU (head-of-line blocking, kongesti)
- **Penjadwalan dan networking sadar topologi**
  - Plugin topologi jaringan (NVIDIA Topology-Aware Scheduling) dan penempatan node pool
  - Pod hostNetwork untuk NCCL, pertimbangan shared-memory dan CPU yang di-pin
  - Pola egress: menarik dataset dari object storage tanpa menjenuhkan jaringan
- **Network policy dan isolasi untuk namespace ML**
  - Membatasi egress, mengamankan model server, dan segmentasi jaringan multi-tenant
  - Trade-off service mesh untuk traffic training bandwidth tinggi (hindari proxy di data plane)
- **Lab Praktis**: Jalankan benchmark NCCL multi-node (misalnya nccl-tests) dengan dan tanpa penjadwalan sadar topologi, dan ukur dampak hostNetwork serta penempatan ter-pin terhadap throughput AllReduce

### Modul 10: CI/CD ML dan Manajemen Siklus Hidup Model (Minggu 10)

- **CI/CD untuk machine learning**
  - Membangun image untuk training dan serving: CUDA base image, multi-stage build, dan reproduksibilitas
  - Pipeline CI yang memicu training, evaluasi, dan gerbang promosi (Argo CD, GitHub Actions, GitLab CI)
  - Drift training: ketika CI memvalidasi kode tetapi bukan perilaku data atau model
- **Model registry dan versioning**
  - MLflow, Hugging Face Hub, dan registry berbasis S3: eksperimen, run, dan versi model
  - Lineage: menghubungkan versi dataset → run training → artefak model → revisi serving yang di-deploy
  - Strategi deployment: canary, shadow, A/B antar InferenceService; rollback otomatis
- **GitOps untuk platform ML**
  - Mengelola operator, ClusterQueue, storage class, dan InferenceService sebagai konfigurasi deklaratif
  - Promosi antara cluster dev/staging/produksi dengan Argo CD
  - Secret dan kredensial model: external secrets, integrasi KMS, dan image pull secret
- **Lab Praktis**: Bangun image training di CI, daftarkan model yang dihasilkan di MLflow, promosikan melalui pipeline GitOps ke InferenceService KServe, dan lakukan canary rollout

### Modul 11: Observabilitas GPU, Keandalan, dan Optimasi Biaya (Minggu 11)

- **Mengamati beban kerja GPU**
  - DCGM (DCGM-Exporter), Prometheus, dan dashboard Grafana: pemanfaatan, memori, suhu, daya
  - Metrik job dan antrean: permintaan/admission Kueue, event pod, dan throughput per run training
  - Logging dan tracing untuk job terdistribusi: mengorelasikan log rank-0..N, OpenTelemetry untuk pipeline
- **Pola keandalan**
  - Node GPU spot dan preemptible: penanganan interupsi, irama checkpoint, dan requeue
  - Kegagalan node dan error ECC GPU: deteksi, drain, dan perbaikan otomatis
  - Eksperimen chaos untuk platform ML: kehilangan worker di tengah training dan memverifikasi pemulihan
- **Optimasi biaya**
  - Right-sizing node GPU vs. target pemanfaatan; bin-packing beban kerja training dan serving
  - Campuran spot, konsolidasi node dengan Karpenter, dan shutdown notebook idle
  - Chargeback dan showback: mengalokasikan biaya GPU ke tim melalui akuntansi kuota Kueue
- **Lab Praktis**: Deploy DCGM-Exporter dengan dashboard GPU, lakukan drill interupsi spot dengan job training ber-checkpoint, dan hasilkan laporan biaya per tim dari metrik cluster

### Modul 12: Desain Platform AI Multi-Tenant dan Proyek Puncak (Minggu 12)

- **Merancang platform AI produksi**
  - Arsitektur referensi: node pool GPU, Kueue, training operator, lapisan serving, dan storage
  - Isolasi multi-tenant: namespace, ResourceQuota, network policy, dan RBAC untuk tim ML
  - Keamanan untuk AI: image signing, SBOM, hardening node GPU, dan provenansi model
- **Menskala platform**
  - Multi-cluster terfederasi dengan MultiKueue; perencanaan kapasitas lintas region dan model GPU
  - Onboarding tim baru: akses cluster swalayan, permintaan kuota, dan alur dukungan
- **Proyek puncak**
  - Rancang dan bangun platform AI multi-tenant yang melayani dua tim fiktif (riset dan produksi)
  - End-to-end: konfigurasi cluster, kuota Kueue, pipeline PyTorchJob atau RayJob, endpoint KServe, promosi GitOps, dashboard GPU, dan laporan biaya
- **Lab Praktis**: Implementasikan platform proyek puncak dari nol di cluster sandbox, lalu presentasikan arsitektur, jalankan jalur training-ke-serving secara penuh, dan dokumentasikan prosedur operasional

## Proyek Akhir

Peserta merancang dan membangun platform AI multi-tenant yang lengkap di Kubernetes, lalu mengoperasikannya dari awal hingga akhir. Platform harus mendukung dua tim yang berbeda: tim riset yang menjalankan notebook interaktif dan eksperimen training terdistribusi, serta tim produksi yang menjalankan job fine-tuning terjadwal dan serving model yang sensitif terhadap latensi.

Hasil akhir berupa platform referensi yang berfungsi dengan: node pool GPU yang dikonfigurasi dengan taint, toleration, dan mode berbagi; ClusterQueue dan LocalQueue Kueue dengan kebijakan peminjaman dan preemption; jalur training terdistribusi (PyTorchJob atau RayJob) yang melakukan checkpoint ke object storage dan bertahan dari interupsi node; InferenceService KServe (atau deployment vLLM) dengan scale-to-zero dan canary rollout; lapisan operator dan konfigurasi yang dikelola GitOps; tumpukan observabilitas GPU dengan dashboard dan pelaporan biaya per tim; serta dokumentasi arsitektur, runbook, dan kebijakan kuota. Platform harus dapat direproduksi dari konfigurasi deklaratif, dan peserta harus mendemonstrasikan alur kerja training-ke-serving lengkap beserta drill keandalan (kegagalan worker atau interupsi spot).

## Kriteria Penilaian

- **Tugas**: Lab praktis mingguan dari Modul 1–11, dikumpulkan sebagai manifest yang dapat direproduksi dan laporan singkat. Dinilai berdasarkan kebenaran konfigurasi penjadwalan dan kuota, keberhasilan eksekusi beban kerja training dan serving, serta penjelasan yang jelas tentang perilaku kegagalan.
- **Kuis Modul**: Kuis singkat setelah setiap fase (setelah Minggu 4, 8, dan 11) yang mencakup penjadwalan GPU, mekanika kuota Kueue, protokol serving, dan fundamental networking.
- **Proyek Akhir**: Dievaluasi berdasarkan kelengkapan platform (semua komponen yang disyaratkan ada dan berfungsi), kualitas isolasi multi-tenant (penegakan kuota, network policy, RBAC), kesiapan produksi (checkpoint, autoscaling, observabilitas, pelaporan biaya), dan kualitas dokumentasi. Platform yang melayani inferensi produksi sementara job training riset berjalan, bertahan dari interupsi node, serta menunjukkan pemanfaatan GPU dan atribusi biaya yang terukur dinyatakan lulus.

## Referensi

- Dokumentasi Kubernetes — Scheduling, Taints and Tolerations, Extended Resources dan Device Plugins
- Dokumentasi Kueue — ClusterQueue, LocalQueue, ResourceFlavor, MultiKueue
- Dokumentasi Kubeflow — Training Operator, Pipelines, Katib, Central Dashboard
- Dokumentasi KubeRay — RayCluster, RayJob, Ray Serve di Kubernetes
- Dokumentasi KServe — InferenceService, protokol v1/v2, autoscaling dan canary rollout
- NVIDIA Device Plugin dan DCGM-Exporter — penjadwalan GPU, MIG, dan observabilitas
- vLLM dan TensorRT-LLM — mesin inferensi LLM dan continuous batching
- Argo CD dan Argo Workflows — GitOps dan orkestrasi pipeline
- MLflow dan Hugging Face Hub — pelacakan eksperimen dan model registry

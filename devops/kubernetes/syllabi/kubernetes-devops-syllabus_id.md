---
title: "Silabus DevOps Kubernetes"
description: "Kurikulum terstruktur 12 minggu yang mencakup Kubernetes dari fundamental hingga kesiapan produksi, termasuk arsitektur cluster, kubectl, Pod, Deployment, Service, ConfigMap, Secret, Storage, Ingress, Helm, RBAC, keamanan, monitoring, CI/CD, dan proyek kapstone."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus DevOps Kubernetes

## Ringkasan

Silabus 12 minggu ini menyediakan kurikulum komprehensif dan langsung untuk DevOps engineer dan platform engineer dalam menguasai Kubernetes. Kursus ini berlangsung dari konsep orkestrasi kontainer fundamental hingga topik produksi tingkat lanjut termasuk monitoring, keamanan, GitOps, dan proyek kapstone dunia nyata. Setiap modul menyeimbangkan pembelajaran konseptual dengan lab praktis.

## Kurikulum

### Minggu 1: Konsep Orkestrasi Kontainer

- **Dasar-dasar Orkestrasi Kontainer**
  - Apa itu orkestrasi kontainer dan mengapa penting
  - Perbandingan: Docker Swarm vs. Apache Mesos vs. Kubernetes
  - Kasus penggunaan Kubernetes dan adopsi industri
- **Ikhtisar Ekosistem Kubernetes**
  - Lanskap CNCF dan proyek yang telah lulus
  - Layanan Kubernetes terkelola (EKS, AKS, GKE)
  - Alat pengembangan lokal (Minikube, Kind, K3s)

### Minggu 2: Arsitektur Cluster

- **Komponen Control Plane**
  - kube-apiserver: agregasi API, autentikasi, otorisasi
  - etcd: penyimpanan key-value terdistribusi, konsensus (Raft)
  - kube-scheduler: kebijakan penjadwalan, predikat, prioritas
  - kube-controller-manager: loop kontrol, rekonsiliasi
- **Komponen Worker Node**
  - kubelet: siklus hidup Pod, antarmuka runtime kontainer (CRI)
  - kube-proxy: mode iptables, IPVS, userspace
  - Runtime kontainer: containerd, CRI-O, Docker
- **Dasar-dasar Jaringan Cluster**
  - Plugin CNI (Calico, Flannel, Cilium)
  - Model jaringan Pod (IP-per-Pod)
  - Penemuan layanan dan DNS

### Minggu 3: CLI kubectl dan Operasi Hari-2

- **Referensi Perintah kubectl**
  - Jenis sumber daya dan nama pendek (po, deploy, svc, ns)
  - Format output (-o wide, json, yaml, jsonpath)
  - Operasi umum: get, describe, logs, exec, attach
- **Penggunaan kubectl Tingkat Lanjut**
  - Port forwarding dan proxying
  - Menyalin file ke/dari kontainer
  - Debugging dengan kontainer ephemeral
- **Manajemen Konfigurasi dan Konteks**
  - File KUBECONFIG dan strategi penggabungan
  - Perpindahan konteks dan namespace
  - Alat kubectx/kubens

### Minggu 4: Pod dan Kontainer

- **Siklus Hidup Pod**
  - Fase Pod (Pending, Running, Succeeded, Failed, Unknown)
  - Init container dan sidecar container
  - Status dan kondisi Pod
- **Konfigurasi Kontainer**
  - Permintaan dan batas sumber daya (CPU, memori, penyimpanan ephemeral)
  - Variabel lingkungan dan injeksi ConfigMap/Secret
  - Perintah dan argumen (ENTRYPOINT/CMD)
- **Health Probe**
  - livenessProbe: kebijakan restart
  - readinessProbe: routing lalu lintas
  - startupProbe: kontainer yang mulai lambat
  - Tipe probe: HTTP, TCP, gRPC, exec

### Minggu 5: Deployment dan ReplicaSet

- **ReplicaSet**
  - Pencocokan selektor dan kepemilikan
  - Penskalaan dan self-healing
- **Deployment**
  - Pembaruan deklaratif dan strategi rollout
  - Strategi RollingUpdate vs. Recreate
  - Konfigurasi MaxSurge dan MaxUnavailable
- **Operasi Deployment**
  - Status rollout, riwayat, dan rollback
  - Menjeda dan melanjutkan rollout
  - Penskalaan (manual, HPA, VPA)
- **Sumber Daya Beban Kerja Lainnya**
  - StatefulSet untuk aplikasi stateful
  - DaemonSet untuk agen tingkat node
  - Job dan CronJob untuk pemrosesan batch

### Minggu 6: Service dan Jaringan

- **Tipe Service**
  - ClusterIP: penemuan layanan internal
  - NodePort: akses eksternal melalui port node
  - LoadBalancer: integrasi LB cloud
  - ExternalName: aliasing DNS
- **Konsep Service Mesh**
  - Pengenalan Istio dan Linkerd
  - mTLS, pembagian lalu lintas, circuit breaking
  - Observabilitas (metrik, trace, log akses)
- **Network Policy**
  - Aturan ingress dan egress
  - Isolasi Pod-ke-Pod
  - Pola default deny dan allow

### Minggu 7: ConfigMap dan Secret

- **Pembuatan dan Konsumsi ConfigMap**
  - Dari literal, file, dan direktori
  - Injeksi variabel lingkungan
  - Volume mount dan subpath
- **Manajemen Secret**
  - Tipe Secret bawaan (Opaque, docker-registry, TLS)
  - Enkripsi saat istirahat (KMS, SOPS, Sealed Secrets)
  - Operator secret eksternal (External Secrets Operator, Vault)
- **Praktik Terbaik**
  - ConfigMap/Secret immutabel
  - Menghindari data sensitif di variabel lingkungan
  - Strategi rotasi Secret

### Minggu 8: Storage (PVC, PV, StorageClass)

- **Persistent Volume dan Claim**
  - Provisi statis vs. dinamis
  - Mode akses (ReadWriteOnce, ReadOnlyMany, ReadWriteMany)
  - Kebijakan reclaim (Retain, Delete, Recycle)
- **StorageClass**
  - Konfigurasi provisioner
  - Mode binding volume (Immediate, WaitForFirstConsumer)
  - Izinkan ekspansi volume
- **Beban Kerja Stateful**
  - StatefulSet dengan template PVC
  - Snapshot dan cloning volume
  - Driver CSI dan solusi penyimpanan pihak ketiga

### Minggu 9: Ingress dan TLS

- **Ingress Controller**
  - NGINX Ingress Controller
  - Traefik, HAProxy, Contour
  - IngressClass dan pengaturan multi-controller
- **Sumber Daya Ingress**
  - Routing berbasis host dan path
  - Terminasi TLS dan manajemen sertifikat
  - Anotasi untuk perilaku lanjutan (rewrite, CORS, rate limiting)
- **Gateway API (Lanjutan)**
  - GatewayClass, Gateway, HTTPRoute
  - Migrasi dari Ingress ke Gateway API

### Minggu 10: Helm, RBAC, dan Keamanan

- **Manajer Paket Helm**
  - Struktur chart dan konvensi
  - Values, template, dan helpers
  - Repositori chart dan manajemen dependensi
  - Helmfile untuk deployment multi-lingkungan
- **Role-Based Access Control (RBAC)**
  - Role, ClusterRole, RoleBinding, ClusterRoleBinding
  - Service account dan manajemen token
  - Prinsip hak akses minimal
- **Keamanan Pod**
  - Standar Keamanan Pod (Privileged, Baseline, Restricted)
  - Pod Security Admission (PSA) vs. OPA/Gatekeeper
  - Security context (runAsUser, fsGroup, SELinux, seccomp)

### Minggu 11: Monitoring dan Logging

- **Tumpukan Monitoring (kube-prometheus-stack)**
  - Server Prometheus, Alertmanager, Grafana
  - ServiceMonitor dan PodMonitor
  - Metrik kustom dan integrasi HPA
- **Logging**
  - Logging tingkat node vs. pendekatan sidecar
  - Loki untuk agregasi log
  - Fluentd/Fluent Bit untuk penerusan log
- **Observabilitas dengan OpenTelemetry**
  - Trace dengan Tempo/Jaeger
  - Korelasi metrik dan trace
  - OpenTelemetry Collector

### Minggu 12: CI/CD dengan Kubernetes dan Kapstone

- **Pipeline CI/CD**
  - Prinsip GitOps (deklaratif, version-controlled, terotomatisasi)
  - Perbandingan ArgoCD vs. Flux dan migrasi
  - Canary deployment dan progressive delivery
  - Otomatisasi pembaruan gambar (Renovate, Image Updater)
- **Proyek Kapstone**
  - Sebarkan aplikasi multi-tier (frontend, backend, database)
  - Konfigurasikan Ingress dengan TLS, penyimpanan persisten, dan autoscaling
  - Siapkan dashboard monitoring dan alerting
  - Terapkan alur kerja GitOps dengan ArgoCD atau Flux

## Proyek Akhir

**Proyek**: Sebarkan aplikasi microservices tingkat produksi di Kubernetes.

**Persyaratan**:
1. Arsitektur multi-tier dengan minimal 3 layanan (frontend, API, database).
2. Ingress controller dengan terminasi TLS menggunakan cert-manager.
3. Penyimpanan persisten untuk database menggunakan PVC dan StatefulSet.
4. Horizontal Pod Autoscaler berdasarkan pemanfaatan CPU/memori.
5. ConfigMap dan Secret untuk manajemen konfigurasi.
6. RBAC dengan service account hak akses minimal.
7. Kemasan Helm chart untuk tumpukan lengkap.
8. Monitoring dengan dashboard Prometheus/Grafana.
9. Pipeline deployment GitOps menggunakan ArgoCD atau Flux.
10. Network policy yang menegakkan isolasi pod-ke-pod.

**Hasil Kerja**:
- Repositori Git dengan Helm chart dan manifest Kubernetes.
- Dokumentasi arsitektur dan langkah deployment.
- Tangkapan layar dashboard Grafana yang menunjukkan metrik cluster dan aplikasi.
- Laporan singkat tentang pengujian performa dan perilaku autoscaling.

## Kriteria Penilaian

- **Lab Praktis (40%)**: Latihan praktis mingguan yang menunjukkan kemahiran perintah dan pemecahan masalah.
- **Kuis (20%)**: Pertanyaan pilihan ganda dan jawaban singkat tentang arsitektur, keamanan, dan praktik terbaik.
- **Proyek Akhir (40%)**: Evaluasi berdasarkan kualitas arsitektur, implementasi keamanan, kelengkapan otomatisasi, dan kejelasan dokumentasi.

## Referensi

- [Dokumentasi Resmi Kubernetes](https://kubernetes.io/docs/)
- [Kubernetes the Hard Way (Kelsey Hightower)](https://github.com/kelseyhightower/kubernetes-the-hard-way)
- [Lanskap Cloud Native CNCF](https://landscape.cncf.io/)
- [Dokumentasi Helm](https://helm.sh/docs/)
- [Dokumentasi ArgoCD](https://argo-cd.readthedocs.io/)
- [Dokumentasi Prometheus](https://prometheus.io/docs/)
- [Dokumentasi Istio](https://istio.io/latest/docs/)
- [Kubernetes Patterns (Red Hat)](https://www.redhat.com/en/topics/containers/kubernetes-patterns)
- [Kurikulum Ujian CKAD](https://github.com/cncf/curriculum)

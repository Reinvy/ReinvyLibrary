---
title: "Silabus Platform Engineering Kubernetes"
description: "Kurikulum delapan modul yang membawa engineer dari dasar Kubernetes hingga mengoperasikan platform produksi: beban kerja, jaringan, penyimpanan, keamanan, observabilitas, GitOps, dan kendali biaya."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Platform Engineering Kubernetes

## Ringkasan

Platform engineering adalah disiplin mengubah Kubernetes dari sekadar cluster yang Anda operasikan menjadi produk yang dikonsumsi tim lain. Pergeseran itu menuntut lebih dari kefasihan `kubectl`: dibutuhkan nilai default yang tegas, tooling paved road, guardrail swalayan, serta observabilitas dan kendali biaya yang menjaga cluster multi-tenant tetap dapat dipercaya.

Silabus ini terdiri dari delapan modul dalam enam belas pekan, sekitar dua pekan per modul dengan satu lab di akhir setiap modul. Urutannya disengaja. Modul 1–3 membangun model mental dan landasan beban kerja; modul 4–6 menambahkan concern lintas potong (penyimpanan, keamanan, observabilitas) yang justru menjadi sumber sebagian besar insiden; modul 7–8 mengubah hasilnya menjadi platform yang terkirim, terkelola, dan sadar biaya.

Setiap modul mengasumsikan kerja praktik di cluster nyata — cluster kind lokal untuk lab awal, lalu cluster cloud (EKS, GKE, atau AKS) sejak Modul 5 karena node pool, load balancer, dan IAM berperilaku berbeda di sana. Seluruh materi diajarkan manifest-first dengan Git sebagai sumber kebenaran, sehingga peserta tidak mengembangkan kebiasaan yang hanya bekerja lewat perintah imperatif.

## Kurikulum

### Modul 1: Dasar Kubernetes dan Control Plane

- **Arsitektur**: API server, etcd, scheduler, controller manager, kubelet, kube-proxy
- **Objek dan rekonsiliasi**: desired state, informer, pola controller
- **Namespace, label, anotasi, dan selector** sebagai primitif pengorganisasi
- **Lab**: menyiapkan cluster kind, men-deploy Pod dan Deployment, lalu menelusuri rollout dengan `kubectl get events -w`

### Modul 2: Beban Kerja dan Manajemen Siklus Hidup

- **Deployment, ReplicaSet, StatefulSet, DaemonSet, Job, CronJob** — kapan masing-masing tepat digunakan
- **Probe**: readiness versus liveness versus startup, beserta mode kegagalan tiap-tiapnya
- **Resource requests dan limits**, kelas QoS, dan urutan eviksi
- **Rollout dan rollback**: `maxSurge`, `maxUnavailable`, `progressDeadlineSeconds`
- **Lab**: mengirim consumer antrean stateful dengan startup probe dan PodDisruptionBudget, lalu merusaknya dengan sengaja dan memulihkannya

### Modul 3: Service, Ingress, dan Jaringan Cluster

- **Tipe Service** (ClusterIP, NodePort, LoadBalancer) dan EndpointSlice
- **Ingress versus Gateway API**: mengapa standar platform sedang berpindah
- **DNS**: CoreDNS, headless service, dan biaya resolusi `ndots`
- **NetworkPolicy** sebagai segmentasi default-deny
- **Lab**: mengekspos satu service melalui Gateway, lalu membuktikan lewat `kubectl exec` bahwa kebijakan default-deny memblokir jalur tak terduga

### Modul 4: Penyimpanan dan Aplikasi Stateful

- **Volume, PersistentVolume, PersistentVolumeClaim**, dan siklus hidup binding
- **StorageClass**: reclaim policy, ekspansi volume, batasan topologi
- **Identitas StatefulSet**: ID jaringan stabil, rollout berurutan, PVC per replika
- **Backup dan restore**: Velero, snapshot class, dan latihan restore
- **Lab**: menjalankan PostgreSQL tiga replika, mematikan satu pod saat penulisan berlangsung, dan memverifikasi pemulihan plus restore Velero ke namespace percobaan

### Modul 5: Keamanan, Kebijakan, dan Multi-Tenancy

- **RBAC**: role, binding, agregasi, dan proses tinjauan least-privilege
- **ServiceAccount dan workload identity** (IRSA, Workload Identity, Azure AD)
- **Pod Security Admission** dan profil restricted
- **Admission policy**: Kyverno atau Gatekeeper untuk label wajib, registry, dan batas sumber daya
- **Secret**: External Secrets Operator, sealed secret, rotasi
- **Lab**: mengunci namespace dengan PSA `restricted`, NetworkPolicy default-deny, dan aturan Kyverno yang menolak image dari registry tidak disetujui

### Modul 6: Observabilitas dan Reliabilitas

- **Metrik**: kube-state-metrics, cAdvisor, Prometheus, dan recording rule yang tetap skalabel
- **Log**: structured logging, pipeline collector, retensi yang tidak menguras biaya
- **Trace**: instrumentasi OpenTelemetry dan propagasi konteks antar service
- **SLO dan alerting**: error budget, alert burn-rate multi-jendela, kelelahan alert
- **Debugging**: ephemeral container `kubectl debug`, `kubectl top`, event, dan empat golden signal
- **Lab**: menginstrumentasi API contoh, menetapkan SLO, dan menulis alert burn-rate yang menyala pada kegagalan terencana tetapi tidak pada variasi normal

### Modul 7: GitOps dan Pengiriman Platform

- **Prinsip GitOps**: deklaratif, terversi, ditarik, direkonsiliasi terus-menerus
- **Argo CD atau Flux**: application set, sync wave, deteksi drift, pruning
- **Promosi environment**: overlay, Kustomize versus Helm, otomasi pembaruan image
- **Progressive delivery**: canary dan blue-green dengan Argo Rollouts, rollback otomatis berbasis metrik
- **Platform sebagai produk**: golden path, template scaffolding, namespace swalayan
- **Lab**: mengubah manifest kursus menjadi repositori GitOps dengan overlay dev dan prod, lalu mengirim rilis canary yang otomatis rollback saat analysis run gagal

### Modul 8: Kapasitas, Biaya, dan Operasi Cluster

- **Lapisan autoscaling**: HPA, VPA, cluster autoscaler atau Karpenter, KEDA untuk beban berbasis event
- **Strategi node pool**: baseline on-demand, spot untuk beban yang dapat terputus, taint dan toleransi
- **Alokasi biaya**: label, kuota, laporan showback, dan deteksi idle
- **Upgrade**: selisih versi control plane dan node, pengaturan surge, drain yang sadar PDB
- **Lab**: melakukan right-sizing dari rekomendasi VPA, memindahkan job batch ke spot, dan menghasilkan laporan biaya namespace sebelum serta sesudah perubahan

## Proyek Akhir

Membangun dan mengoperasikan platform internal kecil untuk dua tim produk fiktif, seluruhnya dikirim dari Git.

- **Platform**: satu cluster, tiga namespace (`platform-system`, `team-alpha`, `team-beta`), dengan Argo CD atau Flux merekonsiliasi setiap objek dari repositori milik peserta.
- **Paved road**: kebijakan Kyverno yang mewajibkan label, registry yang disetujui, dan limit sumber daya; template namespace yang mengirim kuota, LimitRange, NetworkPolicy, dan RBAC dalam satu apply.
- **Beban kerja**: aplikasi dua service (API dan worker) dengan basis data, diekspos melalui Gateway API, dilengkapi metrik, log, dan trace, serta dijaga SLO dengan alert burn-rate.
- **Cerita operasional**: HPA plus node pool spot untuk worker, runbook upgrade terdokumentasi, latihan restore dari backup, dan laporan biaya per namespace yang menunjukkan penghematan dari right-sizing.
- **Luaran**: sebuah repositori, README yang dapat diikuti engineer baru dalam waktu kurang dari satu jam, dan demo sepuluh menit yang mencakup satu kegagalan yang sengaja dipicu beserta pemulihan otomatisnya.

## Kriteria Penilaian

- **Lab mingguan (40%)**: setiap modul berakhir dengan lab yang harus lolos pemeriksaan otomatis (sumber daya sehat, kebijakan ditegakkan, rollout selesai). Nilai sebagian diberikan untuk solusi yang berjalan disertai penjelasan trade-off tertulis.
- **Tinjauan desain (15%)**: tinjauan tertulis atas template namespace peserta lain, dinilai dari least privilege, blast radius, dan kejelasan.
- **Latihan insiden (15%)**: mendiagnosis kegagalan yang ditanam di cluster bersama dalam 30 menit hanya dengan tooling observabilitas dan status cluster, lalu menulis postmortem singkat.
- **Proyek akhir (30%)**: dinilai dari reproduktibilitas (apakah dapat di-deploy dari cluster bersih?), kebenaran guardrail, kualitas SLO dan alert, serta kredibilitas cerita biaya dan upgrade. Nilai tambah untuk otomasi latihan restore.

## Referensi

- Dokumentasi Kubernetes — konsep, task, dan referensi API: https://kubernetes.io/docs/
- Kubernetes Enhancement Proposal dan spesifikasi Gateway API: https://gateway-api.sigs.k8s.io/
- Dokumentasi Argo CD, termasuk ApplicationSet dan sync wave: https://argo-cd.readthedocs.io/
- Dokumentasi Flux untuk pola GitOps toolkit: https://fluxcd.io/docs/
- Pustaka kebijakan Kyverno: https://kyverno.io/policies/
- Prometheus dan SRE Workbook (error budget, alert burn-rate): https://sre.google/workbook/
- Dokumentasi Karpenter untuk provisioning dan konsolidasi node: https://karpenter.sh/
- Lanskap CNCF dan sumber daya komunitas Platform Engineering: https://landscape.cncf.io/

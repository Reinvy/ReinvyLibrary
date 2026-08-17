---
title: "Silabus Lanjutan Platform Engineering dan Internals Cluster Kubernetes"
description: "Kurikulum lanjutan 12 minggu yang komprehensif untuk operator Kubernetes berpengalaman dan platform engineer, mencakup internals scheduler dan strategi penempatan, admission control dan policy as code, custom resources dan pengembangan operator, autoscaling tingkat lanjut, arsitektur Gateway API dan service mesh, multi-tenancy, Cluster API dan siklus hidup cluster, pola multi-cluster, observabilitas berbasis SLO, chaos engineering, keamanan rantai pasok, penyetelan performa, dan proyek puncak platform engineering."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Lanjutan Platform Engineering dan Internals Cluster Kubernetes

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk operator Kubernetes berpengalaman, SRE, dan platform engineer yang sudah menjalankan workload di produksi dan ingin menguasai platform itu sendiri. Jika kurikulum Kubernetes tingkat pengantar mengajarkan *cara mengoperasikan* cluster, kursus ini menyelami bagian dalamnya: keputusan penempatan scheduler, rantai admission control, model rekonsiliasi controller-runtime, mesin autoscaling, data plane, dan semantik kegagalan yang menentukan bagaimana sebuah platform berperilaku di bawah beban, tekanan multi-tenancy, dan chaos.

Kurikulum disusun dalam tiga fase. Minggu 1–4 membedah internals cluster: penjadwalan tingkat lanjut dan penempatan, admission control dan policy as code, custom resources dan pembangunan operator, serta autoscaling tingkat lanjut. Minggu 5–8 berfokus pada arsitektur platform: Gateway API dan jaringan layanan modern, service mesh dan data plane eBPF, pola multi-tenancy dan isolasi, serta pengelolaan siklus hidup cluster dengan Cluster API. Minggu 9–12 membahas disiplin platform engineering: arsitektur multi-cluster, observabilitas berbasis SLO, chaos engineering dan keandalan, keamanan rantai pasok, penyetelan performa, serta proyek puncak di mana peserta merancang dan membangun internal developer platform.

Setiap modul memadukan landasan konseptual yang mendalam dengan lab praktik yang menuntut peserta memeriksa kondisi cluster secara nyata, menulis admission webhook, membangun operator yang berfungsi, menjalankan eksperimen autoscaling dan chaos, serta merancang topologi multi-cluster. Pada akhir kursus ini, peserta akan mampu menjelaskan cara kerja internal scheduler dan rantai admission, membangun custom controller dan operator, menegakkan policy as code, merancang platform multi-tenant dan multi-cluster, menyetel performa control plane, serta menjalankan eksperimen keandalan yang membuktikan bahwa sebuah platform dapat bertahan dari kegagalan nyata.

## Kurikulum

### Modul 1: Penjadwalan dan Penempatan Tingkat Lanjut (Minggu 1)

- **Internals kube-scheduler**
  - Kerangka kerja penjadwalan: antrean, siklus, dan extension point (PreFilter, Filter, Score, Reserve, Permit, Bind)
  - Predikat dan prioritas bawaan: resource node, port node, afinitas antar-pod, skor penyebaran
  - Mekanika antrean penjadwalan: priority queue, backoff, dan penanganan pod yang tidak dapat dijadwalkan
- **Primitif penempatan node dan pod**
  - Node selector, node affinity (required vs. preferred), anti-affinity dan topology spread constraints
  - Taint dan toleration: node khusus, workload control plane khusus, eviction berbasis taint
  - Priority class dan preemption: kapan scheduler mengevakuasi Pod berprioritas lebih rendah
- **Descheduling dan penyeimbangan ulang**
  - Proyek descheduler: strategi, namespace, dan eviction berbasis ambang batas
  - Integrasi Cluster Autoscaler: pod yang tidak terjadwalkan, node pool, dan perilaku scale-down
- **Memperluas scheduler**
  - Plugin scheduler dan pengaturan multi-scheduler (schedulerName)
  - Scheduler extender dan kapan scheduler kustom diperlukan
- **Lab Praktik**: Deploy workload dengan topology spread constraints, beri taint pada node, verifikasi skor dengan instrumentasi kerangka kerja penjadwalan, pasang descheduler, dan amati preemption dengan batch job berprioritas rendah

### Modul 2: Admission Control dan Policy as Code (Minggu 2)

- **Rantai admission control**
  - Bagaimana request mengalir dari API server melalui autentikasi, otorisasi, dan admission
  - Admission controller bawaan: NamespaceLifecycle, LimitRanger, ResourceQuota, PodSecurity, ServiceAccount
  - Mutasi sebelum validasi: jaminan urutan webhook mutating vs. validating
- **Dynamic admission webhook**
  - Konfigurasi MutatingAdmissionWebhook dan ValidatingAdmissionWebhook (webhookConfiguration, failurePolicy, matchPolicy)
  - Pola injeksi sidecar dan webhook defaulting
  - Keamanan webhook: TLS, pembatasan cakupan namespaceSelector/objectSelector, semantik timeout dan retry
- **Mesin kebijakan**
  - OPA/Gatekeeper: ConstraintTemplates, constraints, dan pembuatan kebijakan rego
  - Kyverno: policy-as-YAML, aturan generate/mutate/validate, dan cluster policies
  - Memilih antara webhook, Gatekeeper, dan Kyverno untuk sebuah organisasi
- **Policy as code di CI**
  - Pemeriksaan kebijakan di pull request: kubeconform, kube-score, conftest
  - Gerbang kebijakan GitOps: memblokir drift pada sinkronisasi ArgoCD
- **Lab Praktik**: Tulis validating webhook yang menolak container privileged, deploy kebijakan Kyverno untuk pelabelan namespace dan daftar izin registry image, serta tegakkan kebijakan yang sama di pipeline CI dengan conftest

### Modul 3: Custom Resources dan Pembangunan Operator (Minggu 3)

- **CustomResourceDefinitions**
  - Desain skema CRD: versi, skema struktural, pruning, dan subresource status
  - Validasi, default, dan conversion webhook lintas versi API
  - Siklus hidup CRD: penanganan field tak dikenal dan ekstensi `x-kubernetes-*` oleh API server
- **Pola controller**
  - Loop rekonsiliasi: keadaan yang diinginkan vs. keadaan teramati, semantik requeue, dan finalizer
  - Informer, cache, dan watch: bagaimana controller mengamati API tanpa membebaninya
  - Pemilihan leader dan deployment controller HA
- **Membangun operator**
  - Scaffolding controller-runtime dan kubebuilder: grup API, tipe, dan manifest yang dihasilkan
  - Alur kerja Operator SDK: operator untuk workload stateless dan stateful
  - Kematangan operator: dari instalasi dasar hingga auto-pilot (OLM, Operator Lifecycle Manager)
- **Pola operator tingkat lanjut**
  - Adopsi dan garbage collection melalui owner references
  - Status conditions, perekaman event, dan metrik yang dipancarkan controller
- **Lab Praktik**: Scaffold proyek kubebuilder, definisikan CRD dengan skema struktural, implementasikan loop rekonsiliasi yang menyediakan Deployment, tambahkan finalizer untuk penghapusan bersih, dan kemas operator dengan OLM

### Modul 4: Autoscaling Tingkat Lanjut dan Manajemen Kapasitas (Minggu 4)

- **Internals Horizontal Pod Autoscaler**
  - Loop controller HPA, jendela stabilisasi, dan batas laju penskalaan
  - Custom metrics API dan external metrics API: ketika metrik bawaan Kubernetes tidak cukup
  - HPA dengan custom metrics adapter (Prometheus Adapter, KEDA)
- **Vertical Pod Autoscaler**
  - Komponen VPA: recommender, updater, plugin admission
  - Rekomendasi vs. pembaruan aktual: mode pembaruan (Off, Initial, Auto, Recreate)
  - Menggabungkan VPA dan HPA: resource policy dan menghindari konflik
- **Autoscaling berbasis peristiwa dengan KEDA**
  - ScaledObjects dan ScaledJobs: trigger HTTP, antrean, dan stream
  - Arsitektur operator dan metrics adapter KEDA
- **Kapasitas tingkat cluster**
  - Cluster Autoscaler: expander, kontrol scale-down, dan semantik node group
  - Karpenter: NodeClaims, provisioning, konsolidasi, dan penanganan interrupt
  - Perencanaan kapasitas: headroom, bin packing, dan strategi instance spot
- **Lab Praktik**: Ekspos metrik kustom (kedalaman antrean) dan skala HPA dengan KEDA, jalankan recommender VPA terhadap layanan yang sensitif terhadap latensi, serta bandingkan perilaku provisioning Cluster Autoscaler vs. Karpenter

### Modul 5: Gateway API dan Jaringan Layanan Modern (Minggu 5)

- **Dari Ingress ke Gateway API**
  - GatewayClass, Gateway, dan resource route: pemisahan peran antara operator cluster dan tim aplikasi
  - Semantik HTTPRoute, TLSRoute, TCPRoute, dan GRPCRoute
  - Routing lintas namespace dan reference grants
- **Fitur route tingkat lanjut**
  - Traffic splitting, canary berbobot, dan pencocokan header/query
  - Timeout, retry, dan request mirroring sebagai route filter kelas satu
  - Backend TLS dan integrasi service mesh melalui BackendTLSPolicy
- **Implementasi Gateway**
  - NGINX Gateway Fabric dan Envoy Gateway
  - Dukungan Gateway API di Contour dan Traefik
- **Strategi migrasi**
  - Menjalankan Ingress dan Gateway API berdampingan, kemudian memindahkan traffic
  - Anotasi dan pemecahan masalah kegagalan pengikatan route
- **Lab Praktik**: Pasang Envoy Gateway, definisikan GatewayClass dan Gateway, arahkan traffic dengan pembagian berbobot, mirror persentase request ke canary, dan migrasikan host Ingress yang ada ke HTTPRoute

### Modul 6: Service Mesh Mendalam dan Data Plane eBPF (Minggu 6)

- **Arsitektur service mesh**
  - Control plane vs. data plane: sidecar proxy, identitas mTLS (SPIFFE), dan rotasi sertifikat
  - Istio: data plane berbasis Envoy, control plane Pilot/istiod, dan protokol xDS
  - Linkerd: micro-proxy berbasis Rust dan control plane linkerd2
- **Manajemen traffic**
  - VirtualServices, DestinationRules, dan traffic shifting secara mendalam
  - Fault injection, circuit breaking, dan outlier detection
  - Ekspansi mesh multi-cluster dan identitas terfederasi
- **Observabilitas dan keamanan**
  - Metrik mesh (HTTP, TCP), distributed tracing, dan access log
  - Kebijakan otorisasi: deny-by-default, per-namespace, dan per-workload
- **Data plane berbasis eBPF**
  - Service mesh Cilium dan jalur data eBPF: load balancing tingkat socket, manajemen bandwidth
  - Hubble untuk visibilitas flow dan penegakan kebijakan di tingkat kernel
  - Kapan memilih sidecar mesh vs. mesh eBPF
- **Lab Praktik**: Pasang mesh, aktifkan mTLS dengan peer authentication ketat, pindahkan traffic dengan VirtualService berbobot, injeksi fault untuk memvalidasi ketahanan, dan periksa flow dengan Hubble

### Modul 7: Multi-tenancy dan Pola Isolasi (Minggu 7)

- **Model tenancy**
  - Multi-tenancy lunak vs. keras: cluster bersama, node khusus, cluster khusus
  - Namespace sebagai batas tenancy: RoleBindings, ResourceQuota, LimitRange
  - Hierarchical namespaces: tenancy bertingkat dan pewarisan kebijakan
- **Isolasi resource**
  - Desain kuota: kuota komputasi, penyimpanan, dan jumlah objek per tenant
  - Priority class dan QoS burstable vs. guaranteed untuk mitigasi noisy-neighbor
  - Taint node, node pool, dan node affinity untuk pemisahan workload
- **Isolasi keamanan**
  - NetworkPolicies per tenant dan per aplikasi
  - Pod Security Standards dan kebijakan admission tingkat tenant
  - Alokasi biaya: label, pemetaan tenancy Kubecost, dan chargeback
- **Virtual cluster**
  - vcluster: control plane virtual ringan di atas satu cluster fisik
  - Kapan virtual cluster mengungguli namespace (isolasi CRD dan API bersama)
- **Lab Praktik**: Rancang cluster dua tenant dengan kuota, priority class, dan network policy; validasi mitigasi noisy-neighbor dengan pod yang haus CPU; dan buat vcluster untuk menguji isolasi CRD

### Modul 8: Siklus Hidup Cluster dan Cluster API (Minggu 8)

- **Mekanika upgrade**
  - Alur kerja upgrade kubeadm: control plane terlebih dahulu, lalu worker; kebijakan skew
  - Node drain, cordon, dan PodDisruptionBudgets selama upgrade
  - Skew versi antar komponen dan jalur upgrade yang didukung
- **Operasi etcd**
  - Arsitektur etcd: konsensus Raft, snapshot, dan kompaksi
  - Backup dan restore: etcdctl snapshot save/restore, prosedur pemulihan bencana
  - Defragmentasi dan penyetelan kesehatan etcd
- **Cluster API**
  - Siklus hidup cluster deklaratif: Cluster, Machine, MachineDeployment, dan MachineSet
  - Infrastructure provider (AWS, vSphere, Docker) dan bootstrap provider (kubeadm)
  - Machine health check dan perbaikan otomatis
- **Ketahanan control plane**
  - Control plane multi-AZ, etcd stacked vs. eksternal
  - Load balancing API server, otorisasi kubelet, dan arsitektur audit log
- **Lab Praktik**: Lakukan upgrade versi minor dengan cordon/drain dan PDB, praktikkan restore etcd setelah simulasi kehilangan data, dan provision workload cluster dengan Cluster API beserta machine health check

### Modul 9: Arsitektur Multi-Cluster dan Strategi Deployment (Minggu 9)

- **Mengapa multi-cluster**
  - Kasus penggunaan isolasi, blast radius, kepatuhan, dan latensi
  - Model manajemen terpusat vs. terdesentralisasi
- **Distribusi aplikasi**
  - GitOps lintas cluster: ArgoCD multi-cluster, ApplicationSets dengan cluster generator
  - Model sinkronisasi: hub-spoke vs. agen pull-based (Flux, ArgoCD)
- **Konektivitas layanan**
  - Service discovery lintas cluster: Submariner, Cilium ClusterMesh, dan ekspansi mesh
  - Pola failover dan active-active untuk workload stateless dan stateful
- **Kebijakan dan tata kelola berskala besar**
  - Distribusi kebijakan terpusat (kebijakan Kyverno, constraints OPA) lintas fleet
  - Deteksi drift konfigurasi lintas lingkungan
- **Pola pemulihan bencana**
  - Strategi DR warm standby, active-passive, dan backup/restore
- **Lab Praktik**: Daftarkan cluster kedua di ArgoCD, deploy ApplicationSet yang menargetkan kedua cluster, hubungkan layanan dengan Cilium ClusterMesh, dan jalankan latihan failover

### Modul 10: Observabilitas Tingkat Lanjut dan Rekayasa SLO (Minggu 10)

- **Internals Prometheus**
  - TSDB: model scrape, staleness, dan retensi
  - Recording rules dan alerting rules pada skala platform
  - Thanos dan Mimir untuk penyimpanan jangka panjang dan federasi query
- **OpenTelemetry**
  - Metrik, trace, dan log: tiga pilar dan protokol OTLP
  - OpenTelemetry Collector: pipeline, processor, dan exporter
  - Korelasi: penggabungan trace-ke-metrik dan trace-ke-log
- **Sinyal spesifik Kubernetes**
  - kube-state-metrics, node exporter, dan dashboard control plane
  - cAdvisor dan metrik container: apa yang terlewat pada skala besar
  - Observabilitas eBPF: Hubble, Pixie, dan visibilitas tingkat kernel
- **Rekayasa SLO**
  - SLI, SLO, dan error budget untuk layanan platform
  - Alerting multi-window multi-burn-rate dan dashboard SLO (Pyroscope/Grafana)
  - Peramalan kapasitas dan deteksi regresi performa
- **Lab Praktik**: Dirikan pipeline OpenTelemetry Collector, definisikan SLO dengan alert burn-rate, korelasikan trace ke query lambat, dan bangun dashboard platform dengan kube-state-metrics dan metrik kustom

### Modul 11: Chaos Engineering dan Keandalan (Minggu 11)

- **Prinsip chaos engineering**
  - Hipotesis steady-state, blast radius, dan metode ilmiah untuk insiden
  - Game day dan eksperimentasi di produksi vs. staging
- **Perkakas chaos**
  - Litmus: eksperimen chaos, probe, dan alur kerja hasil
  - Chaos Mesh: tipe fault (pod kill, network partition, clock skew, disk fill)
  - Litmus vs. Chaos Mesh: kekuatan masing-masing platform
- **Injeksi kegagalan di lapisan platform**
  - Badai penghapusan pod, kegagalan drain node, dan throttling API server
  - Kehilangan kuorum etcd dan injeksi latensi jaringan
  - Chaos workload stateful: volume detach dan snapshot restore
- **Runbook keandalan**
  - Mengubah hasil chaos menjadi runbook dan perbaikan arsitektur
  - PodDisruptionBudgets, topology spread, dan anti-affinity sebagai mitigasi chaos
- **Lab Praktik**: Jalankan eksperimen pod-kill, injeksi latensi 100 ms dengan Chaos Mesh, jalankan latihan kehilangan kuorum etcd, dan dokumentasikan pengamatan dalam runbook pasca-insiden

### Modul 12: Keamanan Rantai Pasok, Penyetelan Performa, dan Proyek Puncak Platform (Minggu 12)

- **Keamanan rantai pasok perangkat lunak**
  - Sigstore/cosign: penandatanganan image, keyless signing, dan attestation berbasis identitas
  - Provenance SLSA dan pembuatan SBOM (syft) untuk setiap artefak
  - Verifikasi saat admission: memverifikasi tanda tangan cosign dengan kebijakan Kyverno
  - Pemindaian image (Trivy) dan triase kerentanan di pipeline pengiriman
- **Penyetelan performa control plane**
  - API server: audit policy, ukuran cache, dan konkurensi request
  - etcd: defragmentasi, kompaksi, dan penyetelan penyimpanan
  - Penyetelan node: CPU manager, hugepages, dan penjadwalan sadar-NUMA untuk workload sensitif latensi
- **Optimasi kapasitas dan biaya**
  - Right-sizing dengan rekomendasi VPA, strategi instance spot/fleksibel
  - Visibilitas biaya dengan Kubecost dan chargeback per namespace
  - Bin packing vs. penyebaran: menemukan keseimbangan biaya/keandalan
- **Proyek Puncak: Bangun Internal Developer Platform**
  - Rancang platform multi-tenant: namespace, kuota, kebijakan, dan pengiriman GitOps
  - Onboarding layanan mandiri dengan Backstage dan software templates
  - Tegakkan penandatanganan image, SBOM, dan gerbang kebijakan di pipeline pengiriman
  - Autoscaling, dashboard SLO, skenario kegagalan yang diuji chaos, dan rencana DR
- **Lab Praktik**: Tandatangani dan verifikasi image dengan cosign, tegakkan verifikasi tanda tangan saat admission, setel audit policy API server, right-sizing workload dengan VPA, dan presentasikan desain platform lengkap

## Proyek Akhir

**Proyek**: Merancang, membangun, dan mengoperasikan internal developer platform (IDP) kelas produksi di Kubernetes.

**Persyaratan**:
1. Cluster multi-tenant dengan namespace, ResourceQuotas, priority class, dan NetworkPolicies per tenant.
2. Pengiriman GitOps dengan ArgoCD, termasuk ApplicationSets yang menargetkan setidaknya dua lingkungan.
3. Operator kustom (dibangun di Modul 3) yang menyediakan stack aplikasi dari sebuah CRD.
4. Policy as code yang ditegakkan saat admission (Kyverno) dan di CI (conftest).
5. Penandatanganan image dengan cosign dan verifikasi tanda tangan saat admission.
6. Autoscaling tingkat lanjut dengan HPA plus metrik kustom, rekomendasi VPA, dan KEDA untuk setidaknya satu workload berbasis peristiwa.
7. Definisi SLO dengan alert burn-rate dan dashboard Grafana yang menampilkan error budget.
8. Laporan eksperimen chaos (Litmus atau Chaos Mesh) yang membuktikan platform bertahan dari kegagalan pod dan node.
9. Runbook pemulihan bencana termasuk prosedur backup/restore etcd.
10. Dokumentasi onboarding layanan mandiri atau template Backstage untuk tenant baru.

**Deliverable**:
- Repositori Git berisi manifest cluster, Helm chart, dan kode sumber operator.
- Dokumentasi arsitektur yang mencakup tenancy, jaringan, dan topologi multi-lingkungan.
- Tangkapan layar dashboard yang menampilkan SLO, perilaku autoscaling, dan alokasi biaya.
- Laporan singkat tentang eksperimen chaos dan perubahan keandalan yang dipicunya.

## Kriteria Penilaian

- **Lab Praktik (40%)**: Latihan praktik mingguan yang menunjukkan kemampuan scheduler, admission, operator, dan autoscaling.
- **Tinjauan Arsitektur (20%)**: Dokumen desain yang ditinjau rekan untuk multi-tenancy, multi-cluster, dan keamanan platform.
- **Laporan Chaos dan SLO (10%)**: Kualitas desain eksperimen, hipotesis steady-state, dan hasil runbook.
- **Proyek Akhir (30%)**: Evaluasi berdasarkan kualitas arsitektur platform, kelengkapan otomasi, penegakan keamanan, dan kejelasan dokumentasi.

## Referensi

- [Dokumentasi Resmi Kubernetes](https://kubernetes.io/docs/)
- [Scheduler dan Kerangka Kerja Penjadwalan Kubernetes](https://kubernetes.io/docs/concepts/scheduling-eviction/)
- [Admission Controllers Kubernetes](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)
- [kubebuilder dan controller-runtime](https://book.kubebuilder.io/)
- [Dokumentasi Operator SDK](https://sdk.operatorframework.io/)
- [Dokumentasi KEDA](https://keda.sh/docs/)
- [Dokumentasi Gateway API](https://gateway-api.sigs.k8s.io/)
- [Dokumentasi Istio](https://istio.io/latest/docs/)
- [Dokumentasi Linkerd](https://linkerd.io/2.15/overview/)
- [Dokumentasi Cilium dan eBPF](https://docs.cilium.io/)
- [Buku Cluster API](https://cluster-api.sigs.k8s.io/)
- [Dokumentasi ArgoCD](https://argo-cd.readthedocs.io/)
- [Dokumentasi OpenTelemetry](https://opentelemetry.io/docs/)
- [Dokumentasi Litmus Chaos](https://litmuschaos.io/docs/)
- [Dokumentasi Chaos Mesh](https://chaos-mesh.org/docs/)
- [Sigstore dan cosign](https://docs.sigstore.dev/)
- [Kerangka Kerja SLSA](https://slsa.dev/)
- [Dokumentasi Backstage](https://backstage.io/docs/)

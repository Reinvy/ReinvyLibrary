---
title: "Panduan Praktik Terbaik Produksi Kubernetes"
description: "Panduan praktis yang mencakup praktik terbaik produksi Kubernetes termasuk strategi namespace, manajemen sumber daya, pod anti-affinity, PDB, HPA dengan metrik kustom, cluster autoscaling, security context, Pod Security Standards, network policy, service mesh, GitOps, backup dengan Velero, upgrade cluster, observabilitas, optimasi biaya, dan manajemen multi-cluster."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Praktik Terbaik Produksi Kubernetes

## Pendahuluan

Menjalankan Kubernetes di produksi membutuhkan lebih dari sekadar mengetahui cara menyebarkan Pod. Panduan ini mencakup praktik terbaik yang sudah teruji untuk mengoperasikan cluster Kubernetes dalam skala besar — mencakup segala hal mulai dari desain namespace dan manajemen sumber daya hingga keamanan, observabilitas, otomatisasi GitOps, optimasi biaya, dan strategi multi-cluster. Baik Anda sedang bermigrasi dari pengembangan ke produksi atau mengoptimalkan cluster yang sudah ada, praktik-praktik ini akan membantu Anda membangun platform yang tangguh, aman, dan hemat biaya.

## Praktik Terbaik

### Strategi Namespace

- **Multi-Tenancy melalui Namespace**: Gunakan namespace untuk mengisolasi lingkungan (dev, staging, prod), tim, atau domain aplikasi. Terapkan ResourceQuota dan LimitRange per namespace untuk mencegah penyalahgunaan sumber daya.
- **Konvensi Penamaan**: Adopsi skema penamaan yang konsisten seperti `<tim>-<lingkungan>-<aplikasi>` (misalnya, `platform-prod-nginx`).
- **Network Policy Default**: Terapkan kebijakan jaringan `deny-all` default di setiap namespace dan hanya izinkan lalu lintas ingress/egress yang diperlukan.

### Permintaan dan Batas Sumber Daya

- **Selalu Atur Requests dan Limits**: Setiap kontainer harus menentukan permintaan dan batas CPU dan memori. Ini mencegah masalah noisy-neighbor dan membantu scheduler membuat keputusan penempatan yang tepat.
- **Gunakan LimitRange**: Terapkan batasan sumber daya minimum dan maksimum per namespace untuk mencegah kontainer yang tidak terkendali.
- **Vertical Pod Autoscaler (VPA)**: Gunakan VPA dalam mode rekomendasi untuk menganalisis penggunaan historis dan menyarankan nilai permintaan optimal. Terapkan rekomendasi selama jendela pemeliharaan.
- **Kelas Quality of Service (QoS)**: Pahami Guaranteed (requests == limits), Burstable (requests < limits), dan BestEffort (tanpa requests/limits). Pilih Guaranteed atau Burstable untuk beban kerja produksi.

### Pod Anti-Affinity

- **Aturan Pod Anti-Affinity**: Sebarkan Pod di seluruh node dan zona ketersediaan untuk menghindari titik kegagalan tunggal:
  ```yaml
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: app
              operator: In
              values:
              - my-app
          topologyKey: topology.kubernetes.io/zone
  ```
- **Pod Topology Spread Constraints**: Gunakan `topologySpreadConstraints` untuk memastikan distribusi Pod yang merata di seluruh zona, region, atau node.

### Pod Disruption Budget (PDB)

- **Tentukan PDB untuk Beban Kerja Kritis**: Pastikan gangguan sukarela (drain node, upgrade cluster) tidak menyebabkan waktu henti aplikasi:
  ```yaml
  apiVersion: policy/v1
  kind: PodDisruptionBudget
  metadata:
    name: my-app-pdb
  spec:
    minAvailable: 2
    selector:
      matchLabels:
        app: my-app
  ```
- Gunakan `minAvailable` (jumlah absolut atau persentase) atau `maxUnavailable` tergantung pada kebutuhan ketersediaan Anda.

### Horizontal Autoscaling dengan Metrik Kustom

- **HPA v2 dengan Metrik Kustom**: Perluas HPA di luar CPU/memori dengan menggunakan metrik kustom dari Prometheus atau sumber eksternal:
  ```yaml
  apiVersion: autoscaling/v2
  kind: HorizontalPodAutoscaler
  metadata:
    name: my-app-hpa
  spec:
    scaleTargetRef:
      apiVersion: apps/v1
      kind: Deployment
      name: my-app
    minReplicas: 3
    maxReplicas: 50
    metrics:
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: 100
    - type: Object
      object:
        metric:
          name: istio_requests_total
        describedObject:
          apiVersion: networking.istio.io/v1beta1
          kind: VirtualService
          name: my-app
        target:
          type: Value
          value: "1000"
  ```
- **Kebijakan Skalasi**: Konfigurasikan jendela stabilisasi, tingkat skala-naik/turun, dan periode cooldown untuk menghindari fluktuasi.

### Cluster Autoscaling

- **Cluster Autoscaler**: Secara otomatis menyesuaikan jumlah node dalam grup node ketika Pod gagal dijadwalkan karena keterbatasan sumber daya atau ketika node kurang dimanfaatkan.
- **Karpenter** (AWS): Alat penyediaan node generasi berikutnya yang bereaksi cepat terhadap Pod yang tidak dapat dijadwalkan, mendukung berbagai tipe instance, dan menggabungkan node untuk penghematan biaya.
- **Praktik Terbaik**:
  - Gunakan beragam keluarga instance untuk meningkatkan ketersediaan dan mengurangi biaya.
  - Konfigurasikan anotasi `cluster-autoscaler.kubernetes.io/safe-to-evict: "true"` pada Pod DaemonSet.
  - Atur flag `--scale-down-delay-after-add` dan `--max-node-provision-time` yang sesuai.

### Security Context dan Pod Security Standards

- **Security Context**: Konfigurasikan ID pengguna/grup, kapabilitas, SELinux, seccomp, dan sistem file root hanya-baca per Pod atau kontainer:
  ```yaml
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
    runAsNonRoot: true
    readOnlyRootFilesystem: true
    capabilities:
      drop: ["ALL"]
    seccompProfile:
      type: RuntimeDefault
  ```
- **Pod Security Standards**: Kubernetes mendefinisikan tiga standar:
  - **Privileged**: Tanpa batasan (untuk komponen tingkat sistem).
  - **Baseline**: Minimal restriktif (mencegah eskalasi hak istimewa yang diketahui).
  - **Restricted**: Sangat terbatas (mengikuti praktik terbaik hardening Pod).
- **Pod Security Admission (PSA)**: Gunakan PSA untuk menegakkan standar di tingkat namespace melalui label:
  ```bash
  kubectl label ns my-app pod-security.kubernetes.io/enforce=restricted
  kubectl label ns my-app pod-security.kubernetes.io/warn=restricted
  ```
- **OPA/Gatekeeper atau Kyverno**: Untuk penegakan kebijakan tingkat lanjut di luar PSA (mutating webhook, batasan kustom).

### Network Policy

- **Jaringan Zero-Trust**: Default deny ingress/egress dan secara eksplisit izinkan lalu lintas yang diperlukan:
  ```yaml
  apiVersion: networking.k8s.io/v1
  kind: NetworkPolicy
  metadata:
    name: default-deny-all
  spec:
    podSelector: {}
    policyTypes:
    - Ingress
    - Egress
  ---
  apiVersion: networking.k8s.io/v1
  kind: NetworkPolicy
  metadata:
    name: allow-frontend-to-api
  spec:
    podSelector:
      matchLabels:
        app: api
    ingress:
    - from:
      - podSelector:
          matchLabels:
            app: frontend
      ports:
      - port: 8080
    egress:
    - to:
      - podSelector:
          matchLabels:
            app: database
      ports:
      - port: 5432
  ```
- Gunakan **Cilium Network Policy** untuk kebijakan L7 HTTP/gRPC-aware dan Hubble untuk observabilitas.

### Service Mesh

- **Istio**: Service mesh fitur lengkap dengan mTLS, pembagian lalu lintas, circuit breaking, injeksi kegagalan, dan observabilitas mendalam (metrik, trace, log akses).
- **Linkerd**: Service mesh ringan dan sangat cepat dengan mTLS otomatis, percobaan ulang, batas waktu, dan metrik emas (tingkat keberhasilan, latensi, tingkat permintaan).

Keduanya (Istio dan Linkerd) terintegrasi mulus dengan Prometheus, Grafana, dan OpenTelemetry.

### GitOps dengan ArgoCD/Flux

- **Prinsip GitOps**:
  1. Konfigurasi deklaratif disimpan di Git sebagai sumber kebenaran tunggal.
  2. Rekonsiliasi otomatis — state cluster terus disinkronkan untuk mencocokkan repositori.
  3. Deployment berbasis pull (agen di cluster menarik perubahan).
- **ArgoCD**: UI web, integrasi SSO, sync wave, perilaku prune, ApplicationSet untuk manajemen multi-cluster.
- **Flux**: Multi-tenancy, dukungan artefak kompatibel OCI, otomatisasi pembaruan gambar (ImageUpdateAutomation), manajemen dependensi melalui depends-on.
- **Manajemen Rahasia**: Gunakan Sealed Secrets, External Secrets Operator, atau SOPS dengan age/PGP untuk menyimpan rahasia terenkripsi dengan aman di Git.

### Backup dengan Velero

- **Velero**: Alat sumber terbuka untuk mencadangkan dan memulihkan sumber daya cluster Kubernetes dan volume persisten.
  ```bash
  # Instal Velero
  velero install \
    --provider aws \
    --bucket kubernetes-backups \
    --backup-location-config region=us-west-2 \
    --snapshot-location-config region=us-west-2 \
    --plugins velero/velero-plugin-for-aws:v1.7.0

  # Buat backup
  velero backup create daily-backup --include-namespaces prod --ttl 720h

  # Jadwalkan backup berulang
  velero schedule create daily --schedule="0 2 * * *" --include-namespaces prod --ttl 168h

  # Pulihkan dari backup
  velero restore create --from-backup daily-backup

  # Pulihkan sumber daya tertentu
  velero restore create --from-backup daily-backup --include-resources deployments,configmaps
  ```

### Strategi Upgrade Cluster

- **Ikuti Panduan Upgrade Resmi**: Selalu konsultasi [kebijakan version skew Kubernetes](https://kubernetes.io/releases/version-skew-policy/) sebelum melakukan upgrade.
- **Urutan Upgrade**:
  1. Upgrade alat kubeadm (`kubeadm upgrade plan`, `kubeadm upgrade apply`).
  2. Upgrade node control plane satu per satu.
  3. Upgrade node worker dalam batch (menggunakan node pool atau rolling node group).
- **Pemeriksaan Pra-Upgrade**:
  - Verifikasi kesehatan etcd dan buat snapshot etcd.
  - Jalankan `kubectl get nodes` untuk memastikan semua node Ready.
  - Tinjau penghapusan API yang tidak digunakan lagi (melalui `kubectl convert` atau `kube-no-trouble`).
- **Pasca-Upgrade**:
  - Perbarui kubelet di semua node.
  - Perbarui CoreDNS, plugin CNI, dan add-on cluster lainnya.
  - Jalankan rangkaian uji asap (smoke test) untuk memvalidasi fungsionalitas aplikasi.

### Tumpukan Observabilitas

- **Prometheus**: Kumpulkan metrik, tentukan aturan alerting (PromQL), dan simpan data time-series.
- **Grafana**: Buat dashboard untuk kesehatan cluster, performa aplikasi, dan KPI bisnis.
- **Loki**: Sistem agregasi log dengan Promtail atau Fluent Bit untuk mengirimkan log. Kueri log dengan LogQL.
- **Tempo**: Backend distributed tracing untuk pelacakan permintaan di seluruh microservice. Gunakan OpenTelemetry SDK untuk menginstrumentasi aplikasi dan mengekspor trace.
- **OpenTelemetry Collector**: Agen netral-vendor untuk menerima, memproses, dan mengekspor data telemetri (metrik, log, trace) ke backend mana pun.
- **Dashboard yang Direkomendasikan**:
  - Dashboard Node Exporter (kesehatan cluster).
  - Dashboard Kubelet / Kubernetes API Server.
  - Dashboard RED metrik aplikasi (Rate, Errors, Duration).

### Optimasi Biaya

- **Kubecost**: Visibilitas real-time ke pengeluaran Kubernetes, alokasi biaya berdasarkan namespace, tim, atau label, dan rekomendasi penghematan.
- **Right-Sizing**:
  - Analisis penggunaan sumber daya historis dan sesuaikan requests/limits.
  - Gunakan rekomendasi VPA untuk menyesuaikan ukuran kontainer.
  - Identifikasi dan hapus sumber daya yang tidak digunakan (PVC yatim piatu, LoadBalancer menganggur).
- **Instance Spot/Preemptible**: Gunakan instance spot untuk beban kerja stateless yang toleran terhadap kegagalan. Konfigurasikan PDB, afinitas node, dan jadwal ekspansi cluster autoscaler.
- **Penegakan Kuota Sumber Daya**: Tetapkan ResourceQuota per namespace untuk membatasi agregat CPU, memori, dan penggunaan penyimpanan.

### Manajemen Multi-Cluster

- **Federation v2 (KubeFed)**: Distribusikan beban kerja ke beberapa cluster untuk geo-redundansi dan pemulihan bencana.
- **Cluster API**: API deklaratif untuk menyediakan, meningkatkan, dan mengoperasikan beberapa cluster Kubernetes menggunakan API bergaya Kubernetes.
- **Monitoring Terpusat**: Agregasikan metrik dari semua cluster ke dalam satu instance Thanos atau Cortex.
- **Jaringan Lintas-Cluster**: Gunakan Cilium ClusterMesh atau Submariner untuk komunikasi pod-ke-pod yang aman antar cluster.
- **GitOps untuk Multi-Cluster**: Gunakan ArgoCD ApplicationSet untuk menyebarkan aplikasi yang sama ke beberapa cluster dari satu repositori Git.

## Langkah Implementasi

### Langkah 1: Audit Cluster Saat Ini

1. Jalankan `kubectl get all -A` untuk menginventarisasi semua sumber daya.
2. Periksa pemanfaatan sumber daya dengan `kubectl top pods --all-namespaces` dan `kubectl top nodes`.
3. Tinjau binding RBAC dan service account yang ada.
4. Periksa network policy dengan `kubectl get networkpolicies -A`.
5. Identifikasi beban kerja yang tidak memiliki requests/limits menggunakan `kubectl describe nodes` dan `kubectl describe pods`.

### Langkah 2: Terapkan Isolasi Namespace

1. Tentukan hierarki namespace: `platform-prod`, `platform-staging`, `team-data-prod`.
2. Terapkan ResourceQuota per namespace:
   ```yaml
   apiVersion: v1
   kind: ResourceQuota
   metadata:
     name: prod-quota
     namespace: platform-prod
   spec:
     hard:
       requests.cpu: 40
       requests.memory: 80Gi
       limits.cpu: 80
       limits.memory: 160Gi
       persistentvolumeclaims: 20
       pods: 100
   ```
3. Terapkan LimitRange untuk batasan sumber daya default.
4. Beri label namespace dengan tingkat Pod Security Standard.

### Langkah 3: Amankan Cluster

1. Aktifkan penegakan Pod Security Admission (PSA).
2. Terapkan NetworkPolicy default deny di semua namespace.
3. Konfigurasikan RBAC dengan service account hak akses minimal.
4. Aktifkan audit logging untuk menangkap permintaan API.
5. Implementasikan OPA/Gatekeeper atau Kyverno untuk penegakan kebijakan tingkat lanjut.
6. Nonaktifkan akses anonim dan aktifkan autentikasi OIDC.

### Langkah 4: Siapkan Observabilitas

1. Instal kube-prometheus-stack melalui Helm untuk monitoring dasar.
2. Konfigurasikan ServiceMonitor dan PodMonitor untuk semua beban kerja produksi.
3. Siapkan Loki + Grafana untuk agregasi log.
4. Sebarkan Tempo untuk distributed tracing.
5. Buat aturan alerting di Prometheus untuk kondisi kritis (PodCrashLooping, PersistentVolumeUsageCritical, dll.).
6. Bangun dashboard Grafana untuk sinyal emas SRE (latensi, lalu lintas, kesalahan, saturasi).

### Langkah 5: Implementasikan GitOps

1. Pilih ArgoCD atau Flux berdasarkan preferensi dan kebutuhan tim.
2. Struktur repositori Git: satu per aplikasi atau monorepo dengan folder per aplikasi.
3. Buat manifest aplikasi atau Helm chart.
4. Bootstrap agen GitOps ke dalam cluster.
5. Konfigurasikan kebijakan sinkronisasi otomatis (auto-prune, self-heal).
6. Siapkan otomatisasi pembaruan gambar untuk deployment berkelanjutan.

### Langkah 6: Konfigurasikan Autoscaling

1. Sebarkan metrics-server atau Prometheus Adapter.
2. Tentukan sumber daya HPA v2 untuk semua beban kerja stateless dengan metrik kustom.
3. Instal dan konfigurasikan Cluster Autoscaler atau Karpenter.
4. Siapkan VPA dalam mode rekomendasi untuk optimasi berkelanjutan.
5. Buat PDB untuk semua beban kerja kritis.

### Langkah 7: Implementasikan Backup dan Pemulihan Bencana

1. Instal Velero dengan backend penyimpanan cloud.
2. Buat backup terjadwal untuk semua namespace.
3. Uji prosedur pemulihan secara teratur (latihan pemulihan bencana triwulanan).
4. Dokumentasikan runbook pemulihan dengan petunjuk langkah demi langkah.

### Langkah 8: Optimalkan Biaya

1. Instal Kubecost atau OpenCost untuk visibilitas.
2. Identifikasi namespace dan beban kerja dengan pengeluaran tertinggi.
3. Sesuaikan ukuran sumber daya kontainer berdasarkan data historis 30 hari.
4. Evaluasi adopsi instance spot/preemptible untuk beban kerja yang sesuai.
5. Hapus sumber daya yang tidak digunakan (sumber daya yatim piatu, service menganggur).

### Langkah 9: Rencanakan Upgrade Cluster

1. Berlangganan pengumuman rilis Kubernetes dan ikuti jadwal EOL.
2. Pertahankan cluster pengujian yang mencerminkan produksi untuk validasi upgrade.
3. Jadwalkan jendela upgrade selama periode lalu lintas rendah.
4. Dokumentasikan prosedur rollback untuk setiap upgrade.
5. Jalankan `kubeadm upgrade plan` dan `kubectl convert` untuk memeriksa depresiasi API sebelum melakukan upgrade.

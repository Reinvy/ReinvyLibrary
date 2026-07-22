---
title: "GitOps dengan ArgoCD di Kubernetes"
description: "Tutorial praktis tentang implementasi workflow GitOps dengan ArgoCD di Kubernetes — mencakup instalasi, deployment aplikasi, strategi sinkronisasi, manajemen rahasia, deployment multi-environment dengan ApplicationSets, dan troubleshooting operasional."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# GitOps dengan ArgoCD di Kubernetes

## Ringkasan

Tutorial ini memperkenalkan GitOps sebagai kerangka kerja operasional untuk Kubernetes dan memandu implementasinya menggunakan ArgoCD. Anda akan menginstal ArgoCD di klaster Kubernetes, mendefinisikan aplikasi secara deklaratif di Git, mengonfigurasi kebijakan sinkronisasi untuk pengiriman otomatis, mengelola rahasia secara aman, menangani deployment multi-environment dengan ApplicationSets, dan mempelajari pola troubleshooting untuk operasi sehari-hari.

## Target Audiens

- DevOps Engineer, Platform Engineer, Site Reliability Engineer (SRE), dan praktisi Kubernetes.
- Ekspektasi tingkat kemampuan: Mahir (nyaman dengan kubectl, YAML manifest, dan tipe resource dasar Kubernetes).

## Prasyarat

- Sebuah klaster Kubernetes (lokal: Kind atau Minikube dengan RAM 4+ GB, atau remote: distribusi K8s apa pun).
- kubectl terinstal dan dikonfigurasi dengan akses admin klaster.
- Akun GitHub (atau GitLab/Bitbucket) dengan repositori pribadi untuk menyimpan manifest.
- Pemahaman dasar tentang Deployment, Service, Namespace, dan ConfigMap di Kubernetes.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan empat prinsip GitOps dan bagaimana ArgoCD mengimplementasikannya.
- Menginstal dan mengonfigurasi ArgoCD di klaster Kubernetes.
- Mendefinisikan resource Application ArgoCD yang disinkronkan dari repositori Git.
- Menerapkan kebijakan sinkronisasi otomatis, manual, dan self-heal.
- Mengelola rahasia Kubernetes dalam workflow GitOps menggunakan Sealed Secrets.
- Melakukan deployment aplikasi di beberapa environment dengan ApplicationSets.
- Mendiagnosis dan menyelesaikan kegagalan sinkronisasi dan masalah drift.

## Konteks dan Motivasi

Deployment berbasis push (menerapkan manifest dengan kubectl, Helm, atau pipeline CI/CD) memiliki kelemahan mendasar: status klaster dapat menyimpang dari konfigurasi yang sudah dikomit ketika seseorang menjalankan perintah ad-hoc, menerapkan hotfix, atau menggunakan alat yang berbeda antar environment. GitOps mengatasi hal ini dengan menjadikan repositori Git sebagai sumber kebenaran tunggal untuk status klaster dan menggunakan operator di dalam klaster untuk merekonsiliasi drift secara otomatis.

ArgoCD adalah operator GitOps yang paling banyak diadopsi untuk Kubernetes, didukung oleh CNCF. ArgoCD menyediakan antarmuka web, CLI, berbagai strategi sinkronisasi, dan integrasi mendalam dengan Helm, Kustomize, dan YAML biasa. Mengadopsi GitOps dengan ArgoCD memberikan tim pipeline deployment yang aman, dapat diaudit, dan terotomatisasi yang selaras dengan praktik terbaik infrastruktur-sebagai-kode.

## Konten Inti

### Memahami Prinsip GitOps

GitOps memiliki empat prinsip inti yang memandu setiap implementasi:

1. **Deskripsi Deklaratif**: Seluruh sistem dideskripsikan secara deklaratif — setiap Deployment, Service, ConfigMap, dan Ingress ada sebagai file di repositori Git.
2. **Terversi dan Immutable**: Riwayat Git menyediakan jejak audit yang lengkap. Setiap perubahan dilacak, ditinjau melalui pull request, dan dapat dikembalikan.
3. **Ditarik Secara Otomatis**: Operator di dalam klaster secara terus-menerus membandingkan status langsung dengan repositori Git dan menarik perubahan secara otomatis.
4. **Rekonsiliasi Berkelanjutan**: Operator memperbaiki setiap penyimpangan antara status yang diinginkan (di Git) dan status langsung (di klaster). Jika seseorang mengedit Deployment dengan `kubectl edit`, operator akan mengembalikannya agar sesuai dengan repositori.

ArgoCD mengimplementasikan prinsip-prinsip ini melalui loop rekonsiliasi. Pada interval yang dapat dikonfigurasi (default 3 menit), ArgoCD melakukan polling ke repositori Git, membandingkan status yang diinginkan dengan status klaster, dan menerapkan koreksi berdasarkan kebijakan sinkronisasi yang dikonfigurasi.

### Menginstal ArgoCD di Kubernetes

ArgoCD terdiri dari beberapa komponen: server API, application controller, repo server, dan (opsional) cache Redis serta sidecar Dex/SSO. Instalasi paling sederhana menggunakan manifest resmi:

```bash
# Buat namespace
kubectl create namespace argocd

# Terapkan manifest rilis stabil terbaru
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Setelah semua pod berjalan, ekspos server API untuk mengakses antarmuka web:

```bash
# Port-forward (untuk pengembangan / klaster lokal)
kubectl port-forward -n argocd svc/argocd-server 8080:443

# ATAU buat LoadBalancer / Ingress untuk akses produksi
# kubectl patch svc argocd-server -n argocd -p \
#   '{"spec": {"type": "LoadBalancer"}}'
```

Ambil kata sandi admin awal:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

Login melalui CLI:

```bash
argocd login localhost:8080 --insecure
# Username: admin
# Password: <nilai yang diambil>

# Ubah kata sandi setelah login pertama
argocd account update-password
```

### Menghubungkan Repositori Git

ArgoCD membutuhkan akses ke repositori Git Anda. Untuk repositori privat, daftarkan kredensial melalui UI (Settings > Repositories > Connect Repo) atau CLI:

```bash
argocd repo add https://github.com/organisasi-anda/gitops-manifests.git \
  --username nama-pengguna-anda \
  --password token-atau-kata-sandi-anda
```

Untuk repositori publik, tidak diperlukan kredensial — ArgoCD dapat menarik konfigurasi tanpa autentikasi.

### Mendeklarasikan Aplikasi Pertama

Resource Application ArgoCD memetakan direktori Git (path + revisi) ke Namespace klaster. Buat repositori dengan struktur ini:

```text
gitops-manifests/
├── environments/
│   ├── staging/
│   │   ├── namespace.yaml
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── production/
│       ├── namespace.yaml
│       ├── deployment.yaml
│       └── service.yaml
└── README.md
```

Definisikan manifest Application dalam file bernama `app-staging.yaml` (baik dikomit ke repositori yang sama atau diterapkan secara imperatif):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-staging
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/organisasi-anda/gitops-manifests.git
    targetRevision: main
    path: environments/staging
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Terapkan untuk mendaftarkan aplikasi ke ArgoCD:

```bash
kubectl apply -f app-staging.yaml
```

ArgoCD segera mendeteksi resource Application baru, membaca repositori Git, dan men-deploy manifest ke klaster. Mulai saat ini, setiap perubahan yang didorong ke direktori `environments/staging` pada branch `main` akan memicu rekonsiliasi.

### Strategi dan Kebijakan Sinkronisasi

ArgoCD menawarkan beberapa mode sinkronisasi yang mengontrol bagaimana dan kapan perubahan menyebar:

**Sinkronisasi Manual**: Perubahan ditarik dari Git tetapi tidak diterapkan sampai seseorang mengklik "Sync" di UI atau menjalankan `argocd app sync my-app-staging`. Terbaik untuk environment produksi di mana setiap perubahan membutuhkan persetujuan eksplisit.

**Sinkronisasi Otomatis dengan Prune**: ArgoCD melakukan polling ke repositori pada interval yang dikonfigurasi dan menerapkan perubahan secara otomatis. Flag `prune: true` memberitahu ArgoCD untuk menghapus resource yang ada di klaster tetapi tidak ada di Git — tanpa pruning, manifest yang dihapus akan meninggalkan resource yatim piatu.

**Sinkronisasi Otomatis dengan Self-Heal**: Ketika `selfHeal: true` diaktifkan, ArgoCD mengembalikan setiap perubahan manual yang dilakukan pada klaster. Jika seseorang menjalankan `kubectl edit deployment my-app` untuk mengubah jumlah replika, ArgoCD mendeteksi penyimpangan dan mengembalikannya ke nilai yang ditentukan di Git.

**Sync Waves dan Phases**: Aplikasi kompleks dengan dependensi (ConfigMap harus ada sebelum Deployment yang mengkonsumsinya) menggunakan sync waves:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

Resource dengan nomor wave yang lebih rendah disinkronkan terlebih dahulu. Wave 0–2 biasanya menangani infrastruktur (namespace, rahasia), 3–4 menangani middleware (database, message queue), dan 5+ menangani aplikasi.

### Mengelola Rahasia dalam GitOps

Mengomits rahasia dalam bentuk teks biasa ke Git melanggar praktik terbaik keamanan. ArgoCD mendukung beberapa pendekatan untuk manajemen rahasia:

**Sealed Secrets** (Bitnami): Mengenkripsi Secret menjadi resource SealedSecret yang dapat dikomit dengan aman. Hanya controller di klaster yang dapat mendekripsinya.

```bash
# Instal Sealed Secrets controller
kubectl apply -f \
  https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Enkripsi secret
kubeseal --format=yaml < secret.yaml > sealed-secret.yaml
```

`sealed-secret.yaml` dapat dikomit ke Git dengan aman:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: api-credentials
  namespace: my-app-staging
spec:
  encryptedData:
    API_KEY: AgBy2i1...data-terenkripsi-base64...
```

**External Secrets Operator**: Mengambil rahasia dari penyedia eksternal (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault) dan membuat Kubernetes Secret secara otomatis:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-credentials
  namespace: my-app-staging
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: api-credentials
  data:
    - secretKey: API_KEY
      remoteRef:
        key: /production/api/credentials
        property: api-key
```

**SOPS + age/GPG**: Enkripsi nilai individual dalam file YAML. ArgoCD memiliki dukungan native untuk manifest yang didekripsi SOPS melalui repo server.

### Deployment Multi-Environment dengan ApplicationSets

Mengelola satu Application per environment menjadi repetitif ketika Anda memiliki staging, production, dan beberapa klaster regional. ApplicationSets menghasilkan Application secara dinamis dari sebuah template, diparameterisasi oleh generator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: staging
            server: https://kubernetes.default.svc
            namespace: my-app-staging
          - env: production
            server: https://kubernetes.default.svc
            namespace: my-app-production
  template:
    metadata:
      name: 'my-app-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/organisasi-anda/gitops-manifests.git
        targetRevision: main
        path: 'environments/{{env}}'
      destination:
        server: '{{server}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

Generator juga dapat menarik dari direktori Git (satu aplikasi per subdirektori), penyedia SCM (satu aplikasi per repositori), atau bahkan generator Pull Request untuk environment pratinjau:

```yaml
generators:
  - pullRequest:
      github:
        owner: organisasi-anda
        repo: gitops-manifests
      requeueAfterSeconds: 300
```

Setiap PR yang terbuka memicu Application sementara dengan environment pratinjau, yang secara otomatis dihancurkan ketika PR digabungkan atau ditutup.

### Monitoring dan Troubleshooting

ArgoCD menyediakan berbagai cara untuk memantau status sinkronisasi dan mendiagnosis kegagalan:

**Antarmuka Web**: Dasbor Applications menampilkan status kesehatan (Healthy, Degraded, Progressing, Missing, Suspended) dan status sinkronisasi (Synced, OutOfSync, Syncing). Setiap resource di dalam Application dapat diperluas untuk menunjukkan kondisi dan event terperinci.

**Perintah CLI**:

```bash
# Daftar semua aplikasi dan status sinkronisasinya
argocd app list

# Dapatkan status terperinci untuk aplikasi tertentu
argocd app get my-app-staging

# Lihat event sinkronisasi dan perbedaan resource
argocd app diff my-app-staging

# Picu sinkronisasi manual dengan revisi tertentu
argocd app sync my-app-staging --revision main
```

**Kegagalan Sinkronisasi Umum**:

- **OutOfSync tanpa perubahan**: ArgoCD memiliki perilaku di mana resource dengan bidang default (seperti `containerPort` atau `protocol`) muncul sebagai menyimpang. Gunakan `spec.ignoreDifferences` untuk mengecualikan bidang default yang diketahui:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

- **Sinkronisasi gagal dengan `context deadline exceeded`**: Server repositori tidak dapat mencapai penyedia Git. Periksa kebijakan jaringan, aturan firewall, dan log pod server repositori: `kubectl logs -n argocd deploy/argocd-repo-server`.

- **Resource sudah ada di Application lain**: ArgoCD memastikan setiap resource dikelola oleh tepat satu Application. Gunakan `argocd app list` dan periksa bidang `status.resources` untuk menemukan Application mana yang memiliki resource yang bertentangan.

- **Kegagalan dekripsi SealedSecret**: SealedSecret dienkripsi dengan kunci klaster yang berbeda. SealedSecret bersifat spesifik-klaster; gunakan `--scope cluster-wide` atau enkripsi ulang untuk klaster target.

**Integrasi Webhook**: Untuk sinkronisasi hampir instan (alih-alih menunggu interval polling 3 menit), konfigurasikan webhook di penyedia Git Anda:

```bash
# URL payload webhook GitHub
# https://<argocd-server>/api/webhook

# Konfigurasi melalui ConfigMap ArgoCD
# kubectl edit configmap argocd-cm -n argocd
```

## Contoh Kode

### Aplikasi Lengkap dengan Sumber Helm

Contoh ini menggunakan chart Helm sebagai sumber, dengan nilai yang dioverride per environment:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-staging
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/organisasi-anda/helm-charts.git
    targetRevision: main
    path: charts/my-app
    helm:
      valueFiles:
        - values.yaml
        - values-staging.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

### Struktur Overlay Kustomize

Untuk tim yang menggunakan Kustomize, arahkan sumber ke direktori overlay:

```text
gitops-manifests/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── overlays/
    ├── staging/
    │   ├── kustomization.yaml
    │   ├── replica-count.yaml
    │   └── ingress.yaml
    └── production/
        ├── kustomization.yaml
        ├── replica-count.yaml
        └── ingress.yaml
```

```yaml
spec:
  source:
    repoURL: https://github.com/organisasi-anda/gitops-manifests.git
    targetRevision: main
    path: overlays/staging
```

### RBAC untuk Akses ArgoCD

Kontrol siapa yang dapat melihat dan menyinkronkan aplikasi dengan mengonfigurasi ConfigMap RBAC ArgoCD:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    p, role:staging-admin, applications, sync, my-app-staging, allow
    p, role:staging-admin, applications, get, my-app-staging, allow
    p, role:staging-admin, applications, delete, my-app-staging, allow
    g, devops-team, role:staging-admin
```

## Insight Penting

- **Mulai dengan sinkronisasi manual untuk produksi**: Sinkronisasi otomatis dengan prune dan self-heal sangat kuat tetapi dapat menyebabkan insiden jika salah konfigurasi. Gunakan sinkronisasi manual untuk environment produksi selama minggu-minggu pertama adopsi, kemudian tingkatkan ke sinkronisasi otomatis dengan pre-sync hook untuk smoke test.

- **Pantau durasi sinkronisasi sebagai SLO**: Interval polling default ArgoCD 3 menit berarti penyimpangan dapat tidak terdeteksi hingga 3 menit. Konfigurasikan webhook untuk mengurangi latensi deteksi menjadi hitungan detik, dan pantau metrik `argocd_app_sync_duration_seconds` untuk menangkap rekonsiliasi yang lambat.

- **Sealed Secrets terikat pada klaster secara default**: SealedSecret yang dienkripsi untuk klaster A tidak dapat didekripsi oleh klaster B. Untuk GitOps multi-klaster, enkripsi dengan `--scope cluster-wide` atau pertahankan file terenkripsi terpisah per klaster. Pertimbangkan External Secrets Operator untuk rahasia berbasis penyedia yang berfungsi di seluruh klaster.

- **ApplicationSets sederhanakan tetapi versi dengan hati-hati**: Perubahan template ApplicationSet mempengaruhi semua Application yang dihasilkan secara bersamaan. Uji template di satu environment terlebih dahulu menggunakan generator PR atau ApplicationSet terpisah dengan cakupan terbatas sebelum menerapkan ke produksi.

- **Hook pre-sync dan post-sync**: Gunakan resource hook ArgoCD untuk migrasi database, smoke test, atau notifikasi. Hook adalah manifest yang dianotasi dengan `argocd.argoproj.io/hook: PreSync` atau `PostSync` yang berjalan selama siklus hidup sinkronisasi dan dapat dikonfigurasi untuk menggagalkan deployment jika pemeriksaan kesehatan gagal.

## Langkah Berikutnya

- Jelajahi plugin **ArgoCD Rollouts** untuk pengiriman progresif (deployment blue/green dan canary).
- Pelajari **Crossplane** untuk mengelola infrastruktur cloud (database, bucket, jaringan) bersama aplikasi Kubernetes dalam workflow GitOps yang sama.
- Tinjau **Panduan Praktik Terbaik Produksi Kubernetes** di perpustakaan ini untuk panduan operasional yang lebih luas tentang RBAC, kebijakan jaringan, dan observabilitas.

## Kesimpulan

Anda telah mengimplementasikan workflow GitOps yang lengkap dengan ArgoCD di Kubernetes. Anda menginstal ArgoCD, menghubungkan repositori Git, men-deploy aplikasi dengan sinkronisasi otomatis, mengamankan rahasia dengan Sealed Secrets dan External Secrets Operator, melakukan scaling ke beberapa environment dengan ApplicationSets, dan mempelajari pola untuk memantau serta memperbaiki kegagalan sinkronisasi. ArgoCD memberikan tim Anda pipeline deployment yang andal, dapat diaudit, dan terotomatisasi yang menjaga status klaster Anda tetap sinkron dengan repositori Git — sumber kebenaran tunggal.

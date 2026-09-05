---
title: "Panduan Autoscaling Kubernetes"
description: "Panduan praktis untuk melakukan autoscaling workload Kubernetes — horizontal pod autoscaling (HPA) dengan metrik CPU, memori, dan metrik kustom, vertical pod autoscaling (VPA), cluster autoscaling, serta scaling berbasis peristiwa dengan KEDA — termasuk stabilization window, kebijakan scaling, perencanaan kapasitas, dan praktik terbaik operasional."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Autoscaling Kubernetes

## Pendahuluan

Autoscaling adalah salah satu pilar platform Kubernetes yang siap produksi. Klaster yang diukur untuk beban puncak menghabiskan sebagian besar waktu hidupnya dalam keadaan kurang terpakai, sedangkan klaster yang diukur untuk beban rata-rata akan tumbang saat terjadi lonjakan. Autoscaling menyelesaikan kedua masalah ini dengan terus-menerus menyesuaikan kapasitas terhadap permintaan melalui tiga lapisan:

1. **Horizontal Pod Autoscaling (HPA)** — mengubah jumlah replika pod berdasarkan metrik yang diamati seperti CPU, memori, latensi permintaan, atau kedalaman antrean.
2. **Vertical Pod Autoscaling (VPA)** — mengubah permintaan (dan limit) CPU serta memori pada container pod ketika workload tidak dapat diskalakan secara horizontal.
3. **Cluster Autoscaling (CA)** — mengubah jumlah node worker ketika ada pod yang tidak dapat dijadwalkan di node pool saat ini.

Platform modern sering menambahkan lapisan keempat — **scaling berbasis peristiwa dengan KEDA** — yang menskalakan workload berdasarkan sinyal eksternal seperti consumer lag Kafka, kedalaman antrean SQS, jumlah pesan RabbitMQ, atau jadwal cron, bahkan turun hingga nol replika ketika tidak ada pekerjaan yang harus diproses.

Panduan ini mencakup praktik terbaik untuk merancang dan mengoperasikan setiap lapisan, serta memandu implementasi lengkap dari klaster kosong hingga workload yang berskala berdasarkan metrik bisnis nyata. Panduan ini mengasumsikan Anda sudah menjalankan Kubernetes di produksi dan ingin membuat perilaku scaling Anda disengaja, dapat diamati, dan hemat biaya.

## Praktik Terbaik

### 1. Tetapkan Resource Requests dan Limits yang Akurat Terlebih Dahulu

Keputusan autoscaling hanya sebaik data sumber daya yang mendasarinya. Target utilisasi CPU dan memori HPA dihitung sebagai `pemakaian saat ini / jumlah yang diminta`, sehingga pod dengan request yang tidak realistis kecil akan mencapai utilisasi 100% hampir seketika, dan pod dengan request yang membengkak tidak pernah memicu scale-up meskipun sebenarnya sudah jenuh.

- Dasarkan request pada pemakaian kondisi tunak yang teramati, bukan pada maksimum teoretis. Jalankan workload selama beberapa hari, periksa `kubectl top pods`, dan tetapkan request di sekitar persentil ke-50 hingga ke-70 dari pemakaian yang teramati.
- Tetapkan limit cukup tinggi untuk menghindari OOMKill dan throttling CPU, tetapi selalu sisakan ruang di atas request.
- VPA (dalam mode rekomendasi) dapat membantu mengalibrasi request secara empiris — lihat Langkah 4.
- Perlakukan request sebagai kontrak dengan penjadwal: jumlah seluruh request di semua pod adalah yang digunakan Cluster Autoscaler untuk memutuskan apakah sebuah node kurang terpakai atau terlalu terbebani.

### 2. Gunakan HPA untuk Workload Stateless yang Dapat Diskalakan Horizontal

HPA adalah alat yang tepat ketika replika tambahan benar-benar meningkatkan throughput. Kandidat tipikal adalah API web, worker, agregator, dan layanan apa pun yang dapat melakukan sharding atau mempartisi pekerjaan. Sebelum mengadopsi HPA, verifikasi tiga sifat workload Anda:

- **Penanganan pekerjaan yang sedang berjalan secara idempoten** — jika sebuah replika dihentikan di tengah permintaan, klien (atau antrean percobaan ulang) harus dapat pulih.
- **Tidak ada bottleneck penulis tunggal** — layanan yang menulis ke satu tabel database melalui satu koneksi tidak akan berskala horizontal; skalakan database-nya sebagai gantinya.
- **Shutdown yang lancar** — pod harus menguras koneksi dan menyelesaikan pekerjaan yang sedang berjalan selama terminasi, jika tidak, scale-down akan menyebabkan kegagalan permintaan (gunakan pre-stop hook dan `terminationGracePeriodSeconds` yang memadai).
- **Readiness dan startup probe** — HPA hanya menghitung replika yang siap, sehingga pod yang lambat memulai dan tidak pernah siap akan membuat HPA melakukan scale-out lebih agresif. `startupProbe` yang tepat mencegah lingkaran umpan balik ini.

Workload stateful seperti broker Kafka, database, dan ensembel ZooKeeper sebaiknya TIDAK dikelola oleh HPA. Topologi replikasinya tetap secara desain; skalakan dengan mengubah jumlah replika stateful set secara sengaja, bukan dengan loop metrik otomatis.

### 3. Pilih Metrik yang Tepat untuk HPA

Utilisasi CPU adalah default yang praktis tetapi proksi yang buruk untuk pengalaman pengguna. Sebuah layanan dapat berada di 30% CPU sementara latensi p95-nya meledak karena kontensi kunci atau dependensi hilir. Utamakan keluarga metrik yang mencerminkan sinyal bisnis:

- **Metrik berbasis latensi** seperti durasi permintaan p95 atau p99 (melalui adapter Prometheus atau API metrik kustom) — ukuran langsung dari pengalaman pengguna.
- **Metrik throughput** seperti permintaan per detik.
- **Metrik kedalaman antrean** — untuk worker, jumlah pesan yang tertunda biasanya merupakan sinyal scaling terbaik.
- **Metrik eksternal** (dari penyedia cloud) seperti `ApproximateNumberOfMessagesVisible` SQS atau backlog langganan Pub/Sub.

Saat menggunakan metrik kustom, jaga kardinalitas metrik tetap rendah dan selaraskan interval scrape dengan periode sinkronisasi HPA (default 15 detik). Metrik berisik dengan osilasi cepat, seperti jumlah goroutine mentah atau jumlah koneksi mentah, menyebabkan HPA bergetar (thrash); ratakan dengan rate atau rata-rata bergerak di kueri adapter.

### 4. Atur Stabilization Window dan Kebijakan Perilaku (Behavior)

Perilaku default HPA melakukan scale-down setelah 5 menit utilisasi rendah yang berkelanjutan (stabilization window `scaleDown`). Ini sering kali terlalu agresif: pekerjaan batch yang menyelesaikan lonjakan dapat memicu kaskade scale-down yang mengacaukan deployment. Kolom `behavior` memberi Anda kendali eksplisit:

- Pertahankan stabilization window scale-up 0 detik agar Anda bereaksi terhadap lonjakan lalu lintas seketika.
- Perpanjang stabilization window scale-down menjadi 5–15 menit tergantung seberapa bergelombang lalu lintas Anda.
- Gunakan `selectPolicy: Max` pada scale-down agar kebijakan yang paling tidak agresif yang menang, dan `selectPolicy: Min` pada scale-up agar kebijakan paling agresif yang menang.
- Pertimbangkan kebijakan `pods` untuk workload yang setiap pod-nya menambah kapasitas bermakna, dan kebijakan `percent` untuk deployment besar yang langkah berbasis persentase lebih dapat diprediksi.

Pola produksi yang umum adalah "naik cepat, turun lambat": naikkan hingga 100% dari pod saat ini saat dibutuhkan, tetapi turunkan paling banyak 25% per periode evaluasi, dengan stabilization window 10 menit.

### 5. Gabungkan HPA dan VPA Secara Disengaja

HPA dan VPA sama-sama bereaksi terhadap pemakaian sumber daya, dan jika keduanya memperebutkan dimensi yang sama, Anda akan mendapatkan sistem yang tidak stabil: HPA melakukan scale-out karena CPU tinggi, VPA menaikkan request, pod dimulai ulang dengan request yang lebih besar, HPA melakukan scale-in... dan siklus itu berulang.

- Jalankan VPA dalam mode `recommendation` (jangan pernah `auto`) ketika workload juga dikelola HPA pada CPU atau memori. Terapkan rekomendasinya secara manual selama jendela rilis.
- Jalankan VPA dalam mode `auto` untuk workload yang TIDAK diskalakan horizontal, atau yang diskalakan dengan metrik non-sumber daya (latensi, kedalaman antrean).
- Jangan pernah menempatkan HPA pada CPU dan VPA mode `auto` pada deployment yang sama. Pilih satu pemilik untuk setiap dimensi sumber daya.
- Pembaruan VPA memerlukan pembuatan ulang pod; alokasikan anggaran untuk gangguan singkat (PDB dengan `maxUnavailable: 1` dan strategi rollout dengan `maxSurge`) ketika VPA mengusir pod untuk menerapkan request baru.

### 6. Konfigurasi Cluster Autoscaler dengan Pengaman

Cluster Autoscaler (CA) menambah atau menghapus node ketika pod tidak dapat dijadwalkan atau node kurang terpakai. Tanpa pengaman, CA dapat mengejutkan Anda dengan biaya atau kegagalan scale-up:

- Selalu tetapkan `min` dan `max` per node pool. Selisih keduanya adalah batas biaya Anda; CA tidak akan pernah melampauinya.
- Gunakan keluarga instans yang beragam di dalam satu pool sehingga gangguan spot atau kelangkaan tipe instans tidak menghalangi scale-up. Di AWS, gunakan kebijakan instans campuran.
- Pilih strategi expander dengan sengaja: `priority` (urutkan node pool berdasarkan preferensi), `least-waste` (pilih pool dengan pemborosan CPU/RAM paling sedikit), `random`, atau `most-pods`. Di klaster multi-penyewa, `priority` biasanya yang paling aman.
- Ambang utilisasi scale-down default 0.5 (50%) adalah wajar untuk sebagian besar klaster; turunkan menjadi 0.4–0.45 jika Anda ingin mempertahankan node lebih lama untuk menyerap lonjakan.
- Tetapkan `--max-empty-bulk-delete` dan waktu node tidak dibutuhkan (`--scale-down-unneeded-time`, default 10 menit) agar node tidak dihapus beberapa detik setelah menjadi idle.
- Jangan gunakan anotasi `cluster-autoscaler.kubernetes.io/safe-to-evict: "false"` pada workload biasa; anotasi itu memblokir scale-down dan membuat kapasitas terdampar.

### 7. Skalakan Workload Berbasis Peristiwa dengan KEDA

KEDA mengubah sumber peristiwa eksternal menjadi metrik Kubernetes dan menggerakkan HPA di atasnya. KEDA adalah cara standar untuk menskalakan konsumen, worker, dan pemroses batch:

- Gunakan `ScaledObject` untuk workload yang permintaannya bersifat eksternal (consumer lag Kafka, panjang antrean RabbitMQ, kedalaman SQS, volume kueri Postgres, endpoint HTTP kustom).
- Pertahankan `minReplicaCount` di atas nol untuk konsumen yang sensitif terhadap latensi, terutama konsumen Kafka dengan rebalance grup konsumen yang besar — scaling ke nol memaksa rebalance grup penuh pada scale-up berikutnya.
- Cadangkan `scale-to-zero` untuk pekerjaan asinkron yang benar-benar toleran terhadap penundaan (impor malam hari, ringkasan email, pembuatan laporan).
- Gunakan pemicu `Cron` untuk workload yang dapat diprediksi (jendela batch pukul 02:00, puncak Senin pagi) di mana scaling berbasis metrik akan tertinggal dari kurva permintaan.
- Gunakan `TriggerAuthentication`/`ClusterTriggerAuthentication` untuk memusatkan kredensial sumber peristiwa; jangan pernah menuliskan secret secara hard-code di `ScaledObject`.

### 8. Rencanakan Kapasitas dan Anggaran Lonjakan (Burst)

Autoscaling tidak menghilangkan kebutuhan perencanaan kapasitas; autoscaling hanya mengubah bentuknya. Pertahankan penyangga lonjakan yang disengaja:

- Sisakan ruang di setidaknya satu node pool (misalnya, pool "burst" kecil yang biasanya idle) sehingga lonjakan lalu lintas mendadak tidak menunggu 2–5 menit untuk penyedia cloud menyediakan node.
- Pahami hitungan cold-start Anda: node baru membutuhkan waktu 1–5 menit sejak keputusan scale-up hingga `Ready`, ditambah waktu penarikan image. Jika SLO Anda dalam hitungan detik, Anda memerlukan penyangga tetap — baik jumlah minimum node yang selalu aktif atau deployment over-provisioning (pod jeda berprioritas rendah yang menempati kapasitas cadangan dan diusir lebih dulu oleh CA).
- Padukan autoscaling dengan PodDisruptionBudgets sehingga gangguan sukarela (drain node, pengusiran VPA, peningkatan klaster) tidak pernah menjatuhkan ketersediaan di bawah SLO Anda.
- Tetapkan `topologySpreadConstraints` sehingga scale-out menyebar antar zona alih-alih menumpuk di satu zona ketersediaan.

### 9. Pantau Perilaku Autoscaling Secara Berkelanjutan

Kegagalan scaling bersifat senyap dan mahal — klaster diam-diam gagal berskala, atau diam-diam membelanjakan uang untuk node idle. Buat autoscaling dapat diamati:

- Amati kondisi status HPA (`kubectl describe hpa`) untuk `AbleToScale`, `ScalingActive`, dan `ScalingLimited`. `ScalingLimited` dengan `TooManyReplicas` atau `FailedGetScale` berarti `maxReplicas` atau sumber metrik Anda salah konfigurasi.
- Ekspor keputusan HPA ke Prometheus melalui `kube-state-metrics` (`kube_horizontalpodautoscaler_status_current_replicas`, `kube_horizontalpodautoscaler_spec_max_replicas`).
- Buat alert untuk: HPA yang macet di replika maksimum selama N menit, CA yang berulang kali gagal menyediakan node, rekomendasi VPA yang melenceng jauh antar eksekusi, dan `ScaledObject` KEDA yang berada dalam status gagal atau tidak diketahui.
- Pertahankan log `cluster-autoscaler` pada `--v=4` selama triase insiden; log tersebut mencatat setiap keputusan scale-up/down beserta alasannya.

### 10. Uji Autoscaling di Bawah Beban yang Realistis

Jangan pernah mengirimkan konfigurasi autoscaling yang hanya diuji dengan `kubectl run load-generator` sintetis. Validasi seluruh rantai — jalur permintaan, scrape metrik, kueri adapter, keputusan HPA, penjadwalan pod, penyediaan node:

- Jalankan uji beban dengan profil realistis (ramp-up, plateau, lonjakan) di klaster staging yang meniru node pool produksi.
- Verifikasi tiga hal secara terpisah: HPA bereaksi dalam periode evaluasi yang diharapkan, pod baru menjadi siap dan menerima lalu lintas, dan Cluster Autoscaler menyediakan node SEBELUM HPA mencapai `maxReplicas` (jika tidak, naikkan `maxReplicas` atau rencanakan penyangga lonjakan yang lebih besar).
- Uji juga jalur scale-down: setelah beban berhenti, pastikan deployment kembali ke jumlah replika minimum dan CA menguras serta menghapus node.
- Dokumentasikan latensi ujung-ke-ujung yang diharapkan dari "lonjakan metrik" hingga "kapasitas tambahan melayani lalu lintas" sehingga insinyur on-call mengetahui seperti apa kondisi "sehat".

## Langkah Implementasi

### Langkah 1: Siapkan Metrics Server

HPA membutuhkan sumber metrik sumber daya — API `metrics.k8s.io`, biasanya disediakan oleh `metrics-server`. Sebagian besar penawaran Kubernetes terkelola (EKS, GKE, AKS) memasangnya secara default; untuk klaster yang dikelola sendiri, pasang melalui Helm:

```bash
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm upgrade --install metrics-server metrics-server/metrics-server \
  --namespace kube-system \
  --set args={--kubelet-insecure-tls}
```

Verifikasi bahwa metrik node dan pod sedang dikumpulkan:

```bash
kubectl top nodes
kubectl top pods -A
```

Outputnya akan menunjukkan pemakaian CPU dan memori per node serta per pod. Jika `kubectl top` mengembalikan `error: metrics not available yet`, tunggu satu menit lalu coba lagi — metrics server mengumpulkan data dalam interval 15–30 detik.

### Langkah 2: Buat HPA untuk CPU dan Memori

Buat manifest untuk HPA yang menargetkan utilisasi CPU 70% dan utilisasi memori 80%, dengan perilaku scaling yang eksplisit ("naik cepat, turun lambat"):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
      selectPolicy: Max
```

Terapkan dan amati kondisi status HPA:

```bash
kubectl apply -f hpa.yaml
kubectl describe hpa api-server-hpa
```

Perhatikan `AbleToScale True`, `ScalingActive True`, dan bagian `Events` yang mencatat setiap keputusan scaling. Blok `behavior` di atas menaikkan 100% (atau 4 pod, mana yang lebih besar) seketika saat lonjakan, tetapi menunggu 10 menit sebelum menurunkan, dan hanya menghapus 25% pod per menit.

### Langkah 3: Tambahkan Metrik Kustom dengan Prometheus Adapter

Metrik sumber daya saja tidak dapat mengekspresikan sinyal bisnis. Pasang Prometheus, ekspos metrik aplikasi seperti `http_requests_total` dan `http_request_duration_seconds` (melalui pustaka klien Prometheus), lalu pasang Prometheus adapter untuk mengeksposnya melalui API metrik kustom.

Pasang adapter dan konfigurasikan untuk mengekspos metrik laju permintaan:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus.monitoring.svc:9090 \
  --set logLevel=4
```

```yaml
# patch configmap adapter — ekspos request per detik sebagai metrik kustom
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-adapter
  namespace: monitoring
data:
  config.yaml: |
    rules:
      - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
        resources:
          overrides:
            namespace: { resource: namespace }
            pod: { resource: pod }
        name:
          matches: 'http_requests_total'
          as: 'http_requests_per_second'
        metricsQuery: 'sum(rate(http_requests_total[2m])) by (namespace, pod)'
```

Verifikasi bahwa metrik kustom tersedia, lalu buat HPA yang berskala berdasarkan metrik tersebut:

```bash
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second" | jq
```

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-rps-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "250"
```

HPA sekarang menjaga sekitar 250 permintaan per detik per pod — target yang mencerminkan permintaan pengguna nyata alih-alih persentase CPU. Perhatikan jendela rate `2m` di kueri adapter: ini meratakan lonjakan pendek yang seharusnya menyebabkan replika bergetar (flapping).

### Langkah 4: Konfigurasi Vertical Pod Autoscaler

Untuk workload yang tidak dapat diskalakan horizontal (proses batch lama, worker instans tunggal, sidecar stateful), VPA menyesuaikan permintaan container secara otomatis. Pasang dan buat VPA dalam mode `recommendation` terlebih dahulu sehingga Anda dapat memeriksa sarannya sebelum membiarkannya bertindak:

```bash
helm repo add fairwinds-stable https://charts.fairwinds.com/stable
helm upgrade --install vpa fairwinds-stable/vpa --namespace kube-system
```

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: report-worker-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: report-worker
  updatePolicy:
    updateMode: "Recommendation" # ubah ke "Auto" hanya setelah meninjau rekomendasi
  resourcePolicy:
    containerPolicies:
      - containerName: worker
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: "4"
          memory: 4Gi
```

Periksa rekomendasinya:

```bash
kubectl describe vpa report-worker-vpa
```

Bagian `Recommendation` mencantumkan `target` (request yang direkomendasikan), `lowerBound`, dan `upperBound`. Ketika Anda yakin dengan rekomendasinya, ubah `updateMode` menjadi `Auto` — VPA akan mengusir pod yang request-nya berada di luar rentang dan membuat ulang dengan request baru. Pastikan PDB melindungi workload selama pengusiran ini:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: report-worker-pdb
  namespace: production
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: report-worker
```

### Langkah 5: Aktifkan Cluster Autoscaler

Cluster Autoscaler menyediakan node ketika pod tidak dapat dijadwalkan dan menghapus node ketika kurang terpakai. Di EKS:

```bash
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm upgrade --install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName=my-cluster \
  --set awsRegion=ap-southeast-1 \
  --set rbac.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::123456789012:role/cluster-autoscaler
```

Dengan auto-discovery, CA membaca batas node pool dari label node `cluster-autoscaler.kubernetes.io/min-size` dan `.../max-size`; sebagai alternatif, teruskan flag bergaya `--nodes=3:10:worker-a` untuk pool statis. Verifikasi bahwa CA berjalan dan mengawasi:

```bash
kubectl logs -n kube-system deploy/cluster-autoscaler --tail=50
```

CA yang sehat akan mencatat baris seperti `pod ... is unschedulable` lalu `scale-up: setting group worker-a size to 4`. Uji dengan membuat Deployment yang request-nya tidak dapat ditampung node saat ini; dalam beberapa menit CA akan menyediakan node dan pod akan terjadwal. Selalu pertahankan `--scale-down-utilization-threshold=0.5` (atau atur secara sengaja) dan tinjau flag `--expander`: `priority` dengan `ConfigMap` prioritas adalah pengaturan yang direkomendasikan untuk klaster multi-pool.

### Langkah 6: Tambahkan Scaling Berbasis Peristiwa dengan KEDA

Pasang KEDA dan definisikan `ScaledObject` yang menskalakan konsumen Kafka berdasarkan consumer-group lag:

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm upgrade --install keda kedacore/keda --namespace keda --create-namespace
```

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: kafka-auth
  namespace: production
spec:
  secretTargetRef:
    - parameter: sasl
      name: kafka-secrets
      key: sasl
    - parameter: username
      name: kafka-secrets
      key: username
    - parameter: password
      name: kafka-secrets
      key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor-scaledobject
  namespace: production
spec:
  scaleTargetRef:
    name: order-processor
  minReplicaCount: 2
  maxReplicaCount: 50
  pollingInterval: 10
  cooldownPeriod: 120
  triggers:
    - type: kafka
      metadata:
        topic: orders
        bootstrapServers: kafka-brokers.production.svc:9092
        consumerGroup: order-processor-group
        lagThreshold: "100"
      authenticationRef:
        name: kafka-auth
```

KEDA memantau consumer lag Kafka setiap 10 detik dan menggerakkan HPA sehingga kira-kira 100 pesan yang belum dikonsumsi per replika dipertahankan. `minReplicaCount: 2` menjaga grup konsumen tetap sehat — satu replika akan macet ketika rebalance dimulai. Untuk workload terjadwal, tambahkan pemicu cron:

```yaml
    - type: cron
      metadata:
        timezone: Asia/Jakarta
        start: "0 2 * * *"
        end: "30 3 * * *"
        desiredReplicas: "10"
```

Verifikasi bahwa operator menerima `ScaledObject` dan HPA telah dibuat untuknya:

```bash
kubectl get scaledobject order-processor-scaledobject
kubectl get hpa -n production | grep order-processor
```

### Langkah 7: Validasi, Pantau, dan Setel

Jalankan uji beban ujung-ke-ujung di klaster staging dan verifikasi setiap lapisan rantai bereaksi. Skrip k6 sederhana yang menaikkan lalu lintas lalu mendatar:

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 200 },   // ramp-up
    { duration: "5m", target: 500 },   // plateau
    { duration: "2m", target: 800 },   // lonjakan
    { duration: "5m", target: 0 },     // penurunan
  ],
};

export default function () {
  const res = http.get("https://api.example.com/health");
  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(1);
}
```

```bash
k6 run load-test.js
```

Sementara beban berjalan, amati rantainya:

```bash
watch -n 5 kubectl get hpa api-server-rps-hpa
watch -n 10 kubectl get nodes
kubectl describe hpa api-server-rps-hpa
```

Pastikan jumlah replika HPA naik selama lonjakan, pod baru menjadi `Ready` dan mulai melayani, dan Cluster Autoscaler menyediakan node SEBELUM HPA mencapai `maxReplicas`. Setelah fase penurunan, pastikan deployment kembali ke `minReplicas` dan CA menghapus node tambahan (`kubectl get nodes` akan menyusut kembali).

Terakhir, setel berdasarkan apa yang Anda amati:

- Jika HPA berosilasi antara dua jumlah replika, perbesar stabilization window scale-down atau ratakan metrik dengan jendela rate yang lebih lebar di adapter.
- Jika scale-up terlalu lambat, kurangi `stabilizationWindowSeconds` pada scale-up, perbesar kebijakan `Percent`, atau perbesar penyangga lonjakan tetap.
- Jika CA mempertahankan node idle terlalu lama di antara lonjakan, turunkan `--scale-down-unneeded-time` atau ambang utilisasi.
- Catat nilai yang telah disetel di nilai Helm atau manifest GitOps workload agar konfigurasi dapat ditinjau dan memiliki versi.

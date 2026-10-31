---
title: "Panduan Optimasi Biaya Kubernetes"
description: "Panduan praktis menekan biaya Kubernetes melalui requests dan limits yang akurat, penyetelan HPA dan VPA, autoscaling cluster, node spot, kuota namespace, label alokasi biaya, serta deteksi sumber daya idle."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Optimasi Biaya Kubernetes

## Pendahuluan

Kubernetes membuat penambahan kapasitas menjadi murah, tetapi membuat harganya sulit dibaca. Cluster yang terlihat sehat di Grafana bisa tetap menghabiskan sebagian besar tagihan untuk replika yang tidak melayani trafik, request yang disalin dari artikel blog, dan node pool yang tidak pernah menyusut di bawah nilai minimum. Biaya adalah properti dari manifest yang Anda kirim, bukan kejutan finansial bulanan.

Optimasi berjalan dalam empat lapis, dan urutannya penting karena setiap lapis mengubah input lapis berikutnya: efisiensi beban kerja (requests dan limits), elastisitas (HPA, VPA, KEDA), efisiensi kapasitas (batas autoscaler, pool campuran, spot), dan atribusi (kuota, label, laporan, deteksi idle).

## Praktik Terbaik

### 1. Ukur Requests dan Limits Terlebih Dahulu

Requests adalah sinyal penagihan bagi scheduler: sebuah pod memesan request-nya di node entah dipakai atau tidak, sehingga request yang terlalu besar memaksa autoscaler membeli kapasitas yang tidak dikonsumsi siapa pun. Ambil nilai dari persentil 60–75 penggunaan teramati selama sepekan, jaga rasio request terhadap limit sekitar 2:1, dan jangan pernah menghilangkan requests — pod tanpa request bersifat best-effort dan pertama kali dikorbankan saat node tertekan. Memori tidak dapat dimampatkan, jadi limit di bawah working set berarti `OOMKilled`, bukan throttling.

### 2. Gunakan HPA untuk Permintaan yang Berfluktuasi

Deployment yang dipatok 20 replika demi melewati puncak dua jam tetap membayar 22 jam kapasitas menganggur. Skalakan berdasarkan laju request, kedalaman antrean, atau latensi alih-alih CPU mentah, tetapkan `minReplicas` dari trafik luar jam sibuk yang terukur, dan gunakan perilaku asimetris — naik cepat, turun lambat — agar jumlah replika tidak berosilasi. Hapus kelonggaran yang hanya menutupi lambatnya image pull; perbaiki waktu pull-nya.

### 3. Jalankan VPA dalam Mode Rekomendasi

VPA pada mode `Auto` mengubah requests dengan mengevakuasi pod; pada mode `Recommendation` ia menjadi laporan right-sizing yang gratis dan berkelanjutan. Baca rekomendasinya setiap pekan, terapkan lewat jalur rilis normal Anda, dan batasi saran dengan `minAllowed` serta `maxAllowed` agar anomali trafik tidak menggelembungkan request secara permanen. Biarkan VPA memiliki memori hanya jika HPA tidak melakukan scaling berbasis memori, jika tidak kedua controller akan saling bertabrakan.

### 4. Pindahkan Beban Kerja yang Dapat Terputus ke Spot

Kapasitas spot umumnya 60–70% lebih murah daripada on-demand, dengan konsekuensi notifikasi eviksi dua menit. Pertahankan beban stateful, ingress, dan koneksi berumur panjang di on-demand; beri taint pada pool spot dan toleransi hanya untuk batch, CI, serta consumer antrean; sebar replika ke beberapa tipe instance dan zona; dan selalu pasangkan beban yang rawan eviksi dengan PodDisruptionBudget.

### 5. Tegakkan Kuota dan Kontrak Label

CronJob satu tim yang lepas kendali tidak boleh menghabiskan anggaran cluster. Terapkan `ResourceQuota` untuk `requests.cpu`, `requests.memory`, serta jumlah objek, pasangkan dengan `LimitRange` yang menyuntikkan nilai default, dan wajibkan label `app.kubernetes.io/part-of` plus `cost-center`, menolak manifest yang tidak memilikinya melalui Kyverno atau Gatekeeper. Anda tidak bisa mengurangi sesuatu yang tidak bisa diatribusikan.

### 6. Buru Sumber Daya Idle dan Bentuk Node Pool

Pemborosan menumpuk diam-diam: Service `LoadBalancer` yang ditinggalkan, PersistentVolume tanpa pemakai, Job selesai yang tidak pernah dibersihkan, deployment yang di-scale ke nol tetapi masih memesan. Laporkan pod di bawah 5% dari request selama tujuh hari, hapus PVC yatim, dan setel `ttlSecondsAfterFinished`. Secara paralel, jalankan minimal satu pool on-demand dan satu pool spot, aktifkan expander `least-waste` atau `priority`, dan tetapkan `max` yang realistis per pool — batas itu adalah tagihan terburuk Anda.

## Langkah Implementasi

### Langkah 1: Ukur Pemborosan Saat Ini

Pasang metrics-server bila belum ada, lalu bandingkan requests dengan konsumsi nyata:

```bash
kubectl top pods -A --sort-by=cpu | head -30
kubectl get pods -A -o json | jq -r '.items[] | select(.status.phase=="Running")
  | [.metadata.namespace, .metadata.name,
     ([.spec.containers[].resources.requests.cpu // "0"] | join(","))] | @tsv' | head -30
```

Pod yang meminta `2` CPU tetapi memakai `150m` memboroskan 92%. Urutkan namespace berdasarkan rasio itu; tiga teratas biasanya menyimpan sebagian besar peluang penghematan.

### Langkah 2: Terapkan Nilai Default dan Kuota

Beri baseline setiap namespace tim sebelum menyentuh beban kerja individual:

```yaml
apiVersion: v1
kind: LimitRange
metadata: { name: defaults, namespace: team-checkout }
spec:
  limits:
    - type: Container
      defaultRequest: { cpu: 100m, memory: 128Mi }
      default: { cpu: 500m, memory: 512Mi }
---
apiVersion: v1
kind: ResourceQuota
metadata: { name: team-checkout-quota, namespace: team-checkout }
spec:
  hard:
    requests.cpu: "40"
    requests.memory: 80Gi
    count/deployments.apps: "60"
```

Terapkan dengan `kubectl apply -f namespace-baseline.yaml`, lalu pastikan kuota tercatat dan belum habis melalui `kubectl describe resourcequota team-checkout-quota -n team-checkout`. Bila namespace sudah melampaui kuota, pod yang berjalan tetap hidup tetapi pod baru ditolak, jadi perbaiki angkanya sebelum rollout.

### Langkah 3: Right-Sizing dengan Rekomendasi VPA

Buat VPA khusus rekomendasi untuk deployment yang representatif:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata: { name: checkout-api-vpa, namespace: team-checkout }
spec:
  targetRef: { apiVersion: apps/v1, kind: Deployment, name: checkout-api }
  updatePolicy: { updateMode: "Off" }
  resourcePolicy:
    containerPolicies:
      - containerName: api
        minAllowed: { cpu: 50m, memory: 64Mi }
        maxAllowed: { cpu: "2", memory: 2Gi }
```

Setelah 24 jam, baca target yang disarankan lalu kirim melalui proses rilis Anda:

```bash
kubectl get vpa checkout-api-vpa -n team-checkout \
  -o jsonpath='{.status.recommendation.containerRecommendations[*]}' | jq
```

### Langkah 4: Tambahkan Pool Spot dan Pindahkan Beban Batch

Beri taint pada pool spot dan toleransi hanya di tempat eviksi masih dapat ditangani. Label di bawah sekaligus menjadi kunci atribusi biaya:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: invoice-renderer, namespace: team-billing }
spec:
  replicas: 4
  selector:
    matchLabels: { app: invoice-renderer }
  template:
    metadata:
      labels:
        app: invoice-renderer
        app.kubernetes.io/part-of: billing
        cost-center: finance-42
    spec:
      terminationGracePeriodSeconds: 90
      nodeSelector: { karpenter.sh/capacity-type: spot }
      tolerations: [{ key: workload-type, operator: Equal, value: batch, effect: NoSchedule }]
      containers:
        - name: renderer
          image: registry.example.com/invoice-renderer:2.4.1
          resources:
            requests: { cpu: 250m, memory: 512Mi }
            limits: { cpu: "1", memory: 1Gi }
```

Latih skenario eviksi dengan melakukan drain pada satu node spot; replika harus dijadwalkan ulang tanpa menggagalkan pekerjaan yang sedang berjalan.

### Langkah 5: Atribusikan Biaya, Lalu Otomatiskan Deteksi Idle

Pecah biaya node berdasarkan pemakaian pod yang sebenarnya dengan alat alokasi biaya, dan publikasikan pengeluar teratas setiap pekan:

```bash
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm upgrade --install kubecost kubecost/cost-analyzer \
  --namespace kubecost --create-namespace \
  --set global.clusterId="prod-ap-southeast-1"
```

```bash
#!/usr/bin/env bash
set -euo pipefail
WINDOW="${1:-7d}"
OUT="/tmp/laporan-biaya-$(date +%F).json"
kubectl get ns kubecost >/dev/null 2>&1 || { echo "namespace kubecost tidak ditemukan" >&2; exit 1; }
kubectl port-forward -n kubecost svc/kubecost-cost-analyzer 9090:9090 >/dev/null 2>&1 &
PF_PID=$!
trap 'kill "$PF_PID" 2>/dev/null || true' EXIT
sleep 3
curl -fsS "http://localhost:9090/model/allocation?window=${WINDOW}&accumulate=true" -o "$OUT" \
  || { echo "permintaan ke API biaya gagal" >&2; exit 1; }
jq -r '.data[0][] | [.name, (.totalCost|tostring)] | @tsv' "$OUT" | sort -k2 -nr | head -10
```

Tutup dengan penyisiran idle mingguan sebagai `CronJob` yang menandai beban kerja di bawah 10 milicores, dan perlakukan setiap temuan sebagai tiket, bukan kebisingan latar. Setiap request yang di-right-size menurunkan jumlah node yang harus dibeli autoscaler, yang kemudian menurunkan tagihan yang dilacak kuota dan laporan.

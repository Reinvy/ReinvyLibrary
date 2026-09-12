---
title: "Panduan Service Mesh untuk Kubernetes"
description: "Panduan berbasis kriteria untuk mengadopsi service mesh di Kubernetes dengan Istio — mencakup sidecar proxy, mTLS, routing trafik dengan VirtualService dan DestinationRule, observabilitas, serta perbandingan dengan Linkerd."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Service Mesh untuk Kubernetes

## Pendahuluan

Service mesh memindahkan urusan jaringan yang bersifat lintas layanan keluar dari kode aplikasi dan ke lapisan platform. Alih-alih setiap layanan mengimplementasikan mutual TLS, retry, dan timeout sendiri, setiap Pod menjalankan **sidecar proxy** yang secara transparan mencegat trafik masuk dan keluar, sementara **control plane** mengonfigurasi proxy tersebut melalui custom resource.

Pada Istio, data plane adalah sidecar Envoy yang disuntikkan ke setiap Pod dan control plane adalah `istiod` yang menerbitkan sertifikat beban kerja serta mendorong konfigurasi routing. Pada Linkerd, data plane adalah micro-proxy berbasis Rust yang ringan dan control plane-nya hanya terdiri dari sedikit controller. Keduanya menyediakan mTLS, telemetri golden signal, dan pergeseran trafik secara deklaratif; komprominya adalah bobot operasional versus luasnya permukaan konfigurasi. Panduan ini membahas apa yang perlu diputuskan *sebelum* memasang mesh, cara menyusun resource Istio yang esensial, dan kapan mesh yang lebih ringan merupakan pilihan yang lebih tepat.

## Praktik Terbaik

- **Adopsi hanya dengan pemicu yang konkret**: "Semua orang memakai mesh" bukan pemicu. Pemicu yang sah adalah mandat mTLS per layanan, pergeseran trafik yang halus, atau penghapusan kode retry/circuit breaker yang terduplikasi. Tanpa itu, mesh hanya menambah beban operasional permanen.
- **Pindahkan mTLS ke mode strict secara bertahap**: Pasang dengan mode `PERMISSIVE`, pastikan setiap beban kerja memiliki `istio-proxy` yang sehat, baru ubah namespace ke `STRICT`. Mengubahnya ke strict untuk seluruh cluster di hari pertama akan memutus pemanggil yang belum masuk mesh.
- **Simpan kebijakan routing di Git**: `VirtualService`, `DestinationRule`, dan `PeerAuthentication` adalah kode — tinjau melalui pull request dan jangan pernah mengubahnya manual saat insiden tanpa mencatat perubahannya.
- **Sesuaikan ukuran sidecar**: Setiap proxy yang disuntikkan memakan CPU dan memori, dan mesh dengan 500 Pod membayarnya 500 kali. Batasi resource proxy melalui anotasi dan masukkan ke perencanaan kapasitas cluster.
- **Sematkan versi dan lakukan upgrade bertahap**: Upgrade control plane mengubah perilaku data plane semua layanan sekaligus. Sematkan `istio.version` dan rilis namespace demi namespace.
- **Tetapkan batas radius dampak**: Gunakan resource `Sidecar` untuk membatasi apa yang dapat dilihat proxy setiap namespace; tanpanya, setiap proxy menyimpan konfigurasi seluruh mesh.

### Baseline Resource Sidecar

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
  namespace: shop
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyCPULimit: "500m"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
    spec:
      containers:
        - name: checkout
          image: registry.internal/shop/checkout:1.8.2
```

## Langkah Implementasi

### Langkah 1: Nilai Kriteria Adopsi Anda

Jawab pertanyaan berikut dengan jujur; dua jawaban "adopsi" atau lebih sudah cukup membenarkan mesh, jika kurang tunda dulu.

| Kriteria | Adopsi mesh | Tetap pakai Kubernetes biasa |
| --- | --- | --- |
| Jumlah layanan | 20+ layanan lintas tim | Hanya segelintir layanan |
| Keamanan | Zero-trust, mTLS per layanan | NetworkPolicy sudah memadai |
| Strategi rilis | Canary atau A/B testing | Rolling update sudah cukup |
| Observabilitas | Telemetri latensi/error seragam | Metrik per aplikasi dapat diterima |

### Langkah 2: Pasang Istio dan Aktifkan mTLS

Lindungi instalasi agar CLI yang hilang atau konteks yang salah gagal secara jelas, bukan meninggalkan control plane setengah terkonfigurasi:

```bash
#!/usr/bin/env bash
set -euo pipefail

if ! command -v istioctl >/dev/null 2>&1; then
  echo "istioctl tidak ditemukan. Pasang Istio ${ISTIO_VERSION:-1.24.2} dulu." >&2
  exit 1
fi
if ! kubectl cluster-info >/dev/null 2>&1; then
  echo "Tidak ada konteks Kubernetes yang dapat dijangkau. Periksa KUBECONFIG." >&2
  exit 1
fi

istioctl install --set profile=default -y
kubectl wait --for=condition=Available deployment/istiod -n istio-system --timeout=180s
```

Selanjutnya migrasikan autentikasi dari permissive ke strict per namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: shop
spec:
  mtls:
    mode: PERMISSIVE
```

### Langkah 3: Atur Routing Trafik dengan VirtualService dan DestinationRule

`DestinationRule` mendeklarasikan subset versi; `VirtualService` mendeklarasikan pencocokan dan bobot.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: checkout
  namespace: shop
spec:
  host: checkout.shop.svc.cluster.local
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: checkout
  namespace: shop
spec:
  hosts:
    - checkout.shop.svc.cluster.local
  http:
    - route:
        - destination:
            host: checkout.shop.svc.cluster.local
            subset: canary
          weight: 5
        - destination:
            host: checkout.shop.svc.cluster.local
            subset: stable
          weight: 95
```

### Langkah 4: Amati Mesh

```bash
kubectl exec -n shop deploy/checkout -c istio-proxy -- \
  curl -s localhost:15000/stats/prometheus | grep istio_requests_total | head -n 5
```

Kumpulkan metrik ini dengan Prometheus, visualisasikan dengan Kiali, dan ambil sampel trace dengan Jaeger. Aktifkan access logging hanya jika diperlukan — biayanya mahal pada laju permintaan tinggi.

### Langkah 5: Bandingkan dengan Linkerd Sebelum Memutuskan

| Dimensi | Istio | Linkerd |
| --- | --- | --- |
| Data plane | Sidecar Envoy | Micro-proxy Rust |
| Overhead resource | Lebih tinggi (Envoy penuh per Pod) | Lebih rendah (puluhan MB per Pod) |
| Pemisahan trafik | `VirtualService` / `DestinationRule` | `HTTPRoute` dari Gateway API |
| mTLS | Otomatis, kebijakan per namespace | Otomatis, aktif secara default |
| Permukaan konfigurasi | Sangat luas | Sengaja dibuat kecil |

Pilih Linkerd ketika kebutuhannya keamanan dan telemetri; pilih Istio ketika Anda memerlukan routing berbasis header, fault injection, dan ekosistem ekstensi yang luas.

### Langkah 6: Rilis dengan Aman

```bash
#!/usr/bin/env bash
set -euo pipefail

namespace="${1:-shop}"
if ! kubectl get namespace "$namespace" >/dev/null 2>&1; then
  echo "Namespace '$namespace' tidak ada. Tidak ada yang perlu di-rollback." >&2
  exit 1
fi

kubectl label namespace "$namespace" istio-injection- --overwrite
kubectl rollout restart deployment -n "$namespace"
kubectl rollout status deployment -n "$namespace" --timeout=180s
```

Setiap rollout me-restart seluruh Pod di namespace tersebut, jadi jadwalkan migrasi di dalam maintenance window dan pantau tingkat keberhasilan mesh sepanjang proses.

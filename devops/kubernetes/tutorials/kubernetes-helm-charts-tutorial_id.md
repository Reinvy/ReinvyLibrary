---
title: "Tutorial Helm Chart Kubernetes"
description: "Membangun, me-render, dan menerbitkan Helm chart siap produksi: anatomi chart, desain values, helper, dependency subchart, hook, packaging, dan distribusi OCI."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Tutorial Helm Chart Kubernetes

## Ringkasan

Tutorial ini membawa Anda dari scaffold kosong hingga chart yang terbit di registry OCI. Anda akan membangun chart API kecil dengan kontrak values yang rapat, helper bernama yang dipakai ulang di banyak manifest, subchart yang dipin, dan proses rilis yang reprodusibel.

## Target Audiens

- Engineer DevOps dan platform yang sudah melakukan deploy dengan `kubectl apply -k`.
- Developer backend yang memegang manifest layanannya sendiri.

## Prasyarat

- Cluster yang bisa dipakai deploy (kind atau minikube) beserta `kubectl`.
- Helm 3.14 atau lebih baru (`helm version`).
- Registry yang mendukung OCI seperti GHCR, beserta kredensial untuk `helm registry login`.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan setiap berkas dalam chart dan bagaimana proses render-nya.
- Merancang permukaan `values.yaml` yang membuat override tetap kecil dan terprediksi.
- Memindahkan potongan manifest berulang ke helper bernama dengan `include`.
- Memin subchart lewat `Chart.lock` dan mengaturnya dengan condition.
- Mengemas chart dan menerbitkannya ke registry OCI secara immutable.

## Konteks dan Motivasi

Menyalin Deployment per environment masih masuk akal sampai cluster ketiga. Helm mengubah manifest menjadi paket berparameter: satu chart, banyak release, dan riwayat tercatat sehingga `helm rollback` benar-benar bisa dipakai saat insiden. Bagian sulitnya bukan CLI, melainkan merancang kontrak values dan helper agar chart tetap terbaca setahun kemudian.

## Konten Inti

### Anatomi Chart

`helm create api` menghasilkan `Chart.yaml`, `values.yaml`, `templates/`, `charts/`, dan `.helmignore`. Render sepenuhnya berbasis teks: Helm menggabungkan values, mengeksekusi template, lalu mengirim hasilnya ke API server.

### Values sebagai Satu-satunya Knob

Values adalah API publik chart. Ungkapkan niat (`replicaCount`) alih-alih menyalin seluruh field pod, dan tambahkan `values.schema.json` agar salah ketik tertolak sebelum render. Kutip override string di CLI karena `--set image.tag=1.10` berubah menjadi float.

### Template dan Objek Bawaan

Template menerima `.Values`, `.Release`, `.Chart`, `.Capabilities`, dan `.Files`. Gunakan `{{ .Release.Namespace }}` daripada namespace hard-code, dan lindungi field khusus versi dengan `.Capabilities.APIVersions.Has`.

### Helper Bernama dan `include`

`templates/_helpers.tpl` menyimpan nama chart, fullname, label, dan referensi image. Panggil helper dengan `include` yang mengembalikan string siap di-pipe, bukan `template` yang langsung menulis. Kirim konteks root agar helper tetap bekerja di dalam loop `range`.

### Dependency dan Hook

Deklarasikan subchart di `Chart.yaml`, vendorkan dengan `helm dependency build`, lalu commit `Chart.lock`. Pin versi persis dan pakai `condition` agar operator bisa mematikan subchart opsional dengan satu boolean. Hook adalah manifest biasa beranotasi `helm.sh/hook`; Job `pre-upgrade` menjalankan migrasi sebelum Deployment bergulir, dan `hook-delete-policy: before-hook-creation` mencegah bentrok nama saat retry. Hook tidak lagi menjadi bagian release setelah dieksekusi, jadi pastikan idempoten.

### Packaging dan Publikasi

`helm package` menghasilkan `api-1.4.0.tgz`; `helm push` mengunggahnya ke registry OCI mana pun. Perlakukan versi chart sebagai immutable dan biarkan CI menurunkan versi dari tag Git agar rilis chart dan aplikasi selalu selaras.

## Contoh Kode

### Metadata Chart dengan Dependency Terpin

```yaml
apiVersion: v2
name: api
type: application
version: 1.4.0
appVersion: "2.11.3"
dependencies:
  - name: redis
    version: 20.6.1
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
```

### Values dengan Default yang Wajar

```yaml
replicaCount: 2

image:
  repository: ghcr.io/acme/payments-api
  tag: "2.11.3"
  pullPolicy: IfNotPresent

redis:
  enabled: false
```

### Helper Bersama

```text
{{- define "api.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "api.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}
```

### Deployment yang Memakai Helper

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "api.fullname" . }}
  labels:
    {{- include "api.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    metadata:
      labels:
        {{- include "api.labels" . | nindent 8 }}
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```

### Lint, Render, Package, Publish

```bash
set -euo pipefail

# Gagal cepat saat ada error template atau schema sebelum menyentuh cluster
helm lint ./api --strict
# Periksa manifest persis untuk satu environment
helm template payments ./api --namespace payments -f values/production.yaml > /tmp/rendered.yaml
# Vendorkan dependency terpin, lalu bangun artefak
helm dependency build ./api
helm package ./api --destination dist
# Terbitkan secara immutable; versi harus sama dengan Chart.yaml
helm push dist/api-1.4.0.tgz oci://ghcr.io/acme/charts
```

## Insight Penting

- Values adalah API, bukan cermin spec pod: ungkapkan niat dan dokumentasikan default-nya.
- Pakai `include`, bukan `template`, di dalam helper — `template` merusak pipeline seperti `| nindent 4`.
- Pin versi subchart dan commit `Chart.lock`; rentang versi membuat hasil render tidak deterministik.
- Hook wajib idempoten: dibuat ulang saat retry dan tidak muncul di `helm get manifest`.
- Render dengan `helm template` di CI untuk menangkap error nil pointer sebelum deploy.

## Langkah Berikutnya

- Tambahkan pipeline chart-testing (`ct lint`, `ct install`) terhadap cluster kind.
- Pisahkan override environment ke `values/base.yaml` dan `values/production.yaml`.
- Antar rilis dengan Argo CD atau Flux yang mengonsumsi chart OCI langsung.

## Kesimpulan

Anda telah membangun chart dengan kontrak values kecil, helper yang bisa dipakai ulang, subchart terpin, dan artefak immutable yang sudah diterbitkan. Setiap rilis kini reprodusibel dari tag Git, bukan dari folder YAML hasil salin-tempel.

---
title: "Cheat Sheet RBAC Kubernetes"
description: "Referensi cepat RBAC Kubernetes: Role, ClusterRole, binding, ServiceAccount, semantik verb dan resource, agregasi, least privilege, serta perintah audit."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet RBAC Kubernetes

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Melihat identitas pemanggil | `kubectl auth whoami` | Menampilkan user, group, dan extra claim dari konteks aktif |
| Menguji izin ya/tidak | `kubectl auth can-i create pods -n payments` | Mencetak `yes` atau `no`; exit code bisa dipakai skrip |
| Menguji identitas lain | `kubectl auth can-i get secrets --as system:serviceaccount:payments:ci-bot` | Evaluasi RBAC untuk user, group, atau ServiceAccount |
| Melihat seluruh izin | `kubectl auth can-i --list -n payments` | Daftar verb yang diizinkan per resource |
| Membaca semua objek RBAC | `kubectl get roles,rolebindings,clusterroles,clusterrolebindings -A` | Inventaris lengkap untuk audit |
| Mencari binding sebuah subjek | `kubectl get rolebindings -A -o wide` | Baca kolom SUBJECTS untuk mengetahui sumber hak akses suatu identitas |
| Membuat identitas | `kubectl create serviceaccount ci-bot -n payments` | Satu ServiceAccount per workload |
| Menerbitkan token | `kubectl create token ci-bot -n payments --duration=15m` | Token berumur pendek tanpa Secret legacy |
| Mematikan mount token | `kubectl patch sa ci-bot -p '{"automountServiceAccountToken": false}'` | Menghapus kredensial API dari pod yang tidak membutuhkannya |
| Memberi role namespace | `kubectl create rolebinding rb --role=payment-reader --serviceaccount=payments:ci-bot -n payments` | Mengikat Role di dalam satu namespace |
| Memberi cluster role | `kubectl create clusterrolebinding crb --clusterrole=view --serviceaccount=payments:ci-bot` | Hak seluruh cluster; gunakan seperlunya |
| Melihat aturan sebuah role | `kubectl describe clusterrole view` | Matriks verb/resource yang mudah dibaca |

## Perintah Umum

### Memeriksa Hak Akses yang Ada

```bash
# Inventaris lengkap di seluruh cluster
kubectl get roles,rolebindings,clusterroles,clusterrolebindings -A

# Uraikan satu role menjadi daftar aturannya
kubectl describe clusterrole view
kubectl describe role payment-reader -n payments

# Binding mana saja yang menyebut subjek tertentu?
kubectl get rolebindings -A -o wide | grep ci-bot
kubectl get clusterrolebindings -o wide | grep jane@example.com
```

### Menguji dan Menyimulasikan Izin

```bash
set -euo pipefail

# Identitas dari konteks aktif
kubectl auth whoami

# Pemeriksaan berbasis exit code untuk gate CI
if kubectl auth can-i create pods --namespace payments >/dev/null; then
    echo "diizinkan"
else
    echo "ditolak"
fi

# Evaluasi sebagai subjek lain tanpa mengganti konteks
kubectl auth can-i list secrets --as system:serviceaccount:payments:ci-bot -n payments

# Daftar seluruh aksi yang boleh dilakukan sebuah subjek di satu namespace
kubectl auth can-i --list --as system:serviceaccount:payments:ci-bot -n payments
```

### ServiceAccount dan Token

```bash
# Satu identitas per workload, jangan dipakai bersama antar tim
kubectl create serviceaccount ci-bot -n payments

# Token terproyeksi dengan masa berlaku terbatas (Kubernetes 1.24+)
kubectl create token ci-bot -n payments --duration=15m

# Hentikan mount otomatis untuk pod yang tidak pernah memanggil API
kubectl patch serviceaccount ci-bot -n payments \
    -p '{"automountServiceAccountToken": false}'
```

### Agregasi dan Audit

```bash
# ClusterRole teragregasi: role berlabel digabung oleh controller
kubectl get clusterroles -l rbac.example.com/aggregate-to-ops=true

# Cari subjek yang terikat ke role bawaan berbahaya
kubectl get clusterrolebindings -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.roleRef.name}{"\n"}{end}' | grep cluster-admin

# Bandingkan RBAC di Git dengan kondisi cluster sebelum apply
kubectl diff -f manifests/rbac/
```

## Potongan Kode

### Role dan RoleBinding dalam Namespace

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: payment-reader
  namespace: payments
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    resourceNames: ["payments-api"]
    verbs: ["get", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payments-api-reader
  namespace: payments
subjects:
  - kind: ServiceAccount
    name: ci-bot
    namespace: payments
roleRef:
  kind: Role
  name: payment-reader
  apiGroup: rbac.authorization.k8s.io
```

### ClusterRole Teragregasi

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ops-readonly
aggregationRule:
  clusterRoleSelectors:
    - matchLabels:
        rbac.example.com/aggregate-to-ops: "true"
rules: []   # diisi oleh controller agregasi
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ops-readonly-pods
  labels:
    rbac.example.com/aggregate-to-ops: "true"
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes"]
    verbs: ["get", "list", "watch"]
```

### Gate Least Privilege untuk CI

```bash
#!/usr/bin/env bash
set -euo pipefail

subject="system:serviceaccount:payments:ci-bot"

# Gagalkan pipeline jika identitas workload punya akses tulis seluruh cluster.
if kubectl auth can-i create pods --all-namespaces --as "${subject}" | grep -q '^yes$'; then
    echo "ERROR: ${subject} dapat membuat pod di seluruh cluster" >&2
    exit 1
fi

echo "OK: ${subject} tidak memiliki hak membuat pod secara global"
```

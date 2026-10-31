---
title: "Cheat Sheet Penyimpanan dan Persistent Volume Kubernetes"
description: "Referensi cepat penyimpanan persisten di Kubernetes: siklus hidup PV dan PVC, StorageClass, driver CSI, pembesaran volume, snapshot, dan debugging mount."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Penyimpanan dan Persistent Volume Kubernetes

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Lihat claim beserta volume yang terikat | `kubectl get pvc -n <ns> -o wide` | Menampilkan nama volume, kapasitas, access mode, dan StorageClass yang dipakai |
| Cari alasan claim tetap Pending | `kubectl describe pvc <pvc> -n <ns>` | Event menyebutkan provisioner dan penyebabnya: PV tidak cocok, konflik topologi, secret hilang |
| Daftar volume beserta claim-nya | `kubectl get pv -o custom-columns=NAME:.metadata.name,CAP:.spec.capacity.storage,CLASS:.spec.storageClassName,STATUS:.status.phase` | Memudahkan menemukan volume berstatus Released dan Failed saat bersih-bersih |
| Daftar storage class | `kubectl get storageclass` | Menampilkan provisioner, reclaim policy, binding mode, dan penanda default |
| Baca anotasi class default | `kubectl get storageclass -o jsonpath="{.items[0].metadata.annotations.storageclass\.kubernetes\.io/is-default-class}"` | Hanya satu class yang seharusnya memakai anotasi default per klaster |
| Ketahui driver CSI sebuah volume | `kubectl get pv <pv> -o jsonpath='{.spec.csi.driver}'` | Memastikan driver pemilik volume dan key topologinya |
| Perbesar claim | `kubectl patch pvc <pvc> -n <ns> -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'` | Hanya berhasil bila StorageClass memakai `allowVolumeExpansion: true` |
| Pantau proses resize | `kubectl get pvc <pvc> -n <ns> -o jsonpath='{.status.conditions}'` | Kondisi FileSystemResizePending berarti node masih harus memperbesar filesystem |
| Cek lokasi volume lokal | `kubectl get pv <pv> -o jsonpath='{.spec.nodeAffinity}'` | Volume lokal mengunci semua konsumennya ke satu node |
| Baca sumber volume sebuah pod | `kubectl get pod <pod> -o jsonpath='{.spec.volumes}'` | Menampilkan setiap volume beserta claimName atau sumber inline-nya |
| Debug pod yang macet di ContainerCreating | `kubectl describe pod <pod>` | Event FailedMount dan FailedAttachVolume menjelaskan penyebabnya |
| Daftar driver CSI | `kubectl get csidrivers` | Atribut AttachRequired dan PodInfoOnMount menentukan cara pod memakai storage |
| Daftar snapshot | `kubectl get volumesnapshot -A` | Memerlukan snapshot controller dan CRD snapshot |
| Salin data keluar dari volume | `kubectl cp <ns>/<pod>:/data ./backup` | Memakai tar di belakang layar, jadi image harus menyertakan tar |
| Cek statistik volume kubelet | `kubectl get --raw /api/v1/nodes/<node>/proxy/stats/summary` | Kapasitas filesystem, byte terpakai, dan jumlah inode per node |

## Perintah Umum

### Inspeksi Volume dan Claim

```bash
# Seluruh claim di klaster beserta volume dan kapasitasnya
kubectl get pvc -A -o wide

# Volume yang sudah tidak terikat claim
kubectl get pv -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,CLAIM:.spec.claimRef.name

# Spec dan status lengkap satu claim
kubectl get pvc data-postgres-0 -n databases -o yaml

# Pod mana saja yang memakai claim tertentu
kubectl get pods -A -o jsonpath="{range .items[?(@.spec.volumes[*].persistentVolumeClaim.claimName=='data-postgres-0')]}{.metadata.namespace}/{.metadata.name}{'\n'}{end}"

# Storage class beserta provisioner dan binding mode-nya
kubectl get storageclass -o custom-columns=NAME:.metadata.name,PROVISIONER:.provisioner,RECLAIM:.reclaimPolicy,BINDING:.volumeBindingMode,EXPAND:.allowVolumeExpansion
```

### StorageClass dan Provisioning

```bash
# Membuat volume sekali pakai dari sebuah class tanpa menulis PVC manual
kubectl create -f - <<'YAML'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: scratch
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 5Gi
YAML

# Lihat provisioner yang bertanggung jawab atas claim berstatus Pending
kubectl get events -n <ns> --field-selector involvedObject.name=<pvc> --sort-by=.lastTimestamp

# Pastikan class default di sebuah klaster
kubectl get storageclass -o jsonpath="{range .items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=='true')]}{.metadata.name}{'\n'}{end}"

# Periksa kemampuan sebuah driver CSI
kubectl get csidriver <driver>.csi.example.com -o yaml
```

### Debugging Mount dan Attach

```bash
# Event untuk satu pod, terbaru di akhir
kubectl get events --field-selector involvedObject.name=<pod> --sort-by=.lastTimestamp

# Pod yang gagal melakukan mount di seluruh klaster
kubectl get events -A --field-selector reason=FailedMount

# Masalah attach dan detach biasanya mengarah ke cloud controller atau CSI controller
kubectl get events -A --field-selector reason=FailedAttachVolume

# Hubungi pod driver CSI langsung ketika controller bermasalah
kubectl get pods -n kube-system -l app=csi-<driver>
kubectl logs -n kube-system csi-<driver>-controller-0 -c csi-provisioner --tail=100

# Pastikan kubelet sudah mendaftarkan driver di node tertentu
kubectl get csinode <node> -o yaml

# Periksa lease dan VolumeAttachment yang menahan reschedule
kubectl get volumeattachment -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,PV:.spec.source.persistentVolumeName,DELETED:.metadata.deletionTimestamp
```

### Resize dan Reclaim Volume

```bash
# Perbesar claim (pengecilan tidak pernah didukung)
kubectl patch pvc data-postgres-0 -n databases -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'

# Pantau kapasitas di status menyusul permintaan
kubectl get pvc data-postgres-0 -n databases -o jsonpath='{.spec.resources.requests.storage}{" -> "}{.status.capacity.storage}{"\n"}'

# Claim berstatus Released menahan datanya sampai PV dihapus
kubectl get pv -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,RECLAIM:.spec.persistentVolumeReclaimPolicy

# Hapus volume Released setelah masa retensi selesai
kubectl delete pv <pv>

# Lepas volume attachment yang macet sebelum menghapus objek node
kubectl delete volumeattachment <attachment>
```

### Snapshot dan Restore

```bash
# Pastikan CRD dan controller snapshot sudah terpasang
kubectl get crd volumesnapshots.snapshot.storage.k8s.io
kubectl get pods -n kube-system -l app=snapshot-controller

# Ambil snapshot dari claim yang sudah terikat
kubectl apply -f volumesnapshot.yaml

# Tunggu status siap sebelum melakukan restore
kubectl get volumesnapshot db-snapshot -n databases -o jsonpath='{.status.readyToUse}'

# Isi snapshot dimiliki driver CSI, bukan csi-snapshotter
kubectl get volumesnapshotcontent -o custom-columns=NAME:.metadata.name,SIZE:.status.restoreSize,CLASS:.spec.volumeSnapshotClassName
```

### Pemeriksaan Volume dari Dalam Pod

```bash
# Pastikan filesystem ter-mount di lokasi yang diharapkan aplikasi
kubectl exec -n databases postgres-0 -- df -h /var/lib/postgresql/data

# Periksa opsi mount dan device di baliknya
kubectl exec -n databases postgres-0 -- findmnt /var/lib/postgresql/data

# Cek jumlah inode, bukan hanya byte
kubectl exec -n databases postgres-0 -- df -i /var/lib/postgresql/data

# Verifikasi izin dan kepemilikan yang diberikan driver CSI
kubectl exec -n databases postgres-0 -- ls -ld /var/lib/postgresql/data

# Tekanan disk pada node muncul di sini sebelum pod dievakuasi
kubectl describe node <node>
```

## Potongan Kode

### StorageClass dengan Binding Tertunda dan Dukungan Resize

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  fsType: ext4
  encrypted: "true"
reclaimPolicy: Delete
allowVolumeExpansion: true
# WaitForFirstConsumer menjaga volume tetap di zona yang sama dengan pod pemakainya
volumeBindingMode: WaitForFirstConsumer
mountOptions:
  - noatime
```

### PersistentVolume Statis di Disk Lokal

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-disk-node-a
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-disk
  local:
    path: /mnt/disks/ssd0
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - node-a
```

### Claim yang Dikunci ke Volume Statis

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-local
spec:
  accessModes:
    - ReadWriteOnce
  # String kosong berarti tidak memakai provisioning dinamis sama sekali
  storageClassName: ""
  volumeName: local-disk-node-a
  resources:
    requests:
      storage: 100Gi
```

### volumeClaimTemplates pada StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
spec:
  serviceName: postgres-headless
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  # Setiap replika mendapat claim sendiri: data-postgres-0, data-postgres-1, ...
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

### Pod dengan Generic Ephemeral Volume

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: report-worker
spec:
  containers:
    - name: worker
      image: example/report-worker:2.1.0
      volumeMounts:
        - name: scratch
          mountPath: /scratch
  volumes:
    # Claim dibuat dan dihapus bersama pod, tetapi tetap berasal dari
    # StorageClass sungguhan sehingga dijadwalkan dan ditagih seperti volume biasa
    - name: scratch
      ephemeral:
        volumeClaimTemplate:
          spec:
            accessModes:
              - ReadWriteOnce
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 20Gi
```

### Init Container untuk Menyalin Dataset Awal

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: seeded-app
spec:
  initContainers:
    - name: seed
      image: busybox:1.36
      command:
        - sh
        - -c
        - |
          if [ ! -f /data/.seeded ]; then
            cp -a /seed/. /data/
            touch /data/.seeded
          fi
      volumeMounts:
        - name: data
          mountPath: /data
        - name: seed
          mountPath: /seed
          readOnly: true
  containers:
    - name: app
      image: example/app:1.4.0
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: app-data
    - name: seed
      configMap:
        name: seed-dataset
```

### VolumeSnapshot dan Restore

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: db-snapshot
  namespace: databases
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: data-postgres-0
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-postgres-0-restored
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
  dataSource:
    name: db-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

### Referensi Access Mode dan Reclaim Policy

```text
Access mode (spec.accessModes)
  ReadWriteOnce (RWO)   satu node boleh me-mount volume secara read-write
  ReadOnlyMany  (ROX)   banyak node boleh me-mount secara read-only
  ReadWriteMany (RWX)   banyak node boleh me-mount read-write (NFS, CephFS, EFS)
  ReadWriteOncePod      hanya satu pod boleh me-mount read-write (Kubernetes 1.27+)

Reclaim policy (spec.persistentVolumeReclaimPolicy)
  Retain    pertahankan volume beserta datanya setelah claim dihapus
  Delete    hapus storage penyangganya bersama claim
  Recycle   sudah usang, jangan dipakai

Fase (status.phase)
  Available  volume bebas yang menunggu claim
  Bound      claim dan volume sudah berpasangan
  Released   claim dihapus sementara policy bernilai Retain
  Failed     reclaim otomatis gagal
```

### Pod Debugging Storage

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: storage-debug
  namespace: databases
spec:
  containers:
    - name: shell
      image: nicolaka/netshoot:latest
      command: ["sleep", "infinity"]
      securityContext:
        runAsUser: 0
      volumeMounts:
        - name: data
          mountPath: /probe
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: data-postgres-0
  # Samakan batasan penjadwalan dengan workload agar topologinya cocok
  nodeSelector:
    kubernetes.io/hostname: node-a
```

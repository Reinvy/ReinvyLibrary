---
title: "Aplikasi Stateful di Kubernetes: Menjalankan Database dengan StatefulSets"
description: "Tutorial komprehensif tentang menjalankan beban kerja stateful di Kubernetes menggunakan StatefulSets, mencakup headless services, penyimpanan persisten dengan volumeClaimTemplates, dan deployment PostgreSQL serta Redis di lingkungan produksi."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Aplikasi Stateful di Kubernetes: Menjalankan Database dengan StatefulSets

## Ringkasan

Tutorial ini mengajarkan cara menjalankan beban kerja stateful di Kubernetes menggunakan StatefulSets. Anda akan mempelajari perbedaan mendasar antara StatefulSets dan Deployments, bagaimana headless services menyediakan identitas jaringan yang stabil, cara menggunakan volumeClaimTemplates untuk penyimpanan persisten, serta cara men-deploy PostgreSQL dan Redis sebagai aplikasi stateful di cluster Anda.

## Target Audiens

- DevOps Engineer, Platform Engineer, SRE, dan Backend Developer.
- Ekspektasi tingkat kemampuan pembaca: Mahir (sudah familiar dengan konsep Kubernetes seperti Pods, Deployments, Services, dan Persistent Volumes).

## Prasyarat

- Cluster Kubernetes yang berfungsi (Minikube, Kind, atau cluster berbasis cloud).
- kubectl CLI terinstal dan terkonfigurasi.
- Pemahaman dasar tentang konsep Kubernetes: Pods, Deployments, Services, Persistent Volumes, dan Persistent Volume Claims.
- Docker terinstal jika ingin mengikuti dengan image kustom.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan kapan harus menggunakan StatefulSets dibandingkan Deployments.
- Membuat headless Services untuk identitas jaringan yang stabil.
- Menggunakan volumeClaimTemplates untuk penyediaan penyimpanan persisten secara dinamis.
- Men-deploy PostgreSQL sebagai aplikasi stateful dengan penyimpanan persisten.
- Men-deploy Redis sebagai aplikasi stateful dengan persistensi data.
- Melakukan scaling dan pembaruan StatefulSets dengan aman.
- Menerapkan pertimbangan produksi untuk beban kerja stateful.

## Konteks dan Motivasi

Sebagian besar aplikasi di Kubernetes bersifat stateless — aplikasi tersebut dapat di-scale naik, turun, atau di-roll back tanpa khawatir kehilangan data. Database, cache, antrian, dan beban kerja stateful lainnya berperilaku berbeda: setiap instance memiliki identitas unik, bergantung pada penyimpanan persisten, dan mungkin memerlukan urutan startup dan shutdown yang teratur.

Kubernetes menyediakan objek **StatefulSet** khusus untuk skenario ini. Tidak seperti Deployments, StatefulSets menjamin identitas jaringan yang stabil, pembuatan dan penghentian Pod yang teratur, serta penyimpanan persisten khusus per replika. Tanpa StatefulSets, menjalankan database seperti PostgreSQL atau Redis di Kubernetes akan memerlukan solusi workaround yang rumit.

Memahami StatefulSets sangat penting bagi siapa pun yang ingin beralih dari microservices stateless ke deployment stateful tingkat produksi di Kubernetes.

## Konten Inti

### StatefulSets vs Deployments

**Deployment** dirancang untuk aplikasi stateless. Semua Pod dalam Deployment dapat dipertukarkan — mereka berbagi identitas yang sama, diberi nama acak (misalnya, `my-app-6f8d4c7b9-a1b2c`), dan dapat diganti tanpa konsekuensi.

**StatefulSet** berbeda dalam tiga aspek fundamental:

| Aspek | Deployment | StatefulSet |
|-------|-----------|-------------|
| Penamaan Pod | Akhiran hash acak | Indeks ordinal (`-0`, `-1`, `-2`) |
| Identitas jaringan | Sementara, dibuat ulang saat restart | Stabil saat dijadwalkan ulang |
| Penyimpanan | Bersama atau sementara | PVC khusus per Pod via `volumeClaimTemplates` |
| Scaling | Urutan apa pun | Berurutan (0, 1, 2, ...) |
| Pembaruan bergulir | Paralel atau acak | Berurutan (N-1, N-2, ..., 0) |

StatefulSets adalah pilihan yang tepat ketika aplikasi Anda membutuhkan:

- **Identitas jaringan yang stabil dan unik** — setiap Pod mempertahankan hostname-nya saat dijadwalkan ulang.
- **Penyimpanan persisten khusus** — setiap Pod mendapatkan PVC sendiri yang tetap terpasang selama restart.
- **Deployment dan scaling yang teratur** — Pod dibuat satu per satu dari indeks 0 ke atas, dan dihentikan dari indeks tertinggi ke bawah.

### Headless Services untuk Identitas Jaringan yang Stabil

Headless Service (`.spec.clusterIP: None`) memungkinkan penemuan Pod berbasis DNS tanpa load balancing. Setiap Pod dalam StatefulSet di belakang headless service mendapatkan catatan DNS dalam format:

```text
<nama-pod>.<nama-service>.<namespace>.svc.cluster.local
```

Untuk StatefulSet bernama `postgres` dengan 3 replika di belakang headless service `postgres-svc` di namespace `database`, catatan DNS akan menjadi:

```text
postgres-0.postgres-svc.database.svc.cluster.local
postgres-1.postgres-svc.database.svc.cluster.local
postgres-2.postgres-svc.database.svc.cluster.local
```

Aplikasi menggunakan nama DNS yang stabil ini untuk terhubung ke instance tertentu — ini penting untuk replikasi database di mana setiap node harus dapat diakses secara individual.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-svc
  labels:
    app: postgres
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    name: postgres
```

### volumeClaimTemplates untuk Penyimpanan Persisten

Bidang `volumeClaimTemplates` dalam spesifikasi StatefulSet mendefinisikan template untuk membuat Persistent Volume Claims (PVC) untuk setiap replika. Ketika StatefulSet dibuat dengan 3 replika, StatefulSet membuat 3 PVC — satu untuk setiap Pod:

```text
data-postgres-0
data-postgres-1
data-postgres-2
```

PVC ini tetap ada bahkan jika Pod dihapus atau dijadwalkan ulang, memastikan data bertahan dari kegagalan Pod.

```yaml
volumeClaimTemplates:
- metadata:
    name: data
  spec:
    accessModes: ["ReadWriteOnce"]
    resources:
      requests:
        storage: 10Gi
    storageClassName: standard
```

### Men-deploy PostgreSQL dengan StatefulSet

Mari kita bangun deployment PostgreSQL lengkap langkah demi langkah.

#### Langkah 1: Membuat Namespace

```bash
kubectl create namespace database
```

#### Langkah 2: Membuat ConfigMap untuk Konfigurasi PostgreSQL

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: database
data:
  postgresql.conf: |
    max_connections = 200
    shared_buffers = 256MB
    work_mem = 16MB
    wal_level = replica
    max_wal_senders = 5
```

#### Langkah 3: Membuat Secret untuk Kredensial

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: database
type: Opaque
data:
  POSTGRES_USER: cG9zdGdyZXM=
  POSTGRES_PASSWORD: c3VwZXJzZWNyZXQ=
  POSTGRES_DB: bXlkYg==
```

Nilai yang telah di-decode dalam base64 adalah `postgres`, `supersecret`, dan `mydb`.

#### Langkah 4: Membuat Headless Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-svc
  namespace: database
  labels:
    app: postgres
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
    name: postgres
```

#### Langkah 5: Membuat StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres-svc
  replicas: 1
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
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_PASSWORD
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_DB
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
          subPath: pgdata
        - name: config
          mountPath: /etc/postgresql/postgresql.conf
          subPath: postgresql.conf
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1"
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres"]
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: postgres-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

Detail penting dalam StatefulSet ini:

- `serviceName: postgres-svc` menghubungkan StatefulSet ke headless service.
- `volumeClaimTemplates` membuat PVC khusus 10 GiB untuk setiap replika.
- ConfigMap memasang `postgresql.conf` untuk konfigurasi kustom.
- Health probes menggunakan `pg_isready` untuk memverifikasi kesiapan database.
- Resource requests dan limits mencegah masalah noisy-neighbor.

#### Langkah 6: Menerapkan dan Memverifikasi

```bash
kubectl apply -f postgres-config.yaml
kubectl apply -f postgres-secret.yaml
kubectl apply -f postgres-svc.yaml
kubectl apply -f postgres-sts.yaml

# Periksa StatefulSet
kubectl get statefulset -n database
kubectl get pods -n database -w

# Verifikasi PVC yang dibuat
kubectl get pvc -n database

# Hubungkan ke PostgreSQL
kubectl exec -it -n database postgres-0 -- psql -U postgres -d mydb
```

### Men-deploy Redis dengan StatefulSet

Redis mendapat manfaat dari StatefulSets ketika persistensi diaktifkan atau saat menjalankan Redis Cluster dengan sharding data.

#### Langkah 1: Membuat ConfigMap untuk Konfigurasi Redis

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: database
data:
  redis.conf: |
    appendonly yes
    appendfsync everysec
    save 900 1
    save 300 10
    save 60 10000
    maxmemory 256mb
    maxmemory-policy allkeys-lru
```

#### Langkah 2: Membuat Headless Service untuk Redis

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-svc
  namespace: database
  labels:
    app: redis
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
    name: redis
```

#### Langkah 3: Membuat Redis StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: database
spec:
  serviceName: redis-svc
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - /usr/local/etc/redis/redis.conf
        ports:
        - containerPort: 6379
          name: redis
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /usr/local/etc/redis
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["redis-cli", "ping"]
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi
      storageClassName: standard
```

#### Langkah 4: Menerapkan dan Memverifikasi

```bash
kubectl apply -f redis-config.yaml
kubectl apply -f redis-svc.yaml
kubectl apply -f redis-sts.yaml

# Verifikasi
kubectl get statefulset -n database redis
kubectl get pods -n database -l app=redis

# Uji konektivitas
kubectl exec -it -n database redis-0 -- redis-cli ping
```

### Scaling StatefulSets

Melakukan scaling pada StatefulSet mirip dengan Deployment, tetapi prosesnya berurutan.

```bash
# Scale naik ke 3 replika (membuat postgres-1, lalu postgres-2)
kubectl scale statefulset postgres -n database --replicas=3

# Amati pembuatan yang berurutan
kubectl get pods -n database -l app=postgres -w

# Scale turun (menghentikan postgres-2 terlebih dahulu, lalu postgres-1)
kubectl scale statefulset postgres -n database --replicas=1
```

**Penting**: Scaling aplikasi stateful seperti database memerlukan perencanaan yang matang. Menambahkan replika ke PostgreSQL tidak secara otomatis mengonfigurasi replikasi — Anda perlu mengatur streaming replication secara terpisah. Untuk database produksi, gunakan operator seperti CloudNativePG atau Crunchy Data PostgreSQL Operator.

### Memperbarui StatefulSets

StatefulSets mendukung pembaruan bergulir dengan penghentian Pod yang berurutan.

```bash
# Set image ke versi baru
kubectl set image statefulset/postgres -n database postgres=postgres:16.2

# Pembaruan berlangsung dalam urutan terbalik: postgres-2, postgres-1, postgres-0
kubectl rollout status statefulset/postgres -n database
```

Gunakan `spec.updateStrategy.rollingUpdate.podManagementPolicy: OrderedReady` (default) untuk pembaruan berurutan, atau `Parallel` untuk pembaruan yang lebih cepat ketika aplikasi Anda dapat menanganinya.

Untuk pembaruan gaya canary, gunakan `spec.updateStrategy.type: OnDelete` untuk menghapus Pod tertentu secara manual untuk pembaruan selektif.

## Contoh Kode

### Skrip Deployment PostgreSQL Lengkap

Simpan sebagai satu file YAML untuk deployment cepat:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: database
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: database
data:
  postgresql.conf: |
    max_connections = 200
    shared_buffers = 256MB
    work_mem = 16MB
    wal_level = replica
    max_wal_senders = 5
---
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: database
type: Opaque
data:
  POSTGRES_USER: cG9zdGdyZXM=
  POSTGRES_PASSWORD: c3VwZXJzZWNyZXQ=
  POSTGRES_DB: bXlkYg==
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-svc
  namespace: database
  labels:
    app: postgres
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
    name: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres-svc
  replicas: 1
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
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_PASSWORD
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_DB
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
          subPath: pgdata
        - name: config
          mountPath: /etc/postgresql/postgresql.conf
          subPath: postgresql.conf
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1"
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres"]
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: postgres-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

### Skrip Deployment Redis Lengkap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: database
data:
  redis.conf: |
    appendonly yes
    appendfsync everysec
    save 900 1
    save 300 10
    save 60 10000
    maxmemory 256mb
    maxmemory-policy allkeys-lru
---
apiVersion: v1
kind: Service
metadata:
  name: redis-svc
  namespace: database
  labels:
    app: redis
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
    name: redis
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: database
spec:
  serviceName: redis-svc
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - /usr/local/etc/redis/redis.conf
        ports:
        - containerPort: 6379
          name: redis
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /usr/local/etc/redis
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["redis-cli", "ping"]
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi
```

### Menguji Konektivitas Aplikasi

```bash
# Dari pod sementara, hubungkan ke PostgreSQL menggunakan DNS
kubectl run pg-test --image=postgres:16 -it --rm --restart=Never -- \
  psql -h postgres-0.postgres-svc.database.svc.cluster.local -U postgres -d mydb

# Dari pod sementara, hubungkan ke Redis menggunakan DNS
kubectl run redis-test --image=redis:7-alpine -it --rm --restart=Never -- \
  redis-cli -h redis-0.redis-svc.database.svc.cluster.local ping
```

## Insight Penting

- **Gunakan StatefulSets hanya jika diperlukan**: Aplikasi stateless harus selalu menggunakan Deployments. Cadangkan StatefulSets untuk beban kerja yang membutuhkan identitas jaringan yang stabil dan penyimpanan persisten khusus — database, message queues, key-value stores, dan sistem terdistribusi.
- **volumeClaimTemplates tidak mendukung perubahan retroaktif**: Setelah StatefulSet dibuat, Anda tidak dapat mengubah spesifikasi `volumeClaimTemplates`. Untuk mengubah ukuran penyimpanan atau storage class, Anda harus membuat StatefulSet baru dan memigrasi data.
- **Headless Services wajib digunakan**: StatefulSet tanpa headless service tidak dapat menyediakan nama DNS yang stabil. Selalu buat Service dengan `ClusterIP: None` dengan selector yang cocok dengan label Pod StatefulSet.
- **Scaling aplikasi stateful tidaklah trivial**: Menambahkan replika ke StatefulSet database tidak secara otomatis mengonfigurasi replikasi. Anda harus mengatur replikasi secara manual atau menggunakan operator. Scaling turun dapat menyebabkan kehilangan data jika PVC dihapus — atur `spec.persistentVolumeClaimRetentionPolicy` jika menggunakan Kubernetes 1.27+.
- **Identitas Pod bersifat ordinal, tidak sadar konten**: `postgres-0` selalu merupakan Pod pertama. Jika `postgres-0` gagal dan dijadwalkan ulang, Pod baru dengan identitas yang sama mungkin tidak memiliki data yang sama. Gunakan `spec.podManagementPolicy: Parallel` dengan hati-hati.
- **Strategi backup itu penting**: PVC bertahan saat Pod restart tetapi dapat terhapus secara tidak sengaja. Implementasikan backup rutin menggunakan alat seperti `pg_dump` untuk PostgreSQL atau `redis-cli --rdb` untuk Redis, dan simpan backup di luar cluster.
- **Gunakan operator untuk database produksi**: Untuk PostgreSQL, pertimbangkan CloudNativePG, Crunchy Data, atau Zalando Postgres Operator. Untuk Redis, pertimbangkan Redis Operator atau Redis Enterprise. Operator ini menangani backup, replikasi, failover, dan pembaruan secara otomatis.

## Langkah Berikutnya

- Pelajari tentang **Kubernetes Operators** dan bagaimana mereka mengotomatiskan manajemen beban kerja stateful (lihat [OperatorHub.io](https://operatorhub.io/)).
- Eksplorasi **Kubernetes Storage Classes dan dynamic provisioning** untuk berbagai penyedia cloud.
- Pelajari **Keamanan Kubernetes** — Pod Security Standards, Network Policies, dan manajemen Secrets untuk beban kerja database.
- Coba deploy **Redis Cluster dengan beberapa replika StatefulSet** untuk tier caching produksi.
- Baca [Panduan Praktik Terbaik Produksi Kubernetes](../guides/kubernetes-production-best-practices_id.md) untuk panduan operasional.

## Kesimpulan

StatefulSets adalah mekanisme utama untuk menjalankan beban kerja stateful di Kubernetes. Dalam tutorial ini, Anda mempelajari perbedaan utama antara StatefulSets dan Deployments, bagaimana headless services menyediakan identitas jaringan yang stabil, dan cara menggunakan volumeClaimTemplates untuk penyimpanan persisten. Anda men-deploy PostgreSQL dan Redis sebagai aplikasi stateful dengan health checks, resource limits, dan konfigurasi siap produksi. Anda juga mempelajari pertimbangan scaling dan pentingnya menggunakan operator untuk deployment database produksi. Dengan fondasi ini, Anda dapat dengan percaya diri menjalankan beban kerja stateful di cluster Kubernetes mana pun.

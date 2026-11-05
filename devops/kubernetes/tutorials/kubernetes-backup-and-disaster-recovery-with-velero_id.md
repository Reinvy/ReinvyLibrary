---
title: "Backup dan Disaster Recovery Kubernetes dengan Velero"
description: "Tutorial berfokus produksi untuk melindungi state cluster Kubernetes dan persistent volume dengan Velero, mencakup snapshot CSI, backup level file dengan Kopia, restore hook, pemetaan namespace, ekonomi retensi, dan latihan disaster recovery otomatis."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Backup dan Disaster Recovery Kubernetes dengan Velero

## Ringkasan

Kubernetes memberi Anda self-healing untuk workload yang berjalan, tetapi tidak memberi apa pun untuk state yang sebenarnya disimpan oleh definisi dan volume. Tutorial ini membangun kemampuan backup dan disaster recovery yang lengkap di sekitar **Velero**: Anda akan memasang server dan node agent, mendefinisikan backup storage location secara deklaratif, mengambil snapshot konsisten untuk workload stateful dengan CSI, menambahkan backup level file untuk volume yang tidak dapat di-snapshot, melakukan restore ke namespace percobaan dengan pemetaan dan hook, lalu mengotomatiskan latihan recovery yang gagal dengan suara keras ketika backup terakhir sudah kedaluwarsa. Hasil akhirnya adalah cluster di mana kehilangan sebuah namespace, storage class, atau seluruh control plane hanya memakan waktu beberapa menit untuk pulih, bukan berhari-hari untuk dibangun ulang.

## Target Audiens

- Platform Engineer, SRE, dan DevOps Engineer yang sudah mengoperasikan cluster Kubernetes dan kini bertanggung jawab atas recovery time objective (RTO) serta recovery point objective (RPO) cluster tersebut.
- Ekspektasi tingkat kemampuan pembaca: Mahir. Anda sebaiknya nyaman dengan `kubectl`, manifest YAML, PersistentVolumeClaim, StorageClass, RBAC, dan konsep object storage di cloud.

## Prasyarat

- Cluster Kubernetes versi 1.27 atau lebih baru yang Anda dapat memasang CRD ke dalamnya. Cluster terkelola (EKS, GKE, AKS) maupun cluster Kind lokal sama-sama bisa; Kind memerlukan CSI driver terpasang untuk menguji jalur snapshot.
- `kubectl` yang sudah dikonfigurasi ke cluster tersebut, ditambah `helm` untuk memasang komponen snapshot CSI bila belum ada.
- CLI `velero` versi 1.14 atau lebih baru.
- Bucket object storage yang kompatibel dengan S3 beserta kredensial dengan izin baca, tulis, list, dan delete pada bucket tersebut.
- CSI driver yang mendukung snapshot (EBS CSI, GCE PD CSI, Azure Disk CSI, atau Ceph RBD) untuk bagian tutorial yang memakai snapshot.
- Pemahaman tentang bagaimana PVC terikat ke PV, karena sebagian besar kegagalan restore adalah masalah storage class dan topologi.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan bagian mana dari state cluster yang diambil Velero dan bagian mana yang sengaja diabaikan.
- Memasang Velero dengan node agent serta mengonfigurasi resource BackupStorageLocation dan VolumeSnapshotLocation secara deklaratif.
- Memilih antara snapshot volume CSI dan backup level file Kopia untuk workload tertentu, beserta alasan pilihannya.
- Membuat backup terjadwal dengan TTL, pembatasan namespace, dan label selector yang wajar sehingga biaya object storage tetap terkendali.
- Melakukan restore ke namespace percobaan menggunakan pemetaan namespace, filter resource, dan restore hook.
- Mengotomatiskan latihan disaster recovery berkala dan memberi alert pada backup yang kedaluwarsa sebelum insiden terjadi.

## Konteks dan Motivasi

Setiap tim yang menjalankan Kubernetes pada akhirnya mengalami percakapan yang sama, dan biasanya setelah sebuah insiden: *namespace-nya hilang, apakah kita punya backup?* Deployment ada di Git, jadi manifest dapat dipulihkan. Secret mungkin di Git, mungkin tidak. PersistentVolumeClaim tidak ada di Git dalam bentuk yang bermakna, dan data di baliknya jelas tidak ada. Cluster yang bisa menjadwalkan ulang pod yang crash tidak sama dengan cluster yang bisa bertahan dari `kubectl delete namespace production` yang salah atau korupsi etcd.

Mode kegagalannya membosankan dan mahal:

- Sebuah namespace terhapus oleh otomasi yang salah, membawa serta PVC dan volume di bawahnya.
- Upgrade storage class atau CSI driver merusak attachment volume dan sebagian volume menjadi tidak terbaca.
- Salah konfigurasi berskala cluster (admission webhook yang menolak semua hal, CNI yang rusak) membuat control plane tidak terpakai padahal disknya baik-baik saja.
- Insiden di satu region cloud. Datanya ada, tetapi cluster, node pool, dan binding IAM harus dibangun ulang di tempat lain.

Snapshot volume saja tidak menyelesaikan ini. Snapshot murah dan cepat, tetapi ia berada di akun dan region yang sama dengan volume, terikat pada storage class dan availability zone, serta tidak menyertakan objek YAML yang memberi makna pada data tersebut. Yang Anda inginkan adalah alat yang menangkap **keduanya** — objek API dan data volume — menyimpannya di luar cluster, dan dapat memutarnya kembali ke namespace berbeda atau cluster berbeda. Itulah tepatnya yang dilakukan Velero: ia adalah klien API Kubernetes yang menyerialisasi resource ke object storage dan mengoordinasikan backup volume melalui snapshot CSI atau uploader level file di node.

Perbedaan antara tim yang pulih dan tim yang tidak hampir tidak pernah terletak pada alatnya. Perbedaannya adalah apakah ada orang yang pernah menjalankan restore. Backup yang belum pernah direstore hanyalah hipotesis, bukan backup. Karena itu tutorial ini meluangkan waktu yang sama banyaknya untuk latihan dan deteksi kegagalan seperti untuk perintah backup itu sendiri.

## Konten Inti

### Mengapa State Cluster Lebih Sulit daripada State Database

Backup database adalah artefak tunggal yang jelas batasnya: satu dump logis atau satu set file fisik dengan jaminan konsistensi yang diketahui. State cluster adalah graf berisi ribuan objek dengan dependensi yang ditegakkan oleh API server, ditambah himpunan tak terbatas resource eksternal yang hanya dirujuk olehnya.

Pertimbangkan apa yang dibutuhkan satu `PersistentVolumeClaim` di namespace `production`: sebuah `StorageClass`, DaemonSet CSI driver beserta Deployment controller-nya, sebuah `VolumeSnapshotClass`, disk cloud di availability zone tertentu, dan sebuah `Secret` untuk workload yang me-mount-nya. Merestore PVC saja tidak berguna. Merestore semuanya dalam urutan yang salah akan menghasilkan objek yang tertahan di status `Pending` karena dependensinya belum ada.

Velero menyelesaikan urutan dengan memutar ulang resource dalam urutan prioritas yang terkendali, bukan urutan saat resource tersebut ditangkap: namespace lebih dulu, lalu CRD dan objek terkait storage, lalu workload, lalu sisanya. Velero juga mencatat metadata setiap backup (versi Kubernetes dan Velero, daftar resource, informasi volume) sehingga restore dapat dibatasi dan di-debug. Yang tidak dapat dijamin Velero adalah keberadaan dependensi eksternal. Membangun ulang CSI driver, storage class, dan peran IAM akun cloud adalah tugas Anda, dan runbook harus menyatakannya secara eksplisit.

Kesulitan kedua adalah konsistensi. Backup pada cluster yang hidup adalah snapshot dari sistem yang akhirnya konsisten: API server menyerialisasi objek satu per satu, sehingga Deployment yang tertangkap di tengah rollout bisa merujuk ReplicaSet yang baru dibuat setelah panggilan list. Ini dapat diterima karena Kubernetes dirancang untuk merekonsiliasi: Deployment yang direstore tanpa ReplicaSet-nya akan membuat ReplicaSet baru. Tempat di mana konsistensi benar-benar penting adalah data volume, dan itulah sebabnya backup volume ditangani oleh jalur terpisah yang sadar quiesce.

### Arsitektur Velero: Server, Node Agent, dan Object Storage

Velero bukan satu binary yang mengerjakan semuanya. Memahami komponennya membuat mode kegagalannya mudah dibaca.

**Server Velero** berjalan sebagai Deployment di namespace `velero`. Ia menyediakan sekumpulan custom resource — `Backup`, `Restore`, `Schedule`, `BackupStorageLocation`, `VolumeSnapshotLocation`, `DeleteBackupRequest` — dan mengawasinya. Ketika Anda membuat sebuah `Backup`, controller backup pada server akan mendaftar objek API yang relevan, mengalirkannya sebagai tarball ke object storage, lalu memperbarui status resource `Backup` dengan phase, jumlah item, peringatan, dan error.

**Node agent** berjalan sebagai DaemonSet di setiap node. Ia hanya diperlukan untuk backup volume level file (uploader yang dulu bernama Restic kini adalah Kopia). Ketika sebuah backup meminta penangkapan volume level file, node agent me-mount host path volume tersebut, menelusuri filesystem, mengenkripsi dan melakukan deduplikasi konten dengan Kopia, lalu mengunggahnya ke object storage terpisah dari tarball backup. Jalur ini tidak memerlukan dukungan snapshot CSI, sehingga menjadi cadangan untuk NFS, hostPath, dan storage in-tree yang lebih lama.

**Plugin** adalah adapter penyedia. `velero-plugin-for-aws`, `-gcp`, `-microsoft-azure`, dan `-csi` diinisialisasi sebagai init container di dalam pod server. Plugin object store mengimplementasikan `BackupStorageLocation`; plugin volume snapshotter mengimplementasikan `VolumeSnapshotLocation`; plugin CSI menerjemahkan permintaan backup volume Velero menjadi objek `VolumeSnapshot` dan `VolumeSnapshotContent` sehingga CSI driver apa pun dapat berpartisipasi tanpa plugin khusus Velero.

**Object storage adalah sumber kebenaran.** Cluster tidak menyimpan data backup. Semuanya — tarball resource, repositori Kopia, metadata backup — berada di bucket. Properti inilah yang memungkinkan pemulihan setelah kehilangan cluster total, dan properti inilah yang menjadikan kebijakan lifecycle bucket, versioning, dan kontrol akses sebagai bagian dari desain disaster recovery Anda, bukan renungan belakangan.

### Snapshot versus Backup Level File

Keputusan desain paling berkonsekuensi dalam deployment Velero adalah jalur volume mana yang dipakai setiap workload, dan jawaban yang benar biasanya "keduanya, untuk workload yang berbeda".

**Snapshot CSI** adalah salinan point-in-time dari block device, diambil oleh backend storage. Ia cepat, konsisten dengan state filesystem pada saat snapshot diambil, dan restore-nya adalah clone volume. Keterbatasannya bersifat struktural: ia memerlukan CSI driver yang mengimplementasikan snapshot, snapshot tersebut berada di akun dan region cloud yang sama, dan secara default ia tetap berada di layanan snapshot penyedia, bukan di bucket Anda. Fitur **snapshot data movement** (data mover) Velero menutup celah terakhir dengan menyalin snapshot ke object storage, dengan konsekuensi tambahan waktu dan bandwidth.

**Backup level file Kopia** menelusuri filesystem yang ter-mount melalui node agent. Ia lebih lambat dan boros CPU, tetapi bekerja pada semua jenis volume, terdeduplikasi dan tersimpan secara inkremental antar backup, langsung mendarat di bucket Anda, dan bertahan dari kehilangan region selama bucket direplikasi. Kelemahannya adalah konsistensi: file dibaca saat aplikasi mungkin sedang menulis, sehingga database memerlukan langkah quiesce atau dump logis native.

Aturan praktis yang terbukti di produksi:

- Database dan apa pun yang punya perkakas backup sendiri (PostgreSQL, MySQL, Elasticsearch, Kafka) mendapat dump logis native atau quiesce yang sadar snapshot, ditangkap oleh pre-backup hook, dan backup level file hanya pada direktori dump bila dump tidak ditulis di tempat lain.
- Volume aplikasi stateless dan object store dengan file kecil mendapat backup level file Kopia.
- Sisanya — cache build, volume sementara — tidak mendapat apa pun. Mencadangkan cache adalah cara tim membakar anggaran storage dan memperlambat setiap backup.

### Memasang Velero dengan Object Storage dan Node Agent

Pemasangan terdiri dari tiga bagian: kredensial sebagai Secret, server dengan plugin dan konfigurasi bucket, dan node agent bila backup level file diperlukan. Perintah `install` pada CLI menghasilkan manifest dan menerapkannya, yang cukup untuk cluster pertama tetapi tidak untuk armada — untuk repetabilitas, gunakan `velero install --dry-run -o yaml` lalu commit hasilnya, atau pasang melalui chart Helm dengan values di Git.

Kredensial tidak boleh masuk ke argumen CLI pada pipeline yang mencatat log-nya. Tulis file `credentials-velero` dengan key standar penyedia, buat bucket di luar jalur ini, dan biarkan plugin AWS membaca secret tersebut. Berikan identitas tepat tindakan bucket yang dibutuhkan: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`, `s3:AbortMultipartUpload`, serta `s3:GetBucketLocation`. Velero menghapus objek saat pembersihan TTL, jadi `DeleteObject` tetap diperlukan bahkan untuk identitas yang "hanya backup".

Flag penting adalah yang sering salah dipakai tim: `--use-node-agent` harus diset saat pemasangan agar backup Kopia berfungsi, `--default-volumes-to-fs-backup` mengubah default untuk setiap backup, dan `--snapshot-volumes` bernilai true secara default tetapi diam-diam turun menjadi tidak ada apa-apa ketika tidak ada `VolumeSnapshotLocation`. Selalu verifikasi dengan `velero version` dan dengan membaca `status.volumeSnapshotsAttempted` pada resource `Backup`, bukan dengan mempercayai tidak adanya error.

### Membatasi Backup: Namespace, Label, dan Resource Cluster

Backup tanpa batas pada cluster yang sibuk adalah serangan denial-of-service terhadap object storage Anda sendiri. Velero mendukung beberapa cakupan yang saling tumpang tindih, dan semuanya dapat dikombinasikan:

- `--include-namespaces` dan `--exclude-namespaces` untuk batas tingkat namespace.
- `--include-resources` dan `--exclude-resources` untuk filter jenis resource, dengan format `resource.group`.
- `--selector` untuk pemilihan berbasis label, alat yang tepat untuk mencadangkan satu tenant atau aplikasi lintas namespace.
- `--include-cluster-resources` (true, false, atau nil) untuk objek berskala cluster seperti CRD, ClusterRole, dan PersistentVolume.

Resource berskala cluster memerlukan keputusan yang disengaja. Menyertakannya membuat restore ke cluster baru menjadi mandiri, tetapi juga berarti sebuah restore dapat menimpa definisi `ClusterRole` dan `CRD` yang sudah dimiliki cluster tujuan. Pola produksi yang umum adalah dua jadwal: jadwal **cluster-state** dengan `--include-cluster-resources=true` dan daftar resource sempit (`crds`, `clusterroles`, `clusterrolebindings`, `storageclasses`, `priorityclasses`, `podsecuritypolicies`), serta jadwal **aplikasi** per tenant yang sama sekali mengecualikan resource cluster.

Mencadangkan semua namespace juga menangkap Secret release Helm, yang besar dan banyak. Mengecualikan Secret bertipe `helm.sh/release.v1` ketika Anda mengelola release melalui GitOps memberi pengurangan ukuran yang berarti, dan menghilangkan bahaya restore di mana state release lama berkonflik dengan yang sekarang.

### Semantik Restore: Pemetaan, Filter, dan Kebijakan Konflik

Restore bukan kebalikan dari backup. Ia memutar ulang objek tersimpan ke cluster yang sudah memiliki state, dan perilakunya bergantung pada tiga tombol.

**Pemetaan namespace** menulis ulang namespace setiap objek bernamespace dan merupakan fitur restore paling berguna. `--namespace-mappings production:production-drill` memungkinkan Anda membuktikan bahwa restore berjalan tanpa menyentuh namespace produksi. Ia tidak menulis ulang referensi ke namespace di dalam spesifikasi objek: subject pada `RoleBinding`, konfigurasi webhook, atau backend `Ingress` tetap menunjuk namespace asal kecuali manifest Anda menghindari namespace hardcode.

**Filter resource** mempersempit apa yang dikembalikan: `--include-resources`, `--exclude-resources`, `--selector`, dan `--include-namespaces`. Dikombinasikan dengan pemetaan, filter memungkinkan Anda merestore "hanya database dan secret-nya" ke namespace percobaan untuk menjawab pertanyaan spesifik.

**Kebijakan resource yang sudah ada** menentukan apa yang terjadi bila objek sudah ada di target: `none` (lewati, default), `update` (mencoba menambal), atau `patch` (strategic merge milik Velero). `update` adalah yang paling diinginkan banyak tim untuk restore parsial ke cluster hidup, tetapi ia akan dengan senang hati mengembalikan Deployment ke revisi yang tercadang, sehingga tidak boleh dipakai sembarangan pada namespace yang sama yang melayani trafik.

Restore hook menutup celah konsistensi. Anotasi `post.hook.restore.velero.io/command` menjalankan perintah di dalam container setelah volume container tersebut direstore, dan itulah cara Anda memutar ulang dump database atau memperbaiki kepemilikan pada volume hasil restore. Padanannya `pre.hook.backup.velero.io/command` berjalan sebelum volume ditangkap, dan itulah cara Anda melakukan quiesce aplikasi atau mem-flush in-memory store ke disk.

### Retensi, Ekonomi TTL, dan Kendali Biaya

Setiap `Backup` memiliki TTL, dan ketika kedaluwarsa Velero menghapus objek backup tersebut dari bucket, termasuk konten Kopia yang tidak lagi dirujuk backup lain. Menetapkan retensi dengan benar adalah keseimbangan antara RPO, kepatuhan, dan tagihan storage yang tumbuh diam-diam.

Backup Kopia bersifat inkremental dan terdeduplikasi, sehingga sepuluh backup harian pada volume yang sama hanya sedikit lebih mahal daripada satu — bagian mahalnya adalah backup penuh pertama. Snapshot CSI sebaliknya ditagih oleh penyedia storage per snapshot dan per blok yang berubah, serta menumpuk di akun penyedia tempat ia mudah terlupakan. Tetapkan TTL lebih pendek pada jadwal yang padat snapshot dan biarkan jadwal level file memikul retensi panjang.

Default yang wajar untuk sebagian besar tim:

- Jadwal aplikasi per jam dengan TTL 48 jam, disimpan hanya untuk pemulihan penghapusan tak sengaja.
- Jadwal aplikasi harian dengan TTL 30 hari.
- Jadwal cluster-state mingguan dengan TTL 90 hari, disimpan di bucket dengan versioning dan object lock bila kepatuhan menuntut imutabilitas.
- Satu jadwal "dingin" bulanan yang bucket-nya memiliki aturan lifecycle untuk memindahkan objek ke storage akses jarang.

Pertahanan di tingkat bucket sama pentingnya dengan TTL. Versioning ditambah kebijakan proteksi penghapusan mencegah identitas cluster yang disusupi menghancurkan riwayat backup yang justru akan dipakai untuk pulih dari penyusupan itu. Jika kredensial yang sama yang mengelola cluster dapat menghapus semua backup, desain DR memiliki satu titik kegagalan yang tidak dapat diperbaiki oleh jadwal apa pun.

### Migrasi Lintas Cluster dan Runbook Disaster Recovery

Kemampuan Velero yang paling jarang diketahui sekaligus paling berharga adalah restore ke cluster *berbeda*. Karena artefak backup berada di object storage, cluster baru hanya memerlukan akses jaringan ke bucket dan sebuah `BackupStorageLocation` dengan `accessMode: ReadOnly` agar ia tidak pernah menulis ke atau menghapus riwayat cluster sumber. Sinkronisasi backup Velero kemudian menemukan backup yang sudah ada dan menampilkannya secara lokal, dan restore berjalan persis seperti di cluster asal.

Kemampuan itulah yang membuat runbook sungguhan menjadi mungkin, dan runbook adalah deliverable yang bertahan melewati pergantian staf. Runbook yang berguna memuat, paling sedikit:

- Urutan operasi yang tepat untuk membangun ulang cluster dari nol: jaringan cloud dan node pool, CSI driver, pemasangan Velero dengan lokasi read-only, lalu restore dalam urutan dependensi.
- Nama bucket, region, dan identitas yang dipakai, dalam dokumen yang tidak hanya hidup di dalam cluster yang sedang dipulihkan.
- Perkiraan durasi restore per namespace, diukur saat latihan, bukan diduga.
- Aturan keputusan untuk restore parsial versus penuh, dan siapa yang berwenang menyatakan bencana.
- Pemilik yang bernama dan kadensi. Kuartalan adalah batas minimum yang realistis; lebih jarang dari itu dan runbook akan lapuk.

Latihan itu sendiri harus otomatis dan harus memberi alert. CronJob yang merestore backup malam sebelumnya ke namespace percobaan, menjalankan beberapa assertion, dan melaporkan kegagalan lebih bernilai daripada dashboard apa pun, karena ia menguji seluruh rantai — kredensial, akses bucket, ketersediaan snapshot, kompatibilitas storage class — pada jadwal yang tidak bergantung pada ingatan seseorang.

## Contoh Kode

### Langkah 1: Memasang CLI dan Server Velero

Pasang CLI secara lokal, buat bucket dan file kredensial, lalu pasang server dengan node agent aktif.

```bash
# Pasang CLI (contoh macOS; gunakan tarball rilis di Linux)
brew install velero

# Verifikasi versi CLI
velero version --client-only

# Buat bucket di luar jalur ini
aws s3api create-bucket \
  --bucket acme-k8s-backups \
  --region eu-central-1 \
  --create-bucket-configuration LocationConstraint=eu-central-1

# Aktifkan versioning agar penghapusan yang salah dapat dipulihkan
aws s3api put-bucket-versioning \
  --bucket acme-k8s-backups \
  --versioning-configuration Status=Enabled
```

Tulis file kredensial dengan key AWS standar. Jangan commit file ini.

```bash
cat > credentials-velero <<'EOF'
[default]
aws_access_key_id=<access-key>
aws_secret_access_key=<secret-key>
EOF

chmod 600 credentials-velero
```

Pasang server dengan plugin AWS, lokasi backup eksplisit, lokasi snapshot, dan node agent:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.10.0 \
  --bucket acme-k8s-backups \
  --backup-location-config region=eu-central-1,serverSideEncryption=AES256 \
  --snapshot-location-config region=eu-central-1 \
  --secret-file ./credentials-velero \
  --use-node-agent \
  --default-volumes-to-fs-backup \
  --wait
```

Verifikasi bahwa komponen benar-benar berjalan sebelum mempercayai apa pun:

```bash
kubectl -n velero get deploy,daemonset,pods
kubectl -n velero get backupstoragelocation,volumesnapshotlocation
velero version
```

### Langkah 2: Mendeklarasikan Storage Location sebagai Kode

Alih-alih bergantung pada flag pemasangan, pin storage location di Git agar setiap cluster dalam armada terkonfigurasi identik. Phase `Available` pada backup location adalah sinyal kesehatan yang perlu diawasi.

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: primary
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: acme-k8s-backups
    prefix: clusters/prod-eu
  config:
    region: eu-central-1
    serverSideEncryption: AES256
  accessMode: ReadWrite
  default: true
```

```yaml
apiVersion: velero.io/v1
kind: VolumeSnapshotLocation
metadata:
  name: eu-central-1
  namespace: velero
spec:
  provider: aws
  config:
    region: eu-central-1
```

Terapkan keduanya, lalu pastikan lokasi tersebut dapat dijangkau, bukan hanya ada:

```bash
kubectl apply -f velero-storage-locations.yaml
velero backup-location get
velero snapshot-location get
```

### Langkah 3: Membuat Jadwal dengan Cakupan yang Wajar

Backup terjadwal hanyalah resource `Schedule`. Pisahkan state cluster dan data aplikasi ke jadwal berbeda agar retensinya dapat berbeda.

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: apps-daily
  namespace: velero
spec:
  schedule: "0 2 * * *"
  useOwnerReferencesInBackup: false
  template:
    ttl: 720h
    storageLocation: primary
    includedNamespaces:
      - production
      - staging
    excludedResources:
      - events
      - events.events.k8s.io
    labelSelector:
      matchExpressions:
        - key: backup.acme.io/skip
          operator: DoesNotExist
    snapshotVolumes: true
    defaultVolumesToFsBackup: true
```

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: cluster-state-weekly
  namespace: velero
spec:
  schedule: "0 3 * * 0"
  template:
    ttl: 2160h
    storageLocation: primary
    includedResources:
      - customresourcedefinitions
      - clusterroles
      - clusterrolebindings
      - storageclasses
      - volumeSnapshotClasses
      - priorityclasses
    includeClusterResources: true
    snapshotVolumes: false
```

Terapkan dan verifikasi, lalu picu satu kali jalan segera alih-alih menunggu ekspresi cron:

```bash
kubectl apply -f velero-schedules.yaml
velero schedule get
velero backup create apps-daily-manual --from-schedule apps-daily --wait
velero backup describe apps-daily-manual --details
```

### Langkah 4: Mencadangkan Workload Stateful dengan Hook Quiesce

Untuk database, snapshot volume yang diambil di tengah penulisan dapat menangkap state yang robek. Kosongkan jalur tulis terlebih dahulu dengan pre-backup hook, dan verifikasi bahwa backup benar-benar memuat snapshot alih-alih melewatinya diam-diam.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: orders-postgres
  namespace: production
spec:
  serviceName: orders-postgres
  replicas: 1
  selector:
    matchLabels:
      app: orders-postgres
  template:
    metadata:
      labels:
        app: orders-postgres
      annotations:
        pre.hook.backup.velero.io/container: postgres
        pre.hook.backup.velero.io/command: '["/bin/sh", "-c", "psql -U postgres -c \"CHECKPOINT;\""]'
        pre.hook.backup.velero.io/timeout: 60s
        post.hook.backup.velero.io/container: postgres
        post.hook.backup.velero.io/command: '["/bin/sh", "-c", "echo backup-finished > /tmp/velero-last-backup"]'
    spec:
      containers:
        - name: postgres
          image: postgres:16
          args:
            - -c
            - archive_mode=on
            - -c
            - archive_command=test ! -f /var/lib/postgresql/archive/%f
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: orders-postgres-secret
                  key: password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
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

Buat backup lalu periksa hasil volume, bukan hanya phase-nya:

```bash
velero backup create orders-postgres-nightly \
  --include-namespaces production \
  --selector app=orders-postgres \
  --snapshot-volumes \
  --ttl 336h \
  --wait

velero backup describe orders-postgres-nightly --details
velero backup logs orders-postgres-nightly | tail -40
```

Backup yang sehat melaporkan `Phase: Completed` dengan `volumeSnapshotsAttempted` bukan nol dan `volumeSnapshotsCompleted` yang cocok. Backup berstatus completed dengan nol percobaan berarti jalur snapshot tidak pernah berjalan: periksa `VolumeSnapshotLocation`, CSI driver, dan apakah storage class PVC tersebut mendukung snapshot.

### Langkah 5: Restore ke Namespace Percobaan

Jangan pernah menguji restore terhadap namespace yang sedang Anda lindungi. Petakan ke namespace latihan, verifikasi datanya, lalu hapus namespace latihan tersebut.

```bash
# Restore seluruh namespace dengan nama baru
velero restore create orders-postgres-drill \
  --from-backup orders-postgres-nightly \
  --namespace-mappings production:orders-postgres-drill \
  --existing-resource-policy none \
  --wait

velero restore describe orders-postgres-drill --details
velero restore logs orders-postgres-drill
```

Pastikan workload hasil restore benar-benar menyajikan data, karena hanya itu bukti yang bermakna:

```bash
kubectl -n orders-postgres-drill get statefulset,pods,pvc
kubectl -n orders-postgres-drill exec -it orders-postgres-0 -- \
  psql -U postgres -c "select count(*) from orders;"

# Bersihkan lingkungan latihan
kubectl delete namespace orders-postgres-drill
```

Jika restore melaporkan kegagalan parsial, penyebab umumnya adalah `StorageClass` yang tidak ada, PVC yang ukuran permintaannya melebihi batas kelas, atau `VolumeSnapshotClass` yang tidak ada di cluster tujuan. `velero restore describe --details` menampilkan error per resource dan merupakan tempat pertama untuk melihat.

### Langkah 6: Mengotomatiskan Latihan dan Memberi Alert pada Backup Kedaluwarsa

Backup yang tidak pernah diverifikasi akan membusuk diam-diam. Jalankan latihan restore terjadwal dan ekspor metrik Velero agar backup yang kedaluwarsa memanggil seseorang sebelum insiden terjadi.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: velero-restore-drill
  namespace: velero
spec:
  schedule: "0 6 * * 1"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 1
      template:
        spec:
          serviceAccountName: velero-drill
          restartPolicy: Never
          containers:
            - name: drill
              image: bitnami/kubectl:1.30
              command:
                - /bin/sh
                - -c
                - |
                  set -eu
                  LATEST=$(velero backup get -o json | jq -r '[.items[] | select(.status.phase=="Completed")] | sort_by(.metadata.creationTimestamp) | last | .metadata.name')
                  echo "menjalankan latihan untuk backup: ${LATEST}"
                  velero restore create "drill-${LATEST}" \
                    --from-backup "${LATEST}" \
                    --namespace-mappings production:drill-scratch \
                    --wait
                  velero restore describe "drill-${LATEST}" --details | grep -q "Phase:  Completed"
                  kubectl -n drill-scratch rollout status deploy/orders-api --timeout=180s
                  kubectl delete namespace drill-scratch --wait=false
```

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-backup-health
  namespace: monitoring
spec:
  groups:
    - name: velero.rules
      rules:
        - alert: VeleroBackupFailed
          expr: velero_backup_last_status{job="velero"} != 1
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: Backup Velero gagal untuk jadwal {{ $labels.schedule }}
        - alert: VeleroBackupStale
          expr: (time() - velero_backup_last_successful_timestamp{job="velero"}) > 93600
          for: 30m
          labels:
            severity: critical
          annotations:
            summary: Tidak ada backup Velero yang berhasil dalam 26 jam
```

Scrape endpoint metrik Deployment `velero` pada port 8085, lalu verifikasi bahwa kedua alert benar-benar menyala ketika Anda sengaja merusak kredensial di cluster staging. Aturan alert yang belum pernah menyala sama belum terbuktinya dengan restore yang belum pernah dijalankan.

## Insight Penting

- **Backup hanya terbukti lewat restore.** Jika latihan Anda belum berjalan kuartal ini, Anda tidak memiliki rencana disaster recovery; Anda hanya memiliki jadwal backup. Otomatiskan latihan dan beri alert pada kegagalannya.
- **Object storage adalah sistem pencatatan, jadi lindungi ia.** Aktifkan versioning bucket, batasi izin hapus, dan pertimbangkan object lock untuk workload kepatuhan. Identitas cluster yang dapat menghapus seluruh bucket menghancurkan kemampuan pulih dari penyusupan yang sama.
- **Pisahkan state cluster dari data aplikasi ke jadwal berbeda.** Retensi, ukuran, dan semantik restore-nya berbeda, dan mencampurnya berarti satu pengaturan TTL selalu salah.
- **Snapshot bukan offsite.** Snapshot CSI berada di akun dan region penyedia. Gunakan snapshot data movement atau backup level file Kopia ketika bucket adalah salinan durabel Anda.
- **Lakukan quiesce pada database sebelum penangkapan.** Pre-backup hook yang mengeluarkan checkpoint, atau dump logis native yang ditulis ke volume, adalah pembeda antara restore yang langsung jalan dan yang masih membutuhkan perkakas recovery.
- **Mengecualikan event dan Secret release Helm menjaga backup kecil dan restore dapat diprediksi.** Keduanya artefak bervolume tinggi dan bernilai rendah dalam skenario restore.
- **Pemetaan namespace adalah cara teraman untuk menguji.** Selalu restore ke namespace percobaan lebih dulu; `existing-resource-policy: update` terhadap namespace hidup akan mengembalikan workload ke versi lama.
- **Resource berskala cluster adalah soal pertimbangan.** Sertakan untuk rekonstruksi cluster; kecualikan untuk restore tenant. Jangan pernah biarkan restore tenant menimpa CRD bersama.
- **Batas resource node agent adalah kendala nyata.** Backup Kopia memenuhi CPU dan I/O disk pada node; set request resource node agent dan jalankan backup besar pada jendela trafik rendah.

## Langkah Berikutnya

- Pelajari pola operator untuk mengotomatiskan latihan restore dan verifikasi backup sebagai custom resource, melanjutkan tutorial operator di pustaka ini.
- Pelajari internal storage dan persistent volume untuk memahami mengapa restore snapshot gagal antar storage class dan availability zone.
- Terapkan panduan praktik terbaik produksi mengenai PDB, autoscaling vertikal, dan observability untuk memperkuat cluster yang baru Anda buat dapat dipulihkan.
- Latih migrasi lintas cluster dengan merestore backup ke cluster Kind yang hanya berbagi bucket, yang merupakan pendekatan aman terdekat untuk failover regional.
- Tinjau silabus platform engineering untuk model keandalan yang lebih luas seputar kapasitas, upgrade, dan multi-tenancy.

## Kesimpulan

Anda telah membangun kemampuan backup dan disaster recovery yang nyata, bukan sekadar perintah terjadwal. Anda memasang Velero dengan node agent, mendeklarasikan storage location sebagai kode, membatasi jadwal berdasarkan namespace dan jenis resource, menangkap workload stateful dengan hook quiesce, merestore-nya ke namespace percobaan melalui pemetaan, dan mengotomatiskan latihan dengan alert pada backup yang kedaluwarsa.

Model mental yang perlu dipegang adalah bahwa Kubernetes melindungi ketersediaan, bukan durabilitas. Durabilitas datang dari artefak yang disimpan di luar cluster, dilindungi dari identitas cluster itu sendiri, dan dibuktikan oleh restore yang berjalan pada jadwal yang tidak perlu diingat siapa pun. Perlakukan runbook sebagai kode produksi: tinjau, uji, dan tetapkan pemiliknya.

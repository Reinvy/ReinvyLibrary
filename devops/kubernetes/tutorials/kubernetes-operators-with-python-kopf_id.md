---
title: "Membangun Kubernetes Operator dengan Python dan Kopf"
description: "Tutorial praktik membangun Kubernetes operator dalam Python menggunakan framework kopf, mencakup desain CRD, handler berbasis event, finalizer, RBAC, dan deployment di dalam cluster."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Kubernetes Operator dengan Python dan Kopf

## Ringkasan

Kubernetes operator memperluas platform dengan mengubah pengetahuan operasional menjadi kode: controller yang mengamati custom resource dan terus-menerus merekonsiliasi cluster menuju keadaan yang diinginkan. Tutorial ini mengajarkan Anda cara membangun operator sungguhan dalam Python menggunakan **kopf** (Kubernetes Operator Framework for Python). Anda akan merancang Custom Resource Definition (CRD) dengan skema struktural, mengimplementasikan handler `create`, `update`, dan `delete`, memasang finalizer untuk pembersihan yang aman, mengamankan operator dengan RBAC hak-akses-minimal, dan men-deploy-nya di dalam cluster sebagai workload biasa. Pada akhirnya, Anda akan memiliki operator yang berjalan dan menyediakan Deployment serta Service untuk setiap custom resource `Website` yang Anda buat.

## Target Audiens

- Platform Engineer, SRE, DevOps Engineer, dan Backend Developer yang ingin mengotomatisasi infrastruktur dengan Kubernetes.
- Ekspektasi tingkat kemampuan pembaca: Mahir (nyaman dengan `kubectl`, manifest YAML, Pod, Deployment, Service, dan dasar-dasar RBAC; nyaman membaca kode Python).

## Prasyarat

- Cluster Kubernetes yang berfungsi untuk pengujian — Kind atau Minikube sangat disarankan (cluster satu node sudah cukup).
- `kubectl` terinstal dan terkonfigurasi terhadap cluster tersebut.
- Python 3.10+ terinstal secara lokal (untuk membangun image operator dan linting).
- Docker (atau container runtime lain) untuk membangun dan mendorong image operator.
- Pemahaman dasar tentang resource API Kubernetes dan pola controller.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan apa itu operator dan kapan operator lebih cocok daripada manifest biasa atau Helm chart.
- Menyusun CRD dengan skema struktural, termasuk validasi, default value, dan subresource status.
- Membangun operator berbasis kopf dengan handler berbasis event untuk `create`, `update`, dan `delete`.
- Menggunakan finalizer agar penghapusan berjalan aman dan bebas dari kondisi race.
- Memberikan izin RBAC yang tepat (tidak lebih dari yang dibutuhkan) melalui ServiceAccount, Role, dan ClusterRole.
- Men-deploy operator di dalam cluster dan memverifikasi rekonsiliasi dari ujung ke ujung.

## Konteks dan Motivasi

Kubernetes hadir dengan seperangkat resource bawaan yang tetap: Pod, Deployment, Service, dan lain-lain. Begitu kebutuhan aplikasi Anda melampaui apa yang dapat diekspresikan primitif tersebut — "restart cluster saat backup ini gagal", "sediakan instance database untuk setiap tenant", "perbarui sertifikat saat tersisa 30 hari lagi" — Anda memerlukan tempat untuk menyatakan niat itu. Custom Resource memberi Anda permukaan API; operator memberi Anda perilaku di baliknya.

Contoh kanoniknya adalah etcd-operator dan Prometheus Operator: alih-alih manusia menjalankan perintah `etcdctl` atau men-skalakan Prometheus secara manual, sebuah controller mengamati resource `EtcdCluster` dan `Prometheus` lalu terus-menerus merekonsiliasi cluster. Inilah esensi pola operator: **keadaan yang diinginkan dideklarasikan di API, dan control loop membuat keadaan teramati menyamainya**.

Sebagian besar operator produksi ditulis dalam Go dengan `controller-runtime` dan `kubebuilder`, yang merupakan pilihan tepat untuk control plane yang kritis terhadap performa. Tetapi ada kelas besar pekerjaan operator — logika perekat, otomatisasi proses bisnis, tooling platform internal — yang jauh lebih cepat dibangun dan diiterasi dalam Python. **kopf** memberi Anda mesin controller (informer/watch, dispatch event, pembaruan status, peering) secara siap pakai, sehingga Anda fokus pada logika rekonsiliasi, bukan pada pemipaan (plumbing).

## Konten Inti

### Apa Sebenarnya Operator Itu

Operator adalah klien dari API Kubernetes yang menjalankan **loop rekonsiliasi**:

`Observasi → Bandingkan → Tindakan → Observasi ulang`

Controller tidak bereaksi secara imperatif terhadap setiap event; ia terus-menerus membandingkan keadaan dunia yang teramati dengan keadaan yang diinginkan yang tertulis di custom resource, lalu mengambil tindakan untuk menutup celah. Inilah sebabnya operator tangguh: jika operator crash di tengah operasi, atau seseorang menghapus resource yang dikelola di belakang layar, loop hanya akan konvergen lagi pada pass berikutnya.

Istilah **control loop** berasal dari teori kendali. Dalam istilah Kubernetes:

- **Keadaan yang diinginkan (desired state)**: bagian `spec` dari custom resource Anda plus konfigurasi apa pun yang dibaca operator.
- **Keadaan teramati (observed state)**: apa yang benar-benar ada di cluster (Deployment, Service, Pod, sistem eksternal).
- **Tindakan rekonsiliasi**: membuat, memperbarui, atau menghapus resource untuk menggerakkan keadaan teramati menuju keadaan yang diinginkan.

### Anatomi CRD — API Kustom Anda

Sebelum menulis kode controller, Anda mendefinisikan bentuk API yang baru. CRD adalah resource Kubernetes biasa (grup API `apiextensions.k8s.io/v1`). Bagian-bagian penting:

- `group` dan `names` — grup API, nama jamak/tunggal, dan nama pendek (short names).
- `versions` — evolusi skema; setiap versi mendeklarasikan `schema`, `subresources` (status/scale), dan `additionalPrinterColumns` opsional.
- `spec.preserveUnknownFields: false` — wajib untuk skema struktural (ini default untuk CRD `v1`).
- `scope` — `Namespaced` atau `Cluster`.

**Skema struktural** adalah skema OpenAPI v3 yang ditulis tangan dan digunakan API server untuk validasi serta pruning. Jika pengguna mengirim field yang tidak ada di skema, API server membuangnya (pruning) alih-alih menyimpannya. Menandai `x-kubernetes-preserve-unknown-fields: true` atau menggunakan `x-kubernetes-int-or-string` akan mengecualikan field tertentu dari pruning.

Agar operator dapat melaporkan kemajuan kembali ke pengguna, aktifkan **subresource status**: `subresources.status: {}`. Setelah aktif, hanya operator (melalui verb `update` pada subresource status) yang dapat menulis `status`; pengguna akhir hanya mendapat akses baca — artinya pengguna tidak dapat memalsukan status, sebuah properti kepercayaan inti dari API kustom.

### Keadaan yang Diinginkan dan Kontrak `spec`

Rancang `spec` sebagai *kontrak* antara pengguna dan operator. Setiap field harus:

- **Minimal** — hanya apa yang harus diputuskan pengguna (konfigurasi domain), bukan pemipaan cluster.
- **Tervalidasi** — tipe, rentang, enum, dan field wajib ditegakkan di skema.
- **Memiliki default** — field yang boleh diabaikan pengguna mendapat nilai default yang masuk akal melalui `default:` di skema atau melalui admission webhook.

Pemipaan cluster (tag image, jumlah replika yang diturunkan dari spec, label metadata) termasuk *implementasi*, bukan kontrak. Pengguna cukup berkata "saya ingin `Website` bernama `storefront` dengan `replicas: 3`" tanpa perlu tahu bagaimana operator mewujudkannya.

### Dasar-dasar kopf

kopf adalah framework yang mengubah fungsi Python biasa menjadi handler operator. Ada tiga konsep yang paling penting:

1. **Handler**: fungsi yang diberi dekorator `@kopf.on.create`, `@kopf.on.update`, `@kopf.on.delete`, atau `@kopf.on.event` generik. Handler menerima `body` (seluruh custom resource), `spec` (bagian `spec`), `logger`, dan konteks lain.
2. **Berbasis event, bukan polling**: kopf memelihara informer terhadap kind CRD. Karena menggunakan watch stream, handler terpicu oleh event API sungguhan, dan ledakan event ditangani dengan batching serta retry.
3. **Peering**: agar beberapa replika operator tidak saling menginjak, kopf menggunakan custom resource `KopfPeering` untuk pemilihan leader (leader election). Dengan satu replika ini tidak relevan, tetapi polanya sudah tersedia.

Handler mengembalikan `None` atau dict untuk disimpan ke `status` objek. Mengembalikan dict akan menggabungkannya ke `status.<handler-id>`, memberi Anda jejak audit gratis tentang apa yang dilakukan setiap handler.

### Kontrak Siklus Hidup: Create, Update, Delete

Operator yang kokoh mengimplementasikan ketiga fase siklus hidup:

- **Create**: menyediakan resource turunan (Deployment, Service, ConfigMap, panggilan API eksternal). Anak-anak dimiliki custom resource melalui `ownerReferences` sehingga Kubernetes garbage collector menghapusnya saat induk dihapus.
- **Update**: mendeteksi penyimpangan antara anak yang teramati dan keadaan yang diinginkan yang diturunkan dari `spec` baru; menambal apa yang berubah. Model berbasis event berarti `update` hanya terpicu pada perubahan nyata, tetapi Anda tetap harus membuat handler idempoten — handler dapat berjalan beberapa kali untuk satu perubahan logis (retry, requeue).
- **Delete**: karena handler berjalan setelah objek ditandai untuk dihapus, handler delete yang naif akan berlomba dengan garbage collector Kubernetes: anak operator sendiri (Deployment, Service) bisa dihapus GC sebelum handler selesai membersihkan. **Finalizer memperbaiki ini.** Finalizer adalah string di `metadata.finalizers`; selama masih ada, API server menahan objek sampai finalizer dihapus. Handler delete melakukan pembersihan, lalu menghapus finalizer — hanya setelah itu objek benar-benar hilang.

### RBAC — Hak Akses Minimal untuk Operator Anda

Operator berjalan di dalam cluster dengan ServiceAccount. RBAC mengikuti satu aturan sederhana: **berikan hanya verb dan resource yang benar-benar disentuh logika rekonsiliasi operator**. Operator khas yang membuat Deployment dan Service membutuhkan:

- `get/list/watch` pada kind custom resource miliknya (misalnya `websites.example.com`) — informer butuh akses baca.
- `get/list/watch/create/update/patch/delete` pada resource anak yang dikelolanya (Deployment, Service).
- `update` pada subresource status custom resource (untuk menulis status).
- `get/update` pada Pod miliknya sendiri hanya jika operator memeriksa kesehatannya sendiri.

Gunakan `ClusterRole` ketika operator mengelola resource berskala cluster atau mengamati custom resource lintas namespace; gunakan `Role` ketika semuanya terbatas pada namespace.

### Pola Deployment untuk Operator Itu Sendiri

Operator hanyalah workload lain:

- Sebuah `Deployment` yang menjalankan image operator, biasanya dengan 1 replika (peering kopf menangani scale-out jika Anda membutuhkan HA).
- Sebuah `ServiceAccount` yang diberi nama sesuai operator.
- Binding RBAC dari ServiceAccount tersebut ke role yang dijelaskan di atas.

Satu hal yang halus: Deployment operator *tidak boleh* dimiliki oleh custom resource yang dikelolanya (tanpa `ownerReferences` dari Deployment operator ke `Website` mana pun), karena menghapus `Website` akan ikut menghapus operator itu sendiri melalui garbage collector.

### Observability dan Debugging

- kopf mencatat setiap dispatch event pada level INFO dengan field terstruktur (`resource`, `event`, `attempt`, `retries`). `kubectl logs -f deploy/<operator>` adalah lensa debug utama Anda.
- Ekspos metrik Prometheus dengan handler `kopf.on.metric` atau server metrik bawaan.
- Setel `KOPF_LOGGING_PRETTY=1` di environment operator untuk log yang mudah dibaca selama pengembangan.

## Contoh Kode

### Langkah 1: Definisikan CRD

Operator mengelola resource `Website` — pengganti untuk semua workload aplikasi yang ingin Anda sediakan secara deklaratif:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: websites.example.com
spec:
  group: example.com
  names:
    kind: Website
    listKind: WebsiteList
    plural: websites
    singular: website
    shortNames:
      - web
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required:
                - image
              properties:
                image:
                  type: string
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 20
                  default: 2
                port:
                  type: integer
                  minimum: 1
                  maximum: 65535
                  default: 8080
            status:
              type: object
              x-kubernetes-preserve-unknown-fields: true
      subresources:
        status: {}
      additionalPrinterColumns:
        - name: Replicas
          type: integer
          jsonPath: .spec.replicas
        - name: Ready
          type: string
          jsonPath: .status.ready
```

Terapkan dan pastikan API melayani kind baru:

```bash
kubectl apply -f crd.yaml
kubectl get crd websites.example.com
kubectl get websites  # belum ada resource, tetapi kind sudah dikenali
```

### Langkah 2: Operator kopf

```python
import kopf
import kubernetes

# Helper: membuat manifest Deployment dari spec Website.
def build_deployment(name, namespace, spec, labels):
    replicas = spec.get("replicas", 2)
    image = spec["image"]
    port = spec.get("port", 8080)
    return {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {
            "name": name,
            "namespace": namespace,
            "labels": labels,
        },
        "spec": {
            "replicas": replicas,
            "selector": {"matchLabels": labels},
            "template": {
                "metadata": {"labels": labels},
                "spec": {
                    "containers": [
                        {
                            "name": "website",
                            "image": image,
                            "ports": [{"containerPort": port}],
                        }
                    ]
                },
            },
        },
    }

def build_service(name, namespace, labels, port):
    return {
        "apiVersion": "v1",
        "kind": "Service",
        "metadata": {"name": name, "namespace": namespace, "labels": labels},
        "spec": {
            "selector": labels,
            "ports": [
                {"name": "http", "port": 80, "targetPort": port},
            ],
        },
    }


@kopf.on.create("example.com", "v1", "websites")
def on_create(body, spec, name, namespace, logger, **kwargs):
    labels = {"app": name, "managed-by": "website-operator"}
    api = kubernetes.client.AppsV1Api()
    deployment = build_deployment(name, namespace, spec, labels)
    api.create_namespaced_deployment(namespace=namespace, body=deployment)
    service_api = kubernetes.client.CoreV1Api()
    service = build_service(name, namespace, labels, spec.get("port", 8080))
    service_api.create_namespaced_service(namespace=namespace, body=service)
    logger.info(f"Provisioned Deployment and Service for {name}")
    return {"ready": "true"}


@kopf.on.update("example.com", "v1", "websites")
def on_update(body, spec, name, namespace, logger, **kwargs):
    labels = {"app": name, "managed-by": "website-operator"}
    api = kubernetes.client.AppsV1Api()
    deployment = build_deployment(name, namespace, spec, labels)
    api.replace_namespaced_deployment(name=name, namespace=namespace, body=deployment)
    logger.info(f"Updated Deployment {name} to match new spec")
    return {"ready": "true"}


@kopf.on.delete("example.com", "v1", "websites")
def on_delete(name, namespace, logger, **kwargs):
    # Penghapusan berbasis finalizer: anak-anak dibersihkan via ownerReferences;
    # handler ini ada untuk pembersihan eksternal/sistem sebelum objek menghilang.
    logger.info(f"Deleting dependencies for {name}")
    return {"ready": "false"}
```

### Langkah 3: Pasang Ownership dan Finalizer

Tambahkan finalizer dan owner references agar penghapusan aman serta otomatis. Finalizer menahan `Website` tetap hidup sampai handler delete selesai; owner references membuat garbage collector Kubernetes menghapus Deployment dan Service saat induknya hilang:

```python
@kopf.on.create("example.com", "v1", "websites")
def on_create(body, spec, name, namespace, logger, **kwargs):
    api = kubernetes.client.AppsV1Api()
    labels = {"app": name, "managed-by": "website-operator"}

    owner = kubernetes.client.V1OwnerReference(
        api_version="example.com/v1",
        kind="Website",
        name=name,
        uid=body["metadata"]["uid"],
    )

    deployment = build_deployment(name, namespace, spec, labels)
    deployment["metadata"]["ownerReferences"] = [owner]
    api.create_namespaced_deployment(namespace=namespace, body=deployment)

    service = build_service(name, namespace, labels, spec.get("port", 8080))
    service["metadata"]["ownerReferences"] = [owner]
    kubernetes.client.CoreV1Api().create_namespaced_service(
        namespace=namespace, body=service
    )

    logger.info(f"Provisioned and owned Deployment + Service for {name}")
    return {"ready": "true"}
```

`uid` diambil dari body custom resource yang hidup (bukan dari spec) — inilah yang membuat owner reference valid. Tanpa finalizer, kopf tetap menjalankan handler delete, tetapi Anda kehilangan jaminan bahwa pembersihan *selesai* sebelum objek hilang; dengan `@kopf.on.delete` yang dikombinasikan dengan anotasi finalizer, kopf mengelola siklus hidup finalizer untuk Anda secara otomatis.

### Langkah 4: Kemas dan Deploy

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY operator.py .
CMD ["kopf", "run", "/app/operator.py"]
```

```text
requirements.txt:
kopf
kubernetes
```

Bangun dan dorong image, lalu deploy operator dengan ServiceAccount dan RBAC miliknya sendiri:

```bash
docker build -t <registry-anda>/website-operator:latest .
docker push <registry-anda>/website-operator:latest
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: website-operator
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: website-operator
rules:
  - apiGroups: ["example.com"]
    resources: ["websites", "websites/status"]
    verbs: ["get", "list", "watch", "update", "patch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: website-operator
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: website-operator
subjects:
  - kind: ServiceAccount
    name: website-operator
    namespace: default
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: website-operator
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: website-operator
  template:
    metadata:
      labels:
        app: website-operator
    spec:
      serviceAccountName: website-operator
      containers:
        - name: operator
          image: <registry-anda>/website-operator:latest
          env:
            - name: KOPF_LOGGING_PRETTY
              value: "1"
```

### Langkah 5: Uji Loop Rekonsiliasi

Buat `Website` dan amati operator menyediakan resource anak:

```bash
kubectl apply -f - <<'EOF'
apiVersion: example.com/v1
kind: Website
metadata:
  name: storefront
spec:
  image: nginx:1.27
  replicas: 3
EOF

kubectl get websites
kubectl get deploy,svc -l managed-by=website-operator
kubectl logs -f deploy/website-operator
```

Alur yang diharapkan di log: operator menerima event `create` untuk `storefront`, membuat Deployment dan Service, lalu menulis `status.ready: "true"`. Men-skalakan resource (`kubectl patch websites storefront --type merge -p '{"spec":{"replicas":5}}'`) memicu handler `update`, dan `kubectl delete websites storefront` menjalankan jalur delete dengan finalizer.

## Insight Penting

- **Idempotensi tidak bisa ditawar**: handler dapat berjalan beberapa kali untuk satu perubahan logis (replay watch, retry, requeue). Setiap handler harus aman dijalankan dua kali — gunakan semantik `replace`/`patch` dan periksa keberadaan sebelum membuat.
- **Ownership di tempat yang tepat**: anak-anak (`Deployment`, `Service`) membawa owner references ke custom resource sehingga garbage collector membersihkannya. Deployment operator itu sendiri TIDAK boleh dimiliki custom resource mana pun.
- **Finalizer sebelum pembersihan**: tanpa finalizer, API server dapat menghapus custom resource (dan membersihkan anak-anaknya via GC) sebelum handler delete selesai. Menyerahkan pengelolaan finalizer kepada kopf menjaga siklus hidup tetap benar tanpa boilerplate tambahan.
- **Status adalah suara operator**: tulis nilai kembalian handler yang bermakna ke `status` — pengguna dan `kubectl get` (melalui printer columns) bergantung padanya. Jangan pernah membiarkan pengguna menulis status langsung; subresource status ada untuk mencegah pemalsuan.
- **Perhatikan biaya handler `update`**: `replace_namespaced_deployment` melakukan penggantian objek penuh dan menaikkan `resourceVersion` setiap kali. Untuk jalur yang panas, lebih baik gunakan panggilan `patch` strategic-merge yang hanya menyentuh field yang berubah untuk menghindari churn pada API server.
- **Pertimbangan performa**: operator Python cocok untuk control loop yang merekonsiliasi dalam skala waktu manusia (detik hingga menit). Untuk controller sub-detik dengan churn tinggi atas banyak objek, tumpukan Go `controller-runtime`/`kubebuilder` adalah pilihan yang lebih baik — gunakan kembali desain CRD yang sama, ganti runtime-nya.
- **Peering untuk HA**: dengan `replicas: N` (N > 1), kopf menggunakan resource `KopfPeering` untuk memilih satu operator aktif dan menghindari rekonsiliasi ganda. Aktifkan dengan memberi operator akses ke resource `kopf.dev`.

## Langkah Berikutnya

- Perdalam sudut pandang platform engineering dengan [Silabus Kubernetes Lanjutan](../../syllabi/advanced-kubernetes-syllabus_id.md), khususnya Modul 3 tentang CRD dan operator (kubebuilder, Operator SDK, OLM).
- Kembangkan operator ini dengan field `status.observedGeneration` dan bandingkan dengan `metadata.generation` untuk semantik pelacakan generasi yang sebenarnya.
- Kemas operator untuk distribusi dengan bundle OLM (Operator Lifecycle Manager) dan scorecard.
- Tambahkan handler `kopf.on.metric` dan `ServiceMonitor` Prometheus untuk mengekspos latensi rekonsiliasi dan kedalaman antrean.

## Kesimpulan

Anda telah membangun Kubernetes operator yang lengkap dalam Python: CRD struktural, handler `create`/`update`/`delete` berbasis event dengan kopf, ownership yang aman dan penghapusan berbasis finalizer, RBAC hak-akses-minimal, serta Deployment di dalam cluster yang merekonsiliasi resource `Website` dari ujung ke ujung. Pola operator mengubah playbook operasional menjadi kode yang berjalan terus-menerus dan menyembuhkan diri sendiri — dan kopf memungkinkan Anda menulis kode itu dalam bahasa yang sudah dikuasai tim Anda. Prinsip desain yang sama (skema struktural, rekonsiliasi idempoten, owner references, subresource status) berlaku langsung jika Anda nanti memindahkan operator ke Go dengan kubebuilder.

---
title: "Panduan Penjadwalan dan Penempatan Workload Kubernetes"
description: "Panduan praktis untuk mengendalikan lokasi pod Kubernetes dijalankan — node affinity, taint dan toleration, topology spread constraint, priority dan preemption, eviction berbasis QoS, descheduling, serta penyetelan scheduler — lengkap dengan alur kerja yang dapat diulang untuk mengaudit dan menegakkan aturan penempatan lintas node pool."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Penjadwalan dan Penempatan Workload Kubernetes

## Pendahuluan

Sebagian besar insiden Kubernetes yang tampak seperti masalah kapasitas sebenarnya adalah masalah penempatan. Sebuah cluster bisa memiliki 40% CPU menganggur dan tetap menolak menjalankan pod, karena pod tersebut membutuhkan empat core pada satu node, atau sebuah GPU, atau zona yang masih memiliki ruang. Sebaliknya, cluster bisa terlihat "hijau" dari sisi utilisasi namun tetap rapuh, karena seluruh replika sebuah service mendarat di node yang sama — atau rak yang sama — sehingga satu kegagalan perangkat keras menjatuhkan seluruh service.

kube-scheduler mengambil semua keputusan ini, dan ia melakukannya dengan pandangan yang sempit: ia hanya melihat **resource request**, label node, taint, dan aturan penempatan yang dideklarasikan pada pod. Ia tidak pernah melihat pemakaian CPU atau memori yang sebenarnya. Fakta tunggal inilah yang menjadi dasar sebagian besar panduan ini — jika request Anda salah, seluruh keputusan penempatan di hilirnya juga salah.

Scheduler bekerja dalam dua fase untuk setiap pod yang tertunda:

1. **Filtering** — menyingkirkan node yang tidak mungkin menampung pod sama sekali (resource allocatable tidak cukup, taint tanpa toleration yang sesuai, node selector tidak terpenuhi, konflik port, topologi volume).
2. **Scoring** — memberi peringkat pada node yang lolos dengan plugin berbobot (keseimbangan resource, lokalitas image, topology spread, inter-pod affinity) lalu mengikat pod ke node dengan skor tertinggi.

Dengan demikian, rekayasa penempatan memiliki dua tuas: **constraint deklaratif pada workload** (affinity, spread, toleration, priority) dan **konfigurasi scheduler itu sendiri** (profile, bobot plugin, strategi scoring). Panduan ini membahas keduanya, sesuai urutan penerapannya pada cluster nyata.

Sebuah pembedaan yang berguna untuk diingat sepanjang panduan ini:

- **Aturan keras** (`requiredDuringScheduling...`, `DoNotSchedule`, taint tanpa toleration) membuat pod berstatus *pending* ketika tidak dapat dipenuhi. Ini adalah constraint kebenaran.
- **Aturan lunak** (`preferredDuringScheduling...`, `ScheduleAnyway`, bobot scoring) hanya memberi dorongan kepada scheduler. Aturan ini gagal secara bertahap (graceful).

Cluster produksi umumnya rusak karena tim terlalu banyak memakai aturan keras. Praktik-praktik di bawah ini berusaha menjaga kumpulan aturan keras sekecil mungkin.

## Praktik Terbaik

### 1. Perlakukan resource request sebagai kontrak penjadwalan

Scheduler melakukan bin-packing berdasarkan request, sehingga request bukan sekadar petunjuk — ia adalah kontrak antara workload dan cluster. Ada dua konsekuensi. Pertama, request yang terlalu kecil memungkinkan overcommit berbahaya: node melaporkan CPU allocatable yang melimpah sementara kubelet melakukan eviction terhadap pod karena tekanan memori. Kedua, request yang terlalu besar membuat node terlihat tidak termanfaatkan sementara pod tetap pending.

Tetapkan request berdasarkan persentil pemakaian yang teramati (CPU p95, memori p99 untuk service yang sensitif terhadap latensi), jangan pernah berdasarkan perkiraan, dan tinjau ulang secara berkala. Memori tidak dapat dikompresi: container yang melewati memory limit langsung di-OOM-kill, sehingga memory request harus mendekati pemakaian steady-state yang nyata. CPU dapat dikompresi, sehingga CPU request boleh berada di bawah puncak selama node tidak rutin jenuh.

### 2. Sasaran node pool menggunakan label, bukan node individual

`nodeSelector` dan `nodeAffinity` harus merujuk pada *kelas* node — `node-pool=memory-optimized`, `accelerator=nvidia-a100`, `arch=arm64` — dan tidak pernah pada hostname. Nama node berubah saat upgrade dan autoscaling; label pool stabil dan merupakan label yang sama yang dipakai cluster autoscaler Anda ketika memilih template node saat scale-up.

Sebuah konsekuensi lanjutan: jika node selector sebuah workload tidak cocok dengan template node mana pun di seluruh group autoscaling, workload tersebut akan pending selamanya. Miliki taksonomi label yang terdokumentasi dan validasi selector baru terhadap taksonomi itu sebelum rollout.

### 3. Utamakan topology spread constraint dibanding anti-affinity yang berat

`podAntiAffinity` dengan `requiredDuringSchedulingIgnoredDuringExecution` adalah cara umum untuk menyatakan "jangan tempatkan replika saya bersama", dan pada skala besar ini adalah jebakan: scheduler mengevaluasi setiap pod yang sudah ada saat memfilter node kandidat, sehingga anti-affinity wajib pada namespace besar menambah pekerjaan kuadratik pada siklus penjadwalan dan dapat membuat pod pending ketika tidak ada node yang memenuhi.

`topologySpreadConstraints` menyatakan maksud yang sama secara deklaratif dan membiarkan Anda memilih mode kegagalan: `maxSkew: 1` pada `topology.kubernetes.io/zone` dengan `whenUnsatisfiable: ScheduleAnyway` memberikan distribusi merata bila memungkinkan dan tetap menjadwalkan ketika cluster sedang terkendala. Gunakan spread constraint sebagai default untuk distribusi replika, dan sisakan anti-affinity wajib untuk kasus kecil yang cakupannya ketat, misalnya dua singleton yang saling bertentangan.

### 4. Reservasi kapasitas khusus dengan taint dan toleration

Label saja tidak mereservasi apa pun — node berlabel `workload=payments` akan dengan senang hati menerima pod yang tidak berkaitan kecuali node tersebut juga diberi taint. Pasangan keduanya adalah polanya:

- Beri **taint** pada node (`dedicated=payments:NoSchedule`) agar workload umum tersaring.
- Beri **toleration** taint tersebut hanya pada workload yang memang menjadi anggota pool itu.
- Pilih node pool dengan affinity agar workload bertoleransi itu benar-benar memilih pool tersebut dan tidak melayang ke node umum.

Inilah cara membangun isolasi untuk service yang sensitif latensi, pool GPU, workload dengan cakupan kepatuhan, dan add-on sistem. Gunakan `NoSchedule` untuk isolasi; gunakan `NoExecute` hanya bila Anda juga ingin mengevakuasi pod yang sudah berjalan, dan pasangkan dengan `tolerationSeconds` agar eviction berlangsung mulus, bukan mendadak.

### 5. Modelkan pemeliharaan dan kegagalan dengan PodDisruptionBudget

Aturan penempatan menjelaskan di mana pod *boleh* berjalan; PodDisruptionBudget menjelaskan berapa banyak pod yang boleh *dihapus sekaligus*. Tanpa PDB, drain node saat upgrade cluster akan mengevakuasi seluruh replika sebuah service secara bersamaan. Dengan PDB yang terlalu ketat (`minAvailable` sama dengan jumlah replika), drain akan memblokir selamanya dan upgrade cluster macet.

Tetapkan PDB dengan aritmetika yang sama seperti jumlah replika dan spread Anda: dengan tiga replika di tiga zona dan `minAvailable: 2`, satu node dapat di-drain pada satu waktu. Descheduler dan drain node sama-sama menghormati PDB, yang menjadikannya pagar pengaman untuk setiap gangguan sukarela di cluster.

### 6. Gunakan priority class untuk menyandikan kekritisan bisnis

PriorityClass melakukan dua hal: mengurutkan antrean penjadwalan (pod berprioritas lebih tinggi dipertimbangkan lebih dulu saat cluster penuh) dan memungkinkan **preemption** — scheduler dapat mengevakuasi pod berprioritas lebih rendah untuk memberi ruang. Ini tuas yang kuat sekaligus berbahaya.

Sisakan prioritas tinggi untuk workload yang benar-benar kritis (ingress controller, DNS, agen monitoring, jalur pembayaran). Beri job batch dan best-effort prioritas rendah atau negatif agar melepaskan kapasitas saat tertekan. Untuk workload yang perlu diurutkan tetapi tidak boleh mengevakuasi apa pun, set `preemptionPolicy: Never` — ini memberi Anda pengurutan antrean tanpa risiko gangguan apa pun.

### 7. Samakan request dan limit untuk workload yang sensitif latensi

QoS class diturunkan, bukan dideklarasikan: CPU dan memori request yang identik dengan limit pada setiap container membuat pod menjadi `Guaranteed`, request di bawah limit membuatnya `Burstable`, dan tanpa request sama sekali membuatnya `BestEffort`. Kubelet melakukan eviction dengan urutan kebalikannya ketika node tertekan — BestEffort lebih dulu, lalu Burstable, dan Guaranteed terakhir.

Untuk service yang tidak boleh mengalami eviction karena tekanan memori, jadikan pod Guaranteed. Untuk pekerjaan batch yang eviction-nya murah, BestEffort atau Burstable longgar tidak masalah dan justru meningkatkan efisiensi packing. Mencampur keduanya secara sengaja di seluruh cluster adalah yang mencegah lonjakan memori pada tingkat node berubah menjadi gangguan yang terlihat pengguna.

### 8. Jalankan descheduler alih-alih menempatkan pod secara manual

Penempatan diputuskan sekali pada saat penjadwalan, lalu tidak pernah ditinjau ulang oleh scheduler. Selama berhari-hari, rolling update, peristiwa autoscaling, dan penggantian node menghasilkan cluster yang secara teknis valid namun tidak seimbang: sebagian node berada pada 90% request, sebagian lain pada 20%.

Descheduler menutup celah tersebut. Secara berkala ia mencari pod yang melanggar kebijakan — pod duplikat pada satu node, node yang jauh di bawah ambang utilisasi, pod yang melanggar topology spread setelah scale-up — lalu mengevakuasinya agar scheduler dapat menempatkannya kembali. Karena ia mengevakuasi, bukan memindahkan, PDB harus ada lebih dulu, dan guardrail seperti `nodeFit` atau pembatasan jumlah eviction harus diaktifkan agar kebijakan yang buruk tidak mengosongkan sebuah node.

### 9. Debug pod pending dari event scheduler, bukan dari dugaan

Pod yang pending selalu memiliki alasan, dan scheduler menuliskannya ke event pod tersebut. `kubectl describe pod` menampilkan event `FailedScheduling` dengan filter persis yang menolak setiap node (`0/24 nodes are available: 6 Insufficient cpu, 18 node(s) didn't match Pod's node affinity/selector`). Pesan itu adalah jawaban otoritatifnya.

Penyebab umum, dalam urutan perkiraan frekuensi: request lebih besar daripada allocatable node mana pun, node selector atau affinity tidak cocok dengan node mana pun, toleration yang hilang untuk sebuah taint, anti-affinity wajib yang sudah dilanggar pod yang ada, PVC terikat pada zona yang tidak memiliki node dengan kapasitas, serta quota atau limit range yang memblokir admission (yang muncul sebagai event berbeda sama sekali).

### 10. Setel profil scheduler sesuai tujuan packing cluster

Secara default plugin `NodeResourcesFit` memberi skor node dengan `LeastAllocated`, yang menyebarkan pod. Itu default yang tepat untuk keandalan, tetapi pilihan yang salah untuk cluster yang sensitif biaya dengan workload homogen, di mana `MostAllocated` (bin packing) menurunkan jumlah node yang dibutuhkan. Kubernetes 1.31 juga menambahkan `RequestedToCapacityRatio` sebagai strategi scoring kelas satu.

Setel ini pada tingkat profile di `KubeSchedulerConfiguration` — bukan per workload — dan pasangkan dengan kebijakan descheduler yang sejalan. Menjalankan `MostAllocated` tanpa descheduler cenderung menghasilkan node panas seiring waktu; menjalankan `LeastAllocated` pada cluster yang dioptimalkan biaya akan memboroskan node.

### 11. Pisahkan workload yang sensitif gangguan dari yang toleran gangguan

Node pool spot dan preemptible adalah tuas biaya terbesar di sebagian besar cluster, tetapi hanya aman untuk workload yang dapat kehilangan node kapan saja. Nyatakan itu sebagai penempatan: pool spot khusus dengan taint tersendiri, toleration hanya pada workload stateless dan batch, `terminationGracePeriodSeconds` yang panjang ditambah handler shutdown yang sadar preemption, serta priority class yang memungkinkan scheduler bereaksi cepat.

Jangan pernah membiarkan database stateful atau controller singleton menoleransi taint spot secara tidak sengaja. Satu toleration yang terlalu luas di Helm chart bersama sudah cukup untuk membocorkan workload kritis ke kapasitas yang dapat diinterupsi.

## Langkah Implementasi

### Langkah 1: Audit penempatan saat ini dan akurasi request

Mulai dari data. Keluarkan kondisi request versus pemakaian per node dan per workload, lalu cari dua tanda masalah penempatan: node dengan request teralokasi tinggi tetapi pemakaian nyata rendah, serta pod yang request-nya lebih dari 2x pemakaian p95-nya.

```bash
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
CPU_ALLOC:.status.allocatable.cpu,\
MEM_ALLOC:.status.allocatable.memory,\
POOL:.metadata.labels.node-pool

kubectl describe node <node-name> | sed -n '/Allocated resources/,/Events/p'

kubectl top pods -A --sort-by=memory | head -30
```

Untuk tampilan per workload, bandingkan request yang dideklarasikan dengan pemakaian teramati dan hitung rasionya. Apa pun di atas sekitar 1,5 untuk CPU atau 1,2 untuk memori adalah kandidat untuk right-sizing.

```bash
kubectl get pods -A -o json > /tmp/pods.json
python3 - <<'PY'
import json
d = json.load(open('/tmp/pods.json'))
for p in d['items']:
    cpu = mem = 0
    for c in p['spec']['containers']:
        r = c.get('resources', {}).get('requests', {})
        cpu += int(r.get('cpu', '0').rstrip('m')) if r.get('cpu', '').endswith('m') else int(float(r.get('cpu', 0)) * 1000)
        m = r.get('memory', '0')
        mem += int(m[:-2]) // 1024 if m.endswith('Mi') else 0
    print(f"{p['metadata']['namespace']}/{p['metadata']['name']}: cpu={cpu}m mem={mem}Mi")
PY
```

Catat workload yang tidak memiliki request sama sekali. Itu adalah BestEffort dan sekaligus paling mungkin dievakuasi serta paling mungkin merusak akuntansi scheduler.

### Langkah 2: Definisikan taksonomi node pool

Sebelum menulis aturan penempatan apa pun, tentukan pool apa yang ada dan beri masing-masing label yang stabil plus taint bila isolasi dibutuhkan. Taksonomi yang layak untuk cluster ukuran menengah:

```text
pool          labels                                  taint
system        node-pool=system                        dedicated=system:NoSchedule
general       node-pool=general                       (tidak ada)
memory        node-pool=memory, instance=m8i.4xlarge   dedicated=memory:NoSchedule
gpu           node-pool=gpu, accelerator=nvidia-a10g  dedicated=gpu:NoSchedule
spot          node-pool=spot, capacity-type=spot      capacity-type=spot:NoSchedule
```

Terapkan label pada tingkat node group / managed node pool (EKS managed node group, GKE node pool, AKS node pool, atau NodePool Karpenter), bukan secara manual pada node individual, agar node baru mewarisinya secara otomatis.

```bash
kubectl label node <node> node-pool=memory --overwrite
kubectl taint node <node> dedicated=memory:NoSchedule
```

### Langkah 3: Sesuaikan request dan tetapkan QoS secara sengaja

Tulis ulang manifest workload agar request mencerminkan pemakaian terukur, dan buat maksud QoS menjadi eksplisit. Pod Guaranteed menetapkan request sama dengan limit pada setiap container:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  namespace: payments
spec:
  replicas: 4
  selector:
    matchLabels:
      app: payments-api
  template:
    metadata:
      labels:
        app: payments-api
    spec:
      containers:
        - name: api
          image: registry.example.com/payments-api:1.14.2
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
```

Worker batch dan best-effort sebaliknya diberi limit longgar dengan request moderat, menerima QoS Burstable:

```yaml
    resources:
      requests:
        cpu: "250m"
        memory: "256Mi"
      limits:
        cpu: "2"
        memory: "1Gi"
```

Setelah menerapkan, konfirmasi kelas yang dihasilkan alih-alih mengasumsikannya:

```bash
kubectl get pod -n payments -l app=payments-api -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.qosClass}{"\n"}{end}'
```

### Langkah 4: Sebarkan replika lintas zona dan node

Tambahkan topology spread constraint pada setiap workload dengan banyak replika. Penyebaran lintas zona melindungi dari gangguan zona; penyebaran lintas node melindungi dari kegagalan satu node. Lakukan keduanya, dan jaga keduanya tetap lunak agar cluster yang terkendala masih dapat menjadwalkan.

```yaml
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: payments-api
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: payments-api
```

Gunakan `minDomains` ketika Anda ingin perhitungan skew memperhitungkan zona yang belum memiliki node, dan `nodeTaintsPolicy: Honor` (1.26+) ketika node ber-taint sebaiknya dikecualikan dari perhitungan domain spread.

```bash
kubectl get pods -n payments -l app=payments-api -o wide
kubectl get pods -n payments -l app=payments-api \
  -o custom-columns=POD:.metadata.name,NODE:.spec.nodeName --no-headers | sort -k2
```

Jika seluruh replika melaporkan node yang sama, constraint tidak bekerja — periksa apakah label selector benar-benar cocok dengan label pod.

### Langkah 5: Nyatakan aturan co-location dan pemisahan

Untuk workload yang benar-benar perlu berdekatan atau berjauhan, gunakan affinity dengan cakupan sempit. Pola sidecar cache ingin cache berada di node yang sama; front end yang sensitif latensi ingin menghindari berbagi node dengan job batch yang bising.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: checkout-api
  template:
    metadata:
      labels:
        app: checkout-api
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    workload-type: batch
                topologyKey: kubernetes.io/hostname
      containers:
        - name: api
          image: registry.example.com/checkout-api:3.2.0
          resources:
            requests:
              cpu: "1"
              memory: "1Gi"
```

Pertahankan `antiAffinity` pada `preferred` di sini — aturan keras terhadap label batch akan membuat pod API pending setiap kali armada batch memenuhi semua node. Sisakan `required` untuk kasus yang pelanggarannya benar-benar tidak dapat diterima, dan batasi label selector seketat mungkin.

### Langkah 6: Tambahkan priority class dan lindungi jalur kritis

Buat sekumpulan kecil priority class yang terdokumentasi, bukan satu per tim. Tiga atau empat tingkat hampir selalu cukup:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: platform-critical
value: 1000000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Ingress, DNS, dan add-on cluster."
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-service
value: 100000
globalDefault: true
description: "Default untuk service yang menghadap pelanggan."
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-ordered
value: -100
preemptionPolicy: Never
description: "Pekerjaan batch yang mengantre di bawah service tetapi tidak pernah mem-preempt."
```

Lalu lampirkan kelas tersebut ke workload yang membutuhkannya dan verifikasi urutan yang dihasilkan:

```bash
kubectl get priorityclass
kubectl get pod -n kube-system -o custom-columns=POD:.metadata.name,PRIORITY:.spec.priority
```

Jangan pernah menetapkan `globalDefault: true` pada apa pun di atas tingkat service normal — prioritas default yang tinggi secara diam-diam menjadikan setiap pod baru sebagai preemptor.

### Langkah 7: Deploy descheduler untuk penyeimbangan berkelanjutan

Jalankan descheduler sebagai CronJob dengan kebijakan yang eksplisit dan konservatif. Mulai dari kebijakan yang memperbaiki drift nyata dan hindari yang agresif sampai Anda memercayai perilakunya:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: descheduler-policy
  namespace: kube-system
data:
  policy.yaml: |
    apiVersion: descheduler/v1alpha2
    kind: DeschedulerPolicy
    profiles:
      - name: default
        pluginConfig:
          - name: DefaultEvictor
            args:
              evictSystemCriticalPods: false
              evictFailedBarePods: false
              nodeFit: true
          - name: RemoveDuplicates
          - name: LowNodeUtilization
            args:
              thresholds:
                cpu: 20
                memory: 20
                pods: 20
              targetThresholds:
                cpu: 70
                memory: 70
                pods: 70
          - name: RemovePodsViolatingTopologySpreadConstraint
        plugins:
          balance:
            enabled:
              - RemoveDuplicates
              - LowNodeUtilization
              - RemovePodsViolatingTopologySpreadConstraint
```

`nodeFit: true` membuat descheduler melewati pod yang tidak dapat ia tempatkan di tempat lain — tanpanya, cluster yang sibuk dapat mengevakuasi pod yang kemudian pending. Jalankan pada jadwal sepi dan pantau eviction selama minggu pertama:

```bash
kubectl create job --from=cronjob/descheduler descheduler-manual -n kube-system
kubectl logs -n kube-system job/descheduler-manual | grep -i "evict"
```

### Langkah 8: Setel profil scheduler sesuai tujuan packing

Tentukan apakah cluster dioptimalkan untuk ketahanan (menyebar) atau biaya (bin-pack), lalu sandikan pilihan itu sekali dalam profil scheduler dan terapkan ke control plane. Profil berikut mempertahankan scoring default untuk sebagian besar workload namun menambah bobot lebih besar pada lokalitas image dan mengubah resource fit menjadi `MostAllocated`:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: default-scheduler
    pluginConfig:
      - name: NodeResourcesFit
        args:
          scoringStrategy:
            type: MostAllocated
            resources:
              - name: cpu
                weight: 1
              - name: memory
                weight: 1
    plugins:
      score:
        enabled:
          - name: NodeResourcesFit
            weight: 2
          - name: ImageLocality
            weight: 1
```

Terapkan dengan memberikan `--config` kepada kube-scheduler (cluster terkelola biasanya mengekspos ini melalui opsi konfigurasi scheduler, atau Anda menjalankan scheduler kedua dengan `schedulerName` yang berbeda). Jika Anda menjalankan profil kustom, workload harus memilihnya secara eksplisit:

```yaml
    spec:
      schedulerName: default-scheduler
```

Verifikasi bahwa profil yang dimaksud benar-benar menangani pod dengan memeriksa metrik dan log scheduler untuk nama profil tersebut, dan segera rollback jika `scheduler_pending_pods` naik.

### Langkah 9: Uji penempatan dengan simulasi pod pending yang disengaja

Jangan menunggu insiden nyata untuk mempelajari perilaku aturan Anda. Buat workload sementara yang menuntut lebih dari yang dapat disediakan satu node mana pun, lalu baca penjelasan scheduler itu sendiri:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: placement-probe
  namespace: default
spec:
  containers:
    - name: probe
      image: registry.k8s.io/pause:3.9
      resources:
        requests:
          cpu: "128"
          memory: "512Gi"
```

Kemudian periksa event-nya — inilah output persis yang akan Anda baca pada pukul tiga pagi, jadi pastikan pesannya dapat ditindaklanjuti:

```bash
kubectl get events --field-selector reason=FailedScheduling -A --sort-by=.lastTimestamp | tail -5
kubectl describe pod placement-probe | sed -n '/Events/,$p'
kubectl delete pod placement-probe
```

Ulangi latihan untuk toleration yang hilang: jalankan pod dengan node selector pool GPU tetapi tanpa toleration dan pastikan ia melaporkan taint tersebut dengan namanya, bukan pesan generik.

### Langkah 10: Pantau kesehatan penjadwalan dan buat alert

Kegagalan penempatan bersifat senyap sampai tiba-tiba tidak lagi. Ekspor metrik scheduler itu sendiri dan buat alert pada indikator terdepan: pod yang pending melewati ambang, latensi penjadwalan, dan durasi plugin filter.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubernetes-scheduling-alerts
  namespace: monitoring
spec:
  groups:
    - name: scheduling
      rules:
        - alert: PodsPendingTooLong
          expr: |
            sum by (namespace) (kube_pod_status_phase{phase="Pending"} == 1) > 0
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Pod pending lebih dari 15 menit di {{ $labels.namespace }}"
        - alert: SchedulerQueueBacklog
          expr: |
            scheduler_pending_pods{queue="active"} > 20
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Antrean aktif scheduler menumpuk"
        - alert: SchedulingLatencyHigh
          expr: |
            histogram_quantile(0.99,
              sum by (le) (rate(scheduler_scheduling_attempt_duration_seconds_bucket[5m]))
            ) > 1
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Latensi penjadwalan persentil 99 di atas satu detik"
```

Pasangkan alert tersebut dengan tinjauan mingguan terhadap distribusi spread (jumlah pod per node dan jumlah replika per zona) agar drift tertangkap sebelum menjadi gangguan, serta audit ulang request pada irama yang sama dengan tinjauan resource pada Langkah 1.

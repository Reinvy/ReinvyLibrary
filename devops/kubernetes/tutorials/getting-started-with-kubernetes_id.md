---
title: "Memulai dengan Kubernetes"
description: "Tutorial komprehensif yang mencakup arsitektur Kubernetes, setup cluster dengan Minikube/Kind, dasar-dasar kubectl, Pod, Deployment, Service, ConfigMap, Secret, Ingress, Persistent Volume, HPA, RBAC, Helm, dan monitoring dengan Prometheus/Grafana."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Memulai dengan Kubernetes

## Ringkasan

Tutorial ini memberikan pengenalan komprehensif tentang Kubernetes, platform orkestrasi kontainer standar industri. Anda akan mempelajari arsitektur Kubernetes, menyiapkan cluster lokal menggunakan Minikube atau Kind, menguasai perintah kubectl, dan menyebarkan aplikasi terkontainerisasi menggunakan Pod, Deployment, Service, ConfigMap, Secret, Ingress controller, Persistent Volume, Horizontal Pod Autoscaler, RBAC, Helm chart, dan monitoring Prometheus/Grafana.

## Target Audiens

- DevOps Engineer, Platform Engineer, Site Reliability Engineer (SRE), dan Backend Developer.
- Tingkat pengembang yang diharapkan: Menengah (disarankan memiliki pemahaman dasar tentang kontainer dan Docker).

## Prasyarat

- Pemahaman dasar tentang konsep kontainer (gambar Docker, kontainer, registry).
- Docker terinstal di komputer lokal (v20.10+).
- Komputer dengan minimal 4 GB RAM dan 2 core CPU.
- CLI kubectl terinstal (lihat [dokumentasi resmi](https://kubernetes.io/docs/tasks/tools/)).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan arsitektur control plane dan node Kubernetes.
- Menyiapkan cluster Kubernetes lokal menggunakan Minikube dan Kind.
- Menggunakan kubectl untuk operasi cluster sehari-hari.
- Menyebarkan dan mengelola Pod, Deployment, dan ReplicaSet.
- Mengekspos aplikasi secara internal dan eksternal menggunakan Service (ClusterIP, NodePort, LoadBalancer).
- Mengelola konfigurasi dan data sensitif dengan ConfigMap dan Secret.
- Mengonfigurasi Ingress controller untuk routing HTTP/HTTPS.
- Menyediakan penyimpanan persisten menggunakan Persistent Volume dan Claim.
- Melakukan autoscaling beban kerja dengan Horizontal Pod Autoscaler.
- Menerapkan Role-Based Access Control (RBAC).
- Mengemas aplikasi dengan Helm chart.
- Menyiapkan monitoring dengan Prometheus dan Grafana.

## Konteks dan Motivasi

Kubernetes telah menjadi standar de facto untuk menyebarkan, menskalakan, dan mengelola aplikasi terkontainerisasi di produksi. Organisasi dari berbagai ukuran mengandalkan Kubernetes untuk mencapai ketersediaan tinggi, efisiensi sumber daya, dan peluncuran yang mulus. Menguasai Kubernetes sangat penting bagi setiap DevOps atau cloud-native engineer, karena ini mendasari tumpukan infrastruktur modern, service mesh, pipeline CI/CD, dan platform observabilitas.

## Konten Inti

### Arsitektur Kubernetes

Kubernetes mengikuti arsitektur **control plane / worker node**:

- **Control Plane** (Master):
  - **kube-apiserver**: Mengekspos API Kubernetes. Semua komponen dan pengguna berinteraksi dengan cluster melalui API server.
  - **etcd**: Penyimpanan key-value terdistribusi yang menyimpan state dan konfigurasi cluster.
  - **kube-scheduler**: Menugaskan Pod ke Node berdasarkan ketersediaan sumber daya, batasan, dan kebijakan.
  - **kube-controller-manager**: Menjalankan proses controller (Node Controller, ReplicationController, Endpoints Controller, dll.).
- **Worker Node**:
  - **kubelet**: Agen yang berjalan di setiap node, memastikan kontainer berjalan di Pod sesuai yang diinginkan.
  - **kube-proxy**: Memelihara aturan jaringan, memungkinkan komunikasi ke Pod dari dalam atau luar cluster.
  - **Container Runtime**: Docker, containerd, atau CRI-O yang menjalankan kontainer.

### Menyiapkan Cluster Lokal

#### Menggunakan Minikube

```bash
# Instal Minikube (Linux)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
rm minikube-linux-amd64

# Mulai cluster
minikube start --cpus=2 --memory=4096 --driver=docker

# Verifikasi
kubectl get nodes
minikube status
```

#### Menggunakan Kind (Kubernetes in Docker)

```bash
# Instal Kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Buat cluster dengan file konfigurasi
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
  replicas: 2
EOF

# Verifikasi
kubectl cluster-info --context kind-kind
```

### Dasar-dasar kubectl

kubectl adalah CLI utama untuk berinteraksi dengan cluster Kubernetes.

```bash
# Informasi cluster
kubectl cluster-info
kubectl config view
kubectl get nodes -o wide

# Operasi namespace
kubectl get namespaces
kubectl create namespace my-app
kubectl config set-context --current --namespace=my-app

# Perpindahan konteks
kubectl config get-contexts
kubectl config use-context minikube
kubectl config current-context
```

### Pod

Pod adalah unit terkecil yang dapat disebarkan di Kubernetes — sekelompok satu atau lebih kontainer yang berbagi penyimpanan, jaringan, dan spesifikasi cara menjalankan.

```yaml
# pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 80
    resources:
      requests:
        memory: "128Mi"
        cpu: "250m"
      limits:
        memory: "256Mi"
        cpu: "500m"
```

```bash
kubectl apply -f pod.yaml
kubectl get pods
kubectl describe pod nginx-pod
kubectl logs nginx-pod
kubectl exec -it nginx-pod -- /bin/bash
kubectl port-forward pod/nginx-pod 8080:80
```

### Deployment

Deployment menyediakan pembaruan deklaratif untuk Pod dan ReplicaSet, memungkinkan pembaruan bergulir, rollback, dan penskalaan.

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "250m"
          limits:
            memory: "256Mi"
            cpu: "500m"
```

```bash
kubectl apply -f deployment.yaml
kubectl get deployments
kubectl rollout status deployment/nginx-deployment
kubectl rollout history deployment/nginx-deployment
kubectl set image deployment/nginx-deployment nginx=nginx:1.26 --record
kubectl rollout undo deployment/nginx-deployment
kubectl scale deployment/nginx-deployment --replicas=5
```

### Service

Service mengekspos Pod ke lalu lintas jaringan. Kubernetes mendukung beberapa tipe Service:

- **ClusterIP** (default): Mengekspos Service pada IP internal cluster.
- **NodePort**: Mengekspos Service pada IP setiap Node di port statis.
- **LoadBalancer**: Mengekspos Service secara eksternal menggunakan load balancer penyedia cloud.

```yaml
# service-clusterip.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

```yaml
# service-nodeport.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-nodeport
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080
  type: NodePort
```

```bash
kubectl apply -f service-clusterip.yaml
kubectl get svc
kubectl describe svc nginx-service
# Akses melalui port-forward
kubectl port-forward svc/nginx-service 8080:80
```

### ConfigMap dan Secret

**ConfigMap** menyimpan data konfigurasi non-sensitif. **Secret** menyimpan data sensitif seperti kata sandi dan kunci API (dienkode base64).

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: production
  APP_DEBUG: "false"
  DATABASE_URL: postgres://user:pass@db:5432/app
```

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
data:
  DB_PASSWORD: c3VwZXJzZWNyZXQ=  # base64 dari "supersecret"
  API_KEY: YWJjZGVmMTIzNDU2
```

```bash
# Buat dari literal
kubectl create configmap app-config --from-literal=APP_ENV=production
kubectl create secret generic app-secret --from-literal=DB_PASSWORD=supersecret

# Gunakan di Pod
kubectl apply -f configmap.yaml -f secret.yaml
```

```yaml
# pod-with-config.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: APP_ENV
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: APP_ENV
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: app-secret
          key: DB_PASSWORD
```

### Ingress Controller

Ingress mengekspos rute HTTP dan HTTPS dari luar cluster ke Service di dalam cluster.

```bash
# Instal NGINX Ingress Controller di Minikube
minikube addons enable ingress
```

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: nginx.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx-service
            port:
              number: 80
```

```bash
kubectl apply -f ingress.yaml
kubectl get ingress
# Tambahkan host mapping di /etc/hosts:
# $(minikube ip) nginx.local
```

### Persistent Volume dan Claim

Persistent Volume (PV) menyediakan sumber daya penyimpanan tingkat cluster. Persistent Volume Claim (PVC) meminta penyimpanan dari PV.

```yaml
# pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
  - ReadWriteOnce
  hostPath:
    path: /data/pv
```

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

```yaml
# pod-with-pvc.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-storage
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - mountPath: /data
      name: storage
  volumes:
  - name: storage
    persistentVolumeClaim:
      claimName: my-pvc
```

```bash
kubectl apply -f pv.yaml -f pvc.yaml -f pod-with-pvc.yaml
kubectl get pv
kubectl get pvc
```

### Horizontal Pod Autoscaler (HPA)

HPA secara otomatis menskalakan jumlah Pod dalam Deployment berdasarkan CPU, memori, atau metrik kustom.

```bash
# Aktifkan metrics server di Minikube
minikube addons enable metrics-server
```

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-deployment
  minReplicas: 2
  maxReplicas: 10
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
```

```bash
kubectl apply -f hpa.yaml
kubectl get hpa
kubectl describe hpa nginx-hpa
```

### Cheatsheet kubectl

```bash
# Log dan exec Pod
kubectl logs -f deployment/nginx-deployment
kubectl logs --tail=50 --since=1h deployment/nginx-deployment
kubectl exec -it deployment/nginx-deployment -- sh

# Debugging
kubectl describe pod <nama-pod>
kubectl get events --sort-by=.lastTimestamp
kubectl get pods --field-selector=status.phase=Running
kubectl top pods
kubectl top nodes

# Port forwarding
kubectl port-forward deployment/nginx-deployment 8080:80
kubectl port-forward svc/nginx-service 8080:80

# Salin file
kubectl cp /local/file <nama-pod>:/remote/path
kubectl cp <nama-pod>:/remote/path /local/file
```

### Dasar-dasar RBAC

Role-Based Access Control (RBAC) mengatur akses ke sumber daya cluster.

```yaml
# rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: my-app
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: my-app
  name: read-pods
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f rbac.yaml
kubectl get roles --all-namespaces
kubectl get rolebindings --all-namespaces
```

### Pengemasan Helm Chart

Helm adalah manajer paket untuk Kubernetes. Chart adalah paket sumber daya Kubernetes yang telah dikonfigurasi sebelumnya.

```bash
# Instal Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Tambahkan repositori
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Instal chart
helm install my-nginx bitnami/nginx

# Buat chart sendiri
helm create my-chart
tree my-chart/
```

Struktur Helm chart:

```text
my-chart/
├── Chart.yaml          # Metadata
├── values.yaml         # Nilai konfigurasi default
├── charts/             # Sub-chart
└── templates/          # File template
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    └── _helpers.tpl    # Template pembantu
```

```bash
# Kemas dan instal
helm package my-chart
helm install release-name ./my-chart-0.1.0.tgz
helm list
helm upgrade release-name ./my-chart
helm rollback release-name 1
helm uninstall release-name
```

### Monitoring dengan Prometheus dan Grafana

```bash
# Instal kube-prometheus-stack melalui Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Akses Grafana
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80
# Kredensial default: admin / prom-operator
```

```bash
# Buat PodMonitor untuk metrik kustom
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: myapp-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: myapp
  podMetricsEndpoints:
  - port: metrics
    path: /metrics
    interval: 15s
EOF
```

## Contoh Kode

### Deployment Multi-Komponen Lengkap

```yaml
# complete-app.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo-app
---
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: demo-app
  name: web-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  namespace: demo-app
  name: web-service
spec:
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  namespace: demo-app
  name: web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-frontend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

```bash
kubectl apply -f complete-app.yaml
kubectl get all -n demo-app
```

## Insight Penting

- **Arsitektur Itu Penting**: Memahami komponen control plane (kube-apiserver, etcd, scheduler, controller-manager) sangat penting untuk debugging dan administrasi cluster.
- **Deklaratif Lebih Baik dari Imperatif**: Selalu gunakan manifest YAML deklaratif (`kubectl apply -f`) daripada perintah imperatif untuk reprodusibilitas dan alur kerja GitOps.
- **Batas Sumber Daya Itu Wajib**: Selalu atur `requests` dan `limits` pada setiap kontainer untuk mencegah kelaparan sumber daya dan masalah noisy neighbor.
- **Gunakan Namespace**: Atur beban kerja ke dalam namespace untuk isolasi, lingkup RBAC, dan manajemen kuota sumber daya.
- **Health Probe**: Konfigurasikan `livenessProbe` dan `readinessProbe` untuk setiap Pod guna memungkinkan self-healing dan routing lalu lintas.
- **Helm untuk Penggunaan Kembali**: Kemas deployment yang dapat diulang sebagai Helm chart untuk menstandarisasi rilis di berbagai lingkungan.

## Langkah Berikutnya

- Jelajahi jaringan tingkat lanjut dengan **Service Mesh** (Istio, Linkerd) untuk mTLS, pembagian lalu lintas, dan observabilitas.
- Terapkan **GitOps** dengan ArgoCD atau Flux untuk pipeline deployment deklaratif dan otomatis.
- Pelajari tentang **Cluster Autoscaling** (Cluster Autoscaler, Karpenter) untuk penyediaan node dinamis.
- Siapkan **backup dan disaster recovery** dengan Velero.

## Kesimpulan

Anda telah menyelesaikan pengenalan komprehensif tentang Kubernetes. Anda menyiapkan cluster lokal, menyebarkan aplikasi terkontainerisasi menggunakan Pod dan Deployment, mengeksposnya dengan Service dan Ingress, mengelola konfigurasi dengan ConfigMap dan Secret, menyediakan penyimpanan persisten, menerapkan autoscaling, mengamankan akses dengan RBAC, mengemas aplikasi dengan Helm, dan menyebarkan monitoring dengan Prometheus dan Grafana. Anda sekarang memiliki keterampilan dasar untuk bekerja dengan Kubernetes di lingkungan pengembangan dan produksi.

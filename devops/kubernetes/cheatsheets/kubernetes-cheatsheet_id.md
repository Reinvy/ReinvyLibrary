---
title: "Cheat Sheet Kubernetes"
description: "Panduan referensi cepat untuk perintah kubectl, manajemen pod, rollout deployment, eksposur service, pembuatan configmap/secret, operasi namespace, perpindahan konteks, Helm, kubeadm, Minikube, manifest YAML, batas sumber daya, probe, dan template peran RBAC."
category: "devops"
technology: "kubernetes"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Kubernetes

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Dapatkan semua pod | `kubectl get pods --all-namespaces` | Tampilkan semua pod di semua namespace |
| Deskripsikan sumber daya | `kubectl describe pod <nama>` | Tampilkan status detail suatu sumber daya |
| Lihat log | `kubectl logs -f <nama-pod>` | Streaming log dari pod |
| Jalankan perintah | `kubectl exec -it <pod> -- sh` | Jalankan shell di kontainer |
| Terapkan manifest | `kubectl apply -f manifest.yaml` | Buat atau perbarui sumber daya dari file |
| Hapus sumber daya | `kubectl delete -f manifest.yaml` | Hapus sumber daya yang ditentukan di file |
| Port forwarding | `kubectl port-forward svc/name 8080:80` | Teruskan port lokal ke port service |
| Dapatkan node | `kubectl get nodes -o wide` | Tampilkan node dengan info detail |
| Dapatkan event | `kubectl get events --sort-by=.lastTimestamp` | Lihat event cluster yang diurutkan berdasarkan waktu |
| Penggunaan sumber daya | `kubectl top pods` | Tampilkan penggunaan CPU/memori pod |

## Perintah Umum

### Manajemen Pod

```bash
# Buat dan kelola pod
kubectl run nginx --image=nginx --port=80
kubectl get pods -w                              # Pantau perubahan pod
kubectl get pods --show-labels                   # Tampilkan label
kubectl get pods --field-selector=status.phase=Running
kubectl delete pod <nama> --grace-period=0 --force

# Operasi pod
kubectl logs --tail=50 --since=1h <nama-pod>
kubectl logs -f deployment/<nama-deploy>
kubectl exec -it <pod> -c <kontainer> -- sh      # Kontainer tertentu
kubectl cp /local/file <pod>:/remote/path
kubectl cp <pod>:/remote/path /local/file
kubectl attach <pod> -i
```

### Perintah Rollout Deployment

```bash
kubectl create deployment nginx --image=nginx:1.25
kubectl get deployments -o wide
kubectl describe deployment nginx

# Manajemen rollout
kubectl rollout status deployment/nginx
kubectl rollout history deployment/nginx
kubectl rollout undo deployment/nginx
kubectl rollout undo deployment/nginx --to-revision=2
kubectl rollout pause deployment/nginx
kubectl rollout resume deployment/nginx
kubectl rollout restart deployment/nginx

# Penskalaan
kubectl scale deployment/nginx --replicas=5
kubectl autoscale deployment/nginx --min=2 --max=10 --cpu-percent=70

# Perbarui gambar
kubectl set image deployment/nginx nginx=nginx:1.26 --record
```

### Eksposur Service

```bash
# Buat service
kubectl expose deployment nginx --port=80 --target-port=80 --type=ClusterIP
kubectl expose deployment nginx --port=80 --type=NodePort
kubectl expose deployment nginx --port=80 --type=LoadBalancer

# Dapatkan info service
kubectl get svc -o wide
kubectl describe svc nginx

# Endpoint
kubectl get endpoints
kubectl describe endpoints nginx

# Ingress
kubectl get ingress -A
kubectl describe ingress <nama>
kubectl annotate ingress <nama> nginx.ingress.kubernetes.io/rewrite-target=/
```

### Pembuatan ConfigMap dan Secret

```bash
# ConfigMap dari literal
kubectl create configmap app-config \
  --from-literal=APP_ENV=production \
  --from-literal=LOG_LEVEL=debug

# ConfigMap dari file
kubectl create configmap app-config \
  --from-file=config.properties \
  --from-file=app.properties

# Secret dari literal
kubectl create secret generic app-secret \
  --from-literal=DB_PASSWORD=supersecret \
  --from-literal=API_KEY=abc123

# Secret dari file
kubectl create secret generic tls-secret \
  --from-file=tls.crt=server.crt \
  --from-file=tls.key=server.key

# Secret TLS
kubectl create secret tls my-tls \
  --cert=path/to/cert.crt \
  --key=path/to/key.key

# Secret registry Docker
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=user \
  --docker-password=pass \
  --docker-email=user@example.com
```

### Operasi Namespace

```bash
kubectl create namespace my-app
kubectl get namespaces
kubectl describe namespace my-app
kubectl delete namespace my-app
kubectl config set-context --current --namespace=my-app
kubectl get all -n my-app                              # Semua sumber daya di namespace
kubectl get pods --all-namespaces
kubectl api-resources --namespaced=true                 # Sumber daya namespaced
```

### Perpindahan Konteks kubectl

```bash
kubectl config get-contexts                            # Tampilkan semua konteks
kubectl config current-context                         # Tampilkan konteks saat ini
kubectl config use-context minikube                    # Pindah ke minikube
kubectl config set-context my-context \
  --cluster=my-cluster \
  --namespace=my-ns \
  --user=my-user
kubectl config rename-context old-name new-name
kubectl config delete-context my-context
kubectl config view --minify                           # Tampilkan hanya konteks saat ini
```

### Perintah Helm

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm search repo bitnami/nginx
helm search hub nginx

helm install my-release bitnami/nginx --namespace my-app --create-namespace
helm list -A
helm status my-release
helm upgrade my-release bitnami/nginx --set image.tag=1.26
helm rollback my-release 1
helm uninstall my-release

helm create my-chart
helm package my-chart/
helm lint my-chart/
helm template my-release ./my-chart                    # Render template secara lokal
helm get values my-release
helm get manifest my-release

# Tambahkan repositori Helm untuk Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
```

### Perintah kubeadm

```bash
kubeadm init --pod-network-cidr=10.244.0.0/16          # Inisialisasi control plane
kubeadm join <control-plane-host>:6443 --token <token> # Gabungkan worker node
kubeadm token create --print-join-command               # Hasilkan token join
kubeadm token list
kubeadm config view                                     # Lihat konfigurasi cluster
kubeadm upgrade plan                                    # Periksa jalur upgrade
kubeadm upgrade apply v1.28.0                           # Upgrade cluster
kubeadm reset                                           # Reset node ke keadaan bersih
```

### Perintah Minikube

```bash
minikube start --cpus=4 --memory=8192 --driver=docker
minikube stop
minikube delete
minikube status
minikube ip
minikube dashboard                                    # Buka dashboard Kubernetes
minikube addons list
minikube addons enable ingress
minikube addons enable metrics-server
minikube service nginx-service                        # Buka service di browser
minikube tunnel                                       # Ekspos service LoadBalancer
minikube ssh                                          # SSH ke VM Minikube
minikube logs                                         # Lihat log Minikube
```

## Potongan Kode

### Template Struktur Manifest YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
  labels:
    app: my-app
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        ports:
        - containerPort: 8080
          protocol: TCP
        env:
        - name: NODE_ENV
          value: production
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      restartPolicy: Always
```

### Sintaks Batas Sumber Daya

```yaml
# CPU: 1 CPU = 1000m (millicore)
# Memori: Ki, Mi, Gi (biner) atau K, M, G (desimal)
resources:
  requests:
    cpu: "250m"        # 0.25 core CPU
    memory: "256Mi"    # 256 Mebibyte
    ephemeral-storage: "1Gi"
  limits:
    cpu: "1"           # 1 core CPU
    memory: "1Gi"      # 1 Gibibyte
    ephemeral-storage: "2Gi"
```

### Contoh Konfigurasi Probe

```yaml
# Liveness probe HTTP
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
    httpHeaders:
    - name: X-Custom-Header
      value: HealthCheck
  initialDelaySeconds: 10
  periodSeconds: 15
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 3

# Readiness probe TCP
readinessProbe:
  tcpSocket:
    port: 3306
  initialDelaySeconds: 5
  periodSeconds: 10

# Startup probe exec (untuk kontainer yang mulai lambat)
startupProbe:
  exec:
    command:
    - cat
    - /tmp/healthy
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 30

# Probe gRPC (Kubernetes 1.24+)
livenessProbe:
  grpc:
    port: 50051
    service: myapp.HealthService
  initialDelaySeconds: 10
```

### Template Peran RBAC

```yaml
# Role lingkup Namespace: Akses penuh ke pod dan service
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: my-app
  name: app-operator
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log", "pods/exec", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets", "daemonsets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
# Role lingkup Cluster: Akses baca ke semua sumber daya
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-reader
rules:
- apiGroups: [""]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps", "batch", "networking.k8s.io", "rbac.authorization.k8s.io"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
---
# RoleBinding untuk mengikat Role ke pengguna
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: my-app
  name: app-operator-binding
subjects:
- kind: ServiceAccount
  name: app-sa
  namespace: my-app
roleRef:
  kind: Role
  name: app-operator
  apiGroup: rbac.authorization.k8s.io
---
# ClusterRoleBinding untuk akses seluruh cluster
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-reader-binding
subjects:
- kind: User
  name: alice
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-reader
  apiGroup: rbac.authorization.k8s.io
```

```bash
# Verifikasi RBAC
kubectl auth can-i create pods --as=alice --namespace=my-app
kubectl auth can-i list nodes --as=alice
kubectl get roles,rolebindings -A
kubectl get clusterroles,clusterrolebindings -A

# Buat service account
kubectl create sa app-sa -n my-app
kubectl get secret -n my-app $(kubectl get sa app-sa -n my-app -o jsonpath='{.secrets[0].name}') -o jsonpath='{.data.token}' | base64 -d
```

---
title: "Cheat Sheet Keamanan Kubernetes"
description: "Panduan referensi cepat untuk mengamankan cluster Kubernetes: role dan binding RBAC, ServiceAccount, Pod Security Standards dan admission, konteks keamanan, enkripsi Secret saat istirahat dan external secret, NetworkPolicy, image pull secret, konstraint OPA Gatekeeper, serta perintah audit."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Keamanan Kubernetes

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Periksa izin saat ini | `kubectl auth can-i create pods` | Verifikasi apakah identitas saat ini boleh melakukan aksi |
| Periksa izin sebagai identitas lain | `kubectl auth can-i get secrets --as system:serviceaccount:default:ci-bot` | Uji RBAC sebagai service account atau pengguna |
| Daftar objek RBAC | `kubectl get roles,rolebindings,clusterroles,clusterrolebindings -A` | Tampilkan semua role dan binding di cluster |
| Buat service account | `kubectl create serviceaccount ci-bot` | Buat ServiceAccount di namespace saat ini |
| Terbitkan token berumur pendek | `kubectl create token ci-bot --duration=6h` | Buat token untuk ServiceAccount (Kubernetes 1.24+) |
| Buat secret generik | `kubectl create secret generic db-creds --from-literal=username=admin` | Simpan data key-value sebagai Secret |
| Buat secret registry | `kubectl create secret docker-registry regcred --docker-server=ghcr.io` | Simpan kredensial registry kontainer |
| Baca data secret | `kubectl get secret db-creds -o jsonpath='{.data.password}'` | Keluarkan nilai secret berenkode base64 |
| Terapkan Pod Security Standards | `kubectl label ns prod pod-security.kubernetes.io/enforce=restricted` | Tolak pod yang melanggar profil restricted |
| Terapkan NetworkPolicy | `kubectl apply -f default-deny.yaml` | Tegakkan aturan ingress dan egress tingkat pod |
| Daftar NetworkPolicy | `kubectl get networkpolicies -A` | Tampilkan semua network policy di cluster |
| Periksa flag API server | `kubectl get pods -n kube-system -l component=kube-apiserver -o jsonpath='{.items[0].spec.containers[0].command}'` | Verifikasi plugin admission dan flag enkripsi |

## Perintah Umum

### Perintah Verifikasi RBAC

```bash
# Siapa saya dan apa yang bisa saya lakukan?
kubectl auth whoami
kubectl auth can-i create pods
kubectl auth can-i delete deployments --all-namespaces

# Uji izin sebagai identitas lain
kubectl auth can-i get secrets --as system:serviceaccount:default:ci-bot
kubectl auth can-i list pods --as-group system:authenticated

# Periksa objek RBAC
kubectl get roles,rolebindings,clusterroles,clusterrolebindings -A
kubectl describe clusterrolebinding view
kubectl get clusterrole view -o yaml
```

### Perintah Service Account

```bash
# Buat dan daftar service account
kubectl create serviceaccount ci-bot
kubectl get serviceaccounts

# Terbitkan token berumur pendek (Kubernetes 1.24+)
kubectl create token ci-bot --duration=6h

# Periksa service account (image pull secret, pengaturan automount)
kubectl get serviceaccounts ci-bot -o yaml

# Dekode token secret gaya lama (pra-1.24)
kubectl get secret ci-bot-token-abc12 -o jsonpath='{.data.token}' | base64 -d
```

### Perintah Manajemen Secret

```bash
# Buat secret dari literal, file, pasangan TLS, dan kredensial registry
kubectl create secret generic db-creds --from-literal=username=admin --from-literal=password='S3cr3t!'
kubectl create secret generic app-config --from-file=config.yaml
kubectl create secret tls tls-cert --cert=tls.crt --key=tls.key
kubectl create secret docker-registry regcred --docker-server=ghcr.io --docker-username=bot --docker-password=TOKEN

# Baca data secret (berenkode base64)
kubectl get secret db-creds -o jsonpath='{.data.password}' | base64 -d

# Konfirmasi konfigurasi penyedia enkripsi API server
ps aux | grep kube-apiserver | grep -o 'encryption-provider-config=[^ ]*'
```

### Perintah Pod Security Admission

```bash
# Periksa label Pod Security Standards pada namespace
kubectl get ns --show-labels

# Terapkan mode enforce, audit, dan warn dengan profil tertentu
kubectl label ns prod pod-security.kubernetes.io/enforce=restricted
kubectl label ns prod pod-security.kubernetes.io/audit=baseline
kubectl label ns prod pod-security.kubernetes.io/warn=baseline

# Hapus penegakan dari sebuah namespace
kubectl label ns prod pod-security.kubernetes.io/enforce-

# Periksa apakah plugin admission PodSecurity aktif
kubectl get pods -n kube-system -l component=kube-apiserver -o yaml | grep enable-admission-plugins
```

### Perintah Network Policy

```bash
# Daftar dan deskripsikan network policy
kubectl get networkpolicies -A
kubectl describe networkpolicy default-deny-all -n default

# Terapkan dan hapus policy
kubectl apply -f allow-frontend-api.yaml
kubectl delete networkpolicy default-deny-all -n default

# Tampilkan pod beserta labelnya untuk desain policy
kubectl get pods -n default --show-labels
```

### Perintah Audit dan Kepatuhan

```bash
# Periksa kebijakan audit API server
kubectl get cm audit-policy -n kube-system -o yaml

# Verifikasi image pull secret yang menempel pada pod
kubectl get pod my-pod -o jsonpath='{.spec.imagePullSecrets}'

# Periksa pengguna mana yang dapat mengakses sumber daya
kubectl auth can-i list secrets --list -n production

# Tinjau event terbaru untuk peringatan terkait keamanan
kubectl get events --field-selector reason=FailedCreate -A
```

## Potongan Kode

### Role dan RoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: payments
  name: payment-reader
rules:
  - apiGroups: [""]
    resources: ["pods", "services"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: payments
  name: read-payments
subjects:
  - kind: ServiceAccount
    name: ci-bot
    namespace: payments
roleRef:
  kind: Role
  name: payment-reader
  apiGroup: rbac.authorization.k8s.io
```

### ClusterRole dan ClusterRoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: metrics-reader
rules:
  - apiGroups: ["metrics.k8s.io"]
    resources: ["pods"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: read-metrics
subjects:
  - kind: User
    name: jane@example.com
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: metrics-reader
  apiGroup: rbac.authorization.k8s.io
```

### ServiceAccount dengan Image Pull Secret

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-runner
  namespace: production
imagePullSecrets:
  - name: regcred
automountServiceAccountToken: false
```

### Konteks Keamanan Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hardened-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    runAsGroup: 3000
    fsGroup: 3000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: nginx:1.27
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
          add: ["NET_BIND_SERVICE"]
```

### Label Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### NetworkPolicy: Tolak Semua Secara Default

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

### NetworkPolicy: Izinkan Frontend ke API

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-api
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

### Secret dengan Enkripsi Saat Istirahat

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: c2VjdXJlLXNlY3JldC1rZXktMzItYnl0ZXM=
      - identity: {}
```

### Konstraint OPA Gatekeeper

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
  parameters:
    labels:
      - key: team
```

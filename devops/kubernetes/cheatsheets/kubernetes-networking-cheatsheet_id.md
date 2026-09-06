---
title: "Cheat Sheet Jaringan Kubernetes"
description: "Panduan referensi cepat untuk jaringan Kubernetes: tipe Service (ClusterIP, NodePort, LoadBalancer, ExternalName, Headless), Endpoints dan EndpointSlices, routing Ingress dan TLS, aturan NetworkPolicy dan pola default-deny, service discovery dengan CoreDNS, serta perintah debugging konektivitas."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Jaringan Kubernetes

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Lihat semua Service | `kubectl get svc -A` | Menampilkan semua Service di cluster beserta tipe, IP cluster, dan pemetaan port |
| Ekspos sebuah deployment | `kubectl expose deployment web --port=80 --target-port=8080` | Membuat Service ClusterIP yang merutekan lalu lintas ke pod berlabel `app=web` |
| Periksa sebuah Service | `kubectl describe svc web` | Menampilkan endpoints, selector, port, dan event untuk sebuah Service |
| Lihat endpoints backend | `kubectl get endpoints web` | Menampilkan IP pod yang sedang melayani sebuah Service |
| Teruskan port lokal | `kubectl port-forward svc/web 8080:80` | Mengakses Service dari workstation tanpa mengeksposnya ke publik |
| Lihat objek Ingress | `kubectl get ingress -A` | Menampilkan semua aturan routing HTTP/HTTPS di cluster |
| Lihat IngressClass | `kubectl get ingressclass` | Menampilkan ingress controller yang tersedia (nginx, traefik, dan lain-lain) |
| Terapkan NetworkPolicy | `kubectl apply -f default-deny.yaml` | Memberlakukan aturan firewall ingress dan egress tingkat pod |
| Lihat NetworkPolicy | `kubectl get networkpolicies -A` | Menampilkan semua aturan firewall tingkat pod di cluster |
| Uji DNS cluster | `kubectl run -it --rm dns-test --image=busybox -- nslookup web` | Me-resolve nama Service dari dalam cluster |
| Periksa kesehatan CoreDNS | `kubectl get pods -n kube-system -l k8s-app=kube-dns` | Memverifikasi bahwa replica set CoreDNS berjalan |

## Perintah Umum

### Inspeksi Service dan Endpoint

```bash
# Daftar dan periksa Service
kubectl get svc -A
kubectl get svc web -o yaml
kubectl describe svc web

# Tampilkan IP pod di belakang sebuah Service
kubectl get endpoints web
kubectl get endpointslices -l kubernetes.io/service-name=web
kubectl get endpointslices -A

# Pastikan pod mana yang cocok dengan selector Service
kubectl get pods -l app=web -o wide
```

### Membuat dan Mengekspos Service

```bash
# Ekspos deployment yang sudah ada sebagai Service
kubectl expose deployment web --port=80 --target-port=8080 --type=ClusterIP
kubectl expose deployment web --port=80 --target-port=8080 --type=NodePort
kubectl expose deployment web --port=80 --target-port=8080 --type=LoadBalancer

# Buat Service secara langsung
kubectl create service clusterip web --tcp=80:8080
kubectl create service nodeport web --tcp=80:8080
kubectl create service loadbalancer web --tcp=80:80
kubectl create service externalname db --external-name db.example.com
```

### Inspeksi Ingress

```bash
# Daftar dan periksa objek Ingress
kubectl get ingress -A
kubectl get ingress web -o yaml
kubectl describe ingress web

# Periksa ingress controller dan Service-nya
kubectl get ingressclass
kubectl get svc -n ingress-nginx
kubectl get pods -n ingress-nginx -o wide
```

### Manajemen NetworkPolicy

```bash
# Terapkan, daftar, dan hapus network policy
kubectl apply -f default-deny.yaml
kubectl get networkpolicies -A
kubectl describe networkpolicy allow-frontend
kubectl get networkpolicies -n prod -o yaml
kubectl delete networkpolicy allow-frontend
```

### Debugging DNS dan Service Discovery

```bash
# Resolve sebuah Service dari dalam cluster
kubectl run -it --rm dns-test --image=busybox:1.28 --restart=Never -- nslookup web
kubectl run -it --rm dns-test --image=busybox:1.28 --restart=Never -- nslookup web.default.svc.cluster.local

# Periksa CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
kubectl get configmap coredns -n kube-system -o yaml
```

### Debugging Konektivitas

```bash
# Jalankan pod pemecahan masalah jaringan dengan curl, dig, dan ping
kubectl run netshoot --image=nicolaka/netshoot --rm -it --restart=Never -- bash

# Uji sebuah Service dari pod yang sudah ada
kubectl exec -it <pod> -- curl -v http://web:80
kubectl exec -it <pod> -- wget -qO- http://web

# Periksa keterjangkauan dan routing
kubectl get pods -o wide
kubectl get endpoints web
kubectl get svc web -o yaml
kubectl port-forward svc/web 8080:80
```

## Potongan Kode

### Definisi Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
```

```yaml
# NodePort mengekspos Service pada port tinggi di setiap node
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  type: NodePort
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080
```

```yaml
# Service Headless: clusterIP None menonaktifkan IP virtual sehingga klien
# me-resolve langsung IP pod (digunakan oleh StatefulSet dan service mesh)
apiVersion: v1
kind: Service
metadata:
  name: db
spec:
  clusterIP: None
  selector:
    app: db
  ports:
    - port: 5432
      targetPort: 5432
```

### Ingress dengan TLS

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
```

### Pola NetworkPolicy

```yaml
# Default deny: tidak ada pod di namespace ini yang boleh mengirim atau
# menerima lalu lintas kecuali diizinkan secara eksplisit oleh policy lain
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

```yaml
# Izinkan lalu lintas hanya dari pod berlabel app=frontend pada port 8080
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend
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

```yaml
# Izinkan egress hanya ke DNS cluster (CoreDNS berada di kube-system)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
spec:
  podSelector:
    matchLabels:
      app: worker
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

### Contoh EndpointSlice

```yaml
# EndpointSlice adalah pengganti modern untuk Endpoints; Kubernetes
# membuatnya secara otomatis untuk setiap Service
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: web-abc12
  labels:
    kubernetes.io/service-name: web
addressType: IPv4
ports:
  - name: http
    port: 8080
    protocol: TCP
endpoints:
  - addresses:
      - 10.244.0.7
    conditions:
      ready: true
```

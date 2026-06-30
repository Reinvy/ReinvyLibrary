---
title: "Getting Started with Kubernetes"
description: "A comprehensive tutorial covering Kubernetes architecture, cluster setup with Minikube/Kind, kubectl basics, Pods, Deployments, Services, ConfigMaps, Secrets, Ingress, Persistent Volumes, HPA, RBAC, Helm, and monitoring with Prometheus/Grafana."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Getting Started with Kubernetes

## Summary

This tutorial provides a comprehensive introduction to Kubernetes, the industry-standard container orchestration platform. You will learn about Kubernetes architecture, set up a local cluster using Minikube or Kind, master kubectl commands, and deploy containerized applications using Pods, Deployments, Services, ConfigMaps, Secrets, Ingress controllers, Persistent Volumes, Horizontal Pod Autoscaler, RBAC, Helm charts, and Prometheus/Grafana monitoring.

## Target Audience

- DevOps Engineers, Platform Engineers, Site Reliability Engineers (SREs), and Backend Developers.
- Expected developer level: Intermediate (familiarity with containers and Docker is recommended).

## Prerequisites

- Basic understanding of container concepts (Docker images, containers, registries).
- Docker installed on your local machine (v20.10+).
- A computer with at least 4 GB RAM and 2 CPU cores.
- kubectl CLI tool installed (see [official docs](https://kubernetes.io/docs/tasks/tools/)).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain the Kubernetes control plane and node architecture.
- Set up a local Kubernetes cluster using Minikube and Kind.
- Use kubectl for day-to-day cluster operations.
- Deploy and manage Pods, Deployments, and ReplicaSets.
- Expose applications internally and externally using Services (ClusterIP, NodePort, LoadBalancer).
- Manage configuration and sensitive data with ConfigMaps and Secrets.
- Configure Ingress controllers for HTTP/HTTPS routing.
- Provision persistent storage using Persistent Volumes and Claims.
- Autoscale workloads with the Horizontal Pod Autoscaler.
- Implement Role-Based Access Control (RBAC).
- Package applications with Helm charts.
- Set up monitoring with Prometheus and Grafana.

## Context and Motivation

Kubernetes has become the de facto standard for deploying, scaling, and managing containerized applications in production. Organizations of all sizes rely on Kubernetes to achieve high availability, efficient resource utilization, and seamless rollouts. Mastering Kubernetes is essential for any DevOps or cloud-native engineer, as it underpins modern infrastructure stacks, service meshes, CI/CD pipelines, and observability platforms.

## Core Content

### Kubernetes Architecture

Kubernetes follows a **control plane / worker node** architecture:

- **Control Plane** (Master):
  - **kube-apiserver**: Exposes the Kubernetes API. All components and users interact with the cluster via the API server.
  - **etcd**: Distributed key-value store that holds cluster state and configuration.
  - **kube-scheduler**: Assigns Pods to Nodes based on resource availability, constraints, and policies.
  - **kube-controller-manager**: Runs controller processes (Node Controller, ReplicationController, Endpoints Controller, etc.).
- **Worker Nodes**:
  - **kubelet**: Agent that runs on each node, ensuring containers are running in Pods as desired.
  - **kube-proxy**: Maintains network rules, enabling communication to Pods from inside or outside the cluster.
  - **Container Runtime**: Docker, containerd, or CRI-O that runs the actual containers.

### Setting Up a Local Cluster

#### Using Minikube

```bash
# Install Minikube (Linux)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
rm minikube-linux-amd64

# Start a cluster
minikube start --cpus=2 --memory=4096 --driver=docker

# Verify
kubectl get nodes
minikube status
```

#### Using Kind (Kubernetes in Docker)

```bash
# Install Kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Create a cluster with a config file
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
  replicas: 2
EOF

# Verify
kubectl cluster-info --context kind-kind
```

### kubectl Basics

kubectl is the primary CLI tool for interacting with Kubernetes clusters.

```bash
# Cluster information
kubectl cluster-info
kubectl config view
kubectl get nodes -o wide

# Namespace operations
kubectl get namespaces
kubectl create namespace my-app
kubectl config set-context --current --namespace=my-app

# Context switching
kubectl config get-contexts
kubectl config use-context minikube
kubectl config current-context
```

### Pods

A Pod is the smallest deployable unit in Kubernetes — a group of one or more containers sharing storage, network, and a specification for how to run.

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

### Deployments

Deployments provide declarative updates for Pods and ReplicaSets, enabling rolling updates, rollbacks, and scaling.

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

### Services

Services expose Pods to network traffic. Kubernetes supports several Service types:

- **ClusterIP** (default): Exposes the Service on a cluster-internal IP.
- **NodePort**: Exposes the Service on each Node's IP at a static port.
- **LoadBalancer**: Exposes the Service externally using a cloud provider's load balancer.

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
# Access via port-forward
kubectl port-forward svc/nginx-service 8080:80
```

### ConfigMaps and Secrets

**ConfigMaps** store non-sensitive configuration data. **Secrets** store sensitive data like passwords and API keys (base64-encoded).

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
  DB_PASSWORD: c3VwZXJzZWNyZXQ=  # base64 of "supersecret"
  API_KEY: YWJjZGVmMTIzNDU2
```

```bash
# Create from literal
kubectl create configmap app-config --from-literal=APP_ENV=production
kubectl create secret generic app-secret --from-literal=DB_PASSWORD=supersecret

# Use in Pod
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

### Ingress Controllers

Ingress exposes HTTP and HTTPS routes from outside the cluster to Services within the cluster.

```bash
# Install NGINX Ingress Controller on Minikube
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
# Add host mapping in /etc/hosts:
# $(minikube ip) nginx.local
```

### Persistent Volumes and Claims

Persistent Volumes (PV) provide cluster-wide storage resources. Persistent Volume Claims (PVC) request storage from PVs.

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

HPA automatically scales the number of Pods in a Deployment based on CPU, memory, or custom metrics.

```bash
# Enable metrics server on Minikube
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

### kubectl Cheatsheet

```bash
# Pod logs and exec
kubectl logs -f deployment/nginx-deployment
kubectl logs --tail=50 --since=1h deployment/nginx-deployment
kubectl exec -it deployment/nginx-deployment -- sh

# Debugging
kubectl describe pod <pod-name>
kubectl get events --sort-by=.lastTimestamp
kubectl get pods --field-selector=status.phase=Running
kubectl top pods
kubectl top nodes

# Port forwarding
kubectl port-forward deployment/nginx-deployment 8080:80
kubectl port-forward svc/nginx-service 8080:80

# Copy files
kubectl cp /local/file <pod-name>:/remote/path
kubectl cp <pod-name>:/remote/path /local/file
```

### RBAC Basics

Role-Based Access Control (RBAC) regulates access to cluster resources.

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

### Helm Chart Packaging

Helm is the package manager for Kubernetes. Charts are packages of pre-configured Kubernetes resources.

```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add a repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install a chart
helm install my-nginx bitnami/nginx

# Create your own chart
helm create my-chart
tree my-chart/
```

Helm chart structure:

```text
my-chart/
├── Chart.yaml          # Metadata
├── values.yaml         # Default configuration values
├── charts/             # Sub-charts
└── templates/          # Template files
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    └── _helpers.tpl    # Helper templates
```

```bash
# Package and install
helm package my-chart
helm install release-name ./my-chart-0.1.0.tgz
helm list
helm upgrade release-name ./my-chart
helm rollback release-name 1
helm uninstall release-name
```

### Monitoring with Prometheus and Grafana

```bash
# Install kube-prometheus-stack via Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Access Grafana
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80
# Default credentials: admin / prom-operator
```

```bash
# Create a PodMonitor for custom metrics
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

## Code Examples

### Complete Multi-Component Deployment

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

## Key Insights

- **Architecture Matters**: Understanding the control plane components (kube-apiserver, etcd, scheduler, controller-manager) is crucial for debugging and cluster administration.
- **Declarative Over Imperative**: Always prefer declarative YAML manifests (`kubectl apply -f`) over imperative commands for reproducibility and GitOps workflows.
- **Resource Limits Are Mandatory**: Always set `requests` and `limits` on every container to prevent resource starvation and noisy neighbor issues.
- **Use Namespaces**: Organize workloads into namespaces for isolation, RBAC scoping, and resource quota management.
- **Health Probes**: Configure `livenessProbe` and `readinessProbe` for every Pod to enable self-healing and traffic routing.
- **Helm for Reusability**: Package repeatable deployments as Helm charts to standardize releases across environments.

## Next Steps

- Explore advanced networking with **Service Mesh** (Istio, Linkerd) for mTLS, traffic splitting, and observability.
- Implement **GitOps** with ArgoCD or Flux for automated, declarative deployment pipelines.
- Learn about **Cluster Autoscaling** (Cluster Autoscaler, Karpenter) for dynamic node provisioning.
- Set up **backup and disaster recovery** with Velero.

## Conclusion

You have completed a comprehensive introduction to Kubernetes. You set up a local cluster, deployed containerized applications using Pods and Deployments, exposed them with Services and Ingress, managed configuration with ConfigMaps and Secrets, provisioned persistent storage, implemented autoscaling, secured access with RBAC, packaged applications with Helm, and deployed monitoring with Prometheus and Grafana. You now have the foundational skills to work with Kubernetes in development and production environments.

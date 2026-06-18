---
title: "Kubernetes Cheat Sheet"
description: "A quick reference guide for kubectl commands, pod management, deployment rollouts, service exposure, configmap/secret creation, namespace operations, context switching, Helm, kubeadm, Minikube, YAML manifests, resource limits, probes, and RBAC role templates."
category: "devops"
technology: "kubernetes"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# Kubernetes Cheat Sheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Get all pods | `kubectl get pods --all-namespaces` | List all pods across all namespaces |
| Describe resource | `kubectl describe pod <name>` | Show detailed status of a resource |
| View logs | `kubectl logs -f <pod-name>` | Stream logs from a pod |
| Execute command | `kubectl exec -it <pod> -- sh` | Run shell in a container |
| Apply manifest | `kubectl apply -f manifest.yaml` | Create or update resources from file |
| Delete resource | `kubectl delete -f manifest.yaml` | Delete resources defined in file |
| Port forward | `kubectl port-forward svc/name 8080:80` | Forward local port to service port |
| Get nodes | `kubectl get nodes -o wide` | List nodes with detailed info |
| Get events | `kubectl get events --sort-by=.lastTimestamp` | View cluster events sorted by time |
| Get resource usage | `kubectl top pods` | Show pod CPU/memory usage |

## Common Commands

### Pod Management

```bash
# Create and manage pods
kubectl run nginx --image=nginx --port=80
kubectl get pods -w                              # Watch pod changes
kubectl get pods --show-labels                   # Show labels
kubectl get pods --field-selector=status.phase=Running
kubectl delete pod <name> --grace-period=0 --force

# Pod operations
kubectl logs --tail=50 --since=1h <pod-name>
kubectl logs -f deployment/<deploy-name>
kubectl exec -it <pod> -c <container> -- sh      # Specific container
kubectl cp /local/file <pod>:/remote/path
kubectl cp <pod>:/remote/path /local/file
kubectl attach <pod> -i
```

### Deployment Rollout Commands

```bash
kubectl create deployment nginx --image=nginx:1.25
kubectl get deployments -o wide
kubectl describe deployment nginx

# Rollout management
kubectl rollout status deployment/nginx
kubectl rollout history deployment/nginx
kubectl rollout undo deployment/nginx
kubectl rollout undo deployment/nginx --to-revision=2
kubectl rollout pause deployment/nginx
kubectl rollout resume deployment/nginx
kubectl rollout restart deployment/nginx

# Scaling
kubectl scale deployment/nginx --replicas=5
kubectl autoscale deployment/nginx --min=2 --max=10 --cpu-percent=70

# Update image
kubectl set image deployment/nginx nginx=nginx:1.26 --record
```

### Service Exposure

```bash
# Create services
kubectl expose deployment nginx --port=80 --target-port=80 --type=ClusterIP
kubectl expose deployment nginx --port=80 --type=NodePort
kubectl expose deployment nginx --port=80 --type=LoadBalancer

# Get service info
kubectl get svc -o wide
kubectl describe svc nginx

# Endpoints
kubectl get endpoints
kubectl describe endpoints nginx

# Ingress
kubectl get ingress -A
kubectl describe ingress <name>
kubectl annotate ingress <name> nginx.ingress.kubernetes.io/rewrite-target=/
```

### ConfigMap and Secret Creation

```bash
# ConfigMap from literals
kubectl create configmap app-config \
  --from-literal=APP_ENV=production \
  --from-literal=LOG_LEVEL=debug

# ConfigMap from file
kubectl create configmap app-config \
  --from-file=config.properties \
  --from-file=app.properties

# Secret from literals
kubectl create secret generic app-secret \
  --from-literal=DB_PASSWORD=supersecret \
  --from-literal=API_KEY=abc123

# Secret from file
kubectl create secret generic tls-secret \
  --from-file=tls.crt=server.crt \
  --from-file=tls.key=server.key

# TLS secret
kubectl create secret tls my-tls \
  --cert=path/to/cert.crt \
  --key=path/to/key.key

# Docker registry secret
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=user \
  --docker-password=pass \
  --docker-email=user@example.com
```

### Namespace Operations

```bash
kubectl create namespace my-app
kubectl get namespaces
kubectl describe namespace my-app
kubectl delete namespace my-app
kubectl config set-context --current --namespace=my-app
kubectl get all -n my-app                              # All resources in namespace
kubectl get pods --all-namespaces
kubectl api-resources --namespaced=true                 # List namespaced resources
```

### kubectl Context Switching

```bash
kubectl config get-contexts                            # List all contexts
kubectl config current-context                         # Show current context
kubectl config use-context minikube                    # Switch to minikube
kubectl config set-context my-context \
  --cluster=my-cluster \
  --namespace=my-ns \
  --user=my-user
kubectl config rename-context old-name new-name
kubectl config delete-context my-context
kubectl config view --minify                           # Show current context only
```

### Helm Commands

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
helm template my-release ./my-chart                    # Render templates locally
helm get values my-release
helm get manifest my-release

# Add Helm repository for Prometheus stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
```

### kubeadm Commands

```bash
kubeadm init --pod-network-cidr=10.244.0.0/16          # Initialize control plane
kubeadm join <control-plane-host>:6443 --token <token> # Join worker node
kubeadm token create --print-join-command               # Generate join token
kubeadm token list
kubeadm config view                                     # View cluster config
kubeadm upgrade plan                                    # Check upgrade path
kubeadm upgrade apply v1.28.0                           # Upgrade cluster
kubeadm reset                                           # Reset node to clean state
```

### Minikube Commands

```bash
minikube start --cpus=4 --memory=8192 --driver=docker
minikube stop
minikube delete
minikube status
minikube ip
minikube dashboard                                    # Open Kubernetes dashboard
minikube addons list
minikube addons enable ingress
minikube addons enable metrics-server
minikube service nginx-service                        # Open service in browser
minikube tunnel                                       # Expose LoadBalancer services
minikube ssh                                          # SSH into Minikube VM
minikube logs                                         # View Minikube logs
```

## Code Snippets

### YAML Manifest Structure Template

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

### Resource Limits Syntax

```yaml
# CPU: 1 CPU = 1000m (millicores)
# Memory: Ki, Mi, Gi (binary) or K, M, G (decimal)
resources:
  requests:
    cpu: "250m"        # 0.25 CPU cores
    memory: "256Mi"    # 256 Mebibytes
    ephemeral-storage: "1Gi"
  limits:
    cpu: "1"           # 1 CPU core
    memory: "1Gi"      # 1 Gibibyte
    ephemeral-storage: "2Gi"
```

### Probe Configuration Examples

```yaml
# HTTP liveness probe
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

# TCP readiness probe
readinessProbe:
  tcpSocket:
    port: 3306
  initialDelaySeconds: 5
  periodSeconds: 10

# Exec startup probe (for slow-starting containers)
startupProbe:
  exec:
    command:
    - cat
    - /tmp/healthy
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 30

# gRPC probe (Kubernetes 1.24+)
livenessProbe:
  grpc:
    port: 50051
    service: myapp.HealthService
  initialDelaySeconds: 10
```

### RBAC Role Templates

```yaml
# Namespace-scoped Role: Full access to pods and services
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
# Cluster-scoped Role: Read-only access to all resources
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
# RoleBinding to bind Role to user
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
# ClusterRoleBinding for cluster-wide access
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
# Verify RBAC
kubectl auth can-i create pods --as=alice --namespace=my-app
kubectl auth can-i list nodes --as=alice
kubectl get roles,rolebindings -A
kubectl get clusterroles,clusterrolebindings -A

# Create service account
kubectl create sa app-sa -n my-app
kubectl get secret -n my-app $(kubectl get sa app-sa -n my-app -o jsonpath='{.secrets[0].name}') -o jsonpath='{.data.token}' | base64 -d
```

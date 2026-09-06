---
title: "Kubernetes Networking Cheat Sheet"
description: "A quick reference guide for Kubernetes networking: Service types (ClusterIP, NodePort, LoadBalancer, ExternalName, Headless), Endpoints and EndpointSlices, Ingress routing and TLS, NetworkPolicy rules and default-deny patterns, CoreDNS service discovery, and connectivity debugging commands."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Kubernetes Networking Cheat Sheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| List all services | `kubectl get svc -A` | Show every Service in the cluster with type, cluster IP, and port mappings |
| Expose a deployment | `kubectl expose deployment web --port=80 --target-port=8080` | Create a ClusterIP Service that routes to pods labeled `app=web` |
| Inspect a service | `kubectl describe svc web` | Show endpoints, selector, ports, and events for a Service |
| View backend endpoints | `kubectl get endpoints web` | List the pod IPs currently backing a Service |
| Forward a local port | `kubectl port-forward svc/web 8080:80` | Reach a Service from your workstation without exposing it publicly |
| List Ingress objects | `kubectl get ingress -A` | Show all HTTP/HTTPS routing rules in the cluster |
| List IngressClasses | `kubectl get ingressclass` | Show the available ingress controllers (nginx, traefik, and so on) |
| Apply a NetworkPolicy | `kubectl apply -f default-deny.yaml` | Enforce pod-level ingress and egress firewall rules |
| List NetworkPolicies | `kubectl get networkpolicies -A` | Show every pod-level firewall rule in the cluster |
| Test cluster DNS | `kubectl run -it --rm dns-test --image=busybox -- nslookup web` | Resolve a Service name from inside the cluster |
| Check CoreDNS health | `kubectl get pods -n kube-system -l k8s-app=kube-dns` | Verify the CoreDNS replica set is running |

## Common Commands

### Service and Endpoint Inspection

```bash
# List and inspect Services
kubectl get svc -A
kubectl get svc web -o yaml
kubectl describe svc web

# Show the pod IPs behind a Service
kubectl get endpoints web
kubectl get endpointslices -l kubernetes.io/service-name=web
kubectl get endpointslices -A

# Confirm which pods match a Service selector
kubectl get pods -l app=web -o wide
```

### Creating and Exposing Services

```bash
# Expose an existing deployment as a Service
kubectl expose deployment web --port=80 --target-port=8080 --type=ClusterIP
kubectl expose deployment web --port=80 --target-port=8080 --type=NodePort
kubectl expose deployment web --port=80 --target-port=8080 --type=LoadBalancer

# Create Services directly
kubectl create service clusterip web --tcp=80:8080
kubectl create service nodeport web --tcp=80:8080
kubectl create service loadbalancer web --tcp=80:80
kubectl create service externalname db --external-name db.example.com
```

### Ingress Inspection

```bash
# List and inspect Ingress objects
kubectl get ingress -A
kubectl get ingress web -o yaml
kubectl describe ingress web

# Check the ingress controller and its Service
kubectl get ingressclass
kubectl get svc -n ingress-nginx
kubectl get pods -n ingress-nginx -o wide
```

### NetworkPolicy Management

```bash
# Apply, list, and remove network policies
kubectl apply -f default-deny.yaml
kubectl get networkpolicies -A
kubectl describe networkpolicy allow-frontend
kubectl get networkpolicies -n prod -o yaml
kubectl delete networkpolicy allow-frontend
```

### DNS and Service Discovery Debugging

```bash
# Resolve a Service from inside the cluster
kubectl run -it --rm dns-test --image=busybox:1.28 --restart=Never -- nslookup web
kubectl run -it --rm dns-test --image=busybox:1.28 --restart=Never -- nslookup web.default.svc.cluster.local

# Inspect CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
kubectl get configmap coredns -n kube-system -o yaml
```

### Connectivity Debugging

```bash
# Launch a network troubleshooting pod with curl, dig, and ping
kubectl run netshoot --image=nicolaka/netshoot --rm -it --restart=Never -- bash

# Test a Service from an existing pod
kubectl exec -it <pod> -- curl -v http://web:80
kubectl exec -it <pod> -- wget -qO- http://web

# Check reachability and routing
kubectl get pods -o wide
kubectl get endpoints web
kubectl get svc web -o yaml
kubectl port-forward svc/web 8080:80
```

## Code Snippets

### Service Definitions

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
# NodePort exposes the Service on a high port of every node
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
# Headless Service: clusterIP None disables the virtual IP so clients
# resolve the pod IPs directly (used by StatefulSets and service mesh)
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

### Ingress with TLS

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

### NetworkPolicy Patterns

```yaml
# Default deny: no pod in this namespace can send or receive traffic
# unless another policy explicitly allows it
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
# Allow traffic only from pods labeled app=frontend on port 8080
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
# Allow egress only to cluster DNS (CoreDNS lives in kube-system)
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

### EndpointSlice Example

```yaml
# EndpointSlices are the modern replacement for Endpoints; Kubernetes
# creates one automatically for every Service
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

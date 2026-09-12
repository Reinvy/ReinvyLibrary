---
title: "Kubernetes Service Mesh Guide"
description: "A criteria-driven guide to adopting a service mesh on Kubernetes with Istio — covering sidecar proxies, mTLS, traffic routing with VirtualService and DestinationRule, observability, and how Linkerd compares."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Kubernetes Service Mesh Guide

## Introduction

A service mesh moves cross-cutting network concerns out of application code and into the platform layer. Instead of every service re-implementing mutual TLS, retries, and timeouts, each Pod runs a **sidecar proxy** that transparently intercepts inbound and outbound traffic, while a **control plane** configures those proxies through custom resources.

With Istio the data plane is the Envoy sidecar injected into each Pod and the control plane is `istiod`, which issues workload certificates and pushes routing configuration. With Linkerd the sidecar is a lightweight Rust micro-proxy and the control plane is a small set of controllers. Both deliver mTLS, golden-signal telemetry, and declarative traffic shifting; the trade-off is operational weight versus configuration surface. This guide covers what to decide *before* installing a mesh, how to wire the essential Istio resources, and when a lighter mesh is the better engineering choice.

## Best Practices

- **Adopt only with a concrete driver**: "Everyone uses a mesh" is not a driver. Valid drivers are per-service mTLS mandates, fine-grained traffic shifting, or eliminating duplicated retry/circuit-breaker code. Without one, a mesh adds a permanent operational tax.
- **Move mTLS to strict mode in stages**: Install with `PERMISSIVE` mode, confirm every workload has a healthy `istio-proxy`, then flip namespaces to `STRICT`. Flipping cluster-wide on day one breaks any caller that is not yet meshed.
- **Keep routing policy in Git**: `VirtualService`, `DestinationRule`, and `PeerAuthentication` are code — review them through pull requests and never mutate them by hand during an incident without committing the change.
- **Right-size the sidecar**: Every injected proxy consumes CPU and memory, and a mesh with 500 Pods pays that 500 times. Cap proxy resources with annotations and include them in cluster capacity planning.
- **Pin versions and stage upgrades**: A control-plane upgrade changes data-plane behavior for every service at once. Pin `istio.version` and roll out namespace by namespace.
- **Define a blast-radius boundary**: Use `Sidecar` resources to scope what each namespace's proxies can see; without them, every proxy holds configuration for the entire mesh.

### Sidecar Resource Baseline

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
  namespace: shop
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyCPULimit: "500m"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
    spec:
      containers:
        - name: checkout
          image: registry.internal/shop/checkout:1.8.2
```

## Implementation Steps

### Step 1: Score Your Adoption Criteria

Answer these questions honestly; two or more "adopt" answers justify the mesh, otherwise revisit later.

| Criterion | Adopt a mesh | Stay on plain Kubernetes |
| --- | --- | --- |
| Service count | 20+ services across teams | A handful of services |
| Security | Zero-trust, per-service mTLS | NetworkPolicy is enough |
| Release strategy | Canary or A/B traffic split | Rolling updates are enough |
| Observability | Uniform latency/error telemetry | Per-app metrics acceptable |

### Step 2: Install Istio and Enable mTLS

Guard the install so a missing CLI or a wrong context fails loudly instead of leaving a half-configured control plane:

```bash
#!/usr/bin/env bash
set -euo pipefail

if ! command -v istioctl >/dev/null 2>&1; then
  echo "istioctl not found. Install Istio ${ISTIO_VERSION:-1.24.2} first." >&2
  exit 1
fi
if ! kubectl cluster-info >/dev/null 2>&1; then
  echo "No reachable Kubernetes context. Check KUBECONFIG." >&2
  exit 1
fi

istioctl install --set profile=default -y
kubectl wait --for=condition=Available deployment/istiod -n istio-system --timeout=180s
```

Then migrate authentication from permissive to strict per namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: shop
spec:
  mtls:
    mode: PERMISSIVE
```

### Step 3: Route Traffic with VirtualService and DestinationRule

`DestinationRule` declares version subsets; `VirtualService` declares matching and weights.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: checkout
  namespace: shop
spec:
  host: checkout.shop.svc.cluster.local
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: checkout
  namespace: shop
spec:
  hosts:
    - checkout.shop.svc.cluster.local
  http:
    - route:
        - destination:
            host: checkout.shop.svc.cluster.local
            subset: canary
          weight: 5
        - destination:
            host: checkout.shop.svc.cluster.local
            subset: stable
          weight: 95
```

### Step 4: Observe the Mesh

```bash
kubectl exec -n shop deploy/checkout -c istio-proxy -- \
  curl -s localhost:15000/stats/prometheus | grep istio_requests_total | head -n 5
```

Scrape these metrics with Prometheus, visualize with Kiali, and sample traces with Jaeger. Enable access logging only where needed — it is expensive at high request rates.

### Step 5: Compare with Linkerd Before Committing

| Dimension | Istio | Linkerd |
| --- | --- | --- |
| Data plane | Envoy sidecar | Rust micro-proxy |
| Resource overhead | Higher (full Envoy per Pod) | Lower (tens of MB per Pod) |
| Traffic splitting | `VirtualService` / `DestinationRule` | `HTTPRoute` of the Gateway API |
| mTLS | Automatic, per-namespace policy | Automatic, on by default |
| Configuration surface | Very large | Deliberately small |

Choose Linkerd when the requirement is security and telemetry; choose Istio when you need header-based routing, fault injection, and a broad extension ecosystem.

### Step 6: Roll Out Safely

```bash
#!/usr/bin/env bash
set -euo pipefail

namespace="${1:-shop}"
if ! kubectl get namespace "$namespace" >/dev/null 2>&1; then
  echo "Namespace '$namespace' does not exist. Nothing to roll back." >&2
  exit 1
fi

kubectl label namespace "$namespace" istio-injection- --overwrite
kubectl rollout restart deployment -n "$namespace"
kubectl rollout status deployment -n "$namespace" --timeout=180s
```

Every rollout restarts every Pod in the namespace, so schedule migrations inside a maintenance window and watch the mesh's success rate throughout.

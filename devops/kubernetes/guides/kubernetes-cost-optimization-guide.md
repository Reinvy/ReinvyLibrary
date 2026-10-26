---
title: "Kubernetes Cost Optimization Guide"
description: "A practical guide to cutting Kubernetes spend with accurate requests and limits, HPA and VPA tuning, cluster autoscaling, spot nodes, namespace quotas, allocation labels, and idle detection."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Kubernetes Cost Optimization Guide

## Introduction

Kubernetes makes capacity cheap to add and hard to price. A cluster that looks healthy in Grafana can still burn most of its bill on replicas that serve no traffic, requests copied from a blog post, and node pools that never scale below their minimum. Cost is a property of the manifests you ship, not a monthly finance surprise.

Optimization happens in four layers, and they must be worked in order because each changes the inputs of the next: workload efficiency (requests and limits), elasticity (HPA, VPA, KEDA), capacity efficiency (autoscaler bounds, mixed pools, spot), and attribution (quotas, labels, reports, idle detection).

## Best Practices

### 1. Right-Size Requests and Limits First

Requests are the scheduler's billing signal: a pod reserves its request on a node whether it uses it or not, so inflated requests force the autoscaler to buy capacity nobody consumes. Derive values from the 60th–75th percentile of observed usage over a week, keep request-to-limit near 2:1, and never omit requests — a requestless pod is best-effort and first to be evicted under pressure. Memory is incompressible, so a limit below the working set means `OOMKilled`, not throttling.

### 2. Use HPA for Variable Demand

A deployment pinned at 20 replicas to survive a two-hour peak pays for 22 hours of idle capacity. Scale on request rate, queue depth, or latency rather than raw CPU, set `minReplicas` from measured off-peak traffic instead of anxiety, and use asymmetric behavior — fast up, slow down — so replica counts do not thrash. Remove cushions that only compensate for slow image pulls; fix the pull time instead.

### 3. Run VPA in Recommendation Mode

VPA in `Auto` mode mutates requests by evicting pods; in `Recommendation` mode it is a free, continuous right-sizing report. Read it weekly, apply changes through your normal release path, and cap suggestions with `minAllowed` and `maxAllowed` so a traffic anomaly cannot permanently inflate a request. Let VPA own memory only where HPA does not scale on memory, otherwise the two controllers fight.

### 4. Move Interruptible Work to Spot

Spot capacity typically costs 60–70% less than on-demand, at the price of a two-minute eviction notice. Keep stateful workloads, ingress, and long-lived connections on-demand; taint the spot pool and tolerate it only on batch, CI, and queue consumers; spread replicas across instance types and zones; and always pair eviction-prone workloads with a PodDisruptionBudget.

### 5. Enforce Quotas and a Label Contract

One team's runaway CronJob should not consume the cluster budget. Apply a `ResourceQuota` for `requests.cpu`, `requests.memory`, and object counts, pair it with a `LimitRange` that injects defaults, and require `app.kubernetes.io/part-of` plus a `cost-center` label, rejecting manifests that lack them via Kyverno or Gatekeeper. You cannot reduce what you cannot attribute.

### 6. Hunt Idle Resources and Shape Pools

Waste accumulates silently: abandoned `LoadBalancer` Services, unattached PersistentVolumes, finished Jobs never collected, deployments scaled to zero but still reserving. Report pods below 5% of request for seven days, delete orphaned PVCs, and set `ttlSecondsAfterFinished`. In parallel, run at least an on-demand pool and a spot pool, enable the `least-waste` or `priority` expander, and set a realistic `max` per pool — that bound is your worst-case bill.

## Implementation Steps

### Step 1: Measure Current Waste

Install metrics-server if missing, then compare requests against real consumption:

```bash
kubectl top pods -A --sort-by=cpu | head -30
kubectl get pods -A -o json | jq -r '.items[] | select(.status.phase=="Running")
  | [.metadata.namespace, .metadata.name,
     ([.spec.containers[].resources.requests.cpu // "0"] | join(","))] | @tsv' | head -30
```

A pod requesting `2` CPU while using `150m` wastes 92%. Sort namespaces by that ratio; the top three usually hold most of the opportunity.

### Step 2: Apply Defaults and Quotas

Baseline each team namespace before touching individual workloads:

```yaml
apiVersion: v1
kind: LimitRange
metadata: { name: defaults, namespace: team-checkout }
spec:
  limits:
    - type: Container
      defaultRequest: { cpu: 100m, memory: 128Mi }
      default: { cpu: 500m, memory: 512Mi }
---
apiVersion: v1
kind: ResourceQuota
metadata: { name: team-checkout-quota, namespace: team-checkout }
spec:
  hard:
    requests.cpu: "40"
    requests.memory: 80Gi
    count/deployments.apps: "60"
```

Apply it with `kubectl apply -f namespace-baseline.yaml`, then confirm the quota is registered and not already exhausted with `kubectl describe resourcequota team-checkout-quota -n team-checkout`. If the namespace exceeds quota, running pods survive but new ones are rejected, so correct the numbers before rolling out.

### Step 3: Right-Size with VPA Recommendations

Create a recommendation-only VPA for a representative deployment:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata: { name: checkout-api-vpa, namespace: team-checkout }
spec:
  targetRef: { apiVersion: apps/v1, kind: Deployment, name: checkout-api }
  updatePolicy: { updateMode: "Off" }
  resourcePolicy:
    containerPolicies:
      - containerName: api
        minAllowed: { cpu: 50m, memory: 64Mi }
        maxAllowed: { cpu: "2", memory: 2Gi }
```

After 24 hours, read the suggested targets and ship them through your release process:

```bash
kubectl get vpa checkout-api-vpa -n team-checkout \
  -o jsonpath='{.status.recommendation.containerRecommendations[*]}' | jq
```

### Step 4: Add a Spot Pool and Move Batch Work

Taint the spot pool and tolerate it only where eviction is survivable. The labels double as the cost attribution key:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: invoice-renderer, namespace: team-billing }
spec:
  replicas: 4
  selector:
    matchLabels: { app: invoice-renderer }
  template:
    metadata:
      labels:
        app: invoice-renderer
        app.kubernetes.io/part-of: billing
        cost-center: finance-42
    spec:
      terminationGracePeriodSeconds: 90
      nodeSelector: { karpenter.sh/capacity-type: spot }
      tolerations: [{ key: workload-type, operator: Equal, value: batch, effect: NoSchedule }]
      containers:
        - name: renderer
          image: registry.example.com/invoice-renderer:2.4.1
          resources:
            requests: { cpu: 250m, memory: 512Mi }
            limits: { cpu: "1", memory: 1Gi }
```

Rehearse an eviction by draining one spot node; the replicas must reschedule without dropping in-flight work.

### Step 5: Attribute Cost, Then Automate Idle Detection

Split node cost by actual pod usage with a cost tool, and publish the top spenders weekly:

```bash
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm upgrade --install kubecost kubecost/cost-analyzer \
  --namespace kubecost --create-namespace \
  --set global.clusterId="prod-ap-southeast-1"
```

```bash
#!/usr/bin/env bash
set -euo pipefail
WINDOW="${1:-7d}"
OUT="/tmp/cost-report-$(date +%F).json"
kubectl get ns kubecost >/dev/null 2>&1 || { echo "kubecost missing" >&2; exit 1; }
kubectl port-forward -n kubecost svc/kubecost-cost-analyzer 9090:9090 >/dev/null 2>&1 &
PF_PID=$!
trap 'kill "$PF_PID" 2>/dev/null || true' EXIT
sleep 3
curl -fsS "http://localhost:9090/model/allocation?window=${WINDOW}&accumulate=true" -o "$OUT" \
  || { echo "cost API request failed" >&2; exit 1; }
jq -r '.data[0][] | [.name, (.totalCost|tostring)] | @tsv' "$OUT" | sort -k2 -nr | head -10
```

Finish with a weekly idle sweep as a `CronJob` that flags workloads below 10 millicores, and treat every hit as a ticket rather than background noise. Each right-sized request lowers the node count the autoscaler must buy, which lowers the bill that quotas and reports then track.

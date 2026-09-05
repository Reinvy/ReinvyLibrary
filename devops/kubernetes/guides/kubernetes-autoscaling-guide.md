---
title: "Kubernetes Autoscaling Guide"
description: "A practical guide to autoscaling Kubernetes workloads — horizontal pod autoscaling (HPA) with CPU, memory, and custom metrics, vertical pod autoscaling (VPA), cluster autoscaling, and event-driven scaling with KEDA — including stabilization windows, scaling policies, capacity planning, and operational best practices."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Kubernetes Autoscaling Guide

## Introduction

Autoscaling is one of the pillars of a production-grade Kubernetes platform. A cluster that is sized for peak traffic spends most of its life underutilized, while a cluster sized for average traffic falls over during spikes. Autoscaling solves both problems by continuously matching capacity to demand across three layers:

1. **Horizontal Pod Autoscaling (HPA)** — changes the number of pod replicas based on observed metrics such as CPU, memory, request latency, or queue depth.
2. **Vertical Pod Autoscaling (VPA)** — changes the CPU and memory requests (and limits) of a pod's containers when the workload cannot be scaled horizontally.
3. **Cluster Autoscaling (CA)** — changes the number of worker nodes when pending pods cannot be scheduled on the current node pool.

Modern platforms often add a fourth layer — **event-driven scaling with KEDA** — which scales workloads on external signals such as Kafka consumer lag, SQS queue depth, RabbitMQ message count, or cron schedules, going all the way down to zero replicas when there is nothing to process.

This guide covers best practices for designing and operating each layer, and walks through a complete implementation from a bare cluster to a workload that scales on real business metrics. It assumes you already run Kubernetes in production and want to make your scaling behavior deliberate, observable, and cost-efficient.

## Best Practices

### 1. Set Accurate Resource Requests and Limits First

Autoscaling decisions are only as good as the resource data they are based on. HPA's CPU and memory utilization targets are computed as `current usage / requested amount`, so a pod with an unrealistically small request reaches 100% utilization almost immediately, and a pod with an inflated request never triggers a scale-up even when it is genuinely saturated.

- Base requests on observed steady-state usage, not on theoretical maximums. Run the workload for a few days, inspect `kubectl top pods`, and set requests to a value around the 50th–70th percentile of observed usage.
- Set limits high enough to avoid OOMKills and CPU throttling, but always leave headroom above requests.
- VPA (in recommendation mode) can help you calibrate requests empirically — see Step 4.
- Treat requests as a contract with the scheduler: the sum of requests across all pods is what the Cluster Autoscaler uses to decide whether a node is underutilized or overcommitted.

### 2. Use HPA for Stateless, Horizontally Scalable Workloads

HPA is the right tool when additional replicas genuinely increase throughput. Typical candidates are web APIs, workers, aggregators, and any service that can shard or partition work. Before adopting HPA, verify three properties of your workload:

- **Idempotent handling of in-flight work** — if a replica is terminated mid-request, the client (or a retry queue) must be able to recover.
- **No single-writer bottleneck** — a service that writes to one database table through one connection does not scale horizontally; scale the database instead.
- **Graceful shutdown** — pods must drain connections and finish in-flight work during termination, otherwise scale-downs cause request failures (use a pre-stop hook and a generous `terminationGracePeriodSeconds`).
- **Readiness and startup probes** — HPA only counts ready replicas, so slow-starting pods that never become ready will cause the HPA to scale out more aggressively. A proper `startupProbe` prevents this feedback loop.

Stateful workloads such as Kafka brokers, databases, and ZooKeeper ensembles should NOT be managed by HPA. Their replication topology is fixed by design; scale them by changing the stateful set replica count deliberately, never by an automated metric loop.

### 3. Choose the Right Metrics for HPA

CPU utilization is a convenient default but a poor proxy for user experience. A service can be at 30% CPU while its p95 latency is blowing up because of a lock contention or a downstream dependency. Prefer metric families that reflect the business signal:

- **Latency-based metrics** such as p95 or p99 request duration (via a Prometheus adapter or a custom metrics API) — a direct measure of user experience.
- **Throughput metrics** such as requests per second.
- **Queue depth metrics** — for workers, the number of pending messages is usually the best scaling signal.
- **External metrics** (from cloud providers) such as SQS `ApproximateNumberOfMessagesVisible` or Pub/Sub subscription backlog.

When using custom metrics, keep the metric cardinality low and the scrape interval aligned with the HPA sync period (default 15 seconds). Noisy metrics with rapid oscillation, such as raw goroutine counts or raw connection counts, cause the HPA to thrash; smooth them with a rate or a moving average in the adapter query.

### 4. Tune Stabilization Windows and Behavior Policies

The default HPA behavior scales down after 5 minutes of sustained low utilization (the `scaleDown` stabilization window). This is often too aggressive: a batch job that finishes a spike may trigger a scale-down cascade that thrashes the deployment. The `behavior` field gives you explicit control:

- Keep the default 0-second scale-up stabilization so you react to traffic spikes immediately.
- Extend the scale-down stabilization window to 5–15 minutes depending on how spiky your traffic is.
- Use `selectPolicy: Max` on scale-down so that the least aggressive policy wins, and `selectPolicy: Min` on scale-up so the most aggressive policy wins.
- Consider `pods` policies for workloads where each pod adds meaningful capacity, and `percent` policies for large deployments where a percentage-based step is more predictable.

A common production pattern is "fast up, slow down": scale up by 100% of current pods when needed, but scale down by at most 25% per evaluation period, with a stabilization window of 10 minutes.

### 5. Combine HPA and VPA Deliberately

HPA and VPA both react to resource usage, and if they fight over the same dimension you get an unstable system: HPA scales out because CPU is high, VPA grows the request, the pod restarts with a bigger request, HPA scales back in... and the cycle repeats.

- Run VPA in `recommendation` mode (never `auto`) when the workload is also managed by HPA on CPU or memory. Apply the recommendations manually during release windows.
- Run VPA in `auto` mode for workloads that are NOT scaled horizontally, or that are scaled on non-resource metrics (latency, queue depth).
- Never put an HPA on CPU and a VPA in `auto` mode on the same deployment. Choose one owner per resource dimension.
- VPA updates require pod recreation; budget for brief disruptions (a PDB with `maxUnavailable: 1` and a rollout strategy with `maxSurge`) when VPA evicts pods to apply new requests.

### 6. Configure the Cluster Autoscaler with Guardrails

The Cluster Autoscaler (CA) adds or removes nodes when pods are unschedulable or nodes are underutilized. Without guardrails, it can surprise you with cost or with failed scale-ups:

- Always set `min` and `max` per node pool. The gap between them is your cost envelope; the CA will never exceed it.
- Use diverse instance families inside a pool so spot interruptions or instance-type shortages do not block scale-up. On AWS, use mixed instances policies.
- Choose an expander strategy deliberately: `priority` (order node pools by preference), `least-waste` (pick the pool with least wasted CPU/RAM), `random`, or `most-pods`. In multi-tenant clusters, `priority` is usually the safest.
- The default scale-down utilization threshold of 0.5 (50%) is sane for most clusters; lower it to 0.4–0.45 if you want to keep nodes around longer for burst absorption.
- Set `--max-empty-bulk-delete` and scale-down unneeded time (`--scale-down-unneeded-time`, default 10 minutes) so nodes are not deleted seconds after they become idle.
- Do not use `cluster-autoscaler.kubernetes.io/safe-to-evict: "false"` annotations on ordinary workloads; they block scale-down and strand capacity.

### 7. Scale Event-Driven Workloads with KEDA

KEDA turns external event sources into Kubernetes metrics and drives HPA on top of them. It is the standard way to scale consumers, workers, and batch processors:

- Use `ScaledObject` for workloads whose demand is external (Kafka consumer lag, RabbitMQ queue length, SQS depth, Postgres query volume, custom HTTP endpoints).
- Keep the `minReplicaCount` above zero for latency-sensitive consumers, especially Kafka consumers with large consumer-group rebalances — scaling to zero forces a full group rebalance on the next scale-up.
- Reserve `scale-to-zero` for truly asynchronous, delay-tolerant jobs (nightly imports, email digests, report generation).
- Use `Cron` triggers for predictable workloads (batch windows at 02:00, Monday morning peaks) where metric-driven scaling would lag behind the demand curve.
- Use `TriggerAuthentication`/`ClusterTriggerAuthentication` to centralize credentials for the event sources; never hard-code secrets in the `ScaledObject`.

### 8. Plan Capacity and Burst Budgets

Autoscaling does not eliminate the need for capacity planning; it changes the shape of it. Keep a deliberate burst buffer:

- Reserve headroom in at least one node pool (e.g., a small "burst" pool that is usually idle) so a sudden traffic spike does not wait 2–5 minutes for a cloud provider to provision nodes.
- Understand your cold-start math: a brand-new node takes 1–5 minutes from the scale-up decision to `Ready`, plus image pull time. If your SLO is seconds, you need a standing buffer — either a minimum number of always-on nodes or an over-provisioning deployment (a low-priority pause pod that occupies spare capacity and is evicted first by the CA).
- Pair autoscaling with PodDisruptionBudgets so voluntary disruptions (node drains, VPA evictions, cluster upgrades) never drop availability below your SLO.
- Set `topologySpreadConstraints` so that scale-outs spread across zones instead of piling onto one availability zone.

### 9. Monitor Autoscaling Behavior Continuously

Scaling failures are silent and expensive — the cluster quietly fails to scale, or quietly spends money on idle nodes. Make autoscaling observable:

- Watch HPA status conditions (`kubectl describe hpa`) for `AbleToScale`, `ScalingActive`, and `ScalingLimited`. `ScalingLimited` with `TooManyReplicas` or `FailedGetScale` means your maxReplicas or metric source is misconfigured.
- Export HPA decisions to Prometheus via `kube-state-metrics` (`kube_horizontalpodautoscaler_status_current_replicas`, `kube_horizontalpodautoscaler_spec_max_replicas`).
- Alert on: HPA stuck at max replicas for N minutes, CA repeatedly failing to provision nodes, VPA recommendations diverging wildly between runs, and KEDA `ScaledObject` in a failed/unknown state.
- Keep `cluster-autoscaler` logs at `--v=4` during incident triage; they record every scale-up/down decision with its reason.

### 10. Test Autoscaling Under Realistic Load

Never ship an autoscaling configuration that has only been tested with a synthetic `kubectl run load-generator`. Validate the whole chain — request path, metric scrape, adapter query, HPA decision, pod scheduling, node provisioning:

- Run a load test with a realistic profile (ramp-up, plateau, spike) against a staging cluster that mirrors production node pools.
- Verify three things separately: the HPA reacts within the expected evaluation period, the new pods become ready and receive traffic, and the Cluster Autoscaler provisions nodes before the HPA hits `maxReplicas` (if it does, raise `maxReplicas` or plan a larger burst buffer).
- Test the scale-down path too: after the load stops, confirm the deployment settles at its minimum replica count and the CA drains and removes nodes.
- Document the expected end-to-end latency from "metric spike" to "extra capacity serving traffic" so on-call engineers know what "healthy" looks like.

## Implementation Steps

### Step 1: Set Up the Metrics Server

The HPA needs a source of resource metrics — the `metrics.k8s.io` API, usually provided by `metrics-server`. Most managed Kubernetes offerings (EKS, GKE, AKS) install it by default; for self-managed clusters, install it via Helm:

```bash
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm upgrade --install metrics-server metrics-server/metrics-server \
  --namespace kube-system \
  --set args={--kubelet-insecure-tls}
```

Verify that node and pod metrics are being collected:

```bash
kubectl top nodes
kubectl top pods -A
```

The output should show CPU and memory usage per node and per pod. If `kubectl top` returns `error: metrics not available yet`, wait a minute and retry — the metrics server aggregates data in 15–30 second intervals.

### Step 2: Create an HPA for CPU and Memory

Create a manifest for an HPA that targets 70% CPU utilization and 80% memory utilization, with explicit scaling behavior ("fast up, slow down"):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 30
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
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
      selectPolicy: Max
```

Apply it and watch the HPA's status conditions:

```bash
kubectl apply -f hpa.yaml
kubectl describe hpa api-server-hpa
```

Look for `AbleToScale True`, `ScalingActive True`, and an `Events` section that logs each scale decision. The `behavior` block above scales up by 100% (or 4 pods, whichever is more) immediately on a spike, but waits 10 minutes before scaling down, and only removes 25% of pods per minute.

### Step 3: Add Custom Metrics with the Prometheus Adapter

Resource metrics alone cannot express business signals. Install Prometheus, expose application metrics such as `http_requests_total` and `http_request_duration_seconds` (via a Prometheus client library), then install the Prometheus adapter to expose them through the custom metrics API.

Install the adapter and configure it to expose a request-rate metric:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus.monitoring.svc:9090 \
  --set logLevel=4
```

```yaml
# adapter configmap patch — expose requests-per-second as a custom metric
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-adapter
  namespace: monitoring
data:
  config.yaml: |
    rules:
      - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
        resources:
          overrides:
            namespace: { resource: namespace }
            pod: { resource: pod }
        name:
          matches: 'http_requests_total'
          as: 'http_requests_per_second'
        metricsQuery: 'sum(rate(http_requests_total[2m])) by (namespace, pod)'
```

Verify the custom metric is available, then create an HPA that scales on it:

```bash
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second" | jq
```

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-rps-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "250"
```

The HPA now keeps roughly 250 requests per second per pod — a target that reflects real user demand instead of CPU percentage. Note the `2m` rate window in the adapter query: it smooths short spikes that would otherwise cause replica flapping.

### Step 4: Configure the Vertical Pod Autoscaler

For workloads that cannot scale horizontally (legacy batch processes, single-instance workers, stateful sidecars), the VPA adjusts container requests automatically. Install it and create a VPA in `recommendation` mode first so you can inspect what it suggests before letting it act:

```bash
helm repo add fairwinds-stable https://charts.fairwinds.com/stable
helm upgrade --install vpa fairwinds-stable/vpa --namespace kube-system
```

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: report-worker-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: report-worker
  updatePolicy:
    updateMode: "Recommendation" # switch to "Auto" only after reviewing recommendations
  resourcePolicy:
    containerPolicies:
      - containerName: worker
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: "4"
          memory: 4Gi
```

Inspect the recommendations:

```bash
kubectl describe vpa report-worker-vpa
```

The `Recommendation` section lists `target` (the recommended request), `lowerBound`, and `upperBound`. When you are confident in the recommendations, switch `updateMode` to `Auto` — the VPA will evict pods whose requests are out of range and recreate them with the new requests. Ensure a PDB protects the workload during these evictions:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: report-worker-pdb
  namespace: production
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: report-worker
```

### Step 5: Enable the Cluster Autoscaler

The Cluster Autoscaler provisions nodes when pods are unschedulable and removes nodes when they are underutilized. On EKS:

```bash
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm upgrade --install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName=my-cluster \
  --set awsRegion=ap-southeast-1 \
  --set rbac.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::123456789012:role/cluster-autoscaler
```

With auto-discovery, the CA reads node pool bounds from the node labels `cluster-autoscaler.kubernetes.io/min-size` and `.../max-size`; alternatively pass `--nodes=3:10:worker-a` style flags for static pools. Verify the CA is running and watching:

```bash
kubectl logs -n kube-system deploy/cluster-autoscaler --tail=50
```

A healthy CA logs lines like `pod ... is unschedulable` and then `scale-up: setting group worker-a size to 4`. Test it by creating a Deployment with a request the current nodes cannot fit; within a few minutes the CA should provision a node and the pod should schedule. Always keep `--scale-down-utilization-threshold=0.5` (or tune it deliberately) and review the `--expander` flag: `priority` with a `ConfigMap` of priorities is the recommended setup for multi-pool clusters.

### Step 6: Add Event-Driven Scaling with KEDA

Install KEDA and define a `ScaledObject` that scales a Kafka consumer on consumer-group lag:

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm upgrade --install keda kedacore/keda --namespace keda --create-namespace
```

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: kafka-auth
  namespace: production
spec:
  secretTargetRef:
    - parameter: sasl
      name: kafka-secrets
      key: sasl
    - parameter: username
      name: kafka-secrets
      key: username
    - parameter: password
      name: kafka-secrets
      key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor-scaledobject
  namespace: production
spec:
  scaleTargetRef:
    name: order-processor
  minReplicaCount: 2
  maxReplicaCount: 50
  pollingInterval: 10
  cooldownPeriod: 120
  triggers:
    - type: kafka
      metadata:
        topic: orders
        bootstrapServers: kafka-brokers.production.svc:9092
        consumerGroup: order-processor-group
        lagThreshold: "100"
      authenticationRef:
        name: kafka-auth
```

KEDA monitors the Kafka consumer lag every 10 seconds and drives the HPA so that roughly 100 unconsumed messages per replica are kept. The `minReplicaCount: 2` keeps the consumer group healthy — a single replica would stall when a rebalance starts. For scheduled workloads, add a cron trigger:

```yaml
    - type: cron
      metadata:
        timezone: Asia/Jakarta
        start: "0 2 * * *"
        end: "30 3 * * *"
        desiredReplicas: "10"
```

Verify the operator accepted the `ScaledObject` and that an HPA was created for it:

```bash
kubectl get scaledobject order-processor-scaledobject
kubectl get hpa -n production | grep order-processor
```

### Step 7: Validate, Monitor, and Tune

Run an end-to-end load test against the staging cluster and verify every layer of the chain reacts. A simple k6 script that ramps traffic and then plateaus:

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 200 },   // ramp up
    { duration: "5m", target: 500 },   // plateau
    { duration: "2m", target: 800 },   // spike
    { duration: "5m", target: 0 },     // drain
  ],
};

export default function () {
  const res = http.get("https://api.example.com/health");
  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(1);
}
```

```bash
k6 run load-test.js
```

While the load runs, observe the chain:

```bash
watch -n 5 kubectl get hpa api-server-rps-hpa
watch -n 10 kubectl get nodes
kubectl describe hpa api-server-rps-hpa
```

Confirm that the HPA replica count rises during the spike, that new pods become `Ready` and start serving, and that the Cluster Autoscaler provisions nodes *before* the HPA hits `maxReplicas`. After the drain phase, confirm the deployment returns to `minReplicas` and the CA removes the extra nodes (`kubectl get nodes` should shrink back).

Finally, tune based on what you observe:

- If the HPA oscillates between two replica counts, increase the scale-down stabilization window or smooth the metric with a wider rate window in the adapter.
- If scale-ups are too slow, reduce `stabilizationWindowSeconds` on scale-up, increase the `Percent` policy, or grow the standing burst buffer.
- If the CA keeps a node idle for a long time between bursts, lower `--scale-down-unneeded-time` or the utilization threshold.
- Record the tuned values in the workload's Helm values or GitOps manifests so the configuration is reviewable and versioned.

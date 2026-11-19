---
title: "Kubernetes Scheduling and Workload Placement Guide"
description: "A practical guide to controlling where Kubernetes pods land — node affinity, taints and tolerations, topology spread constraints, priority and preemption, QoS-based eviction, descheduling, and scheduler tuning — with a repeatable workflow for auditing and enforcing placement across node pools."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Kubernetes Scheduling and Workload Placement Guide

## Introduction

Most Kubernetes incidents that look like capacity problems are actually placement problems. A cluster can have 40% of its CPU idle and still refuse to start a pod, because the pod needs four cores on a single node, or a GPU, or a zone that still has room. Conversely, a cluster can be fully "green" on utilization and still be fragile, because every replica of a service landed on the same node — or the same rack — and one hardware failure takes the whole service down.

The kube-scheduler makes every one of these decisions, and it makes them with a narrow view of the world: it looks only at **resource requests**, node labels, taints, and the placement rules declared on the pod. It never looks at actual CPU or memory usage. That single fact drives most of this guide — if your requests are wrong, every placement decision downstream is wrong too.

The scheduler works in two phases for each pending pod:

1. **Filtering** — eliminate nodes that cannot host the pod at all (insufficient allocatable resources, taints without matching tolerations, unsatisfied node selectors, port conflicts, volume topology).
2. **Scoring** — rank the surviving nodes with weighted plugins (resource balance, image locality, topology spread, inter-pod affinity) and bind the pod to the highest-scoring one.

Placement engineering therefore has two levers: **declarative constraints on the workload** (affinity, spread, tolerations, priority) and **configuration of the scheduler itself** (profiles, plugin weights, scoring strategy). This guide covers both, in the order you would apply them to a real cluster.

A useful distinction to keep in mind throughout:

- **Hard rules** (`requiredDuringScheduling...`, `DoNotSchedule`, taints without tolerations) make a pod *pending* when they cannot be satisfied. They are correctness constraints.
- **Soft rules** (`preferredDuringScheduling...`, `ScheduleAnyway`, scoring weights) only nudge the scheduler. They degrade gracefully.

Production clusters mostly break because teams overuse hard rules. The practices below try to keep the hard set as small as possible.

## Best Practices

### 1. Treat resource requests as the scheduling contract

The scheduler bin-packs using requests, so requests are not a hint — they are the contract between the workload and the cluster. Two consequences follow. First, requests that are too small allow dangerous overcommit: the node reports plenty of allocatable CPU while the kubelet is evicting pods under memory pressure. Second, requests that are too large leave nodes visibly underutilized while pods stay pending.

Set requests from observed usage percentiles (p95 CPU, p99 memory for latency-sensitive services), never from guesswork, and revisit them on a schedule. Memory is not compressible: a container that exceeds its memory limit is OOM-killed immediately, so memory requests should be close to real steady-state usage. CPU is compressible, so CPU requests can sit below peak as long as the node is not routinely saturated.

### 2. Target node pools with labels, not individual nodes

`nodeSelector` and `nodeAffinity` should reference *classes* of node — `node-pool=memory-optimized`, `accelerator=nvidia-a100`, `arch=arm64` — never hostnames. Node names change during upgrades and autoscaling; pool labels are stable and are the same labels your cluster autoscaler uses to pick a node template when scaling up.

A corollary: if a workload's node selector matches no node template in any autoscaling group, it will stay pending forever. Keep a documented label taxonomy and validate new selectors against it before rollout.

### 3. Prefer topology spread constraints over heavyweight anti-affinity

`podAntiAffinity` with `requiredDuringSchedulingIgnoredDuringExecution` is a common way to express "do not put my replicas together", and at scale it is a trap: the scheduler evaluates every existing pod when filtering a candidate node, so required anti-affinity over large namespaces adds quadratic work to the scheduling cycle and can push pods to pending when no node satisfies it.

`topologySpreadConstraints` expresses the same intent declaratively and lets you choose the failure mode: `maxSkew: 1` across `topology.kubernetes.io/zone` with `whenUnsatisfiable: ScheduleAnyway` gives even distribution when possible and still schedules when the cluster is constrained. Use spread constraints for replica distribution as the default, and reserve required anti-affinity for small, tightly scoped cases such as two conflicting singletons.

### 4. Reserve dedicated capacity with taints and tolerations

Labels alone do not reserve anything — a node labeled `workload=payments` will happily accept unrelated pods unless it is also tainted. The pair is the pattern:

- **Taint** the node (`dedicated=payments:NoSchedule`) so generic workloads are filtered out.
- **Tolerate** the taint only on the workloads that belong there.
- **Select** the node pool with affinity so the tolerated workload actually prefers that pool instead of drifting to general nodes.

This is how you build isolation for latency-sensitive services, GPU pools, compliance-scoped workloads, and system add-ons. Use `NoSchedule` for isolation; use `NoExecute` only when you also want eviction of already-running pods, and pair it with `tolerationSeconds` so evictions are graceful rather than abrupt.

### 5. Model maintenance and failure with PodDisruptionBudgets

Placement rules describe where pods *may* run; PodDisruptionBudgets describe how many pods may be *removed at once*. Without a PDB, node drains during a cluster upgrade will evict every replica of a service simultaneously. With an overly strict PDB (`minAvailable` equal to the replica count), the drain blocks forever and cluster upgrades stall.

Set PDBs from the same arithmetic as your replica count and spread: with three replicas across three zones and `minAvailable: 2`, one node can drain at a time. The descheduler and node drains both respect PDBs, which makes them the safety rail for every voluntary disruption in the cluster.

### 6. Use priority classes to encode business criticality

PriorityClass does two things: it orders the scheduling queue (higher-priority pods are considered first when the cluster is full) and it enables **preemption** — the scheduler may evict lower-priority pods to make room. That is a powerful and dangerous lever.

Reserve high priority for genuinely critical workloads (ingress controllers, DNS, monitoring agents, payment paths). Give batch and best-effort jobs a low or negative priority so they yield capacity under pressure. For workloads that should be ordered but should never evict anything, set `preemptionPolicy: Never` — this gives you queue ordering with zero disruption risk.

### 7. Set requests equal to limits for latency-critical workloads

QoS class is derived, not declared: identical CPU and memory requests and limits on every container makes the pod `Guaranteed`, requests below limits makes it `Burstable`, and no requests at all makes it `BestEffort`. The kubelet evicts in reverse order of that ranking when a node comes under pressure — BestEffort first, Burstable next, Guaranteed last.

For services where a memory-pressure eviction is unacceptable, make the pod Guaranteed. For batch work where eviction is cheap, BestEffort or loose Burstable is fine and improves packing efficiency. Mixing the two deliberately across the cluster is what keeps a node-level memory spike from cascading into a user-visible outage.

### 8. Run a descheduler instead of hand-placing pods

Placement is decided once, at scheduling time, and then never revisited by the scheduler. Over days, rolling updates, autoscaling events, and node replacements produce a cluster that is technically valid but badly balanced: some nodes at 90% requests, others at 20%.

The descheduler closes that loop. It periodically looks for pods that violate a policy — duplicate pods on one node, nodes far below the utilization threshold, pods violating topology spread after a scale-up — and evicts them so the scheduler can re-place them. Because it evicts rather than moves, PDBs must exist first, and `--max-no-evictions` style guardrails should be set so a bad policy cannot empty a node.

### 9. Debug pending pods from scheduler events, not guesses

A pending pod always has a reason, and the scheduler writes it to the pod's events. `kubectl describe pod` shows a `FailedScheduling` event with the exact filter that rejected each node (`0/24 nodes are available: 6 Insufficient cpu, 18 node(s) didn't match Pod's node affinity/selector`). That message is the authoritative answer.

The common causes, in rough frequency order: requests larger than any node's allocatable, node selector or affinity matching no node, missing toleration for a taint, required anti-affinity already violated by existing pods, PVC bound to a zone where no node has capacity, and a quota or limit range blocking admission (which surfaces as a different event entirely).

### 10. Tune the scheduler profile for the cluster's packing goal

By default the `NodeResourcesFit` plugin scores nodes with `LeastAllocated`, which spreads pods out. That is the right default for reliability, but it is the wrong choice for cost-sensitive clusters of homogeneous workloads, where `MostAllocated` (bin packing) reduces the number of nodes needed. Kubernetes 1.31 also added `RequestedToCapacityRatio` as a first-class scoring strategy.

Tune this at the profile level in `KubeSchedulerConfiguration` — not per workload — and pair it with a descheduler policy that matches the same goal. Running `MostAllocated` without a descheduler tends to produce hot nodes over time; running `LeastAllocated` on a cost-optimized cluster wastes nodes.

### 11. Keep interruption-sensitive and interruption-tolerant workloads apart

Spot and preemptible node pools are the single largest cost lever in most clusters, but they are only safe for workloads that can lose a node at any moment. Express that as placement: a dedicated spot pool with its own taint, tolerations only on stateless and batch workloads, long `terminationGracePeriodSeconds` plus a preemption-aware shutdown handler, and priority classes that let the scheduler react quickly.

Never let a stateful database or a singleton controller tolerate the spot taint by accident. A single broad toleration in a shared Helm chart is enough to leak critical workloads onto interruptible capacity.

## Implementation Steps

### Step 1: Audit current placement and request accuracy

Start from data. Dump the current state of requests versus usage per node and per workload, and look for the two signatures of a placement problem: nodes with high allocated requests but low real usage, and pods whose requests are more than 2x their p95 usage.

```bash
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
CPU_ALLOC:.status.allocatable.cpu,\
MEM_ALLOC:.status.allocatable.memory,\
POOL:.metadata.labels.node-pool

kubectl describe node <node-name> | sed -n '/Allocated resources/,/Events/p'

kubectl top pods -A --sort-by=memory | head -30
```

For a per-workload view, compare declared requests with observed usage and compute the ratio. Anything above roughly 1.5 for CPU or 1.2 for memory is a candidate for right-sizing.

```bash
kubectl get pods -A -o json > /tmp/pods.json
python3 - <<'PY'
import json
d = json.load(open('/tmp/pods.json'))
for p in d['items']:
    cpu = mem = 0
    for c in p['spec']['containers']:
        r = c.get('resources', {}).get('requests', {})
        cpu += int(r.get('cpu', '0').rstrip('m')) if r.get('cpu', '').endswith('m') else int(float(r.get('cpu', 0)) * 1000)
        m = r.get('memory', '0')
        mem += int(m[:-2]) // 1024 if m.endswith('Mi') else 0
    print(f"{p['metadata']['namespace']}/{p['metadata']['name']}: cpu={cpu}m mem={mem}Mi")
PY
```

Note which workloads carry no requests at all. Those are BestEffort and are simultaneously the most likely to be evicted and the most likely to break the scheduler's accounting.

### Step 2: Define the node pool taxonomy

Before writing any placement rule, decide what pools exist and give each a stable label plus a taint where isolation is required. A workable taxonomy for a mid-size cluster:

```text
pool          labels                                  taint
system        node-pool=system                        dedicated=system:NoSchedule
general       node-pool=general                       (none)
memory        node-pool=memory, instance=m8i.4xlarge   dedicated=memory:NoSchedule
gpu           node-pool=gpu, accelerator=nvidia-a10g  dedicated=gpu:NoSchedule
spot          node-pool=spot, capacity-type=spot      capacity-type=spot:NoSchedule
```

Apply the labels at the node group / managed node pool level (EKS managed node groups, GKE node pools, AKS node pools, or a Karpenter NodePool), not by hand on individual nodes, so new nodes inherit them automatically.

```bash
kubectl label node <node> node-pool=memory --overwrite
kubectl taint node <node> dedicated=memory:NoSchedule
```

### Step 3: Right-size requests and set QoS deliberately

Rewrite workload manifests so requests reflect measured usage, and make the QoS intent explicit. Guaranteed pods set requests equal to limits on every container:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  namespace: payments
spec:
  replicas: 4
  selector:
    matchLabels:
      app: payments-api
  template:
    metadata:
      labels:
        app: payments-api
    spec:
      containers:
        - name: api
          image: registry.example.com/payments-api:1.14.2
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
```

Batch and best-effort workers instead get generous limits with modest requests, accepting Burstable QoS:

```yaml
    resources:
      requests:
        cpu: "250m"
        memory: "256Mi"
      limits:
        cpu: "2"
        memory: "1Gi"
```

After applying, confirm the resulting class rather than assuming it:

```bash
kubectl get pod -n payments -l app=payments-api -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.qosClass}{"\n"}{end}'
```

### Step 4: Spread replicas across zones and nodes

Add topology spread constraints to every multi-replica workload. Spreading across zones protects against a zone outage; spreading across nodes protects against a single-node failure. Do both, and keep both soft so a constrained cluster can still schedule.

```yaml
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: payments-api
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: payments-api
```

Use `minDomains` when you want the skew calculation to account for zones that have no nodes yet, and `nodeTaintsPolicy: Honor` (1.26+) when tainted nodes should be excluded from the spread domain count.

```bash
kubectl get pods -n payments -l app=payments-api -o wide
kubectl get pods -n payments -l app=payments-api \
  -o custom-columns=POD:.metadata.name,NODE:.spec.nodeName --no-headers | sort -k2
```

If all replicas report the same node, the constraint is not doing its job — check that the label selector matches the pod labels exactly.

### Step 5: Express co-location and separation rules

For workloads that genuinely need to be near or far from each other, use affinity with a narrow scope. A cache sidecar pattern wants the cache on the same node; a latency-sensitive front end wants to avoid sharing a node with a noisy batch job.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: checkout-api
  template:
    metadata:
      labels:
        app: checkout-api
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    workload-type: batch
                topologyKey: kubernetes.io/hostname
      containers:
        - name: api
          image: registry.example.com/checkout-api:3.2.0
          resources:
            requests:
              cpu: "1"
              memory: "1Gi"
```

Keep `antiAffinity` at `preferred` here — a hard rule against a batch label would make the API pods pending whenever the batch fleet fills every node. Reserve `required` for the cases where a rule violation is genuinely unacceptable, and scope the label selector as tightly as possible.

### Step 6: Add priority classes and protect critical paths

Create a small, documented set of priority classes rather than one per team. Three or four levels is almost always enough:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: platform-critical
value: 1000000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Ingress, DNS, and cluster add-ons."
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-service
value: 100000
globalDefault: true
description: "Default for customer-facing services."
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-ordered
value: -100
preemptionPolicy: Never
description: "Batch work that queues below services but never preempts."
```

Then attach the class to the workloads that need it and verify the resulting ordering:

```bash
kubectl get priorityclass
kubectl get pod -n kube-system -o custom-columns=POD:.metadata.name,PRIORITY:.spec.priority
```

Never set `globalDefault: true` on anything above the normal service tier — a default high priority silently makes every newly created pod a preemptor.

### Step 7: Deploy the descheduler for continuous rebalancing

Run the descheduler as a CronJob with an explicit, conservative policy. Start with the policies that fix real drift and avoid aggressive ones until you trust the behaviour:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: descheduler-policy
  namespace: kube-system
data:
  policy.yaml: |
    apiVersion: descheduler/v1alpha2
    kind: DeschedulerPolicy
    profiles:
      - name: default
        pluginConfig:
          - name: DefaultEvictor
            args:
              evictSystemCriticalPods: false
              evictFailedBarePods: false
              nodeFit: true
          - name: RemoveDuplicates
          - name: LowNodeUtilization
            args:
              thresholds:
                cpu: 20
                memory: 20
                pods: 20
              targetThresholds:
                cpu: 70
                memory: 70
                pods: 70
          - name: RemovePodsViolatingTopologySpreadConstraint
        plugins:
          balance:
            enabled:
              - RemoveDuplicates
              - LowNodeUtilization
              - RemovePodsViolatingTopologySpreadConstraint
```

`nodeFit: true` makes the descheduler skip pods it cannot place elsewhere — without it, a busy cluster can evict pods that then sit pending. Run it on a quiet schedule and watch evictions for the first week:

```bash
kubectl create job --from=cronjob/descheduler descheduler-manual -n kube-system
kubectl logs -n kube-system job/descheduler-manual | grep -i "evict"
```

### Step 8: Tune the scheduler profile to the packing goal

Decide whether the cluster optimizes for resilience (spread) or cost (bin-pack), then encode it once in a scheduler profile and roll it out to the control plane. The following profile keeps default scoring for most workloads but adds a heavier weight on image locality and switches resource fit to `MostAllocated`:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: default-scheduler
    pluginConfig:
      - name: NodeResourcesFit
        args:
          scoringStrategy:
            type: MostAllocated
            resources:
              - name: cpu
                weight: 1
              - name: memory
                weight: 1
    plugins:
      score:
        enabled:
          - name: NodeResourcesFit
            weight: 2
          - name: ImageLocality
            weight: 1
```

Apply it by passing `--config` to kube-scheduler (managed clusters usually expose this through a scheduler configuration option, or you run a second scheduler with a distinct `schedulerName`). If you run a custom profile, the workload must opt in:

```yaml
    spec:
      schedulerName: default-scheduler
```

Verify that the intended profile is actually handling pods by checking the scheduler's metrics and logs for the profile name, and roll back immediately if `scheduler_pending_pods` rises.

### Step 9: Test placement with a deliberate pending-pod simulation

Do not wait for a real incident to learn how your rules behave. Create a temporary workload that demands more than any single node can provide, and read the scheduler's own explanation:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: placement-probe
  namespace: default
spec:
  containers:
    - name: probe
      image: registry.k8s.io/pause:3.9
      resources:
        requests:
          cpu: "128"
          memory: "512Gi"
```

Then inspect the events — this is the exact output you will be reading at 3 a.m., so make sure the messages are actionable:

```bash
kubectl get events --field-selector reason=FailedScheduling -A --sort-by=.lastTimestamp | tail -5
kubectl describe pod placement-probe | sed -n '/Events/,$p'
kubectl delete pod placement-probe
```

Repeat the exercise for a missing toleration: run a pod with the GPU pool's node selector but no toleration and confirm it reports the taint by name rather than a generic message.

### Step 10: Monitor scheduling health and alert on it

Placement failures are silent until they are not. Export the scheduler's own metrics and alert on the leading indicators: pods pending beyond a threshold, scheduling latency, and filter-plugin duration.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubernetes-scheduling-alerts
  namespace: monitoring
spec:
  groups:
    - name: scheduling
      rules:
        - alert: PodsPendingTooLong
          expr: |
            sum by (namespace) (kube_pod_status_phase{phase="Pending"} == 1) > 0
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Pods pending for more than 15 minutes in {{ $labels.namespace }}"
        - alert: SchedulerQueueBacklog
          expr: |
            scheduler_pending_pods{queue="active"} > 20
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Scheduler active queue is backed up"
        - alert: SchedulingLatencyHigh
          expr: |
            histogram_quantile(0.99,
              sum by (le) (rate(scheduler_scheduling_attempt_duration_seconds_bucket[5m]))
            ) > 1
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "99th percentile scheduling latency above one second"
```

Pair the alerts with a weekly review of the spread distribution (per-node pod counts and per-zone replica counts) so drift is caught before it becomes an outage, and re-audit requests on the same cadence as the resource review from Step 1.

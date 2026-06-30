---
title: "Kubernetes Production Best Practices Guide"
description: "A practical guide covering Kubernetes production best practices including namespace strategy, resource management, pod anti-affinity, PDBs, HPA with custom metrics, cluster autoscaling, security contexts, Pod Security Standards, network policies, service mesh, GitOps, backup with Velero, cluster upgrades, observability, cost optimization, and multi-cluster management."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Kubernetes Production Best Practices Guide

## Introduction

Running Kubernetes in production requires more than just knowing how to deploy a Pod. This guide covers battle-tested best practices for operating Kubernetes clusters at scale — covering everything from namespace design and resource management to security, observability, GitOps automation, cost optimization, and multi-cluster strategies. Whether you are migrating from development to production or optimizing an existing cluster, these practices will help you build a robust, secure, and cost-efficient platform.

## Best Practices

### Namespace Strategy

- **Multi-Tenancy via Namespaces**: Use namespaces to isolate environments (dev, staging, prod), teams, or application domains. Apply ResourceQuotas and LimitRanges per namespace to prevent resource abuse.
- **Naming Conventions**: Adopt a consistent naming scheme like `<team>-<environment>-<app>` (e.g., `platform-prod-nginx`).
- **Default Network Policies**: Apply a default `deny-all` network policy in each namespace and only allow necessary ingress/egress traffic.

### Resource Requests and Limits

- **Always Set Requests and Limits**: Every container must define CPU and memory requests and limits. This prevents noisy-neighbor problems and helps the scheduler make informed placement decisions.
- **Use LimitRanges**: Enforce minimum and maximum resource constraints per namespace to prevent runaway containers.
- **Vertical Pod Autoscaler (VPA)**: Use VPA in recommendation mode to analyze historical usage and suggest optimal request values. Apply recommendations during maintenance windows.
- **Quality of Service (QoS) Classes**: Understand Guaranteed (requests == limits), Burstable (requests < limits), and BestEffort (no requests/limits). Prefer Guaranteed or Burstable for production workloads.

### Pod Anti-Affinity

- **Pod Anti-Affinity Rules**: Spread Pods across nodes and availability zones to avoid single points of failure:
  ```yaml
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: app
              operator: In
              values:
              - my-app
          topologyKey: topology.kubernetes.io/zone
  ```
- **Pod Topology Spread Constraints**: Use `topologySpreadConstraints` to enforce even distribution of Pods across zones, regions, or nodes.

### Pod Disruption Budgets (PDBs)

- **Define PDBs for Critical Workloads**: Ensure that voluntary disruptions (node drains, cluster upgrades) do not cause application downtime:
  ```yaml
  apiVersion: policy/v1
  kind: PodDisruptionBudget
  metadata:
    name: my-app-pdb
  spec:
    minAvailable: 2
    selector:
      matchLabels:
        app: my-app
  ```
- Use `minAvailable` (absolute count or percentage) or `maxUnavailable` depending on your availability requirements.

### Horizontal Autoscaling with Custom Metrics

- **HPA v2 with Custom Metrics**: Extend HPA beyond CPU/memory by consuming custom metrics from Prometheus or external sources:
  ```yaml
  apiVersion: autoscaling/v2
  kind: HorizontalPodAutoscaler
  metadata:
    name: my-app-hpa
  spec:
    scaleTargetRef:
      apiVersion: apps/v1
      kind: Deployment
      name: my-app
    minReplicas: 3
    maxReplicas: 50
    metrics:
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: 100
    - type: Object
      object:
        metric:
          name: istio_requests_total
        describedObject:
          apiVersion: networking.istio.io/v1beta1
          kind: VirtualService
          name: my-app
        target:
          type: Value
          value: "1000"
  ```
- **Scaling Policies**: Configure stabilization windows, scale-up/down rates, and cooldown periods to avoid thrashing.

### Cluster Autoscaling

- **Cluster Autoscaler**: Automatically adjusts the number of nodes in a node group when Pods fail to schedule due to resource constraints or when nodes are underutilized.
- **Karpenter** (AWS): A next-generation node provisioning tool that reacts quickly to unschedulable Pods, supports diverse instance types, and consolidates nodes for cost savings.
- **Best Practices**:
  - Use diverse instance families to improve availability and reduce cost.
  - Configure `cluster-autoscaler.kubernetes.io/safe-to-evict: "true"` annotation on DaemonSet Pods.
  - Set appropriate `--scale-down-delay-after-add` and `--max-node-provision-time` flags.

### Security Contexts and Pod Security Standards

- **Security Contexts**: Configure user/group IDs, capabilities, SELinux, seccomp, and read-only root filesystems per Pod or container:
  ```yaml
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
    runAsNonRoot: true
    readOnlyRootFilesystem: true
    capabilities:
      drop: ["ALL"]
    seccompProfile:
      type: RuntimeDefault
  ```
- **Pod Security Standards**: Kubernetes defines three standards:
  - **Privileged**: Unrestricted (for system-level components).
  - **Baseline**: Minimally restrictive (prevents known privilege escalations).
  - **Restricted**: Heavily restricted (follows Pod hardening best practices).
- **Pod Security Admission (PSA)**: Use PSA to enforce standards at the namespace level via labels:
  ```bash
  kubectl label ns my-app pod-security.kubernetes.io/enforce=restricted
  kubectl label ns my-app pod-security.kubernetes.io/warn=restricted
  ```
- **OPA/Gatekeeper or Kyverno**: For advanced policy enforcement beyond PSA (mutating webhooks, custom constraints).

### Network Policies

- **Zero-Trust Networking**: Default deny ingress/egress and explicitly allow required traffic:
  ```yaml
  apiVersion: networking.k8s.io/v1
  kind: NetworkPolicy
  metadata:
    name: default-deny-all
  spec:
    podSelector: {}
    policyTypes:
    - Ingress
    - Egress
  ---
  apiVersion: networking.k8s.io/v1
  kind: NetworkPolicy
  metadata:
    name: allow-frontend-to-api
  spec:
    podSelector:
      matchLabels:
        app: api
    ingress:
    - from:
      - podSelector:
          matchLabels:
            app: frontend
      ports:
      - port: 8080
    egress:
    - to:
      - podSelector:
          matchLabels:
            app: database
      ports:
      - port: 5432
  ```
- Use **Cilium Network Policies** for L7 HTTP/gRPC-aware policies and Hubble for observability.

### Service Mesh Overview

- **Istio**: Full-featured service mesh with mTLS, traffic splitting, circuit breaking, fault injection, and deep observability (metrics, traces, access logs).
- **Linkerd**: Lightweight, ultra-fast service mesh with automatic mTLS, retries, timeouts, and golden metrics (success rate, latency, request rate).

Both Istio and Linkerd integrate seamlessly with Prometheus, Grafana, and OpenTelemetry.

### GitOps with ArgoCD/Flux

- **GitOps Principles**:
  1. Declarative configuration stored in Git as the single source of truth.
  2. Automated reconciliation — the cluster state is continuously synced to match the repository.
  3. Pull-based deployment (agents in the cluster pull changes).
- **ArgoCD**: Web UI, SSO integration, sync waves, prune behavior, ApplicationSets for multi-cluster management.
- **Flux**: Multi-tenancy, OCI-compliant artifact support, image update automation (ImageUpdateAutomation), dependency management via depends-on.
- **Secrets Management**: Use Sealed Secrets, External Secrets Operator, or SOPS with age/PGP to safely store encrypted secrets in Git.

### Backup with Velero

- **Velero**: Open-source tool for backing up and restoring Kubernetes cluster resources and persistent volumes.
  ```bash
  # Install Velero
  velero install \
    --provider aws \
    --bucket kubernetes-backups \
    --backup-location-config region=us-west-2 \
    --snapshot-location-config region=us-west-2 \
    --plugins velero/velero-plugin-for-aws:v1.7.0

  # Create a backup
  velero backup create daily-backup --include-namespaces prod --ttl 720h

  # Schedule recurring backups
  velero schedule create daily --schedule="0 2 * * *" --include-namespaces prod --ttl 168h

  # Restore from backup
  velero restore create --from-backup daily-backup

  # Restore specific resources
  velero restore create --from-backup daily-backup --include-resources deployments,configmaps
  ```

### Cluster Upgrade Strategy

- **Follow the Official Upgrade Guide**: Always consult the [Kubernetes version skew policy](https://kubernetes.io/releases/version-skew-policy/) before upgrading.
- **Upgrade Order**:
  1. Upgrade kubeadm tool (`kubeadm upgrade plan`, `kubeadm upgrade apply`).
  2. Upgrade control plane nodes one at a time.
  3. Upgrade worker nodes in batches (using node pools or rolling node groups).
- **Pre-Upgrade Checks**:
  - Verify etcd health and backup etcd snapshots.
  - Run `kubectl get nodes` to confirm all nodes are Ready.
  - Review deprecated API removals (via `kubectl convert` or `kube-no-trouble`).
- **Post-Upgrade**:
  - Update kubelet on all nodes.
  - Update CoreDNS, CNI plugin, and other cluster add-ons.
  - Run a smoke test suite to validate application functionality.

### Observability Stack

- **Prometheus**: Scrape metrics, define alerting rules (PromQL), and store time-series data.
- **Grafana**: Create dashboards for cluster health, application performance, and business KPIs.
- **Loki**: Log aggregation system with Promtail or Fluent Bit for shipping logs. Query logs with LogQL.
- **Tempo**: Distributed tracing backend for request tracing across microservices. Use OpenTelemetry SDKs to instrument applications and export traces.
- **OpenTelemetry Collector**: Vendor-agnostic agent for receiving, processing, and exporting telemetry data (metrics, logs, traces) to any backend.
- **Recommended Dashboards**:
  - Node Exporter full dashboard (cluster health).
  - Kubelet / Kubernetes API Server dashboards.
  - Application-specific RED metrics (Rate, Errors, Duration).

### Cost Optimization

- **Kubecost**: Real-time visibility into Kubernetes spend, cost allocation by namespace, team, or label, and savings recommendations.
- **Right-Sizing**:
  - Analyze historical resource usage and adjust requests/limits.
  - Use VPA recommendations to right-size containers.
  - Identify and eliminate unused resources (orphan PVCs, idle LoadBalancers).
- **Spot/Preemptible Instances**: Use spot instances for stateless, fault-tolerant workloads. Configure PDBs, node affinities, and cluster autoscaler expansion schedules.
- **Resource Quota Enforcement**: Set ResourceQuotas per namespace to cap aggregate CPU, memory, and storage usage.

### Multi-Cluster Management

- **Federation v2 (KubeFed)**: Distribute workloads across multiple clusters for geo-redundancy and disaster recovery.
- **Cluster API**: Declarative API for provisioning, upgrading, and operating multiple Kubernetes clusters using Kubernetes-style APIs.
- **Centralized Monitoring**: Aggregate metrics from all clusters into a single Thanos or Cortex instance.
- **Cross-Cluster Networking**: Use Cilium ClusterMesh or Submariner for secure pod-to-pod communication across clusters.
- **GitOps for Multi-Cluster**: Use ArgoCD ApplicationSets to deploy the same application to multiple clusters from a single Git repository.

## Implementation Steps

### Step 1: Audit Your Current Cluster

1. Run `kubectl get all -A` to inventory all resources.
2. Check resource utilization with `kubectl top pods --all-namespaces` and `kubectl top nodes`.
3. Review existing RBAC bindings and service accounts.
4. Inspect network policies with `kubectl get networkpolicies -A`.
5. Identify workloads missing resource requests/limits using `kubectl describe nodes` and `kubectl describe pods`.

### Step 2: Implement Namespace Isolation

1. Define namespace hierarchy: `platform-prod`, `platform-staging`, `team-data-prod`.
2. Apply ResourceQuotas per namespace:
   ```yaml
   apiVersion: v1
   kind: ResourceQuota
   metadata:
     name: prod-quota
     namespace: platform-prod
   spec:
     hard:
       requests.cpu: 40
       requests.memory: 80Gi
       limits.cpu: 80
       limits.memory: 160Gi
       persistentvolumeclaims: 20
       pods: 100
   ```
3. Apply LimitRanges for default resource constraints.
4. Label namespaces with Pod Security Standard levels.

### Step 3: Secure the Cluster

1. Enable Pod Security Admission (PSA) enforcement.
2. Apply default deny NetworkPolicy in all namespaces.
3. Configure RBAC with least-privilege service accounts.
4. Enable audit logging to capture API requests.
5. Implement OPA/Gatekeeper or Kyverno for advanced policy enforcement.
6. Disable anonymous access and enable OIDC authentication.

### Step 4: Set Up Observability

1. Install kube-prometheus-stack via Helm for base monitoring.
2. Configure ServiceMonitors and PodMonitors for all production workloads.
3. Set up Loki + Grafana for log aggregation.
4. Deploy Tempo for distributed tracing.
5. Create alerting rules in Prometheus for critical conditions (PodCrashLooping, PersistentVolumeUsageCritical, etc.).
6. Build Grafana dashboards for SRE golden signals (latency, traffic, errors, saturation).

### Step 5: Implement GitOps

1. Choose ArgoCD or Flux based on team preferences and requirements.
2. Structure Git repositories: one per application or monorepo with folder per app.
3. Create application manifests or Helm charts.
4. Bootstrap the GitOps agent into the cluster.
5. Configure automated sync policies (auto-prune, self-heal).
6. Set up image update automation for continuous deployment.

### Step 6: Configure Autoscaling

1. Deploy metrics-server or Prometheus Adapter.
2. Define HPA v2 resources for all stateless workloads with custom metrics.
3. Install and configure Cluster Autoscaler or Karpenter.
4. Set up VPA in recommendation mode for continuous optimization.
5. Create PDBs for all critical workloads.

### Step 7: Implement Backup and Disaster Recovery

1. Install Velero with cloud storage backend.
2. Create scheduled backups for all namespaces.
3. Test restoration procedure regularly (quarterly disaster recovery drills).
4. Document recovery runbook with step-by-step instructions.

### Step 8: Optimize Costs

1. Install Kubecost or OpenCost for visibility.
2. Identify top-spending namespaces and workloads.
3. Right-size container resources based on 30-day historical data.
4. Evaluate spot/preemptible instance adoption for appropriate workloads.
5. Remove unused resources (orphan resources, idle services).

### Step 9: Plan Cluster Upgrades

1. Subscribe to Kubernetes release announcements and follow the EOL schedule.
2. Maintain a test cluster that mirrors production for upgrade validation.
3. Schedule upgrade windows during low-traffic periods.
4. Document rollback procedures for each upgrade.
5. Run `kubeadm upgrade plan` and `kubectl convert` to check for API deprecations before upgrading.

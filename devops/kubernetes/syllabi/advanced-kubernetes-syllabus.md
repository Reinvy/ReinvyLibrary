---
title: "Advanced Kubernetes Platform Engineering and Cluster Internals Syllabus"
description: "A comprehensive 12-week advanced curriculum for experienced Kubernetes operators and platform engineers covering scheduler internals and placement strategies, admission control and policy as code, custom resources and operator development, advanced autoscaling, Gateway API and service mesh architectures, multi-tenancy, Cluster API and cluster lifecycle, multi-cluster patterns, SLO-driven observability, chaos engineering, supply chain security, performance tuning, and a platform engineering capstone."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced Kubernetes Platform Engineering and Cluster Internals Syllabus

## Overview

This 12-week advanced syllabus is designed for experienced Kubernetes operators, SREs, and platform engineers who already run workloads in production and want to master the platform itself. Where the introductory Kubernetes curriculum teaches *how to operate* a cluster, this course goes underneath the hood: the scheduler's placement decisions, the admission control chain, the controller-runtime reconciliation model, the autoscaling machinery, the data plane, and the failure semantics that determine how a platform behaves under load, multi-tenancy pressure, and chaos.

The curriculum is organized in three phases. Weeks 1–4 dissect cluster internals: advanced scheduling and placement, admission control and policy as code, custom resources and building operators, and advanced autoscaling. Weeks 5–8 focus on platform architecture: the Gateway API and modern service networking, service mesh and eBPF data planes, multi-tenancy and isolation patterns, and cluster lifecycle management with Cluster API. Weeks 9–12 cover the platform engineering discipline: multi-cluster architectures, SLO-driven observability, chaos engineering and reliability, supply chain security, performance tuning, and a capstone where learners design and build an internal developer platform.

Each module pairs deep conceptual grounding with hands-on labs that require inspecting real cluster state, writing admission webhooks, building a working operator, running autoscaling and chaos experiments, and designing multi-cluster topologies. By the end of this course, learners will be able to explain how the scheduler and admission chain work internally, build custom controllers and operators, enforce policy as code, architect multi-tenant and multi-cluster platforms, tune control plane performance, and run reliability experiments that prove a platform can survive real-world failures.

## Curriculum

### Module 1: Advanced Scheduling and Placement (Week 1)

- **The kube-scheduler internals**
  - Scheduling framework: queue, cycle, and extension points (PreFilter, Filter, Score, Reserve, Permit, Bind)
  - Default predicates and priorities: node resources, node ports, inter-pod affinity, spread scoring
  - Scheduling queue mechanics: priority queue, backoff, and unschedulable pod handling
- **Node and pod placement primitives**
  - Node selectors, node affinity (required vs. preferred), anti-affinity and pod topology spread constraints
  - Taints and tolerations: purpose-built nodes, dedicated control-plane workloads, taint-based eviction
  - Priority classes and preemption: when the scheduler evicts lower-priority Pods
- **Descheduling and rebalancing**
  - The descheduler project: strategies, namespaces, and threshold-based eviction
  - Cluster Autoscaler integration: unschedulable pods, node pools, and scale-down behavior
- **Extending the scheduler**
  - Scheduler plugins and multi-scheduler setups (schedulerName)
  - Scheduler extenders and when a custom scheduler makes sense
- **Hands-on Lab**: Deploy a workload with topology spread constraints, taint a node, verify scoring with the scheduling framework's instrumentation, install the descheduler, and observe preemption with a low-priority batch job

### Module 2: Admission Control and Policy as Code (Week 2)

- **The admission control chain**
  - How requests flow from the API server through authentication, authorization, and admission
  - Built-in admission controllers: NamespaceLifecycle, LimitRanger, ResourceQuota, PodSecurity, ServiceAccount
  - Mutation before validation: the ordering guarantees of mutating vs. validating webhooks
- **Dynamic admission webhooks**
  - MutatingAdmissionWebhook and ValidatingAdmissionWebhook configuration (webhookConfiguration, failurePolicy, matchPolicy)
  - Sidecar injection patterns and defaulting webhooks
  - Webhook security: TLS, namespaceSelector/objectSelector scoping, timeout and retry semantics
- **Policy engines**
  - OPA/Gatekeeper: ConstraintTemplates, constraints, and rego policy authoring
  - Kyverno: policy-as-YAML, generate/mutate/validate rules, and cluster policies
  - Choosing between webhooks, Gatekeeper, and Kyverno for an organization
- **Policy as code in CI**
  - Policy checks in pull requests: kubeconform, kube-score, conftest
  - GitOps policy gates: blocking drift in ArgoCD syncs
- **Hands-on Lab**: Write a validating webhook that rejects privileged containers, deploy Kyverno policies for namespace labeling and image registry allow-listing, and enforce the same policies in a CI pipeline with conftest

### Module 3: Custom Resources and Building Operators (Week 3)

- **CustomResourceDefinitions**
  - CRD schema design: versions, structural schemas, pruning, and status subresources
  - Validation, defaults, and conversion webhooks across API versions
  - CRD lifecycle: the API server's handling of unknown fields and `x-kubernetes-*` extensions
- **The controller pattern**
  - Reconciliation loops: desired state vs. observed state, requeue semantics, and finalizers
  - Informers, caches, and watches: how controllers observe the API without hammering it
  - Leader election and HA controller deployments
- **Building operators**
  - controller-runtime and kubebuilder scaffolding: API groups, types, and generated manifests
  - The Operator SDK workflow: operators for stateless and stateful workloads
  - Operator maturity: from basic install to auto-pilot (OLM, Operator Lifecycle Manager)
- **Advanced operator patterns**
  - Adoption and garbage collection via owner references
  - Status conditions, event recording, and metrics emitted by controllers
- **Hands-on Lab**: Scaffold a kubebuilder project, define a CRD with a structural schema, implement a reconcile loop that provisions a Deployment, add a finalizer for clean deletion, and package the operator with OLM

### Module 4: Advanced Autoscaling and Capacity Management (Week 4)

- **Horizontal Pod Autoscaler internals**
  - The HPA controller loop, stabilization windows, and scale rate limits
  - Custom metrics API and external metrics API: when Kubernetes-native metrics are not enough
  - HPA with custom metrics adapters (Prometheus Adapter, KEDA)
- **Vertical Pod Autoscaler**
  - VPA components: recommender, updater, admission plugin
  - Recommendations vs. actual updates: update modes (Off, Initial, Auto, Recreate)
  - Combining VPA and HPA: resource policy and avoiding conflict
- **Event-driven autoscaling with KEDA**
  - ScaledObjects and ScaledJobs: HTTP, queue, and stream triggers
  - The KEDA operator and metrics adapter architecture
- **Cluster-level capacity**
  - Cluster Autoscaler: expanders, scale-down controls, and node group semantics
  - Karpenter: NodeClaims, provisioning, consolidation, and interruption handling
  - Capacity planning: headroom, bin packing, and spot instance strategies
- **Hands-on Lab**: Expose a custom metric (queue depth) and scale an HPA with KEDA, run a VPA recommender against a latency-sensitive service, and compare Cluster Autoscaler vs. Karpenter provisioning behavior

### Module 5: Gateway API and Modern Service Networking (Week 5)

- **From Ingress to Gateway API**
  - GatewayClass, Gateway, and route resources: separation of concerns between cluster operators and app teams
  - HTTPRoute, TLSRoute, TCPRoute, and GRPCRoute semantics
  - Cross-namespace routing and reference grants
- **Advanced route features**
  - Traffic splitting, weighted canaries, and header/query matching
  - Timeouts, retries, and request mirroring as first-class route filters
  - Backend TLS and service mesh integration via BackendTLSPolicy
- **Gateway implementations**
  - NGINX Gateway Fabric and Envoy Gateway
  - Contour and Traefik Gateway API support
- **Migration strategy**
  - Running Ingress and Gateway API side by side, then shifting traffic
  - Annotating and troubleshooting route binding failures
- **Hands-on Lab**: Install Envoy Gateway, define a GatewayClass and Gateway, route traffic with weighted splits, mirror a percentage of requests to a canary, and migrate an existing Ingress host to an HTTPRoute

### Module 6: Service Mesh Deep Dive and eBPF Data Planes (Week 6)

- **Service mesh architecture**
  - Control plane vs. data plane: sidecar proxies, mTLS identity (SPIFFE), and certificate rotation
  - Istio: Envoy-based data plane, Pilot/istiod control plane, and the xDS protocol
  - Linkerd: the Rust-based micro-proxy and the linkerd2 control plane
- **Traffic management**
  - VirtualServices, DestinationRules, and traffic shifting in detail
  - Fault injection, circuit breaking, and outlier detection
  - Multi-cluster mesh expansion and federated identity
- **Observability and security**
  - Mesh metrics (HTTP, TCP), distributed tracing, and access logs
  - Authorization policies: deny-by-default, per-namespace, and per-workload rules
- **eBPF-based data planes**
  - Cilium service mesh and the eBPF data path: socket-level load balancing, bandwidth management
  - Hubble for flow visibility and policy enforcement at the kernel level
  - When to choose a sidecar mesh vs. an eBPF mesh
- **Hands-on Lab**: Install a mesh, enable mTLS with strict peer authentication, shift traffic with a weighted VirtualService, inject faults to validate resilience, and inspect flows with Hubble

### Module 7: Multi-tenancy and Isolation Patterns (Week 7)

- **Tenancy models**
  - Soft vs. hard multi-tenancy: shared cluster, dedicated nodes, dedicated clusters
  - Namespace as a tenancy boundary: RoleBindings, ResourceQuota, LimitRange
  - Hierarchical namespaces: nested tenancy and policy inheritance
- **Resource isolation**
  - Quota design: compute, storage, and object count quotas per tenant
  - Priority classes and burstable vs. guaranteed QoS for noisy-neighbor protection
  - Node taints, node pools, and node affinity for workload segregation
- **Security isolation**
  - NetworkPolicies per tenant and per application
  - Pod Security Standards and tenant-level admission policies
  - Cost allocation: labels, kubecost tenancy mapping, and chargeback
- **Virtual clusters**
  - vcluster: lightweight virtual control planes over one physical cluster
  - When virtual clusters beat namespaces (shared CRDs, API isolation)
- **Hands-on Lab**: Design a two-tenant cluster with quotas, priority classes, and network policies; validate noisy-neighbor mitigation with a CPU-hungry pod; and spin up a vcluster to test CRD isolation

### Module 8: Cluster Lifecycle and Cluster API (Week 8)

- **Upgrade mechanics**
  - The kubeadm upgrade workflow: control plane first, then workers; skew policy
  - Node drain, cordon, and PodDisruptionBudgets during upgrades
  - Version skew between components and the supported upgrade path
- **etcd operations**
  - etcd architecture: Raft consensus, snapshots, and compaction
  - Backup and restore: etcdctl snapshot save/restore, disaster recovery procedures
  - Defragmentation and etcd health tuning
- **Cluster API**
  - Declarative cluster lifecycle: Cluster, Machine, MachineDeployment, and MachineSet
  - Infrastructure providers (AWS, vSphere, Docker) and bootstrap providers (kubeadm)
  - Machine health checks and automated repair
- **Control plane resilience**
  - Multi-AZ control planes, stacked vs. external etcd
  - API server load balancing, kubelet authorization, and audit log architecture
- **Hands-on Lab**: Perform a minor-version upgrade with cordon/drain and PDBs, practice an etcd restore after simulated data loss, and provision a workload cluster with Cluster API including a machine health check

### Module 9: Multi-Cluster Architectures and Deployment Strategies (Week 9)

- **Why multi-cluster**
  - Isolation, blast radius, compliance, and latency use cases
  - Centralized vs. decentralized management models
- **Application distribution**
  - GitOps across clusters: ArgoCD multi-cluster, ApplicationSets with cluster generators
  - The sync model: hub-spoke vs. pull-based agents (Flux, ArgoCD)
- **Service connectivity**
  - Service discovery across clusters: Submariner, Cilium ClusterMesh, and mesh expansion
  - Failover and active-active patterns for stateless and stateful workloads
- **Policy and governance at scale**
  - Centralized policy distribution (Kyverno policies, OPA constraints) across fleets
  - Configuration drift detection across environments
- **Disaster recovery patterns**
  - Warm standby, active-passive, and backup/restore DR strategies
- **Hands-on Lab**: Register a second cluster in ArgoCD, deploy an ApplicationSet targeting both clusters, connect services with Cilium ClusterMesh, and run a failover drill

### Module 10: Advanced Observability and SLO Engineering (Week 10)

- **Prometheus internals**
  - The TSDB: scrape model, staleness, and retention
  - Recording rules and alerting rules at platform scale
  - Thanos and Mimir for long-term storage and query federation
- **OpenTelemetry**
  - Metrics, traces, and logs: the three pillars and the OTLP protocol
  - The OpenTelemetry Collector: pipelines, processors, and exporters
  - Correlation: trace-to-metric and trace-to-log joining
- **Kubernetes-specific signals**
  - kube-state-metrics, node exporter, and control plane dashboards
  - cAdvisor and container metrics: what they miss at scale
  - eBPF observability: Hubble, Pixie, and kernel-level visibility
- **SLO engineering**
  - SLIs, SLOs, and error budgets for platform services
  - Multi-window, multi-burn-rate alerting and SLO dashboards (Pyroscope/Grafana)
  - Capacity forecasting and performance regression detection
- **Hands-on Lab**: Stand up an OpenTelemetry Collector pipeline, define an SLO with burn-rate alerts, correlate a trace to a slow query, and build a platform dashboard with kube-state-metrics and custom metrics

### Module 11: Chaos Engineering and Reliability (Week 11)

- **Principles of chaos engineering**
  - Steady-state hypothesis, blast radius, and the scientific method for outages
  - Game days and production vs. staging experimentation
- **Chaos tooling**
  - Litmus: chaos experiments, probes, and result workflows
  - Chaos Mesh: fault types (pod kill, network partition, clock skew, disk fill)
  - Litmus vs. Chaos Mesh: strengths of each platform
- **Failure injection at the platform layer**
  - Pod deletion storms, node drain failures, and API server throttling
  - Etcd quorum loss and network latency injection
  - Stateful workload chaos: volume detach and snapshot restore
- **Reliability runbooks**
  - Turning chaos results into runbooks and architectural fixes
  - PodDisruptionBudgets, topology spread, and anti-affinity as chaos mitigations
- **Hands-on Lab**: Run a pod-kill experiment, inject 100 ms of latency with Chaos Mesh, run an etcd-quorum-loss drill, and document the observations in a post-incident runbook

### Module 12: Supply Chain Security, Performance Tuning, and Platform Capstone (Week 12)

- **Software supply chain security**
  - Sigstore/cosign: image signing, keyless signing, and identity-based attestation
  - SLSA provenance and SBOM generation (syft) for every artifact
  - Admission-time verification: verifying cosign signatures with Kyverno policies
  - Image scanning (Trivy) and vulnerability triage in the delivery pipeline
- **Control plane performance tuning**
  - API server: audit policy, cache size, and request concurrency
  - etcd: defragmentation, compaction, and storage tuning
  - Node tuning: CPU manager, hugepages, and NUMA-aware scheduling for latency-sensitive workloads
- **Capacity and cost optimization**
  - Right-sizing with VPA recommendations, spot/flexible instance strategies
  - Cost visibility with Kubecost and namespace chargeback
  - Bin packing vs. spread: finding the cost/reliability balance
- **Capstone: Build an Internal Developer Platform**
  - Design a multi-tenant platform: namespaces, quotas, policies, and GitOps delivery
  - Self-service onboarding with Backstage and software templates
  - Enforce image signing, SBOM, and policy gates in the delivery pipeline
  - Autoscaling, SLO dashboards, chaos-tested failure scenarios, and a DR plan
- **Hands-on Lab**: Sign and verify images with cosign, enforce signature verification at admission, tune an API server audit policy, right-size a workload with VPA, and present the full platform design

## Final Project

**Project**: Design, build, and operate a production-grade internal developer platform (IDP) on Kubernetes.

**Requirements**:
1. Multi-tenant cluster with namespaces, ResourceQuotas, priority classes, and NetworkPolicies per tenant.
2. GitOps delivery with ArgoCD, including ApplicationSets that target at least two environments.
3. A custom operator (built in Module 3) that provisions an application stack from a CRD.
4. Policy as code enforced at admission (Kyverno) and in CI (conftest).
5. Image signing with cosign and signature verification at admission time.
6. Advanced autoscaling with HPA plus custom metrics, VPA recommendations, and KEDA for at least one event-driven workload.
7. SLO definitions with burn-rate alerts and a Grafana dashboard showing error budgets.
8. A chaos experiment report (Litmus or Chaos Mesh) proving the platform survives pod and node failures.
9. A disaster recovery runbook including etcd backup/restore procedures.
10. Self-service onboarding documentation or a Backstage template for a new tenant.

**Deliverables**:
- Git repositories with cluster manifests, Helm charts, and the operator source code.
- Architecture documentation covering tenancy, networking, and multi-environment topology.
- Dashboard screenshots showing SLOs, autoscaling behavior, and cost allocation.
- A brief report on chaos experiments and the reliability changes they motivated.

## Assessment Criteria

- **Hands-on Labs (40%)**: Weekly practical exercises demonstrating scheduler, admission, operator, and autoscaling proficiency.
- **Architecture Review (20%)**: Peer-reviewed design documents for multi-tenancy, multi-cluster, and platform security.
- **Chaos and SLO Report (10%)**: Quality of experiment design, steady-state hypotheses, and runbook outcomes.
- **Final Project (30%)**: Evaluation based on platform architecture quality, automation completeness, security enforcement, and documentation clarity.

## References

- [Kubernetes Official Documentation](https://kubernetes.io/docs/)
- [Kubernetes Scheduler and Scheduling Framework](https://kubernetes.io/docs/concepts/scheduling-eviction/)
- [Kubernetes Admission Controllers](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)
- [kubebuilder and controller-runtime](https://book.kubebuilder.io/)
- [Operator SDK Documentation](https://sdk.operatorframework.io/)
- [KEDA Documentation](https://keda.sh/docs/)
- [Gateway API Documentation](https://gateway-api.sigs.k8s.io/)
- [Istio Documentation](https://istio.io/latest/docs/)
- [Linkerd Documentation](https://linkerd.io/2.15/overview/)
- [Cilium and eBPF Documentation](https://docs.cilium.io/)
- [Cluster API Book](https://cluster-api.sigs.k8s.io/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Litmus Chaos Documentation](https://litmuschaos.io/docs/)
- [Chaos Mesh Documentation](https://chaos-mesh.org/docs/)
- [Sigstore and cosign](https://docs.sigstore.dev/)
- [SLSA Framework](https://slsa.dev/)
- [Backstage Documentation](https://backstage.io/docs/)

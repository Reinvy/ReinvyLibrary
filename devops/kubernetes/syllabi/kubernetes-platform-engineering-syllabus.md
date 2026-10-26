---
title: "Kubernetes Platform Engineering Syllabus"
description: "An eight-module curriculum that takes engineers from Kubernetes fundamentals to running a production platform: workloads, networking, storage, security, observability, GitOps delivery, and cost control."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Kubernetes Platform Engineering Syllabus

## Overview

Platform engineering is the discipline of turning Kubernetes from a cluster you operate into a product other teams consume. That shift requires more than kubectl fluency: it requires opinionated defaults, paved-road tooling, self-service guardrails, and the observability and cost controls that keep a multi-tenant cluster trustworthy.

This syllabus is eight modules over sixteen weeks, roughly two weeks per module with a lab at the end of each. The order is deliberate. Modules 1–3 build the mental model and the workload substrate; 4–6 add the cross-cutting concerns (storage, security, observability) that most outages actually come from; 7–8 turn the result into a delivered, governed, cost-aware platform.

Each module assumes hands-on work in a real cluster — a local kind cluster for early labs, a cloud cluster (EKS, GKE, or AKS) from Module 5 onward, because node pools, load balancers, and IAM behave differently there. Everything is taught manifest-first with Git as the source of truth, so learners never develop habits that only work through imperative commands.

## Curriculum

### Module 1: Kubernetes Fundamentals and the Control Plane

- **Architecture**: API server, etcd, scheduler, controller manager, kubelet, kube-proxy
- **Objects and reconciliation**: desired state, informers, the controller pattern
- **Namespaces, labels, annotations, and selectors** as the organizing primitives
- **Lab**: bootstrap a kind cluster, deploy a Pod and a Deployment, trace a rollout with `kubectl get events -w`

### Module 2: Workloads and Lifecycle Management

- **Deployment, ReplicaSet, StatefulSet, DaemonSet, Job, CronJob** — when each is correct
- **Probes**: readiness versus liveness versus startup, and the failure modes of each
- **Resource requests and limits**, QoS classes, and eviction ordering
- **Rollouts and rollbacks**: `maxSurge`, `maxUnavailable`, `progressDeadlineSeconds`
- **Lab**: ship a stateful queue consumer with a startup probe and a PodDisruptionBudget, then break it deliberately and recover

### Module 3: Services, Ingress, and Cluster Networking

- **Service types** (ClusterIP, NodePort, LoadBalancer) and EndpointSlices
- **Ingress versus Gateway API**: why the platform standard is moving
- **DNS**: CoreDNS, headless services, and `ndots` resolution cost
- **NetworkPolicy** as default-deny segmentation
- **Lab**: expose one service through a Gateway, then prove with `kubectl exec` that a default-deny policy blocks an unexpected path

### Module 4: Storage and Stateful Applications

- **Volumes, PersistentVolumes, PersistentVolumeClaims**, and the binding lifecycle
- **StorageClasses**: reclaim policies, volume expansion, topology constraints
- **StatefulSet identity**: stable network IDs, ordered rollout, per-replica PVCs
- **Backup and restore**: Velero, snapshot classes, and restore drills
- **Lab**: run a three-replica PostgreSQL cluster, kill a pod mid-write, and verify recovery plus a successful Velero restore into a scratch namespace

### Module 5: Security, Policy, and Multi-Tenancy

- **RBAC**: roles, bindings, aggregation, and the least-privilege review process
- **ServiceAccounts and workload identity** (IRSA, Workload Identity, Azure AD)
- **Pod Security Admission** and the restricted profile
- **Admission policy**: Kyverno or Gatekeeper for required labels, registries, and resource caps
- **Secrets**: External Secrets Operator, sealed secrets, rotation
- **Lab**: lock down a namespace with PSA `restricted`, a default-deny NetworkPolicy, and a Kyverno rule that rejects images from unapproved registries

### Module 6: Observability and Reliability

- **Metrics**: kube-state-metrics, cAdvisor, Prometheus, and recording rules that scale
- **Logs**: structured logging, a collector pipeline, retention that does not bankrupt you
- **Traces**: OpenTelemetry instrumentation and context propagation across services
- **SLOs and alerting**: error budgets, multi-window burn-rate alerts, alert fatigue
- **Debugging**: `kubectl debug` ephemeral containers, `kubectl top`, events, and the four golden signals
- **Lab**: instrument a sample API, define an SLO, and write a burn-rate alert that fires on a staged failure but not on normal variance

### Module 7: GitOps and Platform Delivery

- **GitOps principles**: declarative, versioned, pulled, continuously reconciled
- **Argo CD or Flux**: application sets, sync waves, drift detection, pruning
- **Environment promotion**: overlays, Kustomize versus Helm, image update automation
- **Progressive delivery**: canary and blue-green with Argo Rollouts, automated rollback on metrics
- **Platform as a product**: golden paths, scaffolding templates, self-service namespaces
- **Lab**: convert the course manifests into a GitOps repository with dev and prod overlays, then ship a canary release that auto-rolls back on a failed analysis run

### Module 8: Capacity, Cost, and Cluster Operations

- **Autoscaling layers**: HPA, VPA, cluster autoscaler or Karpenter, KEDA for event-driven work
- **Node pool strategy**: on-demand baseline, spot for interruptible work, taints and tolerations
- **Cost allocation**: labels, quotas, showback reports, and idle detection
- **Upgrades**: control plane and node version skew, surge settings, PDB-aware drains
- **Lab**: right-size a workload from VPA recommendations, move a batch job to spot, and produce a namespace cost report before and after

## Final Project

Build and operate a small internal platform for two fictional product teams, delivered entirely from Git.

- **The platform**: one cluster, three namespaces (`platform-system`, `team-alpha`, `team-beta`), with Argo CD or Flux reconciling every object from a repository you own.
- **The paved road**: Kyverno policies enforcing required labels, approved registries, and resource limits; a namespace template that ships quotas, LimitRange, NetworkPolicy, and RBAC in one apply.
- **The workload**: a two-service application (API plus worker) with a database, exposed through Gateway API, instrumented with metrics, logs, and traces, and defended by an SLO with a burn-rate alert.
- **The operations story**: an HPA plus spot node pool for the worker, a documented upgrade runbook, a restore drill from backup, and a cost report showing per-namespace spend with the savings from right-sizing.
- **The deliverable**: a repository, a README that a new engineer can follow in under an hour, and a ten-minute demo that includes one deliberately triggered failure and its automated recovery.

## Assessment Criteria

- **Weekly labs (40%)**: each module ends with a lab that must pass an automated check (resources healthy, policies enforced, rollout complete). Partial credit for a working solution with a written explanation of the trade-offs.
- **Design review (15%)**: a written review of another learner's namespace template, scored on least privilege, blast radius, and clarity.
- **Incident exercise (15%)**: diagnose a seeded failure in a shared cluster within 30 minutes using only observability tooling and cluster state, then write a short postmortem.
- **Final project (30%)**: scored on reproducibility (does it deploy from a clean cluster?), correctness of the guardrails, quality of the SLO and alerts, and the credibility of the cost and upgrade story. Bonus for automating the restore drill.

## References

- Kubernetes documentation — concepts, tasks, and API reference: https://kubernetes.io/docs/
- Kubernetes Enhancement Proposals and the Gateway API specification: https://gateway-api.sigs.k8s.io/
- Argo CD documentation, including ApplicationSets and sync waves: https://argo-cd.readthedocs.io/
- Flux documentation for GitOps toolkit patterns: https://fluxcd.io/docs/
- Kyverno policy library: https://kyverno.io/policies/
- Prometheus and the SRE Workbook (error budgets, burn-rate alerting): https://sre.google/workbook/
- Karpenter documentation for node provisioning and consolidation: https://karpenter.sh/
- CNCF landscape and the Platform Engineering community resources: https://landscape.cncf.io/

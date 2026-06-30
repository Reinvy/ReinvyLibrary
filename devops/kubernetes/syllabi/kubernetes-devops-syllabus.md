---
title: "Kubernetes DevOps Syllabus"
description: "A structured 12-week curriculum covering Kubernetes from fundamentals to production readiness, including cluster architecture, kubectl, Pods, Deployments, Services, ConfigMaps, Secrets, Storage, Ingress, Helm, RBAC, security, monitoring, CI/CD, and a capstone project."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Kubernetes DevOps Syllabus

## Overview

This 12-week syllabus provides a comprehensive, hands-on curriculum for DevOps engineers and platform teams to master Kubernetes. The course progresses from foundational container orchestration concepts through advanced production topics including monitoring, security, GitOps, and a real-world capstone project. Each module balances conceptual learning with practical lab exercises.

## Curriculum

### Week 1: Container Orchestration Concepts

- **Container Orchestration Fundamentals**
  - What is container orchestration and why it matters
  - Comparison: Docker Swarm vs. Apache Mesos vs. Kubernetes
  - Kubernetes use cases and industry adoption
- **Kubernetes Ecosystem Overview**
  - CNCF landscape and graduated projects
  - Managed Kubernetes services (EKS, AKS, GKE)
  - Local development tools (Minikube, Kind, K3s)

### Week 2: Cluster Architecture

- **Control Plane Components**
  - kube-apiserver: API aggregation, authentication, authorization
  - etcd: distributed key-value store, consensus (Raft)
  - kube-scheduler: scheduling policies, predicates, priorities
  - kube-controller-manager: controller loops, reconciliation
- **Worker Node Components**
  - kubelet: Pod lifecycle, container runtime interface (CRI)
  - kube-proxy: iptables, IPVS, userspace modes
  - Container runtimes: containerd, CRI-O, Docker
- **Cluster Networking Fundamentals**
  - CNI plugins (Calico, Flannel, Cilium)
  - Pod networking model (IP-per-Pod)
  - Service discovery and DNS

### Week 3: kubectl CLI and Day-2 Operations

- **kubectl Command Reference**
  - Resource types and short names (po, deploy, svc, ns)
  - Output formatting (-o wide, json, yaml, jsonpath)
  - Common operations: get, describe, logs, exec, attach
- **Advanced kubectl Usage**
  - Port forwarding and proxying
  - Copying files to/from containers
  - Debugging with ephemeral containers
- **Configuration and Context Management**
  - KUBECONFIG files and merge strategies
  - Context switching and namespaces
  - kubectx/kubens tools

### Week 4: Pods and Containers

- **Pod Lifecycle**
  - Pod phases (Pending, Running, Succeeded, Failed, Unknown)
  - Init containers and sidecar containers
  - Pod status and conditions
- **Container Configuration**
  - Resource requests and limits (CPU, memory, ephemeral storage)
  - Environment variables and ConfigMap/Secret injection
  - Command and arguments (ENTRYPOINT/CMD)
- **Health Probes**
  - livenessProbe: restart policies
  - readinessProbe: traffic routing
  - startupProbe: slow-starting containers
  - Probe types: HTTP, TCP, gRPC, exec

### Week 5: Deployments and ReplicaSets

- **ReplicaSets**
  - Selector matching and ownership
  - Scaling and self-healing
- **Deployments**
  - Declarative updates and rollout strategies
  - RollingUpdate vs. Recreate strategies
  - MaxSurge and MaxUnavailable configuration
- **Deployment Operations**
  - Rollout status, history, and rollback
  - Pausing and resuming rollouts
  - Scaling (manual, HPA, VPA)
- **Other Workload Resources**
  - StatefulSets for stateful applications
  - DaemonSets for node-level agents
  - Jobs and CronJobs for batch processing

### Week 6: Services and Networking

- **Service Types**
  - ClusterIP: internal service discovery
  - NodePort: external access via node port
  - LoadBalancer: cloud LB integration
  - ExternalName: DNS aliasing
- **Service Mesh Concepts**
  - Introduction to Istio and Linkerd
  - mTLS, traffic splitting, circuit breaking
  - Observability (metrics, traces, access logs)
- **Network Policies**
  - Ingress and egress rules
  - Pod-to-Pod isolation
  - Default deny and allow patterns

### Week 7: ConfigMaps and Secrets

- **ConfigMap Creation and Consumption**
  - From literals, files, and directories
  - Environment variable injection
  - Volume mounts and subpaths
- **Secret Management**
  - Built-in Secret types (Opaque, docker-registry, TLS)
  - Encryption at rest (KMS, SOPS, Sealed Secrets)
  - External secrets operators (External Secrets Operator, Vault)
- **Best Practices**
  - Immutable ConfigMaps/Secrets
  - Avoiding sensitive data in environment variables
  - Secret rotation strategies

### Week 8: Storage (PVC, PV, StorageClass)

- **Persistent Volumes and Claims**
  - Static vs. dynamic provisioning
  - Access modes (ReadWriteOnce, ReadOnlyMany, ReadWriteMany)
  - Reclaim policies (Retain, Delete, Recycle)
- **StorageClasses**
  - Provisioner configuration
  - Volume binding modes (Immediate, WaitForFirstConsumer)
  - Allow volume expansion
- **Stateful Workloads**
  - StatefulSet with PVC templates
  - Volume snapshots and cloning
  - CSI drivers and third-party storage solutions

### Week 9: Ingress and TLS

- **Ingress Controllers**
  - NGINX Ingress Controller
  - Traefik, HAProxy, Contour
  - IngressClass and multi-controller setups
- **Ingress Resources**
  - Host-based and path-based routing
  - TLS termination and certificate management
  - Annotations for advanced behavior (rewrite, CORS, rate limiting)
- **Gateway API (Advanced)**
  - GatewayClass, Gateway, HTTPRoute
  - Migration from Ingress to Gateway API

### Week 10: Helm, RBAC, and Security

- **Helm Package Manager**
  - Chart structure and conventions
  - Values, templates, and helpers
  - Chart repositories and dependency management
  - Helmfile for multi-environment deployments
- **Role-Based Access Control (RBAC)**
  - Roles, ClusterRoles, RoleBindings, ClusterRoleBindings
  - Service accounts and token management
  - Least-privilege principles
- **Pod Security**
  - Pod Security Standards (Privileged, Baseline, Restricted)
  - Pod Security Admission (PSA) vs. OPA/Gatekeeper
  - Security contexts (runAsUser, fsGroup, SELinux, seccomp)

### Week 11: Monitoring and Logging

- **Monitoring Stack (kube-prometheus-stack)**
  - Prometheus server, Alertmanager, Grafana
  - ServiceMonitors and PodMonitors
  - Custom metrics and HPA integration
- **Logging**
  - Node-level logging vs. sidecar approach
  - Loki for log aggregation
  - Fluentd/Fluent Bit for log forwarding
- **Observability with OpenTelemetry**
  - Traces with Tempo/Jaeger
  - Metrics and traces correlation
  - OpenTelemetry Collector

### Week 12: CI/CD with Kubernetes and Capstone

- **CI/CD Pipelines**
  - GitOps principles (declarative, version-controlled, automated)
  - ArgoCD vs. Flux: comparison and migration
  - Canary deployments and progressive delivery
  - Image update automation (Renovate, Image Updater)
- **Capstone Project**
  - Deploy a multi-tier application (frontend, backend, database)
  - Configure Ingress with TLS, persistent storage, and autoscaling
  - Set up monitoring dashboards and alerting
  - Implement GitOps workflow with ArgoCD or Flux

## Final Project

**Project**: Deploy a production-grade microservices application on Kubernetes.

**Requirements**:
1. Multi-tier architecture with at least 3 services (frontend, API, database).
2. Ingress controller with TLS termination using cert-manager.
3. Persistent storage for the database using PVC and StatefulSet.
4. Horizontal Pod Autoscaler based on CPU/memory utilization.
5. ConfigMaps and Secrets for configuration management.
6. RBAC with least-privilege service accounts.
7. Helm chart packaging for the complete stack.
8. Monitoring with Prometheus/Grafana dashboards.
9. GitOps deployment pipeline using ArgoCD or Flux.
10. Network policies enforcing pod-to-pod isolation.

**Deliverables**:
- Git repository with Helm charts and Kubernetes manifests.
- Documentation of the architecture and deployment steps.
- Grafana dashboard screenshots showing cluster and application metrics.
- A brief report on performance testing and autoscaling behavior.

## Assessment Criteria

- **Hands-on Labs (40%)**: Weekly practical exercises demonstrating command proficiency and troubleshooting.
- **Quizzes (20%)**: Multiple-choice and short-answer questions on architecture, security, and best practices.
- **Final Project (40%)**: Evaluation based on architecture quality, security implementation, automation completeness, and documentation clarity.

## References

- [Kubernetes Official Documentation](https://kubernetes.io/docs/)
- [Kubernetes the Hard Way (Kelsey Hightower)](https://github.com/kelseyhightower/kubernetes-the-hard-way)
- [CNCF Cloud Native Landscape](https://landscape.cncf.io/)
- [Helm Documentation](https://helm.sh/docs/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Istio Documentation](https://istio.io/latest/docs/)
- [Kubernetes Patterns (Red Hat)](https://www.redhat.com/en/topics/containers/kubernetes-patterns)
- [CKAD Exam Curriculum](https://github.com/cncf/curriculum)

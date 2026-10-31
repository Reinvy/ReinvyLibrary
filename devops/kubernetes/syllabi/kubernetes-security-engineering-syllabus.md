---
title: "Kubernetes Security Engineering Syllabus"
description: "A comprehensive 12-week advanced curriculum for security engineers, platform teams, and SREs hardening production Kubernetes — threat modeling the cluster attack surface, API server authentication and RBAC internals, admission control and policy as code, secrets and etcd encryption, workload isolation, network segmentation with eBPF, supply chain verification, runtime threat detection, node hardening, multi-tenant isolation, compliance auditing, cluster forensics, and a zero-trust capstone."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Kubernetes Security Engineering Syllabus

## Overview

This 12-week advanced syllabus is for security engineers, platform engineers, and SREs who already run Kubernetes in production and are now accountable for defending it. General Kubernetes curricula teach you to deploy workloads; this course teaches you to break them, contain them, and prove that the cluster behaves the way an auditor expects. Kubernetes ships with permissive defaults in many places — anonymous API access, cluster-admin-bound service accounts, wide-open pod networking, mutable images — and every one of those defaults is an attack path in a real environment.

The curriculum follows the same layered model attackers use. Weeks 1–3 establish the control plane perimeter: threat modeling the cluster, hardening authentication and authorization, and enforcing decisions at admission time so unsafe workloads never start. Weeks 4–7 cover the workload and data plane: secrets protection and etcd encryption, pod-level isolation primitives, network segmentation with NetworkPolicy and eBPF-based identity, and supply chain verification from source to running container. Weeks 8–11 move to detection and operations: runtime threat detection with eBPF and Falco-style rule engines, node and kubelet hardening against CIS benchmarks, multi-tenant isolation engineering for shared clusters, and compliance auditing plus incident response with live cluster forensics. Week 12 is a capstone in which learners design and defend a zero-trust platform against a red-team drill.

Every module is lab-driven. Learners work with real tooling — OIDC-backed authentication, RBAC aggregation and audit policies, Pod Security Admission and Kyverno or Gatekeeper policies, KMS-backed etcd encryption, External Secrets and Vault CSI, seccomp and AppArmor profiles, Cilium network policies and identity, cosign and Sigstore admission verification, Tetragon or Falco detection rules, kube-bench hardening runs — and each lab ends with an attack attempt that must fail because of a control the learner implemented, not because of luck.

## Curriculum

### Module 1: Threat Modeling the Kubernetes Attack Surface (Week 1)

- **Why Kubernetes security fails in practice**
  - The 4C model: cloud, cluster, container, code — and where responsibility actually transfers
  - Common breach patterns: exposed kubelets, over-privileged service accounts, mutable `latest` images, unauthenticated dashboards
  - Shared responsibility boundaries in managed services (EKS, GKE, AKS) versus self-managed clusters
- **Mapping the attack surface**
  - Control plane endpoints: API server, etcd, scheduler, controller manager, and their exposure risks
  - Node-level surfaces: kubelet read-only and read-write ports, container runtime sockets, hostPath mounts
  - In-cluster surfaces: service account token projection, admission webhooks, CRDs, and operator privileges
- **Structured threat modeling**
  - Building attack trees for representative goals (data exfiltration, crypto-mining, lateral movement, persistence)
  - STRIDE applied to Kubernetes constructs; trust boundaries between namespaces, nodes, and tenants
  - Turning a threat model into a control backlog mapped to CIS Benchmark sections
- **Hands-on Lab**: Threat-model a three-tier application cluster, enumerate at least ten concrete attack paths with tooling evidence (kube-bench, kube-hunter, Trivy), and produce a prioritized control backlog

### Module 2: Authentication, Authorization, and the API Server (Week 2)

- **Authentication deep dive**
  - Authentication chains: client certificates, static tokens (and why they must go), OIDC and cloud IAM integration
  - Service account tokens: legacy secret-based tokens versus bound projected tokens with audience and expiry
  - Anonymous access suppression, API server flags, and disabling the insecure port pattern
- **Authorization internals**
  - RBAC objects and evaluation: Roles, ClusterRoles, bindings, aggregation, and the union-of-permissions model
  - Node authorizer, webhook authorizers, and the ordering of authorization decisions
  - Privilege escalation primitives: `escalate`, `bind`, `impersonate`, `create pods/exec`, and secret readability
- **Auditing and identity hygiene**
  - Audit policy levels and stages; what to log without drowning in noise
  - Detecting risky grants: wildcard verbs, cluster-admin bindings, default service account usage
  - Impersonation for debugging without sharing credentials
- **Hands-on Lab**: Replace static credentials with OIDC groups, write a least-privilege RBAC set for a three-team cluster, and demonstrate that a former cluster-admin-only action now returns a forbidden error attributable in the audit log

### Module 3: Admission Control and Policy as Code (Week 3)

- **The admission pipeline**
  - Request flow: authentication → authorization → mutating admission → validating admission → etcd
  - Built-in admission plugins, webhook configuration risks, and failure policy trade-offs
  - ValidatingAdmissionPolicy with CEL: in-process policy without a webhook
- **Pod Security Admission**
  - Privileged, baseline, and restricted profiles; namespace labels and version pinning
  - Migration path from deprecated PodSecurityPolicies, including common breakages
  - Exemptions, and why namespace-level exemptions become permanent holes
- **Policy engines in production**
  - Kyverno versus OPA Gatekeeper: DSL versus Rego, mutation versus validation, audit versus enforce
  - Policy testing, policy CI, and GitOps delivery of policy with drift detection
  - Guardrails that do not block incident response: break-glass namespaces and exception workflows
- **Hands-on Lab**: Enforce restricted Pod Security Admission cluster-wide, add Kyverno or Gatekeeper policies for image provenance and required resource limits, then attempt to deploy a privileged hostPath pod and show the denial with a reviewable policy violation report

### Module 4: Secrets Management and Data Protection (Week 4)

- **Where secrets leak**
  - Base64 is not encryption: secrets in etcd, environment variables, image layers, and CI logs
  - Common exfiltration routes: `kubectl get secrets`, pod exec, mounted volumes, and backup pipelines
- **Encryption at rest**
  - EncryptionConfiguration and the KMS provider for envelope encryption of etcd data
  - Key rotation, rewriting existing secrets, and verifying ciphertext in etcd
  - Backups: protecting etcd snapshots as the highest-value artifact in the cluster
- **External secret stores**
  - External Secrets Operator and Vault CSI driver patterns; sync versus mount
  - Short-lived credentials: dynamic database credentials, workload identity, and secretless access
  - Rotation strategy and blast-radius reduction when a secret does leak
- **Hands-on Lab**: Enable KMS-backed etcd encryption and verify ciphertext on disk, migrate hard-coded secrets to External Secrets with a 24-hour rotation policy, and prove that reading the secret from a compromised pod now yields a short-lived token

### Module 5: Workload Isolation and Pod-Level Hardening (Week 5)

- **Container isolation primitives**
  - Namespaces, cgroups v2, capabilities, and what a container actually shares with the host
  - `securityContext` essentials: `runAsNonRoot`, `readOnlyRootFilesystem`, dropped capabilities, `allowPrivilegeEscalation`
  - Runtime classes: runc, gVisor, Kata Containers — isolation strength versus performance
- **Mandatory access control**
  - seccomp profiles: RuntimeDefault, custom profiles from observed syscalls, and OCI profile distribution
  - AppArmor and SELinux enforcement in Kubernetes; profile binding per pod
  - User namespaces and their current maturity in production clusters
- **Containment engineering**
  - Preventing container escape enablers: privileged mode, hostPID, hostNetwork, hostPath, and the docker socket
  - Resource limits as a security control: fork bombs, memory exhaustion, and noisy-neighbor DoS
  - Ephemeral containers for safe debugging without weakening the workload's own profile
- **Hands-on Lab**: Take a privileged deployment and harden it to the restricted profile with a custom seccomp and AppArmor profile, then run a container-escape technique against both versions and document the difference in outcome

### Module 6: Network Security and Segmentation (Week 6)

- **Kubernetes networking attack surface**
  - Default allow-all pod networking, flat cluster CIDRs, and lateral movement economics
  - Exposed surfaces: LoadBalancer services, NodePorts, ingress controllers, and the API server itself
  - DNS as an exfiltration and discovery channel
- **Policy enforcement**
  - NetworkPolicy semantics: default-deny, namespace selectors, egress rules, and CNI support differences
  - Cilium identity-based policy, L7 policy with Cilium Network Policy, and eBPF datapath observability
  - Policy rollout without outages: audit mode, flow logs, and staged enforcement
- **Service-to-service trust**
  - mTLS with a service mesh or SPIFFE-based identity; certificate issuance and rotation
  - Egress control: DNS-aware policies, allowlists, and proxy patterns for external dependencies
  - Hardening ingress: TLS configuration, WAF placement, and rate limiting as availability control
- **Hands-on Lab**: Implement default-deny ingress and egress, permit only the application's real dependency graph, then attempt DNS tunneling and cross-namespace access from a compromised pod and show both blocked with flow evidence

### Module 7: Supply Chain Security and Image Trust (Week 7)

- **From source to running container**
  - Build integrity: reproducible builds, pinned base images, and multi-stage builds that do not ship toolchains
  - Vulnerability scanning in CI and in-cluster (Trivy Operator) with severity gates that teams can actually meet
  - SBOM generation (SPDX, CycloneDX) and maintaining inventory for incident response
- **Signing and provenance**
  - Sigstore: cosign keyless signing, Fulcio certificates, and Rekor transparency logs
  - SLSA provenance levels and attestation storage; verifying what actually built the image
  - Admission-time verification: policy-controller or Kyverno rules that reject unsigned or unverified images
- **Registry and artifact hardening**
  - Private registry authentication, image pull secrets, and preventing pulls from unapproved registries
  - Mutable tag elimination: digest pinning and admission rules that require digests
  - Responding to an upstream CVE: finding affected workloads from SBOM and provenance data
- **Hands-on Lab**: Sign an image keylessly with cosign, attach an SBOM and provenance attestation, enforce signature verification at admission, then attempt to deploy an unsigned image and a `latest`-tagged image and show both rejected with actionable error messages

### Module 8: Runtime Security and Threat Detection (Week 8)

- **Detection architecture**
  - Why audit logs alone are insufficient; kernel-level visibility with eBPF (Tetragon, Cilium) and Falco's rule engine
  - Signal sources: process execution, file access, network connections, syscall anomalies, Kubernetes audit events
  - Detection pipeline: agent → alert routing → enrichment with Kubernetes context → triage
- **Writing detections that hold up**
  - High-signal rules: shell in a container, unexpected `curl` to an external host, crypto-mining process names, secret read bursts
  - Tuning false positives without disabling the control; exceptions scoped to namespaces and images
  - Mapping detections to MITRE ATT&CK for Containers
- **Response automation**
  - Quarantine patterns: network isolation via policy, cordon and drain, and pod deletion trade-offs
  - Automated response with admission or operator-driven remediation, and safeguards against runaway automation
  - Alert fatigue economics: alert volume budgets and escalation design
- **Hands-on Lab**: Deploy a runtime detection stack, write three custom rules, execute a simulated post-exploitation sequence (reverse shell, credential read, external callback), and demonstrate alerts with full Kubernetes context plus an automated quarantine action

### Module 9: Node, Kubelet, and Control Plane Hardening (Week 9)

- **Benchmark-driven hardening**
  - CIS Kubernetes Benchmark structure; running kube-bench and interpreting results honestly
  - Managed-service constraints: which controls you can and cannot implement
  - Continuous compliance: scheduled scans, drift detection, and remediation ownership
- **Kubelet and node security**
  - Kubelet flags that matter: anonymous auth, authorization mode, read-only port, and certificate rotation
  - Node operating system choices: minimal immutable images (Bottlerocket, Talos), patch cadence, and SSH policy for break-glass only
  - Host filesystem and runtime socket protection; preventing hostPath and socket mounts through policy
- **Control plane protection**
  - Certificate lifecycle: CA rotation, kubelet serving certificates, and expiry monitoring
  - etcd hardening: peer TLS, client auth, network isolation, snapshot encryption, and restore drills
  - API server exposure: private endpoints, authorized networks, and separating administrative from workload traffic
- **Hands-on Lab**: Run kube-bench on a node, remediate at least five failing controls, harden kubelet configuration, verify a certificate rotation, and restore a cluster from an encrypted etcd snapshot

### Module 10: Multi-Tenancy and Isolation Engineering (Week 10)

- **Tenancy models**
  - Soft multi-tenancy with namespaces, quotas, and policy versus hard isolation with dedicated node pools or virtual clusters
  - Cost, operational burden, and blast radius for each model; hybrid designs for mixed trust levels
  - Where tenancy boundaries leak: cluster-scoped resources, CRDs, aggregated APIs, and admission webhooks
- **Isolation controls**
  - ResourceQuota and LimitRange as availability controls; preventing quota-based denial of service
  - RBAC scoping per tenant, including preventing tenants from creating privileged roles
  - Network isolation per tenant, and cross-tenant visibility through shared observability backends
- **Tenant lifecycle and self-service**
  - Provisioning tenants with GitOps and generated policy sets; onboarding checklists
  - Audit trails per tenant, chargeback, and evidence collection for tenant audits
  - Offboarding: revoking credentials, purging data, and proving deletion
- **Hands-on Lab**: Build a three-tenant cluster with one untrusted tenant isolated on a dedicated node pool, attempt cross-tenant attacks (RBAC escalation, network reach, webhook abuse), and document each blocked path with its enforcing control

### Module 11: Compliance, Auditing, and Cluster Forensics (Week 11)

- **Compliance engineering**
  - Mapping controls to frameworks: CIS, SOC 2, PCI DSS, HIPAA, and the shared-responsibility overlap
  - Evidence automation: policy reports, audit logs, SBOM inventory, and access reviews
  - Continuous control monitoring and the failure mode of one-time audit snapshots
- **Audit and observability for security**
  - Designing an audit policy that captures authentication failures, RBAC changes, secret access, and exec sessions
  - Shipping audit logs to an immutable backend; retention and tamper resistance
  - Correlating cluster events with cloud and identity provider logs during investigations
- **Incident response and forensics**
  - Runbook structure: detect, scope, contain, eradicate, recover, and post-incident review
  - Live forensics in containers: capturing process trees, memory, filesystem diffs, and network state before deletion
  - Preserving evidence while stopping the attack; legal hold and chain of custody basics
- **Hands-on Lab**: Implement an audit policy that captures the required event classes, simulate a compromised pod, and execute the full incident runbook — capture evidence, contain the workload, identify the initial access vector from logs, and produce a written post-incident report

### Module 12: Zero-Trust Platform Design and Red-Team Capstone (Week 12)

- **Designing a defensible platform**
  - Reference architecture: hardened control plane, verified supply chain, policy guardrails, segmentation, detection, and response
  - Identity-first design: workload identity, short-lived credentials, and least privilege as a default rather than a review outcome
  - Documenting residual risk and accepted exceptions with owners and expiry dates
- **Proving it works**
  - Purple-team exercise design: attack scenarios, success criteria, and detection coverage measurement
  - Metrics that matter: mean time to detect, policy violation rate, percentage of signed workloads, unpatched critical exposure
  - Communicating security posture to engineering leadership without overstating coverage
- **Capstone**
  - Build and defend a zero-trust multi-tenant cluster against a set of scripted attack scenarios
  - Deliverables: architecture, threat model, policy suite, detection rules, incident runbook, and a coverage report showing which attacks were blocked, detected, or missed
- **Hands-on Lab**: Run the red-team scenarios against your own platform, score each attempt as blocked, detected, or successful, remediate the gaps found in the same session, and present the final coverage report

## Final Project

Learners build and defend a production-grade secure Kubernetes platform, then prove its posture with measured evidence rather than configuration claims.

The platform must include: a hardened control plane with OIDC-based authentication, least-privilege RBAC, and non-anonymous API access; KMS-backed etcd encryption with a tested restore; mandatory admission guardrails (restricted Pod Security Admission plus policy-as-code for image provenance, resource limits, and forbidden host access); externalized secrets with automated rotation; default-deny network policy with an explicit allow graph and egress control; a verified supply chain where only signed, digest-pinned images run; runtime detection with at least five tuned rules and one automated containment action; kube-bench remediation evidence; and a three-tenant isolation model with one untrusted tenant.

The decisive deliverable is the coverage report from the capstone drill: a set of scripted attack scenarios — exposed service account token abuse, privileged pod attempt, container escape, lateral movement, unsigned image deployment, secret exfiltration, DNS tunneling — each scored as blocked, detected, or successful, with the enforcing control or the detection rule cited. Any successful attack must have a documented remediation committed to the platform before the project is accepted.

## Assessment Criteria

- **Assignments**: Weekly hands-on labs from Modules 1–11, submitted as manifests, policy files, detection rules, and short evidence write-ups. Graded on whether the control actually enforces the intended behavior under an attack attempt, and on the clarity of the evidence produced.
- **Module Quizzes**: Short quizzes after each phase (after Weeks 3, 7, and 11) covering the admission pipeline, RBAC evaluation and escalation primitives, secrets and etcd encryption, network policy semantics, supply chain verification, and incident response procedure.
- **Final Project**: Evaluated on coverage and correctness of layered controls, quality of the isolation model under cross-tenant attack, detection signal quality (true positives retained, false-positive rate documented), incident response readiness, and the honesty and rigor of the coverage report. A platform where every scripted attack is either blocked or detected with cited evidence, and where remaining gaps are explicitly documented with remediation plans, passes. A platform that relies on a single control layer, or that reports coverage it cannot demonstrate, does not.

## References

- Kubernetes Documentation — Authentication, Authorization, Admission Control, Pod Security Standards, Network Policies, Encryption at Rest
- NSA/CISA Kubernetes Hardening Guide — control guidance for cluster, node, and workload layers
- CIS Kubernetes Benchmark and kube-bench — benchmark structure and automated assessment
- Kyverno and OPA Gatekeeper Documentation — policy authoring, testing, and enforcement patterns
- ValidatingAdmissionPolicy (CEL) — Kubernetes documentation on in-process admission policy
- External Secrets Operator and HashiCorp Vault CSI Provider — secret synchronization and short-lived credentials
- Cilium Documentation — identity-based policy, eBPF datapath, and L7 network policy
- Sigstore, cosign, and SLSA — image signing, transparency logs, and build provenance
- Falco and Tetragon Documentation — runtime threat detection rules and eBPF-based observability
- MITRE ATT&CK for Containers — adversary tactics mapped to Kubernetes telemetry
- Bottlerocket and Talos — minimal immutable node operating systems

---
title: "Advanced Docker Platform Engineering Syllabus"
description: "An advanced 12-week course syllabus for senior engineers covering Docker and container runtime internals, BuildKit, networking internals, advanced storage, security hardening at the kernel level, and running container platforms in production at scale."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced Docker Platform Engineering Syllabus

## Overview

This syllabus is an advanced, 12-week curriculum for engineers who already master everyday Docker usage and want to understand and operate the container platform at the systems level. Where an intermediate course teaches *how* to build images, run containers, and compose multi-service applications, this course digs into *what actually happens* under the hood: the OCI runtime specifications, how BuildKit plans and executes builds, how the kernel isolates processes with namespaces and cgroups, how the container network data path is assembled, and how to harden and operate Docker at scale in production. The curriculum pairs each deep-dive with hands-on labs that inspect the live platform, and it culminates in a capstone project in which learners build, secure, and operate a production-grade internal container platform.

## Curriculum

### Week 1: The Container Runtime Stack
- **OCI and Containerd Internals**
  - The OCI Runtime Specification and Image Specification
  - How Docker CLI, containerd, and runc compose the runtime stack
  - Containerd namespaces, snapshotters, and content store
- **Lifecycle Under the Hood**
  - From `docker run` to a running process: the full call path
  - Container shims and how runtimes survive daemon restarts
- **Lab**: Use `ctr`, `nerdctl`, and `crictl` to probe the runtime directly

### Week 2: Linux Namespaces and cgroups
- **Namespace Deep Dive**
  - Mount, PID, network, UTS, IPC, user, and cgroup namespaces
  - How `unshare` and `clone` flags create isolation
- **cgroups v2**
  - The unified hierarchy and controller organization
  - CPU, memory, and I/O controllers and their effect on containers
- **Lab**: Inspect `/proc/self/ns`, cgroup files, and `docker inspect` host data

### Week 3: Image Builds with BuildKit
- **BuildKit Architecture**
  - Running builds in parallel and with caching at the layer level
  - The LLB (low-level builder) execution graph and build secrets
- **Advanced Dockerfile Techniques**
  - Cache mounts, secrets mounts, and SSH agent forwarding
  - Build-time arguments vs. runtime configuration
- **Lab**: Optimize a build pipeline with BuildKit cache mounts and buildx

### Week 4: Storage Drivers and Filesystems
- **Storage Driver Internals**
  - OverlayFS, overlay2, and the copy-on-write model
  - How image layers are composed into the container view
- **Volume Drivers and Mounts in Depth**
  - Bind mounts, named volumes, and the container filesystem contract
  - Local vs. third-party volume drivers
- **Lab**: Measure write amplification across storage drivers and mount types

### Week 5: Container Networking Internals
- **The Network Data Path**
  - Linux bridges, veth pairs, and network namespaces
  - How the default bridge and user-defined bridges wire containers together
  - iptables and nftables rules orchestrating NAT and port publishing
- **Advanced Drivers**
  - macvlan, ipvlan, and host networking trade-offs
  - The role of CNI when moving toward orchestrated platforms
- **Lab**: Trace a packet through `ip netns`, `brctl`, and iptables chains

### Week 6: Ingress, Load Balancing, and Service Discovery
- **External Traffic to Containers**
  - Published ports, the Docker proxy, and hairpin NAT behavior
  - Reverse proxies and load balancers in front of containers
- **Service Discovery Patterns**
  - Embedded DNS and alias-based discovery
  - Dynamic proxy reconfiguration with Traefik, Nginx, and Caddy
- **Lab**: Stand up an ingress stack with automatic route discovery and TLS

### Week 7: Security at the Kernel Level
- **Hardening the Runtime**
  - Dropping Linux capabilities and the full capability model
  - Seccomp profiles, AppArmor, and SELinux confinement
- **Immutable and Minimal Images**
  - Distroless and scratch images, read-only root filesystems
  - Running as non-root with security-enhanced storage
- **Supply Chain Security**
  - Image signing with Docker Content Trust and cosign
  - Scanning, SBOM generation, and policy enforcement
- **Lab**: Harden a production image and enforce a signing policy

### Week 8: Multi-Architecture and Edge Builds
- **Cross-Platform Images**
  - Multi-platform manifests and the OCI image index
  - Emulation (QEMU) vs. native cross-compilation with buildx
- **Large-Scale Image Distribution**
  - Registries, mirroring, garbage collection, and retention
  - Content-addressable storage and image deduplication
- **Lab**: Build and push a multi-architecture image family with buildx

### Week 9: Advanced Compose and Infrastructure as Code
- **Compose as a Platform Contract**
  - Compose spec across local, CI, and production targets
  - Profiles, extensions, and overrides for environment-specific topologies
- **Secrets, Configs, and Lifecycle Management**
  - Distributing secrets and configs without baking them into images
  - Health checks, dependencies, and graceful shutdown ordering
- **Lab**: Model a resilient multi-environment stack with Compose overrides

### Week 10: Running Docker in Production at Scale
- **Operational Maturity**
  - Logging drivers, metric exporters, and centralized observability
  - Image lifecycle, supply-chain hygiene, and vulnerability remediation
- **High Availability and Disaster Recovery**
  - Data persistence and backup strategies for containerized state
  - Upgrade and rollback procedures for the Docker runtime itself
- **Lab**: Build an observability and backup stack around a live deployment

### Week 11: Platform Engineering and Orchestration
- **From Docker to Orchestrated Platforms**
  - When Docker Swarm, Kubernetes, or cloud-managed runtimes fit
  - Designing internal platforms that standardize the container contract
- **Interoperability**
  - OCI-compliant images running across multiple runtimes
  - Approaches to workload portability and platform abstraction
- **Lab**: Deploy the same OCI image set to two different runtimes

### Week 12: Capstone Project
- **Project Scope**: Engineer an internal container platform
  - An immutable, signed, multi-architecture image build pipeline
  - Hardened base images with enforced security policies
  - An ingress and service-discovery layer for dynamic workloads
  - Observability, backup, and rollback procedures for the platform
- **Deliverables**: Platform blueprint, hardened Dockerfiles, build pipeline, Compose/stack definitions, security policy, and runbook

## Final Project

Learners will design and operate a production-grade internal container platform for an existing application estate. The project must include:

- A multi-architecture BuildKit build pipeline that produces signed, SBOM-enriched, distroless images
- Kernel-level runtime hardening applied consistently: non-root execution, read-only root filesystems, dropped capabilities, and custom seccomp/AppArmor profiles
- An ingress and service-discovery layer that dynamically routes traffic to containers with automatic TLS
- Centralized logging, metrics, and health visibility across all workloads
- Backup, disaster-recovery, and rollback runbooks, plus an upgrade plan for the runtime itself
- A written platform engineering blueprint explaining design decisions and trade-offs

The outcome is judged on how deeply the learner demonstrates understanding of the underlying runtime, security, and networking internals — not merely on assembling working Compose files.

## Assessment Criteria

- **Labs (40%)**: Weekly hands-on labs that inspect runtime internals (namespaces, cgroups, the network data path, storage drivers) and are evaluated for correctness and depth of observation.
- **Midterm Deep-Dive (20%)**: A written and demonstrated analysis of a chosen subsystem (e.g., BuildKit caching or the networking data path) explaining its internals with evidence from live inspection.
- **Final Capstone Project (40%)**: The internal platform engineering project, evaluated on security hardening, build reproducibility, operational maturity, documentation, and the soundness of architectural decisions.
- **Bonus (up to 10%)**: Contributing hardening policies or automation (seccomp profiles, signing policies, runbook tooling) that generalize beyond the learner's own project.

## References

- [Docker Documentation — Runtime and Configuration](https://docs.docker.com/engine/)
- [Open Container Initiative Specifications](https://opencontainers.org/)
- [BuildKit and buildx Documentation](https://docs.docker.com/build/)
- [Linux Man Pages — namespaces(7) and cgroups(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)
- [Docker Capabilities and Security Documentation](https://docs.docker.com/engine/security/)
- [Networking in Compose Documentation](https://docs.docker.com/compose/networking/)
- [The Docker Book — Advanced Topics](https://www.dockerbook.com/)

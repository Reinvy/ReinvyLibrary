---
title: "Docker Platform Engineering Syllabus"
description: "A seven-module curriculum that takes engineers from Docker fundamentals to running a hardened, observable container platform: images, networking, storage, Compose, security, registries, and production operations."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Docker Platform Engineering Syllabus

## Overview

This syllabus is a seven-module course for developers and platform engineers who already know basic `docker run` commands and need to own Docker as shared infrastructure rather than as a local convenience. The curriculum is organized around the seven decisions every container platform has to make: how images are built, how containers talk to each other, where state lives, how multi-service systems are described, how workloads are confined, how artifacts are distributed, and how the whole thing is operated after launch. Each module is one week, ends in a lab that must run on real infrastructure, and builds a piece of the same reference platform used in the final project.

The ordering is deliberate. Images come first because every later module assumes a reproducible build contract; registries come late because a private registry is only worth the operational cost once tagging and immutability rules are settled in module one. Security is placed after Compose so hardening can be applied to a realistic multi-service stack instead of a single toy container.

## Curriculum

### Module 1: Images and Build Contracts

- **Dockerfile as an Interface**
  - Multi-stage builds and build-time versus runtime dependencies
  - `COPY --from`, `--chown`, and separating build tooling from the runtime image
  - Layer ordering rules: dependency manifests before source, source before build
- **Reproducible Builds**
  - Pinned base image digests versus floating tags
  - Build arguments, `--build-arg` limits, and never leaking secrets into layers
  - `.dockerignore` and build context size
- **Image Hygiene**
  - Distroless, Alpine, and slim base image trade-offs
  - Reducing layer count without merging unrelated concerns
- **Lab**: Convert a single-stage Dockerfile into a multi-stage build under 150 MB with a pinned digest.

### Module 2: Container Networking

- **The Default Paths**
  - The default bridge network and why it is unsuitable for anything beyond one container
  - User-defined bridge networks and embedded DNS resolution by service name
  - Publishing ports: host binding, loopback-only exposure, and the Docker proxy
- **Isolation and Reachability**
  - Attaching and detaching running containers with `docker network connect`
  - Multiple networks per container as a segmentation tool
  - Head-of-line problems caused by sharing a single flat network
- **Diagnostics**
  - `docker network inspect`, `nsenter`, and ephemeral netshoot containers
  - Reading `/etc/resolv.conf` and confirming DNS aliases
- **Lab**: Build a three-tier topology where the database is reachable only from the application network.

### Module 3: Storage and State

- **Choosing a Mount Type**
  - Named volumes versus bind mounts versus `tmpfs`
  - Why bind mounts are a development tool and volumes are a production one
  - File ownership, UID mapping, and permission failures under non-root users
- **Persistence Patterns**
  - Volume lifecycle, `docker volume prune`, and accidental data loss
  - Backing up and restoring a database volume consistently
  - State containers versus stateless application tiers
- **Lab**: Back up and restore a Postgres volume while the container is running, then verify row counts.

### Module 4: Compose as a Platform Contract

- **Describing a System**
  - Services, networks, volumes, and the dependency graph
  - `depends_on` with health conditions instead of `sleep` loops
  - Environment files, `env_file`, and variable interpolation
- **Environment Overrides**
  - The base file plus `docker-compose.override.yml` pattern
  - Compose profiles for optional services and one-off tasks
  - `docker compose config` as the source of truth before deployment
- **Operational Compose**
  - Health checks, restart policies, and graceful shutdown with `stop_grace_period`
  - Logging drivers and log rotation at the service level
- **Lab**: Model a four-service stack that starts cleanly from scratch and survives a database restart.

### Module 5: Security Hardening

- **Identity and Privilege**
  - Non-root users, `USER` directives, and read-only root filesystems
  - Dropping capabilities and adding back the minimum set
  - `no-new-privileges` and why `--privileged` is a host compromise
- **Confinement**
  - Seccomp profiles: start from the default, remove, never invent
  - AppArmor and SELinux labels on the host
  - Resource limits: memory, CPU, and PID ceilings as denial-of-service defense
- **Secrets and Supply Chain**
  - Secrets as mounted files instead of environment variables
  - Image scanning in CI, SBOM generation, and signature verification
- **Lab**: Harden the module four stack until it passes a scripted security checklist.

### Module 6: Registries and Distribution

- **Registry Fundamentals**
  - The registry API, manifests, and content-addressable layers
  - Tagging strategy, immutable tags, and digest pinning in deployment
  - Running a private registry with TLS and authentication
- **Lifecycle Management**
  - Retention policies, garbage collection, and disk reclamation
  - Mirroring and pull-through caches for CI and edge environments
  - Multi-architecture images and the OCI image index
- **Lab**: Stand up a private registry behind TLS, push an image, and run garbage collection with measured disk savings.

### Module 7: Operations and Reliability

- **Observability**
  - Structured logging with the `json-file` and `local` drivers
  - Metrics via cAdvisor or the Docker daemon's metrics endpoint
  - Health checks feeding alerting instead of manual inspection
- **Lifecycle Operations**
  - Rolling replacement of containers behind a reverse proxy
  - Backup, restore, and disaster recovery drills for volumes and configs
  - Daemon upgrades, `daemon.json` management, and rollback planning
- **Incident Response**
  - Triage order: state, exit code, logs, resources, network
  - Capacity planning with `docker system df` and host-level monitoring
- **Lab**: Write a runbook and execute an upgrade with zero dropped requests.

## Final Project

Learners build and operate a complete internal platform for a small application estate: a web frontend, an API, a background worker, and Postgres.

Deliverables:

- A repository of multi-stage, digest-pinned images built in CI with scanning and SBOM output
- A Compose-based stack with health-gated startup, isolated networks, and named volumes
- A hardened runtime configuration: non-root users, read-only roots, dropped capabilities, and resource limits
- A private registry with TLS, authentication, retention, and garbage collection
- An operations package: dashboards or metric queries, a backup and restore procedure, and an upgrade runbook
- A short design document justifying each choice, including what was traded away and why

The project is evaluated on whether a second engineer could operate the platform from the documentation alone.

## Assessment Criteria

- **Weekly Labs (35%)**: Each lab must run end to end on a clean host; partial credit is not given for commands that only work after undocumented manual fixes.
- **Module Quizzes (15%)**: Short quizzes on mechanisms, not trivia — for example, explaining why a named volume survives `docker rm` while an anonymous one does not.
- **Security Checklist (20%)**: The module five hardening applied to the final stack, evaluated against a scripted checklist covering identity, capabilities, confinement, resource limits, and secrets handling.
- **Final Project (30%)**: Judged on reproducibility, operability, the quality of the design document, and whether the runbooks are actually correct when executed by someone else.
- **Bonus (up to 5%)**: Automation that removes manual steps from the platform — a compose validation gate in CI, a restore drill script, or registry retention tooling.

## References

- [Docker Documentation](https://docs.docker.com/)
- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- [Compose Specification](https://compose-spec.io/)
- [Docker Security Documentation](https://docs.docker.com/engine/security/)
- [Distribution (Registry) Specification](https://github.com/distribution/distribution)
- [OCI Image and Runtime Specifications](https://opencontainers.org/)
- [Docker Best Practices for Writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

---
title: "Advanced PM2 Internals and Production Reliability Syllabus"
description: "A comprehensive 12-week advanced curriculum for experienced Node.js operators covering PM2's internal architecture, the God daemon and IPC protocol, the programmatic API, custom modules, advanced cluster orchestration, high-availability patterns, performance engineering, observability at scale, security hardening, and reliability engineering."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced PM2 Internals and Production Reliability Syllabus

## Overview

This 12-week advanced syllabus is designed for experienced Node.js developers, DevOps engineers, and SREs who already manage applications with PM2 and want to master the process manager itself. Where the introductory PM2 curriculum teaches *how to use* PM2, this course goes underneath the hood: the God daemon architecture, the IPC/RPC protocol that links the CLI to the daemon, the process state machine, the programmatic API, the custom module system, and the failure semantics that determine how a fleet behaves under load, crashes, and chaos.

The curriculum is organized in three phases. Weeks 1–4 dissect PM2 internals: the daemon, its socket-based communication, the programmatic API, and custom modules. Weeks 5–8 focus on production architecture: advanced cluster orchestration, high-availability and multi-host patterns, performance engineering, and observability at scale. Weeks 9–12 cover the reliability discipline: security hardening, chaos testing, release engineering at scale, and a capstone where learners design and operate a self-healing, multi-host platform managed entirely through PM2.

Each module pairs deep conceptual grounding with hands-on labs that require inspecting real daemon state, writing programmatic control scripts, building custom modules, and running failure drills against live services. By the end of this course, learners will be able to explain how PM2 works internally, control it programmatically, extend it with custom modules, design highly available multi-host architectures, harden the process-manager layer against attacks, and run reliability experiments that prove a system can survive real-world failures.

## Curriculum

### Module 1: PM2 Architecture and the God Daemon (Week 1)

- **The process manager landscape**
  - What a process manager must guarantee: restart, respawn, log capture, and state tracking
  - PM2 vs systemd vs supervisord vs Docker restart policies — where each fits
  - The trade-offs of a user-space daemon versus an init-system service
- **The God daemon**
  - Why PM2 runs a persistent daemon instead of a foreground supervisor
  - Daemon bootstrap: `pm2 kill`, `pm2 resurrect`, and the daemon lifecycle
  - How the daemon survives the terminal that launched it
- **IPC and RPC between CLI and daemon**
  - The socket/pipe transport used by `pm2` CLI commands
  - The request/response protocol and how commands map to daemon actions
  - Inspecting the daemon with `pm2 report` and `pm2 prettylist`
- **pm2 vs pm2-runtime**
  - When the runtime variant replaces the daemon model (containers, CI)
  - Foreground operation and signal forwarding semantics
- **Hands-on Lab**: Launch a throwaway application, inspect the daemon process tree with `ps`, trace the socket connection with `lsof`, and compare `pm2 list` state against `pm2 prettylist` raw output

### Module 2: The PM2 Programmatic API (Week 2)

- **Connecting to the daemon from code**
  - `pm2.connect()` and connection lifecycle
  - Callback, promise, and async/await styles
  - Handling the "daemon not reachable" failure mode
- **Process control from JavaScript**
  - `pm2.start()`, `pm2.stop()`, `pm2.restart()`, `pm2.delete()` with full option objects
  - `pm2.list()`, `pm2.describe()`, `pm2.jlist()` and interpreting process descriptors
  - `pm2.sendSignalToProcessId()` for custom signal workflows
- **The PM2 event bus**
  - Subscribing to process lifecycle events: `online`, `exit`, `restart`, `stop`
  - `pm2.launchBus()` and event payload anatomy
  - Building automation that reacts to crashes in real time
- **Error handling and reconnection**
  - Daemon restarts and reconnecting the client
  - Idempotent start scripts for CI and boot sequences
- **Hands-on Lab**: Write a Node.js control plane that starts a service, watches its event bus, restarts it on crash, and exposes the process list over an HTTP endpoint

### Module 3: Custom PM2 Modules and the Module System (Week 3)

- **The module model**
  - How `pm2 install` differs from `npm install`
  - Module directory layout and the `module.json` manifest
  - Lifecycle hooks: pre-install, post-install, and uninstall scripts
- **Building a custom module**
  - Module entry points and the PM2 module API
  - Reading configuration passed at install time
  - Publishing metrics from a module via `@pm2/io`
- **pm2-logrotate as a reference implementation**
  - How the logrotate module hooks into the daemon
  - Forking, throttling, and interaction with the event bus
- **Managing a module fleet**
  - Updating modules across hosts, pinning versions, and removing modules
  - Modules vs plain processes: when to use which
- **Hands-on Lab**: Build and install a custom PM2 module that monitors a service's health endpoint and publishes a custom metric, then verify it appears in `pm2 monit`

### Module 4: Advanced Cluster Orchestration (Week 4)

- **Cluster mode internals**
  - The Node.js cluster module under PM2: master/worker roles
  - `NODE_APP_INSTANCE` and per-instance configuration
  - Round-robin scheduling and the shared-socket fallback
- **Instance lifecycle management**
  - `-i max` versus explicit instance counts in containers and on bare metal
  - Zero-downtime `pm2 reload` mechanics: worker-by-worker replacement
  - `wait_ready`, `listen_timeout`, and `kill_timeout` interplay
- **Scaling and autoscaling**
  - Manual scaling with `pm2 scale`
  - Integrating PM2 instance counts with Kubernetes HPA-style signals
  - Right-sizing: CPU-bound vs I/O-bound workload patterns
- **Sticky sessions and stateful workers**
  - Why round-robin breaks WebSocket and SSE workloads
  - Sticky load balancing with a reverse proxy
  - Externalizing state so any instance can serve any request
- **Hands-on Lab**: Deploy a WebSocket-heavy service in cluster mode, verify graceful reload under sustained connections, and reproduce a stateful-worker failure to motivate sticky-session design

### Module 5: Process State Machine and Failure Semantics (Week 5)

- **The state machine**
  - `online`, `launching`, `stopping`, `stopped`, `errored`, `one-launch-status`
  - What triggers each transition and how the daemon records it
- **Restart policies in depth**
  - `max_restarts`, `min_uptime`, and `autorestart` semantics
  - Exponential backoff and crash-loop detection
  - `restart_delay` and time-boxed restart windows
- **Exit codes and uncaught failures**
  - How PM2 interprets exit codes and signals
  - Uncaught exceptions, unhandled rejections, and `--kill-timeout`
  - OOM kills and `max_memory_restart` — the memory ceiling pattern
- **Graceful shutdown protocols**
  - SIGINT/SIGTERM handling and connection draining
  - `shutdown_with_message` and custom shutdown handshakes
  - Idempotent shutdown: what happens when a process ignores signals
- **Hands-on Lab**: Build a process that fails in five distinct ways (throw, OOM, unhandled rejection, hang, ignored signal) and design restart policies that recover each one correctly

### Module 6: High-Availability and Multi-Host Architectures (Week 6)

- **Single-host limits**
  - What PM2 guarantees on one machine and what it cannot
  - The blast radius of a host failure
- **Multi-host patterns**
  - Active-active with a reverse proxy (HAProxy, Nginx) and health checks
  - Active-passive with failover via DNS or keepalived
  - Regional deployment and cross-region failover considerations
- **State sharing across hosts**
  - Stateless services and externalized sessions (Redis, database)
  - Leader election for singleton workers (cron, queue consumers)
  - Distributed locks to prevent duplicate job processing
- **Orchestration interplay**
  - PM2 inside containers versus PM2 on VMs versus Kubernetes pods
  - When the process manager moves up the stack: node-level vs pod-level supervision
- **Hands-on Lab**: Stand up two hosts (or two containers) running the same service under PM2 behind a load balancer, kill one host, and verify zero-downtime failover with automated health checks

### Module 7: Performance Engineering and Capacity Planning (Week 7)

- **Profiling Node.js under PM2**
  - CPU profiling with `--node-args="--cpu-prof"` and the inspector protocol
  - Heap snapshots and memory-leak diagnosis for long-running processes
  - Event-loop lag and GC pause measurement with `@pm2/io`
- **Instance sizing**
  - Matching instance count to CPU cores and workload type
  - The cost of oversubscription: context switching and memory pressure
  - Vertical vs horizontal scaling decisions for the process-manager layer
- **Load testing methodology**
  - Designing realistic load tests with autocannon and k6
  - Identifying bottlenecks: event loop, I/O, database, or process count
  - Using `pm2 prettylist` and system metrics to correlate symptoms
- **Capacity planning**
  - Turning load-test results into instance-count formulas
  - Headroom, burst handling, and autoscaling triggers
- **Hands-on Lab**: Profile a memory-leaking service under PM2, capture a heap snapshot, fix the leak, and re-run a load test to quantify the improvement

### Module 8: Observability at Scale (Week 8)

- **Custom metrics with @pm2/io**
  - Gauges, counters, meters, and histograms — choosing the right metric type
  - Metric namespaces and labels for multi-service fleets
  - Exposing business metrics alongside system metrics
- **Exporting metrics**
  - Prometheus exporters for PM2 and `pm2-prometheus-exporter`
  - Grafana dashboards and alerting rules
  - Tracing integration: OpenTelemetry and APM vendors
- **Log architecture**
  - Structured JSON logging and log shipping (Loki, ELK, CloudWatch)
  - Log rotation at scale with pm2-logrotate and external rotation
  - Correlation IDs across processes and hosts
- **Alerting and SLOs**
  - From metrics to alerts: thresholds, windows, and runbooks
  - Defining SLOs for process health: uptime, restart frequency, time-to-recover
  - Error budgets and how restart storms consume them
- **Hands-on Lab**: Instrument a multi-service application with custom metrics, export them to Prometheus, build a Grafana dashboard, and configure an alert that fires on a restart storm

### Module 9: Security Hardening of the PM2 Stack (Week 9)

- **Securing the daemon**
  - The daemon socket and who can talk to it
  - Running PM2 under a dedicated, least-privilege service account
  - Restricting `pm2` CLI access and auditing command history
- **Environment and secrets**
  - `env` blocks, `env_file`, and where secrets must never live
  - Secret injection from a vault (HashiCorp Vault, cloud secret managers)
  - Protecting secrets in ecosystem files committed to source control
- **Supply chain and container security**
  - Pinning PM2 versions and auditing the dependency tree
  - Non-root execution, read-only filesystems, and seccomp profiles in containers
  - Distroless and minimal images with pm2-runtime
- **Network exposure**
  - Binding the PM2 interface and metrics endpoints to trusted networks
  - TLS for the reverse proxy and inter-service communication
- **Hands-on Lab**: Harden a PM2 deployment — dedicated user, vault-injected secrets, pinned dependencies, and a read-only container root — then run a penetration checklist against the result

### Module 10: Reliability Engineering and Chaos Testing (Week 10)

- **The reliability mindset**
  - From "does it restart?" to "does the system recover?"
  - Defining failure domains and recovery time objectives (RTO/RPO) for processes
- **Failure injection**
  - Killing processes with `kill -9`, SIGKILL, and OOM killers
  - Network partitions, DNS failures, and dependency outages
  - Disk-full and inode-exhaustion scenarios
- **Chaos experiments for process managers**
  - Designing safe experiments: blast radius, rollback, and observability
  - Game days: scheduled drills that prove the runbook
  - Automating chaos with scripts that target PM2-managed services
- **Runbook automation**
  - Documenting recovery procedures and turning them into scripts
  - Auto-remediation patterns: health-check-driven restart, circuit breakers
  - Post-incident review: what the process manager logs reveal
- **Hands-on Lab**: Run a chaos game day — kill the daemon, kill processes with SIGKILL, exhaust memory, and simulate a dependency outage — then verify the recovery runbook restores service within the SLO

### Module 11: Release Engineering at Scale (Week 11)

- **Deployment strategies with PM2**
  - Blue-green and canary releases using ecosystem files
  - Rolling updates with `pm2 reload` across a cluster
  - Instant rollback: keeping the previous release one command away
- **CI/CD integration patterns**
  - Building, testing, and deploying through pipelines with PM2 hooks
  - `pm2 deploy` with pre/post-deploy hooks for migrations and health gates
  - GitOps-style flows: configuration as code for the process fleet
- **Feature flags and progressive delivery**
  - Combining PM2 reloads with feature-flag services
  - Percent-based canary traffic and automated promotion/rollback
- **Configuration management**
  - Versioning ecosystem files and validating them in CI
  - Environment promotion: dev → staging → production without drift
- **Hands-on Lab**: Implement a canary release of a new service version behind a load balancer, verify health gates, and roll back instantly when the canary fails

### Module 12: Capstone — Self-Healing Multi-Host Platform (Week 12)

- **Capstone requirements**
  - A stateless API tier and a singleton worker tier, each under PM2
  - Multi-host deployment with a load balancer and health-check failover
  - Custom metrics, Prometheus export, and Grafana dashboards
  - Security hardening: dedicated user, vault secrets, pinned dependencies
  - A chaos drill that kills processes and a host, with a documented runbook
  - Canary deployment and instant rollback for the API tier
- **Deliverables**
  - Complete ecosystem files, control-plane scripts, and CI/CD configuration
  - Observability stack configuration and alerting rules
  - Incident runbook with recovery procedures and post-incident review template
  - A written analysis of failure modes and how each is mitigated
- **Evaluation focus**
  - Correctness of the failure-recovery design
  - Depth of observability and alerting
  - Quality of the runbook and chaos-drill evidence

## Final Project

Learners will design, build, and operate a **self-healing, multi-host Node.js platform** managed entirely through PM2. The platform consists of three tiers:

1. **Stateless API tier (Express/Fastify)**: Runs in cluster mode across two or more hosts, behind a reverse proxy with health-check-based failover. Supports canary releases and instant rollback.

2. **Singleton worker tier (BullMQ/Agenda)**: Consumes jobs from a shared Redis queue. Runs exactly one instance fleet-wide using a distributed leader-election pattern, so duplicate processing never occurs.

3. **Observability layer**: Every service publishes custom metrics with `@pm2/io`, exported to Prometheus and visualized in Grafana, with alerting rules that fire on restart storms, event-loop lag, and error-rate spikes.

The project must include a complete set of ecosystem files with environment-specific configurations, a programmatic control plane that reacts to the PM2 event bus, a hardened deployment (dedicated user, vault-injected secrets, pinned PM2 versions), and a documented chaos-drill runbook that proves recovery from process kills, daemon restarts, and a full host failure — all within the defined recovery time objective.

## Assessment Criteria

- **Module Labs (40%)**: Each module includes a hands-on lab evaluated on completion, correctness, and adherence to the advanced patterns taught. Labs are submitted as control-plane scripts, custom modules, ecosystem files, dashboards, and drill reports.

- **Mid-Course Exam (20%)**: A written and practical exam after Module 6 covering daemon internals, the programmatic API, cluster orchestration, and high-availability architecture.

- **Final Capstone Project (40%)**: The capstone is evaluated on:
  - **Architecture and design (25%)**: Correct multi-host topology, singleton worker leadership, and clean separation of tiers
  - **Failure-recovery correctness (30%)**: The platform survives process kills, daemon restarts, and host loss within the RTO, with evidence from chaos drills
  - **Observability depth (20%)**: Custom metrics, dashboards, and alerts genuinely drive operational decisions
  - **Security posture (15%)**: Least-privilege execution, secret handling, and dependency pinning are demonstrated
  - **Documentation (10%)**: The runbook is complete, repeatable, and includes a post-incident review template

## References

- [PM2 Official Documentation](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/) — Complete reference for all PM2 commands, configuration, and the programmatic API
- [PM2 Programmatic API Reference](https://pm2.keymetrics.io/docs/usage/pm2-api/) — The `pm2` npm module for controlling the daemon from code
- [PM2 Cluster Mode Guide](https://pm2.keymetrics.io/docs/usage/cluster-mode/) — Cluster mode internals, reload mechanics, and scaling
- [PM2 Module System](https://pm2.keymetrics.io/docs/advanced/pm2-module-system/) — Building and publishing custom PM2 modules
- [pm2-logrotate Plugin](https://github.com/keymetrics/pm2-logrotate) — Reference module implementation for log rotation
- [@pm2/io Documentation](https://github.com/keymetrics/pm2-io-apm) — Custom metrics, tracing, and APM instrumentation
- [PM2 Plus Documentation](https://pm2.keymetrics.io/docs/usage/pm2-plus/) — Managed monitoring, dashboards, and alerting
- [Node.js Cluster Documentation](https://nodejs.org/api/cluster.html) — Official Node.js cluster module reference
- [PM2 Docker Integration](https://pm2.keymetrics.io/docs/usage/docker-pm2/) — pm2-runtime and container best practices
- [PM2 Startup Hook Guide](https://pm2.keymetrics.io/docs/usage/startup/) — Init-system integration and daemon lifecycle
- [Principles of Chaos Engineering](https://principlesofchaos.org/) — The canonical chaos engineering principles for designing failure drills

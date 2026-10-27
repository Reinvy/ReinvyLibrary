---
title: "PM2 Edge and Resource-Constrained Deployment Engineering Syllabus"
description: "A comprehensive 12-week advanced curriculum for engineers who run PM2 on constrained hardware and edge fleets: PM2's own memory footprint, instance sizing against a hard memory ceiling, cgroup v2 and OOM-killer interplay, boot resurrection with systemd, log rotation on tiny disks, ARM and musl native modules, multi-architecture containers with pm2-runtime, CPU starvation and thermal throttling, offline-tolerant fleet bootstrap, staged cohort rollouts, and device-level security."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# PM2 Edge and Resource-Constrained Deployment Engineering Syllabus

## Overview

This 12-week advanced syllabus teaches engineers how to run PM2 where the host is the bottleneck: single-board computers, 512 MB to 2 GB cloud instances, industrial gateways, retail kiosks, vehicle-mounted nodes, and any fleet of small machines that must keep working when the network does not. On a laptop or a 16 GB server, PM2's defaults are benign. On a device with 512 MB of RAM, one spare CPU core, and a 16 GB SD card, those same defaults are the difference between a service that runs for a year and one that dies on boot after three weeks.

The engineering problem is different from ordinary PM2 operations in four specific ways. First, **the resource budget is absolute**: you cannot add a node when memory fills, so every megabyte PM2 spends on its own daemon and every worker you launch must be justified by arithmetic, not by feel. Second, **the operating system is an active participant**: cgroup limits, the OOM killer, systemd's boot ordering, journald rate limiting, and the SD card's write endurance all shape whether the service survives. Third, **the platform is foreign**: ARM CPUs, musl-based distributions, native modules that must be compiled where they run, and container images that must exist for that architecture. Fourth, **the network is unreliable**: devices come online for minutes at a time, so deployment, telemetry, and rollback must be designed to tolerate absence instead of assuming a live control plane.

The curriculum is organized in four phases. Weeks 1–3 establish the constrained host model and do the memory arithmetic that governs every later decision. Weeks 4–6 integrate PM2 with the operating system: cgroup v2 limits, OOM behavior, boot resurrection, and log/disk pressure on small volumes. Weeks 7–9 confront the hardware and the scheduler: ARM and musl builds, containers on edge hardware, CPU starvation, thermal throttling, and event-loop fairness with fewer cores than workers. Weeks 10–12 turn one surviving device into a fleet: idempotent bootstrap, offline-tolerant configuration, staged cohort rollouts with automatic rollback, device identity and secret distribution, and a capstone control plane.

Every module pairs the reasoning with a lab that runs on genuinely constrained hardware — a Raspberry Pi, a 1 GB VPS, or a container capped to 256 MB — and produces a number: resident memory per worker, restart time after an OOM kill, cold-boot time to first healthy response, or the share of a single core a cluster consumes at idle.

## Curriculum

### Module 1: The Constrained Host Reality (Week 1)

- **What counts as constrained**
  - Memory-defined hosts: 512 MB single-board computers, 1 GB entry VPS instances, 2 GB gateways shared with other agents
  - CPU-defined hosts: single-core or big.LITTLE ARM SoCs where one core must serve all workers
  - Storage-defined hosts: 8–32 GB SD cards and eMMC with limited write endurance and slow random writes
  - Power-defined hosts: solar or battery nodes that may lose power without a clean shutdown
- **The failure modes unique to small hosts**
  - Silent OOM kills that PM2 reports as restarts, masking the real cause
  - Filesystem corruption after power loss, leaving PM2's dump file unreadable
  - Disk-full conditions caused by logs, not by application data
  - Clock drift and timezone gaps that break TLS validation and log timestamps
- **The budget ledger**
  - Fixed costs: kernel, init system, journald, SSH, and the monitoring agent
  - Variable costs: PM2 daemon, one or more workers, and the memory each HTTP request pins
  - Headroom: why the kernel needs 10–15 percent and why a full budget is a failed budget
- **Choosing the supervision model**
  - PM2 directly under systemd on a dedicated device
  - PM2 inside a container where the container itself is the budget boundary
  - When a constrained host should run one process without PM2 at all — and what you lose
- **Hands-on Lab**: Provision a 512 MB to 1 GB host, record `free -m`, `nproc`, and disk layout, then run a trivial PM2 app and produce a written budget ledger showing every resident cost before any application code exists

### Module 2: Measuring PM2's Own Footprint (Week 2)

- **The God daemon**
  - What the daemon holds: the process table, log file handles, IPC sockets, and the module registry
  - Typical resident memory ranges on 64-bit and 32-bit ARM, and why the daemon's footprint grows with process count
  - Why the daemon is the one process that must never be restarted casually on a device you cannot reach
- **Per-worker baseline**
  - Measuring an empty Node.js worker's RSS before and after PM2 attaches its agent
  - The cost of `@pm2/io` instrumentation under a 512 MB ceiling
  - Source maps, heap snapshots, and other development-time costs that must stay off in production
- **Reading the right numbers**
  - `pm2 prettylist` and `pm2 jlist` fields that actually matter on constrained hosts: `monit.memory`, `pm2_env.restart_time`, `pm2_env.unstable_restarts`
  - RSS versus heap used versus heap total, and why `max_memory_restart` compares against the wrong one when misconfigured
  - Page cache and how Linux accounting makes a healthy device look full
- **Instrumentation you can afford**
  - Sampling `pm2 jlist` from a shell script instead of running a heavier metrics agent
  - Writing one compact JSON line per sample to a ring buffer on tmpfs
  - Avoiding observability stacks that cost more memory than the service they observe
- **Hands-on Lab**: Measure the daemon, an idle worker, and a worker under load on the same device; capture ten-minute RSS profiles with and without `@pm2/io`; and publish the resulting footprint table used to size Week 3

### Module 3: Sizing Instances and the Memory Ceiling (Week 3)

- **The ceiling equation**
  - Total budget minus kernel and init overhead minus daemon cost minus headroom equals worker budget
  - Dividing the worker budget by per-worker peak RSS to get a maximum instance count
  - Why peak, not average, decides the count: garbage collection spikes and request bursts set the ceiling
- **Node.js heap configuration on small hosts**
  - `--max-old-space-size` and `--max-semi-space-size` as hard limits instead of hopes
  - Why a smaller heap means more frequent collections but predictable memory
  - Setting `node_args` per app in the ecosystem file and verifying with `pm2 describe`
- **Instance count versus CPU count**
  - Cluster mode on a single-core device: contention instead of throughput
  - `instances: 1` with `exec_mode: fork` for I/O-bound services on constrained CPUs
  - When `-i max` is correct and when it quietly destroys latency
- **Restart policy as a memory control**
  - `max_memory_restart` values that actually correspond to the measured ceiling
  - Distinguishing a leak-shaped restart pattern from a load-shaped one in `pm2 logs`
  - `min_uptime`, `max_restarts`, and `exp_backoff_restart_delay` to prevent a crash loop from consuming the whole budget
- **Hands-on Lab**: Derive an instance count for a real service from measured RSS, set `max_old_space_size` and `max_memory_restart` accordingly, then run a load test that would have failed before and show the service staying inside its ceiling

### Module 4: cgroup v2 and the OOM Killer (Week 4)

- **Two limit systems that must agree**
  - PM2's `max_memory_restart` as an application-level restart trigger
  - cgroup v2 `MemoryHigh` and `MemoryMax` as kernel-enforced ceilings
  - The pathology of disagreement: PM2 restarts before the kernel acts, or the kernel kills before PM2 notices
- **Reading cgroup v2 on a device**
  - The unified hierarchy under `/sys/fs/cgroup` and `memory.current`, `memory.peak`, `memory.events`
  - Systemd slices and `MemoryMax` on the PM2 unit versus a global limit
  - Container runtime limits that surface as the same cgroup files
- **OOM behavior and its traces**
  - How the kernel selects a victim via `oom_score` and `oom_score_adj`
  - Protecting the PM2 daemon so it survives when a worker is chosen
  - Where to find the evidence: `dmesg`, `journalctl -k`, and cgroup `memory.events` counters
- **Designing for the kill**
  - Making every worker restart-safe: idempotent startup, no in-memory state that matters
  - Distinguishing a clean exit, a self-restart, and an OOM kill in PM2's restart counters
  - Alerting on cgroup OOM events instead of on restart counts alone
- **Hands-on Lab**: Constrain a PM2 app with a cgroup memory limit below its natural footprint, induce an OOM kill, prove the daemon survives, then tune `oom_score_adj` and `max_memory_restart` so the service degrades by restarting one worker instead of dying

### Module 5: Boot, Resurrection, and Cold-Start Budgets (Week 5)

- **Boot ordering on a device**
  - Why `pm2 startup` must run after the network and filesystem are ready, not merely installed
  - The generated systemd unit, `WantedBy=multi-user.target`, and `After=` dependencies that matter
  - Running PM2 as a dedicated unprivileged user and the PATH pitfalls that break resurrection
- **The dump file as state**
  - What `pm2 save` actually persists and what it silently omits
  - Corruption after power loss and the recovery path when `dump.pm2` cannot be parsed
  - Rebuilding the process list from the ecosystem file instead of trusting the dump
- **Cold-start budget**
  - Measuring time from power-on to first healthy HTTP response on the actual device
  - Slowing factors: SD card random reads, Node.js startup on ARM, module graph size, and `pm2 resurrect` overhead
  - Techniques that shorten the budget: bundling, lazy imports, precompiled bytecode, and disabling source maps
- **Idempotent boot**
  - Designing startup so that a partial boot converges rather than duplicating processes
  - Detecting and clearing stale PID references left by an unclean shutdown
  - A watchdog that verifies health after resurrect and re-runs `pm2 start` only when needed
- **Hands-on Lab**: Build a systemd unit for PM2, cut power to the device mid-run, then measure and document boot-to-healthy time, dump-file integrity, and the recovery steps needed for three successive unclean shutdowns

### Module 6: Logs, Disk Pressure, and Small-Volume Failure Modes (Week 6)

- **Why logs fill embedded disks**
  - Default log paths under `~/.pm2/logs` and the growth rate of a chatty service
  - The interaction between PM2 log files and journald when both capture the same stream
  - SD card write amplification: how constant log appends shorten device life
- **Rotation that fits the device**
  - `pm2-logrotate` settings that make sense at 32 GB: `max_size`, `retain`, `compress`, and `rotateInterval`
  - Rotating to tmpfs for high-volume debug streams and persisting only the summary
  - Journald `SystemMaxUse` and `RateLimitBurst` caps as the second line of defense
- **Disk-full behavior**
  - What breaks first: log writes, then SQLite or leveldb state, then PM2's own dump
  - Writing a disk guard that triggers rotation and alerts before the filesystem is full
  - Read-only remount as a last-resort survival mode and how the app must behave under it
- **Log volume as a design constraint**
  - Structured logging with sampling instead of per-request verbosity
  - Moving aggregation off-box with a bounded buffer so an offline device never grows without limit
  - Measuring bytes logged per thousand requests as a capacity metric
- **Hands-on Lab**: Run a high-traffic service on a deliberately small volume, configure rotation and journald caps, then measure log growth per hour, device write volume, and the exact behavior of the service when the filesystem reaches ninety-nine percent

### Module 7: ARM, musl, and Native Modules (Week 7)

- **Architecture reality**
  - armv7 versus aarch64 versus x86_64 and why a binary built on the wrong target fails at load time
  - glibc versus musl: the undefined symbol errors that follow a Debian-built node_modules onto Alpine
  - Verifying what is actually installed: `uname -m`, `ldd`, and `node -p process.arch`
- **Native addons**
  - Which dependencies compile native code and how to find them before deployment
  - Building on-device with the toolchain present versus cross-compiling on a faster machine
  - Prebuilt binaries, prebuild-install, and the fallback path when no artifact exists for the target
- **A build pipeline for constrained targets**
  - Producing a self-contained bundle per architecture and keeping it out of the source tree
  - Determinism: pinning Node.js versions and rebuilding when the runtime changes
  - Caching build artifacts so a fleet rollout does not recompile on every device
- **32-bit memory limits**
  - Address space constraints on armv7 and the practical heap ceiling
  - Why a worker that is fine on aarch64 may fail to allocate on armv7
  - Choosing 64-bit targets for anything that needs more than a small heap
- **Hands-on Lab**: Deploy the same service to an armv7 device, an aarch64 device, and an x86_64 host; break and then repair a native-module mismatch; and produce a build matrix that guarantees the correct artifact per target

### Module 8: Containers on Edge Hardware with pm2-runtime (Week 8)

- **PM2's container mode**
  - `pm2-runtime` as PID 1: signal forwarding, zombie reaping, and exit-code propagation
  - Why `pm2 start` in a container is wrong and how the container dies silently when it is used
  - `--no-daemon` behavior and log streaming to stdout for the container runtime
- **The container as the budget boundary**
  - Docker `--memory` and `--cpus` translating into cgroup v2 limits PM2 can observe
  - Sizing `max_memory_restart` below the container limit so PM2 acts first
  - Choosing between `--memory-swap` equal to memory (no swap) and a small swap allowance
- **Images for small devices**
  - Multi-architecture builds with buildx for armv7, arm64, and amd64
  - Choosing slim or Alpine bases and the musl consequences from Module 7
  - Image size as a deployment constraint on metered or slow links
- **Constrained runtime concerns**
  - Read-only root filesystems and the writable paths PM2 actually needs
  - Container restart policies versus PM2's own restart policy, without double-counting
  - Healthchecks that reflect readiness rather than process existence
- **Hands-on Lab**: Package a PM2 service as a multi-architecture image, run it capped at 256 MB and half a core, verify signal handling on `docker stop`, and prove that a container OOM results in one clean restart rather than a crash loop

### Module 9: CPU Starvation, Thermal Throttling, and Event-Loop Fairness (Week 9)

- **When the CPU is the ceiling**
  - Single-core devices running more workers than cores: run-queue latency and scheduling noise
  - Measuring contention with load average, `vmstat`, and per-process CPU time
  - Event-loop lag as the earliest visible symptom of starvation
- **Thermal and power behavior**
  - Frequency scaling and thermal throttling turning a fast SoC into a slow one under sustained load
  - Sustained-load benchmarks instead of burst benchmarks, and the derating factor they reveal
  - Power-loss tolerance: filesystem sync policy, PM2 dump durability, and idempotent restart
- **Fairness with fewer cores than workers**
  - CPU affinity and cgroup `cpu.weight` to keep the daemon responsive under load
  - Reducing worker count and increasing per-worker concurrency for I/O-bound services
  - Why `nice` on the daemon is safer than pinning it to the busiest core
- **Watch mode, reloads, and CPU cost**
  - The price of `--watch` on a device with modest CPU: repeated restarts competing with traffic
  - Staggered `pm2 reload` timings on a single core so the rolling window does not starve the fleet
  - Graceful shutdown deadlines that assume slow cores, not fast ones
- **Hands-on Lab**: Load a single-core device with a multi-worker cluster, measure event-loop lag and throughput, then reduce workers, adjust concurrency, and apply CPU weights until p95 latency fits the budget; document the thermal derating observed

### Module 10: Fleet Bootstrap and Offline-Tolerant Configuration (Week 10)

- **Idempotent device provisioning**
  - A bootstrap that converges from a blank image to a running service without manual steps
  - Version pins for Node.js and PM2, and a checksum-verified artifact fetch
  - Making the second run of the bootstrap a no-op, and proving it
- **Configuration without a live control plane**
  - Desired-state files shipped with the artifact rather than fetched at boot
  - Signed configuration bundles with an embedded expiry and a documented fallback
  - Environment layering: device identity, site parameters, and secrets kept separate
- **Telemetry from intermittent devices**
  - Store-and-forward buffers with a hard size cap and an eviction policy
  - Heartbeats that carry a device version fingerprint, uptime, restart count, and last error
  - Reconciling a device's own view with the control plane's view after days offline
- **Fleet-level PM2 operations**
  - `pm2 deploy` and its limits on devices behind NAT or with unstable DNS
  - Push-based rollout using artifacts plus a boot-time converge step, instead of SSH fan-out
  - Handling clock skew and expired certificates on devices that slept for weeks
- **Hands-on Lab**: Provision five devices (or five containers emulating them) with one bootstrap script, take three offline for a day, then restore connectivity and prove that all five converge to the same version and report consistent telemetry

### Module 11: Staged Rollouts, Rollback, and Device Security (Week 11)

- **Cohort-based rollout**
  - Defining cohorts by site, hardware revision, or stable device identity
  - Stage gates with health criteria that must hold before the next cohort proceeds
  - Detecting a bad release from fleet signals rather than from a single device
- **Automatic rollback on constrained devices**
  - Keeping the previous artifact on disk within the storage budget
  - A rollback trigger that acts locally when the device cannot reach the control plane
  - Verifying the rolled-back version actually runs, not merely that the files were restored
- **Device identity and secrets**
  - Per-device credentials issued at provisioning and rotated without a full reflash
  - Keeping secrets out of images and ecosystem files; using a root-owned environment file
  - Least-privilege PM2 daemon, protected `.pm2` directory, and a locked-down IPC socket
- **Attack surface reduction**
  - Disabling SSH password auth and unnecessary services on devices that face users
  - Read-only root with a writable data partition as both a security and a durability measure
  - Auditing what a stolen device reveals: logs, environment files, and cached artifacts
- **Hands-on Lab**: Ship a deliberately broken release to a cohort, prove automatic rollback restores service without remote access, then rotate a device secret across the fleet and audit a simulated stolen device for exposed material

### Module 12: Capstone — The Constrained Fleet Control Plane (Week 12)

- **Capstone scope**: design, build, and operate a fleet of at least five resource-constrained devices running PM2-managed services, with a control plane that tolerates devices disappearing for days
- **Architecture requirements**
  - Documented memory ledger per device with measured daemon and worker footprint and a stated headroom policy
  - cgroup v2 limits, aligned `max_memory_restart` thresholds, and systemd boot resurrection that survives unclean power loss
  - Correct artifacts per architecture, containerized or bare, with a rollback copy resident on device
- **Operational requirements**
  - Rotation and journald caps sized to the actual volume, with a disk guard that fires before exhaustion
  - Store-and-forward telemetry with a bounded buffer and a documented eviction policy
  - Cohort rollout with two stage gates and an automatic local rollback path
- **Deliverables**: the bootstrap and rollout tooling, the ecosystem and systemd configuration, the measurement scripts, the telemetry schema, and a runbook covering OOM recovery, disk-full recovery, boot-loop recovery, and rollback
- **Presentation**: defend the memory arithmetic, show one real OOM kill and one real rollback with before/after numbers, and explain what the fleet does when the control plane is unreachable for a week

## Final Project

Learners build and operate a five-device constrained fleet running a real service under PM2, with the whole lifecycle governed by measurement. The project must include a written memory ledger derived from actual readings on the target hardware; a PM2 configuration whose `max_old_space_size`, `max_memory_restart`, and cgroup limits agree by construction; a systemd unit plus resurrection strategy that has survived at least three unclean power cuts; log rotation and journald caps with a disk guard demonstrated to fire before exhaustion; multi-architecture artifacts with an on-device rollback copy; store-and-forward telemetry with a bounded buffer; and a cohort rollout that reached every device with two stage gates.

The project must also document four failure drills executed on real hardware: an induced OOM kill with proof the daemon survived and only one worker restarted, a disk-full condition resolved by the guard, a boot loop recovered without physical access, and a broken release rolled back automatically while the device was offline. Each drill must include the measurements taken before, during, and after, and the runbook steps an operator would follow.

## Assessment Criteria

- **Assignments**: Weekly labs are assessed on whether the claims are backed by measurements from the actual constrained hardware, on the correctness of the configuration under test, and on the quality of the failure analysis. Labs that report numbers from a laptop or from an unconstrained container instead of the target device are not accepted. Labs 4, 5, and 7 carry extra weight because OOM behavior, boot integrity, and architecture correctness are the three failure modes that most often take a real device out of service permanently.
- **Final Project**: The capstone is validated against the architecture requirements (measured memory ledger, aligned limit systems, power-loss-safe resurrection, correct per-architecture artifacts), the operational requirements (working rotation and disk guard, bounded telemetry buffer, staged rollout with automatic rollback), and the four documented failure drills with reproducible numbers. A project whose limits disagree — where the kernel kills before PM2 acts, or where PM2 restarts before the kernel ever would — does not pass, regardless of how well the service performs under normal load.

## References

- [PM2 official documentation](https://pm2.keymetrics.io/docs/usage/quick-start/) — process management, ecosystem files, restart policies, and cluster mode
- [PM2 in Docker / pm2-runtime](https://pm2.keymetrics.io/docs/usage/docker-pm2-nodejs/) — running PM2 as PID 1 with signal forwarding and stdout logging
- [pm2-logrotate](https://github.com/keymetrics/pm2-logrotate) — size, retention, compression, and interval configuration for constrained volumes
- [PM2 startup and resurrection](https://pm2.keymetrics.io/docs/usage/startup/) — systemd integration, `pm2 save`, and boot-time process restoration
- [Node.js CLI options](https://nodejs.org/api/cli.html) — `--max-old-space-size`, `--max-semi-space-size`, and V8 heap configuration
- [Node.js memory diagnostics](https://nodejs.org/en/learn/diagnostics/memory) — RSS versus heap accounting and leak investigation
- [systemd resource control](https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html) — `MemoryHigh`, `MemoryMax`, `CPUWeight`, and slice configuration
- [Control Group v2 documentation](https://docs.kernel.org/admin-guide/cgroup-v2.html) — the unified hierarchy, memory events, and `oom_score_adj`
- [Docker multi-platform builds](https://docs.docker.com/build/building/multi-platform/) — buildx targets for armv7, arm64, and amd64
- [node-gyp](https://github.com/nodejs/node-gyp) — compiling and cross-compiling native addons for ARM targets
- [Alpine Linux and musl](https://wiki.alpinelinux.org/wiki/Main_Page) — glibc versus musl compatibility and its effect on prebuilt binaries

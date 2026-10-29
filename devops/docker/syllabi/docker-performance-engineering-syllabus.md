---
title: "Docker Performance and Resource Engineering Syllabus"
description: "An advanced 10-module syllabus for engineers who need to predict, measure, and tune container performance: cgroup v2 resource control, CPU and memory accounting, I/O and network overhead, runtime isolation trade-offs, profiling with eBPF, image start-up cost, and density-driven capacity planning."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Docker Performance and Resource Engineering Syllabus

## Overview

Most Docker material teaches you how to get a container running. Far less teaches you how to explain why it runs slower than the same process on a host, where the missing CPU time went, or how many instances will fit on a node before latency collapses. This syllabus targets that gap. It is an advanced, 10-module curriculum for platform engineers, SREs, and backend engineers responsible for the performance and cost of containerized systems.

The course is deliberately measurement-first. Every module starts from a model of how the kernel accounts for a resource, then moves to the tooling that exposes it, and ends with a lab where learners produce numbers rather than opinions. Modules 4 through 7 examine the specific overhead surfaces containers introduce: overlay filesystems, virtual networking, syscall interception by alternative runtimes, and the cost of image pull and start-up. Modules 8 and 9 turn those measurements into engineering decisions about bin packing, right-sizing, and regression gates in CI.

This is not a repeat of the entry-level containerization syllabus or the platform-engineering syllabus. Those cover what containers are and how to operate a container platform; this one assumes fluency with images, Compose, and basic `docker run` flags, and drills into resource control semantics, benchmarking methodology, and capacity mathematics. Learners who finish should be able to defend a CPU limit choice, a runtime choice, and a density target with data.

## Curriculum

### Module 1: The Cost Model of a Container
- **What a Container Actually Adds**
  - Process isolation plus a packaging boundary; there is no hypervisor in the default path
  - Where overhead is real (syscall interception, overlay lookups, veth traversal) and where it is imaginary (start-up versus run time)
  - Common myths: "containers are slower", "limits are free", "one core is one core"
- **Benchmark Methodology Before Benchmarking**
  - Warm-up, run count, variance, and why a single `time` measurement is not a benchmark
  - Controlling for CPU frequency scaling, noisy neighbors, and page cache state
  - Reporting p50/p95/p99 and the confidence interval you actually have
- **Lab**: Run an identical CPU-bound and I/O-bound workload on the host, in a container with no limits, and in a container with limits, then explain every delta you measure

### Module 2: CPU Control and Scheduling Semantics
- **cgroup v2 CPU Controls**
  - The distinction between `cpu.weight` (proportional share under contention) and `cpu.max` (hard quota)
  - Why a quota that is too tight produces throttling even when the node looks idle
  - `cpu.stat` counters: `nr_periods`, `nr_throttled`, `throttled_usec`
- **Placement Controls**
  - `cpuset` pinning, NUMA awareness, and cache locality for latency-sensitive services
  - Hyperthread siblings and the throughput-versus-latency trade-off of sharing physical cores
- **Diagnosing Throttling**
  - Correlating p99 latency spikes with throttled periods instead of guessing
  - The classic failure: multi-threaded startup bursts into a 1-CPU quota
- **Lab**: Reproduce latency cliffs by tuning `cpu.max` on a fixed workload and plot latency against quota

### Module 3: Memory Accounting, OOM Behaviour, and Swap
- **How the Kernel Charges Memory to a cgroup**
  - `memory.current`, `memory.max`, `memory.stat`, and the split between anon, file, and kernel memory
  - Page cache as reclaimable memory; why "the container is using 2 GB" is usually wrong
  - Working set estimation: `memory.stat` file/anon deltas over an interval
- **Limits, Reservations, and the OOM Killer**
  - `memory.max` versus `memory.high` as a throttling valve before the killer fires
  - `oom_score_adj` per process and why the wrong victim gets killed
  - Java, Go, and Node runtime heap behaviour under a cgroup limit; respecting `GOMEMLIMIT` and container-aware JVM flags
- **Swap and zram in Container Hosts**
  - `memory.swap.max`, the latency cost of swapping, and when to disable it entirely
- **Lab**: Force controlled OOM conditions and demonstrate a container that survives by correct heap configuration

### Module 4: Storage and Filesystem Performance
- **Overlay Filesystem Mechanics**
  - Layers, lowerdir/upperdir, copy-up cost on first write, and why writing into the image layer is slow
  - When a volume or bind mount beats the writable layer, and when tmpfs is the right answer
- **Block I/O Control**
  - `io.max` bandwidth and IOPS ceilings per device, `io.stat` accounting
  - Read/write amplification from small-block workloads on networked storage
- **Volume Driver Trade-offs**
  - Local volumes, NFS-backed volumes, and cloud block devices: latency profiles and failure modes
  - Database containers on shared storage: what to measure before calling it acceptable
- **Lab**: Benchmark sequential and random I/O across writable layer, volume, bind mount, and tmpfs

### Module 5: Container Networking Throughput and Latency
- **The Default Bridge Path**
  - veth pairs, bridge forwarding, NAT rules, and the per-packet cost of traversing them
  - MTU mismatches as a silent throughput killer; TCP segmentation offload behaviour
- **Alternative Network Paths**
  - `host` networking for maximum throughput and its isolation cost
  - macvlan and ipvlan for L2 presence without NAT
  - eBPF-based datapaths and where they actually win
- **Measuring Rather Than Guessing**
  - Throughput, request-per-second overhead, and connection setup latency in isolation
  - `iperf3`, `wrk`/`hey`, and socket-level tracing between two containers
- **Lab**: Measure identical request workloads over bridge, host, and macvlan networking and quantify the difference

### Module 6: Isolation Runtimes and Their Performance Cost
- **The Runtime Spectrum**
  - `runc` with namespaces and cgroups: near-native syscall cost
  - gVisor: user-space kernel, syscall interception, and the workloads it penalises
  - Kata Containers and Firecracker microVMs: memory overhead, boot time, and density cost
- **Choosing With Evidence**
  - Syscall-heavy versus compute-heavy versus I/O-heavy profiles and how each reacts
  - Compatibility gaps: `io_uring`, some `ioctl` paths, GPU passthrough
- **Quantifying the Tax**
  - Benchmarking the same service under two runtimes and reporting the honest delta
- **Lab**: Run one service under `runc` and one under gVisor, then produce a comparison table of throughput, latency, and memory footprint

### Module 7: Profiling and Observability Inside Containers
- **Host-View Profiling**
  - `perf` across container boundaries, PID namespace mapping, and kernel symbol resolution
  - `bpftrace` and eBPF for per-cgroup latency attribution without instrumenting the app
- **Container-Aware Metrics**
  - cAdvisor, the Docker stats endpoint, and the difference between container CPU percentage and host CPU time
  - Pressure stall information (PSI) as the honest signal for resource starvation
- **Flame Graphs and Traces**
  - Building a CPU flame graph for a containerized service
  - Distributed tracing to distinguish in-container time from network time
- **Lab**: Attribute a synthetic latency regression to a specific resource using only profiling tools

### Module 8: Image Pull, Layering, and Start-Up Cost
- **Where Start-Up Time Goes**
  - Pull time, layer extraction, container creation, and application boot as separate budgets
  - Registry locality, layer deduplication, and why image size is a weak proxy for pull time
- **Lazy Loading and Snapshotters**
  - Remote snapshotters (stargz, nydus) and the trade-off against full local caching
  - Pre-warmed node images and the cold-start problem in autoscaling clusters
- **Boot-Time Discipline**
  - Cutting entrypoint work, avoiding runtime package installation, deferring non-critical initialisation
- **Lab**: Break a service's start-up into its four budgets and reduce total cold start by at least 40 percent

### Module 9: Density, Capacity Planning, and Cost
- **From Measurements to a Capacity Model**
  - Deriving per-instance resource envelopes from load tests instead of copying defaults
  - The knee of the latency curve as the real density ceiling
- **Packing and Right-Sizing**
  - Requests versus limits as a scheduling contract; the cost of over-reserving
  - Bin-packing behaviour, fragmentation, and why identical nodes end up unevenly loaded
- **Noisy Neighbour Control**
  - Shared page cache, shared CPU, and shared network as interference channels
  - Blast-radius controls that cost little and buy predictability
- **Lab**: Build a capacity model for a three-service stack and compute the cost delta between default and tuned configurations

### Module 10: Performance Regression Gates and Governance
- **Reproducible Benchmark Environments**
  - Pinned images, pinned hardware classes, and controlled noise for CI
  - Statistical gating: how much change is real
- **Gates That Do Not Get Ignored**
  - Budgets per service (start-up, memory, throughput) enforced in the pipeline
  - Alerting on throttling and OOM events as leading indicators rather than lagging incidents
- **Documenting the Why**
  - Recording the measurement, the chosen limit, and the condition under which it should be revisited
- **Lab**: Add a performance gate to a CI pipeline that fails a build on a meaningful regression without flaking

## Final Project

Learners tune a realistic multi-service stack and defend every decision with data. The deliverable is a performance engineering report plus the configuration that backs it:

- A reproducible benchmark harness that runs the same load profile against host, unconstrained container, and tuned container configurations
- A per-service resource envelope derived from measured latency curves: CPU quota, memory ceiling, and I/O limits with the reasoning recorded
- A runtime choice recommendation (runc, gVisor, or microVM) justified by measured syscall and memory cost for at least one service
- A start-up budget breakdown and the changes that reduced cold start, measured before and after
- A capacity model that predicts how many instances fit per node and what the monthly cost difference is versus default settings
- A CI performance gate wired into the pipeline, with thresholds and a note on how false positives are handled

Reports are expected to show raw measurements, not only conclusions. A recommendation without a number behind it is treated as incomplete.

## Assessment Criteria

- **Labs (35%)**: Weekly hands-on measurement labs, graded on methodology (controls, repetitions, variance handling) as much as on the final number.
- **Measurement Reviews (20%)**: Two short reviews in which the learner presents a benchmark and defends it against questions about noise, confounders, and statistical significance.
- **Final Project (35%)**: The tuning report and its supporting configuration, graded on the soundness of the resource envelopes, the honesty of the runtime comparison, the accuracy of the capacity model, and the reproducibility of the harness.
- **Bonus (up to 10%)**: Contributing a reusable benchmark recipe or dashboard that other teams can adopt without modification.

## References

- [Docker Docs: Resource Constraints](https://docs.docker.com/engine/containers/resource_constraints/)
- [Docker Docs: Runtime Metrics and `docker stats`](https://docs.docker.com/reference/cli/docker/container/stats/)
- [Linux Kernel Documentation: Control Group v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)
- [Linux Kernel Documentation: Pressure Stall Information](https://docs.kernel.org/accounting/psi.html)
- [Docker Docs: Alternative Container Runtimes](https://docs.docker.com/engine/daemon/alternative-runtimes/)
- [gVisor Documentation](https://gvisor.dev/docs/)
- [Kata Containers Documentation](https://katacontainers.io/docs/)
- [containerd: Remote Snapshotters](https://github.com/containerd/containerd/blob/main/docs/remote-snapshotter.md)
- [Brendan Gregg: Systems Performance and flame graphs](https://www.brendangregg.com/)
- [bpftrace Reference Guide](https://bpftrace.org/docs/)
- [cAdvisor Documentation](https://github.com/google/cadvisor)

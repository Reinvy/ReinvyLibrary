---
title: "PM2 Real-Time Applications Engineering Syllabus"
description: "A comprehensive 12-week advanced curriculum for engineers who build and operate real-time applications on PM2: WebSocket and SSE services, cluster mode with sticky sessions, graceful reload of long-lived connections, backpressure and flow control, reconnect storm resilience, horizontal scaling across hosts, real-time observability, and secure long-lived connection handling."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# PM2 Real-Time Applications Engineering Syllabus

## Overview

This 12-week advanced syllabus teaches engineers how to design, operate, and scale real-time applications entirely with PM2. Real-time workloads — chat systems, live dashboards, collaborative editing, gaming backends, IoT telemetry, and streaming feeds — have a fundamentally different operational profile from request/response web apps. Connections are long-lived, state lives on the server as much as in the database, and a single reload or crash can sever thousands of sockets at once. Where the introductory PM2 curriculum teaches general process management and the advanced syllabus dissects PM2 internals, this course is organized around the long-lived connection itself: how to keep it alive, how to drain it gracefully, how to reload a fleet without dropping it, and how to observe and secure it.

The curriculum is organized in three phases. Weeks 1–4 build the core real-time services: WebSocket and SSE endpoints, cluster mode with sticky sessions, and the connection lifecycle under a process manager. Weeks 5–8 make them production-grade: graceful reload of long-lived connections, backpressure and memory engineering, reconnect storm resilience, and horizontal scaling across hosts. Weeks 9–12 add the operational discipline unique to real-time systems: connection-level observability and SLOs, real-time development workflows, security hardening for long-lived channels, and a capstone that assembles everything into a self-healing real-time platform.

Each module pairs deep conceptual grounding with hands-on labs that run real services: opening thousands of concurrent connections against a cluster, reloading a fleet mid-traffic, hammering a service with a thundering herd of reconnects, and running failure drills against live WebSocket endpoints. By the end of this course, learners will be able to architect a real-time backend as a set of PM2-managed services, roll out new versions without dropping connections, survive client reconnect storms, and prove capacity and latency with real measurements.

## Curriculum

### Module 1: The Real-Time Workload Landscape (Week 1)

- **What makes real-time workloads different**
  - Long-lived connections versus short request/response cycles: sockets held open for hours or days
  - Server-side state: rooms, presence, subscriptions, and cursors that vanish when a process dies
  - The blast radius of a restart: one process exit can sever hundreds of thousands of connections
- **The real-time transport taxonomy**
  - WebSocket: full-duplex, message-oriented, upgrade from HTTP
  - Server-Sent Events (SSE): one-way server-to-client over plain HTTP, auto-reconnect built in
  - Long-polling and fallback transports: when intermediaries block WebSocket upgrades
- **Choosing the right transport for the job**
  - SSE when the server only pushes (feeds, notifications, log tails)
  - WebSocket when both sides need to send (chat, collaboration, gaming)
  - Fallback chains (websocket → polling) and their operational cost
- **Where PM2 fits in the real-time stack**
  - PM2 as the supervisor between the app and the init system for single-host services
  - When a real-time fleet still fits on one host with cluster mode — and when it needs several
  - Complementing container runtimes with `pm2-runtime` inside real-time service containers
- **Hands-on Lab**: Deploy a minimal WebSocket echo service and an SSE feed as two PM2 processes, connect with a WebSocket client, and trace both under `pm2 logs`

### Module 2: PM2 Cluster Mode for Real-Time Services (Week 2)

- **Cluster mode fundamentals**
  - The Node.js cluster module and PM2's `-i max` / `instances` option
  - How the OS load-balances incoming TCP connections across cluster workers
  - Round-robin versus OS-balancing behavior and connection distribution
- **Sticky sessions and socket affinity**
  - Why real-time connections must stick to one worker: in-memory rooms, presence, and broadcast state
  - Sticky load balancing with Nginx `ip_hash` and HAProxy `balance source`
  - Sticky session pitfalls: proxies, NAT, and IPv6 address reuse
- **Broadcast and cross-worker state**
  - The shared-nothing reality of cluster workers: each worker has its own memory
  - Redis as the shared pub/sub backbone: Socket.IO Redis adapter, redis-based presence
  - When in-memory broadcast is fine (single worker) and when it is not
- **Instance count engineering**
  - Sizing instances from concurrent connection capacity, not request throughput
  - Connection-per-worker limits, file descriptor limits (`ulimit -n`), and ephemeral port exhaustion
- **Hands-on Lab**: Run a Socket.IO service in cluster mode, verify sticky routing with `ip_hash`, broadcast across workers with the Redis adapter, and measure connection distribution with `pm2 monit`

### Module 3: WebSocket Services under PM2 (Week 3)

- **The WebSocket lifecycle**
  - The HTTP upgrade handshake and its headers (`Upgrade`, `Sec-WebSocket-Key`)
  - Opening, framing, ping/pong heartbeats, and the closing handshake
  - Half-open connections: why a dead client socket can look healthy to the server
- **Building socket services with `ws` and Socket.IO**
  - The `ws` library for minimal WebSocket endpoints
  - Socket.IO for rooms, acknowledgements, and automatic reconnection with fallback transport
  - Namespaces and rooms as the unit of broadcast fan-out
- **Heartbeat and dead-connection reaping**
  - Application-level ping/pong intervals and timeout escalation
  - Terminating half-open connections so process memory is not held hostage
  - How PM2's process state interacts with per-connection timers
- **Graceful shutdown for socket services**
  - `process.on('SIGTERM')`: stop accepting new connections, drain active ones with a deadline
  - In-flight message completion versus hard close: what clients observe on each path
  - Tuning `kill_timeout` and `listen_timeout` for connection-heavy services
- **Hands-on Lab**: Build a chat service with rooms, add heartbeats, kill a worker mid-traffic with `pm2 stop`, and observe client-side reconnect and room rejoin behavior

### Module 4: SSE and Streaming Endpoints (Week 4)

- **Server-Sent Events mechanics**
  - The `text/event-stream` response, `data:` and `event:` lines, and `id:` based replay
  - Automatic client reconnection and the `Last-Event-ID` header
  - Connection limits per browser and per host
- **Keep-alives and proxy considerations**
  - Why naive HTTP timeouts kill idle SSE connections (proxy read timeouts, idle timeouts)
  - Disabling response buffering: `X-Accel-Buffering: no`, `Cache-Control: no-cache`, flush semantics
  - Load balancer keep-alive and timeout tuning for long-lived HTTP
- **Backpressure on one-way streams**
  - Slow-consumer handling when the client cannot keep up with the feed
  - Bounded event buffers and drop policies instead of unbounded memory growth
- **Running SSE services under PM2**
  - Cluster mode for SSE: stateless workers with a shared event bus via Redis
  - Restart semantics: SSE clients auto-reconnect, so drains can be fast
  - Combining SSE with PM2's `max_memory_restart` to cap feed-accumulation leaks
- **Hands-on Lab**: Build an SSE feed service that streams market ticks, run it behind a proxy, verify buffering is disabled, and confirm clients reconnect seamlessly across a `pm2 reload`

### Module 5: Graceful Reload of Long-Lived Connections (Week 5)

- **Why a reload is a disconnection event**
  - `pm2 reload` mechanics: rolling restart of cluster workers
  - What clients observe when their worker restarts: a dropped socket and an automatic reconnect
- **Draining before shutting down**
  - The drain pattern: close the listening socket, notify clients to rebalance, wait for in-flight work
  - New-connection rejection during drain versus silent refusal
  - Coordinating drains across a cluster so the fleet never fully disconnects at once
- **Client-side reconnect discipline**
  - Exponential backoff with jitter to avoid synchronized reconnect waves
  - Rejoin semantics: rooms, subscriptions, and presence restored after reconnect
  - The reconnect handoff: how the new worker learns the client's prior state
- **Reload strategies for real-time fleets**
  - Rolling reload with per-worker drain windows
  - Blue-green via a second PM2 app name and atomic traffic switch
  - When `pm2 reload` is safe and when a full stop/start with external orchestration is needed
- **Hands-on Lab**: Run a 4-instance Socket.IO cluster under load, execute `pm2 reload`, and measure connection downtime, reconnect waves, and message loss with and without drain logic

### Module 6: Backpressure, Memory, and Flow Control (Week 6)

- **The memory cost of connections**
  - Per-connection overhead: socket buffers, timers, and application state
  - The slow-consumer problem: a stalled client accumulates messages in the server's send buffer
  - Detecting buffer growth before it becomes an OOM kill
- **Backpressure primitives**
  - `socket.write()` return values and drain events
  - Bounded queues, watermark limits, and drop-oldest versus drop-newest policies
  - Conflating state (last value wins) for high-frequency telemetry streams
- **V8 memory management for real-time services**
  - Heap growth from long-lived connection objects and closure retention
  - `max_memory_restart` as the safety net and its interaction with draining
  - Event loop lag as the first symptom of backpressure failure
- **Flow control across the pipeline**
  - Producer → queue → broker → consumer backpressure chains
  - Rate limiting inbound messages per connection and per user
  - Cooperative scheduling: yielding the event loop during large broadcasts
- **Hands-on Lab**: Saturate a slow client with a high-frequency feed, watch the memory climb, add watermark-based backpressure, and verify `max_memory_restart` recovers the process without losing the fleet

### Module 7: Reconnect Storms and Failure Semantics (Week 7)

- **The thundering herd**
  - What happens when thousands of clients reconnect at once: connection storms, CPU spikes, and upstream meltdown
  - Common triggers: host restart, deploy, proxy timeout, certificate rotation
- **Server-side storm defenses**
  - Graceful degradation under connection floods: admission control and capacity breaching
  - Delaying connections with a server-controlled retry hint (HTTP 503 with `Retry-After`)
  - Circuit breaking on downstream dependencies so the storm cannot cascade
- **Client-side storm defenses**
  - Exponential backoff with full jitter, capped at a maximum interval
  - Randomized initial reconnect delay to desynchronize the herd
  - Reconnect budgets: total attempts and time window before giving up
- **PM2's role in storm resilience**
  - `min_uptime` and `max_restarts` to contain crash-looping socket services
  - `exp_backoff_restart_delay` to prevent PM2 itself from restarting the fleet in lockstep
  - Staggered instance restarts so the whole cluster does not reset simultaneously
- **Hands-on Lab**: Cut the network to a live cluster with thousands of connected clients, restart the fleet, and measure reconnect completion time with and without jittered backoff and staggered restarts

### Module 8: Horizontal Scaling and Multi-Host Deployment (Week 8)

- **Beyond one host**
  - When a single host's file descriptors, CPU, or memory cap the fleet
  - PM2 per host versus a cluster: the unit of horizontal scale is the host
- **The stateless-worker pattern**
  - Keeping connection state external: Redis for presence, rooms, and delivery queues
  - The Socket.IO Redis adapter for cross-host broadcast
  - Idempotent rejoin so any host can absorb any client's connection
- **Routing and load balancing across hosts**
  - Sticky routing at the load balancer so connection state stays local where possible
  - DNS, Nginx upstreams, and HAProxy backend checks for real-time traffic
  - Health checks that reflect real-time readiness (accepting upgrades, broker reachable)
- **Operating a multi-host PM2 fleet**
  - Uniform ecosystem files and deployment automation across hosts
  - `pm2 deploy` for fleet rollout and rollback
  - Coordinated drains across hosts to avoid a full-fleet disconnect window
- **Hands-on Lab**: Deploy a two-host Socket.IO fleet behind Nginx with sticky routing and the Redis adapter, verify cross-host broadcast, and reload one host while the other carries the traffic

### Module 9: Observability and SLOs for Real-Time Systems (Week 9)

- **The real-time metrics that matter**
  - Connection counts: total, per worker, per namespace; churn rate (connect/disconnect per second)
  - Message rates and fan-out ratios: one inbound message → N outbound deliveries
  - Latency percentiles: p50, p95, and p99 for message round-trips and connect time
- **Instrumenting with @pm2/io**
  - Custom gauges for live connections and buffer depths
  - Counters for messages in/out and disconnects; meters for rates
  - Histograms for round-trip latency and connect duration
  - Exposing metrics to Prometheus and dashboards
- **SLOs for real-time behavior**
  - Availability of the connection path, not just the HTTP endpoint
  - Latency budgets: p95 message delivery, p95 connect time
  - Error budgets driven by dropped-message and forced-disconnect rates
- **Correlating PM2 process state with connection health**
  - `pm2 monit`, `pm2 prettylist`, and process restarts as an event stream
  - Restart-rate alerting and crash-loop detection from `pm2 jlist`
  - Structured JSON logs with connection lifecycle events (connect, disconnect, drain)
- **Hands-on Lab**: Instrument a chat service with @pm2/io connection and latency metrics, push them to Prometheus, define an SLO with an error budget, and trigger a reload storm to watch the budget burn

### Module 10: Real-Time Development Workflows (Week 10)

- **Developing socket services with PM2 watch mode**
  - `--watch` with `ignore_watch` for node_modules and dist directories
  - How watch-mode restarts differ from production reloads: connections drop locally
  - Hot reload patterns for the client-side dev experience
- **Debugging long-lived connections**
  - Inspector integration with PM2 and attach-based debugging of a live socket service
  - Reproducing connection issues locally with many simulated clients
- **Testing real-time services**
  - Unit and integration tests with `socket.io-client` against a real PM2-managed instance
  - Conformance testing WebSocket implementations with the Autobahn test suite
  - Load-testing with connection generators (Artillery, custom ws clients) in CI
- **Environment parity**
  - Shared ecosystem configuration across dev, staging, and production
  - The same transport, proxy, and TLS configuration in every environment
  - Containers for local infrastructure (Redis, broker) via Docker Compose with `pm2-runtime`
- **Hands-on Lab**: Build a watch-mode dev setup for a socket service, write integration tests that connect real clients, and run a connection load test locally against the PM2-managed service

### Module 11: Security Hardening for Real-Time Services (Week 11)

- **Securing the transport**
  - WSS/TLS termination: at the load balancer or in the application
  - Certificate rotation without dropping connections: graceful rebinding
  - Protocol-level risks: unvalidated origins, cross-site WebSocket hijacking
- **Authenticating connections**
  - Authenticating the HTTP upgrade before the socket opens
  - Token-based auth in query strings versus cookies versus subprotocols (and their trade-offs)
  - Re-authenticating on reconnect and on room join
- **Authorization and abuse control**
  - Room-level access control and presence leakage prevention
  - Rate limiting per connection and per user: message floods and join floods
  - Input validation on every message: payload size caps and schema checks
- **Hardening the process-manager layer**
  - Running the PM2 daemon under a least-privilege service account
  - Protecting the `.pm2` home directory and IPC socket from other users
  - Keeping secrets out of ecosystem files and connection URLs
- **Hands-on Lab**: Harden a chat service end-to-end: TLS termination, origin validation, token auth on upgrade, per-user rate limits, and a least-privilege PM2 daemon; then attempt hijacking, flood, and join-spam attacks against it

### Module 12: Capstone — The Self-Healing Real-Time Platform (Week 12)

- **Capstone scope**: design, build, and operate a complete real-time platform — a collaborative presence application with live cursors, rooms, and activity feeds — managed entirely by PM2
- **Architecture requirements**
  - Cluster mode with sticky sessions, Redis-backed broadcast and presence
  - Zero-downtime reloads with drains, jittered client reconnect, and reconnect state restoration
  - Multi-host deployment option with uniform ecosystem files and fleet-wide rollout
- **Operational requirements**
  - @pm2/io dashboards for connections, latencies, and buffer depths
  - An SLO with an error budget and alerting on budget burn
  - A chaos drill: kill workers, reload mid-traffic, cut a host, and prove the platform recovers
- **Deliverables**: repository with the platform and ecosystem files, the load-test harness, the monitoring stack, and a written runbook documenting every failure drill and its outcome
- **Presentation**: defend the architecture, show the measured SLOs, and explain each failure drill result

## Final Project

Learners build a production-shaped real-time collaboration platform and operate it under PM2. The project must include a clustered Socket.IO service with sticky-session routing and a Redis adapter so rooms and presence survive across workers and hosts; a graceful shutdown and drain implementation so `pm2 reload` completes without measurable message loss; a client library with jittered exponential backoff that restores rooms and state after every disconnect; an SSE feed component for activity streams; an @pm2/io observability layer that tracks live connections, message fan-out, and round-trip latency percentiles; and a documented SLO with an error budget for p95 connect time and message delivery.

Learners must also run and document three failure drills: a mid-traffic `pm2 reload` under 5,000+ concurrent connections, a host-level cut on a multi-host deployment, and a reconnect storm after a full fleet restart — each with before/after metrics proving the platform recovered within its error budget. The final submission is the full repository, the load-test and drill scripts, the monitoring dashboards, and a runbook that a new operator can follow to deploy, scale, and recover the platform.

## Assessment Criteria

- **Assignments**: Weekly hands-on labs are assessed on correctness of the running service (connections survive restarts, broadcasts reach all members, metrics are real), the quality of the written analysis of observed behavior, and the completeness of the code relative to the module's objectives. Lab 7's storm drill and Lab 9's SLO definition are graded with extra weight because they demonstrate the two hardest skills in the course: resilience engineering and measurable reliability.
- **Final Project**: The capstone is validated against the architecture requirements (cluster with sticky sessions, Redis-backed state, drain-based reloads, reconnect restoration), the operational requirements (real @pm2/io dashboards, a defended SLO, three executed and documented failure drills), and the quality of the runbook. A project that cannot complete a mid-traffic reload within its error budget, or whose metrics are not reproducible by the evaluator, does not pass.

## References

- [PM2 official documentation](https://pm2.keymetrics.io/docs/usage/quick-start/) — process management, cluster mode, reload, and ecosystem file reference
- [PM2 programmatic API](https://pm2.keymetrics.io/docs/usage/pm2-api/) — the pm2 npm module and its launchBus event stream
- [Socket.IO documentation](https://socket.io/docs/) — rooms, namespaces, the Redis adapter, and client reconnection
- [Socket.IO Redis adapter](https://socket.io/docs/v4/redis-adapter/) — cross-worker and cross-host broadcast
- [ws WebSocket library](https://github.com/websockets/ws) — minimal WebSocket servers and the Autobahn test suite integration
- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) — event-stream format, reconnection, and `Last-Event-ID` replay
- [@pm2/io documentation](https://github.com/keymetrics/pm2-io-apm) — custom metrics, gauges, counters, and histograms
- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) — reconnect storm avoidance patterns

---
title: "Go Distributed Systems Engineering Syllabus"
description: "A comprehensive 12-week advanced curriculum for experienced Go developers covering distributed systems theory, Raft consensus, distributed coordination with etcd, replication and partitioning, sagas and the outbox pattern, event streaming, service discovery, fault tolerance, observability, and secure distributed application design."
category: "backend"
technology: "golang"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Go Distributed Systems Engineering Syllabus

## Overview

This 12-week advanced syllabus is designed for experienced Go developers who can already build production web services and want to master the distributed systems layer underneath them. Go is the language of the cloud-native era — etcd, Kubernetes, Consul, and CockroachDB are all written in it — because its goroutines, channels, and static binaries make distributed coordination practical. This course teaches the theory and practice of building systems that span multiple machines: consensus with Raft, coordination with etcd, quorum-based replication, consistent hashing and partitioning, distributed transactions via sagas and the outbox pattern, event streaming, service discovery, resilience patterns such as circuit breakers and bulkheads, distributed tracing, and zero-trust security with mTLS.

Each module pairs fundamental theory with hands-on labs that require writing, running, and breaking real Go distributed programs. The course culminates in a capstone project where learners build a replicated, fault-tolerant key-value store or a small event-driven microservice platform and validate it with chaos experiments.

By the end of this course, learners will be able to reason precisely about consistency, availability, and partition tolerance; implement or integrate consensus and coordination primitives; design replication and partitioning strategies that match their data access patterns; make distributed transactions safe with sagas and outbox tables; and operate these systems with tracing, structured logs, and chaos testing.

## Curriculum

### Module 1: Distributed Systems Foundations (Week 1)

- **Why distributed systems are hard**
  - The fallacies of distributed computing and which ones Go projects routinely violate
  - Partial failure as the default, not the exception: machines crash, networks partition, clocks skew
  - Network reliability: packets can be dropped, duplicated, reordered, or delayed
- **Consistency, availability, and partitions**
  - The CAP theorem (Brewer): what it actually claims and what it does not
  - CP vs AP trade-offs in real systems (etcd is CP, Dynamo-style stores are AP)
  - Dynamic consistency: linearizability, sequential consistency, causal consistency, eventual consistency
- **Time and ordering in distributed systems**
  - Why wall clocks lie: clock skew, NTP, and Google's TrueTime approach
  - Lamport clocks and causality tracking with vector clocks
  - Total order vs partial order and why Kafka partitions give total order per key
- **Hands-on Lab**: Run a two-node Go service pair over `net.Pipe`-style connections, induce reordering and duplication with a fault-injecting transport, and observe the effects on a naive counter

### Module 2: Remote Communication and RPC in Go (Week 2)

- **Designing service boundaries**
  - When a function call should become an RPC and when it should not
  - API contracts: versioning, backward compatibility, and schema evolution
  - Idempotency keys: making retry-safe operations from the start
- **RPC frameworks and protocols**
  - `net/rpc`, gRPC, and ConnectRPC: strengths and trade-offs for distributed systems
  - Streaming RPC variants (server, client, bidirectional) and when each fits
  - HTTP/2 multiplexing and connection reuse with gRPC
- **Serialization and performance**
  - JSON vs protobuf vs messagepack: schema, size, and CPU trade-offs
  - Handling unknown fields and forward compatibility
  - Compression at the transport layer vs the message layer
- **Deadlines and context propagation**
  - Propagating `context.Context` deadlines and cancellation across RPC boundaries
  - The `grpc-go` `WithTimeout` pattern and why deadlines prevent cascading failure
- **Hands-on Lab**: Build a three-service chain with gRPC, propagate a 500 ms deadline from the caller, and verify the whole chain cancels when the deadline fires

### Module 3: Consensus and the Raft Algorithm (Week 3)

- **The consensus problem**
  - Why leader election and replicated log agreement need a protocol, not a strategy
  - FLP impossibility and what it means for practical systems
  - Paxos in one paragraph (why Raft exists)
- **Raft fundamentals**
  - Server states: leader, follower, candidate, and the timeouts that drive transitions
  - Term numbers and randomized election timeouts
  - Log entries, commit indices, and the leader's append-entries heartbeat
- **Raft safety properties**
  - Election safety and the leader completeness property
  - Log matching, log entries only from the current term
  - The role of quorums: `(n/2 + 1)` and what happens below it
- **Raft in Go**
  - Reading `etcd/raft` and `hashicorp/raft`: which abstractions each exposes
  - The `hashicorp/raft` FSM interface: `Apply`, `Snapshot`, `Restore`
  - Integrating a Raft library into a simple replicated service
- **Hands-on Lab**: Run a three-node `hashicorp/raft` cluster locally, kill the leader, watch a new leader get elected, and verify the replicated log converges

### Module 4: Distributed Coordination with etcd (Week 4)

- **The coordination toolkit**
  - Distributed locks, leases, leader election, and why they all need consensus underneath
  - etcd as the canonical Go coordination store
- **Leases and TTL**
  - Creating leases, granting TTLs, and renewing them inside a heartbeat loop
  - What happens to lease-held keys when a client dies
- **Leader election patterns**
  - `clientv3/concurrency` `NewSession` + `NewElection`: the campaign/proclaim pattern
  - Handling leadership change: state handoff and graceful demotion
  - Comparing etcd leader election to Raft's internal election (different problems!)
- **Distributed locks done right**
  - The `clientv3/concurrency` mutex and its quorum-based guarantee
  - Lock holder identification, fencing tokens, and why locks alone are not enough
- **Service discovery with etcd**
  - Registering instances under a prefix and watching for changes
  - The `watch` API, revision numbers, and avoiding missed updates
- **Hands-on Lab**: Build a failover worker: two Go workers campaign for leadership in etcd; when the leader dies, the follower must take over within one lease period

### Module 5: Replication and Partitioning (Week 5)

- **Replication strategies**
  - Single-leader (primary-secondary), multi-leader, and leaderless replication
  - Synchronous vs asynchronous replication and the durability/availability trade-off
  - Read-your-writes and monotonic read consistency for async followers
- **Quorum systems**
  - Quorum reads and writes with version numbers: `W + R > N`
  - Read repair, anti-entropy, and hinted handoff
  - The `Raft`-flavored quorum vs Dynamo-style sloppy quorums
- **Partitioning data**
  - Range partitioning vs hash partitioning and hotspot behavior
  - Consistent hashing with virtual nodes and why rebalancing stays small
  - Secondary indexes across partitions: scatter-gather
- **Sticky sessions and request routing**
  - Making a sharded Go service route requests to the right shard
  - Shard migration on membership change without downtime
- **Hands-on Lab**: Implement consistent hashing in Go with virtual nodes, add and remove nodes, and measure how few keys move on each membership change

### Module 6: Distributed Transactions, Sagas, and the Outbox Pattern (Week 6)

- **Why ACID does not span services**
  - Local transactions vs global transactions and the 2PC problem
  - When 2PC is acceptable (small, trusted, co-located) and when it is not
- **Saga orchestration and choreography**
  - Orchestrated sagas: a coordinator calling compensating actions
  - Choreographed sagas: services reacting to events and emitting compensations
  - Compensating transaction design: what happens when compensation itself fails
- **The outbox pattern**
  - Writing the business row and the outbox row in one local transaction
  - A Go relay worker polling the outbox and publishing events
  - Exactly-once-ish delivery: at-least-once + idempotent consumers
- **Idempotency in practice**
  - Idempotency keys, dedupe tables, and storing processed event IDs
  - Natural idempotency: `INSERT ... ON CONFLICT DO NOTHING` for event consumers
- **Hands-on Lab**: Build an order service + payment service pair where order creation uses a transactional outbox, a relay publishes the event, and payment consumes it idempotently with a dedupe table

### Module 7: Event Streaming and Messaging (Week 7)

- **Message brokers vs event streams**
  - Queues (NATS JetStream, RabbitMQ) vs log-based streams (Kafka, Redpanda)
  - At-least-once vs at-most-once vs exactly-once semantics and what each requires
  - Consumer groups, offsets, and replay: the power of the log
- **Streaming patterns in Go**
  - Kafka/Redpanda with `franz-go` or `segmentio/kafka-go`: producer and consumer APIs
  - NATS JetStream for lightweight durable queues with `nats.go`
  - Choosing between Kafka-style partitioning and NATS subjects
- **Event sourcing and CQRS**
  - Events as the source of truth; state as a projection
  - Rebuilding projections, event versioning, and migration
  - When event sourcing pays off and when it is overkill
- **Backpressure and flow control**
  - Bounded consumer concurrency and per-partition processing order
  - Dead-letter queues and poison messages
- **Hands-on Lab**: Stream a feed of telemetry events through Redpanda (or NATS JetStream), process them with a consumer group, and demonstrate replay from a committed offset after a crash

### Module 8: Service Discovery and Load Balancing (Week 8)

- **From hard-coded addresses to discovery**
  - DNS round-robin, SRV records, and why fixed addresses break in containers
  - Registry-based discovery: Consul, etcd, and Kubernetes native DNS
  - Client-side vs server-side load balancing
- **Consul for Go services**
  - Registering a service with health checks via the Consul API
  - The `hashicorp/consul/api` watch patterns for topology changes
- **gRPC load balancing**
  - `grpc-go` `WithDefaultServiceConfig` with `round_robin` and `pick_first`
  - xDS-based balancing with `grpc-go` and Envoy
- **Health checks and readiness**
  - Liveness vs readiness semantics and what each load balancer does with them
- **Hands-on Lab**: Register two instances of a Go HTTP service in Consul, build a Go client that watches service changes, and fail over by killing one instance

### Module 9: Fault Tolerance and Resilience (Week 9)

- **Resilience patterns**
  - Timeouts, retries with exponential backoff and jitter, and the retry storm problem
  - Circuit breakers: closed, open, half-open states and Go's `sony/gobreaker`
  - Bulkheads: isolating failure domains with per-dependency concurrency limits
- **Backoff and jitter strategies**
  - Full jitter vs equal jitter vs decorrelated jitter and their client-load profiles
  - Bounded retries with overall deadline budgets
- **Error propagation and graceful degradation**
  - Fallbacks, stale-cache serving, and per-request degradation
  - Fail-fast vs fail-soft policy decisions per dependency
- **Chaos testing**
  - Injecting latency, packet loss, and process failure in staging with a Go fault-injection proxy
  - The game day runbook: what to test before relying on a pattern
- **Hands-on Lab**: Wrap a flaky dependency in `gobreaker` + retry with full jitter, generate synthetic failures, and chart recovery behavior under load

### Module 10: Observability for Distributed Systems (Week 10)

- **The three pillars**
  - Structured logs, metrics, and distributed traces — and what each can and cannot tell you
  - Correlation IDs propagated through every service boundary
- **Distributed tracing**
  - OpenTelemetry in Go: `go.opentelemetry.io/otel` tracer setup and span lifecycle
  - Propagating trace context with gRPC interceptors and HTTP middleware
  - Sampling strategies: head-based vs tail-based sampling for high-volume systems
- **Metrics that matter**
  - RED (rate, errors, duration) and USE (utilization, saturation, errors) methodologies
  - `prometheus/client_golang` histograms, summaries, and exemplar support
  - Metric cardinality traps in Go services
- **Structured logging**
  - `log/slog` with JSON output and trace IDs in every record
  - Log volume control: sampling, levels, and audit-preserved events
- **Hands-on Lab**: Instrument the Module 2 three-service chain with OpenTelemetry, export traces to a local collector, and use correlation IDs to trace one request across all three services

### Module 11: Security for Distributed Systems (Week 11)

- **Threat modeling for services**
  - Trust boundaries between services and what crosses them
  - The default-deny posture: no service trusts another implicitly
- **mTLS and service identity**
  - Mutual TLS: X.509 client certificates for every service pair
  - Certificate issuance with SPIRE or cert-manager and short-lived certificates
  - Implementing mTLS with Go's `crypto/tls` `ClientAuth: tls.RequireAndVerifyClientCert`
- **Authentication and authorization**
  - Service-to-service auth: signed JWTs, SPIFFE IDs, or API keys
  - Scoped authorization: least privilege between services, not just for users
- **Secrets management**
  - Never shipping secrets in binaries or env files for production
  - Vault or cloud KMS integration from Go, with secret rotation
- **Data protection**
  - Encryption in transit (always mTLS/TLS) and encryption at rest
  - Protecting sensitive payloads in logs and traces (redaction)
- **Hands-on Lab**: Generate a CA and client/server certificates, enforce mTLS between two Go services, and verify that a client without a signed certificate is rejected

### Module 12: Capstone Project (Week 12)

- Build a **replicated, fault-tolerant distributed key-value store** in Go, or a **small event-driven microservice platform**, and validate it under failure
- Must demonstrate at least five of the following: consensus via a Raft library, etcd-based leader election, quorum or consistent-hash partitioning, transactional outbox, event streaming with replay, service discovery, circuit breakers, distributed tracing, and mTLS
- Run a controlled chaos experiment: kill a node, partition a network, or inject latency, and prove the system recovers within a declared SLO
- Write an operations runbook documenting failure modes, recovery steps, and monitoring signals

## Final Project

Learners will design, build, and operate a distributed Go system that survives real failures, with every architectural decision justified against the theory from the course.

- **Pick one primary system**:
  - **Replicated key-value store**: a `hashicorp/raft`-backed CP store with an HTTP/gRPC API, a multi-node cluster, and a quorum-based consistency guarantee, validated by killing a leader mid-write
  - **Event-driven order platform**: two or three services (order, payment, inventory) connected by a message stream, a transactional outbox for order creation, idempotent consumers, and a saga that compensates when payment fails
- **Required evidence**:
  - A README architecture document: consistency model, replication strategy, failure assumptions, and the CAP trade-offs the design makes
  - A chaos test report: at least three injected failures (node kill, network partition, slow dependency) with observed recovery timelines
  - Distributed tracing showing one end-to-end request across all services
  - A security section: how services authenticate to each other and how secrets are stored
- **Presentation**: a 15-minute walkthrough explaining what breaks, how the system detects it, and how it recovers

## Assessment Criteria

- **Weekly Labs (30%)**
  - 10 graded labs across Weeks 1-11 (Modules 1-10), each producing a working Go program plus a one-page write-up of the observed behavior
  - Graded on correctness of the distributed behavior, not just code style — labs must demonstrate the failure/consistency property under test
  - Late submissions penalized 10% per day

- **Quizzes (20%)**
  - 4 quizzes at the end of Weeks 3, 6, 9, and 11
  - Conceptual questions on CAP, Raft safety, quorums, sagas, and resilience patterns
  - Learners must be able to trace through a failure scenario and predict the system's behavior
  - Minimum 70% pass rate required to proceed to the capstone

- **Capstone Project (40%)**
  - Architecture quality: consistency model, partitioning, and failure assumptions clearly stated (10%)
  - Correctness under chaos: the system satisfies its declared SLO during injected failures (15%)
  - Engineering quality: code organization, tests, and observability integration (10%)
  - Runbook and final presentation quality (5%)

- **Participation and Code Reviews (10%)**
  - Peer review of two classmates' capstone designs before implementation
  - Constructive critique of failure-mode reasoning and consistency choices
  - Attendance and lab-discussion participation

## References

- [Designing Data-Intensive Applications (Martin Kleppmann)](https://dataintensive.net/) — The authoritative book on replication, partitioning, transactions, and consistency
- [The Raft Consensus Algorithm](https://raft.github.io/) — The Raft paper, visualizations, and reference implementations
- [hashicorp/raft](https://github.com/hashicorp/raft) — Production Raft implementation in Go used by Consul and Nomad
- [etcd documentation](https://etcd.io/docs/) — Official docs for etcd, leases, `clientv3/concurrency`, and the watch API
- [etcd clientv3 concurrency package](https://pkg.go.dev/go.etcd.io/etcd/client/v3/concurrency) — `Session`, `Election`, and `Mutex` primitives
- [gRPC Go documentation](https://grpc.io/docs/languages/go/) — The official gRPC Go quickstart and API reference
- [franz-go](https://github.com/twmb/franz-go) — Fast, schema-aware Kafka client for Go
- [nats.go](https://github.com/nats-io/nats.go) — Official NATS and JetStream client for Go
- [sony/gobreaker](https://github.com/sony/gobreaker) — Circuit breaker implementation for Go
- [OpenTelemetry Go](https://opentelemetry.io/docs/languages/go/) — Official OTel Go SDK and instrumentation docs
- [log/slog](https://pkg.go.dev/log/slog) — The Go standard library structured logging package
- [prometheus/client_golang](https://github.com/prometheus/client_golang) — Prometheus metrics client for Go
- [Go crypto/tls](https://pkg.go.dev/crypto/tls) — TLS and mTLS configuration in the standard library
- [Consul API for Go](https://pkg.go.dev/github.com/hashicorp/consul/api) — Service registration, discovery, and health checking
- [SPIFFE and SPIRE](https://spiffe.io/) — Standard for service identity in production distributed systems

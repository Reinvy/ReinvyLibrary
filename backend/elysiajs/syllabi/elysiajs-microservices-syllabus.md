---
title: "Elysia.js Microservices Syllabus"
description: "A six-module course on decomposing an Elysia.js monolith into services: boundaries, messaging, gateway, observability, deployment, and testing."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Elysia.js Microservices Syllabus

## Overview

This course turns a working Elysia.js application into a small, operable set of services. It is deliberately not a tour of every distributed-systems pattern: the scope is the six decisions that decide whether a split succeeds — where the boundaries go, how services talk, what sits in front, how you see inside, how you ship, and how you prove it still works.

The structure follows the order of failure. Teams usually break boundaries first, then discover they cannot trace a request, then discover their deploy pipeline assumes one artifact. Each module therefore ends with an artifact you keep: a boundary map, a message contract, a gateway config, a dashboard, a pipeline, and a test suite.

Six modules, roughly three weeks each at 8–10 hours per week. Every module assumes Bun and Elysia.js; Docker and a container registry are used from Module 5 onward.

## Curriculum

### Module 1: Service Decomposition and Boundaries

- **From modules to services**
  - Bounded contexts, not folder names: what actually changes together
  - The cost curve of a split — network calls, partial failure, duplicated data
- **Finding seams in an Elysia codebase**
  - Mapping plugin dependencies with `dependsOn` and service names
  - Identifying chatty boundaries by measuring call counts per request
- **Data ownership**
  - One writer per table; shared-database anti-pattern and its symptoms
  - Choosing between a shared schema, per-service schema, and read models
- **Contract-first interfaces**
  - TypeBox schemas as the single source of truth between services
  - Versioning rules: additive changes only, no silent field reuse
- **Deliverable**: a boundary map with owners, data ownership table, and a written decision record for the first extraction.

### Module 2: Messaging and Event Contracts

- **Synchronous vs asynchronous**
  - When a request must wait, and when it must not
  - Timeout budgets and the cascade problem
- **Message design**
  - Events (facts) versus commands (requests); naming in past tense
  - Envelope fields: `id`, `type`, `occurredAt`, `schemaVersion`, `traceId`
- **Delivery semantics**
  - At-least-once reality, idempotency keys, and dedupe tables
  - Outbox pattern: writing the event in the same transaction as the state change
- **Broker options**
  - NATS JetStream, Redis Streams, RabbitMQ — trade-offs for a small team
- **Failure handling**
  - Retries with backoff, dead-letter queues, and replay procedures
- **Deliverable**: two event contracts, an outbox implementation, and a poison-message runbook.

### Module 3: API Gateway and Edge Concerns

- **Gateway responsibilities**
  - Routing, auth termination, rate limiting, request shaping
  - What must never live in the gateway (business rules)
- **Implementation with Elysia**
  - Mounting a gateway plugin, forwarding headers, propagating trace context
  - Per-route upstream timeouts and circuit breaking
- **Authentication at the edge**
  - JWT verification once, identity headers downstream, trust boundaries
  - Token scopes mapped to routes rather than checked in every service
- **Compatibility**
  - Backward-compatible response shaping while services split
  - Deprecation headers and a sunset policy
- **Deliverable**: a gateway with three upstreams, per-route timeouts, and a load-shedding policy.

### Module 4: Observability

- **Structured logs**
  - JSON logs with `service`, `requestId`, `traceId`, `tenant`
  - Log levels that mean something during an incident
- **Metrics**
  - RED (rate, errors, duration) per route and per dependency
  - Saturation signals: event loop lag, queue depth, connection counts
- **Tracing**
  - OpenTelemetry setup in Bun, context propagation across HTTP and messages
  - Reading a trace to find the slow hop, not the slow service
- **Health and readiness**
  - Liveness versus readiness; why a failing dependency should not restart a pod
- **Deliverable**: one dashboard per service plus a cross-service trace of a single checkout.

### Module 5: Deployment and Runtime Operations

- **Packaging**
  - Building a Bun binary or a slim image; reproducible installs with a lockfile
- **Environments and configuration**
  - Twelve-factor config, secret injection, per-environment schema validation
- **Rollouts**
  - Graceful shutdown: stop accepting, drain sockets, flush the outbox
  - Blue-green and canary with health gates; rollback that does not need a rebuild
- **Scaling**
  - Stateless services, sticky sessions for WebSockets, broker-based fan-out
- **Deliverable**: CI pipeline producing signed images and a rollout plan with drain timings.

### Module 6: Testing Distributed Behavior

- **Test pyramid for services**
  - Unit tests on domain logic, contract tests at boundaries, few end-to-end paths
- **Consumer-driven contracts**
  - Pact-style checks so an upstream change fails before deployment
- **Integration harness**
  - `docker compose` with broker and databases; per-test isolation
  - Simulating partial failure: timeouts, 503s, duplicate deliveries
- **Load and chaos**
  - Baseline load test per service, then a dependency-kill experiment
- **Deliverable**: contract tests in CI, an integration harness, and a documented failure-injection result.

## Final Project

Build **OrderFlow**, a three-service system on Elysia.js: `orders` (write model and outbox), `inventory` (stock reservations, event consumer), and `gateway` (auth, routing, rate limits). Requirements:

- Orders publishes `OrderPlaced`; inventory consumes it idempotently and emits `StockReserved` or `StockRejected`.
- The gateway authenticates once and forwards identity; no service parses the raw token.
- Every request carries a trace id from the gateway to the consumer.
- A single command starts the stack locally; one pipeline ships all three services.
- Killing the inventory service must not lose an order — it is replayed from the outbox when the consumer returns.

Deliver a repository, a short architecture note explaining each boundary, and a demo of the inventory outage and recovery.

## Assessment Criteria

- **Module deliverables (45%)**: six artifacts, graded on completeness and on whether the decision records explain trade-offs rather than restate patterns.
- **Contract quality (15%)**: schemas are versioned, events are past-tense facts, consumers tolerate unknown fields.
- **Operability (15%)**: dashboards answer "is it healthy?" in under a minute; shutdown drains cleanly with no dropped messages.
- **Final project (20%)**: the outage demo works, no order is lost or double-reserved, and the trace shows the full path.
- **Code review participation (5%)**: review comments that catch a boundary or contract problem, not style.

A passing project must survive an unannounced dependency kill during the demo. Anything that only works on a happy path is graded as incomplete, regardless of feature count.

## References

- Elysia.js documentation: plugins, lifecycle hooks, WebSockets, and validation.
- Bun documentation: HTTP server, `Bun.serve`, packaging, and test runner.
- OpenTelemetry specification: context propagation and semantic conventions.
- *Building Microservices* (Sam Newman) — decomposition and migration patterns.
- *Release It!* (Michael Nygard) — circuit breakers, timeouts, and stability patterns.
- *Enterprise Integration Patterns* (Hohpe & Woolf) — messaging routing and idempotency.
- NATS JetStream and Redis Streams documentation for delivery guarantees.

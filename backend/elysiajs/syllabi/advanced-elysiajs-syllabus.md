---
title: "Advanced Elysia.js Syllabus"
description: "A comprehensive 12-week advanced curriculum for experienced TypeScript developers covering Elysia.js type-level systems, Eden Treaty end-to-end type safety, the macro system, custom plugin development, performance engineering, observability, security hardening, and scaling to microservices."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced Elysia.js Syllabus

## Overview

This 12-week advanced syllabus is designed for experienced TypeScript developers who already build web APIs with Elysia.js and want to master the framework at the type level and at scale. The curriculum goes beyond writing routes and handlers to explore what makes Elysia.js unique: the compile-time type inference pipeline that turns your server into a typed contract, the Eden Treaty client that consumes that contract with zero code generation, the macro system that moves work from runtime to compile time, and the plugin architecture used to compose production-grade features.

Each module pairs deep conceptual foundations with hands-on labs. Learners will write custom macros, publish a reusable plugin, build a fully typed multi-service system with Eden Treaty, benchmark and optimize their services against measurable performance budgets, instrument them with OpenTelemetry, harden them against real attack patterns, and operate them under production load.

By the end of this course, learners will be able to design type-safe APIs where the compiler catches breaking changes before users do, build and publish plugins that integrate cleanly with Elysia's type system, identify and eliminate performance bottlenecks using profilers and load testing, implement observability and security hardening for high-traffic services, and decompose a monolith into a typed microservices architecture without losing end-to-end safety.

## Curriculum

### Module 1: Advanced TypeBox and Schema Design (Week 1)

- **The TypeBox type system in depth**
  - Beyond `t.Object()`: `t.Recursive()`, `t.Union()`, `t.Intersect()`, `t.DiscriminatedUnion()`
  - String formats and patterns: `t.String({ format: 'email' })`, custom formats
  - Generics and type parameterization: `t.Generic()`, `t.Type()`
  - Reference schemas with `$id` and `$defs` for reusable schema graphs
- **Custom TypeBox types**
  - Creating application-specific types with `Type.Unsafe()`
  - Custom validation logic and error messages
  - Integrating with Ajv custom keywords
- **Schema design for real APIs**
  - Discriminated unions for polymorphic payloads (payment methods, notification events)
  - Recursive schemas for tree structures (comments, categories, org charts)
  - Transform types for input normalization (`t.Transform()`)
- **Hands-on Lab**: Model a polymorphic event API (order.created, payment.failed, refund.issued) with a discriminated union and a self-referencing category tree, then validate both against runtime payloads

### Module 2: The Elysia Type Inference Pipeline (Week 2)

- **How Elysia derives types**
  - The `Elysia<...>` generic chain and how route definitions accumulate types
  - How `.state()`, `.decorate()`, `.derive()`, and `.resolve()` extend the type context
  - Where types come from in a handler: `context.body`, `context.query`, `context.params`, `context.store`
- **Type composition across plugins**
  - How plugin types merge into the parent instance
  - Scoped types and avoiding type leakage between plugins
  - Conditional types and the `as const` modifier on schemas
- **Debugging type-level problems**
  - Reading Elysia's generated type errors
  - Isolating type issues with minimal reproductions
  - Using `Elysia` type utilities to inspect inferred handler types
- **Hands-on Lab**: Build a typed middleware stack where authentication decorators, tenant context, and pagination metadata are all inferred correctly across a plugin boundary, and write a type-level test that fails when a route's response shape changes

### Module 3: Eden Treaty End-to-End Type Safety (Week 3)

- **How Eden Treaty works**
  - Inferring the full API contract from the server instance
  - The `treaty` client and its method chaining
  - Runtime vs compile-time guarantees: what Eden checks and what it cannot
- **Advanced Eden patterns**
  - Sharing types across a monorepo with workspace packages
  - Configuring headers, credentials, and custom fetch implementations
  - Typed file uploads and multipart requests through Eden
  - Typed WebSocket connections with `$ws`
- **Eden in the frontend**
  - Using Eden Treaty with React, Next.js, Svelte, and Vue clients
  - Server-side callers: BFF (backend-for-frontend) patterns
  - Handling API versioning and breaking changes in the shared contract
- **Hands-on Lab**: Set up a monorepo with a shared Elysia server package and a Next.js client; change a response schema and observe the compile error in the client, then introduce API versioning that both sides consume safely

### Module 4: The Macro System (Week 4)

- **What macros are**
  - Macros vs lifecycle hooks: when work happens
  - Inline macros and their arguments
  - How macros generate code at compile time
- **Building reusable macros**
  - Writing a macro that injects values into handlers
  - Composing macros with plugins
  - Macro restrictions and pitfalls (serialization, closures, dynamic values)
- **Performance implications**
  - Why compile-time work beats runtime checks
  - Measuring the difference: macro-based auth vs hook-based auth
  - When NOT to use a macro
- **Hands-on Lab**: Implement a `@UsePermission('admin')` macro that statically injects permission checks, then benchmark it against an equivalent `onBeforeHandle` hook implementation

### Module 5: Custom Plugin Development (Week 5)

- **Plugin anatomy**
  - What a plugin can contribute: routes, state, decorators, macros, hooks, schemas
  - The `plugin` pattern and `.use()` semantics
  - Plugin-local vs inherited context
- **Typed plugin options**
  - Designing a configuration object with TypeBox validation
  - Factory functions that return typed plugin instances
  - Preserving types when plugins are composed
- **Publishing and testing plugins**
  - Package structure, naming conventions, and peer dependencies
  - Testing plugins against a real Elysia instance
  - Documenting plugin APIs with generated OpenAPI
- **Hands-on Lab**: Build, test, and locally publish a reusable rate-limiter plugin with configurable storage backends (memory, Redis), typed options, and a macro for per-route limits

### Module 6: Advanced Lifecycle and Event Architecture (Week 6)

- **The hook lifecycle in depth**
  - The full pipeline: `onRequest` → `derive` → `resolve` → `beforeHandle` → handler → `afterHandle` → `mapResponse` → `onError` → `onResponse`
  - Lazy evaluation: `derive` vs `resolve` and when each runs
  - Local vs global hooks and hook ordering guarantees
- **Event-driven design inside a service**
  - Custom event buses with typed event payloads
  - Webhook dispatch with retries and idempotency keys
  - The transactional outbox pattern for reliable event publishing
- **Centralized error handling**
  - Building an error taxonomy with typed error classes
  - Mapping domain errors to HTTP responses consistently
  - Error tracking integration
- **Hands-on Lab**: Implement a webhook delivery system with an outbox table, retry with exponential backoff, and typed event contracts consumed by an internal event bus

### Module 7: Performance Engineering (Week 7)

- **Understanding Elysia's performance model**
  - Why Elysia benchmarks well: minimal abstraction, schema compilation, optimized path handling
  - Where overhead actually appears in real applications
- **Benchmarking methodology**
  - Load testing with autocannon, wrk, and k6
  - Designing fair benchmarks: warmup, percentiles, error rates
  - Profiling CPU and memory with Bun's profiler and `bun --profile`
- **Optimization techniques**
  - Route registration order and handler size
  - Avoiding unnecessary schema recompilation
  - Hot-path patterns: minimizing allocations, reusing buffers
  - Caching at the right layer: HTTP, application, database
- **Hands-on Lab**: Profile a sample API, identify the top three bottlenecks, apply targeted optimizations, and demonstrate before/after results against a p95 latency budget

### Module 8: Advanced Data Access and Caching (Week 8)

- **High-performance SQLite with Bun**
  - Prepared statements, WAL mode, and busy timeouts
  - Transactions, savepoints, and batch inserts
- **PostgreSQL at scale**
  - Connection pooling with PgBouncer and pg-pool
  - Query optimization, indexes, and `EXPLAIN ANALYZE`
  - Read replicas and read/write splitting
- **Caching architectures**
  - Redis caching layers: cache-aside, write-through, write-behind
  - Cache invalidation strategies and stampede protection
  - CQRS and materialized read models
- **Hands-on Lab**: Design a caching layer for a hot read endpoint, protect it against cache stampede with a single-flight pattern, and measure hit-ratio improvements under load

### Module 9: Observability at Scale (Week 9)

- **Structured logging**
  - Logging with pino and Bun's built-in logger
  - Correlation IDs across requests and services
  - Log levels, redaction, and log sampling
- **Tracing and metrics**
  - OpenTelemetry instrumentation for Elysia routes
  - Distributed traces across service boundaries
  - Prometheus metrics: request duration histograms, error rates, in-flight requests
- **Health and readiness**
  - Liveness and readiness probes for orchestrators
  - Dependency health checks (database, Redis, external APIs)
  - Graceful shutdown and draining
- **Hands-on Lab**: Instrument a multi-service demo with OpenTelemetry, export traces to a local collector, add Prometheus metrics, and verify a distributed trace spans both services

### Module 10: Security Hardening (Week 10)

- **Authentication and authorization in depth**
  - OAuth2 and OIDC flows with Elysia
  - Refresh token rotation and revocation
  - Fine-grained authorization policies beyond RBAC (ABAC)
- **Input and payload hardening**
  - Limits beyond TypeBox: body size caps, request timeouts, rate limiting
  - Protecting against DoS: slowloris, connection limits, backpressure
  - Prototype pollution and deserialization risks
- **Secrets and supply chain**
  - Managing secrets with Bun secrets and external vaults
  - Dependency auditing and lockfile hygiene
  - Signed releases and integrity verification
- **Hands-on Lab**: Harden a sample API against a scripted attack suite (oversized payloads, rapid-fire requests, malformed JSON), then verify rate limiting, payload caps, and audit logs all behave correctly

### Module 11: Microservices and Distributed Systems (Week 11)

- **Service decomposition with Elysia**
  - Identifying bounded contexts and service boundaries
  - The gateway pattern with typed upstream clients via Eden
  - Service-to-service authentication (mTLS, service tokens)
- **Messaging and queues**
  - Redis Streams, NATS, and RabbitMQ consumers in Bun
  - Idempotent consumers and exactly-once semantics
  - Retries, dead-letter queues, and backoff policies
- **Distributed consistency**
  - The saga pattern for multi-service transactions
  - The outbox pattern revisited at the service boundary
  - Distributed tracing across the full request path
- **Hands-on Lab**: Split a monolith into three services (orders, payments, inventory), connect them with Eden Treaty and a Redis Streams event backbone, and implement a saga that compensates a failed payment

### Module 12: Scaling and Production Operations (Week 12)

- **Horizontal scaling**
  - Stateless design and shared session stores
  - Load balancing strategies and sticky sessions
  - Autoscaling policies based on real metrics
- **Kubernetes deployment**
  - Containerizing Elysia services with multi-stage builds
  - Deployments, services, and horizontal pod autoscaling
  - Zero-downtime rolling updates and readiness gates
- **Reliability practices**
  - Capacity planning and load testing to a target SLO
  - Chaos engineering basics: killing pods, injecting latency
  - Postmortems, SLOs, and error budgets
- **Hands-on Lab**: Deploy the three-service system from Module 11 to a local Kubernetes cluster, configure autoscaling and readiness probes, then run a load test and a chaos drill (pod kill, latency injection) to verify recovery

## Final Project

Build a production-grade, type-safe e-commerce platform as a set of Elysia.js services. The project must include:

- A gateway service exposing the public API, with all schemas defined in TypeBox
- Three internal services (catalog, orders, payments) communicating over Eden Treaty with full end-to-end type safety
- At least one custom, published-quality plugin (auth, rate limiting, or audit logging) with typed options
- One reusable macro that moves a runtime check to compile time
- A typed webhook delivery system using the outbox pattern
- OpenTelemetry tracing and Prometheus metrics across all services
- A security hardening pass: rate limiting, payload caps, and OAuth2 or OIDC authentication
- A performance budget: p95 latency under 150ms at 500 RPS on the gateway, demonstrated with a load test report
- Kubernetes manifests with readiness probes, autoscaling, and zero-downtime rollout configuration

Deliverables: A GitHub repository with the full source code, a typed shared-contract package, load test results, tracing screenshots, and a runbook covering deployment, scaling, and incident response.

## Assessment Criteria

- **Assignments (40%)**
  - Weekly hands-on labs evaluated on correctness, type safety, and code quality
  - Type-level tests that enforce API contracts
  - Peer review of plugin and macro implementations
- **Final Project (50%)**
  - Correct end-to-end type safety across all services (compile-time verified)
  - Performance budget met with reproducible load test evidence
  - Observability: distributed traces and metrics present and useful
  - Security: authentication, rate limiting, and input hardening verified
  - Operational readiness: Kubernetes deployment works with autoscaling and graceful shutdown
- **Participation (10%)**
  - Engagement in design reviews and architecture discussions
  - Timely submission of labs and constructive feedback on peer work

## References

- [Elysia.js Official Documentation](https://elysiajs.com/)
- [Elysia.js Lifecycle Events](https://elysiajs.com/essential/lifecycle.html)
- [Elysia.js Macros](https://elysiajs.com/patterns/macro.html)
- [Elysia.js Plugins](https://elysiajs.com/plugins/overview.html)
- [Eden Treaty Documentation](https://elysiajs.com/eden/treaty.html)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [Bun Runtime Documentation](https://bun.sh/docs)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/)
- [k6 Load Testing](https://k6.io/docs/)

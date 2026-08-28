---
title: "Kotlin Backend Engineering Syllabus"
description: "A 12-week advanced curriculum for building production-grade server-side applications with Kotlin and Ktor, covering routing, persistence with Exposed, authentication, WebSockets, testing, observability, and deployment."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Kotlin Backend Engineering Syllabus

## Overview

This 12-week syllabus prepares developers to build production-grade backend services with Kotlin and Ktor. Where the Android Development Syllabus focuses on client-side applications and the Advanced Kotlin Syllabus explores language and compiler internals, this curriculum turns to the server: how to design REST and WebSocket APIs, persist data with Exposed, secure services with JWT and OAuth 2.0, process background work reliably, test services from the outside in, and ship them to production with Docker and Kubernetes. Each week alternates conceptual grounding with hands-on implementation, and the course culminates in a capstone project that combines every layer into a deployable multi-service platform. Learners should already write Kotlin fluently and be comfortable with coroutines, since server-side Kotlin leans heavily on structured concurrency.

## Curriculum

### Week 1: Server-Side Kotlin Foundations
- **Why Kotlin on the backend**: JVM maturity, multiple target deployment models, type-safe DSLs for routing and configuration
- **Project setup**: Gradle Kotlin DSL, application plugin, dependency management with version catalogs
- **Ktor embeddedServer**: Netty, CIO, and Jetty engines, engine selection criteria, port and host configuration
- **Application lifecycle**: `Application` module, `main` entry point, environment-based configuration loading
- **First endpoint**: routing DSL, `get`/`post` handlers, `call.respondText` versus `call.respond`
- **Practice**: Scaffold a Ktor service with two REST endpoints and structured logging on startup

### Week 2: Routing and HTTP Semantics
- **Routing DSL in depth**: nested routes, path parameters, query parameters, optional segments
- **Type-safe requests**: `call.receive<T>()`, content negotiation pipeline, malformed-body handling
- **Response modeling**: `call.respond`, status codes, headers, custom response types with `respond`
- **Resource design**: REST conventions, plural nouns, nested resources, idempotency considerations
- **Error mapping**: `StatusPages` plugin, typed exception-to-response mapping, problem+json payloads
- **Practice**: Build a CRUD API for a `products` resource with complete validation and error responses

### Week 3: Plugins, Interceptors, and Middleware
- **Plugin architecture**: install/configure patterns, built-in plugins versus custom plugins
- **CallLogging**: request/response logging, log levels, sensitive-header redaction
- **CORS and DefaultHeaders**: cross-origin policies, security headers (X-Content-Type-Options, HSTS)
- **Compression**: gzip/brotli negotiation, when compression hurts, per-route overrides
- **Custom interceptors**: `intercept` pipelines, request/response phase hooks, correlation ID propagation
- **Practice**: Implement a custom audit-logging plugin that records every mutating request with a correlation ID

### Week 4: Serialization, Validation, and API Contracts
- **kotlinx.serialization on the server**: `@Serializable` DTOs, `Json` configuration, naming strategies
- **Serialization modules**: `SerializersModule`, contextual serializers, polymorphic payloads
- **Validation strategies**: manual validation versus `ktor-server-request-validation`, error accumulation
- **API specification**: OpenAPI generation with Swagger UI, schema-first versus code-first trade-offs
- **Versioning**: URI versioning, header negotiation, backward-compatible field evolution
- **Practice**: Expose a versioned public API with an OpenAPI spec, strict validation, and stable error contracts

### Week 5: Data Persistence with Exposed
- **Exposed DSL**: `Table` definitions, column types, constraints, indexes
- **DAO vs DSL**: `SuspendedQueries` and the DAO layer, when each abstraction fits
- **Relationships**: one-to-many and many-to-many mappings, `join` queries, eager versus lazy loading
- **Batch operations**: bulk inserts, `upsert`, batch update performance
- **Connection pools**: HikariCP configuration, pool sizing, timeouts, read/write split preparations
- **Practice**: Model an e-commerce schema (users, orders, order items) with Exposed and write the key query paths

### Week 6: Migrations, Transactions, and Data Integrity
- **Schema migrations**: Flyway integration, versioned SQL migrations, repeatable migrations
- **Transaction management**: `newSuspendedTransaction`, isolation levels, rollback semantics
- **Optimistic locking**: version columns, `update` with expected version, conflict retries
- **Pagination and aggregation**: `limit`/`offset`, keyset pagination, `groupBy` and `having`
- **Full-text and JSON columns**: PostgreSQL JSONB with Exposed, `fts` queries
- **Practice**: Add Flyway migrations to the Week 5 schema and implement safe paginated listing with optimistic locking

### Week 7: Authentication and Authorization
- **Authentication providers**: basic, bearer, JWT, OAuth 2.0, session-based flows in Ktor
- **JWT in depth**: token structure, signing algorithms, issuer/audience validation, refresh tokens
- **Password handling**: Argon2id, salt management, timing-safe comparison
- **Authorization**: role-based access control, permission checks in routes, principal propagation
- **Multi-tenancy**: tenant isolation strategies, context propagation, row-level scoping
- **Practice**: Secure the product API with JWT authentication, refresh-token rotation, and role-based admin endpoints

### Week 8: WebSockets and Real-Time Communication
- **WebSocket fundamentals**: handshake, frames, ping/pong keepalive, backpressure
- **Ktor WebSockets**: `webSocket` route handler, `incoming`/`outgoing` channels, session lifecycle
- **Connection management**: session registry, heartbeats, graceful disconnect handling
- **Broadcasting**: fan-out to connected clients, per-room subscriptions, `ConcurrentHashMap` registries
- **Coroutine safety**: per-connection contexts, cancellation on close, resource cleanup
- **Practice**: Extend the platform with a chat or live-notification WebSocket endpoint with rooms and heartbeats

### Week 9: Background Processing and Message Queues
- **Coroutine-based scheduling**: `launch` in application scope, periodic tasks, graceful shutdown
- **Work queues with Redis**: list-based queues, reliable job claiming with `RPOPLPUSH` / Lua scripts
- **Kafka integration**: producer/consumer APIs, consumer groups, offset management, idempotent processing
- **Retry and dead-letter handling**: exponential backoff, retry budgets, DLQ consumers
- **Distributed locking**: Redlock alternatives, lease-based locks, fencing tokens
- **Practice**: Implement an order-processing pipeline that consumes a queue, handles failures, and retries with backoff

### Week 10: Testing Server-Side Kotlin
- **Test application**: `testApplication` harness, test routes, in-memory engine
- **Unit testing handlers**: `withTestApplication`, request builders, response assertions
- **Database testing**: Testcontainers for PostgreSQL, transactional rollback patterns
- **Mocking**: MockEngine for HTTP clients, fake repositories, boundary fakes
- **Property-based and load testing**: kotest property tests, k6 stress scenarios, latency assertions
- **Practice**: Write an integration suite that boots the full app with Testcontainers and covers the main API flows

### Week 11: Observability, CI/CD, and Deployment
- **Structured logging**: logback JSON encoder, request-scoped fields, correlation IDs end to end
- **Metrics**: Micrometer integration, JVM and HTTP metrics, custom business metrics
- **Tracing**: OpenTelemetry spans, trace propagation headers, exporter configuration
- **Health checks**: readiness versus liveness endpoints, dependency health aggregation
- **Deployment**: Docker multi-stage builds, Kubernetes manifests, secrets management, rolling updates
- **Practice**: Containerize the service, deploy it to a local Kubernetes cluster, and verify health checks and metrics

### Week 12: Capstone Project
- **Project scoping**: choose a real-world multi-service platform (e.g., a booking system, analytics service, or collaboration tool)
- **Architecture**: REST plus WebSocket APIs, Exposed persistence with migrations, JWT auth, background workers
- **Implementation**: build the complete service with tests, observability, and Docker/Kubernetes deployment
- **Validation**: load-test the API, review trace spans and metrics, document operational runbooks
- **Presentation**: deliver a design review covering API contracts, data model, failure handling, and scaling decisions

## Final Project

Learners build a **Production-Grade Kotlin Backend Platform** — a complete, deployable service that demonstrates every layer of the curriculum. A strong project combines: a versioned REST API with strict validation and OpenAPI documentation; a WebSocket channel for real-time updates; a normalized Exposed schema managed by Flyway migrations; JWT authentication with refresh-token rotation and role-based authorization; a Redis- or Kafka-backed background job pipeline with retries and dead-letter handling; a comprehensive test suite using Testcontainers and kotest property tests; and a Dockerized deployment with health checks, structured logs, and OpenTelemetry traces. The deliverable includes the full source code, an OpenAPI spec, a README documenting operational decisions, and a short deployment walkthrough.

## Assessment Criteria

- **Assignments**: Weekly hands-on exercises (CRUD APIs, plugins, migrations, auth flows, queue consumers) submitted as small repositories, graded on correctness, API design quality, and test coverage.
- **Quizzes**: Two short quizzes covering routing/plugin semantics, transaction isolation, JWT validation rules, and coroutine safety in server contexts.
- **Final Project**: Evaluated on architectural soundness (service boundaries, data modeling), API and security quality (validation, auth, error contracts), operational readiness (observability, health checks, packaging), and the clarity of the written design review.
- **Participation**: Code reviews of peer API designs in weeks 4 and 9, assessing constructive feedback quality.

## References

- [Ktor Documentation — Server](https://ktor.io/docs/server-create-a-new-project.html)
- [Kotlin Coroutines Guide](https://kotlinlang.org/docs/coroutines-guide.html)
- [JetBrains Exposed Documentation](https://www.jetbrains.com/help/exposed/getting-started.html)
- [Flyway Database Migrations](https://documentation.red-gate.com/flyway)
- [kotlinx.serialization Documentation](https://github.com/Kotlin/kotlinx.serialization)
- [Official Ktor JWT Authentication Samples](https://github.com/ktorio/ktor-documentation/tree/main/codeSnippets/snippets/auth-jwt)
- [OpenTelemetry Kotlin/Java Documentation](https://opentelemetry.io/docs/languages/java/)
- [Micrometer Metrics Documentation](https://micrometer.io/docs)
- [Testcontainers for Java/Kotlin](https://java.testcontainers.org/)
- [kotest Property Testing Guide](https://kotest.io/docs/proptest/property-based-testing.html)

---
title: "Advanced Laravel Architecture and Production Engineering Syllabus"
description: "A comprehensive 12-week advanced curriculum for experienced Laravel developers covering hexagonal and clean architecture, CQRS and event-driven design, service container internals, Eloquent performance engineering, multi-tenancy patterns, Redis caching at scale, Laravel Octane, observability with OpenTelemetry, security hardening against the OWASP Top 10, and advanced testing strategies."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced Laravel Architecture and Production Engineering Syllabus

## Overview

This 12-week advanced syllabus is designed for Laravel developers who already ship working applications and want to master the architecture and production engineering skills that separate senior engineers from the rest. The curriculum intentionally leaves behind "how to build CRUD" territory and moves into the hard problems: designing applications around hexagonal and clean architecture, modeling complex domains with CQRS and domain events, understanding the service container at the framework-internals level, extracting maximum performance from Eloquent at scale, implementing multi-tenancy safely, running Laravel on Octane, and operating the stack with real observability.

Each module pairs deep theory with hands-on labs that require refactoring real codebases, profiling query performance, instrumenting applications with OpenTelemetry, and load-testing Octane applications. The course culminates in a capstone project where learners build a production-grade multi-tenant SaaS platform that combines every technique studied across the twelve weeks.

By the end of this course, learners will be able to reason about Laravel's internals instead of treating the framework as a black box, defend architectural decisions with concrete trade-off analysis, eliminate performance problems with profile-driven evidence, secure applications against real attack classes, and operate services with measurable reliability.

## Curriculum

### Module 1: Advanced Architecture Patterns — Hexagonal and Clean Architecture (Week 1)

- **Why architecture matters at scale**
  - The difference between framework-centric and domain-centric design
  - How Laravel's MVC defaults couple business logic to the framework
  - When to introduce ports and adapters — and when not to
- **Hexagonal architecture in Laravel**
  - Ports (interfaces) and adapters (implementations) mapped onto Laravel conventions
  - Placing domain entities, value objects, and domain services in a `Domain` namespace
  - Infrastructure adapters for storage, mail, and HTTP in an `Infrastructure` namespace
  - Wiring adapters with service provider bindings
- **Clean architecture layers**
  - Entities, use cases, and interface adapters — the dependency rule
  - Use-case (action) classes as the unit of application logic
  - Frameworks and drivers as outer layers that depend inward
- **Hands-on Lab**: Refactor a controller-heavy Laravel app into hexagonal structure, extracting the core domain logic into use-case classes with interfaces

### Module 2: Service Container Internals and Dependency Injection Mastery (Week 2)

- **How the container really works**
  - Reflection-based autowiring, binding resolution, and contextual resolution order
  - `bind`, `singleton`, `scoped`, and `instance` — lifecycle semantics and when each is correct
  - Tagged bindings and `extend` for decorating services
- **Advanced resolution patterns**
  - Contextual bindings for different implementations per consuming class
  - Marking bindings with `when()->needs()->give()` and interface-to-implementation maps
  - Container events: `resolving`, `afterResolving`, and `rebinding` hooks
- **Facade internals and real-time facades**
  - How facades resolve the underlying instance from the container root
  - Real-time facades and when they clarify testability
  - The `app()` helper, `App::make`, and explicit resolution in long-running processes
- **Hands-on Lab**: Build a custom payment-provider abstraction with contextual bindings, tagged fallback providers, and a rebinding hook for cache invalidation

### Module 3: Eloquent Performance Engineering (Week 3)

- **Query analysis and indexing**
  - Reading `EXPLAIN` output and identifying full table scans, filesorts, and key misses
  - Composite index design for the most common query shapes
  - Covering indexes and index-only scans in MySQL and PostgreSQL
- **Eliminating N+1 at scale**
  - Nested and constrained eager loading, `loadMissing`, and `withCount`/`withSum`/`withExists`
  - Detecting N+1 in production with query logging and Telescope
  - The lazy-loading trap in serialized responses and queue jobs
- **Pagination strategies for large datasets**
  - Offset vs cursor pagination and the deep-pagination cost
  - `chunkById` for memory-safe bulk operations and the primary-key watermark pattern
  - Read/write splitting with separate database connections for reporting workloads
- **Hands-on Lab**: Profile a slow reporting query with `EXPLAIN`, design composite indexes, rewrite an N+1 controller, and convert a deep-offset paginator to cursor pagination

### Module 4: Event-Driven Design and Queue Internals (Week 4)

- **Domain events and the event lifecycle**
  - Distinguishing framework events from domain events
  - Raising events from aggregate roots and persisting them atomically
  - Event listeners, subscribers, and the `ShouldQueue` boundary
- **Queue internals beyond the basics**
  - How the queue worker loop polls, reserves, and retries jobs
  - Horizon architecture: supervisor processes, balancing strategies, and queue pruning
  - Unique jobs, throttled jobs, rate-limited jobs, and job middleware
  - Job batching, chains, and the `then`/`catch`/`finally` lifecycle
- **Reliable delivery patterns**
  - Idempotent job handlers for at-least-once semantics
  - Exactly-once illusions and deduplication keys
  - Dead-letter handling, retry backoff curves, and failed-job review workflows
- **Hands-on Lab**: Design a domain-event-driven inventory system with atomic event persistence, idempotent consumers, and a Horizon configuration tuned for mixed priority queues

### Module 5: CQRS and Read-Model Projections (Week 5)

- **CQRS fundamentals for Laravel teams**
  - Commands that mutate and queries that read — separate models
  - When full CQRS is justified versus when a service layer suffices
  - Command bus and query bus abstractions with Laravel's container
- **Read models and projections**
  - Denormalized read models fed by domain events
  - Materialized views in PostgreSQL and Redis hashes/sorted sets as read caches
  - Projection rebuilds, replay, and eventually-consistent data
- **Practical CQRS without ceremony**
  - Action-class commands with explicit validators and transactions
  - Query classes returning lightweight DTOs instead of Eloquent models
  - Keeping write-side business rules in the domain, not the controller
- **Hands-on Lab**: Introduce a read-model projection for a reporting screen, feed it with domain events, and implement a replay command that rebuilds the projection from the event log

### Module 6: Multi-Tenancy Patterns (Week 6)

- **Tenancy models and their trade-offs**
  - Single database with `tenant_id` scoping vs schema-per-tenant vs database-per-tenant
  - Cost, isolation, backup, and migration implications of each model
  - The hybrid "pooled databases" approach for growth
- **Tenant identification and resolution**
  - Subdomain and custom-domain identification middleware
  - Central and tenant connection resolution with dynamic database config
  - Caching tenant state and per-tenant cache prefixes
- **Scoping and isolation pitfalls**
  - Forgetting tenant scoping on queries, jobs, queued events, and scheduled commands
  - File storage isolation and per-tenant encryption keys
  - Cross-tenant data leaks in eager-loaded relations and serialized jobs
- **Hands-on Lab**: Build a subdomain-based multi-tenant app with tenant-scoped query scopes, per-tenant Redis prefixes, and a test suite that proves cross-tenant isolation

### Module 7: Distributed Caching and State at Scale (Week 7)

- **Cache architecture beyond `cache()->remember`**
  - Cache stampede protection with locks and early expiration
  - Cache tags, atomic locks, and the lock acquisition retry patterns
  - Per-tenant, per-user, and invalidation-aware cache keys
- **Redis data structures for application state**
  - Sorted sets for leaderboards and rate-limit accounting
  - Streams for lightweight event log and fan-out messaging
  - HyperLogLog for unique-count approximations
- **Distributed locks and concurrency control**
  - Atomic lock acquisition with `Cache::lock`
  - Avoiding split-brain with lock TTL and owner tokens
  - Re-entrant workflows: locking across queues and web requests
- **Hands-on Lab**: Eliminate a cache stampede on a hot dashboard endpoint using early expiration, implement a Redis-backed rate limiter with sorted sets, and protect a long-running job with a distributed lock

### Module 8: Laravel Octane and Long-Running Application Internals (Week 8)

- **Octane architecture**
  - Swoole and RoadRunner workers — what changes when PHP does not exit
  - The request lifecycle inside a persistent application
  - Why `config()`, `auth()`, and `session()` forget state between requests
- **Static state and singletons in persistent processes**
  - The stateful-property trap: objects holding request-scoped data
  - Container rebinds and `Sandbox` state reset behavior
  - Global state audit: `$_GLOBALS`, static properties, and long-lived closures
- **Octane production tuning**
  - Worker counts, max requests, and graceful reload strategies
  - Supervisord configuration for RoadRunner/Swoole managers
  - Load testing with `hey`/`wrk` and comparing throughput against PHP-FPM
- **Hands-on Lab**: Migrate an existing Laravel app to Octane, audit it for static state leaks with the `octane:reload` workflow, and produce a before/after load-test report

### Module 9: Observability — Logging, Metrics, and Tracing (Week 9)

- **Structured logging done right**
  - Contextual logging, log channels, and the `Log::withContext` API
  - Correlation IDs propagated from HTTP request to queued job
  - Log levels, sampling, and avoiding sensitive data in logs
- **Metrics and OpenTelemetry**
  - Instrumenting request duration, query counts, and queue depth with counters and histograms
  - OpenTelemetry tracing spans for HTTP, database, cache, and queue segments
  - Exporting to Prometheus, Jaeger, or Sentry Performance
- **Production debugging**
  - Telescope at scale: sampling, pruning, and what to exclude in production
  - Error tracking with Sentry/Flare and release tagging
  - Defining SLOs for latency and error rate, then alerting on burn rate
- **Hands-on Lab**: Add structured logging with correlation IDs, instrument a service with OpenTelemetry, export traces to Jaeger, and define an SLO plus alert for a booking API

### Module 10: Security Hardening Against the OWASP Top 10 (Week 10)

- **Attack classes mapped to Laravel**
  - SQL injection survivors: raw queries, DB::select, and `whereRaw` with user input
  - Mass assignment beyond `$fillable`: nested and dynamic properties
  - XSS vectors in Blade, rich text, and JSON APIs — CSP as the second line of defense
  - SSRF through URL-fetching features, file uploads, and server-side requests
- **Authentication and session security**
  - Sanctum token design: abilities, token expiry, and revocation at scale
  - Session fixation, cookie flags, and same-site policy
  - Rate limiting per user, per IP, and per route group
- **Data protection and secrets**
  - Encryption at rest with app key rotation, envelope encryption patterns
  - Signed URLs, signed routes, and tamper-proof webhook payloads
  - Secret management: environment injection, vault integration, and secret rotation
- **Hands-on Lab**: Security-audit a deliberately vulnerable Laravel app, fix each OWASP class, and verify fixes with an automated security test suite

### Module 11: Advanced Testing Strategies for Complex Systems (Week 11)

- **Test design at architecture level**
  - Unit testing domain logic without the framework vs feature testing through HTTP
  - Test doubles: fakes, mocks (Mockery), and spies for external adapters
  - Data providers, dataset-driven tests, and property-based thinking
- **Databases and factories at scale**
  - RefreshDatabase vs DatabaseTransactions and the parallel-testing trade-off
  - Factory states, sequences, and after-making hooks for realistic fixtures
  - Seeding strategies and test isolation in multi-tenancy
- **Browser and contract testing**
  - Dusk for critical user journeys and its CI headless setup
  - HTTP contract testing for third-party integrations
  - Mutation testing with Infection to assess suite quality
- **Hands-on Lab**: Restructure a feature-test-only suite into a layered test strategy, add Dusk coverage for the two critical journeys, and run Infection to find and kill surviving mutants

### Module 12: Capstone Project — Production-Grade Multi-Tenant SaaS Platform (Week 12)

- **Project brief**
  - Build a multi-tenant team collaboration platform with workspaces, projects, and reports
  - Requirements gather everything studied: hexagonal structure, CQRS read models, domain events, multi-tenancy, Redis caching, Octane deployment, OpenTelemetry instrumentation, and OWASP-hardened security
  - Architecture decision records documenting every major trade-off
- **Delivery milestones**
  - Week 12a: Domain model, use cases, and container wiring complete
  - Week 12b: Read models, event-driven integrations, and queue topology live
  - Week 12c: Observability, load testing, and security audit pass
  - Week 12d: Final presentation with performance and reliability evidence
- **Evaluation focus**
  - Architectural consistency, isolation guarantees, measurable performance budgets, and defense-in-depth security posture

## Final Project

**Multi-Tenant Team Collaboration Platform**: Learners design and build a production-grade SaaS application where independent organizations collaborate in isolated workspaces. Required elements:

- Hexagonal project structure with domain entities, use-case classes, and infrastructure adapters wired through the container.
- Multi-tenancy implemented with subdomain resolution, tenant-scoped query scopes, and per-tenant cache namespaces, proven by isolation tests.
- Event-driven integrations: domain events persisted atomically and consumed by idempotent queued listeners that feed denormalized read models.
- CQRS-style separation for the reporting area, with projections rebuilt by a replay command from the event log.
- Redis-backed caching with stampede protection and distributed locks for concurrency-sensitive operations.
- Deployment on Laravel Octane with Supervisord management and a load-test report documenting throughput and latency before and after tuning.
- OpenTelemetry instrumentation with metrics and traces exported to Prometheus/Jaeger, plus an SLO dashboard for error rate and latency.
- OWASP Top 10 hardening review covering mass assignment, SSRF, XSS/CSP, rate limiting, and secret handling.
- Comprehensive test suite: layered unit/feature tests, Dusk browser tests for critical journeys, and mutation testing results.

## Assessment Criteria

- **Weekly Labs (30%)**: Each module's hands-on lab is submitted as a pull request and evaluated for correctness, depth of analysis, and adherence to the architectural patterns taught.
- **Architecture Decision Records (15%)**: Learners document at least five significant trade-offs (tenancy model, CQRS boundary, caching strategy, queue topology, observability stack) with explicit alternatives and chosen rationale.
- **Capstone Project (40%)**: Evaluated on multi-tenant isolation guarantees, event-driven design quality, performance against stated budgets, security posture, and the completeness of the observability setup.
- **Code Review Participation (15%)**: Learners review peers' capstone pull requests, focusing on architectural consistency, security risks, and production-readiness concerns.

## References

- [Laravel Official Documentation](https://laravel.com/docs) — Container, queues, caching, Octane, and security references.
- [Laravel Octane Documentation](https://laravel.com/docs/octane) — Swoole/RoadRunner architecture and configuration.
- [OpenTelemetry PHP Documentation](https://opentelemetry.io/docs/languages/php/) — Tracing, metrics, and instrumentation guides.
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — The vulnerability classes covered in Module 10.
- [Martin Fowler — CQRS](https://martinfowler.com/bliki/CQRS.html) — Command/query separation fundamentals.
- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/) — The original ports-and-adapters essay.
- [Laracasts — Advanced Queues](https://laracasts.com/series/advanced-eloquent) — Queue and Eloquent advanced video series.
- [Laravel Best Practices Guide](/backend/laravel/guides/laravel-best-practices-guide) — In-repo production patterns reference.
- [Advanced Eloquent Cheatsheet](/backend/laravel/cheatsheets/laravel-eloquent-advanced-cheatsheet) — In-repo Eloquent deep-dive reference.

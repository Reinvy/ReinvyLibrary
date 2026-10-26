---
title: "NestJS Enterprise Backend Syllabus"
description: "An eight-module curriculum that takes experienced developers from NestJS project structure to enterprise-grade platform delivery, covering architecture, module boundaries, authentication and authorization, persistence, messaging, observability, testing, and deployment."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# NestJS Enterprise Backend Syllabus

## Overview

Most NestJS material stops at "controllers, services, and a database connection". Real enterprise systems demand much more: module boundaries that survive team growth, authorization models that hold up under audit, transaction strategies that do not corrupt data under concurrency, and deployment pipelines that can roll back safely at 3 a.m.

This eight-module curriculum is built around a single running system — a multi-tenant order and billing platform — that you extend module by module. Each module pairs a conceptual lecture with a lab that leaves the codebase in a working, deployable state. The ordering is deliberate: architecture decisions come first because every later module (persistence, messaging, observability) inherits their constraints, and testing is placed immediately before deployment so that the final module has real gates to automate against.

The course assumes you can already build a working CRUD API in NestJS. It is not an introduction to the framework; it is an introduction to running the framework at organizational scale.

## Curriculum

### Module 1: Architecture and Project Boundaries

- **Layered vs. Hexagonal Structure**
  - Domain, application, and infrastructure layers in NestJS terms
  - Keeping framework decorators out of domain logic
  - Where DTOs end and domain entities begin
- **Repository and Port Conventions**
  - Abstract classes as injection tokens
  - Adapting third-party clients behind ports
  - Trade-offs of strict layering in a small team

### Module 2: Modules, Providers, and Configuration

- **Module Design**
  - Feature modules vs. shared infrastructure modules
  - `exports` discipline and avoiding accidental global state
  - Dynamic modules with `forRootAsync` for configuration
- **Configuration and Validation**
  - `@nestjs/config` with schema validation using Joi or Zod
  - Environment-per-stage configuration and secret injection
  - Fail-fast startup: rejecting invalid config before listening

### Module 3: Authentication, Authorization, and Tenancy

- **Identity**
  - JWT access and refresh token rotation
  - Session invalidation and token revocation lists in Redis
  - Password hashing parameters and upgrade paths
- **Policy Enforcement**
  - Guards, `Reflector`, and declarative permission metadata
  - Role-based vs. attribute-based access control
  - Tenant isolation at the query layer, not just the controller layer

### Module 4: Persistence and Transactions

- **Data Modeling with TypeORM or Prisma**
  - Migrations in CI: forward-only, reviewed, and reversible by design
  - Entity relationships and avoiding N+1 query patterns
  - Soft deletes, audit columns, and optimistic locking
- **Transactional Integrity**
  - Unit-of-work with `QueryRunner` and request-scoped transactions
  - Isolation levels and retry on serialization failure
  - Outbox pattern prerequisites for Module 5

### Module 5: Messaging and Async Workflows

- **Brokers and Queues**
  - BullMQ for background jobs, retries, and backoff
  - RabbitMQ or Kafka for cross-service events
  - Idempotent consumers and deduplication keys
- **Reliability**
  - The transactional outbox and at-least-once delivery
  - Dead-letter queues and poison message handling
  - Schema evolution for events shared across teams

### Module 6: Observability and Operations

- **Telemetry**
  - Structured logging with request and trace correlation
  - OpenTelemetry traces spanning HTTP, database, and broker calls
  - RED and USE metrics with Prometheus and Grafana
- **Operational Readiness**
  - Health checks: liveness vs. readiness vs. startup
  - Graceful shutdown and in-flight request draining
  - Alert thresholds that page humans only when it matters

### Module 7: Testing Strategy

- **Test Pyramid in Practice**
  - Unit tests for domain logic without the Nest container
  - Integration tests with `Test.createTestingModule` and Testcontainers
  - Contract tests between services and consumer-driven schemas
- **Quality Gates**
  - Coverage thresholds that measure risk, not line count
  - Seeding and fixture factories for deterministic data
  - Load testing with k6 against a realistic dataset

### Module 8: Deployment and Release Engineering

- **Packaging**
  - Multi-stage Docker builds and dependency pruning
  - Migrations as a separate, ordered release step
  - Configuration and secrets per environment
- **Release Safety**
  - Blue-green and canary rollouts with automated rollback
  - Feature flags for decoupling deploy from release
  - Post-deploy verification and runbook documentation

## Final Project

Build and operate the course platform end to end: a multi-tenant ordering and billing API in NestJS with at least three deployed services.

Required capabilities:

- Tenant-aware authentication with refresh token rotation and role policies
- Transactional order creation with an outbox publishing `order.created` events
- A background worker consuming those events to generate invoices with retries and a dead-letter queue
- Full OpenTelemetry instrumentation with dashboards for latency, error rate, and queue depth
- A CI pipeline running unit, integration, and contract tests, then a canary deployment with automated rollback on error-budget breach

Deliverables are the repository, a written architecture decision record for each module boundary, and a runbook covering on-call response for the three most likely failure modes.

## Assessment Criteria

- **Module Labs (40%)**: Each module has a lab reviewed against a rubric covering correctness, tests, and adherence to the module's architectural constraint.
- **Architecture Decision Records (15%)**: Clarity of the problem statement, alternatives considered, and consequences accepted.
- **Final Project (35%)**: Working deployment, demonstrated rollback, observable failure injection, and code quality.
- **Peer Review (10%)**: Quality of review comments on two other learners' pull requests.

A passing grade requires the final project to survive an injected failure (broker outage or database latency) without data loss.

## References

- [NestJS Official Documentation](https://docs.nestjs.com/)
- [NestJS Fundamentals and Advanced Courses](https://courses.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/) and [Prisma Documentation](https://www.prisma.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- *Designing Data-Intensive Applications* — Martin Kleppmann
- *Release It!* — Michael Nygard
- [The Twelve-Factor App](https://12factor.net/)

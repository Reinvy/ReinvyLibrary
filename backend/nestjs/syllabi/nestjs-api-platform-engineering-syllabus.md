---
title: "NestJS API Platform Engineering Syllabus"
description: "An advanced 10-week curriculum for backend engineers who want to design, build, and operate production-grade REST API platforms with NestJS — covering REST API design, OpenAPI-first workflows, validation and serialization, pagination, versioning, rate limiting, idempotency, API authentication, contract testing, webhooks, performance and caching, and gateway-level developer experience."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# NestJS API Platform Engineering Syllabus

## Overview

This advanced 10-week curriculum is designed for backend engineers who already ship NestJS applications and want to level up from "building endpoints" to "operating an API platform". A platform API is not a collection of routes — it is a product with a contract, a lifecycle, and a developer experience. This course treats the API itself as the deliverable: you will learn how to model resources and HTTP semantics correctly, adopt an OpenAPI-first workflow so the specification becomes the source of truth, harden the validation and serialization layer, design pagination and filtering that scale, version APIs without breaking consumers, protect them with throttling and idempotency, secure access with scoped tokens, verify contracts with consumer-driven testing, deliver events reliably through webhooks, and prove performance with load tests and caching. Each week pairs deep conceptual material with hands-on labs on a single evolving codebase, and the course culminates in a capstone: a complete, versioned, documented, contract-tested API platform for a SaaS-style product, shipped with a developer quickstart and a measured performance report.

Learners should be comfortable with TypeScript, NestJS fundamentals (modules, controllers, providers, guards, pipes), and a relational database before enrolling.

## Curriculum

### Week 1: REST API Design Foundations

- **Resource Modeling**
  - Nouns, not verbs: collections, sub-resources, and the difference between resources and actions
  - URI conventions: plural names, stable hierarchies, avoiding implementation details in paths
  - When a resource is a list, a document, or a computation (and how to model each)
- **HTTP Semantics**
  - Method semantics: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` and their safety/idempotency guarantees
  - Status code taxonomy: 2xx success families, 4xx client errors, 5xx server errors, and the codes that matter for API consumers (400, 401, 403, 404, 409, 422, 429)
  - Content negotiation: `Accept` / `Content-Type`, media types, and JSON response envelopes
- **Course Codebase Setup**
  - Modular monorepo layout for a platform API (resources, common, infra modules)
  - Config module, environment validation, and a shared error-handling skeleton
  - Enabling `@nestjs/swagger` early so the contract grows with the code
- **Lab Practice**: Model a team task tracker domain into REST resources, then implement the first read endpoints with correct status codes and media types

### Week 2: OpenAPI-First Workflow with NestJS

- **Why the Contract Comes First**
  - The spec as a single source of truth: codegen, documentation, client SDKs, and mocks
  - Code-first versus spec-first: when each wins, and how NestJS supports both
- **Generating the Contract with `@nestjs/swagger`**
  - Decorators for schemas, parameters, responses, and tags
  - DTO-driven schema generation and explicit `@ApiProperty` metadata
  - Swagger UI as the living documentation surface
- **OpenAPI 3.1 Details**
  - Components, schemas, parameters, request/response bodies, security schemes
  - Writing high-quality descriptions, examples, and deprecation flags
- **Spec Quality Gates**
  - Validating the generated document with a linter such as Spectral
  - Enforcing naming conventions and forbidding missing summaries in CI
- **Lab Practice**: Produce a complete OpenAPI document for the Week 1 API, validate it with Spectral rules, and fix every warning

### Week 3: DTO Validation, Serialization & Error Taxonomy

- **Validation with `class-validator` and `ValidationPipe`**
  - `whitelist`, `forbidNonWhitelisted`, and `transform` options and their security implications
  - Nested DTOs, arrays, and conditional validation rules
- **Serialization with `class-transformer`**
  - `@Exclude` / `@Expose` and serialization groups for role-based field visibility
  - Transforming dates, numbers, and enums at the boundary
- **A Consistent Error Taxonomy**
  - RFC 7807 problem details: `type`, `title`, `status`, `detail`, `instance`
  - Field-level validation errors inside a stable envelope
  - Custom exception filters that map domain exceptions to API errors without leaking internals
- **Lab Practice**: Enforce whitelisted validation on every write endpoint, add a global problem-details error filter, and include a request ID in every response

### Week 4: Pagination, Filtering, Sorting & Search

- **Offset vs Cursor Pagination**
  - Trade-offs: deep-page cost, data drift, and consistency guarantees
  - Keyset (seek) pagination on indexed columns with stable ordering
- **Filtering Conventions**
  - Query parameter design: `filter[status]=done`, operator suffixes, and escaping
  - Whitelisting filterable fields to protect indexes and prevent abuse
- **Sorting**
  - Multi-field sort syntax, direction control, and a safe field allowlist
  - Preventing injection into `ORDER BY` clauses
- **Search**
  - Full-text search (e.g., PostgreSQL `tsvector`) versus simple containment
  - Combining search with pagination and filters without surprises
- **Page Metadata**
  - `total`, `next_cursor`, and `per_page` in a stable envelope
  - Enforcing maximum page sizes and cursor validation
- **Lab Practice**: Build a cursor-paginated message feed with filtering, multi-field sorting, and search, then verify the SQL uses indexes under `EXPLAIN`

### Week 5: Versioning, Rate Limiting & Idempotency

- **API Versioning Strategies**
  - URI versioning (`/v1/`, `/v2/`) versus header and media-type versioning
  - When to cut a new version, what a deprecation policy looks like, and how to announce it
- **Rate Limiting with `@nestjs/throttler`**
  - Fixed-window versus token-bucket behavior and storage backends (Redis)
  - Per-route, per-user, and per-IP limits; the `X-RateLimit-*` headers and `429` with `Retry-After`
- **Idempotency Keys**
  - Why `POST` needs retry safety: duplicate orders, double charges, double registrations
  - Key storage in Redis, response replay on repeat keys, and expiry/cleanup policy
- **Client-Side Etiquette**
  - Honoring `Retry-After`, exponential backoff, and retry budget design
- **Lab Practice**: Introduce `/v1` and `/v2` controllers, attach throttler limits per user, and implement an idempotent billing-style endpoint backed by Redis

### Week 6: API Authentication & Authorization Design

- **Token Strategies for APIs**
  - JWT access tokens with short lives and refresh rotation versus opaque tokens
  - API keys for machine-to-machine clients: scoping, rotation, and revocation
- **Guards, Decorators, and Policies**
  - Global guards with route-level overrides; role and permission metadata via decorators
  - Resource-level ownership checks and ABAC-style policy evaluation
- **OAuth2 for Third-Party Apps**
  - Authorization-code and client-credentials flows; scopes as the unit of consent
  - Token issuance, audience validation, and refresh handling in NestJS
- **Tenancy and Multi-Client Isolation**
  - Deriving the tenant and actor from the token, not from the request body
  - Preventing horizontal privilege escalation in queries
- **Lab Practice**: Add scoped access tokens, protect routes with role metadata, and verify cross-tenant reads are rejected

### Week 7: Contract Testing & API Governance

- **Consumer-Driven Contracts**
  - Why integration tests miss consumer expectations, and what contract tests add
  - Pact: consumer expectations, provider states, and verification runs
- **Contract Verification in CI**
  - Running provider verification on every PR; broker-based version matching
  - Handling contract changes across release timelines
- **Schema Governance**
  - Breaking versus non-breaking changes: additive-only rules and explicit breaks
  - API changelogs, deprecation headers, and sunset dates as product policy
- **The API Review Process**
  - Spec diffs in code review, a design checklist, and when a breaking change needs approval
- **Lab Practice**: Stand up a Pact consumer/provider pair for the tasks resource and wire provider verification into the CI pipeline

### Week 8: Webhooks & Asynchronous Delivery

- **Webhook Design**
  - Event catalog, payload schemas, and versioned event types
  - Verifying delivery with HMAC signatures and giving consumers a way to replay
- **Reliable Delivery**
  - The outbox pattern for publishing events transactionally with the write
  - A retry queue (BullMQ) with exponential backoff, dead-letter handling, and delivery receipt tracking
  - Idempotent delivery so duplicate callbacks are safe for consumers
- **Developer Experience for Webhooks**
  - Webhook logs, replay endpoints, signature debugging, and a local tunnel for development
- **Lab Practice**: Add HMAC-signed webhooks for task events using an outbox + BullMQ retry pipeline, then verify replay and dead-letter behavior

### Week 9: API Performance & Caching

- **Load Testing and Profiling**
  - k6 or autocannon: throughput, latency percentiles (p50/p95/p99), and error ceilings
  - Profiling slow handlers and database queries; N+1 and missing-index detection
- **HTTP Caching**
  - `Cache-Control`, `ETag` / `If-None-Match`, conditional requests, and `304` responses
- **Server-Side Caching**
  - Cache-aside with Redis, key design with invalidation, and avoiding stale reads
  - Compression (gzip/brotli) and payload size budgets
- **Database Read Optimization**
  - Indexes for the pagination/filter shapes from Week 4, query batching, and read replicas
- **Lab Practice**: Load-test the message feed endpoint, add ETag and Redis cache-aside, then re-run the test and compare percentiles before and after

### Week 10: Gateways, Developer Experience & Lifecycle

- **API Gateway Patterns**
  - Routing, aggregation, edge rate limiting, and auth at the gateway
  - In-process NestJS gateway modules versus managed gateways (Kong, Envoy, cloud offerings)
- **Developer Experience**
  - Documentation portal, sandbox keys, and a quickstart guide
  - Generating typed clients (`openapi-typescript`, `openapi-generator`) from the contract
- **Lifecycle Management**
  - Deprecation schedules, sunset headers, breaking-change windows, and migration guides
  - Measuring adoption of old versions to decide when to retire them
- **API Observability**
  - Structured request logs, latency SLIs/SLOs, error budgets, and alerting on the 429/5xx axes
- **Lab Practice**: Publish the platform with a developer quickstart and sandbox keys, deprecate a v1 endpoint per the policy, and run the final full load test with a documented report

## Final Project

Build a complete API platform for the team task tracker domain: an OpenAPI-first, versioned REST API with validated DTOs, cursor pagination, filtering and search, per-user rate limiting, idempotent mutations, scoped access tokens, Pact-verified contracts, HMAC-signed webhooks with retry and replay, ETag and Redis caching, and a documented load-test report with p50/p95/p99 latency. The deliverable is a repository containing the OpenAPI contract, the NestJS implementation, contract tests, a CI pipeline that verifies contracts and conformance, webhook delivery infrastructure, a developer quickstart, and a performance report showing the measured effect of the caching strategy.

## Assessment Criteria

- **Assignments**: Weekly design briefs (resource maps, OpenAPI excerpts, schema-change proposals) are graded on API design consistency and spec quality; each week's lab must pass its stated verification (validation enforced, contract valid, index used, percentiles improved).
- **Contract and Governance**: The spec must be lint-clean, the Pact provider verification must pass in CI, and every schema change must follow the documented breaking-change policy.
- **Final Project**: Evaluated on contract quality, consistency of HTTP semantics, rate-limit and idempotency behavior under replay, webhook reliability (signatures, retries, dead-letter handling), cross-tenant access isolation, performance evidence with before/after measurements, and the completeness of the developer quickstart.

## References

- [NestJS Documentation — Validation, Serialization, OpenAPI, Security](https://docs.nestjs.com/)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/latest.html)
- [RFC 7807 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807)
- [Pact — Consumer-Driven Contract Testing](https://docs.pact.io/)
- [Spectral — OpenAPI Linting](https://github.com/stoplightio/spectral)
- [k6 — Load Testing](https://k6.io/docs/)
- [BullMQ — Redis-backed Queue for NestJS](https://docs.bullmq.io/)

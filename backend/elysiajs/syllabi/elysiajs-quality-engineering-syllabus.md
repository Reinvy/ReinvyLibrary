---
title: "Elysia.js Quality Engineering Syllabus"
description: "A comprehensive 12-week advanced curriculum for developers and QA engineers covering the Elysia.js quality engineering stack — unit testing with the Bun test runner, mocking and dependency injection, TypeBox schema validation testing, integration testing with real databases, lifecycle and hook testability, OpenAPI contract testing, test data factories, property-based testing, performance and load testing, end-to-end suites, and CI/CD quality gates."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Elysia.js Quality Engineering Syllabus

## Overview

This 12-week advanced syllabus is designed for developers, QA engineers, and testing specialists who already build APIs with Elysia.js and now want to master the discipline of testing them rigorously. Most Elysia.js curricula teach routing, validation, plugins, and deployment; this course is dedicated entirely to quality engineering for Elysia.js-backed services: the test pyramid applied to a Bun-native framework, unit tests that exercise handlers without a listening server, mocking strategies that isolate services and database repositories, TypeBox schema tests that lock down the validation contract, integration suites that run against real databases and real WebSocket connections, lifecycle and hook tests that verify request pipeline behavior, OpenAPI contract tests that keep client and server in sync, deterministic fixtures and factories, property-based tests that find the inputs unit tests miss, performance signatures and load tests, and CI/CD pipelines that fail the build before a regression reaches production.

Each module pairs conceptual foundations with hands-on labs on real tooling: the Bun test runner (`bun:test`), `app.handle()` for serverless-style request testing, `mock()` and `spyOn()` from `bun:test`, Drizzle ORM and `bun:sqlite` for repository seams, Testcontainers-style ephemeral databases, `@elysiajs/swagger` for OpenAPI contract exports, `fast-check` for property-based testing, and GitHub Actions with Bun service containers. The curriculum follows the journey of a quality engineering team hardening a realistic Elysia.js application: designing the test strategy, building a layered test suite, automating contract and data-integrity checks, and finally wiring everything into a pipeline that gates every merge. The course culminates in a capstone project that requires designing, implementing, and documenting a complete quality framework for an Elysia.js application, including the test pyramid, performance baselines, and a CI pipeline.

By the end of this course, learners will be able to design a test pyramid for Elysia.js services, write fast unit tests that never touch the network, isolate the boundary layer with mocks and decorator-injected dependencies, verify TypeBox schemas against adversarial payloads, run durable integration suites with real databases, test lifecycle hooks and error flows deterministically, keep OpenAPI contracts in sync with automated checks, manage test data with factories and seeds, discover edge cases with property-based testing, establish performance baselines, run end-to-end suites against a deployed instance, and gate every deployment with an automated quality pipeline.

## Curriculum

### Module 1: Quality Engineering Foundations with Elysia.js (Week 1)

- **The quality discipline for Bun-native services**
  - Why Elysia.js's compile-time type system changes the testing conversation: many routing and schema errors surface before a request is sent
  - The test pyramid applied to a Bun-native framework: unit → integration → contract → end-to-end
  - What "fast and deterministic" means when tests share a Bun process with the app
- **The Bun test runner as the default harness**
  - `bun:test` structure: `describe`, `it`, `expect`, `beforeAll`, `afterAll`, `beforeEach`, `afterEach`
  - Running targeted files, watch mode, coverage reporting (`bun test --coverage`), and CI-friendly exit codes
  - Organizing a test suite for an Elysia.js monorepo: `tests/unit`, `tests/integration`, `tests/contract`, `tests/e2e`
- **Testing without a listening server**
  - `app.handle(new Request(...))` as the canonical way to exercise routes in-process
  - Reading `response.status`, JSON bodies, headers, and `Set-Cookie` from the returned `Response`
  - Why `app.listen()` is avoided in tests: no ports, no flakiness, no teardown races
- **Lab**: scaffold an Elysia.js app and add a `bun:test` suite that hits three routes through `app.handle()` with zero network I/O

### Module 2: Unit Testing Handlers and Services (Week 2)

- **Testing routes in isolation**
  - Unit-testing a handler's happy path, validation failures, and error responses through `app.handle()`
  - Structuring handlers as thin adapters over services so business logic is testable without HTTP
  - Pure function extraction: time-based logic, slug generation, pagination math, and currency arithmetic
- **The service layer as the test seam**
  - Separating repositories, use cases, and domain rules into plain TypeScript modules
  - Testing business rules directly with `bun:test` — no Elysia instance required
  - Measuring service-level coverage and avoiding the mock-everything anti-pattern
- **Response assertion patterns**
  - Deep-equality on JSON payloads with `toEqual` and `toMatchObject`
  - Header and status assertions, error shape assertions, and happy-path snapshots
- **Lab**: refactor a route with inline logic into handler + service layers, then write a unit suite that covers every branch of the service without constructing a single `Request`

### Module 3: Mocking, Test Doubles, and Dependency Injection (Week 3)

- **Bun's built-in mocking toolkit**
  - `mock()` for function doubles, `spyOn()` for method spying, and `mock.module()` for module-level interception
  - Asserting call counts, arguments, and return values
  - Clearing and restoring mocks between tests to prevent cross-test leakage
- **Injecting dependencies the Elysia way**
  - `decorate()` and state injection as seams for services, repositories, and clocks
  - Swapping real dependencies for doubles when building the app under test
  - The plugin-based double pattern: a test plugin that overrides `decorate` entries with mocks
- **What to mock and what not to mock**
  - Mocking boundaries (HTTP clients, databases, time) versus mocking your own code (a smell)
  - Contract-testing mocked boundaries so the doubles stay honest
- **Lab**: build an app that depends on a repository and a clock, then write tests that inject a mocked repository and a fixed clock to make time-dependent behavior deterministic

### Module 4: TypeBox Schema and Validation Testing (Week 4)

- **The schema as a contract, not an implementation detail**
  - Why TypeBox schemas deserve their own test layer: they define the public data contract
  - Valid-input tests: representative payloads for every route body, query, and param schema
  - Invalid-input tests: missing fields, wrong types, out-of-range lengths, unknown properties with `additionalProperties: false`
- **Asserting Elysia's validation behavior**
  - Status codes and error bodies produced by schema violations (`UNION`, `OBJECT`, `INT`, `STRING` error types)
  - Testing `strict` mode schemas and coercions (`t.Coerce`, `t.Transform`)
  - Schema-to-type parity: verifying that inferred TypeScript types match runtime behavior
- **Refining schemas with feedback from tests**
  - Using the failure corpus to tighten constraints: `format`, `pattern`, `minLength`, `maxLength`, `minimum`, `exclusiveMinimum`
- **Lab**: write a validation test matrix for a user-profile API (body, query, params) covering at least 20 valid and 20 invalid payloads, and verify the error contract is stable

### Module 5: Integration Testing with Real Databases (Week 5)

- **Testing the data layer for real**
  - Why mocks are not enough for SQL: query correctness lives in the database
  - Integration tests with `bun:sqlite` (fast, in-memory or file-backed) and PostgreSQL (via the `pg` driver with a real connection)
  - The repository pattern as the integration-test boundary
- **Managing database state deterministically**
  - Schema migration runs in `beforeAll`, truncation between tests, and transaction-rollback strategies
  - Seeding baseline records with Drizzle ORM and raw SQL inserts
  - Test database isolation: unique schemas or databases per test run, parallel-safety
- **Testing through the API against a real database**
  - Bootstrapping the app with the real repository and running CRUD flows through `app.handle()`
  - Testing unique-constraint violations, transactions, and cascading deletes end-to-end through the data layer
- **Lab**: wire a CRUD app to a real database, write an integration suite covering create/read/update/delete plus a transaction failure, and prove a query regression that unit tests with mocks could not catch

### Module 6: Lifecycle, Hooks, and Error-Flow Testing (Week 6)

- **Testing the request pipeline**
  - `onBeforeHandle`, `onAfterHandle`, `derive`, `resolve`, and `mapResponse` exercised with crafted requests
  - Verifying hook ordering and short-circuit behavior (hooks that return early bypass the handler)
  - Testing guards and authentication hooks: valid tokens, expired tokens, missing headers, malformed JWTs
- **Error handling as a testable contract**
  - `onError` mapping for `NOT_FOUND`, `VALIDATION`, `PARSE`, and custom error classes
  - Asserting the unified error envelope, status codes, and logged context
  - Testing global error hooks without triggering real stack traces
- **WebSocket lifecycle testing**
  - Using `ws`/Bun's native WebSocket client against a test server instance for message flow assertions
  - Testing open/hook/message adaptation, close handling, and room membership changes
- **Lab**: build an authenticated resource, then write tests that pin down hook ordering, guard rejection paths, the error envelope, and a WebSocket message round-trip

### Module 7: OpenAPI Contract Testing (Week 7)

- **The contract between server and client**
  - Generating OpenAPI documents with `@elysiajs/swagger` and treating them as versioned artifacts
  - Eden Treaty as an end-to-end type contract and what contract tests add beyond it
  - The consumer-driven contract workflow: server publishes spec, clients regenerate types
- **Automated contract checks**
  - Failing the build when the generated OpenAPI spec changes unintentionally (spec diffing in CI)
  - Validating the spec itself against the OpenAPI schema (structural linting)
  - Contract tests for every endpoint: request schema conformance and response schema conformance against the served document
- **Mock servers and client parity**
  - Standing up a mock server from the OpenAPI spec for frontend development and consumer tests
  - Verifying Eden Treaty client calls compile against the exact server contract
- **Lab**: enable Swagger on the course app, capture the spec as a committed artifact, add a CI check that fails on unexpected spec drift, and write a response-conformance test for every route

### Module 8: Test Data Management and Factories (Week 8)

- **Factories, seeds, and fixtures**
  - Building typed factories for users, orders, and domain entities with deterministic defaults
  - Sequence-based uniqueness to avoid collision across tests and parallel workers
  - Faker-style variation versus fixed fixtures: when each is the right tool
- **Seeding strategies for different test tiers**
  - Minimal inline fixtures for unit tests, database seeds for integration tests, and full environment seeds for e2e
  - Idempotent seeding: create-or-replace semantics that survive repeated runs
- **Determinism and isolation**
  - Randomness control (seeded RNG) so flaky failures are reproducible
  - Per-test isolation guarantees: each test owns its records; cleanup in `afterEach`
  - Time and clock handling in factories: `now` injection and frozen dates
- **Lab**: build a factory set for the course domain, write a seeding module used by both integration and e2e suites, and demonstrate a deterministic test that fails flakily without clock control

### Module 9: Property-Based and Fuzz Testing (Week 9)

- **Beyond hand-written examples**
  - Why hand-picked inputs miss edge cases: the empty string, the giant number, the unicode username
  - Property-based testing with `fast-check`: generate inputs, assert invariants, shrink failures
  - The shrinking story: turning a failing property into the smallest reproducing input
- **Properties that matter for Elysia.js services**
  - Round-trip invariants: serialization → parse → equality for TypeBox transforms
  - Validation totality: every generated payload either validates or produces a well-formed error
  - Pagination laws: offsets in range, ordering stable, no duplicate or missing records
  - Idempotency properties for cache keys, slug generation, and id normalizers
- **Fuzzing the request boundary**
  - Feeding malformed bodies, oversized headers, and weird encodings through `app.handle()`
  - Asserting the server never crashes, always returns a structured error, and never leaks stack traces
- **Lab**: write property suites for a validation schema, a slug generator, and a pagination endpoint, and use `fast-check` shrinking to find and fix a real edge-case bug

### Module 10: Performance and Load Testing (Week 10)

- **Performance as a quality gate**
  - Baseline-first thinking: measure before optimizing, gate on regressions, not absolute numbers
  - Micro-benchmarks with `bun:bench` for hot paths (validation, serialization, routing)
  - Profiling a Bun process: CPU profiles, allocation profiles, and event-loop lag
- **Load testing the API surface**
  - Driving load with tools like `oha` against a locally deployed instance
  - Metrics that matter: requests per second, p50/p95/p99 latency, error rate, memory growth
  - Testing behavior under pressure: rate limits, connection draining, backpressure on WebSockets
- **Performance regression detection in CI**
  - Golden-latency tests: generous bounds that catch order-of-magnitude regressions without flakiness
  - Comparing baseline and post-change benchmarks in CI comments
  - Avoiding the flaky-benchmark trap: warmups, fixed iteration counts, and statistical margins
- **Lab**: benchmark a validation-heavy route before and after a schema optimization, write a latency regression test with a safe margin, and run a short load test recording p95 and error rate

### Module 11: End-to-End Testing and CI/CD Quality Gates (Week 11)

- **End-to-end suites for a deployed app**
  - The role of e2e: verifying the whole stack (service, database, real network) as a user would
  - Structuring e2e with full environment seeds and dedicated test accounts
  - Smoke tests after deployment versus deep e2e suites on staging
- **Designing the quality pipeline**
  - A layered CI matrix: lint + typecheck, unit tests, integration tests, contract tests, property tests, benchmarks, e2e
  - Fail-fast ordering: cheap gates first, expensive suites last
  - Coverage thresholds with `bun test --coverage` and the coverage report as a PR artifact
- **GitHub Actions with Bun**
  - `oven-sh/setup-bun` for caching and installation, Bun service containers for databases
  - Caching dependencies and Bun's module cache for fast cold starts
  - The merge gate: required status checks that block merging on any red layer
- **Lab**: build a GitHub Actions workflow running the full layered suite, add a coverage gate and a contract-drift check, and demonstrate a merge blocked by a failing quality check

### Module 12: Capstone Project — Quality Framework for an Elysia.js Application (Week 12)

- **Scope**: design, implement, and document a complete quality engineering framework for a real Elysia.js application (the course project or your own service)
- **Deliverables**
  - A written test strategy: test pyramid, tier boundaries, mocking policy, and risk register
  - The full suite: unit, integration, contract, property, performance, and e2e layers
  - A versioned OpenAPI contract with automated drift detection
  - A CI/CD pipeline that gates merges on the complete quality matrix
  - A performance baseline report with p50/p95/p99 values and regression thresholds
- **Assessment focus**: whether the framework would actually catch regressions, run deterministically, and fit the team's workflow — not the volume of tests
- **Presentation**: a final walkthrough explaining the strategy decisions, challenging trade-offs, and lessons learned from building the suite

## Final Project

Learners will build a **quality engineering framework for a complete Elysia.js application** — a multi-resource API with authentication, a database, real-time features, and third-party integrations. The project must include: a documented test strategy that explains why each tier exists; a layered test suite covering unit, integration, contract, property, performance, and end-to-end tests; a committed OpenAPI contract with automated drift detection in CI; a factory and seeding system that keeps every tier deterministic; and a GitHub Actions pipeline that runs the full matrix and blocks merges on failure. The final deliverable is the working pipeline plus a written report justifying the strategy choices, documenting the baseline metrics, and reflecting on which testing investments produced the most value.

## Assessment Criteria

- **Assignments**: Weekly labs are graded on correctness of the test design (not just passing tests), determinism of the suite, and adherence to the mocking and isolation policies taught in the course. Module 4's validation matrix and Module 7's contract suite are required checkpoints.
- **Quality Engineering Portfolio**: Learners maintain a running suite of growing sophistication; reviewers assess whether each added layer genuinely strengthens the safety net rather than duplicating an existing one.
- **Final Project**: The capstone is evaluated on whether the framework would actually catch regressions (mutation-style review: can a reviewer break the app without the suite noticing?), run reliably in CI, and remain maintainable for a small team. A successful project must have every layer green in CI and a baseline report with defensible thresholds.

## References

- [Elysia.js Documentation — Testing](https://elysiajs.com/patterns/testing.html)
- [Bun Test Runner Documentation](https://bun.sh/docs/cli/test)
- [Bun Mocking (mock, spyOn, mock.module)](https://bun.sh/docs/test/mocks)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [fast-check Property-Based Testing](https://fast-check.dev/)
- [Eden Treaty Documentation](https://elysiajs.com/eden/treaty.html)
- [GitHub Actions — Bun Setup](https://github.com/oven-sh/setup-bun)
- [oha Load Generator](https://github.com/hatoo/oha)

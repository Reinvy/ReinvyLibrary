---
title: "Laravel API Engineering Syllabus"
description: "A seven-module curriculum that moves Laravel developers from CRUD controllers to production-grade JSON APIs, covering contract-first design, token authentication, resources and serialization, validation, queues, automated testing, and zero-downtime deployment."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Laravel API Engineering Syllabus

## Overview

Most Laravel developers learn the framework through its web stack: Blade views, session cookies, form submissions, and redirects. APIs break every one of those assumptions. There are no sessions to lean on, no HTML error pages to fall back to, and no human who can interpret a vague response. Every contract is machine-to-machine, which means the shape of a payload, the meaning of a status code, and the idempotency of a write all become engineering obligations rather than cosmetic choices.

This syllabus is a seven-module course that rebuilds the reader's Laravel instincts around the API boundary. It starts with contract-first design so that schemas are decided before controllers exist, then layers authentication, serialization, validation, asynchronous work, testing, and finally deployment and operations. Each module is one week of theory plus a hands-on lab that extends the same evolving project, so learners never write disconnected snippets — by Module 7 they are operating an API they designed in Module 1.

The course deliberately stays framework-honest. Laravel's conveniences (Sanctum, API Resources, FormRequests, queues, Pint, Octane) are taught with the trade-offs that appear in production: N+1 queries hidden behind resources, silently broken pagination contracts, tokens that never expire, jobs that retry into double charges, and deployments that drop in-flight requests. Learners finish able to defend an API design in review, not just ship one.

## Curriculum

### Module 1: Contract-First API Design (Week 1)

- **Resources and naming**
  - Plural nouns, kebab-case paths, and verbs moved out of URLs
  - Status code semantics: 200/201/204, 400 vs 422, 401 vs 403, 409, 429
  - A single error envelope shared by every endpoint (`message`, `code`, `errors`, `trace_id`)
- **Shaping the contract before code**
  - Writing an OpenAPI 3.1 description first and generating controllers from it
  - Pagination and filtering conventions: page/size vs cursor, `?filter[status]=paid`
  - Versioning strategy (`/v1` prefix vs media-type negotiation) and deprecation policy
- **Idempotency for writes**
  - `Idempotency-Key` header, a stored response table, and replay on duplicate submission
- **Hands-on Lab**: Author an OpenAPI document for an inventory API, then scaffold routes and a shared error-handling layer that matches it exactly

### Module 2: Authentication and Authorization (Week 2)

- **Token vs session**
  - Sanctum personal access tokens for first-party clients, cookies for SPA same-origin use
  - Where Passport and full OAuth2 fit — and when they are overkill
  - Token abilities, expiry, rotation, and revocation on password change
- **Authorization as policy, not conditionals**
  - Policies and gates bound to models; `authorize()` in controllers and form requests
  - Multi-tenant scoping: preventing cross-tenant reads with global scopes plus policy checks
- **Abuse resistance**
  - Per-route rate limiters (`RateLimiter::for`) keyed by user, IP, and tenant
  - Login throttling, credential stuffing signals, and constant-time token comparison
- **Hands-on Lab**: Add token auth with abilities to the inventory API, write policies for every mutating route, and prove cross-tenant access is rejected with tests

### Module 3: Resources and Serialization (Week 3)

- **API Resources as a boundary**
  - `JsonResource` and `ResourceCollection` as the only place payload shape is defined
  - `whenLoaded`, `whenHas`, and `mergeWhen` for conditional fields
  - Why returning Eloquent models directly leaks schema and coupling
- **Relationships without N+1**
  - `with()` in the query layer, `whenLoaded()` in the resource layer
  - `preventLazyLoading()` in non-production and how it surfaces hidden queries
  - Counting and aggregation fields without loading whole collections
- **Consistent pagination and meta**
  - One pagination envelope (`data`, `meta`, `links`) reused across resources
  - Cursor pagination for large, ordered datasets
- **Hands-on Lab**: Refactor every endpoint to resources with a shared pagination envelope, then reduce a listing endpoint from 40 queries to 3

### Module 4: Validation and the Request Lifecycle (Week 4)

- **FormRequests as contracts**
  - `rules()`, `authorize()`, `messages()`, and `prepareForValidation()`
  - Nested and array validation with wildcards (`items.*.sku`)
  - Custom rules for domain constraints (SKU uniqueness per tenant, state transitions)
- **Failures that machines can parse**
  - Normalizing the 422 payload and pinning its structure in tests
  - Distinguishing validation errors from business-rule conflicts (409/422)
- **Middleware ordering and cross-cutting concerns**
  - Request ids, structured logging, CORS, forced JSON responses, ETag/conditional GET
- **Hands-on Lab**: Move all inline validation into FormRequests, add a `trace_id` middleware, and write tests that assert the exact error envelope

### Module 5: Queues and Asynchronous API Work (Week 5)

- **What belongs off the request path**
  - Notifications, PDF generation, third-party sync, and heavy aggregation
  - Responding with `202 Accepted` plus a job-status endpoint when work is async
- **Reliability mechanics**
  - Retries with backoff, `failed()` handlers, and `ShouldBeUnique` for deduplication
  - Idempotent jobs — the guard against a retried payment or a duplicated shipment
  - Batching with `Bus::batch()` and callbacks for fan-out work
- **Queues at the edge**
  - Outbox pattern for emitting events after commit; `afterCommit` dispatching
  - Horizon supervisors, queue priorities, and isolating slow queues
- **Hands-on Lab**: Move report generation and webhook delivery to queued jobs, make each job idempotent, and demonstrate safe replay after a forced failure

### Module 6: Testing API Surfaces (Week 6)

- **Feature tests first**
  - `RefreshDatabase`, factories with states, and `actingAs` for policy-driven routes
  - Asserting status, structure (`assertJsonStructure`), and validation failures
  - Testing authorization boundaries — the tests that catch real breaches
- **Isolating the outside world**
  - `Http::fake()`, `Bus::fake()`, `Queue::fake()`, and Mail/Notification fakes
  - Contract tests against the OpenAPI document so spec drift fails the build
- **Speed and coverage strategy**
  - Parallel testing with separate databases; `--parallel` in CI
  - Coverage thresholds that target the risky paths (money, auth, tenancy), not 100% vanity
- **Hands-on Lab**: Reach full coverage of the inventory API's mutation paths and add a CI job that fails on spec drift or uncovered critical branches

### Module 7: Deployment and Operations (Week 7)

- **Production configuration**
  - `config:cache`, `route:cache`, `event:cache`, and the `env()` traps they expose
  - Octane (FrankenPHP/Swoole) — worker lifecycle, state leakage, and warm-up
- **Shipping without downtime**
  - Health and readiness endpoints; draining connections before restart
  - Backward-compatible migrations (expand/contract) so old and new code coexist
- **Operating the API**
  - Structured logs with `trace_id`, slow query logging, and alert-worthy metrics
  - Redis-backed rate limits and sessions across multiple app servers
- **Hands-on Lab**: Deploy the API behind a load balancer, roll out an expand/contract migration, and prove zero dropped requests during a rolling restart

## Final Project

Learners ship a deployed, documented, tested inventory-and-orders API. The deliverable must include a published OpenAPI document that matches the running server byte for byte, token authentication with per-route abilities and rate limits, resources with a single pagination envelope and no lazy-loading violations, FormRequest validation for every mutating endpoint, queued jobs for report generation and outbound webhooks with idempotency guards, and a test suite that covers authorization boundaries and validation failures.

The deployment component is graded as part of the project: the API runs on a production-like environment with cached config and routes, health checks wired to the load balancer, structured logs carrying `trace_id`, and a demonstrated rolling restart with no failed requests in the access log. A short architecture note must defend the versioning choice, the pagination strategy, and where asynchronous work was placed.

## Assessment Criteria

- **Assignments**: Weekly labs are graded on adherence to the contract (payload shape, status codes, error envelope), absence of N+1 queries on listing endpoints, correctness of authorization tests, and idempotency behaviour under forced retries. A lab that passes its own tests but leaves a cross-tenant read path open does not pass.
- **Final Project**: Evaluated on the four risk areas — authentication and authorization, data integrity under retries, contract fidelity between spec and server, and operational readiness (health checks, logs, migrations). Reviewers replay the OpenAPI document against a fresh deployment and diff the responses.
- **Peer Review**: Each learner reviews one classmate's project against the same checklist and files findings that cite request/response evidence; the review itself is graded for accuracy.

## References

- [Laravel documentation](https://laravel.com/docs) — routing, middleware, validation, queues, and testing reference
- [Laravel Sanctum](https://laravel.com/docs/sanctum) — token and SPA authentication
- [Eloquent API Resources](https://laravel.com/docs/eloquent-resources) — serialization layer reference
- [Laravel Octane](https://laravel.com/docs/octane) — worker lifecycle and production serving
- [Laravel Horizon](https://laravel.com/docs/horizon) — queue supervision and metrics
- [Pest documentation](https://pestphp.com/docs) — the testing syntax used in the labs
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0) — contract authoring rules
- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/) — naming, versioning, and compatibility conventions
- [JSON:API specification](https://jsonapi.org/) — an alternative envelope worth comparing against

---
title: "Advanced Express.js Syllabus"
description: "An 8-module advanced course covering Express.js internals, performance, security hardening, observability, deployment, scaling, testing, and long-lived architecture."
category: "backend"
technology: "expressjs"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced Express.js Syllabus

## Overview

Most Express material stops at routing and middleware. This course starts there and moves into what decides whether a service survives production: how the request pipeline really executes, where latency hides, how to harden a public API, how to observe a system you cannot attach a debugger to, and how to scale it without a rewrite.

Eight modules, roughly two weeks each, built around one running service that students extend every module. Each module pairs a short theory block with a measurable deliverable, so progress shows up in load-test numbers, audit findings, or dashboards rather than quiz scores.

Order matters. Internals and performance come first because later modules assume students can read a flame graph and reason about event-loop blocking. Architecture comes last so structural decisions are informed by everything measured before it.

## Curriculum

### Module 1: Request Pipeline Internals
- **The router as a matching engine**
  - Layer stack, path-to-regexp compilation, mount-point stripping
  - `next()` semantics, sync vs async middleware, and why calling `next()` twice corrupts state
- **Ordering and failure modes**
  - Body parsers before routers, error handlers last, 404 fallthrough
  - Diagnosing "headers already sent" and silent double responses
- **Lifecycle**: unhandled rejections, `server.close()` vs in-flight requests
- **Deliverable**: A written trace of one request through a 12-middleware stack, plus a fixed ordering bug in the starter repository.

### Module 2: Performance Engineering
- **Measure before optimizing**
  - Autocannon and k6 baselines, p50/p95/p99, throughput vs concurrency curves
- **Hot-path costs**
  - JSON serialization, per-request allocations, regex routes, compression trade-offs
- **Caching layers**: HTTP cache headers, ETags, Redis response caching, stampede protection
- **Deliverable**: Cut p95 of the reference endpoint by 40% and document the measurement method.

```javascript
// scripts/bench.js — repeatable baseline before any optimization
const autocannon = require("autocannon");

(async () => {
    const result = await autocannon({
        url: process.env.TARGET_URL || "http://localhost:3000/orders",
        connections: 50,
        duration: 20,
        headers: { authorization: `Bearer ${process.env.BENCH_TOKEN}` },
    });
    console.log({
        rps: Math.round(result.requests.average),
        p95: result.latency.p95,
        errors: result.errors,
    });
    // Non-zero exit when the baseline drifts, so CI catches regressions
    if (result.errors > 0 || result.latency.p95 > 250) {
        process.exitCode = 1;
    }
})().catch((error) => {
    console.error("benchmark failed:", error);
    process.exit(1);
});
```

### Module 3: Security Hardening
- **Attack surface mapping**: schema validation at every boundary, output shaping to prevent data leaks
- **Transport and headers**: Helmet, HSTS, CORS as an allowlist not a wildcard, cookie flags
- **AuthZ beyond authentication**: object-level authorization, tenant isolation, IDOR in nested resources
- **Abuse resistance**: rate limits by identity and IP, request size caps, slow-loris timeouts, dependency audit
- **Deliverable**: A threat model plus remediated findings from an OWASP Top 10 pass against the service.

### Module 4: Observability
- **Structured logging**: Pino, request-scoped correlation IDs, meaningful levels, PII redaction
- **Metrics that answer questions**: RED method (rate, errors, duration), histogram buckets, bounded label cardinality
- **Tracing**: OpenTelemetry auto-instrumentation, context propagation across async boundaries
- **Deliverable**: A dashboard where one failing request is traceable from alert to log line.

### Module 5: Deployment and Release Engineering
- **Containers**: multi-stage builds, non-root user, signal handling for clean shutdown
- **Runtime config**: twelve-factor configuration, secret injection, environment validation at boot
- **Release strategy**: rolling vs blue-green, readiness gates, migrations decoupled from deploys, rollback plan
- **Deliverable**: A pipeline that deploys, verifies a health check, and rolls back in under five minutes.

### Module 6: Scaling
- **Statelessness**: externalized sessions, sticky sessions vs shared state, idempotency keys
- **Horizontal scale**: cluster mode and replicas, connection-pool math, the database as the real bottleneck
- **Backpressure**: queue-based workload isolation, timeouts, circuit breakers, bulkheads
- **Deliverable**: A load test at 5x baseline showing bounded p99 and no pool exhaustion.

```yaml
# k8s/express-deployment.yaml (excerpt): readiness before traffic, graceful drain
spec:
  replicas: 4
  strategy:
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: api
          image: registry.example.com/orders-api:1.14.0
          readinessProbe:
            httpGet: { path: /health/ready, port: 3000 }
            periodSeconds: 5
```

### Module 7: Testing in the Large
- **Layered suites**: unit tests for rules, supertest integration tests for HTTP contracts, a thin E2E layer
- **Isolation and speed**: per-worker schemas, truncation over migration, deterministic clocks and IDs
- **Quality gates**: per-directory coverage thresholds, mutation testing on critical modules, flake budgets
- **Deliverable**: A CI pipeline running the full suite in under four minutes with zero flakes across 50 runs.

### Module 8: Architecture and Evolution
- **Layering that survives growth**: routers, services, repositories, dependency injection without a framework
- **Boundaries**: when to extract a service, contract testing, shared-nothing data ownership
- **Legacy migration**: strangler-fig, dual writes, feature flags, a deprecation policy for public APIs
- **Deliverable**: An architecture decision record proposing the next extraction with cost, risk, and rollback.

## Final Project

Build **OrderFlow**, a production-grade ordering API, and take it from correct prototype to operable service.

- **Two bounded contexts**: orders and inventory, each with its own schema and repository layer, coordinated through a queue for stock reservation.
- **Contract-first API**: published OpenAPI spec, enforced request and response validation, a consistent error envelope carrying correlation IDs.
- **Security**: authenticated routes with object-level authorization, tenant scoping enforced in the repository layer, rate limits on write endpoints, clean dependency audit.
- **Observability**: structured logs with correlation IDs, RED metrics per route, a trace spanning handler, database query, and queue publish.
- **Performance**: p95 under 150 ms at 200 requests per second on reference hardware, benchmark script committed.
- **Operations**: containerized, readiness and liveness probes, graceful shutdown draining in-flight requests, migration runbook, one-command rollback.
- **Quality**: layered suite, per-directory coverage thresholds met, no flaky tests across 50 consecutive CI runs.

Deliverables: the repository, a 6-8 page design document covering the trade-offs in modules 2, 5, 6, and 8, and a 15-minute defense with a live load test and dashboard walkthrough.

## Assessment Criteria

- **Module deliverables (40%)**: Eight graded artifacts, judged on whether the stated metric is met and whether someone else can reproduce the measurement.
- **Design document (20%)**: Explicit trade-offs, rejected alternatives with reasons, honest treatment of what breaks first at 10x traffic.
- **Final project functionality (20%)**: All requirements implemented; correctness verified by the instructor's suite run against the submitted API.
- **Operational readiness (10%)**: Deployment, rollback, and observability demonstrated live, including one injected failure recovered without data loss.
- **Defense and code review (10%)**: Explain event-loop behaviour, pool sizing, and authorization decisions without notes.

Grading bands: 90+ production-ready with documented trade-offs; 75-89 correct and observable but with scaling gaps; 60-74 functional with weak operations; below 60 requires resubmission.

## References

- Express.js documentation and the 4.x to 5.x migration guide: https://expressjs.com
- Node.js diagnostics and event-loop guides: https://nodejs.org/en/learn/diagnostics
- OpenTelemetry JavaScript instrumentation: https://opentelemetry.io/docs/languages/js/
- OWASP ASVS and Top 10: https://owasp.org/www-project-application-security-verification-standard/
- "Designing Data-Intensive Applications" — Kleppmann, replication and partitioning chapters
- "Site Reliability Engineering" — Google, monitoring and handling-overload chapters
- Autocannon and k6 load testing docs: https://github.com/mcollina/autocannon and https://k6.io/docs/

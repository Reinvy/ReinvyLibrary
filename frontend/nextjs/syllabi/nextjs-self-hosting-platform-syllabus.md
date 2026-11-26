---
title: "Next.js Self-Hosting and Platform Engineering Syllabus"
description: "A twelve-module curriculum for running Next.js on infrastructure you control — build output internals, containers, shared cache handlers, proxy topology, zero-downtime releases, and production runbooks."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Next.js Self-Hosting and Platform Engineering Syllabus

## Overview

Most Next.js material stops at the deploy button. This syllabus starts there. It is a
twelve-week program for engineers who must operate a Next.js application on
infrastructure their team owns — bare VMs, Kubernetes, or a single VPS behind nginx — and
who are tired of guessing what the framework does between `next build` and the first
request.

The mental shift this curriculum enforces is that a self-hosted Next.js deployment is not
"a Node server with extra steps". It is four cooperating layers: a build artifact with a
strict file contract, a request-time renderer with its own cache semantics, a shared
storage tier that makes incremental regeneration survive multiple instances, and a
network edge that has opinions about cache headers. Break any one of them and you get
stale pages, duplicate renders, or a rollout that drops in-flight requests.

Every module ends with an artifact you could paste into an incident review: a trace, a
cache header dump, a load test report, a runbook. Total effort is roughly 8–10 hours per
module including the lab. Participants are expected to already be comfortable with the App
Router, React Server Components, and Docker fundamentals.

## Curriculum

### Module 1: The Build Artifact and Its Contract

- **What `next build` actually produces**
  - `.next/standalone` versus `.next/server`: which files the production server reads and which it never touches
  - Output file tracing and why optional native dependencies (`sharp`, `@swc/core`) detach silently
  - `next.config.js` values baked at build time versus read at runtime — the source of most "works locally, wrong in staging" bugs
- **Runtime selection**
  - Node runtime versus Edge runtime: what is unavailable in each, and how to audit a route boundary
  - Request lifecycle in self-hosted mode: middleware, then the route handler or RSC render, then the streaming response
- **Lab**: Build the reference app, then run the standalone server from a clean directory containing nothing but the traced files

### Module 2: Containerising Next.js Properly

- **Multi-stage images**
  - Builder stage with full dependencies, runner stage with the traced output only
  - Cache-friendly layer ordering for the lockfile and the `node_modules` install
  - Non-root user, read-only root filesystem, and the writable paths the cache layer needs
- **Operational basics**
  - Health versus readiness endpoints: what each should actually check
  - Signal handling and graceful shutdown; why `next start` must not be PID 1 in production
  - Image size budget and the cost of shipping build tooling into the runner stage
- **Lab**: Produce an image under 200 MB that boots in under three seconds and passes a readiness probe

### Module 3: Shared Cache and Incremental Regeneration at Scale

- **The default cache is a liability**
  - Why the file-system cache works on one instance and silently fractures across three
  - `cacheHandler` contract: `get`, `set`, `revalidateTag`, and what each call must guarantee
- **Building the shared tier**
  - A Redis-backed cache handler with tag indexing and TTL enforcement
  - On-demand revalidation endpoints, authenticated, with idempotent semantics
  - Cache stampede control: single-flight regeneration instead of N concurrent renders
- **Lab**: Run three instances behind a load balancer and prove a tag revalidation reaches all of them within 500 ms

### Module 4: Proxy and CDN Topology

- **The edge in front of the renderer**
  - nginx, Caddy, and Traefik as reverse proxies: header preservation, timeouts, buffering
  - Which cache headers Next.js emits and which the proxy rewrites; the `Vary` header traps around cookies and locale
  - Static assets versus rendered HTML: two completely different caching policies
- **Hard cutovers and soft ones**
  - `stale-while-revalidate` as a degradation strategy, not a performance trick
  - Asset prefixing and cache busting when the CDN has a long TTL
- **Lab**: Capture and annotate the full header path from browser to renderer to cache for three route types

### Module 5: Stateless Instances and Session Topology

- **Where instance identity leaks**
  - In-memory rate limiters, per-process counters, and local file uploads as scaling blockers
  - Session stores: Redis sessions versus signed cookies, and the revocation trade-off
  - Sticky sessions as a diagnostic tool, never as an architecture
- **Cross-cutting state**
  - Distributed locks for one-shot jobs triggered from Server Actions
  - Idempotency keys for mutations that may retry through a proxy
- **Lab**: Scale from one to five instances under load without losing a session or double-charging a mutation

### Module 6: Zero-Downtime Releases

- **Rollout strategies**
  - Blue-green with a traffic switch, rolling with readiness gates, canary with metric comparison
  - Connection draining: how long in-flight streaming responses actually take to finish
  - Migration ordering when the schema and the code must both change
- **Reversibility**
  - Cache warming before the switch so the first user is not the first renderer
  - Rollback that does not require a rebuild, and the artifact retention policy that makes it possible
- **Lab**: Deploy a breaking schema change across two releases with zero failed requests in the load generator

### Module 7: Observability Wiring

- **Instrumentation from the inside**
  - The `instrumentation.ts` hook, OpenTelemetry SDK registration, and exporter configuration
  - Spans that follow a request from proxy through RSC render into the data layer
  - Structured logging with request and trace identifiers propagated from the edge
- **Signals that matter**
  - Server-side timing versus field Core Web Vitals; why lab numbers never match field numbers
  - Error taxonomy: build failures, render errors, hydration mismatches, upstream timeouts
- **Lab**: Trace one slow page end to end and attribute the latency to a specific span, not a guess

### Module 8: Data Access and Connection Budgets

- **Pooling under serverless-shaped concurrency**
  - One client per process versus per request; the failure mode each produces
  - PgBouncer, Prisma connection limits, and the arithmetic of instances times pool size times replicas
  - Query timeouts that are shorter than the proxy timeout, always
- **Cache boundaries**
  - What belongs in the Next.js cache, what belongs in Redis, and what belongs in the database
  - Invalidation ownership: one writer, one tag namespace, no scattered deletions
- **Lab**: Load test until the database refuses connections, then fix the budget rather than the threshold

### Module 9: Hardening a Self-Hosted Deployment

- **Headers and content policy**
  - CSP with nonce propagation through middleware and the render
  - HSTS, frame ancestors, and the headers a proxy tends to strip
- **Access control at the perimeter**
  - Rate limiting that survives multiple instances, keyed on the right dimension
  - Secret distribution without baking values into images; rotation without a rebuild
- **Lab**: Pass an internal security review checklist with evidence per item

### Module 10: Capacity, Cost, and Load Testing

- **Measuring before promising**
  - A k6 scenario that models real navigation, not just homepage hammering
  - Latency percentiles as the SLO currency; why averages hide the incident
  - Capacity model: requests per second per instance at a fixed p95, plus headroom policy
- **Scaling signals**
  - CPU versus queue depth versus event-loop lag as autoscaling inputs
  - Cold start behaviour and the cost of scaling to zero
- **Lab**: Publish a sizing document with a defensible instance count and a stated headroom assumption

### Module 11: Runbooks and Incident Response

- **Operational artefacts**
  - Runbooks for the five failures that actually happen: cache miss storm, connection exhaustion, bad release, upstream timeout, certificate expiry
  - Alert design: symptom-based pages, cause-based dashboards
  - Error budgets and the review meeting they feed
- **Practising failure**
  - Game days with a deliberately broken cache handler and a stalled release
  - Post-incident write-ups that end in a code or configuration change, never in "be more careful"
- **Lab**: Write and execute a runbook your teammate has never seen, timed

### Module 12: Capstone — Own the Platform

- **Integration**
  - Combine container, cache, proxy, observability, and release strategy into one operating model
  - Document the architecture as a set of decisions with explicit rejected alternatives
- **Review**
  - Peer review against the module checklists
  - A live failure injection the candidate has not seen before
- **Lab**: Present the platform, then survive the injection

## Final Project

Build and operate **Relay**, a self-hosted content platform with three instances behind a
reverse proxy, a Redis-backed `cacheHandler`, and a documented release process. Required
artefacts:

- A production image built in multi-stage mode and running as a non-root user
- Proof of cross-instance tag revalidation, captured from all three instances
- An annotated header trace showing static assets and rendered HTML taking different
  cache paths
- An OpenTelemetry trace of one request spanning proxy, render, and database
- A load test report with a capacity recommendation and stated headroom
- Five runbooks, one of which you executed live during a game day
- A written rollback drill with measured time to recovery

The platform must survive one unannounced failure injected by the instructor: a killed
cache node, a stalled release, or an exhausted connection pool. Recovery is graded on time
and on whether the runbook was followed without improvisation.

## Assessment Criteria

- **Module labs (40%)**: Graded on whether the artefact proves the claim. A screenshot is
  not evidence; a trace, a header dump, or a load report is.
- **Decision records (15%)**: Every module produces a short record naming the trade-off and
  the rejected alternative. Vague records score zero, regardless of working code.
- **Final project (35%)**: Correctness under multi-instance conditions, observability
  coverage of the critical path, and a rollback that actually runs.
- **Failure injection response (10%)**: Time to recovery, adherence to the runbook, and the
  quality of the follow-up change.
- **Passing bar**: 75% overall, with no single category below 60%. Labs that only work on a
  single instance do not count as passing.

## References

- Next.js self-hosting and deployment documentation — https://nextjs.org/docs/app/building-your-application/deploying
- Next.js `cacheHandler` configuration reference — https://nextjs.org/docs/app/api-reference/next-config-js/incrementalCacheHandlerPath
- OpenTelemetry JavaScript instrumentation — https://opentelemetry.io/docs/languages/js/
- Docker multi-stage build documentation — https://docs.docker.com/build/building/multi-stage/
- nginx caching and proxying guide — https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/
- PgBouncer configuration reference — https://www.pgbouncer.org/config.html
- k6 load testing documentation — https://grafana.com/docs/k6/latest/
- Google SRE Workbook, chapters on SLOs and incident response
- Betsy Beyer et al., *Site Reliability Engineering* (alerting and postmortem chapters)

---
title: "Elysia.js Edge and Serverless Syllabus"
description: "A 12-week advanced curriculum on running Elysia.js outside a long-lived server — WinterTC portability limits, adapter selection and the fetch contract, Cloudflare Workers and Durable Objects, edge storage, Deno Deploy and managed edge platforms, Lambda packaging, edge-safe authentication, caching and request coalescing, cross-runtime contracts, observability in ephemeral processes, the multi-runtime test matrix, and runtime selection backed by a cost model."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Elysia.js Edge and Serverless Syllabus

## Overview

Elysia.js is built on Web Standard `Request` and `Response`, which means the same application object can be served by Bun, Node.js, Deno, a Cloudflare Worker, or a Lambda invocation. That property is easy to demonstrate with a hello-world route and considerably harder to preserve once an application has authentication, a database, background work, file uploads, and a caching strategy. Portability breaks quietly: a `node:fs` import buried in a plugin, a schema that inflates the Worker bundle past its size limit, a connection pool opened per invocation, a log line that only exists in the platform's dashboard.

This 12-week advanced syllabus treats deployment target as an architectural decision rather than a hosting detail. The curriculum starts from the constraints every non-server runtime shares — no long-lived process, no shared heap, capped CPU time, cold starts paid per request — and works outward: how the fetch contract keeps one codebase deployable to several runtimes, how adapters and bundlers change that boundary, what each target's storage and state primitives actually guarantee, and where consistency assumptions silently fail when a request handler runs in an isolate that disappears afterwards.

The ordering is deliberate. Modules 1 and 2 establish the portability model and the build pipeline, because every later module depends on being able to answer "does this code run here, and does it still fit in the bundle". Modules 3 through 6 survey the concrete targets — Cloudflare Workers, edge storage, Deno Deploy and other managed edge platforms, then AWS Lambda and containers — each judged by the same questions: state, limits, and failure modes. Modules 7 through 10 cover the concerns that change shape most when the process is ephemeral: authentication and secrets, caching and request budgets, contracts and type safety, and observability. Module 11 turns the result into a delivery pipeline with a real test matrix, and Module 12 closes with runtime selection and a cost model, because at the edge the bill is a design constraint.

Students leave able to defend a deployment choice in review: why this workload belongs at the edge or does not, which consistency guarantee the cache depends on, what happens to in-flight work when an isolate is evicted, and what the request costs at the traffic volume the product expects.

## Curriculum

### Module 1: Runtime Constraints and the Portability Problem (Week 1)

- **What "Edge" Actually Changes**
  - No long-lived process: every assumption about module-level state, background timers, or an in-memory cache has to be re-examined
  - CPU-time ceilings per request rather than wall-clock generosity, and how a synchronous hot loop becomes a hard failure instead of a slow response
  - Cold starts as a per-request tax that varies by runtime, bundle size, and whether the isolate is reused or recycled
  - Memory limits per isolate, no shared heap between concurrent requests, and the resulting ban on in-memory counters for anything that must be correct
  - Egress and subrequest limits: a handler that fans out to six services may hit a platform quota before it hits a timeout
- **The WinterTC Baseline**
  - What is guaranteed: `Request`, `Response`, `Headers`, `fetch`, `ReadableStream`, `URL`, `AbortSignal`, `TextEncoder`, WebCrypto, `crypto.randomUUID`
  - What disappears or degrades: `node:fs`, `node:net`, `node:child_process`, native addons, synchronous crypto, and most of the `node:crypto` API surface
  - Feature detection over runtime sniffing: probing for `process.versions.bun` instead of testing capabilities is how code silently breaks on the next runtime
  - Compatibility shims (`nodejs_compat` on Workers, `Deno`'s npm specifiers) and the difference between "imports resolve" and "behaviour is correct"
- **Reading Elysia's Portability Model Correctly**
  - `app.fetch` as the only boundary the framework needs — a Web Standard handler that any runtime can call
  - Adapter selection: Bun's native `listen`, the `@elysia/node` adapter for Node.js, and the web-standard path for runtimes with no adapter at all
  - Bun-first reality: some plugins, file helpers, and bundler assumptions are Bun-specific, so "runs on Elysia" is not the same claim as "runs anywhere Elysia runs"
  - Where framework features map to runtime features (WebSocket, streaming, file handling) and where they quietly fall back
- **The Portability Audit**
  - Dependency graph scan for `node:` imports, native modules, and packages that spawn processes or touch the filesystem at import time
  - Classifying each dependency as pure, edge-safe, or edge-hostile, with the reason recorded — the reason is what survives the next dependency upgrade
  - Bundle-size accounting before the first deployment: schema libraries, validation compilers, and SDKs are the usual offenders
- **Hands-on Lab**: Audit an existing Elysia.js service for edge suitability. Produce a table of every runtime dependency with its classification, a bundle-size estimate, and a short list of changes required to run the service on a web-standard runtime.

### Module 2: One Codebase, Many Runtimes — The Fetch Contract (Week 2)

- **The Universal Entry Point**
  - Exporting the handler once and letting each runtime's bootstrap call it: Workers module syntax, `Bun.serve`, `Deno.serve`
  - Keeping bootstrap files thin — environment parsing, adapter selection, and nothing that the request handler later depends on implicitly
  - Local development parity: `bun dev` for iteration, `wrangler dev` for the target's real runtime, and the drift that appears when only one is used
- **A Handler That Travels**
  - The shared application module must never import a runtime-specific server API; the entrypoint does that, not the app
  - Environment access through a single injected config object rather than scattered `process.env` reads
  - Graceful degradation: features that cannot work on the target (filesystem uploads, long-lived WebSockets) should fail with a clear error at startup, not a stack trace mid-request

```typescript
// src/app.ts — the portable application, no runtime imports
import { Elysia, t } from 'elysia'

export const app = new Elysia({ prefix: '/api' })
  .get('/health', () => ({ status: 'ok' }))
  .post('/echo', ({ body }) => body, {
    body: t.Object({ message: t.String({ minLength: 1 }) })
  })

// src/bun.ts — Bun bootstrap
// Bun.serve({ fetch: app.fetch, port: 3000 })

// src/worker.ts — Cloudflare Worker bootstrap
// export default { fetch: app.fetch }

// src/deno.ts — Deno bootstrap
// Deno.serve(app.fetch)
```

- **Build Targets and Bundling**
  - Choosing the target per artifact: Bun for the container, `browser`/web-standard output for Workers, a Node target for Lambda containers
  - Single-file ESM output, tree-shaking, and why `--minify` changes startup time more than it changes throughput
  - Environment substitution at build time versus runtime configuration, and the trap of baking secrets into a bundle
  - Source maps retained for error reporting — bundled stack traces without maps are unreadable exactly when they matter
- **Adapter Selection Matrix**
  - Native runtime support, official adapter, and event-bridge options: which one carries which guarantees
  - Runtimes with no HTTP handler at all (Lambda, Cloud Functions) need an event-to-`Request` translation layer; that layer is where correctness bugs live
  - Verifying a new target with a conformance smoke suite before trusting it — status codes, headers, streaming, cookies, and body parsing
- **Configuration Portability**
  - One schema for env, validated at startup, with a failing exit code rather than an `undefined` at request time
  - Mapping secret stores across platforms (repository secrets, Worker secrets, SSM parameters) without changing application code
- **Hands-on Lab**: Refactor a service so a single `src/app.ts` is served by Bun locally and by a Worker in a deployed environment, with a conformance smoke suite that runs against both and asserts identical responses for the same requests.

### Module 3: Cloudflare Workers in Depth (Week 3)

- **Module Syntax and Local Development**
  - `export default { fetch: app.fetch }` plus `scheduled` and `queue` handlers; the Worker never calls `listen`
  - `wrangler` configuration: entry point, environment sections, routes, and per-environment bindings
  - `wrangler dev` in local mode with simulated bindings versus remote mode against real resources
  - `compatibility_date` pinning and what a compatibility flag changes underneath you
- **Bundle and Limit Arithmetic**
  - Compressed size limits per plan and what actually counts: TypeBox schemas, OpenAPI generation, and a bundled ORM dominate
  - Splitting a large application: a hot public route in one Worker, admin and reporting routes in another behind a service binding
  - Startup cost versus request cost: heavy module-level initialization is charged to the first request of every isolate
- **Bindings Instead of Clients**
  - Treating bindings as injected dependencies: `KV`, `D1`, `R2`, `Hyperdrive`, `Queue`, `AI`, and service bindings, all passed through the app's config object
  - Why connection-per-request is fatal here and what replaces it (Hyperdrive, HTTP drivers, or an origin service)
  - Typing bindings so the app compiles against an interface rather than the platform
- **Streaming and Request Bodies**
  - Request bodies are streams: reading them twice is impossible, and multipart handling needs a streaming parser
  - Response streaming for server-sent events and large exports, including flush behaviour through the CDN
  - Abort signals on client disconnect and cancelling downstream work instead of letting it finish unobserved
- **Hands-on Lab**: Deploy an Elysia.js API to Workers with KV for cached reads and a service binding to a second Worker. Measure cold-start and warm p95 latency, then reduce bundle size and re-measure.

### Module 4: Edge Storage and State (Week 4)

- **KV: Fast Reads, Eventual Writes**
  - Global read latency with write propagation that is not immediate — designing features that tolerate stale reads
  - No atomic increments, no compare-and-swap: counters and quotas need a different primitive
  - Metadata, expiration, and bulk reads; cache warming strategies after a deploy
- **D1: SQLite Semantics at the Edge**
  - Single-writer behaviour, read replication, and where transactions stop being what a Postgres-trained developer expects
  - Batched statements, prepared statement reuse, and the cost of many small round trips from one handler
  - Schema migrations run through the platform's tooling, and keeping migration state consistent across environments
- **R2: Object Storage for Uploads and Exports**
  - S3-compatible semantics without egress fees; presigned URLs generated by the Worker so bytes never pass through it
  - Multipart uploads for large files, and where to stream a response body directly from an object
- **Durable Objects: Coordination That Is Actually Correct**
  - Single-writer guarantees, in-object storage, and SQLite-backed objects for structured state
  - Rate limiters, idempotency keys, counters, and WebSocket collaboration rooms as the canonical use cases
  - WebSocket hibernation and alarms as the alternative to the background timers that do not exist here
  - Cost shape: duration and requests per object, and why per-user objects are more expensive than per-tenant ones
- **Choosing a Primitive**
  - A decision pass over the four: what consistency each offers, what it costs per operation, and which failure mode each introduces
- **Hands-on Lab**: Implement an idempotent write endpoint backed by a Durable Object and a cached read path backed by KV. Demonstrate correct behaviour under duplicate requests and a stale KV read.

### Module 5: Deno Deploy and Managed Edge Platforms (Week 5)

- **Deno as a Target**
  - `Deno.serve(app.fetch)` and the permission model; npm specifiers for packages that only ship to npm
  - Deno-specific APIs worth using (KV, cron, queues) and the portability cost of adopting them
- **Platform Behaviour That Differs**
  - Region coverage and request routing: where the code runs is part of the latency budget you promised
  - Build-on-push versus build-locally pipelines, and which one you can reproduce during an incident
  - Preview deployments per branch and how secrets are scoped per environment
- **Vercel and Other Managed Edge Runtimes**
  - The Web API subset, module size limits, and node-compat flags — the same constraints under different names
  - Edge versus regional functions: when "near the user" loses to "near the database"
  - Fastly Compute and similar WASM-based platforms: a different build step, the same fetch contract
- **Comparing Targets on Equal Terms**
  - Price per million requests, CPU-time billing, egress, and cold-start profile measured on your own workload rather than vendor benchmarks
  - Which platform primitives are load-bearing in your design, and therefore what a migration would cost
- **Hands-on Lab**: Port the Module 3 application to a second managed edge platform and produce a comparison of p95 latency, cold-start time, and monthly cost at a stated traffic level.

### Module 6: AWS Lambda and Serverless Containers (Week 6)

- **The Event Bridge Problem**
  - Lambda receives an API Gateway event, not a `Request`: the translation layer is where status codes, headers, cookies, and binary bodies are lost
  - Adapter options — a web adapter layer in front of the handler, or a small explicit shim you own and test
  - Response streaming mode and its constraints; buffered responses and their size ceiling
- **Packaging an Elysia.js Application**
  - Bundling to a Node target and shipping a single artifact, or shipping Bun in a container image
  - `arm64` for price-performance, image size discipline, and layer caching in CI
  - Native dependencies: the one class of package that makes the container path mandatory
- **Cold Starts and Concurrency**
  - Init-phase work: opening clients, warming caches, and parsing configuration exactly once per container
  - Provisioned concurrency as a latency purchase, and the traffic pattern that justifies it
  - Concurrency limits versus downstream connection limits: Lambda scales faster than your database accepts connections
- **Databases and Non-HTTP Triggers**
  - RDS Proxy or an HTTP-based data API instead of a raw pool per container
  - SQS, S3, and EventBridge handlers sharing the same application code through a separate entry point
  - Idempotency for at-least-once delivery, and where the deduplication record lives
- **Hands-on Lab**: Deploy the same Elysia.js application as a Lambda container behind an HTTP API, measure cold-start and warm p95 latency, then add provisioned concurrency and quantify the difference.

### Module 7: Authentication and Secrets in Ephemeral Runtimes (Week 7)

- **Verifying Tokens with WebCrypto**
  - Why the familiar JWT libraries fail here: synchronous Node crypto, buffers, and native bindings
  - WebCrypto-based verification with JWKS, including key rotation and caching a fetched key set per isolate
  - Algorithm pinning, `aud`/`iss` validation, clock-skew handling, and rejecting `none`
- **Sessions That Survive Eviction**
  - Stateless signed cookies versus KV- or Durable-Object-backed sessions: revocation, size, and read cost trade-offs
  - Refresh rotation and reuse detection, including the race between two concurrent refreshes
  - Cookie attributes across a CDN: `Secure`, `SameSite`, `__Host-` prefixes, and domain scoping mistakes that leak across subdomains
- **Secrets and Rotation**
  - Platform secret stores as the only source; nothing in the bundle, nothing in a committed config
  - Per-environment scoping, least privilege per binding, and a rotation procedure that does not require a code change
  - Rate-limit and abuse controls: Durable Object counters, WAF rules, and why KV is the wrong store for a strict limit
- **Browser-Facing Auth Concerns**
  - CORS with credentials, CSRF strategy for cookie sessions, and preflight behaviour through a CDN
  - Passkey and WebAuthn verification at the edge, and the parts that still need an origin service
- **Hands-on Lab**: Add JWKS-based authentication and Durable-Object rate limiting to the Module 3 Worker. Include a rotation drill: rotate the signing key with zero failed requests.

### Module 8: Caching, Coalescing, and Request Budgets (Week 8)

- **Cache API and CDN Semantics**
  - Explicit cache writes from the Worker, cache-key design (method, path, normalized query, selected headers), and purge strategy
  - `Vary` correctness: two dimensions is usually one too many at the edge
- **HTTP Caching Done Properly**
  - `Cache-Control`, `s-maxage`, `stale-while-revalidate`, and `ETag`-driven conditional requests handled by the framework
  - Personalised responses that must never be cached, and the header discipline that prevents it
- **Coalescing and Stampede Control**
  - Single-flight request collapsing with Durable Objects; the thundering herd that appears the moment a popular key expires
  - Lock timeouts and degraded responses instead of queueing until the CPU limit kills the request
- **Living Inside the Request Budget**
  - CPU time per request, subrequest caps, and fan-out patterns that stay under both
  - Moving expensive work off the hot path: queues for writes, scheduled handlers for aggregation
  - Measuring a cache hit rate before and after, and refusing to call a cache effective without the number
- **Hands-on Lab**: Add a cached read endpoint with single-flight protection. Run a burst of concurrent requests against a cold key and prove that the origin sees one call, not one hundred.

### Module 9: Contracts and Type Safety Across Runtimes (Week 9)

- **TypeBox as the Single Source of Truth**
  - One schema package shared by handlers, clients, and generated OpenAPI, so the contract cannot drift between deployments
  - Schema composition, discriminated unions, and the validation cost that composition adds on every request
- **Eden Treaty with a Portable Server**
  - Keeping type inference intact when the server is bundled for a non-Bun target, and where the types actually come from
  - Typed clients in the browser, in another Worker, and in scheduled jobs — one client, several consumers
- **Versioning and Compatibility**
  - URL versioning versus header negotiation, and which one is realistic when a CDN sits in front
  - Deprecation windows, additive-only changes, and consumer-driven contract tests that fail before a client does
- **Cost-Aware Validation**
  - Measuring schema validation against the CPU budget; trimming deep `t.Object` trees on the hottest routes
  - Request size limits enforced at the edge, before a body is ever parsed
- **Hands-on Lab**: Extract schemas into a shared package consumed by two deployments and one client. Add contract tests that fail the build when a response shape changes incompatibly.

### Module 10: Observability Without a Long-Lived Process (Week 10)

- **Logs as the Primary Record**
  - Structured JSON with a fixed field set: level, message, request id, route, status, duration, deployment id
  - Request ids generated at the edge and propagated downstream so a support ticket maps to a log line
  - Log drains, tail handlers, and sampling that keeps error paths complete while thinning successful traffic
- **Tracing Across the Edge Boundary**
  - Propagating trace context from the CDN through the Worker to the origin, and the places it gets dropped
  - Head-based sampling decisions made once at the entry point, not independently in every service
  - Span naming that reflects routes rather than function names, so latency can be aggregated per endpoint
- **Errors That Are Diagnosable Later**
  - Capturing invocation context — deployment id, region, isolate reuse hints, bindings in use — at the moment of failure
  - Source maps uploaded per deployment, and a rollback that keeps the map for the version being rolled back to
  - Distinguishing platform failures (eviction, limit exceeded, subrequest failure) from application errors
- **Metrics That Survive Ephemerality**
  - Deriving counters from logs instead of memory; platform analytics for request counts and CPU time
  - Synthetic checks from multiple regions, since "up in one colo" is a real failure mode
  - Alerting on symptoms the user experiences: p95 latency, error rate, cache hit-rate collapse
- **Hands-on Lab**: Instrument the deployed service end to end — structured logs, trace propagation into the origin, and a dashboard built from log-derived metrics. Reproduce a deliberate failure and diagnose it from telemetry alone.

### Module 11: The Multi-Runtime Test Matrix and Delivery (Week 11)

- **Testing at the Right Level**
  - Unit tests with `bun:test` against the portable app module; no listening server required
  - Integration tests against the target runtime locally — `wrangler dev`, `workerd`, Miniflare — so binding behaviour is exercised, not mocked
  - A conformance suite that runs the same requests against every target and diffs the responses
- **CI as a Build-Once, Deploy-Many Pipeline**
  - One build step producing per-target artifacts; a matrix job that deploys each and runs its smoke suite
  - Secrets per environment, deployment tokens with minimal scope, and no production credentials in fork builds
- **Progressive Delivery**
  - Preview environments per pull request; canary or gradual rollout; instant rollback and the metric that triggers it
  - Deploy-time migrations: expand-and-contract so the rollback path is real
- **Infrastructure in the Repository**
  - Wrangler and platform configuration committed, reviewed, and diffed like code
  - Promotion between environments by artifact, not by rebuild — a rebuild is a different artifact
- **Hands-on Lab**: Build the pipeline: one commit, three targets, a conformance suite per target, and a canary deploy with automatic rollback on error-rate regression.

### Module 12: Runtime Selection and Cost Modelling (Week 12)

- **A Decision Framework, Not a Preference**
  - Latency budget, data locality, consistency requirement, operational appetite, and team familiarity — scored before a platform is chosen
  - Workloads that genuinely benefit (auth checks, personalisation, cached reads, request shaping) and workloads that do not (long transactions, heavy report generation, anything needing a filesystem)
- **Building the Cost Model**
  - Request count, CPU-milliseconds, egress, KV and D1 read/write units, Durable Object duration, and log volume as separate lines
  - The break-even point between edge and container, computed for a stated traffic profile rather than quoted from a pricing page
  - Hidden costs: preview deployments, observability ingestion, and the operational time to maintain a second runtime
- **Hybrid Topologies**
  - Edge reads with a regional origin for writes, a backend-for-frontend that shapes responses near users
  - Strangler migration: route by path, measure, then move the next path — never a big-bang cutover
- **Exit Strategy**
  - Which platform-specific primitives are load-bearing, what a port would cost in engineering weeks, and the seams that keep it possible
  - A written risk register: quota changes, pricing changes, deprecations, and the fallback for each
- **Hands-on Lab**: Produce a total-cost-of-ownership sheet for one workload across three deployment targets, with assumptions stated, and a one-page recommendation defended against that sheet.

## Final Project

Build **Portable Elysia.js Edge Service**, a single application deployed to two production targets with one codebase:

- A public read-heavy API with a cached, single-flight-protected endpoint and an authenticated write endpoint
- Storage that matches each target's guarantees: KV or D1-backed reads, a Durable Object for idempotency and rate limiting, R2 for uploads if the workload includes files
- JWKS-based authentication with key rotation, cookie-based sessions or signed tokens, and a documented revocation path
- A shared TypeBox schema package, an OpenAPI document generated from it, and a typed client consumed by a small front end or a scheduled job
- Structured logs, trace propagation into an origin service, and one dashboard built from log-derived metrics
- A delivery pipeline: build once, deploy per target, run a conformance suite against each, canary with automatic rollback
- A written architecture decision record covering runtime choice, consistency trade-offs, cost at expected traffic, and the exit plan

Stretch goals: a queue consumer or scheduled aggregation handler sharing the same application code; a Lambda deployment of the same handler behind an event bridge; a load test at ten times expected traffic with the resulting cost delta.

## Assessment Criteria

- **Weekly labs (40%)**: each lab is graded on whether the measurement was actually taken. A lab claiming a latency improvement without before/after numbers, or a cache without a hit rate, scores at most half.
- **Architecture decision record (20%)**: states the constraint that drove the choice, the alternative rejected, the failure mode accepted, and the cost at a stated traffic volume. Claims must be traceable to a measurement from the course.
- **Final project (30%)**: both targets pass the conformance suite; the write path is idempotent under duplicate delivery; cache and rate-limit behaviour are demonstrated under concurrency; rollback is exercised at least once; telemetry is sufficient to diagnose a deliberately injected failure.
- **Code review participation (10%)**: reviews identify portability hazards (runtime-specific imports, unbounded fan-out, state held in memory) with a concrete consequence, not a style preference.

Grading bands: a passing project runs on both targets and degrades predictably at its limits; a strong project additionally quantifies where each target wins and documents the conditions under which the recommendation would change.

## References

- Elysia.js documentation — Node.js integration and runtime adapters: <https://elysiajs.com/integrations/node>
- Elysia.js documentation — Deno integration and the web-standard fetch handler: <https://elysiajs.com/integrations/deno>
- Elysia.js quick start and WinterTC compatibility notes: <https://elysiajs.com/quick-start>
- WinterTC (Web-interoperable Runtimes Community Group) minimum common API: <https://wintertc.org/>
- Cloudflare Workers documentation — runtime APIs, limits, and compatibility flags: <https://developers.cloudflare.com/workers/>
- Cloudflare Durable Objects and D1: <https://developers.cloudflare.com/durable-objects/> and <https://developers.cloudflare.com/d1/>
- Cloudflare Hyperdrive for origin database pooling: <https://developers.cloudflare.com/hyperdrive/>
- Deno Deploy documentation: <https://docs.deno.com/deploy/>
- AWS Lambda documentation — container images, response streaming, and provisioned concurrency: <https://docs.aws.amazon.com/lambda/>
- OpenTelemetry JavaScript SDK and semantic conventions: <https://opentelemetry.io/docs/languages/js/>
- MDN Web APIs — Fetch, Streams, and Web Crypto: <https://developer.mozilla.org/en-US/docs/Web/API>

---
title: "Next.js Enterprise Architecture Syllabus"
description: "An eight-module curriculum that takes experienced React developers from App Router fundamentals to a production-grade, observable Next.js platform."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Next.js Enterprise Architecture Syllabus

## Overview

This syllabus is a twelve-week, eight-module program for teams that already ship React
applications and now need a Next.js codebase that survives multiple product squads,
quarterly dependency upgrades, and a security review. It deliberately avoids
"hello world" routing tutorials. Every module ends with a decision record, because the
hard part of enterprise Next.js is not writing a page — it is defending the boundaries
between rendering, data, and deployment.

The structure moves outward from a single rendering boundary (App Router) to the edges of
the organisation (monorepo, observability, deploy). Each module assumes the previous one
landed: you cannot instrument a data layer that has no contract, and you cannot split a
monorepo before your imports are explicit. Total effort is roughly 8–10 hours per module,
including the lab.

## Curriculum

### Module 1: App Router Mental Model
- **Rendering boundaries**
  - Server Components versus Client Components, and where `"use client"` belongs
  - Streaming with `loading.tsx` and Suspense boundaries
  - Route groups, parallel routes, and intercepting routes for modal patterns
- **Lab**: Convert a pages-router dashboard to App Router without regressing SEO metadata

### Module 2: Data Layer and Caching Contracts
- **Fetching strategy**
  - `fetch` caching levels (`force-cache`, `no-store`, `revalidate`) and tag-based invalidation
  - Server Actions versus Route Handlers: choosing by trust boundary, not by fashion
  - Validation at the edge of the system with Zod schemas shared across client and server
- **Lab**: Design a cache-invalidation matrix for a product catalogue with 40k SKUs

### Module 3: Authentication and Authorisation
- **Session architecture**
  - Cookie-based sessions versus JWT access tokens; rotation and revocation
  - Middleware for coarse gating, server-side checks for resource authorisation
  - Multi-tenant scoping: tenant id in the session, never from a request body
- **Lab**: Implement role and tenant checks with a failing test for every bypass attempt

### Module 4: Testing Strategy
- **The testing pyramid for server-rendered UI**
  - Unit tests for pure logic and schema validators
  - Integration tests against Route Handlers using real request objects
  - End-to-end smoke tests with Playwright for auth and checkout flows
- **Lab**: Reach 70% coverage on business logic without a single snapshot test

### Module 5: Performance Budgets
- **Measurement before optimisation**
  - Core Web Vitals field data versus lab data; choosing the number you commit to
  - Bundle analysis, `next/dynamic`, and the cost of a client component boundary
  - Image, font, and third-party script discipline
- **Lab**: Enforce a bundle-size budget in CI that fails the pull request on regression

### Module 6: Monorepo and Shared Packages
- **Workspace layout**
  - `apps/` and `packages/` split with Turborepo task pipelines
  - Internal packages for design system, config, and generated API clients
  - Dependency boundaries: what may import what, enforced by lint rules
- **Lab**: Extract a shared UI package used by two apps with no duplicated Tailwind config

### Module 7: Observability
- **Signals that matter**
  - Structured logging with request and trace identifiers propagated end to end
  - OpenTelemetry spans for Server Actions and upstream API calls
  - Error taxonomy: expected validation errors versus incidents that page a human
- **Lab**: Trace one failing checkout across browser, server, and payment provider

### Module 8: Deployment and Release Engineering
- **Shipping safely**
  - Environment parity, secret management, and preview deployments per pull request
  - Build-time versus runtime configuration; why `NEXT_PUBLIC_` is a public contract
  - Canary rollout, cache warm-up, and rollback drills
- **Lab**: Ship a feature behind a flag, roll it back in under five minutes, document the drill

## Final Project

Build **Atlas Console**, a multi-tenant admin platform for a fictional logistics company.
It must include: authenticated tenant-scoped dashboards, a cached product catalogue with
tag-based invalidation, one Server Action with full validation and audit logging, a shared
design-system package consumed by a second smaller app, and end-to-end traces exported to
an OpenTelemetry collector. Deliverables are the running deployment, an architecture
decision record per module, and a written rollback plan that a teammate can execute
without you.

## Assessment Criteria

- **Module labs (40%)**: Each lab is graded on correctness, the decision record, and whether
  the trade-off is stated explicitly rather than implied.
- **Code review participation (10%)**: Two structured reviews of a peer's pull request using
  the boundary checklist from Modules 1 and 6.
- **Final project (40%)**: Architecture clarity, cache correctness under invalidation,
  authorisation tests that actually fail when the guard is removed, and observability
  coverage of the checkout path.
- **Rollback drill (10%)**: Executed live; graded on time to recovery and clarity of the
  written runbook.
- **Passing bar**: 75% overall, with no single category below 60%.

## References

- Next.js official documentation — https://nextjs.org/docs
- React Server Components RFC — https://github.com/reactjs/rfcs/pull/188
- Turborepo handbook — https://turborepo.com/docs
- OpenTelemetry JavaScript instrumentation — https://opentelemetry.io/docs/languages/js/
- Web Vitals guidance — https://web.dev/articles/vitals
- Martin Kleppmann, *Designing Data-Intensive Applications* (chapters on replication and
  consistency, for the caching module)
- Sam Newman, *Building Microservices* (second edition), for the boundary and deployment
  modules

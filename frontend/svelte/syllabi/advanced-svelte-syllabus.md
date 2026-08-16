---
title: "Advanced Svelte 5 Runes and SvelteKit Architecture Syllabus"
description: "A comprehensive 12-week advanced curriculum for experienced Svelte developers covering the Svelte 5 runes reactivity model, snippets and render props, server islands, large-scale state architecture, advanced data loading and caching, performance engineering, security hardening, observability, and monorepo-scale application design."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced Svelte 5 Runes and SvelteKit Architecture Syllabus

## Overview

This 12-week advanced syllabus is designed for developers who already build applications with Svelte and SvelteKit and want to master the framework at production scale. While the introductory Svelte curriculum focuses on component syntax, stores, forms, and getting an app deployed, this course goes one level deeper: the Svelte 5 runes reactivity model (`$state`, `$derived`, `$effect`, `$props`, and friends), snippets as a composition primitive, server islands and advanced rendering strategies, cache invalidation and streaming data patterns, performance engineering with measurable budgets, security hardening, observability, and organizing large codebases with monorepos and micro-frontends.

Each module pairs deep conceptual foundations with hands-on labs that require reading compiler output, profiling real applications, and designing architecture diagrams. The course culminates in a capstone project where learners design and build a large-scale, multi-team SvelteKit application with runes-based state architecture, server islands, a monorepo package layout, and production observability.

By the end of this course, learners will be able to explain how Svelte's compiler turns runes into fine-grained reactivity, migrate a legacy component tree from `$:` to runes, design snippet-based component APIs, choose among SSR, static, client-side, and server-island rendering per route, build resilient data-loading pipelines with cache invalidation, profile and optimize bundle and runtime performance, harden applications against common web attacks, and operate SvelteKit services in production with tracing and feature flags.

## Curriculum

### Module 1: The Runes Model and Svelte 5 Migration (Week 1)

- **From `$:` to runes**
  - Why Svelte 5 replaced `$:` reactive declarations and `export let` props with runes
  - The mental model shift: explicit reactivity markers instead of compiler inference
  - `$state`, `$derived`, `$effect`, `$props`, `$bindable`, `$inspect`, `$host` at a glance
- **Universal reactivity**
  - Using runes outside components: `.svelte.ts` and `.svelte.js` modules
  - Reactive state in plain class and function modules
  - The runes mode vs legacy mode: opting files in with the `runes` compiler flag
- **Migration strategy**
  - The automated migration tool and its limits
  - `$props()` vs `export let`: destructuring, defaults, and rest props
  - Converting stores to runes and back: interop patterns
  - Common migration pitfalls: `$effect` over-firing, snapshot semantics, `bind:` changes
- **Hands-on Lab**: Migrate a multi-component legacy Svelte 4 app to runes, verifying each behavior change with the Svelte 5 migration guide

### Module 2: Reactivity Internals and Runes Deep Dive (Week 2)

- **How runes compile**
  - Reading compiler output: `svelte.compile` and the generated signal calls
  - The signals underneath: `set`, `get`, `safe_not_equal`, and the reactive graph
  - Fine-grained updates vs virtual DOM diffing: why Svelte 5 avoids re-running whole components
- **The `$state` rune in depth**
  - `$state.raw` for large non-reactive objects and arrays
  - `$state.snapshot` and passing reactive state across boundaries
  - Deep reactivity, proxies, and the `structuredClone` semantics of snapshots
- **The `$effect` rune in depth**
  - Dependencies, effect ordering, and `$effect.pre`
  - `$effect.tracking` for detecting reactive context
  - `$effect.root` for manual effect lifecycle management
  - When not to use effects: derived values and event handlers first
- **The `$derived` rune in depth**
  - `$derived.by` for multi-statement derivations
  - Lazy evaluation and caching of derived values
  - Avoiding derived chains that recompute the same graph
- **`untrack` and `deep` control**
  - Ignoring dependencies with `untrack`
  - Opting into deep reactivity with `deep` on `$state`
- **Hands-on Lab**: Instrument a component with `$inspect` and `$effect` logs, trace its dependency graph, and restructure a component whose `$effect` fires too often

### Module 3: Advanced Component Composition with Snippets (Week 3)

- **Snippets as the new composition primitive**
  - `{#snippet name()}` and `{@render name()}` basics
  - Snippet props: passing markup as data
  - Default snippet content with `children`
- **Render props and renderless components**
  - Building renderless components with snippets
  - The `{@render}` contract and typed snippet props in TypeScript
  - Comparing snippets to legacy slot syntax and why slots are deprecated in runes mode
- **Recursive and nested snippets**
  - Recursive snippets for trees and nested data
  - Passing snippets to snippets: higher-order snippet patterns
  - Keyed snippet lists and memoization concerns
- **Designing snippet APIs**
  - When to use a snippet prop vs a component prop vs a slot
  - API stability: snippet contracts as public interfaces
  - Documenting snippet props for design systems
- **Hands-on Lab**: Refactor a data-table component from slot-based to snippet-based composition, then build a renderless `<Query>` component that accepts query, loading, and error snippets

### Module 4: Advanced Rendering Strategies and Server Islands (Week 4)

- **Rendering modes revisited**
  - CSR, SSR, SSG/prerender, and SPA fallback: choosing per route
  - `ssr`, `prerender`, and `csr` page options in depth
  - Hybrid rendering: mixing modes within one app
- **Server Islands**
  - The `server-islands` experimental feature: caching dynamic regions inside static pages
  - Island props, lazy loading, and fallback content
  - When server islands beat full SSR and when they do not
- **Streaming and progressive rendering**
  - Streaming promises from load functions to the client
  - `{#await}` with streaming data and skeleton UI
  - Combining streaming with server islands for personalized content
- **Edge rendering and adapters**
  - Adapter selection: node, static, vercel, netlify, cloudflare, and edge functions
  - Deploying to edge runtimes: constraints on Node APIs
  - Cache control at the edge: `Cache-Control`, CDN rules, and `setHeaders`
- **Hands-on Lab**: Convert a product-listing page to prerendered static HTML with a server island for the personalized cart, and measure TTFB and LCP before and after

### Module 5: State Architecture for Large Applications (Week 5)

- **Runes vs stores: choosing the right primitive**
  - When stores still win: cross-framework libraries, legacy code, module singletons
  - Converting store-based state to runes: patterns and trade-offs
  - Hybrid architectures: runes in components, stores at the boundary
- **Context-based state patterns**
  - `setContext` and `getContext` with runes
  - Scoped state trees: per-route, per-feature, per-instance state
  - Avoiding global state bugs: module-level state as an anti-pattern
- **Server state and client cache**
  - SvelteKit load functions as the source of truth
  - Client-side caching layers: TanStack Query, SWR-style stores, and custom caches
  - Optimistic updates and cache invalidation strategies
- **Form state at scale**
  - Superforms and zod validation for complex forms
  - Multi-step form state with runes
  - Draft persistence and offline queues
- **Hands-on Lab**: Design a runes-based state tree for a multi-tenant dashboard with per-tenant contexts, then integrate a server-state cache for remote data

### Module 6: Advanced Data Loading, Caching, and Streaming (Week 6)

- **Load function architecture**
  - Parallel data loading and waterfall elimination
  - Shared layout data vs page data: `invalidate` and `invalidateAll` semantics
  - `depends` and custom invalidation keys
- **Caching headers and CDNs**
  - `Cache-Control` strategies for authenticated and public data
  - `setHeaders` in load functions and hooks
  - Stale-while-revalidate and background revalidation patterns
- **Streaming data patterns**
  - Deferred data with promises in `load`
  - Chunked responses and SSE for live data
  - WebSocket integration patterns for real-time features
- **Error handling in data pipelines**
  - `error()` and `redirect()` semantics
  - Expected vs unexpected errors: `handleError` in hooks
  - Fallback data and graceful degradation
- **Hands-on Lab**: Profile a waterfall-heavy route, parallelize its load functions, add `depends`-based invalidation, and stream a slow report endpoint with a promise

### Module 7: Advanced SvelteKit Routing and Middleware (Week 7)

- **Route groups and advanced layouts**
  - `(group)` layouts, `+layout@` overrides, and route-level layout resolution
  - `+page@` and `+layout@` reset patterns
  - Optional and rest parameters, route matching with `match` functions
- **Hooks and middleware**
  - `handle`, `handleFetch`, `handleError`, and `reroute` in depth
  - Sequence composition of multiple hooks
  - Request ID injection, logging middleware, and auth middleware
- **Server-only and isomorphic code boundaries**
  - `$lib/server` and the server-only module graph
  - `$env/static/*` vs `$env/dynamic/*` and build-time inlining
  - Preventing secret leakage to the client bundle
- **Advanced form actions**
  - Named actions, action composition, and cross-route form submission
  - `use:enhance` customization and optimistic concurrency control
  - File uploads with streaming and progress events
- **Hands-on Lab**: Build a multi-tenant app shell with route groups, a hook sequence that adds request IDs and auth checks, and a named-action form with optimistic updates

### Module 8: Performance Engineering at Scale (Week 8)

- **Bundle optimization**
  - Analyzing the bundle with `vite-bundle-visualizer` and Rollup output
  - Code splitting, dynamic imports, and lazy route loading
  - Tree-shaking runes code and avoiding accidental large dependencies
- **Runtime performance**
  - Profiling with the browser performance panel and Svelte's dev warnings
  - Avoiding layout thrash and unnecessary `$effect` work
  - Virtualizing long lists: `svelte-virtual-list` and custom windowing
- **Image and asset performance**
  - `enhanced:img` and the SvelteKit image pipeline
  - Responsive images, srcset, and modern formats
  - Font loading and CSS delivery
- **Core Web Vitals budgets**
  - LCP, INP, CLS budgets and CI enforcement
  - Lighthouse CI and Playwright performance assertions
  - Real-user monitoring integration
- **Hands-on Lab**: Profile a slow route, apply image optimization and code splitting, then wire a Lighthouse CI budget that fails the build on regressions

### Module 9: Advanced Testing Strategies (Week 9)

- **Testing runes and reactive logic**
  - Unit-testing `.svelte.ts` modules in isolation
  - Testing `$effect` behavior with Vitest fake timers
  - Snapshot testing the compiler output of runes
- **Component testing with snippets**
  - Testing snippet props with `@testing-library/svelte`
  - Renderless component test patterns
  - Mocking context and load data
- **Integration and E2E testing**
  - Playwright for critical user journeys
  - Testing server islands and streaming responses
  - API mocking and request interception
- **Visual and accessibility regression testing**
  - Visual regression with Playwright screenshots
  - Automated aXe accessibility checks in CI
  - Component storybook workflows for design systems
- **Hands-on Lab**: Build a test pyramid for a runes-based feature: unit tests for the state module, component tests for snippet APIs, and E2E tests for the island-rendered flow

### Module 10: Security Hardening (Week 10)

- **Authentication and authorization at scale**
  - Session management with httpOnly cookies and rotation
  - OAuth2 and OIDC integration patterns with SvelteKit
  - Role-based and attribute-based access control in hooks
- **Web application attack surface**
  - XSS vectors in `{@html}` and user content
  - CSRF protection: SvelteKit's built-in origin checks and custom tokens
  - SQL injection and ORM query safety
  - Open redirects and SSRF in fetch-heavy load functions
- **Security headers and CSP**
  - Content Security Policy with SvelteKit's inline scripts
  - `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`
  - HSTS and secure cookie flags
- **Dependency and supply-chain security**
  - Lockfile integrity and `npm audit` in CI
  - SBOM generation and vulnerability scanning
  - Rate limiting and abuse prevention at the edge
- **Hands-on Lab**: Harden a sample app against a checklist: CSP, cookie flags, CSRF, and an OAuth flow with PKCE, then verify with OWASP ZAP or similar scanning

### Module 11: Observability, Feature Flags, and Production Operations (Week 11)

- **Structured logging and tracing**
  - Request IDs and correlation IDs through hooks
  - OpenTelemetry instrumentation for SvelteKit
  - Distributed tracing across load functions and external calls
- **Error tracking and alerting**
  - Sentry and `handleError` integration
  - Source maps for minified production bundles
  - Alerting on error rates and latency SLOs
- **Feature flags and progressive delivery**
  - Server-side and client-side flag evaluation
  - Flag-driven rendering with server islands
  - A/B testing and canary releases
- **Monitoring and analytics**
  - Real-user monitoring for Web Vitals
  - Custom event tracking with privacy-friendly analytics
  - Cost and capacity monitoring for serverless deployments
- **Hands-on Lab**: Instrument a deployed SvelteKit app with OpenTelemetry traces and Sentry, add a feature flag that switches a server island variant, and verify the traces in a dashboard

### Module 12: Monorepos, Micro-Frontends, and the Capstone (Week 12)

- **Monorepo architecture**
  - pnpm workspaces and Turborepo for SvelteKit projects
  - Shared packages: UI kit, configs, types, and validation schemas
  - Build caching and task orchestration
- **Micro-frontends with Svelte**
  - Module federation and independent deployment
  - Composing islands from multiple teams' apps
  - Shared design systems and versioning strategies
- **Design systems with Svelte**
  - Snippet-driven component APIs for design systems
  - Theme tokens and CSS custom properties
  - Documentation with Storybook and interactive playgrounds
- **Capstone project**
  - Requirements, architecture review, and team workflow
  - Performance, security, and observability budgets
  - Presentation and code review criteria
- **Hands-on Lab**: Scaffold a monorepo with a shared UI package and two SvelteKit apps, compose a server island from the shared package, and present the capstone architecture

## Final Project

Learners will design and build a **large-scale production-grade SvelteKit application** that demonstrates mastery of Svelte 5 runes and advanced SvelteKit architecture. The capstone must include:

- **Runes-based state architecture**: A `.svelte.ts` state module with `$state`, `$derived`, and `$effect` used correctly, plus context-scoped state for multi-tenant or multi-feature isolation
- **Advanced rendering**: At least one server island, one prerendered route, and one streaming data flow
- **Snippet-based component API**: A renderless or composable component exposing snippet props, documented as a public interface
- **Data pipeline**: Parallel load functions, `depends`-based invalidation, and optimistic updates with cache control
- **Security**: CSP, secure cookie flags, CSRF-safe forms, and an OAuth or session-based auth flow
- **Testing**: Unit tests for reactive state modules, component tests for snippet APIs, and Playwright E2E for critical journeys
- **Observability**: Structured logging with request IDs, error tracking, and at least one feature flag
- **Monorepo layout**: Shared packages (UI, types, config) consumed by at least one other app or package

Example project ideas: a multi-tenant analytics dashboard with per-tenant islands, an e-commerce storefront with a prerendered catalog and personalized cart island, or a real-time collaboration platform with streaming updates and optimistic UI.

## Assessment Criteria

- **Module Labs (40%)**: Weekly hands-on labs submitted as pull requests, evaluated on correctness, architecture choices, and written reflections
- **Midterm Architecture Review (20%)**: A written architecture document plus a code walkthrough covering runes design, rendering strategy, and state architecture, evaluated on clarity and trade-off analysis
- **Final Capstone Project (40%)**: Evaluated on:
  - Functional completeness and real-world usability
  - Correct and idiomatic runes usage (no `$effect` abuse, proper snapshot semantics)
  - Rendering strategy fit (islands, prerender, streaming chosen appropriately)
  - Test coverage (>70% for unit tests, critical E2E flows)
  - Security checklist compliance and hardened headers
  - Performance budgets (Lighthouse scores >80, LCP < 2.5s, INP < 200ms)
  - Observability quality (request IDs, traces, error tracking)
  - Code organization and monorepo structure

## References

- [Svelte 5 Documentation](https://svelte.dev/docs/svelte)
- [Svelte 5 Migration Guide](https://svelte.dev/docs/svelte/v5-migration-guide)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Server Islands (SvelteKit)](https://kit.svelte.dev/docs/server-islands)
- [Superforms (Form Library for SvelteKit)](https://superforms.rocks/)
- [TanStack Query for Svelte](https://tanstack.com/query/latest/docs/framework/svelte/overview)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [Sentry SvelteKit Documentation](https://docs.sentry.io/platforms/javascript/guides/sveltekit/)
- [Turborepo Documentation](https://turborepo.com/docs)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

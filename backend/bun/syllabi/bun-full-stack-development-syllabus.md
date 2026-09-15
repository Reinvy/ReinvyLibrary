---
title: "Bun Full-Stack Development Syllabus"
description: "A comprehensive 12-week advanced curriculum for developers who want to ship complete web applications with Bun as the full-stack toolkit — covering Bun.serve() web-tier patterns, HTML-first rendering and streaming, React server-side rendering, HTMX server-driven UI, the bun build frontend pipeline, hot module replacement, static asset optimization, type-safe data layers, authentication, and full-stack deployment."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Bun Full-Stack Development Syllabus

## Overview

This 12-week advanced syllabus is designed for JavaScript and TypeScript developers who already build Bun backends and want to master Bun's full-stack story: shipping complete web applications where the same runtime serves the API, renders the HTML, bundles the frontend assets, and runs the tests. Where general Bun curricula focus on runtime fundamentals and the advanced syllabus focuses on runtime internals, this course is dedicated entirely to the application layer — the web tier, the markup, and the deployment pipeline.

The curriculum follows the journey of a modern full-stack application: building a robust web tier with `Bun.serve()`, rendering HTML with streaming and progressive enhancement, choosing between React server-side rendering and HTMX for server-driven UI, compiling frontend assets with `bun build`, running a fast development loop with hot module replacement, serving static assets with correct caching, persisting data through a type-safe layer on `bun:sqlite` and Drizzle, securing the application with authentication and sessions, and finally shipping it to containers, single binaries, or the edge.

Each module pairs conceptual foundations with hands-on labs that produce real, runnable Bun applications. The course culminates in a capstone project where learners build, secure, and deploy a complete full-stack product with measurable performance and accessibility budgets.

By the end of this course, learners will be able to architect and implement production-grade full-stack web applications entirely within the Bun toolchain: streaming HTML responses, rendering React on the server or driving UI with HTMX, bundling client-side assets, managing hot reload development workflows, designing type-safe data access, implementing authentication and session management, and deploying the finished product with CI/CD.

## Curriculum

### Module 1: The Full-Stack Bun Toolchain (Week 1)

- **Bun as an all-in-one toolkit**
  - Why a single runtime for server, bundler, test runner, and package manager changes project workflows
  - Comparing the Bun full-stack approach to Node.js/Next.js and Go templating stacks
  - Version selection with `bun upgrade` and CI pinning with `bun install --frozen-lockfile`
- **Scaffolding a full-stack project**
  - Manual project layout: `src/server`, `src/ui`, `src/lib`, and `public/` conventions
  - TypeScript strict configuration, path aliases in `tsconfig.json`, and module resolution with Bun
  - Environment handling with `Bun.env` and typed validation of `Bun.env.*` values
- **Developer ergonomics**
  - `bun run` script wiring for dev, build, test, and typecheck
  - Import maps and package `exports` for internal shared code
  - Monorepo considerations: workspaces for shared packages across apps

### Module 2: The Web Tier with Bun.serve() (Week 2)

- **Request routing and lifecycle**
  - `Bun.serve()` fundamentals: `routes`, `fetch`, and `error` handlers
  - Path parameters, wildcard patterns, and method matching
  - Request/response lifecycle: headers, cookies, body parsing, and streaming
- **Middleware and composition**
  - Chaining middleware for logging, timing, authentication, and compression
  - Context propagation through `Server.register` and request-scoped state
  - Error handling with typed `Response` builders and consistent JSON error shapes
- **Streaming and long-lived connections**
  - Streaming responses with `ReadableStream` bodies and backpressure
  - Server-Sent Events (SSE) for push updates and progress reporting
  - WebSocket upgrade patterns for interactive features (recap of `srv.upgrade`)

### Module 3: HTML-First Rendering (Week 3)

- **Generating HTML safely**
  - Template literal rendering and composable layout functions
  - Output escaping to prevent XSS and safe handling of user-generated content
  - Reusable component functions: `Layout`, `Header`, `Table`, and `Form`
- **Streaming HTML**
  - Writing a `ReadableStream` of HTML chunks with early flush for faster first paint
  - Progressive rendering: streaming table rows and feed items as data arrives
  - `HTMLRewriter` for transforming responses without full re-rendering
- **Progressive enhancement**
  - Building forms and links that work without JavaScript first
  - Layering client behavior on top of server-rendered markup
  - Accessibility basics: semantic HTML, landmarks, and focus management

### Module 4: React Server-Side Rendering (Week 4)

- **SSR fundamentals with Bun**
  - `renderToReadableStream` for streaming React SSR from a Bun server
  - Hydration: serving the same component tree to the client and rehydrating
  - Client/server component boundaries with `"use client"` and `"use server"` conventions
- **React Server Components**
  - Server components for data fetching and rendering without client bundles
  - Passing serializable props across the boundary and handling async components
  - Server actions for mutation without separate API routes
- **Streaming and Suspense**
  - Suspense boundaries for progressive HTML delivery
  - Combining SSE updates with server-rendered React UI
  - Caching rendered output strategies for shared layouts

### Module 5: Server-Driven UI with HTMX (Week 5)

- **Hypermedia and HTMX basics**
  - The hypermedia model: the server owns UI state and renders complete fragments
  - `hx-get`, `hx-post`, `hx-swap`, `hx-target`, and `hx-trigger` attributes
  - Returning HTML fragments from Bun routes instead of JSON
- **Interactive patterns**
  - Inline editing, cascading selects, infinite scroll, and optimistic previews
  - Out-of-band swaps for updating multiple regions in one response
  - Form validation where the server returns re-rendered forms with errors
- **Integrating HTMX with Bun**
  - Serving the HTMX script from local assets with integrity hashes
  - SSE with `hx-ext="sse"` for live updates
  - Comparing HTMX and React: when server-driven UI beats a client framework

### Module 6: The Frontend Build Pipeline with bun build (Week 6)

- **Bundling client assets**
  - Configure `bun build` with HTML entry points, multiple entry points, and outputs
  - JSX/TSX compilation, CSS handling, and asset inlining
  - Code splitting, minification, source maps, and target browsers with `--target`
- **CSS and styling integration**
  - Tailwind CSS setup with Bun: content scanning and production purging
  - PostCSS plugins and CSS extraction to separate files
  - Design tokens and CSS variables across server-rendered markup
- **Production output management**
  - Content hashing for immutable asset filenames
  - Generating an asset manifest to reference hashed files from server templates
  - Conditional builds: development bundles with source maps versus production bundles

### Module 7: Development Experience — HMR and Watch (Week 7)

- **Hot reload workflows**
  - `bun --hot` for server hot reload and `bun --watch` for restart-on-change
  - Hot Module Replacement (HMR) semantics for client-side modules
  - Fast Refresh for React components during development
- **Dev server architecture**
  - Serving the dev bundle with the Bun dev server and proxying API routes
  - Environment-specific configuration: development, test, and production modes
  - Error overlays and structured logging during development
- **Testing in the development loop**
  - `bun test` alongside the dev server for unit and integration coverage
  - Playwright for end-to-end checks of the server-rendered UI
  - Contract tests for API routes consumed by client-side code

### Module 8: Static Assets, Caching, and CDN (Week 8)

- **Serving static files**
  - `Bun.file()` for disk-backed responses with correct MIME types
  - Content negotiation: gzip/brotli compression and conditional requests
  - Range requests and streaming for media assets
- **Caching strategies**
  - `Cache-Control` and `ETag` semantics for HTML versus hashed assets
  - Immutable caching for content-hashed files and revalidation for HTML
  - Cache busting workflows when asset hashes change
- **CDN and edge distribution**
  - Pushing static assets to a CDN and signing URLs
  - Image optimization: resizing and format negotiation for responsive images
  - Upload handling: multipart parsing, validation, and virus scanning basics

### Module 9: Type-Safe Data Layer (Week 9)

- **Persistence with bun:sqlite**
  - Database setup, WAL mode, and connection lifecycle
  - Prepared statements, transactions, and batch operations
  - Drizzle ORM schema definitions, migrations, and type-safe queries
- **PostgreSQL integration**
  - Connecting Bun to PostgreSQL with `postgres.js` and connection pooling
  - Comparing SQLite and PostgreSQL for full-stack workloads
  - Query building with Drizzle for PostgreSQL deployments
- **Validation and shared contracts**
  - Zod schemas shared between server routes and client forms
  - Request validation middleware and typed error responses
  - Generating TypeScript types from database schemas with Drizzle Kit

### Module 10: Authentication and Sessions (Week 10)

- **Session management**
  - Signed cookie sessions with rotation and expiry
  - Server-side session stores backed by bun:sqlite
  - Session fixation and hijacking countermeasures
- **Authentication strategies**
  - Password hashing with `Bun.password` (bcrypt/argon2) and timing-safe verification
  - OAuth 2.0 flows: Authorization Code with PKCE against GitHub and Google
  - JWT issuance, verification, and refresh token rotation
- **Hardening the full-stack app**
  - Security headers: CSP, HSTS, X-Content-Type-Options, and frame options
  - CSRF protection for state-changing requests
  - Rate limiting, brute-force protection, and audit logging

### Module 11: Full-Stack Deployment and CI/CD (Week 11)

- **Build and package strategies**
  - `bun build --compile` for single-binary distribution with `--minify` and `--bytecode`
  - Multi-stage Docker images with Oven's Bun base image
  - Asset pipeline integration: bundling static files into the deployable artifact
- **Platform deployment**
  - Deploying Bun servers to Fly.io, Render, and Railway
  - Edge/serverless considerations: Bun compatibility with Cloudflare Workers and Vercel
  - Environment management, secrets, and zero-downtime restart patterns
- **CI/CD and observability**
  - GitHub Actions pipeline: install, typecheck, test, build, and deploy
  - Structured JSON logging with pino and OpenTelemetry tracing
  - Health checks, readiness probes, and rollback procedures

### Module 12: Capstone Project — Full-Stack Product (Week 12)

- **Project brief**
  - Build a complete multi-user product with server-rendered UI, real-time updates, and authentication
  - Choose the rendering strategy (React SSR, HTMX, or a hybrid) and justify the choice
  - Define performance, accessibility, and security budgets up front
- **Delivery requirements**
  - Production asset pipeline, hashed bundles, and caching configuration
  - CI/CD pipeline with automated tests and staged deployment
  - Observability: structured logs, metrics, and error tracking in production
- **Presentation and review**
  - Architecture walkthrough and decisions log
  - Load test results, Lighthouse scores, and security checklist sign-off

## Final Project

Learners build and ship a production-grade full-stack application entirely on the Bun toolchain. Suitable examples include a real-time team workspace with comments and presence indicators, an event management platform with seat reservations, or an analytics dashboard with live SSE updates. The application must combine a `Bun.serve()` web tier, server-rendered UI (React SSR or HTMX), a `bun build` frontend pipeline with hashed assets, a type-safe data layer (SQLite or PostgreSQL with Drizzle), authentication with sessions, and a CI/CD deployment to a public URL. The project is graded on architecture quality, streaming and caching correctness, security hardening, performance against the declared budgets, and operational maturity (logging, health checks, rollback plan).

## Assessment Criteria

- **Assignments**: Weekly labs are evaluated on correctness, security awareness, and adherence to the module's teaching goals. Module quizzes verify conceptual understanding of streaming, SSR, bundling, and caching semantics. A mid-course code review assesses the web-tier and rendering architecture before the data and auth modules.
- **Final Project**: Validated against the declared budgets: first-contentful-paint under 1.5 seconds on a throttled connection, interactive time under 2.5 seconds, Lighthouse accessibility score above 90, no high-severity findings on the security checklist, and successful zero-downtime deployment with rollback demonstrated. The project must be publicly deployed with CI/CD and include a written architecture and decisions log.

## References

- Bun official documentation: Bun.serve, bun build, bun test, HTMLRewriter, and Bun.password references (https://bun.com/docs)
- React documentation: renderToReadableStream, server components, and server actions (https://react.dev/reference/react-dom/server)
- HTMX documentation and examples (https://htmx.org/docs)
- Drizzle ORM documentation for schema, migrations, and queries (https://orm.drizzle.team/docs)
- Tailwind CSS installation and configuration guides (https://tailwindcss.com/docs)
- Fly.io and Docker official guides for Bun deployment (https://fly.io/docs, https://docs.docker.com)

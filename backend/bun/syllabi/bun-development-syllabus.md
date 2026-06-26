---
title: "Bun Development Syllabus"
description: "A comprehensive 12-week curriculum for learning Bun — the all-in-one JavaScript runtime, package manager, test runner, and bundler — from fundamental concepts to production deployment patterns."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Bun Development Syllabus

## Overview

This 12-week syllabus provides a structured learning path for mastering Bun, the high-performance all-in-one JavaScript runtime and toolkit. Built on JavaScriptCore instead of V8, Bun offers faster startup times, lower memory usage, and a unified toolchain that replaces separate tools for running, testing, bundling, and package management.

The curriculum progresses from fundamental concepts through production-ready deployment patterns. You will start by installing Bun and building simple scripts, then advance to building HTTP APIs, integrating databases, testing systematically, implementing real-time features, and deploying applications to production. Each module includes hands-on exercises and concludes with practical assignments that reinforce the week's concepts.

By the end of this syllabus, you will be able to build, test, bundle, and deploy full-stack Bun applications with confidence — whether you are migrating from Node.js or starting a greenfield project.

## Curriculum

### Week 1: Introduction to Bun

- **Bun vs Node.js vs Deno**
  - Runtime architecture comparison (JavaScriptCore vs V8)
  - Performance characteristics and startup time benchmarks
  - API compatibility with Node.js standard library
- **Installation and setup**
  - Installing Bun on macOS, Linux, and Windows (WSL)
  - Verifying installation with `bun --version`
  - Updating Bun to the latest version
- **Running scripts with Bun**
  - Executing TypeScript and JavaScript files with `bun run`
  - Using `bun --watch` for development auto-restart
  - Running inline scripts with `bun -e`
  - The Bun REPL (`bun repl`)
- **Bun's package manager**
  - Installing dependencies with `bun install`
  - Adding and removing packages (`bun add`, `bun remove`)
  - Understanding Bun's lockfile format (bun.lock)
  - Migrating from npm/pnpm/yarn lockfiles

### Week 2: TypeScript and Project Structure

- **Native TypeScript support**
  - Running `.ts` files without compilation
  - Configuring `tsconfig.json` for Bun
  - Type checking with `bun run tsc --noEmit`
  - Using path aliases and module resolution
- **Project scaffolding**
  - Using `bun init` for new projects
  - Structuring Bun projects (src/, test/, dist/)
  - Environment variables with `Bun.env`
  - Configuration validation with Zod
- **Workspace and monorepo support**
  - Setting up Bun workspaces in package.json
  - Shared dependencies and hoisting
  - Running scripts across workspaces
  - Comparing monorepo performance with npm/pnpm workspaces

### Week 3: HTTP Servers with Bun.serve()

- **Building HTTP servers with Bun.serve()**
  - Request handling with the Request/Response API
  - Routing patterns (manual router, file-based, framework)
  - Parsing path parameters and query strings
  - Handling request bodies (JSON, form data, plain text)
- **Advanced server patterns**
  - CORS headers and preflight requests
  - Static file serving with `new Response(Bun.file(...))`
  - Streaming responses and chunked transfer encoding
  - TLS/SSL configuration with Bun.serve({ tls })
- **Middleware and error handling**
  - Request lifecycle and middleware composition
  - Centralized error handling with error responses
  - Logging requests with structured JSON
  - Rate limiting and request validation

### Week 4: RESTful API Development

- **Designing RESTful APIs with Bun**
  - Resource-oriented URL design
  - CRUD operation patterns (GET, POST, PUT, DELETE)
  - JSON request/response serialization
  - Pagination, filtering, and sorting conventions
- **Input validation**
  - Request body validation with Zod schemas
  - Query parameter and path parameter validation
  - Type-safe API contracts with TypeScript generics
  - Validation error formatting
- **Authentication and authorization**
  - JWT token generation and verification
  - Bearer token middleware pattern
  - API key authentication for service-to-service communication
  - Role-based access control (RBAC)
- **API documentation**
  - Generating OpenAPI/Swagger specifications
  - Using `@hono/zod-openapi` for type-safe docs
  - Serving Swagger UI from Bun

### Week 5: Data Persistence with bun:sqlite

- **Introduction to bun:sqlite**
  - Bun's built-in SQLite client vs better-sqlite3
  - Opening and creating databases
  - Running SQL queries with `db.query()`
  - Prepared statements and parameterized queries
- **CRUD operations**
  - Creating tables with CREATE TABLE
  - Inserting, reading, updating, and deleting records
  - Working with transactions for atomic operations
  - Handling unique constraints and foreign keys
- **Advanced SQLite patterns**
  - WAL mode for concurrent read performance
  - Full-text search with FTS5
  - JSON functions in SQLite
  - Indexing strategies for query optimization
- **Database migration strategies**
  - Schema versioning with migration files
  - Up and down migration patterns
  - Seeding databases with test data
  - Migration runner scripts in Bun

### Week 6: Testing with Bun Test Runner

- **Bun's built-in test runner**
  - Writing tests with `describe`, `test`, `expect`
  - Running tests with `bun test`
  - Watch mode for test-driven development
  - Comparing Bun test with Jest and Vitest
- **Test patterns and practices**
  - Unit testing pure functions
  - Integration testing with HTTP servers
  - Mocking with `mock()` and `spyOn()`
  - Test fixtures and setup/teardown hooks
- **Code coverage and reporting**
  - Generating coverage reports with `bun test --coverage`
  - Configuring coverage thresholds
  - CI integration for test reporting
  - Snapshot testing for API responses
- **Advanced testing**
  - Testing WebSocket connections
  - Performance testing with benchmarks (`bun test --bench`)
  - Testing database operations with isolated databases
  - End-to-end testing strategies

### Week 7: File I/O and Streams

- **File system operations**
  - Reading files with `Bun.file()` and `Bun.readableStreamToText()`
  - Writing files with `Bun.write()`
  - Working with directories (Bun.$`ls`, glob patterns)
  - File metadata and permissions
- **Streaming data**
  - Reading and writing streams with Bun
  - Transforming streams (compression, encoding)
  - Piping streams between files and network
  - Backpressure handling in Bun streams
- **File uploads and processing**
  - Handling multipart form data
  - Streaming file uploads to disk
  - Processing CSV, JSON, and binary files
  - Image processing with sharp integration

### Week 8: Process Management and System Integration

- **Spawning and managing processes**
  - Using `Bun.spawn()` and `Bun.spawnSync()`
  - Shell commands with Bun's template literal API (`Bun.$`)
  - Capturing stdout, stderr, and exit codes
  - Process pipelines and inter-process communication
- **File watchers and build pipelines**
  - Using `Bun.write` with fs.watch
  - Building custom watchers for development workflows
  - Integrating with esbuild and SWC plugins
  - Building asset pipelines with Bun.build
- **System utilities**
  - Reading environment variables with `Bun.env`
  - Working with temporary files and directories
  - Signal handling (SIGTERM, SIGINT, SIGHUP)
  - Graceful shutdown patterns for long-running processes

### Week 9: Real-time Features and WebSockets

- **WebSocket server with Bun.serve()**
  - Setting up WebSocket connections
  - Handling open, message, and close events
  - Broadcasting messages to connected clients
  - WebSocket rooms and channel subscriptions
- **Real-time application patterns**
  - Building a simple chat server
  - Presence detection and user tracking
  - WebSocket authentication and authorization
  - Heartbeat and reconnection strategies
- **Server-Sent Events (SSE)**
  - Implementing SSE endpoints with Bun
  - Streaming events to clients
  - Event ID and reconnection support
  - Comparing SSE with WebSockets

### Week 10: Bundling and Build Optimization

- **Bun's built-in bundler**
  - Using `bun build` for production bundles
  - Entry points and output configuration
  - Code splitting and dynamic imports
  - Tree shaking and dead code elimination
- **Build targets and formats**
  - Target environments (bun, browser, node)
  - Output formats (ESM, CommonJS, IIFE)
  - Minification and source maps
  - External dependencies and bundling exclusion
- **Compiling standalone executables**
  - Using `bun build --compile` for single-file binaries
  - Cross-platform binary compilation
  - Embedding assets into executables
  - Use cases for standalone deployments
- **Performance optimization**
  - Bundle size analysis and optimization
  - Lazy loading and code splitting strategies
  - Caching compiled outputs in CI/CD
  - Comparing build times with esbuild, webpack, and Rollup

### Week 11: Deployment and Containerization

- **Production deployment strategies**
  - Deploying Bun applications with process managers
  - Using PM2 with Bun runtime
  - Systemd service configuration for Bun apps
  - Environment-specific configuration patterns
- **Docker containerization**
  - Official Bun Docker images (oven/bun)
  - Writing optimized Dockerfiles for Bun apps
  - Multi-stage builds for small image sizes
  - Docker Compose for Bun + database services
- **Cloud deployment**
  - Deploying to Fly.io (native Bun support)
  - Deploying to Railway, Render, and Vercel
  - Serverless deployment considerations
  - Using environment variables in cloud platforms
- **Monitoring and logging**
  - Structured JSON logging with Bun
  - Integrating with log aggregation services
  - Health check endpoints for container orchestration
  - Application performance monitoring (APM) integration

### Week 12: Capstone Project and Advanced Topics

- **Capstone project design**
  - Building a full-stack application with Bun
  - API design, database schema, and authentication
  - Real-time features (WebSockets or SSE)
  - Testing, bundling, and deployment
- **Performance profiling and debugging**
  - Profiling with `Bun.inspect()` and Chrome DevTools
  - Memory usage analysis and leak detection
  - CPU profiling for hot path optimization
  - Debugging TypeScript with source maps
- **Migration from Node.js to Bun**
  - Compatibility assessment checklist
  - Replacing Node.js APIs with Bun equivalents
  - Handling incompatible native modules
  - Performance comparison before and after migration
- **Community and ecosystem**
  - Bun's native APIs (bun:ffi, bun:test, bun:sqlite, bun:jsc)
  - Bun-optimized frameworks (Elysia, Hono)
  - Contributing to Bun open source
  - Staying updated with Bun releases

## Final Project

**Full-Stack Real-Time Application with Bun**

Build a complete real-time web application using Bun as the runtime for both the API server and, optionally, the build tool for a frontend client. The project must incorporate at least three of the following advanced features:

1. **WebSocket-based real-time collaboration** — such as a shared whiteboard, collaborative document editor, or real-time dashboard with live data updates
2. **Database-backed CRUD operations** — using bun:sqlite with proper migrations, transactions, and indexing
3. **Authentication system** — JWT-based auth with login, registration, and protected routes
4. **File upload and processing** — accepting file uploads, processing them (e.g., CSV parsing, image resizing), and serving results
5. **Automated test suite** — unit tests, integration tests, and benchmark tests thoroughly covering the application

**Deliverables**:
- Complete source code in a Git repository
- README with setup instructions, architecture documentation, and API reference
- Dockerfile for containerized deployment
- Test suite with at least 80% code coverage
- CI/CD configuration (GitHub Actions or similar)

## Assessment Criteria

- **Weekly Assignments (40%)**: Weekly coding exercises submitted through pull requests, demonstrating comprehension of each module's concepts. Each assignment is evaluated on correctness, code quality, and adherence to Bun best practices.
- **Mid-term Project (20%)**: A RESTful API built with Bun.serve() and bun:sqlite, submitted at the end of Week 6. Must include authentication, input validation, comprehensive tests, and API documentation.
- **Final Project (40%)**: The capstone full-stack application described above. Evaluated on technical implementation, code organization, test coverage, deployment readiness, and documentation quality.
- **Code Review Participation**: Active peer review of at least three other participants' pull requests during the course. Reviews should focus on Bun-specific patterns, performance considerations, and best practices.

## References

- [Bun Official Documentation](https://bun.sh/docs) — Complete API reference for Bun runtime, CLI, and built-in modules
- [Bun GitHub Repository](https://github.com/oven-sh/bun) — Source code, issue tracker, and release notes
- [Elysia.js Documentation](https://elysiajs.com) — Bun-native web framework for building type-safe APIs
- [Zod Documentation](https://zod.dev) — TypeScript-first schema validation library, commonly used with Bun
- [SQLite Documentation](https://www.sqlite.org/docs.html) — Official SQLite documentation for advanced query patterns
- [Fly.io Bun Guide](https://fly.io/docs/js/frameworks/bun/) — Deploying Bun applications on Fly.io
- [Docker Official Images: Bun](https://hub.docker.com/r/oven/bun) — Official Bun Docker images for containerized deployments

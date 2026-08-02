---
title: "Advanced Bun Runtime Internals Syllabus"
description: "A comprehensive 12-week advanced curriculum for experienced JavaScript developers covering Bun's internal architecture, JavaScriptCore engine access, native FFI bindings, N-API addons, memory management, performance profiling, plugin development, and production hardening."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced Bun Runtime Internals Syllabus

## Overview

This 12-week advanced syllabus is designed for experienced JavaScript and TypeScript developers who already build applications with Bun and want to master the runtime itself. The curriculum goes beyond writing Bun applications to explore what happens under the hood: the Zig and C++ core architecture, the JavaScriptCore engine, the Foreign Function Interface (bun:ffi) for calling native libraries, writing N-API and Zig native addons, garbage collection and memory management, CPU and heap profiling, the plugin and macro system, low-level system programming, and production hardening for high-throughput services.

Each module combines deep theoretical foundations with hands-on labs that require writing real native bindings, profiling live applications, and debugging memory leaks. The course culminates in a capstone project where learners build a high-performance, native-extension-backed real-time service and optimize it against measurable performance budgets.

By the end of this course, learners will be able to explain how Bun executes JavaScript and talks to the operating system, call arbitrary C libraries safely from JavaScript, write and package native addons, diagnose and fix memory and CPU problems with profilers, build custom plugins and compile-time macros, and operate Bun services that sustain high throughput with predictable latency.

## Curriculum

### Module 1: Bun Architecture and JavaScriptCore Internals (Week 1)

- **The Bun runtime architecture**
  - Zig core and C++ bindings: how Bun's native layer is organized
  - The JavaScriptCore engine: why Bun chose JSC over V8
  - Startup sequence: shell, runtime bootstrap, module graph loading
  - The role of WebKit's B3 and FTL JIT compilers
- **Module resolution and the ESM runtime**
  - Bun's internal module registry and resolver
  - `bun.lock` resolution and workspace hoisting internals
  - Native modules vs JavaScript modules in the runtime graph
- **Built-in modules tour**
  - `bun:ffi`, `bun:jsc`, `bun:sqlite`, `bun:test`, `bun:stream`
  - How built-ins are exposed to JavaScript without Node-style wrappers
- **Hands-on Lab**: Measure Bun's startup time against Node.js, inspect `process.versions` internals, and enumerate all built-in modules with `Bun.which` and dynamic import

### Module 2: Foreign Function Interface with bun:ffi (Week 2)

- **Calling native libraries from JavaScript**
  - Loading shared libraries with `dlopen` and `Bun.ffi`
  - Defining C function signatures: `dlopen`, `CFunction`, `ptr`, `CString`
  - FFI data types: `i32`, `u64`, `f64`, `ptr`, `CStruct`
  - Passing and returning pointers, strings, and structs
- **Advanced FFI patterns**
  - Callbacks from native code into JavaScript
  - Managing memory ownership across the FFI boundary
  - Thread-safety and the main-thread constraint
  - Error handling when native code returns error codes
- **Performance characteristics**
  - FFI overhead vs N-API vs pure JavaScript
  - Batching native calls to amortize transition costs
  - When FFI is the right tool and when it is not
- **Hands-on Lab**: Wrap a small C library (for example a CRC32 implementation or libz compression) and call it from a Bun HTTP server

### Module 3: bun:jsc and Engine-Level Access (Week 3)

- **The JavaScriptCore API surface in Bun**
  - `Bun.jsc` and `jsc.evaluate`: running code against a fresh global object
  - `jsc.gc()`: forcing garbage collection
  - `jsc.memoryUsage()`: reading engine memory statistics
  - `jsc.vm()`: low-level virtual machine access
- **Garbage collection fundamentals**
  - JSC's collector generations and the marking pipeline
  - Heap growth heuristics and GC scheduling
  - External memory reporting and its impact on GC decisions
- **Introspection and debugging**
  - Dumping heap statistics and object counts
  - Inspecting JIT tiers: interpreter, baseline, DFG, FTL
  - Detecting engine-level anomalies in long-running processes
- **Hands-on Lab**: Build a small diagnostics script that reports JSC memory usage over time while a test workload runs

### Module 4: Native Modules and N-API (Week 4)

- **When to write a native module**
  - Identifying compute-bound hot paths that justify native code
  - Comparing approaches: FFI, N-API addon, Zig static library
  - ABI stability and versioning concerns
- **N-API in practice**
  - Setting up `node-gyp` with Bun's compatibility layer
  - Writing a minimal C++ addon exposing a compute function
  - Handling napi_env, napi_value, and async work
  - Building and loading the addon inside a Bun process
- **Zig native modules for Bun**
  - Zig's C ABI compatibility and why it pairs well with Bun
  - Compiling a Zig library and binding it with bun:ffi
  - Distributing native code as npm packages with platform binaries
- **Hands-on Lab**: Write a N-API addon that accelerates a numeric workload, then compare its throughput with a pure-JavaScript implementation

### Module 5: Memory Management and Leak Diagnosis (Week 5)

- **Memory model of a Bun process**
  - JavaScript heap vs native heap vs external memory
  - Buffers and TypedArrays: where the bytes actually live
  - Retaining paths and why closures leak
- **Leak detection tooling**
  - Heap snapshots and object retention analysis
  - `WeakRef` and `FinalizationRegistry` for cache eviction
  - Instrumenting long-lived services to track heap growth
  - Stress testing with `--smol` and constrained heap modes
- **Mitigation patterns**
  - Streams and backpressure to bound buffering
  - Pooling native resources and closing handles
  - Event listener hygiene in long-lived servers
- **Hands-on Lab**: Introduce a deliberate leak in a demo service, locate it with heap snapshots, and fix it

### Module 6: Performance Profiling and Optimization (Week 6)

- **Profiling CPU usage**
  - `--cpu-prof` and sampling profilers
  - Reading flame graphs and identifying hot functions
  - JIT-related profiling artifacts and how to interpret them
- **Profiling with the DevTools protocol**
  - `Bun.inspect` and Chrome DevTools integration
  - CPU profiles, heap profiles, and performance traces
  - Profiling WebSocket and HTTP workloads
- **Microbenchmarking with `bun test --bench`**
  - Writing stable benchmarks that avoid optimizer pitfalls
  - Comparing implementations and tracking regressions
  - Benchmark-driven optimization workflow
- **Optimization playbook**
  - Reducing allocations in hot loops
  - Avoiding excessive FFI transitions
  - Streaming large payloads instead of buffering
  - Tuning `Bun.serve` concurrency and keep-alive settings
- **Hands-on Lab**: Profile a sample API, identify the top three hot spots, optimize them, and prove the improvement with before/after benchmarks

### Module 7: Plugins and Compile-Time Macros (Week 7)

- **The Bun plugin API**
  - `onResolve` and `onLoad` hooks
  - Loading custom file types and virtual modules
  - Intercepting imports for codegen and instrumentation
- **Macros: code that runs at build time**
  - Macro modules and the `macro` export convention
  - Inlining expensive computations into the bundle
  - When macros are safe and when they break expectations
- **Custom loaders**
  - Transforming Svelte, Vue, CSS, and custom formats at build time
  - Composing plugins with the bundler pipeline
  - Caching and incremental builds with plugins
- **Hands-on Lab**: Write a plugin that loads YAML configuration files and a macro that precomputes a lookup table at build time

### Module 8: Low-Level System Programming (Week 8)

- **Process and shell integration**
  - `Bun.spawn` and `Bun.spawnSync`: full process control
  - `Bun.$` template literals and shell pipelines
  - Capturing streams, exit codes, and signals
- **Networking below HTTP**
  - `Bun.connect` and raw TCP sockets
  - Custom protocols and framed message parsing
  - Unix domain sockets for inter-process communication
- **File system internals**
  - `Bun.file` and zero-copy reads
  - `Bun.write` and atomic file replacement
  - Watch mode and file watchers at scale
- **Hands-on Lab**: Build a minimal TCP request broker that routes framed messages between client processes

### Module 9: Type-Safe Systems and Schema-Driven Design (Week 9)

- **Schema-first API contracts**
  - Zod schemas as the single source of truth
  - Generating types and OpenAPI documentation from schemas
  - Runtime validation without performance cliffs
- **End-to-end type safety**
  - Shared type packages between server and client
  - RPC-style APIs with typed procedures
  - Contract testing against generated schemas
- **Validation in hot paths**
  - Precompiled validators vs dynamic validation
  - Batching and deduplicating validation work
  - Error aggregation and structured failure responses
- **Hands-on Lab**: Build a typed RPC service where client and server share schemas and both sides enforce the same contract

### Module 10: Advanced Testing Patterns (Week 10)

- **Property-based testing**
  - Generating inputs and finding counterexamples
  - Integrating fast-check with `bun test`
  - Testing invariants of data structures and parsers
- **Testing native boundaries**
  - Mocking FFI calls and native modules
  - Fixtures for libraries that are hard to run in CI
  - Golden-file testing for binary outputs
- **Coverage and regression budgets**
  - Enforcing coverage thresholds in CI
  - Benchmark regression gates with `bun test --bench`
  - Snapshot testing for API responses and error shapes
- **Hands-on Lab**: Write property tests for a JSON parser and add a benchmark regression gate to a sample CI pipeline

### Module 11: Production Hardening and Observability (Week 11)

- **Operational fundamentals**
  - Graceful shutdown and signal handling
  - Health check endpoints and readiness probes
  - Structured JSON logging and log correlation
- **Observability integration**
  - OpenTelemetry tracing for requests
  - Exposing metrics endpoints for Prometheus
  - Capturing JSC memory metrics for dashboards
- **Container and deployment hardening**
  - Multi-stage Docker builds with official `oven/bun` images
  - Running Bun with restricted memory and CPU limits
  - Secrets management and environment validation
- **Reliability patterns**
  - Circuit breakers and retries with exponential backoff
  - Bounded queues and backpressure for downstream services
  - Failure injection testing for resilience
- **Hands-on Lab**: Harden a sample service with graceful shutdown, health checks, OpenTelemetry tracing, and a Prometheus metrics endpoint

### Module 12: Capstone Project (Week 12)

- **Capstone design**
  - Specifying a high-performance real-time service with a native compute component
  - Defining measurable performance budgets (throughput, p99 latency, memory ceiling)
  - Choosing the native integration strategy: FFI, N-API, or Zig
- **Implementation and optimization**
  - Building the service with `Bun.serve` and WebSockets
  - Profiling, optimizing, and re-profiling against budgets
  - Writing comprehensive tests and benchmarks
- **Delivery**
  - Containerizing the final service
  - Documenting architecture, profiling results, and operational runbooks
  - Presenting performance evidence and design trade-offs

## Final Project

**High-Performance Native-Backed Real-Time Service**

Build a complete real-time service with Bun that delegates a compute-intensive workload to native code. A concrete example: a WebSocket chat server with a native side-channel that computes similarity scores, generates thumbnails, or compresses payloads via a C/Zig library you bind yourself.

The project must demonstrate:

1. **A native integration** — either a bun:ffi binding, a N-API addon, or a Zig library compiled and loaded into the Bun process
2. **Real-time communication** — WebSocket or SSE delivery with graceful client handling
3. **Measurable performance work** — before/after profiling evidence showing the native path beats the pure-JavaScript baseline
4. **Memory discipline** — heap snapshot evidence that the service is leak-free under sustained load
5. **Production readiness** — Docker image, health checks, structured logging, and an OpenTelemetry trace

**Deliverables**:
- Complete source code in a Git repository
- Benchmark and profiling reports (flame graphs, memory charts, before/after numbers)
- Test suite with property tests and a benchmark regression gate
- Dockerfile and deployment documentation
- Architecture notes explaining every native boundary

## Assessment Criteria

- **Weekly Assignments (30%)**: Hands-on labs submitted as pull requests, evaluated on correctness, native-code safety, and adherence to the profiling-first workflow. Each lab must include evidence of what was measured.
- **Mid-term Project (20%)**: Due after Module 6 — a profiled and optimized service with a working FFI or N-API binding, submitted with a before/after performance report.
- **Final Project (40%)**: The capstone service described above, evaluated on native integration quality, performance evidence, memory stability, test coverage, and documentation.
- **Code Review Participation (10%)**: Peer review of at least three other participants' capstone submissions, focusing on native boundary safety, profiling methodology, and operational hardening.

## References

- [Bun Official Documentation](https://bun.sh/docs) — Runtime, CLI, and built-in modules reference
- [Bun FFI Documentation](https://bun.sh/docs/api/ffi) — The Foreign Function Interface guide
- [Bun Plugins Documentation](https://bun.sh/docs/bundler/plugins) — Plugin API and macro documentation
- [Bun GitHub Repository](https://github.com/oven-sh/bun) — Source code, issues, and release notes
- [JavaScriptCore Documentation](https://docs.webkit.org/JavaScriptCore/) — Engine internals and JIT documentation
- [Node-API (N-API) Documentation](https://nodejs.org/api/n-api.html) — Native addon API reference
- [Zig Language Reference](https://ziglang.org/documentation/master/) — Zig for native module development
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/) — Tracing and metrics instrumentation
- [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/) — Metrics collection and alerting

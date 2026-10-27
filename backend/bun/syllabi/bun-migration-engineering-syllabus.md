---
title: "Bun Migration Engineering Syllabus"
description: "A 12-week advanced curriculum for teams moving production Node.js services to Bun — covering compatibility auditing, lockfile and toolchain migration, native addon and ESM interop issues, test and build pipeline porting, differential parity testing, CI/CD cutover, and incremental hybrid adoption with a documented rollback path."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Bun Migration Engineering Syllabus

## Overview

This 12-week advanced syllabus is for engineers who already ship Node.js services and have decided to evaluate or adopt Bun in production — and now need to do it without breaking anything. Where the general Bun syllabus teaches the runtime from first principles, the advanced syllabus dissects runtime internals, and the full-stack syllabus builds new applications on Bun, this course is dedicated entirely to the migration problem: taking an existing, working Node.js codebase and moving it onto Bun with evidence instead of optimism.

Migration is not a rewrite. It is a compatibility engineering discipline made of audits, differential tests, gap inventories, staged cutovers, and rollback plans. The curriculum follows that discipline end to end: auditing a codebase for compatibility risk, converting package management and lockfiles, mapping the `node:` built-in surface your code actually touches, untangling ESM and CommonJS resolution differences, dealing with native addons and prebuilt binaries, porting Jest or Vitest suites to `bun:test`, replacing multi-tool build pipelines with `bun build`, proving behavioural parity with a harness that runs both runtimes side by side, consolidating TypeScript and lint tooling, moving CI and container images, and finally adopting Bun incrementally per service while keeping Node.js available for the workloads that genuinely need it.

Every module produces a concrete artefact that feeds the capstone: a risk register, a converted lockfile, a compatibility matrix, a test parity report, a build pipeline diff, a CI matrix, a cutover runbook. By the end, learners will have migrated a real service with measurable before/after numbers and a rehearsed rollback.

## Curriculum

### Module 1: Migration Strategy and the Compatibility Model (Week 1)

- **What Bun compatibility actually promises**
  - Bun as a drop-in Node.js replacement: the stated goal versus the current reality
  - The three execution modes: `bun run`, `bun --bun run`, and the Node.js fallback for lifecycle scripts
  - The Node.js compatibility tracking page and how to read it as an engineering input, not marketing
  - Semantic differences that are not bugs: module resolution, `process` globals, and timing behaviour
- **Building a migration readiness audit**
  - Inventorying services, their dependency trees, and their deployment targets
  - Classifying each dependency: pure JavaScript, prebuilt binary, node-gyp build, or platform-specific
  - Scoring risk by blast radius and rollback cost rather than by line count
  - Writing a decision record that states what "success" means numerically
- **Choosing a migration shape**
  - Full cutover, per-service cutover, and developer-tooling-only adoption
  - When Bun belongs only on the build and test path while Node.js still runs production
  - Cost model: engineering hours, dual-runtime CI cost, and operational risk budget
- **Hands-on Lab**: Produce a one-page migration readiness audit for a real service in your organisation, including a ranked dependency risk table and a recommended migration shape

### Module 2: Package Management and Lockfile Migration (Week 2)

- **From npm, pnpm, or Yarn to `bun install`**
  - Converting `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock` into `bun.lock`
  - Verifying the resolved dependency graph matches the old lockfile before trusting the new one
  - Peer dependency resolution differences and how Bun reports conflicts
  - `overrides`, `resolutions`, and pnpm-style patched dependencies under Bun
- **Install behaviour that differs**
  - Lifecycle scripts are not run by default: `trustedDependencies` and its security trade-off
  - `.npmrc` handling: registry auth tokens, scoped registries, and private proxies
  - Global cache layout, hardlinks, and what that means inside containers
  - `--frozen-lockfile`, `--production`, and reproducible installs in CI
- **Workspaces and monorepos**
  - Migrating workspace definitions and cross-package links
  - Hoisting differences and dependencies that silently relied on it
  - Filtering installs and scripts per workspace with `--filter`
  - Publishing libraries from a Bun-managed monorepo without breaking npm consumers
- **Hands-on Lab**: Convert a real repository to `bun.lock`, diff the resolved tree against the previous lockfile, resolve every discrepancy, and document the trusted-dependency decisions

### Module 3: The Node.js Built-in API Surface (Week 3)

- **Mapping what your code actually uses**
  - Generating a usage report of `node:` imports and bare built-in requires across the codebase
  - Prioritising by call frequency and by how central each module is to correctness
  - Separating "must behave identically" from "behaves differently but acceptably"
- **Module-by-module reality check**
  - `fs` and `fs/promises`: sync, callback, and promise surfaces, streaming flags, and `Dirent` handling
  - `path`, `os`, `url`, and `querystring`: edge cases in Windows-style paths and URL parsing
  - `http` and `https`: server behaviour, keep-alive, trailers, and agent semantics
  - `stream`: `pipeline`, `pump`, object mode, and backpressure under Bun's implementation
  - `crypto`, `zlib`, `worker_threads`, `child_process`, and `cluster` compatibility notes
- **Filling real gaps**
  - Writing a thin compatibility shim for a partially supported built-in
  - Replacing an unsupported dependency with the Bun-native equivalent (`bun:sqlite` for `better-sqlite3`)
  - Isolating an irreplaceable Node-only package behind a child process boundary
  - Pinning all shims in one internal package so they are easy to delete later
- **Hands-on Lab**: Produce a built-in compatibility matrix for your service, including one working shim and one dependency swapped for a Bun-native module

### Module 4: Module Resolution and ESM/CommonJS Interop (Week 4)

- **Where resolution rules diverge**
  - Bun's resolver versus Node's algorithm: extension guessing, directory indices, and conditional exports
  - `exports` maps, `imports` fields, and `--conditions` flags under Bun
  - `type: "module"` versus `.mjs`/`.cjs`, and how Bun treats `.js` files differently by default
  - Absolute and aliased imports: `tsconfig` `paths`, `bunfig.toml` aliases, and workspace names
- **Interop hazards in practice**
  - Dual-package hazard: two copies of a library with separate state
  - Default-export interop: `module.exports` consumed as `import x from` and the reverse
  - `__dirname`, `__filename`, and `require` inside ESM files
  - Top-level await interactions with CommonJS dependencies
- **Configuration levers**
  - `bunfig.toml`: `preload`, `install` settings, aliases, and test configuration
  - `tsconfig.json` options that Bun honours versus options only `tsc` reads
  - Preload scripts as the migration point for global setup and monkey patches
- **Hands-on Lab**: Convert a CommonJS service to ESM under Bun, documenting each resolution error encountered and the minimal fix chosen

### Module 5: Native Addons and Binary Dependencies (Week 5)

- **Auditing native dependencies**
  - Detecting `.node` binaries, prebuilt platform packages, and postinstall build scripts
  - Checking N-API version requirements and ABI compatibility with Bun
  - Platform matrices: what has to be built for `linux-x64`, `linux-arm64`, and `darwin-arm64`
- **Making native code work**
  - Running node-gyp builds through Bun's lifecycle script handling
  - Loading prebuilt binaries and handling `MODULE_NOT_FOUND` for missing platform packages
  - Diagnosing segfaults and abort errors that appear only under Bun
  - When to keep a Node.js sidecar process for a single stubborn native dependency
- **Replacing instead of porting**
  - `better-sqlite3` to `bun:sqlite`: API deltas, transactions, and prepared statement semantics
  - Image and crypto libraries: pure-JavaScript or WASM alternatives and their cost
  - Database drivers: `pg`, `mysql2`, and `ioredis` behaviour verification
- **Hands-on Lab**: Get a project with at least one native dependency running under Bun, or document a measured decision to isolate that dependency instead

### Module 6: Test Suite Migration and Parity Testing (Week 6)

- **Porting Jest, Vitest, and Mocha suites to `bun:test`**
  - The Jest-compatible globals: `describe`, `test`, `expect`, `beforeEach`, and timeout APIs
  - Mocking: `mock()`, `mock.module()`, spy semantics, and restoring state between tests
  - Snapshots: migration, formatting differences, and committing updated snapshots deliberately
  - Coverage: `--coverage` reporters, thresholds, and how to keep the old numbers comparable
  - Configuration translation: `jest.config.js`, `setupFilesAfterEach`, and transform pipelines replaced by preload
- **Running both runtimes side by side**
  - A differential harness that executes the same test file under Node.js and Bun
  - Golden-output comparison for tests that produce text or JSON
  - Classifying failures: environment-only, assertion-order, timing, or genuine behaviour difference
  - Contract tests at the HTTP boundary as the most durable parity evidence
- **Defining the parity bar**
  - Percentage of suite passing as a gate, plus an explicit allowlist of known differences
  - Timeouts, flaky tests, and isolating the ones that only fail under parallel execution
  - Turning the parity report into a release gate in CI
- **Hands-on Lab**: Migrate a real test suite, produce a parity report with a pass-rate table, and publish an explicitly justified allowlist of remaining differences

### Module 7: Build and Bundling Pipeline Migration (Week 7)

- **Replacing webpack, Rollup, esbuild, and tsc pipelines**
  - `bun build` targets: `bun`, `node`, and `browser`, and what each changes
  - Entry points, splitting, minification, sourcemaps, and external package handling
  - Loaders for CSS, JSON, text, and asset files without plugin ecosystems
  - Where `bun build` is still not a substitute and a dedicated bundler should stay
- **Library and CLI builds**
  - Emitting ESM and CJS output for npm consumers with `--format`
  - Declaration files: `tsc --emitDeclarationOnly` alongside `bun build`
  - Single-file executables with `bun build --compile` and cross-compilation targets
  - Size and startup comparisons against the previous build output
- **Script and task consolidation**
  - Replacing `ts-node`, `tsx`, `nodemon`, and `concurrently` with `bun --watch` and `bun run`
  - `bunx` versus `npx`, and pinning versions for reproducibility
  - `Bun.which`, `Bun.spawn`, and `Bun.$` for build scripts previously written in bash or Node
- **Hands-on Lab**: Port a production build pipeline to `bun build`, compare bundle size and cold-start time against the previous output, and document anything that had to stay on the old tool

### Module 8: Behavioural Verification and Performance Baselines (Week 8)

- **Proving equivalence rather than assuming it**
  - Shadow traffic: sending mirrored requests to a Bun instance and diffing responses
  - Response-level diffing: status, headers, body shape, and error envelopes
  - Tracing comparison for latency distribution and tail behaviour
  - Verifying background jobs, cron tasks, and queue consumers separately from HTTP
- **Performance baselining**
  - Measuring startup time, requests per second, p99 latency, and RSS against Node.js
  - Benchmarking the paths that matter to your product, not generic hello-world numbers
  - Isolating the effect of `--smol`, JIT warmup, and connection reuse
  - Recording results in a reproducible benchmark script checked into the repository
- **Failure-mode testing**
  - Forced crashes, OOM limits, and graceful shutdown under Bun
  - Signal handling, in-flight request draining, and container stop timeouts
  - Log format and log-shipping compatibility with existing observability
- **Hands-on Lab**: Build a parity and performance report for one service, including p99 latency, startup time, memory ceiling, and at least one tested failure mode

### Module 9: Toolchain Consolidation and Type Safety (Week 9)

- **TypeScript under Bun**
  - Bun's transpile-only model: what is erased and what is never type-checked
  - Keeping `tsc --noEmit` as a separate CI gate and configuring it for Bun's resolution
  - `tsconfig` settings: `moduleResolution: "bundler"`, `types`, and path alias parity with `bunfig.toml`
  - Editor and language server setup so imports resolve the same way the runtime resolves them
- **Consolidating the surrounding tools**
  - ESLint and Prettier integration without losing existing rule sets
  - Environment variable handling: `Bun.env`, `.env` loading order, and typed env validation
  - Replacing dotenv, cross-env, and rimraf with runtime or Bun shell equivalents
  - Debugging: `--inspect`, Chrome DevTools protocol, and source map quality
- **Documentation and onboarding**
  - Writing a migration guide for the team: commands, gotchas, and where the old tools still live
  - Keeping a single source of truth for scripts so both runtimes remain reproducible
- **Hands-on Lab**: Consolidate the toolchain for a service and measure the developer-experience delta: install time, script count, and time to first request

### Module 10: CI/CD and Container Cutover (Week 10)

- **CI pipeline migration**
  - Installing Bun in GitHub Actions with `oven-sh/setup-bun` and caching the Bun cache directory
  - Running a dual-runtime matrix so Node.js stays green until the cutover is approved
  - Frozen lockfile installs, `--bun` script execution, and matrix-level failure isolation
  - Artifact and cache key hygiene when both runtimes build the same project
- **Container images**
  - Multi-stage Dockerfiles on official `oven/bun` images with a slim runtime stage
  - Image size, layer caching, and startup time compared with the previous Node.js image
  - Non-root users, read-only filesystems, and signal handling for graceful stop
  - Memory limits and the effect of `--smol` on small containers
- **Release strategy**
  - Canary and blue-green cutover with measured error-budget checks
  - Health checks, readiness gates, and automatic rollback triggers
  - Database driver behaviour under load as the most common production surprise
  - Writing the cutover runbook and rehearsing the rollback before the real switch
- **Hands-on Lab**: Ship a dual-runtime CI pipeline and a Bun container image, then perform a rehearsed rollback to the previous image

### Module 11: Incremental Adoption and Hybrid Runtimes (Week 11)

- **The strangler pattern for runtimes**
  - Moving one service at a time, ordered by risk rather than by enthusiasm
  - Shared internal packages that must publish dual-runtime output
  - Feature flags and traffic splitting during the transition window
  - Keeping Node.js available indefinitely for the workloads that need it
- **Organisational rollout**
  - Internal enablement: workshops, a starter repository, and a migration checklist
  - Measuring return on investment: CI minutes saved, install time saved, incidents avoided
  - Governance: who approves a cutover, what evidence is required, and when a service reverts
  - Sunset gates for the old pipeline and deletion of compatibility shims
- **Long-term maintenance**
  - Tracking Bun releases against your compatibility allowlist
  - Upgrading Bun deliberately: pinning, changelog review, and regression suites
  - Feeding observed differences back into a shared knowledge base
- **Hands-on Lab**: Write a phased adoption plan for a multi-service system with ordering, owners, evidence requirements, and explicit revert criteria

### Module 12: Capstone — A Real Service on Bun (Week 12)

- **Scope and planning**
  - Selecting a real Node.js service with non-trivial dependencies
  - Locking the parity bar and performance targets before writing code
  - Documenting the risk register and rollback path
- **Execution**
  - Package management, built-in shims, native dependency resolution, and test migration
  - Build pipeline port, CI matrix, and container image
  - Differential parity evidence and benchmark numbers against the Node.js baseline
- **Delivery**
  - Pull-request-based migration with an auditable commit history
  - A written migration report: what was easy, what was hard, what was abandoned
  - A rehearsal of the rollback and a runbook another engineer could follow unaided

## Final Project

**Node.js to Bun Service Migration with Parity Evidence**

Take one real, non-trivial Node.js service and migrate it to Bun end to end, producing evidence at every stage rather than a claim of success.

The project must demonstrate:

1. **A compatibility audit** — a dependency and built-in risk table with an explicit decision for every high-risk item
2. **A converted toolchain** — `bun.lock`, trusted-dependency decisions, and a reproducible CI install
3. **A migrated test suite** — running under `bun test`, with a parity report showing the pass rate and a justified allowlist of remaining differences
4. **A ported build pipeline** — `bun build` output compared with the previous bundle on size and cold start
5. **Measured behaviour and performance** — differential HTTP contract tests plus before/after numbers for startup, throughput, p99 latency, and memory ceiling
6. **A deployment story** — dual-runtime CI matrix, a Bun container image, a canary cutover plan, and a rehearsed rollback
7. **A migration report** — an honest account of gaps found, shims added, and anything deliberately left on Node.js

**Deliverables**:

- A Git repository with the migration history as reviewable pull requests
- A compatibility matrix and risk register
- The parity harness and its latest report
- Benchmark scripts and results checked into the repository
- Dockerfile, CI workflow, and cutover runbook
- A one-page executive summary stating whether the migration met its stated success criteria

## Assessment Criteria

- **Weekly Assignments (30%)**: Artefacts submitted as pull requests — audits, lockfiles, shims, parity reports, and pipelines. Evaluated on evidence quality, not just on things working. Each submission must state what was measured and what was approximated.
- **Mid-term Review (20%)**: Due after Module 6 — a service running its test suite under Bun with a published parity report and an explicit, justified list of remaining differences.
- **Final Project (40%)**: The capstone migration, evaluated on audit rigour, parity evidence, performance measurement, deployment readiness, rollback quality, and the honesty of the migration report.
- **Peer Review and Runbook Usability (10%)**: Reviewing two other capstone migrations, plus an assessment of whether another engineer could execute the submitted cutover and rollback runbook without asking questions.

## References

- [Bun Documentation](https://bun.sh/docs) — Runtime, package manager, test runner, and bundler reference
- [Bun Node.js Compatibility](https://bun.sh/docs/runtime/nodejs-apis) — The authoritative list of supported `node:` APIs and known differences
- [Migrating to Bun](https://bun.sh/guides) — Official guides for moving existing projects onto Bun
- [bun test](https://bun.sh/docs/cli/test) — Test runner documentation, including Jest compatibility notes
- [bun build](https://bun.sh/docs/bundler) — Bundler, single-file executables, and cross-compilation
- [oven-sh/setup-bun](https://github.com/oven-sh/setup-bun) — GitHub Actions setup action used in the CI modules
- [oven/bun Docker images](https://hub.docker.com/r/oven/bun) — Official container images for the deployment modules

---
title: "Bun Monorepo and Workspace Architecture Engineering Syllabus"
description: "A 12-week advanced curriculum for engineering teams running multiple applications and shared packages in a single Bun workspace — covering workspace topology, the install and symlink graph, package boundary design, version catalogs, task orchestration, internal package publishing, affected-only CI, and per-app container builds."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Bun Monorepo and Workspace Architecture Engineering Syllabus

## Overview

Most teams adopt a monorepo by accident: a shared utility gets copied into three repositories, someone extracts it, then a second application needs it, and within a year the "monorepo" is a folder of loosely related projects that install in nine minutes and deploy all at once whether or not anything changed. This syllabus treats the monorepo as an architecture problem rather than a folder layout problem, and uses Bun workspaces as the substrate because its single lockfile, built-in task filtering, and workspace-aware linking make the mechanics visible instead of hiding them behind a tool chain of plugins.

The course is written for engineers who already know how to build and ship a single Bun or Node.js application and now have to do it for a system of applications, shared libraries, internal tooling, and configuration packages maintained by several teams. It sits alongside the other Bun syllabi without repeating them: the general development syllabus teaches the runtime, the runtime internals syllabus goes below the API surface, the full-stack syllabus builds one product, and the migration syllabus moves an existing Node.js service across. This one is about the repository as a unit — how the workspace graph is shaped, how dependencies flow through it, how work is scheduled across it, and how CI and deployment stop being proportional to the size of the repo.

Every module ends with a lab that leaves an artifact in the repository: a topology decision record, a resolution diagnosis, a boundary rule set, a catalog policy, a task graph, a release plan, a sharded workflow, or a per-app build. The final capstone consolidates those artifacts into a working monorepo with measured installation, build, and CI improvements against a recorded baseline, because a monorepo that is not measurably faster than the polyrepo it replaced has simply added coordination cost.

## Curriculum

### Module 1: Monorepo Economics and Workspace Topology (Week 1)

- **Deciding whether a monorepo is the right unit**
  - The real costs: coupling of release cadence, blast radius of a bad commit, CI load, and tooling maintenance
  - The real benefits: atomic cross-cutting changes, a single dependency graph, shared configuration, and code discovery
  - Polyrepo, monorepo, and hybrid: what each makes cheap and what each makes expensive
  - Sizing the repository: how many applications and packages before the graph needs its own governance
- **Designing the topology before adding a second app**
  - The `apps/` versus `packages/` split and what belongs in neither (scripts, tooling, fixtures)
  - Naming and scoping conventions that survive growth: `@acme/api`, `@acme/ui`, `@acme/config`, `@acme/testing`
  - Boundary taxonomy: deployable applications, published libraries, internal-only libraries, configuration packages, and test utilities
  - A topology decision record: writing down the rule that decides where a new package goes
- **The root workspace manifest**
  - `workspaces` globs, negative patterns, and why broad globs age badly
  - Root-only dependencies versus per-package dependencies, and how a stray root dependency leaks into every package
  - Centralised scripts and the difference between the root being a coordinator and the root being a package
- **Hands-on Lab**: Produce a topology decision record and a repository tree for three applications and six packages, with an explicit rule for where a new package belongs

### Module 2: The Install Graph, Linking, and Resolution (Week 2)

- **How one lockfile becomes many `node_modules` trees**
  - `bun install` at the root: what the single `bun.lock` guarantees and what it does not
  - Hoisted versus isolated linking and the failure modes each one trades away
  - Symlinked workspace packages: what `workspace:*` actually creates on disk
  - Why an import that works locally can still fail in a container build
- **Diagnosing resolution instead of guessing**
  - Reading the resolution graph and finding which package pulled in a transitive dependency
  - Duplicate detection: two copies of the same library arriving through different paths
  - Peer dependency placement in a workspace, and why React or a driver must resolve to exactly one copy
  - Tracing a failed import from the error message back to a manifest, not to a cache clear
- **Reproducibility and trust**
  - `--frozen-lockfile` in CI and what a lockfile diff means during review
  - Trusted dependencies and lifecycle scripts: which packages are allowed to execute code at install time
  - Offline and vendored installs for restricted build environments
  - Install performance as an architectural property: cache keys, store reuse, and cold versus warm installs
- **Hands-on Lab**: Introduce a deliberate duplicate dependency, diagnose it from the resolution graph, remove it, and record cold and warm install timings before and after

### Module 3: Package Boundaries and the Workspace Protocol (Week 3)

- **Making boundaries enforceable rather than aspirational**
  - Internal versus external consumers: which packages may be imported by which applications
  - The `exports` map as the package's public API, and sealing internal paths behind it
  - `workspace:*` versus a published semver range: choosing based on whether the package leaves the repository
  - Preventing deep imports into another package's source tree
- **Type and build boundaries**
  - Per-package `tsconfig.json` files with a shared base configuration
  - Project references and incremental type checking across the graph
  - Types-only packages that carry the shared contracts without runtime weight
  - Path aliases: convenience versus a hidden coupling that breaks published output
- **Enforcement in the repository**
  - Lint rules and import-boundary checks that fail the build on a violation
  - Review conventions for a cross-package change and who has to approve it
  - Deprecation and removal: retiring a package without breaking three applications silently
- **Hands-on Lab**: Seal one package behind an `exports` map, add an import-boundary check, and demonstrate the build failing on a forbidden import before it passes cleanly

### Module 4: Version Catalogs and Dependency Governance (Week 4)

- **The shared-version problem**
  - Why two versions of a framework in one repository is usually a defect, not a convenience
  - The `catalog` mechanism: declaring a version once and referencing it from every workspace
  - Deciding which dependencies belong in the catalog and which must stay local
  - Upgrading a catalog entry and understanding the true blast radius
- **Governance process**
  - A single owner for shared infrastructure dependencies, and an escalation path when an application needs an exception
  - Upgrade cadence: scheduled, security-driven, and opportunistic upgrades
  - Automated dependency update pull requests that respect the catalog rather than fighting it
  - Reading a lockfile diff during review: transitive churn that nobody asked for
- **Policy as code**
  - Blocking duplicate copies of critical packages in CI
  - Allow-listing dependencies by scope, license, and maintenance status
  - Recording exceptions with an owner and an expiry date rather than a permanent comment
- **Hands-on Lab**: Convert three applications to a catalog-backed dependency set, add a duplicate-version gate to CI, and document one justified exception

### Module 5: Task Orchestration and the Build Graph (Week 5)

- **Running work across workspaces**
  - Filtering by package name, glob, and path, and how filters compose
  - Dependency-ordered execution: what Bun sorts automatically and what it cannot know
  - Parallel and sequential runs: when concurrency is safe and when it corrupts output
  - The difference between a task that must run once at the root and a task that must run per package
- **Designing tasks that cache well**
  - Deterministic inputs: source files, configuration, environment variables, and generated artifacts
  - Cache keys that include everything that can change the output, and nothing that cannot
  - Incremental builds: what a second run should skip and how to prove it did
  - Avoiding rebuild storms when one shared package changes and eleven consumers wake up
- **Feedback loops for developers**
  - Watch mode across a graph without watching the whole repository
  - Scoping a local run to "this package and everything that depends on it"
  - Keeping the root task list small enough that people still use it
- **Hands-on Lab**: Build a filtered, dependency-ordered task graph for build, test, and typecheck, then measure the second run and show what was skipped

### Module 6: Internal Package Publishing and Release Engineering (Week 6)

- **When a package leaves the workspace**
  - Internal-only packages that never publish, and published packages consumed outside the repo
  - The dual obligation of a published package: it must build standalone, not just inside the monorepo
  - Preparing a tarball and inspecting what actually ships before publishing anything
- **Versioning across a graph**
  - Independent versus fixed versioning, and which one a shared UI library forces you into
  - Changesets or an equivalent record of intent, so version bumps are reviewed rather than guessed
  - Pre-release channels and dist-tags for staging consumers
  - Coordinating a breaking change with the applications that must migrate in the same window
- **Publishing safely**
  - Private registry configuration for internal packages
  - Provenance, signing, and the difference between "published" and "trusted"
  - Publishing from CI on merge rather than from a laptop, with a token scoped to the registry only
  - Dry runs, and the habit of inspecting the packed manifest before the registry does
- **Hands-on Lab**: Publish one internal package through a pre-release channel, consume it from a scratch project outside the repo, and promote it to a stable version with a changeset entry

### Module 7: Testing Strategy Across a Workspace (Week 7)

- **What a monorepo changes about testing**
  - Per-package unit tests versus root integration tests versus end-to-end tests against deployed apps
  - A shared testing package: fixtures, factories, and harnesses that must not reach production bundles
  - Coverage aggregation across packages, and why a per-package threshold hides a dead package
  - Test isolation when several packages touch the same database or filesystem
- **Running the right tests**
  - Filtered runs in development and in CI
  - Affected-only selection: mapping changed files to the packages and applications that must be re-tested
  - Contract tests between an internal package and the applications that consume it
  - Flaky-test quarantine without turning the suite into a suggestion
- **Fast feedback without false confidence**
  - Splitting a suite into a quick gate and a deep nightly run
  - Snapshot hygiene across packages that share components
  - Reproducing a CI-only failure locally with the same filtered command CI used
- **Hands-on Lab**: Implement affected-only test selection for a six-package graph, then prove it skips a package whose dependencies did not change

### Module 8: CI for Monorepos — Caching, Sharding, and Scope (Week 8)

- **Install is the first performance problem**
  - Lockfile-hash cache keys and what invalidates them
  - Persisting the package store between runs instead of caching `node_modules`
  - Frozen installs and the cost of a lockfile that changes on every branch
  - Setup steps for Bun in a CI workflow, pinned to a version rather than floating
- **Making the pipeline proportional to the change**
  - Determining the changed set from a diff and mapping it onto workspaces
  - Matrix sharding by package, with a balanced split rather than an alphabetical one
  - Running the build graph once and sharing artifacts instead of rebuilding per job
  - Fail-fast versus complete-report trade-offs when twelve packages run in parallel
- **Workflow hygiene**
  - Concurrency groups that cancel superseded runs on the same branch
  - Separate pull-request and main-branch pipelines with different scopes
  - Repository-wide checks (lint, license, boundary rules) that must not be duplicated per package
  - Cost tracking: CI minutes per merge, and the commits that quietly double them
- **Hands-on Lab**: Split a single monolithic workflow into an install job, a sharded test matrix, and a gated build, then record the wall-clock and minute cost against the original

### Module 9: Container Builds and Deployment per Application (Week 9)

- **One repository, many images**
  - Why a root-level lockfile complicates a naive `COPY package.json` Dockerfile
  - Workspace-aware multi-stage builds: installing only what an application needs
  - Layer ordering that keeps dependency layers warm when source changes
  - Image identity: tagging by application and commit, not by repository
- **Deploying only what changed**
  - Mapping a merged change onto the set of applications that must ship
  - Independent deploy pipelines with shared build steps
  - Environment configuration that is per-application rather than per-repository
  - Rollback that is scoped to one application
- **Build-time versus runtime boundaries**
  - When a package must be compiled into the image and when it can be installed from a registry
  - Shared assets, fonts, and static files across applications
  - Keeping development-only packages out of production images
- **Hands-on Lab**: Write a workspace-aware multi-stage Dockerfile for one application, build it from a cold cache, and show the image size against a naive root copy

### Module 10: Type Safety and Linting at Repository Scale (Week 10)

- **Type checking as a graph operation**
  - Project references and `--build` mode across packages
  - Incremental information files and where they should live
  - Editor responsiveness when a repository has twenty projects
  - Distinguishing "types are broken" from "types have not been built yet"
- **Sharing configuration without sharing fate**
  - A configuration package for `tsconfig`, linter rules, and formatter settings
  - Versioned configuration changes and their effect on every package at once
  - Per-package overrides that must be justified rather than accumulated
  - Keeping generated types (schemas, API clients) out of the typechecking hot path
- **Enforcing the rules that matter**
  - Boundary, import-cycle, and unused-dependency checks in one place
  - Lint scope: whole-repo rules versus package rules
  - Pre-commit hooks that stay under a useful time budget
- **Hands-on Lab**: Add project references to six packages, measure a cold and warm typecheck, and reduce the warm run by at least half through incremental configuration

### Module 11: Supply Chain, Hygiene, and Long-Term Maintenance (Week 11)

- **Dependency risk in a shared graph**
  - Auditing a workspace where one vulnerable transitive dependency reaches eight packages
  - Patching a dependency locally and recording why the patch exists
  - License policy enforcement across applications and published packages
  - Reviewing new dependencies as architecture decisions, not as one-line diffs
- **Repository hygiene that prevents decay**
  - Detecting unused packages, unused dependencies, and orphaned workspace entries
  - Dead code and duplicate utility sprawl: the failure mode of every monorepo
  - Periodic graph review: which boundaries have eroded since the last audit
  - Documentation that stays true: a topology map generated from the repository rather than written by hand
- **Operating the repository as a product**
  - An owner, a support channel, and a documented change process for shared packages
  - Onboarding a new team into the workspace without granting them the whole graph
  - Migration paths out: extracting a package into its own repository when it genuinely should leave
  - Metrics that matter: install time, CI duration, deploy frequency, and change lead time
- **Hands-on Lab**: Run a hygiene audit, produce a remediation list ordered by blast radius, and write the extraction plan for one package that should leave the repository

### Module 12: Capstone — A Governed Bun Monorepo (Week 12)

- **Scope and baseline**
  - Three applications and at least six packages, with at least one publishable library
  - A recorded baseline: install time, CI duration, and time-to-first-deploy from the polyrepo or naive setup
- **Consolidation**
  - Topology decision record, catalog-backed dependencies, and enforced boundaries
  - A dependency-ordered task graph with working incremental behaviour
  - Affected-only testing and sharded CI
  - Per-application container images and independent deploys
- **Delivery**
  - A repository another team could join using only the written documentation
  - A before-and-after report with numbers, including anything that got slower and why
  - A governance document: ownership, upgrade cadence, exception process, and review requirements

## Final Project

**Consolidating a Polyrepo into a Governed Bun Workspace**

Take three small applications that currently share code by copying or by publishing ad-hoc packages, and consolidate them into one Bun workspace with measured, defensible improvements.

The project must demonstrate:

1. **A topology decision record** — the boundary taxonomy, naming rules, and the test for where a new package belongs
2. **A reproducible install** — a single lockfile, frozen installs in CI, trusted-dependency decisions, and cold/warm install timings
3. **Enforced boundaries** — sealed `exports` maps, an import-boundary check that fails the build on violation, and no deep imports
4. **Governed dependencies** — a version catalog covering shared infrastructure dependencies, plus a CI gate blocking duplicate critical packages
5. **A dependency-ordered task graph** — filtered build, test, and typecheck tasks with demonstrated incremental behaviour
6. **Affected-only CI** — a sharded matrix that skips untouched packages, with wall-clock and CI-minute numbers against the baseline
7. **One published package** — a changeset-versioned internal library released through a pre-release channel and then promoted
8. **Per-application delivery** — a workspace-aware Dockerfile per application and a deploy pipeline that ships only changed apps
9. **An honest report** — what improved, what got worse, which trade-offs were accepted, and what would be done differently

**Deliverables**:

- A Git repository with the consolidation history as reviewable pull requests
- The topology decision record and governance document
- CI workflows for pull requests and the main branch, with the sharded test matrix
- Dockerfiles and deploy configuration per application
- Benchmark results for install, typecheck, test, and full CI, each paired with its baseline
- A one-page summary stating whether the consolidation met its stated success criteria

## Assessment Criteria

- **Weekly Assignments (30%)**: Repository artifacts submitted as pull requests — decision records, resolution diagnoses, boundary rules, catalog policies, task graphs, release plans, and workflows. Evaluated on whether the artifact constrains future decisions, not on whether it merely documents the current state.
- **Mid-term Review (20%)**: Due after Module 6 — a workspace with enforced boundaries, catalog-backed dependencies, and a working dependency-ordered task graph, demonstrated on a fresh clone.
- **Final Project (40%)**: The capstone consolidation, evaluated on topology soundness, reproducibility, boundary enforcement, CI proportionality, release discipline, deployment independence, and the accuracy of the before-and-after report.
- **Peer Review and Documentation Usability (10%)**: Reviewing two other capstone repositories, plus an assessment of whether a new engineer could join the workspace and ship a change using only the submitted documentation.

## References

- [Bun Workspaces](https://bun.sh/docs/install/workspaces) — Workspace configuration, linking, and filtered script execution
- [Bun Package Manager](https://bun.sh/docs/cli/install) — Install flags, lockfile behaviour, trusted dependencies, and caching
- [bun install catalog](https://bun.sh/docs/install/catalogs) — Shared version catalogs for workspace dependencies
- [bun publish](https://bun.sh/docs/cli/publish) — Publishing packages, dist-tags, and registry configuration
- [bun pm](https://bun.sh/docs/cli/pm) — Packing, listing, and inspecting the dependency graph
- [Bun Test Runner](https://bun.sh/docs/cli/test) — Test filtering, coverage, and CI usage
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html) — Incremental builds across packages
- [oven-sh/setup-bun](https://github.com/oven-sh/setup-bun) — GitHub Actions setup used throughout the CI modules
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/) — Layer and stage patterns for per-application images

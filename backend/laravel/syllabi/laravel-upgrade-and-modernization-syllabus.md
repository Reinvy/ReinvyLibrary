---
title: "Laravel Upgrade and Modernization Engineering Syllabus"
description: "A 10-week advanced curriculum on modernizing legacy Laravel applications, covering version assessment, characterization test safety nets, PHP runtime upgrades, automated codemods with Rector, framework major-version migrations, zero-downtime schema changes, frontend build replacement, package debt, canary deployment, and continuous modernization programs."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Laravel Upgrade and Modernization Engineering Syllabus

## Overview

Most Laravel applications in production are not greenfield. They are four to eight years old, running a framework version that shipped before the current LTS line, holding a Composer lockfile nobody dares to regenerate, and carrying a test suite that covers the happy paths of features that no longer matter. The engineering problem in front of the team is not "learn Laravel" — it is "move a working system across three major versions of the framework and two major versions of PHP without losing a day of revenue or a single order."

This 10-week advanced syllabus treats that problem as a discipline rather than a chore. Each module assumes the learner already writes Laravel daily and now needs the judgment to change a live system safely: how to measure what is actually risky, how to build the safety net before touching a line of code, how to mechanize the mechanical parts with codemods instead of hand-editing thousands of call sites, and how to sequence a multi-month upgrade so that every week ends with a deployable artifact rather than a long-lived branch that diverges from production.

The curriculum is deliberately ordered by risk of irreversibility. Assessment and test coverage come first because they are cheap and they make every later step reversible. Runtime and codemods come next because they produce mechanical, reviewable diffs. Framework and data-layer migrations come after that, because schema changes are the only decisions in the whole program that cannot be rolled back with a `git revert`. Frontend, dependency debt, and deployment follow, ending with the operational work of proving the upgraded system behaves better than the old one — and with the continuous modernization habits that prevent the next five-year gap from forming.

Graduates leave able to answer, in a design review, exactly why each step of an upgrade is ordered the way it is, what the rollback boundary is at each stage, and how they would prove the new system is not quietly worse than the one it replaced.

## Curriculum

### Module 1: Upgrade Assessment and Risk Mapping (Week 1)

- **Inventory Before Opinion**
  - Version matrix: `php -v`, `composer show laravel/framework`, and the gap between the installed line and the current supported line
  - `composer outdated --direct` versus `--all`: direct dependencies are your obligations, transitive ones are your constraints
  - Reading `composer.lock` as a compatibility document: which packages pin the framework, and which pin PHP itself
  - Locating version constraints that make the upgrade impossible without an intermediate step (`"laravel/framework": "^8.0"` in a package nobody maintains)
- **Mapping the Application Surface**
  - Routes, console commands, jobs, scheduled tasks, event listeners, and notifications — the six entry points that must all be exercised
  - Finding framework coupling that will break: custom service providers touching container internals, overridden `Kernel` classes, `app/Http/Kernel.php` middleware arrays
  - Deprecated API census with static analysis rather than grep: symbols removed between your version and the target
  - Third-party integration inventory: payment, mail, storage, queue, and search drivers that carry their own version requirements
- **Risk Scoring and Sequencing**
  - Scoring work by blast radius (revenue path, auth, data integrity) versus effort
  - Choosing the upgrade path: one large jump with codemods, or staged hops (8 → 9 → 10 → 11) that each ship to production
  - Where staged hops win (every hop is reversible, team learns the tooling) and where they cost more (three deploy cycles, three regression windows)
  - Writing the upgrade ADR: target versions, sequencing, rollback boundaries, and the explicit non-goals
- **Hands-on Lab**: Produce a one-page upgrade assessment for a supplied legacy Laravel 8 application — version matrix, blocking dependency list, risk-scored work breakdown, and a recommended sequencing with rollback boundaries stated per stage

### Module 2: Building the Safety Net First (Week 2)

- **Why Coverage Comes Before Code**
  - The uncomfortable rule: an upgrade without regression tests is a rewrite with extra steps
  - Coverage as a floor, not a goal — 60% coverage on the revenue paths beats 95% coverage of dead feature flags
  - Identifying the critical path: the routes that move money, authenticate users, or write data that cannot be reconstructed
- **Characterization Tests for Untested Code**
  - Golden-master testing: capture real HTTP responses for a route, assert byte-equality after the upgrade
  - Recording fixtures from production-shaped data, scrubbed of personal information
  - Snapshotting console command output, queue payloads, and mail bodies — the parts that fail silently
  - Asserting behavior, not implementation: what to freeze and what to leave free so the upgrade has room to move
- **Test Infrastructure That Survives an Upgrade**
  - Isolating the database layer: transactions per test versus a fresh schema, and why parallel testing changes the answer
  - Pest versus PHPUnit across framework versions — syntax that will and will not survive the jump
  - Faking the edges: `Http::fake()`, `Queue::fake()`, `Mail::fake()` used as a stabilization layer during migration
  - Contract tests for third-party boundaries so an SDK bump surfaces as one failing test instead of a production incident
- **Measuring the Baseline**
  - Freezing a performance baseline: p50/p95 latency, query counts per request, memory peak
  - Recording the baseline as an artifact in the repository so the post-upgrade comparison is not a memory exercise
  - Baseline noise discipline: warm caches, fixed data set, repeated runs, and reported variance
- **Hands-on Lab**: Take an untested Laravel 8 checkout flow, build a characterization suite that pins its current behavior byte-for-byte, and record a performance baseline the upgraded system will be measured against

### Module 3: PHP Runtime Modernization (Week 3)

- **The Runtime Is the Real Upgrade**
  - PHP 7.4 to 8.4 as a sequence of behavior changes, not a version number: deprecations, type strictness, and removed extensions
  - The breaking changes most Laravel codebases actually hit: dynamic properties, implicit nullable parameters, string-to-number comparison, `#[\ReturnTypeWillChange]` on ArrayAccess
  - JIT in practice: why enabling it is not an automatic win for request-per-process web workloads
  - Choosing the target: latest supported minor versus one behind for extension compatibility
- **Type System Adoption**
  - Typed properties and constructor promotion applied to legacy classes without changing behavior
  - Enums replacing class-constant state machines — including the Eloquent cast that makes them persist correctly
  - `readonly` for value objects, and the serialization traps it creates with queued jobs
  - First-class callable syntax and named arguments used to delete reflection-based indirection
- **Static Analysis as the Migration Compass**
  - Installing Larastan and starting at a level that fails today, then ratcheting upward per-directory
  - Baseline files: accepting existing errors without accepting new ones
  - Reading a static-analysis error during an upgrade: is it a real type bug, or a signature the framework changed under you
  - Wiring the analysis level into CI so modernization progress is measurable over months, not vibes
- **Hands-on Lab**: Move a PHP 7.4 Laravel 8 codebase to PHP 8.4 with Larastan at level 5, using a per-directory baseline so the upgrade lands in reviewable increments rather than one 4,000-line PR

### Module 4: Automated Codemods with Rector (Week 4)

- **Why Hand-Editing Does Not Scale**
  - The arithmetic of mechanical change: 500 call sites of a renamed helper, each an opportunity for a typo nobody reviews
  - Codemods as reviewable, reproducible, re-runnable transformations — the diff is the documentation
  - Where codemods stop: business logic, architectural boundaries, and anything requiring domain knowledge
- **Working with Rector**
  - Installation and configuration: `rector.php` as a set of paths and rule sets, versioned alongside the application
  - The Laravel rule sets (`LARAVEL_80`, `LARAVEL_90`, `LARAVEL_100`, `LARAVEL_110`) and PHP level sets, applied in sequence rather than all at once
  - Dry runs as an inventory tool: `--dry-run` output is a map of how much mechanical debt exists
  - Reading a codemod diff critically — automated transformations that compile but change semantics
- **Custom Rules for Your Own Patterns**
  - Writing a rule for a house abstraction that wrapped a removed framework API
  - Using the rule to migrate call sites AND to delete the wrapper afterwards
  - Testing rules against fixtures before letting them loose on the codebase
- **Discipline and CI Gates**
  - One rule set per pull request; codemod commits never mixed with behavior changes
  - `--dry-run` in CI as a drift detector that fails when new legacy syntax is introduced
  - Review budget: how large a codemod PR can get before reviewers stop reading (and what to do instead)
- **Hands-on Lab**: Build a Rector pipeline that upgrades a Laravel 8 codebase's framework calls to the Laravel 11 API surface, plus one custom rule for an in-house wrapper, delivered as a sequence of single-rule pull requests with clean diffs

### Module 5: Framework Major-Version Migration (Week 5)

- **Reading the Upgrade Guide as a Specification**
  - The upgrade guide as a checklist of behaviors, not a changelog: what changed, what was removed, what silently changed meaning
  - Building a tracking artifact from the guide with every item mapped to a test or a code location
  - Version-specific terrain: Laravel 9 (Symfony 6, anonymous stub migrations), Laravel 10 (native types, deprecation of `Predis` defaults), Laravel 11 (slimmed skeleton, `bootstrap/app.php`), Laravel 12 (starter-kit era, dependency bumps)
- **The Application Bootstrap Rewrite**
  - `app/Http/Kernel.php`, `app/Console/Kernel.php`, and `app/Exceptions/Handler.php` collapsing into `bootstrap/app.php`
  - Re-declaring middleware, middleware groups, route middleware aliases, and priority in the new fluent API
  - Exception rendering and reporting registered through the new closure-based surface
  - Scheduling moving from `Kernel::schedule()` into `routes/console.php`, and what happens to tasks defined in both places
- **Container, Facade, and Helper Surface Changes**
  - Facade and contract moves across versions, and the aliases that keep old imports compiling
  - Removed helpers and the string/array API consolidation (`Str`, `Arr` methods moved from helpers)
  - Eloquent behavior changes: default `Model::preventLazyLoading`, cast behavior, `upsert` semantics
  - Carbon 2 to Carbon 3: diff signs, mutable versus immutable defaults, and date assertions in tests
- **Dependency Alignment**
  - Bumping `laravel/framework`, `symfony/*`, PHPUnit, and Collision together — they are one compatibility unit
  - Resolving `composer update` conflict trees by reading the constraint, not by deleting the lockfile
  - Container rebuild discipline: reproducible builds, platform requirements (`config.platform.php`), and extension parity between CI and production
- **Hands-on Lab**: Migrate a Laravel 9 application to Laravel 12, including the `bootstrap/app.php` rewrite with full middleware and exception parity, and prove parity with the Module 2 characterization suite

### Module 6: Data Layer and Schema Migration (Week 6)

- **The Irreversible Decisions**
  - Why schema changes are the upgrade's true rollback boundary: code reverts in seconds, dropped columns do not come back
  - Expand-contract as the default pattern: add new shape, dual-write, backfill, switch reads, remove old shape in a later release
  - Migration squashing for a legacy `migrations/` directory and generating a schema dump for fresh installs
- **Zero-Downtime Migration Mechanics**
  - Locks in MySQL and PostgreSQL: which `ALTER` statements block writes and for how long
  - Online DDL, `ALGORITHM=INPLACE`, and when a nullable column with a default is still a table rebuild
  - Backfilling in batches from a queued job, with idempotency and progress checkpoints
  - Deploy ordering: migrate-first versus migrate-after, and the code that must tolerate both schemas during the window
- **Engine and Charset Modernization**
  - MySQL 5.7 to 8.0 as an upgrade inside the upgrade: `utf8mb4` collations, reserved words, `ONLY_FULL_GROUP_BY`
  - JSON column behavior and the query differences that break reporting code
  - PostgreSQL version jumps and the `pg_upgrade` versus logical-replication decision
  - Connection pooling and proxy layers (PgBouncer, ProxySQL) that change how migrations behave
- **Model and Query Semantics**
  - Casts that changed meaning across versions, and the tests that catch it
  - `Model::preventSilentlyDiscardingAttributes` and `preventAccessingMissingAttributes` as migration-time guardrails
  - N+1 exposure after an upgrade: why query counts change and how the baseline from Module 2 proves it
- **Hands-on Lab**: Perform an expand-contract migration on a live-shaped orders table — add the new column, dual-write, backfill 2 million rows in batches, switch reads, and prove zero failed requests under load throughout

### Module 7: Frontend and Build Pipeline Replacement (Week 7)

- **Mix to Vite**
  - Laravel Mix's webpack world versus Vite's ESM dev server: what actually changes for the application
  - Migrating `webpack.mix.js` to `vite.config.js` — entry points, aliases, and the legacy plugin escape hatch
  - Blade directive replacement (`@vite` versus `mix()`) and the manifest mismatch failure mode in production
  - Asset versioning, cache busting, and CDN invalidation during the switch
- **View Layer Modernization**
  - Blade component extraction from duplicated includes, and the anonymous component syntax introduced mid-upgrade
  - Choosing the rendering path forward: Blade plus Alpine, Livewire, or Inertia — the migration cost of each
  - Server-side rendering introduced without breaking the existing HTML contracts
  - CSS pipeline changes: PostCSS, Tailwind version jumps, and the purge-safelist regressions that follow
- **Progressive Replacement**
  - Strangler-fig routing: mounting the new frontend behind a path prefix while the old Blade pages keep serving
  - Shared session and auth across two frontends during the transition
  - Feature flags as the switch between old and new views, with per-tenant rollout
- **Hands-on Lab**: Replace a Mix-based Blade application's build with Vite, migrate one feature area to a component architecture behind a feature flag, and demonstrate a working production build with hashed assets and a functioning rollback flag

### Module 8: Dependency and Package Debt (Week 8)

- **Assessing the Estate**
  - Abandoned packages: `composer audit`, Packagist abandonment flags, and the packages whose maintainer stopped replying
  - Direct versus transitive ownership: which packages you can actually choose to replace
  - Compatibility matrices built by hand when the package's own README has not been updated since Laravel 8
- **Replacement Decisions**
  - Replace, fork, vendor, or reimplement — the decision criteria and the cost of each over three years
  - Preferring a maintained package over a fork, and the conditions where forking is correct (small surface, critical path, proprietary need)
  - Wrapping a third-party SDK behind your own interface so the next replacement is a one-file change
  - Deleting packages: finding the ones installed for a feature that was removed two years ago
- **Framework Coupling Inside Packages**
  - Packages that reach into container internals or override framework classes — the ones that break on every major upgrade
  - Officially supported first-party packages and their independent version cadence (Horizon, Telescope, Sanctum, Passport, Sail)
  - Reviewing an unmaintained package's upgrade risk by reading its service provider, not its version constraint
- **Policy for the Future**
  - Automated dependency updates (Dependabot, Renovate) grouped so patch noise does not hide a major bump
  - A monthly upgrade debt review: how far behind the framework line the application is allowed to drift
  - Documenting the "no new unmaintained dependencies" rule that prevents the next modernization project
- **Hands-on Lab**: Audit a legacy dependency tree of at least 30 direct packages, classify each as keep, upgrade, replace, or delete, and execute two replacements behind interfaces with contract tests proving behavior is preserved

### Module 9: Shipping the Upgrade (Week 9)

- **Deployment Strategy**
  - Blue/green versus canary versus rolling: which one your infrastructure actually supports and what each assumes about the database
  - The migration-ordering constraint: what must ship before, with, and after the schema change
  - Pre-warming the new release: opcache, config cache, route cache, view cache, and the cold-start latency spike
  - Queue workers and the old/new payload compatibility problem during a rolling deploy
- **Observability as the Acceptance Test**
  - Dashboards created before the deploy, not after: error rate, p95 latency, queue depth, job failure rate, DB connection count
  - Comparing against the Module 2 baseline with an explicit tolerance, not a feeling
  - Structured logging and tracing continuity across the version change
  - Alert thresholds tightened for the release window, and a stated rule for who pulls the trigger on rollback
- **Rollback Rehearsal**
  - Rehearsing rollback in staging with production-shaped data, including the schema direction that cannot be undone
  - Time-boxing the decision: how long after a bad deploy is rollback still cheaper than forward-fix
  - Feature flags that make rollback partial rather than total
- **Hands-on Lab**: Execute a canary deployment of an upgraded Laravel application to a staging environment with 10% traffic shifting, run the rollback rehearsal end to end, and submit the before/after metrics comparison with tolerances stated in advance

### Module 10: Continuous Modernization (Week 10)

- **Preventing the Next Five-Year Gap**
  - A supported-version policy with a written maximum drift (for example, never more than one major version behind)
  - Scheduling upgrade work as recurring capacity rather than a heroic annual project
  - Tracking framework and PHP support windows against your own release calendar
- **Guardrails That Keep the Codebase Upgradeable**
  - Deprecation logging in production: surfacing `E_DEPRECATED` and framework deprecation notices before they become removals
  - Static analysis and codemod dry-runs as permanent CI gates, so legacy syntax cannot re-enter
  - Architectural fitness functions: a test that fails when a controller imports an SDK directly or a package reaches into the container
  - A dependency policy encoded in CI rather than in a wiki page nobody reads
- **Institutional Memory**
  - Writing the upgrade runbook while doing it, so the second upgrade is a checklist instead of an investigation
  - ADRs for the sequencing decisions that will be questioned six months later
  - Handover documentation: what breaks, in what order, and which tests prove it
- **Measuring the Program**
  - Metrics that matter after the upgrade: deploy frequency restored, incident rate, p95 latency, dependency age
  - Retrospective structure that produces concrete policy changes, not retrospective theater
- **Hands-on Lab**: Publish a modernization program proposal for the application you upgraded — a drift policy, CI guardrails with actual configuration, a quarterly review template, and a runbook derived from the work performed in Weeks 1-9

## Final Project

Modernize a supplied legacy Laravel 8 / PHP 7.4 order-management application to Laravel 12 / PHP 8.4, delivering it as a sequence of production-shaped releases rather than a single cutover.

The application ships with intentional debt: an untested checkout path, a Mix build, three abandoned packages including one that wraps a removed framework helper, a `migrations/` directory with 140 entries and no schema dump, and an `app/Http/Kernel.php` carrying custom middleware priority. The project requires the learner to:

- Produce the upgrade assessment and ADR from Module 1, including a risk-scored work breakdown
- Build a characterization suite that pins the checkout and refund flows byte-for-byte, and record the performance baseline
- Upgrade the PHP runtime with Larastan enabled at a ratcheted level and a committed baseline
- Deliver the mechanical migration as a sequence of single-rule Rector pull requests with clean, reviewable diffs
- Migrate the framework to Laravel 12 including the `bootstrap/app.php` rewrite with verified middleware and exception parity
- Perform the expand-contract schema change on the orders table with a batched backfill of at least one million rows and zero failed requests under load
- Replace the Mix build with Vite and migrate one feature area behind a feature flag
- Replace or retire the abandoned packages behind interfaces with contract tests
- Execute a canary deployment with pre-created dashboards and a rehearsed rollback
- Deliver the continuous modernization proposal from Module 10

The deliverable is a repository plus an operations binder: the upgrade runbook, the ADR set, the post-upgrade metrics comparison against the baseline, and the guardrail configuration that keeps the codebase upgradeable. The grader must be able to reconstruct the entire upgrade from the binder without interviewing the learner.

## Assessment Criteria

- **Weekly Labs (40%)**: Each module's lab is graded on whether the artifact would survive review by a senior engineer — a characterization suite that actually pins behavior, a codemod pipeline with clean diffs, a migration that runs without locking, a canary with dashboards created in advance. Partial credit is not given for artifacts that only work on the happy path.
- **Code Review Discipline (15%)**: Pull requests must separate mechanical change from behavioral change. A codemod mixed with a logic fix, or a schema change bundled with a refactor, loses points even when it works.
- **Rollback Evidence (15%)**: Every release stage must have a stated rollback boundary and at least one rehearsal. A stage with no rollback story is treated as an incomplete stage, regardless of whether it deployed successfully.
- **Final Project (25%)**: Graded on end-state correctness (the application behaves identically or better on the pinned behavior suite), zero-downtime execution under the load test, and the quality of the operations binder. A working upgrade with no binder scores at most half of the project points.
- **Passing Standard**: Every module lab submitted, both load tests survived with zero failed requests, the characterization suite green on the upgraded system, and a rollback rehearsal executed — not merely described.

## References

- [Laravel Upgrade Guide](https://laravel.com/docs/upgrade) — the version-by-version specification this course is built around
- [Laravel Release Notes](https://laravel.com/docs/releases) — support windows, versioning policy, and what each major line changed
- [Rector](https://getrector.com/documentation) — automated refactoring, rule sets, and custom rule authoring
- [Larastan](https://github.com/larastan/larastan) — PHPStan extension for Laravel, with the level and baseline behavior used in Module 3
- [PHP: Migrating from PHP 7.4 to 8.x](https://www.php.net/manual/en/appendices.php) — the runtime breaking-change appendices
- [Pest Documentation](https://pestphp.com/docs) — the testing API used for characterization suites
- [Symfony Upgrading Guide](https://symfony.com/doc/current/contributing/code/bc.html) — the BC policy behind Laravel's own major bumps
- [Martin Fowler: StranglerFigApplication](https://martinfowler.com/bliki/StranglerFigApplication.html) — the progressive replacement pattern used in Module 7
- [Expand/Contract pattern](https://martinfowler.com/bliki/ParallelChange.html) — the schema migration discipline in Module 6
- [MySQL 8.0 Online DDL Operations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html) — which alterations lock and which do not
- [Renovate Documentation](https://docs.renovatebot.com/) — grouped dependency updates and the policy from Module 8
- [Google SRE Workbook: Canarying Releases](https://sre.google/workbook/canarying-releases/) — the deployment strategy foundation for Module 9

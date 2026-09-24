---
title: "Building a Monorepo CI/CD Pipeline with GitHub Actions"
description: "Learn how to design a fast, correct CI/CD pipeline for a monorepo with GitHub Actions — path filtering, change detection, matrix builds, caching, and automated releases."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Monorepo CI/CD Pipeline with GitHub Actions

## Summary

A monorepo centralizes many packages and applications in a single repository, but it also breaks naive CI setups: every push rebuilds everything, unrelated changes block releases, and cache misses slow the whole pipeline down. This tutorial teaches you how to design a fast and correct CI/CD pipeline for a monorepo using GitHub Actions. You will learn path-based triggers, change detection with `dorny/paths-filter`, matrix builds for workspace packages, dependency-aware build ordering, caching strategies that survive a workspace layout, and automated release workflows for changed packages.

## Target Audience

- DevOps engineers and platform engineers who maintain CI/CD pipelines.
- Fullstack developers working in npm, pnpm, or Yarn workspaces monorepos.
- Expected developer level: Advanced — comfortable with GitHub Actions basics and YAML, and familiar with monorepo concepts.

## Prerequisites

- Working knowledge of GitHub Actions: workflows, jobs, steps, triggers, and secrets (see the "Getting Started with GitHub Actions" tutorial if needed).
- A monorepo using package workspaces (npm, pnpm, or Yarn) — or a willingness to apply the patterns to Bazel/Nx/Turborepo projects.
- Basic YAML skills and a GitHub repository where you can test workflows.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain why monorepos break naive CI and which GitHub Actions features solve each problem.
- Write path-filtered workflow triggers that skip builds for unrelated changes.
- Detect changed packages with `dorny/paths-filter` and turn them into a dynamic build matrix.
- Order builds so dependent packages build before the applications that consume them.
- Design cache keys that stay effective across a changing monorepo layout.
- Set up branch protection with required checks and a merge queue.
- Automate versioning and publishing of only the packages that changed.

## Context and Motivation

Monorepos are attractive because they give you atomic commits, shared tooling, and easy cross-package refactoring. The cost is CI complexity. The naive pipeline — check out the repo, install everything, test everything, build everything, deploy everything — does not scale. With ten packages, a change to one file inside `packages/utils/README.md` can trigger a 30-minute full pipeline that mostly redoes work nobody needs. Worse, a broken build in an unrelated package blocks the release of a healthy one.

GitHub Actions has a set of native features that, used together, turn a monorepo pipeline from a liability into an advantage:

- **Path filters** on triggers decide *whether* a workflow runs at all.
- **Change detection** decides *what* to build inside the workflow.
- **Matrix strategies** run the same job shape across all selected packages in parallel.
- **Caching** keeps installs and build artifacts fast without hard-coding your repository layout.
- **Required checks with a merge queue** protect the main branch without forcing every repo-wide run to finish before any merge.

The key mental shift: a monorepo CI pipeline is not one pipeline with many steps — it is a *decision layer* on top of many small, package-scoped pipelines. This tutorial builds that decision layer step by step.

## Core Content

### The Monorepo CI Challenge

Consider a typical workspace layout:

```text
apps/
  web/          # Next.js application
  api/          # Express API
packages/
  ui/           # shared React component library
  utils/        # pure helper functions
  config/       # shared lint/TS configs
package.json
pnpm-lock.yaml
```

`apps/web` depends on `packages/ui` and `packages/utils`; `apps/api` depends on `packages/utils`; `packages/ui` depends on `packages/utils`. Three failure modes dominate:

1. **Wasted work** — a change to `apps/api` rebuilds `apps/web`.
2. **Flaky signal** — a broken `packages/ui` build fails the check on an unrelated `apps/api` PR.
3. **Cache churn** — a single cache key that hashes every source file invalidates everything on any edit.

Every technique in this tutorial attacks one of these three modes.

### Path Filtering with Workflow Triggers

The cheapest optimization happens *before* a job even starts. Workflow triggers accept `paths` and `paths-ignore` filters:

```yaml
on:
  push:
    branches: [main]
    paths:
      - "apps/web/**"
      - "packages/ui/**"
      - "packages/utils/**"
      - "pnpm-lock.yaml"
  pull_request:
    paths:
      - "apps/web/**"
      - "packages/ui/**"
      - "packages/utils/**"
      - "pnpm-lock.yaml"
```

Rules that matter in practice:

- `paths` and `paths-ignore` may not be combined in one trigger — use one or the other.
- Filters apply per file in the *event*: the workflow activates only if at least one changed file matches.
- A `paths-ignore` list never filters out a workflow when the PR changes the workflow file itself (`.github/workflows/**`); GitHub treats workflow-file changes as always eligible, so your pipeline changes are actually testable.
- Path filters do **not** prevent a workflow from running when a branch is created, and they compare against the full path, so `apps/web/**` matches `apps/web/package.json` but not `packages/web/package.json`.

Path filters are a blunt instrument: every push that touches `packages/ui` runs the web checks too, because `apps/web` depends on it. That is correct — dependencies need their consumers tested — but it is the job of *change detection* to route those checks precisely.

### Change Detection with dorny/paths-filter

Inside the workflow, you need a machine-readable answer to "which packages changed?". The standard tool is `dorny/paths-filter`, which compares the diff between the base SHA and the head SHA and outputs a JSON array of the filters that matched:

```yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - "apps/web/**"
            api:
              - "apps/api/**"
            ui:
              - "packages/ui/**"
            utils:
              - "packages/utils/**"
            config:
              - "packages/config/**"
            root:
              - "package.json"
              - "pnpm-lock.yaml"
              - ".github/workflows/**"
```

The `changes` output is a JSON array such as `["ui","utils"]`. A dedicated, tiny job computes it once; every downstream job consumes it via `needs`. This avoids each job re-computing the diff and gives you a single source of truth for the whole run.

A classic edge case: a lockfile change means dependencies may have changed everywhere. The `root` filter exists precisely for this — when it matches, you should fall back to building everything:

```yaml
  build:
    needs: changes
    if: ${{ needs.changes.outputs.packages != '[]' }}
    strategy:
      matrix:
        package: ${{ fromJson(needs.changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Building ${{ matrix.package }}"
```

With `fromJson`, the matrix is populated dynamically from the detection job. If nothing changed, `outputs.packages` is `[]` and the `if` condition skips the job entirely — zero wasted minutes.

For the lockfile-fall-back, a common pattern is to expand the matrix to the full package list when `root` matched:

```yaml
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            # ...package filters...
            root:
              - "pnpm-lock.yaml"
      - id: set-matrix
        run: |
          if [ "${{ steps.filter.outputs.root }}" == "true" ]; then
            echo "matrix=[\"web\",\"api\",\"ui\",\"utils\",\"config\"]" >> "$GITHUB_OUTPUT"
          else
            echo "matrix=${{ steps.filter.outputs.changes }}" >> "$GITHUB_OUTPUT"
          fi
```

### Matrix Builds for Workspace Packages

A dynamic matrix turns one job definition into N parallel runs, one per changed package. The canonical shape:

```yaml
  build:
    needs: [changes]
    if: ${{ needs.changes.outputs.packages != '[]' }}
    strategy:
      fail-fast: false
      matrix:
        package: ${{ fromJson(needs.changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Build package
        run: pnpm --filter "${{ matrix.package }}" build
```

Two tuning decisions matter:

- **`fail-fast: false`** keeps all matrix legs running when one fails. In a monorepo you want the *full* report of which packages broke, not an early abort that hides failures.
- **`pnpm --filter` scoping** keeps each leg honest about its package. With Turborepo or Nx, replace the last step with the tool's own task runner (`pnpm turbo run build --filter=...[origin/main]`), which handles both scoping and build ordering for you.

### Build Order and Dependent Package Handling

The matrix above is correct for *independent* packages, but `apps/web` depends on `packages/ui`. If a PR changes both, building web in parallel with ui may use a stale ui artifact. Three strategies exist:

1. **Reactive dependency builds** — a change to `packages/ui` also triggers a build of every package that depends on it. This is what Turborepo/Nx do natively via their dependency graphs.
2. **Topological ordering** — build leaves first, then dependents. GitHub Actions itself has no DAG engine, so without a task runner you encode the order manually: a single job that runs `pnpm --filter <deps> build` before `pnpm --filter <app> build`.
3. **Publish-and-consume** — UI packages publish internal versions (or use local tarballs), and apps build against the published artifact. Highest fidelity, highest complexity.

The pragmatic sweet spot for most teams is a task runner with a **remote cache**:

```yaml
  build:
    needs: [changes]
    if: ${{ needs.changes.outputs.packages != '[]' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Run builds in dependency order (remote-cached)
        run: pnpm turbo run build --filter=...[origin/main]
```

`--filter=...[origin/main]` tells Turborepo to build only the packages affected since the main branch, in dependency order, caching results remotely so unchanged packages are served from cache in seconds.

### Caching Strategies for a Changing Monorepo

Caching is where monorepo pipelines usually degrade. A single naive key like `cache: ${{ hashFiles('**') }}` invalidates on *any* file change. Correct monorepo caching follows a hierarchy:

- **Dependency cache** — keyed on the lockfile only, with a graceful restore fallback:

```yaml
      - uses: actions/cache@v4
        with:
          path: node_modules
          key: deps-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            deps-${{ runner.os }}-
```

- **Task-runner cache** — keyed on the dependency layer plus the source it caches, so unchanged packages never re-execute:

```yaml
      - uses: actions/cache@v4
        with:
          path: node_modules/.cache/turbo
          key: turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            turbo-${{ runner.os }}-
```

- **GitHub-hosted package-manager caches** — `actions/setup-node` with `cache: pnpm` (or npm/yarn) handles the dependency layer for you and is usually enough when combined with a task runner's remote cache.

The guiding principle: **stable but precise keys**. The lockfile hashes what changes, source hashes control what re-executes, and `restore-keys` makes a cache miss degrade to the most recent compatible cache instead of a cold start. Never put `hashFiles('**/*')` in a dependency key — a single comment edit nukes the cache for the whole repo.

### Required Checks, Concurrency, and Merge Queues

Precision in *which* checks run creates a branch-protection problem: if a PR touching only `apps/api` skips the web checks, a required "web" check would block it forever. Three mechanisms keep the main branch protected without stalling unrelated PRs:

1. **Required status checks** must reference checks that actually run. With change detection, make the required check a *gateway* job — e.g. a `checks` job that passes when the pipeline ran and failed nothing — or require the dynamic jobs' *names* are stable regardless of the matrix content.
2. **`concurrency`** cancels superseded runs so a quick typo fix does not wait behind the full build triggered by the previous push:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

1. **Merge queues** serialize merges and re-run checks on the *combined* result. Workflows must then react to the `merge_group` trigger too, or the queue waits forever:

```yaml
on:
  pull_request:
  merge_group:
```

With a merge queue, per-package checks stay precise and the queue re-validates the integration on top of main — the two mechanisms complement each other.

### Releasing Changed Packages

Releases follow the same philosophy: only the packages whose version files changed get published. The `changesets` tool is the standard workflow:

```yaml
name: release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Create version PR or publish
        uses: changesets/action@v1
        with:
          version: pnpm changeset version
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

The action opens a "Version Packages" PR that bumps only the packages listed in pending changesets; when that PR merges to main (or when `publish` is set and the push has a release), it runs `pnpm changeset publish` — which publishes only the packages with changed versions. Unrelated packages are never version-bumped and never republished.

The same pattern generalizes beyond npm: Docker images can be built and pushed only for changed applications, tagged with the Git SHA, using the very same `paths-filter` output.

## Code Examples

### Reference monorepo structure

```text
monorepo/
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── ui/
│   ├── utils/
│   └── config/
├── package.json
├── pnpm-lock.yaml
└── turbo.json
```

### Complete CI workflow with change detection and matrix

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - "apps/web/**"
            api:
              - "apps/api/**"
            ui:
              - "packages/ui/**"
            utils:
              - "packages/utils/**"
            config:
              - "packages/config/**"
            root:
              - "pnpm-lock.yaml"
              - ".github/workflows/**"

  lint:
    needs: changes
    if: ${{ needs.changes.outputs.packages != '[]' }}
    strategy:
      fail-fast: false
      matrix:
        package: ${{ fromJson(needs.changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter "${{ matrix.package }}" lint

  build:
    needs: changes
    if: ${{ needs.changes.outputs.packages != '[]' }}
    strategy:
      fail-fast: false
      matrix:
        package: ${{ fromJson(needs.changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build --filter=...[origin/main]

  test:
    needs: changes
    if: ${{ needs.changes.outputs.packages != '[]' }}
    strategy:
      fail-fast: false
      matrix:
        package: ${{ fromJson(needs.changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter "${{ matrix.package }}" test
```

### Lockfile fallback with a computed matrix

```yaml
  build:
    needs: changes
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - id: set-matrix
        run: |
          if [ "${{ needs.changes.outputs.root }}" == "true" ]; then
            echo "matrix=[\"web\",\"api\",\"ui\",\"utils\",\"config\"]" >> "$GITHUB_OUTPUT"
          else
            echo "matrix=${{ needs.changes.outputs.packages }}" >> "$GITHUB_OUTPUT"
          fi
```

### Toolchain cache with restore fallback

```yaml
      - uses: actions/cache@v4
        with:
          path: node_modules/.cache/turbo
          key: turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            turbo-${{ runner.os }}-
```

### Changesets release workflow

```yaml
name: release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: changesets/action@v1
        with:
          version: pnpm changeset version
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Key Insights

- **Gates have two layers with different jobs**: path filters on the trigger decide whether a workflow runs; change detection inside the workflow decides what runs. Do not blur them — a `paths` filter is a blunt repo-wide switch, `dorny/paths-filter` is the precise per-package router.
- **Keep the diff computation in one job**: every job that needs the change set should read `needs.changes.outputs` rather than re-computing the diff. One source of truth prevents matrix inconsistencies across jobs.
- **Never put source hashes in dependency cache keys**: key the dependency cache on the lockfile only, and let `restore-keys` degrade gracefully. A `hashFiles('**')` dependency key makes every edit a cold install.
- **`fail-fast: false` is the monorepo default**: an early abort hides the list of broken packages. You want the full failure report on the merge queue, not the first casualty.
- **Merge queues demand a `merge_group` trigger**: a queue that runs workflows which never listen for `merge_group` stalls forever. Add the trigger the day you enable the queue.
- **Publish only what changed**: changesets keeps version bumps and publishes scoped to actual changes; the same paths-filter output can drive conditional Docker image builds for changed apps only.

## Next Steps

- Deepen your workflow authoring with the GitHub Actions Workflow Testing & Debugging guide.
- Move critical jobs to your own infrastructure with the Self-Hosted Runners guide.
- Study the GitHub Actions DevOps Syllabus for a structured path from foundations to production CI/CD.
- Explore the Advanced GitHub Actions Syllabus for matrix strategies, caching, and security hardening at scale.

## Conclusion

A monorepo pipeline is a decision layer, not a script. Path filters decide *if* a workflow runs, change detection decides *what* it builds, dynamic matrices parallelize the work, and stable cache keys keep it fast. Add a merge queue to re-validate integrations on top of main, and changesets to publish only what actually changed. Applied together, these patterns turn a monorepo from a CI liability into one of the fastest developer experiences GitHub Actions can offer.

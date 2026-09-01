---
title: "GitHub Actions Performance Optimization and Caching Cheat Sheet"
description: "A quick reference guide for GitHub Actions performance — dependency caching with actions/cache, build cache isolation, job parallelism and matrix strategies, concurrency control, artifact pruning, Docker layer caching, and workflow cost optimization."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# GitHub Actions Performance Optimization and Caching Cheat Sheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Cache dependencies | `actions/cache@v4` with `key` + `restore-keys` | Persist dependencies between runs |
| Cache package manager | `actions/setup-node@v4` with `cache: 'npm'` | Built-in caching for npm/yarn/pnpm |
| Run jobs in parallel | Top-level `jobs:` keys without `needs` | Independent jobs run concurrently |
| Fan out / fan in | `needs: [lint, test, build]` | Wait for multiple parallel jobs |
| Matrix builds | `strategy.matrix` with `include`/`exclude` | Run a job across OS/version combinations |
| Cancel superseded runs | `concurrency.group` + `cancel-in-progress: true` | Stop redundant runs on new pushes |
| Skip unchanged code | Path/`paths-ignore` filters on triggers | Avoid running CI for irrelevant changes |
| Merge post-processing jobs | One deploy job with `needs` instead of N jobs | Reduce runner spin-up overhead |
| Cache Docker layers | `docker/build-push-action@v6` with `cache-from`/`cache-to` | Reuse BuildKit layers across runs |
| Prune old artifacts | `actions/delete-artifact@v5` / retention days | Keep artifact storage small |
| Dispatch reusable flows | `workflow_call` with `secrets: inherit` | Reuse logic without duplicating YAML |

## Common Commands

### Dependency Caching with actions/cache

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

### Setup Toolchain Caching (Built-in)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'          # also: 'yarn', 'pnpm', 'deno'
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
    cache: 'pip'          # also: 'pipenv', 'poetry'
```

### Job Parallelism and Fan-Out

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
  test:
    runs-on: ubuntu-latest
  build:
    runs-on: ubuntu-latest
    needs: [lint, test]   # waits for both, then runs
```

### Matrix Strategy

```yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: [18, 20]
    include:
      - os: ubuntu-latest
        node: 22
        experimental: true
```

### Concurrency — Cancel Stale Runs

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

### Path Filtering (Skip Irrelevant Jobs)

```yaml
on:
  push:
    paths:
      - 'src/**'
      - '*.json'
    paths-ignore:
      - 'docs/**'
      - 'README.md'
```

### Docker Layer Cache with BuildKit

```yaml
- uses: docker/build-push-action@v6
  with:
    push: true
    tags: ghcr.io/${{ github.repository }}:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Composite Action with Cached Toolchain

```yaml
- uses: actions/setup-go@v5
  with:
    go-version: '1.22'
    cache: true
    cache-dependency-path: |
      **/go.sum
      **/go.mod
```

### Scheduled Cleanup Workflow

```yaml
on:
  schedule:
    - cron: '0 3 * * 0'   # weekly
  workflow_dispatch:

jobs:
  delete-old-artifacts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/delete-artifact@v5
        with:
          artifact: 'test-results'
          failOnError: true
```

## Code Snippets

### Full Cached Node CI Snippet

```yaml
name: CI
on:
  pull_request:
    paths-ignore: ['docs/**']

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/
          retention-days: 7
```

### Cache-Efficient Multi-Module Build (Go)

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.cache/go-build
      ~/go/pkg/mod
    key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
    restore-keys: |
      ${{ runner.os }}-go-
```

### Conditional Expensive Steps

```yaml
- name: Run end-to-end tests
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  run: npm run test:e2e
```

### Reusable Workflow with Caching

```yaml
# .github/workflows/build.yml — reusable entry point
on:
  workflow_call:
    secrets:
      REGISTRY_TOKEN:
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v6
        with:
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Build Matrix with Failure Tolerance

```yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, macos-latest]
    include:
      - os: macos-latest
        arch: arm64

steps:
  - run: make build-arch-${{ matrix.arch }}
    continue-on-error: ${{ matrix.experimental }}
```

### Artifact Download After Parallel Jobs

```yaml
- uses: actions/download-artifact@v4
  with:
    name: build-output
    path: dist/
    merge-multiple: true
```

---
title: "GitHub Actions Cost and Performance Guide"
description: "A practical guide to cutting GitHub Actions spend and wall-clock time using concurrency control, cache strategy, matrix pruning, timeouts, and runner economics."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# GitHub Actions Cost and Performance Guide

## Introduction

GitHub Actions bills in **runner minutes**, and every minute is priced by the runner label that executed it. A workflow that feels "free" during a prototype becomes a line item once the repository has twenty contributors, a nightly matrix, and a test suite that takes eleven minutes. Cost and latency usually move together: the slow pipeline is almost always the expensive one, because it holds runners open while doing work that could have been cached, skipped, or parallelized differently.

The billing model has three multipliers worth memorizing: Linux runners bill at the base rate, Windows at roughly double, and macOS at roughly ten times Linux, with larger runners multiplying again by vCPU count. Storage for artifacts and caches is billed separately, so a pipeline that uploads a 2 GB artifact on every push pays twice: once for the compute and once for keeping it for ninety days. This guide treats optimization as a loop — measure, change one lever, measure again — because every lever below is reversible and premature CI tuning only produces fragile YAML.

| Runner label | Relative minute cost | Typical use |
| --- | --- | --- |
| `ubuntu-latest` | 1x | Build, test, lint, containers |
| `windows-latest` | ~2x | Windows-only binaries, MSI packaging |
| `macos-latest` | ~10x | iOS/macOS signing and notarization |

## Best Practices

- **Cancel superseded runs first.** `concurrency` with `cancel-in-progress` removes the single largest source of waste on active branches: runs that were already obsolete before they started.
- **Always set `timeout-minutes`.** A hung integration test that waits for a dead service will happily burn the default six-hour limit. Per-job timeouts turn an outage into a five-minute failure.
- **Cache by lockfile hash, never by branch.** Cache keys built from `hashFiles('**/package-lock.json')` hit across branches; keys built from `github.ref` miss on every push.
- **Keep cache scope tight.** Caching `node_modules` directly is slower and less portable than caching the package manager's download cache. Cache what is expensive to fetch, not what is cheap to install.
- **Prune the matrix before optimizing inside it.** A 3 x 4 matrix is twelve runners. Deriving the matrix from changed paths, or splitting "fast" and "slow" suites, usually saves more than shaving seconds off a job.
- **Prefer Linux for everything that does not require another OS.** Cross-compilation and containers cover most cases that teams assume need Windows or macOS.
- **Upload artifacts deliberately.** Set `retention-days` per artifact and avoid uploading logs that the job already prints to the console.
- **Fail fast, then go wide.** Run lint and unit tests in one short job; fan out to slow integration and e2e jobs only after it passes.
- **Only then consider self-hosted.** Self-hosted runners pay off at sustained volume, not at bursty volume, and they carry patching and security obligations that rarely appear in the cost comparison.

## Implementation Steps

### Step 1: Measure current spend

Start from real numbers instead of intuition. The billing API returns minutes per repository and per OS, which is enough to rank the offenders.

```bash
# Billable minutes per repository, last month - rank the offenders first
gh api "/orgs/acme/settings/billing/actions" \
    --jq '.repositories[] | [.name, .total_minutes_used] | @tsv' \
    | sort -k2 -nr | head -10
```

If the organization has no billing scope, read `.minutes_used_breakdown` from the same endpoint, or use `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs` for per-job timing. Either way, write the baseline down before changing YAML.

### Step 2: Add concurrency and timeouts

These two settings cost nothing and are the highest-yield change in most repositories.

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

concurrency:
    group: ci-${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint && npm test
```

Keeping `cancel-in-progress` false on `main` preserves deploy ordering while still collapsing noisy pull request pushes.

### Step 3: Build a cache that actually hits

A cache is only useful if the key survives a branch switch. Hash the lockfile and add a restore prefix so partial hits still help.

```yaml
      - name: Restore dependency cache
        id: deps
        uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            ~/.cache/playwright
          key: deps-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            deps-${{ runner.os }}-

      - name: Install only on cache miss
        if: steps.deps.outputs.cache-hit != 'true'
        run: npm ci --prefer-offline --no-audit
```

Verify hit rate in the job log (`Cache restored from key: ...`) rather than assuming it works. A cache that misses on every run is worse than no cache, because it adds upload time on top of the cost you were trying to remove.

### Step 4: Prune the matrix

Replace unconditional matrices with explicit, meaningful coverage. Keep the full matrix on `main` and a reduced one on pull requests.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        node: ${{ fromJSON(github.event_name == 'pull_request' && '[20]' || '[18, 20, 22]') }}
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npx jest --shard=${{ matrix.shard }}/4
```

Sharding cuts wall-clock time without increasing total minutes; pruning cuts both. Use sharding when developers are waiting, and pruning when the bill is the problem.

### Step 5: Do the self-hosted arithmetic honestly

Self-hosted runners trade per-minute billing for fixed cost plus labor. Below the break-even point they are a hobby; above it they are only cheaper if someone actually patches them.

```bash
#!/usr/bin/env bash
set -euo pipefail

monthly_minutes=${1:?usage: breakeven.sh MINUTES}
hosted_rate=0.008          # USD per Linux minute, adjust to your plan
server_monthly=120         # amortized instance + storage + egress
ops_hours=6                # patching, upgrades, incident time per month
ops_rate=45

hosted_cost=$(awk -v m="$monthly_minutes" -v r="$hosted_rate" 'BEGIN { printf "%.2f", m * r }')
self_cost=$(awk -v s="$server_monthly" -v h="$ops_hours" -v r="$ops_rate" 'BEGIN { printf "%.2f", s + h * r }')

echo "hosted: \$$hosted_cost   self-hosted: \$$self_cost"
awk -v a="$hosted_cost" -v b="$self_cost" 'BEGIN { exit (a > b) ? 0 : 1 }' \
    && echo "self-hosted wins at this volume" \
    || echo "stay on GitHub-hosted runners"
```

### Step 6: Lock the gains in with guardrails

Optimizations decay when the next feature adds a job. Make the defaults structural: org-level spending limits, a shared reusable workflow that already sets timeouts and concurrency, and a required check that rejects workflows without either.

```yaml
# .github/workflows/ci.yml - call the governed template, not a copy of it
jobs:
  ci:
    uses: acme/ci-templates/.github/workflows/node-ci.yml@v3
    with:
      node-version: "20"
      timeout-minutes: 15
    secrets: inherit
```

Re-measure monthly against the Step 1 baseline. The number that matters is minutes per merged pull request, not minutes per month, because the second one grows with headcount while the first one reflects actual engineering efficiency.

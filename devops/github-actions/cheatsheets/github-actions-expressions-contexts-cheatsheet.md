---
title: "GitHub Actions Expressions and Contexts Cheat Sheet"
description: "A quick reference for GitHub Actions expression syntax, operators, status check functions, and every runtime context."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# GitHub Actions Expressions and Contexts Cheat Sheet

## Quick Reference Table

| Context | Access | Description |
|---------|--------|-------------|
| `github` | `github.event_name`, `github.ref` | Metadata about the workflow run: triggering event, ref, repository, actor, SHA |
| `env` | `env.VAR_NAME` | Environment variables set at workflow, job, or step level |
| `vars` | `vars.VAR_NAME` | Repository, organization, or environment configuration variables |
| `secrets` | `secrets.SECRET_NAME` | Encrypted secrets; masked in logs; cannot be read directly in `if:` conditions |
| `inputs` | `inputs.NAME` | Inputs passed to a reusable workflow (`workflow_call`) or a `workflow_dispatch` run |
| `needs` | `needs.JOB_ID.result` | Results and outputs of jobs this job depends on |
| `strategy` | `strategy.job-index`, `strategy.job-total` | Index and total count of the current job within a matrix |
| `matrix` | `matrix.AXIS_NAME` | Axis values of the current matrix combination |
| `steps` | `steps.STEP_ID.outputs.NAME` | Outputs and outcomes of steps in the current job |
| `runner` | `runner.os`, `runner.arch` | The runner executing the job: OS, architecture, temp directories |
| `job` | `job.status`, `job.container` | The current job's status, container, and services |
| `jobs` | `jobs.JOB_ID.result` | Results and outputs of all jobs; only usable in a `jobs.<id>.if` condition |

## Common Commands

### Expression Syntax

Every expression is wrapped in `${{ }}` and evaluated at run time, after the workflow's `on:` keys are resolved.

```yaml
# Literals
${{ true }}                  # boolean
${{ 42 }}                    # number
${{ 'quoted string' }}       # single-quoted string; double a quote to escape it: 'it''s'
${{ null }}                  # null — prints as an empty string

# Property access — dot or bracket notation are equivalent
${{ github.ref }}
${{ github['ref'] }}

# `if:` conditions evaluate expressions implicitly — the wrapper is optional
if: github.ref == 'refs/heads/main'
if: ${{ github.ref == 'refs/heads/main' }}   # explicit form, recommended

# Everything is a string at run time
# Expressions inside `run:` are expanded by the shell, so quote them:
run: echo "Deploying ${{ github.ref_name }}"
```

Operator precedence, highest to lowest: `( )` grouping, `[ ]` index, `.` property access, `!`, `<` `<=` `>` `>=`, `==` `!=`, `&&`, `||`.

```yaml
# FAILS: precedence makes this evaluate as `(A) && (B || C)`
# if: ${{ A || B && C }}
# Always group mixed operators explicitly:
if: ${{ (A || B) && C }}
```

### Operator Reference

```text
| Operator | Description         | Example                               |
|----------|---------------------|---------------------------------------|
| `( )`    | Grouping            | `${{ (a == 1) && (b == 2) }}`         |
| `[ ]`    | Index / key         | `${{ matrix.os[0] }}`                 |
| `.`      | Property access     | `${{ github.ref }}`                   |
| `!`      | Logical NOT         | `${{ !cancelled() }}`                 |
| `<`      | Less than           | `${{ steps.load.outputs.n < 10 }}`    |
| `<=`     | Less or equal       | `${{ github.run_attempt <= 2 }}`      |
| `>`      | Greater than        | `${{ needs.build.outputs.size > 1 }}` |
| `>=`     | Greater or equal    | `${{ runner.arch >= 'X64' }}`         |
| `==`     | Equality            | `${{ github.ref_name == 'main' }}`    |
| `!=`     | Inequality          | `${{ inputs.env != 'prod' }}`         |
| `&&`     | Logical AND         | `${{ success() && env.RUN_E2E }}`     |
| `||`     | Logical OR          | `${{ failure() || cancelled() }}`     |
```

Loose comparison: GitHub coerces types before comparing. `${{ 1 == '1' }}` is `true` (string coerces to a number), and booleans coerce to `1`/`0` when compared with numbers. Use `fromJSON()` when you need types to match exactly.

### Status Check Functions

Without an explicit status function, the default implicit check is `success()` for both steps and jobs.

```yaml
# success()   — true when all prior steps/jobs succeeded (the default)
# always()    — true regardless of outcome, including cancellation; use it to
#               run cleanup work even after failures
# cancelled() — true only when the run was cancelled (never with success())
# failure()   — true when any prior step/job failed (false on cancellation)

# Status functions have special precedence: they are evaluated before || and &&
if: ${{ !cancelled() }}                                   # run unless the run was cancelled
if: ${{ failure() }}                                      # run only after a prior failure
if: ${{ always() }}                                       # unconditional, even on cancel
if: ${{ success() && github.ref == 'refs/heads/main' }}   # combined with other checks
```

### String and Collection Functions

```yaml
# contains(search, item) — substring check on strings, or membership on arrays
if: ${{ contains(github.ref_name, 'release') }}
if: ${{ contains(needs.*.result, 'failure') }}     # any dependency job failed?

# startsWith(search, prefix) / endsWith(search, suffix)
if: ${{ startsWith(github.ref, 'refs/tags/') }}
if: ${{ endsWith(github.repository, '-api') }}

# format(string, value0, value1, ...) — replaces {0}, {1}, ... placeholders
run: echo "${{ format('Deploying {0} to {1}', github.ref_name, inputs.env) }}"

# join(array, separator?) — joins values; the separator defaults to a comma
run: echo "Axes: ${{ join(matrix.*, ' | ') }}"
```

### Data Conversion Functions

```yaml
# toJSON(value) — pretty-printed JSON of any value (useful for debugging)
run: echo "${{ toJSON(github.event) }}" > event.json

# fromJSON(value) — parses a JSON string back into an object/array
# The bread-and-butter of dynamic matrices and job outputs:
matrix: ${{ fromJSON(needs.load.outputs.matrix) }}

# hashFiles(path1, path2, ...) — stable hash of matching files
# Glob patterns use ** for deep matching; ideal for cache keys
key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
```

### Object Filters

Filter syntax lets you reach into nested objects and arrays without a loop.

```text
| Filter    | Description                     | Example                                  |
|-----------|---------------------------------|------------------------------------------|
| `*`       | All properties / all elements   | `${{ needs.*.result }}`                  |
| `[n]`     | Element at index `n`            | `${{ matrix.os[0] }}`                    |
| `[key]`   | Property by key                 | `${{ github.event['pull_request'] }}`    |
| `*.prop`  | Nested access across an object  | `${{ steps.*.outputs.version }}`         |
```

### Context Reference — github

The `github` context is the richest one. These are the fields you will reach for most often:

| Property | Description |
|----------|-------------|
| `github.event_name` | Name of the event that triggered the run (`push`, `pull_request`, ...) |
| `github.event` | Full webhook payload of the triggering event |
| `github.ref` | Full ref that triggered the run (`refs/heads/main`, `refs/tags/v1.0.0`) |
| `github.ref_name` | Short branch or tag name (`main`, `v1.0.0`) |
| `github.ref_type` | `branch` or `tag` |
| `github.sha` | Commit SHA that triggered the run |
| `github.repository` | Repository in `owner/name` form |
| `github.repository_owner` | Owner login |
| `github.actor` | Login of the user that initiated the run |
| `github.triggering_actor` | Login of the user that initiated the run (differs from `actor` for reusable workflows) |
| `github.run_id`, `github.run_number` | Unique run ID; incrementing run number |
| `github.run_attempt` | Attempt number (1 for the first try, 2+ for re-runs) |
| `github.workflow` | Workflow file name |
| `github.job` | ID of the current job |
| `github.workspace` | Default working directory for the runner (~/work/.../repo) |
| `github.token` | `GITHUB_TOKEN` for the run (automatically masked) |
| `github.server_url` | Server root URL, e.g. `https://github.com` |
| `github.event_path` | Path to the webhook payload file on the runner |

```yaml
# Accessing nested event payload fields — the field must exist for that event
# (${{ github.event.pull_request.number }} is only valid on pull_request runs)
run: echo "PR #${{ github.event.pull_request.number }}"
```

### Environment, Variables, and Secrets

```yaml
# env — layered precedence when the same name is set at multiple levels:
#       step > job > workflow > runner (each level overrides the one below)
env:
  NODE_ENV: production
jobs:
  build:
    env:
      NODE_ENV: test          # overrides the workflow-level value in this job
    steps:
      - run: echo "$NODE_ENV" # prints test; a step-level env would win over this

# vars — non-secret configuration; least-specific scope loses:
#       environment vars > repository vars > organization vars
run: echo "Region: ${{ vars.AWS_REGION }}"

# secrets — values are masked in logs; reject them at the workflow level to
# keep them out of every job:
if: ${{ inputs.canary == 'true' }}

# Secrets CANNOT be read in an `if:` condition directly:
#   if: ${{ secrets.ENABLED == 'true' }}   # INVALID
# Pass them through env instead:
env:
  ENABLED: ${{ secrets.ENABLED }}
if: ${{ env.ENABLED == 'true' }}           # VALID
```

### Type Casting and Coercion

```yaml
# Every expression result is a string when it reaches the shell
# null renders as an empty string — guard against it explicitly
run: echo "Actor: ${{ github.actor || 'unknown' }}"

# workflow_dispatch / workflow_call boolean and number inputs arrive as strings
#   inputs.production == true            # FALSE — 'true' vs true
#   inputs.production == 'true'          # correct
#   fromJSON(inputs.retries) > 3         # convert to a number first

# toJSON preserves types when piping data between jobs and matrices
outputs:
  matrix: ${{ toJSON(matrix) }}

# Array context — matrix.* exposes every axis of the current combination
run: echo "Axis values: ${{ join(matrix.*, ', ') }}"
```

## Code Snippets

### Conditional Job Execution

```yaml
name: conditional-deploy
on:
  push:
    tags:
      - "v*"

jobs:
  deploy:
    runs-on: ubuntu-latest
    # Run only for human-tagged releases, never for dependency bots
    if: ${{ startsWith(github.ref, 'refs/tags/') && github.actor != 'dependabot[bot]' }}
    steps:
      - run: echo "Deploying tag ${{ github.ref_name }}"
      - run: echo "Release run #${{ github.run_number }} attempt ${{ github.run_attempt }}"
```

### Dynamic Matrix from a JSON File

```yaml
name: dynamic-matrix

jobs:
  load:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.gen.outputs.matrix }}
    steps:
      - id: gen
        run: |
          echo "matrix=$(cat .github/matrix.json | jq -c .)" >> "$GITHUB_OUTPUT"

  build:
    needs: load
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix: ${{ fromJSON(needs.load.outputs.matrix) }}
    steps:
      - run: echo "Building on ${{ matrix.os }} with Node ${{ matrix.node }}"
```

### Sharing Data Between Jobs

```yaml
name: pass-outputs

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.tag.outputs.image }}
    steps:
      - id: tag
        run: |
          echo "image=registry.example/app:${GITHUB_SHA::8}" >> "$GITHUB_OUTPUT"

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying ${{ needs.build.outputs.image }}"
      - run: echo "Build status: ${{ needs.build.result }}"
```

### Cache Keys with hashFiles

```yaml
name: cached-build

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            npm-${{ runner.os }}-
      - run: npm ci
```

### Reusable Workflow Inputs and Secrets

```yaml
# .github/workflows/reusable-deploy.yml
name: reusable-deploy
on:
  workflow_call:
    inputs:
      environment:
        type: string
        required: true
      debug:
        type: boolean
        default: false
    secrets:
      CLOUD_TOKEN:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - run: |
          echo "Environment: ${{ inputs.environment }}"
          echo "Debug: ${{ inputs.debug }}"
      - name: Authenticate
        run: echo "Using cloud token (masked)"
        env:
          TOKEN: ${{ secrets.CLOUD_TOKEN }}
```

### Step Outputs and Failure Handling

```yaml
name: resilient-e2e

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - id: flaky
        continue-on-error: true        # keep the run alive after this step fails
        run: ./run-e2e.sh
      - name: Collect artifacts
        if: ${{ always() }}
        run: ./collect-logs.sh
      - name: Alert on unrecovered failure
        if: ${{ failure() && steps.flaky.outcome == 'failure' }}
        run: ./notify-slack.sh
      - name: Gate the pipeline
        if: ${{ steps.flaky.outcome != 'failure' }}
        run: echo "E2E passed"
```

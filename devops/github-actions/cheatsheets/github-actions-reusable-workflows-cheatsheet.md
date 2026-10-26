---
title: "GitHub Actions Reusable Workflows Cheatsheet"
description: "Quick reference for reusable GitHub Actions workflows — workflow_call inputs, secrets and outputs, calling syntax, matrix fan-out, version pinning, composite actions, and permissions."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# GitHub Actions Reusable Workflows Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Declare a callable workflow | `on: workflow_call:` | Makes the whole workflow invokable elsewhere |
| Add a typed input | `inputs.<name>.type: string` | Types: `string`, `number`, `boolean`; `required` defaults to `false` |
| Add a secret | `secrets.<name>.required: true` | Secrets are never inherited unless declared |
| Forward every secret | `secrets: inherit` at the call site | Passes caller and org-level secrets |
| Expose a workflow output | `outputs.<name>.value` | Must map from a job output, not a step |
| Set a job output | `jobs.<id>.outputs.<name>` | Written in a step via `$GITHUB_OUTPUT` |
| Call a remote workflow | `uses: org/repo/.github/workflows/f.yml@v1` | Path must start with `.github/workflows/` |
| Call a local workflow | `uses: ./.github/workflows/f.yml` | No `@ref` allowed for same-repo calls |
| Reuse across jobs | `jobs.<id>.uses` | A `uses` job cannot also have `steps` |
| Fan out over a matrix | `strategy.matrix` on the calling job | The callee cannot define a top-level matrix |
| Nest calls | callee calls another `workflow_call` workflow | Maximum depth is four workflows |
| Pin the version | `@v1`, `@sha`, or `@main` | Tags are mutable; SHAs are immutable |
| Reuse inside one job | composite action `runs.using: composite` | Step-level reuse with inputs and outputs |
| Limit the token | `permissions:` on caller and call site | A callee can never exceed the caller |

## Common Commands

### Declare the Reusable Workflow

```yaml
# .github/workflows/build.yml
on:
  workflow_call:
    inputs:
      node-version:
        type: string
        required: false
        default: '20'
      publish:
        type: boolean
        default: false
    secrets:
      NPM_TOKEN:
        required: true
    outputs:
      artifact-name:
        description: "Name of the uploaded build artifact"
        value: ${{ jobs.build.outputs.artifact }}  # job must export it
```

### Call It From Another Workflow

```yaml
jobs:
  build:
    # Local calls omit @ref; third-party calls should pin a commit SHA
    uses: my-org/ci-workflows/.github/workflows/build.yml@v1
    with:
      node-version: '22'
      publish: true
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying ${{ needs.build.outputs.artifact-name }}"
```

### Matrix Fan-Out in the Caller

```yaml
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        node: [18, 20, 22]
    uses: ./.github/workflows/test.yml
    with:
      node-version: ${{ matrix.node }}
```

### Permissions at the Call Site

```yaml
permissions:
  contents: read

jobs:
  publish:
    uses: ./.github/workflows/publish.yml
    permissions:
      contents: read
      packages: write
      id-token: write
```

## Code Snippets

### Composite Action (Step-Level Reuse)

```yaml
# .github/actions/setup/action.yml
name: Setup project
description: Install Node and dependencies with caching
inputs:
  node-version:
    default: '20'
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: npm
    - shell: bash
      run: npm ci
```

Every `run` step in a composite action must set `shell`; omitting it fails validation.

### Caller: Release Pipeline

```yaml
name: Release
on:
  push:
    tags: ['v*']

permissions:
  contents: read

jobs:
  build:
    uses: ./.github/workflows/build.yml
    with:
      node-version: '22'
      publish: true
    secrets: inherit

  announce:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - env:
          ARTIFACT: ${{ needs.build.outputs.artifact-name }}
        run: |
          if [ -z "$ARTIFACT" ]; then
            echo "::error::build returned no artifact name"
            exit 1
          fi
          echo "Published $ARTIFACT"
```

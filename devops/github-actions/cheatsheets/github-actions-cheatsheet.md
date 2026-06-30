---
title: "GitHub Actions Cheat Sheet"
description: "A quick reference guide for GitHub Actions — workflow syntax, event triggers, job configuration, marketplace actions, caching, artifacts, deployment patterns, and common troubleshooting commands."
category: "devops"
technology: "github-actions"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# GitHub Actions Cheat Sheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Workflow file location | `.github/workflows/*.yml` | YAML files defining automated workflows |
| Manual trigger | `workflow_dispatch` | Trigger workflow manually via GitHub UI or API |
| Scheduled run | `schedule: - cron: '0 0 * * *'` | Trigger on a cron schedule |
| Skip workflow | `[skip ci]` or `[ci skip]` in commit message | Prevent workflow from running |
| Cancel workflow | GitHub UI or `gh run cancel <id>` | Stop a running workflow |
| Re-run jobs | GitHub UI or `gh run rerun <id>` | Re-run failed or all jobs |
| View logs | `gh run view <id> --log` | Stream workflow logs in terminal |
| List workflows | `gh workflow list` | Show all workflows in the repo |
| Enable/disable | `gh workflow enable/disable <id>` | Toggle workflow status |

## Common Commands

### Workflow YAML Structure

```yaml
name: CI Pipeline
run-name: "CI ${{ github.sha }}" # optional display name
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        default: staging
        type: choice
        options: [staging, production]

env:
  NODE_VERSION: "20"
  REGISTRY: ghcr.io

defaults:
  run:
    shell: bash
    working-directory: ./app

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    outputs:
      version: ${{ steps.set-version.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - id: set-version
        run: echo "version=$(node -p "require('./package.json').version")" >> "$GITHUB_OUTPUT"
```

### Event Triggers

```yaml
on:
  push:                                # Trigger on push
    branches: [main, "feature/*"]      # Branch patterns (glob, not regex)
    tags: ["v*"]                       # Tag patterns
    paths: ["src/**", "!docs/**"]      # File change filters
    paths-ignore: ["*.md"]             # Ignore specific files
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
    branches: [main]
  schedule:
    - cron: "0 6 * * 1"               # Every Monday at 06:00 UTC
    - cron: "0 0 1 * *"               # First day of every month
  workflow_run:
    workflows: ["Lint Check"]
    types: [completed]
  repository_dispatch:
    types: [deploy-event]              # Custom webhook events
  issue_comment:
    types: [created, edited]
  release:
    types: [published, edited]
  page_build:                          # GitHub Pages build
  watch:
    types: [started]                   # Repository star
  fork:                                # Repository fork
```

### Job Configuration

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    continue-on-error: false
    if: github.event_name == 'pull_request'     # Conditional execution
    environment: testing                         # Environment with protection rules
    strategy:
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
      fail-fast: false
      max-parallel: 4
    needs: [lint, build]                         # Dependency ordering
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
    steps:
      - uses: actions/checkout@v4
      - run: npm test
```

### Matrix Builds

```yaml
strategy:
  matrix:
    node: [18, 20]
    os: [ubuntu-latest, macos-latest]
    include:                                    # Add extra combinations
      - node: 22
        os: ubuntu-latest
        experimental: true
    exclude:                                    # Remove combinations
      - node: 18
        os: macos-latest

steps:
  - run: echo "Node ${{ matrix.node }} on ${{ matrix.os }}"
  - if: matrix.experimental
    continue-on-error: true
    run: npm run experimental-tests
```

### Marketplace Actions Reference

```yaml
steps:
  # Source control
  - uses: actions/checkout@v4                    # Check out repository
    with:
      fetch-depth: 0                             # Full git history
      ref: ${{ github.event.pull_request.head.sha }}
      lfs: true                                  # Pull Git LFS files

  # Setup runtimes
  - uses: actions/setup-node@v4                  # Node.js setup
    with:
      node-version: "20"
      cache: "npm"
  - uses: actions/setup-python@v5                # Python setup
    with:
      python-version: "3.12"
      cache: "pip"
  - uses: actions/setup-java@v4                  # Java/JDK setup
    with:
      distribution: temurin
      java-version: "21"
      cache: "maven"
  - uses: actions/setup-go@v5                    # Go setup
    with:
      go-version: "1.22"
      cache: true

  # Docker and containers
  - uses: docker/login-action@v3                 # Docker registry login
    with:
      registry: ghcr.io
      username: ${{ github.actor }}
      password: ${{ secrets.GITHUB_TOKEN }}
  - uses: docker/build-push-action@v5            # Build and push images
    with:
      context: .
      push: true
      tags: ghcr.io/${{ github.repository }}:latest

  # Cloud providers
  - uses: aws-actions/configure-aws-credentials@v4  # AWS credentials
    with:
      role-to-assume: arn:aws:iam::123456789012:role/deploy-role
      aws-region: us-east-1
  - uses: google-github-actions/auth@v2          # GCP authentication
    with:
      workload_identity_provider: "projects/..."
      service_account: "deploy@project.iam.gserviceaccount.com"
  - uses: azure/login@v2                         # Azure login
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### Secrets and Environment Variables

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        type: environment

env:                          # Global env (available to all jobs)
  CI: true
  REGISTRY: ghcr.io

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment || 'production' }}
    env:                      # Job-level env
      NODE_ENV: production
    steps:
      - name: Use secret
        run: deploy.sh
        env:                  # Step-level env
          API_KEY: ${{ secrets.DEPLOY_KEY }}

      # GITHUB_TOKEN — auto-injected, scoped to current repo
      - run: |
          gh api repos/${{ github.repository }}/releases
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Repository secrets (configured in Settings > Secrets and variables)
      - run: echo "${{ secrets.MY_SECRET }}" | wc -c

      # Organization secrets (shared across org repos)
      - run: echo "${{ secrets.ORG_WIDE_SECRET }}"

      # Environment secrets (scoped to deployment environment)
      - run: echo "${{ secrets.ENV_SPECIFIC_SECRET }}"

      # Variables (not secrets, visible in plaintext)
      - run: echo "${{ vars.DEPLOY_REGION }}"
```

### Artifacts and Caching

```yaml
steps:
  # Upload build artifacts
  - uses: actions/upload-artifact@v4
    with:
      name: build-output-${{ github.sha }}
      path: dist/
      retention-days: 5
      if-no-files-found: error
      compression-level: 6

  # Download build artifacts (in a downstream job)
  - uses: actions/download-artifact@v4
    with:
      name: build-output-${{ github.sha }}
      path: dist/

  # Cache dependencies
  - uses: actions/cache@v4
    with:
      path: |
        ~/.npm
        node_modules
      key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      restore-keys: |
        npm-${{ runner.os }}-
        npm-

  # Cache build outputs
  - uses: actions/cache@v4
    with:
      path: |
        **/target
        ~/.m2/repository
      key: maven-${{ runner.os }}-${{ hashFiles('**/pom.xml') }}

  # Dependency caching shortcuts (built-in on setup-* actions)
  - uses: actions/setup-node@v4
    with:
      node-version: "20"
      cache: "npm"          # Auto-caches ~/.npm + node_modules
```

## Code Snippets

### CI Pipeline (Lint, Test, Build)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ${{ matrix.os }}
    needs: lint
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: "npm"
      - run: npm ci
      - run: npm test
      - run: npm run coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.os }}-${{ matrix.node }}
          path: coverage/

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
```

### Deployment Pipeline

```yaml
name: Deploy
on:
  push:
    tags: ["v*"]
  workflow_dispatch:
    inputs:
      environment:
        description: "Deployment target"
        required: true
        default: staging
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment || 'staging' }}
    concurrency: deploy-${{ inputs.environment || 'staging' }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Notify deployment
        run: |
          curl -X POST ${{ vars.SLACK_WEBHOOK }} \
            -H "Content-Type: application/json" \
            -d '{"text": "Deploy ${{ github.ref_name }} to ${{ inputs.environment }} complete"}'

  smoke-test:
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - name: Health check
        run: |
          curl --retry 5 --retry-delay 10 \
            https://app.example.com/api/health
```

### Docker Build and Publish

```yaml
name: Publish Docker Image
on:
  push:
    branches: [main]
    tags: ["v*"]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=ref,event=branch
            type=sha,prefix=

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Reusable Workflow (Caller)

```yaml
# .github/workflows/ci.yml — Caller workflow
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    uses: ./.github/workflows/reusable-quality.yml
    with:
      node-version: "20"
      os: ubuntu-latest
    secrets:
      CODE_COV_TOKEN: ${{ secrets.CODECOV_TOKEN }}

  deploy:
    needs: quality
    uses: my-org/shared-workflows/.github/workflows/deploy.yml@v1
    with:
      environment: staging
    secrets:
      DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

### Reusable Workflow (Definition)

```yaml
# .github/workflows/reusable-quality.yml — Reusable workflow
name: Reusable Quality Checks
on:
  workflow_call:
    inputs:
      node-version:
        description: "Node.js version"
        required: true
        type: string
      os:
        description: "Runner OS"
        required: false
        type: string
        default: ubuntu-latest
    secrets:
      CODE_COV_TOKEN:
        required: false

jobs:
  lint-and-test:
    runs-on: ${{ inputs.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - if: secrets.CODE_COV_TOKEN
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODE_COV_TOKEN }}
```

### Composite Action

```yaml
# .github/actions/setup-project/action.yml
name: "Setup Project"
description: "Check out code and install dependencies"
inputs:
  node-version:
    description: "Node.js version"
    required: false
    default: "20"
  working-directory:
    description: "Working directory"
    required: false
    default: "."

runs:
  using: "composite"
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: "npm"
    - run: npm ci
      shell: bash
      working-directory: ${{ inputs.working-directory }}

# Usage in workflow:
# - uses: ./.github/actions/setup-project
#   with:
#     node-version: "22"
#     working-directory: ./app
```

### Troubleshooting Commands

```bash
# Check workflow syntax locally
gh workflow view --ref main

# List recent workflow runs
gh run list --limit 10 --workflow ci.yml

# View logs for a specific run
gh run view 1234567890 --log

# Re-run failed jobs
gh run rerun 1234567890 --failed

# Cancel a stuck run
gh run cancel 1234567890

# Enable/disable a workflow
gh workflow enable ci.yml
gh workflow disable ci.yml

# Download artifacts from a run
gh run download 1234567890 --name build-output

# Debug logging: add secret ACTIONS_STEP_DEBUG=true
# Then set ACTIONS_RUNNER_DEBUG=true for runner-level debug

# Check GitHub API rate limits
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/rate_limit

# Test workflow_dispatch via API
curl -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/owner/repo/actions/workflows/ci.yml/dispatches \
  -d '{"ref":"main","inputs":{"environment":"staging"}}'
```

### Environment Protection Rules

```yaml
# Environment must be configured in GitHub Settings > Environments
# Features: required reviewers, wait timer, deployment branches

jobs:
  deploy-prod:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    steps:
      - run: deploy.sh

# Variables in environments:
# - ${{ vars.ENV_VAR }}           # Environment variable (visible)
# - ${{ secrets.ENV_SECRET }}     # Environment secret (masked)

# Required reviewers block deployment until approved
# Wait timer enforces a mandatory delay (e.g., 5 minutes)
# Deployment branches restricts which branches can deploy
```

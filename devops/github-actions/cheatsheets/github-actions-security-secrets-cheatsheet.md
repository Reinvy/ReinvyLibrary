---
title: "GitHub Actions Security and Secrets Management Cheat Sheet"
description: "A quick reference guide for GitHub Actions security — GITHUB_TOKEN permissions, OIDC authentication, environment protection rules, secrets management, self-hosted runner security, and workflow hardening patterns."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# GitHub Actions Security and Secrets Management Cheat Sheet

## Quick Reference Table

| Concept | Key Action | Description |
|---------|-----------|-------------|
| GITHUB_TOKEN | `permissions: {}` | Auto-injected token; scope it with least-privilege at the workflow or job level |
| OIDC | `permissions: id-token: write` | Exchange ephemeral tokens for cloud provider credentials (AWS, GCP, Azure) |
| Environment secrets | `environment: production` | Scoped secrets + protection rules (required reviewers, wait timer) |
| Repository secrets | `${{ secrets.MY_SECRET }}` | Encrypted at rest; available to all workflows in the repo |
| Organization secrets | `${{ secrets.ORG_SECRET }}` | Shared across selected repos in the organization |
| Variables | `${{ vars.MY_VAR }}` | Non-secret plaintext configuration (visible in logs) |
| Secret scanning | `github/codeql-action/upload-sarif@v3` | Detect leaked secrets in push events and PRs |
| Dependabot | `dependabot.yml` | Auto-update dependencies with security patches |
| OpenID Connect | `aws-actions/configure-aws-credentials@v4` | No long-lived cloud keys in GitHub secrets |
| Self-hosted runners | `runs-on: self-hosted` | More control but more responsibility — no isolation per-job |

## Common Commands

### GITHUB_TOKEN Permissions Model

```yaml
# Workflow-level — all jobs inherit these (most restrictive wins)
on: [push]

permissions:
  contents: read        # read-only repo contents
  issues: write         # create/comment on issues
  pull-requests: write  # create/comment on PRs
  actions: read         # read workflow artifacts
  checks: write         # create/update check runs
  statuses: write       # create/update commit statuses
  packages: write       # publish to GitHub Packages
  deployments: write    # create deployment events
  id-token: write       # needed for OIDC (never grant without reason)
```

```yaml
# Job-level — overrides workflow-level for this job only
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write   # only the deploy job needs this
      id-token: write      # only the deploy job needs OIDC
    steps:
      - uses: actions/checkout@v4
```

```yaml
# Minimal token — no permissions at all (default before GHA migration)
# Set empty object to force fallback to read-only
permissions: {}
```

### OIDC Authentication — Cloud Providers

```yaml
# AWS — assume IAM role via OIDC (no long-lived keys)
jobs:
  deploy-aws:
    permissions:
      id-token: write    # REQUIRED for OIDC
      contents: read
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: us-east-1
          role-session-name: github-actions-deploy
      - run: aws s3 sync dist/ s3://my-bucket
```

```yaml
# GCP — workload identity federation
jobs:
  deploy-gcp:
    permissions:
      id-token: write
      contents: read
    steps:
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: "projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider"
          service_account: "deploy-sa@my-project.iam.gserviceaccount.com"
      - run: gcloud run deploy my-service --image gcr.io/my-project/my-image
```

```yaml
# Azure — OIDC with federated identity credential
jobs:
  deploy-azure:
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Azure login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - run: az webapp deploy --resource-group my-rg --name my-app
```

### Environment Protection Rules

```yaml
# Define environments in GitHub UI: Settings > Environments
# Rules: required reviewers, wait timer, deployment branches

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com   # shown in deployment UI
    # Protection rules applied automatically:
    #   - Required reviewers must approve
    #   - Wait timer (e.g., 10 minutes) enforced
    #   - Only matching deployment branches allowed
    steps:
      - run: ./deploy.sh
```

```yaml
# Dynamic environment selection via workflow_dispatch
on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Deployment target"
        required: true
        default: staging
        type: choice
        options:
          - development
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - run: echo "Deploying to ${{ inputs.environment }}"
```

### Secrets Management Patterns

```yaml
# Repository secrets — stored in Settings > Secrets and variables > Actions
# Access via ${{ secrets.SECRET_NAME }}
jobs:
  build:
    steps:
      - run: deploy.sh
        env:
          API_KEY: ${{ secrets.API_KEY }}           # repository secret
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}  # organization secret
```

```yaml
# Environment-scoped secrets — override repository/org secrets for the same name
# Automatically selected when `environment:` is set
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo "Using production DB URL"
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      # If DATABASE_URL exists as an environment secret in "production",
      # it takes precedence over the repository-level secret
```

```yaml
# Organization secrets — shared across selected repositories
# Set at: Organization > Settings > Secrets and variables > Actions
# Access: ${{ secrets.ORG_SECRET }}
# Visible to any workflow in authorized repos
```

```yaml
# Variables (non-secret configuration)
# Use for: deployment region, image tags, feature flags
steps:
  - run: echo "Region is ${{ vars.AWS_REGION }}"
  - run: kubectl apply -f manifests/
    env:
      NAMESPACE: ${{ vars.K8S_NAMESPACE }}
```

### Workflow Hardening

```yaml
# Prevent script injection — use intermediate env variables
# BAD: direct expression in command
- run: echo "${{ github.event.issue.title }}"       # INSECURE

# GOOD: store in env, then reference
- run: echo "$ISSUE_TITLE"
  env:
    ISSUE_TITLE: ${{ github.event.issue.title }}     # SECURE
```

```yaml
# Restrict workflow triggers to trusted events
on:
  pull_request_target:   # DANGEROUS — runs in the context of the base repo
    types: [labeled]     # Safer: gate with label and review

  # Safer alternative — use pull_request for untrusted forks
  pull_request:
    branches: [main]
```

```yaml
# Audit logging — track workflow events
# GitHub Audit Log (Organization > Security > Audit log)
# Contains: all workflow runs, secret access, environment changes
# Export via: gh api /orgs/ORG/audit-log
```

```yaml
# Prevent accidental secret exposure in artifacts
steps:
  - run: npm run build
  - run: |
      # Scrub secrets from output before uploading
      rm -f .env .env.*
  - uses: actions/upload-artifact@v4
    with:
      name: build-output
      path: dist/
```

## Code Snippets

### Least-Privilege GITHUB_TOKEN Workflow

```yaml
name: Secure CI
on:
  pull_request:
    branches: [main]

# Start with no permissions, add only what each job needs
permissions: {}

jobs:
  lint:
    runs-on: ubuntu-latest
    permissions:
      contents: read     # only need to checkout
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run lint

  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      checks: write      # write check runs for test results
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test

  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
      deployments: write     # create deployment events
      id-token: write        # OIDC for AWS auth
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/deploy-role
          aws-region: us-east-1
      - run: ./deploy.sh
```

### Complete OIDC Setup with AWS

```yaml
name: Deploy to AWS with OIDC
on:
  push:
    branches: [main]

permissions:
  id-token: write        # needed for OIDC token exchange
  contents: read         # needed for checkout

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: us-east-1
          role-duration-seconds: 900
          # The OIDC token (ACTIONS_ID_TOKEN_REQUEST_TOKEN) is auto-exchanged
          # GitHub → AWS STS → temporary credentials — no manual keys needed

      - name: Build and push Docker image
        run: |
          aws ecr get-login-password --region us-east-1 | \
            docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
          docker build -t my-app .
          docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster my-cluster \
            --service my-service --force-new-deployment
```

### Multi-Environment Deployment with Protection Gates

```yaml
name: Multi-Environment Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
      - run: ./deploy-staging.sh

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    permissions:
      contents: read
      deployments: write
      id-token: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/prod-deploy-role
          aws-region: us-east-1
      - run: ./deploy-prod.sh
```

### Secret Scanning with CodeQL

```yaml
name: Secret Scanning
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write    # upload SARIF results
      actions: read
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript
          queries: security-extended

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:javascript"

      # GitHub secret scanning runs automatically on push for
      # public repos and repos with GitHub Advanced Security.
      # Detects: AWS keys, GitHub tokens, npm tokens, etc.
```

### Dependabot Security Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
    reviewers:
      - "team-dev"
    assignees:
      - "security-lead"
    allow:
      - dependency-type: "direct"
    ignore:
      - dependency-name: "lodash"
      - dependency-name: "typescript"
        versions: [">=6.x"]

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      actions:
        patterns:
          - "actions/*"
          - "github/*"
```

### Self-Hosted Runner Security Hardening

```yaml
name: Self-Hosted Runner Job
on:
  workflow_dispatch:

jobs:
  build:
    # Only accept jobs from the main branch
    if: github.ref == 'refs/heads/main'
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      # NEVER run untrusted code on self-hosted runners
      # - pull_request_target from forks is dangerous
      # - Use GitHub-hosted runners for PRs from forks

      - run: ./trusted-build.sh
```

```yaml
# Runner group configuration (set via GitHub UI or API)
# - Restrict which repos can use the group
# - Set maximum runner count
# - Apply labels for job routing

# Job targeting specific runner group
jobs:
  secure-build:
    runs-on: [self-hosted, linux, x64, production]
    steps:
      - run: ./build.sh
```

### Preventing Secret Exposure in Actions Logs

```yaml
# GitHub Actions automatically masks secrets in logs
# But you must still be careful with structured output

steps:
  - name: Avoid printing secrets
    run: |
      # BAD — secret printed as JSON key
      echo "{\"api_key\": \"${{ secrets.API_KEY }}\"}"

      # GOOD — store in env var, mask is automatic
      curl -H "Authorization: Bearer $API_KEY" https://api.example.com
    env:
      API_KEY: ${{ secrets.API_KEY }}

  - name: Sanitize debug output
    run: |
      # Strip known patterns before logging
      curl -v https://api.example.com 2>&1 | \
        sed 's/Authorization: Bearer [^ ]*/Authorization: Bearer ***/g'
```

### SLSA and Supply Chain Security

```yaml
# Generate provenance attestations for build artifacts
name: SLSA Provenance
on:
  push:
    tags: ["v*"]

jobs:
  build:
    permissions:
      id-token: write      # needed for signing
      contents: read
      attestations: write  # needed for attestation upload
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build

      - name: Generate attestation
        uses: actions/attest-build-provenance@v1
        with:
          subject-path: "dist/**"

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: signed-build
          path: dist/
```

---
title: "Building Deployment Pipelines with GitHub Actions"
description: "A comprehensive tutorial on creating production-grade deployment pipelines with GitHub Actions, covering environment-based workflows, approval gates, rollback strategies, and cloud platform integrations."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building Deployment Pipelines with GitHub Actions

## Summary

This tutorial teaches you how to build professional deployment pipelines using GitHub Actions. You will learn to configure deployment environments with protection rules, implement approval gates, set up blue/green and rolling deployment strategies, handle rollbacks automatically, and integrate with Docker registries and cloud platforms — enabling your team to ship code safely and reliably.

## Target Audience

- DevOps engineers and developers responsible for CI/CD pipeline design.
- Teams using GitHub who want to move beyond basic CI workflows into production-grade deployment automation.
- Expected level: Intermediate — familiarity with GitHub Actions workflow syntax (jobs, steps, triggers) is assumed.

## Prerequisites

- A GitHub account with a repository that has GitHub Actions enabled.
- Basic understanding of GitHub Actions workflows — jobs, steps, `on` triggers, and matrix builds.
- Familiarity with YAML syntax and shell scripting.
- Optional but helpful: a Docker Hub or GitHub Container Registry account for container deployment examples.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Configure GitHub Environments with protection rules and required reviewers.
- Design multi-environment deployment workflows (development, staging, production).
- Implement approval gates using environment protection rules and manual triggers.
- Build blue/green and rolling deployment strategies with automated rollback.
- Integrate deployment pipelines with Docker registries and cloud deployment targets.
- Add deployment notifications and observability to your pipelines.
- Implement safe rollback strategies for failed deployments.

## Context and Motivation

Moving code from a repository to a running application in production involves significant risk. Manual deployment processes are error-prone, lack audit trails, and slow down teams. As organizations scale, the need for automated, gated deployment pipelines becomes critical.

GitHub Actions provides a powerful platform for building deployment pipelines directly inside your repository. Its Environments feature gives you protection rules, secrets isolation, and approval gates — everything needed for safe, compliant deployments. Combined with GitHub's rich ecosystem of actions and deployment APIs, you can implement enterprise-grade deployment strategies without leaving your GitHub workflow.

This tutorial bridges the gap between basic CI and production-grade CD, giving you patterns that work for small teams and large organizations alike.

## Core Content

### Understanding GitHub Environments

GitHub Environments represent deployment targets — distinct stages in your delivery pipeline such as `development`, `staging`, and `production`. Each environment carries its own set of protection rules, secrets, and deployment history.

**Key environment features:**

- **Required reviewers**: Specify individuals or teams that must approve a deployment before it proceeds.
- **Wait timer**: Introduce a mandatory delay before a deployment starts (useful for production cool-off periods).
- **Deployment branches**: Restrict which branches can deploy to an environment.
- **Environment secrets**: Isolate sensitive values per environment — production secrets are never exposed to staging jobs.
- **Deployment protection rules**: Gate deployments on external checks like a CI status or a custom API response.

### Multi-Environment Workflow Design

A mature deployment pipeline progresses through multiple environments:

```text
CI (build & test) → Development (auto-deploy) → Staging (gated) → Production (gated)
```

Each environment has different rules:

| Environment | Trigger | Approval Required | Deploy Branch |
|---|---|---|---|
| Development | Push to main | No | main |
| Staging | Manual workflow_dispatch | Optional | main |
| Production | Manual workflow_dispatch | Required reviewers | main, release/* |

This progressive approach catches issues early. A commit that passes CI deploys to development automatically. From there, a human or automated test suite promotes the build to staging, and finally to production after formal approval.

### Deployment Job Structure with Environments

Environments are referenced at the job level in your workflow:

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - name: Deploy to staging
        run: ./deploy.sh staging
```

The `environment.url` field creates a direct link to the deployment in the GitHub Actions UI. You see this link in the workflow run summary and in commit status checks.

### Blue/Green Deployment Strategy

Blue/green deployment runs two identical environments — only one serves live traffic at a time:

1. **Blue** is the current production environment serving live traffic.
2. **Green** is the new version deployed alongside it, fully tested but receiving no traffic.
3. After validation, the router or load balancer switches traffic from blue to green.
4. If the green deployment fails, traffic stays on blue — instant rollback.

Implementation with GitHub Actions:

```yaml
jobs:
  deploy-green:
    runs-on: ubuntu-latest
    environment:
      name: production
    outputs:
      green_url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        run: |
          docker build -t app:${{ github.sha }} .
          docker tag app:${{ github.sha }} registry.example.com/app:${{ github.sha }}
          docker push registry.example.com/app:${{ github.sha }}
      - name: Deploy green environment
        id: deploy
        run: |
          ./deploy-green.sh ${{ github.sha }}
          echo "url=https://green-${{ github.sha }}.example.com" >> $GITHUB_OUTPUT

  switch-traffic:
    needs: deploy-green
    runs-on: ubuntu-latest
    environment:
      name: production
    steps:
      - name: Run smoke tests against green
        run: ./smoke-test.sh ${{ needs.deploy-green.outputs.green_url }}
      - name: Switch load balancer to green
        run: ./switch-traffic.sh green
```

### Rolling Deployment Strategy

A rolling deployment replaces instances gradually, avoiding downtime:

```yaml
jobs:
  rolling-deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
    strategy:
      matrix:
        instance: [blue, green, yellow]  # Three instance groups
      max-parallel: 1  # One at a time
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to instance group ${{ matrix.instance }}
        run: |
          ./drain-and-deploy.sh ${{ matrix.instance }} ${{ github.sha }}
      - name: Health check
        run: |
          ./health-check.sh ${{ matrix.instance }}
          if [ $? -ne 0 ]; then
            echo "Health check failed for ${{ matrix.instance }}"
            ./rollback.sh ${{ matrix.instance }} previous
            exit 1
          fi
```

### Environment Configuration via GitHub Secrets

Each environment stores its own secrets. Create them in **Settings → Environments → [environment name] → Environment secrets**:

```bash
# development environment secrets
AWS_ACCESS_KEY_ID=dev-access-key
AWS_SECRET_ACCESS_KEY=dev-secret-key
DEPLOY_ENDPOINT=https://dev-api.example.com

# staging environment secrets
AWS_ACCESS_KEY_ID=staging-access-key
AWS_SECRET_ACCESS_KEY=staging-secret-key
DEPLOY_ENDPOINT=https://staging-api.example.com

# production environment secrets
AWS_ACCESS_KEY_ID=prod-access-key
AWS_SECRET_ACCESS_KEY=prod-secret-key
DEPLOY_ENDPOINT=https://api.example.com
```

Workflows reference these secrets through the environment context:

```yaml
steps:
  - name: Deploy to ${{ github.event.environment.name }}
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    run: ./deploy.sh
```

### Manual Approval Gates with Environment Protection Rules

Production deployments require human approval. GitHub Environments provide this through **Required reviewers**:

1. Navigate to **Settings → Environments → production → Required reviewers**.
2. Add individuals or teams who must approve each deployment.
3. When a workflow targets the `production` environment, GitHub creates a deployment review request.
4. Approvers receive a notification and can review the deployment details before approving or rejecting.

For external approval systems (ITSM tools like ServiceNow or Jira Service Management), use a **custom deployment protection rule** via the GitHub Marketplace or a custom GitHub App that checks external system status.

### Deployment Rollback Strategies

**Automated rollback on health check failure:**

```yaml
steps:
  - name: Deploy new version
    id: deploy
    run: |
      ./deploy.sh ${{ github.sha }}
      echo "previous_version=$(cat previous-version.txt)" >> $GITHUB_OUTPUT

  - name: Run post-deployment health checks
    id: health
    run: ./health-check.sh
    continue-on-error: true

  - name: Rollback on failure
    if: steps.health.outcome == 'failure'
    run: |
      echo "Health check failed — rolling back to ${{ steps.deploy.outputs.previous_version }}"
      ./rollback.sh ${{ steps.deploy.outputs.previous_version }}
```

**Version tracking with deployment artifacts:**

Store previous version metadata as a workflow artifact or in a simple version file in your deployment target. Each deployment writes the current version before deploying, so the rollback step always knows the last-known-good version:

```bash
#!/bin/bash
# deploy.sh — record previous version before deploying new one
if [ -f /opt/app/current-version.txt ]; then
  cp /opt/app/current-version.txt /opt/app/previous-version.txt
fi
echo "$1" > /opt/app/current-version.txt

# ... copy new application files, restart services ...
```

### Deployment Notifications

Keep your team informed about deployment status:

```yaml
steps:
  - name: Notify deployment start
    uses: slackapi/slack-github-action@v1
    with:
      payload: |
        {
          "text": "🚀 Deployment to *${{ github.event.environment.name }}* started by ${{ github.actor }}"
        }
    env:
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  - name: Notify deployment success
    if: success()
    uses: slackapi/slack-github-action@v1
    with:
      payload: |
        {
          "text": "✅ Deployment to *${{ github.event.environment.name }}* succeeded"
        }

  - name: Notify deployment failure
    if: failure()
    uses: slackapi/slack-github-action@v1
    with:
      payload: |
        {
          "text": "❌ Deployment to *${{ github.event.environment.name }}* failed — @here"
        }
```

### Complete Deployment Pipeline Example

Here is a complete multi-environment workflow that ties everything together:

```yaml
name: Deploy Application

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        default: "staging"
        type: choice
        options:
          - staging
          - production

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          echo "Running test suite..."
          npm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image_tag: ${{ steps.tag.outputs.tag }}
    steps:
      - uses: actions/checkout@v4
      - name: Log in to registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push Docker image
        id: tag
        run: |
          TAG="${{ github.sha }}"
          docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:$TAG .
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:$TAG
          echo "tag=$TAG" >> $GITHUB_OUTPUT

  deploy-dev:
    needs: build-and-push
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    environment:
      name: development
      url: https://dev.example.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to development
        run: |
          ./deploy.sh development ${{ needs.build-and-push.outputs.image_tag }}

  deploy-staging:
    needs: build-and-push
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'staging'
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          ./deploy.sh staging ${{ needs.build-and-push.outputs.image_tag }}
      - name: Run integration tests against staging
        run: |
          ./integration-tests.sh https://staging.example.com

  deploy-production:
    needs: [build-and-push, deploy-staging]
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        id: deploy
        run: |
          ./deploy.sh production ${{ needs.build-and-push.outputs.image_tag }}
      - name: Post-deployment smoke tests
        id: smoke
        run: |
          echo "Running smoke tests against production..."
          ./smoke-test.sh https://example.com
        continue-on-error: true
      - name: Rollback on smoke test failure
        if: steps.smoke.outcome == 'failure'
        run: |
          echo "Smoke tests failed — initiating rollback"
          ./rollback.sh production
      - name: Notify deployment result
        if: always()
        run: |
          if [ "${{ steps.smoke.outcome }}" == "failure" ]; then
            echo "❌ Production deployment failed — rolled back"
          else
            echo "✅ Production deployment succeeded"
          fi
```

## Code Examples

### Setting Up GitHub Environments via CLI

You can create environments programmatically using the GitHub CLI:

```bash
# Create development environment
gh api -X PUT repos/:owner/:repo/environments/development

# Create staging environment with a wait timer
gh api -X PUT repos/:owner/:repo/environments/staging \
  -f wait_timer=60

# Create production environment with required reviewers
gh api -X PUT repos/:owner/:repo/environments/production \
  -f required_reviewer_teams[]="my-org/ops-team" \
  -f deployment_branch_policy.protected_branches=true \
  -f deployment_branch_policy.custom_branch_policies=true

# List all environments
gh api repos/:owner/:repo/environments --jq '.environments[].name'
```

### Deployment Script Template

A reusable deployment script that works with the patterns in this tutorial:

```bash
#!/bin/bash
# deploy.sh — Deploy application to target environment
# Usage: ./deploy.sh <environment> <version>

set -euo pipefail

ENVIRONMENT="$1"
VERSION="$2"
DEPLOY_DIR="/opt/app/${ENVIRONMENT}"
PREVIOUS_VERSION_FILE="${DEPLOY_DIR}/previous-version.txt"
CURRENT_VERSION_FILE="${DEPLOY_DIR}/current-version.txt"

echo "=== Deploying version ${VERSION} to ${ENVIRONMENT} ==="

# Record current version as previous before deploying
if [ -f "$CURRENT_VERSION_FILE" ]; then
  cp "$CURRENT_VERSION_FILE" "$PREVIOUS_VERSION_FILE"
fi

# Create deploy directory if not exists
mkdir -p "$DEPLOY_DIR"

# Pull the new version
docker pull ghcr.io/my-org/my-app:${VERSION}

# Stop the old container (if running)
docker stop "app-${ENVIRONMENT}" 2>/dev/null || true
docker rm "app-${ENVIRONMENT}" 2>/dev/null || true

# Start the new container
docker run -d \
  --name "app-${ENVIRONMENT}" \
  --restart unless-stopped \
  -p 3000:3000 \
  -e "NODE_ENV=${ENVIRONMENT}" \
  ghcr.io/my-org/my-app:${VERSION}

# Record the deployed version
echo "$VERSION" > "$CURRENT_VERSION_FILE"

echo "=== Deployment to ${ENVIRONMENT} complete ==="
```

### Rollback Script Template

```bash
#!/bin/bash
# rollback.sh — Rollback to previous version
# Usage: ./rollback.sh <environment>

set -euo pipefail

ENVIRONMENT="$1"
DEPLOY_DIR="/opt/app/${ENVIRONMENT}"
PREVIOUS_VERSION_FILE="${DEPLOY_DIR}/previous-version.txt"

if [ ! -f "$PREVIOUS_VERSION_FILE" ]; then
  echo "ERROR: No previous version found for ${ENVIRONMENT}"
  exit 1
fi

PREVIOUS_VERSION=$(cat "$PREVIOUS_VERSION_FILE")
echo "=== Rolling back ${ENVIRONMENT} to version ${PREVIOUS_VERSION} ==="

# Stop the current container
docker stop "app-${ENVIRONMENT}" 2>/dev/null || true
docker rm "app-${ENVIRONMENT}" 2>/dev/null || true

# Start the previous version
docker run -d \
  --name "app-${ENVIRONMENT}" \
  --restart unless-stopped \
  -p 3000:3000 \
  -e "NODE_ENV=${ENVIRONMENT}" \
  ghcr.io/my-org/my-app:${PREVIOUS_VERSION}

echo "=== Rollback to ${PREVIOUS_VERSION} complete ==="
```

## Key Insights

- **Start with environments early**: Add environments to your repository as soon as you have more than one deployment target. Adding them retroactively to existing workflows requires careful refactoring.
- **Keep deployment scripts outside workflows**: Shell scripts (deploy.sh, rollback.sh) live in your repository and are versioned alongside your code. Workflows call them rather than inlining complex deployment logic — this makes scripts testable locally.
- **Health checks are your safety net**: Every deployment step should be followed by a health check. Without them, you will not detect failures until users report them.
- **`continue-on-error` for rollback detection**: Use `continue-on-error: true` on health check steps so the workflow continues to the rollback step instead of aborting immediately.
- **Environment URL links**: Always set `environment.url` in workflow jobs. This creates clickable links from the Actions UI directly to your deployed application, saving developers time during debugging.
- **Secrets isolation matters**: Never reuse secrets across environments. A staging compromise should not expose production credentials. GitHub Environments enforce this separation by design.
- **Approval gates are not a substitute for automated checks**: Required reviewers add accountability but should complement — not replace — automated smoke tests and health checks.

## Next Steps

- Explore the [GitHub Actions CI/CD Best Practices Guide](../guides/github-actions-cicd-best-practices-guide.md) for organizational-level patterns on reusable workflows, security hardening, and cost optimization.
- Learn about [Building Custom GitHub Actions](./building-custom-github-actions.md) to encapsulate your deployment logic into reusable components.
- Study the [GitHub Actions DevOps Syllabus](../syllabi/github-actions-devops-syllabus.md) for a structured 12-week learning path covering the full CI/CD ecosystem.

## Conclusion

You have learned how to build production-grade deployment pipelines with GitHub Actions. You now understand GitHub Environments with protection rules and approval gates, multi-environment workflow design, blue/green and rolling deployment strategies, automated rollback on health check failure, and deployment notifications. These patterns give you a foundation for safe, reliable, and auditable delivery pipelines that scale with your team.

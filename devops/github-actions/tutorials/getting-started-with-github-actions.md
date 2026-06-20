---
title: "Getting Started with GitHub Actions"
description: "A comprehensive guide to understanding and implementing CI/CD pipelines with GitHub Actions for automated testing, building, and deployment."
category: "devops"
technology: "github-actions"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Getting Started with GitHub Actions

## Summary

This tutorial introduces GitHub Actions, GitHub's built-in CI/CD automation platform. You will learn how to create workflow files, understand core concepts like events, jobs, and runners, and build practical pipelines for testing, building, and deploying your projects — all without leaving your GitHub repository.

## Target Audience

- Developers and DevOps engineers new to CI/CD automation.
- GitHub users who want to automate testing and deployment workflows.
- Expected level: Beginner to Intermediate — no prior CI/CD experience required.

## Prerequisites

- A GitHub account and basic familiarity with Git (commit, push, pull).
- A GitHub repository with some code (any language) to experiment with.
- Basic command-line knowledge (running scripts, navigating directories).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain the core components of GitHub Actions: workflows, events, jobs, steps, and runners.
- Write a YAML workflow file that triggers on push and pull request events.
- Use GitHub's marketplace actions for common tasks like checking out code and setting up runtimes.
- Create multi-job workflows with dependency ordering and artifact sharing.
- Implement a basic CI pipeline that runs tests on every push.
- Configure deployment workflows with environment secrets and approval gates.
- Debug failed workflow runs using logs and the GitHub web interface.

## Context and Motivation

Manual software deployment is error-prone, time-consuming, and does not scale. Every time a developer pushes code, someone (or some process) needs to verify it builds correctly, tests pass, and the new version reaches production safely. GitHub Actions solves this by providing a fully integrated automation engine right inside your repository.

Unlike external CI tools that require separate accounts, webhook configuration, and credential management, GitHub Actions lives where your code already lives. Workflow files are committed alongside your source code, making CI/CD configuration version-controlled, reviewable, and reproducible. The ecosystem also includes a marketplace with thousands of pre-built actions for common tasks — deploying to cloud providers, sending notifications, running linters, and more.

By the end of this tutorial, you will have a working CI pipeline and the foundational knowledge to build more complex automation workflows.

## Core Content

### Understanding GitHub Actions Architecture

GitHub Actions is built around five core concepts that work together to execute automation:

- **Workflow**: An automated procedure defined in a YAML file inside `.github/workflows/`. A workflow is the top-level unit of automation.
- **Event**: A trigger that starts a workflow. Events include `push`, `pull_request`, `schedule` (cron), `workflow_dispatch` (manual), and many more.
- **Job**: A set of steps that execute on the same runner. Jobs within a workflow can run in parallel or sequentially.
- **Step**: An individual task within a job. Steps can run shell commands or use actions from the marketplace.
- **Runner**: A virtual machine or self-hosted server that executes jobs. GitHub provides Ubuntu, Windows, and macOS runners.

### Anatomy of a Workflow File

Workflow files are YAML documents stored in `.github/workflows/` at the root of your repository. Every workflow must have a name, a trigger event, and at least one job.

```yaml
name: CI Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run a script
        run: echo "Hello, GitHub Actions!"
```

### Events and Triggers

Events define when a workflow runs. The most common events are:

- **push**: Triggers when code is pushed to specified branches.
- **pull_request**: Triggers on pull request events (opened, synchronized, reopened).
- **schedule**: Triggers at scheduled times using cron syntax.
- **workflow_dispatch**: Enables manual triggering from the GitHub web UI.
- **release**: Triggers when a release is published.

You can combine events and use activity types or path filters for precise control:

```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'tests/**'
  pull_request:
    types: [opened, synchronize]
    branches: [main]
```

### Jobs, Steps, and Runners

A workflow can have multiple jobs. Jobs that do not depend on each other run in parallel by default. Use the `needs` keyword to create sequential chains:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

Each job can choose its runner operating system (`ubuntu-latest`, `windows-latest`, `macos-latest`) or use a self-hosted runner for custom hardware or software requirements.

### Using Marketplace Actions

The GitHub Marketplace hosts thousands of reusable actions created by GitHub, partners, and the community. Instead of writing complex shell scripts, you can compose workflows from pre-built actions:

```yaml
steps:
  - uses: actions/checkout@v4          # Check out repo code
  - uses: actions/setup-node@v4         # Install Node.js
    with:
      node-version: 20
  - uses: actions/cache@v4              # Cache dependencies
    with:
      path: ~/.npm
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

Actions are referenced by `author/repo@version` format. Always pin to a major version (e.g., `@v4`) or a specific commit SHA for production workflows.

### Environment Variables and Secrets

Workflows can access environment variables and encrypted secrets. Repository secrets are set in **Settings > Secrets and variables > Actions**:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      NODE_ENV: production
    steps:
      - run: echo "Deploying to ${{ vars.ENVIRONMENT_NAME }}"
      - run: ./deploy.sh
        env:
          API_KEY: ${{ secrets.API_KEY }}
```

Always use secrets for sensitive values like API keys and passwords. Never hardcode them in workflow files.

### Matrix Builds

Run the same job across multiple configurations simultaneously using matrix strategies:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
```

This creates six parallel test environments (3 Node versions × 2 operating systems) without duplicating code.

### Artifacts and Caching

Artifacts persist files between jobs or after a workflow completes. Use them to share build outputs or store test reports:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: ./deploy.sh
```

Caching speeds up workflows by reusing dependencies across runs. The `actions/cache` action stores and retrieves cached directories by a computed key.

## Code Examples

### Example 1: Basic CI Workflow for Node.js

This workflow runs linting and tests on every push to any branch:

```yaml
name: Node.js CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm test
```

### Example 2: Multi-Stage Deployment Pipeline

A complete pipeline with lint, test, build, and deploy stages, using environment secrets for the production deployment:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: built-app
          path: build/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: built-app
          path: build/
      - run: ./scripts/deploy.sh
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

### Example 3: Scheduled Data Export Workflow

Run a data export script every morning at 6 AM UTC:

```yaml
name: Daily Data Export

on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python scripts/export-data.py
        env:
          API_TOKEN: ${{ secrets.API_TOKEN }}
      - uses: actions/upload-artifact@v4
        with:
          name: daily-export
          path: exports/
```

## Key Insights

- **Workflow files are code**: Store workflows in `.github/workflows/` alongside your source code. They benefit from the same code review, versioning, and branching practices as application code.
- **Start simple, iterate fast**: Begin with a single job that runs lint or tests, then add build, artifact sharing, and deployment stages as your confidence grows.
- **Use `actions/checkout@v4` first**: Almost every workflow needs the repository's code. The checkout action is the most common first step in any job.
- **Matrix strategies prevent duplication**: Instead of copying a job for each runtime version, use `strategy.matrix` to test across multiple configurations with a single job definition.
- **Secrets never appear in logs**: GitHub automatically masks secrets in workflow output. However, avoid passing secrets to scripts via command-line arguments, which may not be masked.
- **Artifact retention has limits**: By default, artifacts expire after 90 days. Configure retention days with `actions/upload-artifact@v4`'s `retention-days` parameter for compliance or long-term storage needs.
- **Self-hosted runners for custom needs**: When GitHub-hosted runners do not meet your requirements (specific GPU, on-premises network access), set up self-hosted runners on your own infrastructure.

## Next Steps

- Explore the GitHub Actions Marketplace for pre-built actions relevant to your tech stack.
- Learn about environment protection rules and required reviewers for deployment workflows.
- Study reusable workflows and composite actions to share automation logic across repositories.
- Read the [GitHub Actions documentation](https://docs.github.com/en/actions) for advanced topics like OIDC, GitHub-hosted runner specifications, and workflow command syntax.

## Conclusion

GitHub Actions brings powerful CI/CD capabilities directly into your repository with minimal setup overhead. In this tutorial, you learned the core architecture — workflows, events, jobs, steps, and runners — and built practical pipelines for testing, building, and deployment. By committing workflow files alongside your code, you ensure that your automation configuration is version-controlled, reviewable, and reproducible across environments. Start with a simple CI pipeline, then gradually add deployment stages, matrix builds, and scheduled tasks as your project grows.

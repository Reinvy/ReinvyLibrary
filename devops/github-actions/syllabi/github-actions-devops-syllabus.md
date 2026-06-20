---
title: "GitHub Actions DevOps Syllabus"
description: "A comprehensive 12-week curriculum covering GitHub Actions fundamentals, workflow automation, CI/CD pipelines, deployment strategies, security, and advanced automation patterns."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# GitHub Actions DevOps Syllabus

## Overview

This 12-week curriculum provides a structured learning path for mastering GitHub Actions, from CI/CD fundamentals to advanced automation patterns. Each week builds on the previous, combining conceptual learning with hands-on practice. By the end of this course, you will be able to design, implement, and maintain sophisticated CI/CD pipelines, reusable workflows, and secure automation workflows using GitHub Actions.

The course is designed for developers and DevOps engineers with basic Git and GitHub experience who want to automate testing, building, and deployment pipelines directly within their GitHub repositories.

## Curriculum

### Week 1: CI/CD Fundamentals and GitHub Actions Overview

- **What is CI/CD?**
  - Continuous Integration: automatically building and testing code on every push
  - Continuous Delivery/Deployment: automatically deploying verified code to environments
  - The business case for automation: speed, consistency, reliability
- **GitHub Actions Architecture**
  - Core components: Workflows, Events, Jobs, Steps, Runners
  - GitHub-hosted vs self-hosted runners
  - Actions Marketplace overview
- **First Workflow**
  - Creating `.github/workflows/` directory
  - YAML workflow syntax basics
  - Triggering on `push` events
  - Using `actions/checkout` and a simple `echo` step
  - Viewing workflow runs in the GitHub UI

### Week 2: Workflow Configuration and Event Triggers

- **Event-Driven Triggers**
  - Push, pull_request, schedule (cron), workflow_dispatch
  - Issue and PR event types (opened, labeled, synchronize)
  - Registry package events
- **Filtering and Conditional Execution**
  - Branch filters (`branches`, `branches-ignore`)
  - Path filters (`paths`, `paths-ignore`) for monorepo optimization
  - Activity type filtering for issue/PR events
  - `if` conditionals with expressions
- **Workflow Dispatch Inputs**
  - Defining manual trigger parameters
  - Choice, string, boolean, and environment input types

### Week 3: Jobs, Runners, and Parallel Execution

- **Job Definition and Dependencies**
  - Defining jobs with `jobs.<job_id>`
  - Job dependencies using `needs`
  - Job status check functions (`success()`, `failure()`, `always()`, `cancelled()`)
- **Runner Selection**
  - `runs-on` syntax and available GitHub-hosted images (ubuntu-latest, windows-latest, macos-latest)
  - Self-hosted runner labels
  - Runner groups for organizational control
- **Matrix Builds**
  - `strategy.matrix` for cross-configuration testing
  - Including and excluding matrix combinations
  - Dynamic matrix generation from JSON output
- **Concurrency Control**
  - Cancelling in-progress runs on new pushes
  - Concurrency groups for environment-level deployment guarantees

### Week 4: Steps, Actions, and Custom Scripting

- **Using Marketplace Actions**
  - Finding and evaluating actions by ratings and maintenance status
  - Pinning action versions (major tag, full SHA) for supply chain security
  - Popular action categories: setup, checkout, cache, upload-artifact, deploy
- **Custom Shell Steps**
  - Inline shell commands vs dedicated action files
  - Multi-line shell scripts with pipe (`|`) indicators
  - PowerShell and Bash step examples
- **Action Inputs and Outputs**
  - Passing inputs to actions
  - Capturing and reusing step outputs across jobs
  - Environment files (`$GITHUB_ENV`, `$GITHUB_OUTPUT`)
- **Composite Actions**
  - Building reusable step collections
  - Composite action metadata and inputs/outputs

### Week 5: Environment Variables, Secrets, and Configuration

- **Environment Variable Hierarchy**
  - Worklet-level, job-level, and step-level `env` blocks
  - Default environment variables (`GITHUB_*`, `RUNNER_*`)
- **Secrets Management**
  - Repository secrets, environment secrets, and organization secrets
  - Encrypted variables (newer alternative for non-sensitive config)
  - Secret scanning and prevention of accidental leakage
- **Environment Protection Rules**
  - Creating environments (production, staging, development)
  - Required reviewers for deployment gates
  - Wait timer and deployment branch restrictions
- **OIDC for Cloud Authentication**
  - Configuring OpenID Connect with AWS, Azure, or GCP
  - Assuming IAM roles without static credentials
  - Trust policy configuration

### Week 6: Artifacts, Caching, and State Sharing

- **Workflow Artifacts**
  - Uploading build outputs with `actions/upload-artifact`
  - Downloading artifacts in downstream jobs
  - Artifact retention policies and cleanup
  - Use case: preserving build binaries for later deployment
- **Dependency Caching**
  - `actions/cache` for package manager caches (npm, pip, maven, go)
  - Cache key design and restore keys
  - Cache eviction and size limits
- **Sharing Data Between Jobs**
  - Artifact vs cache vs output decision guide
  - JSON output from one job consumed by another
  - Build matrix job aggregation patterns

### Week 7: Testing Pipelines and Code Quality

- **Running Tests in CI**
  - Unit test execution (Jest, pytest, JUnit)
  - Integration test setup with service containers
  - Test result reporting with `dorny/test-reporter`
  - Test splitting and parallelization strategies
- **Code Quality Automation**
  - Linting (ESLint, RuboCop, Pylint) as a workflow gate
  - Code formatting checks (Prettier, Black, gofmt)
  - Static analysis and SAST (CodeQL, SonarCloud)
  - Code coverage reporting with annotations
- **Pull Request Checks**
  - Status check requirements for protected branches
  - PR annotations for linting violations
  - Fail-fast vs continue-on-error strategies
  - Combining multiple CI checks into a PR quality gate

### Week 8: Container and Service Integration

- **Docker in GitHub Actions**
  - Running jobs inside Docker containers
  - Building and pushing Docker images to registries (GHCR, Docker Hub)
  - Multi-platform builds with `docker/build-push-action`
- **Service Containers**
  - Defining databases and caches as service containers
  - Connecting job containers to service containers
  - Health checks and readiness probes
  - Common service patterns: PostgreSQL, Redis, MySQL
- **Container Registry Authentication**
  - Logging into GHCR and Docker Hub
  - Using `GITHUB_TOKEN` for GHCR authentication
  - Pushing container images with proper labeling

### Week 9: Deployment Workflows and Release Automation

- **Deployment to Cloud Platforms**
  - Deploying to AWS (ECS, Lambda, S3) with official actions
  - Deploying to Azure (App Service, Functions, AKS)
  - Deploying to Google Cloud (Cloud Run, GKE, App Engine)
- **Environment-Based Deployment Pipelines**
  - Promotion through dev → staging → production
  - Approval gates with environment protection rules
  - Blue-green and canary deployment strategies
- **Release Automation**
  - Creating GitHub releases with `softprops/action-gh-release`
  - Generating release notes and changelogs
  - Semantic versioning automation
  - Attaching build artifacts to releases
- **Rollback Strategies**
  - Automated rollback on deployment failure
  - Using previous workflow run artifacts for recovery

### Week 10: Reusable Workflows and Monorepo Strategies

- **Reusable Workflows**
  - Defining caller workflows with `workflow_call`
  - Inputs and secrets for reusable workflows
  - Versioning reusable workflows with branch/tag references
  - Limitations and best practices
- **Monorepo Workflow Strategies**
  - Path filtering for targeted job execution
  - Dynamic matrix generation from changed files
  - Shared workflow library pattern
- **Workflow Templates**
  - Creating organization-level workflow templates
  - Starter workflows for common project types
  - Template variables and customization

### Week 11: Security, Compliance, and Supply Chain

- **Security Hardening**
  - Principle of least privilege for `GITHUB_TOKEN` permissions
  - Third-party action audit and pinning
  - Preventing `script injection` attacks
  - Using `actions/security` and CodeQL scanning
- **Supply Chain Security**
  - Dependabot version updates and security alerts
  - Dependency review on pull requests
  - SBOM generation and artifact attestation
  - SLSA framework compliance
- **Compliance and Auditing**
  - Audit log events for workflow activity
  - Mandatory workflow approvals for organization
  - Runner group access controls
  - Branch protection rule enforcement

### Week 12: Monitoring, Debugging, Optimization, and Capstone

- **Debugging Workflows**
  - Enabling debug logging (`ACTIONS_STEP_DEBUG`, `ACTIONS_RUNNER_DEBUG`)
  - Using `nektos/act` for local workflow testing
  - Workflow visualization and timeline analysis
- **Monitoring and Metrics**
  - GitHub Actions billing and usage analytics
  - Workflow run history and failure trends
  - Custom metrics with workflow telemetry
  - Webhooks for external monitoring integration
- **Performance Optimization**
  - Reducing workflow run time through parallelism
  - Caching strategies for frequently-used dependencies
  - Self-hosted runner pools for faster execution
- **Final Project — Full CI/CD Pipeline**
  - Design and implement a complete CI/CD pipeline for a multi-service application
  - Include: linting, testing, building, containerization, staging deployment, and production release
  - Implement approval gates, caching, artifact sharing, and rollback capability
  - Document the workflow architecture and deployment strategy

## Final Project

Design and implement a production-grade CI/CD pipeline for a multi-service web application using GitHub Actions. The project must include:

- A monorepo containing at least two services (e.g., a Node.js API and a React frontend) with a shared library
- A CI workflow that runs linting, unit tests, integration tests (with service containers), and builds Docker images for both services
- A deployment pipeline that promotes builds through development, staging, and production environments with approval gates
- Automated semantic versioning and GitHub release creation
- Reusable workflows for shared CI logic shared between services
- Caching optimization to minimize workflow runtime
- Artifact archiving for build outputs
- A rollback strategy using previously-deployed artifacts

The final deliverable includes the complete workflow YAML files, a README documenting the pipeline architecture, and a demonstration of a successful end-to-end deployment.

## Assessment Criteria

- **Weekly Assignments (40%)**: Practical exercises submitted as GitHub workflow files, evaluated for correctness and adherence to best practices.
- **Mid-Term Project (20%)**: A CI pipeline for an existing open-source project that includes multi-job execution, test reporting, and artifact preservation. Graded on completeness, security hardening, and documentation quality.
- **Final Project (40%)**: A full CI/CD pipeline with deployment gates, reusable workflows, and rollback capability. Evaluated on architecture design, security practices, caching efficiency, and real-world applicability.

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [Security Hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Reusable Workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [OIDC in GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [GitHub Changelog — Actions Updates](https://github.blog/changelog/label/actions/)
- [Awesome Actions — Community Curated List](https://github.com/sdras/awesome-actions)

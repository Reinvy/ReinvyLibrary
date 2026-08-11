---
title: "Advanced GitHub Actions Enterprise Automation Syllabus"
description: "A comprehensive 12-week advanced curriculum for DevOps engineers and platform teams covering custom action engineering with the Actions SDK, self-hosted runner fleet management and autoscaling, dynamic workflow architecture at monorepo scale, supply chain security with artifact attestations, OIDC federation, cost and performance engineering, enterprise governance, and progressive delivery patterns."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced GitHub Actions Enterprise Automation Syllabus

## Overview

This 12-week advanced syllabus is designed for DevOps engineers, platform engineers, and CI/CD architects who already build workflows with GitHub Actions and now need to operate it as a mission-critical automation platform. The curriculum deliberately goes beyond the breadth of a fundamentals course to focus on depth: writing production-grade custom actions with the official Actions SDK, engineering self-hosted runner fleets that autoscale, architecting dynamic workflows for large monorepos, hardening the software supply chain with artifact attestations, federating cloud identity through OIDC, controlling Actions spend, and embedding governance and compliance into every workflow.

Each week combines deep technical foundations with hands-on labs. Learners write real custom actions with TypeScript and Docker, deploy ephemeral runner fleets on Kubernetes, generate and verify Sigstore attestations, design dynamic matrix pipelines, and build enterprise policy sets. The course culminates in a capstone project where participants build a complete enterprise automation platform: a library of reusable workflows and custom actions, an autoscaling runner fleet, OIDC-based cloud deployment, supply chain attestations, and cost-aware monitoring.

By the end of this course, learners will be able to design and operate GitHub Actions as an internal platform, write and publish custom actions that meet enterprise quality bars, run secure self-hosted runners at scale, enforce supply chain and compliance requirements automatically, and deliver software with progressive deployment strategies — all while keeping the pipeline fast and cost-efficient.

## Curriculum

### Week 1: Enterprise Actions Architecture and Platform Engineering

- **Actions as an internal platform**
  - Golden workflow patterns: build once, promote many
  - Workflow templates and organization starter workflows
  - The platform team operating model: owning `.github` at scale
- **Repository layout for enterprise automation**
  - `.github/workflows/`, `.github/actions/`, and shared reusable workflow repositories
  - CODEOWNERS for workflow changes and mandatory review of pipeline code
  - Separating pipeline code from application code
- **Versioning and release strategy for workflows**
  - Semantic versioning for reusable workflows and actions
  - Branch/tag references vs commit SHA pinning
  - Rolling out breaking changes without breaking consumers
- **Networking and topology**
  - GitHub-hosted vs self-hosted placement decisions
  - Network egress control, proxy configuration, and IP allowlisting
- **Hands-on Lab**: Design a golden workflow library for a three-team organization and enforce CODEOWNERS review on `.github` changes

### Week 2: Custom Action Engineering — JavaScript SDK Internals

- **The official Actions Toolkit**
  - `@actions/core`: inputs, outputs, `setFailed`, `setOutput`, groups, save/restore state
  - Annotations: `notice`, `warning`, `error` with file/line/column metadata
  - `@actions/github`: the `context` object, Octokit client, REST and GraphQL calls
- **Helper packages in depth**
  - `@actions/exec` for process execution and output capture
  - `@actions/io`, `@actions/tool-cache`, `@actions/glob`
  - `@actions/cache` and `@actions/artifact` for state sharing
- **Action project structure**
  - TypeScript setup, `tsconfig` for Node 20, strict typing
  - Bundling with `@vercel/ncc` and committing `dist/`
  - `action.yml` metadata: inputs, outputs, and `runs` configuration
- **Error handling and observability**
  - Structured logging, masking secrets, and safe failure modes
- **Hands-on Lab**: Build a TypeScript action that parses a changelog, computes the next semantic version, and emits it as an output with proper annotations

### Week 3: Docker Container Actions and Advanced Composite Actions

- **Docker container actions**
  - `action.yml` metadata for container actions: image, args, entrypoint
  - Dockerfile best practices: multi-stage builds, slim base images, non-root users
  - Passing inputs via environment variables and `INPUT_*` conventions
- **Advanced composite actions**
  - Nesting composite actions and calling other actions inside
  - Conditional steps and `if` expressions within composites
  - Propagating outputs through composite boundaries
  - Using composite actions to standardize internal tooling
- **Debugging action runtimes**
  - Inspecting container logs, `ACTIONS_STEP_DEBUG`, and local reproduction
- **Hands-on Lab**: Package a command-line tool as a Docker action with a multi-stage build and expose it as a reusable composite action for the whole organization

### Week 4: Testing and CI/CD for Custom Actions

- **Unit testing actions**
  - Testing with Jest or Vitest and mocking `@actions/core`
  - Testing input validation, output computation, and failure paths
- **Integration testing**
  - Running actions locally with `nektos/act`
  - Testing against real repositories with workflow fixtures
- **Self-testing pattern**
  - A workflow that builds and exercises the action on every push
  - Test matrix across Node versions and runner images
- **Static validation**
  - `actionlint` for workflow and action metadata validation
  - Schema checks for `action.yml` in CI
- **Publishing and release automation**
  - Marketplace publishing requirements, verified creator, and release automation for action version tags
- **Hands-on Lab**: Add a self-test workflow to a custom action repository that runs unit tests, builds with `ncc`, validates `action.yml`, and publishes a tagged release

### Week 5: Self-Hosted Runner Engineering and Fleet Management

- **Runner installation and lifecycle**
  - Installing and configuring the runner service, auto-update behavior
  - Runner groups, labels, and organization/enterprise-level runners
- **Ephemeral and autoscaling runners**
  - Ephemeral runner lifecycle: one job per runner, automatic cleanup
  - Autoscaling on Kubernetes with actions-runner-controller (ARC)
  - Scale-to-zero economics and warm pool sizing
- **Runner security**
  - Isolating self-hosted runners from untrusted code (fork PRs, `pull_request_target`)
  - Network segmentation, virtual network injection, and egress filtering
  - Disk encryption and image immutability
- **Fleet observability**
  - Health checks, runner metrics, update and drain strategies
- **Hands-on Lab**: Deploy an ephemeral runner fleet with ARC on a local Kubernetes cluster and configure a scale-to-zero policy with a warm pool of two runners

### Week 6: Advanced Workflow Architecture — Dynamic Matrices and Monorepo at Scale

- **Dynamic matrix generation**
  - Producing JSON matrices from job outputs and `fromJSON`
  - Matrix include/exclude and fail-fast control
- **Change detection at scale**
  - Path filtering with `dorny/paths-filter` and `tj-actions/changed-files`
  - Building only what changed in large monorepos
- **Dependent job orchestration**
  - Artifact chaining, build-graph patterns, and fan-in/fan-out
  - Aggregating results from parallel jobs into a single gate
- **Monorepo tooling integration**
  - Task orchestration with Turborepo or Nx inside Actions
  - Shared caches across packages and remote caching
- **Reusable workflow composition**
  - Nested reusable workflows, passing secrets, and `workflow_call` limitations
  - Required workflows enforced at the enterprise level
- **Hands-on Lab**: Build a dynamic matrix pipeline for a 20-package monorepo that tests only affected packages and fans results into a single merge gate

### Week 7: Supply Chain Security and Artifact Attestations

- **Artifact attestations**
  - `actions/attest-build-provenance` and Sigstore-based signing
  - Verifying attestations with `gh attestation verify` and cosign
  - SLSA provenance levels and what each level guarantees
- **SBOM generation**
  - Generating SBOMs with Anchore Syft and `anchore/sbom-action`
  - Attaching SBOMs to releases and attestations
- **Third-party action governance**
  - Pinning actions to full commit SHAs at scale with Renovate or Dependabot
  - Verified creator, code review, and allowlisting third-party actions
  - Detecting typosquatting and compromised actions
- **Dependency security**
  - Dependabot for the Actions ecosystem, dependency review on PRs
- **Hands-on Lab**: Add build provenance attestation to a release pipeline, generate an SBOM, and verify both with `gh attestation verify` before promoting the artifact

### Week 8: OIDC and Cloud Identity Federation Deep Dive

- **How OIDC works in GitHub Actions**
  - The token endpoint, JWT claims, and token expiration
  - Customizing subject claims with `permissions.id-token` and conditions
- **AWS federation**
  - `AssumeRoleWithWebIdentity`, role trust policies with `sub` and `aud` conditions
  - Scoping roles to repository, environment, and ref
- **Azure and GCP federation**
  - Azure workload identity federation for App Service, AKS, and Functions
  - GCP workload identity pools and providers
- **Troubleshooting and hardening**
  - Common OIDC failure modes and trust policy misconfigurations
  - Eliminating static cloud credentials entirely
- **Hands-on Lab**: Configure OIDC for AWS and Azure so a deployment job assumes an environment-scoped role without any stored access keys

### Week 9: Performance, Cache, and Cost Engineering

- **The Actions billing model**
  - Private repository minutes, parallelism, and OS multipliers
  - Reading usage reports and attributing cost to teams
- **Workflow runtime optimization**
  - Parallelism and job decomposition, `fail-fast` strategies
  - Test sharding and splitting for large suites
  - Avoiding redundant runs with path and branch filters
- **Cache engineering**
  - Cache key design, restore keys, and scoping caches to branches
  - Cache eviction, size limits, and cache poisoning prevention
  - Remote caching for monorepo build tools
- **Runner fleet economics**
  - Total cost of ownership: GitHub-hosted vs self-hosted vs hybrid
  - Right-sizing runners and reducing macOS/Windows usage
- **Hands-on Lab**: Profile a slow pipeline, apply caching and test sharding, and produce a cost report attributing minutes to each team

### Week 10: Governance, Compliance, and Enterprise Policies

- **Enterprise policy enforcement**
  - Workflow approval policies and required workflows
  - Runner group permissions and access control
  - Restricting Actions usage to approved actions
- **Repository protection**
  - Branch protection with required status checks and rulesets
  - Environment protection rules for deployment gates
- **Audit and observability**
  - Audit log events for workflow activity
  - The Actions management API for inventory, usage, and secrets
  - Compliance evidence for SOC 2 and ISO 27001
- **Open-source and fork security**
  - Permissions for forks, `pull_request_target` risks, and safe checkout patterns
- **Hands-on Lab**: Enforce an enterprise policy that requires workflow approval and restricts actions to an allowlist, then verify audit log entries capture the enforcement

### Week 11: Progressive Delivery and GitOps Deployment Patterns

- **Progressive delivery with Actions**
  - Canary releases with metric-based promotion (Argo Rollouts, Flagger)
  - Feature flags and incremental traffic shifting
- **GitOps workflows**
  - Committing deployment manifests to GitOps repositories
  - Triggering Argo CD or Flux syncs from Actions
  - Drift detection and reconciliation
- **Multi-environment and multi-region deployment**
  - Promoting through dev → staging → production with approval gates
  - Multi-region rollout and traffic shifting
- **Automated rollback**
  - Health-check-driven rollback and artifact re-deployment
- **Hands-on Lab**: Implement a canary deployment pipeline that shifts 10% traffic, checks a metric threshold, and either promotes to 100% or automatically rolls back

### Week 12: Capstone — Enterprise Automation Platform

- **Design phase**
  - Requirements: golden workflows, custom actions, runner fleet, security, and cost targets
  - Architecture document and workflow topology diagram
- **Implementation phase**
  - A reusable workflow library consumed by multiple services
  - At least one custom JavaScript action and one Docker action published internally
  - An ephemeral runner fleet with autoscaling
  - OIDC-based deployment to a cloud environment
  - Supply chain attestations and SBOM on every release
  - Cost and performance monitoring with a documented budget
- **Hardening phase**
  - Enterprise policies, workflow approvals, and audit verification
- **Presentation phase**
  - Demo a full promotion from commit to production with attestation verification and rollback capability

## Final Project

Design and implement a production-grade enterprise automation platform on GitHub Actions. The platform must include:

- A library of reusable workflows (CI, CD, security scan, release) consumed by at least three simulated services with different tech stacks
- Two custom actions: one TypeScript action (e.g., semantic version computation or dependency drift detection) and one Docker container action (e.g., a custom linter or deployment tool), both with self-test workflows and automated releases
- A self-hosted runner fleet using ephemeral runners with autoscaling and scale-to-zero, plus runner groups separating trusted and untrusted workloads
- OIDC-based cloud deployment with environment-scoped roles and no static credentials
- Build provenance attestation and SBOM generation verified before artifact promotion
- A dynamic matrix monorepo pipeline that builds and tests only affected packages
- Progressive delivery for one service: canary rollout with metric-based promotion and automatic rollback
- Cost monitoring with a documented monthly minute budget and attribution by team

The final deliverable includes all workflow YAML files, action source code with tests, runner deployment manifests, an architecture document, and a recorded demonstration of a complete promotion from commit to production including attestation verification and a rollback drill.

## Assessment Criteria

- **Weekly Labs (40%)**: Hands-on exercises submitted as workflow files, action source code, or deployment manifests, evaluated for correctness, security posture, and adherence to the patterns taught that week.
- **Mid-Term Project (20%)**: A custom action with unit tests, integration tests, self-test workflow, and a published tagged release. Graded on SDK usage correctness, input/output design, error handling, and documentation quality.
- **Final Project (40%)**: The enterprise automation platform capstone. Evaluated on architecture quality, reusable workflow design, runner fleet security, supply chain attestation correctness, OIDC configuration, cost optimization, progressive delivery implementation, and completeness of the demonstration.

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Actions Toolkit — @actions/core and friends](https://github.com/actions/toolkit)
- [Metadata Syntax for GitHub Actions](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions)
- [Security Hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [About Security Hardening with OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Using Artifact Attestations](https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds)
- [actions-runner-controller (ARC)](https://github.com/actions/actions-runner-controller)
- [actionlint — Static Checker for Workflow Files](https://github.com/rhysd/actionlint)
- [nektos/act — Run GitHub Actions Locally](https://github.com/nektos/act)
- [Sigstore and cosign](https://www.sigstore.dev/)
- [GitHub Actions Billing Documentation](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions)
- [GitHub Changelog — Actions Updates](https://github.blog/changelog/label/actions/)

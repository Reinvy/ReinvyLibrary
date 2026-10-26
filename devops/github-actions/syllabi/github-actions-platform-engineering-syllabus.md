---
title: "GitHub Actions Platform Engineering Syllabus"
description: "A six-module course that takes experienced engineers from writing workflows to operating GitHub Actions as an internal platform, covering security, reuse, runners, observability, and governance."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# GitHub Actions Platform Engineering Syllabus

## Overview

Most teams learn GitHub Actions by copying a workflow and fixing it until the build goes green. That works until the repository count grows and the platform becomes shared infrastructure: dozens of workflows with diverging defaults, secrets scattered across repositories, runners nobody owns, and an outage that takes an afternoon to diagnose because there is no visibility into what ran or why.

This syllabus is aimed at engineers who already write working workflows and now need to run Actions as a platform for other teams. It is organized in six modules that follow the actual lifecycle of platform work: design the primitives, secure them, package them for reuse, own the compute, make the system observable, then govern it so it does not drift back into chaos.

Each module pairs one conceptual lecture with one lab, and each lab produces an artifact that feeds the final project. The course is deliberately tool-agnostic where possible: Terraform, OpenTelemetry, and OPA-style policy all appear, but always as interchangeable implementations of an idea rather than as products to memorize.

Duration is roughly six weeks at eight to ten hours per week, or three intensive weeks full-time. The expected audience already understands YAML syntax, Git branching, and at least one CI system.

## Curriculum

### Module 1: Workflow Design as an Interface

- **The workflow as a contract**
  - Triggers, inputs, and outputs as a public API for other teams
  - Event payloads, `github` context, and the difference between `pull_request` and `pull_request_target`
  - Idempotency and re-runnable workflows
- **Job topology**
  - `needs`, `if`, and the dependency graph the UI actually renders
  - Fail-fast versus collect-all-failures strategies
  - Fan-out/fan-in for monorepos and sharded test suites
- **Configuration hygiene**
  - Expressions, `env` scoping, and avoiding string-interpolated commands
  - `defaults.run.shell` and `set -euo pipefail` discipline
- **Lab**: Convert a single fat workflow into a four-job graph with explicit artifacts between stages, then prove it re-runs cleanly from the UI.

### Module 2: Security and Supply Chain

- **Permission model**
  - `permissions:` at workflow and job level, the default token, and why `write-all` is a defect
  - Fork pull requests, secrets isolation, and the `pull_request_target` trap
- **Credential handling**
  - OIDC federation to cloud providers instead of long-lived keys
  - Environment protection rules, required reviewers, and deployment gates
  - `GITHUB_TOKEN` scope versus fine-grained PATs and GitHub Apps
- **Third-party action risk**
  - Pinning to commit SHAs, verifying publishers, and reading an action's `action.yml`
  - Untrusted input handling: script injection through issue titles and branch names
- **Lab**: Migrate a static AWS key to OIDC, reduce token scope to read-only, and add a workflow that fails when a third-party action is tag-pinned.

### Module 3: Reusable Components

- **The reuse ladder**
  - Composite actions, reusable workflows, and starter workflows: when each is the right unit
  - `workflow_call` inputs, outputs, and secret inheritance
  - Versioning internal templates with tags and a changelog
- **Distribution**
  - Public versus internal repositories for shared workflows
  - `uses: org/repo/.github/workflows/x.yml@v1` and the cost of floating refs
  - Matrix-driven reusable workflows and the `strategy` at the caller
- **Migration strategy**
  - Strangler pattern: wrap the old workflow, then swap internals
  - Compatibility windows and deprecation notices
- **Lab**: Extract the Module 1 workflow into a reusable workflow with typed inputs, tag it `v1`, and call it from two repositories.

### Module 4: Runners and Compute

- **Hosted runner economics**
  - Minute multipliers, larger runners, and per-job timeouts
  - Cache and artifact storage as a separate budget line
- **Self-hosted operations**
  - Runner groups, labels, and autoscaling with Actions Runner Controller
  - Ephemeral runners, image lifecycle, and patching cadence
  - Network topology: private networking, proxies, and egress control
- **Capacity planning**
  - Queue time as the real latency metric
  - Break-even math against hosted minutes
- **Lab**: Deploy an ARC-based autoscaling runner set on Kubernetes, route a labeled job to it, and measure queue time under a synthetic burst.

### Module 5: Observability

- **What Actions does and does not tell you**
  - Run and job APIs, `GITHUB_STEP_SUMMARY`, annotations, and check runs
  - Log retention limits and why you should ship logs elsewhere
- **Metrics that matter**
  - Lead time to green, failure rate by job, flaky test rate, queue time, cost per merge
  - Exporting run data to Prometheus, Grafana, or a warehouse
- **Debugging at scale**
  - Step debug logging, `ACTIONS_STEP_DEBUG`, and re-running with SSH on self-hosted runners
  - Correlating workflow runs with deploys and incidents
- **Lab**: Build a dashboard from the runs API that reports p50/p95 duration, failure rate, and estimated minutes per merged pull request.

### Module 6: Governance and Platform Operations

- **Policy as code**
  - Organization-level required workflows and allowed actions
  - Policy checks in CI (OPA/Conftest) plus scheduled drift detection
  - Spending limits, budget alerts, and anomalous-usage detection
- **Ownership model**
  - Platform team as maintainer, product teams as consumers
  - Support rotation, runbooks, and an escalation path
  - RFC process for template changes
- **Change management**
  - Rollout waves, canary repositories, and rollback of a template version
  - Measuring adoption and deprecating the long tail
- **Lab**: Write a policy that rejects workflows without `timeout-minutes` and without pinned actions, run it across ten repositories, and produce a remediation report.

## Final Project

Build `platform-ci`, a minimal internal CI platform on top of GitHub Actions, in your own organization or a sandbox org.

Deliverables:

- A reusable workflow set (lint, test, build, deploy) versioned with tags and documented inputs.
- OIDC-based cloud authentication replacing all static credentials in scope.
- One autoscaling self-hosted runner group for a workload that genuinely needs it, with the break-even calculation that justified it.
- A metrics pipeline exporting run data to a dashboard with the five metrics from Module 5.
- A policy gate enforced organization-wide, with a report showing current compliance across at least ten repositories.
- A one-page operating model: ownership, on-call expectations, and the deprecation path for legacy workflows.

The project is graded on whether another team could adopt the platform without asking you a question.

## Assessment Criteria

| Component | Weight | What is evaluated |
| --- | --- | --- |
| Module labs (6) | 30% | Working artifacts, not screenshots; each lab must run from a clean checkout |
| Security review | 15% | Token scope, OIDC adoption, action pinning, injection handling |
| Observability dashboard | 10% | Metric definitions are defensible and queries are reproducible |
| Final project | 35% | Completeness, documentation quality, adoption readiness |
| Design defense | 10% | Ability to justify trade-offs and name what you would do differently |

A lab that only works on the author's branch counts as incomplete. Late submissions are accepted within one week at a 10% penalty; the design defense is scheduled individually and cannot be rescheduled except for documented emergencies.

## References

- GitHub Docs, "GitHub Actions documentation": <https://docs.github.com/en/actions>
- GitHub Docs, "Security hardening for GitHub Actions": <https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions>
- GitHub Docs, "Reusing workflows": <https://docs.github.com/en/actions/using-workflows/reusing-workflows>
- GitHub Docs, "Self-hosted runners": <https://docs.github.com/en/actions/hosting-your-own-runners>
- GitHub Docs, "Monitoring and troubleshooting workflows": <https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows>
- Actions Runner Controller: <https://github.com/actions/actions-runner-controller>
- OpenID Connect reference: <https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect>
- OpenSSF Scorecard, for supply-chain posture checks: <https://github.com/ossf/scorecard>
- `nektos/act`, for running workflows locally: <https://github.com/nektos/act>
- Google, *Site Reliability Engineering* (free online), for the SLI/SLO framing used in Module 5: <https://sre.google/sre-book/table-of-contents/>

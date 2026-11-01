---
title: "GitHub Actions Release Engineering Syllabus"
description: "An eight-module curriculum for engineers who already deploy with GitHub Actions and now need to own the release: immutable artifacts built once and promoted everywhere, automated versioning and changelogs, gated environments, progressive delivery with automated analysis, rehearsed rollbacks, and release metrics that hold up in a postmortem."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# GitHub Actions Release Engineering Syllabus

## Overview

Most teams do not have a deployment problem. They have a release problem. A workflow can put code on a server in ninety seconds, yet nobody can answer three basic questions: which exact artifact is running in production, what changed since the last known-good release, and how to undo it at 2am without rebuilding from a branch that has moved on.

This syllabus treats the release as the unit of engineering work rather than the deploy step at the end of a pipeline. It is written for engineers who already write working workflows in GitHub Actions and now need the machinery around them: artifact identity, versioning, change control, progressive exposure, rollback, and measurement. Everything is taught through GitHub Actions because that is where the orchestration lives, but the concepts transfer to any CI system.

The course runs in eight modules that follow the life of a release: define the model, version it, give the artifact an identity, gate its movement, expose it gradually, learn to take it back, separate shipping from exposure, then measure whether any of it is working. Each module pairs a lecture with a lab, and each lab leaves behind a component that the final project reuses. There are no throwaway exercises.

Duration is roughly eight weeks at eight to ten hours per week, or two intensive weeks full-time. Students are expected to be comfortable with workflow syntax, job dependencies, and at least one container registry or package feed before starting.

## Curriculum

### Module 1: Release Model and Pipeline Topology

- **Deploy is not release**
  - Deploy as a technical event, release as a decision to expose users to a change
  - Why conflating the two forces either slow deploys or unguarded releases
  - The four environments worth naming: build, staging, production, and the ephemeral preview
- **Build once, promote everywhere**
  - Artifact immutability as the precondition for trustworthy promotion
  - Why rebuilding per environment makes rollback a lie
  - Promotion as a pointer move between environments, not a rebuild
- **Pipeline topology**
  - Fan-out from a single build job to N deployment jobs
  - Environment-scoped jobs, `needs` chains, and rejected-versus-failed runs
  - Concurrency groups as a release lock, not a queue trick
- **Lab**: Restructure a rebuild-per-environment pipeline into a single build stage emitting one artifact, with staging and production jobs that only consume it. Record the artifact digest at every stage.

### Module 2: Versioning and Changelog Automation

- **Semantic versioning in practice**
  - Major, minor, patch as a promise about compatibility, not a marketing scheme
  - Breaking-change detection from commit metadata and from public API diffs
  - Pre-release identifiers, build metadata, and channels such as `next` and `rc`
- **Deriving versions from history**
  - Conventional commits, squash-merge messages, and PR labels as the input signal
  - `release-please`, semantic-release, and hand-rolled tagging: trade-offs and failure modes
  - Release PRs as the review surface for version bumps
- **Changelogs that survive scrutiny**
  - Grouping by user impact rather than by commit type
  - Linking entries to issues, PRs, and authors automatically
  - Why the changelog must be generated at build time, not written after the fact
- **Lab**: Add automated version derivation to a library repository so that merges to the main branch open a release PR with an updated changelog, and tags are created only when that PR merges.

### Module 3: Artifact Identity and Promotion Records

- **Identity primitives**
  - Content digests versus tags, and why mutable tags are an incident waiting for a date
  - OCI image digests, package checksums, and build outputs as verifiable objects
  - Signing and attestation with Sigstore and GitHub artifact attestations
- **Registry layout**
  - One repository per service versus per-organization namespaces
  - Retention policies, immutability settings, and garbage collection that does not delete a live release
  - Promoting by digest when the registry spans multiple accounts
- **Records of what shipped**
  - Deployment records, environment URLs, and the deployment API as an audit trail
  - Writing a release manifest: commit range, artifact digest, migration version, config revision
  - Reconciling a running service back to a workflow run when the registry is the only source of truth
- **Lab**: Publish a container to a registry with immutable tags, sign it with an attestation, and generate a release manifest that maps digest to commit range and workflow run. Then promote the same digest into a second registry by digest reference alone.

### Module 4: Deployment Gates and Change Control

- **Environment protection**
  - Required reviewers, wait timers, and deployment branch policies in GitHub environments
  - Secrets scoped to environments so production credentials cannot leak into staging runs
  - The difference between a required reviewer and a required status check, and when each is theatre
- **Change control that does not become bureaucracy**
  - Freeze windows, release calendars, and how to encode both as workflow conditions
  - Tiering changes: routine, elevated, emergency, each with its own gate
  - Policy-as-code checks that run before a gate rather than after approval
- **Failure semantics**
  - Rejected versus cancelled versus failed deployments, and what each should trigger
  - Timeouts on gated jobs so an unapproved deployment does not hold a runner hostage
  - Idempotent re-entry when approval arrives hours later
- **Lab**: Configure a production environment with required reviewers, an environment-scoped secret, and a freeze-window condition. Prove that a deployment requested during a freeze is blocked with an actionable message rather than a generic failure.

### Module 5: Progressive Delivery

- **Exposure strategies**
  - Canary, blue-green, and weighted routing: what each protects against
  - Shadow and dark launches as zero-risk alternatives to percentage rollouts
  - Choosing a strategy from the failure mode you actually fear
- **Automated analysis**
  - Defining success signals before the rollout: error rate, latency percentiles, saturation
  - Argo Rollouts and Flagger driven from Actions, with Actions as orchestrator rather than as the gate itself
  - Statistical honesty: how many requests before a canary verdict means anything
- **Rollout choreography**
  - Step weights, pauses, and promotion criteria expressed as reusable workflow inputs
  - Coordinating schema migrations with traffic shifts
  - What to do when a canary is inconclusive
- **Lab**: Ship a service behind a canary with automated analysis against error rate and p95 latency, and demonstrate both a successful promotion and an automatic abort when a fault is injected.

### Module 6: Rollback and Hotfix Engineering

- **Rollback as a rehearsed operation**
  - Rolling back by re-pointing at a previous digest versus reverting a commit and rebuilding
  - Time-to-rollback as a tracked capability, drilled on a schedule
  - When rolling forward is genuinely safer and how to decide under pressure
- **State and schema**
  - Expand-contract migrations that keep two versions runnable
  - Irreversible changes and the backup-and-restore runbook they require
  - Configuration and feature flags as part of the rollback surface
- **Emergency changes**
  - The hotfix path: branching from a tag, cherry-picking, and releasing without losing the changelog
  - Fast-track approvals with mandatory post-hoc review
  - Documenting the emergency change so the next incident does not repeat it
- **Lab**: Run a rollback drill on a service with a live migration applied. Measure time-to-restore, then cut the time in half by automating the digest re-point and the flag disable.

### Module 7: Separating Deploy from Release

- **Feature flags as the release lever**
  - Flag-based release so deploys become boring and reversible
  - Flag lifecycle: creation, rollout stages, cleanup debt, and ownership
  - Evaluating flags at the edge versus in the application
- **Release cadence models**
  - Trunk-based development with short-lived branches and a continuously green main
  - Release trains for libraries, SDKs, and mobile applications that cannot ship on demand
  - Coordinated multi-service releases without a release manager bottleneck
- **Long tail of artifacts**
  - Publishing to package feeds, app stores, and marketplace listings from Actions
  - Versioned documentation and API contract compatibility
  - Deprecation windows as part of the release, not an afterthought
- **Lab**: Take a feature that currently ships by merging and convert it into a flagged release with a staged rollout plan, then remove the flag after full exposure and prove no dead branch code remains.

### Module 8: Release Observability and Continuous Improvement

- **Metrics worth reporting**
  - Deployment frequency, lead time for changes, change failure rate, time to restore
  - Why per-repository averages hide the release paths that actually hurt
  - Instrumenting from workflow runs, deployment records, and incident tooling
- **Release readiness**
  - A scorecard: tests green, migrations dry-run, changelog generated, rollback path known, owner assigned
  - Automating the scorecard as a required check that posts to the PR
  - Post-deploy verification jobs that fail loudly within minutes of a bad release
- **Closing the loop**
  - Postmortems that link an incident to a specific digest, workflow run, and change
  - Using change failure rate to argue for investment instead of heroics
  - Quarterly review of gates: which ones caught something, which ones only added waiting
- **Lab**: Build a release dashboard from the deployments API covering the four metrics plus a readiness scorecard, then present one gate you would remove and one you would add, with the data behind both.

## Final Project

Build `release-control`, an end-to-end release system for one service in your own repository or a sandbox organization.

Deliverables:

- A build stage that produces a single immutable, signed artifact and a release manifest pinning digest, commit range, migration version, and workflow run.
- Automated version derivation with a generated changelog, opened as a release PR rather than pushed directly.
- Promotion to staging and production by digest only, behind protected environments with at least one meaningful gate.
- A canary stage with automated analysis on two defined signals, including an automatic abort.
- A rehearsed rollback drill with a measured time-to-restore and a documented runbook, plus an expand-contract migration demonstrating two-version compatibility.
- A release dashboard covering deployment frequency, lead time, change failure rate, and time to restore, fed from real deployment records.
- A one-page release policy: cadence, gate tiers, emergency path, and who owns a failed release.

The project is graded on whether an engineer who did not build it could ship and un-ship a change using only the documentation.

## Assessment Criteria

| Component | Weight | What is evaluated |
| --- | --- | --- |
| Module labs (8) | 30% | Working pipelines and artifacts, reproducible from a clean checkout |
| Artifact and promotion integrity | 15% | Immutability, signing, digest-only promotion, complete manifests |
| Rollback drill | 15% | Measured time-to-restore, schema compatibility handled, runbook usable |
| Progressive delivery lab | 10% | Signal definitions defensible, abort path proven, not just configured |
| Final project | 20% | Completeness, documentation quality, operational realism |
| Design defense | 10% | Ability to justify each gate and name one you would delete |

A pipeline that only succeeds on the author's branch counts as incomplete, and a rollback that is described but never executed counts as absent. Labs are submitted as pull requests so that the review itself demonstrates the gated workflow. Late submissions are accepted within one week at a 10% penalty; the design defense is scheduled individually and cannot be rescheduled except for documented emergencies.

## References

- GitHub Docs, "Deploying with GitHub Actions": <https://docs.github.com/en/actions/deployment>
- GitHub Docs, "Using environments for deployment": <https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment>
- GitHub Docs, "Managing deployments": <https://docs.github.com/en/rest/deployments/deployments>
- GitHub Docs, "Artifact attestations": <https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds>
- GitHub Docs, "Releasing projects on GitHub": <https://docs.github.com/en/repositories/releasing-projects-on-github>
- `release-please`: <https://github.com/googleapis/release-please>
- `semantic-release`: <https://github.com/semantic-release/semantic-release>
- Argo Rollouts, for canary and blue-green orchestration: <https://argoproj.github.io/rollouts/>
- Flagger, for progressive delivery with automated analysis: <https://flagger.app/>
- Sigstore, for signing and transparency: <https://www.sigstore.dev/>
- Martin Fowler, "Patterns for Managing Source Code Branches": <https://martinfowler.com/articles/branching-patterns.html>
- Nicole Forsgren, Jez Humble, Gene Kim, *Accelerate*, for the deployment metrics used in Module 8

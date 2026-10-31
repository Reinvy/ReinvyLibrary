---
title: "GitHub Actions CI/CD Migration Guide"
description: "A practical playbook for migrating CI/CD pipelines from Jenkins, GitLab CI, and CircleCI to GitHub Actions — concept mapping, workflow translation, OIDC credential cutover, caching and artifact parity, shadow builds, and a safe decommission path."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# GitHub Actions CI/CD Migration Guide

## Introduction

Most teams adopting GitHub Actions do not start from a blank slate — they arrive with years of working pipeline definitions in Jenkins, GitLab CI, or CircleCI. Those pipelines encode institutional knowledge: which tests gate which branch, how artifacts are promoted, which credentials a deploy needs, and which failures are tolerated. A migration that treats the old pipeline as a syntax problem to be rewritten usually loses that knowledge and ships a subtly weaker CI/CD system.

This guide treats migration as a translation and verification exercise. You will map concepts rather than copy YAML, rebuild credentials on GitHub's OIDC identity model instead of porting long-lived secrets, reproduce caching and artifact semantics deliberately, and prove parity with shadow builds before any legacy system is switched off. The target reader maintains production pipelines and needs a cutover that can be rolled back.

Three source platforms are covered because their semantic gaps differ in important ways: Jenkins offers an imperative Groovy DSL with persistent workspaces, GitLab CI offers a declarative YAML model with a first-class DAG, and CircleCI offers reusable orbs with workflow-scoped workspaces. Each maps onto GitHub Actions differently, and each hides different traps.

## Best Practices

### 1. Inventory and Rank Pipelines Before Writing Any YAML

Migrations fail when they begin with the most complicated pipeline. Start with a written inventory of every pipeline the platform runs, annotated with trigger type, runtime, job count, external integrations, and blast radius. Then rank them by risk and migrate in that order — a scheduled nightly linter job is the correct first candidate, not the production release train.

The inventory also exposes duplication. Jenkins jobs are frequently forked copies of one another, and GitLab `include` chains often resolve to nearly identical hidden jobs. Collapsing five near-duplicate pipelines into one reusable workflow is a genuine win that a one-to-one translation would forfeit.

### 2. Map Concepts, Not Syntax

Before translating a single file, write a mapping table for the source platform. Line-by-line translation produces workflows that behave like a foreign pipeline wearing GitHub YAML clothing — persistent-workspace assumptions, implicit sequencing, and hand-rolled caching conventions all leak through.

Every platform has a small set of load-bearing concepts: how work is parallelized, how state moves between jobs, how secrets are injected, and how approvals are enforced. Translate those four deliberately and the syntax largely follows.

### 3. Migrate the Reference Pipeline First

Pick one representative pipeline — ideally one with tests, a build artifact, and a deploy — and migrate it end to end with full rigor: caching, artifacts, secrets, gates, notifications. Use it as the template for the rest. Teams that migrate ten pipelines simultaneously end up with ten subtly different workflows and no shared convention to reuse.

Once the reference pipeline is green and trusted, extract its repeated blocks into reusable workflows (`workflow_call`) and composite actions so later migrations are assembly rather than authoring.

### 4. Rebuild Credentials on OIDC Instead of Porting Static Secrets

The single highest-leverage change during migration is refusing to port static cloud credentials. Jenkins credentials stores, GitLab masked CI/CD variables, and CircleCI contexts all carry long-lived keys that only exist because the platform had no better option. GitHub Actions can request a short-lived OIDC token and exchange it for cloud credentials scoped to a repository, branch, and environment.

Migrating credentials as-is bakes years of key rotation debt into the new system. Migrating them to OIDC removes the keys entirely. Treat every ported static secret as a deliberate exception with an owner and an expiry date.

### 5. Recreate Caching from Scratch — Cache Keys Are Not Portable

Cache keys from other platforms are meaningless on GitHub Actions because the cache namespace, key derivation, and eviction rules all differ. GitLab's `cache:key: $CI_COMMIT_REF_SLUG` and CircleCI's `{{ checksum "package-lock.json" }}` have no direct equivalents; the idiomatic GitHub form is `hashFiles('**/package-lock.json')` composed into a key that also encodes the OS and runtime version.

The correctness requirement is stricter than the performance requirement: a cache key that is too coarse across operating systems or Node versions produces corrupt restores that surface as inexplicable build failures. Always include `runner.os` and the toolchain version in the key, and let `restore-keys` handle graceful fallback.

### 6. Make Parallelism Explicit with `needs` and Matrix

GitLab's `stages` and `needs`, Jenkins' `parallel` blocks, and CircleCI's `requires` all express ordering, but GitHub Actions expects you to declare it with `needs` and to express fan-out with `strategy.matrix`. Do not encode ordering implicitly through job name prefixes — implicit sequencing is invisible in the graph view and breaks the moment a job is renamed.

Matrix jobs are also the correct replacement for CircleCI's `parallelism` with `circleci tests split`: shard the test suite by index so each matrix leg runs a deterministic slice, and aggregate the results in a downstream job.

### 7. Reproduce Quality Gates and Approvals with Environments

Jenkins `input` steps, GitLab `when: manual` jobs, and CircleCI approval jobs all implement the same idea: a human gate before a protected action. In GitHub Actions this is a protected Environment with required reviewers, combined with `workflow_dispatch` for intentional starts.

Environments are strictly better for one reason — secrets are released to a job only after the gate is approved. Migration is the right moment to move deploy secrets out of repository scope and into environment scope, which limits a compromised workflow to a single environment instead of the entire organization.

### 8. Run Shadow Builds Before Cutover

A migrated pipeline that has never been compared against the original is an unverified pipeline. Run both systems on the same commits for a period — the legacy pipeline as the source of truth, the GitHub Actions workflow as an observer — and diff their outcomes: test counts, artifact checksums, duration, and exit codes.

Shadow mode is cheap because it does not block anything, and it catches the failure mode that code review cannot: semantic gaps like a different shell error-handling default, a missing environment variable, or a test that silently skips when a service container is absent.

### 9. Keep the Legacy System Until Rollback Is Proven

Decommission the old system only after a defined observation window with the new pipeline as the gate of record. Keep the legacy configuration in version control (or an archived branch) rather than deleting it, and document the exact rollback procedure — which required status checks to restore, which webhook to re-enable, and who can execute the rollback.

Deleting the Jenkins controller or revoking the GitLab project on cutover day removes your only fallback if a release train fails at 02:00.

### 10. Measure the Migration with DORA Metrics

Capture four numbers before migration and after: deployment frequency, lead time for changes, change failure rate, and time to restore service. Without a before-and-after baseline, "the migration went fine" is an opinion rather than a finding.

The metrics also justify the follow-up work. Migrations commonly improve lead time immediately (faster runners, better caching) while change failure rate only improves after gates and test parity are fully reproduced — knowing which is which tells you where to keep investing.

## Implementation Steps

### Step 1: Inventory and Classify Pipelines

Export the current pipeline definitions and classify each one. For Jenkins, list every job from the controller API and note which are freestyle versus pipeline. For GitLab, parse `.gitlab-ci.yml` and its `include` graph. For CircleCI, enumerate jobs and workflows in `.circleci/config.yml`.

```bash
# Jenkins: list jobs and their types
curl -s "https://jenkins.example.com/api/json?tree=jobs[name,url,_class]" \
  --user "$JENKINS_USER:$JENKINS_TOKEN" > /tmp/jenkins-jobs.json
jq -r '.jobs[] | "\(.name)\t\(._class)"' /tmp/jenkins-jobs.json | sort

# GitLab: resolve the include graph for a project pipeline
curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/repository/files/.gitlab-ci.yml/raw?ref=main" \
  > /tmp/gitlab-ci.yml
grep -n "include:\|extends:\|stage:" /tmp/gitlab-ci.yml

# CircleCI: list workflow names and their jobs
curl -s --header "Circle-Token: $CIRCLECI_TOKEN" \
  "https://circleci.com/api/v2/config/validate" > /dev/null
python3 -c "
import yaml, sys
cfg = yaml.safe_load(open('.circleci/config.yml'))
for wf, node in cfg.get('workflows', {}).items():
    jobs = [k for k in node.get('jobs', []) if k != 'version']
    print(wf, '->', ', '.join(jobs))
" > /tmp/circleci-workflows.txt
cat /tmp/circleci-workflows.txt
```

1. Record for each pipeline: trigger (push, schedule, manual, tag), approximate duration, job count, external services, and whether it deploys to production.
2. Mark the pipeline with the smallest blast radius and a non-empty test stage as the reference migration.
3. Note every credential the pipeline uses and whether the consuming cloud supports OIDC federation.

### Step 2: Build a Concept Mapping Table

Write the mapping table for your source platform into the migration branch as a document the team can review. The table below is the Jenkins baseline; the GitLab and CircleCI tables follow the same shape.

```text
| Jenkins concept                | GitHub Actions equivalent                     |
|--------------------------------|-----------------------------------------------|
| Jenkinsfile (declarative)      | .github/workflows/<name>.yml                  |
| stage('Build')                 | a job in jobs.<id>                            |
| steps { sh '...' }             | steps: with a run: entry                      |
| agent { label 'linux' }        | runs-on: [self-hosted, linux]                 |
| environment { FOO = 'bar' }    | env: at workflow, job, or step level          |
| when { branch 'main' }         | if: github.ref == 'refs/heads/main'           |
| parallel { stage('A') ... }    | strategy.matrix or sibling jobs with needs    |
| post { always { ... } }        | a step with if: always()                      |
| post { failure { ... } }       | a step with if: failure()                     |
| withCredentials(...)           | secrets plus OIDC token exchange              |
| archiveArtifacts               | actions/upload-artifact                       |
| stash / unstash                | upload-artifact then download-artifact        |
| input message: 'Deploy?'       | Environment with required reviewers           |
| build cause / upstream job     | workflow_run or repository_dispatch trigger   |
| Jenkins cron schedule          | on.schedule with UTC cron syntax              |
```

1. For GitLab, the load-bearing rows are `stages` and `needs` (to `needs`), `cache:key` (to `actions/cache` with `hashFiles`), `extends` (to reusable workflows), `services:` (to `services:`), and `environment:` (to Environments).
2. For CircleCI, the load-bearing rows are `orbs` (to composite actions or reusable workflows), `persist_to_workspace` and `attach_workspace` (to upload-artifact and download-artifact), `parallelism` (to `strategy.matrix`), and `contexts` (to Environments).
3. Review each row with someone who owns the existing pipeline — the disagreements you surface here are exactly the semantic gaps that shadow builds would otherwise discover later.

### Step 3: Translate the Reference Pipeline

Translate the reference pipeline as an explicit job graph. The example below converts a Jenkins pipeline that lints, tests, builds a container, and deploys to production behind a manual gate.

```groovy
// Jenkinsfile (before)
pipeline {
  agent { label 'linux' }
  environment { REGISTRY = 'ghcr.io/acme' }
  stages {
    stage('Verify') {
      when { branch 'main' }
      steps {
        sh 'npm ci'
        sh 'npm run lint'
        sh 'npm test -- --ci'
      }
    }
    stage('Build') {
      steps {
        sh 'docker build -t $REGISTRY/api:$GIT_COMMIT .'
        archiveArtifacts artifacts: 'dist/**', fingerprint: true
      }
    }
    stage('Deploy') {
      input { message 'Deploy to production?' }
      steps {
        withCredentials([string(credentialsId: 'prod-key', variable: 'PROD_KEY')]) {
          sh 'scripts/deploy.sh'
        }
      }
    }
  }
  post {
    failure { sh 'scripts/notify.sh failed' }
  }
}
```

```yaml
# .github/workflows/reference-pipeline.yml (after)
name: Reference Pipeline

on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write
  packages: write

env:
  REGISTRY: ghcr.io/acme

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --ci

  build:
    needs: verify
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.meta.outputs.image }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - id: meta
        run: echo "image=$REGISTRY/api:${GITHUB_SHA}" >> "$GITHUB_OUTPUT"
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ${{ steps.meta.outputs.image }}
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 14

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.example.com
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/gha-prod-deploy
          aws-region: ap-southeast-1
      - run: scripts/deploy.sh "${{ needs.build.outputs.image }}"

  notify:
    needs: [verify, build, deploy]
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - run: scripts/notify.sh failed
```

1. Note that the Jenkins `when { branch 'main' }` guard on a single stage became a workflow-level `on.push.branches` filter — pushing stage-level conditions down to triggers is usually the cleaner translation.
2. Note that the Jenkins `input` gate became an Environment with required reviewers, which also moves the deploy credential out of repository scope.
3. Note that `post { failure { ... } }` became a job with `needs: [verify, build, deploy]` and `if: failure()` — GitHub Actions has no implicit always-run step, so failure notification must be its own job.

### Step 4: Migrate Credentials to OIDC and Environments

Convert each ported credential to either an OIDC trust relationship or a scoped GitHub secret. Start with the cloud providers, because OIDC removes the rotation burden entirely.

```yaml
# Reusable OIDC exchange pattern, parameterized per environment
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          role-session-name: gha-${{ github.run_id }}
          aws-region: ${{ vars.AWS_REGION }}
```

1. Create one cloud role per environment rather than one role per repository, and scope its trust policy to the repository, branch, and environment claims.
2. Replace `secrets.*` with `vars.*` for non-sensitive configuration such as role ARNs and regions; variables are readable in logs and make misconfiguration obvious.
3. For the credentials that cannot use OIDC, store them as environment secrets rather than repository secrets so the approval gate controls their release.
4. Rotate every migrated static secret once at cutover, so the value that existed in the old platform is dead by the time the old platform is decommissioned.

### Step 5: Port Caching, Artifacts, and Docker Layers

Rebuild caching deliberately, with keys that include everything that invalidates the cached content.

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: npm-${{ runner.os }}-node${{ matrix.node }}-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            npm-${{ runner.os }}-node${{ matrix.node }}-
      - run: npm ci
      - run: npm test -- --ci --shard=${{ strategy.job-index + 1 }}
```

1. Include `runner.os` and the runtime version in every cache key — omitting either produces cross-platform restores that fail in ways that look like flaky tests.
2. Use `restore-keys` for graceful degradation instead of a single exact key, which is the closest equivalent to CircleCI's fallback key list.
3. Replace `stash` and `unstash` with `upload-artifact` and `download-artifact`; remember that artifacts are workflow-scoped by default and need `needs` to guarantee availability.
4. Preserve Docker layer caching with `docker/build-push-action` and a `cache-from` and `cache-to` pair pointing at the registry, which is the portable replacement for Jenkins' shared Docker daemon.

### Step 6: Reproduce Gates, Approvals, and Notifications

Rebuild the human-facing control surface before cutover, because it is the part reviewers and operators interact with daily.

```yaml
on:
  workflow_dispatch:
    inputs:
      release_tag:
        description: "Tag to release"
        required: true

jobs:
  release:
    runs-on: ubuntu-latest
    environment:
      name: release
      url: https://github.com/${{ github.repository }}/releases
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.release_tag }}
      - run: scripts/release.sh "${{ inputs.release_tag }}"
```

1. Configure required reviewers on each protected Environment and restrict which branches may deploy to it, replacing Jenkins `input`, GitLab `when: manual`, and CircleCI approval jobs.
2. Add `concurrency` groups keyed on environment and ref so a second run cancels or queues rather than racing the first — this replaces GitLab `resource_group` and CircleCI `auto-cancel`.
3. Convert platform notifications to GitHub-native review surfaces plus an explicit webhook step, and verify that a failed run still posts exactly one notification.
4. Recreate scheduled pipelines with `on.schedule` using UTC cron expressions, and confirm the timezone shift against the legacy schedule before decommissioning it.

### Step 7: Run Shadow Builds and Compare Results

Run the migrated workflow on every commit alongside the legacy pipeline, with the new workflow as an observer that does not deploy.

```bash
# Compare outcomes for the same commit across both systems
LEGACY_RESULT=$(curl -s --user "$JENKINS_USER:$JENKINS_TOKEN" \
  "https://jenkins.example.com/job/api-ci/lastBuild/api/json?tree=result,duration" \
  | jq -r '"\(.result) \(.duration)"')

GHA_RESULT=$(gh run list --workflow=reference-pipeline.yml --limit 1 \
  --json conclusion,createdAt,databaseId \
  | jq -r '.[0] | "\(.conclusion) \(.databaseId)"')

echo "legacy: $LEGACY_RESULT"
echo "github-actions: $GHA_RESULT"
```

1. Compare test totals rather than pass or fail alone — a migrated pipeline that runs 812 tests where the legacy pipeline ran 840 has silently dropped a suite.
2. Compare artifact checksums for reproducible builds, and treat any difference as a real finding rather than noise.
3. Set the default shell deliberately. GitHub Actions runs `bash -e` without `pipefail`, while CircleCI and many GitLab runners default to `set -eo pipefail`; if any script depends on pipes failing loudly, set `defaults.run.shell: bash -eo pipefail {0}`.
4. Track duration for two weeks and confirm the new pipeline is not slower before it becomes the gate of record.

### Step 8: Cut Over, Decommission, and Clean Up

Cutover is a configuration change, not a code change. Make it explicitly and reversibly.

1. Register the new workflow as a required status check in branch protection, then remove the legacy check — in that order, so a commit is never unguarded.
2. Disable the legacy pipeline's deploy trigger while leaving its read-only build running for one more release cycle.
3. Revoke the migrated credentials on the legacy platform and rotate any secret that could not move to OIDC.
4. Archive the legacy pipeline definition into a dated branch, tag it, and link it from the migration document so a rollback is a checkout rather than an archaeology project.
5. After two clean release cycles, decommission the legacy controller or project and remove its webhooks.

## Next Steps

- Extract the reference pipeline's repeated blocks into `workflow_call` reusable workflows and composite actions so the remaining migrations are assembly work.
- Apply the same migration method to the scheduled and operational pipelines, which are lower risk but easy to forget until a nightly job silently stops running.
- Strengthen the new pipeline with the patterns in the CI/CD best practices and workflow testing guides — reusable workflow versioning, matrix strategy design, and telemetry.
- Re-measure the DORA metrics a month after decommissioning to confirm the migration improved delivery rather than merely relocating it.

## Conclusion

Migrating to GitHub Actions is a translation problem with a verification requirement, not a YAML rewrite. The teams that succeed inventory their pipelines first, build the concept mapping up front, translate one reference pipeline end to end, and then prove parity with shadow builds before the legacy system loses a single capability.

The decisions that matter most are the ones the syntax does not force you to make: refusing to port long-lived credentials in favor of OIDC, rebuilding cache keys from the invalidation rules rather than the old key strings, moving deploy secrets into gated Environments, and keeping a tested rollback path until the observation window closes. Handle those deliberately and the workflows themselves become almost mechanical.

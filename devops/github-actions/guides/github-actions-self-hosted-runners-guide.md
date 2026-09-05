---
title: "GitHub Actions Self-Hosted Runners Guide"
description: "A comprehensive guide to running GitHub Actions self-hosted runners in production — fleet sizing, installation, registration, labels and runner groups, ephemeral runners, auto-scaling with actions-runner-controller, security hardening, monitoring, and troubleshooting."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# GitHub Actions Self-Hosted Runners Guide

## Introduction

GitHub-hosted runners are the default execution environment for GitHub Actions: they are maintained, patched, and scaled by GitHub, and they start in seconds. For many teams they are the right choice for the entire CI/CD workload. But as pipelines grow — heavier builds, GPU jobs, private network access, compliance requirements, or simply a large enough monthly runner-minute bill — the default environment starts to feel like a constraint.

Self-hosted runners put the execution environment under your control. You choose the operating system, the architecture, the hardware, and the network location. You install and register the runner application (`actions-runner`) on your own machine, container, or Kubernetes cluster, and GitHub dispatches workflow jobs to it exactly as it would to a hosted runner. The trade-off is operational ownership: you are now responsible for availability, security, scaling, and updates.

This guide is a production-oriented deep dive into self-hosted runners. It covers the decision framework for when self-hosted runners make sense, the architecture of a runner fleet (labels, runner groups, ephemeral runners), a complete installation and registration walkthrough on Linux, containerized ephemeral runners, auto-scaling with `actions-runner-controller` (ARC) on Kubernetes, security hardening, and the monitoring and troubleshooting practices that keep a fleet healthy. By the end you will be able to design, deploy, and operate a self-hosted runner fleet that is secure, elastic, and observable.

## Best Practices

### 1. Adopt Self-Hosted Runners Only Where They Beat Hosted Runners

Self-hosted runners are not intrinsically better — they are better in specific situations. Apply the following decision framework before investing in a fleet:

| Situation | Recommended environment | Why |
|-----------|------------------------|-----|
| Standard Linux/macOS CI on x64 | GitHub-hosted | Zero maintenance, seconds to start, no security surface |
| Heavy builds (large C/C++, monorepo bundles) | Self-hosted with big VMs | Better cost-per-minute on dedicated hardware, warm caches on disk |
| GPU jobs (ML training, model eval) | Self-hosted with GPU | GitHub-hosted runners have no GPU class |
| Non-x64 architectures (arm64, s390x) | Self-hosted | No hosted arm64 or s390x equivalent for Actions |
| Jobs that must reach private subnets | Self-hosted inside the VPC | Avoids NAT/proxy gymnastics and egress charges |
| Data-residency or compliance constraints | Self-hosted in-region | Data stays on infrastructure you control |
| Small, infrequent open-source CI | GitHub-hosted | Free for public repos; self-hosted adds only overhead |

The recurring theme: choose self-hosted when you need hardware, network, architecture, or compliance properties that hosted runners cannot provide — not merely to save a few minutes of queue time.

### 2. Design the Fleet with Labels and Runner Groups

Two mechanisms control which runner executes which job:

- **Labels** route jobs to specific capabilities. A runner can have multiple labels (`self-hosted`, `linux`, `arm64`, `gpu`). The `runs-on` key in a workflow picks the runner by label intersection:
  ```yaml
  jobs:
    build-arm:
      runs-on: [self-hosted, linux, arm64]
    train:
      runs-on: [self-hosted, gpu]
  ```
  Label semantics are AND-based: the job runs on any runner that carries all listed labels.

- **Runner groups** are the governance boundary. Define groups at the organization level (or repository level for a single repo), then restrict which repositories may use them:
  ```text
  org > Settings > Actions > Runner groups
  - group: linux-prod  (repos: platform/*, data/*)   -> runners: linux-prod-*
  - group: gpu-dev     (repos: ml/*)                 -> runners: gpu-dev-*
  ```
  Runner groups prevent unrelated repositories from consuming capacity and give you a place to enforce access policy for sensitive hardware.

Best practice: never rely on a single default group. Create purpose-specific groups with explicit repository scoping, and give every runner labels that describe its true capabilities — a runner labeled `ubuntu-latest` that is not actually the canonical Ubuntu image will silently produce environment-dependent builds.

### 3. Treat Every Job as Potentially Malicious

Self-hosted runners frequently execute third-party code: pull request workflows from forks, actions from the marketplace, `npm install` scripts, and build toolchains. Assume any of these can run arbitrary commands on the runner. The corresponding practices:

- Use **ephemeral runners** for anything that executes untrusted code (see practice 4).
- Give `GITHUB_TOKEN` the least privilege needed per job and scope it with `permissions:`.
- Never store long-lived credentials on a persistent runner. Use OIDC federation or short-lived tokens fetched from a secrets manager inside the job.
- Put runners that build untrusted pull requests in a completely separate network segment from runners that deploy to production.
- Disable or gate `workflow_dispatch` inputs that flow into shell commands — script injection via `${{ github.event.inputs.foo }}` is a classic self-hosted attack vector.

### 4. Prefer Ephemeral Runners over Persistent Ones

A persistent runner accumulates state: leftover files, environment drift, cached credentials in shell history, and untracked processes. An **ephemeral runner** registers for exactly one job, executes it, then deregisters and disappears. GitHub's own `actions/runner` images in containers are ephemeral by design.

Deployment options, from least to most isolation:

1. **Persistent VM runner** — simplest, worst isolation. Acceptable only when the runner executes trusted, in-repo code exclusively.
2. **VM snapshot per job** — restore the VM to a clean snapshot before each job. Good isolation, moderate overhead.
3. **Containerized ephemeral runner** — one container per job (practice 5). The standard for running untrusted code.
4. **Kubernetes ephemeral runner** — per-job Pods with `actions-runner-controller` (practice 6). Best elasticity and isolation at scale.

If you must run a persistent runner, at minimum run every untrusted job on a separate ephemeral machine and keep deploy jobs on dedicated persistent runners with locked-down access.

### 5. Scale Horizontally, Not Vertically

Runner-minute billing does not apply to self-hosted runners, but queue latency does: a job waits for a free runner. The correct scaling primitive is the **number of runner instances**, not the size of each one.

- Monitor queue depth (`actions/runner` exposes job queue state; ARC exposes `horizontal_runner_autoscaler` metrics) — see practice 7.
- Scale runners by demand: minimum for steady load, maximum for bursts (e.g., release day), with hysteresis to avoid flapping.
- Keep a small idle buffer (one or two runners) so interactive `workflow_dispatch` runs do not wait minutes.
- For Kubernetes fleets, use `RunnerDeployment` with a `HorizontalRunnerAutoscaler` and scale on queue length rather than CPU — a runner waiting on a job consumes no meaningful CPU, but a queue that grows means jobs are blocked.

### 6. Locate Runners Close to the Resources They Access

Every deployment step costs network round-trips. Put the runner fleet in the same region and, ideally, the same VPC as the artifacts it builds and the services it deploys.

- Run the fleet in the same cloud region as your build cache (S3/GCS buckets, container registries). Cache hits that take 2 ms in-region can take 200 ms or more cross-region.
- Route Actions webhooks and job polling through the runner's outbound internet (the runner polls GitHub, not the reverse). If the network is locked down, allow outbound HTTPS to `api.github.com` and `*.actions.githubusercontent.com`, and whitelist the GitHub meta IP ranges.
- Use private networking for deployment targets: a runner inside the VPC can reach `10.x` addresses directly, while a hosted runner would need a VPN, a bastion, or `tailscale`/`wireguard` sidecars.
- For multi-region fleets, use one runner group per region and let teams target a region with a label (`runs-on: [self-hosted, eu-central-1]`).

### 7. Instrument Runner Health and Queue Metrics

A runner that silently dies leaves jobs queued forever. Instrument both sides of the fleet:

- **Runner liveness**: each `actions-runner` process writes a `.runner` file and updates a `last_contact` timestamp visible in the GitHub UI (Settings > Actions > Runner groups). Alert if a runner's last contact exceeds a threshold. For container runners, health check the container itself.
- **Job queue**: for ARC, track `github_runner_registration_count` and the `horizontalrunnerautoscaler` queue metrics; dashboards in Grafana with alerts on queue growth.
- **Failure rate**: track job success/failure by runner label so a failing host (e.g., disk full) is visible as a pattern, not a mystery.
- **Garbage collection**: ephemeral fleets leak containers and volumes if jobs are interrupted. Add a periodic cleanup job that removes containers and networks older than the maximum job duration.

### 8. Automate Runner Updates and Security Patches

The `actions-runner` application is updated regularly, and the OS underneath needs patching too. Automate both:

- Subscribe to new `actions/runner` releases and roll updates through the fleet on a cadence (weekly is typical). GitHub flags outdated runners in the Actions settings UI; treat that list as a work queue.
- For VM runners, use the OS package manager automation (`unattended-upgrades` for security patches) and rebuild the base image on a schedule.
- For container runners, rebuild the image weekly from the latest base image (`ubuntu:24.04`, patched) plus the latest runner binary, and roll Pods.
- Pin the runner version in your configuration (e.g., an environment variable or image tag) so you can roll back a broken update fleet-wide instead of debugging each host.

## Implementation Steps

### Step 1: Size and Plan the Runner Fleet

Start with the workload, not the hardware. Collect three numbers from your current CI:

```bash
# From GitHub usage reports or workflow logs
# 1. Peak concurrency: max jobs running simultaneously (e.g., 12)
# 2. Average job duration: e.g., 9 minutes/build job
# 3. Special needs: GPU jobs, arm64 jobs, private-network jobs
echo "Weekly build jobs:    $(gh api repos/your-org/your-repo/actions/workflows --paginate | jq '[.workflows[].id] | length')"
```

For x64 builds, a pragmatic rule of thumb is **2 vCPU and 8 GB RAM per concurrent build job**, with an extra 50% headroom for peak bursts. Record the planned fleet in a table before buying anything:

```text
| Group        | Purpose                | OS/Arch     | Count | Ephemeral? |
|--------------|------------------------|-------------|-------|------------|
| linux-prod   | Deploy pipelines       | ubuntu-24.04 x64 | 2 | no         |
| build-arms   | Compile web app        | ubuntu-24.04 x64 | 6 | yes        |
| build-arm64  | Cross-compile arm64    | ubuntu-24.04 arm64 | 2 | yes        |
| gpu-dev      | ML training jobs       | ubuntu-22.04 + GPU | 1 | no         |
```

Plan the network placement now (in-region, in-VPC) so Step 6 does not require re-architecting later.

### Step 2: Install the Runner on Linux with systemd

Download and unpack the runner binary. Every runner needs its own directory; never share one directory across runners:

```bash
# Create a dedicated user and directories
sudo adduser --system --group runner
sudo mkdir -p /srv/actions-runner && sudo chown runner:runner /srv/actions-runner
sudo -u runner bash -c 'cd /srv/actions-runner && \
  curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.319.1/actions-runner-linux-x64-2.319.1.tar.gz && \
  tar xzf actions-runner.tar.gz'
```

Install dependencies for the common toolchain and configure the runner as a systemd service:

```bash
# Dependencies (adjust to your workloads)
sudo -u runner bash -c 'cd /srv/actions-runner && ./bin/installdependencies.sh'
sudo -u runner bash -c 'cd /srv/actions-runner && \
  sudo ./svc.sh install runner && sudo ./svc.sh start'
```

The `svc.sh` script generates a systemd unit that starts the runner on boot and restarts it on failure. Verify the service:

```bash
sudo systemctl status actions.runner.your-org.your-runner
```

### Step 3: Register the Runner Using a Registration Token

A runner is registered with a short-lived registration token tied to a scope (repository, organization, or enterprise). Organization-level tokens are preferred for fleets:

```bash
# Obtain a registration token (admin permission on the org)
REG_TOKEN=$(curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/orgs/your-org/actions/runners/registration-token \
  | jq -r .token)

# Register the runner
cd /srv/actions-runner
sudo -u runner ./config.sh \
  --url https://github.com/your-org \
  --token "${REG_TOKEN}" \
  --name "linux-prod-01" \
  --labels self-hosted,linux,x64 \
  --group linux-prod \
  --work _work \
  --replace
```

Key flags:

- `--labels` — capabilities used by `runs-on`. Always include `self-hosted` plus `linux`/`windows`/`macos` and architecture/hardware labels.
- `--group` — the runner group for governance (practice 2).
- `--replace` — replace an existing runner with the same name, useful in automation.
- `--work` — the work directory; give it disk space proportional to your build outputs.

For ephemeral registration (one job then deregister), pass `--ephemeral` during registration, or rely on the container/Kubernetes setup in Steps 5 and 6, which handles this automatically.

### Step 4: Configure Labels and Runner Groups

Create the runner groups first, then assign runners and repositories:

```bash
# Create a runner group with API (or in the UI: Settings > Actions > Runner groups)
curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/orgs/your-org/actions/runner-groups \
  -d '{"name": "linux-prod", "visibility": "selected", "selected_repository_ids": [123456, 789012]}'
```

Update an existing runner's labels and group membership:

```bash
# Move a runner to a group
curl -s -X PATCH \
  -H "Authorization: Bearer ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/orgs/your-org/actions/runner-groups/1/runners
# Add labels to a runner
curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/your-org/your-repo/actions/runners/5/labels \
  -d '{"labels": ["gpu"]}'
```

Now workflows can target the fleet precisely:

```yaml
jobs:
  deploy:
    runs-on: [self-hosted, linux-prod]
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
```

Labels are AND-based, so `[self-hosted, linux-prod]` matches runners in the `linux-prod` group carrying the `self-hosted` label. Keep labels small, stable, and documented in the repository's `CONTRIBUTING` so teams use the same vocabulary.

### Step 5: Run Containerized Ephemeral Runners

The cleanest ephemeral setup for trusted pools is the official `actions/runner` Docker image with a small wrapper that registers per job. Create the runner container:

```bash
# Register an ephemeral container runner (one job per container)
docker run -d \
  --name "runner-$(echo $RANDOM)" \
  -e RUNNER_NAME="ephem-$(date +%s)" \
  -e RUNNER_SCOPE=org \
  -e ORG_NAME=your-org \
  -e ACCESS_TOKEN="${GITHUB_PAT}" \
  -e RUNNER_LABELS="self-hosted,linux,x64,ephemeral" \
  -e RUNNER_GROUP=linux-prod \
  -e RUNNER_WORKDIR=/tmp/runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  docker.io/myoung34/github-runner:latest
```

Each container registers, runs one job, then deregisters and exits. The job gets a completely fresh filesystem, and no state survives between jobs.

Wire the wrapper into CI so the fleet is self-provisioning — a workflow that requests a label like `ephemeral` triggers the pool manager to spin containers on demand. For production scale, replace this hand-rolled pool with Kubernetes and ARC (Step 6).

### Step 6: Auto-Scale with actions-runner-controller on Kubernetes

`actions-runner-controller` (ARC) runs self-hosted runners as Kubernetes Pods and scales them on queue length. Install ARC with Helm:

```bash
helm repo add actions-runner-controller https://actions-runner-controller.github.io/actions-runner-controller
helm upgrade --install arc actions-runner-controller/actions-runner-controller \
  --namespace arc-system \
  --create-namespace \
  --set githubConfigSecret=gha-runner-scale-set-controller \
  --set metrics.enabled=true
```

Create the scale set secret and a `RunnerDeployment`:

```bash
kubectl create secret generic gh-arc-secret \
  --namespace arc-system \
  --from-literal=github_app_id="${GITHUB_APP_ID}" \
  --from-literal=github_app_installation_id="${GITHUB_APP_INSTALLATION_ID}" \
  --from-literal=github_app_private_key="$(cat github-app.pem)"
```

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: linux-build-runners
spec:
  replicas: 2
  template:
    spec:
      repository: your-org/your-repo
      labels:
        - self-hosted
        - linux
        - x64
        - linux-build
      group: linux-prod
      resources:
        limits:
          cpu: "2"
          memory: 8Gi
```

Tie scaling to queue depth with a `HorizontalRunnerAutoscaler`:

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: HorizontalRunnerAutoscaler
metadata:
  name: linux-build-autoscaler
spec:
  scaleTargetRef:
    name: linux-build-runners
  minReplicas: 2
  maxReplicas: 12
  metrics:
    - type: TotalNumberOfQueuedAndInFlightWorkflowRuns
      repositoryNames:
        - your-repo
```

ARC watches the GitHub API for queued workflow runs and scales replicas up and down accordingly. Each new Pod registers an ephemeral runner, executes one or more jobs, and is removed. This is the production-grade pattern: elastic, isolated, and observable (prometheus metrics via `metrics.enabled=true`).

### Step 7: Monitor, Update, and Troubleshoot

**Monitor the fleet.** Export the key signals and alert on them:

```text
| Signal                     | Source                                 | Alert when                     |
|----------------------------|----------------------------------------|--------------------------------|
| Runner last contact        | GitHub Actions UI / API                | > 10 min since contact         |
| Queue depth                | ARC metrics / API queue endpoint       | > 30 sec for interactive runs  |
| Job failure by label       | Workflow run stats                     | Failure rate > 5% for a label  |
| Container churn / leaks    | `docker ps -a` / k8s Pod count         | Leaked containers accumulate   |
| Runner version drift       | Actions settings UI / inventory script | Any runner 2+ versions behind  |
```

For ARC, scrape the controller metrics with Prometheus and build a small dashboard with `github_runner_registration_count`, `horizontalrunnerautoscaler_sync_total`, and queue gauges.

**Update the fleet.**

```bash
# A rolling update for container runners: rebuild the image with the new runner version
# and let the pool manager replace old containers
docker build -t registry.example.com/github-runner:v2.320.0 .
docker push registry.example.com/github-runner:v2.320.0
# For ARC, patch the RunnerDeployment image and roll
kubectl set image deployment/linux-build-runners runner=registry.example.com/github-runner:v2.320.0
```

**Troubleshoot common failures:**

- **Runner shows offline** — check the service (`systemctl status`), the network path to `api.github.com`, and the runner log at `/srv/actions-runner/_diag/`. A runner stuck in "processing" often means a hung job; restart the service and inspect the job's steps.
- **Job stays queued** — verify label intersection: the `runs-on` labels must be a subset of a registered runner's labels. `gh api repos/your-org/your-repo/actions/runners` lists labels for diagnosis.
- **Secrets missing in job** — self-hosted runners do not decrypt environment secrets unless the environment protection rules pass and the runner group has access. Confirm the runner group is selected in the environment's "Selected runner groups".
- **Container runner not starting** — check that the container can reach the GitHub API (egress firewall), the registration token is valid, and the workdir volume has space. ARC Pods in `CrashLoopBackOff` usually mean a bad `github_app_private_key` or wrong installation ID.
- **Slow builds on a fast machine** — check the runner's `_work` disk (disk full is the classic silent killer), and confirm the build cache is on local disk (`actions/cache` with `cache-to:` pointing to a local volume) rather than a remote network service.

Run this diagnostic script to sanity-check a fleet quickly:

```bash
for r in $(gh api repos/your-org/your-repo/actions/runners --jq '.runners[].name'); do
  status=$(gh api repos/your-org/your-repo/actions/runners --jq --arg n "$r" '.runners[] | select(.name==$n) | .status')
  echo "$r -> $status"
done
```

A healthy fleet answers three questions at any moment: every runner is registered and in contact, queue depth is near zero during steady state, and no runner is more than a version or two behind the latest `actions/runner` release.

## Next Steps

Now that the fleet is running, extend it in three directions:

1. **Harden further** — implement OIDC federation for cloud deployments, move all long-lived credentials out of runner environments, and add a separate, isolated pool for untrusted pull-request builds.
2. **Deepen observability** — export per-runner metrics to a central dashboard, add alerting for queue growth, and document runbooks for the top failure modes in your team wiki.
3. **Scale patterns** — migrate the fleet to ARC on Kubernetes for elasticity, or add regional runner groups if teams deploy across multiple clouds.

## Conclusion

Self-hosted runners are a powerful extension of GitHub Actions, but they trade a managed service for operational ownership. The practices in this guide — a strict decision framework for when to self-host, labels and runner groups for routing and governance, ephemeral runners for isolation, ARC for elasticity, and systematic monitoring — turn that ownership from a burden into a competitive advantage. Start small with one purpose-built group, prove the security and reliability model, and grow the fleet only when the workload genuinely demands runner-level control.

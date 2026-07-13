---
title: "GitOps with ArgoCD on Kubernetes"
description: "A practical tutorial on implementing GitOps workflows with ArgoCD on Kubernetes — covering installation, application deployment, sync strategies, secret management, multi-environment deployments with ApplicationSets, and operational troubleshooting."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# GitOps with ArgoCD on Kubernetes

## Summary

This tutorial introduces GitOps as an operational framework for Kubernetes and walks through implementing it with ArgoCD. You will install ArgoCD on a Kubernetes cluster, define applications declaratively in Git, configure sync policies for automated delivery, manage secrets securely, handle multi-environment deployments with ApplicationSets, and learn troubleshooting patterns for day-to-day operations.

## Target Audience

- DevOps Engineers, Platform Engineers, Site Reliability Engineers (SREs), and Kubernetes practitioners.
- Expected developer level: Advanced (comfortable with kubectl, YAML manifests, and basic Kubernetes resource types).

## Prerequisites

- A Kubernetes cluster (local: Kind or Minikube with 4+ GB RAM, or remote: any K8s distribution).
- kubectl installed and configured with cluster admin access.
- A GitHub (or GitLab/Bitbucket) account with a personal repository for storing manifests.
- Basic familiarity with Kubernetes Deployments, Services, Namespaces, and ConfigMaps.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain the four GitOps principles and how ArgoCD implements them.
- Install and configure ArgoCD on a Kubernetes cluster.
- Define ArgoCD Application resources that sync from a Git repository.
- Implement automatic, manual, and self-heal sync policies.
- Manage Kubernetes secrets in a GitOps workflow using Sealed Secrets.
- Deploy applications across multiple environments with ApplicationSets.
- Diagnose and resolve common sync failures and drift issues.

## Context and Motivation

Push-based deployments (applying manifests with kubectl, Helm, or CI/CD pipelines) have a fundamental weakness: the cluster state can drift from the committed configuration when someone runs ad-hoc commands, applies hotfixes, or uses different tools across environments. GitOps addresses this by making a Git repository the single source of truth for cluster state and using an operator inside the cluster to reconcile drift automatically.

ArgoCD is the most widely adopted GitOps operator for Kubernetes, backed by the CNCF. It provides a web UI, a CLI, a rich set of sync strategies, and deep integration with Helm, Kustomize, and plain YAML. Adopting GitOps with ArgoCD gives teams a secure, auditable, and automated deployment pipeline that aligns with infrastructure-as-code best practices.

## Core Content

### Understanding GitOps Principles

GitOps has four core principles that guide every implementation:

1. **Declarative Description**: The entire system is described declaratively — every Deployment, Service, ConfigMap, and Ingress exists as a file in a Git repository.
2. **Versioned and Immutable**: Git history provides a complete audit trail. Every change is tracked, reviewed through pull requests, and reversible.
3. **Pulled Automatically**: An operator inside the cluster continuously compares the live state against the Git repository and pulls changes automatically.
4. **Continuously Reconciled**: The operator corrects any drift between the desired state (in Git) and the live state (in the cluster). If someone edits a Deployment with `kubectl edit`, the operator reverts it to match the repository.

ArgoCD implements these principles through a reconciliation loop. At a configurable interval (default 3 minutes), ArgoCD polls the Git repository, diffs the desired state against the cluster state, and applies corrective actions based on the configured sync policy.

### Installing ArgoCD on Kubernetes

ArgoCD consists of several components: the API server, the application controller, the repo server, and (optionally) the Redis cache and Dex/SSO sidecar. The simplest installation uses the official manifest:

```bash
# Create the namespace
kubectl create namespace argocd

# Apply the latest stable release manifest
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Once all pods are running, expose the API server to access the web UI:

```bash
# Port-forward (for development / local clusters only)
kubectl port-forward -n argocd svc/argocd-server 8080:443

# OR create a LoadBalancer / Ingress for production access
# kubectl patch svc argocd-server -n argocd -p \
#   '{"spec": {"type": "LoadBalancer"}}'
```

Retrieve the initial admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

Login via the CLI:

```bash
argocd login localhost:8080 --insecure
# Username: admin
# Password: <retrieved value>

# Change the password after first login
argocd account update-password
```

### Connecting a Git Repository

ArgoCD needs access to your Git repository. For private repositories, register credentials via the UI (Settings > Repositories > Connect Repo) or the CLI:

```bash
argocd repo add https://github.com/your-org/gitops-manifests.git \
  --username your-username \
  --password your-token-or-password
```

For public repositories, no credentials are needed — ArgoCD can pull config without authentication.

### Declaring the First Application

An ArgoCD Application resource maps a Git directory (path + revision) to a cluster Namespace. Create a repository with this structure:

```text
gitops-manifests/
├── environments/
│   ├── staging/
│   │   ├── namespace.yaml
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── production/
│       ├── namespace.yaml
│       ├── deployment.yaml
│       └── service.yaml
└── README.md
```

Define the Application manifest in a file called `app-staging.yaml` (either committed to the same repo or applied imperatively):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-staging
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/gitops-manifests.git
    targetRevision: main
    path: environments/staging
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Apply it to register the application with ArgoCD:

```bash
kubectl apply -f app-staging.yaml
```

ArgoCD immediately detects the new Application resource, reads the Git repository, and deploys the manifests to the cluster. From this point forward, any change pushed to the `environments/staging` directory on the `main` branch triggers a reconciliation.

### Sync Strategies and Policies

ArgoCD offers several sync modes that control how and when changes propagate:

**Manual Sync**: Changes are pulled from Git but not applied until a human clicks "Sync" in the UI or runs `argocd app sync my-app-staging`. Best for production environments where every change requires explicit approval.

**Automatic Sync with Prune**: ArgoCD polls the repository at the configured interval and applies changes automatically. The `prune: true` flag tells ArgoCD to delete resources that exist in the cluster but are absent from Git — without pruning, deleted manifests leave orphaned resources behind.

**Automatic Sync with Self-Heal**: When `selfHeal: true` is enabled, ArgoCD reverts any manual changes made to the cluster. If someone runs `kubectl edit deployment my-app` to change the replica count, ArgoCD detects the drift and sets it back to the value defined in Git.

**Sync Waves and Phases**: Complex applications with dependencies (a ConfigMap must exist before a Deployment that consumes it) use sync waves:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

Resources with lower wave numbers sync first. Waves 0–2 typically handle infrastructure (namespaces, secrets), 3–4 handle middleware (databases, message queues), and 5+ handle applications.

### Managing Secrets in GitOps

Committing plain-text secrets to Git violates security best practices. ArgoCD supports several approaches to secret management:

**Sealed Secrets** (Bitnami): Encrypt a Secret into a SealedSecret resource that can be committed safely. Only the controller in the cluster can decrypt it.

```bash
# Install the Sealed Secrets controller
kubectl apply -f \
  https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Encrypt a secret
kubeseal --format=yaml < secret.yaml > sealed-secret.yaml
```

The `sealed-secret.yaml` can be committed to Git safely:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: api-credentials
  namespace: my-app-staging
spec:
  encryptedData:
    API_KEY: AgBy2i1...encrypted-base64-data...
```

**External Secrets Operator**: Fetches secrets from external providers (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault) and creates Kubernetes Secrets automatically:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-credentials
  namespace: my-app-staging
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: api-credentials
  data:
    - secretKey: API_KEY
      remoteRef:
        key: /production/api/credentials
        property: api-key
```

**SOPS + age/GPG**: Encrypt individual values in YAML files. ArgoCD has native support for SOPS-decrypted manifests via the repo server.

### Multi-Environment Deployments with ApplicationSets

Managing one Application per environment becomes repetitive when you have staging, production, and multiple regional clusters. ApplicationSets generate Applications dynamically from a template, parameterized by a generator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: staging
            server: https://kubernetes.default.svc
            namespace: my-app-staging
          - env: production
            server: https://kubernetes.default.svc
            namespace: my-app-production
  template:
    metadata:
      name: 'my-app-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/your-org/gitops-manifests.git
        targetRevision: main
        path: 'environments/{{env}}'
      destination:
        server: '{{server}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

Generators can also pull from Git directories (one application per subdirectory), SCM providers (one application per repository), or even a Pull Request generator for preview environments:

```yaml
generators:
  - pullRequest:
      github:
        owner: your-org
        repo: gitops-manifests
      requeueAfterSeconds: 300
```

Each open PR triggers a temporary Application with a preview environment, which is automatically destroyed when the PR merges or closes.

### Monitoring and Troubleshooting

ArgoCD provides multiple ways to monitor sync status and diagnose failures:

**Web UI**: The Applications dashboard shows a health status (Healthy, Degraded, Progressing, Missing, Suspended) and a sync status (Synced, OutOfSync, Syncing). Each resource inside an Application is expandable to show detailed conditions and events.

**CLI commands**:

```bash
# List all applications and their sync status
argocd app list

# Get detailed status for a specific application
argocd app get my-app-staging

# View sync events and resource diffs
argocd app diff my-app-staging

# Manually trigger a sync with a specific revision
argocd app sync my-app-staging --revision main
```

**Common Sync Failures**:

- **OutOfSync without changes**: ArgoCD has a known behavior where resources with defaulted fields (like `containerPort` or `protocol`) appear as drifted. Use `spec.ignoreDifferences` to exclude known-default fields:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

- **Sync failing with `context deadline exceeded`**: The repo server cannot reach the Git provider. Check network policies, firewall rules, and the repo server pod logs: `kubectl logs -n argocd deploy/argocd-repo-server`.

- **Resource already exists in another Application**: ArgoCD enforces that each resource is managed by exactly one Application. Use `argocd app list` and inspect the `status.resources` field to find which Application owns a conflicting resource.

- **SealedSecret decryption failures**: The SealedSecret was encrypted with a different cluster key. SealedSecrets are cluster-scoped; use `--scope cluster-wide` or re-encrypt for the target cluster.

**Webhook Integration**: For near-instant syncs (instead of waiting for the 3-minute poll interval), configure a webhook in your Git provider:

```bash
# GitHub webhook payload URL
# https://<argocd-server>/api/webhook

# Configure via the ArgoCD configmap
# kubectl edit configmap argocd-cm -n argocd
```

## Code Examples

### Complete Application with Helm Source

This example uses a Helm chart as the source, with values overridden per environment:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-staging
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/helm-charts.git
    targetRevision: main
    path: charts/my-app
    helm:
      valueFiles:
        - values.yaml
        - values-staging.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

### Kustomize Overlay Structure

For teams using Kustomize, point the source at a overlay directory:

```text
gitops-manifests/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── overlays/
    ├── staging/
    │   ├── kustomization.yaml
    │   ├── replica-count.yaml
    │   └── ingress.yaml
    └── production/
        ├── kustomization.yaml
        ├── replica-count.yaml
        └── ingress.yaml
```

```yaml
spec:
  source:
    repoURL: https://github.com/your-org/gitops-manifests.git
    targetRevision: main
    path: overlays/staging
```

### RBAC for ArgoCD Access

Control who can view and sync applications by configuring the ArgoCD RBAC ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    p, role:staging-admin, applications, sync, my-app-staging, allow
    p, role:staging-admin, applications, get, my-app-staging, allow
    p, role:staging-admin, applications, delete, my-app-staging, allow
    g, devops-team, role:staging-admin
```

## Key Insights

- **Start with manual sync for production**: Auto-sync with prune and self-heal is powerful but can cause incidents if misconfigured. Use manual sync for production environments during the first weeks of adoption, then graduate to auto-sync with a pre-sync hook for smoke tests.

- **Monitor sync duration as a SLO**: ArgoCD's default 3-minute poll interval means drift can go undetected for up to 3 minutes. Configure webhooks to reduce detection latency to seconds, and monitor the `argocd_app_sync_duration_seconds` metric to catch slow reconciliations.

- **Sealed Secrets are cluster-bound by default**: A SealedSecret encrypted for cluster A cannot be decrypted by cluster B. For multi-cluster GitOps, encrypt with `--scope cluster-wide` or maintain separate encrypted files per cluster. Consider External Secrets Operator for provider-backed secrets that work across clusters.

- **ApplicationSets simplify but version carefully**: An ApplicationSet template change affects all generated Applications simultaneously. Test the template in a single environment first by using a PR generator or a separate ApplicationSet with limited scope before rolling to production.

- **Pre-sync and post-sync hooks**: Use ArgoCD resource hooks for database migrations, smoke tests, or notifications. A hook is a manifest annotated with `argocd.argoproj.io/hook: PreSync` or `PostSync` that runs during the sync lifecycle and can be configured to fail the deployment if a health check fails.

## Next Steps

- Explore the **ArgoCD Rollouts** plugin for progressive delivery (blue/green and canary deployments).
- Study **Crossplane** for managing cloud infrastructure (databases, buckets, networks) alongside Kubernetes applications in the same GitOps workflow.
- Review the **Kubernetes Production Best Practices Guide** in this library for broader operational guidance on RBAC, network policies, and observability.

## Conclusion

You have implemented a complete GitOps workflow with ArgoCD on Kubernetes. You installed ArgoCD, connected a Git repository, deployed applications with automatic sync, secured secrets with Sealed Secrets and External Secrets Operator, scaled to multiple environments with ApplicationSets, and learned patterns for monitoring and troubleshooting sync failures. ArgoCD gives your team a reliable, auditable, and automated deployment pipeline that keeps your cluster state in sync with your Git repository — the single source of truth.

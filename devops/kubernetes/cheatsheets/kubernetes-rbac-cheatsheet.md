---
title: "Kubernetes RBAC Cheatsheet"
description: "Quick reference for Kubernetes RBAC: Roles, ClusterRoles, bindings, ServiceAccounts, verb and resource semantics, aggregation, least privilege, and audit commands."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Kubernetes RBAC Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Identify the caller | `kubectl auth whoami` | Show the user, groups, and extra claims of the current context |
| Ask a yes/no permission question | `kubectl auth can-i create pods -n payments` | Prints `yes` or `no`; exit code is scriptable |
| Test another identity | `kubectl auth can-i get secrets --as system:serviceaccount:payments:ci-bot` | Evaluate RBAC for a user, group, or ServiceAccount |
| List every permission held | `kubectl auth can-i --list -n payments` | Enumerate allowed verbs per resource |
| Dump all RBAC objects | `kubectl get roles,rolebindings,clusterroles,clusterrolebindings -A` | Full inventory for review |
| Find a subject's bindings | `kubectl get rolebindings -A -o wide` | Read the SUBJECTS column to see where an identity gets its rights |
| Create an identity | `kubectl create serviceaccount ci-bot -n payments` | Dedicated ServiceAccount per workload |
| Mint a token | `kubectl create token ci-bot -n payments --duration=15m` | Short-lived token, no legacy Secret |
| Disable token mounting | `kubectl patch sa ci-bot -p '{"automountServiceAccountToken": false}'` | Remove API credentials from pods that do not need them |
| Grant a namespaced role | `kubectl create rolebinding rb --role=payment-reader --serviceaccount=payments:ci-bot -n payments` | Bind a Role inside one namespace |
| Grant a cluster role | `kubectl create clusterrolebinding crb --clusterrole=view --serviceaccount=payments:ci-bot` | Cluster-wide grant; use sparingly |
| Inspect a role's rules | `kubectl describe clusterrole view` | Human-readable verb/resource matrix |

## Common Commands

### Inspect Existing Grants

```bash
# Full inventory, cluster-wide
kubectl get roles,rolebindings,clusterroles,clusterrolebindings -A

# Expand a single role into its rule list
kubectl describe clusterrole view
kubectl describe role payment-reader -n payments

# Which bindings mention a given subject?
kubectl get rolebindings -A -o wide | grep ci-bot
kubectl get clusterrolebindings -o wide | grep jane@example.com
```

### Test and Simulate Permissions

```bash
set -euo pipefail

# Identity of the current context
kubectl auth whoami

# Exit-code friendly check for CI gates
if kubectl auth can-i create pods --namespace payments >/dev/null; then
    echo "allowed"
else
    echo "denied"
fi

# Evaluate as another subject without switching context
kubectl auth can-i list secrets --as system:serviceaccount:payments:ci-bot -n payments

# Enumerate everything a subject may do in a namespace
kubectl auth can-i --list --as system:serviceaccount:payments:ci-bot -n payments
```

### ServiceAccounts and Tokens

```bash
# One identity per workload, never shared across teams
kubectl create serviceaccount ci-bot -n payments

# Projected, time-bound token (Kubernetes 1.24+)
kubectl create token ci-bot -n payments --duration=15m

# Stop auto-mounting credentials for pods that never call the API
kubectl patch serviceaccount ci-bot -n payments \
    -p '{"automountServiceAccountToken": false}'
```

### Aggregation and Audit

```bash
# Aggregated ClusterRole: labelled roles are merged by the controller
kubectl get clusterroles -l rbac.example.com/aggregate-to-ops=true

# Spot subjects bound to powerful built-ins
kubectl get clusterrolebindings -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.roleRef.name}{"\n"}{end}' | grep cluster-admin
```

## Code Snippets

### Namespaced Role and RoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: payment-reader
  namespace: payments
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    resourceNames: ["payments-api"]
    verbs: ["get", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payments-api-reader
  namespace: payments
subjects:
  - kind: ServiceAccount
    name: ci-bot
    namespace: payments
roleRef:
  kind: Role
  name: payment-reader
  apiGroup: rbac.authorization.k8s.io
```

### Aggregated ClusterRole

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ops-readonly
aggregationRule:
  clusterRoleSelectors:
    - matchLabels:
        rbac.example.com/aggregate-to-ops: "true"
rules: []   # populated by the aggregation controller
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ops-readonly-pods
  labels:
    rbac.example.com/aggregate-to-ops: "true"
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes"]
    verbs: ["get", "list", "watch"]
```

### Least-Privilege Gate for CI

```bash
#!/usr/bin/env bash
set -euo pipefail

subject="system:serviceaccount:payments:ci-bot"

# Fail the pipeline if the workload identity holds cluster-wide write access.
if kubectl auth can-i create pods --all-namespaces --as "${subject}" | grep -q '^yes$'; then
    echo "ERROR: ${subject} can create pods cluster-wide" >&2
    exit 1
fi

echo "OK: no cluster-wide pod creation for ${subject}"
```

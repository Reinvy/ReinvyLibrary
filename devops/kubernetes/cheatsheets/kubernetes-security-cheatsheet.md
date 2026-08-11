---
title: "Kubernetes Security Cheat Sheet"
description: "A quick reference guide for securing Kubernetes clusters: RBAC roles and bindings, ServiceAccounts, Pod Security Standards and admission, security contexts, Secrets encryption at rest and external secrets, NetworkPolicies, image pull secrets, OPA Gatekeeper constraints, and audit commands."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Kubernetes Security Cheat Sheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Check current permissions | `kubectl auth can-i create pods` | Verify whether the current identity may perform an action |
| Check permissions as another identity | `kubectl auth can-i get secrets --as system:serviceaccount:default:ci-bot` | Test RBAC as a service account or user |
| List RBAC objects | `kubectl get roles,rolebindings,clusterroles,clusterrolebindings -A` | Show all roles and bindings in the cluster |
| Create a service account | `kubectl create serviceaccount ci-bot` | Create a ServiceAccount in the current namespace |
| Issue a short-lived token | `kubectl create token ci-bot --duration=6h` | Mint a token for a ServiceAccount (Kubernetes 1.24+) |
| Create a generic secret | `kubectl create secret generic db-creds --from-literal=username=admin` | Store key-value data as a Secret |
| Create a registry secret | `kubectl create secret docker-registry regcred --docker-server=ghcr.io` | Store container registry credentials |
| Read secret data | `kubectl get secret db-creds -o jsonpath='{.data.password}'` | Output base64-encoded secret value |
| Enforce Pod Security Standards | `kubectl label ns prod pod-security.kubernetes.io/enforce=restricted` | Reject pods violating the restricted profile |
| Apply a NetworkPolicy | `kubectl apply -f default-deny.yaml` | Enforce pod-level ingress and egress rules |
| List NetworkPolicies | `kubectl get networkpolicies -A` | Show all network policies in the cluster |
| Inspect API server flags | `kubectl get pods -n kube-system -l component=kube-apiserver -o jsonpath='{.items[0].spec.containers[0].command}'` | Verify admission plugins and encryption flags |

## Common Commands

### RBAC Verification Commands

```bash
# Who am I and what can I do?
kubectl auth whoami
kubectl auth can-i create pods
kubectl auth can-i delete deployments --all-namespaces

# Test permissions as another identity
kubectl auth can-i get secrets --as system:serviceaccount:default:ci-bot
kubectl auth can-i list pods --as-group system:authenticated

# Inspect RBAC objects
kubectl get roles,rolebindings,clusterroles,clusterrolebindings -A
kubectl describe clusterrolebinding view
kubectl get clusterrole view -o yaml
```

### Service Account Commands

```bash
# Create and list service accounts
kubectl create serviceaccount ci-bot
kubectl get serviceaccounts

# Mint a short-lived token (Kubernetes 1.24+)
kubectl create token ci-bot --duration=6h

# Inspect the service account (image pull secrets, automount settings)
kubectl get serviceaccounts ci-bot -o yaml

# Decode a legacy token secret (pre-1.24 style)
kubectl get secret ci-bot-token-abc12 -o jsonpath='{.data.token}' | base64 -d
```

### Secret Management Commands

```bash
# Create secrets from literals, files, TLS pairs, and registry credentials
kubectl create secret generic db-creds --from-literal=username=admin --from-literal=password='S3cr3t!'
kubectl create secret generic app-config --from-file=config.yaml
kubectl create secret tls tls-cert --cert=tls.crt --key=tls.key
kubectl create secret docker-registry regcred --docker-server=ghcr.io --docker-username=bot --docker-password=TOKEN

# Read secret data (base64 encoded)
kubectl get secret db-creds -o jsonpath='{.data.password}' | base64 -d

# Confirm the API server encryption provider config
ps aux | grep kube-apiserver | grep -o 'encryption-provider-config=[^ ]*'
```

### Pod Security Admission Commands

```bash
# Inspect Pod Security Standards labels on namespaces
kubectl get ns --show-labels

# Enforce, audit, and warn with a given profile
kubectl label ns prod pod-security.kubernetes.io/enforce=restricted
kubectl label ns prod pod-security.kubernetes.io/audit=baseline
kubectl label ns prod pod-security.kubernetes.io/warn=baseline

# Remove enforcement from a namespace
kubectl label ns prod pod-security.kubernetes.io/enforce-

# Check whether the PodSecurity admission plugin is enabled
kubectl get pods -n kube-system -l component=kube-apiserver -o yaml | grep enable-admission-plugins
```

### Network Policy Commands

```bash
# List and describe network policies
kubectl get networkpolicies -A
kubectl describe networkpolicy default-deny-all -n default

# Apply and delete policies
kubectl apply -f allow-frontend-api.yaml
kubectl delete networkpolicy default-deny-all -n default

# Show pods with their labels for policy design
kubectl get pods -n default --show-labels
```

### Audit and Compliance Commands

```bash
# Inspect the API server audit policy
kubectl get cm audit-policy -n kube-system -o yaml

# Verify image pull secrets attached to a pod
kubectl get pod my-pod -o jsonpath='{.spec.imagePullSecrets}'

# Check which users can access a resource
kubectl auth can-i list secrets --list -n production

# Review recent events for security-relevant warnings
kubectl get events --field-selector reason=FailedCreate -A
```

## Code Snippets

### Role and RoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: payments
  name: payment-reader
rules:
  - apiGroups: [""]
    resources: ["pods", "services"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: payments
  name: read-payments
subjects:
  - kind: ServiceAccount
    name: ci-bot
    namespace: payments
roleRef:
  kind: Role
  name: payment-reader
  apiGroup: rbac.authorization.k8s.io
```

### ClusterRole and ClusterRoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: metrics-reader
rules:
  - apiGroups: ["metrics.k8s.io"]
    resources: ["pods"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: read-metrics
subjects:
  - kind: User
    name: jane@example.com
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: metrics-reader
  apiGroup: rbac.authorization.k8s.io
```

### ServiceAccount with Image Pull Secret

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-runner
  namespace: production
imagePullSecrets:
  - name: regcred
automountServiceAccountToken: false
```

### Pod Security Context

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hardened-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    runAsGroup: 3000
    fsGroup: 3000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: nginx:1.27
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
          add: ["NET_BIND_SERVICE"]
```

### Pod Security Standards Labels

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### NetworkPolicy: Default Deny

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

### NetworkPolicy: Allow Frontend to API

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-api
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

### Secret with Encryption at Rest

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: c2VjdXJlLXNlY3JldC1rZXktMzItYnl0ZXM=
      - identity: {}
```

### OPA Gatekeeper Constraint

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
  parameters:
    labels:
      - key: team
```

---
title: "Building Kubernetes Operators with Python and Kopf"
description: "A hands-on tutorial for building Kubernetes operators in Python using the kopf framework, covering CRD design, event-driven handlers, finalizers, RBAC, and in-cluster deployment."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building Kubernetes Operators with Python and Kopf

## Summary

Kubernetes operators extend the platform by encoding operational knowledge into controllers that watch custom resources and reconcile the cluster toward a desired state. This tutorial teaches you how to build a real operator in Python using **kopf** (Kubernetes Operator Framework for Python). You will design a Custom Resource Definition (CRD) with a structural schema, implement `create`, `update`, and `delete` handlers, wire finalizers for safe cleanup, secure the operator with least-privilege RBAC, and deploy it inside a cluster as a regular workload. By the end, you will have a running operator that provisions a Deployment and a Service for every `Website` custom resource you create.

## Target Audience

- Platform Engineers, SREs, DevOps Engineers, and Backend Developers who want to automate infrastructure with Kubernetes.
- Expected developer level: Advanced (comfortable with `kubectl`, YAML manifests, Pods, Deployments, Services, and basic RBAC; comfortable reading Python).

## Prerequisites

- A working Kubernetes cluster for testing — Kind or Minikube is recommended (a single-node cluster is enough).
- `kubectl` installed and configured against that cluster.
- Python 3.10+ installed locally (for the operator image build and linting).
- Docker (or another container runtime) to build and push the operator image.
- Basic understanding of Kubernetes API resources and the controller pattern.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain what an operator is and when it is a better fit than plain manifests or Helm charts.
- Author a CRD with a structural schema, including validation, defaulting, and a status subresource.
- Build a kopf-based operator with event-driven handlers for `create`, `update`, and `delete`.
- Use finalizers to make deletions safe and rollback-free.
- Grant the operator exactly the RBAC permissions it needs via ServiceAccount, Role, and ClusterRole.
- Deploy the operator in-cluster and verify reconciliation end to end.

## Context and Motivation

Kubernetes ships with a fixed set of built-in resources: Pods, Deployments, Services, and so on. The moment your application has operational needs beyond what those primitives express — "restart the cluster when this backup fails", "provision a database instance for every tenant", "roll the certificate when it is 30 days from expiry" — you need a place to declare that intent. Custom Resources give you the API surface; operators give you the behavior behind it.

The canonical examples are the etcd-operator and Prometheus Operator: instead of a human running `etcdctl` commands or manually scaling Prometheus, a controller watches `EtcdCluster` and `Prometheus` resources and continuously reconciles the cluster. This is the essence of the operator pattern: **desired state is declared in the API, and a control loop makes the observed state match it**.

Most production operators are written in Go with `controller-runtime` and `kubebuilder`, which is the right choice for performance-critical control planes. But there is a large class of operator work — glue logic, business-process automation, internal platform tooling — where a Python operator is dramatically faster to build and iterate on. **kopf** gives you the controller machinery (informer/watch, event dispatch, status updates, peering) out of the box, so you focus on the reconciliation logic rather than the plumbing.

## Core Content

### What an Operator Actually Is

An operator is a client of the Kubernetes API that runs the **reconciliation loop**:

`Observe → Diff → Act → Re-observe`

A controller does not react imperatively to every event; it continuously compares the observed state of the world against the desired state written in custom resources, and takes action to close the gap. This is why operators are resilient: if the operator crashes mid-operation, or someone deletes a managed resource behind its back, the loop simply converges again on the next pass.

The **control loop** terminology comes from control theory. In Kubernetes terms:

- **Desired state**: the `spec` of your custom resource plus any configuration the operator reads.
- **Observed state**: what actually exists in the cluster (Deployments, Services, Pods, external systems).
- **Reconcile action**: create, update, or delete resources to move observed state toward desired state.

### CRD Anatomy — Your Custom API

Before writing any controller code, you define the shape of the new API. A CRD is itself a Kubernetes resource (API group `apiextensions.k8s.io/v1`). Key parts:

- `group` and `names` — the API group, plural/singular names, and short names.
- `versions` — schema evolution; each version declares its own `schema`, `subresources` (status/scale), and optional `additionalPrinterColumns`.
- `spec.preserveUnknownFields: false` — mandatory for structural schemas (this is the default for `v1` CRDs).
- `scope` — `Namespaced` or `Cluster`.

A **structural schema** is a hand-written OpenAPI v3 schema that the API server uses for validation and pruning. If a user submits a field that is not in the schema, the API server strips it (pruning) instead of storing it. Marking `x-kubernetes-preserve-unknown-fields: true` or using `x-kubernetes-int-or-string` opts specific fields out of pruning.

For the operator to report progress back to the user, enable the **status subresource**: `subresources.status: {}`. Once enabled, only the operator (via the `update` verb on the status subresource) can write `status`; end users get read-only access — which means a user cannot forge status, a core trust property of custom APIs.

### Desired State and the `spec` Contract

Design the `spec` as the *contract* between the user and the operator. Every field should be:

- **Minimal** — only what the user must decide (domain configuration), not cluster plumbing.
- **Validated** — types, ranges, enums, and required fields enforced in the schema.
- **Defaulted** — fields the user may omit get sensible defaults via `default:` in the schema or via an admission webhook.

Cluster plumbing (image tags, replica counts derived from spec, metadata labels) belongs to the *implementation*, not the contract. Users should be able to say "I want a `Website` named `storefront` with `replicas: 3`" without knowing how the operator materializes it.

### kopf Fundamentals

kopf is a framework that turns plain Python functions into operator handlers. Three concepts matter most:

1. **Handlers**: functions decorated with `@kopf.on.create`, `@kopf.on.update`, `@kopf.on.delete`, or the generic `@kopf.on.event`. They receive a `body` (the whole custom resource), a `spec` (the `spec` section), a `logger`, and other context.
2. **Event-driven, not polling**: kopf maintains an informer against the CRD kind. Because it uses watch streams, handlers fire on actual API events, and bursts are handled with batching and retries.
3. **Peering**: to keep multiple operator replicas from stepping on each other, kopf uses a `KopfPeering` custom resource for leader election. With a single replica this is irrelevant, but the pattern is built in.

Handlers return either `None` or a dict to store into the object's `status`. Returning a dict merges it into `status.<handler-id>`, giving you a free audit trail of what each handler did.

### The Lifecycle Contract: Create, Update, Delete

A robust operator implements all three lifecycle phases:

- **Create**: provision downstream resources (Deployment, Service, ConfigMap, external API calls). Children are owned by the custom resource via `ownerReferences` so Kubernetes garbage-collects them when the parent is deleted.
- **Update**: detect drift between the observed children and the desired state derived from the new `spec`; patch what changed. The event-driven model means `update` fires only on real changes, but you should still make the handler idempotent — it may run multiple times for a single logical change (retries, requeues).
- **Delete**: because handlers run after the object is already marked for deletion, a naive delete handler races with Kubernetes garbage collection: the operator's own children (Deployment, Service) could be deleted by the GC before the handler finishes its cleanup. **Finalizers fix this.** A finalizer is a string in `metadata.finalizers`; while present, the API server keeps the object around until the finalizer is removed. The delete handler does its cleanup, then removes the finalizer — only then does the object vanish.

### RBAC — Least Privilege for Your Operator

The operator runs in-cluster with a ServiceAccount. RBAC follows one simple rule: **grant only the verbs and resources the operator's reconcile logic touches**. A typical operator that creates Deployments and Services needs:

- `get/list/watch` on its own custom resource kind (e.g., `websites.example.com`) — the informer needs read access.
- `get/list/watch/create/update/patch/delete` on the child resources it manages (Deployments, Services).
- `update` on the custom resource status subresource (to write status).
- `get/update` on its own Pods only if it inspects its own health.

Use a `ClusterRole` when the operator manages cluster-scoped resources or watches custom resources across namespaces; use a `Role` when everything is namespaced.

### Deployment Pattern for the Operator Itself

The operator is just another workload:

- A `Deployment` running the operator image, typically with 1 replica (kopf peering handles scale-out if you need HA).
- A `ServiceAccount` named for the operator.
- RBAC bindings from that ServiceAccount to the roles described above.

One subtlety: the operator's Deployment should *not* be owned by the custom resource it manages (no `ownerReferences` from the operator's Deployment to any `Website`), because deleting a `Website` would then garbage-collect the operator itself.

### Observability and Debugging

- kopf logs every event dispatch at INFO level with structured fields (`resource`, `event`, `attempt`, `retries`). `kubectl logs -f deploy/<operator>` is your primary debug lens.
- Expose Prometheus metrics with `kopf.on.metric` handlers or the built-in metrics server.
- Set `KOPF_LOGGING_PRETTY=1` in the operator's environment for human-readable logs in development.

## Code Examples

### Step 1: Define the CRD

The operator manages a `Website` resource — a stand-in for any application workload you want to provision declaratively:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: websites.example.com
spec:
  group: example.com
  names:
    kind: Website
    listKind: WebsiteList
    plural: websites
    singular: website
    shortNames:
      - web
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required:
                - image
              properties:
                image:
                  type: string
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 20
                  default: 2
                port:
                  type: integer
                  minimum: 1
                  maximum: 65535
                  default: 8080
            status:
              type: object
              x-kubernetes-preserve-unknown-fields: true
      subresources:
        status: {}
      additionalPrinterColumns:
        - name: Replicas
          type: integer
          jsonPath: .spec.replicas
        - name: Ready
          type: string
          jsonPath: .status.ready
```

Apply it and confirm the API serves the new kind:

```bash
kubectl apply -f crd.yaml
kubectl get crd websites.example.com
kubectl get websites  # no resources yet, but the kind resolves
```

### Step 2: The kopf Operator

```python
import kopf
import kubernetes

# Helper: build a Deployment manifest from the Website spec.
def build_deployment(name, namespace, spec, labels):
    replicas = spec.get("replicas", 2)
    image = spec["image"]
    port = spec.get("port", 8080)
    return {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {
            "name": name,
            "namespace": namespace,
            "labels": labels,
        },
        "spec": {
            "replicas": replicas,
            "selector": {"matchLabels": labels},
            "template": {
                "metadata": {"labels": labels},
                "spec": {
                    "containers": [
                        {
                            "name": "website",
                            "image": image,
                            "ports": [{"containerPort": port}],
                        }
                    ]
                },
            },
        },
    }

def build_service(name, namespace, labels, port):
    return {
        "apiVersion": "v1",
        "kind": "Service",
        "metadata": {"name": name, "namespace": namespace, "labels": labels},
        "spec": {
            "selector": labels,
            "ports": [
                {"name": "http", "port": 80, "targetPort": port},
            ],
        },
    }


@kopf.on.create("example.com", "v1", "websites")
def on_create(body, spec, name, namespace, logger, **kwargs):
    labels = {"app": name, "managed-by": "website-operator"}
    api = kubernetes.client.AppsV1Api()
    deployment = build_deployment(name, namespace, spec, labels)
    api.create_namespaced_deployment(namespace=namespace, body=deployment)
    service_api = kubernetes.client.CoreV1Api()
    service = build_service(name, namespace, labels, spec.get("port", 8080))
    service_api.create_namespaced_service(namespace=namespace, body=service)
    logger.info(f"Provisioned Deployment and Service for {name}")
    return {"ready": "true"}


@kopf.on.update("example.com", "v1", "websites")
def on_update(body, spec, name, namespace, logger, **kwargs):
    labels = {"app": name, "managed-by": "website-operator"}
    api = kubernetes.client.AppsV1Api()
    deployment = build_deployment(name, namespace, spec, labels)
    api.replace_namespaced_deployment(name=name, namespace=namespace, body=deployment)
    logger.info(f"Updated Deployment {name} to match new spec")
    return {"ready": "true"}


@kopf.on.delete("example.com", "v1", "websites")
def on_delete(name, namespace, logger, **kwargs):
    # Finalizer-based deletion: children are garbage-collected via ownerReferences;
    # the handler exists for external/system cleanup before the object disappears.
    logger.info(f"Deleting dependencies for {name}")
    return {"ready": "false"}
```

### Step 3: Wire Ownership and Finalizers

Add the finalizer and owner references so deletion is safe and automatic. The finalizer keeps the `Website` alive until the delete handler completes; owner references make Kubernetes garbage-collect the Deployment and Service when the parent goes away:

```python
@kopf.on.create("example.com", "v1", "websites")
def on_create(body, spec, name, namespace, logger, **kwargs):
    api = kubernetes.client.AppsV1Api()
    labels = {"app": name, "managed-by": "website-operator"}

    owner = kubernetes.client.V1OwnerReference(
        api_version="example.com/v1",
        kind="Website",
        name=name,
        uid=body["metadata"]["uid"],
    )

    deployment = build_deployment(name, namespace, spec, labels)
    deployment["metadata"]["ownerReferences"] = [owner]
    api.create_namespaced_deployment(namespace=namespace, body=deployment)

    service = build_service(name, namespace, labels, spec.get("port", 8080))
    service["metadata"]["ownerReferences"] = [owner]
    kubernetes.client.CoreV1Api().create_namespaced_service(
        namespace=namespace, body=service
    )

    logger.info(f"Provisioned and owned Deployment + Service for {name}")
    return {"ready": "true"}
```

`uid` comes from the live custom resource body (not the spec) — this is what makes the owner reference valid. Without the finalizer, kopf still runs the delete handler, but you lose the guarantee that cleanup *completes* before the object is gone; with `@kopf.on.delete` combined with finalizer annotations, kopf manages the finalizer lifecycle for you automatically.

### Step 4: Package and Deploy

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY operator.py .
CMD ["kopf", "run", "/app/operator.py"]
```

```text
requirements.txt:
kopf
kubernetes
```

Build and push the image, then deploy the operator with its own ServiceAccount and RBAC:

```bash
docker build -t <your-registry>/website-operator:latest .
docker push <your-registry>/website-operator:latest
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: website-operator
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: website-operator
rules:
  - apiGroups: ["example.com"]
    resources: ["websites", "websites/status"]
    verbs: ["get", "list", "watch", "update", "patch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: website-operator
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: website-operator
subjects:
  - kind: ServiceAccount
    name: website-operator
    namespace: default
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: website-operator
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: website-operator
  template:
    metadata:
      labels:
        app: website-operator
    spec:
      serviceAccountName: website-operator
      containers:
        - name: operator
          image: <your-registry>/website-operator:latest
          env:
            - name: KOPF_LOGGING_PRETTY
              value: "1"
```

### Step 5: Test the Reconciliation Loop

Create a `Website` and watch the operator provision the children:

```bash
kubectl apply -f - <<'EOF'
apiVersion: example.com/v1
kind: Website
metadata:
  name: storefront
spec:
  image: nginx:1.27
  replicas: 3
EOF

kubectl get websites
kubectl get deploy,svc -l managed-by=website-operator
kubectl logs -f deploy/website-operator
```

Expected flow in the logs: the operator receives the `create` event for `storefront`, creates the Deployment and Service, and writes `status.ready: "true"`. Scaling the resource (`kubectl patch websites storefront --type merge -p '{"spec":{"replicas":5}}'`) triggers the `update` handler, and `kubectl delete websites storefront` runs the delete path with the finalizer.

## Key Insights

- **Idempotency is non-negotiable**: handlers may run multiple times for one logical change (watch replays, retries, requeues). Every handler must be safe to run twice — use `replace`/`patch` semantics and check existence before creating.
- **Ownership where it belongs**: children (`Deployment`, `Service`) carry owner references to the custom resource so the garbage collector cleans them up. The operator's own Deployment must NOT be owned by any custom resource.
- **Finalizers before cleanup**: without a finalizer, the API server can delete the custom resource (and garbage-collect its children) before your delete handler finishes. Delegating finalizer management to kopf keeps the lifecycle correct with zero extra boilerplate.
- **Status is the operator's voice**: write meaningful handler return values into `status` — users and `kubectl get` (via printer columns) depend on it. Never let users write status directly; the status subresource exists to prevent forgery.
- **Watch the `update` handler cost**: `replace_namespaced_deployment` performs a full object replace and bumps `resourceVersion` every time. For hot paths, prefer strategic-merge `patch` calls that only touch changed fields to avoid churn on the API server.
- **Performance consideration**: Python operators are fine for control loops that reconcile on human timescales (seconds to minutes). For sub-second, high-churn controllers over many objects, the Go `controller-runtime`/`kubebuilder` stack is the better fit — reuse the same CRD design, swap the runtime.
- **Peering for HA**: with `replicas: N` (N > 1), kopf uses a `KopfPeering` resource to elect a single active operator and avoid duplicate reconciliation. Enable it by granting the operator access to `kopf.dev` resources.

## Next Steps

- Deepen the platform-engineering view with the [Advanced Kubernetes Syllabus](../../syllabi/advanced-kubernetes-syllabus.md), particularly Module 3 on CRDs and operators (kubebuilder, Operator SDK, OLM).
- Extend this operator with a `status.observedGeneration` field and compare it against `metadata.generation` for true generation-tracking semantics.
- Package the operator for distribution with OLM (Operator Lifecycle Manager) bundles and scorecards.
- Add `kopf.on.metric` handlers and a Prometheus `ServiceMonitor` to expose reconcile latency and queue depth.

## Conclusion

You have built a complete Kubernetes operator in Python: a structural CRD, event-driven `create`/`update`/`delete` handlers with kopf, safe ownership and finalizer-driven deletion, least-privilege RBAC, and an in-cluster Deployment that reconciles `Website` resources end to end. The operator pattern converts operational playbooks into code that runs continuously and self-heals — and kopf lets you write that code in a language where your team is already productive. The same design principles (structural schema, idempotent reconcile, owner references, status subresource) carry over directly if you later move the operator to Go with kubebuilder.

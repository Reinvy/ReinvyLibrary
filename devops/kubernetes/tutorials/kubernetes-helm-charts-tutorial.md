---
title: "Kubernetes Helm Charts Tutorial"
description: "Build, template, and publish a production-ready Helm chart: chart anatomy, values design, helpers, subchart dependencies, hooks, packaging, and OCI distribution."
category: "devops"
technology: "kubernetes"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Kubernetes Helm Charts Tutorial

## Summary

This tutorial takes you from an empty scaffold to a published OCI chart. You will build a small API chart with a tight values contract, named helpers shared across manifests, a pinned subchart, and a reproducible release process.

## Target Audience

- DevOps and platform engineers who already deploy with `kubectl apply -k`.
- Backend developers who own the manifests of their own service.

## Prerequisites

- A cluster you can deploy to (kind or minikube) plus `kubectl`.
- Helm 3.14 or newer (`helm version`).
- An OCI-capable registry such as GHCR, with credentials for `helm registry login`.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain every file in a chart and how it is rendered.
- Design a `values.yaml` surface that keeps overrides small and predictable.
- Factor repeated fragments into named helpers with `include`.
- Pin subcharts with `Chart.lock` and gate them with conditions.
- Package a chart and publish it to an OCI registry immutably.

## Context and Motivation

Copy-pasting Deployments per environment works until the third cluster. Helm turns manifests into a parameterized package: one chart, many releases, and a recorded history so `helm rollback` is a real option during an incident. The hard part is not the CLI — it is designing the values contract and helpers so the chart stays readable a year later.

## Core Content

### Anatomy of a Chart

`helm create api` produces `Chart.yaml`, `values.yaml`, `templates/`, `charts/`, and `.helmignore`. Rendering is pure text: Helm merges values, executes templates, and submits the result to the API server.

### Values: The Only Knob Users Should Need

Values are the chart's public API. Expose intent (`replicaCount`) instead of mirroring every pod field, and add `values.schema.json` to reject typos before rendering. Quote string overrides on the CLI, because `--set image.tag=1.10` becomes a float.

### Templates and Built-in Objects

Templates receive `.Values`, `.Release`, `.Chart`, `.Capabilities`, and `.Files`. Use `{{ .Release.Namespace }}` rather than a hard-coded namespace, and gate version-specific fields on `.Capabilities.APIVersions.Has`.

### Named Helpers and `include`

`templates/_helpers.tpl` holds chart name, fullname, labels, and image references. Call helpers with `include`, which returns a pipeable string, instead of `template`, which writes directly. Pass the root context so helpers also work inside `range` loops.

### Dependencies and Hooks

Declare subcharts in `Chart.yaml`, vendor them with `helm dependency build`, and commit `Chart.lock`. Pin exact versions and use `condition` so an operator can disable an optional subchart with one boolean. Hooks are ordinary manifests annotated with `helm.sh/hook`; a `pre-upgrade` Job runs migrations before the Deployment rolls, and `hook-delete-policy: before-hook-creation` avoids name clashes on retry. Hooks are not part of the release once executed, so keep them idempotent.

### Packaging and Publishing

`helm package` emits `api-1.4.0.tgz`; `helm push` uploads it to any OCI registry. Treat chart versions as immutable and let CI derive the version from the Git tag so chart and application releases always match.

## Code Examples

### Chart Metadata with a Pinned Dependency

```yaml
apiVersion: v2
name: api
type: application
version: 1.4.0
appVersion: "2.11.3"
dependencies:
  - name: redis
    version: 20.6.1
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
```

### Values with Sensible Defaults

```yaml
replicaCount: 2

image:
  repository: ghcr.io/acme/payments-api
  tag: "2.11.3"
  pullPolicy: IfNotPresent

redis:
  enabled: false
```

### Shared Helpers

```text
{{- define "api.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "api.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}
```

### Deployment Using the Helpers

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "api.fullname" . }}
  labels:
    {{- include "api.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    metadata:
      labels:
        {{- include "api.labels" . | nindent 8 }}
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```

### Lint, Render, Package, Publish

```bash
set -euo pipefail

# Fail fast on template or schema errors before touching the cluster
helm lint ./api --strict
# Review the exact manifests for one environment
helm template payments ./api --namespace payments -f values/production.yaml > /tmp/rendered.yaml
# Vendor pinned dependencies, then build the artifact
helm dependency build ./api
helm package ./api --destination dist

# Publish immutably; the version must match Chart.yaml
helm push dist/api-1.4.0.tgz oci://ghcr.io/acme/charts
```

## Key Insights

- Values are an API, not a mirror of the pod spec: expose intent, document defaults.
- `include` over `template` in helpers — `template` breaks pipelines like `| nindent 4`.
- Pin subchart versions and commit `Chart.lock`; ranges make renders non-deterministic.
- Hooks must be idempotent: they are re-created on retry and absent from `helm get manifest`.
- Render with `helm template` in CI; it catches nil-pointer errors before deploy.

## Next Steps

- Add a chart-testing pipeline (`ct lint`, `ct install`) against a kind cluster.
- Split environment overrides into `values/base.yaml` and `values/production.yaml`.
- Deliver releases with Argo CD or Flux consuming the OCI chart directly.

## Conclusion

You built a chart with a small values contract, reusable helpers, a pinned subchart, and a published immutable artifact. Every release is now reproducible from a Git tag instead of a folder of copied YAML.

---
title: "Kubernetes Backup and Disaster Recovery with Velero"
description: "A production-focused tutorial on protecting Kubernetes cluster state and persistent volumes with Velero, covering CSI snapshots, Kopia file-level backups, restore hooks, namespace remapping, retention economics, and automated disaster recovery drills."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Kubernetes Backup and Disaster Recovery with Velero

## Summary

Kubernetes gives you self-healing for running workloads, but it gives you nothing for the state that definitions and volumes actually hold. This tutorial builds a complete backup and disaster recovery capability around **Velero**: you will install the server and node agent, define backup storage locations declaratively, take consistent snapshots of stateful workloads with CSI, add file-level backups for volumes that cannot be snapshotted, restore into a scratch namespace with remapping and hooks, and finally automate a recovery drill that fails loudly when the last backup is stale. The end result is a cluster where losing a namespace, a storage class, or an entire control plane costs you minutes of recovery rather than days of reconstruction.

## Target Audience

- Platform Engineers, SREs, and DevOps Engineers who already operate a Kubernetes cluster and are now accountable for its recovery time objective (RTO) and recovery point objective (RPO).
- Expected developer level: Advanced. You should be comfortable with `kubectl`, YAML manifests, PersistentVolumeClaims, StorageClasses, RBAC, and cloud object storage concepts.

## Prerequisites

- A Kubernetes cluster, version 1.27 or newer, that you can install CRDs into. A managed cluster (EKS, GKE, AKS) or a local Kind cluster both work; Kind needs a CSI driver installed to exercise snapshot paths.
- `kubectl` configured against that cluster, plus `helm` for installing the CSI snapshot components if they are not present.
- The `velero` CLI, version 1.14 or newer.
- An S3-compatible object storage bucket and credentials with read, write, list, and delete permissions on that bucket.
- A CSI driver that supports snapshots (EBS CSI, GCE PD CSI, Azure Disk CSI, or Ceph RBD) for the snapshot-based parts of the tutorial.
- Working knowledge of how PVCs bind to PVs, since most restore failures are storage-class and topology problems.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain which parts of cluster state Velero captures and which parts it deliberately ignores.
- Install Velero with a node agent and configure BackupStorageLocation and VolumeSnapshotLocation resources declaratively.
- Choose between CSI volume snapshots and Kopia file-level backups for a given workload, and justify the choice.
- Create scheduled backups with sane TTLs, namespace scoping, and label selectors that keep object storage costs bounded.
- Perform a restore into a scratch namespace using namespace remapping, resource filters, and restore hooks.
- Automate a recurring disaster recovery drill and alert on stale backups before an incident happens.

## Context and Motivation

Every team that runs Kubernetes eventually has the same conversation, and it usually happens after an incident: *the namespace is gone, do we have a backup?* Deployments are in Git, so manifests are recoverable. Secrets may be in Git or may not. PersistentVolumeClaims are not in Git in any meaningful way, and the data behind them definitely is not. A cluster that can reschedule a crashed pod is not the same as a cluster that can survive a mistaken `kubectl delete namespace production` or an etcd corruption.

The failure modes are mundane and expensive:

- A namespace is deleted by a bad automation run, taking PVCs and their underlying volumes with it.
- A storage class or CSI driver upgrade corrupts volume attachments and some volumes become unreadable.
- A cluster-wide misconfiguration (an admission webhook that rejects everything, a broken CNI) makes the control plane unusable while the disk is fine.
- A cloud region incident. The data exists, but the cluster, node pools, and IAM bindings must be rebuilt elsewhere.

Volume snapshots alone do not solve this. Snapshots are cheap and fast, but they live in the same account and region as the volume, they are bound to a storage class and availability zone, and they do not include the YAML objects that give the data meaning. What you want is a tool that captures **both** the API objects and the volume data, stores them outside the cluster, and can replay them into a different namespace or a different cluster. That is precisely what Velero does: it is a client of the Kubernetes API that serializes resources to object storage and coordinates volume backups through either CSI snapshots or a node-level file uploader.

The difference between a team that recovers and a team that does not is almost never the tool. It is whether anyone has run the restore before. A backup that has never been restored is a hypothesis, not a backup. This tutorial therefore spends as much time on drills and failure detection as on the backup command itself.

## Core Content

### Why Cluster State Is Harder Than Database State

A database backup is a single, well-defined artifact: one logical dump or one physical file set with known consistency guarantees. Cluster state is a graph of thousands of objects with dependencies that the API server enforces, plus an unbounded set of external resources that it merely references.

Consider what a single `PersistentVolumeClaim` in the `production` namespace depends on: a `StorageClass`, a CSI driver DaemonSet and its controller Deployment, a `VolumeSnapshotClass`, a cloud disk in a specific availability zone, and a `Secret` for a workload that mounts it. Restoring the PVC alone is useless. Restoring everything in the wrong order will produce objects stuck in `Pending` because their dependencies do not exist yet.

Velero solves ordering by replaying resources in a controlled priority sequence rather than the order they were captured: namespaces first, then CRDs and storage-related objects, then workloads, then everything else. It also records metadata about each backup (the Kubernetes and Velero versions, the resource list, volume information) so a restore can be scoped and debugged. What Velero cannot do is guarantee that external dependencies exist. Recreating the CSI driver, the storage class, and the cloud account's IAM roles is your job, and the runbook must say so explicitly.

The second difficulty is consistency. A backup of a live cluster is a point-in-time-ish snapshot of an eventually consistent system: the API server serializes objects one at a time, so a Deployment captured mid-rollout may reference a ReplicaSet that was created after the list call. This is acceptable because Kubernetes is designed to reconcile: a restored Deployment whose ReplicaSet is missing will simply create a new one. The place where consistency actually matters is volume data, which is why volume backup is handled by a separate, quiesce-aware path.

### The Velero Architecture: Server, Node Agent, and Object Storage

Velero is not a single binary doing everything. Understanding its components makes its failure modes legible.

**The Velero server** runs as a Deployment in the `velero` namespace. It exposes a set of custom resources — `Backup`, `Restore`, `Schedule`, `BackupStorageLocation`, `VolumeSnapshotLocation`, `DeleteBackupRequest` — and watches them. When you create a `Backup`, the server's backup controller lists the relevant API objects, streams them as a tarball into object storage, and updates the `Backup` resource's status with phase, item counts, warnings, and errors.

**The node agent** runs as a DaemonSet on every node. It is only needed for file-level volume backups (the uploader formerly known as Restic is now Kopia). When a backup requests file-level volume capture, the node agent mounts the volume's host path, walks the filesystem, encrypts and deduplicates the content with Kopia, and uploads it to object storage independently of the backup tarball. This path does not require CSI snapshot support, which makes it the fallback for NFS, hostPath, and older in-tree storage.

**Plugins** are the provider adapters. `velero-plugin-for-aws`, `-gcp`, `-microsoft-azure`, and `-csi` are initialized as init containers inside the server pod. The object store plugin implements the `BackupStorageLocation`; the volume snapshotter plugin implements `VolumeSnapshotLocation`; the CSI plugin translates Velero's volume backup requests into `VolumeSnapshot` and `VolumeSnapshotContent` objects so any CSI driver can participate without a Velero-specific plugin.

**Object storage is the source of truth.** The cluster holds no backup data. Everything — the resource tarballs, the Kopia repositories, the backup metadata — lives in the bucket. This is the property that makes recovery possible after total cluster loss, and the property that makes bucket lifecycle policy, versioning, and access control part of your disaster recovery design rather than an afterthought.

### Snapshots Versus File-Level Backup

The most consequential design decision in a Velero deployment is which volume path each workload uses, and the correct answer is usually "both, for different workloads".

A **CSI snapshot** is a point-in-time copy of a block device, taken by the storage backend. It is fast, it is consistent with the filesystem state at the moment the snapshot was taken, and restoring it is a volume clone. Its limitations are structural: it requires a CSI driver that implements snapshots, the snapshot lives in the same cloud account and region, and by default it stays in the provider's snapshot service rather than in your bucket. Velero's **snapshot data movement** feature (data mover) closes the last gap by copying the snapshot into object storage, at the cost of extra time and bandwidth.

A **Kopia file-level backup** walks the mounted filesystem through the node agent. It is slower and CPU-hungry, but it works on any volume type, it is deduplicated and incrementally stored across backups, it lands directly in your bucket, and it survives a region loss as long as the bucket is replicated. Its weakness is consistency: files are read while the application may be writing, so databases need a quiesce step or a native logical dump.

The practical rule that holds up in production:

- Databases and anything with its own backup tooling (PostgreSQL, MySQL, Elasticsearch, Kafka) get a native logical dump or snapshot-aware quiesce, captured by a pre-backup hook, and a file-level backup of the dump directory only if the dump is not written elsewhere.
- Stateless application volumes and object stores with small files get file-level Kopia backups.
- Everything else — build caches, scratch volumes — gets nothing. Backing up caches is how teams burn their storage budget and slow every backup to a crawl.

### Installing Velero with Object Storage and a Node Agent

Installation has three parts: credentials as a Secret, the server with plugins and bucket configuration, and the node agent if file-level backups are needed. The CLI's `install` command generates the manifests and applies them, which is fine for a first cluster but not for a fleet — for repeatability, use `velero install --dry-run -o yaml` and commit the output, or install through the Helm chart with values in Git.

Credentials never go into the CLI arguments in a pipeline that logs them. Write a `credentials-velero` file with the provider's standard keys, create the bucket out of band, and let the AWS plugin read the secret. Grant the identity exactly the bucket actions it needs: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`, `s3:AbortMultipartUpload`, plus `s3:GetBucketLocation`. Velero deletes objects during TTL cleanup, so `DeleteObject` is required even for a "backup only" identity.

The important flags are the ones teams get wrong: `--use-node-agent` must be set at install time for Kopia backups, `--default-volumes-to-fs-backup` changes the default for every backup, and `--snapshot-volumes` defaults to true but silently degrades to nothing when no `VolumeSnapshotLocation` exists. Always verify with `velero version` and by reading a `Backup` resource's `status.volumeSnapshotsAttempted` rather than trusting the absence of errors.

### Scoping Backups: Namespaces, Labels, and Cluster Resources

An unscoped backup of a busy cluster is a denial-of-service attack on your own object storage. Velero supports several overlapping scopes, and they compose:

- `--include-namespaces` and `--exclude-namespaces` for namespace-level boundaries.
- `--include-resources` and `--exclude-resources` for resource-type filtering, using `resource.group` format.
- `--selector` for label-based selection, the right tool for backing up a single tenant or application across namespaces.
- `--include-cluster-resources` (true, false, or nil) for cluster-scoped objects such as CRDs, ClusterRoles, and PersistentVolumes.

Cluster-scoped resources deserve a deliberate decision. Including them makes a restore into a fresh cluster self-sufficient, but it also means a restore can overwrite `ClusterRole` and `CRD` definitions that the target cluster already owns. The common production pattern is two schedules: a **cluster-state** schedule with `--include-cluster-resources=true` and a narrow resource list (`crds`, `clusterroles`, `clusterrolebindings`, `storageclasses`, `priorityclasses`, `podsecuritypolicies`), and per-tenant **application** schedules that exclude cluster resources entirely.

Backing up every namespace also captures Helm release secrets, which are large and numerous. Excluding Secrets of type `helm.sh/release.v1` when you manage releases through GitOps is a meaningful size reduction, and it removes a restore hazard where old release state conflicts with the current one.

### Restore Semantics: Remapping, Filters, and Conflict Policy

A restore is not the inverse of a backup. It replays stored objects into a cluster that already has state, and its behaviour depends on three knobs.

**Namespace mapping** rewrites the namespace of every namespaced object and is the single most useful restore feature. `--namespace-mappings production:production-drill` lets you prove that a restore works without touching the live namespace. It does not rewrite references to namespaces inside object specs: a `RoleBinding` subject, a webhook configuration, or an `Ingress` backend still points at the original namespace unless your manifests avoid hardcoded namespaces.

**Resource filters** narrow what comes back: `--include-resources`, `--exclude-resources`, `--selector`, and `--include-namespaces`. Combined with mapping, they let you restore "just the database and its secret" into a scratch namespace to answer a specific question.

**Existing resource policy** decides what happens when an object already exists in the target: `none` (skip, the default), `update` (attempt to patch it), or `patch` (Velero's strategic merge). `update` is what most teams want for partial restores into a live cluster, but it will happily revert a Deployment to its backed-up revision, so it must never be used blindly on the same namespace that serves traffic.

Restore hooks close the consistency gap. A `post.hook.restore.velero.io/command` annotation runs a command inside a container after that container's volume is restored, which is how you replay a database dump or fix ownership on a restored volume. The corresponding `pre.hook.backup.velero.io/command` runs before the volume is captured, which is how you quiesce an application or flush an in-memory store to disk.

### Retention, TTL Economics, and Cost Control

Every `Backup` has a TTL, and when it expires Velero deletes the backup's objects from the bucket, including the Kopia content that no other backup references. Getting retention right is a balance between RPO, compliance, and a storage bill that grows silently.

Kopia backups are incremental and deduplicated, so ten daily backups of the same volume cost little more than one — the expensive part is the first full backup. CSI snapshots, by contrast, are billed by the storage provider per snapshot and per changed block, and they accumulate in the provider account where they are easy to forget. Set a shorter TTL on snapshot-heavy schedules and let the file-level schedule carry the long retention.

A workable default for most teams:

- Hourly application schedule with a 48-hour TTL, retained only for accidental-deletion recovery.
- Daily application schedule with a 30-day TTL.
- Weekly cluster-state schedule with a 90-day TTL, stored in a bucket with versioning and object lock if compliance requires immutability.
- One monthly "cold" schedule whose bucket has a lifecycle rule moving objects to infrequent-access storage.

Bucket-level defence matters as much as TTL. Versioning plus a delete-protection policy prevents a compromised cluster identity from destroying the backup history that would be used to recover from the compromise. If the same credentials that manage the cluster can delete every backup, the DR design has a single point of failure that no amount of scheduling fixes.

### Cross-Cluster Migration and the Disaster Recovery Runbook

Velero's least-known and most valuable capability is restoring into a *different* cluster. Because the backup artifacts live in object storage, a new cluster only needs network access to the bucket and a `BackupStorageLocation` with `accessMode: ReadOnly` so it never writes to or deletes from the source's history. Velero's backup sync then discovers existing backups and lists them locally, and a restore proceeds exactly as it would in the original cluster.

That capability is what makes a real runbook possible, and the runbook is the deliverable that survives staff turnover. A useful one contains, at minimum:

- The exact order of operations to rebuild a cluster from zero: cloud network and node pools, CSI driver, Velero install with the read-only location, then restores in dependency order.
- The bucket name, region, and the identity used, in a document that does not live only inside the cluster being recovered.
- Expected restore durations per namespace, measured during drills rather than guessed.
- The decision rules for partial versus full restore, and who has authority to declare a disaster.
- A named owner and a cadence. Quarterly is the realistic minimum; anything less and the runbook rots.

The drills themselves must be automated and must alert. A CronJob that restores the previous night's backup into a scratch namespace, runs a few assertions, and reports failure is worth more than any dashboard, because it tests the whole chain — credentials, bucket access, snapshot availability, storage class compatibility — on a schedule that does not depend on anyone remembering.

## Code Examples

### Step 1: Install the Velero CLI and Server

Install the CLI locally, create the bucket and credentials file, then install the server with the node agent enabled.

```bash
# Install the CLI (macOS example; use the release tarball on Linux)
brew install velero

# Verify the CLI version
velero version --client-only

# Create the bucket out of band
aws s3api create-bucket \
  --bucket acme-k8s-backups \
  --region eu-central-1 \
  --create-bucket-configuration LocationConstraint=eu-central-1

# Enable versioning so a bad delete can be recovered
aws s3api put-bucket-versioning \
  --bucket acme-k8s-backups \
  --versioning-configuration Status=Enabled
```

Write the credentials file with the standard AWS keys. Do not commit it.

```bash
cat > credentials-velero <<'EOF'
[default]
aws_access_key_id=<access-key>
aws_secret_access_key=<secret-key>
EOF

chmod 600 credentials-velero
```

Install the server with the AWS plugin, an explicit backup location, a snapshot location, and the node agent:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.10.0 \
  --bucket acme-k8s-backups \
  --backup-location-config region=eu-central-1,serverSideEncryption=AES256 \
  --snapshot-location-config region=eu-central-1 \
  --secret-file ./credentials-velero \
  --use-node-agent \
  --default-volumes-to-fs-backup \
  --wait
```

Verify that the components came up before trusting anything:

```bash
kubectl -n velero get deploy,daemonset,pods
kubectl -n velero get backupstoragelocation,volumesnapshotlocation
velero version
```

### Step 2: Declare Storage Locations as Code

Instead of relying on install flags, pin the storage locations in Git so every cluster in the fleet is configured identically. The `Available` phase on the backup location is the health signal to watch.

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: primary
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: acme-k8s-backups
    prefix: clusters/prod-eu
  config:
    region: eu-central-1
    serverSideEncryption: AES256
  accessMode: ReadWrite
  default: true
```

```yaml
apiVersion: velero.io/v1
kind: VolumeSnapshotLocation
metadata:
  name: eu-central-1
  namespace: velero
spec:
  provider: aws
  config:
    region: eu-central-1
```

Apply both, then confirm the location is reachable rather than merely present:

```bash
kubectl apply -f velero-storage-locations.yaml
velero backup-location get
velero snapshot-location get
```

### Step 3: Create a Schedule with Sensible Scoping

A scheduled backup is just a `Schedule` resource. Keep cluster state and application data on separate schedules so their retention can differ.

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: apps-daily
  namespace: velero
spec:
  schedule: "0 2 * * *"
  useOwnerReferencesInBackup: false
  template:
    ttl: 720h
    storageLocation: primary
    includedNamespaces:
      - production
      - staging
    excludedResources:
      - events
      - events.events.k8s.io
    labelSelector:
      matchExpressions:
        - key: backup.acme.io/skip
          operator: DoesNotExist
    snapshotVolumes: true
    defaultVolumesToFsBackup: true
```

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: cluster-state-weekly
  namespace: velero
spec:
  schedule: "0 3 * * 0"
  template:
    ttl: 2160h
    storageLocation: primary
    includedResources:
      - customresourcedefinitions
      - clusterroles
      - clusterrolebindings
      - storageclasses
      - volumeSnapshotClasses
      - priorityclasses
    includeClusterResources: true
    snapshotVolumes: false
```

Apply and verify, then trigger one run immediately instead of waiting for the cron expression:

```bash
kubectl apply -f velero-schedules.yaml
velero schedule get
velero backup create apps-daily-manual --from-schedule apps-daily --wait
velero backup describe apps-daily-manual --details
```

### Step 4: Back Up a Stateful Workload with Quiesce Hooks

For a database, a volume snapshot taken mid-write can capture a torn state. Drain the write path first with a pre-backup hook, and verify that the backup actually contains snapshots rather than silently skipping them.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: orders-postgres
  namespace: production
spec:
  serviceName: orders-postgres
  replicas: 1
  selector:
    matchLabels:
      app: orders-postgres
  template:
    metadata:
      labels:
        app: orders-postgres
      annotations:
        pre.hook.backup.velero.io/container: postgres
        pre.hook.backup.velero.io/command: '["/bin/sh", "-c", "psql -U postgres -c \"CHECKPOINT;\""]'
        pre.hook.backup.velero.io/timeout: 60s
        post.hook.backup.velero.io/container: postgres
        post.hook.backup.velero.io/command: '["/bin/sh", "-c", "echo backup-finished > /tmp/velero-last-backup"]'
    spec:
      containers:
        - name: postgres
          image: postgres:16
          args:
            - -c
            - archive_mode=on
            - -c
            - archive_command=test ! -f /var/lib/postgresql/archive/%f
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: orders-postgres-secret
                  key: password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

Create the backup and inspect volume results, not just the phase:

```bash
velero backup create orders-postgres-nightly \
  --include-namespaces production \
  --selector app=orders-postgres \
  --snapshot-volumes \
  --ttl 336h \
  --wait

velero backup describe orders-postgres-nightly --details
velero backup logs orders-postgres-nightly | tail -40
```

A healthy backup reports `Phase: Completed` with a non-zero `volumeSnapshotsAttempted` and matching `volumeSnapshotsCompleted`. A completed backup with zero attempts means the snapshot path never ran: check the `VolumeSnapshotLocation`, the CSI driver, and whether the PVC's storage class supports snapshots.

### Step 5: Restore into a Scratch Namespace

Never test a restore against the namespace you are protecting. Remap into a drill namespace, verify the data, then delete the drill.

```bash
# Restore the whole namespace under a new name
velero restore create orders-postgres-drill \
  --from-backup orders-postgres-nightly \
  --namespace-mappings production:orders-postgres-drill \
  --existing-resource-policy none \
  --wait

velero restore describe orders-postgres-drill --details
velero restore logs orders-postgres-drill
```

Confirm the restored workload actually serves data, which is the only evidence that matters:

```bash
kubectl -n orders-postgres-drill get statefulset,pods,pvc
kubectl -n orders-postgres-drill exec -it orders-postgres-0 -- \
  psql -U postgres -c "select count(*) from orders;"

# Clean up the drill environment
kubectl delete namespace orders-postgres-drill
```

If the restore reports partial failures, the usual causes are a missing `StorageClass`, a PVC whose requested size exceeds the class's limit, or a `VolumeSnapshotClass` that does not exist in the target cluster. `velero restore describe --details` lists per-resource errors and is the first place to look.

### Step 6: Automate the Drill and Alert on Stale Backups

A backup that is never verified decays silently. Run a restore drill on a schedule and export Velero's metrics so a stale backup pages someone before an incident does.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: velero-restore-drill
  namespace: velero
spec:
  schedule: "0 6 * * 1"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 1
      template:
        spec:
          serviceAccountName: velero-drill
          restartPolicy: Never
          containers:
            - name: drill
              image: bitnami/kubectl:1.30
              command:
                - /bin/sh
                - -c
                - |
                  set -eu
                  LATEST=$(velero backup get -o json | jq -r '[.items[] | select(.status.phase=="Completed")] | sort_by(.metadata.creationTimestamp) | last | .metadata.name')
                  echo "drilling backup: ${LATEST}"
                  velero restore create "drill-${LATEST}" \
                    --from-backup "${LATEST}" \
                    --namespace-mappings production:drill-scratch \
                    --wait
                  velero restore describe "drill-${LATEST}" --details | grep -q "Phase:  Completed"
                  kubectl -n drill-scratch rollout status deploy/orders-api --timeout=180s
                  kubectl delete namespace drill-scratch --wait=false
```

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-backup-health
  namespace: monitoring
spec:
  groups:
    - name: velero.rules
      rules:
        - alert: VeleroBackupFailed
          expr: velero_backup_last_status{job="velero"} != 1
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: Velero backup failed for schedule {{ $labels.schedule }}
        - alert: VeleroBackupStale
          expr: (time() - velero_backup_last_successful_timestamp{job="velero"}) > 93600
          for: 30m
          labels:
            severity: critical
          annotations:
            summary: No successful Velero backup in 26 hours
```

Scrape the `velero` Deployment's metrics endpoint on port 8085, then verify that both alerts fire when you deliberately break the credentials in a staging cluster. An alert rule that has never fired is as unproven as a restore that has never run.

## Key Insights

- **A backup is only proven by a restore.** If your drill has not run this quarter, you do not have a disaster recovery plan; you have a backup schedule. Automate the drill and alert on its failures.
- **Object storage is the system of record, so protect it.** Enable bucket versioning, restrict delete permissions, and consider object lock for compliance workloads. A cluster identity that can wipe the bucket destroys the ability to recover from that same compromise.
- **Split cluster state from application data into separate schedules.** Their retention, size, and restore semantics differ, and mixing them means one TTL setting is always wrong.
- **Snapshots are not offsite.** A CSI snapshot lives in the provider account and region. Use snapshot data movement or Kopia file-level backups when the bucket is your durable copy.
- **Quiesce databases before capture.** A pre-backup hook that issues a checkpoint, or a native logical dump written to a volume, is the difference between a restore that starts and one that needs recovery tooling.
- **Excluding events and Helm release secrets keeps backups small and restores predictable.** Both are high-volume, low-value artifacts in a restore scenario.
- **Namespace remapping is the safest way to test.** Always restore into a scratch namespace first; `existing-resource-policy: update` against a live namespace will revert workloads.
- **Cluster-scoped resources are a judgement call.** Include them for cluster reconstruction; exclude them for tenant restores. Never let a tenant restore overwrite shared CRDs.
- **Node agent resource limits are a real constraint.** Kopia backup saturates CPU and disk I/O on the node; set `--node-agent` resource requests and run large backups during low-traffic windows.

## Next Steps

- Learn the operator pattern to automate restore drills and backup verification as custom resources, building on the operator tutorial in this library.
- Study storage and persistent volume internals to understand why snapshot restores fail across storage classes and availability zones.
- Apply the production best practices guide's vertical scaling, PDB, and observability guidance to harden the cluster you just made recoverable.
- Practice cross-cluster migration by restoring a backup into a Kind cluster that shares only the bucket, which is the closest safe approximation of a regional failover.
- Review the platform engineering syllabus for the broader reliability model around capacity, upgrades, and multi-tenancy.

## Conclusion

You have built a real backup and disaster recovery capability rather than a scheduled command. You installed Velero with a node agent, declared storage locations as code, scoped schedules by namespace and resource type, captured a stateful workload with a quiesce hook, restored it into a scratch namespace through remapping, and automated a drill with alerting on stale backups.

The mental model to keep is that Kubernetes protects availability, not durability. Durability comes from artifacts held outside the cluster, protected from the cluster's own identities, and proven by restores that run on a schedule nobody has to remember. Treat the runbook as production code: review it, test it, and assign it an owner.

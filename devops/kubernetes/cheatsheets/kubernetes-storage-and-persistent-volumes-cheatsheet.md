---
title: "Kubernetes Storage and Persistent Volumes Cheatsheet"
description: "A quick reference for Kubernetes persistent storage: PV and PVC lifecycle, StorageClasses, CSI drivers, volume expansion, snapshots, and mount debugging."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Kubernetes Storage and Persistent Volumes Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| List claims with their bound volume | `kubectl get pvc -n <ns> -o wide` | Shows volume name, capacity, access modes, and the StorageClass used |
| Find why a claim stays Pending | `kubectl describe pvc <pvc> -n <ns>` | Events name the provisioner and the reason: no matching PV, topology conflict, missing secret |
| List volumes with their claim | `kubectl get pv -o custom-columns=NAME:.metadata.name,CAP:.spec.capacity.storage,CLASS:.spec.storageClassName,STATUS:.status.phase` | Spot Released and Failed volumes during cleanup |
| List storage classes | `kubectl get storageclass` | Shows provisioner, reclaim policy, binding mode, and the default marker |
| Read the default class annotation | `kubectl get storageclass -o jsonpath="{.items[0].metadata.annotations.storageclass\.kubernetes\.io/is-default-class}"` | Only one class should carry the default annotation per cluster |
| Identify the CSI driver behind a volume | `kubectl get pv <pv> -o jsonpath='{.spec.csi.driver}'` | Confirms which driver owns the volume and its topology keys |
| Expand a claim | `kubectl patch pvc <pvc> -n <ns> -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'` | Requires `allowVolumeExpansion: true` on the StorageClass |
| Track a resize in progress | `kubectl get pvc <pvc> -n <ns> -o jsonpath='{.status.conditions}'` | A FileSystemResizePending condition means the node still has to grow the filesystem |
| Check where a local volume lives | `kubectl get pv <pv> -o jsonpath='{.spec.nodeAffinity}'` | Local volumes pin every consumer to one node |
| Read a pod's volume sources | `kubectl get pod <pod> -o jsonpath='{.spec.volumes}'` | Lists every volume and its claimName or inline source |
| Debug a pod stuck in ContainerCreating | `kubectl describe pod <pod>` | FailedMount and FailedAttachVolume events explain the stall |
| List CSI drivers | `kubectl get csidrivers` | AttachRequired and PodInfoOnMount decide how pods consume the storage |
| List snapshots | `kubectl get volumesnapshot -A` | Requires the snapshot controller and the snapshot CRDs |
| Copy data out of a volume | `kubectl cp <ns>/<pod>:/data ./backup` | Uses tar under the hood, so the image must include tar |
| Check kubelet volume stats | `kubectl get --raw /api/v1/nodes/<node>/proxy/stats/summary` | Filesystem capacity, used bytes, and inode counts per node |

## Common Commands

### Volume and Claim Inspection

```bash
# Every claim in the cluster with its bound volume and capacity
kubectl get pvc -A -o wide

# Volumes that are no longer bound to a claim
kubectl get pv -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,CLAIM:.spec.claimRef.name

# Full spec and status of one claim
kubectl get pvc data-postgres-0 -n databases -o yaml

# Which pods consume a given claim
kubectl get pods -A -o jsonpath="{range .items[?(@.spec.volumes[*].persistentVolumeClaim.claimName=='data-postgres-0')]}{.metadata.namespace}/{.metadata.name}{'\n'}{end}"

# Storage classes with their provisioners and binding modes
kubectl get storageclass -o custom-columns=NAME:.metadata.name,PROVISIONER:.provisioner,RECLAIM:.reclaimPolicy,BINDING:.volumeBindingMode,EXPAND:.allowVolumeExpansion
```

### StorageClass and Provisioning

```bash
# Force a one-off volume from a class without writing a PVC
kubectl create -f - <<'YAML'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: scratch
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 5Gi
YAML

# Show the provisioner responsible for a Pending claim
kubectl get events -n <ns> --field-selector involvedObject.name=<pvc> --sort-by=.lastTimestamp

# Confirm the default class in a cluster
kubectl get storageclass -o jsonpath="{range .items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=='true')]}{.metadata.name}{'\n'}{end}"

# Inspect a CSI driver's capabilities
kubectl get csidriver <driver>.csi.example.com -o yaml
```

### Mount and Attach Debugging

```bash
# Events for a single pod, newest last
kubectl get events --field-selector involvedObject.name=<pod> --sort-by=.lastTimestamp

# Pods that cannot mount a volume across the whole cluster
kubectl get events -A --field-selector reason=FailedMount

# Attach and detach problems usually point at the cloud controller or CSI controller
kubectl get events -A --field-selector reason=FailedAttachVolume

# Talk to the CSI driver pod directly when the controller is unhappy
kubectl get pods -n kube-system -l app=csi-<driver>
kubectl logs -n kube-system csi-<driver>-controller-0 -c csi-provisioner --tail=100

# Verify the kubelet registered the driver on a specific node
kubectl get csinode <node> -o yaml

# Inspect leases and VolumeAttachments that block a reschedule
kubectl get volumeattachment -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,PV:.spec.source.persistentVolumeName,DELETED:.metadata.deletionTimestamp
```

### Resizing and Reclaiming Volumes

```bash
# Grow a claim (shrink is never supported)
kubectl patch pvc data-postgres-0 -n databases -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'

# Watch the capacity reported in status catch up with the request
kubectl get pvc data-postgres-0 -n databases -o jsonpath='{.spec.resources.requests.storage}{" -> "}{.status.capacity.storage}{"\n"}'

# A claim that is Released keeps its data until the PV is deleted
kubectl get pv -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,RECLAIM:.spec.persistentVolumeReclaimPolicy

# Delete a Released volume after the retention window
kubectl delete pv <pv>

# Detach a stuck volume attachment before deleting the node object
kubectl delete volumeattachment <attachment>
```

### Snapshots and Restores

```bash
# Confirm the snapshot CRDs and controller are installed
kubectl get crd volumesnapshots.snapshot.storage.k8s.io
kubectl get pods -n kube-system -l app=snapshot-controller

# Take a snapshot of a bound claim
kubectl apply -f volumesnapshot.yaml

# Poll readiness before restoring from it
kubectl get volumesnapshot db-snapshot -n databases -o jsonpath='{.status.readyToUse}'

# Snapshot contents are owned by the CSI driver, not by csi-snapshotter
kubectl get volumesnapshotcontent -o custom-columns=NAME:.metadata.name,SIZE:.status.restoreSize,CLASS:.spec.volumeSnapshotClassName
```

### In-Pod Volume Checks

```bash
# Confirm the filesystem is mounted where the application expects it
kubectl exec -n databases postgres-0 -- df -h /var/lib/postgresql/data

# Inspect mount flags and the device behind the mount
kubectl exec -n databases postgres-0 -- findmnt /var/lib/postgresql/data

# Check inodes, not just bytes
kubectl exec -n databases postgres-0 -- df -i /var/lib/postgresql/data

# Verify permissions and ownership assigned by the CSI driver
kubectl exec -n databases postgres-0 -- ls -ld /var/lib/postgresql/data

# Disk pressure on a node surfaces here before pods are evicted
kubectl describe node <node>
```

## Code Snippets

### StorageClass with Delayed Binding and Expansion

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  fsType: ext4
  encrypted: "true"
reclaimPolicy: Delete
allowVolumeExpansion: true
# WaitForFirstConsumer keeps the volume in the same zone as the pod that claims it
volumeBindingMode: WaitForFirstConsumer
mountOptions:
  - noatime
```

### Static PersistentVolume on a Local Disk

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-disk-node-a
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-disk
  local:
    path: /mnt/disks/ssd0
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - node-a
```

### Claim Pinned to a Static Volume

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-local
spec:
  accessModes:
    - ReadWriteOnce
  # Empty string opts out of dynamic provisioning entirely
  storageClassName: ""
  volumeName: local-disk-node-a
  resources:
    requests:
      storage: 100Gi
```

### StatefulSet volumeClaimTemplates

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
spec:
  serviceName: postgres-headless
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  # Each replica gets its own claim: data-postgres-0, data-postgres-1, ...
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

### Pod with a Generic Ephemeral Volume

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: report-worker
spec:
  containers:
    - name: worker
      image: example/report-worker:2.1.0
      volumeMounts:
        - name: scratch
          mountPath: /scratch
  volumes:
    # The claim is created and deleted with the pod, but it still comes
    # from a real StorageClass and is billed and scheduled like any volume
    - name: scratch
      ephemeral:
        volumeClaimTemplate:
          spec:
            accessModes:
              - ReadWriteOnce
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 20Gi
```

### Init Container Copying a Seed Dataset

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: seeded-app
spec:
  initContainers:
    - name: seed
      image: busybox:1.36
      command:
        - sh
        - -c
        - |
          if [ ! -f /data/.seeded ]; then
            cp -a /seed/. /data/
            touch /data/.seeded
          fi
      volumeMounts:
        - name: data
          mountPath: /data
        - name: seed
          mountPath: /seed
          readOnly: true
  containers:
    - name: app
      image: example/app:1.4.0
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: app-data
    - name: seed
      configMap:
        name: seed-dataset
```

### VolumeSnapshot and Restore

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: db-snapshot
  namespace: databases
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: data-postgres-0
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-postgres-0-restored
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
  dataSource:
    name: db-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

### Access Modes and Reclaim Policies Reference

```text
Access modes (spec.accessModes)
  ReadWriteOnce (RWO)   one node may mount the volume read-write
  ReadOnlyMany  (ROX)   many nodes may mount it read-only
  ReadWriteMany (RWX)   many nodes may mount it read-write (NFS, CephFS, EFS)
  ReadWriteOncePod      a single pod may mount it read-write (Kubernetes 1.27+)

Reclaim policies (spec.persistentVolumeReclaimPolicy)
  Retain    keep the volume and its data after the claim is deleted
  Delete    remove the backing storage together with the claim
  Recycle   deprecated, do not use

Phases (status.phase)
  Available  a free volume waiting for a claim
  Bound      claim and volume are paired
  Released   the claim was deleted while the policy is Retain
  Failed     automatic reclamation failed
```

### Storage Debugging Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: storage-debug
  namespace: databases
spec:
  containers:
    - name: shell
      image: nicolaka/netshoot:latest
      command: ["sleep", "infinity"]
      securityContext:
        runAsUser: 0
      volumeMounts:
        - name: data
          mountPath: /probe
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: data-postgres-0
  # Reuse the workload's scheduling constraints so topology matches
  nodeSelector:
    kubernetes.io/hostname: node-a
```

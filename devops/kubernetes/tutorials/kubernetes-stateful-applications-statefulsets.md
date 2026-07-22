---
title: "Kubernetes Stateful Applications: Deploying Databases with StatefulSets"
description: "A comprehensive tutorial on running stateful workloads on Kubernetes using StatefulSets, covering headless services, persistent storage with volumeClaimTemplates, and deploying PostgreSQL and Redis in production."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Kubernetes Stateful Applications: Deploying Databases with StatefulSets

## Summary

This tutorial teaches you how to run stateful workloads on Kubernetes using StatefulSets. You will learn the fundamental differences between StatefulSets and Deployments, how headless services provide stable network identities, how to use volumeClaimTemplates for persistent storage, and how to deploy PostgreSQL and Redis as stateful applications on your cluster.

## Target Audience

- DevOps Engineers, Platform Engineers, SREs, and Backend Developers.
- Expected developer level: Advanced (familiarity with Kubernetes concepts like Pods, Deployments, Services, and Persistent Volumes is required).

## Prerequisites

- A working Kubernetes cluster (Minikube, Kind, or a cloud-based cluster).
- kubectl CLI installed and configured.
- Basic understanding of Kubernetes concepts: Pods, Deployments, Services, Persistent Volumes, and Persistent Volume Claims.
- Docker installed for building images (if following along with custom images).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain when to use StatefulSets instead of Deployments.
- Create headless Services for stable network identity.
- Use volumeClaimTemplates for dynamic persistent storage provisioning.
- Deploy PostgreSQL as a stateful application with persistent storage.
- Deploy Redis as a stateful application with data persistence.
- Scale and update StatefulSets safely.
- Apply production considerations for stateful workloads.

## Context and Motivation

Most applications in Kubernetes are stateless — they can be scaled up, down, or rolled back without data loss concerns. Databases, caches, queues, and other stateful workloads behave differently: each instance has a unique identity, relies on persistent storage, and may require ordered startup and shutdown sequences.

Kubernetes provides the **StatefulSet** workload object specifically for these scenarios. Unlike Deployments, StatefulSets guarantee stable network identities, ordered Pod creation and termination, and dedicated persistent storage per replica. Without StatefulSets, running databases like PostgreSQL or Redis on Kubernetes would require complex workarounds.

Understanding StatefulSets is essential for anyone moving beyond stateless microservices into production-grade, stateful Kubernetes deployments.

## Core Content

### StatefulSets vs Deployments

A **Deployment** is designed for stateless applications. All Pods in a Deployment are interchangeable — they share the same identity, are assigned random names (e.g., `my-app-6f8d4c7b9-a1b2c`), and can be replaced without consequence.

A **StatefulSet** differs in three fundamental ways:

| Aspect | Deployment | StatefulSet |
|--------|-----------|-------------|
| Pod naming | Random hash suffix | Ordinal index (`-0`, `-1`, `-2`) |
| Network identity | Ephemeral, recreated on restart | Stable across rescheduling |
| Storage | Shared or ephemeral | Dedicated PVC per Pod via `volumeClaimTemplates` |
| Scaling | Any order | Ordered (0, 1, 2, ...) |
| Rolling updates | Parallel or random | Ordered (N-1, N-2, ..., 0) |

StatefulSets are the right choice when your application requires:

- **Stable, unique network identifiers** — each Pod keeps its hostname across rescheduling.
- **Persistent, dedicated storage** — each Pod gets its own PVC that stays attached across restarts.
- **Ordered, graceful deployment and scaling** — Pods are created one at a time from index 0 upward, and terminated from highest index downward.

### Headless Services for Stable Network Identity

A headless Service (`.spec.clusterIP: None`) enables DNS-based Pod discovery without load balancing. Each Pod in a StatefulSet behind a headless Service gets a DNS record in the form:

```text
<pod-name>.<service-name>.<namespace>.svc.cluster.local
```

For a StatefulSet named `postgres` with 3 replicas behind a headless service `postgres-svc` in the `database` namespace, the DNS records would be:

```text
postgres-0.postgres-svc.database.svc.cluster.local
postgres-1.postgres-svc.database.svc.cluster.local
postgres-2.postgres-svc.database.svc.cluster.local
```

Applications use these stable DNS names to connect to specific instances — critical for database replication where each node must be addressable individually.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-svc
  labels:
    app: postgres
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    name: postgres
```

### volumeClaimTemplates for Persistent Storage

The `volumeClaimTemplates` field in a StatefulSet spec defines a template for creating Persistent Volume Claims (PVCs) for each replica. When a StatefulSet is created with 3 replicas, it creates 3 PVCs — one for each Pod:

```text
postgres-data-postgres-0
postgres-data-postgres-1
postgres-data-postgres-2
```

These PVCs persist even if the Pods are deleted or rescheduled, ensuring data survives Pod failures.

```yaml
volumeClaimTemplates:
- metadata:
    name: data
  spec:
    accessModes: ["ReadWriteOnce"]
    resources:
      requests:
        storage: 10Gi
    storageClassName: standard
```

### Deploying PostgreSQL with StatefulSet

Let us build a complete PostgreSQL deployment step by step.

#### Step 1: Create a Namespace

```bash
kubectl create namespace database
```

#### Step 2: Create a ConfigMap for PostgreSQL Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: database
data:
  postgresql.conf: |
    max_connections = 200
    shared_buffers = 256MB
    work_mem = 16MB
    wal_level = replica
    max_wal_senders = 5
```

#### Step 3: Create a Secret for Credentials

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: database
type: Opaque
data:
  POSTGRES_USER: cG9zdGdyZXM=
  POSTGRES_PASSWORD: c3VwZXJzZWNyZXQ=
  POSTGRES_DB: bXlkYg==
```

The base64-encoded values decode to `postgres`, `supersecret`, and `mydb`.

#### Step 4: Create a Headless Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-svc
  namespace: database
  labels:
    app: postgres
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
    name: postgres
```

#### Step 5: Create the StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres-svc
  replicas: 1
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
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_PASSWORD
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_DB
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
          subPath: pgdata
        - name: config
          mountPath: /etc/postgresql/postgresql.conf
          subPath: postgresql.conf
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1"
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres"]
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: postgres-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

Key details in this StatefulSet:

- `serviceName: postgres-svc` links the StatefulSet to the headless service.
- `volumeClaimTemplates` creates a dedicated 10 GiB PVC for each replica.
- The ConfigMap mounts `postgresql.conf` for custom configuration.
- Health probes use `pg_isready` to verify database readiness.
- Resource requests and limits prevent noisy-neighbor issues.

#### Step 6: Apply and Verify

```bash
kubectl apply -f postgres-config.yaml
kubectl apply -f postgres-secret.yaml
kubectl apply -f postgres-svc.yaml
kubectl apply -f postgres-sts.yaml

# Check the StatefulSet
kubectl get statefulset -n database
kubectl get pods -n database -w

# Verify the PVC was created
kubectl get pvc -n database

# Connect to PostgreSQL
kubectl exec -it -n database postgres-0 -- psql -U postgres -d mydb
```

### Deploying Redis with StatefulSet

Redis benefits from StatefulSets when persistence is enabled or when running Redis Cluster with data sharding.

#### Step 1: Create a ConfigMap for Redis Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: database
data:
  redis.conf: |
    appendonly yes
    appendfsync everysec
    save 900 1
    save 300 10
    save 60 10000
    maxmemory 256mb
    maxmemory-policy allkeys-lru
```

#### Step 2: Create a Headless Service for Redis

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-svc
  namespace: database
  labels:
    app: redis
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
    name: redis
```

#### Step 3: Create the Redis StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: database
spec:
  serviceName: redis-svc
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - /usr/local/etc/redis/redis.conf
        ports:
        - containerPort: 6379
          name: redis
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /usr/local/etc/redis
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["redis-cli", "ping"]
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi
      storageClassName: standard
```

#### Step 4: Apply and Verify

```bash
kubectl apply -f redis-config.yaml
kubectl apply -f redis-svc.yaml
kubectl apply -f redis-sts.yaml

# Verify
kubectl get statefulset -n database redis
kubectl get pods -n database -l app=redis

# Test connectivity
kubectl exec -it -n database redis-0 -- redis-cli ping
```

### Scaling StatefulSets

Scaling a StatefulSet is similar to scaling a Deployment, but the process is ordered.

```bash
# Scale up to 3 replicas (creates postgres-1, then postgres-2)
kubectl scale statefulset postgres -n database --replicas=3

# Watch the ordered creation
kubectl get pods -n database -l app=postgres -w

# Scale down (terminates postgres-2 first, then postgres-1)
kubectl scale statefulset postgres -n database --replicas=1
```

**Important**: Scaling a stateful application like a database requires careful planning. Adding replicas to PostgreSQL does not automatically configure replication — you need to set up streaming replication separately. For production databases, use an operator like CloudNativePG or Crunchy Data PostgreSQL Operator.

### Updating StatefulSets

StatefulSets support rolling updates with ordered Pod termination.

```bash
# Set the image to a new version
kubectl set image statefulset/postgres -n database postgres=postgres:16.2

# The update proceeds in reverse order: postgres-2, postgres-1, postgres-0
kubectl rollout status statefulset/postgres -n database
```

Use `spec.updateStrategy.rollingUpdate.podManagementPolicy: OrderedReady` (default) for ordered updates, or `Parallel` for faster updates when your application can handle them.

For canary-style updates, use `spec.updateStrategy.type: OnDelete` to manually delete specific Pods for selective updates.

## Code Examples

### Complete PostgreSQL Deployment Script

Save the following as a single YAML file for quick deployment:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: database
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: database
data:
  postgresql.conf: |
    max_connections = 200
    shared_buffers = 256MB
    work_mem = 16MB
    wal_level = replica
    max_wal_senders = 5
---
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: database
type: Opaque
data:
  POSTGRES_USER: cG9zdGdyZXM=
  POSTGRES_PASSWORD: c3VwZXJzZWNyZXQ=
  POSTGRES_DB: bXlkYg==
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-svc
  namespace: database
  labels:
    app: postgres
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
    name: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres-svc
  replicas: 1
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
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_PASSWORD
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_DB
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
          subPath: pgdata
        - name: config
          mountPath: /etc/postgresql/postgresql.conf
          subPath: postgresql.conf
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1"
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres"]
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: postgres-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

### Complete Redis Deployment Script

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: database
data:
  redis.conf: |
    appendonly yes
    appendfsync everysec
    save 900 1
    save 300 10
    save 60 10000
    maxmemory 256mb
    maxmemory-policy allkeys-lru
---
apiVersion: v1
kind: Service
metadata:
  name: redis-svc
  namespace: database
  labels:
    app: redis
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
    name: redis
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: database
spec:
  serviceName: redis-svc
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - /usr/local/etc/redis/redis.conf
        ports:
        - containerPort: 6379
          name: redis
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /usr/local/etc/redis
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["redis-cli", "ping"]
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi
```

### Testing Application Connectivity

```bash
# From a temporary pod, connect to PostgreSQL using DNS
kubectl run pg-test --image=postgres:16 -it --rm --restart=Never --   psql -h postgres-0.postgres-svc.database.svc.cluster.local -U postgres -d mydb

# From a temporary pod, connect to Redis using DNS
kubectl run redis-test --image=redis:7-alpine -it --rm --restart=Never --   redis-cli -h redis-0.redis-svc.database.svc.cluster.local ping
```

## Key Insights

- **Use StatefulSets only when necessary**: Stateless applications should always use Deployments. Reserve StatefulSets for workloads that require stable network identity and dedicated persistent storage — databases, message queues, key-value stores, and distributed systems.
- **volumeClaimTemplates do not support retroactive changes**: Once a StatefulSet is created, you cannot modify the `volumeClaimTemplates` spec. To change storage size or storage class, you must create a new StatefulSet and migrate data.
- **Headless Services are required**: A StatefulSet without a headless service cannot provide stable DNS names. Always create a `ClusterIP: None` Service with a selector matching the StatefulSet Pod labels.
- **Scaling stateful applications is not trivial**: Adding replicas to a database StatefulSet does not automatically configure replication. You must set up replication manually or use an operator. Scaling down can cause data loss if PVCs are deleted — set `spec.persistentVolumeClaimRetentionPolicy` when using Kubernetes 1.27+.
- **Pod identity is ordinal, not content-aware**: `postgres-0` is always the first Pod. If `postgres-0` fails and gets rescheduled, the new Pod with the same identity may not have the same data. Use `spec.podManagementPolicy: Parallel` with caution.
- **Backup strategy matters**: PVCs persist across Pod restarts but can be accidentally deleted. Implement regular backups using tools like `pg_dump` for PostgreSQL or `redis-cli --rdb` for Redis, and store backups off-cluster.
- **Use operators for production databases**: For PostgreSQL, consider CloudNativePG, Crunchy Data, or Zalando Postgres Operator. For Redis, consider the Redis Operator or Redis Enterprise. These operators handle backups, replication, failover, and upgrades automatically.

## Next Steps

- Learn about **Kubernetes Operators** and how they automate stateful workload management (see [OperatorHub.io](https://operatorhub.io/)).
- Explore **Kubernetes Storage Classes and dynamic provisioning** for different cloud providers.
- Study **Kubernetes Security** — Pod Security Standards, Network Policies, and Secrets management for database workloads.
- Try deploying a **Redis Cluster with multiple StatefulSet replicas** for a production caching tier.
- Read the existing [Kubernetes Production Best Practices Guide](../guides/kubernetes-production-best-practices.md) for operational guidance.

## Conclusion

StatefulSets are the primary mechanism for running stateful workloads on Kubernetes. In this tutorial, you learned the key differences between StatefulSets and Deployments, how headless services provide stable network identity, and how to use volumeClaimTemplates for persistent storage. You deployed PostgreSQL and Redis as stateful applications with health checks, resource limits, and production-ready configurations. You also learned about scaling considerations and the importance of using operators for production database deployments. With this foundation, you can confidently run stateful workloads on any Kubernetes cluster.

---
title: "Redis High Availability Guide"
description: "A comprehensive guide to building highly available Redis deployments — master-replica replication, Redis Sentinel for automatic failover, Redis Cluster for horizontal scaling, HA-aware client configuration, and production best practices for uptime and data safety."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Redis High Availability Guide

## Introduction

Redis is an in-memory data store famous for sub-millisecond latency, but its speed comes with a fundamental operational challenge: everything lives in RAM on a single node. When that node crashes, reboots, or becomes unreachable, every request that depends on it fails. In production, a Redis outage is rarely just an inconvenience — it can mean failed payments, stale caches served to millions of users, or dropped background jobs.

High availability (HA) is the discipline of designing a system so that the failure of any single component does not cause an outage. For Redis, HA is built in three layers, each solving a different problem:

- **Replication** (master-replica) keeps redundant copies of the dataset so a replica can take over if the master dies, and it offloads read traffic.
- **Redis Sentinel** adds automated monitoring and failover: when the master becomes unreachable, Sentinel promotes a healthy replica to master automatically — no human intervention required.
- **Redis Cluster** shards data across multiple masters (each with its own replicas) to scale beyond a single node's memory while remaining available during node failures.

These three layers compose into a maturity ladder. A small service may run a single replica and call it a day; a critical payment backend runs Sentinel-managed replicas across availability zones; a large platform shards with Cluster and treats Sentinel as the stepping stone that taught it the operational lessons. This guide walks through each layer, presents the operational best practices that keep HA configurations from failing in production, and ends with concrete implementation steps to build, test, and monitor a resilient Redis deployment.

## Best Practices

### 1. Run at Least One Replica in Production

Replication is the foundation of every HA layer in Redis. A master with no replicas is a single point of failure: when it dies, the only recovery path is restarting it (with whatever data survived persistence). A master with one or more replicas can fail over, and the replicas also absorb read traffic and serve as warm standbys for backups. As a rule of thumb, production deployments should run at least one replica, and critical deployments should run two — one for failover and one to remain available while the first replica is being promoted or resynced.

### 2. Deploy Sentinel as an Odd-Numbered Quorum

Sentinel decides whether the master is really down by collecting votes, which means it needs a majority to avoid split-brain decisions. Run **3 or 5 Sentinel processes** (on separate hosts, ideally separate failure domains) so that a majority can always be formed even when one or two Sentinels are unreachable. Never run a single Sentinel — it becomes the single point of failure you were trying to eliminate, and it cannot form a majority on its own.

### 3. Keep the Sentinel `quorum` Below Half the Sentinel Count

The `quorum` option is the number of Sentinels that must agree the master is unreachable before a failover is *initiated*. It is deliberately a minority value: with 3 Sentinels, `quorum 2` means "two Sentinels agree" — but a majority of 2 is also required to actually *elect* a leader and perform the promotion. Setting `quorum` equal to or above half the Sentinel count makes failover impossible during partitions that split the Sentinel group evenly, which defeats the purpose of HA.

### 4. Use `min-replicas-to-write` to Prevent Stale Writes

During a partition, a master that has lost contact with its replicas can keep accepting writes that will never reach the promoted replica — those writes are silently lost after failover. Configure `min-replicas-to-write 1` (and a matching `min-replicas-max-lag`) on the master so it refuses writes when it cannot see a healthy replica. This trades a brief write outage during the partition for a strong guarantee that acknowledged writes survive the failover.

### 5. Use Consistent Authentication on Every Node

Authentication is a frequent source of HA failures. If `requirepass` is set on the master but `masterauth` is missing on a replica, the replica cannot reconnect after a restart. If Sentinel does not know the password, it cannot talk to the master at all. Set `requirepass` and `masterauth` to the same value on every master and replica, and mirror the password in every `sentinel auth-pass` directive, so promotions and reconnects never stall on credentials.

### 6. Enable Persistence on Replicas Too

A replica that is promoted to master during failover must serve the full dataset immediately. If persistence is disabled on the replica, the new master starts empty and replicates nothing — or, worse, the old master's restart could trigger a full resync that wipes it. Configure RDB snapshots (and preferably AOF) on replicas exactly as on the master, and verify with `INFO persistence` that each node is actually writing its own durable copy.

### 7. Control Promotion Order with `replica-priority`

When Sentinel chooses which replica to promote, it prefers the lowest `replica-priority` value (0 means the replica is never promoted). Use this to encode your operational preferences: a replica in the same rack as clients, or one with more RAM and a faster disk, gets priority `100` while a slower cross-region replica gets `200`. This makes failover deterministic instead of leaving the choice to arbitrary node ordering.

### 8. Keep `maxmemory` and Eviction Policy Consistent Across Nodes

A promoted replica inherits the master's role, including its memory pressure. If the replica has a smaller `maxmemory` or a different eviction policy than the master, it may evict data aggressively right after promotion — or crash with OOM errors. Standardize `maxmemory`, `maxmemory-policy`, and `maxmemory-samples` across all nodes in the topology so role changes do not change data-retention behavior.

### 9. Use HA-Aware Clients

Client libraries must understand the topology you deploy. A plain client pointed at a master IP will not follow a failover: it keeps sending requests to the dead node. Use a Sentinel-aware client (for example, `ioredis` with `sentinels` configured, or `node-redis` with `sentinel` topology) so the client re-discovers the current master after every promotion. For Cluster deployments, use a cluster-mode client that handles hash-slot routing, `MOVED` redirects, and automatic reconnection to new masters.

### 10. Test Failover Regularly with Drills

An untested failover is a promise, not a guarantee. Schedule failover drills: kill the master (or use `DEBUG sleep` / `SENTINEL FAILOVER` to force a controlled promotion), measure the time to promotion, and verify that clients reconnect and that no writes were lost. Automate the drill so it runs in staging on every release cycle, and keep a runbook entry that documents the expected failover time and the exact commands to inspect the outcome.

### 11. Monitor the Health Signals That Matter

HA monitoring is about the signals that predict or reveal failovers: `INFO replication` (role, `master_link_status`, replica lag), `SENTINEL master <name>` (the current master, number of Sentinels, last failover time), and `redis-cli --cluster check` for Cluster health. Alert on `master_link_status:down`, replica lag above a threshold, and any `-NOMASTERLINK` or `-CLUSTERDOWN` errors in application logs. Memory, CPU, and latency trends matter too — a node that is slow to respond is a failover waiting to happen.

### 12. Plan Resharding and Maintenance Windows

Cluster resharding moves hash slots between masters while the cluster keeps serving, but it is not free: migrating large keys generates network and disk I/O, and `CLUSTER SETSLOT` operations briefly make affected slots unavailable. Schedule resharding and node replacements during low-traffic windows, move slots in small batches with `--cluster reshard`, and always verify slot ownership with `CLUSTER SLOTS` afterward. Never run resharding and a failover drill at the same time.

### 13. Use `cluster-require-full-coverage` Deliberately

By default, a Redis Cluster refuses **all** queries when any hash slot is uncovered (for example, after a master and all its replicas fail). This guarantees strong consistency — no partial data — but it turns a single-node failure into a full-cluster outage. Set `cluster-require-full-coverage no` when partial availability is acceptable for your workload (common for caches), and keep it `yes` for data stores where serving incomplete data is worse than serving none. Document the choice; it is a product decision, not just a config flag.

### 14. Protect the HA Layer Itself

Sentinel and Cluster control planes are attractive targets: a compromised Sentinel can force a failover, and a rogue node can join a cluster. Bind Sentinel to private interfaces, protect `redis-cli` and `CONFIG` with `rename-command` where possible, use `protected-mode yes` on non-cluster deployments, and keep the control plane (Sentinel ports 26379, cluster bus port 16379) on a separate network segment from public traffic. The data plane may be fast; the control plane must be boring and locked down.

## Implementation Steps

### Step 1: Set Up Master-Replica Replication

Start with two Redis instances and turn the second into a replica of the first. On the replica node, either add this to `redis.conf`:

```text
# replica of the master at 10.0.1.10
replicaof 10.0.1.10 6379
replica-read-only yes
```

Or promote it at runtime without a restart:

```bash
redis-cli -h 10.0.1.11 -p 6379 REPLICAOF 10.0.1.10 6379
```

Verify the link from either side:

```bash
redis-cli -h 10.0.1.10 -p 6379 INFO replication
```

The output should show `role:master`, `connected_slaves:1`, and `slave0:ip=10.0.1.11,state=online`. Write a key on the master and read it on the replica to confirm data flows. For production, add `replica-priority`, matching `maxmemory` settings, and `masterauth`/`requirepass` as described in the best practices above.

### Step 2: Deploy Redis Sentinel

Sentinel is a special Redis mode started with `--sentinel` and configured through `sentinel.conf`. Deploy three Sentinel processes on three separate hosts so a majority of two can always be formed. A minimal `sentinel.conf` looks like this:

```text
port 26379
sentinel monitor mymaster 10.0.1.10 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 15000
sentinel parallel-syncs mymaster 1
sentinel auth-pass mymaster S3curePassw0rd
```

Start each Sentinel:

```bash
redis-server /etc/redis/sentinel.conf --sentinel
```

After all three are running, verify they agree on the topology:

```bash
redis-cli -p 26379 SENTINEL master mymaster
redis-cli -p 26379 SENTINEL replicas mymaster
redis-cli -p 26379 SENTINEL sentinels mymaster
```

The `SENTINEL sentinels` output should list the other two Sentinel instances — proof that the quorum can communicate. Sentinel also rewrites `sentinel.conf` as it learns about the topology, so give the file write permissions and never hand-edit it while Sentinels are running.

### Step 3: Verify Automatic Failover

With replication and Sentinel in place, prove the failover actually works. First, record the current master, then kill it:

```bash
redis-cli -h 10.0.1.10 -p 6379 SHUTDOWN NOSAVE
```

Within seconds, Sentinel should detect the failure (`down-after-milliseconds`), elect a leader, and promote a replica. Watch it happen:

```bash
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

The returned address should now point to the promoted replica (for example, `10.0.1.11`). Confirm the promotion state:

```bash
redis-cli -p 26379 SENTINEL master mymaster | grep -E "num-slaves|num-other-sentinels|config-epoch"
```

Now restart the old master. It should rejoin the topology as a replica of the new master, not as a competing master:

```bash
redis-cli -h 10.0.1.10 -p 6379 INFO replication
```

`role:slave` with a `master_host` pointing at `10.0.1.11` is the expected outcome. Repeat this drill until promotion is consistently fast and clean — this is the moment where HA goes from config to capability.

### Step 4: Scale Out with Redis Cluster

When a single master (plus replicas) cannot hold the dataset or handle the write throughput, shard with Redis Cluster. Every Cluster node needs the cluster directives in `redis.conf`:

```text
port 7000
cluster-enabled yes
cluster-config-file nodes-7000.conf
cluster-node-timeout 5000
appendonly yes
```

Start six nodes (three masters and three replicas) and create the cluster with the built-in helper:

```bash
redis-cli --cluster create \
  10.0.1.10:7000 10.0.1.11:7000 10.0.1.12:7000 \
  10.0.1.13:7001 10.0.1.14:7001 10.0.1.15:7001 \
  --cluster-replicas 1
```

The helper assigns 16384 hash slots across the three masters and attaches one replica to each. Verify the topology:

```bash
redis-cli -c -h 10.0.1.10 -p 7000 CLUSTER INFO
redis-cli -c -h 10.0.1.10 -p 7000 CLUSTER NODES
```

`CLUSTER INFO` should report `cluster_state:ok` and `cluster_slots_assigned:16384`. The failover behavior in Cluster is symmetric to Sentinel: when a master is unreachable past `cluster-node-timeout`, its replicas vote and one is promoted, and the cluster continues serving the slots that remain covered.

### Step 5: Configure HA-Aware Clients

A client that ignores the topology will not survive a failover. With `ioredis`, Sentinel mode discovers the current master on every connection:

```typescript
import Redis from "ioredis";

const redis = new Redis({
  sentinels: [
    { host: "10.0.1.20", port: 26379 },
    { host: "10.0.1.21", port: 26379 },
    { host: "10.0.1.22", port: 26379 },
  ],
  name: "mymaster",
  password: "S3curePassw0rd",
  // Reconnect and re-discover the master after a failover
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

await redis.set("health", "ok");
const value = await redis.get("health");
console.log(value); // "ok"
```

For Cluster, use the cluster-mode client and let it follow `MOVED` redirects:

```typescript
import Redis from "ioredis";

const cluster = new Redis.Cluster(
  [
    { host: "10.0.1.10", port: 7000 },
    { host: "10.0.1.11", port: 7000 },
    { host: "10.0.1.12", port: 7000 },
  ],
  {
    scaleReads: "slave", // offload reads to replicas
    retryDelayOnFailover: 100,
  }
);

await cluster.set("user:42", "alice");
console.log(await cluster.get("user:42"));
```

Both clients handle the failover path for you, but only if you test them against the drill in Step 3 — a misconfigured `name`, wrong password, or missing `retryStrategy` turns a healthy Sentinel into a false sense of security.

### Step 6: Monitor and Run Failover Drills

Close the loop with monitoring and recurring drills. At minimum, collect these signals on a schedule:

```bash
# Role and link health on every node
redis-cli -h <node> INFO replication | grep -E "role|master_link_status|master_repl_offset"

# Sentinel view of the world (run on each Sentinel)
redis-cli -p 26379 SENTINEL master mymaster

# Cluster health (any node)
redis-cli -c -h <node> -p 7000 CLUSTER INFO
redis-cli --cluster check <node>:7000
```

Alert when `master_link_status` is not `up`, when `SENTINEL master` reports a `failover` state or a `config-epoch` that changed unexpectedly, or when `CLUSTER INFO` shows `cluster_state:fail`. Finally, institutionalize the drill: once per release cycle, force a promotion with `SENTINEL FAILOVER mymaster` (controlled, no downtime) or kill a master outright, and record the measured failover time and any client errors. HA is a continuous property — it rots silently if nobody proves it still works.

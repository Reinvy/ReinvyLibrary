---
title: "Redis Cluster Scaling Guide"
description: "Scale Redis Cluster in production: hash slot planning, cluster creation, online resharding, replica placement, failover testing, client routing, and capacity planning."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Redis Cluster Scaling Guide

## Introduction

A single Redis node is bounded by one machine's RAM, one event loop, and one blast radius. Redis Cluster removes those bounds by sharding the keyspace across masters, each owning a disjoint set of hash slots, with replicas for failover. The trade-off is operational: every scaling decision — shard count, replica placement, client routing — is hard to undo during an incident.

This guide covers both the mechanics (16384 hash slots, the cluster bus, `MOVED`/`ASK` redirection) and the practices that keep a growing cluster healthy: creating it correctly, resharding online, proving failover works before you need it, and planning capacity so the next expansion is routine.

## Best Practices

### 1. Size shards for memory, not CPU

Hash slots are units of ownership, not units of load. The real constraint is usually `maxmemory` per node plus the bandwidth of a full resync. Keep shards below 60–70% memory at peak, remembering that replication buffers and fork copy-on-write during BGSAVE consume headroom.

### 2. Use hash tags deliberately, and sparingly

Keys containing `{...}` hash only the tagged substring, so `{user:42}:profile` and `{user:42}:sessions` share a slot and can join multi-key commands and Lua scripts. Do this for genuinely co-accessed data, then stop: one hot tag pins an entire workload to a single master and caps throughput at one core.

### 3. Never rely on cross-slot multi-key operations

`MGET`, `MSET`, `SUNION`, `PFCOUNT`, and scripts fail with `CROSSSLOT` when keys map to different slots. Batch by slot, use hash tags, or accept per-key round trips. `SCAN` is per node, so you must iterate every master yourself.

### 4. Give every master a replica in a different failure domain

A master without a replica is an availability hole: when it dies, its slots stay unavailable until you manually run `CLUSTER SETSLOT ... NODE`. Place replicas in another rack or zone and verify with `CLUSTER NODES` — Redis does not know your topology and will co-locate a master with its replica.

### 5. Prefer `redis-cli --cluster` over hand-written slot surgery

The built-in tool performs importing, key migration with `MIGRATE`, and `SETSLOT NODE` in the correct order with checks. Hand-rolling it is how clusters end up with orphaned slots.

### 6. Treat `MOVED` and `ASK` as normal traffic

`MOVED` means a slot moved permanently; `ASK` appears during migration. Good clients follow both and refresh their map; bad clients surface them as errors. Set a bounded retry count and short cooldown so a stale map self-heals instead of looping.

### 7. Watch `cluster_state`, slot coverage, and replication lag

`cluster_state:ok` means every slot is served and a majority of masters agree. Alert on `cluster_state:fail`, on gaps in `CLUSTER SLOTS`, and on `master_link_status:down`. These three signals catch most incidents early.

### 8. Expand in whole shards and budget the migration window

Resharding moves keys with `MIGRATE`, which serialises and briefly blocks the source per key. Online resharding works, but expect elevated latency while large values move. Grow before 80% memory, not after an OOM eviction storm.

## Implementation Steps

### Step 1: Plan the topology

A sane production start is three masters with one replica each, on six hosts.

```ini
# /etc/redis/7000.conf — one file per node, port changed per instance
port 7000
cluster-enabled yes
cluster-config-file nodes-7000.conf
cluster-node-timeout 15000
appendonly yes
maxmemory 8gb
maxmemory-policy noeviction
protected-mode no
```

`noeviction` is deliberate: silent eviction in a sharded cache hides capacity problems, and cluster nodes should fail loudly instead.

### Step 2: Create the cluster

```bash
for p in 7000 7001 7002 7003 7004 7005; do
    redis-server "/etc/redis/${p}.conf" --daemonize yes
done

# 3 masters, 1 replica each; replicas are assigned automatically
redis-cli --cluster create \
    10.0.1.11:7000 10.0.1.12:7001 10.0.1.13:7002 \
    10.0.1.21:7003 10.0.1.22:7004 10.0.1.23:7005 \
    --cluster-replicas 1 --cluster-yes

redis-cli -p 7000 cluster info
redis-cli -p 7000 cluster nodes
```

Confirm all 16384 slots are covered and each master's replica sits on a different host before sending traffic.

### Step 3: Add capacity online

```bash
# Add two masters, then a replica for one of them
redis-cli --cluster add-node 10.0.1.14:7000 10.0.1.11:7000
redis-cli --cluster add-node 10.0.1.15:7000 10.0.1.11:7000
redis-cli --cluster add-node 10.0.1.24:7003 10.0.1.11:7000 \
    --cluster-slave --cluster-master-id <new-master-node-id>

# Move 1000 slots from each existing master to the first new node
redis-cli --cluster reshard 10.0.1.11:7000 \
    --cluster-from <id-a>,<id-b>,<id-c> \
    --cluster-to <new-id> \
    --cluster-slots 1000 \
    --cluster-yes
```

Reshard during low traffic, one shard per step, watching `latency` and `MIGRATE` throughput between steps.

### Step 4: Test failover before you trust it

```bash
# Graceful promotion of a replica
redis-cli -p 7003 cluster failover

# Hard failure: kill -9 a master, then confirm promotion within node-timeout
redis-cli -p 7000 cluster nodes | grep master
```

Verify the promoted replica owns its slots, the old master rejoins as a replica, and your application recovered without manual intervention.

### Step 5: Configure client-side routing

```javascript
import Redis from 'ioredis';

const cluster = new Redis.Cluster(
    [
        { host: '10.0.1.11', port: 7000 },
        { host: '10.0.1.12', port: 7001 },
    ],
    {
        redisOptions: { password: process.env.REDIS_PASSWORD, maxRetriesPerRequest: 2 },
        clusterRetryStrategy: (times) => Math.min(times * 200, 2000),
        enableReadyCheck: true,
        slotsRefreshTimeout: 2000,
    }
);

cluster.on('error', (err) => console.error('cluster error', err.message));

try {
    await cluster.set('{user:42}:profile', JSON.stringify({ name: 'Ada' }));
    const raw = await cluster.get('{user:42}:profile');
    console.log(raw ? JSON.parse(raw) : null);
} catch (err) {
    // MOVED/ASK are followed automatically; this is a real failure
    console.error('write failed', err);
}
```

### Step 6: Capacity planning and monitoring

Track memory per node (`INFO memory`), keys per slot, and replication lag. Model growth as `nodes = ceil(peak_dataset_bytes * 1.5 / usable_ram_per_node)`, keeping 1.5× headroom for fork copy-on-write and failover buffers. Re-evaluate after every major feature launch, not after the first OOM.

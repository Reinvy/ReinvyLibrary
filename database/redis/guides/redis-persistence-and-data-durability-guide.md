---
title: "Redis Persistence and Data Durability Guide"
description: "A comprehensive guide to Redis persistence strategies — RDB snapshots, AOF (Append-Only File), hybrid persistence, backup and restore procedures, disaster recovery planning, and production best practices for data durability."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Redis Persistence and Data Durability Guide

## Introduction

Redis is primarily known as an in-memory data store, but its durability mechanisms are what make it suitable for production workloads where data loss is unacceptable. Without persistence, a Redis restart — whether from a crash, maintenance reboot, or upgrade — results in complete data loss. Redis offers three persistence modes: **RDB (Redis Database File)** snapshots, **AOF (Append-Only File)** logging, and **hybrid persistence** (combining both). Each approach makes different trade-offs between durability guarantees, performance overhead, recovery speed, and storage requirements.

This guide examines each persistence strategy in depth, explores production configuration patterns, and provides step-by-step implementation steps for building a robust data durability layer. You will learn how to choose the right persistence strategy for your workload, automate backups, monitor persistence health, and implement disaster recovery procedures that meet your recovery point and time objectives (RPO/RTO).

## Best Practices

### 1. Choose the Right Persistence Strategy for Your Durability Requirements

The persistence strategy you choose must align with your application's tolerance for data loss and downtime. There is no one-size-fits-all answer — each strategy optimizes for different priorities.

| Strategy | Durability | Recovery Speed | Performance Impact | Use Case |
|----------|------------|----------------|-------------------|----------|
| No persistence | None | Instant (empty DB) | None | Ephemeral cache, session store where loss is acceptable |
| RDB only | Point-in-time (last snapshot) | Fastest (single file load) | Moderate during fork | Caching layer, analytics where some data loss is tolerable |
| AOF only | Configurable (fsync policy) | Slower (replay operations) | Moderate to high (write amplification) | Financial systems, queues requiring near-zero data loss |
| Hybrid (RDB + AOF) | Best (RDB base + AOF delta) | Fast (load RDB + replay AOF) | Higher (both overheads) | Production systems with strict durability SLA |

**Recommendation**: For most production workloads, enable hybrid persistence (RDB + AOF) with `appendfsync everysec`. This provides a good balance: the AOF captures every write with at most one second of data loss, while the RDB snapshot accelerates restart by providing a compact base state.

### 2. Configure AOF fsync Policies Deliberately

The `appendfsync` directive controls how often the kernel flushes the AOF buffer to disk. This single setting defines your durability guarantee versus write performance trade-off:

```text
# redis.conf AOF fsync policies:

# Safest — fsync on every write. Maximum durability, minimum throughput.
# Loses at most one write on crash. ~100x slowdown for write-heavy workloads.
appendfsync always

# Balanced — fsync once per second. Loses at most 1 second of data.
# Recommended for most production systems. ~10x slowdown under load.
appendfsync everysec

# Fastest — let the OS decide when to flush. Unpredictable data loss
# (up to 30+ seconds of writes on crash). Best performance, worst durability.
appendfsync no
```

**Best practice**: Use `appendfsync everysec` as your default. It provides strong durability guarantees (at most one second of lost data) while keeping performance acceptable for most workloads. Only use `always` for absolute critical data pipelines where every write must survive. Avoid `no` in production — it provides no durability guarantee and makes crash recovery unpredictable.

### 3. Tune RDB Snapshot Frequency Based on Recovery Objectives

RDB snapshots create point-in-time backups of the entire dataset. The snapshot frequency determines your recovery point objective (RPO) — the maximum amount of data you could lose.

```text
# redis.conf: RDB snapshot conditions (save <seconds> <changes>)
# At least one condition must be met for a snapshot to trigger.

# Save every 900 seconds (15 min) if at least 1 key changed
save 900 1

# Save every 300 seconds (5 min) if at least 10 keys changed
save 300 10

# Save every 60 seconds (1 min) if at least 10000 keys changed
save 60 10000

# Disable RDB entirely by commenting out all save directives
# save ""
```

**Best practice**: Configure multiple overlapping save conditions to match your workload's write velocity. A low-traffic API might use `save 3600 1` (hourly snapshots), while a high-throughput session store might need `save 60 1000`. Monitor the actual snapshot frequency with `INFO persistence` and adjust so snapshots occur at your target interval under normal load.

### 4. Enable Hybrid Persistence for Production Deployments (Redis 6.2+)

Hybrid persistence, enabled by default since Redis 6.2, combines an RDB base file with an AOF delta log. On restart, Redis loads the compact RDB base and replays only the AOF entries written after the last RDB snapshot. This dramatically reduces restart time compared to full AOF replay while maintaining the durability benefits of AOF.

```text
# redis.conf (defaults since Redis 6.2):
aof-use-rdb-preamble yes    # Enable hybrid persistence

# With hybrid mode, the AOF file contains:
# [RDB preamble — compact base snapshot]
# [AOF tail — incremental writes since snapshot]
#
# On restart:
# 1. Load the RDB preamble (fast, single file)
# 2. Replay the AOF tail (processes only delta operations)
#
# Without hybrid mode:
# - Restart replays the ENTIRE AOF file (slow for large datasets)
```

**Best practice**: Always enable `aof-use-rdb-preamble yes` for production. Benchmark tests show hybrid persistence reduces restart times by 60-80% compared to full AOF replay for datasets over 10 GB, while maintaining the same durability properties.

### 5. Automate AOF Rewrite to Prevent File Bloat

The AOF grows unboundedly as writes accumulate. The AOF rewrite process (triggered via `BGREWRITEAOF` or automatically by configuration) compacts the AOF by reconstructing the current dataset state as a minimal set of commands.

```text
# redis.conf: Automatic AOF rewrite triggers
auto-aof-rewrite-percentage 100      # Rewrite when AOF grows by 100%
auto-aof-rewrite-min-size 64mb       # Minimum size before rewriting

# Conditions: rewrite triggers when BOTH conditions are met:
# 1. Current AOF size > auto-aof-rewrite-min-size
# 2. (Current AOF size - last AOF size) / last AOF size > percentage
```

**Best practice**: Monitor AOF size growth rate with `INFO persistence` and adjust the rewrite percentage so rewrites occur during low-traffic windows. For write-heavy workloads with predictable daily patterns, consider scheduling manual `BGREWRITEAOF` via cron during off-peak hours to avoid fork-induced latency spikes during traffic peaks.

### 6. Implement Regular Automated Backups

Persistence files on the Redis server are vulnerable to disk failure, accidental deletion, or data corruption. Always maintain off-server backups:

```text
# Recommended backup strategy:
# 1. RDB snapshots: Copy dump.rdb off-server every N minutes/hours
# 2. AOF files: Ship AOF deltas to object storage periodically
# 3. Retention: Keep hourly for 24h, daily for 7d, weekly for 1m
```

**Best practice**: Use `redis-cli --rdb` to trigger a point-in-time RDB dump without disrupting the running server's snapshot schedule. This produces a consistent RDB file even while the server handles writes:

```bash
# Trigger an on-demand RDB snapshot for backup
redis-cli --rdb /tmp/backup-$(date +%Y%m%d-%H%M%S).rdb

# Copy to cloud storage (AWS S3 example)
aws s3 cp /tmp/backup-*.rdb s3://my-redis-backups/production/

# Also back up the AOF file
cp /var/lib/redis/appendonly.aof /backup/appendonly-$(date +%Y%m%d).aof
```

### 7. Monitor Persistence Health Continuously

Redis exposes detailed persistence metrics through the `INFO persistence` command. Monitor these key indicators:

```text
# From INFO persistence key metrics:
rdb_last_save_time: 1734567890        # Last successful RDB save (Unix timestamp)
rdb_last_bgsave_status: ok            # Last BGSAVE result
rdb_bgsave_in_progress: 0             # Is a BGSAVE currently running?
rdb_last_bgsave_time_sec: 45          # Duration of last BGSAVE in seconds

aof_enabled: 1                        # Is AOF enabled?
aof_last_rewrite_status: ok           # Last AOF rewrite result
aof_current_size: 125829120           # Current AOF file size (bytes)
aof_base_size: 83886080               # Size after last rewrite
aof_last_bgrewrite_status: ok         # Last BGREWRITEAOF result
```

**Best practice**: Set up alerts on these critical conditions:

```bash
#!/bin/bash
# persistence-health-check.sh — Run via monitoring system (cron, Prometheus, etc.)

REDIS_CLI="redis-cli"
ALERT_THRESHOLD_HOURS=2  # Alert if no successful RDB save in 2 hours

LAST_SAVE=$($REDIS_CLI INFO persistence | grep rdb_last_save_time | cut -d: -f2 | tr -d '\r')
NOW=$(date +%s)
AGE=$(( (NOW - LAST_SAVE) / 3600 ))

if [ "$AGE" -gt "$ALERT_THRESHOLD_HOURS" ]; then
  echo "ALERT: Last RDB save was ${AGE}h ago (threshold: ${ALERT_THRESHOLD_HOURS}h)"
  exit 1
fi

# Check AOF rewrite status
AOF_REWRITE_STATUS=$($REDIS_CLI INFO persistence | grep aof_last_bgrewrite_status | cut -d: -f2 | tr -d '\r')
if [ "$AOF_REWRITE_STATUS" != "ok" ]; then
  echo "ALERT: AOF rewrite failed — check Redis logs"
  exit 1
fi

echo "Persistence health: OK"
exit 0
```

### 8. Plan for Fork-Induced Latency (RDB/AOF Rewrite)

Both `BGSAVE` (RDB snapshot) and `BGREWRITEAOF` (AOF rewrite) fork a child process. Forking a large Redis process (>10 GB) can cause latency spikes because the kernel must duplicate the process page table. This is especially pronounced on overcommitted systems.

```text
# Mitigations for fork latency:
# 1. Use Linux overcommit (vm.overcommit_memory=1) — prevents fork failure
# 2. Reduce RDB snapshot frequency — fewer forks = fewer spikes
# 3. Schedule BGSAVE during low-traffic windows
# 4. Use Redis 6.2+ with auto-aof-rewrite-min-size set higher (256MB+)
# 5. Consider using replica nodes for persistence (backup from replica)
```

```bash
# System-level tuning to reduce fork latency
echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf
echo "vm.swappiness = 1" >> /etc/sysctl.conf
sysctl -p

# Check how long BGSAVE took (from INFO persistence)
# rdb_last_bgsave_time_sec tells you the fork + snapshot duration
```

### 9. Validate Data Integrity After Restore

Persistence files can become corrupted due to disk errors, incomplete writes during crashes, or version incompatibilities. Always verify integrity before relying on restored data:

```bash
# Check RDB file integrity using redis-check-rdb
redis-check-rdb /var/lib/redis/dump.rdb

# Check AOF file integrity using redis-check-aof
redis-check-aof /var/lib/redis/appendonly.aof

# Fix a corrupted AOF file (truncates at the last valid entry)
redis-check-aof --fix /var/lib/redis/appendonly.aof
```

**Best practice**: Run integrity checks as part of your backup verification pipeline. After creating a backup, immediately verify it with `redis-check-rdb` or `redis-check-aof`. A backup that cannot be verified is not a backup.

### 10. Persistence in Redis Cluster and Replication Topologies

In replicated deployments (master-replica or Redis Cluster), persistence configuration interacts with replication behavior:

```text
# Key persistence + replication considerations:
#
# Master with persistence: Standard setup. Master persists, replicas replicate.
#   - Failover promotion works normally — replica has data from replication stream
#
# Master without persistence + replicas with persistence: DANGEROUS.
#   - If master restarts (empty DB), replicas will sync to empty master
#   - This wipes all persisted data on replicas during full resync
#
# Replica-only persistence: Persist on replicas, master has no disk I/O.
#   - Use replica-serve-stale-data yes so replica serves reads during sync
#   - If replica restarts, it re-syncs from master (which may be empty!)
```

```text
# Recommended Cluster persistence config:
# redis.conf on every node
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes
```

```bash
# On replicas, verify they maintain their own persistence independently
redis-cli -h replica-host INFO persistence | grep -E "rdb_last_save_time|aof_current_size"
```

## Implementation Steps

### Step 1: Assess Your Durability Requirements

Before configuring persistence, determine your durability needs:

1. **Recovery Point Objective (RPO)**: How much data can you afford to lose? Less than 1 second (AOF always), less than 1 second (AOF everysec), or minutes/hours (RDB only)?
2. **Recovery Time Objective (RTO)**: How fast must the dataset be available after a restart? Under 30 seconds (RDB only or hybrid), or minutes (AOF replay for large datasets)?
3. **Write throughput**: What is your peak write rate? High write loads benefit from RDB-only to avoid AOF write amplification.

### Step 2: Configure RDB Snapshots

1. Open your `redis.conf` file:
    ```bash
    # Default location for most package managers
    sudo vim /etc/redis/redis.conf
    ```

2. Set your snapshot conditions. For a general-purpose production workload:
    ```text
    save 900 1
    save 300 10
    save 60 10000
    dbfilename dump.rdb
    dir /var/lib/redis
    ```

3. Configure RDB compression and checksum for safety:
    ```text
    rdbcompression yes       # Compress RDB files (LZF) — reduces disk I/O
    rdbchecksum yes          # Include CRC64 checksum — detects corruption
    rdb-del-sync-files no    # Keep RDB files used for replication sync
    ```

### Step 3: Enable and Configure AOF Persistence

1. Enable AOF and set the fsync policy:
    ```text
    appendonly yes
    appendfilename "appendonly.aof"
    appendfsync everysec
    ```

2. Configure AOF rewrite thresholds:
    ```text
    auto-aof-rewrite-percentage 100
    auto-aof-rewrite-min-size 64mb
    no-appendfsync-on-rewrite no
    ```

3. Enable hybrid persistence (Redis 6.2+ — enabled by default, but verify):
    ```text
    aof-use-rdb-preamble yes
    ```

### Step 4: Restart Redis and Verify Persistence

1. Restart Redis to apply configuration:
    ```bash
    sudo systemctl restart redis
    # or
    redis-cli shutdown && redis-server /etc/redis/redis.conf
    ```

2. Verify persistence is active:
    ```bash
    redis-cli INFO persistence
    ```
    Expected output includes:
    ```text
    rdb_bgsave_in_progress:0
    rdb_last_save_time:1734567890
    rdb_last_bgsave_status:ok
    rdb_last_bgsave_time_sec:0
    aof_enabled:1
    aof_current_size:92
    aof_base_size:92
    aof_last_rewrite_status:ok
    ```

3. Write a test key and verify it survives a restart:
    ```bash
    redis-cli SET test:durability "this should persist"
    redis-cli SAVE
    sudo systemctl restart redis
    redis-cli GET test:durability
    # Expected: "this should persist"
    ```

### Step 5: Set Up Automated Backups

1. Create a backup script:
    ```bash
    # /usr/local/bin/redis-backup.sh
    #!/bin/bash
    set -euo pipefail

    BACKUP_DIR="/backup/redis"
    DATE_TAG=$(date +%Y%m%d-%H%M%S)
    RETENTION_DAYS=30

    mkdir -p "$BACKUP_DIR/{rdb,aof}"

    # Generate point-in-time RDB file
    redis-cli --rdb "$BACKUP_DIR/rdb/redis-$DATE_TAG.rdb"

    # Copy current AOF file
    cp /var/lib/redis/appendonly.aof "$BACKUP_DIR/aof/appendonly-$DATE_TAG.aof"

    # Verify integrity
    redis-check-rdb "$BACKUP_DIR/rdb/redis-$DATE_TAG.rdb"

    # Prune old backups
    find "$BACKUP_DIR/rdb" -name "*.rdb" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR/aof" -name "*.aof" -mtime +$RETENTION_DAYS -delete

    echo "Backup completed: $DATE_TAG"
    ```

2. Schedule the backup via cron:
    ```bash
    chmod +x /usr/local/bin/redis-backup.sh
    # Run every 4 hours
    echo "0 */4 * * * /usr/local/bin/redis-backup.sh" | crontab -
    ```

### Step 6: Implement Disaster Recovery Procedures

1. Document and test the restore procedure:
    ```bash
    # /usr/local/bin/redis-restore.sh
    #!/bin/bash
    set -euo pipefail

    BACKUP_FILE="${1:-}"
    if [ -z "$BACKUP_FILE" ]; then
      echo "Usage: $0 <path-to-rdb-file>"
      exit 1
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
      echo "Error: Backup file not found: $BACKUP_FILE"
      exit 1
    fi

    # Verify backup integrity
    redis-check-rdb "$BACKUP_FILE"

    # Stop Redis
    redis-cli SHUTDOWN NOSAVE

    # Replace the RDB file
    cp "$BACKUP_FILE" /var/lib/redis/dump.rdb
    chown redis:redis /var/lib/redis/dump.rdb

    # Start Redis
    sudo systemctl start redis

    # Verify data integrity
    redis-cli DBSIZE
    redis-cli INFO persistence
    echo "Restore completed from: $BACKUP_FILE"
    ```

2. Conduct a quarterly restore drill — this verifies that your backups are not only created but are actually restorable:
    ```bash
    # Restore to a temporary Redis instance (different port)
    redis-server --port 6380 --dir /tmp/restore-test &
    redis-cli -p 6380 SHUTDOWN NOSAVE
    cp /backup/redis/rdb/redis-$(date +%Y%m%d).rdb /tmp/restore-test/dump.rdb
    redis-server --port 6380 --dir /tmp/restore-test &
    redis-cli -p 6380 DBSIZE  # Should match production
    redis-cli -p 6380 RANDOMKEY  # Verify data is readable
    redis-cli -p 6380 SHUTDOWN
    rm -rf /tmp/restore-test
    ```

### Step 7: Set Up Persistence Monitoring

1. Deploy the health check script:
    ```bash
    # Install the persistence health check script from Best Practices section
    # as a cron job or Prometheus textfile collector
    echo "*/5 * * * * /usr/local/bin/persistence-health-check.sh" | crontab -
    ```

2. Integrate with your monitoring system (example for Prometheus node_exporter textfile collector):
    ```bash
    #!/bin/bash
    # /usr/local/bin/redis-persistence-metrics.sh
    OUTPUT_FILE="/var/lib/node_exporter/textfile_collector/redis_persistence.prom"

    REDIS_CLI="redis-cli"
    INFO=$($REDIS_CLI INFO persistence)

    # Parse metrics
    RDB_LAST_SAVE=$(echo "$INFO" | grep rdb_last_save_time | cut -d: -f2 | tr -d '\r')
    AOF_SIZE=$(echo "$INFO" | grep aof_current_size | cut -d: -f2 | tr -d '\r')

    cat > "$OUTPUT_FILE" << EOF
    # HELP redis_rdb_last_save_time Unix timestamp of last successful RDB save
    # TYPE redis_rdb_last_save_time gauge
    redis_rdb_last_save_time $RDB_LAST_SAVE
    # HELP redis_aof_current_size Current AOF file size in bytes
    # TYPE redis_aof_current_size gauge
    redis_aof_current_size $AOF_SIZE
    EOF
    ```

### Step 8: Performance Tuning and Benchmarking

1. Benchmark the impact of different fsync policies on your workload:
    ```bash
    # Use redis-benchmark to measure throughput under each policy
    redis-benchmark -n 100000 -t SET -d 256

    # Enable AOF everysec
    redis-cli CONFIG SET appendonly yes
    redis-cli CONFIG SET appendfsync everysec
    redis-benchmark -n 100000 -t SET -d 256

    # Compare to always
    redis-cli CONFIG SET appendfsync always
    redis-benchmark -n 100000 -t SET -d 256
    ```

2. Monitor fork duration during BGSAVE/BGREWRITEAOF:
    ```bash
    # Before BGSAVE, record baseline latency
    redis-cli --latency -h localhost -p 6379

    # In another terminal, trigger BGSAVE
    redis-cli BGSAVE

    # Watch for latency spikes in the latency monitor window
    # Also check fork duration after completion:
    redis-cli INFO persistence | grep rdb_last_bgsave_time_sec
    ```

3. Tune system parameters for fork performance:
    ```bash
    # Check current page table size (proportional to fork latency)
    grep PageTables /proc/meminfo

    # For large instances (>20 GB), consider:
    # - Increasing vm.max_map_count
    # - Using transparent huge pages (disabled recommended for Redis)
    echo madvise > /sys/kernel/mm/transparent_hugepage/enabled
    # or completely disabled:
    echo never > /sys/kernel/mm/transparent_hugepage/enabled
    ```

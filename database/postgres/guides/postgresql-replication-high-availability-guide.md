---
title: "PostgreSQL Replication and High Availability Guide"
description: "A comprehensive guide to PostgreSQL replication strategies and high availability covering streaming replication, logical replication, failover with Patroni, pg_rewind recovery, and production HA architecture patterns."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# PostgreSQL Replication and High Availability Guide

## Introduction

PostgreSQL offers a robust set of built-in replication features that enable high availability (HA), read scalability, and disaster recovery. Whether you are running a single production database or a globally distributed system, understanding PostgreSQL's replication architecture is essential for designing a resilient data layer that can survive hardware failures, network partitions, and data center outages without data loss.

This guide covers the full spectrum of PostgreSQL replication and HA — from setting up streaming replication for a hot standby, to configuring synchronous replication for zero data loss, implementing logical replication for selective data distribution, and deploying Patroni for automated failover. You will learn the architectural principles behind each approach, the trade-offs between consistency and availability, and the operational practices needed to run a production-grade PostgreSQL HA cluster.

By the end of this guide, you will be able to design, deploy, and maintain a PostgreSQL cluster that meets your recovery point objective (RPO) and recovery time objective (RTO) requirements.

## Best Practices

### 1. Choose the Right Replication Strategy

PostgreSQL supports two primary replication paradigms, each suited for different use cases:

**Physical (Streaming) Replication** replicates the entire database cluster at the block level. The standby server applies Write-Ahead Log (WAL) records identically to the primary. This is the foundation for high availability and is appropriate when you need an exact, byte-for-byte copy of the entire database.

**Logical Replication** replicates individual tables or databases using a publish-subscribe model. Changes are decoded from the WAL into a logical stream (INSERT, UPDATE, DELETE) and applied independently on the subscriber. This is ideal for selective data sharing, upgrades between major PostgreSQL versions, and multi-master architectures.

| Criterion | Streaming (Physical) Replication | Logical Replication |
|---|---|---|
| Granularity | Entire cluster | Per-table |
| Version compatibility | Same major version | Cross-version (same or newer) |
| Writes on standby | Read-only (replica) | Read-only (subscriber) |
| DDL replication | Automatic | Manual (not replicated) |
| Use case | HA, failover, read replicas | Data distribution, migration, ETL |

**Recommendation**: Use streaming replication as the default for HA and failover. Reserve logical replication for specialized needs like major version upgrades, selective data sharing between services, or real-time data integration pipelines.

### 2. Configure Synchronous Replication for Zero Data Loss

Asynchronous replication (the default) provides the best performance but risks losing committed transactions if the primary fails before the standby receives the WAL. Synchronous replication guarantees that every commit is written to at least one synchronous standby before acknowledging the client.

```conf
# postgresql.conf on the primary
synchronous_standby_names = 'FIRST 1 (standby1, standby2)'
synchronous_commit = 'remote_write'  # or 'on' for full sync
```

The `synchronous_commit` levels offer different durability guarantees:

| Level | Durability | Performance Impact |
|---|---|---|
| `off` | No sync — commit before WAL flush | Fastest, risk of data loss |
| `on` | Commit after WAL flushed on primary and sync standby | Balanced |
| `remote_write` | Commit after WAL flushed on primary, written to standby OS | Good performance, moderate safety |
| `remote_apply` | Commit after changes applied on standby (visible there) | Slowest, strongest consistency |

**Rule of thumb**: Use `remote_write` for most production workloads — it provides strong durability with roughly 2x the latency of asynchronous replication. Use `remote_apply` only when the application requires read-your-writes consistency on standby reads.

**WARNING**: If all synchronous standbys go down, the primary stops processing commits. Always configure at least two synchronous standbys or use `FIRST N` with `N < total_standbys` to avoid availability outages.

### 3. Design Standbys for Production

A production-grade standby configuration requires attention to hardware, network, and PostgreSQL-specific settings.

**Hardware parity**: Standbys should match the primary in CPU, memory, and storage performance. If a standby is significantly slower, it will fall behind during peak write load, making failover risky.

**Network considerations**: Keep replication latency under 10 milliseconds for synchronous replication. For asynchronous replication across data centers, monitor `pg_stat_replication.replay_lag` and set alert thresholds based on your RPO.

**Standby-specific configuration**:

```conf
# standby/postgresql.conf
hot_standby = on                    # Allow read queries on standby
hot_standby_feedback = on           # Prevent query cancel from VACUUM conflicts
wal_receiver_timeout = 60000        # 60s timeout for WAL receiver
primary_conninfo = 'host=primary_host port=5432 user=replicator password=...'
primary_slot_name = 'standby1'      # Use a physical replication slot
```

Replication slots prevent the primary from discarding WAL segments that the standby has not yet received. This is critical for long-running standby disconnections:

```sql
-- On primary: create a physical replication slot
SELECT pg_create_physical_replication_slot('standby1');

-- Monitor slot lag
SELECT slot_name, restart_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS bytes_behind
FROM pg_replication_slots;
```

### 4. Automate Failover with Patroni

Manual failover is error-prone and slow. For production systems, use **Patroni** — a battle-tested HA orchestrator that manages PostgreSQL instances, detects primary failures, and promotes the most advanced standby automatically.

Patroni uses a distributed consensus store (etcd, Consul, or ZooKeeper) to track cluster state and coordinate failover decisions:

```yaml
# patroni.yml
scope: postgres-prod
namespace: /db/
name: pg-primary

restapi:
  listen: 0.0.0.0:8008
  connect_address: 10.0.0.1:8008

consul:
  host: 10.0.0.10:8500

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 10.0.0.1:5432
  data_dir: /var/lib/postgresql/16/main
  parameters:
    hot_standby: "on"
    wal_level: replica
    max_wal_senders: 5
    wal_keep_size: 1024
  authentication:
    replication:
      username: replicator
      password: secure_password_here
    superuser:
      username: postgres
      password: super_secure_password
    rewind:
      username: rewind_user
      password: rewind_secure_password

  create_replica_methods:
    - basebackup
  basebackup:
    checkpoint: fast

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

**Patroni cluster members**: Each PostgreSQL instance runs a Patroni agent that:

1. Registers itself in the DCS (Distributed Configuration Store)
2. Runs periodic health checks against PostgreSQL
3. Elects a leader (primary) via the DCS lease mechanism
4. Automatically promotes the best candidate on primary failure
5. Re-joins a failed former primary as a replica (via `pg_rewind`)

**Failover behavior**:

- Patroni checks the `loop_wait` interval (default 10 seconds) for primary health
- After `ttl` (default 30 seconds) without a leader heartbeat, a new leader election begins
- The standby with the highest WAL position (least lag) is promoted
- The failed primary, when it comes back, is automatically reconfigured as a standby using `pg_rewind`

```bash
# Check Patroni cluster status
patronictl -c /etc/patroni/patroni.yml list

# Manual switchover (planned)
patronictl -c /etc/patroni/patroni.yml switchover --master pg-primary --candidate pg-standby-1

# Force failover in emergency
patronictl -c /etc/patroni/patroni.yml failover --master pg-primary --candidate pg-standby-1 --force
```

### 5. Use pg_rewind for Fast Recovery After Split-Brain

When a former primary rejoins the cluster after a failover, its timeline diverges from the new primary. Using `pg_rewind` is much faster than rebuilding the standby from scratch — it replays only the divergent WAL segments rather than performing a full base backup.

Patroni uses `pg_rewind` automatically, but understanding how it works is important for diagnosing recovery issues:

```bash
# Manual pg_rewind (from the former primary)
systemctl stop postgresql-16

# Run pg_rewind to sync with the new primary
pg_rewind --target-pgdata /var/lib/postgresql/16/main \
          --source-server="host=new-primary-host port=5432 user=rewind_user dbname=postgres" \
          --progress

# Start PostgreSQL as a standby
systemctl start postgresql-16
```

**Prerequisites for pg_rewind**:
- `wal_log_hints = on` or `data_checksums = enabled` on the original primary
- A replication slot or sufficient WAL retention to cover the divergence period
- The `rewind_user` must have `pg_monitor` membership or be superuser
- The target server must have been shut down cleanly (`fast` or `immediate` mode)

### 6. Configure Read Scaling with Load Balancing

Streaming replicas can serve read queries, dramatically increasing your cluster's read throughput. Combine replicas with a load balancer for transparent read scaling:

```text
Application
    │
    ▼
┌─────────────┐
│   HAProxy   │  Port 5432 (primary), Port 5433 (replicas)
│  or Pgpool  │
└──────┬──────┘
       │
       ├───────────────┐
       ▼               ▼
┌─────────────┐ ┌─────────────┐
│  Primary    │ │  Standby 1  │
│  (writes)   │ │  (reads)    │
└─────────────┘ └─────────────┘
                    ┌─────────────┐
                    │  Standby 2  │
                    │  (reads)    │
                    └─────────────┘
```

**HAProxy configuration for read/write splitting**:

```haproxy
# haproxy.cfg
frontend pg_frontend
    bind *:5432
    default_backend pg_primary

backend pg_primary
    option pgsql-check user haproxy_check
    server primary 10.0.0.1:5432 check port 5432

frontend pg_read_frontend
    bind *:5433
    default_backend pg_replicas

backend pg_replicas
    option pgsql-check user haproxy_check
    server replica1 10.0.0.2:5432 check port 5432
    server replica2 10.0.0.3:5432 check port 5432
```

**Connection URLs for read/write splitting**:
```text
# Write operations → primary pool
DATABASE_URL=postgresql://user:password@haproxy:5432/mydb

# Read operations → replica pool
DATABASE_READ_URL=postgresql://user:password@haproxy:5433/mydb
```

### 7. Monitor Replication Health Continuously

Replication is fragile — network issues, heavy write loads, and configuration drift can silently cause replica lag that violates your RPO. Monitor these metrics:

```sql
-- Replication lag: bytes and time
SELECT client_addr, application_name, state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS sent_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn) AS write_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) AS flush_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_bytes,
       write_lag, flush_lag, replay_lag
FROM pg_stat_replication;

-- Replication slot lag
SELECT slot_name, slot_type, database,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS bytes_behind,
       active
FROM pg_replication_slots;

-- Standby-side: check if current server is a replica
SELECT pg_is_in_recovery();

-- Standby-side: measure receive and replay lag
SELECT now() - pg_last_xact_replay_timestamp() AS replication_delay;
```

**Alert thresholds for replication monitoring**:

| Metric | Warning | Critical |
|---|---|---|
| Replay lag (asynchronous) | > 30 seconds | > 5 minutes |
| Replay lag (synchronous) | > 1 second | > 5 seconds |
| Replication slot lag | > 10 GB | > 50 GB |
| WAL sender count | > 80% of max_wal_senders | All WAL senders in use |

### 8. Plan for Disaster Recovery Across Data Centers

A complete HA strategy must account for data center failures. Deploy standbys in a secondary region with asynchronous replication for disaster recovery:

```text
┌──────────────┐     Async     ┌──────────────┐
│  Data Center A  │◄──────────────│  Data Center B  │
│  (Primary)      │  Replication  │  (DR Standby)    │
│                 │               │                  │
│ Patroni + etcd  │               │ Patroni + etcd   │
│ App connections │               │ WAL archive      │
└────────────────┘               └──────────────────┘
```

**Multi-data-center architecture best practices**:
- Run a separate etcd/Consul cluster per region — do not stretch the consensus cluster across data centers
- Use `recovery_target_time` or `recovery_target_lsn` for point-in-time recovery (PITR) on the DR standby
- Test failover to the DR site quarterly with a full drill
- Archive WAL segments to object storage (S3/GCS) as a final fallback

```conf
# Postgres archiving configuration (primary)
archive_mode = on
archive_command = 'aws s3 cp %p s3://my-db-wal-archive/%f'
archive_timeout = 60
```

**Restore from WAL archive for disaster recovery**:

```bash
# On a new server, restore the latest base backup
pg_basebackup -h primary-host -D /var/lib/postgresql/16/main -P -X stream

# Or restore from a pgBackRest/ pg_probackup snapshot
pgbackrest --stanza=prod --type=latest restore

# Configure recovery.conf (PostgreSQL 12+) or postgresql.conf
# Set restore_command to fetch WAL from archive
restore_command = 'aws s3 cp s3://my-db-wal-archive/%f %p'
```

## Implementation Steps

### Step 1: Deploy a Streaming Replication Cluster (Manual)

Set up a primary and standby from scratch to understand the mechanics before introducing automation.

**On the primary server**:

```conf
# postgresql.conf
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1024             # Keep 1 GB of WAL for lagging standbys
hot_standby = on
listen_addresses = '*'
```

```bash
# Create a replication user
sudo -u postgres psql -c "CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'secure_password';"

# Configure pg_hba.conf to allow replication connections
echo 'host replication replicator standby_ip/32 scram-sha-256' | \
  sudo tee -a /etc/postgresql/16/main/pg_hba.conf

# Reload configuration
sudo -u postgres psql -c "SELECT pg_reload_conf();"

# Create a replication slot
sudo -u postgres psql -c "SELECT pg_create_physical_replication_slot('standby1');"
```

**On the standby server**:

```bash
# Stop any running PostgreSQL
sudo systemctl stop postgresql

# Take a base backup from the primary
sudo -u postgres pg_basebackup -h primary-host -D /var/lib/postgresql/16/main \
  -U replicator -P -v --slot=standby1 --write-recovery-conf

# Start the standby
sudo systemctl start postgresql

# Verify replication
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
# Should return 't' (true) on the standby
```

**Verify replication is working**:

```sql
-- On primary: check standby connection
SELECT client_addr, application_name, state, sync_state, replay_lag
FROM pg_stat_replication;

-- Create a test table on primary
CREATE TABLE test_replication (id serial primary key, data text);
INSERT INTO test_replication (data) VALUES ('hello from primary');

-- On standby: verify data appears
SELECT * FROM test_replication;
```

### Step 2: Deploy Patroni for Automated HA

Replace the manual configuration with Patroni for automated failover and self-healing.

**Install Patroni on all nodes**:

```bash
# Using pip (Python 3.8+ required)
pip install patroni[etcd] psycopg2-binary

# Create the Patroni configuration directory
sudo mkdir -p /etc/patroni
```

**Set up etcd (or Consul) as the DCS backend**:

```bash
# Install etcd on three nodes for quorum
wget https://github.com/etcd-io/etcd/releases/download/v3.5.15/etcd-v3.5.15-linux-amd64.tar.gz
tar xzf etcd-v3.5.15-linux-amd64.tar.gz
sudo mv etcd-v3.5.15-linux-amd64/etcd* /usr/local/bin/

# Create etcd configuration
cat > /etc/etcd/etcd.conf.yml << 'EOF'
name: 'etcd-node-1'
data-dir: /var/lib/etcd
listen-client-urls: 'http://0.0.0.0:2379'
advertise-client-urls: 'http://10.0.0.1:2379'
listen-peer-urls: 'http://0.0.0.0:2380'
initial-advertise-peer-urls: 'http://10.0.0.1:2380'
initial-cluster: 'etcd-node-1=http://10.0.0.1:2380,etcd-node-2=http://10.0.0.2:2380,etcd-node-3=http://10.0.0.3:2380'
initial-cluster-token: 'pg-cluster'
initial-cluster-state: 'new'
EOF
```

**Create Patroni configuration** on each PostgreSQL node (`/etc/patroni/patroni.yml`):

```yaml
scope: pg-ha-cluster
namespace: /db/
name: pg-node-1        # Unique per node

restapi:
  listen: 0.0.0.0:8008
  connect_address: 10.0.0.1:8008

etcd:
  host: 10.0.0.1:2379,10.0.0.2:2379,10.0.0.3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576  # 1 MB
    postgresql:
      use_pg_rewind: true
      parameters:
        wal_level: replica
        hot_standby: "on"
        max_wal_senders: 10
        wal_keep_size: 1024
        max_connections: 200

  initdb: [auth: scram-sha-256]
  pg_hba:
    - host replication replicator 0.0.0.0/0 scram-sha-256
    - host all all 0.0.0.0/0 scram-sha-256

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 10.0.0.1:5432
  data_dir: /var/lib/postgresql/16/main
  bin_dir: /usr/lib/postgresql/16/bin
  authentication:
    replication:
      username: replicator
      password: rep_pass_123
    superuser:
      username: postgres
      password: admin_pass_123
    rewind:
      username: rewind_user
      password: rewind_pass_123
  create_replica_methods:
    - basebackup
  basebackup:
    checkpoint: fast

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

**Start Patroni on all nodes**:

```bash
# Stop any running PostgreSQL — Patroni manages it
sudo systemctl stop postgresql

# Start Patroni (as postgres user or root)
patroni /etc/patroni/patroni.yml &

# Or install as a systemd service
cat > /etc/systemd/system/patroni.service << 'EOF'
[Unit]
Description=Patroni HA Manager
After=network.target etcd.service

[Service]
User=postgres
Group=postgres
ExecStart=/usr/local/bin/patroni /etc/patroni/patroni.yml
KillMode=process
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now patroni
```

**Verify the Patroni cluster**:

```bash
# Check cluster status
patronictl -c /etc/patroni/patroni.yml list

# Example output:
# + Cluster: pg-ha-cluster -----+--------+--------+----+-----------+
# | Member    | Host            | Role    | State  | TL | Lag in MB |
# +-----------+-----------------+---------+--------+----+-----------+
# | pg-node-1 | 10.0.0.1:5432   | Leader  | running|  1 |           |
# | pg-node-2 | 10.0.0.2:5432   | Replica | running|  1 |         0 |
# | pg-node-3 | 10.0.0.3:5432   | Replica | running|  1 |         0 |
# +-----------+-----------------+---------+--------+----+-----------+
```

### Step 3: Test Automated Failover

Simulate a primary failure and verify Patroni promotes a new leader:

```bash
# Identify the current leader
LEADER=$(patronictl -c /etc/patroni/patroni.yml list | grep Leader | awk '{print $2}')
echo "Current leader: $LEADER"

# Simulate failure by stopping PostgreSQL on the leader
ssh "$LEADER" "sudo systemctl stop postgresql"

# Watch Patroni detect the failure and promote a new leader
patronictl -c /etc/patroni/patroni.yml list --watch
# Within ~30 seconds, a new leader should be elected
```

```sql
-- On the newly promoted primary, verify it accepts writes
CREATE TABLE failover_test (id serial primary key, promoted_at timestamptz DEFAULT now());
INSERT INTO failover_test DEFAULT VALUES;
SELECT * FROM failover_test;
```

**Bring the failed node back**:

```bash
# Patroni automatically reconfigured the failed node as a replica.
# Simply start the Patroni process on that node and it re-joins:
sudo systemctl start patroni
# Patroni runs pg_rewind automatically to sync with the new primary
```

```bash
# Verify all three nodes are healthy again
patronictl -c /etc/patroni/patroni.yml list
```

### Step 4: Implement Read/Write Splitting

Configure HAProxy to route write traffic to the Patroni leader and read traffic to replicas. Patroni exposes a REST API for health checks that indicate the node's role.

**Patroni REST endpoints for health checks**:

```bash
# On each Patroni node
curl -s http://localhost:8008/health | python3 -m json.tool
# Response includes "role": "master" or "replica"

# Get cluster topology
curl -s http://localhost:8008/cluster | python3 -m json.tool
```

**HAProxy configuration with Patroni health checks**:

```haproxy
# haproxy.cfg
global
    maxconn 5000

defaults
    mode tcp
    timeout connect 5s
    timeout client 60s
    timeout server 60s

# Write traffic → Patroni leader (port 8008 health check returns 200 only for leader)
frontend pg_write_frontend
    bind *:5432
    use_backend pg_primary

backend pg_primary
    option httpchk GET /health
    http-check expect status 200
    server pg-node-1 10.0.0.1:5432 check port 8008 fall 3 rise 2
    server pg-node-2 10.0.0.2:5432 check port 8008 fall 3 rise 2 backup
    server pg-node-3 10.0.0.3:5432 check port 8008 fall 3 rise 2 backup

# Read traffic → replicas (port 8008 health check for replica role)
frontend pg_read_frontend
    bind *:5433
    use_backend pg_replicas

backend pg_replicas
    option httpchk GET /replica
    http-check expect status 200
    server pg-node-2 10.0.0.2:5432 check port 8008 fall 3 rise 2
    server pg-node-3 10.0.0.3:5432 check port 8008 fall 3 rise 2
    server pg-node-1 10.0.0.1:5432 check port 8008 fall 3 rise 2 backup
```

### Step 5: Set Up Logical Replication for Selective Data Distribution

Logical replication is useful when only a subset of tables needs to be distributed, or when the subscriber runs a different PostgreSQL version.

**On the publisher (primary)**:

```sql
-- Create a publication for specific tables
CREATE PUBLICATION orders_pub
FOR TABLE orders, order_items, customers
WITH (publish = 'insert, update, delete, truncate');

-- Or publish all tables
CREATE PUBLICATION all_tables_pub
FOR ALL TABLES;

-- Verify publication
SELECT * FROM pg_publication;
SELECT * FROM pg_publication_tables;
```

**On the subscriber**:

```sql
-- Create the same table schema (must exist on subscriber)
CREATE TABLE orders (id serial primary key, ...);
CREATE TABLE order_items (id serial primary key, ...);
CREATE TABLE customers (id serial primary key, ...);

-- Create subscription connecting to publisher
CREATE SUBSCRIPTION orders_sub
CONNECTION 'host=publisher-host port=5432 dbname=mydb user=replicator password=...'
PUBLICATION orders_pub
WITH (copy_data = true,        -- Copy existing data on creation
      create_slot = true,      -- Create WAL slot automatically
      enabled = true);         -- Start replication immediately

-- Monitor subscription status
SELECT oid, subname, subenabled, subslotname
FROM pg_subscription;
```

**Monitoring logical replication**:

```sql
-- On subscriber: check sync state
SELECT * FROM pg_stat_subscription;

-- On publisher: check WAL sender for logical replication
SELECT application_name, state, sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS bytes_behind
FROM pg_stat_replication
WHERE application_name LIKE '%sub%';
```

**Handling schema changes**: Logical replication does not replicate DDL. When you alter a table on the publisher, you must make the same change on the subscriber:

```sql
-- On publisher
ALTER TABLE orders ADD COLUMN discount numeric(10,2) DEFAULT 0;

-- On subscriber (separate transaction)
ALTER TABLE orders ADD COLUMN discount numeric(10,2) DEFAULT 0;
```

### Step 6: Configure Point-in-Time Recovery and WAL Archiving

WAL archiving provides the ability to restore to any point in time, which is essential for disaster recovery and data recovery from logical errors.

**Configure WAL archiving on the primary**:

```conf
# postgresql.conf
archive_mode = on
archive_command = 'pgbackrest --stanza=prod archive-push %p'
archive_timeout = 60
```

**Using pgBackRest for backup and archive management**:

```conf
# /etc/pgbackrest/pgbackrest.conf
[prod]
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432

[global]
repo1-path=/backup/pgbackrest
repo1-retention-full=4
repo1-cipher-pass=backup_encryption_key

# S3 repository (for offsite DR)
repo2-type=s3
repo2-s3-bucket=my-db-backups
repo2-s3-region=us-east-1
repo2-retention-full=2
```

```bash
# Create the first full backup
sudo -u postgres pgbackrest --stanza=prod --type=full backup

# Create differential backups
sudo -u postgres pgbackrest --stanza=prod --type=diff backup

# Create incremental backups
sudo -u postgres pgbackrest --stanza=prod --type=incr backup

# List backups
sudo -u postgres pgbackrest --stanza=prod info

# Restore to the latest point-in-time
sudo -u postgres pgbackrest --stanza=prod --type=latest restore

# Restore to a specific point in time (PITR)
sudo -u postgres pgbackrest --stanza=prod --type=time \
  --target="2025-06-15 03:30:00 EST" --target-action=promote restore
```

### Step 7: Perform a Scheduled Failover Drill

Production HA is only as good as your failover testing. Run this drill quarterly:

```bash
# 1. Announce the maintenance window
echo "Starting quarterly HA failover drill"

# 2. Check cluster health baseline
patronictl -c /etc/patroni/patroni.yml list
# 3. Run a continuous write workload for verification
psql -h haproxy -p 5432 -c "
  CREATE TABLE IF NOT EXISTS ha_drill_log (
    id serial primary key, ts timestamptz default now(), host text
  );
  INSERT INTO ha_drill_log (host) VALUES (current_setting('listen_addresses'));
"

# 4. Perform a controlled switchover
patronictl -c /etc/patroni/patroni.yml switchover \
  --master pg-node-1 --candidate pg-node-2

# 5. Verify writes continue during switchover
psql -h haproxy -p 5432 -c "
  INSERT INTO ha_drill_log (host) VALUES ('after_switchover');
  SELECT count(*) FROM ha_drill_log;
"

# 6. Verify read traffic on replicas
psql -h haproxy -p 5433 -c "SELECT * FROM ha_drill_log ORDER BY id DESC LIMIT 5;"

# 7. Verify the new leader
patronictl -c /etc/patroni/patroni.yml list
# Expected: pg-node-2 is Leader, pg-node-1 is Replica

# 8. Switch back (optional)
patronictl -c /etc/patroni/patroni.yml switchover \
  --master pg-node-2 --candidate pg-node-1

# 9. Document results
echo "Failover drill completed successfully"
echo "Maximum observed replication lag during switchover: ..."
```

**Validation checklist for HA drills**:

- [ ] Application zero-downtime during switchover (no 5xx errors)
- [ ] No data loss (row count in `ha_drill_log` equals expected inserts)
- [ ] Replica lag returns to zero within 60 seconds of switchover completion
- [ ] All monitoring alerts fire correctly for the failover event
- [ ] Failback (switching back to the original primary) completes cleanly

### Step 8: Establish Ongoing Replication Monitoring

Deploy a monitoring stack that provides real-time visibility into replication health:

```bash
# Using postgres_exporter for Prometheus
cat > ~/postgres_exporter_replication.queries.yaml << 'EOF'
pg_replication:
  query: |
    SELECT client_addr, application_name, state, sync_state,
           pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_bytes
    FROM pg_stat_replication
  metrics:
    - client_addr:
        usage: "LABEL"
    - application_name:
        usage: "LABEL"
    - state:
        usage: "LABEL"
    - sync_state:
        usage: "LABEL"
    - replay_bytes:
        usage: "GAUGE"
        description: "Replication lag in bytes"
EOF

# Run exporter
DATA_SOURCE_NAME="postgresql://monitor_user:password@localhost:5432/postgres?sslmode=disable" \
  postgres_exporter \
  --extend.query-path=~/postgres_exporter_replication.queries.yaml \
  --web.listen-address=:9187
```

**Grafana dashboard panels for replication**:

1. **Replication Lag Panel** — Time-series graph of `replay_bytes` per standby, colored by sync state (green for sync, yellow for async)
2. **WAL Generation Rate** — Bytes of WAL generated per second on primary, useful for capacity planning
3. **Replication Slot Usage** — Bytes behind per slot with alerts for slots approaching the retention limit
4. **Failover Events** — Annotations on the dashboard timeline marking every Patroni leader change

Set up automated alerts in your monitoring system for these conditions:

- Replication lag exceeds 30 seconds for asynchronous standbys
- A replication slot has been inactive for more than 1 hour
- The number of connected WAL senders drops below the number of configured standbys
- Patroni leader lease expires (indicating a potential split-brain scenario)

## Conclusion

PostgreSQL replication and high availability is a deep topic that requires careful planning, robust automation, and continuous validation. Start with streaming replication for HA and read scaling, layer in Patroni for automated failover management, and add logical replication for specialized data distribution needs. The key to a successful HA deployment is not just the initial configuration but the ongoing discipline of monitoring, testing failover procedures, and validating that your RPO and RTO targets are consistently met. Run failover drills quarterly, archive WAL segments to offsite storage, and always have a tested recovery plan before you need it.

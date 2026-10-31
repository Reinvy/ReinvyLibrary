---
title: "Redis Observability Cheatsheet"
description: "Commands and configurations for inspecting Redis at runtime with INFO, SLOWLOG, MONITOR, LATENCY, and keyspace notifications, plus exporter metrics and alert thresholds for production dashboards."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Redis Observability Cheatsheet

## Quick Reference Table

| Action | Command | Description |
|--------|---------|-------------|
| Server identity and uptime | `INFO server` | Version, mode, run_id, uptime, config file |
| Clients and blocked connections | `INFO clients` | Connected clients, blocked clients, maxclients |
| Memory usage | `INFO memory` | `used_memory`, `used_memory_rss`, `maxmemory`, fragmentation |
| Persistence state | `INFO persistence` | Last save status, RDB/AOF state, fork time |
| Traffic and hit rate | `INFO stats` | Ops/sec, hits, misses, evictions, expired keys |
| Replication health | `INFO replication` | Role, replica offsets, master link status |
| Per-command cost | `INFO commandstats` | Call count and microseconds per command |
| Latency percentiles | `INFO latencystats` | p50/p99/p99.9 per command (Redis 7+) |
| Keyspace size | `INFO keyspace` | Keys, expires, and average TTL per database |
| Slow query log | `SLOWLOG GET 10` | Last ten entries above the configured threshold |
| Clear slow log | `SLOWLOG RESET` | Drop all entries after a tuning change |
| Live command stream | `MONITOR` | Debug only, cuts throughput significantly |
| Latency spikes | `LATENCY LATEST` | Latest sample per latency event class |
| Latency history | `LATENCY HISTORY fork` | Timestamped samples for one event |
| Reset latency data | `LATENCY RESET` | Clear all tracked events |
| Latency diagnosis | `LATENCY DOCTOR` | Human-readable advice on detected spikes |
| Enable notifications | `CONFIG SET notify-keyspace-events KEA` | Keyspace and keyevent channels, all classes |
| Subscribe to events | `PSUBSCRIBE __keyevent@0__:*` | Consume every event in database 0 |
| Big keys scan | `redis-cli --bigkeys` | Samples the keyspace for the largest key per type |
| Live stats view | `redis-cli --stat` | Rolling overview of keys, memory, clients, ops |
| Cluster state | `CLUSTER INFO` | Cluster state, slots assigned, known nodes |

**Alert thresholds worth starting with**

| Signal | Warning | Critical |
|--------|---------|----------|
| `redis_up` | — | `== 0` for 1m |
| Memory over `maxmemory` | `> 0.85` | `> 0.95` |
| Evicted keys rate | `> 0/s` over 5m | `> 100/s` over 5m |
| Rejected connections | `> 0/s` | `> 1/s` |
| Connected clients / `maxclients` | `> 0.75` | `> 0.90` |
| Keyspace hit ratio | `< 0.90` | `< 0.75` |
| Command p99 duration | `> 10ms` | `> 50ms` |
| Slow log growth | `> 10/min` | `> 100/min` |
| `rdb_last_bgsave_status` | — | `!= ok` |

## Common Commands

### Fast triage

```bash
# One-shot overview: version, memory, clients, traffic, evictions
redis-cli INFO server | grep -E 'redis_version|uptime_in_seconds'
redis-cli INFO memory | grep -E 'used_memory_human|maxmemory_human|mem_fragmentation_ratio'
redis-cli INFO stats  | grep -E 'instantaneous_ops_per_sec|keyspace_hits|keyspace_misses|evicted_keys'
redis-cli INFO clients | grep -E 'connected_clients|blocked_clients|maxclients'

# Hit ratio in one line (hits / (hits + misses))
redis-cli INFO stats | awk -F: '/keyspace_hits/ { h = $2 } /keyspace_misses/ { m = $2 }
  END { if (h + m > 0) printf "hit ratio: %.3f\n", h / (h + m); else print "no reads yet" }'
```

### Slow log tuning

```bash
# Log commands slower than 5 ms, keep the last 256 entries
redis-cli CONFIG SET slowlog-log-slower-than 5000
redis-cli CONFIG SET slowlog-max-len 256
redis-cli SLOWLOG GET 10
redis-cli SLOWLOG RESET
redis-cli SLOWLOG LEN

# Persist the settings so a restart does not silently revert them
redis-cli CONFIG REWRITE
```

### Latency monitoring

```bash
# Track any event that blocks the server for 10 ms or more
redis-cli CONFIG SET latency-monitor-threshold 10
redis-cli LATENCY LATEST
redis-cli LATENCY HISTORY command
redis-cli LATENCY DOCTOR
redis-cli LATENCY RESET

# Client-side round-trip probe and live server view
redis-cli --latency -h 127.0.0.1 -p 6379
redis-cli --stat
```

### Keyspace notifications

```bash
# Enable key events and keyspace channels for all classes
redis-cli CONFIG SET notify-keyspace-events KEA
redis-cli CONFIG GET notify-keyspace-events

# Watch expired and evicted keys in database 2
redis-cli PSUBSCRIBE '__keyevent@2__:expired' '__keyevent@2__:evicted'
```

### MONITOR, used carefully

```bash
# Debugging only: every command is forwarded to this client
timeout 5 redis-cli MONITOR | head -n 50
```

## Code Snippets

### redis.conf for observability

```ini
# Slow queries above 10 ms, keep 512 entries
slowlog-log-slower-than 10000
slowlog-max-len 512

# Track blocking events of 20 ms or more
latency-monitor-threshold 20

# Keyspace notifications: keyspace + keyevent, all classes
notify-keyspace-events KEA
```

### Run redis_exporter

```bash
docker run -d --name redis-exporter -p 9121:9121 \
  -e REDIS_ADDR=redis://:secret@redis-primary:6379 \
  oliver006/redis_exporter:v1.58.0

curl -s http://localhost:9121/metrics | grep -E '^redis_(up|memory_used_bytes|evicted_keys_total)'
```

### Prometheus alert rules

```yaml
groups:
  - name: redis-observability
    rules:
      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis {{ $labels.instance }} is unreachable"
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Redis {{ $labels.instance }} above 85% of maxmemory"
      - alert: RedisSlowCommands
        expr: histogram_quantile(0.99, sum by (le) (rate(redis_commands_duration_seconds_bucket[5m]))) > 0.05
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "p99 command latency above 50 ms on {{ $labels.instance }}"
```

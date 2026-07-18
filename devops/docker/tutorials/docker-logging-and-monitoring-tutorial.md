---
title: "Docker Logging and Monitoring Tutorial"
description: "A hands-on tutorial on implementing centralized logging with Docker logging drivers, Loki, and Promtail, plus container metrics collection with cAdvisor, Prometheus, and Grafana."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Docker Logging and Monitoring Tutorial

## Summary

This tutorial walks you through setting up a comprehensive logging and monitoring pipeline for Docker containers. You will learn how to configure Docker logging drivers, ship container logs to a centralized Loki instance using Promtail, collect container-level metrics with cAdvisor and Prometheus, and visualize everything in Grafana dashboards. By the end, you will have a production-ready observability stack running alongside your Docker applications.

## Target Audience

- DevOps engineers, backend developers, and platform engineers managing Docker containers.
- Intermediate-level developers comfortable with Docker Compose and basic Linux command-line operations.

## Prerequisites

- Docker Engine 20.10+ and Docker Compose v2 installed on your machine.
- Basic understanding of Docker containers, images, and Compose syntax.
- Ports 3000, 9090, 9091, and 9095 available on your host for Grafana, Prometheus, cAdvisor, and Loki respectively.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Configure Docker logging drivers (json-file, local, fluentd, and gelf) per-container and globally.
- Ship container logs to a centralized Loki instance using Promtail with multi-instance discovery.
- Deploy cAdvisor to expose real-time container resource metrics (CPU, memory, network, disk).
- Scrape cAdvisor metrics with Prometheus and write promQL queries for container monitoring.
- Build a Grafana dashboard combining application logs and infrastructure metrics.
- Set up health-check-based alerting using Docker events and webhook notifications.

## Context and Motivation

In production Docker environments, containers are ephemeral and can scale horizontally — traditional SSH-and-tail approaches to debugging become impossible. When a container crashes, its logs vanish with it unless they have been shipped to a central store. Similarly, CPU and memory spikes from a single misbehaving container can degrade neighbouring services, and without metrics you are flying blind.

A proper observability pipeline solves three problems:

- **Log centralisation**: all container stdout/stderr streams are collected in one queryable store, regardless of which host they ran on.
- **Metrics collection**: per-container resource usage is captured and retained for trend analysis, capacity planning, and automated scaling.
- **Alerting**: anomalous patterns trigger notifications before they become outages.

This tutorial builds a lightweight, open-source observability stack that works for a single developer workstation as well as a multi-node Docker Swarm or Compose-based deployment.

## Core Content

### Understanding Docker Logging Drivers

Docker captures the stdout and stderr streams of the container process (PID 1) and routes them through a **logging driver**. The driver determines where the log data is stored and in what format.

| Driver | Use Case | Pros | Cons |
|--------|----------|------|------|
| `json-file` | Default; single-host debugging | Zero configuration, `docker logs` works | No rotation by default, large files |
| `local` | Production single-host | Built-in compression and rotation | Custom binary format, not human-readable |
| `syslog` | Legacy syslog infrastructure | Integrates with existing syslog servers | UDP may drop messages under load |
| `fluentd` | Log shipping to aggregator | Buffered, tag-based routing, wide output plugin set | Requires running Fluentd daemon |
| `gelf` | Graylog Extended Log Format | Structured JSON, chunked messages for large payloads | Requires Graylog or compatible receiver |
| `awslogs` | AWS CloudWatch | Native AWS integration | AWS-specific, no local fallback |
| `journald` | systemd-based hosts | Integrated with systemd journal | systemd dependency, binary format |

By default, Docker uses `json-file` without rotation, which can cause a single verbose container to fill the host disk. For any production deployment, switch to a driver with rotation or a remote log aggregator.

#### Configuring the Logging Driver

Set the logging driver globally in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Or per-container (or per-service in Compose) for fine-grained control:

```yaml
services:
  app:
    image: my-app:latest
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "5"
```

> **Key insight**: Always configure `max-size` and `max-file` for `json-file` and `local` drivers. Without rotation, a container writing 1 MB/s of logs will consume 86 GB per day.

### Setting Up Loki for Centralized Log Storage

Loki is a horizontally-scalable, highly-available log aggregation system inspired by Prometheus. Unlike Elasticsearch, Loki **indexes labels (metadata) rather than the full log text**, making it significantly cheaper to operate for container-native workloads.

Create a `docker-compose.observability.yml` file for the monitoring stack:

```yaml
services:
  loki:
    image: grafana/loki:3.0
    ports:
      - "9095:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/config.yaml
    networks:
      - observability

  promtail:
    image: grafana/promtail:3.0
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/log:/var/log:ro
      - ./promtail-config.yaml:/etc/promtail/config.yaml
    command: -config.file=/etc/promtail/config.yaml
    networks:
      - observability
    depends_on:
      - loki

volumes:
  loki-data:

networks:
  observability:
    driver: bridge
```

#### Loki Configuration (`loki-config.yaml`)

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  wal:
    dir: /loki/wal

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

storage_config:
  filesystem:
    directory: /loki/chunks

compactor:
  working_directory: /loki/compactor
  retention_enabled: true

limits_config:
  retention_period: 168h
```

This configuration provides 7-day log retention with TSDB index format and local filesystem storage — suitable for development and small-scale deployments.

#### Promtail Configuration (`promtail-config.yaml`)

Promtail discovers log files on disk, attaches labels, and pushes them to Loki. The critical insight is that Docker stores container logs under `/var/lib/docker/containers/<container-id>/<container-id>-json.log` when using the `json-file` driver.

```yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    static_configs:
      - targets: ["localhost"]
        labels:
          job: "docker-logs"
          __path__: /var/lib/docker/containers/*/*-json.log
    pipeline_stages:
      - json:
          expressions:
            log: log
            stream: stream
            attrs: attrs
            tag: attrs.tag
      - labels:
          stream:
          tag:
      - regex:
          expression: "^(?P<time>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2})"
          source: "log"
        action: timestamp
        format: RFC3339
```

The JSON pipeline stage parses Docker's structured log format and extracts the `stream` (stdout/stderr) and `tag` (container name) as Prometheus-style labels, enabling fast filtering in Grafana.

### Collecting Container Metrics with cAdvisor

cAdvisor (Container Advisor) is Google's open-source tool for monitoring resource usage and performance characteristics of running containers. It exposes Prometheus metrics at `/metrics`.

Add cAdvisor to the observability stack:

```yaml
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest
  ports:
    - "9091:8080"
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
    - /dev/disk/:/dev/disk:ro
  devices:
    - /dev/kmsg
  privileged: true
  networks:
    - observability
```

> **Security note**: cAdvisor requires access to host system paths (`/rootfs`, `/var/run`, `/sys`) and runs privileged to collect metrics from the cgroups and namespaces subsystems. In production, restrict cAdvisor to a dedicated monitoring node or use Kubernetes' built-in metrics-server instead.

cAdvisor exposes metrics such as:
- `container_cpu_usage_seconds_total` — cumulative CPU time
- `container_memory_working_set_bytes` — current working-set memory
- `container_network_receive_bytes_total` — cumulative network RX
- `container_fs_usage_bytes` — filesystem usage

### Prometheus Scrape Configuration

Add Prometheus to the stack to scrape cAdvisor (and optionally Loki for operational metrics):

```yaml
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus-config.yaml:/etc/prometheus/prometheus.yml
    - prometheus-data:/prometheus
  networks:
    - observability

volumes:
  prometheus-data:
```

Prometheus configuration (`prometheus-config.yaml`):

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]
    metrics_path: /metrics
    relabel_configs:
      - source_labels: [__name__]
        regex: "container_(cpu|memory|network|fs|disk).*"
        action: keep
```

The `relabel_configs` filter keeps only container-level metrics, excluding cAdvisor's own host-level metrics.

### Visualizing with Grafana

Add Grafana with Prometheus and Loki as pre-configured data sources:

```yaml
grafana:
  image: grafana/grafana:latest
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
    - GF_INSTALL_PLUGINS=grafana-piechart-panel
  volumes:
    - grafana-data:/var/lib/grafana
    - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
  networks:
    - observability
  depends_on:
    - prometheus
    - loki

volumes:
  grafana-data:
```

Provision the data sources automatically via `grafana-datasources.yaml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
```

### Docker Events and Health Check Alerting

Docker emits events via `docker events --format '{{json .}}'` for container lifecycle changes (start, stop, die, health_status). Combine this with a webhook receiver for near-real-time alerting:

```bash
docker events --format '{{json .}}' \
  | jq -r 'select(.Type == "container" and .Action == "die") | .Actor.Attributes.name + " exited with status " + .Actor.Attributes.exitCode' \
  | while read -r alert; do
      curl -X POST -H "Content-Type: application/json" \
        -d "{\"text\": \"Container alert: $alert\"}" \
        https://hooks.slack.com/services/YOUR/WEBHOOK/URL
    done
```

For health checks, define a `HEALTHCHECK` instruction in your Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

Grafana can then alert on metrics from Prometheus. For example, a "high CPU" alert rule:

```promql
rate(container_cpu_usage_seconds_total{name!=""}[5m]) > 0.8
```

When this query returns a result for any container, the container is using more than 80% CPU averaged over the last 5 minutes.

## Code Examples

### Complete Observability Stack (`docker-compose.observability.yml`)

```yaml
services:
  loki:
    image: grafana/loki:3.0
    ports:
      - "9095:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/config.yaml
    networks:
      - observability

  promtail:
    image: grafana/promtail:3.0
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/log:/var/log:ro
      - ./promtail-config.yaml:/etc/promtail/config.yaml
    command: -config.file=/etc/promtail/config.yaml
    networks:
      - observability
    depends_on:
      loki:
        condition: service_started

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "9091:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    devices:
      - /dev/kmsg
    privileged: true
    networks:
      - observability

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus-config.yaml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - observability

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
      - grafana-data:/var/lib/grafana
    networks:
      - observability
    depends_on:
      - prometheus

volumes:
  loki-data:
  prometheus-data:
  grafana-data:

networks:
  observability:
    driver: bridge
```

### Docker Compose Integration with Application Services

Combine your application stack with the observability stack using a shared network:

```yaml
services:
  app:
    build: ./app
    ports:
      - "8080:8080"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - observability

networks:
  observability:
    external: true
```

Create the `observability` network first:

```bash
docker network create observability
```

Then start each stack independently:

```bash
docker compose -f docker-compose.observability.yml up -d
docker compose -f docker-compose.app.yml up -d
```

### Testing Log Shipping

Generate sample log lines to verify the pipeline:

```bash
docker run --rm --log-opt tag="test-logger" \
  alpine sh -c 'for i in $(seq 1 20); do echo "{\"message\":\"log entry $i\",\"level\":\"info\",\"app\":\"test\"}" && sleep 1; done'
```

Query Loki via the HTTP API:

```bash
curl -s "http://localhost:9095/loki/api/v1/query_range" \
  --data-urlencode 'query={tag="test-logger"}' \
  --data-urlencode 'limit=5' \
  | jq '.data.result[0].values[] | .[1]' 
```

You should see the 20 log entries returned as raw JSON strings.

## Key Insights

- **Always configure log rotation**: Without `max-size` and `max-file`, Docker's default `json-file` driver never rotates logs, leading to disk-full incidents in production.
- **Choose the right log driver for your scale**: For single-host setups, `local` with built-in compression is sufficient. For multi-host deployments, use `fluentd` or `gelf` to ship logs off-host.
- **Store logs and metrics separately**: Loki handles logs cheaply by indexing only labels; Prometheus handles high-cardinality metric data. Avoid putting log text into Prometheus label values.
- **cAdvisor is a development tool, not a production solution**: In Kubernetes, use the metrics-server. In Docker Swarm, use swarmprom or Docker's built-in metrics endpoint.
- **Rate-limit log shipping**: Configure Promtail's `batchwait` and `batchsize` to avoid overwhelming Loki during log bursts from verbose containers.
- **Secure your observability stack**: Never expose Prometheus, Loki, or Grafana to the public internet without authentication. Use reverse proxy authentication (OAuth2 Proxy, Authelia) or Grafana's built-in auth.

## Next Steps

- Explore Docker Swarm mode monitoring with the `swarmprom` project for a cluster-ready monitoring stack.
- Learn about OpenTelemetry for distributed tracing across multi-service Docker applications.
- Read the Docker Containerization Syllabus for a structured 12-week learning path covering Docker fundamentals through production deployment.

## Conclusion

In this tutorial, you built a complete Docker observability pipeline using open-source tools: Promtail ships container logs to Loki for centralised log storage, cAdvisor exposes container metrics that Prometheus scrapes, and Grafana ties everything together with unified dashboards. You also learned how to configure Docker logging drivers, set up health check alerting, and integrate the monitoring stack with your application services. This foundation scales from a single developer workstation to a multi-node Docker Swarm cluster, ensuring you never lose visibility into your containerised workloads.

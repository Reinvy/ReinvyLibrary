---
title: "PM2 Application Monitoring and Observability"
description: "A comprehensive tutorial on monitoring Node.js applications managed by PM2, covering built-in CLI tools, custom metrics APIs, external monitoring integration, log aggregation, alerting, and production observability best practices."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# PM2 Application Monitoring and Observability

## Summary

Running Node.js applications in production with PM2 is only half the battle — understanding how those applications behave under load, detecting anomalies before they become outages, and maintaining visibility into process health is what separates a reliable deployment from a fragile one. PM2 provides a rich monitoring ecosystem: from the interactive `pm2 monit` CLI dashboard and a built-in metrics API to seamless integration with external observability platforms like Prometheus, Grafana, and PM2 Plus (formerly Keymetrics). This tutorial covers every layer of PM2 observability — process-level health checks, real-time metrics collection, custom application metrics, log aggregation strategies, alerting, and integration with modern monitoring stacks — so you can build a production-grade observability pipeline around your PM2-managed applications.

## Target Audience

- Backend developers and DevOps engineers running Node.js applications with PM2 in production or staging environments.
- Developers who already know basic PM2 commands (`pm2 start`, `pm2 list`, `pm2 logs`) and want to add robust monitoring and alerting.
- Intermediate to advanced level: familiarity with Node.js, PM2 basics, and Linux process management is assumed.

## Prerequisites

- Node.js 16+ and npm installed.
- PM2 installed globally (`npm install -g pm2`).
- A running PM2-managed application (or willingness to create a sample app for testing).
- Basic familiarity with Linux command line, JSON, and HTTP concepts.
- For the Prometheus/Grafana section: Docker and Docker Compose installed (optional but recommended).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Interpret PM2's process status dashboard and diagnose common issues using `pm2 monit`, `pm2 show`, and `pm2 status`.
- Instrument your Node.js application with PM2's custom metrics API to expose business-relevant KPIs.
- Set up PM2 Plus (Keymetrics) for cloud-based real-time monitoring, alerting, and historical trend analysis.
- Configure Prometheus metric collection from PM2-managed processes and visualize them in Grafana.
- Implement structured log aggregation and centralize logs from multiple PM2 processes.
- Configure alerting rules for process crashes, memory leaks, and abnormal behavior.
- Build a complete production observability pipeline using PM2's built-in and external tools.

## Context and Motivation

### Why Monitoring Matters Beyond Basic Health Checks

PM2's most visible feature is keeping processes alive — if a crash occurs, PM2 automatically restarts it. However, a process that keeps restarting (a "flapping" process) may go unnoticed until users complain. Memory leaks accumulate gradually: a 50 MB leak might take days to trigger an OOM kill. Request latency can degrade slowly as connection pools fill up. Without monitoring, these silent degradations become production incidents.

### The Three Pillars of PM2 Observability

PM2's observability features span three layers:

1. **Built-in CLI monitoring** — `pm2 monit`, `pm2 show`, `pm2 status` provide real-time snapshots of CPU, memory, loop delay, and process state directly in your terminal. Zero configuration required.
2. **Custom application metrics** — PM2's metrics API lets you instrument your code to expose business metrics (request rate, error rate, queue depth, database pool size) alongside system metrics.
3. **External integration** — PM2 Plus provides a hosted dashboard with historical charts and alerts. For self-hosted setups, PM2's metrics endpoint integrates with Prometheus, and structured logs feed into Elasticsearch, Loki, or any log aggregation platform.

### What This Tutorial Builds

By the end, you will have a working observability stack:

```text
┌──────────────────────┐      ┌──────────────────┐
│  PM2-Managed Process  │──────▶  pm2 monit (CLI) │
│  (Node.js App)        │      └──────────────────┘
│                       │──────▶  PM2 Plus (Cloud) │
│  Custom Metrics:      │      └──────────────────┘
│  - HTTP req rate      │──────▶  Prometheus ──▶ Grafana
│  - Error rate         │      └──────────────────────┘
│  - DB pool size       │──────▶  Log Aggregation
│  - Queue depth        │      (Loki / ELK / File)
└──────────────────────┘      └──────────────────────┘
```

## Core Content

### Understanding PM2's Built-in Monitoring Commands

PM2 ships with several CLI commands that provide immediate visibility into process health without any additional tooling.

#### `pm2 status` (or `pm2 list`)

The most basic command shows process ID, name, mode (fork vs cluster), status, CPU usage, and memory usage:

```text
┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┐
│ id  │ name         │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │
├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┤
│ 0   │ api-server   │ default     │ 1.0.0   │ cluster │ 12345    │ 2D     │ 0    │ online    │
│ 1   │ worker       │ default     │ 1.0.0   │ fork    │ 12346    │ 2D     │ 1    │ online    │
│ 2   │ scheduler    │ default     │ 1.0.0   │ fork    │ 12347    │ 1D     │ 3    │ online    │
└─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┘
```

Key indicators to watch:

- **Status**: `online` is normal. `stopped`, `errored`, or `launching` indicate problems.
- **↺ (restart count)**: A high restart count suggests the process is crashing repeatedly. Investigate the logs with `pm2 logs <name> --lines 50`.
- **Uptime**: If uptime resets frequently (while restart count climbs), the process is flapping.
- **Memory**: Compare memory across instances. A single instance consuming significantly more memory than its peers may indicate a leak.

#### `pm2 show <name>`

Displays detailed metadata and metrics for a single process. The output includes:

```text
 Describing process with id 0 - name api-server
┌───────────────────┬───────────────────┐
│ status            │ online            │
│ name              │ api-server        │
│ version           │ 1.0.0             │
│ restarts          │ 0                 │
│ uptime            │ 2D                │
│ script path       │ /app/dist/server  │
│ script args       │ N/A               │
│ error log path    │ /var/log/pm2/err  │
│ out log path      │ /var/log/pm2/out  │
│ pid path          │ /var/run/pm2/pid  │
│ interpreter       │ node              │
│ interpreter args  │ N/A               │
│ script id         │ 0                 │
│ exec mode         │ cluster_mode      │
│ node.js version   │ 20.11.0           │
│ watch & reload    │ ✘                 │
│ unstable restarts │ 0                 │
│ created at        │ 2026-07-12T10:00  │
└───────────────────┴───────────────────┘
```

Pay special attention to **unstable restarts** — this counter increments when a process crashes more than 15 times in a rolling 30-second window. PM2 enters an "errored" state and stops auto-restarting if unstable restarts exceed the configured threshold.

#### `pm2 describe <id>`

Similar to `pm2 show` but returns machine-parseable JSON output, useful for scripting monitoring checks.

```bash
pm2 describe 0 --json | jq '.monit'
```

#### `pm2 prettylist`

Outputs the entire PM2 daemon state as formatted JSON. This is the richest data source for external monitoring scripts:

```bash
pm2 prettylist | jq '.[0] | {name: .name, pid: .pid, monit: .pm2_env.monit, unstable_restarts: .pm2_env.unstable_restarts}'
```

### The Interactive Dashboard: `pm2 monit`

The `pm2 monit` command opens a real-time terminal dashboard that refreshes every second. It displays:

- **Top section**: All processes with real-time CPU and memory.
- **Bottom section** (selected process): Detailed view showing:
  - CPU usage (percentage)
  - Memory usage (absolute and as process heap)
  - **Loop delay** (event loop lag in milliseconds) — critical for detecting blocked event loops
  - **Active handles** and **active requests** (libuv internal counters)

```text
 PM2 Monitoring (press Ctrl+C to exit)

 ┌─ Process List ─────────────────────────────────────────────────────┐
 │[0] api-server     MEM: 45.3 MB    CPU: 2.1%    loop: 1.23ms      │
 │[1] worker         MEM: 28.7 MB    CPU: 0.5%    loop: 0.89ms      │
 │[2] scheduler      MEM: 12.1 MB    CPU: 0.1%    loop: 0.45ms      │
 └───────────────────────────────────────────────────────────────────┘

 ┌─ api-server Details ──────────────────────────────────────────────┐
 │ ● Loop delay        : 1.23 ms                                      │
 │ ● Active handles    : 12                                            │
 │ ● Active requests   : 3                                             │
 │ ● Heap Size         : 32.1 MB / 64.0 MB                             │
 │ ● Heap Usage        : 50.2%                                         │
 │ ● Used Heap Size    : 32.1 MB                                       │
 │ ● Event Loop Lag    : 0.23 ms avg, 2.15 ms max                      │
 │ ● CPU               : 2.1%                                          │
 │ ● Memory            : 45.3 MB                                       │
 └────────────────────────────────────────────────────────────────────┘
```

**Loop delay** is one of the most valuable metrics in `pm2 monit`. A loop delay consistently above 100 ms indicates synchronous blocking operations (heavy computation, synchronous I/O, or deep Promise chains) that degrade throughput. When loop delay spikes to seconds, the application is essentially unresponsive.

### Application-Level Metrics with PM2's Metrics API

PM2 provides a programmatic metrics API (`@pm2/io`) that lets you instrument your application with custom metrics. These metrics appear in `pm2 monit`, PM2 Plus, and any Prometheus-compatible scraper.

#### Installation and Setup

```bash
npm install @pm2/io
```

Create a metrics module in your application:

```javascript
// metrics.js
const io = require('@pm2/io');

// Gauge: a value that can go up or down (current request rate, memory, etc.)
const httpRequestRate = io.metric({
  name: 'HTTP Request Rate',
  type: 'gauge', // 'gauge' | 'counter' | 'meter' | 'histogram'
});

// Counter: a value that only increases (total requests, errors, etc.)
const totalRequests = io.counter({
  name: 'Total Requests',
});

// Meter: a rate of events per second
const errorRate = io.meter({
  name: 'Error Rate',
  samples: 60, // keep 60 samples for moving average
});

// Histogram: statistical distribution of values (latency percentiles)
const requestLatency = io.histogram({
  name: 'Request Latency (ms)',
  measurement: 'mean', // 'mean' | 'min' | 'max' | 'stddev' | 'count'
});

module.exports = { httpRequestRate, totalRequests, errorRate, requestLatency };
```

#### Integrating Metrics into an Express Application

```javascript
// server.js
const express = require('express');
const metrics = require('./metrics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: track request rate and latency
app.use((req, res, next) => {
  const start = Date.now();
  metrics.totalRequests.inc(); // increment total counter

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.requestLatency.update(duration); // record latency

    // Update request rate gauge based on a sliding window
    // (simple approach — update every request)
    metrics.httpRequestRate.set(Math.round(1000 / duration));

    if (res.statusCode >= 400) {
      metrics.errorRate.mark(); // mark an error event
    }
  });

  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/users', async (req, res) => {
  // Simulated database query
  await new Promise(r => setTimeout(r, Math.random() * 50));
  res.json([{ id: 1, name: 'Alice' }]);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

#### Running with PM2

```bash
pm2 start server.js --name api-server -i 2
```

After starting, run `pm2 monit` and you will see the custom metrics appear in a separate section below the process details:

```text
 ┌─ Custom Metrics ───────────────────────────────────────────────────┐
 │ ● HTTP Request Rate  : 12 req/s                                    │
 │ ● Total Requests      : 45,892                                      │
 │ ● Error Rate          : 0.23 events/s                               │
 │ ● Request Latency (ms): mean: 23.4  min: 2.1  max: 145.2           │
 └────────────────────────────────────────────────────────────────────┘
```

#### Advanced Custom Metric Patterns

**Tracking Database Connection Pool Usage**

```javascript
// database-pool-metric.js
const io = require('@pm2/io');

class PoolMonitor {
  constructor(pool) {
    this.pool = pool;
    this.activeConnections = io.metric({
      name: 'DB Active Connections',
    });
    this.idleConnections = io.metric({
      name: 'DB Idle Connections',
    });
    this.pendingRequests = io.metric({
      name: 'DB Pending Requests',
    });

    // Poll every 5 seconds
    this.interval = setInterval(() => this.refresh(), 5000);
  }

  refresh() {
    this.activeConnections.set(this.pool.totalCount - this.pool.idleCount);
    this.idleConnections.set(this.pool.idleCount);
    this.pendingRequests.set(this.pool.waitingRequestsCount);
  }

  stop() {
    clearInterval(this.interval);
  }
}

module.exports = PoolMonitor;
```

**Tracking Queue Depth (Bull/BullMQ)**

```javascript
// queue-metric.js
const io = require('@pm2/io');
const Queue = require('bull');

const taskQueue = new Queue('task-processing', 'redis://localhost:6379');

const queueDepth = io.metric({
  name: 'Task Queue Depth',
});

const queueLatency = io.histogram({
  name: 'Queue Processing Latency (ms)',
  measurement: 'mean',
});

// Poll queue depth every 10 seconds
setInterval(async () => {
  const count = await taskQueue.getWaitingCount();
  queueDepth.set(count);
}, 10000);

// Track per-job latency
taskQueue.process(async (job) => {
  const start = Date.now();
  // ... process job ...
  queueLatency.update(Date.now() - start);
});
```

### Tracing Configuration with Runtime Metrics

PM2 automatically collects runtime metrics — event loop latency, garbage collection statistics, and HTTP tracing — when `@pm2/io` is initialized. These provide deep visibility into the Node.js runtime itself.

#### Event Loop Monitoring

```javascript
const io = require('@pm2/io');

// PM2 automatically tracks event loop metrics
// Access them via io.loopMetrics
const loopHistogram = io.histogram({
  name: 'Event Loop Delay (ms)',
  measurement: 'p95',
});

// Check event loop health periodically
setInterval(() => {
  const delay = io.loopMetrics?.delay();
  if (delay) {
    loopHistogram.update(delay);
    if (delay > 100) {
      console.warn(`WARNING: Event loop blocked for ${delay}ms`);
    }
  }
}, 1000);
```

#### Garbage Collection Metrics

```javascript
// Garbage collection tracking (Node.js 20+ with --expose-gc)
const io = require('@pm2/io');

if (global.gc) {
  const gcDuration = io.histogram({
    name: 'GC Pause Duration (ms)',
    measurement: 'max',
  });

  const gcFrequency = io.meter({
    name: 'GC Frequency',
    samples: 60,
  });

  // Monkey-patch gc to track calls (simplified — use perf_hooks in production)
  const originalGc = global.gc;
  global.gc = function() {
    const start = Date.now();
    originalGc.call(global);
    gcDuration.update(Date.now() - start);
    gcFrequency.mark();
  };
}
```

### External Monitoring Integration: PM2 Plus

PM2 Plus (formerly Keymetrics) is the official SaaS monitoring platform for PM2. It provides:

- Real-time dashboards with historical data (CPU, memory, loop delay).
- Custom metric charts with configurable time ranges.
- Alert rules triggered by metric thresholds or process events.
- Team collaboration with shared dashboards and notification channels.
- Integration with Slack, PagerDuty, email, and webhooks.

#### Setup

```bash
# Install the PM2 Plus module
pm2 install pm2-server-monit

# Link your PM2 instance to PM2 Plus
pm2 link <secret-key> <public-key> <machine-name>
```

The secret and public keys are available from the PM2 Plus dashboard after creating an account at `https://app.pm2.io/`.

#### Configuring Alerts

Once connected, you can set up alerts from the PM2 Plus web interface:

| Alert Type | Threshold | Example Use Case |
|---|---|---|
| Memory usage | `> 512 MB` | Detect memory leaks |
| CPU usage | `> 80% for 5 minutes` | Capacity planning |
| Loop delay | `> 500 ms` | Blocked event loop |
| Restart count | `> 5 in 10 minutes` | Flapping process |
| Custom metric | Error Rate > 10/min | Application error spike |

### Self-Hosted Monitoring: Prometheus + Grafana

For teams that require self-hosted monitoring (air-gapped environments, data sovereignty requirements, or cost optimization), PM2 can expose metrics in Prometheus format via the `@pm2/io` metrics endpoint.

#### Step 1: Expose Metrics Endpoint

```javascript
// metrics-server.js — Standalone metrics HTTP server
const io = require('@pm2/io');
const http = require('http');

// PM2's built-in Prometheus exporter format
const server = http.createServer((req, res) => {
  if (req.url === '/metrics') {
    const metrics = io.getMetrics(); // returns array of metric objects
    const prometheusOutput = metrics.map(m => formatPrometheus(m)).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(prometheusOutput);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

function formatPrometheus(metric) {
  // Convert PM2 metric to Prometheus text format
  const name = metric.name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_');

  const lines = [`# HELP pm2_${name} ${metric.name}`, `# TYPE pm2_${name} gauge`];

  if (typeof metric.value === 'object') {
    // Histogram metrics have multiple values
    for (const [key, val] of Object.entries(metric.value)) {
      lines.push(`pm2_${name}{quantile="${key}"} ${val}`);
    }
  } else {
    lines.push(`pm2_${name} ${metric.value}`);
  }

  return lines.join('\n');
}

const PORT = 9095;
server.listen(PORT, () => {
  console.log(`Metrics server listening on http://localhost:${PORT}/metrics`);
});
```

Start as a separate PM2 process:

```bash
pm2 start metrics-server.js --name metrics-exporter --no-autorestart
```

#### Step 2: Prometheus Scrape Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'pm2-apps'
    static_configs:
      - targets: ['localhost:9095']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

#### Step 3: Grafana Dashboard

Create a Grafana dashboard with panels for:

- **CPU and Memory** by process (time series, one line per process name).
- **Event Loop Delay** (heatmap or time series with warning threshold line at 100ms).
- **Custom metrics** (request rate, error rate, queue depth).
- **Restart events** (annotations on the timeline when processes restart).

Import a prebuilt dashboard JSON from the PM2 community or create your own from the `pm2_server_monit` metrics.

### Log Aggregation and Centralized Logging

PM2 manages log files for each process. In production, you need centralized log aggregation to search, filter, and alert across all processes and hosts.

#### PM2 Log Configuration

Configure log behavior in your ecosystem file:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      error_file: '/var/log/pm2/api-error.log',   // stderr output
      out_file: '/var/log/pm2/api-out.log',         // stdout output
      merge_logs: true,                              // merge all instances
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',     // ISO timestamps
      log_type: 'json',                              // structured JSON logs
    },
  ],
};
```

#### Structured JSON Logging

For effective log aggregation, output logs as structured JSON rather than free text:

```javascript
// logger.js — Structured JSON logger
function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    pid: process.pid,
    app: process.env.name || 'unknown',
    ...meta,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

module.exports = { log };
```

Usage:

```javascript
const logger = require('./logger');

logger.log('info', 'Server started', { port: 3000 });
logger.log('error', 'Database connection failed', { error: err.message, retry: 3 });
```

When `log_type: 'json'` is set in the ecosystem file, PM2 appends each JSON object on its own line, making them directly ingestible by log shippers like Filebeat, Promtail, or Fluentd.

#### Shipping Logs to Loki (Grafana Stack)

```yaml
# promtail-config.yml
scrape_configs:
  - job_name: pm2
    static_configs:
      - targets: ['localhost']
        labels:
          job: pm2
          __path__: /var/log/pm2/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
            pid: pid
            app: app
      - labels:
          level: level
          app: app
      - timestamp:
          source: timestamp
          format: RFC3339
```

### Alerting and Automated Remediation

Beyond PM2 Plus alerts, you can build your own alerting pipeline using the PM2 API and external services.

#### Programmatic Health Check with Slack Alerts

```javascript
// health-monitor.js
const pm2 = require('pm2');
const https = require('https');

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const CHECK_INTERVAL = 30_000; // 30 seconds
const MEMORY_THRESHOLD_MB = 500;
const LOOP_DELAY_THRESHOLD_MS = 200;

function sendSlackAlert(message) {
  if (!SLACK_WEBHOOK_URL) return;
  const data = JSON.stringify({ text: `🚨 PM2 Alert: ${message}` });
  const url = new URL(SLACK_WEBHOOK_URL);
  const req = https.request({ hostname: url.hostname, path: url.pathname, method: 'POST' });
  req.write(data);
  req.end();
}

function checkProcesses() {
  pm2.list((err, processes) => {
    if (err) {
      console.error('Failed to list PM2 processes:', err);
      return;
    }

    processes.forEach(proc => {
      const monit = proc.pm2_env.monit || {};
      const memoryMB = Math.round(monit.memory / 1024 / 1024);

      // Check for high memory usage
      if (memoryMB > MEMORY_THRESHOLD_MB) {
        sendSlackAlert(
          `*${proc.name}* memory at ${memoryMB} MB (threshold: ${MEMORY_THRESHOLD_MB} MB)`
        );
      }

      // Check for unstable restarts
      if (proc.pm2_env.unstable_restarts > 3) {
        sendSlackAlert(
          `*${proc.name}* has ${proc.pm2_env.unstable_restarts} unstable restarts`
        );
      }

      // Check loop delay via pm2 monit data
      const loopDelay = monit.loop_delay || 0;
      if (loopDelay > LOOP_DELAY_THRESHOLD_MS) {
        sendSlackAlert(
          `*${proc.name}* loop delay at ${loopDelay} ms (threshold: ${LOOP_DELAY_THRESHOLD_MS} ms)`
        );
      }
    });
  });
}

setInterval(checkProcesses, CHECK_INTERVAL);
console.log('PM2 Health Monitor started (checking every 30 seconds)');
```

Run as a separate PM2 process to monitor all other processes:

```bash
pm2 start health-monitor.js --name health-monitor
```

#### Graceful Auto-Remediation with PM2 Actions

PM2's programmatic API allows automated recovery actions:

```javascript
// auto-remediation.js
const pm2 = require('pm2');

async function remediateProcess(processName) {
  return new Promise((resolve, reject) => {
    pm2.list((err, processes) => {
      if (err) return reject(err);

      const target = processes.find(p => p.name === processName);
      if (!target) return reject(new Error('Process not found'));

      // Strategy 1: Reload (zero-downtime) if cluster mode
      if (target.pm2_env.exec_mode === 'cluster_mode') {
        pm2.reload(processName, (err) => {
          if (err) reject(err);
          else resolve('reloaded');
        });
      }
      // Strategy 2: Restart (brief downtime) if fork mode
      else {
        pm2.restart(processName, (err) => {
          if (err) reject(err);
          else resolve('restarted');
        });
      }
    });
  });
}
```

### Building a Complete Monitoring Dashboard (HTML/JS)

For teams that want a lightweight web dashboard without external dependencies, you can build one using PM2's built-in Web API:

```bash
# Enable the PM2 web API
pm2 web [port]  # default port 9615
```

This exposes a REST API at `http://localhost:9615/` that returns JSON process data. You can consume it from any frontend application or monitoring tool:

```bash
curl http://localhost:9615/ | jq '.'
```

## Code Examples

### Complete Ecosystem File with Monitoring Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      // Application process
      name: 'api-server',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      error_file: '/var/log/pm2/api-error.log',
      out_file: '/var/log/pm2/api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_type: 'json',
      // Restart strategies
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      autorestart: true,
      cron_restart: '0 4 * * *', // daily 4 AM restart for memory refresh
    },
    {
      // Metrics exporter for Prometheus scraping
      name: 'metrics-exporter',
      script: 'metrics-server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: false, // no need to restart a stateless endpoint
      env: {
        PORT: 9095,
      },
    },
    {
      // Health monitor with Slack alerts
      name: 'health-monitor',
      script: 'health-monitor.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
      },
    },
  ],
};
```

### Script: Historical Metrics Dump to CSV

Use this script to dump PM2 metrics at regular intervals for post-hoc analysis:

```bash
#!/bin/bash
# metrics-dump.sh
OUTPUT="/var/log/pm2/metrics-$(date +%Y%m%d).csv"
echo "timestamp,name,status,memory_mb,cpu_pct,uptime_sec,restarts,loop_delay_ms" > "$OUTPUT"

while true; do
  pm2 prettylist | jq -r '
    .[] | [
      now | strftime("%Y-%m-%dT%H:%M:%SZ"),
      .name,
      .pm2_env.status,
      (.pm2_env.monit.memory / 1024 / 1024 | floor),
      .pm2_env.monit.cpu,
      .pm2_env.pm_uptime // 0,
      .pm2_env.restart_time // 0,
      .pm2_env.monit.loop_delay // 0
    ] | @csv
  ' >> "$OUTPUT"
  sleep 60
done
```

## Key Insights

- **The loop delay metric is your most important early warning signal.** A rising event loop delay (visible in `pm2 monit`) indicates synchronous blocking before CPU or memory metrics show any anomaly. Set an alert at `> 100 ms` for proactive intervention.
- **Separate monitoring from what you monitor.** Run metrics exporters (`metrics-server.js`) and health monitors (`health-monitor.js`) as their own PM2 processes with `autorestart: false`. This decouples the monitoring plane from the application plane — even if the app crashes, your metrics endpoint still responds.
- **Structured JSON logging is non-negotiable in production.** Free-text logs are human-readable but machine-unfriendly. With `log_type: 'json'` in your ecosystem file and JSON output from your application, log aggregation tools (Loki, ELK, Datadog) can index every field automatically.
- **PM2 Plus vs self-hosted Prometheus/Grafana**: PM2 Plus is zero-configuration and includes built-in alerting but requires a paid subscription at scale. Prometheus + Grafana requires more setup but gives you full data ownership and integrates with your existing infrastructure monitoring.
- **The PM2 metrics API (`@pm2/io`) works in both fork and cluster mode**, but custom metrics are per-process. In cluster mode, each instance has its own metrics collector. Aggregate metrics at the monitoring layer (Prometheus recording rules or dashboard-level queries) rather than inside the application.
- **`max_memory_restart` is a safety net, not a monitoring strategy.** Setting `max_memory_restart: '500M'` in your ecosystem file restarts the process when it exceeds 500 MB, but the restart resets all in-process metrics. Use it as a last resort — monitor memory trends proactively so you never hit the limit unexpectedly.
- **Unstable restarts are more dangerous than normal restarts.** When PM2 detects more than 15 crashes in 30 seconds, it marks the process as "errored" and stops auto-restarting. Monitor `pm2_env.unstable_restarts` in your alerting pipeline and page on-call engineers immediately when this counter increments.

## Next Steps

- Follow the **PM2 Production Deployment Guide** (`devops/pm2/guides/pm2-production-deployment-guide.md`) to integrate this monitoring setup into a full CI/CD pipeline with blue-green deployments and automated rollback.
- Learn about **PM2 Microservices Architecture** (`devops/pm2/tutorials/pm2-microservices-architecture.md`) to apply these monitoring patterns across multi-service deployments with centralized log aggregation and per-service metrics.
- Explore the **PM2 Process Management Syllabus** (`devops/pm2/syllabi/pm2-process-management-syllabus.md`) for a structured learning path covering everything from basic process management to enterprise-grade monitoring and deployment.
- For Kubernetes deployments, study **Kubernetes Production Best Practices** (`devops/kubernetes/guides/kubernetes-production-best-practices.md`) to understand how PM2 monitoring patterns translate to container orchestration environments.

## Conclusion

PM2's monitoring capabilities span far beyond simple process health checks. From the interactive `pm2 monit` dashboard that provides real-time CPU, memory, and event loop metrics, to the custom metrics API that lets you instrument application-level KPIs, to external integrations with PM2 Plus, Prometheus, Grafana, and log aggregation platforms — PM2 provides a complete observability stack for Node.js applications in production.

By implementing the patterns in this tutorial — structured JSON logging, custom application metrics, proactive health monitoring with alerting, and integration with your existing observability infrastructure — you transform PM2 from a process manager into a comprehensive monitoring platform. Your team gains the visibility needed to detect anomalies early, diagnose issues quickly, and maintain the reliability that production applications demand.

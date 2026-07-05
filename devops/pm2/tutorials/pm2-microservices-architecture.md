---
title: "Building Microservices with PM2"
description: "A comprehensive tutorial on managing multiple Node.js microservices with PM2, covering multi-app ecosystem files, service dependency ordering, inter-process communication, and centralized monitoring."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building Microservices with PM2

## Summary

Modern applications are rarely monolithic — they consist of multiple services: an API server, a background worker, a WebSocket gateway, a scheduled job processor, and more. PM2 excels not only at managing a single Node.js process but at orchestrating multiple services within a unified ecosystem. This tutorial teaches you how to define, orchestrate, monitor, and deploy a fleet of Node.js microservices using a single PM2 configuration, covering dependency ordering, inter-process signals, log aggregation, per-service scaling, and production deployment strategies.

## Target Audience

- Backend developers and DevOps engineers managing multi-service Node.js architectures.
- Developers already familiar with basic PM2 usage (start, stop, list) who want to orchestrate multiple services.
- Advanced level: assumes working knowledge of PM2 basics, Node.js, and Linux.

## Prerequisites

- Node.js 18+ and npm installed.
- PM2 installed globally (`npm install -g pm2`).
- Basic experience with PM2 commands and ecosystem files.
- Familiarity with Linux processes and signals.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Define multiple services (API server, worker queue, scheduler, WebSocket gateway) in a single PM2 ecosystem file.
- Configure service-specific environment variables, scaling rules, and restart policies.
- Orchestrate service startup order with inter-dependency waiting strategies.
- Implement graceful shutdown across a microservices fleet.
- Aggregate and centralize logs from all services.
- Deploy multi-service applications with zero-downtime strategies.
- Monitor and debug inter-service communication in production.

## Context and Motivation

A typical Node.js monolith runs as a single process — one `app.js`, one `pm2 start`, one `SERVER_READY` log line. But as your application grows, you naturally decompose it into specialized services: an HTTP API that handles user requests, a worker process that processes background jobs, a cron scheduler that triggers nightly reports, and a WebSocket gateway that pushes real-time updates to connected clients.

Managing each of these services with separate PM2 sessions, separate terminal windows, or separate CI/CD pipelines creates operational friction. Environment variables drift between services. Logs scatter across files. One service dies silently while others continue running, leading to subtle data corruption. Restart order matters — the worker must connect to the API's database pool, but if the API isn't ready yet, the worker crashes in a startup loop.

PM2's multi-app ecosystem file solves all of this. You define every service in a single configuration, set their dependencies, configure per-service scaling and restart policies, and orchestrate them as a unified system. This tutorial walks through a realistic multi-service architecture and teaches you the patterns that keep microservices running reliably in production.

## Core Content

### 1. Designing a Multi-Service Architecture

Consider a typical e-commerce backend decomposed into four services:

| Service | Role | Port | Instances |
|---------|------|------|-----------|
| `api` | RESTful HTTP API (Express.js) | 3000 | `max` (all cores) |
| `worker` | Background job processor (Bull/BullMQ) | — | 2 |
| `scheduler` | Cron-based scheduled tasks | — | 1 |
| `websocket` | Real-time event gateway (Socket.IO) | 4000 | 1 |

Each service has different requirements:
- The **API** needs high throughput and uses all CPU cores in cluster mode.
- The **Worker** pulls jobs from Redis — two instances prevent conflicts while maximizing throughput.
- The **Scheduler** must run as a singleton — duplicate instances would trigger the same cron job twice.
- The **WebSocket** gateway manages in-memory connection state and must restart gracefully.

### 2. Defining Multiple Apps in the Ecosystem File

The `ecosystem.config.js` file accepts an `apps` array, where each element defines one service:

```javascript
module.exports = {
  apps: [
    {
      name: 'api',
      script: 'services/api/src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
      },
      max_memory_restart: '500M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
    },
    {
      name: 'worker',
      script: 'services/worker/src/index.js',
      instances: 2,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
        QUEUE_CONCURRENCY: '5',
      },
      max_memory_restart: '300M',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      merge_logs: true,
    },
    {
      name: 'scheduler',
      script: 'services/scheduler/src/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
      },
      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log',
    },
    {
      name: 'websocket',
      script: 'services/websocket/src/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        WS_PORT: 4000,
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
      },
      max_memory_restart: '400M',
      error_file: './logs/websocket-error.log',
      out_file: './logs/websocket-out.log',
    },
  ],
};
```

Start all services with a single command:

```bash
pm2 start ecosystem.config.js
```

### 3. Service Dependency and Startup Ordering

When services depend on each other, startup order matters. The `api` and `websocket` services need Redis available before they can establish connections. The `worker` needs the database ready. PM2 does not enforce startup order by default — all services start concurrently.

**Option A — Health check wait loop**: Each service waits for its dependencies in its own startup code:

```javascript
// services/api/src/server.js
const waitForRedis = async (retries = 10, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const redis = new Redis(process.env.REDIS_URL);
      await redis.ping();
      await redis.quit();
      console.log('[api] Redis is ready');
      return;
    } catch {
      console.log(`[api] Waiting for Redis... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('[api] Redis did not become ready');
};

const start = async () => {
  await waitForRedis();
  const app = express();
  // ... route registration, middleware
  app.listen(process.env.PORT, () => {
    console.log(`[api] Listening on port ${process.env.PORT}`);
  });
};
start();
```

**Option B — PM2 `wait_ready` and `listen_timeout`**: PM2 has a built-in ready-signal mechanism. Configure the dependent service to wait for a ready notification:

```javascript
module.exports = {
  apps: [
    {
      name: 'redis-dependency',
      script: 'services/redis-sidecar/index.js',
      wait_ready: true,
      listen_timeout: 30000,
    },
    {
      name: 'api',
      script: 'services/api/src/server.js',
      wait_ready: true,
      listen_timeout: 30000,
    },
  ],
};
```

In your service, emit the ready signal after initialization:

```javascript
// services/api/src/server.js
const app = express();
await waitForRedis();
app.listen(process.env.PORT, () => {
  console.log('[api] Server started, signaling ready');
  if (process.send) process.send('ready');
});
```

Then start services with:

```bash
pm2 start ecosystem.config.js --only 'redis-dependency'
# Wait for ready signal, then:
pm2 start ecosystem.config.js --only 'api'
```

**Option C — Systemd-style dependency (external tool)**: For complex dependency chains, use a wrapper script that orchestrates startup:

```bash
#!/bin/bash
# scripts/start-all.sh
pm2 start ecosystem.config.js --only 'redis-sidecar'
pm2 wait  # Wait for all started processes to be ready
pm2 start ecosystem.config.js --only 'api,worker,websocket'
```

### 4. Inter-Service Communication with Process Signals

When microservices need to communicate shutdown or reload events, PM2's signal forwarding is indispensable:

```javascript
// services/websocket/src/index.js
const connections = new Set();

process.on('SIGUSR2', () => {
  console.log('[websocket] Received SIGUSR2 — draining connections...');
  for (const socket of connections) {
    socket.emit('server-maintenance');
    socket.disconnect(true);
  }
  connections.clear();
  console.log('[websocket] All connections drained');
});

process.on('SIGTERM', async () => {
  console.log('[websocket] Received SIGTERM — shutting down...');
  // Stop accepting new connections
  // Drain existing connections with timeout
  const drainTimeout = setTimeout(() => {
    console.log('[websocket] Drain timeout — force exiting');
    process.exit(1);
  }, 30000);
  // Gracefully close all sockets
  for (const socket of connections) {
    socket.disconnect(true);
  }
  clearTimeout(drainTimeout);
  process.exit(0);
});
```

Send signals to specific services:

```bash
# Reload WebSocket connections without restarting other services
pm2 sendSignal SIGUSR2 websocket

# Graceful full-system restart
pm2 reload ecosystem.config.js
```

### 5. Per-Service Restart Strategies

Different services need different restart behaviors:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    // API: restart forever, but with backoff
    {
      name: 'api',
      script: 'services/api/src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      exp_backoff_restart_delay: 100,
      // Exponential backoff: 100ms, 200ms, 400ms, ... up to 30s
    },
    // Worker: stop after 5 crashes — manual intervention needed
    {
      name: 'worker',
      script: 'services/worker/src/index.js',
      instances: 2,
      max_restarts: 5,
      min_uptime: '5s',
      restart_delay: 10000,
    },
    // Scheduler: auto-restart with fixed 30s delay
    {
      name: 'scheduler',
      script: 'services/scheduler/src/index.js',
      instances: 1,
      max_restarts: 3,
      restart_delay: 30000,
    },
    // WebSocket: always restart immediately
    {
      name: 'websocket',
      script: 'services/websocket/src/index.js',
      instances: 1,
      max_restarts: 0, // 0 means unlimited
    },
  ],
};
```

| Strategy | When to Use |
|----------|-------------|
| Unlimited restarts (`max_restarts: 0`) | Critical services that must always be running |
| Limited with backoff | Services with transient dependencies (database, Redis) |
| Limited with fixed delay | Non-critical scheduled tasks |
| Stop after N crashes | Services that need manual investigation after repeated failures |

### 6. Log Aggregation Across Services

With multiple services, scattered log files become unmanageable. Centralize them:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    // Each service writes to the same directory
    {
      name: 'api',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    // ... repeat for each service
  ],
};
```

Use PM2's log rotation plugin for all services:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

View logs from all services with a single command:

```bash
# All services, streaming
pm2 logs

# Specific services only
pm2 logs api worker

# Last 100 lines of a specific service
pm2 logs websocket --lines 100

# JSON-formatted logs for programmatic consumption
pm2 logs --json --lines 50 > /tmp/recent-logs.json
```

For centralized log management in production, forward PM2 logs to an external system. Each service can write structured JSON that a log shipper (Filebeat, Fluentd) forwards to Elasticsearch or Loki:

```javascript
// services/api/src/logger.js
const log = (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    service: 'api',
    level,
    message,
    ...meta,
  };
  // PM2 captures stdout for out_file
  process.stdout.write(JSON.stringify(entry) + '\n');
};

log('info', 'Server started', { port: process.env.PORT, instances: 'max' });
```

### 7. Zero-Downtime Multi-Service Deployment

When deploying updates across multiple microservices, the order matters. The standard approach is:

1. **Worker first** — updated job handlers can process new jobs while old API instances still run.
2. **API next** — rolling reload across API instances (zero downtime).
3. **WebSocket last** — connection draining ensures clients reconnect to the updated gateway.

Implement this with a deployment script:

```bash
#!/bin/bash
# scripts/deploy.sh
set -e

echo "Pulling latest code..."
git pull origin main
npm install --production

echo "Rebuilding services..."
npm run build

echo "Reloading worker (job handlers)..."
pm2 reload worker --update-env
sleep 5

echo "Reloading API (rolling, zero-downtime)..."
pm2 reload api --update-env
sleep 10

echo "Reloading WebSocket (connection draining)..."
pm2 sendSignal SIGUSR2 websocket
sleep 3
pm2 reload websocket --update-env

echo "Reloading scheduler..."
pm2 reload scheduler --update-env

echo "Deployment complete."
pm2 status
```

For true zero-downtime with cluster mode, PM2's `reload` performs rolling restart — it restarts workers one at a time while keeping the rest serving traffic:

```bash
pm2 reload api --update-env
# PM2: [api] [worker:1] reloading...
# PM2: [api] [worker:1] reloaded (waiting for ready signal)
# PM2: [api] [worker:2] reloading...
# PM2: [api] [worker:2] reloaded (waiting for ready signal)
```

### 8. Monitoring a Multi-Service Fleet

Monitor all services at a glance:

```bash
pm2 status
# ┌──────────────┬────┬─────────┬──────┬─────────┬─────────┬──────────┐
# │ App name     │ id │ mode    │ pid  │ status  │ restart │ uptime   │
# ├──────────────┼───┼──────────┼──────┼─────────┼─────────┼──────────┤
# │ api          │ 0  │ cluster │ 1234 │ online  │ 0       │ 2h       │
# │ api          │ 1  │ cluster │ 1235 │ online  │ 0       │ 2h       │
# │ worker       │ 2  │ fork    │ 1236 │ online  │ 1       │ 1h       │
# │ worker       │ 3  │ fork    │ 1237 │ online  │ 0       │ 1h       │
# │ scheduler    │ 4  │ fork    │ 1238 │ online  │ 0       │ 30m      │
# │ websocket    │ 5  │ fork    │ 1239 │ online  │ 2       │ 45m      │
# └──────────────┴───┴──────────┴──────┴─────────┴─────────┴──────────┘
```

Inspect individual services:

```bash
pm2 show api
pm2 show worker
```

Use `pm2 monit` for real-time resource usage across all services — it shows a live dashboard of CPU and memory per process, grouped by service name.

For production observability, expose a health endpoint on each service that PM2 can poll:

```javascript
// services/api/src/health.js
const checkHealth = async () => {
  const checks = {
    redis: await pingRedis(),
    database: await pingDatabase(),
    uptime: process.uptime(),
  };
  const healthy = Object.values(checks).every(Boolean);
  return { status: healthy ? 'ok' : 'degraded', checks };
};
```

Configure ecosystem file for health checks:

```javascript
module.exports = {
  apps: [{
    name: 'api',
    script: 'services/api/src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    // PM2 will check this endpoint every 30s
    // If it fails 3 times, PM2 restarts the process
  }],
};
```

## Code Examples

### Complete Microservices Project Structure

```text
project/
├── ecosystem.config.js
├── services/
│   ├── api/
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── health.js
│   │   └── package.json
│   ├── worker/
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   └── jobs/
│   │   └── package.json
│   ├── scheduler/
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   └── tasks/
│   │   └── package.json
│   └── websocket/
│       ├── src/
│       │   ├── index.js
│       │   └── handlers/
│       └── package.json
├── scripts/
│   ├── deploy.sh
│   └── start-all.sh
└── logs/
```

### Full Ecosystem File with All Features

```javascript
// ecosystem.config.js
const commonConfig = {
  env: {
    NODE_ENV: 'production',
    REDIS_URL: 'redis://localhost:6379',
  },
  error_file: './logs/err.log',
  out_file: './logs/out.log',
  merge_logs: true,
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
};

module.exports = {
  apps: [
    {
      ...commonConfig,
      name: 'api',
      script: 'services/api/src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      env: {
        PORT: 3000,
      },
    },
    {
      ...commonConfig,
      name: 'worker',
      script: 'services/worker/src/index.js',
      instances: 2,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      max_restarts: 5,
      restart_delay: 10000,
      env: {
        QUEUE_CONCURRENCY: '5',
      },
    },
    {
      ...commonConfig,
      name: 'scheduler',
      script: 'services/scheduler/src/index.js',
      instances: 1,
      exec_mode: 'fork',
      max_restarts: 3,
      restart_delay: 30000,
    },
    {
      ...commonConfig,
      name: 'websocket',
      script: 'services/websocket/src/index.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      max_restarts: 0,
      env: {
        WS_PORT: 4000,
      },
    },
  ],
};
```

### Health Check Integration

```javascript
// services/api/src/server.js
const express = require('express');
const Redis = require('ioredis');

const app = express();

async function checkDependencies() {
  const redis = new Redis(process.env.REDIS_URL);
  try {
    await redis.ping();
    await redis.quit();
    return { redis: true };
  } catch {
    return { redis: false };
  }
}

app.get('/health', async (req, res) => {
  const checks = await checkDependencies();
  const isHealthy = Object.values(checks).every(Boolean);
  res.status(isHealthy ? 200 : 503).json({
    service: 'api',
    status: isHealthy ? 'healthy' : 'degraded',
    checks,
    uptime: process.uptime(),
  });
});

async function waitForRedis() {
  const redis = new Redis(process.env.REDIS_URL);
  for (let i = 0; i < 10; i++) {
    try {
      await redis.ping();
      await redis.quit();
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Redis unavailable');
}

async function start() {
  await waitForRedis();
  app.listen(process.env.PORT, () => {
    console.log(`[api] Listening on port ${process.env.PORT}`);
    if (process.send) process.send('ready');
  });
}

start().catch(err => {
  console.error('[api] Failed to start:', err);
  process.exit(1);
});
```

## Key Insights

- **Use one ecosystem file to rule them all**: Defining all services in a single `ecosystem.config.js` eliminates configuration drift and makes your microservices architecture reproducible across environments.
- **Match restart strategy to service criticality**: Critical services (API gateway, WebSocket) should restart infinitely, while worker processes should degrade gracefully after repeated failures to prevent job corruption.
- **Ready signals prevent cascading failures**: Use `wait_ready` and `process.send('ready')` to ensure services start only after their dependencies report healthy.
- **Log aggregation is non-negotiable**: With multiple services, per-process log files become unmanageable. Centralize with `merge_logs: true`, structured JSON output, and a log shipper for production.
- **Rolling restarts keep the system online**: `pm2 reload` restarts cluster workers one at a time, keeping the service available during deployments. Combine with graceful shutdown for truly zero-downtime updates.
- **Signal-based connection draining protects users**: Use `SIGUSR2` or custom signals to drain active WebSocket connections or in-flight jobs before restarting, preventing data loss.

## Next Steps

- Explore PM2's programmatic API for embedding process management in your own tooling: `pm2.connect()`, `pm2.start()`, `pm2.list()`.
- Set up PM2 Plus (formerly Keymetrics) for centralized monitoring across multiple servers and services.
- Learn about PM2 in containerized environments — running PM2 inside Docker and integrating with Kubernetes for hybrid orchestration.

## Conclusion

PM2 transforms from a single-process process manager into a powerful microservices orchestrator when you leverage its multi-app ecosystem file capabilities. By defining all services in one configuration, setting per-service restart strategies, implementing dependency-aware startup ordering, and centralizing logs and monitoring, you can manage a complete microservices architecture with the same simplicity that PM2 brings to single-process management. The patterns in this tutorial — health check loops, ready signals, signal-based connection draining, rolling deployments — scale from a two-service backend to a full production fleet.

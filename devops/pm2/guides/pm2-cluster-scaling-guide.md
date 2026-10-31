---
title: "PM2 Cluster Scaling Guide"
description: "A practical guide to PM2 cluster mode: how the primary/worker model works, sizing instance counts, handling sticky sessions and shared state, setting memory limits, and tuning auto-restart for production scale."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# PM2 Cluster Scaling Guide

## Introduction

Node.js runs your application on one thread, so a single process uses one CPU core no matter how many the host has. On a 16-core machine, `pm2 start app.js` leaves 15 cores idle while every request queues behind one event loop. Cluster mode closes that gap: PM2 forks one worker per core and lets the OS spread incoming connections across them.

The mechanism is not magic. PM2 is a thin supervisor over Node's built-in `cluster` module — the primary opens the listening socket once and hands it to each worker. Scaling well is therefore less about `instances: 'max'` and more about what the application keeps in process memory, because sessions, caches, counters, and scheduled jobs all break the moment a second worker exists.

## Best Practices

### 1. Know What Cluster Mode Actually Does

With `exec_mode: 'cluster'`, PM2 starts a primary that owns the socket and forks N workers; Node's `cluster` module picks the accepting worker. Linux and macOS use round-robin (`SCHED_RR`); on Windows only the primary accepts and hands off over IPC. Load is distributed per *connection*, not per request — a keep-alive client keeps hitting one worker — and per-process memory is invisible to siblings.

### 2. Size Instances to Cores and to the Workload

`instances: 'max'` resolves to `os.cpus().length`, a good default for CPU-bound APIs but not universal: leave a core for the OS, the PM2 daemon, and sidecars when the box also runs Redis or nginx. Size memory-heavy services by RAM instead — four workers at 400 MB do not fit a 2 GB container. Slight oversubscription is fine for I/O-bound proxies; for CPU-bound work use physical cores, not hyperthreads.

### 3. Keep Workers Stateless

Anything in a worker's memory is invisible to its siblings. In-memory sessions, `Map` caches, login-attempt counters, and websocket room registries break under clustering — a user who logged in on worker 3 looks anonymous on worker 7. Move shared state to Redis or the database and treat process memory as a disposable cache with a short TTL. This decision alone determines whether clustering works for you.

### 4. Treat Sticky Sessions as a Last Resort

PM2's round-robin does not pin clients, and PM2 has no sticky-session option. If a legacy dependency truly needs affinity, decide routing outside PM2 — an nginx upstream with `ip_hash`, or one worker per port behind cookie affinity. Prefer fixing the state: a Redis-backed session store costs one dependency and removes a whole class of production bugs.

### 5. Run Scheduled Jobs Outside the Cluster

A scheduler inside application code fires once per worker — eight workers, eight duplicate jobs. Cache warmers and non-concurrency-safe queue consumers behave the same way. Put scheduled work in a dedicated fork-mode app in the same ecosystem file, or guard it with a distributed lock. `NODE_APP_INSTANCE` (set via `instance_var`) identifies the worker, which is enough for host-local leader election.

### 6. Set Memory Limits Per Worker, Not Per App

`max_memory_restart` applies to each worker individually: `'512M'` with eight workers permits roughly 4 GB of RSS. It is also a restart, not a garbage collection — PM2 kills the worker and starts a replacement, dropping in-flight requests unless shutdown drains. Keep the limit above `--max-old-space-size` and below the container limit, and alert on restart counts rather than treating the limit as protection.

### 7. Make Restarts Cheap, Then Roll Rather Than Restart

A crash loop in eight workers multiplies downstream load by eight: raise `min_uptime` so slow boots are not counted as crashes, cap `max_restarts`, and enable `exp_backoff_restart_delay` so a failing dependency is not hammered. Deploy with `pm2 reload` — workers replaced one at a time, each replacement online before its predecessor stops — or the idempotent `startOrReload`. Never `pm2 restart` in production: it kills the whole group and guarantees a gap.

## Implementation Steps

### Step 1: Measure the Single-Process Baseline

Record throughput and CPU saturation for one process first, otherwise you cannot tell whether extra workers help or a shared bottleneck (database, upstream API, lock) is the real constraint.

```bash
npm install -g autocannon
autocannon -c 100 -d 20 http://localhost:3000/api/health   # baseline throughput
pm2 monit                                                  # core saturation
```

If one worker pins a core and throughput rises linearly with a second, you are CPU-bound and clustering pays off; if CPU stays low while latency climbs, the bottleneck is downstream and more workers only add contention.

### Step 2: Externalize Shared State Before Scaling

Move sessions and counters out of process memory, with explicit failure behavior:

```javascript
// lib/session.js
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 2000)
});
redis.on('error', (err) => console.error('[session] redis error', err.message));

async function getSession(sessionId) {
    if (!sessionId) return null;
    try {
        const raw = await redis.get(`sess:${sessionId}`);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.error('[session] lookup failed', err.message);
        return null; // fail closed: no session beats a wrong session
    }
}

module.exports = { redis, getSession };
```

### Step 3: Write the Cluster Ecosystem File

The separate `scheduler` entry stays fork mode with a single instance so cron jobs run once per host:

```javascript
// ecosystem.config.js
module.exports = {
    apps: [
        {
            name: 'api',
            script: './dist/server.js',
            exec_mode: 'cluster',
            instances: process.env.WEB_CONCURRENCY || 'max',
            wait_ready: true,
            listen_timeout: 15000,
            kill_signal: 'SIGTERM',
            kill_timeout: 10000,
            min_uptime: 5000,
            max_restarts: 10,
            exp_backoff_restart_delay: 200,
            max_memory_restart: '512M',
            node_args: '--max-old-space-size=448', // below max_memory_restart
            env_production: { NODE_ENV: 'production', PORT: 3000 }
        },
        { name: 'scheduler', script: './dist/scheduler.js', exec_mode: 'fork', instances: 1 }
    ]
};
```

### Step 4: Signal Readiness and Drain Gracefully

```javascript
const { createServer } = require('./app');
const { redis } = require('./lib/session');
async function main() {
    await redis.ping(); // dependencies verified before readiness
    const server = createServer();
    server.listen(process.env.PORT || 3000, () => {
        console.log(`[worker ${process.env.NODE_APP_INSTANCE}] listening`);
        if (process.send) process.send('ready');
    });
    const shutdown = (signal) => {
        console.log(`[worker] ${signal} received, draining`);
        server.close(async () => {
            await redis.quit().catch(() => {});
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 8000).unref(); // inside kill_timeout
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
main().catch((err) => {
    console.error('[worker] bootstrap failed', err);
    process.exit(1);
});
```

### Step 5: Guard Singleton Work

```javascript
const instance = process.env.NODE_APP_INSTANCE;
// Only the first worker runs host-local singleton tasks
if (instance === undefined || instance === '0') startCacheWarmer();
```

This is leadership within one host only. Across hosts, use a Redis lock (`SET key token NX PX 30000`) with a token-checked release instead.

### Step 6: Verify Distribution, Reload, and Monitor Workers

```bash
pm2 start ecosystem.config.js --env production
autocannon -c 100 -d 30 http://localhost:3000/api/health &
pm2 reload api --update-env
pm2 jlist | jq -r '.[] | select(.name=="api") | "id=\(.pm2_env.pm_id) restarts=\(.pm2_env.restart_time)"'
```

Zero `5xx` responses during the reload means the readiness handshake and drain budget are correct; uneven memory growth across workers usually means a per-process cache holds data that belongs in Redis. Finally, alert per worker rather than in aggregate: any worker not `online`, restart counts that climb without a deployment, or `stopping` states lasting past `kill_timeout`. Rising restarts under steady traffic usually mean `max_memory_restart` is firing — a leak, or a limit set too tight for the working set.

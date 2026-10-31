---
title: "PM2 Zero-Downtime Deployment Tutorial"
description: "Deploy a Node.js service without dropping requests: cluster mode, pm2 reload versus restart, graceful shutdown, health gating, blue-green switching, and rollback."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# PM2 Zero-Downtime Deployment Tutorial

## Summary

This tutorial turns a single-process Node.js API into a PM2 cluster that is replaced one worker at a time while requests keep flowing. You will add graceful shutdown, readiness gating, a health check, a blue-green switch between two PM2 apps, and a rollback that takes seconds.

## Target Audience

- Backend and DevOps engineers already running Node.js in production with PM2, comfortable with process managers, reverse proxies, and shell scripting (intermediate to advanced).

## Prerequisites

- Node.js 20+ and PM2 5 installed globally (`npm install -g pm2@5`).
- An HTTP service with a `/health` route, a database driver, and a Linux host with systemd.

## Learning Objectives

By the end of this tutorial, you will be able to:
- Explain when `pm2 reload` is genuinely zero-downtime and when it is not.
- Configure cluster mode with `wait_ready`, `listen_timeout`, and `kill_timeout`.
- Implement a shutdown handler that drains in-flight requests before exit.
- Run a blue-green switch between two PM2 apps and roll back safely.

## Context and Motivation

`pm2 restart` kills every worker at once. On a busy API that means a few hundred milliseconds of connection refused, or a burst of 502s from the proxy — invisible in a dashboard, obvious in an uptime report and in a checkout flow. PM2 ships the primitives for a rolling replacement, but they only work when the application cooperates: it must announce readiness and close its server on demand instead of dying mid-request. This tutorial builds that cooperation.

## Core Content

### How reload replaces workers, and when it does not

In cluster mode `pm2 reload` starts a new worker, waits for it to signal readiness, then stops the old one, so the proxy always has a live upstream. In fork mode there is one process per app: `reload` degrades into a restart and traffic is dropped. Use `pm2 restart` for a hard kill, `pm2 reload` for the rolling replacement, and `pm2 gracefulReload` when long-lived connections (WebSocket, SSE) must be allowed to finish before the old worker retires.

### Readiness budgets and health checks

`listen_timeout` is how long PM2 waits for `process.send('ready')`; when it expires, PM2 assumes the worker is up and moves on regardless. `kill_timeout` is the grace period before `SIGKILL`. A worker that booted is not necessarily able to serve, so readiness should mean: database reachable, migrations applied, cache warm. Do that work before signalling ready and expose the same check over HTTP, so the deploy script and the orchestrator agree on what "healthy" means.

### Blue-green with two PM2 app names

Start the new release as a second app on another port, verify it, switch the proxy upstream, then retire the old app. PM2 does not manage that switch — the reverse proxy does. The payoff: rollback is a switch back, with the old release still resident and warm.

## Code Examples

### The application: readiness plus draining

```javascript
const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const server = http.createServer(async (req, res) => {
  if (req.url !== '/health') return res.writeHead(200).end('ok');
  try {
    await pool.query('SELECT 1');
    res.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}');
  } catch (err) {
    res.writeHead(503, { 'content-type': 'application/json' }).end('{"status":"degraded"}');
    console.error('health check failed', err.message);
  }
});

server.listen(process.env.PORT || 3000, async () => {
  try {
    await pool.query('SELECT 1');
    if (process.send) process.send('ready'); // only now is the worker usable
  } catch (err) {
    console.error('readiness check failed', err.message);
    process.exit(1);
  }
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, draining`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref(); // stays under kill_timeout
}

['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));
```

### Ecosystem file with the deployment budgets

```javascript
const shared = {
  script: './server.js',
  instances: 'max',
  exec_mode: 'cluster',
  wait_ready: true,
  listen_timeout: 10000,
  kill_timeout: 12000
};

module.exports = {
  apps: [
    // Two colours of one release; only the name and PORT differ
    { ...shared, name: 'api-blue', env_production: { NODE_ENV: 'production', PORT: 3000 } },
    { ...shared, name: 'api-green', env_production: { NODE_ENV: 'production', PORT: 3001 } }
  ]
};
```

### Health-gated deploy that aborts instead of shipping a broken release

```bash
#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="/srv/reinvy/releases/$(date +%Y%m%d%H%M%S)"
HEALTH_URL="http://127.0.0.1:3001/health"

# 1. Ship code into an immutable release directory
git clone --depth 1 --branch "$1" git@github.com:reinvy/api.git "$RELEASE_DIR"
cd "$RELEASE_DIR" && npm ci --omit=dev
# 2. Replace the idle colour and wait for it to pass its own health probe
pm2 reload ecosystem.config.js --only api-green --update-env
curl -fsS --retry 20 --retry-delay 1 --retry-connrefused --max-time 3 \
    "$HEALTH_URL" >/dev/null || {
        echo "green is unhealthy, draining it and aborting" >&2
        pm2 delete api-green
        exit 1
    }
# 3. Flip the proxy upstream and retire the previous colour
sed -i 's/127.0.0.1:300[01]/127.0.0.1:3001/' /etc/nginx/conf.d/api.conf
nginx -t && nginx -s reload
pm2 delete api-blue
```

### Rollback in one command

```bash
# Re-run the previous release as blue and point the proxy back at it
PREVIOUS_RELEASE="$(ls -1d /srv/reinvy/releases/* | tail -n 2 | head -n 1)"
cd "$PREVIOUS_RELEASE"
pm2 start ecosystem.config.js --only api-blue --env production
until curl -fsS --max-time 3 http://127.0.0.1:3000/health >/dev/null; do sleep 1; done
sed -i 's/127.0.0.1:3001/127.0.0.1:3000/' /etc/nginx/conf.d/api.conf
nginx -t && nginx -s reload && pm2 delete api-green
```

## Key Insights

- `reload` is zero-downtime only in cluster mode; a single fork-mode process plus reload is a restart with extra steps, and `wait_ready` is meaningless without a readiness signal.
- Set `kill_timeout` above your own drain budget and let the app exit by itself. A process that needs `SIGKILL` is a bug in the shutdown handler, not a tuning knob.
- Long-lived connections never finish draining on `server.close()`; track them explicitly or use `gracefulReload` with a `shutdown` message.
- Blue-green doubles memory during the switch; size the host for two releases.

## Next Steps

- Run `pm2 save` after every structural change and add `pm2 startup systemd`, so the process list resurrected at boot matches what is running.
- Move log rotation to `pm2-logrotate` so long-running clusters never fill the disk.

## Conclusion

You now have a deployment that replaces workers one at a time, waits for real readiness, drains cleanly on shutdown, and reverses in a single command. The pattern is not PM2 magic — it is PM2 plus an application that announces readiness and exits on request.

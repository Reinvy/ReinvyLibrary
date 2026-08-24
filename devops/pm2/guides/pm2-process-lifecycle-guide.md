---
title: "PM2 Process Lifecycle and Zero-Downtime Operations Guide"
description: "An advanced guide to the PM2 process lifecycle: process states, signal semantics, graceful shutdown and reload behavior, timeout tuning, crash-loop handling, and operational patterns that achieve true zero-downtime deployments."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# PM2 Process Lifecycle and Zero-Downtime Operations Guide

## Introduction

Most PM2 users learn the happy path: `pm2 start`, `pm2 restart`, `pm2 logs`, and a basic ecosystem file. That works until a deployment goes wrong, a worker starts crash-looping in the middle of the night, or a "zero-downtime reload" actually drops requests. What separates a merely usable PM2 setup from a genuinely reliable one is a precise understanding of the **process lifecycle** — the state machine PM2 drives, the signals it delivers, the timers it enforces, and the exact sequence of events that happens during every start, stop, restart, and reload.

PM2 is not just a launcher. It is a supervisor that constantly transitions your applications between well-defined states (`launching`, `online`, `stopping`, `stopped`, `restarting`, `errored`) and communicates with them through signals and an in-process messaging channel. When you understand that model, every operational decision becomes clearer: how long to give a process to drain, when to use `reload` instead of `restart`, why a process that boots in 10 seconds gets killed before it finishes starting, and how to make deployments that genuinely do not drop a single request.

This guide assumes you already run PM2 in production. It focuses on the lifecycle mechanics and the operational patterns built on top of them: signal semantics, graceful shutdown and startup, cluster-mode rolling reloads, crash-loop containment, idempotent automation, and lifecycle monitoring. By the end, you should be able to reason about any PM2 incident in terms of states, signals, and timers — and design applications that are first-class citizens of PM2's lifecycle model.

## Best Practices

### 1. Treat the Process State Machine as the Source of Truth

Every process PM2 manages is always in exactly one state, and every operation you run is a state transition. The states you will see in `pm2 ls` and `pm2 jlist` are:

- **launching** — the process was spawned but has not reported readiness yet (no listening socket, no `ready` handshake, or still inside `listen_timeout`).
- **online** — the process is running and was considered successfully started.
- **stopping** — PM2 delivered the shutdown signal and is waiting up to `kill_timeout` for the process to exit on its own.
- **stopped** — the process exited and PM2 will not restart it (manual stop, `autorestart: false`, or `pm2 stop`).
- **restarting** — PM2 is tearing down the old incarnation and launching a replacement.
- **errored** — the process failed too many times (typically exceeding `max_restarts` within the `min_uptime` window) or crashed during the launch phase; PM2 gives up until you intervene.

Diagnose incidents by asking two questions: *what state is the process in*, and *what transition should have happened but did not*. A healthy workflow depends on the answer — `online` with high restart counts is a different problem from `errored`, which is different again from `stopped` when you expected it to be running.

### 2. Handle SIGINT and SIGTERM with the Same Draining Routine

PM2's default shutdown signal is `SIGINT` for stop, restart, and delete operations, but you can (and often should) configure `kill_signal: 'SIGTERM'` — and some orchestrators deliver `SIGTERM` regardless. Treat both signals as "shut down gracefully": stop accepting new work, close the server, drain in-flight requests or jobs, flush state, and exit with code `0`. If your application does not handle these signals at all, the default behavior (process termination) still works — but you lose the chance to finish in-flight work, which is exactly what zero-downtime operations depend on.

### 3. Never Let SIGKILL Be the Normal Shutdown Path

PM2 escalates to `SIGKILL` when a process does not exit within `kill_timeout` (default 1600 ms). SIGKILL cannot be intercepted: connections die mid-request, jobs are lost, and state can be corrupted. The right posture is to treat SIGKILL as the emergency brake, not the routine mechanism. Give your application a realistic `kill_timeout` (5–30 seconds depending on drain needs), and make your drain routine fast enough that the timeout is almost never reached. If you see `stopping` states lasting the full timeout in logs, your drain path is the bottleneck — fix the application, do not just raise the timeout forever.

### 4. Declare Readiness Explicitly with `wait_ready`

By default PM2 considers a process "started" when it begins listening or when `listen_timeout` expires. For applications that do heavy initialization (database connections, cache warming, schema checks) the listen event can fire long before the app can actually serve traffic. Set `wait_ready: true` in the ecosystem file and have the application send a `ready` message over `process.send('ready')` once initialization is complete. PM2 then treats the process as `online` only after that explicit handshake — which makes both `reload` and health-check-based orchestration trustworthy. Keep `listen_timeout` as a safety net so a broken readiness signal cannot hang a deployment forever.

### 5. Prefer `reload` over `restart` for Traffic-Carrying Services

In cluster mode, `pm2 reload` performs a rolling restart: workers are replaced one at a time, and a new worker is fully booted and ready before the old worker is torn down. That is the difference between dropping requests and not dropping requests. Use `pm2 restart` when you need a hard reset of the whole process group (code that leaks native resources, cluster-wide state corruption), and use `pm2 reload` for routine deployments. For fork-mode applications there is no rolling behavior — `reload` falls back to a plain restart, so run multiple instances (`exec_mode: 'cluster'` or multiple processes behind a load balancer) if zero downtime matters.

### 6. Understand the Difference Between `stop`, `restart`, `delete`, and `kill`

Each lifecycle verb has distinct semantics and a different blast radius:

- `pm2 stop` — sends the shutdown signal, waits `kill_timeout`, and leaves the process in `stopped`. It stays registered and can be started again. Use it when you want the app down but manageable.
- `pm2 restart` — stops the current process and immediately launches a fresh incarnation. Use it for deterministic resets.
- `pm2 delete` — stops the process *and removes it from PM2's process list and dump*. The app is gone from PM2's bookkeeping; `pm2 resurrect` will no longer bring it back. Use it when an app is retired or misconfigured.
- `pm2 kill` — terminates the PM2 daemon itself and all managed processes. The whole supervision tree goes down. This is a last resort for daemon-level problems, not a routine operation.

Mixing these up is a common cause of "the app disappeared after a reboot" incidents — usually because `delete` was used where `stop` or `restart` was intended.

### 7. Pair `min_uptime` with `max_restarts` to Contain Crash Loops

PM2's restart logic distinguishes a clean, deliberate stop from an unstable crash. If a process exits before `min_uptime` (default 1000 ms) has elapsed, PM2 treats the exit as a crash and counts it as an unstable restart; when unstable restarts exceed `max_restarts` (default 15), PM2 moves the process to `errored` and stops trying. Short-lived processes can burn through 15 restarts in seconds, so tighten both values for production: `min_uptime: 5000` plus `max_restarts: 10` gives a crash loop roughly 50 seconds to prove itself before PM2 gives up — and `errored` is a visible, alertable state instead of an endless silent churn.

### 8. Enable `exp_backoff_restart_delay` for Unstable Workers

A crash loop is not just noisy — if every restart happens instantly, a failing process can hammer a database or an external API with connection attempts. `exp_backoff_restart_delay: 100` makes PM2 wait between restarts with exponential backoff (100 ms, 200 ms, 400 ms, ... capped at 15 seconds by default). This gives downstream dependencies time to recover and makes the failure pattern visible in `pm2 logs` instead of an unreadable wall of identical crashes. Use a fixed `restart_delay` instead when you want a predictable, constant interval (for example, a poller that is allowed to fail every 30 seconds).

### 9. Use `stop_exit_codes` to Mark Intentional Exits

Sometimes an application exits with code `0` because it finished its work and should *not* be restarted — a one-shot job, a maintenance script, a worker that completed a batch. By default PM2 restarts any process that exits, which turns a successful singleton job into an infinite loop. Set `stop_exit_codes: [0]` on such apps: when the process exits with one of those codes, PM2 treats it as a deliberate stop and leaves it `stopped`. Keep the inverse in mind too — an exit code outside `stop_exit_codes` (anything non-zero by default) is a crash and should restart, with `max_restarts` containing the damage.

### 10. Automate Deployments with Idempotent Lifecycle Commands

Inside scripts and CI pipelines, use commands that converge on the desired state instead of assuming the current one. `pm2 startOrReload <config>` reloads the app when it is already running and starts it when it is not; `pm2 startOrRestart` is the equivalent for fork-mode or hard-reset deployments. This removes the classic "first deploy works, second deploy fails because the app is already started" failure mode. Pair it with `--env production` so the same command works across environments, and your deployment script becomes safe to run repeatedly.

## Implementation Steps

### Step 1: Audit Current Process States

Before changing anything, establish a baseline of what PM2 is actually managing and in what states. A quick, scriptable audit tells you whether hidden problems already exist:

```bash
# Human-readable overview with the state column
pm2 ls

# Machine-readable state, restart counts, and uptime for every app
pm2 jlist | jq -r '.[] | "\(.name): status=\(.pm2_env.status) restarts=\(.pm2_env.restart_time) uptime_ms=\(.pm2_env.pm_uptime)"'

# Deep dive into one app: timers, paths, and environment
pm2 describe api
```

Verify that every service you expect to be running shows `online`, and note any `errored`, `stopped`, or `restarting` apps. Check the restart counts — a process that is `online` but has restarted hundreds of times is a latent crash-loop with a slow boot, and it will surface the moment traffic increases. Record which apps run in fork mode versus cluster mode; the rest of this guide assumes you know which mode each service uses, because the reload behavior depends on it.

### Step 2: Implement a Production-Grade Signal Handler

The foundation of the whole lifecycle is an application that knows how to shut down gracefully. The handler must stop accepting new work, drain in-flight work, and exit within `kill_timeout`. Here is a complete pattern for a Node.js HTTP service:

```javascript
const http = require('node:http');

const server = http.createServer((req, res) => {
  res.end('ok');
});

// Track in-flight requests so we can drain before exiting
let connections = new Set();
server.on('connection', (socket) => {
  connections.add(socket);
  socket.on('close', () => connections.delete(socket));
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`[app] listening on ${server.address().port}`);
});

let draining = false;

function shutdown(signal) {
  if (draining) return; // second signal during drain: keep waiting
  draining = true;
  console.log(`[app] received ${signal}, draining ${connections.size} connections...`);

  // 1. Stop accepting new connections and new requests
  server.close(async () => {
    // 2. Flush any pending business state (DB writes, queues, buffers)
    await flushPendingWork();
    // 3. Exit cleanly — PM2 records this as a graceful stop
    console.log('[app] drain complete, exiting');
    process.exit(0);
  });

  // 4. Failsafe: never hang past our kill_timeout budget
  setTimeout(() => {
    console.error('[app] drain exceeded budget, forcing exit');
    process.exit(1);
  }, 8000).unref();
}

async function flushPendingWork() {
  // Drain in-flight jobs / write buffers here.
  // Keep this fast: PM2 escalates to SIGKILL after kill_timeout.
  await new Promise((resolve) => setImmediate(resolve));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

The key property is *bounded draining*: the application always exits on its own within its budget, so PM2's SIGKILL escalation almost never fires. If your service uses a worker pool, a message queue, or WebSocket connections, extend the drain routine to stop pulling new jobs and wait for the pool to finish before `process.exit(0)`.

### Step 3: Configure the Lifecycle-Focused Ecosystem File

The ecosystem file is where lifecycle behavior is declared. Create or update `ecosystem.config.js` with explicit values for every timer and restart policy your services need:

```javascript
module.exports = {
  apps: [
    {
      name: 'api',
      script: './dist/index.js',
      exec_mode: 'cluster',
      instances: 'max',
      instance_var: 'NODE_APP_INSTANCE',

      // Startup handshake
      wait_ready: true,
      listen_timeout: 10000,

      // Shutdown semantics
      kill_signal: 'SIGTERM',
      kill_timeout: 10000,

      // Crash-loop containment
      autorestart: true,
      min_uptime: 5000,
      max_restarts: 10,
      max_memory_restart: '512M',
      exp_backoff_restart_delay: 100,

      // Intentional-exit policy
      stop_exit_codes: [0],

      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'nightly-report',
      script: './jobs/nightly-report.js',
      exec_mode: 'fork',
      autorestart: false,
      stop_exit_codes: [0],
      cron_restart: '0 3 * * *'
    }
  ]
};
```

Note how the two apps encode different lifecycle contracts. `api` is a long-running service: cluster mode, explicit readiness, generous drain budget, and crash-loop backoff. `nightly-report` is a one-shot job: no autorestart (it must run on its schedule, not on a crash loop), and exit code `0` marks a successful run that PM2 should leave `stopped` until the next `cron_restart`. Apply the file with:

```bash
pm2 start ecosystem.config.js
pm2 save   # persist the process list for boot resurrection
```

### Step 4: Add Explicit Readiness Signaling

With `wait_ready: true` configured, the application must announce when it can actually serve traffic. Send the `ready` message only after initialization is complete — after the database pool is verified, caches are warmed, and the server is listening:

```javascript
const db = require('./db');
const { createApp } = require('./app');

async function bootstrap() {
  await db.waitForConnections();   // database ready
  await cache.warm();              // cache warmed
  const server = createApp();
  server.listen(process.env.PORT || 3000, () => {
    console.log('[app] fully initialized, signaling ready');
    if (process.send) {
      process.send('ready');       // PM2 handshake — app is now 'online'
    }
  });
}

bootstrap().catch((err) => {
  console.error('[app] bootstrap failed', err);
  process.exit(1); // fail fast: let PM2's restart policy handle it
});
```

If the app is a worker that does not listen on a socket, the same handshake applies — send `ready` once startup is complete. If readiness never arrives, PM2 waits up to `listen_timeout` and then proceeds; that safety net prevents a deployment from hanging, but it also means a broken readiness signal silently degrades to the old behavior. Watch for it in logs during rollout.

### Step 5: Roll Out Zero-Downtime Reloads

Now that the app drains and signals readiness properly, exercise the rolling reload. Because `instances: 'max'` runs one worker per CPU core, `pm2 reload` can replace workers one at a time with no gap in service. Verify it under load:

```bash
# Terminal 1: stream requests and watch for failures
while true; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health || echo "FAIL"
  sleep 0.2
done

# Terminal 2: trigger the rolling reload
pm2 reload api --update-env

# Terminal 3: watch workers come and go one at a time
pm2 ls
```

A correct rolling reload shows zero `FAIL` lines: each worker is replaced only after its replacement is ready, and the old worker drains within `kill_timeout`. If you see failures, the usual culprits are a readiness signal that fires too early, a `listen_timeout` that is too short for the boot time, or a drain routine that takes longer than `kill_timeout`. Fix those in the ecosystem file and rerun the test before trusting reloads in production. Also verify `pm2 reload` behavior on the very first deployment of a brand-new process — it starts the app if it is not yet registered, so the same command is safe to run on a cold environment.

### Step 6: Harden Against Crash Loops and Slow Starts

A crashing application can take down more than itself if nothing tames the restart cadence. With the policies from Step 3 in place, simulate a crash to confirm the behavior:

```bash
# Force a crash in a test environment (app code that throws)
pm2 restart api
pm2 logs api --lines 50   # observe the backoff delays between crashes

# Confirm the app eventually lands in 'errored' instead of churning forever
pm2 jlist | jq -r '.[] | select(.name == "api") | "\(.pm2_env.status) restarts=\(.pm2_env.restart_time)"'
```

The sequence you want to see: crash → exponential backoff → crash → longer backoff → after `max_restarts` unstable restarts within the `min_uptime` window, state becomes `errored` and restart attempts stop. `errored` is the correct end state for a genuinely broken deploy — it is loud, it is alertable, and it prevents the process from hammering downstream systems. For slow-booting apps that are *healthy* but take longer than `min_uptime` to stabilize (e.g., a cold JVM or a large dependency graph), raise `min_uptime` so legitimate slow starts are not counted as crashes.

### Step 7: Automate Idempotent Deployments

Wire the lifecycle commands into your deployment pipeline so every run converges on the desired state. The idempotent commands make the script safe on first deploy, redeploy, and rollback:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Build and install (omitted for brevity)
npm ci
npm run build

# Reload if running, start if not — same command works for cold and warm deploys
pm2 startOrReload ecosystem.config.js --env production

# Persist the process list so a reboot resurrects exactly this set
pm2 save

# Smoke test: confirm the new incarnation is actually online and healthy
sleep 2
status=$(pm2 jlist | jq -r '.[] | select(.name == "api") | .pm2_env.status')
if [[ "$status" != "online" ]]; then
  echo "deploy failed: api is $status" >&2
  exit 1
fi
curl -fsS http://localhost:3000/health || { echo "health check failed" >&2; exit 1; }
```

For rollback, point the script at the previous build artifact — `startOrReload` performs the same rolling replacement in reverse, so rolling back is the same code path as rolling forward. The smoke test is the gate: if the new build is not `online` and healthy, the pipeline fails loudly instead of leaving a half-deployed service believed to be running.

### Step 8: Build a Lifecycle Monitoring Loop

Finally, make the lifecycle observable. The state and restart counters are the signals that matter, and they are all available in `pm2 jlist`:

```bash
# Alert when any app is in a bad state
pm2 jlist | jq -r '.[] | select(.pm2_env.status != "online") | "ALERT: \(.name) is \(.pm2_env.status)"'

# Track restart counts over time (a rising count with status online = slow crash loop)
pm2 jlist | jq -r '.[] | "\(.name): restarts=\(.pm2_env.restart_time) status=\(.pm2_env.status)"'

# Send custom operational signals when you need app-level behavior
pm2 sendSignal SIGUSR2 api
```

Route these checks into your alerting system (a cron job that parses `pm2 jlist`, a Prometheus exporter, or a simple watchdog script). Alert on three conditions: any app not in `online`, any app whose restart count grows rapidly, and any process stuck in `stopping` for longer than `kill_timeout` (that last one signals a drain bug that will eventually cause SIGKILL and dropped work). With the state machine, signals, and timers all visible, an incident that used to require guesswork becomes a direct read of PM2's own bookkeeping — and the fix is usually a one-line ecosystem change backed by a verified reload test.

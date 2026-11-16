---
title: "Running Background Job Workers with PM2"
description: "A practical tutorial on supervising queue consumers and scheduled jobs with PM2: separating API and worker apps, tuning concurrency, draining in-flight jobs on reload, and scaling workers independently."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Running Background Job Workers with PM2

## Summary

Most PM2 tutorials stop at "run your API under PM2." In production, the harder problem is the work that happens outside the request: sending email, generating reports, transcoding video, reconciling ledgers. This tutorial builds a queue-driven worker tier supervised by PM2, with separate apps for the request-serving API, the long-running consumer, and the periodic scheduler — then tunes concurrency, drain behavior, restart policy, and independent scaling so a deploy never loses a job or processes one twice.

## Target Audience

- Backend and platform engineers running Node.js services under PM2 in production.
- DevOps engineers responsible for worker fleets, cron jobs, and deploy safety.
- Intermediate to advanced developers comfortable with the PM2 CLI and ecosystem files.

## Prerequisites

- Node.js 18 or newer installed, with a working PM2 installation (`npm install -g pm2`).
- A Redis instance reachable from your host (local Docker container is fine) for the queue backend.
- Working knowledge of PM2 ecosystem files, `pm2 reload`, and process states.
- Familiarity with BullMQ or another Redis-backed queue library is helpful but not required.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Model an API, a worker, and a scheduler as three distinct PM2 apps in one ecosystem file.
- Size worker concurrency correctly by separating instance count from per-process job concurrency.
- Write a worker that finishes or requeues its in-flight job before PM2 replaces it.
- Prevent double-processing during rolling reloads and deploys.
- Contain queue backlog with independent worker scaling and lag-based health signals.

## Context and Motivation

A single PM2 process list usually starts as one app: the API. Then someone adds a report generator, then an email sender, then a nightly reconciliation job, and suddenly the same process list holds a scheduler that must run exactly once per night, a consumer that must run on every core, and an API that must never be restarted mid-request.

These three workloads have contradictory lifecycles. The API scales with cores and reloads constantly. The scheduler must be a singleton — two copies means two nightly reports. The consumer scales with queue depth, not CPU, and must hold a job to completion. Supervising all three with one blanket `pm2 start app.js` and a default restart policy produces the classic failure set: duplicated cron jobs, jobs killed mid-flight on reload, and restart storms that hammer a database during an incident.

PM2 has enough per-app configuration to express each lifecycle separately. The work is in choosing the boundaries and honoring them in the application code.

## Core Content

### Why Workers Belong in a Separate PM2 App

A PM2 app is the unit of process policy: instance count, restart limits, memory ceiling, exit-code handling, and log routing all apply per app. Put an API and a consumer in the same process and you inherit the union of both policies — usually the API's, which is wrong for queue work.

Consider what each workload actually needs.

- The API wants cluster mode across all cores, frequent health-gated reloads, and a short drain timeout.
- The consumer wants a stable instance count sized to queue throughput, a longer drain timeout so in-flight jobs can finish, and a restart policy that tolerates a slow dependency coming back.
- The scheduler wants exactly one instance, `autorestart: false`, and exit code 0 treated as success.

Splitting them into three apps means each can be reloaded, scaled, stopped, and monitored without touching the others. `pm2 reload api` no longer interrupts a 40-second video transcode. `pm2 scale worker 8` no longer quadruples API memory.

### The Architecture: API, Worker, and Scheduler as Distinct Apps

The shape is three apps, one ecosystem file, one daemon.

```text
pm2 daemon
├── api        cluster, N = cores, serves HTTP
├── worker     fork,    N = queue throughput, consumes jobs
└── scheduler  fork,    1 instance, emits recurring jobs, exits 0
```

The API enqueues work; it never executes it. The worker consumes jobs and holds no HTTP listener. The scheduler holds no long-lived state at all — it enqueues recurring work and exits, letting PM2 restart it on the next cron tick.

Keeping the scheduler stateless and one-shot is the single most important decision here. A long-running in-process `setInterval` scheduler looks simpler but breaks badly under clustering: every worker instance fires its own interval, so a five-instance cluster sends five copies of every nightly report. A one-shot job under a single-instance app has exactly one emitter by construction.

### Concurrency: Instances Versus Per-Process Job Concurrency

Two independent dials control worker throughput, and conflating them is the most common sizing mistake.

- **Instance count** (`instances` in the ecosystem file) forks separate OS processes. Each gets its own event loop and memory space.
- **Per-process job concurrency** (the queue library's `concurrency` option) runs multiple jobs concurrently inside one process's event loop.

For I/O-bound jobs — HTTP calls, database writes, email sends — per-process concurrency is far cheaper than extra processes. Ten jobs in flight inside one process cost one event loop and one memory footprint; ten processes cost ten. For CPU-bound jobs — image resize, PDF rendering, hashing — concurrency inside one process buys nothing, because the event loop serializes the work anyway. Those need more instances, and PM2 is what gives you more instances.

A practical rule: start with two worker instances and `concurrency: 10` per instance, then raise concurrency until event-loop lag becomes visible, then add instances. Watch `pm2 monit` for the CPU column during a backlog: if it sits near 100% with modest concurrency, the jobs are CPU-bound and you need instances. If CPU is low and the backlog persists, the bottleneck is downstream I/O and you need concurrency.

### Writing a Graceful Worker: Job Completion Before Exit

`pm2 reload` sends SIGINT, waits for the configured drain budget, then escalates. If your worker ignores the signal, PM2 escalates to SIGKILL and the in-flight job dies with the process — leaving the job either lost (if the queue removed it on dequeue) or duplicated (if a visibility timeout later redelivers it).

The worker therefore needs three behaviors, in this order.

1. Stop accepting new jobs.
2. Wait for in-flight jobs to finish, bounded by a timeout.
3. Exit with code 0 so PM2 records a clean stop rather than a crash.

BullMQ exposes this directly: `worker.close()` stops pulling new jobs and resolves when current ones complete. The only extra work is a hard deadline, because PM2's own `kill_timeout` will SIGKILL the process anyway — and it is better to exit deliberately, flush logs, and leave a clear trace than to be killed mid-write.

Set `kill_timeout` (per app, in milliseconds) slightly higher than the worker's own drain deadline. If `kill_timeout` is 10 seconds and the worker's internal deadline is 25 seconds, PM2 kills it at 10 — the internal deadline never matters. Invert those and PM2 waits patiently for the worker's own clean exit.

### Preventing Double-Processing During Deploys

A queue guarantees at-least-once delivery, so a worker that dies mid-job means that job runs again. That is fine only if jobs are idempotent or you use per-job locks. Two mechanisms cover almost every case.

- **Idempotency keys**: derive a natural key from the job payload (order ID, invoice number) and make the write conditional on that key. A replayed job becomes a no-op instead of a duplicate side effect.
- **Per-job locking**: the queue library's lock renewal keeps a job owned by exactly one worker for the duration of processing. BullMQ does this by default; a job whose lock expires can be picked up by another worker, which is exactly why long jobs need `lockDuration` raised or `job.extendLock()` called periodically.

During a rolling reload, `pm2 reload worker` replaces instances one at a time. With `instance_var` and staggered drain this is safe: each old worker finishes its job, exits 0, and only then is the next one replaced. Verify the staggering on a real deploy rather than trusting it — a fast drain can otherwise look like a simultaneous restart of every instance.

### Scheduling Periodic Work with cron_restart

PM2 supports cron-driven restarts per app via `cron_restart`, which uses standard five-field cron syntax. Combined with `autorestart: false`, it gives you a job runner rather than a service.

The pattern: the scheduler script enqueues its recurring jobs and exits 0. PM2 sees the clean exit, does not restart it, and starts it again at the next cron tick. Because the app is a single instance, no duplicate enqueues occur — a property you cannot get from an in-process timer under cluster mode.

Contributors to this pattern get tripped up by one detail: `cron_restart` restarts apps that are still running. If the scheduler script hangs, the next tick restarts it mid-run. Keep scheduler scripts short and bounded, and give them their own `kill_timeout` so a hung tick is cleaned up rather than overlapping the next one.

### One-Shot Jobs and stop_exit_codes

`stop_exit_codes: [0]` makes PM2 treat exit code 0 as a deliberate stop. Without it, PM2 restarts any process that exits, so a scheduler that finished successfully spawns itself again immediately, burns through `max_restarts`, and lands in `errored` — which looks like a failure in monitoring when the job actually succeeded.

The inverse matters too. Any exit code not in `stop_exit_codes` counts as a crash and triggers a restart, so a scheduler that exits 1 on a transient dependency failure gets retried by PM2 within the backoff policy. That is usually desirable for enqueue operations; it is not desirable for jobs that are already idempotent at the queue layer, where retrying the enqueue is the queue's job, not PM2's.

### Queue Lag and Worker Health Signals

A worker is "online" the entire time it is making no progress. `pm2 list` showing green tells you the process exists, not that the backlog is draining. Health for a worker tier is queue lag — the age of the oldest waiting job — not process status.

Two cheap signals cover most incidents: lag exceeding a threshold for a few minutes, and a steadily rising restart count on a worker that stays online. The second one catches slow crash loops that never reach the `errored` state. Both are available from the queue itself and from `pm2 jlist`, and both belong on a dashboard before the backlog becomes a customer-visible delay.

Memory limits deserve a note here: `max_memory_restart` is a coarse but effective guard for workers that accumulate buffers (large payloads, streaming transforms). Set it per worker app, not per API app, because worker memory profiles differ wildly from request-serving profiles.

### Scaling Workers Independently with `--only`

Scaling is per app. `pm2 scale worker 12` touches only the worker tier; the API and scheduler keep their instance counts. This is the operational payoff of the three-app split — the reaction to a backlog is one command that does not disturb request serving.

Two cautions. First, scale in steps and watch lag between steps; adding workers faster than the downstream database can absorb connections converts a backlog into an outage. Second, remember that instance count is not persisted in the ecosystem file unless you also edit it — a `pm2 reload` after a manual scale can snap the count back, so record intentional scaling in the ecosystem file for anything long-lived.

## Code Examples

### The ecosystem file

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api',
      script: './dist/api.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      kill_timeout: 8000,
      min_uptime: '5s',
      max_restarts: 10,
      env: { NODE_ENV: 'production', PORT: 3000 },
    },
    {
      name: 'worker',
      script: './dist/worker.js',
      instances: 2,             // separate dial from per-job concurrency
      exec_mode: 'fork',
      max_memory_restart: '768M',
      kill_timeout: 30000,      // longer than the worker's own drain deadline
      exp_backoff_restart_delay: 200,
      min_uptime: '10s',
      max_restarts: 20,
      env: {
        NODE_ENV: 'production',
        JOB_CONCURRENCY: 10,    // jobs in flight per process
      },
    },
    {
      name: 'scheduler',
      script: './dist/scheduler.js',
      instances: 1,             // singleton: exactly one emitter
      exec_mode: 'fork',
      autorestart: false,
      stop_exit_codes: [0],
      cron_restart: '*/5 * * * *',
      kill_timeout: 15000,
      env: { NODE_ENV: 'production' },
    },
  ],
};
```

### A worker that drains cleanly

```javascript
// src/worker.js
const { Worker } = require('bullmq');

const connection = { host: process.env.REDIS_HOST, port: 6379 };
const DRAIN_DEADLINE_MS = 25000; // must stay under PM2's kill_timeout

const worker = new Worker(
  'jobs',
  async (job) => {
    switch (job.name) {
      case 'send-email':
        // idempotent: keyed on the message id, so a replay is a no-op
        await sendEmail(job.data.messageId, job.data.payload);
        return;
      case 'render-report':
        await extendLockIfSlow(job); // long job: keep ownership alive
        await renderReport(job.data.reportId);
        return;
      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: Number(process.env.JOB_CONCURRENCY || 10),
    lockDuration: 60000,
  }
);

async function extendLockIfSlow(job) {
  // renew the job lock for work that may outlive the default lock window
  const timer = setInterval(() => job.extendLock(job.token, 60000), 30000);
  job.on('completed', () => clearInterval(timer));
  job.on('failed', () => clearInterval(timer));
}

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker ${process.env.NODE_APP_INSTANCE}] ${signal} received, draining`);

  const deadline = new Promise((resolve) => setTimeout(resolve, DRAIN_DEADLINE_MS));
  try {
    // stops pulling new jobs, resolves when in-flight jobs finish
    await Promise.race([worker.close(), deadline]);
    console.log('[worker] drained cleanly');
    process.exit(0);
  } catch (err) {
    console.error('[worker] drain failed', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

### A stateless scheduler that exits 0

```javascript
// src/scheduler.js
const { Queue } = require('bullmq');

const queue = new Queue('jobs', {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
});

async function main() {
  await queue.add(
    'render-report',
    { reportId: 'daily-rollup' },
    {
      jobId: `daily-rollup-${new Date().toISOString().slice(0, 10)}`, // dedupe key
      removeOnComplete: 1000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  );
  console.log('[scheduler] enqueued daily-rollup');
}

main()
  .then(async () => {
    await queue.close();
    process.exit(0); // clean exit: PM2 leaves the app stopped until the next tick
  })
  .catch(async (err) => {
    console.error('[scheduler] enqueue failed', err);
    await queue.close();
    process.exit(1); // non-zero: PM2 retries within the backoff policy
  });
```

### Operating the worker tier

```bash
# Start the whole tier from the ecosystem file
pm2 start ecosystem.config.js

# Scale only the worker tier in response to backlog
pm2 scale worker 8

# Confirm all three apps and their restart counts
pm2 list

# Stream only worker logs during a deploy
pm2 logs worker --lines 100

# Rolling replace of consumers; in-flight jobs drain first
pm2 reload worker

# Machine-readable state for lag/health exporters
pm2 jlist > /tmp/pm2-state.json
```

## Key Insights

- **One app, one policy.** Instance count, restart limits, drain timeout, and exit-code handling are per-app. Splitting API, worker, and scheduler lets each carry a policy that fits its workload instead of inheriting the API's.
- **Instance count and job concurrency are different dials.** Concurrency is cheap for I/O-bound work and useless for CPU-bound work; only PM2 instances add parallel event loops.
- **`kill_timeout` must exceed your application's drain deadline.** Otherwise PM2 SIGKILLs the process mid-job and the graceful shutdown code never runs.
- **A queue gives at-least-once delivery, so assume replay.** Idempotency keys or per-job locks are what make a mid-deploy crash survivable.
- **Singletons need `instances: 1`.** An in-process `setInterval` under cluster mode fires once per worker and silently duplicates scheduled work.
- **Green status does not mean healthy.** Queue lag and restart counts are the real worker health signals; `pm2 list` only confirms the process exists.
- **Worker memory profiles differ from API profiles.** Tune `max_memory_restart` per app, not per host.

## Next Steps

- Read the PM2 Process Lifecycle guide for the state machine, signal semantics, and restart-window tuning that this tutorial relies on.
- Study the PM2 Cluster Scaling guide before scaling request-serving apps, where shared state and sticky sessions dominate the design.
- Add a lag exporter that reads queue metrics plus `pm2 jlist` and pushes them to Prometheus, so backlog is alertable before it is user-visible.
- Move to the PM2 Programmatic API for control-plane automation: scaling workers from a controller based on measured lag rather than operator judgment.

## Conclusion

Supervising a worker tier with PM2 is mostly a boundary problem. Once the API, the consumer, and the scheduler are three apps with three explicit policies, the operational failures that plague mixed process lists — duplicated cron jobs, jobs killed mid-flight, restart storms during incidents — stop being surprises and become configuration choices.

The parts that matter in production are the ones the happy path hides: a drain deadline shorter than `kill_timeout`, idempotent job handlers that tolerate replay, a singleton scheduler that exits cleanly with code 0, and health measured by queue lag rather than process status. Get those four right and worker scaling becomes a single command instead of an incident.

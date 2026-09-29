---
title: "Building Automation Tooling with the PM2 Programmatic API"
description: "An advanced tutorial on embedding PM2 process management inside your own Node.js automation tools — connecting to the daemon, reading process state, controlling apps programmatically, consuming the event bus, and building custom CLIs, deployment helpers, and alerting scripts."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building Automation Tooling with the PM2 Programmatic API

## Summary

The `pm2` CLI is only the visible tip of PM2. Underneath every command you type runs a Node.js API — `pm2.connect()`, `pm2.list()`, `pm2.start()`, `pm2.launchBus()` — that talks to the same daemon over a Unix socket. This tutorial teaches you how to embed that API inside your own tooling: custom CLIs that operate a fleet of processes, deployment scripts with health-check verification, restart alerting bots, and internal dashboards that read live process state. By the end, you will have built a reusable automation module and a working CLI tool that manages PM2 entirely through code, without ever shelling out to the CLI binary.

## Target Audience

- DevOps engineers and SREs who automate Node.js process management in production.
- Backend developers who want to build internal tooling around PM2 (deployment bots, monitoring dashboards, operational scripts).
- Advanced level: assumes working knowledge of PM2 basics (`start`, `stop`, `list`, ecosystem files) and comfortable Node.js skills.

## Prerequisites

- Node.js 18+ and npm installed.
- PM2 installed globally (`npm install -g pm2`) and at least one application managed by it.
- Basic experience with PM2 CLI commands and ecosystem configuration files.
- Understanding of Node.js callbacks and async/await patterns.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Connect a Node.js script to the PM2 daemon and manage the connection lifecycle correctly.
- Read live process state programmatically with `pm2.list()`, `pm2.jlist()`, and `pm2.describe()`.
- Start, stop, restart, reload, scale, and delete applications entirely from code.
- Use idempotent operations (`startOrRestart`, `startOrReload`) to write safe deployment automation.
- Subscribe to the PM2 event bus and react to restarts, log lines, and process signals in real time.
- Send signals and custom messages to individual processes from your tooling.
- Build a practical CLI tool that wraps the programmatic API with error handling and clean shutdown.

## Context and Motivation

Scripting PM2 by parsing CLI output is fragile. `pm2 jlist` output changes shape between versions, `pm2 list` is a table meant for human eyes, and spawning a subprocess for every operation is slow and wasteful. Worse, CLI scripts have no way to receive events — you can poll, but you cannot listen.

The PM2 programmatic API solves all of this. The `pm2` npm package is the same code that powers the CLI, talking to the same daemon over its IPC socket. Your script becomes a first-class citizen of the process management system: it can inspect exact JSON state, perform atomic operations, and subscribe to a real-time event bus that fires when processes start, stop, crash, or emit log output.

Real-world uses include: a deployment bot that runs `startOrReload` and waits for listeners before reporting success; an alerting daemon that watches `process:exception` events and pages the on-call engineer; an internal admin CLI that lets support staff restart services without SSH access; and a telemetry agent that ships `pm2.jlist()` snapshots to a metrics store every minute.

## Core Content

### 1. The Programmatic API versus the CLI

The `pm2` npm module exposes a thin, callback-style API over the daemon's RPC protocol. Everything the CLI can do, the module can do; the CLI itself is built on top of it. The key difference is the data you receive: the CLI formats results for humans, while the module returns raw JSON you can process programmatically.

```javascript
const pm2 = require('pm2');

// Same daemon, same processes — just accessed from code
pm2.list((err, list) => {
  if (err) { console.error(err); return; }
  console.log(`Managing ${list.length} processes`);
  pm2.disconnect();
});
```

The module ships as `pm2` on npm. When you install PM2 globally, the module is available to your scripts if you require it from the global path, but the cleaner approach for tooling is a local dependency in your own project.

### 2. The PM2 Daemon and the IPC Connection

PM2 runs a God daemon — a detached background process — that is the single source of truth for process state. Your script does not manage processes directly; it sends RPC requests to the daemon over a Unix socket (typically `~/.pm2/pub.sock`), and the daemon performs the operation and replies.

This architecture has important consequences for tool authors:

- The daemon may not be running. The module does **not** auto-start it the way the CLI does — you must call `pm2.connect()` and handle errors for the case where the daemon is down.
- Multiple clients can connect to the same daemon simultaneously. Your CLI, a colleague's dashboard, and the web interface all share the same view of process state.
- Each connection is separate. You are responsible for closing it when your script is done, otherwise the process may hang waiting for the socket to close.
- Operations are asynchronous. You always receive results through callbacks (or promises you write yourself), never through return values.

### 3. Managing the Connection Lifecycle

`pm2.connect()` establishes the connection. It takes an options object and a callback. The most useful options are:

- `noDaemonMode: true` — start a fresh daemon (or reuse the running one) even if PM2 was not started; useful for automation running on machines where no one has ever launched PM2.
- `max_retries` — how many times the module retries connecting before giving up (default varies by version; set it explicitly for reliable automation).

```javascript
pm2.connect({ max_retries: 3 }, (err) => {
  if (err) {
    console.error('Failed to connect to the PM2 daemon:', err.message);
    process.exit(1);
  }
  // ... work with the API ...
});
```

Call `pm2.disconnect()` when your program finishes. A useful pattern for one-shot scripts: perform all work, then disconnect inside the final callback. For long-running tools (event bus listeners, dashboard servers), disconnect in your shutdown handler (`SIGINT`/`SIGTERM`) so the process exits cleanly.

### 4. Reading Process State

Three calls cover nearly every read you will need:

- `pm2.list(cb)` — returns an array of process objects, each with `name`, `pm_id`, `status`, `restart_time`, `unstable_restarts`, and a `pm2_env` object containing the resolved environment, creation date, and configuration.
- `pm2.jlist(cb)` — the same data as `list`, but as a JSON string. Useful when you want to pipe exactly one JSON blob somewhere without worrying about array conversion.
- `pm2.describe(nameOrId, cb)` — detailed information for one process, including logs paths, interpreter, and the versioning metadata PM2 stores on deploy.

A common automation pattern is to build a lookup from name to process:

```javascript
function findProcess(name) {
  return new Promise((resolve, reject) => {
    pm2.list((err, list) => {
      if (err) { reject(err); return; }
      resolve(list.find((p) => p.name === name) || null);
    });
  });
}
```

With the process object in hand you can read `status` (`online`, `stopped`, `errored`, `launching`), `restart_time` to detect crash loops, and `pm2_env.pm_uptime` for the process start timestamp.

### 5. Controlling Processes Programmatically

The control surface mirrors the CLI:

- `pm2.start(scriptOrConfig, options, cb)` — start a script, or an ecosystem config object, with per-app overrides.
- `pm2.restart(nameOrId, cb)` — stop then start a process (brief downtime).
- `pm2.reload(nameOrId, cb)` — zero-downtime rolling restart; only works for apps in cluster mode.
- `pm2.stop(nameOrId, cb)` / `pm2.delete(nameOrId, cb)` — stop, or stop and remove from the process list.
- `pm2.scale(name, number, cb)` — resize cluster instance count.
- `pm2.refresh` / `pm2.reset` — reset restart counters.

Starting from an object gives you full ecosystem power without a config file:

```javascript
pm2.start({
  name: 'api',
  script: 'dist/server.js',
  instances: 'max',
  exec_mode: 'cluster',
  env: { NODE_ENV: 'production', PORT: 3000 },
  max_memory_restart: '500M',
}, (err, apps) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`Started ${apps.length} instance(s) of api`);
  pm2.disconnect();
});
```

`pm2.start()` can also accept a string path to an ecosystem file, which keeps the machine-readable configuration in your repository while the automation logic lives in your tool.

```javascript
pm2.start('/opt/myapp/ecosystem.config.js', (err) => {
  if (err) {
    console.error('Failed to load ecosystem file:', err.message);
    process.exit(1);
  }
  console.log('Application started from ecosystem file');
  pm2.disconnect();
});
```

### 6. Idempotent Operations: startOrRestart and startOrReload

Deployment tooling needs operations that do the right thing whether the app is running or not. Running `pm2.delete` on a missing process errors; restarting a stopped process works, but a cold start is cleaner. The API provides two idempotent operations:

- `pm2.startOrRestart(config, cb)` — if a process with the configured name exists, restart it with the (possibly updated) config; otherwise start it fresh.
- `pm2.startOrReload(config, cb)` — same, but uses zero-downtime reload when the app already exists and runs in cluster mode.

These two calls are the backbone of safe automated deploys: one command brings a new app online and updates an existing one, with no branching logic on your side.

```javascript
pm2.startOrReload({
  name: 'worker',
  script: 'dist/worker.js',
  instances: 2,
  exec_mode: 'cluster',
  env: { NODE_ENV: 'production' },
}, (err, apps) => {
  if (err) { console.error('Deploy failed:', err.message); process.exit(1); }
  console.log('Worker is online and up to date');
  pm2.disconnect();
});
```

### 7. The Event Bus: Receiving Real-Time Events

The event bus (`pm2.launchBus()`) is where the programmatic API becomes dramatically more powerful than shell scripting. It gives you a stream of events emitted by the daemon:

- `process:event` — lifecycle transitions, with `data.process.pm2_env.status` showing the new state and `event` naming the trigger (e.g., `online`, `exit`, `restart`).
- `log:out` and `log:err` — stdout/stderr lines from any managed process.
- `error` — daemon-level errors (e.g., process crashes) with `data.process.name` identifying the app.
- `pm2:kill` — fired when the daemon itself is killed.
- `human:event` — custom events you emit from application code via `pm2.sendDataToProcessId` or the `@pm2/io` emitter.

A restart-alerting daemon is a handful of lines:

```javascript
const pm2 = require('pm2');

pm2.connect((err) => {
  if (err) { console.error(err); process.exit(1); }

  pm2.launchBus((busErr, bus) => {
    if (busErr) { console.error(busErr); process.exit(1); }

    bus.on('process:event', (data) => {
      if (data.event === 'restart' || data.event === 'exit') {
        const name = data.process.name;
        const status = data.process.pm2_env.status;
        console.log(`[ALERT] ${name} → ${data.event} (status: ${status})`);
      }
    });

    bus.on('log:err', (data) => {
      console.error(`[${data.process.name}]`, data.data.trim());
    });
  });
});
```

Note that the bus object is EventEmitter-like: you can attach multiple listeners, and you should detach or disconnect when your tool shuts down.

### 8. Sending Signals and Messages to Processes

Sometimes automation must interact with a process, not just manage it. Two mechanisms exist:

- `pm2.sendSignalToProcessName(signal, name, cb)` — deliver a POSIX signal (e.g., `SIGUSR1` for log rotation, `SIGTERM` for graceful drain) to every instance of a named app.
- `pm2.sendDataToProcessId(id, data, cb)` — send an arbitrary object to a specific process, where the app's own `process.on('message')` handler can receive it.

The second one is powerful for operational workflows — telling a worker to drain its queue, flush caches, or reload configuration without restarting it:

```javascript
// automation side
pm2.sendDataToProcessId(3, {
  type: 'process:msg',
  data: { action: 'reload-config' },
  topic: 'config-reload',
}, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log('Message delivered to process 3');
  pm2.disconnect();
});
```

```javascript
// application side
process.on('message', (msg) => {
  if (msg.data && msg.data.action === 'reload-config') {
    loadConfig(); // your app's custom logic
  }
});
```

### 9. Graceful Shutdown and Cleanup in Automation Tools

A long-running automation tool must clean up its PM2 connection when it stops, or the process hangs until the socket timeout kicks in. The robust pattern is to wrap your work in functions that return promises, then disconnect in a `finally`-style path — and to install signal handlers for interactive tools:

```javascript
async function main() {
  await connect();
  try {
    // ... automation work ...
  } finally {
    pm2.disconnect();
  }
}

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, disconnecting...');
  pm2.disconnect();
  process.exit(0);
});
```

For one-shot scripts, always disconnect before exiting; for daemon-style tools, disconnect in the shutdown handler and let the event loop drain naturally.

### 10. Building a Real Automation Tool: Anatomy and Patterns

A production automation tool built on the API typically layers four concerns:

1. **Connection wrapper** — a `connect()` that returns a promise, applies `max_retries`, and fails loudly with a clear message about daemon state.
2. **Domain functions** — thin wrappers like `getStatus('api')` or `deployApp(config)` that hide callback plumbing behind promises and include verification (e.g., check `status === 'online'` after a restart).
3. **Verification** — never trust the operation callback alone; after a deploy, poll `pm2.list()` until the process reports `online` with a fresh `restart_time`, or fail the run.
4. **Runtime surface** — the CLI (commander/yargs) or the event-bus listener that drives the domain functions.

The full worked example is in the Code Examples section: a `pm2ops` CLI that can show status, alert on restarts, and perform verified deployments.

## Code Examples

### Script 1: A Minimal Process Manager Wrapper

A promise-based wrapper around the most common calls. Save as `pm2api.js`:

```javascript
const pm2 = require('pm2');

const CONNECT_OPTIONS = { max_retries: 3 };

function connect() {
  return new Promise((resolve, reject) => {
    pm2.connect(CONNECT_OPTIONS, (err) => err ? reject(err) : resolve());
  });
}

function call(method, ...args) {
  return new Promise((resolve, reject) => {
    pm2[method](...args, (err, result) => err ? reject(err) : resolve(result));
  });
}

function disconnect() {
  return new Promise((resolve) => pm2.disconnect(() => resolve()));
}

module.exports = { connect, call, disconnect };
```

Usage — a one-shot script that lists all processes in a machine-readable table:

```javascript
const api = require('./pm2api');

(async () => {
  try {
    await api.connect();
    const list = await api.call('list');
    for (const proc of list) {
      const env = proc.pm2_env;
      console.log(`${proc.name.padEnd(20)} ${env.status.padEnd(10)} ` +
        `restarts=${env.restart_time} pid=${proc.pid || '-'}`);
    }
  } catch (err) {
    console.error('Automation failed:', err.message);
    process.exitCode = 1;
  } finally {
    await api.disconnect();
  }
})();
```

### Script 2: Reading JSON State with jlist

A monitoring agent that appends a JSON snapshot to a log once a minute. The `jlist` string is already JSON, so it writes straight to the file:

```javascript
const fs = require('fs');
const pm2 = require('pm2');

const SNAPSHOT_FILE = '/var/log/pm2-snapshots.jsonl';

pm2.connect({ max_retries: 3 }, (err) => {
  if (err) { console.error(err); process.exit(1); }

  const snapshot = () => {
    pm2.jlist((jlistErr, json) => {
      if (jlistErr) { console.error(jlistErr); return; }
      fs.appendFileSync(SNAPSHOT_FILE, `${json}\n`);
      console.log(`Snapshot written (${new Date().toISOString()})`);
    });
  };

  snapshot();
  const timer = setInterval(snapshot, 60_000);

  process.on('SIGTERM', () => {
    clearInterval(timer);
    pm2.disconnect();
    process.exit(0);
  });
});
```

### Script 3: Alerting on Restarts with launchBus

A listener that flags crash loops — more than three restarts inside ten minutes — and writes an alert entry:

```javascript
const pm2 = require('pm2');

const restartWindow = new Map(); // name -> [timestamps]

pm2.connect({ max_retries: 3 }, (err) => {
  if (err) { console.error(err); process.exit(1); }

  pm2.launchBus((busErr, bus) => {
    if (busErr) { console.error(busErr); process.exit(1); }

    bus.on('process:event', (data) => {
      if (data.event !== 'restart') return;
      const name = data.process.name;
      const now = Date.now();

      const timestamps = (restartWindow.get(name) || []).filter(
        (t) => now - t < 600_000
      );
      timestamps.push(now);
      restartWindow.set(name, timestamps);

      if (timestamps.length > 3) {
        console.error(`[CRASH LOOP] ${name} restarted ${timestamps.length} ` +
          `times in the last 10 minutes`);
        // Hook your pager/chat integration here
      }
    });
  });
});
```

### Script 4: Zero-Downtime Deployment Helper

A deploy function used by CI: build artifacts first, then `startOrReload`, then verify the new incarnation is online. The verification step polls until the process's `restart_time` changes to a value newer than the pre-deploy snapshot:

```javascript
const pm2 = require('pm2');

const DEPLOY_CONFIG = {
  name: 'api',
  script: 'dist/server.js',
  instances: 'max',
  exec_mode: 'cluster',
  env: { NODE_ENV: 'production' },
};

function currentRestartTime(name) {
  return new Promise((resolve, reject) => {
    pm2.list((err, list) => {
      if (err) { reject(err); return; }
      const proc = list.find((p) => p.name === name);
      resolve(proc ? proc.pm2_env.restart_time : -1);
    });
  });
}

async function deploy() {
  await new Promise((resolve, reject) => {
    pm2.connect({ max_retries: 3 }, (err) => err ? reject(err) : resolve());
  });

  try {
    const before = await currentRestartTime('api');

    await new Promise((resolve, reject) => {
      pm2.startOrReload(DEPLOY_CONFIG, (err) => err ? reject(err) : resolve());
    });

    // Poll until the restart happened, with a 30-second hard cap
    for (let i = 0; i < 30; i++) {
      const after = await currentRestartTime('api');
      if (after !== -1 && after !== before) {
        console.log('Deploy verified: api is running the new version');
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error('Timed out waiting for the new process to come online');
  } finally {
    pm2.disconnect();
  }
}

deploy().catch((err) => {
  console.error('Deploy failed:', err.message);
  process.exit(1);
});
```

### Script 5: A Small CLI Tool with Commander

Wiring the wrappers into a usable CLI. Install `commander` locally first (`npm install commander`), then this `pm2ops.js`:

```javascript
const { Command } = require('commander');
const pm2 = require('pm2');
const program = new Command();

program
  .name('pm2ops')
  .description('Operational tooling built on the PM2 programmatic API');

program
  .command('status <name>')
  .description('Show the live status of one managed process')
  .action(async (name) => {
    pm2.connect({ max_retries: 3 }, async (err) => {
      if (err) { console.error(err); process.exit(1); }
      pm2.describe(name, (describeErr, procs) => {
        if (describeErr || !procs || procs.length === 0) {
          console.error(`No process found named ${name}`);
          process.exitCode = 1;
        } else {
          const p = procs[0];
          console.log(`${p.name}: ${p.pm2_env.status} (pid ${p.pid}, ` +
            `restarts ${p.pm2_env.restart_time})`);
        }
        pm2.disconnect();
      });
    });
  });

program
  .command('graceful-reload <name>')
  .description('Reload an app with zero downtime (cluster mode required)')
  .action((name) => {
    pm2.connect({ max_retries: 3 }, (err) => {
      if (err) { console.error(err); process.exit(1); }
      pm2.reload(name, (reloadErr) => {
        if (reloadErr) {
          console.error(`Reload failed: ${reloadErr.message}`);
          process.exitCode = 1;
        } else {
          console.log(`${name} reloaded gracefully`);
        }
        pm2.disconnect();
      });
    });
  });

program.parse(process.argv);
```

Run it with `node pm2ops.js status api` or `node pm2ops.js graceful-reload api`. The CLI shares the same daemon and process list as your terminal's `pm2` commands, so you can mix both freely.

### Script 6: Handling Daemon Failures Gracefully

The most common automation failure is a missing daemon — for example, a server rebooted before `pm2 startup` was configured. A wrapper that detects this and reports a human-actionable message:

```javascript
const pm2 = require('pm2');
const { execFileSync } = require('child_process');

function ensureDaemon() {
  return new Promise((resolve, reject) => {
    pm2.connect({ max_retries: 1 }, (err) => {
      if (!err) { resolve(); return; }

      try {
        // The CLI will start the daemon if one is missing
        execFileSync('pm2', ['ping'], { stdio: 'pipe' });
        pm2.connect({ max_retries: 3 }, (retryErr) => {
          retryErr ? reject(retryErr) : resolve();
        });
      } catch (startErr) {
        reject(new Error(
          'PM2 daemon unavailable and could not be started automatically. ' +
          'Run "pm2 startup" once to install the boot service.'
        ));
      }
    });
  });
}

(async () => {
  try {
    await ensureDaemon();
    console.log('Connected to the PM2 daemon');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    pm2.disconnect();
  }
})();
```

## Key Insights

- Never parse CLI output in automation. The programmatic API returns structured JSON (`list`, `jlist`, `describe`) that is stable and complete; the CLI's human tables are an unstable interface to script against.
- Always call `pm2.disconnect()`. One-shot scripts hang or exit late, and long-running tools leak sockets, when the connection is left open. Disconnect in a `finally` block or in your signal handler.
- Prefer `startOrRestart`/`startOrReload` over `start` plus branching. They are idempotent: cold start for new apps, update for existing ones, with no `if running` logic of your own.
- Verify, do not assume. The operation callback firing does not mean the process is healthy. Poll `pm2.list()` for `status === 'online'` and a fresh `restart_time` after deploys.
- Handle the missing-daemon case explicitly. The programmatic API does not auto-start the daemon; detect connection failure and report the `pm2 startup` remediation instead of failing silently.
- The event bus is your superpower over shell scripts. `process:event`, `log:err`, and `error` events give you real-time awareness of crashes and restarts that polling can only approximate.
- Use one daemon, many clients. Your CLI, dashboards, and CI scripts all connect to the same daemon, so state stays consistent — but remember that concurrent control operations can race, so keep deploys serialized per app.

## Next Steps

- Deepen your understanding of the event bus and custom metrics with the PM2 Application Monitoring and Observability tutorial.
- Explore the God daemon architecture and process state machine in the Advanced PM2 Internals and Production Reliability syllabus.
- Combine this tooling with the Process Lifecycle guide to build deployment automation that respects graceful shutdown and readiness signaling.
- Consider wrapping your domain functions in a proper CI/CD pipeline using the GitHub Actions deployment patterns.

## Conclusion

The PM2 programmatic API turns a terminal-centric process manager into a platform you can build on. You now know how to connect to the daemon, read and control processes with structured data, receive real-time lifecycle and log events, and package all of it into idempotent, verified automation. The patterns here — promise wrappers, verification loops, event-bus alerting, graceful disconnects — carry directly into production tooling, whether that is a deploy bot, an internal CLI, or an observability agent. Start with `pm2.connect()` and one domain function; the rest of the platform opens up from there.

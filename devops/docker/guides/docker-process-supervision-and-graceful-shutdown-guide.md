---
title: "Docker Container Process Supervision and Graceful Shutdown Guide"
description: "A practical guide to getting container lifecycle semantics right: PID 1 duties, signal propagation, init shims, zombie reaping, drain ordering, and shutdown verification."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Docker Container Process Supervision and Graceful Shutdown Guide

## Introduction

A container is not a small virtual machine. It is a process tree with a namespace boundary, and the first process in that tree takes on the kernel's PID 1 responsibilities: it receives the signals the runtime sends, it inherits the orphans of everything underneath it, and its exit code becomes the container's exit code. Most production incidents that look like "the container ignored the redeploy and got killed after ten seconds" or "the deploy dropped in-flight requests" are not networking or orchestration problems. They are PID 1 problems.

This guide covers the lifecycle half of container operations: how the process you ship becomes PID 1, how SIGTERM reaches it, why exit code 137 keeps appearing in your dashboards, and how to make shutdowns ordered instead of abrupt. It complements the image-focused guidance elsewhere in this library. The image optimization guide makes images small and the BuildKit guide makes builds fast; this guide makes the running container well-behaved when a scheduler decides it is time to stop.

The failure mode is easy to state. `docker stop` sends the stop signal, waits ten seconds by default, then sends SIGKILL. If your process never saw the first signal, or saw it and kept working, the container dies mid-request. The orchestrator reports a completed stop either way, so nothing alerts. Only the 502s and the half-written files tell you what happened.

## Best Practices

### Use exec form for ENTRYPOINT and CMD

`CMD node server.js` is shell form: Docker wraps it as `/bin/sh -c "node server.js"`. A shell may replace itself with the command, but it does not have to, and once you add a wrapper such as `npm start`, a shell pipeline, or an `&&` chain, the process the kernel signals is the wrapper, not your application. Exec form (`CMD ["node", "server.js"]`) makes your binary PID 1 with no ambiguity. For entrypoint scripts the same rule applies at the last line: use `exec "$@"` so the script is replaced rather than sitting above the real process.

### Give PID 1 to something that can be PID 1

PID 1 has two extra duties: it must reap reparented children, and it ignores signals it has no handler for — the kernel does not apply default signal dispositions to PID 1. An application that never calls `wait()` on children accumulates zombies. An application that never installs a SIGTERM handler simply does not die on SIGTERM. If your process cannot do both, insert a minimal init: `docker run --init`, `init: true` in Compose, or `tini`/`dumb-init` as the entrypoint. The shim forwards signals to the child and reaps whatever is orphaned.

### Handle SIGTERM explicitly and exit on purpose

Graceful shutdown is an application feature, not a Docker flag. On SIGTERM, stop accepting new work, finish or checkpoint in-flight work, flush buffers, close the listener, then exit with a deliberate status. Install the handler early — before the port is opened — so a stop during startup does not fall through to SIGKILL. Also install it for SIGINT so `docker run -it` and Ctrl+C behave the same way as production.

### Only change STOPSIGNAL when you own both ends

`STOPSIGNAL SIGQUIT` is legitimate when your runtime already treats SIGQUIT as a graceful drain, and it is a trap when it is used to silence a process that ignores SIGTERM. The signal Docker sends and the signal your process handles must be the same one. Document the choice next to the handler.

### Size the stop timeout to real drain time, not to the default

The default grace period is ten seconds in Docker and thirty in Kubernetes. Neither knows how long your longest request, batch flush, or connection drain takes. Measure p99 shutdown and set `--stop-timeout`, Compose `stop_grace_period`, and `terminationGracePeriodSeconds` slightly above it. A timeout shorter than the drain guarantees truncation; a timeout vastly longer than the drain only slows rollouts.

### Drain traffic before the process stops working

SIGTERM and load-balancer deregistration are not coordinated. The container can be removed from endpoints a second or two after the signal arrives, which means requests keep arriving while the process is already refusing them. Fail readiness first, wait for the deregistration delay, then stop serving. In Kubernetes that is a `preStop` sleep or an explicit readiness flip; in Compose and Swarm it is a health check combined with a drain-aware entrypoint.

### Do not supervise multiple processes without saying so

One process per container is the default because it makes signals and exit codes unambiguous. When you genuinely need several (a cron loop beside a web server, an app plus a log shipper), use a real supervisor such as s6-overlay or supervisord, declare it as PID 1, configure it to forward SIGTERM to children in reverse start order, and decide which child's exit should terminate the container. A `command: sh -c "a & b"` is not a supervisor; it is an orphan generator.

### Flush logs before exiting and send them to stdout

Logs buffered in userspace die with the process. Flush the logger during the shutdown handler and write to stdout/stderr so the configured logging driver captures the final lines. A shutdown that leaves no trace in the logs is indistinguishable from a crash.

### Test shutdown like you test requests

Send SIGTERM to a running container and assert three things: the process exits within the budget, in-flight requests complete, and the exit code is the one you intended. This takes one script and catches the entire class of regressions described in this guide, including the ones introduced by refactors that wrap the binary in a launcher.

## Implementation Steps

### Step 1: Find out what is actually PID 1

Start from observation instead of assumption. Inspect the process tree of a running container and read the command line of PID 1 exactly as the kernel sees it.

```bash
# Host-side view of the container process tree
docker top my-app -o pid,ppid,stat,cmd

# The command line of PID 1, straight from the container's procfs
docker exec my-app cat /proc/1/cmdline | tr '\0' ' '
docker exec my-app sh -c 'ps -o pid,ppid,stat,comm -p 1'

# What the runtime will send, and how long it will wait
docker inspect my-app \
  --format 'stopSignal={{.Config.StopSignal}} timeout={{.Config.StopTimeout}} cmd={{json .Config.Cmd}} entrypoint={{json .Config.Entrypoint}}'
```

If the output shows `sh` or `npm` instead of your binary, the rest of this guide applies directly. If it shows your binary and shutdown still misbehaves, the handler or the timeout is the problem.

### Step 2: Convert shell form to exec form

Rewrite the process definition so the binary is the first thing the kernel starts. This is a one-line change with an outsized effect.

```dockerfile
# Before: PID 1 is a shell, and `npm` sits between the shell and node
CMD npm start

# After: node itself is PID 1
CMD ["node", "server.js"]

# After, when a launcher is genuinely needed: keep the launcher in exec form
ENTRYPOINT ["node", "server.js"]
```

The same correction applies to Compose files, which silently inherit shell form when `command` is a bare string.

```yaml
services:
  app:
    image: registry.example.com/app:1.8.3
    # Before: runs through /bin/sh -c and keeps a shell in the process tree
    # command: npm start

    # After: a proper argv array
    command: ["node", "server.js"]
    init: true
    stop_grace_period: 25s
```

### Step 3: Add an init shim where the application cannot do PID 1 work

If the image starts a shell script, a JVM launcher, or any process that spawns short-lived children, add a tiny init rather than rewriting the application. The shim reaps zombies and forwards signals.

```dockerfile
# Option A: a pinned init as the entrypoint, with the real command as arguments
FROM docker.io/library/alpine:3.20

RUN apk add --no-cache tini=0.19.0-r3
COPY ./app /usr/local/bin/app

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/app"]
```

```bash
# Option B: let the runtime inject init — no image change required
docker run --init --rm -p 3000:3000 registry.example.com/app:1.8.3

# Confirm tini is PID 1 and the app is its child
docker top app-check -o pid,ppid,stat,cmd
```

Compose exposes the same switch as `init: true` (shown in Step 2). Kubernetes has no per-pod init flag, so an image-level shim is the portable choice there.

### Step 4: Implement the shutdown handler in the application

The handler needs to do four things in order: stop accepting work, finish current work, release resources, exit. The HTTP examples below use Node.js and Go because both expose the primitives needed to do this without a supervisor.

```javascript
// server.js — graceful shutdown with a hard deadline
import http from 'node:http';

const server = http.createServer(app);
const SHUTDOWN_BUDGET_MS = 20000;

let shuttingDown = false;

server.listen(3000, () => {
  console.log(JSON.stringify({ event: 'listening', port: 3000 }));
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ event: 'shutdown_started', signal }));

  // Stop accepting new connections immediately so probes turn red
  server.close(async () => {
    try {
      await db.flush();
      await db.close();
      await cache.quit();
      console.log(JSON.stringify({ event: 'shutdown_complete' }));
      process.exit(0);
    } catch (error) {
      console.error(JSON.stringify({ event: 'shutdown_failed', message: error.message }));
      process.exit(1);
    }
  });

  // Release idle keep-alive sockets so close() can finish in reasonable time
  server.closeIdleConnections();

  // Hard deadline: never let the grace period end in SIGKILL if we can avoid it
  const deadline = setTimeout(() => {
    console.error(JSON.stringify({ event: 'shutdown_deadline_exceeded' }));
    server.closeAllConnections();
    process.exit(1);
  }, SHUTDOWN_BUDGET_MS);
  deadline.unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error(JSON.stringify({ event: 'uncaught_exception', message: error.message }));
  shutdown('uncaughtException');
});
```

```go
// main.go — context-based shutdown with an explicit deadline
package main

import (
    "context"
    "errors"
    "log/slog"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    srv := &http.Server{Addr: ":3000", Handler: newRouter()}

    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
    defer stop()

    go func() {
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            slog.Error("listen failed", "err", err)
            os.Exit(1)
        }
    }()
    slog.Info("listening", "port", 3000)

    <-ctx.Done()
    slog.Info("shutdown started")

    // The budget must be shorter than the orchestrator's grace period
    drainCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
    defer cancel()

    if err := srv.Shutdown(drainCtx); err != nil {
        slog.Error("graceful shutdown failed", "err", err)
        os.Exit(1)
    }
    slog.Info("shutdown complete")
}
```

### Step 5: Fix entrypoint scripts so they hand off control

A shell entrypoint that ends with `node server.js` stays alive as a parent, and the kernel keeps signalling the shell. End the script with `exec` so the shell is replaced by the real process.

```bash
#!/bin/sh
set -eu

# Wait for a dependency without leaving a supervisor behind
until pg_isready -h "${DB_HOST}" -p 5432 >/dev/null 2>&1; do
  echo "waiting for database"
  sleep 1
done

# exec replaces this shell, so the application becomes PID 1 and receives SIGTERM
exec "$@"
```

With `ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]` and `CMD ["node", "server.js"]`, the arguments arrive as `"$@"` and the final `exec` eliminates the wrapper.

### Step 6: Align the grace periods across every layer

Every layer that can force a stop has its own timeout. They must descend, with the application's own deadline shortest and the runtime's kill deadline longest, or a layer above will truncate a shutdown that was proceeding correctly.

```text
| Layer                          | Setting                                   | Recommended value        |
|--------------------------------|-------------------------------------------|--------------------------|
| Application internal deadline  | handler timer / shutdown context           | 20s                      |
| Docker Engine                  | docker stop --timeout / docker run --stop-timeout | 25s                |
| Docker Compose                 | stop_grace_period                          | 25s                      |
| Docker Swarm service           | stop_grace_period                          | 25s                      |
| Kubernetes pod                 | terminationGracePeriodSeconds              | 30s                      |
| Load balancer deregistration   | target group deregistration delay          | 5-10s (inside the pod's budget) |
```

```yaml
# compose.yaml — the settings that matter for a clean stop
services:
  app:
    image: registry.example.com/app:1.8.3
    command: ["node", "server.js"]
    init: true
    stop_signal: SIGTERM
    stop_grace_period: 25s
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 5s
      timeout: 2s
      retries: 3
      start_period: 10s
```

### Step 7: Drain traffic before the process stops serving

The sequence that avoids dropped requests is: mark unready, wait for the load balancer to notice, then shut down. In Kubernetes the readiness gate can be flipped by the `preStop` hook; in Compose and plain Docker the health check plus an entrypoint-level drain achieves the same ordering.

```yaml
# Kubernetes deployment excerpt — readiness first, then shutdown
spec:
  terminationGracePeriodSeconds: 40
  containers:
    - name: app
      image: registry.example.com/app:1.8.3
      readinessProbe:
        httpGet:
          path: /ready
          port: 3000
        periodSeconds: 2
      lifecycle:
        preStop:
          exec:
            # 1. stop reporting ready, 2. give the LB time to deregister
            command: ["/bin/sh", "-c", "curl -fsS -X POST localhost:3000/drain && sleep 8"]
```

The `/drain` endpoint should make `/ready` return 503 while `/health` keeps returning 200, so the container is deregistered but not restarted. That distinction is the whole point of separating liveness from readiness.

### Step 8: Verify shutdown behaviour instead of trusting the manifest

Run the container, send the real signal, and measure. This script fails loudly when the exit code is 137 (SIGKILL after the timeout) or when the process takes the entire budget.

```bash
#!/usr/bin/env bash
set -euo pipefail

IMAGE="registry.example.com/app:1.8.3"
CONTAINER="shutdown-check-$$"
BUDGET_MS=25000

docker run -d --name "${CONTAINER}" --init -p 0:3000 "${IMAGE}" >/dev/null
sleep 3

# Put one long request in flight so truncation is observable
START_MS=$(date +%s%3N)
docker exec "${CONTAINER}" node -e "fetch('http://localhost:3000/slow').then(r => console.log(r.status))" &
INFLIGHT=$!

STOP_START_MS=$(date +%s%3N)
docker stop --timeout $((BUDGET_MS / 1000)) "${CONTAINER}" >/dev/null
STOP_END_MS=$(date +%s%3N)

EXIT_CODE=$(docker inspect "${CONTAINER}" --format '{{.State.ExitCode}}')
ELAPSED_MS=$((STOP_END_MS - STOP_START_MS))

echo "exit_code=${EXIT_CODE} elapsed_ms=${ELAPSED_MS} inflight_elapsed_ms=$((STOP_END_MS - START_MS))"
docker logs "${CONTAINER}" 2>&1 | tail -n 5 || true
docker rm -f "${CONTAINER}" >/dev/null

if [ "${EXIT_CODE}" -eq 137 ]; then
  echo "FAIL: container was killed by SIGKILL — the grace period expired" >&2
  exit 1
fi
if [ "${ELAPSED_MS}" -ge "${BUDGET_MS}" ]; then
  echo "FAIL: shutdown consumed the whole budget" >&2
  exit 1
fi
echo "PASS: shutdown completed in ${ELAPSED_MS}ms with exit code ${EXIT_CODE}"
wait "${INFLIGHT}" || true
```

Exit codes tell you which path was taken, and they are worth memorizing because they appear in `docker ps -a`, Compose logs, and most orchestrator dashboards.

```text
| Exit code | Meaning                                                       | What it usually indicates                     |
|-----------|---------------------------------------------------------------|-----------------------------------------------|
| 0         | Process exited normally                                       | Handler ran to completion and exited on purpose |
| 1         | Application error                                             | Handler hit an error or the budget was exceeded |
| 143       | 128 + 15 — terminated by SIGTERM with no handler              | No shutdown handler installed at all          |
| 137       | 128 + 9 — killed by SIGKILL                                   | Grace period expired; drain was too slow      |
| 139       | 128 + 11 — segmentation fault                                 | Crash, not a shutdown problem                 |
| 255       | Shell or launcher exited with an error status                 | Bad entrypoint script or missing binary       |
```

### Step 9: Supervise deliberately when a container must run several processes

When a sidecar-like process has to share the container, hand PID 1 to a supervisor and make its signal behaviour explicit. s6-overlay is the common choice because its shutdown semantics are ordered and documented.

```dockerfile
# s6-overlay manages multiple processes and forwards SIGTERM in reverse start order
FROM docker.io/library/debian:12-slim

ARG S6_OVERLAY_VERSION=3.1.6.2
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz /tmp
RUN tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz \
 && tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz \
 && rm -f /tmp/s6-overlay-*.tar.xz

COPY ./s6/services/app/run /etc/s6-overlay/s6-rc.d/app/run
COPY ./s6/services/app/finish /etc/s6-overlay/s6-rc.d/app/finish

ENTRYPOINT ["/init"]
```

```bash
# s6 service run script — exec so the supervised process itself receives signals
#!/command/execlineb -P
foreground { echo "starting app" }
exec node /usr/local/bin/server.js
```

The `finish` script is the hook for last rites: flush, upload a final checkpoint, or log the exit status. Whatever the supervisor is, confirm with `docker top` that it is PID 1 and that its children die in the order you expect.

## Key Insights

- PID 1 semantics are the root cause of nearly every "container ignored shutdown" report. The kernel gives PID 1 no default signal action, so an application without a handler literally cannot be stopped gracefully by SIGTERM.
- Exit code 137 is a measurement, not an error message: it says the drain took longer than the grace period. Fix the budget arithmetic before you fix the handler.
- `exec` in shell scripts is the highest-leverage single word in this guide. It converts a three-process chain into one process that the runtime can signal directly.
- Init shims are cheap. `--init` costs a few hundred kilobytes and removes an entire class of zombie and signal-forwarding bugs; there is rarely a reason not to use it.
- Draining is a two-phase operation: become unready, then stop. A process that stops serving before the load balancer stops routing to it will drop requests no matter how graceful its handler is.
- Readiness and liveness must answer different questions. Nothing else forces the distinction so clearly as a shutdown that needs to stay alive while it drains.
- Timeouts must descend in every layer above the application. A correct 20-second handler behind a 10-second default stop timeout is a 10-second handler.
- Verify with a real signal. Manifest review cannot tell you whether a redeploy drops requests; a scripted SIGTERM test can, and it belongs in CI next to the image scan.

---
title: "PM2 Troubleshooting and Diagnostics Cheatsheet"
description: "A symptom-driven quick reference for diagnosing PM2 failures — crash loops, exit codes, port conflicts, memory restarts, daemon and socket problems, and log forensics."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# PM2 Troubleshooting and Diagnostics Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Get the state of every process | `pm2 list` | Status, restart count, uptime, and memory for each app |
| Get a machine-readable snapshot | `pm2 jlist` | JSON array of all processes, safe to feed into jq |
| Inspect one app in depth | `pm2 describe reinvy-api` | Script path, exec mode, restart counters, log paths, env |
| Show only the error stream | `pm2 logs reinvy-api --err` | Skips stdout noise and shows what the process died on |
| Show the last N lines without streaming | `pm2 logs --lines 300 --nostream` | Reads the tail of both out and error logs, then exits |
| Flush stale logs before a repro | `pm2 flush reinvy-api` | Empties the log files so a fresh failure is unambiguous |
| Watch restarts happen live | `pm2 monit` | Terminal dashboard for CPU, memory, and restart activity |
| Change restart policy at runtime | `pm2 start app.js --exp-backoff-restart-delay=200` | Exponential backoff between restarts of an unstable app |
| Raise the memory restart ceiling | `pm2 restart reinvy-api --max-memory-restart 768M` | Restarts the process when RSS crosses the limit |
| Follow the daemon's own log | `tail -f ~/.pm2/pm2.log` | Records daemon restarts, spawn errors, and CLI failures |
| Read the God daemon's error log | `tail -n 100 ~/.pm2/pm2.log` | The first place to look when a process never appears |
| Confirm the daemon is alive | `pm2 ping` | Prints "pong" when the God daemon answers |
| Kill and rebuild the daemon | `pm2 kill` then `pm2 resurrect` | Clears a stuck daemon while keeping the saved process list |
| Produce a support bundle | `pm2 report` | Dumps versions, system info, daemon logs, and every app dump |
| Check the IPC socket permissions | `ls -l ~/.pm2/pub.sock ~/.pm2/rpc.sock` | Expected mode is `srw-------` owned by the deploy user |
| Find what holds an occupied port | `ss -ltnp` | Maps a listening port to the pid that owns it |
| Trace which process PM2 spawned | `ps -o pid,ppid,cmd -p $(pgrep -f 'reinvy-api')` | Confirms the real command line and parent pid |
| Inspect a container's supervisor | `docker exec -it api pm2 list` | Confirms PM2 is alive inside the running container |
| Verify boot-time resurrection | `systemctl status pm2-deploy` | Shows whether the init unit ran and what it logged |
| Count restarts over time | `pm2 jlist` plus `jq '[.[] \| {name, restarts: .pm2_env.restart_time}]'` | Turns restart counters into a comparable snapshot |
| Detect an errored app in a script | `pm2 jlist` plus `jq -e 'any(.[]; .pm2_env.status != "online")'` | Exits non-zero when any managed app is not online |
| Reset counters after a fix | `pm2 reset all` | Clears restart counters so the next incident is measurable |
| Run the app without the daemon | `node app.js` | Bypasses PM2 entirely to isolate app bugs from supervisor bugs |
| Start in the foreground | `pm2 start app.js --no-daemon` | Keeps the daemon attached to your terminal for live output |

## Common Commands

### Triage in Thirty Seconds

```bash
# 1. What is actually running, and how many times has each app restarted?
pm2 list

# 2. Freeze that state as JSON so you can diff it later
pm2 jlist > /tmp/pm2-before.json

# 3. For anything errored or flapping, read the recent error output
pm2 logs reinvy-api --err --lines 200 --nostream

# 4. Confirm the daemon itself is healthy
pm2 ping && tail -n 40 ~/.pm2/pm2.log
```

A single pass over those four commands separates three very different failure
classes: the app is crashing, the supervisor cannot spawn it, or the daemon
itself is wedged.

### Reading the Restart Counter

```bash
# Restart count, uptime, and instability flag for one app
pm2 describe reinvy-api | grep -E "restarts|uptime|unstable|status|exec mode"

# Sort every app by restart count, highest first
pm2 jlist > /tmp/pm2-state.json
jq -r '.[] | [.pm2_env.restart_time, .name, .pm2_env.status] | @tsv' /tmp/pm2-state.json | sort -rn
```

A high restart count with a healthy-looking status is a slow crash loop: the app
boots, serves for a while, then dies. A high count with `errored` status means
PM2 already gave up. When `unstable_restarts` is greater than zero, PM2 has
detected a start-crash cycle and started applying `min_uptime`.

### Decoding Exit Codes

```bash
# PM2 records the last exit code inside the process environment
pm2 describe reinvy-api | grep -E "exit code|status"

# When PM2 gives up, it stops respawning and marks the app errored
pm2 list --no-color | grep -w errored
```

```text
| Exit code | Signal | Typical cause                                   | First check                    |
|-----------|--------|-------------------------------------------------|--------------------------------|
| 0         | none   | App finished on purpose (job, one-shot script)  | Should it stay alive at all?   |
| 1         | none   | Unhandled exception during startup              | pm2 logs <name> --err          |
| 12        | none   | Node ran out of heap while parsing config       | --max-old-space-size, payload  |
| 127       | none   | Interpreter or script path is wrong             | pm2 describe <name> exec cwd   |
| 134       | SIGABRT| Native module or assertion failure              | Native build flags, node ver   |
| 137       | SIGKILL| OOM killer or forced kill                       | dmesg, container memory limit  |
| 143       | SIGTERM| Supervisor or orchestrator stopped it           | Deploy/reload timing           |
| 246       | SIGINT | Graceful stop by hand                           | Expected during a reload       |
```

### Resolving Port and Address Conflicts

```bash
# Who owns port 3000 right now?
ss -ltnp | grep ':3000'

# Every PM2-managed process plus anything else listening
pm2 list
sudo ss -ltnp | awk 'NR>1 {print $4, $6}'

# Restart only the app that lost the race, after freeing the port
pm2 restart reinvy-api --update-env
```

`EADDRINUSE` in the error log almost always means an orphaned child from a hard
restart, a second copy started outside PM2, or cluster instances configured with
a fixed port instead of `process.env.PORT`.

### Diagnosing Memory Restarts and OOM Kills

```bash
# Watch RSS per process; a sawtooth pattern means repeated memory restarts
pm2 list

# Check whether the kernel OOM killer intervened
sudo dmesg -T | grep -i -E "oom|killed process"

# Container memory ceiling versus what PM2 allows
docker stats --no-stream api
pm2 describe reinvy-api | grep -E "max memory restart|memory"
```

Set `max_memory_restart` below the container or host limit. If it sits above the
kernel ceiling, the OOM killer wins and you get SIGKILL instead of a controlled
restart with a readable log line.

### Fixing Permissions and Socket Failures

```bash
# A daemon owned by the wrong user cannot talk to the deploy user's CLI
ls -ld ~/.pm2
ls -l ~/.pm2/pub.sock ~/.pm2/rpc.sock

# Repair ownership after a mistaken sudo run
sudo chown -R deploy:deploy /home/deploy/.pm2
chmod 700 /home/deploy/.pm2

# Confirm the CLI can reach the daemon
pm2 ping
```

Running `pm2` with `sudo` once creates root-owned sockets and log files. Every
later command as the deploy user then fails with an IPC or `EACCES` error until
ownership is corrected or the daemon is rebuilt under the right account.

### Recovering a Wedged Daemon

```bash
# Last resort: tear down the daemon, then restore the saved process list
pm2 save
pm2 kill
pm2 resurrect

# If the process list itself is corrupt, start fresh from the ecosystem file
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

`pm2 kill` stops the God daemon and every child. Only run it after `pm2 save`,
otherwise an unsaved process list is lost and the apps must be re-declared from
the ecosystem file.

### Collecting a Diagnostics Bundle

```bash
# PM2 emits a single report containing versions, daemon logs, and app dumps
pm2 report > /tmp/pm2-report.txt

# Add the surrounding system context
node --version
uname -a
systemctl status pm2-deploy --no-pager >> /tmp/pm2-report.txt
```

The report is the fastest way to hand a reproducible failure to someone else: it
captures PM2, Node, and kernel versions alongside the daemon log and the last
known process dump.

### Log Forensics for Crash Investigation

```bash
# Flush, reproduce, then read — avoids chasing old failures
pm2 flush reinvy-api
# ...trigger the failing request or deploy...
pm2 logs reinvy-api --err --lines 60 --nostream

# Correlate with the daemon's view of the same moment
tail -n 80 ~/.pm2/pm2.log
```

Reading a flushed log after a deliberate reproduction is the difference between
a stack trace you can trust and one buried under hours of routine output.

## Code Snippets

### Ecosystem File with a Diagnostic-Safe Restart Policy

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'reinvy-api',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      // Contain crash loops instead of letting them spin forever
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 2000,
      exp_backoff_restart_delay: 200,
      // Restart before the kernel OOM killer does
      max_memory_restart: '640M',
      // Keep every instance's output in one place and timestamped
      merge_logs: true,
      time: true,
      error_file: '/var/log/pm2/reinvy-api.err.log',
      out_file: '/var/log/pm2/reinvy-api.out.log',
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

### Triage Script for Cron or CI

```bash
#!/usr/bin/env bash
# pm2-triage.sh — exit non-zero when anything is down or flapping
set -euo pipefail

STATE=$(mktemp)
pm2 jlist > "$STATE"

BAD=$(jq -r '[.[] | select(.pm2_env.status != "online")] | length' "$STATE")
FLAPPING=$(jq -r '[.[] | select(.pm2_env.restart_time > 5)] | length' "$STATE")

if [ "$BAD" -gt 0 ] || [ "$FLAPPING" -gt 0 ]; then
  jq -r '.[] | "\(.name)\t\(.pm2_env.status)\trestarts=\(.pm2_env.restart_time)"' "$STATE"
  pm2 report > /tmp/pm2-report.txt 2>/dev/null || true
  exit 1
fi

echo "all apps online, restart counts nominal"
```

### Reading Restart Counts Without the CLI

```javascript
// restart-audit.js — capture a comparable snapshot for post-incident review
const { execFileSync } = require('node:child_process');

const raw = execFileSync('pm2', ['jlist'], { encoding: 'utf8' });
const snapshot = JSON.parse(raw).map((proc) => ({
  name: proc.name,
  status: proc.pm2_env.status,
  restarts: proc.pm2_env.restart_time,
  unstable: proc.pm2_env.unstable_restarts,
  uptimeMs: Date.now() - proc.pm2_env.pm_uptime,
  rssMb: Math.round((proc.monit?.memory ?? 0) / 1024 / 1024),
  exitCode: proc.pm2_env.exit_code,
}));

console.table(snapshot);
```

### Programmatic Health Probe with Remediation

```javascript
// health-probe.js — restart only what is genuinely broken, log what was done
const pm2 = require('pm2');

pm2.connect((connectErr) => {
  if (connectErr) {
    console.error('daemon unreachable:', connectErr.message);
    process.exit(2);
  }

  pm2.list((listErr, apps) => {
    if (listErr) {
      console.error('list failed:', listErr.message);
      pm2.disconnect();
      process.exit(2);
    }

    const broken = apps.filter(
      (app) => app.pm2_env.status !== 'online' || app.pm2_env.restart_time > 5,
    );

    broken.forEach((app) => {
      console.warn(
        `restarting ${app.name}: status=${app.pm2_env.status} restarts=${app.pm2_env.restart_time}`,
      );
      pm2.restart(app.name, (restartErr) => {
        if (restartErr) console.error(`restart ${app.name} failed:`, restartErr.message);
      });
    });

    pm2.disconnect();
    process.exit(broken.length > 0 ? 1 : 0);
  });
});
```

### Inspecting Boot-Time Resurrection Failures

```bash
# The init unit either ran, failed, or never fired
systemctl status pm2-deploy --no-pager
journalctl -u pm2-deploy --since "-30 min" --no-pager

# Confirm a saved dump exists — resurrect has nothing to restore without it
ls -l ~/.pm2/dump.pm2

# Re-run resurrection by hand to surface the real error
pm2 resurrect
```

### Pre-Deploy Preflight that Catches the Usual Suspects

```bash
#!/usr/bin/env bash
# preflight.sh — run before pm2 reload in a deploy pipeline
set -euo pipefail

echo "node: $(node --version)"
echo "pm2:  $(pm2 --version)"

# Port already taken by something outside PM2?
if ss -ltn | grep -q ':3000 '; then
  echo "port 3000 is already bound — refusing to reload" >&2
  ss -ltnp | grep ':3000 ' >&2 || true
  exit 1
fi

# Disk headroom for logs
df -h /var/log/pm2 | tail -n 1

# Ecosystem file must parse before PM2 ever sees it
node -e "require('./ecosystem.config.js'); console.log('ecosystem config OK')"
```

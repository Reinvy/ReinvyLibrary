---
title: "PM2 Logging Cheatsheet"
description: "A quick reference for PM2 log locations, merged cluster logs, rotation with pm2-logrotate, JSON output, and grep patterns for production debugging."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# PM2 Logging Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Stream all logs | `pm2 logs --timestamp` | Tails every `out` and `error` stream managed by the daemon |
| Stream one app | `pm2 logs api --err` | Filters to a single process; `--err` or `--out` picks one stream |
| Snapshot for scripts | `pm2 logs api --nostream --lines 500` | Prints the last 500 lines and exits instead of following |
| Locate log files | `ls -lh ~/.pm2/logs/` | Default layout: `<app>-out.log` and `<app>-error.log` |
| Merge cluster logs | `merge_logs: true` | Writes all cluster workers into one file per stream |
| Truncate logs | `pm2 flush api` | Empties files without restarting the process |
| Reopen file handles | `pm2 reloadLogs` | Required after rotation that replaces the inode |
| Install rotation | `pm2 install pm2-logrotate` | Community module that rotates PM2 log files |
| Cap file size | `pm2 set pm2-logrotate:max_size 10M` | Rotates as soon as a file exceeds 10 MB |
| Keep history | `pm2 set pm2-logrotate:retain 7` | Keeps the seven most recent rotated files |
| Compress rotated files | `pm2 set pm2-logrotate:compress true` | Gzips old files to slow disk growth |
| Machine-readable output | `pm2 logs api --json` | One JSON object per line instead of colored text |

## Common Commands

### Locating and Sizing Logs

```bash
# Default location of every process log file
ls -lh ~/.pm2/logs/

# Confirm the exact paths PM2 uses for one app
pm2 describe api | grep -E "out log path|error log path"

# Total disk consumed by logs, plus the daemon's own log
du -sh ~/.pm2/logs/ && tail -n 50 ~/.pm2/pm2.log
```

### Streaming and Filtering

```bash
# Follow one app's error stream with timestamps, then detach at 200 lines
pm2 logs api --err --timestamp --nostream --lines 200

# Search for HTTP 5xx responses in the raw stream
pm2 logs api --raw --nostream --lines 5000 | grep -E '"status":5[0-9]{2}'

# Count errors per minute to spot a burst
pm2 logs api --raw --nostream --lines 5000 \
    | grep -i error \
    | awk -F'"timestamp":"' '{print substr($2, 1, 16)}' \
    | sort | uniq -c
```

### Rotation with pm2-logrotate

```bash
# Install the rotation module (it runs as a special process inside PM2)
pm2 install pm2-logrotate

# Rotate at 10 MB, keep 14 files, compress the old ones
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true

# Add a daily rotation at midnight alongside the size trigger
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# Verify the active module configuration
pm2 conf pm2-logrotate
```

### JSON and Structured Output

```bash
# PM2's own JSON wrapper around each log line
pm2 logs api --json --nostream --lines 3

# Raw application output with no PM2 prefix added
pm2 logs api --raw --nostream --lines 50

# Filter structured logs with jq when the app already emits JSON
pm2 logs api --raw --nostream --lines 1000 | jq -c 'select(.level >= 50)'
```

## Code Snippets

### Ecosystem Configuration with Logging Settings

```javascript
module.exports = {
  apps: [
    {
      name: 'api',
      script: './dist/server.js',
      instances: 4,
      exec_mode: 'cluster',
      // Collapse all cluster workers into one file per stream
      merge_logs: true,
      // Prefix every line so grep by timestamp is trivial
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      // Explicit paths keep logs on the data volume, not the root disk
      out_file: '/var/log/reinvy/api-out.log',
      error_file: '/var/log/reinvy/api-error.log',
      env_production: { NODE_ENV: 'production' }
    }
  ]
};
```

### Structured Logger that Plays Well with PM2

```javascript
// logger.js — one JSON object per line so pm2 logs --json stays parseable
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { app: process.env.PM2_APP_NAME, pid: process.pid },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    }
  }
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  process.exit(1);
});

module.exports = logger;
```

### External logrotate for Host-Managed Rotation

```ini
# /etc/logrotate.d/pm2-reinvy-api
/var/log/reinvy/api-*.log {
    daily
    rotate 14
    size 10M
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    su deploy deploy
}
```

```bash
# copytruncate keeps the inode, so PM2 keeps writing to the same file
sudo logrotate -d /etc/logrotate.d/pm2-reinvy-api   # dry run first
sudo logrotate -f /etc/logrotate.d/pm2-reinvy-api   # force one rotation

# If rotation moves the file instead, PM2 must reopen its handles
pm2 reloadLogs
# And after any manual cleanup, confirm the size actually dropped
du -sh ~/.pm2/logs/
```

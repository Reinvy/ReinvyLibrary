---
title: "PM2 Production Deployment and Monitoring Guide"
description: "A comprehensive guide to deploying Node.js applications to production with PM2, covering ecosystem file configuration, cluster mode, zero-downtime deployments, log management, monitoring, and CI/CD integration."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# PM2 Production Deployment and Monitoring Guide

## Introduction

PM2 is the de facto process manager for Node.js applications in production. While getting started with PM2 is straightforward, running applications reliably at scale requires careful configuration of ecosystem files, log rotation, cluster mode, monitoring, and deployment pipelines. This guide consolidates battle-tested practices for PM2 production deployments, covering everything from environment-specific ecosystem files to automated CI/CD integration. Following these patterns ensures your Node.js applications stay online, degrade gracefully under load, and provide the observability data your operations team needs.

## Best Practices

### 1. Use Ecosystem Files for Reproducible Configuration

Always manage PM2 configuration through `ecosystem.config.js` (or `.json`) files rather than CLI flags. Ecosystem files are version-controllable, self-documenting, and eliminate the risk of configuration drift between environments.

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "api",
      script: "dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
```

### 2. Separate Environment-Specific Overrides

Maintain a base ecosystem file and extend it with environment-specific overrides rather than duplicating configuration. This keeps the common settings in one place and makes environment differences explicit.

```javascript
// ecosystem.config.js — shared base
const common = {
  script: "dist/server.js",
  instances: "max",
  exec_mode: "cluster",
  max_memory_restart: "500M",
  error_file: "./logs/err.log",
  out_file: "./logs/out.log",
  combine_logs: true,
  merge_logs: true,
  log_date_format: "YYYY-MM-DD HH:mm:ss Z",
};

module.exports = {
  apps: [
    {
      ...common,
      name: "api",
      env: { NODE_ENV: "development" },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        instances: "max",
        max_memory_restart: "1G",
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 4000,
        instances: 2,
      },
    },
  ],
};
```

Run with environment-targeted flags:
```bash
pm2 start ecosystem.config.js --env production
pm2 start ecosystem.config.js --env staging
```

### 3. Enable Cluster Mode for Multi-Core Utilization

Set `exec_mode: "cluster"` and `instances: "max"` to spawn one worker per CPU core. PM2 handles load-balancing across workers via a built-in round-robin scheduler. This is the single most impactful change for throughput on multi-core machines.

```javascript
{
  exec_mode: "cluster",
  instances: "max",  // or a fixed number like 4
}
```

**Important**: Cluster mode requires your application to be stateless. Session data, in-memory caches, and WebSocket connections must be externalized (Redis, database) or the `sticky` mode must be enabled via a reverse proxy like Nginx.

### 4. Configure Graceful Shutdown with Signal Handling

Production applications must handle `SIGINT` / `SIGTERM` signals to close database connections, finish in-flight requests, and flush logs before exiting. Without this, PM2 may forcefully kill processes and cause data loss.

```javascript
// In your Node.js application
process.on("SIGINT", async () => {
  console.log("Received SIGINT — shutting down gracefully...");
  await server.close();
  await db.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM — shutting down gracefully...");
  await server.close();
  await db.disconnect();
  process.exit(0);
});
```

Configure PM2's kill timeout in the ecosystem file:
```javascript
{
  kill_timeout: 5000,  // Wait 5 seconds for graceful shutdown
  listen_timeout: 3000, // Wait 3 seconds for the app to start listening
}
```

### 5. Set Up Automated Log Rotation

PM2's built-in log management (`pm2-logrotate`) prevents logs from consuming all available disk space. Install and configure it as a PM2 module:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval "0 0 * * *"
```

| Setting | Recommended | Description |
|---------|-------------|-------------|
| `max_size` | `100M` | Rotate log file when it reaches this size |
| `retain` | `7` | Keep 7 rotated files per log |
| `compress` | `true` | Gzip rotated files |
| `rotateInterval` | `0 0 * * *` | Cron expression for time-based rotation (daily at midnight) |

### 6. Implement Health Checks and Auto-Restart

PM2 can automatically restart your application if it becomes unresponsive. Configure health check endpoints and PM2's restart policies for self-healing deployments.

```javascript
{
  min_uptime: "10s",        // Minimum uptime before considering the app "started"
  max_restarts: 10,         // Max unstable restarts in a row
  restart_delay: 3000,      // Delay between restarts (ms)
  autorestart: true,        // Auto-restart on crash (default)
  watch: false,             // Disable file watching in production
}
```

For application-level health checks, serve a dedicated endpoint:

```javascript
// health.js
app.get("/health", async (req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? "healthy" : "degraded",
    pid: process.pid,
    uptime: process.uptime(),
    memoryMB: Math.round(memoryUsage),
  });
});
```

### 7. Monitor with PM2's Built-in Tools and External Integrations

PM2 provides several tiers of monitoring depending on your observability requirements.

**Quick CLI monitoring:**
```bash
pm2 monit            # Real-time terminal dashboard (CPU, memory, logs)
pm2 status           # Process list with status
pm2 show <app>       # Detailed process info
pm2 prettylist       # Machine-readable JSON output
```

**Metrics aggregation with PM2.io (keymetrics):**
```bash
pm2 link <secret> <public>  # Connect to PM2.io dashboard
```

**Prometheus integration:** Expose PM2 metrics via `@pm2/io` and scrape them:
```javascript
const pm2 = require("@pm2/io");

const meter = pm2.meter({
  name: "req/min",
  type: "meter",
});

app.use((req, res, next) => {
  meter.mark();
  next();
});
```

### 8. Use Source Map Support for Error Tracking

When deploying transpiled code (TypeScript, Babel), configure PM2 to use source maps so stack traces point to original source lines rather than the compiled output.

```javascript
{
  source_map_support: true,
  force: true,  // Force enable even if NODE_OPTIONS is set
}
```

Combine this with a structured logging library (like `pino`) for actionable error output:

```javascript
const pino = require("pino");
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});
```

### 9. Enforce Memory Limits to Prevent OOM

Set `max_memory_restart` to automatically restart a process when it exceeds a memory threshold. This catches memory leaks before they trigger an OOM killer at the OS level.

```javascript
{
  max_memory_restart: "500M",  // Restart if heap exceeds 500MB
}
```

For Node.js-level heap limits, pass `--max-old-space-size` via `node_args`:
```javascript
{
  node_args: "--max-old-space-size=1024",
}
```

### 10. Secure the PM2 Daemon and API

PM2's daemon communicates over a Unix socket by default, but the built-in HTTP API should be secured in production.

```bash
# Disable the HTTP API entirely (recommended)
pm2 unconfig web

# Or bind it to localhost only with authentication
pm2 web --only-localhost
```

Ensure the PM2 daemon runs under a non-root user with limited privileges:

```bash
# Create a dedicated system user
sudo useradd --system --no-create-home pm2-user
sudo chown -R pm2-user:pm2-user /var/www/myapp
```

## Implementation Steps

### Step 1: Create the Ecosystem File

Start by creating a comprehensive ecosystem file that covers all environments. Place it in the project root and commit it to version control.

```bash
touch ecosystem.config.js
```

Write the base configuration with production-aware defaults:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "myapp",
      script: "dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      max_memory_restart: "1G",
      kill_timeout: 5000,
      listen_timeout: 3000,
      source_map_support: true,
      error_file: "./logs/error.log",
      out_file: "./logs/output.log",
      combine_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 4000,
        instances: 2,
      },
    },
  ],
};
```

### Step 2: Install PM2 and Log Rotation Globally

Install PM2 globally on the production server and set up log rotation as a PM2 module.

```bash
# Install PM2 globally
npm install -g pm2

# Install and configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

Save the PM2 process list so it resurrects on server reboot:

```bash
pm2 save
pm2 startup   # Generates a systemd/init script to auto-start PM2 on boot
```

### Step 3: Deploy the Application

Build and start the application with the production environment profile.

```bash
# Build the application
npm ci --omit=dev
npm run build

# Start with production configuration
pm2 start ecosystem.config.js --env production

# Verify everything is running
pm2 status
pm2 show myapp
```

### Step 4: Configure Zero-Downtime Reloads

For rolling updates without dropping requests, use `pm2 reload` instead of `pm2 restart`. Reload restarts workers one by one, waiting for each to finish in-flight requests before replacing it.

```bash
# Reload all workers one at a time (zero-downtime)
pm2 reload ecosystem.config.js --env production

# Or reload a specific app
pm2 reload myapp
```

To verify zero-downtime, run a continuous curl loop during a reload:

```bash
while true; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health; sleep 0.1; done
```

### Step 5: Set Up Systemd Integration for Boot Persistence

PM2's `startup` command generates a systemd service that starts the PM2 daemon on server boot.

```bash
# Generate and enable the startup script
pm2 startup systemd

# This prints a command to run with sudo, e.g.:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy

# Save the current process list
pm2 save
```

Verify the systemd service:

```bash
sudo systemctl status pm2-deploy  # or pm2-root depending on user
sudo systemctl enable pm2-deploy
```

### Step 6: Set Up Health Check Monitoring

Configure PM2 to restart your application if health checks fail by combining PM2's built-in restart policies with an external monitoring tool.

Create a simple health check script that PM2 can use externally:

```bash
#!/bin/bash
# healthcheck.sh
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$STATUS" != "200" ]; then
  echo "Health check failed with status $STATUS"
  exit 1
fi
echo "Health check passed"
exit 0
```

Integrate with system-level monitoring (e.g., Docker HEALTHCHECK or systemd timers):

```bash
# Add to crontab for periodic checks
*/5 * * * * /home/deploy/healthcheck.sh || pm2 restart myapp
```

### Step 7: Integrate with CI/CD Pipeline

Add PM2 deployment commands to your CI/CD pipeline. Below is a GitHub Actions example.

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci --omit=dev

      - name: Build
        run: npm run build

      - name: Deploy via rsync
        run: |
          rsync -avz --delete \
            --exclude node_modules \
            --exclude .git \
            ./ deploy@${{ secrets.HOST }}:/var/www/myapp/

      - name: Reload application
        run: |
          ssh deploy@${{ secrets.HOST }} "cd /var/www/myapp && \
            npm ci --omit=dev && \
            pm2 reload ecosystem.config.js --env production"
```

### Step 8: Set Up Alerting

Configure PM2.io or a third-party monitoring service to alert on process restart events and resource thresholds.

**With PM2.io (Keymetrics):**
```bash
pm2 link <SECRET_KEY> <PUBLIC_KEY>
```

Then configure alert rules in the PM2.io dashboard for:
- Process restart count exceeding a threshold in a time window
- CPU usage above 90% for more than 5 minutes
- Heap memory approaching the `max_memory_restart` limit

**With standalone Prometheus + Grafana:**

Add the `@pm2/io` agent and expose metrics:

```javascript
const io = require("@pm2/io");

// Expose custom metrics
const httpRequests = io.meter({ name: "http.requests", samples: 60 });
const activeConnections = io.gauge({ name: "http.connections" });

app.use((req, res, next) => {
  httpRequests.mark();
  activeConnections.set(server.connections());
  next();
});
```

Configure Prometheus to scrape the metrics endpoint that `@pm2/io` exposes, then build Grafana dashboards for real-time visibility.

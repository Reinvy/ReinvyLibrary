---
title: "Managing Node.js Applications with PM2"
description: "A comprehensive tutorial on using PM2 to manage, monitor, and deploy Node.js applications in production with process clustering, zero-downtime reloads, and advanced logging."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Managing Node.js Applications with PM2

## Summary

PM2 is a production-grade process manager for Node.js applications that keeps your services running, handles clustering for multi-core CPUs, provides zero-downtime deployments, and offers built-in monitoring and log management. This tutorial covers installation, configuration, process management, clustering, ecosystem files, deployment strategies, and monitoring — everything you need to run Node.js apps reliably in production.

## Target Audience

- Backend developers and DevOps engineers deploying Node.js applications.
- Developers who have used `node app.js` in development and want a production-ready solution.
- Intermediate level: familiarity with Node.js, npm, and basic Linux commands assumed.

## Prerequisites

- Node.js 16+ and npm installed.
- A simple Node.js application to test with (or create the example provided).
- Basic familiarity with the Linux command line.
- SSH access to a Linux server (for the deployment section).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Install PM2 and manage application processes (start, stop, restart, delete).
- Scale applications across all CPU cores using PM2's cluster mode.
- Create and maintain ecosystem configuration files.
- Perform zero-downtime reloads and graceful application shutdowns.
- Set up log rotation, monitoring dashboards, and startup hooks.
- Deploy applications programmatically and via keymetrics for remote monitoring.

## Context and Motivation

Running a Node.js application with `node app.js` works fine on your laptop, but in production the stakes are much higher. Your app needs to survive crashes, restart automatically, use all available CPU cores, handle traffic spikes without downtime, and provide visibility into its health. Manually implementing all of this is error-prone and wastes time that should go into building features.

PM2 solves these problems out of the box. It is the de facto standard process manager for Node.js in production, used by companies of all sizes because it is battle-tested, simple to configure, and packed with features. This tutorial gives you everything you need to go from `node app.js` to a robust, monitored, clustered production deployment.

## Core Content

### Installation

PM2 is distributed as an npm package and should be installed globally:

```bash
npm install -g pm2
```

Verify the installation:

```bash
pm2 --version
```

### Starting an Application

The simplest way to use PM2 is to start your application directly:

```bash
pm2 start app.js
```

PM2 assigns each process a **name** (derived from the filename) and an **ID** (auto-incremented). You can also specify a custom name:

```bash
pm2 start app.js --name my-api
```

### Managing Processes

PM2 provides intuitive commands for the full process lifecycle:

```bash
pm2 list                    # List all managed processes
pm2 stop my-api             # Stop a process (keeps it in the list)
pm2 restart my-api          # Restart a process
pm2 delete my-api           # Remove a process from PM2's list
pm2 start app.js --watch    # Auto-restart on file changes (dev mode)
```

The `pm2 list` command shows a table with each process's status, CPU/memory usage, uptime, and restart count.

### Understanding Process Statuses

| Status   | Description                                                                 |
|----------|-----------------------------------------------------------------------------|
| `online` | The process is running normally.                                            |
| `stopped`| The process has been stopped via `pm2 stop` but remains registered.         |
| `errored`| The process has crashed due to an unhandled error or exit code > 0.         |
| `launching`| The process is in the middle of starting up.                              |

PM2 automatically restarts any process that exits unexpectedly, based on the configured restart strategy.

### Cluster Mode

Node.js runs on a single thread by default, meaning it can only use one CPU core. In a multi-core server, this wastes resources. PM2's **cluster mode** spawns one worker process per CPU core and distributes incoming connections across them using the operating system's round-robin load balancer.

Start your app in cluster mode:

```bash
pm2 start app.js -i max
```

The `-i` flag specifies the number of instances:
- `max` — one instance per CPU core (recommended for most cases).
- `-i 2` — exactly 2 instances.
- `-i -1` — one less than the number of cores (leaves one core free).

Verify cluster mode:

```bash
pm2 list
# You'll see multiple processes with the same name, different IDs
```

### The Ecosystem File

Hard-coding flags on the command line is fragile. The **ecosystem file** (`ecosystem.config.js`) stores all your configuration in a version-controlled file:

```javascript
module.exports = {
  apps: [
    {
      name: 'my-api',
      script: 'app.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      }
    }
  ]
};
```

Start using the ecosystem file:

```bash
pm2 start ecosystem.config.js
# Or with a specific environment:
pm2 start ecosystem.config.js --env production
```

### Graceful Shutdown and Zero-Downtime Reload

When restarting an application, you want to avoid dropping in-flight requests. PM2 supports **graceful shutdown** — it sends a `SIGINT` or `SIGTERM` signal and waits for the process to close gracefully before starting the replacement.

In your application, listen for the shutdown signal:

```javascript
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  await server.close();       // Stop accepting new connections
  await db.disconnect();      // Close database connections
  process.exit(0);
});
```

Configure the ecosystem file for graceful shutdown:

```javascript
module.exports = {
  apps: [{
    name: 'my-api',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    kill_timeout: 5000,        // Wait 5s before forcing kill
    listen_timeout: 3000,      // Wait 3s before considering app ready
    shutdown_with_message: true
  }]
};
```

Perform a **zero-downtime reload**:

```bash
pm2 reload ecosystem.config.js
```

Unlike `pm2 restart`, which stops and starts each process one by one, `pm2 reload` restarts workers one at a time so the application remains available throughout the process. In cluster mode, this is truly zero-downtime.

### Log Management

PM2 captures stdout and stderr for each process automatically:

```bash
pm2 logs          # Tail all logs
pm2 logs my-api   # Tail logs for a specific process
pm2 logs --lines 100  # Show last 100 lines
```

By default, logs grow without bound. Install `pm2-logrotate` to manage log files:

```bash
pm2 install pm2-logrotate
```

Configure log rotation:

```bash
pm2 set pm2-logrotate:max_size 10M     # Rotate at 10MB
pm2 set pm2-logrotate:retain 7          # Keep 7 rotated files
pm2 set pm2-logrotate:compress true     # Gzip rotated files
pm2 set pm2-logrotate:interval '1d'     # Or rotate daily
```

### Startup Hooks

Ensure your PM2 processes restart automatically when the server reboots:

```bash
pm2 startup
```

This generates and installs a systemd (or equivalent) unit that launches PM2 at boot. Then save the current process list:

```bash
pm2 save
```

Now your application will survive server reboots without manual intervention.

### Monitoring and Metrics

PM2 provides several ways to monitor running processes.

Real-time terminal dashboard:

```bash
pm2 monit
```

This shows per-process CPU/memory usage, request metrics, and log output in a curses-style dashboard.

Programmatic monitoring via the PM2 API:

```javascript
const pm2 = require('pm2');

pm2.connect((err) => {
  if (err) throw err;
  pm2.list((err, list) => {
    list.forEach(proc => {
      console.log(`${proc.name}: CPU ${proc.monit.cpu}%, Memory ${(proc.monit.memory / 1024 / 1024).toFixed(1)}MB`);
    });
    pm2.disconnect();
  });
});
```

For advanced remote monitoring, PM2 offers **Keymetrics** — a SaaS dashboard for metrics, alerts, and deployment management across servers.

## Code Examples

### Example: Express Application with Graceful Shutdown

Create `app.js`:

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ status: 'ok', pid: process.pid });
});

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server started on port ${process.env.PORT || 3000} [PID: ${process.pid}]`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    console.log('Server closed. Exiting.');
    process.exit(0);
  });
});
```

### Example: Comprehensive Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'my-api',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '500M',
    kill_timeout: 5000,
    listen_timeout: 3000,
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### Example: Deployment Configuration

PM2 can also orchestrate deployments from your local machine to a remote server:

```javascript
module.exports = {
  apps: [{
    name: 'my-api',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    }
  }],
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/your-repo.git',
      path: '/var/www/my-api',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
```

Deploy with a single command:

```bash
pm2 deploy ecosystem.config.js production
```

## Key Insights

- **Always use `exec_mode: 'cluster'` and `instances: 'max'` in production** — it is the single most impactful performance improvement for multi-core servers.
- **Graceful shutdown is non-negotiable** — configure `SIGINT` handlers and `kill_timeout` in your ecosystem file to prevent dropped requests during deploys and restarts.
- **Run `pm2 startup` and `pm2 save` after every deploy** — without it, a server reboot means manual intervention to restart your application.
- **Use `pm2 reload` instead of `pm2 restart` in production** — reloads workers one at a time, giving you true zero-downtime updates.
- **PM2 log files can grow quickly and fill your disk** — always install `pm2-logrotate` and configure retention limits on production servers.
- **Monitor early, monitor often** — `pm2 monit` and the PM2 API give you real-time insight; don't wait for an outage to discover a memory leak or CPU spike.

## Next Steps

- Learn about **containerized deployments** with Docker and PM2 in the Dockerizing a Full-Stack Application tutorial.
- Explore **Keymetrics** (pm2.io) for multi-server dashboards, alerting, and metric history.
- Set up **CI/CD integration** — run `pm2 deploy` from your GitHub Actions or GitLab CI pipeline.
- Read the official PM2 documentation for advanced topics: [pm2.keymetrics.io/docs](https://pm2.keymetrics.io/docs)

## Conclusion

PM2 transforms a simple Node.js process into a robust, production-grade service. You have learned how to install PM2, manage processes, scale across CPU cores with cluster mode, configure ecosystem files, perform zero-downtime reloads with graceful shutdowns, manage logs, set up automatic startup, and monitor your applications. These skills are essential for any production Node.js deployment and will save you hours of manual process management and troubleshooting.

---
title: "PM2 Cheatsheet"
description: "A comprehensive quick reference for PM2 process manager — CLI commands, ecosystem file configuration, cluster mode, zero-downtime reloads, log management, and deployment strategies."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# PM2 Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Start an app | `pm2 start app.js` | Start a Node.js application with PM2 |
| Start with name | `pm2 start app.js --name myapi` | Assign a custom name to the process for easier management |
| List all processes | `pm2 list` (or `pm2 ls`, `pm2 status`) | Display all managed processes with status, uptime, and resource usage |
| Show process details | `pm2 show <id\|name>` | Display detailed metadata, logs path, and environment variables for a process |
| Stop a process | `pm2 stop <id\|name>` | Gracefully stop a process (SIGINT) |
| Stop all processes | `pm2 stop all` | Stop every process under PM2 management |
| Restart a process | `pm2 restart <id\|name>` | Hard restart (stop then start) |
| Reload (zero-downtime) | `pm2 reload <id\|name>` | Graceful reload with zero downtime — restarts workers one by one |
| Delete a process | `pm2 delete <id\|name>` | Remove a process from PM2's process list |
| Delete all processes | `pm2 delete all` | Remove all processes from PM2 |
| Start in cluster mode | `pm2 start app.js -i max` | Fork one process per CPU core (`max` = all cores) |
| Scale cluster instances | `pm2 scale <name> <N>` | Dynamically scale a clustered app to N instances |
| View logs | `pm2 logs` | Display all logs in streaming mode |
| View app logs only | `pm2 logs <name>` | Stream logs for a specific application only |
| View last N lines | `pm2 logs --lines 200` | Show the last N lines of logs without streaming |
| Flush all logs | `pm2 flush` | Clear all log files |
| Monitor dashboard | `pm2 monit` | Real-time terminal dashboard for CPU, memory, and request metrics |
| Save process list | `pm2 save` | Snapshot the current process list for resurrection on reboot |
| Restore saved list | `pm2 resurrect` | Restart all processes from the last saved snapshot |
| Generate startup script | `pm2 startup` | Generate and configure an init script to auto-start PM2 on system boot |
| Kill PM2 daemon | `pm2 kill` | Shut down the PM2 daemon entirely |
| Update PM2 | `pm2 updatePM2` | Update in-memory PM2 after a global npm upgrade |
| Show CPU/memory metrics | `pm2 prettylist` | Output a structured JSON with detailed metrics for all processes |

## Common Commands

### Process Management

```bash
# Start an application with custom name and watch mode
pm2 start server.js --name api-server --watch

# Start with different interpreter (e.g., ts-node for TypeScript)
pm2 start server.ts --interpreter ts-node

# Start with environment variables inline
pm2 start app.js --env production --node-args="--max-old-space-size=512"

# Stop, restart, delete
pm2 stop api-server
pm2 restart api-server
pm2 delete api-server

# Describe a process in detail
pm2 describe api-server

# Send a custom signal to a process
pm2 sendSignal SIGUSR2 api-server
```

### Cluster Mode

```bash
# Start with 4 instances
pm2 start app.js -i 4

# Start with one instance per CPU (auto-detect cores)
pm2 start app.js -i max

# Scale to a specific number of instances
pm2 scale api-server 6

# Reload cluster gracefully (zero-downtime)
pm2 reload all

# Graceful reload specific app
pm2 reload api-server
```

### Ecosystem File

```bash
# Generate a template ecosystem file
pm2 init

# Start using an ecosystem file
pm2 start ecosystem.config.js

# Start with specific environment
pm2 start ecosystem.config.js --env production

# Stop all apps defined in ecosystem file
pm2 stop ecosystem.config.js

# Delete all apps defined in ecosystem file
pm2 delete ecosystem.config.js
```

### Log Management

```bash
# Tail logs with timestamp
pm2 logs --timestamp

# Merge logs from all instances of a clustered app
pm2 logs api-server --merge-logs

# Output logs in JSON format for programmatic consumption
pm2 logs --json

# View error logs only
pm2 logs --err

# Set custom log path for a process
pm2 start app.js --log /var/log/myapp/app.log \
  --output /var/log/myapp/out.log \
  --error /var/log/myapp/err.log

# Rotate logs (requires pm2-logrotate module)
pm2 install pm2-logrotate
```

### Startup & Init System

```bash
# Generate systemd startup script
pm2 startup systemd

# Save current process list so it resurrects on boot
pm2 save

# The startup command outputs a command to run as root:
#   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy

# Disable startup on boot
pm2 unstartup systemd

# Check if startup is configured
pm2 startup status
```

### Monitoring & Metrics

```bash
# Launch terminal dashboard
pm2 monit

# List with extended metrics
pm2 list

# Show CPU and memory usage for each process
pm2 prettylist

# Enable Keymetrics / PM2 Plus remote monitoring
pm2 link <secret> <public>

# Open the web dashboard
pm2 open

# Display process metrics in JSON
pm2 jlist

# Show memory usage by process
pm2 describe api-server | grep "memory"
```

### Advanced Operations

```bash
# Graceful shutdown: send SIGINT, then SIGKILL after timeout
pm2 start app.js --kill-timeout 5000

# Max memory restart: auto-restart when exceeding limit
pm2 start app.js --max-memory-restart 500M

# Disable auto-restart on crash
pm2 start app.js --no-autorestart

# Restart delay (ms) between automatic restarts
pm2 start app.js --restart-delay 3000

# Watch source directory for changes
pm2 start app.js --watch --watch-ignore="node_modules"

# Merge logs from all cluster instances into one stream
pm2 start app.js -i max --merge-logs

# Use a specific PM2 configuration file location
pm2 start /etc/pm2/ecosystem.config.js
```

## Code Snippets

### Basic Ecosystem File

```javascript
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      max_memory_restart: '500M',
      kill_timeout: 5000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true
    }
  ]
};
```

### Ecosystem File with Multiple Apps

```javascript
module.exports = {
  apps: [
    {
      name: 'web',
      script: './dist/web.js',
      instances: 2,
      env_production: {
        PORT: 3000
      }
    },
    {
      name: 'worker',
      script: './dist/worker.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        QUEUE_CONCURRENCY: 5
      }
    },
    {
      name: 'scheduler',
      script: './dist/cron.js',
      cron_restart: '0 3 * * *',
      autorestart: false,
      exec_mode: 'fork'
    }
  ]
};
```

### Graceful Shutdown in Application Code

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello from PM2-managed app!');
});

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening on port ${process.env.PORT || 3000}`);
});

// Listen for PM2's graceful shutdown signal
process.on('SIGINT', () => {
  console.log('Received SIGINT — shutting down gracefully...');
  server.close(() => {
    // Close database connections, clean up resources
    console.log('Server closed. Exiting.');
    process.exit(0);
  });

  // Force shutdown if graceful close takes too long
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
});
```

### PM2 Deployment Configuration

```javascript
module.exports = {
  apps: [{
    name: 'api-server',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster'
  }],
  deploy: {
    production: {
      user: 'deploy',
      host: ['api1.example.com', 'api2.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:org/myapp.git',
      path: '/var/www/myapp',
      'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/www/myapp',
      ssh_options: 'StrictHostKeyChecking=no'
    },
    staging: {
      user: 'deploy',
      host: 'staging.example.com',
      ref: 'origin/develop',
      repo: 'git@github.com:org/myapp.git',
      path: '/var/www/myapp-staging',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};
```

### PM2 Log Rotation with pm2-logrotate

```bash
# Install the log rotation module
pm2 install pm2-logrotate

# Configure rotation interval and retention
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 60
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# View current configuration
pm2 conf pm2-logrotate
```

### PM2 API for Programmatic Usage

```javascript
const pm2 = require('pm2');

pm2.connect((err) => {
  if (err) {
    console.error('Failed to connect to PM2 daemon:', err);
    process.exit(1);
  }

  pm2.start({
    name: 'my-app',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: { PORT: 3000 }
  }, (err, apps) => {
    if (err) {
      console.error('Failed to start app:', err);
      pm2.disconnect();
      return;
    }
    console.log('App started:', apps.map(a => a.name));

    // List all processes
    pm2.list((err, list) => {
      console.log('Running processes:', list.length);
      list.forEach(proc => {
        console.log(`- ${proc.name}: ${proc.pm2_env.status}`);
      });
      pm2.disconnect();
    });
  });
});
```

### Source Map Support for Production

```javascript
// In ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api-server',
    script: './dist/server.js',
    // Enable source maps for meaningful stack traces
    source_map_support: true,
    // Increase memory for source map processing if needed
    node_args: '--enable-source-maps'
  }]
};
```

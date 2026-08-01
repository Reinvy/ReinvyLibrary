---
title: "PM2 in Docker Containers Cheatsheet"
description: "A quick reference for running PM2 inside Docker containers — the pm2-runtime entrypoint, PID 1 semantics, signal forwarding, stdout logging, health checks, and restart policies."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# PM2 in Docker Containers Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Run PM2 as container entrypoint | `pm2-runtime start app.js` | Container-native PM2: stays in the foreground, forwards signals, and reaps zombie processes |
| Run classic PM2 in foreground | `pm2 start app.js --no-daemon` | Alternative when your image already has a separate init process (for example, tini) |
| Start from an ecosystem file | `pm2-runtime start ecosystem.config.js` | Container entrypoint with the full ecosystem configuration |
| Install PM2 in an image | `RUN npm install -g pm2@5` | Dockerfile step; pin a major version for reproducible builds |
| Set the container command | `CMD ["pm2-runtime", "start", "ecosystem.config.js"]` | Exec-form CMD so PM2 receives signals directly instead of through a shell |
| View container logs | `docker logs <container>` | pm2-runtime pipes application logs to stdout/stderr automatically |
| Inspect processes at runtime | `docker exec -it <container> pm2 list` | Debug the PM2 state without entering an interactive shell |
| Stop a container gracefully | `docker stop -t 15 <container>` | Give PM2 time to drain connections before Docker sends SIGKILL |
| Restart on failure | `docker run --restart unless-stopped ...` | Docker-level restart policy replaces `pm2 startup` plus `pm2 save` in containers |
| Add a health check | `HEALTHCHECK CMD node healthcheck.js` | Dockerfile instruction for liveness and readiness probing |
| Scale cluster instances | `pm2-runtime start app.js -i 4` | An explicit instance count is more predictable than `max` inside containers |
| Reap orphaned children | (built into pm2-runtime) | PM2 running as PID 1 cleans up zombie processes left by crashed children |

## Common Commands

### Dockerfile: Installing PM2

```dockerfile
FROM node:20-slim

WORKDIR /app

# Install PM2 globally and pin the major version for reproducible images
RUN npm install -g pm2@5

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# pm2-runtime keeps PM2 in the foreground and forwards signals to the app
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
```

### Dockerfile: Classic PM2 with an Init Process

```dockerfile
FROM node:20-slim

# tini acts as PID 1; PM2 runs as a regular child process in the foreground
RUN apt-get update && apt-get install -y tini \
    && npm install -g pm2@5

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["pm2", "start", "ecosystem.config.js", "--no-daemon"]
```

### Running with pm2-runtime

```bash
# Foreground mode with automatic signal forwarding
pm2-runtime start server.js

# With an ecosystem file (recommended for multi-app container images)
pm2-runtime start ecosystem.config.js

# Cluster mode inside the container
pm2-runtime start app.js -i 4

# Pass environment variables from the host or orchestrator at runtime
docker run -e NODE_ENV=production -e PORT=8080 myapp-image
```

### Logging: Making docker logs Work

```bash
# pm2-runtime already sends logs to stdout/stderr, so no extra config is needed
docker logs -f myapp-container

# View the last N lines without streaming
docker logs --tail 200 myapp-container

# Follow logs from inside the container (classic PM2 mode)
docker exec -it myapp-container pm2 logs --lines 100

# Stream only error output
docker logs myapp-container 2>&1 | grep -i error
```

### Health Checks and Restart Policies

```bash
# Container-level restart replaces pm2 startup and pm2 save inside Docker
docker run -d --restart unless-stopped --name api myapp-image

# Verify the restart policy of a running container
docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' api

# Run a one-off health probe against the running container
docker exec -it api node healthcheck.js && echo "healthy"
```

### Debugging Inside a Container

```bash
# List all processes managed by PM2
docker exec -it myapp-container pm2 list

# Show detailed metadata for a single application
docker exec -it myapp-container pm2 show api

# Stream application logs
docker exec -it myapp-container pm2 logs --lines 200

# Open a shell inside the running container for deeper inspection
docker exec -it myapp-container sh
```

### Graceful Stops and Signal Forwarding

```bash
# Stop with a 15-second grace period before Docker escalates to SIGKILL
docker stop -t 15 myapp-container

# pm2-runtime forwards SIGTERM/SIGINT to the application and waits for the
# app's shutdown handler to finish before the container exits

# Force-kill immediately (use only as a last resort)
docker kill myapp-container
```

## Code Snippets

### Minimal Dockerfile with pm2-runtime

```dockerfile
FROM node:20-slim

WORKDIR /app

RUN npm install -g pm2@5

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["pm2-runtime", "start", "ecosystem.config.js"]
```

### Ecosystem File for a Container Image

```javascript
module.exports = {
  apps: [
    {
      name: 'api',
      script: './dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      // pm2-runtime merges logs to stdout/stderr automatically
      merge_logs: true,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'worker',
      script: './dist/worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true
    }
  ]
};
```

### Dockerfile with Healthcheck and Non-Root User

```dockerfile
FROM node:20-slim

RUN npm install -g pm2@5

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Run as a non-root user for defense in depth
RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["pm2-runtime", "start", "ecosystem.config.js"]
```

### docker-compose.yml with Restart Policy and Healthcheck

```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 5s
      retries: 3
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### Graceful Shutdown Handler for SIGTERM

```javascript
const express = require('express');
const app = express();

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`API listening on port ${process.env.PORT || 3000}`);
});

// pm2-runtime forwards SIGTERM to the app when the container stops
process.on('SIGTERM', () => {
  console.log('SIGTERM received — draining connections...');
  server.close(() => {
    console.log('Server closed, exiting cleanly.');
    process.exit(0);
  });
  // Safety net if draining takes too long
  setTimeout(() => process.exit(1), 10000).unref();
});
```

### Simple Healthcheck Script

```javascript
// healthcheck.js — exits with code 0 when the application is healthy
const http = require('http');

const req = http.get(
  { host: '127.0.0.1', port: process.env.PORT || 3000, path: '/health' },
  (res) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('healthy');
      process.exit(0);
    }
    process.exit(1);
  }
);

req.on('error', () => process.exit(1));
req.setTimeout(3000, () => process.exit(1));
```

### Injecting Configuration Without Rebuilding the Image

```bash
# Pass secrets and configuration at runtime; never bake them into the image
docker run -d --name api \
  -e DATABASE_URL='postgres://user:pass@db:5432/app' \
  -e API_KEY='secret-value' \
  --restart unless-stopped \
  myapp-image
```

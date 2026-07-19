---
title: "PM2 Development Workflows and Local Development Guide"
description: "A comprehensive guide to using PM2 effectively in local development environments — watch mode, hot reloading patterns, debugger integration, environment management, and development-focused ecosystem configurations."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# PM2 Development Workflows and Local Development Guide

## Introduction

PM2 is widely recognized as the go-to process manager for Node.js applications in production, but its capabilities in local development are often overlooked. During development, you face a different set of challenges than in production: you need rapid feedback cycles, automatic reload on file changes, seamless debugger attachment, and the ability to switch between environment configurations without manual intervention. PM2 provides a rich set of features tailored for exactly these workflows — from built-in watch mode and graceful reload signals to programmatic API access and integration with Docker Compose.

This guide consolidates battle-tested patterns for using PM2 in local development environments. You will learn how to configure ecosystem files for development, leverage PM2's watch and ignore-watch rules for efficient file monitoring, integrate with Node.js inspector for step-through debugging, manage multi-service monorepos with a single PM2 instance, and set up development containers with PM2 inside Docker. By the end, you will have a development setup that mirrors your production configuration closely enough to eliminate environment surprises, yet remains fast, flexible, and developer-friendly.

## Best Practices

### 1. Use Separate Ecosystem Files for Development and Production

Maintaining distinct ecosystem configurations for each environment prevents development settings (like watch mode and file logging) from leaking into production. Create a dedicated `ecosystem.dev.config.js` alongside your production `ecosystem.config.js`.

```javascript
// ecosystem.dev.config.js
module.exports = {
  apps: [
    {
      name: "api",
      script: "src/server.js",
      watch: true,
      ignore_watch: ["node_modules", "coverage", ".git", "dist"],
      watch_options: {
        followSymlinks: false,
      },
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        LOG_LEVEL: "debug",
      },
      node_args: "--inspect=9229",
    },
  ],
};
```

Run the development configuration explicitly:

```bash
pm2 start ecosystem.dev.config.js
pm2 logs api --lines 50
```

### 2. Leverage Watch Mode with Smart Ignore Rules

PM2's `watch` option automatically restarts your application when files change. The key to an efficient watch setup is a carefully curated `ignore_watch` list that excludes non-source directories. Without this, PM2 can restart your app dozens of times during a single `npm install`.

```javascript
// Optimal watch configuration for Node.js projects
{
  watch: true,
  ignore_watch: [
    "node_modules",
    "coverage",
    ".git",
    "dist",         // Don't restart when build output changes
    "build",
    "logs",
    "tmp",
    ".nyc_output",
    "*.log",
    "Dockerfile",
    "docker-compose*.yml",
  ],
  watch_options: {
    usePolling: false,       // Use native file system events (faster)
    interval: 1000,          // Polling interval ms (only relevant for network fs)
  },
}
```

For monorepo setups where your application depends on sibling packages, extend the watch scope to include linked directories:

```javascript
{
  watch: ["src", "../shared-lib/src"],
  ignore_watch: ["node_modules", "../shared-lib/node_modules"],
}
```

### 3. Integrate the Node.js Debugger with PM2

PM2 supports passing Node.js CLI flags through the `node_args` configuration, which means you can enable the built-in inspector directly from your ecosystem file. This allows you to attach VS Code, Chrome DevTools, or any other debugger to a PM2-managed process.

```javascript
// Enable inspector on a custom port for development
{
  node_args: "--inspect=0.0.0.0:9229",
}
```

Combine this with PM2's `--only` flag to start a specific app in debug mode while leaving others running normally:

```bash
# Start only the API service with debugger attached
pm2 start ecosystem.dev.config.js --only api

# Start all services but restart the worker in debug mode
pm2 delete worker
pm2 start ecosystem.dev.config.js --only worker --node-args "--inspect=9230"
```

For VS Code integration, add a launch configuration to your `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to PM2 API",
      "port": 9229,
      "restart": true,
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app"
    }
  ]
}
```

### 4. Configure Graceful Shutdown with Development-Friendly Timeouts

Graceful shutdown is critical in production for draining in-flight requests, but in development you often want faster restart cycles. Configure separate kill and listen timeouts for development to keep the iteration loop snappy while still practicing proper cleanup.

```javascript
{
  // Development: shorter timeouts for faster iteration
  kill_timeout: 2000,        // Wait 2 seconds for graceful shutdown
  listen_timeout: 2000,      // Wait 2 seconds for app to listen
  shutdown_with_message: true, // Send custom shutdown message
}
```

Implement a signal handler in your application that performs cleanup but exits quickly:

```javascript
// server.js
const server = require("http").createServer(app);

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await server.close();
  // In development, skip database disconnection for speed
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM — shutting down...");
  await server.close();
  process.exit(0);
});

server.listen(3000);
```

### 5. Manage Environment Variables with `.env` Files and Ecosystem Overrides

Store environment-specific variables in `.env` files and reference them in your ecosystem configuration using PM2's `env_file` option. This keeps secrets out of version control while maintaining a clean separation between environments.

```bash
# .env.development
DATABASE_URL=postgres://localhost:5432/myapp_dev
REDIS_URL=redis://localhost:6379
API_KEY=dev-key-12345
LOG_LEVEL=debug
```

```javascript
// ecosystem.dev.config.js
module.exports = {
  apps: [
    {
      name: "api",
      script: "src/server.js",
      env_file: ".env.development",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
    },
    {
      name: "worker",
      script: "src/worker.js",
      env_file: ".env.development",
      env: {
        NODE_ENV: "development",
        QUEUE_CONCURRENCY: 2,
      },
    },
  ],
};
```

PM2 loads variables in this order (later overrides earlier): default `env` block → `env_file` → environment-specific `env_*` block → shell environment variables. Use this precedence to layer configuration predictably.

### 6. Structure Development Logging for Readability

In production, you typically use structured JSON logging (with Pino or Bunyan) for machine parsing. In development, prioritize human readability with formatted output and colored log levels.

```javascript
// ecosystem.dev.config.js — development logging
{
  output: "./logs/dev-out.log",
  error: "./logs/dev-err.log",
  log_date_format: "HH:mm:ss.SSS",
  merge_logs: true,         // Merge stdout and stderr streams
}
```

Pipe PM2 logs through a formatter for enhanced readability:

```bash
# Watch logs with timestamps and colorized output
pm2 logs api --format --raw | npx pino-pretty --colorize

# Follow multiple services with labels
pm2 logs --nostream
pm2 prettylog api worker scheduler
```

### 7. Use PM2 for Monorepo Service Orchestration

When working with a monorepo containing multiple services (API server, background worker, WebSocket gateway, cron jobs), PM2's multi-app ecosystem file provides a single command to start, stop, and monitor all services simultaneously. This is a significant productivity improvement over managing separate terminals or tmux panes.

```javascript
// ecosystem.dev.config.js — monorepo orchestration
const path = require("path");

module.exports = {
  apps: [
    {
      name: "api-gateway",
      cwd: "./packages/gateway",
      script: "src/index.js",
      watch: ["./packages/gateway/src"],
      env: { PORT: 3000, NODE_ENV: "development" },
    },
    {
      name: "user-service",
      cwd: "./packages/user-service",
      script: "src/index.js",
      watch: ["./packages/user-service/src"],
      env: { PORT: 3001, DATABASE_URL: "postgres://localhost:5432/users" },
    },
    {
      name: "worker",
      cwd: "./packages/worker",
      script: "src/index.js",
      watch: ["./packages/worker/src"],
      env: { QUEUE_CONCURRENCY: 2, NODE_ENV: "development" },
    },
    {
      name: "scheduler",
      cwd: "./packages/scheduler",
      script: "src/index.js",
      watch: ["./packages/scheduler/src"],
      env: { CRON_INTERVAL: "*/5 * * * *" },
    },
  ],
};
```

Start all services with a single command:

```bash
pm2 start ecosystem.dev.config.js
pm2 status   # Shows all 4 services with individual status
```

### 8. Pair PM2 with Docker Compose for Consistent Local Environments

Docker Compose provides infrastructure services (PostgreSQL, Redis, RabbitMQ) while PM2 manages your Node.js application processes. This separation keeps application concerns within PM2's domain and infrastructure within Docker's domain.

```yaml
# docker-compose.dev.yml
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp_dev
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
      - "9229:9229"
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis
    command: npx pm2 start ecosystem.dev.config.js --no-daemon

volumes:
  pgdata:
```

Inside the development Dockerfile, install PM2 globally and ensure the entrypoint starts PM2 in the foreground:

```dockerfile
# Dockerfile.dev
FROM node:20-slim

WORKDIR /app

RUN npm install -g pm2

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000 9229

CMD ["npx", "pm2-runtime", "start", "ecosystem.dev.config.js"]
```

### 9. Test PM2 Configurations Before Deploying to Production

PM2 provides commands to validate your ecosystem files and simulate configuration without actually starting processes. Use these in your local workflow to catch syntax errors and configuration drift before they reach production.

```bash
# Validate ecosystem file syntax
pm2 ecosystem --validate ecosystem.config.js

# Dry-run: display what PM2 would do without starting anything
pm2 start ecosystem.config.js --dry-run

# Show effective resolved configuration
pm2 show api --format json
```

For automated testing, use PM2's programmatic API within your test suite:

```javascript
// tests/pm2-config.test.js
const pm2 = require("pm2");

describe("PM2 ecosystem configuration", () => {
  beforeAll((done) => {
    pm2.connect((err) => {
      if (err) return done(err);
      pm2.start("./ecosystem.dev.config.js", done);
    });
  });

  afterAll((done) => {
    pm2.stop("api", () => {
      pm2.disconnect(done);
    });
  });

  test("API service starts and responds", async () => {
    const proc = await new Promise((resolve) => {
      pm2.describe("api", (err, list) => resolve(list[0]));
    });
    expect(proc).toBeDefined();
    expect(proc.pm2_env.status).toBe("online");
  });

  test("Worker service is registered", async () => {
    const proc = await new Promise((resolve) => {
      pm2.describe("worker", (err, list) => resolve(list[0]));
    });
    expect(proc.pm2_env.name).toBe("worker");
  });
});
```

### 10. Use PM2's Max Memory Restart as a Development Safety Net

Memory leaks can be introduced during development and go unnoticed until they cause production incidents. Set a conservative `max_memory_restart` limit in your development configuration to catch leaks early in the development cycle.

```javascript
{
  // Development: tighter memory limit for early leak detection
  max_memory_restart: "300M",
}
```

Combine this with heap dump generation on restart to capture memory profiles for analysis:

```bash
# Generate heap dump before PM2 restarts the process
pm2 trigger api heapdump
```

## Implementation Steps

### Step 1: Set Up a Development Ecosystem File

Create a development-specific ecosystem file in your project root:

```bash
touch ecosystem.dev.config.js
```

Write a baseline configuration with watch mode enabled and development-appropriate settings:

```javascript
// ecosystem.dev.config.js
module.exports = {
  apps: [
    {
      name: "app",
      script: "src/index.js",
      watch: true,
      ignore_watch: ["node_modules", ".git", "coverage", "logs", "dist"],
      watch_options: {
        followSymlinks: false,
      },
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        LOG_LEVEL: "debug",
      },
      node_args: "--inspect=9229",
      kill_timeout: 2000,
      listen_timeout: 2000,
      max_memory_restart: "300M",
    },
  ],
};
```

### Step 2: Configure a Local Linter and Formatter Hook

PM2's watch mode restarts your app when files change. Pair it with a file watcher that lints and formats your code before PM2 picks up the changes, preventing restart loops from broken syntax:

```bash
# Install onchange for file-watching linting
npm install --save-dev onchange

# In package.json scripts
{
  "dev": "pm2 start ecosystem.dev.config.js && onchange 'src/**/*.js' -- npx eslint --fix {{changed}}"
}
```

### Step 3: Start the Development Environment

Launch the development configuration and verify all processes are running:

```bash
# Start with development configuration
pm2 start ecosystem.dev.config.js

# Verify all processes are online
pm2 status

# Watch the logs in real time
pm2 logs app --format

# Access the running process output
pm2 show app
```

### Step 4: Debug an Application with Inspector

Attach the Node.js debugger to your PM2-managed process:

```bash
# Ensure the process started with --inspect
pm2 show app | grep "inspect"

# Verify the inspector is available
curl -s http://localhost:9229/json/list | python3 -m json.tool
```

Open `chrome://inspect` in Chrome or configure VS Code's attach configuration to connect to port 9229. Set breakpoints in your source code and trigger the relevant code path — PM2 will pause execution at the breakpoint while continuing to manage the process lifecycle.

### Step 5: Simulate Configuration Testing Before Deployment

Run validation checks on your ecosystem configuration to ensure it is syntactically correct and matches expected behavior:

```bash
# Check for syntax errors in the ecosystem file
node -e "require('./ecosystem.dev.config.js')"

# Dry-run the start to see resolved values
pm2 start ecosystem.dev.config.js --dry-run

# Verify the process restarts on file changes
echo "// test" >> src/index.js
sleep 2
pm2 status | grep "restart"
```

### Step 6: Transition Between Development and Production

When moving from development to production deployment, swap the ecosystem file and disable development-specific settings:

```bash
# Stop the development instance
pm2 delete ecosystem.dev.config.js

# Start the production configuration
pm2 start ecosystem.config.js --env production

# Verify the switch
pm2 status
```

Use PM2's `--env` flag to select the environment block without changing the configuration file:

```bash
# Start with staging environment overrides
pm2 start ecosystem.dev.config.js --env staging

# Override specific values via CLI
pm2 start ecosystem.dev.config.js --env production --node-args ""
```

This approach keeps your development ecosystem file as the single source of truth while allowing environment-specific overrides through PM2's layered configuration system.

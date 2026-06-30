---
title: "PM2 Process Management Syllabus"
description: "A comprehensive 12-week curriculum covering PM2 process management for Node.js applications — from basic process lifecycle to cluster mode, deployment strategies, monitoring, and production operations."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# PM2 Process Management Syllabus

## Overview

This 12-week curriculum is designed for Node.js developers who want to master PM2 as a production-grade process manager. Starting from fundamental process lifecycle management, the course progresses through cluster mode and load balancing, ecosystem file configuration, zero-downtime deployments, log management, monitoring and metrics, and finally production operations at scale. Each module combines conceptual learning with hands-on exercises, culminating in a capstone project where learners build and deploy a complete multi-service Node.js application managed entirely through PM2.

## Curriculum

### Module 1: Introduction to PM2 and Process Management
- **Understanding process managers**: why Node.js applications need process managers in production
  - Single-thread limitations and crash recovery
  - Comparison: PM2 vs forever vs nodemon vs systemd
- **PM2 installation and setup**
  - Global npm installation (`npm install -g pm2`)
  - Verifying installation and version
  - PM2 daemon lifecycle (`pm2 startup`, `pm2 save`, `pm2 resurrect`)
- **Basic process lifecycle**
  - Starting applications with `pm2 start`
  - Stopping, restarting, and deleting processes
  - Listing managed processes with `pm2 list`
  - Displaying process details with `pm2 show`
- **Hands-on lab**: Install PM2, start a simple Express application, and practice lifecycle commands

### Module 2: Process Management Fundamentals
- **Process naming and identification**
  - Named processes vs auto-generated names
  - Using `--name` flag for meaningful identifiers
  - Process IDs and their lifecycle
- **Application states and transitions**
  - Understanding states: online, stopping, stopped, launching, errored, one-launch-status
  - State transition diagram and event hooks
  - Handling crashed processes with auto-restart
- **Process logs and output**
  - Viewing logs with `pm2 logs`
  - Following logs with `--lines` and `--raw` flags
  - Flushing and reloading log streams
  - Structured JSON log output
- **Hands-on lab**: Implement a logging-heavy application and practice log inspection workflows

### Module 3: Ecosystem File Configuration
- **ecosystem.config.js structure**
  - Module exports and app array
  - Per-application configuration objects
  - Common properties: name, script, args, interpreter
- **Environment-specific configuration**
  - `env` and `env_*` blocks for development, staging, production
  - Environment variable injection and overriding
  - NODE_ENV management across environments
- **Advanced ecosystem file patterns**
  - Multiple application definitions in one file
  - Application dependencies and ordering (`wait_ready`, `listen_timeout`)
  - Instance variables and dynamic configuration
- **Hands-on lab**: Create an ecosystem file for a multi-service Node.js application with dev/staging/production environments

### Module 4: Cluster Mode and Load Balancing
- **Understanding Node.js cluster module**
  - How Node.js cluster works internally
  - Master-worker architecture
  - Round-robin vs shared socket balancing
- **PM2 cluster mode**
  - Enabling cluster mode with `-i` flag
  - Setting instance count: max, specific number, or auto
  - Zero-downtime reloads with `pm2 reload`
- **Load balancing strategies**
  - PM2 built-in round-robin load balancer
  - External load balancing with Nginx
  - Session affinity considerations
- **Hands-on lab**: Deploy an Express application in cluster mode, test load distribution, and measure performance improvements

### Module 5: Graceful Shutdown and Zero-Downtime Deployments
- **Graceful shutdown lifecycle**
  - Signal handling: SIGINT, SIGTERM, SIGQUIT
  - Implementing `process.on('SIGINT')` handlers
  - Draining connections and closing resources
- **PM2 graceful shutdown configuration**
  - `kill_timeout` setting
  - `listen_timeout` and `wait_ready` patterns
  - `shutdown_with_message` for custom protocols
- **Zero-downtime reload workflow**
  - How `pm2 reload` differs from `pm2 restart`
  - Rolling restart strategy in cluster mode
  - Health check gating between worker replacement
- **Hands-on lab**: Implement graceful shutdown in an Express application and verify zero-downtime reload with concurrent HTTP requests

### Module 6: Log Management and Rotation
- **PM2 built-in log management**
  - Log file locations and naming conventions
  - Console output vs error output separation
  - Timestamp formatting and custom formats
- **pm2-logrotate plugin**
  - Installation and configuration of pm2-logrotate
  - Rotation policies: max size, retention count, compression
  - Date-based vs size-based rotation
- **Structured logging integration**
  - Winston/Pino log forwarding to PM2
  - Centralized log aggregation with ELK/Loki
  - JSON log parsing and querying
- **Hands-on lab**: Configure pm2-logrotate with production rotation policies and forward logs to a centralized aggregator

### Module 7: Monitoring and Metrics
- **Built-in monitoring tools**
  - `pm2 monit` real-time dashboard
  - CPU and memory usage per process
  - Event loop latency and garbage collection metrics
- **pm2-plus and Keymetrics**
  - Setting up PM2 Plus dashboard
  - Custom metrics and business transactions
  - Alerting and notification configuration
- **Third-party monitoring integration**
  - Prometheus metrics export via `pm2-prometheus-exporter`
  - Grafana dashboards for PM2 metrics
  - APM integration with Sentry, New Relic, Datadog
- **Hands-on lab**: Set up a monitoring stack with PM2 Plus metrics, Prometheus export, and a Grafana dashboard

### Module 8: Deployment Strategies
- **Basic deployment with pm2 deploy**
  - ecosystem file deployment configuration
  - SSH-based deployment workflows
  - Pre-deployment and post-deployment hooks
- **CI/CD integration**
  - PM2 in GitHub Actions pipelines
  - PM2 in GitLab CI, Jenkins, and CircleCI
  - Rolling deployments in CI/CD environments
- **Docker and PM2**
  - Running PM2 inside Docker containers
  - PM2 vs Docker restart policies
  - Multi-stage Docker builds with PM2
- **Hands-on lab**: Implement a complete CI/CD pipeline that deploys a Node.js application via PM2 to a staging server

### Module 9: Source Map and Error Handling
- **Source map support in PM2**
  - Enabling source maps for transpiled code (TypeScript, Babel)
  - `--source-map-support` flag
  - Interpreting stack traces with source maps
- **Error handling and crash recovery**
  - Custom error handlers and uncaught exception management
  - PM2 `--max-restarts` and `--min-uptime` configuration
  - Exponential backoff for crash loops
- **Notification and alerting**
  - Error webhook integration
  - Slack/email notifications on crash events
  - Custom notification scripts with PM2 event bus
- **Hands-on lab**: Configure source maps for a TypeScript application and set up crash notification alerts

### Module 10: Startup Hooks and System Integration
- **Startup script generation**
  - `pm2 startup` for init system integration
  - systemd service file generation
  - Upstart and launchd support
- **PM2 as a systemd service**
  - Inspecting the generated systemd unit file
  - Customizing systemd service parameters
  - Journald log integration
- **PM2 save and resurrect**
  - Process list persistence with `pm2 save`
  - Automatic resurrection on boot
  - Managing multiple dump files
- **Hands-on lab**: Configure PM2 as a systemd service on a Linux server with automatic startup on boot

### Module 11: Performance Tuning and Resource Management
- **CPU and memory profiling**
  - Using `pm2 prettylist` for deep inspection
  - Memory leak detection patterns
  - CPU profiling with built-in Node.js tools
- **Resource limits in PM2**
  - `max_memory_restart` policy
  - `--node-args` for V8 garbage collection tuning
  - Cgroup integration for containerized environments
- **Performance benchmarking**
  - Load testing with autocannon and wrk
  - Identifying bottlenecks with PM2 metrics
  - Cluster mode sizing and optimization
- **Hands-on lab**: Profile a memory-leaking application, set up auto-restart policies, and benchmark cluster mode performance

### Module 12: Production Operations and Capstone
- **Production operational runbook**
  - Daily health checks with `pm2 status` and health endpoints
  - Backup and restore strategies for PM2 configuration
  - Rollback procedures for failed deployments
- **Security best practices**
  - Running PM2 with least privilege
  - Securing the PM2 daemon interface
  - Environment variable security and secrets management
- **Capstone project**: Build and deploy a multi-service Node.js application (API server, worker queue, WebSocket server) managed entirely through PM2 with:
  - Ecosystem file with environment-specific configurations
  - Cluster mode for the API server
  - Graceful shutdown and zero-downtime reload
  - pm2-logrotate for log management
  - PM2 Plus monitoring dashboard
  - CI/CD pipeline for automated deployment
  - systemd integration for boot-time startup
  - Resource limits and crash recovery policies

## Final Project

Learners will design, implement, and deploy a production-grade microservices architecture consisting of three Node.js services:

1. **API Gateway (Express/Fastify)**: Serves as the entry point, handling authentication, rate limiting, and request routing to internal services. Runs in cluster mode with 4 instances behind PM2's built-in load balancer.

2. **Background Worker (BullMQ/Bull)**: Processes queued jobs from Redis, handling CPU-intensive tasks such as image processing, PDF generation, or email dispatch. Runs as a single-instance process with `max_memory_restart` monitoring.

3. **WebSocket Server (ws/Socket.IO)**: Maintains persistent connections with clients for real-time updates. Runs in a single process with custom graceful shutdown handling for active connections.

The capstone must include a complete ecosystem configuration file, a CI/CD pipeline configuration (GitHub Actions or GitLab CI), PM2 Plus monitoring setup, and a systemd integration. All services must support zero-downtime reloads and graceful shutdown with proper connection draining.

## Assessment Criteria

- **Module Quizzes (20%)**: Weekly quizzes test understanding of PM2 concepts, command syntax, and configuration patterns. A passing grade of 70% is required on each quiz before proceeding to the next module.

- **Hands-on Labs (40%)**: Each module includes a practical lab exercise evaluated on completion, correctness, and adherence to best practices. Labs are submitted as PM2 ecosystem files, log samples, and monitoring dashboards.

- **Final Capstone Project (40%)**: The capstone is evaluated on:
  - **Architecture and design (25%)**: Clean ecosystem file structure, appropriate use of cluster mode, proper environment separation
  - **Implementation correctness (30%)**: Graceful shutdown works correctly, zero-downtime reload can survive concurrent traffic, log rotation functions without data loss
  - **Production readiness (25%)**: Systemd integration, CI/CD pipeline, monitoring dashboard, crash recovery policies
  - **Documentation (20%)**: Runbook covering deployment, health checks, rollback, and common troubleshooting steps

## References

- [PM2 Official Documentation](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/) — Complete reference for all PM2 commands and configuration
- [PM2 Ecosystem File Reference](https://pm2.keymetrics.io/docs/usage/application-declaration/) — Ecosystem file schema and all available options
- [PM2 Cluster Mode Guide](https://pm2.keymetrics.io/docs/usage/cluster-mode/) — In-depth cluster mode documentation and best practices
- [pm2-logrotate Plugin](https://github.com/keymetrics/pm2-logrotate) — Log rotation plugin configuration and options
- [PM2 Plus Documentation](https://pm2.keymetrics.io/docs/usage/pm2-plus/) — Monitoring dashboard and custom metrics setup
- [PM2 Deploy Documentation](https://pm2.keymetrics.io/docs/usage/deployment/) — Deployment configuration for staging and production
- [Node.js Cluster Documentation](https://nodejs.org/api/cluster.html) — Official Node.js cluster module reference
- [PM2 Docker Integration](https://pm2.keymetrics.io/docs/usage/docker-pm2/) — Best practices for running PM2 in Docker containers
- [PM2 Startup Hook Guide](https://pm2.keymetrics.io/docs/usage/startup/) — Systemd, Upstart, and launchd integration

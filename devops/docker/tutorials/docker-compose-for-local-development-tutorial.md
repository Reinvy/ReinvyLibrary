---
title: "Docker Compose for Local Development Tutorial"
description: "Build a reproducible local development stack with Docker Compose, covering services, bind mounts, hot reload, healthchecks, dependency ordering, env files, and profiles."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Docker Compose for Local Development Tutorial

## Summary

This tutorial builds a three-service local development stack — an API, PostgreSQL, and Redis — with Docker Compose. You will configure bind mounts with hot reload, healthchecks that gate startup order, environment file layering, and profiles so one file serves both daily development and an optional debugging workflow.

## Target Audience

- Backend and full-stack developers who run multi-service applications on their laptops.
- Platform engineers responsible for making onboarding a single command.
- Intermediate developers comfortable with `docker run` who want reproducible environments.

## Prerequisites

- Docker Engine 24+ with the Compose v2 plugin (`docker compose version`).
- Basic familiarity with Dockerfiles, images, and containers, plus an app server project.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Distinguish bind mounts from named volumes and pick the right one per path.
- Configure hot reload that survives container restarts.
- Use `healthchecks` with `depends_on: condition: service_healthy` to remove startup races.
- Layer configuration with `env_file` and Compose profiles for optional tooling.

## Context and Motivation

A typical service needs a database, a cache, and sometimes a queue. Installing each natively produces an environment that works on one machine and breaks on another. Compose describes the whole stack as code, so `docker compose up` is the entire setup.

The painful problems are rarely "how do I start containers" but rather: why does my process ignore file changes, why does the API crash before Postgres is ready, and why did my `node_modules` get clobbered. This tutorial concentrates on those details.

## Core Content

### Services and the Compose model

A Compose file declares services, networks, and volumes. Each service gets a DNS name equal to its service name, so the API reaches the database at host `db`, never `localhost` — inside a container, `localhost` is the container itself.

### Bind mounts versus named volumes

- **Bind mount** (`./src:/app/src`) maps a host directory into the container; host edits appear instantly, which is what enables hot reload.
- **Named volume** (`pgdata:/var/lib/postgresql/data`) is managed by Docker, survives `down`, and is right for database files and `node_modules`.

The classic trap is mounting the whole project (`./:/app`) while the host `node_modules` is compiled for a different OS. The fix is a named volume at `/app/node_modules`: Docker populates it from the image on first run, and it shadows the host directory.

### Healthchecks and startup order

`depends_on` without a condition waits only for the container to be *created*, not for the process inside to accept connections. Postgres needs a second or two to initialize, so an API that migrates on boot fails intermittently. A `healthcheck` polls a command and marks the container healthy; `condition: service_healthy` makes startup deterministic.

### Profiles for optional services

Profiles tag services so they start only when requested. Mail catchers, admin UIs, and profilers belong behind one: `docker compose --profile tools up`. The default `up` stays lean, and nothing is commented out to disable it.

## Code Examples

### The Compose file

```yaml
# compose.yaml
services:
    api:
        build:
            context: .
            target: development
        command: npm run dev
        ports:
            - "3000:3000"
        environment:
            DATABASE_URL: postgres://app:app@db:5432/app
            REDIS_URL: redis://cache:6379
        env_file:
            - .env.local
        volumes:
            - ./src:/app/src
            - ./package.json:/app/package.json:ro
            - node_modules:/app/node_modules
        depends_on:
            db:
                condition: service_healthy
            cache:
                condition: service_started
        healthcheck:
            test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
            interval: 10s
            timeout: 3s
            retries: 5
            start_period: 20s
    db:
        image: postgres:16-alpine
        environment:
            POSTGRES_USER: app
            POSTGRES_PASSWORD: app
            POSTGRES_DB: app
        ports:
            - "5432:5432"
        volumes:
            - pgdata:/var/lib/postgresql/data
        healthcheck:
            test: ["CMD-SHELL", "pg_isready -U app -d app"]
            interval: 5s
            timeout: 3s
            retries: 10
    cache:
        image: redis:7-alpine
        command: ["redis-server", "--appendonly", "yes"]
        volumes:
            - redisdata:/data
    mailpit:
        image: axllent/mailpit:latest
        profiles: ["tools"]
        ports:
            - "8025:8025"

volumes:
    pgdata:
    redisdata:
    node_modules:
```

### The development stage of the Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]
```

The `development` target keeps dev dependencies and the watcher; a separate `production` target prunes them. Because `node_modules` is a volume, the image's installed tree is what the container actually runs.

### Everyday commands

```bash
docker compose up -d --wait              # start and block until healthy
docker compose up -d --build api         # rebuild one service
docker compose logs -f --tail=100 api    # follow one service
docker compose --profile tools up -d     # include profile-gated services
docker compose down -v                   # teardown, destroys volumes
```

## Key Insights

- **Mount the source, not the project root**: narrow mounts like `./src:/app/src` avoid clobbering generated files and cut macOS file-sharing overhead dramatically.
- **`depends_on` alone is not enough**: without `condition: service_healthy`, the first query after a cold start races Postgres initialization and fails roughly one time in three.
- **`--wait` makes scripts honest**: `docker compose up -d --wait` blocks until every healthchecked service reports healthy, turning onboarding and CI into one reliable command.
- **Layer configuration**: shared values in `compose.yaml`, non-secret overrides in `.env.local` via `env_file`, and never commit that file. Compose also interpolates `${VAR}` from a root `.env`.
- **Expect clock drift after laptop sleep**: healthchecks can report stale state on wake; `docker compose restart api` is usually faster than debugging the app.

## Next Steps

- Move production-adjacent concerns (secrets, resource limits, restart policies) into a `compose.prod.yaml` overlay.
- Read the Docker Compose networking guide to understand bridge networks and service discovery.
- Explore Testcontainers to reuse the same service images inside integration tests.

## Conclusion

You now have a stack where the database is provably ready before the API starts, source edits reload the server without a rebuild, dependencies live in a volume the host cannot corrupt, and optional tooling stays out of the default path. That is the difference between a demo compose file and one a team can rely on daily.

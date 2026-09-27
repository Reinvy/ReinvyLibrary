---
title: "Docker Compose Cheatsheet"
description: "A quick reference for the Docker Compose specification and CLI — service definitions, healthcheck-gated startup order, profiles, secrets and configs, environment interpolation, custom networks, named volumes, multi-file merging, and every-day compose commands for production workloads."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Docker Compose Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Validate and render the config | `docker compose config` | Parse, interpolate, and print the effective merged configuration |
| Start services detached | `docker compose up -d` | Create and start every container defined in compose.yaml |
| Build and start | `docker compose up --build -d` | Rebuild images before (re)creating containers |
| Start a single service | `docker compose up -d db` | Launch only the db service plus its dependencies |
| Stop and remove containers | `docker compose down` | Remove containers and default networks of the project |
| Down including volumes | `docker compose down -v` | Additionally delete named volumes declared in the file |
| Stream service logs | `docker compose logs -f --tail=100 web` | Follow the last lines of one or more services |
| Run a one-off command | `docker compose run --rm api npm test` | Start a new container from the service definition and run a command |
| Execute in a running container | `docker compose exec api bash` | Run a command inside an existing service container |
| List service names | `docker compose config --services` | Show service names after interpolation and file merging |
| Scale replicas | `docker compose up -d --scale api=3` | Run three replicas of a replicated service |
| Activate a profile | `docker compose --profile debug up -d` | Start services gated behind the debug profile |
| Watch and hot-reload | `docker compose watch` | Rebuild and restart services when source files change |
| Show computed environment | `docker compose config --environment` | Print the effective environment variables for services |
| Copy files | `docker compose cp api:/data/app.log .` | Copy files between a service container and the host |
| Stream project events | `docker compose events` | Emit container lifecycle events in real time |

## Common Commands

### Project Lifecycle

```bash
# Validate and show the effective merged configuration
docker compose config

# Create and start containers in detached mode
docker compose up -d

# Recreate every container, ignoring cached state
docker compose up -d --force-recreate

# Remove orphan containers left by older compose files
docker compose up -d --remove-orphans

# Stop containers without removing them
docker compose stop

# Start previously stopped containers
docker compose start

# Restart all services, or a single one
docker compose restart
docker compose restart api

# Gracefully stop and remove containers plus default networks
docker compose down

# Also remove named volumes and locally built images
docker compose down -v --rmi local

# Hard-stop a service without graceful shutdown
docker compose kill api
```

### Build and Publish Images

```bash
# Build images for all services using the layer cache
docker compose build

# Build without reusing cached layers from previous builds
docker compose build --no-cache

# Build a single set of services in parallel
docker compose build --parallel api worker

# Push images that were tagged by the compose build step
docker compose push

# Pull the latest images without rebuilding
docker compose pull --ignore-pull-failures
```

### Inspection and Debugging

```bash
# List running services and their containers
docker compose ps

# Include stopped containers in the listing
docker compose ps -a

# Print the effective configuration as JSON
docker compose config --format json

# List top-level keys: services, volumes, and profiles
docker compose config --services
docker compose config --volumes
docker compose config --profiles

# Show environment variables exactly as they will be injected
docker compose config --environment

# Resolve the host-side port of a container port
docker compose port api 3000

# Show the process table inside service containers
docker compose top

# Diff the working tree against the running containers
docker compose diff
```

### Logs and Follow

```bash
# Follow logs from all services
docker compose logs -f

# Last 200 lines of one service with timestamps
docker compose logs --tail=200 --timestamps api

# Lines emitted in the last ten minutes
docker compose logs --since=10m web

# Only error-level lines
docker compose logs --level=error api
```

### Executing Commands

```bash
# One-off command in a NEW container (migrations, seeds, scripts)
docker compose run --rm api npm run db:migrate

# One-off with a custom entrypoint, no TTY (CI-safe)
docker compose run --rm -T --entrypoint node api -e "console.log(1)"

# Execute a command inside the running container
docker compose exec api bash

# Non-interactive exec for scripts and CI jobs
docker compose exec -T api npm test

# Copy a file out of a service container
docker compose cp api:/app/coverage/clover.xml ./coverage/
```

### Scaling and One-Off Tasks

```bash
# Run three replicas of a service
docker compose up -d --scale worker=3

# Collapse back to a single replica
docker compose up -d --scale worker=1

# Launch a one-off job against the running project
docker compose run --rm job ./run-etl --date=2026-09-27
```

### Profiles and Multi-File Merging

```bash
# Start services gated behind the debug profile
docker compose --profile debug up -d

# Enable several profiles at once via the environment
COMPOSE_PROFILES=debug,tracing docker compose up -d

# Merge override files on top of the base compose file
docker compose -f compose.yaml -f compose.prod.yaml up -d

# Point the entire project at a custom file set
COMPOSE_FILE=compose.yaml:overrides/web.yaml docker compose config
```

## Code Snippets

### Complete Production Compose File

```yaml
name: shop

services:
  api:
    build:
      context: ./api
      target: production
    image: registry.example.com/shop/api:1.4.0
    restart: unless-stopped
    init: true
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://app:${DB_PASSWORD}@db:5432/shop
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-fs", "http://localhost:3000/healthz"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    ports:
      - "127.0.0.1:3000:3000"
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
    networks:
      - backend

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: shop
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d shop"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    networks:
      - backend

networks:
  backend:

volumes:
  pgdata:
```

### Environment Variable Interpolation

```yaml
services:
  web:
    image: nginx:alpine
    environment:
      # Plain value — no substitution takes place
      NODE_ENV: development
      # Substitution with a fallback default
      PORT: "${PORT:-8080}"
      # Substitution with an empty default
      DEBUG: "${DEBUG-}"
      # Required variable — startup fails when missing
      SECRET: "${SECRET:?SECRET must be set in the environment}"
      # Alternative value only when the variable is set
      VERSION: "${VERSION:+set}"
      # Escaped dollar sign — no interpolation
      SQL: "SELECT $$price FROM items"
```

| Pattern | Result |
|---------|--------|
| `${VAR}` | Value of VAR, empty string when unset |
| `${VAR:-default}` | `default` when VAR is unset or empty |
| `${VAR-default}` | `default` only when VAR is unset |
| `${VAR:?msg}` | Error with `msg` when VAR is unset or empty |
| `${VAR:+alt}` | `alt` only when VAR is set and non-empty |
| `$$` | Literal dollar sign, disables interpolation |

### Healthcheck-Gated Startup Order

```yaml
services:
  api:
    image: shop/api:1.4.0
    depends_on:
      db:
        condition: service_healthy
      seed:
        condition: service_completed_successfully

  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d shop"]
      interval: 5s
      timeout: 3s
      retries: 10

  seed:
    image: shop/db-seed:1.0.0
    environment:
      SEED_ONLY: "true"
    command: ["sh", "-c", "seed && sleep 2"]
    depends_on:
      db:
        condition: service_healthy
```

### Profiles, Secrets, and Configs

```yaml
services:
  app:
    image: shop/api:1.4.0
    profiles: ["production", "staging"]
    secrets:
      - db_password
      - source: aws_access_key
        target: AWS_ACCESS_KEY_ID
        uid: "1000"
        mode: 0440
    configs:
      - nginx_conf

secrets:
  db_password:
    file: ./secrets/db_password.txt
  aws_access_key:
    external: true
    name: shop-aws-key

configs:
  nginx_conf:
    file: ./nginx.conf
```

### Custom Networks and Static IPs

```yaml
services:
  app:
    image: shop/api:1.4.0
    networks:
      frontend:
        aliases:
          - api.internal
      backend:
        ipv4_address: 172.28.0.10

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
          gateway: 172.28.0.1
```

### Named Volumes, Bind Mounts, and tmpfs

```yaml
services:
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backups:/backups:ro
      - type: tmpfs
        target: /dev/shm
        tmpfs:
          size: 268435456  # 256 MiB

  app:
    image: shop/api:1.4.0
    volumes:
      - type: bind
        source: ./config/app.yaml
        target: /etc/app/config.yaml
        read_only: true
      - type: volume
        source: logs
        target: /var/log/app
        volume:
          nocopy: true

volumes:
  pgdata:
    driver: local
  logs:
    name: shop-logs
```

### Merge and Extend with Multiple Files

```yaml
# compose.yaml — base definition
services:
  web:
    image: shop/web:1.0.0
    environment:
      - NODE_ENV=development
    ports:
      - "3000:3000"
```

```yaml
# compose.prod.yaml — production override
services:
  web:
    image: shop/web:1.0.0
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
```

```yaml
# x- extension field shared through an anchor
x-api-defaults: &api-defaults
  restart: unless-stopped
  init: true
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
    interval: 30s
    timeout: 3s

services:
  orders:
    <<: *api-defaults
    image: shop/orders:1.2.0
  payments:
    <<: *api-defaults
    image: shop/payments:1.1.0
```

---
title: "Docker Command Cheatsheet"
description: "A quick reference guide for essential Docker CLI commands, Dockerfile instructions, and Docker Compose syntax."
category: "devops"
technology: "docker"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# Docker Command Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Show running containers | `docker ps` | List active containers with status, ports, and names |
| Show all containers | `docker ps -a` | Include stopped containers in the listing |
| Pull an image | `docker pull <image>:<tag>` | Download an image from a registry (default Docker Hub) |
| Build an image | `docker build -t <name>:<tag> .` | Build an image from a Dockerfile in the current directory |
| Run a container | `docker run -d --name <name> <image>` | Start a container in detached mode with a custom name |
| Run with port mapping | `docker run -p 8080:80 <image>` | Map host port 8080 to container port 80 |
| Run with volume mount | `docker run -v /host/path:/container/path <image>` | Mount a host directory into the container |
| Stop a container | `docker stop <container>` | Gracefully stop a running container (SIGTERM) |
| Start a container | `docker start <container>` | Start a previously stopped container |
| Remove a container | `docker rm <container>` | Delete a stopped container |
| Force remove running | `docker rm -f <container>` | Force remove a running container |
| View logs | `docker logs <container>` | Fetch the logs of a container |
| Follow logs | `docker logs -f <container>` | Stream logs in real time (tail -f equivalent) |
| Execute command in container | `docker exec -it <container> bash` | Open an interactive shell inside a running container |
| Inspect container | `docker inspect <container>` | View detailed low-level container metadata (JSON) |
| List images | `docker images` | Show all locally stored Docker images |
| Remove an image | `docker rmi <image>` | Delete an image from local storage |
| Remove unused resources | `docker system prune` | Clean up dangling images, containers, volumes, and networks |
| Remove everything unused | `docker system prune -a` | Remove all unused images, not just dangling ones |
| Copy file from container | `docker cp <container>:/path /local/path` | Copy files or directories from a container to the host |
| Copy file into container | `docker cp /local/path <container>:/path` | Copy files from host into a running container |
| List networks | `docker network ls` | List all Docker networks |
| Create a network | `docker network create <name>` | Create a new bridge network |
| List volumes | `docker volume ls` | List all Docker volumes |
| Create a volume | `docker volume create <name>` | Create a new named volume |

## Common Commands

### Image Management

```bash
# Search for images on Docker Hub
docker search nginx

# Tag an image for a registry
docker tag myapp:latest myregistry.com/myapp:latest

# Push an image to a registry
docker push myregistry.com/myapp:latest

# Save an image to a tarball
docker save -o myapp.tar myapp:latest

# Load an image from a tarball
docker load -i myapp.tar

# Show image history
docker history myapp:latest
```

### Container Lifecycle

```bash
# Run a container in foreground (interactive)
docker run -it --rm ubuntu:22.04 bash

# Run with environment variables
docker run -e DATABASE_URL=postgres://localhost -d postgres:16

# Run with resource limits
docker run --memory="512m" --cpus="1.0" nginx:alpine

# Restart a container (stop + start)
docker restart my-container

# Pause / unpause processes
docker pause my-container
docker unpause my-container

# Rename a container
docker rename old-name new-name

# Wait for container to exit and get exit code
docker wait my-container
```

### Dockerfile Instructions

```dockerfile
# Base image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy files
COPY package*.json ./
COPY src/ ./src/

# Run commands during build
RUN npm ci --only=production

# Set environment variables
ENV NODE_ENV=production

# Expose a port
EXPOSE 3000

# Define the startup command
CMD ["node", "server.js"]

# Alternative entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Add metadata labels
LABEL maintainer="team@example.com" \
      version="1.0.0"

# Create a mount point
VOLUME ["/data"]

# Switch user for security
USER node

# Multi-stage build: copy from builder stage
COPY --from=builder /app/dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Docker Compose

```bash
# Start services in detached mode
docker compose up -d

# Build and start services
docker compose up --build -d

# Stop and remove containers
docker compose down

# Stop and remove everything (volumes too)
docker compose down -v

# View logs of all services
docker compose logs -f

# Rebuild a specific service
docker compose build web

# Execute command in a running service
docker compose exec web npm test

# List running services
docker compose ps

# Scale a service
docker compose up -d --scale api=3
```

## Code Snippets

### Minimal Node.js Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

### Multi-Stage Build for Go

```dockerfile
FROM golang:1.22 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/server .

FROM scratch
COPY --from=build /app/server /server
EXPOSE 8080
CMD ["/server"]
```

### Docker Compose for Full-Stack App

```yaml
version: "3.8"
services:
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
volumes:
  pgdata:
```

### Network Isolation with Compose

```yaml
version: "3.8"
services:
  frontend:
    build: ./frontend
    networks:
      - frontend
  backend:
    build: ./backend
    networks:
      - frontend
      - backend
  db:
    image: postgres:16-alpine
    networks:
      - backend

networks:
  frontend:
  backend:
```

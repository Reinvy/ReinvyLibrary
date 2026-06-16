---
title: "Dockerizing a Full-Stack Application"
description: "A step-by-step tutorial on containerizing a multi-service application (Node.js, React, PostgreSQL) using Docker and Docker Compose."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Dockerizing a Full-Stack Application

## Summary

This tutorial guides you through containerizing a complete full-stack application using Docker and Docker Compose. You will build Dockerfiles for a Node.js API server and a React frontend, configure a PostgreSQL database service with persistent volumes, wire them together in a Compose file, and learn patterns for development and production workflows.

## Target Audience

- Backend and full-stack developers familiar with Node.js, React, and PostgreSQL.
- Developers who understand basic Docker concepts (images, containers, ports) but have not yet composed multi-service applications.
- Intermediate level.

## Prerequisites

- Docker Engine and Docker Compose installed on your machine.
- Basic familiarity with the command line.
- Working knowledge of Node.js and React.
- A code editor (VS Code recommended).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Write efficient multi-stage Dockerfiles for Node.js and React applications.
- Configure Docker Compose to orchestrate multiple services.
- Set up persistent storage for databases using named volumes.
- Manage environment variables across services securely.
- Use bind mounts for hot-reloading in development mode.
- Separate build configurations for development and production environments.

## Context and Motivation

Modern applications rarely run as a single process. A typical web application consists of a frontend, an API server, a database, a cache, and often a message queue. Setting up these services manually on every developer's machine leads to the infamous "it works on my machine" problem. Docker solves this by packaging each service with its exact dependencies and runtime configuration into portable containers. Docker Compose then lets you define and run the entire stack with a single command, ensuring that every member of your team — and every deployment target — sees the same environment.

## Core Content

### Understanding the Application Architecture

The sample application has three services:

1. **API Service** — A Node.js/Express REST API that serves data from a PostgreSQL database.
2. **Frontend Service** — A React single-page application built with Vite that consumes the API.
3. **Database Service** — PostgreSQL for persistent data storage.

Each service runs in its own container. The API and frontend are built from custom Docker images, while PostgreSQL uses the official `postgres` image.

### Writing the Dockerfile for the API

A Dockerfile for a Node.js API should use a **multi-stage build** to keep the final image small. The first stage installs production dependencies, and the second stage copies only the artifacts needed at runtime.

Start with a base Node.js image, set the working directory, copy dependency manifests, install packages, then copy the source code. Use the `node` user instead of root for better security.

### Writing the Dockerfile for the Frontend

The React frontend also benefits from multi-stage builds. The first stage installs dependencies and runs the production build (e.g., `npm run build`). The second stage uses a lightweight web server like Nginx to serve the static files.

This approach shrinks the frontend image from hundreds of megabytes (a full Node environment) to under 50 MB (static files behind Nginx).

### Configuring the Database

PostgreSQL does not need a custom Dockerfile. The official image is configured entirely through environment variables and volumes:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` define the database credentials.
- A named volume persists data across container restarts.
- An initialization script can be mounted into `/docker-entrypoint-initdb.d/` to seed the database on first run.

### Defining Services with Docker Compose

Docker Compose is the orchestration layer. A `compose.yaml` file defines all three services, their build contexts, ports, volumes, environment variables, and dependencies.

Key Compose concepts covered:

- **Build context** — points to the directory containing each service's Dockerfile.
- **Port mapping** — maps container ports to host ports so services can communicate.
- **Volumes** — named volumes for database persistence; bind mounts for development hot-reload.
- **Environment variables** — injected into containers from an `.env` file or inline.
- **Depends on** — ensures the database starts before the API, and the API starts before the frontend (where appropriate).
- **Health checks** — verify that a service is truly ready before dependent services attempt to connect.

### Managing Network Communication

Docker Compose automatically creates a default network for all services defined in the file. Services can reach each other by their service name (e.g., the API connects to `db:5432` instead of `localhost:5432`). No manual network configuration is needed.

### Development vs Production Configurations

Use **multiple Compose files** (or Compose profiles) to separate development and production concerns:

- **Development**: Bind mounts for live code reload, debug ports exposed, more verbose logging.
- **Production**: Pre-built images from a registry, no bind mounts, resource limits, restart policies, and health checks.

### Running the Stack

With the Compose file ready, a single command builds and starts all services:

```bash
docker compose up --build
```

Stopping the stack is equally simple:

```bash
docker compose down
```

To preserve database data across restarts, use `docker compose down` without the `-v` flag (this keeps named volumes).

## Code Examples

### Project Structure

```text
fullstack-app/
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── .dockerignore
│   └── src/
│       ├── index.js
│       ├── db.js
│       └── routes/
│           └── items.js
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .dockerignore
│   ├── vite.config.js
│   ├── nginx.conf
│   └── src/
│       ├── App.jsx
│       └── main.jsx
├── db/
│   └── init.sql
├── compose.yaml
└── .env
```

### API Dockerfile (Multi-Stage)

```dockerfile
# Stage 1: Install production dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Runtime image
FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
USER appuser
EXPOSE 3000
CMD ["node", "src/index.js"]
```

### API .dockerignore

```text
node_modules
npm-debug.log
.git
.env
```

### API Server Code

```javascript
// src/index.js
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'app',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME || 'fullstack_app',
});

app.use(express.json());

app.get('/api/items', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Database query failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/items', async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO items (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Insert failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

pool.query(`
  CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
  )
`).then(() => {
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
```

### Frontend Dockerfile (Multi-Stage with Nginx)

```dockerfile
# Stage 1: Build the React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Frontend nginx.conf

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Frontend .dockerignore

```text
node_modules
dist
.git
.env
```

### Database Initialization Script

```sql
-- db/init.sql
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO items (name, description) VALUES
  ('Sample Item 1', 'This is the first sample item.'),
  ('Sample Item 2', 'This is the second sample item.')
ON CONFLICT DO NOTHING;
```

### Docker Compose File

```yaml
# compose.yaml
services:
  db:
    image: postgres:16-alpine
    container_name: fullstack-db
    env_file:
      - .env
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-app}"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: fullstack-api
    ports:
      - "3000:3000"
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: ${POSTGRES_DB}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./api/src:/app/src

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: fullstack-frontend
    ports:
      - "8080:80"
    depends_on:
      - api

volumes:
  pgdata:
```

### Environment Variables File

```text
# .env
POSTGRES_USER=app
POSTGRES_PASSWORD=changeme_in_production
POSTGRES_DB=fullstack_app
```

### Development Override Compose File

```yaml
# compose.dev.yaml
services:
  api:
    environment:
      - NODE_ENV=development
    command: npx nodemon src/index.js

  frontend:
    build:
      target: build  # skip Nginx; use Vite dev server
    ports:
      - "5173:5173"
    command: npx vite --host 0.0.0.0
```

Run the development stack with:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

## Key Insights

- **Multi-stage builds are essential for production images.** They drastically reduce image size and eliminate unnecessary dependencies. A Node.js API drops from ~1 GB to ~200 MB; a React frontend goes from ~1.5 GB to ~50 MB.
- **Use health checks for service dependencies.** `depends_on` alone only waits for a container to start, not for the process inside to be ready. A health check on PostgreSQL prevents the API from crashing because the database is still initializing.
- **Never hardcode secrets in Dockerfiles.** Environment variables from `.env` files or your CI/CD pipeline keep credentials out of version control and image layers.
- **Bind mounts enable a seamless development experience.** Mounting your source code directory into a container means you can edit files locally and the running process picks up changes immediately — no rebuilds required.
- **The `.dockerignore` file is as important as the Dockerfile.** It prevents `node_modules`, build artifacts, and local configuration files from being sent to the Docker daemon, speeding up builds and keeping images clean.
- **Separate Compose files for development and production avoid configuration drift.** Developers get hot-reload and debug ports; production gets resource limits, restart policies, and pre-built images.

## Next Steps

- Dive deeper into Docker orchestration with the [Docker Swarm syllabus](../syllabi/docker-containerization-syllabus.md) available in this library.
- Learn how to optimize Docker images further with layer caching and distroless base images.
- Explore Docker security scanning tools like Docker Scout and Trivy.
- Study Kubernetes fundamentals to take container orchestration to the next level.

## Conclusion

You have learned how to containerize a full-stack application using Docker and Docker Compose. You wrote efficient multi-stage Dockerfiles for a Node.js API and a React frontend, configured PostgreSQL with persistent volumes, wired everything together in a Compose file, and learned patterns for both development and production environments. With these skills, you can package any multi-service application into a portable, reproducible stack that works identically on every machine — from your laptop to a production server.

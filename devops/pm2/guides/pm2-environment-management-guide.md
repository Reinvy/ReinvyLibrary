---
title: "PM2 Environment Management Guide"
description: "Best practices for managing environment configuration in PM2: ecosystem.config.js env blocks, NODE_ENV, dotenv, and separating secrets from non-secret config across dev, staging, and production."
category: "devops"
technology: "pm2"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# PM2 Environment Management Guide

## Introduction

PM2 runs Node.js applications as long-lived daemon processes, but the values your app reads at startup — database URLs, API keys, feature flags — differ between your laptop, a staging box, and production. This guide shows how to feed those values to PM2 correctly using the `env` blocks of `ecosystem.config.js`, the `NODE_ENV` convention, `dotenv` for file-based loading, and a clear rule for what belongs in config versus what must be handled as a secret.

## Best Practices

- **Use one `ecosystem.config.js` per project**: keep the process name, script path, and app-level settings in one committed file per environment (`--env staging`, `--env production`). This makes deployment repeatable and reviewable.
- **Prefer plain `env` blocks over `env_<name>` variants**: PM2 merges the base `env` block with the `env_<name>` block for the environment you select with `--env`. Put shared values in `env` and environment-specific overrides in the named block.
- **Set `NODE_ENV` explicitly and accurately**: Express, Laravel, and most frameworks change behavior (logging, caching, error verbosity) based on `NODE_ENV`. Do not let it default to `undefined` — that silently enables development-only code paths in production.
- **Never commit secrets in `ecosystem.config.js`**: the file is often committed to the repository. Store secrets in a secret manager (AWS Secrets Manager, Vault) or in a `.env` file on the server, and interpolate them at deploy time.
- **Let `dotenv` handle file-based config**: when the deployment tool already copies a `.env` to the server, keep `ecosystem.config.js` free of secrets and load the file in your app (`import 'dotenv/config'`) or `env_file` in the ecosystem file.
- **Fail fast on missing variables**: validate required environment variables at application startup and exit with a clear error message instead of crashing later with a confusing database error.

## Implementation Steps

### Step 1: Create the ecosystem file with env blocks

Start from a single `ecosystem.config.js` that declares the shared `env` block and the `env_staging` and `env_production` overrides. PM2 merges these when you pass `--env`.

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'blog-api',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        LOG_LEVEL: 'debug',
        APP_URL: 'http://localhost:3000',
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 8080,
        LOG_LEVEL: 'info',
        APP_URL: 'https://staging.example.com',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
        LOG_LEVEL: 'warn',
        APP_URL: 'https://example.com',
      },
    },
  ],
};
```

### Step 2: Load secrets separately, never in the ecosystem file

`ecosystem.config.js` should only carry non-secret configuration. Use `dotenv` inside the app to load a `.env` file that contains the secrets. The file lives only on the server and is excluded from version control.

```bash
# .gitignore
.env
.env.staging
.env.production
```

```javascript
// src/config.js
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
});

// Fail fast: exit with a clear message instead of crashing mid-request.
const result = schema.safeParse(process.env);
if (!result.success) {
  console.error('Missing or invalid environment variables:');
  for (const issue of result.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = result.data;
```

### Step 3: Interpolate secrets at deploy time

If the deployment pipeline has access to a secret manager, interpolate values into a `.env` file on the server before starting PM2, so the sources of truth remain the secret manager and the repository — never a hand-edited file on a single machine.

```bash
# .github/workflows/deploy.yml (excerpt)
- name: Write production env file
  run: |
    echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> .env
    echo "REDIS_URL=${{ secrets.REDIS_URL }}" >> .env
    echo "STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY }}" >> .env

- name: Deploy with PM2
  run: |
    npm ci --omit=dev
    npm run build
    pm2 start ecosystem.config.js --env production
    pm2 save
```

### Step 4: Run in the right environment and verify

Start the process with the matching `--env`, then confirm the process picks up the expected values. The `env_<name>` block always wins over the base `env` block for the keys it defines.

```bash
# Start the staging environment
pm2 start ecosystem.config.js --env staging

# Inspect the resolved environment of a running process
pm2 env 0

# Check that NODE_ENV and APP_URL took effect
pm2 env 0 | grep -E 'NODE_ENV|APP_URL|LOG_LEVEL'

# Persist the process list so it survives a machine reboot
pm2 save
```

If a value looks wrong, verify the file was actually parsed by `dotenv` and that no old process with a stale environment is still running: `pm2 delete all` followed by a fresh `pm2 start` avoids oppressively confusing state left over from previous runs.

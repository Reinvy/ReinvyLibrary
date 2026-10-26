---
title: "Bun Workspaces Monorepo Cheatsheet"
description: "Quick reference for Bun workspaces — workspace globs, cross-package linking, filtered scripts, catalogs, publishing, and lockfile-based CI caching."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Bun Workspaces Monorepo Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Declare workspaces | `"workspaces": ["apps/*", "packages/*"]` | Glob list in the root `package.json` |
| Install everything | `bun install` | One lockfile, one `node_modules` at the root |
| Add dep to one workspace | `bun add zod --cwd apps/api` | Writes into that workspace's manifest |
| Add a root-only tool | `bun add -d typescript --cwd .` | Root devDependency, not per package |
| Run one workspace script | `bun run --cwd apps/web dev` | Same as `bun --cwd apps/web run dev` |
| Run across workspaces | `bun run --filter '*' test` | Filter by package name, glob, or path |
| Match a package name | `bun run --filter '@acme/api' build` | Exact `name` field match |
| Dependency-ordered runs | `bun run --filter './packages/*' build` | Bun sorts by the internal graph |
| Reference a sibling | `"@acme/ui": "workspace:*"` | Always links the local copy |
| Re-link after manifest edits | `bun install --force` | Rebuilds the symlink graph |
| Pin shared versions | `"catalog": { "react": "^19.0.0" }` | Used as `"catalog:"` in packages |
| Publish one package | `bun publish --cwd packages/ui` | Runs from the package directory |
| Inspect a tarball | `bun pm pack --cwd packages/ui` | Packs without publishing |
| Reproducible install | `bun install --frozen-lockfile` | Fails if the lockfile would change |

## Common Commands

### Scaffolding the tree

```bash
mkdir -p apps/api apps/web packages/ui
cd apps/api && bun init -y
cd ../../apps/web && bun init -y

# The root manifest drives every install
cat > package.json <<'JSON'
{ "name": "acme", "private": true, "workspaces": ["apps/*", "packages/*"] }
JSON

bun install
```

### Filtered script execution

```bash
# Every workspace that defines "test"
bun run --filter '*' test

# A single package by name
bun run --filter '@acme/api' dev

# Everything under a directory glob, in dependency order
bun run --filter './packages/*' build

# Several filters, run in parallel
bun run --filter '*' lint --parallel
```

### Dependencies and publishing

```bash
# Runtime dependency for one workspace
bun add drizzle-orm --cwd apps/api

# Re-resolve after hand-editing manifests
bun install --force

# Dry run, then publish
bun publish --cwd packages/ui --dry-run
bun publish --cwd packages/ui --access public
```

## Code Snippets

### Root package.json

```json
{
  "name": "acme-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "catalog": { "react": "^19.0.0", "typescript": "^5.6.0" },
  "scripts": {
    "build": "bun run --filter './packages/*' build",
    "test": "bun run --filter '*' test"
  },
  "devDependencies": { "typescript": "catalog:" }
}
```

### Workspace package manifest

```json
{
  "name": "@acme/ui",
  "version": "1.2.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "files": ["src"],
  "dependencies": {
    "@acme/config": "workspace:*",
    "react": "catalog:"
  },
  "scripts": { "test": "bun test" }
}
```

### Consuming a sibling package with error handling

```typescript
// apps/api/src/routes/users.ts
import { db } from "@acme/db";
import { HttpError } from "@acme/errors";

try {
    const users = await db.query.users.findMany();
    return Response.json({ users });
} catch (error) {
    // Map infrastructure failures to a typed error, keep the cause
    throw error instanceof HttpError
        ? error
        : new HttpError(500, "Failed to load users", { cause: error });
}
```

### CI with lockfile-keyed caching

```yaml
name: ci
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lock') }}
      - run: bun install --frozen-lockfile
      - run: bun run --filter '*' build
```

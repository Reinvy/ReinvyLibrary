---
title: "Docker Storage and Volumes Guide"
description: "A comprehensive guide to managing persistent data in Docker — covering named volumes, bind mounts, tmpfs mounts, storage drivers, volume lifecycle, backup and restore strategies, and stateful production patterns."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Docker Storage and Volumes Guide

## Introduction

Containers are ephemeral by design. Every byte written to the container's writable layer lives and dies with the container: `docker rm` removes the container, and the data disappears with it — no recycle bin, no undo. That behavior is correct for stateless workloads, but production applications are rarely fully stateless. Databases, message queues, file uploads, caches, and job queues all need data to survive restarts, redeploys, and host maintenance.

Docker provides three storage mechanisms, backed by a storage-driver layer underneath:

- **Volumes** — the preferred mechanism. Docker manages directories under `/var/lib/docker/volumes/`, and they are fully portable, easy to back up, and shareable between containers.
- **Bind mounts** — any host directory mounted into the container. Simple and familiar, but host-dependent, less portable, and require manual permission management.
- **tmpfs mounts** — in-memory filesystems for sensitive or transient data that must never reach disk.

This guide covers how to choose between these mechanisms, manage their lifecycle, back up and restore state, and run stateful workloads in production without losing data. Every section pairs best practices with concrete commands and Compose configurations you can adopt immediately.

## Best Practices

### Prefer Named Volumes over Bind Mounts

Named volumes are the only storage option fully managed by Docker, which makes them the safest default for persistent application data.

- **Docker handles the path and permissions**: volumes live under `/var/lib/docker/volumes/`, so you never depend on a specific host path existing.
- **Portable across hosts**: `docker run` and Compose configuration reference the volume by name, not by machine-specific paths, so the same recipe works on a laptop, a CI runner, and a production server.
- **Backup-friendly**: because all volume data lives in one place, backup, restore, and migration become simple copy operations (see Implementation Steps 6 and 7).
- **Bind mounts are still the right tool for development**: when you need live code reloading, mounting the project directory into the container is exactly what you want. Keep bind mounts for development, configuration files, and legacy tooling — not for application data in production.

### Keep the Writable Layer Stateless

The container's writable layer is a copy-on-write overlay that accumulates data as the container runs. Relying on it for durable state causes three problems at once.

- **Data loss on container removal**: `docker rm` (or `docker compose down` without volumes) destroys everything the container wrote.
- **Image bloat when committing**: if you `docker commit` a running container, all its runtime writes get frozen into a new image layer, inflating image size and leaking secrets accumulated at runtime.
- **Poor performance under heavy writes**: every write to the storage-driver overlay triggers copy-on-write bookkeeping. Redirecting high-write paths to a volume or tmpfs avoids that overhead.

A useful mental model: the writable layer is for ephemeral runtime files (logs before shipping, PID files, sockets); volumes are for anything you would miss if it vanished.

### Use tmpfs for Secrets and Ephemeral Data

tmpfs mounts live entirely in RAM and are wiped when the container stops. Use them for data that must never be persisted.

- **Runtime secrets in development**: configuration values such as database passwords or API keys passed via environment or mounted files can be put on a tmpfs so they never hit disk.
- **Caches and scratch space**: build caches, session tokens, and temporary files benefit from RAM speed and guaranteed cleanup.
- **Understand the trade-offs**: tmpfs consumes container memory, counts against the container's memory limit, and offers zero durability — a host reboot or OOM kill loses everything. Never store the only copy of important data there.

### Handle Permissions Explicitly

Permission mismatches are the most common cause of "works on my machine, fails in production" storage bugs — especially with bind mounts and volume plugins.

- **Set ownership at the container level**: launch with `--user "$(id -u):$(id -g)"` or set a matching user in the Dockerfile so the process can write to the mounted directory.
- **Mind the initial-copy behavior**: when a named volume is mounted over a directory that already contains files in the image, Docker copies those files into the volume the first time the volume is used — but only if the volume is empty. Bind mounts never perform this copy. This subtle difference explains many "missing files" surprises when switching between the two.
- **Fix ownership from an entrypoint**: if a volume arrives with root-owned files (common with NFS or restored backups), run a small `chown` step at container startup rather than fighting permissions inside the image build.
- **Consider user namespace remapping**: enabling `userns-remap` in the Docker daemon maps the container's root to an unprivileged host user, reducing the blast radius of a root-in-container compromise. Verify that your volume mounts tolerate the remapped UIDs before enabling it in production.

### Manage Volume Lifecycle Deliberately

Volumes are independent objects with their own lifecycle. Confusing their lifetime with the container's is where data loss happens.

- **`docker rm` does not remove volumes**: a stopped container's named volumes survive by design, which is why `docker rm -v` (which deletes anonymous volumes) is a sharp knife — read it twice before running it.
- **Clean up orphans on a schedule**: anonymous volumes and volumes left behind by failed deploys accumulate silently. Use `docker volume ls -f dangling=true` to find them and `docker volume prune` after verifying nothing needs them.
- **Never prune with `-a` blindly**: `docker volume prune -a` removes every volume not referenced by a running container, including volumes whose containers are simply stopped. Always confirm the list first.
- **Prefer explicit names**: anonymous volumes (`-v /data` with no name) are difficult to reason about and easy to orphan. Name every volume you intend to keep.

### Back Up and Test Restores

A backup you have never restored is a wish, not a plan. Volume backups are directory snapshots, which makes them straightforward — and easy to automate.

- **Back up at the application level when possible**: for databases, prefer native dump tools (`pg_dump`, `mongodump`, `redis-cli --rdb`) because they produce consistent, application-aware snapshots. File-level copies are the fallback for everything else.
- **Snapshot consistently**: for file-based data, prefer quiescing the application or using filesystem snapshots to avoid copying a half-written state; a simple `tar` of a live volume can capture torn writes.
- **Test restores regularly**: restore into a scratch container on a schedule and verify the application boots and reads the data. Untested restore procedures are the top cause of failed disaster recovery.
- **Keep backups off the Docker host**: storing backup tarballs in the same volume, same filesystem, or same machine protects against exactly nothing. Push them to object storage, another host, or a mounted NFS share.

### Watch Storage Capacity and Costs

Volumes are invisible until they fill the disk, at which point every container on the host starts misbehaving.

- **Monitor proactively**: `docker system df` shows total image, container, volume, and cache usage in one view; `docker system df -v` breaks volume usage down per volume.
- **Set retention and rotation**: logs, caches, and scratch data should have explicit retention policies — both inside the application and at the volume level.
- **Use `--log-opt max-size` and `max-file`** to cap container log growth, the most common hidden disk consumer on Docker hosts.
- **Account for the copy-on-write doubling**: backup tools that copy volume content to another volume or bind mount temporarily double disk usage. Plan headroom accordingly.

### Match Storage Drivers to Your Workload

The storage driver determines how images and the writable layer are represented on disk. Most deployments never need to change it, but knowing the trade-offs prevents architecture mistakes.

- **overlay2 is the default and the right choice for most workloads**: it offers good performance, supports copy-on-write efficiently, and is the most battle-tested driver on modern kernels.
- **Specialized volume plugins for specialized needs**: the built-in `local` driver handles local directories and NFS; third-party plugins add cloud block storage, distributed filesystems, and replication. Choose a driver that matches your durability requirements rather than defaulting to whatever is easiest.
- **Stress-test performance assumptions**: high-I/O workloads (databases, message brokers) benefit from real benchmarking on the target infrastructure — driver, filesystem, and volume type all interact with the kernel in ways that are hard to predict without measurement.

## Implementation Steps

### Step 1: Map Each Workload to a Storage Type

Before writing any configuration, classify every data path in your application. The decision table below is a reliable starting point:

```text
| Data kind                     | Storage type       | Notes                                      |
|-------------------------------|--------------------|--------------------------------------------|
| Database files (Postgres,     | Named volume       | Application-level dump for backup          |
| MySQL, MongoDB)               |                    |                                            |
| Uploaded files / media        | Named volume       | Object storage is a better long-term home  |
| Message broker data (Redis,   | Named volume       | RDB/AOF or equivalent for consistent       |
| RabbitMQ)                     |                    | snapshots                                  |
| Source code in development    | Bind mount         | Enables hot-reload                         |
| Config / credentials files    | Bind mount (ro)    | Or secret mounts with tmpfs                |
| Build caches, temp files      | tmpfs              | Fast, wiped on stop                        |
| Logs before shipping          | tmpfs or stdout    | Prefer structured stdout + log driver      |
```

Start by listing the writable paths in your Dockerfile and container configuration, then assign each one a row from this table. Anything not assigned a storage mechanism is implicitly using the writable layer — which, per Best Practices above, should only ever hold ephemeral data.

### Step 2: Create and Mount a Named Volume

Create the volume up front when you want explicit control over its configuration:

```bash
docker volume create app-data
docker volume inspect app-data
```

Mount it with either the classic `-v` syntax or the more explicit `--mount` syntax — they are equivalent, but `--mount` makes the source and target unambiguous:

```bash
# -v shorthand
docker run -d --name postgres \
  -v app-data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# --mount verbose form
docker run -d --name postgres \
  --mount type=volume,source=app-data,target=/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16
```

A named volume can be shared between containers simultaneously — useful for a writer plus a sidecar backup or analytics process:

```bash
docker run --rm -v app-data:/data alpine ls -la /data
```

### Step 3: Use Bind Mounts for Development and Configuration

Bind mounts map an absolute host path into the container. They are ideal for development hot-reloading and for injecting configuration that must live on the host:

```bash
# Development: live code reloading
docker run -d -p 3000:3000 \
  -v "$(pwd)":/app \
  -w /app \
  node:20 npm run dev

# Read-only configuration injection
docker run -d --name nginx \
  -v /etc/nginx/conf.d:/etc/nginx/conf.d:ro \
  nginx:1.27
```

Two refinements matter in practice:

- **Read-only mounts**: append `:ro` for anything the container must not modify — configuration directories and secrets are the usual candidates.
- **SELinux contexts**: on SELinux-enabled hosts, bind mounts may need `:z` (shared) or `:Z` (private) labels; without them the container may see empty or permission-denied directories.

Remember the initial-copy asymmetry from Best Practices: bind mounts never copy image content into the mounted directory. If the image expects files at the mount point, you must provide them on the host yourself.

### Step 4: Mount tmpfs for Transient Data

tmpfs mounts are in-memory and disappear when the container stops. Create one with a size limit and hardened options:

```bash
docker run -d --name cache \
  --tmpfs /scratch:size=64m,noexec,nosuid \
  nginx:1.27
```

The `--mount` form gives the same control with clearer syntax:

```bash
docker run -d --name cache \
  --mount type=tmpfs,target=/scratch,tmpfs-size=64m,tmpfs-mode=1700 \
  nginx:1.27
```

Use this pattern for build caches, session state, and credentials that should never be persisted. Verify the mount with `docker inspect`:

```bash
docker inspect cache --format '{{ json .Mounts }}'
```

### Step 5: Define Storage in Docker Compose

Compose is where volume configuration earns its keep — the whole storage layout becomes declarative and version-controlled. Named volumes are declared at the top level and referenced per service:

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/initdb:/docker-entrypoint-initdb.d:ro
    environment:
      POSTGRES_PASSWORD: secret

  app:
    build: .
    volumes:
      - ./src:/app/src
      - app-uploads:/app/uploads
    tmpfs:
      - /tmp:size=128m

volumes:
  pgdata:
  app-uploads:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=10.0.0.5,rw,nfsvers=4"
      device: ":/srv/docker-uploads"
```

Key behaviors to understand:

- **Named volumes persist across `docker compose down`**: only `docker compose down -v` removes them, and that flag deletes *all* declared volumes — including your database data.
- **`external: true`** references a volume created outside Compose (for example, one shared across multiple projects): declare it as `volumes: { shared-data: { external: true } }` and Compose will require it to exist.
- **Per-service `tmpfs`** maps directly to the tmpfs mounts from Step 4, with size expressed in bytes (the example uses 128m = 134217728 bytes).

### Step 6: Back Up and Restore a Volume

File-level backup of a named volume is a tar pipeline with a helper container. Back up `pgdata` to the current directory:

```bash
docker run --rm \
  -v pgdata:/source \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/pgdata-$(date +%F).tar.gz -C /source .
```

Restore into a fresh volume (the target volume must exist and should be empty):

```bash
docker volume create pgdata-restored
docker run --rm \
  -v pgdata-restored:/target \
  -v "$(pwd)":/backup \
  alpine tar xzf /backup/pgdata-2026-08-30.tar.gz -C /target
```

Then point a container at the restored volume and verify the application works:

```bash
docker run -d --name postgres-restored \
  -v pgdata-restored:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16
```

For databases, prefer native dumps over file tars — `pg_dump`, `mongodump`, and `redis-cli --rdb` produce consistent snapshots that survive version upgrades. Sequence the two approaches: file-level tar for rapid recovery of the exact state, native dump for logical, version-tolerant backups.

### Step 7: Migrate Data Between Hosts

Moving a volume to another machine is copy-plus-restore, but a few techniques make it smoother:

- **Direct volume-to-volume copy** on the same host:

  ```bash
  docker run --rm \
    -v pgdata:/from \
    -v pgdata-copy:/to \
    alpine sh -c "cd /from && cp -a . /to"
  ```

- **Stream across hosts without an intermediate tarball** — pipe the tar output over SSH:

  ```bash
  docker run --rm -v pgdata:/source \
    alpine tar czf - -C /source . \
    | ssh deploy@db-host "docker run --rm -i -v pgdata:/target alpine tar xzf - -C /target"
  ```

- **NFS-backed volumes**: if both hosts mount the same NFS export, `docker volume create --driver local --opt type=nfs --opt o=addr=10.0.0.5,rw --opt device=:/srv/pgdata shared-pgdata` makes the volume visible from any host with access — no copy required, at the cost of network latency and a shared-failure domain.

Whichever path you choose, verify ownership and integrity on the destination before switching traffic — permissions (Step 4 of Best Practices) are the usual casualty of cross-host migration.

### Step 8: Monitor and Prune Storage

Establish a routine for storage visibility before disk pressure becomes an incident:

```bash
# One-line usage overview
docker system df

# Per-volume breakdown
docker system df -v

# Find dangling volumes (not referenced by any container)
docker volume ls -f dangling=true
```

Prune deliberately — remove only what is safe:

```bash
# Remove dangling volumes only
docker volume prune

# Remove containers, networks, and dangling images too
docker system prune

# NEVER run this without reading the list first — it removes
# every volume not attached to a running container
docker system prune -a --volumes
```

Combine this with log rotation limits (`--log-opt max-size=10m --log-opt max-file=3`) and application-level retention policies, and schedule a capacity check (`df -h /var/lib/docker`) in your monitoring stack. Storage is finite; the discipline of pruning, retention, and alerting is what keeps a Docker host healthy over months of container churn.

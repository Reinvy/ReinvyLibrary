---
title: "Docker Troubleshooting and Debugging Cheatsheet"
description: "A quick reference for diagnosing and debugging Docker containers, images, networks, resources, and builds using the Docker CLI."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Docker Troubleshooting and Debugging Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Show exit code and state | `docker inspect -f '{{.State.Status}} exit={{.State.ExitCode}}' <container>` | Diagnose why a container stopped |
| Stream live events | `docker events --filter container=<container>` | Watch start, stop, die, and kill events in real time |
| Live resource usage | `docker stats --no-stream <container>` | CPU, memory, and network snapshot for one container |
| Processes inside a container | `docker top <container>` | List host-visible processes with their PIDs |
| Disk usage breakdown | `docker system df` | See space consumed by images, containers, volumes, and caches |
| Logs with timestamps | `docker logs -t --tail 100 <container>` | Last 100 log lines with timestamps |
| Health status | `docker inspect -f '{{.State.Health.Status}}' <container>` | Starting, healthy, or unhealthy for containers with a healthcheck |
| Was it OOM-killed? | `docker inspect -f '{{.State.OOMKilled}}' <container>` | true when the kernel OOM killer terminated the process |
| Port bindings | `docker port <container>` | Map published host ports to container ports |
| Network settings | `docker inspect -f '{{json .NetworkSettings.Networks}}' <container>` | IP, gateway, and attached networks as JSON |
| Filesystem changes | `docker diff <container>` | Lines with A, D, or C flags for filesystem changes since start |
| Copy a file out | `docker cp <container>:/var/log/app.log ./` | Pull a file from a container for offline inspection |
| Override the entrypoint | `docker run --rm -it --entrypoint sh <image>` | Get a shell in an image whose entrypoint fails |
| Show image layers | `docker history --no-trunc <image>` | See every layer and the instruction that created it |
| Run several diagnostics | `docker exec -it <container> sh -c 'ps aux; cat /etc/resolv.conf'` | Execute multiple diagnostic commands in one shot |
| Full build output | `docker build --progress=plain -t <name> .` | Print every BuildKit step with timing instead of a compact view |

## Common Commands

### Container State and Exit Codes

```bash
# Get the raw state object of a container
docker inspect -f '{{json .State}}' <container> | jq .

# Exit code alone (0 = clean, 137 = SIGKILL, 130 = SIGINT, ...)
docker inspect -f '{{.State.ExitCode}}' <container>

# Block until a container exits, then print its exit code
docker wait <container>

# Restart policy in effect
docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' <container>

# How many times the container has been restarted
docker inspect -f '{{.RestartCount}}' <container>
```

Common exit codes to recognize when a container stops unexpectedly:

```text
0    Program exited cleanly
1    Application error (uncaught exception, failed assertion)
125  Docker daemon itself failed to start the container
126  The command in the image could not be invoked
127  Command not found (entrypoint or binary missing from image)
128+n    Killed by signal n (e.g., 137 = SIGKILL, 143 = SIGTERM, 139 = SIGSEGV)
130  Interrupted by Ctrl+C (SIGINT) in an interactive session
137  OOM-killed by the kernel or stopped with kill -9
```

### Health Checks and Probes

```bash
# Full health history for a container with a HEALTHCHECK
docker inspect --format '{{json .State.Health}}' <container> | jq .

# Exit code of the last health probe (0 = healthy)
docker inspect -f '{{(last .State.Health.Log).ExitCode}}' <container>

# List only unhealthy containers
docker ps --filter health=unhealthy

# Change the restart policy of a running container
docker update --restart unless-stopped <container>

# Inspect the healthcheck definition baked into the image
docker inspect -f '{{json .Config.Healthcheck}}' <image>
```

### Networking Debugging

```bash
# Show published port mappings
docker port <container>

# Containers attached to a network, with their IPs
docker network inspect -f '{{json .Containers}}' <network> | jq .

# DNS resolution from inside the container (busybox-safe)
docker exec <container> nslookup <service-name>

# Resolver configuration actually in use
docker exec <container> cat /etc/resolv.conf

# Test connectivity to another container by name
docker exec <container> sh -c 'wget -qO- http://db:5432 || echo unreachable'

# Host port already allocated? Find the process holding it
ss -ltnp | grep :8080
```

```text
# Classic port-conflict symptom
docker: Error response from daemon: driver failed programming external
connectivity on endpoint web (Bind for 0.0.0.0:8080 failed: port is
already allocated).
```

```bash
# Diagnose why two containers cannot talk: check they share a network
docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' <container-a>
```

### Resource Troubleshooting

```bash
# One-shot CPU/memory snapshot for all containers
docker stats --no-stream

# Live view for a single container
docker stats <container>

# Confirm kernel OOM kill, not an application crash
docker inspect -f '{{.State.OOMKilled}}' <container>

# Kernel OOM messages (host root access required)
dmesg | grep -i -A2 'out of memory'

# Adjust limits of a running container (takes effect immediately)
docker update --memory 512m --cpus 0.5 <container>

# Space used by images, containers, volumes, and build cache
docker system df

# Deep dive: largest images
docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' | sort -k2 -h
```

### Image and Layer Inspection

```bash
# Every layer with its size and the instruction that created it
docker history --no-trunc <image>

# Number of layers in the image
docker image inspect -f '{{json .RootFS.Layers}}' <image> | jq 'length'

# Files added, changed, or deleted in a running container
docker diff <container>

# Compare the container's filesystem to its image without committing
docker export <container> -o container-fs.tar
tar -tf container-fs.tar | head -50

# Inspect image metadata, including ENV and EXPOSE
docker image inspect -f '{{json .Config}}' <image> | jq '.Env, .ExposedPorts'
```

### Build Debugging

```bash
# Full, ordered BuildKit output with per-step timing
docker build --progress=plain -t <name> .

# Bypass the layer cache to isolate a stale-cache problem
docker build --no-cache --progress=plain -t <name> .

# Rebuild a single target in a multi-stage Dockerfile
docker build --target <stage-name> -t <name> .

# Debug a failing RUN step by printing every executed command
# (prefix the step with `set -x` and rebuild with --no-cache)
docker build --progress=plain --no-cache -t <name> . 2>&1 | tail -40

# Size of the build cache and how to prune it
docker buildx du
docker builder prune -f
```

When a `RUN` step fails, the most common causes are missing package manager indexes, network access disabled with `--network=none`, or a command that succeeds interactively but not in the build context (no terminal, different working directory, non-interactive shell flags). Add `set -eux` at the top of the failing `RUN` and rebuild with `--progress=plain --no-cache` to see every command the step actually executed.

### Logs, Events, and Drivers

```bash
# Timestamps + last 100 lines, following new output
docker logs -t -f --tail 100 <container>

# Logs from a time window
docker logs --since 2026-10-09T08:00:00 <container>
docker logs --until 30m <container>

# All events for the last hour, filtered by type
docker events --since 1h --filter type=container

# Watch specifically for kill/die/oom events
docker events --filter event=die --filter event=kill --filter event=oom
```

## Code Snippets

### Ephemeral Debug Container Sharing a Network Namespace

```bash
# Attach a throwaway toolkit container to the broken container's network
docker run --rm -it --network container:<broken-container> \
  nicolaka/netshoot \
  tcpdump -i eth0 -nn port 8080
```

The netshoot image bundles tcpdump, dig, curl, iperf, iftop, and dozens of other network tools, so you never need to install anything inside the production image.

### Inspect a Container That Exits Immediately

```bash
# Keep the process alive so you can inspect it (overrides ENTRYPOINT)
docker run --rm -d --name debug-me --entrypoint sleep <image> 3600

# Now inspect environment, files, and processes while it runs
docker exec -it debug-me sh
> env
> ls -la /app
> cat /app/config.yml

# Clean up
docker rm -f debug-me
```

### Go-Template One-Liners for Inspect

```bash
# State, environment, and bind mounts in one structured view
docker inspect -f '{{json .}}' <container> | jq '.State, .Config.Env, .HostConfig.Binds'

# Tab-separated health summary for scripting
docker inspect -f '{{.Name}}\t{{.State.Status}}\t{{.State.ExitCode}}\t{{.RestartCount}}' <container>

# JSON arrays rendered as a newline-delimited list (no jq needed)
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' <container>
```

### Minimal Healthcheck

```dockerfile
FROM node:20-alpine

HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "server.js"]
```

A healthcheck converts an opaque dead container into an actionable one: `docker ps` reports `unhealthy`, orchestrators can restart it, and your proxy can stop routing traffic to it.

### Wait-for-Dependency Entrypoint Script

```bash
#!/bin/sh
# entrypoint.sh — block startup until the database accepts connections
set -e

until nc -z db 5432; do
  echo "waiting for db:5432..."
  sleep 2
done

exec "$@"
```

```dockerfile
FROM alpine:3.20
RUN apk add --no-cache netcat-openbsd
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["sh"]
```

Use this pattern instead of `sleep 10` hacks: it removes a whole class of timing-dependent startup failures without hard-coding assumptions.

### Log Rotation in daemon.json

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Apply with a daemon restart: `sudo systemctl restart docker`. This caps the disk usage of the default `json-file` logs at roughly 30 MB per container, preventing "no space left on device" outages on busy hosts.

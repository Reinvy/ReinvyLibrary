---
title: "Docker Security Cheatsheet"
description: "A quick reference for hardening Docker containers and images: non-root users, dropped capabilities, seccomp profiles, resource limits, image scanning, secrets handling, and read-only filesystems."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Docker Security Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Run as a non-root UID | `docker run --user 10001:10001 myapp` | Overrides the image user so the process cannot write outside its own paths |
| Make the root filesystem immutable | `docker run --read-only --tmpfs /tmp myapp` | Blocks tampering with binaries at runtime; pair with tmpfs for writable temp space |
| Drop every capability | `docker run --cap-drop ALL myapp` | Removes all Linux capabilities, then add back only what the app truly needs |
| Add one capability back | `docker run --cap-drop ALL --cap-add NET_BIND_SERVICE myapp` | Allows binding a privileged port without running as root |
| Block privilege escalation | `docker run --security-opt no-new-privileges myapp` | Stops setuid binaries and file capabilities from raising privileges |
| Apply a seccomp profile | `docker run --security-opt seccomp=./seccomp.json myapp` | Restricts the syscall surface to an allowlist |
| Apply an AppArmor profile | `docker run --security-opt apparmor=docker-default myapp` | Confines file, mount, and network access via the host LSM |
| Disable the Docker default profile | `docker run --security-opt seccomp=unconfined myapp` | Use only for debugging; it removes the syscall filter entirely |
| Limit memory and CPU | `docker run --memory 512m --cpus 1.5 myapp` | Prevents noisy-neighbor exhaustion and limits the blast radius of a leak |
| Limit process count | `docker run --pids-limit 100 myapp` | Stops fork bombs from starving the host |
| Scan an image | `docker scout cves myapp:latest` | Reports known CVEs with the fixing version for each package |
| Fail a build on critical CVEs | `docker scout cves --exit-code --only-severity critical myapp:latest` | Turns scanning into a CI gate instead of a report |
| Sign and verify images | `cosign sign --key cosign.key registry.io/myapp:1.4.0` | Proves the artifact came from your pipeline before it is deployed |
| Inspect effective capabilities | `docker inspect -f '{{json .HostConfig.CapDrop}}' myapp` | Confirms what the container was actually granted at runtime |
| Audit the docker socket | `ls -l /var/run/docker.sock` | Group membership on this file is equivalent to root on the host |
| Generate an SBOM | `docker buildx build --sbom=true -t myapp .` | Produces a software bill of materials alongside the image |

## Common Commands

### Runtime Hardening Flags

```bash
# Baseline hardened run: unprivileged user, immutable root, no extra privileges
docker run -d --name api \
  --user 10001:10001 \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 200 \
  --memory 512m --cpus 1.0 \
  registry.io/api:1.4.0

# Verify the flags took effect
docker inspect -f '{{.Config.User}} ro={{.HostConfig.ReadonlyRootfs}}' api
docker inspect -f '{{json .HostConfig.CapDrop}}' api
```

Running as UID 10001 removes the main post-exploitation advantage inside a container: root-owned bind mounts, writable binaries, and the ability to install tooling. Pair `--read-only` with explicit `--tmpfs` mounts, otherwise applications that write to `/tmp` or a cache directory fail at startup.

### Capabilities and Privileges

```bash
# Find out what the container was granted
docker inspect -f '{{json .HostConfig.CapAdd}} {{json .HostConfig.CapDrop}}' api

# Probe the process capability set from inside
docker exec api grep Cap /proc/1/status

# Decode the bitmask with capsh (from libcap2-bin)
docker run --rm --pid=host alpine sh -c 'apk add -q libcap && capsh --decode=00000000a80425fb'
```

`--privileged` disables every protective mechanism at once: all capabilities, the seccomp filter, AppArmor, and device cgroup rules. Treat it as a host compromise and never use it outside short-lived hardware labs.

### Image Scanning and Supply Chain

```bash
# Scan the working tree, the built image, and a running environment
docker scout quickview registry.io/api:1.4.0
docker scout cves --only-severity critical,high registry.io/api:1.4.0

# Alternative scanners
trivy image --severity HIGH,CRITICAL --exit-code 1 registry.io/api:1.4.0
grype registry.io/api:1.4.0 -o table

# Verify a signature before deploying
cosign verify --key cosign.pub registry.io/api:1.4.0
```

### Secrets at Runtime

```bash
# Mount a secret as a file, never as an environment variable
printf '%s' "$DB_PASSWORD" | docker secret create db_password -
docker run -d --secret db_password --name api registry.io/api:1.4.0

# Compose equivalent with a file-based secret
docker compose up -d   # see snippets below
```

Environment variables leak through `docker inspect`, `/proc/1/environ`, crash dumps, and child processes. Files under `/run/secrets` are mounted in memory and are not visible in image metadata.

## Code Snippets

### Hardened Multi-Stage Dockerfile

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
# Create an unprivileged user and drop root entirely
RUN addgroup -S app && adduser -S -G app -u 10001 app
WORKDIR /app
COPY --from=build --chown=10001:10001 /app /app
USER 10001:10001
EXPOSE 3000
# Fail the build if the health endpoint is missing at runtime
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "server.js"]
```

### Compose Service with a Security Baseline

```yaml
services:
  api:
    image: registry.io/api:1.4.0
    user: "10001:10001"
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
      - seccomp:./seccomp-strict.json
    pids_limit: 200
    mem_limit: 512m
    cpus: 1.0
    secrets:
      - db_password
    ports:
      - "127.0.0.1:3000:3000"

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Minimal Seccomp Profile

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["read", "write", "openat", "close", "fstat", "mmap", "exit_group"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Start from the Docker default profile and remove syscalls rather than writing an allowlist from scratch; a hand-written profile usually breaks the runtime within minutes and gets replaced by `seccomp=unconfined`, which is worse than doing nothing.

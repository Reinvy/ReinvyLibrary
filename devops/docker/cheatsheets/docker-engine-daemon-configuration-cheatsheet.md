---
title: "Docker Engine Daemon Configuration and Administration Cheatsheet"
description: "A quick reference for configuring the Docker daemon: daemon.json keys, reload versus restart semantics, storage driver and data-root changes, registry mirrors, TLS remote access, contexts, rootless mode, and engine metrics."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Docker Engine Daemon Configuration and Administration Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Show the effective configuration | `docker info` | Merged view of daemon flags and `daemon.json` as resolved at startup |
| Print a single resolved value | `docker info --format '{{.DockerRootDir}}'` | Scriptable access to one field of the live daemon state |
| Validate a candidate config file | `sudo dockerd --validate --config-file /etc/docker/daemon.json` | Parses the file without touching the running engine |
| Apply the reloadable subset | `sudo systemctl reload docker` | Sends SIGHUP; only log, registry, and label keys take effect |
| Restart the engine | `sudo systemctl restart docker` | Required for storage-driver, data-root, userns, and TLS changes |
| Follow daemon logs | `journalctl -u docker -f` | Engine-side errors never appear in container logs |
| Move the data root | `"data-root": "/data/docker"` | Relocates images, containers, volumes, and build cache |
| Cap the default bridge pool | `"default-address-pools": [{"base": "10.201.0.0/16", "size": 24}]` | Prevents Docker from claiming `172.17.0.0/16` on every host |
| Add a pull-through mirror | `"registry-mirrors": ["https://mirror.internal"]` | Cuts cold-pull latency and offloads Docker Hub |
| Allow a plain-HTTP registry | `"insecure-registries": ["registry.lab:5000"]` | Permits a registry without a valid TLS certificate |
| Keep containers alive across restarts | `"live-restore": true` | Containers keep running while the daemon is upgraded |
| Remap container user namespaces | `"userns-remap": "default"` | Container root maps to an unprivileged host UID range |
| Align the cgroup driver | `"exec-opts": ["native.cgroupdriver=systemd"]` | Required for all supported Kubernetes versions |
| Expose engine metrics | `"metrics-addr": "127.0.0.1:9323"` | Prometheus endpoint for containers, images, and build cache gauges |
| Create a remote context | `docker context create prod --docker "host=tcp://engine:2376"` | Named engine endpoint, no repeated `-H` flags |
| Run one command against a context | `docker --context prod ps` | Overrides the active context for a single call |
| Run the engine without root | `dockerd-rootless-setuptool.sh install` | Rootless mode with a user-scoped systemd unit |
| Pin the API version | `DOCKER_API_VERSION=1.43 docker ps` | Keeps old clients or SDKs working against a newer engine |

## Common Commands

### Inspecting the Effective Configuration

```bash
# Everything the running daemon resolved, including defaults it chose itself
docker info

# Targeted fields, safe for scripts and monitoring probes
docker info --format 'root={{.DockerRootDir}} driver={{.Driver}} cgroup={{.CgroupDriver}}'

# What the engine will read on the next start
sudo cat /etc/docker/daemon.json

# Reject a bad file before you restart and take the fleet down
sudo dockerd --validate --config-file /etc/docker/daemon.json

# See the real command line the unit uses, including drop-ins
systemctl cat docker
```

`docker info` is the only source of truth: a key present in `daemon.json` that the running engine ignored looks identical on disk to one that was applied. Always compare the file against the live output after a change.

### Reloading Versus Restarting

`systemctl reload docker` sends SIGHUP. The daemon re-reads a small allowlist of keys; everything else is silently ignored until a full restart.

```text
| daemon.json key              | reload | restart | Notes                          |
|------------------------------|--------|---------|--------------------------------|
| registry-mirrors             | yes    | yes     | Applies to new pulls           |
| insecure-registries          | yes    | yes     | Applies to new pulls           |
| log-driver / log-opts        | yes    | yes     | New containers only            |
| labels, debug, experimental  | yes    | yes     | Cheap to flip                  |
| live-restore                 | no     | yes     | Read at daemon startup         |
| data-root                    | no     | yes     | Paths are resolved once        |
| storage-driver               | no     | yes     | Needs an empty image store     |
| userns-remap                 | no     | yes     | Invalidates existing layers    |
| hosts / tlsverify / tlscert  | no     | yes     | Socket setup happens at boot   |
```

```bash
# Apply the reloadable subset without stopping a single container
sudo systemctl reload docker

# Prove the daemon picked the value up
docker info --format '{{json .RegistryConfig.Mirrors}}'

# Full restart: containers stop unless live-restore is enabled
sudo systemctl restart docker

# Confirm all containers came back and the flags are live
docker ps --format '{{.Names}} {{.Status}}'
docker info --format 'live-restore={{.LiveRestoreEnabled}}'
```

### Storage Driver and Data Root

```bash
# Current driver and the directory that holds every layer
docker info --format 'root={{.DockerRootDir}} driver={{.Driver}}'

# Stop workloads and the engine before moving the store
sudo systemctl stop docker
sudo rsync -aHAX /var/lib/docker/ /data/docker/

# Point the engine at the new location in /etc/docker/daemon.json
# { "data-root": "/data/docker" }
sudo systemctl start docker

# Verify the content survived the move
docker images --format '{{.Repository}}:{{.Tag}}' | wc -l
```

Changing `storage-driver` does not migrate anything — the new driver starts with an empty store, so export first when the images cannot be re-pulled.

```bash
# Archive every tagged image before switching drivers
mkdir -p /backup/images
for img in $(docker images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>'); do
  docker save "$img" -o "/backup/images/$(echo "$img" | tr '/:' '__').tar"
done

# Restore after the switch
for tar in /backup/images/*.tar; do docker load -i "$tar"; done
```

### Registry Mirrors, Proxies, and Insecure Registries

```json
{
  "registry-mirrors": ["https://mirror.internal.example.com"],
  "insecure-registries": ["registry.lab:5000"],
  "max-concurrent-downloads": 6,
  "max-concurrent-uploads": 6
}
```

The HTTP proxy for image pulls is not a `daemon.json` key — the systemd unit environment is the only place the daemon reads it.

```bash
# /etc/systemd/system/docker.service.d/http-proxy.conf
# [Service]
# Environment="HTTP_PROXY=http://proxy.internal:3128"
# Environment="NO_PROXY=localhost,127.0.0.1,.internal"
sudo systemctl daemon-reload
sudo systemctl restart docker

# Verify the mirror is actually serving the pull
docker pull alpine:3.20
```

### Remote Access and TLS

```json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"],
  "tlsverify": true,
  "tlscacert": "/etc/docker/tls/ca.pem",
  "tlscert": "/etc/docker/tls/server-cert.pem",
  "tlskey": "/etc/docker/tls/server-key.pem"
}
```

The packaged systemd unit passes `-H fd://` on its own command line, and an explicit `-H` always wins over `hosts` in the config file. On a systemd host, add the listener through a drop-in instead of `daemon.json`.

```bash
# /etc/systemd/system/docker.service.d/tcp.conf
# [Service]
# ExecStart=
# ExecStart=/usr/bin/dockerd -H fd:// -H tcp://0.0.0.0:2376 --tlsverify \
#   --tlscacert=/etc/docker/tls/ca.pem \
#   --tlscert=/etc/docker/tls/server-cert.pem \
#   --tlskey=/etc/docker/tls/server-key.pem
sudo systemctl daemon-reload
sudo systemctl restart docker

# Client-side check from another machine
docker --tlsverify \
  --tlscacert ca.pem --tlscert cert.pem --tlskey key.pem \
  -H tcp://engine.internal:2376 version
```

An unauthenticated `tcp://0.0.0.0:2375` listener is root on the host for anyone who can reach the port. There is no middle ground: either TLS with client certificates, or SSH transport.

### Contexts

```bash
# Register engines once, then switch without editing config by hand
docker context create staging --docker "host=ssh://deploy@staging.internal"
docker context create prod --docker "host=tcp://engine.prod:2376"

docker context ls
docker context use staging
docker --context default ps
docker context inspect staging --format '{{.Endpoints.docker.Host}}'

# Remove a context you no longer use
docker context rm staging
```

### Rootless Mode

```bash
# Install the user-scoped daemon (no root, no socket in /var/run)
dockerd-rootless-setuptool.sh install

systemctl --user enable --now docker
docker context use rootless

# The daemon exposes its socket under $XDG_RUNTIME_DIR
docker info --format '{{.SecurityOptions}}'
echo "$DOCKER_HOST"
```

Rootless cannot bind privileged ports, cannot mount over arbitrary host paths, and needs `--network host` replaced by `slirp4netns` or `pasta` behaviour changes. Treat it as a per-developer isolation tool, not a drop-in for a production engine.

### Engine Metrics and Logs

```bash
# /etc/docker/daemon.json: { "metrics-addr": "127.0.0.1:9323" }
curl -s http://127.0.0.1:9323/metrics | grep -c '^docker_'

# Daemon-level problems: bad configs, driver failures, OOM kills of the daemon
journalctl -u docker --since "30 min ago" -p warning

# Structured daemon events instead of parsing text logs
docker events --filter type=daemon --since 1h
```

## Code Snippets

### Production daemon.json Baseline

```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "5" },
  "data-root": "/data/docker",
  "live-restore": true,
  "default-address-pools": [
    { "base": "10.201.0.0/16", "size": 24 }
  ],
  "registry-mirrors": ["https://mirror.internal.example.com"],
  "exec-opts": ["native.cgroupdriver=systemd"],
  "default-ulimits": {
    "nofile": { "Name": "nofile", "Hard": 65536, "Soft": 65536 }
  },
  "metrics-addr": "127.0.0.1:9323"
}
```

The unbounded `json-file` driver is the most common cause of a full disk on a Docker host, and `default-address-pools` is the fix for two hosts whose bridge networks collide the moment they are peered.

### systemd Drop-in for Flags daemon.json Cannot Set

```ini
# /etc/systemd/system/docker.service.d/override.conf
[Service]
Environment="HTTP_PROXY=http://proxy.internal:3128"
Environment="NO_PROXY=localhost,127.0.0.1,.internal"
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
LimitNOFILE=1048576
```

The empty `ExecStart=` line is mandatory: without clearing the inherited value, systemd appends your command to the packaged one and the engine starts with duplicate flags, which fails to parse.

### Zero-Downtime Engine Upgrade Sequence

```bash
# 1. Confirm live-restore is enabled, otherwise every restart kills workloads
docker info --format '{{.LiveRestoreEnabled}}'

# 2. Drain new workloads from the node (Swarm; adapt for your orchestrator)
docker node update --availability drain "$(docker info --format '{{.Swarm.NodeID}}')"

# 3. Upgrade the package, then restart with the new binary
sudo apt-get install --only-upgrade docker-ce
sudo systemctl restart docker

# 4. Verify nothing died and the client still speaks the same API version
docker ps --format '{{.Names}} {{.Status}}'
docker version --format '{{.Server.APIVersion}}'

# 5. Return the node to service
docker node update --availability active "$(docker info --format '{{.Swarm.NodeID}}')"
```

### Prometheus Scrape Config for the Engine

```yaml
scrape_configs:
  - job_name: docker-engine
    static_configs:
      - targets: ["engine-01.internal:9323", "engine-02.internal:9323"]
    metrics_path: /metrics
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

Bind `metrics-addr` to a private interface or the loopback and scrape it through the same secured path as the API — the endpoint exposes image counts, container counts, and cache sizes that describe your deployment shape.

### userns-remap and Bind Mount Permissions

```bash
# Enable remapping (every existing image must be re-pulled afterwards)
# /etc/docker/daemon.json: { "userns-remap": "default" }
sudo systemctl restart docker

# The subordinate ID ranges the kernel will use
grep dockremap /etc/subuid /etc/subgid

# Container root is now 100000 + UID on the host, so host-root-owned
# bind mounts are no longer writable from inside the container
ls -ld /srv/appdata
sudo chown -R 165536:165536 /srv/appdata

# Confirm the namespace is active
docker run --rm alpine:3.20 id
```

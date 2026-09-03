---
title: "PM2 Security Hardening Cheatsheet"
description: "A quick reference for securing PM2 process manager in production — dedicated least-privilege users, daemon and IPC socket protection, Node.js runtime hardening, secrets management, dependency supply-chain security, and systemd unit lockdown."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# PM2 Security Hardening Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Create a dedicated system user | `sudo useradd --system --home /opt/deploy --shell /bin/bash deploy` | Run the PM2 daemon and its applications under an unprivileged service account instead of root |
| Switch to the app user | `sudo -u deploy -i` | Execute all PM2 commands as the deploy user so the daemon and apps share one identity |
| Install PM2 for that user | `npm install -g pm2@5` | Install into the deploy user's own npm prefix, never system-wide as root |
| Start an app as the user | `pm2 start ecosystem.config.js --env production` | Managed processes inherit the deploy user's limited privileges |
| Generate a user-scoped boot script | `sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /opt/deploy` | Creates a systemd unit that boots the PM2 daemon as the deploy user |
| Persist the process list | `pm2 save` | Snapshot so `pm2 resurrect` restores applications after a reboot |
| Restrict the PM2 home | `chmod 700 /opt/deploy` and `chmod 700 /opt/deploy/.pm2` | Only the deploy user can read logs, dump files, and the IPC socket |
| Block group and world access to new files | `umask 077` | Files created by the daemon are private by default |
| Inspect IPC socket permissions | `ls -la /opt/deploy/.pm2/pub.sock` | The daemon's UNIX socket must not be reachable by other users |
| Bind privileged ports safely | `sudo setcap 'cap_net_bind_service=+ep' "$(command -v node)"` | Lets a non-root Node.js process listen on ports below 1024 |
| Verify the capability | `getcap "$(command -v node)"` | Confirms the effective capability is attached to the Node binary |
| Cap runtime memory | `NODE_OPTIONS: "--max-old-space-size=512"` in the ecosystem `env` block | Prevents unbounded heap growth inside the application process |
| Audit production dependencies | `npm audit --omit=dev --audit-level=high` | Flags known vulnerabilities in the deployed dependency tree |
| Reproducible install | `npm ci` | Installs exactly the versions pinned in `package-lock.json` |
| Scan for committed secrets | `grep -RIn -e password -e secret -e token -e "api[_-]?key" . --exclude-dir=node_modules` | Catches credentials left in source before they reach version control |
| Harden the PM2 service | `sudo systemctl edit pm2-deploy` | Applies the systemd lockdown overrides shown below |

## Common Commands

### Creating a Dedicated Service Account

```bash
# Create an unprivileged system account for the PM2 workload
sudo useradd --system --home /opt/deploy --shell /bin/bash deploy
sudo mkdir -p /opt/deploy
sudo chown deploy:deploy /opt/deploy

# Become the deploy user and verify the identity
sudo -u deploy -i
whoami   # -> deploy
```

Never run `pm2 start` under `sudo` unless a specific command (such as `pm2 startup`) genuinely requires root. A root-owned daemon means every managed application runs with root privileges and every compromise of one app becomes a compromise of the host.

### Installing PM2 as the Deploy User

```bash
# As the deploy user: install PM2 into that user's own prefix
sudo -u deploy -i
npm install -g pm2@5
pm2 --version

# Start the application under the limited account
pm2 start ecosystem.config.js --env production
pm2 save
```

Pin the PM2 major version (`pm2@5`) so an unpinned `latest` upgrade cannot silently change daemon behavior in production.

### Protecting the PM2 Home and IPC Socket

```bash
# Tighten permissions on the PM2 home directory
chmod 700 /opt/deploy
chmod 700 /opt/deploy/.pm2

# Ensure new files (logs, dumps, sockets) are not world-readable
echo "umask 077" >> /opt/deploy/.bashrc

# Verify the IPC socket is private
ls -la /opt/deploy/.pm2/pub.sock
# Expected: srwx------ (socket, owner read/write only)

# Verify log files are not exposed to other users
ls -la /opt/deploy/.pm2/logs/
```

The `.pm2` directory contains the daemon's IPC socket, process dump files, and all application logs. If another user can read it, they can observe environment variables, request patterns, and internal service topology.

### Binding Privileged Ports without Root

```bash
# Grant the Node.js binary the capability to bind ports below 1024
sudo setcap 'cap_net_bind_service=+ep' "$(command -v node)"

# Confirm the capability
getcap "$(command -v node)"

# Remove the capability when it is no longer needed
sudo setcap -r "$(command -v node)"
```

With this capability in place, a non-root application can listen on port 80 or 443 directly, which removes the need to run PM2 as root or to wrap it in a `sudo` reverse proxy just for port binding.

### Auditing and Pinning Dependencies

```bash
# Inside the application directory
cd /opt/deploy/app

# Check the production dependency tree for known vulnerabilities
npm audit --omit=dev --audit-level=high

# Install exactly what package-lock.json declares
npm ci --omit=dev

# Review outdated packages regularly
npm outdated
```

Prefer `npm ci` over `npm install` in deployment pipelines. `npm install` can mutate the lockfile and introduce undeclared versions; `npm ci` fails fast on any lockfile mismatch.

### Scanning for Leaked Secrets

```bash
# Quick pre-push scan for credentials in the repository
grep -RInE "(password|passwd|secret|token|api[_-]?key)\s*[:=]" \
  --include="*.js" --include="*.json" --include="*.env*" \
  --exclude-dir=node_modules /opt/deploy/app || true

# Confirm the ecosystem file carries no credentials
grep -n "PASSWORD\|API_KEY" ecosystem.config.js || echo "clean"
```

If a secret ever lands in git history, rotate it immediately — deleting the file is not enough, because the credential remains in commit history.

### Hardening the Systemd Unit

```bash
# pm2 startup prints the unit name, typically pm2-deploy.service
sudo systemctl edit pm2-deploy
```

Apply the lockdown overrides from the Code Snippets section, then reload:

```bash
sudo systemctl daemon-reload
sudo systemctl restart pm2-deploy
sudo systemctl status pm2-deploy --no-pager
```

Verify the service runs as the deploy user, not as root:

```bash
systemctl show pm2-deploy -p User -p NoNewPrivileges -p ProtectSystem
```

## Code Snippets

### Security-Conscious Ecosystem File

```javascript
// ecosystem.config.js — least-privilege baseline for a PM2 workload
module.exports = {
  apps: [
    {
      name: 'api',
      script: 'dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      // Never store credentials here: they become visible in `pm2 describe`
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'
      },
      out_file: '/opt/deploy/.pm2/logs/api-out.log',
      error_file: '/opt/deploy/.pm2/logs/api-error.log',
      merge_logs: true,
      time: true
    }
  ]
};
```

### Loading Secrets at Runtime

```javascript
// In the application: read credentials from a 0600 file owned by the deploy user
const fs = require('fs');

function loadSecrets(path = '/opt/deploy/secrets/api.json') {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (err) {
    console.error('Failed to load secrets — refusing to start');
    process.exit(1);
  }
}

// Fail closed: do not fall back to empty or hard-coded credentials
const secrets = loadSecrets();
```

Store the secrets file with `chmod 600 /opt/deploy/secrets/api.json` and keep it outside the repository entirely. Loading secrets from a protected file keeps them out of the process list, the ecosystem file, and the PM2 logs.

### Systemd Override File

```ini
# /etc/systemd/system/pm2-deploy.service.d/override.conf
[Service]
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/opt/deploy/.pm2/logs
RestrictSUIDSGID=true
RestrictNamespaces=true
```

```bash
# Apply and verify
sudo systemctl daemon-reload
sudo systemctl restart pm2-deploy
systemctl show pm2-deploy -p NoNewPrivileges -p ProtectSystem --no-pager
```

The `NoNewPrivileges=true` flag is especially important for a process manager: even if a managed application is compromised, it cannot escalate privileges through setuid binaries. `ProtectSystem=full` makes system directories read-only, and `ReadWritePaths` whitelists only the directories the PM2 daemon actually writes to.

### CI Secret Scan

```bash
# Continuous integration step: fail the build on leaked credentials
if grep -RInE "(password|passwd|secret|token|api[_-]?key)\s*[:=]" \
     --exclude-dir=node_modules --exclude-dir=.git .; then
  echo "Potential secret detected in repository" >&2
  exit 1
fi
echo "Secret scan passed"
```

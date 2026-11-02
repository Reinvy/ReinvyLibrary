---
title: "PM2 Module Ecosystem and Custom Modules Cheatsheet"
description: "A quick reference for PM2's module system — installing and updating modules from npm or a repository, per-module configuration, authoring an internal module with the pmx entry point, custom process-list rows, and packaging for private distribution."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# PM2 Module Ecosystem and Custom Modules Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Install a module from npm | `pm2 install pm2-logrotate` | Downloads the package into `~/.pm2/node_modules` and supervises it as a module instead of an app |
| Pin an exact version | `pm2 install pm2-logrotate@3.0.0` | Passes the spec through to npm so a fleet of hosts installs the same build |
| Install straight from a repository | `pm2 install pm2-hive/pm2-docker` | Accepts an `owner/repo` shorthand when the module is not published |
| Update an installed module | `pm2 module:update pm2-logrotate` | Re-resolves the module to the newest matching version without touching applications |
| Restart only the module | `pm2 restart pm2-logrotate` | Recycles the module process; applications keep their uptime |
| Inspect a module | `pm2 describe pm2-logrotate` | Shows the module script path, restart count, memory, and resolved interpreter |
| Scaffold a module | `pm2 module:generate pm2-heartbeat` | Creates the boilerplate folder with `package.json`, an entry point, and a README |
| Install from a local folder | `pm2 install ./pm2-heartbeat` | Development mode: file watching is on, so every edit restarts the module |
| Show effective configuration | `pm2 conf pm2-logrotate` | Prints the configuration values the running module actually sees |
| Change one value | `pm2 set pm2-logrotate:retain 14` | Writes to `~/.pm2/module_conf.json` and restarts the module automatically |
| Read one value | `pm2 get pm2-logrotate:retain` | Prints a single configuration key for scripts and health checks |
| Clear an override | `pm2 unset pm2-logrotate:retain` | Drops the override so the `config` default from `package.json` applies again |
| Change several values | `pm2 multiset "pm2-logrotate:retain 14 pm2-logrotate:compress true"` | One daemon round-trip for a batch of keys |
| Tail module logs | `pm2 logs pm2-logrotate --lines 100` | Module logs land in the same `~/.pm2/logs` layout as application logs |
| Package for private distribution | `pm2 package` | Validates the module folder and builds a tarball for internal hosting |
| Publish a new version | `pm2 publish --npm` | Bumps the minor version, commits, pushes, and runs `npm publish` |

## Common Commands

### Installing and Updating Modules

```bash
# Install a community module and confirm it landed as a module, not an app
pm2 install pm2-logrotate
pm2 describe pm2-logrotate | grep -E "script path|exec mode|status"

# Update in place, then verify the new version is the one running
pm2 module:update pm2-logrotate
pm2 describe pm2-logrotate | grep -E "version|restarts"

# Install from a Git repository when there is no published package
pm2 install pm2-hive/pm2-docker

# Remove a module completely (process entry, folder, and its config block)
pm2 uninstall pm2-heartbeat
```

Module installs run npm under the daemon's `PM2_HOME`, so `~/.pm2/node_modules` is where every installed module lives. Deleting that folder by hand silently breaks every module on the host; always go through `pm2 uninstall`.

### Inspecting Installed Modules

```bash
# Modules appear in the normal process list next to applications
pm2 ls

# Read the module's runtime metadata, including its resolved script path
pm2 describe pm2-logrotate

# Confirm what is actually on disk and which version resolved
ls -1 ~/.pm2/node_modules | grep -v -E "^(\.|@pm2|pmx|pm2$)"
cat ~/.pm2/node_modules/pm2-logrotate/package.json | grep '"version"'

# Print the persisted configuration overrides for every module
cat ~/.pm2/module_conf.json
```

`module_conf.json` sits directly under `PM2_HOME`. Two daemons with different `PM2_HOME` values therefore have independent module configuration, which is the usual reason a fix "works on staging but not in production".

### Configuring Modules

```bash
# Show every configuration key the module exposes
pm2 conf pm2-logrotate

# Change one key; the module restarts on its own after the write
pm2 set pm2-logrotate:retain 14

# Batch several keys in a single call
pm2 multiset "pm2-logrotate:retain 14 pm2-logrotate:compress true pm2-logrotate:max_size 20M"

# Read a single key for a monitoring script
pm2 get pm2-logrotate:retain

# Remove an override so the package default applies
pm2 unset pm2-logrotate:retain
```

Values are cast automatically to boolean, number, or string based on the existing value, and each `pm2 set` restarts the target module. Batch related keys with `pm2 multiset` so a module is restarted once rather than three times.

### Authoring a Module in Place

```bash
# Generate the boilerplate, then install the folder itself
pm2 module:generate pm2-heartbeat
cd pm2-heartbeat
pm2 install .

# Watch mode is active, so editing index.js restarts the module immediately
pm2 logs pm2-heartbeat --lines 50

# Force a restart when you change package.json metadata instead of source
pm2 restart pm2-heartbeat

# Remove the local install when the experiment ends
pm2 uninstall pm2-heartbeat
```

A folder install keeps a link to your working copy, so the module you are editing is the module that runs. Never leave a folder install on a production host: the source tree becomes a runtime dependency.

### Packaging and Publishing

```bash
# Validate and build a tarball for an internal registry or artifact store
cd pm2-heartbeat
pm2 package
ls -1 *.tar.gz

# Publish: bumps the minor version, commits, pushes, and runs npm publish
pm2 publish --npm

# Or hand the tarball to a host that cannot reach npm
scp pm2-heartbeat-*.tar.gz deploy@host:/opt/pm2-modules/
ssh deploy@host "cd /opt/pm2-modules && tar -xzf pm2-heartbeat-*.tar.gz && pm2 install ./package"
```

## Code Snippets

### Module package.json with Configuration Defaults

```json
{
  "name": "pm2-heartbeat",
  "version": "1.0.0",
  "description": "Emits a heartbeat metric and exposes on-demand health checks",
  "dependencies": {
    "pmx": "latest"
  },
  "config": {
    "interval_seconds": 30,
    "endpoint": "https://status.internal/ingest",
    "verbose": false
  },
  "apps": [
    {
      "script": "index.js",
      "merge_logs": true,
      "max_memory_restart": "200M",
      "env": {
        "PM2_EXTRA_DISPLAY": "true"
      }
    }
  ],
  "author": "Platform Team",
  "license": "MIT"
}
```

The `config` block supplies defaults that `pm2 set` can override. The `apps` block describes how the module process is supervised, which is why anything valid in an ecosystem file — `merge_logs`, `max_memory_restart`, `env` — works here too.

### Module Entry Point with pmx.initModule

```javascript
const pmx = require('pmx');

// initModule returns the resolved configuration and wires the module into the daemon
const conf = pmx.initModule(
  {
    // Optional: monitor an external PID instead of the module process itself
    pid: pmx.resolvePidPaths(['/var/run/redis.pid']),
  },
  (err, resolved) => {
    if (err) {
      console.error('module init failed:', err.message);
      process.exit(1);
    }

    require('./heartbeat')(resolved);
  }
);

process.on('SIGINT', () => {
  console.log('module stopping, heartbeat count:', conf.interval_seconds);
  process.exit(0);
});
```

### Reading Configuration Values in Business Logic

```javascript
// heartbeat.js — receives the resolved configuration from pmx.initModule
module.exports = function heartbeat(conf) {
  const intervalMs = Number(conf.interval_seconds) * 1000;
  const endpoint = conf.endpoint;

  const timer = setInterval(async () => {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ts: Date.now(), host: require('os').hostname() }),
      });
      if (conf.verbose) console.log('heartbeat sent');
    } catch (error) {
      // Never throw out of a timer: the module would restart in a loop
      console.error('heartbeat failed:', error.message);
    }
  }, intervalMs);

  process.on('SIGTERM', () => clearInterval(timer));
};
```

Every value from `config` arrives already type-cast, so `verbose` is a boolean even when an operator writes `pm2 set pm2-heartbeat:verbose true`. Re-read configuration on restart rather than caching it at import time in long-lived timers.

### Custom Display Row in pm2 ls

```json
{
  "apps": [
    {
      "script": "index.js",
      "env": {
        "PM2_EXTRA_DISPLAY": "true"
      }
    }
  ]
}
```

```javascript
const pmx = require('pmx');

// Replaces the default process row with the fields an operator needs
pmx.configureModule({
  human_info: [
    ['Status', 'heartbeat running'],
    ['Endpoint', 'status.internal'],
    ['Interval', '30s'],
  ],
});
```

Setting `PM2_EXTRA_DISPLAY` in the module's `env` is what enables the custom row; without it PM2 keeps rendering the standard process columns and `configureModule` output is ignored.

### Idempotent Module Install Script

```bash
#!/usr/bin/env bash
set -euo pipefail

MODULE="pm2-logrotate"
WANTED_CONFIG="pm2-logrotate:retain=14"

if pm2 describe "$MODULE" >/dev/null 2>&1; then
  echo "$MODULE already installed, updating"
  pm2 module:update "$MODULE"
else
  echo "$MODULE missing, installing"
  pm2 install "$MODULE"
fi

pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 conf "$MODULE" | grep -q "retain" || {
  echo "configuration did not apply" >&2
  exit 1
}
echo "module ready: $WANTED_CONFIG"
```

Run this from the deploy pipeline before `pm2 reload` so a fresh host and an existing host converge on the same module state. Guarding on `pm2 describe` keeps the script safe to run on every deploy.

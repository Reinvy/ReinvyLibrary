---
title: "Redis Security Cheatsheet"
description: "A quick reference for securing Redis deployments — authentication with requirepass, Redis 6+ ACLs, TLS encryption, network hardening, command renaming, dangerous command protection, and production security monitoring."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Redis Security Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Set password authentication | `requirepass <password>` | Require an AUTH password for every connection (redis.conf) |
| Authenticate with password | `AUTH <password>` | Authenticate to the server with the configured password |
| Authenticate as ACL user | `AUTH <username> <password>` | Authenticate as a specific ACL user (Redis 6+) |
| List ACL users | `ACL LIST` | Show every configured ACL user and their rules |
| View a user's rules | `ACL GETUSER <username>` | Display the exact permissions of one ACL user |
| Create or modify a user | `ACL SETUSER <username> [rules...]` | Create or update an ACL user with granular rules |
| Delete a user | `ACL DELUSER <username>` | Remove an ACL user entirely |
| List command categories | `ACL CAT` | List all command categories usable in ACL rules |
| Show current user | `ACL WHOAMI` | Return the username of the current connection |
| Generate a password hash | `ACL GENPASS [bits]` | Generate a secure random password for `>password` rules |
| Load ACL rules from file | `aclfile /etc/redis/users.acl` | Persist ACL users in a dedicated file (redis.conf) |
| Enable TLS port | `tls-port 6379` | Listen for TLS connections on the given port |
| Set TLS certificate | `tls-cert-file /path/redis.crt` | Configure the server certificate for TLS |
| Set TLS private key | `tls-key-file /path/redis.key` | Configure the server private key for TLS |
| Verify client certificates | `tls-auth-clients yes` | Require clients to present a valid client certificate |
| Encrypt replication traffic | `tls-replication yes` | Require TLS for replica and Sentinel links |
| Restrict listening interfaces | `bind 127.0.0.1` | Bind Redis to specific, private network interfaces |
| Block unauthenticated external access | `protected-mode yes` | Reject external connections when no password is set |
| Disable a command | `rename-command FLUSHALL ""` | Remove a dangerous command entirely |
| Obfuscate a command | `rename-command CONFIG "secret-name"` | Rename a dangerous command to an unguessable name |
| Check server security state | `INFO server` | Show TCP port, TLS port, and authentication configuration |

## Common Commands

### Password Authentication

```bash
# Enable password authentication in redis.conf
# requirepass S3cur3M@sterP@ssw0rd

# Authenticate on an existing connection
AUTH S3cur3M@sterP@ssw0rd
# => OK

# Authenticate from the CLI without exposing the password in history
export REDISCLI_AUTH='S3cur3M@sterP@ssw0rd'
redis-cli PING
# => PONG

# Verify that authentication is required
redis-cli -p 6379 GET secret:key
# => (error) NOAUTH Authentication required.
```

### ACL User Management

```bash
# List all users (the default user always exists)
ACL LIST
# => 1) "user default on nopass ~* &* +@all"

# Create a least-privilege user: read-only access to cache keys only
ACL SETUSER app-cache on '>s3cr3tP4ss' '~cache:*' +@read +@string +@hash

# Grant a user everything except dangerous categories
ACL SETUSER dev-team on '>DevP4ssw0rd' '~*' +@all -@dangerous -@admin

# Restrict a user to specific commands with key patterns
ACL SETUSER analytics on '>An4lyt1csP4ss' '~stats:*' +get +mget +type +ttl

# Remove a command from a user after creation
ACL SETUSER app-cache -keys

# Delete a user
ACL DELUSER old-service

# Test the rules of a user without connecting
ACL DRYRUN app-cache GET cache:home
# => OK
ACL DRYRUN app-cache FLUSHALL
# => (error) NOPERM this user has no permissions to run the 'flushall' command

# Generate a strong password for a '>password' rule
ACL GENPASS 256
# => 5f4dcc3b5aa765d61d8327deb882cf99b959d1d3...

# Persist ACLs in a file (redis.conf)
# aclfile /etc/redis/users.acl
# Then manage users directly in users.acl and reload with:
redis-cli ACL LOAD
```

### TLS Configuration

```bash
# Minimal TLS configuration in redis.conf
# tls-port 6379
# port 0
# tls-cert-file /etc/redis/tls/redis.crt
# tls-key-file /etc/redis/tls/redis.key
# tls-ca-cert-file /etc/redis/tls/ca.crt
# tls-auth-clients yes
# tls-replication yes

# Generate a self-signed certificate for internal use (testing only)
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout /etc/redis/tls/redis.key \
  -out /etc/redis/tls/redis.crt \
  -days 365 -subj "/CN=redis.internal"

# Connect to a TLS-enabled Redis from the CLI
redis-cli --tls \
  --cacert /etc/redis/tls/ca.crt \
  -h redis.internal -p 6379 \
  -a 'S3cur3M@sterP@ssw0rd' \
  INFO server

# Check TLS configuration at runtime
redis-cli --tls --cacert /etc/redis/tls/ca.crt -p 6379 CONFIG GET tls-port
```

### Network Hardening

```bash
# Bind to private interfaces only (redis.conf)
# bind 127.0.0.1 10.0.0.5
# protected-mode yes

# Firewall rules — allow only application servers
sudo ufw allow from 10.0.0.0/24 to any port 6379 proto tcp
sudo ufw deny 6379/tcp

# Verify what is listening
ss -tlnp | grep 6379
# => LISTEN 0 511 127.0.0.1:6379 ...

# Never expose Redis to 0.0.0.0 without TLS and authentication
# (cloud security groups should restrict port 6379 to private subnets)
```

### Command Renaming and Disabling

```bash
# Disable dangerous commands entirely (redis.conf)
# rename-command FLUSHALL ""
# rename-command FLUSHDB ""
# rename-command DEBUG ""
# rename-command SHUTDOWN ""

# Rename a command so only operators know its name (redis.conf)
# rename-command CONFIG "3f2a9c1e7b8d4e5f"
# rename-command SLAVEOF "a1b2c3d4e5f60718"

# Verify the rename took effect
redis-cli CONFIG GET maxmemory
# => (error) ERR unknown command 'CONFIG', with args beginning with:
# (use the obfuscated name instead)
redis-cli 3f2a9c1e7b8d4e5f GET maxmemory
```

### Auditing and Monitoring

```bash
# See all ACL users and their permission state
ACL LIST

# Count failed authentication attempts
redis-cli INFO stats | grep -i auth
# => total_error_replies:0

# Inspect slow log for suspicious commands
SLOWLOG GET 20
SLOWLOG RESET

# Check connected clients and their addresses
CLIENT LIST

# Monitor authentication failures live (short window only)
redis-cli MONITOR
# => 172.16.0.10:50012 [0] "auth" "wrongpassword"
```

## Code Snippets

### Hardened redis.conf

```text
# --- Network ---
bind 127.0.0.1 10.0.0.5
protected-mode yes
port 6379

# --- Authentication ---
requirepass S3cur3M@sterP@ssw0rd

# --- ACL users (Redis 6+) ---
aclfile /etc/redis/users.acl

# --- TLS (Redis 6+) ---
tls-port 6379
port 0
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
tls-auth-clients yes
tls-replication yes

# --- Command hardening ---
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command DEBUG ""
rename-command CONFIG "3f2a9c1e7b8d4e5f"

# --- Resource limits ---
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Creating Least-Privilege ACL Users

```bash
# users.acl — one line per user
user app-cache on #5f4dcc3b5aa765d61d8327deb882cf99 ~cache:* +@read +@string +@hash
user app-queue on #e10adc3949ba59abbe56e057f20f883e ~queue:* +lpush +rpop +llen +brpop
user admin on #a2d1f2c3e4b5a6978 ~* +@all -@dangerous

# Apply the file
redis-cli ACL LOAD

# Confirm
ACL LIST
# => 1) "user app-cache on #5f4dcc3b... ~cache:* +@read +@string +@hash"
# => 2) "user app-queue on #e10adc39... ~queue:* +lpush +rpop +llen +brpop"
# => 3) "user admin on #a2d1f2c3... ~* +@all -@dangerous"
# => 4) "user default on nopass ~* &* +@all"
```

### Node.js (ioredis) with TLS and ACL User

```javascript
const Redis = require('ioredis');
const fs = require('fs');

const redis = new Redis({
  host: 'redis.internal',
  port: 6379,
  username: 'app-cache',          // ACL user instead of the default user
  password: 's3cr3tP4ss',         // matches the user's >password rule
  tls: {
    ca: fs.readFileSync('/etc/ssl/certs/redis-ca.crt'),
    cert: fs.readFileSync('/etc/ssl/certs/client.crt'),
    key: fs.readFileSync('/etc/ssl/private/client.key'),
    rejectUnauthorized: true
  },
  retryStrategy: (times) => Math.min(times * 100, 2000)
});

redis.on('error', (err) => console.error('Redis security error:', err.message));

async function demo() {
  await redis.set('cache:home', 'cached-payload', 'EX', 60);
  const value = await redis.get('cache:home');
  console.log(value);
  await redis.quit();
}

demo();
```

### Docker with TLS and Password

```bash
# Run with a read-only hardened config and TLS certificates
docker run -d \
  --name redis-secure \
  --restart unless-stopped \
  -v /etc/redis/redis.conf:/usr/local/etc/redis/redis.conf:ro \
  -v /etc/redis/tls:/etc/redis/tls:ro \
  -p 127.0.0.1:6379:6379 \
  redis:7-alpine \
  redis-server /usr/local/etc/redis/redis.conf

# Verify from inside the container
docker exec -it redis-secure redis-cli --tls \
  --cacert /etc/redis/tls/ca.crt \
  -a 'S3cur3M@sterP@ssw0rd' \
  ACL WHOAMI
```

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
      - ./tls:/etc/redis/tls:ro
    ports:
      - "127.0.0.1:6379:6379"
    restart: unless-stopped
```

### Dangerous Commands Reference

```text
| Command   | Risk                                   | Mitigation                     |
|-----------|----------------------------------------|--------------------------------|
| FLUSHALL  | Deletes every key in all databases     | rename-command FLUSHALL ""     |
| FLUSHDB   | Deletes every key in one database      | rename-command FLUSHDB ""      |
| CONFIG    | Reads or writes runtime configuration  | rename-command CONFIG <secret> |
| DEBUG     | Low-level server introspection         | rename-command DEBUG ""        |
| KEYS      | Blocking O(n) scan of every key        | Block for non-admin users      |
| MONITOR   | Streams every command to the client    | Block for non-admin users      |
| EVAL      | Executes arbitrary Lua on the server   | Restrict to trusted users      |
| SLAVEOF   | Reconfigures replication on the fly    | rename-command SLAVEOF ""      |
| SHUTDOWN  | Stops the server                       | rename-command SHUTDOWN ""     |
```

### Production Security Checklist

```text
1. Never expose Redis to the public internet — bind to private interfaces or a VPC.
2. Always set requirepass or, better, create per-application ACL users (Redis 6+).
3. Enable TLS for any traffic that leaves a trusted host or crosses a network boundary.
4. Disable or rename dangerous commands (FLUSHALL, DEBUG, CONFIG, KEYS, MONITOR).
5. Keep protected-mode yes and add explicit firewall rules at the host and cloud level.
6. Run Redis as a non-root user with minimal filesystem permissions.
7. Prefer ACL categories (-@dangerous, -@admin) over blocking individual commands.
8. Store credentials in a secrets manager, rotate them regularly, and never commit them.
9. Monitor AUTH failures, slow logs, replica status, and unexpected client connections.
10. Pin the Redis image version in Docker and scan it for known CVEs.
```

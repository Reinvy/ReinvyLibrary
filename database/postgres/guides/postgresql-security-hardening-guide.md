---
title: "PostgreSQL Security Hardening Guide"
description: "A comprehensive guide to hardening PostgreSQL production deployments — strong SCRAM authentication, least-privilege role design, TLS encryption, network lockdown via pg_hba.conf, row-level security, pgaudit auditing, encryption at rest, and application-layer security best practices."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# PostgreSQL Security Hardening Guide

## Introduction

PostgreSQL is famous for its reliability and feature depth, but a default installation is tuned for developer convenience, not hostile environments. Out of the box, authentication can fall back to weak methods, every database ships with a `public` schema that everyone can write to, network rules often trust whole subnets, and nothing is audited. In production, each one of those defaults becomes an entry point: a leaked credential, a compromised app server, an insider with too many privileges, or an attacker who lands directly on the database port.

Security hardening is the discipline of systematically removing those defaults and replacing them with explicit, verifiable controls. This guide follows a defense-in-depth model, which assumes any single layer can fail and therefore layers independent controls:

- **Authentication** — prove who is connecting (SCRAM-SHA-256, certificates, LDAP).
- **Authorization** — limit what each proven identity may do (roles, privileges, row-level security).
- **Network security** — control where connections may come from (`pg_hba.conf`, TLS).
- **Data protection** — encrypt data in transit and at rest.
- **Auditing** — record what actually happened (`pgaudit`, structured logging).
- **Application hardening** — stop attacks before they reach the database (SQL injection defense, secrets management).

A hardened database is not a locked-down unusable database. Every control in this guide preserves normal operations — the goal is to make the *permission surface* explicit and minimal while keeping the database fully functional for legitimate workloads. The guide is written for teams that already run PostgreSQL in production and want to close the security gaps that default configurations leave open. It assumes familiarity with `psql`, basic role management, and `postgresql.conf`; it does not assume a security background.

## Best Practices

### 1. Authenticate Every Connection with SCRAM-SHA-256

Password authentication is only as strong as the hash algorithm used to store the password. The `md5` method stores a legacy MD5 hash that is weak against brute force and offline cracking; `trust` accepts any connection without a password at all. SCRAM-SHA-256 is the modern standard: it never sends the password over the wire, uses a per-connection random nonce to prevent replay attacks, and stores a salted, iterated hash in `pg_authid`.

```conf
# postgresql.conf
password_encryption = 'scram-sha-256'
```

After changing this setting, every new password (and every `ALTER ROLE ... PASSWORD`) is stored as SCRAM. Existing `md5`-stored passwords are upgraded automatically on the next password change. `pg_hba.conf` then references the method:

```conf
# pg_hba.conf — only accept SCRAM-encrypted password auth
hostssl all             all             0.0.0.0/0               scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
```

For human users and application roles alike, avoid `trust` entirely — even on localhost, where any local process could otherwise connect as any user. If your organization has a central identity provider, PostgreSQL also supports LDAP and GSSAPI authentication, which moves credential verification to the directory and centralizes password rotation.

### 2. Apply Least Privilege with Roles and Privileges

The single most common production mistake is running the application as the `postgres` superuser. A superuser bypasses every privilege check, can read and delete every table, and can execute arbitrary code on the host via extensions. The principle of least privilege means each role gets exactly the permissions its job requires and nothing more.

Design roles in layers:

- Keep `postgres` (superuser) for administrative operations only — never for application connections.
- Create one **application login role** per service with `LOGIN` and no superuser attributes.
- Grant schema-level and table-level privileges explicitly, never blanket `GRANT ALL ON SCHEMA public`.
- Use `REVOKE` on the `public` schema so random roles cannot create objects in it.
- Use `SET ROLE` for operational tasks rather than logging in as a privileged role.

```sql
-- Create a least-privilege application role
CREATE ROLE app_orders LOGIN PASSWORD 'replace-with-a-long-random-secret';

-- Limit to one database and one schema
REVOKE ALL ON DATABASE orders FROM PUBLIC;
GRANT CONNECT ON DATABASE orders TO app_orders;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO app_orders;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_orders;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_orders;

-- Make sure future objects stay locked down, too
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_orders;
```

Default privileges are the part teams forget: new tables created after the initial `GRANT` inherit the schema defaults, not your earlier grants, so `ALTER DEFAULT PRIVILEGES` closes that drift.

### 3. Lock Down Network Access with pg_hba.conf

`pg_hba.conf` (host-based authentication) is the network firewall of PostgreSQL. Rules are evaluated top-down and the **first matching rule wins**, so ordering matters: put the most specific rules first and end with an explicit `reject`. Each rule declares the connection type, database, user, source address, and authentication method.

```conf
# pg_hba.conf — first match wins
# Local connections (socket) use peer authentication
local  all             all                                     peer

# Reject everything from the public internet first
host   all             all             0.0.0.0/0               reject
host   all             all             ::/0                    reject

# Allow only the application subnet, with TLS and SCRAM
hostssl orders        app_orders      10.0.12.0/24            scram-sha-256
```

Also set `listen_addresses` to the specific interfaces the database should serve. Listening on `*` exposes PostgreSQL to every network the host is on; listening only on the private interface (or the loopback for a single-host deployment) shrinks the attack surface before `pg_hba.conf` even runs. For Unix socket connections, `peer` authentication maps the OS user to the database role, which is the safest local default on single-user hosts.

### 4. Encrypt Data in Transit with TLS

Without TLS, every credential and every row of data crossing the network is plaintext that any observer on the path can read. PostgreSQL has supported native TLS for a long time; enabling it is a configuration change, not an architectural one, and modern clients verify it eagerly.

```conf
# postgresql.conf
ssl = on
ssl_cert_file = '/etc/postgresql/certs/server.crt'
ssl_key_file  = '/etc/postgresql/certs/server.key'
ssl_min_protocol_version = 'TLSv1.2'
ssl_ciphers   = 'HIGH:!aNULL:!MD5'
```

The certificate should be issued by an internal CA (or a public CA for internet-facing endpoints) and must include the hostnames clients use. The key file must be owned by the `postgres` user with mode `0600` — PostgreSQL refuses to start with a world-readable key. In `pg_hba.conf`, prefer `hostssl` over plain `host` for remote connections so that unencrypted attempts are rejected rather than silently downgraded. On the client side, connection strings should use `sslmode=verify-full`, which validates the certificate chain and hostname, defeating man-in-the-middle attacks that a plain `require` mode does not.

### 5. Implement Row-Level Security for Multi-Tenant Data

Privileges control *which tables* a role can touch, but row-level security (RLS) controls *which rows* within a table. For multi-tenant applications — where every user's data lives in the same table but must be invisible to other tenants — RLS is the difference between one query mistake leaking every customer's records and one query returning an empty set.

```sql
-- Enable RLS on the table (existing rows are still visible until FORCE)
ALTER TABLE app.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.orders FORCE ROW LEVEL SECURITY;

-- Tenant rows carry a tenant_id; the app role sets it per session
CREATE POLICY tenant_isolation ON app.orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Admins and service roles that must see everything opt out explicitly
ALTER TABLE app.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_full_access ON app.orders
  USING (pg_has_role(current_user, 'orders_admin', 'MEMBER'));
```

`FORCE ROW LEVEL SECURITY` is the critical line: without it, table owners bypass RLS entirely, which silently defeats the policy for the very role that usually runs migrations. Application roles set `app.tenant_id` once per session (from the authenticated token, never from client input) and every query is automatically scoped. For read-only filtering, `security_barrier` views provide a complementary layer that prevents the planner from leaking filtered rows through join ordering.

### 6. Audit Activity with pgaudit and Structured Logging

You cannot secure what you cannot see. The `pgaudit` extension writes a detailed, session-level audit trail of every executed statement — who ran it, when, on which object, and whether it succeeded. Unlike `log_statement`, which only records the statement text, `pgaudit` records the full picture including parameter values, roles, and object names, and it is designed to be shipped to centralized log collectors.

```conf
# postgresql.conf
shared_preload_libraries = 'pgaudit'
pgaudit.log = 'write, ddl, role'
pgaudit.log_catalog = off
pgaudit.log_client = off
pgaudit.log_level = 'log'
```

```sql
-- Create the extension in the database you want to audit
CREATE EXTENSION IF NOT EXISTS pgaudit;
```

Pair `pgaudit` with disciplined PostgreSQL logging: `log_line_prefix` should include a timestamp, user, database, and client address so audit entries are correlation-ready, and `log_destination = 'csvlog'` (or `syslog`) makes them machine-parseable. Rotate logs and ship them to a central SIEM; audit logs that live only on the database server disappear with the server.

### 7. Protect Data at Rest

Encryption in transit does nothing when the attacker steals the disk. Data at rest has three layers, each appropriate for a different threat:

- **Full-disk / volume encryption** (LVM LUKS, cloud EBS encryption): protects against physical theft of the server or its volumes. It is transparent to PostgreSQL and should be enabled at the infrastructure layer for every database host.
- **Column-level encryption with `pgcrypto`**: protects specific sensitive fields (payment tokens, API keys, personal identifiers) so that even a dumped database file or a leaked backup does not expose them. The application encrypts and decrypts, but `pgcrypto` provides the primitives (`pgp_sym_encrypt`, `pgp_pub_encrypt`) and keeps the SQL ergonomic.
- **Encrypted backups**: `pgBackRest` and `pg_probackup` both support repository encryption with a key separate from the database. A backup tape is the least-guarded copy of your data; encryption keys must never ride in the same backup.

```sql
-- Column-level encryption with pgcrypto (application holds the passphrase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO app.payment_tokens (user_id, token)
VALUES (123, pgp_sym_encrypt('tok_live_123456', current_setting('app.crypto_key')));
```

Key management is the hard part of encryption: store keys in a dedicated secrets manager or KMS, rotate them on a schedule, and never check them into application repositories or connection strings.

### 8. Harden Applications Against SQL Injection and Credential Leaks

The database is the last line of defense, but the best security stops attacks before they reach it. SQL injection is still the most common way databases get compromised, and the fix is entirely in the application layer: use parameterized queries (prepared statements) for every dynamic value, never string-concatenate user input into SQL, and validate input types at the API boundary.

```python
# Python (psycopg) — parameterized, injection-safe
cursor.execute(
    "SELECT * FROM app.orders WHERE tenant_id = %s AND id = %s",
    (tenant_id, order_id)
)
```

Application-side secrets hygiene complements database hardening: connection strings should use dedicated, least-privilege roles; credentials should come from environment variables or a secrets manager, never from code; and connection pools should be configured with TLS `verify-full` so the database identity is validated on every new connection. Consider also setting `statement_timeout` and `idle_in_transaction_session_timeout` at the role level — a compromised application session should not be able to hold the database hostage with long-running queries.

## Implementation Steps

### Step 1: Take an Inventory of Users, Roles, and Access

Before changing anything, know what you have. List every role, its attributes, and the current network rules.

```sql
-- Every role, its attributes, and membership
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin,
       rolpassword IS NOT NULL AS has_password, rolvaliduntil
FROM pg_roles
ORDER BY rolsuper DESC, rolname;

-- Effective network rules as PostgreSQL resolves them
SELECT type, database, user_name, address, auth_method
FROM pg_hba_file_rules
ORDER BY rule_number;
```

```bash
# Also verify from the OS side: who can reach the port?
ss -ltnp | grep 5432
```

Record which roles the applications use, which IPs connect, and which roles still have `rolsuper = true`. This inventory is the baseline you will compare against after each step.

### Step 2: Enforce SCRAM-SHA-256 for All Passwords

Disable weak password storage and upgrade every role that still uses MD5.

```conf
# postgresql.conf
password_encryption = 'scram-sha-256'
```

```sql
-- Force re-hash on next use; the password change re-stores as SCRAM
ALTER ROLE app_orders PASSWORD 'replace-with-a-new-long-random-secret';
ALTER ROLE alice PASSWORD 'replace-with-alice-s-new-password';
```

Then confirm no role has a `trust` or `md5` authentication path left in `pg_hba.conf` and that the only password method referenced is `scram-sha-256`:

```sql
SELECT type, user_name, address, auth_method
FROM pg_hba_file_rules
WHERE auth_method IN ('trust', 'md5', 'password');
```

This query should return zero rows. The `password` method (plaintext over the wire, even with TLS this is worse than SCRAM) must also be eliminated.

### Step 3: Restructure Roles with Least Privilege

Create dedicated application roles and strip the defaults that give everyone write access.

```sql
-- Lock down the public schema on every database
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM PUBLIC;

-- Application role
CREATE ROLE app_orders LOGIN PASSWORD 'replace-with-a-long-random-secret';
GRANT CONNECT ON DATABASE orders TO app_orders;
GRANT USAGE ON SCHEMA app TO app_orders;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_orders;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_orders;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_orders;

-- Migration/deployment role that can change schema but not read data
CREATE ROLE app_migrations LOGIN PASSWORD 'replace-with-another-long-random-secret';
GRANT CONNECT ON DATABASE orders TO app_migrations;
GRANT CREATE ON SCHEMA app TO app_migrations;
```

Ensure no application uses the `postgres` superuser:

```sql
SELECT usename, application_name, client_addr
FROM pg_stat_activity
WHERE usename = 'postgres' AND application_name NOT IN ('psql', 'pg_dump');
```

Every row in that result is a violation to fix in the application's connection configuration.

### Step 4: Configure TLS Encryption

Generate or obtain server certificates and switch PostgreSQL into TLS mode.

```bash
# Self-signed for internal CA testing; production should use a real CA
mkdir -p /etc/postgresql/certs && cd /etc/postgresql/certs
openssl req -new -x509 -days 3650 -nodes \
  -keyout server.key -out server.crt \
  -subj "/CN=db.internal.example.com"
chown postgres:postgres server.key server.crt
chmod 0600 server.key
```

```conf
# postgresql.conf
ssl = on
ssl_cert_file = '/etc/postgresql/certs/server.crt'
ssl_key_file  = '/etc/postgresql/certs/server.key'
ssl_min_protocol_version = 'TLSv1.2'
```

Reload and verify:

```bash
pg_ctl reload -D /var/lib/postgresql/data   # or: SELECT pg_reload_conf();
```

```sql
-- Only TLS connections should be visible from remote hosts
SELECT pid, usename, client_addr, ssl, version
FROM pg_stat_ssl JOIN pg_stat_activity USING (pid)
WHERE client_addr IS NOT NULL;
```

Every remote session should report `ssl = t`. Client connection strings must use `sslmode=verify-full` (or `sslmode=require` as an absolute minimum) and the correct `sslrootcert` for the internal CA.

### Step 5: Tighten pg_hba.conf

Rewrite `pg_hba.conf` with explicit allow rules and an explicit rejection tail. Order matters — the first matching rule wins.

```conf
# TYPE  DATABASE  USER        ADDRESS          METHOD
# Local admin access through the Unix socket
local   all       postgres                      peer
local   all       all                           scram-sha-256

# Application subnet — TLS only, SCRAM only
hostssl orders    app_orders 10.0.12.0/24       scram-sha-256
hostssl orders    app_migrations 10.0.14.0/24   scram-sha-256

# Replication from the standby subnet
hostssl replication repl_user 10.0.13.0/24      scram-sha-256

# Explicit deny for everything else (must be last — first match wins)
host    all       all       0.0.0.0/0           reject
host    all       all       ::/0                reject
```

After reloading, test from the application subnet, from a disallowed subnet, and via plaintext (no TLS) — the last two must fail loudly:

```bash
psql "host=10.0.99.99 port=5432 dbname=orders user=app_orders sslmode=require"  # must fail
psql "host=10.0.12.5 port=5432 dbname=orders user=app_orders sslmode=disable"  # must fail (no hostssl match)
```

```conf
# listen_addresses should name specific interfaces, not '*'
listen_addresses = '10.0.12.5,127.0.0.1'
```

### Step 6: Enable Row-Level Security on Tenant Tables

For tables that hold per-tenant data, enable and force RLS, then create tenant-isolation policies.

```sql
ALTER TABLE app.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.orders FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON app.orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Admin override for support and data teams
CREATE POLICY admin_full_access ON app.orders
  USING (pg_has_role(current_user, 'orders_admin', 'MEMBER'));
```

Update the application's connection bootstrap so every session sets its tenant context immediately after connect — from the authenticated session token, never from a client-supplied parameter:

```python
# psycopg connection bootstrap
conn.execute("SET app.tenant_id = %s", (tenant_uuid,))
```

Verify isolation with two sessions impersonating different tenants: each must see only its own rows, and a `WITH CHECK` violation (writing another tenant's id) must raise an error.

```sql
SET app.tenant_id = '11111111-1111-1111-1111-111111111111';
SELECT count(*) FROM app.orders;   -- tenant A's count

SET app.tenant_id = '22222222-2222-2222-2222-222222222222';
SELECT count(*) FROM app.orders;   -- tenant B's count, different
```

### Step 7: Deploy pgaudit Audit Logging

Install the extension and route its output into structured, centralized logs.

```conf
# postgresql.conf
shared_preload_libraries = 'pgaudit'
pgaudit.log = 'write, ddl, role'
pgaudit.log_catalog = off
pgaudit.log_parameter = on
pgaudit.log_relation = on
log_destination = 'csvlog'
log_line_prefix = '%m [%p] %q%u@%d %a %r '
```

```bash
# Install the extension package, then (re)start PostgreSQL so the preload takes effect
apt-get install -y postgresql-16-pgaudit   # or the matching version
systemctl restart postgresql
```

```sql
CREATE EXTENSION IF NOT EXISTS pgaudit;
```

Trigger a test write and confirm the audit trail captured it:

```sql
INSERT INTO app.orders (id, tenant_id, total) VALUES (1, '11111111-1111-1111-1111-111111111111', 42.00);
```

```bash
# The CSV log should contain an AUDIT entry naming the role, statement, and object
grep -i 'AUDIT' /var/log/postgresql/postgresql-16-main.csv | tail -5
```

Wire the CSV logs into your log shipper (Promtail, Filebeat, rsyslog forwarder) so audit events reach the SIEM before the database server can be destroyed by the attacker it recorded.

### Step 8: Run a Security Review and Document the Baseline

Close the loop with a verification pass that exercises every layer at once.

```sql
-- 1. No weak authentication methods remain
SELECT type, user_name, address, auth_method
FROM pg_hba_file_rules
WHERE auth_method IN ('trust', 'md5', 'password');

-- 2. No superuser application sessions
SELECT usename, application_name, client_addr
FROM pg_stat_activity
WHERE usename = 'postgres';

-- 3. TLS is active for all remote connections
SELECT count(*) FILTER (WHERE NOT ssl) AS insecure_remote
FROM pg_stat_ssl JOIN pg_stat_activity USING (pid)
WHERE client_addr IS NOT NULL;

-- 4. RLS is enabled on tenant tables
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('orders', 'customers', 'payments');

-- 5. Audit extension is loaded
SELECT name, setting FROM pg_settings WHERE name = 'shared_preload_libraries';
```

Document the results — the role matrix, the `pg_hba.conf` rule set, the certificate rotation date, and the audit log destination — in the team's runbook. Security is an ongoing process, not a one-time flag day: schedule quarterly reviews of roles and rules, rotate TLS certificates and database passwords on a fixed cadence, and treat every new feature that touches the database as an occasion to re-run this checklist. A documented baseline is what lets you notice drift before it becomes a breach.

---
title: "MongoDB Security Cheatsheet"
description: "A quick reference for securing MongoDB deployments — authentication mechanisms, RBAC authorization, TLS, encryption at rest, field-level encryption, auditing, and network hardening."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# MongoDB Security Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Enable authentication | `security.authorization: enabled` | Requires credentials for every connection |
| Create admin user | `db.createUser({ user: "admin", pwd: "...", roles: ["root"] })` | First user is created through the localhost exception |
| SCRAM-SHA-256 | `authMechanism=SCRAM-SHA-256` | Default password-based authentication mechanism |
| x.509 certificate auth | `authMechanism=MONGODB-X509` | Mutual TLS using client certificates |
| LDAP auth | `authMechanism=PLAIN` + `security.ldap` | Enterprise/Atlas only; direct or proxy bind |
| Kerberos auth | `authMechanism=GSSAPI` | Enterprise/Atlas only |
| AWS IAM auth | `authMechanism=MONGODB-AWS` | Atlas only; EC2 role or access keys |
| List built-in roles | `db.getRoles({ showPrivileges: true })` | Shows every role with its privileges |
| Grant a role | `db.grantRolesToUser("user", [ ... ])` | Adds roles to an existing user |
| Enable TLS | `net.tls.mode: requireTLS` | Encrypts all wire-protocol traffic |
| Encryption at rest | `security.enableEncryption` + KMIP | WiredTiger native encryption |
| Field-level encryption | `encryptedFieldsMap` / CSFLE | Client-side / in-use encryption |
| Enable auditing | `auditLog.destination: file` | Audits auth, DDL, and DML events |
| Bind IP | `net.bindIp: 127.0.0.1` | Restricts network exposure |
| Keyfile internal auth | `security.keyFile` | Authenticates replica set / shard members |

## Common Commands

### Starting mongod with Authentication

```bash
mongod --auth --port 27017 --dbpath /data/db
# or in mongod.conf:
# security:
#   authorization: enabled
```

### Connecting with Authentication

```bash
mongosh "mongodb://appUser:pass@localhost:27017/mydb?authSource=admin"
mongosh --host localhost --port 27017 --username appUser --password --authenticationDatabase admin
```

### Enabling TLS

```bash
mongod --tlsMode requireTLS --tlsCertificateKeyFile /etc/ssl/mongodb.pem --tlsCAFile /etc/ssl/ca.pem
mongosh "mongodb://localhost:27017/?tls=true&tlsCAFile=/etc/ssl/ca.pem"
```

### Enabling Auditing

```bash
mongod --auditDestination file --auditFormat JSON --auditPath /var/log/mongodb/audit.log \
  --auditFilter '{ atype: { $in: ["authenticate", "createUser", "dropUser", "grantRolesToUser"] } }'
```

### Generating a Keyfile for Replica Set Internal Auth

```bash
openssl rand -base64 756 > /etc/mongodb-keyfile
chmod 400 /etc/mongodb-keyfile
mongod --replSet rs0 --keyFile /etc/mongodb-keyfile --auth
```

### Enabling Encryption at Rest (KMIP)

```bash
mongod --enableEncryption --kmipServerName kmip.example.com --kmipPort 5696 \
  --kmipClientCertificateFile /etc/ssl/kmip-client.pem
```

## Code Snippets

### Bootstrap the First Admin User (localhost exception)

```javascript
use admin;
db.createUser({
  user: "admin",
  pwd: passwordPrompt(),
  roles: [ { role: "root", db: "admin" } ]
});
```

### Create an Application User with Least Privilege

```javascript
use shop;
db.createUser({
  user: "shopApp",
  pwd: passwordPrompt(),
  roles: [
    { role: "readWrite", db: "shop" },
    { role: "read", db: "reports" }
  ]
});
```

### Create a Custom Role

```javascript
use admin;
db.createRole({
  role: "ordersAnalyst",
  privileges: [
    {
      resource: { db: "shop", collection: "orders" },
      actions: [ "find", "aggregate", "collStats" ]
    }
  ],
  roles: []
});
db.grantRolesToUser("analyst", [ { role: "ordersAnalyst", db: "admin" } ]);
```

### Explicit Encryption with CSFLE (in-use encryption)

```javascript
const { MongoClient } = require("mongodb");
const { ClientEncryption } = require("mongodb-client-encryption");

const client = new MongoClient("mongodb://localhost:27017");
const encryption = new ClientEncryption(client, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders: {
    local: { key: Buffer.from("96-byte-local-master-key", "base64") }
  }
});

const keyId = await encryption.createDataKey("local");
const ciphertext = await encryption.encrypt("4111111111111111", {
  keyId: keyId,
  algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
});
```

### Checking Privileges and Security Status

```javascript
db.runCommand({ connectionStatus: 1 });
db.getUser("shopApp");
db.runCommand({ usersInfo: { user: "shopApp", db: "shop" }, showPrivileges: true });
```

### Rotating a User Password

```javascript
db.changeUserPassword("shopApp", passwordPrompt());
```

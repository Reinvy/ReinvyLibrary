---
title: "Cheatsheet Keamanan MongoDB"
description: "Referensi cepat untuk mengamankan deployment MongoDB — mekanisme autentikasi, otorisasi RBAC, TLS, enkripsi saat diam, field-level encryption, audit, dan penguatan jaringan."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheatsheet Keamanan MongoDB

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Mengaktifkan autentikasi | `security.authorization: enabled` | Mengharuskan kredensial untuk setiap koneksi |
| Membuat user admin | `db.createUser({ user: "admin", pwd: "...", roles: ["root"] })` | User pertama dibuat melalui localhost exception |
| SCRAM-SHA-256 | `authMechanism=SCRAM-SHA-256` | Mekanisme autentikasi berbasis password bawaan |
| Autentikasi sertifikat x.509 | `authMechanism=MONGODB-X509` | Mutual TLS menggunakan sertifikat klien |
| Autentikasi LDAP | `authMechanism=PLAIN` + `security.ldap` | Khusus Enterprise/Atlas; bind langsung atau proxy |
| Autentikasi Kerberos | `authMechanism=GSSAPI` | Khusus Enterprise/Atlas |
| Autentikasi AWS IAM | `authMechanism=MONGODB-AWS` | Khusus Atlas; peran EC2 atau access key |
| Menampilkan peran bawaan | `db.getRoles({ showPrivileges: true })` | Menampilkan setiap peran beserta hak istimewanya |
| Memberikan peran | `db.grantRolesToUser("user", [ ... ])` | Menambahkan peran ke user yang sudah ada |
| Mengaktifkan TLS | `net.tls.mode: requireTLS` | Mengenkripsi seluruh lalu lintas wire protocol |
| Enkripsi saat diam | `security.enableEncryption` + KMIP | Enkripsi native WiredTiger |
| Field-level encryption | `encryptedFieldsMap` / CSFLE | Enkripsi sisi klien / in-use encryption |
| Mengaktifkan audit | `auditLog.destination: file` | Mengaudit peristiwa autentikasi, DDL, dan DML |
| Bind IP | `net.bindIp: 127.0.0.1` | Membatasi eksposur jaringan |
| Autentikasi internal keyfile | `security.keyFile` | Mengautentikasi anggota replica set / shard |

## Perintah Umum

### Menjalankan mongod dengan Autentikasi

```bash
mongod --auth --port 27017 --dbpath /data/db
# atau di mongod.conf:
# security:
#   authorization: enabled
```

### Menghubungkan dengan Autentikasi

```bash
mongosh "mongodb://appUser:pass@localhost:27017/mydb?authSource=admin"
mongosh --host localhost --port 27017 --username appUser --password --authenticationDatabase admin
```

### Mengaktifkan TLS

```bash
mongod --tlsMode requireTLS --tlsCertificateKeyFile /etc/ssl/mongodb.pem --tlsCAFile /etc/ssl/ca.pem
mongosh "mongodb://localhost:27017/?tls=true&tlsCAFile=/etc/ssl/ca.pem"
```

### Mengaktifkan Audit

```bash
mongod --auditDestination file --auditFormat JSON --auditPath /var/log/mongodb/audit.log \
  --auditFilter '{ atype: { $in: ["authenticate", "createUser", "dropUser", "grantRolesToUser"] } }'
```

### Membuat Keyfile untuk Autentikasi Internal Replica Set

```bash
openssl rand -base64 756 > /etc/mongodb-keyfile
chmod 400 /etc/mongodb-keyfile
mongod --replSet rs0 --keyFile /etc/mongodb-keyfile --auth
```

### Mengaktifkan Enkripsi Saat Diam (KMIP)

```bash
mongod --enableEncryption --kmipServerName kmip.example.com --kmipPort 5696 \
  --kmipClientCertificateFile /etc/ssl/kmip-client.pem
```

## Potongan Kode

### Membuat User Admin Pertama (localhost exception)

```javascript
use admin;
db.createUser({
  user: "admin",
  pwd: passwordPrompt(),
  roles: [ { role: "root", db: "admin" } ]
});
```

### Membuat User Aplikasi dengan Hak Akses Minimal

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

### Membuat Custom Role

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

### Enkripsi Eksplisit dengan CSFLE (in-use encryption)

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

### Memeriksa Hak Akses dan Status Keamanan

```javascript
db.runCommand({ connectionStatus: 1 });
db.getUser("shopApp");
db.runCommand({ usersInfo: { user: "shopApp", db: "shop" }, showPrivileges: true });
```

### Mengganti Password User

```javascript
db.changeUserPassword("shopApp", passwordPrompt());
```

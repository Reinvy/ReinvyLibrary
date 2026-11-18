---
title: "MongoDB Multi-Tenancy and Data Isolation Guide"
description: "Production guide to running multi-tenant workloads on MongoDB: isolation models, tenant-aware indexing and shard keys, database-level enforcement, provisioning automation, noisy-neighbor guards, and leakage testing."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# MongoDB Multi-Tenancy and Data Isolation Guide

## Introduction

Multi-tenancy turns a single MongoDB deployment into the storage layer for many customers at once. The hard part is never "can MongoDB store rows tagged with a tenant id" — it is guaranteeing that one tenant can never read, write, or degrade another tenant's data, and that this guarantee survives schema changes, index changes, bulk jobs, and the inevitable incident when an application query forgets a filter.

Most multi-tenant MongoDB outages fall into one of three categories: a query that silently dropped its tenant filter and returned another customer's documents, an index that stopped being selective because the tenant key was not leading, or a single large tenant saturating connections, cache, and IOPS for everyone else. None of those are solved by application code review alone. They are solved by choosing an isolation model deliberately, enforcing it at the database layer, and designing indexes and shard keys around the tenant key from the first document.

Common isolation models, in increasing order of separation:

```text
| Model                     | Isolation | Density | Operational cost | Best for                                      |
|---------------------------|-----------|---------|------------------|-----------------------------------------------|
| Shared collections        | Low       | Highest | Lowest           | Thousands of small tenants, SaaS long tail     |
| Collection per tenant     | Medium    | High    | Low              | Hundreds of tenants, per-tenant export needed  |
| Database per tenant       | High      | Medium  | Medium           | Regulated tenants, strict data residency       |
| Cluster per tenant        | Highest   | Lowest  | Highest          | Enterprise/on-prem contracts                   |
```

This guide assumes shared collections or database-per-tenant, the two models most teams actually run, and walks through the decisions that keep them safe in production.

## Best Practices

### 1. Choose the Isolation Model Before the First Document

Isolation is a schema decision, not a deployment decision. Moving from shared collections to database-per-tenant after launch means migrating every tenant's data and rewriting every query, which is a quarter of work. Decide up front using three inputs: how many tenants you expect (thousands versus dozens), what contractual or regulatory isolation each tier requires, and whether per-tenant export or hard deletion is a product requirement.

A pragmatic pattern is tiered isolation: the long tail of small tenants shares collections with a mandatory `tenantId`, while enterprise tenants on contractual isolation get their own database. The application asks a tenant registry for the tenant's storage binding and never guesses.

```javascript
// tenants registry — one document per customer, holds the storage binding
db.tenants.insertOne({
  _id: ObjectId("66f1c2a8f1d3b4e5a7c9d001"),
  slug: "acme",
  tier: "enterprise",
  isolation: "database",          // "shared" | "database"
  databaseName: "tenant_acme",
  status: "active",
  dataResidency: "eu-central",
  createdAt: new Date()
});
```

### 2. Make tenantId Required, Immutable, and Indexed

In a shared-collection model, `tenantId` is part of the primary access path. Treat it like a primary key component: present on every document, never updated, and always the first field in every compound index. Use a stable, compact type — an `ObjectId` or a short string slug — and stay consistent across every collection. Mixing `ObjectId` and string tenant identifiers across collections is a reliable source of join bugs in `$lookup` pipelines and of indexes that never get used.

Enforce immutability with schema validation so that an errant update cannot move documents between tenants:

```javascript
db.orders.createIndex({ tenantId: 1, createdAt: -1 });

db.runCommand({
  collMod: "orders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["tenantId", "status", "createdAt"],
      properties: {
        tenantId: { bsonType: ["objectId", "string"] },
        status: { enum: ["pending", "paid", "shipped", "cancelled"] },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### 3. Prefix Every Compound Index with the Tenant Key

MongoDB can only use an index efficiently when the prefix matches the query shape. An index on `{ status: 1, createdAt: -1 }` forces a scan across all tenants before filtering; `{ tenantId: 1, status: 1, createdAt: -1 }` touches only the requesting tenant's range. The difference in a 500-tenant cluster is often two orders of magnitude in documents examined.

The rule applies to partial indexes, text indexes, and TTL indexes too: `tenantId` leads. Verify with `explain("executionStats")` that `totalKeysExamined` is proportional to the tenant's data, not the collection's total size.

### 4. Enforce Isolation at the Database Layer, Not Just in Code

Application-level filtering fails eventually — a background job, an admin script, or a new endpoint forgets the tenant predicate. Defense in depth means the database refuses cross-tenant access even when the query is wrong. Two mechanisms work today: per-tenant database users with roles scoped to their own database, and views that bake the tenant filter in so callers cannot omit it.

For database-per-tenant, scope each tenant's credentials to its own database and never hand the application a cluster-wide admin user:

```javascript
db.getSiblingDB("tenant_acme").createUser({
  user: "app_acme",
  pwd: passwordPrompt(),
  roles: [{ role: "readWrite", db: "tenant_acme" }]
});
```

For shared collections, expose per-tenant views rather than raw collections to reporting and analytics paths:

```javascript
db.createView("orders_acme", "orders", [
  { $match: { tenantId: ObjectId("66f1c2a8f1d3b4e5a7c9d001") } }
]);
```

### 5. Share Connection Pools Unless a Tenant Is Genuinely Heavy

Each `MongoClient` maintains its own pool, and pools are expensive: 100 connections per tenant multiplied by 300 tenants exhausts `maxIncomingConnections` long before the workload is heavy. Share one client and one pool for the shared-collection model, and use per-tenant clients only for tenants with separate databases or demonstrably heavy traffic. When you do isolate a pool, cap it intentionally with `maxPoolSize` so a single tenant cannot consume the deployment's connection budget.

### 6. Design the Shard Key Around the Tenant Key

For sharded clusters, the tenant key is almost always the correct shard-key prefix: `{ tenantId: 1, _id: 1 }` (hashed or ranged) keeps a tenant's data on a small set of shards, so most tenant queries stay targeted instead of scatter-gathering across every shard. A shard key that ignores the tenant — for example `{ createdAt: 1 }` — makes every tenant read a broadcast, which is the single most common cause of "MongoDB is slow" in multi-tenant deployments.

Watch the hot-tenant problem: a ranged key on a monotonically increasing value concentrates writes on one shard. Hashed `tenantId` spreads writes but scatters each tenant's reads; ranged `tenantId` keeps reads targeted but can create hotspots for very large tenants. Large tenants on a ranged key are better served by splitting them into a dedicated database or cluster.

### 7. Guard Against Noisy Neighbors Explicitly

Fairness does not emerge on its own. A single tenant running a reporting aggregation can evict every other tenant's working set from the WiredTiger cache. Practical guards: per-tenant rate limits at the application tier, `maxTimeMS` on every query issued on behalf of a user, aggressive projection so wide documents are not pulled unnecessarily, and per-tenant metrics so you can attribute cache pressure and IOPS to a customer instead of guessing.

### 8. Design Data Residency, Export, and Deletion Up Front

Regulated tenants ask for three things that are trivial to design in and painful to retrofit: data stored in a specific region, a complete export of their data, and provable deletion. Region is addressed by the isolation model (separate cluster or database in the required region). Export and deletion are addressed by keeping a tenant-to-collection manifest — the authoritative list of every collection holding that tenant's documents — so deletion is a scripted sweep across the manifest rather than an archaeology project.

### 9. Automate Provisioning and Deprovisioning Idempotently

Tenant provisioning is a deployment operation and should be a single idempotent routine: create indexes, apply validators, seed reference data, register the tenant, and set quotas. Run it twice and the result must be identical. Deprovisioning should be a soft-delete first (mark the tenant `suspended`, revoke credentials, retain data for the contractual window) followed by a hard purge that is logged and verifiable.

### 10. Test Cross-Tenant Leakage Like You Test Auth

Treat tenant leakage as a security test, not a QA nicety. Maintain a fixture with two tenants that share suspiciously similar data, then assert that every read path returns only the caller's documents and that every write path rejects a payload carrying another tenant's identifier. Run it in CI; it catches the query that lost its filter months before a customer does.

## Implementation Steps

### Step 1: Model Tenants and Pick the Isolation Strategy

Start with the tenant registry and write down the decision per tier. Keep the registry small and stable — it is read on nearly every request and should be cached in the application.

```javascript
db.tenants.createIndex({ slug: 1 }, { unique: true });
db.tenants.createIndex({ status: 1, tier: 1 });

// the long tail shares collections; enterprise tenants get a database
db.tenants.insertMany([
  { slug: "acme", tier: "enterprise", isolation: "database", databaseName: "tenant_acme", status: "active" },
  { slug: "smallco", tier: "growth", isolation: "shared", status: "active" }
]);
```

### Step 2: Build a Tenant-Aware Data Access Layer

Every query in the application should be constructed from a tenant context, never from a raw collection handle. Wrap the driver so the tenant filter is injected by construction rather than remembered by the author.

```javascript
import { MongoClient, ObjectId } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI, {
  maxPoolSize: 50,
  retryWrites: true,
  serverSelectionTimeoutMS: 5000
});

export function tenantScope(tenant, collectionName) {
  const db = tenant.isolation === "database"
    ? client.db(tenant.databaseName)
    : client.db("app");

  const base = db.collection(collectionName);
  if (tenant.isolation === "database") return base;

  // shared model — tenant filter is applied here and cannot be omitted upstream
  const tenantId = new ObjectId(tenant.id);
  return {
    find: (filter = {}, options = {}) => base.find({ ...filter, tenantId }, options),
    findOne: (filter = {}, options = {}) => base.findOne({ ...filter, tenantId }, options),
    insertOne: (doc, options = {}) => base.insertOne({ ...doc, tenantId }, options),
    updateOne: (filter, update, options = {}) => base.updateOne({ ...filter, tenantId }, update, options),
    deleteOne: (filter, options = {}) => base.deleteOne({ ...filter, tenantId }, options)
  };
}
```

### Step 3: Create Tenant-Leading Indexes and Verify Them

Create indexes with `tenantId` first for every collection that serves tenant-scoped queries, then confirm with an explain plan that the index is actually selected and that key examinations stay proportional to tenant size.

```javascript
db.orders.createIndex({ tenantId: 1, createdAt: -1 });
db.orders.createIndex({ tenantId: 1, status: 1, updatedAt: -1 });
db.invoices.createIndex({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
db.audit_events.createIndex({ tenantId: 1, occurredAt: 1 }, { expireAfterSeconds: 7776000 });
```

```javascript
const plan = db.orders.find({
  tenantId: ObjectId("66f1c2a8f1d3b4e5a7c9d001"),
  status: "paid"
}).sort({ createdAt: -1 }).limit(50).explain("executionStats");

printjson({
  indexUsed: plan.queryPlanner.winningPlan.inputStage?.indexName ?? "COLLSCAN",
  keysExamined: plan.executionStats.totalKeysExamined,
  docsExamined: plan.executionStats.totalDocsExamined,
  returned: plan.executionStats.nReturned
});
```

If `docsExamined` roughly equals `returned`, the tenant prefix is working. If `docsExamined` scales with total collection size, an index is missing the tenant key or the query is not using it.

### Step 4: Enforce Isolation with Validators, Views, and Scoped Credentials

Apply schema validation to every shared collection, create per-tenant views for reporting, and issue credentials scoped to the narrowest database that satisfies the use case.

```javascript
db.runCommand({
  collMod: "invoices",
  validator: { $jsonSchema: { bsonType: "object", required: ["tenantId", "invoiceNumber", "total"] } },
  validationLevel: "strict"
});

db.createView("orders_smallco", "orders", [
  { $match: { tenantId: ObjectId("66f1c2a8f1d3b4e5a7c9d002") } }
]);

db.getSiblingDB("tenant_acme").createUser({
  user: "reporting_acme",
  pwd: passwordPrompt(),
  roles: [{ role: "read", db: "tenant_acme" }]
});
```

### Step 5: Automate Provisioning and Deprovisioning

Provisioning must be idempotent so retries and re-runs are safe. Deprovisioning must revoke access first and delete data last, with an audit trail.

```javascript
async function provisionTenant(slug, tier) {
  const db = client.db(`tenant_${slug}`);

  await db.collection("orders").createIndex({ tenantId: 1, createdAt: -1 });
  await db.collection("invoices").createIndex({ tenantId: 1, invoiceNumber: 1 }, { unique: true });

  await client.db("app").collection("tenants").updateOne(
    { slug },
    { $set: { slug, tier, isolation: "database", databaseName: `tenant_${slug}`, status: "active" } },
    { upsert: true }
  );

  return { slug, databaseName: `tenant_${slug}` };
}

async function suspendTenant(slug) {
  await client.db("app").collection("tenants").updateOne(
    { slug },
    { $set: { status: "suspended", suspendedAt: new Date() } }
  );
  // revoke credentials immediately; data purge runs after the retention window
  await client.db(`tenant_${slug}`).command({ dropAllUsersFromDatabase: 1 });
}
```

### Step 6: Add Noisy-Neighbor Guards and Per-Tenant Observability

Cap the blast radius of a single tenant with query timeouts, quotas, and metrics tagged by tenant so attribution is possible during an incident.

```javascript
// every user-facing query carries a deadline
const cursor = tenantScope(tenant, "orders")
  .find({ status: "paid" }, { maxTimeMS: 2000, projection: { tenantId: 1, total: 1, createdAt: 1 } });

// per-tenant write quota enforced by a counter collection
async function consumeWriteQuota(tenantId, limitPerHour) {
  const bucket = new Date().toISOString().slice(0, 13);
  const res = await client.db("app").collection("write_quotas").findOneAndUpdate(
    { tenantId, bucket },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  if (res.value.count > limitPerHour) {
    throw new Error(`Write quota exceeded for tenant ${tenantId}`);
  }
}
```

```bash
# attribute collection-level pressure to tenants
mongosh --quiet --eval '
  db.getSiblingDB("app").orders.aggregate([
    { $group: { _id: "$tenantId", docs: { $sum: 1 }, bytes: { $sum: { $bsonSize: "$$ROOT" } } } },
    { $sort: { bytes: -1 } }, { $limit: 10 }
  ]).forEach(printjson)
'
```

### Step 7: Run a Cross-Tenant Leakage Test Suite

Build a fixture with two tenants holding near-identical data, then assert isolation on every path. The test should fail loudly if a query returns a document whose `tenantId` differs from the caller's.

```javascript
import assert from "node:assert/strict";

const tenantA = { id: "66f1c2a8f1d3b4e5a7c9d001", isolation: "shared" };
const tenantB = { id: "66f1c2a8f1d3b4e5a7c9d002", isolation: "shared" };

async function assertNoLeakage() {
  const aOrders = await tenantScope(tenantA, "orders").find({}).toArray();
  const bOrders = await tenantScope(tenantB, "orders").find({}).toArray();

  for (const doc of aOrders) {
    assert.equal(doc.tenantId.toHexString(), tenantA.id, "tenant A read must only return A documents");
  }
  for (const doc of bOrders) {
    assert.equal(doc.tenantId.toHexString(), tenantB.id, "tenant B read must only return B documents");
  }

  // writes carrying a foreign tenantId must not land in the caller's scope
  await assert.rejects(
    tenantScope(tenantA, "orders").insertOne({ tenantId: new ObjectId(tenantB.id), status: "pending" })
  );
  console.log(`ok — no leakage across ${aOrders.length + bOrders.length} documents`);
}
```

## Conclusion

Multi-tenancy on MongoDB is decided in three places: the isolation model, the index and shard-key design, and the enforcement layer that keeps a forgotten filter from becoming a data breach. Choose the model per tier, lead every index with the tenant key, enforce tenancy with validators, views, and scoped credentials, cap noisy neighbors with timeouts and quotas, and keep a leakage test in CI. Teams that do all five can run thousands of tenants on one deployment without ever explaining to a customer how another customer's data appeared in their dashboard.

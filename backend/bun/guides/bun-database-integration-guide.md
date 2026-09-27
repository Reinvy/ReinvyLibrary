---
title: "Bun Database Integration Guide"
description: "A practical guide to wiring Bun to SQLite and PostgreSQL: bun:sqlite, Drizzle ORM, schema migrations, transactions, connection pooling, and a repository layer that keeps SQL out of your handlers."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Bun Database Integration Guide

## Introduction

Bun ships a first-party SQLite driver (`bun:sqlite`) and a fast SQL client for PostgreSQL/MySQL, so a Bun service can talk to a database without a native addon or a driver shim. That convenience hides the decisions that decide whether the integration survives production: which driver fits the workload, how schema changes are applied, where transaction boundaries live, and how connections are shared under concurrency.

This guide walks through a layered integration — driver, query builder, migration runner, repository — using Drizzle ORM because it is typed, migration-first, and works with both `bun:sqlite` and `postgres.js`. The structure applies equally to Kysely, Prisma, or handwritten SQL.

## Best Practices

- **Pick the store before the driver.** `bun:sqlite` is excellent for single-node services, tests, CLIs, and embedded read-heavy work. Move to PostgreSQL as soon as you need concurrent writers, replicas, or multi-instance deploys — SQLite is a file, not a server.
- **One schema, one migration path.** Generate migrations from a declarative schema and apply them with a checked-in runner. Never let `db:push` touch production: it rewrites tables without a reviewable artifact.
- **Enable WAL and a busy timeout.** SQLite defaults to `journal_mode=DELETE` and fails fast with `SQLITE_BUSY` under concurrent writes; WAL plus `busy_timeout` turns those failures into short waits.
- **Keep transactions short and explicit.** Open a transaction around a logical unit, never around an HTTP request — long transactions hold the write lock (SQLite) or a connection and snapshot (Postgres).
- **Repositories return domain objects, not rows.** Handlers should not know column names; a repository maps rows to typed models and owns the query shape.
- **Always parameterize.** Use prepared statements or builder placeholders; string interpolation into SQL is the one mistake that cannot be patched later.
- **Size the pool and drain it.** `instances × max` must stay below `max_connections`, and a `SIGTERM` handler must close the pool — otherwise rolling deploys leak file handles and WAL files.

## Implementation Steps

### Step 1: Declare the connection

```typescript
// src/db/client.ts
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const sqlite = new Database(process.env.DATABASE_FILE ?? "./data/app.db", { create: true });

// WAL lets readers proceed while a writer is active; busy_timeout converts
// lock contention into a short wait instead of an immediate error.
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA busy_timeout = 5000;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;
```

### Step 2: Define the schema as the single source of truth

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const orders = sqliteTable(
    "orders",
    {
        id: text("id").primaryKey(),
        customerId: text("customer_id").notNull(),
        status: text("status", { enum: ["pending", "paid", "shipped"] }).notNull().default("pending"),
        totalCents: integer("total_cents").notNull(),
        createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    },
    (table) => ({ customerIdx: index("orders_customer_idx").on(table.customerId) }),
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
```

### Step 3: Generate and apply migrations

```bash
# Generate a reviewable SQL migration from the schema diff
bunx drizzle-kit generate

# Inspect what will run, then apply it in a deploy step (not on boot)
bunx drizzle-kit migrate
```

```typescript
// scripts/migrate.ts — run explicitly: bun run scripts/migrate.ts
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "../src/db/client";

try {
    migrate(db, { migrationsFolder: "./drizzle" });
    console.log("migrations applied");
} catch (error) {
    console.error("migration failed:", error);
    process.exit(1);
}
```

### Step 4: Wrap multi-statement writes in a transaction

```typescript
// src/repositories/order-repository.ts
import { eq } from "drizzle-orm";
import { db, type Db } from "../db/client";
import { orders, type NewOrder, type Order } from "../db/schema";

export class OrderRepository {
    constructor(private readonly conn: Db = db) {}

    // All-or-nothing: if the audit insert throws, the order is rolled back too.
    createWithAudit(input: NewOrder, audit: (tx: Db, order: Order) => void): Order {
        return this.conn.transaction((tx) => {
            const order = tx.insert(orders).values(input).returning().get() as Order;
            audit(tx as Db, order);
            return order;
        });
    }

    findById(id: string): Order | undefined {
        return this.conn.select().from(orders).where(eq(orders.id, id)).get();
    }
}
```

### Step 5: Share one pool on PostgreSQL and drain it on shutdown

```typescript
// src/db/pg.ts — same repository code, different driver
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const sql = postgres(process.env.DATABASE_URL!, {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
});

export const db = drizzle(sql, { schema });

const server = Bun.serve({ port: 3000, fetch: app.fetch });

for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, async () => {
        server.stop();
        await sql.end({ timeout: 5 }); // finish in-flight jobs, then release
        process.exit(0);
    });
}
```

Treat pool size as a function of instances, not of traffic. When a service scales out, that arithmetic — not query speed — is usually what breaks first.

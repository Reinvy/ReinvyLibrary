---
title: "Bun SQLite and Database Operations Cheatsheet"
description: "A comprehensive quick reference for database programming with Bun — covering the built-in bun:sqlite API, PostgreSQL and MySQL integration, Drizzle ORM, Prisma workflow, transaction management, and migration patterns."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Bun SQLite and Database Operations Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Open in-memory database | `new Database(":memory:")` | Create a temporary in-memory SQLite database |
| Open file database | `new Database("app.db")` | Open or create a file-based SQLite database |
| Read-only open | `new Database("app.db", {readonly: true})` | Open an existing database in read-only mode |
| Execute query (all rows) | `db.query(sql).all()` | Execute a SELECT query and return all matching rows |
| Execute query (first row) | `db.query(sql).get()` | Execute a SELECT query and return only the first row |
| Execute write statement | `db.run(sql)` | Execute INSERT, UPDATE, or DELETE and return info |
| Prepared statement with params | `db.query("... ?").all(1)` | Create a prepared statement with positional parameters |
| Named parameter binding | `db.query("... $x").all({$x: 1})` | Create a prepared statement with named parameters |
| Manual transaction | `db.exec("BEGIN")` / `db.exec("COMMIT")` | Start and commit a transaction manually |
| Automatic transaction | `db.transaction(fn)(args)` | Execute a callback inside an automatic transaction |
| Set WAL mode | `db.exec("PRAGMA journal_mode = WAL")` | Enable Write-Ahead Logging for better concurrency |
| Set foreign keys | `db.exec("PRAGMA foreign_keys = ON")` | Enable foreign key constraint enforcement |
| PostgreSQL query | `await client.query("SELECT ...", [vals])` | Execute a parameterized query via node-postgres |
| MySQL query | `await connection.execute("...", [vals])` | Execute a parameterized query via mysql2 |
| Drizzle ORM insert | `await db.insert(table).values(row)` | Insert a row using Drizzle ORM |
| Drizzle ORM select | `await db.select().from(table).where(...)` | Query rows using Drizzle ORM |
| Prisma generate | `bunx prisma generate` | Generate the Prisma client for use with Bun |
| Prisma migrate | `bunx prisma migrate dev` | Apply pending migrations in development |

## Common Commands

### Bun SQLite — Database Setup

```typescript
import { Database } from "bun:sqlite";

// In-memory database (data is lost when the process exits)
const memDb = new Database(":memory:");

// File-based database (persists to disk)
const db = new Database("app.db");

// Read-only mode — throws if the file does not exist
const readOnlyDb = new Database("app.db", { readonly: true });

// Enable WAL mode for concurrent reads
db.exec("PRAGMA journal_mode = WAL");

// Enable foreign key enforcement
db.exec("PRAGMA foreign_keys = ON");
```

### Creating Tables

```typescript
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
)`);

db.run(`CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
)`);
```

### CRUD Operations

```typescript
// --- CREATE ---
const insertUser = db.query(
  "INSERT INTO users (name, email) VALUES ($name, $email)"
);
insertUser.run({ $name: "Alice", $email: "alice@example.com" });

// Get the last inserted row id
const info = db.run("INSERT INTO users (name, email) VALUES (?, ?)", [
  "Bob",
  "bob@example.com",
]);
console.log("Inserted ID:", info.lastInsertRowid);

// --- READ ---
const getAllUsers = db.query("SELECT * FROM users");
const users = getAllUsers.all();
// => [{ id: 1, name: "Alice", email: "alice@example.com", created_at: "..." }]

const getUserById = db.query("SELECT * FROM users WHERE id = ?");
const user = getUserById.get(1);
// => { id: 1, name: "Alice", ... }

const getUsersByEmail = db.query(
  "SELECT * FROM users WHERE email LIKE $pattern"
);
const matches = getUsersByEmail.all({ $pattern: "%@example.com" });

// --- UPDATE ---
const updateUser = db.query(
  "UPDATE users SET name = $name WHERE id = $id"
);
updateUser.run({ $name: "Charlie", $id: 1 });

// --- DELETE ---
const deleteUser = db.query("DELETE FROM users WHERE id = ?");
deleteUser.run(1);
```

### Transaction Management

```typescript
// Manual transaction with db.exec
db.exec("BEGIN TRANSACTION");
try {
  db.run("INSERT INTO accounts (id, owner, balance) VALUES (1, 'Alice', 1000)");
  db.run("INSERT INTO accounts (id, owner, balance) VALUES (2, 'Bob', 500)");
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}

// Automatic transaction with db.transaction()
// The callback runs atomically — if any statement fails, all changes are rolled back
const transfer = db.transaction((fromId, toId, amount) => {
  const from = db
    .query("SELECT balance FROM accounts WHERE id = ?")
    .get(fromId) as { balance: number };
  if (from.balance < amount) throw new Error("Insufficient funds");

  db.run("UPDATE accounts SET balance = balance - ? WHERE id = ?", [
    amount,
    fromId,
  ]);
  db.run("UPDATE accounts SET balance = balance + ? WHERE id = ?", [
    amount,
    toId,
  ]);
});

// Execute the transaction — all-or-nothing
transfer(1, 2, 200);

// Nested transactions are supported via savepoints
db.exec("SAVEPOINT sp1");
db.run("INSERT INTO logs (message) VALUES ('step 1')");
db.exec("ROLLBACK TO sp1"); // Undo only the insert, keep outer transaction
```

### PostgreSQL Integration

```typescript
import { Client } from "pg";

const client = new Client({
  host: "localhost",
  port: 5432,
  database: "mydb",
  user: "app_user",
  password: process.env.DB_PASSWORD,
});

await client.connect();

// Parameterized query ($1, $2, ...)
const result = await client.query(
  "SELECT id, name, email FROM users WHERE id = $1",
  [1]
);
console.log(result.rows[0]);

// Insert with RETURNING
const insertResult = await client.query(
  `INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id`,
  ["Alice", "alice@example.com"]
);
console.log("New user ID:", insertResult.rows[0].id);

// Transaction with client.query
await client.query("BEGIN");
try {
  await client.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [100, 1]);
  await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [100, 2]);
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
}

await client.end();
```

### MySQL Integration

```typescript
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: "localhost",
  port: 3306,
  database: "mydb",
  user: "app_user",
  password: process.env.DB_PASSWORD,
});

// Parameterized query (? placeholders)
const [rows] = await connection.execute(
  "SELECT id, name, email FROM users WHERE id = ?",
  [1]
);
console.log(rows);

// Insert with insertId
const [insertResult] = await connection.execute(
  "INSERT INTO users (name, email) VALUES (?, ?)",
  ["Alice", "alice@example.com"]
);
console.log("Inserted ID:", (insertResult as mysql.ResultSetHeader).insertId);

await connection.end();
```

### Drizzle ORM with Bun SQLite

```typescript
import { drizzle } from "drizzle-orm/bun-sqlite";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { Database } from "bun:sqlite";
import { eq, like, sql } from "drizzle-orm";

// Define schema
const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  body: text("body"),
});

// Connect
const sqlite = new Database("app.db");
const db = drizzle(sqlite);

// CRUD with Drizzle
await db.insert(users).values({ name: "Alice", email: "alice@example.com" });

const result = await db
  .select()
  .from(users)
  .where(eq(users.name, "Alice"));

const filtered = await db
  .select()
  .from(users)
  .where(like(users.email, "%@example.com"))
  .limit(10);

// Join query
const withPosts = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId));
```

### Prisma with Bun

```bash
# Install Prisma
bun add prisma @prisma/client

# Initialize Prisma schema
bunx prisma init

# For SQLite, set the provider in schema.prisma:
#   datasource db {
#     provider = "sqlite"
#     url      = "file:./dev.db"
#   }

# For PostgreSQL, set:
#   datasource db {
#     provider = "postgresql"
#     url      = env("DATABASE_URL")
#   }

# Generate the client
bunx prisma generate

# Run migrations
bunx prisma migrate dev --name init
```

```typescript
// Usage in Bun
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Create
const user = await prisma.user.create({
  data: { name: "Alice", email: "alice@example.com" },
});

// Read with relations
const usersWithPosts = await prisma.user.findMany({
  include: { posts: true },
  where: { email: { contains: "@example.com" } },
});

// Update
await prisma.user.update({
  where: { id: 1 },
  data: { name: "Bob" },
});

// Delete
await prisma.user.delete({ where: { id: 1 } });

await prisma.$disconnect();
```

## Code Snippets

### Production Database Connection Module

```typescript
// db.ts — Singleton with connection management
import { Database } from "bun:sqlite";

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    const path = process.env.DB_PATH || "app.db";
    db = new Database(path);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA busy_timeout = 5000");
  }
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}
```

### Migration Runner

```typescript
// migrate.ts — Run SQL migration files in order
import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

function runMigrations(db: Database, migrationsDir: string) {
  // Create migrations tracking table
  db.run(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const alreadyApplied = db
      .query("SELECT name FROM _migrations WHERE name = ?")
      .get(file);
    if (alreadyApplied) continue;

    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    db.exec(sql);
    db.run("INSERT INTO _migrations (name) VALUES (?)", [file]);
    console.log(`Applied migration: ${file}`);
  }
}

const db = new Database("app.db");
runMigrations(db, "./migrations");
```

### Query Builder Pattern

```typescript
// query-builder.ts — Simple dynamic query builder for Bun SQLite
import { Database } from "bun:sqlite";

type Row = Record<string, unknown>;

interface WhereClause {
  sql: string;
  params: unknown[];
}

export class QueryBuilder<T extends Row> {
  private wheres: WhereClause[] = [];
  private orderByClause = "";
  private limitClause = "";
  private offsetClause = "";

  constructor(
    private db: Database,
    private table: string,
    private columns = "*"
  ) {}

  where(field: string, op: string, value: unknown): this {
    this.wheres.push({ sql: `${field} ${op} ?`, params: [value] });
    return this;
  }

  whereIn(field: string, values: unknown[]): this {
    const placeholders = values.map(() => "?").join(", ");
    this.wheres.push({ sql: `${field} IN (${placeholders})`, params: values });
    return this;
  }

  orderBy(field: string, dir: "ASC" | "DESC" = "ASC"): this {
    this.orderByClause = ` ORDER BY ${field} ${dir}`;
    return this;
  }

  limit(n: number): this {
    this.limitClause = ` LIMIT ${n}`;
    return this;
  }

  offset(n: number): this {
    this.offsetClause = ` OFFSET ${n}`;
    return this;
  }

  all(): T[] {
    const whereSql = this.wheres.length
      ? ` WHERE ${this.wheres.map((w) => w.sql).join(" AND ")}`
      : "";
    const sql = `SELECT ${this.columns} FROM ${this.table}${whereSql}${this.orderByClause}${this.limitClause}${this.offsetClause}`;
    const params = this.wheres.flatMap((w) => w.params);
    return this.db.query(sql).all(...params) as T[];
  }

  first(): T | null {
    const results = this.limit(1).all();
    return results[0] ?? null;
  }

  count(): number {
    const whereSql = this.wheres.length
      ? ` WHERE ${this.wheres.map((w) => w.sql).join(" AND ")}`
      : "";
    const sql = `SELECT COUNT(*) as count FROM ${this.table}${whereSql}`;
    const params = this.wheres.flatMap((w) => w.params);
    const result = this.db.query(sql).get(...params) as { count: number };
    return result.count;
  }
}

// Usage
const query = new QueryBuilder<{ id: number; name: string; email: string }>(
  db,
  "users"
);
const results = query
  .where("email", "LIKE", "%@example.com")
  .orderBy("name", "ASC")
  .limit(20)
  .offset(0)
  .all();
```

### Connection Pool for PostgreSQL in Bun

```typescript
// pool.ts — Simple PostgreSQL connection pool using pg
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "mydb",
  user: process.env.DB_USER || "app_user",
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
});

export async function query<T extends Row>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  callback: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
```

### Raw SQL Seed Script

```sql
-- seeds/seed.sql
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');
INSERT INTO users (name, email) VALUES ('Charlie', 'charlie@example.com');

INSERT INTO posts (user_id, title, body) VALUES (1, 'Hello World', 'My first post!');
INSERT INTO posts (user_id, title, body) VALUES (1, 'Bun is Fast', 'Bun runtime is incredibly fast.');
INSERT INTO posts (user_id, title, body) VALUES (2, 'SQLite Tips', 'Here are some SQLite tips for Bun.');
```

```bash
# Apply seed data
cat seeds/seed.sql | bun x sqlite3 app.db
```

---
title: "Cheat Sheet SQLite dan Operasi Database Bun"
description: "Referensi cepat komprehensif untuk pemrograman database dengan Bun — mencakup API bun:sqlite bawaan, integrasi PostgreSQL dan MySQL, Drizzle ORM, alur kerja Prisma, manajemen transaksi, dan pola migrasi."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet SQLite dan Operasi Database Bun

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Buka database di memori | `new Database(":memory:")` | Buat database SQLite sementara di memori |
| Buka database file | `new Database("app.db")` | Buka atau buat database SQLite berbasis file |
| Buka read-only | `new Database("app.db", {readonly: true})` | Buka database yang ada dalam mode read-only |
| Eksekusi kueri (semua baris) | `db.query(sql).all()` | Jalankan SELECT dan kembalikan semua baris yang cocok |
| Eksekusi kueri (baris pertama) | `db.query(sql).get()` | Jalankan SELECT dan kembalikan hanya baris pertama |
| Eksekusi pernyataan tulis | `db.run(sql)` | Jalankan INSERT, UPDATE, atau DELETE dan kembalikan info |
| Prepared statement dengan parameter | `db.query("... ?").all(1)` | Buat prepared statement dengan parameter posisional |
| Binding parameter bernama | `db.query("... $x").all({$x: 1})` | Buat prepared statement dengan parameter bernama |
| Transaksi manual | `db.exec("BEGIN")` / `db.exec("COMMIT")` | Mulai dan commit transaksi secara manual |
| Transaksi otomatis | `db.transaction(fn)(args)` | Jalankan callback dalam transaksi otomatis |
| Aktifkan mode WAL | `db.exec("PRAGMA journal_mode = WAL")` | Aktifkan Write-Ahead Logging untuk konkurensi lebih baik |
| Aktifkan foreign key | `db.exec("PRAGMA foreign_keys = ON")` | Aktifkan penegakan constraint foreign key |
| Kueri PostgreSQL | `await client.query("SELECT ...", [vals])` | Jalankan kueri berparameter via node-postgres |
| Kueri MySQL | `await connection.execute("...", [vals])` | Jalankan kueri berparameter via mysql2 |
| Insert Drizzle ORM | `await db.insert(table).values(row)` | Sisipkan baris menggunakan Drizzle ORM |
| Select Drizzle ORM | `await db.select().from(table).where(...)` | Kueri baris menggunakan Drizzle ORM |
| Generate Prisma | `bunx prisma generate` | Generate Prisma client untuk digunakan dengan Bun |
| Migrasi Prisma | `bunx prisma migrate dev` | Terapkan migrasi yang tertunda di pengembangan |

## Perintah Umum

### Bun SQLite — Setup Database

```typescript
import { Database } from "bun:sqlite";

// Database di memori (data hilang saat proses keluar)
const memDb = new Database(":memory:");

// Database berbasis file (tersimpan ke disk)
const db = new Database("app.db");

// Mode read-only — akan error jika file tidak ada
const readOnlyDb = new Database("app.db", { readonly: true });

// Aktifkan mode WAL untuk pembacaan konkuren
db.exec("PRAGMA journal_mode = WAL");

// Aktifkan penegakan foreign key
db.exec("PRAGMA foreign_keys = ON");
```

### Membuat Tabel

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

### Operasi CRUD

```typescript
// --- CREATE ---
const insertUser = db.query(
  "INSERT INTO users (name, email) VALUES ($name, $email)"
);
insertUser.run({ $name: "Alice", $email: "alice@example.com" });

// Dapatkan ID baris terakhir yang disisipkan
const info = db.run("INSERT INTO users (name, email) VALUES (?, ?)", [
  "Bob",
  "bob@example.com",
]);
console.log("ID yang disisipkan:", info.lastInsertRowid);

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

### Manajemen Transaksi

```typescript
// Transaksi manual dengan db.exec
db.exec("BEGIN TRANSACTION");
try {
  db.run("INSERT INTO accounts (id, owner, balance) VALUES (1, 'Alice', 1000)");
  db.run("INSERT INTO accounts (id, owner, balance) VALUES (2, 'Bob', 500)");
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}

// Transaksi otomatis dengan db.transaction()
// Callback dijalankan secara atomik — jika ada pernyataan yang gagal,
// semua perubahan akan di-rollback
const transfer = db.transaction((fromId, toId, amount) => {
  const from = db
    .query("SELECT balance FROM accounts WHERE id = ?")
    .get(fromId) as { balance: number };
  if (from.balance < amount) throw new Error("Saldo tidak mencukupi");

  db.run("UPDATE accounts SET balance = balance - ? WHERE id = ?", [
    amount,
    fromId,
  ]);
  db.run("UPDATE accounts SET balance = balance + ? WHERE id = ?", [
    amount,
    toId,
  ]);
});

// Eksekusi transaksi — all-or-nothing
transfer(1, 2, 200);

// Transaksi bersarang didukung via savepoint
db.exec("SAVEPOINT sp1");
db.run("INSERT INTO logs (message) VALUES ('langkah 1')");
db.exec("ROLLBACK TO sp1"); // Batalkan hanya insert, pertahankan transaksi luar
```

### Integrasi PostgreSQL

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

// Kueri berparameter ($1, $2, ...)
const result = await client.query(
  "SELECT id, name, email FROM users WHERE id = $1",
  [1]
);
console.log(result.rows[0]);

// Insert dengan RETURNING
const insertResult = await client.query(
  `INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id`,
  ["Alice", "alice@example.com"]
);
console.log("ID user baru:", insertResult.rows[0].id);

// Transaksi dengan client.query
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

### Integrasi MySQL

```typescript
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: "localhost",
  port: 3306,
  database: "mydb",
  user: "app_user",
  password: process.env.DB_PASSWORD,
});

// Kueri berparameter (placeholder ?)
const [rows] = await connection.execute(
  "SELECT id, name, email FROM users WHERE id = ?",
  [1]
);
console.log(rows);

// Insert dengan insertId
const [insertResult] = await connection.execute(
  "INSERT INTO users (name, email) VALUES (?, ?)",
  ["Alice", "alice@example.com"]
);
console.log("ID yang disisipkan:", (insertResult as mysql.ResultSetHeader).insertId);

await connection.end();
```

### Drizzle ORM dengan Bun SQLite

```typescript
import { drizzle } from "drizzle-orm/bun-sqlite";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { Database } from "bun:sqlite";
import { eq, like, sql } from "drizzle-orm";

// Definisikan skema
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

// Koneksi
const sqlite = new Database("app.db");
const db = drizzle(sqlite);

// CRUD dengan Drizzle
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

// Kueri JOIN
const withPosts = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId));
```

### Prisma dengan Bun

```bash
# Install Prisma
bun add prisma @prisma/client

# Inisialisasi skema Prisma
bunx prisma init

# Untuk SQLite, atur provider di schema.prisma:
#   datasource db {
#     provider = "sqlite"
#     url      = "file:./dev.db"
#   }

# Untuk PostgreSQL, atur:
#   datasource db {
#     provider = "postgresql"
#     url      = env("DATABASE_URL")
#   }

# Generate client
bunx prisma generate

# Jalankan migrasi
bunx prisma migrate dev --name init
```

```typescript
// Penggunaan di Bun
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Create
const user = await prisma.user.create({
  data: { name: "Alice", email: "alice@example.com" },
});

// Read dengan relasi
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

## Potongan Kode

### Modul Koneksi Database Produksi

```typescript
// db.ts — Singleton dengan manajemen koneksi
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

### Runner Migrasi

```typescript
// migrate.ts — Jalankan file SQL migrasi secara berurutan
import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

function runMigrations(db: Database, migrationsDir: string) {
  // Buat tabel pelacakan migrasi
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
    console.log(`Migrasi diterapkan: ${file}`);
  }
}

const db = new Database("app.db");
runMigrations(db, "./migrations");
```

### Pola Query Builder

```typescript
// query-builder.ts — Pembangun kueri dinamis sederhana untuk Bun SQLite
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

// Penggunaan
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

### Pool Koneksi untuk PostgreSQL di Bun

```typescript
// pool.ts — Pool koneksi PostgreSQL sederhana menggunakan pg
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

### Skrip Seed SQL Mentah

```sql
-- seeds/seed.sql
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');
INSERT INTO users (name, email) VALUES ('Charlie', 'charlie@example.com');

INSERT INTO posts (user_id, title, body) VALUES (1, 'Halo Dunia', 'Postingan pertama saya!');
INSERT INTO posts (user_id, title, body) VALUES (1, 'Bun Cepat', 'Runtime Bun sangat cepat.');
INSERT INTO posts (user_id, title, body) VALUES (2, 'Tips SQLite', 'Berikut beberapa tips SQLite untuk Bun.');
```

```bash
# Terapkan data seed
cat seeds/seed.sql | bun x sqlite3 app.db
```

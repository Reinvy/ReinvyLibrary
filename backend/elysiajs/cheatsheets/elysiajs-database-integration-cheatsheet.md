---
title: "Elysia.js Database Integration Cheatsheet"
description: "A quick reference guide for integrating databases with Elysia.js and Bun — covering SQLite, PostgreSQL, Drizzle ORM, Prisma, connection pooling, transactions, migrations, and repository patterns."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Elysia.js Database Integration Cheatsheet

## Quick Reference Table

| Action | Code / Pattern | Description |
|--------|---------------|-------------|
| SQLite setup | `import { Database } from 'bun:sqlite'` | Import Bun's built-in SQLite module |
| Open SQLite | `const db = new Database('data.db')` | Open or create a SQLite database file |
| Prepared statement | `const stmt = db.prepare('SELECT * FROM users WHERE id = ?')` | Create a prepared SQL statement |
| Run insert | `stmt.run('Alice', 30)` | Execute a statement with positional params |
| Query all | `stmt.all()` | Get all rows as an array of objects |
| Query one | `stmt.get(1)` | Get a single row as an object |
| Transaction | `db.transaction(() => { ... })()` | Execute statements atomically |
| WAL mode | `db.run('PRAGMA journal_mode = WAL')` | Enable Write-Ahead Logging for performance |
| PostgreSQL pool | `new Pool({ connectionString: '...' })` | Create a pg Pool (needs `pg` package) |
| Drizzle setup | `drizzle(db, { schema })` | Initialize Drizzle ORM with schema |
| Prisma setup | `npx prisma init && bunx prisma generate` | Initialize Prisma and generate client |
| Connection check | `await db.$connect()` | Connect Prisma to the database |

## Common Commands

### SQLite with bun:sqlite

```bash
# SQLite comes built-in with Bun — no install needed
# Open REPL to interact with a database
bun -e "const { Database } = require('bun:sqlite'); const db = new Database('test.db'); console.log(db.query('SELECT sqlite_version()').get())"

# Enable WAL mode for concurrent reads
bun -e "
const db = new Database('app.db');
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA synchronous = NORMAL');
console.log('WAL mode enabled');
"
```

### PostgreSQL with pg Driver

```bash
# Install the pg package
bun add pg
bun add -d @types/pg

# Quick connection test
bun -e "
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const res = await pool.query('SELECT NOW()');
console.log('Connected:', res.rows[0].now);
await pool.end();
"
```

### Drizzle ORM Setup

```bash
# Install Drizzle ORM and the Bun SQLite driver
bun add drizzle-orm bun-sqlite
bun add -d drizzle-kit

# Generate migrations
bunx drizzle-kit generate

# Apply migrations
bunx drizzle-kit migrate
```

### Prisma Setup

```bash
# Initialize Prisma
bunx prisma init

# Generate Prisma Client after schema changes
bunx prisma generate

# Run migrations
bunx prisma migrate dev --name init

# Open Prisma Studio (GUI)
bunx prisma studio
```

### Migration Management

```bash
# Drizzle: create migration from schema changes
bunx drizzle-kit generate

# Drizzle: apply pending migrations
bunx drizzle-kit migrate

# Drizzle: view migration status
bunx drizzle-kit check

# Prisma: create and apply migration
bunx prisma migrate dev --name add_user_table

# Prisma: apply migrations in production
bunx prisma migrate deploy

# Prisma: reset database (dev only)
bunx prisma migrate reset
```

## Code Snippets

### SQLite with bun:sqlite in Elysia

```typescript
import { Elysia } from 'elysia';
import { Database } from 'bun:sqlite';

// Initialize database
const db = new Database('app.sqlite');
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA synchronous = NORMAL');

// Create table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Prepared statements
const insertUser = db.prepare(
  'INSERT INTO users (name, email) VALUES (?, ?)'
);
const getUserById = db.prepare(
  'SELECT * FROM users WHERE id = ?'
);
const getAllUsers = db.prepare(
  'SELECT * FROM users ORDER BY created_at DESC'
);

// Elysia routes with SQLite
const app = new Elysia()

  .get('/users', () => {
    return { users: getAllUsers.all() };
  })

  .get('/users/:id', ({ params: { id } }) => {
    const user = getUserById.get(Number(id));
    if (!user) return { error: 'Not found' };
    return { user };
  })

  .post('/users', ({ body }: { body: { name: string; email: string } }) => {
    const result = insertUser.run(body.name, body.email);
    return { id: result.lastInsertRowid, ...body };
  })

  .listen(3000);
```

### PostgreSQL with Pool and Elysia Plugin

```typescript
import { Elysia } from 'elysia';
import { Pool } from 'pg';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,               // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Define a reusable database plugin
const dbPlugin = new Elysia({ name: 'db' })
  .decorate('db', {
    async query(text: string, params?: any[]) {
      const client = await pool.connect();
      try {
        const result = await client.query(text, params);
        return result;
      } finally {
        client.release();
      }
    },
    async transaction<T>(
      fn: (query: (text: string, params?: any[]) => Promise<any>) => Promise<T>
    ): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(
          (text: string, params?: any[]) => client.query(text, params)
        );
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
  });

// Use the plugin in routes
const app = new Elysia()
  .use(dbPlugin)

  .get('/users', async ({ db }) => {
    const result = await db.query('SELECT * FROM users ORDER BY id DESC');
    return { users: result.rows };
  })

  .post('/users', async ({ db, body }: any) => {
    const { name, email } = body;
    const result = await db.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    return { user: result.rows[0] };
  })

  .listen(3000);
```

### Drizzle ORM with Schema and Relations

```typescript
import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { eq, desc, like, and, sql } from 'drizzle-orm';

// --- Define Schema ---
const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  total: real('total').notNull(),
  status: text('status').default('pending'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// --- Initialize ORM ---
const sqlite = new Database('store.sqlite');
const db = drizzle(sqlite);

// --- Elysia Plugin with Drizzle ---
const drizzlePlugin = new Elysia({ name: 'drizzle' })
  .decorate('orm', db)
  .decorate('schema', { users, orders });

// --- Routes ---
const app = new Elysia()
  .use(drizzlePlugin)

  // Create user
  .post('/users', async ({ orm, schema, body }: any) => {
    const { name, email } = body;
    const result = orm.insert(schema.users).values({ name, email }).run();
    return { id: result.lastInsertRowid };
  })

  // List users with their order counts
  .get('/users', async ({ orm, schema }) => {
    const result = orm
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        orderCount: sql<number>`count(${schema.orders.id})`,
      })
      .from(schema.users)
      .leftJoin(schema.orders, eq(schema.users.id, schema.orders.userId))
      .groupBy(schema.users.id)
      .all();
    return { users: result };
  })

  // Search users by name
  .get('/users/search', async ({ orm, schema, query }: any) => {
    const { q } = query;
    const result = orm
      .select()
      .from(schema.users)
      .where(like(schema.users.name, `%${q}%`))
      .all();
    return { users: result };
  })

  .listen(3000);
```

### Prisma ORM with Elysia

```typescript
import { Elysia } from 'elysia';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Define a Prisma plugin
const prismaPlugin = new Elysia({ name: 'prisma' })
  .decorate('prisma', prisma)
  .onAfterHandle(async () => {
    // No-op: Prisma connection is managed globally
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// --- Schema (schema.prisma) ---
// model User {
//   id        Int      @id @default(autoincrement())
//   name      String
//   email     String   @unique
//   posts     Post[]
//   createdAt DateTime @default(now())
// }
//
// model Post {
//   id        Int      @id @default(autoincrement())
//   title     String
//   content   String?
//   published Boolean  @default(false)
//   authorId  Int
//   author    User     @relation(fields: [authorId], references: [id])
//   createdAt DateTime @default(now())
// }

const app = new Elysia()
  .use(prismaPlugin)

  // Create user with related posts
  .post('/users', async ({ prisma, body }: any) => {
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        posts: body.posts ? {
          create: body.posts,
        } : undefined,
      },
      include: { posts: true },
    });
    return { user };
  })

  // Paginated users with post counts
  .get('/users', async ({ prisma, query }: any) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        include: { _count: { select: { posts: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return { users, total, page, totalPages: Math.ceil(total / limit) };
  })

  // Published posts with author info
  .get('/posts', async ({ prisma }) => {
    const posts = await prisma.post.findMany({
      where: { published: true },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { posts };
  })

  .listen(3000);
```

### Transaction Patterns

```typescript
import { Elysia } from 'elysia';
import { Database } from 'bun:sqlite';

const db = new Database('shop.sqlite');

// bun:sqlite transaction (synchronous)
const transferFunds = db.transaction(
  (fromId: number, toId: number, amount: number) => {
    const sender = db
      .prepare('SELECT balance FROM accounts WHERE id = ?')
      .get(fromId) as { balance: number } | undefined;

    if (!sender || sender.balance < amount) {
      throw new Error('Insufficient funds');
    }

    db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?')
      .run(amount, fromId);
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')
      .run(amount, toId);
  }
);

const app = new Elysia()

  .post('/transfer', ({ body }: any) => {
    try {
      transferFunds(body.fromId, body.toId, body.amount);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  })

  .listen(3000);
```

### Repository Pattern with Dependency Injection

```typescript
import { Elysia } from 'elysia';
import { Database } from 'bun:sqlite';

// --- Repository ---
class UserRepository {
  constructor(private db: Database) {}

  findAll() {
    return this.db
      .prepare('SELECT * FROM users ORDER BY created_at DESC')
      .all();
  }

  findById(id: number) {
    return this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id);
  }

  create(data: { name: string; email: string }) {
    const result = this.db
      .prepare('INSERT INTO users (name, email) VALUES (?, ?)')
      .run(data.name, data.email);
    return this.findById(Number(result.lastInsertRowid));
  }

  update(id: number, data: Partial<{ name: string; email: string }>) {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name) { fields.push('name = ?'); values.push(data.name); }
    if (data.email) { fields.push('email = ?'); values.push(data.email); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    this.db
      .prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
      .run(...values);
    return this.findById(id);
  }

  delete(id: number) {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { deleted: id };
  }
}

// --- Elysia App with DI ---
const db = new Database('app.sqlite');
const userRepo = new UserRepository(db);

const app = new Elysia()
  .decorate('users', userRepo)

  .get('/users', ({ users }) => ({ users: users.findAll() }))
  .get('/users/:id', ({ users, params: { id } }) => {
    const user = users.findById(Number(id));
    return user ? { user } : { error: 'Not found' };
  })
  .post('/users', ({ users, body }: any) => ({
    user: users.create(body),
  }))
  .put('/users/:id', ({ users, params: { id }, body }: any) => ({
    user: users.update(Number(id), body),
  }))
  .delete('/users/:id', ({ users, params: { id } }) =>
    users.delete(Number(id))
  )

  .listen(3000);
```

### Connection Health Check

```typescript
import { Elysia } from 'elysia';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = new Elysia()

  .get('/health', async () => {
    const checks: Record<string, string> = {};

    // Check PostgreSQL
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      checks.database = 'healthy';
    } catch (e: any) {
      checks.database = `unhealthy: ${e.message}`;
    }

    const allHealthy = Object.values(checks).every(v => v === 'healthy');
    return {
      status: allHealthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  })

  .listen(3000);
```

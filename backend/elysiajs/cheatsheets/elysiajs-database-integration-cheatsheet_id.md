---
title: "Cheat Sheet Integrasi Database Elysia.js"
description: "Panduan referensi cepat untuk mengintegrasikan database dengan Elysia.js dan Bun — mencakup SQLite, PostgreSQL, Drizzle ORM, Prisma, connection pooling, transaksi, migrasi, dan pola repository."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Integrasi Database Elysia.js

## Tabel Referensi Cepat

| Aksi | Kode / Pola | Deskripsi |
|------|-------------|-----------|
| Setup SQLite | `import { Database } from 'bun:sqlite'` | Mengimpor modul SQLite bawaan Bun |
| Buka SQLite | `const db = new Database('data.db')` | Membuka atau membuat file database SQLite |
| Statement prepared | `const stmt = db.prepare('SELECT * FROM users WHERE id = ?')` | Membuat statement SQL yang sudah dikompilasi |
| Jalankan insert | `stmt.run('Alice', 30)` | Mengeksekusi statement dengan parameter posisional |
| Query semua | `stmt.all()` | Mendapatkan semua baris sebagai array objek |
| Query satu | `stmt.get(1)` | Mendapatkan satu baris sebagai objek |
| Transaksi | `db.transaction(() => { ... })()` | Mengeksekusi statement secara atomik |
| Mode WAL | `db.run('PRAGMA journal_mode = WAL')` | Mengaktifkan Write-Ahead Logging untuk performa |
| Pool PostgreSQL | `new Pool({ connectionString: '...' })` | Membuat Pool pg (butuh package `pg`) |
| Setup Drizzle | `drizzle(db, { schema })` | Menginisialisasi Drizzle ORM dengan skema |
| Setup Prisma | `npx prisma init && bunx prisma generate` | Menginisialisasi Prisma dan generate client |
| Cek koneksi | `await db.$connect()` | Menghubungkan Prisma ke database |

## Perintah Umum

### SQLite dengan bun:sqlite

```bash
# SQLite sudah tersedia di Bun — tidak perlu instalasi
# Buka REPL untuk berinteraksi dengan database
bun -e "const { Database } = require('bun:sqlite'); const db = new Database('test.db'); console.log(db.query('SELECT sqlite_version()').get())"

# Aktifkan mode WAL untuk pembacaan konkuren
bun -e "
const db = new Database('app.db');
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA synchronous = NORMAL');
console.log('Mode WAL diaktifkan');
"
```

### PostgreSQL dengan Driver pg

```bash
# Install package pg
bun add pg
bun add -d @types/pg

# Tes koneksi cepat
bun -e "
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const res = await pool.query('SELECT NOW()');
console.log('Terhubung:', res.rows[0].now);
await pool.end();
"
```

### Setup Drizzle ORM

```bash
# Install Drizzle ORM dan driver Bun SQLite
bun add drizzle-orm bun-sqlite
bun add -d drizzle-kit

# Generate migrasi
bunx drizzle-kit generate

# Terapkan migrasi
bunx drizzle-kit migrate
```

### Setup Prisma

```bash
# Inisialisasi Prisma
bunx prisma init

# Generate Prisma Client setelah perubahan skema
bunx prisma generate

# Jalankan migrasi
bunx prisma migrate dev --name init

# Buka Prisma Studio (GUI)
bunx prisma studio
```

### Manajemen Migrasi

```bash
# Drizzle: buat migrasi dari perubahan skema
bunx drizzle-kit generate

# Drizzle: terapkan migrasi yang tertunda
bunx drizzle-kit migrate

# Drizzle: lihat status migrasi
bunx drizzle-kit check

# Prisma: buat dan terapkan migrasi
bunx prisma migrate dev --name add_user_table

# Prisma: terapkan migrasi di produksi
bunx prisma migrate deploy

# Prisma: reset database (hanya development)
bunx prisma migrate reset
```

## Potongan Kode

### SQLite dengan bun:sqlite di Elysia

```typescript
import { Elysia } from 'elysia';
import { Database } from 'bun:sqlite';

// Inisialisasi database
const db = new Database('app.sqlite');
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA synchronous = NORMAL');

// Buat tabel
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Statement prepared
const insertUser = db.prepare(
  'INSERT INTO users (name, email) VALUES (?, ?)'
);
const getUserById = db.prepare(
  'SELECT * FROM users WHERE id = ?'
);
const getAllUsers = db.prepare(
  'SELECT * FROM users ORDER BY created_at DESC'
);

// Route Elysia dengan SQLite
const app = new Elysia()

  .get('/users', () => {
    return { users: getAllUsers.all() };
  })

  .get('/users/:id', ({ params: { id } }) => {
    const user = getUserById.get(Number(id));
    if (!user) return { error: 'Tidak ditemukan' };
    return { user };
  })

  .post('/users', ({ body }: { body: { name: string; email: string } }) => {
    const result = insertUser.run(body.name, body.email);
    return { id: result.lastInsertRowid, ...body };
  })

  .listen(3000);
```

### PostgreSQL dengan Pool dan Plugin Elysia

```typescript
import { Elysia } from 'elysia';
import { Pool } from 'pg';

// Buat connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,               // Ukuran pool maksimum
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Definisikan plugin database yang dapat digunakan ulang
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

// Gunakan plugin di route
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

### Drizzle ORM dengan Skema dan Relasi

```typescript
import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { eq, desc, like, and, sql } from 'drizzle-orm';

// --- Definisikan Skema ---
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

// --- Inisialisasi ORM ---
const sqlite = new Database('store.sqlite');
const db = drizzle(sqlite);

// --- Plugin Elysia dengan Drizzle ---
const drizzlePlugin = new Elysia({ name: 'drizzle' })
  .decorate('orm', db)
  .decorate('schema', { users, orders });

// --- Route ---
const app = new Elysia()
  .use(drizzlePlugin)

  // Buat pengguna
  .post('/users', async ({ orm, schema, body }: any) => {
    const { name, email } = body;
    const result = orm.insert(schema.users).values({ name, email }).run();
    return { id: result.lastInsertRowid };
  })

  // Daftar pengguna dengan jumlah pesanan
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

  // Cari pengguna berdasarkan nama
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

### Prisma ORM dengan Elysia

```typescript
import { Elysia } from 'elysia';
import { PrismaClient } from '@prisma/client';

// Inisialisasi Prisma Client
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Definisikan plugin Prisma
const prismaPlugin = new Elysia({ name: 'prisma' })
  .decorate('prisma', prisma);

// Shutdown yang graceful
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// --- Skema (schema.prisma) ---
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

  // Buat pengguna dengan postingan terkait
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

  // Pengguna dengan paginasi dan jumlah postingan
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

  // Postingan yang dipublikasikan dengan info penulis
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

### Pola Transaksi

```typescript
import { Elysia } from 'elysia';
import { Database } from 'bun:sqlite';

const db = new Database('shop.sqlite');

// Transaksi bun:sqlite (sinkron)
const transferFunds = db.transaction(
  (fromId: number, toId: number, amount: number) => {
    const sender = db
      .prepare('SELECT balance FROM accounts WHERE id = ?')
      .get(fromId) as { balance: number } | undefined;

    if (!sender || sender.balance < amount) {
      throw new Error('Saldo tidak mencukupi');
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

### Pola Repository dengan Dependency Injection

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

// --- Aplikasi Elysia dengan DI ---
const db = new Database('app.sqlite');
const userRepo = new UserRepository(db);

const app = new Elysia()
  .decorate('users', userRepo)

  .get('/users', ({ users }) => ({ users: users.findAll() }))
  .get('/users/:id', ({ users, params: { id } }) => {
    const user = users.findById(Number(id));
    return user ? { user } : { error: 'Tidak ditemukan' };
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

### Health Check Koneksi

```typescript
import { Elysia } from 'elysia';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = new Elysia()

  .get('/health', async () => {
    const cek: Record<string, string> = {};

    // Periksa PostgreSQL
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      cek.database = 'sehat';
    } catch (e: any) {
      cek.database = `tidak sehat: ${e.message}`;
    }

    const semuaSehat = Object.values(cek).every(v => v === 'sehat');
    return {
      status: semuaSehat ? 'ok' : 'menurun',
      cek,
      timestamp: new Date().toISOString(),
    };
  })

  .listen(3000);
```

---
title: "Panduan Integrasi Database dengan Bun"
description: "Panduan praktis menghubungkan Bun ke SQLite dan PostgreSQL: bun:sqlite, Drizzle ORM, migrasi skema, transaksi, connection pooling, dan lapisan repository yang menjauhkan SQL dari handler."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Integrasi Database dengan Bun

## Pendahuluan

Bun menyediakan driver SQLite bawaan (`bun:sqlite`) dan klien SQL cepat untuk PostgreSQL/MySQL, sehingga service Bun bisa berbicara dengan database tanpa native addon atau lapisan shim. Kemudahan itu menyembunyikan keputusan yang menentukan apakah integrasi bertahan di produksi: driver mana yang cocok untuk beban kerja, bagaimana perubahan skema diterapkan, di mana batas transaksi berada, dan bagaimana koneksi dibagi saat konkurensi tinggi.

Panduan ini membahas integrasi berlapis — driver, query builder, runner migrasi, repository — memakai Drizzle ORM karena bertipe kuat, mengutamakan migrasi, dan bekerja dengan `bun:sqlite` maupun `postgres.js`. Strukturnya berlaku juga untuk Kysely, Prisma, atau SQL tulis tangan.

## Praktik Terbaik

- **Tentukan penyimpanan sebelum memilih driver.** `bun:sqlite` sangat baik untuk service satu node, test, CLI, dan beban baca berat yang tertanam. Pindah ke PostgreSQL begitu butuh penulis bersamaan, replika, atau deploy multi-instance — SQLite adalah berkas, bukan server.
- **Satu skema, satu jalur migrasi.** Hasilkan migrasi dari skema deklaratif dan terapkan lewat runner yang tersimpan di repo. Jangan biarkan `db:push` menyentuh produksi: perintah itu menulis ulang tabel tanpa artefak yang bisa di-review.
- **Aktifkan WAL dan busy timeout.** SQLite default memakai `journal_mode=DELETE` dan langsung gagal dengan `SQLITE_BUSY` saat penulisan bersamaan; WAL plus `busy_timeout` mengubahnya menjadi tunggu singkat.
- **Jaga transaksi pendek dan eksplisit.** Buka transaksi mengelilingi satu unit logis, bukan satu request HTTP — transaksi panjang menahan write lock (SQLite) atau koneksi dan snapshot (Postgres).
- **Repository mengembalikan objek domain, bukan baris mentah.** Handler tidak perlu tahu nama kolom; repository memetakan baris ke model bertipe dan memiliki bentuk query.
- **Selalu gunakan parameter.** Pakai prepared statement atau placeholder builder; interpolasi string ke SQL adalah kesalahan yang tidak bisa ditambal belakangan.
- **Hitung ukuran pool lalu kuras.** `instance × max` harus di bawah `max_connections`, dan handler `SIGTERM` wajib menutup pool — jika tidak, deploy bergulir membocorkan file handle dan berkas WAL.

## Langkah Implementasi

### Langkah 1: Deklarasikan koneksi

```typescript
// src/db/client.ts
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const sqlite = new Database(process.env.DATABASE_FILE ?? "./data/app.db", { create: true });

// WAL membuat pembaca tetap jalan saat ada penulis; busy_timeout mengubah
// kontensi lock menjadi tunggu singkat, bukan error langsung.
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA busy_timeout = 5000;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;
```

### Langkah 2: Jadikan skema sebagai satu-satunya sumber kebenaran

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

### Langkah 3: Hasilkan dan terapkan migrasi

```bash
# Hasilkan migrasi SQL yang bisa di-review dari diff skema
bunx drizzle-kit generate

# Periksa apa yang akan dijalankan, lalu terapkan di langkah deploy (bukan saat boot)
bunx drizzle-kit migrate
```

```typescript
// scripts/migrate.ts — jalankan eksplisit: bun run scripts/migrate.ts
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "../src/db/client";

try {
    migrate(db, { migrationsFolder: "./drizzle" });
    console.log("migrasi diterapkan");
} catch (error) {
    console.error("migrasi gagal:", error);
    process.exit(1);
}
```

### Langkah 4: Bungkus penulisan multi-statement dalam transaksi

```typescript
// src/repositories/order-repository.ts
import { eq } from "drizzle-orm";
import { db, type Db } from "../db/client";
import { orders, type NewOrder, type Order } from "../db/schema";

export class OrderRepository {
    constructor(private readonly conn: Db = db) {}

    // Semua atau tidak sama sekali: bila insert audit melempar error,
    // order ikut di-rollback.
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

### Langkah 5: Bagikan satu pool di PostgreSQL dan kuras saat shutdown

```typescript
// src/db/pg.ts — kode repository sama, driver berbeda
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
        await sql.end({ timeout: 5 }); // selesaikan job berjalan, lalu lepas
        process.exit(0);
    });
}
```

Perlakukan ukuran pool sebagai fungsi jumlah instance, bukan trafik. Saat service melakukan scale-out, aritmetika inilah — bukan kecepatan query — yang biasanya lebih dulu rusak.

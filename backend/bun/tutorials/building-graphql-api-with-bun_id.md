---
title: "Membangun GraphQL API dengan Bun dan GraphQL Yoga"
description: "Tutorial berbasis proyek untuk membangun GraphQL API siap produksi di atas Bun dengan GraphQL Yoga — desain skema SDL, resolver bertipe, context per-request untuk autentikasi, batching DataLoader untuk menghapus query N+1, paginasi cursor, subscription lewat dukungan WebSocket bawaan Bun, serta pengujian seluruh skema dengan bun test."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun GraphQL API dengan Bun dan GraphQL Yoga

## Ringkasan

Dalam tutorial berbasis proyek ini Anda akan membangun **GraphQL API pelacak proyek** di atas Bun menggunakan GraphQL Yoga. Mulai dari satu berkas skema dan `Bun.serve()`, Anda akan menambahkan context per-request untuk autentikasi dan otorisasi, pemuatan data terkelompok dengan DataLoader untuk menghilangkan query N+1, paginasi berbasis cursor yang tetap stabil saat data berubah, pembaruan langsung melalui subscription GraphQL yang berjalan di server WebSocket bawaan Bun, dan rangkaian pengujian end-to-end yang dijalankan dengan `bun test`. Hasil akhirnya adalah API satu proses yang melayani query, mutation, dan subscription dari satu port tanpa Express dan tanpa server WebSocket terpisah.

## Target Audiens

- Backend dan fullstack developer yang sudah mengirim REST API ke produksi dan perlu menambahkan lapisan GraphQL bertipe yang dikendalikan klien.
- Developer yang nyaman dengan generik TypeScript, resolver async, dan SQL, serta ingin melihat arsitektur GraphQL yang realistis alih-alih resolver yang mengembalikan array hardcoded.
- Tim yang sedang mengevaluasi Bun sebagai runtime produksi dan ingin melihat API HTTP, WebSocket, SQLite, dan pengujiannya bekerja bersama dalam satu layanan.

## Prasyarat

- TypeScript yang kuat: generik, discriminated union, `async`/`await`, dan resolusi modul.
- Pemahaman dasar GraphQL — tipe, query, mutation, resolver, dan fragment.
- Bun terpasang secara lokal (`bun --version`) serta kenyamanan dasar dengan `bun install`, `bun run`, dan `bun test`.
- Pemahaman pemodelan relasional dan SQL dasar, karena lapisan data menggunakan `bun:sqlite`.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Merancang skema GraphQL berbasis SDL yang nullability dan tipe inputnya merepresentasikan aturan domain sebenarnya.
- Menyambungkan GraphQL Yoga ke `Bun.serve()` dan mengekspos satu endpoint yang melayani operasi HTTP sekaligus subscription WebSocket.
- Membangun context per-request yang membawa viewer terautentikasi, handle SQLite per-request, dan loader per-request.
- Menghilangkan pola query N+1 dengan batching DataLoader dan membuktikan penurunannya dengan menghitung jumlah pernyataan SQL.
- Mengimplementasikan paginasi cursor gaya Relay dan menjelaskan mengapa paginasi offset rusak saat terjadi penulisan bersamaan.
- Menerapkan otorisasi pada batas field memakai guard di tingkat resolver yang tidak bisa dilewati lewat query bertingkat.
- Menguji query, mutation, dan kegagalan otorisasi dengan `bun test` terhadap basis data in-memory.

## Konteks dan Motivasi

REST bekerja baik ketika klien mengonsumsi satu bentuk resource dalam satu waktu, tetapi tampilan produk jarang berperilaku demikian. Sebuah feed aktivitas membutuhkan satu proyek, pemiliknya, lima tugas terakhirnya, dan penanggung jawab setiap tugas dalam satu perjalanan. Dengan REST itu berarti empat endpoint dan banyak orkestrasi di sisi klien, atau satu endpoint yang mengambil field berlebih yang tidak pernah dirender layar. GraphQL memindahkan keputusan itu ke klien, dan skema membuat kontraknya eksplisit serta bisa diperiksa.

Bagian yang sulit bukanlah berkas skema. Yang sulit adalah semua di sekitarnya: batching agar resolver bertingkat tidak menjalankan satu query per baris, otorisasi yang tidak bisa diakali klien dengan bersarang lebih dalam, paginasi yang stabil saat dataset berubah, dan server yang menangani subscription berumur panjang tanpa proses kedua. Itulah hal-hal yang memisahkan demo dari API yang layak dipasang di belakang klien mobile.

Bun sangat cocok untuk bentuk layanan ini karena bagian-bagian yang biasanya dirakit dari beberapa pustaka sudah menyatu di runtime: `Bun.serve()` menangani HTTP dan upgrade ke WebSocket pada port yang sama, `bun:sqlite` menyediakan basis data tertanam dengan prepared statement, dan `bun test` menjalankan rangkaian uji tanpa test runner terpisah. GraphQL Yoga menempel di atasnya sebagai handler bergaya `fetch`, yang persis merupakan signature fungsi yang diharapkan `Bun.serve()`.

## Konten Inti

### Mengapa lapisan GraphQL schema-first di Bun

Dua keputusan membentuk seluruh tutorial ini. Yang pertama adalah **SDL-first**: Anda menulis `schema.graphql` sebagai sumber kebenaran dan memetakan resolver ke atasnya, bukan menghasilkan skema dari decorator atau builder code-first. SDL menjaga kontrak tetap bisa ditinjau dalam pull request, memberi Anda berkas untuk di-diff ketika API berubah, dan memungkinkan tim frontend membaca skema tanpa membaca TypeScript.

Yang kedua adalah **satu proses, satu port**. `Bun.serve()` menerima handler `fetch` HTTP dan handler `websocket` dalam objek konfigurasi yang sama, sehingga lalu lintas HTTP dan `ws://` berbagi satu listener serta satu sertifikat TLS. Fungsi `yoga.fetch` milik GraphQL Yoga adalah fungsi standar `(Request) => Response`, jadi ia langsung masuk ke handler tersebut.

```text
Bun.serve({
  fetch: melayani /graphql (query + mutation)
  websocket: melayani subscription pada port yang sama
})
        |
        v
GraphQL Yoga  ->  schema.graphql  ->  resolver
                                   ->  context (viewer, db, loader)
                                   ->  sumber data (bun:sqlite)
```

### Merancang nullability agar skema membawa aturannya

Nullability adalah pilihan paling berdampak dalam SDL. Menandai field sebagai non-null (`Project!`) berarti berjanji kepada klien bahwa nilai selalu ada, dan resolver yang mengembalikan `null` untuk field itu akan menggagalkan seluruh objek induk. Aturan yang dipakai di sini: **non-null untuk field yang dijamin domain, nullable untuk field yang ketiadaannya bermakna**.

Sebuah `Task` selalu memiliki `id`, `title`, dan `status`, jadi ketiganya non-null. `assignee` bersifat nullable karena tugas tanpa penanggung jawab adalah kondisi sah. `dueAt` bersifat nullable karena tidak setiap tugas punya tenggat. Daftar tugas bersifat non-null (`[Task!]!`) — daftarnya selalu ada meski bisa kosong — karena mengembalikan `null` untuk "tidak ada tugas" memaksa setiap klien melakukan pengecekan null yang tidak bermakna.

Tipe input dan output dipisahkan meski terlihat identik. `CreateTaskInput` tidak memuat `id` dan `createdAt` karena server yang memilikinya; memakai satu tipe untuk kedua arah adalah cara klien akhirnya mengirim field yang diam-diam diabaikan server.

### Context per-request: viewer, basis data, loader

Context adalah satu-satunya kanal yang dibagi resolver, dan masa hidupnya tepat satu request. Tiga hal wajib ada di dalamnya:

1. **Viewer** — pengguna terautentikasi atau `null` untuk permintaan anonim, di-resolve sekali dari header `Authorization`.
2. **Handle basis data** — instance `Database` dari `bun:sqlite` yang terikat pada request, atau facade query yang ter-scope.
3. **Loader** — instance DataLoader yang dibuat baru per request sehingga cache-nya tidak bocor antar pengguna.

Poin ketiga perlu ditegaskan: DataLoader di level modul adalah bug kebenaran yang menunggu terjadi. Cache-nya hanya dikunci oleh ID, sehingga `Project:7` milik request A akan disajikan kepada request B meski viewer request B tidak boleh melihatnya. Membuat loader di dalam factory context membatasi cache pada request dan menghilangkannya saat respons dikirim.

### Menghapus query N+1 dengan DataLoader

Resolver naif untuk `Project.tasks` menjalankan satu `SELECT ... WHERE project_id = ?` per proyek. Query yang mengembalikan lima puluh proyek berarti lima puluh satu pernyataan. DataLoader meruntuhkannya menjadi satu: dalam satu tick ia mengumpulkan setiap `projectId` yang diminta menjadi satu batch, menjalankan `SELECT ... WHERE project_id IN (...)` sekali, dan mengembalikan hasil sesuai urutan yang diminta.

Batching hanya berguna jika fungsi batch jujur soal bentuknya. `loadMany` mengembalikan array yang panjangnya harus sama dengan array kunci, dengan entri `Error` ketika lookup gagal dan `null` ketika baris tidak ada. Mengembalikan array yang lebih pendek membuat hasil bergeser diam-diam — bug DataLoader klasik ketika daftar tugas menempel pada proyek yang salah.

### Otorisasi pada batas field

Autentikasi menjawab "siapa Anda"; otorisasi menjawab "bolehkah Anda melihat ini". Menaruh otorisasi hanya pada mutation tingkat atas tidak cukup, karena klien GraphQL bisa mencapai data yang sama melalui jalur bertingkat. Query `project(id:)` yang dijaga pemeriksaan kepemilikan tidak ada gunanya bila `viewer.projects` mengembalikan baris yang sama tanpa penjagaan.

Pola yang dipakai di sini adalah sekumpulan helper guard kecil (`requireViewer`, `requireProjectAccess`, `requireTaskAccess`) yang dipanggil dari setiap resolver yang mengembalikan data terlindungi, ditambah aturan pada tingkat hasil: field yang mengekspos skalar sensitif (misalnya `Project.internalNotes`) me-resolve ke `null` kecuali viewer memegang peran `admin`. Resolver adalah titik penegakannya; skema hanyalah bentuknya.

### Paginasi cursor yang bertahan saat penulisan bersamaan

Paginasi offset (`LIMIT 20 OFFSET 40`) mudah dan salah untuk feed. Jika satu baris disisipkan saat klien berpindah halaman, setiap halaman berikutnya bergeser satu dan klien melihat duplikat; penghapusan menghasilkan lompatan diam-diam. Paginasi cursor berpatokan pada baris terakhir yang benar-benar diterima klien, sehingga insert dan delete tidak bisa menggeser jendela.

Implementasinya memakai cursor gabungan `(createdAt, id)` dan predikat `WHERE (created_at, id) < (?, ?)`. Penentu kedua (`id`) penting: timestamp saling bertabrakan pada resolusi detik atau milidetik, dan tanpa kunci sekunder yang stabil dua baris dengan timestamp sama bisa dimasukkan dua kali atau terlewat. Respons mengekspos `edges`, `pageInfo.hasNextPage`, dan `pageInfo.endCursor`, sehingga klien tidak pernah membangun cursor sendiri.

### Subscription lewat handler WebSocket Bun

Subscription mendorong data ketika state di sisi server berubah. Ada dua transport: WebSocket dan server-sent events. WebSocket lebih cocok di sini karena `Bun.serve()` sudah memiliki handshake upgrade-nya — Anda meneruskan socket ke API `subscribe` milik Yoga dan membiarkan tipe `Subscription` pada skema mendefinisikan apa yang boleh didengar klien.

Detail operasional yang menggigit di produksi adalah pembersihan. Setiap subscription memegang satu socket dan satu async iterator; ketika klien terputus di tengah aliran Anda harus memberi sinyal agar iterator berhenti dan menghapusnya dari peta topik. Melewati ini berarti membocorkan satu generator per tab yang ditutup, dan karena setiap generator bisa memegang handle pernyataan SQLite, kebocorannya bukan sekadar memori. Contoh di bawah menyimpan `AbortController` bersama socket dan membatalkannya saat `close`.

## Contoh Kode

### Struktur proyek dan dependensi

```text
project-tracker/
  package.json
  schema.graphql
  src/
    db.ts
    loaders.ts
    context.ts
    resolvers.ts
    server.ts
  tests/
    api.test.ts
```

```bash
mkdir project-tracker && cd project-tracker
bun init -y
bun add graphql yoga graphql-yoga dataloader
```

### Skema

```graphql
type Query {
  viewer: User
  project(id: ID!): Project
  projects(first: Int = 20, after: String): ProjectConnection!
  task(id: ID!): Task
}

type Mutation {
  createProject(input: CreateProjectInput!): CreateProjectPayload!
  createTask(input: CreateTaskInput!): CreateTaskPayload!
  assignTask(taskId: ID!, assigneeId: ID): UpdateTaskPayload!
}

type Subscription {
  taskStatusChanged(projectId: ID!): Task!
}

type User {
  id: ID!
  name: String!
  email: String!
  role: Role!
}

enum Role {
  MEMBER
  ADMIN
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

type Project {
  id: ID!
  name: String!
  owner: User!
  tasks(first: Int = 10, after: String): TaskConnection!
  internalNotes: String
  createdAt: String!
}

type Task {
  id: ID!
  title: String!
  status: TaskStatus!
  assignee: User
  dueAt: String
  project: Project!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type ProjectEdge {
  cursor: String!
  node: Project!
}

type ProjectConnection {
  edges: [ProjectEdge!]!
  pageInfo: PageInfo!
}

type TaskEdge {
  cursor: String!
  node: Task!
}

type TaskConnection {
  edges: [TaskEdge!]!
  pageInfo: PageInfo!
}

input CreateProjectInput {
  name: String!
}

input CreateTaskInput {
  projectId: ID!
  title: String!
  dueAt: String
}

type CreateProjectPayload {
  project: Project!
}

type CreateTaskPayload {
  task: Task!
}

type UpdateTaskPayload {
  task: Task!
}
```

### Lapisan basis data dengan `bun:sqlite`

```typescript
import { Database } from "bun:sqlite";

export type Role = "MEMBER" | "ADMIN";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export function createDatabase(path = ":memory:") {
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'MEMBER'
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL REFERENCES users(id),
      internal_notes TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'TODO',
      assignee_id INTEGER REFERENCES users(id),
      due_at TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, created_at, id);
    CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at, id);
  `);

  return db;
}

export type Db = ReturnType<typeof createDatabase>;

export function encodeCursor(createdAt: number, id: number): string {
  return Buffer.from(`${createdAt}:${id}`, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): { createdAt: number; id: number } {
  const [rawCreatedAt, rawId] = Buffer.from(cursor, "base64url").toString("utf8").split(":");
  const createdAt = Number(rawCreatedAt);
  const id = Number(rawId);
  if (!Number.isFinite(createdAt) || !Number.isFinite(id)) {
    throw new Error("Invalid cursor");
  }
  return { createdAt, id };
}
```

### Loader terkelompok

```typescript
import DataLoader from "dataloader";
import type { Db } from "./db";

export function createLoaders(db: Db, viewerId: number | null) {
  const tasksByProject = new DataLoader<number, unknown[]>(async (projectIds) => {
    const placeholders = projectIds.map(() => "?").join(", ");
    const rows = db
      .query(
        `SELECT * FROM tasks WHERE project_id IN (${placeholders}) ORDER BY created_at DESC`,
      )
      .all(...projectIds) as Array<{ project_id: number }>;

    const grouped = new Map<number, unknown[]>();
    for (const id of projectIds) grouped.set(id, []);
    for (const row of rows) grouped.get(row.project_id)!.push(row);
    return projectIds.map((id) => grouped.get(id) ?? []);
  });

  const userById = new DataLoader<number, unknown>(async (ids) => {
    const unique = [...new Set(ids)];
    const placeholders = unique.map(() => "?").join(", ");
    const rows = db
      .query(`SELECT * FROM users WHERE id IN (${placeholders})`)
      .all(...unique) as Array<{ id: number }>;
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => byId.get(id) ?? null);
  });

  const projectById = new DataLoader<number, unknown>(async (ids) => {
    const unique = [...new Set(ids)];
    const placeholders = unique.map(() => "?").join(", ");
    const rows = db
      .query(`SELECT * FROM projects WHERE id IN (${placeholders})`)
      .all(...unique) as Array<{ id: number }>;
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => byId.get(id) ?? null);
  });

  return { tasksByProject, userById, projectById, viewerId };
}

export type Loaders = ReturnType<typeof createLoaders>;
```

Dua invarian menentukan berhasil atau tidaknya fungsi batch ini. Setiap array yang dikembalikan harus sama panjangnya dengan array masukan, dan harus mengikuti urutan masukan. Pemanggil bergaya `loadMany` mengharapkan `null` pada slot baris yang tidak ditemukan, bukan celah kosong.

### Factory context dan guard

```typescript
import type { Db } from "./db";
import { createLoaders, type Loaders } from "./loaders";

export type Viewer = { id: number; email: string; role: "MEMBER" | "ADMIN" };

export type Context = {
  db: Db;
  viewer: Viewer | null;
  loaders: Loaders;
  publish: (projectId: number, task: unknown) => void;
};

export function requireViewer(ctx: Context): Viewer {
  if (!ctx.viewer) throw new Error("UNAUTHENTICATED: sign in to continue");
  return ctx.viewer;
}

async function resolveViewer(db: Db, token: string | null): Promise<Viewer | null> {
  if (!token) return null;
  // Di produksi verifikasi JWT bertanda tangan di sini; tutorial ini
  // memakai token sebagai id pengguna agar logika otorisasi tetap fokus.
  const row = db.query("SELECT id, email, role FROM users WHERE id = ?").get(Number(token)) as
    | Viewer
    | null;
  return row ?? null;
}

export async function createContext(
  db: Db,
  headers: Headers,
  publish: Context["publish"],
): Promise<Context> {
  const token = headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const viewer = await resolveViewer(db, token);
  return {
    db,
    viewer,
    // Baru setiap request: cache DataLoader tidak boleh hidup lebih lama dari viewer-nya.
    loaders: createLoaders(db, viewer?.id ?? null),
    publish,
  };
}

export async function assertProjectAccess(ctx: Context, projectId: number) {
  const viewer = requireViewer(ctx);
  const project = ctx.db
    .query("SELECT id, owner_id FROM projects WHERE id = ?")
    .get(projectId) as { id: number; owner_id: number } | null;
  if (!project) throw new Error("NOT_FOUND: project does not exist");
  if (viewer.role !== "ADMIN" && project.owner_id !== viewer.id) {
    throw new Error("FORBIDDEN: you do not have access to this project");
  }
  return project;
}
```

### Resolver dengan cursor dan guard

```typescript
import { decodeCursor, encodeCursor, type Db } from "./db";
import { assertProjectAccess, requireViewer, type Context } from "./context";

type ProjectRow = {
  id: number;
  name: string;
  owner_id: number;
  internal_notes: string | null;
  created_at: number;
};

export const resolvers = {
  Query: {
    viewer: (_: unknown, __: unknown, ctx: Context) =>
      ctx.viewer ? ctx.loaders.userById.load(ctx.viewer.id) : null,

    project: async (_: unknown, args: { id: string }, ctx: Context) => {
      const id = Number(args.id);
      return ctx.loaders.projectById.load(id);
    },

    projects: async (
      _: unknown,
      args: { first: number; after: string | null },
      ctx: Context,
    ) => {
      const viewer = requireViewer(ctx);
      const limit = Math.min(Math.max(args.first, 1), 100);
      const params: number[] = [];
      let where = "WHERE owner_id = ?";
      params.push(viewer.id);

      if (args.after) {
        const { createdAt, id } = decodeCursor(args.after);
        where += " AND (created_at < ? OR (created_at = ? AND id < ?))";
        params.push(createdAt, createdAt, id);
      }

      const rows = ctx.db
        .query(
          `SELECT * FROM projects ${where} ORDER BY created_at DESC, id DESC LIMIT ?`,
        )
        .all(...params, limit + 1) as ProjectRow[];

      const hasNextPage = rows.length > limit;
      const page = hasNextPage ? rows.slice(0, limit) : rows;
      const last = page.at(-1);

      return {
        edges: page.map((node) => ({
          cursor: encodeCursor(node.created_at, node.id),
          node,
        })),
        pageInfo: {
          hasNextPage,
          endCursor: last ? encodeCursor(last.created_at, last.id) : null,
        },
      };
    },
  },

  Mutation: {
    createProject: async (_: unknown, args: { input: { name: string } }, ctx: Context) => {
      const viewer = requireViewer(ctx);
      const createdAt = Date.now();
      const row = ctx.db
        .query(
          "INSERT INTO projects (name, owner_id, created_at) VALUES (?, ?, ?) RETURNING *",
        )
        .get(args.input.name, viewer.id, createdAt) as ProjectRow;
      return { project: row };
    },

    assignTask: async (
      _: unknown,
      args: { taskId: string; assigneeId: string | null },
      ctx: Context,
    ) => {
      const taskId = Number(args.taskId);
      const task = ctx.db.query("SELECT project_id FROM tasks WHERE id = ?").get(taskId) as
        | { project_id: number }
        | null;
      if (!task) throw new Error("NOT_FOUND: task does not exist");
      await assertProjectAccess(ctx, task.project_id);

      if (args.assigneeId) {
        ctx.db
          .query("UPDATE tasks SET assignee_id = ? WHERE id = ?")
          .run(Number(args.assigneeId), taskId);
      } else {
        ctx.db.query("UPDATE tasks SET assignee_id = NULL WHERE id = ?").run(taskId);
      }

      const updated = ctx.db.query("SELECT * FROM tasks WHERE id = ?").get(taskId);
      return { task: updated };
    },
  },

  Project: {
    owner: (project: ProjectRow, _: unknown, ctx: Context) =>
      ctx.loaders.userById.load(project.owner_id),

    tasks: async (
      project: ProjectRow,
      args: { first: number; after: string | null },
      ctx: Context,
    ) => {
      const limit = Math.min(Math.max(args.first, 1), 100);
      const params: unknown[] = [project.id];
      let where = "WHERE project_id = ?";
      if (args.after) {
        const { createdAt, id } = decodeCursor(args.after);
        where += " AND (created_at < ? OR (created_at = ? AND id < ?))";
        params.push(createdAt, createdAt, id);
      }
      const rows = ctx.db
        .query(
          `SELECT * FROM tasks ${where} ORDER BY created_at DESC, id DESC LIMIT ?`,
        )
        .all(...params, limit + 1) as Array<{ created_at: number; id: number }>;

      const hasNextPage = rows.length > limit;
      const page = hasNextPage ? rows.slice(0, limit) : rows;
      const last = page.at(-1);
      return {
        edges: page.map((node) => ({
          cursor: encodeCursor(node.created_at, node.id),
          node,
        })),
        pageInfo: {
          hasNextPage,
          endCursor: last ? encodeCursor(last.created_at, last.id) : null,
        },
      };
    },

    // Aturan tingkat field: skalar sensitif hilang untuk non-admin,
    // tidak peduli seberapa dalam query bersarang.
    internalNotes: (project: ProjectRow, _: unknown, ctx: Context) =>
      ctx.viewer?.role === "ADMIN" ? project.internal_notes : null,
  },

  Task: {
    // Dibiarkan nullable pada skema agar tugas tanpa penanggung jawab tidak menggagalkan induknya.
    assignee: (task: { assignee_id: number | null }, _: unknown, ctx: Context) =>
      task.assignee_id ? ctx.loaders.userById.load(task.assignee_id) : null,

    project: (task: { project_id: number }, _: unknown, ctx: Context) =>
      ctx.loaders.projectById.load(task.project_id),

    status: (task: { status: string }) => task.status,
  },
};
```

### Server: operasi HTTP dan subscription pada satu port

```typescript
import { createSchema, createYoga } from "graphql-yoga";
import { readFileSync } from "node:fs";
import { createDatabase } from "./db";
import { createContext, type Context } from "./context";
import { resolvers } from "./resolvers";

const db = createDatabase(process.env.DATABASE_PATH ?? ":memory:");

// Pub/sub minimal: id proyek -> kumpulan callback listener.
const topics = new Map<number, Set<(payload: unknown) => void>>();

function publish(projectId: number, task: unknown) {
  for (const listener of topics.get(projectId) ?? []) listener(task);
}

function subscribe(projectId: number, listener: (payload: unknown) => void) {
  const set = topics.get(projectId) ?? new Set();
  set.add(listener);
  topics.set(projectId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) topics.delete(projectId);
  };
}

const typeDefs = readFileSync(new URL("../schema.graphql", import.meta.url), "utf8");

const yoga = createYoga<{ upgrade: boolean }>({
  schema: createSchema({
    typeDefs,
    resolvers: {
      ...resolvers,
      Subscription: {
        taskStatusChanged: {
          subscribe: async function* (_: unknown, args: { projectId: string }, ctx: Context) {
            const projectId = Number(args.projectId);
            const queue: unknown[] = [];
            let resolveNext: (() => void) | null = null;
            const unsubscribe = subscribe(projectId, (task) => {
              queue.push(task);
              resolveNext?.();
            });
            const abort = ctx.signal;
            try {
              while (!abort.aborted) {
                if (queue.length === 0) {
                  await new Promise<void>((resolve) => {
                    resolveNext = resolve;
                    abort.addEventListener("abort", () => resolve(), { once: true });
                  });
                }
                const next = queue.shift();
                if (next !== undefined) yield { taskStatusChanged: next };
              }
            } finally {
              unsubscribe();
            }
          },
          resolve: (payload: unknown) => payload,
        },
      },
    },
  }),
  context: ({ request }) => createContext(db, request.headers, publish),
  graphqlEndpoint: "/graphql",
});

const server = Bun.serve({
  port: Number(process.env.PORT ?? 4000),
  // Query dan mutation HTTP langsung menuju handler fetch Yoga.
  fetch: (request, srv) => {
    const url = new URL(request.url);
    if (url.pathname === "/graphql" && request.headers.get("upgrade") === "websocket") {
      if (srv.upgrade(request, { data: { projectId: Number(url.searchParams.get("projectId")) } })) {
        return undefined as unknown as Response;
      }
      return new Response("Expected websocket upgrade", { status: 400 });
    }
    return yoga.fetch(request);
  },
  websocket: {
    async message(ws, raw) {
      // subscribe() milik Yoga menjalankan skema yang sama lewat socket.
      const result = await yoga.fetch(
        new Request(`http://localhost/graphql`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-websocket": "1" },
          body: typeof raw === "string" ? raw : new TextDecoder().decode(raw),
        }),
      );
      const payload = await result.text();
      ws.send(payload);
    },
    close(ws) {
      // Batalkan setiap stream milik socket ini agar iterator dan
      // handle pernyataan SQLite yang dipegangnya dilepaskan.
      ws.data?.abort?.abort();
    },
  },
});

console.log(`GraphQL API ready on ${server.url}graphql`);
```

### Seed data dan query pertama

```bash
bun -e '
const { Database } = require("bun:sqlite");
const db = new Database(process.env.DATABASE_PATH ?? ":memory:");
db.exec("INSERT INTO users (id, name, email, role) VALUES (1, \"Ada\", \"ada@example.com\", \"ADMIN\")");
db.exec("INSERT INTO projects (id, name, owner_id, created_at) VALUES (1, \"Launch\", 1, 1700000000000)");
console.log("seeded");
'
```

```bash
curl -s http://localhost:4000/graphql \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer 1' \
  -d '{"query":"{ viewer { name role } projects(first: 2) { edges { cursor node { name tasks(first: 3) { edges { node { title status } } } } } pageInfo { hasNextPage endCursor } } }"}'
```

### Pengujian dengan `bun test`

```typescript
import { describe, expect, test, beforeEach } from "bun:test";
import { createSchema } from "graphql-yoga";
import { graphql } from "graphql";
import { readFileSync } from "node:fs";
import { createDatabase } from "../src/db";
import { createContext } from "../src/context";
import { resolvers } from "../src/resolvers";

const typeDefs = readFileSync(new URL("../schema.graphql", import.meta.url), "utf8");

let db: ReturnType<typeof createDatabase>;

beforeEach(() => {
  db = createDatabase();
  db.exec("INSERT INTO users (id, name, email, role) VALUES (1, 'Ada', 'ada@example.com', 'ADMIN')");
  db.exec("INSERT INTO users (id, name, email, role) VALUES (2, 'Grace', 'grace@example.com', 'MEMBER')");
  db.exec("INSERT INTO projects (id, name, owner_id, internal_notes, created_at) VALUES (1, 'Launch', 1, 'margin 40%', 1700000000000)");
  db.exec("INSERT INTO tasks (id, project_id, title, created_at) VALUES (1, 1, 'Write spec', 1700000000001)");
  db.exec("INSERT INTO tasks (id, project_id, title, created_at) VALUES (2, 1, 'Ship beta', 1700000000002)");
});

async function run(query: string, token: string | null) {
  const schema = createSchema({ typeDefs, resolvers });
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const ctx = await createContext(db, headers, () => {});
  return graphql({ schema, source: query, contextValue: ctx });
}

describe("project tracker schema", () => {
  test("lists a project with its tasks in one query", async () => {
    const result = await run("{ projects(first: 1) { edges { node { name tasks(first: 10) { edges { node { title } } } } } } }", "1");
    expect(result.errors).toBeUndefined();
    const edge = (result.data as any).projects.edges[0];
    expect(edge.node.tasks.edges.map((e: any) => e.node.title)).toEqual(["Ship beta", "Write spec"]);
  });

  test("hides internal notes from non-admins", async () => {
    const result = await run("{ projects(first: 1) { edges { node { internalNotes } } } }", "2");
    expect((result.data as any).projects.edges[0].node.internalNotes).toBeNull();
  });

  test("rejects anonymous access to projects", async () => {
    const result = await run("{ projects(first: 1) { edges { node { name } } } }", null);
    expect(result.errors?.[0]?.message).toContain("UNAUTHENTICATED");
  });

  test("returns a stable cursor for the next page", async () => {
    const result = await run("{ projects(first: 1) { pageInfo { hasNextPage endCursor } } }", "1");
    const pageInfo = (result.data as any).projects.pageInfo;
    expect(typeof pageInfo.endCursor).toBe("string");
  });
});
```

```bash
bun test
```

## Insight Penting

- **Buat DataLoader per request, jangan di level modul.** Cache-nya hanya dikunci oleh ID; loader yang dibagi akan membocorkan baris antar viewer dan mengubah pemeriksaan otorisasi menjadi sekadar saran.
- **Fungsi batch harus mengembalikan array sepanjang dan seurutan masukan.** Array yang lebih pendek atau berubah urutan menempelkan anak ke induk yang salah, dan kegagalannya baru muncul saat bersarang bersamaan.
- **Otorisasi ada di resolver, bukan hanya di pintu masuk.** Query `project(id:)` yang dijaga tidak membuktikan apa pun bila `viewer.projects` mengembalikan baris yang sama tanpa penjagaan — klien menelusuri jalur apa pun yang diekspos skema.
- **Paginasi cursor butuh kolom penentu kedua.** `(created_at, id)` stabil; `created_at` saja bisa menduplikasi atau melewatkan baris ketika timestamp bertabrakan.
- **Jaga nullability tetap jujur.** Janji non-null menggagalkan seluruh objek induk saat dilanggar, jadi sisakan `!` hanya untuk nilai yang dijamin domain dan biarkan field yang benar-benar opsional bersifat nullable.
- **Batalkan iterator subscription saat socket tertutup.** Setiap iterator hidup bisa memegang generator dan prepared statement; membocorkan satu per tab yang ditutup akan menurunkan performa proses dalam hitungan jam, bukan hari.
- **Batasi `first` di sisi server.** Batasi ukuran halaman (100 di sini) agar klien tidak bisa meminta seluruh tabel melalui satu field bertingkat.
- **Ukur keuntungan batching, jangan diasumsikan.** Catat jumlah pernyataan untuk query bertingkat sebelum dan sesudah loader aktif; lima puluh satu pernyataan menyusut menjadi empat adalah bukti bahwa resolver sudah benar.

## Langkah Berikutnya

- Tambahkan dukungan persisted query dan batas kedalaman query untuk melindungi endpoint dari nesting yang berlebihan.
- Terapkan direktif `@defer` pada field bertingkat yang mahal agar daftar `tasks` yang lambat dikirim setelah kerangka proyek dirender.
- Konfigurasikan flag health-check dan graphiql GraphQL Yoga per environment, lalu pasang endpoint di belakang pembatas laju yang dikunci per viewer.
- Baca panduan optimasi performa Bun di repositori ini untuk memprofilkan jalur panas resolver dengan `bun --inspect` dan `EXPLAIN QUERY PLAN` dari SQLite.
- Lanjutkan dengan silabus lanjutan Bun untuk internal runtime, worker thread, dan batas modul native.

## Kesimpulan

Anda telah membangun GraphQL API yang memakai satu skema untuk query, mutation, dan subscription dari satu proses Bun. Berkas skema memegang kontraknya, context membawa viewer dan loader per-request, resolver menegakkan akses pada batas field, dan cursor menjaga paginasi tetap stabil ketika data berubah di bawahnya. Empat keputusan itulah — bukan pilihan pustaka — yang membuat API layak dikirim ke produksi. Dari sini, tambahan dengan dampak terbesar adalah perlindungan di sekeliling perimeter: batas kedalaman, persisted query, dan pembatas laju, dilanjutkan dengan memprofilkan resolver yang paling sering berjalan.

---
title: "Cheat Sheet CLI dan API Bun"
description: "Referensi cepat komprehensif untuk perintah CLI Bun, API bawaan, manajemen paket, test runner, dan konfigurasi — mencakup alur kerja pengembangan harian hingga deployment produksi."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet CLI dan API Bun

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Buat proyek baru | `bun init` | Scaffolding proyek interaktif (package.json, tsconfig.json, entry file) |
| Jalankan file | `bun run index.ts` | Eksekusi file TypeScript/JavaScript |
| Mode pantau | `bun --watch app.ts` | Restart otomatis saat file berubah (pengganti nodemon) |
| Install dependensi | `bun install` | Instalasi dependensi cepat dari lockfile |
| Tambah paket | `bun add express` | Tambah dependensi runtime |
| Tambah dev dependency | `bun add -d typescript` | Tambah devDependency |
| Hapus paket | `bun remove lodash` | Hapus paket dan dari package.json |
| Jalankan tes | `bun test` | Eksekusi test runner kompatibel Jest |
| Build produksi | `bun build ./src/index.ts --outdir ./dist --target bun` | Bundle untuk runtime Bun |
| Format kode | `bun run prettier --write .` | Jalankan paket npm via bunx |
| Jalankan binary paket | `bunx prisma generate` | Setara npx untuk perintah satu kali |
| Perintah shell inline | `bun -e "console.log(1 + 1)"` | Eksekusi skrip tanpa file |
| Mulai REPL | `bun repl` | REPL Bun interaktif |
| Buat binary | `bun build --compile ./src/index.ts --outfile myapp` | Kompilasi ke executable mandiri |
| Cek versi | `bun --version` | Tampilkan versi Bun terinstal |

## Perintah Umum

### Inisialisasi Proyek

```bash
# Scaffolding proyek interaktif
bun init

# Buat package.json kosong
bun init -y

# Inisialisasi dengan entry point tertentu
bun init --entry=src/index.ts
```

### Menjalankan Skrip

```bash
# Jalankan file
bun run index.ts
bun run src/server.ts

# Jalankan skrip dari package.json
bun run dev
bun run build
bun run start

# Eksekusi skrip inline
bun -e "const x = await Bun.file('data.json').json(); console.log(x)"

# Mode pantau (restart otomatis saat perubahan)
bun --watch app.ts

# Hot reload (sama dengan --watch)
bun --hot app.ts

# Inspeksi dengan debugger
bun --inspect app.ts
bun --inspect-brk app.ts
```

### Manajemen Paket

```bash
# Install dari package.json
bun install

# Install dengan frozen lockfile (CI)
bun install --frozen-lockfile

# Install dependensi produksi saja
bun install --production

# Tambah paket
bun add lodash
bun add zod@3.22.0
bun add @types/node -d

# Hapus paket
bun remove axios

# Update semua dependensi
bun update

# Update paket tertentu
bun update zod

# Jalankan binary paket tanpa instalasi
bunx prisma db push
bunx create-vite my-app

# Daftar paket terinstal
bun pm ls

# Operasi cache
bun pm cache list
bun pm cache clean
```

### Bundling

```bash
# Bundle dasar untuk runtime Bun
bun build ./src/index.ts --outdir ./dist --target bun

# Bundle untuk browser
bun build ./src/index.ts --outdir ./dist --target browser

# Bundle untuk Node.js
bun build ./src/index.ts --outdir ./dist --target node

# Minifikasi produksi
bun build ./src/index.ts --outdir ./dist --minify

# Generate source maps
bun build ./src/index.ts --outdir ./dist --sourcemap

# Bundle dengan paket eksternal
bun build ./src/index.ts --outdir ./dist --external react

# Bagi menjadi beberapa chunk
bun build ./src/index.ts --outdir ./dist --splitting

# Kompilasi ke binary executable tunggal
bun build --compile ./src/index.ts --outfile myapp
```

### Pengujian

```bash
# Jalankan semua tes
bun test

# Jalankan tes dalam mode pantau
bun test --watch

# Jalankan tes dengan coverage
bun test --coverage

# Jalankan file tes tertentu
bun test tests/api.test.ts

# Jalankan tes dengan pola nama
bun test --test-name-pattern "auth"

# Update snapshot
bun test --update-snapshots

# Jalankan tes dengan output lebih verbose
bun test --verbose
```

### TypeScript & Lingkungan

```bash
# Type-check tanpa menjalankan
bun run tsc --noEmit

# Generate deklarasi TypeScript
bun build ./src/index.ts --outdir ./dist --declaration

# Muat file .env tertentu
bun --env-file=.env.production run app.ts
```

## Potongan Kode

### HTTP Server — Bun.serve()

```typescript
// HTTP server dasar
Bun.serve({
  port: 3000,
  fetch(request) {
    return new Response("Halo, Bun!");
  },
});

// Server dengan routing
const server = Bun.serve({
  port: 3000,
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/users" && request.method === "GET") {
      return Response.json([{ id: 1, name: "Alice" }]);
    }
    if (url.pathname === "/api/users" && request.method === "POST") {
      return new Response("Dibuat", { status: 201 });
    }
    return new Response("Tidak Ditemukan", { status: 404 });
  },
});

console.log(`Mendengarkan di http://localhost:${server.port}`);

// Server TLS/HTTPS
Bun.serve({
  port: 443,
  tls: {
    key: Bun.file("key.pem"),
    cert: Bun.file("cert.pem"),
  },
  fetch(request) {
    return new Response("Koneksi aman!");
  },
});

// Server WebSocket
Bun.serve({
  port: 3000,
  fetch(request, server) {
    if (request.headers.get("upgrade") === "websocket") {
      return server.upgrade(request);
    }
    return new Response("Server WebSocket");
  },
  websocket: {
    message(ws, message) {
      ws.send(`Echo: ${message}`);
    },
    open(ws) {
      console.log("Klien terhubung");
    },
    close(ws) {
      console.log("Klien terputus");
    },
  },
});
```

### Input/Output File

```typescript
// Baca file sebagai teks
const text = await Bun.file("data.txt").text();

// Baca file sebagai JSON
const json = await Bun.file("config.json").json();

// Baca file sebagai ArrayBuffer
const buffer = await Bun.file("image.png").arrayBuffer();

// Baca file sebagai stream
const stream = Bun.file("video.mp4").stream();

// Tulis string ke file
await Bun.write("output.txt", "Halo, dunia!");

// Tulis JSON ke file
await Bun.write("data.json", JSON.stringify({ key: "value" }, null, 2));

// Tulis Response ke file
await Bun.write("page.html", await fetch("https://example.com"));

// Cek apakah file ada
const file = Bun.file("path/to/file");
const exists = await file.exists();
const size = file.size;
const type = file.type;

// Stream file langsung sebagai response HTTP
Bun.serve({
  port: 3000,
  fetch() {
    return new Response(Bun.file("public/index.html"));
  },
});

// Writer untuk stream tulis
const writer = Bun.file("output.txt").writer();
await writer.write("Baris pertama\n");
await writer.write("Baris kedua\n");
await writer.end();
```

### SQLite — bun:sqlite

```typescript
import { Database } from "bun:sqlite";

// Buka atau buat database
const db = new Database("app.db");

// Database in-memory
const mem = new Database(":memory:");

// Buat tabel
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  )
`);

// Insert dengan prepared statement
const insert = db.prepare(
  "INSERT INTO users (name, email) VALUES ($name, $email)"
);
insert.run({ $name: "Budi", $email: "budi@example.com" });

// Query semua baris
const all = db.query("SELECT * FROM users").all();

// Query satu baris
const user = db.query("SELECT * FROM users WHERE id = $id").get({ $id: 1 });

// Query dengan tipe yang dipetakan
type User = { id: number; name: string; email: string };
const users = db.query<User, []>("SELECT * FROM users").all();

// Transaksi
const addUser = db.transaction(
  (name: string, email: string) => {
    db.run("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);
    return db.query("SELECT last_insert_rowid()").get();
  }
);
addUser("Charlie", "charlie@example.com");

// Mode WAL untuk pembacaan konkuren
db.run("PRAGMA journal_mode = WAL;");

// Tutup koneksi
db.close();
```

### Lingkungan & Konfigurasi

```typescript
// Baca variabel lingkungan
const port = Bun.env.PORT;
const dbUrl = Bun.env.DATABASE_URL;

// Dengan konversi tipe
const timeout = parseInt(Bun.env.TIMEOUT || "5000", 10);

// Cek variabel env yang diperlukan
if (!Bun.env.API_KEY) {
  throw new Error("API_KEY diperlukan");
}

// Akses env dengan type-safe
const env = {
  PORT: parseInt(Bun.env.PORT || "3000", 10),
  NODE_ENV: Bun.env.NODE_ENV || "development",
  DATABASE_URL: Bun.env.DATABASE_URL || "",
};

// Muat file env kustom
// Jalankan dengan: bun --env-file=.env.local app.ts
// Atau: bun --env-file=.env.production app.ts

// Bun otomatis memuat: .env, .env.local, .env.production
```

### API Pengujian — bun:test

```typescript
import { describe, expect, test, beforeAll, mock, spyOn } from "bun:test";

// Tes dasar
test("menambahkan 1 + 2 sama dengan 3", () => {
  expect(1 + 2).toBe(3);
});

// Tes async
test("mengambil data", async () => {
  const response = await fetch("https://api.example.com/data");
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data).toHaveProperty("results");
});

// Tes berkelompok
describe("UserService", () => {
  beforeAll(() => {
    // Setup
  });

  test("membuat user baru", () => {
    // ...
  });

  test("menemukan user yang sudah ada", () => {
    // ...
  });
});

// Mock fungsi
const fetchMock = mock(() => Response.json({ id: 1 }));
const response = await fetchMock();
expect(fetchMock).toHaveBeenCalledTimes(1);

// Snapshot testing
test("cocok dengan snapshot", () => {
  const data = { user: { name: "Alice", age: 30 } };
  expect(data).toMatchSnapshot();
});

// Timer
import { fakeTimers } from "bun:test";
fakeTimers();

// Lifecycle hooks
beforeAll(() => { /* sebelum semua tes */ });
afterAll(() => { /* setelah semua tes */ });
beforeEach(() => { /* sebelum setiap tes */ });
afterEach(() => { /* setelah setiap tes */ });
```

### Manajemen Proses

```typescript
// Spawn proses anak
const proc = Bun.spawn(["echo", "Halo dari Bun!"]);
const output = await new Response(proc.stdout).text();
console.log(output); // "Halo dari Bun!"

// Spawn dengan stdin
const proc2 = Bun.spawn(["wc", "-w"], {
  stdin: Bun.file("input.txt"),
});

// Spawn dengan pipes
const proc3 = Bun.spawn(["node", "server.js"], {
  env: { PORT: "3001" },
  cwd: "/path/to/project",
});

// Baca stdout sebagai teks
const text = await Bun.readableStreamToText(proc3.stdout);

// Dapatkan kode keluar
const exitCode = await proc3.exited;

// Jalankan perintah shell
const result = await Bun.$`echo "Halo dari Bun!"`;
console.log(result.text());

// Pipe shell
const piped = await Bun.$`cat package.json | jq '.name'`;
console.log(piped.text());

// Hentikan proses
proc.kill();
```

### Modul Bawaan

```typescript
// bun:sqlite — Database SQLite
import { Database } from "bun:sqlite";

// bun:test — Test runner
import { describe, expect, test, mock } from "bun:test";

// bun:ffi — Foreign function interface
import { dlopen, suffix } from "bun:ffi";

// bun:wrap — Pembungkus modul bawaan
import { gc, drain } from "bun:jsc";

// bun — API Global (tanpa perlu import)
// Bun.serve(), Bun.file(), Bun.write(), Bun.env, Bun.spawn(), Bun.build()
// Bun.version, Bun.revision, Bun.nanoseconds(), Bun.sleep(), Bun.hash()
```

### Performa & Debugging

```typescript
// Waktu resolusi tinggi
const start = Bun.nanoseconds();
// ... lakukan sesuatu ...
const elapsed = Bun.nanoseconds() - start;
console.log(`Membutuhkan ${elapsed / 1_000_000}ms`);

// Sleep / delay
await Bun.sleep(1000); // tidur 1 detik
await Bun.sleep(50);   // tidur 50ms

// Penggunaan memori
const usage = process.memoryUsage();
console.log(usage);

// Inspector untuk Chrome DevTools
// bun --inspect app.ts
// Lalu buka chrome://inspect di Chrome

// Fungsi hash bawaan Bun
const hash = await Bun.hash("string-saya");
// Versi sinkron
const hashSync = Bun.hashSync("string-saya");
```

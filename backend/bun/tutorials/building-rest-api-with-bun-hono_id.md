---
title: "Membangun REST API dengan Bun dan Hono"
description: "Membangun REST API bertipe dengan Hono di runtime Bun — routing, validasi Zod, middleware request ID, penanganan error terpusat, pengujian bun:test, dan deployment."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun REST API dengan Bun dan Hono

## Ringkasan

Membangun REST API manajemen tugas memakai Hono di runtime Bun: routing bertipe, validasi Zod, logging berkorelasi, satu pemformat error, test in-process, dan dua jalur deployment.

## Target Audiens

- Backend developer yang memahami HTTP dan TypeScript serta menginginkan stack kecil namun cepat.
- Pengembang level menengah yang nyaman dengan async/await, API JSON, dan generic.

## Prasyarat

- Bun 1.1+ terpasang (`bun --version`), plus Node.js 20+ untuk tooling editor.
- `bun add hono @hono/zod-validator zod && bun add -d @types/bun` pada proyek baru hasil `bun init -y`.
- Paham semantik REST, status code HTTP, dan `curl` untuk pemeriksaan manual.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menyajikan aplikasi Hono lewat `Bun.serve` dengan shutdown yang rapi.
- Memberi tipe pada parameter path dan query serta memvalidasi body dengan Zod.
- Menerapkan middleware request ID, logging, dan CORS.
- Memusatkan kegagalan terduga dan tak terduga, lalu menguji serta men-deploy.

## Konteks dan Motivasi

API bergaya Express di Node membawa rantai middleware panjang, langkah transpile terpisah, dan pohon dependensi besar. Hono adalah router berbasis standar Web berukuran sekitar 14 kB dengan inferensi TypeScript sungguhan, sehingga `c.req.param("id")` sudah bertipe saat kompilasi. Bun menyediakan TypeScript native, test runner bawaan, dan `Bun.serve` yang menangani puluhan ribu request per detik per core. Hasilnya adalah layanan yang bisa dibaca dalam sekali duduk, dengan bentuk validasi dan error yang didefinisikan sekali lalu dipakai ulang oleh test maupun klien.

## Konten Inti

### Pelapisan, validasi, dan error

Pisahkan transport (route, middleware) dari logika domain (service). `app.ts` merakit instance Hono dan diekspor untuk test, sedangkan `index.ts` memegang `Bun.serve` dan penanganan signal, sehingga test tidak pernah membuka port.

`@hono/zod-validator` mengubah skema menjadi middleware yang memparsing `json`, `query`, atau `param`, jadi `c.req.valid("json")` terinferensi tanpa cast. Modelkan kegagalan yang diperkirakan (404, 409 saat duplikat) sebagai `HttpError` berisi status dan kode yang bisa dibaca mesin; catat kegagalan tak terduga bersama request ID dan kembalikan 500 tanpa detail internal. `app.onError` memformat keduanya.

## Contoh Kode

### Error dan middleware error

```typescript
// src/errors.ts
import type { Context } from "hono";

export class HttpError extends Error {
    constructor(
        public readonly status: 400 | 404 | 409 | 422 | 500,
        message: string,
        public readonly code = "error",
    ) {
        super(message);
    }
}

export function onError(err: Error, c: Context) {
    const requestId = c.get("requestId") ?? "tidak-diketahui";
    if (err instanceof HttpError) return c.json({ error: { code: err.code, message: err.message, requestId } }, err.status);
    // Tak terduga: catat dengan korelasi, jangan bocorkan detail ke klien
    console.error(JSON.stringify({ level: "error", requestId, message: err.message }));
    return c.json({ error: { code: "internal_error", message: "Terjadi kesalahan tak terduga", requestId } }, 500);
}
```

### Route bertipe dengan validasi

```typescript
// src/routes/tasks.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HttpError } from "../errors";
import { listTasks, createTask } from "../services/tasks";

const createSchema = z.object({ title: z.string().min(1).max(120), done: z.boolean().default(false) });
export const tasks = new Hono<{ Variables: { requestId: string } }>();

tasks.get("/", async (c) => c.json({ items: await listTasks(c.req.query("done") === "true") }));
tasks.post("/", zValidator("json", createSchema, (result) => {
    if (!result.success) throw new HttpError(422, "Payload tidak valid", "validation_failed");
}), async (c) => c.json(await createTask(c.req.valid("json")), 201));
```

### Perakitan aplikasi dan entrypoint server

```typescript
// src/app.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { onError } from "./errors";
import { tasks } from "./routes/tasks";

export const app = new Hono<{ Variables: { requestId: string } }>();

app.use("*", createMiddleware<{ Variables: { requestId: string } }>(async (c, next) => {
    const id = c.req.header("x-request-id") ?? crypto.randomUUID();
    c.set("requestId", id); c.header("x-request-id", id);
    const start = performance.now();
    await next();
    console.log(JSON.stringify({ requestId: id, path: c.req.path, status: c.res.status, ms: Math.round(performance.now() - start) }));
}));
app.use("/api/*", cors({ origin: ["https://app.example.com"], maxAge: 600 }));
app.route("/api/tasks", tasks);
app.onError(onError);
```

```typescript
// src/index.ts
import { app } from "./app";

const server = Bun.serve({ port: Number(Bun.env.PORT ?? 3000), fetch: app.fetch });

for (const sig of ["SIGTERM", "SIGINT"] as const) process.on(sig, () => server.stop().then(() => process.exit(0)));
console.log(`mendengarkan di :${server.port}`);
```

### Test dan deploy

Jalankan test dengan `bun test`; aplikasi dipanggil in-process sehingga tidak ada port yang dibuka. Deploy dengan `bun src/index.ts` atau `bun build --compile --minify src/index.ts --outfile ./dist/api`.

```typescript
// src/app.test.ts
import { expect, it } from "bun:test";
import { app } from "./app";

const post = (title: string) =>
    app.request("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) });

it("membuat tugas baru", async () => {
    const res = await post("menulis test");
    expect(res.status).toBe(201);
    expect(res.headers.get("x-request-id")).toBeTruthy();
});

it("menolak judul kosong", async () => {
    const res = await post("");
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("validation_failed");
});
```

## Insight Penting

- Ekspor aplikasi dari `app.ts` dan simpan `Bun.serve` di `index.ts`, agar test tetap tanpa port.
- Validasi sekali di batas aplikasi, lalu percayai tipe hasil inferensinya di lapisan bawah.
- Kembalikan `x-request-id` pada setiap respons agar tangkapan layar kegagalan mudah dicari di log.
- Satu proses melayani semua request dan Hono tidak membatasi ukuran body JSON: hindari state mutable bersama dan tambahkan pembatas ukuran pada endpoint publik.
- `bun build --compile` kurang baik menangani addon native; bila butuh `bcrypt`, deploy sebagai proses Bun.

## Langkah Berikutnya

- Tambahkan persistensi dengan `bun:sqlite` dan Drizzle, bungkus operasi tulis dalam transaksi.
- Lapisi autentikasi dengan middleware `bearerAuth` Hono dan token berskope.
- Pecah API menjadi beberapa paket memakai cheat sheet monorepo Bun Workspaces.

## Kesimpulan

Anda kini memiliki route bertipe, validasi di batas aplikasi, logging berkorelasi, satu pemformat error, dan test in-process yang cepat dalam stack cukup kecil untuk dibaca utuh. Persistensi, autentikasi, dan otomasi deploy kini menjadi penambahan, bukan perubahan struktural.

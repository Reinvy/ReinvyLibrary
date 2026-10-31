---
title: "Panduan Strategi Testing Express.js"
description: "Strategi testing praktis untuk Express.js: pembagian test pyramid, integration test dengan supertest, isolasi database, mocking pada batas arsitektur, dan gate coverage di CI."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Strategi Testing Express.js

## Pendahuluan

Express hampir tidak memaksakan struktur apa pun, sehingga test suite tumbuh dengan cara yang sama seperti aplikasinya: tanpa rencana. Tim berakhir dengan beberapa skrip lambat yang menembak database sungguhan, satu unit test untuk file utility, dan tanpa keyakinan bahwa sebuah route masih mengembalikan status code yang benar.

Strategi testing menyelesaikan ini dengan memutuskan **lapisan mana yang bertanggung jawab atas assertion apa** sebelum test ditulis. Targetnya: suite yang selesai dalam hitungan detik di lokal, gagal karena tepat satu alasan, dan mencakup hal yang diandalkan pemanggil — kontrak HTTP, aturan validasi, dan efek samping persistensi. Semua contoh di bawah berjalan dengan Jest, Vitest, maupun `node:test`.

## Praktik Terbaik

- **Sesuaikan pyramid untuk I/O.** Kira-kira 60% unit, 30% integrasi lewat HTTP, 10% smoke. Aplikasi Express adalah lapisan glue tipis, sehingga lapisan integrasi memberi nilai terbesar per baris kode test.
- **Assert pada batas yang Anda miliki.** Status code, body respons, state database — bukan apakah `service.findById` dipanggil, kecuali pemanggilan itu sendiri adalah kontrak.
- **Satu proses test, satu schema.** Beri setiap file test schema atau file SQLite sendiri agar eksekusi paralel tidak bergantung pada urutan.
- **Mocking pada seam arsitektur, bukan pada HTTP.** Stub repository, mailer, dan klien pembayaran; gunakan `supertest` terhadap middleware stack asli alih-alih objek `req`/`res` buatan tangan.
- **Truncate, jangan migrasi ulang.** Migrasi sekali per suite, bersihkan tabel antar test; migrasi per test akan mendominasi waktu eksekusi.
- **Kunci waktu, randomness, dan ID eksternal.** Injeksikan clock dan generator ID agar assertion tidak bergantung pada waktu nyata atau nilai uuid.
- **Gate coverage per direktori.** Threshold global menyembunyikan lapisan yang lemah; threshold pada `src/services` dan `src/routes` tidak.
- **Deterministik sebelum cepat.** Test yang lulus 95% waktu akan melatih tim menjalankan ulang CI alih-alih membaca kegagalan.

## Langkah Implementasi

### Langkah 1: Susun direktori test berdampingan dengan kode

```text
src/routes/orders.js, orders.test.js        # unit: wiring dengan service yang di-stub
src/services/order-service.js, .test.js     # unit: aturan harga dan transisi status
test/integration/orders.test.js             # supertest + app asli + schema test
test/helpers/db.js                          # migrasi sekali, truncate antar test
```

### Langkah 2: Ekspor app factory, bukan server yang langsung listen

Test harus mengimpor aplikasi tanpa mengikat port. Jaga `app.js` bebas dari `listen()`; `server.js` yang memiliki port dan handler `SIGTERM` untuk menuntaskan request berjalan.

```javascript
// src/app.js
const express = require("express");
const ordersRouter = require("./routes/orders");
const { errorHandler } = require("./middleware/error-handler");

function createApp({ orderService }) {
    if (!orderService) {
        throw new Error("createApp membutuhkan dependency orderService");
    }
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter({ orderService }));
    app.use(errorHandler);
    return app;
}

module.exports = { createApp };
```

### Langkah 3: Unit test service dengan repository in-memory

```javascript
// src/services/order-service.test.js
const { createOrderService } = require("./order-service");

function buatRepository(seed = []) {
    const rows = [...seed];
    return {
        rows,
        findById: async (id) => rows.find((row) => row.id === id) ?? null,
        save: async (order) => {
            const index = rows.findIndex((row) => row.id === order.id);
            if (index === -1) rows.push(order);
            else rows[index] = order;
            return order;
        },
    };
}

test("menolak order dengan kuantitas negatif", async () => {
    const repository = buatRepository();
    const service = createOrderService({ repository });

    await expect(
        service.create({ sku: "SKU-1", quantity: -1, unitPrice: 1000 }),
    ).rejects.toMatchObject({ code: "INVALID_QUANTITY", status: 422 });
    expect(repository.rows).toHaveLength(0);
});
```

### Langkah 4: Isolasi integration test dengan schema per file

Beri setiap file test schema sendiri, migrasikan sekali, lalu truncate sebelum tiap test. Helper di bawah menurunkan nama schema dari worker id — validasi setiap identifier yang diinterpolasi ke DDL, dan jangan pernah mengambilnya dari input pengguna.

```sql
DROP SCHEMA IF EXISTS :schema CASCADE;
CREATE SCHEMA :schema;
SET search_path TO :schema;
CREATE TABLE orders (id text primary key, total integer not null);
```

```javascript
// test/integration/orders.test.js
const request = require("supertest");
const { createApp } = require("../../src/app");
const { createOrderService } = require("../../src/services/order-service");
const db = require("../helpers/db"); // pool + setup/truncate/teardown, schema per worker

let app;
beforeAll(async () => {
    await db.setup();
    app = createApp({ orderService: createOrderService({ pool: db.pool }) });
});
beforeEach(() => db.truncate());
afterAll(() => db.teardown());

test("POST /orders mengembalikan 201 dengan total terhitung", async () => {
    const response = await request(app)
        .post("/orders")
        .send({ sku: "SKU-1", quantity: 2, unitPrice: 1500 })
        .expect(201);

    expect(response.body).toMatchObject({ total: 3000 });
    const { rows } = await db.pool.query("SELECT id, total FROM orders");
    expect(rows).toHaveLength(1);
});

test("POST /orders memetakan kegagalan validasi ke 422", async () => {
    const response = await request(app)
        .post("/orders")
        .send({ sku: "SKU-1", quantity: 0, unitPrice: 1500 })
        .expect(422);

    expect(response.body.error.code).toBe("INVALID_QUANTITY");
});
```

### Langkah 5: Pasang gate pada lapisan yang penting

Atur `coverageThreshold` per direktori pada konfigurasi Jest (`./src/services/` 85% branch, `./src/routes/` 75%) dan jalankan `jest --ci --runInBand --coverage` di CI. Longgarkan `--runInBand` hanya setelah isolasi per schema melewati 50 build hijau; flakiness muncul di mode paralel, bukan di code review.

```yaml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres }
        ports: ["5432:5432"]
        options: --health-cmd pg_isready --health-interval 5s --health-retries 10
    env:
      TEST_DATABASE_URL: postgres://postgres:postgres@localhost:5432/app_test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run test:ci
```

---
title: "Express.js Testing Strategy Guide"
description: "A practical testing strategy for Express.js: test pyramid layering, supertest integration tests, isolated databases, mocking boundaries, and CI coverage gates."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Express.js Testing Strategy Guide

## Introduction

Express imposes almost no structure, so a test suite grows the same way the application does: by accident. Teams end up with a few slow scripts hitting a real database, one unit test for a utility file, and no confidence that a route still returns the right status code.

A strategy fixes this by deciding **which layer owns which assertion** before any test is written. The target: a suite that finishes in seconds locally, fails for exactly one reason, and covers what callers depend on — HTTP contracts, validation rules, and persistence side effects. Everything below works with Jest, Vitest, or `node:test`.

## Best Practices

- **Bend the pyramid for I/O.** Roughly 60% unit, 30% integration through HTTP, 10% smoke. Express apps are thin glue, so the integration layer earns the most value per line of test code.
- **Assert at the boundary you own.** Status code, response body, database state — not whether `service.findById` was called, unless the call is the contract.
- **One test process, one schema.** Give each test file its own schema or SQLite file so parallel runs cannot depend on ordering.
- **Mock at architectural seams, not at HTTP.** Stub repositories, mailers, and payment clients; use `supertest` against the real middleware stack instead of hand-built `req`/`res` objects.
- **Truncate, do not re-migrate.** Migrate once per suite, clean tables between tests; per-test migrations dominate runtime.
- **Pin time, randomness, and external IDs.** Inject a clock and an ID generator so assertions never depend on wall-clock or uuid values.
- **Gate coverage per directory.** Global thresholds hide weak layers; thresholds on `src/services` and `src/routes` do not.
- **Determinism before speed.** A test that passes 95% of the time teaches the team to re-run CI instead of reading the failure.

## Implementation Steps

### Step 1: Lay out the test tree next to the code

```text
src/routes/orders.js, orders.test.js        # unit: wiring with a stubbed service
src/services/order-service.js, .test.js     # unit: pricing and state rules
test/integration/orders.test.js             # supertest + real app + test schema
test/helpers/db.js                          # migrate once, truncate between tests
```

### Step 2: Export an app factory instead of a listening server

Tests must import the app without binding a port. Keep `app.js` free of `listen()`; `server.js` owns the port and a `SIGTERM` handler that drains in-flight requests.

```javascript
// src/app.js
const express = require("express");
const ordersRouter = require("./routes/orders");
const { errorHandler } = require("./middleware/error-handler");

function createApp({ orderService }) {
    if (!orderService) {
        throw new Error("createApp requires an orderService dependency");
    }
    const app = express();
    app.use(express.json());
    app.use("/orders", ordersRouter({ orderService }));
    app.use(errorHandler);
    return app;
}

module.exports = { createApp };
```

### Step 3: Unit-test the service against an in-memory repository

```javascript
// src/services/order-service.test.js
const { createOrderService } = require("./order-service");

function makeRepository(seed = []) {
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

test("rejects an order with a negative quantity", async () => {
    const repository = makeRepository();
    const service = createOrderService({ repository });

    await expect(
        service.create({ sku: "SKU-1", quantity: -1, unitPrice: 1000 }),
    ).rejects.toMatchObject({ code: "INVALID_QUANTITY", status: 422 });
    expect(repository.rows).toHaveLength(0);
});
```

### Step 4: Isolate integration tests with a per-file schema

Give each test file its own schema, migrate once, truncate before every test. The helper below derives the schema from the worker id — validate any identifier you interpolate into DDL, and never take it from user input.

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

test("POST /orders returns 201 with a computed total", async () => {
    const response = await request(app)
        .post("/orders")
        .send({ sku: "SKU-1", quantity: 2, unitPrice: 1500 })
        .expect(201);

    expect(response.body).toMatchObject({ total: 3000 });
    const { rows } = await db.pool.query("SELECT id, total FROM orders");
    expect(rows).toHaveLength(1);
});

test("POST /orders maps validation failures to 422", async () => {
    const response = await request(app)
        .post("/orders")
        .send({ sku: "SKU-1", quantity: 0, unitPrice: 1500 })
        .expect(422);

    expect(response.body.error.code).toBe("INVALID_QUANTITY");
});
```

### Step 5: Gate the build on the layers that matter

Set `coverageThreshold` per directory in the Jest config (`./src/services/` at 85% branches, `./src/routes/` at 75%) and run `jest --ci --runInBand --coverage` in CI. Relax `--runInBand` only after per-schema isolation has survived 50 green builds; flakiness surfaces in parallel mode, not in review.

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

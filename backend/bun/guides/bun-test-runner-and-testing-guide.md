---
title: "Bun Test Runner and Testing Best Practices Guide"
description: "A comprehensive guide to Bun's built-in test runner (bun:test) — covering test organization, lifecycle hooks, mocking and spies, module mocking, snapshot testing, HTTP and WebSocket integration tests, DOM testing, coverage analysis, and CI integration."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Bun Test Runner and Testing Best Practices Guide

## Introduction

Bun ships with a built-in, Jest-compatible test runner (`bun:test`) that requires zero configuration. Because Bun executes TypeScript and TSX natively, tests run directly against source files without a transpilation step, which makes the test loop significantly faster than Node.js-based setups. The runner supports the familiar `describe`/`test`/`it` API, lifecycle hooks, parameterized tests, mocking and spying, snapshot testing, coverage reporting, and DOM testing through pluggable environments such as happy-dom and jsdom.

This guide covers production-grade testing patterns for Bun applications: how to organize test suites, write deterministic unit tests, isolate dependencies with `mock()` and `mock.module()`, snapshot-test complex outputs, test HTTP servers and WebSocket endpoints, measure coverage, and integrate the test runner into CI pipelines. The focus is on practices that keep suites fast, reliable, and maintainable as the codebase grows.

## Best Practices

- **Place test files next to the code they test** — Co-locating `*.test.ts` files with their modules keeps imports short and relative, makes related code discoverable, and mirrors how Bun resolves modules. Reserve a top-level `tests/` directory for integration suites that span multiple modules.

- **Structure suites with `describe` blocks and lifecycle hooks** — Group related tests with `describe()` and use `beforeAll`/`beforeEach`/`afterEach`/`afterAll` to set up and tear down state. Each test file executes in its own process by default, so suites stay isolated from each other.

- **Prefer `mock()` and `spyOn()` over hand-written stubs** — `mock()` creates a fresh mock function with `.mock.calls`, `.mock.results`, and convenient `.mockReturnValue()` behavior. `spyOn()` wraps an existing object method so you can assert call counts and arguments while preserving the original implementation until you override it.

- **Isolate dependencies with `mock.module()`** — `mock.module()` intercepts the module registry, so `import` statements inside the tested module resolve to your mock. Call it before the import that triggers the dependency; repeated mocks of the same module reuse the first mock.

- **Keep tests deterministic and parallel-safe** — Bun runs test files in parallel by default. Avoid shared mutable module-level state, random values, and fixed ports. Use `beforeEach` to reset state, and inject clocks or fixed random seeds when asserting time- or randomness-dependent behavior.

- **Snapshot-test stable, human-readable output** — Use `toMatchSnapshot()` for outputs that are expensive to assert field by field, such as serialized JSON payloads, generated code, or error messages. Keep snapshots small and reviewable; prefer inline snapshots for short values that belong in the test file itself.

- **Exercise HTTP and WebSocket endpoints through real requests** — Start `Bun.serve()` in `beforeAll`, bind to an ephemeral port, and drive the server with `fetch()` or the WebSocket client. This validates routing, middleware, request parsing, and streaming paths end to end without external services.

- **Enforce coverage thresholds in CI** — `bun test --coverage` instruments the code with no extra dependencies. Set thresholds in `package.json` so coverage regressions fail the pipeline instead of being noticed weeks later.

## Implementation Steps

### Step 1: Set Up a Project and Run the First Test

Create a minimal project and confirm the runner discovers the test file. Bun matches `*.test.{ts,tsx,js,jsx}` (and `_test` suffix variants) recursively.

```text
├── package.json
├── tsconfig.json
└── src/
    ├── math.ts
    └── math.test.ts
```

```typescript
// src/math.ts
export function add(a: number, b: number): number {
  return a + b;
}
```

```typescript
// src/math.test.ts
import { describe, expect, test } from "bun:test";
import { add } from "./math";

describe("add", () => {
  test("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });
});
```

Run the suite:

```bash
bun test
```

The runner prints a per-file summary with pass/fail counts and durations.

### Step 2: Structure Suites with Hooks and Table-Driven Tests

Use lifecycle hooks for setup and teardown, and `test.each` for table-driven cases. Because each test file runs in its own process, hook state is scoped per file.

```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const db: string[] = [];

beforeEach(() => {
  db.length = 0;
});

afterEach(() => {
  // release external resources, if any
});

describe("user store", () => {
  test("inserts a user", () => {
    db.push("alice");
    expect(db).toContain("alice");
  });

  test("starts empty", () => {
    expect(db).toHaveLength(0);
  });
});

describe("formatting", () => {
  test.each([
    [1, 2, "3"],
    [10, 20, "30"],
  ])("sums %i and %i to %s", (a, b, expected) => {
    expect(String(a + b)).toBe(expected);
  });
});
```

### Step 3: Mock Functions, Object Methods, and Modules

`mock()` creates standalone mock functions; `spyOn()` wraps existing methods; `mock.module()` intercepts module imports. This example isolates a service whose dependency fetches from a remote API.

```typescript
// src/fetcher.ts
export async function fetchUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`);
  return res.json();
}
```

```typescript
// src/user-service.ts
import { fetchUser } from "./fetcher";

export async function getUserName(id: string) {
  const user = await fetchUser(id);
  return user.name;
}
```

```typescript
// src/user-service.test.ts
import { describe, expect, mock, mockModule, test } from "bun:test";

mockModule("./fetcher", () => ({
  fetchUser: mock(async () => ({ name: "Alice" })),
}));

import { getUserName } from "./user-service";

describe("getUserName", () => {
  test("returns the user name from the mocked fetcher", async () => {
    expect(await getUserName("u1")).toBe("Alice");
  });
});
```

For existing object methods, `spyOn` records calls while preserving the original implementation until you override or restore it:

```typescript
import { expect, spyOn, test } from "bun:test";

const logger = { log: (msg: string) => console.log(msg) };

test("spies on logger.log", () => {
  const spy = spyOn(logger, "log");
  logger.log("hello");
  expect(spy).toHaveBeenCalledWith("hello");
  spy.mockRestore();
});
```

### Step 4: Snapshot Testing

Use `toMatchSnapshot()` when the asserted output is verbose but stable. Snapshots are stored in `__snapshots__/` directories next to the test files.

```typescript
import { expect, test } from "bun:test";

function renderPage(user: { name: string; roles: string[] }) {
  return {
    title: `Dashboard for ${user.name}`,
    roles: user.roles,
  };
}

test("renders the dashboard payload", () => {
  const payload = renderPage({ name: "Alice", roles: ["admin", "editor"] });
  expect(payload).toMatchSnapshot();
});
```

Run `bun test -u` to update snapshots after an intentional output change. Keep snapshots focused — large snapshots obscure real regressions during review.

### Step 5: Test HTTP and WebSocket Endpoints

Start the server on an ephemeral port in `beforeAll` and exercise it with the Fetch API. This pattern covers REST endpoints, streaming responses, and error paths.

```typescript
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

let server: ReturnType<typeof Bun.serve>;
let baseUrl: string;

beforeAll(() => {
  server = Bun.serve({
    port: 0, // ephemeral port
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/health") {
        return Response.json({ status: "ok" });
      }
      return new Response("Not Found", { status: 404 });
    },
  });
  baseUrl = `http://${server.hostname}:${server.port}`;
});

afterAll(() => {
  server.stop();
});

describe("health endpoint", () => {
  test("returns ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
```

For WebSocket servers, connect with the WebSocket client and await messages to verify the upgrade and echo paths:

```typescript
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

let server: ReturnType<typeof Bun.serve>;
let wsUrl: string;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(req, srv) {
      if (srv.upgrade(req)) return;
      return new Response("Upgrade Required", { status: 426 });
    },
    websocket: {
      open(ws) {
        ws.send("welcome");
      },
      message(ws, msg) {
        ws.send(`echo: ${msg}`);
      },
    },
  });
  wsUrl = `ws://${server.hostname}:${server.port}`;
});

afterAll(() => {
  server.stop();
});

test("echoes messages over WebSocket", async () => {
  const ws = new WebSocket(wsUrl);
  await new Promise<void>((resolve) => {
    ws.onopen = () => {
      ws.send("hello");
      resolve();
    };
  });
  const reply = await new Promise<string>((resolve) => {
    ws.onmessage = (event) => resolve(String(event.data));
  });
  expect(reply).toBe("echo: hello");
  ws.close();
});
```

### Step 6: Enable DOM Testing and Coverage

Bun can run DOM-dependent tests with happy-dom (or jsdom) by enabling the DOM test environment in `package.json`. No separate test framework or test runner is needed.

```json
{
  "name": "my-app",
  "scripts": {
    "test": "bun test",
    "test:coverage": "bun test --coverage"
  },
  "bun": {
    "test": {
      "dom": true,
      "coverageThreshold": {
        "global": {
          "lines": 80,
          "functions": 75
        }
      }
    }
  },
  "devDependencies": {
    "happy-dom": "^15.0.0"
  }
}
```

```tsx
// src/button.test.tsx
import { expect, test } from "bun:test";

function Button({ label }: { label: string }) {
  return <button>{label}</button>;
}

test("renders a button with the label", () => {
  const el = <Button label="Save" /> as unknown as HTMLElement;
  expect(el.textContent).toBe("Save");
});
```

Generate a coverage report:

```bash
bun test --coverage
```

The reporter prints per-file line, function, and branch coverage, and exits non-zero when thresholds are violated — wire this into CI so uncovered regressions block merges.

### Step 7: Integrate with CI

Use `bun install --frozen-lockfile` and `bun test` in the pipeline so the CI environment matches local behavior exactly.

```yaml
name: Test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun test --coverage
```

The `oven-sh/setup-bun` action installs Bun in seconds, and the same commands work locally, keeping the local and CI test experience identical.

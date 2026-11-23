---
title: "Docker-Powered Integration Testing with Testcontainers"
description: "Build fast, deterministic integration tests by running real Postgres, Redis, and Kafka containers inside your test suite with Testcontainers — lifecycle choices, wait strategies, network sharing, reuse, and CI tuning."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Docker-Powered Integration Testing with Testcontainers

## Summary

This tutorial shows how to use Docker as test infrastructure: your test suite starts real dependency containers (PostgreSQL, Redis, Kafka) on demand, connects to them through mapped ports, and tears them down automatically. You will build a reusable fixture library, replace fixed `sleep` calls with real readiness checks, and tune the suite so it stays fast in CI rather than becoming a ten-minute bottleneck.

## Target Audience

- Backend and platform engineers who already containerize their applications and now want trustworthy integration tests.
- Intermediate to advanced developers comfortable with Docker images, port mapping, and a test runner such as Vitest, Jest, or Pytest.
- DevOps engineers responsible for making container-based test suites fast and non-flaky in CI.

## Prerequisites

- Docker Engine 24+ or Docker Desktop, with the daemon reachable from your shell (`docker info` succeeds).
- Node.js 20+ and a test runner (examples use Vitest, but the patterns map directly to Jest or Pytest).
- A working understanding of images vs containers, port mapping, and Docker networks.
- Familiarity with SQL migrations or an ORM such as Prisma, Knex, or Drizzle.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain how a Testcontainers client drives the Docker daemon and why it avoids test doubles for data stores.
- Choose between per-test, per-file, per-suite, and reused container lifecycles based on cost and isolation needs.
- Replace arbitrary sleeps with wait strategies that fail fast and accurately.
- Wire an application container and a dependency container onto a shared Docker network with DNS aliases.
- Seed and reset database state quickly using migrations and template databases.
- Diagnose leaked containers and cut suite runtime with image pre-pulls, reuse, and tmpfs data directories.

## Context and Motivation

Most "integration" tests in the wild are integration tests against a mock. They pass reliably, and they lie reliably. An in-memory Postgres substitute accepts a query that a real `CHECK` constraint rejects, an embedded Redis clone ignores `SETRANGE` offset semantics, and a mocked Kafka producer never exercises the consumer group rebalance your code depends on. The failures you most need to catch — constraint violations, transaction isolation, JSONB operators, `ON CONFLICT` behavior, TTL expiry — are exactly the behaviors a double cannot reproduce.

Using a long-lived shared staging database is the other common workaround, and it fails differently: tests interfere through shared rows, ordering matters, and a half-applied migration poisons every later run. Testcontainers takes a third path. Docker already gives you an isolated, cheap, reproducible copy of a service; the library simply starts that copy when the suite needs it, tells you the mapped port, and removes it when the run ends. The result is a real database with the ergonomics of a unit test.

## Core Content

### Why test doubles fail for data stores

A test double is a second implementation with its own bugs. Every behavior that differs between the double and the real service is a false green in your pipeline. Three categories account for most production incidents that slip past mocked tests:

- **Constraint and type semantics.** Postgres rejects a `varchar(12)` overflow, enforces foreign keys, and casts `'42'` to `integer` in a context where SQLite would store it as text.
- **Concurrency semantics.** `SELECT ... FOR UPDATE NOWAIT`, `SERIALIZABLE` retries, and unique-index conflicts under parallel writers exist only in the real engine.
- **Operational semantics.** Redis key eviction under `maxmemory`, Kafka consumer rebalance timing, and MySQL `utf8mb4` collation all change how application code behaves.

Testcontainers is not a mocking framework. It is a lifecycle manager that makes the real service as disposable as a mock. Treat it as the correct default for anything that crosses a network boundary into a datastore or broker.

### How Testcontainers talks to the Docker daemon

The client library never shells out to `docker run`. It speaks the Docker Engine API over the same socket the CLI uses, resolved from `DOCKER_HOST`, then falls back to `/var/run/docker.sock` on Linux and a named pipe on Windows. Understanding the sequence explains almost every error you will hit:

1. The client verifies the daemon is reachable, failing fast with a clear message rather than a timeout.
2. It pulls the image if absent, unless `withImagePullPolicy` or a pre-pull says otherwise.
3. It creates a container with a random name, publishes requested internal ports to ephemeral host ports, and starts it.
4. It runs the wait strategy until the container is genuinely ready or the startup timeout expires.
5. It returns connection details, most importantly `getMappedPort(5432)` and `getHost()`.
6. At shutdown, a sidecar container named Ryuk reaps everything labelled `org.testcontainers=true`, including containers orphaned by a crashed test process.

That last point matters in CI. When a test run is killed by a timeout, Ryuk still cleans up. When you run with `TESTCONTAINERS_RYUK_DISABLED=true` for speed, you own cleanup — and `docker ps --filter label=org.testcontainers=true` becomes your morning-after diagnostic.

### Lifecycle: per-test, per-file, per-suite, and reuse

Lifecycle choice is the single biggest lever on suite runtime. Startup cost dominates: a Postgres container typically needs 1.5–3 seconds to accept connections, a Kafka container 6–15 seconds.

| Lifecycle | Isolation | Cost | Use when |
|-----------|-----------|------|----------|
| Per test | Total | Highest | The test mutates global state a reset cannot undo |
| Per file / class | High, with truncation between tests | Medium | Default for most suites |
| Per suite (singleton) | Medium; requires cleanup discipline | Low | Read-mostly fixtures, schema-only tests |
| Reused across runs | Low; state persists | Lowest | Local development iteration only |

The practical default is **per file**, with a `beforeEach` that truncates mutable tables. Reserve per-test containers for the rare case where a test corrupts the database in a way truncation cannot repair, such as dropping a table or exhausting a sequence. Never enable cross-run reuse for CI: state from yesterday's run silently changes today's results, and a schema change can leave a container with the old structure running unnoticed.

### Wait strategies decide flakiness

`await new Promise((r) => setTimeout(r, 5000))` is the root cause of most flaky container tests. It is simultaneously too slow on fast machines and too short on loaded CI runners. Wait strategies replace the guess with a condition:

- `Wait.forLogMessage(...)` for services that announce readiness in logs, with a required occurrence count.
- `Wait.forListeningPort()` for services that accept connections only after initialization.
- `Wait.forHealthcheck()` when the image defines a `HEALTHCHECK`, which is the most accurate signal available.
- `Wait.forSuccessfulCommand(...)` for an application-level probe such as `pg_isready -U app -d app`.
- `Wait.forHttp(...)` for dependency sidecars exposing an HTTP endpoint.

Postgres prints its readiness banner twice during initialization: once for the temporary server used during `initdb`, and once for the real one. Waiting for a single occurrence connects you to a server that is about to be shut down. This is the most common cause of "works locally, fails in CI" with Postgres containers.

### Network sharing between the application and its dependencies

Two testing modes exist, and they are not interchangeable:

- **Host mode.** The test process runs on the host and connects to `localhost:<mappedPort>`. Simple, fast, and correct for nearly all application-level tests.
- **Network mode.** The application itself runs in a container (because you are testing the image you ship), so it cannot see host ports. Both containers join a user-defined Docker network and address each other by alias.

Network mode is what proves your final image actually works: entrypoint, non-root user, baked-in migrations, DNS resolution, and environment variable handling. A host-mode test can pass while the image is broken, because the image's wiring is never exercised.

### Reuse and startup cost in CI

Three techniques, applied in order, keep a container suite under a couple of minutes:

1. **Pre-pull images** in a dedicated CI step so the test job never pays network latency on a cold cache.
2. **Share one container per file** and reset state with `TRUNCATE ... RESTART IDENTITY CASCADE` rather than recreating the container.
3. **Use a template database** for schema setup: migrate once into `app_template`, then create each test database with `CREATE DATABASE test_n TEMPLATE app_template`, which is far cheaper than replaying migrations.

Local-only extras are a reusable container (`TESTCONTAINERS_REUSE_ENABLE=true` plus `~/.testcontainers.properties`) and a `tmpfs`-backed data directory, which drops Postgres startup to roughly one second because initialization no longer touches disk. Both trade durability for speed, so keep them out of CI configuration.

### Cleanup, leaks, and resource limits

A container suite is a resource leak waiting to happen if you ignore two details:

- **Explicit teardown.** Register `afterAll(() => container.stop())`, and wrap fixtures so a thrown assertion still stops containers.
- **Resource ceilings.** A runaway query in a test container can consume the runner's memory and trigger an OOM kill that looks like an unrelated failure. Apply limits through `withCreateContainerCmdModifier` and assert on them.

Also cap the startup timeout with `withStartupTimeout(Duration.ofSeconds(60))` so a broken image fails in a minute with a log tail rather than hanging until the job's global timeout. The failure message includes the last 100 log lines, which is usually enough to identify a missing environment variable without rerunning anything.

### Seeding data deterministically

Schema creation and data seeding are separate concerns with different costs. Run migrations once per container via `withCopyFilesToContainer` plus an init script, or by executing your migration CLI against the mapped port before the first test. Then reset data with truncation.

For fixtures, prefer explicit inserts with fixed primary keys over random data. Random data produces tests that fail once every few hundred runs when a generated string collides with a unique index — the worst possible failure mode, because it is unreproducible on demand. Where randomness is unavoidable, seed the generator with a constant.

## Code Examples

### Project layout

```text
tests/
  integration/
    fixtures/
      postgres-fixture.ts
      redis-fixture.ts
      broker-fixture.ts
    users.repository.test.ts
    checkout.flow.test.ts
    image-smoke.test.ts
  global-setup.ts
vitest.config.ts
```

### PostgreSQL fixture with a real readiness probe

```typescript
// tests/integration/fixtures/postgres-fixture.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | null = null;

export async function startPostgres(): Promise<StartedPostgreSqlContainer> {
  if (container) return container;

  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('app')
    .withUsername('app')
    .withPassword('app')
    // The banner is printed twice: once for initdb, once for the real server.
    .withWaitStrategy(
      (await import('testcontainers')).Wait.forLogMessage(
        /database system is ready to accept connections/,
        2,
      ),
    )
    .withStartupTimeout(60_000)
    .withTmpfs({ '/var/lib/postgresql/data': 'rw,noexec,nosuid,size=512m' })
    .withCreateContainerCmdModifier((cmd) => {
      cmd.withMemory(512 * 1024 * 1024);
    })
    .start();

  return container;
}

export async function resetDatabase(): Promise<void> {
  const { Client } = await import('pg');
  const client = new Client({
    host: container!.getHost(),
    port: container!.getMappedPort(5432),
    user: 'app',
    password: 'app',
    database: 'app',
  });
  await client.connect();
  await client.query('TRUNCATE users, orders, order_items RESTART IDENTITY CASCADE');
  await client.end();
}

export async function stopPostgres(): Promise<void> {
  await container?.stop();
  container = null;
}
```

### Shared fixture through a global setup file

```typescript
// tests/global-setup.ts
import { execFileSync } from 'node:child_process';
import { startPostgres, stopPostgres } from './integration/fixtures/postgres-fixture';

export async function setup() {
  const pg = await startPostgres();

  // Apply migrations once per container, against the mapped host port.
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: {
      ...process.env,
      DATABASE_URL: `postgresql://app:app@${pg.getHost()}:${pg.getMappedPort(5432)}/app`,
    },
    stdio: 'inherit',
  });

  process.env.TEST_DATABASE_URL = `postgresql://app:app@${pg.getHost()}:${pg.getMappedPort(5432)}/app`;
}

export async function teardown() {
  await stopPostgres();
}
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./tests/global-setup.ts'],
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
```

### Application container and dependency on a shared network

```typescript
// tests/integration/image-smoke.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenericContainer, Network, Wait, StartedNetwork } from 'testcontainers';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let network: StartedNetwork;
let pg: StartedPostgreSqlContainer;
let api: ReturnType<GenericContainer['start']> extends Promise<infer T> ? T : never;

beforeAll(async () => {
  network = await new Network().start();

  pg = await new PostgreSqlContainer('postgres:16-alpine')
    .withNetwork(network)
    .withNetworkAliases('db')          // resolvable as db:5432 inside the network
    .withDatabase('app')
    .withUsername('app')
    .withPassword('app')
    .withWaitStrategy(Wait.forSuccessfulCommand('pg_isready -U app -d app'))
    .start();

  // Start the image you actually ship, not a bind-mounted copy of the source.
  const apiContainer = await new GenericContainer('registry.example.com/shop-api:pr-482')
    .withNetwork(network)
    .withExposedPorts(8080)
    .withEnvironment({
      DATABASE_URL: 'postgresql://app:app@db:5432/app',   // DNS alias, not localhost
      NODE_ENV: 'production',
    })
    .withWaitStrategy(Wait.forHttp('/healthz', 8080).forStatusCode(200))
    .withStartupTimeout(90_000)
    .start();

  api = apiContainer as typeof api;
}, 180_000);

afterAll(async () => {
  await api?.stop();
  await pg?.stop();
  await network?.stop();
});

describe('shipped image', () => {
  it('serves the health endpoint with a real database behind it', async () => {
    const port = api.getMappedPort(8080);
    const response = await fetch(`http://${api.getHost()}:${port}/healthz`);
    expect(response.status).toBe(200);
  });
});
```

### Readiness reference for common images

```text
Image                    Probe                                          Occurrences
postgres:16-alpine       log: "database system is ready to accept"      2
redis:7-alpine           redis-cli ping returns PONG                    1
redpanda:latest          log: "Successfully started Redpanda"           1
localstack/localstack    http: /_localstack/health status 200           1
mysql:8                  log: "ready for connections"                   2
```

### CI workflow with pre-pulled images

```yaml
name: integration-tests
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Pre-pull test images
        run: |
          docker pull postgres:16-alpine &
          docker pull redis:7-alpine &
          wait

      - run: npm ci
      - name: Run integration suite
        env:
          TESTCONTAINERS_RYUK_DISABLED: "false"
        run: npm run test:integration

      - name: Fail on leaked containers
        if: always()
        run: |
          leaked=$(docker ps -aq --filter label=org.testcontainers=true | wc -l)
          echo "leaked containers: $leaked"
          test "$leaked" -eq 0
```

### Fast local-only overrides

```bash
# Enable cross-run reuse for fast local iteration (never in CI).
echo 'testcontainers.reuse.enable=true' >> ~/.testcontainers.properties

# Audit containers the suite left behind after an aborted run.
docker ps -a --filter label=org.testcontainers=true \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

# Remove them without touching unrelated workloads.
docker ps -aq --filter label=org.testcontainers=true | xargs -r docker rm -f
```

## Key Insights

- **Real services, disposable lifecycle.** The value of Testcontainers is lifecycle management, not the container itself. Anything that cannot be reset cheaply should get a dedicated container; anything that can should share one.
- **Never hardcode a port.** Only `getMappedPort(5432)` is correct. A fixed `5432` collides with a developer's local Postgres and with parallel test jobs on the same runner.
- **Ready is not the same as listening.** Waiting for a port means the socket opened; waiting for a command, log banner, or health check means the service can serve. The Postgres double-banner is the classic trap, and MySQL has it too.
- **`localhost` is wrong inside a network.** Once the application runs in a container, `localhost` refers to that container. Use network aliases, and keep host-mode and network-mode configuration separate rather than trying to make one URL serve both.
- **Test the image, not the source tree.** A bind mount over `/app` hides broken `COPY` steps and missing production dependencies. Ship-image smoke tests are the only tests that validate the artifact you deploy.
- **Reuse is a local convenience, not a CI optimization.** Cross-run reuse persists state and can serve a stale schema after a migration change, producing failures that vanish on a clean machine.
- **Cap every timeout.** `withStartupTimeout` bounds the failure; the global test timeout only tells you something hung, long after the useful log output has scrolled away.
- **Parallelism multiplies containers.** Four parallel workers mean four Postgres instances. Budget memory and connections accordingly, or run integration tests with a single worker and unit tests in parallel.
- **Watch image tags.** `postgres:16-alpine` is fine; `postgres:latest` makes tests change behavior without a code change. Pin digests when a surprise upstream release would be costly.

## Next Steps

- Read the Docker process supervision and graceful shutdown guide to make the same images exit cleanly when a test stops them.
- Study the Docker Compose networking guide to deepen the DNS and alias behavior used in network mode.
- Move database setup into a template database to cut per-file reset cost once the suite grows past a few dozen tests.
- Apply the same pattern to object storage and message brokers with LocalStack and Redpanda containers.
- Review the Docker security cheatsheet before running third-party test images in CI, especially with privileged ports or host mounts.

## Conclusion

You now have an integration suite that boots real infrastructure on demand: a Postgres fixture with an accurate readiness probe, a shared setup that migrates once per run, a network-mode smoke test that validates the image you deploy, and CI wiring that pre-pulls images and fails on leaks. The suite tests behavior a mock cannot represent — constraints, isolation, and DNS — while still finishing in the time a developer will tolerate before pushing.

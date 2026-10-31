---
title: "Building a Multi-Tenant SaaS API with NestJS"
description: "A hands-on tutorial for building a production-grade multi-tenant SaaS API with NestJS, covering tenant resolution, request context propagation, tenant-aware persistence, per-tenant quotas, and isolation testing."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Multi-Tenant SaaS API with NestJS

## Summary

This tutorial builds a multi-tenant SaaS backend with NestJS from the ground up: resolving the tenant on every inbound request, propagating tenant context through services without making the whole dependency graph request-scoped, enforcing tenant isolation in the persistence layer, applying per-tenant cache namespaces and quotas, and proving the isolation actually holds with automated tests. The finished API serves several customer organizations from a single deployment while guaranteeing that no query can read or write another tenant's rows.

## Target Audience

- Backend engineers who are comfortable with NestJS modules, controllers, providers, and guards.
- Developers who already shipped a single-tenant API and now need to turn it into a SaaS product.
- Platform engineers evaluating row-level versus schema-level isolation for a shared deployment.

## Prerequisites

- Working knowledge of NestJS (modules, DI, guards, interceptors, pipes).
- TypeScript experience, including generics and decorators.
- A PostgreSQL instance (Docker is fine) and Node.js 20 or newer.
- Familiarity with SQL, TypeORM or Prisma, and Redis basics.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Compare row-level, schema-level, and database-level tenant isolation and pick one deliberately.
- Resolve a tenant from a subdomain, header, or JWT claim with a NestJS middleware and validate its membership.
- Propagate tenant context with Node's `AsyncLocalStorage` instead of making every provider request-scoped.
- Make persistence tenant-aware so a missing tenant filter becomes impossible rather than merely discouraged.
- Enforce per-tenant cache namespacing, rate limits, and storage quotas.
- Write automated tests that fail when tenant isolation regresses.

## Context and Motivation

The jump from a single-tenant API to a SaaS product is rarely a scaling problem — it is an isolation problem. Once two customers share a deployment, every query that forgets a `WHERE tenant_id = ...` clause becomes a data breach, and every in-memory cache entry keyed only by resource ID becomes a cross-customer leak. Meanwhile the naive fix, making every provider request-scoped so it can receive the tenant ID, destroys NestJS's dependency injection performance because request scope bubbles up the entire provider graph.

The pattern that holds up in production separates three concerns: **resolution** (where the tenant comes from), **propagation** (how downstream code sees it), and **enforcement** (how the database refuses to answer without it). This tutorial builds all three, and treats enforcement as the load-bearing layer — because reviewers forget, and the database does not.

## Core Content

### What Multi-Tenancy Actually Requires

A multi-tenant API has three obligations that a single-tenant API never states explicitly:

1. **Tenant resolution** — every request carries exactly one tenant identity, derived from a trusted source. Path params and query strings are attacker-controlled and must not be trusted on their own; a header is only trustworthy if it is validated against the bearer token's user membership.
2. **Tenant propagation** — every layer between the controller and the database can read the current tenant without threading a parameter through ten function signatures.
3. **Tenant enforcement** — the storage layer rejects any operation lacking tenant scope. Ideally this is a hard failure, not a lint rule.

Resolution without enforcement is theatre: one forgotten `find({ where: { id } })` and customer A can read customer B's invoice.

### Choosing an Isolation Model

Three models dominate practice, and the choice is a product decision as much as a technical one.

| Model | Isolation strength | Cost per tenant | Migration cost | Best fit |
| --- | --- | --- | --- | --- |
| Shared tables, tenant column (row-level) | Logical only, enforced by every query | Near zero | One schema for everyone | Most B2B SaaS, thousands of small tenants |
| Shared database, schema per tenant | Strong logical, separate namespaces | Low, extra schema objects | Fan-out across N schemas | Regulated mid-market tenants, dozens to low hundreds |
| Database per tenant | Physical | High, per-tenant infra | Fan-out across connections | Enterprise contracts, single-tenant hosting clauses |

This tutorial implements the row-level model, then shows how to add schema-per-tenant suspension without rewriting the request pipeline. Row-level is the right default because it keeps deployment simple; when a customer contract demands stronger isolation, you promote that customer to a dedicated database while keeping the same application code path.

The critical addition for row-level isolation is PostgreSQL Row-Level Security (RLS). Application-level filters are a convention; RLS is a constraint the database enforces even when the query is wrong.

### Resolving the Tenant on Every Request

Resolution answers one question per request: which tenant is this caller acting inside?

Three signals are common:

- **Subdomain** — `acme.api.example.com`. Good UX, natural for customer-facing URLs, awkward for machine-to-machine clients.
- **Header** — `X-Tenant-Id: acme`. Easy for any client, but only safe when it is validated against the token.
- **JWT claim** — `{ "tid": "8f14e45f" }` inside the signed token. Strongest by default, because the signature already proves the claim.

A robust implementation accepts the header or subdomain as a *candidate* and then verifies membership against the authenticated principal. The verification step is what turns an untrusted string into a trusted tenant. Cache the membership lookup for the token's lifetime to keep it off the hot path.

Resolution also needs a fallback policy for unauthenticated routes: webhook receivers, health checks, and public marketing endpoints either map to no tenant or derive it from a signed payload. Do not let an unauthenticated path silently inherit a default tenant.

### Propagating Tenant Context Without Request Scoping Everything

The tempting NestJS solution is `Scope.REQUEST` on the tenant service. It works, and it costs you: request-scoped providers are instantiated per request, and every provider that injects them also becomes request-scoped, all the way down. On a hot endpoint with a deep provider graph this is measurable overhead, and it silently breaks providers that expect singleton lifecycle (connection pools, caches, background workers).

`AsyncLocalStorage`, part of Node's `async_hooks` module, gives the same ergonomics without touching DI scopes. A single global middleware runs the rest of the request inside a storage context; any provider — singleton or not — can read the tenant by calling `getStore()`. The call stack stays synchronous in style, and the tenant never has to be a constructor parameter.

The important guardrail: `AsyncLocalStorage` only propagates through async continuations that originate inside the `run()` callback. Work you hand off to `setImmediate`, a raw timer created outside the context, or a queue worker will not see the store. Background jobs must therefore carry the tenant ID explicitly in the job payload — the queue is a new context, not a continuation.

### Making Persistence Tenant-Aware

Two layers protect the data:

1. **A tenant-aware repository base** that injects the tenant predicate into every query automatically.
2. **Database Row-Level Security** that rejects any statement without a tenant setting.

The repository base makes the correct thing convenient. It exposes methods where the tenant filter is not a parameter — developers cannot pass the wrong tenant because they never pass one. Escape hatches (cross-tenant admin queries) must be explicitly named, for example `findAcrossTenants()`, so they stand out in code review.

The RLS layer makes the wrong thing impossible. Each request sets `app.current_tenant` on its connection transaction, and policies compare `tenant_id` against `current_setting('app.current_tenant')`. A query that forgets the filter returns zero rows instead of another customer's data. Note that the application database role must not own the tables or hold `BYPASSRLS`, otherwise policies are ignored.

There is a subtlety worth planning for: connection pooling. Because the setting is per connection, set it inside a transaction (`SET LOCAL`) or reset it on release. Leaking a tenant setting to the next request on a pooled connection is exactly the class of bug this design exists to prevent.

### Per-Tenant Caching and Quotas

Once requests carry a tenant, every cache key must too. A Redis key like `user:42` becomes `t:{tenantId}:user:42`. Two benefits: correctness, and a cheap way to invalidate or export an entire tenant's cache with a key scan on that prefix. Include the tenant in HTTP cache headers as well, or a CDN will happily serve one tenant's response to another.

Quotas fall out of the same context. Rate limits are per tenant, not per IP — a whole customer organization shares one budget. Enforce them in a guard backed by Redis so the limit is consistent across replicas, and separate the limit tiers by the tenant's plan stored on the tenant record.

### Guarding Against Cross-Tenant Leaks

Isolation fails in predictable places. Audit for these:

- Background jobs enqueued with only a resource ID, then executed without tenant context.
- Caches and materialized views keyed without the tenant.
- File storage paths shared across tenants (`uploads/<fileId>` instead of `uploads/<tenantId>/<fileId>`).
- Exports and reports written as raw SQL that bypasses the repository base.
- Admin and support tooling that queries across tenants without an audit trail.

The practical defense is a test suite that runs every tenant-scoped endpoint as tenant A against tenant B's resource IDs and asserts 404 (not 403 — do not confirm existence to a foreign tenant).

## Code Examples

### Project Layout

```text
src/
  app.module.ts
  main.ts
  tenant/
    tenant.module.ts
    tenant.middleware.ts
    tenant-context.ts
    tenant.guard.ts
    tenant.service.ts
    tenant.decorator.ts
  database/
    tenant-aware.repository.ts
    tenant-transaction.ts
  billing/
    billing.module.ts
    billing.controller.ts
    billing.service.ts
    billing.entity.ts
  quotas/
    quota.guard.ts
  common/
    redis.provider.ts
test/
  tenant-isolation.e2e-spec.ts
```

### Tenant Context with AsyncLocalStorage

```typescript
// src/tenant/tenant-context.ts
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantStore {
  tenantId: string;
  plan: 'free' | 'pro' | 'enterprise';
  userId?: string;
}

const storage = new AsyncLocalStorage<TenantStore>();

export function runWithTenant<T>(store: TenantStore, fn: () => T): T {
  return storage.run(store, fn);
}

export function getTenant(): TenantStore {
  const store = storage.getStore();
  if (!store) {
    throw new Error('Tenant context missing: this code path did not run inside TenantMiddleware');
  }
  return store;
}

export function tryGetTenant(): TenantStore | undefined {
  return storage.getStore();
}
```

The throwing accessor is deliberate. A missing tenant is a bug, and failing loudly at the first read is far cheaper than discovering it as a data leak months later.

### Resolving and Verifying the Tenant in Middleware

```typescript
// src/tenant/tenant.middleware.ts
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantService } from './tenant.service';
import { runWithTenant } from './tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenants: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const candidate =
      (req.headers['x-tenant-id'] as string | undefined) ??
      req.hostname.split('.')[0];

    const principal = (req as any).user; // set by the auth guard earlier in the chain
    if (!candidate) {
      return next();
    }

    const tenant = await this.tenants.resolveForPrincipal(candidate, principal?.sub);
    if (!tenant) {
      throw new UnauthorizedException('Unknown or inaccessible tenant');
    }

    res.setHeader('X-Tenant-Id', tenant.id);
    runWithTenant({ tenantId: tenant.id, plan: tenant.plan, userId: principal?.sub }, () =>
      next(),
    );
  }
}
```

`resolveForPrincipal` consults a short-lived Redis cache before hitting PostgreSQL, because it runs on every request:

```typescript
// src/tenant/tenant.service.ts (excerpt)
async resolveForPrincipal(slug: string, userId?: string) {
  const cacheKey = `t:resolve:${slug}`;
  const cached = await this.redis.get(cacheKey);
  const tenant = cached ? JSON.parse(cached) : await this.repo.findOneBy({ slug });

  if (!tenant || tenant.suspendedAt) return null;
  if (!userId) return tenant;
  if (tenant.ownerId === userId) return tenant;

  const member = await this.redis.get(`t:member:${tenant.id}:${userId}`);
  if (member) return tenant;

  const row = await this.membershipRepo.findOneBy({ tenantId: tenant.id, userId });
  if (!row) return null;

  await this.redis.set(`t:member:${tenant.id}:${userId}`, '1', 'EX', 300);
  return tenant;
}
```

### Tenant-Aware Repository Base

```typescript
// src/database/tenant-aware.repository.ts
import { Repository, SelectQueryBuilder } from 'typeorm';
import { getTenant } from '../tenant/tenant-context';

export abstract class TenantAwareRepository<T extends { tenantId: string }> {
  protected constructor(protected readonly repo: Repository<T>) {}

  protected scoped(): SelectQueryBuilder<T> {
    return this.repo
      .createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId: getTenant().tenantId });
  }

  findAll(): Promise<T[]> {
    return this.scoped().getMany();
  }

  findByResourceId(resourceId: string): Promise<T | null> {
    return this.scoped()
      .andWhere('e.resourceId = :resourceId', { resourceId })
      .getOne();
  }

  async createOne(data: Omit<T, 'tenantId'>): Promise<T> {
    const entity = this.repo.create({ ...data, tenantId: getTenant().tenantId } as T);
    return this.repo.save(entity);
  }

  // Escape hatch: intentionally verbose so it is obvious in review.
  findAcrossTenantsForAdmin(resourceId: string): Promise<T[]> {
    return this.repo.find({ where: { resourceId } as any });
  }
}
```

### Setting the Tenant on the Database Transaction

Row-Level Security needs the connection to know the tenant. Setting it with `SET LOCAL` inside a transaction keeps it scoped and pool-safe:

```typescript
// src/database/tenant-transaction.ts
import { DataSource, EntityManager } from 'typeorm';
import { getTenant } from '../tenant/tenant-context';

export async function withTenantTransaction<R>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<R>,
): Promise<R> {
  const { tenantId } = getTenant();

  return dataSource.transaction(async (manager) => {
    await manager.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
    return work(manager);
  });
}
```

The matching policy and grants:

```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- The application role must not bypass policies.
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO app_role;
REVOKE ALL ON invoices FROM PUBLIC;
```

`FORCE ROW LEVEL SECURITY` matters: without it, the table owner silently bypasses every policy — and in many setups the migrating role is the owner.

### Per-Tenant Cache Keys and Quota Guard

```typescript
// src/quotas/quota.guard.ts
import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { getTenant } from '../tenant/tenant-context';

const LIMITS: Record<string, number> = { free: 60, pro: 600, enterprise: 6000 };

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(private readonly redis: Redis) {}

  async canActivate(_ctx: ExecutionContext): Promise<boolean> {
    const { tenantId, plan } = getTenant();
    const window = Math.floor(Date.now() / 60_000);
    const key = `t:${tenantId}:quota:${window}`;

    const used = await this.redis.incr(key);
    if (used === 1) await this.redis.expire(key, 90);

    const limit = LIMITS[plan] ?? LIMITS.free;
    if (used > limit) {
      throw new HttpException(
        { error: 'quota_exceeded', limit, plan, retryAfter: 60 },
        429,
      );
    }
    return true;
  }
}
```

### Isolation Test That Fails on Regression

```typescript
// test/tenant-isolation.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('tenant isolation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('returns 404 for another tenant resource, never 403', async () => {
    const tenantBInvoiceId = await seedInvoice({ tenantSlug: 'beta' });

    await request(app.getHttpServer())
      .get(`/invoices/${tenantBInvoiceId}`)
      .set('Authorization', `Bearer ${tokenForTenant('acme')}`)
      .set('X-Tenant-Id', 'acme')
      .expect(404);
  });

  it('cannot insert a row for a foreign tenant via RLS', async () => {
    await expect(
      insertInvoiceFor({ tenantSlug: 'beta', callerTenant: 'acme' }),
    ).rejects.toThrow(/row-level security/);
  });

  afterAll(() => app.close());
});
```

## Key Insights

- Resolution, propagation, and enforcement are separate problems. Skipping enforcement because resolution "feels safe" is how cross-tenant leaks ship.
- `AsyncLocalStorage` beats request-scoped providers for tenant context: no DI cascade, no per-request provider construction, and singletons keep their lifecycle. The trade-off is that context does not cross queue boundaries, so job payloads must carry the tenant ID.
- Use `FORCE ROW LEVEL SECURITY` and a non-owner application role. Without both, the owner role quietly bypasses every policy you wrote.
- Set the tenant with `SET LOCAL` inside a transaction. A session-level setting leaks to the next request on a pooled connection, which is a data leak disguised as a configuration detail.
- Return 404 rather than 403 for foreign resources. A 403 confirms the resource exists and turns your ID space into an enumeration oracle.
- Key every cache, lock, rate-limit counter, and storage path by tenant from day one. Retrofitting prefixes after launch means auditing every read path under production pressure.

## Next Steps

- Extend the model with schema-per-tenant promotion for enterprise customers, keeping the middleware unchanged.
- Add structured audit logging for cross-tenant admin access, and emit a metric whenever a policy denies a query.
- Work through the NestJS security hardening guide for authentication, headers, and secrets management around this pipeline.
- Study the PostgreSQL multi-tenant syllabus for deeper coverage of RLS, partitioning, and per-tenant migration strategies.

## Conclusion

Multi-tenancy in NestJS is not a feature you bolt on — it is a cross-cutting contract between the request pipeline, the provider graph, and the database. Resolve the tenant from a trusted signal and verify membership; propagate it through `AsyncLocalStorage` so services stay singleton-scoped; enforce it with a tenant-aware repository plus Row-Level Security so a forgotten filter fails closed; then namespace every cache, quota, and storage path by tenant. Prove all of it with isolation tests that run one tenant against another tenant's resource IDs, because the only isolation that counts is the isolation a test can demonstrate.

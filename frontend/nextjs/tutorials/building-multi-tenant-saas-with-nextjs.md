---
title: "Building a Multi-Tenant SaaS Application with Next.js"
description: "Build a production-ready multi-tenant SaaS on Next.js with subdomain routing, tenant-scoped data access, per-tenant theming, real-time isolation controls, and quota enforcement."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Multi-Tenant SaaS Application with Next.js

## Summary

This tutorial builds a working multi-tenant SaaS application on top of the Next.js App Router. You will resolve tenants before rendering, learn how each tenancy model behaves under real load, scope every database query so rows can never leak across customers, drive per-tenant theming from configuration, and enforce plan quotas at the edge of the request lifecycle. The finished project is a deployable team-workspace product where each customer gets an isolated subdomain, isolated data, and isolated branding while sharing a single deployment and a single database.

The tutorial is hands-on. Every concept is introduced with the failure it prevents, followed by the code that prevents it. By the end you will have a tenant resolution middleware, a tenant-scoped data access layer, row level security policies guarding the shared tables, a tenant-aware cache, a theming pipeline, and a quota guard.

## Target Audience

- Fullstack and frontend engineers who already ship Next.js applications and now need to serve multiple customers from one deployment.
- Backend engineers migrating a single-tenant product to a multi-tenant architecture.
- Technical founders and platform engineers responsible for isolation, cost control, and compliance boundaries in a SaaS product.
- Expected developer level: advanced. You should be comfortable with the App Router, server components, route handlers, and the basics of a relational database and its query builder.

## Prerequisites

- Solid working knowledge of Next.js App Router: layouts, server components, server actions, middleware, and route handlers.
- TypeScript experience, including generics and module augmentation.
- Node.js 20 or later and a Postgres database reachable from your machine (a managed instance or a local container both work).
- Familiarity with an ORM: this tutorial uses Prisma, but the patterns transfer directly to Drizzle or Kysely.
- A way to test subdomains locally. The tutorial shows a `*.localtest.me` based setup so no host file edits are required.
- Optional but useful: an understanding of JWT-based sessions and of what a database connection pool costs under concurrency.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Compare the silo, bridge, and pool tenancy models and choose one from isolation, cost, and operational constraints rather than from habit.
- Resolve a tenant from a hostname, a path prefix, or a session claim inside Next.js middleware, and map a clean public URL onto an internal route tree.
- Build a request-scoped tenant context that server components, server actions, and route handlers all read from the same source of truth.
- Enforce tenant isolation at the database layer with row level security so that a forgotten `WHERE` clause cannot expose another customer's rows.
- Design cache keys and revalidation tags that are tenant-aware, and explain how a naive cache leaks data between tenants.
- Drive per-tenant configuration, feature flags, and theming from stored tenant records without branching the deployment.
- Meter usage and enforce plan quotas and rate limits per tenant.
- Instrument requests with a tenant identity so logs, traces, and error reports stay separable across customers.

## Context and Motivation

A single-tenant application bakes one customer's identity into its schema, its configuration, and its deployment. The moment a second customer signs up, that assumption becomes expensive. Teams usually react in one of two ways, and both are traps.

The first reaction is to deploy the application again for every customer. Isolation is excellent and you never modify the code — but every deploy is another database, another connection pool, another migration pipeline, another set of secrets, and another bill. Support becomes a list of endpoints instead of one dashboard. The second reaction is to add a `tenantId` column to a few tables, add `WHERE tenantId = ?` in the controllers the team happened to remember, and hope. This works until the first query that forgets the filter, and then a customer reads another customer's data. That is not a bug you patch quietly; it is an incident.

Multi-tenancy is the discipline of getting the isolation of the first approach without the operational cost of the first approach, and without relying on developer discipline the way the second approach does. The interesting engineering is not "how do I add a tenant column". It is:

- How does the system know which tenant a request belongs to, before any data is touched?
- What is the boundary that makes isolation a structural property rather than a code-review property?
- How do caches, background jobs, and file storage respect that boundary?
- How do you meter usage so one tenant's traffic spike does not degrade another's, or silently cost you money?

Next.js is a good place to answer these questions because the framework gives you a single place to resolve the tenant (middleware), a single place to hold request state (server components and request-scoped utilities), and a deployment model where adding a customer means inserting a row, not provisioning a server.

## Core Content

### Tenancy Models at a Glance

Before writing code, name the model you are building. The three standard models differ in where the isolation boundary sits.

```text
| Model   | Boundary                | Isolation | Cost per tenant | Migration cost |
|---------|-------------------------|-----------|-----------------|----------------|
| Silo    | One database per tenant | Strongest | Highest         | N migrations   |
| Bridge  | One schema per tenant   | Strong    | Medium          | N schemas      |
| Pool    | Shared tables, tenant_id column plus row level security | Good, if enforced | Lowest | One migration |

| Model   | Best fit                                                       |
|---------|----------------------------------------------------------------|
| Silo    | Regulated customers, contractual data residency, noisy-neighbour guarantees |
| Bridge  | Mid-market SaaS with moderate tenant counts and predictable schemas |
| Pool    | Self-serve products where tenants are created by the minute     |
```

The pool model is the default choice for a modern Next.js SaaS, and it is what this tutorial builds. It is also the model that punishes sloppiness, which is exactly why it is worth doing carefully: a single shared table means a single missing filter can cross a customer boundary.

### Choosing an Isolation Model for Your Constraints

Isolation is not a free axis; it trades against cost and operability. Two questions decide it.

1. Does any customer contractually require physical separation of data, or a data residency guarantee that a shared table cannot satisfy? If yes, you need silo for those customers.
2. Is the per-tenant write volume high enough that one tenant's workload can starve another through a shared connection pool or a shared table's lock contention? If yes, consider bridge or silo for the heavy tenants.

Everything else lands in the pool model. The practical architecture is hybrid: start pooled, and keep the tenancy model behind an interface so a large customer can be moved to a dedicated database later without rewriting the product. The important design decision is to make the tenant identity a first-class argument to your data layer from day one, because that argument is the seam along which you would later split storage.

### Resolving the Tenant Before Rendering

Tenant resolution happens once per request, in middleware, before any route renders. The job is to turn an incoming request into a decision: which tenant is this, and which internal route should serve it.

```text
Incoming request: https://acme.app.example.com/dashboard
        │
        ▼
  middleware.ts
        │  extract host → "acme.app.example.com"
        │  strip base domain → slug "acme"
        │  resolve slug → tenant record (cached)
        │  rewrite path → /t/acme/dashboard
        ▼
  app/t/[tenant]/dashboard/page.tsx   (server component)
        │  read tenant from headers/context
        ▼
  data layer (always receives tenantId)
```

The rewrite is the elegant part. Your router keeps a single tenant-aware branch under `app/t/[tenant]/`, and public URLs stay clean: `acme.app.example.com/dashboard` internally becomes `/t/acme/dashboard`. Marketing pages live outside that branch and never need a tenant.

Two rules make this reliable. First, resolve by slug, never by hostname string, so custom domains and subdomains share one code path. Second, treat resolution failures explicitly: an unknown slug should 404, not fall back to a default tenant. A fallback tenant is how demo data ends up in a customer's account.

### Tenant Routing with Subdomains and Path Prefixes

Subdomains read better and give you free per-tenant cookie scoping, but they require wildcard DNS and a wildcard TLS certificate. Path prefixes are simpler to operate and work everywhere, including preview deployments, but they pollute every URL and complicate cookie paths. A robust product often supports both, with a custom domain as a third option for larger customers.

```text
Subdomain:      https://acme.app.example.com/dashboard
Path prefix:    https://app.example.com/t/acme/dashboard
Custom domain:  https://app.acme.com/dashboard
```

Store all three identifiers on the tenant record — `slug`, `customDomain`, and a `primaryHost` — and resolve in this order: exact custom domain match, then subdomain of the base domain, then the path prefix. That order means a customer who attaches a custom domain keeps working when their subdomain is reassigned.

### Where Tenant Context Lives in the App Router

Middleware can rewrite a request, but it cannot hand arbitrary state to a server component through a shared module, because server components and route handlers run in a shared runtime. The clean way to pass tenant identity downstream is a request header injected by middleware, read by a request-scoped accessor.

```typescript
// lib/tenant-context.ts
import { headers } from 'next/headers';
import { cache } from 'react';

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  plan: 'free' | 'team' | 'business';
  status: 'active' | 'suspended';
  branding: { primary: string; radius: number; logoSrc: string | null };
};

export type TenantContext = {
  tenant: Tenant;
  userId: string | null;
  role: 'owner' | 'admin' | 'member' | null;
};

// cache() deduplicates the lookup within a single request. Without it, every
// component that needs the tenant would trigger its own resolution.
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
  const h = await headers();
  const payload = h.get('x-tenant-context');
  if (!payload) return null;
  return JSON.parse(payload) as TenantContext;
});
```

Middleware is the only place that knows the raw hostname, and it is also the only place that should decide whether a request is even allowed to proceed into tenant routes. Doing authorization there is a bonus: a suspended tenant is blocked before a single row is read.

### Scoping Data Access Without Leaking Rows

The pool model has one enemy: the query that forgets its tenant filter. Two defenses matter, and you want both.

The first defense is a data access layer that cannot be called without a tenant. Do not scatter `prisma.project.findMany()` through your pages; expose a factory that closes over the tenant id. Then "forgot the filter" becomes a type error rather than a production incident.

The second defense is the database itself. Row level security moves the guarantee out of your application code and into Postgres, where a forgotten filter returns zero rows instead of someone else's rows. Application-level scoping is for correctness of intent; row level security is for containment.

### Database-Level Isolation with Row Level Security

Row level security works by attaching a policy to a table and requiring that every statement match it. Your application sets a per-transaction session variable naming the current tenant, and the policy compares it against each row's `tenant_id`.

The subtle part is transaction scope. `SET LOCAL` applies only inside a transaction, which is exactly what you want: the variable dies with the transaction, so a connection recycled from the pool cannot inherit a previous request's tenant. Setting a plain session variable instead is a classic bug that appears only under concurrency, when two tenants' requests share a pooled connection.

```sql
-- Every request runs inside a transaction that begins with this statement.
SET LOCAL app.current_tenant_id = '11111111-1111-1111-1111-111111111111';
```

A second detail: the application's database role must not be a superuser and must not own the tables, because Postgres exempts table owners and superusers from row level security unless you actively force it. Use a dedicated application role and run migrations with a separate owner role.

### Tenant-Aware Authentication and Authorization

Authentication answers "who is this", authorization answers "what may they do here". In a multi-tenant product the second question is always relative to a tenant, and the same user can hold different roles in different tenants.

Model this as a membership table keyed by the pair of user and tenant, with a role on the membership rather than on the user. That single schema decision eliminates a whole class of bugs, because there is no such thing as "the user's role" to accidentally apply to the wrong workspace.

Middleware resolves membership and puts the role into the tenant context header. Server actions then check the role before mutating anything. Never trust a role that arrived in a request body or a client-side store: re-derive it from the membership table on every request, since access can be revoked between page loads.

### Per-Tenant Configuration and Theming

Per-tenant branding should be data, not code. Store brand tokens on the tenant record, render them as CSS custom properties on the tenant layout, and let one stylesheet consume the variables. No conditional bundles, no per-tenant forks of the design system.

```css
/* One stylesheet, many tenants. */
:root {
  --brand-primary: #2563eb;
  --brand-radius: 12px;
}
```

Feature flags follow the same pattern. A `features` JSON column per tenant plus a small `hasFeature(tenant, key)` helper keeps plan gating in one place, and makes it trivially auditable which tenants have an experimental flag on.

### Caching Without Cross-Tenant Leaks

The Next.js cache is shared across tenants, so a cache key that omits the tenant id is a data leak with a TTL. Every cached read must be keyed by tenant, and every mutation must revalidate only that tenant's tags.

Use a tag convention that encodes tenancy, for example `tenant:${tenantId}:projects`, and revalidate the tenant-scoped tag after a mutation. If you use a global tag such as `projects`, the first customer to save a record invalidates the cache for everyone and you get a thundering herd instead of a leak — a performance bug that will hide a correctness bug.

Route segments also cache aggressively. Pages under `app/t/[tenant]/` should opt out of full route caching unless the data is genuinely tenant-independent, because a statically cached route served to two different tenants is the fastest possible way to serve the wrong data.

### Background Jobs, Webhooks, and Scheduled Work

Work that runs outside a request has no middleware to resolve the tenant, so the tenant id must travel with the job payload. Enqueue the tenant id as a required field, and have the worker establish the same tenant context it would establish for a request. A worker that processes a job without a tenant context will either fail the row level security policy (the good outcome) or, if it uses an owner role, silently operate across all tenants (the bad one).

Inbound webhooks invert the problem: the tenant is unknown until you verify the signature. Verify with the tenant's secret, and only then trust anything else in the payload. Scope the lookup by webhook endpoint id from the URL rather than by a tenant id supplied in the body.

### Quotas, Metering, and Cost Isolation

A shared deployment means tenants share your limits. Meter the resources that cost you money — API calls, storage bytes, background job minutes, AI tokens — and enforce them per plan.

```text
Request → quota guard (tenant plan + current period usage)
              │
              ├── under limit  → proceed, increment counter
              └── over limit   → 429 with plan-upgrade hint
```

Enforce soft limits with rate limiting and hard limits with validation, and make the counter update idempotent so retries do not double-charge a tenant. Equally important: keep the counter per tenant, not global, or one customer's burst will throttle everyone and you will misread your own usage graphs.

### Observability Across Tenant Boundaries

When a customer reports a problem, the first question is "which tenant, which request". Attach the tenant id to every log line, trace span, and error report for the request. A simple structured logger wrapper that reads the tenant context is enough; the cost of adding it later, once you are debugging a cross-tenant incident, is much higher.

Add the tenant slug to error grouping keys so that a single tenant's data shape issue does not get buried under another tenant's volume. And record per-tenant metrics for the four signals that matter in a SaaS: request latency, error rate, quota consumption, and background job lag.

## Code Examples

The files below assemble into a working slice of the application: middleware that resolves and rewrites, a context accessor that downstream code reads, a tenant-scoped data layer, the database policies that back it up, a cached tenant-aware query, and the theming pipeline.

### Middleware: Tenant Resolution and Rewrite

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { lookupTenantByHost, lookupTenantBySlug } from '@/lib/tenants';

const BASE_DOMAIN = process.env.BASE_DOMAIN ?? 'app.example.com';
const PUBLIC_PATHS = ['/', '/pricing', '/login', '/signup', '/api/auth'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = (req.headers.get('host') ?? '').split(':')[0];

  // 1. Custom domain first: an exact match beats any derived slug.
  let tenant = await lookupTenantByHost(host);

  // 2. Subdomain of the base domain, e.g. acme.app.example.com.
  if (!tenant && host.endsWith(`.${BASE_DOMAIN}`)) {
    const slug = host.slice(0, -(BASE_DOMAIN.length + 1));
    tenant = await lookupTenantBySlug(slug);
  }

  // 3. Path prefix fallback, e.g. app.example.com/t/acme/dashboard.
  if (!tenant && pathname.startsWith('/t/')) {
    const slug = pathname.split('/')[2];
    if (slug) tenant = await lookupTenantBySlug(slug);
  }

  if (isPublic(pathname)) return NextResponse.next();

  // No tenant resolved: do NOT fall back to a default tenant.
  if (!tenant) return NextResponse.redirect(new URL('/login', req.url));

  if (tenant.status !== 'active') {
    return NextResponse.rewrite(new URL('/suspended', req.url));
  }

  // Idempotent rewrite: /dashboard -> /t/acme/dashboard
  const url = req.nextUrl.clone();
  if (!url.pathname.startsWith('/t/')) {
    url.pathname = `/t/${tenant.slug}${url.pathname === '/' ? '' : url.pathname}`;
  }

  const res = NextResponse.rewrite(url);
  res.headers.set('x-tenant-id', tenant.id);
  res.headers.set('x-tenant-slug', tenant.slug);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp)$).*)'],
};
```

### Tenant Context and Membership Resolution

```typescript
// lib/tenant-context.ts
import { headers } from 'next/headers';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export type Role = 'owner' | 'admin' | 'member';

export type TenantContext = {
  tenantId: string;
  slug: string;
  plan: 'free' | 'team' | 'business';
  userId: string;
  role: Role;
};

// cache() scopes the result to a single request, so N components resolving
// membership produce exactly one round trip.
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
  const h = await headers();
  const tenantId = h.get('x-tenant-id');
  if (!tenantId) return null;

  const session = await getSession();
  if (!session?.user) return null;

  const membership = await db.membership.findFirst({
    where: { tenantId, userId: session.user.id, status: 'active' },
    select: { role: true, tenant: { select: { slug: true, plan: true, status: true } } },
  });

  if (!membership || membership.tenant.status !== 'active') return null;

  return {
    tenantId,
    slug: membership.tenant.slug,
    plan: membership.tenant.plan,
    userId: session.user.id,
    role: membership.role,
  };
});

export async function requireTenant(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) throw new Error('No tenant context for this request');
  return ctx;
}

export function assertRole(ctx: TenantContext, allowed: Role[]) {
  if (!allowed.includes(ctx.role)) throw new Error('Insufficient role for this action');
}
```

### Tenant-Scoped Data Access Layer

```typescript
// lib/db-scoped.ts
import { db } from '@/lib/db';
import type { TenantContext } from '@/lib/tenant-context';

/**
 * A tenant-scoped data layer. Every method closes over the tenant id, so a
 * caller physically cannot write an unscoped query against these models.
 */
export function scopedDb(ctx: TenantContext) {
  const tenantId = ctx.tenantId;

  return {
    listProjects: () =>
      db.project.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),

    createProject: (input: { name: string }) =>
      db.$transaction(async (tx) => {
        // Mirrors what row level security does at the database layer, so the
        // same code works against a database without policies (e.g. SQLite in tests).
        await tx.$executeRaw`select set_config('app.current_tenant_id', ${tenantId}, true)`;
        return tx.project.create({ data: { ...input, tenantId, createdBy: ctx.userId } });
      }),

    archiveProject: (projectId: string) =>
      db.project.updateMany({
        // updateMany with the tenant in the filter: a wrong id updates 0 rows
        // instead of another tenant's project.
        where: { id: projectId, tenantId },
        data: { archivedAt: new Date() },
      }),
  };
}
```

### Row Level Security Policies

```sql
-- Run as the database owner, once, in a migration.
alter table projects        enable row level security;
alter table memberships     enable row level security;
alter table audit_logs      enable row level security;

-- Force policies even for the table owner: keeps local development honest.
alter table projects force row level security;

-- The application role must not bypass policies.
-- create role app_user login password '...' noinherit;

grant select, insert, update, delete on projects to app_user;

create policy tenant_isolation_projects on projects
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

create policy tenant_isolation_memberships on memberships
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Verify from a psql session connected as app_user:
--   begin;
--   select set_config('app.current_tenant_id', '<tenant-a-uuid>', true);
--   select count(*) from projects;  -- must never count tenant B's rows
--   rollback;
```

### Building Tenant-Scoped Database Sessions

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * Run a callback with row level security pointed at one tenant.
 * set_config(..., true) is transaction-local, so the value cannot leak to
 * the next request that reuses this pooled connection.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
```

### Tenant-Aware Cached Query

```typescript
// lib/queries/projects.ts
import { unstable_cache, revalidateTag } from 'next/cache';
import { withTenant } from '@/lib/db';
import type { TenantContext } from '@/lib/tenant-context';

export function listProjectsCached(ctx: TenantContext) {
  // Cache key and tag both include the tenant: omission here is a data leak
  // with a TTL, not merely a stale-data bug.
  return unstable_cache(
    async () => withTenant(ctx.tenantId, (tx) => tx.project.findMany({ where: { tenantId: ctx.tenantId } })),
    ['projects', ctx.tenantId],
    { tags: [`tenant:${ctx.tenantId}:projects`], revalidate: 60 }
  )();
}

export async function invalidateProjects(ctx: TenantContext) {
  // Tenant-scoped tag only: a global tag would let one tenant's write
  // invalidate every other tenant's cache.
  revalidateTag(`tenant:${ctx.tenantId}:projects`);
}
```

### Per-Tenant Theming and Feature Flags

```typescript
// app/t/[tenant]/layout.tsx
import { requireTenant } from '@/lib/tenant-context';
import { getTenantBranding } from '@/lib/tenants';
import type { ReactNode } from 'react';

export default async function TenantLayout({ children }: { children: ReactNode }) {
  const ctx = await requireTenant();
  const branding = await getTenantBranding(ctx.tenantId);

  const style = {
    '--brand-primary': branding.primary,
    '--brand-radius': `${branding.radius}px`,
  } as React.CSSProperties;

  return (
    <div style={style} className="min-h-screen bg-[var(--brand-surface)]">
      {children}
    </div>
  );
}
```

```typescript
// lib/features.ts
import type { TenantContext } from '@/lib/tenant-context';

const PLAN_FEATURES = {
  free: ['projects:5', 'members:3'],
  team: ['projects:50', 'members:25', 'audit-log'],
  business: ['projects:500', 'members:500', 'audit-log', 'sso', 'custom-domain'],
} as const;

export function hasFeature(ctx: TenantContext, feature: string) {
  return (PLAN_FEATURES[ctx.plan] as readonly string[]).includes(feature);
}

export function memberLimit(ctx: TenantContext) {
  const limit = PLAN_FEATURES[ctx.plan].find((f) => f.startsWith('members:'));
  return Number(limit?.split(':')[1] ?? 1);
}
```

### Server Action with Role and Quota Guards

```typescript
// app/t/[tenant]/projects/actions.ts
'use server';

import { revalidateTag } from 'next/cache';
import { requireTenant, assertRole } from '@/lib/tenant-context';
import { scopedDb } from '@/lib/db-scoped';
import { assertWithinQuota } from '@/lib/quota';

export async function createProject(formData: FormData) {
  const ctx = await requireTenant();
  assertRole(ctx, ['owner', 'admin']);

  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 3) return { error: 'Project name must be at least 3 characters' };

  const quota = await assertWithinQuota(ctx, 'projects');
  if (!quota.ok) return { error: `Project limit reached on the ${ctx.plan} plan` };

  await scopedDb(ctx).createProject({ name });
  revalidateTag(`tenant:${ctx.tenantId}:projects`);
  return { ok: true };
}
```

## Key Insights

- Resolve the tenant once, in middleware, and treat the resolution result as the request's only source of tenant truth. Header injection plus a request-scoped accessor keeps server components, server actions, and route handlers reading the same value.
- Never fall back to a default tenant on a failed lookup. A fallback turns a routing bug into a data disclosure: 404 the unknown slug and let the login flow handle the rest.
- Isolation should be structural, not disciplinary. A data layer that cannot be called without a tenant, backed by row level security policies, means a forgotten filter fails closed instead of leaking.
- `SET LOCAL` inside a transaction is the only safe way to communicate tenant identity to Postgres through a connection pool. A session-scoped variable can survive into the next tenant's request under concurrency.
- Cache keys and revalidation tags are part of your security boundary. A tenant-free cache key is a cross-tenant leak with a TTL, and a global revalidation tag is a throttling bug waiting to happen.
- Roles belong on memberships, not on users. The same human can be an owner in one workspace and a member in another, and modelling that pairs the two identity dimensions at the schema level.
- Tenant branding, flags, and quotas should all be data on the tenant record. Every branch in application code is a place where a future customer's configuration is missing a case.
- Metering per tenant is what keeps a shared deployment economically sane: quotas protect your margin, and per-tenant counters keep one customer's traffic spike from throttling everyone else.

## Next Steps

- Implement the hybrid storage path: keep the pooled schema as the default and add a `tenant.storageMode` column so enterprise customers can be moved to a dedicated database without a product fork.
- Add connection-level enforcement for the application role, and add an integration test that runs a query as tenant A while authenticated as tenant B and asserts zero rows.
- Extend row level security to the storage layer. Object keys should be prefixed by tenant id, and signed URLs should be generated only after checking a membership.
- Add tenant-aware rate limiting at the edge so abuse from one workspace cannot consume the shared capacity budget.
- Build the admin surface for tenant lifecycle: trial expiry, suspension, plan change, and export of a single tenant's data. These are the operations you will need on day one of a real customer base.
- Add an audit log written from the same tenant-scoped transaction that performs the mutation, so the log and the change cannot disagree.

## Conclusion

Multi-tenancy in Next.js is mostly a question of where you place the isolation boundary. Middleware resolves the tenant and rewrites the URL onto a single tenant-aware route tree; a request-scoped accessor makes that decision available everywhere without repeated lookups; a scoped data layer makes unscoped queries impossible to express; and row level security guarantees containment even when application code is wrong.

The remaining pieces follow the same principle. Caches, jobs, quotas, and logs all need the tenant id explicitly, because each one is a place where context is easily lost and where losing it produces the leak you were trying to prevent. Build those boundaries deliberately, keep tenancy behind an interface so storage can be split later, and the same deployment can serve ten customers or ten thousand without a rewrite.

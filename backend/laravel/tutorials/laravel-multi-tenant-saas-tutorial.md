---
title: "Building a Multi-Tenant SaaS with Laravel"
description: "Build a subdomain-based multi-tenant SaaS in Laravel: choosing between shared and per-tenant databases, resolving tenants in middleware, enforcing scope with a global scope, running tenant migrations, and wiring subscription billing into the tenant lifecycle."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Multi-Tenant SaaS with Laravel

## Summary

This tutorial builds a working multi-tenant foundation in Laravel: customers reach the app at `acme.yourapp.com`, every query is automatically scoped to that customer's data, and each tenant carries its own subscription state. You will implement tenant resolution middleware, a `BelongsToTenant` trait with a fail-closed global scope, isolated migrations, and Cashier-backed billing hooks that suspend a tenant when payment fails.

## Target Audience

- Backend developers who have shipped at least one Laravel application to production.
- Teams converting a single-customer app into a SaaS product without rewriting the data layer.

## Prerequisites

- PHP 8.2+ and Laravel 11 or newer (`composer create-project laravel/laravel`).
- PostgreSQL recommended (MySQL works for the shared-schema approach) plus wildcard DNS for local development (`*.saas.test`), or Laravel Herd/Valet which handles DNS for you.
- Familiarity with Eloquent global scopes, middleware, and queued listeners.

## Learning Objectives

By the end of this tutorial, you will be able to:
- Compare shared-schema and database-per-tenant isolation and choose one for a given product.
- Resolve a tenant from the subdomain and bind it to the container for the request lifetime.
- Scope every tenant-owned model automatically, with an explicit escape hatch for admin work.
- Provision a tenant atomically, isolate its migrations, and drive suspension from billing events.

## Context and Motivation

A single-tenant Laravel app assumes one customer owns every row in every table. The moment a second customer signs up, that assumption becomes a data leak: one missing `where('user_id', ...)` in one controller exposes another company's invoices — and retrofitting tenancy later is expensive because the leak surface grows with every new query, report, and background job. Tenancy is therefore an architectural decision, not a feature: it determines schema, migration strategy, backup granularity, and billing model. This tutorial implements the shared-schema approach (one database, `tenant_id` on every owned table, a global scope enforcing isolation) because it is cheapest to operate and scales to thousands of small tenants. The provisioning section covers when to split into databases instead.

## Core Content

### Choosing an Isolation Model

**Shared schema** keeps all tenants in one database and discriminates rows by `tenant_id`. Migrations run once, cross-tenant analytics are trivial, and onboarding is a single insert. The weakness is blast radius: a query that bypasses the scope leaks data, and one large tenant's load affects everyone. **Database per tenant** gives each customer its own schema — physical isolation, simple per-tenant restore, no noisy neighbours — but migrations must run N times, connection pools multiply, and cross-tenant reporting needs a warehouse. Start shared unless compliance (healthcare, finance) or a handful of enterprise customers demand physical separation; the code below keeps resolution swappable, so only the connection resolver changes if you split later.

### Resolving the Tenant per Request

The subdomain is the tenant identifier. Register a route group on a wildcard domain — `Route::domain('{tenant}.saas.test')->middleware('tenant')->group(base_path('routes/tenant.php'))` — resolve the slug in middleware, and bind the resolved model into the container so the rest of the request, including synchronously dispatched jobs, can read it.

Binding with `app()->instance(Tenant::class, $tenant)` is what lets the global scope stay simple: models ask the container for the current tenant instead of threading it through every method signature. Also call `URL::defaults(['tenant' => $tenant->slug])` so `route()` keeps generating tenant URLs in views and redirects. Reject unknown and suspended tenants before any query touches tenant data: return `404` for unknown subdomains (never reveal which tenants exist) and `402` for suspended ones so the frontend can render a billing page.

### Enforcing Scope in the Model Layer

A trait on every tenant-owned model does two things: adds a global scope filtering by the current tenant, and fills `tenant_id` on create. The scope must be **fail-closed** — when no tenant is bound it returns zero rows, not all rows. That single decision prevents the classic multi-tenant leak, and cross-tenant work (webhook handlers, admin tooling, scheduled reports) gets an explicit escape hatch instead: provide `withoutTenancy()` rather than letting developers call `withoutGlobalScope()` ad hoc, so every bypass is greppable in code review and treatable as security-sensitive. Do not rely on the scope for writes alone — add a composite index led by `tenant_id` and a foreign key with `restrictOnDelete` so orphaned rows cannot exist.

### Provisioning and Migrations

With a shared schema, migrations run once. With database-per-tenant, keep tenant migrations in a separate path (`database/migrations/tenant`) so platform tables never leak into customer databases; a small artisan command loops tenants and runs `migrate --path=database/migrations/tenant --database=tenant --force` against a runtime connection built from the tenant record. Provisioning must be atomic and idempotent: create the tenant row, create the database, migrate, seed defaults, then flip the tenant to active. Stripe retries webhooks, and a half-provisioned tenant is worse than a failed one.

### Wiring Billing to the Lifecycle

Billing belongs in listeners, not controllers. Map `invoice.payment_failed` to a grace period (`past_due`), `customer.subscription.deleted` to `suspended`, and `customer.subscription.updated` to reactivation. Store the Stripe customer id on the **tenant**, not the user, so billing survives team changes, and never delete tenant data on cancellation — archive it.

## Code Examples

### Tenant Resolution Middleware

```php
// app/Http/Middleware/ResolveTenant.php
namespace App\Http\Middleware;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class ResolveTenant
{
    public function handle(Request $request, \Closure $next)
    {
        $tenant = Tenant::query()->where('slug', $request->route('tenant'))->first();

        abort_if($tenant === null, 404); // never reveal registered subdomains
        abort_unless($tenant->isActive(), 402, 'Subscription inactive.'); // render billing page

        app()->instance(Tenant::class, $tenant);
        URL::defaults(['tenant' => $tenant->slug]);

        return $next($request);
    }
}
```

### Automatic Scoping Trait

```php
// app/Models/Concerns/BelongsToTenant.php
namespace App\Models\Concerns;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $id = app()->bound(Tenant::class) ? app(Tenant::class)->id : 0; // 0 = fail closed
            $builder->where($builder->getModel()->getTable() . '.tenant_id', $id);
        });

        static::creating(function (Model $model) {
            $model->tenant_id ??= app()->bound(Tenant::class) ? app(Tenant::class)->id : null;
        });
    }

    /** Run a query across tenants explicitly. */
    public static function withoutTenancy(\Closure $callback): mixed
    {
        return $callback(static::withoutGlobalScope('tenant'));
    }
}
```

### Billing Listener

```php
// app/Listeners/SyncTenantSubscription.php
namespace App\Listeners;

use App\Models\Tenant;
use Laravel\Cashier\Events\WebhookReceived;

class SyncTenantSubscription
{
    public function handle(WebhookReceived $event): void
    {
        $payload = $event->payload;
        $tenant = Tenant::query()->where('stripe_id', $payload['data']['object']['customer'] ?? null)->first();

        if ($tenant === null) {
            return;
        }

        $tenant->update(['status' => match ($payload['type']) {
            'invoice.payment_failed' => 'past_due',
            'customer.subscription.deleted' => 'suspended',
            'customer.subscription.updated' => $payload['data']['object']['status'] === 'active' ? 'active' : 'past_due',
            default => $tenant->status,
        }]);
    }
}
```

## Key Insights

- **Bind the tenant, do not pass it around.** Container binding keeps the scope and the `creating` hook trivial and works inside jobs as long as you re-bind at job start.
- **Fail closed.** An unbound query returning every row is the classic multi-tenant leak; return zero rows instead.
- **Every bypass is a security decision.** Route admin and webhook code through `withoutTenancy()` and review those call sites like raw SQL.
- **Index `tenant_id` first.** Composite indexes must lead with `tenant_id`, otherwise every tenant query scans the whole table.
- **Provisioning is a distributed transaction.** Database creation, migration, and seeding fail independently; record progress on the tenant row and retry safely.

## Next Steps

- Add per-tenant rate limiting with a named limiter keyed by tenant id, and tenant-aware audit logging so support can trace who changed what.
- Adopt `stancl/tenancy` if you outgrow the hand-rolled resolver and need automated database-per-tenant.

## Conclusion

You now have a multi-tenant skeleton where the subdomain resolves a tenant, every owned model is scoped automatically, provisioning is isolated, and subscription webhooks drive tenant state. The design choices that matter are the ones keeping isolation honest: fail-closed scoping, explicit bypasses, and billing state stored on the tenant. What remains is product work — onboarding, roles, reporting — rather than tenancy plumbing.

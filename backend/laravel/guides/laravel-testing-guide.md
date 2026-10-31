---
title: "Laravel Testing Guide"
description: "A practical guide to structuring a Laravel suite that stays fast and trustworthy — feature versus unit tests, factories, database isolation, HTTP assertions, boundary fakes, parallel runs, and CI coverage gates."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Laravel Testing Guide

## Introduction

Laravel ships with PHPUnit (or Pest), a `TestCase` base class, factories, and a `phpunit.xml` that points the suite at in-memory SQLite. That default is enough to write tests, but not enough to keep them useful at scale. Suites rot predictably: every test boots the framework and hits the database, so the run takes minutes and nobody executes it locally; assertions reach into private methods, so a refactor breaks dozens of tests that no longer describe behavior; external HTTP calls stay live, so a flaky vendor turns `main` red for reasons unrelated to the change.

This guide describes a structure that avoids those failures. The core idea is a strict split of responsibility: **feature tests** drive the application through HTTP and assert on the response, the database, and the queue; **unit tests** cover pure domain logic — pricing rules, value objects, parsers — with no framework boot and no I/O. Everything else (factories, database isolation, fakes, parallelism) exists to keep those two layers fast and deterministic.

## Best Practices

- **Test through the HTTP surface.** A feature test that calls `$this->post('/orders', $payload)` exercises routing, middleware, form requests, authorization, the controller, the model layer, and JSON serialization in one pass. That is the behavior you actually ship, so it is the behavior worth asserting. Keep the assertion set tight: status code, response shape, and the database side effect. Reaching into a controller's private methods duplicates the implementation inside the test and lets the real route break silently.
- **Reserve unit tests for logic without dependencies.** Unit tests earn their speed by never booting Laravel — extend `PHPUnit\Framework\TestCase` directly for anything pure: money arithmetic, slug generation, tax rules, state machines. If a class needs the container, a database, or the clock, it is not a unit; test it through a feature test instead of mocking four collaborators to isolate it.
- **Build state with factories and named states.** Never hand-construct models with `new Order([...])` and `save()`. Factories centralize required attributes, keep tests readable, and survive schema changes. Model meaningful variants as named states (`Order::factory()->paid()->create()`), so a test reads as intent rather than setup noise.
- **Isolate the database automatically.** Use `RefreshDatabase` on every test that touches the database: it migrates once per suite and wraps each test in a transaction, so tests cannot see each other's rows and ordering never matters. Do not rely on `DatabaseTransactions` alone if a test runs DDL or commits — state leaks. Assert on queued work with `Queue::fake()` rather than letting jobs execute inside the request.
- **Freeze time instead of sleeping.** Time-dependent logic (trial expiry, proration, "due in 7 days") must be tested with `$this->travelTo()` or `$this->freezeTime()`, never `sleep()`. A frozen clock makes assertions exact and removes flakiness that only appears on slow CI machines.
- **Fake the boundary, not your own code.** Swap external systems with Laravel fakes — `Http::fake()`, `Queue::fake()`, `Mail::fake()`, `Storage::fake()`, `Notification::fake()` — and assert on what left the application (`Http::assertSent`), not on how a service called its collaborator. Mocking your own classes couples tests to internal structure and produces suites that stay green while the feature is broken.
- **Parallelize and enforce a coverage floor.** `php artisan test --parallel` runs each test class in its own process with its own database, cutting wall-clock time roughly with core count. Pair it with `--min=80` in CI so new code cannot ship untested, and measure coverage across the whole application rather than only the files a pull request touched.

## Implementation Steps

### Step 1: Configure the Test Environment

Point the suite at a throwaway database and parallel-safe settings. SQLite `:memory:` works for most suites; if your queries use Postgres-specific features (JSONB operators, `ILIKE`, window functions), test against Postgres so the suite runs the same SQL you ship.

```xml
<!-- phpunit.xml -->
<php>
    <env name="APP_ENV" value="testing"/>
    <env name="DB_CONNECTION" value="pgsql"/>
    <env name="DB_DATABASE" value="app_testing"/>
    <env name="CACHE_STORE" value="array"/>
    <env name="QUEUE_CONNECTION" value="sync"/>
    <env name="MAIL_MAILER" value="array"/>
</php>
```

### Step 2: Write the First Feature Test

Cover the happy path, one authorization rule, and one validation failure — three tests per endpoint is usually enough to describe the contract.

```php
// tests/Feature/OrderTest.php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_create_an_order(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/orders', ['product_id' => 42, 'quantity' => 2])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('orders', ['user_id' => $user->id, 'quantity' => 2]);
    }

    public function test_guest_cannot_create_an_order(): void
    {
        $this->postJson('/api/orders', ['product_id' => 42, 'quantity' => 1])
            ->assertUnauthorized();
    }
}
```

### Step 3: Add a Unit Test for Pure Logic

Move pricing rules into a class with no framework dependency, then test it without booting the application. Note that the class extends PHPUnit's `TestCase`, not Laravel's — that is what keeps it in the millisecond range.

```php
// tests/Unit/MoneyTest.php
namespace Tests\Unit;

use App\Support\Money;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_it_splits_an_amount_without_losing_cents(): void
    {
        $parts = Money::fromCents(1000)->split(3);

        $this->assertSame([334, 333, 333], array_map(fn ($p) => $p->cents, $parts));
        $this->assertSame(1000, array_sum(array_map(fn ($p) => $p->cents, $parts)));
    }

    public function test_it_rejects_negative_amounts(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        Money::fromCents(-1);
    }
}
```

### Step 4: Fake the External Boundary

Every outbound call gets a fake with an explicit response, plus an assertion that the request was sent with the right payload. Test the failure branch too — `Http::response([], 500)` — because error handling is where integrations actually break.

```php
public function test_payment_is_charged_through_the_gateway(): void
{
    Http::fake([
        'gateway.example.com/charges' => Http::response(['id' => 'ch_123', 'status' => 'paid'], 201),
    ]);

    $order = Order::factory()->create();

    $this->postJson("/api/orders/{$order->id}/pay")->assertOk();

    Http::assertSent(fn ($request) => $request->url() === 'https://gateway.example.com/charges'
        && $request['amount'] === $order->total_cents);

    $this->assertSame('paid', $order->fresh()->status);
}
```

### Step 5: Enforce the Suite in CI

Run the same command CI runs, before you push. Keep the pipeline's database engine identical to production, cache `vendor/` and the Composer cache, and treat a coverage drop as a failed build rather than a warning.

```yaml
# .github/workflows/tests.yml
- name: Run tests
  run: php artisan test --parallel --coverage --min=80
  env:
    DB_CONNECTION: pgsql
    DB_DATABASE: app_testing
```

Add `--parallel` to the `composer.json` test script once the suite is green serially, and run `php artisan config:clear` first so cached configuration cannot point tests at the production database.

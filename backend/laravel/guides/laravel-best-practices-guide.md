---
title: "Laravel Best Practices Guide"
description: "A comprehensive guide to production-grade Laravel application patterns covering directory conventions, service pattern, SOLID principles, caching, queues, events, testing, deployment, and security hardening."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Laravel Best Practices Guide

## Introduction

Laravel is the most popular PHP framework, powering everything from small personal blogs to enterprise SaaS platforms serving millions of users. Its expressive syntax, rich ecosystem of first-party packages (Sanctum, Horizon, Telescope, Forge), and elegant ORM (Eloquent) make it exceptionally productive. However, with great flexibility comes architectural responsibility — without deliberate patterns, Laravel applications can devolve into "God controllers," untestable query spaghetti, and deployment nightmares.

This guide presents a battle-tested set of architectural and operational best practices for building Laravel applications that are maintainable, secure, performant, and production-ready. These patterns draw from real-world Laravel deployments, the collective experience of the Laravel community, and the official Laravel documentation. The focus is on *why* each practice matters and *how* these patterns compose into a coherent system.

## Best Practices

### Directory Structure Conventions

A well-organized directory structure is the foundation of maintainability in Laravel. Beyond the default scaffolding, adopting a domain-oriented structure within `app/` prevents models and services from becoming dumping grounds.

**Why it matters**: Flat directory structures scale poorly. As an application grows beyond 20+ models and controllers, unrelated files become interleaved, merge conflicts increase, and new team members struggle to locate relevant code.

```text
app/
  Models/                  # All Eloquent models
    User.php
    Post.php
    Comment.php
  Http/
    Controllers/
      Api/                 # API-specific controllers
      Web/                 # Web-specific controllers
    Requests/              # Form Request validation classes
    Resources/             # API resource transformers
  Services/                # Business logic (domain services)
    PaymentService.php
    NotificationService.php
  Repositories/            # Data access abstraction (optional)
    PostRepository.php
  Actions/                 # Single-action classes for complex operations
    PublishPostAction.php
  Enums/                   # PHP 8.1+ backed enums
    PostStatus.php
  Events/
  Listeners/
  Jobs/
  Mail/
  Notifications/
  Rules/                   # Custom validation rule objects
database/
  factories/
  migrations/
  seeders/
resources/
  views/
    components/
    layouts/
    posts/
routes/
  web.php
  api.php
  console.php
```

**Key rules**:
- Group by **domain concept** (posts, users, payments) within `app/`, not by technical layer.
- Keep controller methods thin — delegate business logic to Services or Actions.
- Use `app/Actions/` for operations that involve more than one model or service (e.g., "publish post" that updates status, sends notification, and clears cache).
- Enums should be backed enums (`string` or `int`) and used for status fields instead of plain strings.

### Service Pattern and Business Logic

The Service Pattern extracts business logic from controllers and models into dedicated service classes, enabling reusability and testability.

**Why it matters**: Controllers should only handle HTTP concerns (request parsing, response formatting). Business rules embedded in controllers or models create tight coupling, making them impossible to reuse across CLI commands, queue jobs, and API controllers without duplication.

```php
<?php

namespace App\Services;

use App\Models\Order;
use App\Notifications\OrderConfirmation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderService
{
    public function __construct(
        private readonly InventoryService $inventoryService,
        private readonly PaymentService $paymentService,
    ) {}

    public function placeOrder(array $data): Order
    {
        return DB::transaction(function () use ($data) {
            // 1. Validate inventory
            $this->inventoryService->reserveItems($data['items']);

            // 2. Process payment
            $payment = $this->paymentService->charge(
                $data['payment_method'],
                $data['total']
            );

            // 3. Create order
            $order = Order::create([
                'user_id' => $data['user_id'],
                'total' => $data['total'],
                'status' => 'confirmed',
                'payment_id' => $payment->id,
            ]);

            // 4. Create order items
            foreach ($data['items'] as $item) {
                $order->items()->create($item);
            }

            // 5. Dispatch notification (queued)
            $order->user->notify(new OrderConfirmation($order));

            Log::info('Order placed successfully', ['order_id' => $order->id]);

            return $order;
        });
    }
}
```

**Service pattern guidelines**:
- Services are **stateless singletons** — inject dependencies via constructor, never store request state.
- Each public method represents a single business transaction, often wrapped in a database transaction.
- Keep services focused: if a service exceeds ~15 methods, split it by domain concept.
- Inject repositories or other services, never inject the Request object.

### Repository Pattern (When Appropriate)

The Repository Pattern provides an abstraction layer between business logic and data access. In Laravel with Eloquent, repositories are optional — Eloquent itself is already a Data Mapper implementation. Use repositories only when:

- You need to swap between different data sources (e.g., Eloquent ↔ REST API).
- You want to centralize complex query logic.
- You are implementing Hexagonal Architecture (Ports & Adapters).

```php
<?php

namespace App\Repositories;

use App\Models\Post;
use Illuminate\Pagination\LengthAwarePaginator;

class PostRepository
{
    public function findPublishedPaginated(int $perPage = 15): LengthAwarePaginator
    {
        return Post::with(['user', 'tags'])
            ->where('published_at', '<=', now())
            ->orderBy('published_at', 'desc')
            ->paginate($perPage);
    }

    public function findBySlug(string $slug): ?Post
    {
        return Post::with(['user', 'comments.user'])
            ->where('slug', $slug)
            ->firstOrFail();
    }

    public function incrementViews(Post $post): void
    {
        $post->increment('views_count');
    }
}
```

**When NOT to use repositories**: For standard CRUD operations that Eloquent handles natively, adding a repository layer is unnecessary indirection. Laravel's active record pattern via Eloquent already provides `find()`, `create()`, `update()`, `delete()`, and query scopes — wrapping these in a repository adds boilerplate without meaningful abstraction.

### SOLID Principles in Laravel

**Single Responsibility Principle (SRP)**: Each class should have exactly one reason to change. A controller should not contain validation rules (use Form Requests), business logic (use Services), or data access logic (use Models/Repositories).

**Open/Closed Principle (OCP)**: Open for extension, closed for modification. Use Laravel's `macro()` on core classes, service container bindings with interfaces, and pipeline patterns to extend behavior without modifying existing code.

```php
// Example: Extending Stringable via macro
use Illuminate\Support\Stringable;
use Illuminate\Support\Str;

Str::macro('phone', function (string $value) {
    return preg_replace('/^(\d{3})(\d{3})(\d{4})$/', '($1) $2-$3', $value);
});

// Usage: (string) Str::phone('1234567890') => "(123) 456-7890"
```

**Liskov Substitution Principle (LSP)**: Subtypes must be substitutable for their base types. When using interface bindings in the service container, ensure all implementations fulfill the contract correctly.

**Interface Segregation Principle (ISP)**: Prefer many small, focused interfaces over one large interface. For example, split a `UserServiceInterface` into `UserAuthenticationInterface`, `UserProfileInterface`, and `UserAdminInterface` if different consumers need different subsets of functionality.

**Dependency Inversion Principle (DIP)**: Depend on abstractions, not concretions. Use Laravel's service container to bind interfaces to implementations:

```php
// In AppServiceProvider
$this->app->bind(PaymentGatewayInterface::class, StripePaymentGateway::class);

// In constructor injection
public function __construct(
    private readonly PaymentGatewayInterface $paymentGateway
) {}
```

### Caching Strategies (Redis / File)

Laravel provides a unified cache API with drivers for file, database, Redis, and Memcached. For production applications, Redis is the recommended driver.

**Why it matters**: Database queries are the most common performance bottleneck. A single page may execute dozens of queries; caching reduces this to a single Redis read. Proper cache invalidation prevents stale data without requiring manual cache clearing.

```php
<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Facades\Cache;

class PostCacheService
{
    public function getPublishedPosts(int $perPage = 15): array
    {
        $cacheKey = "posts:published:page:{$perPage}";

        return Cache::remember($cacheKey, 3600, function () use ($perPage) {
            return Post::with(['user', 'tags'])
                ->published()
                ->orderBy('published_at', 'desc')
                ->paginate($perPage)
                ->toArray();
        });
    }

    public function clearPublishedCache(): void
    {
        // Use cache tags if using Redis or Memcached with tag support
        if (config('cache.default') === 'redis') {
            Cache::tags(['posts'])->flush();
        } else {
            // Fallback: increment a version key for partial invalidation
            Cache::increment('posts:version');
        }
    }
}
```

**Cache key naming convention**: `{resource}:{identifier}:{context}` — e.g., `posts:1:comments`, `user:5:profile`.

**Redis-specific strategies**:
- Use **cache tags** (`Cache::tags(['posts', 'users'])->remember(...)`) for grouped invalidation.
- Implement **cache locks** for critical sections: `Cache::lock('order:processing:'.$orderId)->get(function () { ... })`.
- Monitor cache hit ratio with Redis `INFO` command or Laravel Telescope.
- Set appropriate TTLs: frequently-changing data (user sessions) should have short TTLs (15–60 min); reference data (countries, categories) can have long TTLs (24h+).

### Queue Jobs and Workers

Laravel Queues offload time-intensive tasks (email sending, image processing, API calls) to background workers, keeping HTTP responses fast.

**Why it matters**: If a user's request triggers an email notification, a PDF generation, and a third-party API call, the user waits for all three to complete before getting a response. Queues reduce response times from seconds to milliseconds while providing retry mechanisms for failures.

```php
<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\InvoiceService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class GenerateInvoiceJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Order $order
    ) {}

    public function handle(InvoiceService $invoiceService): void
    {
        try {
            $invoiceService->generate($this->order);
            Log::info('Invoice generated', ['order_id' => $this->order->id]);
        } catch (\Exception $e) {
            Log::error('Invoice generation failed', [
                'order_id' => $this->order->id,
                'error' => $e->getMessage(),
            ]);
            // Requeue with delay if retriable
            if ($this->attempts() < 3) {
                $this->release(30); // Retry in 30 seconds
            } else {
                throw $e; // Exceeded max attempts, send to failed_jobs
            }
        }
    }
}
```

**Queue best practices**:
- Use **unique jobs** for operations that should only run once (e.g., regenerate report): `ShouldBeUnique`.
- Configure **queue workers with Supervisor** to auto-restart after crashes.
- Use **Horizon** for production queue monitoring — it provides a dashboard with job metrics, failed job retry, and queue balancing.
- Set appropriate `$timeout` and `$tries` on jobs to prevent stuck workers.
- Process queues in the **order of priority**: `high`, `default`, `low` using separate queue connections.

```bash
# Supervisor config (example)
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/app/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
numprocs=8
user=forge
redirect_stderr=true
stdout_logfile=/path/to/app/storage/logs/worker.log
```

### Event / Listener System

Laravel's event system provides a clean way to decouple side effects from core business logic.

**Why it matters**: Directly calling notification, logging, and cache-clearing code inside a controller or service creates tight coupling. Events allow you to "fire and forget" — the core operation completes, and listeners handle side effects asynchronously (often via the `ShouldQueue` interface).

```php
<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderPlaced
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Order $order
    ) {}
}
```

```php
<?php

namespace App\Listeners;

use App\Events\OrderPlaced;
use App\Notifications\OrderConfirmation;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendOrderConfirmation implements ShouldQueue
{
    public function handle(OrderPlaced $event): void
    {
        $event->order->user->notify(
            new OrderConfirmation($event->order)
        );
    }
}

class UpdateInventory implements ShouldQueue
{
    public function handle(OrderPlaced $event): void
    {
        foreach ($event->order->items as $item) {
            $item->product->decrement('stock', $item->quantity);
        }
    }
}

class ClearOrderCache implements ShouldQueue
{
    public function handle(OrderPlaced $event): void
    {
        Cache::forget("user:{$event->order->user_id}:orders");
    }
}
```

Register listeners in `AppServiceProvider` or routes:

```php
// boot() method
Event::listen(OrderPlaced::class, SendOrderConfirmation::class);
Event::listen(OrderPlaced::class, UpdateInventory::class);
Event::listen(OrderPlaced::class, ClearOrderCache::class);
```

**Event system guidelines**:
- Prefer **queued listeners** (`ShouldQueue`) for any operation that makes HTTP calls, sends emails, or performs heavy computation.
- Keep event classes **immutable** — all properties should be `public readonly`.
- Use `Event::fake()` in tests to assert that events were dispatched without actually executing listeners.

### Testing Strategy (Unit / Feature / Browser)

Laravel's testing layer supports the testing pyramid: many unit tests at the base, fewer feature tests, and minimal browser tests.

**Why it matters**: Without a deliberate testing strategy, regression bugs multiply exponentially as the codebase grows. A well-tested Laravel application catches regressions at the right level — unit tests catch logic errors quickly, feature tests verify HTTP contracts, and browser tests confirm user workflows.

```php
<?php

namespace Tests\Unit;

use App\Services\OrderService;
use App\Repositories\OrderRepository;
use Mockery\MockInterface;
use Tests\TestCase;

class OrderServiceTest extends TestCase
{
    public function test_calculates_correct_total_with_tax(): void
    {
        $repository = $this->mock(OrderRepository::class, function (MockInterface $mock) {
            $mock->shouldReceive('save')->once();
        });

        $service = new OrderService($repository);
        $result = $service->calculateTotal(100.00, 0.1); // 10% tax

        $this->assertEquals(110.00, $result);
    }
}
```

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_order_via_api(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withToken($token)
            ->postJson('/api/orders', [
                'items' => [
                    ['product_id' => 1, 'quantity' => 2, 'price' => 29.99],
                ],
                'payment_method' => 'credit_card',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'total', 'status', 'items']);
    }
}
```

**Testing guidelines**:
- Use `RefreshDatabase` trait for feature tests — it resets the database between each test.
- Mock external services (payment gateways, email APIs) with `Http::fake()` or `Mail::fake()`.
- Use `Event::fake()`, `Queue::fake()`, `Notification::fake()` to assert side effects without executing them.
- Target **80%+ line coverage** for service and action classes.
- Run tests in parallel: `php artisan test --parallel`.

### Horizon for Queue Monitoring

Laravel Horizon provides a beautiful dashboard and Redis-driven queue configuration. It replaces the need for manual Supervisor configuration with a single `horizon.php` config file.

**Why it matters**: Without monitoring, queue failures go unnoticed until users report missing emails or unprocessed orders. Horizon provides real-time metrics — throughput, wait times, failed jobs — along with one-click retry of failed jobs.

```bash
composer require laravel/horizon
php artisan horizon:install
php artisan migrate
```

```php
// config/horizon.php
'environments' => [
    'production' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['high', 'default', 'low'],
            'balance' => 'auto',
            'minProcesses' => 1,
            'maxProcesses' => 10,
            'tries' => 3,
        ],
    ],
],
```

Access Horizon at `/horizon` (protected by `App\Providers\HorizonServiceProvider::gate()`).

### Telescope for Debugging

Laravel Telescope provides insight into every aspect of application requests — exceptions, queries, cache hits/misses, dispatched jobs, notifications, and more.

**Why it matters**: Debugging production issues without Telescope is like finding a needle in a haystack. Telescope records every request's database queries, enabling developers to identify N+1 problems, slow queries, and unexpected exceptions in real time.

```bash
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate
```

Telescope is intended for **local development and staging only**. In production, it can be configured to record only specific entries:

```php
// config/telescope.php
'watchers' => [
    Watchers\QueryWatcher::class => [
        'enabled' => env('TELESCOPE_ENABLED', false),
        'slow' => 100, // Log queries slower than 100ms
    ],
    Watchers\ExceptionWatcher::class => [
        'enabled' => env('TELESCOPE_ENABLED', false),
    ],
],
```

### Deployment with Forge and Envoyer

**Laravel Forge** provisions and manages servers on AWS, DigitalOcean, Linode, and others. It installs Nginx, PHP, Redis, and Supervisor with a single click, then configures SSL via Let's Encrypt.

**Laravel Envoyer** provides zero-downtime deployment. It pulls the latest code into a new directory, runs migrations, and symlinks the new release — ensuring users never see a maintenance page.

**Deployment checklist**:

```bash
# Pre-deployment
php artisan down --render="errors::maintenance"  # Maintenance mode with custom view
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force

# Optimization
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Post-deployment
php artisan up                                    # Take out of maintenance mode
php artisan queue:restart                         # Restart workers to pick up new code
sudo supervisorctl restart all                    # Restart all worker processes
```

**CI/CD with GitHub Actions**:

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-php@v4
        with:
          php-version: '8.3'
      - name: Install dependencies
        run: composer install --no-dev --optimize-autoloader
      - name: Run tests
        run: php artisan test --parallel
      - name: Deploy via Envoyer
        run: curl -s ${{ secrets.ENVOYER_HOOK_URL }}
```

### Security Hardening (Mass Assignment, SQL Injection, XSS)

Laravel provides built-in protections against the most common web vulnerabilities, but developers must still configure them correctly.

**Mass Assignment Protection**: Always define `$fillable` or `$guarded` on every model. Never pass `$request->all()` directly to `Model::create()`.

```php
// CORRECT
$post = Post::create($request->validated()); // Using Form Request

// CORRECT
$post = Post::create($request->only(['title', 'body']));

// DANGEROUS — mass assignment vulnerability
$post = Post::create($request->all());
```

**SQL Injection Prevention**: Eloquent uses parameter binding for all queries, making it inherently safe against SQL injection. However, raw queries and `DB::statement()` must use bindings:

```php
// SAFE — Eloquent uses parameter binding
Post::where('title', 'like', "%{$search}%")->get();

// SAFE — Raw queries with bindings
DB::select('SELECT * FROM posts WHERE title LIKE ?', ["%{$search}%"]);

// DANGEROUS — string interpolation in raw query
DB::select("SELECT * FROM posts WHERE title LIKE '%{$search}%'");
```

**XSS Prevention**: Blade's `{{ }}` syntax automatically escapes HTML. Only use `{!! !!}` for trusted content that you have sanitized.

```blade
{{-- SAFE — automatically escaped --}}
{{ $user->bio }}

{{-- DANGEROUS — raw output without sanitization --}}
{!! $user->bio !!}

{{-- SAFE — using Purifier or HTML-sanitized content --}}
{!! Purifier::clean($user->bio) !!}
```

**Additional security measures**:
- Implement **rate limiting** on all public API routes: `Route::middleware('throttle:60,1')`.
- Use **HTTPS** in production: `AppServiceProvider::boot()` → `URL::forceScheme('https')` or set `FORCE_HTTPS=true` in `.env`.
- Keep Laravel and all packages updated: `composer audit` checks for known vulnerabilities.
- Implement **CORS** correctly using `config/cors.php` — do not use wildcard origins in production.
- Use **Spatie Laravel Permission** for role-based access control instead of ad-hoc checks.

## Implementation Steps

### Step 1: Audit Current Architecture

1. Review your application's directory structure against the conventions in this guide.
2. Identify "God controllers" that contain business logic, validation, and data access code.
3. Run `php artisan route:list` and `php artisan make:model --all` to catalog all routes and models.
4. Check for missing `$fillable` properties on models (mass assignment risk).
5. Review `config/cache.php` to ensure Redis is configured for production.

### Step 2: Extract Business Logic into Services

1. Identify cohesive groups of business logic in controllers (e.g., "order processing" logic in `OrderController`).
2. Create a `app/Services/OrderService.php` with the extracted methods.
3. Inject dependencies (repositories, other services) via constructor.
4. Refactor the controller to call `OrderService` methods instead of inline logic.
5. Write unit tests for the new service class.

### Step 3: Configure Caching and Queues

1. Install and configure Redis: `composer require predis/predis` or the `phpredis` extension.
2. Set `CACHE_DRIVER=redis` and `QUEUE_CONNECTION=redis` in `.env`.
3. Install Horizon: `composer require laravel/horizon` and configure `config/horizon.php`.
4. Identify cacheable queries and wrap them with `Cache::remember()`.
5. Move email notifications, report generation, and API calls to queued jobs.

### Step 4: Implement Comprehensive Testing

1. Set up PHPUnit with `RefreshDatabase` trait.
2. Write feature tests for all API endpoints (happy path + error cases).
3. Write unit tests for all service classes (mock repositories).
4. Use `Event::fake()`, `Queue::fake()`, and `Mail::fake()` to isolate tests.
5. Add CI pipeline (GitHub Actions) to run tests on every push.

### Step 5: Deploy and Monitor

1. Provision a server with Laravel Forge (or manually with Ansible).
2. Configure Nginx, PHP-FPM, Redis, and Supervisor via Forge.
3. Set up Envoyer for zero-downtime deployments.
4. Install Telescope for local debugging and Sentry/Flare for production error tracking.
5. Configure Horizon for queue monitoring with alerting on failed jobs.
6. Set up health check endpoints: `/health` that verifies database, cache, and queue connectivity.

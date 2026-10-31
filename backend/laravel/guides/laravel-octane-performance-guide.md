---
title: "Laravel Octane and High-Performance Serving Guide"
description: "A production guide to serving Laravel applications with Octane on FrankenPHP, Swoole, or RoadRunner — eliminating cross-request state leaks, tuning workers and connection pools, benchmarking throughput honestly, and deploying long-running workers without downtime."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Laravel Octane and High-Performance Serving Guide

## Introduction

A classic PHP deployment pays a fixed tax on every single request: the web server spawns a PHP-FPM worker, PHP boots, Composer's autoloader is rebuilt, configuration files are parsed, service providers are registered, and only then does your controller run. For a request that does real work, that bootstrap can consume a third or more of the total wall-clock time. Octane removes the tax by booting the framework once and keeping it resident in memory, handing requests to long-running workers that already have the container, the router, and the compiled configuration warm.

The throughput gains are real but they change the failure model completely. In PHP-FPM every request starts from a clean process, so a static array left dirty by request A can never be seen by request B. Under Octane, request A and request B share the same process memory. Any state that was implicitly request-scoped — static properties, container singletons holding a user object, memoized query results, global config mutated at runtime — silently becomes cross-request state. That is why the majority of Octane incidents in production are not throughput problems at all; they are data-leak or memory-growth problems caused by code that was correct under the request-per-process model and quietly wrong under a long-running one.

This guide treats Octane as an architectural migration rather than a configuration flag. It covers how the worker model behaves, the specific classes of state that must be removed or scoped, how to tune workers and connection pools against real measurements, and how to deploy and reload workers without dropping traffic.

## Best Practices

### Treat the Migration as an Audit, Not an Install

Octane is not a package you install and forget. Before a single line of Octane configuration is written, enumerate everything in the application that assumes a fresh process per request: static caches, `once()`-style memoization, mutable singletons, container bindings that hold request data, global middleware that writes to config, and libraries that keep connection or file handles open. The audit is the migration. If you install Octane first and fix leaks after they surface as data corruption in production, you will have shipped a bug that is nearly impossible to reproduce locally.

**Why it matters**: a leak under Octane does not fail loudly. Request B simply receives request A's data, and the symptom appears as an occasional wrong tenant, wrong user name, or stale permission check — the hardest class of bug to trace back to its cause.

### Eliminate Static and Global Mutable State

Static properties and global variables live for the lifetime of the worker, not the lifetime of the request. A static array used as a memoization cache is the single most common Octane leak. Replace static caches with either a request-scoped binding, a real cache store, or an explicitly reset mechanism wired into Octane's request listeners.

**Why it matters**: static state is invisible in code review because it looks like a harmless performance optimization. Under FPM it *was* a harmless optimization; under Octane it is shared memory between unrelated users.

### Use Scoped Bindings for Anything Request-Shaped

Laravel's container distinguishes between `singleton` (one instance for the worker's life) and `scoped` (one instance per request, automatically flushed by Octane after each request). Anything that carries request context — the authenticated user, the current tenant, a request-scoped repository, a per-request HTTP client with headers — must be registered with `scoped()`, never `singleton()`.

**Why it matters**: `scoped()` gives you request isolation semantics with the performance of a shared container, and Octane flushes the scoped instances for you after every request, so you never have to remember manual teardown.

### Configure Worker Count Against CPU, Not Against Hope

The number of Octane workers is the number of concurrent requests the application can execute, because each worker handles one request at a time. Setting workers far above the available CPU cores causes context-switch thrash and inflates tail latency. Start at one to two workers per core, measure, then adjust using observed CPU saturation rather than the belief that more workers means more throughput.

**Why it matters**: an over-provisioned worker pool looks fine on average latency while p99 collapses under load, because requests queue inside PHP while the kernel juggles runnable threads.

### Always Set a Max Requests Ceiling

Every long-running PHP process accumulates memory: cyclic references the garbage collector delays, extension-level buffers, and third-party code that leaks by design. A `max_requests` value (500–1000 is a sensible starting range) recycles each worker after a bounded number of requests, converting an unbounded leak into a bounded sawtooth that the OS reclaims.

**Why it matters**: without a ceiling, one slow leak turns into an OOM kill at 3 a.m., and the restart looks like an unexplained outage rather than a predictable lifecycle event.

### Keep Sessions, Cache, and Queues Out of Process Memory

Under Octane the `array` cache driver and the `array` session driver become per-worker memory that is invisible to other workers. Two consecutive requests from the same browser can land on different workers and see completely different "sessions." Use Redis, Memcached, or the database for sessions and cache, and a real queue backend for jobs.

**Why it matters**: the array drivers are convenient defaults in local development and catastrophic in a multi-worker process. The failure looks like random logouts, which teams often misdiagnose as cookie problems.

### Move Static Assets Off the Application Tier

Octane workers are expensive processes dedicated to executing PHP. Serving images, fonts, and compiled CSS from the worker wastes request slots that could be running business logic, and blocks a whole worker while a large file streams.

**Why it matters**: a single 4 MB image download occupies one worker for its full transfer time. At 16 workers, a handful of concurrent asset downloads can starve the API.

### Warm What Is Expensive at Boot

Octane's `warm` list resolves services, controllers, and view components at worker start so the first real request does not pay the reflection and autoload cost. Combine that with `php artisan config:cache`, `route:cache`, and `view:cache` in the deploy pipeline.

**Why it matters**: cold workers create a latency spike after every deploy and every `max_requests` recycle. Warming flattens that spike, which matters most precisely when traffic is highest.

### Benchmark Before and After, With the Same Harness

Any claim about Octane performance must be backed by a repeatable load test that exercises a realistic endpoint with realistic payloads, run against FPM and Octane from the same machine and dataset. Record p50, p95, p99, throughput, and memory per worker.

**Why it matters**: Octane often improves throughput dramatically while barely moving single-request latency, and it can *worsen* p99 if worker count, connection pool size, or `max_requests` are misconfigured. Only measurement tells you which regime you are in.

### Deploy with Graceful Reloads and Real Health Checks

`php artisan octane:reload` asks workers to finish their in-flight request and then restart, which is the safe way to pick up new code. Pair it with a health endpoint that reports worker liveness, and make your load balancer check that endpoint rather than a static file.

**Why it matters**: a hard restart mid-request drops user transactions. A graceful reload plus correct health checks lets you deploy during business hours without a maintenance window.

### Watch Worker Memory and Connection Counts as First-Class Metrics

Track RSS per worker, requests per worker, database connections held per worker, and Redis connections per worker. Each worker holds its own pool; total connections are workers multiplied by pool size, which is the number teams most often get wrong when scaling horizontally.

**Why it matters**: connection exhaustion under Octane usually appears as intermittent "too many connections" errors only at peak concurrency, because each additional worker multiplies the pool.

## Implementation Steps

### Step 1: Inventory Long-Lived State

Start by finding every place the application stores state outside the request lifecycle. The greps below surface the usual suspects: static properties, container singletons holding request data, and global helper mutations.

```bash
# Static properties and static caches
grep -rn "static \$\|static array\|static ?" app/ --include=*.php

# Singletons registered in service providers
grep -rn "singleton(" app/Providers/ --include=*.php

# Runtime config and global mutation
grep -rn "config(\[" app/ --include=*.php
grep -rn "Config::set\|app()->instance(" app/ --include=*.php
```

For every hit, write down the answer to one question: does this value depend on the current request, the current user, or the current tenant? A value that depends on any of them is a leak candidate; a value derived from immutable configuration is safe.

### Step 2: Install Octane and Pick a Server

Octane supports FrankenPHP (Caddy-based, easiest to operate), Swoole (mature, extension-based), and RoadRunner (Go binary). Pick one and standardize; mixing servers across environments produces benchmark numbers you cannot compare.

```bash
composer require laravel/octane
php artisan octane:install --server=frankenphp
```

Declare the server explicitly in the environment so a missing default never silently changes the runtime:

```ini
OCTANE_SERVER=frankenphp
OCTANE_HTTPS=true
OCTANE_WORKERS=auto
OCTANE_MAX_REQUESTS=500
```

### Step 3: Replace Static Caches with Scoped Services

Take each static cache found in Step 1 and convert it into a scoped service. The bad pattern memoizes into a static property; the good pattern memoizes into an instance that Octane discards after the request.

```php
// Before: survives across requests inside the worker
final class ReportService
{
    protected static array $cache = [];

    public function summary(int $userId): array
    {
        return self::$cache[$userId] ??= $this->build($userId);
    }
}
```

```php
// After: memoized per request, discarded after the response
final class ReportService
{
    private array $cache = [];

    public function summary(int $userId): array
    {
        return $this->cache[$userId] ??= $this->build($userId);
    }
}
```

Register it as scoped so a fresh instance is created for every request and flushed automatically:

```php
// app/Providers/AppServiceProvider.php
public function register(): void
{
    $this->app->scoped(ReportService::class);

    // Request-shaped context must never be a singleton under Octane
    $this->app->scoped(CurrentTenant::class, fn () => new CurrentTenant());
    $this->app->scoped(RequestContext::class, fn () => new RequestContext());
}
```

Audit providers for `singleton()` bindings that receive a `Request`, an authenticated user, or tenant identifiers. Those must move to `scoped()` or they will serve the first request's context to every later request on the same worker.

### Step 4: Configure Octane Deliberately

Octane's configuration file controls worker count, warm-up, the internal request cache, and worker recycling. Set every value explicitly rather than relying on defaults, and keep `max_requests` finite.

```php
// config/octane.php
return [
    'server' => env('OCTANE_SERVER', 'frankenphp'),

    // Resolve expensive services at worker boot, not on first request
    'warm' => array_merge(Octane::defaultServicesToWarm(), [
        App\Http\Controllers\DashboardController::class,
        App\Services\ReportService::class,
    ]),

    'cache' => [
        'rows' => 2000,
        'bytes' => 10_000,
    ],

    'tables' => [
        'metrics:1000' => ['id' => 'int', 'value' => 'float'],
    ],

    // One to two workers per CPU core is the sane starting range
    'workers' => env('OCTANE_WORKERS', 'auto'),

    // Recycle workers to bound memory growth
    'max_requests' => (int) env('OCTANE_MAX_REQUESTS', 500),
];
```

Keep the listeners list intact. Octane flushes scoped instances, resets the container's request context, and clears uploaded-file state inside `RequestTerminated`; removing those listeners reintroduces exactly the leaks the previous steps removed.

### Step 5: Right-Size Database and Redis Pools per Worker

Every worker opens its own connections. Total connections equal workers multiplied by pool size, so scale the pool down as worker count goes up, and size the database's `max_connections` from that product with headroom for migrations and admin sessions.

```php
// config/database.php
'connections' => [
    'pgsql' => [
        'driver' => 'pgsql',
        'host' => env('DB_HOST'),
        'database' => env('DB_DATABASE'),
        'username' => env('DB_USERNAME'),
        'password' => env('DB_PASSWORD'),
        'charset' => 'utf8',
        'prefix' => '',
        'schema' => 'public',
        'sslmode' => 'prefer',
        'pool' => [
            'min_connections' => 2,
            'max_connections' => (int) env('DB_POOL_MAX', 8),
            'wait_timeout' => 5.0,
            'max_idle_time' => 60.0,
        ],
    ],
],
```

Compute the ceiling before deploying and fail the build if the configuration exceeds it:

```bash
php -r '
$workers = (int) getenv("OCTANE_WORKERS");
$pool = (int) getenv("DB_POOL_MAX");
$total = $workers * $pool;
echo "workers={$workers} pool={$pool} total_connections={$total}\n";
if ($total > 180) { fwrite(STDERR, "connection budget exceeded\n"); exit(1); }
'
```

### Step 6: Move Sessions, Cache, and Assets Off the App Tier

Switch the volatile drivers to shared backends, and let the edge serve static content so workers only handle dynamic requests.

```ini
SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis
REDIS_HOST=redis.internal
```

```text
# Before (worker serves the request and streams the file)
GET /storage/products/hero.webp  -> Octane worker (blocked for the whole transfer)

# After (worker never sees asset traffic)
GET /storage/products/hero.webp  -> CDN / object storage / static web server
GET /api/products                -> Octane worker
```

If a file must be served by Laravel because of authorization, return a redirect to a short-lived signed CDN URL instead of streaming the bytes through the worker.

### Step 7: Benchmark With a Repeatable Harness

Run the same load profile against FPM and Octane, on the same machine, with the same seeded dataset. Record throughput, p50, p95, p99, error rate, and peak RSS per worker.

```bash
# Quick saturation check
bombardier -c 100 -d 60s -l http://127.0.0.1:8000/api/products?page=1

# Repeatable scenario with thresholds
k6 run -e BASE_URL=http://127.0.0.1:8000 loadtest/products.js
```

The scenario keeps concurrency identical across runs so the comparison is honest:

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    steady: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 200 },
        { duration: '2m', target: 200 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<150'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/api/products?page=1`);
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

Record the results in a table you can diff between releases:

```text
| Runtime          | Req/s | p50   | p95   | p99   | Peak RSS/worker |
|------------------|-------|-------|-------|-------|-----------------|
| PHP-FPM (32 pm)  |  410  |  61ms | 180ms | 420ms | 48 MB           |
| Octane, 4 workers|  690  |  44ms | 120ms | 260ms | 96 MB           |
| Octane, 8 workers| 1180  |  38ms |  95ms | 190ms | 96 MB           |
```

If p99 rises while throughput improves, suspect worker starvation or connection waits, not CPU.

### Step 8: Prepare the Application for Boot-Time Caching

Cache what can be cached at deploy time, and make the boot path cheap. In production no configuration file should be parsed per request and no route should be resolved from disk.

```bash
php artisan optimize
php artisan event:cache
php artisan view:cache
php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000
```

Clear the caches in local development only; a cached config that hides an environment change is a classic self-inflicted production incident.

```bash
php artisan optimize:clear
```

### Step 9: Deploy With Graceful Reloads and Health Checks

Supervise the Octane process so a crashed worker pool is restarted automatically, and use `octane:reload` to ship new code without dropping in-flight requests.

```ini
; /etc/supervisor/conf.d/octane.conf
[program:octane]
command=php /var/www/html/artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000 --workers=8 --max-requests=500
directory=/var/www/html
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stopsignal=TERM
stopwaitsecs=30
stdout_logfile=/var/log/octane/out.log
stderr_logfile=/var/log/octane/err.log
```

Expose a health endpoint that proves a worker actually executed PHP, not just that a port is open:

```php
// routes/web.php
Route::get('/healthz', function () {
    return response()->json([
        'status' => 'ok',
        'pid' => getmypid(),
        'db' => DB::select('select 1 as ok')[0]->ok === 1,
    ]);
});
```

Deploy sequence: run migrations, rebuild caches, then reload — never restart cold while the load balancer is still sending traffic.

```bash
php artisan migrate --force
php artisan optimize
php artisan octane:reload
curl -fsS http://127.0.0.1:8000/healthz
```

### Step 10: Instrument and Operate the Worker Pool

Once live, watch the numbers that predict Octane-specific failures: RSS per worker trending upward, requests per worker approaching `max_requests` constantly (a sign the ceiling is too low), and database connection counts climbing with replica count.

```php
// app/Providers/AppServiceProvider.php — sample worker metrics on a tick
public function boot(): void
{
    if (! app()->runningInConsole()) {
        Octane::tick('worker-metrics', function () {
            Metrics::gauge('octane.worker.rss_mb', memory_get_peak_usage(true) / 1024 / 1024);
        })->seconds(30);
    }
}
```

Alert on RSS growth rate rather than absolute RSS, and on the ratio of active to total database connections. A worker that grows steadily across a full `max_requests` window is leaking; a pool that sits at 100 percent utilization under normal traffic is under-provisioned.

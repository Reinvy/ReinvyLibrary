---
title: "Laravel Caching, Sessions, and Redis Cheatsheet"
description: "Quick reference for Laravel cache stores, tags, atomic locks, session drivers, and Redis connection settings — the code you reach for when a cache is cold, a lock is stuck, or a session store misbehaves."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Laravel Caching, Sessions, and Redis Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Switch default store | `CACHE_STORE=redis` in `.env` | Read at boot through `config('cache.default')`; falls back to `file` when unset |
| Put a value with TTL | `Cache::put('orders.count', 42, now()->addMinutes(10));` | Accepts a `DateTimeInterface`, an integer number of seconds, or `null` for forever |
| Read with fallback | `Cache::get('orders.count', 0);` | Returns the default without writing anything back to the store |
| Read-through | `Cache::remember('orders.count', 600, fn () => Order::count());` | Computes once, then serves the cached value for 600 seconds |
| Stale-while-revalidate | `Cache::flexible('home.stats', [30, 300], fn () => Stats::build());` | Serves stale data for 30 seconds while a single worker refreshes |
| Store forever | `Cache::forever('feature.flags', $flags);` | Only a deliberate forget call will invalidate it |
| Increment a counter | `Cache::increment('api.calls');` | Atomic on Redis and Memcached, racy on the file store |
| Decrement a counter | `Cache::decrement('queue.depth', 1);` | Floors at zero on Redis instead of going negative |
| Delete one key | `Cache::forget('orders.count');` | No-op when the key has already expired |
| Flush one store | `Cache::store('redis')->flush();` | Never run this on a Redis database that also holds sessions or queues |
| Tagged invalidation | `Cache::tags(['orders'])->flush();` | Unsupported by the file and database stores |
| Atomic lock | `Cache::lock('settle:42', 30)->get();` | Returns false when another process already holds the lock |
| Blocking lock | `Cache::lock('settle:42', 30)->block(5, fn () => $this->settle());` | Waits up to 5 seconds, then throws `LockTimeoutException` |
| Session driver | `SESSION_DRIVER=redis` in `.env` | Applied at boot; existing sessions in the old store are not migrated |
| Read a session value | `$request->session()->get('cart.items', []);` | Prefer the request instance over the `session()` helper inside services |
| Rate limit an action | `RateLimiter::attempt($key, 5, fn () => $job(), 60);` | Five attempts per 60 seconds, keyed by whatever string you pass |

## Common Commands

### Inspecting the Active Store

```bash
# Which store, connection, and prefix this environment actually uses
php artisan tinker --execute="dump(config('cache.default'), config('cache.stores.redis.connection'), config('cache.prefix'));"

# Confirm Redis is reachable from the application container before blaming the cache
redis-cli -h redis -p 6379 ping
```

### Auditing Keys and TTLs

```bash
# Scan a bounded number of keys instead of running KEYS on a production database
redis-cli --scan --pattern 'reports_cache:*' --count 100 | head -40

# Remaining time to live for a single entry, in seconds (-1 means no expiry)
redis-cli ttl 'reports_cache:reports.summary'

# Memory pressure and eviction counters for the cache database
redis-cli info memory
redis-cli info keyspace
```

### Clearing Safely During a Deploy

```bash
# Drop the application cache only, keeping sessions and queues on shared Redis intact
php artisan cache:clear

# Build the supporting table when CACHE_STORE=database
php artisan cache:table
php artisan migrate

# Rebuild the compiled caches after a clear, in this order
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Session Store Operations

```bash
# Build the sessions table when SESSION_DRIVER=database
php artisan session:table
php artisan migrate

# Check the driver and idle timeout without sending a web request
php artisan tinker --execute="dump(config('session.driver'), config('session.lifetime'));"

# Count live session keys under the default database prefix
redis-cli --scan --pattern 'laravel_database_*' --count 100 | wc -l
```

## Code Snippets

### Store and Connection Configuration

```php
<?php

// config/cache.php — one store per workload, not one store for everything
return [
    'default' => env('CACHE_STORE', 'database'),

    'stores' => [
        'redis' => [
            'driver' => 'redis',
            'connection' => 'cache',
            'lock_connection' => 'default',
        ],
        'database' => [
            'driver' => 'database',
            'table' => 'cache',
            'lock_table' => 'cache_locks',
        ],
    ],

    'prefix' => env('CACHE_PREFIX', 'reports_cache'),
];
```

### Read-Through With Explicit Invalidation

```php
<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Cache;

final class ReportCache
{
    public function summary(): array
    {
        return Cache::remember('reports.summary', now()->addMinutes(15), function (): array {
            return [
                'open' => Order::where('status', 'open')->count(),
                'settled' => Order::where('status', 'settled')->count(),
            ];
        });
    }

    public function invalidate(): void
    {
        Cache::forget('reports.summary');
    }
}
```

### Tagged Invalidation for Grouped Data

```php
<?php

use Illuminate\Support\Facades\Cache;

// Tags work on the redis, memcached, and array stores only
Cache::tags(['tenant:'.$tenant->id, 'orders'])->put(
    'orders.open',
    $openOrders,
    now()->addMinutes(10),
);

// One call clears every entry for the tenant, whatever the key shape
Cache::tags(['tenant:'.$tenant->id])->flush();
```

### Stampede Protection With an Atomic Lock

```php
<?php

use App\Support\PriceMatrix;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;

$value = Cache::get('pricing.matrix');

if ($value === null) {
    try {
        // block() releases the lock for you, even when the callback throws
        $value = Cache::lock('pricing.matrix:rebuild', 30)->block(5, function () {
            // Re-check inside the lock: another worker may have filled the key
            return Cache::remember('pricing.matrix', 600, fn () => PriceMatrix::build());
        });
    } catch (LockTimeoutException) {
        // The lock holder is still working, so serve a cheap fallback instead of piling on
        $value = PriceMatrix::defaults();
    }
}
```

### Session Writes That Survive the Request

```php
<?php

// Keep identifiers in the session and hydrate the rest on demand
$request->session()->put('cart.id', $cart->id);
$request->session()->put('cart.count', $cart->items()->count());

// Preserve flash data for one more request when a form fails validation
$request->session()->reflash();

// Rotate the session after a privilege change so the old id dies
$request->session()->invalidate();
$request->session()->regenerateToken();
```

### Redis-Backed Rate Limiting

```php
<?php

use Illuminate\Support\Facades\RateLimiter;

$key = 'checkout:'.$request->user()->id;

$allowed = RateLimiter::attempt($key, 5, function () use ($request) {
    $request->user()->placeOrder($request->validated());
}, 60);

if (! $allowed) {
    abort(429, 'Too many checkout attempts. Retry shortly.');
}

// Expose the budget to clients so they can back off before hitting the limit
$remaining = RateLimiter::remaining($key, 5);
$retryAfter = RateLimiter::availableIn($key);
```

### Cache-Aware Deployment Check

```php
<?php

// routes/console.php — fail fast when a deploy forgets to clear a shared stencil
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

Artisan::command('deploy:cache-check', function (): int {
    $store = config('cache.default');
    $written = Cache::put('deploy.probe', 'ok', 30) && Cache::get('deploy.probe') === 'ok';

    $this->line("store={$store} writable=".($written ? 'yes' : 'no'));

    return $written ? 0 : 1;
});
```

Note that the CLI commands above assume the `redis-cli` binary is present in the same container as the application. When it is not, run the same inspection from the Redis host, or expose the values through a short Tinker script instead.

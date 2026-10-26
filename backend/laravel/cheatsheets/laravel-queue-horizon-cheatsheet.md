---
title: "Laravel Queue and Horizon Cheatsheet"
description: "Quick reference for Laravel queues and Horizon — job classes, retries and backoff, failed job recovery, supervisor and balancing config, tags, metrics, and the artisan commands you reach for during an incident."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Laravel Queue and Horizon Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Push a job | `SendInvoice::dispatch($order);` | Serializes and enqueues after the response is committed |
| Delay a job | `->delay(now()->addMinutes(5))` | Adds an available-at timestamp instead of running now |
| Target a queue | `->onQueue('invoices')` | Routes to a named queue a supervisor must listen on |
| Run a worker locally | `php artisan queue:work --queue=high,default` | Priority runs left to right; first queue with work wins |
| Start Horizon | `php artisan horizon` | Boots every supervisor in `config/horizon.php` |
| Reload workers after deploy | `php artisan horizon:terminate` | Graceful restart; the master respawns workers with new code |
| Set attempt count | `public int $tries = 5;` | Total attempts including the first run |
| Exponential backoff | `public array $backoff = [10, 30, 60, 300];` | Seconds to wait before each successive retry |
| List failed jobs | `php artisan queue:failed` | Shows UUID, connection, queue, and exception per row |
| Retry one failed job | `php artisan queue:retry 3f1c8a2e-...` | Re-queues a single job by UUID |
| Purge failures | `php artisan queue:flush` | Deletes all failed rows; irreversible |
| Prevent overlap | `->withoutOverlapping(10)` | Cache lock so the same logical job cannot run twice |
| Rate-limit a job | `->middleware('throttle:30')` | At most 30 executions per minute across all workers |
| Tag for metrics | `public function tags(): array` | Groups durations and failures in the Horizon UI |

## Common Commands

### Working With the Queue Locally

```bash
# Process one job per run — fastest feedback while debugging
php artisan queue:work --once

# Listen to several queues in priority order
php artisan queue:work --queue=high,default,low --tries=3 --timeout=90

# Run a job synchronously, without a worker
php artisan tinker --execute="SendInvoice::dispatchSync(App\\Models\\Order::first());"

# Clear queued jobs on one connection and queue
php artisan queue:clear redis --queue=invoices
```

### Horizon Lifecycle in Deployment

```bash
# Status of the master supervisor and its supervisors
php artisan horizon:status

# Graceful restart after deploy: finish in-flight jobs, then reload code
php artisan horizon:terminate

# Drop metrics and completed/failed job history for one environment
php artisan horizon:purge

# Snapshot queue lengths and wait times now (normally scheduled)
php artisan horizon:snapshot

# List every supervisor, its queue, and process count
php artisan horizon:list
```

### Failure Triage

```bash
# Failed jobs with exception class and failed_at timestamp
php artisan queue:failed

# Move a job back onto its original queue, or onto another one
php artisan queue:retry 3f1c8a2e-9a51-4b0e-8a1f-6d2c0b7e4a11 --queue=invoices-slow

# Delete one failed job after a manual fix
php artisan queue:forget 3f1c8a2e-9a51-4b0e-8a1f-6d2c0b7e4a11

# Alert-level check: exit non-zero when a queue exceeds its threshold
php artisan queue:monitor redis:invoices,redis:high --max=500
```

## Code Snippets

### A Job With Retries, Timeout, and Overlap Protection

```php
namespace App\Jobs;

use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;

class SendInvoice implements ShouldQueue
{
    use InteractsWithQueue;

    public int $tries = 5;
    public int $timeout = 60;
    public bool $failOnTimeout = true;
    public array $backoff = [10, 30, 60, 300];

    public function __construct(public readonly Order $order) {}

    /** @return array<int, object> */
    public function middleware(): array
    {
        // One invoice per order at a time; the lock expires after 30 idle seconds
        return [(new WithoutOverlapping("invoice:{$this->order->id}"))->expireAfter(30)];
    }

    public function handle(): void
    {
        $this->order->loadMissing('customer');
        app(InvoiceService::class)->send($this->order);
    }

    public function failed(Throwable $exception): void
    {
        Log::channel('queues')->error('invoice failed permanently', [
            'order_id' => $this->order->id,
            'attempts' => $this->attempts(),
            'exception' => $exception->getMessage(),
        ]);
    }

    /** @return array<int, string> */
    public function tags(): array
    {
        return ['invoice', "order:{$this->order->id}"];
    }
}
```

### Supervisor Configuration for Horizon

```php
// config/horizon.php — one supervisor per workload shape
'defaults' => [
    'supervisor-invoices' => [
        'connection' => 'redis',
        'queue' => ['invoices'],
        'balance' => 'auto',      // split processes by measured queue length
        'minProcesses' => 1,
        'maxProcesses' => 10,
        'tries' => 5,
        'timeout' => 60,
    ],
],
```

### Dispatch After Commit and Alert on Backlog

```php
// Never enqueue before commit, or a worker can read a row that is not there yet
DB::transaction(function () use ($order) {
    $order->markPaid();
    SendInvoice::dispatch($order)->afterCommit()->onQueue('invoices');
});

// Schedule a backlog probe every five minutes in routes/console.php
Schedule::command('queue:monitor redis:invoices --max=500')
    ->everyFiveMinutes()
    ->onFailure(fn () => Alert::queue('invoices', 'backlog above 500'));
```

Treat three numbers as alarms, not decoration: queue wait time (not length), failed-job rate, and worker memory.

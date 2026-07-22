---
title: "Tutorial Queue dan Pemrosesan Job Laravel"
description: "Tutorial komprehensif tentang sistem queue Laravel yang mencakup pembuatan job, pengiriman, worker, Horizon, batching, job gagal, dan pola implementasi praktis."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Tutorial Queue dan Pemrosesan Job Laravel

## Ringkasan

Tutorial ini memberikan eksplorasi mendalam tentang sistem queue Laravel — mulai dari pembuatan job dasar dan pengiriman hingga pola lanjutan seperti job batching, chaining, rate limiting, dan Laravel Horizon untuk monitoring produksi. Anda akan mempelajari cara mengonfigurasi driver queue, merancang dan mengirim job secara efektif, menangani kegagalan dengan baik, dan menskalakan worker queue di production. Pada akhirnya, Anda akan dapat mengimplementasikan pipeline pemrosesan job asinkron yang lengkap dengan penanganan error, logika retry, monitoring, dan praktik terbaik deployment.

## Target Audiens

- Pengembang backend dan full-stack PHP yang membangun aplikasi Laravel.
- Level menengah hingga mahir — nyaman dengan fundamental Laravel, perintah Artisan, dan Eloquent.

## Prasyarat

- Aplikasi Laravel (versi 10 atau 11 direkomendasikan) terinstal dan dikonfigurasi.
- Pemahaman dasar tentang service provider Laravel, file konfigurasi, dan Artisan.
- Driver queue (database, Redis, atau SQS) tersedia di lingkungan Anda.
- PHP 8.1+ dan Composer terinstal.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mengonfigurasi dan beralih antar driver queue (database, Redis, Amazon SQS).
- Membuat kelas job dan mengirimnya secara sinkron, asinkron, dan dengan penundaan.
- Mengimplementasikan middleware job untuk rate limiting, throttling, dan logging.
- Merancang job chains dan batches untuk alur kerja multi-langkah yang terkoordinasi.
- Menjalankan dan mengawasi worker queue dengan `php artisan queue:work` dan Supervisor.
- Mengimplementasikan Laravel Horizon untuk monitoring queue dan metrik real-time.
- Menangani job gagal dengan strategi retry yang dapat dikonfigurasi dan notifikasi webhook.
- Menguji fitur berbasis queue di suite unit test dan feature test.

## Konteks dan Motivasi

Aplikasi web modern sangat bergantung pada pemrosesan asinkron untuk memberikan pengalaman pengguna yang responsif. Mengirim email, menghasilkan laporan PDF, memproses unggahan gambar, memanggil API eksternal, dan mengeksekusi ekspor data adalah tugas-tugas yang tidak boleh memblokir siklus respons HTTP. Tanpa sistem queue, operasi ini memperlambat waktu muat halaman, meningkatkan penggunaan memori server, dan menciptakan arsitektur rapuh di mana API pihak ketiga yang lambat dapat melumpuhkan seluruh aplikasi Anda.

Sistem queue Laravel menyelesaikan masalah ini dengan menyediakan API terunifikasi di berbagai backend queue. Job adalah objek PHP yang diserialisasi dan dikirim ke "antrian", diproses oleh "worker" latar belakang, dan secara otomatis dicoba ulang saat gagal. Framework menangani serialisasi, pengiriman, batching, rate limiting, dan manajemen kegagalan — Anda fokus pada logika bisnis di dalam setiap kelas job.

Di lingkungan produksi, queue bukanlah opsional. Mereka adalah tulang punggung setiap aplikasi Laravel yang skalabel. Laravel Horizon, paket first-party, menambahkan monitoring real-time, kumpulan worker yang dapat dikonfigurasi, dan auto-scaling berbasis metrik, membuat manajemen queue menjadi transparan dan dapat diamati.

Tutorial ini menjembatani kesenjangan antara penggunaan queue dasar dan arsitektur pemrosesan job kelas produksi.

## Konten Inti

### Konfigurasi Queue dan Setup Driver

Laravel mendukung beberapa driver queue secara bawaan. File konfigurasi queue berada di `config/queue.php`. Driver default diatur melalui variabel lingkungan `QUEUE_CONNECTION`.

#### Driver Database

Driver database menggunakan database yang sudah ada untuk menyimpan job. Driver ini tidak memerlukan dependensi eksternal dan ideal untuk pengembangan dan aplikasi dengan lalu lintas rendah.

```bash
php artisan queue:table
php artisan migrate
```

Atur variabel lingkungan:

```bash
QUEUE_CONNECTION=database
```

Tabel `jobs` yang dibuat oleh migrasi menyimpan payload job yang diserialisasi, jumlah percobaan, timestamp reservasi, dan pesan error. Worker mempolling tabel ini untuk job yang tersedia, menandainya sebagai sedang diproses, dan menghapusnya saat sukses.

#### Driver Redis

Redis adalah driver queue yang direkomendasikan untuk production. Redis menawarkan latensi sub-milidetik, mendukung prioritas job melalui banyak nama queue, dan terintegrasi dengan Laravel Horizon.

```bash
composer require predis/predis
```

```env
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

Redis menyimpan job dalam struktur data list dan sorted-set native, memungkinkan blocking pop yang efisien dan penjadwalan job tertunda tanpa pemindaian tabel.

#### Driver Amazon SQS

Untuk arsitektur serverless atau aplikasi yang sudah berada di AWS, SQS menyediakan queue yang dikelola sepenuhnya dan dapat diskalakan tanpa batas.

```env
QUEUE_CONNECTION=sqs
SQS_KEY=your-key
SQS_SECRET=your-secret
SQS_PREFIX=https://sqs.us-east-1.amazonaws.com/your-account
SQS_QUEUE=your-queue-name
SQS_REGION=us-east-1
```

SQS memerlukan AWS SDK:

```bash
composer require aws/aws-sdk-php
```

### Membuat dan Mengirim Job

Buat kelas job dengan perintah Artisan:

```bash
php artisan make:job SendWelcomeEmail
```

Ini membuat `app/Jobs/SendWelcomeEmail.php`. Sebuah kelas job berisi metode `handle()` tempat logika bisnis berada. Job menerima dependensi melalui constructor, yang secara otomatis diserialisasi oleh Laravel saat dikirim.

```php
<?php

namespace App\Jobs;

use App\Models\User;
use App\Notifications\WelcomeNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendWelcomeEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, SerializesModels;

    public function __construct(
        public User $user
    ) {}

    public function handle(): void
    {
        $this->user->notify(new WelcomeNotification($this->user));
    }
}
```

Kirim job dengan beberapa cara:

```php
// Pengiriman sederhana (langsung, asinkron)
SendWelcomeEmail::dispatch($user);

// Kirim setelah respons (sinkron di proses saat ini, tapi gaya queue)
SendWelcomeEmail::dispatchAfterResponse($user);

// Pengiriman tertunda
SendWelcomeEmail::dispatch($user)->delay(now()->addMinutes(10));

// Kirim ke queue tertentu
SendWelcomeEmail::dispatch($user)->onQueue('emails');

// Kirim ke koneksi tertentu
SendWelcomeEmail::dispatch($user)->onConnection('sqs');
```

### Middleware Job

Middleware job berjalan sebelum job diproses, memungkinkan Anda menambahkan cross-cutting concerns tanpa mengubah metode `handle()` job. Ini sangat berguna untuk rate limiting dan throttling.

#### Middleware Rate Limiting

```php
<?php

namespace App\Jobs\Middleware;

use Illuminate\Support\Facades\Redis;

class RateLimited
{
    public function __construct(
        protected string $key,
        protected int $maxAttempts,
        protected int $decaySeconds = 60
    ) {}

    public function handle(object $job, callable $next): void
    {
        Redis::throttle($this->key)
            ->allow($this->maxAttempts)
            ->every($this->decaySeconds)
            ->then(function () use ($job, $next) {
                $next($job);
            }, function () use ($job) {
                $job->release($this->decaySeconds);
            });
    }
}
```

Lampirkan middleware ke job dengan meng-override metode `middleware()`:

```php
public function middleware(): array
{
    return [new RateLimited('shipstation-api', 10, 1)];
}
```

#### Middleware Logging

```php
<?php

namespace App\Jobs\Middleware;

use Illuminate\Support\Facades\Log;

class JobLogger
{
    public function handle(object $job, callable $next): void
    {
        $jobId = $job->job?->getJobId() ?? 'tidak diketahui';
        Log::info('Job dimulai', ['id' => $jobId, 'class' => get_class($job)]);
        $start = microtime(true);

        try {
            $next($job);
            $duration = (microtime(true) - $start) * 1000;
            Log::info('Job selesai', ['id' => $jobId, 'duration_ms' => round($duration, 2)]);
        } catch (\Throwable $e) {
            $duration = (microtime(true) - $start) * 1000;
            Log::error('Job gagal', [
                'id' => $jobId,
                'duration_ms' => round($duration, 2),
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
```

### Worker Queue

Worker queue adalah proses PHP berjalan lama yang mendengarkan dan memproses job.

```bash
php artisan queue:work redis --queue=high,default,low --tries=3 --delay=5
```

Opsi worker penting:

| Opsi | Deskripsi |
|------|-----------|
| `--queue=high,default,low` | Memproses queue berdasarkan urutan prioritas (high dulu) |
| `--tries=3` | Jumlah maksimum percobaan ulang sebelum ditandai gagal |
| `--delay=5` | Detik untuk menunggu sebelum mencoba ulang job yang gagal |
| `--timeout=300` | Detik maksimum sebuah job boleh berjalan sebelum worker menghentikannya |
| `--sleep=3` | Detik untuk tidur ketika tidak ada job baru yang tersedia |
| `--max-jobs=100` | Proses sebanyak ini sebelum worker restart (pencegah kebocoran memori) |
| `--max-time=3600` | Restart worker setelah detik ini (pencegah kebocoran memori) |

#### Konfigurasi Supervisor

Jangan pernah menjalankan worker queue di terminal tanpa pengawasan proses. Gunakan Supervisor untuk menjaga worker tetap hidup:

```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /home/forge/aplikasi-anda/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --max-jobs=250
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=forge
numprocs=4
redirect_stderr=true
stdout_logfile=/home/forge/aplikasi-anda/storage/logs/worker.log
stopwaitsecs=3600
```

Arahan `stopwaitsecs=3600` memberikan waktu hingga satu jam bagi job yang berjalan lama untuk selesai sebelum worker dihentikan secara paksa saat deployment.

### Job Chaining

Job chaining memungkinkan Anda mendefinisikan urutan job yang berjalan secara berurutan. Jika satu job gagal, job yang tersisa dalam chain tidak akan dijalankan.

```php
use App\Jobs\ProcessPayment;
use App\Jobs\SendOrderConfirmation;
use App\Jobs\UpdateInventory;
use Illuminate\Support\Facades\Bus;

Bus::chain([
    new ProcessPayment($order),
    new SendOrderConfirmation($order),
    new UpdateInventory($order),
])->dispatch();
```

Chain dapat menyertakan callback fallback ketika salah satu job dalam chain gagal:

```php
Bus::chain([
    new ProcessPayment($order),
    new SendOrderConfirmation($order),
])->catch(function (Throwable $e) {
    // Beri tahu administrator tentang kegagalan
    Log::critical('Rantai pemrosesan pesanan gagal', ['error' => $e->getMessage()]);
})->dispatch();
```

### Job Batching

Batch memungkinkan Anda menjalankan sekumpulan job secara paralel dan mengeksekusi callback ketika semua job dalam batch selesai. Ini ideal untuk operasi massal seperti ekspor data, pembuatan laporan, atau notifikasi batch.

Pertama, buat tabel batch:

```bash
php artisan queue:batches-table
php artisan migrate
```

Definisikan job yang dapat di-batch dengan mengimplementasikan `ShouldQueue` dan menggunakan trait `Batchable`:

```php
<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateUserReport implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, SerializesModels;

    public function __construct(
        public User $user
    ) {}

    public function handle(): void
    {
        if ($this->batch()->cancelled()) {
            return;
        }

        // Generate dan simpan laporan
        $report = $this->compileReport($this->user);
        $this->user->reports()->create(['data' => $report]);
    }

    protected function compileReport(User $user): array
    {
        // Simulasi kompilasi laporan
        return [
            'user_id' => $user->id,
            'total_orders' => $user->orders()->count(),
            'total_spent' => $user->orders()->sum('total'),
            'generated_at' => now(),
        ];
    }
}
```

Kirim batch:

```php
use Illuminate\Support\Facades\Bus;

$users = User::where('active', true)->get();

$batch = Bus::batch(
    $users->map(fn (User $user) => new GenerateUserReport($user))
)->then(function (Batch $batch) {
    Log::info('Semua laporan pengguna berhasil dibuat');
})->catch(function (Batch $batch, Throwable $e) {
    Log::error('Pemrosesan batch gagal', [
        'id' => $batch->id,
        'error' => $e->getMessage(),
    ]);
})->finally(function (Batch $batch) {
    // Selalu berjalan, terlepas dari sukses atau gagal
    Cache::put('last_report_batch_id', $batch->id);
})->dispatch();

return $batch->id;
```

Progress batch dapat dilacak dan diekspos melalui API:

```php
use Illuminate\Bus\Batch;
use Illuminate\Support\Facades\Bus;

Route::get('/batch/{batchId}', function (string $batchId) {
    $batch = Bus::findBatch($batchId);

    if (! $batch) {
        return response()->json(['error' => 'Batch tidak ditemukan'], 404);
    }

    return response()->json([
        'total_jobs' => $batch->totalJobs,
        'pending_jobs' => $batch->pendingJobs,
        'failed_jobs' => $batch->failedJobs,
        'progress' => $batch->progress(),
        'finished' => $batch->finished(),
        'has_failures' => $batch->hasFailures(),
    ]);
});
```

### Menangani Job Gagal

Ketika sebuah job melebihi jumlah maksimum percobaan ulang, Laravel memindahkannya ke tabel `failed_jobs`.

```bash
php artisan queue:failed-table
php artisan migrate
```

Sesuaikan jumlah retry berdasarkan job:

```php
public int $tries = 5;
```

Atau gunakan pendekatan yang lebih dinamis dengan exponential backoff:

```php
public function retryUntil(): DateTime
{
    return now()->addMinutes(30);
}
```

Untuk kontrol backoff yang lebih terperinci:

```php
public function backoff(): array
{
    return [5, 15, 30, 60, 120];
}
```

Monitor dan retry job yang gagal:

```bash
# Daftar semua job gagal
php artisan queue:failed

# Retry job gagal tertentu
php artisan queue:retry 5dfe7b12-3c8f-4a1d-9b6e-f72a4c3d8e1b

# Retry semua job gagal
php artisan queue:retry all

# Hapus job gagal tanpa retry
php artisan queue:forget 5dfe7b12-3c8f-4a1d-9b6e-f72a4c3d8e1b

# Bersihkan semua job gagal
php artisan queue:flush
```

#### Notifikasi Job Gagal

Daftarkan handler job gagal untuk menerima notifikasi melalui email, Slack, atau saluran apa pun:

```php
<?php

namespace App\Providers;

use App\Jobs\SendWelcomeEmail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\ServiceProvider;
use Illuminate\Queue\Events\JobFailed;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Queue::failing(function (JobFailed $event) {
            Log::critical('Job gagal secara permanen', [
                'job' => $event->job->getJobId(),
                'class' => get_class($event->job),
                'exception' => $event->exception->getMessage(),
            ]);
        });
    }
}
```

### Laravel Horizon

Horizon menyediakan dashboard yang indah untuk memantau queue berbasis Redis. Horizon menampilkan throughput job, histogram runtime, tingkat kegagalan, dan job terbaru secara real-time.

```bash
composer require laravel/horizon
php artisan horizon:install
```

Konfigurasikan Horizon di `config/horizon.php`. Definisikan beberapa lingkungan dengan konfigurasi worker yang berbeda:

```php
'environments' => [
    'production' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['high', 'default', 'low'],
            'balance' => 'auto',
            'autoScalingStrategy' => 'time',
            'minProcesses' => 2,
            'maxProcesses' => 12,
            'tries' => 3,
            'nice' => 0,
        ],
    ],
    'staging' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['default'],
            'balance' => 'simple',
            'minProcesses' => 1,
            'maxProcesses' => 2,
            'tries' => 3,
        ],
    ],
    'local' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['default'],
            'balance' => 'simple',
            'processes' => 3,
            'tries' => 3,
        ],
    ],
],
```

Jalankan Horizon sebagai pengganti worker biasa:

```bash
php artisan horizon
```

Dengan Supervisor untuk Horizon itu sendiri:

```ini
[program:laravel-horizon]
command=php /home/forge/aplikasi-anda/artisan horizon
user=forge
autostart=true
autorestart=true
stopwaitsecs=3600
```

Horizon juga mengekspos metrik melalui API-nya, yang dapat memberi umpan dashboard kustom:

```php
use Laravel\Horizon\Contracts\JobRepository;
use Laravel\Horizon\Contracts\MetricsRepository;

Route::get('/horizon/metrics', function (MetricsRepository $metrics) {
    return response()->json([
        'throughput' => $metrics->throughput(),
        'runtime' => $metrics->runtime(),
        'queue_sizes' => app(JobRepository::class)->getRecentJobs(),
    ]);
});
```

### Contoh Praktis: Pipeline Pemrosesan Pesanan

Gabungkan semua konsep di atas ke dalam pipeline pemrosesan pesanan e-commerce yang realistis.

Buat job komprehensif yang menangani tugas pasca-pesanan:

```php
<?php

namespace App\Jobs;

use App\Models\Order;
use App\Notifications\OrderConfirmation;
use App\Services\InventoryService;
use App\Services\ShippingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessOrder implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $maxExceptions = 2;

    public function __construct(
        public Order $order
    ) {}

    public function handle(
        InventoryService $inventory,
        ShippingService $shipping
    ): void {
        if ($this->batch() && $this->batch()->cancelled()) {
            return;
        }

        // Langkah 1: Reservasi inventaris
        $inventory->reserveItems($this->order->items);

        // Langkah 2: Proses pembayaran (ditangani oleh job chained terpisah)
        ProcessPayment::dispatch($this->order)->onQueue('high');

        // Langkah 3: Kirim konfirmasi
        $this->order->user->notify(new OrderConfirmation($this->order));

        // Langkah 4: Antrekan生成 label pengiriman
        GenerateShippingLabel::dispatch($this->order)
            ->delay(now()->addHours(2)) // Beri waktu pembayaran untuk settle
            ->onQueue('default');

        Log::info('Pesanan diproses', ['order_id' => $this->order->id]);
    }

    public function failed(\Throwable $exception): void
    {
        $this->order->update(['status' => 'gagal']);
        Log::error('Pemrosesan pesanan gagal', [
            'order_id' => $this->order->id,
            'error' => $exception->getMessage(),
        ]);
    }

    public function middleware(): array
    {
        return [
            new OrderProcessingMiddleware(),
        ];
    }
}
```

Kirim seluruh alur kerja pesanan:

```php
$order = Order::createFromCart(auth()->user());

Bus::chain([
    new ProcessOrder($order),
    new SendOrderConfirmation($order),
    new UpdateInventory($order),
])->catch(function (Throwable $e) use ($order) {
    $order->update(['status' => 'pembayaran_gagal']);
    Log::critical('Rantai pesanan gagal, refund diperlukan', ['order' => $order->id]);
})->dispatch();
```

### Menguji Job yang Diantrekan

Laravel menyediakan helper pengujian yang kuat untuk kode berbasis queue.

#### Menguji Sebuah Job Secara Unit

```php
<?php

namespace Tests\Unit\Jobs;

use App\Jobs\SendWelcomeEmail;
use App\Models\User;
use App\Notifications\WelcomeNotification;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class SendWelcomeEmailTest extends TestCase
{
    public function test_job_mengirim_notifikasi_selamat_datang(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        SendWelcomeEmail::dispatch($user);

        Notification::assertSentTo(
            $user,
            WelcomeNotification::class,
            fn (WelcomeNotification $notification, array $channels) => true
        );
    }
}
```

#### Menguji Pengiriman Job di Feature Tests

```php
<?php

namespace Tests\Feature;

use App\Jobs\SendWelcomeEmail;
use App\Models\User;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class UserRegistrationTest extends TestCase
{
    public function test_registrasi_mengirim_email_selamat_datang(): void
    {
        Bus::fake();

        $response = $this->post('/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertCreated();

        Bus::assertDispatched(SendWelcomeEmail::class);
    }

    public function test_registrasi_tidak_mengirim_untuk_data_tidak_valid(): void
    {
        Bus::fake();

        $response = $this->post('/register', [
            'name' => '',
            'email' => 'bukan-email',
            'password' => 'pendek',
        ]);

        $response->assertSessionHasErrors();

        Bus::assertNotDispatched(SendWelcomeEmail::class);
    }
}
```

#### Menguji Job Chains dan Batches

```php
public function test_rantai_pemrosesan_pesanan(): void
{
    Bus::fake();

    $order = Order::factory()->create();

    Bus::chain([
        new ProcessOrder($order),
        new SendOrderConfirmation($order),
        new UpdateInventory($order),
    ])->dispatch();

    Bus::assertChained([
        new ProcessOrder($order),
        new SendOrderConfirmation($order),
        new UpdateInventory($order),
    ]);
}

public function test_batch_laporan_dikirim(): void
{
    Bus::fake();

    $users = User::factory()->count(5)->create();
    $controller = new ReportController();
    $controller->generateReports(request());

    Bus::assertBatched(function (Batch $batch) use ($users) {
        return $batch->jobs->count() === 5;
    });
}
```

## Contoh Kode

### Kelas Job Lengkap dengan Retry dan Backoff

```php
<?php

namespace App\Jobs;

use App\Models\WebhookEndpoint;
use App\Notifications\WebhookDeliveryFailed;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeliverWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;
    public int $maxExceptions = 3;

    public function __construct(
        public WebhookEndpoint $endpoint,
        public array $payload
    ) {}

    public function handle(): void
    {
        $response = Http::timeout(10)
            ->retry(0) // Kami menangani retry sendiri melalui backoff
            ->withHeaders([
                'X-Webhook-Signature' => $this->signPayload(),
                'Content-Type' => 'application/json',
            ])
            ->post($this->endpoint->url, $this->payload);

        if ($response->serverError()) {
            $this->release($this->backoff()[$this->attempts() - 1] ?? 120);
            return;
        }

        if ($response->clientError()) {
            $this->fail("Client error: {$response->status()} - {$response->body()}");
        }

        Log::info('Webhook terkirim', [
            'endpoint' => $this->endpoint->id,
            'status' => $response->status(),
        ]);
    }

    public function failed(\Throwable $e): void
    {
        $this->endpoint->increment('failure_count');
        Log::error('Pengiriman webhook gagal permanen', [
            'endpoint' => $this->endpoint->id,
            'error' => $e->getMessage(),
        ]);
    }

    public function backoff(): array
    {
        return [5, 15, 45, 120, 300];
    }

    protected function signPayload(): string
    {
        return hash_hmac('sha256', json_encode($this->payload), $this->endpoint->secret);
    }
}
```

### Route Dashboard Monitoring Queue

```php
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;

Route::get('/queue/status', function () {
    $redis = Redis::connection();

    $queueSizes = collect(['high', 'default', 'low'])->mapWithKeys(
        fn ($q) => [$q => $redis->llen("queues:{$q}")]
    );

    $failedJobs = Queue::failed();

    return response()->json([
        'queue_sizes' => $queueSizes,
        'failed_count' => count($failedJobs),
        'processed_this_hour' => Cache::get('queue_processed_hourly', 0),
        'worker_active' => Cache::get('queue_worker_heartbeat', false),
    ]);
})->middleware('auth');
```

## Insight Penting

- **Pilih Redis untuk queue produksi**: Driver database berfungsi untuk pengembangan, tetapi Redis memberikan latensi sub-milidetik, operasi atomik, dan integrasi Horizon. SQS adalah pilihan terbaik untuk arsitektur serverless atau native AWS.
- **Selalu awasi worker queue**: Tanpa Supervisor atau manajer proses serupa, worker queue akan mati diam-diam karena kebocoran memori atau error tak terduga. Supervisor memastikan restart otomatis tanpa campur tangan manual.
- **Atur `max-jobs` dan `max-time` untuk mencegah kebocoran memori**: Compiled view spesifik-lingkungan, cached queries, dan framework yang berjalan lama mengakumulasi memori selama ribuan siklus job. Restart worker setelah 250-500 job atau 1 jam runtime.
- **Gunakan `->delay()` untuk API eksternal dengan rate limit**: Saat memanggil API pihak ketiga dengan batas rate yang ketat, gunakan throttling berbasis penundaan atau middleware job, bukan panggilan `sleep()` yang dikode secara keras. Ini menjaga worker tetap responsif terhadap job lain.
- **Rancang job secara idempoten**: Job bisa gagal di tengah eksekusi dan dicoba ulang. Pastikan menjalankan job beberapa kali menghasilkan hasil yang sama. Gunakan transaksi database dengan pola `updateOrCreate()` untuk menjamin idempotensi.
- **Pantau job yang gagal secara proaktif**: Job yang gagal secara permanen berarti data hilang. Siapkan saluran notifikasi (Slack, email) untuk job gagal, dan buat tampilan dashboard dari tabel `failed_jobs`.
- **Auto-scaling Horizon beradaptasi dengan beban kerja**: Dalam mode auto-balance, Horizon secara dinamis menyesuaikan jumlah proses worker berdasarkan tekanan queue. Ini menghilangkan kebutuhan untuk menyesuaikan `numprocs` secara manual di konfigurasi Supervisor.

## Langkah Berikutnya

- Perdalam pemahaman Anda tentang internal queue Laravel dengan membaca [dokumentasi Laravel Queues](https://laravel.com/docs/queues).
- Jelajahi [Laravel Horizon](https://laravel.com/docs/horizon) untuk monitoring queue produksi dan auto-scaling.
- Pelajari [Panduan Praktik Terbaik Laravel](..) untuk pola arsitektur Laravel yang lebih luas.
- Selesaikan [Silabus Pengembangan Laravel](..) untuk jalur pembelajaran terstruktur dari fundamental hingga deployment produksi.

## Kesimpulan

Sistem queue Laravel adalah salah satu fitur paling kuat dari framework ini, memungkinkan Anda membangun aplikasi yang responsif, tangguh, dan skalabel. Dalam tutorial ini, Anda mempelajari cara mengonfigurasi driver queue, membuat dan mengirim job, menerapkan middleware untuk cross-cutting concerns, merancang job chains dan batches, mengawasi worker dengan Supervisor, memantau queue dengan Horizon, menangani kegagalan dengan baik, dan menguji fitur berbasis queue. Pola-pola ini membentuk fondasi pemrosesan asinkron kelas produksi di Laravel dan akan berguna di semua jenis aplikasi — dari platform SaaS hingga sistem e-commerce hingga pipeline pemrosesan data.

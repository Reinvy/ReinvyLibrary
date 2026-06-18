---
title: "Panduan Praktik Terbaik Laravel"
description: "Panduan komprehensif untuk pola aplikasi Laravel kelas produksi yang mencakup konvensi direktori, pola service, prinsip SOLID, caching, queue, event, pengujian, deployment, dan pengamanan keamanan."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Praktik Terbaik Laravel

## Pendahuluan

Laravel adalah framework PHP paling populer, mendukung segala sesuatu mulai dari blog pribadi kecil hingga platform SaaS perusahaan yang melayani jutaan pengguna. Sintaksnya yang ekspresif, ekosistem kaya dari paket first-party (Sanctum, Horizon, Telescope, Forge), dan ORM yang elegan (Eloquent) membuatnya sangat produktif. Namun, dengan fleksibilitas yang besar datang tanggung jawab arsitektural — tanpa pola yang disengaja, aplikasi Laravel dapat berubah menjadi "God controller," spageti query yang tidak dapat diuji, dan mimpi buruk deployment.

Panduan ini menyajikan serangkaian praktik terbaik arsitektural dan operasional yang telah teruji untuk membangun aplikasi Laravel yang dapat dipelihara, aman, berperforma tinggi, dan siap produksi. Pola-pola ini diambil dari deployment Laravel dunia nyata, pengalaman kolektif komunitas Laravel, dan dokumentasi resmi Laravel. Fokusnya adalah pada *mengapa* setiap praktik penting dan *bagaimana* pola-pola ini membentuk sistem yang koheren.

## Praktik Terbaik

### Konvensi Struktur Direktori

Struktur direktori yang terorganisir dengan baik adalah fondasi kemudahan pemeliharaan di Laravel. Di luar scaffolding default, mengadopsi struktur berorientasi domain di dalam `app/` mencegah model dan service menjadi tempat pembuangan sampah.

**Mengapa ini penting**: Struktur direktori datar tidak dapat diskalakan dengan baik. Ketika aplikasi tumbuh melampaui 20+ model dan controller, file yang tidak terkait menjadi tercampur, konflik merge meningkat, dan anggota tim baru kesulitan menemukan kode yang relevan.

```text
app/
  Models/                  # Semua model Eloquent
    User.php
    Post.php
    Comment.php
  Http/
    Controllers/
      Api/                 # Controller khusus API
      Web/                 # Controller khusus Web
    Requests/              # Kelas validasi Form Request
    Resources/             # Transformer resource API
  Services/                # Logika bisnis (domain services)
    PaymentService.php
    NotificationService.php
  Repositories/            # Abstraksi akses data (opsional)
    PostRepository.php
  Actions/                 # Kelas aksi tunggal untuk operasi kompleks
    PublishPostAction.php
  Enums/                   # Backed enum PHP 8.1+
    PostStatus.php
  Events/
  Listeners/
  Jobs/
  Mail/
  Notifications/
  Rules/                   # Objek aturan validasi kustom
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

**Aturan utama**:
- Kelompokkan berdasarkan **konsep domain** (posts, users, payments) di dalam `app/`, bukan berdasarkan lapisan teknis.
- Jaga metode controller tetap tipis — delegasikan logika bisnis ke Services atau Actions.
- Gunakan `app/Actions/` untuk operasi yang melibatkan lebih dari satu model atau service (misalnya, "publikasikan post" yang memperbarui status, mengirim notifikasi, dan membersihkan cache).
- Enum harus berupa backed enum (`string` atau `int`) dan digunakan untuk field status alih-alih string biasa.

### Pola Service dan Logika Bisnis

Pola Service mengekstrak logika bisnis dari controller dan model ke dalam kelas service khusus, memungkinkan penggunaan kembali dan testabilitas.

**Mengapa ini penting**: Controller hanya boleh menangani concern HTTP (parsing permintaan, format respons). Aturan bisnis yang tertanam di controller atau model menciptakan kopling ketat, membuatnya tidak mungkin digunakan kembali di perintah CLI, queue job, dan controller API tanpa duplikasi.

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
            // 1. Validasi inventaris
            $this->inventoryService->reserveItems($data['items']);

            // 2. Proses pembayaran
            $payment = $this->paymentService->charge(
                $data['payment_method'],
                $data['total']
            );

            // 3. Buat pesanan
            $order = Order::create([
                'user_id' => $data['user_id'],
                'total' => $data['total'],
                'status' => 'confirmed',
                'payment_id' => $payment->id,
            ]);

            // 4. Buat item pesanan
            foreach ($data['items'] as $item) {
                $order->items()->create($item);
            }

            // 5. Kirim notifikasi (antrian)
            $order->user->notify(new OrderConfirmation($order));

            Log::info('Pesanan berhasil ditempatkan', ['order_id' => $order->id]);

            return $order;
        });
    }
}
```

**Panduan pola service**:
- Service adalah **singleton stateless** — injeksi dependensi melalui constructor, jangan pernah menyimpan state permintaan.
- Setiap metode publik mewakili satu transaksi bisnis, sering dibungkus dalam transaksi database.
- Jaga service tetap fokus: jika sebuah service melebihi ~15 metode, pisahkan berdasarkan konsep domain.
- Injeksi repository atau service lain, jangan pernah menginjeksi objek Request.

### Pola Repository (Ketika Tepat)

Pola Repository menyediakan lapisan abstraksi antara logika bisnis dan akses data. Di Laravel dengan Eloquent, repository bersifat opsional — Eloquent sendiri sudah merupakan implementasi Data Mapper. Gunakan repository hanya ketika:

- Anda perlu bertukar antara sumber data yang berbeda (misalnya, Eloquent ↔ REST API).
- Anda ingin memusatkan logika query yang kompleks.
- Anda mengimplementasikan Hexagonal Architecture (Ports & Adapters).

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

**Kapan TIDAK menggunakan repository**: Untuk operasi CRUD standar yang sudah ditangani Eloquent secara native, menambahkan lapisan repository adalah indirection yang tidak perlu. Pola active record Laravel melalui Eloquent sudah menyediakan `find()`, `create()`, `update()`, `delete()`, dan query scope — membungkus ini dalam repository menambah boilerplate tanpa abstraksi yang berarti.

### Prinsip SOLID di Laravel

**Single Responsibility Principle (SRP)**: Setiap kelas harus memiliki tepat satu alasan untuk berubah. Controller tidak boleh berisi aturan validasi (gunakan Form Requests), logika bisnis (gunakan Services), atau logika akses data (gunakan Models/Repositories).

**Open/Closed Principle (OCP)**: Terbuka untuk ekstensi, tertutup untuk modifikasi. Gunakan `macro()` Laravel pada kelas inti, binding service container dengan interface, dan pola pipeline untuk memperluas perilaku tanpa mengubah kode yang ada.

```php
// Contoh: Memperluas Stringable melalui macro
use Illuminate\Support\Stringable;
use Illuminate\Support\Str;

Str::macro('phone', function (string $value) {
    return preg_replace('/^(\d{3})(\d{3})(\d{4})$/', '($1) $2-$3', $value);
});

// Penggunaan: (string) Str::phone('1234567890') => "(123) 456-7890"
```

**Liskov Substitution Principle (LSP)**: Subtipe harus dapat digantikan untuk tipe dasarnya. Saat menggunakan binding interface di service container, pastikan semua implementasi memenuhi kontrak dengan benar.

**Interface Segregation Principle (ISP)**: Lebih baik memiliki banyak interface kecil yang fokus daripada satu interface besar. Misalnya, pisahkan `UserServiceInterface` menjadi `UserAuthenticationInterface`, `UserProfileInterface`, dan `UserAdminInterface` jika konsumen yang berbeda memerlukan subset fungsionalitas yang berbeda.

**Dependency Inversion Principle (DIP)**: Bergantung pada abstraksi, bukan konkresi. Gunakan service container Laravel untuk mengikat interface ke implementasi:

```php
// Di AppServiceProvider
$this->app->bind(PaymentGatewayInterface::class, StripePaymentGateway::class);

// Di injeksi constructor
public function __construct(
    private readonly PaymentGatewayInterface $paymentGateway
) {}
```

### Strategi Caching (Redis / File)

Laravel menyediakan API cache terpadu dengan driver untuk file, database, Redis, dan Memcached. Untuk aplikasi produksi, Redis adalah driver yang direkomendasikan.

**Mengapa ini penting**: Query database adalah bottleneck performa yang paling umum. Satu halaman dapat mengeksekusi puluhan query; caching mengurangi ini menjadi satu pembacaan Redis. Invalidasi cache yang tepat mencegah data basi tanpa memerlukan pembersihan cache manual.

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
        // Gunakan cache tags jika menggunakan Redis atau Memcached dengan dukungan tag
        if (config('cache.default') === 'redis') {
            Cache::tags(['posts'])->flush();
        } else {
            // Fallback: increment key versi untuk invalidasi parsial
            Cache::increment('posts:version');
        }
    }
}
```

**Konvensi penamaan kunci cache**: `{resource}:{identifier}:{context}` — misalnya, `posts:1:comments`, `user:5:profile`.

**Strategi khusus Redis**:
- Gunakan **cache tags** (`Cache::tags(['posts', 'users'])->remember(...)`) untuk invalidasi berkelompok.
- Implementasikan **cache locks** untuk bagian kritis: `Cache::lock('order:processing:'.$orderId)->get(function () { ... })`.
- Monitor rasio hit cache dengan perintah Redis `INFO` atau Laravel Telescope.
- Tetapkan TTL yang sesuai: data yang sering berubah (sesi pengguna) harus memiliki TTL pendek (15–60 menit); data referensi (negara, kategori) dapat memiliki TTL panjang (24 jam+).

### Queue Jobs dan Workers

Laravel Queues memindahkan tugas yang memakan waktu (pengiriman email, pemrosesan gambar, panggilan API) ke pekerja latar belakang, menjaga respons HTTP tetap cepat.

**Mengapa ini penting**: Jika permintaan pengguna memicu notifikasi email, generasi PDF, dan panggilan API pihak ketiga, pengguna menunggu ketiganya selesai sebelum mendapatkan respons. Queue mengurangi waktu respons dari detik menjadi milidetik sambil menyediakan mekanisme percobaan ulang untuk kegagalan.

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
            Log::info('Invoice berhasil dibuat', ['order_id' => $this->order->id]);
        } catch (\Exception $e) {
            Log::error('Pembuatan invoice gagal', [
                'order_id' => $this->order->id,
                'error' => $e->getMessage(),
            ]);
            // Antre ulang dengan penundaan jika dapat dicoba ulang
            if ($this->attempts() < 3) {
                $this->release(30); // Coba ulang dalam 30 detik
            } else {
                throw $e; // Melebihi batas percobaan, kirim ke failed_jobs
            }
        }
    }
}
```

**Praktik terbaik queue**:
- Gunakan **unique jobs** untuk operasi yang hanya boleh dijalankan sekali (misalnya, regenerasi laporan): `ShouldBeUnique`.
- Konfigurasikan **queue workers dengan Supervisor** untuk restart otomatis setelah crash.
- Gunakan **Horizon** untuk monitoring queue produksi — ini menyediakan dashboard dengan metrik job, percobaan ulang job gagal, dan penyeimbangan queue.
- Tetapkan `$timeout` dan `$tries` yang sesuai pada job untuk mencegah worker macet.
- Proses queue dalam **urutan prioritas**: `high`, `default`, `low` menggunakan koneksi queue terpisah.

```bash
# Konfigurasi Supervisor (contoh)
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

### Sistem Event / Listener

Sistem event Laravel menyediakan cara yang bersih untuk memisahkan efek samping dari logika bisnis inti.

**Mengapa ini penting**: Memanggil kode notifikasi, logging, dan pembersihan cache secara langsung di dalam controller atau service menciptakan kopling ketat. Event memungkinkan Anda "fire and forget" — operasi inti selesai, dan listener menangani efek samping secara asinkron (sering melalui interface `ShouldQueue`).

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

Daftarkan listener di `AppServiceProvider` atau routes:

```php
// Method boot()
Event::listen(OrderPlaced::class, SendOrderConfirmation::class);
Event::listen(OrderPlaced::class, UpdateInventory::class);
Event::listen(OrderPlaced::class, ClearOrderCache::class);
```

**Panduan sistem event**:
- Pilih **queued listeners** (`ShouldQueue`) untuk operasi apa pun yang melakukan panggilan HTTP, mengirim email, atau melakukan komputasi berat.
- Jaga kelas event tetap **immutable** — semua properti harus `public readonly`.
- Gunakan `Event::fake()` dalam pengujian untuk memastikan bahwa event dikirim tanpa benar-benar mengeksekusi listener.

### Strategi Pengujian (Unit / Fitur / Browser)

Lapisan pengujian Laravel mendukung piramida pengujian: banyak pengujian unit di dasar, lebih sedikit pengujian fitur, dan pengujian browser yang minimal.

**Mengapa ini penting**: Tanpa strategi pengujian yang disengaja, bug regresi berkembang biak secara eksponensial seiring pertumbuhan basis kode. Aplikasi Laravel yang teruji dengan baik menangkap regresi di tingkat yang tepat — pengujian unit menangkap kesalahan logika dengan cepat, pengujian fitur memverifikasi kontrak HTTP, dan pengujian browser mengonfirmasi alur kerja pengguna.

```php
<?php

namespace Tests\Unit;

use App\Services\OrderService;
use App\Repositories\OrderRepository;
use Mockery\MockInterface;
use Tests\TestCase;

class OrderServiceTest extends TestCase
{
    public function test_menghitung_total_yang_benar_dengan_pajak(): void
    {
        $repository = $this->mock(OrderRepository::class, function (MockInterface $mock) {
            $mock->shouldReceive('save')->once();
        });

        $service = new OrderService($repository);
        $result = $service->calculateTotal(100.00, 0.1); // Pajak 10%

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

    public function test_dapat_membuat_pesanan_melalui_api(): void
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

**Panduan pengujian**:
- Gunakan trait `RefreshDatabase` untuk pengujian fitur — ini mereset database di antara setiap pengujian.
- Mock layanan eksternal (payment gateway, API email) dengan `Http::fake()` atau `Mail::fake()`.
- Gunakan `Event::fake()`, `Queue::fake()`, `Notification::fake()` untuk memastikan efek samping tanpa mengeksekusinya.
- Targetkan **cakupan baris 80%+** untuk kelas service dan action.
- Jalankan pengujian secara paralel: `php artisan test --parallel`.

### Horizon untuk Monitoring Queue

Laravel Horizon menyediakan dashboard yang indah dan konfigurasi queue berbasis Redis. Ini menggantikan kebutuhan konfigurasi Supervisor manual dengan satu file konfigurasi `horizon.php`.

**Mengapa ini penting**: Tanpa monitoring, kegagalan queue tidak terdeteksi sampai pengguna melaporkan email yang hilang atau pesanan yang tidak diproses. Horizon menyediakan metrik real-time — throughput, waktu tunggu, job gagal — bersama dengan percobaan ulang satu klik untuk job yang gagal.

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

Akses Horizon di `/horizon` (dilindungi oleh `App\Providers\HorizonServiceProvider::gate()`).

### Telescope untuk Debugging

Laravel Telescope memberikan wawasan tentang setiap aspek permintaan aplikasi — exceptions, query, cache hit/miss, job yang dikirim, notifikasi, dan banyak lagi.

**Mengapa ini penting**: Debugging masalah produksi tanpa Telescope seperti mencari jarum di tumpukan jerami. Telescope mencatat query database setiap permintaan, memungkinkan pengembang mengidentifikasi masalah N+1, query lambat, dan exceptions tak terduga secara real-time.

```bash
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate
```

Telescope ditujukan untuk **pengembangan lokal dan staging saja**. Di produksi, dapat dikonfigurasi untuk mencatat hanya entri tertentu:

```php
// config/telescope.php
'watchers' => [
    Watchers\QueryWatcher::class => [
        'enabled' => env('TELESCOPE_ENABLED', false),
        'slow' => 100, // Catat query yang lebih lambat dari 100ms
    ],
    Watchers\ExceptionWatcher::class => [
        'enabled' => env('TELESCOPE_ENABLED', false),
    ],
],
```

### Deployment dengan Forge dan Envoyer

**Laravel Forge** menyediakan dan mengelola server di AWS, DigitalOcean, Linode, dan lainnya. Ini menginstal Nginx, PHP, Redis, dan Supervisor dengan satu klik, kemudian mengonfigurasi SSL melalui Let's Encrypt.

**Laravel Envoyer** menyediakan deployment tanpa downtime. Ini menarik kode terbaru ke direktori baru, menjalankan migrasi, dan membuat symlink rilis baru — memastikan pengguna tidak pernah melihat halaman maintenance.

**Daftar periksa deployment**:

```bash
# Pra-deployment
php artisan down --render="errors::maintenance"  # Mode maintenance dengan tampilan kustom
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force

# Optimasi
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Pasca-deployment
php artisan up                                    # Keluar dari mode maintenance
php artisan queue:restart                         # Restart worker untuk mengambil kode baru
sudo supervisorctl restart all                    # Restart semua proses worker
```

**CI/CD dengan GitHub Actions**:

```yaml
name: Deploy ke Produksi
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
      - name: Instal dependensi
        run: composer install --no-dev --optimize-autoloader
      - name: Jalankan pengujian
        run: php artisan test --parallel
      - name: Deploy via Envoyer
        run: curl -s ${{ secrets.ENVOYER_HOOK_URL }}
```

### Pengamanan Keamanan (Mass Assignment, SQL Injection, XSS)

Laravel menyediakan perlindungan bawaan terhadap kerentanan web yang paling umum, tetapi pengembang masih harus mengonfigurasinya dengan benar.

**Perlindungan Mass Assignment**: Selalu definisikan `$fillable` atau `$guarded` di setiap model. Jangan pernah mengirim `$request->all()` langsung ke `Model::create()`.

```php
// BENAR
$post = Post::create($request->validated()); // Menggunakan Form Request

// BENAR
$post = Post::create($request->only(['title', 'body']));

// BERBAHAYA — kerentanan mass assignment
$post = Post::create($request->all());
```

**Pencegahan SQL Injection**: Eloquent menggunakan parameter binding untuk semua query, membuatnya secara inheren aman terhadap SQL injection. Namun, query mentah dan `DB::statement()` harus menggunakan binding:

```php
// AMAN — Eloquent menggunakan parameter binding
Post::where('title', 'like', "%{$search}%")->get();

// AMAN — Query mentah dengan binding
DB::select('SELECT * FROM posts WHERE title LIKE ?', ["%{$search}%"]);

// BERBAHAYA — interpolasi string dalam query mentah
DB::select("SELECT * FROM posts WHERE title LIKE '%{$search}%'");
```

**Pencegahan XSS**: Sintaks Blade `{{ }}` secara otomatis meng-escape HTML. Hanya gunakan `{!! !!}` untuk konten tepercaya yang telah Anda sanitasi.

```blade
{{-- AMAN — secara otomatis di-escape --}}
{{ $user->bio }}

{{-- BERBAHAYA — output mentah tanpa sanitasi --}}
{!! $user->bio !!}

{{-- AMAN — menggunakan konten yang sudah di-Purifier atau di-sanitasi HTML --}}
{!! Purifier::clean($user->bio) !!}
```

**Langkah keamanan tambahan**:
- Implementasikan **rate limiting** pada semua route API publik: `Route::middleware('throttle:60,1')`.
- Gunakan **HTTPS** di produksi: `AppServiceProvider::boot()` → `URL::forceScheme('https')` atau set `FORCE_HTTPS=true` di `.env`.
- Jaga Laravel dan semua paket tetap diperbarui: `composer audit` memeriksa kerentanan yang diketahui.
- Implementasikan **CORS** dengan benar menggunakan `config/cors.php` — jangan gunakan origin wildcard di produksi.
- Gunakan **Spatie Laravel Permission** untuk kontrol akses berbasis peran alih-alih pemeriksaan ad-hoc.

## Langkah Implementasi

### Langkah 1: Audit Arsitektur Saat Ini

1. Tinjau struktur direktori aplikasi Anda terhadap konvensi dalam panduan ini.
2. Identifikasi "God controller" yang berisi logika bisnis, validasi, dan kode akses data.
3. Jalankan `php artisan route:list` dan `php artisan make:model --all` untuk mengkatalogkan semua route dan model.
4. Periksa properti `$fillable` yang hilang pada model (risiko mass assignment).
5. Tinjau `config/cache.php` untuk memastikan Redis dikonfigurasi untuk produksi.

### Langkah 2: Ekstrak Logika Bisnis ke Services

1. Identifikasi kelompok logika bisnis yang kohesif di controller (misalnya, logika "pemrosesan pesanan" di `OrderController`).
2. Buat `app/Services/OrderService.php` dengan metode yang diekstrak.
3. Injeksi dependensi (repository, service lain) melalui constructor.
4. Refaktor controller untuk memanggil metode `OrderService` alih-alih logika inline.
5. Tulis pengujian unit untuk kelas service baru.

### Langkah 3: Konfigurasi Caching dan Queue

1. Instal dan konfigurasi Redis: `composer require predis/predis` atau ekstensi `phpredis`.
2. Set `CACHE_DRIVER=redis` dan `QUEUE_CONNECTION=redis` di `.env`.
3. Instal Horizon: `composer require laravel/horizon` dan konfigurasi `config/horizon.php`.
4. Identifikasi query yang dapat di-cache dan bungkus dengan `Cache::remember()`.
5. Pindahkan notifikasi email, generasi laporan, dan panggilan API ke job yang diantri.

### Langkah 4: Implementasi Pengujian Komprehensif

1. Siapkan PHPUnit dengan trait `RefreshDatabase`.
2. Tulis pengujian fitur untuk semua endpoint API (jalur bahagia + kasus error).
3. Tulis pengujian unit untuk semua kelas service (mock repository).
4. Gunakan `Event::fake()`, `Queue::fake()`, dan `Mail::fake()` untuk mengisolasi pengujian.
5. Tambahkan pipeline CI (GitHub Actions) untuk menjalankan pengujian pada setiap push.

### Langkah 5: Deploy dan Monitor

1. Sediakan server dengan Laravel Forge (atau secara manual dengan Ansible).
2. Konfigurasi Nginx, PHP-FPM, Redis, dan Supervisor melalui Forge.
3. Siapkan Envoyer untuk deployment tanpa downtime.
4. Instal Telescope untuk debugging lokal dan Sentry/Flare untuk pelacakan error produksi.
5. Konfigurasi Horizon untuk monitoring queue dengan alerting pada job yang gagal.
6. Siapkan endpoint health check: `/health` yang memverifikasi konektivitas database, cache, dan queue.

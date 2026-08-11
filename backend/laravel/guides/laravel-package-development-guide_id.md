---
title: "Panduan Pengembangan Paket Laravel"
description: "Panduan komprehensif untuk membangun, menguji, dan mendistribusikan paket Laravel yang dapat digunakan kembali — mencakup scaffolding paket, service provider, facade, konfigurasi, migrasi database, strategi pengujian, dan publikasi ke Packagist."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Pengembangan Paket Laravel

## Pendahuluan

Paket Laravel adalah blok bangunan dari ekosistem Laravel. Dari manajemen antrean bertenaga Horizon hingga kedalaman debugging Telescope, setiap alat Laravel yang Anda andalkan adalah sebuah paket. Kemampuan untuk membuat paket Anda sendiri yang terstruktur dengan baik, dapat diuji, dan dapat didistribusikan adalah hal yang membedakan pengguna Laravel dari kontributor Laravel — baik Anda mengemas logika bisnis internal yang digunakan bersama di beberapa proyek, membangun alat sumber terbuka untuk komunitas, atau mengekstrak fungsionalitas yang dapat digunakan kembali dari monolit.

Panduan ini mencakup siklus hidup lengkap pengembangan paket Laravel: scaffolding dan konvensi direktori, service provider dan pola boot/manage, facade dan injeksi dependensi, manajemen konfigurasi dan publikasi file, migrasi database dan seeder untuk konsumen paket, pengujian secara terisolasi, dan akhirnya mendistribusikan paket Anda di Packagist dengan versioning dan dokumentasi yang tepat. Setiap bagian menyediakan pola konkret yang teruji di produksi, bukan praktik terbaik abstrak.

## Praktik Terbaik

### Struktur Direktori Paket

Setiap paket Laravel harus mengikuti struktur direktori yang konsisten dan dapat diprediksi. Autoloading PSR-4 Composer dan auto-discovery service provider Laravel bergantung pada jalur yang dapat diprediksi.

```text
laravel-my-package/
  src/
    Commands/
    Console/
    Contracts/
    Exceptions/
    Facades/
    Http/
      Controllers/
      Middleware/
      Requests/
    Models/
    Providers/
      PackageServiceProvider.php
    Services/
    Traits/
  config/
    my-package.php
  database/
    migrations/
    factories/
    seeders/
  resources/
    lang/
    views/
  routes/
    api.php
    web.php
  tests/
    Unit/
    Feature/
  composer.json
  README.md
  LICENSE
  .gitignore
```

**Mengapa ini penting**: Konsumen paket dan auto-discovery Laravel mengharapkan service provider di `src/Providers/`, file konfigurasi di `config/`, dan migrasi di `database/migrations/`. Menyimpang dari konvensi ini memaksa pengembang untuk mendaftarkan komponen Anda secara manual, yang merupakan tanda pertama paket yang belum matang.

### Service Provider: Titik Masuk Paket

Service provider adalah file terpenting dalam paket Laravel mana pun. File ini dipanggil oleh Laravel saat bootstrap dan bertanggung jawab untuk mendaftarkan semua komponen paket.

**Mengapa ini penting**: Tanpa service provider yang dikonfigurasi dengan benar, migrasi, perintah, rute, terjemahan, dan tampilan paket Anda tidak terlihat oleh aplikasi konsumen. Service provider adalah kontrak antara paket Anda dan Laravel.

```php
<?php

namespace ReinvyLibrary\MyPackage\Providers;

use Illuminate\Support\ServiceProvider;
use ReinvyLibrary\MyPackage\Console\Commands\InstallCommand;
use ReinvyLibrary\MyPackage\Services\PackageService;

class PackageServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // 1. Ikat singleton ke dalam container
        $this->app->singleton(PackageService::class, function ($app) {
            return new PackageService(config('my-package.api_key'));
        });

        // 2. Gabung konfigurasi agar default tetap ada meskipun tanpa publikasi
        $this->mergeConfigFrom(
            __DIR__ . '/../../config/my-package.php',
            'my-package'
        );
    }

    public function boot(): void
    {
        // 1. Publikasi konfigurasi (opsional — developer menjalankan php artisan vendor:publish)
        $this->publishes([
            __DIR__ . '/../../config/my-package.php' => config_path('my-package.php'),
        ], 'my-package-config');

        // 2. Muat migrasi (otomatis — tidak perlu publikasi)
        $this->loadMigrationsFrom(__DIR__ . '/../../database/migrations');

        // 3. Muat rute (kondisional — hanya jika diaktifkan)
        $this->loadRoutesFrom(__DIR__ . '/../../routes/api.php');

        // 4. Daftarkan perintah
        if ($this->app->runningInConsole()) {
            $this->commands([
                InstallCommand::class,
            ]);
        }

        // 5. Muat terjemahan
        $this->loadTranslationsFrom(__DIR__ . '/../../resources/lang', 'my-package');

        // 6. Muat tampilan
        $this->loadViewsFrom(__DIR__ . '/../../resources/views', 'my-package');

        // 7. Publikasi aset (opsional)
        $this->publishes([
            __DIR__ . '/../../public' => public_path('vendor/my-package'),
        ], 'my-package-assets');
    }
}
```

### Pemisahan Boot dan Register

Metode `register()` tidak boleh menggunakan fasilitas Laravel apa pun yang bergantung pada aplikasi yang telah sepenuhnya di-boot — tidak ada panggilan `config()`, `route()`, `view()`, atau `request()`. Hanya ikat ke dalam container dan gabung konfigurasi. Semua pendaftaran fitur (rute, tampilan, migrasi, perintah) termasuk dalam `boot()`.

**Mengapa ini penting**: Selama `register()`, service provider lain mungkin belum di-boot. Mengakses `config()` atau `route()` di `register()` menghasilkan perilaku yang tidak dapat diprediksi — terkadang berhasil secara kebetulan, terkadang gagal secara diam-diam.

### Facade sebagai Gula Sintaksis

Facade menyediakan antarmuka seperti statis untuk layanan yang terdaftar di container. Facade sepenuhnya opsional tetapi idiomatis di ekosistem Laravel.

```php
<?php

namespace ReinvyLibrary\MyPackage\Facades;

use Illuminate\Support\Facades\Facade;

class MyPackage extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return \ReinvyLibrary\MyPackage\Services\PackageService::class;
    }
}
```

Tambahkan facade ke properti `$facades` service provider Anda atau daftarkan secara eksplisit. Untuk auto-discovery, tambahkan ke `composer.json`:

```json
{
    "extra": {
        "laravel": {
            "facades": [
                "ReinvyLibrary\\MyPackage\\Facades\\MyPackage"
            ]
        }
    }
}
```

**Mengapa facade penting**: Mereka mengurangi verbositas dalam kode controller dan view. Alih-alih `app(PackageService::class)->doSomething()`, pengembang cukup menulis `MyPackage::doSomething()`. Namun, facade harus didukung oleh kelas konkret di container — jangan gunakan facade sebagai kelas statis murni, karena itu merusak testabilitas.

### Konfigurasi dengan Nilai Default yang Masuk Akal

Konfigurasi paket harus memiliki default lengkap sehingga paket berfungsi tanpa langkah `vendor:publish` manual.

```php
// config/my-package.php
return [
    /*
     * Kunci API untuk layanan eksternal. Timpa dengan mempublikasi konfigurasi
     * dan mengatur MY_PACKAGE_API_KEY di .env.
     */
    'api_key' => env('MY_PACKAGE_API_KEY', ''),

    /*
     * URL endpoint. Default mengarah ke produksi; timpa untuk pengembangan lokal.
     */
    'endpoint' => env('MY_PACKAGE_ENDPOINT', 'https://api.example.com'),

    /*
     * Timeout koneksi dalam detik.
     */
    'timeout' => env('MY_PACKAGE_TIMEOUT', 30),

    /*
     * Aktifkan logging verbose untuk debugging.
     */
    'debug' => env('MY_PACKAGE_DEBUG', false),
];
```

**Mengapa ini penting**: Pengembang yang mengevaluasi paket Anda menjalankan `composer require` dan mengharapkannya berfungsi. Jika mereka harus menemukan dan mempublikasi file konfigurasi sebelum fungsionalitas apa pun berfungsi, mereka akan meninggalkan paket Anda untuk pesaing.

### Migrasi Database dan Publikasi Bertag

Migrasi paket harus menggunakan nama file deskriptif bertimestamp dan menandai publikasi sehingga konsumen dapat secara selektif mempublikasi file migrasi.

```php
$this->publishes([
    __DIR__ . '/../../database/migrations/' => database_path('migrations'),
], 'my-package-migrations');
```

Migrasi dalam paket harus menggunakan konvensi `$table->timestamps()` dan **jangan pernah** mengasumsikan koneksi database tertentu — gunakan `Schema::connection()` hanya jika paket Anda secara eksplisit memerlukan koneksi terpisah.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('package_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('plan');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('package_subscriptions');
    }
};
```

### Menguji Paket Secara Terisolasi

Pengujian paket harus berjalan secara independen dari aplikasi Laravel mana pun. Gunakan Orchestra Testbench — ini mem-bootstrap lingkungan aplikasi Laravel minimal yang dirancang khusus untuk pengujian paket.

**Mengapa ini penting**: Jika pengujian Anda bergantung pada instalasi Laravel penuh, mereka tidak dapat berjalan di CI untuk paket itu sendiri. Orchestra Testbench menciptakan lingkungan pengujian mandiri yang memvalidasi paket Anda terhadap versi Laravel yang diketahui.

```bash
composer require --dev "orchestra/testbench:^9.0"
```

```php
<?php

namespace ReinvyLibrary\MyPackage\Tests;

use Orchestra\Testbench\TestCase as OrchestraTestCase;
use ReinvyLibrary\MyPackage\Providers\PackageServiceProvider;

class TestCase extends OrchestraTestCase
{
    protected function getPackageProviders($app): array
    {
        return [
            PackageServiceProvider::class,
        ];
    }

    protected function getPackageAliases($app): array
    {
        return [
            'MyPackage' => \ReinvyLibrary\MyPackage\Facades\MyPackage::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        // Atur variabel lingkungan untuk pengujian
        $app['config']->set('my-package.api_key', 'test-key-123');
        $app['config']->set('my-package.endpoint', 'https://test.api.local');
        $app['config']->set('my-package.debug', true);
    }
}
```

```php
<?php

namespace ReinvyLibrary\MyPackage\Tests\Unit;

use ReinvyLibrary\MyPackage\Tests\TestCase;
use ReinvyLibrary\MyPackage\Services\PackageService;

class PackageServiceTest extends TestCase
{
    private PackageService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = $this->app->make(PackageService::class);
    }

    /** @test */
    public function it_can_resolve_service_from_container(): void
    {
        $this->assertInstanceOf(PackageService::class, $this->service);
    }

    /** @test */
    public function it_reads_config_from_environment(): void
    {
        $this->assertEquals('test-key-123', $this->service->getApiKey());
    }
}
```

## Langkah Implementasi

### Langkah 1: Scaffolding Paket

Buat struktur direktori paket dan inisialisasi Composer.

```bash
# Buat direktori paket
mkdir -p laravel-my-package/src/{Commands,Console,Contracts,Exceptions,Facades,Http/Controllers,Http/Middleware,Http/Requests,Models,Providers,Services,Traits}
mkdir -p laravel-my-package/{config,database/migrations,database/factories,database/seeders,resources/lang,resources/views,routes,tests/Unit,tests/Feature}

# Inisialisasi composer.json
cd laravel-my-package
composer init --name="reinvy-library/my-package" --type="library" --description="Paket Laravel yang dapat digunakan kembali"
```

```json
{
    "name": "reinvy-library/my-package",
    "description": "Paket Laravel yang dapat digunakan kembali",
    "type": "library",
    "require": {
        "php": "^8.2",
        "illuminate/support": "^11.0"
    },
    "require-dev": {
        "orchestra/testbench": "^9.0",
        "phpunit/phpunit": "^11.0"
    },
    "autoload": {
        "psr-4": {
            "ReinvyLibrary\\MyPackage\\": "src/"
        }
    },
    "autoload-dev": {
        "psr-4": {
            "ReinvyLibrary\\MyPackage\\Tests\\": "tests/"
        }
    },
    "extra": {
        "laravel": {
            "providers": [
                "ReinvyLibrary\\MyPackage\\Providers\\PackageServiceProvider"
            ],
            "aliases": {
                "MyPackage": "ReinvyLibrary\\MyPackage\\Facades\\MyPackage"
            }
        }
    },
    "minimum-stability": "dev",
    "prefer-stable": true
}
```

### Langkah 2: Implementasi Layanan Inti

Bangun kelas layanan inti yang merangkum fungsionalitas utama paket Anda.

```php
<?php

namespace ReinvyLibrary\MyPackage\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PackageService
{
    private string $apiKey;
    private string $endpoint;
    private int $timeout;
    private bool $debug;

    public function __construct(
        string $apiKey = '',
        string $endpoint = 'https://api.example.com',
        int $timeout = 30,
        bool $debug = false
    ) {
        $this->apiKey = $apiKey;
        $this->endpoint = $endpoint;
        $this->timeout = $timeout;
        $this->debug = $debug;
    }

    public function setApiKey(string $apiKey): self
    {
        $this->apiKey = $apiKey;
        return $this;
    }

    public function getApiKey(): string
    {
        return $this->apiKey;
    }

    public function fetchData(string $resource): array
    {
        $response = Http::timeout($this->timeout)
            ->withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Accept' => 'application/json',
            ])
            ->get($this->endpoint . '/' . ltrim($resource, '/'));

        if ($response->failed()) {
            if ($this->debug) {
                Log::error('MyPackage request failed', [
                    'resource' => $resource,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
            throw new \RuntimeException(
                "MyPackage request to {$resource} failed: {$response->status()}"
            );
        }

        return $response->json();
    }
}
```

### Langkah 3: Registrasi dan Auto-Discovery

Pastikan Laravel menemukan paket Anda secara otomatis. Dengan `composer.json` yang dikonfigurasi seperti di atas dan service provider yang mengimplementasikan pola boot/register yang benar, `composer require reinvy-library/my-package` adalah semua yang diperlukan konsumen.

Untuk pengembangan aplikasi konsumen, tambahkan jalur paket ke kunci `repositories` di `composer.json` root:

```json
{
    "repositories": [
        {
            "type": "path",
            "url": "../laravel-my-package"
        }
    ]
}
```

Kemudian jalankan:

```bash
composer require reinvy-library/my-package:@dev
```

Ini membuat symlink ke direktori paket lokal Anda, memungkinkan iterasi waktu-nyata tanpa `composer update` setelah setiap perubahan.

### Langkah 4: Pengujian Menyeluruh

Tulis pengujian unit untuk layanan inti dan pengujian fitur untuk endpoint HTTP apa pun yang diekspos paket Anda.

```php
<?php

namespace ReinvyLibrary\MyPackage\Tests\Unit;

use Illuminate\Support\Facades\Http;
use ReinvyLibrary\MyPackage\Services\PackageService;
use ReinvyLibrary\MyPackage\Tests\TestCase;

class PackageServiceTest extends TestCase
{
    /** @test */
    public function it_throws_exception_on_api_failure(): void
    {
        Http::fake([
            'test.api.local/items' => Http::response([], 500),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('MyPackage request to /items failed: 500');

        $service = $this->app->make(PackageService::class);
        $service->fetchData('items');
    }

    /** @test */
    public function it_returns_json_on_successful_request(): void
    {
        Http::fake([
            'test.api.local/items' => Http::response([
                ['id' => 1, 'name' => 'Item One'],
                ['id' => 2, 'name' => 'Item Two'],
            ], 200),
        ]);

        $service = $this->app->make(PackageService::class);
        $result = $service->fetchData('items');

        $this->assertCount(2, $result);
        $this->assertEquals('Item One', $result[0]['name']);
    }
}
```

Jalankan pengujian:

```bash
vendor/bin/phpunit
```

### Langkah 5: Publikasi ke Packagist

1. Dorong paket Anda ke repositori GitHub publik.
2. Buka [Packagist.org](https://packagist.org) dan klik "Submit".
3. Masukkan URL repositori Anda — Packagist membaca `composer.json` dan mendaftarkan paket.
4. Atur webhook GitHub atau pembaruan otomatis Packagist untuk menyinkronkan pada setiap dorongan tag.

**Konvensi versioning**:
- Ikuti [Semantic Versioning](https://semver.org) secara ketat: `MAJOR.MINOR.PATCH`.
- Tag rilis dengan prefiks `v`: `git tag v1.0.0 && git push origin v1.0.0`.
- Untuk rilis pra-rilis, gunakan `v1.0.0-alpha1`, `v1.0.0-beta1`, `v1.0.0-rc1`.
- Dokumentasikan perubahan besar dengan jelas di catatan rilis dan README.

### Langkah 6: Pemeliharaan dan Iterasi

- Tambahkan `CHANGELOG.md` yang mendokumentasikan setiap rilis dengan tanggal, versi, dan perubahan.
- Gunakan GitHub Issues dan `CONTRIBUTING.md` untuk memandu kontribusi komunitas.
- Jalankan pipeline CI (GitHub Actions, GitLab CI) yang menjalankan pengujian pada setiap dorongan dan PR.
- Pantau statistik unduhan Packagist dan bintang GitHub untuk mengukur adopsi.
- Tanggapi masalah dan PR dengan cepat — paket yang ditinggalkan merusak kepercayaan pengembang.

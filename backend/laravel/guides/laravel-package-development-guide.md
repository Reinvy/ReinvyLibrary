---
title: "Laravel Package Development Guide"
description: "A comprehensive guide to building, testing, and distributing reusable Laravel packages — covering package scaffolding, service providers, facades, configuration, database migrations, testing strategies, and publishing to Packagist."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Laravel Package Development Guide

## Introduction

Laravel packages are the building blocks of the Laravel ecosystem. From the queue management power of Horizon to the debugging depth of Telescope, every Laravel tool you rely on is a package. The ability to create your own well-structured, testable, and distributable packages is what separates a Laravel user from a Laravel contributor — whether you are packaging internal business logic shared across multiple projects, building an open-source tool for the community, or extracting reusable functionality from a monolith.

This guide covers the complete lifecycle of Laravel package development: scaffolding and directory conventions, service providers and the boot/manage pattern, facades and dependency injection, configuration management and file publishing, database migrations and seeders for package consumers, testing in isolation, and finally distributing your package on Packagist with proper versioning and documentation. Each section provides concrete, production-tested patterns rather than abstract best practices.

## Best Practices

### Package Directory Structure

Every Laravel package should follow a consistent, predictable directory structure. Composer's PSR-4 autoloading and Laravel's service provider auto-discovery both depend on predictable paths.

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

**Why this matters**: Package consumers and Laravel's auto-discovery expect service providers in `src/Providers/`, configuration files in `config/`, and migrations in `database/migrations/`. Deviating from these conventions forces developers to manually register your components, which is the first sign of an immature package.

### Service Provider: The Package Entry Point

The service provider is the single most important file in any Laravel package. It is called by Laravel during bootstrapping and is responsible for registering all package components.

**Why this matters**: Without a properly configured service provider, your package's migrations, commands, routes, translations, and views are invisible to the consuming application. The service provider is the contract between your package and Laravel.

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
        // 1. Bind singletons into the container
        $this->app->singleton(PackageService::class, function ($app) {
            return new PackageService(config('my-package.api_key'));
        });

        // 2. Merge config so defaults survive even without publishing
        $this->mergeConfigFrom(
            __DIR__ . '/../../config/my-package.php',
            'my-package'
        );
    }

    public function boot(): void
    {
        // 1. Publish config (opt-in — developer runs php artisan vendor:publish)
        $this->publishes([
            __DIR__ . '/../../config/my-package.php' => config_path('my-package.php'),
        ], 'my-package-config');

        // 2. Load migrations (auto — no publish needed)
        $this->loadMigrationsFrom(__DIR__ . '/../../database/migrations');

        // 3. Load routes (conditional — only if enabled)
        $this->loadRoutesFrom(__DIR__ . '/../../routes/api.php');

        // 4. Register commands
        if ($this->app->runningInConsole()) {
            $this->commands([
                InstallCommand::class,
            ]);
        }

        // 5. Load translations
        $this->loadTranslationsFrom(__DIR__ . '/../../resources/lang', 'my-package');

        // 6. Load views
        $this->loadViewsFrom(__DIR__ . '/../../resources/views', 'my-package');

        // 7. Publish assets (optional)
        $this->publishes([
            __DIR__ . '/../../public' => public_path('vendor/my-package'),
        ], 'my-package-assets');
    }
}
```

### Separation of Boot and Register

The `register()` method should **never** use any Laravel facilities that depend on the application being fully booted — no `config()`, `route()`, `view()`, or `request()` calls. Only bind into the container and merge config. All feature registration (routes, views, migrations, commands) belongs in `boot()`.

**Why this matters**: During `register()`, other service providers may not have booted yet. Accessing `config()` or `route()` in `register()` produces unpredictable behavior — sometimes working by coincidence, sometimes failing silently.

### Facades as Syntactic Sugar

Facades provide a static-like interface to services registered in the container. They are entirely optional but idiomatic in the Laravel ecosystem.

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

Add the facade to your service provider's `$facades` property or register it explicitly. For auto-discovery, add it to `composer.json`:

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

**Why facades matter**: They reduce verbosity in controller and view code. Instead of `app(PackageService::class)->doSomething()`, developers write `MyPackage::doSomething()`. However, facades should be backed by a concrete class in the container — never use facades as pure static classes, as they break testability.

### Configuration with Sensible Defaults

Package configuration must have complete defaults so the package works without any manual `vendor:publish` step.

```php
// config/my-package.php
return [
    /*
     * API key for the external service. Override by publishing the config
     * and setting MY_PACKAGE_API_KEY in .env.
     */
    'api_key' => env('MY_PACKAGE_API_KEY', ''),

    /*
     * Endpoint URL. Default points to production; override for local dev.
     */
    'endpoint' => env('MY_PACKAGE_ENDPOINT', 'https://api.example.com'),

    /*
     * Connection timeout in seconds.
     */
    'timeout' => env('MY_PACKAGE_TIMEOUT', 30),

    /*
     * Enable verbose logging for debugging.
     */
    'debug' => env('MY_PACKAGE_DEBUG', false),
];
```

**Why this matters**: Developers evaluating your package run `composer require` and expect it to work. If they must find and publish config files before any functionality works, they will abandon your package for a competitor.

### Database Migrations and Tagged Publishing

Package migrations should use descriptive, timestamped filenames and tag publishes so consumers can selectively publish migration files.

```php
$this->publishes([
    __DIR__ . '/../../database/migrations/' => database_path('migrations'),
], 'my-package-migrations');
```

Migrations in packages must use the `$table->timestamps()` convention and **never** assume a specific database connection — use `Schema::connection()` only when your package explicitly requires a separate connection.

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

### Testing Packages in Isolation

Package tests should run independently of any Laravel application. Use Orchestra Testbench — it bootstraps a minimal Laravel application environment specifically for package testing.

**Why this matters**: If your tests depend on a full Laravel installation, they cannot run in CI for the package alone. Orchestra Testbench creates a self-contained test environment that validates your package against a known Laravel version.

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
        // Set environment variables for testing
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

## Implementation Steps

### Step 1: Scaffold the Package

Create the package directory structure and initialize Composer.

```bash
# Create the package directory
mkdir -p laravel-my-package/src/{Commands,Console,Contracts,Exceptions,Facades,Http/Controllers,Http/Middleware,Http/Requests,Models,Providers,Services,Traits}
mkdir -p laravel-my-package/{config,database/migrations,database/factories,database/seeders,resources/lang,resources/views,routes,tests/Unit,tests/Feature}

# Initialize composer.json
cd laravel-my-package
composer init --name="reinvy-library/my-package" --type="library" --description="A reusable Laravel package"
```

```json
{
    "name": "reinvy-library/my-package",
    "description": "A reusable Laravel package",
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

### Step 2: Implement the Core Service

Build the core service class that encapsulates your package's main functionality.

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

### Step 3: Register and Auto-Discover

Ensure Laravel discovers your package automatically. With `composer.json` configured as above and the service provider implementing the correct boot/register pattern, `composer require reinvy-library/my-package` is all a consumer needs to run.

For development of the consuming application, add the package path to the `repositories` key in the root `composer.json`:

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

Then run:

```bash
composer require reinvy-library/my-package:@dev
```

This symlinks your local package directory, allowing real-time iteration without `composer update` after every change.

### Step 4: Test Thoroughly

Write unit tests for the core service and feature tests for any HTTP endpoints your package exposes.

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

Run tests:

```bash
vendor/bin/phpunit
```

### Step 5: Publish to Packagist

1. Push your package to a public GitHub repository.
2. Go to [Packagist.org](https://packagist.org) and click "Submit".
3. Enter your repository URL — Packagist reads `composer.json` and registers the package.
4. Set up a GitHub webhook or Packagist's auto-update to sync on every tag push.

**Versioning conventions**:
- Follow [Semantic Versioning](https://semver.org) strictly: `MAJOR.MINOR.PATCH`.
- Tag releases with `v` prefix: `git tag v1.0.0 && git push origin v1.0.0`.
- For pre-release versions, use `v1.0.0-alpha1`, `v1.0.0-beta1`, `v1.0.0-rc1`.
- Document breaking changes clearly in release notes and README.

### Step 6: Maintain and Iterate

- Add a `CHANGELOG.md` that documents every release with the date, version, and changes.
- Use GitHub Issues and a `CONTRIBUTING.md` to guide community contributions.
- Run a CI pipeline (GitHub Actions, GitLab CI) that runs tests on every push and PR.
- Monitor Packagist download statistics and GitHub stars to gauge adoption.
- Respond to issues and PRs promptly — abandoned packages erode developer trust.

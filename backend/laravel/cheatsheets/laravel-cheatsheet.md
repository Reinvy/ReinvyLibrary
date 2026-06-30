---
title: "Laravel Cheat Sheet"
description: "A quick reference guide for Laravel commands, routing, Eloquent, Blade, Artisan, middleware, validation, and configuration commands."
category: "backend"
technology: "laravel"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# Laravel Cheat Sheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Create project | `composer create-project laravel/laravel app-name` | Scaffold a new Laravel application |
| Serve app | `php artisan serve` | Start the development server on port 8000 |
| Run migrations | `php artisan migrate` | Execute all pending migrations |
| Create model | `php artisan make:model ModelName -m` | Create a model with a migration file |
| Create controller | `php artisan make:controller NameController --resource` | Generate a resource controller |
| List routes | `php artisan route:list` | Display all registered routes |
| Run tests | `php artisan test` | Execute the PHPUnit test suite |
| Clear cache | `php artisan cache:clear` | Flush the application cache |
| Make seeder | `php artisan make:seeder NameSeeder` | Create a new database seeder class |
| Run seeder | `php artisan db:seed --class=NameSeeder` | Seed the database with records |

## Common Commands

### Artisan CLI

```bash
# Application Lifecycle
php artisan down                          # Put application into maintenance mode
php artisan up                            # Bring application out of maintenance mode
php artisan optimize                      # Optimize framework for better performance
php artisan optimize:clear                # Remove optimized cached files

# Make (Generate) Commands
php artisan make:model ModelName -mfs     # Model + migration + factory + seeder
php artisan make:controller NameController --api --model=ModelName
php artisan make:request StoreRequest     # Form Request validation class
php artisan make:mail OrderConfirmation   # Mail class
php artisan make:job ProcessPodcast       # Job class for queues
php artisan make:event UserRegistered     # Event class
php artisan make:listener SendWelcomeEmail --event=UserRegistered
php artisan make:notification InvoicePaid  # Notification class
php artisan make:rule Uppercase           # Custom validation rule
php artisan make:policy PostPolicy        # Authorization policy
php artisan make:scope ActiveScope        # Eloquent query scope
php artisan make:command SendEmails       # Custom Artisan command
php artisan make:factory ModelFactory     # Model factory
php artisan make:test FeatureTest         # PHPUnit test class
php artisan make:channel OrderChannel     # Broadcasting channel
php artisan make:component Alert          # Blade component
php artisan make:observer UserObserver    # Model observer
php artisan make:middleware EnsureAdmin   # HTTP middleware

# Database & Migrations
php artisan migrate:status                # Show migration status
php artisan migrate:rollback              # Rollback the last migration batch
php artisan migrate:reset                 # Rollback all migrations
php artisan migrate:refresh               # Reset and re-run all migrations
php artisan migrate:fresh                  # Drop all tables and re-run migrations
php artisan make:migration create_posts_table
php artisan db:seed                       # Seed database with all seeders
php artisan db:seed --class=UserSeeder    # Run a specific seeder
php artisan schema:dump                   # Dump database schema for version control
```

### Routing Methods

```php
// File: routes/web.php or routes/api.php

// Basic route with closure
Route::get('/users', function () { return response()->json(...); });

// Route to controller method
Route::get('/users', [UserController::class, 'index']);

// HTTP method variants
Route::get('/users', ...);
Route::post('/users', ...);
Route::put('/users/{id}', ...);
Route::patch('/users/{id}', ...);
Route::delete('/users/{id}', ...);
Route::options('/users', ...);

// Resourceful routing
Route::resource('posts', PostController::class);          // Full CRUD (7 routes)
Route::apiResource('posts', PostController::class);       // API-only (5 routes)
Route::apiResources(['posts' => PostController::class]);  // Multiple resources

// Route groups
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('admin')->group(function () {
        Route::name('admin.')->group(function () {
            Route::get('/dashboard', [AdminController::class, 'dashboard']);
        });
    });
});

// Route model binding
Route::get('/posts/{post}', [PostController::class, 'show']);
// PostController receives the resolved Post model instance

// Named routes
Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');

// Route with parameters and constraints
Route::get('/posts/{slug}', [PostController::class, 'show'])->where('slug', '[a-z0-9-]+');

// Fallback route
Route::fallback(function () { return response()->json(['message' => 'Not Found'], 404); });
```

### Laravel Sail Commands (Docker)

```bash
./vendor/bin/sail up -d                   # Start all Docker containers in detached mode
./vendor/bin/sail down                    # Stop all containers
./vendor/bin/sail artisan migrate         # Run Artisan inside the container
./vendor/bin/sail composer require pkg    # Install Composer package
./vendor/bin/sail npm install             # Install NPM dependencies
./vendor/bin/sail npm run build           # Build frontend assets
./vendor/bin/sail test                    # Run PHPUnit tests
./vendor/bin/sail shell                   # SSH into the container
./vendor/bin/sail php --version           # Check PHP version inside container
./vendor/bin/sail mysql                   # Connect to MySQL CLI
```

### Tinker (REPL)

```bash
php artisan tinker                        # Start interactive PHP REPL

# Inside Tinker:
User::count();                            # Count all users
User::find(1);                            # Find user by ID
$user = User::factory()->create();        # Create a user via factory
$user->tasks()->create(['title' => '...']); # Create related model
App\Models\Task::where('status', 'pending')->get(); # Query with conditions
Cache::put('key', 'value', 3600);         # Set cache
Cache::get('key');                        # Get cache
```

## Code Snippets

### Eloquent ORM

```php
// Model definition
class Post extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['title', 'body', 'user_id', 'published_at'];
    protected $casts = ['published_at' => 'datetime', 'is_published' => 'boolean'];
    protected $appends = ['excerpt']; // Accessor-generated attribute

    // Relationships
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function comments(): HasMany { return $this->hasMany(Comment::class); }
    public function tags(): BelongsToMany { return $this->belongsToMany(Tag::class); }

    // Accessor
    public function getExcerptAttribute(): string {
        return Str::limit(strip_tags($this->body), 150);
    }

    // Local scope
    public function scopePublished(Builder $query): Builder {
        return $query->whereNotNull('published_at')->where('published_at', '<=', now());
    }

    // Global scope (in booted method)
    protected static function booted(): void {
        static::addGlobalScope('published', fn (Builder $q) => $q->whereNotNull('published_at'));
    }
}

// Query examples
$posts = Post::with('user', 'comments')->published()->paginate(15);
$post = Post::findOrFail($id);
$post->update(['title' => 'Updated title']);
$post->delete(); // Soft delete if SoftDeletes trait is used
$post->forceDelete(); // Permanently delete
Post::onlyTrashed()->where('user_id', 1)->restore();
```

### Blade Directives

```blade
{{-- Template Inheritance --}}
@extends('layouts.app')
@section('content')
@parent
@endsection

{{-- Control Structures --}}
@if (count($posts) > 0)
    <p>There are {{ count($posts) }} posts.</p>
@elseif (isset($noPosts))
    <p>No posts found.</p>
@else
    <p>Loading...</p>
@endif

@unless ($user->isAdmin())
    <p>You are not an admin.</p>
@endunless

@isset($posts)
    @foreach ($posts as $post)
        <div>{{ $post->title }}</div>
    @endforeach
@endisset

@forelse ($posts as $post)
    <li>{{ $post->title }}</li>
@empty
    <li>No posts yet.</li>
@endforelse

{{-- Authentication --}}
@auth
    <p>Welcome, {{ Auth::user()->name }}</p>
@endauth
@guest
    <p>Please log in.</p>
@endguest

{{-- CSRF & Method Spoofing --}}
@csrf
@method('PUT')

{{-- Errors --}}
@error('title')
    <div class="alert alert-danger">{{ $message }}</div>
@enderror

{{-- Components --}}
<x-alert type="error" :message="$errorMessage"/>
@slot('title') Alert Title @endslot

{{-- Raw PHP --}}
@php
    $count = DB::table('posts')->count();
@endphp
```

### Validation Rules

```php
// In Form Request or controller
$validated = $request->validate([
    'title'       => 'required|string|max:255',
    'email'       => 'required|email:rfc,dns|unique:users,email',
    'password'    => ['required', 'string', 'min:8', 'confirmed', RegEx::make('/^(?=.*[A-Z])/')],
    'age'         => 'required|integer|min:18|max:120',
    'role'        => 'required|in:admin,editor,viewer',
    'avatar'      => 'nullable|image|mimes:jpeg,png|max:2048',
    'tags'        => 'required|array|min:1|max:5',
    'tags.*'      => 'exists:tags,id',
    'published_at'=> 'nullable|date|after_or_equal:today',
    'website'     => 'nullable|url|active_url',
    'ip'          => 'required|ip',
]);

// Custom validation rule
Validator::extend('uppercase', function ($attribute, $value, $parameters, $validator) {
    return strtoupper($value) === $value;
});

// Using Rule objects
use Illuminate\Validation\Rule;
'email' => ['required', Rule::unique('users', 'email')->ignore($userId)],
```

### Middleware List

```php
// Common built-in middleware
'auth'          => \Illuminate\Auth\Middleware\Authenticate::class
'auth:sanctum'  => Authenticate with Sanctum tokens
'guest'         => \Illuminate\Auth\Middleware\RedirectIfAuthenticated::class
'throttle:60,1' => Rate limiting (60 requests per minute)
'verified'      => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class
'cache.headers' => Set cache control headers
'bindings'      => Substitute route model bindings

// Registering custom middleware (bootstrap/app.php)
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias(['role' => \App\Http\Middleware\CheckRole::class]);
    $middleware->api(prepend: [\Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class]);
    $middleware->priority([
        \Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests::class,
        \Illuminate\Cookie\Middleware\EncryptCookies::class,
    ]);
})
```

### Cache and Config Clear Commands

```bash
# Cache Management
php artisan cache:clear                    # Clear application cache
php artisan config:clear                   # Remove config cache file
php artisan config:cache                   # Create config cache for faster config loading
php artisan route:clear                    # Remove route cache
php artisan route:cache                    # Cache routes for faster registration
php artisan view:clear                     # Clear compiled Blade templates
php artisan view:cache                     # Pre-compile all Blade templates
php artisan event:clear                    # Clear all cached events
php artisan event:list                     # List all registered events and listeners
php artisan optimize:clear                 # Clear all cached files (config, route, view, events)
php artisan optimize                       # Cache config, routes, and events
php artisan queue:restart                  # Restart queue workers (after code changes)
```

### Composer Commands

```bash
composer create-project laravel/laravel app-name ^11.0   # Create Laravel project
composer require laravel/sanctum                          # Install Sanctum
composer require laravel/horizon                          # Install Horizon (queue monitoring)
composer require laravel/telescope --dev                  # Install Telescope (debugging)
composer require laravel/breeze --dev                     # Install Breeze (auth scaffolding)
composer require spatie/laravel-permission                # Install Spatie permissions
composer require barryvdh/laravel-debugbar --dev           # Debugbar for development
composer dump-autoload                                    # Regenerate autoload files
composer update                                           # Update all dependencies
composer show --latest                                     # Show outdated packages
```

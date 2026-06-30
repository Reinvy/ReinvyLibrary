---
title: "Laravel CRUD REST API Tutorial"
description: "A comprehensive step-by-step tutorial on building a complete RESTful API with Laravel, covering routes, Eloquent, Sanctum authentication, validation, and testing."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Laravel CRUD REST API Tutorial

## Summary

This tutorial walks through building a fully functional RESTful API for a Task Management application using Laravel. You will learn how to set up a Laravel project, design database schemas with migrations, implement resource controllers, authenticate API requests with Laravel Sanctum, validate input, seed test data, and write automated tests with PHPUnit. By the end, you will have a production-ready JSON API with secure token-based authentication and CRUD operations.

## Target Audience

- Backend Developers and Fullstack Developers who want to master Laravel API development.
- Intermediate level — assumes familiarity with PHP syntax, basic OOP concepts, and command-line usage.

## Prerequisites

- PHP 8.1+ installed locally or via Docker.
- Composer (PHP package manager) installed globally.
- MySQL, PostgreSQL, or SQLite available for database operations.
- Basic understanding of RESTful API design principles.
- Familiarity with the MVC architectural pattern is helpful but not required.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Scaffold a new Laravel project using Composer or Laravel Sail.
- Design database migrations and Eloquent models with relationships.
- Implement resource controllers with full CRUD logic.
- Authenticate API requests using Laravel Sanctum token-based auth.
- Validate incoming request data with Form Requests.
- Write PHPUnit feature tests for API endpoints.
- Seed a database with realistic test data using Laravel seeders and factories.

## Context and Motivation

RESTful APIs power the majority of modern web and mobile applications. Laravel, as the most popular PHP framework, provides an exceptionally productive environment for building these APIs thanks to its expressive ORM (Eloquent), powerful routing system, built-in authentication scaffolding, and extensive testing tools. However, many developers struggle to assemble all these pieces into a cohesive, well-tested API. This tutorial bridges that gap by presenting a complete, end-to-end workflow from project creation to a deployed, authenticated, and tested API. The Task Management domain was chosen because it naturally demonstrates CRUD operations, user-task relationships, and authentication boundaries — patterns that apply directly to e-commerce, content management, SaaS platforms, and virtually any data-driven application.

## Core Content

### Project Setup with Composer and Sail

Laravel can be installed either directly via Composer or through Laravel Sail, which provides a Docker-based development environment. For this tutorial, we will use the Composer installation method, which works identically on any operating system with PHP and Composer installed.

```bash
composer create-project laravel/laravel task-manager-api
cd task-manager-api
```

If you prefer Docker-based development, you can use Sail instead:

```bash
curl -s "https://laravel.build/task-manager-api" | bash
cd task-manager-api
./vendor/bin/sail up -d
```

Once the project is created, configure your `.env` file with the database credentials:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=task_manager
DB_USERNAME=root
DB_PASSWORD=
```

### Understanding the MVC Architecture in Laravel

Laravel follows the Model-View-Controller pattern, though for API development, the View layer is replaced by JSON responses. The typical request lifecycle is:

1. **Route** (`routes/api.php`) receives the HTTP request and maps it to a controller method.
2. **Controller** (`app/Http/Controllers/`) handles the request, delegates business logic to services or models, and returns a response.
3. **Model** (`app/Models/`) represents a database table and encapsulates data access via Eloquent ORM.
4. **Migration** (`database/migrations/`) defines the database schema in a version-controlled way.

```text
HTTP Request → Route → Middleware → Controller → Model/Service → Response (JSON)
```

### Designing the Database with Migrations

We will build a Task Management API with two core entities: **Users** and **Tasks**. Each user can own many tasks, and each task belongs to a single user.

Create the tasks migration:

```bash
php artisan make:migration create_tasks_table
```

Edit the generated migration file in `database/migrations/`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->date('due_date')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
```

Run the migration:

```bash
php artisan migrate
```

### Creating Eloquent Models and Relationships

Generate the Task model with a factory (for seeding):

```bash
php artisan make:model Task -f
```

Edit `app/Models/Task.php` to define the relationship with User and the fillable attributes:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    /** @use HasFactory<\Database\Factories\TaskFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'status',
        'due_date',
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

Update the existing `User` model to include the inverse relationship:

```php
// app/Models/User.php (partial)
public function tasks()
{
    return $this->hasMany(Task::class);
}
```

### Setting Up Routes — Web and API

Laravel separates web routes (with sessions and views) from API routes (stateless, JSON-only). All our API endpoints will be defined in `routes/api.php`, which is loaded by the `ApiRouteServiceProvider` and automatically prefixes `/api` to all routes.

```php
<?php

use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes (require Sanctum authentication)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Resource controller for tasks
    Route::apiResource('tasks', TaskController::class);
});
```

The `apiResource` method automatically generates the standard RESTful routes: `index`, `store`, `show`, `update`, `destroy`.

### Building Resource Controllers

Create the controllers:

```bash
php artisan make:controller Api/TaskController --api --model=Task
php artisan make:controller Api/AuthController
```

The `--api` flag excludes the `create` and `edit` methods, which are only relevant for server-rendered views.

Implement the AuthController:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('tasks'));
    }
}
```

Implement the TaskController with full CRUD:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tasks = $request->user()
            ->tasks()
            ->when($request->status, fn ($query, $status) => $query->where('status', $status))
            ->when($request->search, fn ($query, $search) => $query->where('title', 'like', "%{$search}%"))
            ->orderBy($request->sort_by ?? 'created_at', $request->sort_order ?? 'desc')
            ->paginate($request->per_page ?? 15);

        return response()->json($tasks);
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        $task = $request->user()->tasks()->create($request->validated());

        return response()->json($task, 201);
    }

    public function show(Request $request, Task $task): JsonResponse
    {
        if ($request->user()->id !== $task->user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($task->load('user'));
    }

    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        if ($request->user()->id !== $task->user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $task->update($request->validated());

        return response()->json($task);
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        if ($request->user()->id !== $task->user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $task->delete();

        return response()->json(null, 204);
    }
}
```

### Form Validation with Form Requests

Laravel Form Requests encapsulate validation logic into dedicated classes, keeping controllers clean.

```bash
php artisan make:request StoreTaskRequest
php artisan make:request UpdateTaskRequest
```

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'status' => 'sometimes|in:pending,in_progress,completed',
            'due_date' => 'nullable|date|after_or_equal:today',
        ];
    }

    public function messages(): array
    {
        return [
            'due_date.after_or_equal' => 'The due date must be today or a future date.',
        ];
    }
}
```

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:5000',
            'status' => 'sometimes|in:pending,in_progress,completed',
            'due_date' => 'nullable|date|after_or_equal:today',
        ];
    }
}
```

### API Authentication with Laravel Sanctum

Laravel Sanctum provides a lightweight token-based authentication system perfect for APIs. Install it and set it up:

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

Add the Sanctum middleware to your API routes in `bootstrap/app.php` (or `app/Http/Kernel.php` in older Laravel versions):

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->api(prepend: [
        \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
    ]);
})
```

The `HasApiTokens` trait is already included in the default `User` model in modern Laravel installations. Verify it is present:

```php
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
    // ...
}
```

### Database Seeding with Factories

Laravel Factories generate realistic test data. Customize the Task factory:

```php
<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'status' => fake()->randomElement(['pending', 'in_progress', 'completed']),
            'due_date' => fake()->optional()->dateTimeBetween('now', '+30 days'),
        ];
    }
}
```

Create a database seeder to populate test data:

```php
<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        Task::factory()->count(30)->create([
            'user_id' => $user->id,
        ]);

        // Create additional users with tasks
        User::factory()->count(5)->create()->each(function ($user) {
            Task::factory()->count(10)->create(['user_id' => $user->id]);
        });
    }
}
```

Run the seeder:

```bash
php artisan db:seed
```

### Testing with PHPUnit

Laravel uses PHPUnit for testing with additional testing helpers. Create a feature test for the API:

```bash
php artisan make:test TaskApiTest
```

```php
<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $this->token = $response->json('token');
    }

    public function test_can_create_task(): void
    {
        $response = $this->withToken($this->token)
            ->postJson('/api/tasks', [
                'title' => 'Complete project report',
                'description' => 'Finish the quarterly report by Friday',
                'status' => 'pending',
                'due_date' => '2025-12-31',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'title', 'status', 'created_at'])
            ->assertJson(['title' => 'Complete project report']);

        $this->assertDatabaseHas('tasks', ['title' => 'Complete project report']);
    }

    public function test_can_list_tasks(): void
    {
        Task::factory()->count(3)->create(['user_id' => $this->user->id]);

        $response = $this->withToken($this->token)
            ->getJson('/api/tasks');

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'meta', 'links'])
            ->assertJsonCount(3, 'data');
    }

    public function test_can_show_task(): void
    {
        $task = Task::factory()->create(['user_id' => $this->user->id]);

        $response = $this->withToken($this->token)
            ->getJson("/api/tasks/{$task->id}");

        $response->assertStatus(200)
            ->assertJson(['id' => $task->id, 'title' => $task->title]);
    }

    public function test_can_update_task(): void
    {
        $task = Task::factory()->create([
            'user_id' => $this->user->id,
            'status' => 'pending',
        ]);

        $response = $this->withToken($this->token)
            ->putJson("/api/tasks/{$task->id}", [
                'title' => 'Updated title',
                'status' => 'in_progress',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'title' => 'Updated title',
                'status' => 'in_progress',
            ]);
    }

    public function test_can_delete_task(): void
    {
        $task = Task::factory()->create(['user_id' => $this->user->id]);

        $response = $this->withToken($this->token)
            ->deleteJson("/api/tasks/{$task->id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted($task);
    }

    public function test_unauthenticated_user_cannot_access_tasks(): void
    {
        $response = $this->getJson('/api/tasks');
        $response->assertStatus(401);
    }

    public function test_user_cannot_access_other_users_task(): void
    {
        $otherUser = User::factory()->create();
        $task = Task::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->withToken($this->token)
            ->getJson("/api/tasks/{$task->id}");

        $response->assertStatus(403);
    }
}
```

Run the tests:

```bash
php artisan test --filter=TaskApiTest
```

### Blade Templating Overview

While this tutorial focuses on API development, Laravel's Blade templating engine is worth mentioning. For hybrid applications that serve both API and web views, Blade provides:

- Template inheritance with `@extends` and `@section`.
- Components and slots for reusable UI elements.
- Directives like `@auth`, `@guest`, `@error` for conditional rendering.
- No performance overhead — Blade compiles to plain PHP cached views.

```blade
{{-- resources/views/tasks/index.blade.php --}}
@extends('layouts.app')

@section('content')
    <div class="container">
        <h1>My Tasks</h1>
        
        @foreach($tasks as $task)
            <div class="card mb-2">
                <div class="card-body">
                    <h5>{{ $task->title }}</h5>
                    <span class="badge bg-{{ $task->status === 'completed' ? 'success' : 'warning' }}">
                        {{ $task->status }}
                    </span>
                </div>
            </div>
        @endforeach
    </div>
@endsection
```

## Code Examples

All complete code examples are integrated throughout the Core Content section above. Key files to examine:

- **Migration**: `database/migrations/xxxx_create_tasks_table.php`
- **Model**: `app/Models/Task.php` — Eloquent model with fillable attributes, casts, and relationship.
- **Controller**: `app/Http/Controllers/Api/TaskController.php` — full CRUD with authorization checks.
- **Auth Controller**: `app/Http/Controllers/Api/AuthController.php` — register, login, logout, user profile.
- **Form Requests**: `app/Http/Requests/StoreTaskRequest.php` and `UpdateTaskRequest.php`.
- **Factory**: `database/factories/TaskFactory.php` — generates realistic task data.
- **Test**: `tests/Feature/TaskApiTest.php` — comprehensive API testing suite.

## Key Insights

- **Resource controllers** with `php artisan make:controller --api --model=` save significant boilerplate by auto-wiring route model binding and generating stub methods for all CRUD operations.
- **Sanctum vs Passport**: For most first-party APIs (mobile apps, SPAs), Sanctum is the recommended choice — it is simpler, faster, and does not require OAuth complexity. Use Passport only when you need full OAuth2 server capabilities for third-party clients.
- **Authorization guard**: Always verify that the authenticated user owns the resource they are trying to access. This tutorial uses a simple user_id comparison, but for larger applications, consider using Laravel's Policy system or the `$model->user()->is()` helper.
- **Soft deletes** allow data recovery and maintain referential integrity. Use `SoftDeletes` trait on models where accidental data loss has business impact.
- **Pagination** is critical for production APIs. Laravel's `paginate()` method returns a structured response with `data`, `meta` (current_page, last_page, total), and `links` (first, last, prev, next).

## Next Steps

- Deepen your understanding by exploring **Laravel Policies** for fine-grained authorization.
- Learn how to schedule recurring tasks with **Laravel Task Scheduling** (cron expressions).
- Study **Laravel Queues** (Horizon) for processing long-running jobs asynchronously.
- Follow the **Laravel Best Practices Guide** in this repository for production deployment patterns.
- Explore the **Laravel Development Syllabus** to build a structured learning path.

## Conclusion

You have built a complete, production-ready RESTful API with Laravel. The Task Management API includes user registration and authentication via Sanctum, full CRUD operations with Eloquent, input validation through Form Requests, database seeding with factories, and automated testing with PHPUnit. These patterns form the foundation for any data-driven Laravel API — from simple microservices to complex SaaS platforms.

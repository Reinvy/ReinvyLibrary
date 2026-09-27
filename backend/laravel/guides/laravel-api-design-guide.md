---
title: "Laravel API Design Guide"
description: "A comprehensive guide to designing robust, versioned, and maintainable REST APIs with Laravel — covering resource modeling, URL conventions, API Resources, filtering and pagination, consistent error envelopes, rate limiting, idempotency, conditional requests, Sanctum-based authentication, OpenAPI documentation, and API testing."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Laravel API Design Guide

## Introduction

Laravel makes it easy to return JSON from a controller, but shipping a public API that is pleasant to consume, stable across releases, and safe to retry requires deliberate design. A well-designed API is a contract: consumers depend on its URLs, response shapes, and error behavior, so every change you make after launch is a potential breaking change.

This guide lays out a coherent set of conventions for building production-grade REST APIs with Laravel. It covers how to model resources, version endpoints, shape responses with API Resources, implement filtering and sorting and pagination, return consistent errors, throttle abusive clients, support idempotent retries, authenticate with Sanctum, document the surface with OpenAPI, and lock the whole contract down with feature tests. The running example is a small blog API with posts and comments, typical of the first API most Laravel teams ship.

## Best Practices

### Model APIs around Resources, Not Actions

Design your endpoints around nouns (resources) and let the HTTP verbs express the action. This keeps the surface small, predictable, and self-documenting. An action-style route like `GET /api/v1/publish-post/42` should instead be expressed as a state change on a resource:

```text
GET    /api/v1/posts          -> list posts
POST   /api/v1/posts          -> create a post
GET    /api/v1/posts/{post}   -> show one post
PUT    /api/v1/posts/{post}   -> full update
PATCH  /api/v1/posts/{post}   -> partial update
DELETE /api/v1/posts/{post}   -> delete a post
```

When an operation genuinely is not a CRUD action on a resource (search, publish, bulk actions), model it explicitly:

- Keep the resource routes clean: `GET /api/v1/posts/search` collides with `GET /api/v1/posts/{post}` when `{post}` is a route-model-bound parameter — Laravel resolves `search` as the model. Prefer a dedicated collection endpoint such as `GET /api/v1/search?type=posts&q=...` or a sub-resource route that cannot be confused with an identifier.
- Represent state transitions as updates: publishing becomes `PATCH /api/v1/posts/{post}` with `{"status": "published"}` plus a policy check.
- Reserve custom action verbs for the rare case where an update payload would be misleading (for example `POST /api/v1/posts/{post}/restore` for soft-deleted models).

Consistent resource modeling also makes authorization straightforward: one policy per resource can govern every verb instead of scattering permission checks across ad-hoc routes.

### Use Consistent Naming and URL Conventions

Pick conventions once and enforce them across the whole API:

- Use **kebab-case** for URL path segments (`GET /api/v1/post-comments/12` rather than `get_post_comments`), matching Laravel's own conventions.
- Use **plural nouns** for collection endpoints: `/api/v1/posts`, never `/api/v1/post`.
- Name route parameters after the model they bind: `{post}`, `{user}` — Laravel's implicit route-model binding then injects the model with zero extra code.
- Nest sub-resources only where the parent context is genuinely required to identify the child (`GET /api/v1/posts/{post}/comments`). Avoid nesting deeper than two levels; a comment's own ID is globally unique, so `GET /api/v1/comments/{comment}` is simpler for consumers and sidesteps ambiguity.
- Never expose internal implementation details: primary keys are acceptable for small internal APIs, but public APIs should use UUIDs or public IDs (adding a `uuid` column and binding on it) so you never leak row counts or enumeration opportunities.

### Version Your API from Day One

Even a private API will change. Versioning gives you room to evolve the contract without breaking consumers who have not migrated yet. Choose a strategy and apply it consistently:

- **URI versioning** (`/api/v1/...`) is the most common and the most explicit: it is visible in logs, caches, and client code, and it is trivial to implement with route groups. It is the right default for most Laravel APIs.
- **Header versioning** (`Accept: application/vnd.myapp.v2+json`) keeps URLs clean but hides the version, making debugging and cache-key partitioning harder.
- **Query-parameter versioning** (`?api_version=2`) is easy to misuse (consumers forget it) and pollutes every URL.

Implement URI versioning with a route group, delegating each version to its own route file so old versions can be retired independently:

```php
// routes/api.php
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(base_path('routes/api/v1.php'));
Route::prefix('v2')->group(base_path('routes/api/v2.php'));
```

Each version file declares only that version's routes. A new version is a new file, and an old version can be deleted once its deprecation window closes — the rest of the API is untouched. Rules of thumb for versioning discipline:

- Only bump the major version for **breaking** changes (renamed fields, removed endpoints, changed semantics). Additive changes — a new field, a new endpoint — belong in the current version.
- Keep deprecated versions alive long enough for consumers to migrate; announce deprecation in the API docs and in the `Deprecation` response header.
- Include both locale and timezone-aware timestamps per version's own format, and never silently change formats between versions.

### Shape Responses with API Resources

Laravel API Resources (`php artisan make:resource PostResource`) are the single best tool for keeping your response shape stable while the underlying model changes. They decouple the JSON contract from the database schema:

```php
// app/Http/Resources/PostResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'title' => $this->title,
            'excerpt' => $this->excerpt,
            'status' => $this->status,
            'published_at' => $this->published_at?->toIso8601String(),
            'author' => [
                'id' => $this->user->uuid,
                'name' => $this->user->name,
            ],
            'comments_count' => $this->whenCounted('comments'),
        ];
    }
}
```

Use `whenLoaded()` and `whenCounted()` to include relations and aggregates only when the controller actually loaded them — this keeps indexes small and lets the same resource serve both list and detail endpoints. Wrap collections in `PostResource::collection($posts)` so the JSON envelope (`data`, `meta`, `links`) stays consistent. Never return raw Eloquent models from controllers: once a model shape changes, every consumer breaks at once.

### Standardize Filtering, Sorting, and Pagination

Query parameters are part of your contract. Define them once and reuse the same convention across every collection endpoint:

- **Filtering**: use bracket syntax `filter[status]=published&filter[author]=7`, which maps naturally onto Eloquent query scopes and is unambiguous about the target column.
- **Sorting**: use `sort=title` for ascending and `sort=-created_at` for descending (the leading minus sign is a widespread convention). Always whitelist sortable columns — never pass a raw query parameter into `orderBy()`.
- **Pagination**: default to `paginate()` (page-based) for admin-style tables and `cursorPaginate()` for feeds, because cursor pagination stays stable when new rows are inserted during pagination.

Encapsulate the logic in local query scopes so controllers stay thin and the behavior is unit-testable in isolation:

```php
// app/Models/Post.php
use Illuminate\Database\Eloquent\Builder;

public function scopeFilter(Builder $query, array $filters): Builder
{
    return $query
        ->when(isset($filters['status']), fn (Builder $q) => $q->where('status', $filters['status']))
        ->when(isset($filters['author']), fn (Builder $q) => $q->where('user_id', $filters['author']))
        ->when(isset($filters['tag']), fn (Builder $q) => $q->whereHas('tags', fn (Builder $t) => $t->where('slug', $filters['tag'])));
}

public function scopeSort(Builder $query, ?string $sort): Builder
{
    if (! $sort) {
        return $query->latest('published_at');
    }

    $allowed = ['title', 'created_at', 'published_at'];
    $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
    $column = ltrim($sort, '-');

    return in_array($column, $allowed, true)
        ? $query->orderBy($column, $direction)
        : $query;
}
```

For large APIs, a package like `spatie/laravel-query-builder` formalizes this pattern (including `allowedIncludes` for eager loading), but the scopes above cover most needs with zero dependencies.

### Validate Input and Return a Consistent Error Envelope

Put validation rules in Form Requests — they are reusable, cacheable, and keep controllers readable. More importantly, decide on **one** JSON error shape and return it for every failure: validation errors, model-not-found errors, authentication failures, and unexpected 500s alike. A stable envelope lets consumers write one error-parsing routine instead of branching per endpoint:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The given data was invalid.",
    "details": {
      "title": ["The title field is required."]
    }
  }
}
```

In Laravel 11+, register a renderable closure in `bootstrap/app.php` so the envelope applies globally:

```php
// bootstrap/app.php
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Validation\ValidationException;

->withExceptions(function (Exceptions $exceptions) {
    $exceptions->renderable(function (ValidationException $e, $request) {
        if ($request->is('api/*')) {
            return response()->json([
                'error' => [
                    'code' => 'validation_failed',
                    'message' => 'The given data was invalid.',
                    'details' => $e->errors(),
                ],
            ], 422);
        }
    });

    $exceptions->renderable(function (\Illuminate\Auth\AuthenticationException $e, $request) {
        if ($request->is('api/*')) {
            return response()->json([
                'error' => ['code' => 'unauthenticated', 'message' => 'A valid token is required.'],
            ], 401);
        }
    });
});
```

Use stable machine-readable `code` strings (never user-facing copy) so clients can switch on the code, not on the message text. Include `details` only for validation failures, keep the top-level structure identical across all status codes, and never render HTML error pages for `api/*` requests.

### Rate Limit Everything Public

Rate limiting protects both you and your consumers (a well-documented limit lets clients design backoff correctly). Define a named limiter and attach it to the route group rather than repeating limits per route:

```php
// app/Providers/AppServiceProvider.php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

public function boot(): void
{
    RateLimiter::for('api', function (Request $request) {
        return Limit::perMinute(60)
            ->by($request->user()?->id ?: $request->ip());
    });

    RateLimiter::for('auth', function (Request $request) {
        return Limit::perMinute(5)->by($request->ip());
    });
}
```

```php
// routes/api.php
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::apiResource('posts', PostController::class);
});

Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth');
```

Use `throttle:api` with a Redis cache driver (`CACHE_STORE=redis`) so limits are distributed across all web servers, and return the standard `429 Too Many Requests` with `Retry-After` so clients know when to retry. Apply stricter, per-endpoint limits to expensive operations (search, bulk imports) and to unauthenticated endpoints that are cheap to abuse.

### Support Conditional Requests with ETags

Read endpoints that return the same payload repeatedly waste bandwidth. An `ETag` header lets clients send `If-None-Match` and receive an empty `304 Not Modified` when nothing changed. A small middleware applied to GET endpoints is enough:

```php
// app/Http/Middleware/AddEtag.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AddEtag
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->isMethod('GET') && $response->getStatusCode() === 200) {
            $etag = '"' . md5($response->getContent()) . '"';
            $response->headers->set('ETag', $etag);

            if ($request->headers->get('If-None-Match') === $etag) {
                return response()->noContent(304);
            }
        }

        return $response;
    }
}
```

Register it in the API middleware group and combine it with `Cache-Control: public, max-age=...` headers for genuinely public content. Note that ETag computation still renders the response, so for very expensive payloads prefer application-level caching (Redis) ahead of the middleware.

### Make Mutations Idempotent for Safe Retries

Consumers retry requests after timeouts and network failures — if the first attempt actually succeeded, the retry must not create a duplicate resource. The standard solution is an `Idempotency-Key` header: clients generate a UUID per logical operation, and the server replays the stored response for a repeated key instead of executing the mutation twice.

A compact middleware implements this with the cache:

```php
// app/Http/Middleware/Idempotency.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class Idempotency
{
    private array $methods = ['POST', 'PUT', 'PATCH'];

    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->method(), $this->methods, true)) {
            return $next($request);
        }

        $key = 'idempotency:' . $request->header('Idempotency-Key');

        if ($cached = Cache::get($key)) {
            return response()->json($cached['body'], $cached['status']);
        }

        $request->attributes->set('idempotency.cacheKey', $key);

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        $cacheKey = $request->attributes->get('idempotency.cacheKey');

        if ($cacheKey && $response->getStatusCode() < 500) {
            Cache::put($cacheKey, [
                'status' => $response->getStatusCode(),
                'body' => json_decode($response->getContent(), true),
            ], now()->addHours(24));
        }
    }
}
```

Require the header on write endpoints (reject with `400` when it is missing), store only successful responses (2xx-4xx) so genuine failures can still be retried, and expire keys after a bounded window (24 hours is a common choice). Idempotency pays for itself the first time a client double-charges or double-orders because of a dropped response.

### Design Authentication around Scoped Tokens

For first-party mobile and SPA clients, Laravel Sanctum is the balanced default: it issues bearer tokens with **abilities** (scopes) and per-token expiry, and it supports both token-based and SPA session authentication in one package. Design the token model like an API contract:

```php
// app/Http/Controllers/Api/AuthController.php
$token = $user->createToken(
    'mobile-app',
    ['posts:read', 'posts:write'],
    now()->addDays(30)
);

return response()->json([
    'token' => $token->plainTextToken,
    'expires_at' => $token->accessToken->expires_at,
]);
```

Enforce abilities in routes or controllers:

```php
// routes/api/v1.php
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('posts', [PostController::class, 'index'])
        ->can('posts:read');
    Route::post('posts', [PostController::class, 'store'])
        ->can('posts:write');
});
```

Best practices for the token lifecycle:

- Issue the **smallest set of abilities** each client type needs; never grant blanket token access.
- Set short expiries and provide a refresh flow (`POST /api/v1/tokens/refresh` with a signed, revocable refresh token) instead of issuing long-lived tokens.
- Provide `POST /api/v1/logout` that revokes the current token server-side, and revoke tokens in your policy when a user is suspended.
- Combine token checks with **policy** checks: the token proves *who* you are, the policy decides *what* you may do with a given resource (`$this->authorize('update', $post)`).
- Always use `auth:sanctum` middleware (`Authorization: Bearer <token>`), never placeholder checks in the controller.

### Document the Contract with OpenAPI

An undocumented API is an unmaintainable API: consumers cannot integrate, and the team cannot notice when a change breaks the documented contract. Generate OpenAPI documentation from the code itself so it cannot drift: `knuckleswtf/scribe` (or `dedoc/scramble` for zero-config route inference) produces interactive docs from your controllers, Form Requests, and Resources.

```bash
composer require knuckleswtf/scribe --dev
php artisan scribe:generate
```

Annotate the controllers that need explicit metadata:

```php
/**
 * List posts.
 *
 * @queryParam filter[status] string Filter by status. Example: published
 * @queryParam sort string Sort column, prefix with "-" for descending. Example: -created_at
 * @response scenario=success {
 *   "data": [{"id": "a1b2...", "title": "Hello"}],
 *   "meta": {"current_page": 1}
 * }
 */
public function index(Request $request)
{
    // ...
}
```

Publish the generated docs (or a link to them) wherever consumers look for them, and gate the docs route behind authentication if the API itself is private. Treat a documented response shape as part of the contract: any change to it is a breaking change for the documentation consumers rely on.

### Test the API Surface as a Contract

Feature tests are the enforcement mechanism for everything above. Test the API through its HTTP surface — not through internal classes — so the tests break exactly when the contract breaks:

```php
// tests/Feature/PostApiTest.php
namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_posts_with_pagination_shape(): void
    {
        Post::factory()->count(25)->create();

        $response = $this->getJson('/api/v1/posts');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'title', 'excerpt', 'status', 'author']],
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    public function test_returns_validation_envelope(): void
    {
        $this->postJson('/api/v1/posts', [])
            ->assertStatus(422)
            ->assertJsonStructure(['error' => ['code', 'message', 'details']]);
    }

    public function test_requires_scoped_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test', ['posts:read'])->plainTextToken;

        $this->postJson('/api/v1/posts', [], ['Authorization' => "Bearer {$token}"])
            ->assertForbidden();
    }
}
```

Assert the envelope structure (`assertJsonStructure`) rather than exact bodies so additive changes do not break the suite, but do assert exact values for the scenarios that define the contract (filters, sorting, pagination counts, error codes). Run the suite in CI on every pull request; a contract test that passes locally but fails in CI is a deploy gate, not a nuisance.

## Implementation Steps

The steps below convert the best practices into a working, versioned blog API. Run them in order; each step leaves the API in a passing state so you can commit after every one.

### Step 1: Define the Resource Contract

Write down the contract before writing any code — endpoints, verbs, fields, status codes, and error codes for the initial version:

```text
Version 1 (routes/api/v1.php)

POST   /api/v1/login                    -> 200 {token, expires_at} | 401 | 429
GET    /api/v1/posts                    -> 200 list | 401
POST   /api/v1/posts                    -> 201 created | 422 | 401
GET    /api/v1/posts/{post}             -> 200 detail | 404 | 401
PATCH  /api/v1/posts/{post}             -> 200 updated | 422 | 404 | 401
DELETE /api/v1/posts/{post}             -> 204 no content | 404 | 401
GET    /api/v1/posts/{post}/comments    -> 200 list | 404 | 401

Error envelope: {"error": {"code": string, "message": string, "details"?: object}}
Pagination: page-based, ?page= & per_page default 15, max 100.
```

This document is the source of truth for the rest of the implementation — and for the OpenAPI docs generated in Step 7.

### Step 2: Scaffold the Application and Version Routes

Create a fresh Laravel application (or use your existing one), add Sanctum, and split routes by version:

```bash
composer create-project laravel/laravel blog-api
php artisan install:api
php artisan make:model Post -m -f
php artisan make:model Comment -m -f
mkdir -p routes/api
```

```php
// routes/api.php
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(base_path('routes/api/v1.php'));
```

```php
// routes/api/v1.php
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PostController;
use Illuminate\Support\Facades\Route;

Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth');

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::apiResource('posts', PostController::class)->except(['edit', 'create']);
    Route::get('posts/{post}/comments', [PostController::class, 'comments']);
});
```

Run `php artisan route:list --path=api` after each routing change to confirm the version prefix and middleware are applied.

### Step 3: Build Models, Scopes, and Resources

Add the `uuid`, filtering, and sorting scopes to the model, then create the API Resource:

```php
// app/Models/Post.php
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = ['title', 'excerpt', 'body', 'status', 'published_at', 'user_id'];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when(isset($filters['status']), fn (Builder $q) => $q->where('status', $filters['status']))
            ->when(isset($filters['author']), fn (Builder $q) => $q->where('user_id', $filters['author']));
    }

    public function scopeSort(Builder $query, ?string $sort): Builder
    {
        if (! $sort) {
            return $query->latest('published_at');
        }

        $allowed = ['title', 'created_at', 'published_at'];
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');

        return in_array($column, $allowed, true)
            ? $query->orderBy($column, $direction)
            : $query;
    }
}
```

```bash
php artisan make:resource PostResource
php artisan make:resource CommentResource
```

```php
// app/Http/Resources/PostResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'title' => $this->title,
            'excerpt' => $this->excerpt,
            'status' => $this->status,
            'published_at' => $this->published_at?->toIso8601String(),
            'author' => new UserResource($this->whenLoaded('user')),
            'comments_count' => $this->whenCounted('comments'),
        ];
    }
}
```

### Step 4: Implement the Controller with Scoped Queries

The controller stays thin — it binds query params to scopes, applies pagination, and returns resources:

```php
// app/Http/Controllers/Api/PostController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePostRequest;
use App\Http\Resources\PostResource;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PostController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $posts = Post::query()
            ->with('user')
            ->withCount('comments')
            ->filter($request->query('filter', []))
            ->sort($request->query('sort'))
            ->paginate(min($request->integer('per_page', 15), 100));

        return PostResource::collection($posts);
    }

    public function store(StorePostRequest $request): PostResource
    {
        $post = $request->user()->posts()->create($request->validated());

        return PostResource::make($post)->additional(['message' => 'Post created.']);
    }

    public function show(Post $post): PostResource
    {
        $post->load('user')->loadCount('comments');

        return PostResource::make($post);
    }

    public function update(UpdatePostRequest $request, Post $post): PostResource
    {
        $this->authorize('update', $post);

        $post->update($request->validated());

        return PostResource::make($post->load('user'));
    }

    public function destroy(Post $post): \Illuminate\Http\Response
    {
        $this->authorize('delete', $post);

        $post->delete();

        return response()->noContent();
    }
}
```

Add the Form Request with rules that mirror the contract, and register policies (`php artisan make:policy PostPolicy --model=Post`) so updates and deletes are authorization-checked.

### Step 5: Register Middleware for ETags and Idempotency

Create the two middlewares from the Best Practices section, register the ETag middleware in the API group, and attach idempotency to write routes:

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware) {
    $middleware->api(prepend: [
        App\Http\Middleware\AddEtag::class,
    ]);
})
```

```php
// routes/api/v1.php
Route::middleware(['auth:sanctum', 'throttle:api', App\Http\Middleware\Idempotency::class])
    ->group(function () {
        Route::apiResource('posts', PostController::class)->except(['edit', 'create']);
    });
```

Test idempotency manually before moving on: send the same `POST` with the same `Idempotency-Key` twice and confirm the second call returns the stored response instead of inserting a second row.

### Step 6: Wire Up the Rate Limiters and Error Envelope

Register the `api` and `auth` rate limiters from the Best Practices section in `AppServiceProvider::boot()`, and add the `renderable` closures for validation and authentication exceptions in `bootstrap/app.php`. Verify the behavior:

```bash
php artisan tinker
# POST /api/v1/login five times with wrong credentials -> expect 429 on the sixth
# POST /api/v1/posts with invalid payload -> expect the {"error": {...}} envelope, not HTML
```

Confirm that `config/cache.php` uses the Redis or database driver in production (`CACHE_STORE=redis`) so rate-limit counters and idempotency keys survive across web servers and process restarts.

### Step 7: Generate and Publish OpenAPI Docs

Install Scribe, annotate the controllers, and generate the documentation:

```bash
composer require knuckleswtf/scribe --dev
php artisan scribe:generate
```

Add the `@queryParam`, `@response`, and `@responseField` annotations to `PostController` (see the Best Practices section for the `index` example), then regenerate and review the output for the versioned routes. Commit the generated docs directory or configure the package to publish docs to a protected route, and link it from the API root (`GET /` returning a JSON pointer to the docs is a nice touch for discoverability).

### Step 8: Lock the Contract with Feature Tests

Write the contract tests from the Best Practices section, plus tests for filtering, sorting, pagination caps, idempotency replay, rate limiting, and the error envelope:

```bash
php artisan test --filter=PostApiTest
```

```php
public function test_filter_and_sort_are_applied(): void
{
    Post::factory()->create(['title' => 'Zebra', 'status' => 'draft']);
    Post::factory()->create(['title' => 'Apple', 'status' => 'published']);

    $this->getJson('/api/v1/posts?filter[status]=published&sort=-created_at')
        ->assertOk()
        ->assertJsonPath('data.0.title', 'Apple')
        ->assertJsonCount(1, 'data');
}

public function test_idempotency_key_replays_response(): void
{
    $this->actingAs(User::factory()->create(), 'sanctum');
    $payload = ['title' => 'First', 'excerpt' => 'E', 'body' => 'B', 'status' => 'draft'];

    $first = $this->postJson('/api/v1/posts', $payload, ['Idempotency-Key' => 'key-123']);
    $second = $this->postJson('/api/v1/posts', $payload, ['Idempotency-Key' => 'key-123']);

    $first->assertStatus(201);
    $second->assertStatus(201);
    $this->assertSame($first->json(), $second->json());
}
```

Run the full suite (`php artisan test`), fix anything that fails, and commit. The API now ships with versioning, a stable response shape, consistent errors, throttling, idempotent writes, documented endpoints, and a test suite that treats the contract as a first-class citizen — ready for the first consumer to integrate against.

---
title: "Advanced Eloquent ORM Cheat Sheet"
description: "A deep-dive quick reference for advanced Laravel Eloquent ORM: subqueries, advanced relationships, eager loading strategies, transactions and locking, custom casts, observers, collections, factories, and performance guards."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Advanced Eloquent ORM Cheat Sheet

## Quick Reference Table

| Task | Eloquent / Artisan Code | Notes |
|------|-------------------------|-------|
| Eager load with constraint | `Post::with(['comments' => fn ($q) => $q->where('approved', true)])->get()` | Filters related models during the load |
| Count related models | `Post::withCount('comments')->get()` | Adds a `comments_count` attribute |
| Bulk upsert | `User::upsert($rows, ['email'], ['name'])` | Insert new rows, update existing by unique key |
| Pessimistic lock | `DB::transaction(fn () => Account::whereKey($id)->lockForUpdate()->first())` | Row lock held until the transaction commits |
| Subquery in select | `User::addSelect(['last_post_at' => Post::selectRaw('MAX(created_at)')->whereColumn('user_id', 'users.id')])` | Adds a derived column per row |
| Polymorphic relation | `$post->comments()->create([...])` | `MorphMany` relation on a shared table |
| Sync pivot with data | `$user->roles()->sync([1 => ['expires_at' => now()]])` | Sync many-to-many with extra pivot fields |
| Find or create | `User::firstOrCreate(['email' => $email], ['name' => $name])` | Avoids duplicate rows |
| Custom cast | `protected $casts = ['payload' => PayloadCast::class]` | Implements `CastsAttributes` |
| Prevent lazy loading | `Model::preventLazyLoading(! app()->isProduction())` | Throws an exception in development |
| One-of-many relation | `$post->latestComment` via `latestOfMany()` | Latest related model per parent |
| Generate full model set | `php artisan make:model Post --all` | Model, migration, factory, seeder, policy |

## Common Commands

### Model and Migration Generation

```bash
# Model with migration, factory, and seeder
php artisan make:model Post -m -f -s

# Model with every generator (migration, factory, seeder, policy, controller)
php artisan make:model Post --all

# Generate a model observer
php artisan make:observer PostObserver

# Generate a custom cast class
php artisan make:cast LowercaseCast

# Generate a factory bound to a model
php artisan make:factory PostFactory --model=Post

# Generate a custom pivot model
php artisan make:model Membership --pivot
```

### Eloquent Inspector Commands

```bash
# Inspect a model: attributes, casts, relationships, scopes
php artisan model:show User

# Show database and table details
php artisan db:show
php artisan db:table users

# Interactive REPL for experimenting with Eloquent
php artisan tinker

# List registered model events and observers
php artisan event:list --event="eloquent*"
```

## Code Snippets

### Advanced Query Building

```php
use Illuminate\Database\Eloquent\Builder;

class Post extends Model
{
    // Local scope with parameters
    public function scopeOfAuthor(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }
}

Post::ofAuthor(42)->get();

// Add a global scope at runtime
Post::addGlobalScope('published', fn (Builder $q) => $q->whereNotNull('published_at'));

// Bypass a global scope for one query
Post::withoutGlobalScope('published')->get();

// Constrain by the existence of related models
User::whereHas('posts', fn (Builder $q) => $q->where('published', true))->get();
User::whereDoesntHave('roles', fn (Builder $q) => $q->where('name', 'admin'))->get();

// whereIn backed by a subquery
Post::whereIn('user_id', User::where('is_active', true)->select('id'))->get();

// Chained constraints inside orWhere groups
Post::where('status', 'draft')
    ->orWhere(function (Builder $q) {
        $q->where('status', 'review')->where('priority', 'high');
    })
    ->get();
```

### Subqueries and Exists

```php
use Illuminate\Support\Facades\DB;

// Derived column: latest post date per user
$users = User::addSelect([
    'last_post_at' => Post::selectRaw('MAX(created_at)')
        ->whereColumn('user_id', 'users.id'),
])->get();

// Order by a subquery result
$users = User::orderByDesc(
    Post::select('created_at')
        ->whereColumn('user_id', 'users.id')
        ->latest()
        ->limit(1)
)->get();

// whereExists with a raw clause
$users = User::whereExists(function ($query) {
    $query->select(DB::raw(1))
        ->from('posts')
        ->whereColumn('posts.user_id', 'users.id')
        ->where('posts.published', true);
})->get();

// JSON path queries (PostgreSQL and MySQL)
$users = User::where('meta->is_premium', true)->get();

// Union of two queries
$recent = Post::where('created_at', '>=', now()->subWeek());
$featured = Post::where('is_featured', true)
    ->union($recent)
    ->orderByDesc('created_at')
    ->get();
```

### Advanced Relationships

```php
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Country extends Model
{
    // Has-many-through: countries -> users -> posts
    public function posts(): HasManyThrough
    {
        return $this->hasManyThrough(Post::class, User::class);
    }

    // One-to-one through with the latest related row
    public function latestPost(): HasOneThrough
    {
        return $this->hasOneThrough(Post::class, User::class)->latestOfMany();
    }
}

class Comment extends Model
{
    // Polymorphic owner (Post or Video)
    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }
}

class Post extends Model
{
    // Polymorphic one-to-many
    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    // Many-to-many polymorphic (shared tags table)
    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    // One-of-many: the most recent comment per post
    public function latestComment(): HasOne
    {
        return $this->hasOne(Comment::class)->latestOfMany();
    }
}

// Attach a polymorphic relation
$post->comments()->create(['body' => 'Nice article!']);
```

### Many-to-Many Pivot Techniques

```php
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\Pivot;

class User extends Model
{
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)
            ->withPivot('expires_at', 'granted_by')
            ->withTimestamps()
            ->using(Membership::class); // custom pivot model
    }
}

// Attach, detach, and sync with pivot data
$user->roles()->attach($roleId, ['expires_at' => now()->addYear()]);
$user->roles()->detach($roleId);
$user->roles()->sync([1 => ['expires_at' => now()], 2 => ['expires_at' => null]]);
$user->roles()->syncWithoutDetaching([3]);
$user->roles()->toggle([1, 4]);

// Read pivot data from loaded relations
foreach ($user->roles as $role) {
    echo $role->pivot->expires_at;
}

// Update an existing pivot row
$user->roles()->updateExistingPivot($roleId, ['expires_at' => now()->addMonth()]);

// Custom pivot model adds domain logic
class Membership extends Pivot
{
    public function isActive(): bool
    {
        return $this->expires_at === null || $this->expires_at->isFuture();
    }
}
```

### Eager Loading Strategies

```php
// Nested and constrained eager loading
$posts = Post::with([
    'user' => fn ($q) => $q->select('id', 'name'),
    'comments.user',
    'tags' => fn ($q) => $q->where('active', true),
])->get();

// Lazy eager load after the collection is already in memory
$posts = Post::all();
$posts->load('comments.user');

// Load only the relations that are not loaded yet
$posts->loadMissing('author.profile');

// Prevent N+1 queries globally (throws in local development)
use Illuminate\Database\Eloquent\Model;

Model::preventLazyLoading(! app()->isProduction());

// Aggregates as columns on the parent model
Post::withCount('comments')->withExists('featuredImage')->get();
User::withSum('orders', 'total')->withAvg('reviews', 'rating')->get();

// Restrict a relation with whereHas and aggregate together
User::withCount(['posts' => fn ($q) => $q->where('published', true)])->get();
```

### Transactions and Locking

```php
use Illuminate\Support\Facades\DB;

// Closure transaction: commits on success, rolls back on exception
DB::transaction(function () {
    $order = Order::create($payload);
    $order->items()->createMany($items);
    Inventory::whereKey($productId)->decrement('stock', $qty);
}, 3); // retry up to 3 times on deadlock

// Manual transaction control
DB::beginTransaction();
try {
    // ... queries ...
    DB::commit();
} catch (Throwable $e) {
    DB::rollBack();
    throw $e;
}

// Pessimistic locking: SELECT ... FOR UPDATE
DB::transaction(fn () => Account::whereKey($id)->lockForUpdate()->first());

// Shared lock: SELECT ... LOCK IN SHARE MODE
DB::transaction(fn () => Product::whereKey($id)->sharedLock()->first());

// Optimistic locking using an incrementing version column
$product = Product::find($id);
$updated = $product->where('version', $product->version)
    ->update(['price' => 99, 'version' => $product->version + 1]);
// When $updated is 0 the row changed elsewhere: reload and retry

// Run a callback only after the surrounding transaction commits
DB::afterCommit(fn () => Cache::forget('product:' . $product->id));
```

### Upserts and Create-Or-Update Patterns

```php
// Bulk upsert: insert new rows, update existing ones by unique key
User::upsert(
    [
        ['email' => 'a@example.com', 'name' => 'A'],
        ['email' => 'b@example.com', 'name' => 'B'],
    ],
    ['email'], // unique columns used for conflict detection
    ['name']   // columns to update when a conflict occurs
);

// Insert only rows that do not already exist
User::insertOrIgnore([
    ['email' => 'c@example.com', 'name' => 'C'],
]);

// Find the first match, otherwise create it
$user = User::firstOrCreate(
    ['email' => $email],
    ['name' => $name, 'password' => bcrypt($password)]
);

// Find the first match, otherwise update it
$user = User::updateOrCreate(
    ['email' => $email],
    ['name' => $newName]
);

// Build the model without persisting, then save explicitly
$user = User::firstOrNew(['email' => $email]);
$user->name = $name;
$user->save();
```

### Custom Attribute Casts

```php
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;

// Store a decimal in the database, expose cents in the application
class MoneyCast implements CastsAttributes
{
    public function get($model, string $key, $value, array $attributes): int
    {
        return (int) round($value * 100);
    }

    public function set($model, string $key, $value, array $attributes): array
    {
        return [$key => round($value / 100, 2)];
    }
}

use Illuminate\Database\Eloquent\Casts\Attribute;

class Order extends Model
{
    protected $casts = [
        'total' => MoneyCast::class,
        'payload' => 'encrypted:array',   // encrypted at rest
        'meta' => AsCollection::class,
        'settings' => AsArrayObject::class,
    ];

    // Inbound-only cast via the Attribute API
    protected function password(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => bcrypt($value),
        );
    }
}
```

### Observers and Model Events

```php
use App\Observers\PostObserver;

// Register the observer in AppServiceProvider::boot()
Post::observe(PostObserver::class);

class PostObserver
{
    public function created(Post $post): void
    {
        Log::info('Post created', ['id' => $post->id]);
        Cache::forget('latest_posts');
    }

    public function updating(Post $post): void
    {
        if ($post->isDirty('slug')) {
            $post->slug = $post->slug . '-' . Str::random(4);
        }
    }

    public function deleted(Post $post): void { /* ... */ }
    public function restored(Post $post): void { /* ... */ }
    public function forceDeleted(Post $post): void { /* ... */ }
}

// Fire a model event manually
$post->fireModelEvent('created');

// Run a bulk operation without firing events
Post::withoutEvents(fn () => Post::query()->update(['status' => 'archived']));

// Check changed attributes during events
if ($post->wasChanged('title')) {
    // title changed during the last save
}
```

### Eloquent Collections

```php
use Illuminate\Support\Collection;

$posts = Post::where('published', true)->get();

$titles = $posts->map(fn (Post $post) => $post->title);
$grouped = $posts->groupBy('author_id');
$totalViews = $posts->sum('views');
$top = $posts->sortByDesc('views')->take(5)->values();
[$drafts, $published] = $posts->partition(fn (Post $post) => $post->status === 'draft');

// Reduce to a single value
$tags = $posts->reduce(
    fn (Collection $carry, Post $post) => $carry->merge($post->tags),
    collect()
)->unique('name');

// Keyset-style chunking that is safe against rows added mid-run
Post::orderBy('id')->chunkById(500, function ($chunk) {
    foreach ($chunk as $post) {
        // process each post
    }
});

// Stream rows with a generator to keep memory flat
foreach (Post::cursor() as $post) {
    // one model at a time
}
```

### Advanced Model Factories

```php
use Illuminate\Database\Eloquent\Factories\Factory;

class PostFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(6),
            'body' => fake()->paragraphs(3, true),
            'user_id' => User::factory(),
            'published_at' => now(),
        ];
    }

    // State: override a subset of attributes
    public function draft(): static
    {
        return $this->state(fn () => ['published_at' => null]);
    }

    // Sequence: cycle through values across created models
    public function priority(): static
    {
        return $this->sequence(
            ['priority' => 'low'],
            ['priority' => 'medium'],
            ['priority' => 'high'],
        );
    }
}

// Usage
Post::factory()->count(10)->draft()->create();
Post::factory()->count(3)->priority()->create();

// After-creating hook to build related models
Post::factory()
    ->afterCreating(function (Post $post) {
        $post->comments()->saveMany(Comment::factory()->count(3)->make());
    })
    ->create();

// Attach many-to-many relations inside a factory state
$user->roles()->attach(Role::factory()->count(2)->create());
```

### Performance Guards

```php
use Illuminate\Database\Eloquent\Model;

// Boot-time guards, usually in AppServiceProvider
Model::preventLazyLoading(! app()->isProduction());
Model::preventSilentlyDiscardingAttributes(! app()->isProduction());
Model::preventAccessingMissingAttributes(! app()->isProduction());

// Disable timestamps for a bulk write
Post::withoutTimestamps(fn () => Post::query()->update(['status' => 'archived']));

// Cache a query result for a duration
$posts = Cache::remember('published_posts', 3600, fn () =>
    Post::with('user')->where('published', true)->get()
);

// Select only the columns you need
$users = User::query()->select(['id', 'name'])->get();

// Keyset pagination stays fast on very large tables
$cursor = Post::orderBy('id')->cursorPaginate(25);
```

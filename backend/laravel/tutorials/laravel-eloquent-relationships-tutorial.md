---
title: "Laravel Eloquent Relationships Deep Dive"
description: "Master Eloquent relationships in Laravel: one-to-one, one-to-many, many-to-many with pivots, has-many-through, and polymorphic relations, plus eager loading and N+1 prevention."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Laravel Eloquent Relationships Deep Dive

## Summary

This tutorial covers every core Eloquent relationship type — `hasOne`/`belongsTo`, `hasMany`, `belongsToMany`, `hasManyThrough`, and polymorphic `morphMany`/`morphTo` — using a realistic blog domain with users, posts, comments, roles, and tags. You will learn to define relations, work with pivot tables, and eliminate the N+1 query problem with eager loading and `withCount`.

## Target Audience

- Backend developers who already build Laravel apps and query related data.
- Expected developer level: Intermediate to Advanced (comfortable with models, migrations, and query builders).

## Prerequisites

- Laravel 10 or 11 project with a configured database (SQLite or MySQL).
- Solid understanding of migrations, Eloquent models, and `php artisan tinker`.
- Familiarity with foreign keys, indexes, and basic SQL joins.

## Learning Objectives

By the end of this tutorial, you will be able to:
- Model one-to-one, one-to-many, and many-to-many relations with correct foreign key and pivot conventions.
- Define has-many-through and polymorphic relations and explain when each is appropriate.
- Write queries that eager load relations with `with()` and aggregation with `withCount()`.
- Detect and fix N+1 query problems in real code.

## Context and Motivation

Naive Eloquent code that loads relations inside a loop issues one query per row, which collapses under real traffic. A blog index page rendering 100 posts with authors, comments, roles, and tags can silently fire hundreds of queries. Understanding relationship mechanics — not just memorizing method names — lets you design schemas that stay fast as the domain grows and write queries that fetch everything you need in a handful of SQL statements.

## Core Content

### One-to-One: Profile → User

A `hasOne` relation means the foreign key lives on the *other* table. `User::hasOne(Profile::class)` expects a `user_id` column on `profiles`. The inverse, `Profile::belongsTo(User::class)`, points back to the owner. In Laravel 11+ the `HasOne` trait on `User` gives access to `$user->profile` automatically.

### One-to-Many: Post → Comments

`Post::hasMany(Comment::class)` stores `post_id` on `comments`. The inverse is `Comment::belongsTo(Post::class)`. This is the workhorse relation of most applications, and it is where N+1 bugs appear first, because listing a collection of posts and touching `->comments` in a `foreach` triggers a query per post.

### Many-to-Many: User ↔ Role, Post ↔ Tag

Both sides keep a foreign key in a pivot table. `belongsToMany(Role::class)` uses the conventional pivot `role_user` with columns `user_id` and `role_id`. You can customize the table name and columns with the second and third arguments, and add extra pivot columns such as `assigned_at` with `->withPivot('assigned_at')`. The inverse side uses the same definition.

### Has-Many-Through: Country → Posts via Users

`hasManyThrough` connects a distant relation across an intermediate model. `Country::hasManyThrough(Post::class, User::class)` reaches posts through the `users.country_id` column without joining the intermediate row into the result — useful for dashboards that aggregate data across two levels.

### Polymorphic: Comments on Posts and Videos

One `comments` table serving multiple parent types needs `commentable_type` and `commentable_id`. The parent defines `morphMany(Comment::class, 'commentable')`, and the comment defines `morphTo()` with the same relation name. The same pattern works for tags via `morphToMany`/`morphedByMany` when a tag can belong to posts and videos.

### Eager Loading and N+1 Prevention

Eager loading with `with(['comments', 'author'])` converts N+1 queries into one extra query per relation (plus joins for many-to-many and morph relations). Use lazy eager loading (`load()`) after a query, `loadMissing()` for conditional loading, and `withCount('comments')` to attach a `comments_count` column for badges and pagination without pulling full rows.

## Code Examples

### Migrations and models for the blog domain

```php
<?php
// database/migrations/2024_01_01_000000_create_blog_tables.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('bio')->nullable();
            $table->timestamps();
        });

        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('commentable'); // commentable_type + commentable_id
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('role_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->timestamp('assigned_at')->nullable();
            $table->unique(['user_id', 'role_id']);
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('taggables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->morphs('taggable');
            $table->unique(['tag_id', 'taggable_type', 'taggable_id']);
        });
    }
};
```

### Models with all relationship types

```php
<?php
// app/Models/User.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class User extends Model
{
    use HasFactory;

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)
            ->withPivot('assigned_at')
            ->withTimestamps();
    }

    public function tags(): BelongsToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
```

```php
<?php
// app/Models/Post.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Post extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'title', 'body'];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function tags(): BelongsToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
```

```php
<?php
// app/Models/Comment.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Comment extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'body'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }
}
```

### Eager loading, N+1 prevention, and withCount

```php
<?php
// app/Http/Controllers/PostController.php
namespace App\Http\Controllers;

use App\Models\Country;
use App\Models\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 20), 100));

        // One query for posts + 3 extra queries total, not 4 * N.
        $posts = Post::query()
            ->with(['author.profile', 'tags'])
            ->withCount(['comments' => fn ($q) => $q->whereNotNull('body')])
            ->paginate($perPage);

        return view('posts.index', ['posts' => $posts]);
    }

    public function show(Post $post)
    {
        // Lazy eager load only what this view needs.
        $post->loadMissing('comments.user', 'tags');

        return view('posts.show', ['post' => $post]);
    }

    public function countryReport(Country $country)
    {
        // Has-many-through: posts of all users in the country.
        $posts = $country->posts()
            ->with('author')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return view('reports.country', ['country' => $country, 'posts' => $posts]);
    }
}
```

### Detecting the N+1 problem

```bash
# Enable query logging in tinker and compare the query count.
php artisan tinker
```

```php
use Illuminate\Support\Facades\DB;
use App\Models\Post;

DB::enableQueryLog();
// Bad: 1 query for posts + 1 per post. 100 posts => 101 queries.
foreach (Post::all() as $post) {
    echo $post->author->name;
}
printf('Queries executed: %d', count(DB::getQueryLog()));

// Good: only 2 queries total.
foreach (Post::with('author')->get() as $post) {
    echo $post->author->name;
}
```

## Key Insights

- **Follow naming conventions**: `hasOne`/`hasMany` assume `{relation}_id` on the target table; a custom column requires the second argument, e.g. `belongsTo(User::class, 'author_id')`.
- **Always eager load collections**: any relation accessed inside a loop should be in `with()`, `load()`, or `loadMissing()` — the N+1 symptom is a query log that grows linearly with rows.
- **Pivot extras cost memory**: `withPivot()` only retrieves extra columns you actually render; adding many unused columns to every `belongsToMany` result bloats responses.
- **Morph indexes are mandatory**: polymorphic queries filter on `commentable_type` and `commentable_id`, so the compound index generated by `morphs()` is what keeps them fast at scale.
- **Aggregate instead of fetching**: use `withCount()`, `withSum()`, and `withAvg()` for badges and totals; loading entire collections just to count them wastes memory and bandwidth.
- **Use `whereHas` for filtered existence**: `Post::whereHas('comments', fn ($q) => $q->where('user_id', 42))` filters without fetching the related rows.

## Next Steps

- Learn model events and observers to keep related records in sync when parents change.
- Study query builder joins and subqueries for reports that eager loading cannot express.
- Review the repository's Laravel CRUD REST API and queue job processing tutorials for request lifecycle and background job patterns.

## Conclusion

You now understand every core Eloquent relationship type and the schema conventions behind them, and you can load complex graphs of related data efficiently. The decisive habit is checking query counts while developing: if the log grows with your data, eager loading is the fix. Practice by adding a polymorphic `likes` table to the blog and rendering a per-post like count with `withCount`.

---
title: "Cheat Sheet Eloquent ORM Lanjutan"
description: "Referensi cepat mendalam untuk Eloquent ORM Laravel tingkat lanjut: subkueri, relasi lanjutan, strategi eager loading, transaksi dan penguncian, cast khusus, observer, koleksi, factory, dan pengaman kinerja."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Eloquent ORM Lanjutan

## Tabel Referensi Cepat

| Tugas | Kode Eloquent / Artisan | Catatan |
|-------|-------------------------|---------|
| Eager load dengan batasan | `Post::with(['comments' => fn ($q) => $q->where('approved', true)])->get()` | Memfilter model terkait saat dimuat |
| Menghitung model terkait | `Post::withCount('comments')->get()` | Menambahkan atribut `comments_count` |
| Upsert massal | `User::upsert($rows, ['email'], ['name'])` | Sisipkan baris baru, perbarui yang ada berdasarkan kunci unik |
| Penguncian pesimistis | `DB::transaction(fn () => Account::whereKey($id)->lockForUpdate()->first())` | Kunci baris dipegang sampai transaksi commit |
| Subkueri di select | `User::addSelect(['last_post_at' => Post::selectRaw('MAX(created_at)')->whereColumn('user_id', 'users.id')])` | Menambahkan kolom turunan per baris |
| Relasi polimorfik | `$post->comments()->create([...])` | Relasi `MorphMany` pada tabel bersama |
| Sync pivot dengan data | `$user->roles()->sync([1 => ['expires_at' => now()]])` | Sinkronisasi many-to-many dengan kolom pivot tambahan |
| Temukan atau buat | `User::firstOrCreate(['email' => $email], ['name' => $name])` | Menghindari baris duplikat |
| Cast khusus | `protected $casts = ['payload' => PayloadCast::class]` | Mengimplementasikan `CastsAttributes` |
| Cegah lazy loading | `Model::preventLazyLoading(! app()->isProduction())` | Melempar exception saat pengembangan |
| Relasi one-of-many | `$post->latestComment` melalui `latestOfMany()` | Model terkait terbaru per induk |
| Buat set model lengkap | `php artisan make:model Post --all` | Model, migrasi, factory, seeder, policy |

## Perintah Umum

### Pembuatan Model dan Migrasi

```bash
# Model dengan migrasi, factory, dan seeder
php artisan make:model Post -m -f -s

# Model dengan semua generator (migrasi, factory, seeder, policy, controller)
php artisan make:model Post --all

# Membuat observer model
php artisan make:observer PostObserver

# Membuat kelas cast khusus
php artisan make:cast LowercaseCast

# Membuat factory yang terikat ke model
php artisan make:factory PostFactory --model=Post

# Membuat model pivot khusus
php artisan make:model Membership --pivot
```

### Perintah Inspeksi Eloquent

```bash
# Memeriksa model: atribut, cast, relasi, scope
php artisan model:show User

# Menampilkan detail database dan tabel
php artisan db:show
php artisan db:table users

# REPL interaktif untuk bereksperimen dengan Eloquent
php artisan tinker

# Mendaftar event dan observer model yang terdaftar
php artisan event:list --event="eloquent*"
```

## Potongan Kode

### Penyusunan Kueri Lanjutan

```php
use Illuminate\Database\Eloquent\Builder;

class Post extends Model
{
    // Local scope dengan parameter
    public function scopeOfAuthor(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }
}

Post::ofAuthor(42)->get();

// Menambahkan global scope saat runtime
Post::addGlobalScope('published', fn (Builder $q) => $q->whereNotNull('published_at'));

// Melewati global scope untuk satu kueri
Post::withoutGlobalScope('published')->get();

// Membatasi berdasarkan keberadaan model terkait
User::whereHas('posts', fn (Builder $q) => $q->where('published', true))->get();
User::whereDoesntHave('roles', fn (Builder $q) => $q->where('name', 'admin'))->get();

// whereIn yang didukung subkueri
Post::whereIn('user_id', User::where('is_active', true)->select('id'))->get();

// Rantai batasan di dalam grup orWhere
Post::where('status', 'draft')
    ->orWhere(function (Builder $q) {
        $q->where('status', 'review')->where('priority', 'high');
    })
    ->get();
```

### Subkueri dan Exists

```php
use Illuminate\Support\Facades\DB;

// Kolom turunan: tanggal posting terakhir per pengguna
$users = User::addSelect([
    'last_post_at' => Post::selectRaw('MAX(created_at)')
        ->whereColumn('user_id', 'users.id'),
])->get();

// Mengurutkan berdasarkan hasil subkueri
$users = User::orderByDesc(
    Post::select('created_at')
        ->whereColumn('user_id', 'users.id')
        ->latest()
        ->limit(1)
)->get();

// whereExists dengan klausa raw
$users = User::whereExists(function ($query) {
    $query->select(DB::raw(1))
        ->from('posts')
        ->whereColumn('posts.user_id', 'users.id')
        ->where('posts.published', true);
})->get();

// Kueri jalur JSON (PostgreSQL dan MySQL)
$users = User::where('meta->is_premium', true)->get();

// Gabungan dua kueri
$recent = Post::where('created_at', '>=', now()->subWeek());
$featured = Post::where('is_featured', true)
    ->union($recent)
    ->orderByDesc('created_at')
    ->get();
```

### Relasi Lanjutan

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

    // One-to-one through dengan baris terkait terbaru
    public function latestPost(): HasOneThrough
    {
        return $this->hasOneThrough(Post::class, User::class)->latestOfMany();
    }
}

class Comment extends Model
{
    // Pemilik polimorfik (Post atau Video)
    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }
}

class Post extends Model
{
    // One-to-many polimorfik
    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    // Many-to-many polimorfik (tabel tags bersama)
    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    // One-of-many: komentar terbaru per posting
    public function latestComment(): HasOne
    {
        return $this->hasOne(Comment::class)->latestOfMany();
    }
}

// Menyisipkan relasi polimorfik
$post->comments()->create(['body' => 'Artikel yang bagus!']);
```

### Teknik Pivot Many-to-Many

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
            ->using(Membership::class); // model pivot khusus
    }
}

// Attach, detach, dan sync dengan data pivot
$user->roles()->attach($roleId, ['expires_at' => now()->addYear()]);
$user->roles()->detach($roleId);
$user->roles()->sync([1 => ['expires_at' => now()], 2 => ['expires_at' => null]]);
$user->roles()->syncWithoutDetaching([3]);
$user->roles()->toggle([1, 4]);

// Membaca data pivot dari relasi yang sudah dimuat
foreach ($user->roles as $role) {
    echo $role->pivot->expires_at;
}

// Memperbarui baris pivot yang ada
$user->roles()->updateExistingPivot($roleId, ['expires_at' => now()->addMonth()]);

// Model pivot khusus menambahkan logika domain
class Membership extends Pivot
{
    public function isActive(): bool
    {
        return $this->expires_at === null || $this->expires_at->isFuture();
    }
}
```

### Strategi Eager Loading

```php
// Eager loading bertingkat dan dengan batasan
$posts = Post::with([
    'user' => fn ($q) => $q->select('id', 'name'),
    'comments.user',
    'tags' => fn ($q) => $q->where('active', true),
])->get();

// Eager load secara lambat setelah koleksi ada di memori
$posts = Post::all();
$posts->load('comments.user');

// Memuat hanya relasi yang belum dimuat
$posts->loadMissing('author.profile');

// Mencegah masalah N+1 secara global (melempar exception di pengembangan)
use Illuminate\Database\Eloquent\Model;

Model::preventLazyLoading(! app()->isProduction());

// Agregat sebagai kolom pada model induk
Post::withCount('comments')->withExists('featuredImage')->get();
User::withSum('orders', 'total')->withAvg('reviews', 'rating')->get();

// Membatasi relasi dengan whereHas sekaligus agregat
User::withCount(['posts' => fn ($q) => $q->where('published', true)])->get();
```

### Transaksi dan Penguncian (Locking)

```php
use Illuminate\Support\Facades\DB;

// Transaksi closure: commit saat sukses, rollback saat ada exception
DB::transaction(function () {
    $order = Order::create($payload);
    $order->items()->createMany($items);
    Inventory::whereKey($productId)->decrement('stock', $qty);
}, 3); // coba ulang hingga 3 kali saat deadlock

// Kontrol transaksi manual
DB::beginTransaction();
try {
    // ... kueri ...
    DB::commit();
} catch (Throwable $e) {
    DB::rollBack();
    throw $e;
}

// Penguncian pesimistis: SELECT ... FOR UPDATE
DB::transaction(fn () => Account::whereKey($id)->lockForUpdate()->first());

// Shared lock: SELECT ... LOCK IN SHARE MODE
DB::transaction(fn () => Product::whereKey($id)->sharedLock()->first());

// Penguncian optimistis menggunakan kolom version yang bertambah
$product = Product::find($id);
$updated = $product->where('version', $product->version)
    ->update(['price' => 99, 'version' => $product->version + 1]);
// Jika $updated bernilai 0, baris berubah di tempat lain: muat ulang dan coba lagi

// Menjalankan callback hanya setelah transaksi di sekitarnya commit
DB::afterCommit(fn () => Cache::forget('product:' . $product->id));
```

### Upsert dan Pola Buat-atau-Perbarui

```php
// Upsert massal: sisipkan baris baru, perbarui yang ada berdasarkan kunci unik
User::upsert(
    [
        ['email' => 'a@example.com', 'name' => 'A'],
        ['email' => 'b@example.com', 'name' => 'B'],
    ],
    ['email'], // kolom unik untuk deteksi konflik
    ['name']   // kolom yang diperbarui saat terjadi konflik
);

// Menyisipkan hanya baris yang belum ada
User::insertOrIgnore([
    ['email' => 'c@example.com', 'name' => 'C'],
]);

// Menemukan kecocokan pertama, jika tidak ada maka membuatnya
$user = User::firstOrCreate(
    ['email' => $email],
    ['name' => $name, 'password' => bcrypt($password)]
);

// Menemukan kecocokan pertama, jika tidak ada maka memperbaruinya
$user = User::updateOrCreate(
    ['email' => $email],
    ['name' => $newName]
);

// Membangun model tanpa menyimpan, lalu menyimpan secara eksplisit
$user = User::firstOrNew(['email' => $email]);
$user->name = $name;
$user->save();
```

### Cast Atribut Khusus

```php
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;

// Menyimpan desimal di database, menampilkan sen di aplikasi
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
        'payload' => 'encrypted:array',   // terenkripsi saat disimpan
        'meta' => AsCollection::class,
        'settings' => AsArrayObject::class,
    ];

    // Cast khusus inbound melalui API Attribute
    protected function password(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => bcrypt($value),
        );
    }
}
```

### Observer dan Event Model

```php
use App\Observers\PostObserver;

// Mendaftarkan observer di AppServiceProvider::boot()
Post::observe(PostObserver::class);

class PostObserver
{
    public function created(Post $post): void
    {
        Log::info('Posting dibuat', ['id' => $post->id]);
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

// Memicu event model secara manual
$post->fireModelEvent('created');

// Menjalankan operasi massal tanpa memicu event
Post::withoutEvents(fn () => Post::query()->update(['status' => 'archived']));

// Memeriksa atribut yang berubah selama event
if ($post->wasChanged('title')) {
    // judul berubah pada penyimpanan terakhir
}
```

### Koleksi Eloquent

```php
use Illuminate\Support\Collection;

$posts = Post::where('published', true)->get();

$titles = $posts->map(fn (Post $post) => $post->title);
$grouped = $posts->groupBy('author_id');
$totalViews = $posts->sum('views');
$top = $posts->sortByDesc('views')->take(5)->values();
[$drafts, $published] = $posts->partition(fn (Post $post) => $post->status === 'draft');

// Mereduksi menjadi satu nilai
$tags = $posts->reduce(
    fn (Collection $carry, Post $post) => $carry->merge($post->tags),
    collect()
)->unique('name');

// Pemotongan bergaya keyset yang aman terhadap baris baru di tengah proses
Post::orderBy('id')->chunkById(500, function ($chunk) {
    foreach ($chunk as $post) {
        // proses setiap posting
    }
});

// Mengalirkan baris dengan generator agar memori tetap rendah
foreach (Post::cursor() as $post) {
    // satu model pada satu waktu
}
```

### Factory Model Lanjutan

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

    // State: menimpa sebagian atribut
    public function draft(): static
    {
        return $this->state(fn () => ['published_at' => null]);
    }

    // Sequence: memutar nilai secara bergantian pada model yang dibuat
    public function priority(): static
    {
        return $this->sequence(
            ['priority' => 'low'],
            ['priority' => 'medium'],
            ['priority' => 'high'],
        );
    }
}

// Penggunaan
Post::factory()->count(10)->draft()->create();
Post::factory()->count(3)->priority()->create();

// Hook after-creating untuk membangun model terkait
Post::factory()
    ->afterCreating(function (Post $post) {
        $post->comments()->saveMany(Comment::factory()->count(3)->make());
    })
    ->create();

// Menyisipkan relasi many-to-many di dalam state factory
$user->roles()->attach(Role::factory()->count(2)->create());
```

### Pengaman Kinerja

```php
use Illuminate\Database\Eloquent\Model;

// Pengaman saat boot, biasanya di AppServiceProvider
Model::preventLazyLoading(! app()->isProduction());
Model::preventSilentlyDiscardingAttributes(! app()->isProduction());
Model::preventAccessingMissingAttributes(! app()->isProduction());

// Menonaktifkan timestamp untuk penulisan massal
Post::withoutTimestamps(fn () => Post::query()->update(['status' => 'archived']));

// Menyimpan hasil kueri ke cache untuk durasi tertentu
$posts = Cache::remember('published_posts', 3600, fn () =>
    Post::with('user')->where('published', true)->get()
);

// Memilih hanya kolom yang dibutuhkan
$users = User::query()->select(['id', 'name'])->get();

// Paginasi keyset tetap cepat pada tabel yang sangat besar
$cursor = Post::orderBy('id')->cursorPaginate(25);
```

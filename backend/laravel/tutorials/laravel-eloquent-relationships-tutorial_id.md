---
title: "Pembahasan Mendalam Relasi Eloquent Laravel"
description: "Kuasai relasi Eloquent di Laravel: one-to-one, one-to-many, many-to-many dengan pivot, has-many-through, relasi polimorfik, plus eager loading dan pencegahan masalah N+1."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Pembahasan Mendalam Relasi Eloquent Laravel

## Ringkasan

Tutorial ini membahas semua tipe relasi inti Eloquent — `hasOne`/`belongsTo`, `hasMany`, `belongsToMany`, `hasManyThrough`, serta polimorfik `morphMany`/`morphTo` — menggunakan domain blog yang realistis dengan pengguna, postingan, komentar, peran, dan tag. Anda akan belajar mendefinisikan relasi, bekerja dengan tabel pivot, dan menghilangkan masalah query N+1 menggunakan eager loading dan `withCount`.

## Target Audiens

- Backend developer yang sudah membangun aplikasi Laravel dan melakukan query data terkait.
- Ekspektasi tingkat kemampuan pembaca: Menengah hingga Mahir (nyaman dengan model, migrasi, dan query builder).

## Prasyarat

- Proyek Laravel 10 atau 11 dengan basis data yang sudah dikonfigurasi (SQLite atau MySQL).
- Pemahaman yang baik tentang migrasi, model Eloquent, dan `php artisan tinker`.
- Keakraban dengan foreign key, index, dan join SQL dasar.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Memodelkan relasi one-to-one, one-to-many, dan many-to-many dengan konvensi foreign key dan pivot yang benar.
- Mendefinisikan relasi has-many-through dan polimorfik serta menjelaskan kapan masing-masing tepat digunakan.
- Menulis query yang melakukan eager loading relasi dengan `with()` dan agregasi dengan `withCount()`.
- Mendeteksi dan memperbaiki masalah query N+1 pada kode nyata.

## Konteks dan Motivasi

Kode Eloquent naif yang memuat relasi di dalam perulangan mengeluarkan satu query per baris, dan ini ambruk saat trafik nyata datang. Halaman index blog yang merender 100 postingan lengkap dengan penulis, komentar, peran, dan tag bisa diam-diam memicu ratusan query. Memahami mekanika relasi — bukan sekadar menghafal nama method — memungkinkan Anda merancang skema yang tetap cepat saat domain berkembang dan menulis query yang mengambil semua yang dibutuhkan hanya dalam beberapa pernyataan SQL.

## Konten Inti

### One-to-One: Profil → User

Relasi `hasOne` berarti foreign key berada di tabel *lain*. `User::hasOne(Profile::class)` mengharapkan kolom `user_id` pada `profiles`. Kebalikannya, `Profile::belongsTo(User::class)`, menunjuk kembali ke pemiliknya. Di Laravel 11+ trait `HasOne` pada `User` memberikan akses `$user->profile` secara otomatis.

### One-to-Many: Postingan → Komentar

`Post::hasMany(Comment::class)` menyimpan `post_id` pada tabel `comments`. Kebalikannya adalah `Comment::belongsTo(Post::class)`. Ini relasi andalan sebagian besar aplikasi, dan tempat pertama bug N+1 muncul, karena menampilkan koleksi postingan lalu menyentuh `->comments` di dalam `foreach` memicu satu query per postingan.

### Many-to-Many: User ↔ Role, Postingan ↔ Tag

Kedua sisi menyimpan foreign key di tabel pivot. `belongsToMany(Role::class)` menggunakan pivot konvensional `role_user` dengan kolom `user_id` dan `role_id`. Anda dapat menyesuaikan nama tabel dan kolom lewat argumen kedua dan ketiga, serta menambahkan kolom pivot ekstra seperti `assigned_at` dengan `->withPivot('assigned_at')`. Sisi invers menggunakan definisi yang sama.

### Has-Many-Through: Negara → Postingan via User

`hasManyThrough` menghubungkan relasi jarak jauh melewati model perantara. `Country::hasManyThrough(Post::class, User::class)` mencapai postingan melalui kolom `users.country_id` tanpa menggabungkan baris perantara ke hasil — berguna untuk dashboard yang mengagregasi data lintas dua level.

### Polimorfik: Komentar pada Postingan dan Video

Satu tabel `comments` yang melayani banyak tipe induk membutuhkan `commentable_type` dan `commentable_id`. Induk mendefinisikan `morphMany(Comment::class, 'commentable')`, dan komentar mendefinisikan `morphTo()` dengan nama relasi yang sama. Pola yang sama berlaku untuk tag via `morphToMany`/`morphedByMany` saat sebuah tag bisa dimiliki postingan dan video.

### Eager Loading dan Pencegahan N+1

Eager loading dengan `with(['comments', 'author'])` mengubah query N+1 menjadi satu query ekstra per relasi (plus join untuk relasi many-to-many dan morph). Gunakan lazy eager loading (`load()`) setelah query, `loadMissing()` untuk pemuatan kondisional, dan `withCount('comments')` untuk menambahkan kolom `comments_count` demi badge dan paginasi tanpa menarik seluruh baris.

## Contoh Kode

### Migrasi dan model untuk domain blog

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

### Model dengan semua tipe relasi

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

### Eager loading, pencegahan N+1, dan withCount

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

        // Satu query untuk postingan + total 3 query tambahan, bukan 4 * N.
        $posts = Post::query()
            ->with(['author.profile', 'tags'])
            ->withCount(['comments' => fn ($q) => $q->whereNotNull('body')])
            ->paginate($perPage);

        return view('posts.index', ['posts' => $posts]);
    }

    public function show(Post $post)
    {
        // Lazy eager load hanya yang dibutuhkan view ini.
        $post->loadMissing('comments.user', 'tags');

        return view('posts.show', ['post' => $post]);
    }

    public function countryReport(Country $country)
    {
        // Has-many-through: postingan semua user di negara tersebut.
        $posts = $country->posts()
            ->with('author')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return view('reports.country', ['country' => $country, 'posts' => $posts]);
    }
}
```

### Mendeteksi masalah N+1

```bash
# Aktifkan query logging di tinker lalu bandingkan jumlah query.
php artisan tinker
```

```php
use Illuminate\Support\Facades\DB;
use App\Models\Post;

DB::enableQueryLog();
// Buruk: 1 query untuk postingan + 1 per postingan. 100 postingan => 101 query.
foreach (Post::all() as $post) {
    echo $post->author->name;
}
printf('Query tereksekusi: %d', count(DB::getQueryLog()));

// Bagus: hanya 2 query total.
foreach (Post::with('author')->get() as $post) {
    echo $post->author->name;
}
```

## Insight Penting

- **Ikuti konvensi penamaan**: `hasOne`/`hasMany` mengasumsikan `{nama_relasi}_id` pada tabel tujuan; kolom khusus membutuhkan argumen kedua, misalnya `belongsTo(User::class, 'author_id')`.
- **Selalu eager load untuk koleksi**: relasi apa pun yang diakses di dalam perulangan harus berada di `with()`, `load()`, atau `loadMissing()` — gejala N+1 adalah query log yang bertambah linear seiring baris data.
- **Ekstra pivot memakan memori**: `withPivot()` hanya mengambil kolom ekstra yang benar-benar dirender; menambahkan banyak kolom tak terpakai ke setiap hasil `belongsToMany` membengkakkan respons.
- **Index morph itu wajib**: query polimorfik memfilter berdasarkan `commentable_type` dan `commentable_id`, jadi index gabungan yang dihasilkan `morphs()` yang membuatnya tetap cepat dalam skala besar.
- **Agregasi, bukan mengambil data**: gunakan `withCount()`, `withSum()`, dan `withAvg()` untuk badge dan total; memuat seluruh koleksi hanya untuk menghitungnya membuang memori dan bandwidth.
- **Gunakan `whereHas` untuk keberadaan terfilter**: `Post::whereHas('comments', fn ($q) => $q->where('user_id', 42))` memfilter tanpa menarik baris terkait.

## Langkah Berikutnya

- Pelajari model events dan observer untuk menjaga catatan terkait tetap sinkron saat induk berubah.
- Pelajari join query builder dan subquery untuk laporan yang tidak bisa diekspresikan eager loading.
- Tinjau tutorial CRUD REST API dan pemrosesan job queue Laravel di repositori ini untuk pola siklus hidup request dan job latar belakang.

## Kesimpulan

Anda sekarang memahami setiap tipe relasi inti Eloquent beserta konvensi skema di baliknya, dan mampu memuat grafik data terkait yang kompleks secara efisien. Kebiasaan penentu adalah mengecek jumlah query saat pengembangan: jika log bertambah seiring data Anda, eager loading adalah solusinya. Latih dengan menambahkan tabel polimorfik `likes` ke blog dan merender jumlah like per postingan dengan `withCount`.

---
title: "Cheat Sheet Laravel"
description: "Panduan referensi cepat untuk perintah Laravel, routing, Eloquent, Blade, Artisan, middleware, validasi, dan perintah konfigurasi."
category: "backend"
technology: "laravel"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Laravel

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Buat proyek | `composer create-project laravel/laravel nama-aplikasi` | Membuat aplikasi Laravel baru |
| Jalankan server | `php artisan serve` | Memulai server development di port 8000 |
| Jalankan migrasi | `php artisan migrate` | Mengeksekusi semua migrasi yang tertunda |
| Buat model | `php artisan make:model NamaModel -m` | Membuat model dengan file migrasi |
| Buat controller | `php artisan make:controller NamaController --resource` | Membuat resource controller |
| Lihat route | `php artisan route:list` | Menampilkan semua route yang terdaftar |
| Jalankan tes | `php artisan test` | Mengeksekusi rangkaian tes PHPUnit |
| Hapus cache | `php artisan cache:clear` | Membersihkan cache aplikasi |
| Buat seeder | `php artisan make:seeder NamaSeeder` | Membuat kelas seeder database baru |
| Jalankan seeder | `php artisan db:seed --class=NamaSeeder` | Mengisi database dengan data |

## Perintah Umum

### Artisan CLI

```bash
# Siklus Hidup Aplikasi
php artisan down                          # Masukkan aplikasi ke mode maintenance
php artisan up                            # Keluarkan aplikasi dari mode maintenance
php artisan optimize                      # Optimasi framework untuk performa lebih baik
php artisan optimize:clear                # Hapus file cache yang sudah dioptimasi

# Perintah Make (Generate)
php artisan make:model NamaModel -mfs     # Model + migration + factory + seeder
php artisan make:controller NamaController --api --model=NamaModel
php artisan make:request StoreRequest     # Kelas validasi Form Request
php artisan make:mail KonfirmasiPesanan   # Kelas Mail
php artisan make:job ProsesPodcast        # Kelas Job untuk queue
php artisan make:event PenggunaTerdaftar  # Kelas Event
php artisan make:listener KirimEmailSelamatDatang --event=PenggunaTerdaftar
php artisan make:notification TagihanDibayar # Kelas Notification
php artisan make:rule HurufBesar          # Aturan validasi kustom
php artisan make:policy PostPolicy        # Policy otorisasi
php artisan make:scope ActiveScope        # Query scope Eloquent
php artisan make:command KirimEmail       # Perintah Artisan kustom
php artisan make:factory ModelFactory     # Factory model
php artisan make:test FiturTest           # Kelas tes PHPUnit
php artisan make:channel OrderChannel     # Channel broadcasting
php artisan make:component Alert          # Komponen Blade
php artisan make:observer UserObserver    # Observer model
php artisan make:middleware PastikanAdmin # Middleware HTTP

# Database & Migrasi
php artisan migrate:status                # Tampilkan status migrasi
php artisan migrate:rollback              # Kembalikan batch migrasi terakhir
php artisan migrate:reset                 # Kembalikan semua migrasi
php artisan migrate:refresh               # Reset dan jalankan ulang semua migrasi
php artisan migrate:fresh                  # Hapus semua tabel dan jalankan ulang migrasi
php artisan make:migration create_posts_table
php artisan db:seed                       # Isi database dengan semua seeder
php artisan db:seed --class=UserSeeder    # Jalankan seeder tertentu
php artisan schema:dump                   # Dump skema database untuk version control
```

### Metode Routing

```php
// File: routes/web.php atau routes/api.php

// Route dasar dengan closure
Route::get('/users', function () { return response()->json(...); });

// Route ke method controller
Route::get('/users', [UserController::class, 'index']);

// Varian method HTTP
Route::get('/users', ...);
Route::post('/users', ...);
Route::put('/users/{id}', ...);
Route::patch('/users/{id}', ...);
Route::delete('/users/{id}', ...);
Route::options('/users', ...);

// Resourceful routing
Route::resource('posts', PostController::class);          // CRUD penuh (7 route)
Route::apiResource('posts', PostController::class);       // Hanya API (5 route)
Route::apiResources(['posts' => PostController::class]);  // Banyak resource

// Grup route
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('admin')->group(function () {
        Route::name('admin.')->group(function () {
            Route::get('/dashboard', [AdminController::class, 'dashboard']);
        });
    });
});

// Route model binding
Route::get('/posts/{post}', [PostController::class, 'show']);
// PostController menerima instance model Post yang sudah di-resolve

// Named route
Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');

// Route dengan parameter dan konstrain
Route::get('/posts/{slug}', [PostController::class, 'show'])->where('slug', '[a-z0-9-]+');

// Fallback route
Route::fallback(function () { return response()->json(['message' => 'Tidak Ditemukan'], 404); });
```

### Perintah Laravel Sail (Docker)

```bash
./vendor/bin/sail up -d                   # Mulai semua container Docker di mode detached
./vendor/bin/sail down                    # Hentikan semua container
./vendor/bin/sail artisan migrate         # Jalankan Artisan di dalam container
./vendor/bin/sail composer require pkg    # Instal paket Composer
./vendor/bin/sail npm install             # Instal dependensi NPM
./vendor/bin/sail npm run build           # Build aset frontend
./vendor/bin/sail test                    # Jalankan tes PHPUnit
./vendor/bin/sail shell                   # SSH ke dalam container
./vendor/bin/sail php --version           # Cek versi PHP di dalam container
./vendor/bin/sail mysql                   # Koneksi ke CLI MySQL
```

### Tinker (REPL)

```bash
php artisan tinker                        # Mulai PHP REPL interaktif

# Di dalam Tinker:
User::count();                            # Hitung semua pengguna
User::find(1);                            # Cari pengguna berdasarkan ID
$user = User::factory()->create();        # Buat pengguna via factory
$user->tasks()->create(['title' => '...']); # Buat model terkait
App\Models\Task::where('status', 'pending')->get(); # Query dengan kondisi
Cache::put('key', 'value', 3600);         # Set cache
Cache::get('key');                        # Ambil cache
```

## Potongan Kode

### Eloquent ORM

```php
// Definisi model
class Post extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['title', 'body', 'user_id', 'published_at'];
    protected $casts = ['published_at' => 'datetime', 'is_published' => 'boolean'];
    protected $appends = ['excerpt']; // Atribut yang dihasilkan accessor

    // Relasi
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

    // Global scope (di method booted)
    protected static function booted(): void {
        static::addGlobalScope('published', fn (Builder $q) => $q->whereNotNull('published_at'));
    }
}

// Contoh query
$posts = Post::with('user', 'comments')->published()->paginate(15);
$post = Post::findOrFail($id);
$post->update(['title' => 'Judul diperbarui']);
$post->delete(); // Soft delete jika trait SoftDeletes digunakan
$post->forceDelete(); // Hapus permanen
Post::onlyTrashed()->where('user_id', 1)->restore();
```

### Directive Blade

```blade
{{-- Pewarisan Template --}}
@extends('layouts.app')
@section('content')
@parent
@endsection

{{-- Struktur Kontrol --}}
@if (count($posts) > 0)
    <p>Terdapat {{ count($posts) }} postingan.</p>
@elseif (isset($noPosts))
    <p>Tidak ada postingan.</p>
@else
    <p>Memuat...</p>
@endif

@unless ($user->isAdmin())
    <p>Anda bukan admin.</p>
@endunless

@isset($posts)
    @foreach ($posts as $post)
        <div>{{ $post->title }}</div>
    @endforeach
@endisset

@forelse ($posts as $post)
    <li>{{ $post->title }}</li>
@empty
    <li>Belum ada postingan.</li>
@endforelse

{{-- Autentikasi --}}
@auth
    <p>Selamat datang, {{ Auth::user()->name }}</p>
@endauth
@guest
    <p>Silakan masuk.</p>
@endguest

{{-- CSRF & Method Spoofing --}}
@csrf
@method('PUT')

{{-- Error --}}
@error('title')
    <div class="alert alert-danger">{{ $message }}</div>
@enderror

{{-- Komponen --}}
<x-alert type="error" :message="$errorMessage"/>
@slot('title') Judul Alert @endslot

{{-- PHP Mentah --}}
@php
    $count = DB::table('posts')->count();
@endphp
```

### Aturan Validasi

```php
// Di Form Request atau controller
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

// Aturan validasi kustom
Validator::extend('huruf_besar', function ($attribute, $value, $parameters, $validator) {
    return strtoupper($value) === $value;
});

// Menggunakan objek Rule
use Illuminate\Validation\Rule;
'email' => ['required', Rule::unique('users', 'email')->ignore($userId)],
```

### Daftar Middleware

```php
// Middleware bawaan yang umum
'auth'          => \Illuminate\Auth\Middleware\Authenticate::class
'auth:sanctum'  => Autentikasi dengan token Sanctum
'guest'         => \Illuminate\Auth\Middleware\RedirectIfAuthenticated::class
'throttle:60,1' => Pembatasan rate (60 permintaan per menit)
'verified'      => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class
'cache.headers' => Setel header cache control
'bindings'      => Substitusi route model bindings

// Mendaftarkan middleware kustom (bootstrap/app.php)
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias(['role' => \App\Http\Middleware\CheckRole::class]);
    $middleware->api(prepend: [\Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class]);
    $middleware->priority([
        \Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests::class,
        \Illuminate\Cookie\Middleware\EncryptCookies::class,
    ]);
})
```

### Perintah Hapus dan Buat Cache

```bash
# Manajemen Cache
php artisan cache:clear                    # Hapus cache aplikasi
php artisan config:clear                   # Hapus file cache konfigurasi
php artisan config:cache                   # Buat cache konfigurasi untuk loading lebih cepat
php artisan route:clear                    # Hapus cache route
php artisan route:cache                    # Cache route untuk registrasi lebih cepat
php artisan view:clear                     # Hapus template Blade yang sudah dikompilasi
php artisan view:cache                     # Pre-compile semua template Blade
php artisan event:clear                    # Hapus semua event yang di-cache
php artisan event:list                     # Daftar semua event dan listener yang terdaftar
php artisan optimize:clear                 # Hapus semua file cache (config, route, view, events)
php artisan optimize                       # Cache config, route, dan events
php artisan queue:restart                  # Restart queue worker (setelah perubahan kode)
```

### Perintah Composer

```bash
composer create-project laravel/laravel nama-aplikasi ^11.0   # Buat proyek Laravel
composer require laravel/sanctum                          # Instal Sanctum
composer require laravel/horizon                          # Instal Horizon (monitoring queue)
composer require laravel/telescope --dev                  # Instal Telescope (debugging)
composer require laravel/breeze --dev                     # Instal Breeze (scaffolding auth)
composer require spatie/laravel-permission                # Instal izin Spatie
composer require barryvdh/laravel-debugbar --dev           # Debugbar untuk development
composer dump-autoload                                    # Regenerasi file autoload
composer update                                           # Perbarui semua dependensi
composer show --latest                                     # Tampilkan paket yang usang
```

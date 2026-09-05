---
title: "Cheat Sheet Penguatan Keamanan Laravel"
description: "Referensi cepat untuk mengamankan aplikasi Laravel di produksi — audit dependensi, rotasi kunci, header keamanan, pembatasan laju, kebijakan kata sandi kuat, mass assignment dan enkripsi, otorisasi berbasis policy, pertahanan SQL injection, penguatan upload, perlindungan SSRF, dan URL bertanda tangan."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Penguatan Keamanan Laravel

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Audit dependensi | `composer audit --locked` | Melaporkan CVE yang diketahui pada versi yang dikunci oleh `composer.lock` |
| Buat ulang kunci aplikasi | `php artisan key:generate --force` | Memutar `APP_KEY` setelah kebocoran atau pada deployment produksi baru |
| Hash kata sandi | `Hash::make($password)` | bcrypt dengan cost 12 secara default; jangan pernah menyimpan teks polos |
| Verifikasi kata sandi | `Hash::check($plain, $hash)` | Perbandingan waktu-konstan yang dipakai alur login |
| Terapkan kebijakan kata sandi | `Password::min(12)->letters()->mixedCase()->numbers()->symbols()` | Aturan kata sandi modern yang bisa dipakai di array validasi |
| Blokir mass assignment | `protected $guarded = ['id'];` | Fail-closed: hanya `id` yang dikecualikan dari mass assignment |
| Enkripsi saat tersimpan | `Crypt::encryptString($secret)` | Enkripsi kunci API dan token dengan kunci aplikasi |
| Jadikan kolom terenkripsi | `'token' => 'encrypted'` di `$casts` | Mengenkripsi/mendekripsi atribut model secara otomatis |
| Batasi laju sebuah rute | `->middleware('throttle:60,1')` | Mengizinkan 60 permintaan per menit per IP untuk rute tersebut |
| Definisikan limiter bernama | `RateLimiter::for('api', fn () => Limit::perMinute(60))` | Limit yang dapat dipakai ulang, didaftarkan di service provider |
| Otorisasi aksi controller | `$this->authorize('update', $post)` | Menjalankan pemeriksaan policy dan melempar error saat ditolak |
| Definisikan gate ad-hoc | `Gate::define('update-post', fn (User $u, Post $p) => $u->id === $p->user_id)` | Mengotorisasi aksi non-model atau pemeriksaan `@can` di Blade |
| Tambahkan token CSRF | `@csrf` di form Blade | Token tersembunyi yang diverifikasi middleware `ValidateCsrfToken` |
| Perketat cookie sesi | `'secure' => true`, `'same_site' => 'lax'` di `config/session.php` | Cookie hanya lewat HTTPS dan tidak pernah dikirim lintas-situs |
| Terapkan header keamanan | `->middleware(SecureHeaders::class)` | Middleware khusus yang mengirim CSP, HSTS, dan lainnya |
| Query tanpa injeksi | `DB::table('users')->where('email', $email)->first()` | Selalu ikat nilai melalui query builder |

## Perintah Umum

### Memeriksa Dependensi dan Lockfile

```bash
# Di dalam direktori aplikasi
cd /var/www/app

# Laporkan kerentanan yang diketahui dari versi di lockfile
composer audit --locked

# Tampilkan paket yang kedaluwarsa dan mungkin memuat perbaikan keamanan
composer outdated

# Audit yang sama di CI, dengan format machine-readable
composer audit --locked --format=plain
```

Jalankan `composer audit` di pipeline deployment dan gagalkan build saat exit code bukan nol — kerentanan yang masuk lewat pembaruan jauh lebih murah dicegah sebelum mencapai produksi.

### Memutar Ulang Kunci Aplikasi dan Cache Konfigurasi

```bash
# Buat APP_KEY baru (menonaktifkan data terenkripsi, URL bertanda tangan, dan sesi lama)
php artisan key:generate --force

# Cache konfigurasi, rute, dan view untuk produksi
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Lihat environment yang ter-resolve dan versi terpasang
php artisan about
```

Cache konfigurasi sekaligus memperkuat keamanan: setelah `php artisan config:cache`, pemanggilan `env()` di luar file config mengembalikan `null`, sehingga permintaan yang disusupi tidak bisa membaca `.env` lewat helper framework.

### Membuat Komponen Keamanan

```bash
# Middleware untuk header keamanan dan pemeriksaan per-rute
php artisan make:middleware SecureHeaders
php artisan make:middleware EnsureUserIsSubscribed

# Policy dengan scaffolding CRUD untuk sebuah model
php artisan make:policy PostPolicy --model=Post

# Form Request yang memusatkan aturan validasi
php artisan make:request StorePostRequest

# Tabel untuk driver sesi database
php artisan session:table
php artisan migrate
```

### Memeriksa Rute, Middleware, dan Lingkungan

```bash
# Tampilkan setiap rute beserta tumpukan middleware-nya
php artisan route:list -v

# Tampilkan versi framework, environment, dan status cache
php artisan about

# Konfirmasi status maintenance mode
php artisan down --secret=maintenance-token
php artisan up
```

## Potongan Kode

### Middleware Header Keamanan

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecureHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
        );

        return $response;
    }
}
```

Terapkan secara global di `bootstrap/app.php` (Laravel 11+) atau di array `$middleware` pada `app/Http/Kernel.php` (Laravel 10):

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->append(SecureHeaders::class);
})
```

Tambahkan `Strict-Transport-Security` hanya jika seluruh situs sudah HTTPS: `$response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');`. Untuk aplikasi yang mengutamakan API, atur kebijakan CORS yang permisif di `config/cors.php` alih-alih meniru header secara manual.

### Pembatasan Laju Rute dan Login

```php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

// di AppServiceProvider::boot
RateLimiter::for('api', fn () => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));
RateLimiter::for('login', fn () => Limit::perMinute(5)->by($request->ip()));
```

```php
// routes/api.php — pasang limiter bernama
Route::middleware('throttle:login')->post('/login', [AuthController::class, 'login']);

// routes/web.php — sintaks inline: jumlah maksimum per menit
Route::post('/contact', [ContactController::class, 'send'])->middleware('throttle:10,1');
```

Padukan limiter login dengan pengaman sesi di dalam controller:

```php
public function login(Request $request)
{
    $credentials = $request->validate([
        'email' => ['required', 'email'],
        'password' => ['required'],
    ]);

    if (! Auth::attempt($credentials, $request->boolean('remember'))) {
        throw ValidationException::withMessages([
            'email' => __('auth.failed'),
        ]);
    }

    $request->session()->regenerate(); // mencegah session fixation

    return redirect()->intended('/dashboard');
}
```

Selalu panggil `session()->regenerate()` setelah perubahan hak akses — ini menerbitkan ID sesi baru dan membuang ID yang mungkin dikuasai penyerang.

### Validasi Kata Sandi yang Kuat

```php
use Illuminate\Validation\Rules\Password;

public function rules(): array
{
    return [
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
        'password' => [
            'required',
            'confirmed',
            Password::min(12)
                ->letters()
                ->mixedCase()
                ->numbers()
                ->symbols()
                ->uncompromised(), // menolak kata sandi yang bocor di basis data pelanggaran
        ],
    ];
}
```

Aturan `uncompromised()` memeriksa kata sandi terhadap basis data pelanggaran yang diketahui dan menggagalkan validasi untuk nilai yang bocor. Untuk pengguna lama, minta autentikasi ulang sebelum perubahan sensitif (email, kata sandi, 2FA) dengan `Auth::logoutOtherDevices($password)`.

### Perlindungan Mass Assignment dan Penguatan Atribut

```php
class User extends Authenticatable
{
    // Fail-closed: semua kolom fillable kecuali id
    protected $guarded = ['id'];

    // Jangan pernah menyerialkan atribut ini ke JSON
    protected $hidden = ['password', 'remember_token'];

    // Jadikan kolom token API terenkripsi saat tersimpan
    protected $casts = [
        'email_verified_at' => 'datetime',
        'api_token' => 'encrypted',
    ];
}
```

Utamakan `$guarded` daripada daftar `$fillable` yang panjang: kolom baru otomatis diblokir dari mass assignment alih-alih diam-diam menjadi fillable. Saat pengembangan, panggil `Model::preventSilentlyDiscardingAttributes()` di service provider untuk mengungkap typo pada pemanggilan `fill()` sebagai exception.

### Enkripsi Data Tersimpan

```php
use Illuminate\Support\Facades\Crypt;

// Enkripsi kredensial API pihak ketiga sebelum disimpan
$encrypted = Crypt::encryptString($stripeSecretKey);

// Dekripsi hanya saat kredensial benar-benar dibutuhkan
$stripeSecretKey = Crypt::decryptString($user->stripe_secret);

// Dekripsi dengan pengaman — gagal cepat jika payload dirusak
try {
    $value = Crypt::decryptString($payload);
} catch (DecryptException $e) {
    report($e);
    abort(422, 'Payload terenkripsi tidak valid.');
}
```

Data terenkripsi terikat pada `APP_KEY`. Jika kunci diputar, nilai yang pernah dienkripsi tidak bisa lagi didekripsi — rencanakan jalur migrasi (dekripsi dengan kunci lama, enkripsi ulang dengan kunci baru) sebelum memutar kunci di lingkungan produksi.

### Otorisasi Berbasis Policy

```php
class PostPolicy
{
    public function update(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }

    public function delete(User $user, Post $post): bool
    {
        return $user->id === $post->user_id
            || $user->hasRole('moderator');
    }
}
```

```php
// Di dalam controller — melempar AuthorizationException saat ditolak
public function update(UpdatePostRequest $request, Post $post)
{
    $this->authorize('update', $post);

    $post->update($request->validated());

    return redirect()->route('posts.show', $post);
}
```

Daftarkan bypass admin global sekali, alih-alih mengulang pemeriksaan di setiap method:

```php
use Illuminate\Support\Facades\Gate;

// Di service provider
Gate::before(fn (User $user, string $ability) => $user->isSuperAdmin() ? true : null);
```

Di Blade, lindungi aksi UI dengan `@can('update', $post)` dan `@cannot` sehingga pengguna tanpa izin tidak pernah melihat tombol destruktif.

### Pertahanan SQL Injection

```php
use Illuminate\Support\Facades\DB;

// Aman — nilai diikat sebagai parameter
$users = DB::table('users')
    ->where('email', $email)
    ->where('active', true)
    ->get();

// Aman — Eloquent mengikat semua nilai untuk Anda
$posts = Post::where('author_id', $authorId)
    ->orderByDesc('published_at')
    ->paginate(20);
```

Fragmen SQL mentah adalah zona bahaya. Gunakan hanya jika bagian dinamisnya tidak bisa menjadi binding, dan jangan pernah menginterpolasi input pengguna:

```php
// TIDAK AMAN — $column berasal dari request
// $posts = DB::table('posts')->orderBy($request->input('sort'))->get();

// Aman — validasi dulu terhadap allowlist ketat
$sortable = ['title', 'published_at', 'views'];
$column = in_array($request->input('sort'), $sortable, true)
    ? $request->input('sort')
    : 'published_at';

$posts = DB::table('posts')->orderBy($column)->get();
```

Untuk pencarian teks, utamakan `whereLike()` dari query builder atau paket pencarian khusus daripada `whereRaw("title LIKE '%$q%'")` — setiap pemanggilan `DB::raw` / `whereRaw` adalah titik yang harus ditinjau manual.

### Penguatan Upload Berkas

```php
// Di Form Request
public function rules(): array
{
    return [
        'avatar' => [
            'required',
            'file',
            'image',          // memvalidasi konten gambar asli, bukan hanya ekstensi
            'mimes:jpg,jpeg,png,webp',
            'max:2048',       // kilobyte
        ],
    ];
}
```

```php
// Di controller — simpan dengan nama acak di disk privat
if ($request->hasFile('avatar')) {
    $path = $request->file('avatar')->store('avatars', 'private');

    $user->update(['avatar_path' => $path]);
}

// Layani berkas lewat controller, jangan pernah dari direktori public
public function avatar(User $user)
{
    abort_unless($user->id === auth()->id(), 403);

    return Storage::disk('private')->download($user->avatar_path);
}
```

Jangan percaya nama berkas dari klien: `store()` menghasilkan nama acak, yang menangkal path traversal dan spoofing ekstensi. Jangan pernah mengekspos berkas yang dikendalikan pengguna melalui symlink `storage/` publik.

### HTTP Keluar yang Tahan SSRF

```php
use Illuminate\Support\Facades\Http;

// Timeout + tidak mengikuti redirect otomatis + tanpa mem-bypass verifikasi TLS
$response = Http::timeout(5)
    ->withOptions(['allow_redirects' => false])
    ->get($url);

// Validasi host terhadap allowlist internal sebelum meminta
$allowedHosts = ['api.example.com', 'images.example.com'];
$host = parse_url($url, PHP_URL_HOST);

abort_unless(in_array($host, $allowedHosts, true), 422, 'Host tidak diizinkan.');

$data = $response->throw()->json();
```

Server-Side Request Forgery terjadi saat input pengguna menentukan URL tujuan: token seperti `http://169.254.169.254/latest/meta-data/` bisa menjangkau metadata cloud. Selalu validasi host, nonaktifkan redirect, dan pasang timeout pada panggilan keluar yang melibatkan URL dari pengguna.

### URL Bertanda Tangan untuk Tautan Anonim yang Kedaluwarsa

```php
use Illuminate\Support\Facades\URL;

// Buat tautan yang kedaluwarsa dalam 7 hari dan tidak bisa dipalsukan
$url = URL::temporarySignedRoute(
    'unsubscribe',
    now()->addDays(7),
    ['user' => $user->id]
);
```

```php
// Di controller — tolak tanda tangan yang kedaluwarsa atau dirusak
public function unsubscribe(Request $request)
{
    abort_unless($request->hasValidSignature(), 403);

    $user = User::findOrFail($request->query('user'));
    $user->update(['unsubscribed_at' => now()]);

    return view('emails.unsubscribed');
}
```

Pasang middleware `signed` pada rute dan putar `APP_KEY` setelah kebocoran: tanda tangan diturunkan dari kunci, sehingga rotasi menonaktifkan semua URL bertanda tangan yang masih berlaku.

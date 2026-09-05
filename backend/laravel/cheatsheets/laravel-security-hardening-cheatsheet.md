---
title: "Laravel Security Hardening Cheatsheet"
description: "A quick reference for securing Laravel applications in production — dependency auditing, key rotation, security headers, rate limiting, strong password policy, mass assignment and encryption, policy-based authorization, SQL injection defense, upload hardening, SSRF protection, and signed URLs."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Laravel Security Hardening Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Audit dependencies | `composer audit --locked` | Report known CVEs in the versions pinned by `composer.lock` |
| Regenerate the app key | `php artisan key:generate --force` | Rotate `APP_KEY` after a leak or on a fresh production deployment |
| Hash a password | `Hash::make($password)` | bcrypt with cost 12 by default; never store plaintext |
| Verify a password | `Hash::check($plain, $hash)` | Constant-time comparison used by the login flow |
| Enforce a password policy | `Password::min(12)->letters()->mixedCase()->numbers()->symbols()` | Modern password rules usable in validation arrays |
| Block mass assignment | `protected $guarded = ['id'];` | Fail-closed: only `id` is excluded from mass assignment |
| Encrypt at rest | `Crypt::encryptString($secret)` | Envelope-encrypt API keys and tokens with the app key |
| Cast a column encrypted | `'token' => 'encrypted'` in `$casts` | Automatically encrypt/decrypt a model attribute |
| Rate-limit a route | `->middleware('throttle:60,1')` | Allow 60 requests per minute per IP for the route |
| Define a named limiter | `RateLimiter::for('api', fn () => Limit::perMinute(60))` | Reusable limit registered in a service provider |
| Authorize a controller action | `$this->authorize('update', $post)` | Run the policy check and throw on denial |
| Define an ad-hoc gate | `Gate::define('update-post', fn (User $u, Post $p) => $u->id === $p->user_id)` | Authorize non-model actions or Blade `@can` checks |
| Add the CSRF token | `@csrf` in the Blade form | Hidden token verified by `ValidateCsrfToken` middleware |
| Harden the session cookie | `'secure' => true`, `'same_site' => 'lax'` in `config/session.php` | Cookie only over HTTPS and never sent cross-site |
| Apply security headers | `->middleware(SecureHeaders::class)` | Custom middleware emitting CSP, HSTS, and friends |
| Query without injection | `DB::table('users')->where('email', $email)->first()` | Always bind values through the query builder |

## Common Commands

### Auditing Dependencies and Lockfiles

```bash
# Inside the application directory
cd /var/www/app

# Report known vulnerabilities from the pinned lockfile versions
composer audit --locked

# List outdated packages that may contain security fixes
composer outdated

# The same audit in CI, machine-readable
composer audit --locked --format=plain
```

Run `composer audit` in the deployment pipeline and fail the build on a non-zero exit — a vulnerability introduced by an update is far cheaper to catch before it reaches production.

### Rotating the Application Key and Caching Configuration

```bash
# Generate a fresh APP_KEY (invalidates encrypted data, signed URLs, and sessions)
php artisan key:generate --force

# Cache configuration, routes, and views for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# See the resolved environment and installed version
php artisan about
```

Caching the configuration also hardens the app: after `php artisan config:cache`, calls to `env()` outside config files return `null`, which prevents a compromised request from reading `.env` through framework helpers.

### Generating Security Building Blocks

```bash
# Middleware for security headers and per-route checks
php artisan make:middleware SecureHeaders
php artisan make:middleware EnsureUserIsSubscribed

# Policy with CRUD scaffolding for a model
php artisan make:policy PostPolicy --model=Post

# Form Request that centralizes validation rules
php artisan make:request StorePostRequest

# Database session driver tables
php artisan session:table
php artisan migrate
```

### Inspecting Routes, Middleware, and Environment

```bash
# Show every route together with its middleware stack
php artisan route:list -v

# Display framework version, environment, and cache status
php artisan about

# Confirm the maintenance mode state
php artisan down --secret=maintenance-token
php artisan up
```

## Code Snippets

### Security Headers Middleware

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

Apply it globally in `bootstrap/app.php` (Laravel 11+) or in the `$middleware` array of `app/Http/Kernel.php` (Laravel 10):

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->append(SecureHeaders::class);
})
```

Add `Strict-Transport-Security` only when the whole site is HTTPS: `$response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');`. For API-first applications, set a permissive CORS policy via `config/cors.php` instead of duplicating headers manually.

### Rate Limiting Routes and Logins

```php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

// in AppServiceProvider::boot
RateLimiter::for('api', fn () => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));
RateLimiter::for('login', fn () => Limit::perMinute(5)->by($request->ip()));
```

```php
// routes/api.php — attach the named limiter
Route::middleware('throttle:login')->post('/login', [AuthController::class, 'login']);

// routes/web.php — inline limit syntax: max attempts per minute
Route::post('/contact', [ContactController::class, 'send'])->middleware('throttle:10,1');
```

Pair the login limiter with a session guard inside the controller:

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

    $request->session()->regenerate(); // prevent session fixation

    return redirect()->intended('/dashboard');
}
```

Always call `session()->regenerate()` after a privilege change — it issues a new session ID and discards any attacker-controlled one.

### Strong Password Validation

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
                ->uncompromised(), // rejects passwords seen in data breaches
        ],
    ];
}
```

The `uncompromised()` rule checks the password against known breach databases and fails validation for leaked values. For existing users, trigger re-authentication before any sensitive change (email, password, 2FA) with `Auth::logoutOtherDevices($password)`.

### Mass Assignment and Attribute Hardening

```php
class User extends Authenticatable
{
    // Fail-closed: everything is fillable except id
    protected $guarded = ['id'];

    // Never serialize these attributes to JSON
    protected $hidden = ['password', 'remember_token'];

    // Cast the API token column to encrypted-at-rest
    protected $casts = [
        'email_verified_at' => 'datetime',
        'api_token' => 'encrypted',
    ];
}
```

Prefer `$guarded` over a long `$fillable` list: a newly added column is blocked from mass assignment by default instead of silently becoming fillable. In development, call `Model::preventSilentlyDiscardingAttributes()` in a service provider to surface typos in `fill()` calls as exceptions.

### Encryption at Rest

```php
use Illuminate\Support\Facades\Crypt;

// Encrypt a third-party API credential before persisting it
$encrypted = Crypt::encryptString($stripeSecretKey);

// Decrypt only when the credential is actually needed
$stripeSecretKey = Crypt::decryptString($user->stripe_secret);

// Guarded decryption — fails fast if the payload is tampered with
try {
    $value = Crypt::decryptString($payload);
} catch (DecryptException $e) {
    report($e);
    abort(422, 'Invalid encrypted payload.');
}
```

Encrypted data is tied to `APP_KEY`. If the key is rotated, previously encrypted values can no longer be decrypted — plan a migration path (decrypt with the old key, re-encrypt with the new one) before rotating in a live environment.

### Policy-Based Authorization

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
// In the controller — throws AuthorizationException when denied
public function update(UpdatePostRequest $request, Post $post)
{
    $this->authorize('update', $post);

    $post->update($request->validated());

    return redirect()->route('posts.show', $post);
}
```

Register a global admin bypass once, instead of repeating the check in every method:

```php
use Illuminate\Support\Facades\Gate;

// In a service provider
Gate::before(fn (User $user, string $ability) => $user->isSuperAdmin() ? true : null);
```

In Blade, guard UI actions with `@can('update', $post)` and `@cannot` so unauthorized users never see destructive buttons.

### SQL Injection Defense

```php
use Illuminate\Support\Facades\DB;

// Safe — values are bound as parameters
$users = DB::table('users')
    ->where('email', $email)
    ->where('active', true)
    ->get();

// Safe — Eloquent binds everything for you
$posts = Post::where('author_id', $authorId)
    ->orderByDesc('published_at')
    ->paginate(20);
```

Raw SQL fragments are the danger zone. Only use them when the dynamic part cannot be a binding, and never interpolate user input:

```php
// UNSAFE — $column comes from a request
// $posts = DB::table('posts')->orderBy($request->input('sort'))->get();

// Safe — validate against a strict allowlist first
$sortable = ['title', 'published_at', 'views'];
$column = in_array($request->input('sort'), $sortable, true)
    ? $request->input('sort')
    : 'published_at';

$posts = DB::table('posts')->orderBy($column)->get();
```

For text search, prefer the query builder's `whereLike()` or a dedicated search package over `whereRaw("title LIKE '%$q%'")` — every `DB::raw` / `whereRaw` call is a manual review point.

### File Upload Hardening

```php
// In a Form Request
public function rules(): array
{
    return [
        'avatar' => [
            'required',
            'file',
            'image',          // validates the actual image content, not just the extension
            'mimes:jpg,jpeg,png,webp',
            'max:2048',       // kilobytes
        ],
    ];
}
```

```php
// In the controller — store with a generated name on a private disk
if ($request->hasFile('avatar')) {
    $path = $request->file('avatar')->store('avatars', 'private');

    $user->update(['avatar_path' => $path]);
}

// Serve the file through a controller, never from the public directory
public function avatar(User $user)
{
    abort_unless($user->id === auth()->id(), 403);

    return Storage::disk('private')->download($user->avatar_path);
}
```

Do not trust the client filename: `store()` generates a random name, which defeats path traversal and extension spoofing. Never expose a user-controlled file through a public `storage/` symlink.

### SSRF-Resistant Outbound HTTP

```php
use Illuminate\Support\Facades\Http;

// Timeout + no automatic redirect following + no TLS verification bypass
$response = Http::timeout(5)
    ->withOptions(['allow_redirects' => false])
    ->get($url);

// Validate the host against an internal allowlist before requesting
$allowedHosts = ['api.example.com', 'images.example.com'];
$host = parse_url($url, PHP_URL_HOST);

abort_unless(in_array($host, $allowedHosts, true), 422, 'Host not allowed.');

$data = $response->throw()->json();
```

Server-Side Request Forgery bites when user input chooses the target URL: a token like `http://169.254.169.254/latest/meta-data/` reaches cloud metadata. Always validate the host, disable redirects, and set timeouts on outbound calls that involve user-supplied URLs.

### Signed URLs for Expiring Anonymous Links

```php
use Illuminate\Support\Facades\URL;

// Generate a link that expires in 7 days and cannot be forged
$url = URL::temporarySignedRoute(
    'unsubscribe',
    now()->addDays(7),
    ['user' => $user->id]
);
```

```php
// In the controller — reject expired or tampered signatures
public function unsubscribe(Request $request)
{
    abort_unless($request->hasValidSignature(), 403);

    $user = User::findOrFail($request->query('user'));
    $user->update(['unsubscribed_at' => now()]);

    return view('emails.unsubscribed');
}
```

Keep the `signed` middleware on the route and rotate `APP_KEY` after a leak: signatures are derived from the key, so rotation invalidates every outstanding signed URL.

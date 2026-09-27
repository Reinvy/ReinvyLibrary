---
title: "Panduan Desain API Laravel"
description: "Panduan komprehensif untuk merancang REST API yang kokoh, berversi, dan mudah dipelihara dengan Laravel — mencakup pemodelan resource, konvensi URL, API Resources, filtering dan pagination, envelope error yang konsisten, rate limiting, idempotensi, conditional requests, autentikasi berbasis Sanctum, dokumentasi OpenAPI, dan pengujian API."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Desain API Laravel

## Pendahuluan

Laravel memudahkan pengembalian JSON dari sebuah controller, tetapi meluncurkan API publik yang nyaman dikonsumsi, stabil antar-rilis, dan aman untuk dicoba ulang membutuhkan desain yang disengaja. API yang dirancang dengan baik adalah sebuah kontrak: konsumen bergantung pada URL, bentuk respons, dan perilaku errornya, sehingga setiap perubahan setelah peluncuran berpotensi menjadi perubahan yang merusak (breaking change).

Panduan ini menyusun seperangkat konvensi yang koheren untuk membangun REST API kelas produksi dengan Laravel. Panduan ini mencakup cara memodelkan resource, membuat versi endpoint, membentuk respons dengan API Resources, menerapkan filtering, sorting, dan pagination, mengembalikan error yang konsisten, membatasi klien yang menyalahgunakan, mendukung retry yang idempoten, melakukan autentikasi dengan Sanctum, mendokumentasikan permukaan API dengan OpenAPI, dan mengunci seluruh kontrak dengan feature tests. Contoh yang digunakan adalah API blog kecil dengan post dan komentar, tipikal API pertama yang diluncurkan kebanyakan tim Laravel.

## Praktik Terbaik

### Memodelkan API di Sekitar Resource, Bukan Aksi

Rancang endpoint Anda di sekitar kata benda (resource) dan biarkan kata kerja HTTP yang menyatakan aksinya. Ini menjaga permukaan API tetap kecil, dapat diprediksi, dan mendokumentasikan dirinya sendiri. Rute bergaya aksi seperti `GET /api/v1/publish-post/42` sebaiknya dinyatakan sebagai perubahan status pada sebuah resource:

```text
GET    /api/v1/posts          -> daftar post
POST   /api/v1/posts          -> membuat post
GET    /api/v1/posts/{post}   -> menampilkan satu post
PUT    /api/v1/posts/{post}   -> pembaruan penuh
PATCH  /api/v1/posts/{post}   -> pembaruan sebagian
DELETE /api/v1/posts/{post}   -> menghapus post
```

Ketika sebuah operasi benar-benar bukan aksi CRUD pada sebuah resource (pencarian, publikasi, aksi massal), modelkan secara eksplisit:

- Jaga rute resource tetap bersih: `GET /api/v1/posts/search` bertabrakan dengan `GET /api/v1/posts/{post}` ketika `{post}` adalah parameter yang terikat route-model binding — Laravel akan menginterpretasikan `search` sebagai model. Lebih baik gunakan endpoint koleksi khusus seperti `GET /api/v1/search?type=posts&q=...` atau rute sub-resource yang tidak mungkin tertukar dengan identifier.
- Nyatakan transisi status sebagai pembaruan: publikasi menjadi `PATCH /api/v1/posts/{post}` dengan `{"status": "published"}` plus pemeriksaan policy.
- Cadangkan kata kerja aksi khusus untuk kasus langka di mana payload pembaruan akan menyesatkan (misalnya `POST /api/v1/posts/{post}/restore` untuk model yang soft-deleted).

Pemodelan resource yang konsisten juga membuat otorisasi menjadi mudah: satu policy per resource dapat mengatur semua kata kerja alih-alih menebar pemeriksaan izin di rute-rute ad-hoc.

### Gunakan Penamaan dan Konvensi URL yang Konsisten

Tetapkan konvensi sekali dan tegakkan di seluruh API:

- Gunakan **kebab-case** untuk segmen path URL (`GET /api/v1/post-comments/12`, bukan `get_post_comments`), sesuai konvensi Laravel sendiri.
- Gunakan **kata benda jamak** untuk endpoint koleksi: `/api/v1/posts`, jangan pernah `/api/v1/post`.
- Beri nama parameter rute sesuai model yang diikatnya: `{post}`, `{user}` — implicit route-model binding Laravel kemudian menyuntikkan model tanpa kode tambahan.
- Buat sub-resource bertingkat hanya jika konteks induk benar-benar diperlukan untuk mengidentifikasi anak (`GET /api/v1/posts/{post}/comments`). Hindari nested lebih dari dua tingkat; ID komentar bersifat unik global, sehingga `GET /api/v1/comments/{comment}` lebih sederhana bagi konsumen dan menghindari ambiguitas.
- Jangan pernah mengekspos detail implementasi internal: primary key dapat diterima untuk API internal kecil, tetapi API publik sebaiknya menggunakan UUID atau public ID (menambahkan kolom `uuid` dan binding pada kolom itu) sehingga Anda tidak membocorkan jumlah baris atau peluang enumerasi.

### Buat Versi API Sejak Hari Pertama

Bahkan API privat pun akan berubah. Versioning memberi ruang untuk mengembangkan kontrak tanpa merusak konsumen yang belum migrasi. Pilih satu strategi dan terapkan secara konsisten:

- **URI versioning** (`/api/v1/...`) adalah yang paling umum dan paling eksplisit: terlihat di log, cache, dan kode klien, serta mudah diimplementasikan dengan route groups. Ini default yang tepat untuk kebanyakan API Laravel.
- **Header versioning** (`Accept: application/vnd.myapp.v2+json`) menjaga URL tetap bersih tetapi menyembunyikan versi, sehingga debugging dan partisi cache-key menjadi lebih sulit.
- **Query-parameter versioning** (`?api_version=2`) mudah disalahgunakan (konsumen lupa menyertakannya) dan mengotori setiap URL.

Implementasikan URI versioning dengan route group, mendelegasikan setiap versi ke file rutenya sendiri agar versi lama dapat dipensiunkan secara independen:

```php
// routes/api.php
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(base_path('routes/api/v1.php'));
Route::prefix('v2')->group(base_path('routes/api/v2.php'));
```

Setiap file versi mendeklarasikan hanya rute versinya. Versi baru adalah file baru, dan versi lama dapat dihapus begitu jendela depresiasinya ditutup — bagian API lainnya tidak tersentuh. Aturan praktis disiplin versioning:

- Naikkan major version hanya untuk perubahan yang **merusak** (field diganti nama, endpoint dihapus, semantik berubah). Perubahan aditif — field baru, endpoint baru — berada dalam versi yang sedang berjalan.
- Pertahankan versi yang didepresiasi cukup lama agar konsumen sempat migrasi; umumkan depresiasi di dokumentasi API dan di header respons `Deprecation`.
- Sertakan timestamp yang sadar locale dan timezone sesuai format versi masing-masing, dan jangan pernah mengubah format secara diam-diam antar-versi.

### Bentuk Respons dengan API Resources

Laravel API Resources (`php artisan make:resource PostResource`) adalah alat terbaik untuk menjaga bentuk respons tetap stabil sementara model di baliknya berubah. Mereka memisahkan kontrak JSON dari skema basis data:

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

Gunakan `whenLoaded()` dan `whenCounted()` untuk menyertakan relasi dan agregat hanya ketika controller benar-benar memuatnya — ini menjaga indeks respons tetap kecil dan memungkinkan resource yang sama melayani endpoint daftar maupun detail. Bungkus koleksi dengan `PostResource::collection($posts)` agar envelope JSON (`data`, `meta`, `links`) tetap konsisten. Jangan pernah mengembalikan model Eloquent mentah dari controller: begitu bentuk model berubah, semua konsumen rusak sekaligus.

### Standarkan Filtering, Sorting, dan Pagination

Parameter kueri adalah bagian dari kontrak Anda. Tetapkan sekali dan gunakan konvensi yang sama di setiap endpoint koleksi:

- **Filtering**: gunakan sintaks bracket `filter[status]=published&filter[author]=7`, yang memetakan secara alami ke query scopes Eloquent dan tidak ambigu soal kolom sasaran.
- **Sorting**: gunakan `sort=title` untuk menaik dan `sort=-created_at` untuk menurun (tanda minus di depan adalah konvensi yang meluas). Selalu whitelist kolom yang boleh diurutkan — jangan pernah memasukkan parameter kueri mentah ke `orderBy()`.
- **Pagination**: default ke `paginate()` (berbasis halaman) untuk tabel bergaya admin dan `cursorPaginate()` untuk feed, karena cursor pagination tetap stabil ketika baris baru disisipkan di tengah pagination.

Enkapsulasi logika dalam local query scopes agar controller tetap ramping dan perilakunya dapat diuji secara terisolasi:

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

Untuk API yang besar, paket seperti `spatie/laravel-query-builder` memformalkan pola ini (termasuk `allowedIncludes` untuk eager loading), tetapi scopes di atas memenuhi sebagian besar kebutuhan tanpa dependensi tambahan.

### Validasi Input dan Kembalikan Envelope Error yang Konsisten

Letakkan aturan validasi di Form Requests — dapat digunakan ulang, dapat di-cache, dan menjaga controller tetap mudah dibaca. Yang lebih penting, tetapkan **satu** bentuk error JSON dan kembalikan untuk setiap kegagalan: error validasi, error model tidak ditemukan, kegagalan autentikasi, dan 500 tak terduga sekalipun. Envelope yang stabil memungkinkan konsumen menulis satu rutinitas parsing error alih-alih bercabang per endpoint:

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

Di Laravel 11+, daftarkan closure `renderable` di `bootstrap/app.php` agar envelope berlaku global:

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

Gunakan string `code` yang stabil dan dapat dibaca mesin (jangan pernah menyalin teks untuk pengguna) agar klien dapat bercabang berdasarkan kode, bukan pada teks pesan. Sertakan `details` hanya untuk kegagalan validasi, pertahankan struktur atas yang identik di semua status code, dan jangan pernah merender halaman error HTML untuk permintaan `api/*`.

### Terapkan Rate Limiting untuk Semua yang Publik

Rate limiting melindungi Anda dan konsumen Anda (batas yang terdokumentasi dengan baik memungkinkan klien merancang backoff dengan benar). Definisikan satu limiter bernama dan pasang di route group alih-alih mengulang batas per rute:

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

Gunakan `throttle:api` dengan cache driver Redis (`CACHE_STORE=redis`) agar batas terdistribusi di semua web server, dan kembalikan `429 Too Many Requests` standar dengan `Retry-After` sehingga klien tahu kapan harus mencoba lagi. Terapkan batas yang lebih ketat dan per-endpoint untuk operasi mahal (pencarian, impor massal) dan untuk endpoint tanpa autentikasi yang murah untuk disalahgunakan.

### Dukung Conditional Requests dengan ETag

Endpoint baca yang mengembalikan payload sama berulang kali membuang bandwidth. Header `ETag` memungkinkan klien mengirim `If-None-Match` dan menerima `304 Not Modified` kosong ketika tidak ada yang berubah. Middleware kecil yang diterapkan ke endpoint GET sudah cukup:

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

Daftarkan di grup middleware API dan kombinasikan dengan header `Cache-Control: public, max-age=...` untuk konten publik sungguhan. Perhatikan bahwa komputasi ETag tetap merender respons, jadi untuk payload yang sangat mahal lebih baik mengutamakan caching tingkat aplikasi (Redis) di depan middleware.

### Jadikan Mutasi Idempoten untuk Retry yang Aman

Konsumen mengulang permintaan setelah timeout dan kegagalan jaringan — jika percobaan pertama sebenarnya sukses, retry tidak boleh membuat resource duplikat. Solusi standarnya adalah header `Idempotency-Key`: klien membuat UUID per operasi logis, dan server memutar ulang respons tersimpan untuk kunci berulang alih-alih mengeksekusi mutasi dua kali.

Middleware ringkas mengimplementasikannya dengan cache:

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

Wajibkan header pada endpoint tulis (tolak dengan `400` ketika tidak ada), simpan hanya respons sukses (2xx-4xx) sehingga kegagalan sungguhan tetap dapat dicoba ulang, dan beri masa kedaluwarsa terbatas (24 jam adalah pilihan umum). Idempotensi membayar dirinya sendiri pertama kali klien melakukan double-charge atau double-order karena respons yang hilang.

### Rancang Autentikasi di Sekitar Token dengan Scope

Untuk klien seluler dan SPA pihak pertama, Laravel Sanctum adalah default yang seimbang: menerbitkan bearer token dengan **abilities** (scope) dan kedaluwarsa per token, serta mendukung autentikasi token dan sesi SPA dalam satu paket. Rancang model token seperti kontrak API:

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

Tegakkan abilities di rute atau controller:

```php
// routes/api/v1.php
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('posts', [PostController::class, 'index'])
        ->can('posts:read');
    Route::post('posts', [PostController::class, 'store'])
        ->can('posts:write');
});
```

Praktik terbaik untuk siklus hidup token:

- Terbitkan **kumpulan abilities terkecil** yang dibutuhkan setiap jenis klien; jangan pernah memberikan akses token yang serba-bisa.
- Tetapkan kedaluwarsa pendek dan sediakan alur refresh (`POST /api/v1/tokens/refresh` dengan refresh token bertanda tangan dan dapat dicabut) alih-alih menerbitkan token berumur panjang.
- Sediakan `POST /api/v1/logout` yang mencabut token saat itu juga di sisi server, dan cabut token dalam policy Anda ketika pengguna ditangguhkan.
- Kombinasikan pemeriksaan token dengan pemeriksaan **policy**: token membuktikan *siapa* Anda, policy memutuskan *apa* yang boleh Anda lakukan terhadap sebuah resource (`$this->authorize('update', $post)`).
- Selalu gunakan middleware `auth:sanctum` (`Authorization: Bearer <token>`), jangan pernah pemeriksaan placeholder di controller.

### Dokumentasikan Kontrak dengan OpenAPI

API yang tidak terdokumentasi adalah API yang sulit dipelihara: konsumen tidak dapat berintegrasi, dan tim tidak dapat menyadari ketika sebuah perubahan merusak kontrak yang terdokumentasi. Hasilkan dokumentasi OpenAPI dari kode itu sendiri agar tidak melenceng: `knuckleswtf/scribe` (atau `dedoc/scramble` untuk inferensi rute zero-config) menghasilkan dokumentasi interaktif dari controller, Form Requests, dan Resources Anda.

```bash
composer require knuckleswtf/scribe --dev
php artisan scribe:generate
```

Beri anotasi pada controller yang membutuhkan metadata eksplisit:

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

Publikasikan dokumentasi yang dihasilkan (atau tautannya) di tempat konsumen mencarinya, dan lindungi rute dokumentasi dengan autentikasi jika API-nya sendiri privat. Perlakukan bentuk respons yang terdokumentasi sebagai bagian kontrak: perubahan apa pun padanya adalah breaking change bagi konsumen yang mengandalkannya.

### Uji Permukaan API sebagai Kontrak

Feature tests adalah mekanisme penegakan untuk semua hal di atas. Uji API melalui permukaan HTTP-nya — bukan melalui class internal — sehingga pengujian pecah tepat ketika kontrak pecah:

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

Buat asersi struktur envelope (`assertJsonStructure`) alih-alih body persis agar perubahan aditif tidak memecahkan pengujian, tetapi buat asersi nilai persis untuk skenario yang mendefinisikan kontrak (filter, sorting, hitungan pagination, kode error). Jalankan pengujian di CI pada setiap pull request; kontrak test yang lulus secara lokal tetapi gagal di CI adalah gerbang deploy, bukan gangguan.

## Langkah Implementasi

Langkah-langkah di bawah mengubah praktik terbaik menjadi API blog berversi yang bekerja. Jalankan secara berurutan; setiap langkah meninggalkan API dalam keadaan lulus sehingga Anda dapat commit setelah setiap langkah.

### Langkah 1: Tetapkan Kontrak Resource

Tuliskan kontrak sebelum menulis kode apa pun — endpoint, kata kerja, field, status code, dan kode error untuk versi awal:

```text
Versi 1 (routes/api/v1.php)

POST   /api/v1/login                    -> 200 {token, expires_at} | 401 | 429
GET    /api/v1/posts                    -> 200 daftar | 401
POST   /api/v1/posts                    -> 201 dibuat | 422 | 401
GET    /api/v1/posts/{post}             -> 200 detail | 404 | 401
PATCH  /api/v1/posts/{post}             -> 200 diperbarui | 422 | 404 | 401
DELETE /api/v1/posts/{post}             -> 204 tanpa konten | 404 | 401
GET    /api/v1/posts/{post}/comments    -> 200 daftar | 404 | 401

Envelope error: {"error": {"code": string, "message": string, "details"?: object}}
Pagination: berbasis halaman, ?page= & per_page default 15, maksimal 100.
```

Dokumen ini menjadi sumber kebenaran untuk sisa implementasi — dan untuk dokumentasi OpenAPI yang dihasilkan di Langkah 7.

### Langkah 2: Siapkan Aplikasi dan Rute Berversi

Buat aplikasi Laravel baru (atau gunakan aplikasi yang sudah ada), tambahkan Sanctum, dan pisahkan rute berdasarkan versi:

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

Jalankan `php artisan route:list --path=api` setelah setiap perubahan rute untuk memastikan prefiks versi dan middleware diterapkan.

### Langkah 3: Bangun Model, Scopes, dan Resources

Tambahkan `uuid`, scope filtering, dan sorting ke model, kemudian buat API Resource:

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

### Langkah 4: Implementasikan Controller dengan Kueri Ber-scope

Controller tetap tipis — mengikat parameter kueri ke scope, menerapkan pagination, dan mengembalikan resources:

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

Tambahkan Form Request dengan aturan yang mencerminkan kontrak, dan daftarkan policy (`php artisan make:policy PostPolicy --model=Post`) sehingga pembaruan dan penghapusan diperiksa otorisasinya.

### Langkah 5: Daftarkan Middleware untuk ETag dan Idempotensi

Buat dua middleware dari bagian Praktik Terbaik, daftarkan middleware ETag di grup API, dan pasang idempotensi ke rute tulis:

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

Uji idempotensi secara manual sebelum melanjutkan: kirim `POST` yang sama dengan `Idempotency-Key` yang sama dua kali dan pastikan panggilan kedua mengembalikan respons tersimpan alih-alih menyisipkan baris kedua.

### Langkah 6: Pasang Rate Limiter dan Envelope Error

Daftarkan rate limiter `api` dan `auth` dari bagian Praktik Terbaik di `AppServiceProvider::boot()`, dan tambahkan closure `renderable` untuk exception validasi dan autentikasi di `bootstrap/app.php`. Verifikasi perilakunya:

```bash
php artisan tinker
# POST /api/v1/login lima kali dengan kredensial salah -> harapkan 429 pada percobaan keenam
# POST /api/v1/posts dengan payload tidak valid -> harapkan envelope {"error": {...}}, bukan HTML
```

Pastikan `config/cache.php` menggunakan driver Redis atau database di produksi (`CACHE_STORE=redis`) sehingga penghitung rate-limit dan kunci idempotensi bertahan di semua web server dan restart proses.

### Langkah 7: Hasilkan dan Publikasikan Dokumentasi OpenAPI

Instal Scribe, beri anotasi pada controller, dan hasilkan dokumentasi:

```bash
composer require knuckleswtf/scribe --dev
php artisan scribe:generate
```

Tambahkan anotasi `@queryParam`, `@response`, dan `@responseField` ke `PostController` (lihat contoh `index` di bagian Praktik Terbaik), lalu hasilkan ulang dan tinjau output untuk rute berversi. Commit direktori dokumentasi yang dihasilkan atau konfigurasikan paket untuk memublikasikan dokumentasi ke rute yang dilindungi, dan tautkan dari root API (`GET /` yang mengembalikan pointer JSON ke dokumentasi adalah sentuhan yang bagus untuk discoverability).

### Langkah 8: Kunci Kontrak dengan Feature Tests

Tulis kontrak test dari bagian Praktik Terbaik, plus pengujian untuk filtering, sorting, batas pagination, replay idempotensi, rate limiting, dan envelope error:

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

Jalankan seluruh rangkaian (`php artisan test`), perbaiki apa pun yang gagal, lalu commit. API kini hadir dengan versioning, bentuk respons yang stabil, error yang konsisten, throttling, tulis idempoten, endpoint terdokumentasi, dan rangkaian pengujian yang memperlakukan kontrak sebagai warga kelas satu — siap bagi konsumen pertama untuk berintegrasi.

---
title: "Tutorial CRUD REST API Laravel"
description: "Tutorial langkah demi langkah yang komprehensif tentang membangun RESTful API lengkap dengan Laravel, mencakup routing, Eloquent, autentikasi Sanctum, validasi, dan pengujian."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Tutorial CRUD REST API Laravel

## Ringkasan

Tutorial ini memandu Anda dalam membangun RESTful API yang fungsional untuk aplikasi Manajemen Tugas menggunakan Laravel. Anda akan mempelajari cara menyiapkan proyek Laravel, mendesain skema database dengan migrasi, mengimplementasikan resource controller, mengautentikasi permintaan API dengan Laravel Sanctum, memvalidasi input, menanam data uji, dan menulis pengujian otomatis dengan PHPUnit. Pada akhirnya, Anda akan memiliki JSON API yang siap produksi dengan autentikasi berbasis token yang aman dan operasi CRUD lengkap.

## Target Audiens

- Backend Developer dan Fullstack Developer yang ingin menguasai pengembangan API Laravel.
- Level menengah — diasumsikan sudah familiar dengan sintaks PHP, konsep OOP dasar, dan penggunaan command line.

## Prasyarat

- PHP 8.1+ terinstal secara lokal atau melalui Docker.
- Composer (PHP package manager) terinstal secara global.
- MySQL, PostgreSQL, atau SQLite tersedia untuk operasi database.
- Pemahaman dasar tentang prinsip desain RESTful API.
- Familiaritas dengan pola arsitektur MVC sangat membantu namun tidak diwajibkan.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membuat proyek Laravel baru menggunakan Composer atau Laravel Sail.
- Mendesain migrasi database dan model Eloquent dengan relasi.
- Mengimplementasikan resource controller dengan logika CRUD lengkap.
- Mengautentikasi permintaan API menggunakan autentikasi token Sanctum.
- Memvalidasi data permintaan dengan Form Requests.
- Menulis pengujian fitur PHPUnit untuk endpoint API.
- Menanam database dengan data uji realistis menggunakan seeder dan factory Laravel.

## Konteks dan Motivasi

RESTful API mendukung mayoritas aplikasi web dan mobile modern. Laravel, sebagai framework PHP paling populer, menyediakan lingkungan yang sangat produktif untuk membangun API ini berkat ORM yang ekspresif (Eloquent), sistem routing yang kuat, scaffolding autentikasi bawaan, dan alat pengujian yang ekstensif. Namun, banyak pengembang kesulitan merakit semua komponen ini menjadi API yang kohesif dan teruji dengan baik. Tutorial ini menjembatani kesenjangan tersebut dengan menyajikan alur kerja ujung-ke-ujung yang lengkap, mulai dari pembuatan proyek hingga API yang sudah dideploy, terautentikasi, dan teruji. Domain Manajemen Tugas dipilih karena secara alami mendemonstrasikan operasi CRUD, relasi pengguna-tugas, dan batasan autentikasi — pola yang langsung dapat diterapkan pada e-commerce, sistem manajemen konten, platform SaaS, dan hampir semua aplikasi berbasis data.

## Konten Inti

### Persiapan Proyek dengan Composer dan Sail

Laravel dapat diinstal baik langsung melalui Composer maupun melalui Laravel Sail, yang menyediakan lingkungan pengembangan berbasis Docker. Untuk tutorial ini, kita akan menggunakan metode instalasi Composer, yang bekerja secara identik di semua sistem operasi dengan PHP dan Composer terinstal.

```bash
composer create-project laravel/laravel task-manager-api
cd task-manager-api
```

Jika Anda lebih suka pengembangan berbasis Docker, Anda dapat menggunakan Sail sebagai gantinya:

```bash
curl -s "https://laravel.build/task-manager-api" | bash
cd task-manager-api
./vendor/bin/sail up -d
```

Setelah proyek dibuat, konfigurasikan file `.env` dengan kredensial database:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=task_manager
DB_USERNAME=root
DB_PASSWORD=
```

### Memahami Arsitektur MVC di Laravel

Laravel mengikuti pola Model-View-Controller, meskipun untuk pengembangan API, lapisan View digantikan oleh respons JSON. Siklus hidup permintaan yang khas adalah:

1. **Route** (`routes/api.php`) menerima permintaan HTTP dan memetakannya ke metode controller.
2. **Controller** (`app/Http/Controllers/`) menangani permintaan, mendelegasikan logika bisnis ke service atau model, dan mengembalikan respons.
3. **Model** (`app/Models/`) mewakili tabel database dan mengenkapsulasi akses data melalui Eloquent ORM.
4. **Migration** (`database/migrations/`) mendefinisikan skema database dengan cara yang terkontrol versi.

```text
HTTP Request → Route → Middleware → Controller → Model/Service → Response (JSON)
```

### Mendesain Database dengan Migrasi

Kita akan membangun API Manajemen Tugas dengan dua entitas inti: **Pengguna** dan **Tugas**. Setiap pengguna dapat memiliki banyak tugas, dan setiap tugas dimiliki oleh satu pengguna.

Buat migrasi tasks:

```bash
php artisan make:migration create_tasks_table
```

Edit file migrasi yang dihasilkan di `database/migrations/`:

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

Jalankan migrasi:

```bash
php artisan migrate
```

### Membuat Model Eloquent dan Relasi

Buat model Task dengan factory (untuk seeding):

```bash
php artisan make:model Task -f
```

Edit `app/Models/Task.php` untuk mendefinisikan relasi dengan User dan atribut fillable:

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

Perbarui model User yang sudah ada untuk menyertakan relasi invers:

```php
// app/Models/User.php (sebagian)
public function tasks()
{
    return $this->hasMany(Task::class);
}
```

### Menyiapkan Route — Web dan API

Laravel memisahkan rute web (dengan session dan view) dari rute API (stateless, JSON-only). Semua endpoint API akan didefinisikan di `routes/api.php`, yang dimuat oleh `ApiRouteServiceProvider` dan secara otomatis menambahkan prefiks `/api` ke semua rute.

```php
<?php

use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

// Rute publik
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Rute terproteksi (memerlukan autentikasi Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Resource controller untuk tasks
    Route::apiResource('tasks', TaskController::class);
});
```

Metode `apiResource` secara otomatis menghasilkan rute RESTful standar: `index`, `store`, `show`, `update`, `destroy`.

### Membangun Resource Controller

Buat controller:

```bash
php artisan make:controller Api/TaskController --api --model=Task
php artisan make:controller Api/AuthController
```

Flag `--api` mengecualikan metode `create` dan `edit`, yang hanya relevan untuk tampilan yang di-render oleh server.

Implementasikan AuthController:

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
                'email' => ['Kredensial yang diberikan tidak cocok dengan data kami.'],
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

        return response()->json(['message' => 'Berhasil keluar']);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('tasks'));
    }
}
```

Implementasikan TaskController dengan CRUD lengkap:

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
            return response()->json(['message' => 'Dilarang'], 403);
        }

        return response()->json($task->load('user'));
    }

    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        if ($request->user()->id !== $task->user_id) {
            return response()->json(['message' => 'Dilarang'], 403);
        }

        $task->update($request->validated());

        return response()->json($task);
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        if ($request->user()->id !== $task->user_id) {
            return response()->json(['message' => 'Dilarang'], 403);
        }

        $task->delete();

        return response()->json(null, 204);
    }
}
```

### Validasi Form dengan Form Requests

Form Request Laravel mengenkapsulasi logika validasi ke dalam kelas khusus, menjaga controller tetap bersih.

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
            'due_date.after_or_equal' => 'Tanggal jatuh tempo harus hari ini atau tanggal yang akan datang.',
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

### Autentikasi API dengan Laravel Sanctum

Laravel Sanctum menyediakan sistem autentikasi berbasis token ringan yang sempurna untuk API. Instal dan konfigurasikan:

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

Tambahkan middleware Sanctum ke rute API di `bootstrap/app.php` (atau `app/Http/Kernel.php` di versi Laravel lama):

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->api(prepend: [
        \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
    ]);
})
```

Trait `HasApiTokens` sudah termasuk dalam model `User` default di instalasi Laravel modern. Verifikasi keberadaannya:

```php
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
    // ...
}
```

### Penanaman Database dengan Factory

Factory Laravel menghasilkan data uji yang realistis. Sesuaikan factory Task:

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

Buat database seeder untuk mengisi data uji:

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
            'name' => 'Pengguna Uji',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        Task::factory()->count(30)->create([
            'user_id' => $user->id,
        ]);

        // Buat pengguna tambahan dengan tugas
        User::factory()->count(5)->create()->each(function ($user) {
            Task::factory()->count(10)->create(['user_id' => $user->id]);
        });
    }
}
```

Jalankan seeder:

```bash
php artisan db:seed
```

### Pengujian dengan PHPUnit

Laravel menggunakan PHPUnit untuk pengujian dengan helpers pengujian tambahan. Buat pengujian fitur untuk API:

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

    public function test_dapat_membuat_tugas(): void
    {
        $response = $this->withToken($this->token)
            ->postJson('/api/tasks', [
                'title' => 'Selesaikan laporan proyek',
                'description' => 'Selesaikan laporan triwulan sebelum Jumat',
                'status' => 'pending',
                'due_date' => '2025-12-31',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'title', 'status', 'created_at'])
            ->assertJson(['title' => 'Selesaikan laporan proyek']);

        $this->assertDatabaseHas('tasks', ['title' => 'Selesaikan laporan proyek']);
    }

    public function test_dapat_melihat_daftar_tugas(): void
    {
        Task::factory()->count(3)->create(['user_id' => $this->user->id]);

        $response = $this->withToken($this->token)
            ->getJson('/api/tasks');

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'meta', 'links'])
            ->assertJsonCount(3, 'data');
    }

    public function test_dapat_melihat_detail_tugas(): void
    {
        $task = Task::factory()->create(['user_id' => $this->user->id]);

        $response = $this->withToken($this->token)
            ->getJson("/api/tasks/{$task->id}");

        $response->assertStatus(200)
            ->assertJson(['id' => $task->id, 'title' => $task->title]);
    }

    public function test_dapat_memperbarui_tugas(): void
    {
        $task = Task::factory()->create([
            'user_id' => $this->user->id,
            'status' => 'pending',
        ]);

        $response = $this->withToken($this->token)
            ->putJson("/api/tasks/{$task->id}", [
                'title' => 'Judul diperbarui',
                'status' => 'in_progress',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'title' => 'Judul diperbarui',
                'status' => 'in_progress',
            ]);
    }

    public function test_dapat_menghapus_tugas(): void
    {
        $task = Task::factory()->create(['user_id' => $this->user->id]);

        $response = $this->withToken($this->token)
            ->deleteJson("/api/tasks/{$task->id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted($task);
    }

    public function test_pengguna_tidak_terautentikasi_tidak_dapat_mengakses_tugas(): void
    {
        $response = $this->getJson('/api/tasks');
        $response->assertStatus(401);
    }

    public function test_pengguna_tidak_dapat_mengakses_tugas_pengguna_lain(): void
    {
        $otherUser = User::factory()->create();
        $task = Task::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->withToken($this->token)
            ->getJson("/api/tasks/{$task->id}");

        $response->assertStatus(403);
    }
}
```

Jalankan pengujian:

```bash
php artisan test --filter=TaskApiTest
```

### Template Blade (Gambaran Umum)

Meskipun tutorial ini fokus pada pengembangan API, mesin template Blade Laravel layak disebutkan. Untuk aplikasi hybrid yang melayani API dan tampilan web, Blade menyediakan:

- Pewarisan template dengan `@extends` dan `@section`.
- Komponen dan slot untuk elemen UI yang dapat digunakan kembali.
- Directive seperti `@auth`, `@guest`, `@error` untuk rendering bersyarat.
- Tanpa overhead performa — Blade dikompilasi menjadi tampilan PHP yang di-cache.

```blade
{{-- resources/views/tasks/index.blade.php --}}
@extends('layouts.app')

@section('content')
    <div class="container">
        <h1>Tugas Saya</h1>
        
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

## Contoh Kode

Semua contoh kode lengkap terintegrasi di bagian Konten Inti di atas. File-file kunci yang perlu diperiksa:

- **Migration**: `database/migrations/xxxx_create_tasks_table.php`
- **Model**: `app/Models/Task.php` — Model Eloquent dengan atribut fillable, casts, dan relasi.
- **Controller**: `app/Http/Controllers/Api/TaskController.php` — CRUD lengkap dengan pemeriksaan otorisasi.
- **Auth Controller**: `app/Http/Controllers/Api/AuthController.php` — register, login, logout, profil pengguna.
- **Form Requests**: `app/Http/Requests/StoreTaskRequest.php` dan `UpdateTaskRequest.php`.
- **Factory**: `database/factories/TaskFactory.php` — menghasilkan data tugas yang realistis.
- **Test**: `tests/Feature/TaskApiTest.php` — rangkaian pengujian API yang komprehensif.

## Insight Penting

- **Resource controller** dengan `php artisan make:controller --api --model=` menghemat banyak boilerplate dengan mengikat route model binding secara otomatis dan menghasilkan metode stub untuk semua operasi CRUD.
- **Sanctum vs Passport**: Untuk sebagian besar API first-party (aplikasi mobile, SPA), Sanctum adalah pilihan yang direkomendasikan — lebih sederhana, lebih cepat, dan tidak memerlukan kompleksitas OAuth. Gunakan Passport hanya jika Anda memerlukan kemampuan server OAuth2 penuh untuk klien pihak ketiga.
- **Guard otorisasi**: Selalu verifikasi bahwa pengguna yang terautentikasi memiliki sumber daya yang mereka coba akses. Tutorial ini menggunakan perbandingan user_id sederhana, tetapi untuk aplikasi yang lebih besar, pertimbangkan menggunakan sistem Policy Laravel atau helper `$model->user()->is()`.
- **Soft deletes** memungkinkan pemulihan data dan mempertahankan integritas referensial. Gunakan trait `SoftDeletes` pada model di mana kehilangan data yang tidak disengaja memiliki dampak bisnis.
- **Pagination** sangat penting untuk API produksi. Metode `paginate()` Laravel mengembalikan respons terstruktur dengan `data`, `meta` (current_page, last_page, total), dan `links` (first, last, prev, next).

## Langkah Berikutnya

- Perdalam pemahaman Anda dengan menjelajahi **Laravel Policies** untuk otorisasi yang lebih terperinci.
- Pelajari cara menjadwalkan tugas berulang dengan **Laravel Task Scheduling** (ekspresi cron).
- Pelajari **Laravel Queues** (Horizon) untuk memproses pekerjaan berjalan lama secara asinkron.
- Ikuti **Panduan Praktik Terbaik Laravel** di repositori ini untuk pola deployment produksi.
- Jelajahi **Silabus Pengembangan Laravel** untuk membangun jalur pembelajaran terstruktur.

## Kesimpulan

Anda telah membangun RESTful API yang lengkap dan siap produksi dengan Laravel. API Manajemen Tugas ini mencakup registrasi dan autentikasi pengguna melalui Sanctum, operasi CRUD lengkap dengan Eloquent, validasi input melalui Form Requests, penanaman database dengan factory, dan pengujian otomatis dengan PHPUnit. Pola-pola ini membentuk fondasi untuk API Laravel berbasis data apa pun — dari mikrolayanan sederhana hingga platform SaaS yang kompleks.

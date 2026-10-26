---
title: "Membangun SaaS Multi-Tenant dengan Laravel"
description: "Bangun SaaS multi-tenant berbasis subdomain di Laravel: memilih antara database bersama dan database per tenant, menyelesaikan tenant di middleware, menegakkan scope dengan global scope, menjalankan migrasi tenant, serta menghubungkan billing langganan ke siklus hidup tenant."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun SaaS Multi-Tenant dengan Laravel

## Ringkasan

Tutorial ini membangun fondasi multi-tenant yang berjalan di Laravel: pelanggan mengakses aplikasi melalui `acme.yourapp.com`, setiap query otomatis dibatasi pada data pelanggan tersebut, dan tiap tenant memiliki status langganan sendiri. Anda akan mengimplementasikan middleware resolusi tenant, trait `BelongsToTenant` dengan global scope yang gagal tertutup, migrasi terisolasi, serta hook billing berbasis Cashier yang menangguhkan tenant ketika pembayaran gagal.

## Target Audiens

- Backend developer yang sudah pernah mengirim aplikasi Laravel ke produksi.
- Tim yang mengubah aplikasi satu pelanggan menjadi produk SaaS tanpa menulis ulang lapisan data.

## Prasyarat

- PHP 8.2+ dan Laravel 11 atau lebih baru (`composer create-project laravel/laravel`).
- PostgreSQL disarankan (MySQL cukup untuk pendekatan skema bersama) plus DNS wildcard untuk pengembangan lokal (`*.saas.test`), atau Laravel Herd/Valet yang menangani DNS untuk Anda.
- Pemahaman global scope Eloquent, middleware, dan queued listener.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Membandingkan isolasi skema bersama dan database per tenant lalu memilih yang sesuai kebutuhan produk.
- Menyelesaikan tenant dari subdomain dan mengikatnya ke container selama siklus request.
- Membatasi setiap model milik tenant secara otomatis, dengan jalur keluar eksplisit untuk pekerjaan admin.
- Melakukan provisioning tenant secara atomik, mengisolasi migrasinya, dan mengendalikan penangguhan dari event billing.

## Konteks dan Motivasi

Aplikasi Laravel satu tenant mengasumsikan satu pelanggan memiliki seluruh baris di setiap tabel. Begitu pelanggan kedua mendaftar, asumsi itu berubah menjadi kebocoran data: satu kondisi `where('user_id', ...)` yang terlewat di sebuah controller membuka invoice perusahaan lain — dan menambahkan tenancy belakangan menjadi mahal karena permukaan kebocoran tumbuh pada setiap query, laporan, dan background job baru. Tenancy karena itu adalah keputusan arsitektur, bukan fitur: ia menentukan skema, strategi migrasi, granularitas backup, dan model billing. Tutorial ini mengimplementasikan pendekatan skema bersama (satu database, kolom `tenant_id` pada setiap tabel milik tenant, global scope yang menegakkan isolasi) karena paling murah dioperasikan dan mampu melayani ribuan tenant kecil. Bagian provisioning menjelaskan kapan sebaiknya memisahkan database.

## Konten Inti

### Memilih Model Isolasi

**Skema bersama** menyimpan semua tenant di satu database dan membedakan baris lewat `tenant_id`. Migrasi cukup sekali, analitik lintas tenant mudah, dan onboarding hanya satu insert. Kelemahannya adalah radius dampak: satu query yang melewati scope membocorkan data, dan beban satu tenant besar memengaruhi semua orang. **Database per tenant** memberi setiap pelanggan skema sendiri — isolasi fisik, restore per tenant sederhana, tanpa tetangga berisik — tetapi migrasi harus dijalankan N kali, connection pool berlipat, dan pelaporan lintas tenant memerlukan data warehouse. Mulailah dengan skema bersama kecuali kebutuhan kepatuhan (kesehatan, keuangan) atau sedikit pelanggan enterprise menuntut pemisahan fisik; kode di bawah menjaga lapisan resolusi tetap mudah diganti, sehingga hanya resolver koneksi yang berubah jika nanti Anda memisahkan database.

### Menyelesaikan Tenant per Request

Subdomain adalah identitas tenant. Daftarkan route group pada domain wildcard — `Route::domain('{tenant}.saas.test')->middleware('tenant')->group(base_path('routes/tenant.php'))` — selesaikan slug di middleware, lalu ikat model hasil resolusi ke container agar sisa request, termasuk job yang dikirim sinkron, dapat membacanya.

Pengikatan dengan `app()->instance(Tenant::class, $tenant)` adalah alasan global scope tetap sederhana: model meminta tenant aktif ke container alih-alih mengoper objeknya lewat setiap signature method. Panggil juga `URL::defaults(['tenant' => $tenant->slug])` supaya `route()` tetap menghasilkan URL tenant di dalam view dan redirect. Tolak tenant tak dikenal dan tenant yang ditangguhkan sebelum query apa pun menyentuh data tenant: kembalikan `404` untuk subdomain tak dikenal (jangan pernah membocorkan tenant mana yang terdaftar) dan `402` untuk tenant yang ditangguhkan agar frontend dapat menampilkan halaman billing.

### Menegakkan Scope di Lapisan Model

Trait pada setiap model milik tenant melakukan dua hal: menambahkan global scope yang memfilter berdasarkan tenant aktif, dan mengisi `tenant_id` saat pembuatan record. Scope harus **gagal tertutup** — ketika tidak ada tenant terikat ia mengembalikan nol baris, bukan seluruh baris. Keputusan tunggal itu mencegah kebocoran multi-tenant klasik, dan pekerjaan lintas tenant (handler webhook, tooling admin, laporan terjadwal) justru mendapat jalur keluar eksplisit: sediakan `withoutTenancy()` alih-alih membiarkan developer memanggil `withoutGlobalScope()` secara ad hoc, sehingga setiap pelewatan mudah ditemukan saat code review dan diperlakukan sebagai area sensitif keamanan. Jangan hanya mengandalkan scope untuk operasi tulis — tambahkan indeks komposit yang diawali `tenant_id` dan foreign key dengan `restrictOnDelete` agar tidak ada baris yatim.

### Provisioning dan Migrasi

Dengan skema bersama, migrasi dijalankan sekali. Dengan database per tenant, simpan migrasi tenant di path terpisah (`database/migrations/tenant`) agar tabel platform tidak bocor ke database pelanggan; sebuah perintah artisan kecil melakukan loop pada tenant dan menjalankan `migrate --path=database/migrations/tenant --database=tenant --force` pada koneksi runtime yang dibangun dari record tenant. Provisioning harus atomik dan idempoten: buat baris tenant, buat database, jalankan migrasi, seed data default, lalu ubah tenant menjadi aktif. Stripe mengulang webhook, dan tenant yang setengah jadi lebih buruk daripada tenant yang gagal dibuat.

### Menghubungkan Billing ke Siklus Hidup

Billing berada di listener, bukan controller. Petakan `invoice.payment_failed` ke masa tenggang (`past_due`), `customer.subscription.deleted` ke `suspended`, dan `customer.subscription.updated` ke pengaktifan kembali. Simpan Stripe customer id pada **tenant**, bukan pada user, agar billing bertahan saat anggota tim berubah, dan jangan pernah menghapus data tenant saat pembatalan — arsipkan.

## Contoh Kode

### Middleware Resolusi Tenant

```php
// app/Http/Middleware/ResolveTenant.php
namespace App\Http\Middleware;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class ResolveTenant
{
    public function handle(Request $request, \Closure $next)
    {
        $tenant = Tenant::query()->where('slug', $request->route('tenant'))->first();

        abort_if($tenant === null, 404); // jangan bocorkan subdomain yang terdaftar
        abort_unless($tenant->isActive(), 402, 'Langganan tidak aktif.'); // tampilkan halaman billing

        app()->instance(Tenant::class, $tenant);
        URL::defaults(['tenant' => $tenant->slug]);

        return $next($request);
    }
}
```

### Trait Scoping Otomatis

```php
// app/Models/Concerns/BelongsToTenant.php
namespace App\Models\Concerns;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $id = app()->bound(Tenant::class) ? app(Tenant::class)->id : 0; // 0 = gagal tertutup
            $builder->where($builder->getModel()->getTable() . '.tenant_id', $id);
        });

        static::creating(function (Model $model) {
            $model->tenant_id ??= app()->bound(Tenant::class) ? app(Tenant::class)->id : null;
        });
    }

    /** Jalankan query lintas tenant secara eksplisit. */
    public static function withoutTenancy(\Closure $callback): mixed
    {
        return $callback(static::withoutGlobalScope('tenant'));
    }
}
```

### Listener Billing

```php
// app/Listeners/SyncTenantSubscription.php
namespace App\Listeners;

use App\Models\Tenant;
use Laravel\Cashier\Events\WebhookReceived;

class SyncTenantSubscription
{
    public function handle(WebhookReceived $event): void
    {
        $payload = $event->payload;
        $tenant = Tenant::query()->where('stripe_id', $payload['data']['object']['customer'] ?? null)->first();

        if ($tenant === null) {
            return;
        }

        $tenant->update(['status' => match ($payload['type']) {
            'invoice.payment_failed' => 'past_due',
            'customer.subscription.deleted' => 'suspended',
            'customer.subscription.updated' => $payload['data']['object']['status'] === 'active' ? 'active' : 'past_due',
            default => $tenant->status,
        }]);
    }
}
```

## Insight Penting

- **Ikat tenant, jangan dioper ke mana-mana.** Binding container menjaga scope dan hook `creating` tetap sederhana, dan tetap bekerja di dalam job selama Anda mengikat ulang saat job mulai.
- **Gagal secara tertutup.** Query tanpa tenant yang mengembalikan seluruh baris adalah kebocoran multi-tenant klasik; kembalikan nol baris.
- **Setiap pelewatan adalah keputusan keamanan.** Arahkan kode admin dan webhook melalui `withoutTenancy()`, dan tinjau titik pemanggilannya seperti Anda meninjau SQL mentah.
- **Indeks `tenant_id` di posisi pertama.** Indeks komposit harus diawali `tenant_id`, jika tidak setiap query tenant memindai seluruh tabel.
- **Provisioning adalah transaksi terdistribusi.** Pembuatan database, migrasi, dan seeding bisa gagal sendiri-sendiri; catat progres pada baris tenant dan ulangi dengan aman.

## Langkah Berikutnya

- Tambahkan rate limiting per tenant dengan named limiter yang dikunci berdasarkan id tenant, serta audit logging sadar-tenant agar tim support dapat melacak siapa mengubah apa.
- Pertimbangkan `stancl/tenancy` jika lapisan resolusi buatan sendiri tidak lagi memadai dan Anda butuh otomasi database per tenant.

## Kesimpulan

Anda sekarang memiliki kerangka multi-tenant di mana subdomain menyelesaikan tenant, setiap model milik tenant otomatis dibatasi, provisioning terisolasi, dan webhook langganan mengendalikan status tenant. Keputusan desain yang penting adalah yang menjaga isolasi tetap jujur: scoping yang gagal tertutup, pelewatan yang eksplisit, dan status billing yang disimpan pada tenant. Setelah ini, pekerjaan yang tersisa adalah pekerjaan produk — onboarding, peran, dan pelaporan — bukan plumbing tenancy.

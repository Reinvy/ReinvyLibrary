---
title: "Cheat Sheet Caching, Session, dan Redis Laravel"
description: "Referensi cepat untuk cache store, tag, atomic lock, driver session, dan konfigurasi koneksi Redis di Laravel — kode yang Anda pakai saat cache dingin, lock macet, atau session store berperilaku aneh."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Caching, Session, dan Redis Laravel

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Ganti store default | `CACHE_STORE=redis` di `.env` | Dibaca saat boot melalui `config('cache.default')`; kembali ke `file` bila tidak diisi |
| Simpan nilai dengan TTL | `Cache::put('orders.count', 42, now()->addMinutes(10));` | Menerima `DateTimeInterface`, jumlah detik, atau `null` untuk selamanya |
| Baca dengan nilai default | `Cache::get('orders.count', 0);` | Mengembalikan default tanpa menulis apa pun ke store |
| Read-through | `Cache::remember('orders.count', 600, fn () => Order::count());` | Menghitung sekali, lalu menyajikan nilai cache selama 600 detik |
| Stale-while-revalidate | `Cache::flexible('home.stats', [30, 300], fn () => Stats::build());` | Menyajikan data basi selama 30 detik sementara satu worker menyegarkan |
| Simpan selamanya | `Cache::forever('feature.flags', $flags);` | Hanya pemanggilan forget yang disengaja bisa membatalkannya |
| Naikkan counter | `Cache::increment('api.calls');` | Atomik di Redis dan Memcached, rawan race di store file |
| Turunkan counter | `Cache::decrement('queue.depth', 1);` | Berhenti di nol pada Redis, tidak menjadi negatif |
| Hapus satu key | `Cache::forget('orders.count');` | Tidak melakukan apa pun bila key sudah kedaluwarsa |
| Kosongkan satu store | `Cache::store('redis')->flush();` | Jangan dijalankan pada database Redis yang juga menyimpan session atau queue |
| Invalidasi berbasis tag | `Cache::tags(['orders'])->flush();` | Tidak didukung store file dan database |
| Atomic lock | `Cache::lock('settle:42', 30)->get();` | Mengembalikan false bila proses lain sudah memegang lock |
| Blocking lock | `Cache::lock('settle:42', 30)->block(5, fn () => $this->settle());` | Menunggu maksimal 5 detik, lalu melempar `LockTimeoutException` |
| Driver session | `SESSION_DRIVER=redis` di `.env` | Diterapkan saat boot; session lama di store sebelumnya tidak dimigrasi |
| Baca nilai session | `$request->session()->get('cart.items', []);` | Lebih baik memakai instance request daripada helper `session()` di dalam service |
| Batasi laju aksi | `RateLimiter::attempt($key, 5, fn () => $job(), 60);` | Lima percobaan per 60 detik, dikunci oleh string yang Anda berikan |

## Perintah Umum

### Memeriksa Store yang Aktif

```bash
# Store, koneksi, dan prefix yang benar-benar dipakai environment ini
php artisan tinker --execute="dump(config('cache.default'), config('cache.stores.redis.connection'), config('cache.prefix'));"

# Pastikan Redis terjangkau dari container aplikasi sebelum menyalahkan cache
redis-cli -h redis -p 6379 ping
```

### Mengaudit Key dan TTL

```bash
# Pindai sejumlah key terbatas, jangan jalankan KEYS pada database produksi
redis-cli --scan --pattern 'reports_cache:*' --count 100 | head -40

# Sisa waktu hidup satu entri dalam detik (-1 berarti tanpa kedaluwarsa)
redis-cli ttl 'reports_cache:reports.summary'

# Tekanan memori dan penghitung eviction untuk database cache
redis-cli info memory
redis-cli info keyspace
```

### Membersihkan dengan Aman Saat Deploy

```bash
# Hapus cache aplikasi saja, session dan queue di Redis bersama tetap utuh
php artisan cache:clear

# Bangun tabel pendukung bila CACHE_STORE=database
php artisan cache:table
php artisan migrate

# Bangun ulang cache terkompilasi setelah pembersihan, dengan urutan ini
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Operasi Session Store

```bash
# Bangun tabel sessions bila SESSION_DRIVER=database
php artisan session:table
php artisan migrate

# Cek driver dan batas idle tanpa mengirim request web
php artisan tinker --execute="dump(config('session.driver'), config('session.lifetime'));"

# Hitung key session aktif di bawah prefix database default
redis-cli --scan --pattern 'laravel_database_*' --count 100 | wc -l
```

## Potongan Kode

### Konfigurasi Store dan Koneksi

```php
<?php

// config/cache.php — satu store per beban kerja, bukan satu store untuk semuanya
return [
    'default' => env('CACHE_STORE', 'database'),

    'stores' => [
        'redis' => [
            'driver' => 'redis',
            'connection' => 'cache',
            'lock_connection' => 'default',
        ],
        'database' => [
            'driver' => 'database',
            'table' => 'cache',
            'lock_table' => 'cache_locks',
        ],
    ],

    'prefix' => env('CACHE_PREFIX', 'reports_cache'),
];
```

### Read-Through dengan Invalidasi Eksplisit

```php
<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Cache;

final class ReportCache
{
    public function summary(): array
    {
        return Cache::remember('reports.summary', now()->addMinutes(15), function (): array {
            return [
                'open' => Order::where('status', 'open')->count(),
                'settled' => Order::where('status', 'settled')->count(),
            ];
        });
    }

    public function invalidate(): void
    {
        Cache::forget('reports.summary');
    }
}
```

### Invalidasi Berbasis Tag untuk Data Berkelompok

```php
<?php

use Illuminate\Support\Facades\Cache;

// Tag hanya bekerja pada store redis, memcached, dan array
Cache::tags(['tenant:'.$tenant->id, 'orders'])->put(
    'orders.open',
    $openOrders,
    now()->addMinutes(10),
);

// Satu panggilan menghapus seluruh entri milik tenant, apa pun bentuk key-nya
Cache::tags(['tenant:'.$tenant->id])->flush();
```

### Perlindungan Stampede dengan Atomic Lock

```php
<?php

use App\Support\PriceMatrix;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;

$value = Cache::get('pricing.matrix');

if ($value === null) {
    try {
        // block() melepas lock untuk Anda, bahkan ketika callback melempar exception
        $value = Cache::lock('pricing.matrix:rebuild', 30)->block(5, function () {
            // Periksa ulang di dalam lock: worker lain mungkin sudah mengisi key
            return Cache::remember('pricing.matrix', 600, fn () => PriceMatrix::build());
        });
    } catch (LockTimeoutException) {
        // Pemegang lock masih bekerja, jadi sajikan fallback murah daripada ikut menumpuk
        $value = PriceMatrix::defaults();
    }
}
```

### Penulisan Session yang Bertahan Sepanjang Request

```php
<?php

// Simpan identifier di session dan hidrasi sisanya sesuai kebutuhan
$request->session()->put('cart.id', $cart->id);
$request->session()->put('cart.count', $cart->items()->count());

// Pertahankan data flash satu request lagi ketika validasi form gagal
$request->session()->reflash();

// Rotasi session setelah perubahan hak akses agar id lama mati
$request->session()->invalidate();
$request->session()->regenerateToken();
```

### Rate Limiting Berbasis Redis

```php
<?php

use Illuminate\Support\Facades\RateLimiter;

$key = 'checkout:'.$request->user()->id;

$allowed = RateLimiter::attempt($key, 5, function () use ($request) {
    $request->user()->placeOrder($request->validated());
}, 60);

if (! $allowed) {
    abort(429, 'Terlalu banyak percobaan checkout. Coba lagi sebentar.');
}

// Buka sisa kuota ke klien agar mereka bisa back off sebelum kena limit
$remaining = RateLimiter::remaining($key, 5);
$retryAfter = RateLimiter::availableIn($key);
```

### Pemeriksaan Cache Saat Deploy

```php
<?php

// routes/console.php — gagal cepat ketika deploy lupa membersihkan store bersama
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

Artisan::command('deploy:cache-check', function (): int {
    $store = config('cache.default');
    $written = Cache::put('deploy.probe', 'ok', 30) && Cache::get('deploy.probe') === 'ok';

    $this->line("store={$store} writable=".($written ? 'yes' : 'no'));

    return $written ? 0 : 1;
});
```

Perintah CLI di atas mengasumsikan binary `redis-cli` tersedia di container yang sama dengan aplikasi. Bila tidak ada, jalankan pemeriksaan yang sama dari host Redis, atau tampilkan nilainya lewat skrip Tinker singkat.

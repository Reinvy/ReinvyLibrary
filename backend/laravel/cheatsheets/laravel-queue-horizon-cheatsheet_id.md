---
title: "Cheat Sheet Queue dan Horizon Laravel"
description: "Referensi cepat queue dan Horizon Laravel — kelas job, retry dan backoff, pemulihan failed job, konfigurasi supervisor dan balancing, tag, metrik, serta perintah artisan yang dipakai saat insiden."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Queue dan Horizon Laravel

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Dorong job | `SendInvoice::dispatch($order);` | Menyerialkan dan memasukkan ke antrean setelah response di-commit |
| Tunda job | `->delay(now()->addMinutes(5))` | Menambah stempel available-at agar tidak langsung dijalankan |
| Pilih queue tujuan | `->onQueue('invoices')` | Mengarahkan ke queue bernama yang harus didengar supervisor |
| Jalankan worker lokal | `php artisan queue:work --queue=high,default` | Prioritas dari kiri ke kanan; queue pertama yang berisi job menang |
| Jalankan Horizon | `php artisan horizon` | Menjalankan semua supervisor di `config/horizon.php` |
| Muat ulang worker setelah deploy | `php artisan horizon:terminate` | Restart graceful; master menghidupkan worker dengan kode baru |
| Atur jumlah percobaan | `public int $tries = 5;` | Total percobaan termasuk eksekusi pertama |
| Backoff eksponensial | `public array $backoff = [10, 30, 60, 300];` | Detik jeda sebelum setiap retry berikutnya |
| Daftar failed job | `php artisan queue:failed` | Menampilkan UUID, koneksi, queue, dan exception per baris |
| Retry satu failed job | `php artisan queue:retry 3f1c8a2e-...` | Memasukkan kembali satu job berdasarkan UUID |
| Bersihkan kegagalan | `php artisan queue:flush` | Menghapus seluruh baris failed; tidak bisa dibatalkan |
| Cegah tumpang tindih | `->withoutOverlapping(10)` | Cache lock agar job logis yang sama tidak berjalan ganda |
| Batasi laju job | `->middleware('throttle:30')` | Maksimal 30 eksekusi per menit di seluruh worker |
| Beri tag untuk metrik | `public function tags(): array` | Mengelompokkan durasi dan kegagalan di UI Horizon |

## Perintah Umum

### Bekerja dengan Queue di Lokal

```bash
# Proses satu job per pemanggilan — umpan balik tercepat saat debugging
php artisan queue:work --once

# Dengarkan beberapa queue sesuai urutan prioritas
php artisan queue:work --queue=high,default,low --tries=3 --timeout=90

# Jalankan job secara sinkron, tanpa worker
php artisan tinker --execute="SendInvoice::dispatchSync(App\\Models\\Order::first());"

# Kosongkan job pada satu koneksi dan queue
php artisan queue:clear redis --queue=invoices
```

### Siklus Hidup Horizon saat Deployment

```bash
# Status master supervisor beserta supervisornya
php artisan horizon:status

# Restart graceful setelah deploy: selesaikan job berjalan, lalu muat kode baru
php artisan horizon:terminate

# Hapus metrik serta riwayat job selesai/gagal untuk satu environment
php artisan horizon:purge

# Ambil snapshot panjang queue dan waktu tunggu sekarang (biasanya terjadwal)
php artisan horizon:snapshot

# Tampilkan setiap supervisor, queue, dan jumlah prosesnya
php artisan horizon:list
```

### Triase Kegagalan

```bash
# Failed job beserta kelas exception dan stempel failed_at
php artisan queue:failed

# Kembalikan job ke queue asal, atau ke queue lain
php artisan queue:retry 3f1c8a2e-9a51-4b0e-8a1f-6d2c0b7e4a11 --queue=invoices-slow

# Hapus satu failed job setelah diperbaiki manual
php artisan queue:forget 3f1c8a2e-9a51-4b0e-8a1f-6d2c0b7e4a11

# Pemeriksaan level alert: keluar non-zero bila queue melewati ambang
php artisan queue:monitor redis:invoices,redis:high --max=500
```

## Potongan Kode

### Job dengan Retry, Timeout, dan Proteksi Overlap

```php
namespace App\Jobs;

use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;

class SendInvoice implements ShouldQueue
{
    use InteractsWithQueue;

    public int $tries = 5;
    public int $timeout = 60;
    public bool $failOnTimeout = true;
    public array $backoff = [10, 30, 60, 300];

    public function __construct(public readonly Order $order) {}

    /** @return array<int, object> */
    public function middleware(): array
    {
        // Satu invoice per order pada satu waktu; lock kedaluwarsa setelah 30 detik idle
        return [(new WithoutOverlapping("invoice:{$this->order->id}"))->expireAfter(30)];
    }

    public function handle(): void
    {
        $this->order->loadMissing('customer');
        app(InvoiceService::class)->send($this->order);
    }

    public function failed(Throwable $exception): void
    {
        Log::channel('queues')->error('invoice gagal permanen', [
            'order_id' => $this->order->id,
            'attempts' => $this->attempts(),
            'exception' => $exception->getMessage(),
        ]);
    }

    /** @return array<int, string> */
    public function tags(): array
    {
        return ['invoice', "order:{$this->order->id}"];
    }
}
```

### Konfigurasi Supervisor untuk Horizon

```php
// config/horizon.php — satu supervisor per bentuk beban kerja
'defaults' => [
    'supervisor-invoices' => [
        'connection' => 'redis',
        'queue' => ['invoices'],
        'balance' => 'auto',      // bagi proses berdasarkan panjang queue terukur
        'minProcesses' => 1,
        'maxProcesses' => 10,
        'tries' => 5,
        'timeout' => 60,
    ],
],
```

### Dispatch Setelah Commit dan Alert saat Backlog

```php
// Jangan masukkan job sebelum commit, atau worker bisa membaca baris yang belum ada
DB::transaction(function () use ($order) {
    $order->markPaid();
    SendInvoice::dispatch($order)->afterCommit()->onQueue('invoices');
});

// Jadwalkan pemeriksaan backlog tiap lima menit di routes/console.php
Schedule::command('queue:monitor redis:invoices --max=500')
    ->everyFiveMinutes()
    ->onFailure(fn () => Alert::queue('invoices', 'backlog di atas 500'));
```

Perlakukan tiga angka sebagai alarm, bukan hiasan: waktu tunggu queue (bukan panjangnya), laju failed job, dan memori worker.

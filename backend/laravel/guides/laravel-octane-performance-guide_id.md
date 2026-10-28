---
title: "Panduan Laravel Octane dan Penyajian Aplikasi Berperforma Tinggi"
description: "Panduan produksi untuk menyajikan aplikasi Laravel dengan Octane di FrankenPHP, Swoole, atau RoadRunner — menghilangkan kebocoran state antar-request, menyetel jumlah worker dan connection pool, mengukur throughput secara jujur, serta melakukan deploy worker berumur panjang tanpa downtime."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Laravel Octane dan Penyajian Aplikasi Berperforma Tinggi

## Pendahuluan

Deployment PHP klasik membayar pajak tetap pada setiap request: web server menjalankan proses PHP-FPM, PHP melakukan boot, autoloader Composer dibangun ulang, file konfigurasi di-parse, service provider diregistrasi, dan baru setelah itu controller Anda berjalan. Untuk request yang benar-benar melakukan pekerjaan, proses bootstrap tersebut bisa menghabiskan sepertiga atau bahkan lebih dari total waktu eksekusi. Octane menghapus pajak itu dengan melakukan boot framework sekali saja dan menyimpannya tetap hidup di memori, lalu menyerahkan request kepada worker berumur panjang yang sudah memiliki container, router, dan konfigurasi terkompilasi dalam keadaan siap.

Peningkatan throughput-nya nyata, tetapi model kegagalannya berubah total. Pada PHP-FPM setiap request dimulai dari proses yang bersih, sehingga array statis yang ditinggalkan dalam keadaan kotor oleh request A tidak akan pernah terlihat oleh request B. Di bawah Octane, request A dan request B berbagi memori proses yang sama. Semua state yang secara implisit bersifat per-request — properti statis, singleton container yang menyimpan objek user, hasil query yang di-memoize, konfigurasi global yang dimutasi saat runtime — diam-diam berubah menjadi state lintas request. Itulah sebabnya mayoritas insiden Octane di produksi bukan masalah throughput sama sekali, melainkan masalah kebocoran data atau pertumbuhan memori yang disebabkan kode yang benar pada model request-per-proses namun secara diam-diam salah pada model berumur panjang.

Panduan ini memperlakukan Octane sebagai migrasi arsitektural, bukan sekadar flag konfigurasi. Materi mencakup cara kerja model worker, kelas-kelas state spesifik yang harus dihapus atau di-scope, cara menyetel jumlah worker dan connection pool berdasarkan pengukuran nyata, serta cara melakukan deploy dan reload worker tanpa menjatuhkan trafik.

## Praktik Terbaik

### Perlakukan Migrasi sebagai Audit, Bukan Instalasi

Octane bukan paket yang cukup dipasang lalu dilupakan. Sebelum satu baris konfigurasi Octane ditulis, daftarkan semua bagian aplikasi yang mengasumsikan proses baru untuk setiap request: cache statis, memoization bergaya `once()`, singleton yang bisa berubah, binding container yang menyimpan data request, middleware global yang menulis ke config, serta library yang menyimpan koneksi atau file handle tetap terbuka. Audit itulah migrasinya. Jika Anda memasang Octane lebih dulu dan memperbaiki kebocoran setelah muncul sebagai korupsi data di produksi, Anda telah mengirim bug yang hampir mustahil direproduksi secara lokal.

**Mengapa penting**: kebocoran di bawah Octane tidak gagal secara berisik. Request B cukup menerima data request A, dan gejalanya muncul sebagai tenant yang salah sesekali, nama user yang keliru, atau pemeriksaan izin yang basi — kelas bug tersulit untuk dilacak kembali ke penyebabnya.

### Hilangkan State Statis dan Global yang Dapat Berubah

Properti statis dan variabel global hidup selama umur worker, bukan selama umur request. Array statis yang dipakai sebagai cache memoization adalah kebocoran Octane yang paling umum. Gantikan cache statis dengan binding yang di-scope per request, cache store sungguhan, atau mekanisme reset eksplisit yang dipasang pada listener request milik Octane.

**Mengapa penting**: state statis tidak terlihat dalam code review karena tampak seperti optimasi performa yang tidak berbahaya. Pada FPM ia memang optimasi yang tidak berbahaya; pada Octane ia adalah memori bersama antara pengguna yang tidak berhubungan.

### Gunakan Scoped Binding untuk Apa Pun yang Berbentuk Request

Container Laravel membedakan antara `singleton` (satu instance selama umur worker) dan `scoped` (satu instance per request, otomatis dibersihkan Octane setelah setiap request). Apa pun yang membawa konteks request — user yang terautentikasi, tenant aktif, repository ber-scope request, HTTP client per-request dengan header khusus — harus diregistrasi dengan `scoped()`, tidak pernah `singleton()`.

**Mengapa penting**: `scoped()` memberi Anda semantik isolasi per request dengan performa container bersama, dan Octane membersihkan instance scoped untuk Anda setelah setiap request sehingga Anda tidak perlu mengingat pembersihan manual.

### Setel Jumlah Worker Berdasarkan CPU, Bukan Berdasarkan Harapan

Jumlah worker Octane adalah jumlah request konkuren yang dapat dieksekusi aplikasi, karena setiap worker menangani satu request pada satu waktu. Menetapkan worker jauh di atas jumlah core CPU yang tersedia menyebabkan thrash context switch dan menggelembungkan tail latency. Mulailah dari satu hingga dua worker per core, ukur, lalu sesuaikan berdasarkan saturasi CPU yang teramati, bukan berdasarkan keyakinan bahwa worker lebih banyak berarti throughput lebih besar.

**Mengapa penting**: worker pool yang kelebihan alokasi terlihat baik pada latency rata-rata sementara p99 runtuh di bawah beban, karena request mengantre di dalam PHP sementara kernel mengatur thread yang siap jalan.

### Selalu Tetapkan Batas Maksimum Request

Setiap proses PHP berumur panjang mengakumulasi memori: referensi siklik yang tertunda dibersihkan garbage collector, buffer tingkat ekstensi, dan kode pihak ketiga yang memang bocor secara desain. Nilai `max_requests` (500–1000 adalah rentang awal yang wajar) mendaur ulang setiap worker setelah sejumlah request terbatas, mengubah kebocoran tanpa batas menjadi pola gigi gergaji terbatas yang dapat direbut kembali oleh sistem operasi.

**Mengapa penting**: tanpa batas, satu kebocoran lambat berubah menjadi OOM kill pada pukul tiga pagi, dan restart tersebut tampak seperti gangguan yang tidak dijelaskan alih-alih peristiwa siklus hidup yang terprediksi.

### Jauhkan Session, Cache, dan Queue dari Memori Proses

Di bawah Octane, driver cache `array` dan driver session `array` berubah menjadi memori per worker yang tidak terlihat oleh worker lain. Dua request berurutan dari browser yang sama bisa mendarat di worker berbeda dan melihat "session" yang sama sekali berbeda. Gunakan Redis, Memcached, atau database untuk session dan cache, serta backend queue sungguhan untuk job.

**Mengapa penting**: driver array adalah default yang nyaman saat pengembangan lokal dan bencana pada proses multi-worker. Kegagalannya tampak seperti logout acak, yang sering salah didiagnosis tim sebagai masalah cookie.

### Pindahkan Aset Statis dari Lapisan Aplikasi

Worker Octane adalah proses mahal yang didedikasikan untuk mengeksekusi PHP. Menyajikan gambar, font, dan CSS hasil kompilasi dari worker membuang slot request yang seharusnya menjalankan logika bisnis, sekaligus memblokir satu worker penuh selama file besar dialirkan.

**Mengapa penting**: satu unduhan gambar 4 MB menempati satu worker selama seluruh waktu transfer. Dengan 16 worker, beberapa unduhan aset konkuren saja sudah cukup membuat API kelaparan.

### Panaskan Hal yang Mahal Saat Boot

Daftar `warm` milik Octane me-resolve service, controller, dan komponen view saat worker dimulai sehingga request nyata pertama tidak membayar biaya reflection dan autoload. Padukan dengan `php artisan config:cache`, `route:cache`, dan `view:cache` di pipeline deploy.

**Mengapa penting**: worker dingin menciptakan lonjakan latency setelah setiap deploy dan setiap daur ulang `max_requests`. Pemanasan meratakan lonjakan itu, yang paling penting justru saat trafik tertinggi.

### Ukur Sebelum dan Sesudah dengan Harness yang Sama

Setiap klaim tentang performa Octane harus didukung load test yang dapat diulang, menguji endpoint realistis dengan payload realistis, dijalankan terhadap FPM dan Octane dari mesin dan dataset yang sama. Catat p50, p95, p99, throughput, dan memori per worker.

**Mengapa penting**: Octane sering meningkatkan throughput secara dramatis sambil hampir tidak menggeser latency satu request, dan dapat memperburuk p99 jika jumlah worker, ukuran connection pool, atau `max_requests` salah setel. Hanya pengukuran yang memberi tahu Anda berada di rezim mana.

### Deploy dengan Reload Bertahap dan Health Check Sungguhan

`php artisan octane:reload` meminta worker menyelesaikan request yang sedang berjalan lalu restart, yang merupakan cara aman memuat kode baru. Padukan dengan endpoint health yang melaporkan keaktifan worker, dan pastikan load balancer memeriksa endpoint itu alih-alih file statis.

**Mengapa penting**: restart keras di tengah request menjatuhkan transaksi pengguna. Reload bertahap ditambah health check yang benar memungkinkan Anda deploy pada jam kerja tanpa jendela pemeliharaan.

### Pantau Memori Worker dan Jumlah Koneksi sebagai Metrik Utama

Lacak RSS per worker, jumlah request per worker, koneksi database yang dipegang per worker, dan koneksi Redis per worker. Setiap worker memiliki pool sendiri; total koneksi adalah jumlah worker dikalikan ukuran pool, dan inilah yang paling sering salah dihitung tim ketika melakukan scaling horizontal.

**Mengapa penting**: kehabisan koneksi di bawah Octane biasanya muncul sebagai error "too many connections" yang intermiten hanya pada konkurensi puncak, karena setiap worker tambahan mengalikan pool.

## Langkah Implementasi

### Langkah 1: Inventarisasi State Berumur Panjang

Mulailah dengan menemukan setiap tempat aplikasi menyimpan state di luar siklus hidup request. Perintah grep berikut memunculkan tersangka yang biasa: properti statis, singleton container yang menyimpan data request, dan mutasi helper global.

```bash
# Properti statis dan cache statis
grep -rn "static \$\|static array\|static ?" app/ --include=*.php

# Singleton yang diregistrasi pada service provider
grep -rn "singleton(" app/Providers/ --include=*.php

# Mutasi config dan instance global saat runtime
grep -rn "config(\[" app/ --include=*.php
grep -rn "Config::set\|app()->instance(" app/ --include=*.php
```

Untuk setiap temuan, jawab satu pertanyaan: apakah nilai ini bergantung pada request saat ini, user saat ini, atau tenant saat ini? Nilai yang bergantung pada salah satunya adalah kandidat kebocoran; nilai yang berasal dari konfigurasi tak berubah aman.

### Langkah 2: Pasang Octane dan Pilih Server

Octane mendukung FrankenPHP (berbasis Caddy, paling mudah dioperasikan), Swoole (berbasis ekstensi, sudah matang), dan RoadRunner (biner Go). Pilih satu dan standarkan; mencampur server antar lingkungan menghasilkan angka benchmark yang tidak dapat dibandingkan.

```bash
composer require laravel/octane
php artisan octane:install --server=frankenphp
```

Deklarasikan server secara eksplisit di environment agar default yang hilang tidak diam-diam mengubah runtime:

```ini
OCTANE_SERVER=frankenphp
OCTANE_HTTPS=true
OCTANE_WORKERS=auto
OCTANE_MAX_REQUESTS=500
```

### Langkah 3: Ganti Cache Statis dengan Service Ber-scope

Ambil setiap cache statis yang ditemukan pada Langkah 1 dan ubah menjadi service ber-scope. Pola buruk melakukan memoization ke properti statis; pola baik melakukan memoization ke instance yang dibuang Octane setelah request selesai.

```php
// Sebelum: bertahan lintas request di dalam worker
final class ReportService
{
    protected static array $cache = [];

    public function summary(int $userId): array
    {
        return self::$cache[$userId] ??= $this->build($userId);
    }
}
```

```php
// Sesudah: memoization per request, dibuang setelah response
final class ReportService
{
    private array $cache = [];

    public function summary(int $userId): array
    {
        return $this->cache[$userId] ??= $this->build($userId);
    }
}
```

Registrasikan sebagai scoped agar instance baru dibuat untuk setiap request dan dibersihkan otomatis:

```php
// app/Providers/AppServiceProvider.php
public function register(): void
{
    $this->app->scoped(ReportService::class);

    // Konteks berbentuk request tidak boleh menjadi singleton di bawah Octane
    $this->app->scoped(CurrentTenant::class, fn () => new CurrentTenant());
    $this->app->scoped(RequestContext::class, fn () => new RequestContext());
}
```

Audit provider untuk binding `singleton()` yang menerima `Request`, user terautentikasi, atau identitas tenant. Semuanya harus dipindahkan ke `scoped()` atau akan menyajikan konteks request pertama kepada setiap request berikutnya pada worker yang sama.

### Langkah 4: Konfigurasikan Octane Secara Sadar

File konfigurasi Octane mengendalikan jumlah worker, pemanasan, cache request internal, dan daur ulang worker. Tetapkan setiap nilai secara eksplisit alih-alih mengandalkan default, dan jaga `max_requests` tetap terbatas.

```php
// config/octane.php
return [
    'server' => env('OCTANE_SERVER', 'frankenphp'),

    // Resolve service mahal saat boot worker, bukan pada request pertama
    'warm' => array_merge(Octane::defaultServicesToWarm(), [
        App\Http\Controllers\DashboardController::class,
        App\Services\ReportService::class,
    ]),

    'cache' => [
        'rows' => 2000,
        'bytes' => 10_000,
    ],

    'tables' => [
        'metrics:1000' => ['id' => 'int', 'value' => 'float'],
    ],

    // Satu hingga dua worker per core CPU adalah rentang awal yang wajar
    'workers' => env('OCTANE_WORKERS', 'auto'),

    // Daur ulang worker untuk membatasi pertumbuhan memori
    'max_requests' => (int) env('OCTANE_MAX_REQUESTS', 500),
];
```

Biarkan daftar listener tetap utuh. Octane membersihkan instance scoped, me-reset konteks request pada container, dan membersihkan state file terunggah di dalam `RequestTerminated`; menghapus listener tersebut akan mengembalikan persis kebocoran yang sudah dihilangkan pada langkah sebelumnya.

### Langkah 5: Sesuaikan Pool Database dan Redis per Worker

Setiap worker membuka koneksinya sendiri. Total koneksi sama dengan jumlah worker dikalikan ukuran pool, jadi kecilkan pool saat jumlah worker bertambah, dan hitung `max_connections` database dari hasil perkalian itu dengan ruang cadangan untuk migrasi serta sesi admin.

```php
// config/database.php
'connections' => [
    'pgsql' => [
        'driver' => 'pgsql',
        'host' => env('DB_HOST'),
        'database' => env('DB_DATABASE'),
        'username' => env('DB_USERNAME'),
        'password' => env('DB_PASSWORD'),
        'charset' => 'utf8',
        'prefix' => '',
        'schema' => 'public',
        'sslmode' => 'prefer',
        'pool' => [
            'min_connections' => 2,
            'max_connections' => (int) env('DB_POOL_MAX', 8),
            'wait_timeout' => 5.0,
            'max_idle_time' => 60.0,
        ],
    ],
],
```

Hitung batas atas sebelum deploy dan gagalkan build jika konfigurasi melampauinya:

```bash
php -r '
$workers = (int) getenv("OCTANE_WORKERS");
$pool = (int) getenv("DB_POOL_MAX");
$total = $workers * $pool;
echo "workers={$workers} pool={$pool} total_connections={$total}\n";
if ($total > 180) { fwrite(STDERR, "anggaran koneksi terlampaui\n"); exit(1); }
'
```

### Langkah 6: Pindahkan Session, Cache, dan Aset dari Lapisan Aplikasi

Alihkan driver volatile ke backend bersama, dan biarkan edge menyajikan konten statis sehingga worker hanya menangani request dinamis.

```ini
SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis
REDIS_HOST=redis.internal
```

```text
# Sebelum (worker melayani request dan mengalirkan file)
GET /storage/products/hero.webp  -> worker Octane (terblokir sepanjang transfer)

# Sesudah (worker tidak pernah melihat trafik aset)
GET /storage/products/hero.webp  -> CDN / object storage / web server statis
GET /api/products                -> worker Octane
```

Jika sebuah file harus dilayani Laravel karena otorisasi, kembalikan redirect ke URL CDN bertanda tangan berumur pendek alih-alih mengalirkan byte melalui worker.

### Langkah 7: Lakukan Benchmark dengan Harness yang Dapat Diulang

Jalankan profil beban yang sama terhadap FPM dan Octane, di mesin yang sama, dengan dataset hasil seeding yang sama. Catat throughput, p50, p95, p99, tingkat error, dan RSS puncak per worker.

```bash
# Pemeriksaan saturasi cepat
bombardier -c 100 -d 60s -l http://127.0.0.1:8000/api/products?page=1

# Skenario terukur dengan ambang batas
k6 run -e BASE_URL=http://127.0.0.1:8000 loadtest/products.js
```

Skenario menjaga konkurensi identik antar run sehingga perbandingannya jujur:

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    steady: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 200 },
        { duration: '2m', target: 200 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<150'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/api/products?page=1`);
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

Catat hasilnya dalam tabel yang dapat Anda diff antar rilis:

```text
| Runtime          | Req/s | p50   | p95   | p99   | RSS puncak/worker |
|------------------|-------|-------|-------|-------|-------------------|
| PHP-FPM (32 pm)  |  410  |  61ms | 180ms | 420ms | 48 MB             |
| Octane, 4 worker |  690  |  44ms | 120ms | 260ms | 96 MB             |
| Octane, 8 worker | 1180  |  38ms |  95ms | 190ms | 96 MB             |
```

Jika p99 naik sementara throughput membaik, curigai kelaparan worker atau penantian koneksi, bukan CPU.

### Langkah 8: Siapkan Aplikasi untuk Caching Saat Boot

Cache apa pun yang dapat di-cache saat deploy, dan buat jalur boot tetap murah. Di produksi tidak boleh ada file konfigurasi yang di-parse per request dan tidak boleh ada route yang di-resolve dari disk.

```bash
php artisan optimize
php artisan event:cache
php artisan view:cache
php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000
```

Bersihkan cache hanya di pengembangan lokal; config ter-cache yang menyembunyikan perubahan environment adalah insiden produksi klasik yang diciptakan sendiri.

```bash
php artisan optimize:clear
```

### Langkah 9: Deploy dengan Reload Bertahap dan Health Check

Awasi proses Octane agar worker pool yang crash di-restart otomatis, dan gunakan `octane:reload` untuk mengirim kode baru tanpa menjatuhkan request yang sedang berjalan.

```ini
; /etc/supervisor/conf.d/octane.conf
[program:octane]
command=php /var/www/html/artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000 --workers=8 --max-requests=500
directory=/var/www/html
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stopsignal=TERM
stopwaitsecs=30
stdout_logfile=/var/log/octane/out.log
stderr_logfile=/var/log/octane/err.log
```

Sediakan endpoint health yang membuktikan worker benar-benar mengeksekusi PHP, bukan sekadar port yang terbuka:

```php
// routes/web.php
Route::get('/healthz', function () {
    return response()->json([
        'status' => 'ok',
        'pid' => getmypid(),
        'db' => DB::select('select 1 as ok')[0]->ok === 1,
    ]);
});
```

Urutan deploy: jalankan migrasi, bangun ulang cache, lalu reload — jangan pernah restart dingin saat load balancer masih mengirim trafik.

```bash
php artisan migrate --force
php artisan optimize
php artisan octane:reload
curl -fsS http://127.0.0.1:8000/healthz
```

### Langkah 10: Instrumentasi dan Operasikan Worker Pool

Setelah live, pantau angka yang memprediksi kegagalan khas Octane: tren RSS per worker yang menaik, jumlah request per worker yang terus mendekati `max_requests` (tanda batas terlalu rendah), dan jumlah koneksi database yang naik seiring jumlah replika.

```php
// app/Providers/AppServiceProvider.php — ambil sampel metrik worker secara berkala
public function boot(): void
{
    if (! app()->runningInConsole()) {
        Octane::tick('worker-metrics', function () {
            Metrics::gauge('octane.worker.rss_mb', memory_get_peak_usage(true) / 1024 / 1024);
        })->seconds(30);
    }
}
```

Buat alert pada laju pertumbuhan RSS, bukan RSS absolut, dan pada rasio koneksi database aktif terhadap total. Worker yang tumbuh stabil sepanjang satu jendela `max_requests` penuh sedang bocor; pool yang berada di utilisasi 100 persen pada trafik normal kurang alokasi.

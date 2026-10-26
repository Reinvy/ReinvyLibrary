---
title: "Panduan Testing Laravel"
description: "Panduan praktis menyusun suite Laravel yang tetap cepat dan terpercaya — feature test versus unit test, factory, isolasi database, asersi HTTP, fake batas eksternal, eksekusi paralel, dan gerbang coverage di CI."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Testing Laravel

## Pendahuluan

Laravel sudah menyertakan PHPUnit (atau Pest), kelas dasar `TestCase`, factory, dan `phpunit.xml` yang mengarahkan suite ke SQLite in-memory. Konfigurasi bawaan itu cukup untuk mulai menulis test, tetapi tidak cukup agar tetap berguna saat proyek membesar. Suite membusuk dengan pola yang mudah ditebak: setiap test membangun framework dan menyentuh database sehingga eksekusi butuh beberapa menit dan tidak ada yang menjalankannya di lokal; asersi masuk ke method privat sehingga refactor merusak puluhan test yang sebenarnya tidak lagi mendeskripsikan perilaku; panggilan HTTP eksternal dibiarkan hidup sehingga vendor yang flaky membuat `main` merah tanpa kaitan dengan perubahan.

Panduan ini menjelaskan struktur yang menghindari kegagalan tersebut. Ide intinya adalah pembagian tanggung jawab yang tegas: **feature test** menggerakkan aplikasi lewat HTTP dan memberi asersi pada respons, database, serta queue; **unit test** mencakup logika domain murni — aturan harga, value object, parser — tanpa membangun framework dan tanpa I/O. Sisanya (factory, isolasi database, fake, paralelisasi) ada untuk menjaga kedua lapisan itu cepat dan deterministik.

## Praktik Terbaik

- **Uji lewat permukaan HTTP.** Feature test yang memanggil `$this->post('/orders', $payload)` menguji routing, middleware, form request, otorisasi, controller, lapisan model, dan serialisasi JSON dalam satu langkah. Itulah perilaku yang benar-benar dikirim ke produksi, jadi itulah yang layak diberi asersi. Jaga asersi tetap ketat: status code, bentuk respons, dan efek samping di database. Memanggil method privat controller menduplikasi implementasi di dalam test dan membiarkan route asli rusak tanpa terdeteksi.
- **Sisakan unit test untuk logika tanpa dependensi.** Unit test memperoleh kecepatannya dengan tidak pernah membangun Laravel — turunkan langsung dari `PHPUnit\Framework\TestCase` untuk apa pun yang murni: aritmetika uang, pembuatan slug, aturan pajak, state machine. Jika sebuah kelas membutuhkan container, database, atau clock, itu bukan unit; ujilah lewat feature test daripada mem-mock empat kolaborator hanya untuk mengisolasinya.
- **Bangun state dengan factory dan state bernama.** Jangan pernah membuat model manual dengan `new Order([...])` lalu `save()`. Factory memusatkan atribut wajib, menjaga test mudah dibaca, dan bertahan saat skema berubah. Modelkan varian yang bermakna sebagai state bernama (`Order::factory()->paid()->create()`) agar test terbaca sebagai niat, bukan sebagai kebisingan setup.
- **Isolasi database secara otomatis.** Gunakan `RefreshDatabase` pada setiap test yang menyentuh database: trait ini menjalankan migrasi sekali per suite dan membungkus tiap test dalam transaksi, sehingga test tidak dapat melihat baris milik test lain dan urutan eksekusi tidak pernah menjadi masalah. Jangan hanya memakai `DatabaseTransactions` bila ada test yang menjalankan DDL atau commit — state akan bocor. Beri asersi pada pekerjaan yang di-queue dengan `Queue::fake()` alih-alih membiarkan job berjalan di dalam request.
- **Bekukan waktu, jangan pakai sleep.** Logika bergantung waktu (masa trial berakhir, prorata, "jatuh tempo 7 hari lagi") harus diuji dengan `$this->travelTo()` atau `$this->freezeTime()`, bukan `sleep()`. Clock yang dibekukan membuat asersi presisi dan menghilangkan flakiness yang hanya muncul di mesin CI lambat.
- **Fake batas eksternal, bukan kode sendiri.** Ganti sistem eksternal dengan fake Laravel — `Http::fake()`, `Queue::fake()`, `Mail::fake()`, `Storage::fake()`, `Notification::fake()` — dan beri asersi pada apa yang keluar dari aplikasi (`Http::assertSent`), bukan pada cara service memanggil kolaboratornya. Mem-mock kelas sendiri mengikat test pada struktur internal dan menghasilkan suite yang tetap hijau padahal fiturnya rusak.
- **Paralelkan dan tegakkan ambang coverage.** `php artisan test --parallel` menjalankan setiap kelas test di proses tersendiri dengan database tersendiri, memotong waktu eksekusi kurang lebih sebanding jumlah core. Pasangkan dengan `--min=80` di CI agar kode baru tidak lolos tanpa test, dan ukur coverage pada seluruh aplikasi, bukan hanya berkas yang disentuh sebuah pull request.

## Langkah Implementasi

### Langkah 1: Konfigurasi Lingkungan Testing

Arahkan suite ke database sekali pakai dengan pengaturan yang aman untuk paralel. SQLite `:memory:` cukup untuk sebagian besar suite; jika query memakai fitur khusus Postgres (operator JSONB, `ILIKE`, window function), ujilah terhadap Postgres agar suite mengeksekusi SQL yang sama dengan produksi.

```xml
<!-- phpunit.xml -->
<php>
    <env name="APP_ENV" value="testing"/>
    <env name="DB_CONNECTION" value="pgsql"/>
    <env name="DB_DATABASE" value="app_testing"/>
    <env name="CACHE_STORE" value="array"/>
    <env name="QUEUE_CONNECTION" value="sync"/>
    <env name="MAIL_MAILER" value="array"/>
</php>
```

### Langkah 2: Tulis Feature Test Pertama

Cakup happy path, satu aturan otorisasi, dan satu kegagalan validasi — tiga test per endpoint biasanya cukup untuk mendeskripsikan kontrak.

```php
// tests/Feature/OrderTest.php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_pelanggan_dapat_membuat_pesanan(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/orders', ['product_id' => 42, 'quantity' => 2])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('orders', ['user_id' => $user->id, 'quantity' => 2]);
    }

    public function test_tamu_tidak_dapat_membuat_pesanan(): void
    {
        $this->postJson('/api/orders', ['product_id' => 42, 'quantity' => 1])
            ->assertUnauthorized();
    }
}
```

### Langkah 3: Tambahkan Unit Test untuk Logika Murni

Pindahkan aturan harga ke kelas tanpa dependensi framework, lalu uji tanpa membangun aplikasi. Perhatikan bahwa kelas ini mewarisi `TestCase` milik PHPUnit, bukan milik Laravel — itulah yang menjaganya tetap dalam hitungan milidetik.

```php
// tests/Unit/MoneyTest.php
namespace Tests\Unit;

use App\Support\Money;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_membagi_nominal_tanpa_kehilangan_pecahan_terkecil(): void
    {
        $parts = Money::fromCents(1000)->split(3);

        $this->assertSame([334, 333, 333], array_map(fn ($p) => $p->cents, $parts));
        $this->assertSame(1000, array_sum(array_map(fn ($p) => $p->cents, $parts)));
    }

    public function test_menolak_nominal_negatif(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        Money::fromCents(-1);
    }
}
```

### Langkah 4: Fake Batas Eksternal

Setiap panggilan keluar diberi fake dengan respons eksplisit, ditambah asersi bahwa request dikirim dengan payload yang tepat. Uji juga cabang kegagalan — `Http::response([], 500)` — karena penanganan error justru titik yang paling sering rusak pada integrasi.

```php
public function test_pembayaran_ditagih_melalui_gateway(): void
{
    Http::fake([
        'gateway.example.com/charges' => Http::response(['id' => 'ch_123', 'status' => 'paid'], 201),
    ]);

    $order = Order::factory()->create();

    $this->postJson("/api/orders/{$order->id}/pay")->assertOk();

    Http::assertSent(fn ($request) => $request->url() === 'https://gateway.example.com/charges'
        && $request['amount'] === $order->total_cents);

    $this->assertSame('paid', $order->fresh()->status);
}
```

### Langkah 5: Tegakkan Suite di CI

Jalankan perintah yang sama dengan yang dijalankan CI, sebelum Anda push. Pastikan mesin database di pipeline identik dengan produksi, cache `vendor/` dan cache Composer, serta perlakukan penurunan coverage sebagai build gagal, bukan sekadar peringatan.

```yaml
# .github/workflows/tests.yml
- name: Menjalankan test
  run: php artisan test --parallel --coverage --min=80
  env:
    DB_CONNECTION: pgsql
    DB_DATABASE: app_testing
```

Tambahkan `--parallel` ke skrip test di `composer.json` setelah suite hijau secara serial, dan jalankan `php artisan config:clear` lebih dulu agar konfigurasi ter-cache tidak mengarahkan test ke database produksi.

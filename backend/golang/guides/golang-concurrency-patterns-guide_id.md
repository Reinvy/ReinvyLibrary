---
title: "Panduan Pola Konkurensi Go"
description: "Panduan komprehensif tentang pola konkurensi di Go — goroutine, channel, primitif sinkronisasi, dan praktik terbaik tingkat produksi untuk membangun sistem konkuren."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Pola Konkurensi Go

## Pendahuluan

Konkurensi adalah salah satu fitur unggulan Go, yang terintegrasi langsung ke dalam bahasa melalui goroutine dan channel. Berbeda dengan model threading tradisional yang bergantung pada thread sistem operasi dan sinkronisasi memori bersama, Go menawarkan model konkurensi ringan yang dibangun di atas prinsip **CSP (Communicating Sequential Processes)**: *"Jangan berkomunikasi dengan berbagi memori; sebaliknya, bagikan memori dengan berkomunikasi."*

Panduan ini mencakup pola konkurensi tingkat produksi di Go. Panduan ini mengasumsikan Anda sudah familiar dengan sintaks Go dan penggunaan dasar goroutine/channel. Anda akan belajar cara menyusun program konkuren yang benar, mudah dirawat, dan berperforma tinggi — menghindari jebakan umum seperti deadlock, race condition, dan kebocoran goroutine.

## Praktik Terbaik

### 1. Manajemen Siklus Hidup Goroutine

Setiap goroutine yang Anda jalankan harus memiliki jalur keluar yang terjamin. Goroutine yang terblokir selamanya menyebabkan **kebocoran goroutine**, yang secara perlahan menghabiskan memori dan deskriptor file.

- **Selalu ketahui kapan dan mengapa goroutine keluar.** Gunakan `context.Context` untuk sinyal pembatalan.
- **Gunakan `sync.WaitGroup` untuk menunggu penyelesaian goroutine** sebelum mematikan layanan.
- **Hindari meluncurkan goroutine di dalam library** — biarkan pemanggil yang menentukan konkurensi.

```go
func processItems(ctx context.Context, items []Item) error {
    var wg sync.WaitGroup
    errCh := make(chan error, 1)

    for _, item := range items {
        wg.Add(1)
        go func(i Item) {
            defer wg.Done()
            select {
            case <-ctx.Done():
                return
            default:
                if err := process(i); err != nil {
                    select {
                    case errCh <- err:
                    default:
                    }
                }
            }
        }(item)
    }

    wg.Wait()
    select {
    case err := <-errCh:
        return err
    default:
        return nil
    }
}
```

### 2. Utamakan Channel Daripada State Bersama

`sync.Mutex` di Go diperlukan dalam beberapa kasus, tetapi konkurensi Go yang idiomatis lebih mengutamakan channel. Channel lebih mudah dikomposisikan, lebih mudah dipahami, dan terintegrasi dengan bersih menggunakan pernyataan `select`.

- **Gunakan channel untuk transfer kepemilikan** (melewatkan data antar goroutine).
- **Gunakan mutex hanya untuk melindungi state internal** di struktur data tingkat rendah.
- **Channel buffered memberikan backpressure** — pilih ukuran buffer secara sengaja, bukan sembarangan.

### 3. Selalu Gunakan `select` untuk Operasi Multi-Channel

Pernyataan `select` adalah alat utama Go untuk multipleks operasi channel. Gunakan untuk menangani timeout, pembatalan, dan beberapa sumber data tanpa memblokir.

```go
select {
case res := <-resultCh:
    return res, nil
case <-ctx.Done():
    return nil, ctx.Err()
case <-time.After(5 * time.Second):
    return nil, fmt.Errorf("operasi timeout")
}
```

### 4. Sinyal dengan `chan struct{}` Bukan `chan bool`

Ketika channel digunakan murni untuk sinyal (tanpa transfer data), gunakan `chan struct{}` daripada `chan bool`. Struct kosong tidak memakan byte, menjadikannya mekanisme sinyal paling efisien dalam hal memori.

```go
done := make(chan struct{}) // sinyal: nol byte
close(done)                 // broadcast ke semua penerima
```

### 5. Disiplin Kepemilikan

Tetapkan aturan kepemilikan yang jelas untuk setiap channel dalam program Anda:

- **Pengirim yang membuat channel.**
- **Pengirim bertanggung jawab menutupnya.**
- **Channel hanya boleh ditutup sekali.** Menutup channel yang sudah ditutup menyebabkan panic.
- **Penerima tidak boleh menutup, mengirim, atau mengambil alih tanggung jawab atas channel.**

### 6. Lindungi dari Data Race

Detektor race Go (flag `-race`) adalah salah satu yang terbaik di industri. Jalankan sebagai bagian dari pipeline CI Anda:

```bash
go test -race ./...
```

Pola race condition yang umum diwaspadai:
- Tulis map secara konkuren (gunakan `sync.Map` atau map yang dilindungi mutex)
- Tulis field struct dari beberapa goroutine tanpa sinkronisasi
- Increment counter tanpa `sync/atomic`

### 7. Batasi Proliferasi Goroutine

Pembuatan goroutine tanpa batas dapat membebani scheduler dan menurunkan performa. Gunakan **worker pool** untuk membatasi konkurensi dan memberikan backpressure.

```go
func workerPool(ctx context.Context, jobs <-chan Job, numWorkers int) <-chan Result {
    results := make(chan Result, numWorkers)
    var wg sync.WaitGroup

    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                select {
                case <-ctx.Done():
                    return
                case results <- process(job):
                }
            }
        }()
    }

    go func() {
        wg.Wait()
        close(results)
    }()

    return results
}
```

## Langkah Implementasi

### Langkah 1: Bangun Fondasi Konkurensi

Mulai setiap komponen konkuren dengan **rencana kepemilikan** yang jelas:

1. Tentukan goroutine mana yang **mengirim** dan mana yang **menerima** pada setiap channel.
2. Tentukan **strategi pembatalan** — biasanya `context.Context` induk yang diturunkan dari `context.Background()` atau `context.WithCancel`.
3. Putuskan **buffering channel**: unbuffered untuk handoff sinkron, buffered untuk produsen/konsumen yang terpisah.

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel() // memastikan pembersihan bahkan pada return awal
```

### Langkah 2: Implementasi Pola Pipeline

Pola pipeline merangkai tahapan yang dihubungkan oleh channel. Setiap tahapan adalah fungsi yang menerima channel input dan mengembalikan channel output.

```go
// Tahap 1: generate angka
func gen(ctx context.Context, nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case <-ctx.Done():
                return
            case out <- n:
            }
        }
    }()
    return out
}

// Tahap 2: kuadratkan setiap angka
func sq(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case <-ctx.Done():
                return
            case out <- n * n:
            }
        }
    }()
    return out
}

// Penggunaan
ctx := context.Background()
c := gen(ctx, 2, 3, 4)
c = sq(ctx, c)
for result := range c {
    fmt.Println(result) // 4, 9, 16
}
```

### Langkah 3: Tambahkan Fan-Out / Fan-In untuk Paralelisme

Fan-out mendistribusikan pekerjaan ke beberapa goroutine. Fan-in menggabungkan beberapa channel hasil menjadi satu.

```go
// fanIn menggabungkan beberapa channel menjadi satu channel output
func fanIn(ctx context.Context, channels ...<-chan Result) <-chan Result {
    out := make(chan Result)
    var wg sync.WaitGroup

    multiplex := func(c <-chan Result) {
        defer wg.Done()
        for v := range c {
            select {
            case <-ctx.Done():
                return
            case out <- v:
            }
        }
    }

    wg.Add(len(channels))
    for _, c := range channels {
        go multiplex(c)
    }

    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}
```

### Langkah 4: Implementasi Shutdown yang Graceful

Sistem konkuren harus menangani shutdown dengan baik: menguras pekerjaan yang sedang berjalan, membatalkan operasi yang tersisa, dan melepaskan sumber daya.

```go
type Server struct {
    workers  int
    jobs     chan Job
    done     chan struct{}
}

func (s *Server) Start(ctx context.Context) {
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()

    for i := 0; i < s.workers; i++ {
        go s.worker(ctx)
    }

    <-ctx.Done()
    close(s.done)
}

func (s *Server) worker(ctx context.Context) {
    for {
        select {
        case job, ok := <-s.jobs:
            if !ok {
                return
            }
            job.Execute()
        case <-ctx.Done():
            return
        }
    }
}

func (s *Server) Shutdown() {
    <-s.done
}
```

### Langkah 5: Tambahkan Penanganan Error pada Alur Kerja Konkuren

Error di Go konkuren memerlukan perhatian khusus — panic di satu goroutine akan menghentikan seluruh program. Gunakan **error group** dan **tipe hasil** untuk mengumpulkan error dari beberapa goroutine.

```go
import "golang.org/x/sync/errgroup"

func processBatch(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)

    for _, item := range items {
        item := item // capture range variable
        g.Go(func() error {
            return processWithContext(ctx, item)
        })
    }

    return g.Wait() // mengembalikan error non-nil pertama atau nil
}
```

### Langkah 6: Uji Konkurensi dengan Detektor Race

Bug konkurensi terkenal sulit direproduksi. Selain `go test -race`, tulis pengujian yang secara eksplisit menguji akses konkuren:

```go
func TestConcurrentAccess(t *testing.T) {
    cache := NewCache()
    var wg sync.WaitGroup

    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func(key int) {
            defer wg.Done()
            cache.Set(fmt.Sprintf("key-%d", key), key)
            _, _ = cache.Get(fmt.Sprintf("key-%d", key))
        }(i)
    }

    wg.Wait()
}
```

Jalankan dengan:
```bash
go test -race -count=1 -v ./...
```

### Langkah 7: Profil dan Optimasi

Konkurensi tidak secara otomatis membuat program lebih cepat. Gunakan alat profiling bawaan Go untuk mengukur performa aktual:

```bash
# Profil CPU
go test -cpuprofile=cpu.prof -bench=.

# Trace eksekusi
go test -trace=trace.out -bench=.

# Lihat dengan go tool pprof
go tool pprof -http=:8080 cpu.prof
```

Kendala umum dalam program Go konkuren:
- **Persaingan pada channel bersama** — banyak produsen yang mengirim ke satu channel dapat menjadi bottleneck. Lakukan fan-out pada sisi penerima.
- **Overhead penjadwalan goroutine** — terlalu banyak goroutine (>100.000 aktif) dapat menurunkan performa scheduler. Gunakan worker pool.
- **False sharing di CPU cache** — field struct yang dimodifikasi oleh goroutine berbeda pada baris cache yang sama. Beri padding pada struct atau gunakan `sync.Map`.

## Insight Penting

- **Goroutine itu murah, bukan gratis.** Setiap goroutine membutuhkan ~4 KB stack dan overhead scheduler. Gunakan worker pool untuk mengelola jumlah yang besar.
- **Default ke `chan struct{}` untuk sinyal.** Ini mengkomunikasikan maksud dengan jelas dan tidak memakan byte.
- **`context.Context` adalah standar untuk pembatalan dan deadline.** Berikan sebagai parameter pertama di fungsi yang memblokir atau meluncurkan goroutine.
- **Pernyataan `select` adalah alat konkurensi paling kuat Anda.** Ini menggabungkan channel, timeout, dan pembatalan menjadi satu alur kontrol yang mudah dibaca.
- **Selalu uji dengan `-race`.** Detektor race Go menangkap data race dengan andal — jalankan di CI.

## Langkah Berikutnya

1. Pelajari postingan blog resmi Go tentang [Concurrency Patterns](https://go.dev/blog/pipelines) untuk pola pipeline yang lebih dalam.
2. Jelajahi dokumentasi paket `sync`: `sync.Mutex`, `sync.RWMutex`, `sync.Map`, `sync.Pool`, `sync.Once`.
3. Baca tentang **Scheduler** di Go — memahami M, P, G (Machine, Processor, Goroutine) membantu Anda membuat keputusan konkurensi yang lebih baik.
4. Eksperimen dengan paket `golang.org/x/sync`: `errgroup`, `semaphore`, `singleflight`.
5. Latihan dengan mengonversi pengikis HTTP sekuensial menjadi yang konkuren menggunakan worker pool dan rate limiting.

## Kesimpulan

Model konkurensi Go adalah salah satu aset terkuatnya, tetapi kekuatan datang dengan tanggung jawab. Dengan mengikuti pola dalam panduan ini — komposisi pipeline, fan-out/fan-in, worker pool, shutdown yang graceful, dan penanganan error yang tepat — Anda dapat membangun sistem konkuren yang aman, mudah dibaca, dan berperforma tinggi.

Ingat: konkurensi bukanlah paralelisme. Konkurensi tentang *struktur* — merancang program Anda sebagai komponen yang dieksekusi secara independen. Paralelisme tentang *eksekusi* — menjalankan komponen tersebut pada beberapa inti secara bersamaan. Kuasai struktur terlebih dahulu, dan performa akan mengikuti.

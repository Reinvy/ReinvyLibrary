---
title: "Cheat Sheet Konkurensi Go"
description: "Referensi cepat konkurensi Go: goroutine, channel, select, primitif sync, pembatalan context, worker pool, errgroup, dan race detector."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Konkurensi Go

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Menjalankan goroutine | `go kerjakan(ctx)` | Berjalan konkuren lalu langsung kembali |
| Channel berbuffer | `make(chan int, 10)` | Pengiriman menunggu hanya saat buffer penuh |
| Kirim dan terima | `ch <- v` / `v := <-ch` | Memindahkan nilai antar goroutine |
| Menutup channel | `close(ch)` | Menandakan selesai; penerima mendapat nilai nol |
| Iterasi channel | `for v := range ch { ... }` | Berulang sampai channel ditutup |
| Parameter berarah | `func produksi(out chan<- int)` | Mendokumentasikan channel kirim-saja atau terima-saja |
| Terima tanpa blocking | `select { case v := <-ch: ... default: }` | Tidak memblokir; `default` jalan bila belum siap |
| Menunggu grup | `var wg sync.WaitGroup; wg.Add(1); wg.Wait()` | Pola fan-in untuk N goroutine |
| Menjaga state bersama | `var mu sync.Mutex; mu.Lock(); defer mu.Unlock()` | Akses eksklusif ke state yang berubah |
| Lock banyak pembaca | `var mu sync.RWMutex; mu.RLock()` | Pembaca paralel, penulis eksklusif |
| Sekali jalan | `var once sync.Once; once.Do(initFn)` | Inisialisasi tepat satu kali |
| Counter atomik | `atomic.AddInt64(&n, 1)` | Increment tanpa lock untuk counter sederhana |
| Membatalkan turunan | `ctx, cancel := context.WithCancel(ctx)` | Menyebarkan pembatalan ke child |
| Grup terbatas | `g, ctx := errgroup.WithContext(ctx); g.SetLimit(8)` | Batas konkurensi dengan pembatalan error pertama |
| Deteksi race | `go test -race ./...` | Instrumentasi akses memori untuk data race |

## Perintah Umum

### Pemeriksaan Race dan Scheduler

```bash
# Deteksi data race pada test dan binary
go test -race ./...
go run -race ./cmd/worker

# Paksa satu CPU untuk membongkar asumsi penjadwalan
GOMAXPROCS=1 go test -run TestPipeline ./internal/pipeline

# Cetak jejak scheduler tiap detik saat program berjalan
GODEBUG=schedtrace=1000 ./bin/worker
```

### Profiling Contention

```bash
# Rekam profil block dan mutex saat benchmark berjalan
go test -bench=BenchmarkWorker -blockprofile=block.out -mutexprofile=mutex.out ./...
go tool pprof -top block.out

# Dump goroutine hidup dari proses yang sedang berjalan
curl -s localhost:6060/debug/pprof/goroutine?debug=2
```

## Potongan Kode

### Select dengan Timeout dan Pembatalan

```go
func Berikutnya(ctx context.Context, ch <-chan Event) (Event, error) {
    timer := time.NewTimer(2 * time.Second)
    defer timer.Stop()

    select {
    case ev, ok := <-ch:
        if !ok {
            return Event{}, fmt.Errorf("stream sudah ditutup")
        }
        return ev, nil
    case <-timer.C:
        return Event{}, fmt.Errorf("timeout menunggu event")
    case <-ctx.Done():
        return Event{}, ctx.Err()
    }
}
```

### Worker Pool

```go
func JalankanPool(ctx context.Context, jobs <-chan Job, workers int) error {
    var wg sync.WaitGroup
    errCh := make(chan error, workers)

    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for {
                select {
                case <-ctx.Done():
                    return
                case job, ok := <-jobs:
                    if !ok {
                        return
                    }
                    if err := job.Do(ctx); err != nil {
                        errCh <- err
                        return
                    }
                }
            }
        }()
    }

    wg.Wait()
    close(errCh)

    for err := range errCh {
        return err
    }
    return nil
}
```

### errgroup dengan Batas

```go
// import: context, golang.org/x/sync/errgroup
func Crawl(ctx context.Context, urls []string) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(8) // maksimal 8 goroutine berjalan bersamaan

    for _, url := range urls {
        url := url
        g.Go(func() error {
            // Error di sini membatalkan ctx dan menghentikan worker lain.
            return ambilDanSimpan(ctx, url)
        })
    }

    return g.Wait()
}
```

### State Bersama dengan RWMutex dan Once

```go
type Cache struct {
    mu     sync.RWMutex
    items  map[string]string
    loaded sync.Once
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    v, ok := c.items[key]
    return v, ok
}

func (c *Cache) Set(key, value string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.items[key] = value
}
```

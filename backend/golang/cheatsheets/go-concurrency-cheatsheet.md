---
title: "Go Concurrency Cheatsheet"
description: "A quick reference for Go concurrency: goroutines, channels, select, sync primitives, context cancellation, worker pools, errgroup, and the race detector."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Go Concurrency Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Start a goroutine | `go doWork(ctx)` | Runs concurrently and returns immediately |
| Buffered channel | `make(chan int, 10)` | Sends block only when the buffer is full |
| Send and receive | `ch <- v` / `v := <-ch` | Transfers a value between goroutines |
| Close a channel | `close(ch)` | Signals completion; receivers get zero values |
| Range a channel | `for v := range ch { ... }` | Loops until the channel is closed |
| Directional param | `func produce(out chan<- int)` | Documents send-only or receive-only use |
| Non-blocking receive | `select { case v := <-ch: ... default: }` | Never blocks; `default` runs when nothing is ready |
| Wait for a group | `var wg sync.WaitGroup; wg.Add(1); wg.Wait()` | Fan-in for N goroutines |
| Guard shared state | `var mu sync.Mutex; mu.Lock(); defer mu.Unlock()` | Exclusive access to mutable state |
| Read-heavy lock | `var mu sync.RWMutex; mu.RLock()` | Concurrent readers, exclusive writers |
| Run once | `var once sync.Once; once.Do(initFn)` | Initialises exactly one time |
| Atomic counter | `atomic.AddInt64(&n, 1)` | Lock-free increment of a simple counter |
| Cancel tree | `ctx, cancel := context.WithCancel(ctx)` | Propagates cancellation to children |
| Bounded group | `g, ctx := errgroup.WithContext(ctx); g.SetLimit(8)` | Concurrency cap with first-error cancellation |
| Race detection | `go test -race ./...` | Instruments memory access to catch data races |

## Common Commands

### Race and Scheduler Checks

```bash
# Detect data races in tests and binaries
go test -race ./...
go run -race ./cmd/worker

# Force one CPU to expose scheduling assumptions
GOMAXPROCS=1 go test -run TestPipeline ./internal/pipeline

# Print scheduler traces every second while running
GODEBUG=schedtrace=1000 ./bin/worker
```

### Profiling Contention

```bash
# Record block and mutex profiles during a benchmark
go test -bench=BenchmarkWorker -blockprofile=block.out -mutexprofile=mutex.out ./...
go tool pprof -top block.out

# Dump live goroutines from a running process
curl -s localhost:6060/debug/pprof/goroutine?debug=2
```

## Code Snippets

### Select with Timeout and Cancellation

```go
func Next(ctx context.Context, ch <-chan Event) (Event, error) {
    timer := time.NewTimer(2 * time.Second)
    defer timer.Stop()

    select {
    case ev, ok := <-ch:
        if !ok {
            return Event{}, fmt.Errorf("stream closed")
        }
        return ev, nil
    case <-timer.C:
        return Event{}, fmt.Errorf("timed out waiting for event")
    case <-ctx.Done():
        return Event{}, ctx.Err()
    }
}
```

### Worker Pool

```go
func RunPool(ctx context.Context, jobs <-chan Job, workers int) error {
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

### Bounded errgroup

```go
// imports: context, golang.org/x/sync/errgroup
func Crawl(ctx context.Context, urls []string) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(8) // at most 8 goroutines in flight

    for _, url := range urls {
        url := url
        g.Go(func() error {
            // An error here cancels ctx and stops the remaining workers.
            return fetchAndStore(ctx, url)
        })
    }

    return g.Wait()
}
```

### Shared State with RWMutex and Once

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

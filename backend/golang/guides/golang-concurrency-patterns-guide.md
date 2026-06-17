---
title: "Go Concurrency Patterns Guide"
description: "A comprehensive guide to concurrency patterns in Go — goroutines, channels, synchronization primitives, and production-grade best practices for building concurrent systems."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Go Concurrency Patterns Guide

## Introduction

Concurrency is one of Go's standout features, baked directly into the language through goroutines and channels. Unlike traditional threading models that rely on operating system threads and shared memory synchronization, Go offers a lightweight concurrency model built on **CSP (Communicating Sequential Processes)** principles: *"Do not communicate by sharing memory; instead, share memory by communicating."*

This guide covers production-grade concurrency patterns in Go. It assumes familiarity with Go syntax and basic goroutine/channel usage. You will learn how to structure concurrent programs that are correct, maintainable, and performant — avoiding common pitfalls like deadlocks, race conditions, and goroutine leaks.

## Best Practices

### 1. Goroutine Lifecycle Management

Every goroutine you spawn must have a guaranteed exit path. An orphaned goroutine that blocks forever causes a **goroutine leak**, gradually consuming memory and file descriptors.

- **Always know when and why a goroutine exits.** Use `context.Context` for cancellation signals.
- **Use `sync.WaitGroup` to wait for goroutine completion** before shutting down.
- **Avoid launching goroutines inside libraries** — let the caller decide concurrency.

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

### 2. Prefer Channels Over Shared State

Go's `sync.Mutex` is necessary in some cases, but idiomatic Go concurrency prefers channels. Channels compose better, are easier to reason about, and integrate cleanly with `select` statements.

- **Use channels for ownership transfer** (passing data between goroutines).
- **Use mutexes only for protecting internal state** in low-level data structures.
- **Buffered channels provide backpressure** — choose buffer sizes intentionally, not arbitrarily.

### 3. Always Use `select` for Multi-Channel Operations

The `select` statement is Go's primary tool for multiplexing channel operations. Use it to handle timeouts, cancellation, and multiple data sources without blocking.

```go
select {
case res := <-resultCh:
    return res, nil
case <-ctx.Done():
    return nil, ctx.Err()
case <-time.After(5 * time.Second):
    return nil, fmt.Errorf("operation timed out")
}
```

### 4. Signal with `chan struct{}` Not `chan bool`

When a channel is used purely for signaling (no data transfer), use `chan struct{}` instead of `chan bool`. An empty struct occupies zero bytes, making it the most memory-efficient signaling mechanism.

```go
done := make(chan struct{}) // signaling: zero bytes
close(done)                 // broadcast to all receivers
```

### 5. Ownership Discipline

Establish clear ownership rules for every channel in your program:

- **The sender creates the channel.**
- **The sender is responsible for closing it.**
- **A channel should only be closed once.** Closing a closed channel panics.
- **Receivers should never close, send on, or assume responsibility for a channel.**

### 6. Protect Against Data Races

Go's race detector (`-race` flag) is one of the best in the industry. Run it as part of your CI pipeline:

```bash
go test -race ./...
```

Common race condition patterns to watch for:
- Concurrent map writes (use `sync.Map` or a mutex-guarded map)
- Struct field writes from multiple goroutines without synchronization
- Incrementing counters without `sync/atomic`

### 7. Limit Goroutine Proliferation

Unbounded goroutine creation can overwhelm the scheduler and degrade performance. Use **worker pools** to cap concurrency and provide backpressure.

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

## Implementation Steps

### Step 1: Establish the Concurrency Foundation

Start every concurrent component with a clear **ownership plan**:

1. Define which goroutines **send** and which **receive** on each channel.
2. Define the **cancellation strategy** — typically a parent `context.Context` derived from `context.Background()` or `context.WithCancel`.
3. Decide on **channel buffering**: unbuffered for synchronous handoffs, buffered for decoupled producers/consumers.

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel() // ensures cleanup even on early return
```

### Step 2: Implement the Pipeline Pattern

The pipeline pattern chains stages connected by channels. Each stage is a function that takes an input channel and returns an output channel.

```go
// Stage 1: generate numbers
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

// Stage 2: square each number
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

// Usage
ctx := context.Background()
c := gen(ctx, 2, 3, 4)
c = sq(ctx, c)
for result := range c {
    fmt.Println(result) // 4, 9, 16
}
```

### Step 3: Add Fan-Out / Fan-In for Parallelism

Fan-out distributes work across multiple goroutines. Fan-in merges multiple result channels into one.

```go
// fanIn merges multiple channels into a single output channel
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

### Step 4: Implement Graceful Shutdown

A concurrent system must handle shutdown gracefully: drain in-flight work, cancel remaining operations, and release resources.

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

### Step 5: Add Error Handling to Concurrent Workflows

Errors in concurrent Go require special care — a panic in one goroutine crashes the entire program. Use **error groups** and **result types** to collect errors from multiple goroutines.

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

    return g.Wait() // returns first non-nil error or nil
}
```

### Step 6: Test Concurrency with the Race Detector

Concurrency bugs are notoriously hard to reproduce. In addition to `go test -race`, write tests that explicitly exercise concurrent access:

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

Run with:
```bash
go test -race -count=1 -v ./...
```

### Step 7: Profile and Optimize

Concurrency doesn't automatically make programs faster. Use Go's built-in profiling tools to measure actual performance:

```bash
# CPU profile
go test -cpuprofile=cpu.prof -bench=.

# Trace execution
go test -trace=trace.out -bench=.

# View with go tool pprof
go tool pprof -http=:8080 cpu.prof
```

Common bottlenecks in concurrent Go programs:
- **Contention on shared channels** — multiple producers sending to a single channel can become a bottleneck. Fan-out the receiving side.
- **goroutine scheduling overhead** — too many goroutines (>100,000 active) can degrade scheduler performance. Use worker pools.
- **False sharing in CPU caches** — struct fields modified by different goroutines on the same cache line. Pad structs or use `sync.Map`.

## Key Insights

- **Goroutines are cheap, not free.** Each goroutine costs ~4 KB of stack and scheduler overhead. Use worker pools to manage large numbers.
- **Default to `chan struct{}` for signals.** It communicates intent clearly and occupies zero bytes.
- **`context.Context` is the standard for cancellation and deadlines.** Thread it as the first parameter in any function that blocks or spawns goroutines.
- **The `select` statement is your most powerful concurrency tool.** It composes channels, timeouts, and cancellation into a single, readable control flow.
- **Test with `-race` always.** The Go race detector catches data races reliably — run it in CI.

## Next Steps

1. Study Go's official [Concurrency Patterns](https://go.dev/blog/pipelines) blog post for deeper pipeline patterns.
2. Explore the `sync` package documentation: `sync.Mutex`, `sync.RWMutex`, `sync.Map`, `sync.Pool`, `sync.Once`.
3. Read about the **Scheduler** in Go — understanding M, P, G (Machine, Processor, Goroutine) helps you make better concurrency decisions.
4. Experiment with the `golang.org/x/sync` package: `errgroup`, `semaphore`, `singleflight`.
5. Practice by converting a sequential HTTP scraper into a concurrent one using worker pools and rate limiting.

## Conclusion

Go's concurrency model is one of its strongest assets, but power comes with responsibility. By following the patterns in this guide — pipeline composition, fan-out/fan-in, worker pools, graceful shutdown, and proper error handling — you can build concurrent systems that are safe, readable, and performant.

Remember: concurrency is not parallelism. Concurrency is about *structure* — designing your program as independently executing components. Parallelism is about *execution* — running those components on multiple cores simultaneously. Master the structure first, and the performance will follow.

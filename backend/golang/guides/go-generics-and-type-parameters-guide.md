---
title: "Go Generics and Type Parameters Guide"
description: "Design patterns for Go generics: building constraints that compose, keeping type parameter lists readable, structuring generic containers versus generic algorithms, and measuring the real cost of instantiation before generalizing production code."
category: "backend"
technology: "golang"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Go Generics and Type Parameters Guide

## Introduction

Generics arrived in Go 1.18 and changed how libraries are written, but not how they fail. The most common production problem is no longer the absence of type parameters — it is generic code that is harder to read, harder to debug, and no faster than the interface-based version it replaced. A `func Map[T any, U any]([]T, func(T) U) []U` helper is trivial; a repository abstraction with four type parameters and a nested constraint chain is a maintenance liability that reviewers will quietly stop understanding.

This guide covers the design side of generics in Go: how to write constraints that describe behavior instead of enumerating types, when a generic container earns its complexity and when a plain struct with one type parameter is already too much, how to keep the zero-value contract honest, and what the compiler actually does at instantiation time when you are deciding whether generics will remove your allocation bottleneck. Every recommendation below is demonstrated against a working module, including benchmarks that compare a generic implementation against the interface-and-type-assertion version so the trade-off is measured rather than assumed.

The audience is a Go developer who already writes interfaces fluently and now needs to publish generic APIs to other teams — internal platform libraries, collection helpers, result types, typed caches — without turning a shared package into an unreviewable puzzle.

## Best Practices

### 1. Constrain on Behavior, Not Concrete Types

A constraint should describe the operations the function needs, not the list of types you happened to test with. When the constraint is `int64 | float64`, callers who have a named `Amount` type are locked out and every new numeric type means editing the library. Use a union of underlying-type approximations (`~`) wrapped in a named interface so the intent is documented once:

```go
type Number interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
        ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
        ~float32 | ~float64
}
```

The `~` prefix admits any type whose underlying type matches, so `type Amount int64` satisfies `Number` without an explicit conversion at every call site. Named constraints also give you a place to put a doc comment, which raw unions do not.

### 2. Keep Type Parameter Lists Short and Purposeful

One type parameter is almost always free. Two is usually fine (`Map[T, U]`). Three or more is a design smell that usually means the abstraction is carrying configuration that belongs in a struct field or a plain function value. If a signature reads `func Process[A any, B any, C comparable, D Number](...)`, the reviewer cannot hold the contract in their head, and type inference will start failing in ways that force callers to spell out every argument explicitly. Reach for a struct with fields instead.

### 3. Prefer Generic Types for Containers, Generic Functions for Algorithms

Generic types age well when they model a container of values (`Cache[K, V]`, `Stack[T]`, `Result[T]`), because the type parameter appears in the type's identity and callers read it once at construction. Generic functions age well for a single well-known algorithm (`Map`, `Filter`, `Must`). What ages badly is a generic function whose type parameter is only used to pass data through — at that point you have written a slower `any` with extra syntax.

### 4. Design Constraints as Composable Interfaces

Compose small constraints rather than writing one large union. A constraint that embeds two others is self-documenting, and the embedded names can be reused by callers who need a narrower contract:

```go
type Ordered interface {
    Number | ~string
}

type Key interface {
    comparable
    fmt.Stringer
}
```

`comparable` is a predeclared constraint and can be embedded directly. Keep a rule: a constraint with more than about six lines of union members is a candidate for splitting into `Signed`, `Unsigned`, `Floating` and composing them.

### 5. Honor the Zero-Value Contract

Generic code cannot assume a value is valid. `var zero T` is legal for every `T`, and any generic function returning `(T, error)` must return the zero value on failure — never a half-initialized struct. Callers write `if err != nil` and discard the value, but linters and tests should assert it. Similarly, a generic map or slice helper must return an empty-but-non-nil result only when the caller expects one; returning `nil` for an empty `[]T` surprises anyone marshalling to JSON, where `nil` becomes `null` and `[]T{}` becomes `[]`.

### 6. Do Not Generalize Single-Use Code

Generics buy reuse across types. If a helper has exactly one caller with exactly one type, the type parameter is pure indirection: it costs readability now and buys nothing until a second caller appears. Write the concrete version, ship it, and generalize when the second and third call site prove the shared shape. The classic over-generalization is a generic `Handler[Req, Res]` for an HTTP service with three routes — the interface version is shorter, testable, and produces better stack traces.

### 7. Never Add a Type Parameter to Fix a Type Assertion

If code needs `any` plus a type switch to work today, converting that switch into a constraint is worth doing only when the set of types is closed and known. If the set is open — plugin payloads, decoded JSON, dynamic configuration — a constraint forces every new type to be a code change in the library. In that case, keep `any` and validate at the boundary.

### 8. Know the Cost Model Before Claiming a Performance Win

Go compiles generics with GC shape stenciling: types that share a memory layout share one instantiation, and interface-shaped parameters are passed through a dictionary with dynamic dispatch. Value types with different shapes (for example `int` and `float64`) get their own instantiations, which is fast; pointer-shaped instantiations share code and dispatch through the dictionary, which is closer to interface cost than people expect. Always benchmark generic versus interface-based before you claim generics removed an allocation or a dispatch. The benchmark steps below exist for exactly this reason.

## Implementation Steps

### Step 1: Create the Module and Record a Baseline

Start with a module and one benchmark against the interface-based implementation you intend to replace, so the comparison is honest from the first commit.

```bash
mkdir genericsguide && cd genericsguide
go mod init example.com/genericsguide
go version
```

```go
// baseline_test.go
package genericsguide

import "testing"

// The pre-generics shape: any + assertion, or an interface with a Sum method.
type Value interface{ Int64() int64 }

type IntVal int64

func (v IntVal) Int64() int64 { return int64(v) }

func SumInterface(values []Value) int64 {
    var total int64
    for _, v := range values {
        total += v.Int64()
    }
    return total
}

func BenchmarkSumInterface(b *testing.B) {
    values := make([]Value, 1024)
    for i := range values {
        values[i] = IntVal(i)
    }
    b.ReportAllocs()
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _ = SumInterface(values)
    }
}
```

Run `go test -bench=Sum -benchmem` and write the numbers down. Every later claim about generics is compared against this line.

### Step 2: Define the Constraint Once, in Its Own Package

Put reusable constraints in a small package with no dependencies so both your library and its consumers can import them without cycles.

```go
// constraints/constraints.go
package constraints

// Number admits every built-in numeric kind, including named types
// whose underlying type is numeric (type Amount int64 satisfies Number).
type Number interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
        ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
        ~float32 | ~float64
}

// Ordered adds strings to Number for sorting and comparison helpers.
type Ordered interface {
    Number | ~string
}
```

Go 1.21 and later ship `cmp.Ordered`, which covers the same ground for the standard library's `slices` and `maps` packages. Prefer `cmp.Ordered` when you only need comparison, and keep your own `Number` only if you need arithmetic.

### Step 3: Write the Generic Function Against the Constraint

```go
// sum.go
package genericsguide

import "example.com/genericsguide/constraints"

func Sum[T constraints.Number](values []T) T {
    var total T
    for _, v := range values {
        total += v
    }
    return total
}

// Amount is a named numeric type; the ~ in Number admits it with no conversion.
type Amount int64

func Cents[T constraints.Number](values []T) int64 {
    return int64(Sum(values))
}
```

Named types now pass straight into `Sum` without a conversion loop at every call site — this is the first concrete payoff of the `~` approximation, and it is the reason to prefer it over a bare union.

### Step 4: Build a Generic Container, Not a Generic Wrapper

A typed cache is the canonical case where generics are clearly worth it: keys must be hashable, values are opaque, and the alternative is `map[string]any` with assertions on every `Get`.

```go
// cache.go
package genericsguide

import (
    "sync"
    "time"
)

type entry[V any] struct {
    value   V
    expires time.Time
}

type Cache[K comparable, V any] struct {
    mu      sync.Mutex
    entries map[K]entry[V]
    ttl     time.Duration
}

func NewCache[K comparable, V any](ttl time.Duration) *Cache[K, V] {
    return &Cache[K, V]{
        entries: make(map[K]entry[V]),
        ttl:     ttl,
    }
}

func (c *Cache[K, V]) Get(key K) (V, bool) {
    c.mu.Lock()
    defer c.mu.Unlock()
    e, ok := c.entries[key]
    if !ok || time.Now().After(e.expires) {
        delete(c.entries, key)
        var zero V
        return zero, false
    }
    return e.value, true
}

func (c *Cache[K, V]) Set(key K, value V) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.entries[key] = entry[V]{value: value, expires: time.Now().Add(c.ttl)}
}
```

Two details matter here. The `entry[V]` struct is generic but unexported, so the public API stays a single type parameter pair. The `Get` miss path returns `var zero V` rather than a nil pointer — callers with value types get a usable zero value and no surprises.

### Step 5: Model Outcomes Instead of Returning `any`

A generic `Result[T]` removes the most common source of assertions in service code while keeping error handling idiomatic.

```go
// result.go
package genericsguide

type Result[T any] struct {
    value T
    err   error
}

func OK[T any](value T) Result[T]         { return Result[T]{value: value} }
func Fail[T any](err error) Result[T]     { return Result[T]{err: err} }
func (r Result[T]) Unwrap() (T, error)    { return r.value, r.err }
func (r Result[T]) IsOK() bool            { return r.err == nil }

// MapResult transforms the success value and propagates failure untouched.
func MapResult[T, U any](r Result[T], fn func(T) U) Result[U] {
    if r.err != nil {
        return Fail[U](r.err)
    }
    return OK(fn(r.value))
}
```

Note that methods on a generic type cannot declare their own type parameters. `MapResult` is therefore a package-level function taking the receiver as its first argument; trying to write `func (r Result[T]) Map[U any](...)` does not compile.

### Step 6: Decide Repository Shape With a Measured Trade-Off

A generic repository works when every entity exposes an identity method. It fails when entities need different queries, and the failure is expensive because each special case becomes an interface method with a `not implemented` body.

```go
// repo.go
package genericsguide

import "context"

type Entity interface {
    GetID() string
}

type Repository[T Entity] interface {
    Find(ctx context.Context, id string) (T, error)
    List(ctx context.Context, limit int) ([]T, error)
    Save(ctx context.Context, item T) error
}

type MemoryRepo[T Entity] struct {
    mu    sync.RWMutex
    items map[string]T
}

func NewMemoryRepo[T Entity]() *MemoryRepo[T] {
    return &MemoryRepo[T]{items: make(map[string]T)}
}

func (r *MemoryRepo[T]) Find(_ context.Context, id string) (T, error) {
    r.mu.RLock()
    defer r.mu.RUnlock()
    item, ok := r.items[id]
    if !ok {
        var zero T
        return zero, ErrNotFound
    }
    return item, nil
}

func (r *MemoryRepo[T]) Save(_ context.Context, item T) error {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.items[item.GetID()] = item
    return nil
}
```

Add the `sync` import and a sentinel `ErrNotFound`. The rule to hold: generalize only the operations that are genuinely identical across every entity (fetch by id, list, save). Anything entity-specific stays a concrete method on a concrete type — do not add a type parameter to a query that only one entity will ever run.

### Step 7: Benchmark the Generic Path Against the Interface Path

Same input, same work, both compiled in the same test binary.

```go
func BenchmarkSumGeneric(b *testing.B) {
    values := make([]Amount, 1024)
    for i := range values {
        values[i] = Amount(i)
    }
    b.ReportAllocs()
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _ = Sum(values)
    }
}
```

```bash
go test -bench=Sum -benchmem -count=6
go test -bench=Sum -benchmem -cpu=1,4,8
```

Read the result carefully. `Sum` over `Amount` (underlying `int64`) gets a dedicated instantiation, so it typically beats the interface version by removing the indirect call per element with zero allocations. Now repeat the experiment with `[]Value` replaced by a slice of pointers and observe the delta shrink — pointer-shaped instantiations dispatch through the dictionary, and the win disappears. That is the signal that generics are not buying you performance in that particular code, and the decision should be made on type safety alone.

### Step 8: Vet, Lint, and Document the Public Generic API

Generics surface new failure modes that `go vet` catches late and reviewers catch later.

```bash
go vet ./...
go test ./... -race -count=1
staticcheck ./...
```

Checklist before publishing a generic package:

1. Every exported type parameter is named in a doc comment (`Cache[K comparable, V any]` — say what `K` must be and what happens on a miss).
2. Every constraint lives in a named type with a doc comment, not an inline union.
3. Every generic function that returns `(T, error)` documents the value returned on error.
4. Every container type has a test that instantiates it with at least one named type and one built-in type, because those exercise different instantiation paths.
5. No exported API requires a caller to specify a type argument that could have been inferred.

If a caller has to write `Sum[int64](values)` because inference failed, the signature is wrong — usually a type parameter appears only in the return position or inside a nested function type.

### Step 9: Migrate Existing Code Incrementally

Do not rewrite an interface-based library in one commit. Convert one call site at a time and keep both implementations behind the same tests.

```text
Phase 1: add constraints package + generic helper alongside the interface version
Phase 2: migrate one internal caller, keep the interface version exported
Phase 3: run both under the same test table and benchmark them
Phase 4: delete the interface version only when no external caller imports it
```

Deleting the old API is the step that breaks downstream builds, so it belongs in a separate release with a deprecation note, never in the same pull request that introduces the generic version.

## Conclusion

Generics in Go are a precision tool for typed containers and small algorithms, not a general-purpose abstraction mechanism. The rules that keep them maintainable are consistent: constrain on behavior with named, composable constraints using `~`; keep type parameters to one or two; prefer containers over pass-through wrappers; respect the zero value; refuse to generalize code with a single caller; and benchmark before claiming a performance win, because GC shape stenciling means pointer-shaped instantiations behave much like interfaces. Applied that way, generics remove assertions from hot paths and make library contracts explicit instead of adding indirection. Applied loosely, they produce APIs nobody can review — which is why the discipline in this guide matters more than the syntax itself.

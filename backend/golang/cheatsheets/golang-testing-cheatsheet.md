---
title: "Go Testing Cheatsheet"
description: "A quick reference for Go tests: table-driven cases, subtests, parallel runs, benchmarks, httptest, testify, coverage, and fuzzing."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Go Testing Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Declare a test | `func TestAdd(t *testing.T)` | Test functions start with `Test` and take `*testing.T` |
| Add a subtest | `t.Run("name", func(t *testing.T) { ... })` | Isolated case with its own `*testing.T` |
| Run in parallel | `t.Parallel()` | Pauses until sequential tests in the parent finish |
| Mark a helper | `t.Helper()` | Reports the caller's line, not the helper's |
| Fail and continue | `t.Errorf("got %d, want %d", got, want)` | Records failure, keeps running |
| Fail immediately | `t.Fatalf("unexpected error: %v", err)` | Records failure and stops this test |
| Cleanup hook | `t.Cleanup(func() { ... })` | Runs after the test and all subtests |
| Benchmark | `func BenchmarkParse(b *testing.B)` | Loops `b.N` times; call `b.ResetTimer()` after setup |
| Fake HTTP handler | `httptest.NewRecorder()` | Captures status, headers, and body in memory |
| Fake HTTP server | `httptest.NewServer(h)` | Real listener for client-side tests |
| Fuzz target | `func FuzzReverse(f *testing.F)` | Seed via `f.Add`, assert via `f.Fuzz` |
| Coverage profile | `go test -coverprofile=cover.out ./...` | Writes a profile for `go tool cover` |
| Race detection | `go test -race ./...` | Catches data races during tests |
| Assert with testify | `require.NoError(t, err)` | Stops the test on a non-nil error |

## Common Commands

### Running Tests

```bash
# Every package in the module, verbose
go test -v ./...

# One test or subtest by regex
go test -run 'TestParse/empty_input' ./pkg/parser

# Stop on first failure with a hard timeout
go test -failfast -timeout 60s ./...
```

### Coverage, Benchmarks, and Fuzzing

```bash
# Coverage profile plus per-function summary
go test -coverprofile=cover.out -covermode=atomic ./...
go tool cover -func=cover.out

# Benchmarks with allocation stats
go test -bench='BenchmarkParse' -benchmem ./...

# Fuzz for 30 seconds, then replay failures from testdata/fuzz
go test -fuzz=FuzzReverse -fuzztime=30s ./pkg/text
```

## Code Snippets

### Table-Driven Test with Parallel Subtests

```go
package calc

import "testing"

func TestDivide(t *testing.T) {
    tests := []struct {
        name      string
        a, b      int
        want      int
        wantError bool
    }{
        {name: "positive", a: 10, b: 2, want: 5},
        {name: "negative", a: -9, b: 3, want: -3},
        {name: "zero_divisor", a: 1, b: 0, wantError: true},
    }

    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()

            got, err := Divide(tc.a, tc.b)
            switch {
            case tc.wantError && err == nil:
                t.Fatalf("Divide(%d, %d): expected an error", tc.a, tc.b)
            case err != nil:
                t.Fatalf("Divide(%d, %d): %v", tc.a, tc.b, err)
            case got != tc.want:
                t.Errorf("Divide(%d, %d) = %d, want %d", tc.a, tc.b, got, tc.want)
            }
        })
    }
}
```

### HTTP Handler Test with httptest

```go
// imports: net/http, net/http/httptest, encoding/json, testing
func TestGetUser(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/users/42", nil)
    rec := httptest.NewRecorder()

    GetUser(rec, req)

    res := rec.Result()
    defer res.Body.Close()

    if res.StatusCode != http.StatusOK {
        t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusOK)
    }

    var body struct{ ID int `json:"id"` }
    if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
        t.Fatalf("decode response: %v", err)
    }
    if body.ID != 42 {
        t.Errorf("id = %d, want 42", body.ID)
    }
}
```

### Assertions with Testify

```go
// imports: testing, github.com/stretchr/testify/assert, .../require
func TestCreateOrder(t *testing.T) {
    repo := NewMemoryRepo()
    order, err := repo.Create(Order{CustomerID: "c_1", Total: 2500})

    require.NoError(t, err)
    require.NotNil(t, order)
    assert.NotEmpty(t, order.ID)
    assert.Equal(t, 2500, order.Total)
}
```

### Benchmark and Fuzz Target

```go
// imports: strings, testing, unicode/utf8
func BenchmarkJoin(b *testing.B) {
    parts := []string{"alpha", "beta", "gamma"}
    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        _ = strings.Join(parts, ",")
    }
}

func FuzzReverse(f *testing.F) {
    f.Add("hello")

    f.Fuzz(func(t *testing.T, input string) {
        if !utf8.ValidString(input) {
            t.Skip("invalid UTF-8")
        }
        if twice := Reverse(Reverse(input)); twice != input {
            t.Fatalf("double reverse changed %q into %q", input, twice)
        }
    })
}
```

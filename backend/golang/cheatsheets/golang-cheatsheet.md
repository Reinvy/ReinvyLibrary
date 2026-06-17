---
title: "Golang Cheatsheet"
description: "A comprehensive quick reference guide for Go syntax, CLI commands, concurrency primitives, common patterns, and standard library packages."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Golang Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Initialize module | `go mod init example.com/myapp` | Creates a new `go.mod` file for dependency tracking |
| Add dependency | `go get github.com/gorilla/mux` | Downloads and adds a dependency to `go.mod` |
| Tidy dependencies | `go mod tidy` | Removes unused deps and adds missing ones |
| Build binary | `go build -o myapp ./cmd/main.go` | Compiles the package into an executable binary |
| Run directly | `go run ./cmd/main.go` | Compiles and runs without producing a binary |
| Run all tests | `go test ./...` | Executes all tests in the module with cached results |
| Run tests verbose | `go test -v ./...` | Runs all tests with detailed output |
| Run tests with race | `go test -race ./...` | Detects data races during test execution |
| Format code | `go fmt ./...` | Auto-formats all Go source files in the module |
| Vet code | `go vet ./...` | Reports suspicious constructs (e.g., unreachable code) |
| Static analysis | `go vet -vettool=$(which staticcheck) ./...` | Runs `staticcheck` for deeper linting |
| Generate coverage | `go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out` | Generates and opens HTML coverage report |
| Install tools | `go install golang.org/x/tools/cmd/[...]@latest` | Installs Go tools to `$GOPATH/bin` |
| Cross-compile | `GOOS=linux GOARCH=amd64 go build ./cmd/main.go` | Builds for a different OS/architecture |
| List deps | `go list -m all` | Lists all direct and indirect dependencies |
| Check updates | `go list -u -m all` | Lists available dependency updates |
| Visualize deps | `go mod graph` | Prints the dependency graph (pipe to `graphviz` for visual) |

## Common Commands

### Module Management

```bash
# Initialize a new module
go mod init github.com/username/my-service

# Add a specific version of a dependency
go get github.com/gin-gonic/gin@v1.9.1

# Upgrade all dependencies to latest minor/patch
go get -u ./...

# Vendor dependencies (for offline builds or reproducible builds)
go mod vendor

# Verify downloaded modules haven't been tampered with
go mod verify

# Clean module cache (frees disk space)
go clean -modcache
```

### Building and Running

```bash
# Build for current platform
go build -ldflags="-s -w" -o bin/server ./cmd/server
# -ldflags="-s -w" strips debug info for smaller binaries

# Build with build-time variables
go build -ldflags="-X main.version=1.2.0 -X main.commit=$(git rev-parse HEAD)" -o bin/app .

# Cross-compile to multiple targets
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o bin/server-linux-arm64 .
GOOS=darwin GOARCH=amd64 go build -o bin/server-darwin-amd64 .
GOOS=windows GOARCH=amd64 go build -o bin/server.exe .

# Run with build tags (conditional compilation)
go run -tags=integration ./cmd/tests

# Install binary to $GOPATH/bin
go install ./cmd/server
```

### Testing

```bash
# Run tests with race detector and coverage
go test -race -coverprofile=coverage.out -covermode=atomic ./...

# Run specific test function
go test -run ^TestCreateUser$ ./internal/repository

# Run tests in short mode (skip integration tests)
go test -short ./...

# Run tests with memory sanitizer
go test -msan ./...

# Benchmark a specific function
go test -bench=^BenchmarkHashPassword$ -benchmem ./...

# Fuzz testing (Go 1.18+)
go test -fuzz=^FuzzParsePhoneNumber$ -fuzztime=30s ./internal/validation
```

### Code Quality

```bash
# Format all files (non-destructive, prints diffs)
gofmt -d ./

# Format and write in-place
gofmt -w ./

# Run go vet with all analyzers enabled
go vet -all ./...

# Check for nilness issues
go vet -vettool=$(which nilness) ./...

# Run staticcheck (install first: go install honnef.co/go/tools/cmd/staticcheck@latest)
staticcheck ./...

# Check for struct alignment issues
go vet -fieldalignment ./internal/models
```

### Profiling and Debugging

```bash
# CPU profiling (run tests with profile)
go test -cpuprofile=cpu.prof -memprofile=mem.prof -bench=. ./...

# Analyze CPU profile
go tool pprof -http=:8080 cpu.prof

# Create a trace file
go test -trace=trace.out ./...

# Analyze trace
go tool trace trace.out

# Check compiler optimizations on a function
go tool compile -S -l main.go 2>&1 | grep -A5 "TEXT.*myFunction"

# Build with race detector for development
go build -race -o bin/server .
```

## Code Snippets

### Package and Imports

```go
package repository

import (
    "context"
    "database/sql"
    "errors"
    "fmt"
    "time"

    "github.com/lib/pq"
    "go.uber.org/zap"
)
```

### Structs with Tags and Methods

```go
// User represents a user in the system.
// Struct tags are used by JSON encoding and validation libraries.
type User struct {
    ID        int64     `json:"id" db:"user_id"`
    Email     string    `json:"email" validate:"required,email"`
    Name      string    `json:"name" validate:"required,min=2,max=100"`
    Role      Role      `json:"role"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

type Role string

const (
    RoleAdmin Role = "admin"
    RoleUser  Role = "user"
    RoleViewer Role = "viewer"
)

// IsAdmin returns true if the user has admin role.
func (u User) IsAdmin() bool {
    return u.Role == RoleAdmin
}

// FullName returns the formatted display name.
func (u User) FullName() string {
    if u.Name == "" {
        return "Unknown User"
    }
    return u.Name
}
```

### Error Handling Patterns

```go
import (
    "errors"
    "fmt"
)

// Sentinel errors — compare with errors.Is
var (
    ErrNotFound   = errors.New("resource not found")
    ErrConflict   = errors.New("resource already exists")
    ErrForbidden  = errors.New("action not permitted")
    ErrValidation = errors.New("validation failed")
)

// Wrapping errors with context
func GetUser(ctx context.Context, id int64) (*User, error) {
    user, err := db.FindUserByID(ctx, id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, fmt.Errorf("get user %d: %w", id, ErrNotFound)
        }
        return nil, fmt.Errorf("get user %d: %w", id, err)
    }
    return user, nil
}

// Custom error type with structured fields
type ValidationError struct {
    Field   string `json:"field"`
    Reason  string `json:"reason"`
    Value   any    `json:"value,omitempty"`
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("validation: %s %s (got %v)", e.Field, e.Reason, e.Value)
}

func (e ValidationError) Unwrap() error {
    return ErrValidation
}
```

### Concurrency: Goroutines and Channels

```go
// Fan-Out pattern: distribute work across multiple workers
func ProcessOrders(ctx context.Context, orders <-chan Order, numWorkers int) <-chan Result {
    results := make(chan Result, numWorkers)

    var wg sync.WaitGroup
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func(workerID int) {
            defer wg.Done()
            for order := range orders {
                select {
                case <-ctx.Done():
                    return
                default:
                    result := processOrder(ctx, order)
                    result.WorkerID = workerID
                    results <- result
                }
            }
        }(i)
    }

    // Close results channel when all workers complete
    go func() {
        wg.Wait()
        close(results)
    }()

    return results
}

// Graceful shutdown with signal handling
func GracefulShutdown(ctx context.Context, srv *http.Server, shutdownTimeout time.Duration) error {
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("Shutting down server...")

    shutdownCtx, cancel := context.WithTimeout(ctx, shutdownTimeout)
    defer cancel()

    if err := srv.Shutdown(shutdownCtx); err != nil {
        return fmt.Errorf("server forced to shutdown: %w", err)
    }

    log.Println("Server exited gracefully")
    return nil
}

// Pipeline: chain of channel stages
func pipelineExample() {
    // Stage 1: generate numbers
    nums := make(chan int)
    go func() {
        defer close(nums)
        for i := 1; i <= 100; i++ {
            nums <- i
        }
    }()

    // Stage 2: square each number
    squares := make(chan int)
    go func() {
        defer close(squares)
        for n := range nums {
            squares <- n * n
        }
    }()

    // Stage 3: consume
    for s := range squares {
        fmt.Println(s)
    }
}
```

### Interface and Dependency Injection

```go
// Repository interface — defines the contract
type UserRepository interface {
    FindByID(ctx context.Context, id int64) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    Create(ctx context.Context, user *User) error
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id int64) error
}

// PostgreSQL implementation
type PostgresUserRepository struct {
    db  *sql.DB
    log *zap.Logger
}

func NewPostgresUserRepository(db *sql.DB, log *zap.Logger) *PostgresUserRepository {
    return &PostgresUserRepository{db: db, log: log}
}

func (r *PostgresUserRepository) FindByID(ctx context.Context, id int64) (*User, error) {
    query := `SELECT user_id, email, name, role, created_at, updated_at FROM users WHERE user_id = $1`
    row := r.db.QueryRowContext(ctx, query, id)

    var u User
    err := row.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.CreatedAt, &u.UpdatedAt)
    if err != nil {
        return nil, fmt.Errorf("find user by id: %w", err)
    }
    return &u, nil
}

// Service layer — uses interface (dependency inversion)
type UserService struct {
    repo UserRepository
    log  *zap.Logger
}

func NewUserService(repo UserRepository, log *zap.Logger) *UserService {
    return &UserService{repo: repo, log: log}
}

func (s *UserService) GetUser(ctx context.Context, id int64) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        s.log.Warn("failed to fetch user", zap.Int64("user_id", id), zap.Error(err))
        return nil, err
    }
    return user, nil
}
```

### Context Usage

```go
// Context carries deadlines, cancellation signals, and request-scoped values
func Handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Set a timeout per request
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    userID, err := extractUserID(r)
    if err != nil {
        http.Error(w, "invalid user id", http.StatusBadRequest)
        return
    }

    user, err := userService.GetUser(ctx, userID)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            http.Error(w, "user not found", http.StatusNotFound)
            return
        }
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(user)
}

// Context value keys should be typed to avoid collisions
type contextKey string

const (
    ContextKeyUserID    contextKey = "user_id"
    ContextKeyRequestID contextKey = "request_id"
)

func WithRequestID(ctx context.Context, requestID string) context.Context {
    return context.WithValue(ctx, ContextKeyRequestID, requestID)
}

func GetRequestID(ctx context.Context) string {
    if id, ok := ctx.Value(ContextKeyRequestID).(string); ok {
        return id
    }
    return ""
}
```

### Standard Library Highlights

```go
// --- net/http: idiomatic HTTP server ---
mux := http.NewServeMux()
mux.HandleFunc("GET /api/users/{id}", handleGetUser)
mux.HandleFunc("POST /api/users", handleCreateUser)
mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
})

// Middleware pattern
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
    })
}

srv := &http.Server{
    Addr:         ":8080",
    Handler:      loggingMiddleware(mux),
    ReadTimeout:  10 * time.Second,
    WriteTimeout: 10 * time.Second,
    IdleTimeout:  30 * time.Second,
}
log.Fatal(srv.ListenAndServe())

// --- encoding/json: JSON marshal/unmarshal ---
type Config struct {
    Port    int      `json:"port"`
    Hosts   []string `json:"hosts,omitempty"`
    Debug   bool     `json:"debug"`
    Timeout Duration `json:"timeout"`
}

// Custom JSON unmarshaler
func (d *Duration) UnmarshalJSON(data []byte) error {
    var s string
    if err := json.Unmarshal(data, &s); err != nil {
        return err
    }
    dur, err := time.ParseDuration(s)
    if err != nil {
        return err
    }
    *d = Duration(dur)
    return nil
}

// --- time: formatting and parsing ---
const ISOFormat = "2006-01-02T15:04:05Z07:00"

func ParseTimestamp(s string) (time.Time, error) {
    return time.Parse(time.RFC3339, s)
}

func FormatDuration(d time.Duration) string {
    // Round to seconds for readability
    return d.Round(time.Second).String()
}

// --- sync: synchronization primitives ---
type SafeCounter struct {
    mu    sync.RWMutex
    value map[string]int
}

func (c *SafeCounter) Inc(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.value[key]++
}

func (c *SafeCounter) Get(key string) int {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.value[key]
}

// --- io: efficient streaming ---
func copyFile(src, dst string) error {
    source, err := os.Open(src)
    if err != nil {
        return err
    }
    defer source.Close()

    dest, err := os.Create(dst)
    if err != nil {
        return err
    }
    defer dest.Close()

    // io.Copy uses 32KB buffer — efficient for large files
    written, err := io.Copy(dest, source)
    if err != nil {
        return err
    }
    log.Printf("Copied %d bytes from %s to %s", written, src, dst)
    return nil
}
```

### Testing and Benchmarking

```go
package service_test

import (
    "context"
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// Table-driven test pattern
func TestCreateUser(t *testing.T) {
    tests := []struct {
        name    string
        input   CreateUserInput
        wantErr error
    }{
        {
            name: "valid user",
            input: CreateUserInput{
                Email: "test@example.com",
                Name:  "Test User",
                Role:  RoleUser,
            },
            wantErr: nil,
        },
        {
            name: "missing email",
            input: CreateUserInput{
                Name: "No Email",
                Role: RoleUser,
            },
            wantErr: ErrValidation,
        },
        {
            name: "duplicate email",
            input: CreateUserInput{
                Email: "existing@example.com",
                Name:  "Duplicate",
                Role:  RoleUser,
            },
            wantErr: ErrConflict,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            svc := newTestService(t)
            err := svc.CreateUser(context.Background(), tt.input)
            if tt.wantErr != nil {
                assert.ErrorIs(t, err, tt.wantErr)
                return
            }
            assert.NoError(t, err)
        })
    }
}

// Mock implementation for testing
type mockUserRepo struct {
    users map[int64]*User
}

func (m *mockUserRepo) FindByID(_ context.Context, id int64) (*User, error) {
    if u, ok := m.users[id]; ok {
        return u, nil
    }
    return nil, ErrNotFound
}

// Benchmark a function
func BenchmarkHashPassword(b *testing.B) {
    password := "my-secure-password-123!"
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _ = bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    }
}

// Test helper — runs setup before each subtest
func newTestService(t *testing.T) *UserService {
    t.Helper()
    db := setupTestDB(t)
    repo := NewPostgresUserRepository(db, zap.NewNop())
    return NewUserService(repo, zap.NewNop())
}

// Cleanup after test
func TestWithTeardown(t *testing.T) {
    svc := newTestService(t)
    t.Cleanup(func() {
        svc.Close()
    })
    // ... test logic
}

// Parallel test execution
func TestParallelOperations(t *testing.T) {
    t.Parallel()
    // All subtests run concurrently
    for i := 0; i < 10; i++ {
        i := i // capture loop variable
        t.Run(fmt.Sprintf("worker-%d", i), func(t *testing.T) {
            t.Parallel()
            // concurrent test logic
        })
    }
}
```

### File and I/O Operations

```go
// Reading entire file
data, err := os.ReadFile("config.json")
if err != nil {
    return fmt.Errorf("read config: %w", err)
}

// Writing with permission
err = os.WriteFile("output.txt", []byte("content"), 0644)
if err != nil {
    return fmt.Errorf("write output: %w", err)
}

// Reading line by line
file, err := os.Open("access.log")
if err != nil {
    return err
}
defer file.Close()

scanner := bufio.NewScanner(file)
for scanner.Scan() {
    line := scanner.Text()
    processLine(line)
}
if err := scanner.Err(); err != nil {
    return fmt.Errorf("scan file: %w", err)
}

// Walking directory tree
err = filepath.WalkDir("./data", func(path string, d fs.DirEntry, err error) error {
    if err != nil {
        return err
    }
    if d.IsDir() {
        return nil // skip directories, only process files
    }
    if filepath.Ext(path) == ".json" {
        fmt.Printf("Found JSON: %s\n", path)
    }
    return nil
})

// CSV writing
func writeCSV(records [][]string, path string) error {
    file, err := os.Create(path)
    if err != nil {
        return err
    }
    defer file.Close()

    w := csv.NewWriter(file)
    defer w.Flush()

    for _, record := range records {
        if err := w.Write(record); err != nil {
            return fmt.Errorf("write csv record: %w", err)
        }
    }
    return w.Error()
}
```

### Common CLI Patterns

```go
package main

import (
    "flag"
    "log"
    "os"

    "gopkg.in/yaml.v3"
)

// CLI configuration using standard library flag
type Config struct {
    Port    int    `yaml:"port"`
    LogLevel string `yaml:"log_level"`
    DBPath   string `yaml:"db_path"`
}

func main() {
    configPath := flag.String("config", "config.yaml", "path to config file")
    port := flag.Int("port", 8080, "server port (overrides config)")
    verbose := flag.Bool("verbose", false, "enable verbose logging")
    flag.Parse()

    cfg := Config{
        Port:    8080,
        LogLevel: "info",
        DBPath:   "./data.db",
    }

    // Load config from file if it exists
    if data, err := os.ReadFile(*configPath); err == nil {
        if err := yaml.Unmarshal(data, &cfg); err != nil {
            log.Fatalf("parse config: %v", err)
        }
    }

    // CLI flags override config file values
    if *port != 8080 {
        cfg.Port = *port
    }
    if *verbose {
        cfg.LogLevel = "debug"
    }

    log.Printf("Starting server on :%d (log level: %s)", cfg.Port, cfg.LogLevel)
    // ... server setup
}
```

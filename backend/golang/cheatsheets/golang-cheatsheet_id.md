---
title: "Cheat Sheet Golang"
description: "Panduan referensi cepat komprehensif untuk sintaks Go, perintah CLI, primitif konkurensi, pola umum, dan paket pustaka standar."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Golang

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Inisialisasi modul | `go mod init example.com/myapp` | Membuat file `go.mod` baru untuk pelacakan dependensi |
| Tambah dependensi | `go get github.com/gorilla/mux` | Mengunduh dan menambahkan dependensi ke `go.mod` |
| Rapikan dependensi | `go mod tidy` | Menghapus dependensi tak terpakai dan menambahkan yang hilang |
| Build biner | `go build -o myapp ./cmd/main.go` | Mengompilasi paket menjadi biner yang dapat dieksekusi |
| Jalankan langsung | `go run ./cmd/main.go` | Mengompilasi dan menjalankan tanpa menghasilkan biner |
| Jalankan semua tes | `go test ./...` | Mengeksekusi semua tes dengan hasil ter-cache |
| Tes verbose | `go test -v ./...` | Menjalankan semua tes dengan output detail |
| Tes dengan race | `go test -race ./...` | Mendeteksi data race selama eksekusi tes |
| Format kode | `go fmt ./...` | Memformat otomatis semua file sumber Go |
| Periksa kode | `go vet ./...` | Melaporkan konstruksi mencurigakan (mis. kode tak terjangkau) |
| Analisis statis | `go vet -vettool=$(which staticcheck) ./...` | Menjalankan `staticcheck` untuk linting yang lebih dalam |
| Generate coverage | `go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out` | Membuat dan membuka laporan coverage HTML |
| Instal tools | `go install golang.org/x/tools/cmd/[...]@latest` | Menginstal perkakas Go ke `$GOPATH/bin` |
| Cross-compile | `GOOS=linux GOARCH=amd64 go build ./cmd/main.go` | Build untuk OS/arsitektur yang berbeda |
| Daftar dependensi | `go list -m all` | Menampilkan semua dependensi langsung dan tidak langsung |
| Cek pembaruan | `go list -u -m all` | Menampilkan pembaruan dependensi yang tersedia |
| Visualisasi dependensi | `go mod graph` | Mencetak grafik dependensi (pipe ke `graphviz` untuk visual) |

## Perintah Umum

### Manajemen Modul

```bash
# Inisialisasi modul baru
go mod init github.com/username/my-service

# Tambah versi spesifik dependensi
go get github.com/gin-gonic/gin@v1.9.1

# Upgrade semua dependensi ke minor/patch terbaru
go get -u ./...

# Vendor dependensi (untuk build offline atau reproducible build)
go mod vendor

# Verifikasi modul yang diunduh tidak dirusak
go mod verify

# Bersihkan cache modul (membebaskan ruang disk)
go clean -modcache
```

### Build dan Menjalankan

```bash
# Build untuk platform saat ini
go build -ldflags="-s -w" -o bin/server ./cmd/server
# -ldflags="-s -w" menghapus info debug untuk biner yang lebih kecil

# Build dengan variabel waktu kompilasi
go build -ldflags="-X main.version=1.2.0 -X main.commit=$(git rev-parse HEAD)" -o bin/app .

# Cross-compile ke berbagai target
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o bin/server-linux-arm64 .
GOOS=darwin GOARCH=amd64 go build -o bin/server-darwin-amd64 .
GOOS=windows GOARCH=amd64 go build -o bin/server.exe .

# Jalankan dengan build tags (kompilasi bersyarat)
go run -tags=integration ./cmd/tests

# Instal biner ke $GOPATH/bin
go install ./cmd/server
```

### Testing

```bash
# Jalankan tes dengan race detector dan coverage
go test -race -coverprofile=coverage.out -covermode=atomic ./...

# Jalankan fungsi tes spesifik
go test -run ^TestCreateUser$ ./internal/repository

# Jalankan tes dalam mode pendek (skip tes integrasi)
go test -short ./...

# Jalankan tes dengan memory sanitizer
go test -msan ./...

# Benchmark fungsi tertentu
go test -bench=^BenchmarkHashPassword$ -benchmem ./...

# Fuzz testing (Go 1.18+)
go test -fuzz=^FuzzParsePhoneNumber$ -fuzztime=30s ./internal/validation
```

### Kualitas Kode

```bash
# Format semua file (non-destruktif, cetak diff)
gofmt -d ./

# Format dan tulis langsung
gofmt -w ./

# Jalankan go vet dengan semua analyzer diaktifkan
go vet -all ./...

# Periksa masalah nilness
go vet -vettool=$(which nilness) ./...

# Jalankan staticcheck (instal dulu: go install honnef.co/go/tools/cmd/staticcheck@latest)
staticcheck ./...

# Periksa masalah alignment struct
go vet -fieldalignment ./internal/models
```

### Profiling dan Debugging

```bash
# Profiling CPU (jalankan tes dengan profil)
go test -cpuprofile=cpu.prof -memprofile=mem.prof -bench=. ./...

# Analisis profil CPU
go tool pprof -http=:8080 cpu.prof

# Buat file trace
go test -trace=trace.out ./...

# Analisis trace
go tool trace trace.out

# Periksa optimasi kompiler pada sebuah fungsi
go tool compile -S -l main.go 2>&1 | grep -A5 "TEXT.*myFunction"

# Build dengan race detector untuk development
go build -race -o bin/server .
```

## Potongan Kode

### Paket dan Impor

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

### Struct dengan Tag dan Method

```go
// User merepresentasikan pengguna dalam sistem.
// Struct tag digunakan oleh encoding JSON dan library validasi.
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
    RoleAdmin  Role = "admin"
    RoleUser   Role = "user"
    RoleViewer Role = "viewer"
)

// IsAdmin mengembalikan true jika pengguna memiliki role admin.
func (u User) IsAdmin() bool {
    return u.Role == RoleAdmin
}

// FullName mengembalikan nama tampilan yang diformat.
func (u User) FullName() string {
    if u.Name == "" {
        return "Unknown User"
    }
    return u.Name
}
```

### Pola Penanganan Error

```go
import (
    "errors"
    "fmt"
)

// Sentinel errors — bandingkan dengan errors.Is
var (
    ErrNotFound   = errors.New("resource tidak ditemukan")
    ErrConflict   = errors.New("resource sudah ada")
    ErrForbidden  = errors.New("aksi tidak diizinkan")
    ErrValidation = errors.New("validasi gagal")
)

// Membungkus error dengan konteks
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

// Tipe error khusus dengan field terstruktur
type ValidationError struct {
    Field  string `json:"field"`
    Reason string `json:"reason"`
    Value  any    `json:"value,omitempty"`
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("validasi: %s %s (mendapat %v)", e.Field, e.Reason, e.Value)
}
```

### Konkurensi: Goroutine dan Channel

```go
// Pola Fan-Out: mendistribusikan pekerjaan ke beberapa worker
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

    go func() {
        wg.Wait()
        close(results)
    }()

    return results
}

// Shutdown graceful dengan signal handling
func GracefulShutdown(ctx context.Context, srv *http.Server, shutdownTimeout time.Duration) error {
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("Mematikan server...")

    shutdownCtx, cancel := context.WithTimeout(ctx, shutdownTimeout)
    defer cancel()

    if err := srv.Shutdown(shutdownCtx); err != nil {
        return fmt.Errorf("server dipaksa mati: %w", err)
    }

    log.Println("Server berhenti dengan graceful")
    return nil
}

// Pipeline: rangkaian tahapan channel
func pipelineExample() {
    nums := make(chan int)
    go func() {
        defer close(nums)
        for i := 1; i <= 100; i++ {
            nums <- i
        }
    }()

    squares := make(chan int)
    go func() {
        defer close(squares)
        for n := range nums {
            squares <- n * n
        }
    }()

    for s := range squares {
        fmt.Println(s)
    }
}
```

### Interface dan Dependency Injection

```go
// Interface Repository — mendefinisikan kontrak
type UserRepository interface {
    FindByID(ctx context.Context, id int64) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    Create(ctx context.Context, user *User) error
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id int64) error
}

// Implementasi PostgreSQL
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
        return nil, fmt.Errorf("cari user by id: %w", err)
    }
    return &u, nil
}

// Service layer — menggunakan interface (dependency inversion)
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
        s.log.Warn("gagal mengambil user", zap.Int64("user_id", id), zap.Error(err))
        return nil, err
    }
    return user, nil
}
```

### Penggunaan Context

```go
// Context membawa deadline, sinyal pembatalan, dan nilai scope request
func Handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    userID, err := extractUserID(r)
    if err != nil {
        http.Error(w, "user id tidak valid", http.StatusBadRequest)
        return
    }

    user, err := userService.GetUser(ctx, userID)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            http.Error(w, "user tidak ditemukan", http.StatusNotFound)
            return
        }
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(user)
}

// Key context value harus memiliki tipe terpisah untuk menghindari tabrakan
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

### Sorotan Pustaka Standar

```go
// --- net/http: HTTP server idiomatis ---
mux := http.NewServeMux()
mux.HandleFunc("GET /api/users/{id}", handleGetUser)
mux.HandleFunc("POST /api/users", handleCreateUser)
mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
})

// Pola middleware
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

// --- time: format dan parsing ---
const ISOFormat = "2006-01-02T15:04:05Z07:00"

func ParseTimestamp(s string) (time.Time, error) {
    return time.Parse(time.RFC3339, s)
}

// --- sync: primitif sinkronisasi ---
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

// --- io: streaming efisien ---
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

    written, err := io.Copy(dest, source)
    if err != nil {
        return err
    }
    log.Printf("Menyalin %d bytes dari %s ke %s", written, src, dst)
    return nil
}
```

### Testing dan Benchmarking

```go
package service_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// Pola table-driven test
func TestCreateUser(t *testing.T) {
    tests := []struct {
        name    string
        input   CreateUserInput
        wantErr error
    }{
        {
            name: "user valid",
            input: CreateUserInput{
                Email: "test@example.com",
                Name:  "Test User",
                Role:  RoleUser,
            },
            wantErr: nil,
        },
        {
            name: "email kosong",
            input: CreateUserInput{
                Name: "Tanpa Email",
                Role: RoleUser,
            },
            wantErr: ErrValidation,
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

// Mock untuk testing
type mockUserRepo struct {
    users map[int64]*User
}

func (m *mockUserRepo) FindByID(_ context.Context, id int64) (*User, error) {
    if u, ok := m.users[id]; ok {
        return u, nil
    }
    return nil, ErrNotFound
}

// Benchmark sebuah fungsi
func BenchmarkHashPassword(b *testing.B) {
    password := "my-secure-password-123!"
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _ = bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    }
}

// Test helper
func newTestService(t *testing.T) *UserService {
    t.Helper()
    db := setupTestDB(t)
    repo := NewPostgresUserRepository(db, zap.NewNop())
    return NewUserService(repo, zap.NewNop())
}
```

### Operasi File dan I/O

```go
// Membaca seluruh file
data, err := os.ReadFile("config.json")
if err != nil {
    return fmt.Errorf("baca config: %w", err)
}

// Menulis dengan permission
err = os.WriteFile("output.txt", []byte("content"), 0644)
if err != nil {
    return fmt.Errorf("tulis output: %w", err)
}

// Membaca baris per baris
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

// Menulis CSV
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
            return fmt.Errorf("tulis csv record: %w", err)
        }
    }
    return w.Error()
}
```

### Pola CLI Umum

```go
package main

import (
    "flag"
    "log"
    "os"

    "gopkg.in/yaml.v3"
)

type Config struct {
    Port     int    `yaml:"port"`
    LogLevel string `yaml:"log_level"`
    DBPath   string `yaml:"db_path"`
}

func main() {
    configPath := flag.String("config", "config.yaml", "path ke file config")
    port := flag.Int("port", 8080, "port server (mengganti config)")
    verbose := flag.Bool("verbose", false, "aktifkan logging verbose")
    flag.Parse()

    cfg := Config{
        Port:     8080,
        LogLevel: "info",
        DBPath:   "./data.db",
    }

    if data, err := os.ReadFile(*configPath); err == nil {
        if err := yaml.Unmarshal(data, &cfg); err != nil {
            log.Fatalf("parse config: %v", err)
        }
    }

    if *port != 8080 {
        cfg.Port = *port
    }
    if *verbose {
        cfg.LogLevel = "debug"
    }

    log.Printf("Memulai server di :%d (log level: %s)", cfg.Port, cfg.LogLevel)
}
```

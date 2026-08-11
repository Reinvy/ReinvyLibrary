---
title: "Cheat Sheet Pengembangan Web Go dan HTTP API"
description: "Panduan referensi cepat untuk membangun aplikasi web dan HTTP API di Go, mencakup pola net/http, middleware, penanganan JSON, pengujian, dan framework populer."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Pengembangan Web Go dan HTTP API

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Server HTTP dasar | `http.ListenAndServe(":8080", mux)` | Memulai server HTTP pada port 8080 |
| Mendefinisikan rute | `mux.HandleFunc("GET /api/users", handler)` | Mendaftarkan handler untuk GET /api/users |
| Membaca query param | `r.URL.Query().Get("halaman")` | Mengekstrak parameter query string |
| Membaca path param | `r.PathValue("id")` | Mengekstrak parameter path (Go 1.22+) |
| Parse body JSON | `json.NewDecoder(r.Body).Decode(&v)` | Mendekode body permintaan ke dalam struct |
| Menulis respons JSON | `json.NewEncoder(w).Encode(v)` | Mengenkode dan menulis JSON ke respons |
| Mengatur kode status | `w.WriteHeader(http.StatusCreated)` | Menulis kode status HTTP (201) |
| Mengatur header respons | `w.Header().Set("Content-Type", "application/json")` | Mengatur header respons |
| Membaca body permintaan | `body, err := io.ReadAll(r.Body)` | Membaca seluruh body permintaan sebagai byte |
| Pola middleware | `func(next http.Handler) http.Handler { ... }` | Membungkus handler dengan logika lintas fungsi |
| Mengatur cookie | `http.SetCookie(w, &http.Cookie{Name: "token", Value: v})` | Menulis cookie ke respons |
| Membaca cookie | `c, err := r.Cookie("token")` | Membaca cookie dari permintaan |
| Shutdown graceful | `srv.Shutdown(ctx)` | Menghentikan server secara graceful dengan timeout |
| Menguji handler HTTP | `httptest.NewRecorder()` + `srv.ServeHTTP(rr, req)` | Menjalankan handler dalam konteks pengujian |
| Server file | `http.FileServer(http.Dir("./public"))` | Melayani file statis dari direktori |
| Redirect | `http.Redirect(w, r, "/login", http.StatusSeeOther)` | Mengirim redirect HTTP (303) |

## Perintah Umum

### Menjalankan Server

```bash
# Build dan jalankan
go run ./cmd/server/main.go

# Build binary dan jalankan
go build -o server ./cmd/server/main.go && ./server

# Jalankan dengan environment variables
PORT=8080 go run ./cmd/server/main.go

# Hot reload dengan air
air

# Hot reload dengan nodemon
nodemon --exec go run ./cmd/server/main.go --signal SIGTERM
```

### Menguji Handler HTTP

```bash
# Jalankan semua tes dengan output verbose
go test -v ./...

# Jalankan fungsi tes tertentu
go test -v -run TestCreateUser ./...

# Jalankan tes dengan deteksi race condition
go test -race ./...

# Generate laporan coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Jalankan tes dengan coverage per fungsi
go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out
```

### Manajemen Modul untuk Proyek Web

```bash
# Buat modul baru
go mod init github.com/user/my-web-api

# Tambahkan library routing
go get github.com/go-chi/chi/v5

# Tambahkan web framework
go get github.com/gin-gonic/gin

# Tambahkan library validasi
go get github.com/go-playground/validator/v10

# Rapikan dependensi
go mod tidy

# Vendor dependensi untuk deployment
go mod vendor
```

### Kompilasi Silang untuk Deployment

```bash
# Build untuk Linux amd64
GOOS=linux GOARCH=amd64 go build -o server-linux-amd64 ./cmd/server/

# Build untuk ARM (misalnya Raspberry Pi)
GOOS=linux GOARCH=arm64 go build -o server-linux-arm64 ./cmd/server/

# Build dengan informasi versi tertanam
go build -ldflags="-X main.Version=1.0.0 -X main.Commit=$(git rev-parse HEAD)" -o server ./cmd/server/
```

## Potongan Kode

### Server HTTP Standard Library (Go 1.22+)

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "strconv"
    "time"
)

type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

func main() {
    mux := http.NewServeMux()

    // Go 1.22+ routing dengan method dan path params
    mux.HandleFunc("GET /api/users", listUsers)
    mux.HandleFunc("GET /api/users/{id}", getUser)
    mux.HandleFunc("POST /api/users", createUser)
    mux.HandleFunc("PUT /api/users/{id}", updateUser)
    mux.HandleFunc("DELETE /api/users/{id}", deleteUser)

    // Melayani file statis
    fileServer := http.FileServer(http.Dir("./static"))
    mux.Handle("GET /static/", http.StripPrefix("/static/", fileServer))

    // Endpoint health check
    mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"status": "sehat"})
    })

    // Graceful shutdown
    srv := &http.Server{
        Addr:         ":8080",
        Handler:      loggingMiddleware(mux),
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    log.Println("Server berjalan di :8080")
    if err := srv.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatal("Kesalahan server:", err)
    }
}
```

### Pola Middleware

```go
// Middleware logging — mencatat method, path, dan durasi
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
    })
}

// Middleware recovery — menangkap panic dan mengembalikan 500
func recoveryMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if rec := recover(); rec != nil {
                log.Printf("PANIC dipulihkan: %v", rec)
                http.Error(w, "Kesalahan Internal Server", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}

// Middleware CORS — mengizinkan permintaan lintas asal
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

### Penanganan Permintaan JSON

```go
// Validasi permintaan dengan struct tags
type CreateUserRequest struct {
    Name     string `json:"name" validate:"required,min=2,max=100"`
    Email    string `json:"email" validate:"required,email"`
    Age      int    `json:"age" validate:"gte=0,lte=150"`
    Password string `json:"password" validate:"required,min=8"`
}

// Mendekode dan memvalidasi body JSON
func decodeAndValidate[T any](r *http.Request) (T, error) {
    var req T
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        return req, fmt.Errorf("JSON tidak valid: %w", err)
    }
    defer r.Body.Close()
    return req, nil
}

// Respons error JSON yang terstandarisasi
func writeJSONError(w http.ResponseWriter, status int, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(map[string]string{
        "error":   http.StatusText(status),
        "message": message,
    })
}

// Respons sukses JSON yang terstandarisasi
func writeJSON(w http.ResponseWriter, status int, data any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(data)
}
```

### Implementasi Handler

```go
type UserHandler struct {
    store  map[int]User
    nextID int
    mu     sync.RWMutex
}

func NewUserHandler() *UserHandler {
    return &UserHandler{
        store:  make(map[int]User),
        nextID: 1,
    }
}

// GET /api/users — daftar semua user
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    users := make([]User, 0, len(h.store))
    for _, u := range h.store {
        users = append(users, u)
    }
    writeJSON(w, http.StatusOK, users)
}

// GET /api/users/{id} — ambil user berdasarkan ID
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        writeJSONError(w, http.StatusBadRequest, "ID user tidak valid")
        return
    }

    h.mu.RLock()
    defer h.mu.RUnlock()

    user, exists := h.store[id]
    if !exists {
        writeJSONError(w, http.StatusNotFound, "user tidak ditemukan")
        return
    }
    writeJSON(w, http.StatusOK, user)
}

// POST /api/users — buat user baru
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSONError(w, http.StatusBadRequest, "body permintaan tidak valid")
        return
    }
    defer r.Body.Close()

    h.mu.Lock()
    user := User{
        ID:    h.nextID,
        Name:  req.Name,
        Email: req.Email,
    }
    h.store[h.nextID] = user
    h.nextID++
    h.mu.Unlock()

    writeJSON(w, http.StatusCreated, user)
}

// DELETE /api/users/{id} — hapus user
func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        writeJSONError(w, http.StatusBadRequest, "ID user tidak valid")
        return
    }

    h.mu.Lock()
    defer h.mu.Unlock()

    if _, exists := h.store[id]; !exists {
        writeJSONError(w, http.StatusNotFound, "user tidak ditemukan")
        return
    }
    delete(h.store, id)
    writeJSON(w, http.StatusOK, map[string]string{"message": "user dihapus"})
}

// Wiring main
func main() {
    h := NewUserHandler()

    mux := http.NewServeMux()
    mux.HandleFunc("GET /api/users", h.ListUsers)
    mux.HandleFunc("GET /api/users/{id}", h.GetUser)
    mux.HandleFunc("POST /api/users", h.CreateUser)
    mux.HandleFunc("DELETE /api/users/{id}", h.DeleteUser)

    srv := &http.Server{Addr: ":8080", Handler: corsMiddleware(loggingMiddleware(mux))}
    srv.ListenAndServe()
}
```

### Graceful Shutdown

```go
func main() {
    mux := http.NewServeMux()
    // ... daftarkan rute ...

    srv := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 15 * time.Second,
    }

    // Jalankan server di goroutine
    go func() {
        log.Printf("Server mendengarkan di %s", srv.Addr)
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("Kesalahan server: %v", err)
        }
    }()

    // Tunggu sinyal shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
    <-quit

    log.Println("Mematikan server...")
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("Pematian paksa: %v", err)
    }
    log.Println("Server berhenti dengan bersih")
}
```

### Menguji Handler HTTP dengan httptest

```go
func TestListUsers(t *testing.T) {
    h := NewUserHandler()

    // Data awal
    h.store[1] = User{ID: 1, Name: "Alice", Email: "alice@example.com"}
    h.store[2] = User{ID: 2, Name: "Bob", Email: "bob@example.com"}

    // Buat permintaan
    req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
    rr := httptest.NewRecorder()

    // Layani HTTP
    h.ListUsers(rr, req)

    // Verifikasi respons
    assert.Equal(t, http.StatusOK, rr.Code)

    var users []User
    err := json.NewDecoder(rr.Body).Decode(&users)
    assert.NoError(t, err)
    assert.Len(t, users, 2)
}

func TestCreateUser(t *testing.T) {
    h := NewUserHandler()

    body := `{"name":"Charlie","email":"charlie@example.com","age":30,"password":"securepass123"}`
    req := httptest.NewRequest(http.MethodPost, "/api/users", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()

    h.CreateUser(rr, req)

    assert.Equal(t, http.StatusCreated, rr.Code)

    var user User
    json.NewDecoder(rr.Body).Decode(&user)
    assert.Equal(t, "Charlie", user.Name)
    assert.Equal(t, 1, user.ID)
}

func TestGetUserNotFound(t *testing.T) {
    h := NewUserHandler()

    req := httptest.NewRequest(http.MethodGet, "/api/users/999", nil)
    rr := httptest.NewRecorder()

    h.GetUser(rr, req)

    assert.Equal(t, http.StatusNotFound, rr.Code)
}
```

### Pola HTTP Client

```go
// HTTP client untuk REST API
type APIClient struct {
    baseURL    string
    httpClient *http.Client
    token      string
}

func NewAPIClient(baseURL string) *APIClient {
    return &APIClient{
        baseURL: baseURL,
        httpClient: &http.Client{
            Timeout: 10 * time.Second,
        },
    }
}

// Permintaan GET generik dengan respons JSON
func (c *APIClient) Get(path string, dest any) error {
    url := c.baseURL + path
    req, err := http.NewRequest(http.MethodGet, url, nil)
    if err != nil {
        return fmt.Errorf("buat permintaan: %w", err)
    }
    req.Header.Set("Authorization", "Bearer "+c.token)
    req.Header.Set("Accept", "application/json")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return fmt.Errorf("eksekusi permintaan: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        return fmt.Errorf("error API: %s", resp.Status)
    }

    return json.NewDecoder(resp.Body).Decode(dest)
}

// Permintaan POST generik dengan body JSON
func (c *APIClient) Post(path string, body, dest any) error {
    var buf bytes.Buffer
    if err := json.NewEncoder(&buf).Encode(body); err != nil {
        return fmt.Errorf("enkode body: %w", err)
    }

    url := c.baseURL + path
    req, err := http.NewRequest(http.MethodPost, url, &buf)
    if err != nil {
        return fmt.Errorf("buat permintaan: %w", err)
    }
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+c.token)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return fmt.Errorf("eksekusi permintaan: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        return fmt.Errorf("error API: %s", resp.Status)
    }

    return json.NewDecoder(resp.Body).Decode(dest)
}
```

### Handler Upload File

```go
func uploadHandler(w http.ResponseWriter, r *http.Request) {
    // Batasi ukuran upload ke 10 MB
    r.Body = http.MaxBytesReader(w, r.Body, 10<<20)

    if err := r.ParseMultipartForm(10 << 20); err != nil {
        writeJSONError(w, http.StatusBadRequest, "file terlalu besar")
        return
    }

    file, header, err := r.FormFile("file")
    if err != nil {
        writeJSONError(w, http.StatusBadRequest, "field file tidak ditemukan")
        return
    }
    defer file.Close()

    // Buat file tujuan
    dst, err := os.Create("./uploads/" + header.Filename)
    if err != nil {
        writeJSONError(w, http.StatusInternalServerError, "gagal menyimpan file")
        return
    }
    defer dst.Close()

    if _, err := io.Copy(dst, file); err != nil {
        writeJSONError(w, http.StatusInternalServerError, "gagal menulis file")
        return
    }

    writeJSON(w, http.StatusOK, map[string]string{
        "filename": header.Filename,
        "size":     fmt.Sprintf("%d bytes", header.Size),
    })
}
```

### Referensi Cepat Framework (chi)

```go
import "github.com/go-chi/chi/v5"

r := chi.NewRouter()

// Middleware
r.Use(chi.Logger)
r.Use(chi.Recoverer)
r.Use(chimw.RateLimiter(100)) // batasi 100 req/menit

// Grup rute
r.Route("/api/users", func(r chi.Router) {
    r.Get("/", listUsers)
    r.Post("/", createUser)
    r.Route("/{id}", func(r chi.Router) {
        r.Get("/", getUser)
        r.Put("/", updateUser)
        r.Delete("/", deleteUser)
    })
})

http.ListenAndServe(":8080", r)
```

### Referensi Cepat Framework (Gin)

```go
import "github.com/gin-gonic/gin"

r := gin.Default()

// Rute dengan path params dan query params
r.GET("/api/users", func(c *gin.Context) {
    page := c.DefaultQuery("page", "1")
    limit := c.DefaultQuery("limit", "10")
    c.JSON(http.StatusOK, gin.H{"page": page, "limit": limit})
})

r.GET("/api/users/:id", func(c *gin.Context) {
    id := c.Param("id")
    c.JSON(http.StatusOK, gin.H{"id": id})
})

r.POST("/api/users", func(c *gin.Context) {
    var user User
    if err := c.ShouldBindJSON(&user); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusCreated, user)
})

r.Run(":8080")
```

### Referensi Cepat Framework (Echo)

```go
import "github.com/labstack/echo/v4"

e := echo.New()

// Middleware
e.Use(echo.Middleware.Logger())
e.Use(echo.Middleware.Recover())
e.Use(echo.Middleware.CORS())

// Rute
e.GET("/api/users", listUsers)
e.GET("/api/users/:id", getUser)
e.POST("/api/users", createUser)

e.Logger.Fatal(e.Start(":8080"))
```

### Server WebSocket Echo (gorilla/websocket)

```go
import "github.com/gorilla/websocket"

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool { return true },
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("Upgrade WebSocket gagal: %v", err)
        return
    }
    defer conn.Close()

    for {
        messageType, message, err := conn.ReadMessage()
        if err != nil {
            log.Printf("Kesalahan baca: %v", err)
            break
        }
        log.Printf("Diterima: %s", message)

        // Kirim balik pesan
        if err := conn.WriteMessage(messageType, message); err != nil {
            log.Printf("Kesalahan tulis: %v", err)
            break
        }
    }
}
```

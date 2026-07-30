---
title: "Go Web Development and HTTP API Cheatsheet"
description: "A quick reference guide for building web applications and HTTP APIs in Go, covering net/http patterns, middleware, JSON handling, testing, and popular frameworks."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Go Web Development and HTTP API Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Basic HTTP server | `http.ListenAndServe(":8080", mux)` | Starts an HTTP server on port 8080 |
| Define a route | `mux.HandleFunc("GET /api/users", handler)` | Registers a handler for GET /api/users |
| Read query param | `r.URL.Query().Get("page")` | Extracts a query string parameter |
| Read path param | `r.PathValue("id")` | Extracts a named path parameter (Go 1.22+) |
| Parse JSON body | `json.NewDecoder(r.Body).Decode(&v)` | Decodes request body into a struct |
| Write JSON response | `json.NewEncoder(w).Encode(v)` | Encodes and writes JSON to the response |
| Set status code | `w.WriteHeader(http.StatusCreated)` | Writes HTTP status code (201) |
| Set response header | `w.Header().Set("Content-Type", "application/json")` | Sets a response header |
| Read request body | `body, err := io.ReadAll(r.Body)` | Reads entire request body as bytes |
| Middleware pattern | `func(next http.Handler) http.Handler { ... }` | Wraps a handler with cross-cutting logic |
| Cookie set | `http.SetCookie(w, &http.Cookie{Name: "token", Value: v})` | Writes a cookie to the response |
| Cookie read | `c, err := r.Cookie("token")` | Reads a cookie from the request |
| Graceful shutdown | `srv.Shutdown(ctx)` | Gracefully stops the server with timeout |
| Test HTTP handler | `httptest.NewRecorder()` + `srv.ServeHTTP(rr, req)` | Runs a handler in a test context |
| File server | `http.FileServer(http.Dir("./public"))` | Serves static files from a directory |
| Redirect | `http.Redirect(w, r, "/login", http.StatusSeeOther)` | Sends an HTTP redirect (303) |

## Common Commands

### Running a Server

```bash
# Build and run
go run ./cmd/server/main.go

# Build binary and run
go build -o server ./cmd/server/main.go && ./server

# Run with environment variables
PORT=8080 go run ./cmd/server/main.go

# Hot reload with air
air

# Hot reload with nodemon (Node.js alternative)
nodemon --exec go run ./cmd/server/main.go --signal SIGTERM
```

### Testing HTTP Handlers

```bash
# Run all tests with verbose output
go test -v ./...

# Run a specific test function
go test -v -run TestCreateUser ./...

# Run tests with race detection
go test -race ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run tests and show coverage per function
go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out
```

### Module Management for Web Projects

```bash
# Create a new module
go mod init github.com/user/my-web-api

# Add a routing library
go get github.com/go-chi/chi/v5

# Add a web framework
go get github.com/gin-gonic/gin

# Add a validation library
go get github.com/go-playground/validator/v10

# Tidy dependencies
go mod tidy

# Vendor dependencies for deployment
go mod vendor
```

### Cross-Compilation for Deployment

```bash
# Build for Linux amd64
GOOS=linux GOARCH=amd64 go build -o server-linux-amd64 ./cmd/server/

# Build for ARM (e.g., Raspberry Pi)
GOOS=linux GOARCH=arm64 go build -o server-linux-arm64 ./cmd/server/

# Build with build info embedded
go build -ldflags="-X main.Version=1.0.0 -X main.Commit=$(git rev-parse HEAD)" -o server ./cmd/server/
```

## Code Snippets

### Standard Library HTTP Server (Go 1.22+)

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
    ID   int    `json:"id"`
    Name string `json:"name"`
    Email string `json:"email"`
}

func main() {
    mux := http.NewServeMux()

    // Go 1.22+ enhanced routing with method and path params
    mux.HandleFunc("GET /api/users", listUsers)
    mux.HandleFunc("GET /api/users/{id}", getUser)
    mux.HandleFunc("POST /api/users", createUser)
    mux.HandleFunc("PUT /api/users/{id}", updateUser)
    mux.HandleFunc("DELETE /api/users/{id}", deleteUser)

    // Static file serving
    fileServer := http.FileServer(http.Dir("./static"))
    mux.Handle("GET /static/", http.StripPrefix("/static/", fileServer))

    // Health check endpoint
    mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
    })

    // Graceful shutdown
    srv := &http.Server{
        Addr:         ":8080",
        Handler:      loggingMiddleware(mux),
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    log.Println("Server starting on :8080")
    if err := srv.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatal("Server error:", err)
    }
}
```

### Middleware Patterns

```go
// Logging middleware — logs method, path, and duration
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
    })
}

// Recovery middleware — catches panics and returns 500
func recoveryMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if rec := recover(); rec != nil {
                log.Printf("PANIC recovered: %v", rec)
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}

// CORS middleware — allows cross-origin requests
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

### JSON Request Handling

```go
// Request validation with struct tags
type CreateUserRequest struct {
    Name     string `json:"name" validate:"required,min=2,max=100"`
    Email    string `json:"email" validate:"required,email"`
    Age      int    `json:"age" validate:"gte=0,lte=150"`
    Password string `json:"password" validate:"required,min=8"`
}

// Decode and validate JSON request body
func decodeAndValidate[T any](r *http.Request) (T, error) {
    var req T
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        return req, fmt.Errorf("invalid JSON: %w", err)
    }
    defer r.Body.Close()
    return req, nil
}

// Standardized JSON error response
func writeJSONError(w http.ResponseWriter, status int, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(map[string]string{
        "error":   http.StatusText(status),
        "message": message,
    })
}

// Standardized JSON success response
func writeJSON(w http.ResponseWriter, status int, data any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(data)
}
```

### Handler Implementation

```go
type UserHandler struct {
    store map[int]User
    nextID int
    mu     sync.RWMutex
}

func NewUserHandler() *UserHandler {
    return &UserHandler{
        store:  make(map[int]User),
        nextID: 1,
    }
}

// GET /api/users — list all users
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    users := make([]User, 0, len(h.store))
    for _, u := range h.store {
        users = append(users, u)
    }
    writeJSON(w, http.StatusOK, users)
}

// GET /api/users/{id} — get user by ID
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        writeJSONError(w, http.StatusBadRequest, "invalid user ID")
        return
    }

    h.mu.RLock()
    defer h.mu.RUnlock()

    user, exists := h.store[id]
    if !exists {
        writeJSONError(w, http.StatusNotFound, "user not found")
        return
    }
    writeJSON(w, http.StatusOK, user)
}

// POST /api/users — create user
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSONError(w, http.StatusBadRequest, "invalid request body")
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

// DELETE /api/users/{id} — delete user
func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        writeJSONError(w, http.StatusBadRequest, "invalid user ID")
        return
    }

    h.mu.Lock()
    defer h.mu.Unlock()

    if _, exists := h.store[id]; !exists {
        writeJSONError(w, http.StatusNotFound, "user not found")
        return
    }
    delete(h.store, id)
    writeJSON(w, http.StatusOK, map[string]string{"message": "user deleted"})
}

// main wiring
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
    // ... register routes ...

    srv := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 15 * time.Second,
    }

    // Start server in goroutine
    go func() {
        log.Printf("Server listening on %s", srv.Addr)
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    // Listen for shutdown signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
    <-quit

    log.Println("Shutting down server...")
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("Forced shutdown: %v", err)
    }
    log.Println("Server exited cleanly")
}
```

### Testing HTTP Handlers with httptest

```go
func TestListUsers(t *testing.T) {
    h := NewUserHandler()

    // Seed data
    h.store[1] = User{ID: 1, Name: "Alice", Email: "alice@example.com"}
    h.store[2] = User{ID: 2, Name: "Bob", Email: "bob@example.com"}

    // Create request
    req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
    rr := httptest.NewRecorder()

    // Serve HTTP
    h.ListUsers(rr, req)

    // Assert response
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

### HTTP Client Patterns

```go
// Typed HTTP client for a REST API
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

// Generic GET request with JSON response
func (c *APIClient) Get(path string, dest any) error {
    url := c.baseURL + path
    req, err := http.NewRequest(http.MethodGet, url, nil)
    if err != nil {
        return fmt.Errorf("create request: %w", err)
    }
    req.Header.Set("Authorization", "Bearer "+c.token)
    req.Header.Set("Accept", "application/json")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return fmt.Errorf("execute request: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        return fmt.Errorf("API error: %s", resp.Status)
    }

    return json.NewDecoder(resp.Body).Decode(dest)
}

// Generic POST request with JSON body
func (c *APIClient) Post(path string, body, dest any) error {
    var buf bytes.Buffer
    if err := json.NewEncoder(&buf).Encode(body); err != nil {
        return fmt.Errorf("encode body: %w", err)
    }

    url := c.baseURL + path
    req, err := http.NewRequest(http.MethodPost, url, &buf)
    if err != nil {
        return fmt.Errorf("create request: %w", err)
    }
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+c.token)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return fmt.Errorf("execute request: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        return fmt.Errorf("API error: %s", resp.Status)
    }

    return json.NewDecoder(resp.Body).Decode(dest)
}
```

### File Upload Handler

```go
func uploadHandler(w http.ResponseWriter, r *http.Request) {
    // Limit upload size to 10 MB
    r.Body = http.MaxBytesReader(w, r.Body, 10<<20)

    if err := r.ParseMultipartForm(10 << 20); err != nil {
        writeJSONError(w, http.StatusBadRequest, "file too large")
        return
    }

    file, header, err := r.FormFile("file")
    if err != nil {
        writeJSONError(w, http.StatusBadRequest, "missing file field")
        return
    }
    defer file.Close()

    // Create destination file
    dst, err := os.Create("./uploads/" + header.Filename)
    if err != nil {
        writeJSONError(w, http.StatusInternalServerError, "failed to save file")
        return
    }
    defer dst.Close()

    if _, err := io.Copy(dst, file); err != nil {
        writeJSONError(w, http.StatusInternalServerError, "failed to write file")
        return
    }

    writeJSON(w, http.StatusOK, map[string]string{
        "filename": header.Filename,
        "size":     fmt.Sprintf("%d bytes", header.Size),
    })
}
```

### Framework Quick Reference (chi)

```go
import "github.com/go-chi/chi/v5"

r := chi.NewRouter()

// Middleware
r.Use(chi.Logger)
r.Use(chi.Recoverer)
r.Use(chimw.RateLimiter(100)) // rate-limit to 100 req/min

// Route groups
r.Route("/api/users", func(r chi.Router) {
    r.Get("/", listUsers)
    r.Post("/", createUser)
    r.Route("/{id}", func(r chi.Router) {
        r.Get("/", getUser)
        r.Put("/", updateUser)
        r.Delete("/", deleteUser)
    })
})

// Subdomain routing
r.Route("/api/v2", func(r chi.Router) {
    r.Use(jwtMiddleware)  // scoped middleware
    r.Get("/products", listProducts)
})

http.ListenAndServe(":8080", r)
```

### Framework Quick Reference (Gin)

```go
import "github.com/gin-gonic/gin"

r := gin.Default()

// Routes with path params and query params
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

// Route groups with middleware
authorized := r.Group("/api/admin")
authorized.Use(authMiddleware())
{
    authorized.GET("/dashboard", dashboardHandler)
}

r.Run(":8080")
```

### Framework Quick Reference (Echo)

```go
import "github.com/labstack/echo/v4"

e := echo.New()

// Middleware
e.Use(echo.Middleware.Logger())
e.Use(echo.Middleware.Recover())
e.Use(echo.Middleware.CORS())

// Routes
e.GET("/api/users", listUsers)
e.GET("/api/users/:id", getUser)
e.POST("/api/users", createUser)
e.PUT("/api/users/:id", updateUser)
e.DELETE("/api/users/:id", deleteUser)

// Group with middleware
api := e.Group("/api/v1")
api.Use(authMiddleware)
api.GET("/products", listProducts)

// Start server
e.Logger.Fatal(e.Start(":8080"))
```

### WebSocket Echo Server (gorilla/websocket)

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
        log.Printf("WebSocket upgrade failed: %v", err)
        return
    }
    defer conn.Close()

    for {
        messageType, message, err := conn.ReadMessage()
        if err != nil {
            log.Printf("Read error: %v", err)
            break
        }
        log.Printf("Received: %s", message)

        // Echo message back
        if err := conn.WriteMessage(messageType, message); err != nil {
            log.Printf("Write error: %v", err)
            break
        }
    }
}
```

### Configuration from Environment

```go
type Config struct {
    Port      string `envconfig:"PORT" default:"8080"`
    DatabaseURL string `envconfig:"DATABASE_URL" required:"true"`
    JWTSecret  string `envconfig:"JWT_SECRET" required:"true"`
    LogLevel   string `envconfig:"LOG_LEVEL" default:"info"`
    CORSOrigin string `envconfig:"CORS_ORIGIN" default:"*"`
}

func LoadConfig() (*Config, error) {
    var cfg Config

    // Environment variable loader using os.LookupEnv
    if port, ok := os.LookupEnv("PORT"); ok {
        cfg.Port = port
    }
    if dbURL, ok := os.LookupEnv("DATABASE_URL"); !ok {
        return nil, fmt.Errorf("DATABASE_URL is required")
    } else {
        cfg.DatabaseURL = dbURL
    }
    cfg.JWTSecret = os.Getenv("JWT_SECRET")
    // ... more fields ...

    return &cfg, nil
}

// Using kelseyhightower/envconfig
// import "github.com/kelseyhightower/envconfig"
//
// func LoadConfig() (*Config, error) {
//     var cfg Config
//     err := envconfig.Process("myapp", &cfg)
//     return &cfg, err
// }
```

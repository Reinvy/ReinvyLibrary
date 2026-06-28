---
title: "Building a RESTful API with Go"
description: "A practical tutorial on building a complete RESTful API using Go's standard library, covering HTTP routing, JSON handling, middleware, database integration, and testing."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a RESTful API with Go

## Summary

This tutorial walks through building a production-style RESTful API for a book management service using Go's standard library (`net/http`, `encoding/json`). You will learn how to design clean API endpoints, implement custom middleware for logging and authentication, integrate with a PostgreSQL database, handle JSON requests and responses, and write thorough tests for HTTP handlers. By the end, you will have a fully functional REST API that follows Go idioms and production conventions.

## Target Audience

- Backend developers with basic Go knowledge (variables, functions, structs, interfaces).
- Developers transitioning from other languages (Node.js, Python, Java) who want to build web APIs in Go.
- Intermediate level — assumes familiarity with Go syntax, `go mod`, and terminal usage.

## Prerequisites

- Go 1.22+ installed locally (download from [go.dev/dl](https://go.dev/dl)).
- Basic understanding of RESTful API design principles (GET, POST, PUT, DELETE, status codes).
- Familiarity with SQL and relational databases (PostgreSQL helpful but not required).
- A code editor or IDE (VS Code with Go extension recommended).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Design and implement RESTful API endpoints using `net/http` and Go 1.22+ enhanced routing.
- Parse and validate JSON request bodies with `encoding/json`.
- Build reusable middleware for logging, recovery, and CORS.
- Connect to a PostgreSQL database using `database/sql` and `lib/pq`.
- Implement CRUD operations with parameterized queries.
- Write table-driven tests for HTTP handlers.
- Gracefully shut down an HTTP server.

## Context and Motivation

Building HTTP APIs is one of the most common tasks for backend developers. While many Go developers reach for third-party frameworks like Gin or Echo, Go's standard library has evolved significantly — starting with Go 1.22, `net/http` supports path parameters and method-based routing natively, making it entirely feasible to build production-quality APIs without external dependencies.

This tutorial focuses on the standard library approach because it:

- **Reduces dependency surface** — fewer third-party packages means fewer supply-chain risks and easier upgrades.
- **Builds transferable knowledge** — the patterns you learn (handler interfaces, middleware composition, context propagation) apply across all Go web frameworks.
- **Keeps builds fast** — Go's standard library compiles in milliseconds, keeping the developer feedback loop tight.
- **Remains framework-agnostic** — understanding the underlying `net/http` primitives makes you a better Go developer regardless of which router you eventually choose.

You will build a **Book Management API** that supports creating, reading, updating, deleting, and listing books — a classic CRUD API that mirrors real-world service design.

## Core Content

### Project Setup

Start by creating the module and directory structure:

```text
bookapi/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── handler/
│   │   └── book.go
│   ├── middleware/
│   │   └── middleware.go
│   ├── model/
│   │   └── book.go
│   └── repository/
│       └── book.go
├── go.mod
└── go.sum
```

```bash
mkdir -p bookapi/cmd/server bookapi/internal/{handler,middleware,model,repository}
cd bookapi
go mod init github.com/yourusername/bookapi
```

### Domain Model

Define the `Book` struct that represents the core entity:

```go
// internal/model/book.go
package model

import "time"

type Book struct {
    ID        int64     `json:"id"`
    Title     string    `json:"title"`
    Author    string    `json:"author"`
    ISBN      string    `json:"isbn"`
    Published int       `json:"published"` // publication year
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

type CreateBookRequest struct {
    Title     string `json:"title"`
    Author    string `json:"author"`
    ISBN      string `json:"isbn"`
    Published int    `json:"published"`
}

type UpdateBookRequest struct {
    Title     *string `json:"title,omitempty"`
    Author    *string `json:"author,omitempty"`
    ISBN      *string `json:"isbn,omitempty"`
    Published *int    `json:"published,omitempty"`
}
```

Using pointer fields for `UpdateBookRequest` enables partial updates — only non-nil fields are applied.

### Repository Layer

The repository abstracts database operations behind an interface, making the handlers testable:

```go
// internal/repository/book.go
package repository

import (
    "database/sql"
    "fmt"
    "time"

    "github.com/yourusername/bookapi/internal/model"
)

type BookRepository interface {
    GetAll() ([]model.Book, error)
    GetByID(id int64) (*model.Book, error)
    Create(req model.CreateBookRequest) (*model.Book, error)
    Update(id int64, req model.UpdateBookRequest) (*model.Book, error)
    Delete(id int64) error
}

type PostgresBookRepository struct {
    db *sql.DB
}

func NewPostgresBookRepository(db *sql.DB) *PostgresBookRepository {
    return &PostgresBookRepository{db: db}
}

func (r *PostgresBookRepository) GetAll() ([]model.Book, error) {
    rows, err := r.db.Query(`SELECT id, title, author, isbn, published, created_at, updated_at FROM books ORDER BY id`)
    if err != nil {
        return nil, fmt.Errorf("query books: %w", err)
    }
    defer rows.Close()

    var books []model.Book
    for rows.Next() {
        var b model.Book
        if err := rows.Scan(&b.ID, &b.Title, &b.Author, &b.ISBN, &b.Published, &b.CreatedAt, &b.UpdatedAt); err != nil {
            return nil, fmt.Errorf("scan book: %w", err)
        }
        books = append(books, b)
    }
    return books, rows.Err()
}

func (r *PostgresBookRepository) GetByID(id int64) (*model.Book, error) {
    var b model.Book
    err := r.db.QueryRow(
        `SELECT id, title, author, isbn, published, created_at, updated_at FROM books WHERE id = $1`, id,
    ).Scan(&b.ID, &b.Title, &b.Author, &b.ISBN, &b.Published, &b.CreatedAt, &b.UpdatedAt)
    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, fmt.Errorf("query book %d: %w", id, err)
    }
    return &b, nil
}

func (r *PostgresBookRepository) Create(req model.CreateBookRequest) (*model.Book, error) {
    now := time.Now()
    var b model.Book
    err := r.db.QueryRow(
        `INSERT INTO books (title, author, isbn, published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, author, isbn, published, created_at, updated_at`,
        req.Title, req.Author, req.ISBN, req.Published, now, now,
    ).Scan(&b.ID, &b.Title, &b.Author, &b.ISBN, &b.Published, &b.CreatedAt, &b.UpdatedAt)
    if err != nil {
        return nil, fmt.Errorf("create book: %w", err)
    }
    return &b, nil
}

func (r *PostgresBookRepository) Update(id int64, req model.UpdateBookRequest) (*model.Book, error) {
    // Build a dynamic UPDATE query — only set non-nil fields
    setClauses := []string{}
    args := []interface{}{}
    argIdx := 1

    if req.Title != nil {
        setClauses = append(setClauses, fmt.Sprintf("title = $%d", argIdx))
        args = append(args, *req.Title)
        argIdx++
    }
    if req.Author != nil {
        setClauses = append(setClauses, fmt.Sprintf("author = $%d", argIdx))
        args = append(args, *req.Author)
        argIdx++
    }
    if req.ISBN != nil {
        setClauses = append(setClauses, fmt.Sprintf("isbn = $%d", argIdx))
        args = append(args, *req.ISBN)
        argIdx++
    }
    if req.Published != nil {
        setClauses = append(setClauses, fmt.Sprintf("published = $%d", argIdx))
        args = append(args, *req.Published)
        argIdx++
    }

    if len(setClauses) == 0 {
        return r.GetByID(id) // nothing to update, return current
    }

    setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argIdx))
    args = append(args, time.Now())
    argIdx++

    args = append(args, id)
    query := fmt.Sprintf(
        `UPDATE books SET %s WHERE id = $%d
         RETURNING id, title, author, isbn, published, created_at, updated_at`,
        joinClauses(setClauses, ", "), argIdx,
    )

    var b model.Book
    err := r.db.QueryRow(query, args...).Scan(
        &b.ID, &b.Title, &b.Author, &b.ISBN, &b.Published, &b.CreatedAt, &b.UpdatedAt,
    )
    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, fmt.Errorf("update book %d: %w", id, err)
    }
    return &b, nil
}

func (r *PostgresBookRepository) Delete(id int64) error {
    result, err := r.db.Exec(`DELETE FROM books WHERE id = $1`, id)
    if err != nil {
        return fmt.Errorf("delete book %d: %w", id, err)
    }
    n, _ := result.RowsAffected()
    if n == 0 {
        return sql.ErrNoRows
    }
    return nil
}

func joinClauses(clauses []string, sep string) string {
    if len(clauses) == 0 {
        return ""
    }
    result := clauses[0]
    for _, c := range clauses[1:] {
        result += sep + c
    }
    return result
}
```

### Middleware

Middleware in Go is any function that wraps an `http.Handler`. These three are essential for any production API:

```go
// internal/middleware/middleware.go
package middleware

import (
    "log"
    "net/http"
    "time"
)

// Logger logs each request with method, path, status, and duration.
func Logger(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
        next.ServeHTTP(sw, r)
        log.Printf("%s %s %d %s", r.Method, r.URL.Path, sw.status, time.Since(start))
    })
}

type statusWriter struct {
    http.ResponseWriter
    status int
}

func (w *statusWriter) WriteHeader(code int) {
    w.status = code
    w.ResponseWriter.WriteHeader(code)
}

// Recovery catches panics and returns a 500 error instead of crashing.
func Recovery(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("panic recovered: %v", err)
                http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}

// CORS adds cross-origin headers for development convenience.
func CORS(next http.Handler) http.Handler {
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

### HTTP Handlers

With Go 1.22+, route patterns support `{param}` syntax for path parameters:

```go
// internal/handler/book.go
package handler

import (
    "encoding/json"
    "net/http"
    "strconv"
    "strings"

    "github.com/yourusername/bookapi/internal/model"
    "github.com/yourusername/bookapi/internal/repository"
)

type BookHandler struct {
    repo repository.BookRepository
}

func NewBookHandler(repo repository.BookRepository) *BookHandler {
    return &BookHandler{repo: repo}
}

// RegisterRoutes wires all endpoints to the ServeMux.
func (h *BookHandler) RegisterRoutes(mux *http.ServeMux) {
    mux.HandleFunc("GET /api/books", h.ListBooks)
    mux.HandleFunc("POST /api/books", h.CreateBook)
    mux.HandleFunc("GET /api/books/{id}", h.GetBook)
    mux.HandleFunc("PUT /api/books/{id}", h.UpdateBook)
    mux.HandleFunc("DELETE /api/books/{id}", h.DeleteBook)
}

func (h *BookHandler) ListBooks(w http.ResponseWriter, r *http.Request) {
    books, err := h.repo.GetAll()
    if err != nil {
        writeError(w, http.StatusInternalServerError, "failed to list books")
        return
    }
    if books == nil {
        books = []model.Book{} // return [] not null
    }
    writeJSON(w, http.StatusOK, books)
}

func (h *BookHandler) CreateBook(w http.ResponseWriter, r *http.Request) {
    var req model.CreateBookRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "invalid JSON body")
        return
    }
    if req.Title == "" || req.Author == "" {
        writeError(w, http.StatusBadRequest, "title and author are required")
        return
    }
    book, err := h.repo.Create(req)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "failed to create book")
        return
    }
    writeJSON(w, http.StatusCreated, book)
}

func (h *BookHandler) GetBook(w http.ResponseWriter, r *http.Request) {
    id, err := parseID(r.PathValue("id"))
    if err != nil {
        writeError(w, http.StatusBadRequest, "invalid book ID")
        return
    }
    book, err := h.repo.GetByID(id)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "failed to get book")
        return
    }
    if book == nil {
        writeError(w, http.StatusNotFound, "book not found")
        return
    }
    writeJSON(w, http.StatusOK, book)
}

func (h *BookHandler) UpdateBook(w http.ResponseWriter, r *http.Request) {
    id, err := parseID(r.PathValue("id"))
    if err != nil {
        writeError(w, http.StatusBadRequest, "invalid book ID")
        return
    }
    var req model.UpdateBookRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "invalid JSON body")
        return
    }
    book, err := h.repo.Update(id, req)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "failed to update book")
        return
    }
    if book == nil {
        writeError(w, http.StatusNotFound, "book not found")
        return
    }
    writeJSON(w, http.StatusOK, book)
}

func (h *BookHandler) DeleteBook(w http.ResponseWriter, r *http.Request) {
    id, err := parseID(r.PathValue("id"))
    if err != nil {
        writeError(w, http.StatusBadRequest, "invalid book ID")
        return
    }
    if err := h.repo.Delete(id); err != nil {
        if strings.Contains(err.Error(), "no rows") {
            writeError(w, http.StatusNotFound, "book not found")
            return
        }
        writeError(w, http.StatusInternalServerError, "failed to delete book")
        return
    }
    w.WriteHeader(http.StatusNoContent)
}

// -- helpers --

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
    writeJSON(w, status, map[string]string{"error": message})
}

func parseID(s string) (int64, error) {
    return strconv.ParseInt(s, 10, 64)
}
```

### Database Schema and Migration

Create the database migration SQL:

```sql
CREATE TABLE IF NOT EXISTS books (
    id         BIGSERIAL PRIMARY KEY,
    title      TEXT      NOT NULL,
    author     TEXT      NOT NULL,
    isbn       TEXT      NOT NULL DEFAULT '',
    published  INTEGER   NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_books_title ON books (title);
CREATE INDEX idx_books_author ON books (author);
```

### Server Entry Point

Wire everything together in `cmd/server/main.go`:

```go
// cmd/server/main.go
package main

import (
    "context"
    "database/sql"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    _ "github.com/lib/pq"

    "github.com/yourusername/bookapi/internal/handler"
    "github.com/yourusername/bookapi/internal/middleware"
    "github.com/yourusername/bookapi/internal/repository"
)

func main() {
    dbDSN := os.Getenv("DATABASE_URL")
    if dbDSN == "" {
        dbDSN = "postgres://localhost:5432/bookapi?sslmode=disable"
    }

    db, err := sql.Open("postgres", dbDSN)
    if err != nil {
        log.Fatalf("failed to open database: %v", err)
    }
    defer db.Close()

    if err := db.Ping(); err != nil {
        log.Fatalf("failed to ping database: %v", err)
    }
    log.Println("connected to database")

    repo := repository.NewPostgresBookRepository(db)
    bookHandler := handler.NewBookHandler(repo)

    mux := http.NewServeMux()
    bookHandler.RegisterRoutes(mux)

    // Wrap with middleware chain
    var h http.Handler = mux
    h = middleware.Logger(h)
    h = middleware.Recovery(h)
    h = middleware.CORS(h)

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    srv := &http.Server{
        Addr:         ":" + port,
        Handler:      h,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        log.Printf("server starting on :%s", port)
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("server error: %v", err)
        }
    }()

    <-quit
    log.Println("shutting down...")

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("forced shutdown: %v", err)
    }
    log.Println("server stopped")
}
```

## Code Examples

### Running the API

```bash
# Start PostgreSQL (Docker)
docker run -d --name bookapi-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bookapi \
  -p 5432:5432 \
  postgres:16-alpine

# Apply migration
psql postgres://postgres:postgres@localhost:5432/bookapi?sslmode=disable \
  -f migrations/001_create_books.sql

# Start server
DATABASE_URL="postgres://postgres:postgres@localhost:5432/bookapi?sslmode=disable" \
  go run ./cmd/server/
```

### Testing the Endpoints

```bash
# Create a book
curl -s -X POST http://localhost:8080/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"The Go Programming Language","author":"Donovan & Kernighan","isbn":"978-0134190440","published":2015}' | jq .

# List all books
curl -s http://localhost:8080/api/books | jq .

# Get a single book
curl -s http://localhost:8080/api/books/1 | jq .

# Update a book (partial)
curl -s -X PUT http://localhost:8080/api/books/1 \
  -H "Content-Type: application/json" \
  -d '{"published":2016}' | jq .

# Delete a book
curl -s -X DELETE http://localhost:8080/api/books/1 -w "\nHTTP Status: %{http_code}\n"
```

### Writing Table-Driven Tests

Go's standard library `testing` package and `httptest` make it easy to write thorough handler tests:

```go
// internal/handler/book_test.go
package handler

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"

    "github.com/yourusername/bookapi/internal/model"
)

// Stub repository for isolated handler tests.
type stubRepo struct {
    books []model.Book
    err   error
}

func (s *stubRepo) GetAll() ([]model.Book, error)       { return s.books, s.err }
func (s *stubRepo) GetByID(id int64) (*model.Book, error) {
    for _, b := range s.books {
        if b.ID == id {
            return &b, nil
        }
    }
    return nil, nil
}
func (s *stubRepo) Create(req model.CreateBookRequest) (*model.Book, error) {
    return &model.Book{ID: 1, Title: req.Title, Author: req.Author}, s.err
}
func (s *stubRepo) Update(id int64, req model.UpdateBookRequest) (*model.Book, error) {
    return &model.Book{ID: id, Title: "Updated"}, s.err
}
func (s *stubRepo) Delete(id int64) error { return s.err }

func TestListBooks(t *testing.T) {
    tests := []struct {
        name       string
        repo       *stubRepo
        wantStatus int
        wantBody   string
    }{
        {
            name:       "empty list returns empty array",
            repo:       &stubRepo{books: []model.Book{}},
            wantStatus: http.StatusOK,
            wantBody:   `[]`,
        },
        {
            name: "returns all books",
            repo: &stubRepo{books: []model.Book{
                {ID: 1, Title: "Go in Action", Author: "William Kennedy"},
            }},
            wantStatus: http.StatusOK,
            wantBody:   `"Go in Action"`,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            h := NewBookHandler(tt.repo)
            req := httptest.NewRequest(http.MethodGet, "/api/books", nil)
            rec := httptest.NewRecorder()
            h.ListBooks(rec, req)

            if rec.Code != tt.wantStatus {
                t.Errorf("status = %d, want %d", rec.Code, tt.wantStatus)
            }
            if !strings.Contains(rec.Body.String(), tt.wantBody) {
                t.Errorf("body = %s, want to contain %s", rec.Body.String(), tt.wantBody)
            }
        })
    }
}

func TestCreateBook_Validation(t *testing.T) {
    h := NewBookHandler(&stubRepo{})
    body := `{"title":"","author":""}`
    req := httptest.NewRequest(http.MethodPost, "/api/books", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    rec := httptest.NewRecorder()
    h.CreateBook(rec, req)

    if rec.Code != http.StatusBadRequest {
        t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
    }

    var resp map[string]string
    json.NewDecoder(rec.Body).Decode(&resp)
    if resp["error"] == "" {
        t.Error("expected error message in response")
    }
}
```

Run the tests:

```bash
go test ./... -v -count=1
```

## Key Insights

- **Prefer the standard library for routing** — Go 1.22+ `http.ServeMux` supports `GET /path/{param}` patterns natively, eliminating the need for third-party routers in most applications. This reduces dependencies and keeps your codebase lean.
- **Use interfaces for testability** — Defining `BookRepository` as an interface allows handlers to be tested with in-memory or stub implementations without a real database. This pattern scales to any external dependency.
- **Dynamic UPDATE queries are worth the complexity** — Using pointer fields in update requests lets clients send only the fields they want to change. Build the SQL query dynamically from non-nil fields to avoid overwriting existing data with blanks.
- **Middleware chains should be ordered deliberately** — Place recovery middleware outermost (to catch panics from any inner layer), then logging, then CORS, then your business handlers. Each layer has a specific responsibility.
- **Graceful shutdown is not optional** — Without `signal.Notify` and `srv.Shutdown`, killing the process mid-request can corrupt data or leave connections open. Always implement shutdown handling in production services.
- **Table-driven tests make handler testing systematic** — Combining `httptest.NewRecorder` with table-driven test cases lets you cover happy paths, edge cases, and error states in a readable, maintainable way.

## Next Steps

- Explore the [Go Concurrency Patterns Guide](../guides/golang-concurrency-patterns-guide.md) to add parallel processing to your API.
- Learn more about Go's `context` package for request-scoped values and cancellation in web handlers.
- Add authentication middleware using JWT or OAuth2 — the Go standard library's `crypto` packages have everything you need.
- Study the [Go Syllabus](../syllabi/go-syllabus.md) for a structured learning path from intermediate to advanced Go topics.
- Containerize your API with Docker and deploy with Docker Compose or Kubernetes.

## Conclusion

You have built a complete RESTful API for book management using only Go's standard library. The project demonstrates clean separation of concerns (handlers → repository → model), production middleware (logging, recovery, CORS), PostgreSQL integration with parameterized queries, graceful shutdown, and table-driven tests. These patterns form the foundation of any production Go web service and transfer directly to projects using frameworks like Gin, Echo, or Chi.

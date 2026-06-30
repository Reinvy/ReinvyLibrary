---
title: "Membangun RESTful API dengan Go"
description: "Tutorial praktis tentang membangun RESTful API lengkap menggunakan library standar Go, mencakup penanganan HTTP, JSON, middleware, integrasi database, dan pengujian."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun RESTful API dengan Go

## Ringkasan

Tutorial ini memandu Anda membangun RESTful API bergaya produksi untuk layanan manajemen buku menggunakan library standar Go (`net/http`, `encoding/json`). Anda akan mempelajari cara mendesain endpoint API yang bersih, mengimplementasikan middleware kustom untuk pencatatan log dan autentikasi, berintegrasi dengan database PostgreSQL, menangani permintaan dan respons JSON, serta menulis pengujian yang menyeluruh untuk HTTP handler. Pada akhirnya, Anda akan memiliki REST API yang fungsional dan mengikuti idiom Go serta konvensi produksi.

## Target Audiens

- Pengembang backend dengan pengetahuan dasar Go (variabel, fungsi, struct, interface).
- Pengembang yang beralih dari bahasa lain (Node.js, Python, Java) yang ingin membangun web API di Go.
- Tingkat menengah — mengasumsikan keakraban dengan sintaks Go, `go mod`, dan penggunaan terminal.

## Prasyarat

- Go 1.22+ terinstal secara lokal (unduh dari [go.dev/dl](https://go.dev/dl)).
- Pemahaman dasar tentang prinsip desain RESTful API (GET, POST, PUT, DELETE, kode status).
- Keakraban dengan SQL dan database relasional (PostgreSQL membantu tetapi tidak wajib).
- Editor kode atau IDE (VS Code dengan ekstensi Go direkomendasikan).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mendesain dan mengimplementasikan endpoint RESTful API menggunakan `net/http` dan routing yang ditingkatkan di Go 1.22+.
- Mengurai dan memvalidasi body permintaan JSON dengan `encoding/json`.
- Membangun middleware yang dapat digunakan kembali untuk pencatatan log, pemulihan, dan CORS.
- Terhubung ke database PostgreSQL menggunakan `database/sql` dan `lib/pq`.
- Mengimplementasikan operasi CRUD dengan query berparameter.
- Menulis pengujian berbasis tabel untuk HTTP handler.
- Mematikan server HTTP secara graceful.

## Konteks dan Motivasi

Membangun HTTP API adalah salah satu tugas paling umum bagi pengembang backend. Meskipun banyak pengembang Go menggunakan framework pihak ketiga seperti Gin atau Echo, library standar Go telah berkembang secara signifikan — mulai dari Go 1.22, `net/http` mendukung parameter jalur dan routing berbasis metode secara native, sehingga sangat memungkinkan untuk membangun API kualitas produksi tanpa dependensi eksternal.

Tutorial ini berfokus pada pendekatan library standar karena:

- **Mengurangi permukaan dependensi** — lebih sedikit paket pihak ketiga berarti lebih sedikit risiko rantai pasokan dan pembaruan yang lebih mudah.
- **Membangun pengetahuan yang dapat ditransfer** — pola yang Anda pelajari (interface handler, komposisi middleware, propagasi context) berlaku di semua framework web Go.
- **Menjaga build tetap cepat** — library standar Go dikompilasi dalam hitungan milidetik, menjaga siklus umpan balik pengembang tetap ketat.
- **Tetap agnostik framework** — memahami primitif `net/http` yang mendasarinya membuat Anda menjadi pengembang Go yang lebih baik terlepas dari router mana yang akhirnya Anda pilih.

Anda akan membangun **API Manajemen Buku** yang mendukung pembuatan, pembacaan, pembaruan, penghapusan, dan daftar buku — API CRUD klasik yang mencerminkan desain layanan dunia nyata.

## Konten Inti

### Persiapan Proyek

Mulai dengan membuat modul dan struktur direktori:

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
go mod init github.com/namapengguna/bookapi
```

### Model Domain

Definisikan struct `Book` yang mewakili entitas inti:

```go
// internal/model/book.go
package model

import "time"

type Book struct {
    ID        int64     `json:"id"`
    Title     string    `json:"title"`
    Author    string    `json:"author"`
    ISBN      string    `json:"isbn"`
    Published int       `json:"published"`
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

Menggunakan field pointer untuk `UpdateBookRequest` memungkinkan pembaruan parsial — hanya field yang tidak nil yang akan diterapkan.

### Lapisan Repository

Repository mengabstraksi operasi database di belakang sebuah interface, membuat handler dapat diuji:

```go
// internal/repository/book.go
package repository

import (
    "database/sql"
    "fmt"
    "time"

    "github.com/namapengguna/bookapi/internal/model"
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
        return r.GetByID(id)
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

Middleware di Go adalah fungsi yang membungkus `http.Handler`. Tiga middleware ini penting untuk API produksi:

```go
// internal/middleware/middleware.go
package middleware

import (
    "log"
    "net/http"
    "time"
)

// Logger mencatat setiap permintaan dengan method, path, status, dan durasi.
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

// Recovery menangkap panic dan mengembalikan error 500 sebagai gantinya.
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

// CORS menambahkan header lintas-origin untuk kenyamanan pengembangan.
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

### HTTP Handler

Dengan Go 1.22+, pola rute mendukung sintaks `{param}` untuk parameter jalur:

```go
// internal/handler/book.go
package handler

import (
    "encoding/json"
    "net/http"
    "strconv"
    "strings"

    "github.com/namapengguna/bookapi/internal/model"
    "github.com/namapengguna/bookapi/internal/repository"
)

type BookHandler struct {
    repo repository.BookRepository
}

func NewBookHandler(repo repository.BookRepository) *BookHandler {
    return &BookHandler{repo: repo}
}

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
        writeError(w, http.StatusInternalServerError, "gagal mengambil daftar buku")
        return
    }
    if books == nil {
        books = []model.Book{}
    }
    writeJSON(w, http.StatusOK, books)
}

func (h *BookHandler) CreateBook(w http.ResponseWriter, r *http.Request) {
    var req model.CreateBookRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "body JSON tidak valid")
        return
    }
    if req.Title == "" || req.Author == "" {
        writeError(w, http.StatusBadRequest, "judul dan penulis wajib diisi")
        return
    }
    book, err := h.repo.Create(req)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "gagal membuat buku")
        return
    }
    writeJSON(w, http.StatusCreated, book)
}

func (h *BookHandler) GetBook(w http.ResponseWriter, r *http.Request) {
    id, err := parseID(r.PathValue("id"))
    if err != nil {
        writeError(w, http.StatusBadRequest, "ID buku tidak valid")
        return
    }
    book, err := h.repo.GetByID(id)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "gagal mengambil buku")
        return
    }
    if book == nil {
        writeError(w, http.StatusNotFound, "buku tidak ditemukan")
        return
    }
    writeJSON(w, http.StatusOK, book)
}

func (h *BookHandler) UpdateBook(w http.ResponseWriter, r *http.Request) {
    id, err := parseID(r.PathValue("id"))
    if err != nil {
        writeError(w, http.StatusBadRequest, "ID buku tidak valid")
        return
    }
    var req model.UpdateBookRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "body JSON tidak valid")
        return
    }
    book, err := h.repo.Update(id, req)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "gagal memperbarui buku")
        return
    }
    if book == nil {
        writeError(w, http.StatusNotFound, "buku tidak ditemukan")
        return
    }
    writeJSON(w, http.StatusOK, book)
}

func (h *BookHandler) DeleteBook(w http.ResponseWriter, r *http.Request) {
    id, err := parseID(r.PathValue("id"))
    if err != nil {
        writeError(w, http.StatusBadRequest, "ID buku tidak valid")
        return
    }
    if err := h.repo.Delete(id); err != nil {
        if strings.Contains(err.Error(), "no rows") {
            writeError(w, http.StatusNotFound, "buku tidak ditemukan")
            return
        }
        writeError(w, http.StatusInternalServerError, "gagal menghapus buku")
        return
    }
    w.WriteHeader(http.StatusNoContent)
}

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

### Skema Database dan Migrasi

Buat SQL migrasi database:

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

### Titik Masuk Server

Gabungkan semuanya di `cmd/server/main.go`:

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

    "github.com/namapengguna/bookapi/internal/handler"
    "github.com/namapengguna/bookapi/internal/middleware"
    "github.com/namapengguna/bookapi/internal/repository"
)

func main() {
    dbDSN := os.Getenv("DATABASE_URL")
    if dbDSN == "" {
        dbDSN = "postgres://localhost:5432/bookapi?sslmode=disable"
    }

    db, err := sql.Open("postgres", dbDSN)
    if err != nil {
        log.Fatalf("gagal membuka database: %v", err)
    }
    defer db.Close()

    if err := db.Ping(); err != nil {
        log.Fatalf("gagal menghubungi database: %v", err)
    }
    log.Println("terhubung ke database")

    repo := repository.NewPostgresBookRepository(db)
    bookHandler := handler.NewBookHandler(repo)

    mux := http.NewServeMux()
    bookHandler.RegisterRoutes(mux)

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

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        log.Printf("server berjalan di :%s", port)
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("error server: %v", err)
        }
    }()

    <-quit
    log.Println("mematikan server...")

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("penghentian paksa: %v", err)
    }
    log.Println("server berhenti")
}
```

## Contoh Kode

### Menjalankan API

```bash
# Mulai PostgreSQL (Docker)
docker run -d --name bookapi-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bookapi \
  -p 5432:5432 \
  postgres:16-alpine

# Jalankan migrasi
psql postgres://postgres:postgres@localhost:5432/bookapi?sslmode=disable \
  -f migrations/001_create_books.sql

# Mulai server
DATABASE_URL="postgres://postgres:postgres@localhost:5432/bookapi?sslmode=disable" \
  go run ./cmd/server/
```

### Menguji Endpoint

```bash
# Buat buku
curl -s -X POST http://localhost:8080/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"The Go Programming Language","author":"Donovan & Kernighan","isbn":"978-0134190440","published":2015}' | jq .

# Lihat semua buku
curl -s http://localhost:8080/api/books | jq .

# Ambil satu buku
curl -s http://localhost:8080/api/books/1 | jq .

# Perbarui buku (parsial)
curl -s -X PUT http://localhost:8080/api/books/1 \
  -H "Content-Type: application/json" \
  -d '{"published":2016}' | jq .

# Hapus buku
curl -s -X DELETE http://localhost:8080/api/books/1 -w "\nHTTP Status: %{http_code}\n"
```

### Menulis Pengujian Berbasis Tabel

Package `testing` dan `httptest` di library standar Go memudahkan penulisan pengujian handler yang menyeluruh:

```go
// internal/handler/book_test.go
package handler

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"

    "github.com/namapengguna/bookapi/internal/model"
)

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
    return &model.Book{ID: id, Title: "Diperbarui"}, s.err
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
            name:       "daftar kosong mengembalikan array kosong",
            repo:       &stubRepo{books: []model.Book{}},
            wantStatus: http.StatusOK,
            wantBody:   `[]`,
        },
        {
            name: "mengembalikan semua buku",
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
                t.Errorf("status = %d, diharapkan %d", rec.Code, tt.wantStatus)
            }
            if !strings.Contains(rec.Body.String(), tt.wantBody) {
                t.Errorf("body = %s, diharapkan mengandung %s", rec.Body.String(), tt.wantBody)
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
        t.Errorf("status = %d, diharapkan %d", rec.Code, http.StatusBadRequest)
    }

    var resp map[string]string
    json.NewDecoder(rec.Body).Decode(&resp)
    if resp["error"] == "" {
        t.Error("diharapkan pesan error dalam respons")
    }
}
```

Jalankan pengujian:

```bash
go test ./... -v -count=1
```

## Insight Penting

- **Utamakan library standar untuk routing** — `http.ServeMux` Go 1.22+ mendukung pola `GET /path/{param}` secara native, menghilangkan kebutuhan router pihak ketiga di sebagian besar aplikasi. Ini mengurangi dependensi dan menjaga basis kode tetap ramping.
- **Gunakan interface untuk kemampuan uji** — Mendefinisikan `BookRepository` sebagai interface memungkinkan handler diuji dengan implementasi in-memory atau stub tanpa database sungguhan. Pola ini dapat diskalakan ke dependensi eksternal apa pun.
- **Query UPDATE dinamis sepadan dengan kompleksitasnya** — Menggunakan field pointer dalam permintaan pembaruan memungkinkan klien mengirim hanya field yang ingin diubah. Bangun query SQL secara dinamis dari field yang tidak nil untuk menghindari penimpaan data yang ada dengan nilai kosong.
- **Rantai middleware harus diurutkan dengan sengaja** — Tempatkan middleware pemulihan di paling luar (untuk menangkap panic dari lapisan dalam mana pun), kemudian pencatatan log, lalu CORS, lalu handler bisnis Anda. Setiap lapisan memiliki tanggung jawab spesifik.
- **Penghentian graceful bukanlah opsional** — Tanpa `signal.Notify` dan `srv.Shutdown`, mematikan proses di tengah permintaan dapat merusak data atau meninggalkan koneksi terbuka. Selalu implementasikan penanganan penghentian di layanan produksi.
- **Pengujian berbasis tabel membuat pengujian handler menjadi sistematis** — Menggabungkan `httptest.NewRecorder` dengan kasus uji berbasis tabel memungkinkan Anda mencakup jalur normal, kasus batas, dan kondisi error dengan cara yang mudah dibaca dan dipelihara.

## Langkah Berikutnya

- Pelajari [Panduan Pola Konkurensi Go](../guides/golang-concurrency-patterns-guide.md) untuk menambahkan pemrosesan paralel ke API Anda.
- Pelajari lebih lanjut tentang package `context` Go untuk nilai lingkup permintaan dan pembatalan di web handler.
- Tambahkan middleware autentikasi menggunakan JWT atau OAuth2 — package `crypto` library standar Go memiliki semua yang Anda butuhkan.
- Ikuti [Silabus Go](../syllabi/go-syllabus.md) untuk jalur pembelajaran terstruktur dari menengah ke mahir.
- Kontainerisasi API Anda dengan Docker dan deploy dengan Docker Compose atau Kubernetes.

## Kesimpulan

Anda telah membangun RESTful API lengkap untuk manajemen buku hanya menggunakan library standar Go. Proyek ini menunjukkan pemisahan tanggung jawab yang bersih (handler → repository → model), middleware produksi (pencatatan log, pemulihan, CORS), integrasi PostgreSQL dengan query berparameter, penghentian graceful, dan pengujian berbasis tabel. Pola-pola ini membentuk fondasi layanan web Go produksi apa pun dan dapat ditransfer langsung ke proyek yang menggunakan framework seperti Gin, Echo, atau Chi.

---
title: "Membangun API GraphQL dengan Go"
description: "Membangun API GraphQL schema-first di Go dengan gqlgen: resolver hasil generate, dataloader yang menghapus query N+1, identitas JWT pada context request, subscription WebSocket yang dapat dibatalkan, dan tes resolver tanpa database."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun API GraphQL dengan Go

## Ringkasan

Tutorial ini membangun API GraphQL toko buku di Go dengan gqlgen, dimulai dari `schema.graphqls` hingga query, mutation, dan subscription WebSocket yang disajikan lewat `net/http`. Anda akan menambahkan dataloader per request agar relasi penulis hanya memakan satu query alih-alih lima puluh, membatasi operasi tulis dengan identitas JWT yang dibawa di `context.Context`, serta menguji resolver tanpa menjalankan database.

## Target Audiens

- Backend developer yang nyaman dengan `net/http` dan `context` di Go serta menginginkan alternatif REST yang bertipe, ditambah pengembang menengah yang baru memakai GraphQL sebagai klien.

## Prasyarat

- Go 1.22 atau lebih baru, serta pemahaman interface, goroutine, dan `context.Context`.
- Dasar GraphQL (tipe, query, mutation, variabel) dan `curl` untuk pemeriksaan manual.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menghasilkan server Go bertipe dari sebuah skema dan menjelaskan file hasil generate mana yang boleh diedit.
- Mengimplementasikan resolver yang mendelegasikan logika ke lapisan service yang tidak tahu GraphQL.
- Meringkas pembacaan bersarang menjadi query batch dengan dataloader per request.
- Meneruskan identitas terautentikasi lewat context dan mengujinya tanpa database.

## Konteks dan Motivasi

REST menetapkan bentuk respons sejak awal perancangan, sehingga klien cenderung mengambil data berlebih atau harus menyambung beberapa permintaan. GraphQL memungkinkan satu permintaan mendeskripsikan tepat field yang dibutuhkan, termasuk relasi bersarang: daftar buku beserta nama penulisnya menjadi satu query, bukan tiga panggilan. Harga yang dibayar adalah kompleksitas server, dan jawaban Go adalah code generation — gqlgen membaca skema Anda, menghasilkan interface yang wajib dipenuhi kode, dan menolak kompilasi ketika resolver menyimpang dari kontrak. Anda menukar kurva belajar dengan keamanan tipe saat kompilasi alih-alih null tak terduga saat runtime. Jebakan yang hampir selalu muncul pada implementasi pertama adalah fan-out N+1 di bawah.

## Konten Inti

### Skema lebih dulu, dan apa yang dimiliki generator

Rancang `graph/schema.graphqls` berdasarkan apa yang dirender klien: sedikit field root, struktur diletakkan pada tipe. Berkas `gqlgen.yml` memetakan glob skema ke `graph/generated.go` dan stub resolver, dan gqlgen juga menghasilkan `models_gen.go` untuk tipe yang tidak di-bind. Edit hanya berkas resolver; jalankan `go run github.com/99designs/gqlgen generate` setiap kali skema berubah dan commit hasilnya agar build CI tidak bergantung pada versi generator.

### Resolver tipis di atas lapisan service

Resolver menerjemahkan argumen GraphQL menjadi pemanggilan service lalu kembali. Aturan bisnis tinggal di paket `service` yang tidak tahu GraphQL, sehingga kode yang sama dapat melayani REST atau CLI. Lebih dari sekitar lima belas baris, logika sudah berada di lapisan yang salah.

### Dataloader dan jebakan N+1

`books { author { name } }` menyelesaikan `books` sekali, lalu `author` sekali per baris. Dataloader mengumpulkan ID yang diminta dalam satu tick eksekusi, mengirim satu `WHERE id = ANY($1)`, dan membagikan hasilnya kembali. Dataloader wajib per request: loader global mencampur data antar-tenant dan membocorkan data antar pengguna.

### Autentikasi dan subscription

Middleware HTTP memverifikasi JWT dan menyimpan pengguna di context request; resolver membacanya, termasuk resolver subscription sebelum membuka stream. Hindari otorisasi hanya lewat directive, karena directive mudah terlupa pada field baru. Kanal subscription hidup selama socket, sehingga produsen wajib melakukan select pada `ctx.Done()` atau membocorkan satu goroutine setiap kali klien terputus.

## Contoh Kode

```graphql
# graph/schema.graphqls
type Query {
    books(first: Int = 20): [Book!]!
}
type Mutation {
    createBook(input: CreateBookInput!): Book!
}
type Subscription {
    bookAdded: Book!
}
type Book {
    id: ID!
    title: String!
    author: Author!
}
type Author {
    id: ID!
    name: String!
}
input CreateBookInput {
    title: String!
    authorID: ID!
}
```

```go
func (r *queryResolver) Books(ctx context.Context, first *int) ([]*model.Book, error) {
    limit := 20
    if first != nil {
        limit = *first
    }
    if limit < 1 || limit > 100 {
        return nil, fmt.Errorf("first harus antara 1 dan 100, diterima %d", limit)
    }
    books, err := r.Books.List(ctx, limit)
    if err != nil {
        return nil, fmt.Errorf("mengambil daftar buku: %w", err)
    }
    return books, nil
}
```

```go
// graph/loaders.go — satu query batch per tick eksekusi
func NewAuthorLoader(repo AuthorRepo) *dataloader.Loader[string, *model.Author] {
    return dataloader.NewBatchedLoader(func(ctx context.Context, ids []string) []*dataloader.Result[*model.Author] {
        authors, err := repo.ByIDs(ctx, ids)
        out := make([]*dataloader.Result[*model.Author], len(ids))
        for i, id := range ids {
            out[i] = &dataloader.Result[*model.Author]{Data: authors[id], Error: err}
        }
        return out
    })
}
```

```go
func (r *subscriptionResolver) BookAdded(ctx context.Context) (<-chan *model.Book, error) {
    events := make(chan *model.Book, 1)
    sub := r.Broker.Subscribe()
    go func() {
        defer close(events)
        defer sub.Close()
        for {
            select {
            case <-ctx.Done():
                return
            case book, ok := <-sub.C():
                if !ok {
                    return
                }
                events <- book
            }
        }
    }()
    return events, nil
}
```

```go
func TestBooksQuery(t *testing.T) {
    srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{
        Resolvers: &graph.Resolver{Books: fakeBookRepo{rows: 2}},
    }))
    body := `{"query":"{ books(first: 2) { title } }"}`
    req := httptest.NewRequest(http.MethodPost, "/query", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    rec := httptest.NewRecorder()
    srv.ServeHTTP(rec, req)
    if rec.Code != http.StatusOK {
        t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
    }
}
```

## Insight Penting

- Commit kode hasil generate. Meregenerasi di CI menyembunyikan penyimpangan skema di dalam pipeline yang gagal alih-alih diff yang bisa ditinjau.
- Dataloader hanya boleh berada di context request; loader bersama adalah kebocoran data antar-tenant, bukan cache.
- Batasi `first` di resolver dan tambahkan batas kedalaman serta biaya sebelum rilis — fleksibilitas GraphQL adalah vektor amplifikasi.
- Periksa identitas di titik data diekspos, bukan hanya di middleware, agar field baru tidak melewati otorisasi.

## Langkah Berikutnya

- Tambahkan persisted query untuk memperkecil payload dan menolak bentuk query sembarang.
- Terapkan paginasi berbasis cursor begitu daftar melebihi batas `first` sederhana.
- Tambahkan span OpenTelemetry per field dan pelajari panduan testing Go untuk suite resolver table-driven.

## Kesimpulan

Anda kini memiliki API GraphQL schema-first di mana kompilator menegakkan kontrak, pembacaan bersarang menyusut menjadi satu query batch, identitas mengalir lewat context, dan subscription berhenti dengan bersih saat klien terputus. Berikutnya adalah lapisan operasional: batas biaya, tracing, dan caching — kerjakan itu sebelum menambah tipe baru.

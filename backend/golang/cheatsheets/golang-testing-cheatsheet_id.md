---
title: "Cheat Sheet Testing Go"
description: "Referensi cepat untuk test Go: kasus berbasis tabel, subtest, eksekusi paralel, benchmark, httptest, testify, coverage, dan fuzzing."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Testing Go

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Mendeklarasikan test | `func TestTambah(t *testing.T)` | Fungsi test diawali `Test` dan menerima `*testing.T` |
| Menambah subtest | `t.Run("nama", func(t *testing.T) { ... })` | Kasus terisolasi dengan `*testing.T` sendiri |
| Menjalankan paralel | `t.Parallel()` | Menunda sampai test sekuensial di induk selesai |
| Menandai helper | `t.Helper()` | Melaporkan baris pemanggil, bukan baris helper |
| Gagal tapi lanjut | `t.Errorf("dapat %d, ingin %d", got, want)` | Mencatat kegagalan, test tetap jalan |
| Gagal seketika | `t.Fatalf("error tak terduga: %v", err)` | Mencatat kegagalan dan menghentikan test ini |
| Hook pembersihan | `t.Cleanup(func() { ... })` | Dijalankan setelah test dan semua subtest |
| Benchmark | `func BenchmarkParse(b *testing.B)` | Mengulang `b.N` kali; panggil `b.ResetTimer()` |
| Handler HTTP palsu | `httptest.NewRecorder()` | Merekam status, header, dan body di memori |
| Server HTTP palsu | `httptest.NewServer(h)` | Listener nyata untuk test sisi klien |
| Target fuzz | `func FuzzReverse(f *testing.F)` | Isi seed lewat `f.Add`, asersi lewat `f.Fuzz` |
| Profil coverage | `go test -coverprofile=cover.out ./...` | Menulis profil untuk `go tool cover` |
| Deteksi race | `go test -race ./...` | Menangkap data race saat test berjalan |
| Asersi testify | `require.NoError(t, err)` | Menghentikan test bila error tidak nil |

## Perintah Umum

### Menjalankan Test

```bash
# Semua paket dalam modul, verbose
go test -v ./...

# Satu test atau subtest berdasarkan regex
go test -run 'TestParse/empty_input' ./pkg/parser

# Berhenti pada kegagalan pertama dengan batas waktu tegas
go test -failfast -timeout 60s ./...
```

### Coverage, Benchmark, dan Fuzzing

```bash
# Profil coverage sekaligus ringkasan per fungsi
go test -coverprofile=cover.out -covermode=atomic ./...
go tool cover -func=cover.out

# Benchmark dengan statistik alokasi
go test -bench='BenchmarkParse' -benchmem ./...

# Fuzz selama 30 detik, lalu ulangi kegagalan dari testdata/fuzz
go test -fuzz=FuzzReverse -fuzztime=30s ./pkg/text
```

## Potongan Kode

### Test Berbasis Tabel dengan Subtest Paralel

```go
package calc

import "testing"

func TestBagi(t *testing.T) {
    tests := []struct {
        nama       string
        a, b       int
        ingin      int
        inginError bool
    }{
        {nama: "positif", a: 10, b: 2, ingin: 5},
        {nama: "negatif", a: -9, b: 3, ingin: -3},
        {nama: "pembagi_nol", a: 1, b: 0, inginError: true},
    }

    for _, tc := range tests {
        t.Run(tc.nama, func(t *testing.T) {
            t.Parallel()

            hasil, err := Bagi(tc.a, tc.b)
            switch {
            case tc.inginError && err == nil:
                t.Fatalf("Bagi(%d, %d): seharusnya menghasilkan error", tc.a, tc.b)
            case err != nil:
                t.Fatalf("Bagi(%d, %d): %v", tc.a, tc.b, err)
            case hasil != tc.ingin:
                t.Errorf("Bagi(%d, %d) = %d, ingin %d", tc.a, tc.b, hasil, tc.ingin)
            }
        })
    }
}
```

### Test Handler HTTP dengan httptest

```go
// import: net/http, net/http/httptest, encoding/json, testing
func TestAmbilUser(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/users/42", nil)
    rec := httptest.NewRecorder()

    AmbilUser(rec, req)

    res := rec.Result()
    defer res.Body.Close()

    if res.StatusCode != http.StatusOK {
        t.Fatalf("status = %d, ingin %d", res.StatusCode, http.StatusOK)
    }

    var body struct{ ID int `json:"id"` }
    if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
        t.Fatalf("gagal decode respons: %v", err)
    }
    if body.ID != 42 {
        t.Errorf("id = %d, ingin 42", body.ID)
    }
}
```

### Asersi dengan Testify

```go
// import: testing, github.com/stretchr/testify/assert, .../require
func TestBuatOrder(t *testing.T) {
    repo := NewMemoryRepo()
    order, err := repo.Create(Order{CustomerID: "c_1", Total: 2500})

    require.NoError(t, err)
    require.NotNil(t, order)
    assert.NotEmpty(t, order.ID)
    assert.Equal(t, 2500, order.Total)
}
```

### Benchmark dan Target Fuzz

```go
// import: strings, testing, unicode/utf8
func BenchmarkGabung(b *testing.B) {
    bagian := []string{"alpha", "beta", "gamma"}
    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        _ = strings.Join(bagian, ",")
    }
}

func FuzzBalik(f *testing.F) {
    f.Add("halo")

    f.Fuzz(func(t *testing.T, input string) {
        if !utf8.ValidString(input) {
            t.Skip("bukan UTF-8 valid")
        }
        if dua := Balik(Balik(input)); dua != input {
            t.Fatalf("pembalikan ganda mengubah %q menjadi %q", input, dua)
        }
    })
}
```

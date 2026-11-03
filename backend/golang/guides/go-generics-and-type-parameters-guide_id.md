---
title: "Panduan Generics dan Type Parameters di Go"
description: "Pola desain generics di Go: menyusun constraint yang bisa dikomposisi, menjaga daftar type parameter tetap terbaca, membedakan container generik dan algoritma generik, serta mengukur biaya instantiation sebelum menggeneralisasi kode produksi."
category: "backend"
technology: "golang"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Generics dan Type Parameters di Go

## Pendahuluan

Generics hadir di Go 1.18 dan mengubah cara library ditulis, tetapi tidak mengubah cara library gagal. Masalah produksi yang paling sering muncul bukan lagi ketiadaan type parameter — melainkan kode generik yang lebih sulit dibaca, lebih sulit di-debug, dan tidak lebih cepat daripada versi berbasis interface yang digantikannya. Helper `func Map[T any, U any]([]T, func(T) U) []U` itu sepele; abstraksi repository dengan empat type parameter dan rantai constraint bersarang adalah beban maintenance yang perlahan berhenti dipahami oleh reviewer.

Panduan ini membahas sisi desain generics di Go: bagaimana menulis constraint yang mendeskripsikan perilaku alih-alih mendaftar tipe, kapan container generik layak menanggung kompleksitasnya dan kapan satu type parameter saja sudah terlalu banyak, bagaimana menjaga kontrak zero value tetap jujur, serta apa yang sebenarnya dilakukan compiler saat instantiation ketika Anda memutuskan apakah generics akan menghilangkan bottleneck alokasi. Setiap rekomendasi di bawah didemonstrasikan pada modul yang benar-benar berjalan, termasuk benchmark yang membandingkan implementasi generik dengan versi interface-dan-type-assertion supaya trade-off-nya terukur, bukan diasumsikan.

Audiens panduan ini adalah developer Go yang sudah lancar menulis interface dan sekarang perlu menerbitkan API generik untuk tim lain — library platform internal, helper koleksi, result type, cache bertipe — tanpa mengubah package bersama menjadi teka-teki yang tak bisa di-review.

## Praktik Terbaik

### 1. Batasi pada Perilaku, Bukan Tipe Konkret

Sebuah constraint harus mendeskripsikan operasi yang dibutuhkan fungsi, bukan daftar tipe yang kebetulan Anda uji. Ketika constraint-nya `int64 | float64`, pemanggil yang punya tipe bernama `Amount` jadi terkunci dan setiap tipe numerik baru berarti mengubah library. Gunakan union berisi approximation tipe dasar (`~`) yang dibungkus interface bernama agar maksudnya terdokumentasi satu kali:

```go
type Number interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
        ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
        ~float32 | ~float64
}
```

Prefiks `~` menerima tipe apa pun yang tipe dasarnya cocok, sehingga `type Amount int64` memenuhi `Number` tanpa konversi eksplisit di setiap call site. Constraint bernama juga memberi Anda tempat untuk menaruh komentar dokumentasi, yang tidak dimiliki union mentah.

### 2. Jaga Daftar Type Parameter Tetap Pendek dan Bermakna

Satu type parameter hampir selalu gratis. Dua biasanya masih wajar (`Map[T, U]`). Tiga atau lebih adalah tanda desain yang membawa konfigurasi yang seharusnya menjadi field struct atau nilai fungsi biasa. Jika signature terbaca `func Process[A any, B any, C comparable, D Number](...)`, reviewer tidak bisa memegang kontraknya di kepala, dan type inference akan mulai gagal dengan cara yang memaksa pemanggil menuliskan semua argumen secara eksplisit. Beralihlah ke struct dengan field.

### 3. Pilih Tipe Generik untuk Container, Fungsi Generik untuk Algoritma

Tipe generik berumur panjang saat memodelkan container nilai (`Cache[K, V]`, `Stack[T]`, `Result[T]`), karena type parameter muncul pada identitas tipe dan pemanggil membacanya sekali saat konstruksi. Fungsi generik berumur panjang untuk satu algoritma yang jelas (`Map`, `Filter`, `Must`). Yang cepat rusak adalah fungsi generik yang type parameter-nya hanya dipakai meneruskan data — pada titik itu Anda menulis `any` yang lebih lambat dengan sintaks tambahan.

### 4. Rancang Constraint sebagai Interface yang Bisa Dikomposisi

Komposisikan constraint kecil alih-alih menulis satu union besar. Constraint yang meng-embed dua constraint lain mendokumentasikan dirinya sendiri, dan nama yang di-embed bisa dipakai ulang oleh pemanggil yang butuh kontrak lebih sempit:

```go
type Ordered interface {
    Number | ~string
}

type Key interface {
    comparable
    fmt.Stringer
}
```

`comparable` adalah constraint bawaan dan bisa di-embed langsung. Pegang aturan ini: constraint dengan lebih dari sekitar enam baris anggota union adalah kandidat untuk dipecah menjadi `Signed`, `Unsigned`, `Floating` lalu dikomposisi.

### 5. Hormati Kontrak Zero Value

Kode generik tidak boleh mengasumsikan sebuah nilai valid. `var zero T` legal untuk setiap `T`, dan fungsi generik yang mengembalikan `(T, error)` wajib mengembalikan zero value saat gagal — jangan pernah struct setengah terinisialisasi. Pemanggil menulis `if err != nil` lalu membuang nilainya, tetapi linter dan test tetap harus memastikannya. Serupa dengan itu, helper map atau slice generik hanya boleh mengembalikan hasil kosong non-nil ketika pemanggil memang mengharapkannya; mengembalikan `nil` untuk `[]T` kosong mengejutkan siapa pun yang melakukan marshal ke JSON, karena `nil` menjadi `null` sedangkan `[]T{}` menjadi `[]`.

### 6. Jangan Menggeneralisasi Kode yang Hanya Dipakai Sekali

Generics memberi keuntungan berupa reuse antar tipe. Jika sebuah helper hanya punya satu pemanggil dengan satu tipe, type parameter itu murni indireksi: ia membebani keterbacaan sekarang dan tidak memberi apa pun sampai pemanggil kedua muncul. Tulis versi konkretnya, rilis, lalu generalisasi ketika call site kedua dan ketiga membuktikan bentuk bersamanya. Over-generalisasi klasik adalah `Handler[Req, Res]` generik untuk layanan HTTP dengan tiga route — versi interface lebih pendek, lebih mudah diuji, dan menghasilkan stack trace yang lebih baik.

### 7. Jangan Pernah Menambah Type Parameter untuk Memperbaiki Type Assertion

Jika kode hari ini butuh `any` plus type switch agar bekerja, mengubah switch itu menjadi constraint hanya layak dilakukan ketika himpunan tipenya tertutup dan diketahui. Jika himpunannya terbuka — payload plugin, JSON hasil decode, konfigurasi dinamis — constraint memaksa setiap tipe baru menjadi perubahan kode di library. Dalam kasus itu, pertahankan `any` dan validasi di batas sistem.

### 8. Pahami Model Biayanya Sebelum Mengklaim Kemenangan Performa

Go mengompilasi generics dengan GC shape stenciling: tipe yang berbagi layout memori memakai satu instantiation, dan parameter berbentuk interface dilewatkan melalui dictionary dengan dynamic dispatch. Tipe nilai dengan bentuk berbeda (misalnya `int` dan `float64`) mendapat instantiation sendiri, yang cepat; instantiation berbentuk pointer berbagi kode dan melakukan dispatch melalui dictionary, yang biayanya lebih dekat ke interface daripada yang biasanya diperkirakan. Selalu benchmark versi generik melawan versi interface sebelum mengklaim generics menghilangkan alokasi atau dispatch. Langkah benchmark di bawah ada persis untuk alasan ini.

## Langkah Implementasi

### Langkah 1: Siapkan Modul dan Catat Baseline

Mulai dengan modul dan satu benchmark terhadap implementasi berbasis interface yang akan Anda gantikan, supaya perbandingannya jujur sejak commit pertama.

```bash
mkdir genericsguide && cd genericsguide
go mod init example.com/genericsguide
go version
```

```go
// baseline_test.go
package genericsguide

import "testing"

// Bentuk pra-generics: any + assertion, atau interface dengan metode Sum.
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

Jalankan `go test -bench=Sum -benchmem` dan catat angkanya. Setiap klaim tentang generics nanti dibandingkan dengan garis ini.

### Langkah 2: Definisikan Constraint Sekali, di Package Sendiri

Taruh constraint yang bisa dipakai ulang di package kecil tanpa dependensi agar library Anda dan konsumennya bisa mengimpornya tanpa risiko import cycle.

```go
// constraints/constraints.go
package constraints

// Number menerima setiap kind numerik bawaan, termasuk tipe bernama
// yang tipe dasarnya numerik (type Amount int64 memenuhi Number).
type Number interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
        ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
        ~float32 | ~float64
}

// Ordered menambahkan string ke Number untuk helper pengurutan dan perbandingan.
type Ordered interface {
    Number | ~string
}
```

Go 1.21 dan setelahnya menyediakan `cmp.Ordered` yang mencakup kebutuhan serupa untuk package `slices` dan `maps` di standard library. Utamakan `cmp.Ordered` bila Anda hanya butuh perbandingan, dan pertahankan `Number` sendiri hanya jika butuh aritmetika.

### Langkah 3: Tulis Fungsi Generik terhadap Constraint Tersebut

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

// Amount adalah tipe numerik bernama; tanda ~ pada Number menerimanya tanpa konversi.
type Amount int64

func Cents[T constraints.Number](values []T) int64 {
    return int64(Sum(values))
}
```

Tipe bernama sekarang masuk langsung ke `Sum` tanpa loop konversi di setiap call site — ini manfaat konkret pertama dari approximation `~`, dan alasan memilihnya alih-alih union polos.

### Langkah 4: Bangun Container Generik, Bukan Wrapper Generik

Cache bertipe adalah kasus klasik di mana generics jelas sepadan: key harus hashable, value bersifat opaque, dan alternatifnya adalah `map[string]any` dengan assertion di setiap `Get`.

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

Dua detail penting di sini. Struct `entry[V]` generik tetapi tidak diekspor, sehingga API publiknya tetap satu pasang type parameter. Jalur miss pada `Get` mengembalikan `var zero V` alih-alih pointer nil — pemanggil dengan tipe nilai mendapat zero value yang bisa dipakai tanpa kejutan.

### Langkah 5: Modelkan Hasil Alih-alih Mengembalikan `any`

`Result[T]` generik menghilangkan sumber assertion paling umum di kode service sekaligus menjaga error handling tetap idiomatik.

```go
// result.go
package genericsguide

type Result[T any] struct {
    value T
    err   error
}

func OK[T any](value T) Result[T]       { return Result[T]{value: value} }
func Fail[T any](err error) Result[T]   { return Result[T]{err: err} }
func (r Result[T]) Unwrap() (T, error)  { return r.value, r.err }
func (r Result[T]) IsOK() bool          { return r.err == nil }

// MapResult mentransformasi nilai sukses dan meneruskan kegagalan apa adanya.
func MapResult[T, U any](r Result[T], fn func(T) U) Result[U] {
    if r.err != nil {
        return Fail[U](r.err)
    }
    return OK(fn(r.value))
}
```

Perhatikan bahwa method pada tipe generik tidak bisa mendeklarasikan type parameter sendiri. Karena itu `MapResult` adalah fungsi level package yang menerima receiver sebagai argumen pertama; menulis `func (r Result[T]) Map[U any](...)` tidak akan terkompilasi.

### Langkah 6: Tentukan Bentuk Repository dengan Trade-Off yang Terukur

Repository generik bekerja ketika setiap entity mengekspos metode identitas. Ia gagal ketika entity butuh query berbeda, dan kegagalannya mahal karena setiap kasus khusus menjadi method interface dengan badan `not implemented`.

```go
// repo.go
package genericsguide

import (
    "context"
    "errors"
    "sync"
)

var ErrNotFound = errors.New("not found")

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

Aturan yang perlu dipegang: hanya generalisasi operasi yang benar-benar identik pada semua entity (ambil berdasarkan id, list, simpan). Apa pun yang spesifik entity tetap method konkret pada tipe konkret — jangan menambah type parameter pada query yang hanya akan dijalankan satu entity.

### Langkah 7: Benchmark Jalur Generik Melawan Jalur Interface

Input sama, pekerjaan sama, keduanya dikompilasi di binary test yang sama.

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

Baca hasilnya dengan cermat. `Sum` atas `Amount` (tipe dasar `int64`) mendapat instantiation khusus, sehingga biasanya mengalahkan versi interface dengan menghilangkan indirect call per elemen tanpa alokasi. Sekarang ulangi eksperimen dengan `[]Value` diganti slice of pointer dan amati selisihnya menyusut — instantiation berbentuk pointer melakukan dispatch melalui dictionary, dan keunggulannya hilang. Itulah sinyal bahwa generics tidak membeli performa pada kode tersebut, dan keputusannya harus diambil murni atas dasar type safety.

### Langkah 8: Vet, Lint, dan Dokumentasikan API Generik Publik

Generics memunculkan mode kegagalan baru yang terlambat ditangkap `go vet` dan lebih terlambat lagi oleh reviewer.

```bash
go vet ./...
go test ./... -race -count=1
staticcheck ./...
```

Checklist sebelum menerbitkan package generik:

1. Setiap type parameter yang diekspor disebutkan di komentar dokumentasi (`Cache[K comparable, V any]` — jelaskan syarat `K` dan apa yang terjadi saat miss).
2. Setiap constraint berada di tipe bernama dengan komentar, bukan union inline.
3. Setiap fungsi generik yang mengembalikan `(T, error)` mendokumentasikan nilai yang dikembalikan saat error.
4. Setiap tipe container punya test yang menginstansiasinya dengan minimal satu tipe bernama dan satu tipe bawaan, karena keduanya menempuh jalur instantiation berbeda.
5. Tidak ada API terekspor yang memaksa pemanggil menuliskan type argument yang seharusnya bisa diinferensi.

Jika pemanggil harus menulis `Sum[int64](values)` karena inference gagal, signature-nya salah — biasanya type parameter hanya muncul di posisi return atau di dalam tipe fungsi bersarang.

### Langkah 9: Migrasi Kode Lama Secara Bertahap

Jangan menulis ulang library berbasis interface dalam satu commit. Konversi satu call site setiap kali dan pertahankan kedua implementasi di bawah test yang sama.

```text
Fase 1: tambahkan package constraints + helper generik di samping versi interface
Fase 2: migrasikan satu pemanggil internal, versi interface tetap diekspor
Fase 3: jalankan keduanya pada tabel test yang sama dan benchmark
Fase 4: hapus versi interface hanya ketika tidak ada pemanggil eksternal yang mengimpornya
```

Menghapus API lama adalah langkah yang merusak build downstream, jadi ia harus berada di rilis terpisah dengan catatan deprecation, tidak pernah di pull request yang sama dengan commit yang memperkenalkan versi generik.

## Kesimpulan

Generics di Go adalah alat presisi untuk container bertipe dan algoritma kecil, bukan mekanisme abstraksi serba guna. Aturan yang menjaganya tetap bisa dirawat konsisten: batasi pada perilaku dengan constraint bernama yang bisa dikomposisi menggunakan `~`; jaga type parameter tetap satu atau dua; utamakan container daripada wrapper penerus; hormati zero value; tolak menggeneralisasi kode yang hanya punya satu pemanggil; dan benchmark sebelum mengklaim kemenangan performa, karena GC shape stenciling membuat instantiation berbentuk pointer berperilaku mirip interface. Diterapkan dengan cara itu, generics menghapus assertion dari jalur panas dan membuat kontrak library eksplisit alih-alih menambah indireksi. Diterapkan longgar, ia menghasilkan API yang tidak bisa di-review — itulah sebabnya disiplin dalam panduan ini lebih penting daripada sintaksnya.

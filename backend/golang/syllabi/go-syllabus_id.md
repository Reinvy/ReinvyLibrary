---
title: "Silabus Bahasa Pemrograman Go"
description: "Kurikulum komprehensif 12 minggu yang mencakup sintaks Go, konkurensi, pustaka standar, pengembangan web, testing, pembuatan alat CLI, deployment, dan proyek akhir."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Bahasa Pemrograman Go

## Ringkasan

Silabus 12 minggu ini dirancang untuk pengembang yang sudah memiliki pengalaman pemrograman sebelumnya dan ingin menguasai Go (Golang). Kurikulum berjalan dari dasar-dasar bahasa dan sintaks melalui topik lanjutan seperti konkurensi, penguasaan pustaka standar, pengembangan web dengan `net/http`, integrasi database, testing, dan deployment produksi. Setiap minggu dibangun di atas minggu sebelumnya, dan diakhiri dengan proyek akhir yang mendemonstrasikan semua konsep utama. Setelah menyelesaikan kursus ini, peserta akan siap untuk membangun, menguji, dan men-deploy aplikasi Go kelas produksi dengan percaya diri.

## Kurikulum

### Minggu 1: Fondasi Go

- **Mengapa Go?**
  - Sejarah bahasa, filosofi, dan tujuan desain (kesederhanaan, keamanan, kecepatan)
  - Perbandingan Go dengan bahasa lain untuk backend dan pemrograman sistem
  - Ekosistem Go: pustaka standar, modul, perangkat pengembangan
- **Instalasi dan Persiapan**
  - Menginstal Go dari `go.dev` atau melalui package manager
  - Mengatur `GOPATH`, `GOROOT`, dan workspace Go
  - Pengenalan perintah `go`: `go version`, `go env`, `go doc`
- **Program Go Pertama Anda**
  - Deklarasi package dan pernyataan `import`
  - Fungsi `main` dan titik masuk program
  - `fmt.Println` dan output dasar
  - Kompilasi dan menjalankan: `go run` vs `go build`

### Minggu 2: Variabel, Tipe, dan Alur Kontrol

- **Variabel dan Tipe Data**
  - Deklarasi `var`, inferensi tipe dengan `:=`
  - Tipe dasar: `int`, `float64`, `string`, `bool`
  - Nilai zero dan konversi tipe
  - Konstanta dengan `const` dan `iota`
- **Alur Kontrol**
  - Pernyataan `if`, `else`, dan `else if` dengan sintaks inisialisasi
  - Perulangan `for`: standar, hanya kondisi, tak terbatas, dan `range`
  - Pernyataan `switch` dengan varian tanpa ekspresi dan type-switch
- **Fungsi**
  - Deklarasi fungsi, parameter, dan nilai kembali
  - Nilai kembali ganda dan named returns
  - Fungsi variadik dan function values
  - Fungsi anonim dan closure

### Minggu 3: Tipe Komposit dan Struktur Data

- **Array dan Slice**
  - Deklarasi array dan keterbatasannya
  - Internal slice: pointer, length, capacity
  - `append`, `copy`, slicing expressions, dan `make`
  - Trik slice dan pola umum
- **Map**
  - Deklarasi map, inisialisasi dengan `make` dan literal
  - Operasi CRUD: tambah, ambil, hapus, periksa keberadaan
  - Urutan iterasi dan idiom `comma ok`
- **Struct**
  - Definisi struct dan field tagging
  - Embedding struct dan komposisi di atas pewarisan
  - Method pada struct: value vs pointer receivers
- **Pointer**
  - Operator `&` dan `*`, semantik pointer
  - Kapan menggunakan pointer (performa, mutasi, nil-ability)

### Minggu 4: Penanganan Error dan Testing

- **Penanganan Error di Go**
  - Interface `error` dan penanganan error idiomatis
  - Tipe error kustom dengan `fmt.Errorf` dan `errors.New`
  - Pembungkusan error dengan `%w` dan `errors.Is`, `errors.As`
  - Sentinel errors dan praktik terbaik penanganan error
- **Defer, Panic, dan Recover**
  - Pernyataan `defer` dan pola pembersihan
  - `panic` untuk error yang tidak dapat dipulihkan
  - `recover` dalam fungsi deferred
- **Dasar-Dasar Testing**
  - Package `testing`: fungsi `Test*` dan `t *testing.T`
  - Table-driven tests dengan subtests (`t.Run`)
  - Profiling cakupan dengan `go test -cover`
  - Benchmarking dengan fungsi `Benchmark*`

### Minggu 5: Interface dan Generics

- **Interface**
  - Definisi interface dan kepuasan (duck typing)
  - Interface kosong `interface{}` dan `any`
  - Type assertions dan type switches
  - Embedding dan komposisi interface
- **Interface Standar Populer**
  - `io.Reader` dan `io.Writer` — tulang punggung I/O Go
  - Interface `fmt.Stringer` dan `error`
  - `sort.Interface` untuk pengurutan kustom
- **Generics (Go 1.18+)**
  - Parameter tipe dan constraints
  - Menulis fungsi dan tipe generik
  - Package `constraints` dan custom constraints
  - Kapan menggunakan generics vs interface

### Minggu 6: Konkurensi — Goroutine dan Channel

- **Goroutine**
  - Siklus hidup goroutine: thread ringan yang dikelola oleh runtime Go
  - Memulai goroutine dengan kata kunci `go`
  - Sinkronisasi dengan `sync.WaitGroup`
- **Channel**
  - Tipe channel: unbuffered vs buffered
  - Semantik kirim, terima, dan tutup
  - Range over channels dan directional channels
- **Pernyataan Select**
  - Multipleks operasi channel dengan `select`
  - Timeout dengan `time.After` dan `context.Done()`
  - Operasi channel non-blocking dengan `default`
- **Pola Konkurensi**
  - Pola fan-out, fan-in
  - Pola pipeline dengan channel
  - Implementasi worker pool

### Minggu 7: Konkurensi Lanjutan dan Sinkronisasi

- **Mutex dan Operasi Atomik**
  - `sync.Mutex` dan `sync.RWMutex` untuk perlindungan state bersama
  - `sync.Map` untuk akses map konkuren
  - `sync/atomic` untuk counter dan flag bebas kunci
- **Package Context**
  - `context.Context` untuk pembatalan, batas waktu, dan nilai lingkup permintaan
  - Membuat child context: `WithCancel`, `WithTimeout`, `WithDeadline`
  - Meneruskan context melalui HTTP handlers dan goroutine
- **Pola Errgroup**
  - `golang.org/x/sync/errgroup` untuk propagasi error goroutine
  - Propagasi pembatalan dengan errgroup
- **Deteksi Race Condition**
  - Menggunakan flag `-race` untuk deteksi data race
  - Model memori Go dan jaminan happens-before

### Minggu 8: Pendalaman Pustaka Standar

- **I/O File dan Interaksi Sistem**
  - Package `os`: operasi file, variabel lingkungan, kontrol proses
  - `io` dan `io/ioutil`: reader, writer, copy, pipe
  - `bufio`: pembacaan dan penulisan buffer
  - `encoding/csv`, `encoding/json`, `encoding/xml` untuk serialisasi data
- **Tanggal, Waktu, dan Format**
  - Package `time`: durasi, timer, ticker, format
  - Package `fmt` pendalaman: verb format, `Sprintf`, `Fprintf`
  - `strings` dan `strconv` untuk manipulasi string dan konversi
- **Dasar-Dasar Jaringan**
  - Package `net`: alamat IP, koneksi TCP/UDP
  - Client `net/http`: membuat permintaan, menangani respons
  - `net/url` untuk parsing URL dan pembuatan query

### Minggu 9: Pengembangan Web dengan net/http

- **Membangun Server Web**
  - Interface `http.Handler` dan `http.HandlerFunc`
  - `http.ServeMux` dan pendaftaran rute
  - Pola middleware: logging, recovery, autentikasi
- **Pengembangan RESTful API**
  - Menangani parameter path dan query string
  - Encoding dan decoding JSON request/response
  - Kode status, header, dan negosiasi konten
- **Pola HTTP Lanjutan**
  - Graceful shutdown dengan `ShutdownContext`
  - Propagasi request context
  - Rate limiting dan middleware throttling
  - File server dan penyajian file statis
- **Framework Web Pihak Ketiga** (pengenalan opsional)
  - Chi, Gin, atau Echo untuk routing lanjutan
  - Kapan menggunakan pustaka standar vs framework

### Minggu 10: Integrasi Database dan SQL

- **Akses Database dengan database/sql**
  - Interface `database/sql` dan registrasi driver
  - Konfigurasi connection pooling (`SetMaxOpenConns`, `SetMaxIdleConns`)
  - Operasi CRUD: `Query`, `QueryRow`, `Exec`
  - Prepared statements dan manajemen transaksi
- **Bekerja dengan PostgreSQL**
  - Terhubung dengan `lib/pq` atau `pgx`
  - Memindai baris ke dalam struct
  - Migrasi dengan `golang-migrate` atau `pressly/goose`
- **Bekerja dengan Redis**
  - Terhubung dengan `go-redis` atau `redigo`
  - Pola caching dan penyimpanan session
  - Pub/sub dengan channel Redis
- **ORM vs SQL Mentah**
  - Pengenalan GORM untuk akses gaya ORM
  - Kapan menggunakan SQL mentah vs ORM

### Minggu 11: Alat CLI, Build, dan Deployment

- **Membangun Alat CLI**
  - Package `flag` untuk parsing argumen baris perintah
  - `cobra` dan `viper` untuk aplikasi CLI lanjutan
  - Membaca dari stdin, menulis ke stdout/stderr
- **Build dan Cross-Compilation**
  - `go build` dengan build tags dan kompilasi bersyarat
  - Cross-compilation dengan `GOOS` dan `GOARCH`
  - Caching build dan `go install`
  - Memperkecil ukuran biner dengan `-ldflags="-s -w"`
- **Manajemen Modul**
  - `go mod init`, `go mod tidy`, `go mod vendor`
  - Versioning modul dan semantic import versioning
  - Modul privat dengan `GOPRIVATE` dan `GONOSUMCHECK`
- **Dockerisasi Aplikasi Go**
  - Multi-stage Docker builds untuk citra minimal
  - Citra dasar distroless dan scratch
  - Health checks dan graceful shutdown dalam kontainer

### Minggu 12: Proyek Akhir

- **Spesifikasi Proyek**
  - Aplikasi Go full-stack menggunakan semua konsep yang dipelajari
  - Jenis proyek yang disarankan: layanan REST API, alat produktivitas CLI, aplikasi web dengan auth dan database
- **Perencanaan Arsitektur**
  - Arsitektur berlapis: handlers, services, repositories
  - Dependency injection dengan interface
  - Manajemen konfigurasi dengan environment variables
- **Tahap Implementasi**
  - Minggu 1-4 proyek: scaffolding proyek, model, skema database
  - Minggu 5-8 proyek: handler API, logika bisnis, middleware
  - Minggu 9-12 proyek: testing, dokumentasi, kontainerisasi, deployment
- **Review Akhir dan Presentasi**
  - Daftar periksa code review (penanganan error, keamanan konkurensi, cakupan test)
  - Profiling performa dengan `pprof` dan tracing
  - Deployment ke produksi (cloud VM atau container orchestration)

## Proyek Akhir

Peserta akan membangun **aplikasi Go kelas produksi** sesuai pilihan mereka. Proyek harus mendemonstrasikan:

- **Setidaknya tiga package** yang diorganisir dalam arsitektur berlapis (handlers, services, repositories)
- **Interface** untuk dependency injection dan testability
- **Konkurensi** menggunakan goroutine dan channel atau primitif `sync` (misalnya worker pool, pipeline, atau fan-out/fan-in)
- **Propagasi context** untuk pembatalan dan batas waktu di seluruh HTTP handlers, panggilan database, dan goroutine
- **Penanganan error** dengan sentinel errors, pembungkusan, dan pemetaan kode status HTTP yang tepat
- **Testing** dengan table-driven tests, setidaknya 70% cakupan, dan integration tests terhadap database nyata
- **RESTful API** dengan kode status yang tepat, negosiasi konten, dan validasi input
- **Integrasi database** dengan setidaknya satu database (PostgreSQL atau Redis) menggunakan `database/sql` atau driver
- **Graceful shutdown** menangani sinyal SIGINT/SIGTERM
- **Dockerisasi** dengan multi-stage build dan health checks
- **Dokumentasi lengkap** termasuk README, dokumentasi API, dan petunjuk penyiapan

Contoh ide proyek:

- **Task Management API**: RESTful API dengan autentikasi pengguna, CRUD untuk tugas/proyek, background worker untuk pengingat, penyimpanan PostgreSQL, caching Redis
- **Layanan URL Shortener**: Layanan HTTP throughput tinggi dengan logika redirect, pelacakan klik, rate limiting, PostgreSQL untuk persistensi, Redis untuk caching
- **Alat CLI DevOps**: Aplikasi baris perintah untuk manajemen server, otomatisasi deployment, atau analisis log dengan pemrosesan file konkuren, output berwarna, dan dukungan file konfigurasi
- **Server Chat Real-Time**: Aplikasi berbasis WebSocket dengan manajemen ruang, penyiaran pesan, pelacakan kehadiran pengguna, dan riwayat pesan persisten

## Kriteria Penilaian

- **Tugas Mingguan (30%)**
  - 10 tugas coding mingguan (Minggu 1-10)
  - Setiap tugas dibangun di atas konsep minggu sebelumnya
  - Dinilai berdasarkan kebenaran, kualitas kode, gaya Go idiomatis, dan kepatuhan pada konvensi `gofmt`
  - Pengumpulan terlambat dikenakan penalti 10% per hari

- **Kuis (20%)**
  - 4 kuis (akhir Minggu 3, 6, 9, 11)
  - Campuran pertanyaan pemahaman konseptual dan analisis kode
  - Pilihan ganda, jawaban singkat, dan pertanyaan code review
  - Nilai kelulusan minimal 70% diperlukan untuk melanjutkan ke proyek akhir

- **Proyek Akhir (40%)**
  - Kualitas kode, arsitektur, dan penggunaan Go idiomatis (15%)
  - Kelengkapan fitur terhadap spesifikasi (10%)
  - Cakupan dan kualitas testing (5%)
  - Kebenaran konkurensi dan keamanan race condition (5%)
  - Kesiapan deployment dan produksi (5%)

- **Partisipasi dan Code Review (10%)**
  - Peer code review pada dua proyek teman sekelas
  - Partisipasi aktif dalam diskusi desain
  - Kualitas dokumentasi (README, dokumentasi API, petunjuk penyiapan)

## Referensi

- [Dokumentasi Resmi Go](https://go.dev/doc/) — Referensi bahasa lengkap, tutorial, dan dokumentasi package
- [Effective Go](https://go.dev/doc/effective_go) — Panduan penulisan Go idiomatis
- [Go by Example](https://gobyexample.com/) — Pengenalan langsung dengan contoh program beranotasi
- [Blog Go](https://go.dev/blog/) — Blog resmi yang membahas fitur bahasa, praktik terbaik, dan studi kasus
- [Pustaka Standar Go](https://pkg.go.dev/std) — Dokumentasi komprehensif untuk semua package standar
- [Practical Go: Real World Advice](https://dave.cheney.net/practical-go) — Panduan Dave Cheney untuk menulis Go produksi
- [Concurrency in Go](https://www.oreilly.com/library/view/concurrency-in-go/9781491941297/) — Buku Katherine Cox-Buday tentang pola konkurensi Go
- [Let's Go](https://lets-go.alexedwards.net/) — Buku Alex Edwards tentang membangun aplikasi web dengan Go

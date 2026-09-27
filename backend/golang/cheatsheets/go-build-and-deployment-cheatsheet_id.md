---
title: "Cheat Sheet Build dan Deployment Go"
description: "Panduan referensi cepat untuk membangun, melakukan cross-compile, mengoptimalkan, dan men-deploy biner Go — build flags, injeksi versi dengan ldflags, direktif embed, build yang reproducible, biner statis, dan rilis berbasis container."
category: "backend"
technology: "golang"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Build dan Deployment Go

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Build semua paket | `go build ./...` | Mengompilasi seluruh paket dalam modul |
| Build dengan nama output | `go build -o bin/app .` | Menulis biner ke `bin/app` |
| Hapus info debug | `go build -ldflags="-s -w" .` | Menghapus tabel simbol dan DWARF untuk biner yang lebih kecil |
| Injeksi string versi | `go build -ldflags="-X main.version=v1.2.0" .` | Mengisi variabel string level paket saat proses link |
| Cross-compile statis | `GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build .` | Build untuk OS/arsitektur lain tanpa dependensi libc |
| Build reproducible | `go build -trimpath -buildvcs=false .` | Output stabil tanpa path lokal atau cap VCS |
| Inspeksi metadata biner | `go version -m bin/app` | Menampilkan informasi modul dan VCS yang tertanam saat build |
| Verifikasi linking statis | `ldd bin/app` | Output kosong berarti biner sepenuhnya statis |
| Tanam file ke biner | `//go:embed static/*` | Menggabungkan aset ke dalam biner saat kompilasi |
| Verifikasi checksum modul | `go mod verify` | Memastikan modul yang diunduh tidak diubah |

## Perintah Umum

### Build Flags Inti

```bash
# Mengompilasi paket saat ini
go build ./...

# Path output eksplisit untuk command tertentu
go build -o bin/server ./cmd/server

# Hapus info debug (-s -w) — biasanya biner 20-40% lebih kecil
go build -ldflags="-s -w" -o bin/server ./cmd/server

# Nonaktifkan optimisasi dan inlining (untuk build yang ramah debugger)
go build -gcflags="all=-N -l" -o bin/server ./cmd/server

# Paksa build ulang penuh, abaikan build cache
go build -a ./...

# Output verbose — mencetak setiap paket saat dikompilasi
go build -v ./...

# Build library bersama C (dipanggil dari C, Python, dll.)
go build -buildmode=c-shared -o libapp.so ./pkg/app

# Build arsip C untuk linking statis ke program C
go build -buildmode=c-archive -o libapp.a ./pkg/app
```

### Cross-Compilation

```bash
# Linux amd64 — target produksi default untuk kebanyakan server cloud
GOOS=linux GOARCH=amd64 go build -o bin/server-linux-amd64 ./cmd/server

# Linux ARM64 — instance Graviton, server ARM, Raspberry Pi 4
GOOS=linux GOARCH=arm64 go build -o bin/server-linux-arm64 ./cmd/server

# macOS — Apple Silicon dan Intel
GOOS=darwin GOARCH=arm64 go build -o bin/server-darwin-arm64 ./cmd/server
GOOS=darwin GOARCH=amd64 go build -o bin/server-darwin-amd64 ./cmd/server

# Windows desktop dan server
GOOS=windows GOARCH=amd64 go build -o bin/server.exe ./cmd/server

# Appliance FreeBSD
GOOS=freebsd GOARCH=amd64 go build -o bin/server-freebsd-amd64 ./cmd/server

# WebAssembly — modul .wasm yang berjalan di browser
GOOS=js GOARCH=wasm go build -o bin/main.wasm ./cmd/wasm
```

| GOOS | GOARCH | Penggunaan umum |
|------|--------|-----------------|
| linux | amd64, arm64 | Server cloud, container, instance ARM |
| linux | 386, arm, riscv64 | Perangkat edge, sistem tertanam |
| darwin | amd64, arm64 | macOS Intel dan Apple Silicon |
| windows | amd64, 386, arm64 | Desktop dan server Windows |
| freebsd | amd64, arm64 | Appliance jaringan |
| js | wasm | Modul WebAssembly untuk browser |

### Build Statis dan Sadar CGO

```bash
# Biner sepenuhnya statis — tanpa dependensi libc, ideal untuk container scratch
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/server ./cmd/server

# Verifikasi bahwa biner tidak punya dependensi dinamis
ldd bin/server
# output: "not a dynamic executable" (glibc) atau "statically linked" (musl)

# Inspeksi platform target dan status stripping
file bin/server
# output: ELF 64-bit LSB executable, ARM aarch64, statically linked, stripped

# Cross-compile dengan cgo membutuhkan cross-compiler yang cocok di CC
CGO_ENABLED=1 GOOS=linux GOARCH=arm64 CC=aarch64-linux-gnu-gcc \
  go build -o bin/server ./cmd/server

# Pasang cross-compiler saat dibutuhkan (Debian/Ubuntu):
#   aarch64-linux-gnu-gcc    -> apt install gcc-aarch64-linux-gnu
#   arm-linux-gnueabihf-gcc  -> apt install gcc-arm-linux-gnueabihf
```

### Injeksi Versi dengan ldflags

```bash
# Injeksi string versi ke main.version saat proses link
go build -ldflags="-X main.version=1.2.3" -o bin/server ./cmd/server

# Otomatiskan dengan git — tag untuk versi, SHA pendek untuk commit
go build -ldflags="-X main.version=$(git describe --tags --always) \
  -X main.commit=$(git rev-parse --short HEAD)" -o bin/server ./cmd/server

# Hapus info debug sekaligus injeksi versi dalam satu set flag
go build -ldflags="-s -w -X main.version=$(git describe --tags --always)" \
  -o bin/server ./cmd/server

# Baca kembali metadata yang tertanam dari biner
go version -m bin/server
```

### Build Reproducible

```bash
# -trimpath menghapus path filesystem lokal dari biner
go build -trimpath -o bin/server ./cmd/server

# Nonaktifkan cap VCS untuk rebuild yang identik byte-per-byte
go build -trimpath -buildvcs=false -o bin/server ./cmd/server

# Jadikan -trimpath sebagai default untuk semua build di modul ini
go env -w GOFLAGS="-trimpath"

# Dua kali rebuild harus menghasilkan hash yang identik
sha256sum bin/server
```

### Kebersihan Cache Modul

```bash
# Verifikasi checksum semua modul yang diunduh
go mod verify

# Daftarkan dependensi langsung dan tidak langsung
go list -m all

# Periksa pembaruan dependensi yang tersedia
go list -u -m all

# Unduh semua modul tanpa build (pemanasan cache untuk CI)
go mod download

# Bersihkan seluruh cache modul setelah penggunaan berat
go clean -modcache

# Bersihkan build cache (misal setelah menyelidiki korupsi cache)
go clean -cache
```

## Potongan Kode

### Pipeline Stamping Versi

```go
package main

import (
    "fmt"
    "runtime/debug"
)

// Nilai diinjeksi saat link time dengan -ldflags "-X main.version=..."
// Default "dev"/"none" membuat build lokal mudah dikenali.
var (
    version = "dev"
    commit  = "none"
)

func main() {
    fmt.Printf("app %s (%s)\n", version, commit)

    // Metadata build lengkap tersedia saat runtime (Go 1.18+)
    if info, ok := debug.ReadBuildInfo(); ok {
        fmt.Println("Go version:", info.GoVersion)
        fmt.Println("Module path:", info.Main.Path)
        fmt.Println("Module version:", info.Main.Version)
        for _, s := range info.Settings {
            if s.Key == "vcs.revision" {
                fmt.Println("VCS revision:", s.Value)
            }
        }
    }
}
```

### Menanamkan Aset Statis

```go
package server

import (
    "embed"
    "io/fs"
    "net/http"
)

//go:embed templates/*.html
var templatesFS embed.FS

//go:embed static
var staticFS embed.FS

func main() {
    // Sajikan aset statis tertanam langsung melalui HTTP
    static, err := fs.Sub(staticFS, "static")
    if err != nil {
        panic(err)
    }
    http.Handle("/static/", http.FileServer(http.FS(static)))

    // Baca template tertanam tanpa menyentuh disk
    tmpl, err := fs.ReadFile(templatesFS, "templates/index.html")
    if err != nil {
        panic(err)
    }
    _ = tmpl
}
```

### Build Container Multi-Tahap

```dockerfile
# Tahap 1: kompilasi biner statis
FROM golang:1.23-alpine AS builder
WORKDIR /src
# Salin file modul dulu — layer ini tetap ter-cache selama go.mod tidak berubah
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath \
    -ldflags="-s -w" -o /out/server ./cmd/server

# Tahap 2: image runtime minimal — tanpa shell, tanpa libc
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /out/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

### Memperkecil Biner Lebih Lanjut

```bash
# UPX mengompresi biner (kompromi: startup sedikit lebih lambat,
# dan sebagian antivirus menandai executable ber-UPX)
upx --best bin/server

# Periksa ukuran hasil
ls -lh bin/server

# Tanam nomor versi modul ke dalam biner untuk ketertelusuran
go build -ldflags="-s -w -X main.version=v1.2.0 -X main.commit=$(git rev-parse --short HEAD)" .
```

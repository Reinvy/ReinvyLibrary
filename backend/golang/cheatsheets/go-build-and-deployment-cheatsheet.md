---
title: "Go Build and Deployment Cheatsheet"
description: "A quick reference for building, cross-compiling, optimizing, and deploying Go binaries — build flags, ldflags version injection, embed directives, reproducible builds, static binaries, and containerized releases."
category: "backend"
technology: "golang"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Go Build and Deployment Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Build all packages | `go build ./...` | Compiles every package in the module |
| Build with output name | `go build -o bin/app .` | Writes the binary to `bin/app` |
| Strip debug info | `go build -ldflags="-s -w" .` | Removes symbol table and DWARF for a smaller binary |
| Inject version string | `go build -ldflags="-X main.version=v1.2.0" .` | Sets a package-level string variable at link time |
| Cross-compile static | `GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build .` | Builds for another OS/arch with no libc dependency |
| Reproducible build | `go build -trimpath -buildvcs=false .` | Stable output with no local paths or VCS stamps |
| Inspect binary metadata | `go version -m bin/app` | Prints module and VCS information embedded at build time |
| Verify static linking | `ldd bin/app` | Empty output means the binary is fully static |
| Embed files into binary | `//go:embed static/*` | Bundles assets into the binary at compile time |
| Verify module checksums | `go mod verify` | Confirms downloaded modules were not tampered with |

## Common Commands

### Core Build Flags

```bash
# Compile the current package
go build ./...

# Explicit output path for a specific command
go build -o bin/server ./cmd/server

# Strip debug information (-s -w) — typically 20-40% smaller binary
go build -ldflags="-s -w" -o bin/server ./cmd/server

# Disable optimizations and inlining (for debugger-friendly builds)
go build -gcflags="all=-N -l" -o bin/server ./cmd/server

# Force a full rebuild, ignoring the build cache
go build -a ./...

# Verbose output — prints every package as it is compiled
go build -v ./...

# Build a C-shared library (called from C, Python, etc.)
go build -buildmode=c-shared -o libapp.so ./pkg/app

# Build a C archive for static linking into C programs
go build -buildmode=c-archive -o libapp.a ./pkg/app
```

### Cross-Compilation

```bash
# Linux amd64 — the default production target for most cloud servers
GOOS=linux GOARCH=amd64 go build -o bin/server-linux-amd64 ./cmd/server

# Linux ARM64 — Graviton instances, ARM servers, Raspberry Pi 4
GOOS=linux GOARCH=arm64 go build -o bin/server-linux-arm64 ./cmd/server

# macOS — Apple Silicon and Intel
GOOS=darwin GOARCH=arm64 go build -o bin/server-darwin-arm64 ./cmd/server
GOOS=darwin GOARCH=amd64 go build -o bin/server-darwin-amd64 ./cmd/server

# Windows desktop and server
GOOS=windows GOARCH=amd64 go build -o bin/server.exe ./cmd/server

# FreeBSD appliances
GOOS=freebsd GOARCH=amd64 go build -o bin/server-freebsd-amd64 ./cmd/server

# WebAssembly — a .wasm module that runs in the browser
GOOS=js GOARCH=wasm go build -o bin/main.wasm ./cmd/wasm
```

| GOOS | GOARCH | Typical use |
|------|--------|-------------|
| linux | amd64, arm64 | Cloud servers, containers, ARM instances |
| linux | 386, arm, riscv64 | Edge devices, embedded systems |
| darwin | amd64, arm64 | macOS Intel and Apple Silicon |
| windows | amd64, 386, arm64 | Windows desktop and servers |
| freebsd | amd64, arm64 | Network appliances |
| js | wasm | Browser WebAssembly module |

### Static and CGO-Aware Builds

```bash
# Fully static binary — no libc dependency, ideal for scratch containers
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/server ./cmd/server

# Verify the binary has no dynamic dependencies
ldd bin/server
# output: "not a dynamic executable" (glibc) or "statically linked" (musl)

# Inspect the target platform and stripping state
file bin/server
# output: ELF 64-bit LSB executable, ARM aarch64, statically linked, stripped

# cgo cross-compilation needs a matching cross-compiler in CC
CGO_ENABLED=1 GOOS=linux GOARCH=arm64 CC=aarch64-linux-gnu-gcc \
  go build -o bin/server ./cmd/server

# Install the cross-compilers when needed (Debian/Ubuntu):
#   aarch64-linux-gnu-gcc    -> apt install gcc-aarch64-linux-gnu
#   arm-linux-gnueabihf-gcc  -> apt install gcc-arm-linux-gnueabihf
```

### Version Injection with ldflags

```bash
# Inject a version string into main.version at link time
go build -ldflags="-X main.version=1.2.3" -o bin/server ./cmd/server

# Automate with git — tag for the version, short SHA for the commit
go build -ldflags="-X main.version=$(git describe --tags --always) \
  -X main.commit=$(git rev-parse --short HEAD)" -o bin/server ./cmd/server

# Strip debug info and inject version in a single flag set
go build -ldflags="-s -w -X main.version=$(git describe --tags --always)" \
  -o bin/server ./cmd/server

# Read the embedded metadata back from the binary
go version -m bin/server
```

### Reproducible Builds

```bash
# -trimpath removes local filesystem paths from the binary
go build -trimpath -o bin/server ./cmd/server

# Disable VCS stamping for byte-identical rebuilds
go build -trimpath -buildvcs=false -o bin/server ./cmd/server

# Make -trimpath the default for every build in this module
go env -w GOFLAGS="-trimpath"

# Two rebuilds should produce identical hashes
sha256sum bin/server
```

### Module Cache and Hygiene

```bash
# Verify checksums of all downloaded modules
go mod verify

# List direct and indirect dependencies
go list -m all

# Check for available dependency updates
go list -u -m all

# Pre-download all modules without building (CI cache warmup)
go mod download

# Clear the module cache entirely after heavy use
go clean -modcache

# Purge the build cache (e.g., after investigating cache corruption)
go clean -cache
```

## Code Snippets

### Version Stamping Pipeline

```go
package main

import (
    "fmt"
    "runtime/debug"
)

// Values injected at link time with -ldflags "-X main.version=..."
// The "dev"/"none" defaults keep local builds clearly identifiable.
var (
    version = "dev"
    commit  = "none"
)

func main() {
    fmt.Printf("app %s (%s)\n", version, commit)

    // Full build metadata is available at runtime (Go 1.18+)
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

### Embedding Static Assets

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
    // Serve embedded static assets directly over HTTP
    static, err := fs.Sub(staticFS, "static")
    if err != nil {
        panic(err)
    }
    http.Handle("/static/", http.FileServer(http.FS(static)))

    // Read an embedded template without touching the disk
    tmpl, err := fs.ReadFile(templatesFS, "templates/index.html")
    if err != nil {
        panic(err)
    }
    _ = tmpl
}
```

### Multi-Stage Container Build

```dockerfile
# Stage 1: compile a static binary
FROM golang:1.23-alpine AS builder
WORKDIR /src
# Copy module files first — this layer stays cached unless go.mod changes
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath \
    -ldflags="-s -w" -o /out/server ./cmd/server

# Stage 2: minimal runtime image — no shell, no libc
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /out/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

### Shrinking Binaries Further

```bash
# UPX compresses the binary (trade-off: slightly slower startup,
# and some antivirus engines flag UPX-packed executables)
upx --best bin/server

# Check resulting sizes
ls -lh bin/server

# Embed the module's version numbers into the binary for traceability
go build -ldflags="-s -w -X main.version=v1.2.0 -X main.commit=$(git rev-parse --short HEAD)" .
```

---
title: "Silabus Rekayasa Analisis Statis dan Verifikasi Go"
description: "Kurikulum lanjutan 12 minggu untuk engineer Go senior tentang membuktikan kode benar sebelum dirilis: internal parser dan type checker, analyzer kustom dengan go/analysis, analisis dataflow SSA, tata kelola linter, fuzzing berbasis cakupan, deteksi race, pengujian berbasis properti dan mutasi, model checking konkurensi, serta penegakan di CI."
category: "backend"
technology: "golang"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Analisis Statis dan Verifikasi Go

## Ringkasan

Sebagian besar tim engineering memperlakukan kebenaran kode sebagai sesuatu yang ditangkap proses review secara kebetulan. Go menawarkan transaksi yang berbeda: toolchain-nya menyertakan parser, type checker, whole-program loader, pembangun SSA, race detector, dan fuzzer berbasis cakupan sebagai library yang bisa diimpor. Artinya sebuah tim dapat mengodekan definisi "benar" versinya sendiri sebagai pemeriksaan yang dapat dieksekusi dan menjalankannya pada setiap pull request, bukan menuliskannya di style guide yang tidak dibaca siapa pun.

Silabus lanjutan 12 minggu ini ditujukan bagi engineer Go yang sudah mengirim layanan produksi dan kini ingin memiliki mesin yang memutuskan apakah kode boleh di-merge. Minggu 1 sampai 3 membangun fondasi: apa yang sebenarnya dijamin oleh bahasa, bagaimana `go/parser` mengubah source menjadi syntax tree, dan bagaimana `go/types` me-resolve identifier serta mengevaluasi sistem tipe. Minggu 4 sampai 7 membangun lapisan analisis: analyzer dengan `golang.org/x/tools/go/analysis`, whole-program loading dengan `go/packages`, static single assignment dan analisis dataflow, lalu masalah operasional mengelola armada linter tanpa menenggelamkan developer dalam kebisingan. Minggu 8 sampai 11 mencakup verifikasi dinamis: fuzzing, race detector, pengujian berbasis properti dan mutasi, simulasi deterministik, dan akhirnya model checking untuk invarian konkurensi. Minggu 12 adalah capstone di mana peserta mengirim analyzer nyata dan gerbang verifikasi ke repository yang berjalan.

Kurikulum diurutkan berdasarkan dependensi, bukan tren. Anda tidak bisa menulis analisis dataflow yang bermakna (Minggu 6) tanpa memahami keluaran type checker (Minggu 3), dan Anda tidak bisa memutuskan pemeriksaan mana yang layak masuk CI (Minggu 11) tanpa mengukur rasio false positive-nya (Minggu 7). Setiap modul diakhiri lab yang menghasilkan program berjalan atau hasil terukur, dan lab-lab tersebut terakumulasi menjadi capstone, bukan sekadar latihan yang dibuang.

Pada akhir kursus, peserta mampu membaca dan memanipulasi source Go secara programatik, menulis dan mendistribusikan analyzer kustom dengan perbaikan yang menerapkan dirinya sendiri, bernalar tentang dataflow untuk menangkap bug yang tidak bisa ditangkap grep, mengkalibrasi armada linter agar developer mempercayai sinyalnya, serta menggabungkan fuzzing, deteksi race, dan model checking menjadi strategi verifikasi yang jujur tentang apa yang dibuktikan dan apa yang tidak.

## Kurikulum

### Modul 1: Kebenaran sebagai Disiplin Rekayasa (Minggu 1)

- **Apa yang sebenarnya dijamin oleh kompilator Go**
  - Type safety, memory safety pada kode aman, dan tidak adanya variabel tak terinisialisasi — serta batas di mana `unsafe`, `reflect`, dan `cgo` melarutkannya
  - Dereference pointer nil, penulisan ke map nil, dan indeks di luar rentang sebagai panic runtime, bukan error kompilasi
  - Mengapa "sudah terkompilasi" hanyalah pernyataan tentang sintaks dan tipe, tidak pernah tentang perilaku
- **Taksonomi cacat perangkat lunak**
  - Cacat spesifikasi (kode melakukan apa yang diminta, dan yang diminta itu salah)
  - Cacat dataflow (error dibuang, lock tidak dilepas, context tidak diperiksa)
  - Cacat konkurensi (data race, deadlock, kebocoran goroutine, wakeup yang hilang)
  - Cacat sumber daya (file descriptor bocor, antrean tak terbatas, `defer` pembersihan yang hilang)
- **Tangga verifikasi**
  - Tipe → analisis statis → unit test → property test → fuzzing → assertion runtime → model checking → pembuktian formal
  - Biaya deteksi dibanding biaya lolos ke produksi, dan mengapa menggeser pemeriksaan ke kiri adalah argumen ekonomi, bukan argumen moral
  - Soundness versus completeness dalam praktik: setiap pemeriksaan yang berguna harus menerima sejumlah false negative agar tetap dapat dipakai
- **Ekonomi kebisingan**
  - Rasio sinyal terhadap kebisingan sebagai metrik utama sebuah sistem verifikasi
  - Mengapa linter dengan rasio false positive 2 persen akan dimatikan dalam satu kuartal
  - Baseline ratcheting: menegakkan "tidak ada pelanggaran baru" agar utang lama tidak pernah memblokir kemajuan
- **Lab Praktik**: Klasifikasikan sepuluh cacat nyata dari issue tracker proyek Go publik ke dalam taksonomi di atas, dan untuk masing-masing tentukan pemeriksaan termurah yang akan menangkapnya sebelum merge

### Modul 2: Parsing dan AST Go (Minggu 2)

- **Lapisan token**
  - `go/token`: `FileSet`, `File`, `Pos`, dan `Position` — mengapa posisi berupa offset dan bagaimana mengubahnya menjadi baris serta kolom
  - `go/scanner` dan bagaimana penyisipan titik koma otomatis Go muncul di aliran token
- **Membangun pohon sintaks**
  - `go/parser.ParseFile` dengan mode `ParseComments` dan perbedaan antar mode parser
  - Menggunakan `parser.ParseDir` dan deklarasi `go/ast.File` untuk mendata fungsi, tipe, dan import
  - Parsing toleran error: mengapa mengembalikan AST parsial bersama error sering kali adalah perilaku yang benar untuk sebuah linter
- **Traversal dan pencocokan pola**
  - `ast.Inspect` versus `ast.Walk`, serta cara menghentikan penelusuran lebih awal
  - Type assertion node dengan `astutil.Apply` dan helper filter dari `astutil`
  - Perbedaan antara `*ast.Ident` yang dipakai sebagai deklarasi dan identifier yang sama yang dipakai sebagai referensi
- **Menulis ulang source dengan aman**
  - `go/printer` dengan `printer.Config{Tabwidth: 8, Mode: printer.UseSpaces | printer.TabIndent}`
  - Mengapa mencetak AST menghilangkan komentar yang melekat di luar rentang posisi node
  - `golang.org/x/tools/go/ast/astutil` untuk penambahan dan penghapusan import
- **Lab Praktik**: Tulis alat yang menelusuri sebuah package dan melaporkan setiap fungsi yang `context.Context`-nya berada di parameter pertama tetapi tidak pernah dipakai di badan fungsi, dengan mencetak file, baris, dan kolom

```go
package main

import (
    "fmt"
    "go/ast"
    "go/parser"
    "go/token"
    "os"
)

func main() {
    fset := token.NewFileSet()
    file, err := parser.ParseFile(fset, os.Args[1], nil, parser.ParseComments)
    if err != nil {
        fmt.Fprintf(os.Stderr, "gagal mem-parse: %v\n", err)
        os.Exit(1)
    }

    ast.Inspect(file, func(n ast.Node) bool {
        fn, ok := n.(*ast.FuncDecl)
        if !ok || fn.Body == nil {
            return true
        }
        if !hasContextParam(fn) {
            return true
        }
        pos := fset.Position(fn.Pos())
        fmt.Printf("%s:%d:%d %s menerima context tetapi tidak memakainya\n",
            pos.Filename, pos.Line, pos.Column, fn.Name.Name)
        return true
    })
}

func hasContextParam(fn *ast.FuncDecl) bool {
    if fn.Type.Params == nil || len(fn.Type.Params.List) == 0 {
        return false
    }
    first := fn.Type.Params.List[0]
    sel, ok := first.Type.(*ast.SelectorExpr)
    if !ok {
        return false
    }
    pkg, ok := sel.X.(*ast.Ident)
    return ok && pkg.Name == "context" && sel.Sel.Name == "Context"
}
```

### Modul 3: Type Checking dengan go/types (Minggu 3)

- **Mengapa type checker adalah sumber kebenaran sebenarnya**
  - Analisis sintaksis melihat nama; analisis tipe melihat objek, dan objek adalah hal yang sebenarnya ingin Anda nalar
  - Bagaimana `go/types` mengimplementasikan ulang spesifikasi bahasa, dan mengapa kompilator serta checker harus sepakat
- **Menjalankan checker**
  - `types.Config` dengan `Importer`, callback `Error`, dan `Sizes` agar ukuran tipe sesuai platform target
  - Peta `types.Info`: `Types`, `Defs`, `Uses`, `Selections`, `Scopes`, `Implicits`, dan pertanyaan yang dijawab masing-masing
  - Me-resolve identifier ke deklarasinya dengan `Info.Defs` versus `Info.Uses`
- **Sistem tipe dalam kode**
  - Tipe bernama versus tipe underlying, serta `types.Unalias` di era pasca-generics
  - Interface dan `types.Implements`, termasuk method set pada receiver pointer versus value
  - Type parameter: `*types.TypeParam`, `*types.TypeList`, dan signature yang sudah diinstansiasi
- **Jebakan praktis**
  - Memeriksa satu package saja menghasilkan import yang tidak ter-resolve — Anda memerlukan importer di atas data export
  - Error tipe merambat: satu deklarasi salah dapat meracuni ratusan penggunaan, jadi putuskan lebih awal apakah berhenti atau lanjut
  - Identitas `types.Object` bersifat per satu kali jalan checker; jangan pernah menyimpannya antar proses
- **Lab Praktik**: Tulis pass checker yang melaporkan setiap fungsi ter-export yang mengembalikan tipe error konkret alih-alih `error`, lalu ujilah pada package yang memakai `*url.Error`

```go
package main

import (
    "fmt"
    "go/ast"
    "go/importer"
    "go/parser"
    "go/token"
    "go/types"
    "os"
)

func main() {
    dir := os.Args[1]
    fset := token.NewFileSet()
    pkgs, err := parser.ParseDir(fset, dir, nil, 0)
    if err != nil {
        fmt.Fprintf(os.Stderr, "gagal mem-parse: %v\n", err)
        os.Exit(1)
    }

    info := &types.Info{
        Types: map[ast.Expr]types.TypeAndValue{},
        Defs:  map[*ast.Ident]types.Object{},
        Uses:  map[*ast.Ident]types.Object{},
    }

    for _, pkg := range pkgs {
        conf := types.Config{Importer: importer.Default()}
        if _, err := conf.Check(pkg.Name, fset, fileSlice(pkg), info); err != nil {
            fmt.Fprintf(os.Stderr, "gagal type check: %v\n", err)
        }
    }

    for ident, obj := range info.Defs {
        fn, ok := obj.(*types.Func)
        if !ok || !fn.Exported() {
            continue
        }
        sig, ok := fn.Type().(*types.Signature)
        if !ok || sig.Results().Len() == 0 {
            continue
        }
        last := sig.Results().At(sig.Results().Len() - 1)
        if !types.IsInterface(last.Type()) && ident.Name != "main" {
            pos := fset.Position(ident.Pos())
            fmt.Printf("%s: %s mengembalikan tipe konkret %s\n", pos, fn.Name(), last.Type().String())
        }
    }
}

func fileSlice(pkg *ast.Package) []*ast.File {
    files := make([]*ast.File, 0, len(pkg.Files))
    for _, f := range pkg.Files {
        files = append(files, f)
    }
    return files
}
```

### Modul 4: Menulis Analyzer dengan golang.org/x/tools/go/analysis (Minggu 4)

- **Kontrak analyzer**
  - Struct `analysis.Analyzer`: `Name`, `Doc`, `Flags`, `Requires`, dan `Run`
  - Mengapa `Run(pass *analysis.Pass) (interface{}, error)` mengembalikan hasil buram yang dikonsumsi analyzer lain
  - `Requires` untuk urutan dependensi: memakai ulang hasil type checker alih-alih membangunnya sendiri
- **Melaporkan temuan yang benar-benar ditindaklanjuti developer**
  - `pass.Reportf` versus `analysis.Diagnostic` dengan `Pos` dan `End` eksplisit
  - `Diagnostic.Related` untuk temuan multi-lokasi seperti lock yang diambil di sini dan tidak pernah dilepas di sana
  - `SuggestedFixes` dan `TextEdit`: menjadikan perbaikan sebagai satu ketukan, bukan pekerjaan manual, yang merupakan pendorong adopsi terbesar
- **Fakta antar-package**
  - `pass.ExportObjectFact` dan `pass.ImportObjectFact` untuk hasil yang harus bertahan melewati satu package
  - Mengapa fakta memerlukan encoding yang dapat diserialisasi dan mengapa data yang bergantung waktu tidak boleh dimasukkan ke dalamnya
- **Menguji analyzer**
  - `analysistest.Run` dengan konvensi anotasi `// want "regexp"`
  - Pengujian golden file untuk suggested fix dengan `analysistest.RunWithSuggestedFixes`
  - Menyambungkan analyzer ke `go vet` melalui protokol `unitchecker` agar bisa dipakai lokal tanpa friksi
- **Lab Praktik**: Kirim analyzer `deferinloop` yang menandai `defer` di dalam badan loop, lengkap dengan suggested fix yang mengekstrak badan loop ke fungsi pembantu

```go
package deferinloop

import (
    "go/ast"
    "golang.org/x/tools/go/analysis"
)

var Analyzer = &analysis.Analyzer{
    Name: "deferinloop",
    Doc:  "melaporkan pernyataan defer di dalam badan loop yang menumpuk sampai fungsi selesai",
    Run:  run,
}

func run(pass *analysis.Pass) (interface{}, error) {
    for _, file := range pass.Files {
        ast.Inspect(file, func(n ast.Node) bool {
            loop, ok := n.(*ast.ForStmt)
            if !ok || loop.Body == nil {
                return true
            }
            ast.Inspect(loop.Body, func(inner ast.Node) bool {
                def, ok := inner.(*ast.DeferStmt)
                if !ok {
                    return true
                }
                pass.Report(analysis.Diagnostic{
                    Pos:     def.Pos(),
                    End:     def.End(),
                    Message: "defer di dalam badan loop menahan sumber daya sampai fungsi pembungkus selesai",
                })
                return true
            })
            return true
        })
    }
    return nil, nil
}
```

### Modul 5: Whole-Program Loading dan Analisis dalam Skala Besar (Minggu 5)

- **go/packages sebagai loader**
  - `packages.Load` dengan `Config{Mode: ...}`: `NeedSyntax`, `NeedTypes`, `NeedTypesInfo`, `NeedDeps`, dan `NeedModule`
  - Kurva biaya: `NeedDeps` dengan syntax pada seribu package berarti gigabyte, jadi muat hanya yang diperlukan per analyzer
  - Loading sadar-modul versus mode GOPATH, dan apa yang dilakukan `GOFLAGS` terhadap jalannya analisis di CI
- **Driver multi-package**
  - `singlechecker` untuk satu analyzer, `multichecker` untuk satu suite, `unitchecker` untuk `go vet -vettool`
  - Membangun binary driver analisis dan menjalankannya sebagai pengganti `go vet` di seluruh monorepo
- **Analisis inkremental**
  - Mengapa analisis ulang penuh setiap kali menyimpan tidak dapat diterima dan apa saja yang harus masuk kunci cache (hash source, versi Go, flag, versi analyzer)
  - Cache berbasis alamat konten dengan fakta yang diserialisasi ke disk
- **Mode kegagalan dalam skala besar**
  - Kode yang bergantung build tag: menganalisis file `linux` di runner `darwin` menghasilkan temuan palsu
  - Package yang gagal type-check meracuni dependennya, dan keputusan kebijakan untuk melewati atau berhenti
  - File hasil generate: mendeteksi `// Code generated ... DO NOT EDIT.` dan memutuskan apakah tetap dianalisis
- **Lab Praktik**: Bangun driver yang memuat sebuah repository dengan `NeedSyntax | NeedTypes | NeedTypesInfo | NeedDeps`, menjalankan tiga analyzer, menyimpan hasil di cache berdasarkan hash konten, dan melaporkan percepatan wall-clock pada eksekusi kedua

```go
package main

import (
    "fmt"
    "os"
    "time"

    "golang.org/x/tools/go/packages"
)

func main() {
    cfg := &packages.Config{
        Mode:  packages.NeedName | packages.NeedSyntax | packages.NeedTypes | packages.NeedTypesInfo | packages.NeedDeps,
        Tests: false,
    }

    start := time.Now()
    pkgs, err := packages.Load(cfg, os.Args[1:]...)
    if err != nil {
        fmt.Fprintf(os.Stderr, "gagal memuat: %v\n", err)
        os.Exit(1)
    }

    loaded, files := 0, 0
    packages.Visit(pkgs, nil, func(p *packages.Package) {
        loaded++
        files += len(p.Syntax)
    })

    fmt.Printf("memuat %d package dan %d file syntax dalam %s\n", loaded, files, time.Since(start).Round(time.Millisecond))
}
```

### Modul 6: SSA dan Analisis Dataflow (Minggu 6)

- **Static single assignment**
  - `ssa.NewProgram` dengan `ssa.BuilderMode(0)` dan `prog.Build()` atas package yang sudah dimuat
  - Basic block, `ssa.Value`, `ssa.Instruction`, dan phi node — mengapa SSA membuat reaching definition menjadi sepele
  - Konversi antara AST dan SSA: `ssautil.AllFunctions` dan tipe `Function`
- **Membangun call graph**
  - `callgraph.CHA`, `RTA`, dan `VTA`: presisi versus biaya, dan kapan over-approximation CHA dapat diterima
  - Mengapa RTA memerlukan root sintetis atas `main` dan `init` agar tetap sound
- **Dataflow dalam praktik**
  - Analisis maju dan mundur, lattice, serta syarat monotonisitas yang menjamin terminasi
  - Memodelkan bug sebagai properti jalur: acquire tanpa release, write tanpa flush, decode tanpa close
- **Taint analysis sebagai kasus utama**
  - Source (field `http.Request`), sink (string query `database/sql`), dan sanitizer
  - Menyusun daftar sanitizer lebih dulu, karena taint analysis tanpa sanitizer adalah pabrik false positive
  - Propagasi interprosedural dan jurang soundness yang Anda terima di batas library
- **Lab Praktik**: Implementasikan analisis dataflow mundur yang melaporkan setiap nilai `*sql.Rows` yang panggilan `Query` asalnya tidak diikuti `Close` pada semua jalur menuju keluar fungsi

```go
package main

import (
    "fmt"
    "os"

    "golang.org/x/tools/go/packages"
    "golang.org/x/tools/go/ssa"
    "golang.org/x/tools/go/ssa/ssautil"
)

func main() {
    cfg := &packages.Config{Mode: packages.NeedSyntax | packages.NeedTypes | packages.NeedTypesInfo | packages.NeedDeps}
    pkgs, err := packages.Load(cfg, os.Args[1:]...)
    if err != nil {
        fmt.Fprintf(os.Stderr, "gagal memuat: %v\n", err)
        os.Exit(1)
    }

    prog, ssaPkgs := ssautil.AllPackages(pkgs, ssa.InstantiateGenerics)
    prog.Build()

    for _, p := range ssaPkgs {
        if p == nil {
            continue
        }
        for _, fn := range p.Members {
            f, ok := fn.(*ssa.Function)
            if !ok || f.Blocks == nil {
                continue
            }
            fmt.Printf("%s: %d blok, %d parameter\n", f.String(), len(f.Blocks), len(f.Params))
        }
    }
}
```

### Modul 7: Tata Kelola Ekosistem Linter (Minggu 7)

- **Cara kerja golangci-lint sebenarnya**
  - Ia adalah runner, bukan checker: setiap linter yang diaktifkan adalah adapter atas analyzer atau implementasi native
  - Preset, `enable`/`disable`, jebakan `enable-all`, dan blok pengaturan per linter
  - Mengapa menjalankan 40 linter tidak 40 kali lebih baik daripada 5 linter, dan bagaimana pemeriksaan yang tumpang tindih menghasilkan saran yang saling bertentangan
- **Memilih himpunan yang dapat dipertahankan**
  - Mulai dari `errcheck`, `govet`, `staticcheck`, `ineffassign`, `unused`, `bodyclose`, `nilerr`, `errorlint`, dan `gosec` bila threat model membenarkannya
  - Menilai linter dari tingkat remediasinya, bukan dari jumlah temuannya
- **Kebijakan supresi**
  - `//nolint:namalinter // alasan` — alasan wajib, nama linter wajib, tidak pernah `//nolint` polos
  - Review supresi: laporan kuartalan jumlah supresi per file, dengan batas yang memaksa refactor
  - `exclude-rules` untuk kode hasil generate dan fixture test alih-alih menaburkan directive
- **Baseline ratcheting dan gerbang CI**
  - Mencatat jumlah pelanggaran saat ini per linter dan gagal hanya bila jumlahnya bertambah
  - Anggaran per direktori agar package baru dimulai dari nol
  - Membuat gerbang tetap cepat: pemanasan cache, analisis hanya package yang berubah, dan batas waktu yang tegas
- **Lab Praktik**: Ambil repository dengan 300 pelanggaran dan hasilkan konfigurasi plus baseline yang langsung lolos CI sekaligus menjamin jumlahnya hanya bisa turun

### Modul 8: Fuzzing, Deteksi Race, dan Verifikasi Kebocoran (Minggu 8)

- **Fuzzing native**
  - `func FuzzX(f *testing.F)` dengan seed `f.Add` dan target `f.Fuzz`, serta bagaimana `go test -fuzz` melakukan mutasi berbasis cakupan
  - Direktori korpus (`testdata/fuzz/FuzzX`), minimisasi crasher, dan mengubah input temuan menjadi seed regresi permanen
  - Menulis target fuzz yang mencapai kode dalam: memberi seed berupa encoding valid alih-alih string kosong
- **Apa yang tidak bisa ditemukan fuzzing**
  - Bug di balik autentikasi, timing, atau I/O eksternal tanpa seam untuk injeksi
  - Bug semantik: fuzzing membuktikan "tidak panic", bukan "mengembalikan nilai yang benar", sehingga differential fuzzing terhadap implementasi referensi menjadi penting
- **Race detector**
  - `go test -race` dan implementasi vector clock happens-before di baliknya
  - Mengapa jalan `-race` yang bersih bukan bukti bebas race: ia hanya melaporkan race yang benar-benar teramati
  - Biaya ThreadSanitizer yang sekitar sepuluh kali lipat dan cara menjalankannya pada subset di CI, bukan pada semuanya
- **Deteksi kebocoran**
  - `go.uber.org/goleak` dengan `VerifyTestMain` untuk menggagalkan package karena goroutine yang tersisa
  - Melacak file descriptor dan saturasi connection pool sebagai pemeriksaan pendamping
- **Lab Praktik**: Fuzz sebuah parser URL dan penulis CSV, masukkan setiap crasher kembali sebagai seed korpus, lalu jalankan package yang sama di bawah `-race` dan `goleak` dan tuliskan kelas cacat mana yang ditangkap tiap metode

```go
package parser

import "testing"

func FuzzParseQuery(f *testing.F) {
    f.Add("a=1&b=2")
    f.Add("")
    f.Add("k=%zz")

    f.Fuzz(func(t *testing.T, raw string) {
        got, err := ParseQuery(raw)
        if err != nil {
            return
        }
        for k, v := range got {
            if k == "" && v != "" {
                t.Fatalf("key kosong dengan nilai tidak kosong %q untuk input %q", v, raw)
            }
        }
    })
}
```

### Modul 9: Pengujian Berbasis Properti dan Pengujian Mutasi (Minggu 9)

- **Properti di atas contoh**
  - Tiga keluarga properti yang menemukan bug nyata: round-trip (encode lalu decode sama dengan input), invarian (urutan dipertahankan), dan relasi metamorphic (mengurutkan dua kali sama dengan mengurutkan sekali)
  - `testing/quick` untuk kasus sederhana dan `pgregory.net/rapid` untuk shrinking serta properti stateful
  - Menghasilkan input valid dari generator terbatas alih-alih berharap byte acak mencapai happy path
- **Pengujian properti stateful**
  - Memodelkan sistem sebagai command dengan precondition dan postcondition, lalu membiarkan framework mengeksplorasi urutannya
  - Memakai model in-memory sederhana sebagai oracle bagi implementasi konkuren atau persisten
- **Pengujian mutasi**
  - Sengaja merusak kode (`<` menjadi `<=`, `&&` menjadi `||`) dan memeriksa apakah suite menyadarinya
  - `go-mutesting` dan `ooze` untuk Go, serta mengapa mutation score mengalahkan line coverage sebagai metrik kualitas suite
  - Batas ekonominya: memutasi repository besar mahal, jadi targetkan package dengan risiko tertinggi
- **Deterministic simulation testing**
  - Mengganti waktu, keacakan, jaringan, dan disk dengan harness simulasi ber-seed yang menjalankan ribuan eksekusi per detik
  - Mereproduksi kegagalan dengan memutar ulang seed, dan menyusutkan jadwal yang gagal
- **Lab Praktik**: Tulis property test stateful untuk cache LRU in-memory, lalu jalankan pengujian mutasi pada package yang sama dan naikkan mutation score di atas 80 persen

### Modul 10: Verifikasi Konkurensi dan Model Checking (Minggu 10)

- **Memory model Go**
  - Happens-before sebagai satu-satunya alat tukar: pembuatan goroutine, kirim dan terima channel, lock dan unlock mutex, serta `sync/atomic`
  - Mengapa `sync.Once`, `errgroup`, dan `context` adalah konstruksi memory model, bukan sekadar pembungkus kenyamanan
- **Bernalar tentang invarian**
  - Menyatakan invarian sebelum menulis kode, lalu mengidentifikasi setiap transisi yang dapat melanggarnya
  - Pola rusak yang umum: check-then-act di luar lock, asumsi close-sekali yang dilanggar dua penutup, urutan close channel versus send
- **Model checking dengan TLA+ dan PlusCal**
  - Menulis spesifikasi kecil: variabel, `Init`, `Next`, dan invarian yang diperiksa atas semua state yang dapat dicapai
  - Menerjemahkan desain mutex-dan-channel Go menjadi spesifikasi, lalu membiarkan model checker menemukan interleaving yang merusaknya
  - Membaca jejak counterexample dan memetakannya kembali ke kode Go
- **Pemeriksaan linearizability dalam test**
  - Merekam riwayat konkuren dan memeriksanya terhadap spesifikasi sekuensial dengan `porcupine`
  - Mengapa ini menangkap bug penyusunan ulang yang tidak bisa ditangkap `-race`, karena penyusunan ulang bukan data race
- **Lab Praktik**: Spesifikasikan antrean kerja berbatas dengan protokol close dalam PlusCal, temukan interleaving lost-wakeup dengan model checker, perbaiki desainnya, lalu konfirmasi perbaikan dengan test linearizability `porcupine`

```text
---- MODULE BoundedQueue ----
EXTENDS Integers, Sequences, TLC

CONSTANTS Capacity

VARIABLES queue, closed, producers, consumers

Init ==
  /\ queue = <<>>
  /\ closed = FALSE
  /\ producers = {}
  /\ consumers = {}

Produce(p, v) ==
  /\ p \notin producers
  /\ Len(queue) < Capacity
  /\ queue' = Append(queue, v)
  /\ producers' = producers \union {p}
  /\ UNCHANGED <<closed, consumers>>

Consume(c) ==
  /\ c \notin consumers
  /\ Len(queue) > 0
  /\ queue' = Tail(queue)
  /\ consumers' = consumers \union {c}
  /\ UNCHANGED <<closed, producers>>

Next ==
  \/ \E p \in {1, 2}, v \in {1, 2} : Produce(p, v)
  \/ \E c \in {1, 2} : Consume(c)

NoOverCapacity == Len(queue) <= Capacity
====
```

### Modul 11: Mengoperasikan Verifikasi di CI dan Realita On-Call (Minggu 11)

- **Merancang gerbang**
  - Berlapis: pemeriksaan cepat pada setiap push, pemeriksaan mahal tiap malam, fuzzing berkelanjutan pada branch korpus khusus
  - Anggaran waktu per tahap dan apa yang harus dilakukan saat sebuah tahap melewatinya
  - Reproducibility: mematok versi tool agar upgrade linter tidak menggagalkan build yang tidak berubah
- **Pelaporan yang dibaca engineer**
  - Anotasi inline pada diff versus dinding keluaran konsol
  - Mengelompokkan temuan berdasarkan akar masalah agar satu refactor menyelesaikan dua puluh laporan
  - Membedakan pelanggaran baru dari utang lama pada setiap pesan
- **Mengukur programnya**
  - Defect escape rate, time-to-detect, rasio false positive per pemeriksaan, dan latensi remediasi
  - Menghentikan pemeriksaan yang tidak pernah menyala atau selalu disupresi developer — keduanya beban mati
- **Sisi manusianya**
  - Menulis kebijakan: apa yang wajib diperbaiki sekarang, apa yang boleh dibaseline, siapa yang menyetujui pengecualian
  - Onboarding: pull request pertama kontributor baru tidak boleh berupa dinding merah
- **Lab Praktik**: Ambil analyzer dari Modul 4, sambungkan ke workflow CI dengan caching dan anotasi inline, lalu dokumentasikan kebijakan yang mengatur kapan sebuah temuan memblokir merge

### Modul 12: Proyek Capstone (Minggu 12)

- Bangun **analyzer kustom plus gerbang verifikasi** untuk repository Go nyata, dan pertahankan setiap keputusan desain dengan data terukur
- Harus menunjukkan minimal lima dari: analyzer `go/analysis` dengan suggested fix, fakta antar-package, dataflow berbasis SSA atau callgraph, integrasi golangci-lint, target fuzz yang dipromosikan dari crasher nyata, konfigurasi `-race` dan `goleak`, property test stateful, laporan mutation score, spesifikasi PlusCal dengan invarian yang diperiksa, dan gerbang CI dengan baseline
- Serahkan anggaran kebisingan: setiap pemeriksaan yang dikirim harus melaporkan rasio false positive yang diukur pada minimal lima repository nyata
- Terbitkan dokumen desain singkat yang menjelaskan apa yang tidak ditangkap gerbang tersebut, karena batas jujur sebuah sistem verifikasi lebih penting daripada daftar fiturnya

## Proyek Akhir

Peserta membangun sistem verifikasi lengkap untuk layanan atau library Go pilihannya — bukan demo, melainkan pemeriksaan yang benar-benar akan menjadi gerbang merge timnya sendiri.

- **Pilih satu repository target**:
  - **Layanan**: layanan HTTP atau gRPC dengan dependensi database, sehingga penanganan error, propagasi context, dan siklus hidup koneksi semuanya dapat dianalisis
  - **Library**: package dengan API publik dan invarian nontrivial, sehingga property test dan analisis mutasi memiliki semantik nyata untuk dipertahankan
- **Deliverable yang diwajibkan**:
  - Analyzer `go/analysis` kustom yang menangkap kelas cacat yang tidak ditangkap linter siap pakai mana pun pada codebase tersebut, dengan minimal satu suggested fix
  - Test untuk analyzer itu sendiri memakai `analysistest`, termasuk kasus yang tidak boleh ditandai
  - Konfigurasi golangci-lint dengan baseline terdokumentasi, kebijakan supresi, dan rasio false positive terukur
  - Target fuzz yang di-seed dari minimal satu crasher nyata, plus konfigurasi `-race` dan `goleak`
  - Property test stateful yang oracle-nya adalah model independen
  - Mutation score untuk dua package paling berisiko, dengan mutan yang bertahan didaftar dan dijelaskan
  - Satu desain konkurensi dispesifikasikan dalam PlusCal atau TLA+ dengan invarian yang diverifikasi model checker
  - Workflow CI yang menyambungkan gerbang cepat dan pemeriksaan mendalam malam hari
- **Presentasi**: walkthrough 15 menit yang menyatakan invarian yang dilindungi, bukti bahwa invarian itu bertahan, dan kelas cacat yang masih lolos dari sistem tersebut

## Kriteria Penilaian

- **Lab Mingguan (30%)**
  - 10 lab bertingkat pada Minggu 1 sampai 11, masing-masing menghasilkan tool berjalan atau hasil terukur, bukan jawaban tertulis
  - Dinilai dari apakah pemeriksaan menghasilkan temuan yang benar pada codebase nyata dan tetap diam pada kode yang benar
  - Keterlambatan dikenai penalti 10 persen per hari

- **Kuis (20%)**
  - 4 kuis pada akhir Minggu 3, 6, 9, dan 11
  - Pertanyaan konseptual tentang perilaku type checker, sifat lattice dataflow, penalaran happens-before, dan semantik fuzzing
  - Peserta harus mampu memprediksi keluaran sebuah pemeriksaan pada potongan kode tertentu, bukan sekadar mengingat API
  - Tingkat kelulusan minimum 70 persen untuk melanjutkan ke capstone

- **Proyek Capstone (40%)**
  - Kualitas analyzer: kebenaran, ketiadaan false positive pada kode benar, dan kegunaan suggested fix (15%)
  - Cakupan verifikasi: kombinasi pemeriksaan statis, dinamis, dan tingkat model dengan bukti masing-masing bekerja (15%)
  - Kualitas rekayasa: test, dokumentasi, integrasi CI, dan reproducibility (7%)
  - Kualitas dokumen desain dan presentasi akhir (3%)

- **Partisipasi dan Code Review (10%)**
  - Peer review atas desain analyzer dua rekan sekelas sebelum implementasi
  - Kritik konstruktif terhadap analisis false positive dan kebijakan supresi
  - Kehadiran dan partisipasi diskusi lab

## Referensi

- [Spesifikasi Bahasa Pemrograman Go](https://go.dev/ref/spec) — Definisi otoritatif tentang apa yang dijamin bahasa
- [Memory Model Go](https://go.dev/ref/mem) — Aturan happens-before dan dasar formal penalaran race
- [Dokumentasi go/ast](https://pkg.go.dev/go/ast) — Tipe node AST, traversal, dan inspeksi
- [Dokumentasi go/types](https://pkg.go.dev/go/types) — Type checker, peta `Info`, dan API sistem tipe
- [golang.org/x/tools/go/analysis](https://pkg.go.dev/golang.org/x/tools/go/analysis) — Framework analyzer, diagnostik, fakta, dan suggested fix
- [golang.org/x/tools/go/packages](https://pkg.go.dev/golang.org/x/tools/go/packages) — Whole-program loading dengan kesetiaan pada build system
- [golang.org/x/tools/go/ssa](https://pkg.go.dev/golang.org/x/tools/go/ssa) — Konstruksi SSA dan pembangun call graph
- [Staticcheck](https://staticcheck.dev/docs/) — Suite analisis statis Go paling rigorous dan studi tentang desain pemeriksaan
- [Dokumentasi golangci-lint](https://golangci-lint.run/) — Konfigurasi runner linter, preset, dan aturan pengecualian
- [Fuzzing Go](https://go.dev/doc/fuzz/) — Panduan resmi fuzzing berbasis cakupan native
- [Data Race Detector](https://go.dev/doc/articles/race_detector) — Cara kerja `-race` serta apa yang bisa dan tidak bisa diamatinya
- [pgregory.net/rapid](https://pgregory.net/rapid) — Pengujian berbasis properti dengan shrinking terintegrasi untuk Go
- [go.uber.org/goleak](https://github.com/uber-go/goleak) — Deteksi kebocoran goroutine untuk test
- [porcupine](https://github.com/anishathalye/porcupine) — Pemeriksaan linearizability untuk struktur data konkuren Go
- [Specifying Systems (Leslie Lamport)](https://lamport.azurewebsites.net/tla/book.html) — Buku TLA+, termasuk bahasa PlusCal
- [Designing Data-Intensive Applications (Martin Kleppmann)](https://dataintensive.net/) — Latar belakang kegagalan terdistribusi yang hendak disingkap model checking

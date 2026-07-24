---
title: "Panduan Pengujian dan Benchmarking Go"
description: "Panduan komprehensif tentang pengujian dan benchmarking di Go — mencakup pengujian berbasis tabel, strategi mocking, fixture pengujian, profiling benchmark, dan integrasi CI untuk aplikasi Go tingkat produksi."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Pengujian dan Benchmarking Go

## Pendahuluan

Pengujian adalah prioritas utama dalam ekosistem Go. Bahasa pemrograman ini dilengkapi dengan paket `testing` bawaan, perintah `go test` khusus, serta dukungan penuh untuk benchmarking, fuzzing, dan analisis cakupan kode. Konvensi Go — menamai file pengujian dengan `_test.go`, menggunakan pola pengujian berbasis tabel, dan menyimpan paket pengujian di direktori yang sama dengan kode produksi — membuat rangkaian pengujian menjadi cepat, andal, dan mudah dipelihara.

Panduan ini mencakup praktik pengujian dan benchmarking tingkat produksi di Go. Panduan ini mengasumsikan keakraban dasar dengan sintaks Go dan struktur proyek. Anda akan mempelajari cara menulis pengujian yang mendalam dan mudah dipelihara, melakukan benchmarking kode dengan ketelitian statistik, dan mengintegrasikan praktik-praktik ini ke dalam alur kerja pengembangan dan pipeline CI Anda.

## Praktik Terbaik

### Pengujian Berbasis Tabel

Pengujian berbasis tabel adalah cara idiomatis Go untuk menguji berbagai kombinasi input/output dengan sedikit boilerplate. Alih-alih menulis fungsi terpisah untuk setiap kasus, buatlah irisan kasus uji dan lakukan iterasi menggunakan `t.Run()` untuk sub-pengujian yang independen.

```go
func TestParsePhoneNumber(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        want     PhoneNumber
        wantErr  bool
    }{
        {"nomor US valid", "+1 555-123-4567", PhoneNumber{Country: "US", Number: "5551234567"}, false},
        {"nomor UK valid", "+44 20 7946 0958", PhoneNumber{Country: "GB", Number: "2079460958"}, false},
        {"kode negara hilang", "555-123-4567", PhoneNumber{}, true},
        {"terlalu pendek", "12345", PhoneNumber{}, true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParsePhoneNumber(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("ParsePhoneNumber(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
                return
            }
            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("ParsePhoneNumber(%q) = %v, want %v", tt.input, got, tt.want)
            }
        })
    }
}
```

Prinsip utama:
- Beri nama setiap kasus uji secara deskriptif agar sub-pengujian yang gagal mudah diidentifikasi
- Gunakan `t.Run()` untuk sub-pengujian independen sehingga kegagalan terisolasi
- Hindari logika percabangan di dalam fungsi pengujian; struktur tabel mengodekan semua variasi
- Gunakan `t.Parallel()` pada fungsi pengujian luar dan di dalam setiap sub-pengujian jika kasus benar-benar independen

### Mocking Melalui Interface

Sistem interface Go membuat mocking menjadi alami tanpa memerlukan framework yang berat. Definisikan interface di titik konsumsi, lalu ganti dengan implementasi pengujian.

```go
type UserRepository interface {
    GetByID(ctx context.Context, id string) (*User, error)
    Save(ctx context.Context, user *User) error
}

type mockUserRepository struct {
    getUserByID func(ctx context.Context, id string) (*User, error)
    save        func(ctx context.Context, user *User) error
}

func (m *mockUserRepository) GetByID(ctx context.Context, id string) (*User, error) {
    return m.getUserByID(ctx, id)
}

func (m *mockUserRepository) Save(ctx context.Context, user *User) error {
    return m.save(ctx, user)
}
```

Pilih mock yang ditulis tangan untuk interface kecil. Untuk interface yang lebih besar atau sering berubah, gunakan `gomock` atau `mockgen` untuk menghasilkan mock dari definisi interface. Hindari mocking layanan HTTP eksternal secara langsung — gunakan `httptest.NewServer` untuk menjalankan server pengujian lokal untuk pengujian bergaya integrasi.

### Isolasi Pengujian dan Manajemen State

Setiap pengujian harus dimulai dengan state yang bersih. Hindari berbagi variabel global yang dapat diubah antar pengujian. Gunakan `t.Cleanup()` untuk mendaftarkan fungsi teardown yang berjalan saat pengujian selesai, memastikan sumber daya dibebaskan bahkan saat terjadi kegagalan.

```go
func TestWithDatabase(t *testing.T) {
    db := setupTestDB(t)
    t.Cleanup(func() {
        db.Close()
    })
    // ... logika pengujian
}
```

Pola opsi fungsional dapat membuat konfigurasi pengujian menjadi eksplisit sambil menjaga kode produksi tetap bersih:

```go
type option func(*config)

func WithTimeout(d time.Duration) option {
    return func(c *config) {
        c.timeout = d
    }
}
```

### Asersi yang Bermakna

Gunakan `cmp` (dari `github.com/google/go-cmp`) untuk perbandingan mendalam dengan diff yang detail, bukan `reflect.DeepEqual`. Output diff menunjukkan field mana yang berbeda, membuat kegagalan pengujian lebih mudah didiagnosis.

```go
import "github.com/google/go-cmp/cmp"

func TestCreateUser(t *testing.T) {
    got := CreateUser("alice", "alice@example.com")
    want := User{Name: "alice", Email: "alice@example.com", CreatedAt: time.Now()}
    if diff := cmp.Diff(want, got, cmpopts.IgnoreFields(User{}, "CreatedAt")); diff != "" {
        t.Errorf("CreateUser() mismatch (-want +got):\n%s", diff)
    }
}
```

Hindari menguji detail implementasi. Uji perilaku dan kontrak yang diekspor, bukan fungsi privat. Jika fungsi privat cukup kompleks untuk memerlukan pengujian langsung, pertimbangkan untuk mengekstraknya ke dalam paketnya sendiri atau menjadikannya metode pada tipe yang diekspor.

### Benchmarking dengan Ketelitian Statistik

Framework benchmarking di paket `testing` menangani pengaturan waktu dan iterasi secara otomatis. Ikuti praktik berikut untuk hasil benchmark yang andal:

```go
func BenchmarkHashPassword(b *testing.B) {
    password := []byte("correct-horse-battery-staple")
    for i := 0; i < b.N; i++ {
        _, err := HashPassword(password)
        if err != nil {
            b.Fatal(err)
        }
    }
}
```

- Selalu gunakan `b.N` sebagai jumlah iterasi — jangan pernah mengkodekan ukuran loop secara tetap
- Tempatkan setup yang mahal di luar loop; gunakan `b.ResetTimer()` setelah persiapan
- Gunakan `b.ReportAllocs()` untuk menangkap metrik alokasi bersama dengan pengaturan waktu
- Jalankan benchmark beberapa kali (`-count=5`) dan periksa varians dengan `benchstat`
- Nonaktifkan penskalaan CPU dan hindari menjalankan benchmark di mesin yang sibuk

```bash
go test -bench=BenchmarkHashPassword -benchmem -count=5 -benchtime=100x .
```

## Langkah Implementasi

### Langkah 1: Menyiapkan Paket Pengujian Anda

Konvensi penamaan `_test.go` Go adalah fondasinya. Kompiler memperlakukan file-file ini secara khusus — file-file tersebut dikecualikan dari build produksi tetapi disertakan saat menjalankan `go test`.

**Struktur direktori untuk tata letak pengujian yang bersih:**

```text
internal/
  repository/
    user_repository.go
    user_repository_test.go
    user_repository_integration_test.go
  service/
    auth_service.go
    auth_service_test.go
handler/
  user_handler.go
  user_handler_test.go
```

Buat paket pembantu pengujian untuk utilitas bersama jika beberapa paket memerlukan infrastruktur pengujian yang sama:

```text
internal/
  testutil/
    db.go          # pembantu setupTestDB
    http.go        # pembantu server HTTP pengujian
    fixtures.go    # pabrik data pengujian umum
```

Untuk pengujian black-box, tempatkan pengujian di paket terpisah dengan menambahkan `_test` ke nama paket. Ini memastikan Anda hanya menguji API publik:

```go
package service_test // pengujian black-box — hanya dapat mengakses simbol yang diekspor

import (
    "testing"
    "example.com/project/internal/service"
)

func TestAuthenticate(t *testing.T) {
    svc := service.New(service.WithTestMode(true))
    token, err := svc.Authenticate("alice", "p@ssword")
    if err != nil {
        t.Fatalf("Authenticate() unexpected error: %v", err)
    }
    if token == "" {
        t.Error("Authenticate() returned empty token")
    }
}
```

### Langkah 2: Menulis Pengujian Berbasis Tabel

Pengujian berbasis tabel dapat diskalakan dari pemeriksaan fungsi sederhana hingga skenario integrasi yang kompleks. Strukturkan irisan kasus uji untuk mengodekan semua variasi secara eksplisit.

**Pola struct kasus uji yang umum:**

```go
// Pengujian input/output sederhana
type testCase struct {
    name    string
    input   string
    want    string
    wantErr bool
}

// Pengujian multi-output dengan efek samping
type integrationCase struct {
    name     string
    setup    func(*testing.T) *sql.DB
    request  CreateUserRequest
    wantUser User
    wantCode int
}

// Pengujian state machine atau sekuensial
type sequenceCase struct {
    name  string
    steps []struct {
        action string
        args   interface{}
        check  func(*testing.T, interface{})
    }
}
```

Jalankan sub-pengujian secara paralel jika tidak memiliki state:

```go
func TestCalculateTotal(t *testing.T) {
    t.Parallel()
    tests := []struct {
        name string
        items []CartItem
        want  float64
    }{
        {"keranjang kosong", nil, 0},
        {"satu item", []CartItem{{Price: 10.0, Qty: 2}}, 20.0},
        {"beberapa item", []CartItem{{Price: 5.0, Qty: 3}, {Price: 2.0, Qty: 1}}, 17.0},
    }
    for _, tt := range tests {
        tt := tt // tangkap variabel range
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            got := CalculateTotal(tt.items)
            if got != tt.want {
                t.Errorf("CalculateTotal(%v) = %v, want %v", tt.items, got, tt.want)
            }
        })
    }
}
```

Perhatikan shadow `tt := tt` — ini menangkap variabel loop per iterasi, mencegah race condition saat sub-pengujian berjalan secara paralel.

### Langkah 3: Mengimplementasikan Fixture dan Golden File

Untuk pengujian yang bergantung pada state sistem file atau menghasilkan output yang kompleks, gunakan fixture pengujian dan golden file.

**Pola fixture:**

```go
func TestProcessTemplate(t *testing.T) {
    // Baca fixture input
    input, err := os.ReadFile(filepath.Join("testdata", "input.tmpl"))
    if err != nil {
        t.Fatal(err)
    }

    got := ProcessTemplate(string(input), map[string]interface{}{
        "Name": "Alice",
        "Role": "Engineer",
    })

    // Bandingkan dengan golden file
    golden := filepath.Join("testdata", "input.golden")
    if *updateGolden {
        os.WriteFile(golden, []byte(got), 0644)
        t.Log("golden file diperbarui")
        return
    }

    want, err := os.ReadFile(golden)
    if err != nil {
        t.Fatalf("golden file tidak ditemukan: %v", err)
    }

    if diff := cmp.Diff(string(want), got); diff != "" {
        t.Errorf("output tidak cocok (-want +got):\n%s", diff)
    }
}
```

Pola flag `-update` memungkinkan pengembang untuk membuat ulang golden file saat perilaku berubah secara sengaja:

```go
var updateGolden = flag.Bool("update", false, "perbarui golden test files")

func TestMain(m *testing.M) {
    flag.Parse()
    os.Exit(m.Run())
}
```

**Pembantu pengujian dengan pembersihan:**

```go
func tempDirWithFiles(t *testing.T, files map[string]string) string {
    t.Helper()
    dir := t.TempDir()
    for name, content := range files {
        path := filepath.Join(dir, name)
        os.MkdirAll(filepath.Dir(path), 0755)
        if err := os.WriteFile(path, []byte(content), 0644); err != nil {
            t.Fatal(err)
        }
    }
    return dir
}
```

Menggunakan `t.TempDir()` dan `t.Cleanup()` memastikan sumber daya sementara dihapus secara otomatis, bahkan saat pengujian gagal.

### Langkah 4: Menambah dan Menjalankan Benchmark

Benchmark memerlukan fungsi dengan signature yang cocok dengan `func BenchmarkXxx(b *testing.B)`. Framework menyesuaikan `b.N` hingga benchmark berjalan setidaknya selama satu detik secara default.

**Struktur benchmark yang komprehensif:**

```go
func BenchmarkJSONMarshal(b *testing.B) {
    data := generateLargePayload()

    b.ReportAllocs()
    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        _, err := json.Marshal(data)
        if err != nil {
            b.Fatal(err)
        }
    }
}

func BenchmarkJSONMarshalParallel(b *testing.B) {
    data := generateLargePayload()

    b.ReportAllocs()
    b.ResetTimer()

    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            _, err := json.Marshal(data)
            if err != nil {
                b.Error(err)
            }
        }
    })
}
```

**Sub-benchmark** memungkinkan Anda membandingkan beberapa implementasi dalam satu pengujian:

```go
func BenchmarkSerialize(b *testing.B) {
    benchmarks := []struct {
        name string
        fn   func(interface{}) ([]byte, error)
    }{
        {"encoding/json", json.Marshal},
        {"encoding/gob", gobMarshal},
        {"github.com/json-iterator/go", jsoniter.Marshal},
    }
    payload := generatePayload()
    for _, bm := range benchmarks {
        b.Run(bm.name, func(b *testing.B) {
            b.ReportAllocs()
            for i := 0; i < b.N; i++ {
                _, err := bm.fn(payload)
                if err != nil {
                    b.Fatal(err)
                }
            }
        })
    }
}
```

**Profiling benchmark** mengidentifikasi di mana waktu dihabiskan:

```bash
# Profil CPU
go test -bench=BenchmarkSerialize -cpuprofile=cpu.out -memprofile=mem.out

# Trace
go test -bench=BenchmarkSerialize -trace=trace.out

# Lihat profil (membuka web UI)
go tool pprof -http=:8080 cpu.out
go tool trace trace.out
```

### Langkah 5: Mengintegrasikan Pengujian ke CI/CD

Siapkan pipeline CI Anda untuk menjalankan rangkaian pengujian lengkap dengan deteksi race condition dan penegakan cakupan kode.

**Konfigurasi CI minimal (GitHub Actions):**

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-go@v5
      with:
        go-version: '1.22'
    - name: Jalankan pengujian dengan race detector
      run: go test -race -coverprofile=coverage.out -covermode=atomic ./...
    - name: Tegakkan batas cakupan
      run: |
        go tool cover -func=coverage.out | grep '^total:' | awk '{print $3}' | \
          while read pct; do
            threshold=80.0
            if (( $(echo "$pct < $threshold" | bc -l) )); then
              echo "Cakupan $pct% di bawah batas $threshold%"
              exit 1
            fi
          done
    - name: Jalankan vet dan lint
      run: |
        go vet ./...
        which staticcheck && staticcheck ./... || true
```

**Memisahkan pengujian unit dan integrasi** menjaga siklus pengembangan tetap cepat:

```go
// user_repository_integration_test.go
//go:build integration

package repository

import (
    "testing"
    "os"
)

func TestMain(m *testing.M) {
    // Mulai test container atau hubungkan ke DB pengujian
    setup()
    code := m.Run()
    teardown()
    os.Exit(code)
}

func TestUserRepository_Integration(t *testing.T) {
    if testing.Short() {
        t.Skip("melewatkan pengujian integrasi dalam mode pendek")
    }
    // ... logika pengujian integrasi
}
```

Jalankan pengujian unit selama pengembangan dan rangkaian lengkap di CI:

```bash
# Pemeriksaan cepat (melewatkan integrasi)
go test -short -race ./...

# Rangkaian lengkap di CI
go test -tags=integration -race -coverprofile=coverage.out ./...
```

**Fuzzing** (Go 1.18+) menangkap kasus batas yang terlewat oleh pengujian unit:

```go
func FuzzParsePhoneNumber(f *testing.F) {
    seed := []string{"+1 555-123-4567", "+44 20 7946 0958", "invalid"}
    for _, s := range seed {
        f.Add(s)
    }
    f.Fuzz(func(t *testing.T, input string) {
        result, err := ParsePhoneNumber(input)
        if err == nil && result.Country == "" {
            t.Errorf("ParsePhoneNumber(%q) menghasilkan country kosong saat sukses", input)
        }
    })
}
```

```bash
go test -fuzz=FuzzParsePhoneNumber -fuzztime=30s ./...
```

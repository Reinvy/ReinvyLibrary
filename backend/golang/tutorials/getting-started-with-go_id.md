---
title: "Memulai Pemrograman Go"
description: "Tutorial ramah pemula yang mencakup dasar-dasar Go — instalasi, sintaks, tipe data, struktur kontrol, fungsi, dasar konkurensi, dan pembuatan aplikasi CLI."
category: "backend"
technology: "golang"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Memulai Pemrograman Go

## Ringkasan

Tutorial ini memperkenalkan bahasa pemrograman Go (Golang) dari dasar. Anda akan mempelajari cara menyiapkan lingkungan pengembangan Go, memahami konsep inti bahasa seperti variabel, alur kontrol, fungsi, dan struct, serta membangun aplikasi daftar tugas (to-do) berbasis command-line yang praktis. Pada akhirnya, Anda akan memiliki fondasi yang kuat untuk menulis program Go yang efisien dan konkuren.

## Target Audiens

- Pengembang pemula dengan pengalaman pemrograman dasar di bahasa apa pun (JavaScript, Python, dll.).
- Pengembang yang tertarik mempelajari bahasa terkompilasi dan bertipe statis untuk pemrograman backend atau sistem.

## Prasyarat

- Pemahaman dasar tentang konsep pemrograman (variabel, perulangan, fungsi).
- Komputer dengan akses internet untuk mengunduh Go dan editor kode (VS Code direkomendasikan).
- Keakraban dengan terminal atau baris perintah.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menginstal Go dan mengkonfigurasi ruang kerja pengembangan.
- Menulis dan menjalankan program Go menggunakan `go run` dan `go build`.
- Menggunakan tipe dasar, variabel, konstanta, dan struktur kontrol di Go.
- Mendefinisikan dan memanggil fungsi, termasuk nilai balik ganda.
- Bekerja dengan tipe komposit: array, slice, map, dan struct.
- Menangani kesalahan secara idiomatis menggunakan antarmuka error Go.
- Menulis program konkuren sederhana menggunakan goroutine dan channel.
- Membangun dan menata aplikasi CLI dengan paket (package).

## Konteks dan Motivasi

Go diciptakan di Google pada tahun 2009 oleh Robert Griesemer, Rob Pike, dan Ken Thompson untuk mengatasi tantangan rekayasa perangkat lunak modern: waktu kompilasi yang lambat, ketergantungan yang tidak terkontrol, dan kompleksitas pemrograman konkuren. Go kini menjadi tulang punggung infrastruktur cloud (Docker, Kubernetes, Terraform semuanya ditulis dalam Go), menjadikannya salah satu bahasa paling berharga untuk insinyur backend dan DevOps. Sintaks Go yang bersih, kompilasi cepat, model konkurensi bawaan, dan pustaka standar yang sangat baik menjadikannya bahasa terkompilasi pertama yang ideal untuk dipelajari.

## Konten Inti

### Menginstal Go

Go didistribusikan sebagai penginstal biner tunggal. Unduh versi stabil terbaru dari [go.dev/dl](https://go.dev/dl/).

**Linux / macOS**: Unduh tarball dan ekstrak:

```bash
wget https://go.dev/dl/go1.22.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.22.5.linux-amd64.tar.gz
```

Tambahkan Go ke `PATH` dengan menambahkan ini ke `~/.bashrc` atau `~/.zshrc`:

```bash
export PATH=$PATH:/usr/local/go/bin
```

**Windows**: Unduh penginstal MSI dan ikuti wizard. Go akan otomatis ditambahkan ke PATH.

Verifikasi instalasi:

```bash
go version
# Keluaran yang diharapkan: go version go1.22.5 linux/amd64
```

### Program Go Pertama Anda

Buat direktori baru untuk proyek Anda dan file bernama `main.go`:

```bash
mkdir hello-go
cd hello-go
touch main.go
```

Tulis kode berikut:

```go
package main

import "fmt"

func main() {
    fmt.Println("Halo, Go!")
}
```

Jalankan:

```bash
go run main.go
```

Anda akan melihat `Halo, Go!` tercetak. Perintah `go run` mengkompilasi dan menjalankan program Anda dalam satu langkah. Untuk biner produksi, gunakan `go build`:

```bash
go build -o hello
./hello
```

### Variabel dan Konstanta

Go bersifat statis, tetapi mendukung inferensi tipe dengan deklarasi pendek `:=`:

```go
package main

import "fmt"

func main() {
    // Deklarasi eksplisit dengan tipe
    var name string = "Go"

    // Inferensi tipe
    version := 1.22

    // Beberapa variabel
    var x, y int = 10, 20

    // Konstanta (tidak bisa menggunakan :=)
    const greeting = "Selamat datang di"

    fmt.Println(greeting, name, "versi", version)
    fmt.Println("Jumlah:", x+y)
}
```

**Aturan penting**:
- Variabel yang dideklarasikan tanpa nilai awal mendapatkan **nilai nol** (0 untuk angka, `""` untuk string, `false` untuk boolean).
- Variabel yang tidak digunakan menyebabkan kesalahan kompilasi — Go menerapkan kode bersih.
- Konstanta dievaluasi pada waktu kompilasi dan tidak dapat ditetapkan ulang.

### Tipe Data Dasar

Tipe bawaan Go dapat dikelompokkan ke dalam empat keluarga:

| Kategori | Tipe | Deskripsi |
|----------|------|-----------|
| Boolean | `bool` | `true` atau `false` |
| Numerik (integer) | `int`, `int8`, `int16`, `int32`, `int64`, `uint`, `uint8`, `byte`, `uint16`, `uint32`, `uint64` | Integer bertanda dan tak bertanda |
| Numerik (float) | `float32`, `float64` | Bilangan floating-point |
| Numerik (kompleks) | `complex64`, `complex128` | Bilangan kompleks |
| Teks | `string` | Teks berenkode UTF-8 |

```go
var (
    aktif   bool    = true
    usia    int     = 30
    harga   float64 = 29.99
    pesan   string  = "Halo, 世界" // Unicode berfungsi secara native
)
```

### Alur Kontrol

Go menggunakan kata kunci alur kontrol standar dengan beberapa keunikan — tidak ada tanda kurung di sekitar kondisi, dan kurung kurawal wajib digunakan.

#### If / Else

```go
skor := 85

if skor >= 90 {
    fmt.Println("Nilai: A")
} else if skor >= 75 {
    fmt.Println("Nilai: B")
} else {
    fmt.Println("Nilai: C")
}
```

Go juga mendukung **if with statement** yang ringkas — idiom umum untuk membatasi lingkup variabel:

```go
if err := doSomething(); err != nil {
    fmt.Println("Error:", err)
}
// err tidak dapat diakses di sini
```

#### Perulangan For

Go hanya memiliki satu kata kunci perulangan — `for` — tetapi mencakup semua pola:

```go
// Perulangan tiga-bagian klasik
for i := 0; i < 5; i++ {
    fmt.Println(i)
}

// Seperti while
jumlah := 0
for jumlah < 10 {
    jumlah += 3
}

// Perulangan tak terbatas (break untuk keluar)
for {
    fmt.Println("berjalan...")
    break
}

// Range loop (iterasi slice/map)
nama := []string{"Alice", "Bob", "Charlie"}
for indeks, nama := range nama {
    fmt.Printf("%d: %s\n", indeks, nama)
}
```

#### Switch

Switch Go ringkas — setiap case otomatis berhenti (break):

```go
hari := "Senin"

switch hari {
case "Sabtu", "Minggu":
    fmt.Println("Akhir Pekan!")
default:
    fmt.Println("Hari Kerja")
}
```

### Fungsi

Fungsi dideklarasikan dengan `func`, parameter ditulis sebelum tipe, dan Go mendukung nilai balik ganda — fitur yang banyak digunakan untuk penanganan kesalahan:

```go
package main

import (
    "errors"
    "fmt"
)

// Fungsi sederhana
func sapa(nama string) string {
    return "Halo, " + nama + "!"
}

// Nilai balik ganda (pola result, error)
func bagi(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("pembagian dengan nol")
    }
    return a / b, nil
}

// Named return values
func jumlah(angka ...int) (total int) {
    for _, n := range angka {
        total += n
    }
    return // naked return — mengembalikan 'total'
}

func main() {
    fmt.Println(sapa("Gopher"))

    hasil, err := bagi(10, 3)
    if err != nil {
        fmt.Println("Error:", err)
    } else {
        fmt.Println("10 / 3 =", hasil)
    }

    fmt.Println("Jumlah:", jumlah(1, 2, 3, 4, 5))
}
```

### Array, Slice, dan Map

**Array** memiliki ukuran tetap yang ditentukan saat kompilasi:

```go
var arr [3]int = [3]int{1, 2, 3}
```

**Slice** adalah array dinamis — tipe koleksi yang paling umum digunakan:

```go
// Membuat slice
buah := []string{"apel", "pisang", "ceri"}

// Append (mengembalikan slice baru)
buah = append(buah, "kurma")

// Operasi slice
fmt.Println(buah[1:3]) // [pisang ceri]
fmt.Println(len(buah)) // 4
```

**Map** adalah penyimpanan pasangan kunci-nilai:

```go
skor := map[string]int{
    "Alice": 95,
    "Bob":   82,
}

// Menambah / memperbarui
skor["Charlie"] = 88

// Memeriksa keberadaan dengan idiom koma-ok
nilai, ada := skor["Alice"]
if ada {
    fmt.Println("Skor Alice:", nilai)
}

// Menghapus
delete(skor, "Bob")
```

### Struct dan Method

Go menggunakan struct (bukan class) untuk mengelompokkan data. Method adalah fungsi dengan **receiver**:

```go
package main

import "fmt"

// Definisi struct
type Person struct {
    Nama string
    Usia int
}

// Method dengan value receiver
func (p Person) Sapa() string {
    return fmt.Sprintf("Hai, saya %s dan berusia %d tahun", p.Nama, p.Usia)
}

// Method dengan pointer receiver (dapat memodifikasi struct)
func (p *Person) UlangTahun() {
    p.Usia++
}

func main() {
    orang := Person{Nama: "Alice", Usia: 30}
    fmt.Println(orang.Sapa())

    orang.UlangTahun()
    fmt.Println("Setelah ulang tahun:", orang.Usia)
}
```

Pointer receiver digunakan ketika method perlu memodifikasi struct atau ketika struct berukuran besar dan penyalinan akan memakan biaya.

### Penanganan Error

Go tidak memiliki exception. Error adalah nilai yang dikembalikan dari fungsi:

```go
package main

import (
    "fmt"
    "os"
)

func bacaFile(namaFile string) (string, error) {
    data, err := os.ReadFile(namaFile)
    if err != nil {
        return "", fmt.Errorf("gagal membaca %s: %w", namaFile, err)
    }
    return string(data), nil
}

func main() {
    konten, err := bacaFile("config.json")
    if err != nil {
        fmt.Println("Error:", err)
        os.Exit(1)
    }
    fmt.Println(konten)
}
```

Error kustom dibuat dengan `errors.New` atau `fmt.Errorf`. Gunakan `%w` untuk membungkus error sehingga pemanggil dapat membukanya dengan `errors.Is` atau `errors.As`.

### Goroutine dan Channel

Konkurensi adalah warga negara kelas satu di Go. **Goroutine** adalah thread ringan, dan **channel** adalah saluran bertipe untuk komunikasi antar goroutine:

```go
package main

import (
    "fmt"
    "time"
)

func pekerja(id int, pekerjaan <-chan int, hasil chan<- int) {
    for job := range pekerjaan {
        fmt.Printf("Pekerja %d memproses job %d\n", id, job)
        time.Sleep(time.Second) // simulasi kerja
        hasil <- job * 2
    }
}

func main() {
    const jumlahPekerjaan = 5
    pekerjaan := make(chan int, jumlahPekerjaan)
    hasil := make(chan int, jumlahPekerjaan)

    // Mulai 3 pekerja
    for w := 1; w <= 3; w++ {
        go pekerja(w, pekerjaan, hasil)
    }

    // Kirim pekerjaan
    for j := 1; j <= jumlahPekerjaan; j++ {
        pekerjaan <- j
    }
    close(pekerjaan)

    // Kumpulkan hasil
    for r := 1; r <= jumlahPekerjaan; r++ {
        <-hasil
    }

    fmt.Println("Semua pekerjaan selesai")
}
```

Motto Go adalah: **"Jangan berkomunikasi dengan berbagi memori; sebaliknya, bagilah memori dengan berkomunikasi."**

### Paket dan Modul

Setiap program Go diorganisir ke dalam paket (package). Paket `main` mendefinisikan executable. Library diimpor dengan path modulnya:

```bash
# Inisialisasi modul
go mod init github.com/namaanda/todo-app
```

Ini membuat file `go.mod` yang melacak dependensi. Mengimpor paket eksternal semudah:

```go
import (
    "fmt"
    "github.com/google/uuid" // otomatis diambil saat build
)
```

## Contoh Kode

### Aplikasi To-Do CLI

Contoh lengkap ini menggabungkan semua yang telah dipelajari — struct, method, slice, penanganan error, dan antarmuka CLI sederhana:

```go
package main

import (
    "bufio"
    "fmt"
    "os"
    "strconv"
    "strings"
)

// Task mewakili satu item tugas
type Task struct {
    ID    int
    Judul string
    Selesai bool
}

// TaskList mengelola kumpulan tugas
type TaskList struct {
    tasks  []Task
    nextID int
}

// Tambah membuat tugas baru dan menambahkannya ke daftar
func (tl *TaskList) Tambah(judul string) {
    task := Task{
        ID:      tl.nextID,
        Judul:   judul,
        Selesai: false,
    }
    tl.tasks = append(tl.tasks, task)
    tl.nextID++
    fmt.Printf("Menambahkan tugas %d: %s\n", task.ID, judul)
}

// Daftar mencetak semua tugas
func (tl *TaskList) Daftar() {
    if len(tl.tasks) == 0 {
        fmt.Println("Belum ada tugas!")
        return
    }
    for _, t := range tl.tasks {
        status := " "
        if t.Selesai {
            status = "✓"
        }
        fmt.Printf("[%s] %d: %s\n", status, t.ID, t.Judul)
    }
}

// Selesai menandai tugas sebagai selesai berdasarkan ID
func (tl *TaskList) Selesai(id int) error {
    for i, t := range tl.tasks {
        if t.ID == id {
            tl.tasks[i].Selesai = true
            fmt.Printf("Tugas %d ditandai selesai\n", id)
            return nil
        }
    }
    return fmt.Errorf("tugas %d tidak ditemukan", id)
}

func main() {
    tl := TaskList{}
    scanner := bufio.NewScanner(os.Stdin)

    fmt.Println("=== Aplikasi To-Do Go ===")
    fmt.Println("Perintah: tambah <judul>, daftar, selesai <id>, keluar")

    for {
        fmt.Print("> ")
        if !scanner.Scan() {
            break
        }

        input := strings.TrimSpace(scanner.Text())
        parts := strings.SplitN(input, " ", 2)
        perintah := parts[0]

        switch perintah {
        case "tambah":
            if len(parts) < 2 {
                fmt.Println("Penggunaan: tambah <judul>")
                continue
            }
            tl.Tambah(parts[1])

        case "daftar":
            tl.Daftar()

        case "selesai":
            if len(parts) < 2 {
                fmt.Println("Penggunaan: selesai <id>")
                continue
            }
            id, err := strconv.Atoi(parts[1])
            if err != nil {
                fmt.Println("ID tidak valid:", parts[1])
                continue
            }
            if err := tl.Selesai(id); err != nil {
                fmt.Println("Error:", err)
            }

        case "keluar":
            fmt.Println("Sampai jumpa!")
            return

        default:
            fmt.Println("Perintah tidak dikenal. Coba: tambah, daftar, selesai, keluar")
        }
    }
}
```

Untuk menjalankan:

```bash
go run main.go
```

Contoh interaksi:

```text
> tambah Belajar Go
Menambahkan tugas 0: Belajar Go
> tambah Bangun web server
Menambahkan tugas 1: Bangun web server
> daftar
[ ] 0: Belajar Go
[ ] 1: Bangun web server
> selesai 0
Tugas 0 ditandai selesai
> daftar
[✓] 0: Belajar Go
[ ] 1: Bangun web server
> keluar
Sampai jumpa!
```

## Insight Penting

- **Kesederhanaan dalam desain**: Spesifikasi bahasa Go kecil dan mudah dibaca. Anda dapat mempelajari sebagian besar bahasa ini dalam akhir pekan. Kesederhanaan ini menghasilkan basis kode yang mudah dinavigasi dan dipelihara selama bertahun-tahun.
- **Nilai nol adalah teman Anda**: Setiap variabel di Go dimulai dengan nilai nol yang dapat diprediksi (`0`, `""`, `false`, `nil`). Ini menghilangkan bug perilaku tak terdefinisi yang umum di C dan C++ dan berarti Anda jarang perlu inisialisasi eksplisit.
- **Error adalah nilai, bukan eksepsi**: Penanganan error eksplisit Go memaksa Anda untuk memikirkan kasus kegagalan di setiap titik panggilan. Meskipun verbose, ini menghasilkan perangkat lunak yang lebih kuat karena error tidak pernah ditelan secara diam-diam.
- **Goroutine itu murah**: Anda dapat memulai ribuan goroutine dalam proses yang sama. Mereka berbagi ruang alamat yang sama, tetapi penjadwal Go memultipleksnya ke thread OS secara efisien, membuat konkurensi dapat diakses tanpa overhead thread pool atau async/await.
- **`go fmt` menegakkan gaya**: Alat `gofmt` (dijalankan secara otomatis oleh sebagian besar editor) memformat ulang kode Anda ke satu gaya kanonik. Ini menghilangkan semua perdebatan gaya dalam tinjauan kode dan membuat setiap basis kode Go terasa familiar.

## Langkah Berikutnya

- Jelajahi pustaka standar Go: `net/http` untuk membangun web server, `encoding/json` untuk pekerjaan API, dan `database/sql` untuk akses database.
- Baca "[Effective Go](https://go.dev/doc/effective_go)" — panduan resmi untuk menulis Go idiomatis.
- Pelajari tentang interface dan generics (Go 1.18+) untuk menulis abstraksi yang lebih dapat digunakan kembali.
- Coba bangun REST API dengan paket `net/http` Go atau framework seperti Gin atau Echo.

## Kesimpulan

Go menyediakan fondasi yang kuat namun sederhana untuk membangun perangkat lunak modern dan konkuren. Anda telah mempelajari fitur inti bahasa — dari variabel dan alur kontrol hingga goroutine dan paket — dan membangun aplikasi CLI yang praktis. Penekanan Go pada kejelasan, kompilasi cepat, dan konkurensi bawaan menjadikannya pilihan yang sangat baik untuk API, alat CLI, mikroservis, dan infrastruktur cloud. Lanjutkan berlatih dengan membangun proyek-proyek kecil, dan Anda akan segera menghargai mengapa Go telah menjadi bahasa dominan dalam pengembangan cloud-native.

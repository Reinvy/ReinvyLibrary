---
title: "Silabus CLI dan Tooling Go"
description: "Kurikulum enam minggu untuk membangun perkakas baris perintah Go kelas produksi: desain perintah, Cobra dan Viper, konfigurasi berlapis, build lintas platform yang reprodusibel, pengujian end-to-end berbasis skrip, serta rilis bertanda tangan dengan GoReleaser."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus CLI dan Tooling Go

## Ringkasan

Go menjadi bahasa utama untuk perkakas infrastruktur karena satu alasan praktis: `go build` menghasilkan satu binary statis tanpa dependensi runtime, waktu start di bawah 20 ms, dan matriks kompilasi silang yang cukup ditulis dalam satu perulangan shell. Docker, kubectl, Terraform, gh, dan Helm semuanya didistribusikan dengan cara ini. Namun banyak tim menulis CLI internal sebagai pekerjaan sampingan — sebuah `main.go` yang membaca `os.Args`, mencetak ke stdout, dan selalu keluar dengan kode 0 apa pun yang terjadi.

Kursus enam minggu ini memperlakukan antarmuka baris perintah sebagai permukaan produk dengan batasan desainnya sendiri: tata bahasa perintah yang mudah ditemukan, konfigurasi berlapis yang menghormati lingkungan twelve-factor, build deterministik, cakupan pengujian yang dapat diskrip, serta pipeline rilis yang mengirim checksum dan tanda tangan alih-alih file tar di halaman wiki.

Urutan kurikulum mengikuti ketergantungan. Minggu 1 dan 2 membangun kontrak yang dilihat pengguna (tata bahasa, lalu Cobra). Minggu 3 membuat kontrak tersebut dapat dikonfigurasi. Minggu 4 membuatnya dapat dibangun dan dikirim untuk semua sistem operasi. Minggu 5 membuktikan bahwa ia bekerja melalui tes yang dapat dijalankan runner CI. Minggu 6 menerbitkannya. Setiap modul diakhiri lab yang langsung menyumbang ke proyek akhir, sehingga peserta tidak pernah menulis kode sekali pakai.

## Kurikulum

### Modul 1: Desain CLI dan UX Baris Perintah (Minggu 1)

- **Tata bahasa perintah sebelum kode**
  - Urutan noun-verb (`depctl service deploy`) versus verb-noun (`depctl deploy service`) dan alasan kubectl memilih yang pertama
  - Memetakan model domain ke pohon perintah, bukan mengarang kata kerja baru
  - Kata terlarang, alias, dan singkatan yang tidak akan bertabrakan di kemudian hari
- **Konvensi flag yang sudah dikenal pengguna**
  - Flag pendek POSIX, flag panjang GNU, `--flag=value` versus `--flag value`
  - Terminator `--` dan alasan argumen posisional harus tetap utuh setelah parsing
  - Negasi boolean (`--color` / `--no-color`) dan konsistensi dengan variabel lingkungan
- **Stream dan kode keluar sebagai API**
  - Data ke stdout, diagnostik ke stderr, keduanya tidak boleh tercampur
  - Taksonomi kode keluar: `0` sukses, `1` gagal umum, `2` kesalahan penggunaan, `126`/`127` untuk masalah eksekusi
  - Output machine-readable di balik `--json` / `--output yaml` agar bisa dikonsumsi pipeline
- **Lab**: Tulis spesifikasi perintah satu halaman untuk `depctl`, lengkap dengan pohon perintah, seluruh flag global, dan kontrak kode keluar

### Modul 2: Pohon Perintah dengan Cobra (Minggu 2)

- **Struktur dan model eksekusi**
  - Field `cobra.Command` yang penting: `Use`, `Short`, `Long`, `Example`, `Args`, `RunE`
  - `RunE` alih-alih `Run`: mengembalikan error membuat `main` bebas dari pemanggilan `os.Exit`
  - `PersistentPreRunE` untuk penyiapan lintas perintah seperti logging dan pembuatan client
- **Validasi dan ergonomi**
  - Validator bawaan (`cobra.ExactArgs`, `cobra.NoArgs`) serta fungsi `Args` kustom
  - `MarkFlagRequired`, `MarkFlagsMutuallyExclusive`, dan peringatan deprecation
  - Saran otomatis untuk subperintah yang salah ketik dan perintah internal yang disembunyikan
- **Shell completion**
  - Membuat completion untuk bash, zsh, fish, dan PowerShell
  - Fungsi completion dinamis untuk nama resource yang diambil dari API
- **Lab**: Implementasikan pohon perintah `depctl deploy`, `depctl status`, dan `depctl rollback` sesuai spesifikasi Modul 1

### Modul 3: Konfigurasi dengan Viper dan Presedensi (Minggu 3)

- **Tangga presedensi**
  - Flag menimpa environment, environment menimpa file, file menimpa default — dan satu helper yang mendokumentasikannya
  - `viper.BindPFlag` dan `viper.BindEnv` agar satu struct mewakili semua sumber nilai
  - Alasan `viper.AutomaticEnv` saja diam-diam melewatkan key bersarang sehingga perlu `SetEnvKeyReplacer`
- **Penemuan konfigurasi**
  - Path `--config` eksplisit, lalu `$XDG_CONFIG_HOME`, lalu `os.UserConfigDir()`
  - Overlay profil (`config.staging.yaml`) dan penolakan key tak dikenal secara ketat
- **Disiplin rahasia**
  - Token berasal dari environment atau keychain OS, tidak pernah dari file yang masuk repositori
  - Menyamarkan nilai sensitif pada output `depctl config view` dan pada log debug
  - Memvalidasi hasil gabungan sekali saja, saat startup, memakai struct bertipe
- **Lab**: Tambahkan konfigurasi berlapis dengan tiga profil dan perintah `depctl config view` yang menyamarkan rahasia

### Modul 4: Packaging, Kompilasi Silang, dan Reprodusibilitas (Minggu 4)

- **Tata letak yang tetap mudah diuji**
  - `cmd/depctl/main.go` tetap di bawah tiga puluh baris; seluruh logika berada di `internal/`
  - Entrypoint `Run(args []string, stdout, stderr io.Writer) int` yang membuat seluruh CLI dapat diuji unit
  - Menghindari state level paket agar dua pemanggilan `Run` dalam satu binary tes tidak saling mengganggu
- **Build deterministik**
  - `-trimpath`, `-buildvcs=false`, `CGO_ENABLED=0`, dan `-ldflags "-s -w"`
  - Injeksi versi dengan `-X main.version=...` yang diisi dari `git describe --tags --dirty`
  - Pemeriksaan output reprodusibel dengan membangun dua kali lalu membandingkan hash SHA-256
- **Matriks build**
  - Pasangan `GOOS`/`GOARCH` yang relevan: linux/amd64, linux/arm64, darwin/arm64, windows/amd64
  - Binary universal macOS dengan menggabungkan keluaran `arm64` dan `amd64` memakai `lipo`
- **Lab**: Buat skrip build yang menghasilkan enam artefak dengan metadata versi dan hash identik pada dua kali eksekusi

### Modul 5: Pengujian CLI End to End (Minggu 5)

- **Level unit**
  - Tes table-driven terhadap `Run` dengan stream `bytes.Buffer` dan `t.TempDir()` sebagai root konfigurasi
  - Menguji kode keluar dan teks stderr, bukan hanya memastikan tidak ada panic
- **Golden file**
  - Menyimpan snapshot output `--help` agar dokumentasi tidak menyimpang dari perilaku
  - Flag `-update` untuk meregenerasi golden secara sengaja, bukan sembarangan
- **Tes integrasi berskrip**
  - `rogpeppe/go-internal/testscript` untuk skenario multi-langkah yang ditulis sebagai skrip `.txtar`
  - Memalsukan stdin, jaringan, dan clock melalui interface yang diinjeksi
  - Menjalankan suite di seluruh matriks build pada CI dengan `go test ./... -race`
- **Lab**: Capai cakupan yang bermakna lewat golden untuk setiap perintah plus dua skenario testscript yang mencakup jalur kegagalan

### Modul 6: Rilis, Distribusi, dan Supply Chain (Minggu 6)

- **GoReleaser**
  - `.goreleaser.yaml`: arsip, paket `nfpm`, tap Homebrew, bucket Scoop, image Docker multi-arch
  - Checksum, pembuatan SBOM, dan penandatanganan artefak dengan `cosign`
  - Pembuatan changelog dari conventional commit
- **Pipeline dan kepercayaan**
  - Workflow GitHub Actions yang dipicu tag dengan `permissions: contents: write` dan tanpa token berumur panjang
  - Ekspektasi `GONOSUMDB`/`GOSUMDB` dan verifikasi build di container bersih
  - Kebijakan versi: semver untuk kontrak CLI berarti perubahan flag yang merusak adalah versi mayor
- **Lab**: Terbitkan rilis `v1.0.0` bertanda tangan dari CI yang bersih dan pasang di mesin kedua melalui tap Homebrew

## Proyek Akhir

Peserta membangun **`depctl`**, sebuah CLI audit dependensi yang memindai repositori untuk modul usang atau rentan lalu melaporkan hasilnya dalam bentuk yang mudah dibaca manusia maupun `--json`.

Persyaratan:

- Pohon perintah Cobra dengan `scan`, `report`, `config`, dan `version`, plus shell completion untuk masing-masing
- Konfigurasi berlapis (flag, environment, file profil) yang divalidasi menjadi satu struct bertipe saat startup
- Entrypoint `Run(...) int` yang dicakup tes unit table-driven, snapshot golden untuk help, dan minimal dua skenario testscript
- Binary hasil kompilasi silang untuk empat pasangan platform dengan metadata versi diinjeksi saat link
- Pipeline GoReleaser yang menerbitkan arsip, file checksum, SBOM bertanda tangan, dan formula Homebrew
- Kode keluar yang terdokumentasi serta output `--json` stabil yang dapat dikonsumsi skrip lain tanpa mem-parsing teks bebas

## Kriteria Penilaian

- **Lab mingguan (40%)**: setiap lab dinilai dari kebenaran fungsi, keberadaan tes, dan apakah outputnya dapat diskrip. Keterlambatan mengurangi 10% per hari.
- **Latihan code review (15%)**: peserta meninjau pull request CLI yang sengaja dibuat cacat dan harus menemukan minimal lima dari tujuh masalah yang disisipkan, mencakup kode keluar, kebocoran rahasia, dan build non-deterministik.
- **Proyek akhir (45%)**: dinilai dengan rubrik — desain perintah dan teks bantuan (10%), pelapisan konfigurasi dan penanganan rahasia (10%), keluasan cakupan tes (10%), build reprodusibel dan pipeline rilis (10%), serta kualitas dokumentasi termasuk kontrak kode keluar (5%).

Syarat kelulusan mewajibkan pipeline rilis berhasil dari checkout bersih; proyek yang hanya bisa dibangun di mesin penulisnya tidak diterima.

## Referensi

- Dokumentasi Cobra: https://cobra.dev
- Dokumentasi Viper: https://github.com/spf13/viper
- Dokumentasi GoReleaser: https://goreleaser.com
- `go-internal/testscript`: https://pkg.go.dev/github.com/rogpeppe/go-internal/testscript
- "Command Line Interface Guidelines" (clig.dev): https://clig.dev
- Referensi kompilasi silang Go: https://pkg.go.dev/cmd/go#hdr-Environment_variables

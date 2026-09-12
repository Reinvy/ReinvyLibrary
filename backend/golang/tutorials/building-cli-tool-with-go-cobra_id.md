---
title: "Membangun Alat CLI dengan Go Menggunakan Cobra"
description: "Tutorial praktis membangun aplikasi CLI todo yang dapat dijalankan di Go menggunakan Cobra dan Viper, mencakup command, flag, args, persistent flag, hierarki perintah, konfigurasi, dan pengujian perintah secara in-process."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Alat CLI dengan Go Menggunakan Cobra

## Ringkasan

Anda akan membangun aplikasi CLI todo yang lengkap dan dapat dijalankan (`todo add "beli susu"`, `todo list`) menggunakan framework Cobra dan pustaka konfigurasi Viper. Selama proses ini Anda akan mempelajari cara kerja command, flag, dan argumen, bagaimana persistent flag menyebar melalui hierarki perintah, serta cara menguji perintah secara in-process.

## Target Audiens

- Backend developer dan teknisi perkakas (tooling) yang sudah mahir menulis Go dasar (struct, fungsi, penanganan error).
- Level menengah — nyaman dengan `go mod` dan menjalankan program Go dari terminal.

## Prasyarat

- Go 1.22+ terinstal ([go.dev/dl](https://go.dev/dl)).
- Tidak diperlukan pengalaman Cobra atau Viper sebelumnya — semua dijelaskan dari nol.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membuat struktur CLI dengan root command dan subcommand.
- Mendefinisikan flag, persistent flag, dan argumen posisional dengan validator.
- Menyusun hierarki perintah dan berbagi status antar perintah.
- Memuat konfigurasi YAML dengan Viper, termasuk nilai bawaan dan prioritas flag.
- Menyimpan data ke disk dengan penanganan error yang lengkap.
- Menguji perintah secara in-process menggunakan `SetArgs` dan `SetOut`.

## Konteks dan Motivasi

Alat CLI kecil yang fokus mengotomatiskan bagian repetitif dari setiap alur kerja developer. Cobra adalah framework standar de facto untuk CLI Go — ia menggerakkan `kubectl`, `gh`, `docker`, dan `hugo` — sehingga mempelajarinya langsung berguna pada perkakas dunia nyata. Cobra memberikan struktur pohon perintah, help dan shell completion otomatis, serta parsing flag yang konsisten, sementara Viper menangani konfigurasi dengan urutan prioritas yang jelas: **flag > variabel lingkungan > file konfigurasi > nilai bawaan**.

## Konten Inti

### Command, Flag, dan Argumen

Sebuah `cobra.Command` mendefinisikan satu aksi yang dapat dieksekusi: `Use` adalah namanya, `Short`/`Long` adalah teks help, `Args` memvalidasi argumen posisional, dan `RunE` adalah handler yang mengembalikan `error` — Cobra mencetaknya beserta usage saat nilainya bukan nil, sebab itu `RunE` lebih baik daripada `Run` untuk program sungguhan.

### Persistent Flag dan Hierarki Perintah

`Flags()` menambahkan flag yang hanya milik satu perintah; `PersistentFlags()` diwarisi oleh setiap subcommand — ideal untuk pengaturan bersama seperti lokasi penyimpanan. `AddCommand` membentuk pohon; menjalankan `todo list` membuat Cobra menelusurinya dan meneruskan perintah secara otomatis, dan setiap subcommand membaca variabel persistent flag tersebut.

### Konfigurasi dengan Viper

`cobra.OnInitialize(initConfig)` berjalan setelah flag di-parse tetapi sebelum perintah apa pun dieksekusi — momen yang tepat untuk memuat konfigurasi. Viper membaca `config.yaml` dari direktori aktif dan menerapkan nilai bawaan; karena `--file` sudah terikat ke variabel, ia menang atas file konfigurasi, memberi pengguna cara menimpa pengaturan tanpa mengedit YAML.

### Penanganan Error pada Persistensi

Task disimpan sebagai satu judul per baris dalam file teks. Inti penanganannya: file yang tidak ada adalah store kosong yang valid (jalan pertama), sedangkan setiap kegagalan baca dan tulis dibungkus dengan `fmt.Errorf("%w", err)` agar akar penyebabnya tetap terlihat. Perhatikan kasus tepi: file yang ada tetapi kosong tidak boleh terpecah menjadi satu task kosong yang salah.

## Contoh Kode

Semua blok lengkap dan dapat dijalankan — dua file Go tersebut membentuk satu modul yang bisa langsung dibangun dan diuji. Opsional `config.yaml` (folder yang sama) mengatur `tasks.file` ke path khusus; flag `--file` menimpanya.

### Persiapan Proyek

```bash
mkdir todo-cli && cd todo-cli
go mod init todo-cli
go get github.com/spf13/cobra@latest
go get github.com/spf13/viper@latest
go run . add "beli susu"
```

### todo/main.go — Pohon Perintah, Flag, Konfigurasi, dan Store

```go
package main

import (
    "errors"
    "fmt"
    "os"
    "strings"

    "github.com/spf13/cobra"
    "github.com/spf13/viper"
)

var taskFile string // terikat ke persistent flag --file

// loadTasks membaca satu judul task per baris; file yang tidak ada atau kosong = daftar kosong.
func loadTasks(path string) ([]string, error) {
    data, err := os.ReadFile(path)
    if errors.Is(err, os.ErrNotExist) {
        return nil, nil
    }
    if err != nil {
        return nil, fmt.Errorf("gagal membaca store: %w", err)
    }
    clean := strings.TrimSpace(string(data))
    if clean == "" {
        return nil, nil
    }
    return strings.Split(clean, "\n"), nil
}

func saveTasks(path string, tasks []string) error {
    body := strings.Join(tasks, "\n") + "\n"
    if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
        return fmt.Errorf("gagal menulis store: %w", err)
    }
    return nil
}

func main() {
    if err := newRootCmd().Execute(); err != nil {
        fmt.Fprintln(os.Stderr, "error:", err)
        os.Exit(1)
    }
}

func newRootCmd() *cobra.Command {
    cmd := &cobra.Command{Use: "todo", Short: "CLI todo minimal"}
    cmd.PersistentFlags().StringVar(&taskFile, "file", "", "path ke file task")
    cobra.OnInitialize(initConfig)
    cmd.AddCommand(newAddCmd(), newListCmd())
    return cmd
}

func initConfig() {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath(".")
    viper.SetDefault("tasks.file", "tasks.txt")
    if err := viper.ReadInConfig(); err != nil {
        if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
            fmt.Fprintln(os.Stderr, "peringatan: tidak dapat membaca config:", err)
        }
    }
    if taskFile == "" {
        taskFile = viper.GetString("tasks.file")
    }
}

func newAddCmd() *cobra.Command {
    return &cobra.Command{
        Use:   "add [judul]",
        Short: "Menambahkan task baru",
        Args:  cobra.ExactArgs(1),
        RunE: func(cmd *cobra.Command, args []string) error {
            tasks, err := loadTasks(taskFile)
            if err != nil {
                return err
            }
            tasks = append(tasks, args[0])
            if err := saveTasks(taskFile, tasks); err != nil {
                return err
            }
            fmt.Printf("Task %d ditambahkan: %q\n", len(tasks), args[0])
            return nil
        },
    }
}

func newListCmd() *cobra.Command {
    return &cobra.Command{
        Use:   "list",
        Short: "Menampilkan semua task",
        Args:  cobra.NoArgs,
        RunE: func(cmd *cobra.Command, args []string) error {
            tasks, err := loadTasks(taskFile)
            if err != nil {
                return err
            }
            if len(tasks) == 0 {
                fmt.Println("Belum ada task.")
                return nil
            }
            for i, t := range tasks {
                fmt.Printf("%2d  %s\n", i+1, t)
            }
            return nil
        },
    }
}
```

### todo/main_test.go — Menguji Perintah Secara In-Process

Cobra command hanyalah objek biasa, sehingga pengujian mengeksekusinya langsung: `SetArgs` menyuntikkan argv, `SetOut` menangkap stdout, dan `Execute` menjalankan pipeline parse-dispatch secara penuh. `t.TempDir()` mengisolasi setiap pengujian.

```go
package main

import (
    "bytes"
    "os"
    "path/filepath"
    "strings"
    "testing"
)

func TestAddThenList(t *testing.T) {
    path := filepath.Join(t.TempDir(), "tasks.txt")
    run := func(args ...string) (string, error) {
        var out bytes.Buffer
        root := newRootCmd()
        root.SetOut(&out)
        root.SetArgs(append([]string{"--file", path}, args...))
        return out.String(), root.Execute()
    }
    if out, err := run("add", "tulis dokumentasi"); err != nil {
        t.Fatalf("add gagal: %v", err)
    } else if !strings.Contains(out, "tulis dokumentasi") {
        t.Fatalf("output tidak sesuai: %q", out)
    }
    out, err := run("list")
    if err != nil {
        t.Fatalf("list gagal: %v", err)
    }
    if !strings.Contains(out, "tulis dokumentasi") {
        t.Fatalf("task tidak ada pada list: %q", out)
    }
    if _, err := os.Stat(path); err != nil {
        t.Fatalf("file store tidak ada: %v", err)
    }
}
```

## Insight Penting

- **Gunakan `RunE`, bukan `Run`**: mengembalikan `error` membuat Cobra menampilkan pesan dan kode keluar yang konsisten; `Run` menelan kegagalan.
- **Prioritas Viper**: ikat flag ke variabel terlebih dahulu, lalu biarkan Viper mengisi hanya yang masih kosong — jangan sebaliknya, atau flag akan tertimpa konfigurasi.
- **Validator `Args` mencegah input buruk lebih awal**: `cobra.ExactArgs`, `cobra.NoArgs`, dan `cobra.MinimumNArgs` lebih baik daripada pemeriksaan `len(args)` manual.
- **Bungkus setiap error I/O dengan `%w`** agar pemanggil dapat memakai `errors.Is`/`errors.As` untuk membedakan "file tidak ada" dari kerusakan data sungguhan.
- **Buat `newRootCmd()` tanpa parameter** agar pengujian trivial: buat objeknya, atur args dan output, lalu eksekusi.

## Langkah Berikutnya

- Tambahkan perintah `complete [id]` dengan `cobra.ExactArgs(1)` yang menandai task selesai — latihan yang bagus untuk materi ini.
- Jelajahi shell completion: `rootCmd.CompletionOptions` memberi Anda `todo completion bash` secara gratis.
- Baca panduan resmi [Cobra](https://cobra.dev) dan [README Viper](https://github.com/spf13/viper).

## Kesimpulan

Anda telah membangun CLI todo yang dapat dijalankan dengan Cobra dan Viper: root command dengan persistent flag, subcommand dengan argumen tervalidasi, konfigurasi berbasis YAML, persistensi ke disk dengan penanganan error sungguhan, dan pengujian in-process. Pola yang sama — pohon perintah, flag bersama, prioritas konfigurasi — adalah fondasi CLI produksi seperti `kubectl` dan `gh`.

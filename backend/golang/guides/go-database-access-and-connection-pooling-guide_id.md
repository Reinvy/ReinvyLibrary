---
title: "Panduan Akses Database dan Connection Pooling di Go"
description: "Pola produksi untuk lapisan data Go: menentukan ukuran pool database/sql, menegakkan deadline context, disiplin transaksi, klasifikasi retry, observabilitas pool, dan migrasi skema."
category: "backend"
technology: "golang"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Akses Database dan Connection Pooling di Go

## Pendahuluan

Sebagian besar layanan Go tidak gagal karena logika bisnisnya salah. Layanan gagal karena lapisan data ditulis seolah-olah panggilan database adalah pemanggilan fungsi lokal: `*sql.DB` dibuat ulang per request, query dieksekusi tanpa deadline, transaksi dibiarkan terbuka sementara panggilan HTTP pihak ketiga berjalan di dalamnya, dan batas pool dibiarkan di nilai `0` (tanpa batas) sampai database kehabisan slot koneksi pada pukul tiga pagi.

Panduan ini membahas disiplin operasional yang membuat lapisan data Go tetap dapat diprediksi saat beban tinggi. Fokusnya bukan sintaks SQL, melainkan batas antara proses dan database: berapa banyak koneksi yang ada, berapa lama koneksi hidup, berapa lama sebuah query boleh berjalan, apa yang terjadi ketika database menolak, dan bagaimana Anda mengetahuinya sebelum pengguna merasakannya.

```text
HTTP handler                      context ber-scope request (deadline)
     │
     ▼
lapisan service ──── logika bisnis, tanpa SQL
     │
     ▼
interface repository ──── WithTx(ctx) / Create(ctx) / ByID(ctx)
     │
     ▼
*sql.DB atau pgxpool ──── satu pool bersama per proses, terbatas
     │
     ▼
PostgreSQL ──── statement_timeout, lock_timeout, max_connections
```

Model mental yang perlu dipegang: **`*sql.DB` bukan sebuah koneksi, melainkan pengelola pool.** Setiap method yang diekspos akan mengambil satu koneksi, memakainya, lalu mengembalikannya. Apa pun yang menahan koneksi lebih lama dari yang diperlukan — `*sql.Rows` yang bocor, transaksi yang menunggu panggilan HTTP — akan mengurangi kapasitas bagi seluruh request lain di proses yang sama.

## Praktik Terbaik

### 1. Perlakukan `*sql.DB` sebagai Pool Berumur Panjang, Bukan Objek Per Request

Panggil `sql.Open` sekali saat startup dan suntikkan handle hasilnya. Handle ini aman dipakai bersamaan oleh sejumlah goroutine dan mengelola pool secara internal, sehingga membuatnya per request justru melipatgandakan koneksi idle, menghapus manfaat pemakaian ulang koneksi, dan menambahkan latensi handshake TCP plus TLS pada setiap panggilan.

### 2. Tentukan Ukuran Pool dari Anggaran Koneksi Database

`SetMaxOpenConns(0)` berarti tanpa batas, dan itu kebalikan dari yang Anda butuhkan di produksi. PostgreSQL mengalokasikan satu proses backend per koneksi, sehingga plafonnya adalah `max_connections` di server yang dibagi ke semua replika, runner migrasi, dan setiap orang yang membuka `psql`. Bagi anggarannya, jangan mengalikannya.

```text
terpakai    = max_connections - superuser_reserved_connections - ruang migrasi/ops
per_proses  = terpakai / jumlah_replika

contoh: max_connections = 100, cadangan = 10, replika = 8
per_proses  = floor((100 - 10) / 8) = 11
```

Setel `MaxIdleConns` sama besar (atau mendekati) `MaxOpenConns`. Plafon idle yang lebih kecil membuat koneksi sehat ditutup dan dibuka ulang pada trafik stabil, yang tampak seperti gigi gergaji latensi di dashboard dan pemborosan CPU di database.

### 3. Bawa Deadline pada Setiap Panggilan Database

Setiap query harus menerima `context.Context` yang sudah memiliki deadline atau jalur pembatalan dari pemanggilnya. Tanpa itu, query lambat akan menempati satu koneksi pool sampai koneksi TCP mati — bisa berjalan beberapa menit — dan antrean di belakangnya tumbuh tanpa batas.

```go
ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
defer cancel()

row := db.QueryRowContext(ctx, `SELECT id, total_cents FROM orders WHERE id = $1`, id)
```

### 4. Jaga Transaksi Tetap Pendek dan Bebas I/O Jaringan

Sebuah transaksi menahan satu koneksi pool dan, bergantung pada level isolasi serta pernyataan yang dipakai, mengunci baris yang dibutuhkan transaksi lain. Jangan pernah melakukan panggilan HTTP, menerbitkan pesan ke queue, atau menunggu channel di dalam transaksi yang terbuka. Lakukan I/O eksternalnya dulu, baru buka transaksi, tulis, lalu commit.

### 5. Setel Timeout di Sisi Server sebagai Lapisan Pertahanan Kedua

Deadline aplikasi bersifat imbauan; timeout sisi server bersifat penegakan. `statement_timeout` menghentikan query yang lepas kendali, `lock_timeout` mencegah pernyataan menunggu lock selamanya, dan `idle_in_transaction_session_timeout` membersihkan transaksi yang ditinggalkan proses yang mati. Setel per role agar sesi analisis bisa longgar sementara role aplikasi ketat.

### 6. Klasifikasikan Error sebagai Retryable atau Terminal

Mencoba ulang query tidak valid atau pelanggaran constraint hanya memperbesar masalah. Hanya kegagalan serialisasi (`40001`) dan deadlock (`40P01`) yang layak dicoba ulang, dan itu pun hanya jika seluruh transaksi dapat dijalankan kembali dari awal. Sisanya — `23505` pelanggaran unik, `22P02` input tidak valid, `42P01` tabel tidak ada — harus segera dilaporkan.

### 7. Batch Penulisan Alih-alih Loop Insert Tunggal

Loop berisi 5.000 `INSERT` berarti 5.000 perjalanan bolak-balik dan 5.000 pengambilan koneksi pool. Satu `COPY` atau multi-baris `INSERT ... SELECT * FROM unnest($1, $2, $3)` hanya butuh satu. Untuk pemuatan massal puluhan ribu baris, gunakan `pgx.CopyFrom`; library ini mengalirkan data biner dan secara konsisten mengalahkan SQL yang dirakit sendiri.

### 8. Scan ke Kolom Eksplisit, Jangan Pernah `SELECT *`

`SELECT *` mengikat query pada bentuk tabel saat ini: menambahkan satu kolom nullable akan mematahkan setiap pemanggilan `Scan` yang tidak mengantisipasinya, sementara biaya transfer data tumbuh tanpa disadari. Sebutkan kolom yang benar-benar dibutuhkan, lalu scan ke struct dengan urutan field yang sesuai.

### 9. Pakai Ulang Prepared Statement untuk Bentuk Query yang Berulang

Baik `database/sql` maupun `pgx` mendukung prepared statement. Memakainya ulang menghindari parse ulang SQL yang identik pada setiap panggilan dan menghasilkan plan cache yang stabil di server. Gunakan cache statement milik driver alih-alih memanggil `Prepare` manual di jalur panas, dan ingat bahwa prepared statement terikat pada satu koneksi — pergantian koneksi pool berarti perlu persiapan ulang.

### 10. Ekspor Metrik Pool dan Pasang Alarm pada Saturasi

`db.Stats()` menyediakan angka yang memprediksi gangguan layanan: `OpenConnections`, `InUse`, `Idle`, serta `WaitCount` dan `WaitDuration`. `WaitCount` yang naik sementara `InUse` menyentuh `MaxOpenConns` berarti request sedang mengantre koneksi — gejala paling awal dari query lambat yang memakan pool.

### 11. Versikan Skema dengan Migrasi, Bukan DDL Manual

Setiap perubahan skema harus berada dalam file migrasi bernomor yang di-commit bersama kode yang membutuhkannya. Manusia yang mengetik `ALTER TABLE` di shell produksi menghasilkan skema yang tidak dapat direproduksi di environment lain, dan proses rollback berubah menjadi arkeologi alih-alih satu perintah.

### 12. Pilih Driver Secara Sadar

`database/sql` dengan adapter stdlib `pgx` memberi Anda antarmuka standar, kompatibilitas tooling `database/sql`, dan pool yang mudah dipahami. `pgxpool` native memberi fitur spesifik PostgreSQL (pipelining batch, `COPY`, `LISTEN/NOTIFY`, penanganan tipe yang lebih kaya) dengan konsekuensi keterikatan pada satu database. Pilih satu per service, dan jangan mencampurnya untuk database yang sama.

## Langkah Implementasi

### Langkah 1: Siapkan Pool dengan Batas yang Eksplisit

Buat pool satu kali, dengan batas yang diturunkan dari rumus penentuan ukuran dan masa hidup yang lebih pendek daripada event load balancer atau failover.

```go
package store

import (
    "context"
    "fmt"
    "time"
    "database/sql"

    _ "github.com/jackc/pgx/v5/stdlib"
)

type Config struct {
    DSN             string
    MaxOpenConns    int
    MaxIdleConns    int
    ConnMaxLifetime time.Duration
    ConnMaxIdleTime time.Duration
}

func New(ctx context.Context, cfg Config) (*sql.DB, error) {
    db, err := sql.Open("pgx", cfg.DSN)
    if err != nil {
        return nil, fmt.Errorf("open database: %w", err)
    }

    db.SetMaxOpenConns(cfg.MaxOpenConns)
    db.SetMaxIdleConns(cfg.MaxIdleConns)
    db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
    db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

    pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    if err := db.PingContext(pingCtx); err != nil {
        return nil, fmt.Errorf("ping database: %w", err)
    }
    return db, nil
}
```

Tutup pool dari shutdown hook setelah server HTTP selesai menguras request, agar request yang sedang berjalan selesai sebelum koneksi menghilang.

### Langkah 2: Definisikan Interface Repository yang Sadar Context

Interface adalah kontrak yang menjaga SQL tetap di luar handler. Setiap method menerima context dan menyediakan ruang transaksi yang eksplisit.

```go
package store

import (
    "context"
    "database/sql"
)

type Execer interface {
    ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
    QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
    QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

type Order struct {
    ID         string
    CustomerID string
    TotalCents int64
    Status     string
}

type OrderRepository interface {
    WithTx(ctx context.Context, fn func(ctx context.Context, tx Execer) error) error
    Create(ctx context.Context, order *Order) error
    ByID(ctx context.Context, id string) (*Order, error)
    BulkInsert(ctx context.Context, orders []Order) error
}
```

Mengetikkan transaksi sebagai `Execer` alih-alih `*sql.Tx` membuat callback mudah diuji dengan fake dan mencegahnya memanggil `Commit` atau `Rollback` di luar urutan.

### Langkah 3: Implementasikan Query dengan Kolom Eksplisit

```go
type sqlOrderRepository struct {
    db *sql.DB
}

func (r *sqlOrderRepository) ByID(ctx context.Context, id string) (*Order, error) {
    var order Order
    err := r.db.QueryRowContext(ctx,
        `SELECT id, customer_id, total_cents, status
           FROM orders
          WHERE id = $1`, id,
    ).Scan(&order.ID, &order.CustomerID, &order.TotalCents, &order.Status)

    switch {
    case errors.Is(err, sql.ErrNoRows):
        return nil, ErrOrderNotFound
    case err != nil:
        return nil, fmt.Errorf("select order %s: %w", id, err)
    default:
        return &order, nil
    }
}
```

Bungkus error dengan operasi dan kuncinya. Pembungkusan inilah yang mengubah jejak `pq: canceling statement due to statement timeout` menjadi pesan yang bisa langsung ditindaklanjuti oleh engineer on-call.

### Langkah 4: Bangun Helper Transaksi yang Selalu Rollback

Satu-satunya pola transaksi yang andal adalah `defer` yang melakukan rollback kecuali commit sudah berhasil. `Rollback` setelah `Commit` sukses mengembalikan `sql.ErrTxDone`, dan itu aman diabaikan.

```go
func (r *sqlOrderRepository) WithTx(ctx context.Context, fn func(ctx context.Context, tx Execer) error) error {
    tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
    if err != nil {
        return fmt.Errorf("begin transaction: %w", err)
    }

    committed := false
    defer func() {
        if committed {
            return
        }
        if rbErr := tx.Rollback(); rbErr != nil && !errors.Is(rbErr, sql.ErrTxDone) {
            log.Printf("rollback failed: %v", rbErr)
        }
    }()

    if err := fn(ctx, tx); err != nil {
        return err
    }
    if err := tx.Commit(); err != nil {
        return fmt.Errorf("commit transaction: %w", err)
    }
    committed = true
    return nil
}
```

### Langkah 5: Coba Ulang Hanya untuk Kegagalan Serialisasi dan Deadlock

Bungkus keseluruhan transaksi dalam retry terbatas dengan backoff berjitter, dan berhenti segera saat context selesai.

```go
func isRetryable(err error) bool {
    var pgErr *pgconn.PgError
    if !errors.As(err, &pgErr) {
        return false
    }
    switch pgErr.Code {
    case "40001": // serialization_failure
        return true
    case "40P01": // deadlock_detected
        return true
    default:
        return false
    }
}

func withRetry(ctx context.Context, attempts int, fn func(context.Context) error) error {
    var err error
    for attempt := 1; attempt <= attempts; attempt++ {
        if err = fn(ctx); err == nil || !isRetryable(err) {
            return err
        }
        delay := time.Duration(1<<(attempt-1)) * 25 * time.Millisecond
        select {
        case <-ctx.Done():
            return fmt.Errorf("retry aborted: %w", ctx.Err())
        case <-time.After(delay):
        }
    }
    return fmt.Errorf("gave up after %d attempts: %w", attempts, err)
}
```

Tiga percobaan biasanya cukup; pertumbuhan eksponensial dari 25 ms menjaga total tunggu tetap di dalam deadline request 3 detik yang umum dipakai.

### Langkah 6: Batch Insert dalam Satu Perjalanan Bolak-Balik

Untuk 5.000 baris, turunkan 5.000 perjalanan bolak-balik menjadi satu.

```go
func (r *pgxOrderRepository) BulkInsert(ctx context.Context, orders []Order) error {
    if len(orders) == 0 {
        return nil
    }

    rows := pgx.CopyFromSlice(len(orders), func(i int) ([]any, error) {
        return []any{orders[i].ID, orders[i].CustomerID, orders[i].TotalCents, orders[i].Status}, nil
    })

    _, err := r.pool.CopyFrom(ctx,
        pgx.Identifier{"orders"},
        []string{"id", "customer_id", "total_cents", "status"},
        rows,
    )
    if err != nil {
        return fmt.Errorf("copy %d orders: %w", len(orders), err)
    }
    return nil
}
```

Ketika `COPY` tidak bisa dipakai — misalnya saat insert memerlukan `ON CONFLICT` — gunakan `INSERT` multi-baris yang diisi `unnest` dengan tiga parameter array, bukan menyambung placeholder secara manual.

### Langkah 7: Tambahkan Health Check dan Metrik Pool

```go
func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 1*time.Second)
    defer cancel()

    stats := s.db.Stats()
    if err := s.db.PingContext(ctx); err != nil {
        http.Error(w, "database unreachable", http.StatusServiceUnavailable)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]any{
        "open":       stats.OpenConnections,
        "in_use":     stats.InUse,
        "idle":       stats.Idle,
        "wait_count": stats.WaitCount,
        "wait_ms":    stats.WaitDuration.Milliseconds(),
    })
}
```

Ekspor nilai yang sama ke sistem metrik pada setiap scrape dan pasang alarm ketika `wait_count` naik sementara `in_use` menyentuh batas maksimum yang dikonfigurasi. Kombinasi itu adalah sinyal paling jelas bahwa masalahnya query lambat, bukan volume trafik.

### Langkah 8: Jalankan Migrasi dari CI Sebelum Deploy

Simpan migrasi di dalam repositori dan jalankan sebagai langkah tersendiri, bukan dari startup aplikasi di setiap replika.

```bash
migrate -path ./migrations -database "$DATABASE_URL" up
migrate -path ./migrations -database "$DATABASE_URL" version
```

Buat pipeline gagal jika `version` tidak sesuai dengan revisi yang diharapkan setelah `up`. Untuk deploy tanpa downtime, bagi setiap migrasi menjadi langkah expand (tambah kolom nullable, backfill) dan langkah contract (tambah constraint, hapus kolom lama) yang dikirim pada rilis berikutnya.

### Langkah 9: Uji Beban Lapisan Data dan Verifikasi Perilaku Saturasi

Arahkan generator beban ke endpoint nyata, lalu pantau pool-nya, bukan latensi rata-rata.

```bash
hey -z 60s -c 200 -m GET "http://localhost:8080/orders/01H8Z5T3QK"
```

Selama pengujian, periksa sisi server dari sesi terpisah:

```sql
SELECT state, count(*)
  FROM pg_stat_activity
 WHERE datname = current_database()
 GROUP BY state;
```

Jika koneksi `active` tertahan di plafon pool sementara `WaitCount` terus naik, solusinya adalah query yang lebih cepat atau indeks baru — menaikkan `MaxOpenConns` hanya memindahkan kontensi ke dalam database.

### Langkah 10: Terapkan Pengaman di Sisi PostgreSQL

```sql
ALTER ROLE app_user SET statement_timeout = '5s';
ALTER ROLE app_user SET lock_timeout = '2s';
ALTER ROLE app_user SET idle_in_transaction_session_timeout = '30s';
```

Pastikan batas tersebut benar-benar berlaku untuk role aplikasi, karena `SET` pada scope yang salah tidak melakukan apa pun secara diam-diam:

```sql
SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'app_user';
```

Bersama deadline aplikasi, tiga pengaturan ini membatasi skenario terburuk: query tidak bisa berjalan selamanya, pernyataan tidak bisa menunggu lock selamanya, dan transaksi yang bocor tidak bisa menahan snapshot selamanya.

## Kesimpulan

Lapisan data Go adalah antrean dengan jumlah server tetap, dan setiap keputusan desain menghormati hal itu atau berpura-pura mengabaikannya. Batasi pool dari anggaran koneksi database, beri deadline pada setiap panggilan, jaga transaksi tetap pendek dan bebas I/O jaringan, coba ulang hanya yang benar-benar layak diulang, jadikan penulisan massal satu perjalanan bolak-balik, dan ekspor statistik pool sebelum Anda membutuhkannya. Gejala mengabaikan aturan-aturan ini — lonjakan latensi saat puncak, koneksi habis setelah failover, transaksi yang menahan lock bermenit-menit — semuanya murah dicegah saat desain dan mahal didiagnosis pada pukul tiga pagi.

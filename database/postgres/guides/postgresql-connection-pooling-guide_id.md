---
title: "Panduan Connection Pooling PostgreSQL"
description: "Panduan praktis connection pooling PostgreSQL dengan PgBouncer: mode pooling, perhitungan ukuran pool, anggaran timeout, penanganan prepared statement, dan monitoring produksi."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Connection Pooling PostgreSQL

## Pendahuluan

Setiap koneksi PostgreSQL adalah proses sistem operasi terpisah yang menyimpan memori untuk cache katalog, buffer kerja, dan state sesinya sendiri. Desain ini membuat PostgreSQL stabil dan mudah diprediksi, tetapi juga membuat koneksi menjadi mahal: pada server 8 GB, satu koneksi idle dapat menahan 5–15 MB memori residen, dan server sudah mulai menolak koneksi jauh sebelum mencapai seribu koneksi. Satu service Node.js dengan pool berisi 20 koneksi yang dikalikan 12 pod sudah meminta 240 backend; tambahkan beberapa worker latar belakang, job analitik, dan proses migrasi, maka `max_connections` habis tanpa sisa untuk administrator.

Panduan ini menjelaskan mengapa pooling penting, cara memilih mode pooling PgBouncer, cara menghitung ukuran pool yang sesuai kapasitas database alih-alih ambisi tim, serta cara menjaga timeout, prepared statement, dan monitoring tetap benar di produksi.

## Praktik Terbaik

### 1. Hitung ukuran pool dari kapasitas database, bukan dari konkurensi request

Ukuran pool yang benar adalah fungsi dari berapa banyak query yang benar-benar bisa dieksekusi paralel oleh database, bukan berapa banyak request yang masuk. Mulai dari jumlah core CPU dan tambahkan kelonggaran kecil untuk waktu tunggu I/O:

```text
ukuran_pool_per_instance    = (core_cpu_db * 2) + jumlah_disk_efektif
perkiraan_max_connections   = ukuran_pool_per_instance * jumlah_instance_app + cadangan_admin
```

Untuk database 8 core, hasilnya sekitar 16–20 backend aktif, bukan 200. Antrean panjang di depan database yang sudah jenuh menghasilkan latensi lebih buruk daripada antrean pendek dengan batas keras, karena setiap backend bersaing memperebutkan lock dan buffer yang sama.

### 2. Pilih mode pooling sesuai pola transaksi Anda

`pool_mode` di PgBouncer menentukan kapan koneksi server dikembalikan ke pool:

| Mode | Koneksi dikembalikan | Kompatibel dengan fitur sesi | Penggunaan umum |
| --- | --- | --- | --- |
| `session` | Saat klien terputus | Ya (advisory lock, `SET`, tabel sementara) | Aplikasi lama, ORM yang butuh afinitas sesi |
| `transaction` | Saat `COMMIT` / `ROLLBACK` | Tidak (state sesi bocor antar klien) | Default untuk web service stateless |
| `statement` | Setelah setiap statement | Tidak, dan transaksi multi-statement rusak | Hanya beban read-only autocommit |

`transaction` adalah default yang tepat untuk service HTTP: perilakunya mendekati mode sesi untuk transaksi pendek, sementara jumlah backend mengikuti jumlah transaksi bersamaan, bukan jumlah socket terbuka.

### 3. Perlakukan timeout sebagai anggaran berlapis

Request yang menunggu tanpa batas lebih buruk daripada request yang gagal cepat. Susun timeout sehingga lapisan luar selalu lebih besar dari lapisan dalam, dan pastikan pool klien memiliki batas waktu antrean agar kondisi jenuh muncul sebagai error, bukan sebagai penantian tanpa akhir.

### 4. Matikan prepared statement sisi server kecuali pool mendukungnya

Pada mode `transaction`, statement berurutan dari satu klien dapat mendarat di koneksi server berbeda, sehingga `PREPARE` yang dijalankan sebelumnya belum tentu ada saat `EXECUTE` dieksekusi. Pilih salah satu: matikan statement caching di driver, atau aktifkan dukungan prepared statement tingkat protokol di PgBouncer (`max_prepared_statements`, tersedia sejak versi 1.21).

### 5. Pantau kejenuhan pool, bukan hanya kesehatan database

Metrik database akan tampak sehat sementara klien mengantre menunggu koneksi. Ekspor nilai `SHOW POOLS` dari PgBouncer dan buat alert pada `cl_waiting` serta kenaikan `avg_wait_time`, karena keduanya adalah indikator awal kelaparan pool.

## Langkah Implementasi

### Langkah 1: Konfigurasi PgBouncer

```ini
; /etc/pgbouncer/pgbouncer.ini
[databases]
app = host=10.0.1.20 port=5432 dbname=appdb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction
max_client_conn = 2000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

; Gagal cepat daripada menggantung thread request
query_wait_timeout = 10
server_idle_timeout = 60
client_idle_timeout = 300

; PgBouncer 1.21+: menjaga prepared statement tetap bekerja di mode transaction
max_prepared_statements = 200

ignore_startup_parameters = extra_float_digits,options
```

`default_pool_size` berlaku per pasangan user/database. Dengan 8 pod aplikasi yang masing-masing membuka 20 koneksi klien, PgBouncer memultipleks semuanya menjadi 20 koneksi server — inilah inti dari lapisan ini.

### Langkah 2: Arahkan aplikasi ke pooler

```typescript
import { Pool } from "pg";

// Pool aplikasi sengaja kecil: PgBouncer sudah melakukan multiplexing.
const pool = new Pool({
    host: process.env.PGHOST ?? "pgbouncer.internal",
    port: Number(process.env.PGPORT ?? 6432),
    database: process.env.PGDATABASE ?? "appdb",
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    max: 10,                        // per pod, bukan per klaster
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000, // batas antrean: gagal cepat saat jenuh
    statement_timeout: 15_000,      // batas sisi server untuk satu statement
    application_name: "checkout-api",
});

pool.on("error", (err) => {
    // Error pada klien idle wajib ditangani, jika tidak proses akan crash
    console.error("error tak terduga pada klien idle", err);
});

export async function withTransaction<T>(
    fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
    } finally {
        client.release(); // selalu lepaskan, jangan bergantung pada GC
    }
}
```

### Langkah 3: Verifikasi perilaku pool di bawah beban

```bash
# Pantau antrean secara real-time saat load test berjalan
watch -n1 "psql -h pgbouncer.internal -p 6432 -U stats pgbouncer \
  -c 'SHOW POOLS;' -c 'SHOW STATS;'"

# Pastikan database hanya melihat sedikit backend walau aplikasi membuka banyak klien
psql -h 10.0.1.20 -U postgres -c \
  "SELECT application_name, state, count(*) FROM pg_stat_activity
   GROUP BY 1,2 ORDER BY 3 DESC;"
```

Targetkan `cl_waiting` tetap nol pada beban yang diharapkan. Jika nilainya naik sementara `sv_active` sudah menyentuh `default_pool_size`, pool adalah bottleneck-nya dan menambah koneksi hanya memindahkan antrean ke dalam database.

### Langkah 4: Rilis secara bertahap

Deploy pooler lebih dulu, biarkan koneksi langsung tetap tersedia sebagai jalur cadangan, lalu pindahkan service satu per satu. Setelah itu turunkan `max_connections` di `postgresql.conf` — batas yang kecil dan jujur mencegah satu klien salah konfigurasi menghabiskan kapasitas server.

### Jebakan dan Trade-off

- **Koneksi lebih banyak bukan berarti throughput lebih besar.** Throughput mendatar setelah semua core CPU sibuk; di atas titik itu, backend tambahan hanya menambah kontensi lock dan context switching.
- **State sesi adalah jebakan pada mode transaction.** `SET`, advisory lock, `LISTEN`, tabel sementara, dan cursor tidak bertahan melewati batas transaksi. Setel per transaksi, atau gunakan pool mode `session` khusus untuk beberapa job yang benar-benar membutuhkannya.
- **`query_wait_timeout` adalah keputusan produk.** Terlalu tinggi membuat request timeout di load balancer tanpa pesan berguna; terlalu rendah membuat lonjakan normal ikut gagal. Selaraskan dengan anggaran latensi p99 Anda.
- **Migrasi melewati pooler.** DDL dan `CREATE INDEX CONCURRENTLY` membutuhkan koneksi langsung dan sering kali lock sesi; jalankan di luar jalur pooled.
- **Pantau kedua lapisan.** PgBouncer memberi tahu tekanan sisi klien; `pg_stat_activity` memberi tahu tekanan sisi server. Tidak ada satu pun yang cukup sendirian.

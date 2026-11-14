---
title: "Cheatsheet Pemuatan Data Massal dan Ingestion PostgreSQL"
description: "Referensi cepat untuk COPY, pemuatan sisi klien dengan psql, upsert MERGE dari tabel staging, attach partisi, swap atomik, dan pengaturan sesi yang membuat pemuatan besar selesai cepat."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheatsheet Pemuatan Data Massal dan Ingestion PostgreSQL

Pernyataan `INSERT` satu baris adalah cara paling lambat untuk memindahkan data ke PostgreSQL. Jalur cepatnya adalah `COPY`, yang mengalirkan baris melalui protokol biner tanpa mem-parsing SQL, dan jalur amannya membungkus pemuatan itu dalam tabel staging ditambah `MERGE` atau rename atomik. Referensi ini mengumpulkan perintahnya, mode kegagalannya, dan pengaturan yang menentukan ketika pemuatan diukur dalam jutaan baris.

## Tabel Referensi Cepat

| Tugas | Perintah | Catatan |
|-------|----------|---------|
| Muat file dari mesin Anda | `\copy staging.events FROM 'events.csv' CSV HEADER` | Berjalan di psql, mengalirkan file klien |
| Muat file di server | `COPY staging.events FROM '/bulk/events.csv' CSV HEADER` | Butuh `pg_read_server_files` atau superuser |
| Muat input terkompresi | `COPY staging.events FROM PROGRAM 'zcat /bulk/events.csv.gz' CSV HEADER` | Dekompresi saat proses, tanpa file sementara |
| Muat dari pipe shell | `gunzip -c events.csv.gz > /tmp/e.csv` lalu `\copy staging.events FROM '/tmp/e.csv' CSV` | Meta-command psql tidak bisa membaca pipe |
| Suplai baris dari program | `COPY staging.events FROM STDIN WITH (FORMAT csv)` | Dipasangkan dengan klien streaming |
| Lanjut melewati baris rusak | `COPY staging.events FROM '/bulk/e.csv' WITH (FORMAT csv, ON_ERROR ignore)` | PostgreSQL 17 dan lebih baru |
| Lihat alasan baris gagal | `COPY staging.events FROM '/bulk/e.csv' WITH (FORMAT csv, ON_ERROR ignore, LOG_VERBOSITY verbose)` | Mencatat konteks per baris yang ditolak |
| Lewati WAL untuk tabel baru | `COPY staging.events FROM STDIN WITH (FREEZE)` | Baris terlihat hanya jika tabel dibuat dalam transaksi yang sama |
| Pantau progres langsung | `SELECT * FROM pg_stat_progress_copy;` | `tuples_processed`, `bytes_processed` |
| Upsert dari staging | `MERGE INTO app.accounts t USING staging.accounts s ON t.account_id = s.account_id ...` | PostgreSQL 15 dan lebih baru |
| Muat partisi lalu attach | `ALTER TABLE logs ATTACH PARTITION logs_2026_11 FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');` | Melewati pemindaian validasi bila ada CHECK yang cocok |
| Matikan trigger selama pemuatan | `ALTER TABLE staging.events DISABLE TRIGGER ALL;` | Hanya superuser, aktifkan kembali segera |
| Segarkan statistik planner | `ANALYZE staging.events;` | Tabel yang dimuat tanpa statistik mendapat plan buruk |
| Bandingkan sumber dan target | `SELECT count(*), sum(hashtext(id::text)) FROM staging.events;` | Sidik jari jumlah baris dan kunci yang murah |

## Perintah Umum

### Pemuatan Sisi Klien dengan psql

```bash
# \copy membaca file di mesin yang menjalankan psql, bukan di host database
psql "postgresql://loader@db.internal:5432/appdb" -v ON_ERROR_STOP=1 \
  -c "\copy staging.events (id, occurred_at, actor_id, payload) FROM 'events.csv' CSV HEADER"

# Ekstrak terkompresi tidak perlu didekompresi ke disk
gunzip -c /data/exports/events-2026-11-01.csv.gz \
  | psql "postgresql://loader@db.internal:5432/appdb" -v ON_ERROR_STOP=1 \
      -c "\copy staging.events FROM STDIN WITH (FORMAT csv, HEADER true)"

# Pemuatan yang berjalan satu jam sebaiknya dibungkus agar koneksi terputus terlihat jelas
pg_isready -h db.internal -d appdb || exit 1
```

`\copy` adalah meta-command psql: ia membuka file secara lokal dan mengirim baris melalui jaringan. Ia lebih lambat daripada `COPY` sisi server untuk file sangat besar, tetapi bekerja tanpa akses filesystem di host database — yang biasanya merupakan satu-satunya hal yang diizinkan kredensial produksi.

### Pemuatan Sisi Server dengan COPY

```sql
-- Server membaca path ini sebagai user OS postgres
COPY staging.events FROM '/bulk/events.csv'
  WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"', NULL '', ENCODING 'UTF8');

-- Berikan role tersempit yang memungkinkan hal ini
GRANT pg_read_server_files TO etl_loader;

-- Muat langsung ke daftar kolom, melewati kolom generated
COPY staging.events (id, occurred_at, actor_id, payload)
  FROM '/bulk/events.csv' WITH (FORMAT csv, HEADER true);
```

`PROGRAM` adalah jalan keluar untuk file terkompresi, object storage yang di-mount sebagai path, atau skrip pra-proses:

```sql
COPY staging.events FROM PROGRAM 'curl -s https://exports.internal/events.csv.gz | zcat'
  WITH (FORMAT csv, HEADER true);
```

Apa pun yang dijalankan `PROGRAM` dieksekusi sebagai user server database, jadi jaga perintahnya statis dan jangan pernah menyisipkan input tak tepercaya ke dalamnya.

### Memantau dan Memulihkan Pemuatan yang Berjalan

```sql
-- View progres: satu baris per COPY yang sedang berjalan
SELECT pid,
       relid::regclass AS target,
       command,
       type,
       bytes_processed,
       tuples_processed,
       tuples_excluded
FROM pg_stat_progress_copy;

-- Temukan pemuatan yang tertahan lock
SELECT a.pid, a.wait_event_type, a.wait_event, a.query
FROM pg_stat_activity a
WHERE a.query ILIKE 'COPY%';
```

PostgreSQL 17 memungkinkan pemuatan melewati baris rusak alih-alih membatalkan seluruh pernyataan:

```sql
COPY staging.events FROM '/bulk/events.csv'
  WITH (FORMAT csv, HEADER true, ON_ERROR ignore, LOG_VERBOSITY verbose);
```

Baris yang ditolak dicatat beserta konteks barisnya dan pernyataan tetap selesai, melaporkan berapa baris yang gagal. Selalu pasangkan dengan rekonsiliasi jumlah baris — baris yang hilang tanpa suara adalah bug ingestion klasik.

### Upsert Baris yang Dimuat dengan MERGE

```sql
MERGE INTO app.accounts AS t
USING staging.accounts AS s
   ON t.account_id = s.account_id
WHEN MATCHED AND s.updated_at > t.updated_at THEN
  UPDATE SET balance = s.balance,
             updated_at = s.updated_at
WHEN NOT MATCHED THEN
  INSERT (account_id, balance, updated_at)
  VALUES (s.account_id, s.balance, s.updated_at);

-- MERGE hanya melihat baris yang sudah commit; tabel staging harus
-- terisi (dan sudah ANALYZE) sebelum ini dijalankan.
ANALYZE staging.accounts;
```

### Ingestion yang Sadar Partisi

```sql
-- Bangun partisi di luar tabel terpartisi, muat secara terisolasi,
-- lalu attach: attach menjadi perubahan katalog alih-alih rewrite
CREATE TABLE logs_2026_11 (
  LIKE logs INCLUDING DEFAULTS INCLUDING CONSTRAINTS
);

COPY logs_2026_11 FROM '/bulk/logs-2026-11.csv' WITH (FORMAT csv, HEADER true);
ANALYZE logs_2026_11;

ALTER TABLE logs ATTACH PARTITION logs_2026_11
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
```

Ketika tabel baru membawa constraint `CHECK` yang mencerminkan batas partisi, `ATTACH PARTITION` melewati pemindaian penuh dan selesai seketika pada tabel besar.

## Potongan Kode

### Pipeline Tabel Staging Plus Merge

```bash
#!/usr/bin/env bash
set -euo pipefail

DSN="postgresql://loader@db.internal:5432/appdb"
FILE="${1:?usage: ingest.sh <csv>}"

psql "$DSN" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
CREATE TEMP TABLE events_stage (LIKE staging.events INCLUDING DEFAULTS) ON COMMIT DROP;
SQL

psql "$DSN" -v ON_ERROR_STOP=1 -c "\copy events_stage FROM '$FILE' WITH (FORMAT csv, HEADER true)"

psql "$DSN" -v ON_ERROR_STOP=1 <<'SQL'
MERGE INTO staging.events AS t
USING (SELECT DISTINCT ON (id) * FROM events_stage ORDER BY id, occurred_at DESC) AS s
   ON t.id = s.id
WHEN MATCHED THEN
  UPDATE SET occurred_at = s.occurred_at, actor_id = s.actor_id, payload = s.payload
WHEN NOT MATCHED THEN
  INSERT (id, occurred_at, actor_id, payload)
  VALUES (s.id, s.occurred_at, s.actor_id, s.payload);
ANALYZE staging.events;
SQL
```

Tabel temporary menjaga baris staging keluar dari jalur WAL di luar sesi, dan `DISTINCT ON` merangkum kunci duplikat sehingga `MERGE` tidak pernah terkena error "cannot affect row a second time".

### Swap Atomik untuk Penyegaran Referensi Penuh

```sql
BEGIN;

CREATE TABLE ref_countries_new (LIKE ref_countries INCLUDING ALL);
COPY ref_countries_new FROM '/bulk/countries.csv' WITH (FORMAT csv, HEADER true);

-- LIKE tidak menyalin index; buat ulang sebelum swap agar tabel
-- tidak pernah aktif tanpa kunci uniknya
CREATE UNIQUE INDEX ref_countries_new_iso2_key ON ref_countries_new (iso2);

ANALYZE ref_countries_new;

ALTER TABLE ref_countries RENAME TO ref_countries_old;
ALTER TABLE ref_countries_new RENAME TO ref_countries;

COMMIT;

DROP TABLE ref_countries_old;
```

Pembaca hanya melihat tabel lama atau tabel baru, tidak pernah campuran setengah termuat. View dan foreign key harus diperiksa sebelum memakai pola ini — me-rename tabel yang menjadi target FK berarti FK mengikuti tabel lama.

### Tuning Sesi untuk Jendela Pemuatan

```sql
BEGIN;

-- Pemeliharaan index adalah biaya dominan saat memuat ke tabel ber-index
SET LOCAL maintenance_work_mem = '2GB';

-- Commit terbaru bisa hilang jika crash dalam jendela ini; tabel staging
-- dapat dibangun ulang, jadi pertukarannya disengaja
SET LOCAL synchronous_commit = off;

-- Jejak WAL lebih kecil untuk baris yang berulang
SET LOCAL wal_compression = on;

COPY staging.events FROM '/bulk/events-2026-11.csv' WITH (FORMAT csv, HEADER true);

COMMIT;

ANALYZE staging.events;
```

Keuntungan yang lebih besar untuk pemuatan besar biasanya adalah menghapus index, memuat, lalu membangunnya kembali: tiga lintasan atas tabel membangun B-tree jauh lebih cepat daripada sejuta insert individual ke index yang sudah ada.

```sql
DROP INDEX IF EXISTS staging.events_actor_idx;
COPY staging.events FROM '/bulk/events-2026-11.csv' WITH (FORMAT csv, HEADER true);
CREATE INDEX events_actor_idx ON staging.events (actor_id);
```

### Pemuatan File Paralel

```bash
# Pecah ekstrak besar, lalu muat pecahannya secara bersamaan.
# Jaga paralelisme pada atau di bawah jumlah jalur tulis yang bisa
# ditanggung storage; worker lebih banyak hanya menambah kontensi.
split -l 500000 -d --additional-suffix=.csv /data/events.csv /data/events-part-

ls /data/events-part-*.csv | xargs -P 4 -I{} sh -c \
  'psql "postgresql://loader@db.internal:5432/appdb" -v ON_ERROR_STOP=1 \
     -c "\copy staging.events FROM STDIN WITH (FORMAT csv, HEADER true)" < "{}"'
```

### Memverifikasi Pemuatan yang Selesai

```sql
-- Jumlah baris dan sidik jari murah; bandingkan keduanya dengan ekstrak
SELECT count(*)                                   AS rows_loaded,
       count(*) FILTER (WHERE id IS NULL)         AS missing_keys,
       count(DISTINCT id)                         AS distinct_keys,
       sum(hashtext(id::text))                    AS key_fingerprint
FROM staging.events;

-- Pemeriksaan kewajaran rentang: jendela pemuatan harus cocok dengan rentang tanggal file
SELECT min(occurred_at), max(occurred_at) FROM staging.events;

-- Segarkan statistik sebelum ada yang membaca tabel
ANALYZE staging.events;
```

Ketidakcocokan sidik jari hampir selalu berarti salah satu dari tiga hal: file terpotong, flag `HEADER` terlewat sehingga baris pertama diparse sebagai data, atau pemuatan dengan `ON_ERROR ignore` yang diam-diam membuang baris.

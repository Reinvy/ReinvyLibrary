---
title: "Panduan Migrasi Skema PostgreSQL Tanpa Downtime"
description: "Panduan praktis mengembangkan skema PostgreSQL pada sistem live — DDL yang sadar lock, pembuatan indeks secara concurrent, constraint NOT VALID, backfill bertahap, perubahan kolom dengan pola expand-contract, dan penulisan ulang tabel secara online dengan pg_repack."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Migrasi Skema PostgreSQL Tanpa Downtime

## Pendahuluan

Hampir setiap gangguan produksi yang dituduhkan pada "database-nya lambat" dapat ditelusuri kembali ke perubahan skema. PostgreSQL melindungi struktur tabel dengan satu lock kelas berat — `ACCESS EXCLUSIVE` — dan lock tersebut tidak peduli apakah perubahan Anda berlangsung satu milidetik atau sepuluh menit: selama lock dipegang, setiap baca dan tulis pada tabel itu menunggu. Lebih buruk lagi, PostgreSQL mengantre lock secara berurutan, sehingga satu migrasi lambat tidak hanya memblokir tabel, tetapi juga membangun antrean query aplikasi biasa di belakangnya sampai connection pool habis.

Migrasi tanpa downtime adalah disiplin merancang setiap perubahan skema agar:

- hanya memegang lock kelas berat selama milidetik, tidak pernah selama durasi scan atau penulisan ulang;
- tidak pernah memicu penulisan ulang tabel penuh atau pembangunan ulang indeks penuh pada tabel sibuk;
- dapat di-deploy sementara versi aplikasi sebelumnya masih berjalan, dan dapat di-rollback tanpa migrasi data.

Batasan terakhir inilah yang sering dilupakan tim. Migrasi bukan "file SQL yang dijalankan saat deploy" — melainkan rangkaian langkah yang tersebar di beberapa rilis aplikasi, masing-masing aman jika dijalankan sendiri. Pola yang memungkinkan hal ini disebut **expand-contract** (juga dikenal sebagai parallel change): tambahkan bentuk baru di samping yang lama, pindahkan trafik secara bertahap, lalu hapus bentuk lama setelah tidak ada yang membacanya. Karena setiap keadaan antara valid untuk kode lama maupun baru, Anda dapat melakukan deploy, verifikasi, jeda, atau rollback pada titik mana pun.

Model mental yang paling berguna adalah antrean lock. Perhatikan query analitik lima menit dan migrasi yang hanya menyentuh katalog:

```text
Waktu ────────────────────────────────────────────────────────────▶

Klien A (query analitik)   : |==================================|  5 menit
Klien B (ALTER TABLE)      :      x  menunggu ACCESS EXCLUSIVE
Klien C (tulis web)        :        x  mengantre di belakang B
Klien D (baca web)         :          x  mengantre di belakang B
Klien E (health check)     :            x  mengantre di belakang B → timeout

                                 ^
                                 B tidak memegang lock data yang bisa dipakai —
                                 namun setiap query setelahnya mengantre di B.
```

Migrasinya cepat. *Gangguan*-nya berasal dari penghalang yang dibuatnya. Setiap teknik dalam panduan ini ada untuk menjaga penghalang itu tetap singkat: jalankan DDL dengan `lock_timeout` agar gagal cepat alih-alih mengantre, hindari penulisan ulang sepenuhnya, dan pindahkan pekerjaan data berat ke batch yang tidak memegang lock pemblokir sama sekali.

Panduan ini mencakup PostgreSQL 11 hingga 17; kemampuan spesifik versi disebutkan di tempat yang relevan (terutama jalur cepat `ADD COLUMN ... DEFAULT` dan `SET NOT NULL` yang ditambahkan pada versi 11 dan 12).

## Praktik Terbaik

### 1. Jangan Pernah Mencampur Perubahan Skema dan Data dalam Satu Transaksi

Migrasi yang menambahkan kolom, mengisi dua juta baris, lalu menambahkan constraint berjalan sebagai satu transaksi yang memegang lock pada tabel selama seluruh proses backfill. Pisahkan: perubahan skema lebih dulu (cepat, hitungan detik), backfill kemudian (bertahap, inkremental, tanpa lock pemblokir), constraint terakhir dengan `NOT VALID` lalu `VALIDATE`. Setiap fase dapat di-deploy dan diamati secara mandiri.

### 2. Tetapkan `lock_timeout` pada Setiap Sesi Migrasi

Migrasi paling mematikan adalah migrasi yang *seharusnya* cepat jika tidak ada hal lain yang berjalan. Migrasi yang menunggu lock secara diam-diam tidak dapat dibedakan dari gangguan yang sedang berlangsung. Tetapkan `lock_timeout` beberapa ratus milidetik agar pernyataan langsung gagal jika tabel sedang sibuk; coba lagi sesaat kemudian. Gagal cepat adalah fitur.

### 3. Bangun Indeks Secara Concurrent, Selalu

`CREATE INDEX` mengambil lock `SHARE` yang memblokir semua penulisan selama seluruh proses pembangunan. Pada tabel dengan sepuluh juta baris, itu berarti beberapa menit penolakan insert. `CREATE INDEX CONCURRENTLY` membangun dalam dua tahap tanpa memblokir penulisan, dengan konsekuensi lebih lambat dan tidak dapat dijalankan di dalam transaksi. Pada tabel yang menerima penulisan, tidak ada alasan memakai bentuk pemblokir.

### 4. Tambahkan Check Constraint sebagai `NOT VALID` Lebih Dulu

`ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)` memvalidasi setiap baris yang ada sambil memegang lock `ACCESS EXCLUSIVE`. Menambahkannya dengan `NOT VALID` selesai dalam milidetik: baris baru tetap diperiksa, baris lama tidak dipindai. `VALIDATE CONSTRAINT` di kemudian hari melakukan scan di bawah lock `SHARE UPDATE EXCLUSIVE` yang jauh lebih lemah dan tidak memblokir baca maupun tulis.

### 5. Lakukan Backfill Secara Bertahap dengan Transaksi Terbatas

Satu `UPDATE` atas seluruh tabel memegang row lock pada setiap baris yang tersentuh, membuat tabel bengkak (bloat), dan dapat membanjiri replikasi. Lakukan backfill dalam potongan beberapa ribu baris, commit di antaranya. Setiap batch singkat, autovacuum dapat mengikuti, dan standby tidak pernah tertinggal lebih dari sesaat. Selalu sertakan `LIMIT` dan kunci pengurutan, dan buat loop batch idempoten agar percobaan ulang tidak berbahaya.

### 6. Ikuti Pola Expand-Contract untuk Rename, Drop, dan Perubahan Tipe

Kode aplikasi dan skema database di-deploy pada waktu yang berbeda, dan selama jendela itu kedua versi aktif. Mengganti nama kolom merusak kode lama; menghapusnya juga. Sebagai gantinya: tambahkan kolom baru, tulis ke keduanya, lakukan backfill, alihkan pembacaan, hentikan penulisan ke kolom lama, lalu hapus satu rilis kemudian. Penalaran yang sama berlaku untuk memecah tabel, mengubah tipe, dan menormalisasi JSON blob menjadi kolom.

### 7. Gunakan `pg_repack` Saat Penulisan Ulang Tak Terhindarkan

Beberapa perubahan memang memerlukan penulisan ulang tabel: mengubah tipe kolom dengan cara yang tidak kompatibel secara biner, menyusun ulang kolom, atau mereklaim ruang setelah penghapusan besar. `pg_repack` melakukan penulisan ulang ke tabel fisik baru menggunakan trigger (atau pendekatan berbasis logical replication pada mode yang lebih baru) sementara tabel asli tetap sepenuhnya dapat ditulis, lalu menukar keduanya dalam transaksi `ACCESS EXCLUSIVE` singkat. Simpan alat ini untuk perubahan yang tidak punya jalur khusus katalog.

### 8. Buat Setiap Migrasi Kompatibel Mundur untuk Satu Rilis

Migrasi hanya aman jika kode yang sedang di-deploy tetap berfungsi setelah migrasi dijalankan. Artinya: tidak ada drop pada rilis yang sama saat berhenti memakainya, tidak ada `NOT NULL` sebelum setiap penulis menyediakan nilai, tidak ada kolom yang diganti nama sebelum pembaca terakhir hilang. Simpan buffer satu rilis — biayanya sedikit beban mati, manfaatnya adalah deploy apa pun dapat di-rollback tanpa perubahan database.

### 9. Uji Migrasi terhadap Data Berukuran Produksi

Migrasi yang memakan 40 milidetik di laptop pengembang dengan 5.000 baris dapat memakan 40 menit pada 50 juta baris — skalanya tidak linear begitu tabel indeks, tabel TOAST, dan pembangkitan WAL terlibat. Pulihkan snapshot produksi terbaru ke staging, jalankan migrasi di sana dengan konkurensi menyerupai produksi, dan ukur penantian lock dengan `pg_locks`. Perlakukan durasi migrasi sebagai kriteria rilis.

### 10. Pantau Lock, WAL, dan Replikasi Sepanjang Rollout

Jalankan migrasi dengan operator yang mengawasi tiga sinyal: jumlah query yang terblokir (`pg_locks` yang di-join ke `pg_stat_activity`), lag replikasi pada standby, dan bloat tabel akibat backfill. Jika sesi pemblokir muncul, Anda ingin menghentikannya secara sengaja alih-alih menemukannya lewat timeout aplikasi. Otomatiskan pembatalan: jika penantian lock melampaui ambang, batalkan migrasi dan kembalikan.

### 11. Versikan Migrasi di Git dan Terapkan Tepat Sekali

Gunakan alat migrasi (Flyway, Liquibase, Alembic, `dbmate`, `golang-migrate`, atau runner buatan sendiri dengan ledger `schema_migrations`) alih-alih mengeksekusi SQL secara manual. Catat checksum setiap migrasi sehingga file yang diedit terdeteksi alih-alih dilewati diam-diam, dan pastikan runner mengambil advisory lock agar dua worker deploy tidak berlomba menjalankan migrasi yang sama.

## Langkah Implementasi

### Langkah 1: Bangun Ledger dan Runner Migrasi

Ledger inilah yang membuat migrasi dapat diulang. Simpan skema khusus untuknya, terpisah dari data aplikasi, dan catat cukup metadata untuk men-debug rollout yang gagal setelah kejadian.

```sql
CREATE SCHEMA IF NOT EXISTS migration;

CREATE TABLE IF NOT EXISTS migration.schema_migrations (
  version        text        PRIMARY KEY,
  description    text        NOT NULL,
  checksum       text        NOT NULL,
  applied_at     timestamptz NOT NULL DEFAULT now(),
  execution_ms   integer     NOT NULL,
  applied_by     text        NOT NULL DEFAULT current_user
);

-- Serialkan deploy: hanya satu migrasi yang boleh berjalan per database.
-- 0x5F1A9C3D adalah kunci arbitrer spesifik aplikasi.
SELECT pg_advisory_lock(0x5F1A9C3D);
```

Setiap migrasi berjalan di dalam advisory lock ini. Jika dua worker deployment mulai bersamaan, worker kedua akan memblokir alih-alih berlomba dengan yang pertama, dan primary key pada ledger menangkap versi duplikat yang tetap lolos.

### Langkah 2: Bungkus Setiap Migrasi dalam Sesi yang Sadar Lock

Jangan pernah membiarkan migrasi duduk menunggu lock. `lock_timeout` yang singkat membuat migrasi terblokir gagal dengan jelas dalam waktu kurang dari satu detik, dan `statement_timeout` membatasi total pekerjaan agar `UPDATE` yang lepas kendali tidak menempati koneksi tanpa batas.

```sql
BEGIN;

-- Gagal daripada mengantre: 750ms cukup untuk perubahan khusus katalog.
SET LOCAL lock_timeout = '750ms';
SET LOCAL statement_timeout = '5s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

ALTER TABLE app.orders ADD COLUMN IF NOT EXISTS channel text;

INSERT INTO migration.schema_migrations (version, description, checksum, execution_ms)
VALUES ('2026_10_15_0001', 'add orders.channel', 'sha256:…', 0);

COMMIT;
```

Tempatkan logika percobaan ulang di runner, bukan di SQL: menangkap `55P03` (`lock_not_available`) lalu mencoba lagi dengan backoff berjitter jauh lebih aman daripada menaikkan timeout, karena menaikkannya akan memunculkan kembali antrean lock yang justru ingin dicegah.

```python
import time, random, psycopg

LOCK_NOT_AVAILABLE = "55P03"

def apply_with_retry(conn, sql, attempts=8, base_delay=0.25):
    for attempt in range(attempts):
        try:
            with conn.transaction():
                conn.execute(sql)
            return
        except psycopg.errors.LockNotAvailable:
            if attempt == attempts - 1:
                raise
            # Backoff eksponensial dengan jitter agar deploy paralel tidak bertabrakan.
            time.sleep(base_delay * (2 ** attempt) + random.uniform(0, 0.2))
```

### Langkah 3: Tambahkan Kolom Tanpa Menulis Ulang Tabel

Menambahkan kolom nullable adalah operasi khusus katalog. Menambahkan kolom dengan default konstan juga khusus katalog pada PostgreSQL 11 dan setelahnya, karena default disimpan sekali di `pg_attribute` dan dimaterialkan saat dibaca. Pada PostgreSQL 10 dan sebelumnya, pernyataan yang sama menulis ulang seluruh tabel — periksa versi server sebelum berasumsi.

```sql
-- Cepat pada PostgreSQL 11+: khusus katalog, milidetik berapa pun jumlah baris.
ALTER TABLE app.orders
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'web';

-- Lambat di semua versi: default volatile tidak bisa disimpan di katalog,
-- jadi PostgreSQL harus mengevaluasinya untuk setiap baris yang ada.
ALTER TABLE app.orders
  ADD COLUMN IF NOT EXISTS created_bucket uuid DEFAULT gen_random_uuid();
```

Untuk kasus default volatile, gunakan jalur expand-contract: tambahkan kolom tanpa default, lakukan backfill bertahap, lalu pasang default hanya untuk baris baru.

### Langkah 4: Bangun dan Hapus Indeks Secara Concurrent

`CREATE INDEX CONCURRENTLY` melakukan dua pemindaian tabel dan dua penantian singkat, bukan satu pembangunan pemblokir yang panjang. Dua aturan penting: perintah ini tidak dapat berjalan di dalam blok transaksi, dan jika gagal akan meninggalkan indeks `INVALID` yang tetap membebani penulisan dan harus dihapus lalu dibangun ulang.

```sql
-- Jalankan di luar transaksi (tanpa BEGIN/COMMIT). Penulisan tetap berjalan.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_channel_created
  ON app.orders (channel, created_at DESC);

-- Pembangunan concurrent yang gagal meninggalkan indeks yang ada tapi tak terpakai.
SELECT c.relname, i.indisvalid, i.indisready
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
WHERE NOT i.indisvalid;

-- Bersihkan sebelum mencoba ulang — indeks rusak tetap membebani setiap penulisan.
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_channel_created;
```

Menghapus indeks bersifat khusus katalog dan cepat, tetapi tetap memerlukan lock; gunakan `DROP INDEX CONCURRENTLY` pada tabel sibuk agar tidak menunggu di belakang query panjang. Satu catatan: pembangunan secara concurrent menghasilkan WAL lebih banyak dan total lebih lama, jadi jadwalkan pada jendela trafik rendah meskipun tidak memblokir.

### Langkah 5: Lakukan Backfill dalam Batch Terbatas

Loop batch adalah tempat sebagian besar gangguan tak sengaja terjadi. Paginasi keyset pada kunci yang stabil, `LIMIT`, dan commit per batch menjaga setiap transaksi tetap singkat serta memberi ruang bagi autovacuum dan replikasi.

```sql
-- Satu batch. Ulangi hingga UPDATE melaporkan 0 baris.
-- Paginasi keyset (id > $last_id) menghindari biaya O(n^2) dari OFFSET.
WITH batch AS (
  SELECT id
  FROM app.orders
  WHERE channel IS NULL
  ORDER BY id
  LIMIT 5000
  FOR UPDATE SKIP LOCKED
)
UPDATE app.orders o
SET channel = 'web'
FROM batch
WHERE o.id = batch.id;
```

```bash
# Jalankan loop dari shell selama jendela rollout.
# Jeda 200ms antar batch membatasi pembangkitan WAL pada standby.
last_id=0
while true; do
  updated=$(psql -At -c "WITH batch AS (
      SELECT id FROM app.orders
      WHERE id > ${last_id} AND channel IS NULL
      ORDER BY id LIMIT 5000 FOR UPDATE SKIP LOCKED
    )
    UPDATE app.orders o SET channel = 'web'
    FROM batch WHERE o.id = batch.id
    RETURNING 1" | wc -l)
  echo "batch updated=${updated}"
  [ "$updated" -eq 0 ] && break
  last_id=$(psql -At -c "SELECT COALESCE(max(id), 0) FROM app.orders WHERE channel IS NOT NULL")
  sleep 0.2
done
```

Tambahkan jeda singkat antar batch dan pantau lag replika selama proses berjalan. Jika lag bertambah, perbesar jeda alih-alih ukuran batch — total throughput tidak sepenting menjaga standby tetap terkini.

### Langkah 6: Pasang Constraint sebagai `NOT VALID`, Lalu Validasi

Menambahkan check constraint dengan cara naif memindai tabel di bawah `ACCESS EXCLUSIVE`. Bagi menjadi dua tahap agar bagian yang mahal berjalan di bawah lock yang mengizinkan baca dan tulis.

```sql
-- Fase 1: milidetik. Berlaku hanya untuk baris baru; tanpa scan, tanpa lock panjang.
ALTER TABLE app.orders
  ADD CONSTRAINT orders_channel_known
  CHECK (channel IN ('web', 'ios', 'android', 'partner')) NOT VALID;

-- Fase 2: memindai baris yang ada di bawah SHARE UPDATE EXCLUSIVE.
-- Baca dan tulis tetap berjalan normal selama seluruh pemindaian.
ALTER TABLE app.orders VALIDATE CONSTRAINT orders_channel_known;
```

Validasi bersifat idempoten dan dapat dilanjutkan dengan percobaan ulang: jika dibatalkan, constraint hanya tetap `NOT VALID` dan aplikasi tidak terpengaruh. Query `pg_constraint.convalidated` untuk memastikan statusnya sebelum melanjutkan ke langkah berikutnya.

### Langkah 7: Tegakkan `NOT NULL` Tanpa Lock Panjang

`ALTER COLUMN ... SET NOT NULL` memerlukan pemindaian tabel penuh di bawah `ACCESS EXCLUSIVE` — kecuali ada constraint `CHECK` yang sudah tervalidasi dan membuktikan tidak ada NULL, sehingga PostgreSQL 12 dan setelahnya melewati pemindaian sepenuhnya. Itulah triknya: buat check `NOT VALID`, validasikan, lalu set `NOT NULL`, lalu hapus check yang sudah tidak diperlukan.

```sql
-- 1. Murah: tanpa scan.
ALTER TABLE app.orders
  ADD CONSTRAINT orders_channel_not_null CHECK (channel IS NOT NULL) NOT VALID;

-- 2. Pindai di bawah lock lemah; tabel tetap dapat ditulis.
ALTER TABLE app.orders VALIDATE CONSTRAINT orders_channel_not_null;

-- 3. PostgreSQL 12+ melihat bukti tervalidasi dan melewati pemindaiannya sendiri.
ALTER TABLE app.orders ALTER COLUMN channel SET NOT NULL;

-- 4. Bukti sudah selesai tugasnya; hapus check tersebut.
ALTER TABLE app.orders DROP CONSTRAINT orders_channel_not_null;

-- 5. Pasang default untuk insert berikutnya (khusus katalog).
ALTER TABLE app.orders ALTER COLUMN channel SET DEFAULT 'web';
```

Verifikasi bahwa jalur cepat benar-benar dipakai dengan mengamati durasi migrasi — jika langkah 3 memakan waktu beberapa detik pada tabel besar, buktinya tidak dikenali (biasanya karena check constraint hilang atau dibuat dengan ekspresi berbeda) dan pemindaian tetap berjalan.

### Langkah 8: Lakukan Penulisan Ulang Tabel Online dengan pg_repack

Untuk perubahan tanpa jalur khusus katalog — mengubah tipe kolom secara tidak kompatibel, mengubah penyimpanan, atau mereklaim ruang setelah penghapusan massal — `pg_repack` menulis ulang tabel secara online.

```bash
# instalasi: apt-get install postgresql-17-repack  (atau versi yang sesuai)
# Memerlukan ekstensi pg_repack di database target.
psql -c "CREATE EXTENSION IF NOT EXISTS pg_repack"

# Bangun ulang satu tabel yang bengkak, secara online. Penulisan tetap berjalan;
# penukaran akhir mengambil lock ACCESS EXCLUSIVE hanya beberapa milidetik.
pg_repack --dbname app_production \
          --table app.orders \
          --jobs 4 \
          --wait-timeout 60 \
          --echo
```

`--wait-timeout` adalah katup pengaman: alih-alih mengantre di belakang query panjang saat penukaran, `pg_repack` menyerah dan dapat dicoba lagi nanti. Tentukan `--jobs` secara konservatif pada database primer — setiap job adalah worker paralel yang menghasilkan WAL yang harus diputar ulang oleh standby.

### Langkah 9: Selesaikan Penggantian Nama Kolom dengan Expand-Contract

Rename adalah masalah kompatibilitas mundur yang paling klasik: begitu kolom diganti nama, kode yang di-deploy sebelum perubahan akan gagal. Sebarkan rename ke empat rilis agar setiap keadaan kompatibel dengan apa yang sedang berjalan.

```sql
-- Rilis 1 (EXPAND): tambahkan kolom baru. Kode lama tetap memakai yang lama.
SET LOCAL lock_timeout = '750ms';
ALTER TABLE app.orders ADD COLUMN IF NOT EXISTS fulfilment_status text;

-- Backfill dari kolom lama secara bertahap (lihat Langkah 5).
-- Rilis 2 (DUAL-WRITE): aplikasi menulis ke kedua kolom; pembacaan masih memakai yang lama.
CREATE OR REPLACE VIEW app.orders_compat AS
  SELECT o.*, COALESCE(o.fulfilment_status, o.status) AS effective_status
  FROM app.orders o;

-- Rilis 3 (ALIHKAN PEMBACAAN): aplikasi membaca kolom baru.
-- Rilis 4 (CONTRACT): hentikan penulisan ke kolom lama, lalu hapus.
ALTER TABLE app.orders DROP COLUMN IF EXISTS status;
```

Pertahankan view kompatibilitas selama rilis 2 dan 3 agar konsumen hanya-baca (dashboard, job analitik, layanan berbasis replika) dapat bermigrasi sesuai jadwalnya sendiri alih-alih harus seirama dengan deploy aplikasi.

### Langkah 10: Verifikasi Hasil dan Otomatiskan Pipeline

Migrasi belum selesai sampai skema, constraint, dan statistik planner semuanya konsisten — dan pemeriksaannya harus ada di pipeline deployment, bukan di ingatan seorang engineer.

```sql
-- Pastikan tidak ada pekerjaan setengah jadi yang tersisa setelah rollout.
SELECT c.relname, i.indisvalid
FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
WHERE NOT i.indisvalid;

SELECT conname, convalidated
FROM pg_constraint
WHERE conrelid = 'app.orders'::regclass AND NOT convalidated;

-- Kolom baru memerlukan statistik, jika tidak planner akan menebak dengan buruk.
ANALYZE app.orders;

-- Pastikan indeks baru benar-benar dipakai.
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, channel FROM app.orders
WHERE channel = 'ios' ORDER BY created_at DESC LIMIT 50;
```

```bash
# Gate pipeline: jalankan pemeriksaan yang sama sebelum menaikkan deploy,
# dan gagalkan build jika masih ada ketidakvalidan.
psql -At -f sql/verify_schema.sql | tee /tmp/verify.out
if grep -q "INVALID\|NOT_VALIDATED" /tmp/verify.out; then
  echo "Verifikasi skema gagal — memblokir deploy" >&2
  exit 1
fi
```

Dua aturan pipeline lain langsung membayar dirinya sendiri. Pertama, jalankan migrasi sebagai job terpisah *sebelum* deploy aplikasi, jangan pernah di dalam jalur start-up aplikasi — jika tidak, migrasi lambat akan menahan setiap pod baru. Kedua, pertahankan setiap migrasi kompatibel mundur tepat untuk satu rilis, dan tambahkan aturan lint (atau item checklist reviewer) yang menolak `ALTER TABLE ... DROP COLUMN` dan `SET NOT NULL` pada rilis yang sama dengan pengenalan penggantinya.

## Kesimpulan

Migrasi skema tanpa downtime lebih banyak berkaitan dengan urutan daripada teknik eksotis. Hampir setiap operasi kelas berat di PostgreSQL memiliki padanan dua fase — pembangunan indeks punya `CONCURRENTLY`, constraint punya `NOT VALID` plus `VALIDATE`, `NOT NULL` punya jalan pintas bukti terperiksa, dan perubahan destruktif punya expand-contract — dan semuanya mengikuti bentuk yang sama: lakukan bagian murah khusus katalog selama tabel tetap dapat ditulis, lalu lakukan bagian mahal di bawah lock yang mengizinkan aktivitas bersamaan.

Mode kegagalan yang menjadi sasaran panduan ini bukan migrasi yang lambat, melainkan antrean yang terblokir. Pernyataan yang menunggu lock lebih buruk daripada pernyataan yang gagal, karena ia mengubah satu query lambat menjadi gangguan bagi setiap klien tabel tersebut. Tetapkan `lock_timeout`, biarkan migrasi gagal, lalu coba lagi — percobaan ulang berbiaya milidetik, sedangkan antrean berbiaya insiden.

Adopsi praktik ini berdasarkan urutan manfaatnya: timeout lock dan pembangunan indeks concurrent lebih dulu (keduanya menghilangkan gangguan paling umum secara langsung), lalu constraint `NOT VALID`, lalu backfill bertahap, dan akhirnya expand-contract sebagai kebiasaan tetap untuk apa pun yang bersifat destruktif. Tambahkan verifikasi skema ke pipeline deployment agar migrasi yang setengah jalan tidak pernah sampai ke produksi tanpa diketahui, dan pertahankan buffer kompatibilitas satu rilis agar deploy apa pun dapat di-rollback dengan `git revert` alih-alih migrasi data.

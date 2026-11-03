---
title: "Change Data Capture PostgreSQL dengan Logical Decoding"
description: "Membangun pipeline change data capture produksi dari write-ahead log PostgreSQL memakai logical decoding, replication slot, bootstrap snapshot, dan checkpoint LSN."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Change Data Capture PostgreSQL dengan Logical Decoding

## Ringkasan

Tutorial ini membahas pembangunan pipeline change data capture (CDC) yang membaca event baris `INSERT`, `UPDATE`, dan `DELETE` langsung dari write-ahead log PostgreSQL. Anda akan mengonfigurasi logical decoding, membuat replication slot, melakukan bootstrap snapshot yang konsisten, mengalirkan perubahan ke tabel tujuan, serta menyimpan checkpoint LSN agar pipeline tetap aman setelah restart tanpa kehilangan atau menggandakan data. Hasil akhirnya adalah consumer yang menjaga tabel analitik tetap sinkron dengan tabel operasional secara near real time.

## Target Audiens

- Backend, platform, dan data engineer yang sudah menjalankan PostgreSQL di produksi.
- Developer tingkat mahir yang nyaman dengan SQL, transaksi, dan penulisan service kecil berjalan lama.
- Engineer yang sudah tidak puas dengan export job harian atau polling berbasis `updated_at`.

## Prasyarat

- PostgreSQL 14 atau lebih baru (16+ jika ingin melakukan decoding di standby), dengan izin mengubah `postgresql.conf` dan me-restart server.
- Superuser atau role dengan hak `REPLICATION` serta izin membuat replication slot dan publication.
- Pemahaman dasar tentang WAL, MVCC, dan isolation level transaksi.
- Python 3.9+ dengan `psycopg2` terpasang, serta plugin output `wal2json` tersedia di server.
- Dua schema dalam database yang sama: satu operasional dan satu tujuan untuk latihan ini.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan bagaimana logical decoding merekonstruksi perubahan baris dari write-ahead log fisik.
- Memilih antara plugin output `pgoutput`, `wal2json`, dan `test_decoding` sesuai kebutuhan consumer.
- Membuat, memajukan, memantau, dan menghapus logical replication slot dengan aman.
- Melakukan bootstrap replika tujuan memakai snapshot yang di-export tanpa kehilangan atau menggandakan baris.
- Mengimplementasikan checkpoint LSN yang menghasilkan pengiriman effectively-once lewat upsert idempoten.
- Mencegah dua insiden CDC klasik: retensi WAL permanen dan data drift yang tidak terdeteksi.

## Konteks dan Motivasi

Cara paling intuitif untuk mereplikasi data keluar dari PostgreSQL adalah polling:

```sql
SELECT * FROM orders WHERE updated_at > :last_seen_at;
```

Query tersebut gagal dengan empat cara yang mudah diprediksi. Ia tidak bisa melihat `DELETE` sama sekali karena barisnya sudah tidak ada. Ia melewatkan status antara ketika sebuah baris di-update dua kali di antara dua polling. Ia diam-diam membuang baris yang ditulis transaksi panjang yang `COMMIT`-nya baru terjadi setelah polling Anda sudah melewati `updated_at` berikutnya. Dan ia menaruh scan besar di primary setiap beberapa detik, selamanya.

Change data capture menyelesaikan ini dengan membaca write-ahead log, bukan tabelnya. WAL sudah memuat setiap perubahan dalam urutan commit, sehingga consumer mendapatkan setiap versi baris persis seperti yang dilihat database, termasuk penghapusan, tanpa menyentuh tabel sama sekali. Mekanisme ini sama dengan yang dipakai logical replication subscription, artinya seluruh infrastrukturnya dipelihara oleh tim inti PostgreSQL, bukan tambalan pihak ketiga.

Konsekuensinya, membaca WAL adalah kontrak jangka panjang dengan primary. Slot yang tidak pernah dikonsumsi akan menahan segmen WAL sampai disk penuh, dan consumer yang mengabaikan semantik old tuple akan merusak data tujuan dengan tenang. Tutorial ini memperlakukan kedua mode kegagalan tersebut sebagai perhatian utama, bukan catatan kaki.

## Konten Inti

### Apa yang Sebenarnya Dilakukan Logical Decoding

WAL adalah log fisik: isinya perubahan halaman pada level byte, bukan baris logis. Logical decoding adalah lapisan yang menerjemahkan perubahan halaman tersebut kembali menjadi aliran tuple beserta transaksi pemiliknya. Server membaca WAL, melacak batas transaksi, lalu menyerahkan sekumpulan perubahan yang sudah didekode ke plugin output pada saat commit.

Ada dua syarat agar decoding berjalan:

- `wal_level` harus bernilai `logical`, supaya WAL menyimpan informasi yang dibutuhkan untuk merekonstruksi tuple (origin, kunci tuple lama, dan informasi katalog).
- Replication slot harus ada, karena server perlu menjamin WAL yang dibutuhkan consumer tidak didaur ulang sebelum dibaca.

Plugin output menentukan format di kabel. Core melakukan decoding; plugin melakukan serialisasi.

### Plugin Output dan Pilihan yang Tepat

Tiga plugin sudah mencakup hampir semua kebutuhan.

```text
| Plugin        | Keluaran        | Pakai ketika                                                       |
|---------------|-----------------|--------------------------------------------------------------------|
| test_decoding | Teks terbaca    | Sedang debugging atau membuktikan perubahan benar-benar tertangkap |
| wal2json      | Teks JSON       | Anda menulis consumer sendiri dan ingin kontrak yang stabil        |
| pgoutput      | Protokol biner  | Anda memakai Debezium, Kafka Connect, atau subscription native     |
```

`test_decoding` adalah alat diagnostik dan format keluarannya bukan untuk di-parse di produksi. `wal2json` adalah pilihan paling ramah untuk consumer buatan sendiri karena setiap pesannya JSON yang bisa di-log, di-diff, dan diputar ulang. `pgoutput` adalah protokol yang dipakai logical replication native; lebih ringkas dan mendukung streaming transaksi yang masih berjalan, tetapi memerlukan implementasi protokol biner, sehingga sebagian besar tim hanya menyentuhnya lewat Debezium atau subscription.

Tutorial ini memakai `wal2json` untuk consumer dan menunjukkan `pgoutput` pada bagian yang berbeda.

### Replication Slot adalah Kontrak Retensi

Logical replication slot punya dua tugas. Ia mengidentifikasi consumer, dan ia mencatat LSN terakhir yang dikonfirmasi consumer. PostgreSQL tidak akan membuang WAL melewati `restart_lsn` untuk slot tersebut, dan tidak akan membuang WAL melewati `confirmed_flush_lsn` sejauh menyangkut consumer.

Jaminan itulah yang membuat CDC tanpa kehilangan data, dan sekaligus cara paling umum tim menjatuhkan primary. Jika consumer berhenti selama sepekan, slot menghentikan daur ulang WAL selama sepekan, dan direktori data tumbuh sampai disk penuh. Dampaknya ke seluruh cluster, bukan hanya ke pipeline.

Dua pengaturan membatasi kerusakan. `max_slot_wal_keep_size` membatasi berapa banyak WAL yang boleh ditahan slot sebelum server menyatakannya tidak valid (tersedia sejak PostgreSQL 13), dan `pg_replication_slots` memberi lag dalam byte sehingga Anda bisa memberi alert jauh sebelum batas tercapai. Invalidasi bukan penghentian yang rapi: slot menjadi tidak bisa dipakai dan consumer harus dibangun ulang dari snapshot baru, jadi ini seharusnya menjadi jalan terakhir yang tidak pernah benar-benar Anda capai.

### Old Tuple, Replica Identity, dan Jebakan UPDATE

Untuk `INSERT`, tuple hasil dekode adalah baris baru. Untuk `DELETE` dan `UPDATE` yang mengubah primary key, consumer juga membutuhkan identitas baris lama. Di sinilah `REPLICA IDENTITY` berperan.

Dengan pengaturan default (`REPLICA IDENTITY DEFAULT`), tuple lama hanya memuat kolom primary key. Itu cukup untuk menemukan baris di tujuan. Jika consumer membutuhkan seluruh baris sebelumnya — untuk tabel audit atau perhitungan delta — tabel harus memakai `REPLICA IDENTITY FULL`, yang menulis semua kolom lama ke WAL. Pengaturan ini mahal pada tabel lebar karena kurang lebih menggandakan volume WAL untuk update, jadi aktifkan dengan sengaja dan hanya di tempat yang memang membutuhkannya.

Ada jebakan kedua yang lebih halus. PostgreSQL menyimpan nilai besar di luar baris pada tabel TOAST, dan `UPDATE` yang tidak menyentuh kolom TOAST tidak menulis ulang kolom itu, sehingga tuple baru hasil dekode tidak memuatnya sama sekali. Consumer yang menganggap tuple hasil dekode sebagai baris utuh lalu menimpa data tujuan dengan `NULL` untuk kolom yang hilang akan menghancurkan data secara diam-diam. Terapkan perubahan hasil dekode sebagai update parsial, atau baca nilai terkini dari sumber ketika sebuah kolom tidak ada.

### Bootstrap Snapshot Tanpa Kehilangan Baris

Streaming hanya membawa perubahan yang terjadi setelah slot dibuat. Baris yang sudah ada harus berasal dari suatu tempat, dan urutan naif — dump tabel lalu mulai streaming — kehilangan setiap penulisan yang commit di antara kedua langkah tersebut.

Urutan yang benar adalah: buat slot lebih dulu, lalu ambil snapshot yang dijamin berada pada atau sebelum titik awal slot, muat snapshot, dan baru kemudian mulai mengonsumsi dari slot. Karena slot sudah ada sejak awal, setiap perubahan setelah titik snapshot masih tersimpan di WAL dan akan dikirim. Sebagian perubahan itu sudah tercermin di snapshot, dan itu tidak masalah selama langkah apply bersifat idempoten.

```text
Buat slot  ──►  Export snapshot  ──►  Muat snapshot  ──►  Stream dari slot
 (WAL ditahan)   (repeatable read)      (bulk load)        (at-least-once)
```

Pekerjaan ganda antara snapshot dan awal stream adalah harga dari kebenaran data, dan jumlahnya kecil.

### Semantik Pengiriman dan Checkpoint

Logical decoding memberi pengiriman at-least-once. Consumer mengonfirmasi sebuah LSN, dan jika ia crash sebelum konfirmasi, perubahan yang sama dikirim ulang setelah restart. Exactly-once karenanya bukan sifat stream, melainkan sifat langkah apply.

Pola yang berhasil adalah menulis ke tujuan dan menyimpan checkpoint dalam transaksi yang sama. Keduanya berhasil atau keduanya batal, sehingga pemutaran ulang setelah crash akan membaca transaksi yang memang belum pernah diterapkan. Dikombinasikan dengan upsert idempoten yang dijaga kolom versi atau timestamp, hasilnya adalah perilaku effectively-once untuk stream yang urutannya benar.

Simpan satu baris checkpoint per consumer, bukan per tabel. LSN adalah posisi pada satu log tunggal, dan consumer yang melacak posisi terpisah per tabel cepat atau lambat akan menerapkan perubahan tidak berurutan.

### Membaca Protokol di Kabel

Setiap plugin membungkus perubahan dalam batas transaksi, dan batas itulah yang menjaga atomisitas. `wal2json` pada format versi 2 mengeluarkan satu dokumen JSON per transaksi dengan array `change`. `pgoutput` mengeluarkan `BEGIN` biner, satu pesan per baris (`I`, `U`, `D`), lalu `COMMIT`, semuanya terikat pada transaksi yang sama. Consumer yang langsung menerapkan pesan baris tanpa menampung sampai `COMMIT` akan menampilkan transaksi yang diterapkan sebagian di tujuan, tepat inkonsistensi yang seharusnya dicegah CDC.

## Contoh Kode

### Langkah 1: Mengaktifkan Logical Decoding di Server

Sunting `postgresql.conf` lalu restart server. `wal_level` tidak bisa diubah dengan reload.

```text
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10
max_slot_wal_keep_size = '20GB'
wal_sender_timeout = '60s'
```

Pastikan pengaturan sudah berlaku:

```sql
SHOW wal_level;

SELECT name, setting, unit
FROM pg_settings
WHERE name IN ('wal_level', 'max_replication_slots', 'max_slot_wal_keep_size');
```

### Langkah 2: Membuat Tabel Sumber, Role Consumer, dan Slot

Tabel sumber memuat kolom realistis, termasuk satu kolom yang akan disimpan di TOAST agar perilaku update parsial terlihat.

```sql
CREATE SCHEMA IF NOT EXISTS shop;
CREATE SCHEMA IF NOT EXISTS warehouse;
CREATE SCHEMA IF NOT EXISTS cdc;

CREATE TABLE shop.orders (
    id           bigint PRIMARY KEY,
    customer_id  bigint NOT NULL,
    status       text NOT NULL,
    total_cents  integer NOT NULL CHECK (total_cents >= 0),
    notes        text,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Kolom lebar dan mudah dikompresi: disimpan di luar baris pada TOAST
ALTER TABLE shop.orders ALTER COLUMN notes SET STORAGE EXTENDED;

INSERT INTO shop.orders (id, customer_id, status, total_cents, notes)
VALUES (1, 100, 'pending', 4200, repeat('gift wrap; ', 2000)),
       (2, 101, 'paid',    9900, NULL);

-- Role consumer dengan hak replikasi dan akses baca ke sumber
CREATE ROLE cdc_consumer WITH LOGIN REPLICATION;
GRANT CONNECT ON DATABASE appdb TO cdc_consumer;
GRANT USAGE ON SCHEMA shop TO cdc_consumer;
GRANT SELECT ON ALL TABLES IN SCHEMA shop TO cdc_consumer;
GRANT USAGE, CREATE ON SCHEMA cdc TO cdc_consumer;
```

Sekarang buat slot. Buat sebelum snapshot mana pun supaya tidak ada perubahan yang jatuh di antara keduanya.

```sql
SELECT pg_create_logical_replication_slot('cdc_orders', 'wal2json');
```

### Langkah 3: Memastikan Perubahan Tertangkap

Sebelum menulis consumer, buktikan pipeline bekerja memakai `test_decoding` pada slot sementara. Langkah ini murah dan menyingkirkan kesalahan konfigurasi.

```sql
SELECT pg_create_logical_replication_slot('cdc_probe', 'test_decoding');

UPDATE shop.orders SET status = 'shipped', updated_at = now() WHERE id = 2;

SELECT lsn, xid, data
FROM pg_logical_slot_peek_changes('cdc_probe', NULL, NULL);

SELECT pg_drop_replication_slot('cdc_probe');
```

`peek_changes` membaca tanpa memajukan slot, dan itulah yang Anda inginkan saat memeriksa. Pemanggilan yang sama dengan `get_changes` akan memajukan slot — cara mudah kehilangan data tanpa sadar.

Anda juga bisa mengamati slot `wal2json` langsung dari baris perintah:

```bash
pg_recvlogical -d appdb -S cdc_orders --start \
  -o format-version=2 -o include-transaction=1 -o include-timestamp=1 \
  -f -
```

Hanya satu consumer yang boleh aktif pada sebuah slot pada satu waktu. Jika consumer Python sedang berjalan, `pg_recvlogical` akan gagal dengan pesan "active" alih-alih merebut slot — itu fitur keamanan, bukan bug.

### Langkah 4: Menyiapkan Tabel Tujuan dan Checkpoint

Tabel checkpoint adalah memori consumer. Menempatkannya di database yang sama dengan target memungkinkan commit atomik.

```sql
CREATE TABLE warehouse.orders (
    id          bigint PRIMARY KEY,
    customer_id bigint NOT NULL,
    status      text NOT NULL,
    total_cents integer NOT NULL,
    updated_at  timestamptz NOT NULL
);

CREATE TABLE warehouse.orders_tombstones (
    id          bigint PRIMARY KEY,
    deleted_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cdc.checkpoints (
    consumer   text PRIMARY KEY,
    lsn        pg_lsn NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Langkah 5: Menulis Consumer

Consumer menerapkan setiap transaksi beserta checkpoint-nya secara atomik, lalu mengonfirmasi LSN ke server. Perhatikan bahwa koneksi replikasi tidak bisa menjalankan query biasa, sehingga langkah apply memakai koneksi kedua.

```python
import json
import logging

import psycopg2
from psycopg2.extras import LogicalReplicationConnection

DSN = "dbname=appdb user=cdc_consumer"
SLOT = "cdc_orders"
CONSUMER = "orders-to-warehouse"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("cdc")


def lsn_to_str(lsn: int) -> str:
    """Ubah LSN bilangan bulat menjadi bentuk hex X/Y yang dikenal PostgreSQL."""
    return "{:X}/{:X}".format(lsn >> 32, lsn & 0xFFFFFFFF)


def apply_upsert(cur, row: dict) -> None:
    cur.execute(
        """
        INSERT INTO warehouse.orders (id, customer_id, status, total_cents, updated_at)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE
           SET customer_id = EXCLUDED.customer_id,
               status      = EXCLUDED.status,
               total_cents = EXCLUDED.total_cents,
               updated_at  = EXCLUDED.updated_at
         WHERE warehouse.orders.updated_at <= EXCLUDED.updated_at
        """,
        (row["id"], row["customer_id"], row["status"], row["total_cents"], row["updated_at"]),
    )


def apply_delete(cur, change: dict) -> None:
    keys = change["oldkeys"]["keyvalues"]
    order_id = keys[0]
    cur.execute(
        "DELETE FROM warehouse.orders WHERE id = %s",
        (order_id,),
    )
    cur.execute(
        """
        INSERT INTO warehouse.orders_tombstones (id) VALUES (%s)
        ON CONFLICT (id) DO UPDATE SET deleted_at = now()
        """,
        (order_id,),
    )


def apply_transaction(tcur, changes: list) -> None:
    for change in changes:
        if change.get("table") != "orders":
            continue
        if change["kind"] in ("insert", "update"):
            # Kehadiran kolom bisa berbeda: kolom yang tidak ditulis ulang akan absen
            names = change["columnnames"]
            values = change["columnvalues"]
            apply_upsert(tcur, dict(zip(names, values)))
        elif change["kind"] == "delete":
            apply_delete(tcur, change)
        elif change["kind"] == "truncate":
            tcur.execute("TRUNCATE warehouse.orders")


def consume() -> None:
    replica = psycopg2.connect(DSN, connection_factory=LogicalReplicationConnection)
    rcur = replica.cursor()

    target = psycopg2.connect(DSN)
    target.autocommit = False
    tcur = target.cursor()

    def process(message) -> None:
        try:
            payload = json.loads(message.payload)
            changes = payload["change"] if payload else []
            if changes:
                apply_transaction(tcur, changes)
            tcur.execute(
                """
                INSERT INTO cdc.checkpoints (consumer, lsn)
                VALUES (%s, %s::pg_lsn)
                ON CONFLICT (consumer) DO UPDATE
                   SET lsn = EXCLUDED.lsn, updated_at = now()
                """,
                (CONSUMER, lsn_to_str(message.data_start)),
            )
            target.commit()
        except Exception:
            target.rollback()
            log.exception("transaksi gagal, berhenti sebelum mengonfirmasi LSN")
            raise

        # Konfirmasi hanya setelah commit di target berhasil
        message.cursor.send_feedback(flush_lsn=message.data_start)

    rcur.start_replication(
        slot_name=SLOT,
        decode=False,
        options={"format-version": "2", "include-transaction": "1", "include-timestamp": "1"},
        plugin="wal2json",
    )
    log.info("mulai streaming dari slot %s", SLOT)
    rcur.consume_stream(process)


if __name__ == "__main__":
    consume()
```

Dua detail memikul sebagian besar kebenaran di sini. `send_feedback` hanya berjalan setelah `target.commit()`, sehingga crash di antara apply dan konfirmasi akan memutar ulang transaksi, bukan kehilangannya. Dan klausa `WHERE warehouse.orders.updated_at <= EXCLUDED.updated_at` pada upsert membuat pemutaran ulang menjadi no-op, bukan kemunduran ke versi baris yang lebih lama.

### Langkah 6: Menerapkan Snapshot dengan Benar

Untuk tabel yang sudah berisi data, jalankan bootstrap sebelum consumer dimulai. Export snapshot, muat, lalu streaming.

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT pg_export_snapshot();
-- Mengembalikan identifier snapshot seperti 00000003-0000001B-1
```

Biarkan transaksi itu tetap terbuka dan gunakan identifier-nya pada sesi paralel:

```bash
pg_dump -d appdb \
  --snapshot=00000003-0000001B-1 \
  --data-only \
  --table=shop.orders \
  -f /tmp/orders_snapshot.sql

psql -d appdb -f /tmp/orders_snapshot.sql
```

Dump dan stream akan tumpang tindih pada sebagian baris. Tumpang tindih itu tidak berbahaya karena langkah apply bersifat idempoten; baris yang hilang tidak demikian.

### Langkah 7: Memantau Kesehatan Slot Sebelum Menjadi Insiden

Dua query ini layak masuk dashboard dengan alert.

```sql
SELECT slot_name,
       active,
       plugin,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) AS behind,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn))        AS retained
FROM pg_replication_slots
WHERE slot_type = 'logical'
ORDER BY pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) DESC;
```

```sql
SELECT slot_name,
       total_txns,
       stream_txns,
       spill_txns,
       spill_count,
       spill_bytes
FROM pg_stat_replication_slots;
```

Berikan alert ketika `behind` melewati anggaran waktu, bukan anggaran byte — "tertinggal lebih dari lima menit" bermakna, sedangkan "lebih dari 500 MB" bergantung pada volume tulis. Beri alert lagi pada sekitar setengah `max_slot_wal_keep_size`, yaitu titik di mana Anda masih punya ruang untuk memperbaiki consumer sebelum slot dinyatakan tidak valid.

Jika sebuah consumer ditinggalkan secara permanen, hapus slot-nya dengan sengaja:

```sql
SELECT pg_drop_replication_slot('cdc_orders');
```

Periksa `confirmed_flush_lsn` lebih dulu dan pastikan tidak ada yang membutuhkan data di belakangnya. Menghapus slot tidak bisa dibatalkan, dan semua data yang ditahannya menjadi tidak dapat dipulihkan.

## Insight Penting

- **Yang Anda baca adalah slot, bukan tabel.** Setiap perubahan dikirim dalam urutan commit dari WAL, sehingga penghapusan dan versi baris antara tertangkap secara alami. Jangan pernah kembali ke polling "hanya untuk baris yang terlewat" — itu mengembalikan bug yang justru ingin dihilangkan CDC.
- **Consumer yang mati bisa menjatuhkan primary.** Logical slot menahan WAL. Setel `max_slot_wal_keep_size`, beri alert pada lag di `pg_replication_slots`, dan perlakukan slot tidak aktif lebih dari beberapa jam sebagai insiden yang layak di-page.
- **Replica identity adalah keputusan biaya per tabel.** Identitas default memberi primary key pada tuple lama, cukup untuk menemukan baris. `REPLICA IDENTITY FULL` memberi seluruh baris lama dengan biaya WAL sekitar dua kali lipat pada tabel lebar; aktifkan hanya di tempat yang benar-benar membutuhkan nilai sebelumnya.
- **Kolom TOAST hilang dari update hasil dekode.** Update yang tidak menyentuh kolom besar tidak menyertakannya di tuple baru. Perlakukan baris hasil dekode sebagai parsial, tambal tujuan dengan `UPDATE ... SET` per kolom yang ada, atau baca kolom sumber ketika absen.
- **Simpan checkpoint dalam transaksi yang sama dengan apply.** Menyatukan penulisan target dan LSN mengubah pengiriman at-least-once menjadi pemrosesan effectively-once. Dua commit terpisah berarti pekerjaan ganda setelah setiap crash.
- **Jangan berbagi slot antar consumer.** Sebuah slot punya satu posisi terkonfirmasi dan satu consumer aktif. Dua service yang membaca slot yang sama akan masing-masing melihat sebagian perubahan secara acak, dan keduanya terlihat benar jika diperiksa sendiri-sendiri.
- **Decoding di standby membutuhkan PostgreSQL 16 atau lebih baru.** Sebelum itu, logical decoding harus berjalan di primary, yang menaruh biaya CPU decoding di jalur tulis Anda.
- **Urutan bersifat per transaksi, bukan global per baris.** Perubahan pada baris yang sama tiba dalam urutan commit, dan itu cukup untuk upsert. Jangan mengasumsikan urutan total antar tabel yang tidak berhubungan.
- **Invalidasi berarti membangun ulang, bukan berhenti sejenak.** Begitu `max_slot_wal_keep_size` terlampaui, slot hilang dan pipeline harus di-bootstrap ulang dari snapshot. Rancang jalur bootstrap sebagai rutinitas, bukan pemulihan heroik.

## Langkah Berikutnya

- Ganti consumer buatan sendiri dengan subscription logical replication native (`CREATE SUBSCRIPTION`) ketika tujuan adalah database PostgreSQL lain; ia memakai `pgoutput` dan mengelola slot untuk Anda.
- Pindahkan sink tujuan ke Kafka dengan Debezium begitu lebih dari dua consumer membutuhkan stream perubahan yang sama, agar WAL dibaca sekali dan disebarkan.
- Tambahkan penanganan perubahan skema: bandingkan `columnnames` dengan daftar yang diharapkan dan gagal dengan jelas saat ada kolom tak dikenal, bukan membuangnya diam-diam.
- Baca dokumentasi PostgreSQL tentang logical decoding dan referensi opsi `wal2json` sebelum menyetel ukuran batch.
- Pelajari `postgresql-replication-high-availability-guide` di repositori ini untuk sisi failover dan monitoring dari mesin WAL yang sama.

## Kesimpulan

Anda sudah mengonfigurasi logical decoding, membuat replication slot dengan pengaman retensi yang tepat, melakukan bootstrap snapshot yang konsisten, dan mengalirkan perubahan level baris ke tabel tujuan dengan checkpoint LSN yang membuat restart aman. Pipeline kini menangkap insert, update, dan delete dalam urutan commit tanpa pernah melakukan query ke tabel sumber.

Dua hal yang layak diingat keduanya soal kontrak. Slot adalah janji bahwa PostgreSQL akan menahan WAL untuk Anda, dan melanggar janji itu berbiaya disk di primary. Langkah apply adalah janji bahwa pemutaran ulang tidak berbahaya, dan melanggar janji itu berbiaya kebenaran data di hilir. Jaga urutan snapshot-sebelum-stream, commit checkpoint bersama data, dan pantau lag slot sebagai sinyal produksi, bukan alat debugging.

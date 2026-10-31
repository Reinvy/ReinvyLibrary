---
title: "Cheat Sheet Backup dan Restore PostgreSQL"
description: "Referensi cepat untuk pg_dump dan pg_restore, pg_basebackup, arsip WAL, point-in-time recovery, serta cara membuktikan bahwa backup benar-benar bisa dipulihkan."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Backup dan Restore PostgreSQL

Ada dua keluarga backup di PostgreSQL. Backup logis (`pg_dump`, `pg_dumpall`) mengekspor objek SQL dan tetap portabel antarversi; backup fisik (`pg_basebackup` plus WAL) menyalin direktori data dan merupakan satu-satunya jalan menuju point-in-time recovery. Sebuah backup baru dianggap nyata setelah proses restore-nya diukur waktunya dan diverifikasi.

## Tabel Referensi Cepat

| Tugas | Perintah | Catatan |
|-------|----------|---------|
| Dump logis penuh, format custom | `pg_dump -Fc -f app.dump appdb` | Terkompresi; bisa restore selektif via `pg_restore` |
| Dump SQL biasa | `pg_dump -Fp -f app.sql appdb` | Mudah dibaca; restore dengan `psql` |
| Format direktori, paralel | `pg_dump -Fd -j 4 -f /backup/app_dir appdb` | Dump dan restore bisa paralel |
| Skema saja | `pg_dump -s -f schema.sql appdb` | Tanpa baris data |
| Satu tabel | `pg_dump -t public.orders -f orders.sql appdb` | Ulangi `-t` untuk beberapa tabel |
| Kecualikan satu tabel | `pg_dump -T public.audit_log -Fc -f app.dump appdb` | Berguna untuk tabel log raksasa |
| Role dan tablespace | `pg_dumpall -g -f globals.sql` | `pg_dump` tidak pernah menyertakan role |
| Restore dump custom | `pg_restore -d appdb -j 4 app.dump` | Ke database kosong yang sudah ada |
| Restore bersih | `pg_restore -d appdb --clean --if-exists app.dump` | Menghapus objek sebelum membuat ulang |
| Restore satu tabel | `pg_restore -d appdb -t orders app.dump` | Wajib menyertakan target `-d` |
| Restore SQL biasa | `psql -d appdb -v ON_ERROR_STOP=1 -f app.sql` | Berhenti pada error pertama |
| Periksa isi dump | `pg_restore -l app.dump` | Daftar table of contents |
| Backup fisik (base backup) | `pg_basebackup -D /backup/base -Ft -z -X stream -P` | Menyertakan WAL lewat streaming |
| Verifikasi base backup | `pg_verifybackup /backup/base` | Cek checksum terhadap manifest |
| Paksa ganti segmen WAL | `SELECT pg_switch_wal();` | Memperkecil RPO sebelum perubahan berisiko |

## Perintah Umum

### Backup Logis dengan pg_dump

```bash
# Format custom terkompresi, plus checksum yang disimpan di samping file
pg_dump -h db.internal -U backup_user -Fc --compress=6 -f /backup/appdb-20261027.dump appdb
sha256sum /backup/appdb-20261027.dump > /backup/appdb-20261027.dump.sha256

# Dua dump pada waktu berbeda bukan pasangan yang konsisten.
# Ekspor satu snapshot lalu pakai ulang untuk semua database di set tersebut.
psql -d postgres -c "SELECT pg_export_snapshot();"   # mis. 00000003-0000001B-1
pg_dump --snapshot="00000003-0000001B-1" -Fc -f /backup/billing.dump billing
```

### Restore dengan pg_restore dan psql

```bash
# Siapkan target bersih, lalu restore dengan empat worker
createdb -h db.internal -U admin appdb_restored
pg_restore -h db.internal -U admin -d appdb_restored -j 4 --exit-on-error /backup/appdb.dump

# Restore ke database yang sudah berisi objek, dengan toleransi objek yang sudah ada
pg_restore -d appdb --clean --if-exists --no-owner --no-privileges /backup/appdb.dump

# Restore SQL biasa: selalu berhenti pada error pertama
psql -d appdb -v ON_ERROR_STOP=1 -f /backup/appdb.sql

# Bangun ulang cluster: globals (role) dulu, baru setiap database
psql -d postgres -v ON_ERROR_STOP=1 -f /backup/globals.sql
```

### Backup Fisik dengan pg_basebackup

```bash
# Base backup streaming, format tar, terkompresi gzip, dengan progres
pg_basebackup -h db.internal -U replicator -D /backup/base_20261027 -Ft -z -X stream -c fast -P

# Verifikasi terhadap manifest sebelum backup dikirim keluar host
pg_verifybackup /backup/base_20261027
```

### Arsip WAL dan PITR

```ini
# postgresql.conf — arsip WAL inilah yang memungkinkan PITR
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /mnt/wal-archive/%f && cp %p /mnt/wal-archive/%f'
archive_timeout = 60
```

```bash
# Segmen yang diarsipkan juga harus keluar dari host, jika tidak satu disk rusak menghapus dua salinan
aws s3 sync /mnt/wal-archive s3://acme-pg-wal/appdb/ --only-show-errors

# Cek kegagalan arsip — kegagalan senyap berarti tidak ada PITR
psql -d postgres -c "SELECT archived_count, failed_count, last_archived_time FROM pg_stat_archiver;"
```

## Potongan Kode

### Skrip Backup Malam dengan Verifikasi

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/postgres"
DB_NAME="appdb"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${BACKUP_DIR}/${DB_NAME}-${STAMP}.dump"

mkdir -p "${BACKUP_DIR}"

if ! pg_dump --format=custom --compress=6 --file="${FILE}" "${DB_NAME}"; then
    echo "backup gagal untuk ${DB_NAME}" >&2
    exit 1
fi

# Dump yang tidak bisa dibaca daftar isinya tidak bisa direstorasi
if ! pg_restore --list "${FILE}" > /dev/null; then
    echo "arsip ${FILE} tidak terbaca" >&2
    exit 1
fi

find "${BACKUP_DIR}" -name "${DB_NAME}-*.dump" -mtime +14 -delete
echo "backup ok: ${FILE}"
```

### Latihan Restore ke Database Sementara

```bash
#!/usr/bin/env bash
set -euo pipefail

DUMP="/var/backups/postgres/appdb-20261027T010000Z.dump"
DRILL_DB="appdb_restore_check"

psql -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DRILL_DB};"
psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DRILL_DB};"
pg_restore --dbname="${DRILL_DB}" --jobs=4 --exit-on-error "${DUMP}"
psql -d "${DRILL_DB}" -v ON_ERROR_STOP=1 -c "SELECT count(*) AS jumlah_order FROM orders;"
```

### Konfigurasi Point-in-Time Recovery

```ini
# postgresql.conf pada instance hasil restore
restore_command = 'cp /mnt/wal-archive/%f %p'
recovery_target_time = '2026-10-27 04:30:00+07'
recovery_target_action = 'promote'
```

```bash
# PostgreSQL 12+ memakai file signal, bukan recovery.conf
touch /var/lib/postgresql/16/main/recovery.signal
pg_ctl -D /var/lib/postgresql/16/main start
```

### Query Verifikasi Pasca-Restore

```sql
-- Recovery harus selesai sebelum instance menerima penulisan
SELECT pg_is_in_recovery() AS masih_replay;

-- Bandingkan tabel terbesar dengan jumlah baris di sumber
SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;

-- Sequence tidak ikut kembali dengan sendirinya: perbaiki setelah restore logis
SELECT setval('orders_id_seq', (SELECT max(id) FROM orders));
```

Latih jalur restore secara berkala dan catat durasinya berdampingan dengan target RPO dan RTO Anda.

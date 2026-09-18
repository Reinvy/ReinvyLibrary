---
title: "Cheatsheet Backup dan Restore MongoDB"
description: "Referensi cepat untuk backup dan pemulihan MongoDB — mongodump dan mongorestore, backup arsip dan gzip, penangkapan oplog, point-in-time recovery, snapshot filesystem, backup cloud Atlas, dan verifikasi restore."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheatsheet Backup dan Restore MongoDB

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Backup semua database | `mongodump --uri "mongodb://localhost:27017"` | Menulis setiap database ke `./dump/` |
| Backup satu database | `mongodump --db bookstore` | Hanya membackup `bookstore` ke `dump/bookstore/` |
| Backup satu koleksi | `mongodump --db bookstore --collection orders` | Mem backup satu koleksi |
| Backup satu file | `mongodump --archive=full.archive` | Menulis seluruh backup ke satu file arsip |
| Backup terkompresi | `mongodump --archive=full.gz --gzip` | Backup arsip terkompresi gzip |
| Menangkap oplog | `mongodump --oplog` | Menyertakan entri oplog untuk restore point-in-time |
| Restore semua database | `mongorestore dump/` | Memulihkan setiap database dari direktori dump |
| Restore satu database | `mongorestore --db bookstore dump/bookstore` | Memulihkan satu database |
| Restore dari arsip | `mongorestore --archive=full.gz --gzip` | Memulihkan dari file arsip terkompresi |
| Drop sebelum restore | `mongorestore --drop dump/` | Menghapus setiap koleksi sebelum memulihkannya |
| Remap namespace | `mongorestore --nsFrom "bookstore.*" --nsTo "staging.*" dump/` | Memulihkan ke nama database yang berbeda |
| Memutar ulang oplog | `mongorestore --oplogReplay` | Menerapkan entri oplog setelah restore dasar |
| Verifikasi restore | `mongorestore --archive=full.gz --gzip --dryRun` | Mendaftar aksi restore tanpa menulis data apa pun |
| Mengunci tulis untuk snapshot | `mongosh admin --eval "db.fsyncLock()"` | Flush dan kunci tulis sebelum snapshot volume |

## Perintah Umum

### Backup Logis dengan mongodump

```bash
# Backup semua database ke ./dump
mongodump --uri "mongodb://user:pass@localhost:27017"

# Backup satu database ke direktori output tertentu
mongodump --db bookstore --out /backups/2026-09-19/

# Backup satu koleksi, dikompresi ke dalam arsip
mongodump --db bookstore --collection orders --gzip --archive=orders.gz

# Backup terhadap cluster Atlas dengan autentikasi
mongodump --host cluster0.xxxxx.mongodb.net --username admin \
  --authenticationDatabase admin --archive=atlas-full.gz --gzip
```

### Restore dengan mongorestore

```bash
# Restore seluruh direktori dump
mongorestore --uri "mongodb://localhost:27017" /backups/2026-09-19/

# Restore satu database
mongorestore --db bookstore /backups/2026-09-19/bookstore

# Restore dari arsip dan drop data yang ada terlebih dahulu
mongorestore --archive=full-2026-09-19.gz --gzip --drop

# Restore ke database yang berbeda (remap namespace)
mongorestore --nsFrom "bookstore.*" --nsTo "staging.*" /backups/dump/
```

### Backup Cloud Atlas

```bash
# Ekspor snapshot Atlas secara lokal dengan alat standar
mongodump --uri "mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net" \
  --archive=atlas-export.gz --gzip

# Atlas CLI: daftar snapshot yang tersedia untuk sebuah cluster
atlas backups snapshots list --clusterName Cluster0

# Atlas CLI: restore snapshot berdasarkan ID (membuat cluster baru)
atlas backups restore start --clusterName Cluster0 --snapshotId 64f3a1b2c3d4e5f6a7b8c9d0
```

### Snapshot Filesystem

```bash
# Snapshot standalone: flush dan kunci tulis, snapshot volume, lalu buka kunci
mongosh admin --eval "db.fsyncLock()"

# ... ambil snapshot volume di sini (EBS, LVM, atau sejenisnya) ...

mongosh admin --eval "db.fsyncUnlock()"

# Untuk replica set, snapshot volume data secondary sebagai gantinya —
# journaling menjaga snapshot tetap crash-consistent tanpa kunci.
```

### Mengotomatiskan Backup

```bash
# Entri crontab: jalankan backup penuh bergilir setiap hari pukul 02:00
0 2 * * * /usr/local/bin/mongodb-backup.sh

# Di dalam skrip, hapus arsip yang lebih lama dari 7 hari
find /backups/mongodb -name "full-*.gz" -mtime +7 -delete
```

## Potongan Kode

### Skrip Backup dengan Rotasi

```bash
#!/bin/bash
set -euo pipefail

URI="mongodb://127.0.0.1:27017/admin"
BACKUP_DIR="/backups/mongodb"
STAMP=$(date +%Y%m%d-%H%M%S)

# Backup penuh dengan penangkapan oplog, dikompresi ke arsip ber-timestamp
mongodump --uri "$URI" --oplog --archive="$BACKUP_DIR/full-$STAMP.gz" --gzip

# Pertahankan 7 arsip harian terakhir
find "$BACKUP_DIR" -name "full-*.gz" -mtime +7 -delete
```

### Point-in-Time Recovery

```bash
# 1. Restore backup penuh terbaru
mongorestore --archive=full-2026-09-19.gz --gzip --drop

# 2. Putar ulang oplog yang ditangkap untuk memajukan data ke momen target
mongorestore --archive=oplog-2026-09-19.gz --gzip --oplogReplay

# Untuk berhenti di waktu tertentu, gunakan --oplogLimit (ISO-8601 dalam UTC)
mongorestore --archive=oplog-2026-09-19.gz --gzip --oplogReplay \
  --oplogLimit "2026-09-19T14:30:00Z"
```

### Verifikasi Restore

```bash
# Dry run: periksa semua yang akan ditulis restore tanpa menyentuh target
mongorestore --archive=full-2026-09-19.gz --gzip --dryRun

# Restore ke database terisolasi untuk memverifikasi integritas dengan aman
mongorestore --nsFrom "bookstore.*" --nsTo "verify.*" \
  --archive=full-2026-09-19.gz --gzip

# Periksa jumlah dokumen setelah restore
mongosh verify --eval "db.orders.countDocuments()"
```

---
title: "Panduan Backup dan Recovery MongoDB"
description: "Panduan praktis backup MongoDB yang benar-benar bisa dipulihkan saat insiden: mongodump dan mongorestore, snapshot filesystem, point-in-time recovery berbasis oplog, serta drill restore dengan RPO dan RTO yang terukur."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Backup dan Recovery MongoDB

## Pendahuluan

Backup bukan file yang Anda tulis tadi malam; backup adalah restore yang berhasil Anda selesaikan di bawah tekanan waktu. Sebagian besar insiden MongoDB yang berujung kehilangan data bukan disebabkan tidak adanya backup — melainkan backup yang ternyata tidak bisa direstore, tidak pernah diverifikasi, atau tidak mencakup rentang waktu yang sebenarnya dibutuhkan bisnis.

MongoDB menyediakan tiga lapisan, dan ketiganya menyelesaikan masalah berbeda:

- **Backup logis** (`mongodump` / `mongorestore`) bersifat portabel, bisa difilter, dan mudah dipindahkan antar topologi maupun antar versi mayor. Namun ia lambat pada dataset besar dan, bila berdiri sendiri, hanya memulihkan ke saat dump selesai.
- **Snapshot fisik** (LVM, EBS, snapshot disk cloud) nyaris instan berapa pun ukuran datasetnya dan cepat direstore, tetapi terikat pada lapisan storage dan topologi.
- **Replay oplog** menerapkan operasi antara backup dasar dan timestamp target, dan inilah cara memperoleh point-in-time recovery (PITR) sejati di dalam jendela oplog.

Panduan ini membahas cara menggabungkan ketiganya, di mana masing-masing bisa gagal, dan drill yang membuktikan rencana restore Anda berjalan sebelum insiden memaksa Anda mengetahuinya.

## Praktik Terbaik

- **Tetapkan RPO dan RTO sebelum memilih alat.** Recovery Point Objective (berapa banyak data boleh hilang) dan Recovery Time Objective (berapa lama restore boleh berlangsung) mengubah perdebatan terbuka menjadi jadwal konkret. RPO 5 menit langsung mengesampingkan dump harian.
- **Jangan pernah menganggap `mongodump --oplog` sebagai PITR.** `--oplog` menangkap operasi hanya selama dump berlangsung, jadi ia membuat dump konsisten, bukan dapat dipulihkan ke sembarang waktu. PITR membutuhkan base yang tersimpan plus jendela oplog yang mencakup waktu target.
- **Backup dari secondary.** Dump dari primary bersaing dengan baca-tulis aplikasi. Pada replica set, arahkan `mongodump` ke secondary dengan `--readPreference=secondary`.
- **Snapshot seluruh topologi, bukan satu node.** Untuk replica set, snapshot semua member dalam jendela yang sama; untuk sharded cluster, hentikan balancer lalu snapshot setiap shard beserta config server.
- **Buat jendela oplog lebih panjang dari interval snapshot ditambah restore terlama.** Bila snapshot tiap enam jam tetapi oplog hanya menampung empat jam, ada rentang waktu yang tidak bisa Anda capai.
- **Enkripsi dan simpan di luar cluster.** Gunakan SSE-KMS atau setara pada object store, wajibkan TLS ke database, dan jangan menaruh kredensial di dalam skrip (pakai instance role atau secret manager).
- **Kunci versi perkakas.** `mongorestore` dari versi mayor lama mungkin tidak bisa membaca arsip yang ditulis `mongodump` versi baru. Gunakan versi yang sama di image backup dan di runbook restore.
- **Verifikasi setiap restore secara otomatis, dan gelar drill tiap kuartal.** Hitungan dokumen dan `dbHash` menangkap pemotongan data; pengingat kalender menangkap runbook yang perlahan jadi usang.

## Langkah Implementasi

### Langkah 1: Sepakati RPO, RTO, dan retensi per dataset

| Dataset | RPO | RTO | Mekanisme | Retensi |
|---|---|---|---|---|
| Pembayaran | 5 menit | 1 jam | snapshot 15 menit + replay oplog | 35 hari |
| Katalog produk | 1 jam | 4 jam | arsip `mongodump` per jam | 30 hari |
| Event analitik | 24 jam | 8 jam | `mongodump` harian | 90 hari |

Tulis angka-angka ini ke dalam runbook, lalu sesuaikan ukuran oplog: oplog harus mencakup minimal interval snapshot ditambah durasi restore yang diperkirakan. Oplog besar berbiaya disk; oplog pendek berbiaya data.

### Langkah 2: Lakukan backup logis yang konsisten

```bash
#!/usr/bin/env bash
set -euo pipefail

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="s3://acme-mongo-backups/prod/${TS}.archive.gz"

# --oplog membuat dump konsisten pada replica set; --gzip mengecilkan transfer.
mongodump \
    --uri="${MONGO_URI}" \
    --readPreference=secondary \
    --oplog \
    --gzip \
    --archive \
    --numParallelCollections=4 \
    | aws s3 cp - "${ARCHIVE}" --sse aws:kms

# Catat batas akhir backup agar PITR tahu dari mana replay boleh dimulai.
mongosh "${MONGO_URI}" --quiet \
    --eval 'db.getSiblingDB("local").oplog.rs.find().sort({$natural:-1}).limit(1).next().ts' \
    > "${TS}.oplog-ts"

echo "backup ${ARCHIVE} selesai pada $(cat "${TS}.oplog-ts")"
```

Streaming langsung ke object store menghilangkan kebutuhan disk lokal, tetapi juga berarti upload yang gagal tidak meninggalkan file parsial yang bisa direstore — `set -o pipefail` dan checksum upload adalah yang membuat cara ini aman.

### Langkah 3: Ambil snapshot fisik untuk dataset besar

Untuk deployment 500 GB, `mongodump` butuh berjam-jam; snapshot volume butuh beberapa detik. Journal WiredTiger membuat snapshot bersifat crash-consistent, sehingga member replica set bisa di-snapshot saat sedang berjalan.

```bash
# Snapshot level volume (contoh EBS). Beri tag agar kebijakan retensi berlaku.
aws ec2 create-snapshot \
    --volume-id "${VOL_ID}" \
    --description "mongo-${TS}" \
    --tag-specifications 'ResourceType=snapshot,Tags=[{Key=app,Value=payments},{Key=backup,Value=daily}]'
```

Pada node standalone, atau bila Anda butuh salinan identik byte per byte, pagar operasi tulis di sekitar snapshot alih-alih mengandalkan journal:

```javascript
// mongosh, user admin: memblokir penulisan; pembacaan masih boleh berjalan.
db.fsyncLock();
// ... ambil snapshot dari shell lain ...
db.fsyncUnlock();
```

### Langkah 4: Replay oplog untuk point-in-time recovery

PITR terdiri dari dua artefak: base (snapshot atau dump) dan jendela oplog. Restore base ke host sementara, lalu replay hingga tepat sebelum timestamp target.

```bash
# 1. Restore snapshot base ke host sementara dan jalankan mongod dengan --replSet.
#    Jangan hubungkan aplikasi ke host ini.

# 2. Ekstrak hanya entri oplog setelah base, sebagai oplog dump.
mongodump --uri="${MONGO_URI}" \
    --db=local --collection=oplog.rs \
    --query='{"ts": {"$gte": {"$timestamp": {"t": 1761955200, "i": 1}}}}' \
    --out=/restore/oplog_window

# 3. Replay sampai 2026-11-01T02:20:00Z (1761963600), eksklusif.
mongorestore --uri="mongodb://localhost:27017" \
    --oplogReplay \
    --oplogLimit=1761963600:1 \
    /restore/oplog_window
```

`--oplogLimit` menerima format `<detik>:<ordinal>`, sehingga replay berhenti tepat di antara dua operasi. Bila waktu target berada di luar jendela oplog, PITR tidak mungkin dilakukan — kembali ke base, terima kehilangan data, lalu perlebar oplog.

### Langkah 5: Restore dan verifikasi secara terisolasi

Selalu restore ke namespace berbeda lebih dulu. `--nsFrom` / `--nsTo` memungkinkan validasi tanpa menyentuh produksi.

```bash
mongorestore \
    --uri="${STAGING_URI}" \
    --gzip \
    --archive="${ARCHIVE}" \
    --nsFrom='shop.*' \
    --nsTo='verify_shop.*' \
    --stopOnError

mongosh "${STAGING_URI}" --quiet --eval '
    const src = db.getSiblingDB("shop");
    const dst = db.getSiblingDB("verify_shop");
    let gagal = false;
    src.getCollectionNames().forEach((name) => {
        const a = src.getCollection(name).countDocuments({});
        const b = dst.getCollection(name).countDocuments({});
        if (a !== b) { print(`${name}: ${a} != ${b}`); gagal = true; }
    });
    if (gagal) { quit(1); }
    print("restore terverifikasi: jumlah dokumen cocok");
'
```

Tambahkan perbandingan `dbHash` bila Anda butuh keyakinan tingkat byte, dan pastikan indeks ikut terbawa — restore yang kehilangan indeks akan lolos pemeriksaan jumlah dokumen namun gagal di produksi.

### Langkah 6: Gelar drill dan catat angkanya

Jadwalkan drill kuartalan yang me-restore data produksi ke staging, menjalankan aplikasi terhadapnya, dan mencatat waktu nyata dari "insiden dideklarasikan" sampai "query dilayani". Angka itulah RTO sesungguhnya; apa pun di runbook yang belum pernah diukur hanyalah perkiraan.

Backup ada untuk direstore, jadi perlakukan jalur restore sebagai produknya. Gabungkan kadensi snapshot yang rapat untuk RPO kecil dengan jendela oplog yang mencakup restore terlama Anda, pertahankan dump logis untuk portabilitas dan perpindahan antar versi, dan verifikasi setiap restore lewat hitungan, hash, serta keberadaan indeks. Rencana baru bisa dipercaya setelah drill menghasilkan RTO terukur — sebelum itu, Anda hanya punya file, bukan strategi pemulihan.

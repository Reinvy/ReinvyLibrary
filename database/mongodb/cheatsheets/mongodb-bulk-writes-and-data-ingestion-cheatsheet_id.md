---
title: "Cheat Sheet Bulk Write dan Ingestion Data MongoDB"
description: "Referensi praktis untuk penulisan MongoDB bervolume tinggi — operasi bulkWrite terkelompok, semantik ordered versus unordered, write concern, upsert idempoten, mode mongoimport dan mongoexport, ingestion $merge terkelompok, serta verifikasi data yang sudah dimuat."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Bulk Write dan Ingestion Data MongoDB

Memuat data dalam jumlah besar adalah disiplin yang berbeda dari CRUD biasa: biaya didominasi oleh round trip, pemeliharaan indeks, dan flush journal, bukan oleh dokumennya sendiri. Setiap entri di bawah ini menyasar knob di sisi driver dan sisi server yang menentukan bagaimana satu juta dokumen menjadi koleksi yang terisi — batas batch, semantik kegagalan, kontrak durabilitas, dan langkah verifikasi yang membuktikan muatan benar-benar masuk.

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Operasi campuran terkelompok | `db.orders.bulkWrite(ops, { ordered: false })` | Satu round trip untuk insert, update, dan delete |
| Eksekusi bulk berurutan | `db.orders.bulkWrite(ops, { ordered: true })` | Berhenti pada kegagalan pertama dan menjaga urutan |
| Batch insert besar | `db.orders.insertMany(docs, { ordered: false })` | Melewati dokumen yang gagal alih-alih membatalkan batch |
| Upsert di dalam bulk | `{ updateOne: { filter: f, update: u, upsert: true } }` | Membuat dokumen saat filter tidak menemukan apa pun |
| Penimpaan dokumen penuh | `{ replaceOne: { filter: f, replacement: r, upsert: true } }` | Mengganti seluruh dokumen, mempertahankan `_id` |
| Kontrak durabilitas | `{ writeConcern: { w: "majority", j: true } }` | Penulisan terjurnal dan diakui mayoritas |
| Perilaku retry | `retryWrites=true` pada URI koneksi | Mengulang setiap error retryable satu kali per operasi |
| Lewati validator | `{ bypassDocumentValidation: true }` | Jalan pintas khusus ingestion untuk `$jsonSchema` |
| Impor JSON Lines | `mongoimport --collection orders --file orders.jsonl` | Mode `insert` bawaan, gagal pada `_id` duplikat |
| Impor idempoten | `mongoimport --mode upsert --upsertFields orderId` | Aman dijalankan berulang terhadap natural key |
| Impor merge | `mongoimport --mode merge --upsertFields orderId` | Memperbarui field yang cocok, sisanya dibiarkan |
| Ekspor sebagian data | `mongoexport --query '{"status":"OPEN"}' --fields orderId,total` | Ekspor JSON yang dibatasi query |
| Stream ke koleksi | `{ $merge: { into: "orders", on: "orderId", whenMatched: "merge" } }` | Upsert di sisi server dari aggregation pipeline |
| Naikkan throughput impor | `--batchSize 100000 --numInsertionWorkers 4` | Round trip lebih sedikit, worker paralel |
| Restore paralel | `mongorestore --numInsertionWorkersPerCollection 4` | Restore koleksi secara bersamaan |
| Periksa proses muat | `db.currentOp({ "command.insert": { $exists: true } })` | Menemukan operasi tulis yang berjalan lama |

## Perintah Umum

### Mengimpor JSON Lines, JSON Array, dan CSV

```bash
# JSON Lines (satu dokumen per baris) adalah format bawaan dan paling cepat di-stream
mongoimport --uri "mongodb://localhost:27017/app" --collection orders --file orders.jsonl

# Satu array JSON memerlukan flag --jsonArray
mongoimport --uri "mongodb://localhost:27017/app" --collection orders \
  --file orders.json --jsonArray

# CSV dengan baris header eksplisit dan inferensi tipe dari file
mongoimport --uri "mongodb://localhost:27017/app" --collection orders \
  --type csv --headerline --file orders.csv
```

### Memuat Tanpa Menghapus Koleksi

```bash
# Upsert berdasarkan natural key agar pengulangan tidak menggandakan dokumen
mongoimport --uri "mongodb://localhost:27017/app" --collection orders \
  --file orders.jsonl --mode upsert --upsertFields orderId,region

# Merge hanya field yang ada di file, sisanya dipertahankan
mongoimport --uri "mongodb://localhost:27017/app" --collection orders \
  --file orders.jsonl --mode merge --upsertFields orderId

# Lewati validator $jsonSchema untuk muatan snapshot yang sudah tepercaya
mongoimport --uri "mongodb://localhost:27017/app" --collection orders \
  --file orders.jsonl --bypassDocumentValidation
```

### Mengekspor untuk Verifikasi

```bash
# Ekspor proyeksi terfilter, diurutkan agar diff dapat direproduksi
mongoexport --uri "mongodb://localhost:27017/app" --collection orders \
  --query '{"status":"OPEN"}' --fields orderId,total,status --sort '{"orderId":1}' \
  --out open-orders.json

# Ekspor CSV praktis untuk peninjauan tingkat spreadsheet
mongoexport --uri "mongodb://localhost:27017/app" --collection orders \
  --type csv --fields orderId,total,status --out orders.csv
```

### Merestore Snapshot dalam Skala Besar

```bash
# Restore dump dengan worker paralel per koleksi
mongorestore --uri "mongodb://localhost:27017" --drop \
  --numInsertionWorkersPerCollection 4 /backup/dump

# Ganti nama namespace saat restore (rehearsal staging sebelum produksi)
mongorestore --uri "mongodb://localhost:27017" \
  --nsFrom 'staging.orders' --nsTo 'app.orders' /backup/dump
```

### Memantau Progres dan Memastikan Muatan Masuk

```bash
# Tampilkan operasi tulis yang sedang berjalan, termasuk field progresnya
mongosh "mongodb://localhost:27017/admin" --eval \
  'db.currentOp({ active: true, "command.insert": { $exists: true } }).inprog.map(op => ({ ns: op.ns, progress: op.progress }))'

# Bandingkan jumlah yang dimuat dengan jumlah baris file sumber setelah muat penuh
mongosh "mongodb://localhost:27017/app" --eval 'db.orders.estimatedDocumentCount()'

# Gagalkan muatan lebih awal alih-alih menemukan batch tidak lengkap berjam-jam kemudian
mongoimport --uri "mongodb://localhost:27017/app" --collection orders \
  --file orders.jsonl --stopOnError
```

## Potongan Kode

### Batch Operasi Campuran

```javascript
const ops = [
  { insertOne: { document: { orderId: "A-1", total: 120, status: "OPEN" } } },
  { updateOne: { filter: { orderId: "A-2" }, update: { $set: { status: "SHIPPED" } } } },
  { replaceOne: { filter: { orderId: "A-3" }, replacement: { orderId: "A-3", total: 88, status: "OPEN" } } },
  { updateMany: { filter: { status: "PENDING" }, update: { $set: { status: "OPEN" } } } },
  { deleteOne: { filter: { orderId: "A-4" } } }
];

const result = db.orders.bulkWrite(ops, { ordered: false, writeConcern: { w: "majority" } });
printjson({
  inserted: result.insertedCount,
  matched: result.matchedCount,
  modified: result.modifiedCount,
  deleted: result.deletedCount
});
```

### Penanganan Kegagalan Ordered versus Unordered

```javascript
// ordered: true berhenti pada error pertama dan membiarkan sisanya tidak dijalankan
db.orders.bulkWrite([
  { insertOne: { document: { _id: 1 } } },
  { insertOne: { document: { _id: 1 } } }, // duplicate key
  { insertOne: { document: { _id: 2 } } }  // tidak pernah dieksekusi
], { ordered: true });

// ordered: false melanjutkan melewati kegagalan; yang berhasil tetap di-commit
const unordered = db.orders.bulkWrite([
  { insertOne: { document: { _id: 1 } } },
  { insertOne: { document: { _id: 1 } } },
  { insertOne: { document: { _id: 2 } } }
], { ordered: false });

printjson(unordered.writeErrors.map(e => ({ index: e.index, code: e.code })));
print(unordered.insertedCount); // 2
```

### Batch Upsert Idempoten

```javascript
// Menjalankan ulang batch ini konvergen ke state yang sama — aman untuk retry dan replay
function upsertBatch(docs) {
  const ops = docs.map(doc => ({
    updateOne: {
      filter: { orderId: doc.orderId },
      update: {
        $set: { ...doc, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },
      upsert: true
    }
  }));
  return db.orders.bulkWrite(ops, { ordered: false });
}

// Indeks unik mengubah double-insert tak sengaja menjadi error duplicate-key yang bisa ditangkap
db.orders.createIndex({ orderId: 1 }, { unique: true });
```

### Update Pipeline di Dalam Bulk Write

```javascript
// Update pipeline berjalan di sisi server: tanpa round trip read-modify-write
db.orders.bulkWrite([
  {
    updateOne: {
      filter: { orderId: "A-10" },
      update: [
        { $set: { total: { $add: ["$total", 15] } } },
        { $set: { tier: { $cond: [{ $gte: ["$total", 200] }, "gold", "standard"] } } }
      ]
    }
  }
], { ordered: false });
```

### Ingestion Streaming dengan $merge

```javascript
// Pipeline membaca dari staging dan merge ke produksi tanpa buffering di sisi klien
db.stagingOrders.aggregate([
  { $match: { ingestedAt: { $gte: new Date(Date.now() - 3600000) } } },
  { $project: { ingestedAt: 0 } },
  {
    $merge: {
      into: "orders",
      on: "orderId",
      let: { incoming: "$total" },
      whenMatched: [{ $set: { total: "$$incoming" } }],
      whenNotMatched: "insert"
    }
  }
]);
```

### Membagi Array Menjadi Batch di Driver Node.js

```javascript
async function loadInBatches(collection, docs, batchSize = 5000) {
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    try {
      await collection.insertMany(batch, { ordered: false });
    } catch (err) {
      // BulkWriteError membawa kegagalan per dokumen; duplikat wajar terjadi saat replay
      if (err.code !== 11000 && !err.writeErrors) throw err;
    }
  }
}
```

### Write Concern per Operasi

```javascript
// Durabilitas adalah kontrak per operasi: muatan bulk boleh mengorbankannya, ledger tidak
db.orders.bulkWrite(ops, {
  ordered: false,
  writeConcern: { w: 1, j: false, wtimeout: 30000 },
  bypassDocumentValidation: true
});

db.ledger.insertOne(entry, { writeConcern: { w: "majority", j: true } });
```

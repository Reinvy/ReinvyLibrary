---
title: "Membangun Pipeline Data Real-Time dengan MongoDB Change Streams"
description: "Tutorial komprehensif tentang penggunaan MongoDB Change Streams untuk membangun pipeline data reaktif dan berbasis peristiwa (event-driven) untuk aplikasi real-time, audit logging, cache invalidation, dan sinkronisasi lintas sistem."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Pipeline Data Real-Time dengan MongoDB Change Streams

## Ringkasan

Aplikasi modern perlu bereaksi terhadap perubahan data pada saat perubahan itu terjadi — bukan berdasarkan jadwal polling yang telah ditentukan. MongoDB Change Streams menyediakan mekanisme bawaan untuk berlangganan (*subscribe*) perubahan data secara real-time di level koleksi, database, atau deployment. Tutorial ini mencakup siklus lengkap pembangunan pipeline change stream yang siap produksi: membuka dan melanjutkan stream, memfilter dan mentransformasi peristiwa perubahan, menangani kegagalan dengan baik, dan mengintegrasikannya dengan sistem hilir seperti Elasticsearch, Redis, dan antrean pesan. Pada akhir tutorial, Anda akan telah membangun pipeline data real-time yang toleran terhadap kegagalan menggunakan Node.js dan MongoDB.

## Target Audiens

- Backend developer dan data engineer yang membangun sistem reaktif dan berbasis peristiwa.
- Pengguna MongoDB yang ingin beralih dari sinkronisasi berbasis polling.
- Developer dengan pengalaman MongoDB dan Node.js tingkat menengah.

## Prasyarat

- MongoDB 4.0+ (replica set atau sharded cluster — Change Streams membutuhkan replikasi).
- Node.js 18+ terinstal.
- Instance MongoDB yang berjalan dengan replica set (satu node cukup untuk pengembangan).
- Pemahaman dasar tentang operasi CRUD MongoDB dan MongoDB Node.js driver.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membuka dan mengelola Change Streams pada koleksi, database, dan deployment.
- Menggunakan resume token untuk pemulihan stream yang toleran terhadap kegagalan.
- Memfilter dan mentransformasi peristiwa perubahan menggunakan pipeline agregasi `$match` dan `$project`.
- Membangun pipeline audit log yang mencatat setiap mutasi data dengan *snapshot* sebelum dan sesudah.
- Membangun sistem cache invalidation yang memperbarui Redis ketika dokumen MongoDB berubah.
- Menangani error, *back-pressure*, dan kelanjutan stream di lingkungan produksi.

## Konteks dan Motivasi

Dalam tumpukan aplikasi web pada umumnya, data tersimpan di MongoDB dan disajikan ke klien melalui API. Ketika sebuah dokumen diperbarui, API membaca data terbaru dan mengembalikannya. Ini berfungsi dengan baik untuk skenario *request-response*, tetapi banyak kebutuhan dunia nyata menuntut perilaku reaktif secara instan:

- **Sinkronisasi indeks pencarian**: Ketika harga produk berubah di MongoDB, Elasticsearch harus diperbarui dalam hitungan detik.
- **Cache invalidation**: Cache Redis yang menyimpan daftar produk populer perlu disegarkan ketika data MongoDB yang mendasarinya berubah.
- **Audit logging**: Setiap operasi INSERT, UPDATE, dan DELETE harus dicatat dengan stempel waktu, identitas pengguna, dan *snapshot* sebelum/sesudah untuk kepatuhan.
- **Dashboard real-time**: Dashboard pemantauan harus menampilkan metrik langsung (pesanan per detik, tingkat kesalahan) secara instan.
- **Notifikasi lintas layanan**: Ketika email pengguna berubah, layanan hilir (CRM, billing, pemasaran) perlu diberi tahu.

Sebelum Change Streams, skenario ini memerlukan polling berkala (`db.collection.find({ updatedAt: { $gt: lastPoll } })`), yang menimbulkan latensi, membuang sumber daya database pada kueri berulang, dan sering melewatkan perubahan yang terjadi di antara interval polling. Change Streams memecahkan masalah ini dengan mendorong peristiwa perubahan ke konsumen saat terjadi, menggunakan oplog MongoDB sebagai mekanisme yang mendasarinya. Ini memberikan reaktivitas real-time dengan overhead minimal, jaminan pengiriman terurut, dan semantik *at-least-once* jika dikombinasikan dengan resume token.

## Konten Inti

### Memahami Arsitektur Change Streams

Change Streams bekerja dengan mengikuti **oplog** MongoDB (log operasi), yaitu koleksi *capped* yang mencatat setiap operasi tulis pada node utama (*primary*) dari sebuah replica set. Ketika Anda membuka Change Stream, MongoDB mengembalikan kursor yang menghasilkan peristiwa perubahan saat ditulis ke oplog.

```text
┌─────────────┐   Operasi Tulis    ┌──────────┐
│  Aplikasi   │ ──────────────────►│  MongoDB  │
│  (insert/   │                    │  Primary  │
│   update/   │                    └────┬──────┘
│   delete)   │                         │
└─────────────┘                         │ menulis ke oplog
                                         ▼
                                ┌────────────────┐
                                │     Oplog      │
                                │ (capped coll)  │
                                └───────┬────────┘
                                         │ diikuti oleh
                                         ▼
                                ┌────────────────┐
                                │ Change Stream  │
                                │    Cursor      │
                                └───────┬────────┘
                                         │ memancarkan event
                                         ▼
                                ┌────────────────┐
                                │   Konsumen     │
                                │ (cache, search,│
                                │  audit, dll.)  │
                                └────────────────┘
```

Properti utama Change Streams:

- **Urutan (*Ordering*)**: Peristiwa diurutkan dalam satu shard. Untuk pemrosesan terurut di seluruh shard, stream setiap shard dikonsumsi secara independen.
- **Ketahanan (*Durability*)**: Peristiwa hanya dipancarkan setelah operasi tulis dikomit ke mayoritas replica set (atau *write concern* yang dikonfigurasi).
- **Dapat dilanjutkan (*Resumability*)**: Setiap peristiwa membawa token `_data` yang dapat digunakan untuk melanjutkan stream jika konsumen crash.
- **Penyaringan (*Filtering*)**: Anda dapat menerapkan tahap agregasi `$match` dan `$project` untuk memfilter dan membentuk peristiwa sebelum mencapai konsumen.

### Membuka Change Stream

Change Streams dibuka menggunakan metode `watch()` pada koleksi, database, atau `MongoClient`. Cakupan (*scope*) menentukan peristiwa mana yang diterima:

```javascript
import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
const db = client.db("shop");
const products = db.collection("products");

// Level koleksi — hanya peristiwa di 'products'
const collectionStream = products.watch();

// Level database — peristiwa di semua koleksi dalam 'shop'
const dbStream = db.watch();

// Level deployment — peristiwa di semua koleksi di semua database
const clientStream = client.watch();
```

Setiap panggilan `watch()` mengembalikan objek `ChangeStream` yang berperilaku seperti kursor *async iterable*:

```javascript
for await (const change of collectionStream) {
  console.log("Perubahan terdeteksi:", change.operationType, change.documentKey);
}
```

### Anatomi Peristiwa Perubahan

Setiap peristiwa perubahan memiliki struktur berikut:

```javascript
{
  _id: { _data: "826F...0100000001" },    // Resume token
  operationType: "insert",                 // insert | update | replace | delete | drop | ...
  clusterTime: Timestamp({ t: 1719000000, i: 1 }),
  ns: { db: "shop", coll: "products" },    // Namespace
  documentKey: { _id: ObjectId("...") },   // _id dokumen
  fullDocument: { /* ... */ },             // Dokumen lengkap (untuk insert/replace, atau jika opsi fullDocument disetel)
  updateDescription: {                      // Untuk operasi update
    updatedFields: { price: 29.99 },
    removedFields: ["oldField"],
    truncatedArrays: []
  }
}
```

Field `operationType` memberi tahu jenis operasi tulis yang terjadi:

| operationType | Deskripsi | fullDocument? | updateDescription? |
|---|---|---|---|
| `insert` | Dokumen baru dibuat | ✅ Dokumen baru | ❌ |
| `update` | Dokumen yang ada dimodifikasi | Opsional | ✅ |
| `replace` | Dokumen diganti melalui `replaceOne()` | ✅ Dokumen baru | ❌ |
| `delete` | Dokumen dihapus | ❌ | ❌ |
| `drop` | Koleksi dihapus | ❌ | ❌ |
| `invalidate` | Stream tidak valid (koleksi dihapus/ diganti nama) | ❌ | ❌ |

### Resume Token dan Toleransi Kegagalan

Resume token (`_id._data`) adalah field paling penting untuk pipeline produksi. Ini adalah string yang di-encode dengan Base64 yang mengenkode stempel waktu oplog dan pengidentifikasi operasi. Jika konsumen Anda crash, Anda dapat menyimpan token ini dan menggunakannya untuk melanjutkan dari posisi terakhir:

```javascript
let resumeToken = null;

const options = {};
if (resumeToken) {
  options.resumeAfter = resumeToken;
}

const stream = products.watch([], options);

for await (const change of stream) {
  // Proses peristiwa
  await processEvent(change);

  // Simpan resume token setelah pemrosesan berhasil
  resumeToken = change._id;
  await saveResumeToken(resumeToken);
}
```

**Penting**: Hanya simpan resume token *setelah* peristiwa berhasil diproses sepenuhnya. Jika Anda menyimpannya sebelum pemrosesan dan kemudian crash, Anda akan melewatkan peristiwa saat restart. Ini adalah jaminan pengiriman *at-least-once* — Anda mungkin memproses ulang peristiwa setelah crash, tetapi Anda tidak akan pernah kehilangan satu pun.

Menyimpan resume token di koleksi MongoDB adalah pilihan yang alami:

```javascript
async function saveResumeToken(token) {
  await db.collection("pipeline_metadata").updateOne(
    { _id: "change_stream_resume_token" },
    { $set: { token, updatedAt: new Date() } },
    { upsert: true }
  );
}

async function loadResumeToken() {
  const doc = await db.collection("pipeline_metadata").findOne(
    { _id: "change_stream_resume_token" }
  );
  return doc ? doc.token : null;
}
```

### Memfilter dan Mentransformasi Peristiwa dengan Pipeline Agregasi

Anda dapat memberikan pipeline agregasi ke `watch()` untuk memfilter dan membentuk peristiwa sebelum mencapai konsumen. Ini lebih efisien daripada memfilter di kode aplikasi karena MongoDB menerapkan pipeline sebelum mengirim data melalui jaringan.

```javascript
// Hanya bereaksi terhadap pembaruan harga pada produk
const pipeline = [
  {
    $match: {
      operationType: { $in: ["insert", "update", "replace"] },
      "ns.coll": "products",
      "updateDescription.updatedFields.price": { $exists: true }
    }
  },
  {
    $project: {
      operationType: 1,
      "documentKey._id": 1,
      "fullDocument.name": 1,
      "fullDocument.price": 1,
      "updateDescription.updatedFields.price": 1
    }
  }
];

const stream = products.watch(pipeline);
```

Pola filter yang umum:

```javascript
// 1. Hanya jenis operasi tertentu
{ $match: { operationType: { $in: ["insert", "update"] } } }

// 2. Hanya koleksi tertentu (untuk stream level database)
{ $match: { "ns.coll": { $in: ["orders", "products"] } } }

// 3. Field tertentu yang diperbarui
{ $match: { "updateDescription.updatedFields.status": { $exists: true } } }

// 4. Dokumen yang memenuhi kondisi (menggunakan $match dengan fullDocument)
{ $match: { "fullDocument.tenantId": "abc123" } }
```

Catatan: `$match` pada `fullDocument` hanya berfungsi ketika `fullDocument` tersedia (insert, replace, atau ketika opsi `fullDocument: "updateLookup"` disetel).

## Contoh Kode

### Contoh 1: Pipeline Audit Log Real-Time

Pipeline ini menangkap setiap mutasi data di koleksi `orders` dan mencatat jejak audit permanen dengan *snapshot* sebelum dan sesudah.

```javascript
import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
const db = client.db("shop");
const orders = db.collection("orders");

// Buka change stream dengan 'updateLookup' untuk mendapatkan dokumen lengkap pada update
const stream = orders.watch(
  [
    {
      $match: {
        operationType: { $in: ["insert", "update", "delete"] }
      }
    }
  ],
  { fullDocument: "updateLookup" }
);

for await (const change of stream) {
  const auditEntry = {
    timestamp: new Date(),
    operationType: change.operationType,
    collection: change.ns.coll,
    documentId: change.documentKey._id,
    userId: change.fullDocument?.modifiedBy || change.fullDocument?.createdBy || "system"
  };

  if (change.operationType === "update") {
    auditEntry.changes = {
      updatedFields: change.updateDescription.updatedFields,
      removedFields: change.updateDescription.removedFields
    };
  }

  if (change.operationType === "insert") {
    auditEntry.snapshot = change.fullDocument;
  }

  if (change.operationType === "delete") {
    // Untuk delete, fullDocument adalah null — simpan apa yang diketahui
    auditEntry.note = "Dokumen dihapus";
  }

  // Masukkan catatan audit
  await db.collection("audit_log").insertOne(auditEntry);
  console.log(`Audit tercatat: ${change.operationType} pada pesanan ${change.documentKey._id}`);
}
```

### Contoh 2: Cache Invalidation dengan Redis

Ketika data produk berubah di MongoDB, pipeline ini membatalkan entri cache Redis yang sesuai sehingga pembacaan berikutnya mengambil data segar:

```javascript
import { MongoClient } from "mongodb";
import { createClient } from "redis";

const mongo = new MongoClient("mongodb://localhost:27017");
await mongo.connect();
const db = mongo.db("shop");

const redis = createClient({ url: "redis://localhost:6379" });
await redis.connect();

const productsStream = db.collection("products").watch(
  [
    {
      $match: {
        operationType: { $in: ["update", "delete", "replace"] }
      }
    }
  ],
  { fullDocument: "updateLookup" }
);

for await (const change of productsStream) {
  const productId = change.documentKey._id.toString();

  // Pola cache yang akan diinvalidasi
  const cacheKeys = [
    `product:${productId}`,                                      // Produk tunggal
    `product:${productId}:details`,                               // Halaman detail produk
    "products:featured",                                          // Daftar produk unggulan
    "products:latest",                                            // Daftar produk terbaru
  ];

  // Tangani invalidasi khusus kategori untuk update yang mengubah kategori
  if (change.operationType === "update") {
    const changedFields = change.updateDescription?.updatedFields || {};
    if (changedFields.category) {
      cacheKeys.push("products:category:*");  // Invalidasi wildcard
    }
  }

  // Hapus semua kunci cache yang cocok
  for (const key of cacheKeys) {
    if (key.endsWith("*")) {
      // Penghapusan berbasis pola menggunakan SCAN
      let cursor = 0;
      do {
        const result = await redis.scan(cursor, { MATCH: key });
        cursor = result.cursor;
        if (result.keys.length > 0) {
          await redis.del(result.keys);
        }
      } while (cursor !== 0);
    } else {
      await redis.del(key);
    }
  }

  console.log(`Cache diinvalidasi untuk produk ${productId}`);
}
```

### Contoh 3: Persistensi Resume Token untuk Pemulihan Crash

Konsumen stream siap produksi yang bertahan dari restart dan gangguan jaringan:

```javascript
import { MongoClient } from "mongodb";

const MONGO_URI = "mongodb://localhost:27017";
const client = new MongoClient(MONGO_URI);

async function startConsumer() {
  await client.connect();
  const db = client.db("shop");

  // Muat resume token terakhir yang diketahui
  const metadata = db.collection("pipeline_metadata");
  const lastToken = await metadata.findOne(
    { _id: "order_pipeline_token" }
  );

  let resumeToken = lastToken?.token || null;

  // Lacak kesalahan berurutan untuk circuit-breaking
  let errorCount = 0;
  const MAX_ERRORS = 10;

  while (true) {
    try {
      const options = {};
      if (resumeToken) {
        options.resumeAfter = resumeToken;
      }

      console.log(`Memulai change stream ${resumeToken ? "(melanjutkan)" : "(baru)"}`);
      const stream = db.collection("orders").watch([], options);

      errorCount = 0; // Reset penghitung kesalahan pada koneksi berhasil

      for await (const change of stream) {
        try {
          // --- Proses peristiwa ---
          await processOrderEvent(change);

          // --- Simpan resume token HANYA setelah pemrosesan berhasil ---
          resumeToken = change._id;
          await metadata.updateOne(
            { _id: "order_pipeline_token" },
            { $set: { token: resumeToken, updatedAt: new Date() } },
            { upsert: true }
          );

          errorCount = 0; // Reset pada keberhasilan
        } catch (processError) {
          console.error("Gagal memproses peristiwa:", processError);
          // Catat peristiwa yang gagal untuk replay manual
          await db.collection("failed_events").insertOne({
            event: change,
            error: processError.message,
            timestamp: new Date()
          });
        }
      }
    } catch (streamError) {
      errorCount++;
      console.error(`Kesalahan stream (${errorCount}/${MAX_ERRORS}):`, streamError.message);

      if (errorCount >= MAX_ERRORS) {
        console.error("Maksimum kesalahan berurutan tercapai. Keluar.");
        // Kirim peringatan (PagerDuty, Slack, email, dll.)
        break;
      }

      // Exponential backoff sebelum reconnect
      const backoff = Math.min(1000 * Math.pow(2, errorCount), 30000);
      console.log(`Menghubungkan kembali dalam ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
}

async function processOrderEvent(change) {
  switch (change.operationType) {
    case "insert":
      console.log(`Pesanan baru: ${change.documentKey._id}`);
      // Kirim ke sistem fulfillment, perbarui dashboard, dll.
      break;
    case "update":
      if (change.updateDescription?.updatedFields?.status) {
        console.log(
          `Status pesanan ${change.documentKey._id} berubah menjadi ` +
          `${change.updateDescription.updatedFields.status}`
        );
        // Picu tindakan khusus status (pengiriman, refund, dll.)
      }
      break;
    case "delete":
      console.log(`Pesanan ${change.documentKey._id} dihapus`);
      // Bersihkan referensi di sistem lain
      break;
  }
}

startConsumer().catch(console.error);
```

### Contoh 4: Pipeline Lengkap — Sinkronisasi Indeks Elasticsearch

Jaga sinkronisasi indeks produk Elasticsearch dengan MongoDB secara real-time:

```javascript
import { MongoClient } from "mongodb";
import { Client } from "@elastic/elasticsearch";

const mongo = new MongoClient("mongodb://localhost:27017");
const es = new Client({ node: "http://localhost:9200" });

await mongo.connect();
const db = mongo.db("shop");
const products = db.collection("products");

const stream = products.watch(
  [{ $match: { operationType: { $in: ["insert", "update", "replace", "delete"] } } }],
  { fullDocument: "updateLookup" }
);

for await (const change of stream) {
  const id = change.documentKey._id.toString();

  switch (change.operationType) {
    case "insert":
    case "replace":
      await es.index({
        index: "products",
        id,
        document: {
          name: change.fullDocument.name,
          description: change.fullDocument.description,
          price: change.fullDocument.price,
          category: change.fullDocument.category,
          tags: change.fullDocument.tags,
          inStock: change.fullDocument.inStock,
          updatedAt: change.fullDocument.updatedAt
        }
      });
      break;

    case "update":
      // Bangun dokumen pembaruan parsial dari field yang berubah
      const updatedFields = change.updateDescription?.updatedFields || {};
      if (Object.keys(updatedFields).length > 0) {
        await es.update({
          index: "products",
          id,
          doc: updatedFields
        });
      }
      break;

    case "delete":
      await es.delete({ index: "products", id }).catch(() => {
        // Abaikan jika dokumen sudah dihapus di ES
      });
      break;
  }

  console.log(`Sinkronisasi ES: ${change.operationType} produk ${id}`);
}
```

## Insight Penting

- **Selalu simpan resume token setelah pemrosesan, bukan sebelumnya**: Menyimpan token sebelum pekerjaan selesai menciptakan celah di mana crash menyebabkan peristiwa terlewatkan. Pola "setelah pemrosesan" menjamin pengiriman *at-least-once*.
- **Gunakan `updateLookup` dengan bijak**: Opsi `fullDocument: "updateLookup"` menyebabkan MongoDB membaca dokumen lengkap pada setiap peristiwa update, menambah latensi. Aktifkan hanya ketika Anda memerlukan status dokumen saat ini untuk pemrosesan.
- **Filter secara agresif di pipeline, bukan di kode aplikasi**: Tahap `$match` di awal pipeline watch mengurangi lalu lintas jaringan dan beban CPU konsumen secara signifikan, terutama untuk stream level database atau deployment.
- **Change Streams membutuhkan replica set**: Bahkan dalam pengembangan, Anda memerlukan setidaknya replica set satu node. Standalone `mongod` tidak memiliki oplog dan tidak dapat mendukung Change Streams.
- **Peristiwa `invalidate` menghentikan stream**: Menghapus koleksi atau database menyebabkan peristiwa `invalidate` yang menutup stream. Anda harus membuka kembali stream setelah koleksi dibuat ulang.
- **Batch processing meningkatkan throughput**: Untuk pipeline volume tinggi (ribuan peristiwa per detik), kumpulkan peristiwa menggunakan jendela waktu (misalnya 100ms) sebelum menulis ke sistem hilir. Ini mengamortisasi *round-trip* jaringan dan overhead penulisan database.
- **Pantau jendela oplog**: Change Streams hanya dapat melanjutkan jika oplog masih berisi entri resume token. Pantau `rs.printReplicationInfo()` untuk memastikan ukuran oplog cukup besar untuk jendela *downtime* yang diharapkan. Oplog yang terlalu kecil menyebabkan kesalahan `ChangeStreamHistoryLost`.

## Langkah Berikutnya

- Jelajahi MongoDB Realm Triggers (Change Streams serverless untuk pengguna Atlas) sebagai alternatif terkelola untuk konsumen kustom.
- Pelajari tutorial [MongoDB Aggregation Pipeline](mongodb-aggregation-pipeline) untuk teknik transformasi peristiwa tingkat lanjut.
- Gabungkan Change Streams dengan Redis streams untuk arsitektur pemrosesan peristiwa multi-tahap.
- Pelajari tentang Change Streams pada sharded cluster dan jaminan urutan (atau ketiadaannya) di seluruh shard.

## Kesimpulan

MongoDB Change Streams menyediakan mekanisme bawaan yang kuat untuk membangun pipeline data reaktif dan berbasis peristiwa tanpa memerlukan *message broker* eksternal. Dengan memanfaatkan oplog, resume token, dan filter pipeline agregasi, Anda dapat membangun konsumen yang toleran terhadap kegagalan untuk menyinkronkan indeks pencarian, membatalkan cache, memelihara log audit, dan memicu notifikasi real-time — semuanya dengan jaminan pengiriman *at-least-once*. Pola-pola yang dibahas dalam tutorial ini — persistensi resume token, penanganan kesalahan dengan *exponential backoff*, *batch processing*, dan integrasi sistem hilir — adalah fondasi dari setiap pipeline Change Stream tingkat produksi.

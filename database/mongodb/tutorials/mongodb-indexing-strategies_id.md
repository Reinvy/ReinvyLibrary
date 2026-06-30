---
title: "Strategi Indexing MongoDB dan Optimasi Performa Query"
description: "Panduan komprehensif tentang indexing MongoDB yang mencakup tipe index, optimasi query dengan explain(), desain compound index, dan strategi tuning performa di dunia nyata."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Strategi Indexing MongoDB dan Optimasi Performa Query

## Ringkasan

Tutorial ini membahas indexing MongoDB secara mendalam — mulai dari single-field index hingga compound, multikey, text, dan geospatial index. Anda akan mempelajari cara menganalisis performa query dengan `explain()`, merancang strategi index yang efektif, menghindari jebakan umum, dan mengoptimalkan database Anda untuk beban kerja nyata. Pada akhirnya, Anda akan mampu mengidentifikasi query lambat, membuat index yang efisien, dan menjaga cluster MongoDB Anda tetap berjalan pada performa puncak.

## Target Audiens

- Backend Developer, Database Administrator, dan insinyur DevOps yang bekerja dengan MongoDB.
- Level menengah: nyaman dengan operasi CRUD dasar MongoDB dan shell MongoDB.

## Prasyarat

- MongoDB terinstal secara lokal (versi 5.0+) atau akses ke MongoDB Atlas.
- Sesi `mongosh` yang berjalan dengan database sampel yang dimuat.
- Keakraban dasar dengan `db.collection.find()`, `db.collection.aggregate()`, dan struktur dokumen MongoDB.
- Pemahaman tentang tipe data BSON.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Mengidentifikasi query lambat menggunakan profiler MongoDB dan output `explain()`.
- Memilih tipe index yang tepat untuk pola query yang berbeda (single-field, compound, multikey, text, geospatial, hashed).
- Merancang compound index mengikuti aturan ESR (Equality-Sort-Range).
- Menginterpretasikan hasil `explain()` — `COLLSCAN` vs `IXSCAN`, statistik eksekusi, dan batasan index.
- Menerapkan properti index seperti `unique`, `sparse`, `partial`, dan `hidden` untuk memecahkan masalah nyata.
- Mengelola index di production: membuat, menghapus, membangun ulang, merilis, dan memantau.
- Menghindari jebakan indexing umum (over-indexing, urutan field salah, query case-insensitive).

## Konteks dan Motivasi

Seiring pertumbuhan aplikasi MongoDB Anda, query yang sebelumnya kembali dalam milidetik bisa melambat menjadi beberapa detik. Tanpa indexing yang tepat, setiap query menyebabkan **collection scan** (`COLLSCAN`) — MongoDB harus memeriksa setiap dokumen dalam koleksi untuk menemukan kecocokan. Koleksi 10 GB dengan `COLLSCAN` membaca 10 GB data dari disk untuk satu query.

Index mengatasi ini dengan memelihara struktur data terurut (B-tree) pada satu atau lebih field. Alih-alih memindai setiap dokumen, MongoDB melintasi index untuk menemukan dokumen yang cocok secara langsung. Index yang dirancang dengan baik dapat mengurangi waktu query dari detik menjadi mikrodetik.

Namun, index memiliki konsekuensi:
- **Overhead penulisan**: Setiap `INSERT`, `UPDATE`, dan `DELETE` harus memperbarui semua index pada koleksi.
- **Konsumsi memori**: Index disimpan di RAM untuk akses cepat; index besar meningkatkan working set.
- **Kompleksitas pemilihan index**: Query planner mungkin memilih index yang suboptimal jika index Anda dirancang dengan buruk.

Tutorial ini mengajarkan Anda untuk menavigasi konsekuensi ini dan membangun index yang membuat query Anda cepat tanpa membuang sumber daya.

## Konten Inti

### Memahami Dasar Index

Index di MongoDB adalah struktur data yang menyimpan subset kecil dari data koleksi — yaitu, nilai dari satu atau lebih field dan pointer ke dokumen yang sesuai. MongoDB menggunakan struktur **B-tree** yang mendukung pencocokan equality, query rentang, dan hasil terurut secara efisien.

```javascript
// Memeriksa index yang ada pada koleksi
db.users.getIndexes()

// Membuat single-field index sederhana
db.users.createIndex({ email: 1 })

// Arah index: 1 = ascending, -1 = descending
db.users.createIndex({ createdAt: -1 })
```

### Tipe-tipe Index

#### Single-Field Index

Tipe index paling dasar. Gunakan ketika query memfilter atau mengurutkan berdasarkan satu field.

```javascript
// Membuat single-field index pada field "status"
db.orders.createIndex({ status: 1 })

// Query ini akan menggunakan index:
db.orders.find({ status: "shipped" }).sort({ createdAt: -1 })

// Tanpa index pada status, query memindai semua dokumen
```

**Kapan digunakan**: Pola pencarian sederhana, filter status, dan pengurutan berdasarkan satu atribut.

#### Compound Index

Compound index mencakup beberapa field. **Urutan field sangat penting** untuk performa query.

```javascript
// Compound index pada (status, createdAt)
db.orders.createIndex({ status: 1, createdAt: -1 })

// Query yang dilayani secara efisien:
db.orders.find({ status: "shipped" }).sort({ createdAt: -1 })
db.orders.find({ status: "shipped", createdAt: { $gte: ISODate("2026-01-01") } })

// Query yang hanya dapat menggunakan sebagian index (prefix):
db.orders.find({ status: "shipped" }) // hanya menggunakan prefix "status"
```

**Aturan ESR**: Rancang compound index dengan menempatkan field dalam urutan ini:
1. **E**quality fields — field yang diperiksa dengan pencocokan tepat (`=`, `$eq`)
2. **S**ort fields — field yang digunakan dalam `sort()`
3. **R**ange fields — field yang digunakan dengan operator rentang (`$gt`, `$lt`, `$gte`, `$lte`, `$in`)

```javascript
// Query: cari user aktif di kota, diurutkan berdasarkan tanggal registrasi
db.users.find({ status: "active", city: "Jakarta" }).sort({ registeredAt: -1 })

// Compound index yang dioptimalkan dengan ESR:
db.users.createIndex({ status: 1, city: 1, registeredAt: -1 })
// Equality: status, city
// Sort: registeredAt
```

#### Multikey Index

Multikey index dibuat secara otomatis ketika Anda mengindex field yang berisi array. MongoDB membuat entri index untuk setiap elemen dalam array.

```javascript
// Dokumen: { tags: ["mongodb", "database", "nosql"] }
db.articles.createIndex({ tags: 1 })

// Query menggunakan multikey index:
db.articles.find({ tags: "mongodb" })

// Compound multikey index — hanya SATU field yang boleh berupa array
db.articles.createIndex({ tags: 1, publishedAt: -1 })
```

**Keterbatasan**: Compound index dapat memiliki paling banyak satu multikey field. Setiap elemen array yang diindex adalah entri index terpisah, sehingga array besar meningkatkan ukuran index secara signifikan.

#### Text Index

Text index mendukung pencarian konten string dengan tokenisasi, stemming, dan penghapusan stop-word.

```javascript
// Membuat text index pada field "content"
db.articles.createIndex({ content: "text" })

// Atau compound text index mencakup beberapa field
db.articles.createIndex({ title: "text", content: "text" })

// Query pencarian teks:
db.articles.find({ $text: { $search: "tutorial indexing mongodb" } })

// Dengan pengurutan skor relevansi:
db.articles.find(
  { $text: { $search: "performa mongodb" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

#### Geospatial Index

Mendukung query geospasial melalui index `2dsphere` (untuk data GeoJSON pada bola) dan index `2d` (untuk koordinat planar).

```javascript
// Dokumen: { name: "Kafe", location: { type: "Point", coordinates: [106.822, -6.175] } }
db.places.createIndex({ location: "2dsphere" })

// Cari tempat terdekat (dalam 1 km):
db.places.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [106.822, -6.175] },
      $maxDistance: 1000
    }
  }
})
```

#### Hashed Index

Hashed index menyimpan hash dari nilai suatu field. Mendukung **pencocokan equality saja** dan terutama digunakan untuk **sharding** dengan hashed shard keys.

```javascript
// Membuat hashed index untuk sharding
db.logs.createIndex({ userId: "hashed" })

// Hanya mendukung query equality:
db.logs.find({ userId: 12345 }) // menggunakan hashed index
```

#### TTL (Time-To-Live) Index

TTL index secara otomatis menghapus dokumen setelah jumlah detik yang ditentukan.

```javascript
// Menghapus dokumen 7 hari (604800 detik) setelah timestamp createdAt
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 })
```

**Kasus penggunaan**: Kedaluwarsa sesi, pembersihan data sementara, retensi log event.

### Properti Index

#### Unique Index

Memastikan nilai yang diindex unik di seluruh koleksi.

```javascript
db.users.createIndex({ email: 1 }, { unique: true })
// Mencegah alamat email duplikat
```

#### Sparse Index

Hanya mengindex dokumen yang mengandung field yang diindex. Dokumen tanpa field tersebut tidak dimasukkan dalam index.

```javascript
// Hanya mengindex dokumen yang memiliki field "phone"
db.users.createIndex({ phone: 1 }, { sparse: true })
```

#### Partial Index

Hanya mengindex dokumen yang cocok dengan ekspresi filter. Lebih fleksibel dari sparse index.

```javascript
// Hanya mengindex pesanan dengan status "pending" atau "processing"
db.orders.createIndex(
  { createdAt: 1 },
  { partialFilterExpression: { status: { $in: ["pending", "processing"] } } }
)
```

#### Hidden Index

Hidden index tidak terlihat oleh query planner tetapi tetap dipelihara pada operasi tulis. Gunakan untuk mengevaluasi dampak menghapus index tanpa benar-benar menghapusnya.

```javascript
// Menyembunyikan index (evaluasi yang aman untuk production):
db.orders.hideIndex("status_1_createdAt_-1")

// Menampilkan kembali index:
db.orders.unhideIndex("status_1_createdAt_-1")
```

### Menganalisis Performa Query dengan explain()

Method `explain()` menyediakan informasi detail tentang bagaimana MongoDB mengeksekusi query.

```javascript
// Tiga mode verbositas:
db.orders.find({ status: "shipped" }).explain("queryPlanner")
db.orders.find({ status: "shipped" }).explain("executionStats")
db.orders.find({ status: "shipped" }).explain("allPlansExecution")
```

**Field kunci dalam output `explain("executionStats")`**:

```text
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "COLLSCAN",  // BURUK: pemindaian koleksi penuh
      // "stage": "IXSCAN", // BAIK: pemindaian index
    }
  },
  "executionStats": {
    "nReturned": 15000,
    "executionTimeMillis": 8234,
    "totalKeysExamined": 0,      // Entri index dipindai
    "totalDocsExamined": 500000, // Dokumen dipindai
  }
}
```

### Optimasi Query dengan Covered Queries

Query **covered** terjadi ketika semua field yang diperlukan sudah ada dalam index itu sendiri, sehingga MongoDB tidak perlu mengambil dokumen dari koleksi.

```javascript
// Membuat compound index yang mencakup query:
db.orders.createIndex({ status: 1, total: 1, _id: 1 })

// Query ini COVERED — semua data berasal dari index:
db.orders.find(
  { status: "shipped" },
  { total: 1, _id: 1 }
)
// explain() menampilkan: "stage": "PROJECTION_COVERED"
```

### Mengelola Index di Production

#### Statistik dan Monitoring Index

```javascript
// Mendaftar semua index:
db.orders.getIndexes()

// Ukuran index:
db.orders.totalIndexSize()

// Mengaktifkan profiler untuk menangkap query lambat:
db.setProfilingLevel(1, { slowms: 100 })

// Memeriksa penggunaan index:
db.orders.aggregate([
  { $indexStats: {} }
])
```

#### Pemeliharaan Index

```javascript
// Menghapus index yang tidak digunakan:
db.orders.dropIndex("status_1_createdAt_-1")

// Membangun ulang index (defragmentasi):
db.orders.reIndex()
// Catatan: reIndex() memblokir semua operasi
```

### Jebakan Indexing Umum

1. **Over-indexing**: Setiap index menambah overhead penulisan. MongoDB merekomendasikan **maksimal 5–7 index per koleksi**.

2. **Urutan field salah dalam compound index**: Selalu ikuti ESR. Menempatkan range field sebelum sort field memaksa MongoDB memindai lebih banyak entri index.

3. **Query case-insensitive tanpa index case-insensitive**:

```javascript
// Tidak efisien — Regex tidak dapat menggunakan index secara efisien:
db.users.find({ email: /^TEST@EXAMPLE.COM$/i })

// Efisien — Gunakan index case-insensitive:
db.users.createIndex({ email: 1 }, { collation: { locale: "en", strength: 2 } })
db.users.find({ email: "test@example.com" }).collation({ locale: "en", strength: 2 })
```

1. **Tidak menggunakan `hint()` ketika planner salah pilih**: Query planner umumnya andal tetapi bisa salah memilih index pada distribusi data yang miring.

2. **Mengabaikan ukuran index**: Index yang terlalu besar dan tidak muat di RAM memaksa pembacaan dari disk.

## Contoh Kode

### Contoh Lengkap: Sistem Pesanan E-Commerce

Contoh ini mendemonstrasikan penerapan strategi indexing untuk mengoptimalkan sistem pesanan e-commerce di dunia nyata.

```javascript
// Koleksi sampel: orders dengan 1M+ dokumen
// { _id: ObjectId, orderId: String, userId: String, status: String,
//   total: Number, items: Number, createdAt: Date, shippedAt: Date,
//   shippingAddress: { city: String, zip: String } }

// Langkah 1: Profil query lambat
db.setProfilingLevel(1, { slowms: 200 })

// Langkah 2: Analisis pola query paling umum
// Pola A: Dashboard — pesanan terbaru berdasarkan status, diurutkan tanggal
db.orders.find({ status: "pending" }).sort({ createdAt: -1 }).limit(20)

// Pola B: Pencarian pelanggan — pesanan berdasarkan userId
db.orders.find({ userId: "usr_abc123" }).sort({ createdAt: -1 })

// Pola C: Laporan pengiriman — pesanan terkirim berdasarkan rentang tanggal
db.orders.find({
  status: "shipped",
  shippedAt: { $gte: ISODate("2026-06-01"), $lte: ISODate("2026-06-30") }
}).sort({ shippedAt: 1 })

// Langkah 3: Desain index berdasarkan pola query
// Index untuk Pola A
db.orders.createIndex({ status: 1, createdAt: -1 })

// Index untuk Pola B
db.orders.createIndex({ userId: 1, createdAt: -1 })

// Index untuk Pola C
db.orders.createIndex({ status: 1, shippedAt: 1 })

// Langkah 4: Verifikasi dengan explain()
db.orders.find({ status: "pending" }).sort({ createdAt: -1 }).limit(20).explain("executionStats")

// Langkah 5: Monitoring efektivitas index
db.orders.aggregate([
  { $indexStats: {} },
  { $sort: { accesses: { ops: -1 } } }
])
```

### Visualisasi Penggunaan Index

```text
Collection Scan (COLLSCAN) — Tanpa Index:
+----------------------------------------------+
|  1 |    2 |    3 |    4 |  ...  |  500,000   |
+----------------------------------------------+
  500,000 dokumen dibaca -> 15,000 cocok -> lambat

Index Scan (IXSCAN) — Dengan B-tree Index:
+-------+-------+-------+-------+-------+
|  idx  |  idx  |  idx  |  idx  |  idx  |
+-------+-------+-------+-------+-------+
  15,000 entri index -> 15,000 dokumen diambil -> cepat
```

## Insight Penting

- **Selalu profiling sebelum indexing**: Gunakan `db.setProfilingLevel()` dan `explain("executionStats")` untuk mengidentifikasi query yang membutuhkan index. Menebak-nebak menyebabkan over-indexing.
- **Ikuti aturan ESR**: Tempatkan equality fields pertama, lalu sort fields, lalu range fields dalam compound index. Urutan field yang salah adalah kesalahan indexing paling umum.
- **Covered queries adalah yang tercepat**: Ketika semua field yang diproyeksikan ada di index, MongoDB tidak pernah menyentuh koleksi. Ini 10–100x lebih cepat dari query non-covered.
- **Satu multikey field per compound index**: Jika compound index mencakup lebih dari satu field array, MongoDB akan menolaknya.
- **Sembunyikan sebelum menghapus**: Gunakan `hideIndex()` di production untuk menguji dampak menghapus index tanpa risiko kehilangan data.
- **Partial index lebih unggul dari sparse index**: Partial index lebih fleksibel dan eksplisit.
- **Pembangunan index mempengaruhi performa**: Bahkan dengan non-blocking builds di MongoDB 4.2+, membangun index pada koleksi besar mengkonsumsi CPU dan I/O.

## Langkah Berikutnya

- Pelajari [MongoDB Aggregation Pipeline tutorial](/database/mongodb/tutorials/mongodb-aggregation-pipeline) untuk teknik transformasi data tingkat lanjut.
- Tinjau [Panduan Desain Skema dan Pemodelan Data MongoDB](/database/mongodb/guides/mongodb-schema-design-and-data-modeling-guide) untuk pola desain skema yang saling melengkapi.
- Pelajari tentang MongoDB Atlas Search untuk kemampuan pencarian teks lengkap tingkat production.
- Pertimbangkan [Silabus Pengembangan MongoDB](/database/mongodb/syllabi/mongodb-development-syllabus) untuk jalur pembelajaran terstruktur 12 minggu.

## Kesimpulan

Indexing MongoDB adalah seni sekaligus ilmu. Index yang tepat dapat mengubah query dari pemindaian koleksi multi-detik menjadi pencarian index sub-milidetik. Dalam tutorial ini, Anda mempelajari setiap tipe index yang ditawarkan MongoDB, cara merancang compound index menggunakan aturan ESR, cara menganalisis query dengan `explain()`, dan cara mengelola index dengan aman di production.

Ingat aturan emas: **ukur sebelum Anda mengindex dan ukur setelah Anda mengindex**. Profiler MongoDB dan output `explain()` adalah sahabat terbaik Anda. Mulailah dengan pola query yang paling sering, desain index menggunakan ESR, monitor penggunaan index dengan `$indexStats`, dan lakukan iterasi.

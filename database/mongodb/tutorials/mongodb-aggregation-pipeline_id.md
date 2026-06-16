---
title: "Pipeline Agregasi MongoDB: Tutorial Praktis"
description: "Panduan praktis tentang pipeline agregasi MongoDB yang mencakup tahapan, operator, transformasi data, dan kasus penggunaan analitik di dunia nyata."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Pipeline Agregasi MongoDB: Tutorial Praktis

## Ringkasan

Tutorial ini memandu Anda melalui Pipeline Agregasi MongoDB, sebuah kerangka kerja yang kuat untuk mentransformasi, memfilter, mengelompokkan, dan menganalisis data langsung di dalam database. Anda akan mempelajari cara merangkai tahapan pipeline, menggunakan operator inti seperti `$match`, `$group`, `$sort`, dan `$project`, serta membangun query pelaporan dunia nyata — semuanya melalui contoh praktis yang dapat dijalankan pada dataset sampel.

## Target Audiens

- Backend Developer dan Data Engineer yang bekerja dengan MongoDB.
- Level menengah: nyaman dengan operasi CRUD dasar MongoDB dan sintaks JavaScript.

## Prasyarat

- MongoDB terinstal secara lokal atau akses ke MongoDB Atlas (tingkat gratis sudah mencukupi).
- Shell `mongosh` atau MongoDB Compass yang berjalan.
- Pemahaman dasar tentang `db.collection.find()` dan struktur dokumen MongoDB.
- Dataset sampel sudah dimuat (petunjuk disediakan di bawah).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan bagaimana pipeline agregasi memproses dokumen melalui tahapan berurutan.
- Menggunakan `$match`, `$group`, `$sort`, `$project`, `$unwind`, `$lookup`, dan `$bucket` dalam query nyata.
- Membangun pipeline multi-tahapan untuk memfilter, mengelompokkan, mengubah bentuk, dan menggabungkan koleksi.
- Mengoptimalkan performa pipeline dengan urutan tahapan yang tepat dan penggunaan indeks.
- Menerapkan agregasi untuk menghasilkan laporan ringkasan dan analitik.

## Konteks dan Motivasi

Dalam aplikasi produksi, Anda jarang hanya menyimpan dan mengambil dokumen — Anda perlu menghitung rata-rata, menggabungkan data terkait, mengelompokkan catatan berdasarkan tanggal, atau menghasilkan dashboard ringkasan. Meskipun `find()` dengan filter sederhana cukup untuk pencarian dasar, transformasi data yang kompleks membutuhkan alat yang lebih ekspresif.

Pipeline Agregasi MongoDB memecahkan masalah ini dengan memproses dokumen melalui urutan **tahapan** yang teratur. Setiap tahapan mentransformasi aliran dokumen sebelum meneruskannya ke tahapan berikutnya. Model yang dapat dirangkai dan deklaratif ini memungkinkan Anda membangun apa pun, mulai dari hitungan yang difilter sederhana hingga laporan analitik multi-gabungan — semuanya di dalam database, tanpa memindahkan data ke lapisan aplikasi.

## Konten Inti

### Menyiapkan Data Sampel

Buat database bernama `shop` dan masukkan koleksi sampel pesanan berikut:

```javascript
use shop;

db.orders.insertMany([
  { _id: 1, customer: "Alice", items: ["laptop", "mouse"], total: 1200, status: "delivered", date: new Date("2025-01-15") },
  { _id: 2, customer: "Bob", items: ["keyboard", "monitor"], total: 450, status: "shipped", date: new Date("2025-01-20") },
  { _id: 3, customer: "Alice", items: ["headphones"], total: 80, status: "delivered", date: new Date("2025-02-01") },
  { _id: 4, customer: "Charlie", items: ["mouse", "mousepad"], total: 35, status: "cancelled", date: new Date("2025-02-05") },
  { _id: 5, customer: "Bob", items: ["webcam", "microphone"], total: 200, status: "delivered", date: new Date("2025-02-10") },
  { _id: 6, customer: "Diana", items: ["laptop"], total: 1500, status: "processing", date: new Date("2025-03-01") },
  { _id: 7, customer: "Alice", items: ["tablet", "case", "screen protector"], total: 520, status: "shipped", date: new Date("2025-03-05") },
  { _id: 8, customer: "Charlie", items: ["printer"], total: 180, status: "delivered", date: new Date("2025-03-10") },
  { _id: 9, customer: "Diana", items: ["keyboard"], total: 75, status: "delivered", date: new Date("2025-03-15") },
  { _id: 10, customer: "Eve", items: ["monitor", "webcam"], total: 350, status: "processing", date: new Date("2025-03-20") }
]);
```

### Anatomi Pipeline

Pipeline adalah sebuah **array** dari **tahapan**. Dokumen memasuki tahapan pertama, ditransformasi, dan hasilnya mengalir ke tahapan berikutnya. Anda menjalankan pipeline menggunakan `db.collection.aggregate()`:

```javascript
db.orders.aggregate([
  { $match: { status: "delivered" } },
  { $group: { _id: "$customer", totalSpent: { $sum: "$total" } } },
  { $sort: { totalSpent: -1 } }
]);
```

Pipeline ini:
1. **Memfilter** dokumen di mana `status` sama dengan `"delivered"`.
2. **Mengelompokkan** berdasarkan `customer` dan menjumlahkan field `total` mereka.
3. **Mengurutkan** hasil berdasarkan `totalSpent` secara menurun.

### Tahapan 1: `$match` — Memfilter Dokumen

`$match` memfilter aliran dokumen menggunakan sintaks query MongoDB. Tempatkan `$match` sedini mungkin — ini mengurangi jumlah dokumen yang mengalir melalui tahapan selanjutnya dan dapat menggunakan indeks.

```javascript
// Hanya pesanan dengan total > 100 dan status tidak dibatalkan
db.orders.aggregate([
  { $match: { total: { $gt: 100 }, status: { $ne: "cancelled" } } }
]);
```

**Tips performa**: Letakkan `$match` sebelum `$group` atau `$sort` untuk meminimalkan himpunan kerja.

### Tahapan 2: `$project` — Mengubah Bentuk Dokumen

`$project` memungkinkan Anda menyertakan, mengecualikan, atau menghitung field baru. Ini mirip dengan parameter proyeksi pada `find()` tetapi lebih kuat — Anda dapat membuat field yang dihitung menggunakan operator seperti `$concat`, `$toUpper`, dan `$dateToString`.

```javascript
db.orders.aggregate([
  { $match: { status: "delivered" } },
  { $project: {
      _id: 0,
      orderId: "$_id",
      customerUpper: { $toUpper: "$customer" },
      itemCount: { $size: "$items" },
      month: { $month: "$date" }
  }}
]);
```

### Tahapan 3: `$group` — Mengagregasi Data

`$group` adalah inti dari agregasi. Ini mengelompokkan dokumen berdasarkan ekspresi kunci (disetel ke `_id`) dan menerapkan operator akumulator ke setiap grup.

```javascript
// Total dan rata-rata nilai pesanan per pelanggan
db.orders.aggregate([
  { $group: {
      _id: "$customer",
      orderCount: { $sum: 1 },
      totalSpent: { $sum: "$total" },
      avgOrderValue: { $avg: "$total" },
      minOrder: { $min: "$total" },
      maxOrder: { $max: "$total" }
  }},
  { $sort: { totalSpent: -1 } }
]);
```

**Akumulator umum**: `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push` (mengumpulkan nilai ke dalam array), `$addToSet` (nilai unik).

### Tahapan 4: `$sort` dan `$limit` — Pengurutan dan Paginasi

`$sort` mengurutkan dokumen berdasarkan field. `$limit` membatasi jumlah dokumen. Bersama-sama mereka berguna untuk query N-teratas.

```javascript
// 3 pelanggan teratas berdasarkan total pengeluaran
db.orders.aggregate([
  { $group: { _id: "$customer", totalSpent: { $sum: "$total" } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 3 }
]);
```

### Tahapan 5: `$unwind` — Meratakan Array

Ketika sebuah dokumen berisi field array, `$unwind` membuat satu dokumen per elemen array. Ini penting untuk menganalisis data array.

```javascript
// Menghitung berapa kali setiap produk dipesan
db.orders.aggregate([
  { $unwind: "$items" },
  { $group: { _id: "$items", orderCount: { $sum: 1 } } },
  { $sort: { orderCount: -1 } }
]);
```

Catatan: Jika dokumen memiliki array `items` kosong, `$unwind` akan menghapusnya secara default. Gunakan `{ $unwind: { path: "$items", preserveNullAndEmptyArrays: true } }` untuk mempertahankannya.

### Tahapan 6: `$lookup` — Menggabungkan Koleksi

`$lookup` melakukan left outer join antara koleksi saat ini dan koleksi lain dalam database yang sama.

Buat koleksi pendamping dengan detail produk:

```javascript
db.products.insertMany([
  { name: "laptop", category: "electronics", price: 1200 },
  { name: "mouse", category: "accessories", price: 25 },
  { name: "keyboard", category: "accessories", price: 75 },
  { name: "monitor", category: "electronics", price: 350 },
  { name: "headphones", category: "electronics", price: 80 },
  { name: "webcam", category: "electronics", price: 65 },
  { name: "microphone", category: "electronics", price: 135 },
  { name: "tablet", category: "electronics", price: 400 },
  { name: "case", category: "accessories", price: 20 },
  { name: "screen protector", category: "accessories", price: 15 },
  { name: "printer", category: "electronics", price: 180 },
  { name: "mousepad", category: "accessories", price: 10 }
]);
```

Sekarang gunakan `$lookup` untuk memperkaya pesanan dengan kategori produk:

```javascript
db.orders.aggregate([
  { $unwind: "$items" },
  { $lookup: {
      from: "products",
      localField: "items",
      foreignField: "name",
      as: "productInfo"
  }},
  { $unwind: "$productInfo" },
  { $group: {
      _id: "$productInfo.category",
      totalRevenue: { $sum: "$productInfo.price" },
      orderCount: { $sum: 1 }
  }},
  { $sort: { totalRevenue: -1 } }
]);
```

### Tahapan 7: `$bucket` dan `$bucketAuto` — Histogram

`$bucket` mengelompokkan dokumen ke dalam rentang yang ditentukan pengguna. `$bucketAuto` menghitung batasan secara otomatis.

```javascript
// Distribusi nilai pesanan menggunakan bucket manual
db.orders.aggregate([
  { $bucket: {
      groupBy: "$total",
      boundaries: [0, 100, 500, 1000, 2000],
      default: "Lainnya",
      output: {
          count: { $sum: 1 },
          totalValue: { $sum: "$total" }
      }
  }}
]);
```

### Tahapan 8: `$addFields` — Menambahkan Field Hitungan

`$addFields` menambahkan atau menimpa field tanpa memengaruhi field yang sudah ada. Ini ideal untuk pengayaan sebelum agregasi.

```javascript
db.orders.aggregate([
  { $addFields: {
      isHighValue: { $gte: ["$total", 500] },
      quarter: { $ceil: { $divide: [{ $month: "$date" }, 3] } }
  }},
  { $match: { isHighValue: true } },
  { $group: { _id: "$quarter", count: { $sum: 1 } } }
]);
```

### Membangun Laporan Dunia Nyata

Gabungkan semuanya menjadi laporan penjualan bulanan yang komprehensif:

```javascript
db.orders.aggregate([
  // Langkah 1: Kecualikan pesanan yang dibatalkan
  { $match: { status: { $ne: "cancelled" } } },

  // Langkah 2: Tambahkan field turunan
  { $addFields: {
      month: { $month: "$date" },
      year: { $year: "$date" }
  }},

  // Langkah 3: Ratakan items untuk granularitas per-produk
  { $unwind: "$items" },

  // Langkah 4: Gabungkan dengan koleksi produk
  { $lookup: {
      from: "products",
      localField: "items",
      foreignField: "name",
      as: "product"
  }},
  { $unwind: "$product" },

  // Langkah 5: Kelompokkan berdasarkan bulan dan kategori produk
  { $group: {
      _id: { month: "$month", category: "$product.category" },
      orderCount: { $sum: 1 },
      revenue: { $sum: "$product.price" }
  }},

  // Langkah 6: Urutkan secara kronologis
  { $sort: { "_id.month": 1, "_id.category": 1 } },

  // Langkah 7: Ubah bentuk untuk keterbacaan
  { $project: {
      _id: 0,
      month: "$_id.month",
      category: "$_id.category",
      orderCount: 1,
      revenue: { $round: ["$revenue", 2] }
  }}
]);
```

## Contoh Kode

### Contoh 1: Laporan Nilai Seumur Hidup Pelanggan

```javascript
db.orders.aggregate([
  { $match: { status: { $in: ["delivered", "shipped"] } } },
  { $group: {
      _id: "$customer",
      lifetimeValue: { $sum: "$total" },
      orderCount: { $sum: 1 },
      lastOrder: { $max: "$date" }
  }},
  { $project: {
      customer: "$_id",
      _id: 0,
      lifetimeValue: 1,
      orderCount: 1,
      avgOrderValue: { $round: [{ $divide: ["$lifetimeValue", "$orderCount"] }, 2] },
      recency: { $dateDiff: { startDate: "$lastOrder", endDate: "$$NOW", unit: "day" } }
  }},
  { $sort: { lifetimeValue: -1 } }
]);
```

Catatan: `$dateDiff` membutuhkan MongoDB 5.0+. Untuk versi yang lebih lama, hitung kedekatan di lapisan aplikasi Anda.

### Contoh 2: Ringkasan Pesanan Berdasarkan Status

```javascript
db.orders.aggregate([
  { $group: {
      _id: "$status",
      count: { $sum: 1 },
      totalValue: { $sum: "$total" },
      avgValue: { $avg: "$total" },
      items: { $push: "$items" }
  }},
  { $project: {
      status: "$_id",
      _id: 0,
      count: 1,
      totalValue: 1,
      avgValue: { $round: ["$avgValue", 2] },
      uniqueProducts: { $size: { $reduce: {
          input: "$items",
          initialValue: [],
          in: { $setUnion: ["$$value", "$$this"] }
      }}}
  }}
]);
```

### Contoh 3: Analisis Tren Berdasarkan Tanggal

```javascript
db.orders.aggregate([
  { $match: { status: "delivered" } },
  { $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
      dailyTotal: { $sum: "$total" },
      orderCount: { $sum: 1 }
  }},
  { $sort: { _id: 1 } },
  { $project: {
      month: "$_id",
      _id: 0,
      revenue: "$$ROOT.dailyTotal",
      orderCount: 1
  }}
]);
```

## Insight Penting

- **Urutan tahapan itu penting**: Letakkan `$match` dan `$limit` sedini mungkin. Pipeline agregasi memproses dokumen secara berurutan, sehingga pemfilteran awal secara drastis mengurangi beban kerja untuk tahapan selanjutnya.
- **Dukungan indeks**: `$match` di awal pipeline dapat menggunakan indeks. `$sort` juga dapat menggunakan indeks jika muncul di awal. Setelah `$group`, `$unwind`, atau `$project` dijalankan, semua tahapan selanjutnya beroperasi pada data di memori.
- **Batas memori**: Setiap tahapan dibatasi hingga 100 MB RAM secara default. Untuk dataset besar, aktifkan pengurutan berbasis disk dengan `{ allowDiskUse: true }` pada opsi `aggregate()`.
- **Hindari `$unwind` yang tidak perlu**: Jika Anda hanya membutuhkan elemen pertama atau hitungan elemen array, gunakan `$arrayElemAt` atau `$size` di dalam `$project` atau `$addFields` daripada `$unwind` yang menggandakan jumlah dokumen.
- **`$lookup` bisa mahal**: Pemindaian koleksi asing terjadi untuk setiap dokumen. Pastikan `foreignField` diindeks, dan pertimbangkan menggunakan `$lookup` setelah pemfilteran untuk mengurangi jumlah dokumen masukan.
- **Keterbacaan pipeline**: Untuk pipeline dengan 5+ tahapan, gunakan format terstruktur dan beri komentar pada tujuan setiap tahapan. Perlakukan pipeline Anda seperti query kompleks lainnya — dokumentasikan.

## Langkah Berikutnya

- Jelajahi tahapan `$facet` untuk agregasi multi-faset (beberapa pipeline dalam satu proses).
- Pelajari tentang MongoDB Change Streams dengan `$changeStream` untuk agregasi waktu nyata.
- Coba tahapan pencarian Atlas MongoDB (`$search`, `$searchMeta`) untuk analitik teks lengkap.
- Lihat dokumentasi resmi [Pipeline Agregasi MongoDB](https://www.mongodb.com/docs/manual/aggregation/).

## Kesimpulan

Anda telah mempelajari cara membangun dan merangkai Pipeline Agregasi MongoDB menggunakan tahapan-tahapan terpenting: `$match` untuk pemfilteran, `$group` untuk agregasi, `$sort` dan `$limit` untuk pengurutan, `$unwind` untuk pemrosesan array, `$lookup` untuk penggabungan antar-koleksi, `$project` untuk perubahan bentuk, dan `$bucket` untuk pembuatan histogram. Dengan merangkai tahapan-tahapan ini secara bijaksana dan mengikuti praktik terbaik performa, Anda dapat menjalankan analitik canggih langsung di dalam MongoDB — tanpa memerlukan infrastruktur pemrosesan data terpisah. Contoh-contoh dalam tutorial ini memberi Anda templat yang dapat disesuaikan dengan model data dan kebutuhan pelaporan Anda sendiri.

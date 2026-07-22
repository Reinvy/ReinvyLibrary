---
title: "Cheat Sheet Pipeline Agregasi MongoDB"
description: "Referensi cepat komprehensif untuk pipeline agregasi MongoDB — mencakup semua tahapan pipeline, operator ekspresi, fungsi akumulator, dan pola pipeline dunia nyata."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Pipeline Agregasi MongoDB

## Tabel Referensi Cepat

| Tahapan | Sintaks | Deskripsi |
|---------|---------|-----------|
| `$match` | `{ $match: { field: value } }` | Menyaring dokumen (seperti `find()`), sebaiknya ditempatkan pertama untuk performa |
| `$project` | `{ $project: { field: 1, _id: 0 } }` | Memilih/membentuk field, dapat membuat field komputasi |
| `$group` | `{ $group: { _id: "$field", total: { $sum: 1 } } }` | Mengelompokkan dokumen berdasarkan ekspresi, menghitung akumulator |
| `$sort` | `{ $sort: { field: 1 } }` | Mengurutkan dokumen (1=ascending, -1=descending) |
| `$limit` | `{ $limit: 100 }` | Melewatkan hanya N dokumen pertama |
| `$skip` | `{ $skip: 20 }` | Melewatkan N dokumen pertama |
| `$unwind` | `{ $unwind: "$arrayField" }` | Mendekonstruksi array menjadi satu dokumen per elemen |
| `$lookup` | `{ $lookup: { from: "collection", localField: "x", foreignField: "y", as: "docs" } }` | Left outer join dengan koleksi lain |
| `$addFields` | `{ $addFields: { newField: "$existing" } }` | Menambahkan field baru tanpa menghapus yang sudah ada |
| `$set` | `{ $set: { field: value } }` | Alias untuk `$addFields`, menambah/mengubah field |
| `$unset` | `{ $unset: "field" }` | Menghapus field tertentu dari dokumen |
| `$replaceRoot` | `{ $replaceRoot: { newRoot: "$embedded" } }` | Mengganti seluruh dokumen dengan sub-dokumen |
| `$replaceWith` | `{ $replaceWith: "$embedded" }` | Alias untuk `$replaceRoot` dengan ekspresi tunggal |
| `$count` | `{ $count: "countField" }` | Mengembalikan jumlah dokumen yang tersisa |
| `$sample` | `{ $sample: { size: 50 } }` | Memilih N dokumen secara acak |
| `$bucket` | `{ $bucket: { groupBy: "$field", boundaries: [0, 100, 200], default: "Lainnya", output: { count: { $sum: 1 } } } }` | Mengkategorikan dokumen ke dalam bucket berdasarkan batas |
| `$bucketAuto` | `{ $bucketAuto: { groupBy: "$field", buckets: 5, output: { count: { $sum: 1 } } } }` | Menentukan batas bucket secara otomatis |
| `$facet` | `{ $facet: { kategori1: [ pipeline ], kategori2: [ pipeline ] } }` | Menjalankan beberapa sub-pipeline pada dokumen input yang sama |
| `$sortByCount` | `{ $sortByCount: "$field" }` | Mengelompokkan berdasarkan nilai, menghitung, dan mengurutkan menurun |
| `$graphLookup` | `{ $graphLookup: { from: "coll", startWith: "$id", connectFromField: "parent", connectToField: "_id", as: "ancestors" } }` | Traversal graf rekursif (hierarki, pohon) |
| `$out` | `{ $out: "newCollection" }` | Menulis hasil pipeline ke koleksi baru (harus tahap terakhir) |
| `$merge` | `{ $merge: { into: "collection", on: "_id", whenMatched: "merge", whenNotMatched: "insert" } }` | Menggabungkan hasil ke koleksi yang sudah ada (harus tahap terakhir) |
| `$unionWith` | `{ $unionWith: { coll: "otherCollection", pipeline: [] } }` | Menggabungkan dokumen dari dua koleksi |
| `$densify` | `{ $densify: { field: "dateField", range: { step: 1, unit: "day" } } }` | Membuat dokumen yang hilang di antara batas rentang |
| `$fill` | `{ $fill: { output: { field: { method: "linear" } } } }` | Mengisi nilai null/hilang menggunakan nilai berdekatan |
| `$setWindowFields` | `{ $setWindowFields: { partitionBy: "$category", sortBy: { date: 1 }, output: { rank: { $rank: {} } } } }` | Mengaktifkan fungsi window (rank, denseRank, documentNumber, shift, dll.) |
| `$documents` | `{ $documents: [{}, {}] }` | Menghasilkan dokumen literal sebagai input pipeline |
| `$vectorSearch` | `{ $vectorSearch: { index: "idx", queryVector: [...], path: "embedding", numCandidates: 100, limit: 10 } }` | Melakukan pencarian kesamaan vektor (Atlas) |

### Ekspresi Akumulator (untuk `$group` dan `$bucket`)

| Akumulator | Sintaks | Deskripsi |
|------------|---------|-----------|
| `$sum` | `{ $sum: 1 }` atau `{ $sum: "$field" }` | Menjumlahkan nilai numerik |
| `$avg` | `{ $avg: "$field" }` | Rata-rata nilai numerik |
| `$first` | `{ $first: "$field" }` | Nilai dari dokumen pertama dalam grup |
| `$last` | `{ $last: "$field" }` | Nilai dari dokumen terakhir dalam grup |
| `$max` | `{ $max: "$field" }` | Nilai maksimum |
| `$min` | `{ $min: "$field" }` | Nilai minimum |
| `$push` | `{ $push: "$field" }` | Mengembalikan array dari semua nilai |
| `$addToSet` | `{ $addToSet: "$field" }` | Mengembalikan array dari nilai unik |
| `$stdDevPop` | `{ $stdDevPop: "$field" }` | Simpangan baku populasi |
| `$stdDevSamp` | `{ $stdDevSamp: "$field" }` | Simpangan baku sampel |
| `$top` | `{ $top: { sortBy: { score: -1 }, output: "$field" } }` | N nilai teratas berdasarkan urutan (MongoDB 5.2+) |
| `$topN` | `{ $topN: { n: 5, sortBy: { score: -1 }, output: "$field" } }` | N dokumen teratas per grup |
| `$bottom` | `{ $bottom: { sortBy: { score: 1 }, output: "$field" } }` | Nilai terbawah berdasarkan urutan |
| `$bottomN` | `{ $bottomN: { n: 5, sortBy: { score: 1 }, output: "$field" } }` | N dokumen terbawah per grup |
| `$count` | `{ $count: {} }` | Menghitung dokumen di setiap grup |

### Fungsi Window (untuk `$setWindowFields`)

| Fungsi | Deskripsi |
|--------|-----------|
| `$rank` | Peringkat dengan celah (1, 1, 3) |
| `$denseRank` | Peringkat tanpa celah (1, 1, 2) |
| `$documentNumber` | Nomor dokumen sekuensial dalam partisi |
| `$rowNumber` | Alias untuk `$documentNumber` |
| `$shift` | Mengakses nilai dari dokumen berdekatan (berdasarkan offset) |
| `$derivative` | Laju perubahan antara dokumen berurutan |
| `$integral` | Integral perkiraan dari field numerik |
| `$expMovingAvg` | Rata-rata bergerak berbobot eksponensial |
| `$linearFill` | Interpolasi linear dari nilai null/hilang |

## Perintah Umum

### Menjalankan Pipeline Agregasi

```bash
# Pipeline dasar di mongosh
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", totalSpent: { $sum: "$amount" } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 10 }
])

# Pipeline dengan beberapa tahap output menggunakan $facet
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $facet: {
      topCustomers: [
        { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ],
      summary: [
        { $group: { _id: null, avg: { $avg: "$amount" }, total: { $sum: "$amount" } } }
      ]
  }}
])

# Pipeline dengan $lookup (join)
db.orders.aggregate([
  { $match: { status: "shipped" } },
  { $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customer"
  }},
  { $unwind: "$customer" },
  { $project: { orderTotal: 1, "customer.name": 1, "customer.email": 1 } }
])

# Pipeline dengan $out (tulis hasil ke koleksi)
db.orders.aggregate([
  { $group: { _id: "$region", totalSales: { $sum: "$amount" }, count: { $sum: 1 } } },
  { $out: "sales_by_region" }
])
```

### explain() dan Analisis Performa

```bash
# Menjelaskan eksekusi pipeline (gunakan di mongosh)
db.orders.explain("executionStats").aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
])

# Periksa indeks yang digunakan, dokumen diperiksa vs dikembalikan
# Cari: IXSCAN vs COLLSCAN, totalDocsExamined, executionTimeMillis
```

### Flag Optimasi Pipeline Agregasi

```bash
# Izinkan penggunaan disk untuk pengurutan besar (melebihi RAM 100MB)
db.orders.aggregate([{ $sort: { amount: -1 } }], { allowDiskUse: true })

# Jalankan dengan mode explain
db.orders.explain("allPlansExecution").aggregate([...])

# Hint index untuk tahap $match
db.orders.aggregate([{ $match: { status: "active" } }], { hint: { status: 1, date: -1 } })
```

### Bekerja dengan Tanggal dalam Agregasi

```bash
# Kelompokkan berdasarkan bagian tanggal
db.sales.aggregate([
  { $group: {
      _id: {
        year: { $year: "$date" },
        month: { $month: "$date" },
        day: { $dayOfMonth: "$date" }
      },
      dailyTotal: { $sum: "$amount" }
  }},
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
])

# Kelompokkan berdasarkan tanggal yang dipotong ke hari
db.sales.aggregate([
  { $group: {
      _id: { $dateTrunc: { date: "$date", unit: "day" } },
      total: { $sum: "$amount" }
  }}
])

# Filter rentang tanggal
db.events.aggregate([
  { $match: {
      timestamp: {
        $gte: ISODate("2026-01-01"),
        $lt: ISODate("2026-07-01")
      }
  }},
  { $group: { _id: null, avgResponseTime: { $avg: "$responseTime" } } }
])
```

## Potongan Kode

### Pipeline Dashboard Penjualan Real-Time

```javascript
// Dashboard penjualan: pendapatan harian + produk teratas + rincian kategori
const salesPipeline = [
  { $match: { date: { $gte: startDate, $lte: endDate } } },
  { $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product"
  }},
  { $unwind: "$product" },
  { $facet: {
      dailyRevenue: [
        { $group: {
            _id: { $dateTrunc: { date: "$date", unit: "day" } },
            revenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } },
            orders: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ],
      topProducts: [
        { $group: {
            _id: "$product.name",
            totalSold: { $sum: "$quantity" },
            revenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } }
        }},
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ],
      categoryBreakdown: [
        { $group: {
            _id: "$product.category",
            count: { $sum: 1 },
            totalRevenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } }
        }},
        { $sort: { totalRevenue: -1 } }
      ]
  }}
];
```

### Tampilan 360 Pelanggan

```javascript
// Gabungkan pesanan, tiket dukungan, dan tampilan halaman
db.customers.aggregate([
  { $match: { email: "customer@example.com" } },
  { $lookup: {
      from: "orders",
      let: { custId: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$customerId", "$$custId"] } } },
        { $sort: { createdAt: -1 } },
        { $limit: 20 },
        { $project: { items: 1, total: 1, status: 1, createdAt: 1 } }
      ],
      as: "recentOrders"
  }},
  { $lookup: {
      from: "support_tickets",
      let: { custId: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$customerId", "$$custId"] } } },
        { $sort: { createdAt: -1 } },
        { $limit: 10 }
      ],
      as: "supportHistory"
  }},
  { $addFields: {
      totalSpent: { $sum: "$recentOrders.total" },
      orderCount: { $size: "$recentOrders" },
      isVip: { $gte: [{ $sum: "$recentOrders.total" }, 10000] }
  }},
  { $project: {
      name: 1, email: 1, totalSpent: 1, orderCount: 1,
      isVip: 1, recentOrders: 1, supportHistory: 1
  }}
]);
```

### Logika Kondisional dengan $cond dan $switch

```javascript
// Perhitungan nilai dengan $switch
db.exams.aggregate([
  { $project: {
      student: 1,
      score: 1,
      grade: {
        $switch: {
          branches: [
            { case: { $gte: ["$score", 90] }, then: "A" },
            { case: { $gte: ["$score", 80] }, then: "B" },
            { case: { $gte: ["$score", 70] }, then: "C" },
            { case: { $gte: ["$score", 60] }, then: "D" }
          ],
          default: "F"
        }
      },
      passed: { $cond: [{ $gte: ["$score", 60] }, true, false] },
      result: {
        $cond: {
          if: { $gte: ["$score", 70] },
          then: "Lulus",
          else: { $cond: [{ $gte: ["$score", 60] }, "Lulus Bersyarat", "Tidak Lulus"] }
        }
      }
  }}
]);

// Penetapan harga dengan diskon bersyarat
db.orders.aggregate([
  { $addFields: {
      discountPercent: {
        $cond: [
          { $gte: ["$total", 1000] }, 20,
          { $cond: [
            { $gte: ["$total", 500] }, 10, 0
          ]}
        ]
      },
      shipping: {
        $cond: [
          { $gte: ["$total", 50] }, 0, 9.99
        ]
      }
  }},
  { $addFields: {
      finalTotal: {
        $subtract: [
          "$total",
          { $divide: [{ $multiply: ["$total", "$discountPercent"] }, 100] }
        ]
      }
  }}
]);
```

### Pemrosesan Array dengan $unwind dan $group

```javascript
// Ratakan array dan hitung statistik per elemen
db.orders.aggregate([
  { $match: { status: "delivered" } },
  // Dekonstruksi array item pesanan
  { $unwind: { path: "$items", includeArrayIndex: "itemIndex" } },
  // Kelompokkan berdasarkan produk di semua pesanan
  { $group: {
      _id: "$items.productId",
      productName: { $first: "$items.name" },
      totalSold: { $sum: "$items.quantity" },
      totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
      avgUnitPrice: { $avg: "$items.price" },
      orderCount: { $sum: 1 },
      firstOrdered: { $min: "$date" },
      lastOrdered: { $max: "$date" }
  }},
  { $sort: { totalRevenue: -1 } },
  { $limit: 20 }
]);

// Temukan pesanan di mana produk tertentu dibeli bersama produk lain
db.orders.aggregate([
  { $match: { "items.productId": "PROD_A" } },
  { $unwind: "$items" },
  { $match: { "items.productId": { $ne: "PROD_A" } } },
  { $group: {
      _id: "$items.productId",
      coOccurrenceCount: { $sum: 1 },
      totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
  }},
  { $sort: { coOccurrenceCount: -1 } },
  { $limit: 10 }
]);
```

### Analisis Time-Series dengan $setWindowFields

```javascript
// Rata-rata bergerak dan jumlah kumulatif dari waktu ke waktu
db.stock_prices.aggregate([
  { $match: { symbol: "AAPL" } },
  { $sort: { date: 1 } },
  { $setWindowFields: {
      partitionBy: "$symbol",
      sortBy: { date: 1 },
      output: {
        // Rata-rata bergerak 7 hari dari harga penutupan
        ma7: {
          $avg: "$close",
          window: { documents: [-6, 0] }
        },
        // Volume kumulatif
        cumulativeVolume: {
          $sum: "$volume",
          window: { documents: ["unbounded", "current"] }
        },
        // Perubahan harga dari hari ke hari
        priceChange: {
          $derivative: { input: "$close", unit: "day" }
        },
        // Peringkat berdasarkan performa
        rank: { $rank: {} },
        // Rata-rata bergerak berbobot eksponensial
        ewma: {
          $expMovingAvg: { input: "$close", N: 20 }
        }
      }
  }}
]);
```

### Data Hirarkis dengan $graphLookup

```javascript
// Hirarki karyawan — temukan semua bawahan langsung dan tidak langsung
db.employees.aggregate([
  { $match: { name: "Alice Johnson" } },
  { $graphLookup: {
      from: "employees",
      startWith: "$_id",
      connectFromField: "_id",
      connectToField: "managerId",
      maxDepth: 10,
      depthField: "level",
      as: "subordinates"
  }},
  { $project: {
      name: 1,
      subordinateCount: { $size: "$subordinates" },
      subordinates: {
        $map: {
          input: "$subordinates",
          as: "sub",
          in: { name: "$$sub.name", level: "$$sub.level", role: "$$sub.role" }
        }
      }
  }}
]);

// Pohon kategori — temukan semua kategori induk
db.categories.aggregate([
  { $match: { _id: "electronics.smartphones.iphone" } },
  { $graphLookup: {
      from: "categories",
      startWith: "$parentId",
      connectFromField: "parentId",
      connectToField: "_id",
      as: "ancestors"
  }},
  { $project: {
      name: 1,
      fullPath: { $concatArrays: ["$ancestors.name", ["$name"]] }
  }}
]);
```

### Transformasi dan Pengayaan Data

```javascript
// Konversi harga string ke numerik dan tambahkan field komputasi
db.raw_products.aggregate([
  { $match: { status: "active" } },
  { $addFields: {
      priceNumeric: { $toDouble: "$priceString" },
      inStock: { $toBool: "$stockCount" },
      categories: {
        $cond: {
          if: { $isArray: "$tags" },
          then: "$tags",
          else: { $split: ["$tags", ","] }
        }
      },
      slug: {
        $toLower: {
          $replaceAll: { input: "$name", find: " ", replacement: "-" }
        }
      }
  }},
  { $project: {
      name: 1, slug: 1, price: "$priceNumeric",
      inStock: 1, categories: 1,
      // Harga berjenjang berdasarkan kuantitas
      tierPricing: {
        basic: { $round: ["$priceNumeric", 2] },
        premium: { $round: [{ $multiply: ["$priceNumeric", 1.2] }, 2] },
        enterprise: { $round: [{ $multiply: ["$priceNumeric", 0.85] }, 2] }
      }
  }}
]);

// Agregasi jarak geo
db.places.aggregate([
  { $geoNear: {
      near: { type: "Point", coordinates: [-73.97, 40.77] },
      distanceField: "distance",
      maxDistance: 5000,
      spherical: true,
      key: "location"
  }},
  { $group: {
      _id: "$category",
      count: { $sum: 1 },
      avgDistance: { $avg: "$distance" },
      places: { $push: { name: "$name", dist: "$distance" } }
  }},
  { $sort: { count: -1 } }
]);
```

### Analisis Skema dan Kualitas Data

```javascript
// Analisis tipe field dan tingkat null di seluruh koleksi
db.collection.aggregate([
  { $sample: { size: 1000 } },
  { $project: {
      fieldTypes: { $objectToArray: { $literal: { field1: { $type: "$field1" }, field2: { $type: "$field2" } } } },
      nullFields: {
        $objectToArray: {
          $literal: {
            field1: { $cond: [{ $eq: ["$field1", null] }, 1, 0] },
            field2: { $cond: [{ $eq: ["$field2", null] }, 1, 0] }
          }
        }
      }
  }}
]);

// Deteksi outlier menggunakan simpangan baku
db.sensor_readings.aggregate([
  { $match: { sensorId: "TEMP_001" } },
  { $group: {
      _id: null,
      avg: { $avg: "$value" },
      stdDev: { $stdDevSamp: "$value" },
      min: { $min: "$value" },
      max: { $max: "$value" }
  }},
  { $project: {
      lowerBound: { $subtract: ["$avg", { $multiply: [3, "$stdDev"] }] },
      upperBound: { $add: ["$avg", { $multiply: [3, "$stdDev"] }] }
  }}
]);
```

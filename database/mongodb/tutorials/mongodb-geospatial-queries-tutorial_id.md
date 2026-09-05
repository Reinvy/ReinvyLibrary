---
title: "Kueri Geospasial dengan MongoDB"
description: "Pembahasan mendalam tentang kueri geospasial MongoDB — pemodelan data GeoJSON, indeks 2dsphere, operator jarak dan cakupan, tahap agregasi $geoNear, serta membangun aplikasi berbasis lokasi."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Kueri Geospasial dengan MongoDB

## Ringkasan

Tutorial ini mengeksplorasi kemampuan geospasial MongoDB secara mendalam. Anda akan mempelajari cara memodelkan lokasi dengan GeoJSON, membangun indeks `2dsphere`, menjalankan kueri jarak dengan `$near` dan `$nearSphere`, menguji cakupan dengan `$geoWithin`, menemukan geometri yang berpotongan dengan `$geoIntersects`, serta menggunakan tahap agregasi `$geoNear` untuk mendukung fitur berbasis lokasi seperti pencarian toko terdekat, geo-fencing, dan penjodohan pengemudi terdekat. Pada akhirnya, Anda akan mampu merancang dan menyetel beban kerja geospasial yang berskala.

## Target Audiens

- Backend Developer dan Database Administrator yang membangun aplikasi berbasis lokasi.
- Tingkat mahir: nyaman dengan operasi CRUD MongoDB, indeks, dan kerangka agregasi.

## Prasyarat

- MongoDB terinstal secara lokal (versi 5.0+) atau akses ke MongoDB Atlas.
- Sesi `mongosh` yang berjalan dengan basis data contoh yang sudah dimuat.
- Pemahaman yang solid tentang `db.collection.find()`, `db.collection.aggregate()`, dan struktur dokumen MongoDB.
- Keakraban dengan konsep indeks dasar (indeks bidang tunggal dan gabungan).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Memodelkan dokumen GeoJSON dengan benar, termasuk sistem referensi koordinat WGS84 dan urutan bujur-lintang.
- Membuat dan memelihara indeks `2dsphere`, termasuk varian gabungan dan sparse.
- Menjalankan kueri jarak dengan `$near` dan `$nearSphere`, serta memahami jaminan pengurutannya.
- Menguji cakupan dan perpotongan dengan `$geoWithin` dan `$geoIntersects`.
- Membangun agregasi geospasial yang kaya dengan tahap `$geoNear`.
- Mendiagnosis performa geospasial dengan `explain()` dan menghindari jebakan klasik urutan koordinat serta indeks.

## Konteks dan Motivasi

Aplikasi modern semakin banyak yang berbasis lokasi. Aplikasi transportasi daring harus menemukan pengemudi terdekat yang tersedia, layanan pesan-antar makanan harus menentukan restoran mana yang berada di dalam zona pengiriman, platform e-commerce harus menampilkan toko terdekat, dan pelacak armada harus mendeteksi kapan kendaraan memasuki area terlarang. Pendekatan basis data klasik kesulitan menghadapi beban kerja seperti ini: perhitungan kotak pembatas (bounding box) di kode aplikasi lambat, tidak presisi, dan mustahil diindeks secara efisien.

MongoDB menyelesaikan masalah ini dengan dukungan geospasial bawaan langsung di mesin kueri. Lokasi disimpan sebagai objek **GeoJSON**, diindeks dengan indeks **`2dsphere`**, dan dikueri dengan operator khusus yang mengevaluasi jarak nyata di permukaan bola bumi. Basis data yang melakukan perhitungan berat — Anda hanya perlu mendeskripsikan geometri yang Anda pedulikan. Tutorial ini mengajarkan Anda menggunakan perangkat tersebut dengan benar dan efisien agar fitur lokasi Anda tetap cepat seiring bertumbuhnya data.

## Konten Inti

### Memahami Model Data GeoJSON

MongoDB menyimpan lokasi menggunakan spesifikasi GeoJSON. Setiap geometri GeoJSON memiliki `type` dan larik `coordinates`, dan bentuk `coordinates` bergantung pada tipenya.

```text
| Geometri      | Format coordinates                                         | Contoh penggunaan           |
|---------------|------------------------------------------------------------|-----------------------------|
| Point         | [bujur, lintang]                                           | Toko, pengemudi, sensor     |
| LineString    | larik posisi Point                                         | Rute, jalan, sungai         |
| Polygon       | larik cincin linear (cincin pertama = luar, lainnya = lubang) | Zona pengiriman, kampus  |
| MultiPolygon  | larik Polygon                                              | Negara dengan kepulauan     |
```

Tiga aturan lebih penting dari yang lainnya:

1. **Urutannya adalah bujur, lalu lintang.** GeoJSON mewajibkan `[lng, lat]`. Untuk Jakarta, itu adalah `[106.822, -6.175]` — bukan sebaliknya. Menukarnya secara diam-diam menempatkan data Anda di sisi lain bumi.
2. **Gunakan sistem referensi koordinat WGS84.** Koordinat GeoJSON selalu WGS84 (sistem yang sama dengan GPS). Jika data Anda berasal dari sistem proyeksi seperti UTM, konversikan sebelum disimpan.
3. **Poligon harus tertutup dan mengikuti aturan tangan kanan.** Posisi pertama dan terakhir dari sebuah cincin harus identik, dan cincin luar harus berorientasi berlawanan arah jarum jam. MongoDB menolak poligon yang tidak valid dengan pesan kesalahan yang jelas.

Dokumen lokasi minimal terlihat seperti ini:

```javascript
// Dokumen kafe dengan GeoJSON Point
db.cafes.insertOne({
  name: "Kopi Senja",
  cuisine: "coffee",
  location: {
    type: "Point",
    coordinates: [106.822, -6.175]
  }
})
```

Untuk kemudahan, MongoDB menetapkan nama bidang `location` secara default pada indeks geospasial pertama yang Anda buat, tetapi bidang itu sendiri adalah dokumen tersarang biasa — Anda dapat menamainya apa saja (`geo`, `position`, `address.coordinates`).

### Membuat Indeks 2dsphere

Indeks `2dsphere` mendukung semua operator kueri GeoJSON dan menghitung jarak pada model bumi bulat. Ini hampir selalu menjadi pilihan yang tepat; indeks `2d` lama hanya mendukung koordinat planar dan sebaiknya hanya digunakan untuk data lama.

```javascript
// Membuat indeks 2dsphere pada bidang location
db.cafes.createIndex({ location: "2dsphere" })

// Indeks 2dsphere gabungan — predikat spasial + non-spasial sekaligus
db.cafes.createIndex({ location: "2dsphere", cuisine: 1 })

// Indeks 2dsphere sparse — lewati dokumen tanpa bidang location
db.cafes.createIndex({ location: "2dsphere" }, { sparse: true })
```

Indeks geospasial gabungan memungkinkan MongoDB memenuhi filter spasial dan filter biasa (seperti `cuisine: "coffee"`) dalam satu pemindaian indeks. Bidang geospasial harus berada **pertama** dalam indeks gabungan — MongoDB hanya mendukung geospasial sebagai kunci utama.

### Kueri Jarak dengan $near dan $nearSphere

Gunakan `$near` dengan indeks `2dsphere` untuk menemukan dokumen yang diurutkan berdasarkan jarak. Hasilnya otomatis diurutkan dari terdekat ke terjauh, dan MongoDB mewajibkan indeks geospasial — jika tidak, kueri akan menghasilkan kesalahan.

```javascript
// Temukan kafe dalam radius 5 km dari sebuah titik, terdekat lebih dulu
db.cafes.find(
  {
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [106.822, -6.175] },
        $maxDistance: 5000,  // meter
        $minDistance: 100    // opsional: kecualikan titik itu sendiri
      }
    }
  },
  { name: 1, cuisine: 1 }
).limit(10)
```

Ada dua operator jarak:

- **`$near`** — perhitungan jarak planar. Bekerja dengan indeks `2dsphere` maupun `2d`, sehingga saat digunakan dengan `2dsphere` operator ini TIDAK menghormati model bumi bulat.
- **`$nearSphere`** — perhitungan jarak spherical di permukaan bumi. Selalu utamakan `$nearSphere` dengan indeks `2dsphere` untuk akurasi dunia nyata.

```javascript
// Varian spherical — pilihan tepat untuk kueri jarak global
db.cafes.find(
  {
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [106.822, -6.175] },
        $maxDistance: 5000
      }
    }
  },
  { name: 1 }
)
```

Kedua operator mengembalikan hasil yang diurutkan berdasarkan jarak, artinya Anda sebaiknya TIDAK menggabungkannya dengan `$orderby` — itu memaksa indeks terpisah dan menghasilkan urutan yang tidak dapat diprediksi. Jika Anda membutuhkan pengurutan lain, gunakan tahap agregasi `$geoNear`.

### Kueri Cakupan dengan $geoWithin

`$geoWithin` menemukan dokumen yang geometrinya sepenuhnya berada di dalam bentuk yang ditentukan. Operator ini tidak mengharuskan hasil diurutkan, dapat bekerja tanpa indeks geospasial untuk bentuk lama (`$box`), dan merupakan operator pilihan untuk geo-fencing, zona pengiriman, dan batas administratif.

```javascript
// Temukan kafe di dalam kotak pembatas persegi panjang
db.cafes.find({
  location: {
    $geoWithin: {
      $box: [
        [106.70, -6.30],
        [106.95, -6.00]
      ]
    }
  }
})

// Temukan kafe di dalam radius lingkaran (planar)
db.cafes.find({
  location: {
    $geoWithin: {
      $center: [[106.822, -6.175], 0.05]  // radius dalam radian
    }
  }
})

// Temukan kafe di dalam lingkaran spherical — bentuk yang akurat
db.cafes.find({
  location: {
    $geoWithin: {
      $centerSphere: [[106.822, -6.175], 5 / 6378.1]  // km / jari-jari bumi dalam km
    }
  }
})
```

Untuk batas poligon Anda memiliki dua opsi: menyematkan poligon di dalam kueri (`$polygon`) atau mencocokkan dengan dokumen poligon yang tersimpan (`$geoIntersects` atau `$geoWithin` dengan bidang geometri). Operator `$polygon` lama hanya planar dan tidak mendukung lubang; lebih baik menyimpan GeoJSON poligon sungguhan.

### Kueri Perpotongan dengan $geoIntersects

`$geoIntersects` menemukan dokumen yang geometrinya berbagi ruang dengan geometri tertentu. Berbeda dengan `$geoWithin` (dokumen di dalam bentuk), `$geoIntersects` juga mengembalikan dokumen yang hanya menyentuh atau melintasi batas. Ini adalah operator yang tepat ketika dokumen tersimpan dan bentuk kueri sama-sama geometri arbitrer — rute yang melintasi zona, bidang tanah yang tumpang tindih dengan area banjir, atau pengemudi yang melewati wilayah penjemputan.

```javascript
// Temukan rute pengiriman yang berpotongan dengan zona terlarang
db.routes.find({
  path: {
    $geoIntersects: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [106.80, -6.20],
          [106.90, -6.20],
          [106.90, -6.10],
          [106.80, -6.10],
          [106.80, -6.20]
        ]]
      }
    }
  }
})
```

Aturan praktis desain: gunakan `$geoWithin` ketika pertanyaannya adalah "apakah titik ini di dalam zona saya?" dan `$geoIntersects` ketika pertanyaannya adalah "apakah dua geometri ini tumpang tindih?"

### Tahap Agregasi $geoNear

Tahap agregasi `$geoNear` adalah alat geospasial paling fleksibel. Tahap ini mewajibkan indeks `2dsphere`, harus menjadi tahap **pertama** dalam pipeline, dan mengembalikan `distanceField` yang dihitung pada setiap dokumen.

```javascript
db.cafes.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [106.822, -6.175] },
      distanceField: "distanceMeters",
      maxDistance: 5000,
      minDistance: 100,
      spherical: true,
      query: { cuisine: "coffee" },
      key: "location",
      includeLocs: "location"
    }
  },
  { $sort: { distanceMeters: 1 } },
  { $limit: 5 },
  {
    $project: {
      name: 1,
      distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] }
    }
  }
])
```

Opsi kunci:

- **`near`** — titik GeoJSON referensi.
- **`distanceField`** — nama bidang yang ditambahkan ke setiap hasil, berisi jarak dalam meter.
- **`spherical: true`** — gunakan perhitungan jarak spherical; selalu aktifkan dengan `2dsphere`.
- **`query`** — filter tambahan yang diterapkan sebelum perhitungan jarak.
- **`key`** — indeks geospasial mana yang dipakai ketika koleksi memiliki beberapa indeks.
- **`includeLocs`** — kembalikan lokasi yang cocok, berguna ketika dokumen menyimpan banyak koordinat.

Karena `$geoNear` menghitung jarak sebagai bidang sungguhan, Anda dapat mengurutkan, membulatkan, mengelompokkan, atau memfilternya — sesuatu yang tidak dapat dilakukan operator find.

### Dokumen Multi-Lokasi dan Larik

Sebuah dokumen dapat menyimpan beberapa geometri GeoJSON dalam sebuah larik, dan indeks `2dsphere` mencakup setiap elemennya:

```javascript
db.stores.insertOne({
  name: "Toko Makmur",
  locations: [
    { type: "Point", coordinates: [106.822, -6.175] },
    { type: "Point", coordinates: [106.845, -6.230] }
  ]
})

// Cocok jika SALAH SATU lokasi berada dalam radius
db.stores.find({
  locations: {
    $nearSphere: {
      $geometry: { type: "Point", coordinates: [106.822, -6.175] },
      $maxDistance: 2000
    }
  }
})
```

Untuk GeoJSON poligon, geometri besar seperti batas negara sebaiknya disimpan di koleksi terpisah dari titik berkardinalitas tinggi (seperti pengguna), karena satu dokumen poligon raksasa dapat menggelembungkan indeks dan memperlambat setiap penulisan.

### Performa dan Penyetelan Indeks

Selalu verifikasi rencana geospasial dengan `explain()`:

```javascript
db.cafes.find({
  location: {
    $nearSphere: {
      $geometry: { type: "Point", coordinates: [106.822, -6.175] },
      $maxDistance: 5000
    }
  }
}).explain("executionStats")
```

Baca keluarannya untuk `"stage": "GEO_NEAR_2DSPHERE"` dan rasio `docsExamined` vs `nReturned` yang tinggi. Jika tahapnya `COLLSCAN` dan kueri tidak menghasilkan kesalahan, berarti indeks hilang atau operator tidak mendukung bentuk tersebut (misalnya, `$near` tidak dapat menggunakan indeks `2d` untuk data GeoJSON).

Aturan penyetelan tambahan:

- Letakkan bidang geospasial paling depan pada indeks gabungan; bidang non-geospasial mengikuti sebagai kunci filter lanjutan.
- Gunakan `$maxDistance` — kueri jarak tanpa batas memindai rentang indeks yang besar.
- Pertahankan hasil yang terurut dengan `$near`/`$nearSphere` tanpa `$orderby`, atau lakukan pengurutan dengan `$geoNear`.
- Gunakan sparsity (`sparse: true`) untuk menghindari pengindeksan dokumen tanpa koordinat.

### Jebakan Umum

- **Koordinat tertukar**: selalu simpan `[bujur, lintang]`. Pemeriksaan cepat: untuk Indonesia, bujur berkisar sekitar 95–141 dan lintang sekitar −11 hingga +6. Jika lintang Anda terlihat seperti 106, berarti tertukar.
- **`$near` dalam klausa `$or`**: `$near`/`$nearSphere` tidak dapat digabungkan dengan operator `$or` karena indeks geospasial tidak dapat melayani kedua cabang sekaligus. Gunakan gabungan `$geoWithin` atau kerangka agregasi sebagai gantinya.
- **Satuan radius yang salah**: `$maxDistance`/`$minDistance` dalam `$near` adalah meter dengan `2dsphere`. Untuk `$centerSphere`, radius dalam radian — konversikan dengan membagi jarak dengan jari-jari bumi (6.378,1 km).
- **Kesalahan indeks hilang**: operator geospasial mewajibkan indeks atau diam-diam jatuh ke `COLLSCAN` tergantung operatornya. Buat indeks `2dsphere` sebelum mengandalkan kueri geospasial apa pun.
- **Validitas poligon**: cincin yang tidak tertutup dan cincin luar searah jarum jam memunculkan kesalahan "Invalid polygon". Validasi geometri pada saat penulisan.
- **Planar vs spherical**: `$near` dengan indeks `2dsphere` bersifat planar — gunakan `$nearSphere` (atau `$geoNear` dengan `spherical: true`) ketika akurasi pada jarak jauh penting.

## Contoh Kode

### Contoh Lengkap 1: Kafe Terdekat dengan Jarak

```javascript
// Menyiapkan data contoh
db.cafes.deleteMany({})
db.cafes.insertMany([
  { name: "Kopi Senja", cuisine: "coffee", location: { type: "Point", coordinates: [106.822, -6.175] } },
  { name: "Kopi Pagi", cuisine: "coffee", location: { type: "Point", coordinates: [106.845, -6.230] } },
  { name: "Teh Sore", cuisine: "tea", location: { type: "Point", coordinates: [106.800, -6.210] } },
  { name: "Kopi Malam", cuisine: "coffee", location: { type: "Point", coordinates: [106.815, -6.160] } }
])

// Indeks geospasial
db.cafes.createIndex({ location: "2dsphere" })

// 3 kedai kopi terdekat dalam radius 10 km
db.cafes.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [106.822, -6.175] },
      distanceField: "distance",
      maxDistance: 10000,
      spherical: true,
      query: { cuisine: "coffee" }
    }
  },
  { $limit: 3 },
  { $project: { name: 1, distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] } } }
])
```

Keluaran:

```text
{ "_id": ..., "name": "Kopi Senja", "distanceKm": 0 }
{ "_id": ..., "name": "Kopi Malam", "distanceKm": 1.68 }
{ "_id": ..., "name": "Kopi Pagi", "distanceKm": 6.38 }
```

### Contoh Lengkap 2: Geo-Fencing Pengiriman

```javascript
// Zona pengiriman yang disimpan sebagai GeoJSON poligon
db.zones.insertOne({
  name: "Zone Sudirman",
  area: {
    type: "Polygon",
    coordinates: [[
      [106.80, -6.20],
      [106.90, -6.20],
      [106.90, -6.10],
      [106.80, -6.10],
      [106.80, -6.20]
    ]]
  }
})

// Kurir yang melaporkan posisinya saat ini
db.couriers.insertOne({
  name: "Budi",
  position: { type: "Point", coordinates: [106.85, -6.15] }
})

db.couriers.createIndex({ position: "2dsphere" })

// Apakah Budi berada di dalam zona?
db.couriers.find({
  position: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [106.80, -6.20],
          [106.90, -6.20],
          [106.90, -6.10],
          [106.80, -6.10],
          [106.80, -6.20]
        ]]
      }
    }
  }
}, { name: 1 })
```

Karena poligon kueri disematkan, ini bekerja untuk bentuk apa pun tanpa membaca koleksi zona terlebih dahulu. Untuk daftar zona yang dinamis, `$geoIntersects` terhadap `zones.area` yang tersimpan lebih bersih:

```javascript
db.zones.find({
  area: {
    $geoIntersects: {
      $geometry: { type: "Point", coordinates: [106.85, -6.15] }
    }
  }
}, { name: 1 })
```

### Contoh Lengkap 3: Pengemudi Terdekat dengan Node.js Driver

```javascript
const { MongoClient } = require("mongodb");

async function findNearestDrivers(lng, lat, maxDistanceMeters) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db("ridehailing");
  const drivers = db.collection("drivers");

  const cursor = drivers.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        maxDistance: maxDistanceMeters,
        spherical: true,
        query: { available: true }
      }
    },
    { $limit: 5 },
    { $project: { name: 1, vehicle: 1, distance: 1 } }
  ]);

  const results = await cursor.toArray();
  await client.close();
  return results;
}

findNearestDrivers(106.822, -6.175, 5000).then(console.log);
```

## Insight Penting

- Praktik terbaik: selalu simpan GeoJSON dengan koordinat WGS84 dalam urutan `[bujur, lintang]` dan buat indeks `2dsphere` pada bidang lokasi sebelum menjalankan kueri geospasial apa pun.
- Praktik terbaik: utamakan operator spherical (`$nearSphere`, `$geoWithin` dengan `$centerSphere`, `$geoNear` dengan `spherical: true`) setiap kali jarak melintasi lebih dari beberapa kilometer; matematika planar mendistorsi hasil pada skala besar.
- Jebakan: hasil `$near` secara implisit diurutkan berdasarkan jarak, sehingga menggabungkannya dengan `$orderby` merusak jaminan urutan dan diam-diam dapat mengubah hasil Anda.
- Peringatan arsitektur: jangan menyematkan dokumen poligon raksasa (batas negara, distrik kompleks) di koleksi yang sama dengan jutaan dokumen titik — pembengkakan indeks memperlambat penulisan untuk seluruh koleksi.
- Pertimbangan performa: gunakan `$maxDistance` secara konsisten, periksa `explain("executionStats")` untuk tahap `GEO_NEAR_2DSPHERE`, dan rancang indeks gabungan dengan bidang geospasial di posisi pertama.

## Langkah Berikutnya

- Perdalam keterampilan agregasi dengan tutorial MongoDB Aggregation Pipeline di repositori ini.
- Bandingkan desain indeks geospasial dengan aturan pengindeksan umum pada tutorial MongoDB Indexing Strategies.
- Jelajahi MongoDB Development Syllabus atau Advanced MongoDB Syllabus untuk jalur pembelajaran terstruktur.
- Pertimbangkan menggabungkan kueri geospasial dengan Change Streams untuk bereaksi terhadap pembaruan lokasi secara real time.

## Kesimpulan

Mesin geospasial MongoDB mengubah masalah spasial yang sulit menjadi kueri biasa. Dengan memodelkan lokasi sebagai GeoJSON, mengindeksnya dengan `2dsphere`, dan memilih operator yang tepat — `$nearSphere` untuk jarak, `$geoWithin` untuk cakupan, `$geoIntersects` untuk tumpang tindih, dan `$geoNear` ketika Anda membutuhkan jarak sebagai data — Anda dapat membangun fitur pencari toko, geo-fencing, dan pencocokan sumber daya terdekat yang tetap cepat dalam skala besar. Dua kebiasaan yang paling melindungi Anda adalah menyimpan koordinat dalam urutan yang benar dan memverifikasi setiap rencana geospasial dengan `explain()`.

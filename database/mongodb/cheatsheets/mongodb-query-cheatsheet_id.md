---
title: "Cheat Sheet Query MongoDB"
description: "Panduan referensi cepat untuk query MongoDB, operasi CRUD, pipeline agregasi, indeks, dan perintah shell."
category: "database"
technology: "mongodb"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Query MongoDB

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Terhubung ke database | `mongosh` | Membuka shell MongoDB terhubung ke localhost |
| Terhubung dengan URI | `mongosh "mongodb://host:port/db"` | Terhubung ke host dan database tertentu |
| Tampilkan database | `show dbs` | Menampilkan semua database di server |
| Gunakan database | `use mydb` | Beralih ke (atau membuat) database |
| Tampilkan koleksi | `show collections` | Menampilkan semua koleksi di database saat ini |
| Sisipkan satu dokumen | `db.collection.insertOne({...})` | Menyisipkan satu dokumen |
| Sisipkan banyak dokumen | `db.collection.insertMany([...])` | Menyisipkan banyak dokumen dalam array |
| Cari semua dokumen | `db.collection.find()` | Mengembalikan semua dokumen dalam koleksi |
| Cari dengan filter | `db.collection.find({ field: value })` | Mengembalikan dokumen yang cocok dengan filter |
| Cari satu dokumen | `db.collection.findOne({...})` | Mengembalikan dokumen pertama yang cocok |
| Perbarui satu dokumen | `db.collection.updateOne({filter}, {$set: {...}})` | Memperbarui dokumen pertama yang cocok |
| Perbarui banyak dokumen | `db.collection.updateMany({filter}, {$set: {...}})` | Memperbarui semua dokumen yang cocok |
| Ganti dokumen | `db.collection.replaceOne({filter}, {...})` | Mengganti seluruh dokumen |
| Hapus satu dokumen | `db.collection.deleteOne({...})` | Menghapus dokumen pertama yang cocok |
| Hapus banyak dokumen | `db.collection.deleteMany({...})` | Menghapus semua dokumen yang cocok |
| Hitung dokumen | `db.collection.countDocuments({...})` | Mengembalikan jumlah dokumen yang cocok |
| Buat indeks | `db.collection.createIndex({field: 1})` | Membuat indeks ascending pada sebuah field |
| Hapus koleksi | `db.collection.drop()` | Menghapus seluruh koleksi |
| Hapus database | `db.dropDatabase()` | Menghapus database saat ini |

## Perintah Umum

### Dasar Koneksi dan Shell

```bash
# Memulai shell MongoDB
mongosh

# Terhubung ke cluster remote (Atlas)
mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net/myDB" --username admin

# Menjalankan file script dari shell
mongosh mydb script.js

# Keluar dari shell
exit
```

### Operasi CRUD

```bash
# Create - Menyisipkan dokumen
use bookstore

db.books.insertOne({
  title: "The Great Gatsby",
  author: "F. Scott Fitzgerald",
  year: 1925,
  genres: ["novel", "fiction"],
  inStock: true
})

db.books.insertMany([
  { title: "1984", author: "George Orwell", year: 1949, genres: ["dystopian", "fiction"], inStock: true },
  { title: "To Kill a Mockingbird", author: "Harper Lee", year: 1960, genres: ["fiction", "classic"], inStock: true },
  { title: "Moby Dick", author: "Herman Melville", year: 1851, genres: ["adventure", "classic"], inStock: false }
])
```

```bash
# Read - Query dokumen

# Cari semua buku
db.books.find()

# Cari dengan filter kesamaan
db.books.find({ author: "George Orwell" })

# Cari dengan proyeksi (hanya field tertentu)
db.books.find({}, { title: 1, year: 1, _id: 0 })

# Cari dengan operator perbandingan
db.books.find({ year: { $gt: 1900 } })          # Lebih besar dari
db.books.find({ year: { $gte: 1920, $lte: 1960 } })  # Rentang

# Cari dengan operator logika
db.books.find({ $or: [{ author: "Orwell" }, { year: { $gt: 1950 } }] })
db.books.find({ $and: [{ inStock: true }, { year: { $lt: 1930 } }] })

# Cari dengan operator array
db.books.find({ genres: { $in: ["dystopian", "adventure"] } })
db.books.find({ genres: { $all: ["fiction", "classic"] } })

# Urutkan, lewati, batasi
db.books.find().sort({ year: -1 }).skip(1).limit(2)
```

```bash
# Update - Memodifikasi dokumen

# Perbarui satu - set field
db.books.updateOne(
  { title: "Moby Dick" },
  { $set: { inStock: true, updatedAt: new Date() } }
)

# Perbarui banyak - increment field numerik
db.books.updateMany(
  {},
  { $inc: { timesQueried: 1 } }
)

# Push ke array
db.books.updateOne(
  { title: "1984" },
  { $push: { genres: "political" } }
)

# Ubah nama field
db.books.updateMany(
  {},
  { $rename: { "author": "authorName" } }
)
```

```bash
# Delete - Menghapus dokumen

# Hapus satu dokumen
db.books.deleteOne({ title: "Moby Dick" })

# Hapus banyak dokumen
db.books.deleteMany({ inStock: false })

# Hapus semua dokumen (pertahankan koleksi)
db.books.deleteMany({})
```

### Pembuatan Indeks

```bash
# Buat indeks field tunggal
db.books.createIndex({ title: 1 })        # Ascending
db.books.createIndex({ year: -1 })        # Descending

# Buat indeks komposit
db.books.createIndex({ author: 1, year: -1 })

# Buat indeks unik
db.books.createIndex({ isbn: 1 }, { unique: true })

# Buat indeks teks untuk pencarian full-text
db.books.createIndex({ title: "text", description: "text" })

# Tampilkan semua indeks
db.books.getIndexes()

# Hapus indeks tertentu
db.books.dropIndex("title_1")

# Explain eksekusi query
db.books.find({ author: "Orwell" }).explain("executionStats")
```

## Potongan Kode

### Pipeline Agregasi

```javascript
// Tahapan pipeline: $match, $group, $sort, $project
db.books.aggregate([
  { $match: { inStock: true } },
  { $group: { _id: "$authorName", bookCount: { $sum: 1 }, avgYear: { $avg: "$year" } } },
  { $sort: { bookCount: -1 } },
  { $project: { authorName: "$_id", bookCount: 1, avgYear: 1, _id: 0 } }
])

// Menggunakan $lookup untuk join (MongoDB 3.2+)
db.orders.aggregate([
  {
    $lookup: {
      from: "books",
      localField: "bookId",
      foreignField: "_id",
      as: "bookDetails"
    }
  },
  { $unwind: "$bookDetails" },
  {
    $project: {
      orderId: 1,
      bookTitle: "$bookDetails.title",
      quantity: 1,
      totalPrice: { $multiply: ["$quantity", "$bookDetails.price"] }
    }
  }
])

// Contoh $addFields dan $out
db.books.aggregate([
  { $addFields: { decade: { $floor: { $divide: ["$year", 10] } } } },
  { $group: { _id: "$decade", titles: { $push: "$title" } } },
  { $sort: { _id: 1 } },
  { $out: "books_by_decade" }
])
```

### Koneksi Node.js Driver (Mongoose)

```javascript
const mongoose = require('mongoose');

// Terhubung ke MongoDB
await mongoose.connect('mongodb://localhost:27017/bookstore', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Mendefinisikan schema
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  author: { type: String, required: true },
  year: { type: Number, min: 0 },
  genres: [String],
  inStock: { type: Boolean, default: true },
  price: { type: Number, min: 0 }
}, { timestamps: true });

// Membuat model
const Book = mongoose.model('Book', bookSchema);

// CRUD dengan Mongoose
const book = await Book.create({ title: 'Dune', author: 'Frank Herbert', year: 1965 });
const books = await Book.find({ year: { $gt: 1900 } }).sort({ year: -1 }).limit(10);
const updated = await Book.findOneAndUpdate(
  { title: 'Dune' },
  { $set: { price: 15.99 } },
  { new: true }
);
await Book.deleteMany({ inStock: false });

// Agregasi dengan Mongoose
const stats = await Book.aggregate([
  { $group: { _id: '$author', totalBooks: { $sum: 1 }, avgYear: { $avg: '$year' } } },
  { $sort: { totalBooks: -1 } }
]);
```

### Praktik Terbaik Indeks

```javascript
// Explain query untuk memeriksa penggunaan indeks
db.books.find({ author: "Orwell", year: { $gt: 1940 } }).explain("executionStats")

// Buat indeks untuk pola query umum
db.books.createIndex({ author: 1, year: -1 })  // Mendukung {author: X} dan {author: X, year: ...}

// Buat indeks TTL (kedaluwarsa otomatis dokumen)
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 })

// Buat indeks geospasial
db.places.createIndex({ location: "2dsphere" })
db.places.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [-73.97, 40.77] },
      $maxDistance: 1000
    }
  }
})
```

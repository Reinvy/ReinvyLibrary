---
title: "Judul"
description: "Tutorial ini membahas cara mengimplementasikan fitur paginasi, pencarian (filtering), dan pengurutan (sorting) pada REST API yang dibangun dengan Express.js. An"
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Judul

Paginasi, Filtering, dan Sorting pada API Express.js

## Ringkasan Singkat

Tutorial ini membahas cara mengimplementasikan fitur paginasi, pencarian (*filtering*), dan pengurutan (*sorting*) pada REST API yang dibangun dengan Express.js. Anda akan belajar bagaimana mengelola dataset besar dengan membatasi jumlah data yang dikirim, memungkinkan klien mencari data spesifik, dan menyusun urutan data secara rapi.

## Untuk Siapa Materi Ini

- **Target Pembaca:** Developer back-end tingkat menengah yang sedang membangun REST API.
- **Level:** Menengah (Intermediate).

## Prasyarat

- Pemahaman solid tentang dasar-dasar Node.js dan Express.js.
- Pengalaman dengan prinsip desain REST API.
- Pemahaman cara mengambil data dari database (SQL atau NoSQL).
- Pemahaman dasar tentang HTTP Query Parameters.

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan mampu:

- Mengimplementasikan paginasi menggunakan query parameter (`page` dan `limit`).
- Menambahkan mekanisme *filtering* agar klien dapat mengambil subset data tertentu.
- Mengaktifkan fitur *sorting* untuk mengurutkan hasil berdasarkan satu atau beberapa field.
- Menggabungkan paginasi, filtering, dan sorting ke dalam satu struktur API yang rapi dan dapat digunakan ulang.
- Memahami dampak performa dari dataset besar dan cara mengoptimasi query database.

## Konteks dan Motivasi

Ketika aplikasi Anda berkembang dan database memiliki ribuan hingga jutaan baris data, mengembalikan semua data tersebut dalam satu kali respons API adalah hal yang tidak masuk akal. Ini akan memakan memori, bandwidth, dan waktu proses yang besar, sehingga aplikasi menjadi lambat dan memberikan pengalaman buruk bagi pengguna.

Dengan menerapkan paginasi, *filtering*, dan *sorting*, Anda memberikan kebebasan kepada klien (frontend atau aplikasi mobile) untuk mengambil tepat apa yang mereka butuhkan dalam ukuran yang terkelola. Fitur-fitur ini adalah standar industri untuk API skala produksi (seperti daftar produk e-commerce atau dashboard data).

## Materi Inti

### 1. Mengekstrak Query Parameters

Dalam Express, parameter dari URL (query string) dapat diakses melalui objek `req.query`. Ketika klien melakukan request seperti `GET /api/products?page=2&limit=10&sort=price&category=electronics`, Express akan mengubahnya menjadi objek JavaScript:

```javascript
{
  page: '2',
  limit: '10',
  sort: 'price',
  category: 'electronics'
}
```

### 2. Mengimplementasikan Paginasi

Paginasi membatasi jumlah data yang dikembalikan pada setiap request. Ada dua pendekatan umum: *Offset-based* dan *Cursor-based*. Kita akan fokus pada *Offset-based pagination* karena ini adalah yang paling umum digunakan.

Anda membutuhkan dua parameter:

- `page`: Nomor halaman saat ini (default: 1).
- `limit`: Jumlah data per halaman (default: 10).

Dari kedua nilai ini, Anda bisa menghitung nilai `skip` (atau `offset`) untuk query database Anda:
`skip = (page - 1) * limit`

### 3. Mengimplementasikan Filtering

*Filtering* memungkinkan klien menyaring hasil berdasarkan kriteria tertentu. Contohnya, mencari produk berdasarkan kategori atau rentang harga.
Anda perlu melakukan iterasi pada query parameter dan membangun objek query yang dipahami oleh ORM atau database driver Anda. Sangat penting untuk mengabaikan parameter struktural (seperti `page`, `limit`, dan `sort`) saat membangun filter ini.

### 4. Mengimplementasikan Sorting

*Sorting* mengurutkan data berdasarkan satu field atau lebih. Pola yang sering digunakan adalah mengirimkan nama field, dan menggunakan awalan tanda `-` untuk urutan menurun/descending (contoh: `sort=-price` atau `sort=createdAt`). Anda perlu mem-parsing parameter ini dan menyesuaikannya dengan format database.

## Contoh / Ilustrasi

Berikut adalah contoh menggunakan Express dan Mongoose (MongoDB) yang mendemonstrasikan penggabungan ketiga konsep tersebut.

```javascript
const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // Asumsi model Mongoose sudah ada

router.get('/products', async (req, res) => {
  try {
    // 1. Filtering
    // Copy req.query agar tidak mengubah objek aslinya
    const queryObj = { ...req.query };

    // Hapus field struktural dari objek filter
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Filtering tingkat lanjut (contoh: mengubah gte, gt, lte, lt menjadi operator MongoDB seperti $gte)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    let query = Product.find(JSON.parse(queryStr));

    // 2. Sorting
    if (req.query.sort) {
      // Ubah 'price,-createdAt' menjadi 'price -createdAt' untuk Mongoose
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      // Sorting bawaan (default)
      query = query.sort('-createdAt');
    }

    // 3. Paginasi
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    // Eksekusi query
    const products = await query;

    // Opsional: Dapatkan total data untuk kontrol paginasi di frontend
    const total = await Product.countDocuments(JSON.parse(queryStr));

    res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: products
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
```

## Insight Penting

- **Selalu Validasi Input:** Query parameter selalu berupa string. Pastikan Anda melakukan parsing ke tipe integer untuk `limit` dan `page`. Validasi juga bahwa field yang diminta untuk *sorting* atau *filtering* benar-benar ada di database Anda untuk mencegah *injection attack*.
- **Batasi Maksimal Limit:** Jangan pernah biarkan klien meminta data tanpa batas (contoh: `limit=10000`). Selalu pasang batas maksimal (hard limit) di sisi server untuk melindungi database dari kelelahan sumber daya (*resource exhaustion*).
- **Cursor vs Offset:** Paginasi berbasis offset (`skip`/`limit`) bisa menjadi sangat lambat pada dataset yang sangat besar karena database tetap harus menghitung dan melewati baris data sebelumnya. Untuk dataset masif atau fitur *infinite scroll*, pertimbangkan untuk menggunakan *Cursor-based pagination*.
- **Gunakan Index Database:** Operasi *filtering* dan *sorting* cukup membebani server database. Pastikan Anda membuat *index* pada field yang sering digunakan untuk disaring atau diurutkan.

## Ringkasan Akhir

- `req.query` digunakan untuk menangkap parameter paginasi, filtering, dan sorting dari URL.
- **Paginasi** membagi data menjadi potongan kecil menggunakan `page` dan `limit`.
- **Filtering** membangun query secara dinamis untuk mengambil data yang spesifik.
- **Sorting** mengurutkan respons data berdasarkan preferensi klien.
- Menggabungkan ketiga fitur ini membuat API Anda lebih fleksibel, cepat, dan siap digunakan di production.

## Langkah Belajar Berikutnya

- Pelajari **Cursor-based Pagination** untuk aplikasi dengan performa tinggi.
- Pelajari strategi *caching* (seperti menggunakan Redis) untuk menyimpan respons data paginasi yang sering diakses.
- Baca kembali [Data Validation and Error Handling in Express](Data%20Validation%20and%20Error%20Handling%20in%20Express_ID.md) untuk mengamankan query parameter Anda.

## Metadata

- Level: Menengah (Intermediate)
- Topik utama: Express.js, API Design
- Topik terkait: Database Queries, Pagination, RESTful APIs
- Kata kunci: Express, paginasi, filtering, sorting, REST API, query parameter
- Estimasi waktu baca: 10 menit

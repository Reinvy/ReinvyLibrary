---
title: "Tutorial Text Search dan Atlas Search MongoDB"
description: "Membangun pencarian full-text di MongoDB dengan indeks $text berbobot dan skor relevansi, lalu beralih ke Atlas Search untuk analyzer, autocomplete, dan faceting."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Tutorial Text Search dan Atlas Search MongoDB

## Ringkasan

Tutorial ini membandingkan dua mesin pencarian MongoDB: operator `$text` bawaan yang ditopang indeks teks berbobot, dan Atlas Search, mesin berbasis Lucene yang diekspos sebagai stage agregasi `$search`. Anda akan membangun pencarian produk dengan peringkat relevansi, toleransi salah ketik, autocomplete, dan hitungan facet.

## Target Audiens

- Backend developer dan database engineer yang menambahkan fitur pencarian pada aplikasi berbasis MongoDB.
- Level menengah: Anda sudah terbiasa menulis query, agregasi, dan indeks di `mongosh` maupun dari driver.

## Prasyarat

- MongoDB 6.0+ secara lokal, atau cluster Atlas (tier gratis M0 sudah mendukung Atlas Search).
- `mongosh` terhubung ke cluster, serta Node.js 20+ dengan driver `mongodb` v6.
- Koleksi `shop.products` dengan field `name`, `description`, `category`, dan `price`.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan mampu:

- Membuat indeks teks gabungan dengan bobot per field dan bahasa yang eksplisit.
- Menulis query `$text` dengan frasa, negasi, dan pengurutan relevansi lewat `$meta: "textScore"`.
- Menjelaskan mengapa `$text` tidak bisa fuzzy atau pencarian prefix, dan kapan harus berganti mesin.
- Mendefinisikan indeks Atlas Search dengan mapping field dan analyzer yang eksplisit.
- Menjalankan query autocomplete dan faceted dengan `$search` serta `$searchMeta`.

## Konteks dan Motivasi

Percobaan pertama orang biasanya berupa regex case-insensitive, `{ name: /laptop/i }`. Regex tidak bisa memanfaatkan indeks B-tree secara efisien sehingga setiap request memindai seluruh koleksi, dan regex tidak punya konsep relevansi: dokumen yang menyebut "laptop" sekali dinilai sama dengan dokumen yang menyebutnya dua belas kali di judul.

`$text` menyelesaikan separuh masalah dengan murah: ia melakukan tokenisasi, membuang stop word, melakukan stemming, dan menyimpan inverted index, sehingga query mencocokkan term indeks alih-alih string mentah — dan ia mengembalikan skor yang bisa diurutkan. Kekurangannya, `$text` sengaja dibuat sederhana: tanpa fuzzy matching, tanpa pencarian prefix, tanpa sinonim, dan tanpa kendali analyzer per query. Begitu kotak pencarian harus tahan terhadap salah ketik atau menyarankan hasil saat pengguna mengetik, Anda butuh Atlas Search. Memahami batas ini mencegah Anda meng-engineering berlebihan sebuah filter, atau mengirim kotak pencarian yang gagal pada salah ketik pertama.

## Konten Inti

### Cara kerja indeks teks

Indeks teks menyimpan token yang sudah di-stem dan di-lowercase, dipetakan ke ID dokumen. Anda hanya boleh punya satu indeks teks per koleksi, tetapi indeks itu bisa mencakup banyak field, termasuk array of string. Tokenisasi mengikuti `default_language`: `english` membuang stop word dan melakukan stemming, sedangkan `none` menyimpan token mentah — pilihan tepat untuk SKU, identifier, dan teks Indonesia yang akar katanya rusak bila di-stem dengan aturan Inggris. Bobot field memengaruhi relevansi: kecocokan di `title` dengan bobot 10 mengalahkan kecocokan yang sama di `body` berbobot 1. Nilainya bilangan bulat 1 sampai 99.999 dan tersimpan di dalam indeks, jadi mengubahnya berarti rebuild — pastikan bobotnya sebelum mengindeks jutaan dokumen.

### Query dengan $text

`$text` menerima OR implisit antar term, `"frasa dalam kutip"`, dan `-negasi`. Opsi `$language`, `$caseSensitive`, dan `$diacriticSensitive` mengatur pencocokan per query. Predikatnya harus berada di level teratas filter — tidak boleh di dalam cabang `$or` — dan `hint()` ditolak bila dipakai bersamanya. `{ $meta: "textScore" }` memproyeksikan skor relevansi, dan mengurutkan dengan ekspresi yang sama menempatkan hasil terbaik di atas.

### Batas kemampuan $text

`$text` mencocokkan token utuh. "lap" tidak akan cocok dengan "laptop", "laptpo" tidak akan cocok dengan "laptop", dan tidak ada boost per klausa maupun sinonim. Akal-akalan yang umum — field n-gram yang dipelihara aplikasi — melipatgandakan biaya penyimpanan dan penulisan namun tetap kalah dalam kualitas peringkat. Di titik itulah Atlas Search mulai sepadan.

### Arsitektur Atlas Search

Atlas Search memelihara indeks Lucene terpisah yang direplikasi terus-menerus dari oplog cluster. Anda mengaksesnya lewat `$search` (dokumen) dan `$searchMeta` (hitungan serta facet) sebagai stage **pertama** dalam pipeline; stage berikutnya memfilter, mengurutkan, dan memproyeksikan dokumen yang sudah diperkaya. Karena indeksnya deklaratif, mengubah analyzer berarti re-index, bukan perubahan kode.

### Analyzer, autocomplete, dan faceting

Analyzer menentukan bagaimana teks dipecah dan dinormalisasi. `lucene.standard` melakukan lowercase dan memecah pada batas kata, `lucene.english` juga melakukan stemming, `lucene.keyword` menyimpan satu nilai sebagai satu token (ideal untuk tag), dan `edgeGram` menghasilkan prefix untuk type-ahead. Analyzer indeks dan pencarian boleh berbeda — indeks `edgeGram` dengan search analyzer standar adalah pasangan autocomplete yang lazim. Operator `autocomplete` lalu menyediakan `tokenOrder: "sequential"` untuk presisi, `"any"` untuk recall, dan `fuzzy: { maxEdits: 1 }` untuk satu salah ketik. Untuk filter, `$searchMeta` dengan blok `facet` mengembalikan total hit dan hitungan per bucket dalam satu round trip: facet string memerlukan tipe indeks `stringFacet`, facet numerik memakai boundary eksplisit.

## Contoh Kode

### Indeks teks berbobot dan query $text

```javascript
// Satu indeks teks per koleksi; bobot ditetapkan saat indeks dibuat.
db.products.createIndex(
    { name: "text", description: "text", tags: "text" },
    { weights: { name: 10, tags: 5, description: 1 }, default_language: "english" }
);

// Cocokkan frasa, kecualikan satu term, urutkan berdasarkan relevansi.
db.products.find(
    { $text: { $search: "\"mechanical keyboard\" -refurbished" } },
    { name: 1, price: 1, score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } }).limit(5);

// Stage pemenang harus TEXT_MATCH, bukan COLLSCAN.
db.products.find({ $text: { $search: "keyboard" } }).explain("executionStats");
```

### Mendeklarasikan indeks Atlas Search

```json
{
    "mappings": {
        "dynamic": false,
        "fields": {
            "name": [{ "type": "autocomplete", "tokenization": "edgeGram", "minGrams": 3, "maxGrams": 15 }],
            "description": { "type": "string", "analyzer": "lucene.english" },
            "category": { "type": "stringFacet" },
            "price": { "type": "number" }
        }
    }
}
```

Terapkan dengan `db.products.createSearchIndex({ name: "default", definition: <body> })`, lalu pantau `$listSearchIndexes` sampai statusnya `READY` sebelum melakukan query.

### Autocomplete dengan filter dari Node.js

```javascript
const { MongoClient } = require("mongodb");

async function searchProducts(query, { category, maxPrice = 500, limit = 10 } = {}) {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

    try {
        await client.connect();
        const products = client.db("shop").collection("products");
        // Klausa disimpan di array: compound tidak boleh punya key duplikat.
        const filters = [{ range: { path: "price", lte: maxPrice } }];
        if (category) {
            filters.push({ equals: { path: "category", value: category } });
        }

        return await products.aggregate([
            { $search: { index: "default", compound: {
                must: [{ autocomplete: {
                    query, path: "name", tokenOrder: "sequential",
                    fuzzy: { maxEdits: 1, prefixLength: 2 }
                } }],
                filter: filters
            } } },
            { $limit: limit },
            { $project: { _id: 0, name: 1, price: 1, score: { $meta: "searchScore" } } }
        ]).toArray();
    } catch (error) {
        console.error("Query Atlas Search gagal:", error.message);
        throw error;
    } finally {
        await client.close();
    }
}

module.exports = { searchProducts };
```

## Insight Penting

- **Satu indeks teks per koleksi, banyak field di dalamnya.** Bobot tersimpan di indeks, jadi finalkan bobotnya sebelum koleksi membesar.
- **`$text` tidak punya prefix atau fuzzy matching.** Perlakukan kebutuhan "cari sambil mengetik" sebagai kebutuhan Atlas Search sejak hari pertama.
- **Periksa `explain()` untuk `TEXT_MATCH`.** Filter regex sebelum `$text` memaksa collection scan; filter pada field skalar yang terindeks.
- **Sesuaikan analyzer dengan bahasanya.** Stemming Inggris pada teks Indonesia menghancurkan recall — gunakan `none` atau analyzer ICU.
- **Jaga `minGrams` di 2–3.** Edge gram satu karakter melipatgandakan ukuran indeks demi kenaikan recall yang nyaris nol.
- **Jangan pernah memulai pipeline `$search` dengan `$match`.** Atlas Search harus di stage pertama; filter skalar masuk ke `compound.filter`.

## Langkah Berikutnya

- Baca [tutorial MongoDB Indexing Strategies](/database/mongodb/tutorials/mongodb-indexing-strategies) untuk memahami struktur indeks di balik kedua mesin.
- Pelajari [tutorial MongoDB Aggregation Pipeline](/database/mongodb/tutorials/mongodb-aggregation-pipeline), karena `$search` bisa dikomposisikan dengan semua stage berikutnya.
- Eksplorasi sinonim Atlas, analyzer ICU folding, dan `$vectorSearch` untuk pencarian semantik.

## Kesimpulan

Anda kini menguasai kedua sisi pencarian MongoDB. Indeks `$text` memberi pencarian kata kunci yang murah dengan peringkat layak tanpa infrastruktur tambahan; Atlas Search memberi analyzer, toleransi salah ketik, autocomplete, dan faceting lewat stage agregasi biasa. Pilih `$text` bila token utuh sudah cukup dan cluster dikelola sendiri, dan pilih Atlas Search bila pencarian adalah fitur produk. Bagaimanapun, kualitas peringkat hanya sebaik definisi indeksnya, jadi simpan konfigurasi analyzer dan bobot dalam version control bersama kode aplikasi Anda.

---
title: "Cheat Sheet MongoDB Atlas"
description: "Referensi cepat MongoDB Atlas — siklus hidup cluster, pengguna database, akses jaringan, backup cloud, monitoring dan alert, Atlas Search, serta Data API melalui Atlas CLI, mongosh, dan HTTPS."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet MongoDB Atlas

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Login ke Atlas CLI | `atlas auth login` | Autentikasi CLI terhadap organisasi Atlas Anda |
| Verifikasi akun aktif | `atlas auth whoami` | Menampilkan pengguna yang login dan proyek saat ini |
| Membuat cluster gratis | `atlas clusters create demo --tier M0 --provider AWS --region ap-southeast-1` | Membuat replica set M0 shared |
| Membuat cluster sharded | `atlas clusters create app --tier M30 --shards 3 --type SHARDED` | Menyiapkan cluster sharded untuk skala besar |
| Mendapatkan connection string | `atlas clusters connectionStrings describe demo` | Menampilkan URI SRV untuk driver dan mongosh |
| Membuat pengguna database | `atlas dbusers create --username app --password s3cure --role readWriteAnyDatabase` | Menambah pengguna aplikasi dengan role minimal |
| Mengizinkan alamat IP | `atlas accessLists create --ip 203.0.113.10` | Whitelist IP untuk akses ke cluster |
| Menampilkan backup cloud | `atlas backups snapshots list demo` | Menampilkan snapshot point-in-time yang tersedia |
| Restore dari snapshot | `atlas backups restores start --clusterName demo --deliveryType DOWNLOAD` | Menjalankan pekerjaan restore |
| Membuat search index | `atlas search indexes create --clusterName demo --file index.json` | Menyebarkan indeks Atlas Search dari definisi JSON |
| Memeriksa metrik cluster | `atlas metrics demo --period PT1H` | Melihat statistik CPU, memori, dan koneksi |
| Mengonfigurasi alert | `atlas alerts settings create --file alert.json` | Menerapkan aturan alert berbasis ambang batas |

## Perintah Umum

### Manajemen Proyek dan Organisasi

```bash
# Menampilkan semua proyek yang dapat diakses
atlas projects list

# Membuat proyek baru
atlas projects create reinvy-prod

# Mengganti konteks proyek untuk perintah selanjutnya
atlas config set project_id 5f7b3c2e9d1a4b6c8d0e1f2a

# Menampilkan konfigurasi saat ini
atlas config list
```

### Siklus Hidup Cluster

```bash
# Membuat cluster shared (M0, M2, atau M5)
atlas clusters create atlas-demo --tier M0 --provider AWS --region ap-southeast-1

# Membuat cluster dedicated dengan ukuran instance khusus
atlas clusters create prod-app --tier M30 --provider AWS --region us-east-1 --diskSizeGB 40

# Membuat cluster sharded dengan tiga shard
atlas clusters create sharded-app --tier M30 --provider AWS --region eu-west-1 --shards 3 --type SHARDED

# Menampilkan cluster pada proyek saat ini
atlas clusters list

# Menjeda dan melanjutkan cluster dedicated untuk mengontrol biaya
atlas clusters pause prod-app
atlas clusters start prod-app

# Mengambil connection string cluster
atlas clusters connectionStrings describe prod-app

# Menghapus cluster (tidak dapat dibatalkan)
atlas clusters delete prod-app --force
```

### Pengguna Database

```bash
# Membuat pengguna aplikasi dengan akses baca/tulis
atlas dbusers create --username app --password 's3cure!' --role readWriteAnyDatabase

# Membuat pengguna read-only untuk alat pelaporan
atlas dbusers create --username reporter --password 'r3ad0nly' --role readAnyDatabase

# Membuat pengguna terbatas pada satu database
atlas dbusers create --username shop-api --password 'p4ssw0rd' --role readWrite --database shop

# Menampilkan, memperbarui, dan menghapus pengguna
atlas dbusers list
atlas dbusers update app --password 'n3wpass!'
atlas dbusers delete reporter --force
```

### Akses Jaringan (IP Access List)

```bash
# Mengizinkan akses dari satu alamat IP
atlas accessLists create --ip 203.0.113.10 --comment production-server

# Mengizinkan blok CIDR
atlas accessLists create --ip 203.0.113.0/24 --comment office-vpn

# Mengizinkan akses dari mana saja (khusus development — jangan untuk produksi)
atlas accessLists create --ip 0.0.0.0/0 --comment sandbox

# Menampilkan entri dan menghapus salah satunya
atlas accessLists list
atlas accessLists delete 203.0.113.10 --force
```

### Backup Cloud

```bash
# Menampilkan snapshot untuk sebuah cluster
atlas backups snapshots list prod-app

# Menampilkan detail satu snapshot
atlas backups snapshots describe 5f7b3c2e9d1a4b6c8d0e1f2a --clusterName prod-app

# Memulai pekerjaan restore
atlas backups restores start --clusterName prod-app --deliveryType DOWNLOAD

# Menampilkan pekerjaan restore yang sedang berjalan
atlas backups restores list prod-app
```

### Monitoring dan Alert

```bash
# Mengambil metrik untuk satu jam terakhir
atlas metrics prod-app --period PT1H

# Menampilkan semua alert yang aktif
atlas alerts list

# Membuat alert dari definisi JSON (lihat Potongan Kode)
atlas alerts settings create --file alert.json

# Menampilkan aturan konfigurasi alert
atlas alerts settings list
```

### Atlas Search

```bash
# Menampilkan search index untuk sebuah koleksi
atlas search indexes list --clusterName atlas-demo --database sample_mflix --collection movies

# Membuat indeks dari definisi JSON
atlas search indexes create --clusterName atlas-demo --database sample_mflix --collection movies --file index.json

# Memperbarui indeks berdasarkan ID
atlas search indexes update 65f1a2b3c4d5e6f7a8b9c0d1 --clusterName atlas-demo --database sample_mflix --collection movies --file index.json

# Menghapus indeks
atlas search indexes delete 65f1a2b3c4d5e6f7a8b9c0d1 --clusterName atlas-demo --database sample_mflix --collection movies --force
```

## Potongan Kode

### Menghubungkan dengan mongosh

```bash
# Selalu gunakan connection string SRV
mongosh "mongodb+srv://app:s3cure!@atlas-demo.xxxxx.mongodb.net/shop?retryWrites=true&w=majority"

# Atau berikan URI melalui environment variable
MONGODB_URI="mongodb+srv://app:s3cure!@atlas-demo.xxxxx.mongodb.net"
MONGODB_URI="$MONGODB_URI/?retryWrites=true&w=majority"
mongosh "$MONGODB_URI"
```

### Definisi Indeks Atlas Search

```json
{
  "name": "movie-autocomplete",
  "searchAnalyzer": "lucene.standard",
  "analyzer": "lucene.standard",
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string", "analyzer": "lucene.english" },
      "year": { "type": "number" }
    }
  }
}
```

### Menjalankan Query Atlas Search dari Driver

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();

const movies = client.db("sample_mflix").collection("movies");

// Atlas Search berjalan sebagai stage pertama pipeline agregasi
const results = await movies
  .aggregate([
    {
      $search: {
        index: "movie-autocomplete",
        autocomplete: { query: "interstel", path: "title" }
      }
    },
    { $limit: 5 }
  ])
  .toArray();

console.log(results.map((m) => m.title));
await client.close();
```

### Menulis Definisi Alert

```json
{
  "type": "OUTSIDE_METRIC_THRESHOLD",
  "enabled": true,
  "metricThreshold": {
    "metricName": "CONNECTIONS",
    "operator": "GREATER_THAN",
    "threshold": 500,
    "units": "RAW"
  },
  "notifications": [
    {
      "typeName": "GROUP",
      "intervalMin": 10,
      "emailEnabled": true
    }
  ]
}
```

### Memanggil Atlas Data API melalui HTTPS

```bash
# Data API menyediakan endpoint bergaya REST untuk setiap aksi
curl -X POST "https://ap-southeast-1.aws.data.mongodb-api.com/app/<app-id>/endpoint/data/v1/action/find" \
  -H "Content-Type: application/json" \
  -H "api-key: <data-api-key>" \
  -d '{
    "dataSource": "atlas-demo",
    "database": "shop",
    "collection": "products",
    "filter": { "price": { "$lt": 50 } },
    "sort": { "price": 1 },
    "limit": 10
  }'
```

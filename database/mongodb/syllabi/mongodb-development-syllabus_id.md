---
title: "Silabus Pengembangan MongoDB"
description: "Kurikulum 12 minggu yang komprehensif mencakup MongoDB dari fundamental pemodelan dokumen hingga deployment produksi, termasuk operasi CRUD, aggregation pipeline, pengindeksan, replikasi, sharding, keamanan, dan penyesuaian performa."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan MongoDB

## Ringkasan

Silabus 12 minggu ini dirancang untuk pengembang dan administrator database yang ingin menguasai MongoDB dari dasar. Dimulai dengan model data dokumen dan operasi CRUD dasar, kurikulum berlanjut melalui strategi pengindeksan, aggregation pipeline, pola desain skema, replikasi dan sharding, praktik terbaik keamanan, penyesuaian performa, dan diakhiri dengan proyek capstone yang menerapkan semua yang telah dipelajari. Setiap modul menggabungkan fondasi konseptual dengan latihan langsung menggunakan MongoDB shell, driver, dan perangkat operasional.

Pada akhir kursus ini, peserta akan mampu merancang skema dokumen yang efisien, menulis query agregasi yang kompleks, mengoperasikan replica set dan klaster sharded, menerapkan kontrol keamanan, dan men-deploy aplikasi MongoDB yang siap produksi.

## Kurikulum

### Modul 1: Pengenalan MongoDB dan Model Dokumen (Minggu 1)

- **Lanskap NoSQL dan gambaran umum MongoDB**
  - Membandingkan database dokumen, key-value, column-family, dan graph
  - Kapan memilih MongoDB vs. database relasional
  - MongoDB Atlas (cloud) vs. deployment mandiri
- **Instalasi dan konfigurasi**
  - Menginstal MongoDB Community Edition (Linux, macOS, Windows)
  - Dasar-dasar MongoDB Shell (`mongosh`)
  - Gambaran umum MongoDB Compass GUI
- **Model data dokumen**
  - BSON vs. JSON: tipe data dan encoding biner
  - Struktur dokumen, konvensi penamaan field, dan batasan ukuran
  - Dokumen tersemat (embedded) dan array
- **Langkah pertama**
  - Membuat dan berpindah database
  - Menyisipkan dokumen dengan `insertOne` dan `insertMany`
  - Query dengan `find`, `findOne`, dan proyeksi
  - Memperbarui dokumen dengan `updateOne`, `updateMany`, dan `replaceOne`
  - Menghapus dokumen dengan `deleteOne` dan `deleteMany`

### Modul 2: Operasi CRUD Mendalam (Minggu 2)

- **Operator query**
  - Operator perbandingan (`$eq`, `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$in`, `$nin`)
  - Operator logika (`$and`, `$or`, `$not`, `$nor`)
  - Operator elemen (`$exists`, `$type`)
  - Operator evaluasi (`$regex`, `$expr`, `$mod`, `$text`)
- **Query array dan dokumen tersemat**
  - Query ke dalam array (`$all`, `$elemMatch`, `$size`)
  - Notasi titik (dot notation) untuk field bersarang
  - Operator pembaruan array (`$push`, `$pull`, `$addToSet`, `$pop`, `$each`)
- **Pembaruan lanjutan**
  - Upsert dengan `upsert: true`
  - Penulisan massal dengan `bulkWrite`
  - `findOneAndUpdate`, `findOneAndDelete`, `findOneAndReplace`
- **Metode cursor**
  - `sort()`, `skip()`, `limit()`, `count()`
  - Iterasi cursor dan ukuran batch

### Modul 3: Pengindeksan dan Optimasi Query (Minggu 3)

- **Dasar-dasar indeks**
  - Cara kerja B-tree index di MongoDB
  - Membuat indeks dengan `createIndex`
  - Tipe indeks: single-field, compound, multikey, text, hashed, geospatial
- **Indeks majemuk (compound)**
  - Urutan key indeks dan aturan ESR (Equality-Sort-Range)
  - Covered query dan pemindaian khusus indeks
  - Prefix dan index intersection
- **Rencana query dan analisis performa**
  - Menggunakan `explain("executionStats")`
  - Penggunaan indeks dan pemindaian koleksi
  - Hinting indeks dan memaksa rencana query
- **Indeks khusus**
  - Text index untuk pencarian teks lengkap
  - TTL index untuk kedaluwarsa dokumen otomatis
  - Sparse, partial, dan unique index
  - Wildcard index untuk field dengan skema fleksibel

### Modul 4: Aggregation Pipeline (Minggu 4)

- **Dasar-dasar pipeline**
  - Pemrosesan dokumen berbasis tahap
  - `$match`, `$project`, `$group`, `$sort`, `$limit`, `$skip`
  - Optimasi pipeline dan urutan tahap
- **Pengelompokan dan transformasi**
  - Akumulator `$group` (`$sum`, `$avg`, `$min`, `$max`, `$push`, `$addToSet`)
  - `$unwind` untuk dekonstruksi array
  - `$addFields`, `$set`, `$unset` untuk transformasi dokumen
- **Operator array dan kondisional**
  - `$filter`, `$map`, `$reduce`, `$slice`
  - `$cond`, `$switch`, `$ifNull`
  - `$lookup` untuk penggabungan antar koleksi
- **Pola pipeline lanjutan**
  - `$bucket` dan `$bucketAuto` untuk pembuatan histogram
  - `$facet` untuk agregasi multi-aspek
  - `$merge` dan `$out` untuk persistensi hasil
  - Contoh analitik dunia nyata

### Modul 5: Desain Skema dan Pemodelan Data (Minggu 5)

- **Prinsip desain skema dokumen**
  - Trade-off embedding vs. referencing
  - Pola one-to-one, one-to-many, many-to-many
  - Anti-pola: array masif, join tidak perlu, dokumen tak terbatas
- **Pola desain skema**
  - Pola polymorphic, attribute, bucket, dan outlier
  - Computed pattern untuk nilai pra-agregasi
  - Pola subset, extended reference, dan approximation
- **Validasi skema**
  - Validasi dokumen dengan `$jsonSchema`
  - Aksi validasi (`error` vs. `warn`) dan level (`strict` vs. `moderate`)
  - Strategi migrasi untuk skema yang sudah ada
- **Pemodelan data time-series**
  - Bucketing untuk data time-series
  - MongoDB Time Series Collections
  - Konfigurasi granularity dan metadata

### Modul 6: Replikasi dan Ketersediaan Tinggi (Minggu 6)

- **Arsitektur replica set**
  - Node primary, secondary, dan arbiter
  - Mekanisme oplog (operations log)
  - Write concern dan read preference
- **Operasi replica set**
  - Men-deploy tiga-node replica set
  - Failover otomatis dan proses pemilihan
  - Menambah, menghapus, dan mengkonfigurasi ulang anggota
- **Skalabilitas baca dan lokalitas data**
  - Pembacaan secondary dengan `readPreference`
  - Read preference berbasis tag untuk distribusi geo
  - Delayed secondary untuk pemulihan bencana
- **Pemantauan replica set**
  - `rs.status()`, `rs.printReplicationInfo()`, `rs.printSecondaryReplicationInfo()`
  - Pemantauan dan penentuan ukuran jendela oplog

### Modul 7: Sharding dan Skalabilitas Horizontal (Minggu 7)

- **Konsep sharding**
  - Kapan melakukan sharding: ukuran data, throughput tulis, dan working set
  - Shard key dan distribusi chunk
  - Config server, mongos router, dan node shard
- **Pemilihan shard key**
  - Hashed vs. ranged sharding
  - Shard key monotonik dan skalabilitas tulis
  - Compound shard key untuk distribusi seimbang
- **Operasi klaster sharded**
  - Men-deploy klaster sharded
  - Mengaktifkan sharding pada database dan koleksi
  - Pembelahan, penyeimbangan, dan migrasi chunk
- **Pertimbangan operasional**
  - Chunk `jumbo` dan cara mengatasinya
  - Konfigurasi jendela `balancer`
  - Strategi backup untuk klaster sharded

### Modul 8: Keamanan dan Autentikasi (Minggu 8)

- **Autentikasi dan otorisasi**
  - Mengaktifkan autentikasi dengan `--auth`
  - Autentikasi SCRAM dan sertifikat x.509
  - Integrasi LDAP dan Kerberos (Enterprise)
- **Kontrol akses berbasis peran (RBAC)**
  - Peran bawaan: `read`, `readWrite`, `dbAdmin`, `userAdmin`, `clusterAdmin`
  - Membuat peran kustom dengan hak istimewa granular
  - Prinsip hak minimum untuk pengguna aplikasi
- **Keamanan jaringan**
  - Konfigurasi TLS/SSL untuk lalu lintas klien-ke-server dan internal
  - Whitelisting IP dan segmentasi jaringan
  - Konfigurasi `mongod` untuk deployment aman
- **Audit dan enkripsi**
  - Konfigurasi log audit (Enterprise)
  - Enkripsi saat istirahat dengan WiredTiger storage engine
  - Enkripsi tingkat field sisi klien (FLE) dengan enkripsi otomatis

### Modul 9: Backup, Restore, dan Pemulihan Bencana (Minggu 9)

- **Strategi backup**
  - `mongodump` dan `mongorestore` untuk backup logis
  - `mongooplog` untuk pemulihan titik waktu
  - Snapshot sistem file (LVM, EBS) untuk backup fisik
- **Backup Atlas (cloud)**
  - Backup berkelanjutan dengan pemulihan titik waktu
  - Penjadwalan snapshot dan kebijakan retensi
  - Restore ke klaster baru
- **Perencanaan pemulihan bencana**
  - Pengujian failover replica set
  - Replikasi lintas wilayah untuk pemulihan bencana
  - Validasi backup dan latihan restore
- **Perangkat operasional**
  - Skrip otomatisasi backup
  - Pemantauan integritas backup
  - Restore ke timestamp tertentu

### Modul 10: Penyesuaian Performa dan Pemantauan (Minggu 10)

- **Profil performa**
  - Database Profiler (`db.setProfilingLevel`)
  - Analisis koleksi `system.profile`
  - Mengidentifikasi query lambat dan kesenjangan indeks
- **Pemantauan dengan perangkat MongoDB**
  - `mongostat`, `mongotop`, `serverStatus`
  - MongoDB Cloud Manager dan Ops Manager
  - Integrasi Prometheus + Grafana dengan MongoDB exporter
- **Penyesuaian storage engine**
  - Konfigurasi cache WiredTiger (`storage.wiredTiger.engineConfig.cacheSizeGB`)
  - Pengaturan kompresi (snappy, zlib, zstd)
  - Perilaku journaling dan checkpoint
- **Connection pooling dan praktik terbaik driver**
  - Penentuan ukuran connection pool (`minPoolSize`, `maxPoolSize`)
  - Socket timeout, server selection timeout, dan logika retry
  - Praktik terbaik driver (Node.js, Python, Java, Go)

### Modul 11: Deployment Produksi dan DevOps (Minggu 11)

- **Perencanaan infrastruktur**
  - Penentuan ukuran server: CPU, RAM, disk (SSD vs. HDD)
  - Pertimbangan latensi jaringan dan topologi
  - Arsitektur deployment: standalone, replica set, klaster sharded
- **Manajemen konfigurasi**
  - Praktik terbaik file konfigurasi MongoDB
  - Batasan sistem (`ulimit`, `vm.max_map_count`) untuk produksi
  - Optimasi kernel dan sistem file
- **Orkestrasi dan otomatisasi**
  - Men-deploy MongoDB dengan Docker dan Docker Compose
  - Kubernetes StatefulSets untuk MongoDB (MongoDB Operator)
  - Infrastructure as Code (Terraform, Ansible)
- **Integrasi CI/CD**
  - Menjalankan MongoDB di pipeline CI (GitHub Actions, GitLab CI)
  - Otomatisasi migrasi skema
  - Pengujian terhadap instance MongoDB sementara

### Modul 12: Proyek Capstone (Minggu 12)

- **Penentuan lingkup proyek dan desain arsitektur**
  - Pengumpulan kebutuhan dan user stories
  - Desain skema dan pemodelan dokumen
  - Aggregation pipeline dan perencanaan query
  - Strategi replikasi dan sharding
- **Implementasi full-stack**
  - Membangun aplikasi kelas produksi dengan MongoDB sebagai penyimpan data utama
  - Mengimplementasikan operasi CRUD, pengindeksan, dan agregasi
  - Integrasi dengan framework backend (Express.js, FastAPI, Spring Boot)
  - Menambahkan autentikasi dan otorisasi
- **Penguatan produksi**
  - Deployment dengan TLS dan autentikasi aktif
  - Menyiapkan pemantauan dan notifikasi
  - Mengimplementasikan backup dan pemulihan bencana
  - Benchmark dan optimasi performa
- **Presentasi dan dokumentasi**
  - Diagram arsitektur dan dokumentasi skema
  - Runbook deployment
  - Presentasi akhir dan walkthrough kode

## Proyek Akhir

Peserta akan merancang dan membangun platform **dashboard analitik waktu nyata** bernama "DataVue" — aplikasi full-stack yang menyerap, memproses, dan memvisualisasikan data streaming menggunakan MongoDB sebagai penyimpan data utama. Proyek ini harus mencakup fitur-fitur berikut:

- **Penyerapan data**: REST API dan/atau WebSocket endpoint untuk menerima data time-series (misalnya metrik aplikasi, pembacaan sensor IoT, analitik website)
- **Pemodelan dokumen**: Skema yang dirancang dengan baik menggunakan pola embedding dan referencing dengan validasi skema
- **Strategi pengindeksan**: Compound, partial, dan TTL index yang dioptimalkan untuk pola query
- **Aggregation pipeline**: Agregasi waktu nyata menggunakan `$match`, `$group`, `$bucket`, dan `$facet` untuk menghasilkan statistik ringkasan, histogram, dan rollup time-series
- **Deployment replica set**: Tiga-node replica set yang dikonfigurasi dengan write concern dan read preference yang sesuai
- **Sharding (lanjutan opsional)**: Klaster sharded dengan shard key yang dipilih dengan tepat untuk skalabilitas horizontal
- **Keamanan**: Koneksi dengan TLS, kontrol akses berbasis peran, dan penyimpanan terenkripsi
- **Pemantauan**: Integrasi dengan stack pemantauan (Prometheus + Grafana atau MongoDB Atlas monitoring)
- **Visualisasi**: Dashboard berbasis web (React, Vue, atau template server-rendered) yang menampilkan metrik langsung dengan grafik dan tabel
- **Dokumentasi**: Dokumentasi arsitektur lengkap, referensi skema, runbook deployment, dan spesifikasi API

## Kriteria Penilaian

- **Tugas (40%)**: Latihan coding mingguan dan kuis pemahaman
  - Modul 1-3: Operasi CRUD, pengindeksan, dan latihan query
  - Modul 4-5: Aggregation pipeline dan tugas desain skema
  - Modul 6-8: Konfigurasi replikasi, sharding, dan keamanan
  - Modul 9-11: Otomatisasi backup, penyesuaian performa, dan skrip deployment

- **Proyek Tengah Semester (20%)**: Pipeline pemrosesan data analitik menggunakan MongoDB
  - Harus menggunakan aggregation pipeline dengan minimal lima tahap
  - Harus menyertakan compound index dan validasi skema
  - Harus mendemonstrasikan optimasi query dengan `explain`
  - Dievaluasi berdasarkan efisiensi pipeline, desain indeks, dan kualitas kode

- **Proyek Akhir Capstone (40%)**
  - Kelengkapan fitur dan fungsionalitas (25%)
  - Kualitas desain skema dan strategi pengindeksan (20%)
  - Kompleksitas dan efisiensi aggregation pipeline (15%)
  - Kesiapan produksi: keamanan, pemantauan, dan backup (20%)
  - Kualitas kode, dokumentasi, dan arsitektur (10%)
  - Presentasi dan walkthrough kode (10%)

## Referensi

- [Dokumentasi Resmi MongoDB](https://www.mongodb.com/docs/)
- [MongoDB University (kursus online gratis)](https://university.mongodb.com/)
- [Pusat Pengembang MongoDB](https://www.mongodb.com/developer/)
- [Panduan Pola Desain Skema MongoDB](https://www.mongodb.com/blog/post/building-with-patterns-a-summary)
- [Referensi Aggregation Pipeline MongoDB](https://www.mongodb.com/docs/manual/aggregation/)
- [Strategi Pengindeksan MongoDB](https://www.mongodb.com/docs/manual/indexes/)
- [Referensi Keamanan MongoDB](https://www.mongodb.com/docs/manual/security/)
- [Dokumentasi Sharding MongoDB](https://www.mongodb.com/docs/manual/sharding/)
- [Daftar Periksa Operasi MongoDB](https://www.mongodb.com/docs/manual/administration/production-checklist/)
- [Dokumentasi MongoDB Atlas](https://www.mongodb.com/docs/atlas/)
- "MongoDB: The Definitive Guide" oleh Shannon Bradshaw, Eoin Brazil, dan Kristina Chodorow (O'Reilly)
- "MongoDB Applied Design Patterns" oleh Rick Copeland (O'Reilly)
- [MongoDB dengan Docker](https://www.mongodb.com/compatibility/docker)
- [MongoDB Kubernetes Operator](https://www.mongodb.com/kubernetes)

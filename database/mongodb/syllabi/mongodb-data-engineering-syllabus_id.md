---
title: "Silabus Data Engineering dan Analitik MongoDB"
description: "Kurikulum tingkat lanjut selama 12 minggu untuk data engineer dan analis yang mencakup time series collections, aggregation pipeline untuk analitik, Atlas Search, Atlas Vector Search, change data capture, integrasi Kafka dan Spark, Atlas Data Federation, serta visualisasi BI dengan MongoDB."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Data Engineering dan Analitik MongoDB

## Ringkasan

Silabus tingkat lanjut selama 12 minggu ini dirancang bagi data engineer, analytics engineer, dan pengembang yang sudah memahami fundamental MongoDB dan ingin membangun sistem analitik serta sistem intensif-data modern di atas model dokumen. Berbeda dengan kurikulum MongoDB pada umumnya yang berfokus pada CRUD, replikasi, dan operasi klaster, kursus ini sepenuhnya didedikasikan untuk tumpukan data engineering dan analitik: time series collections untuk data sensor dan telemetri, agregasi tingkat lanjut untuk kueri analitik, Atlas Search untuk pencarian teks lengkap dan hibrida, Atlas Vector Search untuk beban kerja AI dan semantik, pipeline change data capture, konektor Kafka dan Spark, Atlas Data Federation untuk menanyakan data lake, serta visualisasi BI dengan Atlas Charts dan MongoDB BI Connector.

Setiap modul memadukan fondasi teoretis dengan laboratorium langsung menggunakan MongoDB Atlas, MongoDB shell, serta alat produksi nyata seperti Kafka, Spark, Airflow, dan Tableau. Kurikulum ini mengikuti perjalanan sebuah platform analitik waktu nyata: menyerap aliran data berkecepatan tinggi, menyimpannya secara efisien dalam time series collections, memperkayanya dengan kemampuan pencarian dan vektor, mentransformasikannya dengan pipeline berkelanjutan, menggabungkannya dengan penyimpanan data lake, dan akhirnya menampilkannya melalui dasbor serta alat BI berbasis SQL. Kursus ini diakhiri dengan proyek akhir yang mengharuskan perancangan, pembangunan, dan pengoperasian platform analitik waktu nyata ujung-ke-ujung yang melayani beban kerja analitik streaming maupun historis.

Di akhir kursus ini, peserta akan mampu memodelkan data deret waktu dengan granularity bucket dan kompresi yang tepat, menulis aggregation pipeline analitik dengan window functions, menerapkan indeks Atlas Search dan Atlas Vector Search, membangun pipeline change data capture dengan Kafka, mengolah data MongoDB dengan Spark DataFrames, menggabungkan kueri lintas MongoDB dan object storage, serta menerbitkan dasbor interaktif untuk pengguna bisnis.

## Kurikulum

### Modul 1: Fondasi Data Engineering dengan MongoDB (Minggu 1)

- **Peran MongoDB dalam platform data modern**
  - Beban kerja operasional (OLTP) vs. analitik (OLAP) dan kapan MongoDB melayani masing-masing
  - Model dokumen sebagai fondasi fleksibel-skema untuk kebutuhan analitik yang terus berkembang
  - Konsep lakehouse: data lake, warehouse, dan posisi MongoDB dalam tumpukan tersebut
  - Desain koleksi siap-analitik: denormalisasi, dokumen lebar, dan bentuk yang dioptimalkan untuk pembacaan

- **Pemodelan data analitik**
  - Mendesain koleksi berdasarkan pola kueri, bukan sekadar relasi entitas mentah
  - Menyematkan agregat prakomputasi versus menghitung saat pembacaan
  - Konsep star-schema dan tabel fakta yang diterjemahkan ke koleksi dokumen
  - Menangani slowly changing dimensions dengan versioning dokumen dan `$lookup`

- **Persiapan lingkungan**
  - Menyediakan klaster MongoDB Atlas (M10+ untuk beban kerja analitik khusus)
  - Terhubung dengan `mongosh`, driver, dan praktik terbaik connection string
  - Memuat dataset contoh (`sample_analytics`, `sample_training`) untuk pekerjaan lab
  - Organisasi proyek Atlas: tim, access lists, dan API keys untuk otomasi

### Modul 2: Time Series Collections (Minggu 2)

- **Fondasi time series collections**
  - Opsi `timeField`, `metaField`, dan `granularity`
  - Bagaimana MongoDB mengelompokkan pengukuran secara otomatis menjadi bucket dan mengapa hal itu menghemat penyimpanan
  - Kompresi bucket dengan delta encoding dan penulisan lanjutan
  - Membandingkan time series collections dengan koleksi reguler untuk beban kerja IoT

- **Mendesain skema time series**
  - Memilih granularity yang tepat (`seconds`, `minutes`, `hours`) sesuai irama data
  - Kardinalitas `metaField`: ID perangkat berkardinalitas tinggi versus grup teragregasi
  - Indeks sekunder pada `metaField` dan kolom pengukuran
  - Pola kueri: kueri rentang, downsampling, dan agregasi lintas bucket

- **Operasi dan migrasi**
  - Membuat time series collections dengan `mongosh` dan driver
  - Mengonversi koleksi reguler yang sudah ada ke format time series
  - Strategi retensi, kedaluwarsa, dan pengarsipan untuk telemetri bervolume tinggi
  - Memantau statistik bucket dan aktivitas penulisan ulang

### Modul 3: Aggregation Pipeline untuk Analitik (Minggu 3)

- **Tahap agregasi analitik**
  - `$match`, `$group`, `$sort`, dan `$project` untuk kueri berbentuk analitik
  - `$bucket` dan `$bucketAuto` untuk analisis histogram dan distribusi
  - `$densify` untuk mengisi celah waktu yang hilang
  - `$fill` untuk pengisian maju dan interpolasi nilai yang hilang

- **Window functions**
  - `$setWindowFields` dengan window `range` dan `documents`
  - Rata-rata bergerak, jumlah bergerak, dan total berjalan
  - Peringkat, lead/lag, dan fungsi distribusi kumulatif
  - `$topN`, `$bottomN`, dan analitik top-N terpartisi

- **Kueri analitik besar**
  - `allowDiskUse` untuk tahap sort dan group yang melampaui batas memori
  - Memecah pipeline berat dengan `$facet` untuk sub-pipeline paralel
  - Menulis hasil pipeline ke koleksi dengan `$out` dan `$merge`
  - Performa pipeline: penggunaan indeks di dalam `$match`, disiplin proyeksi

### Modul 4: Materialized Views dan Transformasi Berkelanjutan (Minggu 4)

- **Materialized views sesuai permintaan**
  - Membangun view agregat yang dapat digunakan kembali dengan `createView` dan `$merge`
  - Menyegarkan materialized views dan trade-off biayanya
  - Isolasi pembacaan dan konsistensi untuk koleksi turunan

- **Pola agregasi berkelanjutan**
  - ETL inkremental dengan change streams yang mengumpankan koleksi agregat
  - Arsitektur Lambda: lapisan batch dengan cron job, lapisan kecepatan dengan change streams
  - Arsitektur Kappa: streaming terpadu hanya dengan change streams
  - Pembaruan idempoten dan deduplikasi dalam pipeline turunan

- **Praktik terbaik transformasi data**
  - Membersihkan, menormalkan, dan memperkaya dokumen dalam pipeline
  - Validasi skema untuk koleksi keluaran analitik
  - Menangani peristiwa yang datang terlambat dan di luar urutan
  - Strategi backfill ketika logika transformasi berubah

### Modul 5: Atlas Search (Minggu 5)

- **Fondasi Atlas Search**
  - Indeks pencarian berbasis Lucene dan tahap agregasi `$search`
  - Membuat search index dengan UI Atlas dan search index API
  - Analyzer: tokenisasi standar, khusus, dan spesifik-bahasa
  - Pemetaan indeks: pemetaan bidang dinamis vs. statis

- **Operator pencarian**
  - Operator `text` dan `phrase` untuk peringkat relevansi
  - `autocomplete` untuk saran saat mengetik
  - Pencocokan `fuzzy` dan toleransi salah ketik
  - Kueri `compound` yang menggabungkan klausa must, should, filter, dan mustNot
  - Operator `range` dan `geo` untuk pencarian hibrida atas bidang terstruktur

- **Relevansi dan pengalaman pengguna pencarian**
  - Skor dengan `$meta: "searchScore"` dan `searchScoreDetails`
  - Pemetaan sinonim untuk kosakata domain
  - Menyorot istilah yang cocok dalam hasil
  - Mengintegrasikan pencarian dengan paginasi, faset, dan filter

### Modul 6: Atlas Vector Search dan Beban Kerja AI (Minggu 6)

- **Fondasi vector search**
  - Embedding: bagaimana data teks, gambar, dan audio menjadi vektor
  - Jenis indeks vektor: `vector`, `vectorSearch`, dan konfigurasi indeks
  - Tahap agregasi `$vectorSearch`: menanyakan tetangga terdekat
  - Metrik kemiripan: cosine, Euclidean, dan dot product

- **Membangun sistem pencarian dan RAG**
  - Pencarian semantik atas koleksi produk, dokumen, dan pengetahuan
  - Pencarian hibrida: menggabungkan peringkat kata kunci Atlas Search dengan kemiripan vektor
  - Pipeline retrieval-augmented generation (RAG) dengan MongoDB sebagai vector store
  - Memfilter vector search berdasarkan bidang metadata (opsi `filter`)

- **Strategi embedding dan pengindeksan**
  - Menghasilkan embedding dengan model OpenAI, Cohere, dan Hugging Face
  - Alur kerja batch embedding dan upsert
  - Kuantisasi dan trade-off memori untuk koleksi vektor besar
  - Memantau pembangunan indeks vektor dan latensi kueri

### Modul 7: Change Data Capture dan Pipeline Streaming (Minggu 7)

- **Change streams sebagai tulang punggung CDC**
  - Jenis peristiwa change stream dan resume tokens
  - `startAtOperationTime` dan `startAfter` untuk kontrol pemutaran ulang
  - Change streams pada klaster sharded dan pengurutan per-shard

- **Integrasi Kafka**
  - Kafka connector MongoDB: mode source dan sink
  - Menerbitkan peristiwa perubahan ke topik Kafka dengan source connector
  - Mengonsumsi peristiwa Kafka ke MongoDB dengan sink connector
  - Strategi partisi topik yang terkait dengan resume token change stream

- **Rekayasa pipeline streaming**
  - Trade-off CDC gaya Debezium vs. Kafka connector MongoDB asli
  - Semantik exactly-once vs. at-least-once dalam praktik
  - Schema registry dan serialisasi Avro/JSON untuk konsumen hilir
  - Memantau lag, percobaan ulang, dan dead-letter queues

### Modul 8: Atlas Data Federation dan Data Lake (Minggu 8)

- **Kueri terfederasi**
  - Atlas Data Federation: menanyakan object storage dari MongoDB
  - Federated database instances dan sumber data (AWS S3, Azure Blob, GCS)
  - Menanyakan banyak sumber dalam satu aggregation pipeline
  - Koleksi `$external` dan `$lookup` lintas sumber

- **Online archives dan penyimpanan berjenjang**
  - Memindahkan data dingin ke online archives dengan kebijakan otomatis
  - Menanyakan data arsip secara transparan melalui antarmuka yang sama
  - Siklus hidup data: jenjang hot, warm, dan cold dengan Atlas
  - Optimasi biaya dan retensi untuk data analitik bervolume tinggi

- **Pola data lake**
  - Desain lakehouse berbasis S3 dengan sumber Parquet dan JSON
  - Menanyakan data lake mentah versus koleksi terkurasi
  - Mereplikasi koleksi MongoDB ke object storage untuk analitik
  - Keamanan: kontrol akses terfederasi dan kredensial sumber data

### Modul 9: Integrasi BI dan Visualisasi (Minggu 9)

- **MongoDB BI Connector**
  - Akses SQL ke data MongoDB melalui BI Connector
  - Driver ODBC dan JDBC untuk Tableau, Power BI, dan Looker
  - Mendefinisikan skema (`sample_analytics`) untuk alat relasional
  - Pertimbangan performa saat menjalankan beban kerja SQL

- **Atlas Charts**
  - Membangun chart dan dasbor dari koleksi MongoDB
  - Visualisasi bertenaga agregasi dan encoding khusus
  - Chart tersemat dalam aplikasi dengan signed embeddings
  - Dasbor untuk pemantauan operasional dan pelacakan KPI bisnis

- **UX analitik waktu nyata**
  - Menggabungkan panel kueri langsung dengan agregat terwujud
  - Hierarki drill-down dari dasbor ke detail dokumen
  - Berbagi, penjadwalan, dan pemberitahuan dari dasbor
  - Performa halaman dan caching untuk beban kerja dasbor berat

### Modul 10: Pipeline Data dengan Apache Spark dan Kafka (Minggu 10)

- **Spark Connector MongoDB**
  - Membaca koleksi MongoDB ke Spark DataFrames
  - Menulis DataFrames dan hasil streaming kembali ke MongoDB
  - Spark SQL atas data MongoDB
  - Partisi dan paralelisme untuk ekspor skala besar

- **Pola pemrosesan Spark**
  - ETL batch: mentransformasi koleksi operasional menjadi koleksi analitik
  - Structured streaming dengan MongoDB sebagai source dan sink streaming
  - Menggabungkan data MongoDB dengan sumber data lain dalam satu job
  - Checkpointing dan toleransi kesalahan untuk job streaming

- **Orkestrasi pipeline**
  - Menjadwalkan job ETL MongoDB dengan Apache Airflow
  - Mengorkestrasi topik Kafka, job Spark, dan penulisan MongoDB
  - Memantau kesehatan pipeline dan kesegaran data
  - CI/CD untuk kode pipeline dengan pengujian otomatis terhadap data contoh

### Modul 11: Kualitas Data, Tata Kelola, dan Observabilitas (Minggu 11)

- **Rekayasa kualitas data**
  - Aturan validasi skema untuk koleksi analitik dan time series
  - Profil dataset: pemeriksaan nilai hilang, kardinalitas, dan distribusi
  - Kueri validasi dan pemeriksaan kualitas terjadwal
  - Menangani kegagalan kualitas dalam pipeline streaming (dead-letter queues)

- **Tata kelola dan kepatuhan**
  - Lineage data dari peristiwa sumber ke koleksi analitik turunan
  - Penanganan PII: enkripsi tingkat bidang untuk bidang analitik sensitif
  - Mengaudit akses ke data analitik dengan log audit MongoDB
  - Kebijakan retensi yang selaras dengan persyaratan regulasi

- **Memantau beban kerja analitik**
  - `$indexStats`, `explain()`, dan profiling untuk kueri pipeline
  - Pemantauan Atlas: metrik untuk beban kerja time series dan pencarian
  - Pemberitahuan tentang latensi kueri, pembangunan indeks vektor, dan lag penyerapan
  - Observabilitas biaya: penyimpanan, arsip, dan penentuan ukuran search node

### Modul 12: Proyek Akhir — Platform Analitik Waktu Nyata (Minggu 12)

- **Ringkasan proyek**
  - Membangun platform analitik ujung-ke-ujung untuk skenario e-commerce atau IoT simulasi
  - Menyerap peristiwa berkecepatan tinggi melalui Kafka ke time series collections
  - Memperkaya dokumen dengan Atlas Search dan embedding vektor
  - Mengekspos tampilan analitik melalui agregat terwujud dan dasbor BI

- **Deliverable yang dibutuhkan**
  - Pipeline penyerapan dengan Kafka source connector yang menghasilkan pembaruan chart langsung
  - Time series collection yang disetel sesuai irama peristiwa
  - Aggregation pipeline untuk setidaknya lima KPI analitik
  - Endpoint pencarian hibrida yang mengembalikan hasil kata kunci dan semantik
  - Kueri data federation yang menggabungkan object storage dengan data MongoDB
  - Dasbor Atlas Charts yang disematkan dalam aplikasi web sederhana
  - Dokumentasi tertulis keputusan arsitektur dan trade-off

- **Fokus evaluasi**
  - Kebenaran pemodelan time series dan konfigurasi bucket
  - Kesegaran ujung-ke-ujung: peristiwa terlihat di dasbor dalam latensi yang ditentukan
  - Kualitas relevansi pencarian dan kueri vektor
  - Kualitas kode, keandalan pipeline, dan pengaturan pemantauan

## Proyek Akhir

Proyek akhir adalah platform analitik waktu nyata yang dibangun dalam dua minggu terakhir kursus. Peserta merancang solusi data engineering lengkap untuk skenario pilihan mereka — sistem telemetri untuk perangkat terhubung, aliran peristiwa e-commerce, atau monitor transaksi keuangan. Platform harus menyerap peristiwa melalui Kafka ke time series collections MongoDB, memperkaya data dengan indeks Atlas Search dan embedding vektor, membangun materialized views berkelanjutan untuk KPI, menggabungkan kueri historis dengan data lake object storage, dan memvisualisasikan hasil dalam dasbor Atlas Charts yang disematkan di aplikasi web kecil. Peserta mempresentasikan demo langsung yang menunjukkan data streaming muncul di dasbor, pencarian hibrida mengembalikan hasil yang relevan, dan diagram arsitektur terdokumentasi yang menjelaskan setiap tahap pipeline.

## Kriteria Penilaian

- **Tugas**: Sembilan tugas lab langsung (satu per modul dari Minggu 1-11) yang dievaluasi berdasarkan kebenaran, penggunaan fitur MongoDB spesifik yang diajarkan, dan kejelasan kode. Kuis mingguan memverifikasi pemahaman konseptual tentang tahap pipeline, semantik indeks, dan konfigurasi konektor.
- **Proyek Akhir**: Dievaluasi berdasarkan fungsionalitas ujung-ke-ujung (penyerapan, penyimpanan, pengayaan, federasi, visualisasi), kebenaran desain time series dan indeks vektor, kesegaran data dan keandalan pipeline streaming, kualitas dokumentasi, serta demonstrasi langsung.
- **Partisipasi**: Tinjauan rekan atas desain pipeline peserta lain, berfokus pada trade-off arsitektur dan pertimbangan operasional.

## Referensi

- Dokumentasi MongoDB: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- Dokumentasi MongoDB: Aggregation Pipeline — https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- Dokumentasi MongoDB Atlas Search — https://www.mongodb.com/docs/atlas/atlas-search/
- Dokumentasi MongoDB Atlas Vector Search — https://www.mongodb.com/docs/atlas/atlas-vector-search/
- Dokumentasi MongoDB: Change Streams — https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Kafka Connector — https://www.mongodb.com/docs/kafka-connector/current/
- MongoDB Spark Connector — https://www.mongodb.com/docs/spark-connector/current/
- MongoDB Atlas Data Federation — https://www.mongodb.com/docs/atlas/data-federation/
- MongoDB Atlas Charts — https://www.mongodb.com/docs/charts/
- MongoDB BI Connector — https://www.mongodb.com/docs/bi-connector/current/
- MongoDB University: kursus Data Engineering — https://learn.mongodb.com/

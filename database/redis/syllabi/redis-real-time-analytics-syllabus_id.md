---
title: "Silabus Analitik Real-Time Redis"
description: "Kurikulum 12 minggu tingkat lanjut untuk membangun platform analitik real-time dengan RedisTimeSeries, mencakup pemodelan data deret waktu, pipeline ingestion streaming, pola agregasi dan kueri, dasbor langsung, deteksi anomali, peramalan, observabilitas, multi-tenancy, penskalaan, dan perencanaan kapasitas."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Analitik Real-Time Redis

## Ringkasan

Kurikulum tingkat lanjut 12 minggu ini dirancang untuk insinyur data, pengembang backend, dan insinyur platform yang ingin menguasai analitik real-time dengan Redis. Berbeda dengan kursus Redis umum yang membahas RedisTimeSeries hanya sebagai satu modul di antara banyak modul, kurikulum ini mendalami seluruh tumpukan analitik real-time: merancang model data deret waktu yang dapat diskalakan hingga jutaan deret, membangun pipeline ingestion streaming dari Kafka, MQTT, dan Redis Streams, menulis kueri agregasi dan lintas-deret yang ekspresif, serta menggerakkan dasbor langsung dengan penyegaran sub-detik. Kursus ini juga mencakup realitas operasional beban kerja analitik — deteksi anomali dan peramalan pada metrik streaming, keamanan multi-tenancy dan retensi data, ketersediaan tinggi dan penskalaan untuk data deret waktu, serta perencanaan kapasitas agar platform analitik Redis tetap cepat seiring bertambahnya kardinalitas.

Setiap modul menggabungkan fondasi teoretis yang mendalam dengan praktik laboratorium langsung yang menggunakan CLI Redis, klien Node.js, serta perangkat produksi nyata seperti Grafana dan RedisInsight. Peserta belajar secara progresif: mulai dari satu deret waktu, kemudian pipeline ingestion, lalu dasbor, kemudian lapisan deteksi dan peramalan, dan akhirnya platform analitik real-time yang lengkap sebagai proyek kapstone. Pada akhir kursus ini, peserta akan mampu merancang, membangun, men-deploy, dan mengoperasikan sistem analitik real-time kelas produksi di atas Redis yang melayani metrik langsung, peringatan, dan KPI bisnis dengan latensi sub-milidetik.

## Kurikulum

### Modul 1: Fondasi Analitik Real-Time dengan Redis (Minggu 1)

- **Mengapa Analitik Real-Time**
  - Analitik batch versus streaming: anggaran latensi, kesegaran data, dan jendela keputusan
  - Kasus penggunaan real-time: telemetri IoT, data tick finansial, KPI e-commerce, observabilitas
  - Pipeline analitik: ingest, simpan, agregasi, visualisasi, peringatan
- **Redis sebagai Fondasi Analitik**
  - Performa in-memory versus mesin analitik berbasis disk
  - RedisTimeSeries dan Redis Stack: opsi instalasi (`redis-stack-server`, image Docker, cloud terkelola)
  - Kapan Redis adalah penyimpan analitik yang tepat dan kapan tidak
- **Fondasi Model Data Deret Waktu**
  - Kunci deret, timestamp, nilai, dan label
  - `TS.CREATE` dengan retensi, ukuran chunk, dan kebijakan duplikat
  - Menulis titik dengan `TS.ADD`, `TS.MADD`, `TS.INCRBY`, `TS.DECRBY`
  - Membaca titik dengan `TS.GET`, `TS.RANGE`, `TS.REVRANGE`
- **Persiapan Laboratorium**
  - Menjalankan Redis Stack secara lokal dengan Docker Compose
  - Terhubung dengan `redis-cli` dan klien Node.js (node-redis dengan perintah Redis Stack)
- **Praktik Laboratorium**: Buat deret waktu pertama Anda, tulis 1.000 titik dengan `TS.MADD`, dan baca kembali dengan kueri rentang dan filter

### Modul 2: Pemodelan Data Deret Waktu dengan RedisTimeSeries (Minggu 2)

- **Desain Kunci Deret**
  - Konvensi penamaan: pola `metrik:entitas:dimensi`
  - Satu deret per metrik versus desain label multi-dimensi
  - Kardinalitas label: apa yang membuat filter cepat dan apa yang meledakkan memori
- **Label dan Pemfilteran**
  - Menambahkan label saat pembuatan dan dengan `TS.ALTER`
  - Pencarian lintas-deret dengan `TS.MGET`, `TS.MRANGE`, dan `TS.QUERYINDEX`
  - Operator filter: kesetaraan, `!=`, dan keanggotaan himpunan
- **Retensi dan Kompaksi**
  - Jendela retensi mentah dan tier data panas/hangat/dingin
  - Aturan downsampling dengan `TS.CREATERULE` dan `TS.DELETERULE`
  - Bucket agregasi untuk kompaksi: `AVG`, `SUM`, `MIN`, `MAX`, `COUNT`, `FIRST`, `LAST`
- **Ukuran Chunk dan Kebijakan Duplikat**
  - Penyetelan ukuran chunk: memori per deret versus latensi kueri
  - Kebijakan duplikat: `BLOCK`, `FIRST`, `LAST`, `MIN`, `MAX`, `SUM`
  - Mengubah retensi dan kebijakan setelah pembuatan
- **Praktik Laboratorium**: Rancang skema metrik multi-dimensi untuk platform e-commerce dengan deret mentah 1 detik dan aturan kompaksi 1 menit, lalu kueri lintas dimensi dengan filter label

### Modul 3: Pipeline Ingestion Streaming (Minggu 3)

- **Arsitektur Ingestion**
  - Pola produsen: agen, SDK, eksportir, dan perangkat edge
  - Penulisan batch dengan `TS.MADD` untuk throughput
  - Penanganan backpressure dan semantik percobaan ulang
- **Redis Streams sebagai Bus Intake**
  - Ingestion `XADD` dengan consumer group untuk pemrosesan paralel
  - Fan-out stream-ke-deret-waktu: konsumen yang mem-parsing dan menulis `TS.ADD`
  - Ingestion idempoten dan perkiraan exactly-once
- **Sumber Eksternal**
  - Kafka ke Redis: Kafka Connect, mirroring, dan layanan jembatan
  - MQTT ke Redis untuk telemetri IoT dan data sensor
  - Remote write Prometheus ke RedisTimeSeries
  - Backfill data historis dari object storage atau basis data OLTP
- **Penanganan Kegagalan**
  - Stream dead-letter untuk event yang tidak dapat di-parse
  - Penekanan duplikat dengan kunci idempotensi dan deduplikasi berbasis waktu
- **Praktik Laboratorium**: Bangun pipeline ingestion Node.js yang mengonsumsi Redis Stream, memvalidasi event, dan menulis agregat ke deret waktu dengan batching dan stream dead-letter

### Modul 4: Pola Agregasi dan Kueri (Minggu 4)

- **Kueri Rentang Lintas Deret**
  - `TS.RANGE` dan `TS.REVRANGE` dengan perataan bucket waktu
  - `TS.MRANGE` dengan filter label serta `GROUPBY`/`REDUCE`
  - Kueri berdasarkan kumpulan label dengan `TS.QUERYINDEX`
- **Bucket Agregasi**
  - Agregasi bucket waktu: `AVG`, `SUM`, `MIN`, `MAX`, `COUNT`, `STD.P`, `STD.S`, `VAR.P`, `VAR.S`, `RANGE`, `FIRST`, `LAST`, `TWAP`
  - Bucket yang sejajar, bucket kosong, dan penanganan celah
- **Analitik Lintas Deret**
  - Mereduksi banyak deret menjadi satu dengan `GROUPBY` dan reducer
  - Membandingkan deret: rasio, delta, dan korelasi saat kueri
  - Membuat halaman hasil besar dan membatasi keluaran dengan `COUNT` dan `ALIGN`
- **Performa Kueri**
  - Membaca dari aturan kompaksi alih-alih deret mentah
  - Pushdown filter dan penggunaan indeks (`TS.INFO`)
  - Menyimpan hasil kueri populer dengan TTL pendek
- **Praktik Laboratorium**: Implementasikan kueri "top-N produk berdasarkan pendapatan dalam satu jam terakhir" dengan `TS.MRANGE`, `GROUPBY`, dan `REDUCE SUM`, lalu optimalkan dengan aturan kompaksi

### Modul 5: Dasbor dan Visualisasi Real-Time (Minggu 5)

- **Opsi Visualisasi**
  - Grafana dengan plugin Redis Data Source
  - RedisInsight untuk eksplorasi dan kueri ad-hoc
  - Dasbor web kustom dengan WebSocket dan Node.js
- **Pola Dasbor Langsung**
  - Loop penyegaran sub-detik dan batching kueri
  - Perataan bucket waktu untuk rendering grafik yang stabil
  - Pembaruan streaming dengan server-sent events dan umpan WebSocket
- **Integrasi Grafana**
  - Mengonfigurasi data source Redis, variabel, dan kueri templated
  - Dasbor multi-panel dengan sumber deret campuran
  - Anotasi untuk deployment dan insiden
- **Performa Dasbor**
  - Membatasi cakupan kueri dengan `LAST` dan jendela waktu
  - Tampilan pra-agregat untuk panel yang sering digunakan
  - Kontrol konkurensi dan connection pooling
- **Praktik Laboratorium**: Bangun dasbor Grafana langsung untuk tingkat ingestion, tingkat error, dan latensi p99 yang diumpankan oleh backend RedisTimeSeries, lalu bandingkan dengan dasbor WebSocket kustom

### Modul 6: Deteksi Anomali dan Peramalan (Minggu 6)

- **Fondasi Deteksi Anomali**
  - Ambang statis versus baseline dinamis
  - Metode statistik: z-score, rata-rata bergerak, dan deviasi standar bergerak
  - Baseline musiman untuk metrik periodik
- **Detektor di atas Redis**
  - Menghitung baseline dengan kueri rentang dan agregasi
  - Skor anomali streaming yang ditulis kembali ke deret waktu
  - Implementasi detektor dalam Node.js, Lua, atau Redis Functions
- **Teknik Peramalan**
  - Regresi linier dan pemulusan eksponensial pada deret historis
  - Model musiman sederhana dengan bucket harian/mingguan
  - Pita keyakinan serta batas atas/bawah sebagai deret
- **Peringatan**
  - Peringatan berbasis ambang dengan histeresis untuk menghindari flapping
  - Menggabungkan metrik: skor anomali + aturan konteks bisnis
  - Routing dan deduplikasi peringatan
- **Praktik Laboratorium**: Implementasikan detektor anomali baseline bergerak untuk metrik latensi, persisten skor anomali ke deret waktu, dan hubungkan peringatan Grafana dengan histeresis

### Modul 7: Analitik Produk dan Bisnis Real-Time (Minggu 7)

- **Pelacakan Event**
  - Instrumentasi page view, klik, konversi, dan penggunaan fitur
  - Skema event dan label yang diperlukan untuk kueri hilir
  - Event pelacakan sisi klien versus sisi server
- **KPI Real-Time**
  - Penghitung DAU/WAU/MAU dengan HyperLogLog dikombinasikan dengan snapshot deret waktu
  - Metrik pendapatan, pesanan, dan funnel yang dialirkan ke deret
  - Sessionization: awal/akhir sesi dari aliran event mentah
- **Analitik Funnel dan Kohort**
  - Kueri funnel bertahap dengan sorted set dan deret waktu
  - Retensi kohort antar bucket waktu
  - Telemetri uji A/B: memisahkan deret berdasarkan label varian
- **Analitik Geo**
  - Aliran event yang diperkaya dengan data geospasial
  - Agregasi berbasis wilayah dengan filter label
- **Praktik Laboratorium**: Bangun pipeline KPI real-time untuk demo e-commerce — intake event, deret pendapatan per jam, penghitung DAU, dan funnel konversi yang divisualisasikan secara langsung

### Modul 8: Observabilitas dan Rekayasa Metrik (Minggu 8)

- **Metrik untuk Aplikasi Anda**
  - Metode RED (Rate, Errors, Duration) dan USE (Utilization, Saturation, Errors)
  - Instrumentasi layanan Node.js, Python, dan Go untuk menulis metrik ke Redis
  - Log terstruktur versus metrik: kapan event menjadi deret
- **Integrasi Prometheus**
  - `redis_exporter` untuk metrik Redis itu sendiri
  - Remote write dari Prometheus ke RedisTimeSeries
  - Ingestion berbasis scrape dengan eksportir kustom
- **SLO dan Error Budget**
  - Mendefinisikan SLO dari data deret
  - Peringatan burn-rate error budget
  - Melacak keandalan dalam jendela waktu
- **Korelasi Tracing Terdistribusi**
  - ID trace dalam event stream dan deret latensi
  - Mengorelasikan lonjakan dengan deployment melalui anotasi
- **Praktik Laboratorium**: Instrumentasi layanan mikro contoh, kumpulkan metrik RED ke deret waktu, definisikan SLO dengan peringatan burn-rate, dan bangun dasbor observabilitas

### Modul 9: Keamanan dan Multi-Tenancy untuk Beban Kerja Analitik (Minggu 9)

- **Kontrol Akses dengan ACL**
  - Peran read-only untuk dasbor dan analis
  - Pengguna per tim dengan izin key-pattern
  - Membatasi perintah ke subset deret waktu (`TS.` commands) dan stream
- **Enkripsi dan Penguatan Jaringan**
  - TLS untuk endpoint ingestion dan koneksi dasbor
  - Segmentasi jaringan antara produsen, Redis, dan alat visualisasi
  - Autentikasi untuk Grafana dan RedisInsight
- **Retensi Data dan Privasi**
  - Kebijakan retensi sebagai kontrol privasi (minimalisasi data ala GDPR)
  - Penanganan PII dalam aliran event: pseudonimisasi sebelum ingestion
  - Strategi TTL dan penghapusan untuk data tingkat permintaan
- **Audit dan Kepatuhan**
  - Jejak audit dengan stream append-only
  - Deret tak berubah (immutable) untuk metrik penagihan atau regulasi
  - Daftar periksa konfigurasi least-privilege
- **Praktik Laboratorium**: Perkuat deployment analitik Redis — buat pengguna ACL read-only, aktifkan TLS untuk ingestion, terapkan kebijakan retensi untuk privasi, dan verifikasi pembatasan perintah

### Modul 10: Ketersediaan Tinggi dan Penskalaan untuk Data Deret Waktu (Minggu 10)

- **Model Penskalaan untuk Data Deret**
  - Sharding berdasarkan namespace metrik di seluruh slot Redis Cluster
  - Mempartisi metrik kardinalitas tinggi ke beberapa basis data
  - Fan-out ingestion ke beberapa replika untuk penskalaan pembacaan
- **Topologi Ketersediaan Tinggi**
  - Redis Sentinel untuk failover instans analitik
  - Redis Cluster untuk beban kerja deret waktu yang di-shard
  - Penyimpanan hibrida (RAM + flash) untuk jendela retensi besar
- **Pertimbangan Replikasi**
  - Pembacaan replika untuk kueri dasbor
  - `wait` dan trade-off konsistensi untuk ingestion
  - Perilaku failover dan re-ingestion duplikat setelah promosi
- **Pemulihan Bencana**
  - Strategi backup untuk data deret dan aturan kompaksi
  - Latihan restore dan pemulihan point-in-time dari status analitik
  - Pertimbangan multi-region dengan Redis Enterprise Active-Active
- **Praktik Laboratorium**: Deploy Redis Cluster tiga node dengan data deret waktu, shard kumpulan metrik kardinalitas tinggi, simulasikan kegagalan node, dan verifikasi kelangsungan dasbor selama failover

### Modul 11: Perencanaan Kapasitas dan Penyetelan Performa (Minggu 11)

- **Rekayasa Throughput Penulisan**
  - Memperkirakan anggaran event-per-detik dan sampel-per-detik
  - Batching `TS.MADD` dan penggunaan pipeline dengan klien Node.js
  - Menghindari round trip per titik: agregasi di sisi produsen
- **Pembuatan Anggaran Memori**
  - Sampel per deret × efisiensi chunk × retensi
  - Memperkirakan jejak dengan `TS.INFO` dan `MEMORY USAGE`
  - Aturan kompaksi sebagai tuas memori
- **Penyetelan Latensi**
  - Ukuran chunk dan pengaruhnya terhadap latensi tulis/baca
  - Coalescing jaringan, pengaturan TCP, dan pooling klien
  - Deteksi kueri lambat dengan `SLOWLOG`
- **Benchmarking**
  - Pengujian beban dengan penulis Node.js atau Go kustom
  - Memvalidasi latensi p99 dan throughput terhadap target
  - Mengamati metrik `INFO` selama beban
- **Praktik Laboratorium**: Dengan beban kerja target (100K sampel/detik, retensi 90 hari, 10K deret), buat rencana memori dan kapasitas, lalu validasi dengan uji beban dan sesuaikan ukuran chunk

### Modul 12: Proyek Kapstone — Platform Analitik Real-Time (Minggu 12)

- **Cakupan Proyek**
  - Pilih domain: analitik real-time e-commerce, pemantauan telemetri IoT, atau analitik tick finansial
  - Kebutuhan: ingestion streaming, pemodelan multi-dimensi, dasbor langsung, deteksi anomali, akses multi-tenant
- **Arsitektur**
  - Desain ujung-ke-ujung: produsen → bus ingestion (Redis Streams) → RedisTimeSeries → API kueri → dasbor
  - Strategi kompaksi, retensi, dan peringatan
  - Rencana kapasitas dan topologi ketersediaan tinggi
- **Implementasi**
  - Bangun pipeline ingestion, model data, dan lapisan kueri
  - Implementasikan dasbor langsung (Grafana dan/atau WebSocket kustom)
  - Tambahkan deteksi anomali dan routing peringatan
- **Penyerahan**
  - Dokumen arsitektur, runbook, dan rencana kapasitas
  - Hasil uji beban dan validasi performa
- **Praktik Laboratorium**: Presentasikan platform yang telah selesai dengan demo langsung, pertahankan keputusan desain, dan jalankan latihan kegagalan

## Proyek Akhir

Peserta membangun platform analitik real-time kelas produksi di atas RedisTimeSeries. Platform harus meng-ingest event streaming (dari Redis Stream, Kafka, atau sumber MQTT), memodelkan data deret waktu multi-dimensi dengan aturan retensi dan kompaksi, menyediakan API kueri, dan merender dasbor langsung dengan kesegaran sub-detik. Sistem harus menyertakan setidaknya satu detektor anomali atau lapisan peramalan dengan peringatan, menegakkan kontrol akses multi-tenant dengan ACL, dan dilengkapi rencana kapasitas serta topologi ketersediaan tinggi yang terdokumentasi. Domain yang disarankan meliputi dasbor penjualan dan keterlibatan e-commerce real-time, sistem pemantauan telemetri IoT, atau layanan analitik data tick finansial. Kapstone dinilai berdasarkan kesolidan arsitektur, kebenaran model deret waktu, performa di bawah beban, penguatan keamanan, dan dokumentasi operasional.

## Kriteria Penilaian

- **Tugas**: Praktik laboratorium mingguan (40%) — dinilai berdasarkan kebenaran perintah Redis, desain model data, dan pipeline ingestion/kueri yang berfungsi; dua latihan desain tertulis (10%) yang mencakup desain skema dan perencanaan kapasitas.
- **Proyek Akhir**: Platform kapstone (50%) — dievaluasi berdasarkan fungsionalitas ujung-ke-ujung, kualitas pemodelan deret waktu, kesegaran dan performa dasbor, efektivitas deteksi anomali, konfigurasi keamanan, serta kualitas rencana kapasitas dan runbook. Demo langsung dan latihan kegagalan wajib dilakukan.

## Referensi

- Dokumentasi resmi RedisTimeSeries: https://redis.io/docs/latest/develop/data-types/timeseries/
- Kursus Redis University tentang RedisTimeSeries dan Redis Stack: https://university.redis.com/
- Dokumentasi plugin Redis Data Source untuk Grafana: https://grafana.com/grafana/plugins/redis-datasource/
- Dokumentasi RedisInsight: https://redis.io/insight/
- Blog Redis tentang deret waktu dan kasus penggunaan analitik real-time: https://redis.io/blog/
- "Designing Data-Intensive Applications" oleh Martin Kleppmann (referensi sistem streaming)
- Dokumentasi Prometheus tentang remote write dan penamaan metrik: https://prometheus.io/docs/

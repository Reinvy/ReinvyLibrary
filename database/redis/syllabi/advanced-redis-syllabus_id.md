---
title: "Silabus Redis Tingkat Lanjut"
description: "Kurikulum 12 minggu tingkat lanjut untuk pengembang Redis berpengalaman yang mencakup modul Redis Stack, pencarian vektor, internal dan penyetelan performa, deployment di Kubernetes, Redis Enterprise, Streams produksi, observabilitas, dan arsitektur multi-region."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Redis Tingkat Lanjut

## Ringkasan

Kurikulum 12 minggu tingkat lanjut ini dirancang untuk pengembang, insinyur DevOps, dan administrator basis data yang telah memiliki pengalaman langsung dengan Redis dan ingin menguasai operasi tingkat perusahaan, kemampuan modern Redis Stack, dan desain sistem berskala besar. Kurikulum ini melampaui struktur data inti dan caching dasar untuk mencakup internal Redis dan penyetelan performa, pola Streams tingkat produksi, pencarian kemiripan vektor untuk beban kerja AI, deployment Kubernetes-native dengan Redis Operator, distribusi geo Active-Active Redis Enterprise, observabilitas dan perencanaan kapasitas otomatis, serta pengamanan untuk lingkungan teregulasi. Setiap modul menggabungkan fondasi teoretis yang mendalam dengan praktik laboratorium yang berorientasi produksi dan studi kasus dunia nyata. Kursus ini diakhiri dengan proyek kapstone yang memerlukan perancangan, deployment, dan pengoperasian arsitektur Redis multi-region dengan throughput tinggi yang melayani aplikasi contoh yang ditingkatkan dengan AI.

Pada akhir kursus ini, peserta akan mampu merancang dan mengimplementasikan solusi berbasis Redis untuk arsitektur mikroservis dan AI modern, melakukan deployment dan mengoperasikan Redis di Kubernetes dalam skala besar, menyetel Redis untuk latensi p99 sub-milidetik di bawah konkurensi tinggi, mengimplementasikan pipeline pencarian kemiripan vektor, dan membangun topologi multi-region yang tangguh dengan failover otomatis dan pemulihan bencana.

## Kurikulum

### Modul 1: Internal dan Arsitektur Redis (Minggu 1)

- **Event Loop dan Model I/O**
  - Arsitektur event loop single-threaded: internal `aeEventLoop`
  - I/O multipleksing: pemilihan backend `select`/`epoll`/`kqueue`
  - Thread I/O di Redis 6+: konfigurasi `io-threads` dan `io-threads-do-reads`
  - Evolusi model threading: penyimpanan latar belakang, rehashing inkremental, pembebasan malas
  - Pipeline pemrosesan perintah: socket → baca query → eksekusi → balas → bebaskan klien
- **Alokator Memori**
  - jemalloc vs glibc malloc: karakteristik fragmentasi dan trade-off
  - Arena jemalloc dan pembersihan thread latar belakang
  - Overhead memori per struktur data
  - Strategi defragmentasi memori: manual (`MEMORY PURGE`), defrag aktif (`ACTIVE DEFRAG`)
- **Penyetelan Event Loop**
  - Konfigurasi `hz`: akurasi vs trade-off CPU
  - `lfu-decay-time` dan `lfu-log-factor` untuk penyetelan eviction LFU
  - Pemantauan latensi dengan `LATENCY DOCTOR`, `LATENCY HISTOGRAM`
- **Praktik Laboratorium**: Profil latensi Redis dengan `redis-cli --intrinsic-latency` dan `LATENCY HISTOGRAM`, konfigurasi thread I/O, dan bandingkan fragmentasi alokator di bawah pola beban kerja berbeda

### Modul 2: Modul Redis Stack (Minggu 2)

- **RediSearch**
  - Pembuatan indeks: `FT.CREATE` dengan skema, prefiks, stopwords
  - Sintaks kueri: `FT.SEARCH`, `FT.AGGREGATE`, `FT.EXPLAIN`
  - Pencarian teks lengkap: stemming, pencarian fonetik, kueri fuzzy
  - Pelengkapan otomatis dan saran dengan `FT.SUGADD`, `FT.SUGGET`
  - Alias indeks dan pencarian multi-indeks
  - Optimasi performa: ukuran indeks, kursor, klausa `GEOFILTER` dan `FILTER`
- **RedisJSON**
  - Model data JSON dan sintaks path (`$`, `$.key[*]`, `$.key..subkey`)
  - Operasi CRUD: `JSON.SET`, `JSON.GET`, `JSON.DEL`, `JSON.ARRAPPEND`
  - Kueri JSONPath untuk pemfilteran bersarang
  - Operasi atomik pada sub-elemen JSON
- **RedisTimeSeries**
  - Model data deret waktu: kunci, timestamp, nilai, label
  - `TS.CREATE` dengan retensi, ukuran chunk, kebijakan duplikat
  - Kueri agregasi: `TS.RANGE`, `TS.MRANGE` dengan `AVG`, `SUM`, `MIN`, `MAX`, `STD.P`, `COUNT`
  - Downsampling dan aturan kompaksi
  - Integrasi dengan Prometheus melalui `redis_exporter`
- **RedisBloom**
  - Bloom filter: `BF.ADD`, `BF.EXISTS`, `BF.INFO`
  - Cuckoo filter: `CF.ADD`, `CF.EXISTS`, `CF.DEL` (mendukung penghapusan)
  - Top-K: `TOPK.ADD`, `TOPK.QUERY`, `TOPK.LIST`
  - Count-min sketch: `CMS.INCRBY`, `CMS.QUERY`, `CMS.INFO`
  - T-digest: `TDIGEST.ADD`, `TDIGEST.QUERY`, `TDIGEST.CDF`
- **Praktik Laboratorium**: Bangun mesin pencari dokumen dengan RediSearch, perkaya dengan penyimpanan JSON, tambahkan agregasi real-time dengan TimeSeries, dan implementasikan perkiraan hitungan unik dengan Bloom filter

### Modul 3: Pencarian Kemiripan Vektor dengan Redis (Minggu 3)

- **Dasar-Dasar Pencarian Vektor**
  - Pencarian berbasis embedding: dokumen → embedding → pencarian tetangga terdekat
  - Metrik jarak: cosine similarity (COSINE), jarak Euclidean (L2), inner product (IP)
  - Pencarian KNN eksak vs pencarian tetangga terdekat aproksimasi (ANN)
- **RediSearch Kemiripan Vektor**
  - Membuat indeks vektor: `FT.CREATE` dengan tipe field `VECTOR`
  - Algoritma indeks: FLAT (eksak) dan HNSW (aproksimasi)
  - Parameter HNSW: M (jumlah tepi per node), efConstruction, efRuntime
  - Kueri dengan `FT.SEARCH` dan parameter vektor
  - Kueri hibrida: menggabungkan pencarian vektor dengan filter dan teks lengkap
- **Pipeline Vektor Produksi**
  - Pembuatan embedding: integrasi dengan OpenAI, Hugging Face, atau model lokal
  - Strategi pengindeksan batch untuk dataset besar
  - Manajemen memori indeks: kompresi, kuantisasi
  - Pencarian vektor multi-modal: embedding teks + gambar
- **Kasus Penggunaan**
  - Pencarian produk semantik di e-commerce
  - Caching RAG (Retrieval-Augmented Generation) untuk LLM
  - Deteksi duplikat dan pengelompokan hampir duplikat
  - Sistem rekomendasi dengan kemiripan vektor
- **Praktik Laboratorium**: Masukkan kumpulan data dokumen, hasilkan embedding melalui model sentence-transformer lokal, buat indeks vektor HNSW di Redis, dan bangun API pencarian semantik yang menggabungkan kemiripan vektor dengan filter RediSearch

### Modul 4: Redis Streams Tingkat Lanjut (Minggu 4)

- **Tinjauan Arsitektur Streams**
  - Struktur kunci Stream: pengkodean radix tree, grup konsumen
  - Format ID pesan: `<millisecondsTime>-<sequenceNumber>`
  - Kueri rentang: `XRANGE`, `XREVRANGE`, `XREAD`
- **Pendalaman Grup Konsumen**
  - Pembuatan grup: `XGROUP CREATE` dengan strategi pengiriman `$` dan `0`
  - Klaim pesan: `XAUTOCLAIM`, `XCLAIM` dengan hitungan percobaan ulang dan waktu idle
  - Daftar entri tertunda: `XPENDING` untuk pemantauan surat mati
  - Penyeimbangan ulang grup konsumen: menambah dan menghapus konsumen
- **Pola Streams Produksi**
  - Pemrosesan exactly-once dengan konsumen idempoten
  - Antrean surat mati (DLQ) dengan stream terpisah
  - Super konsumen: banyak konsumen per partisi untuk pemrosesan prioritas
  - Sharding Stream: partisi di seluruh stream berdasarkan hash kunci
  - Penanganan backpressure dengan `MAXLEN` dan `XTRIM`
- **Streams vs Middleware Pesan Lain**
  - Perbandingan dengan Kafka: semantik retensi, perbedaan grup konsumen
  - Perbandingan dengan RabbitMQ: fleksibilitas routing, overhead protokol
  - Kapan menggunakan Streams vs Pub/Sub vs antrean berbasis List
- **Praktik Laboratorium**: Implementasikan pipeline pemrosesan acara multi-konsumen dengan antrean surat mati, pemulihan auto-claim, dan semantik exactly-once. Bandingkan throughput dengan Kafka dan RabbitMQ di bawah beban kerja serupa

### Modul 5: Fitur Redis 7+ (Minggu 5)

- **Redis Functions**
  - Functions vs skrip EVAL: versioning, persistensi, replikasi
  - Engine JavaScript: `V8_SCRIPT` dan `FUNCTION LOAD`
  - Pustaka Functions: `FUNCTION LIST`, `FUNCTION DELETE`
  - Eksekusi multi-perintah atomik tanpa caching skrip
- **ACL v2 dan Kontrol Akses**
  - Model izin granular: `ACL SETUSER` dengan izin perintah dan kunci
  - Kategori perintah: `+@read`, `+@write`, `+@admin`, `+@dangerous`
  - Izin ruang kunci: `~keys:*` (pola glob), `%R~keys:*` (selektor)
  - Log ACL dan pemantauan kegagalan otentikasi
  - `ACL SETUSER` dengan `reset`, `resetkeys`, `resetchannels`
- **Pub/Sub Terpartisi (Sharded Pub/Sub)**
  - Arsitektur: distribusi saluran berbasis hash slot
  - Perintah: `SSUBSCRIBE`, `SPUBLISH`, `SUNSUBSCRIBE`
  - Kasus penggunaan: notifikasi lintas node dalam mode cluster
  - Perbandingan dengan Pub/Sub biasa: skalabilitas, jaminan pengurutan
- **Peningkatan Redis 7 Lainnya**
  - Redis 7.2: peningkatan auto-failover, perintah `CLUSTER SHARDS`
  - Redis 7.4: dukungan set vektor, fitur deret waktu baru
- **Praktik Laboratorium**: Migrasi skrip Lua yang ada ke Redis Functions, konfigurasi ACL v2 dengan izin pengguna granular dan pemilih ruang kunci, implementasikan sistem notifikasi Pub/Sub terpartisi di Redis Cluster

### Modul 6: Redis di Kubernetes (Minggu 6)

- **Arsitektur Redis di Kubernetes**
  - Redis di VM telanjang vs deployment kontainer
  - StatefulSets vs Deployments untuk beban kerja Redis
  - PersistentVolumeClaim untuk persistensi Redis dalam kontainer
  - Permintaan dan batasan sumber daya: CPU, memori, penyimpanan sementara
- **Redis Operator**
  - Arsitektur Redis Operator: definisi sumber daya kustom (CRD)
  - Definisi sumber daya `RedisCluster`
  - Definisi sumber daya `Redis` (standalone/sentinel)
  - Failover otomatis, pencadangan, dan penskalaan melalui operator
  - Siklus hidup operator: peningkatan, perubahan konfigurasi
- **Sentinel di Kubernetes**
  - Sentinel sebagai sidecar vs deployment mandiri
  - Layanan headless untuk penemuan Redis dan Sentinel
  - Health checks: probe liveness, readiness, dan startup
  - Penyimpanan persisten untuk volume AOF/RDB di Kubernetes
- **Cluster di Kubernetes**
  - Batasan topologi pod untuk Redis Cluster
  - NodePort, ClusterIP, dan LoadBalancer untuk akses eksternal
  - Akses Redis Cluster lintas namespace
  - Pembaruan bergulir dan perubahan konfigurasi
- **Pertimbangan Produksi**
  - Latensi jaringan di jaringan overlay kontainer (CNI: Calico, Cilium, Flannel)
  - Pembatasan CPU dengan `CFS quotas` dan latensi Redis
  - Eviction pod dan penghentian anggun dengan hook preStop
  - Pemantauan Redis di Kubernetes dengan kube-prometheus-stack
- **Praktik Laboratorium**: Deploy Redis Cluster 6 node di Kubernetes menggunakan Redis Operator, konfigurasi failover otomatis, atur penyimpanan persisten dengan snapshot RDB, implementasikan pemantauan dengan Prometheus dan Grafana, dan uji skenario eviction pod

### Modul 7: Redis Enterprise dan Distribusi Geo Active-Active (Minggu 7)

- **Arsitektur Redis Enterprise**
  - Redis Enterprise vs Redis open-source: perbandingan fitur
  - Arsitektur berbasis proxy: connection pooling otomatis, routing kueri
  - Multi-tenancy: basis data sebagai instance logis terisolasi
  - Flash tier: penyimpanan hibrida RAM + SSD untuk dataset besar yang hemat biaya
  - Redis on Flash: konfigurasi FOC (Flash on Cache) dan karakteristik performa
- **Distribusi Geo Active-Active (Berbasis CRDT)**
  - Conflict-free Replicated Data Types (CRDT) untuk replikasi multi-master
  - Strategi resolusi konflik: last-writer-wins (LWW), observed-remove (OR-Set)
  - Konfigurasi `ConflictResolutionType` per basis data
  - Latensi replikasi lintas region dan pertimbangan bandwidth
  - Kasus penggunaan Active-Active: penyimpanan sesi global, penghitung terdistribusi, papan peringkat multi-region
- **Manajemen Cluster Redis Enterprise**
  - Provisioning node dan pengaturan cluster
  - Pembuatan basis data dengan sharding dan replikasi
  - Cadangan dan pemulihan: snapshot, cadangan periodik, streaming
  - Strategi peningkatan: rolling upgrade, deployment blue-green
- **Praktik Laboratorium**: Siapkan deployment Active-Active Redis Enterprise dua region (disimulasikan), buat penyimpanan sesi yang direplikasi secara geo, uji resolusi konflik dengan penulisan bersamaan, dan ukur latensi replikasi lintas region

### Modul 8: Observabilitas, Penyetelan Performa, dan Perencanaan Kapasitas (Minggu 8)

- **Pemantauan Komprehensif**
  - Taksonomi metrik Redis: throughput, latensi, memori, hit rate, jeda replikasi
  - Integrasi Prometheus: konfigurasi `redis_exporter` dan metrik
  - Dasbor Grafana: ringkasan Redis, kesehatan cluster, penelusuran tingkat shard
  - Metode RED: Rate, Errors, Duration untuk operasi Redis
  - Empat sinyal emas untuk Redis: latensi, saturasi, kesalahan, utilisasi
- **Slow Log dan Profiling**
  - Konfigurasi `slowlog-log-slower-than` dan `slowlog-max-len`
  - Analisis kueri lambat dengan Redis FRI (command tracing)
  - Statistik perintah: `INFO COMMANDSTATS` untuk perintah panas
  - Deteksi kunci besar: `redis-cli --bigkeys` dan `MEMORY USAGE`
  - Pola kedaluwarsa kunci dan pemantauan TTL
- **Optimasi Latensi**
  - Optimasi perjalanan pulang-pergi jaringan: pipelining vs transaksi vs Lua
  - Praktik terbaik connection pooling per pustaka klien
  - Overhead jabat tangan TLS dan penggunaan kembali koneksi
  - Client-side caching (mode pelacakan Redis 6+): `CLIENT TRACKING`
  - Menghindari `MONITOR` di produksi: alternatif untuk pelacakan perintah
- **Perencanaan Kapasitas**
  - Peramalan memori: model pertumbuhan overhead struktur data
  - Estimasi throughput berdasarkan profil perangkat keras
  - Perhitungan jumlah shard untuk target throughput dan ukuran dataset
  - Metodologi tolok ukur Redis: `redis-benchmark` dengan payload kustom
  - Pemilihan ukuran instance cloud yang tepat untuk beban kerja Redis
- **Praktik Laboratorium**: Siapkan pemantauan Prometheus + Grafana penuh untuk deployment Redis, identifikasi 5 kueri lambat teratas dengan slow log, implementasikan client-side caching di aplikasi contoh, dan jalankan latihan perencanaan kapasitas untuk beban kerja target 100K ops/detik dengan dataset 50GB

### Modul 9: Pengamanan untuk Perusahaan (Minggu 9)

- **Arsitektur Keamanan Jaringan**
  - Redis di jaringan zero-trust: mTLS, SPIFFE, otentikasi mutual
  - Konfigurasi TLS Redis 6/7: `tls-cert-file`, `tls-key-file`, `tls-ca-cert-file`
  - Segmentasi jaringan: VPC, grup keamanan, kebijakan jaringan Calico untuk K8s
  - Redis Proxy sebagai titik terminasi TLS
- **Enkripsi Saat Istirahat dan Dalam Transit**
  - Enkripsi tingkat disk: LUKS, dm-crypt untuk file RDB/AOF
  - Cadangan terenkripsi: GPG/AWS KMS untuk arsip cadangan
  - Konfigurasi cipher suite TLS untuk koneksi Redis
  - Strategi rotasi kunci untuk kredensial TLS dan ACL
- **Otentikasi dan Otorisasi**
  - Pola enterprise ACL v2: peran pengguna dengan hak istimewa minimal
  - Integrasi dengan penyedia identitas eksternal (LDAP, OIDC) melalui Redis Enterprise
  - Daftar hitam/putih perintah, perintah berbahaya (`FLUSHALL`, `DEBUG`, `CONFIG`)
  - Audit dengan log ACL dan pencatatan terpusat
- **Kepatuhan dan Audit**
  - Kepatuhan GDPR: enkripsi, minimalisasi data, hak untuk dihapus
  - Pertimbangan SOC2 dan PCI-DSS untuk deployment Redis
  - Pencatatan audit: pencatatan perintah, log akses, perubahan konfigurasi
  - Cadangan immutabel dan pengarsipan WAL untuk kepatuhan
- **Praktik Laboratorium**: Konfigurasi mTLS untuk Redis Cluster, buat peran ACL dengan hak istimewa minimal untuk pengguna aplikasi, cadangan, dan pemantauan, siapkan pencatatan audit ACL terpusat dengan Elasticsearch, dan implementasikan strategi cadangan terenkripsi

### Modul 10: Redis untuk Beban Kerja AI dan ML (Minggu 10)

- **Lapisan Caching untuk Pipeline AI**
  - Caching respons LLM: caching semantik dengan kemiripan vektor
  - Cache embedding: strategi berbasis TTL dan LRU
  - Implementasi feature store: penyajian fitur batch dan real-time
  - Penguncian terdistribusi untuk koordinasi pembaruan model
- **Pembatasan Laju untuk API AI**
  - Algoritma token bucket dengan Sorted Sets Redis
  - Penghitung sliding window dengan timestamp Sorted Set
  - Pembatasan laju terdistribusi di seluruh instance gateway API
  - Tingkatan pembatasan laju per pengguna, per model, dan per IP
- **Manajemen Sesi untuk Chat AI**
  - Persistensi status sesi dengan RedisJSON
  - Riwayat percakapan dengan Streams untuk pemutaran ulang
  - Manajemen jendela konteks: pemangkasan, pemicu peringkasan
  - Koordinasi multi-sesi untuk sistem berbasis agen
- **Komputasi Fitur ML Real-Time**
  - Agregasi fitur streaming dengan RedisTimeSeries
  - Komputasi fitur online: rata-rata bergerak, perhitungan persentil
  - Penyajian fitur untuk inferensi online dengan latensi sub-milidetik
  - Penugasan eksperimen A/B dengan Sorted Sets
- **Praktik Laboratorium**: Bangun lapisan caching RAG lengkap dengan pencarian vektor Redis, implementasikan pembatas laju terdistribusi untuk gateway API LLM, buat penyimpanan fitur real-time untuk sistem rekomendasi online, dan bangun sistem manajemen sesi untuk aplikasi chat AI multi-putaran

### Modul 11: Pemulihan Bencana, Strategi Cadangan, dan Arsitektur Multi-Region (Minggu 11)

- **Strategi Cadangan**
  - Snapshot RDB: `SAVE`, `BGSAVE`, penjadwalan dengan direktif `save`
  - Manajemen file AOF: `BGREWRITEAOF`, pemicu penulisan ulang AOF
  - Persistensi hibrida (Redis 7): menggabungkan RDB dan AOF
  - Cadangan jarak jauh: sinkronisasi S3/Azure Blob, `redis-rdb-tools` untuk verifikasi
  - Pemulihan point-in-time dengan pemutaran ulang AOF
- **Topologi Replikasi**
  - Replikasi rantai: master → replika → replika
  - Prioritas replika dan urutan failover
  - Replika hanya-baca untuk beban kerja analitik dan pelaporan
  - Konsistensi replikasi: perintah `WAIT` untuk replikasi sinkron
- **Arsitektur Multi-Region**
  - Active-passive: failover berbasis DNS, replikasi lintas region
  - Active-active (CRDT): Redis Enterprise Active-Active vs keterbatasan open-source
  - Anggaran latensi untuk penulisan lintas region
  - Replikasi global dengan Kafka connect dan Debezium
  - Pengujian failover regional: chaos engineering untuk Redis
- **Perencanaan Pemulihan Bencana**
  - Sasaran RPO dan RTO untuk beban kerja Redis
  - Estimasi waktu pemulihan berdasarkan ukuran dataset dan mode persistensi
  - Pengujian failover otomatis: pemilihan Sentinel, failover Cluster
  - Latihan pemulihan bencana: terjadwal, eksperimen chaos otomatis
  - Kubernetes multi-region dengan Redis Operator
- **Praktik Laboratorium**: Rancang dan implementasikan rencana pemulihan bencana multi-region, konfigurasi snapshot RDB dengan cadangan S3 di luar lokasi, uji failover Sentinel di bawah partisi jaringan, ukur RTO/RPO untuk mode persistensi berbeda, dan tulis skrip latihan pemulihan bencana otomatis

### Modul 12: Proyek Kapstone — Platform E-Commerce Bertenaga AI Multi-Region (Minggu 12)

- **Ringkasan Proyek**: Rancang dan bangun platform e-commerce multi-region siap produksi yang memanfaatkan Redis untuk caching, pencarian, analitik real-time, manajemen sesi, dan fitur bertenaga AI. Platform ini harus mendemonstrasikan kemampuan Redis tingkat lanjut di seluruh modul stack, deployment cluster, pencarian vektor, dan observabilitas.
- **Komponen Arsitektur**
  - Katalog produk global dengan pencarian teks lengkap dan vektor RediSearch
  - Inventaris dan harga real-time dengan RedisTimeSeries
  - Keranjang belanja dan manajemen sesi dengan RedisJSON
  - Rekomendasi personal melalui kemiripan vektor (jarak cosine pada embedding produk)
  - Pembatasan laju terdistribusi untuk gateway API
  - Deployment active-passive multi-region dengan failover otomatis
  - Pemantauan komprehensif dengan Prometheus dan Grafana
- **Persyaratan Implementasi**
  - Deploy Redis Enterprise atau Redis Cluster di Kubernetes (minikube atau cloud)
  - Implementasikan pipeline pencarian vektor: embedding produk → indeks HNSW → pencarian semantik + filter
  - Bangun pipeline acara berbasis Stream untuk pemrosesan pesanan dengan grup konsumen
  - Konfigurasi ACL v2 dengan peran hak istimewa minimal untuk setiap mikroservis
  - Implementasikan client-side caching untuk data produk panas
  - Siapkan replikasi lintas region dengan streaming RDB atau Active-Active
- **Hasil Akhir**
  - Aplikasi kerja lengkap dengan kode sumber (Python/Node.js)
  - Dokumentasi model data Redis dengan definisi skema
  - Manifes deployment (YAML Kubernetes, Helm charts)
  - Dasbor pemantauan (model JSON Grafana)
  - Dokumen rencana pemulihan bencana
  - Hasil tolok ukur performa di bawah beban

## Proyek Akhir

Peserta didik akan merancang dan membangun platform e-commerce bertenaga AI multi-region menggunakan Redis sebagai lapisan data infrastruktural inti. Platform ini harus mengintegrasikan RediSearch untuk pencarian teks lengkap dan berbasis vektor, RedisTimeSeries untuk analitik inventaris real-time, RedisJSON untuk manajemen status sesi, Redis Streams untuk pemrosesan pesanan berbasis acara dengan grup konsumen dan antrean surat mati, serta RedisBloom untuk deteksi duplikat probabilistik. Aplikasi harus di-deploy di Kubernetes menggunakan Redis Operator (atau Redis Enterprise), dikonfigurasi dengan replikasi lintas region atau distribusi geo Active-Active, dan dipantau dengan Prometheus dan Grafana. Hasil akhir mencakup kode sumber lengkap, dokumentasi arsitektur, manifes deployment, tolok ukur performa, dan rencana pemulihan bencana.

## Kriteria Penilaian

- **Tugas Mingguan (35%)**: Latihan praktis yang diselesaikan setiap minggu yang menunjukkan kemampuan langsung dengan modul Redis Stack, deployment Kubernetes, pencarian vektor, dan operasi tingkat lanjut.
- **Ujian Praktik Tengah Semester (15%)**: Mencakup dasar-dasar Minggu 1-5 termasuk internal Redis, Redis Stack, pencarian vektor, Streams, dan fitur Redis 7+. Dinilai melalui latihan debugging dan optimasi Redis dunia nyata yang diberi batas waktu.
- **Proyek Kapstone (40%)**: Evaluasi berdasarkan desain arsitektur, kualitas model data Redis, kelengkapan implementasi, pengaturan pemantauan dan observabilitas, dokumentasi pemulihan bencana, dan performa di bawah pengujian beban.
- **Partisipasi dan Tinjauan Sejawat (10%)**: Keterlibatan dalam tinjauan kode, diskusi arsitektur di Slack/GitHub Discussions, dan kualitas dokumentasi.

## Referensi

- [Dokumentasi Resmi Redis](https://redis.io/docs/) — Referensi lengkap untuk semua perintah, konfigurasi, dan fitur Redis
- [Dokumentasi Redis Stack](https://redis.io/docs/stack/) — Dokumentasi resmi modul Redis Stack (Search, JSON, TimeSeries, Bloom, Graph)
- [Dokumentasi Redis Enterprise](https://docs.redis.com/) — Fitur Redis Enterprise, distribusi geo Active-Active, dan manajemen cluster
- [Redis University](https://university.redis.com/) — Kursus online gratis dari Redis, termasuk RU202 (Redis Streams) dan RU301 (Redis Security)
- [Redis di Kubernetes](https://github.com/RedisLabs/redis-operator) — Operator Redis resmi untuk Kubernetes
- [Pencarian Kemiripan Vektor Redis](https://redis.io/docs/stack/search/reference/vectors/) — Panduan referensi dan konfigurasi pencarian vektor
- [Redis in Action](https://redis.com/redis-in-action/) — Josiah L. Carlson (Manning Publications), cakupan pola tingkat lanjut yang diperluas
- [Database Internals](https://www.databass.dev/) — Alex Petrov, untuk pemahaman lebih dalam tentang LSM tree, B-tree, dan arsitektur mesin penyimpanan

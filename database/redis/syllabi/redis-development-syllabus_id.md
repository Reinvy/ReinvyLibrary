---
title: "Silabus Pengembangan Redis"
description: "Kurikulum komprehensif 12 minggu untuk menguasai Redis, mencakup struktur data inti, pola caching, persistensi, ketersediaan tinggi, clustering, dan deployment produksi."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan Redis

## Ringkasan

Kurikulum 12 minggu ini menyediakan jalur pembelajaran terstruktur bagi pengembang yang ingin menguasai Redis, penyimpanan struktur data in-memory terkemuka di industri. Mulai dari konsep dasar hingga topik lanjutan, peserta didik akan mendapatkan pengalaman praktis dengan tipe data Redis, strategi caching, mekanisme persistensi, ketersediaan tinggi, clustering, dan operasi produksi. Setiap minggu menggabungkan pengetahuan teoretis dengan latihan langsung, yang berpuncak pada proyek akhir komprehensif yang mendemonstrasikan kemahiran di seluruh ekosistem Redis.

## Kurikulum

### Minggu 1: Pengenalan Redis

- **Fundamental Redis**
  - Apa itu Redis? Sejarah, kasus penggunaan, dan perbandingan dengan database tradisional
  - Memahami trade-off penyimpanan in-memory vs disk-based
  - Gambaran arsitektur Redis: event loop single-threaded, multiplexing I/O
- **Instalasi dan Konfigurasi**
  - Menginstal Redis secara lokal (Linux, macOS, Windows via WSL)
  - Menjalankan Redis melalui Docker
  - Dasar-dasar file konfigurasi: struktur `redis.conf` dan direktif penting
- **Dasar-dasar redis-cli**
  - Menghubungkan ke server Redis: `redis-cli -h <host> -p <port>`
  - Perintah dasar: `PING`, `SET`, `GET`, `DEL`, `EXISTS`
  - Menggunakan `redis-cli --help` dan penemuan perintah
  - Perintah INFO Redis untuk statistik server
- **Latihan**: Instal Redis, konfigurasikan dengan port kustom, dan lakukan operasi CRUD dasar

### Minggu 2: Struktur Data Inti

- **Strings**
  - SET, GET, MSET, MGET, SETNX, SETEX, PSETEX
  - Operasi string: APPEND, GETRANGE, SETRANGE, STRLEN
  - Operasi numerik: INCR, DECR, INCRBY, INCRBYFLOAT
  - Operasi bit: GETBIT, SETBIT, BITCOUNT, BITOP
- **Lists**
  - LPUSH, RPUSH, LPOP, RPOP, LLEN, LRANGE
  - Operasi blocking: BLPOP, BRPOP
  - Kasus penggunaan: antrian pesan, umpan aktivitas, daftar tugas
- **Sets**
  - SADD, SREM, SMEMBERS, SISMEMBER, SCARD
  - Operasi set: SINTER, SUNION, SDIFF, SSCAN
  - Kasus penggunaan: tag, pengunjung unik, hubungan pertemanan
- **Hashes**
  - HSET, HGET, HGETALL, HMGET, HDEL, HEXISTS
  - Operasi hash: HINCRBY, HSCAN, HLEN
  - Kasus penggunaan: representasi objek, profil pengguna, data sesi
- **Sorted Sets**
  - ZADD, ZRANGE, ZRANK, ZSCORE, ZREM
  - Operasi rentang: ZRANGEBYSCORE, ZREVRANGE, ZCOUNT
  - Agregasi: ZUNIONSTORE, ZINTERSTORE
  - Kasus penggunaan: papan peringkat, penghitung rate limit, data time-series
- **Latihan**: Implementasikan umpan media sosial menggunakan Lists, sistem tagging dengan Sets, papan peringkat dengan Sorted Sets, dan profil pengguna dengan Hashes

### Minggu 3: Manajemen Kunci dan Kedaluwarsa

- **Konvensi Penamaan Kunci**
  - Pola namespacing: `object_type:id:field`
  - Desain kunci hierarkis untuk kemudahan pemeliharaan
  - Menghindari hot keys dan bentrokan kunci
- **Kedaluwarsa Kunci dan TTL**
  - EXPIRE, EXPIREAT, TTL, PTTL, PEXPIRE
  - SET dengan opsi NX/XX/EX/PX
  - Pengusiran kunci saat TTL kedaluwarsa
  - Mekanisme kedaluwarsa pasif vs aktif
- **Memindai Kunci**
  - Perintah KEYS (dan mengapa menghindarinya di produksi)
  - Iterasi berbasis kursor SCAN dengan COUNT dan MATCH
  - SSCAN, HSCAN, ZSCAN untuk iterasi khusus tipe
- **Notifikasi Ruang Kunci**
  - Mengonfigurasi events keyspace di redis.conf
  - Berlangganan ke peristiwa kedaluwarsa dan modifikasi kunci
  - Kasus penggunaan: notifikasi invalidasi cache, tugas terjadwal
- **Latihan**: Implementasikan penyimpanan sesi dengan kedaluwarsa TTL otomatis dan pantau peristiwa kunci melalui notifikasi keyspace

### Minggu 4: Tipe Data Lanjutan

- **Bitmaps**
  - SETBIT, GETBIT, BITCOUNT, BITOP, BITPOS, BITFIELD
  - Representasi data boolean hemat memori
  - Kasus penggunaan: pengguna aktif harian, fitur flags, pola bloom-filter
- **HyperLogLog**
  - PFADD, PFCOUNT, PFMERGE
  - Estimasi kardinalitas dengan memori minimal (~12KB per kunci)
  - Kasus penggunaan: penghitungan pengunjung unik lintas periode waktu
- **Indeks Geospasial**
  - GEOADD, GEODIST, GEORADIUS, GEORADIUSBYMEMBER, GEOSEARCH
  - Menyimpan dan mencari koordinat latitude/longitude
  - Kasus penggunaan: tempat terdekat, aplikasi ride-hailing, analitik lokasi
- **Streams**
  - XADD, XREAD, XRANGE, XREVRANGE, XLEN
  - Grup konsumen: XGROUP, XREADGROUP, XACK
  - Entri tertunda dan jaminan pengiriman pesan
  - Perbandingan dengan Pub/Sub dan Kafka
- **Latihan**: Implementasikan pencari toko berbasis lokasi menggunakan indeks geospasial dan pipeline pemrosesan acara waktu-nyata menggunakan Streams dengan grup konsumen

### Minggu 5: Pola Caching

- **Cache-Aside (Lazy Loading)**
  - Alur caching sisi aplikasi: baca dari cache dulu, fallback ke database
  - SET dengan TTL untuk invalidasi otomatis
  - Menangani cache miss dan data basi
- **Write-Through dan Write-Behind**
  - Write-through sinkron untuk konsistensi data
  - Write-behind asinkron untuk optimasi penulisan
  - Trade-off antara konsistensi dan kinerja
- **Read-Through Caching**
  - Caching sisi server dengan Redis sebagai penyimpanan baca utama
  - Pemanasan cache pada saat startup aplikasi
- **Strategi Invalidasi Cache**
  - Invalidasi berbasis TTL (pasif)
  - Invalidasi berbasis peristiwa melalui pub/sub
  - Invalidasi eksplisit saat mutasi data
  - Pola stale-while-revalidate
- **Pencegahan Cache Stampede**
  - Kunci mutex dengan SET NX untuk penulis pertama
  - Kedaluwarsa dini probabilistik (algoritma XFetch)
  - Strategi mitigasi thundering herd
- **Latihan**: Bangun sistem caching multi-layer untuk katalog produk dengan pola cache-aside dan pencegahan stampede

### Minggu 6: Persistensi dan Ketahanan

- **Snapshot RDB**
  - SAVE vs BGSAVE: persistensi sinkron vs berbasis fork
  - Mengonfigurasi interval penyimpanan di redis.conf
  - Format file RDB dan kompresi
  - Kelebihan RDB: snapshot ringkas, restart cepat
  - Kekurangan RDB: potensi kehilangan data antar snapshot
- **AOF (Append-Only File)**
  - Log AOF mencatat setiap operasi tulis
  - Kebijakan fsync: always, everysec, no
  - Penulisan ulang AOF dengan BGREWRITEAOF
  - Kelebihan AOF: ketahanan, append-only, dapat dibaca manusia
  - Kekurangan AOF: ukuran file lebih besar, restart lebih lambat
- **Persistensi Hibrida (Redis 7+)**
  - Menggabungkan RDB dan AOF untuk ketahanan optimal
  - AOF dengan preamble RDB untuk pemulihan cepat
- **Strategi Backup dan Pemulihan**
  - Jadwal backup otomatis dengan cron
  - Integrasi S3/cloud storage untuk backup off-site
  - Pemulihan point-in-time dengan log AOF
- **Latihan**: Konfigurasikan persistensi RDB dan AOF, simulasikan skenario kegagalan, dan pulihkan data dari setiap metode persistensi

### Minggu 7: Pub/Sub dan Pengiriman Pesan

- **Dasar-dasar Pub/Sub**
  - PUBLISH, SUBSCRIBE, PSUBSCRIBE, UNSUBSCRIBE
  - Pola penamaan saluran dan wildcard
  - Semantik pengiriman fire-and-forget
- **Pola Pub/Sub**
  - Pengiriman fan-out ke banyak pelanggan
  - Routing berbasis saluran untuk distribusi acara
  - Langganan pola dengan gaya glob
- **Keterbatasan Pub/Sub**
  - Tidak ada persistensi pesan (pesan hilang jika tidak ada pelanggan)
  - Tidak ada mekanisme pengakuan
  - Sifat blocking dari SUBSCRIBE
- **Redis Streams untuk Pengiriman Pesan Andal**
  - Grup konsumen untuk pemrosesan pesan load-balanced
  - Pengakuan pesan dan manajemen entri tertunda
  - Pemutaran ulang pesan dari ID tertentu
  - Perbandingan dengan antrian pesan tradisional (RabbitMQ, Kafka)
- **Latihan**: Bangun sistem notifikasi waktu-nyata menggunakan Pub/Sub dan antrian tugas dengan Streams grup konsumen

### Minggu 8: Lua Scripting dan Transaksi

- **Transaksi Redis**
  - MULTI, EXEC, DISCARD, WATCH, UNWATCH
  - Penguncian optimistis dengan WATCH + MULTI
  - Atomisitas transaksi dan perilaku rollback
- **Lua Scripting dengan EVAL**
  - Menulis skrip Lua untuk Redis
  - Perintah EVAL dan EVALSHA
  - Parameter skrip: KEYS[] dan ARGV[]
  - Jaminan eksekusi atomik
- **Caching dan Manajemen Skrip**
  - SCRIPT LOAD, SCRIPT EXISTS, SCRIPT FLUSH
  - Caching skrip untuk mengurangi bandwidth
  - SCRIPT KILL untuk skrip yang berjalan lama
- **Pola Lua Script**
  - Compare-and-set dengan Lua untuk pembaruan atomik
  - Operasi multi-kunci kompleks dalam satu skrip
  - Rate limiting dengan skrip time-window
  - Kunci terdistribusi dengan Lua
- **Latihan**: Tulis skrip Lua untuk manajemen inventaris atomik, kunci terdistribusi, dan rate limiter sliding-window

### Minggu 9: Ketersediaan Tinggi dan Replikasi

- **Replikasi Redis**
  - Arsitektur replikasi master-replica
  - Perintah REPLICAOF dan konfigurasi
  - ID replikasi dan pelacakan offset
  - Resinkronisasi parsial dengan PSYNC2
  - Skalabilitas baca dengan replica
- **Redis Sentinel**
  - Arsitektur Sentinel: pemantauan, notifikasi, failover
  - Quorum Sentinel dan persyaratan mayoritas
  - Mengonfigurasi Sentinel untuk failover otomatis
  - Penemuan layanan sisi klien melalui Sentinel
- **Skenario Failover**
  - Failover manual dengan perintah FAILOVER
  - Failover otomatis dengan Sentinel
  - Skenario split-brain dan pencegahan
  - Promosi replica dan koneksi ulang klien
- **Latihan**: Siapkan pasangan master-replica Redis dengan Sentinel untuk failover otomatis dan uji berbagai skenario kegagalan

### Minggu 10: Redis Cluster

- **Arsitektur Cluster**
  - Sharding berbasis hash slot (16384 slot)
  - Node cluster: node master dan replica
  - Protokol Gossip untuk penemuan cluster
  - Cluster bus untuk komunikasi antar-node
- **Pengaturan dan Konfigurasi Cluster**
  - Perintah redis-cli --cluster create
  - Direktif konfigurasi cluster
  - Membuat cluster dengan Docker Compose
- **Operasi Cluster**
  - Menambah dan menghapus node
  - Resharding: redistribusi hash slot
  - Rebalancing antar node
  - Failover dalam mode cluster
- **Penanganan Cluster di Sisi Klien**
  - Redirect MOVED dan ASK
  - Klien Redis yang sadar cluster (ioredis Cluster, redis-py-cluster)
  - Implementasi smart client
  - Hash tags untuk pengelompokan kunci
- **Latihan**: Deploy Redis Cluster 6 node (3 master, 3 replica), praktikkan menambah/menghapus node, dan implementasikan aplikasi klien yang sadar cluster

### Minggu 11: Keamanan dan Operasi

- **Autentikasi dan Kontrol Akses**
  - Perintah AUTH dan konfigurasi requirepass
  - Redis 6+ ACL: pengguna, izin, kategori perintah
  - ACL SETUSER, ACL LIST, ACL LOG
  - Pembatasan pengguna default dan praktik terbaik
- **Keamanan Jaringan**
  - Enkripsi TLS/SSL untuk lalu lintas Redis
  - Konfigurasi bind dan protected mode
  - Aturan firewall dan segmentasi jaringan
- **Pemantauan dan Profiling**
  - Perintah INFO (server, clients, memory, persistence, stats, replication, cpu, keyspace)
  - Perintah MONITOR (dan dampak kinerjanya)
  - SLOWLOG GET, SLOWLOG LEN, SLOWLOG RESET
  - MEMORY USAGE, MEMORY STATS, MEMORY DOCTOR
  - Dasbor Grafana Redis dengan redis_exporter
- **Manajemen Memori**
  - Konfigurasi maxmemory
  - Kebijakan pengusiran: allkeys-lru, volatile-lru, allkeys-lfu, volatile-lfu, allkeys-random, volatile-random, volatile-ttl, noeviction
  - Defragmentasi memori dengan MEMORY PURGE
  - Analisis memori dengan redis-rdb-tools
- **Penyetelan Kinerja**
  - Pengaturan timeout dan keepalive
  - TCP backlog dan maxclients
  - Konfigurasi IO threads (Redis 6+)
  - Menghindari perintah yang berjalan lama
- **Latihan**: Konfigurasikan pengguna ACL dengan izin granular, aktifkan TLS, siapkan pemantauan Prometheus/Grafana, dan sesuaikan Redis untuk throughput tinggi

### Minggu 12: Proyek Akhir

- **Ringkasan Proyek**: Rancang dan bangun dasbor analitik waktu-nyata yang siap produksi
  - Penerimaan acara waktu-nyata melalui Redis Streams
  - Pipeline agregasi menggunakan Lua scripts dan pola time-series
  - Papan peringkat dan penghitung dengan Sorted Sets
  - Analitik geospasial untuk lokasi pengguna
  - Manajemen sesi dengan Hashes dan TTL
  - Ketersediaan tinggi dengan Sentinel atau Cluster mode
  - Integrasi pemantauan dan peringatan
- **Desain Arsitektur**
  - Alur data dan interaksi komponen
  - Desain model data Redis
  - Strategi persistensi dan backup
  - Perencanaan skalabilitas dan ketersediaan tinggi
- **Implementasi**
  - Bangun layanan backend (Python/Node.js) terintegrasi dengan Redis
  - Implementasikan lapisan caching dengan pencegahan stampede
  - Deploy dengan clustering atau Sentinel untuk HA
  - Siapkan dasbor pemantauan
- **Hasil Akhir**
  - Aplikasi kerja lengkap dengan kode sumber
  - Dokumentasi arsitektur dan diagram model data
  - Hasil benchmark kinerja
  - Panduan deployment dan operasi
- **Presentasi**
  - Review kode dan presentasi arsitektur
  - Diskusi kinerja dan skalabilitas
  - Pembelajaran dan penilaian kesiapan produksi

## Proyek Akhir

Peserta didik akan merancang dan membangun dasbor analitik waktu-nyata yang menerima acara, memprosesnya secara real-time menggunakan Redis Streams, mempertahankan penghitung agregat dan papan peringkat dengan Sorted Sets, melacak pengguna unik dengan HyperLogLog, dan menyediakan analitik geospasial. Aplikasi harus di-deploy dengan ketersediaan tinggi (Sentinel atau Cluster mode), mencakup pemantauan dan peringatan yang tepat, serta mendemonstrasikan praktik terbaik caching dengan pencegahan stampede. Hasil akhir mencakup kode sumber lengkap, dokumentasi arsitektur, benchmark kinerja, dan panduan deployment.

## Kriteria Penilaian

- **Tugas Mingguan (40%)**: Latihan praktis yang diselesaikan setiap minggu untuk mendemonstrasikan kemahiran langsung dengan perintah Redis, struktur data, dan pola.
- **Kuis Tengah Semester (15%)**: Mencakup Minggu 1-6 tentang fundamental termasuk struktur data, persistensi, pola caching, dan scripting dasar.
- **Proyek Akhir (35%)**: Evaluasi berdasarkan desain arsitektur, kualitas kode, praktik terbaik Redis, konfigurasi ketersediaan tinggi, pengaturan pemantauan, dan kelengkapan hasil akhir.
- **Partisipasi dan Review Kode (10%)**: Keterlibatan dalam review kode, diskusi arsitektur, dan kualitas dokumentasi.

## Referensi

- [Dokumentasi Resmi Redis](https://redis.io/docs/) — Referensi lengkap untuk semua perintah, konfigurasi, dan fitur Redis
- [Redis in Action](https://redis.com/redis-in-action/) — Josiah L. Carlson (Manning Publications)
- [Redis University](https://university.redis.com/) — Kursus online gratis dari Redis
- [Dokumentasi ioredis](https://github.com/redis/ioredis) — Klien Redis Node.js populer dengan dukungan Cluster dan Sentinel
- [Dokumentasi redis-py](https://github.com/redis/redis-py) — Pustaka klien Python resmi untuk Redis
- [Spesifikasi Cluster Redis](https://redis.io/docs/reference/cluster-spec/) — Spesifikasi cluster resmi dan internal
- [Dokumentasi Redis Streams](https://redis.io/docs/data-types/streams/) — Panduan komprehensif untuk Redis Streams
- [Awesome Redis](https://github.com/JamzyWang/awesome-redis) — Kumpulan sumber daya, alat, dan pustaka Redis yang dikurasi

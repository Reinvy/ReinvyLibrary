---
title: "Silabus Pola Microservices dengan Redis"
description: "Kurikulum 12 minggu tingkat lanjut untuk merancang arsitektur microservices di atas Redis, mencakup caching sebagai layanan, messaging berbasis event, distributed locking, rate limiting, manajemen sesi, idempotensi, feature flag, pola koordinasi, dan operasional produksi."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Pola Microservices dengan Redis

## Ringkasan

Silabus 12 minggu tingkat lanjut ini dirancang bagi backend engineer, software architect, dan platform engineer yang ingin menguasai Redis sebagai tulang punggung koordinasi dalam arsitektur microservices modern. Berbeda dengan kursus Redis pada umumnya yang membahas struktur data dan caching sebagai topik terpisah, kurikulum ini memandang Redis sebagai perekat sistem terdistribusi yang menyatukan layanan-layanan: cache-as-a-service dengan invalidasi yang konsisten, messaging berbasis event dengan Redis Streams dan Pub/Sub, distributed locking dan koordinasi, rate limiting dan penegakan kuota di tepi setiap layanan, manajemen sesi dalam skala besar, pola Outbox dan inbox untuk pengiriman event yang andal, idempotency key, distributed counter, feature flag, leader election, dan service discovery.

Setiap modul menggabungkan fondasi teoretis yang mendalam dengan lab praktik menggunakan Redis CLI, klien Node.js dan Python, Docker Compose, serta Kubernetes. Peserta belajar secara bertahap: dari satu layanan utilitas berbasis Redis, melalui lapisan messaging dan koordinasi, hingga platform microservices lengkap dengan banyak layanan yang berbagi Redis sebagai substrat state bersama. Di akhir kursus, peserta akan mampu merancang, membangun, men-deploy, dan mengoperasikan sistem microservice kelas produksi tempat Redis menyediakan lapisan caching, messaging, locking, rate limiting, dan koordinasi dengan latensi sub-milidetik serta perilaku kegagalan yang dapat diprediksi.

Silabus ini adalah kurikulum keempat untuk redis dan sengaja mengambil sudut pandang sistem terdistribusi: silabus pertama membahas struktur data inti dan pengembangan umum, silabus kedua membahas internal dan operasional enterprise, dan silabus ketiga membahas analitik real-time dengan RedisTimeSeries. Kurikulum keempat ini adalah pandangan arsitektur aplikasi — bagaimana primitif redis berubah menjadi pola produksi untuk sistem dengan banyak layanan.

## Kurikulum

### Modul 1: Fondasi Microservices dan Redis sebagai Shared State (Minggu 1)

- **Mengapa Microservices Membutuhkan Lapisan State Bersama**
  - Layanan tanpa status dan ke mana state harus disimpan: sesi, cache, lock, counter, antrean
  - Redis sebagai substrat shared state: kecepatan in-memory, operasi atomik, siklus hidup TTL
  - Spektrum penyimpanan koordinasi: Redis vs database vs message broker vs layanan lock khusus
  - Kapan Redis adalah pilihan tepat dan kapan bukan (batas durabilitas, anti-pola payload besar)
- **Topologi Redis untuk Microservices**
  - Redis Cluster terpusat versus instance Redis per-domain versus database Redis Enterprise
  - Isolasi database logis dan multi-tenancy berbasis ACL untuk kepemilikan layanan
  - Manajemen koneksi: pooling, retry, timeout, dan pola circuit-breaking pada klien
  - Konvensi penamaan key: `service:entity:id:field` dan pencegahan tabrakan antar-layanan
- **Persiapan Lab**
  - Stack Docker Compose: Redis Stack, satu layanan Node.js, dan satu layanan Python
  - Koneksi dengan `redis-cli`, `ioredis`, dan `redis-py` dengan konfigurasi pool yang tepat
- **Lab Praktik**: Jalankan dua layanan terhadap satu Redis, buktikan keduanya berbagi state melalui key ber-namespace, dan amati perilaku pool di bawah beban konkuren

### Modul 2: Caching sebagai Layanan (Minggu 2)

- **Pola Akses Cache untuk Layanan**
  - Cache-aside, read-through, write-through, dan write-behind dalam konteks multi-layanan
  - Domain cache per layanan: profil, katalog, harga, entitlement — satu Redis, banyak cache
  - Desain TTL: masa hidup yang sesuai bisnis, jitter untuk menghindari kadaluarsa serentak (`SET ... EX` + margin acak)
- **Invalidasi Cache dalam Sistem Terdistribusi**
  - Invalidasi eksplisit saat mutasi dengan kanal publish-subscribe
  - Bus invalidasi cache dan masalah dual-write (database lalu cache, atau sebaliknya)
  - Transactional outbox memberi makan cache: invalidasi dari aliran event yang sama yang menggerakkan konsumen lain
- **Pertahanan Cache Stampede dan Hot Key**
  - Mutex lock dengan `SET NX PX` untuk rekonstruksi first-writer
  - Probabilistic early expiration (XFetch) dan strategi TTL ber-jitter
  - Pemisahan hot key: membagi key populer menjadi N shard dengan pembacaan acak
- **Caching Multi-Level**
  - Hierarki L1 (in-process) dan L2 (Redis) serta masalah konsistensi invalidasi
  - Lapisan HTTP caching dan CDN di depan layanan berbasis Redis
  - Serialisasi cache: protocol buffers, MessagePack, dan trade-off JSON
- **Lab Praktik**: Bangun layanan katalog produk dengan lapisan cache-aside, kanal invalidasi saat penulisan, dan demo pemisahan hot key di bawah trafik simulasi

### Modul 3: Messaging Berbasis Event dengan Redis (Minggu 3)

- **Pub/Sub versus Streams untuk Komunikasi Antar-Layanan**
  - Sifat fire-and-forget Pub/Sub dan jaminan pengirimannya (atau ketiadaannya)
  - Redis Streams sebagai log append-only: consumer group, pending entries, dan semantik pengiriman
  - Memilih primitif yang tepat: notifikasi fan-out vs work queue tahan lama vs event log
- **Streams sebagai Event Bus**
  - Producer/consumer group dengan `XADD`, `XREADGROUP`, `XACK`, dan `XAUTOCLAIM`
  - Desain consumer group: partisi per worker, load balancing, dan penanganan dead letter
  - Pemangkasan dan retensi Stream: kebijakan `MAXLEN` dan checkpoint per konsumen
- **Pola Pengiriman Andal**
  - Pengiriman at-least-once dan konsumen idempoten
  - Kegagalan pemrosesan: pengiriman ulang `XCLAIM` dan dead-letter stream dengan fallback `XADD`
  - Backpressure: pembacaan `BLOCK`, deteksi konsumen lambat, dan pemantauan lag dengan `XLEN`
- **Lab Praktik**: Bangun pipeline event pesanan: layanan pesanan memublikasikan ke Stream, dua layanan konsumen bersaing memproses dengan consumer group, dan pengiriman gagal masuk ke dead-letter stream

### Modul 4: Distributed Locking dan Koordinasi (Minggu 4)

- **Dasar-Dasar Locking**
  - Mengapa lock lokal-layanan gagal lintas proses: balapan multi-instance
  - Primitif lock Redis: `SET key value NX PX`, pelepasan berbasis Lua dengan verifikasi owner token
  - Kadaluarsa lock versus durasi critical section: locking berbasis sewa dan masalah fencing
- **Redlock dan Kritiknya**
  - Algoritma Redlock dan analisis Martin Kleppmann: clock, jeda GC, dan fencing token
  - Kapan Redlock dapat dipertahankan dan kapan penyimpanan konsensus (etcd, ZooKeeper) lebih aman
  - Panduan praktis: fencing token, clock monotonik, dan critical section terbatas
- **Pola Koordinasi**
  - Leader election dengan `SET NX` + perpanjangan heartbeat dan fallback pengikut
  - Semaphore terdistribusi dengan sorted set dan jaminan keadilan
  - Work lease untuk pekerja job: klaim, perpanjang, dan lepaskan dengan `PEXPIRE`
- **Lab Praktik**: Implementasikan lock manager dengan owner token, simulasikan critical section lambat, dan bangun leader election worker dengan failover otomatis

### Modul 5: Rate Limiting dan Penegakan Kuota (Minggu 5)

- **Algoritma Rate Limiting di Redis**
  - Fixed window counter dengan `INCR` + `EXPIRE`
  - Sliding window log dengan sorted set (`ZADD` + `ZREMRANGEBYSCORE` + `ZCARD`)
  - Sliding window counter: dua counter per window dengan `MULTI`/`EXEC` atau Lua
  - Token bucket dan leaky bucket melalui skrip Lua untuk limit yang halus dan toleran lonjakan
- **Rate Limiting Terdistribusi di Gateway**
  - Menegakkan kuota per-klien, per-layanan, dan per-API-key dari satu Redis terpusat
  - Penegakan di edge versus origin dan anggaran latensi pemeriksaan rate limit
  - Propagasi header: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, dan `Retry-After`
- **Kuota Multi-Lapis**
  - Tier global, tenant, dan pengguna dengan skrip Lua gabungan
  - Konfigurasi ulang kuota dinamis dan isolasi per-tenant
  - Jatah lonjakan dan keadilan algoritmik antar-tenant
- **Lab Praktik**: Bangun rate limiter gateway API dengan sliding-window counter, kembalikan header rate-limit standar, dan uji keadilan di bawah beban multi-tenant campuran

### Modul 6: Manajemen Sesi dan State Pengguna dalam Skala Besar (Minggu 6)

- **Pola Penyimpanan Sesi**
  - Sesi sticky versus stateless: mengapa stateless menang dan di mana Redis menyimpan state
  - TTL sesi, perpanjangan geser dengan `EXPIRE` saat aktivitas, dan kebijakan idle-timeout
  - Pemodelan data sesi: hash per sesi, rotasi key, dan penanganan field sensitif
- **Pelengkap Autentikasi Stateless**
  - Statelessness JWT versus sesi sisi-server: trade-off pencabutan
  - Daftar hitam token yang dicabut di Redis dan rotasi refresh-token dengan `GETDEL`
  - Access token berumur pendek dengan daftar pencabutan berbasis Redis
- **Presence dan State Online Pengguna**
  - Set presence, sorted set last-seen, dan heartbeat atomik
  - Fan-out status online dan indikator mengetik melalui Pub/Sub
  - Dashboard jumlah sesi dengan `SCARD` dan enumerasi sesi per perangkat
- **Lab Praktik**: Bangun layanan sesi yang digunakan dua layanan aplikasi, implementasikan kadaluarsa geser, tambahkan pencabutan token, dan sediakan endpoint presence langsung

### Modul 7: Pola Outbox, Inbox, dan Saga (Minggu 7)

- **Pola Transactional Outbox**
  - Masalah dual-write: transaksi database dan publikasi event harus atomik
  - Tabel outbox ditulis dalam transaksi database yang sama, diteruskan ke Redis Streams
  - Relayer outbox: polling, listener, dan jaminan publikasi idempoten
- **Pola Inbox untuk Konsumen**
  - Deduplikasi event masuk dengan key inbox `SET NX`
  - Retensi inbox, garbage collection, dan kebijakan TTL
  - Urutan pemrosesan dan pemulihan kegagalan parsial
- **Saga dan Kompensasi**
  - Saga choreographed dengan Redis Streams sebagai log koordinasi
  - Pemicu kompensasi, state saga di hash Redis, dan rollback berbasis timeout
  - Mengorelasikan instance saga: key `saga:id` dan catatan penyelesaian
- **Lab Praktik**: Implementasikan relayer outbox untuk layanan pesanan, deduplikator inbox di layanan pembayaran, dan saga dua langkah dengan kompensasi saat gagal

### Modul 8: Idempotensi, Distributed Counter, dan State Deterministik (Minggu 8)

- **Idempotency Key**
  - Menerima header `Idempotency-Key` dan menyimpan hasil dengan `SET NX`
  - TTL key dan penyimpanan payload respons untuk replay
  - Kondisi balapan: dua permintaan bersamaan dengan key sama dan first-writer menang secara atomik
- **Distributed Counter dan Agregat**
  - Counter atomik `INCR`/`INCRBY` dan anti-pola read-modify-write
  - HyperLogLog untuk estimasi jumlah unik (`PFADD`/`PFCOUNT`) lintas layanan
  - Penghitungan perkiraan dengan Bloom filter di depan penyimpanan eksak
- **State Machine Deterministik**
  - Merepresentasikan transisi state entitas secara atomik dengan skrip Lua
  - Alur compare-and-set dan validasi transisi-guard
  - Pemrosesan efek exactly-once dengan penanda event yang sudah diproses
- **Lab Praktik**: Bangun endpoint pembayaran idempoten, penghitung kunjungan bersama dengan HyperLogLog, dan state machine pesanan yang dijaga skrip transisi Lua

### Modul 9: Feature Flag, Distribusi Konfigurasi, dan Pengujian A/B (Minggu 9)

- **Konfigurasi Dinamis dan Feature Flag**
  - Konfigurasi terpusat di hash Redis dengan propagasi watch/notify
  - Evaluasi flag di tepi: cache nilai flag dengan TTL pendek di setiap layanan
  - Rollback flag dan kill switch dengan propagasi segera
- **Pengujian A/B dan Eksperimen**
  - Penugasan konsisten: bucketing deterministik dengan alokasi pengguna berbasis hash
  - Metadata eksperimen dan counter pendaftaran di Redis
  - Dashboard eksperimen real-time dari counter Redis
- **Dukungan Dark Launching dan Canary Release**
  - Aturan routing untuk trafik canary dan dark melalui tabel routing berbasis Redis
  - State rollout berbasis persentase dan penyesuaian ramp seketika
  - Migrasi baca/tulis berbasis feature flag (dukungan pola strangler)
- **Lab Praktik**: Bangun layanan feature flag dengan pembaruan push, implementasikan bucketing A/B deterministik, dan jalankan eksperimen routing canary pada dua versi layanan

### Modul 10: Pola Koordinasi — Leader Election, Service Discovery, dan Distributed Tracing (Minggu 10)

- **Leader Election Ditinjau Ulang**
  - Leader election tahan lama dengan sewa heartbeat dan epoch kepemimpinan
  - Promosi pengikut dan masalah split-brain tanpa konsensus
  - Menggabungkan election Redis dengan fencing token untuk failover aman
- **Service Discovery dan Registrasi**
  - Mendaftarkan instance layanan dengan heartbeat berbasis TTL di Redis
  - Discovery sisi-klien: membaca daftar instance dari sorted set
  - Skor kesehatan dan pengurasan trafik dengan sorted set berbobot
- **Distributed Tracing dan Korelasi**
  - Menyimpan metadata trace dan span di Redis dengan retensi berbasis TTL
  - Pencarian Correlation-ID untuk debugging permintaan lintas layanan
  - Log permintaan, agregasi error, dan penangkapan kueri lambat
- **Lab Praktik**: Bangun registri layanan dengan eviction berbasis heartbeat, implementasikan load balancing sisi-klien dari registri, dan tambahkan endpoint pencarian correlation ID untuk debugging lintas layanan

### Modul 11: Operasional Produksi untuk Microservices Berbasis Redis (Minggu 11)

- **Topologi Deployment**
  - Topologi Redis Cluster untuk platform multi-layanan dan distribusi key berbasis slot
  - Deployment Kubernetes: Redis Operator, penyimpanan `StatefulSet`, dan pola sidecar
  - Lokalitas jaringan: menempatkan Redis berdampingan dengan layanan dan memahami latensi lintas-AZ
- **Keamanan untuk Infrastruktur Bersama**
  - ACL per layanan: `ACL SETUSER` dengan pembatasan perintah dan key
  - TLS dalam transit, rotasi kredensial, dan manajemen rahasia untuk koneksi klien
  - Membela Redis bersama: batas perintah, isolasi ruang key, dan log audit
- **Observabilitas dan Kapasitas**
  - Histogram latensi, SLO hit-rate, dan metrik cache per layanan
  - Keluarga perintah `INFO`, `redis-cli --stat`, dan exporter Prometheus
  - Perencanaan kapasitas: model memori, kebijakan eviction, dan ruang aman untuk failover
- **Skenario Kegagalan dan Pemulihan**
  - Perilaku saat Redis down: circuit breaker, degradasi cache menjadi pembacaan database langsung
  - Pengujian failover: perintah `FAILOVER`, promosi replika, dan perilaku retry klien
  - Jendela kehilangan data dan trade-off antara pengaturan persistensi dan latensi p99
- **Lab Praktik**: Deploy platform di Kubernetes dengan Redis Operator, konfigurasikan ACL per layanan, siapkan dashboard Prometheus, dan jalankan latihan failover Redis terkontrol

### Modul 12: Proyek Akhir — Platform Microservices Berbasis Redis (Minggu 12)

- **Definisi Proyek**
  - Platform e-commerce kecil: layanan katalog, keranjang, pesanan, pembayaran, dan notifikasi
  - Redis menangani semua kepentingan lintas sektor: caching, pencarian produk dengan indeks `FT.SEARCH`, state sesi, rate limiting di gateway, event bus pesanan, distributed lock untuk inventaris, dan rollout berbasis feature flag
- **Persyaratan Arsitektur**
  - Setiap layanan stateless dan dapat diskala horizontal, berbagi satu Redis Cluster
  - Event mengalir melalui Redis Streams dengan pengiriman at-least-once dan konsumen idempoten
  - Saga mengoordinasikan pembuatan pesanan dengan kompensasi pembayaran dan inventaris
  - Rate limit, ACL, dan dashboard observabilitas tersedia
- **Tahapan Pengiriman**
  - Milestone 1: caching katalog + lock inventaris (pola minggu 2-4)
  - Milestone 2: event bus pesanan + saga + outbox/inbox (pola minggu 3, 7-8)
  - Milestone 3: rate limiting gateway + layanan sesi + feature flag (pola minggu 5-6, 9)
  - Milestone 4: deployment Kubernetes + latihan failover + pemantauan (pola minggu 11)
- **Dokumentasi yang Wajib Diserahkan**
  - Architecture decision record untuk setiap pilihan pola Redis
  - Analisis mode kegagalan dan cerita degradasi untuk setiap layanan
  - Hasil load test dengan latensi p99 dan pengukuran hit-rate

## Proyek Akhir

Peserta membangun dan men-deploy platform microservices berbasis Redis: sistem e-commerce kecil dengan layanan katalog, keranjang, pesanan, pembayaran, dan notifikasi — semuanya stateless dan berbagi satu Redis Cluster sebagai substrat koordinasi. Platform harus menggunakan setiap kelas pola dari kursus: cache-as-a-service dengan kanal invalidasi, pemrosesan pesanan berbasis event di atas Redis Streams dengan relayer outbox dan konsumen inbox idempoten, distributed lock yang menjaga pengurangan inventaris, rate limiting sliding-window di gateway API, layanan sesi dengan pencabutan token, feature flag yang menggerakkan rollout bertahap, dan saga choreographed dengan kompensasi untuk kegagalan pesanan. Hasil akhir berupa sistem berjalan yang di-deploy di Kubernetes dengan ACL per layanan, pemantauan Prometheus, latihan failover terkontrol, dan architecture decision record yang mendokumentasikan setiap pilihan pola Redis.

## Kriteria Penilaian

- **Tugas**: Lab mingguan dikumpulkan sebagai repositori dengan kode yang dapat dijalankan dan laporan singkat. Setiap lab dinilai berdasarkan kebenaran pola (apakah implementasi menggunakan primitif Redis yang dimaksud dengan benar), penanganan kasus tepi (kadaluarsa, kegagalan, retry, konkurensi), dan kualitas dokumentasi.
- **Kuis Modul**: Kuis singkat setelah setiap modul memverifikasi pemahaman konseptual — semantik pengiriman Streams, perilaku sewa lock, trade-off algoritma rate limit, dan masalah dual-write.
- **Proyek Akhir**: Platform capstone dievaluasi terhadap persyaratan arsitektur: semua layanan stateless dan berbagi Redis dengan benar, event terkirim at-least-once dengan konsumen idempoten, kompensasi saga bekerja di bawah kegagalan yang disuntikkan, rate limit ditegakkan di gateway, isolasi ACL antar-layanan, latihan failover berhasil dengan pemulihan, serta load test menunjukkan latensi p99 sesuai target di bawah trafik bersamaan.
- **Presentasi**: Peserta mempresentasikan keputusan arsitektur dan analisis mode kegagalan mereka, mempertahankan alasan di balik setiap pola Redis yang dipilih untuk masalah spesifiknya.

## Referensi

- [Dokumentasi Redis — Struktur Data](https://redis.io/docs/latest/develop/data-types/)
- [Dokumentasi Redis — Streams dan Consumer Groups](https://redis.io/docs/latest/develop/data-types/streams/)
- [Dokumentasi Redis — Redis ACL](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/)
- [Pola Redis — Distributed Locks](https://redis.io/docs/latest/develop/patterns/distributed-locks/)
- [Pola Redis — Rate Limiting](https://redis.io/docs/latest/develop/patterns/rate-limiting/)
- [Blog Redis — Pola Outbox](https://redis.io/blog/outbox-pattern/)
- [Martin Kleppmann — Cara Melakukan Distributed Locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [Chris Richardson — Microservices Patterns (Saga, Outbox, API Gateway)](https://microservices.io/patterns/data/transactional-outbox.html)
- [Redis University — RU101: Pengenalan Struktur Data Redis](https://university.redis.com/courses/ru101/)

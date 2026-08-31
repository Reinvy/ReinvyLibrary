---
title: "Panduan Penyetelan dan Optimasi Performa Redis"
description: "Panduan komprehensif untuk menyetel Redis agar mencapai performa puncak — manajemen memori dan kebijakan eviction, analisis latensi, penanganan big key dan hot key, penghapusan perintah lambat, penyetelan persistensi, optimasi sisi klien, penyetelan kernel tingkat OS, dan pemantauan produksi."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Penyetelan dan Optimasi Performa Redis

## Pendahuluan

Redis terasa cepat sejak saat pertama digunakan — eksekusi perintah single-threaded di atas dataset in-memory secara rutin memberikan latensi sub-milidetik yang tidak bisa ditandingi database relasional. Namun, "cepat sejak awal" tidak sama dengan "cepat di bawah beban produksi." Instance Redis yang merespons dalam 0,1 ms saat uji coba awal bisa menurun menjadi latensi multi-milidetik, thrashing memori, dan timeout klien begitu lalu lintas nyata datang, karena performa Redis diatur oleh sejumlah batasan yang baru terlihat saat ada beban:

- **Batas memori**: Redis menyimpan working set-nya di RAM. Ketika dataset mendekati `maxmemory`, eviction, fragmentasi, dan perilaku swap mulai menurunkan throughput.
- **Eksekusi single-threaded**: satu perintah lambat, seperti pemindaian `KEYS *` penuh atau `SMEMBERS` raksasa, memblokir semua klien lain di instance yang sama.
- **Amplifikasi I/O**: persistensi (snapshot RDB dan rewrite AOF) melakukan fork pada proses, dan fork pada dataset besar dapat menghentikan event loop.
- **Round trip jaringan**: setiap perintah Redis adalah siklus request/response. Klien yang banyak bicara membayar latensi per perintah, bukan per operasi.

Panduan ini adalah playbook praktis untuk menyetel Redis di produksi. Panduan ini membahas manajemen memori dan pemilihan kebijakan eviction, analisis latensi dengan diagnostik bawaan Redis, eliminasi big key dan hot key, penggantian perintah O(N) dengan alternatif berbasis scan, penyetelan persistensi untuk beban kerja berat-tulis, optimasi sisi klien seperti pipelining dan client-side caching, penyetelan kernel dan jaringan, serta pemantauan yang memberi tahu Anda saat performa mulai menurun.

Panduan ini mengasumsikan Anda sudah menjalankan Redis di produksi — dengan replika, Sentinel atau Cluster, dan persistensi yang terkonfigurasi. Jika Anda masih merancang deployment, mulailah dengan Panduan Ketersediaan Tinggi Redis dan Panduan Persistensi dan Ketahanan Data Redis sebelum menerapkan saran penyetelan di sini.

## Praktik Terbaik

### 1. Tetapkan `maxmemory` Secara Eksplisit dengan Kebijakan Eviction yang Disengaja

Instance Redis tanpa batas adalah kecelakaan performa yang menunggu terjadi. Ketika dataset tumbuh melewati RAM fisik, OS mulai melakukan swap, dan latensi runtuh dari mikrodetik menjadi milidetik — sering kali tanpa peringatan. Selalu tetapkan `maxmemory` ke nilai di bawah RAM instance Anda (Redis sendiri menyarankan menyisakan ruang untuk fragmentasi serta overhead memori dari buffer replikasi dan AOF) dan pilih kebijakan eviction yang sesuai dengan peran instance:

```text
# Instance cache murni: evict apa saja, pertahankan data terpanas
maxmemory 4gb
maxmemory-policy allkeys-lru

# Cache + counter/sesi yang harus bertahan: hanya evict kunci ber-TTL
maxmemory-policy volatile-lru

# Antrian, lock, dan data transaksional: jangan pernah evict, tolak tulis
maxmemory-policy noeviction
```

Pilihan kebijakan adalah keputusan kebenaran sekaligus keputusan performa. `noeviction` mengubah operasi tulis menjadi error saat instance penuh — perilaku yang tepat untuk task queue tetapi bencana untuk cache murni. `allkeys-lru` memperlakukan semua kunci sebagai sekali pakai, yang melindungi throughput tetapi diam-diam dapat mengevict data yang diasumsikan masih ada oleh bagian sistem lain.

### 2. Utamakan LFU untuk Beban Kerja Baca Berat dengan Hot Key

LRU memperkirakan "paling jarang digunakan baru-baru ini" dengan mengambil sampel kunci, tetapi kebaruan adalah sinyal lemah untuk hot key yang dibaca terus-menerus dalam ledakan. Jika beban kerja Anda didominasi oleh sejumlah kecil kunci yang sangat panas — ID produk yang viral, feed yang sedang tren, sesi pengguna untuk populasi aktif — ganti LRU dengan LFU:

```text
maxmemory-policy allkeys-lfu
maxmemory-samples 10
```

LFU melacak frekuensi akses (dengan peluruhan logaritmik sehingga lonjakan sekali waktu tidak mengunci kunci di memori selamanya) dan mengevict kunci yang paling jarang diakses terlebih dahulu. Naikkan `maxmemory-samples` dari bawaan 5 menjadi 10: perkiraan eviction menjadi jauh lebih akurat dengan biaya CPU yang sedikit lebih besar per keputusan eviction — dapat diabaikan di server modern mana pun.

Anda dapat memeriksa penghitung frekuensi kunci secara langsung untuk memutuskan apakah LFU berfungsi:

```bash
# Membutuhkan kebijakan LFU; mengembalikan penghitung 0 hingga 255
redis-cli OBJECT FREQ product:987654
```

Harapkan hot key menunjukkan skor di kisaran 100+ sementara kunci dingin berada di sekitar 1–5. Jika setiap kunci memiliki frekuensi serupa, pola aksesnya seragam dan LRU sama baiknya — pertahankan yang sederhana.

### 3. Jaga Struktur Data Tetap Kecil dan Ramah Encoding

Redis menyimpan koleksi kecil dalam encoding ringkas yang hemat memori sekaligus lebih cepat dioperasikan: hash, set, dan sorted set kecil menggunakan `listpack` (sebelumnya `ziplist`) dengan semua elemen dalam satu alokasi kontigu, dan set bilangan bulat kecil menggunakan `intset`. Begitu koleksi melewati ambang batas, koleksi dipromosikan ("dikonversi") ke encoding hash table atau skiplist penuh, yang mengonsumsi lebih banyak memori dan memiliki cache locality yang lebih buruk.

Ambang bawaan biasanya sudah tepat, tetapi dapat disetel:

```text
hash-max-listpack-entries 128
hash-max-listpack-value   64
set-max-intset-entries    512
zset-max-listpack-entries 128
zset-max-listpack-value   64
```

Konsekuensi praktis untuk pemodelan data:

- **Model objek sebagai hash, bukan sebagai banyak kunci string datar.** Menyimpan `user:123:name`, `user:123:email`, dan `user:123:age` sebagai kunci terpisah memakan tiga entri kunci ditambah tiga nilai. Satu hash `user:123` menyimpan semua field dalam satu alokasi, memangkas ruang kunci hingga setengahnya, dan memungkinkan `HGETALL` dalam satu round trip.
- **Utamakan koleksi berbatas.** List atau sorted set tanpa batas tumbuh menjadi encoding mahal dan akhirnya menjadi big key. Terapkan `LTRIM` pada log dan daftar item terbaru, serta tetapkan batas atau kedaluwarsa antrian secara eksplisit.
- **Periksa encoding di produksi dengan `OBJECT ENCODING`** untuk memastikan asumsi Anda sebelum mendesain ulang apa pun:

```bash
redis-cli OBJECT ENCODING user:123
# "listpack" untuk hash kecil, "hashtable" begitu membesar
```

### 4. Eliminasi Big Key Sebelum Menghentikan Server

Kunci dengan jutaan elemen adalah bom latensi yang senyap. Karena Redis mengeksekusi perintah pada satu thread, `DEL` pada list 10 juta elemen memblokir server selama ratusan milidetik — begitu juga perintah apa pun yang mewujudkan seluruh koleksi (`SMEMBERS`, `HGETALL`, `LRANGE 0 -1`, `ZRANGE 0 -1`).

Aturan praktis:

- **Jangan pernah `DEL` big key secara sinkron; gunakan `UNLINK`.** `UNLINK` membebaskan memori di latar belakang dan kembali seketika. Satu-satunya perintah yang harus tetap sinkron adalah `FLUSHALL`/`FLUSHDB` (gunakan `FLUSHDB ASYNC` bila memungkinkan).
- **Jangan pernah mengambil seluruh koleksi besar.** Gunakan `HSCAN`/`SSCAN`/`ZSCAN`/`LRANGE` dengan batas eksplisit, dan ambil hasil secara bertahap.
- **Pecah struktur yang terlalu besar.** Sorted set 50 juta anggota sering dapat dipecah menjadi 10 sorted set yang di-shard berdasarkan rentang ID, dengan pembacaan diarahkan ke shard yang tepat.
- **Beri batas atas semua koleksi append-only.** Setiap `LPUSH`/`RPUSH` yang menumbuhkan list harus dipasangkan dengan `LTRIM` sehingga list memiliki batas atas yang keras.

```bash
# Hapus asinkron big key yang ditemukan — kembali seketika
redis-cli UNLINK analytics:events:2026-08
# (integer) 1
```

### 5. Shard Hot Key untuk Mendistribusikan Beban Baca dan Tulis

Hot key memusatkan semua lalu lintas pada satu hash slot. Pada instance tunggal, hot key yang cukup panas dapat memenuhi kapasitas satu core CPU bahkan ketika sisa dataset dingin; di Redis Cluster, satu slot menjadi hotspot sementara node lain menganggur. Mitigasi standarnya adalah **sharding kunci**: simpan N salinan kunci dengan akhiran berbeda dan arahkan setiap permintaan ke shard acak:

```bash
# Alih-alih satu kunci "feed:breaking" yang menangani 100% lalu lintas:
# gunakan 4 shard dan pilih satu per permintaan
feed:breaking:0  feed:breaking:1  feed:breaking:2  feed:breaking:3
```

Perutean sisi aplikasi dalam pseudocode:

```javascript
const shard = Math.floor(Math.random() * 4);
const key = `feed:breaking:${shard}`;
```

Sharding melipatgandakan throughput efektif hot key sebanyak jumlah shard, dengan biaya konsistensi (setiap shard dapat sedikit berbeda). Teknik ini cocok dipasangkan dengan TTL pendek. Dua teknik pelengkap: simpan data terpanas di cache lokal tingkat aplikasi yang kecil (dengan TTL beberapa detik) untuk memangkas lalu lintas Redis sepenuhnya, dan pindahkan lalu lintas baca ke replika sehingga master menghabiskan thread tunggalnya untuk operasi tulis.

### 6. Larang Perintah O(N) dan Gunakan Keluarga SCAN

Model eksekusi single-threaded berarti satu perintah mahal menurunkan performa semua klien. Pelanggar klasik beserta pengganti berbasis scan:

| Pelanggar | Biaya | Pengganti |
|-----------|------|-----------|
| `KEYS *` | O(N) seluruh ruang kunci | `SCAN` dalam batch |
| `SMEMBERS key` | O(N) materialisasi set penuh | `SSCAN key` |
| `HGETALL key` | O(N) materialisasi hash penuh | `HSCAN key` |
| `ZRANGE key 0 -1` | O(N) sorted set penuh | `ZRANGE key start stop` berbatas + `ZSCAN` |
| `LRANGE key 0 -1` | O(N) list penuh | `LRANGE key start stop` berbatas |
| `SUNION a b c` | O(N×M) materialisasi union | simpan hasil inkremental dengan `SADD` + `SUNIONSTORE` |

`SCAN` aman dijalankan di produksi karena mengembalikan batch kecil per panggilan dan menjamin setiap kunci yang ada selama seluruh iterasi dikembalikan setidaknya sekali:

```bash
# Iterasi ruang kunci dalam batch 1000
redis-cli --scan --pattern 'session:*' --count 1000
```

Jika Anda merasa perlu indeks ruang kunci nyata ("semua pengguna yang mendaftar minggu ini"), pertahankan sorted set atau hash khusus untuk kueri tersebut saat data ditulis, daripada memindai saat membaca.

### 7. Setel Persistensi untuk Melindungi Throughput Tulis

Persistensi adalah fitur performa hanya ketika ia tidak menghentikan event loop. Dua mekanisme menyebabkan sebagian besar lonjakan latensi terkait persistensi:

- **Fork selama snapshot RDB atau rewrite AOF**: `fork()` pada Linux dengan dataset multi-gigabyte harus menyalin page table, dan dengan Transparent Huge Pages (THP) yang aktif, granularitas copy-on-write adalah 2 MB, bukan 4 KB — yang dapat menghentikan proses selama ratusan milidetik. Nonaktifkan THP (Langkah 5 di bawah) dan jadwalkan snapshot di luar jam sibuk.
- **Kebijakan `fsync` AOF**: `appendfsync always` memaksa flush disk pada setiap tulis — tepat untuk data keuangan, brutal untuk throughput. `everysec` (bawaan) adalah keseimbangan yang tepat untuk hampir semua beban kerja.

Pengaturan praktik terbaik:

```text
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite yes
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

`no-appendfsync-on-rewrite yes` melewatkan fsync selama rewrite AOF berlangsung sehingga rewrite tidak memperparah flush per detik. Jika instance adalah cache murni yang akan kosong saat restart, Anda dapat menonaktifkan persistensi sepenuhnya (`save ""` dan `appendonly no`) — overhead I/O disk dan fork hilang begitu saja.

### 8. Kurangi Round Trip dengan Pipelining, Batching, dan Client-Side Caching

Round trip jaringan mendominasi latensi Redis untuk aplikasi yang banyak bicara: perintah yang dieksekusi dalam 50 mikrodetik dapat memakan biaya 1–2 milidetik ujung-ke-ujung karena latensi request/response. Tiga teknik sisi klien memangkas jumlah perjalanan:

- **Pipelining**: kirim banyak perintah dalam satu tulis, baca semua balasan dalam satu baca. Dengan ioredis:

```javascript
const pipeline = redis.pipeline();
for (const id of ids) {
  pipeline.get(`user:${id}`);
}
const replies = await pipeline.exec(); // satu round trip
```

- **Perintah multi-nilai**: ganti N perintah individual dengan satu perintah multi-nilai. `MSET`/`MGET` untuk string, `HMGET`/`HMSET` untuk hash, `SADD` untuk set. `MGET` adalah perintah dengan leverage tertinggi untuk beban kerja berat-baca yang menyebar ke banyak kunci.
- **Client-side caching (tracking RESP3)**: Redis 6+ dapat mengirim pesan invalidasi ke klien sehingga klien menyimpan salinan lokal kunci panas dan hanya menyentuh jaringan saat kunci benar-benar berubah:

```text
CLIENT TRACKING ON
# klien sekarang menerima pesan invalidasi untuk semua kunci yang dilanggani
```

Tidak ada bendera pipelining untuk "cukup dinyalakan" di sebagian besar klien; batch perintah Anda secara eksplisit. Pengurangan round trip sepuluh kali lipat umumnya menghasilkan pengurangan p99 sebesar lima hingga sepuluh kali lipat untuk layanan berat-cache.

### 9. Kelola Koneksi dan Hindari Setup Per Permintaan

Membuat koneksi TCP per permintaan menambah overhead connect + handshake pada setiap operasi dan dapat menghabiskan `maxclients` (bawaan 10000) saat lonjakan beban. Dua aturan:

- **Gunakan kembali satu klien berumur panjang per proses.** Pustaka seperti ioredis, node-redis, `redis-py`, dan Jedis dirancang untuk dibagikan. Buat klien sekali saat aplikasi mulai, jangan pernah di dalam request handler.
- **Jika pool diperlukan, ukur dengan sengaja.** Sebagian runtime/kerangka kerja (misalnya PHP-FPM dengan phpredis, atau aplikasi Go multi-thread) diuntungkan oleh pool kecil berisi N koneksi; gunakan maxIdle/maxTotal pool untuk membatasi konkurensi. Pantau `connected_clients` di `INFO clients` — lonjakan berkelanjutan menuju `maxclients` menunjukkan pergantian koneksi, kebocoran pool, atau klien yang salah konfigurasi.

```bash
redis-cli INFO clients
# connected_clients: 42
# blocked_clients: 0
```

Aktifkan juga TCP keepalive di server agar peer yang mati dibersihkan alih-alih menumpuk sebagai koneksi zombie:

```text
tcp-keepalive 300
```

### 10. Pantau Latensi, Perintah Lambat, dan Eviction secara Berkelanjutan

Anda tidak dapat menyetel sesuatu yang tidak Anda ukur. Redis menyediakan diagnostik produksi yang gratis untuk diaktifkan:

- **`LATENCY DOCTOR`** merangkum sumber latensi umum dalam bahasa sederhana — ini hal pertama yang dijalankan saat latensi melonjak.

```bash
redis-cli LATENCY DOCTOR
```

- **Slow log**: catat setiap perintah yang lebih lambat dari ambang (mikrodetik) sehingga perintah mahal menampakkan diri:

```text
slowlog-log-slower-than 10000   # 10 ms
slowlog-max-len 128
```

```bash
redis-cli SLOWLOG GET 20
```

- **`INFO commandstats`**: jumlah panggilan per perintah dan total waktu CPU. Urutkan berdasarkan `usec_per_call` untuk menemukan perintah termahal dalam praktik.

- **Metrik eviction dan miss**: `keyspace_hits` / `keyspace_misses` memberi rasio hit Anda. Rasio hit yang menurun dengan kenaikan eviction (`evicted_keys`) berarti `maxmemory` terlalu rendah atau kebijakan terlalu agresif.

```bash
redis-cli INFO stats | grep -E 'keyspace_hits|keyspace_misses|evicted_keys'
```

Dikombinasikan dengan `redis-cli --stat` untuk snapshot langsung, empat tampilan ini membuat regresi performa terlihat dalam hitungan menit, bukan setelah insiden.

## Langkah Implementasi

### Langkah 1: Buat Baseline Benchmark

Sebelum mengubah apa pun, ukur keadaan saat ini sehingga Anda dapat membuktikan perbaikan. Gunakan `redis-benchmark` dengan profil yang mendekati beban kerja nyata Anda — konkurensi, jumlah permintaan, dan kedalaman pipelining semuanya mengubah angka:

```bash
# 50 klien paralel, 100k permintaan, kedalaman pipeline 16, perintah kunci
redis-benchmark -h 127.0.0.1 -p 6379 -c 50 -n 100000 -P 16 -t SET,GET,LPUSH,RPUSH,HSET
```

Catat throughput (requests/detik) dan persentil latensi per perintah. Jika beban kerja Anda berat-baca, catat juga p50/p95/p99 aplikasi melalui pustaka klien atau alat APM. Simpan angka-angka ini di file atau catatan — angka itu adalah tolok ukur untuk setiap langkah berikutnya.

### Langkah 2: Audit Memori, Fragmentasi, dan Big Key

Jalankan diagnostik memori dan pemindaian big key sebelum menyetel apa pun:

```bash
redis-cli INFO memory
redis-cli MEMORY DOCTOR
redis-cli --bigkeys
```

Yang perlu diperhatikan:

- `mem_fragmentation_ratio` di atas 1,5 menunjukkan fragmentasi (atau kunci yang sangat kecil); di bawah 1,0 berarti OS sedang swap — kondisi paling berbahaya untuk Redis.
- `used_memory` yang cenderung menuju `maxmemory` berarti eviction sudah aktif; periksa `evicted_keys` di `INFO stats`.
- Laporan `--bigkeys` mencantumkan kunci terbesar per tipe data beserta ukurannya. Kunci apa pun di atas sekitar 10.000 elemen atau 1 MB adalah kandidat perlakuan big key dari Praktik Terbaik 4.

```text
# Contoh keluaran --bigkeys (diringkas)
Biggest string found so far 'session:8f2a1c' has 524288 bytes
Biggest   list found so far 'queue:emails' has 2400000 items
Biggest   hash found so far 'user:027' has 18000 fields
Biggest    set found so far 'tags:tech' has 95000 members
```

### Langkah 3: Konfigurasi Batas Memori dan Kebijakan Eviction

Tetapkan `maxmemory` dan kebijakan dengan sengaja, di `redis.conf` agar tahan lama (dan melalui `CONFIG SET` untuk efek seketika):

```bash
redis-cli CONFIG SET maxmemory 4gb
redis-cli CONFIG SET maxmemory-policy allkeys-lfu
redis-cli CONFIG SET maxmemory-samples 10
```

Lalu pertahankan perubahannya:

```bash
redis-cli CONFIG REWRITE
```

Pilih kebijakan dengan mengingat Praktik Terbaik 2: `allkeys-lfu` untuk lapisan cache dengan hot key, `volatile-lru` untuk data campuran yang kunci non-kadaluarsa harus bertahan, `noeviction` untuk antrian dan penyimpanan transaksional. Setelah beberapa jam, periksa kembali `evicted_keys` dan rasio hit — jika eviction tinggi, naikkan `maxmemory` atau pecah dataset ke beberapa instance.

### Langkah 4: Bentuk Ulang Model Data dan Encoding

Terapkan perbaikan pemodelan data dari Praktik Terbaik 3:

1. Ubah keluarga string datar menjadi hash dengan skrip migrasi berlogika bebas-`RENAME`: baca kunci datar dengan `MGET`, tulis satu `HSET`, lalu `UNLINK` kunci datar tersebut.
2. Verifikasi encoding sebelum dan sesudah dengan `OBJECT ENCODING`.
3. Tambahkan batas `LTRIM` pada setiap list append-only di aplikasi.
4. Tinjau `hash-max-listpack-entries`/`value`, `set-max-intset-entries`, dan `zset-max-listpack-*` terhadap ukuran elemen aktual Anda; hanya ubah jika `OBJECT ENCODING` menunjukkan promosi prematur.

```bash
# Verifikasi encoding kunci yang sebelumnya datar setelah migrasi
redis-cli OBJECT ENCODING user:027
# "listpack"
```

Jalankan migrasi secara inkremental: konversi kunci terpanas terlebih dahulu, ukur, lalu lanjutkan. Penulisan ulang sinkron seluruh ruang kunci yang besar akan memicu lonjakan latensi.

### Langkah 5: Setel Persistensi dan Perilaku Fork

Sesuaikan persistensi dengan beban kerja:

```text
# Cache berat-tulis: AOF everysec, lewati fsync saat rewrite
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite yes

# Cache murni: nonaktifkan persistensi sepenuhnya
save ""
appendonly no
```

Jika Anda tetap menggunakan persistensi, kurangi biaya fork:

1. Nonaktifkan Transparent Huge Pages (THP):

```bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
```

1. Pertimbangkan `vm.overcommit_memory = 1` agar fork tidak gagal saat tekanan memori:

```bash
sysctl vm.overcommit_memory=1
```

1. Utamakan snapshot RDB di luar jam sibuk, dan naikkan `auto-aof-rewrite-percentage` jika rewrite terlalu sering terjadi.

### Langkah 6: Perkuat Lapisan Jaringan dan OS

Latensi di Redis sering bersembunyi di kernel, bukan di Redis:

```text
# /etc/sysctl.d/99-redis.conf
net.core.somaxconn = 511          # antrean listen TCP, cocok dengan tcp-backlog redis.conf
net.ipv4.tcp_max_syn_backlog = 1024
vm.overcommit_memory = 1          # ramah-fork
```

Dan di `redis.conf`:

```text
tcp-backlog 511
tcp-keepalive 300
```

Verifikasi juga bahwa instance tidak melakukan swap: `free -h` harus menunjukkan RSS Redis nyaman di bawah RAM fisik, dan `mem_fragmentation_ratio` di `INFO memory` di atas 1,0. Jika mesin swap, tambah RAM atau kurangi `maxmemory`.

### Langkah 7: Perbaiki Perintah Lambat di Aplikasi

Gunakan slow log dan commandstats untuk menemukan perintah yang tepat, lalu perbaiki di sumbernya:

```bash
redis-cli SLOWLOG GET 20
redis-cli INFO commandstats
```

Perbaikan umum:

- Ganti panggilan aplikasi ke `KEYS` dengan `SCAN` (atau struktur indeks).
- Ganti `SMEMBERS`/`HGETALL`/`ZRANGE 0 -1` dengan padanan berbatas/scan.
- Ganti N `GET` tunggal dalam perulangan dengan satu `MGET`.
- Bungkus tulis multi-langkah dalam pipeline atau skrip Lua (`EVAL`) sehingga server mengeksekusinya secara atomik tanpa round trip tambahan.

```lua
-- Penghitung atomik + tetapkan kedaluwarsa dalam satu round trip
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return c
```

Jalankan ulang kueri slow log setelah setiap perbaikan; tujuannya nol perintah di slow log selama lalu lintas normal.

### Langkah 8: Terapkan Client-Side Caching dan Connection Pooling

Di tier aplikasi:

1. Bagikan satu instance klien (atau pool berbatas) per proses — Praktik Terbaik 9.
2. Aktifkan pipelining untuk operasi batch dan ganti perulangan dengan `MGET`/`HMGET`/`MSET`.
3. Untuk hot key berat-baca, aktifkan client-side caching RESP3 jika klien Anda mendukungnya (ioredis, node-redis v5+, redis-py 4.5+ dengan `protocol=3`). Mulai dengan tracking kumpulan kunci kecil dan amati lalu lintas invalidasi; itu harus menjadi sebagian kecil dari lalu lintas baca.

```javascript
// node-redis v5+ client-side caching RESP3
import { createClient } from 'redis';

const client = createClient({ protocol: 3 }); // RESP3 mengaktifkan tracking
await client.connect();
await client.configSet('maxmemory-policy', 'allkeys-lfu');
```

Hasil yang terlihat: latensi baca p99 untuk cache hit turun ke kecepatan memori lokal, dan penggunaan CPU Redis menurun karena sebagian besar pembacaan tidak pernah mencapai jaringan.

### Langkah 9: Benchmark Ulang, Bandingkan, dan Ulangi

Jalankan benchmark dan pemeriksaan pemantauan yang persis sama dari Langkah 1, lalu bandingkan:

```text
# Sebelum: SET 81234 req/s,  p99 2,41 ms
# Sesudah: SET 118456 req/s, p99 0,62 ms
```

Jika angka bergerak ke arah yang benar, kunci konfigurasi ke `redis.conf` (atau sistem manajemen konfigurasi Anda), simpan hasil benchmark ke runbook Anda, dan buat alert pada metrik dari Praktik Terbaik 10 sehingga regresi membangunkan seseorang alih-alih merendahkan layanan secara diam-diam. Penyetelan performa bukan peristiwa satu kali — setiap pola kueri baru, bentuk data, atau lonjakan lalu lintas adalah kesempatan untuk mengulang siklus ini.

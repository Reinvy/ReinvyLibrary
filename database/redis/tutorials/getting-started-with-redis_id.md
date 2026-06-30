---
title: "Memulai dengan Redis"
description: "Pengenalan komprehensif tentang Redis yang mencakup instalasi, struktur data inti, pola caching, pesan Pub/Sub, dan integrasi dengan aplikasi Node.js."
category: "database"
technology: "redis"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Memulai dengan Redis

## Ringkasan

Redis adalah penyimpanan struktur data in-memory yang berfungsi sebagai basis data, cache, dan message broker. Tutorial ini memandu Anda dalam menginstal dan mengonfigurasi Redis, menguasai tipe data intinya (string, list, set, hash, sorted set), menerapkan pola caching, menggunakan Pub/Sub untuk pesan real-time, dan mengintegrasikan Redis dengan aplikasi Node.js menggunakan klien ioredis.

## Target Audiens

- Backend Developer, Fullstack Developer, dan DevOps engineer.
- Tingkat pemula hingga menengah. Tidak memerlukan pengalaman Redis sebelumnya.

## Prasyarat

- Pemahaman dasar tentang penyimpanan key-value dan konsep basis data.
- Node.js dan npm terinstal (v16 atau yang lebih baru) untuk bagian integrasi.
- Terminal dengan curl atau telnet untuk menguji konektivitas.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menginstal dan menjalankan Redis secara lokal atau melalui Docker.
- Menggunakan `redis-cli` untuk berinteraksi dengan server Redis.
- Bekerja dengan string, list, set, hash, dan sorted set.
- Menerapkan caching dengan TTL dan pola cache-aside.
- Mempublikasikan dan berlangganan pesan real-time dengan Pub/Sub.
- Terhubung ke Redis dari Node.js menggunakan ioredis.
- Menerapkan konfigurasi persistensi dan keamanan dasar.

## Konteks dan Motivasi

Aplikasi modern membutuhkan akses data berlatensi rendah untuk fitur seperti caching, penyimpanan sesi, notifikasi real-time, dan rate limiting. Basis data relasional tradisional kesulitan memenuhi waktu respons sub-milidetik di bawah konkurensi tinggi.

Redis mengatasi hal ini dengan menyimpan dataset utama di dalam memori, mencapai throughput ratusan ribu operasi per detik. Struktur datanya yang serbaguna melampaui penyimpanan key-value sederhana — list dapat berperan sebagai antrean, sorted set memberi daya pada papan peringkat, dan stream menyediakan event sourcing. Perusahaan seperti Twitter, GitHub, dan Stack Overflow mengandalkan Redis untuk memberikan pengalaman yang responsif dan skalabel.

Memahami Redis sangat penting bagi setiap pengembang yang membangun sistem backend berperforma tinggi. Tutorial ini memberikan fondasi praktis untuk menggunakan Redis dengan percaya diri di lingkungan produksi.

## Konten Inti

### Instalasi dan Persiapan

**Opsi A — Instalasi native (Linux / macOS):**

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# macOS dengan Homebrew
brew install redis
brew services start redis
```

**Opsi B — Docker (lintas platform):**

```bash
docker run --name redis-local -p 6379:6379 -d redis:7-alpine
```

Verifikasi server berjalan:

```bash
redis-cli ping
# Output: PONG
```

### Shell Interaktif redis-cli

Luncurkan klien dan coba perintah dasar:

```bash
redis-cli
```

```text
127.0.0.1:6379> SET greeting "Halo, Redis!"
OK
127.0.0.1:6379> GET greeting
"Halo, Redis!"
127.0.0.1:6379> EXISTS greeting
(integer) 1
127.0.0.1:6379> DEL greeting
(integer) 1
127.0.0.1:6379> FLUSHALL
OK
```

### Struktur Data Inti

#### Strings

Tipe paling dasar — nilai binary-safe hingga 512 MB.

```redis
SET user:1:nama "Alice"
SET user:1:kunjungan 42
INCR user:1:kunjungan       # → 43
INCRBY user:1:kunjungan 10  # → 53
GET user:1:nama             # → "Alice"
GET user:1:kunjungan        # → "53"
```

String adalah fondasi untuk caching, counter, dan token sesi.

#### Lists

Koleksi terurut (linked list) — cocok untuk antrean dan linimasa.

```redis
LPUSH notifikasi "user1 menyukai postingan Anda"
LPUSH notifikasi "user2 mengikuti Anda"
LRANGE notifikasi 0 -1
# 1) "user2 mengikuti Anda"
# 2) "user1 menyukai postingan Anda"
RPOP notifikasi
# → "user1 menyukai postingan Anda"
LLEN notifikasi
# → 1
```

Gunakan `LPUSH` + `RPOP` untuk antrean FIFO, atau `LPUSH` + `LPOP` untuk stack.

#### Sets

Koleksi string unik yang tidak terurut — bagus untuk tag, pengunjung unik.

```redis
SADD artikel:42:tag "redis" "database" "tutorial"
SADD artikel:42:tag "redis" "caching"
SMEMBERS artikel:42:tag
# 1) "caching"
# 2) "database"
# 3) "redis"
SISMEMBER artikel:42:tag "database"
# → 1
SCARD artikel:42:tag
# → 3
```

Operasi set (`SINTER`, `SUNION`, `SDIFF`) memungkinkan kueri yang kuat seperti "temukan artikel yang ditandai dengan 'redis' dan 'tutorial'".

#### Hashes

Pemetaan string-ke-string — cara idiomatis untuk menyimpan objek.

```redis
HSET user:42 username "alice" email "alice@example.com" bergabung "2024-01-15"
HGET user:42 email
# → "alice@example.com"
HGETALL user:42
# 1) "username"
# 2) "alice"
# 3) "email"
# 4) "alice@example.com"
# 5) "bergabung"
# 6) "2024-01-15"
HINCRBY user:42 jumlah_login 1
# → 1
```

Hash lebih efisien dalam penggunaan memori dibandingkan menyerialisasikan seluruh objek sebagai string JSON.

#### Sorted Sets

Mirip dengan set tetapi setiap anggota memiliki skor, memungkinkan pengambilan terurut.

```redis
ZADD papan_skor 100 "pemain1" 250 "pemain2" 175 "pemain3"
ZRANGE papan_skor 0 -1 WITHSCORES
# 1) "pemain1"
# 2) "100"
# 3) "pemain3"
# 4) "175"
# 5) "pemain2"
# 6) "250"
ZREVRANGE papan_skor 0 2
# 1) "pemain2"
# 2) "pemain3"
# 3) "pemain1"
ZINCRBY papan_skor 50 "pemain3"
# → "225"
```

Sorted Set mendukung papan peringkat, jendela rate limiting, dan antrean pekerjaan tertunda.

### Menerapkan Lapisan Cache

Pola cache-aside (lazy loading) adalah strategi caching yang paling umum:

1. Baca dari cache terlebih dahulu.
2. Jika tidak ada (cache miss), baca dari basis data utama.
3. Simpan data yang diambil di Redis dengan TTL.

```redis
# Set dengan TTL 5 menit
SETEX user:42:profil '{"nama":"Alice"}' 300

# Periksa sisa TTL
TTL user:42:profil
# → 294
```

Untuk invalidasi, hapus kunci saat data yang mendasarinya berubah:

```redis
DEL user:42:profil
```

### Pesan Pub / Sub

Redis mendukung pola publish-subscribe ringan untuk pesan real-time.

**Subscriber (terminal 1):**

```redis
SUBSCRIBE berita:terkini
Reading messages...
```

**Publisher (terminal 2):**

```redis
PUBLISH berita:terkini "Gangguan server dilaporkan di region us-east-1"
```

Subscriber segera menerima pesan. Ini ideal untuk umpan real-time, backend WebSocket, dan notifikasi antar-layanan.

### Konfigurasi Persistensi

Secara default Redis menyimpan snapshot data ke disk (`RDB`). Aktifkan Append-Only File (`AOF`) untuk ketahanan:

```bash
# Di redis.conf atau melalui CONFIG SET
appendonly yes
appendfsync everysec
```

AOF mencatat setiap operasi tulis dan memutarnya ulang saat restart — keseimbangan yang baik antara ketahanan dan performa.

### Dasar Keamanan

```bash
# Tetapkan kata sandi di redis.conf
requirepass kata-sandi-kuat-anda

# Ikat hanya ke localhost (default)
bind 127.0.0.1

# Ganti nama perintah berbahaya untuk menonaktifkannya
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
```

Di lingkungan produksi, selalu jalankan Redis di belakang firewall dan gunakan TLS untuk koneksi eksternal.

## Contoh Kode

### Terhubung dari Node.js dengan ioredis

```bash
npm install ioredis
```

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  // password: 'kata-sandi-kuat-anda', // hapus komentar jika diatur
  retryStrategy: (times) => Math.min(times * 100, 3000),
});
```

### Caching Kueri Basis Data

```javascript
async function ambilProfilPengguna(idPengguna) {
  const kunciCache = `user:${idPengguna}:profil`;

  // 1. Coba cache
  const cached = await redis.get(kunciCache);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss — simulasi kueri basis data
  const profil = await db.cariPenggunaById(idPengguna);

  // 3. Simpan di Redis dengan TTL 5 menit
  await redis.setex(kunciCache, 300, JSON.stringify(profil));

  return profil;
}

// Invalidasi saat pembaruan
async function perbaruiProfilPengguna(idPengguna, data) {
  await db.perbaruiPengguna(idPengguna, data);
  await redis.del(`user:${idPengguna}:profil`);
}
```

### Rate Limiting dengan Sorted Sets

```javascript
async function apakahDibatasiRate(idPengguna) {
  const kunci = `ratelimit:${idPengguna}:api`;
  const ukuranJendela = 60; // 60 detik
  const maksPermintaan = 100;
  const sekarang = Date.now();

  // Hapus entri di luar jendela
  await redis.zremrangebyscore(kunci, 0, sekarang - ukuranJendela * 1000);

  // Hitung permintaan saat ini
  const jumlah = await redis.zcard(kunci);

  if (jumlah >= maksPermintaan) {
    return true; // dibatasi
  }

  // Tambahkan permintaan saat ini
  await redis.zadd(kunci, sekarang, `${sekarang}:${Math.random()}`);
  await redis.expire(kunci, ukuranJendela);
  return false;
}
```

### Pub/Sub di Node.js

```javascript
// publisher.js
const Redis = require('ioredis');
const publisher = new Redis();

async function kirimNotifikasi(saluran, pesan) {
  await publisher.publish(saluran, JSON.stringify(pesan));
  console.log(`Diterbitkan ke ${saluran}`);
}

kirimNotifikasi('pesanan:baru', { idPesanan: 123, jumlah: 49.99 });
```

```javascript
// subscriber.js
const Redis = require('ioredis');
const subscriber = new Redis();

subscriber.subscribe('pesanan:baru', (err, jumlah) => {
  console.log(`Berlangganan ke ${jumlah} saluran`);
});

subscriber.on('message', (saluran, pesan) => {
  const data = JSON.parse(pesan);
  console.log(`Menerima pesanan ${data.idPesanan}: $${data.jumlah}`);
});
```

## Insight Penting

- **String adalah pisau Swiss Army**: Gunakan untuk caching, counter, token sesi, dan distributed lock. Kesederhanaannya menyembunyikan kekuatan yang mengejutkan saat dikombinasikan dengan `SETEX`, `INCR`, dan `GETSET`.
- **Pilih struktur yang tepat**: Hash lebih unggul dari JSON blobs untuk pembaruan parsial. List berfungsi sebagai antrean alami. Sorted set tidak tergantikan untuk papan peringkat dan rate limiting jendela geser.
- **TTL adalah sahabat Anda**: Setiap kunci cache harus memiliki TTL untuk mencegah data basi dan kehabisan memori. Gunakan `SETEX` atau `EXPIRE` secara konsisten.
- **Perintah O(N) pada kunci besar berbahaya**: `KEYS *` memblokir event loop — gunakan `SCAN` sebagai gantinya. Demikian pula, `SMEMBERS` pada set dengan jutaan entri dapat menghentikan server.
- **Pantau memori**: Gunakan `INFO memory` untuk melacak fragmentasi dan penggunaan puncak. Tetapkan `maxmemory` dengan kebijakan eviksi `allkeys-lru` atau `volatile-lru`.
- **Hindari subscriber Pub/Sub yang lambat**: Jika subscriber lambat, Redis menyangga pesan di memori, yang dapat menyebabkan pertumbuhan tak terbatas. Gunakan koneksi khusus untuk langganan.

## Langkah Berikutnya

- Jelajahi Redis Streams untuk event sourcing dan grup konsumen.
- Pelajari tentang Redis Cluster untuk sharding horizontal.
- Siapkan Redis Sentinel untuk ketersediaan tinggi.
- Pelajari fitur Pipeline dan Multi (transaksi) ioredis untuk operasi batch.

## Kesimpulan

Anda telah mempelajari cara menginstal dan menjalankan Redis, memanipulasi lima struktur data intinya, menerapkan caching dan rate limiting, serta mengintegrasikan Redis dengan Node.js. Dengan fondasi ini, Anda siap menggunakan Redis sebagai pelengkap yang kuat untuk basis data utama Anda — membuka kunci waktu respons sub-milidetik untuk data yang paling penting.

---
title: "Membangun Rate Limiter Terdistribusi dengan Redis"
description: "Tutorial lanjutan yang praktis untuk membangun rate limiter terdistribusi dengan Redis — mencakup algoritma fixed window, sliding window log, dan token bucket, scripting Lua untuk atomisitas, integrasi middleware Express, serta penguatan untuk deployment multi-instance."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Rate Limiter Terdistribusi dengan Redis

## Ringkasan

Tutorial ini memandu Anda membangun rate limiter terdistribusi siap-produksi yang ditenagai Redis. Anda akan mengimplementasikan tiga algoritma klasik — fixed window counter, sliding window log, dan token bucket — membuatnya atomik dengan scripting Lua, mengintegrasikannya ke aplikasi Express sebagai middleware yang dapat digunakan ulang, serta menguatkan desainnya untuk deployment multi-instance dan multi-region di mana satu instance Redis bersama menjadi sumber kebenaran tunggal.

## Target Audiens

- Developer backend yang membangun API publik, microservice, atau layanan apa pun yang harus melindungi diri dari lalu lintas yang melanggar batas.
- Developer yang sudah memahami dasar-dasar Redis (struktur data, TTL, perintah dasar) dan ingin menerapkannya pada masalah sistem terdistribusi yang nyata.
- Ekspektasi tingkat kemampuan pembaca: Mahir — nyaman dengan Node.js, pemrograman asinkron, dan konsep dasar Redis.

## Prasyarat

- Pengetahuan menengah tentang struktur data dan perintah Redis (string, sorted set, `EXPIRE`).
- Node.js 18+ terinstal, dengan klien `ioredis` tersedia (`npm install ioredis`).
- Server Redis yang berjalan (lokal `redis-server` atau kontainer Docker) di `localhost:6379`.
- Keakraban dasar dengan middleware Express dan kode status HTTP.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan trade-off antara algoritma rate limiting fixed window, sliding window log, dan token bucket.
- Mengimplementasikan setiap algoritma terhadap Redis menggunakan struktur data dan strategi TTL yang tepat.
- Menulis skrip Lua yang membuat pemeriksaan rate limiting multi-langkah menjadi atomik, menghilangkan race condition.
- Mengintegrasikan rate limiter ke Express sebagai middleware yang mengembalikan respons `429` yang benar dengan header `Retry-After`.
- Mendesain rate limiting untuk deployment terdistribusi, termasuk penamaan kunci, hash tag untuk mode cluster, serta perilaku fail-open versus fail-closed.

## Konteks dan Motivasi

API publik, endpoint login, endpoint pencarian, dan konsumen webhook memiliki satu masalah yang sama: mereka dapat dibanjiri oleh satu pemanggil saja. Klien yang salah perilaku — loop retry yang bermasalah, scraper, atau penyerang — dapat menghabiskan kapasitas yang seharusnya dipakai semua orang, menurunkan latensi untuk seluruh pengguna, dan menaikkan biaya infrastruktur.

Rate limiting menyelesaikan ini dengan menerapkan kontrak sederhana: seorang pemanggil boleh mengirim maksimal N permintaan per jendela waktu. Bagian tersulitnya adalah layanan modern berjalan dalam banyak instance di balik load balancer, sehingga penghitung dalam memori satu proses Node.js tidak berguna — instance A tidak akan tahu permintaan yang ditangani instance B. Redis menyelesaikan ini karena ia adalah penyimpanan data bersama, berlatensi rendah, dan single-threaded: setiap instance berbicara ke Redis yang sama, penghitung konsisten secara konstruksi, dan skrip Lua berjalan atomik tanpa interleaving dari klien lain.

Tutorial ini memperlakukan Redis bukan sebagai cache melainkan sebagai primitif koordinasi. Pada akhirnya, Anda akan memiliki rate limiter yang benar di bawah konkurensi, murah untuk dioperasikan, dan siap produksi.

## Konten Inti

### Ringkasan Algoritma

Semua rate limiter menjawab pertanyaan yang sama: *apakah pemanggil ini melebihi N permintaan dalam W detik terakhir?* Perbedaannya terletak pada seberapa akurat mereka mengukur jendela waktu dan seberapa banyak memori yang mereka habiskan.

```text
| Algoritma          | Akurasi               | Memori  | Perilaku burst              |
|--------------------|-----------------------|---------|-----------------------------|
| Fixed window       | Kasar (tepi jendela)  | O(1)    | Memungkinkan burst 2x di batas |
| Sliding window log | Tepat                 | O(N)    | Halus, tanpa burst          |
| Sliding window     | Mendekati             | O(1)    | Sebagian besar halus        |
| Token bucket       | Kontinu               | O(1)    | Burst terbatas dan disengaja |
```

### Fixed Window Counter

Algoritma paling sederhana: satu kunci Redis per pemanggil per jendela. Setiap permintaan menaikkan kunci; ketika kunci mencapai batas, permintaan ditolak. Kunci membawa TTL yang sama dengan panjang jendela, yang sekaligus mengakhiri penghitung dan menghapus kunci.

```bash
# Permintaan pertama dalam jendela
SET limiter:user:42 1 NX EX 60
# Permintaan berikutnya
INCR limiter:user:42
```

Versi dua perintah secara naif memiliki race: `SET NX` yang diikuti `INCR` tidak atomik, dan `INCR` yang diikuti `EXPIRE` kehilangan TTL jika proses mati di antara keduanya. Perbaikannya adalah skrip Lua kecil yang melakukan seluruh pemeriksaan-dan-penambahan dalam satu langkah atomik.

### Sliding Window Log dengan Sorted Set

Fixed window memiliki kelemahan yang terkenal: jika batasnya 100 permintaan per menit, pemanggil dapat mengirim 100 permintaan pada pukul 11:59:59 dan 100 lagi pada 12:00:01 — 200 permintaan dalam dua detik. Sliding window log menghilangkan kelemahan ini dengan mengingat timestamp setiap permintaan.

Sorted set dengan kunci pemanggil menyimpan setiap permintaan dengan skor yang sama dengan timestamp Unix-nya:

```bash
# Catat permintaan pada waktu T
ZADD limiter:user:42 T T
# Hapus permintaan yang lebih lama dari jendela
ZREMRANGEBYSCORE limiter:user:42 -inf (T-60
# Hitung permintaan yang tersisa
ZCARD limiter:user:42
# Atur/atur ulang TTL agar kunci hangus saat menganggur
EXPIRE limiter:user:42 60
```

Ini tepat tetapi boros memori: satu member per permintaan. Di bawah laju permintaan per detik yang tinggi, sorted set bertambah besar, dan setiap pemeriksaan melakukan tiga atau empat perintah. Untuk sebagian besar API, fixed window atau token bucket lebih murah dan cukup baik.

### Token Bucket dengan Lua

Token bucket memodelkan kapasitas sebagai token: bucket menampung paling banyak `capacity` token, token terisi kembali dengan laju `rate` token per detik, dan setiap permintaan mengonsumsi satu token. Ini memungkinkan burst pendek hingga ukuran bucket sambil menegakkan laju rata-rata jangka panjang.

Simpan dua kondisi per pemanggil: jumlah token saat ini dan timestamp pengisian terakhir.

```text
tokens  = min(capacity, tokens + (now - last_refill) * rate)
if tokens >= 1:
    tokens = tokens - 1
    allow = true
else:
    allow = false
```

Ini mengubah dua field dan harus atomik — persis yang dijamin oleh skrip Lua.

### Atomisitas dengan Scripting Lua

Redis mengeksekusi skrip Lua secara atomik: tidak ada perintah klien lain yang berjalan selama skrip dieksekusi. Ini menjadikan Lua alat standar untuk logika rate limit multi-langkah. Skrip menerima kunci, batas, dan jendela sebagai argumen, melakukan pemeriksaan, dan mengembalikan apakah permintaan diizinkan serta berapa lama pemanggil harus menunggu sebelum mencoba lagi.

```lua
-- KEYS[1] kunci pemanggil, ARGV[1] batas, ARGV[2] jendela detik,
-- ARGV[3] timestamp unix saat ini
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local current = redis.call('GET', key)
if not current then
  redis.call('SET', key, 1, 'PX', window * 1000)
  return {1, 0}
end
current = tonumber(current)
if current < limit then
  redis.call('INCR', key)
  return {1, 0}
end
local ttl = redis.call('PTTL', key)
if ttl <= 0 then
  redis.call('SET', key, 1, 'PX', window * 1000)
  return {1, 0}
end
return {0, math.ceil(ttl / 1000)}
```

Skrip mengembalikan dua nilai: `1`/`0` untuk diizinkan/ditolak, dan sisa waktu tunggu dalam detik, yang disajikan lapisan API sebagai header `Retry-After`.

### Penamaan Kunci dan Kebersihan TTL

Pilih nama kunci yang tidak ambigu dan ber-namespace agar kunci Redis dari fitur yang berbeda tidak pernah bertabrakan:

```text
ratelimit:{algoritma}:{scope}:{identifikasi}
ratelimit:fixed:user:42
ratelimit:token:ip:203.0.113.7
ratelimit:bucket:api-key:abc123
```

Setiap kunci harus membawa TTL. Kunci fixed window kedaluwarsa setelah jendela; kunci token bucket dapat menggunakan TTL yang lebih panjang terkait dengan `capacity / rate` ditambah margin kecil, disegarkan pada setiap penulisan. TTL yang hilang adalah bug produksi klasik: kunci menumpuk selamanya dan memori Redis bertambah tanpa batas.

### Pertimbangan Sistem Terdistribusi

- **Sumber kebenaran tunggal**: semua instance aplikasi membaca dan menulis Redis yang sama, sehingga batas berlaku di seluruh armada tanpa koordinasi antar-instance.
- **Clock skew**: kirim timestamp ke skrip Lua sebagai argumen (diambil dari aplikasi atau satu jam acuan) alih-alih memanggil `TIME` di dalam skrip per permintaan — waktu yang konsisten di semua batas menghindari artefak di tepi jendela.
- **Mode cluster**: di Redis Cluster, kunci di-sharding berdasarkan hash slot. Gunakan hash tag seperti `ratelimit:{user:42}:fixed` agar semua kunci untuk satu pemanggil mendarat di node yang sama, membuat skrip multi-kunci aman.
- **Fail-open versus fail-closed**: putuskan apa yang terjadi ketika Redis tidak dapat dijangkau. Fail-closed (menolak) melindungi backend tetapi mengubah pemadaman Redis menjadi pemadaman API total; fail-open (mengizinkan) menjaga API tetap hidup tetapi kehilangan perlindungan. Sebagian besar sistem produksi memilih fail-open untuk API yang banyak GET dan fail-closed untuk endpoint autentikasi.
- **Instance khusus versus bersama**: Redis khusus untuk rate limiting menghindari eviction dan interferensi latensi dari beban cache, tetapi lebih mahal. Dengan instance bersama, gunakan `maxmemory-policy allkeys-lru` dengan hati-hati — eviction LRU pada kunci rate limit secara diam-diam menonaktifkan perlindungan.

### Pengujian dan Verifikasi

Verifikasi kebenaran dengan permintaan konkuren: kirim 100 permintaan paralel terhadap batas 10 per 10 detik dan pastikan tepat 10 berhasil. Uji juga perilaku tepi jendela pada algoritma fixed window, waktu pengisian token bucket, dan jaminan atomisitas Lua dengan membanjiri limiter dari beberapa proses Node.js sekaligus.

## Contoh Kode

### Koneksi Redis Bersama

```javascript
// redis.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  enableOfflineQueue: false, // gagal cepat saat Redis turun
  maxRetriesPerRequest: 1,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

module.exports = redis;
```

### Fixed Window Limiter (Atomik dengan Lua)

```javascript
// fixedWindow.js
const redis = require('./redis');

const FIXED_WINDOW_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])

local current = redis.call('GET', key)
if not current then
  redis.call('SET', key, 1, 'PX', windowMs)
  return {1, 0}
end
current = tonumber(current)
if current < limit then
  redis.call('INCR', key)
  return {1, 0}
end
local ttl = redis.call('PTTL', key)
if ttl <= 0 then
  redis.call('SET', key, 1, 'PX', windowMs)
  return {1, 0}
end
return {0, math.ceil(ttl / 1000)}
`;

async function fixedWindowLimit(key, limit, windowSeconds) {
  const [allowed, retryAfter] = await redis.eval(
    FIXED_WINDOW_SCRIPT,
    1,
    `ratelimit:fixed:${key}`,
    String(limit),
    String(windowSeconds * 1000)
  );
  return { allowed: allowed === 1, retryAfter };
}

module.exports = { fixedWindowLimit };
```

### Sliding Window Log Limiter

```javascript
// slidingLog.js
const redis = require('./redis');

const SLIDING_LOG_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local windowMs = windowSeconds * 1000
local oldest = now - windowMs

redis.call('ZREMRANGEBYSCORE', key, '-inf', oldest)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldestMember = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfterMs = tonumber(oldestMember[2]) + windowMs - now
  return {0, math.max(1, math.ceil(retryAfterMs / 1000))}
end
redis.call('ZADD', key, now, now .. ':' .. redis.call('INCR', 'ratelimit:seq'))
redis.call('PEXPIRE', key, windowMs * 2)
return {1, 0}
`;

async function slidingLogLimit(key, limit, windowSeconds) {
  const now = Date.now();
  const [allowed, retryAfter] = await redis.eval(
    SLIDING_LOG_SCRIPT,
    1,
    `ratelimit:sliding:${key}`,
    String(limit),
    String(windowSeconds),
    String(now)
  );
  return { allowed: allowed === 1, retryAfter };
}

module.exports = { slidingLogLimit };
```

### Token Bucket Limiter (Lua)

```javascript
// tokenBucket.js
const redis = require('./redis');

const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1]) or capacity
local ts = tonumber(data[2]) or now

local elapsed = math.max(0, now - ts)
tokens = math.min(capacity, tokens + elapsed * refillRate / 1000)

local retryAfter = 0
if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
  redis.call('PEXPIRE', key, math.ceil(capacity / refillRate * 1000) + 1000)
  return {1, 0}
end
retryAfter = math.ceil((1 - tokens) / refillRate * 1000)
redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', key, math.ceil(capacity / refillRate * 1000) + 1000)
return {0, retryAfter}
`;

async function tokenBucketLimit(key, capacity, refillPerSecond) {
  const now = Date.now();
  const [allowed, retryAfterMs] = await redis.eval(
    TOKEN_BUCKET_SCRIPT,
    1,
    `ratelimit:token:${key}`,
    String(capacity),
    String(refillPerSecond),
    String(now)
  );
  return { allowed: allowed === 1, retryAfter: Math.ceil(retryAfterMs / 1000) };
}

module.exports = { tokenBucketLimit };
```

### Integrasi Middleware Express

```javascript
// rateLimitMiddleware.js
const Redis = require('ioredis');
const { tokenBucketLimit } = require('./tokenBucket');

const redis = new Redis();

function rateLimit({ capacity, refillPerSecond, identifier = (req) => req.ip }) {
  return async function rateLimitMiddleware(req, res, next) {
    if (process.env.RATE_LIMIT_DISABLED === 'true') {
      return next();
    }
    try {
      const key = identifier(req);
      const { allowed, retryAfter } = await tokenBucketLimit(
        key,
        capacity,
        refillPerSecond
      );
      if (!allowed) {
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: 'Too Many Requests',
          retryAfterSeconds: retryAfter,
        });
      }
      return next();
    } catch (err) {
      // Fail-open: Redis yang tidak tersedia tidak boleh mematikan API.
      console.error('Rate limiter error, failing open:', err.message);
      return next();
    }
  };
}

module.exports = { rateLimit };
```

```javascript
// app.js
const express = require('express');
const { rateLimit } = require('./rateLimitMiddleware');

const app = express();

app.use('/api', rateLimit({
  capacity: 60,
  refillPerSecond: 1,
  identifier: (req) => `ip:${req.ip}`,
}));

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from a rate-limited route' });
});

app.listen(3000, () => {
  console.log('API listening on :3000');
});
```

### Memverifikasi Limiter di Bawah Beban

```bash
# Kirim 30 permintaan paralel terhadap batas 10-per-10-detik
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/hello &
done
wait
```

```text
# Output yang diharapkan: sepuluh respons 200 diikuti dua puluh respons 429
200
200
200
200
200
200
200
200
200
200
429
429
429
429
429
429
429
429
429
429
429
429
429
429
429
429
429
429
429
429
```

## Insight Penting

- **Lua tidak bisa ditawar untuk kebenaran**: pemeriksaan rate limit apa pun yang membentang beberapa perintah (baca penghitung, bandingkan, naikkan) memiliki window race di bawah konkurensi. Satu skrip `EVAL` membuat seluruh keputusan atomik. Pasangan `INCR` + `EXPIRE` klasik adalah bug halus yang paling umum — proses yang mati di antara keduanya meninggalkan kunci tanpa TTL yang bertambah selamanya.
- **Pilihan algoritma adalah trade-off memori/akurasi**: fixed window hampir tidak berbiaya tetapi memungkinkan burst 2x di tepi jendela; sliding window log tepat tetapi menyimpan satu member per permintaan; token bucket memberikan burst yang halus dan terbatas dengan memori konstan. Untuk sebagian besar API, token bucket adalah default terbaik.
- **TTL adalah kegagalan produksi paling umum kedua**: setiap kunci rate limit memerlukan kedaluwarsa. Tanpa itu, penghitung menumpuk hingga Redis kehabisan memori, dan di bawah eviction `allkeys-lru` perlindungan Anda hilang secara diam-diam. Atur `PEXPIRE` dalam skrip yang sama yang menulis kunci.
- **Fail-open versus fail-closed adalah keputusan bisnis, bukan keputusan teknis**: fail-open menjaga API tetap hidup selama pemadaman Redis tetapi membiarkannya tanpa perlindungan; fail-closed melindungi backend tetapi mengubah Redis menjadi titik kegagalan tunggal. Pilih per endpoint — endpoint autentikasi fail-closed, endpoint baca publik fail-open.
- **Hash tag penting dalam mode cluster**: tanpa hash tag, skrip multi-kunci akan error dan batas untuk pemanggil yang sama dapat mendarat di shard yang berbeda, memecahkan batas sepenuhnya. Namespace kunci sebagai `ratelimit:{identifikasi}:fixed` agar shard stabil per pemanggil.
- **Kirim waktu dari pemanggil**: hitung timestamp di aplikasi (atau baca `TIME` Redis sekali per permintaan) dan kirimkan ke skrip sebagai argumen. Memanggil `TIME` per skrip lebih lambat, dan mencampur jam antar-instance dapat menghasilkan 429 palsu di batas jendela.

## Langkah Berikutnya

- Jelajahi silabus Redis lanjutan untuk menempatkan rate limiting dalam keterampilan produksi Redis yang lebih luas — lihat `database/redis/syllabi/advanced-redis-syllabus.md`.
- Pelajari scripting Lua lebih lanjut dengan cheatsheet scripting Lua di `database/redis/cheatsheets/redis-lua-scripting-cheatsheet.md`.
- Perluas limiter Anda dengan tier multi-tenant (batas berbeda per paket API), biaya tertimbang per pengguna, atau penghitung terdistribusi berbasis Redis Streams.

## Kesimpulan

Anda telah membangun rate limiter terdistribusi yang benar di bawah konkurensi, murah untuk dijalankan, dan siap untuk deployment multi-instance. Algoritma fixed window, sliding window log, dan token bucket masing-masing menyelesaikan trade-off akurasi/memori yang berbeda; scripting Lua menghilangkan race condition yang mengganggu implementasi naif; dan penamaan kunci yang cermat, kebersihan TTL, serta penanganan fail-open membuat limiter aman dalam produksi. Pola yang sama — kondisi bersama di Redis, mutasi atomik di Lua, penegakan di tepi — berlaku jauh melampaui rate limiting untuk distributed lock, idempotency key, dan feature flag.

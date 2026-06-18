---
title: "Cheat Sheet Redis"
description: "Referensi cepat komprehensif untuk perintah Redis, tipe data, pola penggunaan, dan integrasi Node.js."
category: "database"
technology: "redis"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Redis

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Set key-value | `SET key value [EX detik] [NX\|XX]` | Mengatur nilai sebuah key dengan opsi kadaluwarsa dan kondisi |
| Get nilai | `GET key` | Mendapatkan nilai dari sebuah key |
| Hapus key | `DEL key [key ...]` | Menghapus satu atau lebih key |
| Set kadaluwarsa | `EXPIRE key detik` | Mengatur waktu kadaluwarsa pada sebuah key |
| Cek keberadaan | `EXISTS key [key ...]` | Mengecek apakah key atau key-key tertentu ada |
| Daftar semua key | `KEYS pattern` | Mencari semua key yang cocok dengan pola (hindari di produksi) |
| Scan key | `SCAN kursor [MATCH pattern] [COUNT jumlah]` | Mengiterasi key secara inkremental (aman untuk produksi) |
| Increment | `INCR key` | Menambah nilai integer sebuah key satu per satu |
| Append string | `APPEND key nilai` | Menambahkan nilai ke akhir string |
| Get range | `GETRANGE key awal akhir` | Mendapatkan substring dari string yang tersimpan di key |
| LPUSH | `LPUSH key nilai [nilai ...]` | Menambahkan satu atau lebih nilai di awal list |
| RPUSH | `RPUSH key nilai [nilai ...]` | Menambahkan satu atau lebih nilai di akhir list |
| LPOP | `LPOP key [jumlah]` | Menghapus dan mengembalikan elemen pertama dari list |
| RPOP | `RPOP key [jumlah]` | Menghapus dan mengembalikan elemen terakhir dari list |
| LRANGE | `LRANGE key awal akhir` | Mendapatkan rentang elemen dari list |
| LLEN | `LLEN key` | Mendapatkan panjang list |
| SADD | `SADD key anggota [anggota ...]` | Menambahkan satu atau lebih anggota ke set |
| SMEMBERS | `SMEMBERS key` | Mendapatkan semua anggota dalam set |
| SISMEMBER | `SISMEMBER key anggota` | Mengecek apakah suatu nilai adalah anggota set |
| SINTER | `SINTER key [key ...]` | Irisan (intersect) beberapa set |
| SUNION | `SUNION key [key ...]` | Gabungan (union) beberapa set |
| HSET | `HSET key field nilai [field nilai ...]` | Mengatur beberapa field hash |
| HGET | `HGET key field` | Mendapatkan nilai dari field hash |
| HGETALL | `HGETALL key` | Mendapatkan semua field dan nilai dalam hash |
| HDEL | `HDEL key field [field ...]` | Menghapus satu atau lebih field hash |
| ZADD | `ZADD key [NX\|XX] [GT\|LT] [CH] [INCR] skor anggota [skor anggota ...]` | Menambahkan anggota ke sorted set |
| ZRANGE | `ZRANGE key awal akhir [BYSCORE\|BYLEX] [REV] [LIMIT offset jumlah] [WITHSCORES]` | Mengembalikan rentang anggota dalam sorted set |
| ZINCRBY | `ZINCRBY key increment anggota` | Menambah skor anggota dalam sorted set |
| ZREVRANK | `ZREVRANK key anggota` | Menentukan indeks anggota dalam sorted set (skor tertinggi ke terendah) |
| ZSCORE | `ZSCORE key anggota` | Mendapatkan skor yang terkait dengan anggota |
| PUBLISH | `PUBLISH channel pesan` | Mengirim pesan ke saluran |
| SUBSCRIBE | `SUBSCRIBE channel [channel ...]` | Mendengarkan pesan yang dipublikasikan ke saluran |
| MULTI | `MULTI` | Menandai awal blok transaksi |
| EXEC | `EXEC` | Mengeksekusi semua perintah yang dikeluarkan setelah MULTI |
| WATCH | `WATCH key [key ...]` | Mengawasi key untuk perubahan sebelum mengeksekusi transaksi |
| INFO | `INFO [bagian]` | Mendapatkan informasi dan statistik server |
| CLIENT LIST | `CLIENT LIST` | Mendapatkan daftar koneksi klien |
| SLOWLOG GET | `SLOWLOG GET [jumlah]` | Mendapatkan entri slow log |
| MONITOR | `MONITOR` | Memantau semua perintah Redis secara real-time |
| CONFIG GET | `CONFIG GET parameter` | Mendapatkan nilai parameter konfigurasi |
| CONFIG SET | `CONFIG SET parameter nilai` | Mengatur parameter konfigurasi |
| SAVE | `SAVE` | Menyimpan dataset ke disk secara sinkron (RDB) |
| BGSAVE | `BGSAVE` | Menyimpan dataset ke disk secara asinkron (RDB) di latar belakang |
| AUTH | `AUTH password` | Otentikasi ke server dengan password |
| ACL SETUSER | `ACL SETUSER username [aturan]` | Membuat atau memodifikasi pengguna ACL |
| FLUSHALL | `FLUSHALL [ASYNC\|SYNC]` | Menghapus semua key dari semua database |
| SELECT | `SELECT indeks` | Mengubah database yang dipilih untuk koneksi saat ini |
| TTL | `TTL key` | Mendapatkan sisa waktu hidup (time-to-live) sebuah key |
| TYPE | `TYPE key` | Menentukan tipe nilai yang tersimpan di key |
| RENAME | `RENAME key keybaru` | Mengganti nama key |

## Perintah Umum

### Operasi String

```bash
# Set dan get dasar
SET user:1 "Alice"
GET user:1
# => "Alice"

# Set dengan kadaluwarsa (10 detik)
SET session:token "abc123" EX 10

# Set hanya jika key belum ada
SET coupon:summer "DISCOUNT20" NX

# Increment atomik
INCR page:views
INCRBY page:views 5
DECR counter
DECRBY counter 3

# Get dan set secara atomik
GETSET user:1 "Bob"
# Mengembalikan nilai lama, mengatur nilai baru

# Multiple keys
MSET key1 "value1" key2 "value2"
MGET key1 key2
# => 1) "value1"
#    2) "value2"

# Panjang string dan rentang
STRLEN user:1
GETRANGE user:1 0 3
# => "Alic"
```

### Operasi List

```bash
# Pola antrean (FIFO) — RPUSH + LPOP
RPUSH queue "task1"
RPUSH queue "task2"
LPOP queue
# => "task1"

# Pola stack (LIFO) — LPUSH + LPOP
LPUSH stack "item1"
LPUSH stack "item2"
LPOP stack
# => "item2"

# Ambil rentang tanpa menghapus
LRANGE queue 0 -1
# => 1) "task2"

# Potong list ke rentang tertentu
LTRIM queue 0 99
# Menyimpan hanya 100 elemen pertama

# Blocking pop — menunggu elemen
BRPOP queue 5
# Blokir hingga 5 detik

# Panjang list
LLEN queue
```

### Operasi Set

```bash
# Tambah dan ambil anggota
SADD tags:post:42 "redis"
SADD tags:post:42 "database"
SADD tags:post:42 "cache"
SMEMBERS tags:post:42
# => 1) "redis"
#    2) "database"
#    3) "cache"

# Cek keanggotaan
SISMEMBER tags:post:42 "redis"
# => (integer) 1

# Operasi set
SADD set:a 1 2 3 4
SADD set:b 3 4 5 6
SINTER set:a set:b
# => 1) "3"
#    2) "4"

SUNION set:a set:b
# => 1) "1" 2) "2" 3) "3" 4) "4" 5) "5" 6) "6"

SDIFF set:a set:b
# => 1) "1" 2) "2"

# Anggota acak — berguna untuk sampling
SRANDMEMBER tags:post:42 2
SPOP tags:post:42 1
```

### Operasi Hash

```bash
# Menyimpan objek
HSET user:100 name "Alice" email "alice@example.com" age 30
HSET user:100 city "Jakarta"

# Mendapatkan field
HGET user:100 name
# => "Alice"

HGETALL user:100
# => 1) "name"
#    2) "Alice"
#    3) "email"
#    4) "alice@example.com"
#    5) "age"
#    6) "30"
#    7) "city"
#    8) "Jakarta"

# Mendapatkan beberapa field
HMGET user:100 name email
# => 1) "Alice"
#    2) "alice@example.com"

# Cek keberadaan field
HEXISTS user:100 phone

# Increment field numerik
HINCRBY user:100 age 1

# Dapatkan semua nama field atau nilai
HKEYS user:100
HVALS user:100

# Hapus field
HDEL user:100 phone

# Panjang hash
HLEN user:100
```

### Operasi Sorted Set

```bash
# Papan peringkat: tambah pemain dengan skor
ZADD leaderboard 1500 "player1"
ZADD leaderboard 2200 "player2"
ZADD leaderboard 1800 "player3"
ZADD leaderboard 1950 "player4"

# Ambil 3 teratas (skor tertinggi)
ZREVRANGE leaderboard 0 2 WITHSCORES
# => 1) "player2"
#    2) "2200"
#    3) "player4"
#    4) "1950"
#    5) "player3"
#    6) "1800"

# Dapatkan peringkat pemain (0-based, tinggi ke rendah)
ZREVRANK leaderboard "player1"
# => 3

# Dapatkan skor pemain
ZSCORE leaderboard "player1"
# => "1500"

# Increment skor
ZINCRBY leaderboard 50 "player1"

# Dapatkan rentang berdasarkan skor
ZRANGEBYSCORE leaderboard 1500 2000 WITHSCORES
# => anggota dengan skor antara 1500 dan 2000

# Hitung anggota dalam rentang skor
ZCOUNT leaderboard 1500 2000

# Hapus anggota
ZREM leaderboard "player3"

# Dapatkan kardinalitas set
ZCARD leaderboard
```

### Administrasi Server

```bash
# Informasi server Redis
INFO server
INFO memory
INFO keyspace
INFO stats
INFO persistence

# Cek slow log (query > 10ms secara default)
SLOWLOG GET 5
SLOWLOG RESET

# Daftar klien yang terhubung
CLIENT LIST

# Matikan koneksi klien
CLIENT KILL addr 127.0.0.1:6379

# Konfigurasi
CONFIG GET maxmemory
CONFIG SET maxmemory 512mb
CONFIG GET timeout
CONFIG GET databases

# Pantau semua perintah (❗ peringatan produksi — berat)
# MONITOR
# Kemudian Ctrl+C untuk keluar

# Administrasi persistensi
BGSAVE
LASTSAVE
# Cek apakah penyimpanan RDB berhasil
INFO persistence

# Hapus semua data
FLUSHALL ASYNC
```

## Potongan Kode

### ioredis — Setup Klien Node.js

```javascript
const Redis = require('ioredis');

// Koneksi dasar
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'opsional-password',
  db: 0,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3
});

// Event koneksi
redis.on('connect', () => console.log('Terhubung ke Redis'));
redis.on('error', (err) => console.error('Error Redis:', err));
redis.on('ready', () => console.log('Redis siap'));
redis.on('close', () => console.log('Koneksi Redis ditutup'));

// Setup Sentinel untuk ketersediaan tinggi
const sentinel = new Redis({
  sentinels: [
    { host: 'sentinel1', port: 26379 },
    { host: 'sentinel2', port: 26379 }
  ],
  name: 'mymaster',
  role: 'master'
});

// Setup Cluster
const cluster = new Redis.Cluster([
  { host: '127.0.0.1', port: 7000 },
  { host: '127.0.0.1', port: 7001 }
], {
  scaleReads: 'slave',
  clusterRetryStrategy: (times) => Math.min(times * 100, 3000)
});
```

### ioredis — Operasi CRUD dan Tipe Data

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Operasi String
async function stringOps() {
  await redis.set('user:1:name', 'Alice');
  await redis.setex('session:abc', 3600, 'active');
  const name = await redis.get('user:1:name');
  const exists = await redis.exists('user:1:name');
  const ttl = await redis.ttl('session:abc');
  await redis.del('user:1:name');
}

// Operasi List
async function listOps() {
  await redis.rpush('notifications', 'msg1', 'msg2');
  await redis.lpush('notifications', 'urgent-msg');
  const count = await redis.llen('notifications');
  const first = await redis.lpop('notifications');
  const all = await redis.lrange('notifications', 0, -1);
}

// Operasi Set
async function setOps() {
  await redis.sadd('tags:post:1', 'redis', 'database');
  const members = await redis.smembers('tags:post:1');
  const isMember = await redis.sismember('tags:post:1', 'redis');
  const intersection = await redis.sinter('tags:post:1', 'tags:post:2');
}

// Operasi Hash
async function hashOps() {
  await redis.hset('user:100', {
    name: 'Alice',
    email: 'alice@example.com',
    age: 30
  });
  const user = await redis.hgetall('user:100');
  const name = await redis.hget('user:100', 'name');
  const fields = await redis.hmget('user:100', 'name', 'email');
}

// Operasi Sorted Set
async function sortedSetOps() {
  await redis.zadd('leaderboard', 1500, 'player1', 2200, 'player2');
  const top3 = await redis.zrevrange('leaderboard', 0, 2, 'WITHSCORES');
  const rank = await redis.zrevrank('leaderboard', 'player1');
  const score = await redis.zscore('leaderboard', 'player1');
}
```

### Pola Pub/Sub

```javascript
const Redis = require('ioredis');

// Publisher
const publisher = new Redis();

async function publishMessage() {
  await publisher.publish('notifications', JSON.stringify({
    type: 'user_signup',
    userId: 42,
    timestamp: Date.now()
  }));
}

// Subscriber (disarankan koneksi terpisah)
const subscriber = new Redis();

subscriber.subscribe('notifications', 'system:alerts');

subscriber.on('message', (channel, message) => {
  console.log(`Diterima di ${channel}:`, JSON.parse(message));
});

// Pola langganan (mendukung pola glob-style)
subscriber.psubscribe('orders:*');

subscriber.on('pmessage', (pattern, channel, message) => {
  console.log(`Pola ${pattern} cocok di ${channel}:`, message);
});
```

### Pipeline dan Batching

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Pipeline — perintah di-buffer dan dikirim dalam satu round trip
async function pipelineExample() {
  const pipeline = redis.pipeline();

  pipeline.set('key1', 'value1');
  pipeline.set('key2', 'value2');
  pipeline.get('key1');
  pipeline.incr('counter');
  pipeline.expire('key1', 3600);

  const results = await pipeline.exec();
  // results => [[null, 'OK'], [null, 'OK'], [null, 'value1'], [null, 1], [null, 1]]
  results.forEach(([err, result], idx) => {
    if (err) console.error(`Perintah ${idx} gagal:`, err);
    else console.log(`Perintah ${idx}:`, result);
  });
}

// Auto-pipeline: ioredis mengelompokkan perintah secara otomatis
// dalam tick event loop yang sama
// Berguna untuk operasi batch tanpa manajemen pipeline eksplisit
```

### Transaksi (MULTI/EXEC)

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Optimistic locking dengan WATCH
async function transferFunds(fromId, toId, amount) {
  const result = await redis.watch(`account:${fromId}`, `account:${toId}`);
  if (result !== 'OK') throw new Error('Watch gagal');

  const fromBalance = parseInt(await redis.get(`account:${fromId}`) || '0');
  const toBalance = parseInt(await redis.get(`account:${toId}`) || '0');

  if (fromBalance < amount) {
    await redis.unwatch();
    throw new Error('Saldo tidak mencukupi');
  }

  const multi = redis.multi();
  multi.set(`account:${fromId}`, fromBalance - amount);
  multi.set(`account:${toId}`, toBalance + amount);

  const execResults = await multi.exec();
  // execResults bernilai null jika WATCH mendeteksi modifikasi
  if (execResults === null) {
    throw new Error('Transaksi gagal karena modifikasi konkuren, coba lagi');
  }
  return execResults;
}

// Transaksi dasar tanpa WATCH
async function updateScore() {
  const [err, score] = await redis
    .multi()
    .incr('player:score')
    .get('player:score')
    .exec();

  console.log('Skor baru:', score);
}
```

### Lua Scripting

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Mendefinisikan skrip Lua untuk operasi atomik
const transferScript = `
  local fromKey = KEYS[1]
  local toKey = KEYS[2]
  local amount = tonumber(ARGV[1])

  local fromBalance = tonumber(redis.call('GET', fromKey) or '0')
  if fromBalance < amount then
    return redis.error_reply('Saldo tidak mencukupi')
  end

  redis.call('DECRBY', fromKey, amount)
  redis.call('INCRBY', toKey, amount)
  return { fromBalance - amount, tonumber(redis.call('GET', toKey) or '0') + amount }
`;

// Load skrip (EVALSHA pada panggilan berikutnya)
async function runLuaTransfer() {
  const result = await redis.eval(transferScript, 2, 'account:1', 'account:2', 100);
  console.log('Hasil transfer:', result);
}

// Rate limiting dengan skrip Lua (atomik, tanpa race condition)
const rateLimitScript = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local now = redis.call('TIME')[1]

  redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
  local count = redis.call('ZCARD', key)

  if count >= limit then
    return { 0, tonumber(redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')[2]) + window - now }
  end

  redis.call('ZADD', key, now, now .. ':' .. math.random(1e12))
  redis.call('EXPIRE', key, window)
  return { 1, limit - count - 1 }
`;

async function checkRateLimit(userId) {
  const [allowed, retryAfter] = await redis.eval(
    rateLimitScript, 1, `ratelimit:${userId}`, 100, 60
  );
  if (!allowed) {
    console.log(`Batas rate terlampaui, coba lagi setelah ${retryAfter}s`);
    return false;
  }
  return true;
}
```

### Papan Peringkat Sorted Set

```javascript
const Redis = require('ioredis');
const redis = new Redis();

const LEADERBOARD_KEY = 'game:leaderboard';

// Submit skor
async function submitScore(playerId, score) {
  await redis.zadd(LEADERBOARD_KEY, score, playerId);
}

// Ambil N pemain teratas
async function getTopPlayers(count = 10) {
  const results = await redis.zrevrange(
    LEADERBOARD_KEY, 0, count - 1, 'WITHSCORES'
  );
  // Results: ['player1', '2200', 'player2', '1950', ...]
  const players = [];
  for (let i = 0; i < results.length; i += 2) {
    players.push({
      id: results[i],
      score: parseInt(results[i + 1]),
      rank: await redis.zrevrank(LEADERBOARD_KEY, results[i])
    });
  }
  return players;
}

// Dapatkan peringkat dan skor pemain
async function getPlayerStats(playerId) {
  const [rank, score] = await Promise.all([
    redis.zrevrank(LEADERBOARD_KEY, playerId),
    redis.zscore(LEADERBOARD_KEY, playerId)
  ]);
  return {
    rank: rank !== null ? rank + 1 : null,
    score: score ? parseInt(score) : 0
  };
}

// Dapatkan pemain di sekitar pemain tertentu (untuk pagination)
async function getNeighborhood(playerId, radius = 3) {
  const rank = await redis.zrevrank(LEADERBOARD_KEY, playerId);
  if (rank === null) return [];

  const start = Math.max(0, rank - radius);
  const end = rank + radius;
  return await redis.zrevrange(LEADERBOARD_KEY, start, end, 'WITHSCORES');
}
```

### Pola Rate Limiting

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Sliding window rate limiter (berbasis sorted set)
class SlidingWindowRateLimiter {
  constructor(limit, windowSeconds, prefix = 'ratelimit') {
    this.limit = limit;
    this.window = windowSeconds * 1000;
    this.prefix = prefix;
  }

  async isAllowed(key) {
    const now = Date.now();
    const windowKey = `${this.prefix}:${key}`;

    // Hapus entri di luar jendela
    await redis.zremrangebyscore(windowKey, 0, now - this.window);

    // Hitung entri yang tersisa
    const count = await redis.zcard(windowKey);

    if (count >= this.limit) {
      return { allowed: false, remaining: 0 };
    }

    // Tambahkan timestamp permintaan saat ini
    await redis.zadd(windowKey, now, `${now}:${Math.random()}`);
    await redis.pexpire(windowKey, this.window);
    return { allowed: true, remaining: this.limit - count - 1 };
  }
}

// Token bucket rate limiter (berbasis string)
class TokenBucketRateLimiter {
  constructor(capacity, refillRate, refillIntervalMs = 1000) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillInterval = refillIntervalMs;
  }

  async consume(key, tokens = 1) {
    const now = Date.now();
    const bucketKey = `${key}:bucket`;
    const timeKey = `${key}:time`;

    // Skrip Lua untuk token bucket atomik
    const script = `
      local bucketKey = KEYS[1]
      local timeKey = KEYS[2]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local refillInterval = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])
      local tokens = tonumber(ARGV[5])

      local lastRefill = tonumber(redis.call('GET', timeKey) or '0')
      local bucket = tonumber(redis.call('GET', bucketKey) or capacity)

      if lastRefill == 0 then
        lastRefill = now
      end

      local elapsed = now - lastRefill
      local refillCycles = math.floor(elapsed / refillInterval)
      bucket = math.min(capacity, bucket + (refillCycles * refillRate))

      if bucket >= tokens then
        bucket = bucket - tokens
        redis.call('SET', bucketKey, bucket)
        redis.call('SET', timeKey, now)
        return { 1, bucket }
      else
        redis.call('SET', bucketKey, bucket)
        redis.call('SET', timeKey, now)
        return { 0, bucket }
      end
    `;

    const [allowed, remaining] = await redis.eval(
      script, 2, bucketKey, timeKey,
      this.capacity, this.refillRate, this.refillInterval, now, tokens
    );

    return { allowed: allowed === 1, remaining };
  }
}

// Fixed window rate limiter (pendekatan paling sederhana)
class FixedWindowRateLimiter {
  constructor(limit, windowSeconds) {
    this.limit = limit;
    this.window = windowSeconds;
  }

  async isAllowed(key) {
    const windowKey = `fixed:${key}:${Math.floor(Date.now() / 1000 / this.window)}`;
    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, this.window);
    }
    return count <= this.limit ? { allowed: true, remaining: this.limit - count } : { allowed: false, remaining: 0 };
  }
}
```

### Strategi Invalidasi Cache

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Cache-aside (lazy loading) dengan TTL
async function getCachedData(key, fetchFn, ttlSeconds = 300) {
  const cached = await redis.get(key);
  if (cached !== null) {
    return JSON.parse(cached);
  }

  const data = await fetchFn();
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}

// Write-through cache
async function setWithCache(key, data, ttlSeconds = 300) {
  // Tulis ke database terlebih dahulu (dihilangkan untuk singkatnya)
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
}

// Invalidasi cache berdasarkan pola
async function invalidateByPattern(pattern) {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    cursor = nextCursor;
  } while (cursor !== '0');
}

// Pola stale-while-revalidate
async function getWithStaleRevalidate(key, fetchFn, ttlSeconds = 300, staleTtlSeconds = 60) {
  const cached = await redis.get(key);

  if (cached !== null) {
    const parsed = JSON.parse(cached);
    if (parsed.stale === undefined) {
      return parsed;
    }
    // Kembalikan data basi dan picu refresh asinkron
    if (parsed.stale < Date.now()) {
      setImmediate(async () => {
        try {
          const freshData = await fetchFn();
          await redis.setex(key, ttlSeconds, JSON.stringify(freshData));
        } catch (err) {
          console.error('Refresh latar belakang gagal:', err);
        }
      });
    }
    return parsed;
  }

  // Cache miss — ambil data segar
  const data = await fetchFn();
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}

// Invalidasi cache berbasis tag
async function tagCache(key, tags) {
  const tagKeys = tags.map(tag => `tag:${tag}`);
  await redis.sadd(...tagKeys, key);
}

async function invalidateByTag(tag) {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    await redis.del(...keys);
    await redis.del(`tag:${tag}`);
  }
}
```

### Redis Stack: JSON, Search, TimeSeries

```javascript
const Redis = require('ioredis');

// RedisJSON — menyimpan dan mencari dokumen JSON
async function redisJsonExample(redis) {
  // Set dokumen JSON
  await redis.call('JSON.SET', 'product:1', '$', JSON.stringify({
    id: 1,
    name: 'Wireless Mouse',
    price: 29.99,
    specs: { color: 'black', dpi: 1600 }
  }));

  // Ambil seluruh dokumen
  const product = JSON.parse(await redis.call('JSON.GET', 'product:1', '$'));

  // Ambil nilai bersarang
  const price = JSON.parse(await redis.call('JSON.GET', 'product:1', '$.price'));

  // Perbarui nilai bersarang
  await redis.call('JSON.SET', 'product:1', '$.price', '24.99');

  // Increment nilai
  await redis.call('JSON.NUMINCRBY', 'product:1', '$.price', 5);
}

// RediSearch — pencarian teks lengkap dan indeks sekunder
async function redisSearchExample(redis) {
  // Buat indeks
  try {
    await redis.call('FT.CREATE', 'idx:products', 'ON', 'JSON', 'PREFIX', '1', 'product:',
      'SCHEMA', '$.name', 'AS', 'name', 'TEXT',
      '$.price', 'AS', 'price', 'NUMERIC',
      '$.specs.color', 'AS', 'color', 'TAG'
    );
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  }

  // Pencarian
  const results = await redis.call('FT.SEARCH', 'idx:products',
    '@name:(mouse) @price:[10 50]', 'LIMIT', 0, 10
  );

  // Agregasi
  const aggResults = await redis.call('FT.AGGREGATE', 'idx:products',
    '*', 'GROUPBY', '1', '@color', 'REDUCE', 'AVG', '1', '@price', 'AS', 'avg_price'
  );
}

// RedisTimeSeries — data deret waktu
async function redisTimeSeriesExample(redis) {
  // Buat time-series
  try {
    await redis.call('TS.CREATE', 'ts:sensor:temp', 'LABELS', 'sensor', 'temp', 'room', 'server');
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  }

  // Tambah sampel
  await redis.call('TS.ADD', 'ts:sensor:temp', '*', 23.5);
  await redis.call('TS.ADD', 'ts:sensor:temp', '*', 24.1);

  // Query rentang
  const range = await redis.call('TS.RANGE', 'ts:sensor:temp', '-', '+');
  // range => [[timestamp1, 23.5], [timestamp2, 24.1]]

  // Query agregasi
  const avg = await redis.call('TS.RANGE', 'ts:sensor:temp', '-', '+',
    'AGGREGATION', 'AVG', 60000
  );
}

// Penggunaan
const redis = new Redis();
redisJsonExample(redis).catch(console.error);
redisSearchExample(redis).catch(console.error);
redisTimeSeriesExample(redis).catch(console.error);
```

### Perintah ACL dan Keamanan

```bash
# Otentikasi berbasis ACL Redis 6+

# Buat pengguna baru dengan izin terbatas
ACL SETUSER reader on >readonly-pass ~* +@read

# Buat pengguna dengan akses baca/tulis ke pola key tertentu
ACL SETUSER writer on >write-pass ~users:* ~sessions:* +@write +@read -@dangerous

# Buat pengguna dengan akses penuh
ACL SETUSER admin on >admin-pass ~* +@all

# Daftar semua pengguna
ACL LIST

# Dapatkan informasi pengguna
ACL GETUSER reader

# Hapus pengguna
ACL DELUSER reader

# Cek pengguna saat ini
ACL WHOAMI

# Generate password acak
ACL GENPASS

# Set password pengguna default (legacy AUTH)
CONFIG SET requirepass "password-kuat-saya"

# Catat semua percobaan otentikasi gagal
ACL LOG
ACL LOG RESET
```

### Konfigurasi Persistensi

```bash
# RDB (Redis Database Backup) — snapshot point-in-time
# Konfigurasi di redis.conf:
#   save 900 1       # Simpan jika setidaknya 1 key berubah dalam 900 detik
#   save 300 10      # Simpan jika setidaknya 10 key berubah dalam 300 detik
#   save 60 10000    # Simpan jika setidaknya 10000 key berubah dalam 60 detik
#   dbfilename dump.rdb
#   dir /var/lib/redis

# AOF (Append-Only File) — mencatat setiap operasi tulis
# Konfigurasi di redis.conf:
#   appendonly yes
#   appendfilename "appendonly.aof"
#   appendfsync everysec   # kebijakan fsync: always | everysec | no
#   auto-aof-rewrite-percentage 100
#   auto-aof-rewrite-min-size 64mb

# AOF rewrite (compact)
BGREWRITEAOF

# Cek mode persistensi yang aktif
INFO persistence

# Beralih mode saat runtime
CONFIG SET appendonly yes
CONFIG SET save ""

# Persistensi hibrida (RDB + AOF) — Redis 5+: AOF rewrite menghasilkan preamble RDB
# Ini menggabungkan kecepatan snapshot RDB dengan ketahanan AOF
```

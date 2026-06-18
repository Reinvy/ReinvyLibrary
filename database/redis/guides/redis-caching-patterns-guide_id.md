---
title: "Panduan Pola dan Strategi Caching Redis"
description: "Panduan komprehensif tentang pola caching Redis termasuk cache-aside, write-through, write-behind, read-through, strategi invalidasi cache, caching terdistribusi, pencegahan cache stampede, dan praktik terbaik produksi dengan ioredis dan Node.js."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Pola dan Strategi Caching Redis

## Pendahuluan

Caching adalah salah satu teknik optimasi performa paling berdampak dalam arsitektur aplikasi modern. Redis, dengan latensi sub-milidetik, dukungan struktur data yang kaya, dan kebijakan eviction bawaan, telah menjadi lapisan caching de facto untuk sistem terdistribusi. Namun, caching yang efektif membutuhkan lebih dari sekadar menyimpan pasangan kunci-nilai — ia memerlukan pemilihan pola caching, strategi invalidasi, format serialisasi, dan praktik operasional yang cermat.

Panduan ini mengeksplorasi pola dan strategi caching Redis yang telah teruji di lapangan: dari arsitektur fundamental seperti cache-aside dan write-through hingga topik lanjutan seperti pencegahan cache stampede, caching terdistribusi dengan Redis Cluster, dan keamanan produksi. Baik Anda membangun REST API, papan peringkat real-time, atau sistem rate limiting, pola-pola yang dibahas di sini akan membantu Anda merancang lapisan caching yang kokoh, berperforma tinggi, dan mudah dipelihara.

## Praktik Terbaik

### 1. Pilih Pola Caching yang Tepat untuk Beban Kerja Anda

Pola akses yang berbeda membutuhkan strategi caching yang berbeda:

- **Cache-Aside (Lazy Loading)**: Terbaik untuk beban kerja berat-baca dengan penulisan yang jarang. Kode aplikasi memeriksa cache terlebih dahulu dan fallback ke database saat cache tidak ditemukan. Sederhana diimplementasikan dan tangguh terhadap kegagalan cache.
- **Read-Through**: Lapisan cache sendiri menangani fallback database secara transparan. Mengurangi boilerplate dalam kode aplikasi tetapi membutuhkan pustaka cache yang mendukung pola ini.
- **Write-Through**: Setiap penulisan melewati cache ke database. Memastikan konsistensi yang kuat antara cache dan database dengan konsekuensi peningkatan latensi penulisan.
- **Write-Behind (Write-Back)**: Penulisan diakui segera dan secara asinkron dipersist ke database. Menawarkan performa penulisan terbaik tetapi memperkenalkan risiko kehilangan data jika cache gagal.

```javascript
// Contoh Pola Cache-Aside dengan ioredis
const Redis = require('ioredis');
const redis = new Redis();

async function getUser(userId) {
  const cacheKey = `user:${userId}`;

  // 1. Periksa cache terlebih dahulu
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache tidak ditemukan — ambil dari database
  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return null;

  // 3. Isi cache dengan TTL
  await redis.setex(cacheKey, 3600, JSON.stringify(user));
  return user;
}
```

### 2. Implementasikan Stale-While-Revalidate untuk Ketangguhan

Stale-while-revalidate adalah strategi caching yang menyajikan data basi sambil menyegarkan cache secara asinkron di latar belakang. Ini mencegah badai cache miss dan memberikan ketangguhan terhadap kegagalan upstream.

```javascript
async function getProduct(productId) {
  const cacheKey = `product:${productId}`;
  const staleKey = `product:${productId}:stale`;

  // Coba cache segar terlebih dahulu
  const fresh = await redis.get(cacheKey);
  if (fresh !== null) {
    return JSON.parse(fresh);
  }

  // Coba cache basi
  const stale = await redis.get(staleKey);
  if (stale !== null) {
    // Picu refresh asinkron tanpa menunggu
    refreshProductCache(productId).catch(err =>
      console.error('Gagal refresh latar belakang:', err)
    );
    return JSON.parse(stale);
  }

  // Miss total — ambil secara sinkron
  return refreshProductCache(productId);
}
```

### 3. Adopsi Strategi Invalidasi Cache yang Eksplisit

Invalidasi cache adalah salah satu masalah tersulit dalam ilmu komputer. Gunakan kombinasi strategi berikut:

- **Kadaluarsa Berbasis TTL**: Pendekatan paling sederhana dan terpercaya. Tetapkan TTL yang sesuai berdasarkan volatilitas data. Gunakan perintah `SETEX` atau `EXPIRE`.
- **Invalidasi Berbasis Event**: Gunakan Redis Pub/Sub untuk menyiarkan event invalidasi saat data berubah. Ini memastikan semua instance aplikasi melakukan invalidasi cache secara simultan.
- **Penghapusan Eksplisit**: Hapus atau perbarui entri cache secara langsung saat data yang mendasarinya berubah. Gunakan `DEL`, `UNLINK`, atau `SET` dengan kunci yang sama.

```javascript
// Invalidasi cache berbasis event dengan Pub/Sub
const subscriber = new Redis();
const publisher = new Redis();

// Berlangganan ke channel invalidasi
subscriber.subscribe('cache:invalidate');
subscriber.on('message', (channel, message) => {
  const { key } = JSON.parse(message);
  redis.del(key).catch(console.error);
});

// Publikasikan invalidasi saat data berubah
async function updateUser(userId, data) {
  await db.query('UPDATE users SET ... WHERE id = ?', [data, userId]);
  const cacheKey = `user:${userId}`;
  await publisher.publish('cache:invalidate', JSON.stringify({ key: cacheKey }));
}
```

### 4. Cegah Cache Stampede dengan Mutex dan Probabilistic Early Expiration

Cache stampede (atau thundering herd) terjadi ketika banyak permintaan secara simultan memicu cache miss dan semuanya mencoba meregenerasi nilai cache yang sama. Mitigasi dengan:

- **Mutex Locking**: Hanya satu permintaan yang meregenerasi cache; yang lain menunggu atau dilayani dengan data basi.
- **Probabilistic Early Expiration**: Secara acak mengkadaluarsakan entri cache sebelum TTL aktualnya untuk menyebarkan beban regenerasi.

```javascript
// Pencegahan cache stampede berbasis Mutex
async function getExpensiveData(key, ttl = 300) {
  const lockKey = `lock:${key}`;
  const lockTTL = 10; // detik

  const cached = await redis.get(key);
  if (cached !== null) {
    return JSON.parse(cached);
  }

  // Coba akuisisi lock
  const lockAcquired = await redis.set(lockKey, '1', 'EX', lockTTL, 'NX');
  if (!lockAcquired) {
    // Permintaan lain sedang meregenerasi — tunggu sebentar dan coba lagi
    await new Promise(resolve => setTimeout(resolve, 100));
    const retryCached = await redis.get(key);
    if (retryCached) return JSON.parse(retryCached);
    throw new Error('Regenerasi cache sedang berlangsung, coba lagi');
  }

  try {
    const data = await expensiveComputation();
    await redis.setex(key, ttl, JSON.stringify(data));
    return data;
  } finally {
    await redis.del(lockKey);
  }
}
```

```javascript
// Probabilistic Early Expiration (Algoritma XFetch)
function shouldRecompute(ttl, beta = 1.0) {
  const now = Date.now() / 1000;
  const age = now - (ttl - (ttl | 0));
  const remaining = ttl - age;
  const chance = Math.random() * beta * Math.log(1 + Math.random());
  return remaining <= chance * ttl;
}
```

### 5. Pilih Format Serialisasi yang Tepat

Serialisasi berdampak pada performa dan penggunaan memori:

- **JSON**: Dapat dibaca manusia, didukung secara universal, tetapi lebih lambat diurai dan lebih intensif memori. Terbaik untuk interoperabilitas.
- **MessagePack**: Alternatif biner JSON. Serialisasi/deserialisasi lebih cepat dan ukuran payload ~30% lebih kecil dari JSON. Gunakan pustaka `msgpackr` atau `@msgpack/msgpack`.
- **Protocol Buffers**: Sangat bertipe, berbasis skema, ukuran payload terkecil. Terbaik untuk sistem throughput tinggi dengan skema yang stabil. Gunakan `protobufjs` atau kompiler resmi Google.

```javascript
// Perbandingan format serialisasi dengan ioredis
const msgpack = require('msgpackr');

const data = { id: 1, name: 'Alice', roles: ['admin', 'editor'] };

// JSON: ~58 byte
await redis.set('user:1', JSON.stringify(data));

// MessagePack: ~41 byte (~30% lebih kecil)
await redis.set(Buffer.from('user:1'), msgpack.encode(data));
// Baca kembali
const raw = await redis.getBuffer(Buffer.from('user:1'));
const decoded = msgpack.decode(raw);
```

### 6. Kelola Memori secara Efektif dengan Kebijakan Eviction

Kebijakan eviction Redis menentukan bagaimana kunci dihapus ketika `maxmemory` tercapai:

- **`allkeys-lru`** (paling umum): Menghapus kunci yang paling jarang digunakan secara terbaru di semua kunci. Kebijakan tujuan umum terbaik untuk caching.
- **`allkeys-lfu`**: Menghapus kunci yang paling jarang digunakan secara frekuensi. Lebih baik ketika pola akses stabil dan beberapa kunci bersifat "panas."
- **`volatile-ttl`**: Menghapus kunci dengan TTL tersisa terpendek. Cocok ketika TTL ditetapkan secara eksplisit pada semua kunci cache.
- **`noeviction`**: Mengembalikan error pada penulisan ketika memori penuh. Gunakan hanya untuk data yang tidak boleh dieviction.

```bash
# Konfigurasi maxmemory dan kebijakan eviction
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

```javascript
// Pantau penggunaan memori secara programatis
const info = await redis.info('memory');
console.log(info);
// Parse used_memory_human, maxmemory, dll.
```

### 7. Amankan Cache Redis Anda

Keamanan sering diabaikan dalam lapisan caching:

- **Enkripsi TLS**: Selalu aktifkan TLS untuk koneksi Redis di produksi, terutama saat melewati jaringan yang tidak tepercaya.
- **AUTH Password**: Gunakan kata sandi yang kuat dan unik dengan arahan `REQUIREPASS`.
- **Aturan ACL** (Redis 6+): Buat izin pengguna granular dengan set perintah dan pola kunci yang dibatasi.

```javascript
// Koneksi ioredis yang aman dengan TLS dan AUTH
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6380,
  password: process.env.REDIS_PASSWORD,
  tls: {
    key: fs.readFileSync('client.key'),
    cert: fs.readFileSync('client.crt'),
    ca: [fs.readFileSync('ca.crt')]
  },
  enableAutoPipelining: true,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});
```

### 8. Pantau Performa Cache dengan Metrik Hit Rate

Lacak efisiensi cache untuk menyetel strategi Anda:

```javascript
async function getWithMetrics(key, fetchFn) {
  const cached = await redis.get(key);
  if (cached !== null) {
    await redis.incr('metrics:cache:hits');
    return JSON.parse(cached);
  }

  await redis.incr('metrics:cache:misses');
  const data = await fetchFn();
  await redis.setex(key, 3600, JSON.stringify(data));

  // Catat hit rate secara periodik
  const hits = parseInt(await redis.get('metrics:cache:hits') || '0');
  const misses = parseInt(await redis.get('metrics:cache:misses') || '0');
  const total = hits + misses;
  if (total > 0 && total % 100 === 0) {
    console.log(`Cache hit rate: ${((hits / total) * 100).toFixed(1)}%`);
  }

  return data;
}
```

### 9. Gunakan Connection Pooling dan Strategi Retry dengan ioredis

Manajemen koneksi yang efisien sangat penting untuk penggunaan Redis di produksi:

```javascript
const Redis = require('ioredis');

// Koneksi Cluster dengan retry dan backoff
const cluster = new Redis.Cluster([
  { host: '127.0.0.1', port: 7000 },
  { host: '127.0.0.1', port: 7001 },
  { host: '127.0.0.1', port: 7002 }
], {
  clusterRetryStrategy: (times) => Math.min(times * 100, 3000),
  redisOptions: {
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 5) return null; // Menyerah
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true
  }
});

// Penanganan error yang baik
cluster.on('error', (err) => {
  console.error('Redis Cluster error:', err.message);
});

cluster.on('node error', (err, node) => {
  console.error(`Node ${node} error:`, err.message);
});
```

## Langkah Implementasi

### Langkah 1: Nilai Kebutuhan Caching Anda

Sebelum menulis kode apa pun, analisis pola akses data aplikasi Anda:

1. **Profil rasio baca/tulis**: Gunakan logging aplikasi atau alat APM untuk mengidentifikasi kueri mana yang paling sering dan mahal.
2. **Identifikasi data yang dapat di-cache**: Tidak semua data mendapat manfaat dari caching. Prioritaskan:
   - Data yang sering dibaca, jarang diperbarui (misalnya, katalog produk, konfigurasi)
   - Hasil yang mahal secara komputasi (misalnya, laporan agregat, rekomendasi)
   - Data sesi dengan TTL pendek
3. **Tentukan kebutuhan konsistensi**: Bisakah aplikasi Anda mentolerir pembacaan basi? Jika ya, cache-aside dengan TTL sudah cukup. Jika konsistensi ketat diperlukan, pertimbangkan write-through atau invalidasi berbasis event.
4. **Ukur instance Redis Anda**: Perkirakan ukuran total dataset dan pilih `maxmemory` yang sesuai. Perhitungkan overhead serialisasi Redis (biasanya 1,5x–2x ukuran data mentah).

### Langkah 2: Rancang Arsitektur Lapisan Caching

Tata letak infrastruktur caching Anda:

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Aplikasi    │────▶│   Redis     │────▶│  Database   │
│ (Node.js)    │     │   Cache     │     │  (Utama)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │            ┌──────┴──────┐
       │            │   Redis     │
       └────────────│   Cluster   │ (opsional)
                    │ (sharding)  │
                    └─────────────┘
```

Untuk sebagian besar aplikasi, instance Redis tunggal dengan eviction `allkeys-lru` sudah cukup. Untuk dataset yang melebihi memori satu node:

1. **Redis Cluster**: Secara otomatis melakukan sharding data di beberapa node. Gunakan ketika dataset Anda melebihi ~25 GB atau ketika Anda membutuhkan skalabilitas penulisan.
2. **Redis Sentinel**: Menyediakan ketersediaan tinggi dengan failover otomatis. Gabungkan dengan Cluster untuk skala dan HA.
3. **Read Replicas**: Offload lalu lintas baca ke node replika. Konfigurasikan `ioredis` dengan `preferredSlaves` untuk operasi baca.

```javascript
// Redis Cluster dengan preferensi read replica
const cluster = new Redis.Cluster(
  [{ host: '127.0.0.1', port: 7000 }],
  {
    scaleReads: 'slave',
    redisOptions: { enableAutoPipelining: true }
  }
);

// Tulis ke master, baca dari replica
await cluster.set('key', 'value');        // Master
const val = await cluster.get('key');      // Replica
```

### Langkah 3: Implementasikan Pola Caching Inti

#### Cache-Aside dengan Penanganan Error

Ini adalah pola yang paling banyak digunakan dan harus menjadi default Anda:

```javascript
class CacheAside {
  constructor(redis, db, options = {}) {
    this.redis = redis;
    this.db = db;
    this.ttl = options.ttl || 3600;
    this.staleTtl = options.staleTtl || 86400;
    this.prefix = options.prefix || 'cache';
  }

  key(id) {
    return `${this.prefix}:${id}`;
  }

  staleKey(id) {
    return `${this.key(id)}:stale`;
  }

  async get(id, fetchFn) {
    const cacheKey = this.key(id);
    const staleKey = this.staleKey(id);

    try {
      // Jalur cepat: cache ditemukan
      const cached = await this.redis.get(cacheKey);
      if (cached !== null) {
        return JSON.parse(cached);
      }

      // Jalur basi: sajikan basi, refresh di latar belakang
      const stale = await this.redis.get(staleKey);
      if (stale !== null) {
        this.fetchAndCache(id, fetchFn).catch(err =>
          console.error('Gagal refresh latar belakang:', err)
        );
        return JSON.parse(stale);
      }

      // Jalur miss: ambil sinkron
      return await this.fetchAndCache(id, fetchFn);
    } catch (err) {
      console.error('Error cache, fallback ke database:', err.message);
      return fetchFn();
    }
  }

  async fetchAndCache(id, fetchFn) {
    const data = await fetchFn();
    if (data === null || data === undefined) return null;

    const cacheKey = this.key(id);
    const staleKey = this.staleKey(id);

    // Pipeline kedua penulisan untuk atomicity
    const pipeline = this.redis.pipeline();
    pipeline.setex(cacheKey, this.ttl, JSON.stringify(data));
    pipeline.setex(staleKey, this.staleTtl, JSON.stringify(data));
    await pipeline.exec();

    return data;
  }

  async invalidate(id) {
    await this.redis.del(this.key(id), this.staleKey(id));
  }
}

// Penggunaan
const cache = new CacheAside(redis, db, { ttl: 300, staleTtl: 3600 });

app.get('/users/:id', async (req, res) => {
  const user = await cache.get(req.params.id, () =>
    db.query('SELECT * FROM users WHERE id = ?', [req.params.id])
  );
  res.json(user);
});
```

#### Pola Write-Through untuk Konsistensi

Gunakan ketika konsistensi penulisan antara cache dan database sangat penting:

```javascript
class WriteThrough {
  constructor(redis, db, options = {}) {
    this.redis = redis;
    this.db = db;
    this.ttl = options.ttl || 3600;
    this.prefix = options.prefix || 'cache';
  }

  async set(id, data) {
    const cacheKey = `${this.prefix}:${id}`;

    // Tulis ke database terlebih dahulu
    await this.db.query('UPDATE users SET ... WHERE id = ?', [data, id]);

    // Kemudian perbarui cache
    await this.redis.setex(cacheKey, this.ttl, JSON.stringify(data));
  }

  async get(id) {
    const cacheKey = `${this.prefix}:${id}`;

    // Coba cache terlebih dahulu
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached);
    }

    // Fallback ke database
    const data = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (data) {
      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(data));
    }
    return data;
  }
}
```

#### Pola Write-Behind untuk Penulisan Throughput Tinggi

Gunakan ketika throughput penulisan sangat penting dan konsistensi eventual dapat diterima:

```javascript
class WriteBehind {
  constructor(redis, db, options = {}) {
    this.redis = redis;
    this.db = db;
    this.queueKey = options.queueKey || 'write:queue';
    this.batchSize = options.batchSize || 100;
    this.flushInterval = options.flushInterval || 5000; // ms
    this.isProcessing = false;

    // Mulai worker flush latar belakang
    setInterval(() => this.flush(), this.flushInterval);
  }

  async set(id, data) {
    // Akui segera, antrekan untuk persistensi
    await this.redis.lpush(this.queueKey, JSON.stringify({ id, data, ts: Date.now() }));

    // Opsional: perbarui cache secara instan
    await this.redis.setex(`${this.prefix}:${id}`, this.ttl, JSON.stringify(data));
  }

  async flush() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const batch = [];
      while (batch.length < this.batchSize) {
        const item = await this.redis.rpop(this.queueKey);
        if (!item) break;
        batch.push(JSON.parse(item));
      }

      if (batch.length === 0) return;

      // Tulis batch ke database
      const queries = batch.map(item =>
        this.db.query('UPDATE users SET ... WHERE id = ?', [item.data, item.id])
      );
      await Promise.all(queries);

      console.log(`Flushed ${batch.length} penulisan ke database`);
    } catch (err) {
      console.error('Write-behind flush gagal:', err.message);
      // Antrekan kembali item yang gagal
    } finally {
      this.isProcessing = false;
    }
  }
}
```

### Langkah 4: Implementasikan Pola Redis Lanjutan

#### Redis sebagai Rate Limiter

Gunakan Redis sebagai rate limiter terdistribusi dengan tiga algoritma umum:

**Sliding Window Log:**

```javascript
async function slidingWindowRateLimit(userId, maxRequests = 10, windowMs = 60000) {
  const key = `ratelimit:${userId}:${Math.floor(Date.now() / windowMs)}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.pexpire(key, windowMs);
  }
  return current <= maxRequests;
}
```

**Token Bucket:**

```javascript
async function tokenBucketRateLimit(userId, capacity = 10, refillRate = 1, refillInterval = 1000) {
  const key = `tokenbucket:${userId}`;
  const now = Date.now();

  const result = await redis.eval(`
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local refill_rate = tonumber(ARGV[2])
    local refill_interval = tonumber(ARGV[3])
    local now = tonumber(ARGV[4])

    local bucket = redis.call('hmget', key, 'tokens', 'last_refill')
    local tokens = tonumber(bucket[1]) or capacity
    local last_refill = tonumber(bucket[2]) or now

    local elapsed = now - last_refill
    local refill_count = math.floor(elapsed / refill_interval) * refill_rate
    tokens = math.min(capacity, tokens + refill_count)

    if tokens >= 1 then
      tokens = tokens - 1
      redis.call('hmset', key, 'tokens', tokens, 'last_refill', now)
      redis.call('pexpire', key, math.ceil(capacity * refill_interval / refill_rate))
      return 1
    else
      return 0
    end
  `, 1, key, capacity, refillRate, refillInterval, now);

  return result === 1;
}
```

**Fixed Window:**

```javascript
async function fixedWindowRateLimit(userId, maxRequests = 100, windowMs = 60000) {
  const windowKey = `fixed:${userId}:${Math.floor(Date.now() / windowMs)}`;
  const count = await redis.incr(windowKey);
  if (count === 1) {
    await redis.pexpire(windowKey, windowMs);
  }
  return count <= maxRequests;
}
```

#### Session Store dengan Redis

Redis adalah standar industri untuk penyimpanan sesi terdistribusi:

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

app.use(session({
  store: new RedisStore({
    client: redis,
    prefix: 'sess:',
    ttl: 86400 // 24 jam
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // HTTPS saja
    httpOnly: true,     // Tidak ada akses JS
    sameSite: 'strict',
    maxAge: 86400000    // 24 jam
  }
}));
```

#### Papan Peringkat Real-Time dengan Redis Sorted Sets

Sorted sets Redis menyediakan operasi papan peringkat yang efisien:

```javascript
// Tambah/perbarui skor pemain
async function updateScore(gameId, playerId, score) {
  await redis.zadd(`leaderboard:${gameId}`, score, playerId);
}

// Dapatkan 10 pemain teratas
async function getTopPlayers(gameId, limit = 10) {
  return redis.zrevrange(`leaderboard:${gameId}`, 0, limit - 1, 'WITHSCORES');
}

// Dapatkan peringkat pemain
async function getPlayerRank(gameId, playerId) {
  const rank = await redis.zrevrank(`leaderboard:${gameId}`, playerId);
  return rank !== null ? rank + 1 : null; // 0-indexed, konversi ke 1-indexed
}

// Dapatkan skor di sekitar pemain (untuk paginasi)
async function getNeighbors(gameId, playerId, radius = 5) {
  const rank = await redis.zrevrank(`leaderboard:${gameId}`, playerId);
  if (rank === null) return [];
  const start = Math.max(0, rank - radius);
  const end = rank + radius;
  return redis.zrevrange(`leaderboard:${gameId}`, start, end, 'WITHSCORES');
}

// Increment skor secara atomik
async function incrementScore(gameId, playerId, increment) {
  await redis.zincrby(`leaderboard:${gameId}`, increment, playerId);
}

// Hapus pemain tidak aktif
async function cleanupLeaderboard(gameId, retention) {
  const cutoff = Date.now() - retention;
  await redis.zremrangebyscore(`leaderboard:${gameId}`, 0, cutoff);
}
```

### Langkah 5: Siapkan Caching Terdistribusi dengan Redis Cluster

Ketika dataset Anda tumbuh melampaui satu node, Redis Cluster menyediakan sharding otomatis:

```javascript
const Redis = require('ioredis');

const cluster = new Redis.Cluster([
  { host: 'redis-node-1', port: 7000 },
  { host: 'redis-node-2', port: 7001 },
  { host: 'redis-node-3', port: 7002 }
], {
  // Aktifkan auto-pipelining untuk performa lebih baik
  enableAutoPipelining: true,

  // Skala baca ke replica jika tersedia
  scaleReads: 'slave',

  // Pengaturan connection pool
  redisOptions: {
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
  },

  // Pemantauan kesehatan cluster
  clusterRetryStrategy: (times) => {
    if (times > 10) return null; // Menyerah setelah 10 percobaan
    return Math.min(times * 100, 3000);
  }
});

cluster.on('connect', () => console.log('Terhubung ke Redis Cluster'));
cluster.on('error', (err) => console.error('Redis Cluster error:', err));
cluster.on('-node', (node) => console.warn(`Node dihapus: ${node}`));
cluster.on('+node', (node) => console.info(`Node ditambahkan: ${node}`));

async function waitForCluster() {
  await cluster.connect();
  const info = await cluster.clusterInfo();
  console.log('Status cluster:', info);
}
```

### Langkah 6: Implementasikan Cache Warming

Isi awal cache dengan data yang sering diakses untuk menghindari cache miss cold-start:

```javascript
async function warmCache() {
  const popularProducts = await db.query(
    'SELECT * FROM products ORDER BY views DESC LIMIT 1000'
  );

  const pipeline = redis.pipeline();
  for (const product of popularProducts) {
    const key = `product:${product.id}`;
    pipeline.setex(key, 3600, JSON.stringify(product));
  }

  await pipeline.exec();
  console.log(`Cache dihangatkan dengan ${popularProducts.length} produk`);
}

// Jadwalkan cache warming saat aplikasi dimulai
app.on('ready', async () => {
  try {
    await warmCache();
  } catch (err) {
    console.error('Cache warming gagal:', err.message);
    // Aplikasi masih bisa melayani permintaan; cache akan diisi secara lazy
  }
});
```

### Langkah 7: Siapkan Monitoring dan Alerting

Pantau performa cache untuk mendeteksi masalah sejak dini:

```javascript
// Ekspor metrik untuk Prometheus/Grafana
const prometheus = {
  cacheHits: new Map(),
  cacheMisses: new Map(),
  cacheLatency: new Map()
};

async function trackOperation(operation, key, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const latency = Date.now() - start;

    // Lacak latensi
    const opKey = `${operation}:${key.split(':')[0]}`;
    if (!prometheus.cacheLatency.has(opKey)) {
      prometheus.cacheLatency.set(opKey, []);
    }
    prometheus.cacheLatency.get(opKey).push(latency);

    return result;
  } catch (err) {
    console.error(`Operasi cache ${operation} gagal:`, err.message);
    throw err;
  }
}

// Catat metrik secara periodik
setInterval(async () => {
  const info = await redis.info('stats');
  console.log('Statistik Redis:', {
    hits: info.keyspace_hits,
    misses: info.keyspace_misses,
    hitRate: info.keyspace_hits / (info.keyspace_hits + info.keyspace_misses)
  });
}, 60000);
```

### Langkah 8: Tetapkan Prosedur Operasional

1. **Manajemen koneksi**: Selalu gunakan connection pooling. Jangan pernah membuat koneksi Redis baru per permintaan.
2. **Degradasi bertahap**: Kegagalan cache tidak boleh membuat aplikasi Anda crash. Implementasikan circuit breaker dan fallback ke database utama.
3. **Konvensi penamaan kunci**: Adopsi konvensi `namespace:entity:id` yang konsisten (misalnya, `user:profile:123`). Ini memudahkan debugging dan monitoring.
4. **Hindari perintah berbahaya**: Jangan pernah menggunakan `KEYS *` di produksi. Gunakan `SCAN` untuk iterasi dan `UNLINK` untuk penghapusan asinkron.
5. **Pipeline operasi batch**: Kelompokkan perintah Redis terkait ke dalam pipeline untuk mengurangi round trip:

```javascript
// Buruk: N round trip
for (const id of ids) {
  await redis.get(`user:${id}`);
}

// Baik: 1 round trip
const pipeline = redis.pipeline();
for (const id of ids) {
  pipeline.get(`user:${id}`);
}
const results = await pipeline.exec();
```

1. **Gunakan skrip Lua untuk atomicity**: Operasi multi-kunci yang kritis harus dienkapsulasi dalam skrip Lua untuk memastikan atomicity dan mengurangi round trip jaringan.
1. **Pantau fragmentasi memori**: Rasio fragmentasi memori Redis (`mem_fragmentation_ratio`) di atas 1,5 menunjukkan masalah fragmentasi. Mulai ulang instance atau gunakan `MEMORY PURGE`.
1. **Rencanakan kapasitas**: Pantau used_memory vs maxmemory. Atur alert pada 75%, 85%, dan 95% utilisasi.

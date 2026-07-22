---
title: "Cheat Sheet Skrip Lua dan Pemrograman Server-Side Redis"
description: "Referensi cepat komprehensif untuk skrip Lua Redis — EVAL, EVALSHA, skrip dengan redis.call dan redis.pcall, pola atomik, debugging, dan praktik terbaik produksi."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Skrip Lua dan Pemrograman Server-Side Redis

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Mengevaluasi skrip Lua | `EVAL skrip jumlah_key [key ...] [arg ...]` | Menjalankan skrip Lua di server Redis |
| Mengevaluasi skrip yang di-cache | `EVALSHA sha1 jumlah_key [key ...] [arg ...]` | Menjalankan skrip yang sudah dimuat dengan `SCRIPT LOAD` menggunakan hash SHA1 |
| Memuat skrip ke cache | `SCRIPT LOAD skrip` | Mengunggah skrip ke cache skrip dan mengembalikan hash SHA1 |
| Cek keberadaan skrip | `SCRIPT EXISTS sha1 [sha1 ...]` | Memeriksa apakah satu atau lebih skrip ada di cache skrip |
| Membersihkan cache skrip | `SCRIPT FLUSH [ASYNC\|SYNC]` | Menghapus semua skrip dari cache skrip |
| Menghentikan skrip berjalan | `SCRIPT KILL` | Menghentikan skrip yang sedang berjalan (jika bukan operasi tulis) |
| Debug skrip | `redis-cli --ldb --eval skrip.lua` | Menjalankan skrip di debugger Lua Redis (interaktif, langkah per langkah) |
| Memanggil Redis dari Lua | `redis.call(perintah, ...)` | Menjalankan perintah Redis — memunculkan error runtime jika gagal |
| Memanggil Redis dari Lua (tanpa error) | `redis.pcall(perintah, ...)` | Menjalankan perintah Redis — mengembalikan `false` jika gagal |
| Mengembalikan status reply | `redis.status_reply(pesan)` | Mengembalikan respons status kustom dari skrip Lua |
| Mencatat dari skrip Lua | `redis.log(level, pesan)` | Menulis pesan ke file log Redis (LOG_DEBUG, LOG_VERBOSE, LOG_NOTICE, LOG_WARNING) |
| Mengatur perlindungan variabel global | `redis.setresp(2)` | Beralih ke format reply RESP2 dalam skrip (Redis 7.0+) |
| Mengonversi tabel Lua ke array | `cjson.encode(tabel)` | Mengenkode tabel Lua sebagai string JSON untuk pengembalian terstruktur |
| Parse JSON di Lua | `cjson.decode(string_json)` | Mengurai string JSON menjadi tabel Lua |

## Perintah Umum

### Evaluasi Skrip

```bash
# Skrip inline sederhana — mengembalikan "Halo dari Redis!"
EVAL "return 'Halo dari Redis!'" 0

# Skrip dengan akses key dan argumen
EVAL "return { KEYS[1], ARGV[1] }" 1 key-saya arg-saya

# Skrip menggunakan key Redis — increment key dan kembalikan nilai baru
EVAL "return redis.call('INCR', KEYS[1])" 1 counter:kunjungan

# Menggunakan EVALSHA setelah memuat skrip
SCRIPT LOAD "return redis.call('GET', KEYS[1])"
# Mengembalikan: "4e6d8fc8bb0126e6b6b7a3b8c9d5f0a1b2c3d4e"
EVALSHA "4e6d8fc8bb0126e6b6b7a3b8c9d5f0a1b2c3d4e" 1 profil:pengguna
```

### Manajemen Skrip

```bash
# Memuat skrip kompleks untuk penggunaan berulang
SCRIPT LOAD "local val = redis.call('GET', KEYS[1]); if not val then return nil end; return redis.call('INCRBY', KEYS[1], ARGV[1])"

# Memeriksa apakah skrip ada di cache
SCRIPT EXISTS "4e6d8fc8bb0126e6b6b7a3b8c9d5f0a1b2c3d4e"
# => 1) (integer) 1

# Membersihkan cache skrip (semua skrip harus dimuat ulang)
SCRIPT FLUSH

# Menghentikan skrip yang berjalan terlalu lama
SCRIPT KILL
```

### Debugging dengan Redis Lua Debugger

```bash
# Tulis skrip ke file
cat > ~/skrip_saya.lua << 'EOF'
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current = redis.call('GET', key) or 0
if current >= limit then
  return 0
end
redis.call('INCR', key)
redis.call('EXPIRE', key, 10)
return 1
EOF

# Jalankan dalam mode debug (interaktif)
redis-cli --ldb --eval ~/skrip_saya.lua rate_limit:pengguna:42 , 5

# Perintah debugger: s (langkah), n (berikutnya), c (lanjutkan), p (cetak variabel), b (breakpoint)
```

### Pemetaan Tipe Lua

```bash
# Tabel konversi reply Redis → tipe Lua:
#   Redis Nil       → Lua false
#   Redis Integer   → Lua number
#   Redis String    → Lua string
#   Redis Array     → Lua table (1-indexed)
#   Redis Status    → Lua table dengan {ok = "pesan"}
#   Redis Error     → Lua table dengan {err = "pesan"}

# Contoh: menangani respons nil dengan aman
EVAL "local val = redis.call('GET', KEYS[1]); if val == false then return 'key_tidak_ditemukan' end; return val" 1 pengguna:tidak_ada
```

## Potongan Kode

### Compare-And-Swap (CAS) Atomik

```lua
-- cas.lua — Memperbarui nilai secara atomik hanya jika sesuai dengan nilai yang diharapkan
-- Penggunaan: EVALSHA <sha> 1 key-saya nilai-diharapkan nilai-baru
local key = KEYS[1]
local expected = ARGV[1]
local newvalue = ARGV[2]

local current = redis.call('GET', key)
if current == expected then
  redis.call('SET', key, newvalue)
  return 1  -- sukses
end
return 0  -- konflik
```

### Distributed Lock dengan TTL

```lua
-- acquire_lock.lua — Mengakuisisi distributed lock dengan kadaluwarsa otomatis
-- KEYS[1] = key lock, ARGV[1] = ID pemilik lock, ARGV[2] = TTL dalam detik
local lock_key = KEYS[1]
local owner = ARGV[1]
local ttl = tonumber(ARGV[2])

-- Coba set lock hanya jika belum ada
local acquired = redis.call('SET', lock_key, owner, 'NX', 'EX', ttl)
if acquired then
  return 1  -- lock berhasil diakuisisi
end

-- Periksa apakah lock dimiliki oleh pemilik yang sama (re-entrant)
local current_owner = redis.call('GET', lock_key)
if current_owner == owner then
  -- Refresh TTL
  redis.call('EXPIRE', lock_key, ttl)
  return 1  -- lock diakuisisi kembali
end

return 0  -- lock dimiliki oleh pemilik lain
```

```lua
-- release_lock.lua — Melepaskan lock hanya jika kita pemiliknya
-- KEYS[1] = key lock, ARGV[1] = ID pemilik lock
local lock_key = KEYS[1]
local owner = ARGV[1]

local current = redis.call('GET', lock_key)
if current == owner then
  redis.call('DEL', lock_key)
  return 1  -- lock dilepaskan
end
return 0  -- bukan pemilik lock, tidak ada yang dilepaskan
```

### Rate Limiter — Sliding Window Counter

```lua
-- rate_limiter.lua — Pembatas laju token bucket
-- KEYS[1] = key pembatas laju, ARGV[1] = maksimum permintaan, ARGV[2] = jendela (detik)
local key = KEYS[1]
local max_requests = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('GET', key)
if not current then
  -- Permintaan pertama di jendela ini
  redis.call('SET', key, 1, 'EX', window)
  return { allowed = 1, remaining = max_requests - 1 }
end

local count = tonumber(current)
if count >= max_requests then
  return { allowed = 0, remaining = 0 }
end

redis.call('INCR', key)
-- Pastikan TTL disetel bahkan jika key sudah ada tanpa TTL
redis.call('EXPIRE', key, window)
return { allowed = 1, remaining = max_requests - count - 1 }
```

### Pemrosesan Batch dengan Pipeline

```lua
-- batch_process.lua — Memproses beberapa key secara atomik
-- KEYS = daftar key yang akan diproses, ARGV[1] = jumlah increment
local increment = tonumber(ARGV[1])
local results = {}

for i, key in ipairs(KEYS) do
  local exists = redis.call('EXISTS', key)
  if exists == 1 then
    local new_val = redis.call('INCRBY', key, increment)
    table.insert(results, { key = key, new_value = new_val })
  else
    table.insert(results, { key = key, error = 'tidak_ditemukan' })
  end
end

return cjson.encode(results)
```

### Operasi Sorted Set Atomik

```lua
-- leaderboard_update.lua — Memperbarui skor pengguna di papan peringkat secara atomik
-- KEYS[1] = key sorted set, ARGV[1] = anggota, ARGV[2] = poin yang ditambahkan
local leaderboard_key = KEYS[1]
local member = ARGV[1]
local points = tonumber(ARGV[2])

-- Increment skor secara atomik dan dapatkan peringkat baru
local new_score = redis.call('ZINCRBY', leaderboard_key, points, member)
local rank = redis.call('ZREVRANK', leaderboard_key, member)

-- Kembalikan skor dan peringkat baru dalam satu operasi atomik
return {
  member = member,
  new_score = new_score,
  new_rank = rank + 1  -- ZREVRANK berbasis 0, konversi ke basis 1
}
```

### Bloom Filter dengan Lua (Pengecekan Keanggotaan Hemat Memori)

```lua
-- bloom_check.lua — Pengecekan keanggotaan ala bloom filter sederhana dengan Lua
-- KEYS[1] = key set, ARGV[1] = kandidat anggota, ARGV[2] = ukuran maksimum
local key = KEYS[1]
local candidate = ARGV[1]
local max_size = tonumber(ARGV[2])

-- Periksa keanggotaan menggunakan set
local exists = redis.call('SISMEMBER', key, candidate)
if exists == 0 then
  -- Hanya tambahkan jika masih di bawah kapasitas maksimum
  local current_size = redis.call('SCARD', key)
  if current_size < max_size then
    redis.call('SADD', key, candidate)
    return { known = 0, added = 1, size = current_size + 1 }
  end
  return { known = 0, added = 0, size = current_size, reason = 'kapasitas_penuh' }
end
return { known = 1, added = 0, size = false }
```

### Penghapusan Key Aman dengan Pola

```lua
-- safe_cleanup.lua — Menghapus key yang cocok dengan pola secara batch (berbasis SCAN)
-- KEYS[1] = pola (misal, "session:*"), ARGV[1] = ukuran batch
local pattern = KEYS[1]
local batch_size = tonumber(ARGV[1]) or 100
local cursor = '0'
local deleted = 0

repeat
  local scan_result = redis.call('SCAN', cursor, 'MATCH', pattern, 'COUNT', batch_size)
  cursor = scan_result[1]
  local keys = scan_result[2]

  if #keys > 0 then
    deleted = deleted + #keys
    redis.call('DEL', unpack(keys))
  end
until cursor == '0'

return { deleted = deleted, pattern = pattern }
```

### Pola Penanganan Error Lua

```lua
-- Get aman dengan nilai default
-- Mengembalikan nilai default ketika key tidak ada (tanpa memunculkan error)
local function safe_get(key, default)
  local val = redis.pcall('GET', key)
  if val == false then
    return default
  end
  return val
end

-- Transfer transaksional antara dua key
-- Menggunakan redis.pcall agar kita bisa menangani error dengan baik
local function atomic_transfer(from_key, to_key, amount)
  -- Coba dapatkan nilai sumber
  local from_val = redis.pcall('GET', from_key)
  if from_val == false then
    return { ok = 0, error = 'sumber_key_tidak_ditemukan' }
  end

  local from_num = tonumber(from_val)
  if not from_num or from_num < amount then
    return { ok = 0, error = 'saldo_tidak_mencukupi' }
  end

  redis.call('DECRBY', from_key, amount)
  redis.call('INCRBY', to_key, amount)
  return { ok = 1, sisa_saldo = from_num - amount }
end

-- Penggunaan:
-- EVAL "local function safe_get(k, d) local v=redis.pcall('GET',k); if v==false then return d end; return v end; return safe_get(KEYS[1], ARGV[1])" 1 config:tema "gelap"
```

### Waktu Eksekusi Skrip dan Performa

```lua
-- Semua skrip Lua Redis memiliki batas waktu eksekusi default 5 detik
-- (dikendalikan oleh konfigurasi `lua-time-limit` di redis.conf)

-- Buruk: Loop O(n) di atas set besar akan memblokir Redis
-- EVAL "local members = redis.call('SMEMBERS', KEYS[1]); local r=''; for i,m in ipairs(members) do r=r..m end; return r" 1 set_besar

-- Baik: Gunakan iterasi berbasis SCAN dengan titik yield
-- (Redis 7.0+ memungkinkan yielding di antara iterasi)
local cursor = '0'
local result = {}
repeat
  local scan_result = redis.call('SCAN', cursor, 'MATCH', KEYS[1], 'COUNT', 100)
  cursor = scan_result[1]
  for _, key in ipairs(scan_result[2]) do
    table.insert(result, redis.call('GET', key))
  end
until cursor == '0'

return result
```

### Integrasi Modul JSON (RedisJSON)

```lua
-- Ketika modul RedisJSON dimuat, akses dokumen JSON dari Lua
-- Memerlukan: Redis Stack atau modul redisjson dimuat

-- Dapatkan nilai path JSON secara atomik
local function json_get_atomic(key, path)
  local exists = redis.call('EXISTS', key)
  if exists == 0 then
    return cjson.encode({ error = 'key_tidak_ditemukan' })
  end
  local val = redis.call('JSON.GET', key, path)
  return val
end

-- Increment field numerik dalam dokumen JSON secara atomik
local function json_increment_field(key, path, amount)
  local current = redis.call('JSON.GET', key, path)
  if not current then
    return cjson.encode({ error = 'path_tidak_ditemukan' })
  end
  local num = tonumber(current)
  local new_val = num + (tonumber(amount) or 1)
  redis.call('JSON.SET', key, path, tostring(new_val))
  return cjson.encode({ new_value = new_val })
end
```

### Ringkasan Praktik Terbaik

```text
1. Selalu beri nama KEYS dan ARGV secara deskriptif di komentar skrip.
2. Berikan nama key sebagai KEYS[], bukan hardcoded — memungkinkan skrip kompatibel dengan cluster.
3. Gunakan redis.pcall() daripada redis.call() ketika ingin menangani error dengan baik.
4. Jaga agar skrip tetap pendek (di bawah 100 baris) — skrip panjang memblokir event loop Redis.
5. Gunakan SCRIPT LOAD + EVALSHA untuk skrip yang sering dijalankan (mengurangi bandwidth).
6. Jangan lakukan operasi O(n) mahal pada koleksi besar di dalam skrip.
7. Uji skrip dengan redis-cli --ldb sebelum menerapkan ke produksi.
8. Skrip harus deterministik — input yang sama harus menghasilkan output yang sama.
9. Gunakan cjson.encode() untuk mengembalikan data terstruktur dari skrip.
10. Hindari akses variabel global di skrip Lua — gunakan local di mana-mana.
```

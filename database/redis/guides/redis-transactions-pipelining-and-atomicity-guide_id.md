---
title: "Panduan Transaksi, Pipelining, dan Atomisitas Redis"
description: "Memilih dan menerapkan primitif atomisitas Redis yang tepat: batch MULTI/EXEC, optimistic locking dengan WATCH, skrip Lua dan Functions, pipelining, distributed lock, serta desain key yang aman untuk cluster."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Transaksi, Pipelining, dan Atomisitas Redis

## Pendahuluan

Redis menjalankan perintah satu per satu pada satu thread, sehingga setiap perintah tunggal bersifat atomik. Jaminan itu berhenti di batas perintah. Sebuah `GET`, perbandingan di sisi aplikasi, dan `SET` adalah tiga operasi terpisah tanpa isolasi di antaranya, sehingga dua klien yang melakukannya bersamaan bisa sama-sama membaca nilai yang sama dan sama-sama menulis hasil turunannya. Race read-modify-write klasik ini adalah bug kebenaran data, bukan masalah performa, dan tidak akan hilang berapa pun lapisan retry yang ditambahkan di klien.

Panduan ini membahas empat mekanisme Redis untuk menutup celah tersebut, beserta kapan masing-masing menjadi pilihan tepat:

- `MULTI`/`EXEC` — mengantrekan beberapa perintah dan mengeksekusinya berurutan tanpa disela.
- `WATCH` — optimistic concurrency control yang membatalkan transaksi ketika key yang dipantau berubah.
- Skrip Lua dan Redis Functions — read-modify-write di sisi server yang dieksekusi sebagai satu unit atomik.
- Pipelining — mengurangi round trip jaringan. Alat untuk throughput yang sama sekali tidak memberi atomisitas.

Panduan ini juga membahas sisi operasionalnya: lock dengan fencing token, loop retry yang menurun secara terkendali alih-alih berputar tanpa henti, desain key untuk mode cluster, dan instrumentasi yang membedakan "sedang contended" dari "sudah rusak".

Kesalahan utama yang ditentang panduan ini adalah mencampuradukkan pipelining dengan transaksi. Keduanya mengoptimalkan hal berbeda, gagal dengan cara berbeda, dan menukar satu dengan yang lain mengubah optimasi latensi menjadi insiden integritas data.

## Praktik Terbaik

### 1. Ingat bahwa Redis tidak memiliki rollback

`MULTI`/`EXEC` adalah antrean, bukan transaksi SQL. Perintah divalidasi sintaksnya saat masuk antrean, lalu semuanya dieksekusi pada `EXEC`; perintah yang gagal saat runtime (type error pada key dengan tipe salah, `INCR` pada string) tidak membatalkan perintah yang sudah berhasil. Sisa batch tetap berjalan. Rancang agar setiap perintah dalam antrean tidak mungkin gagal atau kegagalannya dapat ditoleransi, dan jangan pernah memaknai atomisitas sebagai "semua atau tidak sama sekali".

### 2. Gunakan `MULTI`/`EXEC` untuk kerapatan batch, bukan untuk kondisi

Transaksi menjamin tidak ada perintah lain yang berjalan di antara perintah Anda. Transaksi tidak bisa melihat hasil antara lalu bercabang berdasarkan hasil itu — `EXEC` mengembalikan seluruh array balasan di akhir. Jika Anda butuh "kurangi hanya jika saldo mencukupi", itu logika kondisional dan tempatnya di skrip Lua atau di balik `WATCH`, bukan di transaksi biasa.

### 3. Perlakukan `EXEC` yang gagal karena `WATCH` sebagai trafik normal

Ketika key yang dipantau diubah pihak lain antara `WATCH` dan `EXEC`, `EXEC` mengembalikan `nil` dan tidak ada yang diterapkan. Ini normal saat terjadi contention, bukan error. Setiap alur berbasis `WATCH` memerlukan loop retry dengan jumlah percobaan terbatas, exponential backoff dengan jitter, dan kegagalan di level domain setelah percobaan terakhir, bukan perputaran tanpa batas.

### 4. Utamakan skrip untuk read-modify-write tingkat kontrak

Jika operasinya adalah aturan bisnis ("transfer kredit", "klaim job jika belum diklaim"), letakkan di sisi server memakai `EVAL`/`EVALSHA` atau Redis Function. Satu round trip, satu unit atomik, tanpa loop retry, dan aturannya hidup di satu tempat alih-alih di setiap klien. Komprominya: skrip yang lambat memblokir seluruh server, jadi batasi skrip pada operasi struktur data sederhana.

### 5. Pisahkan latensi dari kebenaran data dalam review desain

Pipelining mengirim N perintah tanpa menunggu balasan. Ia lebih cepat karena menghapus round trip; ia tidak lebih aman. Pipeline bisa disela perintah klien lain di antara elemen mana pun. Jika reviewer tidak bisa menyebut alur multi-perintah mana yang butuh atomisitas dan mana yang hanya butuh kecepatan, desainnya belum selesai.

### 6. Jaga transaksi dan skrip tetap kecil

Redis bersifat single-threaded per shard. Skrip Lua yang melakukan loop atas sepuluh ribu key atau `KEYS` bersifat O(N) akan menghentikan semua klien lain selama durasinya. Batasi skrip pada beberapa lookup key, hindari loop atas koleksi tak terbatas, dan pantau peringatan `lua-time-limit` di log: setelah terlampaui, Redis mulai menjawab klien lain dengan `BUSY` dan hanya `SCRIPT KILL` (untuk skrip read-only) atau restart yang memulihkannya.

### 7. Deklarasikan key dengan benar agar mode cluster tidak merusak sistem

Pada mode cluster, semua key yang disentuh transaksi atau skrip harus berada di hash slot yang sama, jika tidak Redis mengembalikan `CROSSSLOT`. Deklarasikan key di `KEYS` (untuk skrip) agar klien bisa merutekan panggilan, dan gunakan hash tag — key yang berbagi substring `{...}` hanya melakukan hash pada substring itu — untuk menyatukan key yang memang saling terkait seperti `{order:8842}:total` dan `{order:8842}:state`.

### 8. Tulis skrip yang deterministik dan idempoten bila memungkinkan

Skrip dapat dieksekusi ulang saat failover atau setelah promosi replica, dan hasil `EVALSHA` bisa terpengaruh perintah non-deterministik (`TIME`, `RANDOMKEY`, `SRANDMEMBER` dengan semantik acak). Lebih baik mengirim waktu dan nilai acak lewat `ARGV`. Ketika skrip mengubah state, buat operasinya aman diulang: compare-and-set bersifat idempoten, increment tanpa syarat tidak.

### 9. Jangan pernah membangun lock tanpa token, TTL, dan fence

Lock adalah `SET key token NX PX ttl`. Token memungkinkan Anda melepas hanya lock milik sendiri (compare-and-delete di dalam skrip, jangan `DEL` polos). TTL mencegah pemegang yang crash memblokir resource selamanya. Fencing token — nomor naik monoton yang divalidasi resource — adalah hal yang benar-benar melindungi Anda ketika pemegang lock berhenti melewati TTL-nya dan pemegang kedua melanjutkan. Redlock hanya sekuat jam yang mendasarinya; untuk resource yang kritis terhadap kebenaran, pasang fence di lapisan penyimpanan.

### 10. Instrumentasikan retry, error skrip, dan ukuran pipeline

Sinyal yang membedakan "contention sehat" dari "desain rusak" adalah jumlah retry transaksi, tingkat abort `WATCH`, tingkat error skrip, dan peringatan skrip lambat. Kirim metrik itu per nama operasi, buat alert pada lonjakan tingkat retry, dan alert segera pada balasan `BUSY` atau baris log `lua-time-limit` — keduanya menandakan skrip yang memblokir trafik produksi.

## Langkah Implementasi

### Langkah 1: Klasifikasikan operasi sebelum memilih primitif

Tuliskan kebutuhan sebagai salah satu dari empat bentuk. Klasifikasi ini menentukan semua langkah berikutnya.

```text
Bentuk                          Primitif                      Perlu retry?
------------------------------  ----------------------------  -------------
N tulisan independen, tanpa     Pipeline (atau MULTI jika      Tidak
kondisi di antaranya            batch tidak boleh disela)
Read-modify-write kondisional   Skrip Lua / Function           Tidak (retry
                                atau WATCH + EXEC              hanya WATCH)
Invariant multi-key atas        MULTI/EXEC, slot yang sama     Tidak
kumpulan key kecil dan tetap
Mutual exclusion antar proses   SET NX PX + fencing token      Ya, di sisi
                                                               pemanggil
```

Jika dua bentuk berlaku sekaligus, yang lebih ketat menang: alur yang butuh kecepatan sekaligus atomisitas adalah transaksi, dan throughput-nya diselesaikan dengan batching di lapisan aplikasi.

### Langkah 2: Kelompokkan tulisan yang tidak boleh disela ke dalam transaksi

Gunakan `MULTI` ketika jaminan yang dibutuhkan adalah "perintah-perintah ini berjalan berurutan", misalnya menjaga counter dan sorted set indeks tetap konsisten.

```typescript
import Redis from "ioredis";

const redis = new Redis({ host: "127.0.0.1", port: 6379 });

async function recordVote(pollId: string, option: string): Promise<void> {
  const results = await redis
    .multi()
    .zincrby(`poll:${pollId}:tally`, 1, option)
    .incr(`poll:${pollId}:votes`)
    .exec();

  // exec() mengembalikan null bila di-abort WATCH, atau array [err, reply].
  if (results === null) {
    throw new Error(`transaksi vote dibatalkan untuk poll ${pollId}`);
  }

  for (const [err] of results) {
    if (err) {
      throw new Error(`transaksi vote gagal: ${err.message}`);
    }
  }
}
```

Perhatikan apa yang tidak dilakukan kode ini: jika `zincrby` gagal karena tipe key salah, `incr` tetap dijalankan. Loop `for` melaporkan error ke pemanggil, tetapi penulisan parsial sudah terjadi — ukur transaksi agar penerapan parsial masih dapat ditoleransi, atau pindahkan seluruh operasi ke dalam skrip.

### Langkah 3: Tambahkan optimistic concurrency dengan `WATCH` ketika keputusan bergantung pada state saat ini

Ketika pemanggil harus membaca nilai, memutuskan, lalu menulis kembali, pantau key tersebut agar penulisan bersamaan membatalkan transaksi alih-alih ditimpa diam-diam. Selalu pasangkan dengan loop retry terbatas.

```typescript
async function reserveSeat(
  eventId: string,
  seats: number,
  maxAttempts = 8,
): Promise<boolean> {
  const key = `event:${eventId}:seats_left`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await redis.watch(key);
    const remaining = Number((await redis.get(key)) ?? "0");

    if (remaining < seats) {
      await redis.unwatch();
      return false;
    }

    const applied = await redis.multi().decrby(key, seats).exec();
    if (applied !== null) {
      return true;
    }

    // Di-abort penulis bersamaan: backoff dengan jitter, lalu baca ulang.
    const backoff = 5 * 2 ** attempt + Math.floor(Math.random() * 25);
    await new Promise((resolve) => setTimeout(resolve, backoff));
  }

  throw new Error(`reservasi kursi event ${eventId} menyerah setelah ${maxAttempts} percobaan`);
}
```

`WATCH` bersifat per koneksi: dengan klien ber-pool, watch, read, dan `EXEC` harus berjalan pada koneksi yang sama. Di `ioredis`, rantai `multi()` mewarisi koneksi tersebut, tetapi pool round-robin di sisi klien akan merusak jaminannya — gunakan koneksi khusus atau, lebih baik, langsung ke Langkah 4.

### Langkah 4: Pindahkan aturan bisnis ke dalam skrip Lua

Skrip menghapus loop retry sepenuhnya: baca, cek, dan tulis terjadi sebagai satu perintah, sehingga tidak ada klien lain yang bisa menyela.

```lua
-- reserve_seats.lua
-- KEYS[1] = key seats_left
-- ARGV[1] = jumlah kursi yang diminta
local remaining = tonumber(redis.call("GET", KEYS[1]) or "0")
local requested = tonumber(ARGV[1])

if remaining < requested then
  return -1
end

return redis.call("DECRBY", KEYS[1], requested)
```

Daftarkan sekali saat startup lalu panggil dengan `EVALSHA`; isi skrip hanya melintasi jaringan satu kali.

```typescript
import { readFileSync } from "node:fs";

const script = readFileSync("./lua/reserve_seats.lua", "utf8");
redis.defineCommand("reserveSeats", { numberOfKeys: 1, lua: script });

// Selanjutnya: 1 key, 1 argumen, satu round trip, tanpa loop retry.
const remaining = await (redis as any).reserveSeats(`event:${eventId}:seats_left`, seats);
if (remaining === -1) {
  throw new Error("tiket habis");
}
```

### Langkah 5: Promosikan skrip panas menjadi Redis Functions

Redis 7 menyediakan functions di sisi server: pustaka skrip bernama yang bertahan saat klien terputus dan tidak bergantung pada cache skrip yang tetap hangat setelah `SCRIPT FLUSH` atau restart. Gunakan untuk aturan yang dipanggil banyak service.

```bash
redis-cli FUNCTION LOAD REPLACE "#!lua name=inventory
redis.register_function('claim_item', function(keys, args)
  local available = tonumber(redis.call('GET', keys[1]) or '0')
  local wanted = tonumber(args[1])
  if available < wanted then
    return -1
  end
  return redis.call('DECRBY', keys[1], wanted)
end)"
```

Panggil dengan `FCALL claim_item 1 inventory:sku:42 3`. Karena pustakanya berversi dan ikut direplikasi, failover tidak meninggalkan sebagian node tanpa aturan tersebut — mode kegagalan operasional yang dialami `EVALSHA` ketika cache skrip kosong saat beban tinggi.

### Langkah 6: Batch pekerjaan independen dengan pipeline, dan jauhkan dari jalur kebenaran data

Pipeline ada untuk menghapus round trip. Gunakan untuk fan-out pembacaan dan untuk penulisan yang benar-benar independen — tidak ada elemen yang bergantung pada balasan elemen lain.

```typescript
async function loadProducts(ids: string[]) {
  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.hgetall(`product:${id}`);
  }

  const replies = await pipeline.exec(); // satu round trip untuk seluruh batch
  if (replies === null) {
    throw new Error("pipeline tidak menghasilkan balasan");
  }

  return replies.map(([err, value]) => {
    if (err) throw err;
    return value as Record<string, string>;
  });
}
```

Pipeline tidak atomik: perintah klien lain masuk di antara elemen-elemennya. Semua hal tentang urutan di atas tetap berlaku — jika elemen 5 bergantung pada penulisan elemen 4, itu transaksi, bukan pipeline.

### Langkah 7: Bangun lock yang gagal dengan aman

Ketika lock antar proses tidak terhindarkan, buat pelepasannya kondisional dan teruskan fence ke resource yang dilindungi.

```typescript
import { randomUUID } from "node:crypto";

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

async function withLock<T>(
  resource: string,
  ttlMs: number,
  work: () => Promise<T>,
): Promise<T> {
  const key = `lock:${resource}`;
  const token = randomUUID();

  const acquired = await redis.set(key, token, "PX", ttlMs, "NX");
  if (acquired !== "OK") {
    throw new Error(`gagal memperoleh lock ${resource}`);
  }

  try {
    return await work();
  } finally {
    // Hapus lock hanya jika masih milik kita: DEL polos di sini bisa melepas
    // lock yang sudah sah diambil pemegang kedua setelah TTL kita habis.
    await redis.eval(RELEASE_SCRIPT, 1, key, token);
  }
}
```

Blok `finally` bukan hiasan. Bug lock paling umum di produksi adalah tugas lambat yang melewati TTL-nya, lalu pemegang asli menghapus lock milik pemegang *baru*, dan dua worker masuk ke critical section secara bersamaan.

### Langkah 8: Pastikan setiap transaksi dan skrip berada di satu slot

Di Redis Cluster, transaksi atau skrip yang menyentuh key pada hash slot berbeda mengembalikan `CROSSSLOT`. Rancang tata letak key agar key terkait berbagi slot, dan jaga tag tetap stabil sepanjang umur data.

```text
# Dua slot: transaksi gagal dengan CROSSSLOT
MULTI
DECR order:8842:remaining
INCR order:8842:reserved
EXEC

# Satu slot: kedua key hanya melakukan hash pada "order:8842"
MULTI
DECR {order:8842}:remaining
INCR {order:8842}:reserved
EXEC
```

Hash tag memusatkan data pada satu shard, jadi gunakan hanya untuk invariant yang lokal pada entitas — satu tag panas dapat menahan seluruh beban kerja pada satu master.

### Langkah 9: Instrumentasikan contention sebelum menjadi insiden

Kirim counter untuk setiap transaksi yang di-abort, setiap error skrip, dan setiap kegagalan akuisisi lock, dengan label nama operasi. Lalu verifikasi juga dari sisi server.

```bash
# Tingkat panggilan dan error per perintah sejak INFO terakhir di-reset
redis-cli INFO commandstats | grep -E "cmdstat_(eval|evalsha|fcall|multi|exec)"

# Apa pun di atas ~10ms layak diperiksa; skrip Lua melewati lua-time-limit adalah insiden
redis-cli SLOWLOG GET 10
redis-cli CONFIG GET slowlog-log-slower-than lua-time-limit busy-reply-threshold
```

Buat alert pada tingkat retry yang naik (bau desain: perpendek critical section, atau pindahkan aturannya ke skrip) dan page pada balasan `BUSY` (ada skrip yang memblokir server).

### Langkah 10: Buktikan jaminannya di bawah konkurensi

Klaim kebenaran tentang atomisitas hanya bermakna di bawah beban. Jalankan jalur yang diperebutkan dengan banyak klien bersamaan dan uji invariant-nya, bukan sekadar tidak adanya error.

```bash
# 50 koneksi bersamaan, 16 perintah per pipeline, 100k operasi
redis-benchmark -h 127.0.0.1 -p 6379 -c 50 -P 16 -n 100000 -t set,get

# Lalu jalankan pemeriksaan invariant Anda sendiri: untuk counter stok,
# reserved + sold tidak boleh melebihi kuantitas awal, dan tidak ada nilai negatif.
```

Jika invariant bertahan di bawah beban dan tingkat retry tetap datar seiring naiknya konkurensi, primitifnya sudah tepat. Jika retry tumbuh linear terhadap konkurensi, critical section-nya terlalu besar — itulah sinyal untuk mengganti `WATCH` dengan skrip.

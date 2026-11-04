---
title: "Cheat Sheet Redis Keyspace Notifications dan Invalidasi Berbasis Event"
description: "Rangkaian flag, nama channel, dan resep klien untuk mengubah event key Redis menjadi invalidasi cache, jejak audit, dan alur kerja berbasis TTL tanpa kehilangan event secara diam-diam."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Redis Keyspace Notifications dan Invalidasi Berbasis Event

Keyspace notifications memungkinkan Redis mempublikasikan pesan Pub/Sub setiap kali keyspace berubah. Terdengar seperti event bus gratis, dan banyak tim langsung menyambungkannya ke invalidasi cache — lalu berminggu-minggu kemudian menemukan bahwa event bersifat best-effort, hanya berlaku per node, dan dipublikasikan setelah perubahan terjadi. Cheat sheet ini adalah referensi operasionalnya: cara menyalakan event, isi sebenarnya dari nama channel, event mana yang harus Anda instrumentasikan sendiri, dan cara membangun jalur invalidasi yang tetap aman ketika subscriber mati.

## Tabel Referensi Cepat

| Aksi | Perintah | Deskripsi |
|------|----------|-----------|
| Mengaktifkan notifikasi | `CONFIG SET notify-keyspace-events KEA` | Kedua keluarga channel, semua kelas standar |
| Memeriksa flag aktif | `CONFIG GET notify-keyspace-events` | Mengembalikan string flag yang sedang berlaku |
| Menyimpan permanen | `CONFIG REWRITE` | Menulis konfigurasi runtime kembali ke file konfigurasi |
| Menonaktifkan notifikasi | `CONFIG SET notify-keyspace-events ""` | String kosong langsung menghentikan semua publikasi |
| Hanya kedaluwarsa | `CONFIG SET notify-keyspace-events Ex` | Channel keyevent, kelas expired saja |
| Kedaluwarsa plus eviksi | `CONFIG SET notify-keyspace-events Eex` | Mencakup TTL berakhir dan eviksi akibat maxmemory |
| Channel keyspace | `PSUBSCRIBE '__keyspace@0__:*'` | Payload berisi nama event, channel membawa key |
| Channel keyevent | `PSUBSCRIBE '__keyevent@0__:*'` | Payload berisi nama key, channel membawa event |
| Memantau satu namespace | `PSUBSCRIBE '__keyspace@0__:session:*'` | Pencocokan glob terjadi pada nama channel |
| Fan-out di cluster | `CLUSTER NODES` | Daftar node, lalu berlangganan ke setiap node |
| Alternatif yang tahan putus | `XADD key-events * event expired key k1` | Stream bertahan saat subscriber sedang mati |
| Deteksi event hilang | `INFO stats` | `keyspace_hits`, `keyspace_misses`, `expired_keys` |

Lima belas detik verifikasi menghemat satu jam debugging: jalankan `PSUBSCRIBE '__key*__:*'` di satu terminal dan `SET`/`PEXPIRE` di terminal lain untuk melihat persis event apa yang dihasilkan beban kerja Anda.

## Perintah Umum

### String flag dan arti setiap hurufnya

Minimal salah satu dari `K` atau `E` harus ada di dalam string flag. Tanpa keduanya, tidak ada yang dipublikasikan meskipun huruf lain diisi.

```bash
# K mempublikasikan ke __keyspace@<db>__:<key> dengan nama event sebagai payload.
# E mempublikasikan ke __keyevent@<db>__:<event> dengan nama key sebagai payload.
redis-cli CONFIG SET notify-keyspace-events KE

# Baca kembali nilai aktifnya — berguna saat restart diam-diam mengembalikannya.
redis-cli CONFIG GET notify-keyspace-events
```

```text
| Flag | Kelas event                                                  |
|------|---------------------------------------------------------------|
| K    | Channel keyspace: __keyspace@<db>__:<key>                    |
| E    | Channel keyevent: __keyevent@<db>__:<event>                  |
| g    | Perintah generik: del, expire, rename, persist               |
| $    | Perintah string                                              |
| l    | Perintah list                                                |
| s    | Perintah set                                                 |
| h    | Perintah hash                                                |
| z    | Perintah sorted set                                          |
| t    | Perintah stream                                              |
| a    | Perintah array (versi Redis terbaru)                         |
| d    | Event tipe key dari modul                                    |
| x    | Event kedaluwarsa                                            |
| e    | Event eviksi                                                 |
| m    | Event key miss (tidak termasuk alias A)                      |
| n    | Event key baru (tidak termasuk alias A)                      |
| o    | Event penimpaan (tidak termasuk alias A)                     |
| c    | Event perubahan tipe (tidak termasuk alias A)                |
| A    | Alias untuk g, $, l, s, h, z, t, a, d, x, e                  |
```

Alias `A` adalah default yang praktis, tetapi tidak mencakup `m`, `n`, `o`, dan `c`. Jika Anda membutuhkan pelacakan miss atau deteksi penimpaan, tuliskan huruf tersebut secara eksplisit.

```bash
# Invalidasi cache pada penulisan dan kedaluwarsa, tanpa membayar event miss.
redis-cli CONFIG SET notify-keyspace-events KEA

# Event miss berguna ketika Anda ingin mengisi cache sesuai permintaan.
redis-cli CONFIG SET notify-keyspace-events KEmn
```

### Anatomi channel dan nama event

Setiap event yang dipublikasikan menghasilkan hingga dua pesan, satu untuk setiap keluarga channel yang diaktifkan. Indeks database menjadi bagian dari nama channel, sehingga `__keyevent@2__:expired` tidak pernah bertabrakan dengan database default.

```bash
# Dua pesan untuk satu SET, ketika K dan E sama-sama aktif.
# channel: __keyspace@0__:user:42    payload: set
# channel: __keyevent@0__:set        payload: user:42
redis-cli PSUBSCRIBE '__key*__:*'
```

Nama event mengikuti bentuk perintah, bukan makna bisnis, dan beberapa perintah menghasilkan lebih dari satu event:

```text
| Perintah       | Event yang dihasilkan                            |
|----------------|--------------------------------------------------|
| DEL / UNLINK   | del                                              |
| HSET / HSETNX  | hset (satu event untuk seluruh pemanggilan)      |
| MSET           | set untuk setiap key                             |
| RENAME         | rename_from untuk sumber, rename_to untuk tujuan |
| EXPIRE         | expire (TTL dipasang, bukan penghapusan)         |
| PERSIST        | persist, hanya bila TTL benar-benar dihapus      |
| LPUSH / RPUSH  | lpush / rpush                                    |
| SADD           | sadd                                             |
| SETEX          | set ditambah expire                              |
```

Perbedaan antara `expire` dan `expired` adalah sumber bug paling sering: `expire` muncul ketika TTL dipasang, `expired` muncul ketika key benar-benar dihapus.

### Kedaluwarsa, eviksi, dan nilai yang sudah tidak ada

Kedaluwarsa bukan penjadwal. Redis menghapus key kedaluwarsa secara lazy saat key tersebut diakses, ditambah siklus aktif yang mengambil sampel sepuluh kali per detik. Key dengan TTL satu menit bisa memunculkan event `expired` lebih lambat dari perkiraan.

```bash
# Berlangganan ke penghapusan akibat TTL dan tekanan maxmemory.
redis-cli PSUBSCRIBE '__keyevent@0__:expired' '__keyevent@0__:evicted'
```

Aturan yang penting di produksi:

- Payload `expired` hanya berisi nama key. Tidak ada nilai di dalam pesan, dan key sudah hilang saat Anda membacanya — jadi event ini tidak bisa dipakai untuk mengarsipkan nilai terakhir.
- `evicted` muncul saat tekanan `maxmemory`; key yang tereksekusi dengan cara ini tidak dapat dipulihkan, sehingga event tersebut adalah sinyal kehilangan data, bukan hook pembersihan.
- Notifikasi tidak direplikasi. Replica tidak menjalankan jadwal kedaluwarsa sendiri dan tidak mempublikasikan event primary, jadi berlanggananlah ke node yang menangani penulisan.
- Operasi massal seperti `FLUSHDB` dan `FLUSHALL` tidak menghasilkan satu event per key. Jika Anda bergantung pada event `del`, gunakan `DEL` atau `UNLINK` untuk penghapusan yang Anda pedulikan.
- Event sisi tulis tetap muncul meskipun penulisan kemudian hilang. Notifikasi bukan transaction log; crash antara penulisan dan acknowledgement konsumen tetap menyisakan celah.

### Berlangganan di seluruh Redis Cluster

Dalam mode Cluster, setiap node hanya menghasilkan event untuk slot yang dimilikinya, dan berbeda dari Pub/Sub biasa tidak ada siaran ke seluruh cluster. Satu `PSUBSCRIBE` ke salah satu node hanya melihat sekitar sepertiga keyspace.

```bash
# Daftar node, lalu buka satu koneksi subscriber per node.
redis-cli -c CLUSTER NODES
redis-cli -h 10.0.0.11 -p 6379 PSUBSCRIBE '__keyevent@0__:expired'
redis-cli -h 10.0.0.12 -p 6379 PSUBSCRIBE '__keyevent@0__:expired'
redis-cli -h 10.0.0.13 -p 6379 PSUBSCRIBE '__keyevent@0__:expired'
```

Setiap node baru yang ditambahkan oleh resharding juga harus dimasukkan ke himpunan subscriber, jika tidak event akan hilang tanpa tanda apa pun setelah scale-out.

### Menjaga konfigurasi tetap hidup setelah restart

`CONFIG SET` adalah state runtime. Restart, failover ke replica yang tidak pernah menerima pengaturan ini, atau push konfigurasi dari file asli akan mengembalikannya ke default yaitu nonaktif.

```bash
# Simpan nilai runtime ke file konfigurasi yang dipakai saat server dijalankan.
redis-cli CONFIG REWRITE

# Atau set secara deklaratif di redis.conf maupun argumen container.
redis-cli CONFIG GET dir
```

Perlakukan string flag sebagai bagian dari definisi infrastruktur, dan tambahkan assertion saat startup yang gagal dengan jelas ketika `CONFIG GET notify-keyspace-events` mengembalikan string kosong.

## Potongan Kode

### Subscriber Node.js dengan ioredis

```javascript
const Redis = require('ioredis');

const client = new Redis(process.env.REDIS_URL);
const subscriber = client.duplicate();

(async () => {
  await client.config('SET', 'notify-keyspace-events', 'KEA');

  // Satu pola per keluarga channel agar handler bisa membedakannya.
  await subscriber.psubscribe(
    '__keyevent@0__:expired',
    '__keyevent@0__:evicted',
    '__keyevent@0__:del',
    '__keyevent@0__:set'
  );

  subscriber.on('pmessage', (pattern, channel, payload) => {
    const event = channel.split(':').pop();
    const key = payload;

    invalidateLocalCache(key);
    metrics.increment('redis.key_event', { event });
  });

  // Koneksi Pub/Sub bisa terputus tanpa event error pada sebagian jalur jaringan.
  subscriber.on('close', () => metrics.increment('redis.subscriber.disconnected'));
})().catch((error) => {
  console.error('subscriber gagal dijalankan', error);
  process.exit(1);
});

function invalidateLocalCache(key) {
  localCache.delete(key);
}
```

### Subscriber Python dengan redis-py

```python
import redis

client = redis.Redis(host="localhost", port=6379, decode_responses=True)
client.config_set("notify-keyspace-events", "KEA")

subscriber = client.pubsub(ignore_subscribe_messages=True)
subscriber.psubscribe("__keyevent@0__:expired", "__keyevent@0__:evicted")

for message in subscriber.listen():
    if message["type"] != "pmessage":
        continue

    event = message["channel"].split(":")[-1]
    key = message["data"]
    handle_removal(event=event, key=key)
```

`ignore_subscribe_messages=True` penting: tanpa itu, item pertama pada `listen()` adalah konfirmasi langganan, bukan event.

### Invalidasi cache lapis kedua pada event penulisan

```javascript
// Pola: jaga handler tetap idempoten dan murah. Baca ulang saat dibutuhkan
// daripada mencoba memulihkan nilai yang sudah dihapus dari notifikasi.
const pending = new Set();

async function onKeyEvent(event, key) {
  if (event === 'expired' || event === 'evicted' || event === 'del') {
    pending.add(key);
    await flushInvalidations();
  }
}

async function flushInvalidations() {
  if (pending.size === 0) return;

  const keys = [...pending];
  pending.clear();

  // Publikasikan ke instance layanan lain setelah instance ini konsisten.
  await client.publish('cache:invalidate', JSON.stringify(keys));
  await client.del(...keys.map((key) => `cache:${key}`));
}
```

### Menggabungkan invalidasi yang meledak bersamaan

Siklus kedaluwarsa aktif memproses key secara periodik, sehingga expiry datang bergerombol, bukan merata. Jendela debounce pendek mengubah ratusan event satu key menjadi beberapa invalidasi gabungan.

```javascript
const buffer = new Set();
let timer = null;

function scheduleInvalidation(key) {
  buffer.add(key);

  if (timer) return;

  // 50 ms cukup untuk menggabungkan satu siklus expiry, cukup pendek agar tetap segar.
  timer = setTimeout(async () => {
    const keys = [...buffer];
    buffer.clear();
    timer = null;

    await client.del(...keys.map((key) => `cache:${key}`));
    metrics.increment('cache.invalidated', {}, keys.length);
  }, 50);
}
```

### Mereproduksi perilakunya secara lokal

```bash
# Terminal 1 — pantau semua event di database 0.
redis-cli CONFIG SET notify-keyspace-events KEA
redis-cli --csv PSUBSCRIBE '__key*__:*'

# Terminal 2 — picu penulisan, TTL, dan kedaluwarsa.
redis-cli SET session:demo value EX 2
redis-cli DEL session:demo
redis-cli SET counter:demo 1
```

Dengan `KEA` Anda seharusnya melihat pasangan pesan `__keyspace@0__` dan `__keyevent@0__`, lalu pasangan `expired` sekitar dua detik kemudian.

### Memilih antara notifikasi, Streams, dan client tracking

```text
| Kebutuhan                          | Keyspace notifications | Streams         | Client tracking |
|------------------------------------|------------------------|-----------------|-----------------|
| Invalidasi tanpa jaminan kirim     | cocok                  | berlebihan     | paling cocok    |
| Tanpa kehilangan saat konsumen mati| tidak                  | ya (consumer grup) | tidak       |
| Langsung jalan lintas cluster      | tidak, per node        | ya              | ya              |
| Membawa nilai sebelumnya           | tidak                  | tergantung Anda | tidak           |
| Biaya tambahan saat perintah jalan | kecil                  | lebih besar     | kecil           |
| Butuh dukungan RESP3 di klien      | tidak                  | tidak           | ya (7.0+)       |
```

Gunakan notifikasi untuk kesegaran cache yang boleh best-effort, Streams ketika event itu sendiri adalah data bisnis yang tidak boleh hilang, dan `CLIENT TRACKING` ketika tujuannya murni menjaga koherensi cache di sisi klien.

### Checklist produksi sebelum rilis

- Pastikan string flag lewat assertion saat startup dan beri alert ketika `CONFIG GET notify-keyspace-events` kosong.
- Berlangganan ke setiap node di cluster, dan daftar ulang node setelah resharding atau failover.
- Jangan pernah merekonstruksi nilai yang sudah dihapus dari event; perlakukan event sebagai petunjuk untuk membaca ulang.
- Deduplikasi berdasarkan key, karena rentetan penulisan ke satu key menghasilkan rentetan event.
- Pantau reconnect subscriber: koneksi yang putus diam-diam terlihat persis seperti keyspace yang menganggur.
- Bandingkan `expired_keys` pada `INFO stats` dengan jumlah event yang diterima untuk mengukur berapa banyak pesan yang sebenarnya hilang.

---
title: "Panduan Scaling Redis Cluster"
description: "Panduan praktis melakukan scaling Redis Cluster: perencanaan hash slot, pembuatan cluster, resharding online, penempatan replika, pengujian failover, routing klien, dan perencanaan kapasitas."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Scaling Redis Cluster

## Pendahuluan

Satu node Redis dibatasi oleh RAM satu mesin, satu event loop, dan satu radius dampak kegagalan. Redis Cluster menghapus batas itu dengan memecah keyspace ke beberapa master, masing-masing memiliki set hash slot yang saling lepas, dengan replika untuk failover. Konsekuensinya bersifat operasional: setiap keputusan scaling — jumlah shard, penempatan replika, routing klien — sulit dibatalkan saat insiden.

Panduan ini membahas mekanismenya (16.384 hash slot, cluster bus, redirection `MOVED`/`ASK`) sekaligus praktik agar cluster yang tumbuh tetap sehat: membuatnya dengan benar, melakukan resharding online, membuktikan failover bekerja sebelum dibutuhkan, dan merencanakan kapasitas sehingga ekspansi berikutnya menjadi rutin.

## Praktik Terbaik

### 1. Ukur shard berdasarkan memori, bukan CPU

Hash slot adalah satuan kepemilikan, bukan satuan beban. Kendala nyata biasanya `maxmemory` per node ditambah bandwidth full resync. Jaga utilisasi memori shard di bawah 60–70% saat puncak, dengan mengingat buffer replikasi dan fork copy-on-write saat BGSAVE ikut memakan ruang.

### 2. Gunakan hash tag secara sengaja, dan seperlunya

Key yang mengandung `{...}` hanya di-hash pada bagian dalam kurung, sehingga `{user:42}:profile` dan `{user:42}:sessions` berada di slot yang sama dan bisa ikut perintah multi-key serta skrip Lua. Lakukan untuk data yang memang diakses bersama, lalu berhenti: satu tag panas menempelkan seluruh beban pada satu master dan membatasi throughput pada satu core.

### 3. Jangan mengandalkan operasi multi-key lintas slot

`MGET`, `MSET`, `SUNION`, `PFCOUNT`, dan skrip gagal dengan `CROSSSLOT` ketika key berada di slot berbeda. Batch per slot, gunakan hash tag, atau terima round trip per key. `SCAN` bekerja per node sehingga Anda harus mengiterasi setiap master sendiri.

### 4. Beri setiap master replika di failure domain berbeda

Master tanpa replika adalah lubang ketersediaan: saat mati, slot-nya tidak tersedia sampai Anda menjalankan `CLUSTER SETSLOT ... NODE` manual. Tempatkan replika di rack atau zona lain dan verifikasi lewat `CLUSTER NODES` — Redis tidak tahu topologi Anda dan bisa menaruh master bersama replikanya.

### 5. Utamakan `redis-cli --cluster` daripada operasi slot manual

Tool bawaan menjalankan importing, migrasi key dengan `MIGRATE`, dan `SETSLOT NODE` dalam urutan benar beserta pemeriksaannya. Menulis sendiri proses ini adalah cara cluster berakhir dengan slot yatim.

### 6. Perlakukan `MOVED` dan `ASK` sebagai trafik normal

`MOVED` berarti slot berpindah permanen; `ASK` muncul selama migrasi. Klien yang baik mengikuti keduanya dan menyegarkan peta slot; klien yang buruk memunculkannya sebagai error. Setel jumlah retry terbatas dan cooldown singkat agar peta slot basi pulih sendiri, bukan berputar tanpa akhir.

### 7. Pantau `cluster_state`, cakupan slot, dan lag replikasi

`cluster_state:ok` berarti semua slot terlayani dan mayoritas master setuju. Buat alert pada `cluster_state:fail`, pada celah di `CLUSTER SLOTS`, dan pada `master_link_status:down`. Ketiga sinyal ini menangkap sebagian besar insiden lebih awal.

### 8. Ekspansi dalam satuan shard dan anggarkan jendela migrasi

Resharding memindahkan key dengan `MIGRATE`, yang menyerialisasi dan sesaat memblokir sumber per key. Resharding online bisa dilakukan, tetapi perkirakan latensi naik saat nilai besar berpindah. Tumbuh sebelum memori 80%, bukan setelah badai eviction OOM.

## Langkah Implementasi

### Langkah 1: Rencanakan topologi

Titik awal produksi yang wajar adalah tiga master dengan satu replika masing-masing, pada enam host.

```ini
# /etc/redis/7000.conf — satu file per node, port diubah per instance
port 7000
cluster-enabled yes
cluster-config-file nodes-7000.conf
cluster-node-timeout 15000
appendonly yes
maxmemory 8gb
maxmemory-policy noeviction
protected-mode no
```

`noeviction` dipilih sengaja: eviction diam-diam pada cache ter-shard menyembunyikan masalah kapasitas, dan node cluster seharusnya gagal secara terang-terangan.

### Langkah 2: Buat cluster

```bash
for p in 7000 7001 7002 7003 7004 7005; do
    redis-server "/etc/redis/${p}.conf" --daemonize yes
done

# 3 master, 1 replika masing-masing; replika ditempatkan otomatis
redis-cli --cluster create \
    10.0.1.11:7000 10.0.1.12:7001 10.0.1.13:7002 \
    10.0.1.21:7003 10.0.1.22:7004 10.0.1.23:7005 \
    --cluster-replicas 1 --cluster-yes

redis-cli -p 7000 cluster info
redis-cli -p 7000 cluster nodes
```

Pastikan seluruh 16.384 slot tercakup dan replika setiap master berada di host berbeda sebelum menerima trafik.

### Langkah 3: Tambah kapasitas secara online

```bash
# Menambah dua master, lalu replika untuk salah satunya
redis-cli --cluster add-node 10.0.1.14:7000 10.0.1.11:7000
redis-cli --cluster add-node 10.0.1.15:7000 10.0.1.11:7000
redis-cli --cluster add-node 10.0.1.24:7003 10.0.1.11:7000 \
    --cluster-slave --cluster-master-id <node-id-master-baru>

# Memindahkan 1000 slot dari tiap master lama ke node baru pertama
redis-cli --cluster reshard 10.0.1.11:7000 \
    --cluster-from <id-a>,<id-b>,<id-c> \
    --cluster-to <id-baru> \
    --cluster-slots 1000 \
    --cluster-yes
```

Jalankan resharding saat trafik rendah, satu shard per langkah, sambil memantau `latency` dan throughput `MIGRATE`.

### Langkah 4: Uji failover sebelum mempercayainya

```bash
# Promosi replika secara terkendali
redis-cli -p 7003 cluster failover

# Kegagalan keras: kill -9 master, lalu pastikan promosi dalam node-timeout
redis-cli -p 7000 cluster nodes | grep master
```

Pastikan replika yang dipromosikan memiliki slot-nya, master lama bergabung kembali sebagai replika, dan aplikasi pulih tanpa intervensi manual.

### Langkah 5: Konfigurasi routing di sisi klien

```javascript
import Redis from 'ioredis';

const cluster = new Redis.Cluster(
    [
        { host: '10.0.1.11', port: 7000 },
        { host: '10.0.1.12', port: 7001 },
    ],
    {
        redisOptions: { password: process.env.REDIS_PASSWORD, maxRetriesPerRequest: 2 },
        clusterRetryStrategy: (times) => Math.min(times * 200, 2000),
        enableReadyCheck: true,
        slotsRefreshTimeout: 2000,
    }
);

cluster.on('error', (err) => console.error('kesalahan cluster', err.message));

try {
    await cluster.set('{user:42}:profile', JSON.stringify({ name: 'Ada' }));
    const raw = await cluster.get('{user:42}:profile');
    console.log(raw ? JSON.parse(raw) : null);
} catch (err) {
    // MOVED/ASK diikuti otomatis; ini kegagalan sesungguhnya
    console.error('penulisan gagal', err);
}
```

### Langkah 6: Capacity planning dan pemantauan

Pantau memori per node (`INFO memory`), jumlah key per slot, dan lag replikasi. Modelkan pertumbuhan sebagai `jumlah_node = ceil(bytes_dataset_puncak * 1.5 / ram_terpakai_per_node)`, dengan headroom 1,5× untuk fork copy-on-write dan buffer failover. Evaluasi ulang setelah setiap peluncuran fitur besar, bukan setelah OOM pertama.

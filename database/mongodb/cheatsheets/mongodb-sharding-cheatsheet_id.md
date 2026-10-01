---
title: "Cheat Sheet Sharding MongoDB"
description: "Referensi praktis untuk mengoperasikan cluster MongoDB sharded: pemilihan shard key, pengelolaan chunk, balancer, mongos dan config server, strategi hashed versus ranged, zone sharding, serta monitoring cluster."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Sharding MongoDB

Sharding adalah topologi penskalaan horizontal: router `mongos`, satu replica set config server yang menyimpan metadata cluster, dan beberapa replica set shard yang menyimpan data. Semua perintah di bawah dijalankan dari `mongosh` yang terhubung ke `mongos` — jangan pernah langsung ke shard.

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Aktifkan sharding pada database | `sh.enableSharding("toko")` | Menandai database sebagai sharded dan memilih primary shard |
| Shard collection (hashed) | `sh.shardCollection("toko.pesanan", { pelangganId: "hashed" })` | Distribusi write merata, tanpa penargetan range |
| Shard collection (ranged) | `sh.shardCollection("toko.pesanan", { dibuatPada: 1 })` | Query range menyentuh sedikit shard, berisiko hotspot |
| Shard key compound | `sh.shardCollection("toko.pesanan", { tenantId: 1, _id: 1 })` | Menambah kardinalitas pada prefix berkardinalitas rendah |
| Tambah shard | `sh.addShard("rs0/mongo-shard0:27017")` | Mendaftarkan replica set sebagai shard |
| Hapus shard | `sh.removeShard("rs2")` | Menguras chunk lebih dulu; balancer harus aktif |
| Status cluster | `sh.status()` | Database, shard, distribusi chunk, status balancer |
| Distribusi collection | `db.pesanan.getShardDistribution()` | Jumlah chunk, ukuran data, dan dokumen per shard |
| Status balancer | `sh.getBalancerState()` | Mengembalikan `true` bila balancing aktif |
| Hentikan / jalankan balancer | `sh.stopBalancer()` / `sh.startBalancer()` | Dipakai saat bulk load dan pembuatan index |
| Ukuran chunk | `db.settings.updateOne({ _id: "chunksize" }, { $set: { value: 64 } })` | Turunkan sebelum backfill besar (default 128 MB) |
| Pecah chunk | `sh.splitAt("toko.pesanan", { tenantId: 42 })` | Split manual pada nilai key tertentu |
| Pindahkan chunk | `sh.moveChunk("toko.pesanan", { tenantId: 42 }, "rs2")` | Memigrasikan satu chunk ke shard tujuan |
| Tambah zone | `sh.addShardToZone("rs1", "APAC")` | Menandai shard dengan nama zone |
| Ikat range ke zone | `sh.updateZoneKeyRange("toko.pesanan", { region: "APAC" }, { region: "APAC\uffff" }, "APAC")` | Menyematkan rentang key ke sebuah zone |
| Reshard collection | `sh.reshardCollection("toko.pesanan", { tenantId: "hashed" })` | MongoDB 5.0+, ganti shard key tanpa downtime |
| Perhalus shard key | `db.adminCommand({ refineCollectionShardKey: "toko.pesanan", key: { tenantId: 1, dibuatPada: 1 } })` | MongoDB 4.4+, memperluas key yang sudah ada |

## Perintah Umum

### Topologi Cluster

```bash
# Jalankan replica set config server (tiga node, port 27019)
mongod --configsvr --replSet cfg --port 27019 --dbpath /data/configdb --bind_ip 0.0.0.0

# Jalankan router mongos yang menunjuk ke replica set config
mongos --configdb cfg/mongo-cfg0:27019,mongo-cfg1:27019,mongo-cfg2:27019 --port 27017

# Pastikan dari mongosh bahwa routing bekerja dan metadata terbaca
mongosh "mongodb://mongos:27017" --eval 'db.adminCommand({ hello: 1 }).msg'
```

### Registrasi dan Inspeksi Shard

```bash
# Terhubung ke router, bukan ke shard, lalu daftarkan dan periksa shard
mongosh "mongodb://mongos:27017/admin"
mongosh --eval 'sh.addShard("rs0/shard0a:27017,shard0b:27017")'
mongosh --eval 'db.adminCommand({ listShards: 1 }).shards.map(s => s.host)'
```

### Kontrol Balancer

```bash
# Hentikan balancing sebelum import massal, jalankan lagi sesudahnya
mongosh --eval 'sh.stopBalancer()'
mongosh --eval 'sh.setBalancerState(true)'

# Batasi balancing ke jendela maintenance (jam UTC)
mongosh --eval 'db.getSiblingDB("config").settings.updateOne(
  { _id: "balancer" },
  { $set: { activeWindow: { start: "01:00", stop: "06:00" } } },
  { upsert: true }
)'
```

## Potongan Kode

### Validasi Shard Key Sebelum Sharding

```javascript
// Dijalankan pada mongos. Periksa kardinalitas dan risiko monotonik lebih dulu.
function pastikanLayakShard(db, namaKoleksi, polaKey) {
    const koleksi = db.getCollection(namaKoleksi);
    const sampel = koleksi.aggregate([
        { $sample: { size: 10000 } },
        { $group: { _id: polaKey, jumlah: { $sum: 1 } } },
        { $count: "keyUnik" }
    ]).toArray();

    if (!sampel.length || sampel[0].keyUnik < 1000) {
        throw new Error(`Shard key ${JSON.stringify(polaKey)} punya terlalu sedikit nilai unik`);
    }

    const statistik = koleksi.stats();
    const selektivitas = sampel[0].keyUnik / Math.max(statistik.count, 1);
    if (selektivitas < 0.01) {
        throw new Error(`Selektivitas ${selektivitas.toFixed(4)} terlalu rendah; chunk jumbo akan muncul`);
    }
    print(`Shard key ${JSON.stringify(polaKey)} layak (selektivitas ${selektivitas.toFixed(3)})`);
}

try {
    pastikanLayakShard(db.getSiblingDB("toko"), "pesanan", { tenantId: 1, dibuatPada: 1 });
} catch (err) {
    print(`Rollout shard key dibatalkan: ${err.message}`);
}
```

### Zone Sharding untuk Kepatuhan Lokasi Data

```javascript
// Menyematkan tenant EU ke shard EU. Range tidak boleh tumpang tindih dan harus menutup
// seluruh keyspace field tersebut, jika tidak chunk tanpa zone berpindah sesuka balancer.
const ns = "toko.pesanan";
const daftarZone = [
    { zone: "EU", shard: "rs-eu", min: { region: "EU" }, max: { region: "EU\uffff" } },
    { zone: "APAC", shard: "rs-apac", min: { region: "APAC" }, max: { region: "APAC\uffff" } }
];

for (const z of daftarZone) {
    sh.addShardToZone(z.shard, z.zone);
    sh.updateZoneKeyRange(ns, z.min, z.max, z.zone);
    print(`Zone ${z.zone} terikat ke ${z.shard}`);
}

// Pastikan setiap chunk dalam collection sudah punya zone
const tanpaZone = db.getSiblingDB("config").chunks.countDocuments({
    ns: ns,
    jumbo: false,
    $or: [{ min: { $lt: { region: "EU" } } }, { max: { $gt: { region: "APAC\uffff" } } }]
});
if (tanpaZone > 0) {
    print(`Peringatan: ${tanpaZone} chunk berada di luar zone yang dideklarasikan`);
}
```

### Monitoring Keseimbangan Chunk dan Migrasi

```javascript
try {
    const status = db.adminCommand({ balancerStatus: 1 });
    print(`Mode balancer: ${status.mode}, sedang berjalan: ${status.inBalancerRound}`);

    const migrasi = db.getSiblingDB("admin").aggregate([
        { $currentOp: { allUsers: true, idleConnections: false } },
        { $match: { type: "op", desc: /Migration/ } },
        { $project: { desc: 1, ns: 1, secs_running: 1 } }
    ]).toArray();

    if (migrasi.length > 20) {
        print(`Antrean: ${migrasi.length} migrasi bersamaan — batasi balancer`);
    }
    migrasi.forEach(m => print(`${m.desc} pada ${m.ns} selama ${m.secs_running} detik`));
} catch (err) {
    print(`Query monitoring gagal: ${err.code} ${err.message}`);
}
```

### Menargetkan Shard Key dalam Query

```javascript
// Sertakan prefix shard key, jika tidak mongos melakukan scatter-gather.
const rencana = db.pesanan.find({ tenantId: 42, status: "PAID" }).explain("executionStats");
if (rencana.queryPlanner.winningPlan.stage === "SINGLE_SHARD") {
    print("Query diarahkan ke satu shard — bagus");
} else {
    print("Query disiarkan ke semua shard — tambahkan shard key pada filter");
}
```

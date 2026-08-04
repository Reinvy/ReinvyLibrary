---
title: "Panduan Replica Set dan Sharding MongoDB"
description: "Panduan komprehensif untuk mengoperasikan MongoDB dalam skala besar — mencakup arsitektur replica set untuk ketersediaan tinggi, failover dan pemilihan primary, pengelolaan oplog, serta desain cluster sharded untuk penskalaan horizontal dengan pemilihan shard key dan tuning balancer."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Replica Set dan Sharding MongoDB

## Pendahuluan

Model dokumen MongoDB memudahkan Anda memulai dari skala kecil, tetapi beban produksi pada akhirnya akan melampaui kemampuan satu proses `mongod`. Saat itu terjadi, Anda membutuhkan dua kemampuan berbeda yang sering tertukar: **ketersediaan tinggi** (menjaga database tetap dapat diakses saat sebuah server gagal) dan **penskalaan horizontal** (mendistribusikan data ke banyak server agar cluster mampu menangani lebih banyak trafik dan data daripada satu mesin mana pun).

Replica set memberikan kemampuan pertama. Replica set adalah sekelompok server MongoDB yang menyimpan kumpulan data yang sama: satu primary menerima penulisan sementara secondary mereplikasi oplog dan dapat mengambil alih melalui pemilihan otomatis jika primary gagal. Cluster sharded memberikan kemampuan kedua: sebuah cluster yang terdiri dari beberapa replica set (shard) tempat dokumen didistribusikan berdasarkan shard key, dengan router `mongos` dan config server yang mengoordinasikan query serta metadata.

Panduan ini membahas arsitektur, praktik terbaik, dan langkah implementasi untuk keduanya. Anda akan mempelajari cara men-deploy replica set tiga node yang tangguh, mengonfigurasi write concern dan read preference dengan benar, mengatur ukuran serta memantau oplog, lalu naik kelas ke cluster sharded dengan shard key yang dipilih tepat, distribusi chunk yang terkendali, dan balancer yang benar-benar Anda pahami. Setiap bagian membangun model operasional produksi yang dapat langsung Anda terapkan.

## Praktik Terbaik

### Jalankan Replica Set di Produksi, Jangan Pernah Instans Standalone

`mongod` standalone tidak memiliki failover otomatis: jika prosesnya mati, database tidak dapat diakses sampai operator turun tangan. Setiap deployment produksi — bahkan yang hanya satu shard — harus berupa replica set.

- **Topologi minimum adalah tiga anggota penyimpan data**: Tiga instans `mongod`, masing-masing menyimpan salinan penuh data, memberikan mayoritas (2 dari 3) yang dapat memilih primary baru saat satu anggota gagal.
- **Jaga jumlah anggota pemilih tetap ganjil**: Pemilihan membutuhkan mayoritas anggota pemilih. Dengan 4 pemilih, partisi dua anggota tidak dapat membentuk mayoritas (2 dari 4 tidak lebih dari 2), sehingga pemisahan jaringan dapat membuat seluruh set hanya bisa dibaca. Dengan 3 pemilih, salah satu sisi selalu memiliki 2 dari 3.
- **Hindari arbiter kecuali benar-benar dibutuhkan**: Arbiter ikut memilih tetapi tidak menyimpan data. Arbiter memang menggoda untuk topologi berjumlah genap (misalnya dua anggota data + arbiter), tetapi anggota penyimpan data ketiga hampir selalu lebih baik — ia dapat melayani pembacaan, ikut serta dalam failover dengan data nyata, dan menjadi sumber cadangan. Jika terpaksa memakai arbiter, jangan pernah menjalankannya di host yang sama dengan anggota data, dan jangan jadikan ia server `mongos` atau aplikasi.
- **Gunakan priority untuk mengontrol lokasi primary**: Setel `priority: 0` pada anggota yang tidak boleh menjadi primary (situs disaster recovery, secondary pelaporan). Beri priority lebih tinggi pada anggota yang Anda inginkan menjadi primary (misalnya yang berada di pusat data utama) agar pemilihan lebih memilihnya.

### Rancang Write Concern dan Read Preference secara Sadar

Replikasi memberi Anda salinan, tetapi konsistensi diatur oleh write concern dan read preference. Kesalahan dalam mengaturnya diam-diam mengorbankan durabilitas atau konsistensi.

- **Gunakan `w: "majority"` untuk penulisan kritis**: Penulisan dengan `{ w: "majority" }` baru diakui setelah mayoritas anggota pemilih menerapkannya, sehingga penulisan tersebut selamat dari kegagalan satu anggota mana pun. Gunakan `w: 1` (default) untuk penulisan throughput tinggi yang tidak kritis, dan `w: 0` hanya untuk telemetri yang sifatnya fire-and-forget.
- **Pahami `writeConcernMajorityJournalDefault`**: Pada replica set, penulisan mayoritas dijurnal secara default. Jika Anda menetapkan `writeConcernMajorityJournalDefault: false`, penulisan yang diakui mayoritas dapat hilang jika sebuah anggota crash sebelum membuang jurnalnya — dapat diterima untuk beberapa analitik, tetapi berbahaya untuk data finansial.
- **Samakan read preference dengan pola akses**: Pembacaan `primary` default memberikan konsistensi terkuat. Gunakan `secondaryPreferred` untuk pelaporan dan analitik yang toleran terhadap data sedikit basi, `nearest` untuk meminimalkan latensi dengan membaca dari anggota terdekat (sangat baik untuk aplikasi global), dan `primaryPreferred` untuk tetap membaca dari primary selama operasi normal sambil tetap bertahan saat primary mati.
- **Pantau replication lag sebelum mengaktifkan pembacaan secondary**: Jika sebuah secondary tertinggal, pembacaan `secondaryPreferred` mengembalikan data basi. Pantau `replSetGetStatus` dan arahkan pembacaan ke secondary hanya ketika lag masih dalam batas.

### Atur Ukuran dan Pantau Oplog

Oplog adalah koleksi capped yang mencatat setiap penulisan; secondary memutarnya ulang agar tetap mutakhir. Jika sebuah secondary tertinggal sangat jauh sampai primary menimpa entri oplog yang masih dibutuhkannya, secondary tersebut menjadi "terlalu basi" dan harus disinkronkan ulang dari awal.

- **Atur ukuran oplog untuk jendela pemeliharaan, bukan kondisi stabil**: Ukuran default dihitung dari ruang disk yang tersedia (sering 5% dari ruang kosong). Perbesar jika Anda merencanakan operasi pemeliharaan panjang (index build, backfill massal) yang menghasilkan banyak penulisan saat sebuah secondary mati atau tertinggal.
- **Tetapkan ukuran oplog secara eksplisit saat startup**: Konfigurasikan `replication.oplogSizeMB` di `mongod.conf` sebelum start pertama. Mengubahnya setelahnya memerlukan sinkronisasi ulang, jadi rencanakan sejak awal.
- **Pantau replication lag dan jendela oplog**: Lacak `db.serverStatus().repl` dan jendela oplog (`db.getReplicationInfo()`). Beri peringatan ketika lag melampaui toleransi read preference Anda atau ketika jendela oplog menyusut di bawah buffer yang aman.

### Pilih Shard Key dengan Cermat

Shard key adalah keputusan paling penting dalam cluster sharded. Shard key menentukan bagaimana dokumen didistribusikan antar shard dan apakah query dapat ditargetkan atau harus scatter-gather.

- **Maksimalkan kardinalitas**: Shard key harus memiliki banyak nilai berbeda. Kunci dengan kardinalitas rendah (misalnya boolean `is_active`) menghasilkan sedikit chunk besar yang tidak dapat dibagi merata.
- **Minimalkan frekuensi**: Tidak ada satu nilai pun yang boleh muncul dalam sebagian besar dokumen. Nilai shard key yang muncul di 30% koleksi menjadi "hot chunk" yang tidak dapat dipecah.
- **Hindari kunci monotonik untuk beban yang berat pada insert**: Kunci yang terus meningkat seperti `ObjectId` atau timestamp mengirim semua insert baru ke chunk yang sama, menciptakan shard panas. Jika terpaksa memakai kunci semacam itu, pilih **hashed shard key** (`{ _id: "hashed" }`), yang menyebarkan penulisan secara merata dengan mengorbankan efisiensi range query.
- **Utamakan kunci gabungan untuk beban nyata**: Kunci natural tunggal jarang ideal. Shard key gabungan seperti `{ region: 1, _id: 1 }` memberikan distribusi yang baik (melalui `_id`) sambil menjaga query yang dibatasi `region` tetap tertarget. Selalu sertakan akhiran berkardinalitas tinggi untuk menghindari jumbo chunk.
- **Pertimbangkan distribusi ranged vs hashed**: Sharding ranged (`{ field: 1 }`) menjaga nilai kunci yang berdekatan tetap berada di shard yang sama, mempercepat range query tetapi berisiko hotspot pada insert monotonik. Sharding hashed (`{ field: "hashed" }`) mengacak penempatan untuk penulisan yang merata tetapi menonaktifkan penargetan berbasis rentang.

### Kendalikan Balancer dan Distribusi Chunk

Chunk adalah rentang nilai shard key; balancer memindahkannya antar shard untuk menjaga cluster tetap seimbang. Jika tidak dikelola, distribusi chunk melenceng dan muncul shard panas.

- **Pre-split chunk untuk beban massal**: Sebelum impor besar, pecah koleksi menjadi banyak chunk dan distribusikan ke seluruh shard (`sh.splitAt` atau `sh.split`) agar balancer tidak kewalahan memindahkan data selama proses muat.
- **Jadwalkan jendela balancer**: Batasi balancing ke jam di luar puncak dengan `sh.setBalancerWindow()` pada cluster produksi — migrasi mengonsumsi I/O dan bandwidth di shard sumber maupun target.
- **Pahami jumbo chunk**: Chunk yang melebihi ukuran maksimum dan tidak dapat dipecah (biasanya karena shard key berkardinalitas rendah atau berfrekuensi tinggi) menjadi "jumbo", tidak dapat dimigrasi, dan secara permanen membuat cluster tidak seimbang. Satu-satunya perbaikan nyata adalah shard key yang lebih baik — inilah mengapa pemilihan shard key sangat penting.
- **Pantau distribusi dengan `sh.status()`**: Periksa jumlah chunk per shard dan bendera `jumbo` secara rutin. Cluster yang seimbang harus menunjukkan jumlah chunk yang kurang lebih sama (dan ukuran data yang sama) di semua shard.

### Jadikan Backup Bagian dari Desain Replica Set

Replica set sendiri bukanlah strategi backup — penghapusan tak sengaja dan korupsi ikut ter-replikasi ke setiap anggota.

- **Gunakan filesystem snapshot atau `mongodump` pada hidden secondary**: Jalankan backup terhadap anggota `hidden: true, priority: 0` agar trafik produksi tidak terganggu. Anggota hidden tidak terlihat oleh read preference aplikasi.
- **Sediakan delayed member untuk pemulihan point-in-time**: Delayed member (`slaveDelay: 3600`) menyimpan data satu jam di belakang primary. Jika operasi keliru merusak data, Anda dapat memulihkan dari delayed member sebelum kesalahan ter-replikasi lebih jauh.
- **Gabungkan snapshot dengan backup oplog berkelanjutan**: Untuk pemulihan point-in-time (PITR) yang sesungguhnya, ambil snapshot dasar berkala ditambah aliran oplog berkelanjutan (misalnya dengan `mongodump --oplog` atau MongoDB Cloud Manager / Ops Manager). Lakukan latihan pemulihan — backup yang belum pernah diuji hanyalah kabar burung.
- **Uji failover secara rutin**: Lakukan penghentian primary terkendali di lingkungan staging untuk memverifikasi pemilihan, koneksi ulang aplikasi, dan waktu failover. Dokumentasikan perilaku yang diharapkan agar operator tidak terkejut saat insiden nyata.

### Amankan Cluster Sebelum Anda Menskalakannya

Setiap anggota dan router tambahan adalah permukaan serangan baru.

- **Aktifkan autentikasi internal**: Anggota replica set saling mengautentikasi dengan keyfile bersama (`security.keyFile`). Tanpa itu, proses apa pun yang dapat menjangkau port MongoDB dapat bergabung ke dalam set.
- **Gunakan TLS untuk semua trafik**: Enkripsi komunikasi klien-ke-server dan antar-cluster (`net.tls.mode: requireTLS`). Kredensial dan data query tidak boleh melewati jaringan sebagai teks polos.
- **Terapkan kontrol akses berbasis peran (RBAC)**: Buat pengguna dengan hak minimum untuk setiap aplikasi dan peran operator. Pengguna backup membutuhkan peran `backup` dan `restore`, bukan `root`.

## Langkah Implementasi

### Langkah 1: Deploy Replica Set Tiga Node

Instal MongoDB di tiga host (`mongo-a`, `mongo-b`, `mongo-c`), buat keyfile bersama, dan konfigurasikan setiap anggota.

```bash
# Di setiap host: buat keyfile sekali lalu distribusikan dengan aman
openssl rand -base64 756 > /etc/mongodb-keyfile
chmod 400 /etc/mongodb-keyfile
# Salin keyfile yang sama ke ketiga host (scp, secret manager, config management, dsb.)
```

Buat `/etc/mongod.conf` di setiap host dengan nama replica set yang sama tetapi `bindIp` miliknya sendiri:

```yaml
storage:
  dbPath: /var/lib/mongodb
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
net:
  bindIp: 0.0.0.0
  port: 27017
replication:
  replSetName: rs0
security:
  keyFile: /etc/mongodb-keyfile
```

Mulai `mongod` di ketiga host, lalu sambungkan ke salah satu anggota dan inisiasi set:

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

```javascript
// Sambungkan ke mongo-a dan inisiasi replica set
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo-a:27017" },
    { _id: 1, host: "mongo-b:27017" },
    { _id: 2, host: "mongo-c:27017" }
  ]
})
```

Verifikasi bahwa set terbentuk dan memilih primary:

```javascript
rs.status()
// Perhatikan: anggota dengan stateStr "PRIMARY" (satu) dan "SECONDARY" (dua),
// serta nilai health 1 untuk setiap anggota
```

### Langkah 2: Konfigurasi Priority, Write Concern, dan Read Preference

Atur priority anggota agar primary lebih memilih anggota di pusat data yang Anda tunjuk, dan tandai anggota pelaporan sebagai hidden agar tidak melayani pembacaan aplikasi:

```javascript
// Naikkan mongo-a, turunkan mongo-b, sembunyikan mongo-c untuk backup/analitik
cfg = rs.conf()
cfg.members[0].priority = 2    // mongo-a — primary yang disukai
cfg.members[1].priority = 1    // mongo-b — target failover
cfg.members[2].priority = 0    // mongo-c — tidak akan pernah menjadi primary
cfg.members[2].hidden = true
cfg.members[2].slaveDelay = 3600  // menyimpan data 1 jam di belakang untuk PITR
rs.reconfig(cfg)
```

Sekarang konfigurasikan driver aplikasi Anda. Dengan Node.js driver:

```javascript
import { MongoClient } from "mongodb"

const client = new MongoClient(
  "mongodb://mongo-a:27017,mongo-b:27017,mongo-c:27017/?replicaSet=rs0",
  {
    // Write concern mayoritas untuk data kritis
    writeConcern: { w: "majority", j: true },
    // Pembacaan analitik boleh ke secondary; primary adalah default
    readPreference: "secondaryPreferred"
  }
)

await client.connect()

// Penulisan finansial kritis — diakui mayoritas dan dijurnal
await db.collection("payments").insertOne(payment, { writeConcern: { w: "majority", j: true } })

// Telemetri volume tinggi — fire and forget dapat diterima
await db.collection("events").insertOne(event, { writeConcern: { w: 1 } })
```

Selalu aktifkan logika retry di driver (`retryWrites: true`, yang menjadi default di driver modern) agar pemilihan primary tidak menggagalkan penulisan aplikasi.

### Langkah 3: Atur Ukuran Oplog dan Verifikasi Kesehatan Replikasi

Sebelum masuk produksi, atur ukuran oplog sesuai laju penulisan dan jendela pemeliharaan terburuk Anda:

```yaml
# /etc/mongod.conf — tetapkan sebelum start pertama; mengubahnya nanti butuh re-sync
replication:
  replSetName: rs0
  oplogSizeMB: 20480   # 20 GB untuk beban produksi dengan penulisan tinggi
```

```javascript
// Periksa jendela oplog dan lag per anggota
db.getReplicationInfo()
// { "logSizeMB": 20480, "timeDiff": 172800, "timeDiffHours": 48, ... }
// timeDiffHours adalah seberapa jauh ke belakang oplog menjangkau — jaga
// jauh di atas jendela pemeliharaan terpanjang yang Anda rencanakan

rs.printSecondaryReplicationStatus()
// Menampilkan waktu syncedTo setiap secondary dan replication lag
```

Berikan peringatan ketika replication lag melampaui toleransi read preference Anda (misalnya 30 detik untuk analitik `secondaryPreferred`). Secondary yang tertinggal terlalu jauh keluar dari jendela oplog dan harus disinkronkan ulang dengan `rs.reSync()` atau initial sync.

### Langkah 4: Rencanakan Shard Key dari Pola Query Nyata

Jangan memilih shard key dari skema — pilihlah dari beban kerja. Kumpulkan query yang benar-benar dijalankan aplikasi Anda, lalu evaluasi kandidatnya:

```javascript
// 1. Daftarkan query paling sering dari profiler
db.setProfilingLevel(1, { slowms: 100 })

// 2. Untuk setiap query panas, catat field filter dan apakah field tersebut
//    merupakan field equality, range, atau sort. Contoh beban kerja:
//
//    orders.find({ customerId: "c_8841" }).sort({ createdAt: -1 })
//    orders.find({ region: "EU", status: "paid" })
//
// 3. Evaluasi kandidat dengan tiga aturan:
//    kardinalitas, frekuensi, monotonisitas
```

Untuk koleksi `orders` e-commerce dengan `customerId` berkardinalitas tinggi dan `createdAt` yang monotonik, utamakan kunci gabungan daripada timestamp mentah:

```javascript
// Baik: kunci gabungan — customerId mendistribusikan, _id menjamin
// keunikan dan mencegah jumbo chunk
sh.shardCollection("shop.orders", { customerId: 1, _id: 1 })

// Alternatif untuk beban ingest berat tanpa kunci natural berkardinalitas tinggi:
// distribusi hashed meratakan insert tetapi mengorbankan penargetan rentang
sh.shardCollection("shop.orders", { _id: "hashed" })
```

### Langkah 5: Deploy Cluster Sharded

Cluster sharded memiliki tiga jenis komponen: shard (masing-masing replica set sendiri), config server (replica set yang menyimpan metadata cluster), dan router `mongos`.

```yaml
# mongod.conf config server (tiga host: cfg-a, cfg-b, cfg-c)
sharding:
  clusterRole: configsvr
replication:
  replSetName: cfgrs
security:
  keyFile: /etc/mongodb-keyfile
```

```yaml
# mongos.conf (pada host router yang menghadap aplikasi)
sharding:
  configDB: cfgrs/cfg-a:27019,cfg-b:27019,cfg-c:27019
security:
  keyFile: /etc/mongodb-keyfile
```

Mulai replica set config server, lalu mulai `mongos` dan tambahkan setiap shard:

```bash
sudo systemctl start mongod   # config server
sudo systemctl start mongos   # router
```

```javascript
// Sambungkan ke mongos
mongosh "mongodb://mongos-a:27017"

// Tambahkan replica set sebagai shard
sh.addShard("rs0/mongo-a:27017,mongo-b:27017,mongo-c:27017")
sh.addShard("rs1/mongo-d:27017,mongo-e:27017,mongo-f:27017")

// Aktifkan sharding untuk database, lalu shard koleksinya
sh.enableSharding("shop")
sh.shardCollection("shop.orders", { customerId: 1, _id: 1 })

sh.status()
// Verifikasi: database "shop" telah di-shard, koleksi "shop.orders"
// menunjukkan chunk yang terdistribusi di rs0 dan rs1
```

### Langkah 6: Kelola Distribusi Chunk dan Balancer

Setelah cluster berjalan, jaga distribusi tetap merata dan dapat diprediksi:

```javascript
// Batasi balancing ke jendela di luar jam sibuk (misalnya 02:00–04:00 UTC)
sh.setBalancerWindow("02:00", "04:00")

// Sebelum impor massal, pre-split koleksi agar balancer
// tidak mengejar beban
sh.splitAt("shop.orders", { customerId: "c_10000" })
sh.splitAt("shop.orders", { customerId: "c_20000" })

// Pantau distribusi chunk — perhatikan jumlah chunk yang kurang lebih sama
// dan awasi bendera "jumbo"
sh.status()
```

Lacak metrik yang penting: jumlah chunk per shard, chunk `jumbo`, aktivitas balancer, dan throughput penulisan per shard. Jika laju penulisan satu shard terus-menerus lebih tinggi, periksa ulang shard key — tidak ada tuning balancer yang dapat memperbaiki kunci yang buruk.

### Langkah 7: Uji Failover dan Disaster Recovery

Failover yang belum diuji sama saja dengan merencanakan downtime. Lakukan latihan terkendali di staging:

```bash
# Simulasikan kegagalan primary pada primary yang sedang aktif
sudo systemctl stop mongod
```

```javascript
// Pada secondary: pastikan pemilihan terjadi dan primary baru ada
rs.status()
// Anggota yang tersisa harus memilih PRIMARY baru dalam hitungan detik
// (default election timeout adalah 10 detik). Verifikasi aplikasi
// tersambung kembali dan terus menulis dengan retryWrites.
```

Selesaikan latihan dengan memeriksa: waktu pemilihan, perilaku koneksi ulang aplikasi, catch-up replikasi anggota yang dimulai ulang, dan bahwa `rs.printSecondaryReplicationStatus()` kembali ke lag nol. Dokumentasikan runbook dan ulangi latihan setiap kuartal — termasuk jalur pemulihan dari backup pada delayed member.

## Kesimpulan

Ketersediaan tinggi dan penskalaan horizontal bukanlah fitur yang dipasang setelah peluncuran — keduanya adalah model operasional yang harus Anda rancang sejak awal deployment. Replica set tiga node dengan write concern mayoritas, read preference yang disengaja, oplog berukuran tepat, dan failover yang teruji menjaga MongoDB tetap tersedia saat server mati. Cluster sharded yang dibangun di atas shard key pilihan yang tepat, distribusi chunk yang terkelola, dan balancer terjadwal menjaga MongoDB tetap cepat saat data dan trafik tumbuh melampaui satu mesin.

Langkah implementasi dalam panduan ini membawa Anda dari tiga proses `mongod` menuju cluster sharded produksi: deploy replica set, sesuaikan konsistensi dan durabilitas, atur ukuran oplog, pilih shard key dari query nyata, dirikan `mongos` dan config server, kelola balancer, dan buktikan failover berfungsi. Mulailah dengan replica set yang kokoh, tambahkan sharding hanya ketika satu set benar-benar tidak mampu melayani beban kerja, dan selalu dasarkan keputusan shard key pada query yang benar-benar dijalankan aplikasi Anda.

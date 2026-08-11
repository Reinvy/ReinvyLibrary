---
title: "Panduan Ketersediaan Tinggi Redis"
description: "Panduan komprehensif untuk membangun deployment Redis dengan ketersediaan tinggi — replikasi master-replica, Redis Sentinel untuk failover otomatis, Redis Cluster untuk penskalaan horizontal, konfigurasi klien yang sadar-HA, serta praktik terbaik produksi untuk uptime dan keamanan data."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Ketersediaan Tinggi Redis

## Pendahuluan

Redis adalah penyimpanan data in-memory yang terkenal dengan latensi sub-milidetik, tetapi kecepatannya datang dengan tantangan operasional mendasar: semua data hidup di RAM pada satu node. Ketika node tersebut crash, reboot, atau menjadi tidak dapat dijangkau, setiap permintaan yang bergantung padanya ikut gagal. Dalam produksi, pemadaman Redis jarang sekadar ketidaknyamanan — bisa berarti pembayaran yang gagal, cache basi yang disajikan ke jutaan pengguna, atau pekerjaan background yang hilang.

Ketersediaan tinggi (HA) adalah disiplin merancang sistem sehingga kegagalan satu komponen pun tidak menyebabkan pemadaman. Untuk Redis, HA dibangun dalam tiga lapisan, masing-masing memecahkan masalah yang berbeda:

- **Replikasi** (master-replica) menjaga salinan data yang redundan sehingga replica dapat mengambil alih jika master mati, sekaligus membantu memindahkan lalu lintas baca.
- **Redis Sentinel** menambahkan pemantauan dan failover otomatis: ketika master tidak dapat dijangkau, Sentinel mempromosikan replica yang sehat menjadi master secara otomatis — tanpa campur tangan manusia.
- **Redis Cluster** membagi data ke banyak master (masing-masing dengan replica-nya sendiri) untuk melampaui kapasitas memori satu node sambil tetap tersedia saat terjadi kegagalan node.

Ketiga lapisan ini tersusun menjadi tangga kedewasaan. Layanan kecil mungkin cukup menjalankan satu replica; backend pembayaran kritis menjalankan replica yang dikelola Sentinel di berbagai zona ketersediaan; platform besar membagi data dengan Cluster dan menganggap Sentinel sebagai batu loncatan yang mengajarkan pelajaran operasional. Panduan ini membahas setiap lapisan, menyajikan praktik terbaik operasional yang mencegah konfigurasi HA gagal di produksi, dan diakhiri dengan langkah implementasi konkret untuk membangun, menguji, dan memantau deployment Redis yang tangguh.

## Praktik Terbaik

### 1. Jalankan Setidaknya Satu Replica di Produksi

Replikasi adalah fondasi setiap lapisan HA di Redis. Master tanpa replica adalah titik kegagalan tunggal: ketika mati, satu-satunya jalan pemulihan adalah menyalakannya kembali (dengan data apa pun yang selamat dari persistensi). Master dengan satu atau lebih replica dapat melakukan failover, dan replica juga menyerap lalu lintas baca serta menjadi cadangan hangat untuk backup. Sebagai aturan umum, deployment produksi harus menjalankan minimal satu replica, dan deployment kritis sebaiknya dua — satu untuk failover dan satu untuk tetap tersedia sementara replica pertama sedang dipromosikan atau melakukan sinkronisasi ulang.

### 2. Deploy Sentinel sebagai Kuorum Berjumlah Ganjil

Sentinel memutuskan apakah master benar-benar mati dengan mengumpulkan suara, yang berarti ia membutuhkan mayoritas untuk menghindari keputusan split-brain. Jalankan **3 atau 5 proses Sentinel** (di host terpisah, idealnya di domain kegagalan yang berbeda) sehingga mayoritas selalu dapat terbentuk meskipun satu atau dua Sentinel tidak dapat dijangkau. Jangan pernah menjalankan Sentinel tunggal — ia menjadi titik kegagalan tunggal yang justru ingin Anda hilangkan, dan ia tidak dapat membentuk mayoritas sendirian.

### 3. Jaga `quorum` Sentinel di Bawah Setengah Jumlah Sentinel

Opsi `quorum` adalah jumlah Sentinel yang harus sepakat bahwa master tidak dapat dijangkau sebelum failover *dimulai*. Nilai ini sengaja dibuat minoritas: dengan 3 Sentinel, `quorum 2` berarti "dua Sentinel sepakat" — tetapi mayoritas 2 juga tetap diperlukan untuk benar-benar *memilih* pemimpin dan melakukan promosi. Menyetel `quorum` sama dengan atau di atas setengah jumlah Sentinel membuat failover mustahil terjadi selama partisi yang membagi grup Sentinel secara merata, yang justru menggagalkan tujuan HA.

### 4. Gunakan `min-replicas-to-write` untuk Mencegah Write Basi

Selama partisi, master yang kehilangan kontak dengan replica-nya dapat terus menerima write yang tidak akan pernah sampai ke replica yang dipromosikan — write tersebut hilang tanpa jejak setelah failover. Konfigurasikan `min-replicas-to-write 1` (dengan `min-replicas-max-lag` yang sesuai) pada master sehingga ia menolak write ketika tidak dapat melihat replica yang sehat. Ini menukar pemadaman write singkat selama partisi dengan jaminan kuat bahwa write yang diakui selamat dari failover.

### 5. Gunakan Autentikasi yang Konsisten di Setiap Node

Autentikasi sering menjadi sumber kegagalan HA. Jika `requirepass` disetel di master tetapi `masterauth` tidak ada di replica, replica tidak dapat terhubung kembali setelah restart. Jika Sentinel tidak mengetahui kata sandi, ia tidak dapat berbicara dengan master sama sekali. Setel `requirepass` dan `masterauth` ke nilai yang sama di setiap master dan replica, dan cerminkan kata sandi di setiap direktif `sentinel auth-pass`, sehingga promosi dan koneksi ulang tidak pernah terhambat oleh kredensial.

### 6. Aktifkan Persistensi di Replica Juga

Replica yang dipromosikan menjadi master saat failover harus langsung menyajikan seluruh dataset. Jika persistensi dinonaktifkan di replica, master baru mulai dalam keadaan kosong dan tidak mereplikasi apa pun — atau lebih buruk, restart master lama dapat memicu resync penuh yang menghapusnya. Konfigurasikan snapshot RDB (dan idealnya AOF) di replica persis seperti di master, dan verifikasi dengan `INFO persistence` bahwa setiap node benar-benar menulis salinan durabelnya sendiri.

### 7. Kendalikan Urutan Promosi dengan `replica-priority`

Ketika Sentinel memilih replica yang akan dipromosikan, ia mengutamakan nilai `replica-priority` terendah (0 berarti replica tidak akan pernah dipromosikan). Gunakan ini untuk mengodekan preferensi operasional Anda: replica di rak yang sama dengan klien, atau replica dengan RAM lebih besar dan disk lebih cepat, mendapat prioritas `100`, sementara replica lintas-region yang lebih lambat mendapat `200`. Ini membuat failover menjadi deterministik alih-alih menyerahkan pilihan pada urutan node yang arbitrer.

### 8. Samakan `maxmemory` dan Kebijakan Eviction di Semua Node

Replica yang dipromosikan mewarisi peran master, termasuk tekanan memorinya. Jika replica memiliki `maxmemory` lebih kecil atau kebijakan eviction berbeda dari master, ia dapat mengusir data secara agresif tepat setelah promosi — atau crash dengan error OOM. Standarkan `maxmemory`, `maxmemory-policy`, dan `maxmemory-samples` di semua node dalam topologi sehingga perubahan peran tidak mengubah perilaku retensi data.

### 9. Gunakan Klien yang Sadar-HA

Pustaka klien harus memahami topologi yang Anda deploy. Klien biasa yang diarahkan ke IP master tidak akan mengikuti failover: ia terus mengirim permintaan ke node yang sudah mati. Gunakan klien yang sadar-Sentinel (misalnya, `ioredis` dengan `sentinels` yang dikonfigurasi, atau `node-redis` dengan topologi `sentinel`) sehingga klien menemukan ulang master saat ini setelah setiap promosi. Untuk deployment Cluster, gunakan klien mode-cluster yang menangani routing hash slot, pengalihan `MOVED`, dan koneksi ulang otomatis ke master baru.

### 10. Uji Failover Secara Teratur dengan Latihan

Failover yang belum diuji adalah janji, bukan jaminan. Jadwalkan latihan failover: matikan master (atau gunakan `DEBUG sleep` / `SENTINEL FAILOVER` untuk memaksa promosi terkendali), ukur waktu hingga promosi, dan verifikasi bahwa klien terhubung kembali dan tidak ada write yang hilang. Otomatiskan latihan ini sehingga berjalan di staging pada setiap siklus rilis, dan simpan entri runbook yang mendokumentasikan waktu failover yang diharapkan serta perintah persis untuk memeriksa hasilnya.

### 11. Pantau Sinyal Kesehatan yang Benar-Benar Penting

Pemantauan HA berfokus pada sinyal yang memprediksi atau mengungkap failover: `INFO replication` (peran, `master_link_status`, lag replica), `SENTINEL master <nama>` (master saat ini, jumlah Sentinel, waktu failover terakhir), dan `redis-cli --cluster check` untuk kesehatan Cluster. Beri peringatan pada `master_link_status:down`, lag replica di atas ambang batas, dan error `-NOMASTERLINK` atau `-CLUSTERDOWN` di log aplikasi. Tren memori, CPU, dan latensi juga penting — node yang merespons lambat adalah failover yang sedang menunggu terjadi.

### 12. Rencanakan Resharding dan Window Pemeliharaan

Resharding Cluster memindahkan hash slot antar master sementara cluster tetap melayani, tetapi tidak gratis: memigrasikan key besar menghasilkan I/O jaringan dan disk, dan operasi `CLUSTER SETSLOT` untuk sementara membuat slot yang terpengaruh tidak tersedia. Jadwalkan resharding dan penggantian node pada window lalu lintas rendah, pindahkan slot dalam batch kecil dengan `--cluster reshard`, dan selalu verifikasi kepemilikan slot dengan `CLUSTER SLOTS` setelahnya. Jangan pernah menjalankan resharding dan latihan failover secara bersamaan.

### 13. Gunakan `cluster-require-full-coverage` Secara Sadar

Secara default, Redis Cluster menolak **semua** query ketika ada hash slot yang tidak tertutup (misalnya, setelah master dan semua replica-nya gagal). Ini menjamin konsistensi kuat — tidak ada data parsial — tetapi mengubah kegagalan satu node menjadi pemadaman seluruh cluster. Setel `cluster-require-full-coverage no` ketika ketersediaan parsial dapat diterima untuk beban kerja Anda (umum untuk cache), dan pertahankan `yes` untuk penyimpanan data yang melayani data tidak lengkap lebih buruk daripada tidak melayani sama sekali. Dokumentasikan keputusan ini; ini keputusan produk, bukan sekadar flag konfigurasi.

### 14. Lindungi Lapisan HA Itu Sendiri

Plane kontrol Sentinel dan Cluster adalah target yang menarik: Sentinel yang disusupi dapat memaksa failover, dan node nakal dapat bergabung ke cluster. Ikat Sentinel ke antarmuka privat, lindungi `redis-cli` dan `CONFIG` dengan `rename-command` bila memungkinkan, gunakan `protected-mode yes` pada deployment non-cluster, dan pisahkan plane kontrol (port Sentinel 26379, port bus cluster 16379) ke segmen jaringan yang terpisah dari lalu lintas publik. Plane data boleh cepat; plane kontrol harus membosankan dan terkunci rapat.

## Langkah Implementasi

### Langkah 1: Siapkan Replikasi Master-Replica

Mulai dengan dua instance Redis dan jadikan instance kedua sebagai replica dari yang pertama. Pada node replica, tambahkan ini ke `redis.conf`:

```text
# replica dari master di 10.0.1.10
replicaof 10.0.1.10 6379
replica-read-only yes
```

Atau promosikan saat runtime tanpa restart:

```bash
redis-cli -h 10.0.1.11 -p 6379 REPLICAOF 10.0.1.10 6379
```

Verifikasi tautan dari salah satu sisi:

```bash
redis-cli -h 10.0.1.10 -p 6379 INFO replication
```

Output harus menunjukkan `role:master`, `connected_slaves:1`, dan `slave0:ip=10.0.1.11,state=online`. Tulis sebuah key di master dan baca di replica untuk memastikan data mengalir. Untuk produksi, tambahkan `replica-priority`, pengaturan `maxmemory` yang seragam, serta `masterauth`/`requirepass` seperti dijelaskan pada praktik terbaik di atas.

### Langkah 2: Deploy Redis Sentinel

Sentinel adalah mode khusus Redis yang dijalankan dengan `--sentinel` dan dikonfigurasi melalui `sentinel.conf`. Deploy tiga proses Sentinel di tiga host terpisah sehingga mayoritas dua selalu dapat terbentuk. `sentinel.conf` minimal terlihat seperti ini:

```text
port 26379
sentinel monitor mymaster 10.0.1.10 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 15000
sentinel parallel-syncs mymaster 1
sentinel auth-pass mymaster S3curePassw0rd
```

Mulai setiap Sentinel:

```bash
redis-server /etc/redis/sentinel.conf --sentinel
```

Setelah ketiganya berjalan, verifikasi bahwa mereka sepakat tentang topologi:

```bash
redis-cli -p 26379 SENTINEL master mymaster
redis-cli -p 26379 SENTINEL replicas mymaster
redis-cli -p 26379 SENTINEL sentinels mymaster
```

Output `SENTINEL sentinels` harus mencantumkan dua instance Sentinel lainnya — bukti bahwa kuorum dapat berkomunikasi. Sentinel juga menulis ulang `sentinel.conf` saat mempelajari topologi, jadi berikan izin tulis pada file tersebut dan jangan pernah mengeditnya manual saat Sentinel sedang berjalan.

### Langkah 3: Verifikasi Failover Otomatis

Dengan replikasi dan Sentinel terpasang, buktikan bahwa failover benar-benar berfungsi. Pertama, catat master saat ini, lalu matikan:

```bash
redis-cli -h 10.0.1.10 -p 6379 SHUTDOWN NOSAVE
```

Dalam hitungan detik, Sentinel harus mendeteksi kegagalan (`down-after-milliseconds`), memilih pemimpin, dan mempromosikan replica. Amati prosesnya:

```bash
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

Alamat yang dikembalikan kini harus menunjuk ke replica yang dipromosikan (misalnya, `10.0.1.11`). Konfirmasi status promosi:

```bash
redis-cli -p 26379 SENTINEL master mymaster | grep -E "num-slaves|num-other-sentinels|config-epoch"
```

Sekarang nyalakan kembali master lama. Ia harus bergabung kembali ke topologi sebagai replica dari master baru, bukan sebagai master pesaing:

```bash
redis-cli -h 10.0.1.10 -p 6379 INFO replication
```

`role:slave` dengan `master_host` yang menunjuk ke `10.0.1.11` adalah hasil yang diharapkan. Ulangi latihan ini sampai promosi konsisten cepat dan bersih — inilah momen ketika HA berubah dari konfigurasi menjadi kapabilitas.

### Langkah 4: Skalakan dengan Redis Cluster

Ketika satu master (plus replica) tidak dapat menampung dataset atau menangani throughput write, bagilah data dengan Redis Cluster. Setiap node Cluster membutuhkan direktif cluster di `redis.conf`:

```text
port 7000
cluster-enabled yes
cluster-config-file nodes-7000.conf
cluster-node-timeout 5000
appendonly yes
```

Mulai enam node (tiga master dan tiga replica) dan buat cluster dengan helper bawaan:

```bash
redis-cli --cluster create \
  10.0.1.10:7000 10.0.1.11:7000 10.0.1.12:7000 \
  10.0.1.13:7001 10.0.1.14:7001 10.0.1.15:7001 \
  --cluster-replicas 1
```

Helper tersebut membagi 16384 hash slot ke tiga master dan menempelkan satu replica ke masing-masing. Verifikasi topologi:

```bash
redis-cli -c -h 10.0.1.10 -p 7000 CLUSTER INFO
redis-cli -c -h 10.0.1.10 -p 7000 CLUSTER NODES
```

`CLUSTER INFO` harus melaporkan `cluster_state:ok` dan `cluster_slots_assigned:16384`. Perilaku failover di Cluster simetris dengan Sentinel: ketika master tidak dapat dijangkau melewati `cluster-node-timeout`, replica-nya memberikan suara dan salah satunya dipromosikan, dan cluster terus melayani slot yang masih tertutup.

### Langkah 5: Konfigurasi Klien yang Sadar-HA

Klien yang mengabaikan topologi tidak akan selamat dari failover. Dengan `ioredis`, mode Sentinel menemukan master saat ini pada setiap koneksi:

```typescript
import Redis from "ioredis";

const redis = new Redis({
  sentinels: [
    { host: "10.0.1.20", port: 26379 },
    { host: "10.0.1.21", port: 26379 },
    { host: "10.0.1.22", port: 26379 },
  ],
  name: "mymaster",
  password: "S3curePassw0rd",
  // Hubungkan ulang dan temukan ulang master setelah failover
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

await redis.set("health", "ok");
const value = await redis.get("health");
console.log(value); // "ok"
```

Untuk Cluster, gunakan klien mode-cluster dan biarkan ia mengikuti pengalihan `MOVED`:

```typescript
import Redis from "ioredis";

const cluster = new Redis.Cluster(
  [
    { host: "10.0.1.10", port: 7000 },
    { host: "10.0.1.11", port: 7000 },
    { host: "10.0.1.12", port: 7000 },
  ],
  {
    scaleReads: "slave", // pindahkan pembacaan ke replica
    retryDelayOnFailover: 100,
  }
);

await cluster.set("user:42", "alice");
console.log(await cluster.get("user:42"));
```

Kedua klien menangani jalur failover untuk Anda, tetapi hanya jika Anda mengujinya terhadap latihan pada Langkah 3 — `name` yang salah konfigurasi, kata sandi keliru, atau `retryStrategy` yang hilang mengubah Sentinel yang sehat menjadi rasa aman yang palsu.

### Langkah 6: Pantau dan Jalankan Latihan Failover

Tutup siklus dengan pemantauan dan latihan berulang. Minimal, kumpulkan sinyal-sinyal ini secara terjadwal:

```bash
# Kesehatan peran dan tautan di setiap node
redis-cli -h <node> INFO replication | grep -E "role|master_link_status|master_repl_offset"

# Pandangan Sentinel tentang dunia (jalankan di setiap Sentinel)
redis-cli -p 26379 SENTINEL master mymaster

# Kesehatan Cluster (node mana pun)
redis-cli -c -h <node> -p 7000 CLUSTER INFO
redis-cli --cluster check <node>:7000
```

Berikan peringatan ketika `master_link_status` bukan `up`, ketika `SENTINEL master` melaporkan status `failover` atau `config-epoch` yang berubah secara tidak terduga, atau ketika `CLUSTER INFO` menunjukkan `cluster_state:fail`. Terakhir, institusionalkan latihan: sekali per siklus rilis, paksa promosi dengan `SENTINEL FAILOVER mymaster` (terkendali, tanpa downtime) atau matikan master sepenuhnya, lalu catat waktu failover terukur dan error klien apa pun. HA adalah properti yang berkelanjutan — ia membusuk diam-diam jika tidak ada yang membuktikan bahwa ia masih berfungsi.

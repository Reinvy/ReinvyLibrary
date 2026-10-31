---
title: "Panduan Migrasi Data dan Peningkatan Versi MongoDB"
description: "Panduan komprehensif untuk memigrasikan data MongoDB antar deployment dan meningkatkan versi server MongoDB — mencakup pemilihan strategi migrasi, cutover tanpa downtime, peningkatan bergilir, feature compatibility version, verifikasi, dan perencanaan rollback."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Migrasi Data dan Peningkatan Versi MongoDB

## Pendahuluan

Setiap deployment MongoDB pada akhirnya menghadapi migrasi atau peningkatan versi: pindah ke perangkat keras baru, relokasi ke region cloud lain, konsolidasi kluster, atau upgrade ke versi MongoDB yang lebih baru untuk keluar dari masa akhir dukungan dan mendapatkan fitur baru. Operasi ini membawa risiko nyata — kehilangan data, downtime berkepanjangan, dan korupsi halus yang baru terlihat berminggu-minggu kemudian. Tidak seperti backup-restore rutin, migrasi produksi adalah proyek rekayasa yang terkendali yang menyentuh replica set, lapisan aplikasi, dan runbook operasional secara bersamaan.

Panduan ini membahas dua operasi yang biasanya direncanakan bersamaan karena keduanya saling terkait erat: memindahkan data antar deployment (migrasi) dan menaikkan versi server MongoDB (upgrade). Anda akan mempelajari cara memilih antara strategi migrasi logis, fisik, dan live-sync, cara melakukan cutover tanpa downtime dengan memperluas replica set, cara melakukan peningkatan versi bergilir satu `mongod` pada satu waktu, dan — yang paling penting — bagaimana feature compatibility version (FCV) mengatur apa yang boleh dan tidak boleh dilakukan pada setiap tahap. Setiap bagian membangun menuju alur kerja implementasi langkah demi langkah yang dapat Anda ikuti untuk deployment MongoDB mana pun.

## Praktik Terbaik

### 1. Inventarisasi Deployment Sumber Sebelum Merencanakan Apa Pun

Rencana migrasi yang dimulai dari perintah alih-alih data hanyalah tebakan. Sebelum memilih strategi, kumpulkan fakta tentang kluster sumber: statistik per-database dan per-koleksi, jumlah dokumen, inventaris indeks, definisi pengguna dan peran, distribusi shard, serta fitur apa saja yang benar-benar digunakan (transaksi, change streams, indeks TTL, koleksi time-series). Fitur yang terlihat serupa antar versi bisa berperilaku berbeda setelah upgrade, jadi inventaris tertulis juga menjadi daftar dampak upgrade Anda. Skrip `mongosh` dapat membuang inventaris ini ke sebuah file yang kemudian berfungsi ganda sebagai checklist verifikasi.

### 2. Sesuaikan Strategi Migrasi dengan Kebutuhan

Tiga keluarga strategi migrasi masing-masing mempertukarkan kecepatan dengan fleksibilitas. Migrasi logis dengan `mongodump`/`mongorestore` adalah yang paling portabel — format BSON stabil lintas versi mayor dan sistem operasi, sehingga menjadi pilihan bawaan untuk pemindahan lintas versi dan untuk mengubah bentuk data selama transfer. Pendekatan fisik (snapshot filesystem, atau initial sync replica set) jauh lebih cepat untuk dataset besar karena menyalin file data mentah, tetapi hanya cocok untuk pemindahan versi sama dan arsitektur sama, dan snapshot memerlukan window pemeliharaan untuk pengambilan yang konsisten. Alat live-sync seperti `mongomirror` Atlas atau loop replay change streams menyalin dataset awal lalu terus menerapkan write baru, memungkinkan cutover dengan downtime hampir nol. Putuskan berdasarkan matriks strategi, bukan karena keakraban.

### 3. Hormati Feature Compatibility Version

FCV (`featureCompatibilityVersion`) adalah saklar yang mengaktifkan fitur yang terkunci versi dan memutakhirkan format penyimpanan internal. Aturan ketat MongoDB adalah: naikkan semua biner `mongod` dan `mongos` terlebih dahulu, dan naikkan FCV hanya setelah setiap node menjalankan versi baru. Menaikkan FCV ke depan pada praktiknya adalah pintu satu arah — MongoDB mendukung downgrade hanya jika FCV belum dinaikkan, dan hanya ke versi mayor tepat sebelumnya. Memeriksa FCV saat ini, dan menjadwalkan kenaikannya sebagai langkah terpisah yang disengaja, mencegah kegagalan upgrade yang paling umum.

### 4. Naikkan Versi Satu Node pada Satu Waktu, Jangan Pernah Seluruh Kluster Sekaligus

Peningkatan bergilir memulai ulang satu `mongod` pada satu waktu, membiarkan replica set menyerap setiap restart tanpa kehilangan ketersediaan primary. Untuk replica set, naikkan versi semua secondary terlebih dahulu, tunggu masing-masing kembali ke status `SECONDARY` dan mengejar replikasi, lalu step down primary dan naikkan versinya paling akhir. Untuk kluster sharded, urutannya adalah: router `mongos` dulu, lalu config servers, lalu setiap shard sebagai upgrade replica set bergilirnya sendiri. Memulai ulang seluruh set sekaligus mengubah upgrade rutin menjadi outage total dan menghilangkan jaring pengaman alami berupa secondary yang sehat.

### 5. Siapkan Ukuran Oplog dan Ruang Disk untuk Migrasi

Dua sumber daya dikonsumsi secara diam-diam selama migrasi dan upgrade. Pertama, oplog: pendekatan perluasan replica set dan live-sync bergantung pada anggota baru atau yang ada untuk membaca oplog cukup lama agar bisa mengejar ketinggalan, jadi oplog kecil dapat memaksa initial sync atau menghentikan live-sync. Periksa `db.printReplicationInfo()` dan perbesar oplog sebelum memulai jika window pengejaran sempit. Kedua, disk: restore logis membangun ulang data plus indeks, sering kali menggandakan sementara penggunaan penyimpanan, dan upgrade biner membutuhkan ruang untuk menyiapkan distribusi baru. Sisakan ruang cadangan di sumber dan target sebelum memulai.

### 6. Verifikasi dengan Data, Bukan Asumsi

"Restore selesai" tidak sama dengan "data benar". Bandingkan jumlah dokumen per koleksi, bandingkan inventaris indeks, periksa sampel nilai kolom, dan gunakan `db.collection.hashCollection()` atau perintah `dbHash` pada deployment non-sharded untuk membandingkan hash kriptografis data di kedua sisi. Lalu jalankan pengujian smoke test tingkat aplikasi terhadap target, dan baru nyatakan migrasi berhasil. Verifikasi adalah checklist dengan output terlampir, bukan satu kode keluar perintah.

### 7. Jaga Jalur Rollback Tetap Terbuka Sampai Cutover Terkonfirmasi

Kluster lama adalah asuransi Anda. Jangan nonaktifkan begitu kluster baru merespons. Biarkan endpoint lama tetap dapat dijangkau selama seluruh cutover dan periode soak setelahnya, sehingga cacat yang ditemukan cukup dengan membalik konfigurasi, bukan restore darurat. Dokumentasikan prosedur pembalikan — catatan DNS atau pengaturan connection string mana yang diubah, dalam urutan apa — dan ujikan pada lingkungan staging sebelum cutover sesungguhnya.

## Langkah Implementasi

### Langkah 1: Inventarisasi Deployment Sumber

Tangkap gambaran lengkap kluster sumber sebelum menyentuh apa pun. Catat versi MongoDB, topologi, penggunaan fitur, dan fakta per-koleksi yang nantinya menjadi dasar pemilihan strategi dan proses verifikasi.

```bash
# Versi MongoDB dan FCV
mongosh --uri "$SRC_URI" --quiet --eval '
  const v = db.runCommand({ buildInfo: 1 });
  print("Versi MongoDB: " + v.version);
  print("FCV: " + db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 }).featureCompatibilityVersion.value);
'
```

```bash
# Inventaris per-database dan per-koleksi (jumlah, ukuran, jumlah indeks)
mongosh --uri "$SRC_URI" --quiet --eval '
  db.adminCommand({ listDatabases: 1 }).databases.forEach(d => {
    const s = db.getSiblingDB(d.name).stats();
    print(`${d.name}: ${s.objects} dokumen, ${(s.dataSize/1024/1024).toFixed(1)} MB data, ${s.indexes} indeks`);
  });
'
```

```bash
# Pemindaian penggunaan fitur aktif: change streams, transaksi, TTL, time-series
mongosh --uri "$SRC_URI" --quiet --eval '
  db.adminCommand({ listDatabases: 1 }).databases.forEach(d => {
    const dbc = db.getSiblingDB(d.name);
    dbc.getCollectionNames().forEach(c => {
      const coll = dbc.getCollection(c);
      const info = coll.stats();
      let flags = [];
      if (info.timeseries) flags.push("time-series");
      coll.getIndexes().forEach(ix => { if (ix.expireAfterSeconds) flags.push("TTL"); });
      if (flags.length) print(`${d.name}.${c}: ${flags.join(", ")}`);
    });
  });
'
```

Ekspor definisi pengguna dan peran agar dapat dibuat ulang di target dengan hak akses yang sama:

```bash
mongosh --uri "$SRC_URI" --quiet --eval '
  db.getUsers().forEach(u => print(EJSON.stringify(u, null, 2)));
' > users-backup.json
```

### Langkah 2: Pilih Strategi Migrasi

Bandingkan tiga keluarga strategi dengan kendala Anda — ukuran dataset, downtime yang diizinkan, selisih versi, dan apakah data perlu diubah bentuknya. Sejak MongoDB 4.2 ke atas, file BSON yang dihasilkan `mongodump` portabel antar versi mayor, yang menjadikan jalur logis sebagai pilihan bawaan untuk migrasi lintas versi.

```text
| Strategi                | Downtime          | Paling Cocok Untuk                              |
|-------------------------|-------------------|-------------------------------------------------|
| mongodump/restore       | Window penuh      | Pemindahan lintas versi, ubah bentuk data, kecil/sedang |
| Snapshot / initial sync | Hampir nol        | Versi sama, arsitektur sama, dataset besar      |
| Replay change streams   | Hampir nol        | Sinkronisasi langsung, window cutover minimal   |
| mongomirror (Atlas)     | Hampir nol        | Migrasi ke MongoDB Atlas dari self-managed      |
```

Pilih strategi dan tuliskan kriteria henti: downtime maksimum yang dapat diterima, momen terakhir write baru boleh terjadi di sumber, dan siapa yang menyetujui cutover final. Catatan keputusan tertulis membuat operasi dapat diaudit dan memberi tim satu sumber kebenaran selama window eksekusi.

### Langkah 3: Siapkan Kluster Target

Sediakan deployment target agar dapat menerima data tanpa kejutan. Pasang versi MongoDB target (untuk upgrade di tempat, ini kluster yang sama; untuk pemindahan pusat data, ini deployment baru), buat pengguna administratif dan aplikasi sesuai inventaris dari Langkah 1, dan buat terlebih dahulu topologi replica set atau sharded yang diperlukan. Jika target adalah kluster baru, nonaktifkan write dari aplikasi sampai cutover dengan mengarahkan aplikasi ke sumber — lalu lintas mengikuti konfigurasi, bukan database.

Verifikasi keterjangkauan dan autentikasi dari host migrasi ke kedua kluster sebelum transfer dimulai:

```bash
mongosh --uri "$DST_URI" --quiet --eval 'db.runCommand({ hello: 1 }).isWritablePrimary'
```

Aktifkan set fitur yang sama di target jika diperlukan untuk verifikasi, misalnya pengaturan TLS dan kompresi yang cocok dengan sumber, sehingga data yang direstore diuji dalam kondisi setara produksi.

### Langkah 4: Lakukan Transfer Data Awal

Untuk migrasi logis, alirkan sumber ke target melalui archive. Format archive lebih tangguh daripada dump direktori karena berupa satu aliran mandiri yang menjaga urutan dan mendukung kompresi gzip di kedua ujung.

```bash
# Dump logis penuh dengan kompresi
mongodump --uri "$SRC_URI" --archive --gzip > mongodb-migration.archive

# Restore ke target, mengganti koleksi yang ada
mongorestore --uri "$DST_URI" --archive --gzip --drop < mongodb-migration.archive
```

Untuk dataset besar, tunda pembuatan indeks agar insert massal berjalan dengan kecepatan maksimum, lalu bangun indeks secara paralel di target setelahnya:

```bash
# Pass pertama: data saja, tanpa restore indeks
mongorestore --uri "$DST_URI" --archive --gzip --noIndexRestore --numInsertionWorkers 4 < mongodb-migration.archive

# Pass kedua: buat ulang indeks per koleksi (jalankan secara paralel)
mongosh --uri "$DST_URI" --quiet --eval '
  const src = db.getSiblingDB("app");
  src.customers.createIndex({ email: 1 }, { unique: true });
  src.orders.createIndex({ customerId: 1, createdAt: -1 });
  src.orders.createIndex({ status: 1 });
'
```

Untuk pemindahan versi sama tanpa downtime, perluas replica set sebagai gantinya: tambahkan anggota yang berada di perangkat keras baru, biarkan initial sync mengisinya dari primary saat ini, lalu step down primary agar anggota baru dapat mengambil alih. Pendekatan ini menghindari dump penuh sama sekali dan merupakan jalur tercepat untuk dataset besar.

```javascript
// Tambahkan anggota baru ke replica set yang ada (perangkat keras / build baru)
rs.add({ _id: 5, host: "new-host-1:27017", priority: 2 });

// Pantau progres initial sync pada anggota baru
rs.status().members.filter(m => m.name.includes("new-host")).forEach(m =>
  print(`${m.name}: ${m.stateStr}, sumber sinkron: ${JSON.stringify(m.syncSourceHost)}`)
);
```

### Langkah 5: Replay Write Tambahan dan Lakukan Cutover

Dump penuh adalah snapshot pada satu waktu; apa pun yang ditulis aplikasi setelah dump dimulai masih hanya ada di sumber. Untuk cutover dengan downtime hampir nol, catat waktu operasi dump, lalu replay change streams dari titik itu ke target hingga kedua sisi menyatu. Buka change stream di sumber yang dijepit ke timestamp yang tercatat:

```javascript
// Tangkap momen dump dimulai (dari log mongodump atau perintah admin)
const startTime = new Date("2026-10-03T00:00:00Z");

const pipeline = [
  {
    $match: {
      $or: [
        { operationType: { $in: ["insert", "update", "replace", "delete"] } },
        { "operationType": "drop" }
      ]
    }
  }
];

const cursor = db.watch(pipeline, { startAtOperationTime: startTime });
```

Terapkan setiap event ke target secara idempoten — menggunakan `replaceOne` dengan `upsert: true` untuk write dan `deleteOne` untuk delete membuat replay aman untuk dimulai ulang:

```javascript
const target = db.getSiblingDB("app");

while (cursor.hasNext()) {
  const event = cursor.next();
  const doc = event.fullDocument;

  if (event.operationType === "delete") {
    target[event.ns.coll].deleteOne({ _id: event.documentKey._id });
  } else if (event.operationType === "drop") {
    target[event.ns.coll].drop();
  } else {
    target[event.ns.coll].replaceOne(
      { _id: doc._id },
      doc,
      { upsert: true }
    );
  }
}
```

Pantau selisih replay antara sumber dan target. Ketika selisih konsisten mendekati nol, lakukan cutover: ubah connection string (atau catatan DNS) aplikasi ke target pada periode sepi, biarkan write yang masih berjalan mengalir habis, lalu hentikan replay. Biarkan sumber tetap dapat dibaca untuk verifikasi alih-alih menghapusnya.

### Langkah 6: Naikkan Versi Server MongoDB

Upgrade bergerak satu versi mayor pada satu waktu — MongoDB mendukung upgrade dari satu versi ke rilis mayor berikutnya, jadi deployment 6.0 harus melewati 7.0 sebelum 8.0. Konfirmasi jalurnya, periksa FCV saat ini, dan ambil backup sebelum memulai.

```bash
# Konfirmasi versi terpasang dan FCV sebelum upgrade
mongosh --uri "$URI" --quiet --eval '
  print("Saat ini: " + db.runCommand({ buildInfo: 1 }).version);
  print("FCV: " + db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 }).featureCompatibilityVersion.value);
'
```

Untuk replica set, naikkan versi satu node pada satu waktu. Pada setiap node: hentikan `mongod`, ganti biner dengan distribusi baru, dan mulai ulang dengan file konfigurasi yang ada.

```bash
# Pada setiap secondary, satu per satu
systemctl stop mongod
tar -xzf mongodb-linux-x86_64-8.0.5.tgz -C /opt
# Arahkan skrip init / service ke jalur biner baru, lalu:
systemctl start mongod
mongosh --uri "$URI" --quiet --eval 'rs.status().members.forEach(m => print(`${m.name}: ${m.stateStr}`))'
```

Tunggu secondary yang dinaikkan versinya mencapai status `SECONDARY` dan mengejar ketinggalan sebelum menyentuh node berikutnya. Setelah semua secondary berada di versi baru, step down primary dan naikkan versinya dengan cara yang sama:

```bash
mongosh --uri "$URI" --quiet --eval 'rs.stepDown(60)'
# Naikkan versi biner node (bekas) primary, mulai ulang, lalu periksa ulang rs.status()
```

Untuk kluster sharded urutannya tetap: naikkan versi semua router `mongos` dulu, lalu config servers satu per satu, lalu setiap shard sebagai upgrade replica set bergilirnya sendiri — shard menyimpan data pengguna, sehingga setiap shard mengikuti pola secondary-dulu-lalu-primary di atas.

Hanya setelah setiap `mongod` dan `mongos` menjalankan versi baru, naikkan FCV. Ini adalah titik tanpa kembali, jadi harus berupa langkah terpisah yang disetujui secara khusus:

```bash
mongosh --uri "$URI" --quiet --eval '
  db.adminCommand({ setFeatureCompatibilityVersion: "8.0" });
  print("FCV sekarang: " + db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 }).featureCompatibilityVersion.value);
'
```

Kenaikan FCV menyelesaikan pemutakhiran format internal; mulai titik ini downgrade ke versi mayor sebelumnya tidak lagi didukung. Jadwalkan hanya setelah kluster berjalan stabil pada biner baru selama periode validasi.

### Langkah 7: Verifikasi, Soak, dan Nonaktifkan

Verifikasi memiliki tiga lapisan: kesetaraan struktural, kesetaraan data kriptografis, dan perilaku aplikasi. Bandingkan jumlah dan indeks terlebih dahulu:

```bash
mongosh --uri "$DST_URI" --quiet --eval '
  db.adminCommand({ listDatabases: 1 }).databases.forEach(d => {
    const dbc = db.getSiblingDB(d.name);
    dbc.getCollectionNames().forEach(c => {
      print(`${d.name}.${c}: ${dbc.getCollection(c).countDocuments()} dokumen`);
    });
  });
'
```

Pada deployment non-sharded, bandingkan output `dbHash` antara sumber dan target untuk pemeriksaan kesetaraan data yang definitif — ketidakcocokan hash menunjuk tepat ke koleksi yang berbeda:

```bash
mongosh --uri "$DST_URI" --quiet --eval 'db.runCommand({ dbHash: 1 })'
```

Jalankan smoke test aplikasi yang didefinisikan di Langkah 1 terhadap target, lalu pantau selama periode soak — selisih replikasi, tingkat error, dan regresi query lambat — sebelum menonaktifkan sumber. Ketika soak lolos, hapus anggota lama dari replica set (untuk upgrade di tempat, tidak ada) dan arsipkan atau hapus deployment lama sesuai kebijakan retensi Anda. Dokumentasikan hasil, output verifikasi, dan insiden apa pun di runbook operasional sehingga migrasi berikutnya menjadi hal yang sudah diketahui, bukan petualangan baru.

## Kesimpulan

Memigrasikan data MongoDB dan menaikkan versi server-nya adalah dua operasi yang gagal karena alasan yang sama: kecepatan mengalahkan proses. Rencana yang mengutamakan inventaris, strategi yang dipilih berdasarkan kendala downtime dan portabilitas yang eksplisit, upgrade bergilir node demi node yang membiarkan kenaikan FCV sebagai langkah terpisah yang disetujui, serta verifikasi yang didasarkan pada perbandingan hash mengubah operasi berisiko tinggi menjadi rekayasa rutin yang terlatih. Replica set adalah sekutu Anda di setiap tahap — ia menyerap restart selama upgrade bergilir, menyediakan mekanisme pengejaran untuk cutover tanpa downtime, dan siap menjadi jalur rollback sampai periode soak membuktikan deployment baru sehat. Ketika kluster lama akhirnya dinonaktifkan, checklist dan output verifikasi yang Anda hasilkan sepanjang proses tetap menjadi dokumentasi untuk migrasi berikutnya.

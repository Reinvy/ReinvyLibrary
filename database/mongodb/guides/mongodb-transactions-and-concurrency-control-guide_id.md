---
title: "Panduan Transaksi dan Kontrol Konkurensi MongoDB"
description: "Panduan lanjutan untuk transaksi ACID multi-dokumen di MongoDB: isolasi snapshot, penanganan konflik tulis, semantik percobaan ulang, kontrol konkurensi optimistis, dan penyetelan produksi."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Transaksi dan Kontrol Konkurensi MongoDB

## Pendahuluan

Model dokumen MongoDB selalu menjamin operasi atomik pada satu dokumen, tetapi banyak alur bisnis nyata — memindahkan uang antar rekening, memesan stok sambil membuat pesanan, atau menyinkronkan buku besar dengan profil pelanggan — perlu memperbarui beberapa dokumen secara atomik. Sejak MongoDB 4.0, transaksi ACID multi-dokumen memberikan jaminan tersebut pada replica set, dan sejak MongoDB 4.2 transaksi juga berjalan di klaster sharded.

Transaksi mengelompokkan operasi baca dan tulis menjadi satu unit all-or-nothing: setiap operasi di dalamnya komit dan terlihat oleh klien lain, atau tidak ada satu pun yang terlihat. Di balik layar, MongoDB mengimplementasikan transaksi dengan **isolasi snapshot** pada storage engine WiredTiger: setiap transaksi melihat snapshot data yang konsisten pada saat operasi pertama dijalankan, dan tulisan yang dikomit oleh transaksi lain tidak terlihat sampai transaksi ini komit. Konflik tulis antar transaksi yang berjalan bersamaan diselesaikan dengan membatalkan (abort) salah satunya, lalu aplikasi harus mencoba lagi.

Panduan ini melampaui tutorial "cara memulai transaksi". Panduan ini menjelaskan model konkurensi, semantik percobaan ulang untuk error transien, cara mendesain dokumen dan jalur kode agar konflik minimal, cara melapisi kontrol konkurensi optimistis di atas transaksi, serta cara memantau dan menyetel transaksi di lingkungan produksi. Panduan ini ditujukan untuk pengembang yang sudah memahami dasar MongoDB dan kini perlu membangun sistem transaksional yang benar dan berthroughput tinggi.

## Praktik Terbaik

### 1. Jaga Transaksi Tetap Pendek dan Terarah

Transaksi memegang sumber daya storage engine dan memblokir penulis lain pada dokumen yang disentuhnya. Batas waktu eksekusi bawaan adalah 60 detik (`transactionLifetimeLimitSeconds`), dan transaksi yang menganggur juga dibatalkan setelah rentang waktu yang sama. Dalam praktiknya, transaksi harus selesai dalam hitungan milidetik. Jangan pernah melakukan I/O jaringan, panggilan API eksternal, atau interaksi pengguna di dalam transaksi — semua itu memperpanjang jendela terbuka dan meningkatkan peluang konflik tulis serta timeout secara drastis.

```javascript
// Salah: I/O eksternal di dalam jendela transaksi
await session.withTransaction(async () => {
  const price = await pricingService.fetchFromRemote(); // panggilan jaringan di dalam txn
  await orders.updateOne({ _id: orderId }, { $set: { total: price } }, { session });
});

// Benar: ambil semua data dulu, lalu transaksikan hanya pekerjaan basis data
const price = await pricingService.fetchFromRemote();
await session.withTransaction(async () => {
  await orders.updateOne({ _id: orderId }, { $set: { total: price } }, { session });
});
```

### 2. Utamakan Helper withTransaction daripada Start dan Commit Manual

Helper `session.withTransaction()` pada driver Node.js mengimplementasikan kontrak percobaan ulang secara lengkap: ketika `TransientTransactionError` (termasuk `WriteConflict`) membatalkan transaksi, helper otomatis mengabort dan menjalankan ulang callback. Kode manual `startTransaction` / `commitTransaction` harus mengimplementasikan ulang loop ini, dan sangat mudah salah.

```javascript
const session = client.startSession();

try {
  await session.withTransaction(async () => {
    await accounts.updateOne(
      { _id: "alice" },
      { $inc: { balance: -100 } },
      { session }
    );
    await accounts.updateOne(
      { _id: "bob" },
      { $inc: { balance: 100 } },
      { session }
    );
  }, {
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" },
    readPreference: "primary"
  });
} finally {
  await session.endSession();
}
```

### 3. Desain untuk Konflik Tulis yang Lebih Sedikit

WiredTiger menggunakan konkurensi tingkat dokumen: dua transaksi dapat membaca dokumen yang sama dengan bebas, tetapi jika dua transaksi **menulis dokumen yang sama** (atau entri indeks untuk dokumen tersebut) pada saat yang sama, satu menang dan yang lain menerima `WriteConflict` lalu harus dicoba ulang secara keseluruhan. Peluang konflik bertambah seiring jumlah dokumen yang ditulis transaksi dan seberapa "panas" dokumen tersebut. Kesalahan klasik yang menciptakan hot-spot adalah dokumen penghitung bersama yang setiap transaksinya di-increment. Dokumen penghitung khusus, atau menyematkan penghitung ke dalam dokumen yang diperbarui, membuat kontensi tetap rendah.

```javascript
// Dokumen panas: setiap transaksi meng-increment penghitung yang sama -> WriteConflict terus-menerus
await counters.updateOne({ _id: "global_orders" }, { $inc: { value: 1 } }, { session });

// Lebih baik: turunkan penghitung dari dokumen pesanan jika memungkinkan, atau sebar
// penghitung berdasarkan dimensi alami (per-region, per-shop) agar tulisannya tersebar
```

### 4. Pilih Read Concern dan Write Concern dengan Cermat

Concern adalah kenop yang menukar throughput dengan durabilitas dan konsistensi:

- **Read concern `snapshot`** (bawaan untuk transaksi) membaca snapshot yang konsisten diambil pada operasi pertama transaksi. Ini memberi repeatable reads: query yang sama dua kali di dalam transaksi mengembalikan data yang identik, meskipun klien lain komit di antaranya.
- **Read concern `local`** mengembalikan data terbaru, meskipun belum terkomit dan bisa digulung balik.
- **Write concern `w: "majority"`** saat komit membuat durabilitas transaksi bergantung pada mayoritas anggota replica set. Dengan `w: 1`, komit yang diakui primary masih bisa digulung balik jika primary gagal sebelum replikasi selesai.

Gunakan `w: "majority"` untuk apa pun yang bersifat finansial atau penting bagi bisnis, dan terima biaya latensinya. Jangan pernah menurunkan durabilitas secara diam-diam hanya demi lulus tolok ukur.

```javascript
await session.withTransaction(callback, {
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" }
});
```

### 5. Tetap Implementasikan Loop Percobaan Ulang Meski Memakai Transaksi Manual

`withTransaction` menangani percobaan ulang, tetapi Anda tetap perlu memahami kontraknya karena Anda akan menjumpainya di kode driver, ORM, dan abstraksi buatan sendiri. Aturannya: pada `TransientTransactionError` (label error pada objek error driver), abort lalu coba ulang **seluruh** transaksi — jangan pernah melanjutkan dari tengah, karena snapshot sudah hilang dan sebagian tulisan tidak boleh bocor.

```javascript
let committed = false;
while (!committed) {
  const session = client.startSession();
  try {
    session.startTransaction({ readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    await orders.insertOne(order, { session });
    await inventory.updateOne({ _id: sku }, { $inc: { stock: -1 } }, { session });
    await session.commitTransaction();
    committed = true;
  } catch (error) {
    if (error.hasErrorLabel("TransientTransactionError")) {
      // Aman untuk mencoba ulang seluruh transaksi
    } else {
      throw error;
    }
  } finally {
    await session.endSession();
  }
}
```

### 6. Buat Penanganan Komit Idempoten

Ketika `commitTransaction` diakui, hasilnya pasti. Tetapi jika jaringan gagal **setelah** primary komit dan **sebelum** driver menerima pengakuan, driver tidak dapat mengetahui apakah komit berhasil — error tersebut membawa label `UnknownTransactionCommitResult`. Mencoba ulang komit aman karena komit bersifat idempoten di sisi server, tetapi Anda tidak boleh mengeksekusi ulang seluruh badan transaksi secara membabi buta, karena bisa menggandakan penerapan tulisan.

```javascript
try {
  await session.commitTransaction();
} catch (error) {
  if (error.hasErrorLabel("UnknownTransactionCommitResult")) {
    // Komit mungkin sudah berhasil. Ulangi commitTransaction saja,
    // jangan pernah mengeksekusi ulang badan transaksi.
    await session.commitTransaction();
  } else {
    throw error;
  }
}
```

### 7. Hindari Operasi DDL dan Operasi yang Memblokir di Dalam Transaksi

Transaksi tidak dapat membuat, menghapus, atau memodifikasi koleksi dan indeks, dan tidak dapat menjalankan perintah administratif atau manajemen pengguna. Percobaan DDL membatalkan transaksi. Rencanakan perubahan skema terpisah dari lalu lintas transaksi, dan desain kode transaksi agar setiap koleksi yang disentuh sudah ada saat runtime.

```javascript
// Ini membatalkan transaksi dengan error:
await session.withTransaction(async () => {
  await db.createCollection("audit_log", { session }); // DDL tidak diizinkan dalam txn
  await db.collection("audit_log").insertOne({ kind: "order_placed" }, { session });
});
```

### 8. Hormati Batas Ukuran dan Waktu

Selain batas waktu eksekusi 60 detik, transaksi menulis ke oplog seperti operasi lainnya: total ukuran tulisan sebuah transaksi dibatasi oleh **ukuran maksimum entri oplog (16 MB secara bawaan)** pada deployment MongoDB 4.0, dan meskipun versi lebih baru melonggarkan batasan ini, transaksi yang sangat besar tetap menekan oplog dan memori secara signifikan. Jika Anda perlu menerapkan ribuan tulisan secara atomik, pertanyakan desainnya: sering kali jaminan yang sama dapat dicapai dengan dokumen "pekerjaan batch" tunggal ditambah flag komit yang berversi.

### 9. Gunakan Konsistensi Kausal untuk Merangkai Baca Setelah Tulis

Di luar satu transaksi, pembacaan yang langsung mengikuti penulisan dapat dilayani oleh secondary yang belum mereplikasi tulisan itu. Session menyediakan **konsistensi kausal**: ketika Anda menjalankan operasi dalam session yang sama, pembacaan berikutnya dijamin melihat semua yang telah ditulis session tersebut (dan dependensinya). Ini cara termurah untuk mendapatkan jaminan read-your-writes di antara operasi tanpa membungkus semuanya dalam transaksi.

```javascript
const session = client.startSession();
try {
  await profiles.updateOne({ _id: userId }, { $set: { name } }, { session });
  // Pembacaan ini konsisten secara kausal dengan tulisan di atas:
  const profile = await profiles.findOne({ _id: userId }, { session });
} finally {
  await session.endSession();
}
```

### 10. Pantau Transaksi Sebelum Menskalakannya

Transaksi yang sering gagal adalah gejala desain yang buruk. Pantau seperti sinyal produksi lainnya: `db.currentOp()` menampilkan transaksi yang berjalan beserta `lsid` dan `txnNumber`-nya, dan metrik `serverStatus` memaparkan jumlah transaksi. Beri peringatan ketika tingkat `WriteConflict` naik sebelum pengguna menyadari latensi yang memburuk. Lihat Langkah 7 untuk perintah persisnya.

## Langkah Implementasi

### Langkah 1: Verifikasi Prasyarat

Transaksi multi-dokumen memerlukan replica set atau klaster sharded — **bukan** `mongod` standalone. Konfirmasikan lingkungan Anda, lalu hubungkan dengan driver Node.js. Untuk klaster sharded, gunakan MongoDB 4.2+ dan pastikan setiap koleksi yang disentuh transaksi sudah ada.

```bash
# Periksa bahwa Anda terhubung ke replica set
mongosh --eval 'rs.status().ok'
# 1 berarti mode replica set; "NotYetInitialized" berarti set sudah ada tetapi perlu
# rs.initiate(). Server standalone melempar "not running with --replSet".
```

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI, {
  retryWrites: true, // mengaktifkan retryable writes pada server yang didukung
});
await client.connect();
```

### Langkah 2: Jalankan Transaksi Multi-Dokumen Pertama Anda

Gunakan `session.withTransaction()` dengan operasi bisnis bergaya `updateMany`. Contoh klasiknya adalah transfer dana: debit satu rekening, kredit rekening lain, secara atomik.

```javascript
async function transfer(client, fromId, toId, amount) {
  const db = client.db("banking");
  const accounts = db.collection("accounts");
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const debit = await accounts.updateOne(
        { _id: fromId, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { session }
      );
      if (debit.matchedCount === 0) {
        throw new Error("saldo tidak mencukupi atau rekening tidak ditemukan");
      }
      await accounts.updateOne(
        { _id: toId },
        { $inc: { balance: amount } },
        { session }
      );
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" }
    });

    console.log(`transfer ${fromId} -> ${toId} sebesar ${amount} berhasil dikomit`);
  } finally {
    await session.endSession();
  }
}

await transfer(client, "alice", "bob", 100);
// Jika salah satu langkah melempar error, transaksi dibatalkan dan tidak ada yang tersimpan.
```

Perhatikan aturan bisnis yang dikodekan di filter: `balance: { $gte: amount }` membuat pemeriksaan-dan-debit atomik di dalam transaksi, sehingga double-spend tidak bisa lolos meskipun dua transfer berjalan bersamaan.

### Langkah 3: Tangani Error Transien dan Konflik Tulis

Meskipun memakai `withTransaction`, Anda tetap perlu memahami dan, jika perlu, mengamati perilaku percobaan ulang. Jalankan dua transfer bersamaan yang menyentuh dokumen yang sama untuk melihat `WriteConflict` dibatalkan lalu dicoba ulang:

```javascript
// Jalankan keduanya secara paralel dengan dua klien/session terpisah
const [r1, r2] = await Promise.allSettled([
  transfer(clientA, "alice", "bob", 50),
  transfer(clientB, "alice", "carol", 30),
]);

// Salah satunya mungkin membutuhkan beberapa percobaan sebelum loop percobaan ulang
// withTransaction pada driver berhasil. Periksa hasilnya:
console.log(r1.status, r2.status);
// Keduanya pada akhirnya harus "fulfilled"; hasil "rejected" berarti anggaran
// percobaan ulang habis (terlalu banyak konflik pada dokumen yang sangat panas).
```

Untuk transaksi manual, bungkus alurnya dengan loop percobaan ulang dari Praktik Terbaik 5 dan catat label error yang Anda amati:

```bash
# Di sisi server, amati metrik konflik sambil menekan dokumen yang sama:
mongosh --eval 'db.serverStatus().metrics.transactions'
```

### Langkah 4: Terapkan Kontrol Konkurensi Optimistis dengan Kolom Versi

Transaksi tidak mencegah konflik logis — transaksi hanya memunculkannya sebagai abort. Untuk alur read-modify-write yang ingin mendeteksi pembaruan basi tanpa mengunci, tambahkan kolom `version` dan increment pada setiap tulisan. Update mencocokkan `version`; jika dokumen berubah di bawah Anda, `matchedCount` menjadi 0 dan pemanggil memutuskan apakah akan mencoba ulang dengan versi terbaru atau melaporkan konflik ke pengguna.

```javascript
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    const doc = await documents.findOne({ _id: docId }, { session });
    if (!doc) throw new Error("dokumen tidak ditemukan");

    const result = await documents.updateOne(
      { _id: docId, version: doc.version },
      { $set: { content: newContent }, $inc: { version: 1 } },
      { session }
    );
    if (result.matchedCount === 0) {
      throw new Error("terdeteksi modifikasi bersamaan — muat ulang lalu coba lagi");
    }
  });
} finally {
  await session.endSession();
}
```

Pola ini menyatu secara alami dengan transaksi: pemeriksaan konflik, tulisan, dan kenaikan versi semuanya komit secara atomik, dan editor yang bersamaan diberi tahu persis versi mana yang kalah.

### Langkah 5: Rangkaikan Transaksi dengan Konsistensi Kausal

Ketika sebuah alur bisnis membutuhkan beberapa transaksi (masing-masing dengan snapshot sendiri) yang harus saling melihat tulisan, jalankan dalam **session yang sama**. Konsistensi kausal menjamin snapshot transaksi kedua mencakup tulisan terkomit dari transaksi pertama.

```javascript
const session = client.startSession();
try {
  // Transaksi 1: buat pesanan
  await session.withTransaction(async () => {
    await orders.insertOne(order, { session });
  }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });

  // Transaksi 2: baca kembali pesanan lalu perbarui profil pelanggan.
  // Berkat session bersama, snapshot ini pasti memuat order.
  await session.withTransaction(async () => {
    const created = await orders.findOne({ _id: order._id }, { session });
    await profiles.updateOne(
      { _id: customerId },
      { $push: { orderIds: created._id } },
      { session }
    );
  }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
} finally {
  await session.endSession();
}
```

Tanpa session bersama, transaksi kedua bisa membaca dari secondary atau snapshot yang lebih lama yang belum memuat order — bug klasik dalam sistem terdistribusi.

### Langkah 6: Setel Concern dan Batas untuk Produksi

Tetapkan bawaan di level klien dan server sehingga kode aplikasi tidak perlu mengulanginya:

```javascript
const client = new MongoClient(uri, {
  retryWrites: true,
  writeConcern: { w: "majority", j: true },
  readConcern: { level: "snapshot" },
});
```

Di sisi server, batas masa hidup transaksi bawaan 60 detik dapat dinaikkan untuk transaksi administratif jangka panjang yang sah — tetapi perlakukan kebutuhan untuk menaikkannya sebagai tanda bahwa transaksi melakukan terlalu banyak pekerjaan:

```bash
# Periksa batas saat ini
mongosh --eval 'db.adminCommand({ getParameter: 1, transactionLifetimeLimitSeconds: 1 })'

# Naikkan (lanjutan, dengan alasan yang jelas) — butuh restart kecuali memakai setParameter
mongosh --eval 'db.adminCommand({ setParameter: 1, transactionLifetimeLimitSeconds: 300 })'
```

Untuk klaster sharded, jaga `readPreference` transaksi tetap `primary` dan ingat bahwa operasi harus menyasar koleksi yang sudah ada; transaksi tidak dapat membuat koleksi dengan cepat saat itu juga.

### Langkah 7: Pantau Kesehatan Transaksi

Gunakan perintah-perintah ini untuk melihat transaksi aktif dan metrik jangka panjang:

```bash
# Tampilan langsung transaksi yang sedang berjalan (termasuk lsid dan txnNumber-nya)
mongosh --eval 'db.currentOp({ "transaction": { $exists: true } })'

# Penghitung kumulatif: dimulai, dikomit, dibatalkan, dan jumlah konflik
mongosh --eval 'db.serverStatus().metrics.transactions'

# Transaksi lambat: cari "transaction" di log profiling
mongosh --eval 'db.setProfilingLevel(1, { slowms: 100 })'
```

Sistem yang sehat jarang membatalkan transaksi. Jika `transactions.aborted` tumbuh lebih cepat daripada `transactions.committed`, tinjau kembali Praktik Terbaik 3 dan 5: beban kerja memukul dokumen panas atau tidak mencoba ulang dengan benar. Lacak `totalTransactionsTimedOut` untuk transaksi yang melebihi batas masa hidup — hampir selalu akibat I/O eksternal di dalam jendela transaksi.

## Kesimpulan

Transaksi multi-dokumen memberi aplikasi MongoDB jaminan ACID yang sesungguhnya, tetapi transaksi adalah alat konkurensi, bukan jalan pintas performa. Disiplin yang menjaganya tetap sehat sama dengan disiplin yang menjaga sistem konkuren apa pun tetap sehat: jaga bagian kritis tetap pendek, minimalkan kontensi pada dokumen bersama, coba ulang pada error transien dengan semantik yang benar, dan buat penanganan komit idempoten. Dikombinasikan dengan konsistensi kausal untuk pembacaan lintas transaksi dan kolom versi optimistis untuk deteksi konflik logis, transaksi MongoDB mencakup seluruh spektrum — dari jaminan finansial yang ketat hingga alur kerja kolaboratif optimistis — selama Anda mendesain untuk konflik yang akan dilemparkan storage engine kepada Anda.

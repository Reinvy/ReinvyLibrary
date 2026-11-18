---
title: "Panduan Multi-Tenancy dan Isolasi Data MongoDB"
description: "Panduan produksi menjalankan beban kerja multi-tenant di MongoDB: model isolasi, indeks dan shard key yang sadar tenant, penegakan di level database, otomasi provisi, penjaga noisy neighbor, dan pengujian kebocoran data."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Multi-Tenancy dan Isolasi Data MongoDB

## Pendahuluan

Multi-tenancy mengubah satu deployment MongoDB menjadi lapisan penyimpanan bagi banyak pelanggan sekaligus. Bagian sulitnya bukanlah "apakah MongoDB bisa menyimpan dokumen yang diberi tanda tenant id" — melainkan menjamin bahwa satu tenant tidak akan pernah membaca, menulis, atau menurunkan performa data tenant lain, serta bahwa jaminan itu tetap bertahan melewati perubahan skema, perubahan indeks, job massal, dan insiden yang pasti terjadi ketika sebuah query lupa menyertakan filter tenant.

Sebagian besar gangguan multi-tenant MongoDB masuk ke salah satu dari tiga kategori: query yang diam-diam kehilangan filter tenant dan mengembalikan dokumen pelanggan lain, indeks yang berhenti selektif karena kunci tenant tidak berada di depan, atau satu tenant besar yang menghabiskan koneksi, cache, dan IOPS milik semua orang. Tidak satu pun dari ketiganya terselesaikan hanya dengan review kode aplikasi. Semuanya diselesaikan dengan memilih model isolasi secara sadar, menegakkannya di level database, dan merancang indeks serta shard key berdasarkan kunci tenant sejak dokumen pertama.

Model isolasi yang umum, berurutan menurut tingkat pemisahan:

```text
| Model                     | Isolasi | Kepadatan | Biaya operasional | Cocok untuk                                    |
|---------------------------|---------|-----------|-------------------|------------------------------------------------|
| Koleksi bersama           | Rendah  | Tertinggi | Terendah          | Ribuan tenant kecil, ekor panjang SaaS         |
| Koleksi per tenant        | Sedang  | Tinggi    | Rendah            | Ratusan tenant, butuh ekspor per tenant        |
| Database per tenant       | Tinggi  | Sedang    | Sedang            | Tenant teregulasi, residensi data ketat        |
| Cluster per tenant        | Tertinggi | Terendah | Tertinggi         | Kontrak enterprise/on-prem                     |
```

Panduan ini mengasumsikan model koleksi bersama atau database per tenant — dua model yang paling banyak dijalankan tim nyata — dan membahas keputusan yang membuat keduanya aman di produksi.

## Praktik Terbaik

### 1. Pilih Model Isolasi Sebelum Dokumen Pertama

Isolasi adalah keputusan skema, bukan keputusan deployment. Berpindah dari koleksi bersama ke database per tenant setelah peluncuran berarti memigrasikan data setiap tenant dan menulis ulang setiap query, yang setara dengan pekerjaan satu kuartal. Putuskan sejak awal dengan tiga masukan: berapa banyak tenant yang diperkirakan (ribuan versus puluhan), isolasi kontraktual atau regulasi apa yang dibutuhkan tiap tingkatan, dan apakah ekspor atau penghapusan permanen per tenant merupakan kebutuhan produk.

Pola yang pragmatis adalah isolasi bertingkat: ekor panjang tenant kecil berbagi koleksi dengan `tenantId` wajib, sementara tenant enterprise dengan isolasi kontraktual mendapat database sendiri. Aplikasi menanyakan registry tenant untuk mendapatkan binding penyimpanan tenant dan tidak pernah menebak.

```javascript
// registry tenant — satu dokumen per pelanggan, menyimpan binding penyimpanan
db.tenants.insertOne({
  _id: ObjectId("66f1c2a8f1d3b4e5a7c9d001"),
  slug: "acme",
  tier: "enterprise",
  isolation: "database",          // "shared" | "database"
  databaseName: "tenant_acme",
  status: "active",
  dataResidency: "eu-central",
  createdAt: new Date()
});
```

### 2. Pastikan tenantId Wajib, Tidak Berubah, dan Terindeks

Pada model koleksi bersama, `tenantId` adalah bagian dari jalur akses utama. Perlakukan seperti komponen primary key: ada di setiap dokumen, tidak pernah diubah, dan selalu menjadi field pertama pada setiap indeks komposit. Gunakan tipe yang stabil dan ringkas — `ObjectId` atau slug string pendek — dan konsisten di seluruh koleksi. Mencampur identifier tenant bertipe `ObjectId` dan string antar koleksi adalah sumber bug join yang dapat diandalkan pada pipeline `$lookup` dan sumber indeks yang tidak pernah terpakai.

Tegakkan sifat tidak berubah dengan validasi skema agar update yang salah tidak dapat memindahkan dokumen antar tenant:

```javascript
db.orders.createIndex({ tenantId: 1, createdAt: -1 });

db.runCommand({
  collMod: "orders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["tenantId", "status", "createdAt"],
      properties: {
        tenantId: { bsonType: ["objectId", "string"] },
        status: { enum: ["pending", "paid", "shipped", "cancelled"] },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### 3. Awali Setiap Indeks Komposit dengan Kunci Tenant

MongoDB hanya dapat memakai indeks secara efisien bila prefiksnya cocok dengan bentuk query. Indeks pada `{ status: 1, createdAt: -1 }` memaksa pemindaian lintas semua tenant sebelum memfilter; `{ tenantId: 1, status: 1, createdAt: -1 }` hanya menyentuh rentang milik tenant peminta. Selisihnya pada cluster dengan 500 tenant sering mencapai dua orde besaran dalam jumlah dokumen yang diperiksa.

Aturan ini berlaku juga untuk partial index, text index, dan TTL index: `tenantId` berada di depan. Verifikasi dengan `explain("executionStats")` bahwa `totalKeysExamined` sebanding dengan data tenant tersebut, bukan ukuran total koleksi.

### 4. Tegakkan Isolasi di Level Database, Bukan Hanya di Kode

Pemfilteran di level aplikasi pada akhirnya akan gagal — sebuah background job, skrip admin, atau endpoint baru akan lupa menyertakan predikat tenant. Pertahanan berlapis berarti database menolak akses lintas tenant bahkan ketika query-nya salah. Dua mekanisme yang tersedia saat ini: user database per tenant dengan role yang dibatasi pada databasenya sendiri, dan view yang menanamkan filter tenant sehingga pemanggil tidak dapat menghilangkannya.

Untuk database per tenant, batasi kredensial setiap tenant pada databasenya sendiri dan jangan pernah memberi aplikasi user admin tingkat cluster:

```javascript
db.getSiblingDB("tenant_acme").createUser({
  user: "app_acme",
  pwd: passwordPrompt(),
  roles: [{ role: "readWrite", db: "tenant_acme" }]
});
```

Untuk koleksi bersama, tampilkan view per tenant alih-alih koleksi mentah pada jalur pelaporan dan analitik:

```javascript
db.createView("orders_acme", "orders", [
  { $match: { tenantId: ObjectId("66f1c2a8f1d3b4e5a7c9d001") } }
]);
```

### 5. Berbagi Connection Pool Kecuali Tenant Benar-Benar Berat

Setiap `MongoClient` memelihara pool-nya sendiri, dan pool itu mahal: 100 koneksi per tenant dikalikan 300 tenant akan menghabiskan `maxIncomingConnections` jauh sebelum beban kerjanya berat. Berbagi satu client dan satu pool untuk model koleksi bersama, dan gunakan client per tenant hanya untuk tenant dengan database terpisah atau trafik yang terbukti berat. Bila memang mengisolasi pool, batasi secara sengaja dengan `maxPoolSize` agar satu tenant tidak dapat menghabiskan anggaran koneksi deployment.

### 6. Rancang Shard Key Berdasarkan Kunci Tenant

Untuk cluster sharded, kunci tenant hampir selalu merupakan prefiks shard key yang tepat: `{ tenantId: 1, _id: 1 }` (hashed atau ranged) menjaga data satu tenant pada sedikit shard, sehingga sebagian besar query tenant tetap targeted alih-alih scatter-gather ke semua shard. Shard key yang mengabaikan tenant — misalnya `{ createdAt: 1 }` — membuat setiap pembacaan tenant menjadi siaran, dan itulah penyebab paling umum keluhan "MongoDB lambat" pada deployment multi-tenant.

Perhatikan masalah hot tenant: kunci ranged pada nilai yang terus meningkat memusatkan write ke satu shard. `tenantId` hashed menyebarkan write tetapi memencar pembacaan tiap tenant; `tenantId` ranged menjaga pembacaan tetap targeted namun dapat menciptakan hotspot untuk tenant yang sangat besar. Tenant besar pada kunci ranged lebih baik dipisahkan ke database atau cluster khusus.

### 7. Cegah Noisy Neighbor Secara Eksplisit

Keadilan tidak muncul dengan sendirinya. Satu tenant yang menjalankan agregasi pelaporan dapat mengusir working set semua tenant lain dari cache WiredTiger. Penjagaan yang praktis: rate limit per tenant di lapisan aplikasi, `maxTimeMS` pada setiap query yang dijalankan atas nama pengguna, projection yang agresif agar dokumen lebar tidak terambil tanpa perlu, dan metrik per tenant sehingga tekanan cache serta IOPS dapat diatribusikan ke pelanggan tertentu alih-alih ditebak.

### 8. Rancang Residensi Data, Ekspor, dan Penghapusan Sejak Awal

Tenant teregulasi menuntut tiga hal yang mudah dirancang dan menyakitkan untuk ditambahkan belakangan: data tersimpan di region tertentu, ekspor data mereka secara utuh, dan penghapusan yang dapat dibuktikan. Region diselesaikan oleh model isolasi (cluster atau database terpisah di region yang diwajibkan). Ekspor dan penghapusan diselesaikan dengan memelihara manifes tenant-ke-koleksi — daftar otoritatif setiap koleksi yang menyimpan dokumen tenant tersebut — sehingga penghapusan menjadi sapuan berskrip atas manifes, bukan proyek arkeologi.

### 9. Otomasi Provisi dan Deprovisi Secara Idempoten

Provisi tenant adalah operasi deployment dan harus berupa satu rutin idempoten: buat indeks, terapkan validator, isi data referensi, daftarkan tenant, dan setel kuota. Jalankan dua kali dan hasilnya harus identik. Deprovisi harus berupa soft-delete lebih dulu (tandai tenant `suspended`, cabut kredensial, pertahankan data selama jendela kontraktual) lalu pembersihan permanen yang tercatat dan dapat diverifikasi.

### 10. Uji Kebocoran Lintas Tenant Seperti Menguji Autentikasi

Perlakukan kebocoran tenant sebagai pengujian keamanan, bukan pelengkap QA. Pertahankan fixture dengan dua tenant yang datanya sengaja dibuat mirip, lalu pastikan setiap jalur baca hanya mengembalikan dokumen milik pemanggil dan setiap jalur tulis menolak payload yang membawa identifier tenant lain. Jalankan di CI; pengujian ini menangkap query yang kehilangan filternya berbulan-bulan sebelum pelanggan menemukannya.

## Langkah Implementasi

### Langkah 1: Modelkan Tenant dan Pilih Strategi Isolasi

Mulai dari registry tenant dan tuliskan keputusan per tingkatan. Jaga registry tetap kecil dan stabil — ia dibaca pada hampir setiap permintaan dan harus di-cache di aplikasi.

```javascript
db.tenants.createIndex({ slug: 1 }, { unique: true });
db.tenants.createIndex({ status: 1, tier: 1 });

// ekor panjang berbagi koleksi; tenant enterprise mendapat database sendiri
db.tenants.insertMany([
  { slug: "acme", tier: "enterprise", isolation: "database", databaseName: "tenant_acme", status: "active" },
  { slug: "smallco", tier: "growth", isolation: "shared", status: "active" }
]);
```

### Langkah 2: Bangun Lapisan Akses Data yang Sadar Tenant

Setiap query di aplikasi harus dibangun dari konteks tenant, tidak pernah dari handle koleksi mentah. Bungkus driver sehingga filter tenant disuntikkan secara konstruktif, bukan diingat oleh penulis kode.

```javascript
import { MongoClient, ObjectId } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI, {
  maxPoolSize: 50,
  retryWrites: true,
  serverSelectionTimeoutMS: 5000
});

export function tenantScope(tenant, collectionName) {
  const db = tenant.isolation === "database"
    ? client.db(tenant.databaseName)
    : client.db("app");

  const base = db.collection(collectionName);
  if (tenant.isolation === "database") return base;

  // model bersama — filter tenant diterapkan di sini dan tidak dapat dihilangkan di atasnya
  const tenantId = new ObjectId(tenant.id);
  return {
    find: (filter = {}, options = {}) => base.find({ ...filter, tenantId }, options),
    findOne: (filter = {}, options = {}) => base.findOne({ ...filter, tenantId }, options),
    insertOne: (doc, options = {}) => base.insertOne({ ...doc, tenantId }, options),
    updateOne: (filter, update, options = {}) => base.updateOne({ ...filter, tenantId }, update, options),
    deleteOne: (filter, options = {}) => base.deleteOne({ ...filter, tenantId }, options)
  };
}
```

### Langkah 3: Buat Indeks Berprefiks Tenant dan Verifikasi

Buat indeks dengan `tenantId` di depan untuk setiap koleksi yang melayani query berlingkup tenant, lalu pastikan melalui explain plan bahwa indeks benar-benar terpilih dan pemeriksaan kunci tetap sebanding dengan ukuran tenant.

```javascript
db.orders.createIndex({ tenantId: 1, createdAt: -1 });
db.orders.createIndex({ tenantId: 1, status: 1, updatedAt: -1 });
db.invoices.createIndex({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
db.audit_events.createIndex({ tenantId: 1, occurredAt: 1 }, { expireAfterSeconds: 7776000 });
```

```javascript
const plan = db.orders.find({
  tenantId: ObjectId("66f1c2a8f1d3b4e5a7c9d001"),
  status: "paid"
}).sort({ createdAt: -1 }).limit(50).explain("executionStats");

printjson({
  indexUsed: plan.queryPlanner.winningPlan.inputStage?.indexName ?? "COLLSCAN",
  keysExamined: plan.executionStats.totalKeysExamined,
  docsExamined: plan.executionStats.totalDocsExamined,
  returned: plan.executionStats.nReturned
});
```

Bila `docsExamined` kira-kira sama dengan `returned`, prefiks tenant bekerja. Bila `docsExamined` membesar mengikuti ukuran total koleksi, ada indeks yang kehilangan kunci tenant atau query tidak memakainya.

### Langkah 4: Tegakkan Isolasi dengan Validator, View, dan Kredensial Terbatas

Terapkan validasi skema pada setiap koleksi bersama, buat view per tenant untuk pelaporan, dan terbitkan kredensial yang dibatasi pada database tersempit yang memenuhi kebutuhan.

```javascript
db.runCommand({
  collMod: "invoices",
  validator: { $jsonSchema: { bsonType: "object", required: ["tenantId", "invoiceNumber", "total"] } },
  validationLevel: "strict"
});

db.createView("orders_smallco", "orders", [
  { $match: { tenantId: ObjectId("66f1c2a8f1d3b4e5a7c9d002") } }
]);

db.getSiblingDB("tenant_acme").createUser({
  user: "reporting_acme",
  pwd: passwordPrompt(),
  roles: [{ role: "read", db: "tenant_acme" }]
});
```

### Langkah 5: Otomasi Provisi dan Deprovisi

Provisi harus idempoten agar percobaan ulang aman. Deprovisi harus mencabut akses lebih dulu dan menghapus data terakhir, dengan jejak audit.

```javascript
async function provisionTenant(slug, tier) {
  const db = client.db(`tenant_${slug}`);

  await db.collection("orders").createIndex({ tenantId: 1, createdAt: -1 });
  await db.collection("invoices").createIndex({ tenantId: 1, invoiceNumber: 1 }, { unique: true });

  await client.db("app").collection("tenants").updateOne(
    { slug },
    { $set: { slug, tier, isolation: "database", databaseName: `tenant_${slug}`, status: "active" } },
    { upsert: true }
  );

  return { slug, databaseName: `tenant_${slug}` };
}

async function suspendTenant(slug) {
  await client.db("app").collection("tenants").updateOne(
    { slug },
    { $set: { status: "suspended", suspendedAt: new Date() } }
  );
  // cabut kredensial segera; pembersihan data berjalan setelah jendela retensi
  await client.db(`tenant_${slug}`).command({ dropAllUsersFromDatabase: 1 });
}
```

### Langkah 6: Tambahkan Penjaga Noisy Neighbor dan Observabilitas per Tenant

Batasi radius dampak satu tenant dengan timeout query, kuota, dan metrik bertag tenant sehingga atribusi dapat dilakukan saat insiden.

```javascript
// setiap query yang menghadap pengguna membawa batas waktu
const cursor = tenantScope(tenant, "orders")
  .find({ status: "paid" }, { maxTimeMS: 2000, projection: { tenantId: 1, total: 1, createdAt: 1 } });

// kuota tulis per tenant ditegakkan oleh koleksi counter
async function consumeWriteQuota(tenantId, limitPerHour) {
  const bucket = new Date().toISOString().slice(0, 13);
  const res = await client.db("app").collection("write_quotas").findOneAndUpdate(
    { tenantId, bucket },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  if (res.value.count > limitPerHour) {
    throw new Error(`Kuota tulis terlampaui untuk tenant ${tenantId}`);
  }
}
```

```bash
# atribusikan tekanan tingkat koleksi ke tenant
mongosh --quiet --eval '
  db.getSiblingDB("app").orders.aggregate([
    { $group: { _id: "$tenantId", docs: { $sum: 1 }, bytes: { $sum: { $bsonSize: "$$ROOT" } } } },
    { $sort: { bytes: -1 } }, { $limit: 10 }
  ]).forEach(printjson)
'
```

### Langkah 7: Jalankan Suite Pengujian Kebocoran Lintas Tenant

Bangun fixture dengan dua tenant yang datanya hampir identik, lalu pastikan isolasi pada setiap jalur. Pengujian harus gagal dengan jelas bila sebuah query mengembalikan dokumen yang `tenantId`-nya berbeda dari milik pemanggil.

```javascript
import assert from "node:assert/strict";

const tenantA = { id: "66f1c2a8f1d3b4e5a7c9d001", isolation: "shared" };
const tenantB = { id: "66f1c2a8f1d3b4e5a7c9d002", isolation: "shared" };

async function assertNoLeakage() {
  const aOrders = await tenantScope(tenantA, "orders").find({}).toArray();
  const bOrders = await tenantScope(tenantB, "orders").find({}).toArray();

  for (const doc of aOrders) {
    assert.equal(doc.tenantId.toHexString(), tenantA.id, "pembacaan tenant A hanya boleh mengembalikan dokumen A");
  }
  for (const doc of bOrders) {
    assert.equal(doc.tenantId.toHexString(), tenantB.id, "pembacaan tenant B hanya boleh mengembalikan dokumen B");
  }

  // penulisan yang membawa tenantId asing tidak boleh masuk ke lingkup pemanggil
  await assert.rejects(
    tenantScope(tenantA, "orders").insertOne({ tenantId: new ObjectId(tenantB.id), status: "pending" })
  );
  console.log(`ok — tidak ada kebocoran pada ${aOrders.length + bOrders.length} dokumen`);
}
```

## Kesimpulan

Multi-tenancy di MongoDB ditentukan di tiga tempat: model isolasi, desain indeks dan shard key, serta lapisan penegakan yang mencegah filter yang terlupa menjadi kebocoran data. Pilih model per tingkatan, awali setiap indeks dengan kunci tenant, tegakkan tenancy dengan validator, view, dan kredensial terbatas, batasi noisy neighbor dengan timeout dan kuota, serta pelihara pengujian kebocoran di CI. Tim yang menjalankan kelima hal tersebut dapat melayani ribuan tenant pada satu deployment tanpa pernah harus menjelaskan kepada pelanggan bagaimana data pelanggan lain muncul di dasbor mereka.

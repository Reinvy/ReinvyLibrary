---
title: "Panduan Optimasi Kinerja dan Monitoring MongoDB"
description: "Panduan komprehensif untuk mengoptimalkan kinerja MongoDB — mencakup profiling query, strategi indeks, penyesuaian konfigurasi, alat monitoring, dan praktik terbaik operasional produksi."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Optimasi Kinerja dan Monitoring MongoDB

## Pendahuluan

MongoDB adalah database dokumen berkinerja tinggi, namun mencapai kinerja optimal di produksi membutuhkan penyesuaian yang disengaja, pemantauan, dan perawatan proaktif. Tanpa perhatian yang tepat, beban kerja yang awalnya cepat dapat menurun seiring waktu karena volume data yang terus bertambah, query yang tidak dioptimalkan, dan konfigurasi yang kurang ideal.

Panduan ini memberikan pendekatan sistematis untuk optimasi kinerja dan monitoring MongoDB. Anda akan mempelajari cara mengidentifikasi query lambat melalui profiling, merancang indeks efektif menggunakan pola yang terbukti, menyesuaikan mesin penyimpanan WiredTiger, mengonfigurasi connection pooling, dan menyiapkan monitoring komprehensif untuk mendeteksi regresi sebelum berdampak pada pengguna. Setiap bagian membangun menuju alur kerja implementasi praktis yang dapat Anda terapkan pada deployment MongoDB mana pun.

## Praktik Terbaik

### Profiling dan Analisis Query

Lakukan profiling operasi lambat untuk mengidentifikasi target optimasi sebelum melakukan perubahan.

- **Aktifkan profiling secara selektif**: Gunakan `db.setProfilingLevel(1, { slowms: 100 })` untuk menangkap operasi yang lebih lambat dari 100ms di produksi. Hindari level 2 (mencatat semua operasi) kecuali di lingkungan pengembangan atau replika dengan lalu lintas rendah — karena dapat menurunkan throughput.
- **Periksa koleksi system.profile**: Ambil operasi lambat dengan `db.system.profile.find().sort({ ts: -1 }).limit(20).pretty()`. Fokus pada query dengan `millis` yang tinggi, `nreturned` yang besar, atau `nreturned` nol dengan pemindaian koleksi penuh (`COLLSCAN`).
- **Gunakan explain() untuk analisis tertarget**: Sebelum mengoptimalkan query apa pun, jalankan `db.collection.explain("executionStats").find(...)` untuk memeriksa `totalDocsExamined`, `totalKeysExamined`, dan `executionTimeMillisEstimate`. Metrik utamanya: query yang memeriksa lebih banyak dokumen daripada yang dikembalikan kemungkinan membutuhkan indeks yang lebih baik.
- **Pantau operasi yang sedang berjalan**: Jalankan `db.currentOp({"secs_running": {$gte: 5}})` untuk menemukan query yang berjalan lebih dari 5 detik. Periksa bidang `planSummary` — `COLLSCAN` mengindikasikan pemindaian koleksi penuh, yang merupakan sinyal kuat untuk indeks yang hilang.

### Desain dan Optimasi Indeks

Indeks yang dirancang dengan baik adalah optimasi dengan dampak tertinggi untuk kinerja query.

- **Terapkan aturan ESR (Equality-Sort-Range)**: Saat merancang indeks gabungan, tempatkan bidang yang diuji untuk kesamaan (equality) terlebih dahulu, kemudian bidang pengurutan (sort), lalu filter rentang (range). Untuk query seperti `db.orders.find({ status: "active", region: "US" }).sort({ created_at: -1 }).limit(20)`, indeks pada `{ status: 1, region: 1, created_at: -1 }` mengikuti ESR dan menghindari pengurutan dalam memori.
- **Buat indeks untuk mendukung semua query aktif**: Gunakan `db.collection.aggregate([ { $indexStats: {} } ])` untuk melihat penggunaan indeks. Hapus indeks yang tidak digunakan — karena memakan memori dan memperlambat penulisan. Targetkan sebagian besar query mengembalikan `totalDocsExamined` mendekati `totalKeysExamined` (covered query adalah yang ideal).
- **Manfaatkan covered query**: Ketika semua bidang yang diperlukan oleh query sudah ada di dalam indeks, MongoDB tidak perlu menyentuh halaman data. Tambahkan bidang yang sering diakses ke indeks sebagai bidang _proyeksi_ untuk memaksimalkan peluang covered query.
- **Gunakan indeks parsial dan sparse untuk beban kerja tertarget**: Indeks parsial seperti `db.users.createIndex({ "email": 1 }, { partialFilterExpression: { "status": "active" } })` lebih kecil dan lebih cepat daripada indeks penuh ketika sebagian besar query memfilter dengan `status: "active"`.
- **Index intersection sebagai cadangan**: Ketika membuat indeks gabungan untuk setiap kombinasi query tidak praktis, MongoDB dapat menggunakan beberapa indeks secara paralel melalui index intersection. Pantau `nReturned` vs `totalKeysExamined` di `explain()` — kesenjangan besar menandakan bahwa intersection memindai lebih banyak entri indeks dari yang diperlukan.

### Penyesuaian Mesin Penyimpanan WiredTiger

Mesin WiredTiger menyediakan parameter yang secara signifikan memengaruhi kinerja baca dan tulis.

- **Konfigurasi cache WiredTiger dengan tepat**: Atur `wiredTigerCacheSizeGB` hingga 50-80% dari RAM yang tersedia dikurangi kebutuhan OS dan proses lain. Cache yang terlalu kecil memaksa eviksi dan page fault yang sering terjadi; yang terlalu besar akan membuat OS kekurangan memori dan dapat menyebabkan OOM kill. Di server MongoDB khusus, 80% adalah titik awal yang aman.
- **Pantau perilaku cache**: Lacak `wiredTiger.cache.tracked dirty bytes in the cache` dan `wiredTiger.cache.tracked pages read into cache` melalui `db.serverStatus()`. Tingkat eviksi yang tinggi (lebih dari 20 eviksi per detik per inti) menandakan cache terlalu kecil untuk working set.
- **Sesuaikan pengaturan kompresi**: WiredTiger mengompresi data (`blockCompressor: snappy`) dan indeks (`indexPrefixCompression: true`). Snappy menyeimbangkan rasio kompresi dan kecepatan. Untuk beban kerja dengan penulisan berat, pertimbangkan zstd (kompresi lebih baik, CPU lebih tinggi) atau nonaktifkan kompresi untuk write-ahead log dengan `wiredTigerJournalCompressor: none`.
- **Sesuaikan checkpoint dan journal**: Interval checkpoint default (60 detik) aman untuk sebagian besar beban kerja. Untuk penyisipan massal, atur sementara `storage.journal.commitIntervalMs: 500` dan kelompokkan penulisan untuk mengurangi frekuensi flush journal.

### Connection Pooling dan Pola Aplikasi

Manajemen koneksi yang efisien mencegah kehabisan sumber daya di bawah beban.

- **Sesuaikan ukuran connection pool**: Sebagian besar driver default ke 100 koneksi per pool. Untuk beban kerja tipikal, 10–50 koneksi per instance aplikasi sudah memadai. Pantau `connections.current` melalui `db.serverStatus().connections` — jika secara teratur melebihi 80% dari `maxIncomingConnections`, tingkatkan pool dan pengaturan `net.maxIncomingConnections` MongoDB secara bersamaan.
- **Lebih suka connection pool daripada membuat koneksi baru**: Setiap koneksi baru menghabiskan thread dan memori di server. Gunakan pool bawaan driver (misalnya, `MongoClient` dengan `maxPoolSize` di driver Node.js, `MongoClientSettings.MaxConnectionPoolSize` di .NET) daripada membuka dan menutup koneksi secara manual.
- **Gunakan read preference dan write concern secara bijaksana**: Atur `readPreference: secondaryPreferred` untuk query analitik atau pelaporan guna mengalihkan beban dari primary. Gunakan `writeConcern: { w: "majority" }` hanya untuk data kritis; pertimbangkan `w: 1` atau `w: 0` untuk penulisan non-kritis dengan throughput tinggi.
- **Kelompokkan penulisan dalam operasi bulk**: Ganti panggilan `insertOne()` individual dengan `bulkWrite()` atau `insertMany()`. Mengelompokkan 100–1000 dokumen per operasi dapat meningkatkan throughput penulisan 10–50× dibandingkan penyisipan satu per satu.

### Monitoring dan Alerting

Monitoring proaktif mendeteksi regresi kinerja sebelum menjadi insiden.

- **Pantau metrik utama dari db.serverStatus()**: Lacak `opcounters` (tingkat insert/update/delete/query), `connections.current`, `globalLock.currentQueue.total`, dan `extra_info.page_faults`. Pertumbuhan berkelanjutan dalam `currentQueue` atau tingkat page fault yang tinggi menunjukkan tekanan sumber daya.
- **Siapkan MongoDB Database Profiler** untuk alerting query lambat: Konfigurasikan profiling di level 1 dengan ambang `slowms` yang sesuai dengan SLO Anda (50–200ms adalah tipikal). Salurkan profil ke sistem monitoring eksternal (Datadog, Prometheus, atau skrip kustom) untuk analisis tren historis.
- **Pantau replikasi lag**: Gunakan `rs.status().members[].optimeDate` dan bandingkan `optimeDate` setiap secondary dengan primary. Lag yang secara konsisten di atas 10 detik dapat mengindikasikan sumber daya secondary yang tidak memadai, latensi jaringan, atau operasi penulisan berjalan lama yang memblokir replikasi.
- **Lacak penggunaan indeks dengan tahapan agregasi `$indexStats`**: Jalankan `db.collection.aggregate([{ $indexStats: {} }])` secara berkala. Indeks apa pun dengan akses nol sejak server dimulai adalah kandidat untuk dihapus. Sebaliknya, query yang secara konsisten memicu pemindaian koleksi penuh (`COLLSCAN`) di output `db.currentOp()` menandakan indeks yang hilang.

## Langkah Implementasi

### Langkah 1: Penilaian Dasar (Baseline)

Tetapkan baseline kinerja sebelum melakukan perubahan apa pun.

1. Aktifkan profiling di level 1 dengan ambang lambat 100ms:
   ```javascript
   db.setProfilingLevel(1, { slowms: 100 })
   ```
2. Kumpulkan baseline 24 jam dari query lambat dari `system.profile`:
   ```javascript
   const slowOps = db.system.profile.aggregate([
     { $match: { ts: { $gte: new Date(Date.now() - 86400000) } } },
     { $group: { _id: "$ns", count: { $sum: 1 }, avgMillis: { $avg: "$millis" }, maxMillis: { $max: "$millis" } } },
     { $sort: { avgMillis: -1 } }
   ]).toArray()
   printjson(slowOps)
   ```
3. Catat metrik server dasar:
   ```javascript
   const s = db.serverStatus()
   print(`Operations/sec: ${s.opcounters.query + s.opcounters.insert + s.opcounters.update + s.opcounters.delete}`)
   print(`Connections: ${s.connections.current}/${s.connections.available}`)
   print(`Page faults: ${s.extra_info.page_faults}`)
   print(`Cache hit ratio: ${s.wiredTiger.cache["percentage bytes in the cache"]}`)
   ```
4. Dokumentasikan indeks saat ini untuk setiap koleksi:
   ```javascript
   db.getCollectionNames().forEach(c => {
     const idx = db[c].getIndexes()
     if (idx.length > 1) print(`Koleksi ${c}: ${idx.map(i => i.name).join(', ')}`)
   })
   ```

### Langkah 2: Identifikasi Operasi Lambat

Analisis operasi yang telah diprofilkan untuk menemukan target optimasi yang paling berdampak.

1. Query operasi paling lambat dari koleksi profil:
   ```javascript
   db.system.profile.find({ millis: { $gte: 500 } }).sort({ ts: -1 }).limit(10).pretty()
   ```
2. Untuk setiap operasi lambat, jalankan `explain("executionStats")` dengan pola query yang sama:
   ```javascript
   // Ganti dengan query aktual dari profil
   db.collection.explain("executionStats").find({ /* query */ }).sort({ /* sort */ })
   ```
3. Identifikasi query dengan salah satu dari tanda bahaya ini:
   - `executionStats.executionStages.stage: "COLLSCAN"` — pemindaian koleksi penuh
   - `totalDocsExamined` secara signifikan lebih tinggi dari `nReturned` — selektivitas indeks buruk
   - `executionStats.executionStages.stage: "SORT"` tanpa pengurutan berbasis indeks
4. Prioritaskan kandidat optimasi berdasarkan dampak total: frekuensi × durasi rata-rata. Query yang berjalan 10.000 kali per hari dengan 200ms (2.000 detik/hari) adalah target yang lebih baik daripada laporan harian yang berjalan sekali dengan 30 detik.

### Langkah 3: Implementasi Optimasi Indeks

Buat dan validasi indeks untuk query lambat yang teridentifikasi.

1. Untuk setiap pola query lambat, rancang indeks gabungan menggunakan aturan ESR:
   ```javascript
   // Query: db.orders.find({ status: "pending", region: { $in: ["US", "EU"] } }).sort({ created_at: -1 })
   // ESR: equality (status), range (region $in), sort (created_at)
   db.orders.createIndex({ status: 1, region: 1, created_at: -1 })
   ```
2. Setelah membuat setiap indeks, jalankan ulang panggilan `explain()` yang sama untuk memverifikasi perbaikan:
   Pastikan `totalDocsExamined` sekarang sama dengan `nReturned` atau mendekatinya, dan `executionTimeMillisEstimate` telah turun secara signifikan.
3. Untuk range query pada koleksi besar, gunakan indeks parsial untuk mengurangi ukuran indeks:
   ```javascript
   db.orders.createIndex(
     { region: 1, created_at: -1 },
     { partialFilterExpression: { status: { $in: ["pending", "processing"] } } }
   )
   ```
4. Buat indeks di latar belakang pada sistem produksi:
   ```javascript
   db.orders.createIndex({ customer_id: 1, created_at: -1 }, { background: true })
   ```
   Pembuatan indeks latar belakang tidak memblokir penulisan, meskipun membutuhkan waktu lebih lama dan menghasilkan lebih banyak entri oplog. Untuk replica set, pertimbangkan rolling index build selama jendela pemeliharaan.

5. Setelah semua indeks baru dibuat, hapus indeks yang tidak digunakan:
   ```javascript
   // Periksa statistik penggunaan indeks
   db.orders.aggregate([{ $indexStats: {} }])
   // Hapus indeks dengan "accesses" === 0 sejak server restart terakhir
   db.orders.dropIndex("nama_indeks_tidak_digunakan")
   ```

### Langkah 4: Sesuaikan Konfigurasi WiredTiger

Ubah parameter mesin penyimpanan berdasarkan perilaku cache yang diamati.

1. Hitung ukuran cache optimal dan terapkan di `mongod.conf`:
   ```yaml
   storage:
     wiredTiger:
       engineConfig:
         cacheSizeGB: <50-80% dari total RAM>
   ```
2. Konfigurasikan kompresi blok jika snappy default tidak ideal:
   ```yaml
   storage:
     wiredTiger:
       collectionConfig:
         blockCompressor: snappy  # Opsi: snappy, zlib, zstd, none
       indexConfig:
         prefixCompression: true
   ```
3. Restart layanan `mongod` untuk menerapkan perubahan konfigurasi:
   ```bash
   sudo systemctl restart mongod
   ```
4. Setelah restart, verifikasi ukuran cache baru telah diterapkan:
   ```javascript
   db.serverStatus().wiredTiger.cache["maximum bytes configured"]
   ```

### Langkah 5: Konfigurasi Monitoring dan Alerting

Siapkan monitoring berkelanjutan untuk mendeteksi regresi di masa depan.

1. Buat skrip monitoring yang menangkap metrik utama secara berkala:
   ```javascript
   // monitor.js — jalankan via cron setiap 5 menit dengan: mongosh monitor.js
   const db = connect("mongodb://localhost:27017/admin")
   const s = db.serverStatus()
   const repl = rs.status()
   const metrics = {
     timestamp: new Date(),
     operations: Object.assign({}, s.opcounters),
     connections: s.connections.current,
     active_connections: s.connections.active,
     page_faults: s.extra_info.page_faults,
     cache_dirty: s.wiredTiger.cache["tracked dirty bytes in the cache"],
     cache_read: s.wiredTiger.cache["tracked pages read into cache"],
     repl_lag: repl.members.filter(m => m.stateStr === "SECONDARY").map(m => m.optimeDate)
   }
   print(JSON.stringify(metrics))
   ```
2. Teruskan metrik ke penyimpanan time-series (Prometheus, Datadog, atau InfluxDB) untuk analisis tren.
3. Tetapkan ambang alert untuk kondisi berikut:
   - `connections.current` melebihi 80% dari `maxIncomingConnections`
   - `globalLock.currentQueue.total` tetap di atas 0 selama lebih dari 30 detik
   - Replikasi lag melebihi 30 detik pada secondary mana pun
   - Page faults melebihi 100 per detik secara berkelanjutan selama 5 menit
   - Rasio dirty cache WiredTiger melebihi 20% secara berkelanjutan
4. Jadwalkan tinjauan `$indexStats` mingguan untuk menghapus indeks yang tidak digunakan sebelum menumpuk.

### Langkah 6: Tinjauan Kinerja Berkala

Tetapkan irama untuk penilaian kinerja periodik.

1. Lakukan tinjauan query lambat bulanan dengan menggabungkan data 30 hari terakhir dari `system.profile`.
2. Setelah perubahan skema atau deployment fitur baru, jalankan ulang penilaian baseline Langkah 1 untuk mendeteksi regresi.
3. Dokumentasikan semua perubahan indeks dalam changelog bersama — sertakan pola query, spesifikasi indeks, dan metrik explain() sebelum dan sesudah.
4. Ketika volume data berlipat ganda, nilai ulang ukuran cache WiredTiger dan pengaturan connection pool — konfigurasi yang berfungsi pada 100GB mungkin perlu penyesuaian pada 200GB.

Dengan mengikuti alur kerja terstruktur ini, Anda mengubah optimasi kinerja MongoDB dari pemadaman reaktif menjadi disiplin rekayasa yang dapat diprediksi. Setiap query lambat menjadi titik data, setiap indeks menjadi keputusan desain yang disengaja, dan setiap metrik menjadi pagar pengaman terhadap regresi di masa depan.

---
title: "Manajemen Data Time Series dengan MongoDB"
description: "Tutorial lanjutan tentang memodelkan, menyerap, mengkueri, mengompresi, dan mempertahankan data time series menggunakan koleksi time series MongoDB — termasuk contoh lengkap sensor IoT."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Manajemen Data Time Series dengan MongoDB

## Ringkasan

Tutorial ini mengajarkan cara memodelkan dan mengelola data time series secara native di MongoDB menggunakan koleksi time series. Anda akan mempelajari model bucketing di balik layar, bagaimana field measurement dan timestamp menggerakkan penyimpanan serta kompresi, dan cara mengkueri, mengagregasi, serta mengatur kedaluwarsa data sensor IoT secara efisien, diakhiri dengan contoh lengkap yang dapat dijalankan.

## Target Audiens

- Backend dan data engineer yang membangun sistem IoT, observability, atau data tick finansial.
- Level pengembang: Mahir — nyaman dengan aggregation pipeline MongoDB dan desain skema.

## Prasyarat

- MongoDB 5.0 atau lebih baru (koleksi time series sudah GA sejak MongoDB 5.0).
- `mongosh` terinstal, dan instance `mongod` yang berjalan.
- Pemahaman kuat tentang dokumen MongoDB, indeks, dan aggregation pipeline.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mendesain koleksi time series dengan `timeField`, `metaField`, dan `granularity` yang tepat.
- Menjelaskan bagaimana model bucketing internal memungkinkan kompresi dan pemindaian rentang yang cepat.
- Menyerap data IoT frekuensi tinggi dan menangani error insert dengan baik.
- Menjalankan kueri rentang mentah dan agregasi ber-bucket pada data ber-timestamp.
- Menerapkan retensi dengan indeks TTL dan strategi kedaluwarsa data.

## Konteks dan Motivasi

Fleet IoT, metrik aplikasi, dan feed finansial memproduksi jutaan pengukuran ber-timestamp setiap hari. Menyimpan setiap pengukuran sebagai dokumen terpisah memboroskan penyimpanan, menggembungkan indeks, dan memperlambat kueri rentang. Sebelum MongoDB 5.0, tim menyelesaikan ini dengan membuat bucket manual atau memindahkan data ke database khusus — menambah kompleksitas operasional.

Koleksi time series MongoDB menyelesaikan masalah ini secara native: server secara otomatis mengelompokkan pengukuran yang berbagi jendela waktu dan metadata ke dalam bucket, mengompresinya per kolom, lalu menampilkan data melalui API koleksi biasa. Anda mendapatkan database time series sungguhan tanpa meninggalkan bahasa kueri, driver, atau cerita replikasi MongoDB.

## Konten Inti

### Struktur Koleksi: Measurement dan Timestamp

- `timeField` (wajib): field yang memegang timestamp pengukuran. Harus bertipe BSON Date dan menjadi kunci sort utama.
- `metaField` (opsional): field yang nilainya dibagi oleh serangkaian pengukuran, biasanya ID perangkat atau nama metrik. Nilai meta disimpan sekali per bucket, bukan sekali per dokumen — penghematan ruang besar.
- `granularity`: seberapa rapat pengukuran dalam waktu — `seconds`, `minutes`, atau `hours`. Ini menetapkan jendela bucket default (masing-masing 1 jam, 1 hari, 30 hari) dan harus sesuai ritme penyerapan data.

### Model Bucketing dan Kompresi

Di dalamnya, setiap koleksi time series didukung oleh koleksi bucket biasa. MongoDB mengelompokkan pengukuran yang timestamps-nya berada dalam jendela sama dan berbagi nilai meta sama, lalu menyimpan setiap field sebagai kolom (array). Penyimpanan kolom berkompresi sangat baik karena nilai yang berdekatan secara numerik mirip — 22,1; 22,1; 22,2 terkompresi jauh lebih baik daripada 22,1; 87,4; -3,0.

Bucketing mengubah ekonomi penulisan: jejak disk menyusut drastis, entri indeks menjadi per-bucket alih-alih per-pengukuran, dan kueri rentang memindai jauh lebih sedikit dokumen. Kompresi otomatis; kueri Anda tidak pernah melihat bucket.

### Kueri dengan Aggregation Pipeline

Anda mengkueri koleksi time series dengan `find()` untuk pencarian titik mentah dan dengan aggregation pipeline untuk analitik ber-bucket. Stage kuncinya adalah `$match` (persempit nilai meta dan rentang waktu), `$dateTrunc` (bulatkan timestamp ke batas bucket), dan `$group` (agregasi per bucket), didukung indeks otomatis pada `metaField` plus `timeField`.

### Retensi dengan Kedaluwarsa TTL

Data time series kehilangan nilai seiring waktu: pembacaan kemarin jarang dibutuhkan pada resolusi penuh. MongoDB mendukung indeks TTL langsung pada `timeField` koleksi time series, sehingga bucket yang kedaluwarsa dihapus otomatis oleh job latar belakang.

## Contoh Kode

### Membuat Koleksi Time Series

Jalankan di `mongosh`, tangani error "sudah ada":
```javascript
use iot
try {
  db.createCollection('sensor_readings', {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'metadata',
      granularity: 'seconds'
    }
  });
  print('Koleksi time series berhasil dibuat.');
} catch (err) {
  if (err.codeName === 'NamespaceExists') {
    print('Koleksi sudah ada; lewati pembuatan.');
  } else {
    throw err;
  }
}
```

### Menyerap Data Sensor IoT Simulasi

Simulasikan fleet sensor yang menulis satu pengukuran setiap 5 detik, dengan insert massal:
```javascript
use iot
const SENSORS = ['sensor-1', 'sensor-2', 'sensor-3'];
const readings = [];
const now = new Date();
for (let i = 0; i < 1000; i++) {
  const sensor = SENSORS[i % SENSORS.length];
  readings.push({
    timestamp: new Date(now.getTime() - (i * 5000)),
    metadata: { sensor_id: sensor, zone: 'factory-a' },
    temperature: 20 + Math.random() * 15,
    humidity: 40 + Math.random() * 30
  });
}
try {
  const result = db.sensor_readings.insertMany(readings, { ordered: false });
  print(`Berhasil insert ${result.insertedCount} pengukuran.`);
} catch (err) {
  if (err.code === 11000 || err.writeErrors) {
    print(`Melewati ${err.insertedDocs ? err.insertedDocs.length : 0} duplikat.`);
  } else {
    throw err;
  }
}
```

### Kueri: Kueri Rentang Mentah
```javascript
use iot
const since = new Date(Date.now() - 15 * 60 * 1000);
db.sensor_readings
  .find({ 'metadata.sensor_id': 'sensor-1', timestamp: { $gte: since } })
  .sort({ timestamp: 1 })
  .limit(50);
```

### Kueri: Agregasi Ber-Bucket
```javascript
use iot
db.sensor_readings.aggregate([
  { $match: { 'metadata.zone': 'factory-a' } },
  {
    $group: {
      _id: {
        sensor: '$metadata.sensor_id',
        hour: { $dateTrunc: { date: '$timestamp', unit: 'hour' } }
      },
      avgTemperature: { $avg: '$temperature' },
      maxHumidity: { $max: '$humidity' },
      samples: { $count: {} }
    }
  },
  { $sort: { '_id.hour': 1 } }
]);
```

### Retensi dengan Indeks TTL
```javascript
use iot
try {
  db.sensor_readings.createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 30 }
  );
  print('Indeks TTL dibuat: pengukuran kedaluwarsa setelah 30 hari.');
} catch (err) {
  print(`Pembuatan indeks TTL gagal: ${err.message}`);
}
```

## Insight Penting

- Pilih `granularity` sesuai ritme penyerapan; granularity yang salah memboroskan ruang bucket dan merusak kompresi.
- Jaga kardinalitas `metaField` tetap terbatas: meta berkardinalitas tinggi (seperti `request_id`) membuat satu bucket per nilai dan menghancurkan kompresi — gunakan ID perangkat atau nama metrik.
- `$dateTrunc` adalah alat bucketing idiomatis; hindari perhitungan tanggal manual di `_id` `$group`, yang lebih sulit diindeks dan dibaca.
- Dokumen pengukuran bersifat append-only; field skema tidak dapat diperbarui, dan koleksi time series tidak mendukung transaksi — buat penyerapan idempoten.
- Kedaluwarsa TTL berjalan di latar belakang setiap ~60 detik, jadi retensi tidak presisi per detik.

## Langkah Berikutnya

- Pelajari replica set dan sharding MongoDB untuk menskalakan beban kerja time series secara horizontal.
- Jelajahi pola windowing dan forecasting aggregation pipeline untuk analitik lanjutan.
- Pelajari change streams untuk bereaksi terhadap ambang anomali secara real time.

## Kesimpulan

Anda sekarang dapat membuat koleksi time series dengan skema bucket yang tepat, menyerap pembacaan IoT simulasi, menjalankan agregasi mentah dan ber-bucket, serta mengonfigurasi retensi TTL — alur kerja time series lengkap bergaya produksi.

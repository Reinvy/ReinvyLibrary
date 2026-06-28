---
title: "Membangun Sistem Berbasis Event dengan Redis Streams"
description: "Tutorial komprehensif tentang Redis Streams — menguasai consumer groups, konfirmasi pesan, pola event sourcing, dan membangun sistem notifikasi berbasis event yang siap produksi dengan ioredis dan Node.js."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Sistem Berbasis Event dengan Redis Streams

## Ringkasan

Redis Streams adalah struktur data canggih yang diperkenalkan di Redis 5.0 yang memungkinkan streaming event yang andal, persisten, dan dapat diskalakan. Tidak seperti Pub/Sub — di mana pesan bersifat sementara dan hilang jika tidak ada konsumen yang terhubung — Streams menyimpan pesan di disk, mendukung consumer groups untuk distribusi beban kerja, dan menyediakan semantik konfirmasi eksplisit untuk pemrosesan exactly-once. Tutorial ini membahas model data Streams, mekanisme consumer group, konfirmasi pesan dan jaminan pengiriman, serta sistem notifikasi berbasis event lengkap yang dibangun dengan ioredis dan Node.js.

## Target Audiens

- Backend Developer, Fullstack Developer, dan DevOps Engineer.
- Level menengah. Diperlukan pemahaman dasar tentang Redis (tipe data inti) dan Node.js.

## Prasyarat

- Redis 5.0 atau yang lebih baru terinstal (lokal, Docker, atau instance cloud).
- Node.js 18 atau yang lebih baru dan npm terinstal.
- Pengetahuan dasar tentang perintah Redis CLI dan pustaka ioredis.
- Pemahaman tentang pemrograman asinkron dengan Node.js (async/await, Promise).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Memahami model data Redis Streams: entri, ID, dan field.
- Membuat dan mengonsumsi stream menggunakan Redis CLI dan ioredis.
- Mengimplementasikan consumer groups untuk pemrosesan pesan terdistribusi.
- Menangani konfirmasi pesan, entri tertunda, dan pemulihan kegagalan.
- Membandingkan Streams dengan Pub/Sub dan antrean pesan tradisional.
- Membangun sistem notifikasi berbasis event lengkap dengan beberapa pekerja konsumen.

## Konteks dan Motivasi

Sistem antrean pesan tradisional seperti RabbitMQ dan Apache Kafka menyediakan kemampuan streaming event yang tangguh tetapi memperkenalkan kompleksitas operasional yang signifikan. Redis Streams menjembatani kesenjangan ini dengan menawarkan solusi streaming ringan yang merupakan bagian dari Redis, mewarisi kesederhanaan Redis, latensi sub-milidetik, dan konfigurasi minimal.

Pertimbangkan platform e-commerce yang khas: ketika pengguna melakukan pemesanan, beberapa layanan hilir perlu bereaksi — mengirim email konfirmasi, memperbarui inventaris, memberi tahu gudang, dan memproses pembayaran. Tanpa lapisan streaming, setiap layanan harus melakukan polling ke basis data atau berkoordinasi melalui kopling API yang ketat. Dengan Redis Streams, layanan pemesanan menulis satu event ke stream, dan beberapa consumer groups memprosesnya secara independen dan andal.

Redis Streams sangat cocok untuk:
- **Mikroservis berbasis event**: Memisahkan produsen dan konsumen dengan log event yang persisten dan dapat diputar ulang.
- **Antrean pekerjaan**: Mendistribusikan pekerjaan ke beberapa pekerja dengan pemrosesan terjamin.
- **Umpan aktivitas**: Mempertahankan log event berurutan untuk audit atau pembuatan umpan.
- **Analitik waktu nyata**: Mengalirkan metrik dan event ke pipeline agregasi.

## Konten Inti

### Memahami Struktur Data Stream

Redis Stream adalah log append-only dari entri. Setiap entri memiliki ID unik (dihasilkan secara otomatis sebagai `<timestamp>-<sequenceNumber>`) dan daftar pasangan field-nilai, mirip dengan Redis Hash.

```text
Stream: orders
─────────────────────────────────────
ID                    Fields
─────────────────────────────────────
1719500001000-0    → orderId: "ORD-001", userId: "usr_42", amount: 99.95
1719500002000-0    → orderId: "ORD-002", userId: "usr_17", amount: 149.50
1719500003000-0    → orderId: "ORD-003", userId: "usr_88", amount: 25.00
─────────────────────────────────────
```

Setiap ID terdiri dari timestamp dengan presisi milidetik dan nomor urutan, memastikan pengurutan global bahkan dalam milidetik yang sama. Stream tumbuh tanpa batas secara default, dan Anda dapat memotongnya (trim) berdasarkan panjang atau waktu.

### Bekerja dengan Streams di CLI

Menambahkan entri ke stream dengan `XADD`:

```bash
XADD orders * orderId "ORD-001" userId "usr_42" amount 99.95
```

Tanda `*` memberitahu Redis untuk menghasilkan ID secara otomatis. Membaca entri dengan `XRANGE`:

```bash
# Membaca semua entri
XRANGE orders - +

# Membaca entri dari ID tertentu
XRANGE orders 1719500001000-0 +

# Membaca N entri terakhir
XREVRANGE orders + - COUNT 5
```

Mendapatkan panjang stream:

```bash
XLEN orders
```

### Consumer Groups: Pemrosesan Terdistribusi

Consumer groups adalah inti dari pemrosesan stream yang andal. Mereka memungkinkan beberapa konsumen bekerja sama dalam memproses stream, dengan Redis melacak pesan mana yang telah diproses oleh setiap konsumen.

```bash
# Membuat consumer group
XGROUP CREATE orders email-group $

# $ berarti "mulai dari akhir" (hanya pesan baru)
# Gunakan 0 untuk memproses semua pesan yang sudah ada dari awal
```

Konsumen dalam satu grup secara otomatis mendistribusikan pesan di antara mereka sendiri. Ketika konsumen membaca pesan, Redis menandainya sebagai "tertunda" untuk konsumen tersebut:

```bash
# Konsumen membaca pesan
XREADGROUP GROUP email-group worker-1 COUNT 1 STREAMS orders >

# > berarti "baca hanya pesan baru yang belum dikirim ke konsumen mana pun"
```

Setelah diproses, konsumen mengonfirmasi pesan:

```bash
XACK orders email-group 1719500001000-0
```

### Konfirmasi Pesan dan Entri Tertunda

Pesan yang belum dikonfirmasi tetap berada di daftar entri tertunda (pending entries list / PEL) consumer group. Ini adalah fondasi jaminan keandalan Redis Streams:

```bash
# Melihat pesan tertunda
XPENDING orders email-group

# Memeriksa entri tertunda tertentu
XPENDING orders email-group - + 10

# Mengklaim pesan tertunda dari konsumen yang gagal
XCLAIM orders email-group worker-2 60000 1719500001000-0
```

Perintah `XCLAIM` mentransfer kepemilikan pesan tertunda ke konsumen lain setelah waktu idle minimum (60 detik dalam contoh di atas). Ini memungkinkan penanganan dead-letter dan pemulihan dari kegagalan konsumen.

### Pemotongan Stream

Stream tumbuh tanpa batas secara default. Gunakan `XTRIM` atau opsi `MAXLEN` dengan `XADD` untuk membatasi stream:

```bash
# Menyimpan hanya 1000 entri terbaru
XTRIM orders MAXLEN 1000

# Memotong dengan ~ untuk pemotongan hampir tepat (lebih efisien)
XTRIM orders MAXLEN ~ 1000
```

Tanda tilda (`~`) memberitahu Redis untuk memotong hanya ketika efisien untuk melakukannya, menukar panjang yang tepat dengan kinerja yang lebih baik.

### Pembacaan Pemblokiran

Konsumen dapat memblokir dan menunggu data stream baru, menghilangkan kebutuhan polling:

```bash
# Memblokir hingga 5 detik, membaca 10 pesan setiap kali
XREADGROUP GROUP email-group worker-1 COUNT 10 BLOCK 5000 STREAMS orders >
```

Nilai `BLOCK` `0` berarti memblokir tanpa batas. Pembacaan pemblokiran adalah pola yang direkomendasikan untuk pekerja konsumen.

## Contoh Kode

### Menyiapkan Proyek

```bash
mkdir redis-streams-notification-system
cd redis-streams-notification-system
npm init -y
npm install ioredis dotenv
```

### Memproduksi Event — Layanan Pemesanan

```javascript
// producer.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

const STREAM_KEY = 'orders';

async function placeOrder(order) {
  const entryId = await redis.xadd(
    STREAM_KEY,
    '*',
    'orderId', order.orderId,
    'userId', order.userId,
    'email', order.email,
    'amount', String(order.amount),
    'items', JSON.stringify(order.items),
    'timestamp', new Date().toISOString(),
  );
  console.log(`Pesanan ditempatkan: ${order.orderId} (entri: ${entryId})`);
  return entryId;
}

async function main() {
  const orders = [
    { orderId: 'ORD-001', userId: 'usr_42', email: 'alice@example.com', amount: 99.95, items: [{ sku: 'WIDGET-A', qty: 2 }] },
    { orderId: 'ORD-002', userId: 'usr_17', email: 'bob@example.com', amount: 149.50, items: [{ sku: 'GADGET-B', qty: 1 }] },
    { orderId: 'ORD-003', userId: 'usr_88', email: 'carol@example.com', amount: 25.00, items: [{ sku: 'WIDGET-A', qty: 1 }] },
  ];

  for (const order of orders) {
    await placeOrder(order);
  }

  await redis.quit();
}

main().catch(console.error);
```

### Pekerja Konsumen — Layanan Notifikasi Email

```javascript
// consumer-email.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

const STREAM_KEY = 'orders';
const GROUP_NAME = 'email-notification-group';
const CONSUMER_NAME = `worker-email-${process.pid}`;

async function sendEmail(userId, email, orderId) {
  // Simulasi pengiriman email (2-3 detik)
  await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000));
  console.log(`[EMAIL] Konfirmasi terkirim ke ${email} untuk pesanan ${orderId}`);
}

async function processOrder(entry) {
  const [entryId, fields] = entry;
  const data = {};
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1];
  }

  console.log(`[${CONSUMER_NAME}] Memproses pesanan ${data.orderId} untuk ${data.email}`);

  try {
    await sendEmail(data.userId, data.email, data.orderId);
    await redis.xack(STREAM_KEY, GROUP_NAME, entryId);
    console.log(`[${CONSUMER_NAME}] Dikonfirmasi ${entryId} — email terkirim`);
  } catch (err) {
    console.error(`[${CONSUMER_NAME}] Gagal memproses ${entryId}:`, err.message);
    // Pesan tetap di PEL — konsumen lain dapat mengklaim setelah timeout
  }
}

async function main() {
  // Membuat consumer group (abaikan error jika sudah ada)
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '$');
    console.log(`Consumer group dibuat: ${GROUP_NAME}`);
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) {
      throw err;
    }
    console.log(`Consumer group ${GROUP_NAME} sudah ada`);
  }

  console.log(`${CONSUMER_NAME} dimulai, menunggu pesanan...`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const results = await redis.xreadgroup(
        'GROUP', GROUP_NAME, CONSUMER_NAME,
        'COUNT', 5,
        'BLOCK', 5000,
        'STREAMS', STREAM_KEY,
        '>',
      );

      if (!results) {
        // Tidak ada pesan baru dalam batas waktu BLOCK
        continue;
      }

      for (const [, entries] of results) {
        for (const entry of entries) {
          await processOrder(entry);
        }
      }
    } catch (err) {
      console.error(`[${CONSUMER_NAME}] Error dalam loop baca:`, err.message);
      // Tunggu sebelum mencoba ulang untuk menghindari loop error yang ketat
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

main().catch(console.error);
```

### Menjalankan Beberapa Pekerja Konsumen

Buka beberapa terminal dan jalankan:

```bash
# Terminal 1 — Produsen
node producer.js

# Terminal 2 — Pekerja Konsumen 1
node consumer-email.js

# Terminal 3 — Pekerja Konsumen 2
node consumer-email.js
```

Setiap pekerja secara otomatis menerima bagian yang adil dari pesan. Ketika satu pekerja crash di tengah pemrosesan, pesan yang tertunda dapat diklaim oleh pekerja lain setelah batas waktu idle.

### Mengklaim Pesan Tertunda — Pekerja Pemulihan

```javascript
// recovery-worker.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

const STREAM_KEY = 'orders';
const GROUP_NAME = 'email-notification-group';
const CLAIM_CONSUMER = 'worker-recovery';
const MIN_IDLE_MS = 60000; // Klaim pesan yang idle selama 60+ detik
const BATCH_SIZE = 10;

async function main() {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '$');
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) throw err;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Periksa pesan tertunda yang idle (konsumen kemungkinan crash)
    const pending = await redis.xpending(STREAM_KEY, GROUP_NAME, '-', '+', BATCH_SIZE);

    if (pending && pending.length > 0) {
      for (const entry of pending) {
        const [entryId, consumer, idleMs] = entry;
        if (idleMs >= MIN_IDLE_MS) {
          console.log(`Mengklaim entri basi ${entryId} dari ${consumer} (idle: ${idleMs}ms)`);
          await redis.xclaim(STREAM_KEY, GROUP_NAME, CLAIM_CONSUMER, MIN_IDLE_MS, entryId);
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
}

main().catch(console.error);
```

### Pemantauan Consumer Group

```javascript
// monitor.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

async function main() {
  const streamKey = process.argv[2] || 'orders';

  const info = await redis.xinfo('GROUPS', streamKey);
  console.log(`Consumer groups untuk stream "${streamKey}":`);
  console.log('─'.repeat(60));

  for (const group of info) {
    const [name, consumers, pending, lastDelivered] = group;
    console.log(`\nGroup: ${name}`);
    console.log(`  Konsumen:       ${consumers}`);
    console.log(`  Tertunda:       ${pending}`);
    console.log(`  Terakhir Dikirim: ${lastDelivered}`);

    if (consumers > 0) {
      const consumerInfo = await redis.xinfo('CONSUMERS', streamKey, name);
      for (const c of consumerInfo) {
        const [cName, cPending, cIdle, cInactive] = c;
        console.log(`  └─ ${cName}: tertunda=${cPending}, idle=${cIdle}ms`);
      }
    }
  }

  await redis.quit();
}

main().catch(console.error);
```

## Insight Penting

- **Streams menyimpan; Pub/Sub tidak**: Gunakan Streams ketika jaminan pengiriman penting. Pub/Sub cocok untuk notifikasi fire-and-forget di mana kehilangan pesan dapat diterima.
- **Consumer groups memungkinkan penskalaan horizontal**: Setiap pesan dalam grup dikirimkan ke tepat satu konsumen, memungkinkan penskalaan linear kapasitas pemrosesan.
- **Pending Entries List (PEL) adalah tulang punggung keandalan**: Pesan yang belum dikonfirmasi tetap berada di PEL, memungkinkan pemulihan dari kegagalan konsumen. Pantau ukuran PEL — PEL yang terus bertambah menunjukkan bottleneck pemrosesan atau konsumen yang gagal.
- **Konfirmasi setelah pemrosesan, bukan sebelumnya**: Selalu panggil `XACK` setelah efek samping (email terkirim, basis data diperbarui) selesai. Mengonfirmasi sebelum pemrosesan menciptakan celah untuk kehilangan data.
- **Gunakan `MAXLEN ~` untuk pemotongan efisien**: Mode pemotongan perkiraan menghindari overhead O(N) dari pemotongan tepat dan aman untuk penggunaan produksi.
- **Penamaan konsumen**: Gunakan nama konsumen yang stabil (misalnya, `worker-email-hostname-pid`) sehingga konsumen fisik yang sama dikenali di seluruh restart. Nama konsumen acak menyebabkan fragmentasi PEL.
- **Penanganan dead-letter**: Pesan yang gagal berulang kali harus dipindahkan ke stream dead-letter terpisah menggunakan `XCLAIM` dan `XACK`, kemudian diperiksa secara manual.

## Langkah Berikutnya

- Jelajahi tutorial Redis Streams untuk pola yang lebih lanjut: [Dokumentasi Redis Streams](https://redis.io/docs/data-types/streams-tutorial/)
- Pelajari tentang modul Redis Stack: [RedisJSON](https://redis.io/docs/data-types/json/) untuk penyimpanan dokumen bersama streams
- Pelajari [Silabus Pengembangan Redis](/database/redis/syllabi/redis-development-syllabus) untuk jalur pembelajaran terstruktur
- Bandingkan Redis Streams dengan Apache Kafka untuk event sourcing throughput tinggi

## Kesimpulan

Redis Streams menyediakan alternatif yang kuat dan ringan untuk sistem antrean pesan khusus, menggabungkan kesederhanaan operasional Redis dengan kemampuan pemrosesan stream yang tangguh. Anda telah mempelajari cara membuat dan mengelola stream, mengimplementasikan consumer groups untuk pemrosesan terdistribusi, menangani konfirmasi pesan dan pemulihan, serta membangun sistem notifikasi berbasis event yang lengkap dengan ioredis. Pola-pola ini membentuk fondasi untuk membangun arsitektur berbasis event yang tangguh dan dapat diskalakan dengan Redis.
